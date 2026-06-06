// Browser port of the agentmon TUI's pure glyph/color math, so the marketing
// page can render a *faithful* terminal preview (same half-block chart, eighth
// bars, shade heatmap, muted palette). The CLI source (cli/src) isn't part of
// the web build, so the small amount of geometry is mirrored here, kept pure.

export const TERM = {
  bg: "#0c0f15",
  bgCell: "#1b2230",
  fg: "#eef0f3",
  muted: "#8b909c",
  dim: "#3a3f4b",
  accent: "#609bfb",
  success: "#2dc98c",
} as const;

// ── color helpers (mirrors cli/src/theme.ts) ─────────────────────────────────

function hue(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Muted variant of a lib HSL color — keeps hue, calms saturation/lightness. */
export function mutedColorOf(hslString: string | undefined): string {
  if (!hslString) return TERM.muted;
  const m = hslString.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/i);
  if (!m) return hslString.startsWith("#") ? hslString : TERM.muted;
  const h = Number(m[1]);
  const s = Math.min(Number(m[2]) * 0.55, 45);
  const l = Math.max(56, Math.min(68, Number(m[3])));
  return hslToHex(h, s, l);
}

export function lerpHex(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((x, i) => Math.round(x + (pb[i] - x) * t));
  return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

// ── span model ───────────────────────────────────────────────────────────────

export interface Span {
  ch: string;
  color?: string;
  bg?: string;
}
export interface ChartLine {
  label: string;
  spans: Span[];
}
export interface ChartRender {
  lines: ChartLine[];
  width: number;
  xLabels: [string, string, string];
  legend: { name: string; color: string }[];
}

interface Series {
  key: string;
  name: string;
  color: string;
}

const Y_GUTTER = 6;

/**
 * Half-block area/line chart (each cell = two stacked sub-pixels via ▀/▄, so 2×
 * vertical resolution). Mirrors cli/src/components/chart.tsx. sqrt y-scale.
 */
export function renderChart(opts: {
  data: Record<string, unknown>[];
  series: Series[];
  style: "area" | "line";
  width: number;
  height: number;
  valueFmt: (n: number) => string;
}): ChartRender {
  const { data, series, style, valueFmt } = opts;
  const H = Math.max(3, opts.height);
  const W = Math.max(8, opts.width - Y_GUTTER - 1);
  const pxH = H * 2;
  const n = data.length;

  const bands = series
    .map((s) => ({ s, total: data.reduce((a, r) => a + (Number(r[s.key]) || 0), 0) }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((t) => ({ name: t.s.name, color: mutedColorOf(t.s.color), key: t.s.key }));

  if (!n || !bands.length) {
    return {
      lines: [{ label: "", spans: [{ ch: "no data".padStart(W), color: TERM.dim }] }],
      width: W,
      xLabels: ["", "", ""],
      legend: [],
    };
  }

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

  let gmax = 1;
  if (style === "line") {
    for (let bi = 0; bi < bands.length; bi++) for (const v of dayVals[bi]) gmax = Math.max(gmax, v);
  } else {
    for (let i = 0; i < n; i++) gmax = Math.max(gmax, dayVals.reduce((a, arr) => a + arr[i], 0));
  }
  const scale = (v: number) => Math.sqrt(Math.max(0, v) / gmax);

  const grid: (string | undefined)[] = new Array(W * pxH).fill(undefined);
  const setPx = (x: number, py: number, color: string) => {
    if (x < 0 || x >= W || py < 0 || py >= pxH) return;
    grid[(pxH - 1 - py) * W + x] = color;
  };

  if (style === "line") {
    for (let bi = 0; bi < bands.length; bi++) {
      for (let x = 0; x < W; x++) {
        const py = Math.round(scale(valAt(bi, x)) * (pxH - 1));
        setPx(x, py, bands[bi].color);
        setPx(x, py - 1, bands[bi].color);
      }
    }
  } else {
    for (let x = 0; x < W; x++) {
      let acc = 0;
      const total = dayVals.reduce((a, arr, bi) => a + valAt(bi, x), 0);
      const topPx = Math.round(scale(total) * (pxH - 1));
      for (let bi = 0; bi < bands.length; bi++) {
        const v = valAt(bi, x);
        const from = total > 0 ? Math.round((acc / total) * topPx) : 0;
        acc += v;
        const to = total > 0 ? Math.round((acc / total) * topPx) : 0;
        for (let py = from; py < to; py++) {
          const depth = topPx > 0 ? py / topPx : 0;
          setPx(x, py, lerpHex(TERM.bg, bands[bi].color, 0.35 + 0.65 * depth));
        }
      }
    }
  }

  const lines: ChartLine[] = [];
  for (let cy = 0; cy < H; cy++) {
    const label = cy === 0 ? valueFmt(gmax) : cy === H - 1 ? "0" : "";
    const spans: Span[] = [];
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

  const dayLabel = (s: unknown) => {
    const [, m, d] = String(s).split("-").map(Number);
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return m && d ? `${MON[m - 1]} ${d}` : String(s);
  };

  return {
    lines,
    width: W,
    xLabels: [dayLabel(data[0].date), dayLabel(data[Math.floor(n / 2)].date), dayLabel(data[n - 1].date)],
    legend: bands.map((b) => ({ name: b.name, color: b.color })),
  };
}

// ── sparkline (▁▂▃▄▅▆▇█) ─────────────────────────────────────────────────────

const TICKS = "▁▂▃▄▅▆▇█";

export function renderSparkline(data: number[], width = 40): string {
  if (!data.length) return "─".repeat(width);
  let pts = data;
  if (data.length > width) {
    pts = [];
    const bucket = data.length / width;
    for (let i = 0; i < width; i++) {
      const start = Math.floor(i * bucket);
      const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
      let sum = 0, cnt = 0;
      for (let j = start; j < end && j < data.length; j++) (sum += data[j]), cnt++;
      pts.push(cnt ? sum / cnt : 0);
    }
  }
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  return pts.map((v) => TICKS[Math.min(7, Math.max(0, Math.round(((v - min) / range) * 7)))]).join("");
}

// ── eighth-block bar ─────────────────────────────────────────────────────────

const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];

export function renderBar(value: number, max: number, barWidth = 18): { fill: string; rest: string } {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const exact = pct * barWidth;
  const full = Math.floor(exact);
  const partial = EIGHTHS[Math.round((exact - full) * 8)] ?? "";
  const rest = Math.max(0, barWidth - full - (partial ? 1 : 0));
  return { fill: "█".repeat(full) + partial, rest: "·".repeat(rest) };
}

// ── hour × weekday heatmap (shade glyphs) ────────────────────────────────────

const SHADE = [" ", "░", "▒", "▓", "█"];

export interface HeatRow {
  wd: string;
  cells: Span[];
}

export function renderHeatmap(
  cells: { weekday: number; hour: number; messages: number; tokens: number }[],
  metric: "messages" | "tokens" = "tokens",
): HeatRow[] {
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const grid = new Map<string, number>();
  let max = 0;
  for (const c of cells) {
    const v = metric === "tokens" ? c.tokens : c.messages;
    grid.set(`${c.weekday}:${c.hour}`, v);
    if (v > max) max = v;
  }
  return WEEKDAYS.map((wd, w) => ({
    wd,
    cells: Array.from({ length: 24 }).map((_, h) => {
      const v = grid.get(`${w}:${h}`) ?? 0;
      const t = max > 0 ? v / max : 0;
      const bucket = v <= 0 ? 0 : Math.min(4, 1 + Math.floor(t * 3.999));
      const color = v > 0 ? lerpHex(TERM.bgCell, TERM.accent, 0.25 + 0.75 * t) : TERM.bgCell;
      return { ch: SHADE[bucket].repeat(2), color };
    }),
  }));
}
