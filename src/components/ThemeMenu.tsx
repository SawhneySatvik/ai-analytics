"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Monitor, Palette } from "lucide-react";

import {
  applyTheme,
  DEFAULT_THEME,
  isLightTheme,
  resolveTheme,
  STORAGE_KEY,
  THEMES,
  type ThemePref,
} from "@/lib/themes";
import { cn } from "@/lib/utils";

/** Read the persisted preference ("system" | theme id). Defaults to Midnight. */
function readPref(): ThemePref {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function Swatch({ theme }: { theme: (typeof THEMES)[number] }) {
  return (
    <span
      className="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-black/10"
      style={{ background: theme.swatch.bg }}
      aria-hidden
    >
      <span className="absolute inset-x-0 bottom-0 h-2.5" style={{ background: theme.swatch.elev }} />
      <span
        className="absolute right-1 top-1 h-2 w-2 rounded-full"
        style={{ background: theme.swatch.accent }}
      />
    </span>
  );
}

export function ThemeMenu() {
  const [pref, setPref] = useState<ThemePref>(DEFAULT_THEME);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Hydrate the current preference after mount (avoids SSR mismatch).
  useEffect(() => {
    setPref(readPref());
  }, []);

  // When following the system, re-apply on OS light/dark changes.
  useEffect(() => {
    if (pref !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme(resolveTheme("system"));
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [pref]);

  // Dismiss on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = useCallback((next: ThemePref) => {
    setPref(next);
    applyTheme(resolveTheme(next));
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg-elev text-fg-muted transition-all hover:border-accent/50 hover:text-fg active:scale-95"
      >
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-border bg-bg-elev/95 p-1.5 shadow-pop backdrop-blur-xl motion-safe:animate-pop-in"
        >
          <div className="px-2 pb-1.5 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
            Theme
          </div>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={pref === "system"}
            onClick={() => choose("system")}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
              pref === "system" ? "bg-accent/10 text-accent" : "text-fg hover:bg-bg/60",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-bg text-fg-muted">
              <Monitor className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 text-left">Auto (system)</span>
            {pref === "system" && <Check className="h-3.5 w-3.5" />}
          </button>

          <div className="my-1 h-px bg-border/70" />

          <div className="grid grid-cols-1">
            {THEMES.map((t) => {
              const active = pref === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => choose(t.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    active ? "bg-accent/10 text-accent" : "text-fg hover:bg-bg/60",
                  )}
                >
                  <Swatch theme={t} />
                  <span className="flex-1 text-left">{t.label}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-fg-muted">
                    {isLightTheme(t.id) ? "light" : "dark"}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
