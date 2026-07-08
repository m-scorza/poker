# PILOTING.md — Flying Claude Code + Hermes Together

> **Scope:** how the owner pilots the multi-agent fleet (Claude Code, Hermes,
> Antigravity personas, Codex worker) without the agents fighting over the
> same tree. Complements `TASK_PROTOCOL.md` / `HANDOFF_PROTOCOL.md` (the
> agents' contracts); this doc is the *pilot's* manual.
> Created 2026-07-07 from a review of ~100 sessions of actual usage.

## 1. Division of labor (who flies what)

| Role | Agent | Why |
|---|---|---|
| Orchestrator / broad reviewer | **Hermes** | Dispatches via `.agents/workers.json`, keeps the two-agent board, narrow Antigravity personas stay focused under it |
| Deep implementation + verification | **Claude Code** (interactive) | Strongest at multi-step correctness work, runs the gates itself, plan mode for scoping |
| Scoped batch tasks, no approvals | **Claude headless** (`claude.cmd -p`) or **Codex** (`codex.cmd exec`) | Fire-and-forget slices with crisp specs; dry-run the dispatcher first (workers.json note) |
| Narrow spec/UI/logic/QA lanes | **Antigravity personas** (`.agents/agents.md`) | Intentionally narrow; don't hand them open-ended scope |

Rule of thumb: **Hermes decides what, Claude Code decides how, personas do
one lane each.** When a task needs judgment across lanes (parser + UI + docs),
it belongs to interactive Claude Code, not a persona.

## 2. The one-writer rule (the crash you keep having)

- **One writer per worktree, ever.** If Hermes owns a worktree, Claude reads
  it but never edits it — and vice versa. Two agents editing one tree is how
  dirty-tree archaeology sessions are born.
- Claude's own worktrees live under `.claude/worktrees/`; Hermes's live where
  Hermes puts them. Neither edits the other's. The main checkout belongs to
  the owner + whichever agent currently holds the covenant task, per
  `TASK_PROTOCOL.md` claiming.
- Handoffs move through `AGENT_HANDOFF.md`, never through "the other agent
  will probably notice the dirty tree."

## 3. Salvage-first sequencing

ROADMAP rule, generalized: **land or discard the other agent's pending work
before starting overlapping work of your own** (salvage before abyss waves on
the same pages). Before any new sprint touching contested files:

1. Run `/hermes-sync` (plan-only classification: salvage / rework / discard).
2. Land the salvage slices as scoped PRs.
3. Only then dispatch new work on those pages.

Skipping this order doesn't save time; it converts Hermes's work into merge
conflicts you pay for twice.

## 4. Dispatch etiquette

- A dispatched prompt (to `claude -p`, Codex, or a persona) must carry: the
  lane, the file-level scope, the gate commands to run, the handoff
  requirement, and the council-gate wording check. The personas' rules in
  `.agents/agents.md` already encode most of this — reference them, don't
  restate them.
- **Verification is not delegatable.** Whoever merges runs
  `npx tsc -b --pretty false` + relevant tests + `npm run docs:check`
  themselves. An agent's "tests pass" claim is a claim (see the
  diff-vs-claim check in `/hermes-sync`).
- Owner steers are sacred: decisions flagged "needs owner" (R4
  Study-Queue-vs-SRS, identity gate) are never resolved by an agent picking a
  default. Park them, surface them, wait.

## 5. Loop primitives vs. Hermes (don't run two schedulers on one tree)

Claude Code's `/loop`, `/schedule`, and `/goal` are schedulers. Hermes is
also a scheduler. Two schedulers targeting one worktree = the multi-writer
crash with extra steps.

- **`/goal`** — verifiable single objectives in a Claude-owned tree ("gate
  green, stop after 5 tries").
- **`/loop Nm`** — babysitting external state (PR checks, CI) — fine anywhere
  because it shouldn't write to contested trees.
- **`/schedule`** — recurring streams (nightly review via the global
  `overnight` skill, weekly `income-scout`). Point scheduled write-work at a
  dedicated worktree/branch, never at a tree Hermes might touch that night.
- Overnight runs follow the `overnight` skill contract: goal-based exit,
  heartbeat stall guard, one append-only findings file, turn caps. The old
  re-fire-the-same-prompt pattern left dozens of stalled sessions — retired.

## 6. Session hygiene for the pilot

- Start work sessions with the SessionStart hook's open reports; end
  multi-agent days with `/claudius` (the 0-open-PRs sweep) so the queue never
  carries into the next day.
- Plan-only sessions: say so up front (or use plan mode) — "make plans, do
  not execute" sessions have gone best when the ground rule was explicit
  from message one.
- One repo copy is canonical (`OneDrive/Documentos/GitHub/poker` today).
  Downloads copies and scratch clones are read-only reference material —
  never dispatch agents into them.
