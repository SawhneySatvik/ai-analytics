"use client";

// The hosted (static-build) entry screen — a full marketing landing page that
// doubles as the data-connect gate. Un-connected visitors get the pitch + live
// previews + the connect CTA; a fresh connect advances to /overview, while a
// returning (restored) visitor stays here and sees the "connected" state.
// (Local SSR never renders this — it goes straight to the dashboard.)

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Star } from "lucide-react";
import { MotionConfig, motion, useScroll, useTransform } from "framer-motion";

import { useSnapshot } from "@/components/snapshot-provider";
import { Logo } from "@/components/Logo";
import { ThemeMenu } from "@/components/ThemeMenu";
import { ConnectCard } from "@/components/marketing/ConnectCard";
import { ProgressView } from "@/components/marketing/ProgressView";
import { Showcase } from "@/components/marketing/Showcase";
import { MarketingSections, StatBand } from "@/components/marketing/sections";
import { HeroMock } from "@/components/marketing/fx/HeroMock";
import { Aurora } from "@/components/marketing/fx/Aurora";
import { fadeUp, stagger } from "@/components/marketing/motion";
import { GITHUB_REPO, STAR_TEXT } from "@/lib/links";

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
      {/* drifting accent mesh, confined to the top of the page */}
      <Aurora className="h-[90vh]" />
      {/* flat accent wash at the very top */}
      <div
        className="absolute inset-x-0 top-0 h-[60vh]"
        style={{ background: "radial-gradient(60% 50% at 50% -5%, hsl(var(--accent) / 0.12), transparent 70%)" }}
      />
    </div>
  );
}

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#showcase", label: "Showcase" },
  { href: "#run", label: "Run it" },
];

function TopBar() {
  const { scrollYProgress } = useScroll();
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
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-elev/70 hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </nav>
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
      {/* scroll-progress hairline */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-transparent via-accent to-accent/40"
        style={{ scaleX: scrollYProgress }}
      />
    </header>
  );
}

function Hero({ onConnect }: { onConnect: () => void }) {
  return (
    <section id="top" className="relative mx-auto w-full max-w-5xl px-4 pb-16 pt-14 sm:pt-20">
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-3xl text-center">
        <motion.div variants={fadeUp} className="mb-5 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-muted backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Claude Code · Codex · OpenCode
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-5xl md:text-6xl"
        >
          Your AI coding usage,
          <br className="hidden sm:block" />{" "}
          <span className="bg-gradient-to-r from-accent via-fg to-accent bg-clip-text text-transparent">
            beautifully measured.
          </span>
        </motion.h1>

        <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-fg-muted">
          agentmon reads your local Claude Code, Codex &amp; OpenCode transcripts and turns them into tokens, cost,
          models, sessions and rhythm — all on your machine. Nothing is uploaded.
        </motion.p>

        <motion.div variants={fadeUp} className="mx-auto mt-8 max-w-md">
          <ConnectCard onConnect={onConnect} />
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

      <motion.div
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mt-14 sm:mt-16"
      >
        <HeroMock />
      </motion.div>
    </section>
  );
}

export function Landing() {
  const { status, snapshot } = useSnapshot();
  const router = useRouter();
  // Only a user-initiated connect (set on the CTA click) advances into the
  // dashboard. A silently restored folder leaves a returning visitor on the
  // landing — they're greeted with the "you're connected" state instead.
  const pendingNav = useRef(false);

  useEffect(() => {
    if (status === "ready" && snapshot && pendingNav.current) {
      pendingNav.current = false;
      router.push("/overview");
    }
    if (status === "error") pendingNav.current = false;
  }, [status, snapshot, router]);

  if (status === "ingesting" || status === "restoring") return <ProgressView />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-x-hidden">
        <Background />
        <TopBar />
        <Hero
          onConnect={() => {
            pendingNav.current = true;
          }}
        />
        <StatBand />
        <div id="showcase" className="scroll-mt-20 py-16 sm:py-24">
          <Showcase />
        </div>
        <MarketingSections />
      </div>
    </MotionConfig>
  );
}
