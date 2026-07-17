---
status: resolved
date: 2026-07-17
related:
  - docs/reports/archive/2026-07-13-codebase-health-review.md
  - '#195'
  - '#196'
  - '#198'
note: >
  Archived on creation (scheduled run of 2026-07-17). The 07-13 review's two
  headline recommendations both landed and verify clean (III-5 settings
  editors #195; knip-in-CI #196/#198), the full 10-step gate is green
  in-container, and the one recurring actionable item — the analysis test
  importing a pages shim — is fixed in this PR. Every residual is already
  tracked elsewhere (UIR-002 plan doc, ROADMAP P5/III-5), so nothing is
  left open here.
---

# Codebase Health Review — 2026-07-17

Scheduled health review, run against `main` @ `a75caf4` (5 commits / 5 PRs
after the 07-13 review's baseline `ae20052`: #193–#198, no PR #197 on main).
**Graphify was unavailable this run** — same as every prior remote run: the
skill is not registered and no index exists in a fresh container
(`graphify-out/` is gitignored by policy, PR #65). Every conclusion below
comes from direct inspection: the full 10-step CI gate executed in-container,
`madge`, `knip`, consumer greps, and line-by-line review of every substantive
diff in the period (#194, #195, #196, #198).

## Codebase Health Summary

- **Overall health: excellent — the strongest run in the series.** All ten CI
  steps executed in-container and passed: `docs:check`, `typecheck`,
  `typecheck:test`, `lint` (0/0), **`knip` (exit 0 — first fully clean run
  on record)**, `privacy:check`, **1029/1029 tests (100 files, ~29 s; +7
  tests, +1 file)**, production build OK (shell 376.77 KB, +0.09;
  precache 1 764.03 KiB, +3.8), `check:bundle-budget` OK (367.9 KB vs
  432.0 KB budget). `madge --circular` clean (258 modules, +2).
- **Main risks:** near-none new. The two prior headline risks are gone: the
  dual-profile feature is now reachable (#195 wired the strategy-profile
  selector plus hero-name editor on `/data`, with trim normalization and an
  89-line test suite), and knip is wired into CI (#196) with a
  narrowed, per-line-documented allowlist (#198). What remains is tracked:
  UIR-002 formatter migration (third run at one render site), the
  `framer-motion → motion` swap (ROADMAP P5), and the GOALS.md identity
  gatekeeper that intentionally keeps ROADMAP III-5's box unticked.
- **Highest-impact improvement:** write `GOALS.md` (the ROADMAP III-5
  identity gate) — it is now the only thing holding the III-5 arc open, and
  every EPIC G reference points at it.
- **Confidence level:** high — all claims verified by executing the gate or
  reading source and diffs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-kioh4f`, identical to
  `origin/main` @ `a75caf4` at review start (0 ahead / 0 behind after fetch).
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none at start; this PR adds the report + a
  one-line test-import fix (see Finding 1).
- **Graphify freshness:** **no Graphify index or tooling exists in this
  container** — unchanged from all prior remote runs. Substituted with madge
  (dependency graph/cycles), knip (reachability, now also CI ground truth),
  grep (layering/consumer tracing), build output (chunk clustering), and
  `wc -l` (hotspots).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** unchanged — `src/parser/`, `src/analysis/`,
  `src/data/`, `src/pages/`, `src/components/` (10 subdirs; `settings/` is
  the period's new one, holding `SettingsCard.tsx` + its test).
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/*` CLIs — now *codified* in `knip.jsonc`'s entry list, so the
  entry-point map is machine-checked instead of tribal knowledge.
- **Core modules / hotspots (lines):** `curriculumSeedPacks.generated.ts`
  2 514 (generated), `spotPacket.ts` 1 288, `ArenaPage.tsx` 998, `store.ts`
  790, `pokerstars.ts` 718, `HandReplay.tsx` 697 — all flat vs 07-13; no
  non-generated file above 1 300 lines.
- **Dependency clusters:** parser → analysis → pages remains unidirectional
  in production code (grep: zero `pages/` imports from analysis/data/parser/
  utils). New edges this period: `SettingsCard` → `appStore` + `store`
  (`saveHeroName` gains its intended first caller) and
  `DataVaultPage` → `SettingsCard` — both downhill, correct direction.
- **Highly connected files:** `data/appStore.ts` and `data/store.ts` each
  gained the settings-card consumer; `analysis/arena/drillLogic.ts` remains
  the shared arena core.
- **Isolated or orphaned areas:** none flagged — knip now exits 0, and the
  four `scripts/` false positives from every prior run are resolved as
  documented allowlist entries rather than suppressed noise.
- **Suspicious dependency relationships:** one — the analysis-layer test
  importing a pages shim (07-13 Finding 3), still present at review start;
  fixed in this PR (Finding 1 below).
- **Complexity or metric hotspots:** shell chunk 376.77 KB (+0.09, flat,
  under the enforced 432 KB budget); `pdfExport` lazy chunk 432.39 KB
  (flat, lazy); precache 1 764.03 KiB (+3.8, from the new settings code).

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Full CI gate (10 steps) | Ground truth | Every step from `.github/workflows/ci.yml:27-54` executed in-container (exit 0) | Green: 1029/1029 tests, knip 0, budget 367.9/432 KB |
| Dependency graph | Cycle check after new settings module | `npx madge --circular` (258 modules) | No cycles |
| #195 settings editors | 07-13's top recommendation; unlocks dark feature | `SettingsCard.tsx` full read (143 lines), `SettingsCard.test.tsx`, `appStore.ts` diff, `appStore.test.ts:103-110` | Sound: `.trim()` at both the component (`:51`) and store boundary (`appStore.ts:104`); blank-name guard; dual persistence (Zustand + Dexie `saveHeroName`); radiogroup a11y roles; boot path re-seeds the input |
| Hero-name data flow | Trim footgun flagged 07-13 | `Layout.tsx:65` (Dexie boot read → trimming setter), `useImportPipeline.ts:99,423` (parser reads store value), `store.ts:676-685` | Closed: every runtime path now yields a trimmed name; see watchlist for the one cosmetic residual |
| #196/#198 knip wiring | Sixth-run recurring finding | `ci.yml:41-42`, `knip.jsonc` full read, `npx knip` before/after the test fix | Resolved: CI step present; allowlist narrowed to 4 script entries + 3 documented forward-contract files; per-entry rationale comments |
| #198 dead-export cleanup | Stale-export findings (4 runs) | Full commit diff | `writeStarterDiagnosticSummary` deleted; `labelSeedAction`/`shouldCbet` re-exports trimmed; 8 internal-only types de-exported — all exactly the carried findings |
| #194 parser prize fix | Touches critical parser math | `tournamentSummary.ts:28-118` in context; regex traced by hand against `2nd: hero, $100.00` (old `[\d,]+` matched the bare comma → null prize; new `\d[\d,]*` anchors on a digit) and the lone-eliminating-line double count | Correct; regression tests added in `tournamentSummary.test.ts` (+57 lines) |
| 07-13 Finding 3 (test → pages shim) | Recommended twice, never applied | `arenaDrillEngine.test.ts:7`, consumer grep for `pickRandomDecision` | Still present at review start → **fixed in this PR** (one line); evidence corrected: `ArenaPage.tsx:27` is a legitimate shim consumer, so the re-export is not dead |
| UIR-002 `chipAmount` adoption | Recurring | grep across `src/` | Still `HandReplay.tsx` only (third run); tracked in the 07-10 plan doc |
| STATUS/CLAUDE/ROADMAP coherence | Report-lag class history | STATUS.md:48-56, CLAUDE.md settings note, ROADMAP III-5 block | Coherent: docs describe the shipped SettingsCard accurately; III-5 box correctly unticked pending GOALS.md |
| Hotspot drift | Size regression check | `wc -l` top-10 vs 07-13 record | Flat everywhere |

## Confirmed Findings

#### Finding 1: analysis-layer test imported a pages shim — fixed in this PR

- **Status:** Recurring (second run) → **Resolved** (this PR)
- **Priority:** Low (escalated to "just fix it" after being recommended in
  both the 07-12 tripwire and the 07-13 report without landing)
- **Evidence:** at review start, `src/analysis/__tests__/arenaDrillEngine.test.ts:7`
  imported `pickRandomDecision` from `../../pages/arena/actionOptions`
  while the engine under test imports it from `./arena/drillLogic`.
- **Affected files/modules:** `src/analysis/__tests__/arenaDrillEngine.test.ts`.
- **Graphify signal:** n/a (layering grep substitute).
- **Direct code confirmation:** yes; after the one-line change the suite
  passes (6/6), knip still exits 0, lint/typecheck:test green.
- **Why it matters:** it inverted test-layer dependency direction
  (analysis test → pages). One correction to the 07-13 record: the report
  called the test the shim's "sole consumer" of `pickRandomDecision` —
  that was inaccurate; `ArenaPage.tsx:27` consumes it too, so the
  `actionOptions.ts:7` re-export stays legitimately alive after this fix.
- **Recommended action:** none — done.

#### Finding 2: `chipAmount` still adopted at a single render site (UIR-002)

- **Status:** Recurring (third run; unchanged, tracked upstream)
- **Priority:** Low
- **Evidence:** grep — render consumers of `chipAmount` remain only
  `HandReplay.tsx:25,451`; the direct unit suite from #180 still pins the
  formatter's boundary behavior.
- **Affected files/modules:** `src/utils/format.ts`, pages rendering raw
  chip/pot numbers.
- **Graphify signal:** n/a; grep.
- **Direct code confirmation:** yes.
- **Why it matters:** the `385.00000000000006` float-artifact class remains
  fixed only where it was originally reported. Not escalating: it is P0-ranked
  inside `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md` and no
  new raw-number render sites appeared this period.
- **Recommended action:** finish the UIR-002 migration when that plan's queue
  reaches it.

## Prior Findings — Disposition (07-13 → now)

| 07-13 finding | Disposition | Verification |
|---|---|---|
| 1. Dual-profile feature dark (selector never existed) | **Resolved** — #195 shipped `SettingsCard` on `/data` with the strategy-profile radiogroup; `setStrategyProfile` has its first UI call site; `advanced` tier reachable | Full component + test read; store diff |
| 2. knip not wired into CI (sixth run) | **Resolved** — #196 added the CI step + `knip.jsonc`; #198 narrowed the file-level allowlist to per-export fixes; `npx knip` exits 0 | ci.yml:41-42; knip.jsonc full read; knip executed |
| 3. Analysis test imports pages shim | **Resolved this PR** — was still present at review start (second run) | Finding 1 above |
| 4. `chipAmount` single-site (UIR-002) | **Recurring** (third run, unchanged) | Finding 2 above |
| Stale exports (`writeStarterDiagnosticSummary` 4 runs, `saveHeroName`, shim re-exports) | **Resolved** — `writeStarterDiagnosticSummary` deleted (#198); `saveHeroName` now live as III-5's write path (#195); `labelSeedAction`/`shouldCbet` re-exports trimmed (#198) | Commit diffs; knip 0 |
| heroName whitespace footgun (III-5 pre-condition) | **Resolved** — `.trim()` at the store boundary (`appStore.ts:104`) plus component-level guard; asserted by `appStore.test.ts:103` | Diff + test read |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Substitute-tool signals that did not
survive verification:

- **Signal:** madge "2 warnings" during graph build. **Why suspicious:**
  could hide unresolved modules. **What was checked:** warnings are madge's
  standard skipped-dynamic-import notices; the cycle scan itself is clean.
  **Conclusion:** benign, unchanged from prior runs. **Follow-up:** none.
- **Signal:** knip historically reported 4 unused `scripts/` files and ~52
  unused types. **What was checked:** `knip.jsonc` now encodes these as
  documented entry points / forward contracts, and knip exits 0.
  **Conclusion:** the noise class is retired — future knip failures in CI
  are signal, not backlog. **Follow-up:** keep the allowlist narrow (it
  shrank in #198; that direction is correct).

## Improvement Opportunities

- **Architecture:** none new — layering is unidirectional, cycles zero, and
  the one wart (test → pages shim) is fixed in this PR.
- **Code quality:** `SettingsCard.handleSaveName` fires `void handleSaveName()`
  with no rejection handler — a failed Dexie `saveHeroName` write would leave
  the Zustand state updated but the persisted row stale, with no user-visible
  error and an unhandled rejection. Watchlist only: the repo guideline is "no
  error handling for impossible scenarios," and a failing local Dexie put is
  near that line — worth a `catch` → error-strip if `/data` grows more writers.
- **Tests:** none outstanding — the period added suites exactly where code
  landed (SettingsCard 89 lines, tournamentSummary +57, appStore trim
  characterization).
- **Documentation:** coherent this run; `mergePersistedSettings`'s
  untrimmed-rehydration quirk remains a *documented characterization*
  (`appStore.test.ts:184-194`) — cosmetic, since `Layout.tsx:65`'s Dexie
  boot read overwrites the store through the trimming setter.
- **Developer experience:** none new; knip-in-CI closes the largest DX gap
  the series had been carrying.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued
  (ROADMAP P5, `ROADMAP.md:455`); unchanged, low urgency.

## Review Ledger

- **Date/time:** 2026-07-17 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-kioh4f` (== `origin/main` at review
  start).
- **Commit:** `a75caf4` (#198).
- **Scope:** full 10-step CI gate in-container, madge, knip, consumer greps,
  line-by-line review of #194/#195/#196/#198, hero-name data-flow trace,
  prior-findings reconciliation vs the 07-13 run, hotspot refresh.
- **Graphify sync status:** index absent by policy; review ran Graphify-free.
- **Files changed since last run:** 5 commits / 5 PRs, 22 files,
  +710/−52.
- **Areas inspected:** see table above.
- **New findings:** none of substance (SettingsCard save-path rejection
  handling noted as watchlist, not a finding).
- **Recurring findings:** UIR-002 `chipAmount` single-site (third run,
  tracked); test-shim import (second run — fixed in this PR).
- **Resolved findings:** dual-profile dark feature (#195), knip-in-CI after
  six runs (#196/#198), all carried stale exports (#198), heroName trim
  footgun (#195), test-shim import (this PR).
- **Worsened findings:** none.
- **Stale findings:** none carried — the stale-export class is fully cleared
  for the first time in the series.
- **Recommended next actions:** (1) write `GOALS.md` to close the III-5
  identity gate; (2) UIR-002 formatter migration per its plan doc;
  (3) `framer-motion → motion` when convenient.

## Recommended Next Actions

1. **Write `GOALS.md` (ROADMAP III-5 identity gate)** — it is now the only
   blocker keeping the III-5 arc open, and every EPIC G reference points at
   it — `GOALS.md`, `docs/product/ROADMAP.md:166-174`.
2. **Finish the UIR-002 formatter migration** — the float-artifact fix still
   protects exactly one render site, third run in a row —
   `src/utils/format.ts`, pages rendering raw chip/pot values, per
   `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`.
3. **Swap `framer-motion@12` for `motion@11`** — queued dependency cleanup,
   ROADMAP P5 — `package.json`, animation imports.
