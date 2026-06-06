# AGENTS.md — Poker Analyzer Agent Rules

This file is the shared operating contract for Hermes, Google Antigravity, Claude Code, and any future coding agent in this repo.

## Where things live

```
src/ ............ the React app
scripts/ ........ build/utility scripts
docs/product/ ... STATUS, ROADMAP, PARSER_HEALTH (human-facing product state)
docs/agents/ .... handoff log, collab rules, gates (AI-agent coordination)
docs/knowledge/ . poker theory KB the analysis modules derive from
docs/audits/ .... IP / professionalism / compliance audits
docs/validation/  user-interview track
docs/plans/ ..... dated implementation plans
docs/design/ .... UI/UX briefs
docs/reports/ ... janitor + kb-drift reports (point-in-time snapshots)
docs/research/ .. competitor research
.claude/ ........ Claude Code agent config
.agents/ ........ Hermes/Antigravity collaboration scaffolding
```

See `docs/README.md` for the full bucket-by-bucket map.

## First principles

- Preserve the user's work. Do not reset, overwrite, or discard existing changes unless explicitly asked.
- Treat `docs/product/STATUS.md` as the fact sheet for shipped behavior. Treat `CLAUDE.md` and `docs/product/ROADMAP.md` as intent/spec docs that can drift.
- Verify claims against source before documenting them.
- Prefer small, reviewable diffs over broad rewrites.
- Keep all UI copy in English.
- Do not use `--no-verify` unless the user explicitly asks in the same session.

## Collaboration model

Use this division when Hermes and Antigravity are both active. For current gated work, also read `docs/agents/TWO_AGENT_BOARD.md` before choosing the next task:

- Antigravity: fast IDE implementation, IP-safe user-facing copy neutralization, focused component edits, small refactors, applying specific review feedback.
- Hermes: product architecture, parser/analysis correctness, test/fixture work, skeptical reviews, verification, documentation hygiene, and gate enforcement.

Current gate: private/local generic poker analyzer posture. Do not start pricing/funnel/shareable/public-distribution work or third-party-branded positioning unless the user explicitly overrides `docs/agents/TWO_AGENT_BOARD.md`.

Only one agent should own a given file or subsystem at a time. If both agents need to touch the same area, one writes a handoff first and the other reviews or continues from that handoff.

## Required handoff workflow

Before ending an execution session, you must document your progress in `docs/agents/AGENT_HANDOFF.md` and follow the templates and guidelines defined in [HANDOFF_PROTOCOL.md](./docs/agents/HANDOFF_PROTOCOL.md).

For task execution and claiming rules, refer to [TASK_PROTOCOL.md](./docs/agents/TASK_PROTOCOL.md).


## Source-of-truth order

When docs disagree, use this order:

1. Running source code and tests
2. `docs/product/STATUS.md`
3. `CLAUDE.md`
4. `docs/product/ROADMAP.md`
5. Older reports or session notes

If you discover drift, fix the lying doc in the same change when practical.

## Build and verification commands

If dependencies are absent in this checkout, run `npm.cmd ci` on Windows or `npm ci` elsewhere before verification.

Use the narrowest useful command first, then the broader checks before final handoff.

```bash
npm test
npx tsc -b --pretty false
npm run build
npm run docs:check
```

If package dependencies, routes, `src/` tree shape, or test inventory changed, run:

```bash
npm run docs:update
```

## Poker logic guardrails

Before touching parser, ranges, scenario detection, leak detection, or financial math, read the relevant sections of:

- `CLAUDE.md`
- `docs/knowledge/METRICS_DICTIONARY.md`
- `docs/knowledge/strategy/claudecode_index.md`
- Relevant strategy doc under `docs/knowledge/strategy/`

Critical conventions:

- Hand-level raw chips won/lost are not meaningful as primary performance metrics. Prefer bb deltas and bb/100 for aggregate win rate.
- False overfolds are high-risk. Scenario detection must classify what happened before hero's action.
- BB suited-fold logic applies only against normal 2-3x opens, not all-ins or large raises.
- Heads-up button is `BTN/SB`.
- Position mapping must use ordered active seats, not raw contiguous seat numbers.
- PokerStars input can include UTF-8 BOM.

## Testing expectations

- Parser changes need fixture or regression tests.
- Analysis/math changes need direct unit tests.
- UI behavior changes should at least build cleanly; use browser/manual verification when the visual state matters.
- If a test cannot be run because of unrelated existing repo state, say so clearly in `docs/agents/AGENT_HANDOFF.md`.

## Git hygiene

- Work on a feature branch or an isolated worktree when possible. Parallel worktrees are allowed only when the task scheduler confirms that claimed file scopes do not overlap.
- Do not stage unrelated files.
- Do not commit generated/session artifacts unless they are intentionally part of the workflow.
- Before handing off, inspect `git status --short` and `git diff --stat`.

## Recommended two-agent loop

1. Planner writes a small scope and acceptance criteria.
2. Implementer makes the smallest useful change.
3. Implementer updates `docs/agents/AGENT_HANDOFF.md`.
4. Reviewer inspects the diff skeptically and runs verification.
5. Implementer fixes review findings.
6. Reviewer approves or merges.
