import os from "node:os";
import path from "node:path";

import type { Source } from "./types";

// Re-exported from the pure module so existing `import { ... } from "./paths"`
// call-sites keep working while the browser path imports them Node-free.
export { decodeProjectDir, projectDisplayName } from "./projectPath";

function envDir(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : fallback;
}

/**
 * Root of the Claude data directory. Override with CLAUDE_HOME to point the
 * dashboard at an alternate ~/.claude (useful for testing against a copy).
 */
export const CLAUDE_HOME = envDir("CLAUDE_HOME", path.join(os.homedir(), ".claude"));

export const PROJECTS_DIR = path.join(CLAUDE_HOME, "projects");
export const HISTORY_FILE = path.join(CLAUDE_HOME, "history.jsonl");
export const STATS_CACHE_FILE = path.join(CLAUDE_HOME, "stats-cache.json");

/**
 * OpenAI Codex CLI data dir (override with CODEX_HOME). Sessions are JSONL
 * "rollout" files under sessions/YYYY/MM/DD/.
 */
export const CODEX_HOME = envDir("CODEX_HOME", path.join(os.homedir(), ".codex"));
export const CODEX_SESSIONS_DIR = path.join(CODEX_HOME, "sessions");
export const CODEX_HISTORY_FILE = path.join(CODEX_HOME, "history.jsonl");

/**
 * OpenCode data dir (override with OPENCODE_HOME). Sessions/messages live in a
 * single SQLite database opencode.db (with -wal/-shm sidecars while live).
 */
export const OPENCODE_DATA_DIR = envDir(
  "OPENCODE_HOME",
  path.join(os.homedir(), ".local", "share", "opencode"),
);
export const OPENCODE_DB_FILE = path.join(OPENCODE_DATA_DIR, "opencode.db");

/**
 * Which sources to ingest. ANALYTICS_SOURCES is a comma-separated list
 * ("claude,codex"); defaults to all known sources. Unknown entries are ignored.
 */
const ALL_SOURCES: Source[] = ["claude", "codex", "opencode"];
export function enabledSources(): Source[] {
  const raw = process.env.ANALYTICS_SOURCES;
  if (!raw || !raw.trim()) return ALL_SOURCES;
  const want = new Set(raw.split(",").map((s) => s.trim().toLowerCase()));
  const picked = ALL_SOURCES.filter((s) => want.has(s));
  return picked.length ? picked : ALL_SOURCES;
}
