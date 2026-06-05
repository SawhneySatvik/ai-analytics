"use client";

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

const GRID = "rgba(125,125,135,0.16)";
const AXIS = "rgba(125,125,135,0.85)";

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
    <div className="rounded-lg border border-border bg-bg-elev/95 px-3 py-2 shadow-lg backdrop-blur">
      {label != null && (
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
          {labelFmt ? labelFmt(label) : label}
        </div>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-fg-muted">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: p.color }} />
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: AXIS }}
          tickFormatter={xFormat}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS }}
          tickFormatter={(v) => valueFormat(Number(v))}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip content={<TooltipBox fmt={valueFormat} labelFmt={xFormat} />} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stackId="1"
            stroke={s.color}
            strokeWidth={1.5}
            fill={`url(#grad-${s.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: AXIS }}
          tickFormatter={xFormat}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS }}
          tickFormatter={(v) => valueFormat(Number(v))}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip content={<TooltipBox fmt={valueFormat} labelFmt={xFormat} />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={margin}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: AXIS }}
          tickFormatter={xFormat}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={16}
        />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS }}
          tickFormatter={(v) => valueFormat(Number(v))}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "rgba(125,125,135,0.08)" }}
          content={<TooltipBox fmt={valueFormat} labelFmt={xFormat} />}
        />
        {bars.map((b) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            stackId={stacked ? "1" : undefined}
            fill={b.color}
            radius={stacked ? [0, 0, 0, 0] : [3, 3, 0, 0]}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
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
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={1.5}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox fmt={valueFormat} />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-2xl font-semibold tracking-tight text-fg tabular">
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} />
      </AreaChart>
    </ResponsiveContainer>
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
              "group relative overflow-hidden rounded-lg border border-border/60 bg-bg/40 px-3 py-2",
              interactive && "cursor-pointer transition-colors hover:border-accent/50",
            )}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-lg opacity-25 transition-all group-hover:opacity-40"
              style={{ width: `${pct}%`, background: item.color ?? "hsl(217 91% 60%)" }}
            />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm text-fg">{item.label}</div>
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
                const alpha = max > 0 ? 0.08 + (v / max) * 0.92 : 0.06;
                return (
                  <div
                    key={h}
                    title={`${wd} ${h}:00 — ${v.toLocaleString()} ${metric}`}
                    className="aspect-square rounded-[3px] border border-border/40"
                    style={{ background: v > 0 ? `rgba(59,130,246,${alpha})` : "transparent" }}
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
