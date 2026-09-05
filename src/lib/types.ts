// ───────────────────────────────────────────────────────────────────────────
// Shared types for the coding-CLI usage analytics app.
// ───────────────────────────────────────────────────────────────────────────

export type CanonicalModel =
  // current lineup
  | "fable-5-1"
  | "mythos-5-1"
  | "opus-5"
  | "sonnet-5"
  | "haiku-4-5"
  // legacy (still callable)
  | "fable-5"
  | "mythos-5"
  | "opus-4-8"
  | "opus-4-7"
  | "opus-4-6"
  | "opus-4-5"
  | "sonnet-4-6"
  | "sonnet-4-5"
  // retired, but still present in older transcripts
  | "opus-4-1"
  | "opus-4"
  | "sonnet-4"
  | "haiku-3-5"
  | "synthetic"
  | "unknown";

/** Which CLI tool a record came from. */
export type Source = "claude" | "codex" | "opencode";

/** The vendor behind the model (drives which pricing table applies). */
export type Provider = "anthropic" | "openai" | "opencode";

/** Display-ready model identity, source-agnostic (Claude canonical or free-form). */
export interface ModelTag {
  /** stable grouping key: canonical model for Claude, `provider:rawModel` otherwise */
  key: string;
  label: string;
  color: string;
}

/** The five billable token buckets plus server-tool request counts. */
export interface TokenUsage {
  input: number;
  output: number;
  cacheCreate5m: number;
  cacheCreate1h: number;
  /** = cache_creation_input_tokens (== 5m + 1h when the split is present). */
  cacheCreate: number;
  cacheRead: number;
  /** Reasoning/thinking output tokens reported separately (Codex/OpenCode); 0 for Claude. */
  reasoning: number;
  webSearch: number;
  webFetch: number;
}

/** One generation (one turn), deduped to exactly one record per message.id. */
export interface MessageRecord {
  messageId: string;
  uuid: string;
  requestId: string | null;
  sessionId: string; // parent session (path-derived; subagents roll up here)
  projectPath: string;
  timestamp: string; // ISO-8601 UTC
  ts: number; // epoch ms
  source: Source; // which CLI tool produced this record
  provider: Provider; // model vendor (pricing dispatch)
  model: CanonicalModel; // canonical key for Claude; "unknown" for other providers
  rawModel: string; // raw model id as written on disk
  modelLabel: string; // human-readable model name for display
  usage: TokenUsage;
  cost: number; // estimated USD
  isSidechain: boolean; // true => subagent / sidechain (Claude-only concept)
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
  source: Source;
  projectPath: string;
  firstTs: number;
  lastTs: number;
  userPromptCount: number;
  title: string | null;
  fileCount: number;
}

export interface SessionRecord {
  sessionId: string;
  source: Source;
  projectPath: string;
  projectName: string;
  firstTs: number;
  lastTs: number;
  durationMs: number;
  messageCount: number;
  toolCallCount: number;
  userPromptCount: number;
  models: ModelTag[];
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
  /** stable grouping key: canonical model for Claude, `provider:rawModel` otherwise */
  key: string;
  model: CanonicalModel;
  label: string;
  color: string;
  source: Source;
  provider: Provider;
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
  /** tokens (input+output+cacheCreate+cacheRead) per model key (see ModelRecord.key) */
  tokensByModel: Record<string, number>;
  /** tokens per source (claude/codex/opencode) */
  tokensBySource: Record<string, number>;
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
  source?: Source;
  model?: CanonicalModel;
  branch?: string;
  scope?: "all" | "main" | "subagent";
}
