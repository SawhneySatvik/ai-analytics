import { Box } from "ink";

import type { ScreenProps } from "../data.js";
import { tok } from "../data.js";
import { dailySourceSeries } from "@core/chartData";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@core/format";
import { palette, colorOf } from "../theme.js";
import { SectionTitle, Table, type Cell, type Col } from "../components/ui.js";
import { TokenLineChart } from "../components/chart.js";

const cols: Col[] = [
  { label: "Tool", width: 16 },
  { label: "Sess", width: 6, align: "right" },
  { label: "Msgs", width: 7, align: "right" },
  { label: "Cache rd", width: 8, align: "right" },
  { label: "Total", width: 8, align: "right" },
  { label: "Cost", width: 8, align: "right" },
  { label: "Share", width: 6, align: "right" },
];

export function Sources({ d, width, height }: ScreenProps) {
  const total = d.summary.totalTokens || 1;
  const rows = [...d.sources].sort((a, b) => tok(b.usage) - tok(a.usage));
  const cells: Cell[][] = rows.map((s) => [
    { text: s.label, color: colorOf(s.color), bold: true },
    { text: fmtNum(s.sessionCount) },
    { text: fmtNum(s.messageCount) },
    { text: fmtCompact(s.usage.cacheRead) },
    { text: fmtCompact(tok(s.usage)) },
    { text: fmtUSD(s.cost), color: palette.accent },
    { text: fmtPct(tok(s.usage) / total) },
  ]);
  const { data, series } = dailySourceSeries(d.daily, d.sources);
  const chartH = Math.max(6, Math.min(10, height - rows.length - 7));
  return (
    <Box flexDirection="column">
      <SectionTitle>CLIs · usage by tool</SectionTitle>
      <Table columns={cols} rows={cells} />
      <Box marginTop={1} flexDirection="column">
        <SectionTitle>Tokens over time · by tool</SectionTitle>
        <TokenLineChart data={data} series={series} width={width - 2} height={chartH} />
      </Box>
    </Box>
  );
}
