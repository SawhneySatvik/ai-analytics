import { useEffect, useState } from "react";
import { Box, useInput } from "ink";

import type { ScreenProps } from "../data.js";
import { tok } from "../data.js";
import { fmtCompact, fmtDate, fmtNum, fmtUSD } from "@core/format";
import { palette } from "../theme.js";
import { SectionTitle, Table, windowStart, type Cell, type Col } from "../components/ui.js";
import { useMouse } from "../mouse.js";

const projCols: Col[] = [
  { label: "Project", width: 22 },
  { label: "Sess", width: 6, align: "right" },
  { label: "Msgs", width: 7, align: "right" },
  { label: "Tools", width: 7, align: "right" },
  { label: "Tokens", width: 8, align: "right" },
  { label: "Cost", width: 8, align: "right" },
  { label: "Last", width: 8, align: "right" },
];
const sessCols: Col[] = [
  { label: "When", width: 8 },
  { label: "Title", width: 32 },
  { label: "Msgs", width: 7, align: "right" },
  { label: "Tokens", width: 8, align: "right" },
  { label: "Cost", width: 8, align: "right" },
];

export function Projects({ d, height, contentTop }: ScreenProps) {
  const projects = [...d.projects].sort((a, b) => tok(b.usage) - tok(a.usage));
  const [sel, setSel] = useState(0);
  const [drill, setDrill] = useState<string | null>(null);
  const { onClick, onWheel } = useMouse();
  const total = projects.length;
  const maxRows = Math.max(5, height - 4);
  const rowTop = contentTop + 3; // SectionTitle (1) + its margin (1) + header (1)

  useInput((input, key) => {
    if (drill) {
      if (key.escape || key.backspace || key.delete) setDrill(null);
      return;
    }
    if (key.upArrow || input === "k") setSel((s) => Math.max(0, s - 1));
    else if (key.downArrow || input === "j") setSel((s) => Math.min(projects.length - 1, s + 1));
    else if (key.return && projects[sel]) setDrill(projects[sel].projectPath);
  });

  useEffect(() => {
    const offClick = onClick((cx, cy) => {
      if (drill) return;
      const visible = Math.min(maxRows, total);
      if (cy < rowTop || cy >= rowTop + visible) return;
      const idx = windowStart(total, sel, maxRows) + (cy - rowTop);
      if (idx < 0 || idx >= total) return;
      if (idx === sel) setDrill(projects[idx].projectPath);
      else setSel(idx);
    });
    const offWheel = onWheel((dir) => {
      if (drill) return;
      setSel((s) => Math.max(0, Math.min(total - 1, s + (dir === "down" ? 1 : -1))));
    });
    return () => {
      offClick();
      offWheel();
    };
  }, [onClick, onWheel, sel, drill, total, maxRows, rowTop, projects]);

  if (drill) {
    const proj = projects.find((p) => p.projectPath === drill);
    const sess = d.sessions.filter((s) => s.projectPath === drill).sort((a, b) => b.lastTs - a.lastTs);
    const cells: Cell[][] = sess.map((s) => [
      { text: fmtDate(s.lastTs) },
      { text: s.title || s.projectName, color: palette.fg },
      { text: fmtNum(s.messageCount) },
      { text: fmtCompact(tok(s.usage)) },
      { text: fmtUSD(s.cost), color: palette.accent },
    ]);
    return (
      <Box flexDirection="column">
        <SectionTitle>{`${proj?.projectName ?? "Project"} · ${sess.length} sessions   (esc to go back)`}</SectionTitle>
        <Table columns={sessCols} rows={cells} maxRows={Math.max(5, height - 4)} />
      </Box>
    );
  }

  const cells: Cell[][] = projects.map((p) => [
    { text: p.projectName, bold: true },
    { text: fmtNum(p.sessionCount) },
    { text: fmtNum(p.messageCount) },
    { text: fmtNum(p.toolCallCount) },
    { text: fmtCompact(tok(p.usage)) },
    { text: fmtUSD(p.cost), color: palette.accent },
    { text: fmtDate(p.lastTs) },
  ]);
  return (
    <Box flexDirection="column">
      <SectionTitle>{`Projects · ${projects.length} · ↑↓ select, ⏎ open`}</SectionTitle>
      <Table columns={projCols} rows={cells} selected={sel} maxRows={Math.max(5, height - 4)} />
    </Box>
  );
}
