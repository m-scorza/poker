---
status: resolved
date: 2026-07-12
related:
  - docs/reports/2026-07-01-abyss-audit.md
  - docs/reports/archive/2026-07-11-codebase-health-review.md
note: >
  Archived on creation (scheduled run of 2026-07-12). The gate is fully
  green and every finding from the 07-11 run was acted on within a day
  (#167 layering fix, #169-#172 F19 completion). The two items this run
  produced — the stale abyss F18/F19 text (fifth report-lag instance) and
  the missing protocol rule — are both fixed in this PR. Nothing is left
  open here.
---

# Codebase Health Review — 2026-07-12

Scheduled health review, run against `main` @ `b73fe1f` (9 commits / 9 PRs
after the 07-11 review's baseline `0cfca0e`: #163–#172). **Graphify was
unavailable this run** — same as every prior remote run: no Graphify skill,
index, or tooling exists in a fresh container (`graphify-out/` is
local-only by policy, PR #65). Every conclusion below comes from direct
inspection: the full verification gate executed in-container, `madge`,
`knip`, line counts, build-output probing, and review of the #164–#172
diffs.

## Codebase Health Summary

- **Overall health: very good — the best run-over-run delta yet.** In
  container: `docs:check`, `typecheck`, `typecheck:test`, `lint` (0
  errors, 0 warnings), **947/947 tests (91 files, ~35 s)**, production
  build OK (shell 376.59 KB — byte-identical to last run, well under the
  432 KiB CI budget; PWA precache 1 762 KiB), `madge --circular` clean
  (245 modules). All three of the 07-11 run's findings were acted on
  within a day: #167 resolved the analysis → pages layering inversion,
  #169–#172 completed the entire abyss F19 god-file program (store.ts
  929 → 790, HandsUpload 1 041 → 154, RangesPage 528 → 265, CareerPage
  717 → 238), and the knip type-refill was un-exported.
- **Main risks:** (1) the report-lag class recurred a **fifth** time —
  #167–#172 landed F19 completion + F18 clones #3/#4/#5 without updating
  the abyss report, which still read "Still open: … F19 remainder"
  (fixed in this PR, and the protocol rule the last two reviews asked for
  is now added to TASK_PROTOCOL §4); (2) knip is still not wired into CI
  (ROADMAP P5) and a *second* small refill appeared — unused exports went
  2 → 4 via the back-compat re-export shims #167 left in
  `src/pages/arena/` (`labelSeedAction` in actionOptions.ts:7, `shouldCbet`
  in drillPool.ts:8); (3) remaining hotspots are now spotPacket.ts (1 288),
  ArenaPage (998), store.ts (790), HandReplay (735), pokerstars.ts (717) —
  none growing this period.
- **Highest-impact improvement:** wire knip into CI with the reviewed
  allowlist — two refill cycles in two review periods now demonstrate the
  manual-sweep equilibrium decays after every refactor batch.
- **Confidence level:** high — all claims verified by executing the gate
  or reading source and diffs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-5qu39j`, started identical
  to `origin/main` @ `b73fe1f`.
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none at start; this PR adds the report + the
  two doc fixes.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from all prior remote runs. Substituted with madge
  (graph/cycles), knip (reachability), `wc -l` (hotspots), vitest
  (947-test collection), and build output (chunk clustering).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** `src/parser/`, `src/analysis/`, `src/data/`,
  `src/pages/`, `src/components/`. New sub-areas this period:
  `src/analysis/arena/` (drillLogic), `src/components/ranges/` (4 files),
  `src/components/career/` (4 tab components), and 4 new
  `src/components/hands/` panels + `useImportPipeline`.
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; SessionStart hook + fleet CLIs in `scripts/`.
- **Core modules / hotspots (lines):** `curriculumSeedPacks.generated.ts`
  2 514 (generated), `spotPacket.ts` 1 288, `ArenaPage.tsx` 998,
  `store.ts` **790 (−139)**, `HandReplay.tsx` 735, `pokerstars.ts` 717,
  `LeaksPage.tsx` 472, `useImportPipeline.ts` 457 (new, extracted).
  HandsUpload.tsx is now **154** (was 1 041), RangesPage **265** (was
  528), CareerPage **238** (was 717).
- **Dependency clusters:** parser → analysis → pages restored to
  unidirectional: `arenaDrillEngine.ts` now imports only from
  `analysis/arena/drillLogic.ts` (#167). No non-test analysis/data/parser
  file imports from `pages/` anymore (grep-verified).
- **Circular dependencies:** none (madge, 245 modules; was 230 — the 15
  new files are the F19 extractions + drillLogic).
- **Isolated/orphaned areas:** knip's four `scripts/` "unused files" —
  same false positives as every prior run (SessionStart hook, two fleet
  CLIs with their own vitest suite, manual generator).
- **Suspicious dependency relationships:** two type-only wobbles on the
  watchlist: `components/arena/ActionButton.tsx:2` imports `ActionColor`
  from `pages/arena/actionOptions` (components → pages, type-only), and
  `analysis/__tests__/arenaDrillEngine.test.ts:7` imports
  `pickRandomDecision` via the pages re-export shim instead of drillLogic.
  Neither creates a cycle; both dissolve if the shims are dropped.
- **Complexity or metric hotspots:** shell chunk 376.59 KB (flat);
  `pdfExport` lazy chunk 432.85 KB (unchanged, lazy); precache 1 762 KiB
  (flat). The decompositions moved code without moving bundle weight, as
  expected.

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All six gate commands executed in-container | Green: 947/947 tests (91 files), lint 0/0, build OK, shell 376.59 KB, precache 1 762 KiB |
| Dependency graph | Cycle regression check after 15 new modules | `npx madge --circular` (245 modules) | No cycles |
| Layering inversion (07-11 Finding 1) | Verify #167 actually fixed it | `arenaDrillEngine.ts` imports, grep for `pages/` imports across core layers | **Resolved** — helpers live in `analysis/arena/drillLogic.ts`; only a test and one type-only component import still touch `pages/arena` |
| Dead code | Refill check without CI gate | `npx knip` | Types back to 52 (07-11's 2-type refill un-exported by #167), but **unused exports 2 → 4**: the `labelSeedAction`/`shouldCbet` re-export shims #167 left in `pages/arena/{actionOptions,drillPool}.ts` |
| #169 villainObserver | ~145 analysis lines moved out of the data layer | Commit diff (verbatim move, 3 files), store.ts line count | Sound: store keeps persistence + `aggregateVillainStats` orchestration; matches the abyss F19 prescription exactly |
| #170 HandsUpload decomposition | Riskiest move — worker lifecycle + #164 watchdog semantics | `useImportPipeline.ts` skim (watchdog ref, `failImport`, `cancelImport`, terminate paths), commit message's one declared deviation | Sound: lifecycle logic intact in the hook; the declared deviation (diagnostics-cleared message no longer reset on import start) is cosmetic and documented |
| #171/#172 page decompositions | F19 + F18 clones #3/#4/#5 | Commit diffs, new `components/ranges/` + `components/career/` files, `DataHealthAlert` shared by CareerPage + LeaksPage | Sound: hooks stay in pages, presentation extracted; clone #4 correctly shared only the byte-identical core after drift |
| #164 import recovery fix | Behavioral fix with test additions | HandReplay diff (`chipAmount` formatting), HandsUpload watchdog/lifecycle diff, +109 test lines | Sound; the lifecycle semantics were then carried verbatim into #170's hook |
| #165/#166 fleet & kernel | Non-app orchestration surface | `.agents/workers.json`, `PILOTING.md`, `agent-kernel.cjs` abort-authority split, +62-line test | Sound and tested; app code untouched |
| Report/doc coherence | The recurring report-lag class | Abyss report Wave 4 text vs `git log` #167–#172; `TASK_PROTOCOL.md` grep for a report rule | **Fifth report-lag instance confirmed** — F19 completion and F18 partial landed with zero report edits; the protocol rule recommended by the last two reviews had not been added. Both fixed in this PR |

## Confirmed Findings

#### Finding 1: fifth report-lag instance — F19 completion + F18 partial landed without updating the abyss report

- **Status:** Recurring (fifth instance: #141/#142 on 07-09, #153 on
  07-10, #158/#160 on 07-11, now #167–#172) — **escalated**
- **Priority:** High as a process class (the individual instance is fixed
  in this PR)
- **Evidence:** the abyss report still read "**Still open:** F17, F18, F19
  remainder (store.ts, HandsUpload, CareerPage, RangesPage)" and "restore
  layering when F19 next touches Arena" while `git log 0cfca0e..b73fe1f`
  shows #167 resolving the layering note and #169–#172 landing every F19
  file; `grep -i report docs/agents/TASK_PROTOCOL.md` returned nothing —
  the checklist rule recommended on 07-10 and 07-11 was never added.
- **Affected files/modules:** `docs/reports/2026-07-01-abyss-audit.md`,
  `docs/agents/TASK_PROTOCOL.md`.
- **Graphify signal:** n/a; found by diffing report text against git log
  and line counts.
- **Direct code confirmation:** yes.
- **Why it matters:** the abyss report is the SessionStart-surfaced
  ledger; stale "still open" scope invites a future session to redo
  finished decompositions (F19 touches five large files — an expensive
  redo). Two consecutive prose nudges did not change behavior, which is
  exactly the enforcement failure mode CLAUDE.md warns about.
- **Recommended action:** done in this PR — F19 marked ✅ with per-file
  PR references, F18 re-scoped to clones #1/#2/#6/#7, and a **Report sync
  before completion** rule added to TASK_PROTOCOL §4. If the class recurs
  again despite the written rule, the next escalation is mechanical: teach
  `docs:check` to flag PRs that touch files named in an open report's
  `## Open items` without touching the report.

#### Finding 2: second knip refill — dead back-compat re-export shims from #167

- **Status:** Recurring class (first refill 07-11: 2 unused types; now: 2
  unused exports)
- **Priority:** Low (code), Medium (the knip-in-CI gap it evidences)
- **Evidence:** knip: unused exports 2 → 4. #167 left re-export shims in
  `src/pages/arena/actionOptions.ts:6-7` (`TrainerAction`,
  `labelSeedAction`, `pickRandomDecision`) and
  `src/pages/arena/drillPool.ts:7-8` (`DrillType`, `shouldCbet`,
  `isCbetActionCorrect`) "so consumers are unchanged" — but half the
  shim surface has no importers (`labelSeedAction`, `shouldCbet`), and
  the remaining consumers are one test and one type-only import that
  could point at `analysis/arena/drillLogic.ts` directly.
- **Affected files/modules:** `src/pages/arena/actionOptions.ts`,
  `src/pages/arena/drillPool.ts`,
  `src/analysis/__tests__/arenaDrillEngine.test.ts`,
  `src/components/arena/ActionButton.tsx`.
- **Graphify signal:** knip (substitute tool), verified by grep.
- **Direct code confirmation:** yes.
- **Why it matters:** trivial individually, but it is the second refill
  in two review periods, each immediately following a refactor batch —
  the pattern the unwired knip gate (ROADMAP P5) exists to stop. The
  "manual sweeps keep it at zero" argument is now contradicted twice.
- **Recommended action:** next Arena touch: delete the shims and point
  the drill-helper consumers (`arenaDrillEngine.test.ts`) at `drillLogic`
  directly (`ActionButton`'s `ActionColor` import is legitimate — that
  type is declared in `actionOptions.ts` itself). Independently: wire
  knip into CI with the reviewed allowlist (ROADMAP P5).

#### Finding 3: duplicate local `FeedbackStatus` type persists

- **Status:** Recurring (from 07-11 Finding 3; half-fixed)
- **Priority:** Low
- **Evidence:** `src/pages/ArenaPage.tsx:55` and
  `src/analysis/arenaDrillEngine.ts:26` each declare
  `type FeedbackStatus = 'correct' | 'deviation' | 'review'`. #167
  resolved the *knip* half of the 07-11 finding by un-exporting the
  engine's copy — which entrenches the duplication rather than removing
  it (the 07-11 recommendation was to import the engine's type).
- **Affected files/modules:** `src/pages/ArenaPage.tsx`,
  `src/analysis/arenaDrillEngine.ts`.
- **Graphify signal:** n/a (grep).
- **Direct code confirmation:** yes.
- **Why it matters:** if the two ever drift the feedback pill states and
  the engine's grading states silently diverge; TypeScript's structural
  typing hides the seam until then.
- **Recommended action:** export it from `arenaDrillEngine.ts` (or
  `drillLogic.ts`) and import in ArenaPage — one-line fix on the next
  Arena touch, bundled with Finding 2's shim removal.

## Prior Findings — Disposition (07-11 → now)

| 07-11 finding | Disposition | Verification |
|---|---|---|
| 1. analysis → pages layering inversion (`arenaDrillEngine.ts`) | **Resolved** (#167) | Helpers hoisted to `analysis/arena/drillLogic.ts`; grep shows zero non-test core-layer imports from `pages/`; madge clean |
| 2. report-lag class (fourth instance) | **Recurring — fifth instance** (Finding 1, escalated) | Abyss F19/F18 text stale again; TASK_PROTOCOL rule was never added; both fixed in this PR |
| 3. knip refill (2 unused types) + duplicate `FeedbackStatus` | **Half-resolved / recurring** | Types un-exported by #167 (52 again) — but a new 2-export refill appeared (Finding 2) and the type duplication persists (Finding 3) |
| knip-in-CI gap (recurring since 07-09) | **Recurring / worsened** | `ci.yml` still has no knip step; second consecutive refill observed |
| Stray `writeStarterDiagnosticSummary` export | **Stale / unchanged** | Still exported (`starterDiagnostic.ts:130`); still harmless; drop when next touched |
| F19 god files (abyss, tracked) | **Resolved** (#169–#172) | Line counts: store 790, HandsUpload 154, RangesPage 265, CareerPage 238; extractions spot-checked (see table above); 947/947 tests |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Substitute-tool signals that did
not survive verification, unchanged from prior runs:

- **Signal:** knip "Unused files (4)" in `scripts/`. **Why suspicious:**
  would be dead orchestration code. **What was checked:** the four files
  are the SessionStart hook, two fleet CLIs (with their own vitest
  suite), and a manual generator. **Conclusion:** false positives — entry
  points knip can't trace. **Follow-up:** allowlist when knip joins CI.
- **Signal:** knip "unused exported types" bulk (52). **Conclusion:**
  documented forward contracts (solver boundary, spot-packet schema) —
  keep decision recorded in abyss Wave 2. Zero net drift this period.

## Improvement Opportunities

- **Architecture:** none urgent — layering is unidirectional again and
  every page is under 1 000 lines. Next structural candidates when
  appetite exists: `spotPacket.ts` (1 288, single coherent schema module —
  probably fine) and `HandReplay.tsx` (735, last big component untouched
  by F19).
- **Code quality:** drop the `pages/arena` re-export shims and repoint
  the two remaining consumers (Finding 2); deduplicate `FeedbackStatus`
  (Finding 3); drop the stray `writeStarterDiagnosticSummary` export
  (`src/data/starterDiagnostic.ts:130`, carried since 07-10).
- **Tests:** healthy — 947 passing (+7 this period); #168 migrated
  sessions/store suites onto shared factories. Remaining local-factory
  holdouts flagged by #168 itself: `HandsPage.test.tsx`,
  `careerCoach.test.ts`.
- **Documentation:** abyss F18/F19 records fixed in this PR;
  TASK_PROTOCOL gained the report-sync rule. Watch whether the written
  rule actually breaks the report-lag streak; if not, make `docs:check`
  enforce it mechanically.
- **Developer experience:** wire knip into CI (ROADMAP P5) — two refill
  cycles now on record.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged.

## Review Ledger

- **Date/time:** 2026-07-12 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-5qu39j` (from `origin/main` @
  `b73fe1f`).
- **Commit:** `b73fe1f` (#172).
- **Scope:** full gate, madge, knip, line-count hotspots, diff review of
  the #164–#172 batch, prior-findings reconciliation vs the 07-11 run.
- **Graphify sync status:** index absent by policy; review ran
  Graphify-free.
- **Files changed since last run:** 9 commits / 9 PRs, 30 files,
  +2 387/−1 974 (excluding the 07-11 report itself).
- **Areas inspected:** see table above.
- **New findings:** none strictly new — all three findings are
  continuations of tracked classes.
- **Recurring findings:** report-lag class (fifth instance — escalated,
  protocol rule now written); knip refill class (second instance);
  duplicate `FeedbackStatus`.
- **Resolved findings:** 07-11 Finding 1 (layering inversion, #167);
  abyss F19 in full (#158/#160 + #169–#172), F18 clones #3/#4/#5
  (#171/#172).
- **Worsened findings:** none in code; the report-lag class escalated by
  count.
- **Stale findings:** `writeStarterDiagnosticSummary` export (harmless,
  carried).
- **Recommended next actions:** (1) wire knip into CI; (2) shim removal +
  `FeedbackStatus` dedup on next Arena touch; (3) watch whether the new
  TASK_PROTOCOL rule ends the report-lag streak — escalate to a
  `docs:check` mechanical guard if not.

## Recommended Next Actions

1. **Wire knip into CI with the reviewed allowlist** — two refill cycles
   in two review periods prove the manual-sweep equilibrium decays after
   every refactor batch — `.github/workflows/ci.yml`, ROADMAP P5.
2. **Delete the `pages/arena` re-export shims and dedupe
   `FeedbackStatus` on the next Arena touch** — removes 4 dead exports,
   one type duplication, and the last two indirect pages-layer references
   from core-layer consumers — `src/pages/arena/{actionOptions,drillPool}.ts`,
   `src/analysis/{arenaDrillEngine.ts,__tests__/arenaDrillEngine.test.ts}`,
   `src/pages/ArenaPage.tsx`.
3. **Hold the report-sync line** — the TASK_PROTOCOL §4 rule added in
   this PR is the last prose-level escalation; if a sixth report-lag
   instance appears, teach `docs:check` to fail PRs that touch files
   named in an open report's `## Open items` without touching the
   report — `scripts/` docs tooling, `docs/agents/TASK_PROTOCOL.md`.
