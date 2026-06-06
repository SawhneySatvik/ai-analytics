import { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";

import { useDimensions, useFullscreen } from "./hooks.js";
import { derive, loadSnapshot, type Derived, type Filters, type ScreenProps } from "./data.js";
import type { Snapshot } from "@core/types";
import { relativeTime } from "@core/format";
import { palette } from "./theme.js";
import { FOOTER_STAR } from "./meta.js";
import { Footer, HelpOverlay, SCREENS, TabBar } from "./components/Layout.js";
import { FilterBar, RANGES, SOURCES, SCOPES } from "./components/FilterBar.js";
import { Spinner } from "./components/ui.js";
import { Overview } from "./screens/Overview.js";
import { Models } from "./screens/Models.js";
import { Projects } from "./screens/Projects.js";
import { Sessions } from "./screens/Sessions.js";
import { Activity } from "./screens/Activity.js";
import { Sources } from "./screens/Sources.js";
import { Tools } from "./screens/Tools.js";
import { Cache } from "./screens/Cache.js";

export interface InitialOptions {
  rangeIdx: number;
  sourceIdx: number;
  scopeIdx: number;
}

const SCREEN_COMPS: ((p: ScreenProps) => React.ReactNode)[] = [
  Overview,
  Models,
  Projects,
  Sessions,
  Activity,
  Sources,
  Tools,
  Cache,
];

export function App({ initial }: { initial: InitialOptions }) {
  useFullscreen();
  const [cols, rows] = useDimensions();
  const { exit } = useApp();

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [screen, setScreen] = useState(0);
  const [help, setHelp] = useState(false);
  const [rangeIdx, setRangeIdx] = useState(initial.rangeIdx);
  const [sourceIdx, setSourceIdx] = useState(initial.sourceIdx);
  const [scopeIdx, setScopeIdx] = useState(initial.scopeIdx);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setRefreshing(true);
      try {
        const s = await loadSnapshot(false);
        if (alive) {
          setSnap(s);
          setErr(null);
        }
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setRefreshing(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const s = await loadSnapshot(true);
      setSnap(s);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  };

  const filters = useMemo<Filters>(
    () => ({
      from: RANGES[rangeIdx].days ? Date.now() - RANGES[rangeIdx].days! * 86_400_000 : undefined,
      source: (SOURCES[sourceIdx] ?? undefined) as Filters["source"],
      scope: SCOPES[scopeIdx],
    }),
    [rangeIdx, sourceIdx, scopeIdx],
  );

  const d: Derived | null = useMemo(() => (snap ? derive(snap, filters) : null), [snap, filters]);

  useInput((input, key) => {
    if (help) {
      setHelp(false);
      return;
    }
    if (input === "q") return void exit();
    if (input === "?") return void setHelp(true);
    if (input === "r") return void refresh();
    if (input === "d") return void setRangeIdx((i) => (i + 1) % RANGES.length);
    if (input === "s") return void setSourceIdx((i) => (i + 1) % SOURCES.length);
    if (input === "c") return void setScopeIdx((i) => (i + 1) % SCOPES.length);
    if (key.tab || key.rightArrow) return void setScreen((s) => (s + 1) % SCREENS.length);
    if (key.leftArrow) return void setScreen((s) => (s - 1 + SCREENS.length) % SCREENS.length);
    const n = Number(input);
    if (n >= 1 && n <= SCREENS.length) setScreen(n - 1);
  });

  if (err) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color={palette.danger}>✗ Could not read usage data</Text>
        <Text color={palette.muted}>{err}</Text>
      </Box>
    );
  }
  if (!snap || !d) {
    return (
      <Box padding={1}>
        <Spinner />
        <Text color={palette.muted}> reading ~/.claude · ~/.codex · opencode…</Text>
      </Box>
    );
  }
  if (cols < 50 || rows < 14) {
    return (
      <Box width={cols} height={rows} alignItems="center" justifyContent="center">
        <Text color={palette.muted}>terminal too small — widen to ≥ 50×14</Text>
      </Box>
    );
  }

  // Layout rows (with breathing room): 0 = top pad, 1 = TabBar, 2 = spacer,
  // 3 = FilterBar, 4 = content paddingTop, 5 = content. (fixed in both modes)
  const TAB_ROW = 1;
  const FILTER_ROW = 3;
  const CONTENT_TOP = 5;
  const compact = cols < 96; // full header no longer fits on one row
  const contentHeight = Math.max(6, rows - 7);
  const props: ScreenProps = { d, snap, width: cols, height: contentHeight, contentTop: CONTENT_TOP, compact };
  const Active = SCREEN_COMPS[screen] ?? Overview;
  const status = refreshing
    ? "⟳ ingesting…"
    : compact
      ? `ingested ${relativeTime(snap.builtAt)}`
      : `${FOOTER_STAR} · ingested ${relativeTime(snap.builtAt)}`;
  const hints = compact
    ? "↑↓ ⏎ · d s c · r · ? · q"
    : "1–8 tabs · ↑↓ ⏎ · d days · s src · c scope · r refresh · ? help · q quit";

  return (
    <Box flexDirection="column" width={cols} height={rows} paddingTop={1}>
      <TabBar active={screen} onPick={setScreen} row={TAB_ROW} compact={compact} />
      <Box height={1} />
      <FilterBar
        rangeIdx={rangeIdx}
        sourceIdx={sourceIdx}
        scopeIdx={scopeIdx}
        onPickRange={setRangeIdx}
        onPickSource={setSourceIdx}
        onPickScope={setScopeIdx}
        row={FILTER_ROW}
        compact={compact}
      />
      <Box flexGrow={1} flexDirection="column" paddingX={1} paddingTop={1}>
        {help ? <HelpOverlay /> : <Active {...props} />}
      </Box>
      <Footer hints={hints} status={status} />
    </Box>
  );
}
