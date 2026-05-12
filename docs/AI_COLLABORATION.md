# AI Collaboration Playbook — Hermes + Google Antigravity

Purpose: let multiple AI agents push each other without overwriting work, duplicating effort, or drifting from poker/product truth.

## Current council-gated default

For the current sprint, `docs/SPRINT_DECISION_GATE.md` overrides normal feature instincts. The next safe work is IP-safe private/local demo repositioning, parser/data-confidence work, and user validation prep. Do not route Antigravity toward dashboard polish, pricing/funnel work, shareable artifacts, public distribution, or deeper Reg Life-specific commercial features unless the user explicitly overrides the gate.

Use `docs/TWO_AGENT_BOARD.md` as the active assignment board for who owns each matter and how cross-review should happen.

## Roles

### Hermes

Use Hermes for:

- Broad codebase inspection and product architecture.
- Parser reliability and data-confidence work.
- Scenario/range/leak/math correctness.
- Test fixture design and verification.
- Skeptical diff reviews.
- Updating status, roadmap, handoff notes, and implementation timelines.
- Overnight autonomous work where continuity matters.

### Google Antigravity

Use Antigravity for:

- Fast IDE implementation.
- UI and component polish.
- Focused refactors with visible editor context.
- Small product improvements with clear acceptance criteria.
- Applying specific review feedback from Hermes.

## Non-messy operating modes

### Mode 1 — Implementer / Reviewer

Best default.

1. User or Hermes defines the task and acceptance criteria.
2. Antigravity implements in the IDE.
3. Antigravity updates `docs/AGENT_HANDOFF.md`.
4. Hermes reviews the diff, runs checks, and pushes back.
5. Antigravity fixes findings.
6. Hermes verifies final state.

### Mode 2 — Tests / Implementation

Best for parser and analysis correctness.

1. Hermes writes or specifies failing tests / fixtures.
2. Antigravity makes them pass.
3. Hermes verifies no regression and reviews poker logic.

### Mode 3 — Parallel worktrees

Best for genuinely independent work.

```bash
git worktree add ../poker-antigravity -b antigravity/<task-name>
git worktree add ../poker-hermes -b hermes/<task-name>
```

Rules:

- Each agent works in its own folder.
- Avoid overlapping files.
- Merge one branch at a time.
- Re-run checks after merging.

## File ownership map

Prefer this split unless the user says otherwise.

| Area | Primary owner | Secondary reviewer |
|---|---|---|
| Parser/import reliability | Hermes | Antigravity |
| Scenario/range/leak/math logic | Hermes | Antigravity |
| Tests and fixtures | Hermes | Antigravity |
| Dashboard/page UI polish | Antigravity | Hermes |
| Shared components | Antigravity | Hermes |
| Docs/status/roadmap/handoff | Hermes | Antigravity |
| Pricing/demo/product copy | Antigravity | Hermes |

## Required handoff note

Use `docs/AGENT_HANDOFF.md` every time another agent should continue or review.

Minimum fields:

```md
## YYYY-MM-DD — <short task name>

- Owner / agent:
- Branch / worktree:
- Scope:
- Files touched:
- Summary:
- Verification:
- Risks / assumptions:
- Next action requested:
```

## Prompt templates

### Ask Antigravity to implement

```text
Read AGENTS.md and docs/AI_COLLABORATION.md first.
Task: <specific task>.
Scope: only touch <files/area>.
Acceptance criteria:
- <criterion 1>
- <criterion 2>
Before finishing, update docs/AGENT_HANDOFF.md with files touched, verification run, risks, and what Hermes should review.
Do not use --no-verify.
```

### Ask Hermes to review Antigravity

```text
Review the current diff skeptically.
Read AGENTS.md, docs/AGENT_HANDOFF.md, docs/STATUS.md, and relevant source before judging.
Focus on: poker logic regressions, parser fragility, missing tests, UI drift, doc drift, and accidental broad rewrites.
Run the narrowest useful checks, then report concrete fixes or patch them if safe.
```

### Ask Hermes to plan and Antigravity to execute

```text
Hermes: write a bite-sized implementation plan under docs/plans/ with exact files, tests, and acceptance criteria.
Antigravity: implement only the next unchecked task from that plan, update docs/AGENT_HANDOFF.md, and stop for review.
```

## Conflict rules

- If two agents changed the same file, stop and inspect both diffs before continuing.
- If docs contradict source, trust source and update docs.
- If poker strategy ambiguity appears, do not invent rules. Cite `CLAUDE.md` or `docs/strategy/` and mark assumptions.
- If verification fails because of unrelated pre-existing changes, record that clearly instead of pretending the task is green.

## Good collaboration examples

Good:

- Hermes: "Add parser fixture tests for GGPoker summaries."
- Antigravity: "Make only parser changes needed to pass those tests."
- Hermes: "Review whether import warnings correctly distinguish partial failures from fatal failures."

Bad:

- "Both agents improve the app however they want."
- Both agents editing `scenarioDetector.ts` simultaneously.
- One agent updating docs while another changes behavior with different assumptions.
- Ending without a handoff note.
