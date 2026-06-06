// Derive the "shareable card" highlight stats from the existing /api/summary
// response. Pure — no new API surface, just a reshape of data we already
// compute. Used by the /share page and the ShareCard component.

import type { SummaryResponse, HeatmapData } from "./dto";
import type { TokenUsage } from "./types";
import { fmtDate } from "./format";

export type ShareTemplate =
  | "wrapped"
  | "persona"
  | "receipt"
  | "loadout"
  | "rhythm"
  | "milestone"
  | "tokens"
  | "cache"
  | "models";
export type ShareRatio = "landscape" | "square" | "story";

export const TEMPLATES: { id: ShareTemplate; label: string; blurb: string }[] = [
  { id: "wrapped", label: "Wrapped", blurb: "The hero recap" },
  { id: "persona", label: "Persona", blurb: "Your coding archetype" },
  { id: "receipt", label: "Receipt", blurb: "Itemized cost per model" },
  { id: "loadout", label: "Loadout", blurb: "Your model stack" },
  { id: "rhythm", label: "Rhythm", blurb: "When you actually code" },
  { id: "milestone", label: "Milestone", blurb: "A moment worth posting" },
  { id: "tokens", label: "Token Maxer", blurb: "Big-number flex" },
  { id: "cache", label: "Cache Pro", blurb: "Caching efficiency" },
  { id: "models", label: "Model Mix", blurb: "Model breakdown" },
];

/** The subset of /api/summary that share cards read — also satisfied by the
 *  CLI's `Derived`, so both build identical ShareStats. */
export type ShareInput = Pick<
  SummaryResponse,
  "summary" | "models" | "sources" | "projects" | "tools" | "daily" | "heatmap"
>;

export const RATIOS: Record<ShareRatio, { w: number; h: number; label: string; sub: string }> = {
  landscape: { w: 1200, h: 630, label: "Landscape", sub: "X · LinkedIn" },
  square: { w: 1080, h: 1080, label: "Square", sub: "Instagram · X" },
  story: { w: 1080, h: 1920, label: "Story", sub: "9:16 vertical" },
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const tok = (u: TokenUsage) => u.input + u.output + u.cacheCreate + u.cacheRead;

export interface ShareSlice {
  label: string;
  color: string;
  pct: number; // 0..1 of total tokens
  tokens: number;
  cost: number;
}

export interface ShareStats {
  rangeLabel: string;
  days: number;
  totalTokens: number;
  billableTokens: number;
  cost: number;
  uncachedCost: number;
  messages: number;
  sessions: number;
  projects: number;
  toolCalls: number;
  cacheHitRate: number;
  cacheSavings: number;
  subagentPct: number;
  topModel?: ShareSlice;
  models: ShareSlice[];
  sources: ShareSlice[];
  topProject?: { name: string; tokens: number };
  topTool?: { name: string; count: number };
  peakHour: number | null;
  peakDay: string | null;
  weekendPct: number; // 0..1 of weekday+weekend activity that lands on Sat/Sun
  weekdayPct: number;
  busiestDay?: { label: string; tokens: number };
  spark: number[];
  heatmap: HeatmapData; // for the Rhythm card (hour×weekday grid + marginals)
}

function argmax(arr: number[]): number | null {
  if (!arr.length) return null;
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
  return arr[best] > 0 ? best : null;
}

export function deriveShareStats(data: ShareInput, opts?: { redact?: boolean }): ShareStats {
  const { summary, models, sources, projects, tools, daily, heatmap } = data;
  const total = summary.totalTokens || 1;

  const modelSlices: ShareSlice[] = models
    .map((m) => ({ label: m.label, color: m.color, tokens: tok(m.usage), pct: tok(m.usage) / total, cost: m.cost }))
    .filter((s) => s.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens);

  const sourceSlices: ShareSlice[] = sources
    .map((s) => ({ label: s.label, color: s.color, tokens: tok(s.usage), pct: tok(s.usage) / total, cost: s.cost }))
    .filter((s) => s.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens);

  // weekday vs weekend split from the heatmap marginals (0=Sun..6=Sat)
  const wd = heatmap.weekdayTotals;
  const weekend = (wd[0] ?? 0) + (wd[6] ?? 0);
  const weekday = (wd[1] ?? 0) + (wd[2] ?? 0) + (wd[3] ?? 0) + (wd[4] ?? 0) + (wd[5] ?? 0);
  const wTotal = weekend + weekday || 1;

  // busiest single day by token volume
  let busiest: { label: string; tokens: number } | undefined;
  for (const d of daily) {
    const t = tok(d.usage);
    if (!busiest || t > busiest.tokens) busiest = { label: d.date, tokens: t };
  }

  const peakDayIdx = argmax(heatmap.weekdayTotals);
  const topProj = projects[0];

  return {
    rangeLabel:
      summary.firstTs && summary.lastTs
        ? `${fmtDate(summary.firstTs)} – ${fmtDate(summary.lastTs)}`
        : "All time",
    days: summary.activeDays,
    totalTokens: summary.totalTokens,
    billableTokens: summary.billableTokens,
    cost: summary.cost,
    uncachedCost: summary.uncachedCost,
    messages: summary.messageCount,
    sessions: summary.sessionCount,
    projects: summary.projectCount,
    toolCalls: summary.toolCallCount,
    cacheHitRate: summary.cacheHitRate,
    cacheSavings: summary.cacheSavings,
    subagentPct: summary.totalTokens ? summary.subagentTokens / summary.totalTokens : 0,
    topModel: modelSlices[0],
    models: modelSlices.slice(0, 5),
    sources: sourceSlices,
    topProject: topProj && !opts?.redact ? { name: topProj.projectName, tokens: tok(topProj.usage) } : undefined,
    topTool: tools.tools[0] ? { name: tools.tools[0].name, count: tools.tools[0].count } : undefined,
    peakHour: argmax(heatmap.hourTotals),
    peakDay: peakDayIdx != null ? WEEKDAYS[peakDayIdx] : null,
    weekendPct: weekend / wTotal,
    weekdayPct: weekday / wTotal,
    busiestDay: busiest && busiest.tokens > 0
      ? { label: fmtDate(busiest.label), tokens: busiest.tokens }
      : undefined,
    spark: daily.map((d) => tok(d.usage)),
    heatmap,
  };
}
