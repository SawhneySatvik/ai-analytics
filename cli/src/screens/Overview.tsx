import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";

import type { ScreenProps } from "../data.js";
import { tok } from "../data.js";
import { dailyModelSeries } from "@core/chartData";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@core/format";
import { palette } from "../theme.js";
import { Kpi, SectionTitle } from "../components/ui.js";
import { BarRow } from "../components/viz.js";
import { Chart, type ChartStyle } from "../components/chart.js";
import { useMouse } from "../mouse.js";

const METRICS = ["Tokens", "Messages", "Sessions"];
const STYLES: ChartStyle[] = ["area", "line", "bars"];
const STYLE_LABELS = ["Area", "Line", "Bars"];
const SEL_W = 13;

export function Overview({ d, width, height, contentTop, compact }: ScreenProps) {
  const s = d.summary;
  const [metricIdx, setMetricIdx] = useState(0);
  const [styleIdx, setStyleIdx] = useState(0);
  const { onClick } = useMouse();

  useInput((input) => {
    if (input === "g") setMetricIdx((i) => (i + 1) % METRICS.length);
    else if (input === "v") setStyleIdx((i) => (i + 1) % STYLES.length);
  });

  // KPIs in an explicit grid (no flexWrap) so the row count is deterministic —
  // that keeps the selector's click rows correct at any width (fixes "rotating").
  const kpis = [
    { label: "Tokens", value: fmtCompact(s.totalTokens), accent: true },
    { label: "Est. cost", value: fmtUSD(s.cost) },
    { label: "Messages", value: fmtNum(s.messageCount) },
    { label: "Sessions", value: fmtNum(s.sessionCount) },
    { label: "Cache hit", value: fmtPct(s.cacheHitRate) },
    { label: "Active days", value: fmtNum(s.activeDays) },
  ];
  const perRow = Math.max(2, Math.min(6, Math.floor((width - 2) / 16)));
  const kpiRows = Math.ceil(kpis.length / perRow);

  const metricBase = contentTop + kpiRows + 4; // KPI rows + kpi-margin + title + title-margin + METRIC header
  const styleBase = metricBase + 5; // 3 metric items + group-margin + STYLE header
  useEffect(
    () =>
      onClick((cx, cy) => {
        if (cx > SEL_W + 2) return;
        for (let i = 0; i < METRICS.length; i++) if (cy === metricBase + i) return void setMetricIdx(i);
        for (let i = 0; i < STYLES.length; i++) if (cy === styleBase + i) return void setStyleIdx(i);
      }),
    [onClick, metricBase, styleBase],
  );

  // Series + data for the chosen metric.
  let chartData: Record<string, unknown>[];
  let chartSeries: { key: string; name: string; color: string }[];
  if (metricIdx === 0) {
    const r = dailyModelSeries(d.daily, d.models);
    chartData = r.data;
    chartSeries = r.series;
  } else if (metricIdx === 1) {
    chartData = d.daily.map((x) => ({ date: x.date, messages: x.messageCount }));
    chartSeries = [{ key: "messages", name: "Messages", color: "hsl(217 95% 68%)" }];
  } else {
    chartData = d.daily.map((x) => ({ date: x.date, sessions: x.sessionCount }));
    chartSeries = [{ key: "sessions", name: "Sessions", color: "hsl(158 64% 48%)" }];
  }
  const valueFmt = metricIdx === 0 ? fmtCompact : fmtNum;

  const projects = [...d.projects].sort((a, b) => tok(b.usage) - tok(a.usage)).slice(0, 5);
  const tools = d.tools.tools.slice(0, 6);
  const maxP = projects.length ? tok(projects[0].usage) : 1;
  const maxT = tools.length ? tools[0].count : 1;
  const chartH = Math.max(6, Math.min(11, height - kpiRows - 8));
  const chartW = Math.max(24, width - SEL_W - 5);

  const colW = compact ? width - 2 : Math.max(26, Math.floor((width - 5) / 2));
  const barW = Math.max(8, colW - 30);

  const group = (title: string, items: string[], activeIdx: number) => (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={palette.dim}>{title}</Text>
      {items.map((it, i) => (
        <Text key={it} color={i === activeIdx ? palette.accent : palette.muted} bold={i === activeIdx}>
          {(i === activeIdx ? "› " : "  ") + it}
        </Text>
      ))}
    </Box>
  );

  const projectsBlock = (
    <Box flexDirection="column" width={colW} marginRight={compact ? 0 : 2}>
      <SectionTitle>Top projects</SectionTitle>
      {projects.map((p) => (
        <BarRow key={p.projectPath} label={p.projectName} value={tok(p.usage)} max={maxP} barWidth={barW} valueText={fmtCompact(tok(p.usage))} />
      ))}
    </Box>
  );
  const toolsBlock = (
    <Box flexDirection="column" width={colW}>
      <SectionTitle>Top tools</SectionTitle>
      {tools.map((t) => (
        <BarRow key={t.name} label={t.name} value={t.count} max={maxT} barWidth={barW} valueText={fmtNum(t.count)} />
      ))}
    </Box>
  );

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        {Array.from({ length: kpiRows }).map((_, r) => (
          <Box key={r}>
            {kpis.slice(r * perRow, r * perRow + perRow).map((k) => (
              <Kpi key={k.label} label={k.label} value={k.value} accent={k.accent} />
            ))}
          </Box>
        ))}
      </Box>

      <SectionTitle>{`${METRICS[metricIdx]} over time`}</SectionTitle>
      <Box>
        <Box flexDirection="column" width={SEL_W} marginRight={2}>
          {group("METRIC", METRICS, metricIdx)}
          {group("STYLE", STYLE_LABELS, styleIdx)}
          <Text color={palette.dim}>g·v cycle</Text>
        </Box>
        <Chart data={chartData} series={chartSeries} style={STYLES[styleIdx]} width={chartW} height={chartH} valueFmt={valueFmt} />
      </Box>

      <Box marginTop={1} flexDirection={compact ? "column" : "row"}>
        {projectsBlock}
        {compact ? <Box height={1} /> : null}
        {toolsBlock}
      </Box>
    </Box>
  );
}
