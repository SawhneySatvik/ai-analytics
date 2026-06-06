import { Box } from "ink";

import type { ScreenProps } from "../data.js";
import { tok } from "../data.js";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@core/format";
import { palette, colorOf } from "../theme.js";
import { SectionTitle, Table, type Cell, type Col } from "../components/ui.js";

const columns: Col[] = [
  { label: "Model", width: 16 },
  { label: "Msgs", width: 7, align: "right" },
  { label: "Input", width: 7, align: "right" },
  { label: "Output", width: 7, align: "right" },
  { label: "Cache rd", width: 8, align: "right" },
  { label: "Total", width: 8, align: "right" },
  { label: "Cost", width: 8, align: "right" },
  { label: "Share", width: 6, align: "right" },
];

export function Models({ d, height }: ScreenProps) {
  const rows = [...d.models].sort((a, b) => tok(b.usage) - tok(a.usage));
  const total = d.summary.totalTokens || 1;
  const cells: Cell[][] = rows.map((m) => [
    { text: m.label, color: colorOf(m.color), bold: true },
    { text: fmtNum(m.messageCount) },
    { text: fmtCompact(m.usage.input) },
    { text: fmtCompact(m.usage.output) },
    { text: fmtCompact(m.usage.cacheRead) },
    { text: fmtCompact(tok(m.usage)) },
    { text: fmtUSD(m.cost), color: palette.accent },
    { text: fmtPct(tok(m.usage) / total) },
  ]);
  return (
    <Box flexDirection="column">
      <SectionTitle>Models · tokens, cost and adoption per model</SectionTitle>
      <Table columns={columns} rows={cells} maxRows={Math.max(5, height - 4)} />
    </Box>
  );
}
