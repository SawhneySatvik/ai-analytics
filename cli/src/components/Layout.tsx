import { Box, Text } from "ink";

import { palette } from "../theme.js";

export const SCREENS = ["Overview", "Models", "Projects", "Sessions", "Activity"] as const;

export function TabBar({ active }: { active: number }) {
  return (
    <Box paddingX={1}>
      <Text bold color={palette.accent}>
        agentmon
      </Text>
      <Text color={palette.dim}> · </Text>
      {SCREENS.map((s, i) => (
        <Box key={s} marginRight={2}>
          <Text color={i === active ? palette.accent : palette.muted} bold={i === active} underline={i === active}>
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
    ["1–5 / Tab / ← →", "switch screens"],
    ["↑ ↓  or  j k", "move selection"],
    ["Enter", "open detail (Projects, Sessions)"],
    ["Esc / Backspace", "back from detail"],
    ["f", "cycle date range"],
    ["s", "cycle source (CLI tool)"],
    ["m", "toggle heatmap metric (Activity)"],
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
