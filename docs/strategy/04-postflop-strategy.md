# 04 — Post-Flop Strategy

## 1. Range Advantage vs. Nuts Advantage

Two distinct concepts that determine betting frequency and sizing. [Vol.1, D#09, D#10]

### Range Advantage

The range that has more overall equity on a given board.

**Example** — UTG (17%) vs BB defense on A♥Q♠6♣: [Vol.1]
- UTG range: ~71% equity
- BB range: ~29% equity
- UTG has massive range advantage → bets 100% of range

**Heuristic**: Range advantage → bet frequently, small sizing (25-33%).

### Nuts Advantage

The range that contains a higher proportion of the strongest possible hands (sets, straights, flushes). [Vol.1, D#10]

**Example** — UTG vs BB on A♥6♠6♣: [Vol.1]
- UTG still has range advantage (~67%)
- But BB has **9.2%** nut combos (trips, full houses with 6x) vs UTG's **2.6%**
- BB has nuts advantage → can play aggressively with large sizings

**Heuristic**: Nuts advantage → use larger sizings to represent strong hands and pressure medium hands.

### Combined Framework

| Who Has Range Adv? | Who Has Nuts Adv? | Strategy |
|---|---|---|
| Aggressor | Aggressor | Bet wide, small sizing |
| Aggressor | Defender | Bet selectively, small sizing |
| Defender | Defender | Defender can check-raise; aggressor checks more |
| Neither clear | Defender | Check frequently; defender leads or raises |

---

## 2. C-Bet Strategy (Continuation Bet)

### C-Bet In Position (IP) [Vol.2]

#### When to C-bet 100% at Small Sizing (25-33%)
- Boards where you have significant range advantage
- High card boards (Broadway-heavy): A-K-x, K-Q-x, A-Q-x
- Dry/disconnected boards with high cards
- Reason: your range interacts much better; even weak hands benefit from denying equity

#### When to C-bet Selectively at Larger Sizing (50-75%)
- Boards where you have range advantage AND nuts advantage
- Wet boards where draws exist and you want to charge draws
- When your strong hands want to build the pot

#### When to Check Back
- Boards that favor BB's range (low connected boards like 7-6-5, 8-7-4)
- When BB has nuts advantage (paired boards with low cards)
- With hands that have showdown value but can't handle a check-raise

### C-Bet Sizing by Board Texture [D#09, D#10]

| Board Type | Example | Recommended Sizing | Reason |
|---|---|---|---|
| Double broadway + flush draw | K♠Q♥9♠ | 50-75% | Range + nuts advantage, charge draws |
| High card dry | A♣7♦2♠ | 25-33% | Massive range advantage, bet everything |
| Monotone low | 8♣6♣3♣ | Check or small | BB has nuts advantage (flushes, sets) |
| Paired low | 9♥6♠6♣ | 25% or check | BB has more 6x combos → nuts advantage |

### C-Bet Deep Stack Adjustment [D#09]
At 60bb+, prefer **larger c-bet sizings** because:
1. Deeper SPR → more streets to extract value
2. Range advantage is amplified by stack depth
3. You can build bigger pots with strong hands over multiple streets

### C-Bet OOP (Out of Position) [Vol.2]

Playing OOP as the pre-flop aggressor (e.g., SB vs BB after 3-bet):
- C-bet frequency is generally **lower** than IP
- Prefer to check strong hands for trapping more often
- When you do bet, use **polarized sizing** (large) since you can't control pot as easily
- Check-raise becomes an important defensive tool for the defender

---

## 3. Facing a C-Bet

### BB vs C-Bet (OOP) [Vol.2, Vol.3]

Population data (MDA) shows: [Vol.3]
- Average fold vs 33% c-bet (BTN→BB, 30bb+): ~39% (close to GTO's 37-42%)
- Average raise vs c-bet: ~18% (GTO: ~14-16%)
- Population tends to slightly over-raise and slightly under-fold

#### Defender's Options
1. **Call** — bluff-catchers, draws with implied odds, medium pairs
2. **Raise (check-raise)** — polarized: strong hands (sets, two pair) + draws as bluffs
3. **Fold** — trash, weak no-equity hands

### IP vs C-Bet [Vol.2]
When facing a c-bet while IP:
- Can call wider due to positional advantage
- Raising should be polarized (very strong or pure bluffs)
- Floating (calling with intent to take away the pot later) is stronger IP

---

## 4. Probe Bet (Turn Bet After Flop Check-Check)

When the flop goes check-check, the BB can lead the turn. This is called a **probe bet**. [D#07]

### When to Probe (BB on Turn After Check-Check)

On certain turn cards, theory shows BB should bet **nearly 100%** of range (~87% bet frequency on favorable turns). [D#07]

#### Best Turns for Probing
- Cards that **complete straights** (connecting with the board)
- **Double cards** (pairing the board in BB's favor)
- Cards that give BB equity advantages
- Example: board 9-high, turn brings a 7 or 8 completing straight draws

#### Probe Bet Sizing
The theory uses two main sizings: [D#07]
1. **Small (33%)** — for thin value and wide bluffs
2. **Large (75-100%)** — for strong hands and semi-bluffs with big draws

#### Simplification Heuristic [D#07]
- On favorable turns: bet your **entire range** (simplify by removing the check node)
- Value: top pairs, two pairs, sets, completed draws
- Bluffs: flush draws, gutshots, overcards with backdoor equity

---

## 5. Donk Bet (Leading into the Aggressor)

A non-standard but theoretically valid play, especially on the **turn** from BB. [D#21]

### When Donk Betting Is Correct (Turn)

Best turn cards for BB to donk bet after calling a flop c-bet: [D#21]
- **Double cards** — completing two-pair or trips for BB
- **Straight completers** — cards that fill BB's calling range draws
- Example: HJ opens, BB calls. Flop check-call vs 33% c-bet. Turn completes a straight.

### Donk Bet Composition [D#21]

**Value hands**: quads, full houses, straights, strong top pairs, second pairs
**Bluffs**: flush draws, open-enders, overcards with blockers

### How IP Should React to a Donk Bet [D#21]

Against a 50% donk bet, theory says IP should fold only ~26% of the time.
- If IP overfolds (>31%), BB can profitably donk bet 100% of range
- This is a significant exploit opportunity in low-stakes MTTs

---

## 6. Turn Play After Check-Raise on Flop

When BB check-raises the flop and villain calls, BB has the initiative on the turn. [D-Turn após CR]

### Key Considerations
- BB's range is polarized after check-raising (strong hands + draws)
- Turn cards that complete draws → BB can barrel aggressively
- Turn cards that brick → BB must consider pot control with bluff portion
- Sizing on turn is typically 50-75% of pot

---

## 7. Bet Sizing Summary

### General Sizing Guidelines

| Situation | Sizing | Reason |
|---|---|---|
| Range advantage, no nuts advantage | 25-33% | Bet wide, deny equity |
| Range + nuts advantage | 50-75% | Build pot, charge draws |
| Polarized range (river) | 66-150% (overbet) | Maximize value/fold equity |
| Thin value bet | 33-50% | Get called by worse, minimize loss vs better |
| Probe bet (standard) | 33-75% | Depends on turn card favorability |
| Donk bet | 50% | Standard theoretical sizing |

### Deep Stack Sizing Adjustment [D#09]
At 60bb+, upsize c-bets on boards with range advantage because:
1. More streets ahead → bigger geometric sizing needed
2. Can leverage positional advantage over more decisions
3. Strong hands benefit from building bigger pots early
