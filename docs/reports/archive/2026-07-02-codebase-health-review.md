---
status: resolved
date: 2026-07-02
related: ['docs/reports/2026-07-01-abyss-audit.md', '#116', '#117', '#118']
---

# Codebase Health Review — 2026-07-02

Scheduled health review of `main` @ `2e5b3ca` (after PRs #116–#118), performed
in a remote session on branch `claude/relaxed-mccarthy-t2gibf`. This run's job
is ledger reconciliation against the active
[abyss audit](../2026-07-01-abyss-audit.md) plus an independent review of the
code that landed since its baseline (`39550c8`).

**Archived immediately with `status: resolved`:** this review found no new
open items of its own — every actionable finding is already tracked by the
abyss-audit waves. Nothing to keep surfaced.

## Codebase Health Summary

- **Overall health: good, and improving.** Full gate green in this container:
  `docs:check`, `typecheck`, `typecheck:test`, `lint` (0 errors, 2 warnings),
  **794/794 tests (72 files)** — up from 769 at the audit baseline — and a
  clean production build. The S1 gate breakage (F1) reported on 2026-07-01 is
  fixed (#116).
- **Main risks:** the abyss-audit Wave 1 correctness quickies are all still
  present and confirmed (circular dep F3, STATUS.md self-contradiction F4,
  undeclared `@eslint/js` F5, a11y warnings F22, Arena fake "Pot 0.0" F23,
  `window.confirm` F20, probe/donk OOP mislabeling F27); hero name remains
  unconfigurable (F2, product-blocking for any non-owner user); route bundles
  keep growing until Wave 3 lands (precache 2407 → 2425 KiB).
- **Highest-impact improvement:** land Wave 1 — every item was re-confirmed
  present today, each is small, and together they close the correctness lane.
- **Confidence level:** high for everything listed as confirmed (verified
  against source or by executing the gate); explicitly lower for the handful
  of audit items marked "not re-verified this run."

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-t2gibf` (from `main` @ `2e5b3ca`).
- **Git status:** clean working tree before this report was added.
- **Uncommitted changes:** none.
- **Graphify freshness:** **no Graphify index exists in this environment.**
  `graphify-out/` was deliberately de-committed in PR #65 (local-only tool on
  the owner's machine), and no Graphify skill/tool is available in this remote
  session. There is nothing to be stale — and nothing to navigate with.
- **Mismatches found:** n/a (no index to compare).
- **Substitute map:** madge (dependency/circular scan over 186 modules), the
  abyss audit's file-level map (verified per-claim), fresh build-chunk
  analysis, and direct inspection.
- **Confidence impact:** none on the conclusions below — all are backed by
  direct inspection or gate execution — but future "Graphify-assisted" runs
  should assume the index is never available remotely and budget for
  self-built maps.

## Graphify Map Exploration (substitute: madge + direct exploration)

- **Main application areas:** `src/parser` (PokerStars/GGPoker/OHH + worker),
  `src/analysis` (scenario/range/postflop + coach modules), `src/data`
  (Dexie store, Zustand appStore, ranges), `src/pages` (11 routes),
  `src/components` (career/dashboard/hands/shared).
- **Entry points:** `src/main.tsx` → `App.tsx` routes; `src/parser/worker.ts`
  (Web Worker) → `workerProcessor.ts`.
- **Core modules:** `data/store.ts` (910 lines, persistence + villain
  observation), `analysis/scenarioDetector.ts`, `analysis/rangeChecker.ts`,
  `parser/pokerstars.ts`.
- **Dependency clusters:** parser → analysis → types is mostly clean and
  one-directional; pages consume `shared/` components.
- **Circular dependencies:** exactly **1** (madge):
  `types/analysis.ts → analysis/finalTableAnalyzer.ts` (see F3 below).
- **Complexity hotspots:** `store.ts` (910), `HandsUpload.tsx` (~900 after
  R2's +87), `HandReplay.tsx`, `ArenaPage.tsx`, `CareerPage.tsx` — matching
  the audit's F19 god-file list; none shrank since the audit.
- **Isolated/orphaned areas:** `components/dashboard/StudyPlanCard.tsx` and
  `ValueSnapshotCard.tsx` still have zero importers outside their own folder
  (F7 — pending the Hermes R4 steer).

## Areas Inspected Directly

| Area | Why | Evidence | Result |
|---|---|---|---|
| Full verification gate | ground truth | docs:check, typecheck, typecheck:test, lint, 794 tests, build | **all green**, exit 0 |
| `git diff 39550c8..HEAD` (52 files, +2364/−202) | independent review of post-audit code (#116–#118) | full read of `workerProcessor.ts`, `types/hand.ts`, `ungradedScenarios.ts`, `scenarioDetector.ts` diffs; spot reads of `evidence.ts`, HandsUpload zip path | **no new defects found** (details below) |
| `scenarioDetector.ts:100–170` | verify new `BB_VS_RAISE_MULTIWAY` branch | `hasLimp = actionsBefore.some(call)` covers both limp+raise and raise+cold-call orderings | correct as intended |
| `workerProcessor.ts` provenance | verify R2 source metadata | `inferAccessMethod` `.zip/` convention matches HandsUpload's `${file.name}/${zipFileName}` payload naming; `HandImportSource` persists no filenames/paths | correct; privacy posture holds |
| Abyss findings F1–F5, F7, F9, F11–F14, F16, F20–F24, F26, F27 | ledger reconciliation | per-file greps/reads at current line numbers | 1 resolved, rest recurring (see below) |
| `docs/product/STATUS.md` | F4 re-check | lines 30 vs 331 | still self-contradictory |
| Hygiene greps | confirm audit's zero-`any` claim still holds | `any`/suppressions/TODO sweep over `src/` | still clean |

## Confirmed Findings

#### Finding: Gate restored — F1 resolved

- **Status:** Resolved
- **Priority:** —
- **Evidence:** `SEVERITY_ACCENT` is now consumed at `CoachsNotePage.tsx:93–94`; full gate exits 0 in this container.
- **Affected files/modules:** `src/pages/CoachsNotePage.tsx`
- **Graphify signal:** n/a
- **Direct code confirmation:** yes (PR #116).
- **Why it matters:** the only S1 from the audit is closed; Wave 0 is done.
- **Recommended action:** none — tick Wave 0 in the abyss audit's open items.

#### Finding: New R1/R2 code is clean (positive finding)

- **Status:** New
- **Priority:** Low (informational)
- **Evidence:** independent review of PRs #117/#118 diff surface: `ungradedScenarios.ts` (aggregation logic, deterministic ordering, no mutation leaks), the `BB_VS_RAISE_MULTIWAY` scenario branch (correctly catches both action orderings via `hasLimp`), `HandImportSource` typing and the `parserConfidence` heuristic (honest 'medium' for GGPoker), +25 new tests.
- **Affected files/modules:** `src/analysis/ungradedScenarios.ts`, `src/analysis/scenarioDetector.ts`, `src/parser/workerProcessor.ts`, `src/types/hand.ts`
- **Graphify signal:** n/a (post-index code).
- **Direct code confirmation:** yes.
- **Why it matters:** the two feature PRs since the audit did not add debt; test count rose 769 → 794.
- **Recommended action:** none.

#### Finding: Wave 1 correctness quickies all still present

- **Status:** Recurring (audit F3, F4, F5, F20, F22, F23, F27 — each re-confirmed today at current line numbers)
- **Priority:** High (as a batch; each item is small)
- **Evidence:**
  - F3: madge reports the single cycle; `types/analysis.ts:4` imports `FakeShoveSpot`/`RestealSpot` from `analysis/finalTableAnalyzer.ts`.
  - F4: `STATUS.md:30` says `/` = DashboardPage while its own autogen block (`STATUS.md:331`) says `/` = CoachsNotePage; `STATUS.md:228` still bills FACING_3BET (B4) / leak denominators (B5) as "next" though both shipped (#99/#100). The doc now contradicts itself in one file.
  - F5: `@eslint/js` imported at `eslint.config.js:1`, absent from `package.json`.
  - F20: `window.confirm` at `HandsUpload.tsx:493`.
  - F22: the 2 remaining lint warnings are the dropzone a11y pair at `HandsUpload.tsx:509`.
  - F23: hardcoded "Pot / 0.0" at `ArenaPage.tsx:528–529`; `DrillCard` still declares an unused `color` prop (`ArenaPage.tsx:583/587`).
  - F27: `PROBE_TURN`/`DONK_BET_TURN` (`postflopAnalyzer.ts:317–344`) still never check hero is OOP.
- **Affected files/modules:** as listed.
- **Graphify signal:** madge cycle (F3); rest by direct read.
- **Direct code confirmation:** yes, all seven.
- **Why it matters:** these are the audit's correctness lane; F4 in particular defeats STATUS.md's entire purpose (anti-drift doc that now self-contradicts) and has persisted across two reviews.
- **Recommended action:** land Wave 1 as one small gated PR; it was scoped as quickies on 2026-07-01 and nothing has changed.

#### Finding: Hero name still not configurable (F2)

- **Status:** Recurring
- **Priority:** High
- **Evidence:** `saveHeroName` (`store.ts:803`) still has zero callers outside its definition; no UI writes the setting.
- **Affected files/modules:** `src/data/store.ts`, `src/components/layout/Layout.tsx`
- **Graphify signal:** unused-export (knip, from the audit).
- **Direct code confirmation:** yes (grep over `src/`, non-test).
- **Why it matters:** product-blocking for any user whose screen name isn't `scorza23`; scheduled as Arc 5 in the direction review — flagged here so it doesn't silently age.
- **Recommended action:** keep Arc 5 next in the feature queue; consolidate the dual persistence (IndexedDB + zustand localStorage) while fixing, and fold F24 (`DEFAULT_HERO_NAME` const — literals confirmed today in 11 non-test files) into the same change.

#### Finding: Bundle weight unchanged-to-worse pending Wave 3

- **Status:** Recurring (F11/F12/F13/F16), mildly Worsened on totals
- **Priority:** Medium
- **Evidence:** fresh build: `SessionsPage` chunk 463.96 kB (149.15 gz, largest — jsPDF stack still route-bundled), `CareerPage` 444.14 kB (124.72 gz, was 440.82), html2canvas 199.56 kB chunk, gsap still imported by 4 dashboard components alongside framer-motion; PWA precache 2425.54 KiB / 61 entries (was 2407/60). Test suite still runs everything under one jsdom environment (`vite.config.ts:42`).
- **Affected files/modules:** `utils/pdfExport.ts` call sites, `components/dashboard/{BankrollChart,MonumentCurve,RingHud,VerdictGauge}.tsx`, `vite.config.ts`
- **Graphify signal:** audit F11–F13, F16.
- **Direct code confirmation:** yes (build output + imports).
- **Why it matters:** each feature PR grows the precache; the two biggest wins (lazy PDF ≈150 kB gz, node-env test split ≈ biggest CI-time win) are already scoped.
- **Recommended action:** run Wave 3 after the Hermes salvage slices, per the audit sequencing.

#### Finding: Polish backlog (Waves 2/4) intact — no drift up or down

- **Status:** Recurring (F7, F9, F12, F14, F21, F24, F26)
- **Priority:** Low–Medium
- **Evidence (each re-confirmed today):** StudyPlanCard/ValueSnapshotCard still orphaned (F7); all eight one-off scripts still in `scripts/` (F9); HandReplay equity still computed in a render IIFE, un-memoized (`HandReplay.tsx:580/602`, F14); duplicate rank tables `pokerstars.ts:673` vs `postflopAnalyzer.ts` `RANK_VALUES` (F21); `isBroadway` still byte-identical to `isHighCard` and the vestigial `heroBetFlop ? null : null` still at `postflopAnalyzer.ts:308` (F26).
- **Affected files/modules:** as listed.
- **Graphify signal:** audit S3/S5 sections.
- **Direct code confirmation:** yes for the items named; F8/F15/F17/F18/F19/F25/F28/F29 were **not** individually re-verified this run (no reason to believe they moved — no PR touched their surfaces).
- **Why it matters:** tracked debt; no escalation needed, but nothing regressed either.
- **Recommended action:** proceed per waves; nothing new to add.

## Graphify Signals Not Confirmed

- **Signal:** none available — no Graphify index exists in this environment (de-committed in PR #65; local-only).
- **Why it was suspicious:** n/a.
- **What was checked:** repo (`**/*graphify*`, `.graphify/`), session skills/tools.
- **Conclusion:** future remote health runs cannot use Graphify; the substitute (madge + gate + direct reads) covered structural questions adequately this run.
- **Recommended follow-up:** if Graphify navigation is wanted in remote runs, either re-commit a slim `GRAPH_REPORT.md`-only artifact on merge, or accept the substitute permanently and reword the routine.

Audit items not re-verified this run (unconfirmed today, presumed unchanged):
F6 (colon-in-name fixture), F8 (knip unused-export list), F10 (local worktree
debris — not observable from a fresh clone; only the primary worktree exists
here), F15, F17, F18, F19, F25, F28, F29.

## Improvement Opportunities

- **Architecture:** break the one madge cycle by moving `FakeShoveSpot`/`RestealSpot` type declarations out of `finalTableAnalyzer.ts` into `types/analysis.ts` (F3) — `types/` must stay a leaf.
- **Code quality:** Wave 1 batch (F20 ConfirmDialog swap, F23 Arena pot honesty, F26 dedupe, F27 OOP check); `DEFAULT_HERO_NAME` const with F2.
- **Tests:** the audit's §6 list stands (csvExport, pdfExport, format, strategyProfiles, appStore merge logic untested); add opportunistically as Waves 3/4 touch those files. R1/R2 set a good example (+25 tests with the features).
- **Documentation:** fix `STATUS.md` prose (F4) — or delete the hand-written routes/follow-ups prose in favor of the autogen blocks so this class of drift becomes impossible.
- **Developer experience:** F16 vitest environment split (458s cumulative jsdom setup for pure-Node parser/analysis tests) — biggest CI win, zero product risk.
- **Dependency cleanup:** declare `@eslint/js` (F5); converge on one animation library (F12).

## Review Ledger

- **Date/time:** 2026-07-02 (scheduled run)
- **Trigger:** scheduled routine — Graphify-assisted codebase health review
- **Branch:** `claude/relaxed-mccarthy-t2gibf`
- **Commit:** `2e5b3ca` (main HEAD at review time)
- **Scope:** full gate + ledger reconciliation vs 2026-07-01 abyss audit + independent review of PRs #116–#118 diff
- **Graphify sync status:** no index available (removed in #65); substitute map used
- **Files changed since last run (audit baseline `39550c8`):** 52 files, +2364/−202 (PRs #116, #117, #118)
- **Areas inspected:** see table above
- **New findings:** none negative; positive: R1/R2 code clean, +25 tests
- **Recurring findings:** F2–F5, F7, F9, F11–F14, F16, F20–F24, F26, F27
- **Resolved findings:** F1 (gate breakage, via #116)
- **Stale findings:** F10 not observable remotely; F6/F8/F15/F17–F19/F25/F28/F29 not re-verified this run
- **Recommended next actions:** see below

## Recommended Next Actions

1. Land abyss Wave 1 as one gated PR — all seven quickies re-confirmed present today, and F4's self-contradicting STATUS.md is now two reviews old — `types/analysis.ts`, `STATUS.md`, `package.json`, `HandsUpload.tsx`, `ArenaPage.tsx`, `postflopAnalyzer.ts`.
2. Keep Arc 5 (hero-name UI, F2) next in the feature queue — product-blocking for anyone but the owner; fold in F24's `DEFAULT_HERO_NAME` — `store.ts`, `Sidebar.tsx`/`Layout.tsx`, parser defaults.
3. After Hermes R3 lands, run Wave 3 starting with F11 (lazy-load the PDF stack) and F16 (vitest env split) — ~150 kB gz off the largest route and the biggest CI-time win — `utils/pdfExport.ts` call sites, `vite.config.ts`.
