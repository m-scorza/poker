# Workflow: Implement and Handoff

Use when Antigravity is asked to implement a focused task and leave the repo ready for Hermes review.

## Instructions

1. Read:
   - `AGENTS.md`
   - `docs/agents/AI_COLLABORATION.md`
   - `docs/agents/TWO_AGENT_BOARD.md`
   - `docs/product/STATUS.md`
   - Any task-specific docs named by the user

2. Confirm scope:
   - Identify exact files likely to change.
   - If the task touches poker logic, read `CLAUDE.md`, `docs/knowledge/METRICS_DICTIONARY.md`, and `docs/knowledge/strategy/claudecode_index.md` before editing.

3. Implement minimally:
   - Keep the diff small.
   - Avoid unrelated cleanup.
   - Add/update tests for behavior changes.

4. Verify:
   - Run targeted tests first.
   - Run `npx tsc -b --pretty false`, `npm test`, or `npm run build` when appropriate.

5. Handoff:
   - Update `docs/agents/AGENT_HANDOFF.md` using `.agents/skills/handoff.md`.
   - Explicitly ask Hermes what to review.

## User prompt shape

```text
Run workflow implement-and-handoff.
Task: <task>
Scope: <files or area>
Acceptance criteria:
- <criterion>
Hermes review focus: <what Hermes should challenge>
```
