"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useDashboardData } from "@/components/dashboard-context";
import { Badge, Card, ErrorNote, Kpi, PageSkeleton, PanelTitle } from "@/components/ui";
import { BarList, DonutChart, MultiLineChart, StackedAreaChart, TOKEN_SERIES } from "@/components/charts";
import type { SessionDetailResponse } from "@/lib/dto";
import { cacheHitRate, totalTokens } from "@/lib/usage";
import { fmtCompact, fmtDateTime, fmtDuration, fmtNum, fmtPct, fmtUSD } from "@/lib/format";
import { sourceLabel } from "@/lib/models";

export default function SessionDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, error } = useDashboardData<SessionDetailResponse>("/api/sessions", {
    applyFilters: false,
    extra: id ? { id } : undefined,
  });

  if (error && !data) return <ErrorNote message={`Couldn't load session — ${error}`} />;
  if (!data) return <PageSkeleton kpis={6} />;

  const { session, summary, timeline, tools, subagents, models } = data;

  const tokenRows = timeline.map((p, i) => ({
    i: i + 1,
    input: p.input,
    output: p.output,
    cacheCreate: p.cacheCreate,
    cacheRead: p.cacheRead,
  }));
  let cum = 0;
  const costRows = timeline.map((p, i) => {
    cum += p.cost;
    return { i: i + 1, cumCost: cum };
  });
  const idxFmt = (v: string | number) => `#${v}`;

  return (
    <div className="space-y-5">
      <Link href="/sessions" className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> back to sessions
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-fg">
            {session.projectName}
            {session.isResumed && <Badge tone="muted">resumed</Badge>}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">{session.title || "Untitled session"}</p>
          <p className="mt-1 font-mono text-[11px] text-fg-muted">
            {session.sessionId} · {fmtDateTime(session.firstTs)} → {fmtDateTime(session.lastTs)} ·{" "}
            {fmtDuration(session.durationMs)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge tone="muted">{sourceLabel(session.source)}</Badge>
          {session.models.map((m) => (
            <Badge key={m.key} tone="default">
              <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
              {m.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Tokens" value={fmtCompact(summary.totalTokens)} />
        <Kpi label="Est. cost" value={fmtUSD(summary.cost)} accent />
        <Kpi label="Messages" value={fmtNum(summary.messageCount)} />
        <Kpi label="Tool calls" value={fmtNum(summary.toolCallCount)} />
        <Kpi label="Subagent msgs" value={fmtNum(summary.subagentMessageCount)} />
        <Kpi label="Cache hit" value={fmtPct(cacheHitRate(summary.usage))} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <PanelTitle title="Token usage across the session" hint="Per message, in order" />
          <StackedAreaChart data={tokenRows} xKey="i" series={TOKEN_SERIES} xFormat={idxFmt} />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Cumulative est. cost" />
          <MultiLineChart
            data={costRows}
            xKey="i"
            series={[{ key: "cumCost", name: "Cost", color: "hsl(217 91% 60%)" }]}
            valueFormat={fmtUSD}
            xFormat={idxFmt}
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <PanelTitle title="Tools used" hint={`${fmtNum(tools.totalToolCalls)} calls`} />
          <BarList items={tools.tools.map((t) => ({ label: t.name, value: t.count }))} valueFormat={fmtNum} emptyText="No tool calls" />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Subagents" hint={`${session.subagentMessageCount} sidechain messages`} />
          <BarList
            items={subagents.map((s) => ({ label: s.agentType, value: s.tokens, sub: `${s.messageCount} msgs · ${fmtUSD(s.cost)}` }))}
            emptyText="No subagents in this session"
          />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Models" />
          <DonutChart
            data={models.map((m) => ({
              name: m.label,
              value: totalTokens(m.usage),
              color: m.color,
            }))}
            centerLabel="tokens"
            centerValue={fmtCompact(summary.totalTokens)}
            height={200}
          />
        </Card>
      </div>
    </div>
  );
}
