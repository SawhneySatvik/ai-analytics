"use client";

import { forwardRef } from "react";
import { Activity } from "lucide-react";

import { RATIOS, type ShareRatio, type ShareStats, type ShareTemplate } from "@/lib/share";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@/lib/format";
import { ConicDonut, ShareBar, Spark } from "./viz";

export interface ShareCardProps {
  stats: ShareStats;
  template: ShareTemplate;
  theme: string;
  ratio: ShareRatio;
  handle?: string;
}

type Sizing = {
  pad: number;
  eyebrow: number;
  hero: number;
  unit: number;
  tile: number;
  tileLabel: number;
  foot: number;
  spark: number;
  gap: number;
};

const SIZES: Record<ShareRatio, Sizing> = {
  landscape: { pad: 56, eyebrow: 15, hero: 104, unit: 22, tile: 30, tileLabel: 12, foot: 15, spark: 60, gap: 20 },
  square: { pad: 72, eyebrow: 16, hero: 132, unit: 26, tile: 38, tileLabel: 13, foot: 16, spark: 96, gap: 28 },
  story: { pad: 84, eyebrow: 19, hero: 156, unit: 30, tile: 46, tileLabel: 15, foot: 18, spark: 150, gap: 40 },
};

function Eyebrow({ children, s }: { children: React.ReactNode; s: Sizing }) {
  return (
    <div
      style={{ fontSize: s.eyebrow, letterSpacing: "0.2em" }}
      className="font-mono font-medium uppercase text-accent"
    >
      {children}
    </div>
  );
}

function Tile({ label, value, s }: { label: string; value: string; s: Sizing }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        style={{ fontSize: s.tileLabel, letterSpacing: "0.14em" }}
        className="font-mono uppercase text-fg-muted"
      >
        {label}
      </div>
      <div style={{ fontSize: s.tile, lineHeight: 1 }} className="font-semibold tracking-tight text-fg tabular">
        {value}
      </div>
    </div>
  );
}

function Hero({ value, unit, s }: { value: string; unit: string; s: Sizing }) {
  return (
    <div className="flex items-baseline gap-3">
      <span style={{ fontSize: s.hero, lineHeight: 0.95, letterSpacing: "-0.04em" }} className="font-semibold text-fg tabular">
        {value}
      </span>
      <span style={{ fontSize: s.unit }} className="font-medium text-fg-muted">
        {unit}
      </span>
    </div>
  );
}

function body(stats: ShareStats, template: ShareTemplate, ratio: ShareRatio, s: Sizing, inner: number) {
  const horizontal = ratio === "landscape";

  if (template === "tokens") {
    return (
      <div className="flex h-full flex-col">
        <div>
          <Eyebrow s={s}>Token Maxer · {stats.rangeLabel}</Eyebrow>
          <div style={{ marginTop: s.gap }}>
            <Hero value={fmtCompact(stats.totalTokens)} unit="tokens" s={s} />
          </div>
          <div style={{ fontSize: s.unit * 0.85, marginTop: s.gap * 0.5 }} className="text-fg-muted">
            <span className="font-semibold text-fg">{fmtCompact(stats.billableTokens)}</span> billable ·{" "}
            <span className="font-semibold text-fg">{fmtUSD(stats.cacheSavings)}</span> saved by caching
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center" style={{ paddingBlock: s.gap }}>
          <Spark data={stats.spark} width={inner} height={s.spark} />
        </div>
        <div className="grid grid-cols-4" style={{ gap: s.pad * 0.4 }}>
          <Tile label="Messages" value={fmtNum(stats.messages)} s={s} />
          <Tile label="Sessions" value={fmtNum(stats.sessions)} s={s} />
          <Tile label="Tool calls" value={fmtNum(stats.toolCalls)} s={s} />
          <Tile label="Projects" value={fmtNum(stats.projects)} s={s} />
        </div>
      </div>
    );
  }

  if (template === "cache") {
    const actualPct = stats.uncachedCost > 0 ? stats.cost / stats.uncachedCost : 1;
    return (
      <div className="flex h-full flex-col justify-between">
        <div>
          <Eyebrow s={s}>Cache Efficiency · {stats.rangeLabel}</Eyebrow>
          <div style={{ marginTop: s.gap }}>
            <Hero value={fmtPct(stats.cacheHitRate, 1)} unit="cache hit rate" s={s} />
          </div>
          <div style={{ fontSize: s.unit, marginTop: s.gap * 0.5 }} className="font-semibold text-accent">
            {fmtUSD(stats.cacheSavings)} saved
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: s.gap * 0.5 }}>
          <div className="flex items-center justify-between" style={{ fontSize: s.tileLabel + 1 }}>
            <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">
              actual {fmtUSD(stats.cost)}
            </span>
            <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">
              without cache {fmtUSD(stats.uncachedCost)}
            </span>
          </div>
          <ShareBar pct={actualPct} color="hsl(var(--accent))" height={s.spark * 0.18} />
        </div>
        <div className="grid grid-cols-3" style={{ gap: s.pad * 0.4 }}>
          <Tile label="Tokens" value={fmtCompact(stats.totalTokens)} s={s} />
          <Tile label="Messages" value={fmtNum(stats.messages)} s={s} />
          <Tile label="Est. cost" value={fmtUSD(stats.cost)} s={s} />
        </div>
      </div>
    );
  }

  if (template === "models") {
    const donut = horizontal ? inner * 0.36 : inner * 0.52;
    return (
      <div className="flex h-full flex-col justify-between">
        <Eyebrow s={s}>Model Mix · {stats.rangeLabel}</Eyebrow>
        <div
          className="flex items-center"
          style={{ flexDirection: horizontal ? "row" : "column", gap: s.pad * 0.7 }}
        >
          <ConicDonut slices={stats.models} size={donut} thickness={donut * 0.17}>
            <span style={{ fontSize: donut * 0.16 }} className="font-semibold text-fg tabular">
              {fmtCompact(stats.totalTokens)}
            </span>
            <span
              style={{ fontSize: donut * 0.07, letterSpacing: "0.14em" }}
              className="font-mono uppercase text-fg-muted"
            >
              tokens
            </span>
          </ConicDonut>
          <div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: s.gap * 0.6, width: "100%" }}>
            {stats.models.slice(0, 5).map((m) => (
              <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="flex items-center justify-between" style={{ fontSize: s.tileLabel + 3 }}>
                  <span className="flex items-center gap-2 font-medium text-fg">
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: m.color }} />
                    {m.label}
                  </span>
                  <span className="font-semibold text-fg-muted tabular">{fmtPct(m.pct)}</span>
                </div>
                <ShareBar pct={m.pct} color={m.color} height={6} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 0 }} />
      </div>
    );
  }

  // wrapped (default)
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <Eyebrow s={s}>AI Usage · {stats.rangeLabel}</Eyebrow>
        <div style={{ marginTop: s.gap }}>
          <Hero value={fmtCompact(stats.totalTokens)} unit="tokens" s={s} />
        </div>
        {stats.topModel && (
          <div style={{ fontSize: s.unit * 0.82, marginTop: s.gap * 0.5 }} className="text-fg-muted">
            mostly <span className="font-semibold text-fg">{stats.topModel.label}</span> · {fmtPct(stats.topModel.pct)} of tokens
            {stats.topProject && (
              <>
                {" · "}top project <span className="font-semibold text-fg">{stats.topProject.name}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4" style={{ gap: s.pad * 0.4 }}>
        <Tile label="Est. cost" value={fmtUSD(stats.cost)} s={s} />
        <Tile label="Messages" value={fmtNum(stats.messages)} s={s} />
        <Tile label="Sessions" value={fmtNum(stats.sessions)} s={s} />
        <Tile label="Active days" value={fmtNum(stats.days)} s={s} />
      </div>

      <div>
        <div
          className="mb-3 flex items-center justify-between"
          style={{ fontSize: s.tileLabel, letterSpacing: "0.14em" }}
        >
          <span className="font-mono uppercase text-fg-muted">activity</span>
          <span className="font-mono uppercase text-fg-muted">
            {fmtPct(stats.cacheHitRate)} cache hit
          </span>
        </div>
        <Spark data={stats.spark} width={inner} height={s.spark} />
      </div>
    </div>
  );
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { stats, template, theme, ratio, handle },
  ref,
) {
  const { w, h } = RATIOS[ratio];
  const s = SIZES[ratio];
  const inner = w - s.pad * 2;

  return (
    <div
      ref={ref}
      data-theme={theme}
      style={{ width: w, height: h }}
      className="relative isolate overflow-hidden bg-bg font-sans text-fg"
    >
      {/* atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(${w * 0.9}px ${h * 0.8}px at 82% -12%, hsl(var(--accent) / 0.20), transparent 58%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(${w}px ${h}px at 8% 118%, hsl(var(--accent) / 0.07), transparent 52%)` }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 0 1px hsl(var(--border))" }} />

      <div className="relative flex h-full flex-col" style={{ padding: s.pad }}>
        <div className="flex-1">{body(stats, template, ratio, s, inner)}</div>

        {/* footer / brand */}
        <div className="flex items-center justify-between" style={{ marginTop: s.gap }}>
          <div className="flex items-center" style={{ gap: s.foot * 0.8 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: s.foot * 2.3,
                height: s.foot * 2.3,
                borderRadius: s.foot * 0.7,
                background: "linear-gradient(135deg, hsl(var(--accent) / 0.4), hsl(var(--accent) / 0.06))",
                boxShadow: "inset 0 0 0 1px hsl(var(--accent) / 0.3)",
              }}
            >
              <Activity style={{ width: s.foot * 1.25, height: s.foot * 1.25 }} className="text-accent" />
            </div>
            <div>
              <div style={{ fontSize: s.foot }} className="font-semibold text-fg">
                CLI Usage Analytics
              </div>
              <div
                style={{ fontSize: s.foot * 0.78, letterSpacing: "0.16em" }}
                className="font-mono uppercase text-fg-muted"
              >
                local · on-device
              </div>
            </div>
          </div>
          {handle ? (
            <div style={{ fontSize: s.foot }} className="font-mono font-medium text-fg-muted">
              {handle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
