"use client";

import { useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, PanelTitle, Skeleton } from "@/components/ui";
import { DonutChart, StackedAreaChart } from "@/components/charts";
import { Table, type Column } from "@/components/Table";
import type { SummaryResponse } from "@/lib/dto";
import type { SourceRecord } from "@/lib/aggregate";
import { dailySourceSeries, fmtDayLabel } from "@/lib/chartData";
import { totalTokens } from "@/lib/usage";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@/lib/format";

export default function SourcesPage() {
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");
  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <Skeleton className="h-96" />;

  const { sources, daily, summary } = data;
  const { data: srcData, series: srcSeries } = dailySourceSeries(daily, sources);

  const tokenShare = sources.map((s) => ({
    name: s.label,
    value: totalTokens(s.usage),
    color: s.color,
  }));
  const costShare = sources
    .filter((s) => s.cost > 0)
    .map((s) => ({ name: s.label, value: s.cost, color: s.color }));

  const columns: Column<SourceRecord>[] = [
    {
      key: "tool",
      header: "Tool",
      render: (s) => (
        <span className="flex items-center gap-2 font-medium text-fg">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ),
    },
    { key: "sessions", header: "Sessions", align: "right", render: (s) => fmtNum(s.sessionCount) },
    { key: "messages", header: "Messages", align: "right", render: (s) => fmtNum(s.messageCount) },
    { key: "input", header: "Input", align: "right", render: (s) => fmtCompact(s.usage.input) },
    { key: "output", header: "Output", align: "right", render: (s) => fmtCompact(s.usage.output) },
    { key: "reasoning", header: "Reasoning", align: "right", render: (s) => fmtCompact(s.usage.reasoning) },
    { key: "cr", header: "Cache read", align: "right", render: (s) => fmtCompact(s.usage.cacheRead) },
    { key: "total", header: "Total", align: "right", render: (s) => fmtCompact(totalTokens(s.usage)) },
    {
      key: "cost",
      header: "Est. cost",
      align: "right",
      render: (s) => <span className="text-accent">{fmtUSD(s.cost)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tools"
        description="Usage broken down by CLI — Claude Code, Codex, and more"
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <PanelTitle title="Tokens by tool over time" hint="Daily totals per CLI" />
          <StackedAreaChart data={srcData} xKey="date" series={srcSeries} xFormat={fmtDayLabel} height={280} />
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <PanelTitle title="Token share" />
            <DonutChart data={tokenShare} centerLabel="tokens" centerValue={fmtCompact(summary.totalTokens)} height={180} />
          </Card>
          <Card className="p-5">
            <PanelTitle title="Cost share" hint="Estimated" />
            <DonutChart data={costShare} centerLabel="est. cost" centerValue={fmtUSD(summary.cost)} height={180} valueFormat={fmtUSD} />
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <PanelTitle title="Per-tool detail" />
        <Table columns={columns} rows={sources} rowKey={(s) => s.source} />
      </Card>

      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
          {sources.map((s) => (
            <span key={s.source} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label} · {fmtNum(s.messageCount)} msgs · {fmtPct(summary.messageCount ? s.messageCount / summary.messageCount : 0)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
