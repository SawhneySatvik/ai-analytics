"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MetaResponse } from "@/lib/dto";

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
  version: number;
  refresh: () => Promise<void>;
  refreshing: boolean;
}

const Ctx = createContext<DashboardCtx | null>(null);

const DEFAULT_FILTERS: ClientFilters = { scope: "all" };

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<ClientFilters>(DEFAULT_FILTERS);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [metaError, setMetaError] = useState(false);
  const [version, setVersion] = useState(0);
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
    void loadMeta();
  }, [loadMeta]);

  const setFilters = useCallback((patch: Partial<ClientFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/refresh", { method: "POST", cache: "no-store" });
      if (r.ok) setMeta((await r.json()) as MetaResponse);
    } catch {
      /* keep prior meta */
    } finally {
      setRefreshing(false);
      setVersion((v) => v + 1); // force all data hooks to refetch
    }
  }, []);

  const value = useMemo<DashboardCtx>(
    () => ({ filters, setFilters, resetFilters, meta, metaError, version, refresh, refreshing }),
    [filters, setFilters, resetFilters, meta, metaError, version, refresh, refreshing],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

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

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetch a filter-aware endpoint. Refetches whenever the global filters or the
 * refresh `version` change. Keeps prior data visible during refetches.
 */
export function useDashboardData<T>(
  endpoint: string,
  opts?: { applyFilters?: boolean; extra?: Record<string, string> },
): FetchState<T> & { reload: () => void } {
  const { filters, version } = useDashboard();
  const applyFilters = opts?.applyFilters ?? true;
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  const dataRef = useRef<T | null>(null);
  const [manual, setManual] = useState(0);

  const query = applyFilters ? buildQuery(filters) : "";
  const extraStr = opts?.extra ? new URLSearchParams(opts.extra).toString() : "";
  const qs = [query, extraStr].filter(Boolean).join("&");
  const url = qs ? `${endpoint}?${qs}` : endpoint;

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: dataRef.current ? null : s.error }));
    fetch(url, { cache: "no-store", signal: ctrl.signal })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || String(r.status));
        dataRef.current = json as T;
        setState({ data: json as T, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        setState({
          data: dataRef.current,
          loading: false,
          error: err instanceof Error ? err.message : "request failed",
        });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, version, manual]);

  return { ...state, reload: () => setManual((m) => m + 1) };
}
