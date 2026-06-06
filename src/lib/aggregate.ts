import { projectDisplayName } from "./projectPath";
import {
  MODEL_ORDER,
  SOURCE_ORDER,
  modelColorFor,
  modelKey,
  sourceColor,
  sourceLabel,
} from "./models";
import { isPricedFor, uncachedCostFor } from "./pricing";
import {
  addUsage,
  billableExCacheRead,
  cacheHitRate,
  emptyUsage,
  totalTokens,
} from "./usage";
import type {
  CanonicalModel,
  DailyRecord,
  Filters,
  HistoryEntry,
  MessageRecord,
  ModelRecord,
  ModelTag,
  ProjectRecord,
  SessionMeta,
  SessionRecord,
  Source,
  TokenUsage,
} from "./types";

/** Stable grouping key + display tag for a message's model (any source). */
function tagOf(m: MessageRecord): ModelTag {
  const key = modelKey(m.provider, m.model, m.rawModel);
  return { key, label: m.modelLabel, color: modelColorFor(m.provider, m.model, key) };
}

/** YYYY-MM-DD in the machine's local timezone (matches user intuition). */
export function dateKey(ts: number): string {
  return new Date(ts).toLocaleDateString("en-CA");
}

// ── filtering ────────────────────────────────────────────────────────────────

export function applyFilters(messages: MessageRecord[], f: Filters): MessageRecord[] {
  return messages.filter((m) => {
    if (f.from != null && m.ts < f.from) return false;
    if (f.to != null && m.ts > f.to) return false;
    if (f.project && m.projectPath !== f.project) return false;
    if (f.source && m.source !== f.source) return false;
    if (f.model && m.model !== f.model) return false;
    if (f.branch && m.gitBranch !== f.branch) return false;
    if (f.scope === "main" && m.isSidechain) return false;
    if (f.scope === "subagent" && !m.isSidechain) return false;
    return true;
  });
}

// ── headline summary ─────────────────────────────────────────────────────────

export interface Summary {
  usage: TokenUsage;
  totalTokens: number;
  billableTokens: number; // excludes cache reads (stats-cache definition)
  cost: number;
  uncachedCost: number; // hypothetical cost with no caching
  cacheSavings: number;
  cacheHitRate: number;
  messageCount: number;
  toolCallCount: number;
  sessionCount: number;
  projectCount: number;
  activeDays: number;
  firstTs: number | null;
  lastTs: number | null;
  mainTokens: number;
  subagentTokens: number;
  subagentMessageCount: number;
  webSearch: number;
  webFetch: number;
}

export function summarize(messages: MessageRecord[]): Summary {
  const usage = emptyUsage();
  let cost = 0;
  let uncached = 0;
  let toolCallCount = 0;
  let mainTokens = 0;
  let subagentTokens = 0;
  let subagentMessageCount = 0;
  const sessions = new Set<string>();
  const projects = new Set<string>();
  const days = new Set<string>();
  let firstTs: number | null = null;
  let lastTs: number | null = null;

  for (const m of messages) {
    addUsage(usage, m.usage);
    cost += m.cost;
    uncached += uncachedCostFor(m.usage, m.provider, m.model, m.rawModel);
    toolCallCount += m.toolCalls.length;
    const tt = totalTokens(m.usage);
    if (m.isSidechain) {
      subagentTokens += tt;
      subagentMessageCount++;
    } else {
      mainTokens += tt;
    }
    sessions.add(m.sessionId);
    projects.add(m.projectPath);
    if (m.ts > 0) {
      days.add(dateKey(m.ts));
      if (firstTs == null || m.ts < firstTs) firstTs = m.ts;
      if (lastTs == null || m.ts > lastTs) lastTs = m.ts;
    }
  }

  return {
    usage,
    totalTokens: totalTokens(usage),
    billableTokens: billableExCacheRead(usage),
    cost,
    uncachedCost: uncached,
    cacheSavings: Math.max(0, uncached - cost),
    cacheHitRate: cacheHitRate(usage),
    messageCount: messages.length,
    toolCallCount,
    sessionCount: sessions.size,
    projectCount: projects.size,
    activeDays: days.size,
    firstTs,
    lastTs,
    mainTokens,
    subagentTokens,
    subagentMessageCount,
    webSearch: usage.webSearch,
    webFetch: usage.webFetch,
  };
}

// ── daily time series ────────────────────────────────────────────────────────

export function dailySeries(messages: MessageRecord[]): DailyRecord[] {
  const map = new Map<string, DailyRecord & { _sessions: Set<string> }>();
  for (const m of messages) {
    if (m.ts <= 0) continue;
    const date = dateKey(m.ts);
    let d = map.get(date);
    if (!d) {
      d = {
        date,
        usage: emptyUsage(),
        cost: 0,
        messageCount: 0,
        toolCallCount: 0,
        sessionCount: 0,
        tokensByModel: {},
        tokensBySource: {},
        _sessions: new Set<string>(),
      };
      map.set(date, d);
    }
    addUsage(d.usage, m.usage);
    d.cost += m.cost;
    d.messageCount++;
    d.toolCallCount += m.toolCalls.length;
    d._sessions.add(m.sessionId);
    const tt = totalTokens(m.usage);
    const key = modelKey(m.provider, m.model, m.rawModel);
    d.tokensByModel[key] = (d.tokensByModel[key] ?? 0) + tt;
    d.tokensBySource[m.source] = (d.tokensBySource[m.source] ?? 0) + tt;
  }
  const out = [...map.values()].map((d) => {
    d.sessionCount = d._sessions.size;
    const { _sessions, ...rest } = d;
    void _sessions;
    return rest;
  });
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

// ── breakdowns ───────────────────────────────────────────────────────────────

export function modelBreakdown(messages: MessageRecord[]): ModelRecord[] {
  const map = new Map<string, ModelRecord>();
  for (const m of messages) {
    const key = modelKey(m.provider, m.model, m.rawModel);
    let r = map.get(key);
    if (!r) {
      r = {
        key,
        model: m.model,
        label: m.modelLabel,
        color: modelColorFor(m.provider, m.model, key),
        source: m.source,
        provider: m.provider,
        messageCount: 0,
        usage: emptyUsage(),
        cost: 0,
        priced: isPricedFor(m.provider, m.model, m.rawModel),
      };
      map.set(key, r);
    }
    r.messageCount++;
    addUsage(r.usage, m.usage);
    r.cost += m.cost;
  }
  // Claude models keep their canonical order; other providers follow, by tokens.
  return [...map.values()].sort((a, b) => {
    const ai = a.provider === "anthropic" ? MODEL_ORDER.indexOf(a.model) : Infinity;
    const bi = b.provider === "anthropic" ? MODEL_ORDER.indexOf(b.model) : Infinity;
    if (ai !== bi) return ai - bi;
    return totalTokens(b.usage) - totalTokens(a.usage);
  });
}

// ── source (CLI tool) breakdown ──────────────────────────────────────────────

export interface SourceRecord {
  source: Source;
  label: string;
  color: string;
  messageCount: number;
  sessionCount: number;
  usage: TokenUsage;
  cost: number;
}

export function sourceBreakdown(messages: MessageRecord[]): SourceRecord[] {
  const map = new Map<Source, SourceRecord & { _sessions: Set<string> }>();
  for (const m of messages) {
    let r = map.get(m.source);
    if (!r) {
      r = {
        source: m.source,
        label: sourceLabel(m.source),
        color: sourceColor(m.source),
        messageCount: 0,
        sessionCount: 0,
        usage: emptyUsage(),
        cost: 0,
        _sessions: new Set<string>(),
      };
      map.set(m.source, r);
    }
    r.messageCount++;
    addUsage(r.usage, m.usage);
    r.cost += m.cost;
    r._sessions.add(m.sessionId);
  }
  const out = [...map.values()].map((r) => {
    r.sessionCount = r._sessions.size;
    const { _sessions, ...rest } = r;
    void _sessions;
    return rest;
  });
  out.sort((a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source));
  return out;
}

export function projectBreakdown(messages: MessageRecord[]): ProjectRecord[] {
  const map = new Map<string, ProjectRecord & { _sessions: Set<string> }>();
  for (const m of messages) {
    let p = map.get(m.projectPath);
    if (!p) {
      p = {
        projectPath: m.projectPath,
        projectName: projectDisplayName(m.projectPath),
        sessionCount: 0,
        messageCount: 0,
        toolCallCount: 0,
        usage: emptyUsage(),
        cost: 0,
        firstTs: m.ts || Infinity,
        lastTs: m.ts || -Infinity,
        _sessions: new Set<string>(),
      };
      map.set(m.projectPath, p);
    }
    p.messageCount++;
    p.toolCallCount += m.toolCalls.length;
    addUsage(p.usage, m.usage);
    p.cost += m.cost;
    p._sessions.add(m.sessionId);
    if (m.ts > 0) {
      if (m.ts < p.firstTs) p.firstTs = m.ts;
      if (m.ts > p.lastTs) p.lastTs = m.ts;
    }
  }
  const out = [...map.values()].map((p) => {
    p.sessionCount = p._sessions.size;
    if (!Number.isFinite(p.firstTs)) p.firstTs = 0;
    if (!Number.isFinite(p.lastTs)) p.lastTs = 0;
    const { _sessions, ...rest } = p;
    void _sessions;
    return rest;
  });
  out.sort((a, b) => totalTokens(b.usage) - totalTokens(a.usage));
  return out;
}

export function sessionList(
  messages: MessageRecord[],
  sessionMeta: Record<string, SessionMeta>,
): SessionRecord[] {
  const map = new Map<
    string,
    SessionRecord & { _models: Map<string, ModelTag> }
  >();
  for (const m of messages) {
    let s = map.get(m.sessionId);
    if (!s) {
      const meta = sessionMeta[m.sessionId];
      const projectPath = meta?.projectPath || m.projectPath;
      s = {
        sessionId: m.sessionId,
        source: meta?.source ?? m.source,
        projectPath,
        projectName: projectDisplayName(projectPath),
        firstTs: meta?.firstTs || (m.ts || 0),
        lastTs: meta?.lastTs || (m.ts || 0),
        durationMs: 0,
        messageCount: 0,
        toolCallCount: 0,
        userPromptCount: meta?.userPromptCount ?? 0,
        models: [],
        usage: emptyUsage(),
        cost: 0,
        subagentMessageCount: 0,
        isResumed: (meta?.fileCount ?? 1) > 1,
        title: meta?.title ?? null,
        _models: new Map<string, ModelTag>(),
      };
      map.set(m.sessionId, s);
    }
    s.messageCount++;
    s.toolCallCount += m.toolCalls.length;
    addUsage(s.usage, m.usage);
    s.cost += m.cost;
    const tag = tagOf(m);
    if (!s._models.has(tag.key)) s._models.set(tag.key, tag);
    if (m.isSidechain) s.subagentMessageCount++;
    if (m.ts > 0) {
      if (!s.firstTs || m.ts < s.firstTs) s.firstTs = m.ts;
      if (m.ts > s.lastTs) s.lastTs = m.ts;
    }
  }
  const out = [...map.values()].map((s) => {
    s.durationMs = s.lastTs && s.firstTs ? Math.max(0, s.lastTs - s.firstTs) : 0;
    s.models = [...s._models.values()].sort(
      (a, b) => MODEL_ORDER.indexOf(a.key as CanonicalModel) - MODEL_ORDER.indexOf(b.key as CanonicalModel),
    );
    const { _models, ...rest } = s;
    void _models;
    return rest;
  });
  out.sort((a, b) => b.lastTs - a.lastTs);
  return out;
}

// ── tools, subagents, branches, tiers ────────────────────────────────────────

export interface ToolStat {
  name: string;
  count: number;
}

export function toolBreakdown(messages: MessageRecord[]): {
  tools: ToolStat[];
  totalToolCalls: number;
  webSearch: number;
  webFetch: number;
} {
  const counts = new Map<string, number>();
  let total = 0;
  let webSearch = 0;
  let webFetch = 0;
  for (const m of messages) {
    for (const name of m.toolCalls) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
      total++;
    }
    webSearch += m.usage.webSearch;
    webFetch += m.usage.webFetch;
  }
  const tools = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return { tools, totalToolCalls: total, webSearch, webFetch };
}

export interface SubagentStat {
  agentType: string;
  messageCount: number;
  tokens: number;
  cost: number;
}

export function subagentBreakdown(messages: MessageRecord[]): SubagentStat[] {
  const map = new Map<string, SubagentStat>();
  for (const m of messages) {
    if (!m.isSidechain) continue;
    const key = m.agentType || "unknown";
    let s = map.get(key);
    if (!s) {
      s = { agentType: key, messageCount: 0, tokens: 0, cost: 0 };
      map.set(key, s);
    }
    s.messageCount++;
    s.tokens += totalTokens(m.usage);
    s.cost += m.cost;
  }
  return [...map.values()].sort((a, b) => b.tokens - a.tokens);
}

export function branchBreakdown(messages: MessageRecord[]): {
  branch: string;
  messageCount: number;
  tokens: number;
  cost: number;
}[] {
  const map = new Map<string, { branch: string; messageCount: number; tokens: number; cost: number }>();
  for (const m of messages) {
    const key = m.gitBranch || "(none)";
    let b = map.get(key);
    if (!b) {
      b = { branch: key, messageCount: 0, tokens: 0, cost: 0 };
      map.set(key, b);
    }
    b.messageCount++;
    b.tokens += totalTokens(m.usage);
    b.cost += m.cost;
  }
  return [...map.values()].sort((a, b) => b.tokens - a.tokens);
}

export function speedBreakdown(messages: MessageRecord[]): {
  speed: string;
  messageCount: number;
  tokens: number;
}[] {
  const map = new Map<string, { speed: string; messageCount: number; tokens: number }>();
  for (const m of messages) {
    const key = m.speed || "unknown";
    let s = map.get(key);
    if (!s) {
      s = { speed: key, messageCount: 0, tokens: 0 };
      map.set(key, s);
    }
    s.messageCount++;
    s.tokens += totalTokens(m.usage);
  }
  return [...map.values()].sort((a, b) => b.messageCount - a.messageCount);
}

// ── activity heatmap (hour × weekday) ────────────────────────────────────────

export interface HeatCell {
  weekday: number; // 0=Sun..6=Sat
  hour: number; // 0..23
  messages: number;
  tokens: number;
}

export function hourWeekdayHeatmap(messages: MessageRecord[]): {
  cells: HeatCell[];
  hourTotals: number[];
  weekdayTotals: number[];
} {
  const grid = new Map<string, HeatCell>();
  const hourTotals = new Array(24).fill(0);
  const weekdayTotals = new Array(7).fill(0);
  for (const m of messages) {
    if (m.ts <= 0) continue;
    const d = new Date(m.ts);
    const weekday = d.getDay();
    const hour = d.getHours();
    const key = `${weekday}:${hour}`;
    let c = grid.get(key);
    if (!c) {
      c = { weekday, hour, messages: 0, tokens: 0 };
      grid.set(key, c);
    }
    c.messages++;
    c.tokens += totalTokens(m.usage);
    hourTotals[hour]++;
    weekdayTotals[weekday]++;
  }
  return { cells: [...grid.values()], hourTotals, weekdayTotals };
}

// ── command history ──────────────────────────────────────────────────────────

export function commandStats(
  history: HistoryEntry[],
  f: Filters,
): {
  topCommands: { command: string; count: number }[];
  totalPrompts: number;
  totalCommands: number;
} {
  const counts = new Map<string, number>();
  let totalPrompts = 0;
  let totalCommands = 0;
  for (const h of history) {
    if (f.from != null && h.timestamp < f.from) continue;
    if (f.to != null && h.timestamp > f.to) continue;
    if (f.project && h.project !== f.project) continue;
    const d = h.display.trim();
    if (d.startsWith("/")) {
      const cmd = d.split(/\s+/)[0];
      counts.set(cmd, (counts.get(cmd) ?? 0) + 1);
      totalCommands++;
    } else {
      totalPrompts++;
    }
  }
  const topCommands = [...counts.entries()]
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count);
  return { topCommands, totalPrompts, totalCommands };
}

// ── per-session timeline (drill-down) ────────────────────────────────────────

export interface TimelinePoint {
  ts: number;
  timestamp: string;
  model: CanonicalModel;
  input: number;
  output: number;
  cacheCreate: number;
  cacheRead: number;
  cost: number;
  tools: string[];
  isSidechain: boolean;
  agentType: string | null;
}

export function sessionTimeline(messages: MessageRecord[]): TimelinePoint[] {
  return messages
    .slice()
    .sort((a, b) => a.ts - b.ts)
    .map((m) => ({
      ts: m.ts,
      timestamp: m.timestamp,
      model: m.model,
      input: m.usage.input,
      output: m.usage.output,
      cacheCreate: m.usage.cacheCreate,
      cacheRead: m.usage.cacheRead,
      cost: m.cost,
      tools: m.toolCalls,
      isSidechain: m.isSidechain,
      agentType: m.agentType,
    }));
}

// ── filter option lists (computed over the unfiltered snapshot) ───────────────

export interface FilterOptions {
  projects: { path: string; name: string; tokens: number }[];
  sources: { source: Source; label: string }[];
  models: CanonicalModel[];
  branches: string[];
  minTs: number | null;
  maxTs: number | null;
}

export function filterOptions(messages: MessageRecord[]): FilterOptions {
  const projects = projectBreakdown(messages).map((p) => ({
    path: p.projectPath,
    name: p.projectName,
    tokens: totalTokens(p.usage),
  }));
  const sources = sourceBreakdown(messages).map((s) => ({ source: s.source, label: s.label }));
  const models = modelBreakdown(messages).map((m) => m.model);
  const branchSet = new Set<string>();
  let minTs: number | null = null;
  let maxTs: number | null = null;
  for (const m of messages) {
    if (m.gitBranch) branchSet.add(m.gitBranch);
    if (m.ts > 0) {
      if (minTs == null || m.ts < minTs) minTs = m.ts;
      if (maxTs == null || m.ts > maxTs) maxTs = m.ts;
    }
  }
  return {
    projects,
    sources,
    models,
    branches: [...branchSet].sort(),
    minTs,
    maxTs,
  };
}
