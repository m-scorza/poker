---
name: ship-gap
description: Answer one question — what is the shortest path from this repo's current state to the first external user / first dollar — grounded in STATUS.md, ROADMAP.md, and the validation plan. Use when the user asks "how far from ready", "can I ship this", "how do I make money with this project", or wants a readiness check.
---

# /ship-gap — Distance to the First Dollar

Not another audit. This skill answers exactly one question: **what is the
shortest path from today's state to the first external user or first dollar,
and what single action starts it.** The enemy is the polishing loop — one more
audit, one more cleanup wave — while the market-facing unknowns stay untested.

## Read (fact order matters)

1. `docs/product/STATUS.md` — facts. Wins over everything.
2. `docs/product/ROADMAP.md` — the active punch list + gates + non-goals.
3. `docs/validation/USER_VALIDATION_PLAN.md` — the external-validation gate
   and demo posture (what the product may and may not be presented as).
4. Latest open reports in `docs/reports/` and `git status` — is the build/
   typecheck gate even green today?
5. `GOALS.md` if it exists (the identity gate); note its absence if not.

## Then answer, in this shape

1. **Gate check** — can a stranger run the demo *today*? (Build green, demo
   route works, no gated wording visible.) If no: the shortest path starts
   with the cheapest fix to make that true, full stop.
2. **The blocking unknown** — which untested market-facing question currently
   caps progress (e.g. "will the six planned interviews validate the coach
   loop?"). Distinguish *unknowns* (need external evidence) from *tasks*
   (need work). Building more never resolves an unknown.
3. **Shortest path** — 3–5 steps max from today to first external
   user/dollar, respecting the repo's own council gate (no pricing/public/
   Reg-Life-adjacent work before validation + identity decision). If the gate
   itself is the bottleneck, the path is: run the gate's requirements, don't
   argue with them.
4. **Honest distance** — time estimate at realistic pace, and the single
   biggest risk to it (IP entanglement, interview no-shows, scope creep).
5. **The one next action** — small enough to do today, named files/commands.
   One. Not a menu.

## Rules

- Never propose skipping the council gate; propose *satisfying it faster*.
- "Ready" claims must trace to STATUS.md or a command you ran this session.
- If the last three sessions were all audits/cleanups, say so — the
  polishing-loop warning is part of this skill's job.
- Cross-ledger: if `C:\Users\MICRO\income\EXPERIMENTS.md` exists, sync the
  poker experiment's status there (this skill is the poker-side twin of the
  global `income-scout`).
