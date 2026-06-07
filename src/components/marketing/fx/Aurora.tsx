"use client";

// A calm accent-mesh backdrop: two or three large, low-opacity accent blobs that
// drift slowly. Token-driven (uses --accent) so it stays tasteful across all six
// themes, including the light ones. Holds still under reduced-motion.

import { motion } from "framer-motion";

import { usePrefersReducedMotion } from "@/components/ui";
import { cn } from "@/lib/utils";

const BLOBS = [
  { className: "left-[8%] top-[2%] h-[26rem] w-[26rem]", opacity: 0.14, drift: { x: [0, 28, 0], y: [0, -18, 0] }, dur: 18 },
  { className: "right-[6%] top-[18%] h-[22rem] w-[22rem]", opacity: 0.1, drift: { x: [0, -24, 0], y: [0, 22, 0] }, dur: 22 },
  { className: "left-[38%] top-[40%] h-[28rem] w-[28rem]", opacity: 0.08, drift: { x: [0, 18, 0], y: [0, 16, 0] }, dur: 26 },
];

export function Aurora({ className }: { className?: string }) {
  const reduce = usePrefersReducedMotion();
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={cn("absolute rounded-full blur-3xl", b.className)}
          style={{ background: `hsl(var(--accent) / ${b.opacity})` }}
          animate={reduce ? undefined : b.drift}
          transition={reduce ? undefined : { duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
