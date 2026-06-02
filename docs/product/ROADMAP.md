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

### Phase 4: Bounty & Advanced — Complete as analysis plumbing, partial UI
- [x] Bounty tournament detection and equity drop calculation
- [x] BPWR (Bounty Power) calculator
- [x] FT-specific analysis (fake shove detection, resteal spots)
- [x] Squeeze play detection and analysis
- [ ] Surface bounty/fake-shove/resteal contexts in the UI, or keep them
      documented as attached metadata rather than fully shipped visible features

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

### Phase 6: Intelligence & Arena — Complete
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
- [x] UI/component smoke tests for routed app boot and shared/career components
      (route smoke plus component tests added through 2026-05-12)
- [x] Villain aggregation atomicity — import path catches aggregation failure
      and preserves repair path instead of leaving silent stale profiles
- [x] Villain `statsByPosition` persistence — replaced `Map` with an
      IndexedDB-friendly record and stored raw opportunity/action counters
      (Completed 2026-05-31)
- [x] Per-decision ICM compliance — page/import recomputation now consumes
      `HeroDecision.icmStage` before falling back to a batch-level stage for
      Advanced-profile BB-defense checks (Completed 2026-06-02)

### P2.5 — Code + UX Audit (2026-04-18)

**Batch 1 (quick wins) — DONE:**
- [x] RangesPage `RangeValidatorPanel` Portuguese → English
- [x] HandsPage dead state removal (`dateFrom`/`dateTo` + orphaned date filter inputs)
- [x] `aria-label` on all icon-only buttons (HandsPage, HandReplay, ConfirmDialog)
- [x] Hardcoded hex → CSS variables (`--color-bg-dialog`, `--color-bg-tooltip`,
      `--color-bg-board`, `--color-bg-card-solid`)

**Batch 2 (medium effort):**
- [x] Dialog accessibility: `role="dialog"`, `aria-modal`, Esc key, focus trap (Completed)
- [x] Analysis-layer Portuguese purge: 7 files (pushFoldChecker, postflopAnalyzer, finalTableAnalyzer, bountyAnalyzer, squeezeDetector, rangeValidator, icmDetector) + `icmDetector.test.ts` assertions (Completed)
- [x] Worker error handling: `FILE_ERROR` posted from worker catch, `WorkerMessage` union defined in `workerProcessor.ts`, handled in `HandsUpload.tsx` (Completed 2026-05-15)
- [x] Villain aggregation atomicity: try/catch + repair path for `aggregateVillainStats` in `store.ts` (Completed)

**Batch 3 (structural):**
- [x] Route-level code splitting (React.lazy + Suspense in App.tsx) (Completed)
- [x] Component smoke tests (happy-dom + @testing-library/react) (Completed 2026-05-12)
- [x] HandsPage decomposition (extract `HandsTable`, `HandsUpload`, `HandsFilters`, TanStack Virtualization) (Completed)
- [x] DualRangeMatrix cell memoization (React.memo `RangeCell`) (Completed)
- [x] DashboardPage query optimization (split monolithic useLiveQuery) (Completed)

### P3 — Doc / repo hygiene
- [x] Root cleanup (2026-04-18) — loose scripts moved to `scripts/`,
      loose docs moved to `docs/`, empty `tests/` dir removed
- [x] Commit or gitignore the 100+ untracked summary fixtures in
      `src/test/fixtures/summaries/` (Committed)
- [ ] Fixture variant tests — assert parser behaviour on Cap / Zoom /
      6+ / play-money fixtures (currently silent)

### P4 — New feature: Career / SharkScope-style tab
- [x] `CareerPage` + `/career` route (2026-04-19) — basic tournament
      history, ROI / ITM dashboard, profit timeline. Reads `tournaments`
      table directly; no dedicated `careerAnalyzer.ts` module yet.
- [x] Lifetime scorecard, stake progression, bust-out distribution,
      rake-adjusted ROI, $/hour (Career hardening pass 2026-05-12)
- [x] Streaks, format breakdown, opponent overlap, day×hour heatmap (Completed)
- [ ] Decide: fold `StatsPage` into Career, or keep both

### P4.5 — Multi-site support (in progress)
- [x] `siteIdentifier.ts` + per-site router in `worker.ts` (2026-04-19)
- [x] ZIP upload (`jszip`) for PokerStars/GGPoker exports (2026-04-19)
- [x] GGPoker parser is a scaffold — produces valid `ParsedHand` shape
      but most fields are defaulted, `totalPot`/`rake`/`villainDeltas`
      extracted, `PlayerInHand.position` uses accurate active seats.
- [x] GGPoker Tournament Summary parser is stubbed; real PokerCraft
      summary extraction properly implemented.

### P5 — Library upgrades (2026-era)
- [ ] Biome 2 (replace missing linter/formatter)
- [ ] nuqs (URL-sync Hands filters, Ranges position selector)
- [x] TanStack Table + TanStack Virtual on HandsPage list
- [x] vite-plugin-pwa configured (icon/asset polish still open)
- [ ] `framer-motion@12` → `motion@11`
- [ ] Vite 6→7, Vitest 3→4, React 19→19.1+, TS 5.7→5.8/5.9

---

## Bug Fix Log

| Date | Bug | Fix |
|------|-----|-----|
| 2026-04-19 | SawFlop Preflop tracking | `scenarioDetector.ts` changed `sawFlop` to explicitly require `!heroFoldedPreflop` instead of just non-folding first action |
| 2026-04-19 | Mathematically Flawed WTSD | Switched WTSD denominator from `vpipHands` to `sawFlopHands` in `leakDetector.ts` to prevent false positive leak warnings |
| 2026-04-19 | Session Nemesis $0.00 read-out | Mapped fallback assassin amounts to `nemesisMap.get(assassin)` instead of hardcoded 0 in `sessions.ts` |
| 2026-04-19 | $0/Missing Buy-Ins | `pokerstars.ts` / `ggpoker.ts` regex expanded to explicitly capture formats like `Buy-In: $X/$Y` from textual Summaries and header parsing |
| 2026-04-19 | PokerStars bounties excluded from parsing | `pokerstars.ts` added capturing mechanisms to extract `bounty` lines from Hand Histories explicitly |
| 2026-04-19 | `store.ts` Tournament properties wiped | Fixed `store.ts:importHands` bulkPut wiping out existing tournament properties by accumulating/merging fields cleanly |
| 2026-04-19 | GGPoker Parsing limits | `ggpoker.ts` parses totalPot, rake, active positions, and real tournament summaries properly out of scaffold bounds |
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
| 6: Intelligence & Arena | Complete |
| Maintenance & Punch List | In progress |

**Current test inventory:** see `docs/product/STATUS.md` autogenerated test block.
