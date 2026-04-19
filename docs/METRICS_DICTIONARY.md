# Poker Analytics Data Dictionary & Architecture

This document serves as the single source of truth for how the Poker Analytics platform defines, calculates, and surfaces player metrics. All metrics adhere rigorously to these definitions to prevent "dilution" or false-positive leak warnings.

## Overview

The platform uses a 3-layer architecture:
1. **Parser Protocol (`src/parser/`)**: Extracts raw text blocks (Hand Histories, Summaries) into normalized objects (`Hand`, `HeroDecision`, `Tournament`).
2. **Detection Layer (`src/analysis/`)**: Identifies tactical postflop spot triggers (e.g. `sawFlop`, `cbetOpportunity`) by re-playing the action sequence.
3. **Analytics Engine (`src/data/sessions.ts` & `src/analysis/leakDetector.ts`)**: Aggregates boolean triggers into percentage metrics and applies deviation checks against expected `Game Plan` theoretical bounds (GTO Compliance).

---

## Metric Glossary

### Core Aggression Metrics

| Metric | Definition | Formula | Expected Target |
|--------|------------|---------|-----------------|
| **VPIP** | Voluntarily Put Money In Pot. Measures how aggressively a player enters pots preflop. | `(Raises + Calls) / Total Hands` | ~21% - 25% |
| **PFR** | Preflop Raise. The percentage of total hands where the player was the aggressor preflop. | `Preflop Raises / Total Hands` | ~16% - 19% |
| **AF** | Aggression Factor. A ratio measuring the likelihood a player bets/raises vs calls. | `(Total Bets + Raises) / Calls` | 2.5 - 3.5 |
| **3-Bet %** | How often a player re-raises when facing an open raise. | `3-Bets Made / 3-Bet Opportunities` | 7% - 11% |
| **Limp Pct** | How often a player open-limps or over-limps preflop. | `Limps / Total Hands` | < 2% (0% ideally outside HU BTN) |

### Postflop Action Metrics

| Metric | Definition | Formula | Target Notes |
|--------|------------|---------|--------------|
| **C-Bet** | Continuation Bet. Betting the flop as the preflop aggressor. | `Flop Bets / Flop C-Bet Opportunities` | ~60% - 75% |
| **C-Bet HU** | C-Betting strictly against a single villain. | `Flop Bets HU / Flop C-Bet Opps HU` | ~90% - 100% (Game Plan standard) |
| **Double Barrel** | Continuation Betting the turn after C-betting the flop. | `Turn Bets / Turn Betting Opportunities` | High variance, depends on board |

### Showdown Metrics

| Metric | Definition | Formula | Target Notes |
|--------|------------|---------|--------------|
| **WTSD** | Went to Showdown. Frequency of seeing showdown *given that the flop was seen*. | `Hands hitting Showdown / Hands where Flop was Seen` | ~25% - 31% |
| **W$SD** | Won at Showdown. Frequency of winning the pot when showdown is reached. | `Hands Won at Showdown / Hands hitting Showdown` | > 50% |

> [!WARNING]
> **WTSD Calculation Note**
> The platform strictly divides WTSD by `sawFlopHands` (excluding preflop folds). Using `vpipHands` causes severe metric dilution (by including unsuccessful steal attempts that end preflop).

---

## Financial & Volume Accounting

- **Buy-Ins**: Tracks the total `$BuyIn` footprint of tournaments played during a session. Sourced recursively:
  1. Header capture (e.g., parsing `$5 Spin` natively from the hand log).
  2. Summary override (parsing explicit `Buy-In: $5` flags from official textual Summaries).
- **PNL (Profit and Loss)**: Standard gross aggregation: `(Total Prizes) - (Total Buy-Ins + Fees)`.
- **ROI**: Return on investment across a timeframe: `(PNL / Buy-Ins) * 100`.
- **Net Profit**: Computed internally per hand (Hero's chips generated vs invested in that hand) for exact intra-session trend mappings.

---

## Nemesis Engine Rules

The platform isolates villains who do the most damage mathematically during a Session window:

1. **Assassin**: The villain who stacked you and forced your elimination from a tournament. The UI records the amount of chips permanently transitioned from your stack (the knockout blow) to their `net` earnings.
2. **Crusher**: If no elimination occurred, this is the villain who secured the highest pure positive Net Profit against you in a single hand.
3. **Damage Benchmark**: If neither of the above apply, the session identifies the villain who cumulatively sucked the most Net Profit out of you across multiple smaller skirmishes.

---

## Data Collection Best Practices

To ensure maximum fidelity and prevent `$0.00` reads or anomalous statistical dilution:
1. **Always export and upload `.zip` packs** directly from PokerStars or GGPoker. 
2. Ensure **Tournament Summaries** are enabled in your poker client. Hand Histories often contain truncated metadata (like missing Buy-Ins in GGPoker), which the parser securely infers and overrides if a companion Summary file is simultaneously uploaded.
