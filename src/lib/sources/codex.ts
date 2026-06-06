import fsp from "node:fs/promises";
import path from "node:path";

import { CODEX_SESSIONS_DIR, CODEX_HISTORY_FILE } from "../paths";
import type { HistoryEntry } from "../types";
import { walk } from "./fsutil";
import { newCodexAcc, parseCodexHistory, parseCodexText } from "./codexParse";
import type { DiscoverResult, LoaderResult, SourceLoader } from "./types";

// Codex writes ~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl. Per-turn
// usage is derived by diffing cumulative token_count events — see codexParse.ts.

async function listRolloutFiles(): Promise<string[]> {
  const all = await walk(CODEX_SESSIONS_DIR);
  return all.filter((f) => /rollout-.*\.jsonl$/.test(path.basename(f)));
}

async function load(discovered?: DiscoverResult): Promise<LoaderResult> {
  const files = discovered?.sigPaths ?? (await listRolloutFiles());
  const acc = newCodexAcc();

  for (const file of files) {
    let text: string;
    try {
      text = await fsp.readFile(file, "utf8");
    } catch {
      continue;
    }
    parseCodexText(text, path.basename(file), acc);
  }

  let history: HistoryEntry[] = [];
  try {
    history = parseCodexHistory(await fsp.readFile(CODEX_HISTORY_FILE, "utf8"));
  } catch {
    /* no history file */
  }

  return { messages: acc.messages, sessionMeta: acc.sessionMeta, history, diagnostics: acc.diag };
}

export const codexLoader: SourceLoader = {
  source: "codex",
  async discover(): Promise<DiscoverResult> {
    const sigPaths = await listRolloutFiles();
    return { source: "codex", present: sigPaths.length > 0, sigPaths, historyPaths: [CODEX_HISTORY_FILE] };
  },
  load,
};
