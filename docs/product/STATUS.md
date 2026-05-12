# STATUS — What's Actually Shipped

> **Purpose:** single source of truth for the current state of the code.
> Updated when reality changes, not when aspirations do.
> CLAUDE.md and ROADMAP.md describe *intent*; this file describes *fact*.

**Last verified against source:** 2026-04-19
**Branch at verification:** `phase-6-consolidated-final`
**Tests at verification:** 344 / 344 passing (21 files)

---

## Routes actually wired (`src/App.tsx`, `Sidebar.tsx`)

| Path | Component | Notes |
|---|---|---|
| `/` | `DashboardPage` | ROI Total, ITM Rate, position heatmap, trend charts, session filter (local only) |
| `/hands` | `HandsPage` | Upload UI inline via `showUpload` toggle |
| `/stats` | `StatsPage` | ROI by buy-in, AF Total, Total ITMs |
| `/ranges` | `RangesPage` | 13×13 grid, Oracle/Mirror dual matrix |
| `/leaks` | `LeaksPage` | Leak list with severity |
| `/sessions` | `SessionsPage` | Session list + CSV/PDF export |
| `/villains` | `VillainsPage` | Auto-classified archetypes, manual notes |
| `/arena` | `ArenaPage` | Training drills |
| `/career` | `CareerPage` | Tournament history, ROI / ITM dashboard, profit timeline |

## Pages / files *not* in the repo (despite older docs saying so)

- `UploadPage.tsx` — doesn't exist; upload is inline in `HandsPage`.
- `ConfigPage.tsx` — doesn't exist; strategy profile selector is in `Sidebar.tsx`;
  hero name is persisted in the IndexedDB `settings` table.
- `Board.tsx` shared component — doesn't exist; HandReplay builds its own.
- Component subdirs `ranges/`, `stats/`, `leaks/`, `sessions/`, `upload/`,
  `villains/` — none exist.

## Dependencies actually installed (`package.json`)

Runtime: `react@19`, `react-dom@19`, `react-router-dom@7`, `zustand@5`,
`dexie@4`, `dexie-react-hooks@4`, `recharts@3`, `framer-motion@12`,
`lucide-react@^1.7.0` *(verified 2026-04-18 — package jumped `0.577.0`
→ `1.0.0`; latest is `1.8.0`, pin is current-major)*, `clsx@2`,
`date-fns@4`, `poker-odds-calculator@0.4`, `jspdf@4`, `jspdf-autotable@5`,
`jszip@3` *(added 2026-04-19 for ZIP export decompression)*.

Dev: `vite@6`, `vitest@3`, `typescript@5.7`, `tailwindcss@4`,
`@tailwindcss/vite@4`, `@vitejs/plugin-react@4`, `tsx@4`.

**Not installed** (despite older doc claims): `pokersolver`,
`@holdem-poker-tools/hand-matrix`.

## Analysis modules (`src/analysis/`)

15 files: `bountyAnalyzer`, `finalTableAnalyzer`, `icmDetector`,
`leakDetector`, `math`, `positionStats`, `postflopAnalyzer`,
`pushFoldChecker`, `rangeChecker`, `rangeValidator`, `scenarioDetector`,
`squeezeDetector`, `villainClassifier`, `villainExploitCrossRef`, +
tests in `__tests__/`.

## UI language

Target: English. As of 2026-05-11, 100% of UI strings, tooltips, and analysis-layer `note` strings have been purged of Portuguese. The app is fully localized to English.

## Known correctness issues (not yet fixed)

1. **W$SD side-pot inflation** — ✅ FIXED 2026-04-18. Parser
   (`pokerstars.ts`) now exposes `showdownWinners: Set<string>` populated
   from SUMMARY `Seat N: <name> (pos)? showed [cards] and won` lines.
   `scenarioDetector.ts:188` gates `wonAtShowdown` on Set membership, not
   on raw `wonAmount > 0`, so wins without showing (muck after villain
   exposed losing hand) no longer inflate W$SD. Regression tests in
   `scenarioDetector.test.ts` ("W$SD detection").
2. **AF has no leak alert** — ✅ FIXED 2026-04-18. `detectLeaks`
   (`leakDetector.ts`) now pushes an `af` leak when the aggregation factor
   falls outside `thresholds.af.min/max` (Game Plan + Advanced both use
   `[2, 3]`). Gated on `totalCalls >= 10 && (totalBets + totalRaises) >= 10`
   so the ratio is stable; severity computed via the shared
   `computeSeverity` helper.
3. **`rangeChecker.ts:152` silent null** — ✅ FIXED 2026-04-18.
   `checkFacingRaise` now emits `console.warn` when `openerPosition` is
   missing (hero position / hand / action logged), making parser
   seat-to-position drops visible. Still returns `null` to skip from
   compliance — conservative over inventing a fallback opener.
4. **Postflop spots unused** — ✅ FIXED 2026-04-18. Logic from
   `postflopAnalyzer.ts` now produces actionable leaks in `leakDetector.ts`
   categorized by strategy source ([Vol.2], [D#07], [D#21]).
5. **PDF hero name hardcoded** — ✅ FIXED 2026-04-17 (`utils/pdfExport.ts`
   now takes `heroName` param; `SessionsPage.tsx` passes from `useAppStore`).
6. **Session filter scope** — ✅ FIXED 2026-04-18. `activeSessionId` promoted
   to global Zustand store (`appStore.ts`); filtering now propagates to
   `DashboardPage`, `HandsPage`, and `StatsPage`.
7. **Non-standard variants untested** — parser behaviour on Zoom, Cap,
   6+ Hold'em, play-money fixtures is not asserted.
8. **`aggregateVillainStats` outside txn** — `store.ts:155` runs after the
   Dexie transaction; failure leaves stale villain profiles.

## Repo hygiene

Layout (as of 2026-04-18 reorg):

- Root: tooling-required files only (`CLAUDE.md`, `AGENTS.md`, `README.md`,
  `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`,
  `.gitignore`).
- `docs/` — `STATUS.md`, `ROADMAP.md`, `PROMPT_GUIDE.md`, `strategy/`,
  `reports/`.
- `scripts/` — `scratch.ts`, `stress-test-parser.ts`, `test-odds.cjs`,
  `test-odds.mjs`, `test-summaries.cjs`, `fix_imports.cjs`, `README.md`.
- Old `tests/` directory deleted (was empty + a single script now in
  `scripts/`).

## Code + UX audit (Batch 1 — 2026-04-18)

Completed (quick wins):
- RangesPage `RangeValidatorPanel` Portuguese → English (12 strings)
- Dead state removed: `dateFrom`/`dateTo` useState + date filter inputs in HandsPage
- `aria-label` added to all icon-only buttons (HandsPage, HandReplay, ConfirmDialog)
- 4 hardcoded hex colors → CSS variables (`--color-bg-dialog`, `--color-bg-tooltip`,
  `--color-bg-board`, `--color-bg-card-solid` in `@theme` block)

Remaining (Batch 2 — medium effort):
- [x] Dialog accessibility: `role="dialog"`, `aria-modal`, Esc key, focus trap (Completed 2026-05-11)
- [x] Analysis-layer Portuguese purge: 7 files + test assertions (Completed 2026-05-11)
- [x] Worker error handling: post `FILE_ERROR` from worker, `WorkerMessage` union type
- [x] Villain aggregation atomicity (`store.ts` txn boundary) (Completed 2026-05-11)

Remaining (Batch 3 — structural):
- [x] Route-level code splitting (React.lazy + Suspense) (Completed 2026-05-11)
- [ ] Component smoke tests (happy-dom + @testing-library/react)
- [x] HandsPage decomposition (683 lines → extract hooks/components, added TanStack Virtual) (Completed 2026-05-11)
- [ ] DualRangeMatrix cell memoization
- [x] DashboardPage query optimization (split monolithic useLiveQuery) (Completed 2026-05-11)

---

## Machine-generated snapshots

These blocks are regenerated by `scripts/regen-status.ts` (run via
`npm run docs:update`). The pre-commit hook refuses to commit if they
are stale. Do not edit by hand.

### Dependencies

<!-- BEGIN:AUTOGEN:deps -->
**Runtime** (`dependencies`):

- @tanstack/react-table ^8.21.3
- @tanstack/react-virtual ^3.13.24
- @types/jszip ^3.4.0
- clsx ^2.1.1
- date-fns ^4.1.0
- dexie ^4.4.2
- dexie-react-hooks ^4.4.0
- framer-motion ^12.38.0
- jspdf ^4.2.1
- jspdf-autotable ^5.0.7
- jszip ^3.10.1
- lucide-react ^1.7.0
- poker-odds-calculator ^0.4.0
- react ^19.0.0
- react-dom ^19.0.0
- react-router-dom ^7.14.0
- recharts ^3.8.1
- vite-plugin-pwa ^1.3.0
- zustand ^5.0.12

**Build / test** (`devDependencies`):

- @tailwindcss/vite ^4.2.2
- @types/react ^19.0.0
- @types/react-dom ^19.0.0
- @vitejs/plugin-react ^4.3.4
- tailwindcss ^4.2.2
- tsx ^4.21.0
- typescript ~5.7.2
- vite ^6.0.0
- vitest ^3.0.0
<!-- END:AUTOGEN:deps -->

### Wired routes (`src/App.tsx`)

<!-- BEGIN:AUTOGEN:routes -->
| Path | Component |
|---|---|
| `/` | `DashboardPage` |
| `/arena` | `ArenaPage` |
| `/career` | `CareerPage` |
| `/hands` | `HandsPage` |
| `/leaks` | `LeaksPage` |
| `/pricing` | `PricingPage` |
| `/ranges` | `RangesPage` |
| `/sessions` | `SessionsPage` |
| `/stats` | `StatsPage` |
| `/villains` | `VillainsPage` |
<!-- END:AUTOGEN:routes -->

### Source tree

<!-- BEGIN:AUTOGEN:src-tree -->
```
src/parser/  (9 files)
  parser/buyInExtractor.ts
  parser/ggpoker.ts
  parser/handKey.ts
  parser/openHandHistory.ts
  parser/pokerstars.ts
  parser/position.ts
  parser/siteIdentifier.ts
  parser/tournamentSummary.ts
  parser/worker.ts
src/analysis/  (18 files)
  analysis/bountyAnalyzer.ts
  analysis/careerCoach.ts
  analysis/careerScope.ts
  analysis/finalTableAnalyzer.ts
  analysis/financials.ts
  analysis/icmDetector.ts
  analysis/leakDetector.ts
  analysis/math.ts
  analysis/positionStats.ts
  analysis/postflopAnalyzer.ts
  analysis/pushFoldChecker.ts
  analysis/rangeChecker.ts
  analysis/rangeValidator.ts
  analysis/scenarioDetector.ts
  analysis/squeezeDetector.ts
  analysis/studyPlan.ts
  analysis/villainClassifier.ts
  analysis/villainExploitCrossRef.ts
src/data/  (7 files)
  data/appStore.ts
  data/demoDataset.ts
  data/pushFoldRanges.ts
  data/ranges.ts
  data/sessions.ts
  data/store.ts
  data/strategyProfiles.ts
src/pages/  (10 files)
  pages/ArenaPage.tsx
  pages/CareerPage.tsx
  pages/DashboardPage.tsx
  pages/HandsPage.tsx
  pages/LeaksPage.tsx
  pages/PricingPage.tsx
  pages/RangesPage.tsx
  pages/SessionsPage.tsx
  pages/StatsPage.tsx
  pages/VillainsPage.tsx
src/components/  (23 files)
  components/career/CareerCoachCard.tsx
  components/career/CareerDashboard.tsx
  components/career/CareerScopePanel.tsx
  components/career/DayHourHeatmap.tsx
  components/career/LifetimeScorecard.tsx
  components/career/TimelineFeed.tsx
  components/dashboard/StudyPlanCard.tsx
  components/dashboard/TrendChart.tsx
  components/dashboard/ValueSnapshotCard.tsx
  components/hands/HandReplay.tsx
  components/hands/HandsFilters.tsx
  components/hands/HandsTable.tsx
  components/hands/HandsUpload.tsx
  components/layout/ErrorBoundary.tsx
  components/layout/Layout.tsx
  components/layout/Sidebar.tsx
  components/shared/Card.tsx
  components/shared/ConfirmDialog.tsx
  components/shared/DemoDataButton.tsx
  components/shared/DualRangeMatrix.tsx
  components/shared/InfoTooltip.tsx
  components/shared/RangeGrid.tsx
  components/shared/StatCard.tsx
src/utils/  (2 files)
  utils/csvExport.ts
  utils/pdfExport.ts
src/types/  (4 files)
  types/analysis.ts
  types/hand.ts
  types/ranges.ts
  types/villain.ts
```
<!-- END:AUTOGEN:src-tree -->

### Tests

<!-- BEGIN:AUTOGEN:tests -->
**Test files:** 32
**`it` / `test` calls (approximate):** 411

```
src/__tests__/App.test.tsx
src/analysis/__tests__/bountyAnalyzer.test.ts
src/analysis/__tests__/careerCoach.test.ts
src/analysis/__tests__/careerScope.test.ts
src/analysis/__tests__/finalTableAnalyzer.test.ts
src/analysis/__tests__/financials.test.ts
src/analysis/__tests__/icmDetector.test.ts
src/analysis/__tests__/leakDetector.test.ts
src/analysis/__tests__/positionStats.test.ts
src/analysis/__tests__/postflopAnalyzer.test.ts
src/analysis/__tests__/pushFoldChecker.test.ts
src/analysis/__tests__/rangeChecker.test.ts
src/analysis/__tests__/rangeValidator.test.ts
src/analysis/__tests__/scenarioDetector.test.ts
src/analysis/__tests__/squeezeDetector.test.ts
src/analysis/__tests__/studyPlan.test.ts
src/analysis/__tests__/villainClassifier.test.ts
src/analysis/__tests__/villainExploitCrossRef.test.ts
src/data/__tests__/demoDataset.test.ts
src/data/__tests__/demoSeedProgress.test.ts
src/data/__tests__/pushFoldRanges.test.ts
src/data/__tests__/ranges.test.ts
src/data/__tests__/sessions.test.ts
src/parser/__tests__/buyInExtractor.test.ts
src/parser/__tests__/fixtureSweep.test.ts
src/parser/__tests__/ggpoker.test.ts
src/parser/__tests__/ggpoker_robustness.test.ts
src/parser/__tests__/handKey.test.ts
src/parser/__tests__/openHandHistory.test.ts
src/parser/__tests__/pokerstars.test.ts
src/parser/__tests__/position.test.ts
src/parser/__tests__/siteIdentifier.test.ts
```
<!-- END:AUTOGEN:tests -->

---

## Update protocol

When shipping a change:

1. If the change affects structure, deps, routes, or language status,
   update this file in the same commit.
2. If the change fixes a "Known correctness issue" above, mark it
   ✅ FIXED with the commit date; don't delete the entry for 30 days
   (so PR reviewers know what shifted).
3. If the change adds a new phantom (e.g. a route that's not yet wired),
   add a `⚠️ PARTIAL` row, not a green ✅.

CLAUDE.md and AGENTS.md should reference this file rather than re-stating
structure or dep lists. This file stays identical to the code.
