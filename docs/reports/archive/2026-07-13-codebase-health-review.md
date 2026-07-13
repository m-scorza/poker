---
status: resolved
date: 2026-07-13
related:
  - docs/reports/archive/2026-07-12-codebase-health-review.md
  - docs/reports/archive/2026-07-01-abyss-audit.md
note: >
  Archived on creation (scheduled run of 2026-07-13). The gate is fully
  green and the report-lag class is resolved this period. The one substantive
  new finding — the strategy-profile selector has never existed, so the
  dual-profile feature is unreachable and STATUS/CLAUDE claimed a UI that was
  never there — was fixed at the doc level in this PR and the selector work
  steered into ROADMAP Act III-5. Nothing is left open here.
---

# Codebase Health Review — 2026-07-13

Scheduled health review, run against `main` @ `ae20052` (17 commits / 17 PRs
after the 07-12 review's baseline `061cbfd`: #175–#192). **Graphify was
unavailable this run** — same as every prior remote run: no Graphify index or
tooling exists in a fresh container (`graphify-out/` is gitignored by policy,
PR #65). Every conclusion below comes from direct inspection: the full
verification gate executed in-container, `madge`, `knip`, layering greps,
line-by-line review of the period's substantive diffs, and history archaeology
(`git log -S`) for the headline finding.

## Codebase Health Summary

- **Overall health: excellent — gate fully green, all quality trends flat or
  improving.** In-container: `docs:check`, `typecheck`, `typecheck:test`,
  `lint` (0/0), **1022/1022 tests (99 files, ~29 s; +75 tests, +8 files)**,
  production build OK (shell 376.68 KB, flat; precache 1 760.24 KiB, −1.3),
  `madge --circular` clean (256 modules, +10). The abyss audit (#116→#190)
  and the post-fable x-ray both closed this period; the reports index shows
  **zero open reports** for the first time in the series.
- **Main risks:** (1) the **dual-profile feature is dark** — `strategyProfile`
  is pinned to `game_plan` because `setStrategyProfile` has *never* had a UI
  call site in the repo's history, while STATUS.md and CLAUDE.md claimed a
  selector "in Sidebar.tsx" (docs fixed in this PR; selector steered to
  ROADMAP III-5). (2) knip is still not wired into CI (sixth consecutive
  run), though this period produced **zero new dead-export refill** — the
  first quiet period since 07-10. (3) `chipAmount` is still adopted at one
  render site (UIR-002 open, tracked).
- **Highest-impact improvement:** ship the III-5 settings editors (hero name
  + strategy profile) — one small UI unlocks an entire tested-but-unreachable
  feature tier (`advanced` thresholds/C-bet/leak targets, now covered by a
  291-line suite from #186) and closes abyss F2.
- **Confidence level:** high — all claims verified by executing the gate or
  reading source, diffs, and history. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-fg1tgr`, identical to
  `origin/main` @ `ae20052` at review start (0 ahead / 0 behind after fetch).
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none at start; this PR's doc fixes + report only.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from all prior remote runs; index is local-only by policy, no
  tooling installed to regenerate. Substituted with madge (dependency
  graph/cycles), knip (reachability), grep (layering direction), build output
  (chunk clustering), `wc -l` (hotspots), and `git log -S` (history).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** `src/parser/`, `src/analysis/`, `src/data/`,
  `src/pages/`, `src/components/` (now 9 subdirs: arena, blackout, career,
  coach, dashboard, hands, layout, ranges, shared). New modules this period:
  `data/rangeExpansion.ts` (#183), `utils/sessionRows.ts` (#176), four
  `utils/__tests__` suites (#180/#185), three `data/__tests__` +
  one `parser/__tests__` suite (#186/#190).
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; `scripts/*` hooks and fleet CLIs.
- **Core modules / hotspots (lines):** `curriculumSeedPacks.generated.ts`
  2 514 (generated), `spotPacket.ts` 1 288, `ArenaPage.tsx` 998, `store.ts`
  790, `pokerstars.ts` 718 (+1), `HandReplay.tsx` 697 — all flat vs 07-12;
  no non-generated file above 1 300 lines.
- **Dependency clusters:** parser → analysis → pages remains unidirectional
  in production code. **New cross-layer edge this period:** five parser
  modules import `DEFAULT_HERO_NAME` from `data/localStorage.ts` (#190) —
  verified safe: `localStorage.ts` has literally zero imports (a true leaf),
  so no worker-bundle contamination and no cycle (madge clean).
- **Highly connected files:** `data/localStorage.ts` gained 5 new dependents;
  `analysis/arena/drillLogic.ts` is the shared core under both the pages
  shims and `arenaDrillEngine`.
- **Isolated or orphaned areas:** knip's four `scripts/` "unused files" —
  same false positives as every prior run (SessionStart hook, fleet CLIs,
  manual generator).
- **Suspicious dependency relationships:** one test-layer wart —
  `analysis/__tests__/arenaDrillEngine.test.ts:7` imports
  `pickRandomDecision` from `pages/arena/actionOptions` (the shim) instead of
  `analysis/arena/drillLogic` (the real home), keeping the shim artificially
  load-bearing (Finding 3).
- **Complexity or metric hotspots:** shell chunk 376.68 KB (+0.04, flat,
  under budget — `check:bundle-budget` green); `pdfExport` lazy chunk
  432.39 KB (−0.46, lazy); precache 1 760.24 KiB (−1.3).

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All gate commands executed in-container (exit 0) | Green: 1022/1022 tests (99 files), lint 0/0, build OK, shell 376.68 KB |
| Dependency graph | Cycle check after 10 new modules | `npx madge --circular` (256 modules) | No cycles |
| Layering direction | Recurring check | grep for `pages/` imports across analysis/data/parser/utils | Production code: zero hits. One **test** import of a pages shim (Finding 3) |
| #190 hero-name consolidation | 5 new parser→data edges | `localStorage.ts` full header + import grep; commit diff | Sound: target is a zero-import leaf; constants-only edge; zero behavior change |
| #183 range expansion | Touches critical `ranges.ts`/`pushFoldRanges.ts` | New `rangeExpansion.ts` full read + diff | Sound: byte-identical helper extraction; membership pinned by 209 range tests |
| #176 sessionRows extraction | CSV/PDF row duplication removed | `sessionRows.ts` full read, `csvExport.ts` head | Sound: options-injected row builder; direct suites added (#180/#185) |
| New test suites (#180/#182/#185/#186/#190) | Yesterday's §6 recommendation | `format.test.ts` (chipAmount boundaries), `appStore.test.ts` characterizations | Closed exactly as recommended — `385.00000000000006`, `87.5`, `0`, negatives, non-finite all asserted |
| Settings/config reality | STATUS.md:47 claimed a Sidebar selector | `Sidebar.tsx` full read (57 lines); `git log -S setStrategyProfile --all`; `appStore.ts:94,104` | **No settings UI exists; never did** (Finding 1) |
| heroName whitespace path | #190's characterization finding | `appStore.ts:34,104`, `Layout.tsx:60-66`, `useImportPipeline.ts:99,423` | Theoretical today (no write UI); becomes a real footgun when III-5 wires editors — noted in ROADMAP |
| Dead code | Refill check without CI gate | `npx knip` | **Zero new refill** — same 4 unused exports and 52 unused types as 07-12; 4 scripts false positives unchanged |
| Report/doc coherence | Report-lag class (5 prior instances) | `git log 061cbfd..ae20052 -- docs/reports/` vs landed scope | **Resolved this period**: #181, #184, #191, #192 recorded every wave slice; abyss + x-ray closed with per-item dispositions |

## Confirmed Findings

#### Finding 1: dual-profile feature unreachable — the strategy-profile selector never existed

- **Status:** New (the underlying gap predates the review series; the *claim*
  it was shipped has been in STATUS.md/CLAUDE.md since at least 2026-05-31)
- **Priority:** Medium (product feature dark; no correctness impact — the
  `game_plan` default is the documented beginner baseline)
- **Evidence:** `Sidebar.tsx` (57 lines, full read) contains no input or
  selector; `git log -S setStrategyProfile --all` shows the setter has never
  been referenced from any component or page in the repo's entire history;
  `appStore.ts:94` pins the default to `'game_plan'`. Meanwhile
  STATUS.md:47 said "strategy profile selector is in `Sidebar.tsx`" and
  CLAUDE.md:408-409 said config "lives in Sidebar.tsx".
- **Affected files/modules:** `docs/product/STATUS.md`, `CLAUDE.md`,
  `docs/product/ROADMAP.md` (III-5), `src/data/appStore.ts`,
  `src/components/layout/Sidebar.tsx`.
- **Graphify signal:** n/a; found by cross-checking docs against source and
  history.
- **Direct code confirmation:** yes (full Sidebar read + history search).
- **Why it matters:** the `advanced` profile's thresholds, C-bet logic, and
  leak targets — newly covered by a 291-line suite (#186) — are tested,
  documented, and completely unreachable by users. Worse, the docs told every
  agent the selector existed, inviting "it's already shipped" reasoning.
- **Recommended action:** done in this PR at the doc level (STATUS.md and
  CLAUDE.md corrected; ROADMAP III-5 scope extended to include the selector
  with an input-normalization note). Product fix ships with III-5.

#### Finding 2: knip still not wired into CI — but zero refill this period

- **Status:** Recurring (sixth consecutive run), **not worsened** — for the
  first time since 07-10, a full 17-PR period produced no new dead exports
  (knip: 4 unused exports and 52 unused types, byte-identical to 07-12).
- **Priority:** Medium (downgraded from High trajectory — the refill signal
  paused, but two prior periods proved decay resumes without a gate)
- **Evidence:** `.github/workflows/ci.yml` steps (lines 27–51) contain no
  knip invocation; `npx knip` output diffed against the 07-12 record.
- **Affected files/modules:** `.github/workflows/ci.yml`, `package.json`,
  ROADMAP P5.
- **Graphify signal:** knip (substitute tool).
- **Direct code confirmation:** yes.
- **Why it matters:** the carried dead exports (`saveHeroName` — store.ts:683,
  now 4 runs; `writeStarterDiagnosticSummary` — starterDiagnostic.ts:130, 4
  runs; `labelSeedAction` — actionOptions.ts:7 and `shouldCbet` —
  drillPool.ts:8, 2 runs) never get trimmed precisely because nothing fails
  when they linger. Note `saveHeroName` stops being dead the moment III-5
  lands — it is the intended write path.
- **Recommended action:** wire `knip` into CI with the known 4-file scripts
  allowlist (ROADMAP P5); trim `labelSeedAction`/`shouldCbet` re-exports on
  the next Arena touch.

#### Finding 3: analysis-layer test imports a pages shim

- **Status:** New
- **Priority:** Low
- **Evidence:** `src/analysis/__tests__/arenaDrillEngine.test.ts:7` —
  `import { pickRandomDecision } from '../../pages/arena/actionOptions'` —
  while the engine under test imports the same symbol from
  `./arena/drillLogic` (arenaDrillEngine.ts:22). The shim re-export
  (actionOptions.ts:7) exists only "so consumers are unchanged," and this
  test is now its sole consumer of `pickRandomDecision`.
- **Affected files/modules:** `src/analysis/__tests__/arenaDrillEngine.test.ts`,
  `src/pages/arena/actionOptions.ts`, `src/pages/arena/drillPool.ts`.
- **Graphify signal:** layering grep (substitute); knip cannot see it because
  the test import keeps the re-export "used."
- **Direct code confirmation:** yes.
- **Why it matters:** it inverts test-layer dependency direction
  (analysis test → pages) and masks the shim's true deadness — the 07-12
  review's "watch that future Arena work imports from drillLogic, not the
  shims" tripwire, triggered by a test rather than product code.
- **Recommended action:** one-line change — point the test at
  `../arena/drillLogic`; then `pickRandomDecision` joins
  `labelSeedAction`/`shouldCbet` as trimmable shim names.

#### Finding 4: `chipAmount` still adopted at a single render site (UIR-002)

- **Status:** Recurring (second run; tracked upstream, partially improved —
  the missing direct unit suite flagged on 07-12 was closed by #180 with
  exactly the recommended boundary cases)
- **Priority:** Low
- **Evidence:** grep — render consumers of `chipAmount` are still only
  `HandReplay.tsx`; `format.test.ts:63-77` now pins its behavior.
- **Affected files/modules:** `src/utils/format.ts`, pages rendering raw
  chip/pot numbers.
- **Graphify signal:** n/a; grep.
- **Direct code confirmation:** yes.
- **Why it matters:** the `385.00000000000006` float-artifact class remains
  fixed only where it was reported.
- **Recommended action:** finish the UIR-002 formatter migration (tracked in
  `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`).

## Prior Findings — Disposition (07-12 → now)

| 07-12 finding | Disposition | Verification |
|---|---|---|
| 1. Report-lag class (fifth instance; TASK_PROTOCOL §4 rule added) | **Resolved this period** — #181/#184/#191/#192 recorded every slice; abyss and x-ray closed with per-item dispositions; zero code PR landed without its report record | `git log 061cbfd..ae20052 -- docs/reports/` cross-checked against wave scope |
| 2. Dead-export refill (labelSeedAction/shouldCbet) | **Recurring / not worsened** — same two names, zero new refill in 17 PRs (first quiet period) | knip diff vs 07-12 record |
| 3. `chipAmount` single-site adoption | **Recurring, partially improved** — direct suite landed (#180) exactly as recommended; migration still open | grep + format.test.ts read |
| knip-in-CI gap (recurring since 07-09) | **Recurring** (sixth run) — see Finding 2 | ci.yml steps grep |
| Stray `writeStarterDiagnosticSummary`/`saveHeroName` exports | **Stale / unchanged** (fourth run) — `saveHeroName` reclassified: it is III-5's intended write path, not junk | knip + grep |
| §6 test gaps (format/csvExport/pdfExport) | **Resolved** — #180/#182/#185/#186 added direct suites; test count 947 → 1022 | vitest run + suite reads |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Substitute-tool signals that did not
survive verification, unchanged from prior runs:

- **Signal:** knip "Unused files (4)" in `scripts/`. **Why suspicious:** would
  be dead orchestration code. **What was checked:** the four files are the
  SessionStart hook, two fleet CLIs, and a manual generator — entry points
  knip can't trace. **Conclusion:** false positives. **Follow-up:** allowlist
  when knip joins CI.
- **Signal:** knip "unused exported types" (52). **Conclusion:** documented
  forward contracts (solver boundary, spot-packet schema); keep decision
  recorded in abyss Wave 2. Zero type-level drift this period.
- **Signal:** madge "2 warnings" during graph build. **What was checked:**
  warnings are madge's standard skipped-dynamic-import notices, not cycles;
  cycle scan itself is clean. **Conclusion:** benign. **Follow-up:** none.

## Improvement Opportunities

- **Architecture:** trim the arena shim re-exports once the test import moves
  to `drillLogic` (Finding 3); consider a `data/constants.ts` home for
  `DEFAULT_HERO_NAME` if `localStorage.ts` ever stops being a leaf — today's
  placement is verified safe, just semantically odd (a browser-storage wrapper
  exporting a domain constant to worker-bundled parsers).
- **Code quality:** when III-5 wires the settings editors, add `.trim()`
  normalization — `setHeroName` (appStore.ts:104) and `mergePersistedSettings`
  (appStore.ts:34) both preserve untrimmed whitespace on non-blank names, and
  an untrimmed hero name silently breaks `Dealt to <name>` matching in every
  parser (characterized in appStore.test.ts:175; noted in ROADMAP III-5).
- **Tests:** point `arenaDrillEngine.test.ts:7` at `analysis/arena/drillLogic`
  (Finding 3). `migrate` in the persist config is an identity passthrough
  (appStore.ts:121) — fine now, but the version bump that eventually needs it
  will not be caught by types; the characterization test documents this.
- **Documentation:** STATUS.md/CLAUDE.md settings-UI drift fixed in this PR;
  CLAUDE.md components-tree note refreshed (arena/blackout/coach/ranges
  subdirs now listed; structure header re-stamped 2026-07-13).
- **Developer experience:** wire knip into CI (ROADMAP P5) — sixth recurrence,
  though with the first refill-free period on record.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged.

## Review Ledger

- **Date/time:** 2026-07-13 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-fg1tgr` (== `origin/main` at review
  start).
- **Commit:** `ae20052` (#192).
- **Scope:** full gate, madge, knip, layering greps, review of the #175–#192
  batch (substantive diffs read line-by-line: #176, #183, #190; test suites
  #180/#182/#185/#186 verified against the 07-12 recommendations), settings-UI
  history archaeology, prior-findings reconciliation vs the 07-12 run.
- **Graphify sync status:** index absent by policy; review ran Graphify-free.
- **Files changed since last run:** 17 commits / 17 PRs, 52 files,
  +2 015/−295.
- **Areas inspected:** see table above.
- **New findings:** Finding 1 (dual-profile feature dark + never-true doc
  claim — docs fixed in this PR, selector steered to III-5), Finding 3
  (analysis test imports pages shim).
- **Recurring findings:** Finding 2 (knip-in-CI, sixth run — zero refill this
  period), Finding 4 (`chipAmount` single-site, suite gap closed).
- **Resolved findings:** report-lag class (record PRs accompanied every code
  PR this period), §6 test gaps for format/csvExport/pdfExport (#180–#186),
  abyss audit + post-fable x-ray both closed (#191/#192).
- **Worsened findings:** none.
- **Stale findings:** `writeStarterDiagnosticSummary` export (4th run);
  `saveHeroName` reclassified as III-5's intended write path.
- **Recommended next actions:** (1) ship III-5 settings editors (unlocks the
  dark `advanced` profile + closes abyss F2, with trim normalization);
  (2) wire knip into CI; (3) one-line test-import fix for Finding 3;
  (4) finish UIR-002 formatter migration.

## Recommended Next Actions

1. **Ship the III-5 settings editors (hero name + strategy profile, with
   `.trim()` normalization)** — one small UI unlocks an entire tested but
   unreachable feature tier and closes abyss F2 —
   `src/components/layout/Sidebar.tsx` (or a settings surface),
   `src/data/appStore.ts`, `src/data/store.ts:683`.
2. **Wire knip into CI with the 4-file scripts allowlist** — sixth
   recurrence; the refill pause doesn't disprove the two prior decay
   periods — `.github/workflows/ci.yml`, ROADMAP P5.
3. **Point `arenaDrillEngine.test.ts:7` at `analysis/arena/drillLogic`** —
   removes the analysis→pages test edge and exposes the shim re-exports as
   trimmable — `src/analysis/__tests__/arenaDrillEngine.test.ts`,
   `src/pages/arena/actionOptions.ts`, `src/pages/arena/drillPool.ts`.
4. **Finish the UIR-002 formatter migration** — float-artifact fix still
   protects exactly one render site — `src/utils/format.ts`, pages rendering
   raw chip/pot values.
