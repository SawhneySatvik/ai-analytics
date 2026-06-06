import { Box } from "ink";

import type { ScreenProps } from "../data.js";
import { tok } from "../data.js";
import { dailyModelSeries } from "@core/chartData";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@core/format";
import { Kpi, SectionTitle } from "../components/ui.js";
import { BarRow } from "../components/viz.js";
import { TokenStackChart } from "../components/chart.js";

export function Overview({ d, width, height }: ScreenProps) {
  const s = d.summary;
  const { data, series } = dailyModelSeries(d.daily, d.models);
  const projects = [...d.projects].sort((a, b) => tok(b.usage) - tok(a.usage)).slice(0, 5);
  const tools = d.tools.tools.slice(0, 6);
  const maxP = projects.length ? tok(projects[0].usage) : 1;
  const maxT = tools.length ? tools[0].count : 1;

  const chartH = Math.max(6, height - 14);
  const colW = Math.max(26, Math.floor((width - 5) / 2));
  const barW = Math.max(8, colW - 30);

  return (
    <Box flexDirection="column">
      <Box flexWrap="wrap" marginBottom={1}>
        <Kpi label="Tokens" value={fmtCompact(s.totalTokens)} accent />
        <Kpi label="Est. cost" value={fmtUSD(s.cost)} />
        <Kpi label="Messages" value={fmtNum(s.messageCount)} />
        <Kpi label="Sessions" value={fmtNum(s.sessionCount)} />
        <Kpi label="Cache hit" value={fmtPct(s.cacheHitRate)} />
        <Kpi label="Active days" value={fmtNum(s.activeDays)} />
      </Box>

      <SectionTitle>Tokens over time · stacked by model</SectionTitle>
      <TokenStackChart data={data} series={series} width={width - 2} height={chartH} />

      <Box marginTop={1}>
        <Box flexDirection="column" width={colW} marginRight={2}>
          <SectionTitle>Top projects</SectionTitle>
          {projects.map((p) => (
            <BarRow key={p.projectPath} label={p.projectName} value={tok(p.usage)} max={maxP} barWidth={barW} valueText={fmtCompact(tok(p.usage))} />
          ))}
        </Box>
        <Box flexDirection="column" width={colW}>
          <SectionTitle>Top tools</SectionTitle>
          {tools.map((t) => (
            <BarRow key={t.name} label={t.name} value={t.count} max={maxT} barWidth={barW} valueText={fmtNum(t.count)} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
