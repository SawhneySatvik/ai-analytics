"use client";

import { useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, PanelTitle, Skeleton } from "@/components/ui";
import { DonutChart, StackedAreaChart } from "@/components/charts";
import { Table, type Column } from "@/components/Table";
import type { SummaryResponse } from "@/lib/dto";
import type { ModelRecord } from "@/lib/types";
import { dailyModelSeries, fmtDayLabel } from "@/lib/chartData";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@/lib/format";
import { modelColor, modelLabel } from "@/lib/models";

const tokTotal = (m: ModelRecord) =>
  m.usage.input + m.usage.output + m.usage.cacheCreate + m.usage.cacheRead;

export default function ModelsPage() {
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");
  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <Skeleton className="h-96" />;

  const { models, daily, speeds, summary } = data;
  const { data: modelData, series: modelSeries } = dailyModelSeries(
    daily,
    models.map((m) => m.model),
  );

  const tokenShare = models.map((m) => ({
    name: modelLabel(m.model),
    value: tokTotal(m),
    color: modelColor(m.model),
  }));
  const costShare = models
    .filter((m) => m.cost > 0)
    .map((m) => ({ name: modelLabel(m.model), value: m.cost, color: modelColor(m.model) }));

  const columns: Column<ModelRecord>[] = [
    {
      key: "model",
      header: "Model",
      render: (m) => (
        <span className="flex items-center gap-2 font-medium text-fg">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: modelColor(m.model) }} />
          {modelLabel(m.model)}
          {!m.priced && m.model !== "synthetic" && (
            <span className="font-mono text-[9px] uppercase text-amber-500">unpriced</span>
          )}
        </span>
      ),
    },
    { key: "messages", header: "Messages", align: "right", render: (m) => fmtNum(m.messageCount) },
    { key: "input", header: "Input", align: "right", render: (m) => fmtCompact(m.usage.input) },
    { key: "output", header: "Output", align: "right", render: (m) => fmtCompact(m.usage.output) },
    { key: "cw", header: "Cache write", align: "right", render: (m) => fmtCompact(m.usage.cacheCreate) },
    { key: "cr", header: "Cache read", align: "right", render: (m) => fmtCompact(m.usage.cacheRead) },
    {
      key: "ratio",
      header: "Out/In",
      align: "right",
      render: (m) => (m.usage.input > 0 ? (m.usage.output / m.usage.input).toFixed(1) : "—"),
    },
    { key: "total", header: "Total", align: "right", render: (m) => fmtCompact(tokTotal(m)) },
    {
      key: "cost",
      header: "Est. cost",
      align: "right",
      render: (m) => <span className="text-accent">{fmtUSD(m.cost)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Models" description="Token, cost and adoption breakdown per Claude model" />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <PanelTitle title="Model adoption over time" hint="Daily tokens per model — watch the 4.7 → 4.8 transition" />
          <StackedAreaChart data={modelData} xKey="date" series={modelSeries} xFormat={fmtDayLabel} height={280} />
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <PanelTitle title="Token share" />
            <DonutChart data={tokenShare} centerLabel="tokens" centerValue={fmtCompact(summary.totalTokens)} height={180} />
          </Card>
          <Card className="p-5">
            <PanelTitle title="Cost share" />
            <DonutChart data={costShare} centerLabel="est. cost" centerValue={fmtUSD(summary.cost)} height={180} valueFormat={fmtUSD} />
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <PanelTitle title="Per-model detail" />
        <Table columns={columns} rows={models} rowKey={(m) => m.model} />
      </Card>

      <Card className="p-5">
        <PanelTitle title="Speed / fast-mode" hint="From usage.speed on each message" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {speeds.map((s) => (
            <div key={s.speed} className="rounded-xl border border-border bg-bg/40 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">{s.speed}</div>
              <div className="mt-1 text-xl font-semibold text-fg tabular">{fmtNum(s.messageCount)}</div>
              <div className="text-[11px] text-fg-muted tabular">
                {fmtCompact(s.tokens)} tok · {fmtPct(summary.messageCount ? s.messageCount / summary.messageCount : 0)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
