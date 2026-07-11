# Agent Handoff Archive — July 2026

Compacted handoff records rolled off the active
[AGENT_HANDOFF.md](../AGENT_HANDOFF.md) to keep it inside the kernel context
budget. Newest at the top.

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
