"use client";

// The hosted (static-build) entry screen — a full marketing landing page that
// doubles as the data-connect gate. Un-connected visitors get the pitch + live
// previews + the connect CTA; once data is connected the provider swaps this for
// the dashboard. (Local SSR never renders this — it goes straight to the app.)

import { ArrowDown, Loader2, Star } from "lucide-react";
import { MotionConfig } from "framer-motion";

import { useSnapshot } from "@/components/snapshot-provider";
import { Logo } from "@/components/Logo";
import { ThemeMenu } from "@/components/ThemeMenu";
import { ConnectCard } from "@/components/marketing/ConnectCard";
import { Showcase } from "@/components/marketing/Showcase";
import { MarketingSections } from "@/components/marketing/sections";
import { motion, fadeUp, stagger } from "@/components/marketing/motion";
import { GITHUB_REPO, STAR_TEXT } from "@/lib/links";

function ProgressView() {
  const { status, progress } = useSnapshot();
  const label = status === "restoring" ? "Reconnecting to your folder…" : "Reading your usage on-device…";
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-accent" />
        <div className="text-sm font-medium text-fg">{label}</div>
        {progress && progress.total > 0 && (
          <div className="space-y-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elev">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="font-mono text-[11px] text-fg-muted">
              {progress.done.toLocaleString()} / {progress.total.toLocaleString()} files
              {progress.phase === "finalizing" ? " · aggregating…" : ""}
            </div>
          </div>
        )}
        {progress?.label && <div className="truncate font-mono text-[10px] text-fg-muted/70">{progress.label}</div>}
      </div>
    </div>
  );
}

function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* blueprint grid, faded toward the bottom */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--fg) / 0.035) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--fg) / 0.035) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          maskImage: "radial-gradient(120% 80% at 50% 0%, #000 35%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(120% 80% at 50% 0%, #000 35%, transparent 80%)",
        }}
      />
      {/* accent atmosphere */}
      <div
        className="absolute inset-x-0 top-0 h-[60vh]"
        style={{ background: "radial-gradient(60% 50% at 50% -5%, hsl(var(--accent) / 0.16), transparent 70%)" }}
      />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 text-accent shadow-card ring-1 ring-inset ring-accent/25">
            <Logo size={18} />
          </span>
          <span className="text-base font-semibold tracking-tight text-fg">agentmon</span>
          <span className="hidden rounded-full border border-border bg-bg-elev px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-muted sm:inline">
            local analytics
          </span>
        </a>
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="hidden h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-elev px-2.5 text-xs text-fg-muted transition-all hover:border-accent/50 hover:text-fg active:scale-95 sm:flex"
          >
            <Star className="h-3.5 w-3.5" /> {STAR_TEXT}
          </a>
          <ThemeMenu />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="mx-auto w-full max-w-3xl px-4 pb-10 pt-16 text-center sm:pt-24">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="mb-5 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Claude Code · Codex · OpenCode
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-5xl md:text-6xl"
        >
          Your AI coding usage,
          <br className="hidden sm:block" /> <span className="text-accent">beautifully measured.</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-fg-muted">
          agentmon reads your local Claude Code, Codex &amp; OpenCode transcripts and turns them into tokens, cost,
          models, sessions and rhythm — all on your machine. Nothing is uploaded.
        </motion.p>

        <motion.div variants={fadeUp} className="mx-auto mt-8 max-w-md">
          <ConnectCard />
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-fg-muted"
        >
          <span>· no upload</span>
          <span>· open source</span>
          <span>· npx agentmon</span>
          <a href="#showcase" className="inline-flex items-center gap-1 text-accent transition-opacity hover:opacity-80">
            see it live <ArrowDown className="h-3 w-3" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

export function Landing() {
  const { status } = useSnapshot();
  if (status === "ingesting" || status === "restoring") return <ProgressView />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-x-hidden">
        <Background />
        <TopBar />
        <Hero />
        <div id="showcase" className="scroll-mt-20 pb-20 pt-6 sm:pb-28">
          <Showcase />
        </div>
        <MarketingSections />
      </div>
    </MotionConfig>
  );
}
