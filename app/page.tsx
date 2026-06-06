"use client";

import { Coins, Database, MessagesSquare, Wrench } from "lucide-react";

import { useDashboard, useDashboardData } from "@/components/dashboard-context";
import {
  AnimatedNumber,
  Badge,
  Card,
  ErrorNote,
  Label,
  PageSkeleton,
  PanelTitle,
  Stagger,
  Stat,
} from "@/components/ui";
import {
  BarList,
  DonutChart,
  SimpleBarChart,
  Sparkline,
  StackedAreaChart,
  TOKEN_SERIES,
} from "@/components/charts";
import type { SummaryResponse } from "@/lib/dto";
import { dailyModelSeries, flattenDaily, fmtDayLabel } from "@/lib/chartData";
import { fmtCompact, fmtDate, fmtNum, fmtPct, fmtUSD } from "@/lib/format";
import { cn } from "@/lib/utils";

function HeroMetric({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg/50 p-3.5 backdrop-blur-sm transition-colors hover:border-accent/30">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className={cn(accent ? "text-accent" : "text-fg-muted")}>{icon}</span>
      </div>
      <div
        className={cn(
          "mt-1.5 text-2xl font-semibold tracking-tighter2 tabular",
          accent ? "text-accent" : "text-fg",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-fg-muted">{sub}</div>}
    </div>
  );
}

export default function OverviewPage() {
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");
  const { setFilters } = useDashboard();

  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <PageSkeleton />;

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
      <Stagger step={60}>
        {/* ── flagship hero ──────────────────────────────────────────────── */}
        <section className="sheen-top relative overflow-hidden rounded-2xl border border-border bg-bg-elev shadow-card">
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
            aria-hidden
          />
          <div className="relative grid gap-6 p-6 lg:grid-cols-[1fr_1.5fr] lg:p-7">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Label>Total usage</Label>
                  {summary.firstTs && (
                    <Badge tone="muted">
                      {fmtDate(summary.firstTs)} – {fmtDate(summary.lastTs)} · {summary.activeDays}d
                    </Badge>
                  )}
                </div>
                <div className="mt-3 font-sans text-[2.75rem] font-semibold leading-none tracking-tightest text-fg sm:text-5xl">
                  <AnimatedNumber value={summary.totalTokens} format={fmtCompact} />
                </div>
                <div className="mt-2.5 text-sm text-fg-muted">
                  tokens · <span className="text-fg">{fmtCompact(summary.billableTokens)}</span>{" "}
                  billable · {fmtNum(summary.sessionCount)} sessions · {summary.projectCount} projects
                </div>
              </div>
              <div className="-mb-1">
                <Sparkline data={rows.map((r) => r.total)} height={56} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <HeroMetric
                label="Est. cost"
                accent
                icon={<Coins className="h-4 w-4" />}
                value={<AnimatedNumber value={summary.cost} format={fmtUSD} />}
                sub="estimated"
              />
              <HeroMetric
                label="Messages"
                icon={<MessagesSquare className="h-4 w-4" />}
                value={<AnimatedNumber value={summary.messageCount} format={fmtNum} />}
                sub={`${fmtNum(summary.subagentMessageCount)} subagent`}
              />
              <HeroMetric
                label="Tool calls"
                icon={<Wrench className="h-4 w-4" />}
                value={<AnimatedNumber value={summary.toolCallCount} format={fmtNum} />}
              />
              <HeroMetric
                label="Cache hit"
                icon={<Database className="h-4 w-4" />}
                value={<AnimatedNumber value={summary.cacheHitRate} format={(n) => fmtPct(n)} />}
                sub={`saves ~${fmtUSD(summary.cacheSavings)}`}
              />
            </div>
          </div>
        </section>

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
      </Stagger>
    </div>
  );
}
