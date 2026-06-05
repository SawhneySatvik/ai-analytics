import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

import {
  PROJECTS_DIR,
  HISTORY_FILE,
  decodeProjectDir,
  projectDisplayName,
} from "./paths";
import { canonicalizeModel, modelLabel } from "./models";
import { messageCostUSD, isPriced } from "./pricing";
import { extractUsage, totalTokens } from "./usage";
import type {
  CanonicalModel,
  HistoryEntry,
  MessageRecord,
  SessionMeta,
  Snapshot,
  TokenUsage,
} from "./types";

// ── filesystem helpers ──────────────────────────────────────────────────────

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

/** All transcript .jsonl files under projects/ (recursive; includes subagents). */
export async function listTranscriptFiles(): Promise<string[]> {
  const all = await walk(PROJECTS_DIR);
  return all.filter((f) => f.endsWith(".jsonl"));
}

async function listMetaFiles(): Promise<string[]> {
  const all = await walk(PROJECTS_DIR);
  return all.filter((f) => f.endsWith(".meta.json"));
}

/** Derive parent session id + sidechain flag + encoded project dir from a path. */
function classifyFile(file: string): {
  sessionId: string;
  isSidechain: boolean;
  encDir: string;
} {
  const rel = path.relative(PROJECTS_DIR, file);
  const segs = rel.split(path.sep);
  const encDir = segs[0] ?? "";
  // top-level transcript: <enc>/<sessionId>.jsonl
  if (segs.length === 2 && segs[1].endsWith(".jsonl")) {
    return { sessionId: segs[1].replace(/\.jsonl$/, ""), isSidechain: false, encDir };
  }
  // subagent transcript: <enc>/<sessionId>/subagents/.../agent-x.jsonl
  return { sessionId: segs[1] ?? "", isSidechain: true, encDir };
}

// ── message folding ─────────────────────────────────────────────────────────

interface MsgGroup {
  messageId: string;
  uuid: string;
  requestId: string | null;
  sessionId: string;
  projectPath: string;
  ts: number;
  timestamp: string;
  rawModel: string;
  model: CanonicalModel;
  usage: TokenUsage;
  isSidechain: boolean;
  agentType: string | null;
  toolCalls: string[];
  serviceTier: string | null;
  speed: string | null;
  version: string | null;
  gitBranch: string | null;
}

function toolNamesFromContent(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  const names: string[] = [];
  for (const b of content) {
    if (b && typeof b === "object" && (b as { type?: string }).type === "tool_use") {
      const n = (b as { name?: string }).name;
      if (typeof n === "string") names.push(n);
    }
  }
  return names;
}

function isHumanPrompt(o: Record<string, unknown>): boolean {
  if (o.isMeta) return false;
  const msg = o.message as { content?: unknown } | undefined;
  const c = msg?.content;
  if (typeof c === "string") return c.trim().length > 0;
  if (Array.isArray(c)) {
    let hasText = false;
    let hasToolResult = false;
    for (const b of c) {
      const t = (b as { type?: string })?.type;
      if (t === "text") hasText = true;
      if (t === "tool_result") hasToolResult = true;
    }
    return hasText && !hasToolResult;
  }
  return false;
}

// ── main ingestion ──────────────────────────────────────────────────────────

export async function buildSnapshot(files?: string[]): Promise<Snapshot> {
  const started = Date.now();
  const transcriptFiles = files ?? (await listTranscriptFiles());

  // agentType lookup: <agent-x>.jsonl -> agentType from sibling <agent-x>.meta.json
  const agentTypeByFile = new Map<string, string>();
  for (const metaPath of await listMetaFiles()) {
    try {
      const raw = JSON.parse(await fsp.readFile(metaPath, "utf8")) as { agentType?: string };
      if (raw.agentType) {
        agentTypeByFile.set(metaPath.replace(/\.meta\.json$/, ".jsonl"), raw.agentType);
      }
    } catch {
      /* ignore malformed meta */
    }
  }

  const groups = new Map<string, MsgGroup>();
  const sessionMeta = new Map<string, SessionMeta>();
  const seenUuids = new Set<string>();

  let lineCount = 0;
  let assistantLineCount = 0;
  let duplicateLineCount = 0;
  let malformedLineCount = 0;

  for (const file of transcriptFiles) {
    const { sessionId: pathSessionId, isSidechain, encDir } = classifyFile(file);
    const agentType = isSidechain ? agentTypeByFile.get(file) ?? null : null;
    const decodedFallback = decodeProjectDir(encDir);

    let stream: fs.ReadStream;
    try {
      stream = fs.createReadStream(file, { encoding: "utf8" });
    } catch {
      continue;
    }
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      lineCount++;
      let o: Record<string, unknown>;
      try {
        o = JSON.parse(line);
      } catch {
        malformedLineCount++;
        continue;
      }

      // Rule C: dedup resumed/forked copies by line uuid (first-seen wins).
      const uuid = typeof o.uuid === "string" ? o.uuid : null;
      if (uuid) {
        if (seenUuids.has(uuid)) {
          duplicateLineCount++;
          continue;
        }
        seenUuids.add(uuid);
      }

      const ts = typeof o.timestamp === "string" ? Date.parse(o.timestamp) : NaN;
      const cwd = typeof o.cwd === "string" && o.cwd ? o.cwd : "";

      // session timing / metadata (covers all line types, not just usage)
      let sm = sessionMeta.get(pathSessionId);
      if (!sm) {
        sm = {
          sessionId: pathSessionId,
          projectPath: cwd || decodedFallback,
          firstTs: Number.isFinite(ts) ? ts : Infinity,
          lastTs: Number.isFinite(ts) ? ts : -Infinity,
          userPromptCount: 0,
          title: null,
          fileCount: 0,
        };
        sessionMeta.set(pathSessionId, sm);
      }
      if (cwd) sm.projectPath = cwd;
      if (Number.isFinite(ts)) {
        if (ts < sm.firstTs) sm.firstTs = ts;
        if (ts > sm.lastTs) sm.lastTs = ts;
      }

      const type = o.type;
      if (type === "summary" && typeof o.summary === "string") {
        sm.title = o.summary;
      } else if (type === "ai-title") {
        const t = (o.title ?? o.name) as string | undefined;
        if (typeof t === "string") sm.title = t;
      } else if (type === "user" && !isSidechain && isHumanPrompt(o)) {
        sm.userPromptCount++;
      } else if (type === "assistant") {
        assistantLineCount++;
        const message = (o.message ?? {}) as Record<string, unknown>;
        const mid =
          typeof message.id === "string" && message.id
            ? message.id
            : `uuid:${uuid ?? `${file}:${lineCount}`}`;
        const usage = extractUsage(message.usage);
        const tools = toolNamesFromContent(message.content);
        const projectPath = cwd || sm.projectPath || decodedFallback;

        const existing = groups.get(mid);
        if (existing) {
          existing.usage = usage; // Rule A: last line of the message.id wins
          if (Number.isFinite(ts) && ts >= existing.ts) {
            existing.ts = ts;
            existing.timestamp = o.timestamp as string;
          }
          if (tools.length) existing.toolCalls.push(...tools);
        } else {
          groups.set(mid, {
            messageId: mid,
            uuid: uuid ?? mid,
            requestId: typeof o.requestId === "string" ? o.requestId : null,
            sessionId: pathSessionId,
            projectPath,
            ts: Number.isFinite(ts) ? ts : 0,
            timestamp: typeof o.timestamp === "string" ? o.timestamp : "",
            rawModel: typeof message.model === "string" ? message.model : "unknown",
            model: canonicalizeModel(message.model as string | undefined),
            usage,
            isSidechain,
            agentType,
            toolCalls: tools,
            serviceTier:
              typeof (message.usage as { service_tier?: string })?.service_tier === "string"
                ? (message.usage as { service_tier?: string }).service_tier ?? null
                : null,
            speed:
              typeof (message.usage as { speed?: string })?.speed === "string"
                ? (message.usage as { speed?: string }).speed ?? null
                : null,
            version: typeof o.version === "string" ? o.version : null,
            gitBranch: typeof o.gitBranch === "string" ? o.gitBranch : null,
          });
        }
      }
    }
    rl.close();
    const smFinal = sessionMeta.get(pathSessionId);
    if (smFinal) smFinal.fileCount++;
  }

  // materialize MessageRecords + cost + warnings
  const unpricedTokens = new Map<CanonicalModel, number>();
  const messages: MessageRecord[] = [];
  for (const g of groups.values()) {
    const cost = messageCostUSD(g.usage, g.model);
    if (!isPriced(g.model) && g.model !== "synthetic") {
      const tt = totalTokens(g.usage);
      if (tt > 0) unpricedTokens.set(g.model, (unpricedTokens.get(g.model) ?? 0) + tt);
    }
    messages.push({
      messageId: g.messageId,
      uuid: g.uuid,
      requestId: g.requestId,
      sessionId: g.sessionId,
      projectPath: g.projectPath,
      timestamp: g.timestamp,
      ts: g.ts,
      model: g.model,
      rawModel: g.rawModel,
      usage: g.usage,
      cost,
      isSidechain: g.isSidechain,
      agentType: g.agentType,
      toolCalls: g.toolCalls,
      serviceTier: g.serviceTier,
      speed: g.speed,
      version: g.version,
      gitBranch: g.gitBranch,
    });
  }
  messages.sort((a, b) => a.ts - b.ts);

  const warnings: string[] = [];
  for (const [m, tok] of unpricedTokens) {
    warnings.push(
      `${tok.toLocaleString("en-US")} tokens on unpriced model "${modelLabel(m)}" — add it to PRICING for accurate cost.`,
    );
  }

  // normalize sessionMeta (drop Infinity sentinels for empty timing)
  const sessionMetaObj: Record<string, SessionMeta> = {};
  for (const [id, sm] of sessionMeta) {
    sessionMetaObj[id] = {
      ...sm,
      firstTs: Number.isFinite(sm.firstTs) ? sm.firstTs : 0,
      lastTs: Number.isFinite(sm.lastTs) ? sm.lastTs : 0,
    };
  }

  const history = await loadHistory();

  return {
    builtAt: Date.now(),
    buildMs: Date.now() - started,
    messages,
    sessionMeta: sessionMetaObj,
    history,
    fileCount: transcriptFiles.length,
    lineCount,
    assistantLineCount,
    duplicateLineCount,
    malformedLineCount,
    distinctMessageCount: messages.length,
    warnings,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

async function loadHistory(): Promise<HistoryEntry[]> {
  let text: string;
  try {
    text = await fsp.readFile(HISTORY_FILE, "utf8");
  } catch {
    return [];
  }
  const out: HistoryEntry[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as Partial<HistoryEntry>;
      if (typeof o.display === "string" && typeof o.timestamp === "number") {
        out.push({
          display: o.display,
          timestamp: o.timestamp,
          project: o.project ?? "",
          sessionId: o.sessionId ?? "",
        });
      }
    } catch {
      /* skip */
    }
  }
  return out;
}

export { projectDisplayName };
