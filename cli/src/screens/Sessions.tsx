import { useState } from "react";
import { Box, Text, useInput } from "ink";

import type { ScreenProps } from "../data.js";
import { tok, sessionDetail } from "../data.js";
import { fmtCompact, fmtDate, fmtDuration, fmtNum, fmtPct, fmtUSD } from "@core/format";
import { palette, colorOf } from "../theme.js";
import { Kpi, SectionTitle, Table, type Cell, type Col } from "../components/ui.js";
import { BarRow, Sparkline } from "../components/viz.js";

export function Sessions({ d, snap, width, height }: ScreenProps) {
  const sessions = [...d.sessions].sort((a, b) => b.lastTs - a.lastTs);
  const [sel, setSel] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  useInput((input, key) => {
    if (openId) {
      if (key.escape || key.backspace || key.delete) setOpenId(null);
      return;
    }
    if (key.upArrow || input === "k") setSel((s) => Math.max(0, s - 1));
    else if (key.downArrow || input === "j") setSel((s) => Math.min(sessions.length - 1, s + 1));
    else if (key.return && sessions[sel]) setOpenId(sessions[sel].sessionId);
  });

  if (openId) {
    const detail = sessionDetail(snap, openId);
    const sess = sessions.find((s) => s.sessionId === openId);
    if (!detail || !sess) return <Text color={palette.danger}>session not found</Text>;
    const spark = detail.timeline.map((t) => t.input + t.output + t.cacheCreate + t.cacheRead);
    const tools = detail.tools.tools.slice(0, 6);
    const toolMax = tools.length ? tools[0].count : 1;
    const models = [...detail.models].sort((a, b) => tok(b.usage) - tok(a.usage));
    const modelMax = models.length ? tok(models[0].usage) : 1;
    const colW = Math.max(24, Math.floor((width - 5) / 2));
    const barW = Math.max(8, colW - 22);
    return (
      <Box flexDirection="column">
        <SectionTitle>{`${sess.title || sess.projectName} · ${sess.projectName}   (esc to go back)`}</SectionTitle>
        <Box flexWrap="wrap" marginBottom={1}>
          <Kpi label="Tokens" value={fmtCompact(detail.summary.totalTokens)} accent />
          <Kpi label="Cost" value={fmtUSD(detail.summary.cost)} />
          <Kpi label="Messages" value={fmtNum(detail.summary.messageCount)} />
          <Kpi label="Tools" value={fmtNum(detail.summary.toolCallCount)} />
          <Kpi label="Cache hit" value={fmtPct(detail.summary.cacheHitRate)} />
          <Kpi label="Duration" value={fmtDuration(sess.durationMs)} />
        </Box>
        <Box marginBottom={1}>
          <Box width={16}>
            <Text color={palette.muted}>TOKENS / MSG</Text>
          </Box>
          <Sparkline data={spark} width={Math.min(64, Math.max(20, width - 18))} />
        </Box>
        <Box>
          <Box flexDirection="column" width={colW} marginRight={2}>
            <SectionTitle>Tools</SectionTitle>
            {tools.length ? (
              tools.map((t) => (
                <BarRow key={t.name} label={t.name} value={t.count} max={toolMax} barWidth={barW} valueText={fmtNum(t.count)} />
              ))
            ) : (
              <Text color={palette.dim}>no tool calls</Text>
            )}
          </Box>
          <Box flexDirection="column" width={colW}>
            <SectionTitle>Models</SectionTitle>
            {models.map((m) => (
              <BarRow
                key={m.key}
                label={m.label}
                value={tok(m.usage)}
                max={modelMax}
                color={colorOf(m.color)}
                barWidth={barW}
                valueText={fmtCompact(tok(m.usage))}
              />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  const cols: Col[] = [
    { label: "When", width: 8 },
    { label: "Project", width: 16 },
    { label: "Title", width: width > 92 ? 34 : 20 },
    { label: "Msgs", width: 7, align: "right" },
    { label: "Tokens", width: 8, align: "right" },
    { label: "Cost", width: 8, align: "right" },
  ];
  const cells: Cell[][] = sessions.map((s) => [
    { text: fmtDate(s.lastTs) },
    { text: s.projectName, bold: true },
    { text: s.title || "—", color: palette.muted },
    { text: fmtNum(s.messageCount) },
    { text: fmtCompact(tok(s.usage)) },
    { text: fmtUSD(s.cost), color: palette.accent },
  ]);
  return (
    <Box flexDirection="column">
      <SectionTitle>{`Sessions · ${sessions.length} · ↑↓ select, ⏎ open`}</SectionTitle>
      <Table columns={cols} rows={cells} selected={sel} maxRows={Math.max(5, height - 4)} />
    </Box>
  );
}
