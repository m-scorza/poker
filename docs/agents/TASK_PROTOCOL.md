# Task Execution Protocol (TASK_PROTOCOL)

This document defines the state constraints, claiming rules, and Git hygiene policies for sequential multi-agent execution on a single working tree.

## 1. Local State Schema
The local task board is stored in `.agents/state/task_spool.json` (Gitignored). Each task must adhere to the following schema:

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

## 2. Zero-Mutation Git Boundary
To prevent workspace corruption and silent changes:
- **Read-Only Git**: The workflow tool (`aos.js`) must never execute modifying Git commands (`git checkout`, `git switch`, `git stash`, `git reset`, or `git clean`).
- **Human Responsibility**: The human developer handles all branch switching and workspace cleanup manually. Stash is allowed only as an explicit human emergency choice, not as the default workflow.
- **Drift Mismatch**: If `aos.js` detects that the active branch does not match the task's expected branch, it must abort and output the correct manual checkout command.

## 3. Clean working-tree Guard
To prevent cross-task leakage and dirty-state pollution:
- **Block on Dirty**: An agent must not be claimed or run if the working tree has any unstaged changes or untracked source files.
- **Allowed Untracked Paths**: Only standard Gitignored folders are excluded from this clean status check:
  - `node_modules/`
  - `.agents/state/`
  - `.agents/runs/`
  - `docs/agents/CURRENT_CONTEXT.md`
- **Dirty Tree Interruption**: When dirty state is detected, the workflow tool must:
  1. Show the list of dirty files.
  2. Suggest inspection (`git status -s`, `git diff`, `git diff --staged`).
  3. Prompt the human to manually resolve: commit intentional work, revert accidental work, or create a rescue branch if preservation is needed.
