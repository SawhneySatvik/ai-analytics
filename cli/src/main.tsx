import { render } from "ink";

import { App, RANGES, SOURCES, type InitialOptions } from "./app.js";
import { loadSnapshot, derive, tok, type Filters, type Derived } from "./data.js";
import type { Snapshot } from "@core/types";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@core/format";

const VERSION = "0.1.0";

const HELP = `agentmon — terminal dashboard for your AI coding usage

Usage
  agentmon [options]

Options
  --from <range>     all | 24h | 7d | 14d | 30d        (default: all)
  --source <tool>    claude | codex | opencode          (default: all)
  --scope <scope>    all | main | subagent              (default: all)
  --json             print a JSON summary and exit (no TUI)
  --no-color         disable colors
  -h, --help         show this help
  -v, --version      print version

Keys (in the TUI)
  1-5 / Tab / arrows  switch screens      up/down or j k  move selection
  Enter               open detail         Esc             back
  f  date range       s  source           r  refresh
  ?  help             q / Ctrl-C  quit

Reads ~/.claude, ~/.codex and OpenCode on-device. Nothing leaves your machine.
`;

function optValue(argv: string[], name: string, def: string): string {
  const i = argv.indexOf(name);
  const next = argv[i + 1];
  return i >= 0 && next && !next.startsWith("-") ? next : def;
}

export async function main(argv: string[]): Promise<void> {
  const has = (f: string) => argv.includes(f);
  if (has("-h") || has("--help")) {
    process.stdout.write(HELP);
    return;
  }
  if (has("-v") || has("--version")) {
    process.stdout.write(`agentmon ${VERSION}\n`);
    return;
  }

  const rangeArg = optValue(argv, "--from", "all").toLowerCase();
  const sourceArg = optValue(argv, "--source", "all").toLowerCase();
  const scopeArg = optValue(argv, "--scope", "all").toLowerCase();
  const scope = (["all", "main", "subagent"].includes(scopeArg) ? scopeArg : "all") as InitialOptions["scope"];

  let rangeIdx = RANGES.findIndex((r) => r.label.toLowerCase() === rangeArg);
  if (rangeIdx < 0) rangeIdx = 0;
  let sourceIdx = SOURCES.findIndex((s) => (s ?? "all") === sourceArg);
  if (sourceIdx < 0) sourceIdx = 0;
  const initial: InitialOptions = { rangeIdx, sourceIdx, scope };

  // Non-interactive paths: --json, or when either stream is not a TTY (piped
  // output, or no interactive stdin — Ink's keyboard handling needs raw mode).
  if (has("--json") || !process.stdout.isTTY || !process.stdin.isTTY) {
    const filters: Filters = {
      from: RANGES[rangeIdx].days ? Date.now() - RANGES[rangeIdx].days! * 86_400_000 : undefined,
      source: (SOURCES[sourceIdx] ?? undefined) as Filters["source"],
      scope,
    };
    const snap = await loadSnapshot(false);
    const d = derive(snap, filters);
    if (has("--json")) printJson(snap, d);
    else printStatic(d);
    return;
  }

  const app = render(<App initial={initial} />);
  await app.waitUntilExit();
}

function printJson(snap: Snapshot, d: Derived): void {
  const out = {
    builtAt: snap.builtAt,
    summary: d.summary,
    models: d.models.map((m) => ({ key: m.key, label: m.label, messages: m.messageCount, tokens: tok(m.usage), cost: m.cost })),
    sources: d.sources.map((s) => ({ source: s.source, label: s.label, messages: s.messageCount, tokens: tok(s.usage), cost: s.cost })),
    topProjects: d.projects.slice(0, 10).map((p) => ({ name: p.projectName, tokens: tok(p.usage), cost: p.cost, sessions: p.sessionCount })),
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

function printStatic(d: Derived): void {
  const s = d.summary;
  const top = [...d.models].sort((a, b) => tok(b.usage) - tok(a.usage))[0];
  const lines = [
    "agentmon — AI coding usage",
    `  Tokens     ${fmtCompact(s.totalTokens)}`,
    `  Est. cost  ${fmtUSD(s.cost)}`,
    `  Messages   ${fmtNum(s.messageCount)}`,
    `  Sessions   ${fmtNum(s.sessionCount)}`,
    `  Projects   ${fmtNum(s.projectCount)}`,
    `  Cache hit  ${fmtPct(s.cacheHitRate)}`,
    top ? `  Top model  ${top.label} (${fmtPct(tok(top.usage) / (s.totalTokens || 1))})` : "",
    "",
    "  (run in an interactive terminal for the full dashboard)",
  ].filter(Boolean);
  process.stdout.write(lines.join("\n") + "\n");
}
