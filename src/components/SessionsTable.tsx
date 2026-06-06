"use client";

import { useRouter } from "next/navigation";

import { Table, type Column } from "./Table";
import { Badge } from "./ui";
import type { SessionRecord } from "@/lib/types";
import { totalTokens } from "@/lib/usage";
import { fmtCompact, fmtDateTime, fmtDuration, fmtNum, fmtUSD } from "@/lib/format";
import { sourceLabel } from "@/lib/models";

export function SessionsTable({
  sessions,
  showProject = true,
}: {
  sessions: SessionRecord[];
  showProject?: boolean;
}) {
  const router = useRouter();

  const columns: Column<SessionRecord>[] = [
    {
      key: "started",
      header: "Started",
      render: (s) => (
        <div className="flex items-center gap-2">
          <span className="text-fg">{fmtDateTime(s.firstTs)}</span>
          {s.isResumed && <Badge tone="muted">resumed</Badge>}
        </div>
      ),
    },
    ...(showProject
      ? [
          {
            key: "project",
            header: "Project",
            render: (s: SessionRecord) => <span className="text-fg-muted">{s.projectName}</span>,
          } as Column<SessionRecord>,
        ]
      : []),
    {
      key: "title",
      header: "Title",
      render: (s) => (
        <span className="block max-w-[280px] truncate text-fg-muted" title={s.title ?? ""}>
          {s.title || "—"}
        </span>
      ),
    },
    {
      key: "tool",
      header: "Tool",
      render: (s) => <Badge tone="muted">{sourceLabel(s.source)}</Badge>,
    },
    {
      key: "models",
      header: "Models",
      render: (s) => (
        <span className="flex items-center gap-1">
          {s.models.map((m) => (
            <span
              key={m.key}
              title={m.label}
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: m.color }}
            />
          ))}
        </span>
      ),
    },
    { key: "dur", header: "Duration", align: "right", render: (s) => fmtDuration(s.durationMs) },
    { key: "msgs", header: "Msgs", align: "right", render: (s) => fmtNum(s.messageCount) },
    {
      key: "sub",
      header: "Sub",
      align: "right",
      render: (s) => (s.subagentMessageCount ? fmtNum(s.subagentMessageCount) : "—"),
    },
    { key: "tools", header: "Tools", align: "right", render: (s) => fmtNum(s.toolCallCount) },
    { key: "tokens", header: "Tokens", align: "right", render: (s) => fmtCompact(totalTokens(s.usage)) },
    {
      key: "cost",
      header: "Est. cost",
      align: "right",
      render: (s) => <span className="text-accent">{fmtUSD(s.cost)}</span>,
    },
  ];

  return (
    <Table
      columns={columns}
      rows={sessions}
      rowKey={(s) => s.sessionId}
      onRowClick={(s) => router.push(`/sessions?id=${encodeURIComponent(s.sessionId)}`)}
      empty="No sessions in range"
    />
  );
}
