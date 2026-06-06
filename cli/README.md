# agentmon

A fast terminal dashboard for your local AI coding usage — **Claude Code**, **OpenAI Codex**, and **OpenCode** — in one place. Reads your data on-device; nothing ever leaves your machine.

```bash
npx agentmon
```

<!-- screenshot -->

## Why

You already generate a goldmine of usage data locally (`~/.claude`, `~/.codex`, OpenCode's SQLite). `agentmon` turns it into an instant, keyboard-driven dashboard right in your terminal — tokens, cost, models, projects, sessions, and when you actually work.

## Install

Run it directly (no install):

```bash
npx agentmon
```

Or install globally:

```bash
npm i -g agentmon
agentmon
```

Requires **Node 18+** (Node **22.6+** to include OpenCode, which uses the built-in `node:sqlite`; otherwise OpenCode is skipped automatically).

## Screens

| Screen | What it shows |
| --- | --- |
| **Overview** | Headline KPIs, a tokens-per-day sparkline, and your top models / projects / tools |
| **Models** | Per-model tokens, cost, and share |
| **Projects** | Every project ranked; press <kbd>Enter</kbd> to drill into its sessions |
| **Sessions** | Recent sessions; press <kbd>Enter</kbd> for a detail view (timeline, tools, models) |
| **Activity** | An hour × weekday heatmap plus by-hour and by-weekday breakdowns |

## Keys

```
1–5 / Tab / ← →   switch screens        ↑ ↓  or  j k   move selection
Enter             open detail           Esc            back
f   date range    s   source (CLI)      m   heatmap metric (Activity)
r   refresh       ?   help              q / Ctrl-C      quit
```

## Options

```
agentmon [options]

  --from <range>    all | 24h | 7d | 14d | 30d   (default: all)
  --source <tool>   claude | codex | opencode     (default: all)
  --scope <scope>   all | main | subagent         (default: all)
  --json            print a JSON summary and exit (great for scripts/CI)
  --no-color        disable colors (also honors NO_COLOR)
  -h, --help        show help
  -v, --version     print version
```

When stdout isn't a TTY (e.g. piped), `agentmon` prints a concise text summary instead of the interactive UI. `--json` emits the full numbers for scripting.

## Configuration

Point it at non-default data directories or limit the sources via env vars:

```
CLAUDE_HOME        alternate Claude dir   (default: ~/.claude)
CODEX_HOME         alternate Codex dir    (default: ~/.codex)
OPENCODE_HOME      alternate OpenCode dir (default: ~/.local/share/opencode)
ANALYTICS_SOURCES  comma list, e.g. claude,codex   (default: all)
```

## Privacy

Everything runs locally. `agentmon` only reads your own usage files and renders them in your terminal — there is no network call and nothing is uploaded.
