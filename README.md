# 🧠 Poker Brain — Knowledge Repository

A structured knowledge base compiled from **Reg Life** (Brazil's largest poker school) materials and community dossiês by **@luischiavo**. Covers MTT tournament strategy from fundamentals through advanced ICM, bounty dynamics, and post-flop theory.

## 📚 Source Materials

| Material | Type | Content |
|---|---|---|
| Estudar dá Sorte Vol. 1 | Book | Fundamentals: EV, Pot Odds, Equity, Ranges, GTO Intro, Variance, Bankroll |
| Estudar dá Sorte Vol. 2 | Book | Softwares, RFI Ranges (cEV), Open Shove, Flat/3-bet, BB Defense, C-bet IP/OOP, ICM, Bounty Intro, Blind War |
| Estudar dá Sorte Vol. 3 | Book | MDA (Mass Data Analysis), ICM Practice, Advanced Post-Flop, 3-bet Pots, Squeeze, Check-Raise, C-bet Turn |
| 216 Range Tables | Reference | RFI + vs RFI charts for 14/17/20/30/50/100bb across all positions |
| ICM eBook | Reference | ICM theory, chip value asymmetry, Risk Premium, Bubble Factor |
| The NERD's Playbook | Reference | Stack-based strategy guide by theNERDguy (Yuri Dzivielevski) |
| Dicionário do Poker | Glossary | 200+ poker terms with definitions and examples |
| 20 Dossiês (#1–#21) | Case Studies | Specific hand analyses from tournament spots |

## 🗂️ Knowledge Base (`/docs/strategy`)

### Core Theory
- **[01-poker-math.md](docs/strategy/01-poker-math.md)** — EV, Pot Odds, Outs, Implied Odds, Equity (Crude/Realized/Robust)
- **[02-ranges-and-position.md](docs/strategy/02-ranges-and-position.md)** — Range types (Linear/Polarized/Condensed), RFI by position, stack depth influence
- **[03-preflop-strategy.md](docs/strategy/03-preflop-strategy.md)** — Open Raise, 3-bet, Flat, Open Shove, Push/Fold, vs RFI reactions by position and stack
- **[04-postflop-strategy.md](docs/strategy/04-postflop-strategy.md)** — C-bet IP/OOP, Bet sizing, Range/Nuts advantage, Donk bet, Probe turn, Check-raise

### Tournament-Specific
- **[05-icm-and-risk-premium.md](docs/strategy/05-icm-and-risk-premium.md)** — ICM model, Bubble Factor, Risk Premium, Risk Advantage, FT dynamics
- **[06-bounty-tournaments.md](docs/strategy/06-bounty-tournaments.md)** — Bounty Power (BPWR), Equity Drop, PKO/PSKO adjustments, multi-way all-in bounty
- **[07-final-table-play.md](docs/strategy/07-final-table-play.md)** — FT dynamics, Fake Shove, Open Raise FT, Resteal, BB Defense semi-FT

### Study & Meta
- **[08-gto-and-exploits.md](docs/strategy/08-gto-and-exploits.md)** — GTO foundations, Solver usage, MDA (Mass Data Analysis), Population tendencies
- **[09-study-methods-and-tools.md](docs/strategy/09-study-methods-and-tools.md)** — Study workflow, Software stack, Leak Finder, Drills, Session review
- **[10-glossary.md](docs/strategy/10-glossary.md)** — Comprehensive poker glossary (A–Z)

### Quick Reference
- **[claudecode_index.md](docs/strategy/claudecode_index.md)** — AI retrieval index for rapid concept lookup

## 🛠️ Project Docs

- **[docs/STATUS.md](docs/STATUS.md)** — single source of truth for what's actually shipped
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — phase log + prioritised punch list
- **[docs/PROMPT_GUIDE.md](docs/PROMPT_GUIDE.md)** — how to start a session with Claude / Gemini
- **[CLAUDE.md](CLAUDE.md)** / **[GEMINI.md](GEMINI.md)** — project spec (intent); stay in sync

## 🏷️ Conventions

- All poker terms in English (3-bet, C-bet, Equity, Fold Equity, etc.)
- Math formatted in LaTeX where applicable
- Source attribution: `[Vol.X]` = Estudar dá Sorte volume, `[D#N]` = Dossiê number, `[ICM]` = ICM eBook, `[NERD]` = NERD's Playbook, `[216R]` = 216 Ranges
