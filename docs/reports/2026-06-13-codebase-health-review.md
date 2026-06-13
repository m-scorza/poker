# Codebase Health Review — 2026-06-13

Scheduled Graphify-assisted health review of `main` (HEAD `e9717bd`, after
PRs #60–#62), performed in a remote session on branch
`claude/relaxed-mccarthy-9v7mv0`. Graphify (`graphify-out/`, committed in
PR #57, index generated 2026-06-10) was used as a navigation map; every
finding below was verified by direct inspection or by running the
verification gate. Previous ledger: `2026-06-12-codebase-health-review.md`.

## Codebase Health Summary

- **Overall health: good engine, compromised dashboard.** Full gate green
  in this container: `docs:check`, `typecheck`, `typecheck:test`, `lint`
  (0 errors, 10 warnings), 693/693 tests (63 files), production build OK.
  Parser/analysis layers unchanged and solid. The PR #60 design-system
  port, however, left **prototype placeholder data rendering as real user
  stats on the main dashboard**.
- **Main risks:** fabricated numbers on the dashboard (hardcoded equity
  curve, fake "Best cash"/"Max drawdown"/"BB/100"/mock EV line); a
  positional-heatmap regression that silently hides 9-max positions; four
  unused 3D runtime dependencies; Graphify index now 4 PRs stale with the
  entire new UI layer unindexed.
- **Highest-impact improvement:** purge or wire up the placeholder data in
  `MonumentCurve`, `BankrollChart`, `WireTape`, and `VerdictGauge` — the
  app's credibility rests on its numbers being real.
- **Confidence level:** high — all major claims confirmed against source
  or by executing the gate.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-9v7mv0` (from `main` @ `e9717bd`).
- **Git status:** clean working tree before this report was added.
- **Uncommitted changes:** none.
- **Graphify freshness:** index still dated **2026-06-10 12:26 UTC** —
  unchanged since the last review, now stale by **four merged PRs**
  (#56, #57, #60, #62). `.graphify_root` / `.graphify_python` still embed
  the author's local Windows user-profile paths (unresolved from the
  2026-06-12 review, finding 1).
- **Mismatches found:** the entire PR #60 surface is absent from the
  graph — 6 new dashboard components (`BankrollChart`, `MonumentCurve`,
  `PositionalHeatmap`, `RingHud`, `VerdictGauge`, `WireTape`), the new
  `src/styles/` directory (`tokens.css`, `desk.css`,
  `reinterpretation.css`), `scripts/migrate-styles.mjs`, 5 new runtime
  deps, and the `DashboardPage.tsx` decomposition (~600 → 184 lines).
  Graphify's "Data Store & Hand Replay" / "App Layout & Store" communities
  describe the pre-reskin UI.
- **Files/modules changed locally but missing or stale in Graphify:**
  64 files changed across `36ffabd..e9717bd`; all UI-layer nodes are stale.
- **Confidence impact:** Graphify remains usable for parser/analysis/data
  navigation (those layers barely changed) but is **not trustworthy for
  anything UI** — this review inspected the new components directly.

## Verification gate (this run)

| Check | Result |
|---|---|
| `npm run docs:check` | pass |
| `npm run typecheck` | pass |
| `npm run typecheck:test` | pass |
| `npm run lint` | pass — 0 errors, **10 warnings (was 7)** — all 3 new ones in PR #60 components |
| `npm test` | **693 / 693** (63 files) — unchanged; no tests added for the new dashboard layer |
| `npm run build` | pass (PWA precache 56 entries, ~2.4 MB) |

Note: PR #60's handoff entry records verification as `npm run build` only;
CI gated the merge, but no tests cover the new components, so the suite
could not catch the issues below.

## Graphify Map Exploration

- **Main application areas:** parser (PokerStars/GGPoker/OHH + worker),
  analysis engines (range/scenario/postflop/leak/ICM/bounty/FT/career),
  data layer (Dexie store, Zustand appStore, sessions), pages + shared
  components, knowledge base, agent-coordination docs.
- **Entry points:** `src/main.tsx` → `src/App.tsx` (routes), `src/parser/worker.ts`.
- **Core modules (per graph + verified):** `store.ts`, `rangeChecker.ts`,
  `scenarioDetector.ts`, `leakDetector.ts`, `careerCoach.ts`.
- **Dependency clusters:** the graph's 104 communities still map cleanly to
  real module boundaries for non-UI code (e.g. "Leak Detector Engine",
  "Parser Contribution Package", "Career Stats Computation").
- **Highly connected files:** `HeroDecision`/`Hand` type hubs (by design —
  dispositioned 2026-06-12), `store.ts`.
- **Isolated/orphaned areas:** "680 isolated nodes" — previously sampled,
  graph artifact; unchanged.
- **Suspicious relationships:** `importRuns ↔ store` cycle — still present
  (see finding 7).

## Areas Inspected Directly

| Area | Why | Result |
|---|---|---|
| `git diff 36ffabd..e9717bd` (64 files) | everything merged since last review | scoped this review to PR #60/#62 surface |
| `src/components/dashboard/*` (all 6 new components) | new, unindexed, untested | findings 1–4, 6 |
| `src/pages/DashboardPage.tsx` | rewritten in #60 | findings 1, 3, 5 |
| `package.json` diff + `grep` for `three`/`gsap` imports | 5 new runtime deps | finding 2 |
| `docs/design/DECISIONS.md`, `DESIGN_SYSTEM_PORT_PLAN.md` | design intent for #60 | D8 retires WebGL → confirms finding 2 |
| `src/analysis/leakDetector.ts`, `careerCoach.ts` | are HTML strings ever produced? | no — finding 5 confirmed gratuitous |
| `src/analysis/positionStats.ts` + old `DashboardPage` @ `36ffabd` | heatmap regression check | finding 3 confirmed |
| `src/data/importRuns.ts:12`, `store.ts:13` | recurring cycle | still present |
| `src/styles/tokens.css`, `index.html`, CLAUDE.md §UI/UX, §Dependencies, §Structure | doc drift after reskin | finding 8 |
| `scripts/` + `scripts/README.md` | debris watchlist | `migrate-styles.mjs` undocumented |
| `scripts/migrate-styles.mjs`, `src/analysis/icmDetector.ts` diff | why a design PR touched analysis | finding 9 |
| Full gate execution | trust nothing | table above |

## Confirmed Findings

### 1. Dashboard renders fabricated data as real user stats
- **Status:** new. **Priority:** high.
- **Evidence:**
  - `MonumentCurve.tsx:18` — `EQUITY` is a 36-point hardcoded array; the
    hero "lifetime curve" on the dashboard is static fake data regardless
    of imported hands.
  - `MonumentCurve.tsx:100-108` — "Best cash +$22.50 · 1st of 89 · Oct" and
    "Max drawdown $18.40 · recovered in 11" are hardcoded literals.
  - `DashboardPage.tsx:125` — WireTape ticker shows `BB/100 '+4.2'`
    hardcoded with a permanent `up` class.
  - `BankrollChart.tsx:26` — the dashed "EV" line is
    `cumulativePnl * 0.9; // mock EV for display`.
  - `DashboardPage.tsx:158` — `verdictConf="Confidence: High"` is a
    hardcoded label next to a real readiness score.
- **Graphify signal:** none — components postdate the index.
- **Why it matters:** this is the exact failure mode the repo's own
  Known Bugs list warns about (#12 "misleading stats") and the opposite of
  the STATUS.md culture ("facts, not aspirations"). A user comparing the
  monument number (real) against the curve behind it (fake) is being lied
  to by the primary screen of the app. The mock EV line is worse: EV
  divergence is a real poker concept users make decisions on.
- **Recommended action:** wire `MonumentCurve` to
  `computeSessionTrends`/`computeIntraSessionTrends` output (the data is
  already computed in `DashboardPage`), derive best-cash/max-drawdown from
  `careerCoach`/`financials` (max drawdown already exists in
  `careerCoach.ts`), compute BB/100 or drop the ticker item, and delete the
  mock EV path until real all-in-EV exists (parser doesn't capture it).

### 2. Unused 3D dependency stack shipped as runtime deps
- **Status:** new. **Priority:** medium.
- **Evidence:** `package.json` gained `three ^0.184.0`,
  `@react-three/fiber ^9.6.1`, `@react-three/drei ^10.7.7`,
  `@types/three ^0.184.1` in `dependencies`. `grep` over `src/` finds
  **zero imports** of any of them — only `gsap`/`@gsap/react` are used.
  `docs/design/DECISIONS.md` D8 explicitly retires "3D tilt …
  shader-bg (WebGL)" effects; D6 keeps the WebGL point-mesh as
  "future opt-in, never default".
- **Graphify signal:** none (deps postdate index); STATUS.md autogen
  faithfully lists them, which makes the deps list misleading about what
  the app uses.
- **Why it matters:** ~1,500 packages-worth of install/audit surface and
  lockfile churn for code the design system itself rejected. Vite
  tree-shakes them out of the bundle (precache ~2.4 MB, unchanged), so the
  cost is supply-chain/maintenance, not user-facing. `@types/three` is a
  devDependency even if the rest stays.
- **Recommended action:** `npm uninstall three @react-three/fiber
  @react-three/drei @types/three`; reinstall behind a lazy-loaded module
  if the opt-in lab mode ever ships.

### 3. PositionalHeatmap regression: 9-max positions silently hidden
- **Status:** new (regression introduced by #60). **Priority:** medium-high.
- **Evidence:** `PositionalHeatmap.tsx:29` hardcodes
  `['BTN','SB','BB','UTG','HJ','CO']` ("6-max ring telemetry").
  `computePositionStats` (`positionStats.ts:22`) returns every position
  with ≥1 hand, including `UTG+1`, `MP1`, `MP2`. The pre-#60 dashboard
  (`36ffabd:DashboardPage.tsx:344-`) rendered **all** positions in a table
  with Hands / VPIP-PFR / **Compliance** / **Win Rate** / bb/100 / Total BB
  columns; the new card shows 6 seats and drops the compliance and
  win-rate columns. No other page renders `positionStats` (StatsPage does
  not import it).
- **Why it matters:** the fixture corpus and the user's real games are
  predominantly PokerStars 9-max tournaments — early/middle-position data
  (where range discipline matters most) is now invisible, and the
  position-level compliance metric lost its only surface.
- **Recommended action:** render seats from the `stats` prop (or add an
  overflow row for non-6-max positions), and restore compliance/win-rate
  in the inspect panel.

### 4. New dashboard components have zero test coverage
- **Status:** new. **Priority:** medium.
- **Evidence:** `src/components/dashboard/__tests__/` contains only
  `TrendChart.test.tsx`. Test count unchanged at 693 across #60. The PR's
  handoff entry lists verification as "`npm run build` — passed" only.
  Findings 1 and 3 are exactly the bug class a render-with-real-props test
  would catch (e.g. "curve path changes when trendData changes",
  "UTG+1 seat renders when stats include it").
- **Recommended action:** add render tests for `MonumentCurve` (curve
  reflects props), `PositionalHeatmap` (all positions visible),
  `BankrollChart` (no EV path until real), reusing the existing
  Testing Library + jsdom setup that already covers 11 component files.

### 5. Dead controls and prototype carry-overs in the new UI
- **Status:** new. **Priority:** low-medium.
- **Evidence:**
  - `DashboardPage.tsx:141-142` — "Sync" and "Export report" buttons with
    no handlers (PDF/CSV export exists in `utils/` but isn't wired here).
  - `BankrollChart.tsx:11,58-60` — Lifetime/30d/7d tabs set state that is
    never used to filter data (lint flags `tab` as an unnecessary dep).
  - `VerdictGauge.tsx:86-91` — "fix" CTA button has no `onClick`.
  - `MonumentCurve.tsx:67,82-84` / `RingHud.tsx:92-93` — static-prototype
    `id` attributes (`monCurve`, `monInt`, `hudVal`…) that would duplicate
    if a component ever rendered twice; GSAP `innerText` tweens write
    `innerHTML` in `onUpdate`, fighting React's ownership of those nodes.
- **Why it matters:** dead buttons erode trust in the whole instrument
  panel, and the DOM-mutation pattern will desync displayed numbers from
  props the first time a live query updates mid-animation.
- **Recommended action:** wire "Export report" to the existing
  `pdfExport`/`csvExport`, delete "Sync" until it does something, make the
  tabs filter `trendData` by date or remove them, and give the fix button
  a navigation target (e.g. `/leaks`).

### 6. Gratuitous `dangerouslySetInnerHTML` on plain-string data
- **Status:** new. **Priority:** low (today) / medium (pattern).
- **Evidence:** `DashboardPage.tsx:173` injects `topLeak.description`;
  `MonumentCurve.tsx:87` injects `verdict`. Both sources are verified
  plain-string literals (`leakDetector.ts` descriptions,
  `CareerRecommendation` union in `careerCoach.ts`) — no HTML is ever
  produced, so the sinks buy nothing and create two latent XSS sinks if
  those strings ever interpolate user data (villain names, file contents).
- **Recommended action:** replace both with plain `{text}` rendering.

### 7. `importRuns.ts ↔ store.ts` module cycle
- **Status:** recurring (2026-06-12 finding 2, unresolved). **Priority:** low.
- **Evidence:** unchanged — `importRuns.ts:12` re-exports
  `saveImportRun`/`getRecentImportRuns` from `store.ts`; `store.ts:13`
  imports `ImportRunRecord` type back. Still type-only on one leg, so no
  runtime hazard yet.
- **Recommended action:** unchanged from last review; no new evidence, not
  escalated.

### 8. CLAUDE.md now contradicts the shipped design system
- **Status:** new instance of a recurring class (CLAUDE.md drift).
  **Priority:** medium.
- **Evidence:**
  - §UI/UX (line 365-367): "Background `#0a0a0f`, green accents `#00ff88`",
    "sans-serif (DM Sans)" — `tokens.css` ships canvas `#0a0a0c`, silver
    accent `#C9CDD6` (green reserved for money `#34D98C`), and D9 sets
    Bricolage Grotesque + Inter + JetBrains Mono.
  - §Project Structure ("verified 2026-05-31"): `dashboard/` lists 3
    components (now 9); `src/styles/` doesn't exist in the tree.
  - §Key Dependencies ("verified 2026-05-31"): missing `gsap`,
    `@gsap/react`, `three`, `@react-three/*`.
  - CLAUDE.md's own contract ("update this file in the same PR as the code
    change") was not honored by #60.
- **Why it matters:** the next agent styling a component from CLAUDE.md's
  palette will reintroduce the retired green-accent theme.
- **Recommended action:** one doc PR updating §UI/UX (point it at
  `src/styles/tokens.css` + `docs/design/DECISIONS.md` as source of
  truth), the structure tree, and the deps list (after finding 2 resolves,
  to avoid double churn).

### 9. Presentation classnames live in the analysis layer
- **Status:** new (pre-existing, exposed by #60). **Priority:** low.
- **Evidence:** `icmDetector.ts:168-178` (`icmStageColor`) returns Tailwind
  arbitrary-value classes; the #60 token rename had to modify this
  *analysis* file and its unit test (`icmDetector.test.ts`) to restyle the
  app — proof of layering leakage. `migrate-styles.mjs` rewrote `.ts`
  analysis files wholesale for the same reason.
- **Recommended action:** move stage→color mapping into a UI-layer map
  keyed on `ICMStage`; analysis modules should return semantic enums only.

### 10. Scripts debris grew: `migrate-styles.mjs` undocumented one-shot codemod
- **Status:** recurring class, new instance. **Priority:** low.
- **Evidence:** `scripts/migrate-styles.mjs` (already-run token rename,
  not idempotent against new `--color-*` aliases in `tokens.css`) is not
  listed in `scripts/README.md`. Pre-existing debris (`fix_imports.cjs`
  "safe to delete", `test-odds.cjs`/`.mjs` duplicates, `scratch.ts`)
  unchanged.
- **Recommended action:** delete it or add a README row marking it
  one-shot/danger (re-running it now would rewrite the legitimate
  `--color-*` primitives in `tokens.css`).

## Graphify Signals Not Confirmed

- **God nodes / 680 isolated nodes / corpus headline / inferred fixture
  edges** — all dispositioned in the 2026-06-12 review; the index has not
  changed since, so the dispositions stand. No new signals to evaluate
  (and none could exist for #60 code — see sync status).

## Watchlist (carried forward, re-verified 2026-06-13)

- **`HandsUpload.tsx` 802 lines, no component test** — recurring; restyled
  in #60 but size/coverage unchanged.
- **`store.ts` 826 lines, villain aggregation in data layer** — recurring;
  unchanged.
- **jsx-a11y warnings** — recurring; the original 7 are unchanged
  (`HandReplay`, `HandsUpload`, `DualRangeMatrix`, `RangeGrid`); total is
  now 10 with the three new PR #60 warnings (finding 5 / RingHud
  `as any` at `RingHud.tsx:101`).
- **`sumUsd` in `src/parser/money.ts`** — recurring; the new
  `DashboardPage.tsx:12` still imports money math from the parser package.
- **Test factory duplication** — recurring; `makeHand`/`makeDecision`
  re-implemented across 10+ analysis test files.
- **RingHud target labels** — new minor: "Target 15–22%" (PFR) and
  "Target 6–10%" (3-bet) disagree with CLAUDE.md's metrics table
  (15–23%, 7–10%). Whichever is right, hardcoded UI targets bypass the
  METRICS_DICTIONARY single-source-of-truth rule.
- **Dependabot alert #9 (low) — esbuild advisory chain** — new; surfaced
  on push during this review. `npm audit` traces it to esbuild ≤0.28 via
  `vite`/`tsx`/`vitest` (GHSA-gv7w-rqvm-qjhr, GHSA-g7r4-m6w7-qqqr). Dev
  tooling only (dev-server / Deno vectors; not in the shipped bundle), and
  the clean fix is a breaking `vite@8` major bump — schedule it as its own
  upgrade PR rather than an audit-fix --force.

## Review Ledger

- **Date/time:** 2026-06-13 (remote session).
- **Trigger:** scheduled Graphify-assisted health review.
- **Branch:** `claude/relaxed-mccarthy-9v7mv0` (from `main`).
- **Commit:** `e9717bd`.
- **Scope:** full gate + focused review of the PR #60/#62 delta
  (64 files); recurring-findings re-verification.
- **Graphify sync status:** stale by 4 PRs; UI layer entirely unindexed;
  local-path leak unresolved.
- **Files changed since last run (36ffabd):** PR #60 design-system port
  (58 files: 6 new dashboard components, `src/styles/`, page rewrites,
  5 new deps, `migrate-styles.mjs`) + PR #62 (health review doc,
  STATUS stamp, vitest 3.2.6 lockfile patch).
- **Areas inspected:** see table above.
- **New findings:** fabricated dashboard data (1), unused 3D deps (2),
  heatmap regression (3), untested dashboard layer (4), dead controls /
  prototype carry-overs (5), gratuitous `dangerouslySetInnerHTML` (6),
  CLAUDE.md design drift (8), analysis-layer classnames (9),
  undocumented codemod (10).
- **Recurring findings:** importRuns↔store cycle (7), Graphify
  staleness/path leak (worsened: 2 → 4 PRs behind), HandsUpload,
  store.ts, sumUsd, test factories, scripts debris.
- **Resolved findings:** STATUS.md stamp staleness (bumped in #62; bumped
  again in this PR — watch the cadence), vitest GHSA-5xrq-8626-4rwp
  (patched in #62, still at 3.2.6).
- **Worsened findings:** lint warnings 7 → 10 (all from #60);
  Graphify staleness.
- **Stale findings:** none invalidated this run.
- **Recommended next actions:** below.

## Recommended next actions

1. Replace the fabricated dashboard data with real computations or remove
   the elements — the app's whole pitch is honest numbers —
   `MonumentCurve.tsx`, `BankrollChart.tsx:26`, `DashboardPage.tsx:125,158`.
2. Fix the positional heatmap to render every position with data and
   restore the compliance column — `PositionalHeatmap.tsx:29`,
   `positionStats.ts`.
3. Uninstall the unused 3D stack (`three`, `@react-three/fiber`,
   `@react-three/drei`, `@types/three`) — `package.json`.
4. Add render tests for the new dashboard components (props-in,
   pixels-out assertions) — `src/components/dashboard/__tests__/`.
5. Update CLAUDE.md §UI/UX, §Structure, §Dependencies to match the shipped
   design system — `CLAUDE.md`, pointing at `src/styles/tokens.css` and
   `docs/design/DECISIONS.md`.
6. Decide the `graphify-out/` freshness policy (now 4 PRs stale, paths
   still leaked) — escalating; third review in a row where the committed
   index misleads on the most recently changed layer.
