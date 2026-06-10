# Two-Agent Board — Active Gate & Assignments

This board monitors active agent assignments and enforces council gates for the current development sprint.

## 1. Active Council Gate Constraints
The latest sprint decision gate controls all agent tasks:
- **Private/Local Posture**: The application must be framed as a private, local-only generic poker hand-history analyzer.
- **No Commercial CTAs**: Do not implement pricing pages, payment funnels, or public share/export features.
- **Reg Life Exclusion**: Neutralize all Reg Life-branded wording, strategy profile names (rename to "Baseline" or "Advanced"), and database attributions in user-facing views.

## 2. Active Assignment References
Task assignments and execution states are tracked inside the local, Gitignored file:
`.agents/state/task_spool.json`

The spool can lag behind merged PRs. Before claiming a `needs_human` task from
that file, check `docs/product/STATUS.md`, `docs/product/PARSER_HEALTH.md`, and
`docs/reports/2026-06-05-stale-findings-reconciliation.md` to confirm the task
is not already closed or superseded on current `main`.

For the current sprint, task execution is scheduler-controlled:
1.  The human/operator chooses the next task lane.
2.  `scripts/parallel-runner.cjs` may prepare worktrees only for non-overlapping task scopes.
3.  If pending tasks share `allowed_files` or conceptual lanes, run them sequentially or split/merge the task contracts first. Use `protocol_files` and `generated_files` only for expected process side effects; do not hide implementation overlap there.

Primary ownership lanes:
1.  **Antigravity (IDE)**: UI copy neutralization (neutralize labels in dashboard and data buttons).
2.  **Hermes (WSL)**: Parser checks and verification suite correctness.
3.  **Claude (Terminal)**: Integration, PR formatting, and code health audits.

## 3. Protocol Pointer
All cross-review loops, claim rules, and task completions must strictly follow [TASK_PROTOCOL.md](./TASK_PROTOCOL.md) and [HANDOFF_PROTOCOL.md](./HANDOFF_PROTOCOL.md).
