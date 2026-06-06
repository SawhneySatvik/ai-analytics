// Persona archetypes, achievement badges, and token milestones — derived purely
// from ShareStats. Shared by the web (/share, /badges) and the CLI Wrapped tab
// (via the @core alias) so the same data yields the same identity everywhere.

import type { ShareStats } from "./share";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// ── persona ──────────────────────────────────────────────────────────────────

export interface Persona {
  title: string; // e.g. "Night Owl Opus Maximalist"
  emoji: string;
  blurb: string;
  traits: string[];
}

function timeTrait(peakHour: number | null): { name: string; emoji: string; blurb: string } {
  if (peakHour == null) return { name: "Steady Coder", emoji: "⌨️", blurb: "you keep a steady pace" };
  if (peakHour >= 22 || peakHour <= 4) return { name: "Night Owl", emoji: "🦉", blurb: "you ship after dark" };
  if (peakHour <= 8) return { name: "Early Bird", emoji: "🐦", blurb: "you start before the world wakes" };
  if (peakHour <= 16) return { name: "Daylight Coder", emoji: "☀️", blurb: "you keep banker's hours" };
  return { name: "Evening Coder", emoji: "🌆", blurb: "you hit your stride after dinner" };
}

function modelTrait(stats: ShareStats): { name: string; emoji: string; blurb: string } {
  const top = stats.topModel;
  const pct = top?.pct ?? 0;
  const label = top?.label ?? "";
  const has = (s: string) => label.toLowerCase().includes(s);
  if (has("opus") && pct >= 0.5) return { name: "Opus Maximalist", emoji: "🧠", blurb: "and lean hard on Opus" };
  if (has("sonnet") && pct >= 0.5) return { name: "Sonnet Devotee", emoji: "🎼", blurb: "with Sonnet as your daily driver" };
  if (has("haiku") && pct >= 0.4) return { name: "Haiku Speedster", emoji: "⚡", blurb: "moving fast on Haiku" };
  if ((has("gpt") || has("codex")) && pct >= 0.5) return { name: "GPT Pilot", emoji: "🤖", blurb: "flying mostly on GPT" };
  if (stats.models.length >= 3 && pct < 0.5) return { name: "Polyglot", emoji: "🎭", blurb: "spreading across many models" };
  return { name: "Model Explorer", emoji: "🧪", blurb: "still finding your favorite model" };
}

export function derivePersona(stats: ShareStats): Persona {
  const t = timeTrait(stats.peakHour);
  const m = modelTrait(stats);
  return {
    title: `${t.name} ${m.name}`,
    emoji: t.emoji,
    blurb: `${t.blurb} ${m.blurb}.`,
    traits: [t.name, m.name],
  };
}

// ── badges ───────────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  hint: string; // how to earn it (shown when locked)
  earned: boolean;
  progress: number; // 0..1 toward earning
}

interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  hint: string;
  /** progress toward earning, 0..1 (earned when >= 1). */
  progress: (s: ShareStats) => number;
}

const avgMsgsPerSession = (s: ShareStats) => (s.sessions ? s.messages / s.sessions : 0);
const isOpusTop = (s: ShareStats) => !!s.topModel && s.topModel.label.toLowerCase().includes("opus");
const isHaikuTop = (s: ShareStats) => !!s.topModel && s.topModel.label.toLowerCase().includes("haiku");

export const BADGE_CATALOG: BadgeDef[] = [
  { id: "night-owl", emoji: "🦉", label: "Night Owl", desc: "Peak coding after 10pm", hint: "Code most between 10pm–4am",
    progress: (s) => (s.peakHour != null && (s.peakHour >= 22 || s.peakHour <= 4) ? 1 : 0) },
  { id: "early-bird", emoji: "🐦", label: "Early Bird", desc: "Peak coding before 9am", hint: "Code most between 5am–8am",
    progress: (s) => (s.peakHour != null && s.peakHour >= 5 && s.peakHour <= 8 ? 1 : 0) },
  { id: "opus-maximalist", emoji: "🧠", label: "Opus Maximalist", desc: "Over half your tokens on Opus", hint: "Send 50%+ of tokens to Opus",
    progress: (s) => (isOpusTop(s) ? clamp01((s.topModel!.pct) / 0.5) : 0) },
  { id: "haiku-speedster", emoji: "⚡", label: "Haiku Speedster", desc: "Lean heavily on Haiku", hint: "Send 30%+ of tokens to Haiku",
    progress: (s) => (isHaikuTop(s) ? clamp01((s.topModel!.pct) / 0.3) : 0) },
  { id: "polyglot", emoji: "🎭", label: "Polyglot", desc: "Spread across 3+ models", hint: "Use at least 3 models meaningfully",
    progress: (s) => clamp01(s.models.filter((m) => m.pct >= 0.05).length / 3) },
  { id: "cache-king", emoji: "💾", label: "Cache King", desc: "90%+ cache hit rate", hint: "Reach a 90% cache hit rate",
    progress: (s) => clamp01(s.cacheHitRate / 0.9) },
  { id: "cache-conscious", emoji: "♻️", label: "Cache Conscious", desc: "70%+ cache hit rate", hint: "Reach a 70% cache hit rate",
    progress: (s) => clamp01(s.cacheHitRate / 0.7) },
  { id: "weekend-warrior", emoji: "📅", label: "Weekend Warrior", desc: "35%+ of activity on weekends", hint: "Do 35%+ of your work on Sat/Sun",
    progress: (s) => clamp01(s.weekendPct / 0.35) },
  { id: "weekday-grinder", emoji: "🏗️", label: "Weekday Grinder", desc: "90%+ of activity on weekdays", hint: "Keep 90%+ of work on weekdays",
    progress: (s) => clamp01(s.weekdayPct / 0.9) },
  { id: "token-millionaire", emoji: "🪙", label: "Token Millionaire", desc: "1M+ tokens", hint: "Cross 1,000,000 tokens",
    progress: (s) => clamp01(s.totalTokens / 1e6) },
  { id: "token-titan", emoji: "💰", label: "Token Titan", desc: "1B+ tokens", hint: "Cross 1,000,000,000 tokens",
    progress: (s) => clamp01(s.totalTokens / 1e9) },
  { id: "big-spender", emoji: "💸", label: "Big Spender", desc: "$1k+ estimated", hint: "Cross $1,000 in estimated cost",
    progress: (s) => clamp01(s.cost / 1000) },
  { id: "whale", emoji: "🐋", label: "Whale", desc: "$5k+ estimated", hint: "Cross $5,000 in estimated cost",
    progress: (s) => clamp01(s.cost / 5000) },
  { id: "subagent-commander", emoji: "🛰️", label: "Subagent Commander", desc: "20%+ tokens via subagents", hint: "Route 20%+ of tokens through subagents",
    progress: (s) => clamp01(s.subagentPct / 0.2) },
  { id: "tool-master", emoji: "🛠️", label: "Tool Master", desc: "1,000+ tool calls", hint: "Make 1,000 tool calls",
    progress: (s) => clamp01(s.toolCalls / 1000) },
  { id: "marathoner", emoji: "🏃", label: "Marathoner", desc: "80+ messages per session", hint: "Average 80+ messages per session",
    progress: (s) => clamp01(avgMsgsPerSession(s) / 80) },
  { id: "consistent", emoji: "🔥", label: "Consistent", desc: "Active 30+ days", hint: "Stay active for 30 days",
    progress: (s) => clamp01(s.days / 30) },
];

/** All badges with earned/progress resolved, earned first then closest-to-earning. */
export function computeBadges(stats: ShareStats): Badge[] {
  return BADGE_CATALOG.map((b) => {
    const progress = clamp01(b.progress(stats));
    return { id: b.id, emoji: b.emoji, label: b.label, desc: b.desc, hint: b.hint, earned: progress >= 1, progress };
  }).sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress - a.progress);
}

// ── milestones ───────────────────────────────────────────────────────────────

export interface Milestone {
  achieved: { label: string; value: number } | null; // highest threshold reached
  next: { label: string; value: number } | null; // upcoming threshold
  current: number;
  pctToNext: number; // 0..1 toward `next`
}

const THRESHOLDS: { label: string; value: number }[] = [
  { label: "1M", value: 1e6 },
  { label: "10M", value: 1e7 },
  { label: "100M", value: 1e8 },
  { label: "1B", value: 1e9 },
  { label: "10B", value: 1e10 },
  { label: "100B", value: 1e11 },
];

export function nextMilestone(totalTokens: number): Milestone {
  let achieved: { label: string; value: number } | null = null;
  let next: { label: string; value: number } | null = null;
  for (const t of THRESHOLDS) {
    if (totalTokens >= t.value) achieved = t;
    else {
      next = t;
      break;
    }
  }
  const base = achieved?.value ?? 0;
  const span = (next?.value ?? base) - base || 1;
  return { achieved, next, current: totalTokens, pctToNext: next ? clamp01((totalTokens - base) / span) : 1 };
}
