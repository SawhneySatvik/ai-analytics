"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useDashboard, type ClientFilters } from "./dashboard-context";
import { modelLabel } from "@/lib/models";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CanonicalModel } from "@/lib/types";

const DAY = 86_400_000;

const PRESETS: { label: string; days: number | null }[] = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "All", days: null },
];

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-border bg-bg-elev pl-3 pr-8 text-xs text-fg outline-none transition-colors hover:border-accent/50 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="group inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 py-0.5 pl-2 pr-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-accent transition-colors hover:bg-accent/20"
    >
      {label}
      <X className="h-3 w-3 opacity-70 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

export function FilterBar() {
  const { filters, setFilters, resetFilters, meta } = useDashboard();
  const opts = meta?.options;

  const activePreset = (() => {
    if (filters.from == null && filters.to == null) return "All";
    if (filters.from != null && filters.to == null) {
      const days = Math.round((Date.now() - filters.from) / DAY);
      const match = PRESETS.find((p) => p.days === days);
      if (match) return match.label;
    }
    return null;
  })();

  const applyPreset = (days: number | null) => {
    if (days == null) setFilters({ from: undefined, to: undefined });
    else setFilters({ from: Date.now() - days * DAY, to: undefined });
  };

  const hasFilters =
    filters.from != null ||
    filters.to != null ||
    filters.project ||
    filters.source ||
    filters.model ||
    filters.branch ||
    filters.scope !== "all";

  // Active-filter chips — visible, individually clearable filter state.
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.from != null || filters.to != null) {
    const range = activePreset && activePreset !== "All" ? activePreset : "custom";
    chips.push({ key: "date", label: `range · ${range}`, clear: () => setFilters({ from: undefined, to: undefined }) });
  }
  if (filters.source) {
    const s = opts?.sources.find((x) => x.source === filters.source);
    chips.push({ key: "source", label: `tool · ${s?.label ?? filters.source}`, clear: () => setFilters({ source: undefined }) });
  }
  if (filters.project) {
    const p = opts?.projects.find((x) => x.path === filters.project);
    chips.push({ key: "project", label: `project · ${p?.name ?? "—"}`, clear: () => setFilters({ project: undefined }) });
  }
  if (filters.model) {
    chips.push({ key: "model", label: `model · ${modelLabel(filters.model as CanonicalModel)}`, clear: () => setFilters({ model: undefined }) });
  }
  if (filters.branch) {
    chips.push({ key: "branch", label: `branch · ${filters.branch}`, clear: () => setFilters({ branch: undefined }) });
  }
  if (filters.scope !== "all") {
    chips.push({ key: "scope", label: `scope · ${filters.scope}`, clear: () => setFilters({ scope: "all" }) });
  }

  return (
    <div className="border-b border-border bg-bg/60 backdrop-blur lg:px-6">
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 lg:px-0">
      <span className="mr-1 hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted sm:flex">
        <SlidersHorizontal className="h-3 w-3" /> filters
      </span>

      {/* date presets */}
      <div className="flex items-center rounded-lg border border-border bg-bg-elev p-0.5">
        {PRESETS.map((p) => {
          const active = activePreset === p.label;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.days)}
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors",
                active ? "bg-accent/15 text-accent" : "text-fg-muted hover:text-fg",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* source (only when more than one tool is present) */}
      {opts && opts.sources.length > 1 && (
        <div className="w-36">
          <Select value={filters.source ?? ""} onChange={(v) => setFilters({ source: v || undefined })}>
            <option value="">All tools</option>
            {opts.sources.map((s) => (
              <option key={s.source} value={s.source}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* project */}
      <div className="w-44">
        <Select value={filters.project ?? ""} onChange={(v) => setFilters({ project: v || undefined })}>
          <option value="">All projects</option>
          {opts?.projects.map((p) => (
            <option key={p.path} value={p.path}>
              {p.name} · {fmtCompact(p.tokens)}
            </option>
          ))}
        </Select>
      </div>

      {/* model */}
      <div className="w-32">
        <Select value={filters.model ?? ""} onChange={(v) => setFilters({ model: v || undefined })}>
          <option value="">All models</option>
          {opts?.models.map((m) => (
            <option key={m} value={m}>
              {modelLabel(m as CanonicalModel)}
            </option>
          ))}
        </Select>
      </div>

      {/* branch */}
      {opts && opts.branches.length > 0 && (
        <div className="w-36">
          <Select value={filters.branch ?? ""} onChange={(v) => setFilters({ branch: v || undefined })}>
            <option value="">All branches</option>
            {opts.branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* scope */}
      <div className="flex items-center rounded-lg border border-border bg-bg-elev p-0.5">
        {(["all", "main", "subagent"] as ClientFilters["scope"][]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilters({ scope: s })}
            className={cn(
              "rounded-md px-2 py-1 text-xs capitalize transition-colors",
              filters.scope === s ? "bg-accent/15 text-accent" : "text-fg-muted hover:text-fg",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="ml-auto flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-fg active:scale-95"
        >
          <X className="h-3 w-3" /> clear
        </button>
      )}
    </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2.5 lg:px-0">
          {chips.map((c) => (
            <Chip key={c.key} label={c.label} onClear={c.clear} />
          ))}
        </div>
      )}
    </div>
  );
}
