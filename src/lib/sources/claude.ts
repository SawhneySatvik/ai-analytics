import fsp from "node:fs/promises";
import path from "node:path";

import { PROJECTS_DIR, HISTORY_FILE, decodeProjectDir } from "../paths";
import type { HistoryEntry } from "../types";
import { walk } from "./fsutil";
import {
  newClaudeAcc,
  parseAgentMeta,
  parseClaudeHistory,
  parseClaudeText,
} from "./claudeParse";
import type { DiscoverResult, LoaderResult, SourceLoader } from "./types";

// ── filesystem helpers ──────────────────────────────────────────────────────

/** All transcript .jsonl files under projects/ (recursive; includes subagents). */
async function listTranscriptFiles(): Promise<string[]> {
  const all = await walk(PROJECTS_DIR);
  return all.filter((f) => f.endsWith(".jsonl"));
}

async function listMetaFiles(): Promise<string[]> {
  const all = await walk(PROJECTS_DIR);
  return all.filter((f) => f.endsWith(".meta.json"));
}

/** Derive parent session id + sidechain flag + encoded project dir from a path. */
function classifyFile(file: string): { sessionId: string; isSidechain: boolean; encDir: string } {
  const rel = path.relative(PROJECTS_DIR, file);
  const segs = rel.split(path.sep);
  const encDir = segs[0] ?? "";
  if (segs.length === 2 && segs[1].endsWith(".jsonl")) {
    return { sessionId: segs[1].replace(/\.jsonl$/, ""), isSidechain: false, encDir };
  }
  return { sessionId: segs[1] ?? "", isSidechain: true, encDir };
}

async function load(discovered?: DiscoverResult): Promise<LoaderResult> {
  const transcriptFiles = discovered?.sigPaths ?? (await listTranscriptFiles());

  // agentType lookup: <agent-x>.jsonl -> agentType from sibling <agent-x>.meta.json
  const agentTypeByFile = new Map<string, string>();
  for (const metaPath of await listMetaFiles()) {
    try {
      const a = parseAgentMeta(await fsp.readFile(metaPath, "utf8"));
      if (a) agentTypeByFile.set(metaPath.replace(/\.meta\.json$/, ".jsonl"), a);
    } catch {
      /* ignore malformed meta */
    }
  }

  const acc = newClaudeAcc();
  for (const file of transcriptFiles) {
    const { sessionId, isSidechain, encDir } = classifyFile(file);
    const agentType = isSidechain ? agentTypeByFile.get(file) ?? null : null;
    let text: string;
    try {
      text = await fsp.readFile(file, "utf8");
    } catch {
      continue;
    }
    parseClaudeText(
      text,
      { sessionId, isSidechain, agentType, decodedFallback: decodeProjectDir(encDir), fileKey: file },
      acc,
    );
  }
  acc.diag.fileCount = transcriptFiles.length;

  let history: HistoryEntry[] = [];
  try {
    history = parseClaudeHistory(await fsp.readFile(HISTORY_FILE, "utf8"));
  } catch {
    /* no history file */
  }

  return { messages: [...acc.groups.values()], sessionMeta: acc.sessionMeta, history, diagnostics: acc.diag };
}

export const claudeLoader: SourceLoader = {
  source: "claude",
  async discover(): Promise<DiscoverResult> {
    const sigPaths = await listTranscriptFiles();
    return { source: "claude", present: sigPaths.length > 0, sigPaths, historyPaths: [HISTORY_FILE] };
  },
  load,
};
