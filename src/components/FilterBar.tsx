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
        className="h-8 w-full appearance-none rounded-lg border border-border bg-bg-elev pl-3 pr-8 text-xs text-fg outline-none transition-colors hover:border-accent/50 focus:border-accent"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
    </div>
  );
}

export function FilterBar() {
  const { filters, setFilters, resetFilters, meta } = useDashboard();
  const opts = meta?.options;

  const activePreset = (() => {
    if (filters.from == null && filters.to == null) return "All";
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
    filters.model ||
    filters.branch ||
    filters.scope !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg/60 px-4 py-2.5 backdrop-blur lg:px-6">
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
          className="ml-auto flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
        >
          <X className="h-3 w-3" /> clear
        </button>
      )}
    </div>
  );
}
