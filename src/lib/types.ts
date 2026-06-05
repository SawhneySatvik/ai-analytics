// ───────────────────────────────────────────────────────────────────────────
// Shared types for the Claude usage analytics app.
// ───────────────────────────────────────────────────────────────────────────

export type CanonicalModel =
  | "opus-4-8"
  | "opus-4-7"
  | "sonnet-4-6"
  | "haiku-4-5"
  | "synthetic"
  | "unknown";

/** The five billable token buckets plus server-tool request counts. */
export interface TokenUsage {
  input: number;
  output: number;
  cacheCreate5m: number;
  cacheCreate1h: number;
  /** = cache_creation_input_tokens (== 5m + 1h when the split is present). */
  cacheCreate: number;
  cacheRead: number;
  webSearch: number;
  webFetch: number;
}

/** One Claude generation, deduped to exactly one record per message.id. */
export interface MessageRecord {
  messageId: string;
  uuid: string;
  requestId: string | null;
  sessionId: string; // parent session (path-derived; subagents roll up here)
  projectPath: string;
  timestamp: string; // ISO-8601 UTC
  ts: number; // epoch ms
  model: CanonicalModel;
  rawModel: string;
  usage: TokenUsage;
  cost: number; // estimated USD
  isSidechain: boolean; // true => subagent / sidechain
  agentType: string | null; // subagent type, from sibling *.meta.json
  toolCalls: string[]; // tool_use block names emitted by this message
  serviceTier: string | null;
  speed: string | null; // "fast" indicates fast-mode
  version: string | null;
  gitBranch: string | null;
}

/** Per-session timing/title gathered from all (deduped) lines, not just usage. */
export interface SessionMeta {
  sessionId: string;
  projectPath: string;
  firstTs: number;
  lastTs: number;
  userPromptCount: number;
  title: string | null;
  fileCount: number;
}

export interface SessionRecord {
  sessionId: string;
  projectPath: string;
  projectName: string;
  firstTs: number;
  lastTs: number;
  durationMs: number;
  messageCount: number;
  toolCallCount: number;
  userPromptCount: number;
  models: CanonicalModel[];
  usage: TokenUsage;
  cost: number;
  subagentMessageCount: number;
  isResumed: boolean;
  title: string | null;
}

export interface ProjectRecord {
  projectPath: string;
  projectName: string;
  sessionCount: number;
  messageCount: number;
  toolCallCount: number;
  usage: TokenUsage;
  cost: number;
  firstTs: number;
  lastTs: number;
}

export interface ModelRecord {
  model: CanonicalModel;
  messageCount: number;
  usage: TokenUsage;
  cost: number;
  priced: boolean;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD in the configured timezone
  usage: TokenUsage;
  cost: number;
  messageCount: number;
  toolCallCount: number;
  sessionCount: number;
  /** tokens (input+output+cacheCreate+cacheRead) per canonical model */
  tokensByModel: Record<string, number>;
}

export interface HistoryEntry {
  display: string;
  timestamp: number;
  project: string;
  sessionId: string;
}

/** The full in-memory snapshot, cached and invalidated by file signature. */
export interface Snapshot {
  builtAt: number;
  buildMs: number;
  messages: MessageRecord[];
  sessionMeta: Record<string, SessionMeta>;
  history: HistoryEntry[];
  // Ingestion diagnostics
  fileCount: number;
  lineCount: number;
  assistantLineCount: number;
  duplicateLineCount: number;
  malformedLineCount: number;
  distinctMessageCount: number;
  warnings: string[];
  timezone: string;
}

export interface Filters {
  from?: number; // epoch ms inclusive
  to?: number; // epoch ms inclusive
  project?: string; // projectPath
  model?: CanonicalModel;
  branch?: string;
  scope?: "all" | "main" | "subagent";
}
