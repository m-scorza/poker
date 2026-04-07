# 06 — Bounty Tournaments (PKO / PSKO)

## 1. Core Concept: Bounty as Pot Odds Discount

In bounty tournaments, eliminating a player earns you their bounty. This bounty acts as a **discount on your pot odds**, making calls and aggressive plays more profitable. [Vol.2, D#11, D#06]

### Key Formula: Equity Drop

$$\text{Equity Drop} = \text{Standard Pot Odds} - \text{Bounty Adjustment}$$

The bounty reduces the equity needed to call profitably. A typical equity drop ranges from **-5% to -15%**, depending on bounty size relative to stacks.

---

## 2. Bounty Power (BPWR)

An in-game approximation technique to quantify the bounty's impact on pot odds. [D#11, D#06]

### How BPWR Works

BPWR converts the bounty value into a chip equivalent and adds it to the pot when calculating pot odds. This produces an "equity drop" — the reduction in required equity to call.

### Practical Example [D#11]

HJ opens with T9o. BB (13bb, 7786 chips) reshoves. Should we call?

1. Calculate standard pot odds without bounty
2. Apply BPWR: convert bounty into chip value, add to pot
3. New (lower) required equity = decision threshold
4. If our hand's equity vs villain's range exceeds the new threshold → call

### BPWR vs HRC

| Method | Precision | Use Case |
|---|---|---|
| BPWR | Approximate (~1-2% margin) | In-game quick calculation |
| HRC | Exact | Post-session study and review |

**Always verify BPWR decisions with HRC in study sessions.**

---

## 3. Equity Drop by Scenario

### Covering the Villain [D#13, D#14]

When you cover your opponent (have more chips), you can win their bounty → larger equity drop.

**Example** [D#13]: $22 tournament, BB vs HJ min-raise (20bb). Stack initial 50k, bounty initial $5.
- Equity drop vs HJ: **-8.7%**
- Result: defend significantly wider than in regular tournaments

**Example** [D#14]: CO vs HJ open in PKO, buy-in $33, bounty initial $7.50.
- Equity drop: **-12.6%** (bounty is very inflated relative to stack)
- VPIP increases dramatically to hunt the bounty

### Not Covering the Villain

When opponent covers you:
- You can still win a portion of their bounty (in progressive KO)
- Equity drop is smaller but still positive
- Adjust calling range slightly wider than regular tournaments

---

## 4. Multi-Way All-In in Bounty [D#18]

When multiple opponents are all-in, you can potentially win **multiple bounties**, which dramatically widens your calling range.

### Example [D#18]: Triple All-In
$10 tournament, early game. Stack initial 50k, bounty initial $2.25.
- HJ shoves, CO shoves, Hero on BTN considers calling
- Equity drop vs HJ: **-7.6%**
- Equity drop vs CO: **-9.4%**
- Combined bounty discount makes calling range **much wider** than regular tournaments
- HJ shove range ~19%, CO range on top → Hero calls with a wide range due to combined bounty value

### Key Principle
In multi-way bounty pots: the accumulated bounty value can justify calling with hands that would be clear folds in regular tournaments.

---

## 5. Squeeze in Bounty (PSKO) [D#06]

### Scenario
UTG opens, BTN flats, BB shoves (squeeze).

### Calculation Method
1. Standard pot odds for the squeeze call
2. Apply BPWR or HRC for the bounty adjustment
3. Factor in that you may also win BTN's bounty if BTN calls and loses

### Example [D#06]
$16.50 PSKO, early game.
- UTG opens, BTN flats, BB shoves
- BPWR equity drop is significant
- Hero (UTG) calling range widens considerably
- Must also consider BTN may overcall → could win multiple bounties

---

## 6. Early Game vs. Late Game Bounty Adjustments

### Early Game [D#03, D#18]
- Bounties are relatively small vs stacks
- Equity drop is moderate (5-10%)
- Still worth adjusting ranges, but don't over-adjust
- Stack preservation still matters for future bounty hunting

### Mid-Game
- Bounties have grown (progressive KO)
- Covering shorter stacks becomes very valuable
- Equity drop can reach 10-15%
- Open raise ranges expand significantly when covering opponents

### Late Game / Final Table [D#04]
- Bounties can be enormous (especially in PSKO)
- Pay jumps AND bounties create complex decisions
- Must balance ICM (pay jumps favor tightness) vs bounty (favors looseness)
- When bounty is large relative to remaining prize pool → bounty hunting dominates
- When bounty is small relative to pay jumps → ICM dominates

---

## 7. Bounty-Specific Range Adjustments

### Opening Ranges in PKO [D#11, D#14]
When covering players in the blinds:
- Open wider from all positions
- T9o from HJ can be a valid open (especially with passive opponents behind)
- The bounty provides extra incentive to enter pots

### Defense Ranges in PKO [D#13]
BB defense vs open raise when covering the opener:
- VPIP from BB increases dramatically
- Q6s becomes a call (fold in regular tournaments)
- Equity drop of -8.7% turns marginal hands into clear plays

### 3-Bet Ranges in PKO [D#14]
CO vs HJ open when covering:
- VPIP and 3-bet frequency increase significantly
- A5s: can flat, shove, 3-bet/call, or 3-bet/fold depending on stack depth
- With -12.6% equity drop, aggressive lines become more profitable

---

## 8. KJo in Bounty Early Game [D#03]

### Scenario
33% field left, 8bb effective. Stack initial 10k, bounty initial $3. Hero covers all opponents.

### Questions Addressed
1. Should we shove more? → Yes, bounty incentive
2. How much to expand open/call range? → Significantly
3. Can we raise/fold KJo? → Depends on opponent's reshove range

### Answer
- With bounty coverage, the raise/fold line with KJo is viable
- But at 8bb, shove may be preferred for simplicity
- The bounty makes marginal hands like KJo playable in spots where they'd be folds in regular tourneys

---

## 9. Quick Reference: Bounty Decision Heuristics

| Variable | Impact on Range |
|---|---|
| You cover villain | Widen range (equity drop applies) |
| Villain covers you | Slightly widen (partial bounty in progressive KO) |
| Multiple bounties available | Widen significantly |
| Early game, small bounties | Moderate adjustment (5-10% drop) |
| Late game, large bounties | Large adjustment (10-15%+ drop) |
| Bounty vs pay jump conflict | Compare $ values: larger factor dominates |
| BPWR > 15% equity drop | Almost always call with any reasonable hand |
