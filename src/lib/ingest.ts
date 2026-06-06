import { projectDisplayName } from "./paths";
import { finalizeSnapshot } from "./snapshot";
import type { Snapshot } from "./types";
import { getEnabledLoaders } from "./sources";
import type { DiscoverResult, LoaderResult } from "./sources/types";

// ── orchestration ────────────────────────────────────────────────────────────
// buildSnapshot fans out to each enabled source loader (Claude Code, Codex, …),
// merges their normalized records, then materializes cost uniformly. Each loader
// owns its own on-disk format; this layer stays source-agnostic. The combine +
// cost + sort tail lives in the pure, browser-safe `finalizeSnapshot`.

export async function buildSnapshot(discovered?: DiscoverResult[]): Promise<Snapshot> {
  const started = Date.now();
  const loaders = getEnabledLoaders();
  const discMap = new Map((discovered ?? []).map((d) => [d.source, d]));

  const results: LoaderResult[] = [];
  const loadWarnings: string[] = [];
  for (const loader of loaders) {
    const d = discMap.get(loader.source);
    if (d && !d.present) continue;
    try {
      results.push(await loader.load(d));
    } catch (err) {
      loadWarnings.push(
        `Failed to read ${loader.source} data: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }
  return finalizeSnapshot(results, { startedAt: started, extraWarnings: loadWarnings });
}

export { finalizeSnapshot };
export { projectDisplayName };
