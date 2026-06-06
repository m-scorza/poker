# Handoff Documentation Protocol (HANDOFF_PROTOCOL)

This document defines the rules for documenting tasks and transferring ownership between agents using scheduler-controlled branches or isolated worktrees.

## 1. Handoff Template
Every completed or failed execution session must record an entry at the top of [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) using this format:

```md
## YYYY-MM-DD - <short task name>

- Owner / agent:          # Agent name (Antigravity, Hermes, Claude)
- Branch:                 # Active git branch name
- Scope:                  # Files allowed to be touched
- Files touched:          # Files modified or created
- Summary:                # Bullet points describing changes
- Verification:           # Output of validation commands and logs
- Risks / assumptions:    # Structural dependencies and risks
- Next action requested:  # Action instructions for the next agent
```

## 2. Verification and Evidence Requirements
Completion status is strictly gated on validation evidence. You must run and document:
1.  **TypeScript Compilation**: Run `npx tsc -b --pretty false` and confirm exit code 0.
2.  **Targeted Tests**: Run tests covering modified code (Vitest) and record the exit status.
3.  **Logs Reference**: Store build/test output logs in `.agents/runs/` (Gitignored) for manual human inspection.

Before completing a scheduler task:

1. Write `.agents/state/evidence-<task_id>.json`.
2. Run `node scripts/agent-kernel.cjs validate-evidence --task <task_id> --evidence-file <path>`.
3. Add the handoff entry while `docs/agents/AGENT_HANDOFF.md` is inside the task's `protocol_files`.
4. Run `node scripts/agent-kernel.cjs complete ...`.
5. Stop without further file edits.

Keep `AGENT_HANDOFF.md` under the kernel context budget. When it grows, move older dated entries to `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_YYYY_MM.md` and keep only the active baton plus template.

## 3. Human Handoff Sequence
Since branch/worktree changes require operator approval, the handoff transfer is managed via these human-approved Git steps:

1.  **Review the Diff**: The human verifies the active agent's diff footprint:
    ```bash
    git diff
    git diff --stat
    ```
2.  **Commit the Work**: If clean and verified, commit the changes:
    ```bash
    git add -A
    git commit -m "feat/chore: <summary>"
    ```
3.  **Handoff Switch**: Branch switching only happens after the working tree is confirmed clean:
    ```bash
    git status --short
    git checkout <next-branch>
    ```
