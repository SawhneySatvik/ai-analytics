"use client";

// MagicUI border-beam — adapted to Tailwind v3 + framer-motion (the registry
// ships v4 `mask-*`/`bg-linear-*` utilities and imports `motion/react`). The
// border-ring mask is applied via inline style for cross-browser reliability,
// and the beam defaults to the theme accent so it reads on all six themes.
// Renders nothing under reduced-motion.

import { motion, type MotionStyle, type Transition } from "framer-motion";

import { usePrefersReducedMotion } from "@/components/ui";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  className?: string;
  style?: React.CSSProperties;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
}

export function BorderBeam({
  className,
  size = 60,
  delay = 0,
  duration = 7,
  colorFrom = "hsl(var(--accent))",
  colorTo = "hsl(var(--accent) / 0)",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1.5,
}: BorderBeamProps) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent"
      style={{
        borderWidth: `${borderWidth}px`,
        maskImage: "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
        WebkitMaskImage: "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
        maskClip: "padding-box, border-box",
        WebkitMaskClip: "padding-box, border-box",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <motion.div
        className={cn(
          "absolute aspect-square bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent",
          className,
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
}
