# Coding CLI Usage Analytics

[![Star on GitHub](https://img.shields.io/github/stars/SawhneySatvik/ai-analytics?style=social)](https://github.com/SawhneySatvik/ai-analytics)

Built by **[Satvik Sawhney](https://satviksawhney.vercel.app)** · [GitHub](https://github.com/SawhneySatvik) — if you find this useful, please ⭐ the [repo](https://github.com/SawhneySatvik/ai-analytics).

A dashboard over your AI coding-CLI usage — tokens, cost (estimated), models,
projects, sessions, tools, cache behavior, and activity patterns. It reads
**Claude Code** (`~/.claude`), **OpenAI Codex CLI** (`~/.codex`), and **OpenCode**
(`~/.local/share/opencode`), with a `source` filter and per-tool breakdown to
compare them.

**Your data never leaves your device.** Every way of running this reads the
transcripts on *your* machine and aggregates them locally — there is no upload and
no analytics back-end.

## Three ways to use it

| | What | Reads your data |
| --- | --- | --- |
| **Local dashboard** | The full Next.js web app, run on your machine | The **server** reads `~/.claude` etc. at request time |
| **Hosted web** | A static site you can share as a URL (e.g. Vercel) | The **browser** reads the visitor's own files on-device (zero upload) |
| **Terminal TUI** | `npx agentmon` — a keyboard-driven dashboard in your terminal | Reads your data on-device |

Same data layer and the same numbers across all three — only *where the files are
read* differs.

---

## 1. Local dashboard

```bash
cd analytics
npm install
npm run dev      # http://localhost:4477
```

`npm run build && npm start` runs the production build on the same port.

The local app is **SSR**: the Node server reads your `~/.claude` / `~/.codex` /
OpenCode data directly, so it works with zero setup and always reflects the latest
transcripts (hit **Refresh** to re-ingest).

### Pages

Overview · Tools (per-source) · Models · Projects · Sessions · Tool Calls ·
Activity · Cache · **Share**. A global filter bar scopes everything by date range,
project, model, branch, source, and main-vs-subagent.

### Themes

Six curated themes via the header theme menu (+ an **Auto / system** option),
persisted with no flash on reload: **Midnight** (default dark), **Nord**, **Mono**,
**Paper**, **Rosé**, and **Solar**. Charts recolor per theme.

### Share cards

`/share` builds customizable, shareable stat cards (token totals, cache savings,
model journey, tool personality, …) and exports them to **PNG entirely
client-side** — pick a template, theme, and aspect ratio (OG / square / story),
optionally redact project names, then download or copy. Nothing is uploaded.

### Fast revisits

Navigations are instant after the first load: a stale-while-revalidate client cache
dedupes and shares `/api/*` requests across pages, and the server memoizes each
aggregation per snapshot signature.

---

## 2. Hosted web (client-side, zero upload)

A second build target produces a **static site** where the *browser* reads the
visitor's own files and does all ingestion + aggregation on-device — so you can host
one URL and anyone gets their own dashboard without installing anything.

```bash
npm run build:static   # -> out/   (no API routes; demo dataset bundled)
npx serve out          # preview locally
```

Deploy `out/` anywhere static. `vercel.json` is preconfigured (`framework: null`,
`buildCommand: npm run build:static`, output `out/`) — point Vercel at the repo and
it just works.

**Connecting data in the browser:**

- **Connect your home folder** (Chromium — Chrome/Edge): the File System Access
  picker opens at your home folder; select it and the app finds the *hidden*
  `~/.claude` and `~/.codex` inside automatically (nothing else on disk is read).
- **Upload / drag-and-drop** (every browser): pick or drop a folder / `.jsonl`
  files. A built-in "Can't find your folder?" helper shows how to reveal hidden
  folders for your OS.
- **Try the demo**: a bundled synthetic dataset so anyone can explore instantly.

Granted folders are remembered (IndexedDB) so you don't re-pick on return. Currently
covers **Claude + Codex**; OpenCode (SQLite) on the web is a follow-up.

> Generate/refresh the bundled demo with `npm run gen:demo`
> (→ `public/demo-snapshot.json`).

---

## 3. Terminal TUI — `agentmon`

A fast, fullscreen, keyboard-first dashboard for the same data, distributable via
`npx`:

```bash
npx agentmon
```

It reuses this repo's data layer (bundled in) and ships only `ink` + `react`. See
[`cli/README.md`](cli/README.md) for screens, keys, flags (`--json`, `--from`,
`--source`, …), and packaging.

---

## How it works

- **Ingestion** is a source-agnostic orchestrator: each CLI tool has its own loader
  under `src/lib/sources/` that discovers its files and normalizes them into one
  shared `MessageRecord` shape, tagged with a `source`. The **per-file parsing** is
  pure (`sources/claudeParse.ts`, `sources/codexParse.ts`) and shared by both the
  Node loaders and the in-browser ingest; `src/lib/snapshot.ts` (`finalizeSnapshot`)
  combines results, materializes cost, and sorts.
  - **Claude** streams every `~/.claude/projects/**/*.jsonl` transcript (including
    nested `subagents/`), dedups resumed/forked lines by `uuid`, folds the multiple
    JSONL lines of one response into a single record per `message.id` (Claude writes
    one line per content block, all repeating the same `usage` — naive summing
    overcounts output ~4.7×), reads the final `message.usage` directly, and counts
    subagent/sidechain tokens.
  - **Codex** reads `~/.codex/sessions/**/rollout-*.jsonl` and derives per-turn usage
    by **diffing the cumulative `total_token_usage`** between `token_count` events
    (the per-event `last_token_usage` is unreliable on older builds), reconciling
    exactly to each session's final total. The model name comes from `turn_context`.
  - **OpenCode** reads the SQLite DB at `~/.local/share/opencode/opencode.db` via
    Node's built-in `node:sqlite` (no extra dependency), one record per assistant
    `message`. OpenCode persists a real USD `cost`, so that value is used as-is
    (`0` for free/local models is correct). *Local/TUI only for now.*
- **Caching** (`src/lib/cache.ts`) parses once and reuses the result until the files'
  mtime/size signature changes. The **Refresh** button forces a rebuild.
- **Aggregation** (`src/lib/aggregate.ts`) computes all summaries/breakdowns from the
  in-memory records, scoped by the global filters. The same pure response builders
  (`src/lib/responses.ts`) back both the API routes and the in-browser static client,
  so the numbers are identical everywhere.
- **Cost** (`src/lib/pricing.ts`) is the single editable source of dollar estimates
  for every tool — `PRICING` for Claude models, `OPENAI_PRICING` for Codex/GPT
  models. Transcripts record no usable cost, so it is computed from token counts.
  ⚠️ The rates are placeholders patterned on public pricing ratios — update them to
  the exact public `$/MTok` before trusting absolute dollar figures.

## Config

Environment variables (apply to the local app and the TUI):

- `CLAUDE_HOME` — alternate Claude data dir (defaults to `~/.claude`).
- `CODEX_HOME` — alternate Codex data dir (defaults to `~/.codex`).
- `OPENCODE_HOME` — alternate OpenCode data dir (defaults to
  `~/.local/share/opencode`).
- `ANALYTICS_SOURCES` — comma-separated list of tools to ingest
  (e.g. `claude,codex,opencode`; defaults to all). Set `ANALYTICS_SOURCES=claude`
  for the Claude-only view.

## Scripts

```bash
npm run dev           # local dashboard (SSR) on :4477
npm run build         # local production build
npm start             # serve the local production build
npm run build:static  # export the hosted client-side site to out/
npm run gen:demo      # regenerate public/demo-snapshot.json
npm run lint
```

## Notes

- Token totals exclude `cache_read` when cross-checking against
  `~/.claude/stats-cache.json` (that file uses the same definition); cost includes
  cache reads at their cheap rate.
- Day buckets use the machine's (or visitor's) local timezone.
- Honors `prefers-reduced-motion`.

## Author

Built by **[Satvik Sawhney](https://satviksawhney.vercel.app)** —
[portfolio](https://satviksawhney.vercel.app) · [GitHub](https://github.com/SawhneySatvik).

If this is useful to you, please **[⭐ star the repo](https://github.com/SawhneySatvik/ai-analytics)** —
it genuinely helps.
