import os from "node:os";
import path from "node:path";

/**
 * Root of the Claude data directory. Override with CLAUDE_HOME to point the
 * dashboard at an alternate ~/.claude (useful for testing against a copy).
 */
export const CLAUDE_HOME =
  process.env.CLAUDE_HOME && process.env.CLAUDE_HOME.trim().length > 0
    ? process.env.CLAUDE_HOME
    : path.join(os.homedir(), ".claude");

export const PROJECTS_DIR = path.join(CLAUDE_HOME, "projects");
export const HISTORY_FILE = path.join(CLAUDE_HOME, "history.jsonl");
export const STATS_CACHE_FILE = path.join(CLAUDE_HOME, "stats-cache.json");

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
