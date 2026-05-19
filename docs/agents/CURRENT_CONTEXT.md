# Current Context — Read First

**Last updated:** 2026-05-17
**Purpose:** short, current routing note so agents do not accidentally follow stale plans or mix the separate design track into engine/backend work.

## Current posture

- Product posture: private/local generic poker analyzer.
- Reg Life / curriculum licensing: informal encouragement only; no written terms in repo.
- Do not start pricing/funnel/public-sharing/public-distribution work unless the user explicitly overrides the gate.
- Dashboard/design exploration is now an ACTIVE track owned by Antigravity. We are aligning the application with the `docs/design/00_source_of_truth_poker_dashboard.md` design brief, specifically targeting the Dashboard v5 Action Layer.

## Current engineering lane

The active Hermes lane is engine/backend reliability, not dashboard design.

Recommended next backend sequence:

1. Session financial aggregation helper consolidation is complete in the dirty tree.
   - Current verified source finding: `src/data/sessions.ts` uses `getTournamentCost()` and `getTournamentRevenue()` from `src/analysis/financials.ts`.
   - Regression tests cover bounty revenue and PLAY/TICKET non-cash exclusion for Sessions, Career Coach, and Career Stats.
2. Continue scanning for any remaining tournament financial math bypassing `financials.ts` before changing adjacent UI summaries.
3. Add durable import-run / data-health persistence.
4. Propagate confidence into leak/range/scenario analysis outputs.
5. Expand parser fixture variant coverage.

## Current source-of-truth order

When docs disagree, use:

1. Running source code and tests
2. `docs/product/STATUS.md`
3. This file for current work routing only
4. `docs/agents/AGENT_HANDOFF.md`
5. `CLAUDE.md`
6. `docs/product/ROADMAP.md`
7. Older plans/reports/session notes

## Known doc caveats

- `docs/plans/*` are snapshots of intent. They may contain completed, stale, or blocked tasks.
- `docs/plans/2026-05-12-parallel-reliability-next-steps.md` contains a stale demo-seed lane and old generated hand-count assumptions; use it as historical context, not current assignment.
- `docs/plans/2026-05-03-codebase-review-execution-plan.md` remains useful for backend correctness, but some tasks are already complete. Verify source before acting.
- `CLAUDE.md` is useful for poker rules and architecture but explicitly warns it can drift.

## Before implementing

- Read `AGENTS.md`, this file, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, and the relevant source files.
- For parser/range/scenario/leak/math changes, also read `CLAUDE.md`, `docs/knowledge/METRICS_DICTIONARY.md`, and the relevant `docs/knowledge/strategy/*` doc.
- Update `docs/agents/AGENT_HANDOFF.md` before ending any non-trivial session.
