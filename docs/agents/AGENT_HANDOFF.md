# Agent Handoff Log

Use this file as the shared baton between Hermes, Google Antigravity, and any other coding agent. Keep the newest entry at the top.

Older or compacted handoff records are archived in:

- [AGENT_HANDOFF_ARCHIVE_2026_07.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_07.md)
- [AGENT_HANDOFF_ARCHIVE_2026_06.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_06.md)
- [AGENT_HANDOFF_ARCHIVE_2026_05.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_05.md)

## 2026-07-10 - Open PR sweep and C:\dev\poker relocation

- Owner / agent:          Codex
- Branch:                 main
- Scope:                  Review and merge all open PRs; update active project references from the old OneDrive checkout to `C:\dev\poker`.
- Files touched:          `.claude/settings.json`, `docs/agents/PILOTING.md`, `docs/product/PARSER_HEALTH.md`, `docs/agents/AGENT_HANDOFF.md`; PR branches #147, #149, and #150 were merged through GitHub.
- Summary:                Merged PR #147, #149, and #150 after updating each head onto current `origin/main`. Patched #147 so `computeRoiPct` includes any positive-cost cash entry. Updated tracked active project config/docs to `C:\dev\poker`; left archives and gitignored local settings untouched.
- Verification:           #147 career/financial tests plus docs/privacy/typecheck and GitHub CI/Vercel green. #149 ArenaPage test plus docs/privacy/typecheck and GitHub CI/Vercel green. #150 Coach's Note/proof-hand tests plus docs/privacy/typecheck and GitHub CI/Vercel green. Relocation docs/config: `npm.cmd run docs:check`, `npm.cmd run privacy:check`.
- Risks / assumptions:    `.claude/settings.local.json` is gitignored private state and was not edited. Historical archive entries still mention old worktrees by design.
- Next action requested:  None; GitHub reports zero open PRs after the sweep.

## 2026-07-08 - Out-of-the-box slate (PR #130) + owner-approved F7 deletion

- Owner / agent:          Claude (remote session, owner steer: "not the planned waves — outside the box")
- Branch:                 claude/codebase-improvement-8akixm → PR #130
- Scope:                  NEW modules only, deliberately off the abyss-wave lanes. Shared-file edits
                          limited to: App.tsx (+/data route), Sidebar.tsx (NAV_ITEMS → layout/navItems.ts),
                          Layout.tsx (+CommandPalette mount), CoachsNotePage.tsx (+Mindset card),
                          sessions.ts (SESSION_GAP_MS exported), pokerstars.ts (one-line seat-header
                          skip in the action loop — fuzz-found bug), package.json (analyze script).
- Files touched:          analysis/tiltDetector.ts, components/coach/MindsetCard.tsx, data/backup.ts,
                          pages/DataVaultPage.tsx, test/fuzz/handHistoryGenerator.ts,
                          parser/__tests__/fuzzInvariants.test.ts, scripts/analyze-cli.ts,
                          components/shared/CommandPalette.tsx, components/layout/navItems.ts,
                          + tests, + docs (STATUS prose, ROADMAP slate note, abyss F7 line).
                          DELETED (owner-approved F7): dashboard/StudyPlanCard.tsx, ValueSnapshotCard.tsx.
- Summary:                Five additions: Tilt Detector (+Coach's Note Mindset card), Data Vault
                          (/data backup/restore), parser fuzz harness (250-seed invariants; caught a
                          real phantom-actor parser bug — fixed), headless analyze CLI, Cmd/Ctrl+K
                          command palette. 879/879 tests green (baseline 851).
- Verification:           Full gate per commit group: docs:check, typecheck, typecheck:test, lint,
                          test (879 pass), build. CLI exercised against a real 116-hand fixture.
- Risks / assumptions:    Abyss Waves 2–4 remain owner-executed; none of their planned refactors are
                          touched here. Data Vault refuses cross-schema-version restores by design.
                          Fuzz lane deliberately excludes colon-in-chat ambiguity (documented in the
                          generator header) — future lane.
- Next action requested:  Review PR #130. Wave 2's F8 (dead-export prune) should NOT remove
                          SESSION_GAP_MS / TILT_* consts — they have callers now.

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
