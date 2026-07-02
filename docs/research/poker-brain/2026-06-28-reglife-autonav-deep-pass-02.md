# RegLife Authorized Autonav Deep Pass 02

Date: 2026-06-28  
Source posture: user-authorized licensed-private / RegLife brand-neutral curriculum use per user-stated express approval  
Usage status: licensed-brand-neutral-use  
Raw material retained? PDFs were downloaded only to local Hermes cache for extraction; no raw PDF binaries committed to repo.

## What Hermes navigated autonomously

Hermes used the already-authenticated Chrome/CDP session and navigated RegLife course pages without touching login, payment, MFA, or account settings.

Observed / extracted:

- MTT Profissional course page and module list.
- MTT Elite course page and module list.
- `Enfrentando open raise` lesson page.
- `Defesa de Big blind multiway` lesson page.
- `Risk Premium na prática` lesson shell.
- RegLife PDF attachment: `Reg Life - Ranges de Flat e 3-BET.pdf`.
- RegLife PDF attachment: `Reg Life - DEFESA MULTIWAY DO BIG BLIND PRÉ-FLOP.pdf`.

Local-only cache artifacts:

- `C:/Users/MICRO/AppData/Local/hermes/research-cache/reglife-ranges-flat-3bet.pdf`
- `C:/Users/MICRO/AppData/Local/hermes/research-cache/reglife-ranges-flat-3bet.txt`
- `C:/Users/MICRO/AppData/Local/hermes/research-cache/reglife-pdfs/reg-life-defesa-multiway-do-big-blind-pre-flop-pdf.pdf`
- `C:/Users/MICRO/AppData/Local/hermes/research-cache/reglife-pdfs/reg-life-defesa-multiway-do-big-blind-pre-flop-pdf.txt`

## Source inventory

| Source label | Source ID | Type | Permission / use |
|---|---|---|---|
| RegLife Flat/3-bet ranges PDF | S-AUTH-REGLIFE-003 | User-authorized licensed-private PDF | Licensed-brand-neutral-use per user-stated RegLife approval. |
| RegLife BB multiway preflop PDF | S-AUTH-REGLIFE-004 | User-authorized licensed-private PDF | Licensed-brand-neutral-use per user-stated RegLife approval. |

## Extracted theory: facing open raises / flat + 3-bet

From the Flat/3-bet PDF and `Enfrentando open raise` module:

1. **ChipEV baseline before ICM adaptation**
   - The material explicitly frames the ranges as theoretical chipEV ranges without ICM impact.
   - Product implication: Study logic should separate `chipEV_reference`, `icm_adjusted`, and `bounty_adjusted` sources. Do not blend them silently.

2. **Stack depth drives reaction strategy**
   - Covered stack sizes include 100bb, 50bb, 25bb, and 15bb.
   - Deep stacks allow more flats, but flats need protection from strong hands or in-position players can attack a capped range.
   - As stacks shorten, flatting incentives shrink; at 15bb the strategy simplifies heavily toward all-in/fold.
   - Product implication: preflop leak labels should be stack-bucketed; the same hand/action can be reasonable at 100bb and bad at 15bb.

3. **3-bet sizing is stack- and position-dependent**
   - 15bb: all-in over normal open.
   - 25bb: non-all-in 3-bet exists in position, but many spots become shove/fold heavy.
   - 50bb: around 2.5x IP and larger OOP sizing bands.
   - 100bb: larger non-all-in 3-bets, with OOP larger than IP.
   - Product implication: `SpotPacket` should carry open size and available raise-size menu, not just “raise”.

4. **Solver objective: lose less than fold**
   - The PDF explains that solvers use blinds/antes and find hands that lose less than folding in each position.
   - It distinguishes fold cost by position: non-blind positions mostly lose ante, SB loses SB+ante, BB loses BB+ante.
   - Product implication: BB defense explanations should talk about “defending because it loses less than folding,” not only “this hand is profitable”.

5. **Early-position vs UTG remains tight**
   - Early-position reaction versus UTG is tight because UTG’s range is strong and many players remain to act.
   - Deep stacks require protecting flat ranges with some strong hands; short stacks tighten and simplify.
   - Product implication: `FACING_RAISE` should not be one generic bucket. It needs opener position, hero position, players left, and stack depth.

6. **Memorization heuristic: expand from previous range edges**
   - As opener/hero positions get later, ranges widen from the edges rather than randomly adding combos.
   - Product implication: study UI can show “why this combo appears” via edge-expansion language: suited connectors, broadways, pairs, blockers, dominated off-suit edges.

7. **15bb facing open can use ratio heuristics**
   - The material notes that with 15bb the response often becomes all-in/fold and in one HJ-vs-LJ example uses about 9.5% of hands, roughly two-thirds of opener RFI as a memorization heuristic.
   - Product implication: short-stack study drills can expose range-size heuristics but should label them as training heuristics, not universal rules.

## Extracted theory: BB multiway preflop defense

From the BB multiway preflop PDF:

1. **Multiway defense is about equity realization and equity division**
   - BB does not only face one range; equity is split against multiple ranges and realization is worse, especially out of position.
   - Product implication: BB defense detector must not reuse heads-up BB-vs-open logic after a caller enters the pot.

2. **A caller in position can sharply reduce BB defense**
   - In one CO-open + BTN-call toy game, BB fold share rises materially compared with heads-up CO open.
   - The reason given: BTN and opener both dominate many marginal BB hands, and BB is out of position to both.
   - Product implication: add a future scenario like `BB_VS_RAISE_MULTIWAY` or at least warning metadata when callers exist before hero acts.

3. **A caller from SB is less punishing than a caller in position**
   - When SB flats, BB has position over the SB postflop, improving realization compared with BTN flat scenarios.
   - Product implication: multiway context should encode caller position(s), not just caller count.

4. **Opponent range strength matters as much as player count**
   - UTG open + LJ call creates a much stronger combined range than CO open + BTN/SB call.
   - Product implication: multiway BB defense should combine opener position + caller positions + estimated caller range strength.

5. **Stack depth changes which marginal hands survive**
   - At 25bb, some equity-realizing hands can continue because stack depth limits reverse implied odds and top-pair realization problems.
   - At 100bb, reverse implied odds become more punishing; dominated offsuit edges and weak suited edges fall away more often.
   - Product implication: deep BB multiway defense should be stricter than shallow BB multiway defense, even though deep heads-up BB defense can be wide.

6. **Squeeze composition changes by configuration**
   - Some multiway spots include all-in or non-all-in squeeze components with strong/equity/blocker-heavy hands.
   - The PDF notes that ICM may reintroduce non-all-in squeezes in spots that are shove/call/fold in chipEV.
   - Product implication: `SpotPacket` should support a legal action menu and source-specific action classes: fold/call/squeeze non-all-in/all-in.

## Risk Premium / ICM module shell observed

The `Risk Premium na prática` page shell exposed an `ICM NA PRÁTICA` PDF attachment and lesson copy:

> apply Risk Premium in poker strategy and understand how it influences tournament decisions, including final-table situations.

The PDF did not get extracted in this pass due page navigation state instability; it remains a high-value next extraction target.

## Implementation candidates

1. **Study taxonomy seed**
   - Add neutral categories based on observed RegLife structure:
     - facing open raise,
     - facing 3-bet,
     - blind war SB/BB,
     - BB defense heads-up,
     - BB defense multiway,
     - squeeze,
     - ICM/risk premium,
     - bounty ranges,
     - postflop c-bet/vs-c-bet lines,
     - mass data analysis.

2. **Scenario detection extension**
   - Add or reserve `BB_VS_RAISE_MULTIWAY` / `FACING_RAISE_MULTIWAY` so callers before hero action do not get treated as heads-up spots.

3. **SpotPacket extension**
   - Add `callersBeforeHero`, `callerPositions`, `playersLeftToAct`, `legalActionMenu`, `openSizeBb`, and `sourceStudyModule`.

4. **Explanation copy candidates**
   - “This is chipEV, not ICM.”
   - “The defense is justified when it loses less than folding, especially in the blinds.”
   - “Multiway callers reduce equity realization; caller position matters.”
   - “Deep multiway spots can be tighter because reverse implied odds increase.”

5. **Fixture/test needs**
   - BB facing CO open heads-up vs CO open + BTN call.
   - BB facing CO open + SB call.
   - BB facing UTG open + LJ call at 25bb vs 100bb.
   - UTG1 vs UTG open at 15bb, 25bb, 50bb, 100bb.

## Navigation limits / next pass

- The RegLife app is a Next.js SPA and some direct navigation without `moduleId` lands in partially loaded course shells; module URLs with `moduleId` are more reliable.
- Video transcripts were not extracted in this pass; visible lesson descriptions and PDF text were extracted.
- Trainer feedback was not submitted/clicked to avoid changing user training answers/statistics without a deliberate answer policy.
- Next best pass: open/download `Reg Life - ICM NA PRÁTICA.pdf`, extract it, then inspect trainer result feedback after choosing answers only if the user wants Hermes to interact with the trainer scoring flow.
