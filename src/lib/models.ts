import type { CanonicalModel } from "./types";

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
