// Generates agentmon's brand assets from the pixel-mascot matrix:
//   app/icon.svg            — SVG favicon (theme-independent, fixed accent)
//   app/icon.png            — 48px raster fallback
//   app/apple-icon.png      — 180px iOS touch icon
//   app/opengraph-image.png — 1200×630 social card
//   app/twitter-image.png   — copy of the OG card
//
// Rasterized with @resvg/resvg-js (lives in cli/node_modules). Run once and
// commit the outputs; re-run if the mascot or wordmark changes.
//   node scripts/gen-brand.mjs

import { writeFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function loadResvg() {
  for (const p of ["@resvg/resvg-js", join(ROOT, "cli/node_modules/@resvg/resvg-js"), join(ROOT, "node_modules/@resvg/resvg-js")]) {
    try {
      return require(p).Resvg;
    } catch {
      /* try next */
    }
  }
  throw new Error("@resvg/resvg-js not found (install it in cli/ or root)");
}
const Resvg = loadResvg();

const ACCENT = "#609bfb";
const FG = "#eef0f3";
const MUTED = "#8b909c";

// Pixel mascot — mirrors src/components/Logo.tsx
const PIXELS = [
  "...#....#...",
  "...#....#...",
  "..########..",
  ".##########.",
  "############",
  "##oo####oo##",
  "##oo####oo##",
  "############",
  "####::::####",
  ".##########.",
  "..##....##..",
  "............",
];

function pixels(ox, oy, cell, body, eye) {
  let s = `<g shape-rendering="crispEdges">`;
  for (let y = 0; y < PIXELS.length; y++) {
    const row = PIXELS[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === ".") continue;
      const fill = c === "o" ? eye : body;
      const op = c === ":" ? 0.5 : 1;
      s += `<rect x="${ox + x * cell}" y="${oy + y * cell}" width="${cell + 0.5}" height="${cell + 0.5}" fill="${fill}" fill-opacity="${op}"/>`;
    }
  }
  return s + `</g>`;
}

function iconSVG(size = 64) {
  const cell = (size * 0.75) / 12; // mascot fills ~75% of the tile
  const off = (size - cell * 12) / 2;
  const r = size * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#141b29"/><stop offset="1" stop-color="#0a0d14"/>
  </linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <rect x="0.75" y="0.75" width="${size - 1.5}" height="${size - 1.5}" rx="${r - 0.75}" fill="none" stroke="${ACCENT}" stroke-opacity="0.3" stroke-width="1.5"/>
  ${pixels(off, off, cell, ACCENT, "#0c1018")}
</svg>`;
}

function areaMotif(W, y0, y1) {
  const n = 48;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * W;
    const t = i / n;
    const h = 0.45 + 0.3 * Math.sin(t * 6.5 + 0.4) + 0.18 * Math.sin(t * 14) + 0.08 * Math.sin(t * 23);
    const y = y1 - Math.max(0.05, Math.min(1, h)) * (y1 - y0);
    pts.push([x.toFixed(1), y.toFixed(1)]);
  }
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${line} L${W},${y1} L0,${y1} Z`;
  return `
  <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.32"/>
    <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
  </linearGradient></defs>
  <path d="${area}" fill="url(#area)"/>
  <path d="${line}" fill="none" stroke="${ACCENT}" stroke-opacity="0.55" stroke-width="3"/>`;
}

function chip(x, y, w, text) {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="44" rx="22" fill="#11151f" stroke="${ACCENT}" stroke-opacity="0.25"/>
    <text x="${x + w / 2}" y="${y + 29}" font-family="Geist Mono, Menlo, monospace" font-size="22" fill="${MUTED}" text-anchor="middle">${text}</text>
  </g>`;
}

function ogSVG() {
  const W = 1200, H = 630;
  // grid
  let grid = `<g stroke="${FG}" stroke-opacity="0.04">`;
  for (let x = 0; x <= W; x += 48) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  for (let y = 0; y <= H; y += 48) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
  grid += `</g>`;

  const chipSize = 132;
  const cx = 90, cy = 96;
  const cell = (chipSize * 0.72) / 12;
  const coff = (chipSize - cell * 12) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c1019"/><stop offset="1" stop-color="#080b11"/>
    </linearGradient>
    <radialGradient id="glow" cx="22%" cy="8%" r="60%">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="chipbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${ACCENT}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#page)"/>
  ${grid}
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${areaMotif(W, 470, H)}

  <!-- mascot chip -->
  <rect x="${cx}" y="${cy}" width="${chipSize}" height="${chipSize}" rx="30" fill="url(#chipbg)" stroke="${ACCENT}" stroke-opacity="0.35"/>
  ${pixels(cx + coff, cy + coff, cell, ACCENT, "#0e1320")}

  <!-- wordmark + tagline -->
  <text x="${cx + chipSize + 34}" y="${cy + 92}" font-family="Geist, Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="${FG}" letter-spacing="-2">agentmon</text>
  <text x="${cx + 4}" y="320" font-family="Geist, Helvetica, Arial, sans-serif" font-size="40" fill="${FG}" fill-opacity="0.92">Your AI coding usage, beautifully measured.</text>
  <text x="${cx + 4}" y="372" font-family="Geist, Helvetica, Arial, sans-serif" font-size="27" fill="${MUTED}">Local-first analytics for Claude Code, Codex &amp; OpenCode — tokens, cost, models, rhythm.</text>

  ${chip(cx + 4, 420, 196, "Claude Code")}
  ${chip(cx + 216, 420, 130, "Codex")}
  ${chip(cx + 362, 420, 168, "OpenCode")}
  ${chip(cx + 546, 420, 232, "100% on-device")}
</svg>`;
}

function renderPng(svg, width) {
  const r = new Resvg(svg, { font: { loadSystemFonts: true }, fitTo: { mode: "width", value: width } });
  return r.render().asPng();
}

const app = join(ROOT, "app");
writeFileSync(join(app, "icon.svg"), iconSVG(64));
writeFileSync(join(app, "icon.png"), renderPng(iconSVG(64), 48));
writeFileSync(join(app, "apple-icon.png"), renderPng(iconSVG(64), 180));
writeFileSync(join(app, "opengraph-image.png"), renderPng(ogSVG(), 1200));
copyFileSync(join(app, "opengraph-image.png"), join(app, "twitter-image.png"));

console.log("brand assets written to app/: icon.svg, icon.png, apple-icon.png, opengraph-image.png, twitter-image.png");
