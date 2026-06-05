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

## 2026-06-05 - Stale findings reconciliation

- Owner / agent:          Codex
- Branch:                 codex/reconcile-stale-findings
- Scope:                  Reconcile repeated old report/spool findings against current merged `main`.
- Files touched:
  - `docs/reports/2026-06-05-stale-findings-reconciliation.md` - maps old labels to current source-of-truth status and remaining real follow-ups.
  - `docs/agents/TWO_AGENT_BOARD.md` - warns that the gitignored spool can lag behind merged PRs.
  - `docs/reports/2026-06-01-review-output-refresh.md` - adds a supersession note for later facing-raise/OHH work.
  - `docs/reports/2026-06-02-product-readiness-refresh.md` - adds a supersession note for later facing-raise/OHH work.
  - `.agents/state/task_spool.json` - local gitignored coordination state updated to mark tasks 005, 006, 008, and 009 completed.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Clarified that PRs #48 and #49 did not duplicate old work; they closed narrower remaining trust gaps.
  - Marked old `needs_human` spool entries as completed after verifying current source/docs for facing-raise coverage, villain position stats, advanced analyzer context attachment, and test hygiene.
  - Preserved real remaining follow-ups: native proprietary room fixtures, solver-validated per-pair charts, user validation, and release/support hygiene.
- Verification:
  - `npm.cmd run docs:check` - passed.
  - `git diff --check` - passed.
- Risks / assumptions:
  - `.agents/state/task_spool.json` is local/gitignored; the tracked PR documents the reconciliation, while the local spool update only affects this checkout.
- Next action requested:
  - Review and merge this reconciliation slice, then choose between native-format fixture sourcing, validation execution, or release-hygiene docs.

## 2026-06-05 - OHH fixture sweep coverage

- Owner / agent:          Codex
- Branch:                 codex/ohh-fixture-sweep
- Scope:                  Add Open Hand History JSON fixtures to the parser fixture sweep and refresh parser-health/product docs.
- Files touched:
  - `src/test/fixtures/ohh/ipoker-tournament.json` - standardized iPoker-style OHH object-wrapper fixture.
  - `src/test/fixtures/ohh/888-pacific-tournament-array.json` - standardized 888/Pacific-style OHH array-wrapper fixture.
  - `src/parser/__tests__/fixtureSweep.test.ts` - adds OHH fixture sweep oracle checks for IDs, blinds, board, buy-in/fee, and hero cards.
  - `docs/product/PARSER_HEALTH.md` - refreshes parser fixture evidence and boundary language.
  - `docs/product/STATUS.md` - records shipped OHH fixture sweep coverage and keeps native proprietary text formats as a follow-up.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Parser fixture evidence now includes two committed standardized Open Hand History JSON fixtures.
  - OHH coverage is labeled narrowly: standardized JSON object/array wrappers are covered; native proprietary room text exports are not claimed.
  - Parser-health totals now publish 304 supported fixture files/entries with the prior GGPoker archive audit split out from the current focused sweep.
- Verification:
  - `npx.cmd vitest run src/parser/__tests__/fixtureSweep.test.ts src/parser/__tests__/openHandHistory.test.ts` - passed, 2 files / 9 tests.
  - `npm.cmd run typecheck:test` - passed.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run lint` - passed with 7 existing accessibility warnings in previously-warning files.
  - `npm.cmd run build` - passed.
  - `npx.cmd vitest run` - passed, 61 files / 666 tests.
  - `npm.cmd run docs:update` - passed and updated generated inventories.
  - `npm.cmd run docs:check` - passed.
  - `git diff --check` - passed.
- Risks / assumptions:
  - The OHH fixtures are standardized JSON examples, not exhaustive native-room text exports.
  - Direct native iPoker, 888/Pacific, WPN, PartyPoker, Chico, and Winamax text support still needs real fixtures before support claims.
- Next action requested:
  - Review and merge this parser fixture slice, then continue with native-format fixture sourcing or remaining release-hygiene work.

## 2026-06-04 - Facing-raise coverage and solver feasibility

- Owner / agent:          Codex
- Branch:                 codex/facing-raise-coverage
- Scope:                  Make facing-raise chart coverage explicit and refresh solver feasibility without adding solver-backed claims.
- Files touched:
  - `src/data/ranges.ts` - adds facing-raise opener lists and reaction coverage metadata.
  - `src/data/__tests__/ranges.test.ts` - covers valid openers, supported chart metadata, invalid-opener handling, BB partial defense, and legacy getter alignment.
  - `src/pages/RangesPage.tsx` - adds opener selection for Reaction mode and a supported/unsupported coverage note.
  - `docs/research/2026-06-04-solver-feasibility.md` - records current solver feasibility research and conservative recommendation.
  - `docs/product/SOLVER_BOUNDARY.md` - links future solver work to the feasibility baseline.
  - `docs/product/STATUS.md` - records the shipped facing-raise coverage behavior and keeps solver-validated charts as a follow-up.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Reaction charts no longer assume a CO opener for every hero position; the selected opener controls the chart, matrix, and hand sample.
  - Facing-raise coverage now reports rule-based, partial, or unsupported status instead of silently returning an empty range.
  - Solver feasibility research keeps real solver integration deferred until an offline CLI spike proves license, runtime, memory, and output metadata.
- Verification:
  - `npx.cmd vitest run src/data/__tests__/ranges.test.ts src/analysis/__tests__/rangeChecker.test.ts` - passed, 2 files / 76 tests.
  - `npm.cmd run typecheck:test` - passed.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run lint` - passed with 7 existing accessibility warnings in previously-warning files.
  - `npm.cmd run build` - passed after rerun with a longer timeout; the first 120s run timed out after successful build output.
  - `npx.cmd vitest run` - passed, 61 files / 664 tests.
  - `npm.cmd run docs:update` - passed and updated generated inventories.
  - `npm.cmd run docs:check` - passed.
  - `git diff --check` - passed.
- Risks / assumptions:
  - Existing reaction ranges remain rule-based strategy references; this PR makes coverage visible but does not make them solver-validated.
  - Browser/native solver integration remains deferred by design; no solver dependency or telemetry was added.
- Next action requested:
  - Review and merge this coverage slice, then continue with OHH real-fixture coverage or release-hygiene docs.

## 2026-06-04 - Automatic local import diagnostics

- Owner / agent:          Codex
- Branch:                 codex/auto-import-diagnostics
- Scope:                  Make import diagnostics automatic, local-only, bounded, and user-clearable.
- Files touched:
  - `src/data/importDiagnosticsPolicy.ts` - adds diagnostics privacy constants, metadata builder, and redaction helpers.
  - `src/data/importRuns.ts` - stores diagnostics metadata, sanitized source filenames, capped warning text, and richer Markdown export content.
  - `src/data/store.ts` - prunes import diagnostics to the latest 50 runs and adds diagnostics-only clear support.
  - `src/components/hands/HandsUpload.tsx` - collects browser/app basics locally, exports retained diagnostics, and adds Clear Diagnostics.
  - `src/data/__tests__/importRuns.test.ts` - covers diagnostics redaction, metadata, export content, mock persistence retention, and clear behavior.
  - `src/data/__tests__/store.test.ts` - covers real Dexie retention and diagnostics-only clear behavior.
  - `docs/product/DATA_MODEL_AND_PRIVACY.md` - documents automatic local diagnostics and the no-telemetry boundary.
  - `docs/product/STATUS.md` - records the shipped behavior.
  - `.agents/runs/2026-06-04-auto-import-diagnostics-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Every completed import now saves an explicit local-only diagnostics snapshot with sanitized basenames, capped single-line warnings, aggregate counts, and environment basics.
  - Import diagnostics retention is bounded to the latest 50 runs and can be cleared without deleting parsed hands/tournaments.
  - The diagnostics export now uses the retained ledger and states the automatic local collection + privacy boundary.
- Verification:
  - `npx.cmd vitest run src/data/__tests__/importRuns.test.ts src/data/__tests__/store.test.ts` - passed, 2 files / 24 tests.
  - `npm.cmd run typecheck:test` - passed.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run build` - passed.
  - `npm.cmd run lint` - passed with 7 existing accessibility warnings in previously-warning files.
  - `npx.cmd vitest run` - passed, 61 files / 659 tests.
  - `npm.cmd run docs:update` - passed and updated generated inventories.
  - `npm.cmd run docs:check` - passed.
  - `git diff --check` - passed.
- Risks / assumptions:
  - Browser/platform/language basics are retained locally only; any remote submission still needs explicit consent and backend-retention design.
  - Filenames are reduced to basenames, but user-created filenames may still contain personal context; export copy still tells users to review before sharing.
- Next action requested:
  - Review and merge this local diagnostics slice, then continue with facing-raise strategy-data hardening.

## 2026-06-04 - Import diagnostics export

- Owner / agent:          Codex
- Branch:                 codex/import-diagnostics-export
- Scope:                  Add privacy-conscious import diagnostics export for parser/import failure observability.
- Files touched:
  - `src/data/importRuns.ts` - adds Markdown diagnostics report builder for recent import runs.
  - `src/data/__tests__/importRuns.test.ts` - covers diagnostics export ordering, content, empty state, run limit, and multiline sanitization.
  - `src/components/hands/HandsUpload.tsx` - adds Data Health `Export Diagnostics` download action.
  - `docs/product/STATUS.md` - records the shipped import diagnostics export.
  - `.agents/runs/2026-06-04-import-diagnostics-export-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Added a Markdown export containing source filenames, aggregate import counts, confidence, and parser warnings.
  - Export copy explicitly states it excludes raw hand histories, hole cards, board cards, actions, and player-level hand data.
  - Added a Data Health export button so real-user parse failures can be shared without copying raw files.
- Verification:
  - `npx.cmd vitest run src/data/__tests__/importRuns.test.ts` - passed, 1 file / 12 tests.
  - `npm.cmd run typecheck:test` - passed.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run lint` - passed with 7 existing accessibility warnings in unrelated/previously-warning files.
  - `npm.cmd run build` - passed outside sandbox because sandboxed Vite config resolution is known to hit Windows access denied.
  - `npx.cmd vitest run` - escalated run passed, 61 files / 653 tests.
  - `npm.cmd run docs:update` - passed and updated the generated test inventory.
  - `npm.cmd run docs:check` - passed.
  - `git diff --check` - passed.
- Risks / assumptions:
  - Source filenames and parser warning strings may still contain user-provided naming context; the export warns users to review filenames before sharing.
  - This improves observability and support handoff, but does not add new parser coverage or OHH real fixtures.
- Next action requested:
  - Review and merge this import-observability slice, then continue with facing-raise strategy-data hardening.

## 2026-06-04 - Recommendation trust labels

- Owner / agent:          Codex
- Branch:                 codex/recommendation-trust-labels
- Scope:                  Add visible trust/caveat labels so rule-based and proxy-model recommendations do not read as solver-backed advice.
- Files touched:
  - `src/utils/evidence.ts` - expands evidence metadata with recommendation strength, caveats, and `solverBacked` status.
  - `src/utils/__tests__/evidence.test.ts` - covers the new metadata fields.
  - `src/components/dashboard/StudyPlanCard.tsx` - surfaces evidence strength, sample confidence, and caveats in Study Queue.
  - `src/pages/LeaksPage.tsx` - surfaces evidence strength and caveats in Leak Inbox and softens action copy from fix-now to review-step language.
  - `src/analysis/studyPlan.ts` - removes solver-adjacent wording from non-solver study queue explanations.
  - `docs/product/STATUS.md` - records the shipped trust-label behavior.
  - `.agents/runs/2026-06-04-recommendation-trust-labels-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Added explicit `rule-based, no EV`, `directional only`, `reference check`, and `review only` recommendation-strength labels.
  - Added caveat text to Study Queue and Leak Inbox so unsupported/proxy evidence is framed as a review prompt, not a strategy verdict.
  - Preserved the existing private/local posture and did not add solver integration.
- Verification:
  - `npx.cmd vitest run src/utils/__tests__/evidence.test.ts` - passed, 1 file / 5 tests.
  - `npm.cmd run typecheck:test` - passed.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run build` - passed outside sandbox after sandboxed Vite config resolution failed with Windows access denied.
  - `npx.cmd vitest run` - escalated run passed, 61 files / 649 tests.
  - `npm.cmd run docs:update` - already up to date.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd run lint` - passed with 7 existing accessibility warnings in unrelated files (`HandReplay.tsx`, `HandsUpload.tsx`, `DualRangeMatrix.tsx`, `RangeGrid.tsx`).
  - `git diff --check` - passed.
- Risks / assumptions:
  - This is a trust-surfacing change, not a solver or strategy-data upgrade.
  - Remaining trust-gate work still includes OHH real-fixture coverage and dedicated facing-raise charts.
- Next action requested:
  - Review and merge this trust-label slice, then continue with import observability and facing-raise strategy-data hardening.

## 2026-06-02 - Product readiness refresh

- Owner / agent:          Codex
- Branch:                 codex/product-readiness-refresh-2026-06-02
- Scope:                  Refresh older Hermes/Opus product-readiness analysis against the current repo state.
- Files touched:
  - `docs/reports/2026-06-02-product-readiness-refresh.md` - adds a current readiness scorecard, use-case estimates, blockers, and recommended next gate.
  - `.agents/runs/2026-06-02-product-readiness-refresh-evidence.md` - local evidence summary.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Re-scored readiness independently instead of copying or mechanically raising the old Hermes estimate.
  - Separates private validation readiness from paid/public product readiness.
  - Concludes the current repo is ready for guided private validation, not public sale.
  - Identifies validation, OHH real-fixture coverage, facing-raise charts, confidence surfacing, and release/support hygiene as the next product gates.
- Verification:
  - `npm.cmd run docs:check` - passed.
  - `git diff --check` - passed.
- Risks / assumptions:
  - This is a product/readiness report only; no code behavior changed.
  - External market check was narrow and used only as benchmark calibration, not as a full competitor research refresh.
- Next action requested:
  - Review and merge the report. Then run the six-user validation plan before starting commercial/public-product work.

## 2026-06-02 - HandsPage hand-category test extraction

- Owner / agent:          Codex
- Branch:                 codex/move-hand-category-tests
- Scope:                  Move `HandsPage.tsx` self-executing hand-category assertions into a real Vitest file.
- Files touched:
  - `src/pages/HandsPage.tsx` - exports `getHandCategory()` and removes the `globalThis as any` test-environment assertion block.
  - `src/pages/__tests__/HandsPage.test.ts` - adds real parameterized coverage for the same hand categories, including suited-gapper regressions.
  - `docs/product/STATUS.md` - marks the test-only assertion finding fixed and refreshes verification/test counts.
  - `docs/reports/2026-06-01-review-output-refresh.md` - records the P3 finding as resolved and clears the recommended refresh batch.
  - `.agents/runs/2026-06-02-hand-category-test-extraction-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Removed test logic from production page source without changing runtime filter behavior.
  - Preserved the suited-gapper coverage and corrected the stale `AKs` expectation to match the current suited-aces category.
  - The June 1 refresh report now has no open recommended-next-batch items.
- Verification:
  - `npx.cmd vitest run src/pages/__tests__/HandsPage.test.ts` - passed, 1 file / 21 tests.
  - `npm.cmd run typecheck:test` - passed.
  - `npm.cmd run docs:update` - updated generated test inventory in `docs/product/STATUS.md`.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd test` - escalated run passed, 61 files / 649 tests.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-06-02-hand-category-test-extraction-evidence.md`.
- Risks / assumptions:
  - `getHandCategory()` is now exported only for focused tests; no product behavior changed.
  - Full Vitest still prints the existing `--localstorage-file` warning even though the suite passes.
- Next action requested:
  - Review and merge this final review-refresh cleanup. After merge, the June 1 refresh items are closed; remaining broader follow-ups live in `docs/product/STATUS.md`.

## 2026-06-02 - Exact poker odds dependency pin

- Owner / agent:          Codex
- Branch:                 codex/pin-poker-odds-calculator
- Scope:                  Pin the pre-1.0 `poker-odds-calculator` dependency exactly and close the review-refresh package finding.
- Files touched:
  - `package.json` - changes `poker-odds-calculator` from `^0.4.0` to `0.4.0`.
  - `package-lock.json` - updates the root dependency spec to exact `0.4.0`; resolved package entry was already `0.4.0`.
  - `docs/product/STATUS.md` - records the exact pin and refreshes the dependency inventory/header.
  - `docs/reports/2026-06-01-review-output-refresh.md` - records the package finding as resolved and updates the recommended next batch.
  - `.agents/runs/2026-06-02-pin-poker-odds-calculator-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Removed the caret range for `poker-odds-calculator` so a pre-1.0 minor release cannot change HandReplay equity behavior through install drift.
  - Confirmed `npm.cmd install --package-lock-only --ignore-scripts` reports the lockfile is up to date.
  - The remaining active review-refresh item is moving the `HandsPage.tsx` test-only assertions into a real test file.
- Verification:
  - `npm.cmd install --package-lock-only --ignore-scripts` - up to date; audited 736 packages; existing 2 critical audit findings remain.
  - `rg -n '"poker-odds-calculator": "\^' package.json package-lock.json` - no matches.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:update` - updated generated dependency inventory in `docs/product/STATUS.md`.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd test` - escalated run passed, 60 files / 628 tests.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-06-02-pin-poker-odds-calculator-evidence.md`.
- Risks / assumptions:
  - This does not change the resolved package version, only the installation range.
  - `npm install` still reports the existing two critical audit findings; this scoped pin does not address them.
  - Full Vitest still prints the existing `--localstorage-file` warning even though the suite passes.
- Next action requested:
  - Review and merge this dependency/docs fix, then move the test-only `HandsPage.tsx` assertions into a real test file.

## 2026-06-02 - PWA icon assets

- Owner / agent:          Codex
- Branch:                 codex/add-pwa-icon-assets
- Scope:                  Close the PWA install-asset finding by adding the files already referenced by `vite.config.ts`.
- Files touched:
  - `public/favicon.ico` - generated 32x32 app favicon.
  - `public/apple-touch-icon.png` - generated 180x180 touch icon.
  - `public/masked-icon.svg` - generated monochrome mask icon.
  - `public/pwa-192x192.png` - generated 192x192 PWA icon.
  - `public/pwa-512x512.png` - generated 512x512 PWA icon.
  - `docs/product/STATUS.md` - marks PWA manifest assets fixed and refreshes verification header.
  - `docs/product/ROADMAP.md` - marks vite-plugin-pwa icon assets complete.
  - `docs/reports/2026-06-01-review-output-refresh.md` - records the PWA finding as resolved and updates the recommended next batch.
  - `.agents/runs/2026-06-02-pwa-icon-assets-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Added the public asset files referenced by `VitePWA()` instead of removing manifest references.
  - Verified PNG dimensions and that `npm.cmd run build` copies the icons into `dist/`.
  - Updated the June 1 refresh so the remaining batch is dependency pinning and HandsPage test-hygiene cleanup.
- Verification:
  - PNG dimension check - `apple-touch-icon.png` 180x180, `pwa-192x192.png` 192x192, `pwa-512x512.png` 512x512.
  - `npm.cmd run build` - passed; `dist/` contains the generated favicon, touch icon, mask SVG, and PWA PNGs.
  - `npm.cmd run docs:update` - status inventory already up to date.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd test` - escalated run passed, 60 files / 628 tests.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-06-02-pwa-icon-assets-evidence.md`.
- Risks / assumptions:
  - These are minimal generated install assets for the private/local app posture, not final brand design.
  - Full Vitest still prints the existing `--localstorage-file` warning even though the suite passes.
- Next action requested:
  - Review and merge this asset/docs fix, then pin `poker-odds-calculator` exactly.

## 2026-06-02 - Bounty and final-table context surfacing

- Owner / agent:          Codex
- Branch:                 codex/surface-bounty-ft-contexts
- Scope:                  Surface already-attached bounty/fake-shove/resteal decision metadata in user-visible replay UI and update the review refresh.
- Files touched:
  - `src/components/hands/HandReplay.tsx` - adds header chips and a Tournament Context panel for `bountyContext`, `fakeShoveSpot`, and `restealSpot`.
  - `src/components/hands/__tests__/HandReplay.test.tsx` - verifies all three attached context types render in the replay modal.
  - `docs/product/STATUS.md` - marks bounty/final-table context surfacing fixed and refreshes verification/test counts.
  - `docs/product/ROADMAP.md` - marks the UI-surfacing item complete.
  - `docs/reports/2026-06-01-review-output-refresh.md` - records the P1 finding as resolved and updates the recommended next batch.
  - `.agents/runs/2026-06-02-bounty-ft-context-surfacing-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Closed the docs/UI mismatch where bounty and final-table analyzers attached metadata, but HandReplay only surfaced ICM and squeeze cues.
  - Added compact visible context for bounty equity drop/coverage, fake-shove raise context, and final-table resteal risk-premium context.
  - Kept analysis behavior unchanged; this is a display and documentation consistency fix.
- Verification:
  - `npx.cmd vitest run src/components/hands/__tests__/HandReplay.test.tsx` - passed, 1 file / 7 tests.
  - `npm.cmd run typecheck:test` - passed.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:update` - updated generated test-call count in `docs/product/STATUS.md`.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd test` - sandboxed first run failed before startup with esbuild access denied reading Vite config; escalated rerun passed, 60 files / 628 tests.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-06-02-bounty-ft-context-surfacing-evidence.md`.
- Risks / assumptions:
  - The panel displays analyzer metadata already stored on `HeroDecision`; it does not broaden or recalibrate the bounty/FT heuristics.
  - Full Vitest still prints the existing `--localstorage-file` warning even though the suite passes.
- Next action requested:
  - Review and merge this focused UI/docs fix, then move to PWA icon assets and exact `poker-odds-calculator` pinning.

## 2026-06-02 - HandReplay postflop consistency

- Owner / agent:          Codex
- Branch:                 codex/handreplay-postflop-consistency
- Scope:                  Close the HandReplay postflop recomputation drift and Portuguese note regressions from the June 1 review refresh.
- Files touched:
  - `src/components/hands/HandReplay.tsx` - prefers stored import-time `HeroDecision.postflopActions` and falls back to recomputation only for older decisions.
  - `src/components/hands/__tests__/HandReplay.test.tsx` - verifies stored postflop spots are rendered without calling replay-time analysis.
  - `src/analysis/postflopAnalyzer.ts` - translates remaining Portuguese-facing postflop notes to English.
  - `src/analysis/__tests__/postflopAnalyzer.test.ts` - rejects the Portuguese fragments found in the refresh report.
  - `docs/product/STATUS.md` - marks the finding fixed and refreshes verification/test counts.
  - `docs/product/ROADMAP.md` - marks HandReplay postflop consistency complete.
  - `docs/reports/2026-06-01-review-output-refresh.md` - records both P1 findings as resolved and updates the next batch.
  - `.agents/runs/2026-06-02-handreplay-postflop-consistency-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Closed the replay/import trust bug where HandReplay could recompute postflop analysis with a different pot basis than the importer and show different c-bet sizing feedback.
  - Kept backward compatibility for old decisions that do not have stored `postflopActions`.
  - Removed the Portuguese fragments in user-facing postflop analyzer notes and added a focused regression.
- Verification:
  - `npx.cmd vitest run src/analysis/__tests__/postflopAnalyzer.test.ts src/components/hands/__tests__/HandReplay.test.tsx src/analysis/__tests__/scenarioDetector.test.ts` - passed, 3 files / 64 tests.
  - `npm.cmd run docs:update` - updated generated test-call count in `docs/product/STATUS.md`.
  - `rg -n "Recomendado|correto|como PFR|em board|no turn|C-bet HU em" src\analysis\postflopAnalyzer.ts src\analysis\__tests__\postflopAnalyzer.test.ts src\components\hands\HandReplay.tsx src\components\hands\__tests__\HandReplay.test.tsx` - only matched the regression test regex.
  - `npm.cmd run typecheck:test` - passed.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd test` - sandboxed first run failed before startup with esbuild access denied reading Vite config; escalated rerun passed, 60 files / 627 tests.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-06-02-handreplay-postflop-consistency-evidence.md`.
- Risks / assumptions:
  - Stored postflop analysis is now treated as the source of truth for imported decisions. Old decisions without that field still use the legacy replay-time analyzer path.
  - Full Vitest still prints the existing `--localstorage-file` warning even though the suite passes.
- Next action requested:
  - Review and merge this focused fix, then move to the remaining review-refresh batch: bounty/fake-shove/resteal context surfacing, PWA icons, and exact dependency pinning.

## 2026-06-02 - Per-decision ICM compliance stage

- Owner / agent:          Codex
- Branch:                 codex/icm-compliance-stage
- Scope:                  Fix Advanced-profile range compliance recomputation so per-hand ICM stage is consumed by import/page compliance paths.
- Files touched:
  - `src/analysis/rangeChecker.ts` - uses `decision.icmStage ?? icmStage` for BB-vs-raise compliance.
  - `src/analysis/__tests__/rangeChecker.test.ts` - adds direct, batch, and percentage regressions for Advanced BB suited folds at bubble/final-table stages.
  - `docs/product/STATUS.md` - marks the ICM compliance finding fixed and refreshes verification/test counts.
  - `docs/product/ROADMAP.md` - marks per-decision ICM compliance complete.
  - `docs/reports/2026-06-01-review-output-refresh.md` - records the P1 finding as resolved and updates the recommended next batch.
  - `.agents/runs/2026-06-02-icm-compliance-stage-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Closed the active trust bug where Advanced-profile BB suited-fold compliance could be recomputed as early game even when each `HeroDecision` had a detected bubble, ITM, or final-table stage.
  - Kept Game Plan behavior unchanged: suited folds versus normal 2-3x opens are still deviations even under high ICM.
  - Added regression coverage proving single-decision, batch recomputation, and compliance-percentage paths consume per-decision ICM stage before using the fallback stage.
- Verification:
  - `npx.cmd vitest run src/analysis/__tests__/rangeChecker.test.ts` - passed, 1 file / 45 tests.
  - `npm.cmd run docs:update` - updated generated test-call count in `docs/product/STATUS.md`.
  - `npm.cmd run typecheck:test` - passed.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd test` - sandboxed first run failed before startup with esbuild access denied reading Vite config; escalated rerun passed, 60 files / 625 tests.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-06-02-icm-compliance-stage-evidence.md`.
- Risks / assumptions:
  - This is still a staged heuristic for Advanced BB defense, not a full ICM solver.
  - Full Vitest still prints the existing `--localstorage-file` warning even though the suite passes.
- Next action requested:
  - Review and merge this focused fix, then move to HandReplay postflop consistency and remaining postflop note translation.

## 2026-06-01 - Antigravity worktree integration review

- Owner / agent:          Codex
- Branch:                 codex/antigravity-worktree-integration-2026-06-01
- Scope:                  Review `C:\Users\MICRO\Downloads\poker-agent-worktrees`, port only still-useful work into the actual repo, and avoid stale branch docs/status edits.
- Files touched:
  - `src/components/dashboard/__tests__/TrendChart.test.tsx` - new `TrendChart` empty/data smoke coverage with a Recharts mock.
  - `src/components/hands/__tests__/HandReplay.test.tsx` - new async modal/store interaction smoke coverage.
  - `src/components/shared/__tests__/DualRangeMatrix.test.tsx` - new matrix selection and deviation callback smoke coverage.
  - `docs/product/STATUS.md` - regenerated test inventory after adding component tests.
  - `.agents/runs/2026-06-01-antigravity-worktree-integration-evidence.md` - local verification notes.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Reviewed Antigravity worktrees `task-2026-05-30-002` through `009` and `task-2026-06-01-010` / `011`.
  - Rejected stale/superseded work from `010` because current `main` already has a stronger `tsconfig.test.json`.
  - Rejected staged `007` changes because current `main` already has stronger `HandsUpload` worker cleanup and safer OHH JSON detection than the regex-only draft.
  - Accepted `011` UI smoke-test coverage with cleanup: updated stale `TrendChart` fixture fields, removed branch-specific docs edits, stabilized async `HandReplay` tests, and regenerated status from the current repo state.
- Verification:
  - `npx.cmd vitest run src/components/dashboard/__tests__/TrendChart.test.tsx src/components/hands/__tests__/HandReplay.test.tsx src/components/shared/__tests__/DualRangeMatrix.test.tsx` - passed, 3 files / 11 tests.
  - `npm.cmd run typecheck:test` - passed.
  - `npm.cmd run docs:update` - updated `docs/product/STATUS.md`.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd test` - sandboxed first run failed before startup with esbuild access denied reading Vite config; escalated rerun passed, 60 files / 620 tests.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-06-01-antigravity-worktree-integration-evidence.md`.
- Risks / assumptions:
  - The accepted tests are smoke coverage for component rendering and interaction; they do not replace visual browser QA.
  - Full Vitest still prints the existing `--localstorage-file` warning even though the suite passes.
  - Antigravity's branch-specific `STATUS.md` verification header was intentionally not copied.
- Next action requested:
  - Review the scoped test additions, then commit and open a PR if the smoke coverage is acceptable.

## 2026-06-01 - Review-output refresh and current codebase audit

- Owner / agent:          Codex
- Branch:                 codex/review-output-refresh-2026-06-01
- Scope:                  Read `C:\Users\MICRO\poker-review-output`, verify its reports against current source/docs, update current research/docs only.
- Files touched:
  - `docs/reports/2026-06-01-review-output-refresh.md` - new refreshed status report for the May 24 review-output findings.
  - `docs/product/STATUS.md` - updated verification header, marked villain position-stat persistence fixed, and replaced stale open follow-up text.
  - `docs/product/ROADMAP.md` - marked villain position-stat persistence complete and added ICM compliance/UI surfacing follow-ups.
  - `CLAUDE.md` - narrowed the Bounty/FT feature claim and corrected the stale sidebar route list.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Confirmed PRs #27-#34 made the highest-priority May 24 findings stale: range position filtering, MP RFI coverage, suited-gapper category, c-bet guards, OHH detection, worker cleanup, villain stats persistence, advanced analyzer context attachment, and test hygiene are now landed.
  - Added a refreshed report with current active findings: per-hand ICM stage not consumed by compliance recomputation, HandReplay postflop recomputation/pot mismatch, remaining Portuguese postflop note strings, partial bounty/FT UI surfacing, missing PWA assets, caret-ranged `poker-odds-calculator`, and a small HandsPage test-hygiene smell.
  - Did not edit product runtime code; this pass is a docs/research update and review.
- Verification:
  - `npx.cmd vitest run src/analysis/__tests__/rangeChecker.test.ts src/analysis/__tests__/scenarioDetector.test.ts src/analysis/__tests__/postflopAnalyzer.test.ts src/data/__tests__/store.test.ts src/parser/__tests__/siteIdentifier.test.ts src/parser/__tests__/uploadSizeGuards.test.ts` - passed, 6 files / 122 tests.
  - `npm.cmd test` - sandboxed first run failed before startup with esbuild access denied reading Vite config; escalated rerun passed, 57 files / 609 tests.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run typecheck:test` - passed.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd run build` - passed.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-06-01-review-output-refresh-evidence.md`.
- Risks / assumptions:
  - `C:\Users\MICRO\poker-review-output` was read but not modified because it is outside the repo writable scope; the refreshed report lives in repo docs.
  - Remaining P1 findings are documented, not fixed, and should become focused implementation tasks.
  - `npm test` still prints existing `--localstorage-file` warnings even though the suite passes.
- Next action requested:
  - Review the refreshed report, then implement the first focused fix batch: per-decision ICM compliance, HandReplay postflop reuse/pot consistency, and postflop note translation.

## 2026-05-31 - Test runner isolation and test typecheck

- Owner / agent:          Codex
- Branch:                 task/test-hygiene
- Scope:                  Test runner hygiene, coverage configuration, and TypeScript coverage for test files. Scheduler allowed `package.json`, `vite.config.ts`, and `tsconfig.test.json`; validation also required the lockfile, generated status docs, and three small test type fixes.
- Files touched:
  - `package.json` - removed `--isolate=false`, added `test:coverage`, added `typecheck:test`, and added `@vitest/coverage-v8` plus `@types/node` dev dependencies.
  - `package-lock.json` - locked the new dev dependencies.
  - `vite.config.ts` - configured V8 coverage reporting with a 70% global line threshold over tested runtime `src` files.
  - `tsconfig.test.json` - added a dedicated test-file TypeScript config.
  - `src/analysis/__tests__/proofHandSelector.test.ts` - removed a duplicate `handId` object literal overwrite that blocked test typechecking.
  - `src/components/career/__tests__/LifetimeScorecard.test.tsx` - updated the mock `HeroDecision` to match the real interface.
  - `src/data/__tests__/demoSeedProgress.test.ts` - guarded the mock call access under `noUncheckedIndexedAccess`.
  - `docs/product/STATUS.md` - regenerated dependency status after package changes.
- Summary:
  - `npm test` now runs Vitest in its isolated default worker mode instead of forcing shared isolation off.
  - Added a `typecheck:test` gate so test files are compiled separately from the production `tsconfig.json`.
  - Added V8 coverage support and a passing 70% line threshold for runtime source files reached by the test suite.
- Verification:
  - `npm.cmd run typecheck:test` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd test` - passed, 56 files / 596 tests.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - passed after `npm.cmd run docs:update`.
  - `npm.cmd run test:coverage` - first run proved provider wiring but failed at 41.81% lines when counting untested scripts/pages/type-only files; after narrowing collection to tested runtime `src` files, passed at 89.38% lines.
  - `git diff --check` - passed.
- Risks / assumptions:
  - Coverage threshold is not a whole-repo all-files quality gate yet; untested scripts/pages still need their own coverage plan before enabling `all: true`.
  - Scheduler `allowed_files` omits required `package-lock.json`, generated docs/handoff updates, and test fixture type fixes, so strict task completion should be handled as `needs_human` unless the board metadata is expanded.
  - Vitest still prints existing `--localstorage-file` warnings during full and coverage runs.
- Next action requested:
  - Review the PR, then either accept the expanded file scope or update the local task board metadata before marking the scheduler task fully completed.

## 2026-05-31 - Advanced analyzer import pipeline wiring

- Owner / agent:          Codex
- Branch:                 task/connect-advanced-analyzers
- Scope:                  `src/types/analysis.ts`, `src/analysis/scenarioDetector.ts`, `src/parser/workerProcessor.ts`, `src/data/store.ts`, and focused scenario detector tests.
- Files touched:
  - `src/types/analysis.ts` - adds optional `bountyContext`, `fakeShoveSpot`, and `restealSpot` fields to `HeroDecision`.
  - `src/analysis/scenarioDetector.ts` - attaches bounty, fake-shove, and resteal analyzer outputs while building import-pipeline hero decisions.
  - `src/analysis/__tests__/scenarioDetector.test.ts` - adds regressions for PKO bounty context, FT fake shove, and FT resteal context.
  - `docs/product/STATUS.md` - regenerated test-count metadata.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Connected existing `bountyAnalyzer` and `finalTableAnalyzer` outputs to the `HeroDecision` records created by `buildHeroDecision`.
  - Preserved the existing `squeezeSpot` pipeline wiring and added tests that prove all advanced contexts are attached before persistence.
  - Left Dexie schema/indexes unchanged because the new fields are non-indexed object payloads on existing `heroDecisions` rows.
- Verification:
  - `npx.cmd vitest run src/analysis/__tests__/scenarioDetector.test.ts` - passed, 28 tests.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd test` - passed outside sandbox after the known esbuild filesystem denial, 56 files / 599 tests.
  - `npm.cmd run build` - passed.
  - `npm.cmd run docs:check` - passed after `npm.cmd run docs:update`.
  - `git diff --check` - passed.
  - Local evidence summary: `.agents/runs/2026-05-31-advanced-analyzers-evidence.md`.
- Risks / assumptions:
  - Bounty context uses hand-history tournament labels/buy-in and a primary-villain heuristic; companion tournament summaries can still refine tournament rows after import, but do not retroactively recompute existing decisions.
  - Final-table contexts are gated to `icmStage === 'final_table'` to avoid early-stage fake-shove/resteal false positives.
  - Scheduler `complete` should not be forced while task `allowed_files` omits required generated docs/handoff updates; mark/review the board state after PR review.
- Next action requested:
  - Review the branch/PR. If accepted, reconcile task board completion with the required docs files.

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
