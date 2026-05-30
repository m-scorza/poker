# Workflow: Council-Gated Two-Agent Loop

Use when Hermes and Antigravity are both active and the work is constrained by `docs/agents/TWO_AGENT_BOARD.md`.

## Required reading

1. `AGENTS.md`
2. `docs/agents/AI_COLLABORATION.md`
3. `docs/agents/TWO_AGENT_BOARD.md`
4. `docs/agents/AGENT_HANDOFF.md`
5. Historical context only when needed: `docs/agents/archive/SPRINT_DECISION_GATE.md` and `docs/agents/archive/PARTNERSHIP_STATUS.md`
7. Task-specific source/docs named by the user

## Rule of engagement

Do not start from "what would be nice to improve." Start from the current gate.

Current gate says the safe work is:

- IP-safe demo/user-facing repositioning
- parser reliability/data confidence
- private/local validation prep
- documentation of ground truth

Blocked unless the user explicitly overrides:

- dashboard polish as the main next sprint
- pricing/payment/funnel work
- Reg Life-branded positioning
- public share/export virality
- broad platform expansion
- deeper Reg Life-specific commercial strategy analysis

## Two-agent pattern

### If you are the implementer

1. Confirm exact file scope.
2. Edit only that scope.
3. Keep behavior changes out unless explicitly requested.
4. Run the narrowest useful checks.
5. Update `docs/agents/AGENT_HANDOFF.md` using `.agents/skills/handoff.md`.
6. Ask the reviewer a specific question.

### If you are the reviewer

1. Start from `git status --short` and `git diff --stat`.
2. Compare the actual diff to the claimed scope in `docs/agents/AGENT_HANDOFF.md`.
3. Search for gate violations:
   - Reg Life / GamePlan / D# / dossier wording in user-facing source
   - payment/pricing/funnel CTAs
   - public share/export claims
   - parser/range/math changes when the task was copy-only
4. Run targeted checks.
5. Approve, request changes, or patch only tiny safe misses.
6. Update handoff if you patch anything.

## Output format

```md
Verdict: approve | request changes | blocked by unrelated state

Scope check:
- Claimed scope:
- Actual files changed:
- Scope creep found:

Gate check:
- IP/user-facing language:
- Pricing/payment/public-sharing language:
- Parser/range/math untouched:

Verification:
- Command:
- Result:

Next prompt:
<exact prompt for the other agent>
```
