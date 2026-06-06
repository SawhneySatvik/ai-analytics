import type { Snapshot } from "./types";

/**
 * Per-snapshot memo of computed route responses.
 *
 * `getSnapshot()` already caches the parsed snapshot, but each API request still
 * re-runs every aggregation over the filtered messages. This memo collapses
 * identical (snapshot, filter) queries to O(1).
 *
 * Keyed by the snapshot object identity via a WeakMap: when the snapshot
 * rebuilds (a new object), the old memo becomes unreachable and is
 * garbage-collected — so there is no manual invalidation to get wrong.
 */
const memo = new WeakMap<Snapshot, Map<string, unknown>>();

export function memoizeQuery<T>(snap: Snapshot, key: string, compute: () => T): T {
  let m = memo.get(snap);
  if (!m) {
    m = new Map();
    memo.set(snap, m);
  }
  if (m.has(key)) return m.get(key) as T;
  const value = compute();
  m.set(key, value);
  return value;
}

/** Deterministic key from request params, so identical filter combos collapse. */
export function filterKey(params: URLSearchParams): string {
  const p = new URLSearchParams(params);
  p.sort();
  return p.toString();
}
