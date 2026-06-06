import { useEffect, useState } from "react";
import { Box, Text } from "ink";

import { palette } from "../theme.js";

export function Spinner({ color = palette.accent }: { color?: string }) {
  const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % FRAMES.length), 80);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Text color={color}>{FRAMES[i]}</Text>;
}

export function Kpi({
  label,
  value,
  sub,
  accent,
  width = 13,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  width?: number;
}) {
  return (
    <Box flexDirection="column" width={width} marginRight={2}>
      <Text color={palette.muted}>{label.toUpperCase()}</Text>
      <Text bold color={accent ? palette.accent : palette.fg}>
        {value}
      </Text>
      {sub ? <Text color={palette.muted}>{sub}</Text> : null}
    </Box>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Box marginBottom={1}>
      <Text color={palette.accent}>▍ </Text>
      <Text bold color={palette.fg}>
        {children}
      </Text>
    </Box>
  );
}

export interface Col {
  label: string;
  width: number;
  align?: "left" | "right";
}
export interface Cell {
  text: string;
  color?: string;
  bold?: boolean;
}

/**
 * Columnar table with a selection caret and a scrolling window. `rows` are
 * pre-rendered cell arrays aligned to `columns`. When `maxRows` is set and there
 * are more rows, the visible window follows the selection.
 */
export function Table({
  columns,
  rows,
  selected = -1,
  maxRows,
}: {
  columns: Col[];
  rows: Cell[][];
  selected?: number;
  maxRows?: number;
}) {
  const total = rows.length;
  const windowed = maxRows != null && total > maxRows;
  let start = 0;
  if (windowed) {
    start = Math.min(Math.max(0, selected - Math.floor(maxRows / 2)), total - maxRows);
    if (start < 0) start = 0;
  }
  const end = windowed ? start + maxRows! : total;
  const visible = rows.slice(start, end);

  return (
    <Box flexDirection="column">
      <Box>
        <Box width={2} />
        {columns.map((c, i) => (
          <Box key={i} width={c.width} marginRight={1} justifyContent={c.align === "right" ? "flex-end" : "flex-start"}>
            <Text color={palette.muted}>{c.label}</Text>
          </Box>
        ))}
      </Box>
      {visible.map((row, ri) => {
        const idx = start + ri;
        const sel = idx === selected;
        return (
          <Box key={idx}>
            <Box width={2}>
              <Text color={palette.accent} bold>
                {sel ? "› " : "  "}
              </Text>
            </Box>
            {columns.map((c, ci) => {
              const cell = row[ci] ?? { text: "" };
              return (
                <Box key={ci} width={c.width} marginRight={1} justifyContent={c.align === "right" ? "flex-end" : "flex-start"}>
                  <Text color={sel ? palette.accent : cell.color} bold={sel || cell.bold} wrap="truncate-end">
                    {cell.text}
                  </Text>
                </Box>
              );
            })}
          </Box>
        );
      })}
      {windowed ? (
        <Box marginTop={0}>
          <Text color={palette.dim}>{`   ${start + 1}–${end} of ${total}`}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
