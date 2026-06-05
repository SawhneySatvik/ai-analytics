import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-bg-elev", className)}
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
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
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
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {icon && <span className="text-accent">{icon}</span>}
      </div>
      <div
        className={cn(
          "mt-2 font-sans text-3xl font-semibold tracking-tight tabular",
          accent ? "text-accent" : "text-fg",
        )}
      >
        {value}
      </div>
      {sub != null && <div className="mt-1 text-xs text-fg-muted tabular">{sub}</div>}
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
    <div className="rounded-xl border border-border bg-bg/40 p-4">
      <Label>{label}</Label>
      <div className="mt-1.5 font-sans text-xl font-semibold tracking-tight text-fg tabular">
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
        className="h-full rounded-full bg-accent transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-elev/40 px-6 py-16 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="mt-1 max-w-md text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl border border-border bg-fg/5", className)} />;
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 font-mono text-xs text-amber-500">
      {message}
    </div>
  );
}
