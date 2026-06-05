import os from "node:os";
import path from "node:path";

import type { Source } from "./types";

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

/**
 * Decode an encoded project directory name back to its cwd. The encoding is
 * lossy (every "/" became "-"), so this is only a fallback for display when a
 * transcript line is missing its `cwd`. Real project identity always comes
 * from the line's `cwd`.
 */
export function decodeProjectDir(dir: string): string {
  return dir.replace(/-/g, "/");
}

/** Short, human-friendly project name (basename of the cwd). */
export function projectDisplayName(projectPath: string): string {
  const parts = projectPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || projectPath;
}
