// MagicUI marquee — adapted to Tailwind v3 (arbitrary `[var(--gap)]` props in
// place of v4's `gap-(--gap)`; keyframes live in tailwind.config.ts).

import { type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
  /** Reverse the scroll direction. */
  reverse?: boolean;
  /** Pause the animation while hovered. */
  pauseOnHover?: boolean;
  children: React.ReactNode;
  /** Scroll vertically instead of horizontally. */
  vertical?: boolean;
  /** How many times to repeat the content for a seamless loop. */
  repeat?: number;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex gap-[var(--gap)] overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
        vertical ? "flex-col" : "flex-row",
        className,
      )}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn("flex shrink-0 justify-around gap-[var(--gap)]", {
              "animate-marquee flex-row": !vertical,
              "animate-marquee-vertical flex-col": vertical,
              "group-hover:[animation-play-state:paused]": pauseOnHover,
              "[animation-direction:reverse]": reverse,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  );
}
