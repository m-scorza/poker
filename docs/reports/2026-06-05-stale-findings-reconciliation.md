# Stale Findings Reconciliation - 2026-06-05

## Purpose

This note reconciles repeated task names from older review reports, the local
agent spool, and current merged `main`. It is meant to prevent agents from
reopening work that has already landed under a narrower, more accurate scope.

## Current Baseline

- Branch checked: `main` after PRs #48 and #49.
- Current product fact sheet: `docs/product/STATUS.md`.
- Current parser evidence: `docs/product/PARSER_HEALTH.md`.
- Local spool caveat: `.agents/state/task_spool.json` is gitignored and can lag
  behind merged PRs. Treat it as a coordination queue, not the product truth.

## Superseded Or Closed Items

| Old label | Current state | Source of truth |
|---|---|---|
| Facing-raise fallback too loose / SB fallthrough | Closed for fallback and visibility. Ranges now uses explicit hero/opener metadata, a real opener selector, and supported/partial/unsupported labels. Solver-validated per-pair charts remain a strategy-data follow-up, not a bug-fix retry. | `src/data/ranges.ts`, `src/pages/RangesPage.tsx`, `docs/product/STATUS.md` item 22 |
| Open Hand History real-fixture gap | Closed for standardized OHH JSON fixture-sweep evidence. Two OHH JSON fixtures now live under `src/test/fixtures/ohh/`. Native proprietary room text exports are still not claimed. | `src/parser/__tests__/fixtureSweep.test.ts`, `src/test/fixtures/ohh/`, `docs/product/PARSER_HEALTH.md` |
| `statsByPosition` Map serialization / denominator bugs | Closed. Villain position stats use serializable records and persisted raw counters with fake IndexedDB tests. | `src/types/villain.ts`, `src/data/store.ts`, `src/data/__tests__/store.test.ts`, `docs/product/STATUS.md` item 12 |
| Bounty/final-table/squeeze analyzers disconnected | Closed for import attachment and HandReplay surfacing. Remaining work is product validation, not reconnecting the pipeline. | `src/types/analysis.ts`, `src/analysis/scenarioDetector.ts`, `src/components/hands/HandReplay.tsx`, `docs/product/STATUS.md` item 15 |
| Test hygiene / test typechecking | Closed. `typecheck:test`, coverage tooling, and isolated Vitest runs are configured and passing. | `package.json`, `vite.config.ts`, `tsconfig.test.json`, full-suite gate |

## Still Real Follow-Ups

- Native proprietary room text formats such as iPoker, 888/Pacific, WPN,
  PartyPoker, Chico, and Winamax still need real samples before direct parser
  support is claimed.
- Solver-validated per-pair facing-raise charts still need strategy-data or
  solver-feasibility work. The current app labels rule-based coverage honestly.
- Product readiness is still capped by missing external user-validation results
  and release/support process, not by the old high-priority implementation bugs.

## Agent Guidance

When a future prompt says "go on" or asks for remaining tasks:

1. Read `docs/product/STATUS.md`, `docs/product/PARSER_HEALTH.md`, and this
   reconciliation note before acting on older reports.
2. Use `.agents/state/task_spool.json` only after checking whether the named
   task was already merged or superseded.
3. Do not reopen `task-2026-05-30-005`, `006`, `008`, or `009` as fresh
   implementation work unless current source evidence shows a regression.
4. Prefer next tasks from the "Still Real Follow-Ups" list above.
