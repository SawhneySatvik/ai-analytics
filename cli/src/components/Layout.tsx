import { useEffect } from "react";
import { Box, Text } from "ink";

import { palette } from "../theme.js";
import { useMouse } from "../mouse.js";
import { CREDIT_LINE, STAR_LINE } from "../meta.js";

export const SCREENS = [
  "Overview",
  "Models",
  "Projects",
  "Sessions",
  "Activity",
  "CLIs",
  "Tools",
  "Cache",
  "Wrapped",
] as const;

// Tab label x-positions (row 0) for mouse hit-testing. Base = paddingX(1) +
// "agentmon"(8) + " · "(3). Constant since SCREENS is constant.
const TAB_LABELS = SCREENS.map((s, i) => `${i + 1} ${s}`);
const TAB_STARTS: number[] = (() => {
  const a: number[] = [];
  let x = 12;
  for (const l of TAB_LABELS) {
    a.push(x);
    x += l.length + 1; // label + marginRight 1
  }
  return a;
})();

export function TabBar({
  active,
  onPick,
  row = 0,
  compact = false,
}: {
  active: number;
  onPick: (i: number) => void;
  row?: number;
  compact?: boolean;
}) {
  const { onClick, hoverX, hoverY } = useMouse();

  // Segments (text + click x-range). Full: "N Name" each. Compact: numbers with
  // the active tab expanded inline (positions shift with `active`).
  const segs: { i: number; start: number; text: string }[] = [];
  if (compact) {
    let x = 1 + 8 + 2; // paddingX + "agentmon" + 2 spaces
    for (let i = 0; i < SCREENS.length; i++) {
      const text = i === active ? `‹${i + 1} ${SCREENS[i]}›` : `${i + 1}`;
      segs.push({ i, start: x, text });
      x += text.length + 1;
    }
  } else {
    for (let i = 0; i < SCREENS.length; i++) segs.push({ i, start: TAB_STARTS[i], text: TAB_LABELS[i] });
  }

  useEffect(
    () =>
      onClick((cx, cy) => {
        if (cy !== row) return;
        for (const s of segs) if (cx >= s.start && cx < s.start + s.text.length) return void onPick(s.i);
      }),
    [onClick, onPick, row, compact, active],
  );
  const hovered = hoverY === row ? segs.find((s) => hoverX >= s.start && hoverX < s.start + s.text.length)?.i ?? -1 : -1;

  return (
    <Box paddingX={1}>
      <Text bold color={palette.accent}>
        agentmon
      </Text>
      <Text color={palette.dim}>{compact ? "  " : " · "}</Text>
      {segs.map((s) => (
        <Box key={s.i} marginRight={1}>
          <Text color={s.i === active ? palette.accent : palette.muted} bold={s.i === active} underline={s.i === active || s.i === hovered}>
            {s.text}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export function Footer({ hints, status }: { hints: string; status: string }) {
  return (
    <Box paddingX={1} justifyContent="space-between">
      <Text color={palette.dim} wrap="truncate-end">
        {hints}
      </Text>
      <Text color={palette.muted} wrap="truncate-end">
        {status}
      </Text>
    </Box>
  );
}

export function HelpOverlay() {
  const rows: [string, string][] = [
    ["1–9 / Tab / ← →", "switch screens (or click a tab)"],
    ["↑ ↓  or  j k", "move selection (or click a row)"],
    ["Enter", "open detail (Projects, Sessions)"],
    ["Esc / Backspace", "back from detail"],
    ["d", "cycle days (date range)"],
    ["s", "cycle source (CLI tool)"],
    ["c", "cycle scope (all / main / subagent)"],
    ["g / v", "Overview: cycle chart metric / style"],
    ["g / e / o", "Wrapped: cycle card / export image / open"],
    ["m", "toggle heatmap metric (Activity)"],
    ["mouse", "click tabs/chips/rows · wheel scrolls"],
    ["r", "refresh — re-read the data dirs"],
    ["?", "toggle this help"],
    ["q / Ctrl-C", "quit"],
  ];
  return (
    <Box flexDirection="column">
      <Text bold color={palette.accent}>
        Keyboard
      </Text>
      <Box height={1} />
      {rows.map(([k, d]) => (
        <Box key={k}>
          <Box width={20}>
            <Text color={palette.fg}>{k}</Text>
          </Box>
          <Text color={palette.muted}>{d}</Text>
        </Box>
      ))}
      <Box height={1} />
      <Text color={palette.accent}>{STAR_LINE}</Text>
      <Text color={palette.dim}>{CREDIT_LINE}</Text>
      <Box height={1} />
      <Text color={palette.dim}>press any key to close</Text>
    </Box>
  );
}
