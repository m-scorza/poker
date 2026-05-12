# Workflow: Review Current Diff

Use when Hermes or Antigravity is asked to review another agent's changes.

## Instructions

1. Read:
   - `AGENTS.md`
   - `docs/agents/AI_COLLABORATION.md`
   - `docs/agents/TWO_AGENT_BOARD.md`
   - `docs/agents/SPRINT_DECISION_GATE.md`
   - `docs/agents/AGENT_HANDOFF.md`
   - `docs/product/STATUS.md`

2. Inspect:

```bash
git status --short
git diff --stat
git diff -- <relevant files>
```

3. Review for:

- Scope creep or unrelated rewrites.
- Missing tests for behavior changes.
- Parser fixture gaps.
- Poker logic regressions against `CLAUDE.md` / `docs/knowledge/strategy/`.
- Metrics errors, especially raw-chip-vs-bb confusion.
- UI English/style drift.
- Docs/status/roadmap drift.

4. Verify with the narrowest useful command, then broader checks if safe:

```bash
npm test
npx tsc -b --pretty false
npm run build
npm run docs:check
```

5. Output:

- Verdict: approve / request changes / blocked by unrelated state.
- Highest-risk issues first.
- Exact file/line references where possible.
- Commands run and results.
- Suggested next prompt for the implementer.

6. If you make fixes during review, update `docs/agents/AGENT_HANDOFF.md`.
