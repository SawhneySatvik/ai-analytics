import { Box, Text } from "ink";

import { palette, lerpHex } from "../theme.js";

// ── sparkline ────────────────────────────────────────────────────────────────
const TICKS = "▁▂▃▄▅▆▇█";

function resample(data: number[], width: number): number[] {
  if (data.length <= width) return data;
  const out: number[] = [];
  const bucket = data.length / width;
  for (let i = 0; i < width; i++) {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let sum = 0;
    let n = 0;
    for (let j = start; j < end && j < data.length; j++) {
      sum += data[j];
      n++;
    }
    out.push(n ? sum / n : 0);
  }
  return out;
}

export function Sparkline({
  data,
  width = 40,
  color = palette.accent,
}: {
  data: number[];
  width?: number;
  color?: string;
}) {
  if (!data.length) return <Text color={palette.dim}>{"─".repeat(width)}</Text>;
  const pts = resample(data, width);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const s = pts
    .map((v) => TICKS[Math.min(7, Math.max(0, Math.round(((v - min) / range) * 7)))])
    .join("");
  return <Text color={color}>{s}</Text>;
}

// ── horizontal bar row (fractional via eighth-blocks) ────────────────────────
const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];

export function BarRow({
  label,
  value,
  max,
  barWidth = 22,
  labelWidth = 16,
  valueWidth = 10,
  color = palette.accent,
  valueText,
}: {
  label: string;
  value: number;
  max: number;
  barWidth?: number;
  labelWidth?: number;
  valueWidth?: number;
  color?: string;
  valueText?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const exact = pct * barWidth;
  const full = Math.floor(exact);
  const partial = EIGHTHS[Math.round((exact - full) * 8)] ?? "";
  const rest = Math.max(0, barWidth - full - (partial ? 1 : 0));
  return (
    <Box>
      <Box width={labelWidth} marginRight={1}>
        <Text wrap="truncate-end">{label}</Text>
      </Box>
      <Text color={color}>{"█".repeat(full) + partial}</Text>
      <Text color={palette.dim}>{"·".repeat(rest)}</Text>
      <Box width={valueWidth} marginLeft={1} justifyContent="flex-end">
        <Text color={palette.muted}>{valueText ?? String(value)}</Text>
      </Box>
    </Box>
  );
}

// ── hour × weekday heatmap ───────────────────────────────────────────────────
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHADE = [" ", "░", "▒", "▓", "█"];

export function Heatmap({
  cells,
  metric = "messages",
}: {
  cells: { weekday: number; hour: number; messages: number; tokens: number }[];
  metric?: "messages" | "tokens";
}) {
  const grid = new Map<string, number>();
  let max = 0;
  for (const c of cells) {
    const v = metric === "tokens" ? c.tokens : c.messages;
    grid.set(`${c.weekday}:${c.hour}`, v);
    if (v > max) max = v;
  }
  return (
    <Box flexDirection="column">
      <Box>
        <Box width={4} />
        {Array.from({ length: 24 }).map((_, h) => (
          <Text key={h} color={palette.dim}>
            {h % 6 === 0 ? String(h).padStart(2, " ") : "  "}
          </Text>
        ))}
      </Box>
      {WEEKDAYS.map((wd, w) => (
        <Box key={wd}>
          <Box width={4}>
            <Text color={palette.muted}>{wd}</Text>
          </Box>
          {Array.from({ length: 24 }).map((_, h) => {
            const v = grid.get(`${w}:${h}`) ?? 0;
            const t = max > 0 ? v / max : 0;
            const bucket = v <= 0 ? 0 : Math.min(4, 1 + Math.floor(t * 3.999));
            const col = v > 0 ? lerpHex(palette.bgCell, palette.accent, 0.25 + 0.75 * t) : palette.bgCell;
            return (
              <Text key={h} color={col}>
                {SHADE[bucket].repeat(2)}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
