# Task Execution Protocol (TASK_PROTOCOL)

Defines the state, claiming, and Git rules for scheduler-controlled multi-agent work. Agents may use separate Git worktrees, but the scheduler must block overlapping file ownership before parallel launch.

## 1. Local State Schema
The local task board is `.agents/state/task_spool.json` (Gitignored). Task shape:

```json
{
  "task_id": "task-2026-05-23-001",
  "status": "pending",
  "owner_agent": null,
  "target_agent": "hermes",
  "branch": "feat/gg-uncalled-bet-fix",
  "goal": "Verify uncalled bets are subtracted from GG parser net win.",
  "allowed_files": [
    "src/parser/ggpoker.ts"
  ],
  "required_checks": [
    {
      "name": "vitest",
      "command": "npx vitest run ggpoker"
    }
  ]
}
```

## 2. Git Boundary
- **Agent-proposed Git**: Agents may propose checkout/switch/commit commands for operator approval, but must not run mutating Git silently.
- **Runner approval**: `scripts/parallel-runner.cjs` defaults to dry-run. Use `--execute` only after reviewing conflicts and planned worktrees.
- **Drift mismatch**: If the scheduler or kernel sees the wrong branch, abort and print the manual checkout command.

## 3. Clean Tree Guard
- **Block on dirty**: Do not claim/run if the worktree has unstaged changes or untracked source files.
- **Allowed untracked paths**:
  - `node_modules/`
  - `.agents/state/`
  - `.agents/runs/`
- **Dirty interruption**:
  1. Show the list of dirty files.
  2. Suggest inspection (`git status -s`, `git diff`, `git diff --staged`).
  3. Ask the human to resolve: commit intentional work, revert accidental work, or create a rescue branch.

## 4. Parallel Worktree Guard
Parallel execution is allowed only for a non-overlapping task batch.

- **File-scope exclusivity**: No launched tasks may share `allowed_files`.
- **Lane exclusivity**: Avoid parallel tasks in the same lane (`range`, `scenario`, `store`, `worker/import`, `ui`, `docs/protocol`) unless the human accepts merge risk.
- **One task per worktree**: Each worktree runs one task branch and shares only central `.agents/state/`.
- **Evidence before completion**: Completion requires evidence JSON accepted by `scripts/agent-kernel.cjs complete`.
