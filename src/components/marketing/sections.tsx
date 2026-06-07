"use client";

// Marketing sections: an animated stat band + model marquee, a bento feature
// grid with live charts, "three ways to run it", a privacy band, a closing CTA,
// and the footer. Copy is drawn from the product READMEs; links from src/lib.

import { useState } from "react";
import {
  Activity,
  Award,
  Boxes,
  Check,
  Copy,
  Database,
  FolderGit2,
  Github,
  Globe,
  Layers,
  ShieldCheck,
  TerminalSquare,
  Coins,
} from "lucide-react";

import { Attribution } from "@/components/Attribution";
import { Logo } from "@/components/Logo";
import { AnimatedNumber } from "@/components/ui";
import { BarList, DonutChart, Sparkline, StackedAreaChart } from "@/components/charts";
import { dailyModelSeries, flattenDaily, fmtDayLabel } from "@/lib/chartData";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@/lib/format";
import { useDemoSummary, totalTokens } from "@/lib/browser/demoPreview";
import { AUTHOR, GITHUB_REPO, NPM_PACKAGE, PORTFOLIO } from "@/lib/links";
import { cn } from "@/lib/utils";
import { Reveal, StaggerGroup, motion, fadeUp } from "./motion";
import { Marquee } from "./fx/marquee";
import { BorderBeam } from "./fx/border-beam";
import { SpotlightCard } from "./fx/SpotlightCard";
import { Aurora } from "./fx/Aurora";

// ── stat band + model marquee ──────────────────────────────────────────────────

function StatItem({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center">
      <div className="font-sans text-3xl font-semibold tracking-tightest tabular text-fg sm:text-4xl">{children}</div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-muted">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-fg-muted/70">{sub}</div>}
    </div>
  );
}

function Pill({ label, color }: { label: string; color?: string }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-bg-elev/60 px-3.5 py-1.5 text-sm text-fg-muted">
      <span className="h-2 w-2 rounded-full" style={{ background: color ?? "hsl(var(--accent))" }} />
      {label}
    </span>
  );
}

export function StatBand() {
  const s = useDemoSummary();
  const [inView, setInView] = useState(false);
  const pills: { label: string; color?: string }[] = [
    { label: "Claude Code" },
    { label: "Codex" },
    { label: "OpenCode" },
    ...(s ? s.models.slice(0, 8).map((m) => ({ label: m.label, color: m.color })) : []),
  ];

  return (
    <section className="border-y border-border/60 bg-bg-elev/20">
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
        <div className="mb-7 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-fg-muted">
          Numbers from the live demo dataset
        </div>
        <motion.div
          onViewportEnter={() => setInView(true)}
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-2 gap-6 sm:grid-cols-4"
        >
          <StatItem label="Tokens analyzed">
            {inView && s ? <AnimatedNumber value={s.summary.totalTokens} format={fmtCompact} /> : "—"}
          </StatItem>
          <StatItem label="Sessions">
            {inView && s ? <AnimatedNumber value={s.summary.sessionCount} format={fmtNum} /> : "—"}
          </StatItem>
          <StatItem label="Models tracked">
            {inView && s ? <AnimatedNumber value={s.models.length} format={(n) => String(Math.round(n))} /> : "—"}
          </StatItem>
          <StatItem label="Data uploaded" sub="100% on-device">
            <span className="text-accent">0 b</span>
          </StatItem>
        </motion.div>

        <div className="mt-9">
          <Marquee
            pauseOnHover
            className="[--duration:38s] [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]"
          >
            {pills.map((p, i) => (
              <Pill key={i} {...p} />
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}

// ── features (bento) ───────────────────────────────────────────────────────────

function FeatureTile({
  icon: Icon,
  name,
  body,
  span,
  children,
}: {
  icon: React.ElementType;
  name: string;
  body: string;
  span?: string;
  children?: React.ReactNode;
}) {
  return (
    <SpotlightCard className={cn("flex flex-col p-5", span)}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent/25 to-accent/5 text-accent ring-1 ring-inset ring-accent/20">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-fg">{name}</h3>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{body}</p>
      {children && <div className="relative mt-3 flex-1">{children}</div>}
    </SpotlightCard>
  );
}

function Features() {
  const s = useDemoSummary();
  const area = s ? dailyModelSeries(s.daily, s.models.slice(0, 5)) : null;
  const dailyRows = s ? flattenDaily(s.daily) : [];

  return (
    <section id="features" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-20 sm:py-28">
      <Reveal className="mb-10 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Everything in one place</div>
        <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          Your local usage, made legible
        </h2>
      </Reveal>

      <StaggerGroup className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <motion.div variants={fadeUp} className="md:col-span-2">
          <FeatureTile
            icon={Coins}
            name="Tokens & cost"
            body="Every token in and out, cache included, with estimated spend per model — charted over time."
            span="h-full"
          >
            {area && (
              <StackedAreaChart data={area.data} xKey="date" series={area.series} height={150} xFormat={fmtDayLabel} />
            )}
          </FeatureTile>
        </motion.div>

        <motion.div variants={fadeUp}>
          <FeatureTile
            icon={Database}
            name="Cache efficiency"
            body="Hit-rate and the dollars caching actually saved you over time."
            span="h-full"
          >
            {s && (
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-sans text-3xl font-semibold tracking-tightest tabular text-accent">
                    {fmtPct(s.summary.cacheHitRate)}
                  </span>
                  <span className="text-[11px] text-fg-muted">hit · saves ~{fmtUSD(s.summary.cacheSavings)}</span>
                </div>
                <Sparkline data={dailyRows.map((r) => r.total)} height={64} />
              </div>
            )}
          </FeatureTile>
        </motion.div>

        <motion.div variants={fadeUp}>
          <FeatureTile
            icon={Boxes}
            name="Model breakdown"
            body="Which model did the work — usage, share and cost, side by side."
            span="h-full"
          >
            {s && (
              <DonutChart
                data={s.models.slice(0, 6).map((m) => ({ name: m.label, value: totalTokens(m.usage), color: m.color }))}
                height={150}
                centerLabel="tokens"
                centerValue={fmtCompact(s.summary.totalTokens)}
              />
            )}
          </FeatureTile>
        </motion.div>

        <motion.div variants={fadeUp} className="md:col-span-2">
          <FeatureTile
            icon={FolderGit2}
            name="Projects & sessions"
            body="Ranked by usage; drill into any session's timeline, tools and models."
            span="h-full"
          >
            {s && (
              <BarList
                items={s.projects.slice(0, 4).map((p) => ({
                  label: p.projectName,
                  value: totalTokens(p.usage),
                  sub: `${p.sessionCount} sessions · ${fmtUSD(p.cost)}`,
                }))}
              />
            )}
          </FeatureTile>
        </motion.div>

        <motion.div variants={fadeUp} className="md:col-span-2">
          <FeatureTile
            icon={Layers}
            name="Tools & subagents"
            body="Top tool calls, web search/fetch, and the main-vs-subagent token split."
            span="h-full"
          >
            {s && (
              <BarList
                items={s.tools.tools.slice(0, 4).map((t) => ({ label: t.name, value: t.count }))}
                valueFormat={fmtNum}
              />
            )}
          </FeatureTile>
        </motion.div>

        <motion.div variants={fadeUp}>
          <FeatureTile
            icon={Activity}
            name="Activity rhythm"
            body="An hour × weekday heatmap of when you actually ship code — explore it live in the showcase below."
            span="h-full"
          />
        </motion.div>
      </StaggerGroup>
    </section>
  );
}

// ── run targets ──────────────────────────────────────────────────────────────

function CopyLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2 text-left font-mono text-[12px] text-fg transition-colors hover:border-accent/50"
    >
      <span className="truncate">
        <span className="text-fg-muted/60 select-none">$ </span>
        {command}
      </span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-fg-muted transition-colors group-hover:text-accent" />
      )}
    </button>
  );
}

const TARGETS = [
  {
    icon: Globe,
    name: "Hosted web",
    tag: "you're here",
    highlight: true,
    body: "Open it in any Chromium browser, point it at your folder. Files are read on-device — nothing is uploaded.",
    command: null as string | null,
    href: GITHUB_REPO,
    hrefLabel: "How it works",
  },
  {
    icon: Layers,
    name: "Local dashboard",
    tag: "full SSR",
    highlight: false,
    body: "Clone the repo and run the Next.js app against your real ~/.claude & ~/.codex for the complete dashboard.",
    command: "npm run dev",
    href: GITHUB_REPO,
    hrefLabel: "Repo",
  },
  {
    icon: TerminalSquare,
    name: "Terminal (agentmon)",
    tag: "npm",
    highlight: false,
    body: "A fast, keyboard-driven TUI right in your terminal — no install needed. Mouse + charts included.",
    command: "npx agentmon",
    href: NPM_PACKAGE,
    hrefLabel: "npm",
  },
];

function RunTargets() {
  return (
    <section id="run" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pb-20 sm:pb-28">
      <Reveal className="mb-10 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Run it your way</div>
        <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Three ways to run it</h2>
      </Reveal>
      <StaggerGroup className="grid gap-3 md:grid-cols-3">
        {TARGETS.map((t) => {
          const Icon = t.icon;
          return (
            <motion.div key={t.name} variants={fadeUp} className="h-full">
              <SpotlightCard className={cn("flex h-full flex-col p-5", t.highlight && "ring-1 ring-inset ring-accent/30")}>
                {t.highlight && <BorderBeam size={60} duration={8} />}
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 text-accent ring-1 ring-inset ring-accent/20">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-muted">{t.tag}</span>
                </div>
                <h3 className="mt-3.5 text-sm font-semibold text-fg">{t.name}</h3>
                <p className="mt-1 flex-1 text-[13px] leading-relaxed text-fg-muted">{t.body}</p>
                <div className="mt-4">
                  {t.command ? (
                    <CopyLine command={t.command} />
                  ) : (
                    <a
                      href={t.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-opacity hover:opacity-80"
                    >
                      {t.hrefLabel} →
                    </a>
                  )}
                </div>
              </SpotlightCard>
            </motion.div>
          );
        })}
      </StaggerGroup>
    </section>
  );
}

// ── privacy band ─────────────────────────────────────────────────────────────

function PrivacyBand() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:pb-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-bg-elev/40 p-8 text-center sm:p-12">
          <Aurora className="opacity-60" />
          <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 to-accent/5 text-accent ring-1 ring-inset ring-accent/25">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="relative mt-4 text-balance text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            100% on-device. Always.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
            Every way of running agentmon reads your transcripts on your machine and aggregates them locally. There is no
            upload, no account, and no analytics back-end — your data never leaves your device.
          </p>
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] text-fg-muted">
            {["~/.claude", "~/.codex", "opencode.db"].map((p) => (
              <span key={p} className="rounded-md border border-border bg-bg px-2.5 py-1">
                {p}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ── final cta ────────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-bg-elev/50 p-10 text-center shadow-card sm:p-16">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(70% 80% at 50% 0%, hsl(var(--accent) / 0.16), transparent 70%)" }}
          />
          <h2 className="relative text-balance text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Point it at your folder. See everything.
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed text-fg-muted">
            No account, no upload, no setup — run <span className="font-mono text-fg">npx agentmon</span>, or connect your
            data right here in the browser.
          </p>
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#top"
              className="shine inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-pop transition-all hover:opacity-90 active:scale-[0.99]"
            >
              Connect your folder →
            </a>
            <a
              href={NPM_PACKAGE}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-elev px-5 py-3 text-sm font-medium text-fg transition-colors hover:border-accent/50"
            >
              <Award className="h-4 w-4" /> npm
            </a>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-elev px-5 py-3 text-sm font-medium text-fg transition-colors hover:border-accent/50"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ── footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 py-10 text-center">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 text-accent shadow-card ring-1 ring-inset ring-accent/25">
            <Logo size={18} />
          </span>
          <span className="text-base font-semibold tracking-tight text-fg">agentmon</span>
        </div>
        <Attribution />
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
          <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-fg">
            <Github className="h-3.5 w-3.5" /> GitHub
          </a>
          <a href={NPM_PACKAGE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-fg">
            <Award className="h-3.5 w-3.5" /> npm
          </a>
          <a href={PORTFOLIO} target="_blank" rel="noreferrer" className="transition-colors hover:text-fg">
            {AUTHOR}
          </a>
          <span className="text-fg-muted/50">MIT licensed</span>
        </div>
      </div>
    </footer>
  );
}

export function MarketingSections() {
  return (
    <>
      <Features />
      <RunTargets />
      <PrivacyBand />
      <FinalCta />
      <Footer />
    </>
  );
}
