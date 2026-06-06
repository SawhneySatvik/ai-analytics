import { Box, Text } from "ink";

import type { ScreenProps } from "../data.js";
import { fmtCompact, fmtNum, fmtUSD } from "@core/format";
import { palette } from "../theme.js";
import { Kpi, SectionTitle } from "../components/ui.js";
import { BarRow } from "../components/viz.js";

export function Tools({ d, width, height }: ScreenProps) {
  const rowsAvail = Math.max(5, height - 6);
  const tools = d.tools.tools.slice(0, rowsAvail);
  const maxT = tools[0]?.count || 1;
  const subs = [...d.subagents].sort((a, b) => b.tokens - a.tokens).slice(0, rowsAvail);
  const maxS = subs[0]?.tokens || 1;
  const colW = Math.max(26, Math.floor((width - 5) / 2));
  const barW = Math.max(6, colW - 32);

  return (
    <Box flexDirection="column">
      <Box flexWrap="wrap" marginBottom={1}>
        <Kpi label="Tool calls" value={fmtNum(d.tools.totalToolCalls)} accent />
        <Kpi label="Distinct" value={fmtNum(d.tools.tools.length)} />
        <Kpi label="Web search" value={fmtNum(d.tools.webSearch)} />
        <Kpi label="Web fetch" value={fmtNum(d.tools.webFetch)} />
      </Box>
      <Box>
        <Box flexDirection="column" width={colW} marginRight={2}>
          <SectionTitle>Tool calls</SectionTitle>
          {tools.map((t) => (
            <BarRow key={t.name} label={t.name} value={t.count} max={maxT} barWidth={barW} valueText={fmtNum(t.count)} />
          ))}
        </Box>
        <Box flexDirection="column" width={colW}>
          <SectionTitle>Subagents</SectionTitle>
          {subs.length ? (
            subs.map((s) => (
              <BarRow
                key={s.agentType}
                label={s.agentType}
                value={s.tokens}
                max={maxS}
                barWidth={barW}
                valueText={`${fmtCompact(s.tokens)} ${fmtUSD(s.cost)}`}
                valueWidth={13}
              />
            ))
          ) : (
            <Text color={palette.dim}>no subagents in range</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
