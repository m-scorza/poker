# Codebase Health Review - 2026-06-11

Scheduled health review of `main` (HEAD `36ffabd`, after PRs #56-#57), performed
in a remote session on branch `claude/relaxed-mccarthy-pgzdw7`. Follows up on
`docs/reports/2026-06-10-codebase-health-review.md`.

> **Graphify note:** unlike yesterday's run, a committed Graphify index now
> exists (`graphify-out/`, added in PR #57, generated 2026-06-10 ~21:03 on the
> owner's Windows machine). It was used as a navigation map; every finding
> below was verified by direct inspection. Known index blind spots: all
> `.cjs` scripts (including `scripts/agent-kernel.cjs`),
> `docs/reports/2026-06-10-codebase-health-review.md`, binaries, and
> `package-lock.json` are not indexed (492 of 516 tracked files covered).
> The report's "Corpus Check: 2 files" line is wrong; 680 of 1716 nodes are
> isolated — treat its metrics as weak signals.

## Summary

- **Overall health: good.** Working tree clean, branch at `main` tip, full
  verification gate green in this remote sandbox:
  `docs:check` / `typecheck` / `typecheck:test` / `lint` (0 errors,
  7 jsx-a11y warnings) / **693 / 693 tests (63 files)**.
- Both fixes from yesterday's review are **verified resolved**: CI now runs
  `typecheck:test` (`.github/workflows/ci.yml:36`) and `agentKernel.test.ts`
  passes in a managed sandbox (git-config isolation works).
- No new high-priority issues. New findings are duplication/hygiene-level.

## Verification gate (this run)

| Check | Result |
|---|---|
| `npm run docs:check` | pass |
| `npm run typecheck` | pass |
| `npm run typecheck:test` | pass |
| `npm run lint` | pass (7 `jsx-a11y` warnings, 0 errors) |
| `npm test` | 693 / 693 (63 files) |

## Confirmed findings

### 1. STATUS.md verification stamp stale — FIXED in this PR
- **Status:** recurring (flagged 2026-06-10, finding 3). **Priority:** low.
- Header said 2026-06-05 / 666 tests / 61 files; actual is 693 / 63. Bumped
  the stamp after a full verified pass of the `main`-tip tree.

### 2. Formatter duplication regressed in career components — OPEN
- **Status:** recurring (originally closed by the code-hygiene
  "Formatter Consolidation (pct/money to format.ts)" item). **Priority:** medium.
- `src/utils/format.ts` provides `money()` / `pct()` / `ratioPct()`, but
  `CareerCoachCard.tsx:20-26` re-implements `formatMoney`/`formatPct` and
  `CareerScopePanel.tsx:7` re-implements `formatDate`. The local
  `formatMoney` uses `toLocaleString` (thousands separators) while
  `money()` uses `toFixed(2)` — two different money renderings in the UI.
- **Action:** fold thousands-separator support into `money()` and delete the
  local copies.

### 3. `DEVIATION_LABELS` defined twice, one copy untyped — OPEN
- **Status:** new. **Priority:** low-medium.
- `src/analysis/studyPlan.ts:45` (`Record<DeviationType, string>`, long-form)
  vs `src/components/hands/HandsTable.tsx:28` (`Record<string, string>`,
  short-form). The untyped copy means a new `DeviationType` member will not
  be caught by the compiler in HandsTable.
- **Action:** at minimum type the HandsTable map as
  `Record<DeviationType, string>`; ideally export short/long label maps from
  one module.

### 4. `RANKS` rank-order constant defined 5 times — OPEN
- **Status:** new. **Priority:** low.
- `data/ranges.ts:14` and `data/pushFoldRanges.ts:18` (string form);
  `shared/RangeGrid.tsx:10`, `shared/DualRangeMatrix.tsx:6`, and inline
  inside a function at `pages/RangesPage.tsx:148` (array form).
- **Action:** export one constant (e.g. from `src/data/ranges.ts` or a small
  `src/data/cards.ts`) and reuse.

### 5. `importRuns.ts` ↔ `store.ts` module cycle — OPEN (benign)
- **Status:** new (surfaced by Graphify's import-cycle check, confirmed).
  **Priority:** low.
- `store.ts:13` imports `type { ImportRunRecord }` from `importRuns.ts`
  (type-only, erased), while `importRuns.ts:12` re-exports `saveImportRun` /
  `getRecentImportRuns` from `store.ts` (runtime edge). No runtime hazard
  today, but the boundary is muddled: the record type lives in one file, its
  persistence in the other, re-exported back.
- **Action:** have consumers import the two functions from `store.ts`
  directly (only `LeaksPage`/`CareerPage` import from `importRuns` outside
  tests, and they only use `summarizeDataHealth`), or move the persistence
  functions into `importRuns.ts`.

### 6. Committed Graphify output embeds machine-specific data — OPEN
- **Status:** new (introduced by PR #57). **Priority:** low-medium.
- `graphify-out/.graphify_root`, `.graphify_python`, `manifest.json`, and
  `graph.json` contain absolute `C:\Users\MICRO\OneDrive\...` paths (local
  Windows username + OneDrive layout). For a repo with an explicit
  local/privacy posture this leaks environment detail, and the index cannot
  be regenerated or validated on another machine without path churn in every
  diff. `npm run privacy:check` does not cover this (runtime `src/` scope only).
- **Action:** decide policy — either gitignore the machine-specific files
  (`.graphify_root`, `.graphify_python`, `cache/`, `cost.json`) while keeping
  the report/graph, or relativize paths at generation time.

### 7. `scripts/` debris — OPEN
- **Status:** new. **Priority:** low.
- `scripts/fix_imports.cjs` is a one-off codemod whose own README entry says
  "Safe to delete if no longer needed"; `scripts/test-odds.cjs` and
  `test-odds.mjs` are duplicates; `scripts/scratch.ts` is an ad-hoc check.
- **Action:** delete `fix_imports.cjs`, keep one `test-odds.*` variant.

## Watchlist (carried forward, re-verified, unchanged)

- **`HandsUpload.tsx` (802 lines, no test)** — still the largest untested UI
  surface (`components/hands/__tests__/` contains only `HandReplay.test.tsx`).
- **`store.ts` (826 lines)** — ~300 lines of villain stat aggregation
  (`collectVillainHandObservation`, `aggregateVillainStats`, lines ~352-660)
  is analysis logic in the data layer; tested, so cohesion debt only.
- **7 `jsx-a11y/no-static-element-interactions` warnings** in `RangeGrid.tsx`,
  `DualRangeMatrix.tsx`, and others.
- **Page-level test coverage thin:** only `HandsPage` among 10 pages has a
  test. (Correction to the 2026-06-10 note: component coverage is broader
  than stated — 13 component/App test files exist across
  `shared/`, `career/`, `dashboard/`, `hands/`.)
- **`sumUsd` in `src/parser/money.ts`** imported by `DashboardPage.tsx:16`
  and `CareerPage.tsx:34` — shared util living in the parser layer.

## Graphify signals checked and NOT confirmed as issues

- **God nodes (`HeroDecision` 48 edges, `Hand`, `Position`, `Tournament`):**
  these are shared domain types in `src/types/`; high fan-in is by design,
  not coupling pathology.
- **680 isolated nodes / "missing edges":** overwhelmingly JSON config keys,
  fixture entities, and doc concepts — extraction granularity artifact.
- **"Corpus Check: 2 files · ~1,014,626 words":** internally inconsistent
  with 492 indexed files; tool reporting bug.
- **Inferred semantic edges** (e.g. handoff-protocol ↔ handoff-skill):
  plausible doc-level similarity, no action implied.

## Cross-run ledger

- **Date/trigger:** 2026-06-11, scheduled health review (Graphify-assisted).
- **Branch/commit:** `claude/relaxed-mccarthy-pgzdw7` @ `36ffabd` (= `main` tip).
- **Resolved since 2026-06-10:** CI `typecheck:test` enforcement (verified at
  `ci.yml:36`); kernel-test git isolation (verified by green run in managed
  sandbox); STATUS stamp (fixed in this PR).
- **Recurring:** formatter duplication (regressed), HandsUpload size/coverage,
  store.ts cohesion, a11y warnings, `sumUsd` placement.
- **New:** `DEVIATION_LABELS` ×2, `RANKS` ×5, importRuns↔store cycle,
  graphify-out machine paths, scripts debris.
- **Still-open long-tail (unchanged):** ROADMAP P3 fixture-variant tests,
  P4 StatsPage-vs-Career decision, P4.5 multi-site, P5 library upgrades;
  solver-validated facing-raise charts; user-validation execution.

## Recommended next actions

1. Consolidate money/pct/date formatting into `src/utils/format.ts` and type
   `HandsTable.DEVIATION_LABELS` — prevents silent UI drift.
2. Add a `HandsUpload` test (or extract its ZIP/diagnostics logic into
   testable modules) — largest untested surface, touches data integrity.
3. Decide the `graphify-out/` tracking policy (ignore machine-specific files
   or relativize paths) before the next index regeneration creates a
   52k-line churn diff.
