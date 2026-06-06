"use client";

import { forwardRef } from "react";
import { Activity } from "lucide-react";

import { RATIOS, type ShareRatio, type ShareStats, type ShareTemplate } from "@/lib/share";
import { derivePersona, nextMilestone } from "@/lib/badges";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@/lib/format";
import { ConicDonut, HeatGrid, MiniBars, ShareBar, Spark, type MiniBarItem } from "./viz";

const hourLabel = (h: number | null) => (h == null ? "—" : `${String(h).padStart(2, "0")}:00`);
const shortDay = (d: string | null) => (d ? d.slice(0, 3) : "—");

// Editorial "issue number" per template — printed big & ghosted for poster depth.
const TEMPLATE_META: Record<ShareTemplate, { no: string; kicker: string }> = {
  wrapped: { no: "01", kicker: "The Wrapped" },
  persona: { no: "02", kicker: "The Persona" },
  receipt: { no: "03", kicker: "The Receipt" },
  loadout: { no: "04", kicker: "The Loadout" },
  rhythm: { no: "05", kicker: "The Rhythm" },
  milestone: { no: "06", kicker: "The Milestone" },
  tokens: { no: "07", kicker: "Token Maxer" },
  cache: { no: "08", kicker: "Cache Pro" },
  models: { no: "09", kicker: "Model Mix" },
};

function timeBuckets(hourTotals: number[]): MiniBarItem[] {
  const sum = (a: number, b: number) => hourTotals.slice(a, b).reduce((x, y) => x + y, 0);
  const buckets = [
    { label: "Night", value: sum(0, 6) },
    { label: "Morning", value: sum(6, 12) },
    { label: "Afternoon", value: sum(12, 18) },
    { label: "Evening", value: sum(18, 24) },
  ];
  const total = buckets.reduce((a, b) => a + b.value, 0) || 1;
  const max = Math.max(1, ...buckets.map((b) => b.value));
  return buckets.map((b) => ({ ...b, max, valueText: fmtPct(b.value / total) }));
}

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
  landscape: { pad: 56, eyebrow: 15, hero: 100, unit: 22, tile: 30, tileLabel: 12, foot: 15, spark: 56, gap: 18 },
  square: { pad: 72, eyebrow: 16, hero: 128, unit: 26, tile: 38, tileLabel: 13, foot: 16, spark: 92, gap: 26 },
  story: { pad: 84, eyebrow: 19, hero: 150, unit: 30, tile: 46, tileLabel: 15, foot: 18, spark: 140, gap: 38 },
};

function Eyebrow({ children, s }: { children: React.ReactNode; s: Sizing }) {
  return (
    <div style={{ fontSize: s.eyebrow, letterSpacing: "0.2em" }} className="font-mono font-medium uppercase text-accent">
      {children}
    </div>
  );
}

function Tile({ label, value, s }: { label: string; value: string; s: Sizing }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div style={{ fontSize: s.tileLabel, letterSpacing: "0.14em" }} className="font-mono uppercase text-fg-muted">
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

function Chip({ children, s }: { children: React.ReactNode; s: Sizing }) {
  return (
    <span
      style={{ fontSize: s.tileLabel + 2, padding: `${s.gap * 0.3}px ${s.gap * 0.6}px`, borderRadius: 999, gap: s.gap * 0.4 }}
      className="inline-flex items-center border border-border bg-[hsl(var(--fg)/0.04)] font-medium"
    >
      {children}
    </span>
  );
}

/** A titled mini-section used to pack more detail into a card. */
function Block({ title, children, s, className }: { title: string; children: React.ReactNode; s: Sizing; className?: string }) {
  return (
    <div className={"flex flex-1 flex-col " + (className ?? "")} style={{ gap: s.gap * 0.45 }}>
      <div style={{ fontSize: s.tileLabel, letterSpacing: "0.16em" }} className="font-mono uppercase text-fg-muted">
        {title}
      </div>
      {children}
    </div>
  );
}

function body(stats: ShareStats, template: ShareTemplate, ratio: ShareRatio, s: Sizing, inner: number) {
  const horizontal = ratio === "landscape";
  const mini = { labelWidth: s.tile * 2.9, valueWidth: s.tile * 1.7, fontSize: s.tileLabel };

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
            <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">actual {fmtUSD(stats.cost)}</span>
            <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">without cache {fmtUSD(stats.uncachedCost)}</span>
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
    const donut = horizontal ? inner * 0.34 : inner * 0.48;
    return (
      <div className="flex h-full flex-col justify-between">
        <Eyebrow s={s}>Model Mix · {stats.rangeLabel}</Eyebrow>
        <div className="flex items-center" style={{ flexDirection: horizontal ? "row" : "column", gap: s.pad * 0.7 }}>
          <ConicDonut slices={stats.models} size={donut} thickness={donut * 0.17}>
            <span style={{ fontSize: donut * 0.16 }} className="font-semibold text-fg tabular">
              {fmtCompact(stats.totalTokens)}
            </span>
            <span style={{ fontSize: donut * 0.07, letterSpacing: "0.14em" }} className="font-mono uppercase text-fg-muted">
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
                  <span className="font-semibold text-fg-muted tabular">
                    {fmtPct(m.pct)} · {fmtUSD(m.cost)}
                  </span>
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

  if (template === "persona") {
    const p = derivePersona(stats);
    const modelBars: MiniBarItem[] = stats.models.slice(0, 3).map((m) => ({
      label: m.label,
      value: m.pct,
      max: 1,
      color: m.color,
      valueText: fmtPct(m.pct),
    }));
    return (
      <div className="flex h-full flex-col justify-between">
        <Eyebrow s={s}>My coding persona · {stats.rangeLabel}</Eyebrow>
        <div className="flex flex-col items-start" style={{ gap: s.gap * 0.5 }}>
          <div style={{ fontSize: s.hero * 0.9, lineHeight: 1 }}>{p.emoji}</div>
          <div style={{ fontSize: s.hero * 0.42, lineHeight: 1.02, letterSpacing: "-0.02em" }} className="font-semibold tracking-tight text-fg">
            {p.title}
          </div>
          <div style={{ fontSize: s.unit * 0.85, maxWidth: "92%" }} className="text-fg-muted">
            {p.blurb}
          </div>
        </div>
        <div className="flex" style={{ gap: s.pad * 0.6, flexDirection: horizontal ? "row" : "column" }}>
          <Block title="When you code" s={s}>
            <MiniBars items={timeBuckets(stats.hourTotals)} {...mini} />
          </Block>
          <Block title="Model mix" s={s}>
            <MiniBars items={modelBars} {...mini} />
          </Block>
        </div>
        <div className="flex flex-wrap" style={{ gap: s.gap * 0.5 }}>
          {(
            [
              ["peak", `${shortDay(stats.peakDay)} ${hourLabel(stats.peakHour)}`],
              ["cache", fmtPct(stats.cacheHitRate)],
              ["weekend", fmtPct(stats.weekendPct)],
            ] as [string, string][]
          ).map(([k, v]) => (
            <Chip key={k} s={s}>
              <span className="font-mono uppercase text-fg-muted" style={{ fontSize: s.tileLabel }}>{k}</span>
              <span className="text-fg">{v}</span>
            </Chip>
          ))}
        </div>
      </div>
    );
  }

  if (template === "receipt") {
    return (
      <div className="flex h-full flex-col font-mono">
        <div className="text-center">
          <div style={{ fontSize: s.unit }} className="font-semibold uppercase tracking-[0.2em] text-fg">
            AI Usage Receipt
          </div>
          <div style={{ fontSize: s.tileLabel }} className="uppercase tracking-[0.14em] text-fg-muted">
            {stats.rangeLabel}
          </div>
        </div>
        <div style={{ marginTop: s.gap, borderTop: "2px dashed hsl(var(--border))" }} />
        <div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: s.gap * 0.5, paddingBlock: s.gap }}>
          {stats.models.slice(0, 6).map((m) => (
            <div key={m.label} className="flex items-baseline" style={{ fontSize: s.tile * 0.56 }}>
              <span className="text-fg">{m.label}</span>
              <span style={{ flex: 1, margin: "0 10px", borderBottom: "1px dotted hsl(var(--fg) / 0.25)", transform: "translateY(-4px)" }} />
              <span className="text-fg tabular">{fmtUSD(m.cost)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-baseline justify-between" style={{ fontSize: s.tileLabel + 2 }}>
          <span className="uppercase tracking-[0.14em] text-fg-muted">cache savings</span>
          <span className="text-fg tabular">−{fmtUSD(stats.cacheSavings)}</span>
        </div>
        <div style={{ marginTop: s.gap * 0.5, borderTop: "2px dashed hsl(var(--border))" }} />
        <div className="flex items-baseline justify-between" style={{ marginTop: s.gap * 0.5 }}>
          <span style={{ fontSize: s.unit }} className="font-semibold uppercase tracking-[0.16em] text-fg">Total</span>
          <span style={{ fontSize: s.hero * 0.56 }} className="font-semibold text-accent tabular">{fmtUSD(stats.cost)}</span>
        </div>
        <div style={{ fontSize: s.tileLabel + 1, marginTop: s.gap * 0.4 }} className="text-center text-fg-muted">
          {fmtCompact(stats.totalTokens)} tokens · {fmtNum(stats.messages)} messages · thanks for your business 💸
        </div>
      </div>
    );
  }

  if (template === "loadout") {
    return (
      <div className="flex h-full flex-col justify-between">
        <div>
          <Eyebrow s={s}>My loadout · {stats.rangeLabel}</Eyebrow>
          <div style={{ marginTop: s.gap * 0.5, fontSize: s.unit * 0.9 }} className="text-fg-muted">
            <span className="font-semibold text-fg">{stats.models.length}</span> models ·{" "}
            <span className="font-semibold text-fg">{fmtCompact(stats.totalTokens)}</span> tokens ·{" "}
            <span className="font-semibold text-fg">{fmtUSD(stats.cost)}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: s.gap * 0.65 }}>
          {stats.models.slice(0, 5).map((m) => (
            <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="flex items-center justify-between" style={{ fontSize: s.tile * 0.56 }}>
                <span className="flex items-center gap-2 font-medium text-fg">
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: m.color }} />
                  {m.label}
                </span>
                <span className="font-semibold text-fg-muted tabular">{fmtPct(m.pct)} · {fmtUSD(m.cost)}</span>
              </div>
              <ShareBar pct={m.pct} color={m.color} height={Math.max(6, s.spark * 0.12)} />
            </div>
          ))}
        </div>
        <Block title="By tool" s={s}>
          <div className="flex flex-wrap" style={{ gap: s.gap * 0.45 }}>
            {stats.sources.map((src) => (
              <Chip key={src.label} s={s}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: src.color }} />
                <span className="text-fg">{src.label}</span>
                <span className="text-fg-muted">{fmtPct(src.pct)}</span>
              </Chip>
            ))}
          </div>
        </Block>
      </div>
    );
  }

  if (template === "rhythm") {
    return (
      <div className="flex h-full flex-col justify-between">
        <div>
          <Eyebrow s={s}>When I code · {stats.rangeLabel}</Eyebrow>
          <div style={{ marginTop: s.gap * 0.4, fontSize: s.unit }} className="text-fg-muted">
            peak <span className="font-semibold text-fg">{shortDay(stats.peakDay)} {hourLabel(stats.peakHour)}</span>
            {stats.busiestDay && (
              <> · busiest <span className="font-semibold text-fg">{stats.busiestDay.label}</span></>
            )}
          </div>
        </div>
        <div className="flex flex-1 items-center" style={{ paddingBlock: s.gap }}>
          <HeatGrid cells={stats.heatmap.cells} width={inner} />
        </div>
        <div className="flex" style={{ gap: s.pad * 0.6, flexDirection: horizontal ? "row" : "column" }}>
          <Block title="Time of day" s={s}>
            <MiniBars items={timeBuckets(stats.hourTotals)} {...mini} />
          </Block>
          <Block title="Cadence" s={s}>
            <MiniBars
              items={[
                { label: "Weekdays", value: stats.weekdayPct, max: 1, valueText: fmtPct(stats.weekdayPct) },
                { label: "Weekends", value: stats.weekendPct, max: 1, valueText: fmtPct(stats.weekendPct) },
              ]}
              {...mini}
            />
          </Block>
        </div>
      </div>
    );
  }

  if (template === "milestone") {
    const m = nextMilestone(stats.totalTokens);
    const celebrating = !!m.achieved;
    const ladder = [
      { label: "1M", value: 1e6 },
      { label: "10M", value: 1e7 },
      { label: "100M", value: 1e8 },
      { label: "1B", value: 1e9 },
      { label: "10B", value: 1e10 },
    ];
    return (
      <div className="flex h-full flex-col justify-between">
        <Eyebrow s={s}>{celebrating ? "Milestone unlocked" : "Next milestone"} · {stats.rangeLabel}</Eyebrow>
        <div className="flex flex-col" style={{ gap: s.gap * 0.5 }}>
          <div style={{ fontSize: s.hero * 0.6, lineHeight: 1 }}>{celebrating ? "🎉" : "🚀"}</div>
          <div style={{ fontSize: s.hero * 0.56, lineHeight: 1, letterSpacing: "-0.03em" }} className="font-semibold text-fg tabular">
            {celebrating ? `${m.achieved!.label} tokens` : `${fmtCompact(stats.totalTokens)} tokens`}
          </div>
          <div style={{ fontSize: s.unit * 0.85 }} className="text-fg-muted">
            {celebrating ? (
              <>crossed <span className="font-semibold text-accent">{m.achieved!.label}</span> total tokens · {fmtUSD(stats.cost)} spent</>
            ) : (
              "on the way up"
            )}
          </div>
        </div>
        <div className="flex flex-wrap" style={{ gap: s.gap * 0.45 }}>
          {ladder.map((t) => {
            const reached = stats.totalTokens >= t.value;
            return (
              <span
                key={t.label}
                style={{ fontSize: s.tileLabel + 2, padding: `${s.gap * 0.25}px ${s.gap * 0.5}px`, borderRadius: 999 }}
                className={
                  "inline-flex items-center gap-1.5 border font-mono " +
                  (reached ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-fg-muted")
                }
              >
                {reached ? "✓" : "○"} {t.label}
              </span>
            );
          })}
        </div>
        {m.next && (
          <div style={{ display: "flex", flexDirection: "column", gap: s.gap * 0.4 }}>
            <div className="flex items-center justify-between" style={{ fontSize: s.tileLabel + 1 }}>
              <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">{fmtCompact(stats.totalTokens)}</span>
              <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">{fmtPct(m.pctToNext)} → {m.next.label}</span>
            </div>
            <ShareBar pct={m.pctToNext} color="hsl(var(--accent))" height={Math.max(8, s.spark * 0.16)} />
          </div>
        )}
      </div>
    );
  }

  // wrapped (default) — the dense hero recap
  const persona = derivePersona(stats);
  const toolBars: MiniBarItem[] = stats.tools.map((t) => ({ label: t.name, value: t.count, valueText: fmtNum(t.count) }));
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <Eyebrow s={s}>AI Wrapped · {stats.rangeLabel}</Eyebrow>
        <div style={{ marginTop: s.gap * 0.6 }} className="flex flex-wrap items-center">
          <Chip s={s}>
            <span style={{ fontSize: s.tileLabel + 4 }}>{persona.emoji}</span>
            <span className="text-fg">{persona.title}</span>
          </Chip>
        </div>
        <div style={{ marginTop: s.gap * 0.8 }}>
          <Hero value={fmtCompact(stats.totalTokens)} unit="tokens" s={s} />
        </div>
        {stats.topModel && (
          <div style={{ fontSize: s.unit * 0.8, marginTop: s.gap * 0.4 }} className="text-fg-muted">
            mostly <span className="font-semibold text-fg">{stats.topModel.label}</span> · {fmtPct(stats.topModel.pct)} of tokens
            {stats.topProject && (
              <> · top project <span className="font-semibold text-fg">{stats.topProject.name}</span></>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4" style={{ gap: s.pad * 0.4 }}>
        <Tile label="Est. cost" value={fmtUSD(stats.cost)} s={s} />
        <Tile label="Messages" value={fmtNum(stats.messages)} s={s} />
        <Tile label="Sessions" value={fmtNum(stats.sessions)} s={s} />
        <Tile label="Cache hit" value={fmtPct(stats.cacheHitRate)} s={s} />
      </div>

      <div className="flex" style={{ gap: s.pad * 0.6, flexDirection: horizontal ? "row" : "column" }}>
        <Block title="When you code" s={s}>
          <Spark data={stats.spark} width={horizontal ? inner * 0.42 : inner} height={s.spark} />
          <div style={{ fontSize: s.tileLabel }} className="font-mono uppercase tracking-[0.14em] text-fg-muted">
            peak {shortDay(stats.peakDay)} {hourLabel(stats.peakHour)} · wk {fmtPct(stats.weekdayPct)} / wknd {fmtPct(stats.weekendPct)}
          </div>
        </Block>
        <Block title="Tools & agents" s={s}>
          {toolBars.length ? (
            <MiniBars items={toolBars} {...mini} />
          ) : (
            <div style={{ fontSize: s.tileLabel }} className="text-fg-muted">no tool calls</div>
          )}
          <div style={{ fontSize: s.tileLabel }} className="font-mono uppercase tracking-[0.14em] text-fg-muted">
            subagents {fmtPct(stats.subagentPct)}
            {stats.webSearch ? ` · ${fmtNum(stats.webSearch)} searches` : ""}
          </div>
        </Block>
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
  const spine = Math.round(s.pad * 0.12);
  const inner = w - s.pad * 2 - spine;
  const grid = Math.round(s.pad * 0.78);
  const cm = Math.round(s.foot * 1.1); // crop-mark size
  const meta = TEMPLATE_META[template];

  return (
    <div
      ref={ref}
      data-theme={theme}
      style={{ width: w, height: h }}
      className="relative isolate overflow-hidden bg-bg font-sans text-fg"
    >
      {/* faint engineering grid for depth/texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--fg) / 0.035) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--fg) / 0.035) 1px, transparent 1px)",
          backgroundSize: `${grid}px ${grid}px`,
          opacity: 0.7,
        }}
      />
      {/* accent atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(${w * 0.9}px ${h * 0.8}px at 86% -14%, hsl(var(--accent) / 0.22), transparent 56%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(${w}px ${h}px at 6% 120%, hsl(var(--accent) / 0.08), transparent 52%)` }}
      />
      {/* ghosted issue numeral */}
      <div
        aria-hidden
        className="pointer-events-none absolute font-semibold leading-none tabular"
        style={{ bottom: -h * 0.16, right: w * 0.02, fontSize: h * 0.62, color: "hsl(var(--fg) / 0.035)", letterSpacing: "-0.05em" }}
      >
        {meta.no}
      </div>
      {/* accent spine */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0"
        style={{ width: spine, background: "linear-gradient(180deg, hsl(var(--accent)), hsl(var(--accent-soft)))" }}
      />
      {/* crop / registration marks */}
      {(() => {
        const mark = "1.5px solid hsl(var(--fg) / 0.22)";
        const base = { width: cm, height: cm } as const;
        return (
          <>
            <div aria-hidden className="pointer-events-none absolute" style={{ ...base, top: cm, left: spine + cm, borderTop: mark, borderLeft: mark }} />
            <div aria-hidden className="pointer-events-none absolute" style={{ ...base, top: cm, right: cm, borderTop: mark, borderRight: mark }} />
            <div aria-hidden className="pointer-events-none absolute" style={{ ...base, bottom: cm, left: spine + cm, borderBottom: mark, borderLeft: mark }} />
            <div aria-hidden className="pointer-events-none absolute" style={{ ...base, bottom: cm, right: cm, borderBottom: mark, borderRight: mark }} />
          </>
        );
      })()}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 0 1px hsl(var(--border))" }} />

      <div className="relative flex h-full flex-col" style={{ paddingTop: s.pad, paddingBottom: s.pad, paddingRight: s.pad, paddingLeft: s.pad + spine }}>
        <div className="flex-1 overflow-hidden">{body(stats, template, ratio, s, inner)}</div>

        {/* colophon footer */}
        <div style={{ marginTop: s.gap, borderTop: "1px solid hsl(var(--border))", paddingTop: s.gap * 0.7 }} className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: s.foot * 0.7 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: s.foot * 2,
                height: s.foot * 2,
                borderRadius: s.foot * 0.55,
                background: "linear-gradient(135deg, hsl(var(--accent) / 0.45), hsl(var(--accent) / 0.05))",
                boxShadow: "inset 0 0 0 1px hsl(var(--accent) / 0.35)",
              }}
            >
              <Activity style={{ width: s.foot * 1.1, height: s.foot * 1.1 }} className="text-accent" />
            </div>
            <div style={{ fontSize: s.foot * 0.82, letterSpacing: "0.14em" }} className="font-mono uppercase text-fg-muted">
              CLI Usage Analytics <span className="text-fg-muted/50">·</span> local · on-device
            </div>
          </div>
          <div style={{ fontSize: s.foot * 0.82, letterSpacing: "0.14em" }} className="font-mono uppercase text-fg-muted">
            {handle ? `${handle} · ` : ""}Nº {meta.no}
          </div>
        </div>
      </div>
    </div>
  );
});
