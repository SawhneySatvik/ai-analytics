// Bridge to the shared data layer (src/lib, aliased as @core). The CLI loads the
// snapshot once, then derives the same aggregates the web uses — entirely
// in-memory, so navigation and filtering are instant.

import { getSnapshot } from "@core/cache";
import {
  applyFilters,
  summarize,
  dailySeries,
  modelBreakdown,
  projectBreakdown,
  sourceBreakdown,
  sessionList,
  toolBreakdown,
  subagentBreakdown,
  sessionTimeline,
  hourWeekdayHeatmap,
} from "@core/aggregate";
import type {
  Summary,
  SourceRecord,
  HeatCell,
  ToolStat,
  TimelinePoint,
  SubagentStat,
} from "@core/aggregate";
import { enabledSources } from "@core/paths";
import type {
  Snapshot,
  Filters,
  MessageRecord,
  DailyRecord,
  ModelRecord,
  ProjectRecord,
  SessionRecord,
} from "@core/types";

export type { Filters, Summary, ModelRecord, ProjectRecord, SessionRecord, HeatCell };

/** Total tokens for a usage bucket (matches the web's model/project totals). */
export const tok = (u: { input: number; output: number; cacheCreate: number; cacheRead: number }) =>
  u.input + u.output + u.cacheCreate + u.cacheRead;

export interface ToolSummary {
  tools: ToolStat[];
  totalToolCalls: number;
  webSearch: number;
  webFetch: number;
}

export interface Derived {
  summary: Summary;
  daily: DailyRecord[];
  models: ModelRecord[];
  projects: ProjectRecord[];
  sources: SourceRecord[];
  sessions: SessionRecord[];
  tools: ToolSummary;
  heatmap: { cells: HeatCell[]; hourTotals: number[]; weekdayTotals: number[] };
  /** filtered messages, kept for on-demand session detail */
  messages: MessageRecord[];
}

export interface SessionDetail {
  summary: Summary;
  timeline: TimelinePoint[];
  tools: ToolSummary;
  models: ModelRecord[];
  subagents: SubagentStat[];
}

/** Common props passed to every screen. */
export interface ScreenProps {
  d: Derived;
  snap: Snapshot;
  width: number;
  height: number;
}

/** Build (or rebuild, when `force`) the snapshot from the enabled sources. */
export async function loadSnapshot(force = false): Promise<Snapshot> {
  return getSnapshot(force);
}

export function sourcesInUse(): string[] {
  return enabledSources();
}

/** Apply filters and compute everything the screens need, in one pass. */
export function derive(snap: Snapshot, filters: Filters): Derived {
  const messages = applyFilters(snap.messages, filters);
  return {
    summary: summarize(messages),
    daily: dailySeries(messages),
    models: modelBreakdown(messages),
    projects: projectBreakdown(messages),
    sources: sourceBreakdown(messages),
    sessions: sessionList(messages, snap.sessionMeta),
    tools: toolBreakdown(messages),
    heatmap: hourWeekdayHeatmap(messages),
    messages,
  };
}

/** Deep view for a single session (used by the Sessions drill-in). */
export function sessionDetail(snap: Snapshot, sessionId: string): SessionDetail | null {
  const msgs = snap.messages.filter((m) => m.sessionId === sessionId);
  if (msgs.length === 0) return null;
  return {
    summary: summarize(msgs),
    timeline: sessionTimeline(msgs),
    tools: toolBreakdown(msgs),
    models: modelBreakdown(msgs),
    subagents: subagentBreakdown(msgs),
  };
}
