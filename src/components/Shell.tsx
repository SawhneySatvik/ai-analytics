"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  Database,
  FolderGit2,
  LayoutDashboard,
  MessagesSquare,
  Moon,
  RefreshCw,
  Sun,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useDashboard } from "./dashboard-context";
import { FilterBar } from "./FilterBar";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/models", label: "Models", icon: Boxes },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/sessions", label: "Sessions", icon: MessagesSquare },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/cache", label: "Cache", icon: Database },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    try {
      localStorage.setItem("ca-theme", d ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg-elev text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
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
        className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-elev px-2.5 text-xs text-fg transition-colors hover:border-accent/50 disabled:opacity-60"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        {refreshing ? "reading…" : "refresh"}
      </button>
    </div>
  );
}

function NavRail() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 lg:flex-col">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent/12 font-medium text-accent"
                : "text-fg-muted hover:bg-bg-elev hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
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
  return (
    <div className="min-h-screen">
      {/* sidebar (lg+) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-bg-elev/40 px-3 py-5 lg:flex">
        <div className="px-2 pb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-fg">Claude Usage</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-muted">
                local analytics
              </div>
            </div>
          </div>
        </div>
        <NavRail />
        <div className="mt-auto px-2 pt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-fg-muted">
          reads ~/.claude · on-device
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <Activity className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-fg">Claude Usage</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <RefreshButton />
              <ThemeToggle />
            </div>
          </div>
          {/* mobile nav */}
          <div className="overflow-x-auto border-t border-border px-2 py-1.5 lg:hidden">
            <NavRail />
          </div>
        </header>

        <FilterBar />
        <Warnings />

        <main className="container-wide py-6">{children}</main>
      </div>
    </div>
  );
}
