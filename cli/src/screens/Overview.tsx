import { Box, Text } from "ink";

import type { ScreenProps } from "../data.js";
import { tok } from "../data.js";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@core/format";
import { palette, colorOf } from "../theme.js";
import { Kpi, SectionTitle } from "../components/ui.js";
import { BarRow, Sparkline } from "../components/viz.js";

export function Overview({ d, width }: ScreenProps) {
  const s = d.summary;
  const spark = d.daily.map((x) => tok(x.usage));
  const models = [...d.models].sort((a, b) => tok(b.usage) - tok(a.usage)).slice(0, 5);
  const projects = [...d.projects].sort((a, b) => tok(b.usage) - tok(a.usage)).slice(0, 5);
  const tools = d.tools.tools.slice(0, 6);

  const maxM = models.length ? tok(models[0].usage) : 1;
  const maxP = projects.length ? tok(projects[0].usage) : 1;
  const sparkW = Math.min(64, Math.max(20, width - 18));
  const colW = Math.max(28, Math.floor((width - 5) / 2));
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

      <Box marginBottom={1}>
        <Box width={16}>
          <Text color={palette.muted}>TOKENS / DAY</Text>
        </Box>
        <Sparkline data={spark} width={sparkW} />
      </Box>

      <Box>
        <Box flexDirection="column" width={colW} marginRight={2}>
          <SectionTitle>Top models</SectionTitle>
          {models.map((m) => (
            <BarRow
              key={m.key}
              label={m.label}
              value={tok(m.usage)}
              max={maxM}
              color={colorOf(m.color)}
              barWidth={barW}
              valueText={fmtCompact(tok(m.usage))}
            />
          ))}
        </Box>
        <Box flexDirection="column" width={colW}>
          <SectionTitle>Top projects</SectionTitle>
          {projects.map((p) => (
            <BarRow
              key={p.projectPath}
              label={p.projectName}
              value={tok(p.usage)}
              max={maxP}
              barWidth={barW}
              valueText={fmtCompact(tok(p.usage))}
            />
          ))}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <SectionTitle>Top tools</SectionTitle>
        <Box flexWrap="wrap">
          {tools.map((t) => (
            <Box key={t.name} marginRight={3}>
              <Text color={palette.fg}>{t.name} </Text>
              <Text color={palette.muted}>{fmtNum(t.count)}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
