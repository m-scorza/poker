# 05 — ICM and Risk Premium

## 1. What Is ICM?

**Independent Chip Model** — a mathematical model that converts chip stacks into monetary equity based on pay structure. [ICM, Vol.1, Vol.2, Vol.3]

### Key Insight: Chips Have Diminishing Value

In cash games: 1 chip = $1 (linear). In tournaments: the relationship is **non-linear**.

- You can own 100% of chips but never 100% of the prize pool.
- Chips you **win** are worth less than chips you **lose**.
- Doubling your stack does NOT double your monetary equity.

### Example [ICM]
FT with 4 players (3 paid), $1000 prize pool. All start at 30bb → each stack worth $250.
One player doubles to 60bb → stack is worth **less than $500** (significantly less).

### Chip Value Asymmetry [ICM]
At 14bb in an FT scenario:
- Gain 2bb → gain $19.99 in equity
- Lose 2bb → lose $21.60 in equity

**The cost of losing always exceeds the benefit of winning.**

---

## 2. When to Consider ICM

| Stage | ICM Relevance |
|---|---|
| Early game (100% field) | Negligible — play chipEV |
| 75% field remaining | Minimal (~2% RP) |
| 50% field remaining | Moderate (~5-8% RP) |
| ITM Bubble | Very high (~10-15%+ RP) |
| Semi-Final Table (7-11 left) | High |
| Final Table | Maximum — every decision matters |

**Rule of thumb**: start considering ICM from ~50% field remaining. [Vol.3]

---

## 3. Risk Premium (RP)

Risk Premium is the **extra equity** required beyond pot odds to make a call profitable in ICM context. [ICM, Vol.2, Vol.3]

### Formula

$$\text{Required Equity (ICM)} = \text{Pot Odds} + \text{Risk Premium}$$

### Example [ICM]
Bubble, 4 players, 3 pay. BB has KJo, SB shoves.
- chipEV pot odds: 46% → KJo is a call
- Risk Premium: +22.9% (from bubble factor table)
- ICM required equity: 46% + 22.9% = **68.9%** → KJo is a clear **fold**

### How to Find Risk Premium
Use software: **HRC (Holdem Resources Calculator)**, **ICMIZER**, or **GTO Wizard** to generate bubble factor tables.

### Bubble Factor
Bubble factor is the multiplier that represents ICM pressure. [ICM]

$$\text{Risk Premium} = \text{Bubble Factor} - 1$$

Example: Bubble factor = 1.184 → Risk Premium = 18.4%

---

## 4. Risk Advantage (RA)

A concept from GTO Wizard representing the **asymmetry** of risk premium between two players. [Vol.3, D#15]

### Definition

$$\text{Risk Advantage} = \text{Villain's RP vs Hero} - \text{Hero's RP vs Villain}$$

If positive, Hero has risk advantage (less ICM pressure → can play wider).

### When Risk Advantage Matters [D#15]

RA becomes significant when there is a **large stack differential** between players.

#### Example [D#15]
FT spot: BTN has 39bb, BB has 16bb.
- BB's RP vs BTN: +12.6%
- BTN's RP vs BB: +5.2%
- BTN's Risk Advantage: **+7.4%** → BTN can play much wider

#### Symmetric Stacks
When stacks are equal, RP is symmetric → no risk advantage for either player.

### Strategic Implications of Risk Advantage [D#15, Vol.3]
- Player with RA → expand ranges, be more aggressive
- Player without RA → tighten ranges, play defensively
- In FT: the **chip leader** almost always has significant RA against the field
- The **second-largest stack** typically has the HIGHEST risk premium (most ICM-constrained)
- **Short stacks** have low RP (they're the "target") → can play looser

---

## 5. ICM Impact on BB Defense [Vol.3]

### Progression Through Tournament Stages

**chipEV (100% field)**: BB defends ~88% vs BTN open (20bb)
**75% field**: fold increases to ~19% (RP ~2.2%)
**50% field**: fold increases to ~25%+ (RP ~5-8%)
**Bubble**: fold can reach 40%+ (RP > 10%)

### Practical Decision Framework

1. Look up bubble factor table for your stack vs villain's stack
2. Calculate: Required Equity = Pot Odds + RP
3. If your hand's equity vs villain's range < required equity → fold
4. Even hands like KJo, AT become folds on tough bubbles

---

## 6. ICM in Specific Scenarios

### ITM Bubble [D#08, Vol.3]

The ITM bubble is one of the highest-pressure ICM moments.

Example (D#08): 33 left, ITM at 30. Hero is UTG with 6bb, position 30/33, holding JTs.
- RP is very high vs most of the table (especially players Hero doesn't cover)
- Short stack + high RP = only shove premium hands
- JTs is a **fold** despite being a strong hand in chipEV

### Semi-Final Table [D#16]
At 7-11 players, ICM pressure is already significant:
- Example: Hero is 7/11, BB vs BTN min-raise
- RP of 12.1% → massive constraint on defense range
- Suited hands normally defended become folds

### Final Table Pay Jumps [D#02, D#01]
Each elimination = pay jump. Stack preservation becomes critical.
- Even small confrontations can be −$EV due to chip value asymmetry
- Chip leader exploits this: lower RP → wider ranges → more aggression
- Short stacks paradoxically can be aggressive (nothing to lose, low RP)
- **Medium stacks suffer the most** — maximum RP, minimum maneuverability

---

## 7. Summary Table: RP Reference Points

| Scenario | Typical RP Range | Strategic Implication |
|---|---|---|
| Early game (100% field) | 0-1% | Play chipEV |
| 75% field | 1-3% | Slight tightening |
| 50% field | 3-8% | Noticeable fold increase |
| ITM Bubble | 10-18% | Dramatic range reduction |
| Semi-FT (7-11 left) | 8-15% | Very tight, preserve stack |
| FT (short stack) | 2-5% | Can be aggressive |
| FT (medium stack) | 10-18% | Most constrained |
| FT (chip leader) | 2-5% | Maximum aggression |
| FT (2nd stack vs CL) | Highest (~15-18%) | Most conservative |
