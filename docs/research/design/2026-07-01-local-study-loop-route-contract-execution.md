# Local Study Loop Route-Contract Execution

Date: 2026-07-01

Source posture: mixed internal code/test evidence plus user-authorized private/tool workflow evidence.

Usage status: safe-to-implement-as-abstraction for workflow/state/testability concepts only; not public evidence and not a license to copy proprietary solver ranges, frequencies, chart data, account data, trainer answers, or product copy.

## Research question

Can the local Study Queue -> Coach -> Arena -> Hand Replay loop be verified without depending on private study-tool tabs being responsive, while still preserving the workflow abstractions learned from GTO Wizard / RegLife?

## Sources used

- `S-AUTH-GTOW-007` — authenticated GTO Wizard Solutions and listed RegLife/PokerTrainer tabs, inspected only through read-only Chrome/CDP metadata and sanitized DOM commands; raw query/account/tokenized URLs not retained.
- `S-INT-CODE-019` — current route-contract and Arena test coverage for the local Study Queue loop.
- `S-INT-CODE-003` — existing SpotPacket / solver-boundary implementation posture.
- `S-INT-CODE-011` — prior local Study Loop QA checklist and source/config panel coverage.

## Read-only CDP readiness result

Chrome CDP was reachable and listed eight targets. The relevant open page targets were:

- RegLife lesson (`membros.reglife.com.br/m/lessons/...`) — present, but `Runtime.evaluate`, `Page.getFrameTree`, `DOM.getDocument`, and `Accessibility.getFullAXTree` timed out.
- GTO Wizard Solutions (`app.gtowizard.com/solutions`) — inspectable. Sanitized Runtime metadata reported `readyState: complete`, 9 buttons, 18 links, no forms/inputs, and a sampled selector set with workflow/testability families such as `variant-switcher`, `study-menu-*`, `practice-menu-*`, `analyze-menu-*`, `upload-button`, `solution-browser`, `study_layer`, `shrtbtn_reset_history`, `shrtbtn_save_spot`, `shrtbtn_practice_spot`, `gmf_selector_opener`, `hs_*`, `hspotcrd_action`, `tab_strategy`, `tab_range`, `tab_breakdown`, and `tab_reports`.
- RegLife PokerTrainer (`reglifesim.com/trainer/...`) — present, but read-only Runtime/Page/DOM/Accessibility commands timed out.

No login, account, payment, upload, solver-frequency/range extraction, screenshot, trainer-answer submission, profile action, tokenized URL retention, or account-data retention occurred.

## Local route-contract execution

Focused Vitest command:

```bash
npx vitest run src/__tests__/studyQueueRouteContract.test.tsx src/pages/__tests__/ArenaPage.test.tsx --reporter=verbose
```

Result: 2 test files passed, 16 tests passed.

The covered contract now includes:

- Dashboard Study Queue and Coach's Note emit matching packet-specific Hand Replay and Arena routes when a due/next sanitized packet exists.
- Future-SRS/no-actionable Study Queue states withhold packet-specific CTAs while keeping Data Health reachable, and Coach falls back to generic Arena routing.
- Arena auto-starts Study Queue routes, preserves ordered multi-packet progression, handles delimiter-sensitive hand/packet IDs, records only browser-local SRS metadata, and keeps all-in/ungraded decisions review-only with `0 / 0` scoring.
- Hand Replay receives the packet review route, while Data Health opens as the importer fallback.
- Assertions explicitly reject solver-EV, trainer-answer, trainer-score, raw-hand, local-path, and private-villain-name leakage in the tested route surfaces/storage.

## Finding / concept

Finding: private-tool CDP access is useful for workflow and selector inspiration, but it remains opportunistic. The repeatable product QA spine should be self-contained around local sanitized `SpotPacket` route contracts, not dependent on GTO Wizard / RegLife / PokerTrainer tab responsiveness.

- Source(s): `S-AUTH-GTOW-007`, `S-INT-CODE-019`, `S-INT-CODE-011`
- Source type: user-authorized private/tool result plus internal repo tests/docs
- Confidence: high
- IP / usage status: safe-to-implement-as-abstraction; GTO Wizard remains private/tool reference only, RegLife remains licensed-private brand-neutral use
- Product implication: keep source/config panels, stable selectors, exact packet routing, and no-solver/no-answer/no-score copy as the trust substrate before any broader refactor or browser-runner adoption.
- Implementation candidate: preserve `src/__tests__/studyQueueRouteContract.test.tsx` as the required smoke gate for Study Queue / Coach / Arena / Hand Replay changes; if a real browser runner is added later, seed sanitized local packets instead of relying on external private tabs.
- Validation needed: run the route-contract smoke plus focused component tests after any Study Queue, Coach, Arena, Hand Replay, or SpotPacket changes.
- Competitor comparison: GTO Wizard validates the value of adjacent Study/Practice/Analyze/Upload workflow and stable selector families, but this app's competitive wedge is a private/local imported-hand study loop with honest rule/proxy/study-packet labels rather than solver-backed EV/frequency claims.

## Implementation handoff candidate

### Now

Problem / opportunity: the prior manual QA checklist needed an executable local verification result, and the current private tabs again showed why external CDP cannot be the main QA dependency.

Evidence summary: CDP succeeded for GTO Wizard workflow metadata and timed out for RegLife/PokerTrainer page commands; the self-contained Vitest route contract passed 16/16 tests across Dashboard/Coach/Arena/Hand Replay/Data Health boundaries.

Safe abstraction to preserve: local sanitized packet routing, source/config-before-drill UI, browser-local SRS metadata, review-only ungraded prompts, and explicit no-solver/no-trainer-scoring copy.

Files likely touched by future implementation: `src/__tests__/studyQueueRouteContract.test.tsx`, `src/components/dashboard/StudyPlanCard.tsx`, `src/pages/CoachsNotePage.tsx`, `src/pages/ArenaPage.tsx`, `src/pages/HandsPage.tsx`, `src/components/hands/SpotSourcePanel.tsx`, `src/components/hands/TrainerSpotCard.tsx`.

Acceptance criteria:

- Packet-specific Dashboard and Coach routes agree when a packet is actionable.
- No-actionable/future-SRS states do not route skipped packets prematurely.
- Arena keeps imported Study Queue sessions review-only where no local rule applies and stores only packet/hand IDs plus timing markers.
- Hand Replay and Data Health routes remain reachable through stable selectors.
- No tested surface emits solver EV, trainer answers, trainer scores, raw hand text, local paths, account data, or raw villain names.

Tests / verification:

- `npx vitest run src/__tests__/studyQueueRouteContract.test.tsx src/pages/__tests__/ArenaPage.test.tsx --reporter=verbose` passed (2 files / 16 tests).

Risks and refusal boundaries:

- Do not submit PokerTrainer answers or alter external progress.
- Do not store raw private URLs, account state, screenshots, solver ranges/frequencies, or private chart data in repo artifacts.
- Do not label local rule/proxy packets as solver-backed until a real external validation path exists.

### Later

- If a browser runner is introduced, keep it local-only and seed sanitized demo/imported packets rather than automating private study-site state.
- Retry RegLife/PokerTrainer read-only CDP only when existing authenticated tabs respond; pause for login/MFA/account/payment state and continue repo-visible QA otherwise.
- Continue terminology cleanup on remaining generic compliance/range wording only when no overlapping UI owner is active.

## Claim generated

- `C-UX-STUDY-008`
