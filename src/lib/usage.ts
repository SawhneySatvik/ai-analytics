import type { TokenUsage } from "./types";

export function emptyUsage(): TokenUsage {
  return {
    input: 0,
    output: 0,
    cacheCreate5m: 0,
    cacheCreate1h: 0,
    cacheCreate: 0,
    cacheRead: 0,
    webSearch: 0,
    webFetch: 0,
  };
}

/** Add `src` into `target` in place and return it. */
export function addUsage(target: TokenUsage, src: TokenUsage): TokenUsage {
  target.input += src.input;
  target.output += src.output;
  target.cacheCreate5m += src.cacheCreate5m;
  target.cacheCreate1h += src.cacheCreate1h;
  target.cacheCreate += src.cacheCreate;
  target.cacheRead += src.cacheRead;
  target.webSearch += src.webSearch;
  target.webFetch += src.webFetch;
  return target;
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * Read the FINAL token usage straight off `message.usage`.
 * Rule B: top-level usage is already the total; never sum `iterations[]`.
 */
export function extractUsage(raw: unknown): TokenUsage {
  const u = (raw ?? {}) as Record<string, unknown>;
  const cc = (u.cache_creation ?? {}) as Record<string, unknown>;
  const stu = (u.server_tool_use ?? {}) as Record<string, unknown>;
  return {
    input: num(u.input_tokens),
    output: num(u.output_tokens),
    cacheCreate5m: num(cc.ephemeral_5m_input_tokens),
    cacheCreate1h: num(cc.ephemeral_1h_input_tokens),
    cacheCreate: num(u.cache_creation_input_tokens),
    cacheRead: num(u.cache_read_input_tokens),
    webSearch: num(stu.web_search_requests),
    webFetch: num(stu.web_fetch_requests),
  };
}

/** All token types summed (input + output + cache create + cache read). */
export function totalTokens(u: TokenUsage): number {
  return u.input + u.output + u.cacheCreate + u.cacheRead;
}

/** Matches stats-cache.json's token definition: excludes cache reads. */
export function billableExCacheRead(u: TokenUsage): number {
  return u.input + u.output + u.cacheCreate;
}

export function cacheHitRate(u: TokenUsage): number {
  const denom = u.cacheRead + u.cacheCreate;
  return denom > 0 ? u.cacheRead / denom : 0;
}
