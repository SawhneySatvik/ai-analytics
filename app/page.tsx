"use client";

import { Coins, Database, FolderGit2, MessagesSquare, Wrench, Zap } from "lucide-react";

import { useDashboard, useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, Kpi, Label, PanelTitle, Skeleton, Stat } from "@/components/ui";
import {
  BarList,
  DonutChart,
  SimpleBarChart,
  StackedAreaChart,
  TOKEN_SERIES,
} from "@/components/charts";
import type { SummaryResponse } from "@/lib/dto";
import { dailyModelSeries, flattenDaily, fmtDayLabel } from "@/lib/chartData";
import { fmtCompact, fmtDate, fmtNum, fmtPct, fmtUSD } from "@/lib/format";

export default function OverviewPage() {
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");
  const { setFilters } = useDashboard();

  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );

  const { summary, daily, models, projects, tools, heatmap } = data;
  const rows = flattenDaily(daily);
  const { data: modelData, series: modelSeries } = dailyModelSeries(daily, models);

  const busiest = rows.reduce<(typeof rows)[number] | null>(
    (acc, r) => (acc == null || r.total > acc.total ? r : acc),
    null,
  );
  const peakHour = heatmap.hourTotals.reduce(
    (best, v, i) => (v > best.v ? { h: i, v } : best),
    { h: 0, v: -1 },
  );

  const tokenMix = [
    { name: "Input", value: summary.usage.input, color: TOKEN_SERIES[0].color },
    { name: "Output", value: summary.usage.output, color: TOKEN_SERIES[1].color },
    { name: "Cache write", value: summary.usage.cacheCreate, color: TOKEN_SERIES[2].color },
    { name: "Cache read", value: summary.usage.cacheRead, color: TOKEN_SERIES[3].color },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        description={
          summary.firstTs
            ? `${fmtDate(summary.firstTs)} – ${fmtDate(summary.lastTs)} · ${summary.activeDays} active days · ${data.meta.timezone}`
            : "No activity in range"
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label="Total tokens"
          value={fmtCompact(summary.totalTokens)}
          sub={`${fmtCompact(summary.billableTokens)} billable`}
          icon={<Zap className="h-4 w-4" />}
        />
        <Kpi
          label="Est. cost"
          value={fmtUSD(summary.cost)}
          sub="estimated"
          accent
          icon={<Coins className="h-4 w-4" />}
        />
        <Kpi
          label="Messages"
          value={fmtNum(summary.messageCount)}
          sub={`${fmtNum(summary.subagentMessageCount)} subagent`}
          icon={<MessagesSquare className="h-4 w-4" />}
        />
        <Kpi label="Sessions" value={fmtNum(summary.sessionCount)} sub={`${summary.projectCount} projects`} icon={<FolderGit2 className="h-4 w-4" />} />
        <Kpi label="Tool calls" value={fmtNum(summary.toolCallCount)} icon={<Wrench className="h-4 w-4" />} />
        <Kpi
          label="Cache hit"
          value={fmtPct(summary.cacheHitRate)}
          sub={`saves ~${fmtUSD(summary.cacheSavings)}`}
          icon={<Database className="h-4 w-4" />}
        />
      </div>

      {/* tokens over time + token mix */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <PanelTitle title="Token usage over time" hint="Stacked by token type, per day" />
          <StackedAreaChart data={rows} xKey="date" series={TOKEN_SERIES} xFormat={fmtDayLabel} />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Token mix" />
          <DonutChart data={tokenMix} centerLabel="tokens" centerValue={fmtCompact(summary.totalTokens)} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {tokenMix.map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-bg/40 px-2.5 py-1.5 text-xs">
                <span className="flex items-center gap-1.5 text-fg-muted">
                  <span className="h-2 w-2 rounded-[2px]" style={{ background: t.color }} />
                  {t.name}
                </span>
                <span className="tabular text-fg">{fmtCompact(t.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* model trend + cost */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <PanelTitle title="Tokens by model" hint="Daily totals across all token types" />
          <StackedAreaChart data={modelData} xKey="date" series={modelSeries} xFormat={fmtDayLabel} />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Estimated cost over time" hint="Token-derived, secondary estimate" />
          <SimpleBarChart
            data={rows}
            xKey="date"
            bars={[{ key: "cost", name: "Cost", color: "hsl(217 91% 60%)" }]}
            valueFormat={fmtUSD}
            xFormat={fmtDayLabel}
          />
        </Card>
      </div>

      {/* highlights */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Busiest day" value={busiest ? fmtDayLabel(busiest.date) : "—"} sub={busiest ? `${fmtCompact(busiest.total)} tokens` : undefined} />
        <Stat label="Peak hour" value={peakHour.v >= 0 ? `${peakHour.h}:00` : "—"} sub={peakHour.v >= 0 ? `${fmtNum(peakHour.v)} msgs` : undefined} />
        <Stat label="Subagent tokens" value={fmtCompact(summary.subagentTokens)} sub={fmtPct(summary.totalTokens ? summary.subagentTokens / summary.totalTokens : 0)} />
        <Stat label="Web search · fetch" value={`${fmtNum(summary.webSearch)} · ${fmtNum(summary.webFetch)}`} sub="server tool requests" />
      </div>

      {/* top projects + top tools */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <PanelTitle title="Top projects" hint="Click to filter the whole dashboard" />
          <BarList
            items={projects.slice(0, 8).map((p) => ({
              label: p.projectName,
              value: p.usage.input + p.usage.output + p.usage.cacheCreate + p.usage.cacheRead,
              sub: `${p.sessionCount} sessions · ${fmtUSD(p.cost)}`,
              onClick: () => setFilters({ project: p.projectPath }),
            }))}
          />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Top tools" hint={`${fmtNum(tools.totalToolCalls)} tool calls total`} />
          <BarList
            items={tools.tools.slice(0, 8).map((t) => ({ label: t.name, value: t.count }))}
            valueFormat={fmtNum}
          />
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Label>models in range</Label>
        {models.map((m) => (
          <span key={m.key} className="flex items-center gap-1.5 text-xs text-fg-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
            {m.label} · {fmtCompact(m.usage.input + m.usage.output + m.usage.cacheCreate + m.usage.cacheRead)}
          </span>
        ))}
      </div>
    </div>
  );
}
