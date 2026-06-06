// Generates a small synthetic Snapshot for the hosted demo ("Try the demo").
// Pure Node, deterministic (seeded) so re-runs are stable. Emits the SAME
// Snapshot shape the real ingest produces (cost already materialized), so the
// dashboard renders it with zero special-casing.
//
//   node scripts/gen-demo.mjs  ->  public/demo-snapshot.json

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "demo-snapshot.json");

// ── deterministic RNG ────────────────────────────────────────────────────────
let seed = 0x9e3779b9;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const chance = (p) => rnd() < p;

// ── pricing (mirrors src/lib/pricing.ts for the demo's models) ───────────────
const MILLION = 1_000_000;
const RATES = {
  "opus-4-8": { input: 15, output: 75, w5: 18.75, w1: 30, read: 1.5 },
  "sonnet-4-6": { input: 3, output: 15, w5: 3.75, w1: 6, read: 0.3 },
  "haiku-4-5": { input: 1, output: 5, w5: 1.25, w1: 2, read: 0.1 },
  "gpt-5-codex": { input: 1.25, output: 10, w5: 0, w1: 0, read: 0.125 },
};
function costOf(u, key) {
  const r = RATES[key];
  return (
    (u.input * r.input +
      u.output * r.output +
      u.cacheCreate5m * r.w5 +
      u.cacheCreate1h * r.w1 +
      u.cacheRead * r.read) /
    MILLION
  );
}

function emptyUsage() {
  return {
    input: 0,
    output: 0,
    cacheCreate5m: 0,
    cacheCreate1h: 0,
    cacheCreate: 0,
    cacheRead: 0,
    reasoning: 0,
    webSearch: 0,
    webFetch: 0,
  };
}

// ── catalog ───────────────────────────────────────────────────────────────
const PROJECTS = [
  { path: "/Users/dev/work/web-dashboard", name: "web-dashboard" },
  { path: "/Users/dev/work/api-server", name: "api-server" },
  { path: "/Users/dev/work/mobile-app", name: "mobile-app" },
  { path: "/Users/dev/work/infra-scripts", name: "infra-scripts" },
  { path: "/Users/dev/oss/agentmon", name: "agentmon" },
];
const BRANCHES = ["main", "feature/auth", "fix/cache-bug", "refactor/api", "chore/deps"];
const TOOLS = ["Read", "Edit", "Bash", "Grep", "Glob", "Write", "Task", "WebSearch", "WebFetch"];
const AGENTS = ["code-reviewer", "Explore", "general-purpose"];
const CLAUDE_MODELS = [
  { model: "opus-4-8", raw: "claude-opus-4-8", label: "Opus 4.8", w: 0.4 },
  { model: "sonnet-4-6", raw: "claude-sonnet-4-6", label: "Sonnet 4.6", w: 0.45 },
  { model: "haiku-4-5", raw: "claude-haiku-4-5", label: "Haiku 4.5", w: 0.15 },
];
const PROMPTS = [
  "add a dark mode toggle to the settings page",
  "why is the build failing on CI?",
  "refactor the auth middleware to use the new token format",
  "write tests for the pricing module",
  "the dashboard is slow on first load — profile it",
  "add pagination to the sessions table",
  "fix the cache invalidation bug",
  "set up the deploy pipeline",
  "summarize what changed in this PR",
  "migrate the API routes to the new response builders",
];

function weightedModel() {
  const r = rnd();
  let acc = 0;
  for (const m of CLAUDE_MODELS) {
    acc += m.w;
    if (r <= acc) return m;
  }
  return CLAUDE_MODELS[0];
}

function uuid(n) {
  const hex = (len) => {
    let s = "";
    for (let i = 0; i < len; i++) s += Math.floor(rnd() * 16).toString(16);
    return s;
  };
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}-${n}`;
}

// ── generation ──────────────────────────────────────────────────────────────
const NOW = Date.now();
const DAY = 86_400_000;
const SPAN_DAYS = 75;

const messages = [];
const sessionMeta = {};
const history = [];
let lineCount = 0;
let assistantLineCount = 0;

const SESSIONS = 46;
for (let s = 0; s < SESSIONS; s++) {
  const project = pick(PROJECTS);
  const isCodex = chance(0.28);
  const source = isCodex ? "codex" : "claude";
  const provider = isCodex ? "openai" : "anthropic";
  const branch = pick(BRANCHES);

  // start time: bias to recent days + working hours/weekdays
  const daysAgo = Math.floor(Math.pow(rnd(), 1.6) * SPAN_DAYS);
  const start = new Date(NOW - daysAgo * DAY);
  start.setHours(between(8, 20), between(0, 59), 0, 0);
  // nudge weekends down
  if ((start.getDay() === 0 || start.getDay() === 6) && chance(0.6)) start.setDate(start.getDate() - 2);
  let ts = start.getTime();

  const sessionId = uuid(s);
  const turns = between(4, 22);
  let firstTs = Infinity;
  let lastTs = -Infinity;
  let userPromptCount = 0;
  let title = null;

  for (let t = 0; t < turns; t++) {
    // a user prompt precedes most turns
    if (chance(0.7)) {
      const prompt = pick(PROMPTS);
      if (!title) title = prompt;
      userPromptCount++;
      lineCount++;
      history.push({ display: prompt, timestamp: ts, project: project.path, sessionId });
    }

    // assistant turn
    const mdl = isCodex
      ? { model: "unknown", raw: "gpt-5-codex", label: "GPT-5 Codex", rateKey: "gpt-5-codex" }
      : (() => {
          const m = weightedModel();
          return { model: m.model, raw: m.raw, label: m.label, rateKey: m.model };
        })();

    const u = emptyUsage();
    u.input = between(200, 4000);
    u.output = between(150, 6000);
    if (isCodex) {
      u.reasoning = between(0, 3000);
      u.cacheRead = between(0, 40000);
    } else {
      u.cacheRead = between(2000, 220000);
      u.cacheCreate5m = between(0, 24000);
      u.cacheCreate1h = chance(0.25) ? between(0, 8000) : 0;
      u.cacheCreate = u.cacheCreate5m + u.cacheCreate1h;
    }

    const tools = [];
    const nTools = between(0, 5);
    for (let k = 0; k < nTools; k++) tools.push(pick(TOOLS));

    const isSidechain = !isCodex && chance(0.12);
    const cost = costOf(u, mdl.rateKey);

    const id = `${sessionId}:${t}`;
    messages.push({
      messageId: id,
      uuid: id,
      requestId: null,
      sessionId,
      projectPath: project.path,
      ts,
      timestamp: new Date(ts).toISOString(),
      source,
      provider,
      model: mdl.model,
      rawModel: mdl.raw,
      modelLabel: mdl.label,
      usage: u,
      isSidechain,
      agentType: isSidechain ? pick(AGENTS) : null,
      toolCalls: tools,
      serviceTier: null,
      speed: null,
      version: "1.0.0",
      gitBranch: branch,
      cost,
    });
    assistantLineCount++;
    lineCount += 1 + tools.length;

    ts += between(20_000, 600_000); // 20s–10min between turns
    if (ts < firstTs) firstTs = ts;
    if (ts > lastTs) lastTs = ts;
  }

  sessionMeta[sessionId] = {
    sessionId,
    source,
    projectPath: project.path,
    firstTs: start.getTime(),
    lastTs,
    userPromptCount,
    title,
    fileCount: 1,
  };
}

messages.sort((a, b) => a.ts - b.ts);
history.sort((a, b) => a.timestamp - b.timestamp);

const snapshot = {
  builtAt: NOW,
  buildMs: 0,
  messages,
  sessionMeta,
  history,
  fileCount: SESSIONS,
  lineCount,
  assistantLineCount,
  duplicateLineCount: between(20, 80),
  malformedLineCount: 0,
  distinctMessageCount: messages.length,
  warnings: [],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(snapshot));

const totalTokens = messages.reduce(
  (a, m) => a + m.usage.input + m.usage.output + m.usage.cacheCreate + m.usage.cacheRead,
  0,
);
const totalCost = messages.reduce((a, m) => a + m.cost, 0);
console.log(
  `demo-snapshot.json: ${messages.length} messages · ${SESSIONS} sessions · ` +
    `${(totalTokens / 1e6).toFixed(1)}M tokens · $${totalCost.toFixed(0)} · ${(JSON.stringify(snapshot).length / 1024).toFixed(0)} KB`,
);
