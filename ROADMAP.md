# Project Roadmap — Poker Hand Analyzer (scorza23)

## Phase 1: MVP
- [x] PokerStars hand history parser (custom regex, BOM handling, dedup)
- [x] File upload (drag-and-drop, multi-file)
- [x] Hand explorer with basic filters (position, scenario, action, compliance)
- [x] Basic stats: VPIP, PFR, C-bet, WTSD, AF, Won at SD
- [x] Range compliance by position with 13x13 grid

## Phase 2: Analysis
- [x] Leak detector with severity ratings (10 metrics, dual-profile thresholds)
- [x] Session manager and comparison (auto-group by 4h gap, per-session stats table)
- [x] Trend charts (Recharts line graph, VPIP/PFR/C-bet/Compliance evolution)
- [x] Postflop analysis (board texture classification, missed c-bets, double barrel, probe turn, donk bet, bet vs missed c-bet)

## Phase 2.5: Theory Integration
- [x] Implement strategy profile system (Game Plan vs Advanced)
- [x] Add board texture classifier for context-dependent c-bet analysis
- [x] Build Villain Tracker with MDA-based auto-classification
- [x] Implement "Corrections to Previous Rules" in Advanced profile
- [x] Add manual villain notes and tags (UI + IndexedDB persistence)
- [x] Link every leak and adjustment to a `docs/strategy/` source (UI tooltips)
- [x] Integrate ICM stage detection (early/mid/bubble/FT) from hand history
- [x] Validate range accuracy against solver outputs
- [x] Cross-reference villain exploit strategies with leak detection

## Phase 3: Polish
- [x] Hand replay (visual, street-by-street with postflop analysis)
- [x] Advanced filters (stack depth, ICM sensitivity, hand category)
- [x] Short stack push/fold checker (push ranges by position + resteal ranges)
- [x] Report export — CSV session export
- [x] Customizable ranges (user-editable range grids with push/fold view)
- [x] Report export — PDF

## Phase 4: Bounty & Advanced
- [x] Bounty tournament detection and equity drop calculation
- [x] BPWR (Bounty Power) calculator
- [x] FT-specific analysis (fake shove detection, resteal spots)
- [x] Squeeze play detection and analysis

---

## Status

| Phase | Status |
|-------|--------|
| Phase 1: MVP | **Complete** |
| Phase 2: Analysis | **Complete** |
| Phase 2.5: Theory Integration | **Complete** |
| Phase 3: Polish | **Complete** |
| Phase 4: Bounty & Advanced | **Complete** |

## Test Coverage

- 18 test files, 332 tests passing
- Parser: 48 tests (pokerstars, handKey, position)
- Analysis: 222 tests (scenarioDetector, rangeChecker, leakDetector, villainClassifier, postflopAnalyzer, pushFoldChecker, icmDetector, squeezeDetector, bountyAnalyzer, finalTableAnalyzer, villainExploitCrossRef, rangeValidator)
- Data: 62 tests (ranges, sessions, pushFoldRanges)
