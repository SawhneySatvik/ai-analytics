// Pure SVG renderer for share cards — no DOM, no deps. Produces a self-contained
// SVG string the CLI rasterizes to PNG (via @resvg/resvg-wasm). The web keeps its
// richer React cards; both read the same ShareStats + persona/badges so they stay
// consistent. Colors are passed in concrete (no CSS vars) so it's environment-free.

import type { ShareStats, ShareRatio, ShareTemplate } from "./share";
import { derivePersona, nextMilestone } from "./badges";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "./format";

export interface CardColors {
  bg: string;
  fg: string;
  fgMuted: string;
  accent: string;
  border: string;
}

export interface CardOpts {
  template: ShareTemplate;
  ratio?: ShareRatio;
  colors: CardColors;
  handle?: string;
}

const DIMS: Record<ShareRatio, { w: number; h: number }> = {
  landscape: { w: 1200, h: 630 },
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";
const MONO = "Menlo, 'DejaVu Sans Mono', Consolas, monospace";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const hourLabel = (h: number | null) => (h == null ? "—" : `${String(h).padStart(2, "0")}:00`);
const shortDay = (d: string | null) => (d ? d.slice(0, 3) : "—");

interface TextOpts {
  size: number;
  fill: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  spacing?: number;
  upper?: boolean;
}
function text(x: number, y: number, str: string, o: TextOpts): string {
  const s = o.upper ? str.toUpperCase() : str;
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${o.mono ? MONO : SANS}"`,
    `font-size="${o.size}"`,
    `font-weight="${o.weight ?? 400}"`,
    `fill="${o.fill}"`,
    `text-anchor="${o.anchor ?? "start"}"`,
    o.spacing ? `letter-spacing="${o.spacing}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<text ${attrs}>${esc(s)}</text>`;
}
function rect(x: number, y: number, w: number, h: number, fill: string, rx = 0): string {
  return `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" rx="${rx}" fill="${fill}" />`;
}
function bar(x: number, y: number, w: number, h: number, pct: number, color: string, track: string): string {
  return rect(x, y, w, h, track, h / 2) + rect(x, y, w * Math.max(0.02, Math.min(1, pct)), h, color, h / 2);
}

function sparkPath(data: number[], x: number, y: number, w: number, h: number, color: string): string {
  if (data.length < 2) return "";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const n = data.length;
  const pts = data.map((v, i) => [x + (i / (n - 1)) * w, y + h - ((v - min) / range) * (h - 4) - 2] as const);
  const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  return `<path d="${line}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />`;
}

function heatGrid(stats: ShareStats, x: number, y: number, w: number, c: CardColors): { svg: string; height: number } {
  const cols = 24;
  const gap = 4;
  const cell = (w - gap * (cols - 1)) / cols;
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let max = 0;
  for (const cl of stats.heatmap.cells) {
    grid[cl.weekday][cl.hour] = cl.tokens;
    if (cl.tokens > max) max = cl.tokens;
  }
  let svg = "";
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const v = grid[d][h];
      const cx = x + h * (cell + gap);
      const cy = y + d * (cell + gap);
      const fill = v > 0 ? withAlpha(c.accent, 0.14 + (max ? (v / max) * 0.86 : 0)) : withAlpha(c.fg, 0.05);
      svg += rect(cx, cy, cell, cell, fill, Math.max(2, cell * 0.2));
    }
  }
  return { svg, height: 7 * cell + 6 * gap };
}

/** Apply an alpha to a hex (#rrggbb) or hsl(...) color string. */
function withAlpha(color: string, a: number): string {
  const al = Math.max(0, Math.min(1, a)).toFixed(3);
  if (color.startsWith("#")) {
    const h = color.slice(1);
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${al})`;
  }
  if (color.startsWith("hsl(")) return color.replace(/^hsl\(/, "hsla(").replace(/\)$/, ` / ${al})`);
  return color;
}

interface MiniRow {
  label: string;
  pct: number;
  valueText: string;
  color?: string;
}
function miniBars(items: MiniRow[], x: number, y: number, w: number, c: CardColors, rowH = 48): { svg: string; height: number } {
  const labelW = 210;
  const valueW = 130;
  const barX = x + labelW;
  const barW = Math.max(40, w - labelW - valueW - 20);
  let svg = "";
  items.forEach((it, i) => {
    const ry = y + i * rowH;
    svg += text(x, ry, it.label, { size: 22, fill: c.fgMuted, mono: true, upper: true, spacing: 1 });
    svg += bar(barX, ry - 18, barW, 16, it.pct, it.color ?? c.accent, withAlpha(c.fg, 0.08));
    svg += text(x + w, ry, it.valueText, { size: 22, fill: c.fg, anchor: "end", weight: 600 });
  });
  return { svg, height: items.length * rowH };
}
function timeBuckets(hourTotals: number[]): MiniRow[] {
  const sum = (a: number, b: number) => hourTotals.slice(a, b).reduce((x, y) => x + y, 0);
  const bs: [string, number][] = [
    ["Night", sum(0, 6)],
    ["Morning", sum(6, 12)],
    ["Afternoon", sum(12, 18)],
    ["Evening", sum(18, 24)],
  ];
  const total = bs.reduce((a, [, v]) => a + v, 0) || 1;
  const max = Math.max(1, ...bs.map(([, v]) => v));
  return bs.map(([label, v]) => ({ label, pct: v / max, valueText: fmtPct(v / total) }));
}

const ISSUE: Record<string, string> = {
  wrapped: "01", persona: "02", receipt: "03", loadout: "04", rhythm: "05",
  milestone: "06", tokens: "07", cache: "08", models: "09",
};
const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, sw = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" />`;

export function renderCardSVG(stats: ShareStats, opts: CardOpts): string {
  const { w, h } = DIMS[opts.ratio ?? "square"];
  const c = opts.colors;
  const pad = Math.round(w * 0.075);
  const spine = Math.round(pad * 0.12);
  const inner = w - pad * 2 - spine;
  const left = pad + spine;
  const no = ISSUE[opts.template] ?? "00";
  const els: string[] = [];

  // frame
  els.push(rect(0, 0, w, h, c.bg));
  // faint engineering grid
  const g = Math.round(pad * 0.78);
  let gx = "";
  for (let x = g; x < w; x += g) gx += line(x, 0, x, h, withAlpha(c.fg, 0.035));
  for (let y = g; y < h; y += g) gx += line(0, y, w, y, withAlpha(c.fg, 0.035));
  els.push(gx);
  els.push(
    `<defs><radialGradient id="atm" cx="84%" cy="0%" r="78%"><stop offset="0%" stop-color="${withAlpha(c.accent, 0.2)}" /><stop offset="60%" stop-color="${withAlpha(c.accent, 0)}" /></radialGradient></defs>`,
  );
  els.push(rect(0, 0, w, h, "url(#atm)"));
  // ghosted issue numeral (behind content)
  els.push(text(w - Math.round(pad * 0.2), Math.round(h * 0.98), no, { size: Math.round(h * 0.5), fill: withAlpha(c.fg, 0.04), weight: 700, anchor: "end", spacing: -4 }));
  // accent spine
  els.push(rect(0, 0, spine, h, c.accent));
  // crop / registration marks
  const mi = Math.round(pad * 0.5);
  const ln = Math.round(pad * 0.32);
  const cmS = withAlpha(c.fg, 0.22);
  els.push(line(left + mi - ln, pad + mi, left + mi, pad + mi, cmS) + line(left + mi, pad + mi - ln, left + mi, pad + mi, cmS));
  els.push(line(w - pad - mi, pad + mi, w - pad - mi + ln, pad + mi, cmS) + line(w - pad - mi, pad + mi - ln, w - pad - mi, pad + mi, cmS));
  els.push(line(left + mi - ln, h - pad - mi, left + mi, h - pad - mi, cmS) + line(left + mi, h - pad - mi, left + mi, h - pad - mi + ln, cmS));
  els.push(line(w - pad - mi, h - pad - mi, w - pad - mi + ln, h - pad - mi, cmS) + line(w - pad - mi, h - pad - mi, w - pad - mi, h - pad - mi + ln, cmS));
  // border
  els.push(`<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="0" fill="none" stroke="${withAlpha(c.border, 1)}" stroke-width="2" />`);

  const eyebrow = (label: string, y: number) =>
    text(left, y, `${label} · ${stats.rangeLabel}`, { size: 22, fill: c.accent, weight: 600, mono: true, upper: true, spacing: 3 });

  const tmpl = opts.template;

  if (tmpl === "persona") {
    const p = derivePersona(stats);
    els.push(eyebrow("My coding persona", pad + 24));
    // accent rule instead of a (poorly-rasterized) color emoji
    els.push(rect(left, pad + 160, 90, 10, c.accent, 5));
    // two-line trait stack avoids clipping long personas ("Evening Coder Opus Maximalist")
    els.push(text(left, pad + 252, p.traits[0] ?? p.title, { size: 72, fill: c.fg, weight: 700, spacing: -1 }));
    if (p.traits[1]) els.push(text(left, pad + 326, p.traits[1], { size: 72, fill: c.fg, weight: 700, spacing: -1 }));
    els.push(text(left, pad + 384, p.blurb, { size: 28, fill: c.fgMuted }));
    const half = (inner - 60) / 2;
    els.push(text(left, pad + 452, "WHEN YOU CODE", { size: 20, fill: c.fgMuted, mono: true, spacing: 2 }));
    els.push(miniBars(timeBuckets(stats.hourTotals), left, pad + 494, half, c).svg);
    els.push(text(left + half + 60, pad + 452, "MODEL MIX", { size: 20, fill: c.fgMuted, mono: true, spacing: 2 }));
    els.push(
      miniBars(
        stats.models.slice(0, 4).map((m) => ({ label: m.label, pct: m.pct, valueText: fmtPct(m.pct), color: m.color })),
        left + half + 60,
        pad + 494,
        half,
        c,
      ).svg,
    );
    const chips: [string, string][] = [
      ["peak", `${shortDay(stats.peakDay)} ${hourLabel(stats.peakHour)}`],
      ["cache", fmtPct(stats.cacheHitRate)],
      ["weekend", fmtPct(stats.weekendPct)],
    ];
    let cy = h - pad - 130;
    for (const [k, v] of chips) {
      els.push(text(left, cy, k, { size: 22, fill: c.fgMuted, mono: true, upper: true, spacing: 2 }));
      els.push(text(left + 320, cy, v, { size: 28, fill: c.fg, weight: 600, anchor: "end" }));
      cy += 42;
    }
  } else if (tmpl === "receipt") {
    const cx = w / 2;
    els.push(text(cx, pad + 40, "AI Usage Receipt", { size: 34, fill: c.fg, weight: 700, mono: true, anchor: "middle", upper: true, spacing: 4 }));
    els.push(text(cx, pad + 80, stats.rangeLabel, { size: 22, fill: c.fgMuted, mono: true, anchor: "middle", upper: true, spacing: 2 }));
    els.push(`<line x1="${left}" y1="${pad + 120}" x2="${w - pad}" y2="${pad + 120}" stroke="${c.border}" stroke-width="2" stroke-dasharray="10 8" />`);
    let ry = pad + 185;
    for (const m of stats.models.slice(0, 6)) {
      els.push(text(left, ry, m.label, { size: 36, fill: c.fg, mono: true }));
      els.push(text(w - pad, ry, fmtUSD(m.cost), { size: 36, fill: c.fg, mono: true, anchor: "end" }));
      els.push(`<line x1="${left}" y1="${ry + 12}" x2="${w - pad}" y2="${ry + 12}" stroke="${withAlpha(c.fg, 0.18)}" stroke-width="1" stroke-dasharray="2 8" />`);
      ry += 64;
    }
    const ty = h - pad - 150;
    els.push(text(left, ty - 64, "cache savings", { size: 26, fill: c.fgMuted, mono: true, upper: true, spacing: 1 }));
    els.push(text(w - pad, ty - 64, `-${fmtUSD(stats.cacheSavings)}`, { size: 26, fill: c.fg, mono: true, anchor: "end" }));
    els.push(`<line x1="${left}" y1="${ty - 40}" x2="${w - pad}" y2="${ty - 40}" stroke="${c.border}" stroke-width="2" stroke-dasharray="10 8" />`);
    els.push(text(left, ty, "TOTAL", { size: 40, fill: c.fg, weight: 700, mono: true, spacing: 3 }));
    els.push(text(w - pad, ty, fmtUSD(stats.cost), { size: 64, fill: c.accent, weight: 700, mono: true, anchor: "end" }));
    els.push(text(cx, ty + 70, `${fmtCompact(stats.totalTokens)} tokens · ${fmtNum(stats.messages)} messages · thanks!`, { size: 24, fill: c.fgMuted, mono: true, anchor: "middle" }));
  } else if (tmpl === "loadout") {
    els.push(eyebrow("My loadout", pad + 24));
    els.push(text(left, pad + 80, `${stats.models.length} models · ${fmtCompact(stats.totalTokens)} tokens · ${fmtUSD(stats.cost)}`, { size: 28, fill: c.fgMuted }));
    let ry = pad + 170;
    for (const m of stats.models.slice(0, 5)) {
      els.push(rect(left, ry - 22, 22, 22, m.color, 6));
      els.push(text(left + 38, ry, m.label, { size: 34, fill: c.fg, weight: 600 }));
      els.push(text(w - pad, ry, `${fmtPct(m.pct)} · ${fmtUSD(m.cost)}`, { size: 28, fill: c.fgMuted, anchor: "end", weight: 600 }));
      els.push(bar(left, ry + 16, inner, 16, m.pct, m.color, withAlpha(c.fg, 0.08)));
      ry += 86;
    }
    // source split
    const sy = h - pad - 70;
    els.push(text(left, sy - 36, "BY TOOL", { size: 20, fill: c.fgMuted, mono: true, spacing: 2 }));
    let sx = left;
    for (const src of stats.sources) {
      const label = `${src.label} ${fmtPct(src.pct)}`;
      els.push(rect(sx, sy - 14, 14, 14, src.color, 4));
      els.push(text(sx + 22, sy, label, { size: 24, fill: c.fg }));
      sx += 22 + label.length * 13 + 40;
    }
  } else if (tmpl === "rhythm") {
    els.push(eyebrow("When I code", pad + 24));
    els.push(text(left, pad + 78, `peak ${shortDay(stats.peakDay)} ${hourLabel(stats.peakHour)}`, { size: 30, fill: c.fgMuted }));
    const grid = heatGrid(stats, left, pad + 130, inner, c);
    els.push(grid.svg);
    const ty = pad + 130 + grid.height + 90;
    const tiles: [string, string][] = [
      ["Weekdays", fmtPct(stats.weekdayPct)],
      ["Weekends", fmtPct(stats.weekendPct)],
      ["Active days", fmtNum(stats.days)],
      ["Tokens", fmtCompact(stats.totalTokens)],
    ];
    const tw = inner / 4;
    tiles.forEach(([k, v], i) => {
      els.push(text(left + i * tw, ty, k, { size: 20, fill: c.fgMuted, mono: true, upper: true, spacing: 1 }));
      els.push(text(left + i * tw, ty + 46, v, { size: 40, fill: c.fg, weight: 600 }));
    });
    els.push(text(left, ty + 130, "TIME OF DAY", { size: 20, fill: c.fgMuted, mono: true, spacing: 2 }));
    els.push(miniBars(timeBuckets(stats.hourTotals), left, ty + 172, inner, c).svg);
  } else if (tmpl === "milestone") {
    const m = nextMilestone(stats.totalTokens);
    const celebrating = !!m.achieved;
    els.push(eyebrow(celebrating ? "Milestone unlocked" : "Next milestone", pad + 24));
    els.push(rect(left, pad + 170, 90, 10, c.accent, 5));
    els.push(text(left, pad + 320, celebrating ? `${m.achieved!.label} tokens` : `${fmtCompact(stats.totalTokens)} tokens`, { size: 96, fill: c.fg, weight: 700, spacing: -2 }));
    els.push(text(left, pad + 376, celebrating ? `crossed ${m.achieved!.label} total tokens · ${fmtUSD(stats.cost)}` : "on the way up", { size: 30, fill: c.fgMuted }));
    // milestone ladder
    const ladder: [string, number][] = [["1M", 1e6], ["10M", 1e7], ["100M", 1e8], ["1B", 1e9], ["10B", 1e10]];
    let lx = left;
    const ly = pad + 470;
    for (const [label, value] of ladder) {
      const reached = stats.totalTokens >= value;
      const txt = `${reached ? "✓" : "○"} ${label}`;
      const wpx = txt.length * 15 + 28;
      els.push(rect(lx, ly - 26, wpx, 40, reached ? withAlpha(c.accent, 0.14) : withAlpha(c.fg, 0.04), 20));
      els.push(text(lx + 14, ly, txt, { size: 22, fill: reached ? c.accent : c.fgMuted, mono: true }));
      lx += wpx + 16;
    }
    if (m.next) {
      const by = h - pad - 110;
      els.push(text(left, by - 16, fmtCompact(stats.totalTokens), { size: 22, fill: c.fgMuted, mono: true, upper: true, spacing: 2 }));
      els.push(text(w - pad, by - 16, `next ${m.next.label}`, { size: 22, fill: c.fgMuted, mono: true, upper: true, anchor: "end", spacing: 2 }));
      els.push(bar(left, by, inner, 22, m.pctToNext, c.accent, withAlpha(c.fg, 0.08)));
      els.push(text(left, by + 56, `${fmtPct(m.pctToNext)} to ${m.next.label}`, { size: 22, fill: c.fgMuted, mono: true, upper: true, spacing: 2 }));
    }
  } else {
    // wrapped (default)
    const p = derivePersona(stats);
    els.push(eyebrow("AI Wrapped", pad + 24));
    els.push(text(left, pad + 78, p.title, { size: 36, fill: c.fg, weight: 600 }));
    els.push(text(left, pad + 210, fmtCompact(stats.totalTokens), { size: 150, fill: c.fg, weight: 700, spacing: -4 }));
    els.push(text(left, pad + 262, "tokens", { size: 32, fill: c.fgMuted }));
    if (stats.topModel) {
      els.push(text(left, pad + 320, `mostly ${stats.topModel.label} · ${fmtPct(stats.topModel.pct)} of tokens`, { size: 28, fill: c.fgMuted }));
    }
    const tiles: [string, string][] = [
      ["Est. cost", fmtUSD(stats.cost)],
      ["Messages", fmtNum(stats.messages)],
      ["Sessions", fmtNum(stats.sessions)],
      ["Cache hit", fmtPct(stats.cacheHitRate)],
    ];
    const tw = inner / 4;
    const ty = pad + 420;
    tiles.forEach(([k, v], i) => {
      els.push(text(left + i * tw, ty, k, { size: 20, fill: c.fgMuted, mono: true, upper: true, spacing: 1 }));
      els.push(text(left + i * tw, ty + 48, v, { size: 44, fill: c.fg, weight: 600 }));
    });
    const tools = stats.tools.slice(0, 3);
    if (tools.length) {
      const maxT = Math.max(1, ...tools.map((t) => t.count));
      els.push(text(left, ty + 120, "TOP TOOLS", { size: 20, fill: c.fgMuted, mono: true, spacing: 2 }));
      els.push(miniBars(tools.map((t) => ({ label: t.name, pct: t.count / maxT, valueText: fmtNum(t.count) })), left, ty + 162, inner, c, 44).svg);
    }
    const sy = h - pad - 180;
    els.push(text(left, sy, `activity · subagents ${fmtPct(stats.subagentPct)}`, { size: 20, fill: c.fgMuted, mono: true, upper: true, spacing: 2 }));
    els.push(text(w - pad, sy, `peak ${shortDay(stats.peakDay)} ${hourLabel(stats.peakHour)} · wk ${fmtPct(stats.weekdayPct)} / wknd ${fmtPct(stats.weekendPct)}`, { size: 20, fill: c.fgMuted, mono: true, upper: true, anchor: "end", spacing: 2 }));
    els.push(sparkPath(stats.spark, left, sy + 24, inner, 110, c.accent));
  }

  // colophon footer
  const fy = h - pad + 36;
  els.push(line(left, fy - 28, w - pad, fy - 28, withAlpha(c.border, 1)));
  els.push(text(left, fy, `AGENTMON · LOCAL · ON-DEVICE`, { size: 18, fill: c.fgMuted, mono: true, upper: true, spacing: 2 }));
  els.push(text(w - pad, fy, `${opts.handle ? opts.handle + " · " : ""}Nº ${no}`, { size: 18, fill: c.fgMuted, mono: true, upper: true, anchor: "end", spacing: 2 }));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${els.join("")}</svg>`;
}
