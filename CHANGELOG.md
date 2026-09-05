# Changelog

Notable changes to **agentmon** (the `agentmon` terminal CLI) and the web
dashboard. This project follows [Semantic Versioning](https://semver.org).
Everything is local-first — nothing leaves your machine.

## [0.1.1] — 2026-09-06 — pricing refresh

`agentmon` CLI 0.1.1. Branched off the deployed `main`. Pricing-only: no source
loaders, no UI work. (0.2.0 is reserved for the terminal-dashboard overhaul.)

### Fixed — models released since the last deploy were costing $0

`canonicalizeModel()` maps raw model strings through a hand-maintained lookup;
anything it misses falls through to `"unknown"`, which prices at **$0**. The
table had no entry for **Claude Opus 5** or **Claude Sonnet 5**, both released
after the last commit to `main`, so the largest part of most users' spend was
reported as zero. The dashboard did raise its amber "unpriced model" banner, but
the headline cost figure — the number people actually read — was silently short.

Measured against a real 869-file `~/.claude` corpus (141,744 priced assistant
messages): **141,683 of them are now priced, up from 408**, and the estimated
total moves from **$13.62 to $16,103.90**.

To stop this recurring, `canonicalizeModel()` now carries an explicit warning
that it is the one per-model map the compiler cannot enforce — every other map is
an exhaustive `Record<CanonicalModel, …>` that fails the build when incomplete.

### Changed — every rate verified against the vendor's own page

All rates are now transcribed from each vendor's public pricing page with the
source URL and fetch date cited inline (fetched **2026-09-06**). The
"⚠️ EDITABLE PLACEHOLDER" warnings are gone.

- **Anthropic** — full lineup: Fable 5.1, Mythos 5.1, Opus 5, Sonnet 5,
  Haiku 4.5, plus legacy (Fable/Mythos 5, Opus 4.8/4.7/4.6/4.5, Sonnet 4.6/4.5)
  and retired ids (Opus 4.1/4, Sonnet 4, Haiku 3.5) for older transcripts.
  - **Opus 4.8 / 4.7 corrected `$15/$75` → `$5/$25`** — they had been carrying
    the retired Opus 4.1-generation rate, overstating Opus cost 3×.
  - **Sonnet 5 is `$2/$10`.** The introductory price became permanent; the
    increase to `$3/$15` scheduled for 2026-09-01 was cancelled.
  - **Fable 5.1 / Mythos 5.1 break the usual cache-read rule** — `0.025×` base
    input ($0.25), not `0.1×`. Rates are transcribed, never derived, so this is
    correct rather than silently 4× high.
- **OpenAI** — **GPT-6 Astra** (`$10/$50`, released 2026-09-04) plus the GPT-5.6
  family (Sol `$4/$20`, Terra `$2/$12`, Luna `$0.20/$1.20`), GPT-5.4/5.3-codex/
  5.2/5.1, the mini/nano tiers, and the o-series. Note Sol is `$4/$20`; several
  third-party trackers list `$5/$30`.
- **Open-weight models** — new `OSS_PRICING` table quoting each maker's own
  first-party API, the same basis used for Anthropic and OpenAI: DeepSeek
  V4-Pro/V4-Flash, Kimi K3/K2.6, GLM-5.3/5.2/5.3-Flash, Qwen3.8-Max. Models run
  locally have no marginal token cost — OpenCode records `cost: 0` and that
  recorded zero is used as-is, so local stays free.

Deliberately not modelled, because transcripts do not record which tier a
request used: OpenAI long-context (>272k input) and fast-mode premiums, and
DeepSeek's 2× peak window (01:00–04:00 and 06:00–10:00 UTC, Mon–Fri — the
off-peak rate is stored). Qwen is the International/Singapore endpoint; the
Beijing endpoint is 60–70% cheaper. Each of these makes estimates conservative
rather than overstated.

### Changed — unrecognized models no longer get a guessed rate

`OPENAI_DEFAULT_RATES` silently charged *any* unrecognized non-Anthropic model at
GPT-5 rates while simultaneously flagging it as unpriced. That fabricated spend
and contradicted the warning. Unknown models now contribute `$0` and raise the
warning — the same honest behaviour the Anthropic path already had.

Rate lookup also strips OpenCode's `providerID/modelID` prefix, so
`deepseek/deepseek-v4-pro` resolves, and a trailing `-YYYYMMDD` snapshot suffix.

Non-Anthropic cache **writes** are now billed where the provider charges for them
(GPT-6 Astra, GPT-5.6 family; every other entry is 0). This is a real behaviour
change, not a no-op: OpenCode maps `tokens.cache.write` into `cacheCreate`, so an
OpenCode record on one of those models with no recorded cost previously had its
cache writes ignored and now has them billed. Codex only ever populates
`cacheRead`, so nothing changes there.

### Verification

Web `tsc` + `lint` + `next build` green; CLI `tsc` + `tsup` green (the TUI bundles
the same `src/lib` via the `@core` alias, so it inherits every rate). Rate tables
and canonicalization were additionally exercised against the real corpus through
the shipped modules — not a reimplementation.
