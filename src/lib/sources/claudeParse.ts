// Pure Claude-transcript parser — no filesystem. Both the Node loader
// (src/lib/sources/claude.ts) and the browser loader feed it file text; it
// mutates a shared accumulator so dedup/folding work across files exactly as the
// original streaming loader did.

import { canonicalizeModel, modelLabel } from "../models";
import { extractUsage } from "../usage";
import type { CanonicalModel, HistoryEntry, SessionMeta, TokenUsage } from "../types";
import { emptyDiagnostics, type LoaderDiagnostics, type RawMessage } from "./types";

export interface ClaudeAcc {
  groups: Map<string, RawMessage>;
  sessionMeta: Map<string, SessionMeta>;
  seenUuids: Set<string>;
  diag: LoaderDiagnostics;
  lineCount: number; // running counter for fallback message ids
}

export function newClaudeAcc(): ClaudeAcc {
  return {
    groups: new Map(),
    sessionMeta: new Map(),
    seenUuids: new Set(),
    diag: emptyDiagnostics(),
    lineCount: 0,
  };
}

export interface ClaudeFileCtx {
  sessionId: string;
  isSidechain: boolean;
  agentType: string | null;
  /** decoded project dir fallback (when a line has no cwd) */
  decodedFallback: string;
  /** stable key for fallback ids (file path or handle name) */
  fileKey: string;
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

/** Parse one transcript file's text into the shared accumulator. */
export function parseClaudeText(text: string, ctx: ClaudeFileCtx, acc: ClaudeAcc): void {
  const { sessionId: pathSessionId, isSidechain, agentType, decodedFallback, fileKey } = ctx;
  const { groups, sessionMeta, seenUuids, diag } = acc;

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    diag.lineCount++;
    acc.lineCount++;
    let o: Record<string, unknown>;
    try {
      o = JSON.parse(line);
    } catch {
      diag.malformedLineCount++;
      continue;
    }

    // Rule C: dedup resumed/forked copies by line uuid (first-seen wins).
    const uuid = typeof o.uuid === "string" ? o.uuid : null;
    if (uuid) {
      if (seenUuids.has(uuid)) {
        diag.duplicateLineCount++;
        continue;
      }
      seenUuids.add(uuid);
    }

    const ts = typeof o.timestamp === "string" ? Date.parse(o.timestamp) : NaN;
    const cwd = typeof o.cwd === "string" && o.cwd ? o.cwd : "";

    let sm = sessionMeta.get(pathSessionId);
    if (!sm) {
      sm = {
        sessionId: pathSessionId,
        source: "claude",
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
      diag.assistantLineCount++;
      const message = (o.message ?? {}) as Record<string, unknown>;
      const mid =
        typeof message.id === "string" && message.id
          ? message.id
          : `uuid:${uuid ?? `${fileKey}:${acc.lineCount}`}`;
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
        const model: CanonicalModel = canonicalizeModel(message.model as string | undefined);
        const usageVal: TokenUsage = usage;
        groups.set(mid, {
          messageId: mid,
          uuid: uuid ?? mid,
          requestId: typeof o.requestId === "string" ? o.requestId : null,
          sessionId: pathSessionId,
          projectPath,
          ts: Number.isFinite(ts) ? ts : 0,
          timestamp: typeof o.timestamp === "string" ? o.timestamp : "",
          source: "claude",
          provider: "anthropic",
          rawModel: typeof message.model === "string" ? message.model : "unknown",
          model,
          modelLabel: modelLabel(model),
          usage: usageVal,
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

  const smFinal = sessionMeta.get(pathSessionId);
  if (smFinal) smFinal.fileCount++;
}

export function parseClaudeHistory(text: string): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
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

/** agentType lookup from a sibling `.meta.json` file's text (sidechain transcripts). */
export function parseAgentMeta(text: string): string | null {
  try {
    const raw = JSON.parse(text) as { agentType?: string };
    return raw.agentType ?? null;
  } catch {
    return null;
  }
}
