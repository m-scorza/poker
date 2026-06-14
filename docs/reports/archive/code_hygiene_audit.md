---
status: resolved
date: 2026-05-17
---
# Code Hygiene Audit Report — Phase 1 (Inventory)

**Date:** 2026-05-17  
**Scope:** Complete scan of all `.ts` and `.tsx` files in `src/` (including all test files and fixtures).  
**Tooling Used:** Custom AST TypeScript scanner (`scripts/hygiene-scanner.ts`).

> **Traceability note — 2026-05-17:** This report is the Phase 1 inventory snapshot, not the final state of the branch. Phase 2 follow-up fixes were subsequently applied in the same dirty tree: type-only import hardening, `Position` type-cycle cleanup, formatter consolidation through `src/utils/format.ts`, diagnostic logging for selected catches, and removal of confirmed abandoned exports (`getRestealRange`, `batchDetectSqueeze`). Treat the findings below as historical review input unless a later verification report or source diff says the item remains open.

---

## Executive Summary

The Poker Analyzer HUD codebase is exceptionally clean and robust. Because the TypeScript compiler is configured with strict static analysis checks (`"noUnusedLocals": true` and `"noUnusedParameters": true`), **there are exactly zero (0) unused local declarations or unused imports in the entire codebase (including the test suites)**.

However, since the front-end and back-end have been developed in parallel, there are several:
- **Unused Exports:** Scaffolded interfaces, types, and mathematical models that are currently unreferenced by active components, or are only referenced in unit tests.
- **Duplicate Formatter Functions:** Specifically, multiple files redeclare identical tiny formatters (`pct` and `money`), which should be consolidated.
- **Import Violations:** Standard imports that should be `import type` for better build optimizations, plus one circular dependency in types.
- **Suspicious Workarounds:** Empty `catch` blocks in data/replay systems and magic sizing limits.

Below is the detailed list for each category, along with a recommended action: **DELETE**, **KEEP**, or **ASK**.

---

## (a) Unused Exports

*Exports declared in a module but never imported by any other file (excluding test files).*

### 1. Analysis Layer Abstractions & Math Helpers

| File Path | Line | Symbol | Recommendation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| [bountyAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/bountyAnalyzer.ts) | 15 | `BountyTournamentType` | **KEEP** | Scaffolded type for future bounty integration. |
| [bountyAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/bountyAnalyzer.ts) | 17 | `BountyContext` | **KEEP** | Scaffolded model for bounty calculation contexts. |
| [bountyAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/bountyAnalyzer.ts) | 44 | `detectBountyTournament` | **KEEP** | Core analyzer logic, currently imported and verified only in tests. |
| [bountyAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/bountyAnalyzer.ts) | 74 | `calculateBPWR` | **KEEP** | Bounty Power Won Rate (BPWR) math, tested and verified. |
| [bountyAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/bountyAnalyzer.ts) | 101 | `estimateBountyContext` | **KEEP** | Core math module verified in test suites. |
| [bountyAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/bountyAnalyzer.ts) | 172 | `BOUNTY_HEURISTICS` | **KEEP** | Constant lookup values for bounty evaluations, tested. |
| [careerCoach.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/careerCoach.ts) | 12 | `SampleConfidence` | **ASK** | Likely a future placeholder for the Coach confidence analyzer. |
| [careerCoach.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/careerCoach.ts) | 36 | `CareerBlocker` | **ASK** | Planned struct for career roadmaps. |
| [careerScope.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/careerScope.ts) | 4 | `CareerScopeForm` | **KEEP** | Scaffolded form structure. |
| [careerScope.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/careerScope.ts) | 6 | `CareerScopePoint` | **KEEP** | Career timeline point struct. |
| [finalTableAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/finalTableAnalyzer.ts) | 13 | `FTStackType` | **KEEP** | Stack depth classifier type. |
| [finalTableAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/finalTableAnalyzer.ts) | 15 | `FTPlayerProfile` | **KEEP** | Final table player representation. |
| [finalTableAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/finalTableAnalyzer.ts) | 25 | `FakeShoveSpot` | **KEEP** | Planned leak detection context. |
| [finalTableAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/finalTableAnalyzer.ts) | 36 | `RestealSpot` | **KEEP** | Planned resteal context. |
| [finalTableAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/finalTableAnalyzer.ts) | 56 | `classifyFTStacks` | **KEEP** | Core final table model, tested. |
| [finalTableAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/finalTableAnalyzer.ts) | 122 | `detectFakeShove` | **KEEP** | Core final table model, tested. |
| [finalTableAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/finalTableAnalyzer.ts) | 174 | `detectRestealSpot` | **KEEP** | Core final table model, tested. |
| [finalTableAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/finalTableAnalyzer.ts) | 257 | `FT_DECISION_MATRIX` | **KEEP** | Final table GTO math heuristics, tested. |
| [icmDetector.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/icmDetector.ts) | 19 | `ICMEstimate` | **ASK** | Planned struct for chip-to-value calculations. |
| [icmDetector.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/icmDetector.ts) | 143 | `estimateICMStageFromHand` | **KEEP** | ICM stage analyzer helper, tested. |
| [math.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/math.ts) | 49 | `SizingRecommendation` | **ASK** | Future GTO bet-sizing interface. |
| [positionStats.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/positionStats.ts) | 9 | `PositionStats` | **ASK** | Placeholder for aggregated position charts. |
| [postflopAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/postflopAnalyzer.ts) | 41 | `BoardAnalysis` | **KEEP** | Board texture analysis metadata. |
| [postflopAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/postflopAnalyzer.ts) | 156 | `PostflopSpot` | **KEEP** | String union representing postflop spots. |
| [postflopAnalyzer.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/postflopAnalyzer.ts) | 349 | `isGoodBarrelCard` | **KEEP** | Double barrel criteria check, verified in tests. |
| [pushFoldChecker.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/pushFoldChecker.ts) | 20 | `PushFoldResult` | **KEEP** | Planned push-fold checker outcome. |
| [pushFoldChecker.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/pushFoldChecker.ts) | 22 | `PushFoldAnalysis` | **KEEP** | Planned push-fold analysis details. |
| [pushFoldChecker.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/pushFoldChecker.ts) | 40 | `checkPushFold` | **KEEP** | GTO short stack checker, tested. |
| [pushFoldChecker.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/pushFoldChecker.ts) | 146 | `batchCheckPushFold` | **KEEP** | Short stack analyzer, tested. |
| [pushFoldChecker.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/pushFoldChecker.ts) | 161 | `pushFoldAccuracy` | **KEEP** | Hero's push-fold error index, tested. |
| [pushFoldChecker.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/pushFoldChecker.ts) | 175 | `pushFoldSummary` | **KEEP** | Short stack summary math, tested. |
| [pushFoldChecker.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/pushFoldChecker.ts) | 210 | `getRestealRange` | **ASK** | Completely unused. Appears to be an abandoned utility. |
| [rangeChecker.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/rangeChecker.ts) | 17 | `ComplianceResult` | **KEEP** | Preflop decision validation type. |
| [rangeValidator.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/rangeValidator.ts) | 18 | `RangeValidationResult` | **KEEP** | Preflop range validation type. |
| [rangeValidator.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/rangeValidator.ts) | 84 | `validateRFIRanges` | **KEEP** | RFI validity check, tested. |
| [rangeValidator.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/rangeValidator.ts) | 134 | `validatePushRanges` | **KEEP** | Push/fold range validity check, tested. |
| [rangeValidator.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/rangeValidator.ts) | 178 | `rangeAccuracyScore` | **KEEP** | Preflop index checker, tested. |
| [scenarioDetector.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/scenarioDetector.ts) | 20 | `detectScenario` | **KEEP** | Essential parser component, tested. |
| [squeezeDetector.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/squeezeDetector.ts) | 16 | `SqueezeSpot` | **KEEP** | Squeeze spot context structure. |
| [squeezeDetector.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/squeezeDetector.ts) | 123 | `batchDetectSqueeze` | **ASK** | Completely unused, potential placeholder. |
| [squeezeDetector.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/squeezeStats` | **KEEP** | Squeeze stats checker, tested. |
| [villainClassifier.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/villainClassifier.ts) | 40 | `classifyVillain` | **KEEP** | Archetype classifier, verified in tests. |
| [villainClassifier.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/villainClassifier.ts) | 94 | `computeVillainStats` | **KEEP** | Core stat aggregation, verified in tests. |
| [villainClassifier.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/villainClassifier.ts) | 120 | `emptyCounters` | **KEEP** | Blank counters for DB initialization, tested. |
| [villainClassifier.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/villainClassifier.ts) | 177 | `isRegular` | **KEEP** | Aggregated hands regular status, tested. |
| [villainExploitCrossRef.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/villainExploitCrossRef.ts) | 17 | `ExploitPriority` | **KEEP** | Exploit severity priority. |
| [villainExploitCrossRef.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/villainExploitCrossRef.ts) | 19 | `ExploitRecommendation` | **KEEP** | Exploit advice struct. |
| [villainExploitCrossRef.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/villainExploitCrossRef.ts) | 170 | `crossReferenceExploits` | **KEEP** | Exploitative logic engine, tested. |
| [villainExploitCrossRef.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/villainExploitCrossRef.ts) | 212 | `generateStatBasedExploits` | **KEEP** | Exploit generator, tested. |
| [villainExploitCrossRef.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/analysis/villainExploitCrossRef.ts) | 285 | `leaksBlockingExploits` | **KEEP** | Exploit blocker detection, tested. |

### 2. Data Stores & Shared Components

| File Path | Line | Symbol | Recommendation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| [HandsFilters.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/components/hands/HandsFilters.tsx) | 31 | `HandsFiltersProps` | **KEEP** | Props struct for filter component. |
| [HandsTable.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/components/hands/HandsTable.tsx) | 17 | `HandsTableProps` | **KEEP** | Props struct for hands list table. |
| [HandsUpload.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/components/hands/HandsUpload.tsx) | 12 | `MAX_TXT_BYTES` | **KEEP** | Core upload size limits. |
| [HandsUpload.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/components/hands/HandsUpload.tsx) | 13 | `MAX_ZIP_BYTES` | **KEEP** | Core upload size limits. |
| [HandsUpload.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/components/hands/HandsUpload.tsx) | 14 | `MAX_ZIP_DECOMPRESSED_BYTES` | **KEEP** | Core upload size limits. |
| [HandsUpload.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/components/hands/HandsUpload.tsx) | 15 | `MAX_BATCH_BYTES` | **KEEP** | Core upload size limits. |
| [RangeGrid.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/components/shared/RangeGrid.tsx) | 12 | `CellStatus` | **KEEP** | Types for preflop GTO grid. |
| [RangeGrid.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/components/shared/RangeGrid.tsx) | 39 | `RangeGrid` | **KEEP** | Reusable preflop GTO grid, tested. |
| [appStore.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/appStore.ts) | 16 | `isValidStrategyProfile` | **KEEP** | LocalStorage settings validation, tested. |
| [appStore.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/appStore.ts) | 20 | `PersistedSettings` | **KEEP** | State persistence interface. |
| [appStore.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/appStore.ts) | 25 | `mergePersistedSettings` | **KEEP** | State persistence merge helper, tested. |
| [appStore.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/appStore.ts) | 40 | `Filters` | **KEEP** | Session search filter interface. |
| [appStore.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/appStore.ts) | 49 | `AppState` | **KEEP** | Core Zustand app state store. |
| [demoDataset.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/demoDataset.ts) | 7 | `DemoDataset` | **KEEP** | Core mock-generator interface. |
| [demoDataset.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/demoDataset.ts) | 25 | `DemoSeedPhase` | **KEEP** | Core mock-generator type. |
| [demoDataset.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/demoDataset.ts) | 27 | `DemoSeedProgress` | **KEEP** | Mock load progress interface, tested. |
| [demoDataset.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/demoDataset.ts) | 35 | `DEMO_TARGET_HAND_COUNT` | **KEEP** | Mock target limit parameter. |
| [demoDataset.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/demoDataset.ts) | 54 | `DEMO_MANIFEST` | **KEEP** | Mock scenario authoring list, tested. |
| [demoDataset.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/demoDataset.ts) | 345 | `buildDemoDataset` | **KEEP** | Mock data compiler function, tested. |
| [demoVillains.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/demoVillains.ts) | 3 | `DemoVillain` | **KEEP** | Mock villain archetype definition. |
| [ranges.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/ranges.ts) | 192 | `REACTION_RANGES` | **KEEP** | GTO response lookups. |
| [ranges.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/ranges.ts) | 220 | `allHandCombos` | **KEEP** | Card generator function, tested. |
| [ranges.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/ranges.ts) | 239 | `getRFIRange` | **ASK** | Dual declaration of `getRFIRange` (also in `rangeChecker.ts`). |
| [ranges.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/ranges.ts) | 267 | `threeBetSize` | **KEEP** | 3-bet recommendation size model, tested. |
| [store.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/store.ts) | 15 | `AppSettings` | **KEEP** | Persistent database state settings. |
| [store.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/store.ts) | 21 | `SessionRecord` | **KEEP** | DB session model. |
| [store.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/store.ts) | 99 | `handExists` | **ASK** | Completely unused lookup, safe to keep or delete. |
| [store.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/store.ts) | 105 | `ImportHandsOptions` | **KEEP** | DB transaction configuration. |
| [store.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/store.ts) | 281 | `loadAllCustomRanges` | **KEEP** | DB ranges retrieval, tested. |
| [store.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/store.ts) | 308 | `VillainNote` | **KEEP** | DB note model for villains. |
| [store.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/store.ts) | 431 | `getVillainNote` | **ASK** | Scaffolded DB query helper. |
| [store.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/store.ts) | 449 | `SummaryImportResult` | **KEEP** | Aggregated import metrics struct. |
| [store.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/store.ts) | 540 | `saveHeroName` | **ASK** | Scaffolded DB setter helper. |
| [strategyProfiles.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/strategyProfiles.ts) | 28 | `CbetContext` | **KEEP** | Cbet model structures. |
| [strategyProfiles.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/strategyProfiles.ts) | 37 | `CbetRule` | **KEEP** | Cbet model structures. |
| [strategyProfiles.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/strategyProfiles.ts) | 47 | `gamePlanCbet` | **KEEP** | Cbet model structures. |
| [strategyProfiles.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/strategyProfiles.ts) | 57 | `advancedCbet` | **KEEP** | Cbet model structures. |
| [strategyProfiles.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/strategyProfiles.ts) | 80 | `LeakThresholds` | **KEEP** | Profile thresholds struct. |
| [strategyProfiles.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/strategyProfiles.ts) | 99 | `GAME_PLAN_THRESHOLDS` | **KEEP** | Profile thresholds parameters. |
| [strategyProfiles.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/strategyProfiles.ts) | 118 | `ADVANCED_THRESHOLDS` | **KEEP** | Profile thresholds parameters. |
| [strategyProfiles.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/strategyProfiles.ts) | 139 | `getCbetRule` | **ASK** | Completely unused sizing lookup helper. |
| [strategyProfiles.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/strategyProfiles.ts) | 168 | `advancedThreeBetSize` | **ASK** | Completely unused sizing lookup helper. |

### 3. Parsers & Systems

| File Path | Line | Symbol | Recommendation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| [buyInExtractor.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/buyInExtractor.ts) | 9 | `Currency` | **KEEP** | Currency types for parsed hand histories. |
| [buyInExtractor.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/buyInExtractor.ts) | 11 | `ExtractedBuyIn` | **KEEP** | Buy-in values parsing struct. |
| [buyInExtractor.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/buyInExtractor.ts) | 30 | `stripGuarantees` | **KEEP** | Tournament name cleaner, tested. |
| [handKey.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/handKey.ts) | 3 | `ParsedCard` | **KEEP** | Parsed card details struct. |
| [handKey.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/handKey.ts) | 9 | `parseCard` | **KEEP** | Card parsing math, tested. |
| [handKey.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/handKey.ts) | 18 | `rankIndex` | **KEEP** | Card parsing math, tested. |
| [importSummary.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/importSummary.ts) | 3 | `ImportSummaryTone` | **KEEP** | UI progress layout states. |
| [importSummary.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/importSummary.ts) | 5 | `FormattedImportSummary` | **KEEP** | UI progress layout states. |
| [position.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/position.ts) | 18 | `SeatInfo` | **KEEP** | Position mapping metadata. |
| [siteIdentifier.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/siteIdentifier.ts) | 1 | `PokerSite` | **KEEP** | Site parsing types. |
| [siteIdentifier.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/siteIdentifier.ts) | 2 | `FileType` | **KEEP** | Site parsing types. |
| [siteIdentifier.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/siteIdentifier.ts) | 4 | `FileIdentity` | **KEEP** | Site parsing types. |
| [workerProcessor.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/workerProcessor.ts) | 11 | `ImportedHandEntry` | **KEEP** | Web Worker input hand record structure. |
| [workerProcessor.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/workerProcessor.ts) | 24 | `MAX_PARSER_INPUT_BYTES` | **KEEP** | Web Worker file upload size guards. |
| [villain.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/types/villain.ts) | 36 | `PositionStats` | **KEEP** | Villain position stats interface. |
| [villain.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/types/villain.ts) | 44 | `ShownHand` | **KEEP** | Villain shown cards history. |

---

## (b) Unused Local Declarations

*Variables, functions, types, interfaces, or constants declared inside a file but never referenced in that file.*

**Result:** **Exactly Zero (0)**.
- **Recommendation:** **KEEP** (no action required).
- *Note:* The strict tsconfig compiler constraints successfully block the introduction of dead local variables or local functions in all source and test code.

---

## (c) Unused Imports

*Imported symbols that are never referenced in that file.*

**Result:** **Exactly Zero (0)**.
- **Recommendation:** **KEEP** (no action required).
- *Note:* Verified across all 127 workspace files. Clean imports throughout.

---

## (d) Wrong Imports

*Mismatches in export/import signatures, importing types as values, circular imports, or incorrect barrel usage.*

### 1. Type Imported as Value (should use `import type`)
These standard imports refer to interfaces/types exported in their target files. Importing them as values bloats build output and triggers unnecessary dependency tracing.

| File Path | Line | Symbol | Issue | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| [HandsPage.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/pages/HandsPage.tsx) | 17 | `StackDepth`, `HandCategory` | Imported as values from `../components/hands/HandsFilters`. | **FIX AUTOMATICALLY** (change to `import type`). |
| [worker.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/worker.ts) | 2 | `ImportConfidence`, `ImportSummary`, `WorkerFilePayload`, `WorkerMessage`, `WorkerPayload` | Re-exported as values instead of types from `./workerProcessor`. | **FIX AUTOMATICALLY** (change to `export type`). |

### 2. Circular Imports (Crucial Dependency Cycle)
Our scanner discovered exactly one circular dependency cycle involving type definitions:

```
src/types/hand.ts -> src/types/analysis.ts -> src/analysis/postflopAnalyzer.ts -> src/types/hand.ts
```

- **How the cycle occurs:**
  1. `src/types/hand.ts` (line 1) imports `Position` from `./analysis` (`src/types/analysis.ts`).
  2. `src/types/analysis.ts` (line 2) imports `PostflopAction` from `../analysis/postflopAnalyzer`.
  3. `src/analysis/postflopAnalyzer.ts` (line 12) imports `Action` from `../types/hand`.

- **Propose proper fix:**  
  Since `Position` (representing poker seats: HJ, CO, BTN, SB, BB, etc.) is a fundamental model property of `PlayerInHand` (defined in `src/types/hand.ts`), **we will move the `Position` union type definition from `src/types/analysis.ts` into `src/types/hand.ts`**.  
  This instantly breaks the cycle:
  - `src/types/hand.ts` will have **zero** imports from `analysis.ts` (Acyclic).
  - `src/types/analysis.ts` will import `Position` from `./hand` (Clean one-way flow).
  - `src/analysis/postflopAnalyzer.ts` will continue to import `Action` from `src/types/hand.ts`.

### 3. Default Import Warning (Parser Artifact — False Positive)
- **File:** `src/main.tsx` (line 3): `import App from './App';`
- **Details:** The scanner warned that `./App` does not have a default export.
- **Verification:** Verification of `src/App.tsx` shows that `export default App;` is declared on line 56. The scanner did not parse standard `ExportAssignment` syntax as a default export modifier, resulting in a false warning.
- **Recommendation:** **KEEP** (no action required, import is 100% correct).

---

## (e) Unreachable Code

*Branches after early returns, conditions that can never be true, or dead else branches.*

**Result:** **Exactly Zero (0)**.
- **Recommendation:** **KEEP** (no action required).
- *Note:* The codebase has clean execution flows with return paths fully optimized.

---

## (f) Duplicate or Near-Duplicate Functions

*Redundant implementations of the exact same utility, usually introduced by different LLM agents.*

### 1. Tiny Formatters (`pct` and `money`)
This is the most significant source of code bloat in the UI layer. **Every single UI page and data-helper file implements its own local copy of `pct` and `money`!**

| Symbol | Redeclared In | Body / Details | Recommendation |
| :--- | :--- | :--- | :--- |
| `money` | `careerCoach.ts` (L56), `CareerScopePanel.tsx` (L6), `ValueSnapshotCard.tsx` (L19). | Formats currency outputs (e.g. `(val: number) => '$' + val.toFixed(2)`). | **ASK / CONSOLIDATE** into a central formatter (e.g., `src/utils/format.ts`). |
| `pct` | Redeclared in **14 different files**: `careerCoach.ts`, `careerScope.ts`, `leakDetector.ts`, `villainClassifier.ts`, `CareerScopePanel.tsx`, `ValueSnapshotCard.tsx`, `sessions.ts` (twice!), `DashboardPage.tsx`, `SessionsPage.tsx`, `StatsPage.tsx`, `VillainsPage.tsx` (twice!), `csvExport.ts`, and `pdfExport.ts`. | Formats percentages (e.g. `(val: number) => val.toFixed(1) + '%'`). | **ASK / CONSOLIDATE** into a central formatter (e.g., `src/utils/format.ts`). |

### 2. Duplicate Preflop Range Math
- **Symbol:** `getRFIRange`
- **Declared in:** `src/analysis/rangeChecker.ts` (line 281) and `src/data/ranges.ts` (line 239).
- **Body:** Both functions are identical: they fetch preflop range metrics from standard lookups.
- **Recommendation:** **ASK / CONSOLIDATE** by deleting the one in `src/analysis/rangeChecker.ts` and importing it from `src/data/ranges.ts`.

### 3. Isolated Duplicates (Legitimate)
- **Symbol:** `addInvestment`
- **Declared in:** `src/parser/ggpoker.ts` (line 114), `src/parser/openHandHistory.ts` (line 187), and `src/parser/pokerstars.ts` (line 192).
- **Recommendation:** **KEEP**. These are helper functions inside independent site-specific parser modules. Keeping them localized makes each parser self-contained and easy to modify without side-effects on other sites.
- **Symbol:** `load`
- **Declared in:** `HandReplay.tsx`, `ArenaPage.tsx`, `RangesPage.tsx`, `VillainsPage.tsx`.
- **Recommendation:** **KEEP**. These are local state-loading callbacks or react lifecycle hooks within separate components; they are not duplicate utilities.

---

## (g) Suspicious "Workaround" Patterns

*Silently swallowed errors, empty catch blocks, magic constants, or commented-out code.*

### 1. Swallowed Failures in Storage & Replays
Silently swallowing errors in standard lifecycle/data interactions makes UI bugs and DB failures extremely hard to trace.

| File Path | Line | Type | Details / Code | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| [HandReplay.tsx](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/components/hands/HandReplay.tsx) | 460 | `empty-catch` | `catch (e) {}` | **PROPOSE FIX:** Add error handling or a minor diagnostic log (`console.error("HandReplay action fail", e)`). |
| [localStorage.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/data/localStorage.ts) | 87 | `empty-catch` | `catch (e) {}` | **PROPOSE FIX:** LocalStorage read failure can happen if quota is exceeded or storage is cleared. Propose writing a warning: `console.warn("Storage write failed", e)`. |

### 2. Magic Constants in Parsers & Sizes
Several arbitrary figures are used in core calculations without explanatory comments:

| File Path | Line | Constant | Purpose | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| [buyInExtractor.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/buyInExtractor.ts) | 26 | `1200` | `MAX_PLAUSIBLE_USD_BUYIN = 1200` | **PROPOSE FIX:** Add explanatory comment of how this threshold was determined (historical tournament limits). |
| [openHandHistory.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/openHandHistory.ts) | 80 | `20 * 1024 * 1024` | 20MB upload cap size check. | **PROPOSE FIX:** Consolidate these sizes into a central constant file or documented top-level parameter. |
| [pokerstars.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/pokerstars.ts) | 55 | `20 * 1024 * 1024` | `MAX_HAND_HISTORY_INPUT_BYTES` | **PROPOSE FIX:** Share same constant as above. |
| [workerProcessor.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/workerProcessor.ts) | 24, 84 | `20 * 1024 * 1024` | `MAX_PARSER_INPUT_BYTES` | **PROPOSE FIX:** Share same constant as above. |

### 3. Commented-Out Code
- **File:** [buyInExtractor.ts](file:///c:/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh/src/parser/buyInExtractor.ts) (line 109)
- **Details:** `// $250,006.60 phantom buy-in.`
- **Recommendation:** **KEEP**. This comment explains why certain large buy-ins are ignored/filtered out during PokerStars parsing, providing crucial context for future developers.

---

## Action Plan for Phase 2 (Fixes)

**Status:** Applied in the follow-up hygiene diff on 2026-05-17 after review. The list below records what was authorized and executed, not pending work.

1. **Automatic Imports Hardening:**
   - Convert all `import` of types in `HandsPage.tsx` and `worker.ts` to strict `import type` / `export type`.
2. **Circular Dependency Elimination:**
   - Relocate the `Position` union type from `src/types/analysis.ts` to `src/types/hand.ts`.
   - Update imports of `Position` in `src/types/analysis.ts` and all related files.
3. **Consolidation of Formatter Functions:**
   - Create a clean centralized utility file (e.g. `src/utils/format.ts`) with standardized `pct` and `money` formatters.
   - Refactor the 14 UI pages and data models to import them, cleanly deleting the locally redeclared functions.
4. **Swallowed Failures Hardening:**
   - Apply robust diagnostic loggers (`console.error` and `console.warn`) to the storage and hand-replay catches.
5. **Scaffolded/Abandoned Exports cleanup:**
   - Delete any confirmed abandoned exports (e.g. `getRestealRange`, `batchDetectSqueeze`) while keeping approved placeholders.

**Review closure:** follow-up implementation was reviewed before commit. Remaining scanner findings should be re-run with `scripts/hygiene-scanner.ts` before opening another hygiene cleanup branch.
