# Public Poker-Brain Pilot — BB Defense Under ICM

Date: 2026-06-27  
Front: Poker brain / tournament knowledge  
Research question: how should the product safely talk about and eventually grade big-blind defense when tournament ICM pressure is present?

## Sources used

| Source ID | Source | Usage |
|---|---|---|
| S-INT-KB-001 | `docs/knowledge/strategy/03-preflop-strategy.md` | Internal baseline for BB defense and stack-depth conventions. |
| S-INT-KB-002 | `docs/knowledge/strategy/05-icm-and-risk-premium.md` | Internal baseline for ICM/risk premium stages. |
| S-INT-CODE-001 | `src/analysis/icmDetector.ts` | Current shipped heuristic stage/risk estimator. |
| S-INT-CODE-002 | `src/analysis/rangeChecker.ts` | Current shipped BB-vs-raise compliance behavior. |
| S-PUB-GTOW-001 | GTO Wizard, “When does ICM become significant in MTTs?” | Public support that ICM starts mattering before the bubble. |
| S-PUB-GTOW-002 | GTO Wizard, “What is the Bubble Factor in poker tournaments?” | Public definition of bubble factor/risk premium and study-tool framing. |
| S-PUB-GTOW-003 | GTO Wizard, “ICM and Blind Battles: The Big Blind” | Public blind-vs-blind nuance under ICM. |
| S-PUB-BBZ-001 | BBZ Poker, “The Complete Guide to Bubble Strategy in MTTs” | Public support for asymmetric pressure between covered and covering stacks. |
| S-PUB-POKERORG-001 | Poker.org / Brian Hastings, “Defending the big blind in tournaments” | Public support for wide BB defense from closing action and pot odds. |

## Normalized claims

See `../CLAIMS_LEDGER.md` rows:

- C-PB-BBICM-001 — normal BB defense is wide against small opens because of pot odds and closing action.
- C-PB-BBICM-002 — ICM/risk premium tightens marginal continues versus chipEV.
- C-PB-BBICM-003 — ICM pressure is asymmetric depending on covered/covering-stack relationship.
- C-PB-BBICM-004 — bubble factor/risk premium should be treated as heuristic/proxy without exact field and payout data.
- C-PB-BBICM-005 — high-ICM/shallow BB decisions should be separated from normal BB defense.

## What the current product already does

- `rangeChecker.ts` only grades normal `BB_VS_RAISE` spots and explicitly excludes `FACING_ALL_IN`, `BB_VS_LARGE_RAISE`, and `BB_VS_LIMP` from compliance.
- `checkBBvsRaise()` flags folding suited hands versus normal opens in the default `game_plan` profile.
- The `advanced` profile can allow suited folds when `BB_DEFENSE_ICM_ADJUSTMENTS[icmStage].foldSuitedAcceptable` is true.
- `icmDetector.ts` labels stages as estimates and assigns rough risk-premium estimates from hand-history signals, not exact payout/field data.

This is directionally safe: the app avoids grading all-ins/large raises and already marks ICM stage as estimated. The risk is that users may still read a BB suited-fold badge as too absolute unless the UI exposes which coverage/profile/stage created it.

## Product implications

1. **Do not generalize “never fold suited BB” into every tournament spot.** It applies only to normal 2x–3x opens and should be caveated by ICM stage/profile.
2. **Do not pretend exact ICM.** PokerStars-style hand histories rarely include field remaining and payout structure, so stage/risk premium must remain estimated unless tournament summary/payout data exists.
3. **Covered vs covering relationship matters.** Current stage-only adjustment is useful but incomplete; future logic should include whether hero is covered by opener, covers opener, or stacks are symmetric.
4. **Training UX should distinguish spot families.** Normal BB defense vs open, SB-vs-BB blind battle, shallow all-in/fold, and high-ICM final-table decisions need different labels and drills.
5. **This is a good early “trust substrate” slice.** It improves explanation quality without claiming solver-backed EV.

## Safe-to-code candidates

| Candidate | Status | Files likely touched | Acceptance criteria |
|---|---|---|---|
| BB-defense coverage explainer | Now | `src/analysis/rangeChecker.ts`, `src/utils/evidence.ts`, UI surfaces that show compliance badges | Users can see “normal open only”, “rule-based”, and ICM/profile caveats for BB suited-fold judgments. No new grading behavior required. |
| ICM confidence badge in hand review | Now/later | `src/analysis/icmDetector.ts`, `src/components/hands/HandReplay.tsx` | Hand review shows estimated ICM stage confidence/signals when present; wording remains “estimated/proxy,” not solver-backed. |
| Covered/covering stack feature flag | Later | `src/analysis/scenarioDetector.ts`, `src/analysis/rangeChecker.ts`, tests | Decision includes whether hero covers opener; no behavior change until tests prove parser consistency. |
| Separate BB defense drill buckets | Later | `src/analysis/studyPlan.ts` or Arena/Study Queue modules | Study queue separates normal BB overfolds from ICM/high-risk BB spots. |
| Exact ICM import support | Later / needs data | Parser/tournament summary data model | Only grade exact ICM when imported data contains field/payout/remaining-player evidence. |

## Refusal boundaries

- Do not grade `FACING_ALL_IN` or `BB_VS_LARGE_RAISE` with current static BB-defense rules.
- Do not call the current range rules solver-backed.
- Do not copy exact private-school charts or GTO Wizard charts into the app.
- Do not present heuristic ICM stage as factual bubble/FT state without imported evidence.

## Suggested next implementation slice

If we choose to code from this pilot, the safest first slice is **BB-defense coverage explainer**:

- It does not alter strategy logic.
- It reduces false confidence.
- It aligns with existing source/code.
- It can be tested with focused UI/evidence tests.

Proposed acceptance criteria:

1. BB suited-fold deviations are labeled as `rule-based`, `normal open only`, and `not solver-backed`.
2. If `decision.icmStage` is high-pressure and the advanced profile allows suited folds, the UI explains that ICM can make folding suited hands acceptable.
3. Large raises/all-ins keep the existing “not graded” refusal copy.
4. Tests cover default game-plan normal-open behavior and advanced-profile ICM caveat behavior.
