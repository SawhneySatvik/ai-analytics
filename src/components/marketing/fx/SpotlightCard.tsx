"use client";

// A card surface that tracks the pointer with a soft accent radial glow — the
// 21st.dev "spotlight card" pattern, built from scratch on this app's tokens so
// it reads on all six themes. Pure CSS vars updated on mousemove (no re-render);
// the glow is suppressed automatically under the global reduced-motion rule.

import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className,
  glow = 0.14,
}: {
  children: ReactNode;
  className?: string;
  /** Peak opacity of the spotlight glow (0–1). */
  glow?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn(
        "group/spot relative overflow-hidden rounded-2xl border border-border bg-bg-elev/40 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-card-hover",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(280px circle at var(--mx, 50%) var(--my, 0%), hsl(var(--accent) / ${glow}), transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
