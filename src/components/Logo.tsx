// agentmon's mascot — a friendly pixel "mon" creature. Drawn as an SVG grid so
// it stays crisp at any size (including a 16px favicon). The body uses
// `currentColor`, so wrapping it in `text-accent` themes it across all 6 themes;
// the eyes punch through to the background for a cut-out look.
//
// Pixel legend: '#' body · ':' shade (depth) · 'o' eye/cut-out · '.' empty.

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

export interface LogoProps {
  className?: string;
  size?: number | string;
  /** Eye / cut-out fill — defaults to the theme background so eyes read as holes. */
  eyeFill?: string;
  title?: string;
}

export function Logo({ className, size, eyeFill = "hsl(var(--bg))", title }: LogoProps) {
  const cells: React.ReactElement[] = [];
  for (let y = 0; y < PIXELS.length; y++) {
    const row = PIXELS[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === ".") continue;
      const fill = c === "o" ? eyeFill : "currentColor";
      const opacity = c === ":" ? 0.5 : 1;
      cells.push(
        // +0.04 overlap kills hairline seams between cells when scaled up.
        <rect key={`${x}-${y}`} x={x} y={y} width={1.04} height={1.04} fill={fill} fillOpacity={opacity} />,
      );
    }
  }
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      shapeRendering="crispEdges"
    >
      {title ? <title>{title}</title> : null}
      {cells}
    </svg>
  );
}

/** The mascot inside the product's signature gradient chip (matches the old mark). */
export function LogoMark({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <span
      className={
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 text-accent shadow-card ring-1 ring-inset ring-accent/25 " +
        (className ?? "")
      }
    >
      <Logo size={size} />
    </span>
  );
}
