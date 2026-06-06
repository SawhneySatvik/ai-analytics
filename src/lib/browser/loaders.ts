// Browser-side file collection + classification. Walks a granted
// FileSystemDirectoryHandle (Chromium) OR accepts an uploaded File[] (drag-drop
// / <input webkitdirectory>), then routes each .jsonl through the SAME pure
// parsers the Node loaders use. Path-based classification mirrors the Node
// loaders (projects/ → Claude, sessions/ → Codex); loose files (no folder
// structure) fall back to a content sniff so single-file drag-drop still works.

import {
  newClaudeAcc,
  parseAgentMeta,
  parseClaudeHistory,
  parseClaudeText,
} from "../sources/claudeParse";
import { newCodexAcc, parseCodexHistory, parseCodexText } from "../sources/codexParse";
import { decodeProjectDir } from "../projectPath";
import { finalizeSnapshot } from "../snapshot";
import type { Snapshot } from "../types";
import type { LoaderResult } from "../sources/types";

export interface SourceFile {
  /** path relative to the connected root, normalized to "/" separators */
  relPath: string;
  read: () => Promise<string>;
}

export interface IngestProgress {
  phase: "scanning" | "reading" | "finalizing";
  done: number;
  total: number;
  label?: string;
}

export type ProgressFn = (p: IngestProgress) => void;

const isData = (name: string) => name.endsWith(".jsonl") || name.endsWith(".meta.json");
const basename = (relPath: string) => relPath.split("/").pop() ?? relPath;

// ── collection ────────────────────────────────────────────────────────────

/** Recursively walk a directory handle, collecting .jsonl / .meta.json files. */
export async function walkDirectory(
  handle: FileSystemDirectoryHandle,
  onProgress?: ProgressFn,
  prefix = "",
  out: SourceFile[] = [],
): Promise<SourceFile[]> {
  // @ts-expect-error — values() async-iterator is not yet in the TS DOM lib
  for await (const entry of handle.values() as AsyncIterable<FileSystemHandle>) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "directory") {
      await walkDirectory(entry as FileSystemDirectoryHandle, onProgress, relPath, out);
    } else if (isData(entry.name)) {
      const fh = entry as FileSystemFileHandle;
      out.push({ relPath, read: async () => (await fh.getFile()).text() });
      onProgress?.({ phase: "scanning", done: out.length, total: 0, label: relPath });
    }
  }
  return out;
}

/** Convert an uploaded File[] (folder upload preserves webkitRelativePath). */
export function filesToSourceFiles(files: File[] | FileList): SourceFile[] {
  const arr = Array.from(files as ArrayLike<File>);
  return arr
    .filter((f) => isData(f.name))
    .map((f) => {
      const rel = ((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name).replace(/\\/g, "/");
      return { relPath: rel, read: () => f.text() };
    });
}

// ── classification ──────────────────────────────────────────────────────────

/** Segment index of a named directory in a "/"-joined path, or -1. */
function segIndex(relPath: string, name: string): number {
  return relPath.split("/").indexOf(name);
}

/** Replicate the Node Claude classifyFile on the path *after* projects/. */
function classifyClaude(relToProjects: string): { sessionId: string; isSidechain: boolean; encDir: string } {
  const segs = relToProjects.split("/");
  const encDir = segs[0] ?? "";
  if (segs.length === 2 && segs[1].endsWith(".jsonl")) {
    return { sessionId: segs[1].replace(/\.jsonl$/, ""), isSidechain: false, encDir };
  }
  return { sessionId: segs[1] ?? "", isSidechain: true, encDir };
}

/** Peek a few lines to tell Claude vs Codex when there's no folder structure. */
function sniffSource(text: string): "claude" | "codex" | null {
  let n = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as Record<string, unknown>;
      if (o && typeof o === "object") {
        const t = o.type;
        if ("payload" in o || t === "session_meta" || t === "turn_context" || t === "event_msg" || t === "response_item") return "codex";
        if ("uuid" in o || t === "assistant" || t === "user" || t === "summary") return "claude";
      }
    } catch {
      /* skip */
    }
    if (++n >= 20) break;
  }
  return null;
}

// ── ingest ────────────────────────────────────────────────────────────────

/**
 * Parse a collected set of source files into a Snapshot. Meta files are read
 * first (for sidechain agentType), then transcripts are streamed one at a time
 * so peak memory stays ~one file. Path patterns classify Claude/Codex; files
 * with no recognizable path are content-sniffed.
 */
export async function ingestSourceFiles(files: SourceFile[], onProgress?: ProgressFn): Promise<Snapshot> {
  // partition
  const claudeMeta: SourceFile[] = [];
  const claudeTranscripts: { sf: SourceFile; relToProjects: string }[] = [];
  const codexRollouts: SourceFile[] = [];
  const histories: SourceFile[] = [];
  const looseJsonl: SourceFile[] = [];

  const relPaths = files.map((f) => f.relPath);

  for (const sf of files) {
    const { relPath } = sf;
    const name = basename(relPath);
    if (name === "history.jsonl") {
      histories.push(sf);
      continue;
    }
    const pIdx = segIndex(relPath, "projects");
    const sIdx = segIndex(relPath, "sessions");
    if (pIdx >= 0 && relPath.endsWith(".meta.json")) {
      claudeMeta.push(sf);
    } else if (pIdx >= 0 && relPath.endsWith(".jsonl")) {
      claudeTranscripts.push({ sf, relToProjects: relPath.split("/").slice(pIdx + 1).join("/") });
    } else if (sIdx >= 0 && name.startsWith("rollout-") && name.endsWith(".jsonl")) {
      codexRollouts.push(sf);
    } else if (relPath.endsWith(".jsonl")) {
      looseJsonl.push(sf);
    }
  }

  // deterministic ordering (Claude dedup is first-seen-wins across files)
  claudeTranscripts.sort((a, b) => a.relToProjects.localeCompare(b.relToProjects));
  codexRollouts.sort((a, b) => a.relPath.localeCompare(b.relPath));

  // meta first → agentType by transcript relPath
  const agentTypeByRel = new Map<string, string>();
  for (const m of claudeMeta) {
    try {
      const a = parseAgentMeta(await m.read());
      if (a) agentTypeByRel.set(m.relPath.replace(/\.meta\.json$/, ".jsonl"), a);
    } catch {
      /* ignore */
    }
  }

  const total = claudeTranscripts.length + codexRollouts.length + looseJsonl.length;
  let done = 0;
  const tick = (label: string) => onProgress?.({ phase: "reading", done: ++done, total, label });

  // Claude transcripts
  const claudeAcc = newClaudeAcc();
  for (const { sf, relToProjects } of claudeTranscripts) {
    const { sessionId, isSidechain, encDir } = classifyClaude(relToProjects);
    const agentType = isSidechain ? agentTypeByRel.get(sf.relPath) ?? null : null;
    try {
      const text = await sf.read();
      parseClaudeText(
        text,
        { sessionId, isSidechain, agentType, decodedFallback: decodeProjectDir(encDir), fileKey: sf.relPath },
        claudeAcc,
      );
    } catch {
      /* unreadable file — skip */
    }
    tick(sf.relPath);
  }
  claudeAcc.diag.fileCount = claudeTranscripts.length;

  // Codex rollouts
  const codexAcc = newCodexAcc();
  for (const sf of codexRollouts) {
    try {
      parseCodexText(await sf.read(), basename(sf.relPath), codexAcc);
    } catch {
      /* skip */
    }
    tick(sf.relPath);
  }

  // loose files — content sniff, then route to the matching parser/accumulator
  for (const sf of looseJsonl) {
    try {
      const text = await sf.read();
      const kind = sniffSource(text);
      if (kind === "codex") {
        parseCodexText(text, basename(sf.relPath), codexAcc);
      } else if (kind === "claude") {
        const sessionId = basename(sf.relPath).replace(/\.jsonl$/, "");
        parseClaudeText(
          text,
          { sessionId, isSidechain: false, agentType: null, decodedFallback: "", fileKey: sf.relPath },
          claudeAcc,
        );
        claudeAcc.diag.fileCount++;
      }
    } catch {
      /* skip */
    }
    tick(sf.relPath);
  }

  // histories — attribute each to claude/codex by the sibling tree
  let claudeHistoryText = "";
  let codexHistoryText = "";
  for (const h of histories) {
    const dir = h.relPath.includes("/") ? h.relPath.slice(0, h.relPath.lastIndexOf("/") + 1) : "";
    const hasProjects = relPaths.some((p) => p.startsWith(`${dir}projects/`));
    const hasSessions = relPaths.some((p) => p.startsWith(`${dir}sessions/`));
    try {
      const text = await h.read();
      if (hasProjects && !hasSessions) claudeHistoryText += (claudeHistoryText ? "\n" : "") + text;
      else if (hasSessions && !hasProjects) codexHistoryText += (codexHistoryText ? "\n" : "") + text;
      else if (claudeTranscripts.length) claudeHistoryText += (claudeHistoryText ? "\n" : "") + text;
      else if (codexRollouts.length) codexHistoryText += (codexHistoryText ? "\n" : "") + text;
    } catch {
      /* skip */
    }
  }

  onProgress?.({ phase: "finalizing", done: total, total });

  const results: LoaderResult[] = [];
  if (claudeTranscripts.length || claudeAcc.groups.size) {
    results.push({
      messages: [...claudeAcc.groups.values()],
      sessionMeta: claudeAcc.sessionMeta,
      history: claudeHistoryText ? parseClaudeHistory(claudeHistoryText) : [],
      diagnostics: claudeAcc.diag,
    });
  }
  if (codexRollouts.length || codexAcc.messages.length) {
    results.push({
      messages: codexAcc.messages,
      sessionMeta: codexAcc.sessionMeta,
      history: codexHistoryText ? parseCodexHistory(codexHistoryText) : [],
      diagnostics: codexAcc.diag,
    });
  }

  const warnings: string[] = [];
  if (!results.length) {
    warnings.push("No Claude (~/.claude) or Codex (~/.codex) transcripts found in the selected folder.");
  }
  return finalizeSnapshot(results, { extraWarnings: warnings });
}
