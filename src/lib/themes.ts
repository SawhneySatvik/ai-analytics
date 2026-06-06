// Theme registry — one CSS-var contract per theme (see app/globals.css). The
// `data-theme` attribute on <html> selects the active theme. Keep this in sync
// with the theme blocks in globals.css and the inline no-flash script in
// app/layout.tsx (which hardcodes the light-theme ids).

export type ThemeMode = "dark" | "light";

export interface ThemeDef {
  id: string;
  label: string;
  mode: ThemeMode;
  /** Literal hsl() strings for the menu's preview swatch (no var() lookup). */
  swatch: { bg: string; elev: string; accent: string; fg: string };
}

export const THEMES: ThemeDef[] = [
  {
    id: "midnight",
    label: "Midnight",
    mode: "dark",
    swatch: { bg: "hsl(222 18% 6%)", elev: "hsl(222 16% 10%)", accent: "hsl(217 95% 68%)", fg: "hsl(220 15% 95%)" },
  },
  {
    id: "nord",
    label: "Nord",
    mode: "dark",
    swatch: { bg: "hsl(220 17% 11%)", elev: "hsl(220 16% 15%)", accent: "hsl(193 47% 66%)", fg: "hsl(218 27% 92%)" },
  },
  {
    id: "mono",
    label: "Mono",
    mode: "dark",
    swatch: { bg: "hsl(0 0% 7%)", elev: "hsl(0 0% 11%)", accent: "hsl(210 12% 86%)", fg: "hsl(0 0% 96%)" },
  },
  {
    id: "paper",
    label: "Paper",
    mode: "light",
    swatch: { bg: "hsl(36 20% 92%)", elev: "hsl(36 16% 87%)", accent: "hsl(222 88% 44%)", fg: "hsl(220 25% 12%)" },
  },
  {
    id: "rose",
    label: "Rosé",
    mode: "light",
    swatch: { bg: "hsl(18 26% 95%)", elev: "hsl(18 24% 91%)", accent: "hsl(345 66% 50%)", fg: "hsl(345 22% 17%)" },
  },
  {
    id: "solar",
    label: "Solar",
    mode: "light",
    swatch: { bg: "hsl(44 38% 92%)", elev: "hsl(44 32% 87%)", accent: "hsl(26 88% 46%)", fg: "hsl(28 30% 17%)" },
  },
];

/** Persisted preference can be any theme id or the special "system" value. */
export type ThemePref = string; // theme id | "system"

export const DEFAULT_THEME = "midnight";
export const STORAGE_KEY = "ca-theme";

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));

export function isLightTheme(id: string): boolean {
  return BY_ID.get(id)?.mode === "light";
}

export function prefersLight(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches;
}

/** Resolve a stored preference ("system" or a theme id) to a concrete theme id. */
export function resolveTheme(pref: ThemePref): string {
  if (pref === "system") return prefersLight() ? "paper" : "midnight";
  return BY_ID.has(pref) ? pref : DEFAULT_THEME;
}

/** Apply a concrete theme id to <html> and set the matching color-scheme class. */
export function applyTheme(id: string): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.setAttribute("data-theme", id);
  // No `dark:` Tailwind variants are used; `data-theme` is the single source of
  // truth. We still mirror the family on a class for any future use.
  el.classList.toggle("dark", !isLightTheme(id));
}
