"use client";

import { useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, Kpi, PageSkeleton, PanelTitle } from "@/components/ui";
import { BarList, SimpleBarChart } from "@/components/charts";
import { Table, type Column } from "@/components/Table";
import type { SummaryResponse } from "@/lib/dto";
import type { SubagentStat } from "@/lib/aggregate";
import { flattenDaily, fmtDayLabel } from "@/lib/chartData";
import { fmtCompact, fmtNum, fmtUSD } from "@/lib/format";

export default function ToolsPage() {
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");
  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <PageSkeleton kpis={4} />;

  const { tools, subagents, daily, summary } = data;
  const rows = flattenDaily(daily);

  const subColumns: Column<SubagentStat>[] = [
    { key: "type", header: "Agent type", render: (s) => <span className="font-medium text-fg">{s.agentType}</span> },
    { key: "msgs", header: "Messages", align: "right", render: (s) => fmtNum(s.messageCount) },
    { key: "tokens", header: "Tokens", align: "right", render: (s) => fmtCompact(s.tokens) },
    { key: "cost", header: "Est. cost", align: "right", render: (s) => <span className="text-accent">{fmtUSD(s.cost)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Tools" description="Tool-call frequency, server tools, and subagent activity" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Tool calls" value={fmtNum(tools.totalToolCalls)} />
        <Kpi label="Distinct tools" value={fmtNum(tools.tools.length)} />
        <Kpi label="Web searches" value={fmtNum(tools.webSearch)} />
        <Kpi label="Web fetches" value={fmtNum(tools.webFetch)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <PanelTitle title="Tool-call frequency" hint="All tools in range" />
          <BarList items={tools.tools.map((t) => ({ label: t.name, value: t.count }))} valueFormat={fmtNum} />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Tool calls per day" />
          <SimpleBarChart
            data={rows}
            xKey="date"
            bars={[{ key: "toolCalls", name: "Tool calls", color: "hsl(263 70% 64%)" }]}
            valueFormat={fmtNum}
            xFormat={fmtDayLabel}
          />
        </Card>
      </div>

      <Card className="p-5">
        <PanelTitle
          title="Subagents"
          hint={`${fmtNum(summary.subagentMessageCount)} sidechain messages · ${fmtCompact(summary.subagentTokens)} tokens`}
        />
        {subagents.length > 0 ? (
          <Table columns={subColumns} rows={subagents} rowKey={(s) => s.agentType} />
        ) : (
          <p className="py-8 text-center text-xs text-fg-muted">No subagent activity in range.</p>
        )}
      </Card>
    </div>
  );
}
