# Public Competitor Discovery Pilot — Poker Analyzer Market Map

Date: 2026-06-28  
Front: Competitors / market / positioning  
Access posture: public web pages only; no private poker-school material; no account-gated scraping.  
Research question: where can a local-first tournament hand-history analyzer compete without pretending to be a full HUD, global database, or solver?

## Executive read

The public market clusters into five product families:

1. **Tracker / HUD / database suites** — PokerTracker, Holdem Manager, Hand2Note, DriveHUD, Poker Copilot.
2. **Solver / trainer / range-library platforms** — GTO Wizard, RangeConverter, Deepsolver, DTO, Postflopizer, HRC Pro.
3. **ICM / push-fold tournament calculators** — ICMIZER, MTT Coach, HoldemResources Calculator (HRC).
4. **Bankroll / career / staking trackers** — Poker Bankroll Tracker, Poker Analytics, Pokerbase.
5. **Global tournament databases** — SharkScope and adjacent player-profile products.

The strongest wedge for this repo is not “beat the HUDs” or “be a solver.” The wedge is:

> **Private local MTT upload → data-health confidence → ranked leak/study queue → evidence-labeled explanations → career context.**

That wedge is reinforced by current shipped behavior: local import, parser confidence, leak/study queue, CareerScope-style local career metrics, and explicit evidence labels. The product should continue to avoid unsupported solver claims.

## Competitor matrix

| Product | Family | Audience | Core promise | Platform / data model | Public trust signal | Visible weakness / gap | Opportunity for this repo |
|---|---|---|---|---|---|---|---|
| PokerTracker 4 | Tracker/HUD | Online grinders, cash/SNG/MTT players | Comprehensive hand tracking, HUD, reports, LeakTracker, equity/ICM tools | Desktop database + imported hand histories + live HUD | Mature suite; 14-day trial; built-in equity/ICM tools | Heavy tracker/HUD mental model; setup/customization burden; less “coach me next” by default | Zero-config local post-session coach and trust-labeled study queue, not another HUD. |
| Holdem Manager 3 | Tracker/HUD | Cash and tournament online players | HUD + live play + post-game reports/leak review | Desktop hand database + live HUD | Long-lived product; free trial; lifetime license/update framing | Strong but complex database/report workflow | Translate reports into ranked next actions and MTT-specific study blocks. |
| Hand2Note | Advanced HUD/research | High-volume pros, population researchers | Highly customizable HUD, popups, custom stats, range research | Desktop HUD/database, Android-room support | 500+ stats, custom stat/filter editors, range research | Power-user product; not positioned as simple private MTT coach | Avoid custom-stat sprawl; prioritize digestible MTT leak lifecycle and confidence. |
| DriveHUD 3 | Modern tracker/HUD | Grinders wanting clearer HUD/reporting | Rebuilt tracking, MDA, integrated GTO analysis, report builder | Desktop HUD/tracker + free trial | “Find edges faster,” MDA, report-builder framing | Competes in HUD/database space; likely still setup/report heavy | Borrow clarity/report-builder lesson, not live HUD scope. |
| Leak Buster 2 | Leak detector add-on | NLHE cash players with PT/HM/DriveHUD DB | Analyzes 465+ cash-game leaks and recommends training | Add-on over existing tracker databases | Claims winning-player database comparison and training library | Explicitly cash-game only; not MTT/SNG/ICM | Own MTT leak detection: ICM, stack depth, blind defense, tournament summaries. |
| Poker Copilot 8 | Tracker/HUD + AI analysis | Mac/Windows players who want simpler tracker | HUD/tracker, hand replay, leak detection, SharkScope AI hand analysis | Desktop app, one-time purchase, SharkScope dependency for AI | One-time pricing; 14-day trial; SharkScope integration | AI analysis depends on external subscription; still tracker/HUD-shaped | Local private analysis with transparent evidence and no required global DB subscription. |
| GTO Wizard | Solver/trainer/analyzer | Serious study users, cash/PLO/MTT players | Analyze uploaded hands, study solver spots, train any spot | Cloud solver/library + upload analyzer | Largest solution-library/solver positioning; EV-loss sorting; hand quotas | Cloud subscription/quotas; unsupported hands and closest-solution matching must be understood | Adopt EV-loss/study workflow pattern while labeling local rule/proxy checks honestly. |
| GTO Wizard Analyzer help | Hand-history analyzer workflow | Users uploading sessions | Upload sessions, compare to closest solution, sort by EV loss, filter/replay/star hands | Cloud analyzer over supported sites/formats | Clear workflow docs; unsupported/duplicate/error status taxonomy | Not local/private; unsupported/matching limits are part of product | Data Health + evidence labels can be a local-first differentiator. |
| ICMIZER | ICM/push-fold | Tournament/SNG/Spin players | Push/fold, ICM/FGS/Nash analysis, hand replayer, MTT Coach | Desktop/web suite + subscriptions | Free trial; ICM/FGS tournament-specific calculator | Focused on short-stack/push-fold; manual exact-spot study mindset | Auto-detect candidate ICM/push-fold spots from imported hands, then route to study queue. |
| HoldemResources Calculator (HRC) | ICM/preflop solver + advanced solver | Tournament and cash-game study users | HRC Classic for short-stacked tournament calculations; HRC Pro for any-stack tournament/cash calculations and postflop analysis | Desktop solver; paid plans; free ICM calculator; docs cover push/fold, postflop, tree config, Monte Carlo sampling, frequency locks, scripting | Renowned solver; HRC Classic/Pro pricing and documentation; free ICM calculator up to 20 players/prizes | Powerful study tool that requires correct spot setup and solver literacy; not an automatic local hand-history leak queue by itself | Prime target for future solver-neutral `SpotPacket` export and exact validation of ICM/push-fold candidates. |
| DTO Poker | Trainer/range explorer | Cash and MTT study users | Simplified high-quality GTO solutions and trainer/explorer | Web/mobile trainer with cash and tournament products | “Created/tested by top players”; one subscription framing | Trainer-first; not a local hand-history/career analyzer | Keep drill UX simple: fewer charts, better study sequence from real hands. |
| RangeConverter | Range library/trainer | Multi-format GTO students | Range viewer, trainer, charts, downloads across many formats | Web/mobile range viewer/trainer + downloadable ranges | Large public usage counts; many game types incl. MTT/ICM/PLO | Library/trainer scope; less tied to a player's private upload/career context | Use internal ranges as evidence-labeled references, not a massive copied range library. |
| Deepsolver | Cloud solver/trainer | Solver users wanting custom/exploit work | Cloud solver in seconds, nodelocking, trainer, exploit comparison | Cloud browser app | Speed/no-hardware claims, pro testimonials | Solver claims require trust/cost; not local private upload workflow | Future integration target; for now label solver-like outputs as not solver-backed. |
| Postflopizer | Local-ish postflop solver | Players needing approachable solver | Custom simulations, nodelocking, quick mode, runs on PC CPU | Desktop solver under ICMIZER ecosystem | Beginner-friendly solver, direct CPU calculations | Solver setup still a separate study workflow | Possible later “export spot to solver” path, not immediate build. |
| SharkScope | Tournament database | Online tournament players, table selectors, backers | Global tournament stats, ROI/profit/ability, leaderboards, HUD/mobile | Provider/player database + searches/subscriptions | Claims broad online tournament tracking and many player metrics | Relies on external/global coverage; privacy and availability depend on sites | Local CareerScope can be private SharkScope-like self-profile from uploaded summaries. |
| Poker Bankroll Tracker | Bankroll/career mobile | Live/online players tracking sessions | Bankroll, sessions, staking/shares, deposits, variance, AI analysis | iOS/Android manual/session tracking + API/pro features | Detailed manual; multi-day tournaments; staking/share workflows | Manual entry heavy; not hand-history parser first | Auto-populate tournament/career stats from hand histories/summaries; support staking later. |
| Poker Analytics | Bankroll/career mobile | Live/online players with multi-domain tracking | Session, bankroll, reports, hand history, staking, custom fields | Mobile/session tracker; imports from many tools | Rich reports and import pathways | Broad tracking/accounting product, not MTT leak coach | Career page should learn from reports/calendar/location/staking but stay analysis-first. |
| Pokerbase | Bankroll/career/community | Tournament/cash players and stakers | Bankroll, staking packages, accounting, live updates, social sharing | iOS/Android mobile app, sync/imports | 30k+ users; testimonials; staking/accounting | Social/cloud/accounting emphasis; not private local hand-history analyzer | Later career-management/staking module; do not start with public social feed. |

## Product implications

### Build / emphasize now

1. **Local-first trust spine**: upload → data health → evidence labels → ranked study queue.
2. **MTT-specific leak lifecycle**: stack depth, ICM stage, bubble/final-table, blind-defense, push/fold, bounty context.
3. **Private CareerScope**: ROI, ABI, volume, streaks, form, bankroll trend from uploaded summaries; explicitly not global player-pool coverage.
4. **Unsupported/partial coverage honesty**: copy should sound more like GTO Wizard’s upload status taxonomy and less like universal solver claims.
5. **Study sequence over dashboards**: competitor tools expose many reports; our advantage is deciding what to study next.

### Do later, after validation

1. Staking/action/accounting workflows inspired by Poker Bankroll Tracker / Pokerbase.
2. “Export to solver” or “open in solver” spot packets for GTO Wizard / ICMIZER / HRC / local solver workflows.
3. Optional cloud/AI hand-analysis bridge, only if privacy posture and evidence labels stay clear.
4. Public comparison/pricing pages — blocked by current private/local gate unless user explicitly overrides.

### Avoid

1. Real-time HUD scope; it puts the product head-to-head with mature desktop trackers and site-policy friction.
2. Claims like “solver-backed” unless the specific decision actually came from a solver or licensed solution.
3. Global database promises like SharkScope without provider/player-pool data.
4. Copying competitor range charts, UX copy, or proprietary training content.

## Safe implementation candidates

| Candidate | Evidence | Safe abstraction | Acceptance criteria | Status |
|---|---|---|---|---|
| Competitor-aware product positioning note | Public competitor matrix above | Docs-only positioning guardrail: local/private MTT coach, not HUD/solver/global DB | Product docs say what the app is not competing as | Now |
| Upload status taxonomy | GTO Wizard Analyzer help + current parser confidence docs | Data Health labels for unsupported/partial/ready, not “analysis failed” only | Import UI can explain unsupported/duplicate/partial categories | Later; parser/UI scope |
| Career/staking roadmap item | Poker Bankroll Tracker, Poker Analytics, Pokerbase | Add local staking/action fields only after import reliability and user validation | Roadmap entry + interview prompt | Later |
| Solver export packet | GTO Wizard/ICMIZER/HRC/Deepsolver/Postflopizer | Export hand/spot context to external solver instead of claiming local solve | JSON/markdown spot packet, no solver claim | Later |
| MTT leak taxonomy expansion | Leak Buster cash-only gap + existing leak lifecycle | Tournament-specific leak graveyard/study queue entities | Tests for ICM/blind-defense/push-fold leak lifecycle | Later |

## Next recommendation

The next highest-value lane is a **solver-feasibility refresh** that answers:

- Which solver/tool integrations are viable locally vs cloud?
- What can be exported safely from a parsed hand?
- Which claims must remain “rule-based/proxy” until a real solver adapter exists?
- Can we create a solver-neutral `SpotPacket` format that later feeds GTO Wizard, ICMIZER, HRC, Postflopizer, or open-source solvers?
