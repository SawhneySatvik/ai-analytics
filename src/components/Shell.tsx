"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  Database,
  FolderGit2,
  Layers,
  LayoutDashboard,
  MessagesSquare,
  RefreshCw,
  Share2,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { useDashboard } from "./dashboard-context";
import { useSnapshot } from "./snapshot-provider";
import { Attribution } from "./Attribution";
import { FilterBar } from "./FilterBar";
import { ThemeMenu } from "./ThemeMenu";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/sources", label: "Tools", icon: Layers },
  { href: "/models", label: "Models", icon: Boxes },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/sessions", label: "Sessions", icon: MessagesSquare },
  { href: "/tools", label: "Tool Calls", icon: Wrench },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/cache", label: "Cache", icon: Database },
  { href: "/share", label: "Share", icon: Share2 },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Best-matching nav label for the current path (for the header title). */
function activeLabel(pathname: string): string {
  const match = [...NAV]
    .filter((n) => isActive(pathname, n.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Overview";
}

function RefreshButton() {
  const { refresh, refreshing, meta } = useDashboard();
  return (
    <div className="flex items-center gap-3">
      {meta?.builtAt && (
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted sm:inline">
          ingested {relativeTime(meta.builtAt)}
        </span>
      )}
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={refreshing}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-elev px-2.5 text-xs text-fg transition-all hover:border-accent/50 active:scale-95 disabled:opacity-60"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        {refreshing ? "reading…" : "refresh"}
      </button>
    </div>
  );
}

/** Hosted-build only: shows the active data source with a "change" action. */
function DataSourceControl() {
  const snap = useSnapshot();
  if (snap.mode !== "static") return null;
  const label =
    snap.source === "demo" ? "demo data" : snap.source === "upload" ? "uploaded files" : "local folder";
  return (
    <button
      type="button"
      onClick={() => void snap.disconnect()}
      title="Switch data source"
      className="hidden h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-elev px-2.5 text-xs text-fg-muted transition-all hover:border-accent/50 hover:text-fg active:scale-95 sm:flex"
    >
      <Database className="h-3.5 w-3.5 text-accent" />
      <span>{label}</span>
      <span className="text-fg-muted/60">· change</span>
    </button>
  );
}

/** Data endpoint each nav route fetches first — used to warm the cache on hover. */
function endpointFor(href: string): string {
  return href === "/sessions" ? "/api/sessions" : "/api/summary";
}

function NavRail() {
  const pathname = usePathname();
  const { prefetch } = useDashboard();
  return (
    <nav className="flex gap-1 lg:flex-col">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => prefetch(endpointFor(item.href))}
            className={cn(
              "group relative flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-all duration-200",
              active
                ? "bg-gradient-to-r from-accent/[0.14] to-accent/[0.04] font-medium text-accent ring-1 ring-inset ring-accent/20"
                : "text-fg-muted hover:bg-bg-elev/70 hover:text-fg",
            )}
          >
            {active && (
              <span
                className="absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_10px_-1px_hsl(var(--accent)/0.7)] lg:block"
                aria-hidden
              />
            )}
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-accent" : "text-fg-muted group-hover:text-fg",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Warnings() {
  const { meta } = useDashboard();
  if (!meta?.warnings?.length) return null;
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-2 lg:px-6">
      {meta.warnings.map((w, i) => (
        <div key={i} className="flex items-center gap-2 font-mono text-[11px] text-amber-500">
          <TriangleAlert className="h-3 w-3 shrink-0" /> {w}
        </div>
      ))}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen">
      {/* sidebar (lg+) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-bg-elev/40 px-3 py-5 lg:flex">
        <div className="px-2 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 text-accent shadow-card ring-1 ring-inset ring-accent/25">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-fg">CLI Usage</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-muted">
                local analytics
              </div>
            </div>
          </div>
        </div>
        <NavRail />
        <div className="mt-auto space-y-3 px-2 pt-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-muted">
            reads ~/.claude · ~/.codex · opencode · on-device
          </div>
          <Attribution variant="compact" />
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* top bar + filter bar pin together */}
        <div className="sticky top-0 z-20">
          <header className="relative z-30 border-b border-border bg-bg/70 backdrop-blur-xl after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-accent/25 after:to-transparent">
            <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
              <div className="flex items-center gap-2 lg:hidden">
                <Activity className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-fg">CLI Usage</span>
              </div>
              <h1 className="hidden text-sm font-semibold tracking-tight text-fg lg:block">
                {activeLabel(pathname)}
              </h1>
              <div className="ml-auto flex items-center gap-2">
                <DataSourceControl />
                <RefreshButton />
                <ThemeMenu />
              </div>
            </div>
            {/* mobile nav */}
            <div className="overflow-x-auto border-t border-border px-2 py-1.5 lg:hidden">
              <NavRail />
            </div>
          </header>
          <FilterBar />
        </div>

        <Warnings />

        <main key={pathname} className="container-wide py-6 motion-safe:animate-fade-rise">
          {children}
        </main>
      </div>
    </div>
  );
}
