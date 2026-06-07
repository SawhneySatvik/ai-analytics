// MagicUI bento-grid — adapted to Tailwind v3 and this app's tokens. Drops the
// shadcn Button + radix-icon scaffolding (replaced with a plain tokenized link +
// lucide arrow). The `background` slot is a full-bleed layer (e.g. a live chart)
// that sits behind a bottom scrim so the title/description stay legible.

import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon: React.ElementType;
  description: string;
  href?: string;
  cta?: string;
}

export function BentoGrid({ children, className, ...props }: BentoGridProps) {
  return (
    <div className={cn("grid w-full auto-rows-[13rem] grid-cols-3 gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function BentoCard({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) {
  return (
    <div
      className={cn(
        "group relative col-span-3 flex flex-col justify-end overflow-hidden rounded-2xl border border-border bg-bg-elev/40 shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-card-hover",
        className,
      )}
      {...props}
    >
      {/* full-bleed visual (chart / pattern) */}
      {background && <div className="pointer-events-none absolute inset-0">{background}</div>}

      {/* readability scrim so copy stays legible over the visual */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg-elev via-bg-elev/85 to-transparent" />

      {/* copy */}
      <div className="relative z-10 flex transform-gpu flex-col gap-1 p-5 transition-transform duration-300 group-hover:-translate-y-9">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 text-accent ring-1 ring-inset ring-accent/20">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="mt-2.5 text-sm font-semibold text-fg">{name}</h3>
        <p className="max-w-lg text-[13px] leading-relaxed text-fg-muted">{description}</p>
      </div>

      {/* hover CTA */}
      {href && cta && (
        <div className="absolute bottom-0 z-10 flex w-full translate-y-3 transform-gpu items-center p-5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            {cta} <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* faint accent wash on hover */}
      <div className="pointer-events-none absolute inset-0 transform-gpu transition-colors duration-300 group-hover:bg-accent/[0.03]" />
    </div>
  );
}
