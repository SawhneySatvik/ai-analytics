"use client";

import { useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, Kpi, PanelTitle, Skeleton, Stat } from "@/components/ui";
import { MultiLineChart, StackedAreaChart } from "@/components/charts";
import type { SummaryResponse } from "@/lib/dto";
import { flattenDaily, fmtDayLabel } from "@/lib/chartData";
import { fmtCompact, fmtPct, fmtUSD } from "@/lib/format";

export default function CachePage() {
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");
  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <Skeleton className="h-96" />;

  const { summary } = data;
  const rows = flattenDaily(data.daily);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cache"
        description="Prompt-cache behavior and the cost it saves you"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Cache hit rate" value={fmtPct(summary.cacheHitRate)} sub="reads / (reads + writes)" />
        <Kpi label="Cache read" value={fmtCompact(summary.usage.cacheRead)} sub="tokens served from cache" />
        <Kpi label="Cache write" value={fmtCompact(summary.usage.cacheCreate)} sub="tokens written to cache" />
        <Kpi label="Est. savings" value={fmtUSD(summary.cacheSavings)} accent sub="vs no caching" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <PanelTitle title="Cache read vs write volume" hint="Daily tokens" />
          <StackedAreaChart
            data={rows}
            xKey="date"
            series={[
              { key: "cacheRead", name: "Cache read", color: "hsl(158 64% 46%)" },
              { key: "cacheCreate", name: "Cache write", color: "hsl(38 92% 56%)" },
            ]}
            xFormat={fmtDayLabel}
          />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Cache hit rate over time" />
          <MultiLineChart
            data={rows}
            xKey="date"
            series={[{ key: "cacheHitRate", name: "Hit rate", color: "hsl(217 91% 60%)" }]}
            valueFormat={(n) => fmtPct(n)}
            xFormat={fmtDayLabel}
          />
        </Card>
      </div>

      <Card className="p-5">
        <PanelTitle title="Cost impact of caching" hint="Estimated, from the editable pricing config" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Actual est. cost" value={fmtUSD(summary.cost)} sub="with prompt caching" />
          <Stat label="Hypothetical cost" value={fmtUSD(summary.uncachedCost)} sub="if every read were full input" />
          <Stat label="Saved by caching" value={fmtUSD(summary.cacheSavings)} sub={fmtPct(summary.uncachedCost ? summary.cacheSavings / summary.uncachedCost : 0) + " lower"} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-fg-muted">
          Cache reads dominate token <em>counts</em> but are billed at a fraction of input rate, so
          they barely move cost while saving large amounts versus re-sending context uncached. Dollar
          figures are estimates derived from token counts using the rates in{" "}
          <code className="rounded bg-bg px-1 py-0.5 font-mono text-[11px]">src/lib/pricing.ts</code>.
        </p>
      </Card>
    </div>
  );
}
