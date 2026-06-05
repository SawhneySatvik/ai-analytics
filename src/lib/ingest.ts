import { projectDisplayName } from "./paths";
import { estimateCostUSD, isPricedFor } from "./pricing";
import { totalTokens } from "./usage";
import type {
  HistoryEntry,
  MessageRecord,
  Provider,
  SessionMeta,
  Snapshot,
} from "./types";
import { getEnabledLoaders } from "./sources";
import type { DiscoverResult, RawMessage } from "./sources/types";

// ── orchestration ────────────────────────────────────────────────────────────
// buildSnapshot fans out to each enabled source loader (Claude Code, Codex, …),
// merges their normalized records, then materializes cost uniformly. Each loader
// owns its own on-disk format; this layer stays source-agnostic.

function normalizeMeta(sm: SessionMeta): SessionMeta {
  return {
    ...sm,
    firstTs: Number.isFinite(sm.firstTs) ? sm.firstTs : 0,
    lastTs: Number.isFinite(sm.lastTs) ? sm.lastTs : 0,
  };
}

export async function buildSnapshot(discovered?: DiscoverResult[]): Promise<Snapshot> {
  const started = Date.now();
  const loaders = getEnabledLoaders();
  const discMap = new Map((discovered ?? []).map((d) => [d.source, d]));

  const raw: RawMessage[] = [];
  const sessionMetaObj: Record<string, SessionMeta> = {};
  const history: HistoryEntry[] = [];
  const warnings: string[] = [];
  let fileCount = 0;
  let lineCount = 0;
  let assistantLineCount = 0;
  let duplicateLineCount = 0;
  let malformedLineCount = 0;

  for (const loader of loaders) {
    const d = discMap.get(loader.source);
    if (d && !d.present) continue;
    let res;
    try {
      res = await loader.load(d);
    } catch (err) {
      warnings.push(
        `Failed to read ${loader.source} data: ${err instanceof Error ? err.message : "unknown error"}`,
      );
      continue;
    }
    raw.push(...res.messages);
    for (const [id, sm] of res.sessionMeta) sessionMetaObj[id] = normalizeMeta(sm);
    history.push(...res.history);
    fileCount += res.diagnostics.fileCount;
    lineCount += res.diagnostics.lineCount;
    assistantLineCount += res.diagnostics.assistantLineCount;
    duplicateLineCount += res.diagnostics.duplicateLineCount;
    malformedLineCount += res.diagnostics.malformedLineCount;
  }

  // materialize MessageRecords + cost + unpriced-model warnings
  const unpriced = new Map<string, { provider: Provider; label: string; tokens: number }>();
  const messages: MessageRecord[] = raw.map((g) => {
    const cost = estimateCostUSD(g.usage, g.provider, g.model, g.rawModel);
    if (!isPricedFor(g.provider, g.model, g.rawModel) && g.model !== "synthetic") {
      const tt = totalTokens(g.usage);
      if (tt > 0) {
        const key = `${g.provider}:${g.modelLabel}`;
        const e = unpriced.get(key) ?? { provider: g.provider, label: g.modelLabel, tokens: 0 };
        e.tokens += tt;
        unpriced.set(key, e);
      }
    }
    return { ...g, cost };
  });
  messages.sort((a, b) => a.ts - b.ts);

  for (const { provider, label, tokens } of unpriced.values()) {
    const table = provider === "anthropic" ? "PRICING" : "OPENAI_PRICING";
    warnings.push(
      `${tokens.toLocaleString("en-US")} tokens on unpriced model "${label}" — add it to ${table} for accurate cost.`,
    );
  }

  return {
    builtAt: Date.now(),
    buildMs: Date.now() - started,
    messages,
    sessionMeta: sessionMetaObj,
    history,
    fileCount,
    lineCount,
    assistantLineCount,
    duplicateLineCount,
    malformedLineCount,
    distinctMessageCount: messages.length,
    warnings,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export { projectDisplayName };
