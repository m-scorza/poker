# Two-Agent Board — Hermes + Google Antigravity

**Created:** 2026-05-10
**Purpose:** keep Hermes and Google Antigravity working on different matters while forcing useful cross-review instead of messy overlapping edits.

## Active product constraint

The latest council gate controls this board:

- Do not do dashboard polish, pricing/funnel work, shareable artifacts, or platform expansion as the next sprint.
- Current posture is private/local generic poker analyzer.
- Reg Life status is informal encouragement only; no written licensing/distribution terms are recorded.
- The next safe technical sprint is IP-safe demo repositioning plus validation prep.

## Default roles for the current sprint

| Matter | Primary owner | Reviewer | Allowed file areas | Blocked file areas |
|---|---|---|---|---|
| IP-safe user-facing copy neutralization | Antigravity | Hermes | UI/page/component copy, demo labels, route copy, docs that describe demo posture | Parser/scenario/range/math behavior unless explicitly requested |
| IP/reference audit and acceptance criteria | Hermes | Antigravity | docs, search reports, exact acceptance criteria, review notes | Broad UI rewrites |
| Parser reliability/data confidence | Hermes | Antigravity | parser tests, fixtures, import warnings, docs/product/PARSER_HEALTH.md | Pricing/funnel/shareable artifacts |
| Validation interview plan/results | Hermes | Antigravity | docs/validation/USER_VALIDATION_PLAN.md and summaries from user-provided interviews | Inventing interview outcomes |
| Applying specific review fixes | Agent that authored the original diff | Other agent | Only files in the review request | New opportunistic features |

## Non-overlap rule

Only one agent may be the active editor for a file area at a time.

- If Antigravity edits `src/pages/PricingPage.tsx`, Hermes reviews it but does not simultaneously redesign it unless fixing a narrow review issue.
- If Hermes edits parser tests or fixture logic, Antigravity reviews it but does not simultaneously change scenario/range behavior.
- If both agents must touch the same file, the first agent writes a handoff entry and stops before the second begins.

## Required cross-review loop

1. Hermes writes scope and acceptance criteria.
2. Antigravity implements only that scope.
3. Antigravity updates `docs/agents/AGENT_HANDOFF.md` with:
   - files touched
   - verification commands/results
   - risks/assumptions
   - exact Hermes review request
4. Hermes reviews the diff skeptically, runs checks, and either:
   - approves,
   - patches tiny safe issues, or
   - sends a precise fix prompt back to Antigravity.
5. Antigravity fixes only the requested issues and updates handoff again.
6. Hermes verifies final state.
7. Antigravity may then do a reverse review of Hermes docs/plans for clarity and implementability.

## Current Antigravity task to run first

The IP-safe demo neutralization sprint is complete. 
Please refer to the latest sprint plans in `docs/plans/` (such as `2026-05-18-downstream-trust-timeline.md` or `2026-05-18-engine-data-solver-privacy-addendum.md`) or the `docs/agents/AGENT_HANDOFF.md` to pick up the next task.

## Reverse review task for Antigravity

After Hermes writes or updates docs/plans, Antigravity should review for implementability:

```text
Read docs/agents/TWO_AGENT_BOARD.md and review Hermes's docs/plans only.
Do not change source code.
Check whether the task scope is clear enough for an IDE agent to implement without guessing.
Flag missing file paths, vague acceptance criteria, or review steps that are too broad.
Update docs/agents/AGENT_HANDOFF.md with your review verdict.
```

## Stop conditions

Stop and ask the user before:

- reintroducing Reg Life-branded positioning,
- adding payment/pricing/public funnel work,
- changing strategic ranges or curriculum-derived behavior,
- publishing/exporting shareable artifacts,
- committing a broad dirty tree that includes unrelated pre-existing changes.
