import type { CanonicalModel, Filters } from "./types";

const MODELS = new Set<CanonicalModel>([
  "opus-4-8",
  "opus-4-7",
  "sonnet-4-6",
  "haiku-4-5",
  "synthetic",
  "unknown",
]);

const DAY_MS = 86_400_000;

function parseBoundary(value: string | null, isEnd: boolean): number | undefined {
  if (!value) return undefined;
  // epoch milliseconds
  if (/^\d+$/.test(value)) return Number(value);
  const t = Date.parse(value);
  if (Number.isNaN(t)) return undefined;
  // date-only (YYYY-MM-DD): expand the end boundary to the end of that day
  if (isEnd && /^\d{4}-\d{2}-\d{2}$/.test(value)) return t + DAY_MS - 1;
  return t;
}

/** Build a Filters object from a request's query string. */
export function parseFilters(searchParams: URLSearchParams): Filters {
  const f: Filters = {};
  const from = parseBoundary(searchParams.get("from"), false);
  const to = parseBoundary(searchParams.get("to"), true);
  if (from != null) f.from = from;
  if (to != null) f.to = to;

  const project = searchParams.get("project");
  if (project) f.project = project;

  const model = searchParams.get("model");
  if (model && MODELS.has(model as CanonicalModel)) f.model = model as CanonicalModel;

  const branch = searchParams.get("branch");
  if (branch) f.branch = branch;

  const scope = searchParams.get("scope");
  if (scope === "main" || scope === "subagent" || scope === "all") f.scope = scope;

  return f;
}
