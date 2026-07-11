---
status: resolved
date: 2026-07-11
related:
  - docs/reports/2026-07-01-abyss-audit.md
  - docs/reports/archive/2026-07-10-codebase-health-review-pm.md
note: >
  Archived on creation (scheduled run of 2026-07-11). The gate is fully
  green, the prior run's top finding (ArenaPage god-file growth) was
  resolved by #158/#160, and the two actionable items from this run — the
  stale abyss F19 note and the new analysis→pages layering inversion — were
  respectively fixed in this PR and recorded in the abyss F19 remainder.
  Nothing is left open here.
---

# Codebase Health Review — 2026-07-11

Scheduled health review, run against `main` @ `0cfca0e` (7 commits / 7 PRs
after the 07-10 PM review's baseline `cc4732a`: #155–#162). **Graphify was
unavailable this run** — same as every prior remote run: `graphify-out/` is
gitignored by policy (PR #65) and no Graphify tooling exists in a fresh
container. Every conclusion below comes from direct inspection: the full
verification gate executed in-container, `madge`, `knip`, `vitest list`,
build-output probing, and line-by-line review of the new PR diffs.

## Codebase Health Summary

- **Overall health: good, and improved since the last run.** In-container:
  `docs:check`, `typecheck`, `typecheck:test`, `lint` (0 errors,
  0 warnings), **940/940 tests (91 files, ~30 s)**, production build OK
  (shell 376.59 KB, well under the 432 KiB CI budget; PWA precache
  1 760 KiB), `madge --circular` clean (230 modules). The 07-10 PM run's
  top finding — ArenaPage god-file growth — was *acted on the same day*:
  #158/#160 decomposed it 1 499 → 998 lines with logic preserved and new
  unit tests added.
- **Main risks:** (1) the decomposition introduced a layering inversion —
  `src/analysis/arenaDrillEngine.ts` imports runtime helpers from
  `src/pages/arena/` (the only core-layer file that depends on pages); no
  cycle yet, but the two packages now import each other at package level;
  (2) the report-lag class recurred a fourth time — #158/#160 landed the
  ArenaPage part of abyss F19 without updating the report's "pressure
  rising" note (fixed in this PR); (3) knip is still not wired into CI
  (ROADMAP P5), and this period produced the first small unused-export
  refill (2 new unused exported types in `arenaDrillEngine.ts`).
- **Highest-impact improvement:** restore unidirectional layering by moving
  the pure helpers `arenaDrillEngine.ts` needs (`shouldCbet`,
  `isCbetActionCorrect`, `labelSeedAction`, `pickRandomDecision`, and the
  `DrillType`/`TrainerAction` types) out of `src/pages/arena/` into the
  analysis layer — cheap now, expensive after more Arena work stacks on it.
- **Confidence level:** high — all claims verified by executing the gate or
  reading source and diffs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-xt6ex6`, identical to
  `origin/main` @ `0cfca0e` before this report was added (merge-base =
  HEAD = origin/main after fetch).
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from all prior remote runs. Index is local-only by policy; no
  tooling installed to regenerate. The task's "Graphify map" was
  substituted with madge (dependency graph/cycles), knip (reachability),
  `vitest list` (test collection), build output (chunk clustering), and
  `wc -l` (hotspots).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** unchanged — `src/parser/`, `src/analysis/`,
  `src/data/`, `src/pages/` (13 lazy routes), `src/components/`. New
  sub-area this period: `src/pages/arena/` (5 extracted modules) and
  `src/components/arena/` (3 presentational components).
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; `scripts/*` hooks and fleet CLIs.
- **Core modules / hotspots (lines):** `curriculumSeedPacks.generated.ts`
  2 514 (generated), `spotPacket.ts` 1 288, **`ArenaPage.tsx` 998
  (−501)**, `HandsUpload.tsx` 949, `store.ts` 929, `HandReplay.tsx` 734,
  `CareerPage.tsx` 717, `pokerstars.ts` 717. Only ArenaPage moved — in the
  right direction for the first time.
- **Dependency clusters:** parser → analysis → pages; `store.ts` the hub.
  New this period: a **bidirectional package-level edge** between
  `src/analysis/` and `src/pages/arena/` (see Finding 1).
- **Circular dependencies:** none (madge, 230 modules; was 220 — the ten
  new files are the Arena extraction plus `arenaDrillEngine`/`srsScheduler`
  additions).
- **Isolated/orphaned areas:** knip's four `scripts/` "unused files" —
  same false positives as prior runs (SessionStart hook, fleet CLIs,
  manual generator). Note `scripts/__tests__/agentKernel.test.ts` (new in
  #162) *is* collected and runs in the node vitest project — verified via
  `vitest list`.
- **Suspicious dependency relationships:** `arenaDrillEngine.ts:21-24`
  (analysis) importing `drillPool`/`actionOptions` (pages) — Finding 1.
  ArenaPage's imperative `history.pushState` routing idiom persists but is
  now concentrated in `src/pages/arena/studyQueueRoute.ts`, which makes the
  eventual React Router cleanup easier.
- **Complexity or metric hotspots:** shell chunk 376.59 KB (376.41 before —
  +0.18 KB, flat); `pdfExport` lazy chunk 432.85 KB (unchanged, lazy);
  precache 1 760 KiB (+2 KiB).

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All six gate commands executed in-container | Green: 940/940 tests (91 files), lint 0/0, build OK, shell 376.59 KB, precache 1 760 KiB |
| Dependency graph | Cycle regression check after 10 new modules | `npx madge --circular` (230 modules) | No cycles |
| Dead code | Refill check without CI gate | `npx knip` | 4 script false positives (unchanged), 2 known deliberate exports, **54 unused exported types (was 52)** — the 2 new ones are `PreflopAction`/`FeedbackStatus` in `arenaDrillEngine.ts:27-28` |
| #158 extraction | 457 lines moved out of the god file | Commit diff, `src/pages/arena/*` (5 modules), `src/components/arena/*` (3 components) | Sound: pure/presentational code only, stateful core untouched, tests pass with import-path updates |
| #160 drill engine | Grading logic crossed into `src/analysis/` | `arenaDrillEngine.ts` full read, `arenaDrillEngine.test.ts`, ArenaPage consumption (`ArenaPage.tsx:15`) | Logic faithful (null-return guards match old early-returns; review-only actions don't touch score), **but imports from pages layer — Finding 1**; ArenaPage also re-declares a duplicate local `FeedbackStatus` (`ArenaPage.tsx:55`) |
| #157 SRS fixes | 3 behavioral bugs in one PR | Commit message, `srsScheduler.ts` (`requeueLapsedSpot`), starter-diagnostic sampling change, +35-line test additions | Sound: requeue is pure and wired into spaced_review advance; diagnostic now samples every pack instead of first 4 |
| #155/#156 freeroll ROI | Money math changed twice in one day | `financials.ts` diff (`computeRoiPct` filter removed), `careerScope.ts` (`freerollsExcluded`/`freerollProfit`), `CareerPage.tsx:4` tier-row `—` | Sound and consistent: pooled ROI keeps freeroll prizes in the numerator; per-tournament mean discloses exclusions; no other pooled sum had the pre-filter (part-C audit spot-checked) |
| #162 fleet scripts | 250+ lines in orchestration CLIs | `agent-kernel.cjs` diff (schema validation for `mode`/`worker_tier`/`lane`/`freshness_days`), `parallel-runner.cjs` (`--help`, `--allow-stale`, explicit `--all-pending`), new `agentKernel.test.ts` | Sound; validation tightened, defaults explicit, and the kernel gained its first tests (collected in the node vitest project) |
| #162 plan doc | 492-line product-direction doc | `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md` header + D1/D2 | Plan-only, correctly marked "NO PRODUCT IMPLEMENTATION AUTHORIZED"; consistent with repo architecture; no code claims to verify |
| Report/doc coherence | Protocol check (report-lag class) | `git log cc4732a..HEAD` vs abyss report text | #159 recorded F25/#153 correctly, but **#158/#160 landed F19's ArenaPage scope without updating the report** — the "pressure rising, 1 499" note was stale. Fixed in this PR |

## Confirmed Findings

#### Finding 1: analysis → pages layering inversion in `arenaDrillEngine.ts`

- **Status:** New
- **Priority:** Medium
- **Evidence:** `src/analysis/arenaDrillEngine.ts:21-24` imports
  `DrillType`, `shouldCbet`, `isCbetActionCorrect` from
  `../pages/arena/drillPool` and `TrainerAction`, `labelSeedAction`,
  `pickRandomDecision` from `../pages/arena/actionOptions`. Meanwhile
  `src/pages/arena/drillPool.ts:1` and `actionOptions.ts:3` import from
  `src/analysis/` — the two packages now depend on each other. A grep
  across `src/analysis|data|parser|utils` shows this is the **only**
  non-test core-layer file importing from `pages/`.
- **Affected files/modules:** `src/analysis/arenaDrillEngine.ts`,
  `src/pages/arena/drillPool.ts`, `src/pages/arena/actionOptions.ts`.
- **Graphify signal:** n/a (no index); madge confirms no file-level cycle
  yet.
- **Direct code confirmation:** yes — imports read in source; the #160
  header comment even acknowledges the arrangement ("already live in
  src/pages/arena and are imported here").
- **Why it matters:** the repo's dependency direction is parser → analysis
  → pages; this is the first inversion. It's benign today (madge clean),
  but any future import of `arenaDrillEngine` from `drillPool`/
  `actionOptions` creates a real cycle, and the abyss F3 incident showed
  cycles here get fixed reactively. It also makes `arenaDrillEngine`
  untestable in isolation from page code, which was the stated point of
  the extraction.
- **Recommended action:** move the six pure symbols
  (`shouldCbet`, `isCbetActionCorrect`, `DrillType`, `TrainerAction`,
  `labelSeedAction`, `pickRandomDecision`) into the analysis layer (e.g.
  `src/analysis/arenaDrillSupport.ts` or into `arenaDrillEngine.ts`
  itself) and re-export/import from `pages/arena` — or move
  `arenaDrillEngine.ts` under `src/pages/arena/`. Recorded in the abyss
  F19 remainder (this PR) so it rides the next Arena touch.

#### Finding 2: #158/#160 landed abyss F19's ArenaPage scope without updating the report

- **Status:** Recurring (fourth instance of the report-lag class:
  #141/#142 on 07-09, #153 on 07-10, #158/#160 now)
- **Priority:** Low (fixed in this PR), but the class keeps recurring
  despite two consecutive review nudges
- **Evidence:** the abyss report's Wave 4 note still read "ArenaPage grew
  1 405 → 1 499 lines … decomposition pressure is rising, not stable"
  while the tree's `ArenaPage.tsx` is 998 lines; `git log` shows no
  report edit in #158 or #160.
- **Affected files/modules:** `docs/reports/2026-07-01-abyss-audit.md`.
- **Graphify signal:** n/a; found by diffing report text against `wc -l`
  and `git log`.
- **Direct code confirmation:** yes.
- **Why it matters:** the abyss report is the SessionStart-surfaced
  execution ledger; a stale "pressure rising" note invites a future
  session to re-decompose a page that's already done, or to misjudge F19's
  remaining scope (which is store.ts/HandsUpload/CareerPage/RangesPage,
  not ArenaPage).
- **Recommended action:** done in this PR — F19 marked partial
  (#158/#160), remainder re-scoped to the four originally-listed god
  files, Finding 1's layering note attached to the remainder. Process
  rule stands: PRs that land an open report's scope must update the
  report in the same PR.

#### Finding 3: small dead-export refill from #160 + duplicated `FeedbackStatus` type

- **Status:** New (first knip refill observed since the Wave-2 sweep)
- **Priority:** Low
- **Evidence:** knip: unused exported types went 52 → 54 — `PreflopAction`
  (`arenaDrillEngine.ts:27`) and `FeedbackStatus` (`:28`) are exported but
  imported nowhere; both are used internally. Meanwhile
  `ArenaPage.tsx:55` re-declares its own structurally-identical
  `type FeedbackStatus = 'correct' | 'deviation' | 'review'` instead of
  importing the engine's.
- **Affected files/modules:** `src/analysis/arenaDrillEngine.ts`,
  `src/pages/ArenaPage.tsx`.
- **Graphify signal:** knip (substitute tool), verified by grep.
- **Direct code confirmation:** yes.
- **Why it matters:** trivial individually, but it's the exact drift
  pattern the unwired knip gate (ROADMAP P5) is meant to catch — the
  refill started the first period after a refactor, as predicted by the
  last two reviews.
- **Recommended action:** in the next Arena touch: import `FeedbackStatus`
  from the engine in ArenaPage (deleting the local re-declaration makes
  the export used) and drop the `export` on `PreflopAction`. Wire knip
  into CI per ROADMAP P5 to make this class self-enforcing.

## Prior Findings — Disposition (07-10 PM → now)

| PM finding | Disposition | Verification |
|---|---|---|
| 1. ArenaPage god-file growth (Worsened, High trend) | **Resolved** (#158/#160) | 1 499 → 998 lines; extraction reviewed line-by-line; logic preserved; +25 tests. F19's four original god files remain tracked in the abyss report |
| 2. #153/F25 report lag | **Resolved** (#159) — but the *class* recurred as Finding 2 | Abyss report F25 text current; F19 text was not |
| knip-in-CI gap (recurring since 07-09) | **Recurring / worsened slightly** | `ci.yml` still has no knip step (grep confirms); first refill observed (Finding 3) — the mitigating "zero refill" data point no longer holds |
| Stray `writeStarterDiagnosticSummary` export | **Stale / unchanged** | Still exported (`starterDiagnostic.ts:130`); still harmless; drop when next touched |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Substitute-tool signals that did
not survive verification, unchanged from prior runs:

- **Signal:** knip "Unused files (4)" in `scripts/`. **Why suspicious:**
  would be dead orchestration code. **What was checked:** the four files
  are the SessionStart hook, two fleet CLIs (now with their own vitest
  suite), and a manual generator. **Conclusion:** false positives — entry
  points knip can't trace. **Follow-up:** allowlist when knip joins CI.
- **Signal:** knip "unused exported types" bulk (52 of the 54).
  **Conclusion:** documented forward contracts (solver boundary,
  spot-packet schema) — keep decision recorded in abyss Wave 2. Only the
  2 new ones (Finding 3) are real drift.

## Improvement Opportunities

- **Architecture:** restore unidirectional layering for
  `arenaDrillEngine.ts` (Finding 1) — `src/analysis/arenaDrillEngine.ts`,
  `src/pages/arena/{drillPool,actionOptions}.ts`. Then continue F19 with
  the four original god files, starting with `store.ts`'s
  `collectVillainHandObservation` block (~200 lines of analysis in the
  data layer).
- **Code quality:** deduplicate `FeedbackStatus` and unexport
  `PreflopAction` (Finding 3); drop the stray `writeStarterDiagnosticSummary`
  export (`src/data/starterDiagnostic.ts:130`, carried since 07-10 AM).
- **Tests:** healthy — 940 passing (+25 this period); the fleet kernel
  gained its first suite (#162); the extraction PRs shipped
  characterization tests. No new gaps found.
- **Documentation:** abyss F19 record fixed in this PR. Process nudge
  (fourth instance): PRs that land an open report's scope must update the
  report in the same PR — consider adding a PR-checklist line to
  `docs/agents/TASK_PROTOCOL.md` since prose nudges haven't held.
- **Developer experience:** wire knip into CI (ROADMAP P5) — now with
  evidence the manual-sweep equilibrium decays (Finding 3).
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged.

## Review Ledger

- **Date/time:** 2026-07-11 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-xt6ex6` (== `origin/main` at review
  start).
- **Commit:** `0cfca0e` (#162).
- **Scope:** full gate, madge, knip, `vitest list`, bundle probing,
  line-by-line review of the #155–#162 batch, prior-findings
  reconciliation vs the 07-10 PM run.
- **Graphify sync status:** index absent by policy; review ran
  Graphify-free.
- **Files changed since last run:** 7 commits / 7 PRs, 39 files,
  +2 421/−679.
- **Areas inspected:** see table above.
- **New findings:** Finding 1 (analysis → pages layering inversion),
  Finding 3 (first knip refill + duplicated type).
- **Recurring findings:** report-lag class (F19 note, fixed here — fourth
  instance); knip-in-CI gap (now with first observed refill).
- **Resolved findings:** PM Finding 1 (ArenaPage god-file growth —
  resolved by #158/#160, verified by line count and diff review).
- **Worsened findings:** none in code; knip-in-CI gap's mitigation
  ("zero refill") expired.
- **Stale findings:** `writeStarterDiagnosticSummary` export (harmless,
  carried).
- **Recommended next actions:** (1) fix the arenaDrillEngine layering
  inversion; (2) wire knip into CI; (3) make the report-update-with-the-
  landing rule a TASK_PROTOCOL checklist item.

## Recommended Next Actions

1. **Move `arenaDrillEngine`'s pages-layer dependencies into the analysis
   layer** — first dependency-direction inversion in the tree; cheap now,
   a cycle risk once more Arena work stacks on it —
   `src/analysis/arenaDrillEngine.ts`,
   `src/pages/arena/{drillPool,actionOptions}.ts`.
2. **Wire knip into CI with the reviewed allowlist** — the "zero refill"
   evidence that made this deferrable expired this period (52 → 54) —
   `.github/workflows/ci.yml`, ROADMAP P5.
3. **Add "updated open reports touched by this PR" to the task protocol
   checklist** — fourth report-lag in three days; two review-report nudges
   haven't changed behavior — `docs/agents/TASK_PROTOCOL.md`,
   `docs/reports/*`.
