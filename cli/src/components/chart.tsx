import { Box, Text } from "ink";

import { fmtCompact } from "@core/format";
import { fmtDayLabel } from "@core/chartData";
import { palette, mutedColorOf, lerpHex } from "../theme.js";

export type ChartStyle = "area" | "line" | "bars";

interface Series {
  key: string;
  name: string;
  color: string;
}

const Y_GUTTER = 6;
const DARK = "#0c0f15"; // gradient floor for filled areas

/**
 * Multi-style chart drawn on a half-block canvas (each text cell = two stacked
 * sub-pixels via "▀"/"▄", so 2× vertical resolution — the crisp "pixel" look).
 * Supports a filled gradient **area**, a thick **line**, and discrete **bars**;
 * single- or multi-series (stacked). sqrt y-scale (token data is skewed).
 */
export function Chart({
  data,
  series,
  style,
  width,
  height,
  valueFmt = fmtCompact,
}: {
  data: Record<string, unknown>[];
  series: Series[];
  style: ChartStyle;
  width: number;
  height: number;
  valueFmt?: (n: number) => string;
}) {
  const H = Math.max(3, height);
  const W = Math.max(8, width - Y_GUTTER - 1);
  const pxH = H * 2;
  const n = data.length;

  // Top 3 series by total (so multi-series stacks stay legible), muted colors.
  const bands = series
    .map((s) => ({ s, total: data.reduce((a, r) => a + (Number(r[s.key]) || 0), 0) }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((t) => ({ name: t.s.name, color: mutedColorOf(t.s.color), key: t.s.key }));

  if (!n || !bands.length) {
    return (
      <Box height={H} alignItems="center" justifyContent="center">
        <Text color={palette.dim}>no data in range</Text>
      </Box>
    );
  }

  // Per-series day arrays + an interpolator so curves are smooth across width.
  const dayVals = bands.map((b) => data.map((r) => Number(r[b.key]) || 0));
  const valAt = (bi: number, x: number): number => {
    if (n === 1) return dayVals[bi][0];
    const t = (x / (W - 1)) * (n - 1);
    const i = Math.floor(t);
    const f = t - i;
    const a = dayVals[bi][i];
    const c = dayVals[bi][Math.min(n - 1, i + 1)];
    return a + (c - a) * f;
  };

  // Scale: area/bars stack, so use the max column-total; line uses max single value.
  let gmax = 1;
  if (style === "line") {
    for (let bi = 0; bi < bands.length; bi++) for (const v of dayVals[bi]) gmax = Math.max(gmax, v);
  } else {
    for (let i = 0; i < n; i++) gmax = Math.max(gmax, dayVals.reduce((a, arr) => a + arr[i], 0));
  }
  const scale = (v: number) => Math.sqrt(Math.max(0, v) / gmax); // 0..1

  const grid: (string | undefined)[] = new Array(W * pxH).fill(undefined);
  const setPx = (x: number, py: number, color: string) => {
    if (x < 0 || x >= W || py < 0 || py >= pxH) return;
    grid[(pxH - 1 - py) * W + x] = color; // py measured from bottom
  };

  const isBarCol = (x: number, barW: number) => barW <= 1 || x % barW !== barW - 1; // gap at end of each bar

  if (style === "line") {
    for (let bi = 0; bi < bands.length; bi++) {
      for (let x = 0; x < W; x++) {
        const py = Math.round(scale(valAt(bi, x)) * (pxH - 1));
        setPx(x, py, bands[bi].color); // thick: line + one below
        setPx(x, py - 1, bands[bi].color);
      }
    }
  } else {
    // area / bars: stack bands from the bottom with a vertical gradient.
    const barW = style === "bars" ? Math.max(2, Math.round(W / Math.min(n, Math.max(6, Math.floor(W / 4))))) : 1;
    for (let x = 0; x < W; x++) {
      if (style === "bars" && !isBarCol(x, barW)) continue;
      let acc = 0;
      const total = dayVals.reduce((a, arr, bi) => a + valAt(bi, x), 0);
      const topPx = Math.round(scale(total) * (pxH - 1));
      for (let bi = 0; bi < bands.length; bi++) {
        const v = valAt(bi, x);
        const from = total > 0 ? Math.round((acc / total) * topPx) : 0;
        acc += v;
        const to = total > 0 ? Math.round((acc / total) * topPx) : 0;
        for (let py = from; py < to; py++) {
          const depth = topPx > 0 ? py / topPx : 0; // 0 bottom → 1 top
          setPx(x, py, lerpHex(DARK, bands[bi].color, 0.35 + 0.65 * depth));
        }
      }
    }
  }

  // Render rows via the half-block trick, merging consecutive same-style cells.
  const lines = [];
  for (let cy = 0; cy < H; cy++) {
    const label = cy === 0 ? valueFmt(gmax) : cy === H - 1 ? "0" : "";
    const spans: { ch: string; color?: string; bg?: string }[] = [];
    for (let cx = 0; cx < W; cx++) {
      const top = grid[cy * 2 * W + cx];
      const bot = grid[(cy * 2 + 1) * W + cx];
      let ch = " ";
      let color: string | undefined;
      let bg: string | undefined;
      if (top && bot) (ch = "▀"), (color = top), (bg = bot);
      else if (top) (ch = "▀"), (color = top);
      else if (bot) (ch = "▄"), (color = bot);
      const last = spans[spans.length - 1];
      if (last && last.color === color && last.bg === bg && last.ch[0] === ch) last.ch += ch;
      else spans.push({ ch, color, bg });
    }
    lines.push({ label, spans });
  }

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
            <Text key={j} color={sp.color} backgroundColor={sp.bg}>
              {sp.ch}
            </Text>
          ))}
        </Box>
      ))}
      <Box>
        <Box width={Y_GUTTER + 1} />
        <Text color={palette.dim}>{"─".repeat(W)}</Text>
      </Box>
      <Box>
        <Box width={Y_GUTTER + 1} />
        <Box width={W} justifyContent="space-between">
          <Text color={palette.muted}>{fmtDayLabel(String(data[0].date))}</Text>
          <Text color={palette.muted}>{fmtDayLabel(String(data[Math.floor(n / 2)].date))}</Text>
          <Text color={palette.muted}>{fmtDayLabel(String(data[n - 1].date))}</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Box width={Y_GUTTER + 1} />
        {bands.map((b) => (
          <Box key={b.key} marginRight={2}>
            <Text color={b.color}>{style === "bars" ? "▮ " : "─ "}</Text>
            <Text color={palette.muted}>{b.name}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
