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

### Cost and judgment routing

Every dispatched task now declares a mode and tier:

| Tier | Use it for | Escalate when |
|---|---|---|
| `cheap` | read-only repo maps, branch archaeology, inventory, focused test/result summarization | evidence conflicts, cross-lane judgment, correctness conclusions |
| `standard` | bounded implementation, direct tests, routine review | architecture changes, poker-logic ambiguity, owner-facing product decisions |
| `deep` | cross-lane correctness, skeptical integration review, ambiguous product/architecture synthesis | owner steer or missing external evidence |

The default cheap CLI lane is Claude Haiku at low effort; standard and deep use
Claude Sonnet and Opus respectively. This is a cost decision, not a size/name
guess: Haiku 4.5 was Anthropic's lowest-cost current Claude API model when
checked on 2026-07-11. Re-check official pricing before changing aliases or
after a major model launch. A cheap agent's output is
evidence for the orchestrator, never merge authority. The integrating agent
verifies source, diffs, and gates itself.

### Which dispatch lane (the boundary rule)

One sentence, applied every time: **Claude-model work dispatches in-session
via the orchestrator's Agent tool (haiku-runner / sonnet-scout /
opus-builder); the kernel (`agent-dispatch.ps1` + `.agents/workers.json`) is
the cross-agent task board and the transport for non-Claude CLI workers
(codex, antigravity/agy, hermes).** An in-session Claude subagent gets
worktree isolation, background-completion notification, and follow-up via
SendMessage for free — dispatching Claude through `claude.cmd -p` gives up
all three, so don't. The kernel's unique value is the persistent spool
(claim/complete lifecycle, evidence validation, stale-truth refusal) and
running workers the harness cannot spawn.

Worker health (checked live 2026-07-11): `codex` re-enabled — CLI 0.144.1
runs the configured model; note that the ChatGPT-account quota is shared
with Hermes, so a Codex usage-limit outage blocks both. `antigravity` is now
a real CLI worker via `agy --print` (v1.0.13, verified end-to-end through
the dispatcher); the Antigravity IDE remains a separate manual/visual lane.

Use `mode: read_only` for reconnaissance. It disables write tools/sandbox
access, skips claim/completion, and can run from a one-off task file without
polluting the stale spool. Write tasks continue through isolated worktrees and
kernel evidence.

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
- One repo copy is canonical (`C:\dev\poker` today).
  Downloads copies and scratch clones are read-only reference material —
  never dispatch agents into them.
- Never run the parallel runner without `--task ...` or the explicit
  `--all-pending` acknowledgement. Missing/stale truth checks and overlaps in
  implementation, protocol, or generated files block dispatch.
- Use `powershell -File scripts/agent-dispatch.ps1 -Help` before an unfamiliar
  dispatch. Executed logs redact the expanded prompt.
