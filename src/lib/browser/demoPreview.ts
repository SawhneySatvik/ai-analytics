"use client";

// Loads the bundled synthetic demo snapshot once and resolves it through the
// SAME pure builder the dashboard uses, so the marketing previews render real
// product output (no API, no provider gate). Memoized module-side so the web
// and terminal previews share a single fetch + parse.

import { useEffect, useState } from "react";

import type { SummaryResponse } from "@/lib/dto";
import type { Snapshot, TokenUsage } from "@/lib/types";
import { loadDemoSnapshot } from "@/lib/browser/ingest";
import { resolveLocal } from "@/lib/staticResolve";

let cache: SummaryResponse | null = null;
let inflight: Promise<SummaryResponse> | null = null;

export async function getDemoSummary(): Promise<SummaryResponse> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      const snap: Snapshot = await loadDemoSnapshot();
      cache = resolveLocal("/api/summary", snap) as SummaryResponse;
      return cache;
    })();
  }
  return inflight;
}

/** Subscribe to the demo summary; null until the first fetch resolves. */
export function useDemoSummary(): SummaryResponse | null {
  const [data, setData] = useState<SummaryResponse | null>(cache);
  useEffect(() => {
    let cancelled = false;
    void getDemoSummary()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        /* demo asset missing — previews simply stay in their skeleton state */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return data;
}

/** Total tokens for a usage record (matches the dashboard's definition). */
export function totalTokens(u: TokenUsage): number {
  return u.input + u.output + u.cacheCreate + u.cacheRead;
}
