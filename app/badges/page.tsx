"use client";

import { useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, PageSkeleton, PanelTitle } from "@/components/ui";
import type { SummaryResponse } from "@/lib/dto";
import { deriveShareStats } from "@/lib/share";
import { computeBadges, derivePersona, nextMilestone, type Badge } from "@/lib/badges";
import { fmtCompact, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

function Track({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-bg-elev", className)}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(pct * 100)}%` }} />
    </div>
  );
}

function BadgeTile({ b }: { b: Badge }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-4 transition-colors",
        b.earned
          ? "border-accent/40 bg-gradient-to-br from-accent/[0.1] to-accent/[0.02] ring-1 ring-inset ring-accent/15"
          : "border-border bg-bg/40",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("text-2xl leading-none", !b.earned && "opacity-40 grayscale")}>{b.emoji}</span>
        <div className="min-w-0">
          <div className={cn("truncate text-sm font-semibold", b.earned ? "text-fg" : "text-fg-muted")}>{b.label}</div>
          <div className="truncate text-[11px] text-fg-muted">{b.desc}</div>
        </div>
      </div>
      {b.earned ? (
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">unlocked</div>
      ) : (
        <div className="space-y-1.5">
          <Track pct={b.progress} />
          <div className="flex items-center justify-between text-[10px] text-fg-muted">
            <span>{b.hint}</span>
            <span className="tabular">{fmtPct(b.progress)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BadgesPage() {
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");
  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <PageSkeleton kpis={4} />;

  const stats = deriveShareStats(data);
  const persona = derivePersona(stats);
  const badges = computeBadges(stats);
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  const ms = nextMilestone(stats.totalTokens);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Badges"
        description="Your coding persona, achievements, and milestones — derived entirely from your own usage."
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* persona */}
        <Card className="relative overflow-hidden p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="flex items-start gap-4">
            <div className="text-5xl leading-none">{persona.emoji}</div>
            <div className="min-w-0">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">your persona</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{persona.title}</h2>
              <p className="mt-1.5 max-w-md text-sm text-fg-muted">{persona.blurb}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {persona.traits.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border bg-bg/50 px-2.5 py-1 text-[11px] font-medium text-fg"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* milestone */}
        <Card className="flex flex-col justify-between p-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">milestone</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-fg tabular">
              {fmtCompact(stats.totalTokens)} <span className="text-base font-medium text-fg-muted">tokens</span>
            </div>
            {ms.achieved && (
              <div className="mt-1 text-sm text-fg-muted">
                crossed <span className="font-semibold text-accent">{ms.achieved.label}</span> 🎉
              </div>
            )}
          </div>
          {ms.next ? (
            <div className="mt-4 space-y-1.5">
              <Track pct={ms.pctToNext} />
              <div className="flex items-center justify-between text-[11px] text-fg-muted">
                <span className="tabular">{fmtPct(ms.pctToNext)}</span>
                <span>to {ms.next.label}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm font-semibold text-accent">topped the charts 🏆</div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <PanelTitle title="Earned" hint={`${earned.length} of ${badges.length}`} />
        {earned.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {earned.map((b) => (
              <BadgeTile key={b.id} b={b} />
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-fg-muted">No badges yet — keep coding and they&apos;ll unlock.</p>
        )}
      </Card>

      {locked.length > 0 && (
        <Card className="p-5">
          <PanelTitle title="In progress" hint={`${locked.length} to unlock`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {locked.map((b) => (
              <BadgeTile key={b.id} b={b} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
