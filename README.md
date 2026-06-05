# Coding CLI Usage Analytics

A local-first dashboard over your coding-CLI usage — tokens, cost (estimated),
models, projects, sessions, tools, cache behavior, and activity patterns. It reads
**Claude Code** (`~/.claude`), **OpenAI Codex CLI** (`~/.codex`), and **OpenCode**
(`~/.local/share/opencode`), with a `source` filter and per-tool breakdown to
compare them.

It reads the transcripts on **your machine** at request time and is not meant to be
deployed. Your usage data never leaves the device. (Because the server reads the
local filesystem, hosting it — e.g. on Vercel — would *not* let other people see
their own data; it stays a per-machine tool.)

## Run

```bash
cd analytics
npm install
npm run dev      # http://localhost:4477
```

`npm run build && npm start` runs the production build on the same port.

## How it works

- **Ingestion** (`src/lib/ingest.ts`) is a source-agnostic orchestrator: each CLI
  tool has its own loader under `src/lib/sources/` that discovers its files and
  normalizes them into one shared `MessageRecord` shape, tagged with a `source`.
  - **Claude** (`sources/claude.ts`) streams every `~/.claude/projects/**/*.jsonl`
    transcript (including nested `subagents/`), dedups resumed/forked lines by
    `uuid`, folds the multiple JSONL lines of one response into a single record per
    `message.id` (Claude writes one line per content block, all repeating the same
    `usage` — naive summing overcounts output ~4.7×), reads the final
    `message.usage` directly, and counts subagent/sidechain tokens.
  - **Codex** (`sources/codex.ts`) reads `~/.codex/sessions/**/rollout-*.jsonl` and
    derives per-turn usage by **diffing the cumulative `total_token_usage`** between
    `token_count` events (the per-event `last_token_usage` is unreliable on older
    builds), reconciling exactly to each session's final total. The model name comes
    from the `turn_context` lines.
  - **OpenCode** (`sources/opencode.ts`) reads the SQLite DB at
    `~/.local/share/opencode/opencode.db` via Node's built-in `node:sqlite` (no extra
    dependency), one record per assistant `message` from its `data` JSON. OpenCode
    persists a real USD `cost`, so that recorded value is used as-is instead of an
    estimate (`0` for free/local models is correct).
- **Caching** (`src/lib/cache.ts`) parses once and reuses the result until the files'
  mtime/size signature changes. The **Refresh** button forces a rebuild.
- **Aggregation** (`src/lib/aggregate.ts`) computes all summaries/breakdowns from the
  in-memory records, scoped by the global filters (date range, project, model,
  branch, main-vs-subagent).
- **Cost** (`src/lib/pricing.ts`) is the single editable source of dollar estimates
  for every tool — `PRICING` for Claude models, `OPENAI_PRICING` for Codex/GPT
  models. Transcripts record no usable cost, so it is computed from token counts.
  ⚠️ The rates are placeholders patterned on public pricing ratios — update them to
  the exact public `$/MTok` before trusting absolute dollar figures.

## Config

- `CLAUDE_HOME` — alternate Claude data dir (defaults to `~/.claude`).
- `CODEX_HOME` — alternate Codex data dir (defaults to `~/.codex`).
- `OPENCODE_HOME` — alternate OpenCode data dir (defaults to
  `~/.local/share/opencode`).
- `ANALYTICS_SOURCES` — comma-separated list of tools to ingest
  (e.g. `claude,codex,opencode`; defaults to all). Set `ANALYTICS_SOURCES=claude`
  to get the original Claude-only view.

## Notes

- Token totals exclude `cache_read` when cross-checking against
  `~/.claude/stats-cache.json` (that file uses the same definition); cost includes
  cache reads at their cheap rate.
- Day buckets use the machine's local timezone.
