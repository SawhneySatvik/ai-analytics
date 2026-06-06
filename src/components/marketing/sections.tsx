"use client";

// Static marketing sections: feature grid, "three ways to run it", privacy band,
// and footer. Copy is drawn from the product READMEs; links from src/lib/links.

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
import { AUTHOR, GITHUB_REPO, NPM_PACKAGE, PORTFOLIO } from "@/lib/links";
import { Reveal, StaggerGroup, motion } from "./motion";
import { fadeUp } from "./motion";

// ── features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Coins, title: "Tokens & cost", body: "Every token in and out, cache included, with estimated spend per model." },
  { icon: Boxes, title: "Model breakdown", body: "Which model did the work — usage, share, and cost, side by side." },
  { icon: FolderGit2, title: "Projects & sessions", body: "Ranked by usage; drill into any session's timeline, tools and models." },
  { icon: Layers, title: "Tools & subagents", body: "Top tool calls, web search/fetch, and main-vs-subagent token split." },
  { icon: Database, title: "Cache efficiency", body: "Hit-rate and the dollars caching actually saved you over time." },
  { icon: Activity, title: "Activity rhythm", body: "An hour×weekday heatmap of when you actually ship code." },
];

function Features() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-20 sm:py-28">
      <Reveal className="mb-10 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Everything in one place</div>
        <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          Your local usage, made legible
        </h2>
      </Reveal>
      <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elev/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-pop"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "hsl(var(--accent) / 0.25)" }}
              />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 text-accent ring-1 ring-inset ring-accent/20">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="relative mt-3.5 text-sm font-semibold text-fg">{f.title}</h3>
              <p className="relative mt-1 text-[13px] leading-relaxed text-fg-muted">{f.body}</p>
            </motion.div>
          );
        })}
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
    body: "Open it in any Chromium browser, point it at your folder. Files are read on-device — nothing is uploaded.",
    command: null as string | null,
    href: GITHUB_REPO,
    hrefLabel: "How it works",
  },
  {
    icon: Layers,
    name: "Local dashboard",
    tag: "full SSR",
    body: "Clone the repo and run the Next.js app against your real ~/.claude & ~/.codex for the complete dashboard.",
    command: "npm run dev",
    href: GITHUB_REPO,
    hrefLabel: "Repo",
  },
  {
    icon: TerminalSquare,
    name: "Terminal (agentmon)",
    tag: "npm",
    body: "A fast, keyboard-driven TUI right in your terminal — no install needed. Mouse + charts included.",
    command: "npx agentmon",
    href: NPM_PACKAGE,
    hrefLabel: "npm",
  },
];

function RunTargets() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:pb-28">
      <Reveal className="mb-10 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Run it your way</div>
        <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Three ways to run it</h2>
      </Reveal>
      <StaggerGroup className="grid gap-3 md:grid-cols-3">
        {TARGETS.map((t) => {
          const Icon = t.icon;
          return (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="flex flex-col rounded-2xl border border-border bg-bg-elev/40 p-5"
            >
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
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              background:
                "radial-gradient(50% 60% at 50% 0%, hsl(var(--accent) / 0.12), transparent 70%)",
            }}
          />
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
      <Footer />
    </>
  );
}
