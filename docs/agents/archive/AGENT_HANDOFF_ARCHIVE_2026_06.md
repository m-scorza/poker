# Agent Handoff Archive - 2026-06

Archived from active docs/agents/AGENT_HANDOFF.md on 2026-06-06 to keep the active baton under the kernel context budget.

## 2026-06-30 - Study route no-actionable smoke

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Local Study Queue route-contract smoke extension plus research/status/handoff docs. No cron edits, Git mutations, login/account/payment/upload actions, trainer-answer submission, solver-frequency extraction, raw private content, raw hand histories, villain-name export, tokenized URLs, or secrets.
- Files touched:          `src/__tests__/studyQueueRouteContract.test.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-30-local-study-loop-manual-qa.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`; ignored logs `.agents/runs/2026-06-30-cdp-readiness-no-actionable-route.log`, `.agents/runs/2026-06-30-study-route-no-actionable-focused.log`, `.agents/runs/2026-06-30-study-route-no-actionable-verify.log`.
- Summary:                Inspected repo state, protocols/board/handoff, `CLAUDE.md`, status/research ledgers, local Study Queue route tests, and sanitized Chrome CDP. GTO Wizard `/solutions` remained read-only inspectable for workflow selector counts; RegLife and PokerTrainer tabs timed out, so no private DOM extraction or account/trainer interaction was attempted. Added a route-contract regression for the future-SRS no-actionable state: Dashboard withholds packet Hand Replay/Arena CTAs, keeps Data Health reachable, and Coach falls back to generic `/arena` when no packet is due/untouched. Recorded `S-INT-CODE-015` / `C-UX-STUDY-007` and ran `npm run docs:update` for the test-count inventory.
- Verification:           Focused test log: `npx vitest run src/__tests__/studyQueueRouteContract.test.tsx --reporter=verbose` passed (4 tests). Combined log `.agents/runs/2026-06-30-study-route-no-actionable-verify.log`: route-focused Vitest passed (3 files / 19 tests); `npm run typecheck:test -- --pretty false`, `npx tsc -b --pretty false`, `npm run docs:check`, `git diff --check`, and `npm run build` passed. Final log `.agents/runs/2026-06-30-study-route-no-actionable-final.log`: active handoff stayed under 5KB; `npm run docs:check`, `git diff --check`, and agentKernel Vitest passed (5 tests).
- Risks / assumptions:    Broad pre-existing dirty/untracked Study Queue/SpotPacket/refusal/import/research work remains preserved. This is Vitest/jsdom route-contract coverage, not a real-browser E2E visual pass. GTO Wizard evidence remains private/tool workflow abstraction only; RegLife/PokerTrainer were not responsive to read-only CDP this tick.
- Next action requested:  Continue with a skeptical privacy/IP/copy review of the current dirty Study Queue/SpotPacket diff before adding more product surface, or run a true local/demo browser smoke once a runner is selected. Retry RegLife/PokerTrainer read-only CDP only if existing authenticated tabs respond; keep solver-backed, rule/proxy, and study-packet-only labels separated.

## 2026-06-30 - Study Queue no-actionable routing QA

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Skeptical local Study Queue / SpotPacket route review slice. No cron edits, Git mutations, login/account/payment/upload actions, trainer-answer submission, solver-frequency extraction, raw private content, raw hand histories, villain-name export, tokenized URLs, or secrets.
- Files touched:          `src/analysis/studyPacketProgress.ts`, `src/analysis/__tests__/studyPacketProgress.test.ts`, `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `src/pages/CoachsNotePage.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`; ignored verification log `.agents/runs/2026-06-30-study-no-actionable-routing-verify.log`.
- Summary:                Inspected git status/stat, protocols/board/handoff, CLAUDE/status/research ledgers, Study Queue/Coach route code/tests, and sanitized Chrome CDP tab inventory. Chrome CDP was reachable and listed existing RegLife, PokerTrainer, and GTO Wizard tabs; this tick did not extract private DOM content or interact with login/payment/upload/trainer flows. Added `selectNextActionableStudyPacket` so Dashboard/Coach packet CTAs only appear for due reviewed or untouched packets. Preserved `selectNextStudyPacket` as a fallback marker selector for drawer recovery controls, so all-snoozed/all-future-reviewed bundles now show a no-actionable cue and withhold Hand Replay/Arena packet CTAs while still letting the dashboard unsnooze/reset the selected skipped local marker. Recorded source/claim ledger rows `S-INT-CODE-014` / `C-UX-STUDY-006` and updated shipped-status copy.
- Verification:           Combined verification log `.agents/runs/2026-06-30-study-no-actionable-routing-verify.log`: focused Study Queue/Coach route Vitest passed (4 files / 26 tests); `npm run typecheck:test -- --pretty false`, `npx tsc -b --pretty false`, `npm run docs:check`, `git diff --check`, and `npm run build` passed. After final STATUS wording, `npm run docs:check` passed again. AgentKernel initially failed only on handoff size (7426 bytes); after archiving the prior baton, `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (5 tests).
- Risks / assumptions:    Broad pre-existing dirty/untracked Study Queue/SpotPacket/refusal/import/research work remains preserved. This slice changes the actionability gate for Dashboard/Coach CTAs, not Arena's behavior once a valid route is opened. Verification is Vitest/jsdom plus build/typecheck, not a real-browser E2E pass. GTO Wizard remains private/tool workflow evidence only; RegLife/PokerTrainer were only observed as sanitized tab titles this tick.
- Next action requested:  Continue the skeptical review lane with a local/demo route smoke for Dashboard Study Queue → Coach → Arena → Hand Replay using stable selectors, including the new no-actionable state plus Data Health fallback. Keep solver-backed, rule/proxy, and study-packet-only labels separated; retry private-site CDP DOM only if already-authenticated tabs are responsive and no login/account/payment/trainer-answer action is needed.

## 2026-06-30 - Study Queue SRS route QA fix

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Skeptical local Study Queue / SpotPacket route review slice. No cron edits, Git mutations, login/account/payment/upload actions, trainer-answer submission, solver-frequency extraction, raw private content, raw hand histories, villain-name export, tokenized URLs, or secrets.
- Files touched:          `src/analysis/studyPacketProgress.ts`, `src/analysis/__tests__/studyPacketProgress.test.ts`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`; ignored verification log `.agents/runs/2026-06-30-study-srs-route-qa-verify.log`.
- Summary:                Inspected git status/stat, protocols/board/handoff, product status, research ledgers/checklists, Study Queue/Arena/Coach/Hand Replay route code/tests, and sanitized Chrome CDP tab inventory. Chrome CDP was reachable and listed existing RegLife, PokerTrainer, and GTO Wizard tabs; this tick did not extract private DOM content or interact with login/payment/upload/trainer flows. Fixed a Study Queue SRS route edge found during review: multi-packet Arena sessions now include the selected packet plus due reviewed and untouched packets, but no longer pull already-reviewed packets forward before their future SRS due date. Added a regression in `studyPacketProgress.test.ts`, recorded source/claim ledger rows `S-INT-CODE-013` / `C-UX-STUDY-005`, ran `npm run docs:update`, and archived the prior active route-contract baton after agentKernel flagged the handoff-size budget.
- Verification:           `npx vitest run src/analysis/__tests__/studyPacketProgress.test.ts --reporter=verbose` passed (7 tests). Combined verification log `.agents/runs/2026-06-30-study-srs-route-qa-verify.log`: route-loop focused Vitest passed (5 files / 36 tests); `npm run typecheck:test -- --pretty false`, `npx tsc -b --pretty false`, `npm run docs:check`, `git diff --check`, and `npm run build` passed. Post-compaction final check passed: active handoff 4307 bytes, `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` (5 tests).
- Risks / assumptions:    Broad pre-existing dirty/untracked Study Queue/SpotPacket/refusal/import/research work remains preserved. The route fix is intentionally narrow and does not change the selected-packet fallback when no better packet exists; it only prevents future-due reviewed packets from being bundled into multi-packet Arena routes before SRS due. Verification is Vitest/jsdom plus build/typecheck, not a real-browser E2E pass. GTO Wizard remains private/tool workflow evidence only; RegLife/PokerTrainer were only observed as sanitized tab titles this tick.
- Next action requested:  Continue the skeptical review lane before adding product surface: inspect the all-snoozed/all-reviewed Study Queue edge and whether Dashboard/Coach should show no actionable packet versus selected fallback, then verify with local route tests. Keep solver-backed, rule/proxy, and study-packet-only labels separated; retry private-site CDP DOM only if already-authenticated tabs are responsive and no login/account/payment/trainer-answer action is needed.

## 2026-06-30 - Study Queue route contract smoke

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Small local route-contract verification slice for the existing Study Queue / SpotPacket / Arena / Hand Replay handoff. No cron, Git, login/account/payment, trainer-answer submission, solver-frequency, raw private content, raw hand-history, villain-name, tokenized-URL, or secret work.
- Files touched:          `src/__tests__/studyQueueRouteContract.test.tsx`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`; ignored verification log `.agents/runs/2026-06-30-study-queue-route-contract-verify.log`.
- Summary:                Inspected git status, protocols/board/handoff, `CLAUDE.md`, relevant Study Queue/SpotPacket/Arena/Hands tests and source, plus sanitized Chrome CDP inventory. GTO Wizard `/solutions` DOM stayed inspectable for generic route/workflow controls; RegLife lesson, RegLife PokerTrainer, and GTO login tabs timed out on read-only CDP. Added a Vitest/jsdom route-contract smoke that ties the dashboard StudyPlanCard, Coach's Note packet CTA, Arena study-queue route, Hand Replay review route, and Data Health importer fallback together while asserting review-only/no-score/no-EV/no-answer/privacy boundaries. Ran `npm run docs:update` because the new test file made autogenerated `STATUS.md` test inventory stale; archived the prior CDP baton to keep active handoff under the agent-kernel budget.
- Verification:           `npx vitest run src/__tests__/studyQueueRouteContract.test.tsx --reporter=verbose` passed (3 tests). `npm run typecheck:test -- --pretty false`, `npx tsc -b --pretty false`, `npm test` (77 files / 826 tests), `npm run docs:check`, `git diff --check`, `npm run build`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed. Verification log: `.agents/runs/2026-06-30-study-queue-route-contract-verify.log`.
- Risks / assumptions:    Broad pre-existing dirty/untracked Study Queue/SpotPacket/refusal/import/research work remains preserved. The new test is a local jsdom route contract with mocked HandReplay/upload/table internals; it verifies handoff URLs and safety copy/side effects, not a browser E2E render. GTO Wizard evidence remains private/tool workflow abstraction only; RegLife/PokerTrainer tabs were not responsive to read-only CDP this tick.
- Next action requested:  Next safe slice: perform a skeptical focused review of the current Study Queue / SpotPacket dirty diff for privacy/IP/copy regressions before adding more product surface; alternatively retry RegLife/PokerTrainer read-only CDP only if their existing authenticated tabs become responsive. Keep HRC/ICMIZER/GTO Wizard solver-backed labels separate from local study-packet-only routing.

## 2026-06-30 - CDP readiness and local smoke contract

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Docs-only source-governed research/QA slice: Chrome CDP readiness, research ledgers, local study-loop QA checklist, and handoff. No code, cron, Git mutation, login/account/payment/upload, trainer-answer, solver-frequency, raw hand-history, villain-name, screenshot, tokenized-URL, or secret work.
- Files touched:          `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-30-local-study-loop-manual-qa.md`, `docs/agents/AGENT_HANDOFF.md`; local-only logs/scripts under `.agents/runs/`.
- Summary:                Inspected repo status, protocols/board/handoff, `CLAUDE.md`, research ledgers/design notes, package test tooling, and sanitized Chrome CDP. Chrome CDP was reachable; direct page WebSocket and browser-level attach both confirmed GTO Wizard `/solutions` remains inspectable for workflow/config/state-control/testability abstractions, while RegLife lesson and PokerTrainer tabs timed out under both read-only strategies. Added `S-AUTH-GTOW-006` and `C-UX-STUDY-004`, then extended the local study-loop QA note with a self-contained smoke candidate that uses in-repo stable selectors/local-demo packets rather than depending on external private tabs.
- Verification:           CDP/readiness logs: `.agents/runs/2026-06-30-cdp-reglife-gtow-refresh.log` and `.agents/runs/2026-06-30-cdp-browser-attach-reglife-trainer.log`. First docs-only pass: `npm run docs:check` and `git diff --check` passed; agentKernel initially failed only because active handoff was 6013 bytes. After archiving the Arena baton, post-compaction logs passed: `npm run docs:check`, `git diff --check`, and agentKernel (5 tests) in `.agents/runs/2026-06-30-cdp-readiness-post-compaction-*`.
- Risks / assumptions:    Broad existing dirty/untracked Study Queue/SpotPacket/refusal/import/research work remains preserved. GTO Wizard evidence is private/tool workflow abstraction only, not public evidence or a license to copy solver ranges/frequencies/selectors. RegLife remains licensed-brand-neutral-use by user instruction, but the open RegLife/PokerTrainer tabs did not respond to read-only CDP this tick.
- Next action requested:  Next safe slice: implement the self-contained local route smoke as a Vitest/jsdom route-contract test first (no Playwright dependency is present), covering Dashboard/Coach/Arena/Hand Replay packet handoff, review-only/refusal behavior, Data Health fallback, and no-EV/no-answer/no-score/privacy assertions; alternatively retry RegLife/PokerTrainer only if their existing authenticated tabs become responsive.

## 2026-06-30 - Arena completion special-ID route QA

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Small Arena route-contract test/docs slice: `src/pages/__tests__/ArenaPage.test.tsx`, generated `docs/product/STATUS.md`, research ledgers/design note, handoff/archive. No cron/Git/account/payment/upload/trainer-answer work; no solver EV or raw hand/villain/path/token data.
- Files touched:          `src/pages/__tests__/ArenaPage.test.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-30-local-study-loop-manual-qa.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Summary:                Inspected repo state, protocols/board/handoff, `CLAUDE.md`, research ledgers/design notes, Arena route tests, and sanitized Chrome CDP. GTO Wizard `/solutions` read-only Runtime inspection succeeded with page-ready/selector metadata; RegLife, PokerTrainer, and GTO login targets timed out. Added an Arena regression proving a multi-packet Study Queue drill with comma/slash/space/non-ASCII hand+packet IDs completes both review-only prompts and keeps the final `Open last packet` Hand Replay link URL-encoded for the exact last reviewed hand. Added `S-INT-CODE-012` / `C-UX-STUDY-003` and updated the local study-loop QA note. Archived the previous Dashboard/Coach baton to restore the handoff budget.
- Verification:           `.agents/runs/2026-06-30-arena-completion-special-id-focused.log`: focused Arena Vitest passed (1 file / 12 tests). `.agents/runs/2026-06-30-arena-completion-special-id-docs-update.log`: `npm run docs:update` passed. Full logs passed: `npm test` (76 files / 823 tests), `npx tsc -b --pretty false`, `npm run build`, `npm run docs:check`, `git diff --check`. Post-compaction logs passed: `npm run docs:check`, `git diff --check`, and agentKernel (5 tests).
- Risks / assumptions:    Broad existing dirty/untracked Study Queue/SpotPacket/refusal/import/research work remains preserved. This test locks existing production encoding behavior rather than changing runtime logic. `docs:update` reflects the broader current uncommitted inventory, not only this tick. GTO evidence is private/tool workflow metadata only; RegLife/PokerTrainer still need a responsive authenticated tab for future DOM work.
- Next action requested:  Next safe slice: run local/demo visual QA for Dashboard Study Queue → Coach packet → Arena packet drill → completion → Hand Replay, including the completion `Open last packet` exit route. If code-only, convert the route loop into a browser/e2e smoke once a runner is chosen, or retry RegLife/PokerTrainer read-only sanitized inspection if tabs respond.

## 2026-06-30 - Dashboard/Coach packet CTA special-ID parity

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Route-contract test/docs slice for Dashboard and Coach packet CTAs with delimiter-sensitive IDs; no cron/Git/account/payment/upload/trainer-answer work.
- Files touched:          `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `src/pages/__tests__/CoachsNotePage.test.tsx`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Summary:                Added Dashboard and Coach regressions proving special/delimiter-sensitive packet hand IDs and packet IDs are URL-encoded consistently across Hand Replay and multi-packet Arena CTAs. Sanitized CDP reached GTO Wizard `/solutions`; RegLife/PokerTrainer/GTO login targets timed out, with no raw URLs/account data/screenshots/tokens retained.
- Verification:           `.agents/runs/2026-06-30-special-id-cta-parity-focused.log` passed for route-loop focused Vitest (4 files / 61 tests). `.agents/runs/2026-06-30-special-id-cta-parity-verification.log` passed for `npm run docs:update`, `npm test` (76 files / 822 tests), `npx tsc -b --pretty false`, `npm run build`, `npm run docs:check`, `git diff --check`, and agentKernel.
- Risks / assumptions:    Broad existing dirty/untracked Study Queue/SpotPacket/refusal/import/research work remained preserved. The slice locked existing route-building behavior and did not add solver EV, trainer answers/scores, raw hand text, villain names, local paths, or account data.
- Next action requested:  Continue with the remaining route-loop QA boundary: Arena completion exit route, local/demo visual QA, or RegLife/PokerTrainer read-only CDP only if existing authenticated tabs respond.

## 2026-06-30 - Hand Replay SpotPacket route special-ID guard

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Small route-contract test/docs slice for `src/pages/__tests__/HandsPage.test.ts`, generated `docs/product/STATUS.md`, handoff/archive compaction. No cron/Git/account/payment/upload/trainer-answer work, no private-site extraction, no solver EV, no raw hand text/villain/path/tokenized URL storage.
- Files touched:          `src/pages/__tests__/HandsPage.test.ts`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Summary:                Inspected repo state, current handoff/protocol/board docs, `CLAUDE.md`, `docs/product/STATUS.md`, research source/claim ledgers, Study Queue/Hands/Arena/Coach route tests, and sanitized Chrome CDP metadata. CDP was reachable; read-only sanitized DOM inspection succeeded on GTO Wizard Solutions selector/navigation metadata only, while RegLife/PokerTrainer/GTO login Runtime evaluation timed out again, so no new source-ledger row was added and no raw URLs/account text/screenshots/tokens were retained. Added a HandsPage route regression that opens the SpotPacket Hand Replay modal from `/hands?panel=spot-packet&reviewHand=...#spot-packet` when the encoded hand ID contains delimiter-sensitive/special characters (`comma`, slash, space, accented character), plus a parser-table case for the same encoded ID. `docs:update` refreshed generated status counts after the new test; archived the previous active baton to restore the handoff budget.
- Verification:           Final verification logged in `.agents/runs/2026-06-30-hands-special-review-route.log`: `npm run docs:update`, route-loop focused Vitest (`StudyPlanCard`, `CoachsNotePage`, `ArenaPage`, `HandsPage`: 4 files / 59 tests), `npx tsc -b --pretty false`, `npm run build`, `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed. Post-handoff final check in `.agents/runs/2026-06-30-hands-special-review-route-post-handoff-final.log` passed for `npm run docs:check`, `git diff --check`, and agentKernel (5 tests) after archive compaction.
- Risks / assumptions:    Broad existing dirty/untracked work from earlier Study Queue/SpotPacket/refusal/import/research slices remains preserved; this run only added the HandsPage route-contract regression and generated docs count update. The new test mocks child surfaces to isolate the route-open contract and does not alter production route parsing. GTO Wizard evidence remains private/tool workflow metadata only; RegLife/PokerTrainer tabs still need a responsive authenticated tab for future DOM work.
- Next action requested:  Next safe slice: automate the remaining dashboard/coach/manual-QA boundary by asserting packet CTA parity from Dashboard/Coach into Arena and Hand Replay with special-character IDs, or, if CDP tabs respond, retry RegLife/PokerTrainer read-only sanitized inspection without submitting trainer answers.

## 2026-06-30 - Study Queue Arena route encoding guard

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Small code/test slice for Study Queue Arena route parsing plus generated/process docs: `src/pages/ArenaPage.tsx`, `src/pages/__tests__/ArenaPage.test.tsx`, `docs/product/STATUS.md`, handoff/archive. No cron/Git/account/payment/upload/trainer-answer work, no private-site extraction, no solver EV, no raw hand text/villain/path/tokenized URL storage.
- Files touched:          `src/pages/ArenaPage.tsx`, `src/pages/__tests__/ArenaPage.test.tsx`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Summary:                Inspected repo state, current handoff/protocol/board docs, `CLAUDE.md`, research ledgers, Study Queue/Arena route code/tests, and sanitized Chrome CDP metadata. Read-only CDP DOM smoke succeeded on GTO Wizard (`ready=complete`, selector/count metadata only); RegLife and PokerTrainer Runtime evaluation timed out, and no raw URLs/account text/screenshots were retained. Implemented raw-query parsing for Study Queue Arena list params so encoded delimiter-sensitive hand IDs such as `%2C` are split after list delimiters, not after URLSearchParams has decoded commas. Added a regression that builds a route via `buildStudyPacketArenaPathFromIds`, opens Arena, and verifies the first comma-containing hand ID auto-starts in the intended multi-packet order. Ran `docs:update` for the source-derived status inventory and archived the previous baton to restore the handoff budget.
- Verification:           Final verification logged in `.agents/runs/2026-06-30-study-queue-route-encoding.log`: `npm run docs:update`, focused StudyPacket/Arena tests (2 files / 17 tests), `npx tsc -b --pretty false`, `npm run build`, `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed.
- Risks / assumptions:    Broad existing dirty/untracked work from earlier Study Queue/SpotPacket/refusal/import/research slices remains preserved; this run only changed the Arena route parser/test inside that existing work. `packetIds` are decoded by the same safe parser but remain reserved for future packet-level progress mapping. GTO Wizard evidence is private/tool workflow metadata only. RegLife/PokerTrainer tabs timed out in read-only Runtime evaluation; no account data, screenshots, uploads, trainer answers, raw hand text, solver EV, local paths, or tokenized URLs were retained.
- Next action requested:  If continuing code-only, automate the next manual QA contract boundary: Dashboard/Coach packet CTA parity or Hand Replay `spot-source-panel` route opening with special-character `reviewHand` IDs. If using CDP, retry RegLife/PokerTrainer read-only inspection only when authenticated tabs respond; do not submit trainer answers.

## 2026-06-30 - Local study loop manual QA checklist

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Docs/research-only QA contract slice: new local study-loop manual QA note, design index, source/claim ledgers, and this handoff/archive. No cron/Git/account/payment/upload/trainer-answer work, no source-code behavior change, no solver EV, no raw hand text/villains/paths/screenshots/tokenized URLs.
- Files touched:          `docs/research/design/2026-06-30-local-study-loop-manual-qa.md`, `docs/research/design/README.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Summary:                Inspected repo state, handoff/protocol/board docs, `CLAUDE.md`, `STATUS.md`, ledgers, current Study Queue/Coach/Arena/Hand Replay selectors/tests, and Chrome CDP. GTO Wizard `/solutions` read-only Runtime inspection succeeded and confirmed stable selector families around workflow nav, source/config, reset/save/practice, action tree, and action cards. RegLife lesson/PokerTrainer/GTO login Runtime calls timed out, so no private extraction/login/account/payment/upload/trainer-answer action was attempted. Added a source-governed manual QA checklist for Dashboard Study Queue → Coach packet → Arena packet drill → Hand Replay, plus `S-AUTH-GTOW-005`, `S-INT-CODE-011`, and `C-UX-STUDY-002`. Archived the two older active handoff entries to restore the kernel budget.
- Verification:           Final docs-only verification logged in `.agents/runs/2026-06-30-local-study-loop-manual-qa.log`: after compaction, `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed. The first agentKernel attempt failed only on active-handoff size before the archive compaction.
- Risks / assumptions:    Broad existing dirty/untracked work from earlier Study Queue/SpotPacket/refusal/import slices remains preserved. GTO evidence is user-authorized private/tool workflow abstraction only; RegLife remains user-authorized licensed-private/brand-neutral-use only. No source-code behavior, raw tokenized URLs, account details, trainer answers, solver EV, raw hand text, villain names, local paths, or credentials were committed.
- Next action requested:  Run the new manual route-contract checklist against local/demo data if visual QA is available, or automate the highest-value subset once a browser runner is chosen. If staying code-only, the safest small candidates are special-character route parsing coverage in the Study Queue Arena path or a stable selector for the top Study Queue CTA. Retry RegLife/PokerTrainer CDP only if authenticated tabs become responsive; do not submit trainer answers.

## 2026-06-30 - Coach final drill CTA selector QA

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Small Coach/Arena route QA slice only: `src/pages/CoachsNotePage.tsx`, `src/pages/__tests__/CoachsNotePage.test.tsx`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-30-study-loop-selector-state-qa.md`, and handoff.
- Files touched:          `src/pages/CoachsNotePage.tsx`, `src/pages/__tests__/CoachsNotePage.test.tsx`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-30-study-loop-selector-state-qa.md`, `docs/agents/AGENT_HANDOFF.md`.
- Summary:                Added `data-testid="coachs-note-final-drill-link"` to the final Coach drill CTA and focused tests distinguishing generic `/arena` fallback from single-/multi-packet Arena routes, preserving no-EV/no-answer/no-score claims. CDP tab inventory was reachable, but RegLife/PokerTrainer private DOM extraction was not attempted.
- Verification:           Focused Coach tests passed; final logged verification in `.agents/runs/2026-06-30-coach-final-drill-selector.log` passed for Coach tests, `npx tsc -b --pretty false`, `npm run build`, `npm run docs:check`, and `git diff --check`.
- Risks / assumptions:    Existing broad dirty work remained preserved. GTO evidence is private/tool workflow abstraction only; RegLife remains licensed-private brand-neutral-use. No raw hand text, villain names, local paths, account data, trainer answers, solver EV, or credentials were committed.
- Next action requested:  Next safe slice was the local demo/manual QA checklist for `Dashboard Study Queue -> Coach packet -> Arena packet drill -> Hand Replay`, or retry read-only RegLife/PokerTrainer CDP only if responsive.

## 2026-06-30 - Study loop selector/state QA research

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Docs/research-only CDP/state QA slice for the Study Queue/Coach/Arena loop.
- Files touched:          `docs/research/design/2026-06-30-study-loop-selector-state-qa.md`, `docs/research/design/README.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Summary:                Added a source-governed Study Loop selector/state QA note plus `S-AUTH-GTOW-004` / `C-PB-GTOW-004`. GTO Wizard `/solutions` read-only CDP inspection confirmed source/config-first workflow, adjacent Study/Practice/Analyze/Upload navigation, reset/history/saved/practice controls, strategy/range/breakdown/report tabs, and stable selectors. RegLife and PokerTrainer tabs timed out; no private extraction or trainer-answer action was attempted.
- Verification:           `.agents/runs/2026-06-30-study-loop-selector-state-qa.log`: `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed.
- Risks / assumptions:    Existing broad dirty work remained preserved. GTO evidence is user-authorized private/tool abstraction only; no raw tokenized URLs, account details, screenshots, trainer answers, solver EV, raw hand text, villain names, local paths, or credentials were committed.
- Next action requested:  Implement the tiny stable-selector QA gap or retry RegLife/PokerTrainer read-only CDP only if existing authenticated tabs become responsive.

## 2026-06-30 - Coach empty/all-clear coverage

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Act II coach-loop reliability test slice: cover `/coach` loading, insufficient-data, and all-clear states around the existing Study Queue packet panel; no runtime behavior change, no cron/Git/account/payment/trainer-answer work, no solver EV, and no grading/range logic changes.
- Files touched:          `src/pages/__tests__/CoachsNotePage.test.tsx`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, `.agents/runs/2026-06-30-coach-empty-state-coverage.log`.
- Summary:                Inspected the dirty worktree, current handoff/protocols/board, `CLAUDE.md`, `STATUS.md`, source/claim ledgers, Coach code/tests, and Chrome CDP. CDP was reachable: GTO Wizard `/solutions` responded to read-only inspection with Study/Practice/Analyze/Upload workflow and stable selector evidence; Reg Life lesson, PokerTrainer, and GTO login targets timed out at `Runtime.enable`, so no private-page extraction, login/account/payment, upload, or trainer-answer action was attempted. Added component coverage proving `/coach` renders the loading state, insufficient-data import CTA, and all-clear state without creating a Study Queue packet panel or drill-packet link. `docs:update` refreshed the source-derived test-call inventory from 776 to 779. Archived the prior active baton to keep `AGENT_HANDOFF.md` under the kernel budget.
- Verification:           Logged in `.agents/runs/2026-06-30-coach-empty-state-coverage.log`: `npm run docs:update` passed and updated `docs/product/STATUS.md`; `npx vitest run src/pages/__tests__/CoachsNotePage.test.tsx --reporter=verbose` passed (1 file, 7 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; `npm run docs:check` passed; `git diff --check` passed; `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (1 file, 5 tests).
- Risks / assumptions:    Broad existing dirty/untracked work from prior Study Queue/SpotPacket/refusal slices remains preserved. This slice only adds tests plus generated/process docs; it does not alter runtime behavior or store raw hand text, villain names, local paths, credentials, account data, tokenized URLs, trainer answers/scores, or solver EV. One transient CDP terminal print included visible GTO Wizard page text; it was not committed or copied into docs/ledgers.
- Next action requested:  Continue with a bounded Coach/Arena reliability slice: either add a small visual/manual QA pass for `/coach` with real local demo data, or inspect Reg Life/PokerTrainer again if CDP Runtime becomes responsive and convert only safe licensed/private workflow abstractions into ledgers/tests. Keep all-in, ICM, bounty, and unsupported reaction spots review-only until solver/range validation exists.

## 2026-06-30 - Coach packet fallback coverage

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Act II coach-loop reliability test slice: cover Coach's Note behavior when no Study Queue packet is selectable and when packet hand IDs need URL encoding; no cron/Git/account/payment/trainer-answer work, no solver EV, no grading/range logic changes.
- Files touched:          `src/pages/__tests__/CoachsNotePage.test.tsx`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, `.agents/runs/2026-06-30-coach-packet-fallback-coverage.log`.
- Summary:                Inspected the existing dirty worktree, active handoff, protocols, board, `CLAUDE.md`, `STATUS.md`, source/claim ledgers, and Chrome CDP. CDP was reachable; the GTO Wizard `/solutions` tab exposed sanitized Study/Practice/Analyze/Upload nav plus stable `data-tst` selectors, while the Reg Life lesson and PokerTrainer tabs were present but `Runtime.enable` timed out in the read-only smoke. Extended `CoachsNotePage` coverage so the focus note omits the Study Queue packet panel and falls back to `/arena` when no selected packet exists, and so packet review links encode hand IDs containing spaces/slashes/non-ASCII. Regenerated status docs, raising the approximate test-call inventory from 774 to 776; archived the prior active baton to stay under the handoff budget.
- Verification:           Logged in `.agents/runs/2026-06-30-coach-packet-fallback-coverage.log`: `npx vitest run src/pages/__tests__/CoachsNotePage.test.tsx --reporter=verbose` passed (1 file, 4 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; `npm run docs:check` passed; `git diff --check` passed. `npm run docs:update` was run before final verification and updated `docs/product/STATUS.md`. Post-handoff `agentKernel` first failed only on active-handoff size, so the previous baton was archived; final `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (1 file, 5 tests).
- Risks / assumptions:    Broad existing dirty/untracked work from prior Study Queue/SpotPacket/refusal slices remains preserved. This run changed only Coach tests plus generated/process docs; it did not change runtime behavior. No raw hand text, villain names, local paths, credentials, account data, tokenized URLs, trainer answers/scores, or solver EV were stored.
- Next action requested:  Continue with a bounded Coach/Arena reliability slice: add `/coach` empty/loading/insufficient-data rendering coverage or inspect the Reg Life/PokerTrainer tabs again if CDP Runtime becomes responsive, then translate only safe licensed/private workflow abstractions into source-ledger claims or tests.

## 2026-06-30 - Shared Study Queue Arena router helper

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Act II coach-loop architecture polish: centralize Study Queue packet-to-Arena route/session ordering already used by Dashboard and Coach; no cron/Git/account/payment/trainer-answer work, solver EV, public sharing, or new grading.
- Files touched:          `src/analysis/studyPacketProgress.ts`, `src/analysis/__tests__/studyPacketProgress.test.ts`, `src/components/dashboard/StudyPlanCard.tsx`, `src/pages/CoachsNotePage.tsx`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-30-shared-study-packet-arena-router.log`, `.agents/runs/cdp_sanitized_inspect.mjs`.
- Summary:                Inspected current dirty worktree/handoff/protocols/board, `CLAUDE.md`, `STATUS.md`, research source/claim ledgers, and sanitized Chrome CDP tabs. CDP was reachable; GTO Wizard `/solutions` DOM inspection succeeded with sanitized Study/Practice/Analyze/Upload nav and stable selector evidence, while Reg Life/PokerTrainer/GTO login Runtime.enable timed out in the read-only smoke. Extracted the duplicated Study Queue Arena session ordering/query builder into shared `studyPacketProgress` helpers so Dashboard and Coach use one due/untouched/snoozed route policy. Extended existing helper coverage for ordered route construction and encoded hand/packet IDs without adding a new test-count entry.
- Verification:           `npx vitest run src/analysis/__tests__/studyPacketProgress.test.ts src/components/dashboard/__tests__/StudyPlanCard.test.tsx src/pages/__tests__/CoachsNotePage.test.tsx --reporter=verbose` passed (3 files, 13 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; `git diff --check` and `npm run docs:check` passed before and after handoff compaction; post-compaction `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed. Verification summary saved in `.agents/runs/2026-06-30-shared-study-packet-arena-router.log`.
- Risks / assumptions:    Broad existing dirty/untracked work from prior Study Queue/SpotPacket/refusal slices remains preserved. The shared helper intentionally preserves the selected packet first, skips snoozed packets for follow-on route ordering, and only emits multi-packet `handIds`/`packetIds` query metadata when more than one actionable packet remains. No raw hand text, villain names, local paths, credentials, account data, tokenized URLs, trainer answers/scores, or solver EV were stored.
- Next action requested:  Continue with a bounded Coach/Arena reliability slice: add Coach empty/missing-packet state coverage or extract the remaining packet review path/source-label formatting into a shared helper if another surface starts duplicating it. Keep all-in, ICM, bounty, and unsupported reaction spots review-only until solver/range validation exists.

## 2026-06-30 - Coach's Note multi-packet Arena route

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Act II coach-loop route continuity slice: preserve Study Queue ordered multi-packet Arena drill routes from `/coach`; no cron/Git/account/payment/trainer-answer work, solver EV, public sharing, or new grading.
- Files touched:          `src/analysis/coachsNote.ts`, `src/pages/CoachsNotePage.tsx`, `src/pages/__tests__/CoachsNotePage.test.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, `.agents/runs/2026-06-30-coachs-note-multipacket-route.log`.
- Summary:                Inspected git/worktree state, current handoff/protocols/board, `CLAUDE.md`, `STATUS.md`, source/claims ledgers, Coach/Arena/Study Queue implementation/tests, and sanitized CDP tab inventory (Chrome reachable; relevant Reg Life, PokerTrainer, and GTO Wizard tabs present; no tokenized URLs or account data retained). Extended `CoachStudyPacketFocus` with optional ordered Arena session hand/packet IDs, had `/coach` compute the same selected/due/untouched actionable packet order used by the dashboard, and updated both Coach-to-Arena links to carry `handIds`/`packetIds` when more than one local packet remains. Added component coverage for the multi-packet route and updated shipped-state/source-governed docs.
- Verification:           `npx vitest run src/pages/__tests__/CoachsNotePage.test.tsx --reporter=verbose` passed (1 file, 2 tests); `npx tsc -b --pretty false` passed; `npm run docs:update` refreshed `STATUS.md`; `npm run build` passed; `npm run docs:check` passed; `git diff --check` passed before handoff. Post-handoff agentKernel first failed only on active-handoff size, so the previous baton was archived; post-compaction `git diff --check`, `npm run docs:check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed. Verification summary saved in `.agents/runs/2026-06-30-coachs-note-multipacket-route.log`.
- Risks / assumptions:    Broad existing dirty/untracked work from prior Study Queue/SpotPacket/refusal slices remains preserved. This slice only changes local route metadata and tests; it does not store answers, trainer scores, solver EV, raw hand text, local paths, villain names, credentials, or private-site tokens. Coach route ordering duplicates the dashboard's current packet-ordering policy rather than extracting a shared helper; consider consolidating later if more surfaces need it.
- Next action requested:  Continue with a bounded Coach/Arena polish slice: add an empty/missing-packet Coach state test or extract the duplicated Study Queue Arena session ordering helper into a shared module with dashboard + coach coverage. Keep all-in, ICM, bounty, and unsupported reaction spots review-only until solver/range validation exists.

## 2026-06-30 - Coach's Note packet panel component coverage

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Act II coach-loop verification slice: component coverage for the Coach's Note selected Study Queue packet panel, plus minimal test-type fixes needed by verification; no cron/Git/account/payment/trainer-answer work, solver EV, or new grading.
- Files touched:          `src/pages/__tests__/CoachsNotePage.test.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `src/components/hands/__tests__/SpotSourcePanel.test.tsx`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-30-coachs-note-page-packet-*.log`.
- Summary:                Inspected repo state, board/protocols/handoff/status, research ledgers, Coach's Note code, existing Study Queue/SpotPacket tests, and sanitized CDP tab inventory. Added a focused `CoachsNotePage` component test that renders the new Study Queue packet panel, verifies study-only/no-EV/no-score boundary copy, source/confidence/caveat counts, and exact Hand Replay/Arena packet links. While running `npm run typecheck:test`, fixed existing Object URL mock typings in `StudyPlanCard` and `SpotSourcePanel` tests so the current test inventory typechecks cleanly.
- Verification:           `npx vitest run src/pages/__tests__/CoachsNotePage.test.tsx --reporter=verbose` passed (1 file, 1 test); `npm run docs:update` updated source-derived counts; `npx tsc -b --pretty false`, `npm run build`, and `npm run docs:check` passed; initial `npm run typecheck:test` exposed only the existing Object URL mock typing gaps, then rerun passed after the test-mock fix; focused rerun `npx vitest run src/pages/__tests__/CoachsNotePage.test.tsx src/components/dashboard/__tests__/StudyPlanCard.test.tsx src/components/hands/__tests__/SpotSourcePanel.test.tsx --reporter=verbose` passed (3 files, 11 tests); `git diff --check` passed before handoff. Post-handoff agentKernel first failed only on active-handoff size, so the prior baton was archived; post-compaction `git diff --check` and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed.
- Risks / assumptions:    Existing broad dirty/untracked work remains preserved and includes prior Study Queue/SpotPacket implementation slices. The new test uses mocked local `CoachsNote` data only; it does not touch IndexedDB, credentials, private-site state, trainer answers, solver EV, raw hand histories, local paths, or villain names.
- Next action requested:  Continue with a small source-aware Coach/Arena polish slice: either add multi-packet Coach-to-Arena route coverage or add a user-visible empty-state/caveat test for when no local `SpotPacket` can be built. Keep exact all-in, ICM, bounty, and 3-bet-defense grading gated behind solver/range validation.

## 2026-06-30 - Coach's Note Study Queue packet focus

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Act II coach-loop slice: reuse the local Study Queue SpotPacket/SRS selector in Coach's Note; no cron/Git/account/payment/trainer-answer work, solver EV, or new grading.
- Files touched:          `src/analysis/studyPacketProgress.ts`, `src/components/dashboard/StudyPlanCard.tsx`, `src/analysis/coachsNote.ts`, `src/pages/CoachsNotePage.tsx`, focused tests, `docs/product/STATUS.md`, research ledgers, handoff/archive, `.agents/runs/2026-06-30-coachs-note-study-packet-*.log`.
- Summary:                Inspected repo state, handoff/protocol/board/status, Coach/Study Queue/Arena code, ledgers, and sanitized CDP. CDP reached RegLife/PokerTrainer/GTO Wizard targets; only GTO Wizard Solutions returned sanitized DOM counts/selectors. Added shared `selectNextStudyPacket()` due/untouched/snoozed routing. `/coach` now builds the sanitized Study Queue `SpotPacket` bundle from local parsed hands, selects the due/next browser-local packet, renders a study-only/no-EV packet panel, and links to Hand Replay plus the Study Queue Arena route.
- Verification:           Focused Vitest passed (3 files, 16 tests); `npm run docs:update`, `npx tsc -b --pretty false`, `npm run build`, and `npm run docs:check` passed. `git diff --check` passed before compaction; initial agentKernel rerun failed only on active-handoff size, so the prior Study Queue progress entry was archived. Post-compaction `git diff --check` and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (logs `.agents/runs/2026-06-30-coachs-note-study-packet-diff-check-after-compaction.log`, `.agents/runs/2026-06-30-coachs-note-study-packet-agentkernel-after-compaction.log`).
- Risks / assumptions:    Existing broad dirty/untracked work remains preserved. The coach packet panel falls back to existing focus/receipt behavior when no packet can be built. No solver EV, trainer answer/score, raw hand text, local path, villain name, credentials, or account data is stored.
- Next action requested:  Consider a narrow Coach's Note component/visual test for the new packet panel, then continue with source-aware Study Queue coaching polish. Keep exact all-in, ICM, bounty, and 3-bet-defense grading gated behind solver/range validation.

## 2026-06-30 - Study Queue progress overview

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  One Act II Study Queue UI slice: promote local packet progress/SRS cues outside the source/config drawer, update focused tests and source-governed docs, inspect sanitized CDP targets, and verify. No cron edits, commits, pushes, parser/account/upload/payment/trainer-answer work, solver EV, or new grading.
- Files touched:          `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, `.agents/runs/2026-06-30-study-progress-overview-*.log`.
- Summary:                Inspected git state, active handoff/protocol/board/status, research ledgers/design note, StudyPlanCard/progress tests, and Chrome CDP. CDP listed RegLife, PokerTrainer, and GTO Wizard; read-only DOM inspection succeeded only for GTO Wizard Solutions and the retained log was sanitized to remove raw strategy labels, combo counts, frequencies, account/menu details, query strings, screenshots, and trainer answers. `StudyPlanCard` now shows an outside-the-drawer progress overview with reviewed/starred/snoozed/due-now counts, due/snoozed routing copy, next-packet SRS status, and a reset-location cue. The actual reset remains in the drawer and still clears only the selected browser-local marker.
- Verification:           `npx vitest run src/components/dashboard/__tests__/StudyPlanCard.test.tsx src/analysis/__tests__/studyPacketProgress.test.ts --reporter=verbose` passed (2 files, 10 tests); `npx tsc -b --pretty false`, `npm run build`, `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed. Logs are in `.agents/runs/2026-06-30-study-progress-overview-*`.
- Risks / assumptions:    Existing broad dirty/untracked work remains preserved and uncommitted. This is UI/copy around browser-local convenience metadata only; it does not store or remove hand data, answers, scores, solver EV, raw hand text, local paths, villain names, or account/source tokens. RegLife/PokerTrainer CDP targets timed out, so this tick used only repo-visible work plus sanitized GTO Wizard workflow abstraction.
- Next action requested:  Feed due Study Queue packets into Coach's Note so the coach surface can recommend the next local packet without solver-backed grades, or perform manual visual QA on the dashboard progress block. Keep exact all-in, ICM, pot-odds, and 3-bet-defense grading gated behind solver/range validation.

## 2026-06-30 - Study Queue SRS reset control

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  One Act II SRS-control slice: reset one browser-local Study Queue packet progress marker, expose the control in `StudyPlanCard`, update focused tests/docs, inspect sanitized CDP targets, compact prior baton, and verify. No cron/Git mutations, parser/account/payment/upload/trainer-answer work, solver EV, or new grading.
- Files touched:          `src/analysis/studyPacketProgress.ts`, `src/analysis/__tests__/studyPacketProgress.test.ts`, `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, `.agents/runs/2026-06-30-study-progress-reset-*.log`.
- Summary:                Inspected git/handoff/protocol/board/STATUS/ledgers and Study Queue progress code/tests. CDP found RegLife, PokerTrainer, and GTO Wizard targets; read-only DOM evaluation succeeded only for the GTO Wizard Solutions page (Study/Practice/Analyze/Upload and stable `data-tst` selectors confirmed), while RegLife/PokerTrainer timed out. No login/account/payment/upload/trainer-answer action or raw token/account/solver data was retained. Added `resetStudyPacketProgress()` plus `reset` update kind, and a Reset button next to Reviewed/Star/Snooze that clears only the selected packet's browser-local progress/SRS metadata. No hands, answers, scores, EV, raw text, paths, or villain names are stored or removed by the reset. Updated focused tests, STATUS autogen/counts, ledgers, and design note; archived the prior active baton.
- Verification:           Focused Vitest passed (2 files, 10 tests; `.agents/runs/2026-06-30-study-progress-reset-vitest.log`); `npx tsc -b --pretty false` passed; initial docs-check reported stale `STATUS.md`, then `npm run docs:update` and final docs checks passed; `npm run build` passed; pre-handoff `git diff --check` and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed. Final post-handoff diff-check passed; post-handoff agentKernel initially failed only on handoff size (5267 > 5120), then compaction plus rerun passed (log `.agents/runs/2026-06-30-study-progress-reset-agentkernel-after-compaction.log`).
- Risks / assumptions:    Existing broad dirty/untracked work remains preserved and uncommitted. Resetting progress is browser-local convenience state, not solver validation, trainer answer correctness, or mastery evidence. The first docs-check log used a pipeline before `pipefail`; later pipefail docs checks passed.
- Next action requested:  Add a small Study Queue progress overview outside the drawer (due/snoozed/reset cues), or feed due Study Queue packets into Coach's Note. Keep exact all-in, ICM, pot-odds, and 3-bet-defense grading gated behind solver/range validation; do not submit trainer answers or touch account/upload/payment flows.

## 2026-06-30 - Shared Study Queue packet progress helper

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  One Act II SRS/Arena maintenance slice: factor duplicated browser-local Study Queue packet progress/SRS helpers out of `ArenaPage` and `StudyPlanCard`, add direct helper coverage, refresh source/claim ledgers and autogenerated status inventory, and verify. No cron edits, commits, pushes, parser chip-accounting changes, solver EV, ICM/pot-odds/all-in grading, trainer answer submission/scoring, account/login/payment settings, or raw private-source material.
- Files touched:          `src/analysis/studyPacketProgress.ts`, `src/analysis/__tests__/studyPacketProgress.test.ts`, `src/components/dashboard/StudyPlanCard.tsx`, `src/pages/ArenaPage.tsx`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-30-study-progress-refactor-*.log`.
- Summary:                Inspected git state, active handoff/protocol/board, source/status/claim ledgers, Arena/Study Queue code and tests, and sanitized Chrome CDP target availability. CDP was reachable with RegLife, PokerTrainer, and GTO Wizard targets; output was limited to type/origin/title/path without query strings, raw account URLs, credentials, or tokenized data. Added `src/analysis/studyPacketProgress.ts` as the shared browser-local progress/SRS boundary for sanitized Study Queue packets: key derivation, legacy normalization, localStorage read/write, reviewed/starred/snoozed updates, due/status labels, and Arena review recording. `StudyPlanCard` and `ArenaPage` now call the shared helper instead of carrying duplicate progress/SRS logic; behavior remains local-only and stores no answers, trainer scores, solver EV, raw hand text, local paths, or villain names. Added direct helper tests and updated source/claim ledgers plus autogenerated status/test inventory.
- Verification:           `npx vitest run src/analysis/__tests__/studyPacketProgress.test.ts src/components/dashboard/__tests__/StudyPlanCard.test.tsx src/pages/__tests__/ArenaPage.test.tsx --reporter=verbose` passed (3 files, 19 tests; log `.agents/runs/2026-06-30-study-progress-refactor-vitest.log`); `npx tsc -b --pretty false` passed (log `.agents/runs/2026-06-30-study-progress-refactor-tsc.log`); `npm run build` passed (log `.agents/runs/2026-06-30-study-progress-refactor-build.log`); initial `npm run docs:check` reported stale autogenerated `docs/product/STATUS.md`, so `npm run docs:update` refreshed it (log `.agents/runs/2026-06-30-study-progress-refactor-docs-update.log`) and rerun `npm run docs:check` passed (log `.agents/runs/2026-06-30-study-progress-refactor-docs-check-after-update.log`). `git diff --check` passed (log `.agents/runs/2026-06-30-study-progress-refactor-diff-check-final.log`); `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` first exposed handoff size drift, then passed after archiving the prior baton (log `.agents/runs/2026-06-30-study-progress-refactor-agentkernel-after-compaction.log`).
- Risks / assumptions:    Existing broad dirty/untracked work from prior autonomous slices remains preserved and uncommitted; this slice intentionally touched only the shared progress-helper seam plus ledgers/status/handoff. The helper is browser-local convenience state, not evidence of solver validation or trainer answer correctness. `docs:update` reflected the current broader uncommitted source/test inventory, not only this helper file.
- Next action requested:  Add deliberate Study Queue SRS controls (interval tuning / due-count controls / reset semantics) on top of the shared helper, or continue with a small source-aware Study Queue review queue improvement. Keep exact all-in, ICM, pot-odds, and 3-bet-defense grading gated behind solver/range validation.

## 2026-06-30 - Arena completed-session result surface

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  One Act II SRS-drill continuation slice: add a completed-session surface after multi-packet Study Queue Arena drills, keep all-in/unsupported/refusal decisions review-only/no-score, update source/status/roadmap/claim ledgers, compact active handoff, and verify. No cron edits, commits, pushes, parser chip-accounting changes, solver EV, ICM/pot-odds/all-in grading, trainer answer submission/scoring, account/login/payment settings, or raw private-source material.
- Files touched:          `src/pages/ArenaPage.tsx`, `src/pages/__tests__/ArenaPage.test.tsx`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, `.agents/runs/2026-06-30-arena-complete-session-*.log`.
- Summary:                Inspected git state, active handoff/protocol/board, source/status/roadmap/claim ledgers, Arena code/tests, and sanitized Chrome CDP target availability. CDP was reachable with RegLife, PokerTrainer, and GTO Wizard targets; output was limited to type/origin/title and no raw tokenized URLs/account details were stored. `ArenaPage` now keeps a browser-local summary after the final Study Queue packet: reviewed count, graded score, next local SRS due cue from sanitized packet progress, dashboard return link, and last-packet Hand Replay link. The summary reiterates no solver EV, trainer answer/score, raw hand text, or villain name storage. Focused coverage extends the multi-packet Arena test through session completion and link assertions. Older active handoff entries were archived to restore the kernel context budget.
- Verification:           `npx vitest run src/pages/__tests__/ArenaPage.test.tsx --reporter=verbose` passed (1 file, 10 tests; log `.agents/runs/2026-06-30-arena-complete-session-vitest.log`); `npx tsc -b --pretty false` passed (log `.agents/runs/2026-06-30-arena-complete-session-tsc.log`); `npm run build` passed (log `.agents/runs/2026-06-30-arena-complete-session-build.log`); `npm run docs:check` passed (log `.agents/runs/2026-06-30-arena-complete-session-docs-check.log`); `git diff --check` passed (log `.agents/runs/2026-06-30-arena-complete-session-diff-check.log`); final `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed after handoff compaction (log `.agents/runs/2026-06-30-arena-complete-session-agentkernel-final.log`).
- Risks / assumptions:    Existing broad dirty/untracked work from prior autonomous slices remains preserved and uncommitted. Arena progress remains browser-local convenience metadata keyed by regenerated packet id; route-carried `packetIds` are trace/order metadata, not solver evidence. Gradeable non-all-in Study Queue buttons still use the existing local rule/proxy checker; all-in, ICM, pot-odds, and unsupported scenarios remain review-only until solver/range validation exists.
- Next action requested:  Factor the duplicated Study Queue packet-progress helpers from `ArenaPage` and `StudyPlanCard` into a shared module before richer SRS controls, or add deliberate SRS tuning controls. Keep exact all-in, ICM, and 3-bet-defense grading gated behind solver/range validation.

## 2026-06-30 - Arena multi-packet Study Queue SRS

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  One Act II SRS-drill continuation slice: extend the existing Study Queue → Arena bridge from one exact imported hand to an ordered multi-packet local session, record browser-local SRS progress after each Arena prompt, keep all-in/unsupported/refusal decisions review-only/no-score, update source/status/roadmap/claim ledgers, and verify. No cron edits, commits, pushes, parser chip-accounting changes, solver EV, ICM/pot-odds/all-in grading, trainer answer submission/scoring, account/login/payment settings, or raw private-source material.
- Files touched:          `src/pages/ArenaPage.tsx`, `src/pages/__tests__/ArenaPage.test.tsx`, `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-30-arena-multipacket-*.log`, `.agents/runs/2026-06-30-studyplan-multipacket-vitest.log`.
- Summary:                Inspected git state, active handoff/protocol/board, CLAUDE guardrails, source/status/roadmap/claim ledgers, Arena/StudyPlan/SpotPacket/store code, and sanitized Chrome CDP target availability. CDP was reachable with RegLife, PokerTrainer, and GTO Wizard targets; output was limited to type/origin/title and no raw tokenized URLs/account details were stored. `StudyPlanCard` now expands the next/due Arena CTA into ordered `handIds`/`packetIds` whenever more than one actionable packet remains (due first via existing selection, then untouched/non-snoozed packets). `ArenaPage` parses the route sequence, auto-starts matching imported decisions in route order, displays packet `n/total`, rehydrates each hand into its sanitized `SpotPacket`, records browser-local reviewed/SRS metadata after each prompt, and advances to the next packet without storing answers, EV, raw hand text, or trainer scoring. New tests cover ordered route selection, multi-packet advancement, local SRS writes, no raw villain names in progress storage, and the updated dashboard Arena link.
- Verification:           `npx vitest run src/pages/__tests__/ArenaPage.test.tsx --reporter=verbose` passed (1 file, 10 tests; log `.agents/runs/2026-06-30-arena-multipacket-vitest.log`); `npx vitest run src/components/dashboard/__tests__/StudyPlanCard.test.tsx --reporter=verbose` passed (1 file, 5 tests; log `.agents/runs/2026-06-30-studyplan-multipacket-vitest.log`); `npx tsc -b --pretty false` passed (log `.agents/runs/2026-06-30-arena-multipacket-tsc.log`); `npm run docs:update` passed; `npm run docs:check` passed (log `.agents/runs/2026-06-30-arena-multipacket-docs-check.log`); `git diff --check` passed (log `.agents/runs/2026-06-30-arena-multipacket-diff-check.log`); `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (1 file, 5 tests; log `.agents/runs/2026-06-30-arena-multipacket-agentkernel.log`); `npm run build` passed (log `.agents/runs/2026-06-30-arena-multipacket-build.log`).
- Risks / assumptions:    Existing broad dirty/untracked work from prior autonomous slices remains preserved and uncommitted. Arena progress is browser-local convenience metadata keyed by regenerated packet id; the route-carried `packetIds` are for traceability/order, not trusted solver evidence. The session currently exits back to the Arena landing after the last packet rather than showing a polished completion summary. Gradeable non-all-in Study Queue buttons still use the existing local rule/proxy checker; all-in, ICM, pot-odds, and unsupported scenarios remain review-only until solver/range validation exists.
- Next action requested:  Add a small completed-session/result surface for multi-packet Study Queue Arena drills (reviewed count, next due cue, return-to-dashboard/hand-replay links) or factor the duplicate packet-progress helpers into a shared module before adding richer SRS controls. Keep exact all-in, ICM, and 3-bet-defense grading gated behind solver/range validation.

## 2026-06-30 - Arena SpotPacket legal menu

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  One Act II SRS-drill continuation slice: rehydrate the exact imported Study Queue hand into a sanitized `SpotPacket` inside Arena, display the packet legal-action menu/source caveats, keep all-in and unsupported spots review-only/no-score, add focused regression coverage, and update source/status/roadmap/claim ledgers. No cron edits, commits, pushes, parser chip-accounting changes, solver EV, ICM/pot-odds/all-in grading, trainer answer submission/scoring, account/login/payment settings, or raw private-source material.
- Files touched:          `src/pages/ArenaPage.tsx`, `src/pages/__tests__/ArenaPage.test.tsx`, `src/data/store.ts`, `src/data/__tests__/store.test.ts`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-30-arena-spotpacket-menu-*.log`, `.agents/runs/2026-06-30-store-parsed-hand-rehydrate-vitest.log`.
- Summary:                Inspected git state, handoff/protocol/board/status/roadmap, source and claim ledgers, Arena/StudyPlan/SpotPacket/store files, and Chrome CDP target availability. CDP was reachable with RegLife, PokerTrainer, and GTO Wizard targets; output was origin/title sanitized and no raw tokenized URL/account content was persisted. Added `getParsedHandForHandId()` to rehydrate stored local hand/player/action/tournament rows into the parser-shaped boundary, then `ArenaPage` now builds a sanitized `SpotPacket` for Study Queue route drills and uses `trainerPrompt.legalActions` for the action buttons (including observed amounts and all-in). Arena also shows packet source/caveat warnings, prioritizes no-solver/no-trainer/legal-menu caveats, and treats all-in as `REVIEW ONLY` with no score increment. Ledgers/status/roadmap now record that the full packet menu slice is live; remaining drill work is multi-packet SRS sessions.
- Verification:           `npx vitest run src/pages/__tests__/ArenaPage.test.tsx --reporter=verbose` passed (1 file, 9 tests); `npx vitest run src/data/__tests__/store.test.ts --reporter=verbose` passed (1 file, 9 tests); `npx tsc -b --pretty false` passed; `npm run docs:update` passed; `npm run build` passed; `npm run docs:check` passed; `git diff --check` passed; `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed. Logs are under `.agents/runs/2026-06-30-arena-spotpacket-menu-*` and `.agents/runs/2026-06-30-store-parsed-hand-rehydrate-vitest.log`.
- Risks / assumptions:    Existing broad dirty work from prior autonomous slices remains preserved and uncommitted. Arena now displays the packet legal menu, but gradeable non-all-in Study Queue buttons still use the existing local rule/proxy checker rather than solver EV; all-in remains explicitly review-only. The route still starts one exact hand id at a time, so multi-packet due-SRS sessions are not implemented yet.
- Next action requested:  Build a bounded multi-packet Study Queue Arena session from due/next packet IDs (with local reviewed/SRS progress advancing after each no-score/graded prompt) while preserving the no-solver/no-trainer-scoring boundary. Keep exact all-in, ICM, and 3-bet-defense grading gated behind solver/range validation.

## 2026-06-30 - Study Queue Arena drill bridge

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  One Act II coach-loop continuation slice: connect the next/due sanitized Study Queue `SpotPacket` from `StudyPlanCard` into `ArenaPage` by exact imported hand id; keep ungraded/refusal spots review-only; update source/status/roadmap/claim ledgers and this handoff. No parser chip accounting, solver EV, ICM/pot-odds grading, trainer answer submission/scoring, cron edits, account/login/payment settings, or raw private-source material committed.
- Files touched:          `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `src/pages/ArenaPage.tsx`, `src/pages/__tests__/ArenaPage.test.tsx`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-30-study-queue-arena-*.log`.
- Summary:                Inspected git state, handoff/protocol/board/status/roadmap, source and claim ledgers, relevant Study Queue/Arena/SpotPacket files, and Chrome CDP target availability. CDP was reachable with RegLife, PokerTrainer, and GTO Wizard targets, including a tokenized PokerTrainer URL in the raw target list; no raw private URL/token/account content was persisted to repo docs. Added a `Drill in Arena` CTA for the selected next/due Study Queue packet at `/arena?drill=study-queue&handId=…`. `ArenaPage` now parses that local route, auto-starts the matching imported `HeroDecision` as a `Study Queue spot`, labels it `study-only`, and keeps unsupported/ungraded checks as `REVIEW ONLY` without score increments. Source/status/roadmap/claim ledgers now record the bridge and remaining packet-menu/multi-packet drill work.
- Verification:           `npx vitest run src/components/dashboard/__tests__/StudyPlanCard.test.tsx src/pages/__tests__/ArenaPage.test.tsx --reporter=verbose` passed (2 files, 13 tests); `npx tsc -b --pretty false` passed; `npm run docs:update` passed; `npm run build` passed; final `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed after fixing trailing whitespace and archiving the prior baton to keep `AGENT_HANDOFF.md` under budget.
- Risks / assumptions:    Existing broader dirty work from previous autonomous slices remains preserved and uncommitted. Arena still consumes the imported `HeroDecision` rather than the full `SpotPacket.trainerPrompt.legalActions`, so legal action menus remain generic in the Arena route; review-only spots are protected from scoring, but gradeable Study Queue spots still use the existing local rule/proxy checker rather than solver EV. Clicking the Arena CTA schedules the same browser-local reviewed/SRS marker as the Hand Replay CTA and does not store answers or trainer scores.
- Next action requested:  Feed the full `SpotPacket.trainerPrompt.legalActions` / source caveats into Arena's Study Queue drill view and support a multi-packet due-SRS session, while preserving the study-only/no-solver/no-trainer-scoring boundary. Keep exact ICM/all-in/3-bet grading gated behind solver/range validation and do not submit trainer answers.

## 2026-06-29 - Facing-raise dynamic not-graded routing

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  One Act II refusal-as-UI continuation slice: sanitized CDP readiness check; decision-level `FACING_RAISE` not-graded reasons for unknown opener, BTN/BB flat calls, and unsupported hero/opener pairs; shared aggregate routing in Hand Replay / Hands / Career; source/status/roadmap/claim ledgers; and this handoff. No parser chip accounting, solver EV, ICM/pot-odds grading, trainer scoring/answer submission, cron edits, account/login/payment settings, or raw private-source material committed.
- Files touched:          `src/analysis/rangeChecker.ts`, `src/analysis/ungradedScenarios.ts`, `src/analysis/__tests__/rangeChecker.test.ts`, `src/analysis/__tests__/ungradedScenarios.test.ts`, `src/components/hands/HandReplay.tsx`, `src/pages/HandsPage.tsx`, `src/pages/CareerPage.tsx`, `src/pages/__tests__/HandsPage.test.ts`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-29-facing-raise-ungraded-*.log`, `.agents/runs/cdp_sanitized_smoke_2026-06-29.cjs`.
- Summary:                Added decision-level not-graded reasons for dynamic `FACING_RAISE` skips: unknown opener position, BTN/BB flat calls, and unsupported hero/opener reaction pairs. Hand Replay, Hands, and Career now route those exact decisions into review-only aggregates while preserving graded non-BTN/BB cold-call deviations. CDP was reachable but private RegLife/PokerTrainer/GTO targets either timed out or were only used for sanitized readiness.
- Verification:           `npx vitest run src/analysis/__tests__/rangeChecker.test.ts src/analysis/__tests__/ungradedScenarios.test.ts src/pages/__tests__/HandsPage.test.ts --reporter=verbose` passed (3 files, 89 tests); `npx tsc -b --pretty false` passed; `npm run docs:update` passed; `npm run build` passed; `npm test` passed (74 files, 797 tests); final `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed after archiving the prior baton.
- Risks / assumptions:    UI/filtering only; no solver EV, exact ICM/pot-odds all-in grading, call-frequency ranges, or trainer answers/scoring. Dynamic `FACING_RAISE` summaries can still split by reason while filters route all not-graded `FACING_RAISE` hands.
- Next action requested:  Connect due Study Queue SRS packets into Arena/dedicated drills from real imported spots, or add reason-specific filtering if reviewers want separate `FACING_RAISE` unknown-opener vs BTN/BB-flat queues.

## 2026-06-29 - Career stats not-graded caveat

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  One Act II refusal-as-UI continuation slice: sanitized CDP readiness check, shared ungraded-scenario summary helper/test, Career/Stats aggregate caveat UI, source/status/roadmap/claim ledgers, and this handoff. No parser math, solver EV, trainer scoring/answer submission, cron edits, account/login/payment settings, or raw private-source material committed.
- Files touched:          `src/analysis/ungradedScenarios.ts`, `src/analysis/__tests__/ungradedScenarios.test.ts`, `src/pages/CareerPage.tsx`, `src/pages/HandsPage.tsx`, `src/pages/__tests__/HandsPage.test.ts`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, `.agents/runs/2026-06-29-career-ungraded-stats-caveat.log`.
- Summary:                Inspected git/handoff/board/status/roadmap/research ledgers and Chrome CDP. CDP listed RegLife lesson, RegLife PokerTrainer, and GTO Wizard tabs; sanitized read-only Runtime inspection timed out for RegLife/PokerTrainer/login and returned no useful GTO DOM text, so this tick stayed with repo-visible work. Added `ungradedScenarios.ts` as the shared source for compliance-refusal summaries and stats-surface impact counts. `HandsPage` now reuses the shared helper. `CareerPage` now surfaces a Stats caveat when ungraded/refusal decisions are present, with not-graded rate, gradeable denominator, fold/continue split, top scenario families/reasons, and a Hand Archive route; the existing Career Data Health link now deep-links to `/hands?panel=data-health#data-health`, and “GTO scorecards” copy was neutralized to “career scorecards.” Updated source/claim ledgers plus STATUS/ROADMAP.
- Verification:           `npx vitest run src/analysis/__tests__/ungradedScenarios.test.ts src/pages/__tests__/HandsPage.test.ts --reporter=verbose` passed (2 files, 37 tests); `npx tsc -b --pretty false` passed; `npm run docs:update` passed; `npm run build` passed; `npm run docs:check` passed; `git diff --check` passed; `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (1 file, 5 tests). Log: `.agents/runs/2026-06-29-career-ungraded-stats-caveat.log`.
- Risks / assumptions:    Existing broader dirty work from previous autonomous slices remains preserved and uncommitted. Career notice is aggregate UI routing only; it does not grade excluded scenarios, compute solver EV, add ICM/pot-odds logic, or make trainer scoring claims. GTO Wizard remains user-authorized private/tool workflow evidence only; RegLife remains licensed-private brand-neutral-use.
- Next action requested:  Close the remaining refusal-as-UI gap for position-specific `FACING_RAISE` BTN/BB or unknown-opener cases, or connect due Study Queue SRS packets into Arena/dedicated drills. Keep exact ICM/all-in/3-bet grading gated behind solver/range validation and do not submit trainer answers.

## 2026-06-29 - Hands not-graded scenario aggregate

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Act II refusal-as-UI slice only: sanitized CDP readiness/inspection, Hands archive not-graded aggregate/filter UI and helper tests, source/status/roadmap research docs, and this handoff. No parser math, solver claims, cron edits, login/account/payment/subscription interaction, trainer answers, or raw private-source material committed.
- Files touched:          `src/pages/HandsPage.tsx`, `src/components/hands/HandsFilters.tsx`, `src/pages/__tests__/HandsPage.test.ts`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-29-ungraded-scenario-aggregate.log`.
- Summary:                Inspected git/handoff/board/source-ledger state and Chrome CDP. GTO Wizard Solutions remained read-only inspectable with Study/Practice/Analyze/Upload stable selectors and visible config/action-tree/range text; RegLife lesson and PokerTrainer tabs were present but `Runtime.evaluate` timed out under read-only inspection. Added a Hands archive “Not graded review queue” for compliance-refusal scenarios (`FACING_3BET`, `FACING_ALL_IN`, `BB_VS_RAISE_MULTIWAY`, `BB_VS_LARGE_RAISE`, `BB_VS_LIMP`), with session-scoped fold/continue counts and one-click filters. Added a “Not graded” Compliance filter, pure helpers for ungraded summaries, and regression tests. Updated status/roadmap/source/claim docs.
- Verification:           `npx vitest run src/pages/__tests__/HandsPage.test.ts --reporter=verbose` passed (1 file, 34 tests); `npx tsc -b --pretty false` passed; `npm run docs:update` passed; `npm run build` passed; `npm run docs:check` passed; full `npm test -- --run` passed (73 files, 792 tests); `git diff --check` passed; post-compaction `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (1 file, 5 tests; handoff 3809 bytes). Log: `.agents/runs/2026-06-29-ungraded-scenario-aggregate.log`.
- Risks / assumptions:    The aggregate uses `complianceExclusionReason()` and does not grade or score refused spots; it is UI routing only, not solver-backed EV, trainer scoring, 3-bet-defense ranges, all-in pot-odds/ICM, or leak math. Existing broader dirty work from prior autonomous slices remains preserved and uncommitted. GTO Wizard evidence remains user-authorized private/tool workflow evidence for abstraction only; RegLife remains licensed-private brand-neutral-use.
- Next action requested:  Extend refusal-as-UI into Stats/aggregate metric surfaces where ungraded scenarios or low-confidence imports can bias totals, or connect due Study Queue packets into Arena/dedicated drills. Keep solver-backed/trainer-scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - Leaks Data Health refusal notice

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Act II coach-loop UI slice only: sanitized CDP inspection, Leaks Data Health refusal/triage notice and tests, source/status/roadmap research docs, and this handoff. No parser/range/math changes, no cron edits, no login/account/payment/subscription interaction, no trainer answers, and no raw private-source material committed.
- Files touched:          `src/pages/LeaksPage.tsx`, `src/pages/__tests__/LeaksPage.test.tsx`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-29-leaks-data-health-refusal.log`.
- Summary:                Inspected git/handoff/board/source-ledger state and Chrome CDP. GTO Wizard Solutions remained read-only inspectable with stable workflow selectors and Study/Practice/Analyze/Upgrade affordances; RegLife lesson/PokerTrainer targets were listed but timed out under read-only Runtime evaluation. Implemented a Leaks-page Data Health refusal/triage notice for low/medium local import confidence: blocked vs directional posture, parsed-file rate, failed-file count, saved records, warning categories, and deep-link to `/hands?panel=data-health#data-health` before leak cards are trusted. Added helper regression tests and updated source/claim/design/status/roadmap docs.
- Verification:           `npx vitest run src/pages/__tests__/LeaksPage.test.tsx --reporter=verbose` passed (1 file, 3 tests); `npx tsc -b --pretty false` passed; `npm run docs:update` passed; `npm run build` passed; `npm run docs:check` passed; `git diff --check` passed; `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (1 file, 5 tests); full `npm test -- --run` passed (73 files, 790 tests). Log: `.agents/runs/2026-06-29-leaks-data-health-refusal.log`.
- Risks / assumptions:    The notice is an import-confidence/refusal UI only; it does not alter leak math, parser behavior, scenario grading, solver labels, trainer scoring, or external upload behavior. Existing broader dirty work from prior autonomous slices remains preserved and uncommitted. GTO Wizard evidence remains user-authorized private/tool workflow evidence for abstraction only; RegLife remains licensed-private brand-neutral-use.
- Next action requested:  Add aggregate counts/filters for ungraded/refused scenarios outside Hand Replay (`FACING_3BET`, `FACING_ALL_IN`, `BB_VS_RAISE_MULTIWAY`, `BB_VS_LARGE_RAISE`, `BB_VS_LIMP`), or connect due Study Queue packets to Arena/dedicated drills. Keep solver-backed/trainer-scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - Study Queue local SRS routing

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Act II coach-loop UI slice only: sanitized CDP inspection, `StudyPlanCard` local progress/SRS behavior and tests, source/status/roadmap research docs, and this handoff. No parser/range/math changes, no cron edits, no login/account/payment/subscription interaction, no trainer answers, and no raw private-source material committed.
- Files touched:          `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-29-study-queue-srs-routing.log`, `.agents/runs/2026-06-29-study-queue-srs-npm-test.log`.
- Summary:                Inspected git/handoff/board/source-ledger state and Chrome CDP. GTO Wizard Solutions remained read-only inspectable with stable `data-tst` workflow selectors and Study/Practice/Analyze/Upload affordances; RegLife lesson/PokerTrainer timed out under read-only WebSocket evaluation. Implemented browser-local SRS routing for sanitized Study Queue SpotPackets: marking reviewed now records `lastDrilledAt`, `nextDueAt`, `repetitionCount`, and `intervalDays`, summarizes due count, and routes due reviewed packets before untouched packets unless snoozed. Updated source/claim/design/status/roadmap docs to keep the no-solver/no-trainer-scoring boundary explicit.
- Verification:           `npx vitest run src/components/dashboard/__tests__/StudyPlanCard.test.tsx --reporter=verbose` passed (1 file, 5 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; `npm run docs:check` passed; `git diff --check` passed; full `npm test` passed (72 files, 787 tests); post-compaction `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (1 file, 5 tests). Logs: `.agents/runs/2026-06-29-study-queue-srs-routing.log`, `.agents/runs/2026-06-29-study-queue-srs-npm-test.log`, `.agents/runs/2026-06-29-study-queue-srs-post-compaction.log`.
- Risks / assumptions:    The SRS cadence is local browser convenience metadata only; it stores no answers, scores, solver EV, raw hand text, local paths, villain names, or account/source tokens. Existing broader dirty work from prior autonomous slices remains preserved and uncommitted. GTO Wizard evidence remains user-authorized private/tool workflow evidence for abstraction only; RegLife remains licensed-private brand-neutral-use.
- Next action requested:  Connect due Study Queue packets to Arena/dedicated drill entry, or surface refusal/data-health states in Stats/Leaks so unsupported/ungraded spots are visible outside Hand Replay. Keep solver-backed/trainer-scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - CDP research/status refresh

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Docs/research/status refresh only: sanitized CDP inspection, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, and `.agents/runs/` evidence log. No code changes, no cron edits, no browser navigation/clicks beyond read-only CDP, no trainer answers, no login/account/payment/subscription interaction, and no raw private-source material committed.
- Files touched:          `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `.agents/runs/2026-06-29-cdp-status-refresh.log`.
- Summary:                Inspected git/handoff/board/source-ledger context and Chrome CDP. GTO Wizard Solutions remained read-only inspectable with stable selector/action/config signals; RegLife lesson, PokerTrainer, and GTO Wizard login targets timed out under read-only Runtime evaluation. Recorded the sanitized continuation note and corrected `STATUS.md` open follow-ups so B4/B5 are no longer presented as the next work after their branch-local implementation.
- Verification:           `npm run docs:check` passed; `git diff --check` passed; focused `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` initially exposed active handoff budget drift (5645 > 5120), then passed after archiving the prior baton (1 file, 5 tests).
- Risks / assumptions:    This was a docs-only source-governance/status slice. The GTO Wizard evidence remains user-authorized private/tool evidence for workflow/config/testability abstraction only; no proprietary strategy values should be productized as public claims. Existing broader dirty work from prior autonomous slices remains preserved and uncommitted.
- Next action requested:  Continue Act II coach-loop work: either surface refusal/data-health states in Stats/Leaks or begin own-mistake SRS drill routing from sanitized SpotPackets. Keep solver/trainer-scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - Study Queue actionable packet advancement

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive Study Queue SpotPacket progress follow-up only: `src/components/dashboard/StudyPlanCard.tsx`, its focused test, `docs/product/STATUS.md`, handoff, and `.agents/runs/` log. No solver EV/frequency output, no trainer answer submission, no trainer scoring, no login/account/payment flow, no cron edits, and no raw private-source material committed.
- Files touched:          `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, and `.agents/runs/2026-06-29-study-queue-progress-advance.log`.
- Summary:                Inspected git/protocol/status context and sanitized Chrome CDP. CDP tab listing showed RegLife, PokerTrainer, and GTO Wizard targets; read-only GTO Wizard Solutions DOM inspection succeeded with bounded UI-shape output, while RegLife lesson and PokerTrainer DOM reads timed out without interaction. Implemented local next-packet selection so the Study Queue CTA advances past reviewed or snoozed SpotPackets when another sanitized packet is available, while preserving starred packets as active study candidates and keeping all markers browser-local/no-answer/no-score/no-EV.
- Verification:           Focused `StudyPlanCard` vitest passed (1 file, 4 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; initial `npm run docs:check` reported stale autogenerated status, then `npm run docs:update` refreshed it and `npm run docs:check` passed; `git diff --check` passed; full `npm test -- --run` passed (72 files, 786 tests); final handoff compaction restored the active handoff budget and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed (1 file, 5 tests).
- Risks / assumptions:    The selection is a local dashboard convenience only: reviewed/snoozed packets are deprioritized for the next CTA but not removed from the exported bundle or global queue ranking. If all packets are reviewed/snoozed, the fallback still shows a marked packet rather than hiding the drawer. Existing broader dirty work from prior autonomous slices remains preserved and uncommitted.
- Next action requested:  Continue the correctness lane with honest leak denominators (B5) or refine the all-done Study Queue state if the UX should show a completion/unsnooze affordance. Keep solver/trainer-scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - Study Queue local packet progress

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive Study Queue SpotPacket progress slice only: `src/components/dashboard/StudyPlanCard.tsx`, its focused test, source/status/claims/design docs, handoff/archive, and `.agents/runs/` log. No solver EV/frequency output, no trainer answer submission, no trainer scoring, no login/account/payment flow, no cron edits, and no raw private-source material committed.
- Files touched:          `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, and `.agents/runs/2026-06-29-study-queue-local-progress.log`.
- Summary:                Inspected git/protocol/status/research context and sanitized Chrome CDP. CDP tab listing showed RegLife, PokerTrainer, and GTO Wizard targets; using `suppress_origin=True` allowed read-only GTO Wizard Solutions DOM inspection (Study/Practice/Analyze/Upload, report/solution/action labels), while RegLife lesson and PokerTrainer targets timed out without interaction. Implemented browser-local reviewed/starred/snoozed markers for the next Study Queue SpotPacket, mark-as-reviewed on the Hand Replay link, bundle progress summary, and stable test hooks while keeping packet metadata local-only and no-answer/no-score/no-EV.
- Verification:           Focused `StudyPlanCard` vitest passed (1 file, 3 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; `npm run docs:update` refreshed stale autogenerated status, then `npm run docs:check` passed; `git diff --check` passed; focused agentKernel vitest passed after handoff compaction (1 file, 5 tests); final full `npm test -- --run` passed (72 files, 785 tests).
- Risks / assumptions:    Progress markers are localStorage convenience metadata keyed by sanitized packet/hand IDs. They do not alter queue ranking yet, do not store trainer answers/scores, and do not include raw hand text, local paths, villain names, solver EV, or account data. Existing broader dirty work from prior autonomous slices remains preserved and uncommitted.
- Next action requested:  Either use these progress markers to de-prioritize reviewed/snoozed Study Queue packets, or continue the correctness lane with honest leak denominators. Keep solver/trainer-scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - Study Queue next-packet Hand Replay link

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive Study Queue → Hand Replay trust-substrate slice only: `src/components/dashboard/StudyPlanCard.tsx`, `src/pages/HandsPage.tsx`, focused tests, source/status/claim docs, required handoff, and `.agents/runs/` logs. No solver EV/frequency output, no trainer answer submission, no trainer scoring, no login/account/payment flow, no cron edits, and no raw private-source material committed.
- Files touched:          `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `src/pages/HandsPage.tsx`, `src/pages/__tests__/HandsPage.test.ts`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`, and verification logs under `.agents/runs/`.
- Summary:                Inspected git state, handoff/protocol docs, status/source/claim ledgers, and sanitized Chrome CDP target inventory. CDP was reachable with RegLife, PokerTrainer, and GTO Wizard tabs, but this slice did not inspect private DOM or account content. Implemented a local-only “Review next packet” link on `StudyPlanCard` that routes the first Study Queue bundle packet to `/hands?panel=spot-packet&reviewHand=<id>#spot-packet`; `HandsPage` now accepts `reviewHand`/`handId`/`hand` query params and opens `HandReplay` when the requested local hand exists, thereby reusing the existing `SpotSourcePanel` + `TrainerSpotCard` boundary.
- Verification:           Focused vitest passed (2 files, 34 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; initial docs check reported stale generated status, then `npm run docs:update` updated `STATUS.md` and final `npm run docs:check` passed; `git diff --check` passed; full `npm test -- --run` passed (72 files, 784 tests). Logs: `.agents/runs/2026-06-29-study-queue-review-link-*`.
- Risks / assumptions:    Existing broader dirty work from prior autonomous slices remains preserved and uncommitted. The new query parameter only opens an existing local hand; it does not export or expose raw hand histories, local paths, account data, villain names, solver EV, trainer answers, or trainer scoring. If the requested hand is absent, `HandsPage` simply leaves the replay closed.
- Next action requested:  Add lightweight study-progress state for opened SpotPackets (e.g., reviewed/snooze/starred packet metadata) or continue the correctness lane with the open `FACING_3BET` / honest-denominator follow-up. Keep all solver/trainer-scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - Study Queue SpotPacket source drawer

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive Dashboard Study Queue / SpotPacket trust-substrate slice only: `src/components/dashboard/StudyPlanCard.tsx`, its focused test, source-governed status/source/claims/design docs, required handoff, and `.agents/runs/` logs. No solver EV/frequency output, no trainer answer submission, no trainer scoring, no login/account/payment flow, no cron edits, and no raw private-source material committed.
- Files touched:          `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/agents/AGENT_HANDOFF.md`, and verification logs under `.agents/runs/`.
- Summary:                Inspected git state, active handoff/protocols, CLAUDE/status/research ledgers, and Chrome CDP tab availability. CDP listed RegLife, PokerTrainer, and GTO Wizard targets, but read-only Runtime inspection was blocked by Chrome's remote-origin WebSocket guard (`403 Forbidden`), so no private DOM content, credentials, account pages, or trainer actions were touched. Implemented a compact `StudyPlanCard` SpotPacket source/config drawer that previews local-only bundle target/evidence, packet coverage, next packet hero/position/scenario/source/legal-action count/review ask, warnings, and omitted-hand reasons before JSON export. The UI keeps stable `data-testid` hooks and repeats the no-solver/no-trainer-scoring/no-raw-hand/no-villain-name boundary.
- Verification:           Focused StudyPlanCard vitest passed (1 file, 2 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; `npm run docs:check` passed; full `npm test -- --run` passed (72 files, 779 tests); `git diff --check` passed; focused agentKernel vitest passed (1 file, 5 tests). Logs: `.agents/runs/2026-06-29-study-queue-config-drawer-*`.
- Risks / assumptions:    Existing broader dirty work from prior autonomous slices remains preserved and uncommitted. The new drawer is preview-only and does not navigate to a packet yet; it displays sanitized SpotPacket metadata but no raw hand histories, local paths, account data, villain names, solver EV, trainer answers, or scoring.
- Next action requested:  Connect the Study Queue bundle drawer to a non-scored “review next packet” route/state that opens the existing Hand Replay `SpotSourcePanel` + `TrainerSpotCard` for the selected packet, or retry read-only CDP inspection if Chrome is relaunched with a DevTools origin policy that permits Runtime evaluation. Keep all solver/trainer-scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - TrainerSpotCard drill prompt

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive Hand Replay / SpotPacket drill-prompt trust substrate only: `src/components/hands/TrainerSpotCard.tsx`, its focused test, HandReplay wiring/test, source-governed status/source/claims/design docs, required handoff, and `.agents/runs/` logs. No solver EV/frequency output, no trainer answer submission, no trainer scoring, no login/account/payment flow, no cron edits, and no raw private-source material committed.
- Files touched:          `src/components/hands/TrainerSpotCard.tsx`, `src/components/hands/__tests__/TrainerSpotCard.test.tsx`, `src/components/hands/HandReplay.tsx`, `src/components/hands/__tests__/HandReplay.test.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/agents/AGENT_HANDOFF.md`, and verification logs under `.agents/runs/`. `npm run docs:update` also refreshed the autogenerated status/test inventory for the new component/test while preserving prior uncommitted work.
- Summary:                Inspected git state, active handoff/protocols, `TWO_AGENT_BOARD`, product status, research ledgers, and sanitized Chrome CDP. CDP listed RegLife lesson, RegLife PokerTrainer, and GTO Wizard tabs; read-only Runtime evaluation reconfirmed the GTO Wizard Solutions target's stable `data-tst` workflow/action selectors, while RegLife lesson/PokerTrainer targets timed out again, so no trainer answers or private DOM content were extracted. Implemented `TrainerSpotCard`, a neutral local drill-prompt view backed by sanitized `SpotPacket` data that shows hero/scenario/pot/table state, anonymized seat stacks, preflop action path, and finite legal actions with stable `data-testid` hooks. Wired it into HandReplay after `SpotSourcePanel` and updated docs/ledgers to keep the no-solver/no-scoring boundary explicit.
- Verification:           Focused TrainerSpotCard/HandReplay vitest passed (2 files, 12 tests); full `npm test -- --run` passed (72 files, 779 tests); `npx tsc -b --pretty false`, `npm run docs:update`, `npm run build`, final `npm run docs:check`, `git diff --check`, and agentKernel vitest all passed. Logs: `.agents/runs/2026-06-29-trainer-spot-card-*`.
- Risks / assumptions:    `TrainerSpotCard` is display-only. It has no answer buttons, no answer submission, no mixed-strategy grading, no solver EV/frequency labels, and no raw villain names. Legal actions are inherited from `SpotPacket.trainerPrompt`, which may be parser/scenario-inferred unless the packet carries explicit trainer-config actions. Existing broader dirty work from prior autonomous slices remains preserved and uncommitted.
- Next action requested:  Connect `TrainerSpotCard`/Study Queue packets into a non-scored “review next packet” flow or add a compact source/config drawer for Study Queue bundle packets; alternatively retry read-only RegLife/PokerTrainer CDP inspection if those targets become responsive. Keep all solver/trainer-scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - SpotPacket preflop caller context

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive source-governed SpotPacket/Hand Replay trust-substrate only: `src/analysis/spotPacket.ts`, `src/analysis/__tests__/spotPacket.test.ts`, `src/components/hands/SpotSourcePanel.tsx`, `src/components/hands/__tests__/SpotSourcePanel.test.tsx`, design/status/claims docs, and required handoff/archive/log. No solver EV/frequency claims, no range grading expansion, no trainer answer submission, no account/payment/login flows, no cron edits, and no raw private-source material committed.
- Files touched:          `src/analysis/spotPacket.ts`, `src/analysis/__tests__/spotPacket.test.ts`, `src/components/hands/SpotSourcePanel.tsx`, `src/components/hands/__tests__/SpotSourcePanel.test.tsx`, `docs/product/STATUS.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`, `.agents/runs/2026-06-29-spotpacket-preflop-context.log`.
- Summary:                Inspected git/protocol/handoff/status/research context and sanitized Chrome CDP. CDP `/json` was reachable with RegLife, PokerTrainer, and GTO Wizard tabs; read-only DOM inspection succeeded for the GTO Wizard Solutions tab and reconfirmed config/action-tree/legal-action workflow abstractions, while RegLife/PokerTrainer targets timed out on read-only Runtime/Page evaluation so no trainer answers or private DOM were extracted there. Implemented the follow-up requested by the previous baton: `SpotPacket.preflopContext` now records opener position, raise count before hero, caller count, caller positions, call-vs-limp role, caller amount in bb, and squeeze/iso review flags for BB multiway and adjacent preflop review spots. `SpotSourcePanel` now surfaces that preflop context under the existing no-solver study-packet boundary. Updated focused tests and source-governed docs/claims/design note.
- Verification:           `npx vitest run src/analysis/__tests__/spotPacket.test.ts src/components/hands/__tests__/SpotSourcePanel.test.tsx --reporter=verbose` passed (2 files, 16 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; final `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed after archiving the prior baton to keep the active handoff compact. Log: `.agents/runs/2026-06-29-spotpacket-preflop-context.log`.
- Risks / assumptions:    Preflop context is metadata only: it does not grade multiway BB defense, does not infer range strength, and does not emit solver-backed EV/frequency labels. `callerCountBeforeHero` is unique by anonymized player ID; `callersBeforeHero` intentionally keeps action-order caller entries with positions/roles but no names. Existing broader dirty work from prior autonomous slices remains preserved and uncommitted.
- Next action requested:  Build the next small safe slice around a neutral `TrainerSpotCard` / drill spot view backed by `SpotPacket` and stable selectors, or retry read-only RegLife/PokerTrainer DOM inspection if those CDP targets become responsive. Keep solver/trainer scoring labels explicit and do not submit trainer answers.

## 2026-06-29 - BB multiway defense trust boundary

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Source-governed RegLife BB multiway trust-substrate slice only: scenario classification, compliance refusal, SpotPacket caveat surfacing, focused tests, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `docs/research/CLAIMS_LEDGER.md`, required handoff/log. No solver EV/scoring logic, no trainer answer submission, no account/payment/login flows, no cron edits, and no raw private-source material committed.
- Files touched:          `src/types/analysis.ts`, `src/analysis/scenarioDetector.ts`, `src/analysis/rangeChecker.ts`, `src/analysis/studyPlan.ts`, `src/analysis/spotPacket.ts`, `src/components/hands/SpotSourcePanel.tsx`, `src/components/hands/HandsFilters.tsx`, `src/analysis/__tests__/scenarioDetector.test.ts`, `src/analysis/__tests__/rangeChecker.test.ts`, `src/analysis/__tests__/spotPacket.test.ts`, `src/components/hands/__tests__/SpotSourcePanel.test.tsx`, `docs/research/CLAIMS_LEDGER.md`, `docs/product/STATUS.md`, `docs/product/ROADMAP.md`, `.agents/runs/2026-06-29-bb-multiway-defense.log`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Summary:                Inspected git state, prior handoff, coordination/protocol docs, CLAIM/SOURCE ledgers, STATUS/ROADMAP, and Chrome CDP tab list. Implemented the licensed RegLife-derived BB multiway safe abstraction: `detectScenario` now emits `BB_VS_RAISE_MULTIWAY` for BB spots facing a normal open plus a caller/limper before hero; `rangeChecker` excludes that family from heads-up BB suited-fold grading with explicit refusal copy; Study Queue/filter labels know the scenario; `SpotPacket` adds `bb_multiway_defense_context`; Hand Replay `SpotSourcePanel` surfaces that caveat. Updated focused tests and source-governed docs/claim status.
- Verification:           `npm run docs:update` completed; `npx vitest run src/analysis/__tests__/scenarioDetector.test.ts src/analysis/__tests__/rangeChecker.test.ts src/analysis/__tests__/spotPacket.test.ts src/components/hands/__tests__/SpotSourcePanel.test.tsx --reporter=verbose` passed (4 files, 101 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; `npm run docs:check` passed; `git diff --check` passed; `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed after archiving slice 15 to restore the handoff budget (5 tests); full `npm test -- --run` passed (71 files, 777 tests). Log: `.agents/runs/2026-06-29-bb-multiway-defense.log`.
- Risks / assumptions:    Multiway detection is intentionally conservative and treats any pre-BB call/limp plus one normal raise as not-heads-up BB defense; this prevents false suited-overfold flags but may classify iso-raise-over-limp BB spots into the same review-only bucket until a richer squeeze/iso taxonomy is added. `SpotPacket` remains study-packet-only and not solver-backed. Existing broader dirty work from prior autonomous slices remains preserved and uncommitted.
- Next action requested:  Continue with a bounded follow-up: either add a finer `squeeze_or_iso_review`/caller-position metadata field to `SpotPacket` for these `BB_VS_RAISE_MULTIWAY` spots, or inspect authenticated PokerTrainer/GTO Wizard tabs if reachable to map legal-action/caller-position UI patterns into source-governed implementation candidates.

## 2026-06-29 - Dashboard Data Health drill-down slice 15

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive Study Queue/Data Health trust-substrate work only: `src/pages/DashboardPage.tsx`, `src/components/dashboard/StudyPlanCard.tsx`, `src/pages/HandsPage.tsx`, `src/components/hands/HandsUpload.tsx`, focused tests, `docs/product/STATUS.md`, and required handoff/log. No solver EV/scoring logic, parser behavior changes, trainer answer submission, account/payment/login flows, or cron edits.
- Files touched:          `src/pages/DashboardPage.tsx`, `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `src/pages/HandsPage.tsx`, `src/pages/__tests__/HandsPage.test.ts`, `src/components/hands/HandsUpload.tsx`, `src/components/hands/__tests__/HandsUpload.test.tsx`, `docs/product/STATUS.md`, `.agents/runs/2026-06-29-dashboard-data-health-drilldown.log`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Summary:                Inspected dirty worktree, prior handoff, coordination gate/protocols, CLAUDE, source/claim ledgers, STATUS, and sanitized Chrome CDP. CDP `/json` was reachable; sanitized DOM inspection succeeded for GTO Wizard `/solutions` and confirmed many stable selectors, while RegLife/PokerTrainer sockets timed out so no private DOM was extracted there. Implemented the requested dashboard Data Health drill-down: Dashboard now summarizes retained local import-run diagnostics, `StudyPlanCard` displays warning-category / parser-ledger context for Data Health queue items, Data Health items deep-link to `/hands?panel=data-health#data-health`, and Hands opens the importer automatically for that route with a stable Data Health anchor. Updated focused tests and STATUS.
- Verification:           `npx vitest run src/components/dashboard/__tests__/StudyPlanCard.test.tsx src/pages/__tests__/HandsPage.test.ts src/components/hands/__tests__/HandsUpload.test.tsx --reporter=verbose` passed (3 files, 44 tests); `npx tsc -b --pretty false` passed; `npm run docs:update` completed; `npm run build` passed; `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed; full `npm test -- --run` passed (71 files, 773 tests). Log: `.agents/runs/2026-06-29-dashboard-data-health-drilldown.log`.
- Risks / assumptions:    Dashboard now performs one small additional retained-import-run query; it is capped by `IMPORT_DIAGNOSTICS_RETENTION_RUNS` and uses sanitized local diagnostics only. Deep-linking opens the importer panel but does not auto-export, clear diagnostics, upload files, or alter account/site state. Existing prior dirty work remains preserved and uncommitted.
- Next action requested:  If Dashboard load remains acceptable, continue with a bounded Study Queue performance/polish slice: lazily build SpotPacket bundles only when the user clicks export or add a small packet-count cap warning in the UI. If performance is fine, the next research-safe implementation target is a source-governed multiway BB defense warning/fixture design from the licensed RegLife BB multiway claim without changing grading logic.

## 2026-06-29 - Study Queue Data Health source/context slice 14

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive Study Queue trust-substrate work only: `src/analysis/studyPlan.ts`, `src/analysis/__tests__/studyPlan.test.ts`, `src/components/dashboard/StudyPlanCard.tsx`, `docs/product/STATUS.md`, and required handoff. No solver EV/scoring logic, parser behavior changes, trainer answer submission, account/payment/login flows, or cron edits.
- Files touched:          `src/analysis/studyPlan.ts`, `src/analysis/__tests__/studyPlan.test.ts`, `src/components/dashboard/StudyPlanCard.tsx`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`.
- Summary:                Inspected dirty worktree, prior handoff, coordination gate, CLAUDE, docs/research inventory, and sanitized Chrome CDP tabs. CDP showed RegLife, PokerTrainer, and GTO Wizard tabs, but this tick stayed repo-local because the next requested safe slice was already defined. Added a review-only `data_health` Study Queue source that queues hand IDs with legacy/unknown import source metadata, medium/low/unknown parser confidence, unsupported/unknown source/file labels, or ICM/bounty tournament-context caveats. These hands now flow into the existing local SpotPacket bundle boundary as study prompts while remaining `unsupported` evidence with explicit no-strategy-advice/no-solver-EV/no-trainer-scoring copy. Added UI label/icon support and a regression test; updated `STATUS.md` plus regenerated the autogenerated test count via `npm run docs:update`.
- Verification:           `npx vitest run src/analysis/__tests__/studyPlan.test.ts src/components/dashboard/__tests__/StudyPlanCard.test.tsx src/analysis/__tests__/spotPacket.test.ts --reporter=verbose` passed (3 files, 16 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed after archiving slice 13 to restore the handoff budget. Log: `.agents/runs/2026-06-29-data-health-study-queue-source-context.log`.
- Risks / assumptions:    This is deliberately review-only and may surface many legacy imports that lack the newly added per-hand `importSource`; that is a trust/substrate prompt, not a verdict. Failed files still cannot be linked to exact hands unless a future import-run-to-hand association exists. CDP was only inspected via sanitized tab titles/hosts/paths; no private DOM extraction or account flows were touched.
- Next action requested:  Add a bounded Uploads/Data Health dashboard summary that reuses retained import-run warning categories and links the Study Queue item back to the Hands/Data Health panel, or optimize Study Queue SpotPacket bundle assembly on-click if Dashboard load becomes heavy.

## 2026-06-29 - Study Queue bundle stable-selector slice 13

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive Study Queue export testability only: `StudyPlanCard` component/test plus required handoff. No solver claims, scoring logic, parser behavior, trainer answer submission, account/payment/login flows, or cron edits.
- Files touched:          `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `docs/agents/AGENT_HANDOFF.md`.
- Summary:                Inspected dirty worktree, prior handoff, coordination gate, source/claims ledgers, and Chrome CDP tab list. Authenticated RegLife/GTO Wizard tabs were present, but Runtime/CDP WebSocket attach was blocked by Chrome's remote-origin guard, so no private DOM content was extracted this tick. Added stable `data-testid` hooks for the ranked Study Queue card, top block, packet bundle summary, bundle export button, and queue rows so the local-only SpotPacket bundle workflow can be exercised by browser/E2E tests without selector churn. Existing bundle remains `study_packet_only` and excludes solver EV, trainer answers, raw hand text, and villain names.
- Verification:           `npx vitest run src/components/dashboard/__tests__/StudyPlanCard.test.tsx src/analysis/__tests__/spotPacket.test.ts --reporter=verbose` passed (2 files, 11 tests); `npx tsc -b --pretty false` passed; `npm run build` passed; final `npm run docs:check` / `git diff --check` / agentKernel passed after archiving slice 12. Log: `.agents/runs/2026-06-29-study-queue-stable-selectors.log`.
- Risks / assumptions:    CDP WebSocket attach is blocked until Chrome is launched with a compatible `--remote-allow-origins` setting; only sanitized tab titles/hosts/paths were inspected. Stable selectors are test hooks only and do not change scoring/export semantics.
- Next action requested:  Add a Data Health/Uploads queue summary that reuses the existing import source taxonomy and links failed/missing-context hands into the SpotPacket study queue, or optimize bundle assembly on-click if Dashboard load becomes heavy.

## 2026-06-29 - Study Queue SpotPacket bundle export slice 12

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Study Queue → local SpotPacket bundle export only: `src/analysis/spotPacket.ts`, `src/analysis/__tests__/spotPacket.test.ts`, `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `src/pages/DashboardPage.tsx`, shipped-status/research ledgers, handoff. No solver integration, no external upload/API, no cron changes, no account/login/payment flows.
- Files touched:          `src/analysis/spotPacket.ts`, `src/analysis/__tests__/spotPacket.test.ts`, `src/components/dashboard/StudyPlanCard.tsx`, `src/components/dashboard/__tests__/StudyPlanCard.test.tsx`, `src/pages/DashboardPage.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`.
- Summary:                Inspected git/protocol/status/ledgers and sanitized CDP tab inventory (RegLife, GTO Wizard, PokerTrainer; no tokens/account details retained). Added `spot-packet-bundle/v1` support that promotes ranked Study Queue hand IDs into a local-only bundle, preserves queue order, dedupes packets, records missing parsed-hand/decision/limit omissions, and keeps stable identity across creation-time changes. Wired Dashboard data into `StudyPlanCard`, which downloads sanitized local JSON without raw hand histories, villain names, solver EV, or trainer answers. Updated status and ledgers.
- Verification:           Focused SpotPacket/StudyPlanCard tests passed twice (final: 2 files, 11 tests); `npx tsc -b --pretty false`, `npm run build`, `npm run docs:update`, and final `npm run docs:check` / `git diff --check` / agentKernel passed after compacting the active handoff. Logs under `.agents/runs/2026-06-29-study-queue-bundle-*final2.log` plus targeted/build rerun logs.
- Risks / assumptions:    Local study artifact only, not solver/scoring/upload. Dashboard now reads player/action rows to assemble packets; consider lazy queued-hand-only fetching if large imports make Dashboard load heavy.
- Next action requested:  Optimize bundle assembly on-click, or continue authenticated RegLife/PokerTrainer/GTO Wizard workflow research if CDP tabs remain available.

## 2026-06-29 - SpotSourcePanel stable-selector slice 11

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive SpotPacket UI testability only: `SpotSourcePanel` component/test plus docs autogenerated status/handoff.
- Files touched:          `src/components/hands/SpotSourcePanel.tsx`, `src/components/hands/__tests__/SpotSourcePanel.test.tsx`, `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`.
- Summary:                Added stable `data-testid` selectors for the local-only SpotPacket panel, JSON export button, legal menu, caveats, and risk-context block after a failing selector test. Existing SpotPacket metadata remains study-packet-only and not solver-backed.
- Verification:           Focused SpotPacket/SpotSourcePanel/HandReplay tests passed (22 tests); typecheck, build, docs:update/check, diff-check, lint (0 errors, 2 inherited warnings), and agentKernel passed.
- Risks / next:           Selectors are testability hooks only. Next safe slice was ranked Study Queue multi-packet local export.

## 2026-06-29 - Source-aware import guide slice 10

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Import-source UX/trust substrate only: `src/components/hands/HandsUpload.tsx`, `src/components/hands/__tests__/HandsUpload.test.tsx`, source/claims ledgers, shipped-status docs, handoff. No parser behavior changes, no cron changes, no solver/upload automation.
- Files touched:          `src/components/hands/HandsUpload.tsx`, `src/components/hands/__tests__/HandsUpload.test.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/agents/AGENT_HANDOFF.md`.
- Summary:                Added a `Source-aware import guide` section to `HandsUpload` that labels PokerStars as native, GG/PokerCraft as caveated/directional, OHH JSON as the standard bridge, and WPN/ACR/iPoker/888/Party/Chico/Winamax as recognized unsupported rooms needing OHH or sanitized samples before native parser claims. CDP inspection of GTO Wizard succeeded; RegLife/PokerTrainer tabs timed out on that tick.
- Verification:           Focused HandsUpload tests, typecheck, build, docs:update/check, diff-check, and agentKernel passed.
- Risks / next:           Explanatory local import guidance only; no native parser or solver-ready claims for unsupported sources.

## 2026-06-29 - Selected-hand SpotPacket JSON export slice 09

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Selected-hand study/export only: `src/components/hands/SpotSourcePanel.tsx`, `src/components/hands/__tests__/SpotSourcePanel.test.tsx`, solver/source-governed docs, product status, handoff/archive. No cron changes, no public/share workflow, no solver-EV claims.
- Files touched:          `src/components/hands/SpotSourcePanel.tsx`, `src/components/hands/__tests__/SpotSourcePanel.test.tsx`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/solvers/2026-06-28-solver-feasibility-refresh-and-spot-packet.md`, `docs/agents/AGENT_HANDOFF.md`, `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md`.
- Summary:                Inspected git state, latest handoff/protocols/status/research ledgers, and Chrome CDP tab inventory. CDP was reachable; sanitized DOM inspection succeeded for the authenticated GTO Wizard Solutions tab (Study/Practice/Analyze/Upload nav, solution browser/data-tst selectors); RegLife lesson and PokerTrainer page WebSocket attempts timed out after sanitized/no-token connection attempts, so no private content was extracted from those tabs this tick. Added a local-only JSON download button to `SpotSourcePanel` so the currently selected hand can export its sanitized `SpotPacket` for study/external review. The export uses the existing anonymized packet object and intentionally excludes raw hand histories, filenames/paths, villain names, solver EV/frequencies, and trainer answers.
- Verification:           `npx vitest run src/components/hands/__tests__/SpotSourcePanel.test.tsx --reporter=verbose` passed (3 tests); focused SpotPacket/SpotSourcePanel/HandReplay suite passed (3 files / 21 tests); `npx tsc -b --pretty false`, `npm run build`, `npm run docs:update`, `npm run docs:check`, and final `git diff --check` / agentKernel tests passed after archiving slice 08 to keep the active handoff under budget. Logs: `.agents/runs/2026-06-29-spotpacket-json-export-vitest.log`, `...-focused.log`, `...-tsc.log`, `...-build.log`, `...-docs-update.log`, `...-docs-check.log`, `...-diff-check-final2.log`, `...-agentkernel-final2.log`.
- Risks / assumptions:    This is a browser download, not clipboard sync, automatic solver upload, or public share. Multi-hand Study Queue export is still absent. Existing imported hands need slice 08's `importSource` metadata (or re-import) to show high-confidence source labels in exported packets.
- Next action requested:  Promote ranked Study Queue hand IDs into a local-only multi-packet export bundle, or add source-aware import guide/caveat UI for PokerStars/GG/OHH and recognized-unsupported rooms.

## 2026-06-29 - Import source metadata SpotPacket slice 08

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Import source metadata only: `src/types/hand.ts`, `src/parser/workerProcessor.ts`, `src/components/hands/HandsUpload.tsx`, `src/analysis/spotPacket.ts`, focused upload/worker/SpotPacket/HandReplay tests, source-governed ledgers/status/handoff.
- Files touched:          `src/types/hand.ts`, `src/parser/workerProcessor.ts`, `src/parser/__tests__/workerImportSummary.test.ts`, `src/components/hands/HandsUpload.tsx`, `src/components/hands/__tests__/HandsUpload.test.tsx`, `src/components/hands/__tests__/HandReplay.test.tsx`, `src/analysis/spotPacket.ts`, `src/analysis/__tests__/spotPacket.test.ts`, `docs/product/STATUS.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, handoff.
- Summary:                Added local-safe `HandImportSource` metadata and propagated upload/worker source identity into stored hands, then into `SpotPacket.source`/Hand Replay when no explicit packet source override is supplied. Metadata intentionally excludes filenames, local paths, raw hand text, and player names; ZIP entries use `local_folder`, direct uploads use `local_file`, PokerStars/OHH are high-confidence unless partial parse warnings exist, and GG/PokerCraft remains medium-confidence/caveated.
- Verification:           Focused upload/worker/SpotPacket/HandReplay Vitest suite passed (36 tests); full `npm test -- --run` passed (70 files / 759 tests); `npx tsc -b --pretty false`, `npm run docs:update`, `npm run build`, `npm run docs:check`, `git diff --check`, and final agentKernel test passed. Key logs: `.agents/runs/2026-06-29-import-source-metadata-*.log`.
- Risks / next:           Existing stored hands still show unknown source metadata until re-imported. Next target was selected-hand or Study Queue sanitized SpotPacket JSON export.

## 2026-06-29 - Hand Replay SpotSourcePanel slice 07

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  `src/components/hands/SpotSourcePanel.tsx`, `src/components/hands/HandReplay.tsx`, focused component/SpotPacket tests, source-governed ledgers/status/handoff only.
- Files touched:          `src/components/hands/SpotSourcePanel.tsx`, `src/components/hands/__tests__/SpotSourcePanel.test.tsx`, `src/components/hands/HandReplay.tsx`, `src/components/hands/__tests__/HandReplay.test.tsx`, ledgers/status/docs/handoff/archive.
- Summary:                Added a Hand Replay `SpotSourcePanel` that renders local `SpotPacket` evidence labels, legal-action menu, prioritized warnings, table-stack risk context, packet ID, and explicit no-solver/no-EV/no-scoring copy from anonymized packet metadata.
- Verification:           Focused SpotPacket/studyPlan/ranges/SpotSourcePanel/HandReplay Vitest suite passed (55 tests); `npx tsc -b --pretty false`, `npm run build`, `npm run docs:check`, `git diff --check`, and agentKernel test passed. Logs: `.agents/runs/2026-06-29-spotsource-*.log`.
- Risks / next:           At this point stored hand source metadata was generic/unknown; next target was import-source persistence.

## 2026-06-28 - SpotPacket trainer-prompt legal-action slice 06

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  `src/analysis/spotPacket.ts`, focused SpotPacket tests, source-governed ledgers/status/handoff only.
- Files touched:          `src/analysis/spotPacket.ts`, `src/analysis/__tests__/spotPacket.test.ts`, `docs/research/CLAIMS_LEDGER.md`, `docs/product/STATUS.md`, handoff.
- Summary:                Inspected repo state plus sanitized CDP-open PokerTrainer/GTO Wizard tabs. Added a neutral `SpotPacket.trainerPrompt` boundary with parsed-hand or trainer-config legal action menus, explicit no-scoring metadata, and warnings for inferred legal menus while preserving `study_packet_only` / `not_solver_backed` posture.
- Verification:           `npx vitest run src/analysis/__tests__/spotPacket.test.ts src/analysis/__tests__/studyPlan.test.ts src/data/__tests__/ranges.test.ts --reporter=verbose` passed (43 tests); `npx tsc -b --pretty false`, `npm run build`, `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed. Logs are under `.agents/runs/2026-06-28-spotpacket-trainerprompt-*.log`.
- Risks / next:           Legal action menus inferred from parsed hands are not exact solver/trainer configs and are clearly warned. Next safe target: render a local `SpotSourcePanel`/`TrainerSpotCard` from `SpotPacket.trainerPrompt`, or wire packet generation into Hand Review / Study Queue export without solver-backed labels.

## 2026-06-28 - SpotPacket ICM risk-context slice 05

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  `src/analysis/spotPacket.ts`, focused tests, source-governed ledgers/status/handoff only.
- Files touched:          `src/analysis/spotPacket.ts`, `src/analysis/__tests__/spotPacket.test.ts`, `docs/research/CLAIMS_LEDGER.md`, `docs/product/STATUS.md`, handoff.
- Summary:                Inspected repo state and CDP-open GTO Wizard/RegLife/Trainer pages without retaining raw URLs or account details. Extended `SpotPacket` with table-stack risk context (`heroStackRank`, opener cover relationship, shortest known stack, effective stack) and ICM warnings that keep outputs study-only when payouts/full field stacks/exact risk premium are missing.
- Verification:           `npx vitest run src/analysis/__tests__/spotPacket.test.ts src/analysis/__tests__/studyPlan.test.ts src/data/__tests__/ranges.test.ts --reporter=verbose` passed (42 tests); `npx tsc -b --pretty false`, `npm run build`, `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed.
- Risks / next:           `riskContext` is a table-stack estimate and not solver-backed ICM. Next safe target: wire SpotPacket generation into a local Study Queue/Hand Review export surface, or add neutral TrainerSpot legal-action schema before scoring.

## 2026-06-28 - GTO Wizard Analyze/Upload workflow pass 04

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Authorized research docs/ledgers/handoff only; no app behavior changes.
- Files touched:          `docs/research/poker-brain/2026-06-28-gto-wizard-analyze-upload-pass-04.md`, poker-brain README, ledgers, handoff/archive, cron schedule.
- Summary:                User asked why Hermes looked idle; cron had run successfully but local TUI delivery is not pushed into live chat. Tightened cron schedule to exact `*/30 * * * *` and immediately continued live work. Added GTO Wizard Analyze pass: Hands/Results/Stats/Reports/Uploads workflow and post-upload cockpit implications.
- Verification:           `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed; active handoff 4,338 bytes.
- Risks / next:           RegLife ICM PDF was already extracted by cron pass 04. Next: inspect GTO Wizard Uploads/Practice deeper if no file upload/account action is required, then code spike for SpotPacket risk/context and `SpotSourcePanel`.

## 2026-06-28 - RegLife ICM/RP extraction pass 04

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Authorized research docs/ledgers/handoff only; no app behavior changes.
- Files touched:          `docs/research/poker-brain/2026-06-28-reglife-icm-risk-premium-bb-defense-pass-04.md`, ledgers/README, handoff/archive.
- Summary:                Downloaded the user-authorized RegLife `ICM NA PRÁTICA` PDF to local Hermes cache and extracted it with `pdftotext`. Normalized licensed-private claims around pairwise/asymmetric risk premium, risk advantage, BB defense tightening under ICM, suited-hand fold caveats, final-table medium-stack/micro-stack pressure, and SpotPacket context fields.
- Verification:           `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed.
- Risks / next:           Do not copy private charts/tables into UI. Next code-safe target: additive `SpotPacket` ICM/risk-context warnings; next research target: GTO Wizard Analyze/Upload pages if already authorized/open.

## 2026-06-28 - GTO Wizard + RegLife Trainer DOM/design pass 03

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Authorized research/design docs/ledgers/handoff only; no app behavior changes.
- Files touched:          `docs/research/poker-brain/2026-06-28-gto-wizard-trainer-dom-design-pass-03.md`, `docs/research/design/2026-06-28-gto-wizard-reglife-trainer-design-patterns.md`, ledgers/READMEs, cron prompt, handoff/archive.
- Summary:                Expanded autonomous loop to cover GTO Wizard, RegLife Trainer DOM/config, poker knowledge, design/UX, and implementation candidates. Inspected authenticated Trainer + GTO Wizard tabs via CDP; extracted trainer spot schema/action buckets and GTO Wizard config/matrix/action-panel UX into source-governed claims.
- Verification:           `npm run docs:check`, `git diff --check`, and `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed; active handoff under budget.
- Risks / next:           Do not submit trainer answers without a scoring policy. Next targets: RegLife `ICM NA PRÁTICA` PDF, GTO Wizard Analyze/Upload pages, then code spike for `SpotSourcePanel`/`TrainerSpot` metadata.

## 2026-06-28 - RegLife autonomous knowledge extraction pass 02

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Authorized research docs/ledgers/handoff only; no app behavior changes.
- Files touched:          `docs/research/poker-brain/2026-06-28-reglife-autonav-deep-pass-02.md`, `docs/research/poker-brain/README.md`, ledgers, handoff docs.
- Summary:                Navigated authenticated RegLife pages via Chrome/CDP after user authorization. Extracted licensed-private open-raise/flat+3bet PDF and BB-multiway PDF to local Hermes cache (not repo), then normalized claims: chipEV baseline before ICM, stack-depth-driven flat/3bet simplification, fold-cost logic, BB multiway equity-realization/caller-position effects, and deep multiway reverse-implied-odds tightening.
- Verification:           `npm run docs:check`, `git diff --check`, and agentKernel handoff-budget test passed.
- Risks / next:           RegLife SPA direct navigation is flaky unless `moduleId` is present. Next high-value extraction was `Reg Life - ICM NA PRÁTICA.pdf`.

## 2026-06-28 - SpotPacket source-metadata boundary

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Additive analysis boundary/tests; no solver integration or UI behavior changes.
- Files touched:          `src/analysis/spotPacket.ts`, `src/analysis/__tests__/spotPacket.test.ts`, `docs/product/STATUS.md`, handoff docs.
- Summary:                Added v1 `SpotPacket` builder from `ParsedHand` + `HeroDecision` with local source metadata (`site`, `fileType`, `accessMethod`, parser confidence), stable packet/input hash, anonymized seat/player IDs, source/ICM/rake/unsupported-room warnings, and `study_packet_only` evidence. No raw hand text, no player names, no EV, and no `solver_backed` path.
- Verification:           Focused SpotPacket+solverAdapter tests passed; full `npm test -- --run` passed (69 files / 752 tests); `npm run typecheck`, `npm run build`, `npm run lint` (0 errors, 2 pre-existing HandsUpload a11y warnings), `npm run docs:check`, and agentKernel handoff-budget check passed (active handoff 4,786 bytes).
- Risks / next:           Builder is not wired to UI/import yet. Keep it; next research lane is user-authorized poker-school/GTO Wizard knowledge extraction, not poker-room auth.

## 2026-06-28 - Auth-scope correction for poker knowledge research

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Research docs/ledgers/handoff only; no app behavior changes.
- Files touched:          `docs/research/poker-brain/2026-06-28-user-authorized-knowledge-access-protocol.md`, `docs/research/poker-brain/2026-06-28-reglife-gtowizard-auth-session-01.md`, ledgers, handoff docs.
- Summary:                Corrected “auth” scope: user means poker-school/GTO Wizard knowledge extraction, not app auth to poker rooms. User states RegLife expressly approved brand-neutral curriculum use; protocol/ledgers treat RegLife as licensed-private usable for product logic/copy/tests. Captured authorized session 01: RegLife curriculum/trainer + GTO Wizard preflop workflow.
- Verification:           `npm run docs:check`, `git diff --check`, and agentKernel handoff-budget check passed.
- Risks / next:           User logs in/MFA directly. RegLife can be used brand-neutrally per user-stated permission; GTO Wizard is currently user-authorized private workflow/validation evidence unless direct reuse permission is clarified.

## 2026-06-28 - Public competitor discovery pilot

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Public-source competitor research docs only; no app behavior changes.
- Files touched:          `docs/research/competitors/2026-06-28-public-competitor-discovery-pilot.md`, `docs/research/{SOURCE_LEDGER.md,CLAIMS_LEDGER.md}`, `docs/research/competitors/README.md`, handoff/archive docs.
- Summary:                Mapped 18 public competitor sources across tracker/HUD, solver/trainer, ICM push-fold, bankroll/career, and global tournament-database families; user correction added HoldemResources Calculator / HRC as a primary ICM/preflop-solver target. Main wedge: private local MTT upload -> data health -> ranked study queue -> evidence-labeled explanations -> career context; avoid HUD, solver-backed, or global-database claims unless actually supported.
- Verification:           Public web search/extraction plus `agy-print` taxonomy sanity check completed; `npm run docs:check` passed; `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose` passed with active handoff at 3,814 bytes.
- Risks / next:           Docs-only market map, not pricing/public-positioning launch work. Next best lane is solver-feasibility refresh and a solver-neutral `SpotPacket` design.

## 2026-06-27 - BB defense coverage caveat explainer

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  BB-defense caveat copy/tests only; no grading behavior changes.
- Files touched:          `src/data/ranges.ts`, `src/data/__tests__/ranges.test.ts`, `src/analysis/studyPlan.ts`, `src/analysis/__tests__/studyPlan.test.ts`, `docs/product/STATUS.md`, handoff/archive docs.
- Summary:                Added one shared `BB_DEFENSE_COVERAGE_NOTE` so Range Matrix reaction coverage and Study Queue BB suited-fold items now explain the rule applies only to normal 2-3x opens, excludes all-ins/large raises, is ICM-sensitive in Advanced profile, and is rule-based/not solver-backed.
- Verification:           RED observed in focused tests, then focused BB-defense/study-plan tests passed; typecheck, build, docs:update/check, and active handoff agent-kernel budget passed after archiving older entries.
- Risks / next:           Text-only trust-substrate change; no parser/range scoring changed. Next useful lanes were competitor discovery or solver feasibility.

## 2026-06-27 - Research operating system scaffold

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Source-governed research docs only; no app source/strategy behavior changes.
- Files touched:          `docs/README.md`, `docs/research/README.md`, `docs/research/SOURCE_LEDGER.md`, `docs/research/CLAIMS_LEDGER.md`, `docs/research/poker-brain/README.md`, `docs/research/poker-brain/2026-06-27-bb-defense-icm-pilot.md`, four research-front READMEs, handoff docs.
- Summary:                Added source ledger, claims ledger, four research-front READMEs, and a public poker-brain pilot on BB defense under ICM. Safest next implementation slice was a BB-defense coverage/caveat explainer rather than grading changes.
- Verification:           `npm run docs:check` passed; `npm run typecheck` passed; Antigravity `agy-print` used as secondary read-only review.
- Risks / assumptions:    Research notes are not shipped grading behavior; private school sources require user login/MFA and internal-reference-only labeling unless licensing allows more.

## 2026-06-27 - Hermes research-tool setup

- Owner / agent:          Hermes
- Branch:                 hermes/worktree-20260627-213824
- Scope:                  Environment/tooling setup only; no product source changes.
- Files touched:          `docs/agents/AGENT_HANDOFF.md`; external helper files under `C:/Users/MICRO/AppData/Local/hermes/{scripts,bin}`.
- Summary:                Verified Antigravity CLI (`agy`) is installed/authenticated but native `--print` stdout is blank under Hermes/Git-Bash; created external `agy-print` wrapper to recover model responses from transcript logs. Confirmed web/browser, Graphify, GitHub CLI, `uvx yt-dlp`, PyMuPDF/BeautifulSoup/Pandas via `uv`, `pdftotext`, and repo gates.
- Verification:           `agy-print --timeout 180s 'Return exactly AGY_PRINT_COMMAND_OK and nothing else.'` returned `AGY_PRINT_COMMAND_OK`; Antigravity read-only package.json smoke returned the `test` script and left repo status clean before handoff edit.
- Risks / assumptions:    Use `agy-print` from Hermes until upstream stdout behavior changes. Paid poker-school scraping needs user-driven browser login/MFA and source-ledger rules.

## 2026-06-15 - Accessibility and dashboard hygiene pass

- Owner / agent:          Codex
- Branch:                 codex/a11y-shared-interactions
- Scope:                  UI hygiene outside parser/import lanes.
- Files touched:          RangeGrid, DualRangeMatrix, HandReplay, BankrollChart, MonumentCurve, RingHud, focused tests, STATUS.
- Summary:                Moved range hover clear to native buttons; made HandReplay backdrop a native button; typed RingHud; made BankrollChart tabs filter data; removed MonumentCurve `dangerouslySetInnerHTML`; added focused tests. Hygiene-scanner false positives were already fixed on `main` / PR #71.
- Verification:           typecheck, typecheck:test, focused tests (3 files / 16 tests), full `npm test` (64 files / 709 tests), build, docs:update/check, lint --no-cache all passed. Two `HandsUpload` warnings remain for the CQ-3 lane.
- Risks / next:           Review chart range semantics; do not touch `HandsUpload` here while Claude owns import-flow work.

## 2026-06-15 - Arena C-bet Clinic cleanup

- Owner / agent:          Codex
- Branch:                 codex/arena-cbet-clinic
- Scope:                  Arena drill behavior, tests, generated/report docs.
- Files touched:          ArenaPage, Arena tests, STATUS, handoff, principal report/index.
- Summary:                C-bet Clinic now filters to `cbetOpportunity`, shows flop-stage `Check` / `C-bet` controls, uses `ConfirmDialog` for empty pools, reuses a memoized pool, removes duplicate card ternary, and adds focused regression tests.
- Verification:           focused Arena tests, docs:check, typecheck, typecheck:test, lint --no-cache (0 errors, inherited warnings), `npm test` (65/711), build, privacy:check, diff --check passed.
- Risks / next:           C-bet grading uses existing postflop flags: missed/made c-bets prefer betting; unflagged c-bet opportunities treat checking as acceptable. Parser/Career/HandsUpload untouched.

## 2026-06-15 - Dependency hygiene: remove unused React Three stack

- Owner / agent:          Codex
- Branch:                 codex/dependency-hygiene
- Scope:                  Dependency trim plus generated/report docs.
- Files touched:          `package.json`, lockfile, STATUS, handoff, principal report/index.
- Summary:                Removed unused `three`, `@react-three/fiber`, `@react-three/drei`, stale `@types/three`, and deprecated `@types/jszip` after fixed-string import checks; regenerated STATUS and linked PR #82 in the audit report.
- Verification:           docs:check, typecheck, typecheck:test, lint --no-cache (0 errors, inherited warnings), `npm test` (64/706), build, privacy:check, diff --check passed.
- Risks / next:           No runtime source changed. Review lockfile trim; parser/Career/HandsUpload lanes untouched.

## 2026-06-14 - Code health: importRuns/store cycle, shared test factories, HandsUpload test

- Owner / agent:          Claude
- Branch:                 claude/nifty-gould-3c3457 (PR #70)
- Scope:                  `src/data/importRuns.ts`, `src/test/factories.ts`, 7 analysis/data test files, `src/components/hands/__tests__/HandsUpload.test.tsx`
- Summary:                Closes 2026-06-12 review findings #2 / #5 / #4.
  - Removed the dead `importRuns -> store` re-export — the only value-level cycle edge; all consumers (`HandsUpload`, `LeaksPage`, `CareerPage`) already import persistence from `store`, so `importRuns` now has zero dependency on `store`.
  - Added `src/test/factories.ts` (canonical `makeHand`/`makePlayer`/`makeAction`/`makeTournament`); migrated 7 test files to thin baseline wrappers preserving their prior defaults. Net -104 lines. Bespoke factories left local.
  - Added the first `HandsUpload` component test: dropzone smoke, unsupported / oversized-`.txt` / oversized-`.zip` guards, and a worker-mocked end-to-end import. +5 tests.
- Verification:           typecheck, typecheck:test, lint (0 errors), `npm test` 698/698 (64 files), build, docs:check — all green.
- Risks / assumptions:    Test/code-health only; no runtime product paths changed. Trimmed this log and archived the 2026-06-07 "Leak Confidence" entry to stay under the kernel context budget (`agentKernel.test.ts`).
- Next action requested:  Open review follow-ups: `hygiene-scanner.ts` false positives, jsx-a11y warnings.

## 2026-06-11 - Reskin UI to "Precision Instrument" Design System

- Owner / agent:          Antigravity
- Branch:                 main
- Scope:                  Full application reskin using the Design Lab components and GSAP/Three.js
- Files touched:          `src/index.css`, `src/App.tsx`, `src/pages/*.tsx`, `src/components/**/*.tsx` (28+ files)
- Summary:
  - Updated Tailwind v4 variables mapping to the `tokens.css` design system primitives (`--bg`, `--fg`, `--ink`, `--hairline`, `--loss`, etc.).
  - Replaced legacy `.glass-card` elements with the system's strict `.compartment` constraint across all pages.
  - Implemented the `.mc` and `.tabs` matrix structures for the Range grids.
  - Ported Dashboard, Hands, Leaks, Sessions, Arena, Career, and Villains pages to match the "Command Desk R" reference.
  - Ran a global migration script converting legacy CSS custom properties to the new naming scheme.
- Verification:
  - `npm run build` - passed (zero TypeScript or Vite PWA build errors).
- Risks / assumptions:
  - Some components relying on legacy `bg-black/20` inline utilities were migrated; very specific bespoke positioning in non-standard plugins should be checked on edge-case data.
- Next action requested:
  - Visual QA check on Safari. Review the hand replays visually to ensure the "felt" aesthetic matches the design lab.

## 2026-06-07 - Leak Confidence, Branding Neutralization, and Variant Fixtures

- Owner / agent:          Antigravity
- Branch:                 codex/parser-confidence-ledger
- Scope:                  Leak confidence computation, brand comment neutralization, and specialized variant fixtures (Zoom/Cap/6+/Play-Money).
- Files touched:
  - `src/analysis/leakDetector.ts` - adds `confidence` to `Leak` interface and `detectLeaks` calculation.
  - `src/analysis/rangeChecker.ts`, `src/data/ranges.ts`, `src/data/strategyProfiles.ts` - neutralizes comments containing "Reg Life" or "Plano de Jogo" references.
  - `src/parser/pokerstars.ts` - adds button blind parsing for 6+ Hold'em and play money cash game stakes fallback.
  - `src/parser/__tests__/fixtureSweep.test.ts` - adds specialized variant fixture checks.
- Summary:
  - Added confidence logic to the leak detector to compute Low/Medium/High confidence based on sample size thresholds (e.g. Low if < 30 hands for preflop, or < 10 opportunities for postflop/3-bet).
  - Purged remaining comments mentioning "Reg Life" or "Plano de Jogo" from strategy/ranges files.
  - Implemented button blind parsing and play money cash game stakes parsing fallbacks in the parser.
  - Added dedicated test sweeps verifying correct parsing of Zoom, Cap, 6+ Hold'em, and play-money fixtures.
- Verification:
  - `npm test` - passed, 693 tests.
  - `npx tsc -b --pretty false` - passed.
  - `npm run docs:update` and `npm run docs:check` - passed.
  - `npm run build` - passed.
- Risks / assumptions:
  - Play money detection relies on the absence of cash symbols in cash blinds headers (e.g. `(100/200)`).
- Next action requested:
  - Verify the engine outputs and proceed with validation loops.

## 2026-06-07 - PokerStars Parser and Range Validation Correctness

- Owner / agent:          Antigravity
- Branch:                 codex/parser-confidence-ledger
- Scope:                  PokerStars cents math, hand-level bounties, progressive KO category mapping, clockwise position fallback, locale-safe chip parsing, and custom range validation.
- Files touched:
  - `src/parser/pokerstars.ts` - updates action/stack accumulation to cents space, handles locale-safe chip parsing, implements error logging, sets category for PKO/KO, and tracks hand-level bounties.
  - `src/parser/__tests__/pokerstars.test.ts` - adds unit tests verifying bounty extraction and float drift elimination.
  - `src/analysis/scenarioDetector.ts` - updates `inferBountyTournamentType` fallback to check hand-level `bountyCollected`.
  - `src/analysis/rangeValidator.ts` - updates RFI and push validators to load and check custom ranges if they exist.
  - `src/analysis/__tests__/rangeValidator.test.ts` - adds unit tests verifying that validators respect custom ranges.
  - `src/pages/RangesPage.tsx` - removes `useMemo` from `RangeValidatorPanel` so changes reflect instantly.
  - `src/data/store.ts` - updates bounty accumulation to incrementally add hand-level bounties via `sumUsd`.
  - `docs/product/STATUS.md` - updates autogenerated test inventory counts.
- Summary:
  - Implemented drift-free cents accumulation for player actions, blind postings, pot collection, and stack deltas in PokerStars parser to eliminate floating-point precision loss.
  - Corrected progressive knockout (PKO) detection by preserving the PKO flag at the tournament category level while omitting the field from tournament-level bounty partials, tracking bounties instead at the hand level.
  - Updated RFI and push fold range validators to load and test user-edited custom ranges from localStorage, with immediate validation scoring updates when editing and saving custom ranges.
- Verification:
  - `npx vitest run src/parser/__tests__/pokerstars.test.ts` - passed.
  - `npx vitest run src/analysis/__tests__/rangeValidator.test.ts` - passed.
  - `npm test` - passed, 689 tests.
  - `npx tsc -b --pretty false` - passed.
  - `npm run docs:check` - passed.
  - `npm run build` - passed.
- Risks / assumptions:
  - Custom ranges are stored synchronously in localStorage via SafeSet/SafeGet envelopes.
  - Pot collection lines (`RE_COLLECTED`) are preferred over summary lines (`RE_WON_SUMMARY`) for player won amounts to avoid double counting on showdown hands.
- Next action requested:
  - Verify range validation UI interactivity and check remaining tasks.

## 2026-06-06 - Parser confidence ledger

- Owner / agent:          Codex
- Branch:                 codex/parser-confidence-ledger
- Scope:                  Turn retained local import diagnostics into an explicit parser confidence ledger that downstream analysis and support exports can trust.
- Files touched:
  - `src/data/importRuns.ts` - adds import warning categorization, confidence ledger derivation, ledger-backed data health, and a ledger section in diagnostics Markdown.
  - `src/data/__tests__/importRuns.test.ts` - covers warning categories, ledger aggregation, empty posture, data-health linkage, and diagnostics export output.
  - `src/components/hands/HandsUpload.tsx` - shows parsed-file rate, high/medium/low run mix, and top parser warning categories in the Data Health card.
  - `docs/product/DATA_MODEL_AND_PRIVACY.md`, `docs/product/PARSER_HEALTH.md`, and `docs/product/STATUS.md` - document the local aggregate ledger and shipped parser-confidence behavior.
  - `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md` - archives the previous active handoff entry to keep this baton compact.
- Summary:
  - Retained import runs now derive an `ImportConfidenceLedger` with ready/directional/blocked posture, latest confidence, parsed-file rate, saved record totals, high/medium/low run counts, and grouped parser warning categories with sanitized examples.
  - Diagnostics Markdown now includes an "Import Confidence Ledger" section before per-run details, so support/debug reports explain why analysis should be trusted, treated as directional, or reviewed.
  - Hands upload Data Health now exposes the same ledger summary locally without adding telemetry, raw hand export, network upload, or solver claims.
- Verification:
  - `npx.cmd vitest run src\data\__tests__\importRuns.test.ts` - passed, 19 tests.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run typecheck:test` - passed.
  - `npm.cmd run privacy:check` - passed.
  - `npm.cmd run docs:update` - updated `docs/product/STATUS.md`.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd run build` - passed.
  - `npx.cmd vitest run --reporter=dot` - passed, 63 files / 681 tests.
  - `git diff --check` - passed.
- Risks / assumptions:
  - Warning categories are deterministic string buckets for support triage. They are not a full parser root-cause classifier.
  - The ledger summarizes retained local import history; it does not prove fixture coverage beyond the committed parser sweep.
  - This stacked branch still inherits historical third-party wording from its base. This slice did not add new references and neutralized the touched parser-health line.
- Next action requested:
  - Review this stacked branch after the local privacy guard branch. The next research-derived slice can be native-format fixture sourcing or a shareable-local support package preview that still stays offline/local-first.

## 2026-06-06 - Private/local runtime privacy guard

- Owner / agent:          Codex
- Branch:                 codex/local-privacy-guard
- Scope:                  Turn the private/local research finding into an enforceable runtime privacy boundary without blocking future explicit opt-in product decisions.
- Files touched:
  - `scripts/privacy-boundary-check.ts` - adds a static guard for runtime network APIs, remote assets, native share APIs, and blocked telemetry/cloud/payment/remote-AI SDK dependencies.
  - `src/__tests__/privacyBoundaryCheck.test.ts` - covers network/share detection, external URL detection, dependency detection, and exact allowlist behavior.
  - `src/index.css` and `src/pages/ArenaPage.tsx` - remove existing Google Fonts and remote texture runtime dependencies.
  - `package.json`, `scripts/README.md`, and `scripts/install-hooks.js` - document `npm run privacy:check` and add it to the generated pre-commit hook.
  - `docs/product/DATA_MODEL_AND_PRIVACY.md` and `docs/product/STATUS.md` - document the guard and future allowlist path.
- Summary:
  - `privacy:check` now fails on accidental `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `navigator.share`, external runtime URLs, and blocked SDK dependencies.
  - Future cloud/sync/support-export/solver API work remains possible, but it must update privacy docs and add a precise file/pattern allowlist entry with a reason.
  - Existing remote runtime assets were removed so the current app passes the guard.
- Verification:
  - `npm.cmd run privacy:check` - passed.
  - `npx.cmd vitest run src/__tests__/privacyBoundaryCheck.test.ts` - passed, 4 tests.
  - `node --check scripts/install-hooks.js` - passed.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run typecheck:test` - passed.
  - `npm.cmd run docs:update` - updated `docs/product/STATUS.md`.
  - `npm.cmd run docs:check` - passed.
  - `git diff --check` - passed.
  - `npm.cmd run build` - passed.
  - `npx.cmd vitest run --reporter=dot` - passed, 63 files / 678 tests.
- Risks / assumptions:
  - The guard is static and conservative. It is meant to catch product-boundary drift, not prove total network isolation at the browser/runtime level.
  - SVG namespace URLs remain allowed because they are identifiers, not remote runtime assets.
- Next action requested:
  - Review this stacked branch after the evidence-citation branch, then continue with parser confidence ledger work.

## 2026-06-06 - Evidence citation trust badges

- Owner / agent:          Codex
- Branch:                 codex/evidence-citation-audit
- Scope:                  Convert the external-research "evidence ledger" finding into product-visible trust/citation handling without changing parser behavior.
- Files touched:
  - `src/utils/evidence.ts` - adds canonical evidence overrides, citation status metadata, and unsupported/advice guards.
  - `src/analysis/studyPlan.ts` - attaches canonical `Evidence` objects and KB citations to study queue evidence.
  - `src/pages/LeaksPage.tsx` and `src/components/dashboard/StudyPlanCard.tsx` - render citation badges alongside evidence strength badges.
  - `src/utils/__tests__/evidence.test.ts` and `src/analysis/__tests__/studyPlan.test.ts` - cover canonical evidence precedence, missing citation surfacing, unsupported review-only behavior, and KB quote resolution.
  - `docs/product/STATUS.md` - regenerated approximate test count.
- Summary:
  - The app already had a canonical `Evidence` type, but trust badges were still driven mostly by ID heuristics. This pass connects canonical evidence to the visible leak/study UI.
  - Study queue cards now distinguish cited rule/proxy/reference items from unsupported BB-loss review items.
  - Leak cards now show citation status instead of only a strategy-source label.
  - Study queue tests now verify cited KB files exist and contain the quoted text.
- Verification:
  - `npx.cmd vitest run src/utils/__tests__/evidence.test.ts` - passed, 8 tests.
  - `npx.cmd vitest run src/analysis/__tests__/studyPlan.test.ts` - passed, 4 tests.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run typecheck:test` - passed.
  - `npm.cmd run docs:update` - updated `docs/product/STATUS.md`.
  - `npm.cmd run docs:check` - passed.
  - `git diff --check` - passed.
  - `npx.cmd vite build --debug` - passed elevated after non-elevated Vite hit the known Windows sandbox ancestor-directory access denial.
  - `npx.cmd vitest run --reporter=dot` - passed elevated, 62 files / 674 tests.
- Risks / assumptions:
  - This is a trust/provenance improvement only; it does not add solver output or change parser/deviation classification.
  - Leak-page citations are mapped at the page level for the current leak IDs. A future shared evidence registry would remove duplication between leaks and study queue evidence.
- Next action requested:
  - Review this stacked branch after the kernel contract branch, then continue with the next research-derived slice: parser confidence ledger or local/privacy guarantees.

## 2026-06-06 - Kernel contract and handoff lifecycle repair

- Owner / agent:          Codex
- Branch:                 codex/kernel-contract-repair-clean
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

## 2026-06-06 - Third-party curriculum mention purge

- Owner / agent:          Codex
- Branch:                 codex/purge-third-party-mentions
- Scope:                  Remove explicit third-party brand mentions from repo docs, archived docs, strategy notes, and source comments while preserving private/local generic analyzer posture.
- Files touched:
  - `AGENTS.md` - neutralizes the active gate wording.
  - `docs/agents/TWO_AGENT_BOARD.md` - neutralizes the active exclusion gate label.
  - `docs/validation/USER_VALIDATION_PLAN.md` - removes named cohort/product wording and keeps private/local validation language generic.
  - `docs/audits/IP_COPY_AUDIT.md`, `docs/design/*`, `docs/plans/*`, `docs/product/PARSER_HEALTH.md`, `docs/reports/*`, `docs/agents/archive/*`, and `docs/knowledge/strategy/*` - replace historical named references with generic third-party curriculum / training-community wording.
  - `src/data/strategyProfiles.ts`, `src/data/ranges.ts`, and `src/analysis/rangeChecker.ts` - neutralize source comments only; no runtime behavior changed.
  - `docs/agents/AGENT_HANDOFF.md` - records this session.
- Summary:
  - Removed explicit named third-party brand mentions from tracked repo content.
  - Preserved the current private/local, no-pricing, no-public-sharing gate.
  - Kept strategy/source-risk warnings intact under generic third-party curriculum wording.
- Verification:
  - Exact old-brand mention scan - no matches; log: `.agents/runs/2026-06-06-purge-third-party-search.log`.
  - `npx.cmd tsc -b --pretty false` - passed; log: `.agents/runs/2026-06-06-purge-third-party-tsc.log`.
  - `npm.cmd run docs:check` - passed; log: `.agents/runs/2026-06-06-purge-third-party-docs-check.log`.
- Risks / assumptions:
  - This is a wording/comment/docs purge. It does not rename `Game Plan`, `[GamePlan]`, dossier tags, strategy constants, or knowledge-base source structure.
  - `.agents/runs` is local/gitignored; logs are retained in this checkout only.
- Next action requested:
  - Review the wording sweep. If the desired policy is broader than the explicit brand-name purge, schedule a second pass for `Game Plan`, dossier tags, and third-party curriculum source labels.

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

## 2026-05-30 â€” Fix getHandCategory suited gapper broadway fallthrough

- Owner / agent:          Antigravity
- Branch:                 task/hand-category-fallthrough-fix
- Scope:                  src/pages/HandsPage.tsx, src/components/hands/HandsFilters.tsx
- Files touched:
  - `src/components/hands/HandsFilters.tsx` â€” added `'suited-gappers'` to `HAND_CATEGORIES` and mapped its label `'Suited Gappers & Other'` in `CATEGORY_LABELS`.
  - `src/pages/HandsPage.tsx` â€” fixed `getHandCategory` so it doesn't fall through to `'broadway'` for suited hands, mapping suited gappers correctly to `'suited-gappers'`. Added self-executing unit tests executing assertions at module-load time in test environments.
- Summary:
  - Addressed a scenario where non-broadway, non-ace, non-connector suited hands (e.g. K5s, 86s) were mislabeled as 'broadway' by mapping them to the new 'suited-gappers' category.
  - Ensured correct rendering in filters and tables.
- Verification:
  - `npm run typecheck` âœ“ (tsc completed successfully)
  - `npm test` âœ“ (all 586 tests passed)
- Risks / assumptions:
  - Category filtering works correctly for new and existing hands.
- Next action requested:
  - Review changes and merge to main when appropriate.
