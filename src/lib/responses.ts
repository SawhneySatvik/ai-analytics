// Pure response builders — the exact DTO shapes the API routes return, factored
// out so BOTH the Node API routes and the in-browser (static) client produce
// byte-identical results. No fs, no fetch — just a Snapshot + Filters in.

import type { Snapshot, Filters } from "./types";
import type {
  SnapshotMeta,
  SummaryResponse,
  SessionsResponse,
  SessionDetailResponse,
  MetaResponse,
} from "./dto";
import {
  applyFilters,
  summarize,
  dailySeries,
  modelBreakdown,
  sourceBreakdown,
  projectBreakdown,
  toolBreakdown,
  subagentBreakdown,
  branchBreakdown,
  speedBreakdown,
  hourWeekdayHeatmap,
  commandStats,
  filterOptions,
  sessionList,
  sessionTimeline,
} from "./aggregate";

function snapshotMeta(snap: Snapshot): SnapshotMeta {
  return {
    builtAt: snap.builtAt,
    buildMs: snap.buildMs,
    timezone: snap.timezone,
    fileCount: snap.fileCount,
    lineCount: snap.lineCount,
    assistantLineCount: snap.assistantLineCount,
    distinctMessageCount: snap.distinctMessageCount,
    duplicateLineCount: snap.duplicateLineCount,
    malformedLineCount: snap.malformedLineCount,
    warnings: snap.warnings,
  };
}

export function buildSummaryResponse(snap: Snapshot, filters: Filters): SummaryResponse {
  const messages = applyFilters(snap.messages, filters);
  return {
    meta: snapshotMeta(snap),
    summary: summarize(messages),
    daily: dailySeries(messages),
    models: modelBreakdown(messages),
    sources: sourceBreakdown(messages),
    projects: projectBreakdown(messages),
    tools: toolBreakdown(messages),
    subagents: subagentBreakdown(messages),
    branches: branchBreakdown(messages),
    speeds: speedBreakdown(messages),
    heatmap: hourWeekdayHeatmap(messages),
    commands: commandStats(snap.history, filters),
  };
}

export function buildSessionsResponse(snap: Snapshot, filters: Filters): SessionsResponse {
  const messages = applyFilters(snap.messages, filters);
  return { sessions: sessionList(messages, snap.sessionMeta) };
}

export function buildSessionDetailResponse(snap: Snapshot, id: string): SessionDetailResponse | null {
  const msgs = snap.messages.filter((m) => m.sessionId === id);
  if (msgs.length === 0) return null;
  const [session] = sessionList(msgs, snap.sessionMeta);
  return {
    session,
    summary: summarize(msgs),
    timeline: sessionTimeline(msgs),
    tools: toolBreakdown(msgs),
    subagents: subagentBreakdown(msgs),
    models: modelBreakdown(msgs),
  };
}

export function buildMetaResponse(snap: Snapshot): MetaResponse {
  return { ...snapshotMeta(snap), options: filterOptions(snap.messages) };
}
