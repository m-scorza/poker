---
status: open
date: 2026-06-12
related: ['#76', '#80', '#81', '#84', '#86', '#87']
---
# Principal Engineer / PM Audit — Poker Hand Analyzer

**Date:** 2026-06-12
**Branch audited:** `chore/docs-cleanup` (intentionally dirty working tree)
**Mode:** read-only review; this report is the only file produced by the audit.
**Author:** Claude (principal-engineer/PM audit session, multi-agent review)

**Evidence base:**

- Full test suite: 693 / 693 passing, 63 files, ~94s.
- `npx tsc -b --pretty false`: clean (exit 0).
- `npm run docs:check`: passing on the dirty tree.
- Graphify knowledge graph: 1,716 nodes / 3,179 edges / 125 communities.
- Three parallel deep-review agents (code quality, poker correctness, test/parser robustness).
- Manual line-by-line read of all 4,733 diff lines in the uncommitted working tree.
- Critical claims independently re-verified against source before inclusion
  (notably the uncalled-bet parser gap and the deleted ROADMAP residuals).

**Owner inputs that scoped this audit:**

1. v1.0 target user: MTT players only; cash games out of scope for v1.0.
2. "v1.0" means the whole product vision; private demos run first.
3. Stated bottlenecks, in order: (a) not enough hand histories → uncertainty;
   (b) low confidence in UI/UX.
4. Owner does not currently trust the analysis output; names postflop analysis
   and financial math as weakest. (This audit confirms both, and adds a third:
   parser chip accounting.)
5. Docs-cleanup intent: auditor's call; dive deep.

---

## Open items

Recovered to `main` on 2026-06-14 from the unmerged `chore/docs-cleanup` branch
(commit `b346101`); the body below is preserved verbatim as a 2026-06-12 snapshot.
None of this is tracked in STATUS/ROADMAP yet. Severities are **as reported on
2026-06-12** — re-verify against current `main` before acting (several UI findings
predate the 2026-06-11 reskin). Triage owner: repo owner.

- **Parser chip accounting — keystone (EPIC A).** `Uncalled bet (X) returned`
  is unhandled and raise lines record "BY" not chips-added, so `netProfit`,
  `heroChipsAfter`, `villainDeltas` and every bb-metric are wrong in contested
  hands. **Re-verified live on `main` 2026-06-14** (zero handling in
  `src/parser/`; 89 fixtures contain the line).
- **CQ-4 — per-hand parse failures invisible to the confidence ledger.**

Full detail and the rest: Executive summary, §1.3–1.5, and the §5 EPIC A–H
breakdown below. Flip `status: resolved` once these are tracked/closed.

**Addressed (in review):**
- CQ-1 fabricated UI stats — PR #80.
- CQ-2 100× VPIP/PFR display bug — PR #81.
- CQ-3 wedge-able import overlay — PR #84.
- Aggregate postflop counters — B2 phantom missed-c-bet in limped pots (PR #86)
  + B1 OOP checks vs the 100% HU c-bet target (PR #87).

## Executive summary

- **The single worst problem in the repo is parser chip accounting.**
  `Uncalled bet (X) returned to Y` lines are handled by no parser (verified:
  zero matches in `src/parser/`, while 89 fixture files contain them), and
  raise lines record the "raises BY" increment instead of chips actually
  added. Together these make `netProfit`, `heroChipsAfter`, and
  `villainDeltas` wrong in most contested hands, silently poisoning every
  bb-denominated output: bb/100, positional heatmap, nemesis/crusher,
  "costliest leaks" ranking.
- **The owner's distrust of postflop analysis and financial math is justified.**
  The postflop *spot-level* fixes from the correctness ledger hold, but the
  aggregate counters that drive headline leaks contradict them (OOP checks
  counted against a 100% c-bet target; phantom missed-c-bet flags in limped
  pots; cold-vs-3-bet folds graded as OVERFOLD). Financial math has real but
  smaller issues (PKO bounties inflate ITM; re-entries uncounted;
  "rake-adjusted ROI" inverted; fabricated hourly rate).
- **What is genuinely solid:** preflop frequency stats (VPIP/PFR/limp),
  WTSD/W$SD gating, position mapping, tournament-level $ PNL/ROI,
  the import-confidence ledger design, type discipline, upload security,
  and test coverage of the analysis layer (all 23 modules tested).
- **The uncommitted docs cleanup is a net improvement (~B+)** with five
  regressions, two of which would actively mislead a future agent
  (an archive-rotation policy whose first application violated it, and three
  still-open audit residuals deleted from ROADMAP as if done). Fix those and
  split the kernel behavior change into its own PR before merging.
- **Readiness:** ~65% toward the private demo round; ~35% toward v1.0
  "the whole deal". Realistic v1.0 timeline: **6–9 months** at current
  cadence (Dec 2026 – Mar 2027).
- **Strategy in one line:** stop building outward, make the existing numbers
  true, then let real users' files — acquired through the demo round — become
  both validation evidence and test corpus.

---

## 1. Code quality and anti-patterns

### 1.1 Architecture overview

The knowledge graph confirms a hub-and-spoke design around the parser's
domain types: `HeroDecision` (48 edges), `Hand`, `Position`, and `Tournament`
are the god nodes bridging parser → 22 analysis modules → pages. That is the
right shape for this product — analysis modules are small, single-purpose,
and almost all individually tested. There is exactly one import cycle
(`src/data/importRuns.ts` ↔ `src/data/store.ts`); benign, worth breaking
eventually.

### 1.2 What is genuinely good

1. **Type discipline is excellent.** `strict` + `noUncheckedIndexedAccess` +
   `noUnusedLocals/Parameters`; a dedicated `tsconfig.test.json`; exactly
   **one** `as any` in all of non-test `src/` (`RingHud.tsx:101`); zero
   `@ts-ignore` / `@ts-expect-error`. All external-input `JSON.parse` sites
   are wrapped and validator-guarded.
2. **The upload pipeline is security-conscious beyond its weight class:**
   declared-vs-actual ZIP size verification, cumulative decompression caps,
   batch caps, an import-sequence token neutralizing stale async results, and
   worker termination on unmount.
3. **Storage is disciplined:** documented Dexie upgrade chain, backfilling
   migrations, transactional bulk imports with dedup, retention-capped
   diagnostics ledger; `src/data/localStorage.ts` is model infrastructure code
   (versioned envelopes, injectable storage, quota-aware results).
4. **App shell does the right things:** lazy routes with Suspense, per-page
   ErrorBoundary, a correct TanStack Table + Virtual integration in
   `HandsTable`, a real focus trap in HandReplay.

### 1.3 Critical findings

| # | Finding | Where | Why it matters |
|---|---|---|---|
| CQ-1 | **Fabricated stats hardcoded in shipped UI.** "Lifetime profit +$388.85 · +141.4% ROI · 250 tourneys" is a string literal; the BB/100 ticker value `+4.2` is hardcoded; `verdictConf="Confidence: High"` is a literal; the sidebar identity hardcodes "scorza23 · Grinder · B+" despite hero name being configurable state. | `Sidebar.tsx:68-78`, `DashboardPage.tsx:125,158` | For a product whose thesis is *trust*, permanently displayed fake numbers are disqualifying. One noticed fake stat discounts every real one. |
| CQ-2 | **100× display bug:** CareerPage multiplies already-percentage VPIP/PFR by 100 again — 25% VPIP renders as "2500". | `CareerPage.tsx:578` vs `villainClassifier.ts:95-104` | Visible wrongness; smoking gun for the duplication problem (1.4). |
| CQ-3 | **Import success path can wedge the UI forever.** `worker.onmessage` is `async` with no try/catch around `importHands()` / `importTournamentSummaries()`; a Dexie failure (quota, private mode) becomes an unhandled rejection and the "Do not close this page" overlay never clears. Same pattern in `worker.ts:15-17`. | `HandsUpload.tsx:285-350` | Worst possible failure mode for the one flow every user must complete. |
| CQ-4 | **Per-hand parse failures invisible to the confidence ledger.** Failed hand blocks are `console.warn` + skip; never increment `ImportSummary.warnings` or downgrade confidence. A file where 30% of hands fail still reports "high confidence". | `pokerstars.ts:87-91`, `ggpoker.ts:289`, `workerProcessor.ts:165-183` | Directly defeats the import-confidence feature — the product's flagship trust mechanism. |

### 1.4 High / systemic

- **No derived-data layer.** Every page does full-table `toArray()` scans and
  re-runs `batchCheckCompliance` + leak detection in render-time `useMemo`s
  on every mount (`DashboardPage.tsx:27-66`, `CareerPage.tsx:69-74`,
  `SessionsPage`, `HandsPage`, `LeaksPage`, `RangesPage`). `useLiveQuery`
  pages re-run the whole pipeline when *any* row changes — starring one hand
  re-analyzes the Dashboard. Fine at 10k hands; an architectural ceiling at
  "serious study platform" scale.
- **Half the Zustand store is dead**, including `setActiveSessionId` — never
  called anywhere, so `activeSessionId` is permanently `'all'` and the
  session-filter branches on Dashboard/Hands are unreachable code that still
  pays its compute cost (`appStore.ts:40-47,106-108`).
- **Copy-paste business logic already diverging:** three different "nemesis"
  implementations with different semantics (`CareerPage.tsx:148-200` twins vs
  `sessions.ts:105-149`); duplicated data-health banners
  (`CareerPage.tsx:298-326` ≡ `LeaksPage.tsx:128-156`); three
  confidence-badge color maps inside `HandsUpload.tsx` alone. CQ-2 is the
  predictable cost.
- **Synchronous equity calculation inside JSX:** `OddsCalculator.calculate()`
  re-runs on every HandReplay re-render with no memo
  (`HandReplay.tsx:568-621`). Multiway all-ins — the hands users actually
  replay — are the expensive case.
- **Dead heavy dependencies:** `three`, `@react-three/fiber`,
  `@react-three/drei` imported nowhere; `@types/*` in `dependencies`.
  ZIP decompression runs on the main thread (`HandsUpload.tsx:196-259`).

### 1.5 Medium / low (abbreviated)

- `dangerouslySetInnerHTML` for plain internal strings
  (`DashboardPage.tsx:173`, `MonumentCurve.tsx:87`).
- ArenaPage: C-bet Clinic drill never filters its pool (drills random preflop
  spots under a postflop label); `alert()` instead of ConfirmDialog; one dead
  ternary (`ArenaPage.tsx:52-64, 67, 254`).
- `searchParams.get('tab')` cast to a union without validation → arbitrary
  `?tab=x` renders an empty page (`CareerPage.tsx:58`).
- Config files neither typechecked nor linted (tsconfig includes only `src`;
  eslint ignores `*.config.*` and all tests).
- `'scorza23'` hardcoded as fallback in 8 production-source locations.
- Dead export `handExists` (`store.ts:112`); `VillainsPage` silently caps at
  100 rows; cosmetic `CursorHalo` runs a perpetual rAF loop.

---

## 2. Audit of the uncommitted documentation changes

**Verdict: net improvement — roughly a B+.** Direction right, execution ~85%
clean, but it ships five regressions, two of which would actively mislead a
future agent. **Do not merge as-is.**

### 2.1 What improved

1. **`GOALS.md` is the best new document in the repo.** It fills the
   direction-vs-fact gap, and the truth order
   (`code → STATUS → GOALS → BOARD → CLAUDE → ROADMAP`) is now stated
   *identically* in CLAUDE.md, AGENTS.md, and docs/README.md.
2. **CLAUDE.md went from a 293-line drifting spec to a 148-line routing
   guide** with an explicit "What Not To Put Here" section. Deleted content
   (position tables, scenario matrix, bug ledger) all lives in owning files;
   verified zero dangling references to any deleted doc.
3. **Brand-name neutralization is thorough and consistent** across every
   active tracked doc; `IP_COPY_AUDIT.md` keeps the lesson, drops the
   liability.
4. **Dead persona docs converted to pointer stubs, not deleted**
   (`AI_COLLABORATION.md`, `.agents/agents.md`) — correct for files old
   prompts may still reference.
5. The 2026-06-12 Codex handoff entry is high quality: scoped, verified,
   honest about its own two known gaps.
6. `workers.json` + dry-run-first `agent-dispatch.ps1` is sensible plumbing;
   `docs:check` and `validate-protocol` pass on the dirty tree.

### 2.2 Regressions — fix before merge

| # | Regression | Severity | Required action |
|---|---|---|---|
| D-1 | **The new archive policy describes a rotation that never happened.** Policy says long history moves to ignored `.agents/history/` — that directory **does not exist**. The 2,470 lines of handoff archives were deleted outright (recoverable via git, but the handoff entry claims rotation). | High | Create `.agents/history/` and actually move the two archives there, **or** amend the policy text + archive README to say "removed; recover via git history of `docs/agents/archive/`". |
| D-2 | **ROADMAP deleted three still-open audit residuals as if done.** Verified still live: `bountyAnalyzer.ts:144` hardcoded 1500 starting-stack fallback; `store.ts:102` bare `db.version(4).stores({})` sentinel; colon-in-player-name regex issue. Now tracked **nowhere**. | High | Restore them in ROADMAP or the STATUS ledger. |
| D-3 | **A real governance change rides a docs branch.** `agent-kernel.cjs complete` no longer blocks on out-of-scope/untracked files — it warns; the test was rewritten to bless it. Defensible rationale, but it was the only *automated* scope check in the multi-agent setup. | Medium | Split: PR A = docs; PR B = kernel change + dispatcher + test, with the tradeoff stated in the PR body. Consider keeping untracked-file blocking even if scope blocking becomes warnings. |
| D-4 | STATUS.md verification header weakened: "693/693 passing" → "docs check + focused agent-kernel tests". Honest, but it's the headline fact — and the full suite passes today (693/693 verified 2026-06-12). | Low | Update the header before merge. |
| D-5 | `IP_COPY_AUDIT.md` replaced the concrete findings table with a prose summary — auditability traded for cleanliness. | Low / accept | Optional: add one line pointing at the git history for the original table. |

---

## 3. Product feasibility, readiness, timeline to v1.0

### 3.1 Feasibility

Achievable. The hard parts are demonstrably within reach: a parser that
handles a real 250-file pt-BR-locale corpus, a fully test-covered analysis
layer, a mechanically enforced privacy boundary, and unusually good
docs/process discipline. The caveat: the core promise — "trustworthy numbers
from your hands" — is currently false, due to a small number of fixable
correctness bugs. Feasibility risk is concentrated in execution discipline,
not technical possibility. MTT-only scope materially helps; cash would
roughly double the correctness surface.

### 3.2 Readiness scorecard

(The repo's own 2026-06-02 estimate was 42%; this audit refines it into two
numbers because there are two finish lines.)

| Area | Score | Driving facts |
|---|---|---|
| Parser — metadata (IDs, buy-ins, currencies, variants) | 80% | 250-fixture sweep, pt-BR locale handling, site detection, size guards |
| Parser — **chip flow** | **25%** | Uncalled bets unhandled (89 fixture files contain them); raise investment recorded wrong |
| Preflop frequency stats (VPIP/PFR/limp, WTSD/W$SD) | 85% | Correct denominators, sample gates; would match PT4 within noise |
| Postflop analysis | 40% | Spot-level fixes hold; aggregate counters contradict them |
| Leak detector credibility | 35% | Four false-positive families; count-based "confidence" |
| Financial math | 55% | $ PNL/ROI sound; ITM inflated by PKO bounties; re-entries uncounted; rake-adjusted ROI inverted |
| Import trust surface | 50% | Excellent file-level ledger undermined by invisible per-hand drops + fake UI stats |
| UI/UX | 60% | Fresh design-system port, real virtualization; unvalidated, fake stats, 100× bug, wedge-able overlay |
| Performance / scale | 45% | Fine to ~10k hands; no derived-data layer beyond |
| Validation evidence | 10% | Plan written, zero interviews run |
| Backend / accounts / sharing / payments | 5% | Deliberately unstarted (correctly) |
| Process / docs / CI | 85% | Genuinely strong |

**Composite: ~65% demo-ready, ~35% v1.0-ready.**

### 3.3 Timeline (solo founder + agent workers, current cadence)

| Milestone | Definition | Estimate |
|---|---|---|
| **M1 — Numbers tell no lies** | Chip-flow fix + conservation sweep; leak false-positive families fixed; fake UI stats removed; import failures visible | 3–4 weeks |
| **M2 — Demo round** | 6-user validation on the M1 build; consented hand-history contributions collected | weeks 5–7 (overlaps M1 tail) |
| **M3 — Trust-complete local product** | Demo findings triaged; financial math honest; derived-data layer; UX state polish | months 2.5–4 |
| **M4 — v1.0 "whole deal"** | Accounts/backend per the privacy design the docs already demand; sharing/export boundary; payment if validated | months 6–9 |

Honest v1.0 range: **6–9 months → December 2026 – March 2027.** Biggest
schedule risk is M2, not engineering: if six users find the leak output not
credible, M3 grows — which is why M1 must precede demos. Six first
impressions are the scarcest resource available.

---

## 4. Strategic approach (if taking over)

**One line: stop building outward, make the existing numbers true, then let
real users' files — acquired through the demo round — become both validation
evidence and test corpus.**

1. **Fix chip flow before anything else, including UI.** Every bb-denominated
   output is currently wrong in most contested hands. It's a small fix with
   an enormous trust payoff.
2. **Turn the fixture corpus into an invariant engine (attacks bottleneck #1).**
   You can't conjure more hand histories, but a chip-conservation invariant
   (`sum(invested) == pot + uncalled returns`, per hand, across all ~3,285
   fixture hands) extracts ~10× more verification from the corpus you have.
   Current oracles only check tournament IDs and buy-ins — which is why the
   chip bug survived 693 green tests.
3. **Make the demo round a data-acquisition operation.** The consented,
   sanitized `contributionPackage` flow already exists; every opt-in
   participant grows the fixture corpus with hands from a client
   locale/format you don't have.
4. **Treat leak-detector false positives as P0 product bugs.** A reg
   spot-checks the first OVERFOLD flag; if it's a correct fold vs a 3-bet,
   the product is dead to them in one click. Priority inside the analysis
   layer: false positives → missing denominators → missing stats
   (hero fold-to-c-bet is currently unmeasured).
5. **For UI/UX confidence (bottleneck #2): validate, don't redesign.** The
   design-system port just landed; the cheapest path to confidence is the
   already-written `USER_VALIDATION_PLAN.md`, executed. No further visual
   iteration until those notes exist.
6. **Sequence v1.0 expansion behind evidence gates, exactly as GOALS.md says.**
   Backend after demos prove retention intent; payments after someone prices
   a named outcome.
7. **Process: one correctness PR at a time, each with a regression test, each
   updating the STATUS ledger.** The 14-entry fixed-bug ledger proves the
   muscle exists. Split mixed code/docs branches (see D-3).

---

## 5. Epic / ticket breakdown with deep walkthroughs

Sequencing principle: **Epic H unblocks the branch → Epics A+C make the demo
honest → B makes it credible → D+E run the demo and harvest data → F removes
the scale ceiling → G is v1.0 expansion.** Estimates assume owner + agent
workers; tickets are deliberately scoped to be dispatchable.

---

### EPIC H — Land `chore/docs-cleanup` properly *(now; ~1 day)*

*Why: it is the open transaction blocking everything else, and as written it
ships two doc lies (D-1, D-2).*

**H1 — Split the branch into two PRs.**
*How:* PR A = all docs/`.agents` markdown + `.gitignore`; PR B =
`agent-kernel.cjs` behavior change + `agentKernel.test.ts` +
`agent-dispatch.ps1` + `workers.json`, with the scope-gate tradeoff stated in
the PR body.
*Acceptance:* two PRs, each green, each honestly titled; kernel change is
reviewable on its own. *(2h)*

**H2 — Restore the three deleted ROADMAP residuals.**
*How:* re-add to ROADMAP (or the STATUS ledger): `bountyAnalyzer.ts:144` 1500
fallback; `store.ts:102` `version(4)` sentinel comment-or-remove; colon-name
regex note.
*Acceptance:* each open issue tracked in exactly one truth doc. *(1h)*

**H3 — Make the archive policy true.**
*How:* either create `.agents/history/` and move the two deleted archives
there before the deletion lands, or amend `HANDOFF_PROTOCOL.md` + the archive
README to say "removed; recover via git history".
*Acceptance:* the policy's first application no longer violates it. *(1h)*

**H4 — Update the STATUS verification header.**
*How:* full suite verified 693/693 on 2026-06-12; one line. *(10m)*

---

### EPIC A — Make the money true *(weeks 1–2; the keystone)*

**A1 — Fix raise accounting + handle `Uncalled bet returned`.** *(3d)*

*Why:* `totalInvested` (`pokerstars.ts:213`) has three correct feeders
(calls, bets, blinds are phrased as chips-added) and one wrong one: raises
add `raiseMatch[2]` — the "raises BY" increment over the previous bet level —
at line 386, when chips actually added are
`toAmount − thisPlayer'sStreetInvestment`. And no parser has an uncalled-bet
branch, so returned chips vanish from net. The two errors cancel exactly in
an uncalled open-steal (why spot checks looked fine) and nowhere else.

*Worked example (blinds 25/50):* hero opens "raises 50 to 100", BB calls,
hero bets 150 on the flop, BB folds, "Uncalled bet (150) returned to hero",
"hero collected 225". True net **+125**. Current parser: invested 50+150=200,
net **+25**.

*How:*
1. Add `streetInvested: Map<string, number>` beside `totalInvested`; clear it
   in each `*** FLOP/TURN/RIVER ***` branch (lines 227–245).
2. Feed per action type:

   | Line | `totalInvested` | `streetInvested` | Note |
   |---|---|---|---|
   | ante (`:274`) | `+= amt` | **no** | antes don't count toward the bet level |
   | SB/BB/button blind (`:290,306,322`) | `+= amt` | `+= amt` | blinds do count (BB facing "to 100" only adds 50) |
   | call (`:369`) | `+= amt` | `+= amt` | already an increment |
   | bet (`:402`) | `+= amt` | `+= amt` | first wager = increment |
   | **raise (`:386`)** | `+= totalCents − (streetInvested.get(name) ?? 0)` | `set(name, totalCents)` | the fix |

3. Add to the action loop:
   `RE_UNCALLED = /^Uncalled bet \(\$?([\d.,]+)\) returned to (.+)$/` →
   `addInvestment(name, -cents)`.
4. "and is all-in" variants flow through the same branches — covered
   automatically.
5. Mirror in `ggpoker.ts` (same phrasings). OHH is structured JSON,
   unaffected.
6. Downstream (`heroChipsAfter`, `netProfit`, `villainDeltas`) needs **zero
   changes** — the bug lives entirely at the source.

*Acceptance:* synthetic regression test pinning the worked example
(+125, not +25, both numbers in the test name); second case where hero posted
SB then raises ("raises 75 to 100" after posting 25 → chips added 75);
GGPoker twin test; A2 invariant green.

**A2 — Chip-conservation invariant sweep.** *(1.5d)*

*Why:* highest leverage-per-line in the plan. ~3,285 real fixture hands
currently verify only metadata; this turns every raise size, side pot, and
uncalled river bet into a permanent money-math oracle — the only scalable
answer to "not enough hand histories" that doesn't require new files.

*How:* new test walking every fixture under
`src/test/fixtures/pokerstars/hh/`; per hand assert
`Σ totalInvested(all players) === Total pot` (SUMMARY line; tournaments rake
0; side-pot hands phrase `Total pot 1000 Main pot 600. Side pot 400.` — the
leading total is the target). 0-cent tolerance (money layer is integer
cents). Failures reported as `handId: invested=X pot=Y delta=Z`.

*Acceptance:* the test exists, initially **expected to fail** — the failure
triage list is the deliverable; after A1 (+ any newly exposed line-type
fixes), green across the corpus and wired into CI.

**A3 — Surface skipped hand blocks.** *(1.5d)*

*Why:* today a file where every hand block fails still reports
"high confidence — ready" (CQ-4). This closes the worst hole in the import
trust story with minimal plumbing.

*How:* (1) per-block catch in `parsePokerStarsFile` (`:87-91`) and GGPoker
(`:288`) counts instead of just warning; return `{hands, skippedBlocks}`.
(2) in `workerProcessor.ts:165-183`, `skippedBlocks > 0` → push warning
`"N hand blocks could not be parsed in <file>"` + downgrade confidence one
tier. Ledger and Data Health panel render it with zero further changes.
(3) tighten `fixtureSweep.test.ts`'s ≥50%-of-headers tolerance to
`parsed + duplicates === headerCount`.

*Acceptance:* a fixture with one corrupted block yields a visible warning and
medium confidence; sweep is exact-count.

**A4 — Re-entry accounting + honest ITM.** *(2d)*

*Why:* re-entries are parsed nowhere → understated cost → overstated ROI/PNL
(routine, material for MTT regs). `hasTournamentCash` counts bounty-only
revenue as a cash (`financials.ts:17-28`) → inflated ITM and streaks in PKOs.

*How:* parse re-entry evidence from tournament summaries (entry counts /
repeated buy-in lines); multiply cost basis. ITM = `prize > 0`; bounties stay
in revenue/PNL only.

*Acceptance:* synthetic re-entry summary fixture doubles cost basis; PKO
bust-out-with-one-bounty hand is not ITM; careerScope/careerStats/streaks
agree.

**A5 — Fix misleading derived financials.** *(1.5d)*

*Why/How:* "rake-adjusted ROI" (`careerStats.ts:264-273`) currently *removes
rake from the cost basis*, inflating ROI — invert to the standard
`(rev − buyin − fee)/(buyin + fee)` or rename precisely. Hourly rate
(`careerStats.ts:253-262`) is fabricated from a 75-hands/hr constant — label
"rough estimate" or drop. Session money double-count (`sessions.ts:92-101`):
full tournament buy-in+prize attaches to every session containing any hand of
that tournament — attribute to the session containing the tournament's last
hand, or split proportionally.

*Acceptance:* unit tests for each formula; UI copy matches the math.

---

### EPIC B — A leak detector that survives a reg's scrutiny *(weeks 2–4)*

*Why as an epic: false positives are how study products die. Priority order
inside the epic: insulting flags (B4) → contradictory flags (B1–B3) → fake
confidence (B5) → calibration (B6, B7) → missing stats (B8) → legacy paths
(B9) → honesty labels (B10).*

**B1 — Position-aware c-bet opportunity.** *(1d)*
*Why:* `cbetOpportunity` (`scenarioDetector.ts:285-286`) is position-blind
while the spot-level fix (`postflopAnalyzer.ts:261`) requires
`heroInPositionOnFlop`; with game_plan's `cbetHU {min:100}` threshold, one
justified OOP check in ten → **critical** "Missed c-bets HU" leak, while
HandReplay shows nothing wrong with the same hand. An internal contradiction
users will notice.
*How:* gate the aggregate counter on the same position logic the spot uses
(the B4 action scan already computes hero's flop position); revisit the 100%
target.
*Acceptance:* OOP-check hand increments neither opportunity nor miss; IP
check still counts; leak severity recomputed on fixtures.

**B2 — Require villain-was-PFR for `BET_VS_MISSED_CBET`.** *(0.5d)*
*Why:* fires in limped pots (`postflopAnalyzer.ts:274-289`) — HU
blind-vs-blind limped pot, villain checks, hero checks back →
`isCorrect:false` "missed exploit vs missed c-bet"; ≥5 instances → high
severity leak. There was no c-bet to miss.
*Acceptance:* limped-pot fixture produces no spot; single-raised pot still
does.

**B3 — Double-barrel gating.** *(1d)*
*Why:* `doubleBarrelOpportunity = cbetMade && boardTurn` ignores flop raises
and position — hero c-bets, gets check-raised, calls, checks turn → counted
as missed double barrel.
*How:* opportunity requires c-bet *called (not raised)* and hero facing a
check / first to act on the turn.
*Acceptance:* check-raised line produces no opportunity; standard
cbet-call-check line does.

**B4 — Add `FACING_3BET` scenario (the false-OVERFOLD generator).** *(2d)*
*Why:* ≥2 raises before hero is still `FACING_RAISE` with `openerPosition` =
first raiser (`scenarioDetector.ts:137-194`); `checkFacingRaise` grades
against a vs-single-open range → folding AQo cold vs open+3-bet flagged
OVERFOLD. Also pollutes `threeBetOpps`. One spot-checked example of this and
a competent player closes the tab.
*How — stage 1 (this ticket):* count non-all-in raises before hero; ≥2 → new
scenario `FACING_3BET`; rangeChecker excludes it from compliance (like
`FACING_ALL_IN` already is); leakDetector removes it from `threeBetOpps`.
Silence beats error — consistent with the GOALS.md evidence philosophy.
*Stage 2 (separate, post-demo, optional pre-v1):* author real vs-3-bet
ranges with the same conservative-baseline approach as the MP1 fallback.
*Acceptance:* cold-vs-3-bet fold fixture produces no deviation and no 3-bet
opportunity; single-raised pots unchanged; scenario label visible in
HandReplay.

**B5 — Real denominators + confidence for postflop leaks.** *(1.5d)*
*Why:* `postflop_*` leaks trigger on raw error counts (≥2 leak, ≥5 high) with
no opportunity denominator, and `calculateLeakConfidence` receives the
*error* count as "sample" — 30 errors at any frequency reports "high
confidence". A 95%-c-bet player accumulates a permanent high-severity leak on
volume alone.
*How:* rate = errors/opportunities vs profile threshold; confidence from
opportunity count.
*Acceptance:* 5 errors / 200 opportunities → no leak; 5 / 12 → leak;
confidence string reflects opportunities.

**B6 — BB suited-fold calibration.** *(1d)*
*Why:* rule applies up to 5x opens and to all suited junk — J3s folded vs a
4bb open is flagged. Convention says "vs normal 2–3x opens".
*How:* window < ~3.5–4x; exclude bottom suited junk vs larger sizings within
the window.
*Acceptance:* J3s vs 4x → no flag; 96s vs 2.2x → flag; threshold cases
pinned in tests.

**B7 — AF honesty.** *(1d)*
*Why:* "AF" = (c-bets + barrels + preflop first-action raises) / preflop
first-action calls — not AF — judged against real-AF targets (2.0–3.0).
*How:* either compute true AF (include postflop calls/bets/raises) or rename
the metric and re-derive its threshold.
*Acceptance:* metric name, formula, and threshold agree;
METRICS_DICTIONARY updated in the same PR.

**B8 — Add hero fold-to-c-bet.** *(1.5d)*
*Why:* the most standard MTT leak; thresholds already exist
(`strategyProfiles.ts:124`) and villains get the stat (`store.ts:544-566`),
but `computeAggregateStats` has no hero counter — invisible.
*How:* count hero-facing-c-bet opportunities and folds in the postflop action
stream; wire to existing thresholds; sample-size gate like other leaks.
*Acceptance:* synthetic over-folder triggers it; denominators in tests.

**B9 — Fix HandReplay legacy fallback.** *(1d)*
*Why:* for stored decisions lacking `postflopActions`,
`HandReplay.tsx:127-150` recomputes with the **final** pot (understating
c-bet sizing fractions) and passes the flop even when hero folded preflop —
resurrecting a fixed bug for legacy data.
*How:* gate the fallback on `sawFlop`; compute pot-before-street via the
existing `computePotBeforeStreet`; or simply show "re-import for postflop
analysis" for legacy rows.
*Acceptance:* legacy hero-folded-preflop hand renders no postflop spots.

**B10 — ICM stage honesty.** *(1d)*
*Why:* the stage heuristic is a score ladder with no field-size data — level
11 + short average stacks ⇒ "bubble" even mid-way through a 1,000-runner
field; 3-max/HU formats can never reach `final_table` (`maxSeats >= 6` gate).
Per-decision flow itself is verified fixed (STATUS issue 13).
*How:* UI labels the stage as an estimate ("Likely bubble (estimated)");
use field/entry data where summaries provide it; document the heuristic's
limits in METRICS_DICTIONARY.
*Acceptance:* no unqualified "Bubble" badge; advanced-profile
`foldSuitedAcceptable` consumers unchanged functionally.

---

### EPIC C — A UI that tells no lies *(week 1, parallel with A)*

**C1 — Remove or compute the fabricated stats.** *(1d)*
*Why:* CQ-1. *How:* sidebar lifetime profit/ROI → compute from
`careerScope` or remove the block; BB/100 ticker → real value (post-A1) or
drop the tile; `verdictConf` → derive from sample-size confidence; identity
card → `heroName` from store, drop "Grinder · B+" until a real rating
exists. *Acceptance:* `grep -rn '388.85\|141.4\|Grinder'` returns nothing;
every dashboard number traceable to a computed source.

**C2 — Fix the 100× VPIP/PFR + consolidate pct formatting.** *(0.5d)*
*How:* `CareerPage.tsx:578` uses the same `pct()` as VillainsPage; one shared
helper. *Acceptance:* RTL assertion that a seeded 25%-VPIP villain renders
"25", not "2500".

**C3 — Un-wedge-able imports.** *(1d)*
*Why:* CQ-3 — the overlay state machine has no failure terminal state.
*How:* add `importError` state; wrap the `await importHands()/...` block
(`HandsUpload.tsx:307-310`) in try/catch → set error, clear `importing`,
and state the partial-import fact ("3 of 5 files saved — re-importing is
safe; duplicates are skipped by hand ID" — dedup already makes this true,
say it). Top-level try/catch in `worker.ts` onmessage posting `FATAL_ERROR`;
handle in component. *Acceptance:* mocked Dexie failure → visible error,
overlay cleared, retry possible.

**C4 — Remove `dangerouslySetInnerHTML`.** *(0.5d)*
*How:* both sites render plain strings — use text rendering, as LeaksPage
already does for the same field.

**C5 — Deduplicate nemesis logic + data-health banner.** *(1d)*
*Why:* three nemesis implementations with different semantics is how the next
CQ-2 happens. *How:* one function in `sessions.ts` (decide the semantics —
the gated-on-`heroNet<0` version is the defensible one); extract
`<DataHealthBanner>`. *Acceptance:* one implementation, one banner component,
both consumers render identically.

---

### EPIC D — Hand-history acquisition engine *(weeks 3–6; bottleneck #1)*

**D1 — Golden-pipeline integration test.** *(1.5d)*
*Why:* no test crosses the save boundary — dedup-on-save, summary merge, and
buy-in preservation are unverified against real parser output.
*How:* vitest + fake-indexeddb: feed two fixture files (one overlapping) →
`processWorkerFiles` → `importHands` → query one aggregated stat.
*Acceptance:* saved counts and the stat asserted; overlap deduped.

**D2 — `HandsUpload.tsx` component tests.** *(1.5d)*
*Why:* the single most trust-critical untested file (ZIP guards, worker
wiring, error rendering, `saveImportRun`).
*How:* RTL with a mocked Worker posting FILE_ERROR + COMPLETE.
*Acceptance:* rendered errors asserted; `importHands`/`saveImportRun` call
assertions; C3's failure path covered.

**D3 — Contribution packages wired into the demo protocol.** *(1d + demos)*
*Why:* the only sustainable answer to the hand-history bottleneck.
*How:* end-of-session consented export via the existing `contributionPackage`
builder (sanitization + forbidden-marker checks already tested); imported
packages become fixtures + invariant coverage.
*Acceptance:* documented operator steps in `docs/validation/`; first
contributed package lands as fixtures.

**D4 — Port the two missing assertions from the Downloads copy.** *(0.5d)*
*Why:* `c:\Users\MICRO\Downloads\poker-claude` is a stale pre-fix snapshot;
the only value not already in the repo is two format assertions (Zoom-HU
`2-max`, Cap `6-max`). *How:* one-line additions to fixtureSweep; the
Downloads folder can then be deleted (user action, outside the repo).

**D5 — GGPoker fixture sweep (or de-claim).** *(1.5d)*
*Why:* PARSER_HEALTH's headline table shows GG "53/53" while the sweep is
`describe.todo` — the numbers aren't regression-guarded.
*How:* implement the ZIP sweep with jszip in-test, **or** move the GG row out
of the headline table into a "previously audited, not currently guarded"
note. *Acceptance:* the doc claims exactly what tests enforce.

**D6 — Fixture gaps.** *(1d)*
*How:* one real PKO HH file (bounty lines) with a sweep oracle; synthetic EUR
and ticket-buy-in hands in `sample-hands.ts`; siteIdentifier test for an
unknown room with a bare `Hand #` (currently falls through to the GGPoker
parser, `siteIdentifier.ts:65`).

---

### EPIC E — UX confidence *(weeks 5–7; bottleneck #2)*

**E1 — Execute `USER_VALIDATION_PLAN.md`.** *(2–3wk elapsed)* — see §6
playbook.
**E2 — Per-page stat smoke assertions.** *(1.5d)* — RTL per page asserting
one known stat from demo-seed data; catches display-layer wrongness (CQ-2
class) forever.
**E3 — Empty/loading/error state pass.** *(2d)* — every page intentional with
0 hands, while loading, and on error; aligns with the redesign brief's
readiness checklist.
**E4 — Arena fixes.** *(1d)* — C-bet Clinic filters for actual c-bet spots;
`alert()` → ConfirmDialog; dead ternary; memoize `nextHand` pool.

---

### EPIC F — Remove the scale ceiling *(months 2.5–4)*

**F1 — Derived-stats layer.** *(4–5d)* — the one real architecture decision;
full design in §5.1 below.
**F2 — Heavy work off the render path.** *(2d)* — memoize equity calc
(`useMemo` on hand+street) or move to a worker; pass File/ArrayBuffer to the
worker so JSZip runs off-thread; chunk the worker's single giant COMPLETE
message.
**F3 — Session filter: decide.** *(1d)* — re-wire `setActiveSessionId` to a
real session picker, or delete the dead branches and store fields. Either is
fine; limbo is not.
**F4 — Dependency hygiene.** *(0.5d)* — drop `three`/`@react-three/*` if
truly unused (verify no dynamic imports); `@types/*` → devDependencies; drop
deprecated `@types/jszip`.

#### 5.1 F1 design (recorded for the implementer)

**Persist aggregates at import time in a new Dexie table keyed by
`(scope, strategyProfile)`.**

- Table holds what pages currently recompute per mount: `AggregateStats`,
  leak list, position stats, session rollups. `scope` = `'all'` or session
  id.
- Written at the end of the import transaction (the worker already computes
  decisions + compliance) and on profile switch (recompute once, in a
  transition state).
- Pages `useLiveQuery` the aggregates row (a few KB) instead of `toArray()`
  on four tables. Star-toggles stop triggering re-analysis because they don't
  touch the aggregates table.
- Why not memoize in Zustand: memoization dies on navigation and multi-tab;
  Dexie persistence gives instant cold start at 100k hands and the aggregate
  shape becomes the future sync payload (G1).
- Invalidation: any import/delete/profile change rewrites the whole row. No
  incremental updates until a profiler demands them — full recompute happens
  in the worker, off-thread, amortized over explicit user actions.
- **Sequencing: lands after Epics A and B** — caching wrong numbers makes
  them harder to fix.

---

### EPIC G — v1.0 expansion tracks *(months 4–9; each behind its GOALS.md gate)*

| Ticket | Track | Gate to open it | Est. |
|---|---|---|---|
| G1 | Backend/accounts: design doc (data-flow, retention, migration — required by GOALS.md) → implementation | Demo retention evidence (≥1 user returns with a second batch) | 3–4wk |
| G2 | Sharing/export boundary: what leaves the device, sanitization, authorizing user action | G1 + explicit user demand from E1 | 2wk |
| G3 | Payments/pricing | A participant names a price for a named outcome | 2–3wk |
| G4 | Solver evaluation spike (license, runtime, spot construction; evaluation only — no EV claims, per SOLVER_BOUNDARY) | M3 complete | 1–2wk spike |

---

## 6. Demo-round playbook (M2, operationalized)

`USER_VALIDATION_PLAN.md` already has the script, cohort, and gate questions.
The operational wrapper it lacks:

1. **Entry gate:** no session 1 until Epics A + C are merged and a full
   self-dogfood pass on the owner's freshest hands shows no number that
   can't be defended. The owner is participant 0.
2. **The data ask, scripted:** at the *end* of each session (after feedback,
   to avoid bias): "the app can export a sanitized package of your hands with
   names pseudonymized; it stays between us and becomes test data." Six yeses
   ≈ thousands of new fixture hands across client locales; even two
   materially de-risk the parser.
3. **Per-session artifact** in `docs/validation/`: the 9 gate-question
   answers, verbatim confusion moments, longest-dwelled feature, and one
   trust verdict — "would they let this app tell them what to study? y/n/why."
4. **Kill-criteria, decided in advance:** if ≥4 of 6 say the leak output
   isn't credible *after* the A/B fixes, that is a product-thesis signal —
   M3 reroutes toward evidence-per-leak explainability (example hands,
   denominator, confidence shown inline) rather than more detectors. Decide
   now what 4/6 means so it can't be rationalized later.
5. **UI/UX confidence resolves here, not in another redesign.** Six observed
   users outrank any heuristic review. The freshly ported design system gets
   judged by them.

---

## 7. Week-by-week calendar (first 8 weeks)

| Week | Engineering | Product/ops |
|---|---|---|
| 1 | Epic H (land branch, split PRs) · C1, C2, C4 | — |
| 2 | A1 + regression tests · A2 invariant sweep (expect + triage failures) | Recruit demo cohort (~3wk lead) |
| 3 | A3 · C3 · C5 | Schedule sessions for weeks 5–7 |
| 4 | B4 stage 1 · B1 · B2 · self-dogfood on own hands | Dry-run demo, owner as participant 0 |
| 5 | B3 · B5 · B8 · D1 | Sessions 1–2 |
| 6 | B6 · B7 · B9 · B10 · D2 | Sessions 3–4; first contributed packages → fixtures |
| 7 | A4 · A5 · D5 | Sessions 5–6; write synthesis |
| 8 | Buffer for demo-found bugs · D6 | Demo synthesis → M3 scope decision |

Weeks 9–16: M3 (F1, E3, demo-driven fixes). Month 4+: G-track gates open per
evidence.

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A2 invariant exposes more parser gaps than A1 fixes (unknown line types in real fixtures) | **High** | Week 2–3 slip | Budgeted: the triage list is the deliverable, not green CI. Fix the top families; document the long tail honestly in PARSER_HEALTH. |
| **Historical data poisoned by pre-fix imports** — every hand already in IndexedDB carries a wrong `netProfit` | **Certain** | Users see numbers change; mixed pre/post-fix data is a *new* trust bug | Decide before A1 merges: Dexie version bump with a recompute migration (full action lists are persisted, so money fields are recomputable offline), or a "re-import recommended" banner keyed on import-run date. Migration preferred. |
| Demo cohort finds leak output not credible even post-fix | Medium | Reroutes M3 | Kill-criteria pre-decided (§6.4); pivot to evidence-per-leak explainability. |
| Solo-founder cadence vs ~35 eng-days in 8 weeks | Medium | Timeline stretch | Tickets sized for agent dispatch — A1/A2/A3 and the B-series are exactly the scoped, test-gated tasks the workers.json/dispatcher setup was built for. |
| Scope-gate weakening (D-3) lets agent workers drift during heads-down correctness work | Low–Med | Dirty trees, mixed PRs | Make the kernel-change PR explicit; consider keeping untracked-file blocking even if scope blocking becomes warnings. |

---

## 9. Definition of done for v1.0 ("the whole deal", MTT-only)

1. **Numbers:** chip-conservation invariant green over the full (grown)
   corpus; every displayed stat traceable to a tested formula in
   METRICS_DICTIONARY; zero hardcoded values in UI.
2. **Leaks:** every leak shows denominator + confidence + ≥1 example hand;
   zero known false-positive families; hero fold-to-c-bet measured.
3. **Import:** every file outcome (success/partial/failure) visibly reported;
   per-hand drops surface in the ledger; re-import idempotent and stated as
   such.
4. **Validation:** ≥6 sessions synthesized; ≥1 user returns unprompted with a
   second batch of hands (the strongest pre-backend retention signal
   available).
5. **Scale:** 100k hands → cold start < 2s; page navigation instant (F1
   done).
6. **The whole deal:** accounts/backend live behind the privacy design the
   docs require; sharing boundary explicit; payment only if a validated
   outcome priced it.
7. **Honesty boundary intact:** no solver-EV claims (SOLVER_BOUNDARY), no
   third-party branding (the hard rule), `privacy:check` green.

---

## Appendix A — Reference audit detail (agent findings, condensed)

### A.1 Poker-correctness severity index

- **Critical:** C1 chip flow (parser raise accounting + uncalled bets).
- **High:** H1 cbetHU OOP-vs-100%; H2 limped-pot missed-c-bet exploit;
  H3 double-barrel gating; H4 FACING_RAISE/3-bet conflation;
  H5 count-based postflop severity + fake confidence.
- **Medium:** M1 ITM includes bounty-only; M2 re-entries; M3 ICM stage
  heuristic; M4 BB suited-fold window; M5 AF approximation; M6 HandReplay
  legacy fallback; M7 rake-adjusted ROI; M8 hourly rate.
- **Low:** L1 pre-v3 migration WTSD/W$SD skew (legacy local data only);
  L2 session money double-count; L3 bust-out buckets ignore field size;
  L4 DONK_BET_TURN action order (display-only); L5 replay pot-odds notes
  wrong with prior flop action (display-only); L6 hardcoded hero-name
  fallbacks; L7 hero fold-to-c-bet unmeasured.
- **Verified solid:** W$SD `showdownWinners` gating; WTSD denominator =
  sawFlop; c-bet gating fixes in the main import path; per-decision ICM
  stage flow (STATUS issue 13); position mapping incl. HU `BTN/SB`;
  rangeChecker skip-don't-guess hygiene; integer-cents tournament money;
  solver boundary honesty; the bb/100 formula itself (inputs poisoned by C1).

### A.2 "If a mid-stakes reg imported 5k hands today"

Could trust: VPIP/PFR/limp%; WTSD/W$SD; tournament $ PNL + headline ROI
(absent re-entries and heavy PKO play). Could not trust: anything
chip/bb-denominated at hand level; the critical c-bet HU leak and all
aggregated postflop leaks; range-compliance/overfold claims in raised pots.

### A.3 Test/fixture posture

62 test files; analysis layer fully covered; parser metadata locked by a
~250-file real-corpus sweep with filename oracles (a genuine strength,
including pt-BR locale money). Gaps: chip-flow correctness untested
(no conservation check), `HandsUpload.tsx` untested, no fixture→save→stats
integration test, GG sweep `describe.todo`, sweep tolerates 50% hand drops,
pages have only route smoke tests. The
`Downloads\poker-claude\src\parser\__tests__` folder is a stale pre-fix
snapshot; only two minor format assertions are worth porting (see D4).

### A.4 Graphify notes

God nodes: `HeroDecision` (48), `PokerStars Tournament Summary Format` (44),
`Position`/`Hand` (36), `Tournament` (33), `useAppStore` (23). One import
cycle: `importRuns.ts ↔ store.ts`. 680 isolated nodes are mostly fixture and
config leaves — not a structural concern.
