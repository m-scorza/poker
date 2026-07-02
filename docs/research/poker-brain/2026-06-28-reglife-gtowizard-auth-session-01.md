# RegLife / GTO Wizard Authorized Knowledge Session 01

Date: 2026-06-28  
Source posture: user-authorized licensed-private for RegLife; user-authorized private/tool-result for authenticated GTO Wizard view  
Usage status: RegLife = licensed-brand-neutral-use per user-stated express approval; GTO Wizard = internal study/validation target unless a separate license/public source allows direct reuse  
Raw material retained? no raw credentials/tokens/account data; screenshots stored locally under Hermes cache for this session only, not committed

## Inventory

| Source label | Source ID | Access posture | Content observed | Direct-use permission |
|---|---|---|---|---|
| RegLife member course dashboard | S-AUTH-REGLIFE-001 | User logged in directly; Hermes inspected visible page after authorization | Curriculum/module dashboard with course cards, search, notes/favorites/continue links, progress states | Brand-neutral direct use per user-stated RegLife approval |
| RegLife PokerTrainer preflop drill | S-AUTH-REGLIFE-002 | User opened trainer; tokenized URL intentionally not retained | Preflop table drill: UTG open, hero UTG1 action decision, stack/pot/action buttons | Brand-neutral direct use per user-stated RegLife approval |
| GTO Wizard authenticated preflop solutions view | S-AUTH-GTOW-001 | User account session visible; Hermes inspected page after authorization | Study/Solutions page with game tree metadata, preflop action/frequency/pot-odds UX | Internal study/validation target unless separate license/public source permits direct reuse |

## RegLife curriculum structure observed

The RegLife dashboard is organized as a progression of layered course blocks. Visible topics include:

### Principles / foundations

- Como estudar essa Camada
- Como estudar poker
- Calculando o EV
- Pot Odds, Outs & Implied Odds
- Conceitos de Equidade
- Tipos de range
- Por que apostar?
- Anatomia de uma mão
- Introdução ao GTO
- Carreira profissional
- Teste de Conhecimento

### MTT / tournament foundation

- O lucro nos MTTs
- Compreendendo a Variância
- Formatos de torneios
- Estratégias de registro
- Gestão de bankroll
- Sharkscope na prática
- Ranges de open raise em ChipEV
- Jogando short stack em ChipEV
- Defesa de Big blind
- ICM: teoria e prática
- Como jogar torneios bounty
- Carreira do jogador de torneio
- Poker ao vivo: aprendizados
- Teste de Conhecimento

### Professional / applied MTT topics

- Softwares essenciais
- Como usar o Hand2Note
- Enfrentando open raise
- Enfrentando uma 3-bet
- Blind war: jogando no Small Blind
- Blind war: jogando no Big Blind
- Introdução ao jogo pós-flop
- C-bet em posição
- C-bet fora de posição
- Jogando contra c-bet no BB
- Jogando contra c-bet em posição
- Impacto do ICM nos ranges pré-flop
- Ranges para torneios Bounty
- Teste de Conhecimento

### Advanced topics visible later in the dashboard

- Defesa de Big blind multiway
- Aplicando um Squeeze
- C-bet no Turn
- C-bet no River
- Probe bet turn no BB
- Bet versus missed c-bet
- Delayed c-bet
- Enfrentando um check-raise
- Pós-flop em pote tribetado
- Conceitos avançados de pós-flop
- Risk Premium na prática
- Como jogar heads-up
- Análise de dados em massa
- Teste de Conhecimento

## RegLife trainer spot observed

Visible trainer state:

- Street: preflop
- Prior action: UTG raises 2 BB
- Hero: UTG1, 15 BB stack
- Hero hand: ATo visible as A♥ T♠
- Other stacks/positions visible:
  - UTG: 13 BB after/opening action context
  - LJ/HJ/CO/BTN/SB/BB: 15 BB each
- Blinds/actions shown:
  - SB 0.5 BB
  - BB 1 BB
  - UTG open 2 BB
  - pot total 4.5 BB
- Available hero actions:
  - Fold
  - Call
  - Raise 5
  - Raise 6
  - Raise 7
  - All-in

Product implications:

1. A useful drill unit is not just `hand + position`; it is a full `spot packet`: street, prior action, positions, stack distribution, pot, hero hand, and legal action menu.
2. The UI separates action choices by color/urgency. A future app drill can use the same mental model without copying branding: blue fold, green passive continue, red aggressive actions.
3. The spot is ideal for validating `SpotPacket` because it requires stack-normalized position/action metadata and can be represented without raw hand-history text.
4. RegLife curriculum explicitly has “Enfrentando open raise” and trainer examples for vs-open decisions, making imported-hand leak tags like `FACING_RAISE`, `FACING_3BET`, blind-war, squeeze, and ICM-sensitive preflop spots strong study-queue categories.

## GTO Wizard authenticated preflop view observed

Visible GTO Wizard state:

- Area: Study / Solutions / Preflop
- Game tree context visible:
  - Hold'em
  - Cash
  - 100bb
  - 6max NL25
  - with cold calls
  - open size 2.5x
- Navigation/workflow exposed:
  - Play
  - Study
  - Practice
  - Analyze
  - Upload
  - Practice this spot
  - Saved spots
  - Reports / Flops
- Analysis panels visible:
  - Strategy
  - Ranges
  - Breakdown
  - Overview
  - Table
  - Equity chart
  - Actions with frequencies/combos
  - Pot odds explanation

Product implications:

1. Solver/study tools frame decisions with explicit configuration context: game type, stack depth, table size, stakes/profile, opening size, cold-call availability, and tree history.
2. A local app should not show a range grid or recommendation without a visible source/configuration panel.
3. `SpotPacket` should preserve enough metadata to recreate or search comparable external solver spots: game family, stacks, positions, action history, pot odds, target tool, and missing assumptions.
4. Good workflow bridge: after local import identifies candidate spots, send users to “Practice this spot” / “external review packet” rather than pretending the local rule/proxy output is solver-backed.

## Claims ledger candidates

| Claim | Evidence | Confidence | IP status | Product implication |
|---|---|---|---|---|
| RegLife curriculum sequence maps cleanly onto a product study taxonomy: foundations → MTT economy/career → preflop confrontation spots → postflop lines → advanced ICM/data/headsup. | S-AUTH-REGLIFE-001 | High | licensed-brand-neutral-use | Use this as a neutral Study Queue taxonomy and roadmap for leak categories. |
| RegLife trainer spots encode decisions as source-complete poker states: prior action, position, stacks, pot, hero hand, and finite legal actions. | S-AUTH-REGLIFE-002 | High | licensed-brand-neutral-use | Use this as the model for internal drill packets and imported-hand-to-drill conversion. |
| GTO Wizard solution pages emphasize explicit configuration and workflow state before showing strategy output. | S-AUTH-GTOW-001 | High | user-authorized private; internal study/validation target | Require configuration/source panels for any future solver/export UI; do not show solver-looking results without source/config context. |

## Immediate implementation candidates

1. Add a neutral study taxonomy doc or data seed based on the RegLife-approved sequence:
   - fundamentals,
   - MTT/career/economy,
   - preflop vs open / vs 3-bet / blind war / squeeze,
   - postflop c-bet / vs c-bet / turn/river lines,
   - ICM/bounty/risk premium,
   - data analysis.
2. Add `SpotPacket.reviewQuestion.actionMenu` later, so drills can preserve legal choices like fold/call/raise sizes/all-in.
3. Build an “imported hand → trainer card” UX: show hero hand, prior action, stack map, pot, available action class, and route to the relevant study module.
4. Keep GTO Wizard/HRC/ICMIZER as exact-validation targets that require visible source/config/result metadata before `solver_backed` labels.

## Validation needed

- Open individual RegLife lessons to extract full lesson-level concepts and range/charts under the stated brand-neutral permission.
- Verify whether RegLife trainer can expose answer feedback after selecting an action; if so, capture source-governed correction/explanation patterns.
- For GTO Wizard, inspect Analyze / uploaded hand status views after user opens them; record workflow/status taxonomy without bulk-copying proprietary solution grids unless permission is clarified.
