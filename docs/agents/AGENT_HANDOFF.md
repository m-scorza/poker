# Agent Handoff Log

Use this file as the shared baton between Hermes, Google Antigravity, and any other coding agent. Keep the newest entry at the top.

Older or compacted handoff records are archived in:

- [AGENT_HANDOFF_ARCHIVE_2026_06.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_06.md)
- [AGENT_HANDOFF_ARCHIVE_2026_05.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_05.md)

## 2026-06-06 - Kernel contract and handoff lifecycle repair

- Owner / agent:          Codex
- Branch:                 codex/kernel-contract-repair
- Scope:                  Strengthen the existing agent kernel instead of replacing it after comparing external workflow repos.
- Files touched:
  - `scripts/agent-kernel.cjs` - adds effective task scope, optional protocol/generated/freshness fields, evidence preflight, and clearer protocol-size remediation.
  - `scripts/parallel-runner.cjs` - updates generated task prompts so evidence validation and handoff happen before completion.
  - `docs/agents/*`, `.agents/*`, and `scripts/README.md` - align the protocol docs, workflow prompts, and active handoff budget.
  - `src/__tests__/agentKernel.test.ts` - covers kernel scope completion, out-of-scope rejection, evidence preflight, runner order, and handoff budget.
  - `docs/product/STATUS.md` - regenerated test inventory after adding the kernel tests.
- Summary:
  - External references did not justify replacing the current kernel; their stronger ideas were staged verification, skill/workflow packaging, and graph/evidence discipline.
  - Existing kernel now keeps `allowed_files` as implementation scope while allowing declared `protocol_files` and `generated_files` for required process side effects.
  - `validate-evidence` gives agents a read-only preflight before `complete`, and runner prompts now forbid post-completion edits.
  - Active handoff was compacted under budget, with June history moved to `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Verification:
  - `node --check scripts/agent-kernel.cjs` - passed.
  - `node --check scripts/parallel-runner.cjs` - passed.
  - `node scripts/agent-kernel.cjs validate-state --json` - passed.
  - `node scripts/agent-kernel.cjs validate-protocol --json` - passed.
  - `npx.cmd vitest run src/__tests__/agentKernel.test.ts` - passed, 5 tests.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run typecheck:test` - passed.
  - `npm.cmd run docs:update` - updated `docs/product/STATUS.md`.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd test` - passed, 62 files / 671 tests, after rerunning escalated with a longer timeout.
  - `npm.cmd run build` - passed.
- Risks / assumptions:
  - `node scripts/agent-kernel.cjs doctor --json` still reports dirty/untracked files because this handoff represents an active implementation diff; context size, spool health, lock health, and docs checks are green.
  - The replacement decision is current as of this review: none of the external repos offers a safer drop-in local branch/scope/evidence kernel than the one already here.
- Next action requested:
  - Review the kernel contract diff skeptically, then either merge this repair or schedule the next kernel task wave using the new `protocol_files`, `generated_files`, and freshness fields.
## Template

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
