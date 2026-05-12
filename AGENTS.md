# AGENTS.md — Poker Analyzer Agent Rules

This file is the shared operating contract for Hermes, Google Antigravity, Claude/Gemini-style IDE agents, and any future coding agent in this repo.

## First principles

- Preserve the user's work. Do not reset, overwrite, or discard existing changes unless explicitly asked.
- Treat `docs/STATUS.md` as the fact sheet for shipped behavior. Treat `CLAUDE.md`, `GEMINI.md`, and `docs/ROADMAP.md` as intent/spec docs that can drift.
- Verify claims against source before documenting them.
- Prefer small, reviewable diffs over broad rewrites.
- Keep all UI copy in English.
- Do not use `--no-verify` unless the user explicitly asks in the same session.

## Collaboration model

Use this division when Hermes and Antigravity are both active. For current council-gated work, also read `docs/TWO_AGENT_BOARD.md` before choosing the next task:

- Antigravity: fast IDE implementation, IP-safe user-facing copy neutralization, focused component edits, small refactors, applying specific review feedback.
- Hermes: product architecture, parser/analysis correctness, test/fixture work, skeptical reviews, verification, documentation hygiene, and gate enforcement.

Current gate: private/local generic poker analyzer posture. Do not start pricing/funnel/shareable/public-distribution work or Reg Life-branded positioning unless the user explicitly overrides `docs/SPRINT_DECISION_GATE.md`.

Only one agent should own a given file or subsystem at a time. If both agents need to touch the same area, one writes a handoff first and the other reviews or continues from that handoff.

## Required handoff workflow

Before ending a non-trivial session, update `docs/AGENT_HANDOFF.md` with:

- Owner / agent
- Branch and scope
- Files touched
- What changed
- Verification run and result
- Risks / assumptions
- Next recommended action
- Explicit review request, if another agent should continue

If the task is larger than one small edit, also keep a plan under `docs/plans/`.

## Source-of-truth order

When docs disagree, use this order:

1. Running source code and tests
2. `docs/STATUS.md`
3. `CLAUDE.md` / `GEMINI.md`
4. `docs/ROADMAP.md`
5. Older reports or session notes

If you discover drift, fix the lying doc in the same change when practical.

## Build and verification commands

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
- `docs/METRICS_DICTIONARY.md`
- `docs/strategy/claudecode_index.md`
- Relevant strategy doc under `docs/strategy/`

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
- If a test cannot be run because of unrelated existing repo state, say so clearly in `docs/AGENT_HANDOFF.md`.

## Git hygiene

- Work on a feature branch or an isolated worktree when possible.
- Do not stage unrelated files.
- Do not commit generated/session artifacts unless they are intentionally part of the workflow.
- Before handing off, inspect `git status --short` and `git diff --stat`.

## Recommended two-agent loop

1. Planner writes a small scope and acceptance criteria.
2. Implementer makes the smallest useful change.
3. Implementer updates `docs/AGENT_HANDOFF.md`.
4. Reviewer inspects the diff skeptically and runs verification.
5. Implementer fixes review findings.
6. Reviewer approves or merges.
