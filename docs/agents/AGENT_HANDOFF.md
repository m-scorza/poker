# Agent Handoff Log

Use this file as the shared baton between Hermes, Google Antigravity, and any other coding agent. Keep the newest entry at the top.

Older or compacted handoff records are archived in [AGENT_HANDOFF_ARCHIVE_2026_05.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_05.md).

## Template

```md
## YYYY-MM-DD — <short task name>

- Owner / agent:          # Agent name (Antigravity, Hermes, Claude)
- Branch:                 # Active git branch name
- Scope:                  # Files allowed to be touched
- Files touched:          # Files modified or created
- Summary:                # Bullet points describing changes
- Verification:           # Output of validation commands and logs
- Risks / assumptions:    # Structural dependencies and risks
- Next action requested:  # Action instructions for the next agent
```

## 2026-05-31 - Villain stats position records and raw counters

- Owner / agent:          Codex
- Branch:                 task/villain-stats-fix
- Scope:                  `src/types/villain.ts`, `src/data/store.ts`, and `src/data/__tests__/store.test.ts`.
- Files touched:
  - `src/types/villain.ts` - changes `statsByPosition` from `Map` to a serializable record and adds persisted raw counters.
  - `src/data/store.ts` - aggregates villain stats through raw counters, populates per-position records, preserves notes/tags, and normalizes legacy rows.
  - `src/data/__tests__/store.test.ts` - adds fake IndexedDB tests for record persistence, per-position stats, sparse 3-bet/c-bet denominators, and note preservation.
  - `docs/product/STATUS.md` - regenerated test inventory for the new store test file.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Replaced IndexedDB-hostile `Map` storage for position stats with a plain `Partial<Record<Position, PositionStats>>`.
  - Persisted raw villain counters so VPIP/PFR/3-bet/c-bet stats use the correct denominators across incremental imports.
  - Added per-position raw counters and position stat updates inside `aggregateVillainStats`.
  - Added legacy normalization for existing `Map`/record-shaped position stats and profiles missing raw counters.
- Verification:
  - `npx.cmd vitest run src/data/__tests__/store.test.ts` - passed, 5 tests.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd test` - passed outside sandbox after the known esbuild filesystem denial, 57 files / 601 tests.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - passed after `npm.cmd run docs:update`.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-05-31-villain-stats-evidence.md`.
- Risks / assumptions:
  - Legacy profiles without raw counters are reconstructed from existing percentages, so their historical opportunity denominators are approximate until new hands accrue.
  - Scheduler `complete` should not be forced while task `allowed_files` omits required generated docs/handoff updates; mark/review the board state after PR review.
- Next action requested:
  - Review the branch/PR. If accepted, reconcile task board completion with the required docs files.

## 2026-05-31 - Facing-raise reaction ranges and SB fallthrough

- Owner / agent:          Codex
- Branch:                 task/facing-raise-ranges-fix
- Scope:                  `src/data/ranges.ts`, `src/analysis/rangeChecker.ts`, and focused range checker tests.
- Files touched:
  - `src/data/ranges.ts` - replaces heuristic facing-raise lookup with an explicit hero/opener reaction range map and adds CO-vs-HJ and SB-vs-late ranges.
  - `src/analysis/__tests__/rangeChecker.test.ts` - adds regressions for CO vs HJ, BTN vs HJ, SB vs CO, and SB vs BTN reaction behavior.
  - `docs/product/STATUS.md` - regenerated test inventory count after adding range regressions.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Stopped SB from falling through to loose late-position facing-raise behavior.
  - Made unsupported hero/opener reaction pairs return `undefined` instead of borrowing an unrelated fallback range.
  - Added position-specific reaction mappings for early-position, late-position, button, cutoff, and small blind facing opener classes.
- Verification:
  - `npx.cmd vitest run src/analysis/__tests__/rangeChecker.test.ts` - passed, 40 tests.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd test` - passed after sandbox rerun outside restricted filesystem, 56 files / 600 tests.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - failed before regen, then passed after `npm.cmd run docs:update`.
  - Local evidence summary: `.agents/runs/2026-05-31-facing-raise-ranges-evidence.md`.
- Risks / assumptions:
  - The new reaction ranges are conservative approximations from the existing range helpers and local strategy docs, not solver-imported matrices.
  - Scheduler `complete` should not be forced while task `allowed_files` omits required generated docs/handoff updates; mark/review the board state after PR review.
- Next action requested:
  - Review the branch/PR. If accepted, update the task board metadata or mark the task complete after acknowledging the required docs files.

## 2026-05-31 - Documentation review and source-of-truth refresh

- Owner / agent:          Codex
- Branch:                 codex/docs-review-2026-05-31
- Scope:                  Documentation-only review of root README, core product docs, agent-facing guidance, script inventory, and audit notes.
- Files touched:
  - `README.md` - reframed the app as a private/local multi-site analyzer, removed stale fixed-hero and old test-count wording, and corrected tree/dependency references.
  - `CLAUDE.md` - refreshed high-signal architecture, dependency, structure, hero-name, and source-attribution notes while preserving its intent/spec role.
  - `docs/product/STATUS.md` - updated verification metadata, `/demo` route state, dependency/analysis summaries, recent correctness fixes, and open follow-ups.
  - `docs/product/ROADMAP.md` - closed completed smoke-test, villain repair-path, TanStack Table/Virtual, and PWA configuration items; added the still-open `statsByPosition` persistence task.
  - `docs/product/PARSER_HEALTH.md` - changed the remaining gate pointer to the active board and IP audit instead of the retired partnership-status path.
  - `docs/audits/IP_COPY_AUDIT.md` - marked the audit as historical and noted `/demo` supersedes the old `/pricing` route.
  - `scripts/README.md` - added the active agent/kernel/docs scripts.
  - `docs/reports/2026-05-31-documentation-review.md` - recorded audit scope, corrections, and remaining drift risks.
  - `docs/agents/AGENT_HANDOFF.md` - recorded this session.
  - `.agents/runs/2026-05-31-docs-review-evidence.md` - local gitignored evidence summary.
- Summary:
  - Brought current docs back in line with `main` after PRs #27-#29: `/demo` is the active validation/demo route, `/pricing` is no longer wired, current test result is 56 files / 596 tests, and recent range/OHH/c-bet correctness fixes are reflected in `STATUS.md`.
  - Kept historical plans/reports/archive entries intact unless they were being used as active current pointers.
  - Did not mutate `.agents/state/task_spool.json`; the local scheduler state still needs separate cleanup after recent merges.
- Verification:
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd test` - sandboxed run failed to load `vite.config.ts` because esbuild hit `Cannot read directory "../../../..": Acesso negado`; rerun outside sandbox passed, 56 files / 596 tests.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - passed again after final `STATUS.md` metadata update.
- Risks / assumptions:
  - This was a documentation-only pass; no app source behavior changed.
  - Historical docs still mention `/pricing`, `PARTNERSHIP_STATUS.md`, and older branch names by design because they are point-in-time records.
  - `CLAUDE.md` remains lower authority than source/tests/`STATUS.md`, even after this refresh.
- Next action requested:
  - Review and commit this docs branch if the scope looks right; then handle the separate task-spool cleanup and the next correctness task (`statsByPosition` persistence or dedicated facing-raise reaction charts).

## 2026-05-30 - Range compliance MP and reaction cleanup

- Owner / agent:          Codex
- Branch:                 codex-range-compliance-mp-reactions
- Scope:                  Range compliance correctness and Ranges page filtering only.
- Files touched:
  - `src/data/ranges.ts` - added explicit `MP` RFI mapping and removed loose reaction fallback.
  - `src/analysis/rangeChecker.ts` - centralized RFI lookup, preserved BB RFI skip, and excluded BTN/BB calls before range lookup.
  - `src/pages/RangesPage.tsx` - added `MP` selector and applied selected position to matrix decisions.
  - `src/analysis/__tests__/rangeChecker.test.ts` - added MP, SB fallback, unsupported pair, and BTN/BB caller regressions.
  - `docs/product/STATUS.md` - regenerated test-count autogen block.
- Summary:
  - 7/8-max `MP` hands are now checked against a conservative MP1 baseline instead of silently passing compliance.
  - Facing-raise range checks no longer default unsupported hero/opener pairs to LP-vs-EP; unsupported raise/fold pairs are skipped, while non-BTN/BB cold calls still flag.
  - Ranges page counts and grid data now use the same position/scenario predicates.
- Verification:
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npx.cmd vitest run src/analysis/__tests__/rangeChecker.test.ts` - passed, 36 tests.
  - `npx.cmd vitest run --isolate=false` - passed, 56 files / 590 tests.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - passed after `npm.cmd run docs:update`.
- Risks / assumptions:
  - `MP` uses MP1 rather than MP2 to avoid creating loose false compliance for ambiguous middle-position histories.
  - SB facing an early open uses the tighter EP-vs-EP reaction set until dedicated SB reaction charts exist.
- Next action requested:
  - Review whether dedicated reaction charts should be added for SB, blinds, and late-position-vs-late-position spots.

## 2026-05-31 - C-bet opportunity and missed-cbet fixes

- Owner / agent:          Codex
- Branch:                 task/cbet-opportunity-fixes
- Scope:                  `scenarioDetector.ts`, `postflopAnalyzer.ts`, and focused tests.
- Files touched:
  - `src/analysis/scenarioDetector.ts` - blocks c-bet opportunities after flop donk bets, skips postflop analysis when hero did not see flop, and computes flop pot from prior actions.
  - `src/analysis/postflopAnalyzer.ts` - limits missed c-bet and bet-vs-missed-cbet spots to IP action order.
  - `src/analysis/__tests__/scenarioDetector.test.ts` - adds donk, preflop fold, and flop-pot sizing regressions.
  - `src/analysis/__tests__/postflopAnalyzer.test.ts` - adds IP/OOP missed-cbet regressions.
  - `docs/product/STATUS.md` - regenerated test-count block.
- Summary:
  - Prevented false c-bet opportunities when villain leads into the preflop raiser before hero can act.
  - Prevented postflop missed-cbet spots after hero folded preflop.
  - Stopped OOP checks from being treated as mandatory Game Plan missed c-bets.
  - Replaced hardcoded `bigBlind * 10` postflop pot sizing with computed preflop pot.
- Verification:
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npx.cmd vitest run src/analysis/__tests__/postflopAnalyzer.test.ts src/analysis/__tests__/scenarioDetector.test.ts` - passed, 54 tests.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd run build` - passed.
  - `npx.cmd vitest run --isolate=false` - first run hit a transient Vitest worker timeout in `importRuns`; rerun passed, 56 files / 591 tests.
- Risks / assumptions:
  - IP/OOP is inferred from flop action order, not static seat geometry; this matches the specific Game Plan missed-cbet checks here.
  - Scheduler `complete` was not run because task allowed_files omits required generated docs/handoff updates; this needs a human or board metadata adjustment if strict task completion is required.
- Next action requested:
  - Review and PR this branch, then update the local task spool if desired.

## 2026-05-31 - OHH large JSON and upload worker cleanup

- Owner / agent:          Codex
- Branch:                 task/ohh-parser-worker-fix-codex
- Scope:                  OHH file identification and upload worker lifecycle cleanup.
- Files touched:
  - `src/parser/siteIdentifier.ts` - checks full JSON content for OHH before the 65KB text signature scan.
  - `src/parser/__tests__/siteIdentifier.test.ts` - adds a large OHH JSON regression.
  - `src/components/hands/HandsUpload.tsx` - terminates superseded/unmounted parser workers and guards stale async completions.
  - `docs/product/STATUS.md` - updates generated test-count block.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Large valid OHH JSON files are no longer misrouted because the detector no longer parses only a truncated JSON prefix.
  - Upload workers are cleaned up on unmount, replacement, completion, and error; stale async file reads/import completions are ignored using an import sequence guard.
- Verification:
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npx.cmd vitest run src/parser/__tests__/siteIdentifier.test.ts` - passed, 14 tests.
  - `npm.cmd run docs:check` - passed.
  - `npx.cmd vitest run --isolate=false` - passed, 56 files / 587 tests.
  - `npm.cmd run build` - passed.
- Risks / assumptions:
  - Main checkout had an unrelated Antigravity handoff edit; task implementation was mirrored into a clean worktree for a clean PR.
  - No browser manual upload/unmount smoke was run; validation is typecheck, parser regression, full tests, and build.
- Next action requested:
  - Review and open/merge PR when ready. The original checkout still preserves the unrelated Antigravity handoff edit.

## 2026-05-31 - Standalone Sandbox v4 Visual Novelty Upgrades

- Owner / agent:          Antigravity
- Branch:                 main (Downloads workspace)
- Scope:                  c:\Users\MICRO\Downloads\poker 2 try (4)\design_sandbox_v4.html
- Files touched:
  - `c:\Users\MICRO\Downloads\poker 2 try (4)\design_sandbox_v4.html` - added live Swiss Drafting Blueprint overlay, Typographic Specimen Morpher, and Polar Hologram Sonar Radar.
  - `docs/agents/AGENT_HANDOFF.md` - recorded this session.
- Summary:
  - Upgraded Sandbox v4 to provide radical visual and interaction novelty (moving beyond basic color/font changes).
  - Coded a live Figma-style viewport inspector overlay (`#blueprint-canvas`) in Theme G, showing crosshair coordinates, ticking axis rulers, and real-time bounding box measurements (`w:.. x h:..`) and gaps (`d_gap: 40px`).
  - Implemented an interactive Typographic Specimen morphing pad elastically shifting font weights (`300` to `800`), spacing (`-6px` to `22px`), and leading (`0.9` to `1.7`) based on cursor coordinates.
  - Plotted a canvas-based polar sonar radar spectrum in Theme F sweeping active preflop combos as pulsing dot coordinates that display hand tags (`AA`, `AKs`) upon intersection.
- Verification:
  - Opened Sandbox v4 standalone HTML in the browser to confirm pixel-perfect drawing and smooth GSAP spring interactions.
- Risks / assumptions:
  - Edits are fully isolated inside the downloads workspace folder to avoid main repository regression risks.
- Next action requested:
  - User and Hermes review the updated sandboxes for merging when approved.

## 2026-05-30 - Multi-agent repo review

- Owner / agent:          Codex
- Branch:                 main
- Scope:                  Multi-agent coordination cleanup: docs, runner safety, and protocol validation.
- Files touched:
  - `docs/agents/AGENT_HANDOFF.md` - recorded this review session per handoff protocol.
  - `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_05.md` - archived older active entries and closed the archive template fence.
  - `scripts/parallel-runner.cjs` - replaced experimental launcher with dry-run scheduler, conflict checks, safe kernel flags, and explicit `--execute`.
  - Agent docs/config - aligned active gate references to `TWO_AGENT_BOARD.md`, removed mandatory `CURRENT_CONTEXT.md`, updated worktree protocol, fixed Claude path typo, and ignored `.codex/`.
- Summary:
  - Implemented scheduler-controlled multi-agent workflow: active gate is `TWO_AGENT_BOARD.md`, parallel work requires non-overlapping files/lanes, and `parallel-runner.cjs` refuses conflicted queues by default.
  - Compacted the active handoff below the kernel size limit and kept old entries in the archive.
  - No app source code was changed.
- Verification:
  - `node scripts/agent-kernel.cjs validate-protocol --json` - passed.
  - `node --check scripts/parallel-runner.cjs` - passed.
  - `node scripts/parallel-runner.cjs` - expected failure: refused the current pending queue because range/scenario/store tasks overlap.
  - `node scripts/parallel-runner.cjs --task task-2026-05-30-007` - passed dry-run and printed worktree setup plan without changing files.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run docs:check` - passed.
  - `git diff --check` - passed.
- Risks / assumptions:
  - Some files were already staged before this pass; Codex preserved that state and layered edits on top.
  - The runner was validated in dry-run mode only; no worktrees or agent terminals were launched.
- Next action requested:
  - Deconflict the current pending queue, then launch only a non-overlapping subset such as `node scripts/parallel-runner.cjs --task task-2026-05-30-007 --execute`.

## 2026-05-30 — Fix getHandCategory suited gapper broadway fallthrough

- Owner / agent:          Antigravity
- Branch:                 task/hand-category-fallthrough-fix
- Scope:                  src/pages/HandsPage.tsx, src/components/hands/HandsFilters.tsx
- Files touched:
  - `src/components/hands/HandsFilters.tsx` — added `'suited-gappers'` to `HAND_CATEGORIES` and mapped its label `'Suited Gappers & Other'` in `CATEGORY_LABELS`.
  - `src/pages/HandsPage.tsx` — fixed `getHandCategory` so it doesn't fall through to `'broadway'` for suited hands, mapping suited gappers correctly to `'suited-gappers'`. Added self-executing unit tests executing assertions at module-load time in test environments.
- Summary:
  - Addressed a scenario where non-broadway, non-ace, non-connector suited hands (e.g. K5s, 86s) were mislabeled as 'broadway' by mapping them to the new 'suited-gappers' category.
  - Ensured correct rendering in filters and tables.
- Verification:
  - `npm run typecheck` ✓ (tsc completed successfully)
  - `npm test` ✓ (all 586 tests passed)
- Risks / assumptions:
  - Category filtering works correctly for new and existing hands.
- Next action requested:
  - Review changes and merge to main when appropriate.
