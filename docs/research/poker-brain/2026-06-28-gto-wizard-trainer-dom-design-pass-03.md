# GTO Wizard / RegLife Trainer DOM + Design Pass 03

Date: 2026-06-28  
Source posture: user-authorized private/tool evidence for GTO Wizard; user-authorized licensed-private for RegLife / RegLife PokerTrainer  
Usage status: GTO Wizard = workflow/config/design abstraction only unless direct reuse permission is clarified; RegLife trainer = licensed-brand-neutral-use per user-stated approval  
Raw material retained? Sanitized DOM snapshots and static trainer JSON were cached locally under Hermes cache; no raw tokenized URLs, account data, or raw private binaries committed to repo.

## Why this pass matters

The research target should not be limited to course PDFs. The product needs all three layers:

1. **Poker knowledge** — theory, ranges, ICM, bounty, exploit/heuristic framing.
2. **Trainer mechanics** — how a drill encodes a decision state, legal answer menu, score/feedback, progress, and spot generation.
3. **Design / workflow** — how serious tools make source/config context visible before recommendations.

This pass inspected the already-authenticated Chrome/CDP session. It did not touch login, account, payment, or subscription flows.

## Sources / local cache

| Source ID | Source | Local cache artifact |
|---|---|---|
| S-AUTH-REGLIFE-005 | RegLife PokerTrainer DOM + static trainer config for `vsOPEN UTG1 x UTG 100 50 25 15` | `C:/Users/MICRO/AppData/Local/hermes/research-cache/gto-trainer-dom/trainer_dom.json`, `C5A4P2T1-vsOPENUTG1xUTG100502515.json`, `spotFeedback.json` |
| S-AUTH-GTOW-002 | GTO Wizard authenticated preflop solutions DOM + visual capture | `C:/Users/MICRO/AppData/Local/hermes/research-cache/gto-trainer-dom/gtowizard_solutions_dom.json`, `C:/Users/MICRO/AppData/Local/hermes/research-screenshots/gtowizard_visual_actual.png` |

Tokenized URLs and account details were sanitized or omitted.

## RegLife PokerTrainer DOM/config findings

### Visible spot state

The current trainer spot is a preflop decision:

- Stage: `PRE FLOP`
- Prior action: `UTG RAISE 2 BB`
- Hero: `UTG1`
- Visible hero hand: `5s5d`
- Hero stack shown: `50`
- Villain/open position: `UTG`, stack reduced after 2bb raise
- Table: 8 handed (`UTG`, `UTG1`, `LJ`, `HJ`, `CO`, `BTN`, `SB`, `BB`)
- Pot: `4.5 BB`
- Legal menu: `FOLD`, `CALL`, `RAISE 5`, `RAISE 6`, `RAISE 7`, `ALL-IN`

### Static spot config schema

The trainer loads a static configuration file:

- `name`: `vsOPEN UTG1 x UTG 100 50 25 15`
- `action`: `vsOpen`
- `sessionSize`: `10`
- `stackSize`: `[100, 50, 25, 15]`
- `currentPotSize`: `1`
- `potSize`: `4.5`
- `tableSize`: `8`
- `villainBetSize`: `2`
- `heroPositions`: `[UTG1]`
- `villainPositions`: `[UTG]`
- `rangeToBeDealt`: 318 concrete combos
- `expectedAnswers`: 4 groups, one for each stack bucket

The expected-answer groups include action buckets per stack:

| Hero stack | Villain stack after open | Available expected-action buckets observed |
|---:|---:|---|
| 100 | 98 | `RAISE 7`, `CALL`, `FOLD` |
| 50 | 48 | `RAISE 6`, `CALL`, `FOLD` |
| 25 | 23 | `ALL-IN`, `RAISE 5`, `CALL`, `FOLD` |
| 15 | 13 | `ALL-IN`, `RAISE 5`, `CALL`, `FOLD` |

Important interpretation: action buckets can overlap by combo, so the product should not assume every drill has exactly one pure action per hand. A robust trainer model needs to support mixed/acceptable action sets or frequencies.

### Feedback schema

The trainer also loads `spotFeedback.json` with threshold buckets from 100 down to 0. The visible schema is generic score feedback, not spot-specific feedback. Product implication: we can separate:

- action-level feedback: “what should hero do with this hand in this config?”
- session-level feedback: “how did the user perform across this drill?”
- curriculum-level routing: “which lesson/study queue item should this miss unlock?”

### DOM / implementation clues

The trainer appears to be an Angular-style app (`__zone_symbol__*` globals) and uses stable, semantic CSS class names:

- `playingHistory`, `actionHistory`, `actionHistoryAction`
- `tableContainer`, `pokerTable`
- `basePlayer`, `playerWrapper`, `positionStackCards`, `positionAndStack`
- `tablePositionName`, `tablePositionStack`
- `betChips`, `pot`, `currentPot`
- `buttonsContainer`, `actionButtons`, `textInButtons`
- `playsCounter`

External/resource shape observed:

- static app chunks and CSS from `reglifesim.com`
- `https://api.reglifesim.com/verify`
- `https://api.reglifesim.com/drill`
- static trainer config under `configurationFiles/*.json`
- feedback config under `adminConfigurationFiles/spotFeedback.json`
- card/chip/table SVG assets

Product implication: our own trainer/drill components should have similarly stable semantic selectors and serialized spot config for tests, agent inspection, and reproducible research.

## RegLife PokerTrainer design patterns

Visual/layout observations:

- dark full-screen table on a black/charcoal background;
- top-left action-history breadcrumb (`PRE FLOP`, then prior action pill);
- centered oval table with seats anchored by position + stack labels;
- hero cards face-up at the bottom center;
- villain cards face-down;
- chips and blind/open amounts placed near relevant seats;
- pot shown at table center;
- large action buttons fixed below the hero:
  - blue for fold,
  - green for call,
  - red gradient family for raises/all-in;
- lightweight session counter at top-right;
- explicit exit button bottom-left.

Safe product abstraction:

- Build a `TrainerSpotCard` / `DrillSpotView` around `SpotPacket` rather than around raw hands.
- Always show: street, prior action, hero position/hand/stack, all active seats/stacks, pot, blinds/antes/bets, legal action menu.
- Preserve action colors consistently across the app.
- Make the legal action menu finite and visible before explanation.
- Add optional feedback thresholds later, but do not require trainer scoring before the study packet boundary is reliable.

## GTO Wizard DOM/design findings

The visible GTO Wizard preflop solution page exposes a mature solver-study layout:

### Workflow and source/config context

Global navigation:

- `Play`
- `Study`
- `Practice`
- `Analyze`
- `Upload`
- `Practice this spot`

Config/source panel:

- `Cash`
- `100bb`
- `6max NL25`
- `With cold calls 2.5x`
- position/action tree: `UTG`, `HJ`, `CO`, `BTN`, `SB`, `BB`
- available actions by node: fold/raise/all-in/call depending on position

Product implication: every solver-like or trainer-like view in our app should foreground source/config context before showing recommendations. This should become a reusable `SpotSourcePanel` / `StudyConfigPanel` pattern.

### Strategy/range workspace

Visible tabs/panels:

- `Strategy`
- `Ranges`
- `Breakdown`
- `Reports: Flops`
- `Overview`
- `Table`
- `Equity chart`
- `Actions`
- `Hands`
- `Summary`
- `Filters`
- `Blockers`

The screen combines:

- a 13x13 hand matrix on the left;
- color-coded strategy cells;
- right-side action distribution summary;
- combo counts;
- pot odds explanation;
- per-combo hand cards/details below.

Visible sample action summary for the selected root spot:

- `Allin 100`: `0%`
- `Raise 2.5`: `17.5%`
- `Fold`: `82.5%`
- Pot odds panel visible with `40%`

Safe product abstraction:

- Our app should not pretend to be solver-backed unless it is. But it can copy the workflow structure:
  - source/config panel,
  - action distribution card,
  - hand matrix / hand list,
  - explanation panel,
  - evidence/source labels,
  - “practice this spot” route.

### DOM/testability clues

GTO Wizard exposes many stable `data-tst` attributes in the DOM, including:

- `variant-switcher-nlholdem`
- `variant-switcher-plo`
- `play_menu_link_main`
- `study-menu-opener`
- `practice-menu-opener`
- `analyze-menu-opener`
- `shrtbtn_practice_spot`
- `btn_go_premium`

Product implication: add stable `data-testid`/`data-tst` selectors to our own research-critical UI. This makes browser tests and future Hermes/agent inspections far more reliable than visual scraping.

## Combined implementation candidates

### Now / near-term

1. Extend `SpotPacket` shape or companion metadata with:
   - legal action menu,
   - open size,
   - villain/open position,
   - active table size,
   - active seats/stacks,
   - callers before hero,
   - source module/config ID,
   - chipEV/ICM/bounty/source posture.

2. Create a neutral `TrainerSpot` schema inspired by RegLife config:
   - `scenarioId`, `street`, `tableSize`, `heroPosition`, `heroHand`, `heroStackBb`, `villainPositions`, `priorActions`, `potBb`, `legalActions`, `answerBuckets`.

3. Add UI design target:
   - dark trainer card/table mode;
   - source/config panel before any recommendation;
   - legal actions fixed near hero;
   - action-color semantics consistent across Range Matrix / Hand Review / Arena.

4. Add stable UI test selectors for critical review/study surfaces.

### Later

1. Trainer scoring and answer submission flow. Do not automate score-altering trainer clicks without an answer policy.
2. GTO Wizard upload/analyze flow inspection after user opens/authorizes specific pages.
3. ICM/Risk Premium PDF extraction from RegLife module.
4. Direct solver/API integration only after study-packet boundaries and source labels are trustworthy.

## Claims generated

- `C-PB-REGLIFE-006`
- `C-PB-REGLIFE-007`
- `C-PB-GTOW-002`
- `C-UX-GTOW-TRAINER-001`

## Refusal / pause boundaries

- Do not bypass paywalls, DRM, login restrictions, or account/subscription controls.
- Do not submit trainer answers or mutate progress without a user-approved answer policy.
- Do not treat GTO Wizard proprietary strategy values as public evidence.
- Do not call local/rule/trainer-derived output “solver-backed” unless a real solver/API source is used and recorded.
