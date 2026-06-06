import { useEffect } from "react";
import { Box, Text } from "ink";

import { palette } from "../theme.js";
import { useMouse } from "../mouse.js";

export const RANGES: { label: string; days: number | null }[] = [
  { label: "All", days: null },
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];
export const SOURCES: (string | null)[] = [null, "claude", "codex", "opencode"];
export const SCOPES = ["all", "main", "subagent"] as const;

const GROUPS = [
  { label: "Days", opts: RANGES.map((r) => r.label) },
  { label: "Src", opts: SOURCES.map((s) => s ?? "all") },
  { label: "Scope", opts: SCOPES.map((s) => s) },
];

// Chip x-positions on row 1, matching the render: paddingX 1, label "<g> ",
// chip width = label length (no pill padding), chip marginRight 2, group
// marginRight 4. Constant since options are constant.
const SEGS: { x: number; w: number; gi: number; oi: number }[] = (() => {
  const segs: { x: number; w: number; gi: number; oi: number }[] = [];
  let x = 1;
  GROUPS.forEach((g, gi) => {
    x += g.label.length + 1;
    g.opts.forEach((o, oi) => {
      segs.push({ x, w: o.length, gi, oi });
      x += o.length + 1;
    });
    x += 3;
  });
  return segs;
})();

export function FilterBar({
  rangeIdx,
  sourceIdx,
  scopeIdx,
  onPickRange,
  onPickSource,
  onPickScope,
}: {
  rangeIdx: number;
  sourceIdx: number;
  scopeIdx: number;
  onPickRange: (i: number) => void;
  onPickSource: (i: number) => void;
  onPickScope: (i: number) => void;
}) {
  const { onClick } = useMouse();
  const active = [rangeIdx, sourceIdx, scopeIdx];
  const picks = [onPickRange, onPickSource, onPickScope];

  useEffect(
    () =>
      onClick((cx, cy) => {
        if (cy !== 1) return;
        const hit = SEGS.find((s) => cx >= s.x && cx < s.x + s.w);
        if (hit) picks[hit.gi](hit.oi);
      }),
    [onClick, onPickRange, onPickSource, onPickScope],
  );

  return (
    <Box paddingX={1}>
      {GROUPS.map((g, gi) => (
        <Box key={g.label} marginRight={3}>
          <Text color={palette.dim}>{g.label} </Text>
          {g.opts.map((o, oi) => (
            <Box key={o} marginRight={1}>
              {oi === active[gi] ? (
                <Text color={palette.accent} bold underline>
                  {o}
                </Text>
              ) : (
                <Text color={palette.muted}>{o}</Text>
              )}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
