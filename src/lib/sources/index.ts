import { enabledSources } from "../paths";
import type { Source } from "../types";
import { claudeLoader } from "./claude";
import { codexLoader } from "./codex";
import type { SourceLoader } from "./types";

// Registered loaders. `opencode` is added on its own branch; until then an
// enabled-but-unregistered source is simply skipped.
const REGISTRY: Partial<Record<Source, SourceLoader>> = {
  claude: claudeLoader,
  codex: codexLoader,
};

/** Loaders for the sources turned on via ANALYTICS_SOURCES (default: all). */
export function getEnabledLoaders(): SourceLoader[] {
  return enabledSources()
    .map((s) => REGISTRY[s])
    .filter((l): l is SourceLoader => Boolean(l));
}
