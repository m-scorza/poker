# FACING_ALL_IN Grading Proposal (Act III-3, second half)

> **Status: APPROVED 2026-07-18 — owner rulings recorded in §7.**
> All five questions were ruled as recommended: 12bb effective cap, bubble/FT
> stay refused, ±3pp band, PKO refused in v1, shove-over-action refused in
> v1. The §4 parameter sheet stands unamended. Implementation (§6) is
> unblocked.

**Goal (ROADMAP III-3, remaining box):** replace the `FACING_ALL_IN`
compliance exclusion in `src/analysis/rangeChecker.ts` with real grading.
Unlike `FACING_3BET`, this cannot be chart-driven: the decision is a
pot-odds + ICM calculation, so the engine grades **required equity vs
estimated equity**, not grid membership.

---

## 1. What exists — and what doesn't

**The vault has no facing-all-in answer keys.** Verified against
`quiz_configs.json` (16 configs, 223 cells): ALL-IN appears only as an
*answer button* in other drills; no quiz asks "villain shoved, what do you
do?". So there are no anchors to transcribe — the FACING_3BET
extract-and-approve path is unavailable, exactly as the roadmap predicted
("it needs a different engine").

What the repo does have:

- **Detection**: `scenarioDetector.ts:188-190` — non-blind hero facing a
  raise with `isAllIn` → `FACING_ALL_IN`. BB never reaches it
  (`BB_VS_LARGE_RAISE` fires first, stays excluded). Hero-opened jams are
  already routed to `FACING_3BET` and handled there (≤15bb premium rule /
  above-floor refusal). What's left for this engine is the **cold-facing**
  case: hero has not raised, someone shoved.
- **Math**: `01-poker-math.md` §pot-odds and `05-icm-and-risk-premium.md`
  (`Required Equity(ICM) = Pot Odds + Risk Premium`, RP reference table,
  worked KJo fold example at 68.9% required).
- **Shove ranges**: `src/data/pushFoldRanges.ts` — `PUSH_RANGES`, per-position
  open-shove ranges specified at 10bb. These can serve as the **assumed
  villain range** when the shove is an open-shove at that depth.
- **Stage ICM**: `icmDetector.ts` `estimateICMStage` — coarse per-stage risk
  premium (early 0 / mid 2 / bubble 10 / itm 8 / final_table 15 pp), honest
  about its limits (no villain stacks, no payout structure).
- **Equity tooling**: `poker-odds-calculator` is a dependency but only used
  in `HandReplay` (hand vs revealed hand). No hand-vs-range machinery exists;
  §3 proposes generating it offline into a committed table.

**Missing decision inputs**: `HeroDecision` carries neither pot-before-hero
nor amount-to-call nor shover stack. `buildHeroDecision` has the raw
material (`Action.amount`, `PlayerInHand.chipsBefore`) and is where the new
fields get computed.

## 2. Scope — what grades, what stays refused

Graded in v1 (all conditions must hold):

| Condition | Why |
|---|---|
| Shove is an **open-shove**: the all-in is the first raise, no callers before hero | `PUSH_RANGES` models first-in shoves; anything else assumes a range we don't have |
| **Effective stack ≤ 12bb** (min of shover's and hero's stack, in bb) | The push ranges are 10bb ranges; 12bb is the honest stretch limit (§7 Q1) |
| Hero is **not BB** (BB routes to `BB_VS_LARGE_RAISE`, unchanged) and not already invested (no hero limp) | Invested pockets change the price; rare and refusable |
| ICM stage ∈ {early, mid, itm} | Bubble/FT are already excluded repo-wide as "extreme ICM"; keeping them out is consistent (§7 Q2) |
| Non-PKO tournament (pending §7 Q4) | Bounty equity widens correct calls; grading without it manufactures false LOOSE_CALL flags |

Refused with **targeted reasons** (replacing today's blanket string):

- Shove over prior action (resteal jams, squeeze jams) — §7 Q5 offers a v2.
- Effective stack > 12bb — "no reliable shove-range model beyond 12bb."
- Multiway: a caller already in, or a second all-in.
- Bubble / final-table stage (if Q2 confirms).
- PKO (if Q4 confirms).

## 3. The engine

For a graded spot, with `C` = hero's cost to call (capped at hero's stack),
`P` = pot at hero's decision **minus any uncallable excess of the shove**
(side-pot correction when the shover covers hero):

1. **Required equity** `req = C / (C + P) + RP(stage)` — the KB formula,
   with RP from `estimateICMStage` (0 / 2 / 8 pp for early / mid / itm).
2. **Estimated equity** `E` = precomputed equity of hero's `handKey` vs the
   assumed shove range for the shover's position — a generated table
   (`allInEquity.generated.ts`, 169 hands × the `PUSH_RANGES` positions),
   built offline by a checked-in script using `poker-odds-calculator`
   (enumeration or seeded Monte Carlo to ±0.5pp; the script and its seed are
   committed so the table is reproducible).
3. **Verdict** with tolerance band `±b` (proposed 3pp, §7 Q3):
   - `E ≥ req + b` → CALL is the range action. FOLD flags `ALLIN_OVERFOLD`.
   - `E ≤ req − b` → FOLD is the range action. CALL flags `ALLIN_LOOSE_CALL`.
   - inside the band → **mixed**: both actions compliant, provenance
     `'band'` so the UI can show "close spot" instead of a green check.
   - Hero re-jamming over the shove counts as CALL (same commitment).

New deviation types `ALLIN_OVERFOLD` / `ALLIN_LOOSE_CALL` join
`types/analysis.ts` and feed the leak pipeline like the VS3BET pair.

## 4. Parameter sheet (the thing to approve)

| Parameter | Proposed value |
|---|---|
| Effective-stack cap | 12bb (assumed ranges = `PUSH_RANGES` as-is) |
| Assumed shover range | `PUSH_RANGES[shoverPosition]`, no depth scaling in v1 |
| Risk premium | stage-constant: early 0pp · mid 2pp · itm 8pp |
| Bubble / FT | refused, targeted reason |
| Mixed band | ±3pp around required equity |
| PKO | refused in v1 |
| Shove-over-action | refused in v1 |
| Equity precision | table generated to ±0.5pp, reproducible script |

Illustrative verdicts (9-max, 12.5% antes ≈ 1.1bb dead; final numbers come
from the generated table and get pinned in tests, so treat the equities as
±2pp estimates):

- **A** — CO open-shoves 10bb, hero BTN with A9s, early stage. Pot = 12.6bb,
  C = 10, req = 44.2%. A9s vs the CO push range ≈ 52%. → **clear call**;
  folding flags `ALLIN_OVERFOLD`.
- **B** — UTG open-shoves 10bb, hero MP1 with 22. req = 44.2%; 22 vs the
  tight UTG push range ≈ 39% (crushed by its pair-heavy core). →
  **clear fold**; calling flags `ALLIN_LOOSE_CALL`.
- **C** — same as B with KQs ≈ 44%. → inside the band, **mixed**, no flag
  either way.
- **D** — same as A but ITM stage: req = 52.2%, A9s ≈ 52% → the ICM premium
  moves a clear call into the band. This is the engine behaving as the KB
  says it should ("chips you win are worth less than chips you lose").

## 5. Honesty guardrails

1. **Math-fidelity suite** instead of vault anchors: ~12 curated spots
   spanning clear-call / clear-fold / band / each refusal pocket, with
   hand-checked `req` arithmetic, pinned in CI. The KB's worked KJo example
   (68.9% required) is transcribed as a doc-anchored test.
2. **Equity-table sanity tests**: AA ≥ 77% vs every push range; suited ≥
   offsuit for the same ranks; premium equity vs the wide BTN range ≥ vs the
   tight UTG range. A regenerated table that violates these fails CI.
3. **Provenance in the verdict** (`'engine'` vs `'band'`), so audits and UI
   can distinguish a confident grade from a coin-flip spot.
4. Every refusal pocket keeps a **specific** reason string — refusal-as-UI,
   same posture as FACING_3BET's pockets.

## 6. Implementation sketch (after approval)

- `scripts/generate-allin-equity.ts` + `src/data/allInEquity.generated.ts`.
- `buildHeroDecision` (`scenarioDetector.ts`): compute and attach
  `potBeforeHeroBb`, `callCostBb`, `shoverPosition`, `effectiveShoveBb`,
  open-shove/multiway flags. **Checkpoint:** verify SB cold-facing a shove
  actually routes to `FACING_ALL_IN` and not `FACING_RAISE`; if it lands in
  `FACING_RAISE` today it's being mis-graded as a 3-bet-or-fold spot — fix
  in the same PR.
- `rangeChecker.ts`: `checkFacingAllIn(...)` replacing the exclusion branch;
  refusal pockets return the targeted reasons.
- `types/analysis.ts`: new deviation types + decision fields; leak pipeline
  pickup; `ungradedScenarios` shrink + HandsPage refusal strip update.
- Tests: math-fidelity suite, equity sanity suite, detector routing tests,
  refusal regressions. Docs: STATUS/ROADMAP tick, CLAUDE.md scenario table
  row — same PR.

## 7. Owner decisions (answered 2026-07-18)

- **Q1 — depth cap:** **12bb effective**, using the 10bb `PUSH_RANGES`
  as-is. Deeper shoves keep a targeted refusal.
- **Q2 — bubble/FT:** **keep refused**, consistent with the repo-wide
  "extreme ICM" exclusion; the stage detector has no stack geometry or
  payout structure to price a real premium.
- **Q3 — band width:** **±3pp.** Inside the band both actions are
  compliant and the verdict carries `'band'` provenance.
- **Q4 — PKO:** **refuse in v1.** Bounty-aware grading is a v2 candidate
  once it can use real bounty numbers instead of a guessed cushion.
- **Q5 — shove-over-action:** **refuse in v1.** Only first-in open-shoves
  are graded; a `RESTEAL_RANGE`-based second tier is a v2 candidate.
