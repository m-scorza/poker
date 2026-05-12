# Handoff Skill

Use this skill whenever another agent or the user will continue from your work.

## Steps

1. Inspect current state:

```bash
git status --short
git diff --stat
```

2. Update `docs/AGENT_HANDOFF.md` with a newest-first entry.

3. Include:

- Owner / agent
- Branch / worktree
- Scope
- Files touched
- Summary of actual changes
- Verification commands and results
- Risks / assumptions
- Next action requested

4. If verification was not run, say exactly why.

5. If failures are unrelated to your change, identify the failing command and the likely unrelated area.

## Handoff template

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

## Hard rules

- Do not claim green verification without command output.
- Do not hide unrelated dirty files.
- Do not leave the next agent guessing what to review.
