// Pure Codex-rollout parser — no filesystem. Per-turn usage is derived by
// DIFFING the cumulative `total_token_usage` between successive token_count
// events (per file). Shared by the Node loader and the browser loader.

import { prettyModelLabel } from "../models";
import { emptyUsage } from "../usage";
import type { HistoryEntry, SessionMeta, TokenUsage } from "../types";
import { emptyDiagnostics, type LoaderDiagnostics, type RawMessage } from "./types";

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

interface CumUsage {
  input: number;
  cached: number;
  output: number;
  reasoning: number;
  total: number;
}

function readCum(info: Record<string, unknown>): CumUsage | null {
  const t = info.total_token_usage as Record<string, unknown> | undefined;
  if (!t) return null;
  return {
    input: num(t.input_tokens),
    cached: num(t.cached_input_tokens),
    output: num(t.output_tokens),
    reasoning: num(t.reasoning_output_tokens),
    total: num(t.total_tokens),
  };
}

function deltaUsage(prev: CumUsage, cur: CumUsage): TokenUsage {
  const dInput = Math.max(0, cur.input - prev.input);
  const dCached = Math.max(0, cur.cached - prev.cached);
  const dOutput = Math.max(0, cur.output - prev.output);
  const dReasoning = Math.max(0, cur.reasoning - prev.reasoning);
  const u = emptyUsage();
  u.input = Math.max(0, dInput - dCached);
  u.cacheRead = dCached;
  u.output = dOutput;
  u.reasoning = dReasoning;
  return u;
}

function sessionIdFromName(baseName: string): string {
  const m = baseName.match(/rollout-.*?-([0-9a-f-]{36})\.jsonl$/i);
  return m?.[1] ?? baseName.replace(/\.jsonl$/, "");
}

export interface CodexAcc {
  messages: RawMessage[];
  sessionMeta: Map<string, SessionMeta>;
  diag: LoaderDiagnostics;
}

export function newCodexAcc(): CodexAcc {
  return { messages: [], sessionMeta: new Map(), diag: emptyDiagnostics() };
}

/** Parse one rollout file's text into the shared accumulator. */
export function parseCodexText(text: string, baseName: string, acc: CodexAcc): void {
  const { messages, sessionMeta, diag } = acc;
  const fileTag = baseName.replace(/\.jsonl$/, "");
  let sessionId = sessionIdFromName(baseName);
  let cwd = "";
  let model = "unknown";
  let prev: CumUsage = { input: 0, cached: 0, output: 0, reasoning: 0, total: 0 };
  let turnIndex = 0;
  let pendingTools: string[] = [];
  let firstTs = Infinity;
  let lastTs = -Infinity;
  let userPromptCount = 0;
  let title: string | null = null;

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    diag.lineCount++;
    let o: { timestamp?: string; type?: string; payload?: Record<string, unknown> };
    try {
      o = JSON.parse(line);
    } catch {
      diag.malformedLineCount++;
      continue;
    }
    const payload = o.payload ?? {};
    const ts = typeof o.timestamp === "string" ? Date.parse(o.timestamp) : NaN;
    if (Number.isFinite(ts)) {
      if (ts < firstTs) firstTs = ts;
      if (ts > lastTs) lastTs = ts;
    }

    switch (o.type) {
      case "session_meta": {
        if (typeof payload.id === "string" && payload.id) sessionId = payload.id;
        if (typeof payload.cwd === "string") cwd = payload.cwd;
        break;
      }
      case "turn_context": {
        if (typeof payload.model === "string" && payload.model) model = payload.model;
        if (typeof payload.cwd === "string" && payload.cwd) cwd = payload.cwd;
        break;
      }
      case "response_item": {
        if (payload.type === "function_call" && typeof payload.name === "string") {
          pendingTools.push(payload.name);
        }
        break;
      }
      case "event_msg": {
        const pType = payload.type;
        if (pType === "user_message") {
          userPromptCount++;
          if (!title && typeof payload.message === "string") {
            title = payload.message.replace(/\s+/g, " ").trim().slice(0, 120) || null;
          }
        } else if (pType === "token_count") {
          diag.assistantLineCount++;
          const info = payload.info as Record<string, unknown> | null | undefined;
          if (!info) break;
          const cur = readCum(info);
          if (!cur) break;
          if (cur.total <= prev.total) {
            prev = cur;
            pendingTools = [];
            break;
          }
          const usage = deltaUsage(prev, cur);
          prev = cur;
          const tools = pendingTools;
          pendingTools = [];
          messages.push({
            messageId: `${fileTag}:${turnIndex}`,
            uuid: `${fileTag}:${turnIndex}`,
            requestId: null,
            sessionId,
            projectPath: cwd,
            ts: Number.isFinite(ts) ? ts : 0,
            timestamp: typeof o.timestamp === "string" ? o.timestamp : "",
            source: "codex",
            provider: "openai",
            model: "unknown",
            rawModel: model,
            modelLabel: prettyModelLabel(model),
            usage,
            isSidechain: false,
            agentType: null,
            toolCalls: tools,
            serviceTier: null,
            speed: null,
            version: null,
            gitBranch: null,
          });
          turnIndex++;
        }
        break;
      }
    }
  }

  if (turnIndex > 0 || userPromptCount > 0) {
    const existing = sessionMeta.get(sessionId);
    const sm: SessionMeta = existing ?? {
      sessionId,
      source: "codex",
      projectPath: cwd,
      firstTs: Number.isFinite(firstTs) ? firstTs : 0,
      lastTs: Number.isFinite(lastTs) ? lastTs : 0,
      userPromptCount: 0,
      title: null,
      fileCount: 0,
    };
    if (cwd) sm.projectPath = cwd;
    if (Number.isFinite(firstTs)) sm.firstTs = Math.min(sm.firstTs || firstTs, firstTs);
    if (Number.isFinite(lastTs)) sm.lastTs = Math.max(sm.lastTs, lastTs);
    sm.userPromptCount += userPromptCount;
    if (!sm.title && title) sm.title = title;
    sm.fileCount += 1;
    sessionMeta.set(sessionId, sm);
  }
  diag.fileCount++;
}

export function parseCodexHistory(text: string): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as { session_id?: string; ts?: number; text?: string };
      if (typeof o.text === "string" && typeof o.ts === "number") {
        out.push({ display: o.text, timestamp: o.ts * 1000, project: "", sessionId: o.session_id ?? "" });
      }
    } catch {
      /* skip */
    }
  }
  return out;
}
