"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { fmtCompact } from "@/lib/format";

const GRID = "rgba(125,125,135,0.13)";
const AXIS = "rgba(125,125,135,0.8)";
const CURSOR = "rgba(125,125,135,0.4)";
const DOT_RING = "rgba(125,125,135,0.5)";

// Tuned draw-in: crisper than the ~1.5s recharts default.
const ANIM = { isAnimationActive: true, animationDuration: 700, animationEasing: "ease-out" } as const;

// Sanitize an arbitrary series key into a valid SVG gradient id (model keys can
// contain ":" and "/", which break url(#...) references and drop the fill).
const safeId = (k: string) => "g-" + k.replace(/[^a-zA-Z0-9_-]/g, "_");

export const TOKEN_SERIES = [
  { key: "input", name: "Input", color: "hsl(217 91% 60%)" },
  { key: "output", name: "Output", color: "hsl(263 70% 64%)" },
  { key: "cacheCreate", name: "Cache write", color: "hsl(38 92% 56%)" },
  { key: "cacheRead", name: "Cache read", color: "hsl(158 64% 46%)" },
];

interface Series {
  key: string;
  name: string;
  color: string;
}

function allZero(data: object[], keys: string[]): boolean {
  if (!data.length) return true;
  return data.every((row) =>
    keys.every((k) => !Number((row as Record<string, unknown>)[k])),
  );
}

function ChartEmpty({ height }: { height: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 text-fg-muted"
      style={{ height }}
    >
      <div className="h-8 w-8 rounded-full border border-dashed border-border" />
      <span className="text-xs">No data in range</span>
    </div>
  );
}

/**
 * Stable, responsive box for a Recharts chart. Reserves `height` up front (so
 * there's no layout shift) and only mounts the ResponsiveContainer after the
 * parent is laid out — this avoids Recharts' first-paint width=0 flash and keeps
 * every chart sitting flush inside its card across breakpoints.
 */
function ChartFrame({
  height,
  className,
  children,
}: {
  height: number;
  className?: string;
  children: React.ReactElement;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

interface TooltipBoxProps {
  active?: boolean;
  label?: string | number;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  fmt?: (n: number) => string;
  labelFmt?: (v: string | number) => string;
}

function TooltipBox({ active, label, payload, fmt = fmtCompact, labelFmt }: TooltipBoxProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-[9rem] rounded-xl border border-border/80 bg-bg-elev/95 px-3 py-2 shadow-pop backdrop-blur motion-safe:animate-pop-in">
      {label != null && (
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
          {labelFmt ? labelFmt(label) : label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-fg-muted">
              <span className="h-2 w-2 rounded-[3px]" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="tabular font-medium text-fg">{fmt(p.value ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const margin = { top: 8, right: 8, bottom: 0, left: 0 };
const lineCursor = { stroke: CURSOR, strokeWidth: 1, strokeDasharray: "4 4" };

// NOTE: Recharts only detects axis/grid elements when they are DIRECT children
// of the chart, so these are inlined per chart (not extracted to a component).
function gridEl() {
  return <CartesianGrid stroke={GRID} vertical={false} />;
}
function xAxisEl(xKey: string, xFormat?: (v: string | number) => string, minTickGap = 24) {
  return (
    <XAxis
      dataKey={xKey}
      tick={{ fontSize: 11, fill: AXIS }}
      tickFormatter={xFormat}
      tickLine={false}
      axisLine={{ stroke: GRID }}
      tickMargin={8}
      minTickGap={minTickGap}
    />
  );
}
function yAxisEl(valueFormat: (n: number) => string) {
  return (
    <YAxis
      tick={{ fontSize: 11, fill: AXIS }}
      tickFormatter={(v) => valueFormat(Number(v))}
      tickLine={false}
      axisLine={false}
      width={44}
    />
  );
}

export function StackedAreaChart({
  data,
  xKey,
  series,
  height = 260,
  valueFormat = fmtCompact,
  xFormat,
}: {
  data: object[];
  xKey: string;
  series: Series[];
  height?: number;
  valueFormat?: (n: number) => string;
  xFormat?: (v: string | number) => string;
}) {
  if (allZero(data, series.map((s) => s.key))) return <ChartEmpty height={height} />;
  return (
    <ChartFrame height={height}>
      <AreaChart data={data} margin={margin}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={safeId(s.key)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        {gridEl()}
        {xAxisEl(xKey, xFormat)}
        {yAxisEl(valueFormat)}
        <Tooltip cursor={lineCursor} content={<TooltipBox fmt={valueFormat} labelFmt={xFormat} />} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stackId="1"
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#${safeId(s.key)})`}
            activeDot={{ r: 3.5, strokeWidth: 2, stroke: DOT_RING }}
            {...ANIM}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  );
}

export function MultiLineChart({
  data,
  xKey,
  series,
  height = 260,
  valueFormat = fmtCompact,
  xFormat,
}: {
  data: object[];
  xKey: string;
  series: Series[];
  height?: number;
  valueFormat?: (n: number) => string;
  xFormat?: (v: string | number) => string;
}) {
  if (allZero(data, series.map((s) => s.key))) return <ChartEmpty height={height} />;
  return (
    <ChartFrame height={height}>
      <LineChart data={data} margin={margin}>
        {gridEl()}
        {xAxisEl(xKey, xFormat)}
        {yAxisEl(valueFormat)}
        <Tooltip cursor={lineCursor} content={<TooltipBox fmt={valueFormat} labelFmt={xFormat} />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: DOT_RING }}
            {...ANIM}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

export function SimpleBarChart({
  data,
  xKey,
  bars,
  height = 260,
  valueFormat = fmtCompact,
  xFormat,
  stacked = false,
}: {
  data: object[];
  xKey: string;
  bars: Series[];
  height?: number;
  valueFormat?: (n: number) => string;
  xFormat?: (v: string | number) => string;
  stacked?: boolean;
}) {
  if (allZero(data, bars.map((b) => b.key))) return <ChartEmpty height={height} />;
  return (
    <ChartFrame height={height}>
      <BarChart data={data} margin={margin}>
        {gridEl()}
        {xAxisEl(xKey, xFormat)}
        {yAxisEl(valueFormat)}
        <Tooltip
          cursor={{ fill: "rgba(125,125,135,0.07)" }}
          content={<TooltipBox fmt={valueFormat} labelFmt={xFormat} />}
        />
        {bars.map((b) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            stackId={stacked ? "1" : undefined}
            fill={b.color}
            radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            maxBarSize={48}
            {...ANIM}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

export function DonutChart({
  data,
  height = 220,
  valueFormat = fmtCompact,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  valueFormat?: (n: number) => string;
  centerLabel?: string;
  centerValue?: string;
}) {
  if (!data.length || data.every((d) => !d.value)) return <ChartEmpty height={height} />;
  return (
    <div className="relative" style={{ height }}>
      <ChartFrame height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={1.5}
            stroke="none"
            {...ANIM}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox fmt={valueFormat} />} />
        </PieChart>
      </ChartFrame>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-2xl font-semibold tracking-tighter2 text-fg tabular">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function Sparkline({
  data,
  color = "hsl(217 91% 60%)",
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const chartData = data.map((v, i) => ({ i, v }));
  const gid = safeId(`spark-${color}`);
  return (
    <ChartFrame height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${gid})`}
          {...ANIM}
        />
      </AreaChart>
    </ChartFrame>
  );
}

// ── plain-HTML horizontal bar list (no recharts) ─────────────────────────────

export interface BarListItem {
  label: string;
  value: number;
  sub?: string;
  color?: string;
  href?: string;
  onClick?: () => void;
}

export function BarList({
  items,
  valueFormat = fmtCompact,
  emptyText = "No data",
}: {
  items: BarListItem[];
  valueFormat?: (n: number) => string;
  emptyText?: string;
}) {
  if (items.length === 0) return <p className="py-6 text-center text-xs text-fg-muted">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const pct = (item.value / max) * 100;
        const interactive = item.onClick || item.href;
        const Inner = (
          <div
            className={cn(
              "group relative overflow-hidden rounded-lg border border-border/60 bg-bg/40 px-3 py-2 transition-[transform,border-color] duration-200",
              interactive && "cursor-pointer hover:-translate-y-px hover:border-accent/50",
            )}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-lg opacity-[0.22] transition-all duration-300 group-hover:opacity-40"
              style={{ width: `${pct}%`, background: item.color ?? "hsl(217 91% 60%)" }}
            />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm text-fg" title={item.label}>
                  {item.label}
                </div>
                {item.sub && <div className="truncate text-[11px] text-fg-muted">{item.sub}</div>}
              </div>
              <div className="tabular text-sm font-medium text-fg">{valueFormat(item.value)}</div>
            </div>
          </div>
        );
        if (item.href) {
          return (
            <a key={i} href={item.href} className="block">
              {Inner}
            </a>
          );
        }
        return (
          <button key={i} onClick={item.onClick} className="block w-full text-left" type="button">
            {Inner}
          </button>
        );
      })}
    </div>
  );
}

// ── hour × weekday heatmap (custom grid) ─────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-1 ml-10 grid grid-cols-24 gap-[3px]">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="text-center font-mono text-[8px] text-fg-muted">
              {h % 6 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {WEEKDAYS.map((wd, w) => (
          <div key={wd} className="mb-[3px] flex items-center gap-[3px]">
            <div className="w-9 font-mono text-[9px] uppercase tracking-wide text-fg-muted">{wd}</div>
            <div className="grid flex-1 grid-cols-24 gap-[3px]">
              {Array.from({ length: 24 }).map((_, h) => {
                const v = grid.get(`${w}:${h}`) ?? 0;
                const alpha = max > 0 ? 0.1 + (v / max) * 0.85 : 0;
                return (
                  <div
                    key={h}
                    title={`${wd} ${h}:00 — ${v.toLocaleString()} ${metric}`}
                    className="aspect-square rounded-[3px] border border-border/40 transition-transform duration-150 hover:scale-[1.25] hover:ring-1 hover:ring-accent/60"
                    style={{
                      background: v > 0 ? `hsl(var(--accent) / ${alpha})` : "hsl(var(--fg) / 0.03)",
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
