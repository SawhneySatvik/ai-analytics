"use client";

// The hero centerpiece: the real WebPreview dashboard, presented on a 3D-tilted
// plane that eases to flat as the hero scrolls past ("rises to meet you"). Only
// transforms animate, so the live Recharts inside never re-render. Falls back to
// a flat, static frame under reduced-motion.

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { usePrefersReducedMotion } from "@/components/ui";
import { WebPreview } from "@/components/marketing/WebPreview";
import { BorderBeam } from "@/components/marketing/fx/border-beam";

export function HeroMock() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.95, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -36]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-4xl [perspective:1600px]">
      {/* accent glow behind the frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[2.5rem] opacity-70 blur-3xl"
        style={{ background: "radial-gradient(55% 50% at 50% 0%, hsl(var(--accent) / 0.2), transparent 70%)" }}
      />
      <motion.div
        className="origin-top will-change-transform [transform-style:preserve-3d]"
        style={reduce ? undefined : { rotateX, scale, y }}
      >
        <div className="sheen-top relative overflow-hidden rounded-2xl">
          <BorderBeam size={70} duration={9} />
          <WebPreview />
        </div>
      </motion.div>
    </div>
  );
}
