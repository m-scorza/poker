# Agent Handoff Log

Use this file as the shared baton between Hermes, Google Antigravity, and any other coding agent. Keep the newest entry at the top.

Older or compacted handoff records are archived in:

- [AGENT_HANDOFF_ARCHIVE_2026_07.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_07.md)
- [AGENT_HANDOFF_ARCHIVE_2026_06.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_06.md)
- [AGENT_HANDOFF_ARCHIVE_2026_05.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_05.md)

## 2026-07-11 - Import recovery and replay number formatting

- Owner / agent:          Codex
- Branch:                 codex/fix-import-and-number-format
- Scope:                  First implementation slice for UIR-001 and UIR-002: recoverable HandsUpload lifecycle failures and the reported replay floating-point artifact.
- Files touched:          `HandsUpload.tsx` and tests; `HandReplay.tsx` and tests; shared `utils/format.ts`; owner UI plan; generated product status; this handoff.
- Summary:                Added safe handling for unreadable files and worker startup/posting failures, a 60-second inactivity watchdog, and a visible Cancel import action. Added shared two-decimal chip formatting and routed replay action amounts through it, turning `385.00000000000006` into `385` while preserving `87.5`. Marked both larger plan tasks in progress with their remaining work.
- Verification:           Focused HandsUpload + HandReplay suite: 2 files / 28 tests passed. `npx.cmd tsc -b --pretty false`, `npm.cmd run build`, `npm.cmd run docs:check`, and `git diff --check` passed. Browser: demo hand `DEMO-H-250-117` displayed `87.5`, `175`, `385`, `175`; raw artifact absent; no console errors. The full `npm.cmd test` run was attempted twice but did not emit a completion summary before 5- and 10-minute ceilings; partial log contains only existing jsdom `scrollTo` warnings. Logs stored under `.agents/runs/`.
- Risks / assumptions:    Cancellation terminates the worker and invalidates late callbacks, but browser storage promises already in flight cannot be forcibly aborted. The full-suite timeout remains an unresolved verification limitation; the modified test files pass in isolation. UIR-001 still needs phase-specific progress copy and tracked ZIP/browser reproduction; UIR-002 still needs a repo-wide raw-render audit.
- Next action requested:  Review this focused PR, then continue the remaining UIR-001 phase visibility and UIR-002 formatter migration as a separate slice.

## 2026-07-10 - Owner UI plan, BLACKOUT salvage review, and fleet v2

- Owner / agent:          Codex
- Branch:                 codex/fleet-piloting-v2
- Scope:                  Convert 33 browser comments into a planning-only backlog; audit parked BLACKOUT Foundation v2; harden cheap/standard/deep fleet dispatch and test it on the BLACKOUT review contract.
- Files touched:          Owner UI plan + ROADMAP; `.agents/workers.json` and example review contract; dispatcher, kernel, parallel runner, tests; PILOTING/TASK_PROTOCOL; handoff/archive.
- Summary:                Added 24 UI tasks and D1-D7 decisions, including selective BLACKOUT salvage. Fleet v2 adds explicit tiers/modes, read-only one-off contracts, prompt transport, redacted command logs, complete-scope conflicts, stale-task refusal, explicit selection/help, and Codex as a valid kernel owner. Corrected the cheap tier to Haiku after the initial Fable cost assumption was challenged and checked against official pricing. Broken Codex CLI worker is disabled with its exact health reason.
- Verification:           BLACKOUT branch: typecheck, 96 files / 934 tests, build, docs check passed. Fleet: 8 targeted kernel tests, docs check, typecheck, full `npm.cmd test`, JSON/PowerShell dry runs, disabled-worker refusal, and stale-spool refusal passed. `git diff --check` pending final run.
- Risks / assumptions:    No product UI was implemented. Claude CLI read-only is enforced by tool allowlist and prompt contract, not an OS sandbox. The global Claude shim currently points to a missing executable after an apparent updater interruption; repo routing is corrected, but live Haiku dispatch requires that local CLI installation to be repaired. The ten June spool tasks remain intentionally unreconciled. Codex CLI requires upgrade/config repair before re-enable; desktop Codex is unaffected.
- Next action requested:  Owner ratifies D1-D7 and chooses either correctness triage (UIR-001/002) or the fresh-main BLACKOUT primitive salvage (UIR-024) as the first implementation slice.

## 2026-07-10 - Open PR sweep and C:\dev\poker relocation

- Owner / agent:          Codex
- Branch:                 main
- Scope:                  Review and merge all open PRs; update active project references from the old OneDrive checkout to `C:\dev\poker`.
- Files touched:          `.claude/settings.json`, `docs/agents/PILOTING.md`, `docs/product/PARSER_HEALTH.md`, `docs/agents/AGENT_HANDOFF.md`; PR branches #147, #149, and #150 were merged through GitHub.
- Summary:                Merged PR #147, #149, and #150 after updating each head onto current `origin/main`. Patched #147 so `computeRoiPct` includes any positive-cost cash entry. Updated tracked active project config/docs to `C:\dev\poker`; left archives and gitignored local settings untouched.
- Verification:           #147 career/financial tests plus docs/privacy/typecheck and GitHub CI/Vercel green. #149 ArenaPage test plus docs/privacy/typecheck and GitHub CI/Vercel green. #150 Coach's Note/proof-hand tests plus docs/privacy/typecheck and GitHub CI/Vercel green. Relocation docs/config: `npm.cmd run docs:check`, `npm.cmd run privacy:check`.
- Risks / assumptions:    `.claude/settings.local.json` is gitignored private state and was not edited. Historical archive entries still mention old worktrees by design.
- Next action requested:  None; GitHub reports zero open PRs after the sweep.

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
