import { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";

import { useDimensions, useFullscreen } from "./hooks.js";
import { derive, loadSnapshot, type Derived, type Filters, type ScreenProps } from "./data.js";
import type { Snapshot } from "@core/types";
import { relativeTime } from "@core/format";
import { palette } from "./theme.js";
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

  // Layout rows: 0 = TabBar, 1 = FilterBar, 2 = content paddingTop, 3 = content.
  const CONTENT_TOP = 3;
  const contentHeight = Math.max(6, rows - 6);
  const props: ScreenProps = { d, snap, width: cols, height: contentHeight, contentTop: CONTENT_TOP };
  const Active = SCREEN_COMPS[screen] ?? Overview;
  const status = refreshing ? "⟳ ingesting…" : `ingested ${relativeTime(snap.builtAt)}`;
  const hints = "1–8 tabs · ↑↓ ⏎ · d days · s src · c scope · r refresh · ? help · q quit";

  return (
    <Box flexDirection="column" width={cols} height={rows}>
      <TabBar active={screen} onPick={setScreen} />
      <FilterBar
        rangeIdx={rangeIdx}
        sourceIdx={sourceIdx}
        scopeIdx={scopeIdx}
        onPickRange={setRangeIdx}
        onPickSource={setSourceIdx}
        onPickScope={setScopeIdx}
      />
      <Box flexGrow={1} flexDirection="column" paddingX={1} paddingTop={1}>
        {help ? <HelpOverlay /> : <Active {...props} />}
      </Box>
      <Footer hints={hints} status={status} />
    </Box>
  );
}
