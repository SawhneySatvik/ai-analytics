// Pure project-path helpers — no Node APIs, so they're safe to import from both
// the Node loaders (via paths.ts) and the in-browser ingest path.

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
