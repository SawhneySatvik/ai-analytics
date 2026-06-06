import { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";

import { useDimensions, useFullscreen } from "./hooks.js";
import { derive, loadSnapshot, type Derived, type Filters } from "./data.js";
import type { Snapshot } from "@core/types";
import { relativeTime } from "@core/format";
import { palette } from "./theme.js";
import { Footer, HelpOverlay, SCREENS, TabBar } from "./components/Layout.js";
import { Spinner } from "./components/ui.js";
import { Overview } from "./screens/Overview.js";
import { Models } from "./screens/Models.js";
import { Projects } from "./screens/Projects.js";
import { Sessions } from "./screens/Sessions.js";
import { Activity } from "./screens/Activity.js";

export const RANGES: { label: string; days: number | null }[] = [
  { label: "All", days: null },
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];
export const SOURCES: (string | null)[] = [null, "claude", "codex", "opencode"];

export interface InitialOptions {
  rangeIdx: number;
  sourceIdx: number;
  scope: "all" | "main" | "subagent";
}

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
  const scope = initial.scope;

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
      scope,
    }),
    [rangeIdx, sourceIdx, scope],
  );

  const d: Derived | null = useMemo(() => (snap ? derive(snap, filters) : null), [snap, filters]);

  useInput((input, key) => {
    if (help) {
      setHelp(false);
      return;
    }
    if (input === "q") {
      exit();
      return;
    }
    if (input === "?") {
      setHelp(true);
      return;
    }
    if (input === "r") {
      void refresh();
      return;
    }
    if (input === "f") {
      setRangeIdx((i) => (i + 1) % RANGES.length);
      return;
    }
    if (input === "s") {
      setSourceIdx((i) => (i + 1) % SOURCES.length);
      return;
    }
    if (key.tab || key.rightArrow) {
      setScreen((s) => (s + 1) % SCREENS.length);
      return;
    }
    if (key.leftArrow) {
      setScreen((s) => (s - 1 + SCREENS.length) % SCREENS.length);
      return;
    }
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

  const contentHeight = Math.max(6, rows - 4);
  const props = { d, snap, width: cols, height: contentHeight };
  const srcLabel = SOURCES[sourceIdx] ?? "all";
  const status = `${RANGES[rangeIdx].label} · ${srcLabel} · ${
    refreshing ? "⟳ ingesting…" : `ingested ${relativeTime(snap.builtAt)}`
  }`;
  const hints = "1–5 tabs · ↑↓ select · ⏎ open · f range · s src · r refresh · ? help · q quit";

  return (
    <Box flexDirection="column" width={cols} height={rows}>
      <TabBar active={screen} />
      <Box flexGrow={1} flexDirection="column" paddingX={1} paddingTop={1}>
        {help ? (
          <HelpOverlay />
        ) : screen === 0 ? (
          <Overview {...props} />
        ) : screen === 1 ? (
          <Models {...props} />
        ) : screen === 2 ? (
          <Projects {...props} />
        ) : screen === 3 ? (
          <Sessions {...props} />
        ) : (
          <Activity {...props} />
        )}
      </Box>
      <Footer hints={hints} status={status} />
    </Box>
  );
}
