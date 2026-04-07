# 01 — Poker Math

## 1. Expected Value (EV)

EV is the average expected gain/loss of a decision repeated over the long run. [Vol.1]

### Formula

$$EV = (\%G \times \$G) + (\%P \times \$P)$$

Where:
- `%G` = win frequency
- `$G` = amount won
- `%P` = loss frequency
- `$P` = amount lost (negative number)

### Three Scenarios

| Scenario | Meaning |
|---|---|
| **+EV** | Profitable in the long run |
| **−EV** | Losing play in the long run |
| **EV = 0** | Breakeven — also called the "breakeven point" |

### Key Principles

1. It is not just win frequency that determines EV — it is the **risk vs. reward ratio**.
2. A play can be +EV even if you lose more than 50% of the time.
3. When two actions are both +EV, always choose the **highest EV** option.
4. You approach the expected value only through **repetition over large samples**.

### Practical Example

River pot = 100 chips. Villain shoves 50 chips. You estimate villain bluffs 50% of the time.

$$EV_{call} = (0.50 \times 150) + (0.50 \times -50) = 75 - 25 = +50 \text{ chips}$$

Despite winning only half the time, the call is clearly +EV because you risk 50 to win 150.

---

## 2. Pot Odds

Pot odds express the risk-to-reward ratio of calling a bet. [Vol.1]

### Formula

$$\text{Pot Odds} = \frac{\text{Bet to Call}}{\text{Bet to Call} + \text{Total Pot}}$$

### Example

Pot = 100 chips. Villain bets 50 all-in.

$$\text{Pot Odds} = \frac{50}{50 + 150} = \frac{50}{200} = 25\%$$

You need to win more than 25% of the time for a profitable call.

---

## 3. Outs and the Rule of 4 / Rule of 2+2

Outs are the remaining cards in the deck that improve your hand. [Vol.1]

### Rule of ×4 (Flop → River, all-in scenarios)

Multiply outs by 4 to estimate the probability of hitting by the river.

| Draw | Outs | × 4 | Approx. % |
|---|---|---|---|
| Open-ended straight draw (OESD) | 8 | 32 | ~32% |
| Flush draw | 9 | 36 | ~36% |
| OESD + Flush draw | 15 | 60 | ~60% |
| Gutshot | 4 | 16 | ~16% |

### Rule of ×2 + 2 (Single street — flop→turn or turn→river)

Use when villain is NOT all-in and more betting rounds remain.

| Draw | Outs | ×2 + 2 | Approx. % |
|---|---|---|---|
| OESD | 8 | 18 | ~18% |
| Flush draw | 9 | 20 | ~20% |
| OESD + Flush draw | 15 | 32 | ~32% |
| Gutshot | 4 | 10 | ~10% |

### Decision Framework

- **All-in on flop**: use Rule of ×4 → compare with pot odds
- **Villain has chips behind**: use Rule of ×2+2 → compare with pot odds, but also consider implied odds

---

## 4. Implied Odds

Implied odds account for chips you expect to win on **future streets** when you hit your draw. [Vol.1]

### Three Factors That Increase Implied Odds

1. **Remaining stack size** — more chips behind = more to win later
2. **Disguise of the draw** — if villain cannot easily spot your completed draw, you get paid more
3. **Villain profile** — a passive calling station pays you off more than an aggressive player who folds

### When Implied Odds Matter Most

- Your pot odds say the call is slightly −EV on the current street
- But the remaining stacks are deep
- And your draw is well-disguised (e.g., gutshot vs. obvious flush draw)

---

## 5. Equity

### 5.1 Crude Equity (Raw Equity)

The percentage of times a hand or range wins at showdown assuming no further betting (all-in or check-down to river). [Vol.1]

Three ways to calculate:
1. **Hand vs. Hand** — e.g., AKo (45%) vs. 77 (55%)
2. **Hand vs. Range** — e.g., AKo (62%) vs. a 15% range (38%)
3. **Range vs. Range** — e.g., UTG 17% range (71%) vs. BB defense range (29%) on A♥Q♠6♣

Tool: **Equilab** (free) or **Flopzilla**

### 5.2 Realized Equity

The amount of crude equity you actually capture through post-flop play. [Vol.1]

$$\text{Realized Equity} = \text{Crude Equity} \times EQR$$

Where **EQR** (Equity Realization Factor) is influenced by:

| Factor | Higher EQR | Lower EQR |
|---|---|---|
| **Position** | In position (IP) | Out of position (OOP) |
| **Range strength** | Tighter, stronger range | Wider, weaker range |
| **Stack depth** | Shallower stacks | Deeper stacks |

Key insight: with short stacks (15bb), top pair is almost never foldable → high equity realization. With deep stacks (100bb), top pair can be pressured into folding → lower realization.

### 5.3 Robust vs. Non-Robust Equity

**Robust equity**: equity that holds up even as villain's range narrows / gets stronger. [Vol.1]

Example on A♥Q♠6♣:
- **AQ** = robust — keeps ~93-94% equity even when villain only has top pair+
- **88** = non-robust — drops from 60% → 34% → 9% as villain's range narrows

**Decision heuristic**:
- Robust equity hands → comfortable in big pots, can bet/raise for value
- Non-robust equity hands → prefer small pots, play defensively as bluff-catchers

---

## 6. Why We Bet (Matthew Janda Framework)

Before the river, the traditional "value bet vs. bluff" distinction is incomplete. Janda's two real reasons to bet: [Vol.1]

1. **Grow the pot when we're ahead** — similar to value betting
2. **Deny equity** — similar to bluffing, but with the nuance that we may still have equity ourselves

These two reasons overlap most on the flop and gradually separate until the river, where pure value and pure bluff fully diverge.

### Pre-flop Example

3-betting A5s against a KJo open: we are ahead in equity (A5s > KJo), yet we wouldn't call it a "value" 3-bet. The two motivations:
1. Deny equity from villain's opening range
2. Build a bigger pot in case A5s makes a strong hand (flush, wheel) post-flop

### Street-by-Street Overlap

```
Pre-flop:  [=======OVERLAP=======]
Flop:      [====OVERLAP====]
Turn:      [==OVERLAP==]
River:     [VALUE]  [BLUFF]   ← fully separated
```

---

## 7. SPR (Stack-to-Pot Ratio)

$$SPR = \frac{\text{Effective Stack}}{\text{Pot Size}}$$

| SPR | Implication |
|---|---|
| < 3 | Commit with top pair. Few decisions left. |
| 3–7 | Medium depth. Overpairs and strong draws commit. |
| 7–15 | Need strong hands to stack off. Two pair+ comfortable. |
| > 15 | Very deep. Sets, straights, flushes needed to stack off. |

[Vol.2 Glossary]
