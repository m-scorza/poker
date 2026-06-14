# Appendix — Subagent Prompts and Full Outputs (2026-06-12 Principal Audit)

Companion to `2026-06-12-principal-engineer-audit.md`. Three read-only
general-purpose subagents were dispatched in parallel (background) at the
start of the audit. This file preserves each agent's **prompt verbatim** and
its **full report verbatim** so nothing is lost to terminal scrollback.

Run stats:

| Agent | Tokens | Tool uses | Duration |
|---|---|---|---|
| 1. Code quality audit of `src/` | ~187k | 58 | ~6.7 min |
| 2. Poker correctness deep-dive | ~135k | 37 | ~9.8 min |
| 3. Test & parser robustness audit | ~133k | 45 | ~6.8 min |

In addition to the agents, the orchestrating session ran: `npm test`
(693/693 pass, 63 files, 94s), `npx tsc -b --pretty false` (clean),
`npm run docs:check` (pass), a graphify query + `GRAPH_REPORT.md` read, and a
manual read of the full 4,733-line working-tree diff. Critical agent claims
(uncalled-bet gap, deleted ROADMAP residuals, archive non-rotation) were
independently re-verified before inclusion in the main report.

---

# Agent 1 — Code quality audit of `src/`

## Prompt (verbatim)

```text
You are doing a STRICTLY READ-ONLY code quality audit of a React poker
hand-history analyzer at C:\Users\MICRO\OneDrive\Documentos\GitHub\poker.
Do NOT modify, create, or delete any files. Do not run any command that
writes (no npm install, no builds that emit). Reading files and running
read-only git commands is fine.

Context: Browser-first React 19 + TypeScript 5.7 + Vite 6 app, Zustand
store, Dexie/IndexedDB persistence, Tailwind 4, Recharts. Routes:
Dashboard, Hands (inline upload), Stats, Ranges, Leaks, Sessions, Villains,
Arena, Career, Demo. There are ~22 analysis modules in src/analysis/ and a
PokerStars parser in src/parser/.

Your task: produce a code-quality and anti-pattern audit of src/ (skip
src/analysis poker-theory correctness — another agent covers that; you may
still flag code-quality issues in those files). Cover:

1. Component/page architecture: god components, page size, duplicated UI
   logic, missing shared components (e.g., docs say HandReplay builds its
   own Board), prop drilling vs store usage.
2. State management: Zustand store shape, derived-state recomputation,
   anything recomputed per-render that should be memoized or precomputed at
   import time, IndexedDB access patterns (N+1 queries, full-table scans on
   every page load).
3. Type safety: `any`/`as` casts, non-null assertions, unsafe parsing of
   external input, places where the parser output types leak loosely into
   UI.
4. Error handling: swallowed errors, console.warn-as-error-handling,
   unhandled promise rejections, worker lifecycle issues.
5. Dead code / dependency hygiene: unused exports, unused deps, copy-paste
   duplication across pages.
6. Performance smells: large lists without virtualization (TanStack Virtual
   is installed — is it used?), heavy synchronous work on main thread vs the
   upload worker, re-parsing or re-analyzing on navigation.
7. Build/test hygiene visible from config: tsconfig strictness, eslint
   config gaps.

Method: Start with src/ tree listing, package.json, tsconfig, store files,
then read the largest/most central files (App.tsx, pages, store, db layer,
upload flow). Use Grep to count patterns (e.g. `: any`, `as unknown`,
`console.error`, `@ts-`). Be concrete: every finding needs file:line and a
1-2 sentence explanation of why it matters. Rank findings by severity
(Critical / High / Medium / Low). Also note 3-5 things the codebase does
WELL — this feeds a balanced principal-engineer report.

Return a structured markdown report. Be thorough; this is the backbone of
section 1 of a larger audit.
```

## Output (verbatim)

# Code Quality & Anti-Pattern Audit — `src/`

All paths relative to `C:\Users\MICRO\OneDrive\Documentos\GitHub\poker`. Scope: code quality only; poker-theory correctness excluded. Codebase: 167 TS/TSX files; largest units are `src/data/store.ts` (826 LOC), `src/components/hands/HandsUpload.tsx` (802), `src/pages/CareerPage.tsx` (661), `src/components/hands/HandReplay.tsx` (649).

## Critical

**C1. Fabricated metrics hardcoded into shipped UI.** For a product whose stated phase is "trust-building," several numbers on permanent display are fake:
- `src/components/layout/Sidebar.tsx:68-71` — "Lifetime profit **+$388.85**, **+141.4% ROI · 250 tourneys**" is a string literal, never computed. It coincidentally matches the *demo* dataset shape (250 tournaments) and shows regardless of real imported data.
- `src/pages/DashboardPage.tsx:125` — WireTape ticker shows `{ t: 'BB/100', v: '+4.2', cls: 'up' }` hardcoded while every adjacent stat is real.
- `src/pages/DashboardPage.tsx:158` — `verdictConf="Confidence: High"` is a literal passed to VerdictGauge.
- `src/components/layout/Sidebar.tsx:77-78` — identity card hardcodes "scorza23" and "Grinder · B+" even though `heroName` is configurable state loaded in `Layout.tsx:58-60`.

**C2. 100x display bug — villain VPIP/PFR on Career page.** `computeVillainStats` returns percentages on a 0–100 scale (`src/analysis/villainClassifier.ts:95-104`; thresholds like `vpip > 40` at line 58 confirm). `src/pages/VillainsPage.tsx:212-213` renders it correctly via `pct()`. But `src/pages/CareerPage.tsx:578` renders `VPIP/PFR: {(v.vpip * 100).toFixed(0)}/{(v.pfr * 100).toFixed(0)}` — multiplying again by 100, so a 25% VPIP displays as "2500". Classic consequence of duplicating presentation logic across pages (see H5).

## High

**H1. Import success path can permanently wedge the UI (unhandled async rejection).** `src/components/hands/HandsUpload.tsx:285-350`: the `worker.onmessage` handler is `async` and awaits `importHands()` / `importTournamentSummaries()` (lines 307-310) with **no try/catch**. A Dexie failure (quota, constraint, private-mode) becomes an unhandled promise rejection; `setImporting(false)` at line 334 never runs, leaving the "Processing History… Do not close this page" overlay up forever. `saveImportRun` *is* wrapped (325-327), so the gap is known territory. Same pattern in the worker itself: `src/parser/worker.ts:15-17` — `async` onmessage with no catch; `worker.onerror` (HandsUpload:352) only fires for synchronous worker errors, not rejected promises.

**H2. Parser failures invisible to the import-confidence ledger.** Per-hand parse failures are swallowed at `src/parser/pokerstars.ts:87-91` (`console.warn` + skip) and `src/parser/ggpoker.ts:289` (`console.error` + skip). They never increment `ImportSummary.warnings` or downgrade `confidence` in `src/parser/workerProcessor.ts:165-183`. A file where 30% of hand blocks fail to parse still reports "high confidence / Import Complete" — directly undermining the data-health feature the product showcases (`HandsUpload.tsx` Data Health panel, `importRuns.ts` ledger).

**H3. Full-DB scan + full re-analysis on every page mount, all on the main thread.** Every page re-fetches entire tables and re-runs `batchCheckCompliance` over the complete decision history:
- `src/pages/DashboardPage.tsx:27-32` (`hands`, `heroDecisions`, `tournaments` via `toArray()`) then lines 55-66 run compliance + leak detection + session grouping + study-queue in a `useMemo`;
- `src/pages/CareerPage.tsx:69-74` (4 full tables incl. `villains`);
- `src/pages/SessionsPage.tsx:25-37`, `src/pages/HandsPage.tsx:74-97`, `src/pages/LeaksPage.tsx:113-119`, `src/pages/RangesPage.tsx:65-72`.

Nothing is cached across navigations; switching Dashboard → Hands → Dashboard re-loads and re-analyzes everything. Worse, the `useLiveQuery` variants (Dashboard, Leaks) re-run the full scan on **any** write to those tables — toggling a star on one hand re-triggers the entire Dashboard analysis pipeline. The upload worker exists, but all post-import analytics run synchronously in React render cycles. At the 10k-hand demo scale this is a stutter; at "serious study platform" scale (100k+ hands) it is an architectural ceiling.

**H4. Roughly half of the Zustand store is dead, including an unreachable feature.** In `src/data/appStore.ts`: `filters`/`setFilters`/`resetFilters` (40-47, 106-108), `totalTournaments`/`setTotalTournaments`, `lastImportCount`/`setLastImportCount` have zero consumers in `src/`. Most notably **`setActiveSessionId` is never called anywhere**, so `activeSessionId` is permanently `'all'` — making the session-filter branches at `DashboardPage.tsx:47-53,60-70,87` and `HandsPage.tsx:84-96` (which pay the cost of `groupIntoSessions` on every load) unreachable dead code. Either the session-picker UI was deleted without cleanup or never landed; both files still do work to support it.

**H5. Duplicated business logic drifting apart.** `CareerPage.tsx:148-173` (`topNemesis`) and `175-200` (`topVictims`) are copy-paste twins of each other, and a third nemesis implementation lives in `src/data/sessions.ts:105-149` with *different* semantics (sessions gates villain deltas on `heroNet < 0`; CareerPage counts every positive villain delta). The data-health warning banner is duplicated verbatim between `CareerPage.tsx:298-326` and `LeaksPage.tsx:128-156`; confidence-badge color maps are re-declared three times inside `HandsUpload.tsx` alone (77-81, 574-590, 744-752). The C2 bug above is the predictable cost of this pattern.

## Medium

**M1. Unused heavy dependencies in `dependencies`.** `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` are imported **nowhere** in `src/` (grep confirms; all "three" hits are `threeBet`/fixtures). `@types/jszip` is a deprecated stub (jszip ships its own types) and sits in `dependencies` alongside `@types/three` (types belong in devDependencies regardless). Separately, three animation/visualization stacks coexist: `gsap`+`@gsap/react` (dashboard), `framer-motion` (everywhere else), `recharts` (charts) — a deliberate-looking but unconsolidated split (package.json:22-47).

**M2. Synchronous equity calculation inside render.** `src/components/hands/HandReplay.tsx:568-621`: an IIFE in JSX calls `OddsCalculator.calculate()` (combinatorial enumeration from `poker-odds-calculator`) on **every re-render** of the modal — each street-tab click, star toggle, etc. No `useMemo`, no worker. Multi-way all-in preflop spots are the expensive case and exactly the hands users replay.

**M3. ZIP decompression and batching on the main thread.** `HandsUpload.tsx:196-259` runs JSZip extraction (up to 150MB decompressed) on the UI thread, then re-encodes every entry with `new TextEncoder().encode(content)` (251) just to count bytes. The worker only receives pre-extracted strings; passing the `File`/`ArrayBuffer` to the worker would move all of it off-thread. Also, `workerProcessor.ts:171-184` posts the entire parsed dataset (hands + players + actions) as one structured-clone message — a single large memory spike with no chunked handoff.

**M4. `dangerouslySetInnerHTML` for plain app strings.** `DashboardPage.tsx:173` (leak description) and `src/components/dashboard/MonumentCurve.tsx:87` (verdict). Inputs are currently internal strings from `leakDetector`/`careerCoach`, so no live XSS, but it's an injection-prone idiom with zero sanitization and no need (the same `leak.description` renders as plain text in `LeaksPage.tsx:247`).

**M5. Arena drill correctness/quality.** `src/pages/ArenaPage.tsx`: the "C-bet Clinic" drill never filters its pool (52-64 — only `fault_fixer` and `rfi_master` get filters), so it drills random preflop decisions under a postflop label. `alert()` at line 67 instead of the existing `ConfirmDialog`/toast patterns. Line 254 has a dead conditional: `r1 === r2 ? \`${r2}h\` : \`${r2}h\`` — both branches identical. `nextHand` (81-98) re-runs `checkCompliance` over the entire decision pool on every advance.

**M6. Unvalidated external input narrowed by `as`.** `CareerPage.tsx:58` casts `searchParams.get('tab')` to a tab union — an arbitrary `?tab=x` renders an empty page body (all tab matches fail) instead of falling back. Same idiom on select inputs (`VillainsPage.tsx:137`, `HandsFilters.tsx:87,116`) where it's harmless. `HandsUpload.tsx:91` reaches into JSZip's private `_data.uncompressedSize` via double cast — a version bump can silently break the ZIP-bomb guard (mitigated by the post-extraction re-check at 251-255, which is good defense-in-depth).

**M7. Config files are neither typechecked nor linted.** `tsconfig.json` includes only `src` (24); `eslint.config.js:19-20` ignores `*.config.{js,ts}`; `vite.config.ts` uses `defineConfig` from `'vite'` with a `test` key that only typechecks with Vitest's type augmentation, which is never referenced (`src/vite-env.d.ts` has only `vite/client`). It works because nothing ever checks it.

## Low

- **L1.** `src/components/dashboard/RingHud.tsx:101` — the codebase's single `as any` (`setActiveStat(k as any)`); trivially typed with `keyof typeof STATS`.
- **L2.** eslint ignores all tests (`eslint.config.js:16-18`); they are typechecked (`tsconfig.test.json`) but unlinted.
- **L3.** Personal username `'scorza23'` hardcoded as fallback in 8 production-source locations (`appStore.ts:93`, `store.ts:61,776`, `scenarioDetector.ts:202`, `demoDataset.ts:36`, `pdfExport.ts:24`, `HandReplay.tsx:131`, Sidebar display) — default-parameter sprawl that should be one constant.
- **L4.** Dead exports: `handExists` (`store.ts:112`) has no callers (dedup is inlined in `importHands`).
- **L5.** `HandsPage.tsx:101` — `activeSessionId` is a redundant effect dep (already in `load`'s closure deps). `VillainsPage.tsx:182` silently caps the table at `.slice(0, 100)` with no pagination affordance.
- **L6.** `Layout.tsx:59` — `getHeroName().then(setHeroName)` with no `.catch`; `CursorHalo` (Layout.tsx:8-53) runs a perpetual `requestAnimationFrame` loop plus a document-wide `mouseover` listener for a cosmetic cursor effect — always-on per-frame work.
- **L7.** Inconsistent confirm UX: bespoke `window.confirm` in `HandsUpload.tsx:408` vs. the shared `ConfirmDialog` used by `HandsPage`.
- **L8.** Docs claim confirmed: there is no shared `Board`/`Table` component — `HandReplay.tsx:296-348` and `ArenaPage.tsx:218-282` each hand-roll their own table/board rendering on top of the shared `PokerCard`.

## What the codebase does well

1. **Type discipline is genuinely strong.** `strict` + `noUncheckedIndexedAccess` + `noUnusedLocals/Parameters` (`tsconfig.json:14-18`), tests typechecked via a dedicated `tsconfig.test.json`, exactly one `as any` in all of non-test `src/`, zero `@ts-ignore`/`@ts-expect-error`. All four `JSON.parse` sites of external input are wrapped and validator-guarded.
2. **The upload pipeline is security-conscious beyond its weight class.** `HandsUpload.tsx` implements declared-vs-actual ZIP size verification, cumulative decompression caps, batch caps, refusal on missing metadata, an import-sequence token (`importSeqRef`) to neutralize stale async results, and worker termination on unmount (124-132).
3. **`src/data/localStorage.ts` is model infrastructure code** — versioned envelopes, injectable storage, validators, quota-aware discriminated results, and on-read legacy-key migration (`store.ts:271-313`).
4. **Dexie schema management is disciplined**: documented upgrade chain with an explained no-op v4 placeholder (`store.ts:99-102`), backfilling migrations, transactional bulk imports with dedup, and retention-capped diagnostics (`saveImportRun`, 794-818).
5. **App shell does the right things**: lazy-loaded routes with Suspense and a per-page ErrorBoundary wrapper (`App.tsx:49-71`); `HandsTable.tsx` is a correct TanStack Table + `@tanstack/react-virtual` integration with memoized data/columns (so yes — TanStack Virtual *is* used, in the one place that needs it most); HandReplay implements a real focus trap and focus restoration (77-116).

## Summary for the principal-engineer report

The foundation (types, parser hardening, storage layer, upload safety) is notably better than typical hobby-stage code. The two systemic problems are: (1) **trust-surface integrity** — hardcoded fake stats and parse failures that bypass the confidence ledger contradict the product's core promise and should be fixed before anything else; (2) **no derived-data layer** — every page independently re-scans IndexedDB and re-runs the full analysis pipeline on the main thread per mount, which works at demo scale and will not survive real volume. Secondary themes: copy-paste UI/business logic already diverging (the 100x VPIP bug is the smoking gun), a half-dead Zustand store indicating abandoned feature scaffolding, and ~4 unused heavy dependencies.

---

# Agent 2 — Poker correctness deep-dive

## Prompt (verbatim)

```text
You are doing a STRICTLY READ-ONLY poker-correctness audit at
C:\Users\MICRO\OneDrive\Documentos\GitHub\poker. Do NOT modify, create, or
delete any files.

Context: This is a tournament (MTT) poker study app. The owner explicitly
says he would NOT currently trust the analysis output, and names postflop
analysis and financial math as the weakest areas. Your job is to verify or
refute that, concretely.

Read first for conventions: docs/knowledge/METRICS_DICTIONARY.md,
docs/product/PARSER_HEALTH.md, docs/product/SOLVER_BOUNDARY.md (if
present). Project conventions that are load-bearing: bb deltas / bb/100
over raw chips; scenario detection must classify what happened BEFORE
hero's action to avoid false overfolds; BB suited-fold logic only vs normal
2-3x opens; heads-up button is BTN/SB; position mapping uses ordered active
seats; tournament context means ICM matters.

Audit these areas in src/analysis/ (and the parser where relevant):

1. postflopAnalyzer.ts — line-by-line review: c-bet opportunity/missed-cbet
   detection, pot-size computation, multiway handling, donk-bet handling,
   board texture logic if any, whether hero fold preflop correctly excludes
   postflop spots. Known past bugs (fixed): donk before hero blocked cbet
   opps, preflop folds producing postflop spots, OOP checks counted as
   missed cbets. Look for the NEXT bugs of that family.
2. Financial math — find the financials/career/ROI modules: how are chips
   vs bb vs currency handled? Is ROI computed on buy-in+rake? ITM
   definition? bb/100 denominators? Tournament re-entries? Any place raw
   chip deltas drive a user-facing 'winnings' or performance number?
3. scenarioDetector.ts — preflop scenario classification: open vs limp vs
   3bet pots, facing-action detection ordering, W$SD gating (was fixed via
   showdownWinners Set — verify it's still sound), all-in vs normal-raise
   distinction for BB defend logic.
4. leakDetector.ts — denominators and sample-size gates for each leak type,
   severity computation, false-positive risk. Which leak claims would
   survive a mid-stakes reg's scrutiny and which wouldn't?
5. ICM — find icmStage usage; how is stage determined, and is per-decision
   stage actually flowing through (issue 13 in STATUS says fixed 2026-06-02
   — verify).
6. rangeChecker.ts / range baselines — MP1 baseline fallback, facing-raise
   skip behavior, anything that silently classifies a correct play as a
   leak.

For each finding: file:line, what's wrong or risky, expected poker-correct
behavior, and how a user would see the error (e.g. 'inflates fold-to-cbet
leak severity'). Also explicitly answer: if a mid-stakes MTT reg imported
5k hands today, which top-3 leak outputs could be trusted and which could
not? Rank findings Critical/High/Medium/Low. Note what is genuinely solid
too.

Return a structured markdown report.
```

## Output (verbatim)

# Poker-Correctness Audit — Read-Only Review

**Scope:** `src/analysis/` (postflopAnalyzer, scenarioDetector, leakDetector, rangeChecker, icmDetector, financials, careerStats, careerScope, careerCoach, sessions) plus the parser money/position layer in `src/parser/pokerstars.ts`. All paths below are under `C:\Users\MICRO\OneDrive\Documentos\GitHub\poker\`.

**Verdict up front:** the owner's distrust is justified, and his instinct about *where* the rot is — postflop analysis and financial math — is accurate. The single worst problem is not in `src/analysis/` at all: the parser's chip accounting is wrong in most contested hands, which silently poisons every bb-delta metric downstream (bb/100, positional heatmap, nemesis, study-plan cost ranking). Tournament-level $ PNL/ROI (from summaries) is mostly sound. Preflop frequency stats (VPIP/PFR/limp) and the showdown metrics are genuinely solid.

---

## CRITICAL

### C1. Parser never processes "Uncalled bet (X) returned to Y" — and raises record the wrong invested amount
**Files:** `src/parser/pokerstars.ts:382-397` (raise), entire action loop `225-424` (no uncalled-bet branch), `:511` (`heroChipsAfter`), `:512-518` (`villainDeltas`); consumed at `src/analysis/scenarioDetector.ts:335` (`netProfit`).

Two compounding bugs:

1. **Raise investment uses the "raises BY" amount, not chips added.** `pokerstars.ts:384-386` does `addInvestment(name, raiseMatch[2])` — the *increment over the previous bet level* — when the player actually puts in `toAmount − priorInvestmentThisStreet`. Example at blinds 25/50: "raises 50 to 100" from the CO adds 100 chips; the parser records 50.
2. **No handling of `Uncalled bet (X) returned to Y`.** Grep confirms the string appears only in fixtures (e.g. `src/test/fixtures/pokerstars/hh/HH20260216 T3975676813...txt:30` — `Uncalled bet (105) returned to scorza23`), never in `src/`. PokerStars' "collected" amount excludes the returned portion, so the uncalled chips vanish from hero's net.

These cancel *exactly* in one case — an uncalled open-steal — which is probably why spot checks looked right. They do **not** cancel whenever a raise gets called, or a later bet goes uncalled. Worked example (25/50): hero opens "raises 50 to 100", BB calls, hero bets 150 on the flop, BB folds. True net = +125. Parser net = collected 225 − invested (50+150) = **+25**. Every contested hand's `netProfit`, `heroChipsAfter`, and `villainDeltas` is wrong.

**User-visible damage:** session and positional **bb/100** (`src/data/sessions.ts:103`, `src/analysis/positionStats.ts:41-62`), the dashboard heatmap (`PositionalHeatmap.tsx`), **nemesis/crusher bb amounts** (`sessions.ts:106-149`), per-position `winPct` (`positionStats.ts:92`), study-plan "costliest leak" bb ranking (`studyPlan.ts:118-122`), and CareerPage chip displays (`CareerPage.tsx:222,628`). The tests don't catch it because `sessions.test.ts` feeds synthetic `netProfit` values, never parsed hands. **This alone justifies not trusting any chip-delta performance number in the app.**

---

## HIGH

### H1. "C-bet HU" critical leak counts OOP checks against a 100% target — contradicting the fixed postflop layer
**Files:** `src/analysis/scenarioDetector.ts:285-286` (`cbetOpportunity` is position-blind), `src/analysis/leakDetector.ts:315-328` + `src/data/strategyProfiles.ts:104` (`cbetHU: {min: 100}`, severity forced `critical` in game_plan).

The past bug "OOP checks counted as missed c-bets" was fixed in `postflopAnalyzer.ts:261` (MISSED_CBET now requires `heroInPositionOnFlop`). But the *aggregate counters* that drive the headline leak were not given the same treatment: `cbetOpportunity`/`cbetMade` in `buildHeroDecision` count hero's OOP checks as missed HU c-bets, and the game_plan threshold demands 100%. One justified OOP check in 10 opportunities → a **critical** "Missed c-bets in heads-up pots" leak. Meanwhile HandReplay's spot list (correctly) shows nothing wrong with the same hand. This is the exact next-bug-of-the-family the audit was asked to find, and it's an internal contradiction a user will notice.

### H2. `BET_VS_MISSED_CBET` fires in limped pots — no check that a preflop raiser exists
**File:** `src/analysis/postflopAnalyzer.ts:274-289`.

In the non-PFR branch, the spot triggers on `isHU && villainCheckedFlop && heroInPositionOnFlop`. It never verifies the villain *was* the preflop raiser. In any HU limped pot (SB completes, BB checks; very common in MTT blind-vs-blind), a villain check + hero check-back is recorded with `isCorrect: false` ("Missed exploitative bet vs missed c-bet"). Each instance feeds `postflopErrors`, and at ≥5 instances becomes a **high-severity** leak (`leakDetector.ts:438-451`). There was no c-bet to miss. Expected behavior: require `villainWasPFR` before classifying a flop check as a missed c-bet exploit.

### H3. Double-barrel opportunity ignores flop raises and position
**Files:** `src/analysis/scenarioDetector.ts:289` (`doubleBarrelOpportunity = cbetMade && hand.boardTurn !== null`), `src/analysis/postflopAnalyzer.ts:241-259` (MISSED_DOUBLE_BARREL on any hero turn check).

If hero c-bets, gets **check-raised**, and calls, hero is no longer the aggressor and frequently cannot bet the turn — yet the turn check counts as a missed double barrel. Same for OOP turn checks (give-ups are standard OOP). This is the turn-street recurrence of the "what happened before hero's action" family: opportunity must require the c-bet was *called, not raised*, and that hero faced a check or acts first on the turn. Impact: deflated double-barrel %, inflated MISSED_DOUBLE_BARREL spots in session stats and replay notes.

### H4. `FACING_RAISE` conflates single-raised and 3-bet+ pots → false OVERFOLD/COLD_CALL and polluted 3-bet%
**Files:** `src/analysis/scenarioDetector.ts:137-194` (any raise count before hero ⇒ `FACING_RAISE`), `src/analysis/rangeChecker.ts:149-188`, `src/analysis/leakDetector.ts:107-112`.

If two raises happen before hero acts (open + 3-bet), the scenario is still `FACING_RAISE` with `openerPosition` = the *first* raiser, and `checkFacingRaise` grades hero against a **vs-single-open** reaction range. Folding AQo cold vs an open+3-bet — clearly correct — is flagged `OVERFOLD`. This is precisely the "false overfold" risk named in the project conventions. The same conflation inflates `threeBetOpps` (cold-vs-3bet spots counted as 3-bet opportunities, `leakDetector.ts:107`). Expected: a distinct `FACING_3BET`/multi-raise scenario excluded from these ranges, like `BB_VS_LARGE_RAISE` already is. Note also BB hands are excluded from 3-bet% entirely (BB is a primary 3-bet seat), so the metric's denominator is doubly unrepresentative.

### H5. Postflop aggregated leaks use raw error counts as both severity and "sample size"
**File:** `src/analysis/leakDetector.ts:438-451` and `:201-212`.

`postflop_*` leaks have no opportunity denominator: ≥2 errors = leak, ≥5 = high severity. On a 5k-hand import, 5 missed-cbet instances are inevitable even for a player c-betting 95% — permanent "high" leak. Worse, `calculateLeakConfidence` receives `error.sample`, which is the **error count, not the opportunity count**, so 30 accumulated errors are reported as "high confidence" regardless of frequency. Expected: rate = errors/opportunities vs a threshold, with confidence from opportunities.

---

## MEDIUM

### M1. ITM includes bounty-only revenue (PKO)
**Files:** `src/analysis/financials.ts:17-28` (`hasTournamentCash` = prize **+ bounty** > 0), `careerScope.ts:162`, `careerStats.ts:94`. Busting out of the money in a PKO after collecting one bounty counts as an ITM cash, inflating ITM rate and the ITM/cashing streaks. Expected: ITM = `prize > 0` (or finish within paid places); bounties belong in revenue/PNL, not ITM.

### M2. Re-entries are not accounted anywhere
**Files:** `src/parser/` (no re-entry/rebuy/add-on parsing — grep confirms), `financials.ts:12-15`. One `Tournament` row per ID, buy-in counted once. A reg who re-enters has understated cost → **overstated ROI and PNL**. For MTT regs this is a routine, material error.

### M3. ICM stage heuristic mislabels mid-tournament as bubble; per-decision flow itself is fine
**File:** `src/analysis/icmDetector.ts:39-137`. Verified: STATUS issue 13's fix is real — `rangeChecker.ts:36` uses `decision.icmStage ?? icmStage`, so per-decision stage flows into BB-defense compliance. But the stage itself is a score ladder with no field-size data: level 11 + short average stacks scores 5 ⇒ `bubble` even 9-handed in the middle of a 1,000-runner field (and `riskPremiumEstimate: 10` attaches). The FT signal requires `maxSeats >= 6` (`:87,145`), so 3-max/HU formats can never reach `final_table`. Consequence: in the *advanced* profile, `foldSuitedAcceptable` (bubble/itm/FT, `strategyProfiles.ts:154-160`) forgives folds in fake-bubble spots and withholds forgiveness in real ones. Honest framing: this is a stage *guess* with confidence capped at "medium" (`icmDetector.ts:129`) — the per-hand "Bubble" label in the UI overstates what's known.

### M4. BB suited-fold rule applies up to ~5x opens and to all suited junk
**Files:** `src/analysis/scenarioDetector.ts:155` (`amount/bigBlind >= 5` = large), `rangeChecker.ts:208-234` (any `isSuitedHand`). The all-in and ≥5bb exclusions match the convention, but a fold of J3s/72s vs a 4bb open is flagged `BB_FOLD_SUITED`. "Vs normal 2-3x opens" should mean <~3.5-4x, and arguably exclude the worst suited hands vs the larger sizes. Inflates the compliance leak with correct folds. (The raise-size check also uses raw chips÷BB on the "to" amount — correct semantics, verified against parser storage at `pokerstars.ts:392`.)

### M5. AF compares an apples-to-oranges approximation against real-AF thresholds
**File:** `src/analysis/leakDetector.ts:143-153, 367-388`. "AF" = (c-bets + double-barrels + preflop first-action raises) / preflop first-action calls — postflop calls, check-raises, river bets all missing — yet judged against 2.0-3.0 (`strategyProfiles.ts:108`), targets calibrated for true AF. The number is not AF and shouldn't borrow its target range.

### M6. HandReplay legacy fallback recomputes spots with final pot and no preflop-fold gate
**File:** `src/components/hands/HandReplay.tsx:127-150`. For stored decisions lacking `postflopActions`, it calls `analyzePostflop(..., hand.totalPot)` — the **final** pot, so c-bet sizing fractions are understated and "correct sizing" misjudged — and passes `hand.boardFlop` even when hero folded preflop, resurrecting the fixed "preflop folds produce postflop spots" bug for legacy data (the facing-bet `NONE` spot at `postflopAnalyzer.ts:322-333` will render for hands hero wasn't in). The main import path (`scenarioDetector.ts:293-300`) is correct: it gates on `sawFlop` and computes pot-before-flop properly (`computePotBeforeStreet` at `:30-54` includes blinds/antes and handles raise-to semantics correctly for preflop).

### M7. "Rake-adjusted ROI" actually removes rake from the cost basis
**File:** `src/analysis/careerStats.ts:264-273`. `(revenue − buyInOnly)/buyInOnly` — this *inflates* ROI relative to the standard `(revenue − buyin − fee)/(buyin + fee)`. Whatever the intended semantics ("what ROI would be without rake"), a user reading "rake-adjusted" will assume a more conservative number, not a flattering one. Main `totalRoi` in `careerScope.ts:158-160` is computed correctly on buy-in+fee.

### M8. Hourly rate is fabricated from a 75-hands/hour constant
**File:** `src/analysis/careerStats.ts:253-262`. Uses only imported hand counts (undercounts), ignores multi-tabling (overlapping table-hours), and presents a $/hr figure. Directionally meaningless for a multi-tabling reg; should be labeled an estimate or dropped.

---

## LOW

- **L1.** `src/data/store.ts:90-96` (v3 migration only): legacy `wentToShowdown` uses `d.action !== 'fold'` where `action` is hero's *first preflop* action — hero who called pre and folded turn counts as reaching a showdown; legacy `wonAtShowdown` uses the old `wonAmount > 0` heuristic. Current parse path is correct; only pre-v3 local data is skewed.
- **L2.** `src/data/sessions.ts:92-101`: full tournament buy-in **and** prize attach to every session containing any hand of that tournament — a tournament spanning two sessions (>4h gap, or a deep run whose early hands fall in a prior session) double-counts money in session PNL/ROI.
- **L3.** `src/analysis/careerStats.ts:204-231`: bust-out buckets use absolute finish positions (≤9 = "Final Table", ≤45 = "Deep Run") with no field size — nonsense for 9-man SNGs and 10k-runner fields alike.
- **L4.** `src/analysis/postflopAnalyzer.ts:307-319`: `DONK_BET_TURN` doesn't check action order on the turn — hero betting *after* villain checks is labeled a donk lead. `isCorrect: null`, so display-only.
- **L5.** `postflopAnalyzer.ts:322-331`: facing-bet pot odds use pot-at-flop-start as both pot and ignore hero's already-invested chips when villain raises — MDF/pot-odds numbers shown in replay notes are wrong whenever the flop had prior action. Display-only.
- **L6.** `scenarioDetector.ts:202` / `HandReplay.tsx:131` / `store.ts:61`: hero name defaults hardcoded to `'scorza23'` — fine for the owner, a landmine for any other user before settings exist.
- **L7.** Hero **fold-to-c-bet is never measured**: `foldToCbet` thresholds exist (`strategyProfiles.ts:124`) and villains get the stat (`store.ts:544-566`), but `computeAggregateStats` has no hero counter. The single most standard postflop leak for an MTT reg is invisible — a gap, not a false positive.

---

## What is genuinely solid (verified, not vibes)

- **W$SD gating** — `scenarioDetector.ts:303-306` uses the parser's `showdownWinners` Set built from SUMMARY "showed […] and won" lines (`pokerstars.ts:438-456`); regression test exists (`scenarioDetector.test.ts:507-515`). Still sound.
- **WTSD denominator** = `sawFlopHands` per METRICS_DICTIONARY (`leakDetector.ts:228`, `sessions.ts:206`). Correct.
- **C-bet gating fixes hold in the main path**: donk-before-hero blocks the opportunity (`facedFlopDonk`, `scenarioDetector.ts:284-285`), preflop folds and hero-all-in-preflop are excluded (`:264, :282, :285`), and preflop all-in players are removed from flop player count for HU semantics (`:275-280`).
- **Per-decision ICM stage flow (STATUS issue 13)** — verified fixed at `rangeChecker.ts:36`.
- **Position mapping** — ordered active seats rotated from button with eliminated-button fallback (`position.ts:29-81`); HU = `['BTN/SB','BB']` per convention (`position.ts:8`).
- **Range checker hygiene** — MP falls back to the conservative MP1 baseline explicitly (`ranges.ts:160-163`); unknown opener in FACING_RAISE is *skipped with a console warning*, never guessed (`rangeChecker.ts:157-164`); FACING_ALL_IN / BB_VS_LARGE_RAISE / BB_VS_LIMP are excluded from compliance rather than mis-graded.
- **Tournament-level money** — cents-based arithmetic (`parser/money.ts` via `sumUsd`), play-money/ticket exclusion, ROI on buy-in+fee in `careerScope.ts:158-160`. The solver boundary (`solverAdapter.ts`) honestly refuses EV claims.
- **bb/100 formula itself** (`positionStats.ts:41-62`) is the right formula — it's the `netProfit` input that's poisoned (C1).

---

## If a mid-stakes MTT reg imported 5k hands today

**Could trust (top 3):**
1. **VPIP / PFR / limp%** — correct denominators (all dealt hands), sane scenario classification, 30-hand gates. These would match PT4/HM3 within noise.
2. **WTSD / W$SD** — correct denominators and showdown-winner gating; at 5k hands the samples are adequate.
3. **Tournament $ PNL and headline ROI** (Career page) — *provided he doesn't re-enter and doesn't play PKOs heavily*; with re-entries the ROI is inflated (M2), and in PKOs the ITM rate is inflated (M1) though PNL stays right.

**Could not trust:**
1. **Anything denominated in chips/bb at hand level** — bb/100, positional heatmap, nemesis, "costliest hands" — wrong in most contested hands (C1).
2. **The "critical" C-bet HU leak and all `postflop_*` aggregated leaks** — OOP checks vs a 100% target (H1), limped-pot phantom missed-cbet-exploits (H2), count-based severity with fake confidence (H5).
3. **Range-compliance / overfold claims in raised pots** — 3-bet-pot conflation (H4) plus the broad BB suited-fold rule (M4) mean a chunk of "deviations" are correct plays; a mid-stakes reg would dismiss the compliance score after the first false OVERFOLD he spot-checks, which is the worst outcome for a trust-building product.

**Suggested fix order by trust ROI:** C1 (parser money) → H1 (cbetHU counter/threshold coherence) → H4 (FACING_3BET scenario) → H2/H3 (postflop spot gating) → H5 (denominators) → M1/M2 (ITM/re-entry).

---

# Agent 3 — Test & parser robustness audit

## Prompt (verbatim)

```text
You are doing a STRICTLY READ-ONLY audit of test coverage and parser
robustness at C:\Users\MICRO\OneDrive\Documentos\GitHub\poker. Do NOT
modify, create, or delete any files. Do not run npm test (the orchestrator
is running it separately); judge from reading code, fixtures, and configs.

Context: Browser-first MTT poker study app. The #1 owner-stated bottleneck
is 'not having more hand histories, which causes uncertainty.' Your job:
assess how well the current test+fixture surface compensates, and where
parser trust is thin.

Tasks:

1. Inventory tests: list all test files (Glob **/*.test.ts* and
   **/__tests__/**), group by area (parser, analysis, UI, db, scripts).
   Identify the major UNTESTED surfaces (pages/components with zero tests,
   analysis modules without tests).
2. Parser fixtures: find fixture files for the PokerStars parser (and any
   OHH/JSON format support). What variants are covered (cash vs tournament,
   Zoom, play money, UTF-8 BOM, all-in/side pots, antes, knockout bounties,
   multi-table, currencies, languages)? Cross-check against
   docs/product/PARSER_HEALTH.md claims — does the doc overstate or
   understate fixture evidence?
3. Parser robustness: read src/parser/ — error handling on malformed input,
   partial-hand recovery, how site detection works, the 65KB signature scan
   + OHH JSON detection, the parser confidence ledger (recent commit
   c9106b8 'Add parser confidence ledger'). How does a bad line fail:
   silently dropped hand, corrupted stats, or surfaced to user?
4. ALSO inspect the additional directory
   c:\Users\MICRO\Downloads\poker-claude\src\parser\__tests__ — list its
   contents and compare against the repo's parser tests at
   C:\Users\MICRO\OneDrive\Documentos\GitHub\poker\src\parser\__tests__ (if
   it exists there). Are the Downloads tests a stale copy, a superset, or
   do they contain fixtures/tests missing from the repo? Report any test
   cases or fixtures present in Downloads but absent from the repo.
5. Assess the import pipeline end-to-end testability: is there any
   integration test that goes raw text -> parsed hands -> analysis ->
   stored stats? Or are layers only tested in isolation?

For each gap: file/area, why it matters for trust, and a one-line
suggestion of the cheapest test that would close it. Rank
Critical/High/Medium/Low. Note strengths too.

Return a structured markdown report.
```

## Output (verbatim)

# Test Coverage & Parser Robustness Audit — poker (read-only)

Repo: `C:\Users\MICRO\OneDrive\Documentos\GitHub\poker` (branch `chore/docs-cleanup`). No files were modified. Note: both Bash and PowerShell were denied, so the Downloads-vs-repo comparison was done by reading files, not hashing — stated identities for unread shared files are spot-checked, not byte-verified.

---

## 1. Test Inventory (62 test files in `src/`)

| Area | Files | Coverage verdict |
|---|---|---|
| Parser (`src/parser/__tests__`) | 15 (pokerstars, fixtureSweep, ggpoker, ggpoker_robustness, openHandHistory, siteIdentifier, buyInExtractor, money, position, handKey, importSummary, workerImportSummary, uploadSizeGuards, sanitizeHandHistory, contributionPackage) | Strong |
| Analysis (`src/analysis/__tests__`) | 23 — **every analysis module has a test file**, incl. scenarioDetector, rangeChecker, leakDetector, icmDetector, postflopAnalyzer | Strong |
| Data/DB (`src/data/__tests__`) | 9 (store, importRuns, sessions, ranges, localStorage, localHeadsUpReferences, pushFoldRanges, demoDataset, demoSeedProgress) | Good |
| UI components | 10 (3 career, 6 shared, TrendChart, HandReplay) | Thin |
| Pages | 1 (`HandsPage.test.ts` — tests only the pure `getHandCategory` helper) + App routing smoke test | Very thin |
| Root/utils/scripts | App.test.tsx (route render smoke), privacyBoundaryCheck, evidence, agentKernel (covers `scripts/agent-kernel.cjs`) | Adequate for purpose |

**Major untested surfaces:**
- **`HandsUpload.tsx`** — the entire import funnel UI: ZIP extraction guards, worker wiring, FILE_ERROR rendering, `saveImportRun` persistence call, confidence badges. The size limits are tested via `uploadSizeGuards.test.ts` only at the parser/worker layer; the component's own ZIP logic (`getKnownZipEntrySize`, batch limits, abort paths) and message handling have zero tests. This is the single most trust-critical untested file.
- Pages: DashboardPage, LeaksPage, SessionsPage, VillainsPage, CareerPage, RangesPage, ArenaPage, StatsPage, DemoPage — only covered by a "renders without crashing" routing smoke test.
- Components: HandsTable, HandsFilters, ErrorBoundary, Layout/Sidebar, DemoDataButton, all dashboard charts except TrendChart, career charts (BustOutChart, DayHourHeatmap, StakeTrendChart, TimelineFeed, CareerDashboard, CareerCoachCard).
- Data: `appStore.ts`, `strategyProfiles.ts`, `demoVillains.ts` (low risk). `store.test.ts` covers villain-stat aggregation and diagnostics retention but **not `importHands`/`importTournamentSummaries`** (dedup, buy-in preservation — the `buyInPreserved` path surfaced in the UI is untested at db level).
- Parser: `tournamentSummary.ts` and `worker.ts` have no dedicated unit tests (both are exercised indirectly via fixtureSweep / workerImportSummary; acceptable).

## 2. Parser Fixtures vs PARSER_HEALTH.md

Fixture corpus (`src/test/fixtures/`): ~92 PokerStars HH .txt, ~157 PokerStars TS .txt, 2 OHH JSON (iPoker object-wrapper, 888/Pacific array-wrapper), 4 GGPoker ZIPs, plus synthetic `sample-hands.ts`.

**Variants covered (real fixtures):** tournaments across many buy-ins, Zoom tournament, Cap/All-in cash, regular cash, play-money cash (pt-BR "Dinheiro Fictício"), 6+ Hold'em (Button Blind + Ante structure), "Variado" tournaments, pt-BR comma-decimal money (`US$ 0,45`) — locale coverage is a genuine strength given the owner's hands come from a Portuguese-locale client. **Covered synthetically only:** UTF-8 BOM, dedup, side pots (incl. multi side-pot summary lines), PKO bounty line + triple-form buy-in `$X+$Y+$Z`, heads-up BTN/SB, non-contiguous seats, cents math.

**Not covered anywhere:** non-USD currencies (EUR/GBP), T$/ticket buy-ins, freerolls/satellite steps, real PKO hand-history file (bounty only synthetic), truncated/corrupted hand at EOF, foreign-language HH text.

**Doc cross-check (`docs/product/PARSER_HEALTH.md`):**
- Mostly honest. The OHH boundary is explicitly *understated correctly* — it says standardized JSON only, not native room support. Good.
- **Overstatement 1:** the headline table presents GGPoker "53/53 pass" as current supported-fixture evidence, but `fixtureSweep.test.ts` line 145 is `describe.todo('fixture sweep — ggpoker (zip fixtures, deferred)')` — the GG numbers are not regression-guarded; they are retained from a prior audit (disclosed in prose, but the table reads as a green gate).
- **Overstatement 2:** "Skipped hand blocks: 0" is a point-in-time measurement; the enforcing test only asserts `parsed ≥ 50% of headers` ("dedup tolerance"), so up to half the hands could silently vanish before the gate trips.

## 3. Parser Robustness

- **Site detection** (`siteIdentifier.ts`): trims then scans first 65,536 chars (the "65KB" scan — chars, not bytes); OHH detection JSON.parses the whole content when it starts with `{`/`[` and looks for `spec_version`/`ohh`/`hands`. Known-unsupported network list (WPN, iPoker, 888, party, Chico, Winamax) prevents silent GGPoker fallthrough — good and tested. Residual risk: any unknown room whose text contains bare `Hand #` still falls through to the GGPoker parser (line 65), and `lower.includes('wpn')` can substring-false-positive.
- **How a bad line fails — the honest answer is "all three modes, depending on level":**
  - *File level:* surfaced well. Unknown files, oversized files, and parser throws become `FILE_ERROR` messages, per-file warnings, and confidence downgrades in `workerProcessor.ts`; `HandsUpload.tsx` renders them and `importRuns.ts` retains them in the confidence ledger (high/medium/low → ready/directional/blocked posture). This pipeline is genuinely good and tested.
  - *Hand-block level:* **silently dropped.** `parsePokerStarsFile` catches per-block errors with `console.warn` and `continue` (pokerstars.ts:87-91); GGPoker does the same (`console.error`, ggpoker.ts:288). Dropped blocks never reach `ImportSummary.warnings`, and a PokerStars file whose blocks ALL fail still increments `parsedFiles` and can yield a **high-confidence** import with fewer hands than the user exported.
  - *Line level:* **silently corrupts stats.** Unmatched lines are ignored. Concrete instance: **no parser handles `Uncalled bet (X) returned to PLAYER`** — the only mention in source is a test comment admitting it for GG (`ggpoker.test.ts:102`), and the PokerStars fixtures contain hundreds of such lines. The aggressor's `totalInvested` includes the full uncalled bet but nothing credits the return, so `heroChipsAfter`, `chipsAfter`, and `villainDeltas` are understated in essentially every hand that ends with a fold to a bet/raise. `scenarioDetector.ts` consumes these fields. The fixture sweep cannot see this because its oracles check only tournament-id/buy-in/fee, never chip conservation.
- **Confidence ledger** (commit c9106b8, `src/data/importRuns.ts` + `importDiagnosticsPolicy.ts`): well-designed and tested (`importRuns.test.ts`, `store.test.ts` retention tests) — categorized warnings, sanitized diagnostics export, ready/directional/blocked posture. Its blind spot is inherited: it can only ledger what the parsers report, and per-hand drops/line-level corruption are never reported.
- **Resource guards:** strong — 20MB per-parser bail (tested for all three parsers), worker-level bail with FILE_ERROR, ZIP decompression caps with metadata-lie re-check in HandsUpload (component layer untested, see above).

## 4. Downloads copy (`c:\Users\MICRO\Downloads\poker-claude\src\parser\__tests__`)

Contents: 10 files. Verdict: **stale pre-fix snapshot, not a superset — nothing critical is missing from the repo.**

- **Only in Downloads:** `fixtureVariants.test.ts`. It documents then-current parser bugs as FIXME assertions: Cap cash buy-in pollution (`buyIn=$0.05`), 6+ Hold'em SB/BB=0, play-money blinds=0, Portuguese play-money currency falling through to USD. The repo has since **fixed all four** in source (`extractBuyIn` gated on `tournamentId`, `buttonBlindsMatch`, `playMoneyBlindsMatch`, `PLAY` currency — pokerstars.ts:121-145) and asserts the fixed behavior in fixtureSweep's "specialized variant fixture checks". Running the Downloads file against the repo parser would fail (assertions pinned the bugs).
- **Only in repo (6 files):** money, sanitizeHandHistory, uploadSizeGuards, workerImportSummary, importSummary, contributionPackage — plus repo's fixtureSweep adds the OHH sweep and variant checks absent from the Downloads version.
- **Worth porting from Downloads (only items not carried over):** two minor assertions — Zoom HU table `format === '2-max'` / `maxSeats === 2`, and Cap-game `format === '6-max'`. One-line additions to fixtureSweep.
- Shared files spot-checked (pokerstars.test.ts first 40 lines, siteIdentifier.test.ts in full) appear identical to repo; byte-level verification was blocked by shell permissions.

## 5. End-to-end pipeline testability

- **raw text → identify → parse → scenario detection → range compliance → ImportSummary:** YES — `workerImportSummary.test.ts` and `uploadSizeGuards.test.ts` drive the real `processWorkerFiles`, which internally calls `buildHeroDecision` + `batchCheckCompliance`. This is a real cross-layer integration test.
- **→ IndexedDB persistence → aggregated stats:** NO single test. `importHands`/`importTournamentSummaries` are only invoked from the untested `HandsUpload.tsx`; `store.test.ts` tests aggregation starting from pre-built records. There is no test going *fixture file → worker → save → query stats*, so dedup-on-save, summary merge, and buy-in preservation are unverified against real parser output.

---

## Ranked Gaps

| # | Rank | Gap (file/area) | Why it matters for trust | Cheapest closing test |
|---|---|---|---|---|
| 1 | **Critical** | Unhandled `Uncalled bet returned` lines (`pokerstars.ts`, `ggpoker.ts`) silently corrupt `chipsAfter`/`villainDeltas` on most fold-ending hands | With few hand histories, every hand's chip delta must be right; this biases hero/villain nets downward invisibly | Chip-conservation invariant over the 3,285-hand fixture corpus: for each hand, sum(invested) == totalPot + sum(uncalled returns), and assert hero chipsAfter on one synthetic uncalled-bet hand |
| 2 | **Critical** | Per-block parse failures are `console.warn` + drop; never reach ImportSummary/ledger; all-blocks-failed file still counts as parsed, high confidence | Defeats the entire confidence-ledger promise: user is told "high confidence" while hands are missing | Return `{hands, skippedBlocks}` from `parsePokerStarsFile` (or count headers vs parsed in workerProcessor) and assert a warning is emitted when skippedBlocks > 0 |
| 3 | **High** | `HandsUpload.tsx` component untested (worker wiring, ZIP guard paths, save + saveImportRun, error rendering) | It is the only bridge from parser output to stored data; a regression here loses imports silently | RTL test with a mocked Worker posting FILE_ERROR + COMPLETE, asserting rendered errors and `importHands`/`saveImportRun` calls |
| 4 | **High** | No fixture-to-stored-stats integration test (`processWorkerFiles` → `importHands` → stats query) | Dedup/merge/buy-in-preservation on save are unverified against real parser output | One "golden pipeline" vitest with fake-indexeddb: feed 2 fixture files (one overlapping), assert saved counts and one aggregated stat |
| 5 | **Medium** | fixtureSweep tolerates 50% hand drops while PARSER_HEALTH claims "0 skipped" | Doc overstates the regression guard; a future regex regression could halve parsed hands and stay green | Tighten assertion to `parsed.length + dedupCount === headerCount` (compute dedup from repeated IDs) |
| 6 | **Medium** | GGPoker ZIP sweep is `describe.todo` while the doc's headline table shows 53/53 | GGPoker import claims are not currently regression-guarded | Implement the deferred sweep with jszip in-test, or move the GG row out of the headline table |
| 7 | **Medium** | No real PKO/bounty hand-history fixture; bounty logic tested only on one synthetic hand | Bounty math feeds financials; owner plays PKOs (Zoom fixture is a PKO by buy-in form) | Commit one real PKO HH file with `wins the $X bounty` lines and add a fixtureSweep oracle |
| 8 | **Medium** | Unknown rooms with bare `Hand #` fall through to GGPoker parser (`siteIdentifier.ts:65`) | Foreign formats could half-parse as GG hands → garbage stats instead of a clean "unsupported" error | siteIdentifier test feeding a fake non-GG `Hand #` text and asserting it does not produce parsed hands with wrong fields (or asserting unknown) |
| 9 | **Low** | Pages/dashboards have only a route-render smoke test | Display-layer bugs (wrong denominators shown) erode trust but logic lives in tested analysis modules | One RTL test per page asserting a known stat from seeded demo data renders |
| 10 | **Low** | Currencies beyond USD/PLAY, freerolls, satellites untested | Owner's current corpus is USD; risk is future-facing | Add one synthetic EUR and one ticket-buy-in hand to sample-hands.ts |

## Strengths (real ones)

- Analysis layer is fully covered — all 23 modules including the high-risk scenarioDetector/rangeChecker pair flagged in CLAUDE.md.
- The 250-file real-export fixture corpus with filename-derived oracles is an unusually good compensation for "not enough hand histories": it locks tournament-id/buy-in/fee/currency across ~3,285 hands, including pt-BR locale money — the owner's actual environment.
- File-level error UX is genuinely trustworthy: unknown/oversized/unsupported-room files surface as user-visible warnings, downgrade confidence, and persist in a sanitized local diagnostics ledger with a privacy-conscious export.
- Size/zip-bomb guards exist at three layers and the parser/worker layers are tested.
- PARSER_HEALTH.md is closer to honest than most such docs — its main sin is presenting deferred GGPoker evidence in the headline table, not fabrication.

**Bottom line:** the fixture surface compensates well for metadata correctness (IDs, buy-ins, currencies, variants) but not at all for **chip-flow correctness** — the corpus contains hundreds of `Uncalled bet returned` lines that no parser handles and no test checks, and per-hand parse failures are invisible to the confidence ledger the product leans on. Those two fixes (a conservation invariant + skipped-block surfacing) are the cheapest, highest-leverage moves for parser trust.
