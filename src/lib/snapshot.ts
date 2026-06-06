// Pure snapshot assembly — combine loader results into a Snapshot. No fs, no
// Node loaders, so it's importable from both the Node orchestrator (ingest.ts)
// and the in-browser ingest path.

import { estimateCostUSD, isPricedFor } from "./pricing";
import { totalTokens } from "./usage";
import type {
  HistoryEntry,
  MessageRecord,
  Provider,
  SessionMeta,
  Snapshot,
} from "./types";
import type { LoaderResult, RawMessage } from "./sources/types";

function normalizeMeta(sm: SessionMeta): SessionMeta {
  return {
    ...sm,
    firstTs: Number.isFinite(sm.firstTs) ? sm.firstTs : 0,
    lastTs: Number.isFinite(sm.lastTs) ? sm.lastTs : 0,
  };
}

/**
 * Combine loader results into a Snapshot: merge messages/session-meta/history,
 * materialize per-message cost (recorded cost preferred over estimate), collect
 * unpriced-model warnings, and sort. Pure (no fs) — shared by the Node
 * `buildSnapshot` and the browser ingest path.
 */
export function finalizeSnapshot(
  results: LoaderResult[],
  opts?: { startedAt?: number; extraWarnings?: string[] },
): Snapshot {
  const started = opts?.startedAt ?? Date.now();
  const raw: RawMessage[] = [];
  const sessionMetaObj: Record<string, SessionMeta> = {};
  const history: HistoryEntry[] = [];
  const warnings: string[] = [...(opts?.extraWarnings ?? [])];
  let fileCount = 0;
  let lineCount = 0;
  let assistantLineCount = 0;
  let duplicateLineCount = 0;
  let malformedLineCount = 0;

  for (const res of results) {
    raw.push(...res.messages);
    for (const [id, sm] of res.sessionMeta) sessionMetaObj[id] = normalizeMeta(sm);
    history.push(...res.history);
    fileCount += res.diagnostics.fileCount;
    lineCount += res.diagnostics.lineCount;
    assistantLineCount += res.diagnostics.assistantLineCount;
    duplicateLineCount += res.diagnostics.duplicateLineCount;
    malformedLineCount += res.diagnostics.malformedLineCount;
  }

  // materialize MessageRecords + cost + unpriced-model warnings.
  // A loader may carry a real recorded cost (OpenCode); prefer it over the
  // token estimate, and skip the unpriced warning in that case.
  const unpriced = new Map<string, { provider: Provider; label: string; tokens: number }>();
  const messages: MessageRecord[] = raw.map((g) => {
    const { recordedCost, ...rest } = g;
    const cost = recordedCost ?? estimateCostUSD(rest.usage, rest.provider, rest.model, rest.rawModel);
    if (
      recordedCost == null &&
      !isPricedFor(rest.provider, rest.model, rest.rawModel) &&
      rest.model !== "synthetic"
    ) {
      const tt = totalTokens(rest.usage);
      if (tt > 0) {
        const key = `${rest.provider}:${rest.modelLabel}`;
        const e = unpriced.get(key) ?? { provider: rest.provider, label: rest.modelLabel, tokens: 0 };
        e.tokens += tt;
        unpriced.set(key, e);
      }
    }
    return { ...rest, cost };
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
