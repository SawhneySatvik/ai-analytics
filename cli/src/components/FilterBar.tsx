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

interface Group {
  label: string;
  opts: string[];
  active: number;
  pick: (i: number) => void;
}

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
  const groups: Group[] = [
    { label: "Days", opts: RANGES.map((r) => r.label), active: rangeIdx, pick: onPickRange },
    { label: "Src", opts: SOURCES.map((s) => s ?? "all"), active: sourceIdx, pick: onPickSource },
    { label: "Scope", opts: [...SCOPES], active: scopeIdx, pick: onPickScope },
  ];

  // Chip x-positions on row 1, matching the render below exactly (paddingX 1,
  // label "<g> ", each chip width = active ? len+2 : len, chip marginRight 1,
  // group marginRight 3). Active chips are padded into a pill.
  const segs: { x: number; w: number; gi: number; oi: number }[] = [];
  let x = 1;
  groups.forEach((g, gi) => {
    x += g.label.length + 1;
    g.opts.forEach((o, oi) => {
      const w = oi === g.active ? o.length + 2 : o.length;
      segs.push({ x, w, gi, oi });
      x += w + 1;
    });
    x += 3;
  });

  useEffect(
    () =>
      onClick((cx, cy) => {
        if (cy !== 1) return;
        const hit = segs.find((s) => cx >= s.x && cx < s.x + s.w);
        if (hit) groups[hit.gi].pick(hit.oi);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClick, rangeIdx, sourceIdx, scopeIdx, onPickRange, onPickSource, onPickScope],
  );

  return (
    <Box paddingX={1}>
      {groups.map((g) => (
        <Box key={g.label} marginRight={3}>
          <Text color={palette.dim}>{g.label} </Text>
          {g.opts.map((o, oi) => (
            <Box key={o} marginRight={1}>
              {oi === g.active ? (
                <Text color={palette.accent} inverse bold>
                  {` ${o} `}
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
