# Poker Hand Analyzer

## ⚠️ Active Coordination & Protocols

All agent coordination, task execution, and handoff formatting must strictly follow:
*   [TASK_PROTOCOL.md](./docs/agents/TASK_PROTOCOL.md) (Task claiming and workspace checks).
*   [HANDOFF_PROTOCOL.md](./docs/agents/HANDOFF_PROTOCOL.md) (Handoff templates and manual checks).

## ⚠️ Before trusting this doc

This file has historically drifted from the actual code. **Before relying on
a claim here, verify it against source.** High-signal sections were audited and
corrected on 2026-05-31, but this file is still an intent/spec guide. Source
code, tests, and `docs/product/STATUS.md` win when there is any disagreement.
If you spot a new mismatch, update this file in the same PR as the code
change; see `docs/product/STATUS.md` for the current "what's actually shipped" snapshot.

See `docs/product/ROADMAP.md` for the prioritised punch list of verified bugs and doc
drift still to address.

## Where things live

```
src/ ............ the React app
scripts/ ........ build/utility scripts
docs/product/ ... STATUS, ROADMAP, PARSER_HEALTH (human-facing product state)
docs/agents/ .... handoff log, collab rules, gates (AI-agent coordination)
docs/knowledge/ . poker theory KB the analysis modules derive from
docs/audits/ .... IP / professionalism / compliance audits
docs/validation/  user-interview track
docs/plans/ ..... dated implementation plans
docs/design/ .... UI/UX briefs
docs/reports/ ... janitor + kb-drift reports (point-in-time snapshots)
docs/research/ .. competitor research
.claude/ ........ Claude Code agent config
.agents/ ........ Hermes/Antigravity collaboration scaffolding
```

See `docs/README.md` for the full bucket-by-bucket map.

### ✅ Phase 5: Accuracy & Localization Push (COMPLETED, partial)
- **Financial Accuracy**: `chipsBefore/After` tracking for net PnL, not just gross wins.
- **Nemesis Tracking**: Automated session and global nemesis detection via `villainDeltas`.
- **The Oracle & The Mirror**: Side-by-side Range Matrix with Master-Detail interaction.
- **Localization**: UI and Analysis layers 100% migrated to English.
- **Actionable Stats**: Performance-driven stats page with tournament ROI and leak cards.

### ✅ Phase 6: Intelligence & Arena (COMPLETED)
- **High-Performance Parser**: Background parsing via Web Worker
  (`src/parser/worker.ts`), bounty support, and fuzzy summary matching.
- **The Arena Trainer**: `ArenaPage.tsx` — compliance drills with Reaction
  (Facing Raise) ranges.
- **Master Detail Insights**: Side-by-side Range Matrix with action frequency strips.
- **Nemesis System**: Assassin, Crusher, and Total Damage tracking.

**Stack:** React 19, TypeScript (strict), Tailwind CSS 4, Zustand, Dexie 4, TanStack Table/Virtual, Recharts, Vitest, Framer Motion, Poker-Odds-Calculator

---

## Technical Architecture (Phase 6+)

1. **Background Processing**: Heavy regex parsing is offloaded to `src/parser/worker.ts` via Web Workers.
2. **Logic Solver**: Context-aware analysis in `postflopAnalyzer.ts`. Uses `poker-odds-calculator` for Equity math.
3. **The Arena**: Isometric training simulation in `src/pages/ArenaPage.tsx`.
4. **Data Persistence**: Starred hands and session stats stored in IndexedDB (Dexie).

**Core principle:** This app does NOT solve GTO in real time. It compares hero's decisions against pre-defined theoretical ranges.

**Hero name:** configurable in local settings. Historical fixtures/tests often use `scorza23`; user-facing docs should keep the posture generic.

---

## Core Features

1. **Upload & Parsing** — Drag-and-drop text/ZIP/JSON inputs for PokerStars, GGPoker, and Open Hand History; auto-dedup by hand ID; multi-file support
2. **Dashboard** — VPIP, PFR, C-bet (HU/total), WTSD, AF, ITM Rate, position heatmap, trend charts, session filter, info tooltips, intra-session running stats (25-hand buckets)
3. **Hand Explorer** — Filter by position, scenario, deviation, stack depth, table size. Street-by-street replay, auto-flagged errors, manual notes
4. **Range Compliance** — 13×13 grid per position, color-coded by compliance, deviation list with context
5. **Leak Analyzer** — 10+ leaks with severity, trend, estimated bb cost. Dual-profile thresholds (Game Plan vs Advanced)
6. **Session Manager** — Auto-group by 4h gap, comparison table + charts, CSV/PDF export
7. **Villain Tracker** — Auto-classify opponents (Fish/Nit/TAG/LAG/Station/Maniac), manual notes/tags
8. **Bounty & FT Context** — BPWR/equity-drop/fake-shove/resteal metadata is attached to hero decisions; visible UI surfacing is still partial, so verify `STATUS.md` before treating it as a fully shipped user-facing feature.

---

## PokerStars Hand History Format

### Structure

Each hand follows this pattern, separated by 2+ blank lines:

```
PokerStars Hand #260356646368: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:16:05 UTC [2026/04/05 14:16:05 ET]
Table '3989541132 1' 9-max Seat #1 is the button
Seat 1: player1 (1500 in chips)
...
player1: posts the ante 3
player2: posts small blind 10
player3: posts big blind 20
*** HOLE CARDS ***
Dealt to scorza23 [Kc 5h]
scorza23: raises 20 to 40
*** FLOP *** [6d 2s Qh]
*** TURN *** [6d 2s Qh] [Th]
*** RIVER *** [6d 2s Qh Th] [Jc]
*** SHOW DOWN ***
*** SUMMARY ***
Total pot 3268 | Rake 0
Board [6d 2s Qh Th Jc]
Seat 1: player1 (button) showed [Kd As] and won (3268)
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

**HU note:** Button IS the small blind. BTN/SB acts first preflop and last postflop.

### Canonical Hand Representation

- `AhKh` -> `AKs` | `AhKd` -> `AKo` | `JsJd` -> `JJ`
- Always higher rank first. Rank order: `2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < T < J < Q < K < A`

---

## Theoretical Ranges (Baseline Game Plan)

RFI ranges apply when folded to hero (no prior raise or limp).

### UTG (~13.1%)
Pairs: AA-66 | Suited: AKs-ATs, A5s-A3s, KQs-KTs, QJs-QTs, JTs | Offsuit: AKo-AJo, KQo

### UTG+1 (~14.7%)
= UTG + A2s

### MP1 (~17.2%)
= UTG+1 + A8s, K9s

### MP2 (~18.4%)
= MP1 + A7s, A6s, K8s, Q9s, J9s, T9s, 98s, 87s, 76s, 65s, 54s, ATo

### HJ (~24.7%)
= MP2 + A2s, K7s-K5s, Q8s, J8s, T8s, 55-22, KJo-KTo, QJo

### CO (~36.6%)
= HJ + K4s-K2s, Q7s-Q5s, J7s-J6s, T7s, 97s-96s, 86s, 75s, 64s, 53s, 43s, A9o-A4o, K9o, QTo, JTo

### BTN (~51.1%)
= CO + Q4s-Q2s, J5s-J2s, T6s-T4s, 95s-92s, 85s-82s, 74s-72s, 63s-62s, 52s, 42s, 32s, A3o-A2o, K8o-K3o, Q9o-Q5o, J9o-J7o, T9o-T7o, 98o-97o, 87o-86o, 76o-75o, 65o-64o, 54o

### SB Raise (Blind War — folded to SB vs BB only)
= BTN + K2o, Q4o-Q2o, J6o-J4o, T6o-T5o, 96o-95o, 85o, 74o, 63o, 53o-52o, 43o-42o, 32o
SB plays entire range as RAISE (no limp). Sizes: 3.5x (30bb+), 3x (20-30bb), 2.25x (10-20bb).

### BB Defense vs Open Raise
**Simplified rule: NEVER fold suited hands vs a normal 2-3x open.**
Exceptions: villain all-in, raise 5x+, or extreme ICM pressure (bubble/FT).

### Open Raise Sizes
- 75bb+: 3bb | 40-75bb: 2.5bb | ≤40bb: 2bb

### 3-bet Sizes
- 30bb+: 3x IP / 3.5x OOP | 20-30bb: 2.7x IP / 3.2x OOP | 17-20bb: 2.5x IP / 3x OOP | ≤17bb: All-in

---

## Preflop Scenario Classification

**CRITICAL:** Classify what happened BEFORE hero's action to prevent false overfold flags.

| Scenario | Condition | Correct Response |
|---|---|---|
| `RFI` | Folded to hero (not in blinds) | Raise if in range, fold if not |
| `BLIND_WAR` | Folded to SB (hero is SB) | Raise if in SB range, fold if not |
| `HU_BTN` | Heads-up, hero is BTN/SB | 10bb+: play 100% (never fold). LIMP is valid. |
| `FACING_RAISE` | Someone raised (not all-in) | Non-BTN/BB: 3-bet or fold only. Exception: pairs 66- can call at 40bb+. BTN/BB may call. |
| `FACING_ALL_IN` | Someone went all-in | Pot odds + hand strength + ICM. NOT subject to no-cold-call rule. |
| `FACING_LIMP` | Someone limped, no raise | Raise. Never limp behind (SB may limp behind). |
| `BB_VS_RAISE` | Hero BB, facing 2-3x open | Defend wide. Never fold suited. |
| `BB_VS_LARGE_RAISE` | Hero BB, facing 5x+ or all-in | Standard decision — folding suited acceptable |
| `BB_VS_LIMP` | Hero BB, SB limped | Raise wide. 40bb+: 100% at 3.5x. 25-40bb: polarized. 10-20bb: polarized 3x, shove medium. |
| `WALK` | BB, everyone folded | No decision |

**Detect FACING_ALL_IN:** raise action line contains `and is all-in`. Also check raise size ≥ 5x BB for `BB_VS_LARGE_RAISE`.

### Range Compliance Scope

**Computed:** `RFI`, `BLIND_WAR`, `HU_BTN` (10bb+), `FACING_RAISE` non-BTN/BB, `BB_VS_RAISE`

**Excluded:** `FACING_ALL_IN`, `BB_VS_LARGE_RAISE`, extreme ICM spots (bubble/FT)

---

## Short Stack Strategy (≤10bb)

All-in or fold only. Push ranges at 10bb:
- **UTG**: AA-66, AKs-ATs, KQs-KTs, QJs, JTs, AKo-AJo, KQo
- **MP**: UTG + 55, A9s, K9s, QTs, T9s, ATo, KJo
- **CO**: Much wider — all pairs, all aces suited, most kings suited, all broadways, suited connectors, A9o-A2o, KTo+, QTo+, JTo
- **BTN**: Very wide — nearly all pairs, all aces, most kings/queens, suited connectors, many offsuit broadways
- **SB**: Extremely wide — at 12bb can push ~100% in many ICM scenarios

**Resteal (BTN/SB/BB with ≤20bb vs CO/BTN open):** SHOVE all pairs, all suited broadways, all suited aces.

---

## ICM Concepts

ICM converts chip stacks to monetary value. Key: chips you WIN are worth less than chips you LOSE.

| Stage | Risk Premium | Impact |
|---|---|---|
| Early game | ~2-3% | Minimal |
| Mid game (50% field) | ~5-8% | Slight tightening |
| ITM bubble | 10-15%+ | Massive range tightening |
| Semi-final table | 12%+ | Very tight defense |
| Final table | 5-20%+ | Stack-dependent |

**Risk Advantage:** Chip leader has lower RP — can open wider and pressure shorter stacks. App flags ICM-sensitive spots but does NOT auto-adjust ranges.

---

## Postflop Analysis

### C-bet Rules
1. **IP as PFR vs BB (HU flop): C-bet 100% at 33% pot.** ALL boards, ALL hands. Most important rule.
2. **Multiway:** Value hands + strong draws only.
3. **OOP as PFR:** Value hands. Check on unfavorable boards.

### Double Barrel (Turn)
IP: bet 66% pot when turn card favors raiser's range (overcards, high cards). Example: Flop 942 → turn K.

### Bet vs Missed C-bet
Villain checked flop (missed c-bet), hero IP: **bet 100% at 33% pot. Mandatory exploit.**

### Probe Turn (from BB)
Villain opened, hero called from BB, flop check-check, turn favors BB: bet 66% full range.

### Donk Bet Turn (from BB)
After calling flop c-bet, turn strongly favors BB: polarized lead (value: two-pair+/sets, bluffs: FDs/OESDs with blockers).

### Bet Sizing Theory
- Range + nuts advantage → large bet (66-100%)
- Range advantage, no nuts advantage → small bet (20-33%)
- No range advantage → check or small bet selectively

---

## Heads-Up Strategy

### BTN/SB (10bb+)
- **Never fold.** VPIP ~100%. LIMP is part of optimal strategy.
- IP postflop: 100% c-bet at 33%.

### BB in HU
- BTN limps: Raise. 40bb+: 100% at 3.5x. 25-40bb: polarized. 10-20bb: polarized 3x, shove medium.
- BTN raises: Defend very wide.

---

## Metrics & Targets

| Metric | Formula | Target | Priority |
|---|---|---|---|
| VPIP | Voluntary money in / total | 20-30% | Medium |
| PFR | Preflop raise / total | 15-23% | Medium |
| 3-bet% | 3-bets / 3-bet opps | 7-10% | Low |
| Limps | Preflop calls, no prior raise (excl BB) | 0 | High |
| C-bet Total | C-bets / opps | 60-70% | High |
| C-bet HU | C-bets HU / HU opps | 100% | Critical |
| Double Barrel | Turn bets after c-bet / opps | 60%+ | Medium |
| WTSD | Showdowns / VPIP hands | 25-35% | High |
| Won at SD | SD wins / showdowns | 50%+ | Medium |
| AF | (bets + raises) / calls | 2-3 | Low |
| Range Compliance | In-range decisions / total preflop decisions | 90%+ | High |

---

## Data Model

```typescript
  boardFlop: string[] | null; boardTurn: string | null; boardRiver: string | null;
  totalPot: number; rake: number;
  heroChipsBefore: number; heroChipsAfter: number;
  villainDeltas: { name: string; net: number }[];
}
interface PlayerInHand {
  handId: string; seatNumber: number; playerName: string;
  chipsBefore: number; position: Position; isHero: boolean; holeCards: [string, string] | null;
}
interface Action {
  handId: string; street: 'preflop' | 'flop' | 'turn' | 'river';
  playerName: string;
  actionType: 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'post_sb' | 'post_bb' | 'post_ante';
  amount: number | null; isAllIn: boolean; sequence: number;
}
interface Tournament {
  id: string; buyIn: number; fee: number; format: string;
  finishPosition: number | null; prize: number | null; handsPlayed: number;
}
interface HeroDecision {
  handId: string; position: Position; handKey: string; stackBb: number;
  scenario: Scenario; action: 'fold' | 'raise' | 'call' | 'check';
  isCompliant: boolean; deviationType: DeviationType | null;
  sawFlop: boolean; wasPreFlopRaiser: boolean;
  cbetOpportunity: boolean; cbetMade: boolean; cbetHU: boolean;
  doubleBarrelOpportunity: boolean; doubleBarrelMade: boolean;
  wentToShowdown: boolean; wonAtShowdown: boolean; wonAmount: number;
}
interface VillainProfile {
  playerName: string; firstSeen: Date; lastSeen: Date; totalHands: number;
  stats: { vpip: number; pfr: number; threeBetPct: number; foldToThreeBet: number;
    cbetFlop: number; cbetTurn: number; foldToCbet: number; wtsd: number; wsd: number;
    af: number; limpPct: number; };
  statsByPosition: Map<Position, PositionStats>;
  shownHands: ShownHand[];
  archetype: VillainArchetype | null; archetypeConfidence: 'low' | 'medium' | 'high';
  notes: string; tags: string[];
}

type Position = 'UTG' | 'UTG+1' | 'MP1' | 'MP' | 'MP2' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB' | 'BTN/SB';
type Scenario = 'RFI' | 'BLIND_WAR' | 'HU_BTN' | 'FACING_RAISE' | 'FACING_ALL_IN' | 'FACING_LIMP' | 'BB_VS_RAISE' | 'BB_VS_LARGE_RAISE' | 'BB_VS_LIMP' | 'WALK';
type DeviationType = 'OVERFOLD' | 'OPENED_OUT_OF_RANGE' | 'LIMPED' | 'SB_OVERFOLD' | 'SB_LIMPED' | 'SB_OUT_OF_RANGE' | 'COLD_CALL' | 'BB_FOLD_SUITED' | 'SB_COLD_CALL' | 'FOLD_VS_LIMP' | 'LIMP_BEHIND' | 'HU_BTN_FOLD';
type VillainArchetype = 'fish' | 'nit' | 'tag' | 'lag' | 'station' | 'maniac';
```

---

## UI/UX

- **Theme:** Dark mode. Background `#0a0a0f`, green accents `#00ff88`, red `#ff4444`, neutral blue-gray.
- **Typography:** Monospace (JetBrains Mono) for numbers, sans-serif (DM Sans) for labels.
- **Cards:** Suits — spades white, hearts red, diamonds blue, clubs green.
- **Range grid:** 13×13. Pairs on diagonal. Suited above, offsuit below. Color by compliance.
- **Charts:** Recharts. Line for evolution, bar for session comparisons.
- **Language:** UI in English only. Code in English.
- **Layout:** Left sidebar (Dashboard / Hands / Stats / Ranges / Leaks / Sessions / Villains / Arena / Career / Demo) + main content.

---

## Project Structure (verified against source 2026-05-31)

```
src/
├── parser/         PokerStars, GGPoker, Open Hand History, sanitizer,
│                   contribution package, site identification, worker import
├── analysis/       scenarioDetector.ts*, rangeChecker.ts*, postflopAnalyzer.ts*,
│                   financials/career/study-plan modules, solver boundary,
│                   bounty/final-table/squeeze/villain helpers
├── data/           ranges.ts*, store.ts (IndexedDB/Dexie), appStore.ts (Zustand),
│                   sessions.ts, strategyProfiles.ts, pushFold/local heads-up refs
├── components/     layout/ (Layout, Sidebar, ErrorBoundary),
│                   dashboard/ (TrendChart, StudyPlanCard, ValueSnapshotCard),
│                   career/, hands/ (HandReplay, HandsTable, HandsUpload),
│                   shared/ (Card, StatCard, RangeGrid, DualRangeMatrix,
│                            InfoTooltip, ConfirmDialog, DemoDataButton)
├── pages/          DashboardPage, HandsPage (upload inline), StatsPage,
│                   RangesPage, LeaksPage, VillainsPage, SessionsPage,
│                   ArenaPage, CareerPage, DemoPage
├── utils/          csvExport.ts, pdfExport.ts, evidence.ts, format.ts
├── types/          hand.ts, analysis.ts, villain.ts, ranges.ts, evidence.ts
└── test/fixtures/  PokerStars and GGPoker real-fixture corpus plus samples
```
`*` = critical files, read before modifying

**Notes vs older drafts:**
- No `UploadPage.tsx` / `ConfigPage.tsx`: upload is inline in `HandsPage.tsx`
  (toggled by `showUpload`); config (hero name, strategy profile) lives in
  `Sidebar.tsx` + IndexedDB `settings` table.
- No `Board.tsx` shared component. No `components/ranges` `stats` `leaks`
  `sessions` `upload` `villains` subdirs — those pages consume `shared/`.
- `ArenaPage.tsx` exists and is wired at `/arena`; `DemoPage.tsx` is wired at `/demo`.

---

## Code Guidelines

- TypeScript strict mode. Functional React + hooks. Zustand for state. Dexie for IndexedDB.
- No external API calls by default. Unit tests run with Vitest; see `docs/product/STATUS.md` for the current test inventory.
- Variable names in English.
- UI strings and Analysis logic: **100% English**. All Portuguese strings were purged on 2026-05-11. New code should ship in English.
- Do not add docstrings, comments, or error handling for impossible scenarios.

---

## Key Dependencies (verified against `package.json` 2026-05-31)

Runtime:
```
react 19, react-dom 19, react-router-dom 7,
zustand 5, dexie 4, dexie-react-hooks 4,
@tanstack/react-table 8, @tanstack/react-virtual 3,
recharts 3, framer-motion 12, lucide-react 1,
clsx 2, date-fns 4,
poker-odds-calculator 0.4 (equity math in HandReplay),
jspdf 4 + jspdf-autotable 5 (PDF export),
jszip 3 (ZIP import on HandsPage upload),
vite-plugin-pwa 1
```

Build / test:
```
vite 6, @vitejs/plugin-react 4, tsx 4, typescript 5.7,
tailwindcss 4 + @tailwindcss/vite 4,
vitest 3, jsdom, fake-indexeddb, Testing Library, ESLint 9
```

**Phantom deps removed from older drafts:** `pokersolver`,
`@holdem-poker-tools/hand-matrix`. Neither is installed; neither is imported.
Hand evaluation uses `poker-odds-calculator`; the range grid is a custom
component (`src/components/shared/RangeGrid.tsx`).

---

## Strategy Profiles

### Profile 1: "Baseline" (Default)
Binary rules, beginner-friendly. Based on standard SNG opening ranges:
- C-bet IP vs BB: 100% at 33% on all boards
- SB: raise or fold only
- Facing raise (non-BTN/BB): 3-bet or fold only
- BB vs 2-3x open: never fold suited

### Profile 2: "Advanced Theory"
Context-dependent. Based on full `/docs/knowledge/strategy/` knowledge base.

**C-bet by board texture:** High-card dry → 100% at 25-33%. Wet broadway → 100% at 50-75%. Low connected → check frequently. Paired low → check or 25%. `[D#09, D#10, Vol.2]`

**BB defense with ICM:** Early game: never fold suited. Bubble (RP >10%): fold 40%+ including suited. Semi-FT (RP >12%): very tight. `[05-icm §5, D#16]`

**3-bet sizing (deep):** 50bb: 3-3.25x IP / 3.5-3.75x OOP. 100bb: 4x IP / 5x OOP. `[02-ranges §5]`

**Advanced leak targets:**

| Stat | Game Plan | Advanced | Source |
|---|---|---|---|
| C-bet overall | 60-70% | 50-60% | `[09-study §4]` |
| WTSD | 25-35% | 25-30% | `[09-study §4]` |
| 3-bet % | — | 7-10% | `[09-study §4]` |
| Fold to C-bet | — | 35-45% | `[09-study §4]` |
| VPIP-PFR gap | — | <10 | `[08-gto §3]` |

### Villain Auto-Classification (MDA, `08-gto §3`)

| Archetype | Criteria | Exploit |
|---|---|---|
| Fish | VPIP − PFR > 15 | Value wider, bluff less |
| Nit | VPIP < 18, PFR < 14 | Steal wide, fold to aggression |
| TAG | VPIP 20-28, PFR 18-25, AF > 2 | Respect raises, 3-bet light |
| LAG | VPIP 28-40, PFR 24-35, AF > 3 | Call down wider, trap |
| Station | VPIP > 35, AF < 1.5 | Never bluff, value relentlessly |
| Maniac | VPIP > 40, PFR > 30, AF > 4 | Let them hang, call down |

Min 30 hands for tentative, 100+ for confident classification.

---

## Knowledge Base (`/docs/knowledge/strategy/`)

**Before modifying any analysis logic, read the relevant doc first.** For concept lookup, start with `claudecode_index.md`.

| File | Covers | Governs |
|---|---|---|
| `01-poker-math.md` | EV, pot odds, outs, equity, SPR | `statsCalculator.ts` |
| `02-ranges-and-position.md` | RFI by position/stack, 3-bet sizing | `data/ranges.ts`, `rangeChecker.ts` |
| `03-preflop-strategy.md` | vs RFI reactions, BB defense, blind war, squeeze, 4-bet | `scenarioDetector.ts`, `rangeChecker.ts` |
| `04-postflop-strategy.md` | C-bet IP/OOP, nuts/range advantage, donk, probe | `postflopAnalyzer.ts`, `leakDetector.ts` |
| `05-icm-and-risk-premium.md` | ICM, bubble factor, risk premium, risk advantage | `icmDetector.ts`, `scenarioDetector.ts` |
| `06-bounty-tournaments.md` | BPWR, equity drop, PKO adjustments | `bountyAnalyzer.ts` |
| `07-final-table-play.md` | FT dynamics, fake shove, resteal | `finalTableAnalyzer.ts` |
| `08-gto-and-exploits.md` | GTO baselines, MDA, population exploits | `leakDetector.ts` |
| `09-study-methods-and-tools.md` | Leak finder framework, stat targets | `leakDetector.ts`, `statsCalculator.ts` |
| `METRICS_DICTIONARY.md` | Single source of truth for platform math | **All Parsers/Analysis Math** |
| `claudecode_index.md` | Concept-to-doc map | **Read FIRST** |

**Source attribution:** legacy internal tags such as `[GamePlan]`, `[Vol.1-3]`,
`[ICM]`, `[NERD]`, and `[D#N]` may still appear in strategy/code comments.
Do not expose these as user-facing branding without a separate IP/source review.

---

## Known Bugs & Lessons Learned

1. **False overfolds:** NEVER flag fold as overfold if someone raised before hero. Scenario detector MUST check all actions before hero's first action.
2. **BB fold suited false positives:** Normal 2-3x → fold suited = error. All-in or 5x+ → acceptable.
3. **HU position:** BTN = SB in heads-up. No separate BTN/SB entries for HU hands.
4. **Position mapping:** Seats not contiguous. Use ordered list of active seats, not raw seat numbers.
5. **Deduplication:** Same hand can appear in multiple files. Deduplicate by Hand ID.
6. **Encoding:** PokerStars files use UTF-8 with BOM (`utf-8-sig`).
7. **W$SD false positives:** `wentToShowdown = !heroFolded && river dealt` incorrectly counts river wins without showdown. Fix: detect `*** SHOW DOWN ***` section. Proper showdown requires 2+ players comparing hands.
8. **PnL badge scope:** Recompute from selected session filter, not all sessions.
9. **TrendChart Y-axis:** `[0, 100]` breaks PnL charts. Use `['auto', 'auto']` for non-percentage metrics.
10. **HandReplay duplicate rendering:** Ensure no duplicate JSX blocks in modals (copy-paste trap).
11. **AF never computed:** `totalRaises`/`totalCalls` must be incremented from `HeroDecision.action`, not only from c-bets.
12. **Chips Won/Mão misleading:** `wonAmount` is gross collection, not net P&L. Use Win % instead.
13. **TrendChart double card wrapper:** Only one card wrapper (parent or component). Double-wrapping causes legend overflow.
14. **Charts vanish on session filter:** Don't guard charts by `activeSessionId === 'all'`. Use `computeIntraSessionTrends()` for filtered sessions.

---

All phases 1-6 complete. See `docs/product/ROADMAP.md` for the full history.

---

## End-of-session contract (for AI agents)

This section only lists rules that something actually enforces — the
pre-commit hook, GitHub branch protection on `main`, or required CI
checks — plus one process rule that depends on human enforcement.
Unenforced prose contracts are what caused the Gemini-drift incidents
— don't add more.

**Trunk: `main`.** As of 2026-05-18, `main` is the canonical branch.
The old `phase-6-consolidated-final` branch is retired. All work lands
through pull requests against `main`. Don't push to `main` directly —
the branch is protected and GitHub will reject it.

**Enforced by `.git/hooks/pre-commit` (installed via `npm install`):**

1. `docs/product/STATUS.md` autogen blocks must be current. If you change
   `package.json` deps, `src/App.tsx` routes, the `src/` tree, or
   test files, run `npm run docs:update` before committing. The hook
   runs `npm run docs:check` and blocks commits on drift.
2. No untracked files under `src/` when committing anything in `src/`.
   Either `git add` the file, `git rm` it, or add it to `.gitignore`.
   This catches the "orphan feature files" failure mode — e.g., a
   page imported from `App.tsx` but never tracked.

**Enforced by GitHub branch protection on `main`:**

3. All changes land via PR. Open from a feature branch (e.g.
   `solver/<slice>`, `ui/<feature>`, `chore/<thing>`); push to
   `origin/<your-branch>`; open a PR with `gh pr create --base main`
   (or via the GitHub UI).
4. CI must be green before merge. The required check is
   `lint / typecheck / test / build`, defined in
   `.github/workflows/ci.yml`. Run the pieces locally before pushing
   so you're not waiting on CI to discover a typo:

   ```
   npm run docs:check && npm run typecheck && npm run lint &&
     npm test && npm run build
   ```
5. Force-push and branch deletion are blocked on `main`. If you need to
   undo a merged commit, do it via a new PR that reverts.

**Process rules (human-enforced):**

6. `--no-verify` is forbidden without an explicit user request in the
   same session. If the hook fires, fix the underlying drift instead of
   skipping it. If you genuinely need to bypass, ask first.
7. When your PR's CI is red because `main` moved (e.g. another agent
   merged a fix), bring `main` into your branch (`git merge origin/main`
   or rebase) and re-push. Don't ask the user to "Update branch" if you
   can do it from the command line.
