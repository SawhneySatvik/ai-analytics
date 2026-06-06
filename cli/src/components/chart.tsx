import { Box, Text } from "ink";

import { fmtCompact } from "@core/format";
import { fmtDayLabel } from "@core/chartData";
import { palette, colorOf, MONO } from "../theme.js";

interface Series {
  key: string;
  name: string;
  color: string;
}

const SHADES = ["█", "▓", "▒", "░"];
const Y_GUTTER = 7;

/**
 * Stacked-area-by-model chart for the terminal. Days are bucketed into wide
 * columns (so the chart fills the width and reads smoothly), heights use a
 * sqrt scale so a single big day doesn't flatten the rest (token volume is
 * very skewed), and each band gets a color + a distinct shade char (legible
 * without color).
 */
export function TokenStackChart({
  data,
  series,
  width,
  height,
}: {
  data: Record<string, unknown>[];
  series: Series[];
  width: number;
  height: number;
}) {
  const H = Math.max(4, height);
  const avail = Math.max(10, width - Y_GUTTER - 1);
  const n = data.length;

  const totals = series
    .map((s) => ({ s, total: data.reduce((a, r) => a + (Number(r[s.key]) || 0), 0) }))
    .sort((a, b) => b.total - a.total);
  const top = totals.slice(0, 3).map((t) => t.s);
  const restKeys = totals.slice(3).map((t) => t.s.key);
  const bands = top.map((s, i) => ({ key: s.key, name: s.name, color: colorOf(s.color), shade: SHADES[i] }));
  if (restKeys.length) bands.push({ key: "__other", name: "Other", color: palette.muted, shade: SHADES[Math.min(3, top.length)] });

  // Bucket days into wide columns (≥2 cols each) so the chart fills the width.
  const B = Math.max(1, Math.min(n, Math.floor(avail / 2)));
  const cellW = Math.max(1, Math.floor(avail / Math.max(1, B)));
  const buckets: number[][] = Array.from({ length: B }, (_, b) => {
    const start = Math.floor((b * n) / B);
    const end = Math.max(start + 1, Math.floor(((b + 1) * n) / B));
    const vals = bands.map(() => 0);
    for (let j = start; j < end && j < n; j++) {
      const r = data[j];
      bands.forEach((bd, bi) => {
        vals[bi] +=
          bd.key === "__other"
            ? restKeys.reduce((a, k) => a + (Number(r[k]) || 0), 0)
            : Number(r[bd.key]) || 0;
      });
    }
    return vals;
  });
  const bucketTotals = buckets.map((v) => v.reduce((a, x) => a + x, 0));
  const gmax = Math.max(1, ...bucketTotals);

  if (!n || Math.max(...bucketTotals) <= 0) {
    return (
      <Box height={H} alignItems="center" justifyContent="center">
        <Text color={palette.dim}>no data in range</Text>
      </Box>
    );
  }

  const bandAt = (cv: number[], total: number, rowFromBottom: number): number => {
    if (total <= 0) return -1;
    const filled = Math.max(1, Math.min(H, Math.round(Math.sqrt(total / gmax) * H)));
    if (rowFromBottom >= filled) return -1;
    let acc = 0;
    for (let bi = 0; bi < cv.length; bi++) {
      const h = Math.round((cv[bi] / total) * filled);
      if (rowFromBottom < acc + h) return bi;
      acc += h;
    }
    return cv.length - 1;
  };

  const lines = [];
  for (let r = H - 1; r >= 0; r--) {
    // sqrt scale: value at height h is (h/H)^2 · gmax, so the mid row is gmax/4
    const label = r === H - 1 ? fmtCompact(gmax) : r === Math.floor(H / 2) ? fmtCompact(gmax / 4) : r === 0 ? "0" : "";
    const spans: { text: string; color?: string }[] = [];
    for (let b = 0; b < B; b++) {
      const bi = bandAt(buckets[b], bucketTotals[b], r);
      const ch = (bi < 0 ? " " : MONO ? bands[bi].shade : "█").repeat(cellW);
      const color = bi < 0 ? undefined : bands[bi].color;
      const last = spans[spans.length - 1];
      if (last && last.color === color) last.text += ch;
      else spans.push({ text: ch, color });
    }
    lines.push({ label, spans });
  }

  const renderW = B * cellW;
  return (
    <Box flexDirection="column">
      {lines.map((ln, i) => (
        <Box key={i}>
          <Box width={Y_GUTTER} marginRight={1} justifyContent="flex-end">
            <Text color={palette.muted} wrap="truncate">
              {ln.label}
            </Text>
          </Box>
          {ln.spans.map((sp, j) => (
            <Text key={j} color={sp.color}>
              {sp.text}
            </Text>
          ))}
        </Box>
      ))}
      <Box>
        <Box width={Y_GUTTER + 1} />
        <Text color={palette.dim}>{"─".repeat(renderW)}</Text>
      </Box>
      <Box>
        <Box width={Y_GUTTER + 1} />
        <Box width={renderW} justifyContent="space-between">
          <Text color={palette.muted}>{fmtDayLabel(String(data[0].date))}</Text>
          <Text color={palette.muted}>{fmtDayLabel(String(data[Math.floor(n / 2)].date))}</Text>
          <Text color={palette.muted}>{fmtDayLabel(String(data[n - 1].date))}</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Box width={Y_GUTTER + 1} />
        {bands.map((b) => (
          <Box key={b.key} marginRight={2}>
            <Text color={b.color}>{(MONO ? b.shade : "█") + " "}</Text>
            <Text color={palette.muted}>{b.name}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
