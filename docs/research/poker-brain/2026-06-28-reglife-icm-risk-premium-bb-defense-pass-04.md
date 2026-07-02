# RegLife ICM / Risk Premium / BB Defense Pass 04

Date: 2026-06-28  
Source posture: user-authorized licensed-private RegLife curriculum/PDF  
Usage status: `licensed-brand-neutral-use` per user-stated approval; implement as neutral abstractions, not as copied charts/tables/design.

## Research question

What product-safe abstractions should the analyzer take from the RegLife `ICM NA PRÁTICA` module before changing any BB-defense, ICM, or final-table guidance?

## Sources used

| Source ID | Source | Local cache artifact |
|---|---|---|
| S-AUTH-REGLIFE-006 | RegLife attachment `Reg Life - ICM NA PRÁTICA.pdf`, opened from the already-authenticated course lesson `Entendendo o Risk Premium na prática`. | `C:/Users/MICRO/AppData/Local/hermes/research-cache/reglife-icm-pratica/reglife-icm-na-pratica.pdf` and extracted text beside it. |
| S-USER-AUTH-001 | User instruction that RegLife has approved brand-neutral curriculum use for this project. | N/A |
| S-INT-CODE-001, S-INT-CODE-002 | Current shipped ICM detector and range checker. | Repo source; used only to map findings to implementation candidates. |

No tokenized URLs, account details, private charts, or raw PDF content were committed. The PDF was downloaded through the user-authorized lesson link and retained only in local Hermes cache for traceability.

## Normalized findings

### 1. Risk premium is pairwise, not a single table-stage number

Finding / concept: risk premium is defined between two specific players. Hero-vs-villain and villain-vs-hero can differ materially when stacks differ; that asymmetry is the useful concept behind risk advantage.  
Source(s): S-AUTH-REGLIFE-006  
Source type: user-authorized licensed-private  
Confidence: high  
IP / usage status: licensed-brand-neutral-use  
Product implication: `icmStage` alone is not enough for exact advice. A review packet should carry hero/villain stack relationship, stack ranks, field/payout context, and whether hero is covered/covering.  
Implementation candidate: add an `icmContext`/`riskContext` block to `SpotPacket` before any grading logic change.  
Validation needed: unit tests that final-table and bubble hands without payouts/full stacks remain `study_packet_only` / not solver-backed.  
Competitor comparison: aligns with solver-study tools that foreground configuration and stack/payout setup before range output.

### 2. Risk advantage changes aggression permissions

Finding / concept: when a player has lower risk premium against an opponent than that opponent has back against them, the player can apply more pressure; covered/intermediate stacks are more constrained.  
Source(s): S-AUTH-REGLIFE-006  
Source type: user-authorized licensed-private  
Confidence: high  
IP / usage status: licensed-brand-neutral-use  
Product implication: final-table and bubble explanations should not only say “ICM pressure”; they should say who has risk advantage and why the same hand can change action by stack relationship.  
Implementation candidate: source/caveat copy for study packets: `risk_advantage_unknown`, `hero_risk_disadvantage`, `hero_covers_opener`, `opener_covers_hero`.  
Validation needed: fixtures with same positions/hand but different stack distributions should produce different warnings, not different solver claims.  
Competitor comparison: HRC/ICMIZER/GTO Wizard-style workflows require stack/payout context; local analyzer should export/contextualize, not invent exact values.

### 3. BB defense tightens as field narrows and risk premium rises

Finding / concept: the module repeatedly compares chipEV BB defense against narrower-field / bubble scenarios. In the 20bb BTN-vs-BB example, the fold share moves from low chipEV/early-field values into materially higher fold shares as risk premium grows; a 25%-field example reached roughly the mid-30s fold share, and bubble/high-RP examples showed large folds and reduced shoving appetite.  
Source(s): S-AUTH-REGLIFE-006  
Source type: user-authorized licensed-private  
Confidence: high  
IP / usage status: licensed-brand-neutral-use  
Product implication: “never fold suited BB vs a normal small open” is unsafe without ICM caveats. The existing caveat is directionally right; future logic should route high-ICM BB defense to review/export rather than hard-grade from chipEV defaults.  
Implementation candidate: add a `bb_defense_icm_pressure` warning to SpotPacket / Study Queue when hero is BB facing an open and `icmStage` is bubble/final-table or stack/payout data is missing.  
Validation needed: regression tests preventing suited-hand overfold warnings in bubble/final-table BB-defense packets.  
Competitor comparison: this is a trust-substrate slice; exact range output belongs to HRC/ICMIZER/GTO Wizard validation, not local rule labels.

### 4. Asymmetric stack cases can remove suited hands from BB defense

Finding / concept: when the opener has strong risk advantage over the BB, even some suited hands can become folds; 3-bet ranges can become narrow/polarized instead of a generic “defend suited” rule.  
Source(s): S-AUTH-REGLIFE-006  
Source type: user-authorized licensed-private  
Confidence: high  
IP / usage status: licensed-brand-neutral-use  
Product implication: existing BB suited-fold logic must remain scoped to normal chipEV-ish spots and avoid false leak flags under ICM asymmetry.  
Implementation candidate: if opener covers hero or a final-table/bubble proxy is present, prefer “needs solver/export review” over “BB overfold” unless exact validated model data exists.  
Validation needed: scenario tests for BB facing CO/BTN open on bubble/final-table with missing payout context; expected output is warning/caveat, not compliance failure.  
Competitor comparison: differentiates private analyzer honesty from solver/trainer products that can compute exact ICM models.

### 5. Final-table medium stacks and micro-stack dynamics need explicit context

Finding / concept: the module emphasizes final-table poles: chip leader vs short stack often has low risk premium, while medium/second-place stacks can be most pressured, especially when a near-eliminated micro-stack creates a locked pay-jump incentive.  
Source(s): S-AUTH-REGLIFE-006  
Source type: user-authorized licensed-private  
Confidence: high  
IP / usage status: licensed-brand-neutral-use  
Product implication: final-table packets need stack-rank and payout-jump metadata; raw position/hand/open size is insufficient.  
Implementation candidate: add `stackRank`, `shortestStackBb`, `nextPayJumpKnown`, and `microStackPresent` fields/warnings to future SpotPacket context.  
Validation needed: fixtures/export packets for same hand/action with and without a micro-stack; both should remain non-solver-backed until payout/full-stack data is present.  
Competitor comparison: supports HRC as a first-class validation target because HRC-style calculations depend on exact stack and payout setup.

## Claims generated

- `C-PB-REGLIFE-008` — risk premium is pairwise/asymmetric; risk advantage depends on the specific hero-villain stack relationship.
- `C-PB-REGLIFE-009` — BB defense vs opens tightens as field narrows and risk premium rises; high-ICM spots should be routed to caveated review/export rather than chipEV hard grading.
- `C-PB-REGLIFE-010` — under opener risk advantage, suited BB hands can be correct folds and 3-bet ranges can become narrow/polarized.
- `C-PB-REGLIFE-011` — final-table medium-stack / second-in-chips situations can be more constrained than chip-leader-vs-short-stack situations.
- `C-PB-REGLIFE-012` — exact ICM advice requires stack distribution, payout/field context, opener/hero relationship, and calculation model metadata.

## Safe-to-code candidates

### Now

1. **SpotPacket ICM/risk context fields**
   - Additive metadata only; no EV, no solver label.
   - Candidate fields: `fieldRemainingPct`, `playersRemaining`, `paidPlaces`, `payoutsKnown`, `heroStackRank`, `openerStackRank`, `heroCoversOpener`, `openerCoversHero`, `shortestStackBb`, `microStackPresent`, `riskContextSource`.

2. **BB-defense ICM warning taxonomy**
   - Candidate warnings: `bb_defense_icm_pressure`, `risk_advantage_unknown`, `payout_jump_context_missing`, `micro_stack_context_missing`, `covered_by_opener`.
   - Acceptance criterion: high-ICM BB-defense packets say “review/export target” rather than “solver-backed” or “pure leak”.

3. **Study taxonomy**
   - Add neutral labels: `BB defense with risk premium`, `risk advantage`, `final-table medium-stack pressure`, `bubble/micro-stack pay-jump`.

### Later

1. Exact ICM/risk-premium values after a solver/export target is chosen and validated.
2. Final-table hand-history replay that asks for full payout table and all stacks before grading.
3. Trainer scoring policy for mixed actions; do not infer exact answer buckets from this PDF alone.

## Tests / fixtures needed

- A BB-vs-BTN/CO open packet at bubble/final-table stage that contains `not_solver_backed`, payout/field warnings, and no suited-overfold leak by default.
- Same hero hand/position with opener covering vs hero covering to verify risk-context warnings differ.
- A final-table packet with a near-zero micro-stack to ensure the packet asks for payout/stack context before any push/fold/3-bet recommendation.
- Snapshot/serializer test proving no raw PDF text, account details, tokenized URLs, or player names enter SpotPacket exports.

## Refusal / pause boundaries

- Do not copy RegLife charts/tables into public UI or docs; use original abstractions and source IDs.
- Do not call a local ICM heuristic solver-backed.
- Do not hard-grade exact final-table BB defense without full stacks, payout table, and a real solver/model target.
- Do not interact with RegLife Trainer answers or GTO Wizard upload/analyze state in ways that change account progress or consume quotas without explicit user approval.
