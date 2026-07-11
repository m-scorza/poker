---
status: open
date: 2026-07-01
related: ['docs/reports/archive/2026-07-01-direction-review-act-iii.md', 'docs/plans/2026-07-01-hermes-worktree-salvage-and-covenant-housekeeping.md']
---

# The Abyss Audit — Code Quality, Efficiency & Beauty (2026-07-01)

> Owner asked for "the most thorough scan possible — even ugly code shall be
> marked and vanish from existence later; make it the most efficient, most
> pretty thing in the universe." This is that scan. **Planning only** — every
> finding is marked, nothing is fixed here. Execution happens via the wave plan
> in *Open items*, each wave a gated PR.
>
> Method: full verification-gate baseline; madge (circular deps), jscpd
> (duplication), knip (dead files/exports/deps) with per-finding manual
> verification; hygiene greps (any/suppressions/TODO/console/hex); production
> bundle build with chunk sizes; full reads of the 6 largest/most central
> files (store.ts, HandsUpload, HandReplay, ArenaPage, pokerstars.ts, appStore)
> plus targeted reads elsewhere.

## 0. Verdict first

**The abyss stared back and mostly blinked.** This is a genuinely healthy
codebase: 769/769 tests green, ~22.4k production LOC with **zero `any`, zero
`eslint-disable`, zero `@ts-ignore`, one TODO**, 0.64% code duplication
(industry "good" is <5%), and disciplined honest-refusal architecture
throughout. The ugliness that exists is *localized and finite* — it is listed
exhaustively below, worst first. Two findings are urgent (one breaks the build
today); the rest are polish debt from the reskin era and the dashboard
demotion.

Baseline metrics (2026-07-01, `main` @ 39550c8 + dirty tree):

| Metric | Value |
|---|---|
| Production LOC / files | 22,412 / 108 (incl. 547-line fixture) |
| Test LOC / files / cases | 11,439 / 69 / **769 pass** |
| `any` / suppressions / TODO | 0 / 0 / 1 (a `describe.todo`) |
| Duplication (jscpd, min-70-token) | **0.64%** (9 clones) |
| Circular deps (madge) | **1** |
| Lint | 0 errors, 3 warnings |
| Typecheck / build | **FAILING** (dirty-tree unused var) |
| Test wall-clock / env cost | 210s / 458s cumulative jsdom setup |
| Bundle precache | 2,407 KiB (60 entries) |

## 1. Severity S1 — broken right now

- **F1 · `src/pages/CoachsNotePage.tsx` uncommitted edit breaks the gate.**
  `SEVERITY_ACCENT` is defined but unused → `tsc` error TS6133 → `npm run
  typecheck` and `npm run build` fail on the current tree. Finish the ~10-line
  wiring (left-edge severity accent on the focus card) or revert. Already
  Phase 1 of the housekeeping plan.

## 2. Severity S2 — correctness / product gaps

- **F2 · Hero name cannot be configured (product-blocking for anyone but the
  owner).** `saveHeroName` (store.ts:803) has **zero callers**; `Layout.tsx`
  only *reads* the IndexedDB value; no page or sidebar control writes it.
  CLAUDE.md's "hero name: configurable in local settings" and STATUS's "hero
  name is persisted in the IndexedDB settings table [via Sidebar]" have both
  drifted — the editing UI was lost (likely in the 2026-06-11 reskin). A fresh
  user with a different screen name imports hands and gets an empty analysis.
  Also: heroName is dual-persisted (IndexedDB settings *and* zustand
  localStorage `poker-app-settings`) — consolidate while fixing.
- **F3 · Circular dependency:** `types/analysis.ts → analysis/finalTableAnalyzer.ts`
  (madge). A leaf types module must not import from analysis; move the shared
  type (or re-export) so `types/` has no analysis imports.
- **F4 · STATUS.md prose drift** — the exact failure STATUS.md exists to
  prevent, in its own hand-written sections: the "Routes actually wired" prose
  table says `/` = DashboardPage (reality since #109: CoachsNotePage) and
  VillainsPage = "auto-classified archetypes" (cut in #108); "Open follow-ups"
  names FACING_3BET (B4) and leak denominators (B5) as *next* — both shipped
  (#99/#100). Fix the prose or delete it in favor of the autogen blocks.
- **F5 · `@eslint/js` is used (eslint.config.js:1) but not declared** in
  package.json (knip: unlisted dependency) — works transitively today, breaks
  on a lockfile shuffle. Add to devDependencies.
- **F6 · Colon-in-player-name parsing residual** (known, ROADMAP): the
  `^(.+?): <action>` regexes (pokerstars.ts:46–53) can mis-split a name
  containing `": "`. Add the adversarial fixture; tighten if it reproduces.

## 3. Severity S3 — dead code & orphans (the "vanish from existence" list)

- **F7 · Orphaned components (0 references, verified):**
  `src/components/dashboard/StudyPlanCard.tsx` and
  `src/components/dashboard/ValueSnapshotCard.tsx` — disconnected by the #109
  dashboard demotion. StudyPlanCard even carries the trust-label work from the
  evidence system. **Coordinate with Hermes R4** (which rebuilds StudyPlanCard
  +430 lines): decide re-wire vs remove *at the R4 steer*, don't delete
  blindly.
- **F8 · Unused exports (~20 values + 42 types, knip; spot-verified).**
  Notables: `saveHeroName`, `handExists`, `getVillainNote` (store.ts);
  `REACTION_RANGES`, `FACING_RAISE_OPENER_POSITIONS`, `BB_DEFENSE_RANGE`
  (ranges.ts); `GAME_PLAN_THRESHOLDS`, `ADVANCED_THRESHOLDS`, `gamePlanCbet`,
  `advancedCbet` (strategyProfiles.ts); `calculateLeakConfidence`
  (leakDetector.ts); the four `MAX_*_BYTES` (HandsUpload — likely test-only,
  keep but move to a policy module). Per-symbol verification required (knip
  misses dynamic/test usage); prune what's truly dead, de-export what's
  test-only.
- **F9 · Script debris in `scripts/`:** `fix_imports.cjs`, `migrate-styles.mjs`,
  `scratch.ts`, `test-odds.cjs`, `test-odds.mjs`, `test-summaries.cjs`,
  `stress-test-parser.ts`, `hygiene-scanner.ts` — one-off era tools with no
  references in package.json/hooks/settings. **Keep:** `surface-open-reports.ts`
  (SessionStart hook), `agent-kernel.cjs` + `parallel-runner.cjs` (referenced
  by agent protocols + `agentKernel.test.ts`), regen/install scripts. Delete
  the rest after a last look; relocate `agentKernel.test.ts` out of
  `src/__tests__` (it shells out to git; it's infra, not app code).
- **F10 · Workspace debris:** four stale `.claude/worktrees/*` checkouts (incl.
  `nifty-gould` = vite-8 branch that landed as #73, plus a `graphify-out`
  experiment), the `poker-hermes` worktree (after salvage completes), and the
  stale `Downloads/poker-claude` snapshot (after the `fixtureVariants.test.ts`
  harvest-check). Prune with `git worktree remove` + branch deletion.

## 4. Severity S4 — efficiency (the "most efficient thing in the universe" lane)

- **F11 · The PDF stack is bundled into route chunks.** SessionsPage chunk is
  **463.94 kB (149 gz)** — the largest in the app — because jsPDF +
  jspdf-autotable (+ html2canvas 199.56 kB and dompurify 26 kB chunks) load
  with the route instead of on the "Export PDF" click. Dynamic-import
  `utils/pdfExport.ts` (and csvExport's heavy parts if any) at the call site:
  ~150 kB gz off the route and out of the 2.4 MB PWA precache.
- **F12 · Two animation libraries ship in parallel.** framer-motion (~39 gz,
  the `proxy` chunk; 7 usage files) **and** gsap + @gsap/react (4 dashboard
  components: BankrollChart, MonumentCurve, RingHud, VerdictGauge). The
  gsap-only surfaces live on the *demoted* dashboard. Converge on
  framer-motion (port 4 components) or lazy-load the gsap quartet with the
  dashboard; measure the delta.
- **F13 · CareerPage chunk 440.82 kB (124 gz)** — second-largest route; audit
  composition (recharts pieces + career components) with the rolldown
  visualizer while doing F11/F12; likely shares the same fixes.
- **F14 · HandReplay computes equity in a render IIFE, un-memoized**
  (HandReplay.tsx:580–607): `OddsCalculator.calculate` re-runs on every
  render (each street-tab click). Post-#112 it's capped and cheap (≤~8ms),
  but it belongs in `useMemo` keyed on hand/players.
- **F15 · store.ts import-path micro-waste:** `aggregateVillainStats`
  recomputes `computeVillainStats` per observation instead of once per villain
  after the loop (store.ts:667), and the post-import hand-count pass does a
  per-tournament `get`+`update` loop (store.ts:227–235) instead of one
  `bulkPut`. Import-path only; cheap to fix while decomposing (F19).
- **F16 · Test suite pays 458s of cumulative jsdom environment setup** (210s
  wall). Parser/analysis/data tests are pure Node — split environments (vitest
  `environmentMatchGlobs` or per-file docblocks) so only component tests boot
  jsdom. Biggest available CI-speed win; zero product risk.
- **Explicitly NOT flagged (respect prior measurements):** the analysis
  pipeline (24ms @ 25k hands, memoized — the exonerated F1 of the June perf
  hunt; do **not** build a derived-stats cache) and HandReplay's enumeration
  freeze (already capped honestly in #112).

## 5. Severity S5 — beauty & consistency (the "most pretty" lane)

- **F17 · Design-token bypass, 27 inline hex values** in career/dashboard
  components: `#15171f` (repeated ≥4×), `#0f172a`, `#1a1d26`, `#ef4444`
  (CareerDashboard, CareerCoachCard, BustOutChart, …) — the reskin's
  `styles/tokens.css` system exists; these predate/bypass it. Same disease,
  milder: raw Tailwind palette accents (`purple-900/30`, `amber-900/20`,
  `sky-900`, `rose-900`, `emerald-900`, `blue-900`) in HandReplay's context
  badges and HandsUpload's confidence UI instead of `var(--*)` tokens. One
  token-mapping pass unifies the app's color language.
- **F18 · The nine jscpd clones**, each a small extraction:
  1. Focus-trap block duplicated HandReplay.tsx:81 ↔ ConfirmDialog.tsx:32 →
     a shared `useFocusTrap(dialogRef, onClose)` hook.
  2. `pushFoldRanges.ts:15–52` ↔ `ranges.ts:9–50` (38 lines, 227 tokens —
     range-table scaffolding) → shared range-literal helper.
  3. CareerPage.tsx:159 ↔ 184 (repeated chart block) → map over config.
  4. CareerPage.tsx:292 ↔ LeaksPage.tsx:152 (17-line shared UI block) →
     shared component.
  5. RangesPage.tsx:468↔495 and 480↔507 (matrix legend/cells ×2) → extract.
  6. csvExport.ts:44 ↔ pdfExport.ts:153 (session-row mapping) → shared
     row-builder in utils.
  7. HandsFilters.tsx:81 ↔ 110 (select markup) → `<FilterSelect>`.
- **F19 · God-files (decompose, logic unchanged):**
  - `store.ts` (910) — ~200 lines of poker observation logic
    (`collectVillainHandObservation` + counter appliers, lines ~486–688) is
    *analysis* living in the *data* layer → `analysis/villainObserver.ts`
    (tests move with it); store keeps persistence only.
  - `HandsUpload.tsx` (859) — five surfaces in one file → `useImportPipeline`
    hook (file staging + ZIP guards + worker lifecycle), `<DataHealthPanel>`,
    `<HeadsUpReferencePanel>`, `<ImportResults>`; also kills the repeated
    confidence-badge class triples.
  - `CareerPage.tsx` (640, 24 hooks) and `RangesPage.tsx` (525, 20 hooks) —
    extract section components alongside their F18 clones.
- **F20 · Native `window.confirm` in HandsUpload** (line 447) while the app
  ships its own accessible `ConfirmDialog` (used correctly in ArenaPage) —
  swap in the shared dialog.
- **F21 · Duplicated card-rank tables:** rank-order maps re-declared in
  `pokerstars.ts:673` and `postflopAnalyzer.ts:20` (plus handKey's ordering) →
  one `cards.ts` util with the canonical order.
- **F22 · The two real a11y warnings:** the upload dropzone div has
  `onClick` without keyboard handling (HandsUpload.tsx:463, both jsx-a11y
  rules) — make it a button-styled element or add key handling; then the lint
  baseline is **zero warnings**.
- **F23 · Arena honesty micro-violations:** `DrillCard` declares a `color`
  prop it never uses (ArenaPage.tsx:583/587), and the trainer table renders a
  hardcoded **"Pot 0.0"** (ArenaPage.tsx:529) — a fake value in an app whose
  brand is refusing to fake values. Show the real pot context or drop the
  element.
- **F24 · `'scorza23'` fallback literals sprinkled** across HandReplay.tsx:136,
  parser default params, appStore default, db v2 upgrade — after F2 lands,
  consolidate to a single `DEFAULT_HERO_NAME` const so the default lives in
  one place.
- **F25 · CSS layer archaeology (low):** `styles/tokens.css` + `desk.css` +
  `reinterpretation.css` + index.css `@layer base` — two design generations
  layered; sweep for dead selectors from the pre-reskin era once F17 lands.

## 6. Test-coverage gaps (targeted, not alarmist)

769 tests is a strong base; the gaps cluster in two places:
- **Pure utils with zero tests:** `csvExport.ts`, `pdfExport.ts`, `format.ts`,
  `strategyProfiles.ts`, `importDiagnosticsPolicy.ts`, `appStore.ts`
  (merge/migrate logic), `tournamentSummary.ts` (fixture-swept only) — cheap,
  high-value additions, especially before touching them in the waves above.
- **The reskin component layer:** all 10 `career/` + 8 `dashboard/` components
  are untested except TrendChart/LifetimeScorecard/streaks/format-breakdown.
  Route-smoke covers mounting; add focused tests opportunistically as F17/F18
  touch each file, not as a standalone crusade.

## 7. Addendum — analysis-core fresh pass (same day)

The §0 method fully read the six largest files but only spot-read the analysis
core. A follow-up full read of `scenarioDetector.ts`, `rangeChecker.ts`, and
`postflopAnalyzer.ts` (owner's "how well is it truly written?" pass) found **no
new correctness bugs** — `rangeChecker.ts` in particular is exemplary — and
four elegance/honesty warts:

- **F26 (S5) · postflopAnalyzer micro-warts:** `isBroadway` is a byte-identical
  duplicate of `isHighCard` (postflopAnalyzer.ts:31–37) — keep one; the
  vestigial ternary `sizing: heroBetFlop ? null : null` (line 308) always
  yields null — strike it; `spot: 'NONE'` doubles as a real "facing bet"
  info row (line 352) — the enum lies; name it (`FACING_BET_INFO`) or split
  the info row out of the spot union.
- **F27 (S4 · honesty of notes) · PROBE_TURN / DONK_BET_TURN never verify hero
  is OOP** (postflopAnalyzer.ts:317–344): an IP hero stabbing after
  check-check, or betting after the villain checks the turn, gets labeled
  "Probe bet (correct)" / "Donk bet". No leak is minted (isCorrect true/null),
  but the replay note misteaches the concept it names. Add the position check
  (`actedAfterVillainCheck` inverse) + fixture tests.
- **F28 (S5) · scenarioDetector dead branches:** the `|| heroPosition ===
  'BTN/SB'` guards (lines 127, 180) are unreachable — BTN/SB exists only HU,
  which already returned at line 118; the WALK tail (172–175) and RFI tail
  (201–205) return identically in both branches — collapse them. Also
  `computePotBeforeStreet(actions, 'flop') || hand.totalPot` (line 334) falls
  back to the *final* pot as the flop-pot denominator — practically
  unreachable (blinds always post), but prefer the honest option (skip sizing)
  over a wrong denominator if it ever fires.
- **F29 (S5) · Suit-keyed monotone textures:** `BoardTexture` carries
  `monotone_h/c/d/s` (strategyProfiles.ts:20–23) though suit identity is
  strategically irrelevant — every consumer just does `startsWith('monotone')`
  and `getRecommendedCbetSizing` falls through to the default for all four.
  Collapse to `monotone_high` (mirroring `monotone_low`); touches the type,
  the `as BoardTexture` cast at postflopAnalyzer.ts:121, and tests.

## Open items

Execution waves — each is one-or-more gated PRs
(`docs:check → typecheck → typecheck:test → lint → test → build`), sequenced
cheapest-truth-first. **Waves 2–4 should run *after* the Hermes salvage slices
(R1–R3) land** — they touch the same pages, and salvage-first avoids porting
conflicts.

- [x] **Wave 0 — restore the gate** (with the housekeeping PR): F1. ✅ #116.
- [x] **Wave 1 — correctness quickies:** F3, F4, F5, F22, F23, F20, F27
      (probe/donk OOP labels); add the F6 adversarial fixture. ✅ 2026-07-03:
      F3 cycle broken (Position now imported from types/hand), F4 STATUS prose
      matches reality, F5 @eslint/js declared, F20 ConfirmDialog, F22 dropzone
      is a real button (lint = 0 warnings), F23 fake "Pot 0.0" + dead color
      prop removed, F27 probe/donk require an OOP lead (+4 tests), F6
      adversarial fixture ADDED and it REPRODUCED — actors are now resolved
      against seated names, longest first. (F2 hero-name UI stays in Arc 5.)
- [x] **Wave 2 — vanish the dead:** F8 (per-symbol verify + prune), F9 (script
      debris), F10 (worktrees); F7 decided at the R4 steer. ✅ **CLOSED
      2026-07-09 — F10 landed with owner approval:** the three stale
      `.claude/worktrees` checkouts (`cool-leavitt` design-system port,
      `elegant-brown` reports lifecycle, `flamboyant-austin`) were verified
      clean with all content landed on main (squash-merges), then removed
      along with their `claude/*` branches. The `Downloads/poker-claude`
      snapshot's `fixtureVariants.test.ts` harvest-check is DONE — all four
      pinned parser limitations (Cap buy-in pollution, 6+ Button Blind
      blinds, play-money chip blinds/PLAY currency, Zoom PKO triple form)
      are since *fixed* on main with committed fixtures + tests
      (`buyInExtractor.test.ts`, `fixtureSweep.test.ts` specialized variant
      checks); the snapshot is superseded and cleared for deletion by the
      owner. **Only survivor:** the `poker-hermes` worktree stays until the
      R4 salvage steer resolves (tracked in ROADMAP Act III-1). **Resolved
      later same day:** R4 steered DROP (superseded by #132's Arena
      curriculum/SRS); Hermes WIP preserved on
      `hermes/worktree-20260627-213824` (origin, snapshot `a5b60da`) and the
      worktree removed. F10 is now fully closed.
      ✅ 2026-07-03 (F7, F8, F9 only): F7
      deleted (StudyPlanCard/ValueSnapshotCard — owner steer confirmed deletion,
      zero imports verified). F8 — every knip candidate individually verified
      for both external AND internal (own-file) usage before touching anything:
      3 symbols were genuinely dead with zero references anywhere and deleted
      (`handExists`, `getVillainNote` in store.ts; `DEMO_TARGET_HAND_COUNT` in
      demoDataset.ts); ~26 more were internally load-bearing but externally
      unused, so only the `export` keyword was dropped (values/types across
      leakDetector, studyPacketProgress, HandsUpload's four `MAX_*_BYTES`,
      importDiagnosticsPolicy, ranges.ts, strategyProfiles.ts, careerCoach,
      careerScope, coachsNote, headsUpPushFoldReference, postflopAnalyzer,
      pushFoldChecker, studyPlan, RangeGrid, appStore, demoDataset, store.ts,
      buyInExtractor, contributionPackage, importSummary, workerProcessor,
      types/villain.ts, utils/evidence.ts); the `importRuns.ts` re-export
      barrel dropped 3 dead re-exports while keeping the underlying symbols
      exported from their real home (`importDiagnosticsPolicy.ts`) since
      `importRuns.ts` still imports them internally. **Kept, not touched:**
      `saveHeroName` (store.ts, Act III-5 hero-name UI — now carries an
      explicit comment), `solverAdapter.ts`'s 8 `Solver*` types (documented
      forward contract in `docs/product/SOLVER_BOUNDARY.md`, same posture as
      parked villain-archetype code), `spotPacket.ts`'s ~34 flagged types (the
      module itself is heavily live — consumed by HandReplay/ArenaPage/
      TrainerSpotCard/SpotSourcePanel — de-exporting 34 scattered type names
      in a 1288-line file was assessed as high-touch/zero-behavior-change and
      skipped per "if in doubt, keep"); `villainClassifier.ts` / `VillainArchetype`
      / `archetype` / `archetypeConfidence` untouched (parked, per standing
      instruction). F9 — deleted `fix_imports.cjs`, `migrate-styles.mjs`,
      `scratch.ts`, `test-odds.cjs`, `test-odds.mjs`, `test-summaries.cjs`,
      `stress-test-parser.ts`, `hygiene-scanner.ts` (zero references outside
      historical/archived docs); trimmed their rows from `scripts/README.md`
      and the now-dead `hygiene-report.json` `.gitignore` comment; relocated
      `agentKernel.test.ts` to `scripts/__tests__/` (vitest has no
      `test.include` override, so the default glob still discovers it —
      confirmed by running it standalone post-move, 5/5 pass). **Kept:**
      `surface-open-reports.ts`, `agent-kernel.cjs`, `parallel-runner.cjs`,
      regen-\*/install scripts (per instruction; knip still flags these three
      as "unused files" because its static pass doesn't trace the SessionStart
      hook / protocol-doc references — false positive, do not delete). F10
      (worktree pruning) **not done in this wave** — out of scope for this PR
      per the task brief (worktree/branch operations were excluded from the
      Wave 2 execution instructions actually given); revisit separately.
      Full gate green: docs:check, typecheck, typecheck:test, lint (0
      warnings), test (851/851), build.
- [x] **Wave 3 — efficiency:** F11 (lazy PDF stack — biggest bundle win), F12
      (one animation library), F13 (chunk audit), F14 (memoize equity), F15
      (store micro-batch), F16 (node-env test split — biggest CI win). **New
      per the 2026-07-09 health review**
      (`docs/reports/archive/2026-07-09-codebase-health-review.md`): a NEW
      eager-shell regression — `Layout.tsx` globally mounts
      `shared/CommandPalette.tsx`, which statically imports framer-motion,
      pushing the eager shell from ~367 KB to 505.7 KB. Fixing it
      (`LazyMotion`/dynamic-import of the palette) plus an optional CI bundle
      budget is now part of this Wave 3 slice. **PARTIAL — landed 2026-07-09
      via #136:** F11 ✅ (SessionsPage dynamic-imports `pdfExport` in the
      export handler; route chunk 463.9 → 12.3 KB), CommandPalette regression
      ✅ (eager Cmd+K listener + `React.lazy` palette; framer-motion back in
      its lazy chunk; shell 505.7 → 376.3 KB, Vite warning gone), F14 ✅
      (equity in `useMemo`), F15 ✅ (`computeVillainStats` once per villain;
      tournament counts via `bulkGet`+`bulkPut`), F16 ✅ (vitest
      `test.projects` node/jsdom split; wall 326 s → 146 s, 890/890 across 88
      files), CI bundle budget ✅ (`scripts/check-bundle-budget.mjs`, 432 KiB,
      wired into ci.yml). **Still open in this wave:** F12 — gsap verified
      confined to the lazy DashboardPage chunk, but converging on one
      animation library (porting the gsap quartet) is an owner call, not
      taken; F13 — CareerPage chunk audit not done (443.9 KB, unchanged).
      Box stays unchecked until F12 is steered and F13 runs. jspdf also
      remains in the PWA precache (workbox globs untouched — scope call).
      **F12 steered 2026-07-09: DEFER** — gsap is verified confined to the
      lazy dashboard chunk, so the parallel-library cost is contained; the
      convergence port is revisited if/when Wave 4 touches those four
      components. F13 dispatched same day. **✅ CLOSED 2026-07-10:** F13 landed
      via #142 (React.lazy on the five recharts-heavy career components:
      CareerPage route chunk 443.9 → 53.3 KB; jspdf vendor + pdfExport chunks
      excluded from the PWA precache: 85 entries/2 557 KiB → 80/1 765 KiB —
      this also closes the "jspdf remains in the PWA precache" scope note
      above). With F11/F14/F15/F16 landed in #136, the bundle budget in CI,
      and F12 steered DEFER, every item in this wave is landed or steered.
      Verified by the 2026-07-10 health review: shell 376.5 KB, budget guard
      green at 432 KiB.
- [ ] **Wave 4 — beauty:** F17 (token unification), F18 (nine clones), F19
      (god-file decomposition), F21, F24, F25, F26, F28, F29 (§7 addendum); add
      §6 util tests as files are touched. **PARTIAL — landed 2026-07-09 via
      #141:** F21 ✅ (canonical rank-order util `src/utils/cards.ts` consumed
      by pokerstars/postflopAnalyzer/handKey/headsUpPushFoldReference), F26 ✅
      (byte-identical `isBroadway` dropped, vestigial sizing ternary struck,
      `spot: 'NONE'` renamed `FACING_BET_INFO` with a read-boundary
      normalization in HandReplay for legacy IndexedDB rows), F28 ✅
      (unreachable BTN/SB guards collapsed; zero-pot flop sizing now honestly
      skipped instead of measured against the final pot), F29 ✅ (suit-keyed
      monotone textures collapsed to `monotone_high`). **F25 partial — landed
      2026-07-10 via #153 (ahead of F17):** dead desk.css blocks deleted
      (dock, command palette, loader — desk.css now 207 lines) and the
      never-defined `.inner-rule`/`.dh-left`/`.dh-right` classNames removed
      from JSX; the post-F17 re-sweep of `tokens.css`/`desk.css` overlap
      remains. **F19 partial — landed 2026-07-10 via #158/#160 (+#157's
      `srsScheduler`):** ArenaPage decomposed 1 499 → 998 lines — pure
      helpers to `src/pages/arena/` (studyQueueRoute, drillPool,
      actionOptions, curriculumSeeds, studyQueueHelpers), presentational
      pieces to `src/components/arena/`, grading/advance state machine to
      `src/analysis/arenaDrillEngine.ts` with direct unit tests. Remaining
      F19 scope: ArenaPage's stateful core (~998 → ~500), store.ts,
      HandsUpload.tsx, CareerPage.tsx, RangesPage.tsx. Fold into the next
      slice: `arenaDrillEngine.ts` imports from `src/pages/arena/` — the
      tree's only analysis→pages dependency; move `drillPool`/`actionOptions`
      (or the imported helpers) under `src/analysis/` to restore layering,
      and drop the unused `PreflopAction`/`FeedbackStatus` exports.
      **Still open:** F17, F18, F19 remainder, F24, F25 remainder,
      §6 util tests.
- [ ] Flip this report `resolved` + archive when the waves land (or when the
      owner strikes remaining items as won't-fix).
