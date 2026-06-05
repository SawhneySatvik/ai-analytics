"use client";

import { X } from "lucide-react";

import { useDashboard, useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, Kpi, PanelTitle, Skeleton } from "@/components/ui";
import { BarList, DonutChart, StackedAreaChart, TOKEN_SERIES } from "@/components/charts";
import { Table, type Column } from "@/components/Table";
import { SessionsTable } from "@/components/SessionsTable";
import type { SessionsResponse, SummaryResponse } from "@/lib/dto";
import type { ProjectRecord } from "@/lib/types";
import { flattenDaily, fmtDayLabel } from "@/lib/chartData";
import { fmtCompact, fmtDate, fmtNum, fmtUSD } from "@/lib/format";
import { modelColor, modelLabel } from "@/lib/models";

const tok = (u: ProjectRecord["usage"]) => u.input + u.output + u.cacheCreate + u.cacheRead;

export default function ProjectsPage() {
  const { filters, setFilters } = useDashboard();
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");
  const sessionsRes = useDashboardData<SessionsResponse>("/api/sessions");

  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <Skeleton className="h-96" />;

  const { projects, summary, daily, models } = data;
  const active = filters.project;

  // ── deep view for a single selected project ────────────────────────────────
  if (active) {
    const rows = flattenDaily(daily);
    const proj = projects[0];
    return (
      <div className="space-y-5">
        <PageHeader
          title={proj?.projectName ?? "Project"}
          description={proj?.projectPath}
          right={
            <button
              type="button"
              onClick={() => setFilters({ project: undefined })}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-muted hover:border-accent/50 hover:text-fg"
            >
              <X className="h-3 w-3" /> all projects
            </button>
          }
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Kpi label="Total tokens" value={fmtCompact(summary.totalTokens)} />
          <Kpi label="Est. cost" value={fmtUSD(summary.cost)} accent />
          <Kpi label="Sessions" value={fmtNum(summary.sessionCount)} />
          <Kpi label="Messages" value={fmtNum(summary.messageCount)} />
          <Kpi label="Tool calls" value={fmtNum(summary.toolCallCount)} />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <PanelTitle title="Token usage over time" />
            <StackedAreaChart data={rows} xKey="date" series={TOKEN_SERIES} xFormat={fmtDayLabel} />
          </Card>
          <Card className="p-5">
            <PanelTitle title="Models used" />
            <DonutChart
              data={models.map((m) => ({
                name: modelLabel(m.model),
                value: tok(m.usage),
                color: modelColor(m.model),
              }))}
              centerLabel="tokens"
              centerValue={fmtCompact(summary.totalTokens)}
              height={200}
            />
          </Card>
        </div>
        <Card className="p-5">
          <PanelTitle title="Sessions" hint="Click a row to drill into the session" />
          {sessionsRes.data ? (
            <SessionsTable sessions={sessionsRes.data.sessions} showProject={false} />
          ) : (
            <Skeleton className="h-40" />
          )}
        </Card>
      </div>
    );
  }

  // ── ranked list of all projects ────────────────────────────────────────────
  const columns: Column<ProjectRecord>[] = [
    { key: "name", header: "Project", render: (p) => <span className="font-medium text-fg">{p.projectName}</span> },
    { key: "sessions", header: "Sessions", align: "right", render: (p) => fmtNum(p.sessionCount) },
    { key: "messages", header: "Messages", align: "right", render: (p) => fmtNum(p.messageCount) },
    { key: "tools", header: "Tools", align: "right", render: (p) => fmtNum(p.toolCallCount) },
    { key: "tokens", header: "Tokens", align: "right", render: (p) => fmtCompact(tok(p.usage)) },
    { key: "cost", header: "Est. cost", align: "right", render: (p) => <span className="text-accent">{fmtUSD(p.cost)}</span> },
    { key: "last", header: "Last active", align: "right", render: (p) => fmtDate(p.lastTs) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Projects" description={`${projects.length} projects · click any to focus the whole dashboard`} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <PanelTitle title="All projects" />
          <Table columns={columns} rows={projects} rowKey={(p) => p.projectPath} onRowClick={(p) => setFilters({ project: p.projectPath })} />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Token share" />
          <BarList
            items={projects.slice(0, 12).map((p) => ({
              label: p.projectName,
              value: tok(p.usage),
              sub: fmtUSD(p.cost),
              onClick: () => setFilters({ project: p.projectPath }),
            }))}
          />
        </Card>
      </div>
    </div>
  );
}
