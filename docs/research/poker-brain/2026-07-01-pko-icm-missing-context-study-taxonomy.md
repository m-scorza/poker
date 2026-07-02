# PKO / ICM Missing-Context Study Taxonomy Pass

Date: 2026-07-01  
Front: poker brain, implementation/tool feasibility, study-loop UX  
Source posture: internal repo KB/code plus prior source-governed RegLife/GTO/HRC research; no private-site content copied in this pass.

## Research question

What is the next safe abstraction for bounty/PKO and ICM-sensitive tournament spots, given the app already has BPWR-style bounty plumbing, `SpotPacket` study/export boundaries, Data Health source-context queueing, and local Study Queue/Arena loops?

## Readiness / repo inspection

- `git status --short --branch` showed a broad pre-existing dirty worktree on `hermes/worktree-20260627-213824`; this pass avoided app-code edits and preserved all existing work.
- Chrome CDP at `127.0.0.1:9222` was reachable. Sanitized tab inventory showed GTO Wizard `/solutions`, RegLife lesson, RegLife PokerTrainer, and GTO Wizard `/login` pages. A read-only structural probe succeeded only for GTO Wizard `/solutions` (button/link/data-hook counts and selector-family samples); RegLife/PokerTrainer/login tabs timed out again. No raw URLs, account data, screenshots, solver ranges/frequencies, trainer answers, uploads, storage mutation, or progress-changing actions were attempted.
- Current source/code inspected: `docs/knowledge/strategy/05-icm-and-risk-premium.md`, `06-bounty-tournaments.md`, `07-final-table-play.md`, `src/analysis/bountyAnalyzer.ts`, `src/analysis/spotPacket.ts`, `src/analysis/studyPlan.ts`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`.

## Sources used

| Source ID | Source | Usage |
|---|---|---|
| S-INT-KB-002 | `docs/knowledge/strategy/05-icm-and-risk-premium.md` | Internal risk-premium and risk-advantage source; used as an abstraction baseline. |
| S-INT-KB-003 | `docs/knowledge/strategy/06-bounty-tournaments.md` | Internal bounty / PKO / BPWR knowledge source. |
| S-INT-KB-004 | `docs/knowledge/strategy/07-final-table-play.md` | Internal final-table / bounty-vs-ICM tension source. |
| S-INT-CODE-024 | `src/analysis/bountyAnalyzer.ts`, `src/analysis/spotPacket.ts`, `src/analysis/studyPlan.ts`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md` | Current shipped/planned code-state source for bounty estimates, packet warnings, and source-context Study Queue behavior. |
| S-AUTH-REGLIFE-006 | RegLife licensed-private ICM practice PDF, previously extracted and ledgered | Prior source-governed support for pairwise risk premium / risk advantage; no raw material reused here. |
| S-PUB-SOLVER-001, S-PUB-SOLVER-003 | HRC and ICMIZER public documentation/product evidence | External validation targets for exact ICM/PKO decisions. |

## Normalized findings

### 1. Bounty value is a pot-odds modifier, not a complete answer

Finding / concept: bounty value lowers the equity needed to continue, but it only becomes decision-useful when tied to pot size, coverage, stack depth, and tournament phase. BPWR is a practical approximation; exact post-session validation belongs to HRC/ICMIZER-style workflows.  
Source(s): S-INT-KB-003, S-INT-CODE-024, S-PUB-SOLVER-001, S-PUB-SOLVER-003  
Source type: internal repo plus public solver docs  
Confidence: high  
IP / usage status: safe-to-implement-as-abstraction  
Product implication: local bounty outputs should stay `directional` / `study_packet_only` unless the packet has exact bounty values, model settings, and validated external output.  
Implementation candidate: expand `SpotPacket` bounty warnings beyond generic `missing_bounty_context` so the UI can say which PKO inputs are missing.  
Validation needed: unit tests proving PKO packets without explicit bounty values remain no-EV/no-solver-backed even if `BountyContext.equityDrop` exists.  
Competitor comparison: HRC/ICMIZER own exact model-backed tournament calculations; this app should own private local triage and export readiness.

### 2. Coverage and multi-bounty availability are first-class packet context

Finding / concept: whether hero covers villain, whether villain covers hero, and whether multiple bounties can be won in a multiway all-in materially change the correct range. A single hand-level `bountyCollected` or tournament-level `bounty` value is not enough to reconstruct the decision.  
Source(s): S-INT-KB-003, S-INT-CODE-024  
Source type: internal repo  
Confidence: high  
IP / usage status: safe-to-implement-as-abstraction  
Product implication: future packets need to distinguish known collected bounty, known tournament bounty, opponent bounty availability, coverage relationship, and multi-bounty possibility.  
Implementation candidate: add warning/caveat labels such as `opponent_bounty_values_unknown`, `pko_coverage_context_partial`, and `multi_bounty_context_missing` before adding any stronger PKO drill grading.  
Validation needed: fixtures for single bounty, no-covered-villain, and multiway all-in PKO spots; expected result is distinct context warnings, not solver claims.  
Competitor comparison: exact calculators require full stack/bounty/payout setup; local review should expose missing setup rather than hide it behind an overconfident recommendation.

### 3. PKO final-table spots require a tension label: risk premium versus equity drop

Finding / concept: late PKO / bounty final-table decisions have opposing forces: pay jumps and risk premium tighten ranges, while bounty equity-drop incentives widen them. The safe abstraction is not “PKO means call wider”; it is “compare risk premium against bounty equity drop, and refuse exact grading when either side is missing.”  
Source(s): S-INT-KB-002, S-INT-KB-003, S-INT-KB-004, S-AUTH-REGLIFE-006  
Source type: internal repo plus user-authorized licensed-private abstraction  
Confidence: high  
IP / usage status: licensed-brand-neutral-use for RegLife concept; safe-to-implement-as-abstraction in product  
Product implication: Study Queue / Hand Replay copy should classify these as `PKO vs pay-jump review` or `bounty/ICM conflict`, not as pure overcall/overfold leaks without full context.  
Implementation candidate: add a review taxonomy bucket for `pko_icm_tension` and carry both `missing_bounty_context` and `missing_payouts` / `icm_risk_context_estimated` warnings together.  
Validation needed: final-table bounty fixture with known bounty but missing payouts should remain review/export-only; fixture with payouts but unknown opponent bounty should remain review/export-only.  
Competitor comparison: this is a trust-substrate wedge against solver/trainer tools: make setup gaps visible before sending the user to external validation.

### 4. Existing code already has the safe boundary but the taxonomy is still too generic

Finding / concept: current `bountyAnalyzer.ts` labels BPWR as a simplified approximation; `spotPacket.ts` already emits `not_solver_backed`, `icm_risk_context_estimated`, payout/field warnings, and `missing_bounty_context`; `studyPlan.ts` already queues ICM/bounty-sensitive hands for Data Health source/context review. The next improvement is not a solver calculation; it is more precise PKO study labels and warnings.  
Source(s): S-INT-CODE-024  
Source type: internal repo/source code  
Confidence: high  
IP / usage status: source-of-truth for shipped behavior  
Product implication: a small future code slice can improve user trust without changing strategic grading: richer warning names, display copy, and tests.  
Implementation candidate: map PKO/BPWR spots into Study Queue evidence details like `PKO bounty values missing`, `coverage relationship inferred from table stacks`, `pay-jump context missing`, and `multiway bounty setup required`.  
Validation needed: `spotPacket.test.ts`, `studyPlan.test.ts`, `SpotSourcePanel.test.tsx`, and route-contract smoke should assert no EV-loss/correct-answer wording appears for these spots.  
Competitor comparison: keeps the app clearly in the private/local analyzer lane rather than pretending to be HRC/GTO Wizard/ICMIZER.

## Claims generated

- `C-PB-PKO-001` — bounty equity drop is a directional pot-odds modifier unless exact bounty/pot/coverage/model data exists.
- `C-PB-PKO-002` — coverage and multi-bounty availability materially change PKO ranges; packet context must make missing opponent bounty data visible.
- `C-PB-PKO-003` — bounty final-table decisions require a risk-premium-versus-equity-drop tension label and should remain review/export-only when either side is missing.
- `C-UX-STUDY-012` — the existing Study Queue/Data Health boundary is the right place to surface PKO/ICM missing-context taxonomy before stronger grading.

## Safe-to-code candidates

### Now

1. **SpotPacket bounty warning vocabulary**
   - Add additive warnings only; no solver EV and no answer scoring.
   - Candidate warnings: `opponent_bounty_values_unknown`, `pko_coverage_context_partial`, `multi_bounty_context_missing`, `pko_pay_jump_context_missing`, `starting_stack_estimated_for_bounty`.
   - Acceptance criterion: PKO-sensitive packets explain which exact inputs are missing and keep `evidenceLabel: study_packet_only`.

2. **Study Queue source-context copy split**
   - Current reason `ICM/bounty spot needs tournament summary or payout review` is safe but broad.
   - Split into concrete review cues: bounty values, opponent coverage, payouts/field, and source-summary gaps.
   - Acceptance criterion: Data Health item remains unsupported/no-EV/no-trainer-scoring and links to local SpotPacket review.

3. **Display taxonomy labels**
   - Neutral labels: `PKO coverage review`, `multi-bounty all-in review`, `PKO vs pay-jump tension`, `bounty-context missing`, `BPWR estimate only`.
   - Acceptance criterion: Hand Replay / SpotSourcePanel / Study Queue never imply “call wider” as a solved answer without context.

### Later

1. User-entered or imported bounty table / payout table attached to a packet hash.
2. HRC/ICMIZER export template for PKO all-in / final-table review.
3. Captured external solver result with source/version/config before any `solver_backed_result` label.
4. Trainer scoring for PKO spots only after a mixed-action policy and exact-context fixture set exist.

## Tests / fixtures needed for the next implementation slice

- `spotPacket.test.ts`: PKO decision with `decision.bountyContext` and no tournament bounty emits PKO-specific warnings plus `not_solver_backed`.
- `spotPacket.test.ts`: multiway all-in PKO packet exposes multi-bounty context as missing/partial instead of producing EV or a correct answer.
- `studyPlan.test.ts`: ICM+bounty hand produces Data Health source/context details naming bounty and payout gaps separately.
- `SpotSourcePanel.test.tsx` / route-contract smoke: display keeps no-solver/no-EV/no-trainer-answer boundaries while showing the new PKO taxonomy.

## Refusal / pause boundaries

- Do not call BPWR, local range checks, or Study Queue priority a solver result.
- Do not hard-grade exact bounty final-table calls without payout table, full stacks, bounty values, and a validated model target.
- Do not copy private solver/trainer output or RegLife tables verbatim; use source-ledgered abstractions only.
- Do not upload hands to GTO Wizard/HRC/ICMIZER or interact with trainer answers without explicit user authorization for that state-changing action.
