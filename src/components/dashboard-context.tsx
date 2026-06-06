"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { MetaResponse } from "@/lib/dto";
import {
  getEntry,
  prefetch as prefetchUrl,
  revalidate,
  revalidateAll,
  subscribe,
} from "@/lib/dataCache";
import { useSnapshot } from "@/components/snapshot-provider";
import { resolveLocal } from "@/lib/staticResolve";

export interface ClientFilters {
  from?: number;
  to?: number;
  project?: string;
  source?: string;
  model?: string;
  branch?: string;
  scope: "all" | "main" | "subagent";
}

interface DashboardCtx {
  filters: ClientFilters;
  setFilters: (patch: Partial<ClientFilters>) => void;
  resetFilters: () => void;
  meta: MetaResponse | null;
  metaError: boolean;
  refresh: () => Promise<void>;
  refreshing: boolean;
  /** Warm an endpoint at the current filters (e.g. on nav hover). */
  prefetch: (endpoint: string) => void;
}

const Ctx = createContext<DashboardCtx | null>(null);

const DEFAULT_FILTERS: ClientFilters = { scope: "all" };

function buildQuery(filters: ClientFilters): string {
  const p = new URLSearchParams();
  if (filters.from != null) p.set("from", String(filters.from));
  if (filters.to != null) p.set("to", String(filters.to));
  if (filters.project) p.set("project", filters.project);
  if (filters.source) p.set("source", filters.source);
  if (filters.model) p.set("model", filters.model);
  if (filters.branch) p.set("branch", filters.branch);
  if (filters.scope && filters.scope !== "all") p.set("scope", filters.scope);
  return p.toString();
}

function urlFor(endpoint: string, filters: ClientFilters): string {
  const qs = buildQuery(filters);
  return qs ? `${endpoint}?${qs}` : endpoint;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const snap = useSnapshot();
  const isStatic = snap.mode === "static";
  const [filters, setFiltersState] = useState<ClientFilters>(DEFAULT_FILTERS);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [metaError, setMetaError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      const r = await fetch("/api/meta", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      setMeta((await r.json()) as MetaResponse);
      setMetaError(false);
    } catch {
      setMetaError(true);
    }
  }, []);

  useEffect(() => {
    if (isStatic) {
      // hosted build: meta comes from the in-browser snapshot (no server)
      if (snap.snapshot) {
        try {
          setMeta(resolveLocal("/api/meta", snap.snapshot) as MetaResponse);
          setMetaError(false);
        } catch {
          setMetaError(true);
        }
      }
      return;
    }
    void loadMeta();
    // Warm the two shared endpoints so the first navigation is instant. Both
    // dedupe against the pages' own first fetch.
    prefetchUrl("/api/summary");
    prefetchUrl("/api/sessions");
  }, [isStatic, snap.snapshot, loadMeta]);

  const setFilters = useCallback((patch: Partial<ClientFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isStatic) {
        // re-ingest from the connected folder/demo; the provider rewires the
        // resolver, re-runs every cached query, and updates the snapshot (which
        // refreshes meta via the effect above).
        await snap.refresh();
      } else {
        const r = await fetch("/api/refresh", { method: "POST", cache: "no-store" });
        if (r.ok) setMeta((await r.json()) as MetaResponse);
        // Server snapshot has been rebuilt — force every cached query to refetch.
        revalidateAll();
      }
    } catch {
      /* keep prior meta */
    } finally {
      setRefreshing(false);
    }
  }, [isStatic, snap]);

  const prefetch = useCallback(
    (endpoint: string) => prefetchUrl(urlFor(endpoint, filters)),
    [filters],
  );

  const value = useMemo<DashboardCtx>(
    () => ({ filters, setFilters, resetFilters, meta, metaError, refresh, refreshing, prefetch }),
    [filters, setFilters, resetFilters, meta, metaError, refresh, refreshing, prefetch],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetch a filter-aware endpoint through the shared SWR-lite cache. Paints
 * cached data instantly on revisit, revalidates in the background, dedupes
 * concurrent requests, and keeps the previous data visible while a new filter
 * combination loads.
 */
export function useDashboardData<T>(
  endpoint: string,
  opts?: { applyFilters?: boolean; extra?: Record<string, string> },
): FetchState<T> & { reload: () => void } {
  const { filters } = useDashboard();
  const applyFilters = opts?.applyFilters ?? true;

  const query = applyFilters ? buildQuery(filters) : "";
  const extraStr = opts?.extra ? new URLSearchParams(opts.extra).toString() : "";
  const qs = [query, extraStr].filter(Boolean).join("&");
  const url = qs ? `${endpoint}?${qs}` : endpoint;

  const entry = useSyncExternalStore(
    (cb) => subscribe(url, cb),
    () => getEntry(url),
    () => undefined,
  );

  useEffect(() => {
    void revalidate(url);
  }, [url]);

  // Keep the last good data visible while a new URL (e.g. after a filter change)
  // is still loading, mirroring the prior keep-previous-data behavior.
  const fresh = (entry?.data as T | undefined) ?? null;
  const lastData = useRef<T | null>(null);
  if (fresh !== null) lastData.current = fresh;

  const data = fresh ?? lastData.current;
  const loading = !entry || (entry.data === undefined && entry.error === undefined);
  const error = entry?.error ?? null;
  const reload = useCallback(() => void revalidate(url, true), [url]);

  return { data, loading, error, reload };
}
