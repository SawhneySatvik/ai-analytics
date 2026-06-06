import { useEffect } from "react";
import { Box, Text } from "ink";

import { palette } from "../theme.js";
import { useMouse } from "../mouse.js";

export const SCREENS = [
  "Overview",
  "Models",
  "Projects",
  "Sessions",
  "Activity",
  "CLIs",
  "Tools",
  "Cache",
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

export function TabBar({ active, onPick }: { active: number; onPick: (i: number) => void }) {
  const { onClick, hoverX, hoverY } = useMouse();
  useEffect(
    () =>
      onClick((cx, cy) => {
        if (cy !== 0) return;
        for (let i = 0; i < TAB_LABELS.length; i++) {
          if (cx >= TAB_STARTS[i] && cx < TAB_STARTS[i] + TAB_LABELS[i].length) {
            onPick(i);
            return;
          }
        }
      }),
    [onClick, onPick],
  );
  const hovered = hoverY === 0 ? TAB_LABELS.findIndex((l, i) => hoverX >= TAB_STARTS[i] && hoverX < TAB_STARTS[i] + l.length) : -1;
  return (
    <Box paddingX={1}>
      <Text bold color={palette.accent}>
        agentmon
      </Text>
      <Text color={palette.dim}> · </Text>
      {SCREENS.map((s, i) => (
        <Box key={s} marginRight={1}>
          <Text color={i === active ? palette.accent : palette.muted} bold={i === active} underline={i === active || i === hovered}>
            {i + 1} {s}
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
    ["1–8 / Tab / ← →", "switch screens (or click a tab)"],
    ["↑ ↓  or  j k", "move selection (or click a row)"],
    ["Enter", "open detail (Projects, Sessions)"],
    ["Esc / Backspace", "back from detail"],
    ["d", "cycle days (date range)"],
    ["s", "cycle source (CLI tool)"],
    ["c", "cycle scope (all / main / subagent)"],
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
      <Text color={palette.dim}>press any key to close</Text>
    </Box>
  );
}
