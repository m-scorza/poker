---
status: resolved
date: 2026-07-11
related:
  - docs/reports/2026-07-01-abyss-audit.md
  - docs/reports/archive/2026-07-10-codebase-health-review-pm.md
note: >
  Archived on creation. The gate is fully green, the prior run's top
  recommendation (ArenaPage decomposition) landed via #158/#160, and this
  run's one actionable item — recording that landing in the abyss report's
  F19 entry (fourth instance of the report-lag class) — is fixed in the same
  PR that adds this report. The new analysis→pages import inversion and the
  two unused type exports are recorded inside F19's remaining scope.
---

# Codebase Health Review — 2026-07-11

Scheduled health review against `main` @ `b5491a4` (6 commits / 5 substantive
PRs after the 07-10 PM baseline `cc4732a`: #155–#158, #160; #159 was the PM
report itself). **Graphify was unavailable this run** — same as every prior
remote run: `graphify-out/` is local-only by policy (PR #65) and no Graphify
tooling exists in a fresh container. Every conclusion below comes from direct
inspection: the full verification gate executed in-container, `madge`,
`knip`, build-output probing, and line-by-line review of the new diffs.

## Codebase Health Summary

- **Overall health: good, and improving — the prior run's top recommendation
  was executed.** In-container gate: `docs:check`, `typecheck`,
  `typecheck:test`, `lint` (0 errors, 0 warnings), **936/936 tests
  (91 files, ~39 s; +21 tests)**, production build OK (shell 376.59 KB vs
  432 KiB budget; PWA precache 1 760 KiB), `madge --circular` clean
  (230 modules, was 220).
- **Main risks:** (1) the report-lag class recurred a **fourth** time —
  #158/#160 landed the largest F19 slice yet and the abyss report still said
  "ArenaPage 1 499, pressure rising"; (2) #160's extraction introduced the
  tree's only analysis→pages dependency (`arenaDrillEngine.ts` importing
  `src/pages/arena/*`) plus two unused type exports — the first knip refill
  since the sweeps, small but exactly what the missing CI gate would catch.
- **Highest-impact improvement:** finish the F19 remainder with correct
  layering — move `drillPool`/`actionOptions` under `src/analysis/` when the
  next Arena slice runs — and wire knip into CI (ROADMAP P5, still unwired).
- **Confidence level:** high — all claims verified by executing the gate or
  reading source and diffs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-bkxfa8`, identical to
  `origin/main` @ `b5491a4` (merge-base = HEAD = origin/main after fetch).
- **Git status:** clean working tree before this report was added.
- **Uncommitted changes:** none.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from every prior remote run. Substituted with madge (dependency
  graph), knip (reachability), build output (chunk clustering), and `wc -l`
  (hotspots).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** unchanged — `src/parser/`, `src/analysis/`,
  `src/data/`, `src/pages/` (13 lazy routes), `src/components/`. New this
  run: `src/pages/arena/` (5 pure-helper modules) and
  `src/components/arena/` (3 presentational components), both born from the
  ArenaPage decomposition.
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; `scripts/*` hooks.
- **Core modules / hotspots (lines):** `spotPacket.ts` 1 288 (now the
  largest file), **`ArenaPage.tsx` 998 (−501)**, `HandsUpload.tsx` 949,
  `store.ts` 929, `HandReplay.tsx` 734, `CareerPage.tsx` 717,
  `pokerstars.ts` 717. Only ArenaPage moved — in the right direction.
- **Dependency clusters:** parser → analysis → pages; `store.ts` the hub.
  New: the Arena drill cluster (`arenaDrillEngine` + `srsScheduler` in
  analysis, helpers in `pages/arena/`, UI in `components/arena/`).
- **Circular dependencies:** none (madge, 230 modules; was 220 — the +10 are
  the extraction modules).
- **Isolated/orphaned areas:** knip's four `scripts/` "unused files" — same
  false positives as every prior run (hook/CLI entry points).
- **Suspicious dependency relationships:** **`src/analysis/arenaDrillEngine.ts`
  imports from `src/pages/arena/{drillPool,actionOptions}`** — verified to be
  the only analysis→pages import in the tree (13 files import the expected
  pages→analysis direction). The imperative `window.history.pushState` idiom
  is now down to one site (`ArenaPage.tsx:312`); query parsing moved into
  `studyQueueRoute.ts` with an SSR guard.

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All six gate commands executed in-container | Green: 936/936 tests (91 files), lint 0/0, build OK, shell 376.59 KB, precache 1 760 KiB |
| Dependency graph | Cycle + layering check after a 5-module extraction | `npx madge --circular` (230 modules); grep for cross-layer imports | No cycles; one analysis→pages inversion found (Finding 2) |
| Dead code | Refill check without CI gate | `npx knip` | 4 known script false positives, 2 known deliberate exports, **54 unused exported types (+2: `PreflopAction`, `FeedbackStatus` in `arenaDrillEngine.ts`)** — first refill since the sweeps |
| #158/#160 ArenaPage decomposition | Prior run's top recommendation; largest structural change | `arenaDrillEngine.ts` (154 lines, full read), new module tree, `ArenaPage.tsx` wiring, `arenaDrillEngine.test.ts` (105 lines) | Sound: pure functions, no React state, drill fallthrough paths now directly unit-tested; layering nit in Finding 2 |
| #157 SRS relearn requeue | Bug-fix in new scheduler | `srsScheduler.ts` (full read: `gradeSpot`, `requeueLapsedSpot`, `spotKeyOf` identity doc), wiring at `ArenaPage.tsx:470-471`, `srsScheduler.test.ts` | Sound: lapse reinsertion gap-bounded, promoted cards untouched; spot-key identity includes every dimension `checkCompliance` branches on |
| #155/#156 freeroll ROI | Cross-module money math | `financials.ts` `computeRoiPct` (full read), commit rationale, 4 updated test suites | Sound: pooled ratio keeps freeroll prizes in totalNet with $0 cost; all-freeroll guard kept; per-tournament mean still excludes (disclosed via `freerollsExcluded`) |
| studyQueueRoute extraction | New URL-parsing module | Full read | Correct, SSR-guarded; no dedicated unit test (covered via ArenaPage.test.tsx deep-link tests) — minor |
| Report/doc coherence | Protocol check (recurring lag class) | `git log 7d183c6..HEAD -- docs/reports/` (empty), abyss F19 text vs `wc -l` | **F19 record stale — fourth lag instance; fixed in this PR** |

## Confirmed Findings

#### Finding 1: ArenaPage decomposition landed — prior "Worsened" finding now substantially resolved

- **Status:** Resolved (was Worsened on 07-10 PM; tracked since 07-08)
- **Priority:** — (positive disposition)
- **Evidence:** `wc -l`: 1 499 → **998**. #158 moved pure helpers/constants
  to `src/pages/arena/` and presentational components to
  `src/components/arena/`; #160 extracted the grading/advance state machine
  to `src/analysis/arenaDrillEngine.ts` with 105 lines of direct unit tests
  covering the previously untestable fault_fixer/rfi_master fallthroughs.
- **Affected files/modules:** `src/pages/ArenaPage.tsx`, 9 new modules.
- **Graphify signal:** n/a; `wc -l` vs run ledger, madge module count.
- **Direct code confirmation:** yes — full read of `arenaDrillEngine.ts` and
  `srsScheduler.ts`; extraction is faithful (component applies returned
  results via setDrill/recorders; no logic drift found).
- **Why it matters:** the god file was the #1 recommendation for three
  consecutive runs; the escalation worked and the remaining F19 cost is
  roughly halved.
- **Recommended action:** none beyond F19 remainder (~998 → ~500 target,
  plus store.ts/HandsUpload/CareerPage/RangesPage).

#### Finding 2: Extraction inverted layering — analysis now imports from pages

- **Status:** New (introduced by #160)
- **Priority:** Low (structural nit, zero runtime risk, trivial fix)
- **Evidence:** `src/analysis/arenaDrillEngine.ts:21-24` imports
  `DrillType`/`shouldCbet`/`isCbetActionCorrect` from
  `../pages/arena/drillPool` and `TrainerAction`/`labelSeedAction`/
  `pickRandomDecision` from `../pages/arena/actionOptions`. Grep confirms
  this is the **only** analysis→pages import in the tree; 13 files import
  the expected direction. The file's own header acknowledges the compromise.
- **Affected files/modules:** `src/analysis/arenaDrillEngine.ts`,
  `src/pages/arena/{drillPool,actionOptions}.ts`.
- **Graphify signal:** n/a; found via cross-layer import grep (madge doesn't
  flag direction, only cycles).
- **Direct code confirmation:** yes.
- **Why it matters:** the imported helpers are pure domain logic (range
  compliance, c-bet policy, action labeling) — they belong in `analysis/`;
  leaving them under `pages/` invites the next page to import them and
  entrench the inversion, and it's one step from a genuine cycle.
- **Recommended action:** in the next Arena slice, move `drillPool.ts` and
  `actionOptions.ts` (or at least the six imported symbols) under
  `src/analysis/`. Recorded inside the abyss F19 entry in this PR.

#### Finding 3: Report-lag class recurred — fourth instance (#158/#160 vs abyss F19)

- **Status:** Recurring / Worsened as a class (#141/#142 on 07-09, #153 on
  07-10, now #158/#160 — the largest unrecorded landing yet)
- **Priority:** Medium (each instance is cheap to fix; the pattern defeats
  the SessionStart ledger's purpose)
- **Evidence:** `git log 7d183c6..HEAD -- docs/reports/` is empty; the abyss
  report still read "F19 … ArenaPage grew 1 405 → 1 499 — decomposition
  pressure is rising" while ArenaPage sat at 998 lines. A future session
  reading the ledger would have re-planned work that is already done.
- **Affected files/modules:** `docs/reports/2026-07-01-abyss-audit.md`.
- **Graphify signal:** n/a; report text vs git log.
- **Direct code confirmation:** yes.
- **Why it matters:** the abyss report is the SessionStart-surfaced
  execution ledger; four lags in three days means the "update the report in
  the landing PR" rule is not sticking for non-interactive/refactor PRs.
- **Recommended action:** F19 entry corrected in this PR (partial, with
  remaining scope and the Finding 2 layering note folded in). Process:
  consider a docs-reports checklist line in the PR template, or extend
  `docs:check` to warn when `src/pages/ArenaPage.tsx`-class files named in
  open reports change without a same-PR report edit (heuristic, may not be
  worth the complexity — owner's call).

#### Finding 4: First knip refill since the sweeps — two unused type exports

- **Status:** New (but the *underlying gap* — no knip CI gate — is
  Recurring since 07-08)
- **Priority:** Low
- **Evidence:** knip now reports 54 unused exported types (was 52):
  `PreflopAction` and `FeedbackStatus` at `arenaDrillEngine.ts:27-28`, both
  used only inside the file (`FeedbackStatus` is referenced by the exported
  `DrillActionEvaluation`, so only the redundant `export` keyword is the
  issue).
- **Affected files/modules:** `src/analysis/arenaDrillEngine.ts`; `ci.yml`
  (missing gate).
- **Graphify signal:** n/a; knip.
- **Direct code confirmation:** yes — grepped consumers.
- **Why it matters:** trivially, two keywords; systemically, it's the first
  counter-example to "zero refill without a gate" after 18 commits — the
  manual discipline held 12 commits, then didn't. Strengthens the ROADMAP P5
  case.
- **Recommended action:** drop the two `export` keywords in the next PR
  touching the file (bundled with the Finding 2 move); wire knip into CI
  with the reviewed allowlist.

## Prior Findings — Disposition (07-10 PM → now)

| PM finding | Disposition | Verification |
|---|---|---|
| 1. ArenaPage growth (High trend) | **Resolved** → Finding 1 | 1 499 → 998; #158/#160 reviewed line-level |
| 2. #153/F25 report lag | **Resolved for that instance; class Recurring** → Finding 3 | F25 record was fixed by #159; #158/#160 then repeated the class on F19 |
| knip-in-CI gap (tracked) | **Recurring, now with evidence** → Finding 4 | First refill observed (+2 types) |
| `writeStarterDiagnosticSummary` stray export | **Stale / unchanged** | knip still lists it; harmless; drop when file next touched |
| ArenaPage routing idiom | **Improved, not closed** | pushState down to one site (`ArenaPage.tsx:312`); parsing isolated in `studyQueueRoute.ts` |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Automated-tool signals that did not
survive verification, unchanged from prior runs:

- **Signal:** knip "Unused files (4)" in `scripts/`.
  **Why suspicious:** flagged as dead. **Checked:** they are the SessionStart
  hook, protocol CLIs, and a manual generator — entry points knip can't
  trace. **Conclusion:** false positives. **Follow-up:** allowlist when knip
  joins CI.
- **Signal:** knip "unused exported types" bulk (52 of the 54).
  **Conclusion:** documented forward contracts (solver boundary, spot-packet
  schema) — keep; decision recorded in abyss Wave 2. Only the 2 new ones
  (Finding 4) are real.

## Improvement Opportunities

- **Architecture:** relocate `drillPool.ts`/`actionOptions.ts` domain
  helpers to `src/analysis/` to remove the tree's only analysis→pages import
  (`arenaDrillEngine.ts:21-24`); continue F19 remainder (ArenaPage core,
  `store.ts` villain-observation block, `HandsUpload.tsx`, `CareerPage.tsx`,
  `RangesPage.tsx`); migrate `ArenaPage.tsx:312` pushState to React Router
  navigation during that slice.
- **Code quality:** drop unused `export` on `PreflopAction`/`FeedbackStatus`
  (`arenaDrillEngine.ts:27-28`) and the carried
  `writeStarterDiagnosticSummary` (`starterDiagnostic.ts:130`).
- **Tests:** healthy — 936 passing (+21), the extraction added direct unit
  tests for previously component-locked logic. Optional: direct parsing
  tests for `studyQueueRoute.ts` edge cases (encoded delimiters, malformed
  pairs) currently covered only via page-level deep-link tests.
- **Documentation:** F19 record fixed in this PR. The report-lag class needs
  a process answer (Finding 3), not another reminder.
- **Developer experience:** knip in CI (ROADMAP P5) — now backed by an
  observed refill, not just theory.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged.

## Review Ledger

- **Date/time:** 2026-07-11 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-bkxfa8` (== `origin/main` at review
  time).
- **Commit:** `b5491a4` (#160).
- **Scope:** full gate, madge, knip, bundle probing, line-by-line review of
  #155–#158/#160, layering-direction grep, prior-findings reconciliation vs
  the 07-10 PM run.
- **Graphify sync status:** index absent by policy; review ran Graphify-free.
- **Files changed since last run:** 6 commits / 5 substantive PRs, 27 files,
  +1 457/−620.
- **Areas inspected:** see table above.
- **New findings:** analysis→pages import inversion (Finding 2); knip type
  refill (Finding 4).
- **Recurring findings:** report-lag class, fourth instance (Finding 3,
  fixed here); knip-in-CI gap.
- **Resolved findings:** ArenaPage god-file growth (Finding 1 — prior runs'
  top recommendation executed).
- **Stale findings:** `writeStarterDiagnosticSummary` export (harmless,
  carried).
- **Recommended next actions:** (1) fold the layering fix + export cleanup
  into the next Arena/F19 slice; (2) wire knip into CI; (3) decide a process
  mechanism for report-updates-with-the-landing.

## Recommended Next Actions

1. **Move `drillPool`/`actionOptions` domain helpers into `src/analysis/`
   and drop the two unused type exports** — restores the tree's clean
   layer direction while the extraction is fresh —
   `src/analysis/arenaDrillEngine.ts`, `src/pages/arena/drillPool.ts`,
   `src/pages/arena/actionOptions.ts`.
2. **Wire knip into CI with the reviewed allowlist** — the first refill in
   18 commits just landed; manual discipline demonstrably decays —
   `.github/workflows/ci.yml`, ROADMAP P5.
3. **Pick a mechanism for report-updates-with-the-landing** — four lags in
   three days; options: PR-template checklist line or a `docs:check`
   heuristic — process rule, `docs/reports/*`.
