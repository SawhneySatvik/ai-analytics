import { Box } from "ink";

import type { ScreenProps } from "../data.js";
import { fmtCompact, fmtPct, fmtUSD } from "@core/format";
import { palette } from "../theme.js";
import { Kpi, SectionTitle } from "../components/ui.js";
import { BarRow } from "../components/viz.js";
import { TokenLineChart } from "../components/chart.js";

export function Cache({ d, width, height }: ScreenProps) {
  const s = d.summary;
  const data = d.daily.map((x) => ({ date: x.date, read: x.usage.cacheRead, write: x.usage.cacheCreate }));
  const series = [
    { key: "read", name: "Cache read", color: "hsl(158 64% 46%)" },
    { key: "write", name: "Cache write", color: "hsl(38 92% 56%)" },
  ];
  const chartH = Math.max(6, Math.min(10, height - 11));
  const uncached = s.uncachedCost || 1;
  const barW = Math.max(10, Math.min(40, width - 30));

  return (
    <Box flexDirection="column">
      <Box flexWrap="wrap" marginBottom={1}>
        <Kpi label="Cache hit" value={fmtPct(s.cacheHitRate)} accent />
        <Kpi label="Cache read" value={fmtCompact(s.usage.cacheRead)} />
        <Kpi label="Cache write" value={fmtCompact(s.usage.cacheCreate)} />
        <Kpi label="Saved" value={fmtUSD(s.cacheSavings)} accent />
      </Box>

      <SectionTitle>Cache read vs write · over time</SectionTitle>
      <TokenLineChart data={data} series={series} width={width - 2} height={chartH} />

      <Box marginTop={1} flexDirection="column">
        <SectionTitle>{`Cost · caching saved you ${fmtUSD(s.cacheSavings)}`}</SectionTitle>
        <BarRow label="Actual" value={s.cost} max={uncached} labelWidth={14} barWidth={barW} valueText={fmtUSD(s.cost)} color={palette.accent} />
        <BarRow label="Without cache" value={uncached} max={uncached} labelWidth={14} barWidth={barW} valueText={fmtUSD(s.uncachedCost)} color={palette.danger} />
      </Box>
    </Box>
  );
}
