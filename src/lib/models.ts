import type { CanonicalModel, Provider, Source } from "./types";

/**
 * Normalize a raw `message.model` string to a canonical key.
 * - strips a trailing `-YYYYMMDD` date suffix (claude-haiku-4-5-20251001 → claude-haiku-4-5)
 * - maps bare aliases ("opus"/"sonnet"/"haiku") to the CURRENT family member
 * - "<synthetic>" (and other angle-bracket placeholders) → "synthetic"
 *
 * ⚠️  This table is the one place a new model must be registered by hand — every
 *     other per-model map is an exhaustive `Record<CanonicalModel, …>` that the
 *     compiler forces you to fill in. A model missing from HERE falls through to
 *     "unknown", which prices at $0. Keep it in step with PRICING in pricing.ts.
 */
export function canonicalizeModel(raw: string | undefined | null): CanonicalModel {
  if (!raw) return "unknown";
  const m = raw.trim();
  if (m.startsWith("<")) return "synthetic";
  const base = m.replace(/-\d{8}$/, "");
  const table: Record<string, CanonicalModel> = {
    // current lineup
    "claude-fable-5-1": "fable-5-1",
    "claude-mythos-5-1": "mythos-5-1",
    "claude-opus-5": "opus-5",
    "claude-sonnet-5": "sonnet-5",
    "claude-haiku-4-5": "haiku-4-5",
    // legacy
    "claude-fable-5": "fable-5",
    "claude-mythos-5": "mythos-5",
    "claude-opus-4-8": "opus-4-8",
    "claude-opus-4-7": "opus-4-7",
    "claude-opus-4-6": "opus-4-6",
    "claude-opus-4-5": "opus-4-5",
    "claude-sonnet-4-6": "sonnet-4-6",
    "claude-sonnet-4-5": "sonnet-4-5",
    // retired (older transcripts)
    "claude-opus-4-1": "opus-4-1",
    "claude-opus-4": "opus-4",
    "claude-sonnet-4": "sonnet-4",
    "claude-haiku-3-5": "haiku-3-5",
    // bare aliases resolve to the current member of each family
    fable: "fable-5-1",
    mythos: "mythos-5-1",
    opus: "opus-5",
    sonnet: "sonnet-5",
    haiku: "haiku-4-5",
  };
  return table[base] ?? "unknown";
}

// Most-capable first, then by recency within a family.
export const MODEL_ORDER: CanonicalModel[] = [
  "fable-5-1",
  "mythos-5-1",
  "fable-5",
  "mythos-5",
  "opus-5",
  "opus-4-8",
  "opus-4-7",
  "opus-4-6",
  "opus-4-5",
  "opus-4-1",
  "opus-4",
  "sonnet-5",
  "sonnet-4-6",
  "sonnet-4-5",
  "sonnet-4",
  "haiku-4-5",
  "haiku-3-5",
  "synthetic",
  "unknown",
];

export const MODEL_LABELS: Record<CanonicalModel, string> = {
  "fable-5-1": "Fable 5.1",
  "mythos-5-1": "Mythos 5.1",
  "fable-5": "Fable 5",
  "mythos-5": "Mythos 5",
  "opus-5": "Opus 5",
  "opus-4-8": "Opus 4.8",
  "opus-4-7": "Opus 4.7",
  "opus-4-6": "Opus 4.6",
  "opus-4-5": "Opus 4.5",
  "opus-4-1": "Opus 4.1",
  "opus-4": "Opus 4",
  "sonnet-5": "Sonnet 5",
  "sonnet-4-6": "Sonnet 4.6",
  "sonnet-4-5": "Sonnet 4.5",
  "sonnet-4": "Sonnet 4",
  "haiku-4-5": "Haiku 4.5",
  "haiku-3-5": "Haiku 3.5",
  synthetic: "Synthetic",
  unknown: "Unknown",
};

/** Stable chart colors per model (HSL strings; readable on light + dark). */
// One hue per family; lightness/saturation steps down with each older
// generation, so a family reads as a group and the current member is brightest.
export const MODEL_COLORS: Record<CanonicalModel, string> = {
  "fable-5-1": "hsl(330 82% 64%)",
  "mythos-5-1": "hsl(300 74% 66%)",
  "fable-5": "hsl(330 58% 52%)",
  "mythos-5": "hsl(300 52% 54%)",
  "opus-5": "hsl(217 91% 60%)",
  "opus-4-8": "hsl(222 76% 54%)",
  "opus-4-7": "hsl(263 70% 64%)",
  "opus-4-6": "hsl(245 64% 62%)",
  "opus-4-5": "hsl(255 52% 56%)",
  "opus-4-1": "hsl(263 42% 50%)",
  "opus-4": "hsl(272 36% 46%)",
  "sonnet-5": "hsl(158 70% 48%)",
  "sonnet-4-6": "hsl(158 64% 46%)",
  "sonnet-4-5": "hsl(172 56% 42%)",
  "sonnet-4": "hsl(186 50% 40%)",
  "haiku-4-5": "hsl(38 92% 56%)",
  "haiku-3-5": "hsl(28 68% 50%)",
  synthetic: "hsl(220 9% 55%)",
  unknown: "hsl(0 72% 58%)",
};

export function modelLabel(m: CanonicalModel): string {
  return MODEL_LABELS[m] ?? m;
}

export function modelColor(m: CanonicalModel): string {
  return MODEL_COLORS[m] ?? MODEL_COLORS.unknown;
}

// ── source (CLI tool) identity ───────────────────────────────────────────────

export const SOURCE_ORDER: Source[] = ["claude", "codex", "opencode"];

export const SOURCE_LABELS: Record<Source, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  opencode: "OpenCode",
};

export const SOURCE_COLORS: Record<Source, string> = {
  claude: "hsl(24 95% 58%)", // Anthropic-ish amber
  codex: "hsl(158 64% 46%)", // OpenAI-ish green
  opencode: "hsl(217 91% 60%)",
};

export function sourceLabel(s: Source): string {
  return SOURCE_LABELS[s] ?? s;
}

export function sourceColor(s: Source): string {
  return SOURCE_COLORS[s] ?? MODEL_COLORS.unknown;
}

// ── free-form (non-Claude) model identity ────────────────────────────────────

/**
 * Stable grouping key for a model. Claude uses its canonical key so existing
 * breakdowns are unchanged; other providers key by `provider:rawModel` so two
 * distinct models never collapse into one "unknown" row.
 */
export function modelKey(provider: Provider, model: CanonicalModel, rawModel: string): string {
  return provider === "anthropic" ? model : `${provider}:${rawModel || "unknown"}`;
}

/** Deterministic, readable HSL color derived from an arbitrary label. */
export function labelColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 55%)`;
}

/** Chart color for a model record from any source. */
export function modelColorFor(provider: Provider, model: CanonicalModel, key: string): string {
  return provider === "anthropic" ? modelColor(model) : labelColor(key);
}

/** Prettify a raw model id for display, e.g. "gpt-5.5" → "GPT-5.5". */
export function prettyModelLabel(rawModel: string): string {
  if (!rawModel) return "Unknown";
  return rawModel
    .split("/")
    .pop()!
    .replace(/^gpt/i, "GPT")
    .replace(/^o(\d)/i, "o$1")
    .replace(/^claude-/i, "Claude ");
}
