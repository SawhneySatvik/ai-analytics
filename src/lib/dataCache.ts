// SWR-lite: a module-level fetch cache with stale-while-revalidate and in-flight
// dedup, keyed by request URL. Most pages share /api/summary at the same filter
// key, so after the first load, navigating between them paints instantly from
// cache while a background revalidation keeps the numbers fresh.
//
// Designed to back `useDashboardData` via useSyncExternalStore — every state
// change replaces the entry object (never mutates) so getSnapshot stays stable
// between updates.

export interface CacheEntry<T = unknown> {
  data?: T;
  error?: string;
  updatedAt: number;
  promise?: Promise<void>;
}

const store = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

// In the hosted static build there is no server; the in-browser SnapshotProvider
// installs a resolver that answers the same endpoint URLs from the on-device
// Snapshot. When set, revalidate() uses it instead of fetch().
let localResolver: ((url: string) => Promise<unknown>) | null = null;
export function setLocalResolver(fn: ((url: string) => Promise<unknown>) | null): void {
  localResolver = fn;
}

// On mount/navigation we revalidate at most this often per key; a manual refresh
// bypasses it. Data only changes on refresh or on-disk edits, so a generous
// window avoids redundant fetches (and any flicker) on rapid back-navigation.
const DEDUPE_MS = 10_000;

function emit(url: string): void {
  const set = listeners.get(url);
  if (set) for (const cb of set) cb();
}

export function subscribe(url: string, cb: () => void): () => void {
  let set = listeners.get(url);
  if (!set) {
    set = new Set();
    listeners.set(url, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(url);
  };
}

export function getEntry(url: string): CacheEntry | undefined {
  return store.get(url);
}

/**
 * Ensure `url` is fetched. Returns the in-flight promise if one exists (dedup),
 * skips fetching when the cached entry is still fresh (unless `force`), and
 * keeps any stale data visible while the new request is in flight.
 */
export function revalidate(url: string, force = false): Promise<void> | void {
  const existing = store.get(url);
  if (existing?.promise) return existing.promise; // dedup in-flight
  if (!force && existing?.data !== undefined && Date.now() - existing.updatedAt < DEDUPE_MS) {
    return; // still fresh
  }

  const run = (async () => {
    try {
      let json: unknown;
      if (localResolver) {
        json = await localResolver(url);
      } else {
        const r = await fetch(url, { cache: "no-store" });
        json = await r.json();
        if (!r.ok) throw new Error((json as { error?: string })?.error || String(r.status));
      }
      store.set(url, { data: json, updatedAt: Date.now() });
    } catch (err) {
      const prev = store.get(url);
      store.set(url, {
        data: prev?.data, // keep last good data visible on error
        error: err instanceof Error ? err.message : "request failed",
        updatedAt: prev?.updatedAt ?? 0,
      });
    } finally {
      emit(url);
    }
  })();

  store.set(url, { ...(existing ?? { updatedAt: 0 }), promise: run });
  emit(url); // surface the loading state
  return run;
}

/** Warm a URL without subscribing (e.g. on app mount or nav hover). */
export function prefetch(url: string): void {
  void revalidate(url, false);
}

/**
 * Force-revalidate every cached URL. Called after a manual refresh once the
 * server snapshot has been rebuilt; stale data stays visible until each
 * refetch resolves.
 */
export function revalidateAll(): void {
  for (const url of [...store.keys()]) void revalidate(url, true);
}
