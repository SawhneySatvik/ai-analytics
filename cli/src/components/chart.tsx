import { Box, Text } from "ink";

import { fmtCompact } from "@core/format";
import { fmtDayLabel } from "@core/chartData";
import { palette, mutedColorOf } from "../theme.js";

interface Series {
  key: string;
  name: string;
  color: string;
}

const Y_GUTTER = 6;
// Braille dot bit values by (col, row-in-cell). col 0 = left dots, col 1 = right.
const COL0 = [0x01, 0x02, 0x04, 0x40];
const COL1 = [0x08, 0x10, 0x20, 0x80];

/**
 * Line-per-series chart drawn with braille (2×4 sub-pixels per cell) for a
 * crisp, high-resolution "pixel" look. Heights use a sqrt scale (token volume
 * is very skewed) so small days stay visible. Colors are muted per series.
 */
export function TokenLineChart({
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
  const H = Math.max(3, height);
  const cellsW = Math.max(8, width - Y_GUTTER - 1);
  const n = data.length;

  // Top 3 series by total, one line each (drawn biggest-last so it stays on top).
  const totals = series
    .map((s) => ({ s, total: data.reduce((a, r) => a + (Number(r[s.key]) || 0), 0) }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);
  const bands = totals.slice(0, 3).map((t) => ({
    name: t.s.name,
    color: mutedColorOf(t.s.color),
    valueAt: (r: Record<string, unknown>) => Number(r[t.s.key]) || 0,
  }));

  let gmax = 1;
  for (const r of data) for (const b of bands) gmax = Math.max(gmax, b.valueAt(r));

  if (!n || gmax <= 1) {
    return (
      <Box height={H} alignItems="center" justifyContent="center">
        <Text color={palette.dim}>no data in range</Text>
      </Box>
    );
  }

  const pxW = cellsW * 2;
  const pxH = H * 4;
  const grid = new Uint8Array(cellsW * H);
  const colors: (string | undefined)[] = new Array(cellsW * H).fill(undefined);

  const setPx = (x: number, y: number, color: string) => {
    if (x < 0 || x >= pxW || y < 0 || y >= pxH) return;
    const cell = (y >> 2) * cellsW + (x >> 1);
    grid[cell] |= (x & 1) === 0 ? COL0[y & 3] : COL1[y & 3];
    colors[cell] = color;
  };
  const drawLine = (x0: number, y0: number, x1: number, y1: number, color: string) => {
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      setPx(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };

  const xAt = (i: number) => (n === 1 ? 0 : Math.round((i / (n - 1)) * (pxW - 1)));
  const yAt = (v: number) => pxH - 1 - Math.round(Math.sqrt(Math.max(0, v) / gmax) * (pxH - 1));

  // Draw smallest series first so the biggest line wins on overlapping cells.
  for (let bi = bands.length - 1; bi >= 0; bi--) {
    const b = bands[bi];
    let prev: [number, number] | null = null;
    for (let i = 0; i < n; i++) {
      const pt: [number, number] = [xAt(i), yAt(b.valueAt(data[i]))];
      if (prev) drawLine(prev[0], prev[1], pt[0], pt[1], b.color);
      else setPx(pt[0], pt[1], b.color);
      prev = pt;
    }
  }

  const lines = [];
  for (let cy = 0; cy < H; cy++) {
    const label = cy === 0 ? fmtCompact(gmax) : cy === H - 1 ? "0" : "";
    const spans: { text: string; color?: string }[] = [];
    for (let cx = 0; cx < cellsW; cx++) {
      const bits = grid[cy * cellsW + cx];
      const ch = bits ? String.fromCharCode(0x2800 + bits) : " ";
      const color = bits ? colors[cy * cellsW + cx] : undefined;
      const last = spans[spans.length - 1];
      if (last && last.color === color) last.text += ch;
      else spans.push({ text: ch, color });
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
            <Text key={j} color={sp.color}>
              {sp.text}
            </Text>
          ))}
        </Box>
      ))}
      <Box>
        <Box width={Y_GUTTER + 1} />
        <Text color={palette.dim}>{"─".repeat(cellsW)}</Text>
      </Box>
      <Box>
        <Box width={Y_GUTTER + 1} />
        <Box width={cellsW} justifyContent="space-between">
          <Text color={palette.muted}>{fmtDayLabel(String(data[0].date))}</Text>
          <Text color={palette.muted}>{fmtDayLabel(String(data[Math.floor(n / 2)].date))}</Text>
          <Text color={palette.muted}>{fmtDayLabel(String(data[n - 1].date))}</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Box width={Y_GUTTER + 1} />
        {bands.map((b) => (
          <Box key={b.name} marginRight={2}>
            <Text color={b.color}>─ </Text>
            <Text color={palette.muted}>{b.name}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
