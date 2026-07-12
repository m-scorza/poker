---
status: resolved
date: 2026-07-12
related:
  - docs/reports/2026-07-01-abyss-audit.md
  - docs/reports/archive/2026-07-11-codebase-health-review.md
note: >
  Archived on creation (scheduled run of 2026-07-12). The gate is fully
  green, both prior code findings (arenaDrillEngine layering inversion,
  dead-type refill) were resolved by #167, and F19 is complete. The two
  actionable items from this run — the stale abyss F19/F18 record and the
  repeatedly-recommended report-update protocol rule — were both fixed in
  this PR. Nothing is left open here.
---

# Codebase Health Review — 2026-07-12

Scheduled health review, run against `main` @ `061cbfd` (11 commits / 11 PRs
after the 07-11 review's baseline `0cfca0e`: #163–#173). **Graphify was
unavailable this run** — same as every prior remote run: no Graphify index
or tooling exists in a fresh container (`graphify-out/` is gitignored by
policy, PR #65). Every conclusion below comes from direct inspection: the
full verification gate executed in-container, `madge`, `knip`, grep-based
layering checks, and line-by-line review of the new PR diffs.

## Codebase Health Summary

- **Overall health: excellent — the best snapshot this review series has
  recorded.** In-container: `docs:check`, `typecheck`, `typecheck:test`,
  `lint` (0 errors, 0 warnings), **947/947 tests (91 files, ~32 s)**,
  production build OK (shell 376.64 KB, flat, under the 432 KiB budget; PWA
  precache 1 761.57 KiB), `madge --circular` clean (246 modules, +16). Both
  07-11 code findings were resolved the next day (#167), and abyss F19 —
  god-file decomposition — is now **complete**: store.ts 929 → 790,
  HandsUpload.tsx 1 041 → 154, RangesPage.tsx 528 → 265, CareerPage.tsx
  717 → 238, on top of ArenaPage's earlier 1 499 → 998.
- **Main risks:** all process, not code. (1) The report-lag class recurred a
  **fifth** time — #167–#173 landed the entire F19 remainder and three F18
  clones without updating the abyss report, whose "Still open" line still
  claimed all of it was outstanding (fixed in this PR, and the
  twice-recommended protocol rule is now written into TASK_PROTOCOL §4).
  (2) knip is still not wired into CI (ROADMAP P5) and #167 produced a
  small refill again (2 dead re-export names). (3) `chipAmount` (the #164
  float-artifact fix) is adopted at exactly one render site; the repo-wide
  formatter migration (UIR-002) is tracked but open.
- **Highest-impact improvement:** wire knip into CI with the reviewed
  allowlist — two consecutive periods have now produced measurable
  dead-export refill within days of a manual sweep, so the "manual sweeps
  suffice" equilibrium is disproven twice over.
- **Confidence level:** high — all claims verified by executing the gate or
  reading source and diffs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-uqzsfv`, identical to
  `origin/main` @ `061cbfd` at review start (0 ahead / 0 behind after
  fetch).
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from all prior remote runs; index is local-only by policy, no
  tooling installed to regenerate. The "Graphify map" was substituted with
  madge (dependency graph/cycles), knip (reachability), grep (layering
  direction), build output (chunk clustering), and `wc -l` (hotspots).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** `src/parser/`, `src/analysis/`, `src/data/`,
  `src/pages/`, `src/components/`. New sub-areas this period:
  `src/analysis/arena/` (drillLogic), `src/components/ranges/` (4 modules),
  `src/components/career/` grew 4 tab components, `src/components/hands/`
  gained the import-pipeline split (hook + 3 panels), and
  `src/components/shared/` gained `useFocusTrap` + `DataHealthAlert`.
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; `scripts/*` hooks and fleet CLIs.
- **Core modules / hotspots (lines):** `curriculumSeedPacks.generated.ts`
  2 514 (generated), `spotPacket.ts` 1 288, `ArenaPage.tsx` 998 (flat),
  **`store.ts` 790 (−139)**, `pokerstars.ts` 717, `HandReplay.tsx` 696,
  **`CareerPage.tsx` 238 (−479)**, **`HandsUpload.tsx` 154 (−887)**,
  **`RangesPage.tsx` 265 (−263)**. Every non-generated hotspot except
  ArenaPage/spotPacket moved down; no file above 1 000 lines remains
  outside generated code and spotPacket.
- **Dependency clusters:** parser → analysis → pages, now strictly
  unidirectional again — grep confirms **zero** imports from `pages/` in
  `analysis|data|parser|utils` (the 07-11 inversion is gone, #167).
- **Circular dependencies:** none (madge, 246 modules; was 230).
- **Isolated/orphaned areas:** knip's four `scripts/` "unused files" — the
  same false positives as every prior run (SessionStart hook, fleet CLIs,
  manual generator).
- **Suspicious dependency relationships:** none new. The pages→analysis
  re-export shims in `drillPool.ts`/`actionOptions.ts` point the correct
  direction; two re-exported names are dead (see Finding 2).
- **Complexity or metric hotspots:** shell chunk 376.64 KB (+0.05 KB,
  flat); `pdfExport` lazy chunk 432.85 KB (unchanged, lazy); precache
  1 761.57 KiB (+0.6 KiB).

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All six gate commands executed in-container | Green: 947/947 tests (91 files), lint 0/0, build OK, shell 376.64 KB |
| Dependency graph | Cycle check after 16 new modules | `npx madge --circular` (246 modules) | No cycles |
| Layering direction | 07-11 Finding 1 verification | grep for `pages/` imports across analysis/data/parser/utils | Zero hits — inversion resolved by #167 (`analysis/arena/drillLogic.ts`, pages re-export) |
| Dead code | Refill check without CI gate | `npx knip` | Unused exported types 54 → 52 (#167 fixed both) but unused exports 2 → 4: `labelSeedAction`/`shouldCbet` re-export names dead (Finding 2) |
| #169 store extraction | ~150 analysis lines left the data layer | `villainObserver.ts` full skim, `store.ts:18-21,547-548` wiring | Sound: pure observation collectors moved verbatim; store keeps persistence + orchestration |
| #170 HandsUpload split | 887 lines moved out; #164 lifecycle semantics at risk | `useImportPipeline.ts` (457 lines) — watchdog arm/clear paths, `importSeqRef` guards, unmount cleanup | Sound: watchdog re-armed per PROGRESS/FILE_ERROR, cleared on COMPLETE/unmount; sequence + worker-identity guards on every async resume; post-COMPLETE IndexedDB phase intentionally un-watchdogged (documented #164 limitation, cancel button still available) |
| #171/#172/#173 splits | F19/F18 slices | Commit diffs + new module lists | Presentation-only moves; hooks stay in pages (#171 "zero hook lines removed" verified in diff shape); F18 clones #1/#3/#5 landed, #4 deliberately partial (drifted copies) |
| #164 bug fix | Correctness PR (import recovery + replay amounts) | Diff, `format.ts:37` `chipAmount`, HandReplay regression test, plan-doc status notes | Sound; `chipAmount` adopted only in HandReplay — repo-wide migration correctly tracked as open (UIR-002) |
| #165/#166 fleet scripts | Orchestration churn | Commit stats, kernel test additions | Scripts-lane only, tested (947 includes kernel suites); no product-code impact |
| Report/doc coherence | Report-lag class (recurring) | `git log 0cfca0e..HEAD -- docs/reports/` vs landed scope | **Only #163 (the prior review's own PR) touched the abyss report** while #167–#173 landed all of F19 + three F18 clones — fifth lag instance. Fixed in this PR |

## Confirmed Findings

#### Finding 1: fifth report-lag instance — F19 completed without the abyss record

- **Status:** Recurring (fifth instance: #141/#142, #153, #158/#160,
  now #167–#173), **Worsened** as a class — this time the gap covered an
  entire wave item's completion plus three F18 clones.
- **Priority:** High (as a process class; the individual fix is trivial and
  done in this PR)
- **Evidence:** `git log 0cfca0e..061cbfd -- docs/reports/` shows only
  #163; the report's Wave 4 note still read "Still open: … F19 remainder
  (store.ts, HandsUpload, CareerPage, RangesPage)" while all four were
  decomposed (#169–#172) and the layering note it carried was fixed (#167).
- **Affected files/modules:** `docs/reports/2026-07-01-abyss-audit.md`,
  `docs/agents/TASK_PROTOCOL.md`.
- **Graphify signal:** n/a; found by diffing report text against `git log`
  and `wc -l`.
- **Direct code confirmation:** yes.
- **Why it matters:** the abyss report is SessionStart-surfaced; a stale
  "still open" F19 invites an agent to re-decompose already-decomposed
  pages. Two consecutive review-report nudges did not change behavior.
- **Recommended action:** done in this PR — report record updated to F19 ✅
  complete / F18 partial with per-clone dispositions, and the rule is now
  **written into TASK_PROTOCOL §4** ("Open-report scope") rather than
  living only in review prose. If a sixth instance occurs, consider making
  `docs:check` fail when a PR touches files named in an open report's
  wave-scope without touching the report (mechanical enforcement).

#### Finding 2: small dead-export refill from #167 (re-export shims)

- **Status:** Recurring as a class (second consecutive period with a
  post-refactor refill; the 07-11 instance was fixed by #167 which
  introduced this one)
- **Priority:** Low
- **Evidence:** knip: `labelSeedAction` (`src/pages/arena/actionOptions.ts:7`)
  and `shouldCbet` (`src/pages/arena/drillPool.ts:8`) are re-exported "so
  consumers are unchanged," but grep shows no external consumer imports
  those two names from the pages modules (arenaDrillEngine imports from
  `analysis/arena/drillLogic` directly; ArenaPage/ActionButton import other
  symbols). Unused exported types dropped 54 → 52 (#167 fixed the 07-11
  pair), so net dead-export count is flat but churning.
- **Affected files/modules:** `src/pages/arena/actionOptions.ts`,
  `src/pages/arena/drillPool.ts`.
- **Graphify signal:** knip (substitute tool), verified by grep.
- **Direct code confirmation:** yes.
- **Why it matters:** trivial individually — but it is the second refill in
  two periods, each created by the PR that fixed the previous one. This is
  exactly the drift class an automated knip gate (ROADMAP P5) ends.
- **Recommended action:** trim the two dead names from the re-export lines
  on the next Arena touch; wire knip into CI (see Next Actions).

#### Finding 3: `chipAmount` formatter adopted at a single render site

- **Status:** New (observation, correctly tracked upstream)
- **Priority:** Low
- **Evidence:** `src/utils/format.ts:37` defines `chipAmount`; grep shows
  `HandReplay.tsx` as its only consumer. The #164 handoff and
  `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md` (UIR-002)
  both state the repo-wide raw-render audit is still required — the plan
  is honest; this finding just keeps it visible.
- **Affected files/modules:** `src/utils/format.ts`, all pages rendering
  raw chip/pot numbers.
- **Graphify signal:** n/a; grep.
- **Direct code confirmation:** yes.
- **Why it matters:** the `385.00000000000006` float-artifact class is
  fixed only where it was reported; any other multi-way pot render can
  still surface it. `format.ts` also still has no direct unit suite
  (abyss §6) — the regression lives in HandReplay's test.
- **Recommended action:** finish the UIR-002 formatter migration; add a
  small direct `format.test.ts` (chipAmount boundaries: `87.5`, `385`,
  `0`, negatives) when touching it.

## Prior Findings — Disposition (07-11 → now)

| 07-11 finding | Disposition | Verification |
|---|---|---|
| 1. analysis → pages layering inversion (`arenaDrillEngine.ts`) | **Resolved** (#167) | grep: zero `pages/` imports in core layers; helpers moved to `analysis/arena/drillLogic.ts`, pages re-export; madge clean |
| 2. F19 report-lag (fourth instance) | **Recurring / worsened as a class** — fifth instance is this run's Finding 1 | `git log` on `docs/reports/` |
| 3. dead-type refill (`PreflopAction`/`FeedbackStatus`) + duplicate type | **Resolved** (#167 un-exported both; knip 54 → 52) — but the class recurred as Finding 2 | knip + grep; `ArenaPage.tsx:55`'s local `FeedbackStatus` remains but is now a private type in both files, no longer a dead export |
| knip-in-CI gap (recurring since 07-09) | **Recurring** | `ci.yml` has no knip step; ROADMAP:407 unchanged; second consecutive refill observed |
| Stray `writeStarterDiagnosticSummary` export | **Stale / unchanged** (third run) | Still exported (`starterDiagnostic.ts:130`), no importers; `saveHeroName` (`store.ts:683`) same class |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Substitute-tool signals that did
not survive verification, unchanged from prior runs:

- **Signal:** knip "Unused files (4)" in `scripts/`. **Why suspicious:**
  would be dead orchestration code. **What was checked:** the four files
  are the SessionStart hook, two fleet CLIs (with their own vitest suite),
  and a manual generator — entry points knip can't trace. **Conclusion:**
  false positives. **Follow-up:** allowlist when knip joins CI.
- **Signal:** knip "unused exported types" bulk (52). **Conclusion:**
  documented forward contracts (solver boundary, spot-packet schema); keep
  decision recorded in abyss Wave 2. Zero new type-level drift this period.

## Improvement Opportunities

- **Architecture:** none urgent — layering is unidirectional again, cycles
  zero, god files decomposed. Watch that future Arena work imports from
  `analysis/arena/drillLogic` (not the pages shims) so the shims can
  eventually be dropped.
- **Code quality:** trim dead re-export names (Finding 2); drop the stray
  `writeStarterDiagnosticSummary` (`starterDiagnostic.ts:130`) and
  `saveHeroName` (`store.ts:683`) exports when those files are next
  touched (carried three runs).
- **Tests:** healthy — 947 passing (+7). Remaining §6 gaps: `format.ts`,
  `csvExport.ts`, `pdfExport.ts` have no direct suites; the new
  `useImportPipeline` hook's lifecycle is covered via HandsUpload tests
  (18/18) which is acceptable post-split.
- **Documentation:** abyss F19/F18 record fixed in this PR; TASK_PROTOCOL
  §4 now carries the open-report-scope rule.
- **Developer experience:** wire knip into CI (ROADMAP P5) — now with two
  consecutive refill data points.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged.

## Review Ledger

- **Date/time:** 2026-07-12 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-uqzsfv` (== `origin/main` at review
  start).
- **Commit:** `061cbfd` (#173).
- **Scope:** full gate, madge, knip, layering grep, line-by-line review of
  the #163–#173 batch, prior-findings reconciliation vs the 07-11 run.
- **Graphify sync status:** index absent by policy; review ran
  Graphify-free.
- **Files changed since last run:** 11 commits / 11 PRs, 42 files,
  +2 916/−1 992.
- **Areas inspected:** see table above.
- **New findings:** Finding 3 (single-site `chipAmount` adoption —
  observation, tracked upstream).
- **Recurring findings:** Finding 1 (report-lag, fifth instance — now a
  TASK_PROTOCOL rule), Finding 2 (dead-export refill, second consecutive),
  knip-in-CI gap.
- **Resolved findings:** 07-11 Finding 1 (layering inversion, #167),
  07-11 Finding 3 (dead-type exports, #167), abyss F19 complete
  (#169–#172 verified by line counts and diff review).
- **Worsened findings:** report-lag as a class (covered a full wave-item
  completion this time).
- **Stale findings:** `writeStarterDiagnosticSummary` / `saveHeroName`
  exports (harmless, carried).
- **Recommended next actions:** (1) wire knip into CI; (2) finish UIR-002
  formatter migration; (3) escalate to mechanical report-scope enforcement
  if a sixth lag instance appears.

## Recommended Next Actions

1. **Wire knip into CI with the reviewed allowlist** — two consecutive
   post-refactor refills prove manual sweeps decay within days —
   `.github/workflows/ci.yml`, ROADMAP P5.
2. **Finish the UIR-002 formatter migration** — the float-artifact fix
   currently protects exactly one render site — `src/utils/format.ts`,
   pages rendering raw chip/pot values.
3. **Watch for a sixth report-lag instance** — the rule now lives in
   TASK_PROTOCOL §4; if prose-plus-protocol still fails, make `docs:check`
   compare PR-touched files against open-report wave scopes —
   `scripts/regen-reports-index.ts`, `docs/agents/TASK_PROTOCOL.md`.
