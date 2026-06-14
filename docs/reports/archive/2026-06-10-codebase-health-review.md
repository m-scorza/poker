---
status: resolved
date: 2026-06-10
related: ['#56', '#74']
---
# Codebase Health Review - 2026-06-10

Scheduled health review of `main` (HEAD `c9106b8`, after PRs #52-#55), performed
in a remote session on branch `claude/charming-cannon-9nm8z0`.

> **Graphify caveat:** the Graphify index (`graphify-out/`, gitignored) does not
> exist in this fresh clone and no Graphify tooling was reachable. Every
> conclusion below comes from direct inspection (git history, source reads,
> grep-based dependency checks) and from running the full verification gate.
> Treat any future Graphify snapshot older than PR #52 as stale: PRs #52-#55
> rewrote `scripts/agent-kernel.cjs`, `src/data/importRuns.ts`,
> `src/utils/evidence.ts`, `src/analysis/leakDetector.ts`, and added
> `scripts/privacy-boundary-check.ts`.

## Summary

- **Overall health: good.** Layering is clean (parser/analysis/data never
  import UI), the test corpus is large (693 tests / 63 files), CI on `main` is
  green for all recent merges, and docs autogen blocks are current.
- **Main finding (fixed in this PR):** `npm run typecheck:test` was failing on
  `main` with 3 errors because PR #55 made `Leak.confidence` required while
  three test `Leak` literals were never updated — and CI never runs
  `typecheck:test`, so it landed silently. This regresses the
  "test typechecking closed and passing" claim in
  `docs/reports/2026-06-05-stale-findings-reconciliation.md`.
- **Second finding (fixed in this PR):** `src/__tests__/agentKernel.test.ts`
  inherited the host's global git config, so any machine with forced commit
  signing (e.g. managed remote sandboxes) saw 3 test failures. The test now
  pins `GIT_CONFIG_GLOBAL/SYSTEM` to `/dev/null`.

## Verification gate (this run, before fixes)

| Check | Result |
|---|---|
| `npm run docs:check` | pass |
| `npm run typecheck` | pass |
| `npm run typecheck:test` | **fail — 3 errors** (careerCoach, studyPlan, villainExploitCrossRef tests) |
| `npm run lint` | pass (7 `jsx-a11y` warnings, 0 errors) |
| `npm test` | 690 / 693 — **3 env-dependent failures** in `agentKernel.test.ts` (forced commit signing) |

After the fixes in this PR: `typecheck:test` passes, full suite 693 / 693.

## Confirmed findings

### 1. `typecheck:test` regressed on `main` and is not enforced by CI — FIXED
- **Status:** new (regression of a previously closed item). **Priority:** high.
- **Evidence:** PR #55 (`c9106b8`) added required `confidence: 'low' | 'medium' | 'high'`
  to `Leak` (`src/analysis/leakDetector.ts:30`). Test literals in
  `careerCoach.test.ts`, `studyPlan.test.ts`, and
  `villainExploitCrossRef.test.ts` were not updated. `.github/workflows/ci.yml`
  ran `typecheck` but not `typecheck:test`.
- **Fix:** added `confidence` values consistent with
  `calculateLeakConfidence` thresholds to the three test literals, and added a
  `Typecheck tests` step to CI so this class of drift can't land again.

### 2. `agentKernel.test.ts` depends on ambient git config — FIXED
- **Status:** new. **Priority:** medium.
- **Evidence:** the test commits in temp repos via plain `git`; hosts with
  `commit.gpgsign=true` plus an unavailable signing program fail 3 tests
  ("signing failed ... fatal: failed to write commit object"). CI's ubuntu
  runner has no such config, so CI stayed green while remote agent sessions saw
  a red suite.
- **Fix:** `runGit`/`runKernel` now pass an env with
  `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_SYSTEM=/dev/null`, and explicit
  author/committer identity.

### 3. `STATUS.md` verification stamp is stale — OPEN (minor)
- **Status:** new. **Priority:** low.
- **Evidence:** `docs/product/STATUS.md:7-9` says "Last verified 2026-06-05,
  branch `codex/ohh-fixture-sweep`, 666 / 666 (61 files)". Four PRs have merged
  since; the suite is now 693 tests / 63 files. Autogen blocks are current
  (docs:check passes) — only the hand-maintained header lags.
- **Recommended action:** bump the stamp on the next verified pass of `main`.

## Watchlist (no action required yet)

- **`HandsUpload.tsx` (802 lines)** mixes ZIP extraction, worker orchestration,
  diagnostics export/clear, local reference-file handling, and rendering in one
  component, with no component-level test. Largest untested UI surface.
- **`store.ts` (826 lines)** contains ~250 lines of villain stat aggregation
  (`collectVillainHandObservation`, `aggregateVillainStats`) that is analysis
  logic living in the data layer; it is tested, so this is cohesion debt, not a
  correctness risk.
- **7 `jsx-a11y/no-static-element-interactions` lint warnings** in
  `RangeGrid.tsx`, `DualRangeMatrix.tsx`, and others — clickable divs without
  keyboard support.
- **Component test coverage is thin:** only `HandReplay` and `HandsPage` have
  component tests; all other pages/components rely on analysis-layer tests.
- **`sumUsd` lives in `src/parser/money.ts`** but is imported by
  `DashboardPage`/`CareerPage`; it behaves like a shared util.

## Cross-run ledger

- Items closed in `2026-06-05-stale-findings-reconciliation.md` were spot
  checked and remain closed (OHH fixtures exist under `src/test/fixtures/ohh/`,
  ranges coverage labels exist in `RangesPage.tsx`). No reopen needed.
- "Test hygiene / test typechecking — closed" from that note is **partially
  reopened and re-closed** by finding 1 above: the tooling existed but was not
  enforced; it is now enforced in CI.
- Still-real follow-ups from 2026-06-05 (proprietary room formats, solver-validated
  facing-raise charts, user validation execution) remain open and unchanged.
