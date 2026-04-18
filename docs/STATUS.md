# STATUS — What's Actually Shipped

> **Purpose:** single source of truth for the current state of the code.
> Updated when reality changes, not when aspirations do.
> CLAUDE.md and ROADMAP.md describe *intent*; this file describes *fact*.

**Last verified against source:** 2026-04-18
**Branch at verification:** `updated-trying-new-stuff-poker`
**Tests at verification:** 331 / 331 passing (18 files, post-PT-purge)

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
`date-fns@4`, `poker-odds-calculator@0.4`, `jspdf@4`, `jspdf-autotable@5`.

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

Target: English. The 7 files previously listed as containing Portuguese
residue were purged on 2026-04-18 (TrendChart, LeaksPage, HandsPage,
HandReplay, csvExport, pdfExport, villainExploitCrossRef — including its
test fixture assertions).

Residue still present in *analysis-layer* `note` strings that flow into
UI tooltips / postflop leak cards (not on the Portuguese purge scope but
flagged for a follow-up pass):

- `src/analysis/pushFoldChecker.ts` (shove / fold / resteal notes)
- `src/analysis/postflopAnalyzer.ts` (turn probe / donk / c-bet notes)
- `src/analysis/finalTableAnalyzer.ts` (fake-shove / resteal notes)
- `src/analysis/bountyAnalyzer.ts` (equity-drop notes)
- `src/analysis/squeezeDetector.ts` (squeeze-spot notes)
- `src/analysis/rangeValidator.ts` (solver-delta notes)
- `src/analysis/icmDetector.ts` — `icmStageLabel` still returns
  `Início / Bolha / Mesa Final` (and `icmDetector.test.ts` asserts them)

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
4. **Postflop spots unused** — `postflopAnalyzer.ts:156–174` detects
   missed-c-bet / double-barrel / probe / donk but results never become
   per-hand leak flags.
5. **PDF hero name hardcoded** — ✅ FIXED 2026-04-17 (`utils/pdfExport.ts`
   now takes `heroName` param; `SessionsPage.tsx` passes from `useAppStore`).
6. **Session filter scope** — `activeSessionId` lives only in
   `DashboardPage.tsx:31`; other pages ignore it.
7. **Non-standard variants untested** — parser behaviour on Zoom, Cap,
   6+ Hold'em, play-money fixtures is not asserted.
8. **`aggregateVillainStats` outside txn** — `store.ts:155` runs after the
   Dexie transaction; failure leaves stale villain profiles.

## Repo hygiene

Layout (as of 2026-04-18 reorg):

- Root: tooling-required files only (`CLAUDE.md`, `GEMINI.md`, `README.md`,
  `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`,
  `.gitignore`).
- `docs/` — `STATUS.md`, `ROADMAP.md`, `PROMPT_GUIDE.md`, `strategy/`,
  `reports/`.
- `scripts/` — `scratch.ts`, `stress-test-parser.ts`, `test-odds.cjs`,
  `test-odds.mjs`, `test-summaries.cjs`, `fix_imports.cjs`, `README.md`.
- Old `tests/` directory deleted (was empty + a single script now in
  `scripts/`).

Outstanding: branch `updated-trying-new-stuff-poker` has ~30 dirty source
files plus 100+ untracked summary fixtures in `src/test/fixtures/summaries/`.
Commit or `.gitignore` those next — ROADMAP P3.13.

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

CLAUDE.md and GEMINI.md should reference this file rather than re-stating
structure or dep lists. Those two stay identical to each other; this file
stays identical to the code.
