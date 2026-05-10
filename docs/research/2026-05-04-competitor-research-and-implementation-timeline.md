# Competitor Research and Implementation Timeline — 2026-05-04

Purpose: keep a visible timeline of what was researched, why it matters, and what was implemented so product direction is auditable across autonomous work sessions.

## Timeline

### 00:35 — Poker tracker/trainer competitor scan

Sources researched with web APIs:
- PokerTracker 4 feature list: Interactive Reports, Interactive Graphs, Interactive Filters, LeakTracker, ICM replayer, hand range modeling.
- Holdem Manager 3 Leak Explorer: one-click leak discovery, severity icons, stat/winrate comparison against winning players, visual leak-size charts, hand/player filters.
- Hand2Note reports: contextual reports by time period, session length, tournament type, stakes, time of day, and opponent/range research.
- GTO Wizard Analyzer: upload hands, sort by largest EV loss, filter by spot/board/cards/date, star hands, replay and drill mistakes.
- DTO Tournament: trainer/explorer loop, aggregated reports, spot practice, preflop/postflop drills, performance tracking.

Product decision:
- Do not add random feature breadth.
- Convert dashboards into a next-action loop: verdict -> blocker -> study queue -> exact hands/ranges.

Shipped:
- Dashboard "Competitor-inspired Study Queue".
- New deterministic `buildStudyQueue()` engine ranking leaks, deviations, missed c-bets, and biggest BB-loss hands.
- BB-normalized damage used instead of raw chips.

Verification:
- Full tests/build/docs passed after the study queue implementation.
- Docker rebuilt and browser smoke confirmed the card appeared with demo data.

### 00:49 — SharkScope research pass

Sources researched with web APIs:
- SharkScope homepage.
- SharkScope Desktop HUD Statistics manual.
- SharkScope Desktop Bankroll manual.

Key SharkScope patterns:
- The product compresses tournament history into career signals: ROI, profit, average stake, total stake/rake/cashes, ITM%, wins, activity, and ability rating.
- SharkScope's "Ability" is a score up to 100 based on compiled statistics.
- Average ROI is computed per tournament as `((payout - (stake + rake)) * 100) / (stake + rake)`, then averaged, which differs from total ROI.
- Bankroll charts show total profit in chronological order and can include a trendline via linear regression.
- SharkScope's advantage is provider-level database coverage. Our local-first version cannot see the whole player pool, but uploaded hand histories and tournament summaries can produce a private SharkScope-style career profile for the hero.

Product decision:
- Build "CareerScope" as our own SharkScope-like private profile using imported tournament summaries/hand histories.
- Focus on metrics we can truthfully derive locally: ability estimate, total ROI, average ROI, ABI, total stake, total rake, total cashes, active days, games/day, winning/losing days, streaks, last-20 form, and bankroll trend.
- Avoid pretending we have global provider/player-pool visibility until external APIs or public data integrations exist.

Implementation plan:
1. Add a tested `careerScope.ts` analysis module.
2. Add a CareerScope UI panel to the Career page.
3. Wire the panel into existing Career data flow.
4. Refresh docs and verify with tests/build/browser.

Status:
- Shipped in this pass.

Implementation shipped:
- `src/analysis/careerScope.ts`: local SharkScope-style profile engine.
- `src/analysis/__tests__/careerScope.test.ts`: TDD coverage for profitability, average ROI, activity, streaks, ability rating, and play-money/ticket exclusion.
- `src/components/career/CareerScopePanel.tsx`: premium Career page panel with local ability rating, form, ABI, ROI, cashes, activity, streaks, and bankroll trendline.
- `src/pages/CareerPage.tsx`: wires CareerScope into the existing career flow.

Verification:
- Initial TDD run failed because `careerScope.ts` did not exist.
- After implementation, one test exposed a form-label expectation issue; expectation corrected to `Insufficient Sample` for a profitable but tiny 5-tournament sample.
- Targeted CareerScope + StudyPlan tests passed.
- Project typecheck passed.

### 01:18 — Universal import / non-Stars network research pass

User direction:
- Do not limit the import strategy to PokerStars and GGPoker.
- Address WPN, iPoker, 888poker, PartyPoker, Chico Network, and Winamax.
- The user does not currently have export examples from these sites, so the parser must become smarter about anything thrown at it.

Sources researched with web APIs:
- Open Hand History examples for iPoker tournament hands.
- Open Hand History examples for 888/Pacific tournament hands.
- Open Hand History examples for WPN/America's Cardroom hands.
- Search results for PartyPoker hand history support and original-format caveats.
- Search results for Chico/BetOnline hand history/converter ecosystem.
- Search results for Winamax hand-history availability and formats.

Key finding:
- Without native raw examples for every room, writing fake native parsers would be dangerous and would create false trust.
- The safest first universal slice is to support standardized Open Hand History JSON (`spec_version`, `network_name`, `site_name`, `game_number`, `rounds`, `players`, `pots`, `tournament_info`). That gives a real multi-network bridge for iPoker, 888, WPN, and future converted sources.
- Native-site detection should also become more explicit so unsupported rooms can be reported honestly instead of silently falling through as generic GGPoker or unknown garbage.

Product decision:
- Build a generic Open Hand History JSON parser first.
- Keep raw native parsers for PokerStars and GGPoker.
- Detect known-but-not-yet-native rooms (WPN, iPoker, 888, PartyPoker, Chico, Winamax) separately so the importer can evolve toward specific adapters later.
- Do not claim perfect support for unsupported native formats without fixtures.

Implementation plan for this pass:
1. Add TDD coverage for Open Hand History JSON detection and parsing.
2. Implement a `parseOpenHandHistoryFile()` adapter that maps OHH JSON to the existing `ParsedHand` shape.
3. Wire the worker to parse OHH files.
4. Add tests for known non-Stars/GG site identifiers.
5. Verify with targeted parser tests, typecheck, full suite/build/docs, Docker, browser smoke, and Windows sync.

Status:
- Shipped in this pass.

Implementation shipped:
- `src/parser/openHandHistory.ts`: generic Open Hand History JSON adapter into the existing `ParsedHand` shape.
- `src/parser/siteIdentifier.ts`: explicit detection for OHH JSON plus known unsupported native-room markers for WPN, iPoker, 888/Pacific, PartyPoker, Chico/BetOnline, and Winamax.
- `src/parser/worker.ts`: worker dispatch now routes OHH JSON to the new parser and returns clearer unsupported-format file errors.
- `src/parser/__tests__/openHandHistory.test.ts`: coverage for iPoker tournament JSON, 888 tournament JSON, WPN cash JSON, tournament finance, hero chip/action extraction, and `buildHeroDecision` compatibility.
- `src/parser/__tests__/siteIdentifier.test.ts`: regression coverage so supported OHH JSON is not treated as unknown and known proprietary formats are surfaced honestly.
- `src/pages/HandsPage.tsx`: importer accepts `.json` directly and inside ZIP archives, and the UI copy advertises `.txt`, `.json`, and `.zip` support.

Verification:
- Targeted parser tests passed.
- Full verification passed: docs update, TypeScript build, full Vitest suite, production build, and docs check.
- Final suite count after universal import work: 30 test files, 413 tests passing.
- Docker image rebuilt and `poker-analyzer-demo` restarted at `http://localhost:8080`.
- Browser smoke confirmed the app loads and the Hands importer displays OHH JSON support with zero console/JS errors.
