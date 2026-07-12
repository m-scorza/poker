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
  "mode": "write",
  "lane": "parser",
  "worker_tier": "standard",
  "freshness_days": 14,
  "branch": "feat/gg-uncalled-bet-fix",
  "goal": "Verify uncalled bets are subtracted from GG parser net win.",
  "allowed_files": [
    "src/parser/ggpoker.ts"
  ],
  "protocol_files": [
    "docs/agents/AGENT_HANDOFF.md"
  ],
  "generated_files": [],
  "source_refs": [
    "docs/product/STATUS.md"
  ],
  "truth_checked_at": "2026-06-06T00:00:00.000Z",
  "superseded_by": null,
  "expected_output": "Implement the fix and return verified evidence.",
  "required_checks": [
    {
      "name": "vitest",
      "command": "npx vitest run ggpoker"
    }
  ]
}
```

`allowed_files` is implementation scope. `protocol_files` covers required tracked process side effects. `generated_files` covers expected docs, lockfiles, or inventories. Completion enforces the combined scope and rejects unexpected dirty files.

`source_refs`, `truth_checked_at`, and `superseded_by` record freshness before reopening old findings.

`mode` is `write` or `read_only`. Read-only reconnaissance never claims a
write worktree and is dispatched through `scripts/agent-dispatch.ps1` with a
read-only sandbox/permission profile. `lane` is explicit whenever possible;
filename inference is legacy fallback only. `worker_tier` is `cheap`,
`standard`, or `deep`; use the cheapest tier capable of producing trustworthy
evidence, then escalate on an explicit trigger. `freshness_days` defaults to 14
and blocks stale source-backed write tasks until their truth is reconciled.

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

- **File-scope exclusivity**: No launched tasks may share any effective write
  scope: `allowed_files`, `protocol_files`, or `generated_files`. A shared
  `AGENT_HANDOFF.md` claim therefore serializes those tasks by design.
- **Lane exclusivity**: Avoid parallel tasks in the same lane (`range`, `scenario`, `store`, `worker/import`, `ui`, `docs/protocol`) unless the human accepts merge risk.
- **One task per worktree**: Each worktree runs one task branch and shares only central `.agents/state/`.
- **Evidence before completion**: Write `.agents/state/evidence-<task_id>.json`, then preflight it with `node scripts/agent-kernel.cjs validate-evidence --task <task_id> --evidence-file <path>`.
- **Handoff before completion**: Update `docs/agents/AGENT_HANDOFF.md` before `complete`; do not edit or generate files after `complete`.
- **Open-report scope**: If a change lands work that an active `docs/reports/`
  file (`status: open`/`in_progress`) tracks — e.g. an abyss-audit wave item —
  update that report's record **in the same PR**. Five PRs in four days
  (#141/#142, #153, #158/#160, #167–#173) landed report scope without the
  record, each requiring a follow-up correction pass.

## 5. Dispatch safety

- `scripts/parallel-runner.cjs` requires explicit repeated `--task` flags or
  `--all-pending`; it never silently chooses the first/all pending work.
- Source-backed tasks with missing/expired `truth_checked_at` are refused until
  reconciled. `--allow-stale` is a human-reviewed override, not a convenience.
- One-off read-only contracts may live under `.agents/examples/` and use
  `agent-dispatch.ps1 -TaskFile`. They do not mutate the spool.
- Dispatch logs record the worker/tier/mode and a redacted `<prompt>` command;
  they must never persist expanded prompts or credentials.
