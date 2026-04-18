# Project Roadmap — Poker Hand Analyzer (scorza23)

> **Scope:** historical phase log + prioritised punch list.
> **What's actually shipped** lives in `STATUS.md` — read that first.
> If this file and `STATUS.md` disagree, STATUS.md wins; fix this one.

---

## Phase log (shipped)

### Phase 1: MVP — Complete
- [x] PokerStars hand history parser (custom regex, BOM handling, dedup)
- [x] File upload (drag-and-drop, multi-file, inline in HandsPage)
- [x] Hand explorer with basic filters (position, scenario, action, compliance)
- [x] Basic stats: VPIP, PFR, C-bet, WTSD, AF, Won at SD
- [x] Range compliance by position with 13×13 grid

### Phase 2: Analysis — Complete
- [x] Leak detector with severity ratings (10 metrics, dual-profile thresholds)
- [x] Session manager (auto-group by 4h gap, per-session stats table)
- [x] Trend charts (Recharts, VPIP/PFR/C-bet/Compliance evolution)
- [x] Postflop analysis (board texture, missed c-bets, double barrel, probe, donk)

### Phase 2.5: Theory Integration — Complete
- [x] Strategy profile system (Game Plan vs Advanced)
- [x] Board texture classifier for context-dependent c-bet analysis
- [x] Villain Tracker with MDA-based auto-classification
- [x] Advanced profile: texture-dependent c-bet, ICM-aware BB defense,
      deep stack 3-bet sizing
- [x] Manual villain notes and tags
- [x] ICM stage detection (early/mid/bubble/FT)
- [x] Leak tooltips with source attribution (`[GamePlan]`, `[Vol.X]`, `[D#N]`)

### Phase 3: Polish — Complete
- [x] Hand replay (visual, street-by-street with postflop analysis)
- [x] Advanced filters (stack depth, ICM sensitivity, hand category)
- [x] Short stack push/fold checker (push ranges + resteal ranges)
- [x] CSV session export
- [x] Customizable ranges (user-editable grids with push/fold view)
- [x] PDF session export

### Phase 4: Bounty & Advanced — Complete
- [x] Bounty tournament detection and equity drop calculation
- [x] BPWR (Bounty Power) calculator
- [x] FT-specific analysis (fake shove detection, resteal spots)
- [x] Squeeze play detection and analysis

### Phase 5: Accuracy & Analytics Depth — Complete
- [x] W$SD false positives — detect actual `*** SHOW DOWN ***` section
- [x] PnL badge scoped to session filter
- [x] TrendChart Y-axis `['auto','auto']` for PnL charts
- [x] HandReplay duplicate postflop section removed
- [x] AF calculation fixed (raises + calls from `HeroDecision.action`)
- [x] Chips Won → Win %
- [x] TrendChart double card wrapper removed
- [x] Charts on session filter → intra-session 25-hand buckets
- [x] Session-scoped financials
- [x] Postflop stats row (C-bet, C-bet HU, Double Barrel, AF, ITM Rate)
- [x] Position performance heatmap (VPIP/PFR/Compliance/Win% per position)
- [x] Info tooltips on all stat cards
- [x] ITM rate from tournament summaries
- [x] Position-by-position breakdown table with color-coded cells
- [x] Postflop analysis section (missed C-bets, probe turns, donk bets)
- [x] Basic chip EV (`netProfit` = won - invested per hand)
- [x] Win rate metric (Chips / Hand)
- [x] Actionable leak cards (aggregated clusters)
- [x] Sidebar active indicator glow, StatCard accent bars
- [x] HandReplay modal frosted glass + slide-up animation
- [x] Sessions page PnL sparkline bars
- [x] RangeGrid multi-colored action strips (Mirror 2.0)

### Phase 6: Intelligence & Premium Arena — Complete
- [x] High-performance parser (Web Worker + Framer-Motion progress)
- [x] Logic Solver: texture-aware compliance, equity math, MDF/Alpha
- [x] The Arena Trainer (isometric, fault-fixer game loop)
- [x] Expandable Report Cards + Session Nemesis tracking
- [x] Multi-surface Starred Hands system

---

## Maintenance & Punch List (2026-04-17)

Platform is in maintenance + targeted fixes mode. Items below are pulled
from the 2026-04-17 audit. Execution order is cheapest-to-biggest-payoff.
Known correctness issues with code anchors are tracked in `STATUS.md`.

### P0 — One-line fixes
- [x] PDF hero name hardcoded → parameterise (`utils/pdfExport.ts`)
- [x] Verify `lucide-react@^1.7.0` pin — confirmed current (2026-04-18):
      package bumped `0.577.0` → `1.0.0`, latest is `1.8.0`
- [x] ~~Guard HU_BTN from limp leak~~ (false alarm — filter at
      `leakDetector.ts:91` already excludes `HU_BTN`)

### P1 — Small, tested fixes
- [x] W$SD side-pot inflation (2026-04-18) — parser now tracks
      `showdownWinners: Set<string>` from SUMMARY `showed [cards] and won`
      lines; `scenarioDetector.ts:188` gates `wonAtShowdown` on Set
      membership, no longer on raw `wonAmount > 0`
- [x] AF leak alert (2026-04-18) — `detectLeaks` now pushes an `af` leak
      when `af < thresholds.af.min || af > thresholds.af.max`, gated on
      `totalCalls >= 10 && (totalBets + totalRaises) >= 10` so the ratio is
      stable before alerting. Severity via standard `computeSeverity`.
- [x] `rangeChecker.ts:152` silent null (2026-04-18) — `checkFacingRaise`
      now emits a `console.warn` on unknown `openerPosition` (hero/hand/
      action), so parser mapping drops are visible in dev tools; still
      returns `null` (skipped from compliance) to stay conservative.

### P2 — Medium fixes
- [x] Portuguese purge (2026-04-18) — 7 files from STATUS.md (TrendChart,
      LeaksPage, HandsPage, HandReplay, csvExport, pdfExport,
      villainExploitCrossRef) translated to English; 4 test assertions in
      `villainExploitCrossRef.test.ts` rewritten against the new English
      strings. Tests: 331/331 still green. Analysis-layer note strings
      (pushFoldChecker, postflopAnalyzer, finalTableAnalyzer,
      bountyAnalyzer, squeezeDetector, rangeValidator, `icmStageLabel`)
      remain PT and are flagged in STATUS.md for a follow-up pass.
- [x] Postflop leak wiring (2026-04-18) — Surface `PostflopAction` flags
      (`postflopAnalyzer.ts:156-174`) as per-hand leaks in HandsPage
      and LeaksPage. Logic attributed to [Vol.2], [D#07], [D#21].
- [x] Promote `activeSessionId` into `useAppStore` (2026-04-18) — Session filter
      now applies globally to Dashboard, Hands, and Stats pages.
- [ ] UI smoke tests for `TrendChart`, `StatCard`, `RangeGrid`,
      `HandReplay`, `DualRangeMatrix`
- [ ] Villain aggregation atomicity — move `aggregateVillainStats` into
      the Dexie transaction (`store.ts:155`), or add repair path

### P2.5 — Code + UX Audit (2026-04-18)

**Batch 1 (quick wins) — DONE:**
- [x] RangesPage `RangeValidatorPanel` Portuguese → English
- [x] HandsPage dead state removal (`dateFrom`/`dateTo` + orphaned date filter inputs)
- [x] `aria-label` on all icon-only buttons (HandsPage, HandReplay, ConfirmDialog)
- [x] Hardcoded hex → CSS variables (`--color-bg-dialog`, `--color-bg-tooltip`,
      `--color-bg-board`, `--color-bg-card-solid`)

**Batch 2 (medium effort) — TODO:**
- [ ] Dialog accessibility: `role="dialog"`, `aria-modal`, Esc key, focus trap
      (HandReplay, ConfirmDialog)
- [ ] Worker error handling: post `FILE_ERROR` from worker catch, define
      `WorkerMessage` union type, handle in HandsPage
- [ ] Analysis-layer Portuguese purge: 7 files (pushFoldChecker, postflopAnalyzer,
      finalTableAnalyzer, bountyAnalyzer, squeezeDetector, rangeValidator,
      icmDetector) + `icmDetector.test.ts` assertions
- [ ] Villain aggregation atomicity: try/catch + repair path for
      `aggregateVillainStats` in `store.ts`

**Batch 3 (structural) — TODO:**
- [ ] Component smoke tests (happy-dom + @testing-library/react)
- [ ] HandsPage decomposition (extract `useHandsFilters`, `HandsTable`,
      `HandsUpload`, shared `Select`)
- [ ] Route-level code splitting (React.lazy + Suspense in App.tsx)
- [ ] DualRangeMatrix cell memoization (React.memo `RangeCell`)
- [ ] DashboardPage query optimization (split monolithic useLiveQuery)

### P3 — Doc / repo hygiene
- [x] Root cleanup (2026-04-18) — loose scripts moved to `scripts/`,
      loose docs moved to `docs/`, empty `tests/` dir removed
- [ ] Commit or gitignore the 100+ untracked summary fixtures in
      `src/test/fixtures/summaries/`
- [ ] Fixture variant tests — assert parser behaviour on Cap / Zoom /
      6+ / play-money fixtures (currently silent)

### P4 — New feature: Career / SharkScope-style tab
- [ ] `CareerPage` + `/career` route, `careerAnalyzer.ts`
- [ ] Lifetime scorecard, stake progression, bust-out distribution,
      streaks, format breakdown, opponent overlap, rake-adjusted ROI,
      $/hour, day×hour heatmap
- [ ] Decide: fold `StatsPage` into Career, or keep both

### P5 — Library upgrades (2026-era)
- [ ] Biome 2 (replace missing linter/formatter)
- [ ] nuqs (URL-sync Hands filters, Ranges position selector)
- [ ] TanStack Table + TanStack Virtual on HandsPage list
- [ ] vite-plugin-pwa (installable app)
- [ ] `framer-motion@12` → `motion@11`
- [ ] Vite 6→7, Vitest 3→4, React 19→19.1+, TS 5.7→5.8/5.9

---

## Bug Fix Log

| Date | Bug | Fix |
|------|-----|-----|
| 2026-04-18 | Portuguese residue in 7 UI files | Translated TrendChart, LeaksPage, HandReplay, csvExport, pdfExport, villainExploitCrossRef (+ its tests) to English; ROADMAP P2 closed. Also switched `pdfExport.ts` date formats from BR (`dd/MM/yyyy`, `dd/MM HH:mm`) to ISO (`yyyy-MM-dd`, `MM-dd HH:mm`) — deliberate, to match English UI |
| 2026-04-18 | AF never surfaced as a leak | `detectLeaks` now pushes `af` leak when out of `[min,max]`, gated on stable sample |
| 2026-04-18 | `checkFacingRaise` silently dropped hands on unknown opener | Added `console.warn` on null `openerPosition` so parser mapping drops are visible |
| 2026-04-18 | W$SD inflation on chops / non-show wins | Parser exposes `showdownWinners` Set from SUMMARY "showed and won" lines; `wonAtShowdown` gates on membership, not `wonAmount > 0` |
| 2026-04-17 | PDF export hardcoded `scorza23` | `exportSessionsPDF` takes `heroName` arg from `useAppStore` |
| 2026-04-12 | W$SD 100% false positive | `hasShowdown` field via `*** SHOW DOWN ***` detection + DB v3 migration |
| 2026-04-12 | PnL badge ignores session filter | Financial stats scoped to `financialSessions` |
| 2026-04-12 | PnL chart clipped at 100 | `yDomain` prop, PnL uses `['auto','auto']` |
| 2026-04-12 | HandReplay postflop rendered twice | Removed duplicate JSX block |
| 2026-04-12 | AF always shows "—" | Count raise/call actions from `HeroDecision.action` |
| 2026-04-12 | Chips Won/Mão misleading | Replaced with Win % |
| 2026-04-12 | Chart/Position table overlap | Removed TrendChart inner card, increased height to h-72 |
| 2026-04-12 | Charts hide on session filter | `computeIntraSessionTrends()` for bucketed data |
| 2026-04-12 | Net Profit logic broken | Switched from gross `wonAmount` to stack delta (`netProfit`) |
| 2026-04-12 | Tournament Summary reader | Fuzzy matching parser + Bounty capture support |
| 2026-04-12 | SB/BB Hand Counts | Merger/scenario-aware counting in Ranges Page |
| 2026-04-12 | Syntax Error ranges.ts | Restored missing `RFI_RANGES` declaration |

---

## Status Summary

| Phase | Status |
|-------|--------|
| 1: MVP | Complete |
| 2: Analysis | Complete |
| 2.5: Theory Integration | Complete |
| 3: Polish | Complete |
| 4: Bounty & Advanced | Complete |
| 5: Accuracy & Analytics | Complete |
| 6: Intelligence & Premium Arena | Complete |
| Maintenance & Punch List | In progress |

**Tests (2026-04-18):** 18 files, 332 passing. +1 after audit Batch 1
(no new test files; count variance from prior session's test additions).
