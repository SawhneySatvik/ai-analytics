// Terminal palette matching the web's Midnight identity. Ink renders via chalk,
// which downsamples truecolor to 256/16 and honors NO_COLOR/FORCE_COLOR — so we
// just supply hex and let the terminal degrade. The shared lib expresses colors
// as HSL strings (e.g. "hsl(217 91% 60%)"), so we convert those to hex here.

export const palette = {
  accent: "#609bfb", // hsl(217 95% 68%)
  fg: "#eef0f3",
  muted: "#8b909c",
  dim: "#3a3f4b",
  success: "#2dc98c",
  warn: "#f5a623",
  danger: "#f06363",
  bgCell: "#1b2230", // heatmap empty base
} as const;

function hue(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  const to = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Convert a shared-lib HSL color string to hex (falls back to the muted grey). */
export function colorOf(hslString: string | undefined): string {
  if (!hslString) return palette.muted;
  const m = hslString.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/i);
  if (!m) return hslString.startsWith("#") ? hslString : palette.muted;
  return hslToHex(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** Linear blend between two hex colors (t = 0..1). Used for the heatmap ramp. */
export function lerpHex(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((x, i) => Math.round(x + (pb[i] - x) * t));
  return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
