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

// Full-mode chip x-positions (row matches: paddingX 1, "<g> " label, chip width
// = label length, chip marginRight 1, group marginRight 3). Constant.
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
  row = 1,
  compact = false,
}: {
  rangeIdx: number;
  sourceIdx: number;
  scopeIdx: number;
  onPickRange: (i: number) => void;
  onPickSource: (i: number) => void;
  onPickScope: (i: number) => void;
  row?: number;
  compact?: boolean;
}) {
  const { onClick } = useMouse();
  const active = [rangeIdx, sourceIdx, scopeIdx];
  const picks = [onPickRange, onPickSource, onPickScope];

  // Compact: one group of active values; clicking a value cycles that group.
  const cgroups = [
    { label: "Days", value: GROUPS[0].opts[rangeIdx], len: RANGES.length, idx: rangeIdx },
    { label: "Src", value: GROUPS[1].opts[sourceIdx], len: SOURCES.length, idx: sourceIdx },
    { label: "Scope", value: GROUPS[2].opts[scopeIdx], len: SCOPES.length, idx: scopeIdx },
  ];
  const csegs: { x: number; w: number; gi: number }[] = [];
  if (compact) {
    let x = 1;
    cgroups.forEach((g, gi) => {
      if (gi > 0) x += 3; // " · "
      x += g.label.length + 1;
      csegs.push({ x, w: g.value.length, gi });
      x += g.value.length;
    });
  }

  useEffect(
    () =>
      onClick((cx, cy) => {
        if (cy !== row) return;
        if (compact) {
          const hit = csegs.find((s) => cx >= s.x && cx < s.x + s.w);
          if (hit) picks[hit.gi]((cgroups[hit.gi].idx + 1) % cgroups[hit.gi].len);
        } else {
          const hit = SEGS.find((s) => cx >= s.x && cx < s.x + s.w);
          if (hit) picks[hit.gi](hit.oi);
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClick, row, compact, rangeIdx, sourceIdx, scopeIdx, onPickRange, onPickSource, onPickScope],
  );

  if (compact) {
    return (
      <Box paddingX={1}>
        {cgroups.map((g, i) => (
          <Box key={g.label}>
            {i > 0 ? <Text color={palette.dim}> · </Text> : null}
            <Text color={palette.dim}>{g.label} </Text>
            <Text color={palette.accent} bold>
              {g.value}
            </Text>
          </Box>
        ))}
      </Box>
    );
  }

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
