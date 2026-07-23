# Agent Handoff Archive — July 2026

Compacted handoff records rolled off the active
[AGENT_HANDOFF.md](../AGENT_HANDOFF.md) to keep it inside the kernel context
budget. Newest at the top.

## 2026-07-12 - Write direct test suites for strategyProfiles, importDiagnosticsPolicy, tournamentSummary

- Owner / agent:          Antigravity
- Branch:                 agy/section6-tests
- Scope:                  src/data/__tests__/strategyProfiles.test.ts, src/data/__tests__/importDiagnosticsPolicy.test.ts, src/parser/__tests__/tournamentSummary.test.ts
- Files touched:          src/data/__tests__/strategyProfiles.test.ts, src/data/__tests__/importDiagnosticsPolicy.test.ts, src/parser/__tests__/tournamentSummary.test.ts
- Summary:                Created direct characterization test suites for strategyProfiles (pinning getThresholds, getCbetRule, advancedThreeBetSize boundaries, BB_DEFENSE_ICM_ADJUSTMENTS), importDiagnosticsPolicy (pinning sanitizeDiagnosticText 240-char cap, sanitizeDiagnosticSourceFile redaction, buildImportDiagnosticsSnapshot), and tournamentSummary (characterizing parseTournamentSummary finish/prize/bounty extraction and documenting RE_MONEY comma behavior).
- Verification:           `npm run typecheck:test` passed; `npx vitest run src/data/__tests__/strategyProfiles.test.ts src/data/__tests__/importDiagnosticsPolicy.test.ts src/parser/__tests__/tournamentSummary.test.ts` passed (3 suites, 32 tests).
- Risks / assumptions:    Characterization tests document that parseTournamentSummary finish-line prize extraction returns 0 when comma-separated unless fallback 'You received' header is present.
- Next action requested:  Review characterization test suites and evaluate parseTournamentSummary finish-line comma handling.

## 2026-07-11 - Import recovery and replay number formatting

- Owner / agent:          Codex
- Branch:                 codex/fix-import-and-number-format
- Scope / summary:        UIR-001/002 first slice: guarded import lifecycle failures, watchdog/cancel/phase UI, and shared replay chip formatting with regressions.
- Verification:           Focused suites, typechecks, build, docs, diff and browser passed; follow-up CI fixture typing fixed.
- Risks / next:           In-flight storage promises cannot be aborted; finish tracked ZIP evidence and repo-wide numeric migration.

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

## 2026-07-08 - Out-of-the-box slate (PR #130) + owner-approved F7 deletion

- Owner / agent:          Claude (remote session, owner steer: "not the planned waves — outside the box")
- Branch:                 claude/codebase-improvement-8akixm → PR #130
- Scope:                  NEW modules only, deliberately off the abyss-wave lanes. Shared-file edits limited to App.tsx (+/data route), Sidebar.tsx (NAV_ITEMS → layout/navItems.ts), Layout.tsx (+CommandPalette mount), CoachsNotePage.tsx (+Mindset card), sessions.ts (SESSION_GAP_MS exported), pokerstars.ts (one-line seat-header skip in the action loop — fuzz-found bug), package.json (analyze script).
- Files touched:          analysis/tiltDetector.ts, components/coach/MindsetCard.tsx, data/backup.ts, pages/DataVaultPage.tsx, test/fuzz/handHistoryGenerator.ts, parser/__tests__/fuzzInvariants.test.ts, scripts/analyze-cli.ts, components/shared/CommandPalette.tsx, components/layout/navItems.ts, tests, docs, and the owner-approved deletion of dashboard/StudyPlanCard.tsx and ValueSnapshotCard.tsx.
- Summary:                Five additions: Tilt Detector, Data Vault, parser fuzz harness, headless analyze CLI, and Cmd/Ctrl+K command palette. 879/879 tests green (baseline 851).
- Verification:           Full gate per commit group: docs:check, typecheck, typecheck:test, lint, test, build. CLI exercised against a real 116-hand fixture.
- Risks / assumptions:    Abyss Waves 2–4 remained owner-executed; Data Vault refuses cross-schema-version restores; fuzz lane excluded colon-in-chat ambiguity for future work.
- Next action requested:  Review PR #130. Wave 2's F8 should not remove SESSION_GAP_MS or TILT constants because they now have callers.

## 2026-07-05 - Starter diagnostic + curriculum selector continuation

- Owner / agent:          Hermes
- Branch:                 hermes/xray-pretty-20260703
- Scope:                  Continuation on the intentional x-ray/curriculum/Drills slice. New scope: browser-local starter diagnostic summary, Coach/Drills recommendation bridge, and all-pack curriculum selector. No parser/range/math, cloud/sync, public-share, pricing, raw-hand-history, solver-EV, or trainer-answer scope.
- Files touched:          `src/data/starterDiagnostic.ts`; `src/pages/ArenaPage.tsx`; `src/pages/CoachsNotePage.tsx`; `src/pages/__tests__/ArenaPage.test.tsx`; `src/pages/__tests__/CoachsNotePage.test.tsx`; `docs/product/STATUS.md`; `docs/agents/AGENT_HANDOFF.md`. Pre-existing dirty x-ray/curriculum files remain intentional and uncommitted.
- Summary:                Arena records missed starter diagnostic spots by source curriculum pack (`reviewAreas`) and stores `recommendedPackTitle` in browser-local storage. Coach's Note surfaces the lower-confidence priority review line while preserving no-leak-grading/no-solver-EV/no-imported-hand-evidence copy. Drills now shows all 11 generated local curriculum seed packs instead of only the first four, and spotlights the starter diagnostic recommended pack with a direct `Start recommended pack` action.
- Verification:           TDD red confirmed: targeted Arena/Coach tests first failed on missing diagnostic summary/recommendation copy, hidden late curriculum packs, and missing Drills recommendation spotlight. Green checks: targeted Arena/Coach passed (2 files / 17 tests); Arena + Study Queue route contract passed (2 files / 18 tests); `npm run typecheck` passed; `npm run lint` passed; `npm run docs:update` updated `STATUS.md` for the new test count; `npm run docs:check` passed; `npm run build` passed; final `npm test -- --pool=threads` passed (81 files / 859 tests, 512.52s; known jsdom `scrollTo`, Node localStorage, and intentional rangeChecker warning notices only).
- Risks / assumptions:    Worktree remains intentionally dirty with the larger x-ray posture, Coach, Dashboard, curriculum seed extraction, Drills, and diagnostic lane. Current continuation stores only browser-local aggregate diagnostic counters/titles and curriculum pack IDs/titles; it stores no raw hands, player data, solver output, trainer answers, external links, or imported-hand evidence.
- Next action requested:  Either commit/park the accumulated x-ray+curriculum slice, or continue with the next small Drills progression shell (e.g. local per-pack progress/completion) after re-checking file scope.
