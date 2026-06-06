"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

// ── motion helpers ────────────────────────────────────────────────────────────

/** True when the user asked the OS to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const onChange = () => setReduce(m.matches);
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, []);
  return reduce;
}

/** Count-up number. Animates from the previous value (0 on first mount). */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  duration = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const to = Number.isFinite(value) ? value : 0;
    if (reduce) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }
    const from = fromRef.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return <span className={cn("tabular", className)}>{format(display)}</span>;
}

/** Staggered fade-rise entrance for direct children (a grid/flex's items). */
export function Stagger({
  children,
  step = 45,
  start = 0,
}: {
  children: React.ReactNode;
  step?: number;
  start?: number;
}) {
  return (
    <>
      {Children.toArray(children).map((child, i) => {
        if (!isValidElement(child)) return child;
        const el = child as React.ReactElement<{
          className?: string;
          style?: React.CSSProperties;
        }>;
        return cloneElement(el, {
          className: cn(el.props.className, "motion-safe:animate-fade-rise"),
          style: { ...el.props.style, animationDelay: `${start + i * step}ms` },
        });
      })}
    </>
  );
}

// ── surfaces ──────────────────────────────────────────────────────────────────

export function Card({
  className,
  interactive,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-bg-elev shadow-card transition-[transform,box-shadow,border-color] duration-200",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-card-hover",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PanelTitle({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 h-3.5 w-[3px] shrink-0 rounded-full bg-accent/70" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.16em] text-fg-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      {accent && (
        <div
          className="pointer-events-none absolute -right-7 -top-9 h-24 w-24 rounded-full bg-accent/15 blur-2xl"
          aria-hidden
        />
      )}
      <div className="relative flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-inset ring-accent/15">
            {icon}
          </span>
        )}
      </div>
      <div
        className={cn(
          "relative mt-3 font-sans text-3xl font-semibold tracking-tightest tabular",
          accent ? "text-accent" : "text-fg",
        )}
      >
        {value}
      </div>
      {sub != null && <div className="relative mt-1 text-xs text-fg-muted tabular">{sub}</div>}
    </Card>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev px-4 py-3.5 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <Label>{label}</Label>
      <div className="mt-1.5 font-sans text-xl font-semibold tracking-tighter2 text-fg tabular">
        {value}
      </div>
      {sub != null && <div className="mt-0.5 text-[11px] text-fg-muted tabular">{sub}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "success" | "warn" | "muted";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "border-border bg-bg text-fg-muted",
    accent: "border-accent/40 bg-accent/10 text-accent",
    success: "border-success/40 bg-success/10 text-success",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-500",
    muted: "border-border bg-bg-elev text-fg-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-border/50", className)}>
      <div
        className="h-full rounded-full bg-accent transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-elev/40 px-6 py-16 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg-elev text-fg-muted">
        {icon ?? <Info className="h-4 w-4" />}
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="mt-1 max-w-md text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

// ── loading skeletons (match real layout) ─────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl border border-border/60", className)} />;
}

export function SkeletonKpiRow({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[104px]" />
      ))}
    </div>
  );
}

export function PageSkeleton({ kpis = 6 }: { kpis?: number }) {
  return (
    <div className="space-y-5">
      <SkeletonKpiRow count={kpis} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 font-mono text-xs text-amber-500">
      <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
