# Poker Hand Analyzer — scorza23

## Project Overview

Web app for analyzing PokerStars tournament hand histories. Custom GTO Wizard / Hand2Note replacement, tailored to STT and MTT formats. Compares player decisions against pre-computed theoretical ranges (Comunidade Reg Life game plan), tracks leaks over time, and provides session-over-session progress reports.

**Stack:** React (Vite) + TypeScript + Tailwind CSS. All client-side, no backend. Data persisted in IndexedDB (via Dexie.js).

**Core principle:** This app does NOT solve GTO in real time. It compares hero's decisions against pre-defined theoretical ranges and computes statistics. The theoretical ranges are defined below and come from the Reg Life coaching program.

**Hero name:** `scorza23` (PokerStars screen name). The app should be configurable for other player names in the future but defaults to this.

---

## Core Features

### 1. Upload & Parsing
- Drag-and-drop or button upload of `.txt` files (PokerStars hand history format)
- Robust parser that handles all PokerStars formatting quirks
- Automatic deduplication by Hand ID (same hand never imported twice)
- Multi-file upload support
- Auto-detect tournament, format (3-max through 9-max), date, blinds, antes, stacks

### 2. Dashboard
- Total hands, tournaments, sessions, date range
- Aggregate stats: VPIP, PFR, C-bet (total / HU / multiway), WTSD, WonSD, AF, 3-bet%, limps
- Range compliance % (overall and by position)
- Trend chart (line graph) showing stat evolution across sessions
- Active leak alerts (metrics outside target range, color-coded by severity)

### 3. Hand Explorer
- Full hand list with advanced filters:
  - Date range / session
  - Tournament ID
  - Position (UTG, UTG+1, MP, HJ, CO, BTN, SB, BB)
  - Action taken (fold, raise, call, 3-bet, all-in)
  - Result (won/lost, went to showdown or not)
  - Hand category (pairs, broadways, suited connectors, etc.)
  - Preflop scenario (RFI, facing raise, facing limp, blind war, facing all-in)
  - Deviation type (in-range, out-of-range, overfold, cold-call, etc.)
  - Table size (2-9 players)
  - Stack depth (deep >40bb, medium 20-40bb, short <20bb)
- Individual hand view: street-by-street replay showing board, actions, pot size, stack sizes
- Auto-flagged errors with explanation
- Manual notes per hand

### 4. Range Compliance
- 13x13 grid visualization (GTO Wizard style) per position
- Color coding: green = played correctly, red = deviation, gray = hand not dealt
- Compliance % breakdown by position, session, scenario
- Detailed deviation list showing full context (action before hero, stack sizes, tournament stage)

### 5. Leak Analyzer
- Automatic leak detection with temporal tracking:
  - Limping (any limp except SB limp behind a limper)
  - Low C-bet frequency (< 80% HU as PFR)
  - High WTSD (> 35%)
  - Overfolding by position (compliance < 85%)
  - BB folding suited hands vs normal open raises
  - Cold-calling (should be 3-bet or fold from non-BTN/BB positions)
  - Opening outside theoretical range
  - Missed c-bets (HU as PFR, checked flop)
- Per leak: severity rating, frequency, estimated cost in bb, trend (improving/worsening)
- Leak history chart showing evolution across sessions

### 6. Session Manager
- Auto-group hands into sessions by time window (configurable, default: 4-hour gap)
- Session-over-session comparison table + charts
- Export session report

---

## PokerStars Hand History Format

### Structure

Each hand follows this pattern, separated by 2+ blank lines:

```
PokerStars Hand #260356646368: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:16:05 UTC [2026/04/05 14:16:05 ET]
Table '3989541132 1' 9-max Seat #1 is the button
Seat 1: player1 (1500 in chips)
Seat 2: player2 (1500 in chips)
...
player1: posts the ante 3
player2: posts small blind 10
player3: posts big blind 20
*** HOLE CARDS ***
Dealt to scorza23 [Kc 5h]
player4: folds
scorza23: raises 20 to 40
...
*** FLOP *** [6d 2s Qh]
...
*** TURN *** [6d 2s Qh] [Th]
...
*** RIVER *** [6d 2s Qh Th] [Jc]
...
*** SHOW DOWN ***
player1: shows [Ts Td] (three of a kind, Tens)
...
*** SUMMARY ***
Total pot 3268 | Rake 0
Board [6d 2s Qh Th Jc]
Seat 1: player1 (button) showed [Kd As] and won (3268)
...
```

### Parsing Rules

| Field | Regex / Method |
|---|---|
| Hand ID | `Hand #(\d+)` |
| Tournament ID | `Tournament #(\d+)` |
| Buy-in + fee | `\$(\d+\.\d+)\+\$(\d+\.\d+)` |
| Level / Blinds | `Level [IVXL]+ \((\d+)/(\d+)\)` |
| Date | UTC timestamp on first line |
| Table format | `(\d+)-max` |
| Button seat | `Seat #(\d+) is the button` |
| Active seats | `Seat (\d+): (\S+) \((\d+) in chips\)` |
| Antes | `posts the ante (\d+)` |
| Blinds | `posts small blind (\d+)` / `posts big blind (\d+)` |
| Hero cards | `Dealt to scorza23 \[([^\]]+)\]` |
| Actions | Lines matching `playerName: action` (folds, raises X to Y, calls X, checks, bets X) |
| All-in | Action line contains `and is all-in` |
| Board | `\*\*\* FLOP \*\*\* \[([^\]]+)\]`, similarly for TURN and RIVER |
| Showdown | In SUMMARY section: `showed`, `mucked`, `folded` |
| Tournament finish | `scorza23 finished the tournament in (\d+)\w+ place` |
| Prize | `received \$([0-9.]+)` |
| Win | `wins the tournament` |

**Hands are separated by 2+ consecutive blank lines.**

### Position Mapping

Position is determined by the button seat and active seats. Order clockwise from button:

| Players | Positions (from BTN clockwise) |
|---|---|
| 9 | BTN, SB, BB, UTG, UTG+1, MP1, MP2, HJ, CO |
| 8 | BTN, SB, BB, UTG, UTG+1, MP, HJ, CO |
| 7 | BTN, SB, BB, UTG, MP, HJ, CO |
| 6 | BTN, SB, BB, UTG, HJ, CO |
| 5 | BTN, SB, BB, UTG, CO |
| 4 | BTN, SB, BB, CO |
| 3 | BTN, SB, BB |
| 2 (HU) | BTN/SB, BB |

**HU note:** In heads-up, the button IS the small blind. BTN/SB acts first preflop and last postflop.

### Canonical Hand Representation

Convert two cards to canonical form:
- `AhKh` -> `AKs` (suited: same suit)
- `AhKd` -> `AKo` (offsuit: different suits)
- `JsJd` -> `JJ` (pair: same rank)
- Always higher rank first: `5h Ah` -> `A5s`, never `5As`

Rank order: `2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < T < J < Q < K < A`

---

## Theoretical Ranges (Reg Life Game Plan)

These are the RFI (Raise First In) ranges for early game in SNG/MTT. They apply when it is folded to hero (no one has raised or limped before).

### UTG (opens ~13.1%)
Pairs: AA-66
Suited: AKs-ATs, A5s-A3s, KQs-KTs, QJs-QTs, JTs
Offsuit: AKo-AJo, KQo

### UTG+1 (opens ~14.7%)
= UTG + A2s

### MP1 (opens ~17.2%)
= UTG+1 + A8s, K9s

### MP2 (opens ~18.4%)
= MP1 + A7s, A6s, K8s, Q9s, J9s, T9s, 98s, 87s, 76s, 65s, 54s, ATo

### HJ (opens ~24.7%)
= MP2 + A2s, K7s-K5s, Q8s, J8s, T8s, 55-22, KJo-KTo, QJo

### CO (opens ~36.6%)
= HJ + K4s-K2s, Q7s-Q5s, J7s-J6s, T7s, 97s-96s, 86s, 75s, 64s, 53s, 43s, A9o-A4o, K9o, QTo, JTo

### BTN (opens ~51.1%)
= CO + Q4s-Q2s, J5s-J2s, T6s-T4s, 95s-92s, 85s-82s, 74s-72s, 63s-62s, 52s, 42s, 32s, A3o-A2o, K8o-K3o, Q9o-Q5o, J9o-J7o, T9o-T7o, 98o-97o, 87o-86o, 76o-75o, 65o-64o, 54o

### SB Raise (Blind War — folded to SB vs BB only)
= BTN + K2o, Q4o-Q2o, J6o-J4o, T6o-T5o, 96o-95o, 85o, 74o, 63o, 53o-52o, 43o-42o, 32o
SB plays entire range as RAISE (no limp from SB in the game plan). Sizes: 3.5x (30bb+), 3x (20-30bb), 2.25x (10-20bb).

### BB Defense vs Open Raise
**Simplified rule: NEVER fold suited hands from BB vs a normal open raise (2-3x).**
Exceptions where folding suited IS acceptable:
- Villain shoved all-in (not a normal raise)
- Villain's raise is very large (5x+ or overbet)
- Extreme ICM pressure (ITM bubble with short stack, semi-final table, final table with significant pay jumps)

### Open Raise Sizes
- 75bb+: 3bb
- 40-75bb: 2.5bb
- 40bb or less: 2bb

### 3-bet Sizes
- 30bb+: 3x IP / 3.5x OOP
- 20-30bb: 2.7x IP / 3.2x OOP
- 17-20bb: 2.5x IP / 3x OOP
- 0-17bb: All-in

---

## Preflop Scenario Classification

**CRITICAL:** Before checking range compliance, the app MUST classify what happened BEFORE hero's action. This prevents false "overfold" flags when hero correctly folded facing a raise.

| Scenario | Condition | Correct Response |
|---|---|---|
| `RFI` | Folded to hero (not in blinds) | Raise if in range, fold if not |
| `BLIND_WAR` | Folded to SB (hero is SB, only BB left) | Raise if in SB range, fold if not |
| `HU_BTN` | Heads-up, hero is BTN/SB | With 10bb+: play 100% of hands (never fold). Include LIMP in strategy. |
| `FACING_RAISE` | Someone raised before hero (not all-in) | From non-BTN, non-BB positions: 3-bet or fold only (no cold-call). Exception: small pairs (66-) can call when deep-stacked (40bb+). BTN and BB may call. |
| `FACING_ALL_IN` | Someone went all-in before hero | Decision based on pot odds, hand strength, and ICM. NOT subject to "no cold-call" rule. |
| `FACING_LIMP` | Someone limped, no one raised | Punish with raise using the limper's position range. Never limp behind (except SB may limp behind). |
| `BB_VS_RAISE` | Hero in BB, facing normal open raise (2-3x) | Defend wide. Never fold suited hands. |
| `BB_VS_LARGE_RAISE` | Hero in BB, facing raise 5x+ or all-in | Standard decision — folding suited is acceptable |
| `BB_VS_LIMP` | Hero in BB, SB limped | Raise wide. 40bb+: raise 100% for 3.5x. 25-40bb: polarized raise + check mid-range. 10-20bb: polarized raise 3x, shove medium hands (Ax, low pairs). |
| `WALK` | BB, everyone folded | N/A (no decision) |

### How to detect FACING_ALL_IN vs FACING_RAISE
Check if the raise action line contains `and is all-in`. If yes -> `FACING_ALL_IN`. If not -> `FACING_RAISE`. Also check if raise size relative to BB is >= 5x for `BB_VS_LARGE_RAISE`.

### Range Compliance Scope
Compliance is computed ONLY for scenarios with a clear "correct" answer:
- `RFI` -> check against position's RFI range
- `BLIND_WAR` -> check against SB raise range
- `HU_BTN` (10bb+) -> fold is always wrong
- `FACING_RAISE` from non-BTN/BB -> cold-call is a deviation
- `BB_VS_RAISE` (normal size) -> fold suited is a deviation

Scenarios EXCLUDED from compliance (no binary correct answer):
- `FACING_ALL_IN` (depends on pot odds, ICM, stack dynamics)
- `BB_VS_LARGE_RAISE` (facing 5x+ or all-in)
- Extreme ICM spots (ITM bubble as short stack, final table with large pay jumps)

---

## Short Stack Strategy (10bb or less)

When stack drops to 10bb or below, strategy simplifies to **all-in or fold**. No raise/fold, no postflop play. This is the Push/Fold strategy.

Push ranges at 10bb are wider than RFI ranges. Approximate simplified push ranges:

- **UTG**: AA-66, AKs-ATs, KQs-KTs, QJs, JTs, AKo-AJo, KQo
- **MP**: UTG + 55, A9s, K9s, QTs, T9s, ATo, KJo
- **CO**: Much wider — all pairs, all aces suited, most kings suited, all broadways, suited connectors, A9o-A2o, KTo+, QTo+, JTo
- **BTN**: Very wide — nearly all pairs, all aces, most kings, most queens, suited connectors, many offsuit broadways
- **SB (vs BB)**: Extremely wide — at 12bb or below can push close to 100% of hands in many ICM scenarios

### Resteal Ranges (facing late position open with 20bb or less)
When villain opens from CO or BTN and hero is in BTN, SB, or BB with 20bb or less:
**SHOVE (resteal)**: all pairs, all suited broadways, all suited aces.

---

## ICM Concepts

ICM (Independent Chip Model) calculates the monetary value of tournament chip stacks based on prize structure. Key concepts:

### Risk Premium
Extra equity needed beyond pot odds to justify calling/playing due to tournament prize structure. The chips you WIN are worth less than the chips you LOSE.
- **Early game**: Risk premium ~2-3%, minimal impact on ranges
- **ITM bubble**: Risk premium 10-15%+, massive range tightening
- **Final table**: Risk premium varies by stack, 5-20%+
- **Semi-final table**: Similar to bubble, ranges get very tight

### Risk Advantage
When a player has a significantly larger stack, they have lower risk premium. The bigger stack can:
- Open wider and apply more pressure
- Force shorter stacks to tighten ranges significantly
- On the bubble, chip leader can open extremely wide while medium stacks must fold most hands

### Practical Impact on BB Defense
In high-ICM spots (semi-FT, FT, bubble), BB may need to fold 50%+ of hands vs open raise, including many suited hands. The rule "never fold suited from BB" applies primarily to early-game and mid-game situations with low risk premium.

**For now, the app flags ICM-sensitive spots (based on tournament stage if detectable) but does NOT adjust ranges automatically.**

---

## Postflop Analysis

### C-bet Rules (from game plan)
1. **IP as PFR vs BB (HU on flop): C-bet 100% of hands with 33% pot sizing.** NO checking. This applies to ALL boards, ALL hands. This is the single most important postflop rule.
2. **Multiway pots**: Be selective. C-bet with value hands and strong draws only.
3. **OOP as PFR**: C-bet value hands. Check on boards unfavorable to your range.

### Double Barrel (Turn)
- IP: If the turn card favors the raiser's range (overcards, high cards), bet 66% pot.
- Good barrel cards: Flop 942 turn K. Flop J54 turn Q. Any overcard that connects with IP range but not BB range.

### Bet vs Missed C-bet
When villain opened (e.g., from CO), hero called from BTN, blinds fold, flop goes check by villain (missed c-bet):
- **Hero bets 100% of range at 33% pot.** This is a mandatory exploit.

### Probe Turn (from BB)
When villain opened, hero called from BB, flop goes check-check, turn favors BB's range:
- **BB can bet entire range at 66% pot.**
- Best turns for probe: cards that complete straights, pair the board, or create two-pairs for BB's wide range.
- Example: Flop 9-5-6, Turn 7 -> BB bets range.

### Donk Bet Turn (from BB)
After calling a c-bet on the flop, if the turn card strongly favors BB's range:
- BB can lead (donk bet) with a polarized range: value (two-pair+, sets) and bluffs (flush draws, OESDs with blockers).
- If villain overfolds (folds > 26% vs 50% sizing), BB can expand donk range significantly — potentially betting entire range.

### Nuts Advantage Concept
When one player's range has significantly more nut hands (90%+ equity):
- Player WITHOUT nuts advantage should use small bet sizes (20-25% pot) at high frequency
- Classic example: Paired boards (7-7-3) where BB has all 7x combos -> IP bets small with ~100% frequency
- Boards with double pairs, trips on board -> small sizing

### Bet Sizing Theory
- **Range advantage + nuts advantage -> large bet (66-100% pot)**: e.g., UTG vs BB on K-Q-J board
- **Range advantage but NOT nuts advantage -> small bet (20-33% pot)**: e.g., UTG vs BB on 7-7-3 board
- **No range advantage -> check or small bet selectively**

---

## Heads-Up Strategy

HU play is unique because BTN is also SB.

### BTN/SB Play (10bb+)
- **VPIP: ~100%.** Never fold from BTN in HU (with 10bb+).
- **Strategy includes LIMP.** Unlike all other positions, limping is part of optimal HU strategy from BTN.
- Raise frequently. Always consider limp as an option.
- When IP postflop, continue with 100% c-bet strategy on flop.

### BB Play in HU
- When BTN limps: Raise aggressively. 40bb+: raise 100% of hands at 3.5x. 25-40bb: polarized raise (best + worst hands), check medium. 10-20bb: polarized raise 3x, shove medium hands.
- When BTN raises: Defend very wide. 3-bet or call with strong range.

---

## Metrics & Targets

| Metric | Formula | Target | Priority |
|---|---|---|---|
| VPIP | Hands with voluntary money in / total | 20-30% | Medium |
| PFR | Hands with preflop raise / total | 15-23% | Medium |
| 3-bet% | 3-bets / 3-bet opportunities | - | Low |
| Limps | Preflop calls with no prior raise (excl BB) | 0 | High |
| C-bet Total | C-bets / c-bet opportunities | 60-70% | High |
| C-bet HU | C-bets in HU pots / HU c-bet opportunities | 100% | Critical |
| Double Barrel | Turn bets after c-bet / opportunities | 60%+ | Medium |
| WTSD | Showdowns / hands with VPIP | 25-35% | High |
| Won at SD | Showdown wins / showdowns | 50%+ | Medium |
| AF | (bets + raises) / calls | 2-3 | Low |
| Range Compliance | In-range decisions / total preflop decisions | 90%+ | High |

---

## Data Model

```typescript
interface Hand {
  id: string;              // PokerStars hand ID
  tournamentId: string;
  date: Date;
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  maxSeats: number;
  activePlayers: number;
  buttonSeat: number;
  boardFlop: string[] | null;
  boardTurn: string | null;
  boardRiver: string | null;
  totalPot: number;
  rake: number;
}

interface PlayerInHand {
  handId: string;
  seatNumber: number;
  playerName: string;
  chipsBefore: number;
  position: Position;
  isHero: boolean;
  holeCards: [string, string] | null;
}

interface Action {
  handId: string;
  street: 'preflop' | 'flop' | 'turn' | 'river';
  playerName: string;
  actionType: 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'post_sb' | 'post_bb' | 'post_ante';
  amount: number | null;
  isAllIn: boolean;
  sequence: number;
}

interface Tournament {
  id: string;
  buyIn: number;
  fee: number;
  format: string;
  finishPosition: number | null;
  prize: number | null;
  handsPlayed: number;
}

interface Session {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  tournamentIds: string[];
  totalHands: number;
  stats: SessionStats;
}

interface HeroDecision {
  handId: string;
  position: Position;
  handKey: string;
  stackBb: number;
  scenario: Scenario;
  action: 'fold' | 'raise' | 'call' | 'check';
  isCompliant: boolean;
  deviationType: DeviationType | null;
  sawFlop: boolean;
  wasPreFlopRaiser: boolean;
  cbetOpportunity: boolean;
  cbetMade: boolean;
  cbetHU: boolean;
  doubleBarrelOpportunity: boolean;
  doubleBarrelMade: boolean;
  wentToShowdown: boolean;
  wonAtShowdown: boolean;
  wonAmount: number;
}

type Position = 'UTG' | 'UTG+1' | 'MP1' | 'MP' | 'MP2' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB' | 'BTN/SB';
type Scenario = 'RFI' | 'BLIND_WAR' | 'HU_BTN' | 'FACING_RAISE' | 'FACING_ALL_IN' | 'FACING_LIMP' | 'BB_VS_RAISE' | 'BB_VS_LARGE_RAISE' | 'BB_VS_LIMP' | 'WALK';
type DeviationType = 'OVERFOLD' | 'OPENED_OUT_OF_RANGE' | 'LIMPED' | 'SB_OVERFOLD' | 'SB_LIMPED' | 'SB_OUT_OF_RANGE' | 'COLD_CALL' | 'BB_FOLD_SUITED' | 'SB_COLD_CALL' | 'FOLD_VS_LIMP' | 'LIMP_BEHIND' | 'HU_BTN_FOLD';
```

---

## UI/UX

### Design Direction
- **Theme:** Dark mode poker HUD aesthetic. Background #0a0a0f, accents in green (#00ff88) and red (#ff4444). Neutral tones in blue-gray.
- **Typography:** Monospace for data/numbers (JetBrains Mono or Fira Code). Clean sans-serif for labels (DM Sans, Geist, or Outfit).
- **Card rendering:** Suit colors: spades white, hearts red, diamonds blue, clubs green. Cards styled as mini playing cards.
- **Range grid (13x13):** Clickable cells with tooltip. Pairs on diagonal. Suited above diagonal, offsuit below. Color intensity by frequency/compliance.
- **Charts:** Recharts. Line chart for stat evolution. Bar chart for session comparisons.
- **Language:** UI text in Portuguese (Brazilian). Code in English.

### Layout
```
Sidebar (left nav) | Main content area
- Dashboard        | Header with global filters
- Maos (Hands)     | Page content
- Estatisticas     |
- Ranges           |
- Leaks            |
- Sessoes          |
- Upload           |
- Config           |
```

---

## Project Structure

```
poker-analyzer/
├── CLAUDE.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   ├── hand.ts
│   │   ├── analysis.ts
│   │   └── ranges.ts
│   ├── parser/
│   │   ├── pokerstars.ts
│   │   ├── position.ts
│   │   └── handKey.ts
│   ├── analysis/
│   │   ├── rangeChecker.ts
│   │   ├── scenarioDetector.ts   # CRITICAL: checks action before hero
│   │   ├── statsCalculator.ts
│   │   ├── leakDetector.ts
│   │   └── postflopAnalyzer.ts
│   ├── data/
│   │   ├── ranges.ts             # All theoretical range definitions
│   │   ├── store.ts              # IndexedDB via Dexie.js
│   │   └── sessions.ts
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── hands/
│   │   ├── ranges/
│   │   ├── stats/
│   │   ├── leaks/
│   │   ├── sessions/
│   │   ├── upload/
│   │   └── shared/
│   │       ├── Card.tsx
│   │       ├── Board.tsx
│   │       ├── RangeGrid.tsx
│   │       └── StatCard.tsx
│   └── pages/
```

---

## Code Guidelines

- TypeScript strict mode
- Functional React components with hooks
- Zustand for state management
- Dexie.js for IndexedDB
- No external API calls — everything client-side
- Unit tests for parser and analysis (Vitest)
- Clean code, self-documenting names
- Variable names in English, UI strings in Portuguese (BR)

---

## Implementation Priorities

### Phase 1 — MVP
1. PokerStars parser
2. File upload (drag-and-drop, multi-file)
3. Hand explorer with basic filters
4. Basic stats (VPIP, PFR, C-bet, WTSD)
5. Range compliance by position with 13x13 grid

### Phase 2 — Analysis
6. Leak detector with severity ratings
7. Session manager and comparison
8. Trend charts
9. Postflop analysis (missed c-bets, double barrels)

### Phase 3 — Polish
10. Hand replay (visual)
11. Advanced filters (stack depth, ICM sensitivity)
12. Report export
13. Customizable ranges
14. Short stack push/fold checker

---

## Known Bugs to Avoid

1. **False overfolds:** NEVER flag a fold as "overfold" if someone raised before hero. The scenario detector MUST check all actions before hero's first action.
2. **BB fold suited false positives:** Distinguish between facing a normal 2-3x open (fold suited = error) vs facing all-in or 5x+ raise (fold suited = acceptable).
3. **HU position:** In heads-up, BTN = SB. Don't create separate BTN and SB entries for HU hands.
4. **Position mapping with eliminated players:** Seats are not contiguous. Use the ordered list of active seats, not raw seat numbers.
5. **Same hand in multiple files:** PokerStars sometimes outputs the same hand in multiple files. Deduplicate by Hand ID.
6. **Encoding:** PokerStars files use UTF-8 with BOM. Parse with `utf-8-sig` encoding.

---

## Recommended Libraries & Open-Source Tools

When building this project, evaluate and use these existing libraries instead of reinventing the wheel. Prefer well-maintained TypeScript/JavaScript packages since this is a client-side React app. Python tools are listed as references for algorithm validation or potential WASM compilation.

### Hand History Parsing

| Library | Language | Notes |
|---|---|---|
| **`@poker-apprentice/hand-history-parser`** | TypeScript | **Primary recommendation.** Parses PokerStars (and others) using ANTLR grammar. Returns structured `HandHistory` objects. Well-typed, actively maintained. npm: `@poker-apprentice/hand-history-parser` |
| **`@poker-apprentice/hand-history-analyzer`** | TypeScript | Companion to the parser above. Computes player stats (VPIP, PFR, etc.) from parsed hands. npm: `@poker-apprentice/hand-history-analyzer` |
| `hhp` (thlorenz) | JavaScript | Parses PokerStars, Ignition, PartyPoker, Pacific. Autodetects site. Older but battle-tested. GitHub: `thlorenz/hhp` |
| `hand-history-parser` (npm) | JavaScript | Simple PokerStars-only parser. USD only. Lightweight alternative. |
| `Poker-Game-Analyzer` | Python | Full PokerStars analyzer with Dash web UI, SQLite storage, session review, EV calculations. Good architecture reference. GitHub: `96jsalinas/Poker-Game-Analyzer` |
| `Poker-Hand-Tracker` | Python | Tournament/SNG tracker for ACR (portable to PokerStars). CLI-based, SQLite storage. GitHub: `michaelcukier/Poker-Hand-Tracker` |
| `pokerkit` | Python | University of Toronto research library. Parses PokerStars format, has ICM calculator (`calculate_icm`), hand evaluator. 99% test coverage. Academic-grade. pip: `pokerkit`. GitHub: `uoftcprg/pokerkit` |

**Recommendation:** Start with `@poker-apprentice/hand-history-parser` + `hand-history-analyzer` as the primary parsing stack. If they don't handle a PokerStars edge case, fall back to a custom regex parser (which we already have working Python code for from the coaching sessions). The custom parser can be ported to TypeScript using the same regex patterns documented in this CLAUDE.md.

### Hand Evaluation

| Library | Language | Notes |
|---|---|---|
| **`poker-evaluator`** | TypeScript | Two Plus Two algorithm. Evaluates 3/5/6/7-card hands. Includes odds calculator. ~22M hands/sec. npm: `poker-evaluator` |
| **`pokersolver`** | JavaScript | Hand solver + comparison. Supports Hold'em, Omaha, Stud, and more. Used in production (CasinoRPG). 15 dependents. GitHub: `goldfire/pokersolver` |
| `phe` (thlorenz) | JavaScript | Fast poker hand evaluator. npm: `phe` |

**Recommendation:** Use `pokersolver` for hand strength comparison in the Hand Replay view (showing who won and why). Use `poker-evaluator` if we need equity calculations in the future.

### Equity & Odds Calculation

| Library | Language | Notes |
|---|---|---|
| **`poker-odds-calculator`** | TypeScript | Pre-flop and post-flop equity for Hold'em and Short-Deck. CLI + programmatic API. Supports range notation (e.g., `QQ+`, `AKs`). npm: `poker-odds-calculator` |
| `pec` (thlorenz) | JavaScript | Compares two combos or combo vs range for equity. GitHub: `thlorenz/pec` |
| `poker-master-tool` | Node.js + C++ | Uses Two Plus Two evaluator with C++ addon for speed. Full web UI. GitHub: `bartoszputek/poker-master-tool` |

**Recommendation:** `poker-odds-calculator` is the best fit — TypeScript, supports range syntax, and can calculate equity programmatically. Useful for Phase 3 (showing equity in hand replay, or evaluating if a call was +EV).

### Range Visualization

| Library | Language | Notes |
|---|---|---|
| **`@holdem-poker-tools/hand-matrix`** | React | **Primary recommendation.** Ready-made React component for 13×13 range grid. Customizable cell colors, subtexts, click handlers. npm: `@holdem-poker-tools/hand-matrix` |
| `react-poker-range` | React | Simple range display component. GitHub: `bcaccinolo/react-poker-range` |
| `PokerHandRangeCalc` | React + Redux | Full range calculator with equity display. Good reference for UI patterns. GitHub: `forestturner/PokerHandRangeCalc` |
| `range-viewer` | React | Web-based range visualizer. GitHub: `lhbrennan/range-viewer` |

**Recommendation:** Use `@holdem-poker-tools/hand-matrix` as the base for the Range Compliance page. It provides the 13×13 grid with `comboStyle` callback — perfect for coloring cells based on compliance (green/red/gray). Customize the styling to match our dark theme.

### Card & Table Visualization

| Library | Language | Notes |
|---|---|---|
| **`react-poker`** | React | Animated card dealing component. Board display with motion animations. npm: `react-poker` |

**Recommendation:** Use `react-poker` for the Hand Replay view if animated dealing is desired. Otherwise, build a simple custom `Card` component with SVG/CSS — it's only ~50 lines of code for a clean card display.

### ICM Calculation

| Library | Language | Notes |
|---|---|---|
| `pokerkit` (calculate_icm) | Python | Built-in ICM function in the PokerKit library. Academic-grade, validated. |
| `poker-mtt-icm` | Python | MTT ICM estimation using Monte Carlo simulation. Handles large fields (100+ players). GitHub: `apcode/poker-mtt-icm` |
| `SimpleICM` | Python | Minimal ICM equity calculator. Good reference implementation. GitHub: `aidanf/SimpleICM` |

**Recommendation:** ICM is a Phase 3+ feature. When implementing, port the `SimpleICM` algorithm to TypeScript (it's ~50 lines of Python). For MTT ICM with large fields, use the Monte Carlo approach from `poker-mtt-icm`.

### Data Persistence

| Library | Language | Notes |
|---|---|---|
| **`dexie`** | TypeScript | IndexedDB wrapper. Reactive queries, easy schema definition, migration support. npm: `dexie` |
| `idb` | TypeScript | Minimal IndexedDB wrapper (~1KB). Lower-level than Dexie. npm: `idb` |
| `sql.js` | JavaScript | SQLite compiled to WASM. Full SQL support in the browser. npm: `sql.js` |

**Recommendation:** Use `dexie` for IndexedDB. It's the most ergonomic option for React apps — supports reactive queries (via `useLiveQuery` hook), handles schema versioning, and has excellent TypeScript support. If complex SQL queries are needed later (e.g., "show me all hands where I 3-bet from CO facing UTG open with stack < 20bb"), consider migrating to `sql.js`.

### Charts & Data Visualization

| Library | Language | Notes |
|---|---|---|
| **`recharts`** | React | Declarative charting. Line, Bar, Area, Pie charts. Responsive. Most popular React chart library. npm: `recharts` |
| `@tremor/react` | React | Dashboard-oriented chart components. Built on Recharts. Beautiful defaults. npm: `@tremor/react` |

**Recommendation:** Use `recharts` directly for maximum control over styling (dark theme). If you want faster dashboard prototyping, `@tremor/react` provides pre-built stat cards and charts that look professional out of the box.

### Suggested `package.json` Dependencies

```json
{
  "dependencies": {
    "@holdem-poker-tools/hand-matrix": "latest",
    "@poker-apprentice/hand-history-parser": "latest",
    "@poker-apprentice/hand-history-analyzer": "latest",
    "dexie": "^4",
    "dexie-react-hooks": "latest",
    "poker-odds-calculator": "latest",
    "pokersolver": "latest",
    "react": "^19",
    "react-dom": "^19",
    "react-router-dom": "^7",
    "recharts": "^2",
    "zustand": "^5",
    "lucide-react": "latest",
    "tailwindcss": "^4",
    "clsx": "latest",
    "date-fns": "^4"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "vite": "^6",
    "@vitejs/plugin-react": "latest",
    "vitest": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest"
  }
}
```

### Integration Strategy

**Phase 1 (MVP):** Try `@poker-apprentice/hand-history-parser` first. If it handles PokerStars tournament HH correctly (including antes, bounties, multi-table moves), use it. If not, build a custom parser using the regex patterns from this CLAUDE.md — they're already validated against 900+ real hands. Use `@holdem-poker-tools/hand-matrix` for the range grid. Use `dexie` for storage. Use `recharts` for charts.

**Phase 2 (Analysis):** Add `poker-odds-calculator` for equity display in hand review. Use `pokersolver` to show hand rankings in the hand replay view.

**Phase 3 (Polish):** Port ICM calculation from `SimpleICM` to TypeScript. Add `react-poker` for animated hand replays if desired.

**Important note on `@poker-apprentice/hand-history-parser`:** This library uses ANTLR for parsing, which adds bundle size. If bundle size is a concern for a client-side app, the custom regex parser (which is simpler and faster for PokerStars-only support) may be preferable. Test both approaches.
