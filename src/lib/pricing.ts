import type { CanonicalModel, Provider, TokenUsage } from "./types";

// ───────────────────────────────────────────────────────────────────────────
// COST MODEL — the single source of truth for dollar estimates.
//
// Claude Code's local transcripts always record costUSD = 0, so the dashboard
// estimates cost itself from token counts. Rates are USD per MILLION tokens,
// split into the buckets Claude bills separately:
//   input        — uncached input
//   output       — generated output
//   cacheWrite5m — cache_creation.ephemeral_5m_input_tokens   (~1.25× input)
//   cacheWrite1h — cache_creation.ephemeral_1h_input_tokens   (~2×    input)
//   cacheRead    — cache_read_input_tokens                    (~0.1×  input)
//
// ⚠️  These are EDITABLE PLACEHOLDERS patterned on Anthropic's public pricing
//     ratios. Update them to the exact public $/MTok before trusting absolute
//     dollar figures — the bucket structure and multipliers are what matter.
//     This is the ONLY place rates live; everything downstream reads from here.
// ───────────────────────────────────────────────────────────────────────────

export interface ModelRates {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

export const PRICING: Record<CanonicalModel, ModelRates | null> = {
  "opus-4-8": { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.5 },
  "opus-4-7": { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.5 },
  "sonnet-4-6": { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.3 },
  "haiku-4-5": { input: 1, output: 5, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.1 },
  synthetic: null, // non-billable
  unknown: null, // unknown model -> cost 0, surfaced as a warning
};

const MILLION = 1_000_000;

/** Estimated USD for one message's token usage. Returns 0 for unpriced models. */
export function messageCostUSD(u: TokenUsage, model: CanonicalModel): number {
  const r = PRICING[model];
  if (!r) return 0;
  // If the 5m/1h split is missing on older lines, charge the whole creation
  // bucket at the 5m rate.
  const split = u.cacheCreate5m + u.cacheCreate1h;
  const write5m = split > 0 ? u.cacheCreate5m : u.cacheCreate;
  const write1h = split > 0 ? u.cacheCreate1h : 0;
  return (
    (u.input * r.input +
      u.output * r.output +
      write5m * r.cacheWrite5m +
      write1h * r.cacheWrite1h +
      u.cacheRead * r.cacheRead) /
    MILLION
  );
}

/**
 * Hypothetical cost if cache reads had been billed as full uncached input
 * (used to show "savings from caching"). Cache writes are treated as input too.
 */
export function uncachedCostUSD(u: TokenUsage, model: CanonicalModel): number {
  const r = PRICING[model];
  if (!r) return 0;
  const asInput = u.input + u.cacheCreate + u.cacheRead;
  return (asInput * r.input + u.output * r.output) / MILLION;
}

export function isPriced(model: CanonicalModel): boolean {
  return PRICING[model] != null;
}

// ───────────────────────────────────────────────────────────────────────────
// NON-CLAUDE COST — OpenAI / Codex pricing.
//
// Codex transcripts record token counts but no cost, so (like Claude) we
// estimate from tokens. OpenAI bills total output (reasoning included) at the
// output rate and cached input at a reduced rate; there is no cache-write
// bucket, so those rates are 0.
//
// ⚠️  EDITABLE PLACEHOLDERS patterned on public GPT-5-class pricing ratios.
//     Update to the exact public $/MTok before trusting absolute dollars.
// ───────────────────────────────────────────────────────────────────────────

const OPENAI_DEFAULT_RATES: ModelRates = {
  input: 1.25,
  output: 10,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  cacheRead: 0.125,
};

export const OPENAI_PRICING: Record<string, ModelRates> = {
  "gpt-5.5": { input: 1.25, output: 10, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.125 },
  "gpt-5.4": { input: 1.25, output: 10, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.125 },
  "gpt-5": { input: 1.25, output: 10, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.125 },
  "gpt-5-codex": { input: 1.25, output: 10, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.125 },
  "gpt-5-mini": { input: 0.25, output: 2, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.025 },
};

function normalizeOpenAIModel(rawModel: string): string {
  return rawModel.trim().toLowerCase().replace(/-\d{8}$/, "");
}

function openaiRates(rawModel: string): ModelRates {
  return OPENAI_PRICING[normalizeOpenAIModel(rawModel)] ?? OPENAI_DEFAULT_RATES;
}

/** True when an EXACT (non-default) rate is on file for this model. */
export function isPricedFor(provider: Provider, model: CanonicalModel, rawModel: string): boolean {
  if (provider === "anthropic") return isPriced(model);
  return OPENAI_PRICING[normalizeOpenAIModel(rawModel)] != null;
}

/** Estimated USD for one record's usage, dispatched on the model's provider. */
export function estimateCostUSD(
  u: TokenUsage,
  provider: Provider,
  model: CanonicalModel,
  rawModel: string,
): number {
  if (provider === "anthropic") return messageCostUSD(u, model);
  // OpenAI / Codex (and OpenCode openai-family fallback): cached input billed at
  // the reduced cacheRead rate; output already includes reasoning tokens.
  const r = openaiRates(rawModel);
  return (u.input * r.input + u.output * r.output + u.cacheRead * r.cacheRead) / MILLION;
}

/** uncachedCostUSD generalized across providers (for "cache savings"). */
export function uncachedCostFor(
  u: TokenUsage,
  provider: Provider,
  model: CanonicalModel,
  rawModel: string,
): number {
  if (provider === "anthropic") return uncachedCostUSD(u, model);
  const r = openaiRates(rawModel);
  const asInput = u.input + u.cacheCreate + u.cacheRead;
  return (asInput * r.input + u.output * r.output) / MILLION;
}
