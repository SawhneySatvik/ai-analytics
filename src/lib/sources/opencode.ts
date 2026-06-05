import { existsSync } from "node:fs";

import { OPENCODE_DB_FILE } from "../paths";
import { prettyModelLabel } from "../models";
import { emptyUsage } from "../usage";
import type { SessionMeta, TokenUsage } from "../types";
import {
  emptyDiagnostics,
  type DiscoverResult,
  type LoaderResult,
  type RawMessage,
  type SourceLoader,
} from "./types";

// ── format ───────────────────────────────────────────────────────────────────
// OpenCode persists everything in a SQLite DB (~/.local/share/opencode/opencode.db):
//   session(id, directory, title, model, cost, tokens_*, time_created, time_updated)
//   message(id, session_id, time_created, time_updated, data TEXT-json)
//   part(id, message_id, session_id, data TEXT-json)
// The rich per-message record lives in message.data:
//   { role, modelID, providerID, cost, path:{cwd}, time:{created,completed},
//     tokens:{ input, output, reasoning, cache:{ read, write }, total } }
// Token identity (verified): total = input + output + reasoning + cache.read + cache.write.
// We fold `reasoning` into `output` (a sub-count, matching the Claude/Codex
// convention) so totalTokens() reconciles to `total`.
// Tool-call names come from part rows with data.type === "tool" (data.tool).

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

// Minimal structural view of node:sqlite (typed locally so it compiles even
// where @types/node lacks the experimental module).
interface SqliteStmt {
  all(...params: unknown[]): Record<string, unknown>[];
}
interface SqliteDB {
  prepare(sql: string): SqliteStmt;
  close(): void;
}
type DatabaseSyncCtor = new (path: string, opts?: { readOnly?: boolean }) => SqliteDB;

async function openReadOnly(file: string): Promise<SqliteDB | null> {
  try {
    const mod = (await import("node:sqlite")) as unknown as { DatabaseSync: DatabaseSyncCtor };
    return new mod.DatabaseSync(file, { readOnly: true });
  } catch {
    return null; // experimental module unavailable / open failed → no-op
  }
}

function hasTable(db: SqliteDB, name: string): boolean {
  try {
    return (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").all(name).length > 0
    );
  } catch {
    return false;
  }
}

interface MsgData {
  role?: string;
  modelID?: string;
  providerID?: string;
  cost?: number;
  path?: { cwd?: string; root?: string };
  time?: { created?: number };
  tokens?: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: { read?: number; write?: number };
  };
}

function usageFrom(t: NonNullable<MsgData["tokens"]>): TokenUsage {
  const u = emptyUsage();
  const reasoning = num(t.reasoning);
  u.input = num(t.input);
  u.output = num(t.output) + reasoning; // fold reasoning into output (sub-count)
  u.reasoning = reasoning;
  u.cacheRead = num(t.cache?.read);
  u.cacheCreate = num(t.cache?.write);
  return u;
}

async function load(discovered?: DiscoverResult): Promise<LoaderResult> {
  const diag = emptyDiagnostics();
  const messages: RawMessage[] = [];
  const sessionMeta = new Map<string, SessionMeta>();

  const present = discovered ? discovered.present : existsSync(OPENCODE_DB_FILE);
  if (!present) return { messages, sessionMeta, history: [], diagnostics: diag };

  const db = await openReadOnly(OPENCODE_DB_FILE);
  if (!db) return { messages, sessionMeta, history: [], diagnostics: diag };

  try {
    if (!hasTable(db, "message") || !hasTable(db, "session")) {
      return { messages, sessionMeta, history: [], diagnostics: diag };
    }

    // session metadata (directory/title/timing) keyed by id
    const sessions = new Map<
      string,
      { directory: string; title: string | null; timeCreated: number; timeUpdated: number }
    >();
    for (const r of db.prepare(
      "SELECT id, directory, title, time_created, time_updated FROM session",
    ).all()) {
      sessions.set(str(r.id), {
        directory: str(r.directory),
        title: typeof r.title === "string" && r.title ? r.title : null,
        timeCreated: num(r.time_created),
        timeUpdated: num(r.time_updated),
      });
    }

    // tool-call names per message (best-effort)
    const toolsByMsg = new Map<string, string[]>();
    if (hasTable(db, "part")) {
      try {
        for (const r of db
          .prepare(
            "SELECT message_id AS mid, json_extract(data,'$.tool') AS tool FROM part WHERE json_extract(data,'$.type')='tool'",
          )
          .all()) {
          const mid = str(r.mid);
          const tool = str(r.tool);
          if (!mid || !tool) continue;
          const arr = toolsByMsg.get(mid) ?? [];
          arr.push(tool);
          toolsByMsg.set(mid, arr);
        }
      } catch {
        /* json_extract unavailable / shape differs → no tool names */
      }
    }

    const userPrompts = new Map<string, number>();

    for (const row of db
      .prepare("SELECT id, session_id, time_created, data FROM message ORDER BY time_created")
      .all()) {
      diag.lineCount++;
      let d: MsgData;
      try {
        d = JSON.parse(str(row.data)) as MsgData;
      } catch {
        diag.malformedLineCount++;
        continue;
      }

      const sessionId = str(row.session_id);
      if (d.role === "user") {
        userPrompts.set(sessionId, (userPrompts.get(sessionId) ?? 0) + 1);
        continue;
      }
      if (d.role !== "assistant" || !d.tokens) continue;

      diag.assistantLineCount++;
      const usage = usageFrom(d.tokens);
      const sess = sessions.get(sessionId);
      const ts = num(d.time?.created) || num(row.time_created);
      const providerID = str(d.providerID);
      const modelID = str(d.modelID);
      const messageId = str(row.id);

      messages.push({
        messageId,
        uuid: messageId,
        requestId: null,
        sessionId,
        projectPath: d.path?.cwd || sess?.directory || "",
        ts,
        timestamp: ts ? new Date(ts).toISOString() : "",
        source: "opencode",
        provider: "opencode",
        model: "unknown",
        rawModel: providerID ? `${providerID}/${modelID}` : modelID || "unknown",
        modelLabel: prettyModelLabel(modelID),
        usage,
        recordedCost: typeof d.cost === "number" ? d.cost : undefined,
        isSidechain: false,
        agentType: null,
        toolCalls: toolsByMsg.get(messageId) ?? [],
        serviceTier: null,
        speed: null,
        version: null,
        gitBranch: null,
      });
    }

    // session metadata for every session that produced messages
    const seen = new Set(messages.map((m) => m.sessionId));
    for (const id of seen) {
      const s = sessions.get(id);
      sessionMeta.set(id, {
        sessionId: id,
        source: "opencode",
        projectPath: s?.directory || "",
        firstTs: s?.timeCreated ?? 0,
        lastTs: s?.timeUpdated ?? 0,
        userPromptCount: userPrompts.get(id) ?? 0,
        title: s?.title ?? null,
        fileCount: 1,
      });
    }
    diag.fileCount = sessionMeta.size;
  } finally {
    try {
      db.close();
    } catch {
      /* already closed */
    }
  }

  return { messages, sessionMeta, history: [], diagnostics: diag };
}

export const opencodeLoader: SourceLoader = {
  source: "opencode",
  async discover(): Promise<DiscoverResult> {
    const present = existsSync(OPENCODE_DB_FILE);
    // Writes land in the WAL before checkpoint, so include it in the signature.
    const sigPaths = present
      ? [OPENCODE_DB_FILE, `${OPENCODE_DB_FILE}-wal`].filter((p) => existsSync(p))
      : [];
    return { source: "opencode", present, sigPaths, historyPaths: [] };
  },
  load,
};
