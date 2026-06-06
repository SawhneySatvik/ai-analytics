// Export a share card to a real image file from the terminal. Builds the shared
// SVG (renderCardSVG) and rasterizes to PNG with @resvg/resvg-js (an OPTIONAL
// native dep — lazy-imported so startup stays fast; if it isn't installed on this
// platform we fall back to writing the .svg). Nothing leaves the machine.

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { renderCardSVG, type CardColors } from "@core/cardSvg";
import type { ShareStats, ShareTemplate } from "@core/share";
import { derivePersona } from "@core/badges";
import { fmtCompact } from "@core/format";

const COLORS: CardColors = {
  bg: "#0b0e15",
  fg: "#eef0f3",
  fgMuted: "#8b909c",
  accent: "#609bfb",
  border: "#222a38",
};

export interface ExportResult {
  path: string;
  caption: string;
  xUrl: string;
  format: "png" | "svg";
}

export function captionFor(stats: ShareStats): string {
  const p = derivePersona(stats);
  return `apparently I'm a ${p.title} ${p.emoji} — ${fmtCompact(stats.totalTokens)} tokens, all on-device with agentmon`;
}

export async function exportCard(
  stats: ShareStats,
  template: ShareTemplate,
  handle?: string,
): Promise<ExportResult> {
  const svg = renderCardSVG(stats, { template, ratio: "square", colors: COLORS, handle });
  const caption = captionFor(stats);
  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(caption)}`;
  const base = join(process.cwd(), `agentmon-${template}`);

  try {
    const { Resvg } = await import("@resvg/resvg-js");
    const resvg = new Resvg(svg, { font: { loadSystemFonts: true }, fitTo: { mode: "original" } });
    const png = resvg.render().asPng();
    const path = `${base}.png`;
    await writeFile(path, png);
    return { path, caption, xUrl, format: "png" };
  } catch {
    // resvg unavailable on this platform — still give them a vector card.
    const path = `${base}.svg`;
    await writeFile(path, svg, "utf8");
    return { path, caption, xUrl, format: "svg" };
  }
}

/** Open a file or URL with the OS default handler (no stdout — keeps the TUI clean). */
export async function openPath(target: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    spawn(cmd, [target], { detached: true, stdio: "ignore", shell: process.platform === "win32" }).unref();
  } catch {
    /* best-effort */
  }
}
