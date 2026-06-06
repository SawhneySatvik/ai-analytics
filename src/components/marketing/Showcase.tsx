"use client";

// The centerpiece: one segmented control flips between the live web-dashboard
// preview and the live terminal (agentmon) preview, both driven by the same demo
// data. framer-motion handles the active-pill slide and the crossfade.

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Monitor, TerminalSquare } from "lucide-react";

import { WebPreview } from "./WebPreview";
import { TuiPreview } from "./TuiPreview";
import { Reveal } from "./motion";

type Tab = "web" | "tui";

const TABS: { id: Tab; label: string; icon: typeof Monitor }[] = [
  { id: "web", label: "Web dashboard", icon: Monitor },
  { id: "tui", label: "Terminal · agentmon", icon: TerminalSquare },
];

export function Showcase() {
  const [tab, setTab] = useState<Tab>("web");

  return (
    <section className="mx-auto w-full max-w-5xl px-4">
      <Reveal className="mb-6 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Two surfaces, one dataset</div>
        <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          See it the way you work
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          A polished web dashboard or a keyboard-driven terminal — same numbers, rendered live from a demo dataset below.
        </p>
      </Reveal>

      <Reveal delay={0.05} className="mb-5 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg-elev/60 p-1 backdrop-blur">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm"
              >
                {active && (
                  <motion.span
                    layoutId="showcase-pill"
                    className="absolute inset-0 rounded-lg bg-accent/15 ring-1 ring-inset ring-accent/30"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className={"relative h-4 w-4 " + (active ? "text-accent" : "text-fg-muted")} />
                <span className={"relative " + (active ? "text-fg" : "text-fg-muted")}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="relative">
          {/* accent glow behind the frame */}
          <div
            className="pointer-events-none absolute -inset-x-6 -top-6 bottom-0 -z-10 rounded-[2rem] opacity-60 blur-2xl"
            style={{ background: "radial-gradient(60% 50% at 50% 0%, hsl(var(--accent) / 0.18), transparent 70%)" }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab === "web" ? <WebPreview /> : <TuiPreview />}
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>
    </section>
  );
}
