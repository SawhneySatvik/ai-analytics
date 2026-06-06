import { useState } from "react";
import { Box, Text, useInput } from "ink";

import type { ScreenProps } from "../data.js";
import { fmtNum } from "@core/format";
import { palette } from "../theme.js";
import { BarRow } from "../components/viz.js";
import { Heatmap } from "../components/viz.js";
import { SectionTitle } from "../components/ui.js";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Activity({ d, width }: ScreenProps) {
  const [metric, setMetric] = useState<"messages" | "tokens">("messages");
  useInput((input) => {
    if (input === "m") setMetric((x) => (x === "messages" ? "tokens" : "messages"));
  });

  const hourMax = Math.max(1, ...d.heatmap.hourTotals);
  const wdMax = Math.max(1, ...d.heatmap.weekdayTotals);
  const colW = Math.max(24, Math.floor((width - 6) / 2));
  const barW = Math.max(8, colW - 22);

  // peak hour / day for context
  const peakHour = d.heatmap.hourTotals.indexOf(Math.max(...d.heatmap.hourTotals));
  const peakWd = d.heatmap.weekdayTotals.indexOf(Math.max(...d.heatmap.weekdayTotals));

  return (
    <Box flexDirection="column">
      <SectionTitle>Activity · hour × weekday (messages)</SectionTitle>
      <Heatmap cells={d.heatmap.cells} metric={metric} />
      <Box marginTop={1}>
        <Text color={palette.muted}>
          peak: {WD[peakWd] ?? "—"} · {peakHour >= 0 ? `${peakHour}:00` : "—"}    (press </Text>
        <Text color={palette.accent}>m</Text>
        <Text color={palette.muted}> for {metric === "messages" ? "tokens" : "messages"})</Text>
      </Box>

      <Box marginTop={1}>
        <Box flexDirection="column" width={colW} marginRight={2}>
          <SectionTitle>By hour</SectionTitle>
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <BarRow
              key={h}
              label={`${String(h).padStart(2, "0")}:00`}
              value={d.heatmap.hourTotals[h] ?? 0}
              max={hourMax}
              labelWidth={6}
              barWidth={barW}
              valueText={fmtNum(d.heatmap.hourTotals[h] ?? 0)}
            />
          ))}
        </Box>
        <Box flexDirection="column" width={colW}>
          <SectionTitle>By weekday</SectionTitle>
          {WD.map((wd, i) => (
            <BarRow
              key={wd}
              label={wd}
              value={d.heatmap.weekdayTotals[i] ?? 0}
              max={wdMax}
              labelWidth={6}
              barWidth={barW}
              valueText={fmtNum(d.heatmap.weekdayTotals[i] ?? 0)}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
