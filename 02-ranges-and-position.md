# 02 — Ranges and Position

## 1. Range Types

### Linear Range

A range with no gaps — includes the strongest hands down to a cutoff point, in order. [Vol.1]

- No gaps in hand strength
- Typical use: early position opens, short-stack shoves
- Post-flop behavior: bets frequently at small sizings, since medium-strength hands are included

### Polarized Range

A range composed of the strongest hands (top pole) AND the weakest hands (bottom pole), with middle-strength hands removed. [Vol.1]

- Top pole: sets, overpairs, top pair top kicker
- Bottom pole: draws, missed hands used as bluffs
- Post-flop behavior: bets at **large sizings** — strong hands want to extract maximum value, weak hands want maximum fold equity
- Exception: if you have too many bluff combos relative to value, you must give up some bluffs

### Condensed Range

A range composed only of medium-strength hands — top and bottom removed. [Vol.1]

- Contains "bluff-catchers" — hands that beat bluffs but lose to value
- Post-flop behavior: plays defensively, checks to let opponent bluff
- Rarely bets, and when it does, uses small sizings

### Post-Flop Interaction Summary

| Range Type | Bet Frequency | Preferred Sizing | Role |
|---|---|---|---|
| Linear | High | Small (25-33%) | Deny equity broadly |
| Polarized | Selective | Large (66-150%) | Maximize value & fold equity |
| Condensed | Low | Small or check | Bluff-catch, play defense |

---

## 2. Position System (9-max)

Counting from the Button (anti-clockwise): [216R]

| Position | Abbreviation | Notes |
|---|---|---|
| Under the Gun | UTG (EP1) | First to act pre-flop. Tightest range. |
| UTG+1 | UTG+1 (EP2) | Still very tight. |
| Middle Position | MP | Slightly wider than EP. |
| LoJack | LJ | First "middle-late" position. |
| HiJack | HJ | Range starts expanding significantly. |
| Cutoff | CO | Second-best position. Wide range. |
| Button | BTN | Best position. Widest open range. |
| Small Blind | SB | Worst post-flop position (OOP vs everyone). |
| Big Blind | BB | Defends wide due to discount. |

### Why Position Matters

1. **Information advantage**: acting last = seeing opponent's action first
2. **Pot control**: can check behind for free cards
3. **Higher equity realization**: IP ranges realize ~100-120% of crude equity; OOP ranges realize ~70-90%
4. **Range construction**: fewer players behind = wider opening range

---

## 3. RFI (Raise First In) Ranges by Stack Depth

Reference ranges from solver outputs (chipEV). These are **starting points** — adjust based on ICM, opponent profiles, and table dynamics. [216R, Vol.2]

### Approximate RFI % by Position and Stack

| Position | 14bb | 17bb | 20bb | 30bb | 50bb | 100bb |
|---|---|---|---|---|---|---|
| UTG | ~12% (+ 3% shove) | ~14% | ~15% | ~16% | ~17% | ~17% |
| MP | ~14% | ~16% | ~17% | ~18% | ~19% | ~20% |
| LJ | ~17% | ~19% | ~20% | ~22% | ~24% | ~25% |
| HJ | ~22% | ~24% | ~25% | ~27% | ~28.5% | ~30% |
| CO | ~30% | ~32% | ~34% | ~36% | ~40% | ~44% |
| BTN | ~42% | ~45% | ~47% | ~50% | ~54% | ~58% |
| SB | ~35% | ~38% | ~40% | ~44% | ~48% | ~52% |

### Stack Depth and Strategy

| Stack | Key Characteristics |
|---|---|
| **< 10bb** | Push/Fold only. No flat calls. See tables in NERD's Playbook. |
| **14bb** | RFI + some open shove range. Very limited flats. Reaction = all-in or fold. |
| **17bb** | Slight expansion. Still mostly shove-or-fold in reactions. |
| **20bb** | Some flat calling appears. 3-bet sizing = all-in. |
| **25bb** | Flat calls in good positions. 3-bet size = 2.5x IP / 2.75-3x OOP. |
| **30bb** | Standard tournament stack. Full 3-bet/flat/fold strategy. |
| **50bb** | Deep. 3-bet size = 3-3.25x IP / 3.5-3.75x OOP. Protect flat ranges. |
| **100bb** | Very deep. 3-bet size = 3.5-4x IP / 4.5-5x OOP. Strong need for range protection. |

---

## 4. Open Shove Ranges (10bb, chipEV)

At 10bb, the strategy is simplified to all-in or fold. [Vol.2, NERD]

### Approximate Open Shove % by Position (10bb)

| Position | Shove % | Key Hands |
|---|---|---|
| UTG | ~16% | Pairs 22+, A2s+, A7o+, KTs+, KQo |
| MP | ~20% | Adds: A5o+, K9s+, QTs+ |
| LJ | ~24% | Adds: A3o+, K8s+, Q9s+, JTs |
| HJ | ~28% | Adds: A2o+, K6s+, Q8s+, J9s+ |
| CO | ~36% | Adds: K2s+, K9o+, Q5s+, J8s+, T8s+ |
| BTN | ~48% | Very wide: K-any suited, Q-most, most connectors |
| SB | ~69% | Extremely wide. Theory says push nearly ATC vs BB. |

### Call vs. All-In Heuristics

- When facing an all-in, your calling range is approximately **2/3 of the shover's range** [Vol.2]
- If shover is tighter than theory → tighten your calling range proportionally
- If shover is looser than theory → widen calling range proportionally

### Adaptation Example (SB vs BB, 10bb) [Vol.2]

| Villain's Shove Range | Hero's Call Range |
|---|---|
| 69% (theory) | 51% |
| 60% (tight) | 43% |
| 50% (very tight) | 35% |
| 75% (loose) | 54% |

---

## 5. Flat and 3-Bet Construction Principles

### Why We Mix (Deep Stacks)

At 100bb, hands like KK may play both call and 3-bet. This is because: [Vol.2]
1. **Range protection**: if all strong hands go to 3-bet, the flat range becomes exploitably weak
2. **Squeeze defense**: a capped flat range gets crushed by squeezes from blinds
3. **Board coverage**: flat range needs strong hands to compete on all flop textures

### Key Principle by Stack Depth

| Stack | Flat Frequency | 3-bet Composition |
|---|---|---|
| 100bb | High — many mixed strategies | Polarized: premiums + suited bluffs (A5s-A2s, suited connectors) |
| 50bb | Moderate | More linear, less mixing |
| 25bb | Low — 3-bet or fold dominates | Linear: best hands go all-in |
| 15bb | Zero flat | All-in or fold only |

### 3-Bet Sizing Reference Table [Vol.2]

| Stack | In Position | Out of Position |
|---|---|---|
| 15bb | All-in | All-in |
| 25bb | 2.5× | 2.75-3× |
| 50bb | 3-3.25× | 3.5-3.75× |
| 100bb | 3.5-4× | 4.5-5× |

The multiplier is applied to the **open raise size** (not the pot).

---

## 6. The Army Analogy (Yuri "theNERDguy")

Think of ranges as armies and community cards as the battlefield: [Vol.1]

- **Stronger army** (tighter range on favorable board) → attacks aggressively at high frequency
- **Weaker army** (wider range on unfavorable board) → defends strategically, picks spots
- **Range advantage** = having more equity on a given board → higher betting frequency
- **Nuts advantage** = having more possible strong hands (sets, straights, flushes) → justifies larger sizings

The initiative always starts from the stronger range.
