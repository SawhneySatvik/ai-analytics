import type { CanonicalModel, Provider, Source } from "./types";

/**
 * Normalize a raw `message.model` string to a canonical key.
 * - strips a trailing `-YYYYMMDD` date suffix (claude-haiku-4-5-20251001 → claude-haiku-4-5)
 * - maps bare aliases ("opus"/"sonnet"/"haiku") to the current family member
 * - "<synthetic>" (and other angle-bracket placeholders) → "synthetic"
 */
export function canonicalizeModel(raw: string | undefined | null): CanonicalModel {
  if (!raw) return "unknown";
  const m = raw.trim();
  if (m.startsWith("<")) return "synthetic";
  const base = m.replace(/-\d{8}$/, "");
  const table: Record<string, CanonicalModel> = {
    "claude-opus-4-8": "opus-4-8",
    opus: "opus-4-8",
    "claude-opus-4-7": "opus-4-7",
    "claude-sonnet-4-6": "sonnet-4-6",
    sonnet: "sonnet-4-6",
    "claude-haiku-4-5": "haiku-4-5",
    haiku: "haiku-4-5",
  };
  return table[base] ?? "unknown";
}

export const MODEL_ORDER: CanonicalModel[] = [
  "opus-4-8",
  "opus-4-7",
  "sonnet-4-6",
  "haiku-4-5",
  "synthetic",
  "unknown",
];

export const MODEL_LABELS: Record<CanonicalModel, string> = {
  "opus-4-8": "Opus 4.8",
  "opus-4-7": "Opus 4.7",
  "sonnet-4-6": "Sonnet 4.6",
  "haiku-4-5": "Haiku 4.5",
  synthetic: "Synthetic",
  unknown: "Unknown",
};

/** Stable chart colors per model (HSL strings; readable on light + dark). */
export const MODEL_COLORS: Record<CanonicalModel, string> = {
  "opus-4-8": "hsl(217 91% 60%)",
  "opus-4-7": "hsl(263 70% 64%)",
  "sonnet-4-6": "hsl(158 64% 46%)",
  "haiku-4-5": "hsl(38 92% 56%)",
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
