"use client";

import { useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, PageSkeleton, PanelTitle, Stat } from "@/components/ui";
import { SessionsTable } from "@/components/SessionsTable";
import type { SessionsResponse } from "@/lib/dto";
import { totalTokens } from "@/lib/usage";
import { fmtCompact, fmtNum, fmtUSD } from "@/lib/format";

export default function SessionsPage() {
  const { data, error } = useDashboardData<SessionsResponse>("/api/sessions");
  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <PageSkeleton kpis={4} />;

  const sessions = data.sessions;
  const totalMsgs = sessions.reduce((a, s) => a + s.messageCount, 0);
  const avgMsgs = sessions.length ? totalMsgs / sessions.length : 0;
  const longest = sessions.reduce<(typeof sessions)[number] | null>(
    (a, s) => (a == null || s.messageCount > a.messageCount ? s : a),
    null,
  );
  const priciest = sessions.reduce<(typeof sessions)[number] | null>(
    (a, s) => (a == null || s.cost > a.cost ? s : a),
    null,
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Sessions" description={`${sessions.length} sessions · click a row to drill into one`} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Sessions" value={fmtNum(sessions.length)} />
        <Stat label="Avg msgs / session" value={fmtNum(avgMsgs)} />
        <Stat
          label="Longest session"
          value={longest ? `${fmtNum(longest.messageCount)} msgs` : "—"}
          sub={longest ? longest.projectName : undefined}
        />
        <Stat
          label="Priciest session"
          value={priciest ? fmtUSD(priciest.cost) : "—"}
          sub={priciest ? `${fmtCompact(totalTokens(priciest.usage))} tokens` : undefined}
        />
      </div>

      <Card className="p-4">
        <PanelTitle title="All sessions" />
        <SessionsTable sessions={sessions} />
      </Card>
    </div>
  );
}
