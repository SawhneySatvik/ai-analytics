"use client";

import { useState } from "react";

import { useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, Kpi, PageSkeleton, PanelTitle } from "@/components/ui";
import { BarList, Heatmap, MultiLineChart, SimpleBarChart } from "@/components/charts";
import type { SummaryResponse } from "@/lib/dto";
import { flattenDaily, fmtDayLabel } from "@/lib/chartData";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ActivityPage() {
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");
  const [metric, setMetric] = useState<"messages" | "tokens">("messages");

  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <PageSkeleton kpis={4} />;

  const { heatmap, daily, commands, summary } = data;
  const rows = flattenDaily(daily);
  const hourData = heatmap.hourTotals.map((v, h) => ({ hour: `${h}`, messages: v }));
  const weekdayData = heatmap.weekdayTotals.map((v, w) => ({ day: WEEKDAYS[w], messages: v }));

  return (
    <div className="space-y-5">
      <PageHeader title="Activity" description={`When and how you work · ${data.meta.timezone}`} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Active days" value={fmtNum(summary.activeDays)} />
        <Kpi label="Messages" value={fmtNum(summary.messageCount)} />
        <Kpi label="Prompts" value={fmtNum(commands.totalPrompts)} sub="human messages (history)" />
        <Kpi label="Slash commands" value={fmtNum(commands.totalCommands)} />
      </div>

      <Card className="p-5">
        <PanelTitle
          title="Activity heatmap"
          hint="Hour of day × weekday"
          right={
            <div className="flex items-center rounded-lg border border-border bg-bg-elev p-0.5">
              {(["messages", "tokens"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs capitalize transition-colors",
                    metric === m ? "bg-accent/15 text-accent" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          }
        />
        <Heatmap cells={heatmap.cells} metric={metric} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <PanelTitle title="By hour of day" />
          <SimpleBarChart
            data={hourData}
            xKey="hour"
            bars={[{ key: "messages", name: "Messages", color: "hsl(217 91% 60%)" }]}
            valueFormat={fmtNum}
          />
        </Card>
        <Card className="p-5">
          <PanelTitle title="By weekday" />
          <SimpleBarChart
            data={weekdayData}
            xKey="day"
            bars={[{ key: "messages", name: "Messages", color: "hsl(158 64% 46%)" }]}
            valueFormat={fmtNum}
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <PanelTitle title="Messages & sessions per day" />
          <MultiLineChart
            data={rows}
            xKey="date"
            series={[
              { key: "messages", name: "Messages", color: "hsl(217 91% 60%)" },
              { key: "sessions", name: "Sessions", color: "hsl(38 92% 56%)" },
            ]}
            valueFormat={fmtNum}
            xFormat={fmtDayLabel}
          />
        </Card>
        <Card className="p-5">
          <PanelTitle title="Top commands" hint="From history.jsonl" />
          <BarList
            items={commands.topCommands.slice(0, 12).map((c) => ({ label: c.command, value: c.count }))}
            valueFormat={fmtNum}
            emptyText="No commands in range"
          />
        </Card>
      </div>
    </div>
  );
}
