"use client";

// A browser-window mock that renders the *real* dashboard chart components fed
// by the bundled demo snapshot — so the showcase is the actual product, not a
// static picture. Falls back to a skeleton until the demo data resolves.

import { StackedAreaChart, DonutChart, Heatmap } from "@/components/charts";
import { dailyModelSeries, fmtDayLabel } from "@/lib/chartData";
import { fmtCompact, fmtUSD } from "@/lib/format";
import { useDemoSummary, totalTokens } from "@/lib/browser/demoPreview";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-bg/40 px-3 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight text-fg tabular">{value}</div>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />;
}

export function WebPreview() {
  const s = useDemoSummary();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev/60 shadow-pop backdrop-blur-xl">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-bg/50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="ml-2 flex-1">
          <div className="mx-auto flex w-fit max-w-full items-center gap-2 rounded-md border border-border/60 bg-bg-elev/80 px-3 py-1 font-mono text-[10px] text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
            agentmon · overview
          </div>
        </div>
      </div>

      {/* dashboard body */}
      <div className="space-y-4 p-4 sm:p-5">
        {s ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Kpi label="Tokens" value={fmtCompact(s.summary.totalTokens)} />
              <Kpi label="Cost" value={fmtUSD(s.summary.cost)} />
              <Kpi label="Messages" value={fmtCompact(s.summary.messageCount)} />
              <Kpi label="Sessions" value={fmtCompact(s.summary.sessionCount)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <div className="rounded-xl border border-border/70 bg-bg/30 p-3 lg:col-span-3">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
                  Tokens / day · by model
                </div>
                {(() => {
                  const { data, series } = dailyModelSeries(s.daily, s.models.slice(0, 5));
                  return (
                    <StackedAreaChart data={data} xKey="date" series={series} height={172} xFormat={fmtDayLabel} />
                  );
                })()}
              </div>

              <div className="rounded-xl border border-border/70 bg-bg/30 p-3 lg:col-span-2">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">Model mix</div>
                <DonutChart
                  data={s.models.slice(0, 6).map((m) => ({
                    name: m.label,
                    value: totalTokens(m.usage),
                    color: m.color,
                  }))}
                  height={172}
                  centerLabel="tokens"
                  centerValue={fmtCompact(s.summary.totalTokens)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-bg/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">When you code</div>
                <div className="hidden items-center gap-3 sm:flex">
                  {s.models.slice(0, 3).map((m) => (
                    <span key={m.key} className="flex items-center gap-1.5 text-[10px] text-fg-muted">
                      <Dot c={m.color} /> {m.label}
                    </span>
                  ))}
                </div>
              </div>
              <Heatmap cells={s.heatmap.cells} metric="tokens" />
            </div>
          </>
        ) : (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-bg/50" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="h-48 rounded-xl bg-bg/50 lg:col-span-3" />
              <div className="h-48 rounded-xl bg-bg/50 lg:col-span-2" />
            </div>
            <div className="h-28 rounded-xl bg-bg/50" />
          </div>
        )}
      </div>
    </div>
  );
}
