# 07 — Final Table Play

## 1. FT Stack Dynamics [Vol.3, D#01, D#15]

### The Three Archetypes

| Stack Type | RP Behavior | Strategic Posture |
|---|---|---|
| **Chip Leader** | Lowest RP vs field | Maximum aggression. Open wide, 3-bet wide, pressure medium stacks. |
| **Medium Stack** | Highest RP (especially vs CL) | Most constrained. Fold marginal hands. Avoid confrontation with CL unless premium. |
| **Short Stack** | Low RP (nothing to lose) | Can play loose. Shove wider than expected. "Target" for bounty. |

### FT RP Poles [Vol.3]
- **Highest RP**: always 2nd stack vs chip leader (can be 15-18%)
- **Lowest RP**: always chip leader vs short stack (can be 2-3%)
- Wide gap between poles = complex, dynamic FT

---

## 2. Open Raise at the Final Table [D#01]

### Raise/Fold vs. Shove Decision

When your stack allows a raise but you can't call a reshove, you have two options:
1. **Raise/Fold (R/F)**: open small, fold to reshove — works when RP vs opponents is high
2. **Shove**: commit all chips pre-flop — works when hand is too strong to fold but not strong enough for R/C

### Decision Framework [D#01]

Check RP asymmetry:
- If your RP vs opponents is ~10% but theirs vs you is ~5-7% → they have risk advantage
- In this case, Raise/Fold can be better than shove because you retain chips when they fight back
- Shove may be better when your hand is strong enough to accept the risk

### Example [D#01]
FT of $20 Freezeout. Hero in CO with K5o, 12bb.
- RP vs BTN, SB, BB: ~10%, ~9%, ~11%
- Their RP vs Hero: ~6%, ~7%, ~5%
- Hero's hand is marginal → R/F is preferred over shove
- Raising to 2-2.5x, folding if reshoved

---

## 3. Fake Shove [D#20]

### Concept

A "fake shove" is a **large open raise** (e.g., 5.5-8bb from a 12bb stack) that appears committed but preserves the ability to fold in catastrophic scenarios (two or more opponents reshove).

### When Fake Shove Applies

Only in **ICM** situations (final table, bubble) where:
1. You have 8-15bb
2. Multiple opponents behind can reshove
3. Triple all-in scenario would be disastrous for your tournament equity
4. RP is significant enough that folding the committed amount is still correct

### Example [D#20]
3-handed FT: Hero on BTN with 12bb. SB has 15bb, BB has 17bb (CL).
- Theory shows: **no shove range at all**
- Instead: raise to 8bb, planning to fold if both SB and BB come over the top
- Triple all-in scenario: fold 100% of range (even AA could be a fold due to ICM!)
- But this scenario only occurs ~0.03% of the time

### Fake Shove in Larger FTs [D#20]
8-player FT: Hero in CO with 8bb.
- Raise to 5.5bb
- Fold if 2+ opponents come over the top
- This line protects tournament equity while still stealing blinds profitably

---

## 4. Resteal vs. Chip Leader [D#05]

### Scenario
FT of $22. CL opens from CO. Hero in BB with A4s.

### Analysis Framework
1. Check RP: Hero's RP vs CL = 15.8% (massive)
2. This means Hero needs 15.8% extra equity to get involved
3. With such high RP, range is extremely tight
4. A4s may seem decent but is borderline given the RP

### Key Insight [D#05]
When RP is > 15%, your resteal range shrinks dramatically. Only absolute premiums (AA, KK, AKs) may justify restealing. Even hands like AQs can be folds.

### CL Exploitation
The CL knows medium stacks are constrained. Therefore:
- CL opens wide (sometimes 50-60%+ of hands)
- CL applies maximum pressure knowing medium stacks can't fight back
- Counter: wait for premiums, then get maximum value when you do resteal

---

## 5. Facing All-In at the Final Table [D#02]

### Scenario
4-handed FT, $20 buy-in. Hero has 5.2bb in BB with K9o. CL in SB open-shoves. CO has a smaller stack than Hero.

### Decision Process [D#02]
1. Bubble factor = 1.684 → RP = 18.4%
2. To call profitably: equity > pot odds + 18.4%
3. K9o has decent chipEV equity vs a wide shove range
4. But with 18.4% RP, the hurdle is enormous

### Adjusting for Villain Tendencies
- If CL is very active and aggressive → widen his shove range estimate
- Wider shove range → our equity improves → closer to call threshold
- But even vs 70% shove range, K9o may not meet the 18.4% extra equity requirement
- Generally: fold K9o in this spot. Call only QQ+ / AK-type hands.

---

## 6. BB Defense at Semi-Final Table [D#16]

### ICM Pressure at 7-11 Players
Semi-FT positions (7-11 players remaining) already carry significant ICM weight.

### Example [D#16]
Hero is 7/11, BB vs BTN min-raise.
- RP from bubble factor table: **12.1%**
- This dramatically reduces the defense range
- Suited hands that are standard defends in chipEV become folds
- Only defend with hands that have strong equity vs villain's opening range

### Heuristic
At semi-FT: if RP > 10%, defend only the top portion of your normal range. Fold bottom 30-40% of your chipEV defense range.

---

## 7. Reaction vs. Open Raise at the FT [D-Reação vs OR na FT]

### Position-Specific Adjustments

When facing an open raise at the FT, the reaction range is heavily modified by:
1. **Your stack relative to average**
2. **Villain's stack (and who covers whom)**
3. **Pay jump proximity**
4. **Number of shorter stacks** (if shorter stacks can bust before you, be patient)

### The "Let Others Die" Principle
If there are shorter stacks at the table, you benefit from their elimination (pay jump) without risking your own chips. This creates incentive to:
- Fold marginal hands
- Wait for shorter stacks to bust
- Only play premium hands against larger stacks

---

## 8. All-In at FT in Bounty [D#04]

### Bounty vs. ICM Tension

At bounty FTs, two opposing forces collide:
1. **ICM** says: preserve chips, avoid marginal spots, respect pay jumps
2. **Bounty** says: call wider, hunt eliminations, equity drop is significant

### Decision Rule [D#04]
- Calculate the bounty's equity drop
- Calculate the ICM risk premium
- **Net adjustment** = Risk Premium − Equity Drop
- If net adjustment is small → bounty almost cancels ICM → play closer to chipEV
- If RP >> equity drop → ICM dominates → play tight
- If equity drop >> RP → bounty dominates → play loose

### Example [D#04]
FT of bounty tournament. BTN has $11.41 bounty (initial was $2.50).
- The bounty is 4.5× the initial → very inflated
- Equity drop is large
- Combined with pay jumps, must compare the $ values
- If bounty value > pay jump difference → hunt the bounty

---

## 9. FT Summary Decision Matrix

| Your Stack | Opponent Stack | Action Bias |
|---|---|---|
| CL | Short | Aggress — low RP, hunt bounty if PKO |
| CL | Medium | Aggress — they can't fight back |
| Medium | CL | Extreme caution — highest RP |
| Medium | Medium | Selective — moderate RP both ways |
| Medium | Short | Let them bust — benefit from pay jump |
| Short | Anyone | Shove wide — low RP, nothing to lose |
| Short (FT) | CL + Medium | Consider fake shove to preserve fold equity |
