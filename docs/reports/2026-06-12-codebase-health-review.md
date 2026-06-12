# Codebase Health Review — 2026-06-12

Scheduled Graphify-assisted health review of `main` (HEAD `36ffabd`, after
PRs #56–#57), performed in a remote session on branch
`claude/relaxed-mccarthy-jd66k5`. Graphify (`graphify-out/`, committed in
PR #57) was used as a navigation map; every finding below was verified by
direct inspection or by running the verification gate.

## Codebase Health Summary

- **Overall health: good.** Full gate green in this container:
  `docs:check`, `typecheck`, `typecheck:test`, `lint` (0 errors,
  7 warnings), 693/693 tests (63 files), production build OK.
- **Main risks:** the committed Graphify snapshot is already stale (predates
  PRs #56–#57) and embeds the author's local Windows paths; the
  hand-maintained `STATUS.md` verification stamp lags reality for the second
  review in a row.
- **Highest-impact improvement:** decide a freshness policy for
  `graphify-out/` (regenerate on merge, or re-gitignore the bulky
  vault/cache and keep only `GRAPH_REPORT.md`).
- **Confidence level:** high — all major claims confirmed against source or
  by executing the gate.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-jd66k5` (from `main` @ `36ffabd`).
- **Git status:** clean working tree before this report was added.
- **Uncommitted changes:** none.
- **Graphify freshness:** index generated **2026-06-10 12:26 UTC** on the
  author's Windows machine (root recorded as an absolute local user-profile repo path).
  PR #56 merged 23:08 UTC the same day — **the index predates PR #56 and #57**.
- **Mismatches found:**
  - `.github/workflows/ci.yml` — Graphify's "AUDIT_NEW → CI Workflow" node
    predates the new `Typecheck tests` step (added in #56).
  - `src/__tests__/agentKernel.test.ts` — git-isolation env pinning
    (`GIT_CONFIG_GLOBAL/SYSTEM=/dev/null`, lines 15–16) not in the index.
  - `careerCoach.test.ts`, `studyPlan.test.ts`,
    `villainExploitCrossRef.test.ts` — `confidence` fields added in #56 not
    reflected.
- **Files/modules changed locally but missing or stale in Graphify:** the
  four files above; otherwise the index matches HEAD (the
  `importRuns ↔ store` cycle it reports is still present in source).
- **Confidence impact:** low for structural conclusions, since all leads
  were re-verified directly; do not trust Graphify for CI/test-harness
  detail.

## Verification gate (this run)

| Check | Result |
|---|---|
| `npm run docs:check` | pass |
| `npm run typecheck` | pass |
| `npm run typecheck:test` | pass (regression from 2026-06-10 review stays fixed) |
| `npm run lint` | pass — 0 errors, 7 `jsx-a11y` warnings |
| `npm test` | **693 / 693** (63 files) |
| `npm run build` | pass (PWA precache 57 entries) |

The suite passing in this managed remote container is itself the
verification that the PR #56 kernel-test git isolation works in the exact
environment that previously failed.

## Confirmed findings

### 1. Committed Graphify snapshot is stale-by-construction and leaks local paths
- **Status:** new. **Priority:** medium.
- **Evidence:** `graphify-out/` is 12 MB (~2,000 Obsidian notes,
  52k-line `graph.json`). `manifest.json`, `cache/stat-index.json`,
  `.graphify_root`, `.graphify_python` embed absolute
  local user-profile paths. Index timestamp 2026-06-10 12:26 UTC predates
  the last two merges to `main`. No CI step or hook regenerates it.
- **Why it matters:** the repo's posture is privacy-careful (privacy
  boundary guard, sanitized fixtures); committing a personal machine
  username/path is off-posture, and a knowledge graph that silently drifts
  from `main` will mislead future agents the same way CLAUDE.md drift did.
- **Recommended action:** either (a) re-gitignore `graphify-out/cache`,
  `manifest.json`, `.graphify_root`, `.graphify_python` and the Obsidian
  vault, keeping only `GRAPH_REPORT.md` with a generation-commit stamp, or
  (b) document a regeneration cadence in `scripts/README.md`. Strip the
  local paths either way.

### 2. `importRuns.ts ↔ store.ts` module cycle (Graphify signal, confirmed)
- **Status:** new (first surfaced by Graphify). **Priority:** low.
- **Evidence:** `src/data/importRuns.ts:12`
  `export { saveImportRun, getRecentImportRuns } from './store'`;
  `src/data/store.ts:13` `import type { ImportRunRecord } from './importRuns'`.
- **Why it matters:** no runtime hazard (the store→importRuns leg is
  type-only and erased), but the re-export inverts ownership: persistence
  lives in `store.ts` while the domain module fronts it, and consumers
  (`HandsUpload.tsx`, `LeaksPage.tsx`, `CareerPage.tsx`) import persistence
  through `importRuns`. Any future non-type import in `store.ts` makes the
  cycle real.
- **Recommended action:** move `saveImportRun`/`getRecentImportRuns` into
  `importRuns.ts` (they already operate only on the `importRuns` table), or
  have consumers import them from `store.ts` directly and drop the
  re-export.

### 3. `STATUS.md` verification stamp stale — second consecutive review
- **Status:** recurring (open since 2026-06-10 review, finding 3) —
  escalated from low to medium per ledger policy.
- **Evidence:** `docs/product/STATUS.md:7-9` still says "Last verified
  2026-06-05, branch `codex/ohh-fixture-sweep`, 666/666 (61 files)".
  Reality at `36ffabd`: 693/693, 63 files. Autogen blocks are current
  (`docs:check` passes); only the hand-maintained header lags.
- **Recommended action:** bump the stamp in this PR (done here) and
  consider folding the stamp into the autogen block so `docs:check`
  enforces it.

### 4. 2026-06-10 findings 1 & 2 — resolved and verified
- **Status:** resolved.
- **Evidence:** `.github/workflows/ci.yml` now has a `Typecheck tests`
  step; `agentKernel.test.ts:15-16` pins `GIT_CONFIG_GLOBAL/SYSTEM`;
  `typecheck:test` and the full suite pass in this remote container.

### 5. Critical Dependabot alert: vitest < 3.2.6 — FIXED in this PR
- **Status:** new. **Priority:** high (severity) / low (practical exposure).
- **Evidence:** GitHub Dependabot alert #8 (critical) on `main`;
  `npm audit` confirms GHSA-5xrq-8626-4rwp — arbitrary file read/execute
  when the Vitest UI server is listening. Dev-only dependency; the UI
  server is not used in CI, so practical exposure is local-dev only.
- **Fix:** `npm audit fix` bumped vitest 3.2.5 → 3.2.6 (lockfile-only,
  within the existing `^3.0.0` range). Suite re-verified: 693/693.

### 6. Hygiene-scanner false positive (tooling quality note)
- **Status:** new. **Priority:** low.
- **Evidence:** `scripts/hygiene-scanner.ts` reports
  `src/main.tsx` "imported default from ./App, but it has no default
  export"; `src/App.tsx:84` is `export default App`. It also flags
  `calculateLeakConfidence` as `unused_completely` although
  `leakDetector.ts:463` calls it (same-file use isn't counted).
- **Why it matters:** agents using the scanner for "dead code" sweeps will
  delete live code if they trust `unused_completely` without checking
  same-file usage.
- **Recommended action:** treat scanner output as leads only; fix the
  default-export resolution and same-file-usage blind spot when the scanner
  is next touched.

## Watchlist (carried forward, re-verified 2026-06-12)

- **`HandsUpload.tsx` (802 lines, no component test)** — recurring;
  unchanged. Still the largest untested UI surface (ZIP extraction, worker
  orchestration, diagnostics export, reference-file handling in one file).
- **`store.ts` (826 lines)** — recurring; villain aggregation
  (`collectVillainHandObservation` :508, `aggregateVillainStats` :610) is
  analysis logic in the data layer. Tested; cohesion debt only.
- **7 `jsx-a11y` warnings** — recurring; in `HandReplay.tsx`,
  `HandsUpload.tsx`, `DualRangeMatrix.tsx`, `RangeGrid.tsx`.
- **`sumUsd` in `src/parser/money.ts`** — recurring; imported by
  `DashboardPage.tsx:16` and `CareerPage.tsx:34`; behaves like a shared util.
- **Ledger correction:** the 2026-06-10 note "only HandReplay and HandsPage
  have component tests" is **outdated** — 11 component test files exist
  (career cards, TrendChart, all `shared/` widgets, App route smoke).
  Page-level coverage beyond `HandsPage` is still thin.
- **Test factory duplication** — `makeHand`/`makePlayer`/`makeTournament`
  re-implemented in 6+ test files (e.g. `bountyAnalyzer.test.ts:10`,
  `finalTableAnalyzer.test.ts:10`, `store.test.ts:19`). A shared
  `src/test/factories.ts` would cut churn when `Hand` grows fields.
- **Scripts debris** — `fix_imports.cjs` is self-described "safe to
  delete"; `test-odds.cjs`/`test-odds.mjs` duplicate each other;
  `scratch.ts` is an ad-hoc check. All documented in `scripts/README.md`,
  so low priority.

## Graphify signals not confirmed as issues

- **God nodes (`HeroDecision` 48 edges, `Hand`, `Position`)** — verified:
  `HeroDecision` is referenced in 22 non-test source files, but these are
  shared domain types in `src/types/`; hub-ness is by design, not
  over-coupling. No action.
- **"680 isolated nodes"** — sampled: package.json keys, tsconfig options,
  fixture files. Graph artifact, not a documentation gap.
- **Corpus headline "2 files · ~1,014,626 words"** — reflects the
  incremental second run (`cost.json`: run 1 = 492 files, run 2 = 2);
  misleading but cosmetic.
- **Inferred edges on PokerStars format nodes** — fixture taxonomy
  relations; spot-checked, harmless.

## Review Ledger

- **Date/time:** 2026-06-12 (remote session).
- **Trigger:** scheduled Graphify-assisted health review.
- **Branch:** `claude/relaxed-mccarthy-jd66k5` (from `main`).
- **Commit:** `36ffabd`.
- **Scope:** full repo; gate executed; Graphify map cross-checked.
- **Graphify sync status:** stale by 2 PRs (#56, #57); generated on
  foreign machine; structural core matches HEAD.
- **Files changed since last run (c9106b8):** `ci.yml`,
  `agentKernel.test.ts`, 3 analysis test files (#56); `graphify-out/**`,
  `.gitignore` (#57).
- **Areas inspected:** `src/data/importRuns.ts`, `src/data/store.ts`,
  `src/components/hands/HandsUpload.tsx` (size/test presence),
  `src/analysis/leakDetector.ts`, `src/App.tsx`, `src/main.tsx`,
  `.github/workflows/ci.yml`, `scripts/` (all), `graphify-out/` metadata,
  `docs/product/STATUS.md`, `docs/reports/2026-06-10-codebase-health-review.md`.
- **New findings:** Graphify staleness/path leak (#1), importRuns↔store
  cycle (#2), hygiene-scanner false positives (#5).
- **Recurring findings:** STATUS.md stamp (#3, escalated), HandsUpload
  size/coverage, store.ts cohesion, jsx-a11y warnings, `sumUsd` location.
- **Resolved findings:** typecheck:test CI enforcement, kernel test git
  isolation (both from 2026-06-10).
- **Stale findings:** "only 2 component test files" claim from 2026-06-10
  — corrected above.
- **Recommended next actions:** see below.

## Recommended next actions

1. Decide `graphify-out/` policy (slim + stamp, or regeneration cadence)
   and strip local user-profile paths — prevents a second drifting
   source-of-truth — `graphify-out/**`, `.gitignore`, `scripts/README.md`.
2. Keep the `STATUS.md` stamp honest (bumped in this PR; consider moving it
   into the autogen block) — `docs/product/STATUS.md`, `scripts/regen-status.ts`.
3. Break the `importRuns ↔ store` re-export knot — `src/data/importRuns.ts:12`,
   `src/data/store.ts`.
4. Add a `HandsUpload` component test (happy-path single-file import +
   diagnostics export) — `src/components/hands/HandsUpload.tsx`.
5. Extract a shared test factory module — `src/analysis/__tests__/*`,
   `src/data/__tests__/*`.
