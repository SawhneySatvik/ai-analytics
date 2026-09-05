import type { CanonicalModel, Provider, TokenUsage } from "./types";

// ───────────────────────────────────────────────────────────────────────────
// COST MODEL — the single source of truth for dollar estimates.
//
// Claude Code's local transcripts always record costUSD = 0, so the dashboard
// estimates cost itself from token counts. Rates are USD per MILLION tokens,
// split into the buckets Claude bills separately:
//   input        — uncached input
//   output       — generated output
//   cacheWrite5m — cache_creation.ephemeral_5m_input_tokens   (1.25× input)
//   cacheWrite1h — cache_creation.ephemeral_1h_input_tokens   (2×    input)
//   cacheRead    — cache_read_input_tokens                    (0.1×  input,
//                  except Fable 5.1 / Mythos 5.1 at 0.025×)
//
// VERIFIED against Anthropic's public pricing page.
//   source: https://platform.claude.com/docs/en/about-claude/pricing
//   fetched: 2026-09-06
//
// Every rate below is transcribed from that table, not derived from a
// multiplier — Fable 5.1 breaks the usual 0.1× cache-read rule, so deriving
// would be wrong. This is the ONLY place rates live.
// ───────────────────────────────────────────────────────────────────────────

export interface ModelRates {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

export const PRICING: Record<CanonicalModel, ModelRates | null> = {
  // current lineup
  "fable-5-1": { input: 10, output: 50, cacheWrite5m: 12.5, cacheWrite1h: 20, cacheRead: 0.25 },
  "mythos-5-1": { input: 10, output: 50, cacheWrite5m: 12.5, cacheWrite1h: 20, cacheRead: 0.25 },
  "opus-5": { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
  "sonnet-5": { input: 2, output: 10, cacheWrite5m: 2.5, cacheWrite1h: 4, cacheRead: 0.2 },
  "haiku-4-5": { input: 1, output: 5, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.1 },
  // legacy (still callable)
  "fable-5": { input: 10, output: 50, cacheWrite5m: 12.5, cacheWrite1h: 20, cacheRead: 1 },
  "mythos-5": { input: 10, output: 50, cacheWrite5m: 12.5, cacheWrite1h: 20, cacheRead: 1 },
  "opus-4-8": { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
  "opus-4-7": { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
  "opus-4-6": { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
  "opus-4-5": { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
  "sonnet-4-6": { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.3 },
  "sonnet-4-5": { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.3 },
  // retired (older transcripts only)
  "opus-4-1": { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.5 },
  "opus-4": { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.5 },
  "sonnet-4": { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.3 },
  "haiku-3-5": { input: 0.8, output: 4, cacheWrite5m: 1, cacheWrite1h: 1.6, cacheRead: 0.08 },
  synthetic: null, // non-billable
  unknown: null, // unrecognized model -> cost 0, surfaced as a warning
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
// NON-CLAUDE COST — OpenAI and open-weight model pricing.
//
// Codex transcripts record token counts but no cost, so (like Claude) we
// estimate from tokens. These providers bill total output (reasoning included)
// at the output rate and cached input at a reduced rate.
//
// VERIFIED against OpenAI's public pricing page.
//   source: https://developers.openai.com/api/docs/pricing
//   fetched: 2026-09-06
//
// Notes on what is NOT modelled here:
//  - Long-context tiers. Requests above 272k input tokens are billed at a
//    higher rate (gpt-6-astra $20/$75, gpt-5.6-sol $8/$30). Transcripts do not
//    record which tier a request landed in, so standard rates are used.
//  - Fast mode (~2× standard on gpt-6-astra) — likewise unrecorded.
// Both make estimates CONSERVATIVE (never overstated) for heavy users.
// ───────────────────────────────────────────────────────────────────────────

export const OPENAI_PRICING: Record<string, ModelRates> = {
  // GPT-6
  "gpt-6-astra": { input: 10, output: 50, cacheWrite5m: 12.5, cacheWrite1h: 0, cacheRead: 1 },
  // GPT-5.6 family
  "gpt-5.6-sol": { input: 4, output: 20, cacheWrite5m: 5, cacheWrite1h: 0, cacheRead: 0.4 },
  "gpt-5.6-terra": { input: 2, output: 12, cacheWrite5m: 2.5, cacheWrite1h: 0, cacheRead: 0.2 },
  "gpt-5.6-luna": { input: 0.2, output: 1.2, cacheWrite5m: 0.25, cacheWrite1h: 0, cacheRead: 0.02 },
  // GPT-5 series
  "gpt-5.5": { input: 5, output: 30, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.5 },
  "gpt-5.4": { input: 2.5, output: 15, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.25 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.075 },
  "gpt-5.4-nano": { input: 0.2, output: 1.25, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.02 },
  "gpt-5.3-codex": { input: 1.75, output: 14, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.175 },
  "gpt-5.2": { input: 1.75, output: 14, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.175 },
  "gpt-5.1": { input: 1.25, output: 10, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.125 },
  "gpt-5": { input: 1.25, output: 10, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.125 },
  "gpt-5-codex": { input: 1.25, output: 10, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.125 },
  "gpt-5-mini": { input: 0.25, output: 2, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.025 },
  "gpt-5-nano": { input: 0.05, output: 0.4, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.005 },
  // reasoning + legacy ids retained for older transcripts
  o3: { input: 2, output: 8, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.5 },
  "o3-mini": { input: 1.1, output: 4.4, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.55 },
  "o4-mini": { input: 1.1, output: 4.4, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.275 },
  o1: { input: 15, output: 60, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 7.5 },
  "gpt-4.1": { input: 2, output: 8, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.5 },
  "gpt-4o": { input: 2.5, output: 10, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 1.25 },
};

// ───────────────────────────────────────────────────────────────────────────
// OPEN-WEIGHT MODELS
//
// Open-weight models have no single price — the weights are free to download
// and every host charges differently. We therefore quote each model maker's
// OWN first-party API, which is the direct analogue of how Anthropic and
// OpenAI are sourced above. A model run locally (Ollama, llama.cpp, vLLM on
// your own box) has no marginal token cost; OpenCode records `cost: 0` for
// those and that recorded 0 is used as-is, so local stays free.
//
// Sources, all fetched 2026-09-06:
//   DeepSeek  https://api-docs.deepseek.com/quick_start/pricing
//   Kimi      https://platform.kimi.ai/docs/pricing
//   Z.ai GLM  https://docs.z.ai/guides/overview/pricing
//   Qwen      Alibaba Model Studio (International / Singapore endpoint)
//
// Two caveats worth knowing before trusting an absolute figure:
//  - DeepSeek bills PEAK at 2× the rates below (01:00-04:00 and 06:00-10:00
//    UTC, Mon-Fri; all other hours are off-peak). Transcripts do not record
//    the billing window, so the OFF-PEAK rate is stored — the majority of
//    hours. A peak-heavy workload costs up to 2× what is shown.
//  - Qwen rates are the International (Singapore) endpoint. The Chinese
//    Mainland (Beijing) endpoint is roughly 60-70% cheaper.
// ───────────────────────────────────────────────────────────────────────────

export const OSS_PRICING: Record<string, ModelRates> = {
  // DeepSeek — off-peak (see caveat above)
  "deepseek-v4-pro": { input: 0.66, output: 1.98, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.022 },
  "deepseek-v4-flash": { input: 0.22, output: 0.66, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.007 },
  "deepseek-v4-flash-vision-exp": { input: 0.22, output: 0.66, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.007 },
  // Moonshot Kimi
  "kimi-k3": { input: 3, output: 15, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.3 },
  "kimi-k2.6": { input: 0.95, output: 4, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.16 },
  // Z.ai GLM
  "glm-5.3": { input: 1.4, output: 4.4, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.26 },
  "glm-5.2": { input: 1.4, output: 4.4, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.26 },
  "glm-5.3-flash": { input: 0.075, output: 0.25, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.015 },
  // Alibaba Qwen
  "qwen3.8-max": { input: 2, output: 6, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0.25 },
};

/**
 * Normalize a raw model id for rate lookup.
 * - drops a provider prefix — OpenCode stores `providerID/modelID`
 *   (e.g. "deepseek/deepseek-v4-pro", "openai/gpt-6-astra")
 * - drops a trailing `-YYYYMMDD` snapshot suffix
 */
function normalizeRawModel(rawModel: string): string {
  return rawModel.trim().toLowerCase().split("/").pop()!.replace(/-\d{8}$/, "");
}

/**
 * Exact rates for a non-Anthropic model, or null when none are on file.
 *
 * Returning null (rather than defaulting to a mid-range model's rates) keeps
 * the app honest: an unrecognized model contributes $0 and raises the
 * "unpriced model" warning, instead of quietly inventing a plausible number.
 */
function nonAnthropicRates(rawModel: string): ModelRates | null {
  const id = normalizeRawModel(rawModel);
  return OPENAI_PRICING[id] ?? OSS_PRICING[id] ?? null;
}

/** True when an exact rate is on file for this model. */
export function isPricedFor(provider: Provider, model: CanonicalModel, rawModel: string): boolean {
  if (provider === "anthropic") return isPriced(model);
  return nonAnthropicRates(rawModel) != null;
}

/** Estimated USD for one record's usage, dispatched on the model's provider. */
export function estimateCostUSD(
  u: TokenUsage,
  provider: Provider,
  model: CanonicalModel,
  rawModel: string,
): number {
  if (provider === "anthropic") return messageCostUSD(u, model);
  // OpenAI / OpenCode: cached input bills at the reduced cacheRead rate and
  // output already includes reasoning tokens.
  //
  // Cache WRITES bill only where the provider charges for them — gpt-6-astra
  // and the gpt-5.6 family; every other entry here carries 0. This term is
  // live, not decorative: OpenCode maps `tokens.cache.write` into cacheCreate
  // (sources/opencode.ts), so an OpenCode record on one of those models that
  // carries no recorded cost now bills its cache writes instead of ignoring
  // them. Codex only ever populates cacheRead, so the term is 0 there.
  const r = nonAnthropicRates(rawModel);
  if (!r) return 0;
  return (
    (u.input * r.input +
      u.output * r.output +
      u.cacheCreate * r.cacheWrite5m +
      u.cacheRead * r.cacheRead) /
    MILLION
  );
}

/** uncachedCostUSD generalized across providers (for "cache savings"). */
export function uncachedCostFor(
  u: TokenUsage,
  provider: Provider,
  model: CanonicalModel,
  rawModel: string,
): number {
  if (provider === "anthropic") return uncachedCostUSD(u, model);
  const r = nonAnthropicRates(rawModel);
  if (!r) return 0;
  const asInput = u.input + u.cacheCreate + u.cacheRead;
  return (asInput * r.input + u.output * r.output) / MILLION;
}
