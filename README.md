# Claude Usage Analytics

A local-first dashboard over your `~/.claude` usage data — tokens, cost (estimated),
models, projects, sessions, tools, cache behavior, and activity patterns.

It reads the Claude Code transcripts on **your machine** at request time and is not
meant to be deployed. Your usage data never leaves the device.

## Run

```bash
cd analytics
npm install
npm run dev      # http://localhost:4477
```

`npm run build && npm start` runs the production build on the same port.

## How it works

- **Ingestion** (`src/lib/ingest.ts`) streams every `~/.claude/projects/**/*.jsonl`
  transcript (including nested `subagents/`), then:
  - dedups resumed/forked lines by `uuid`,
  - folds the multiple JSONL lines of one response into a single record per
    `message.id` (Claude writes one line per content block, all repeating the same
    `usage` — naive summing overcounts output ~4.7×),
  - reads the final `message.usage` directly (never sums `iterations[]`),
  - counts subagent/sidechain tokens, attributed to the parent session/project.
- **Caching** (`src/lib/cache.ts`) parses once and reuses the result until the files'
  mtime/size signature changes. The **Refresh** button forces a rebuild.
- **Aggregation** (`src/lib/aggregate.ts`) computes all summaries/breakdowns from the
  in-memory records, scoped by the global filters (date range, project, model,
  branch, main-vs-subagent).
- **Cost** (`src/lib/pricing.ts`) is the single editable source of dollar estimates.
  Local transcripts record `costUSD: 0`, so cost is computed from token counts.
  ⚠️ The rates are placeholders patterned on public pricing ratios — update them to
  the exact public `$/MTok` before trusting absolute dollar figures.

## Config

- `CLAUDE_HOME` — point at an alternate data dir (defaults to `~/.claude`).

## Notes

- Token totals exclude `cache_read` when cross-checking against
  `~/.claude/stats-cache.json` (that file uses the same definition); cost includes
  cache reads at their cheap rate.
- Day buckets use the machine's local timezone.
