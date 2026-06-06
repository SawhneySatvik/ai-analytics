// Lightweight, animation-free chart primitives for the share cards. These use
// plain SVG / CSS gradients (no Recharts) so they serialize cleanly when the
// card is captured to PNG. Colors follow the card's theme via `currentColor`
// (sparkline) or concrete hsl strings (donut/bars).

import type { ShareSlice } from "@/lib/share";
import type { HeatCell } from "@/lib/aggregate";

export function Spark({ data, width, height }: { data: number[]; width: number; height: number }) {
  if (data.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="text-accent">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ConicDonut({
  slices,
  size,
  thickness,
  children,
}: {
  slices: ShareSlice[];
  size: number;
  thickness: number;
  children?: React.ReactNode;
}) {
  let acc = 0;
  const stops: string[] = [];
  for (const s of slices) {
    const a = acc;
    acc += s.pct;
    stops.push(`${s.color} ${(a * 360).toFixed(2)}deg ${(acc * 360).toFixed(2)}deg`);
  }
  if (acc < 1) stops.push(`hsl(var(--fg) / 0.08) ${(acc * 360).toFixed(2)}deg 360deg`);
  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${stops.join(", ")})` }} />
      <div className="absolute rounded-full bg-bg" style={{ inset: thickness }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function ShareBar({ pct, color, height = 10 }: { pct: number; color: string; height?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: "hsl(var(--fg) / 0.08)" }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct * 100)}%`, background: color }} />
    </div>
  );
}

/** hour × weekday activity grid (Sun→Sat rows, 0→23h cols), accent-shaded. */
export function HeatGrid({ cells, width, gap = 3 }: { cells: HeatCell[]; width: number; gap?: number }) {
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let max = 0;
  for (const c of cells) {
    grid[c.weekday][c.hour] = c.tokens;
    if (c.tokens > max) max = c.tokens;
  }
  const cols = 24;
  const cell = (width - gap * (cols - 1)) / cols;
  const radius = Math.max(2, cell * 0.2);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {grid.map((row, d) => (
        <div key={d} style={{ display: "flex", gap }}>
          {row.map((v, h) => {
            const a = max ? 0.14 + (v / max) * 0.86 : 0;
            return (
              <div
                key={h}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: radius,
                  background: v > 0 ? `hsl(var(--accent) / ${a.toFixed(3)})` : "hsl(var(--fg) / 0.05)",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
