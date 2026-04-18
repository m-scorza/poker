# Poker Hand Analyzer — scorza23

> Project instructions for Gemini CLI. Mirrors CLAUDE.md — both files must stay in sync.
> For the factual snapshot of what's shipped, see `docs/STATUS.md` (single source of truth).

## ⚠️ Before trusting this doc

Historically this file has drifted from code. Verify any structural / dep /
UI-state claim against `docs/STATUS.md` and the actual source before acting on
it. Corrected 2026-04-17.

## Project Overview

Web app for analyzing PokerStars tournament hand histories. Client-side only (React + Vite + TypeScript + Tailwind). Data persisted in IndexedDB via Dexie.js. No backend, no external API calls.

**Core principle:** Compares hero's (`scorza23` by default, configurable in
IndexedDB `settings`) decisions against pre-defined theoretical ranges from
the Reg Life coaching program. Does NOT solve GTO in real time.

**Stack:** React 19, TypeScript 5.7 strict, Tailwind CSS 4, Zustand 5, Dexie 4,
Recharts 3, Framer Motion 12, `poker-odds-calculator`, Vitest 3, Vite 6.
Web Worker in `src/parser/worker.ts` offloads heavy parsing.

---

## Before Modifying Analysis Logic

Read `docs/strategy/claudecode_index.md` first — it maps every poker concept to the relevant strategy doc. Every rule must trace to a source: `[GamePlan]`, `[Vol.1-3]`, `[ICM]`, `[NERD]`, or `[D#N]`.

Strategy docs live in `docs/strategy/` (01-poker-math.md through 10-glossary.md).

---

## Critical Rules (Never Violate)

1. **Scenario detection FIRST:** Classify what happened before hero's action before computing compliance. `scenarioDetector.ts` is the entry point.
2. **Never flag overfold if someone raised:** Check all preflop actions before hero's turn.
3. **BB vs 2-3x open:** Folding suited = deviation. Vs all-in or 5x+ = NOT a deviation.
4. **HU:** BTN = SB. Position is `BTN/SB`, not separate entries.
5. **Dedup by Hand ID:** Same hand can appear in multiple upload files.
6. **Encoding:** PokerStars files are UTF-8 with BOM.
7. **W$SD:** Requires actual `*** SHOW DOWN ***` section — not just `river dealt && !folded`.
8. **TrendChart Y-axis:** Use `['auto', 'auto']` for PnL, `[0, 100]` for percentages only.

---

## PokerStars Parser — Key Patterns

```
Hand ID:         Hand #(\d+)
Tournament ID:   Tournament #(\d+)
Buy-in:          \$(\d+\.\d+)\+\$(\d+\.\d+)
Blinds:          Level [IVXL]+ \((\d+)/(\d+)\)
Table size:      (\d+)-max
Button:          Seat #(\d+) is the button
Seats:           Seat (\d+): (\S+) \((\d+) in chips\)
Hero cards:      Dealt to scorza23 \[([^\]]+)\]
All-in:          action line contains "and is all-in"
Finish place:    scorza23 finished the tournament in (\d+)\w+ place
Prize:           received \$([0-9.]+)
```

Hands separated by 2+ blank lines.

---

## Position Mapping (clockwise from BTN)

| Players | Positions |
|---|---|
| 9 | BTN, SB, BB, UTG, UTG+1, MP1, MP2, HJ, CO |
| 6 | BTN, SB, BB, UTG, HJ, CO |
| 3 | BTN, SB, BB |
| 2 | BTN/SB, BB |

Use ordered list of active seats — seat numbers are not contiguous.

---

## Theoretical Ranges

RFI = Raise First In (folded to hero, no prior action).

| Position | Key hands |
|---|---|
| UTG (~13%) | AA-66, AKs-ATs, A5s-A3s, KQs-KTs, QJs-QTs, JTs, AKo-AJo, KQo |
| UTG+1 (~15%) | UTG + A2s |
| MP1 (~17%) | UTG+1 + A8s, K9s |
| MP2 (~18%) | MP1 + A7s, A6s, K8s, Q9s, J9s, T9s, 98s, 87s, 76s, 65s, 54s, ATo |
| HJ (~25%) | MP2 + A2s, K7s-K5s, Q8s, J8s, T8s, 55-22, KJo-KTo, QJo |
| CO (~37%) | HJ + K4s-K2s, Q7s-Q5s, J7s-J6s, T7s, 97s-96s, 86s, 75s, 64s, 53s, 43s, A9o-A4o, K9o, QTo, JTo |
| BTN (~51%) | CO + Q4s-Q2s, J5s-J2s, T6s-T4s, 95s-92s, 85s-82s, 74s-72s, 63s-62s, 52s, 42s, 32s, A3o-A2o, K8o-K3o, Q9o-Q5o, J9o-J7o, T9o-T7o, 98o-97o, 87o-86o, 76o-75o, 65o-64o, 54o |
| SB (Blind War) | BTN + K2o, Q4o-Q2o, J6o-J4o, T6o-T5o, 96o-95o, 85o, 74o, 63o, 53o-52o, 43o-42o, 32o |

**Canonical form:** Higher rank first. Suited = same suit (AKs), offsuit (AKo), pair (QQ). Rank: 2<3<...<T<J<Q<K<A

---

## Preflop Scenarios

| Scenario | Condition | Compliance Rule |
|---|---|---|
| `RFI` | Folded to hero (not blind) | In range = raise, else fold |
| `BLIND_WAR` | Folded to SB vs BB | In SB range = raise, else fold |
| `HU_BTN` | HU, hero BTN/SB, 10bb+ | Fold = always wrong |
| `FACING_RAISE` | Non-all-in raise before hero | Non-BTN/BB: 3-bet or fold (cold-call = deviation) |
| `FACING_ALL_IN` | All-in before hero | Excluded from compliance |
| `BB_VS_RAISE` | BB, facing 2-3x open | Fold suited = deviation |
| `BB_VS_LARGE_RAISE` | BB, facing 5x+ or all-in | Excluded from compliance |
| `BB_VS_LIMP` | BB, SB limped | Raise wide |
| `WALK` | BB, all folded | No decision |

---

## Postflop Rules (Game Plan Profile)

1. **IP as PFR vs BB (HU flop): 100% c-bet at 33%.** No exceptions.
2. **Missed c-bet: hero IP, villain checked:** bet 100% at 33%.
3. **Double barrel:** 66% pot when turn card favors raiser's range.
4. **Probe turn (from BB):** flop check-check, favoring turn → bet 66% full range.
5. **Sizing theory:** Range + nuts advantage → 66-100%. Range only → 20-33%. None → check.

---

## Metrics & Targets

| Metric | Target |
|---|---|
| VPIP | 20-30% |
| PFR | 15-23% |
| C-bet HU | 100% (Critical) |
| C-bet Total | 60-70% |
| WTSD | 25-35% |
| Won at SD | 50%+ |
| AF | 2-3 |
| Range Compliance | 90%+ |
| Limps | 0 |

---

## Key Types

```typescript
type Position = 'UTG' | 'UTG+1' | 'MP1' | 'MP' | 'MP2' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB' | 'BTN/SB';
type Scenario = 'RFI' | 'BLIND_WAR' | 'HU_BTN' | 'FACING_RAISE' | 'FACING_ALL_IN' | 'FACING_LIMP' | 'BB_VS_RAISE' | 'BB_VS_LARGE_RAISE' | 'BB_VS_LIMP' | 'WALK';
type DeviationType = 'OVERFOLD' | 'OPENED_OUT_OF_RANGE' | 'LIMPED' | 'SB_OVERFOLD' | 'SB_LIMPED' | 'SB_OUT_OF_RANGE' | 'COLD_CALL' | 'BB_FOLD_SUITED' | 'SB_COLD_CALL' | 'FOLD_VS_LIMP' | 'LIMP_BEHIND' | 'HU_BTN_FOLD';
```

---

## UI Conventions

- Dark theme: `#0a0a0f` bg, `#00ff88` green, `#ff4444` red
- **UI language target: English.** The 7 UI files previously flagged with
  PT-BR residue were purged on 2026-04-18. Analysis-layer `note` residue
  is still tracked in `docs/STATUS.md`; defer to that file for current
  status. New code ships in English.
- Code: English identifiers.
- No emojis unless the user requests.
- Sidebar (actual, as of 2026-04-17): Dashboard / Hands / Statistics /
  Ranges / Leaks / Sessions / Villains / The Arena. Upload is inline in
  Hands; config (strategy profile) is in the sidebar footer.

## Routes / Pages (verified)

`/` Dashboard · `/hands` Hands · `/stats` Statistics · `/ranges` Ranges ·
`/leaks` Leaks · `/sessions` Sessions · `/villains` Villains · `/arena` Arena.

No `UploadPage.tsx`, no `ConfigPage.tsx`, no `Board.tsx` — don't reference
them. See `docs/STATUS.md` for the full reality list.

---

Phases 1-6 shipped. The platform is in **maintenance + targeted fixes** mode.
See `docs/ROADMAP.md` for the prioritised punch list and `docs/STATUS.md` for known
correctness issues still open.
