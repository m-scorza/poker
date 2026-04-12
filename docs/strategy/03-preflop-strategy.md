# 03 — Pre-Flop Strategy

## 1. Reacting to an Open Raise (vs RFI)

### Position-Based Principles [Vol.2]

1. **Tighter range against tighter openers** — vs UTG, only play premium hands
2. **Fewer players behind = wider reaction range** — on the BTN vs CO, you face only 2 opponents
3. **AA always 3-bets** from any position except deep-stacked trapping spots
4. **As stack decreases, flat calling disappears** — at 15bb, it's all-in or fold

### Detailed Breakdown: EP vs UTG

#### 100bb [Vol.2]
- AA: always 3-bet
- KK, QQ, AKs: mixed 3-bet/flat (protecting flat range)
- AQo+ and AXs: play
- Small pairs: play if BB is recreational
- AJo, KQo: fold
- Strategy: heavy mixing to protect flat range from squeezes

#### 50bb
- KK, AK: always 3-bet
- AQs, KQs: flat call 100%
- Less mixing overall

#### 25bb
- Most hands prefer 3-bet over flat
- AKo, AQo: shove candidates

#### 15bb
- All-in or fold only — ~9.5% range
- Heuristic: **2/3 of opponent's RFI range**

### CO vs HJ (100bb) [Vol.2]
- AA, KK, AK: always 3-bet
- QQ, JJ, AQs: protect flat range
- Suited connectors (76s, 87s, 98s): flat or 3-bet
- Bluff 3-bets: A5s-A3s (block AA, wheel potential)
- K5s: can 3-bet at deep stacks
- Overall VPIP: very wide, since only 3 players left to act

### BTN vs CO (100bb)
- Widest reaction range in the game
- Nearly all suited hands play
- KXs, QXs down to low cards can flat
- 3-bet range: polarized with premiums + suited blockers

---

## 2. Big Blind Defense

### Why BB Defends Wide [Vol.2]

Folding BB costs 1.12bb (1bb + 0.12 ante). Any hand that loses less than 1.12bb/hand is worth playing. The solver calculates all hands that lose less than fold → that forms the BB defense range.

### BB vs BTN (20bb, chipEV) [Vol.2, Vol.3]
- Fold: ~12.3%
- Call: ~82%
- 3-bet: ~5.1%
- Extremely wide defense because BTN opens 50%+

### BB Defense in ICM / Tournament Context [Vol.3]

As ICM pressure increases (fewer players remain), BB defense tightens:

| Field Remaining | Fold % | 3-bet % | Risk Premium |
|---|---|---|---|
| 100% (early) | ~12% | ~5% | ~0% |
| 75% | ~19% | ~6.1% | ~2.2% |
| 50% (mid) | ~25%+ | varies | ~5-8% |
| Bubble | ~40%+ | tight | ~10-15%+ |
| Final Table | depends on stacks | depends | up to 18%+ |

### Key Heuristic for BB Defense
- Check risk premium from bubble factor table
- Required equity to call = Pot Odds + Risk Premium
- If risk premium > 10%, fold most marginal hands

---

## 3. Blind War (SB vs BB)

### SB Strategy [Vol.2]

The SB has a unique strategic dynamic:
- **Positional disadvantage** post-flop (acts first)
- **Only one opponent** to get through
- Strategy tends to be polarized: raise strong hands, limp some speculative/trap hands

#### SB Open Raise Size
- Standard: 2-2.5x
- Some solvers show a limp range from the SB (polarized limp: traps + weak hands)

### BB vs SB [Vol.2]
- BB defends extremely wide vs SB open (often 60-70%)
- 3-bet range is broader than vs other positions
- At 10bb: SB shoves ~69%, BB calls ~51% (theory)

---

## 4. Squeeze Play

A squeeze is a 3-bet made when there is an open raiser AND at least one caller. [Vol.3]

### Why Squeeze Works
1. Dead money in the pot from the caller(s)
2. Open raiser's range is capped (didn't 4-bet)
3. Caller's range is capped (didn't 3-bet)
4. Both opponents are more likely to fold

### Squeeze Sizing
- Typically larger than a standard 3-bet
- Add ~1bb per caller to the standard 3-bet size
- Example: standard 3-bet = 8bb → squeeze with 1 caller = 9-10bb

### Squeeze Ranges (25-30bb) [Vol.3]
- Linear at shorter stacks: premiums + strong broadways
- At deeper stacks: can add polarized bluffs (suited aces, suited connectors)

---

## 5. Facing a 3-Bet (Reaction vs 3-Bet)

### Decision Framework [Vol.2]

When you open and face a 3-bet, your options are:
1. **4-bet** (re-raise) — with premiums and bluff blockers
2. **Call** — with hands that play well post-flop and have good equity
3. **Fold** — everything else

### 4-Bet Range Composition
- **Value**: AA, KK (always), QQ and AKs (stack dependent)
- **Bluffs**: A5s-A2s (block AA/AK, have wheel potential), suited connectors at deep stacks
- At 25bb: 4-bet = all-in with AKo, QQ+, and some blocker hands (KJs, TT)

### Stack Influence on 4-Bet
| Stack | 4-bet Strategy |
|---|---|
| 100bb | Raise to ~2.25-2.5x the 3-bet. Mixed strategies. |
| 50bb | 4-bet = near all-in. Less room for post-flop play. |
| 25bb | 4-bet = all-in. Blockers matter most. |
| 15bb | Already committed at 3-bet stage. |

---

## 6. The NERD's Playbook — Stack Management Summary [NERD]

### < 10bb
- All-in or fold. Use push/fold tables.
- No flat calls — investing 2bb from a 10bb stack is too costly.
- Focus on fold equity, not hand strength alone.

### 10-15bb
- Open raise + fold is possible (the "fake shove" zone)
- At 12bb in FT with ICM: may raise to 8bb and fold to re-shove (see Fake Shove in doc 07)
- 3-bet = all-in

### 15-25bb
- Standard MTT stack. Open 2-2.2x.
- 3-bet sizing: 2.5-3x the open
- Some flat calling appears at 20bb+
- Post-flop play is limited (1-2 streets)

### 25-40bb
- Full strategic depth: open, flat, 3-bet, squeeze
- C-bet strategies become important
- Multi-street play becomes common

### 40bb+
- Deep stack play
- Protect flat ranges with strong hands
- Implied odds increase → speculative hands gain value
- SPR considerations become critical
