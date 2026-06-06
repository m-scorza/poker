# Claude Code Index — Poker Brain

Executive summary for rapid concept retrieval. When answering poker questions, scan this file first to locate the relevant document and section.

---

## CONCEPT → DOCUMENT MAP

### Math & Fundamentals
- **EV calculation, +EV/-EV** → `01-poker-math.md` §1
- **Pot odds formula** → `01-poker-math.md` §2
- **Outs, Rule of 4, Rule of 2+2** → `01-poker-math.md` §3
- **Implied odds** → `01-poker-math.md` §4
- **Equity (crude, realized, robust)** → `01-poker-math.md` §5
- **EQR (equity realization factor)** → `01-poker-math.md` §5.2
- **Why we bet (Janda framework)** → `01-poker-math.md` §6
- **SPR** → `01-poker-math.md` §7

### Ranges & Position
- **Range types (linear, polarized, condensed)** → `02-ranges-and-position.md` §1
- **Position system (9-max)** → `02-ranges-and-position.md` §2
- **RFI % by position and stack** → `02-ranges-and-position.md` §3
- **Open shove ranges (10bb)** → `02-ranges-and-position.md` §4
- **Flat and 3-bet construction** → `02-ranges-and-position.md` §5
- **3-bet sizing table** → `02-ranges-and-position.md` §5
- **Army analogy (range/nuts advantage)** → `02-ranges-and-position.md` §6

### Pre-Flop Strategy
- **Reaction vs open raise by position** → `03-preflop-strategy.md` §1
- **BB defense ranges and reasoning** → `03-preflop-strategy.md` §2
- **Blind war (SB vs BB)** → `03-preflop-strategy.md` §3
- **Squeeze play** → `03-preflop-strategy.md` §4
- **Facing a 3-bet / 4-bet** → `03-preflop-strategy.md` §5
- **Stack management by depth (NERD playbook)** → `03-preflop-strategy.md` §6
- **Push/fold strategy** → `02-ranges-and-position.md` §4, `03-preflop-strategy.md` §6

### Post-Flop Strategy
- **Range advantage vs nuts advantage** → `04-postflop-strategy.md` §1
- **C-bet in position (IP)** → `04-postflop-strategy.md` §2
- **C-bet out of position (OOP)** → `04-postflop-strategy.md` §2
- **C-bet sizing by board texture** → `04-postflop-strategy.md` §2
- **Facing a c-bet (BB defense, IP float)** → `04-postflop-strategy.md` §3
- **Probe bet (turn after flop check-check)** → `04-postflop-strategy.md` §4
- **Donk bet (turn, leading into aggressor)** → `04-postflop-strategy.md` §5
- **Turn after check-raise** → `04-postflop-strategy.md` §6
- **Bet sizing summary table** → `04-postflop-strategy.md` §7

### ICM & Tournament Pressure
- **ICM definition and chip value asymmetry** → `05-icm-and-risk-premium.md` §1
- **When to consider ICM (tournament stage)** → `05-icm-and-risk-premium.md` §2
- **Risk premium formula and calculation** → `05-icm-and-risk-premium.md` §3
- **Bubble factor** → `05-icm-and-risk-premium.md` §3
- **Risk advantage (RA)** → `05-icm-and-risk-premium.md` §4
- **ICM impact on BB defense by stage** → `05-icm-and-risk-premium.md` §5
- **ITM bubble, semi-FT, FT specifics** → `05-icm-and-risk-premium.md` §6
- **RP reference table** → `05-icm-and-risk-premium.md` §7

### Bounty Tournaments
- **Bounty as pot odds discount** → `06-bounty-tournaments.md` §1
- **Bounty Power (BPWR) formula** → `06-bounty-tournaments.md` §2
- **Equity drop by scenario** → `06-bounty-tournaments.md` §3
- **Multi-way all-in in bounty** → `06-bounty-tournaments.md` §4
- **Squeeze in PSKO** → `06-bounty-tournaments.md` §5
- **Early vs late game bounty adjustments** → `06-bounty-tournaments.md` §6
- **Opening/defense/3-bet in PKO** → `06-bounty-tournaments.md` §7
- **Bounty decision heuristics table** → `06-bounty-tournaments.md` §9

### Final Table Play
- **FT stack archetypes (CL/medium/short)** → `07-final-table-play.md` §1
- **Open raise at FT (raise/fold vs shove)** → `07-final-table-play.md` §2
- **Fake shove concept** → `07-final-table-play.md` §3
- **Resteal vs chip leader** → `07-final-table-play.md` §4
- **Facing all-in at FT** → `07-final-table-play.md` §5
- **BB defense at semi-FT** → `07-final-table-play.md` §6
- **Bounty vs ICM tension at FT** → `07-final-table-play.md` §8
- **FT decision matrix** → `07-final-table-play.md` §9

### GTO & Exploits
- **GTO definition and solver concepts** → `08-gto-and-exploits.md` §1-2
- **MDA (Mass Data Analysis) setup** → `08-gto-and-exploits.md` §3
- **Population segmentation (rec vs reg)** → `08-gto-and-exploits.md` §3
- **Comparing MDA to GTO baselines** → `08-gto-and-exploits.md` §3
- **Exploitative adjustments (overfold, overcall, etc.)** → `08-gto-and-exploits.md` §4
- **Nodelock analysis** → `08-gto-and-exploits.md` §5
- **Software reference table** → `08-gto-and-exploits.md` §6

### Study & Meta
- **Study methods overview** → `09-study-methods-and-tools.md` §1
- **Beginner/professional study paths** → `09-study-methods-and-tools.md` §2
- **Weekly planner template** → `09-study-methods-and-tools.md` §3
- **Leak Finder framework + key stats** → `09-study-methods-and-tools.md` §4
- **Session review best practices** → `09-study-methods-and-tools.md` §5
- **Variance and bankroll management** → `09-study-methods-and-tools.md` §8

### Glossary
- **Any poker term** → `10-glossary.md` (alphabetical)

---

## DOSSIÊ CROSS-REFERENCE

| Dossiê | Topic | Primary Doc Reference |
|---|---|---|
| D#01 | Open Raise at FT | `07-final-table-play.md` §2 |
| D#02 | Facing All-In at FT | `07-final-table-play.md` §5 |
| D#03 | KJo Bounty Early Game | `06-bounty-tournaments.md` §8 |
| D#04 | All-In FT Bounty | `07-final-table-play.md` §8 |
| D#05 | Resteal vs CL at FT | `07-final-table-play.md` §4 |
| D#06 | Call Squeeze PSKO | `06-bounty-tournaments.md` §5 |
| D#07 | Probe Turn BB 9-High | `04-postflop-strategy.md` §4 |
| D#08 | JTs ITM Bubble | `05-icm-and-risk-premium.md` §6 |
| D#09 | AQs UTG vs BB (C-bet sizing) | `04-postflop-strategy.md` §2 |
| D#10 | Nuts Advantage | `04-postflop-strategy.md` §1 |
| D#11 | Bounty Power | `06-bounty-tournaments.md` §2 |
| D#13 | BB Defense KO | `06-bounty-tournaments.md` §3,7 |
| D#14 | CO vs HJ PKO Covering | `06-bounty-tournaments.md` §3,7 |
| D#15 | Risk Advantage | `05-icm-and-risk-premium.md` §4 |
| D#16 | BB Defense Semi-FT | `07-final-table-play.md` §6 |
| D#18 | Triple All-In Bounty | `06-bounty-tournaments.md` §4 |
| D#20 | Fake Shove | `07-final-table-play.md` §3 |
| D#21 | Donk Bet Turn | `04-postflop-strategy.md` §5 |

---

## KEY FORMULAS QUICK REFERENCE

```
EV = (%Win × $Win) + (%Lose × $Lose)
Pot Odds = Bet / (Bet + Pot)
Outs to % (all-in flop) = Outs × 4
Outs to % (single street) = Outs × 2 + 2
Realized Equity = Crude Equity × EQR
Required Equity (ICM) = Pot Odds + Risk Premium
Risk Premium = Bubble Factor − 1
Risk Advantage = Villain's RP vs Hero − Hero's RP vs Villain
SPR = Effective Stack / Pot
Equity Drop (Bounty) = Standard Pot Odds − Bounty Adjustment
```

---

## SOURCE KEY

- `[Vol.1]` = Estudar dá Sorte Volume 1 (Fundamentals)
- `[Vol.2]` = Estudar dá Sorte Volume 2 (Ranges, C-bet, ICM intro, Bounty intro)
- `[Vol.3]` = Estudar dá Sorte Volume 3 (MDA, ICM Practice, Advanced Post-Flop)
- `[ICM]` = third-party curriculum ICM eBook
- `[NERD]` = The NERD's Playbook
- `[216R]` = 216 Range Tables
- `[Glossary]` = Dicionário do Poker
- `[D#N]` = Dossiê number N (by @luischiavo)
