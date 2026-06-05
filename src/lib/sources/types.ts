// Per-tool ingestion contract. Each CLI tool (Claude Code, Codex, OpenCode)
// implements a SourceLoader that discovers its files and parses them into the
// SAME normalized record shape; the orchestrator (ingest.ts) merges them and
// applies cost uniformly.

import type { HistoryEntry, MessageRecord, SessionMeta, Source } from "../types";

/** A normalized record before cost is materialized (cost is added centrally). */
export type RawMessage = Omit<MessageRecord, "cost">;

/** Files that affect the cache signature for a source (mtime/size are hashed). */
export interface DiscoverResult {
  source: Source;
  present: boolean;
  /** transcript/db files whose mtime+size invalidate the cache */
  sigPaths: string[];
  /** auxiliary files (history, etc.) also folded into the signature */
  historyPaths: string[];
}

export interface LoaderDiagnostics {
  fileCount: number;
  lineCount: number;
  assistantLineCount: number;
  duplicateLineCount: number;
  malformedLineCount: number;
}

export interface LoaderResult {
  messages: RawMessage[];
  sessionMeta: Map<string, SessionMeta>;
  history: HistoryEntry[];
  diagnostics: LoaderDiagnostics;
}

export interface SourceLoader {
  source: Source;
  /** Cheaply resolve which files exist (for the cache signature). */
  discover(): Promise<DiscoverResult>;
  /** Parse everything for this source. May reuse a prior discover result. */
  load(discovered?: DiscoverResult): Promise<LoaderResult>;
}

export function emptyDiagnostics(): LoaderDiagnostics {
  return {
    fileCount: 0,
    lineCount: 0,
    assistantLineCount: 0,
    duplicateLineCount: 0,
    malformedLineCount: 0,
  };
}
