# FACING_3BET Grading Proposal (Act III-3, Arc 3)

> **Status: PROPOSAL — awaiting owner approval of the ranges below.**
> Nothing in `src/` changes until the owner signs off (or red-pens) the grids
> in §4. Implementation sketch in §6 is pre-agreed scope, not started work.

**Goal (ROADMAP III-3):** replace the `FACING_3BET` compliance exclusion in
`src/analysis/rangeChecker.ts` with real grading, using ranges derived from
the private `poker-knowledge` vault's quiz answer keys — the "owner-approved
ranges" III-3 requires. `FACING_ALL_IN` (pot-odds + ICM) is **not** in this
proposal; it needs a different engine and stays excluded.

---

## 1. What the vault actually contains

The quiz DB (`quiz_database_summary.md`, Spots 12–13 "Enfrentando uma 3bet")
holds **25 point-sample answer keys**, not full grids, across six
(hero position, stack) cells — all 8-max, hero opened, villain 3-bet in
position behind (or from SB), pot ~11 BB at decision time:

| Cell | Hero | 3-bettor | Stack | Samples |
|---|---|---|---|---|
| C1 | UTG | CO | 50bb | AJo→FOLD · 55→CALL · 65s→CALL |
| C2 | UTG | CO | 25bb | K9s→CALL · A4s→CALL/ALL-IN · KJo→FOLD |
| C3 | CO | BTN | 25bb | 88→ALL-IN · AJo→CALL/ALL-IN · A8o→FOLD · K7s→CALL |
| C4 | CO | BTN | 50bb | TT→ALL-IN/4BET · A9o→FOLD/4BET · KTo→FOLD · AJs→CALL · 76s→CALL |
| C5 | BTN | SB | 25bb | ATs→CALL · AJo→ALL-IN · QTo→FOLD · K6s→CALL |
| C6 | BTN | SB | 50bb | 99→ALL-IN · A2s→CALL/ALL-IN · KJo→CALL · J8s→CALL · A7o→FOLD · K9o→FOLD |

Slash entries are **mixed-strategy answers**: either action is correct.

**Consequence:** a mechanical "extract the grid" is impossible — the samples
are anchors, and full 13×13 grids must be *constructed* around them. The
grids in §4 do exactly that, with per-class provenance so the owner can see
what is anchor-fixed, what follows the distilled KB
(`docs/knowledge/strategy/03-preflop-strategy.md` §5, `[Vol.2]`), and what is
interpolation that deserves a red pen.

## 2. Proposed bucketing

- **Stack buckets:** `≤15bb` → no grid needed: per KB §6/NERD, hero is
  committed at the 3-bet stage (3-bet = all-in territory); grade CALL/ALL-IN
  as compliant, FOLD as a flagged deviation only for premium classes —
  **simplest honest rule: keep ≤15bb EXCLUDED** (owner call, see Q1).
  `15–37.5bb` → the 25bb grids. `>37.5bb` → the 50bb grids. (37.5 is the
  geometric midpoint; a plain 40 is fine too — Q2.)
- **Position buckets:** hero UTG/UTG+1/MP1/MP2 → C1/C2 (EP grids); hero
  HJ/CO → C3/C4; hero BTN → C5/C6. Hero SB/BB facing a 3-bet after opening
  is rare (blind-war 3-bets are BLIND_WAR-adjacent) — **stays excluded**
  with the existing refusal reason (Q3).
- **3-bettor position is folded into the hero bucket** (the quiz only varies
  it in lockstep with hero position). A vs-blinds 3-bet plays tighter than
  the in-position grids assume; noted as a v2 refinement, not modeled now.

## 3. Grading semantics

- Compliant when hero's action ∈ the cell's allowed set. Mixed cells accept
  every listed action. ALL-IN and the two RAISE sizings both count as
  "4-bet" — sizing is not graded in v1.
- New deviation types: `VS3BET_OVERFOLD` (folded a continue hand) and
  `VS3BET_LOOSE_CONTINUE` (called/4-bet a fold hand). Both feed the existing
  leak pipeline denominators like other preflop deviations.
- Refusal-as-UI string changes from "no 3-bet-defence range yet" to a
  targeted reason only for the still-excluded pockets (≤15bb if Q1 stays
  excluded, hero-in-blinds, unknown opener position).

## 4. Proposed grids (the thing to approve)

Legend: **bold = quiz anchor (fixed)** · plain = KB §5-derived · ⚠ =
interpolated, owner judgment wanted. "4-bet" at 25bb means all-in (KB §5).

### C1 — EP vs 3-bet, 50bb
- 4-bet (value): AA, KK, QQ, AKs, AKo
- 4-bet (bluff mix): A5s–A4s
- Call: JJ–**55**–22, AQs, AJs, KQs, QJs, JTs, T9s, 98s, 87s, 76s, **65s**, 54s
- Fold: everything else — incl. **AJo**, KQo, ⚠ AQo (tight per EP open range;
  many pools call — flag if you want AQo=call), ⚠ ATs (call vs fold is close)

### C2 — EP vs 3-bet, 25bb
- All-in: QQ+, AKs, AKo, ⚠ JJ (mix all-in/call)
- Call: TT–22, ATs+, A5s–A2s (**A4s** may also jam), KTs+ incl. **K9s**,
  QTs+, JTs, T9s, 98s, 87s, 76s, 65s
- Fold: all offsuit broadways below AKo — incl. **KJo**, AQo ⚠ (anchor KJo
  folds; AQo at 25bb EP is genuinely close — flag), AJo, KQo; weak suited

### C3 — CO vs 3-bet, 25bb
- All-in: 88+ (**88**), AKs, AKo, AQs ⚠, **AJo** (mix call/all-in), AQo ⚠
- Call: 77–22, ATs–A2s, K7s+ (**K7s**), QTs+, JTs, T9s, 98s, 87s, 76s, 65s
- Fold: **A8o** and worse offsuit aces, KQo–KTo ⚠, QJo, weaker

### C4 — CO vs 3-bet, 50bb
- 4-bet (value): **TT**+, AKs, AKo
- 4-bet (bluff mix): A5s–A2s, **A9o** (anchor mixes fold/4-bet — either graded compliant)
- Call: 99–22, **AJs**, ATs, AQs, KQs, KJs, QJs, JTs, T9s, 98s, 87s, **76s**, 65s
- Fold: **KTo**, KJo ⚠, AJo ⚠ (close — flag), ATo, QJo, offsuit rest, weak suited

### C5 — BTN vs 3-bet (SB), 25bb
- All-in: 99+ ⚠, AKs–AQs ⚠, AKo–**AJo**, AQo
- Call: 88–22, **ATs**–A2s, K6s+ (**K6s**), Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, KQo ⚠
- Fold: **QTo**, JTo ⚠, ATo ⚠ (close given AJo jams — flag), weaker offsuit

### C6 — BTN vs 3-bet (SB), 50bb
- 4-bet (value): **99**+, AKs, AKo
- 4-bet (bluff mix): A5s–**A2s** (anchor mixes call/all-in — either compliant)
- Call: 88–22, AQs–A6s, AQo ⚠, **KJo**+, KTs+ ⚠, QTs+, **J8s**+, T8s+, 97s+, 87s, 76s, 65s, 54s
- Fold: **A7o**–A2o … ⚠ A9o/ATo close given KJo calls — flag, **K9o** and worse
  offsuit kings, QJo ⚠, weaker

## 5. Honesty guardrails

1. **Anchor-fidelity test:** the implementation ships a test that iterates
   all 25 quiz anchors verbatim and asserts the coded grids reproduce every
   answer (mixed answers → every listed action compliant). If a future grid
   edit breaks an anchor, CI fails. The anchors are transcribed into the
   test fixture — brand-neutral (hand, positions, stack, expected action),
   no RegLife naming, per the repo-relationship policy.
2. **Provenance stays in the ranges file** as structured data
   (`'anchor' | 'kb' | 'interpolated'`), so the UI can later expose
   confidence and audits can distinguish gospel from inference.
3. Owner may strike any ⚠ class to `fold`/`excluded` — a smaller true grid
   beats a bigger invented one.

## 6. Implementation sketch (after approval)

- `src/data/vs3betRanges.ts` — the six grids, action-set per hand class +
  provenance; same canonical hand-key notation as `ranges.ts`.
- `rangeChecker.ts` — replace the `FACING_3BET` exclusion branch with a
  `checkFacing3Bet(...)` mirroring `checkFacingRaise` (needs
  `openerPosition` → hero bucket; unknown → conservative null + warn).
- New deviation types in `types/analysis.ts`; leak pipeline pickup.
- Tests: anchor-fidelity suite (§5.1) + bucket-boundary + refusal-pocket
  regression (ungradedScenarios shrinks — update `ungradedScenarios.test.ts`,
  HandsPage refusal strip).
- Docs: KB `02-ranges` cross-ref, STATUS/ROADMAP tick, CLAUDE.md scenario
  table row update — same PR.

## 7. Questions for the owner

- **Q1:** ≤15bb facing a 3-bet — keep excluded (recommended), or grade
  "continue with premium else free pass"?
- **Q2:** stack boundary between the 25bb and 50bb grids — 37.5bb geometric
  or plain 40bb?
- **Q3:** hero opened from SB and faces a BB 3-bet — keep excluded in v1
  (recommended)?
- **Q4:** any ⚠ classes above you want moved (esp. AQo in C1/C2, AJo in C4,
  ATo in C5/C6)?
