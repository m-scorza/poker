---
name: hermes-sync
description: Check what Hermes (and Antigravity/Codex workers) have been up to — inspect the Hermes worktree, .agents/ state, and AGENT_HANDOFF.md; classify dirty-tree changes as salvage / split into scoped PRs / discard. Plan-only, never implements. Use when the user says "check hermes", "what is hermes up to", "hermes worktree", or wants the dirty tree sorted into PRs.
---

# /hermes-sync — Salvage Review, Plan Only

The ritual: "take a look on what hermes is up to… check dirty tree, whats good
whats not… **do not implement but make a plan for it**." This skill is
strictly read-and-plan. If the user wants execution, that's a separate session
with this skill's plan as input.

## Sweep

1. **Find the territory.** List worktrees (`git worktree list`) and any
   sibling checkouts named in `.agents/state` or recent handoffs. Check
   `.agents/workers.json` for which workers exist (claude / codex / hermes)
   and `.agents/runs/` for the latest evidence files.
2. **Read the claims.** `docs/agents/AGENT_HANDOFF.md` and
   `docs/agents/TWO_AGENT_BOARD.md` — what did Hermes/Antigravity *say* they
   did, and what was the assigned scope?
3. **Read the reality.** For each dirty tree / unmerged branch:
   `git status --short`, `git diff --stat`, then actually read the
   significant diffs. Diff-vs-claim mismatches are first-class findings.
4. **Classify every change** into exactly one bucket:
   - **Salvage** — good work, lands as-is or with minor fixes; name the
     scoped PR it belongs in (group by what the changes touch: parser vs UI
     vs docs — never one mega-PR).
   - **Rework** — right idea, wrong execution (broke a gate, ignored a
     protocol, poker-logic risk); state what a redo needs.
   - **Discard** — superseded, out of scope, or council-gated content;
     say why so it can be dropped without guilt.
5. **Check the gates for salvage candidates:** would it pass
   `npx tsc -b --pretty false`, relevant tests, `npm run docs:check`? Note
   the ROADMAP sequencing rule — salvage slices land **before** abyss
   cleanup waves touching the same pages (avoid porting churn).

## Output

- A plan (in-chat, or `docs/plans/<date>-hermes-salvage.md` if substantial):
  ordered PR list with contents, gate status, and rationale per bucket.
- An entry appended to `docs/agents/AGENT_HANDOFF.md` per
  `HANDOFF_PROTOCOL.md`, recording the review and the recommended dispatch
  (which worker should execute which slice — see `docs/agents/PILOTING.md`).
- Flag anything needing an **owner steer** (like the R4 Study-Queue-vs-SRS
  decision) separately — those are decisions, not tasks.

## Rules

- Never commit, stage, stash, or delete in this skill — read-only git, always.
- Never review your own uncommitted session changes as if they were Hermes's.
- If two agents appear to have touched the same files, stop classifying and
  raise it — that's a piloting violation (one writer per worktree).
