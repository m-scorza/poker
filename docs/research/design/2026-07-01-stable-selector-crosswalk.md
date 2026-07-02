# Stable Selector Crosswalk for Local Study-Loop QA

Date: 2026-07-01

Source posture: mixed internal source/test inventory plus user-authorized private/tool workflow evidence.

Usage status: safe-to-implement-as-abstraction for workflow/testability concepts only; not public evidence and not a license to copy proprietary solver ranges, frequencies, chart data, account data, trainer answers, product copy, or private URLs.

## Research question

Before introducing any browser-runner smoke for the local Study Queue -> Coach -> Arena -> Hand Replay/Data Health loop, which product-owned stable selectors are already covered and which route surfaces still need explicit anchors?

## Sources used

- `S-AUTH-GTOW-008` — read-only Chrome/CDP refresh against existing user-authorized study-tool tabs; raw URL/query/account/token data not retained.
- `S-INT-CODE-020` — local `src/` static `data-testid` inventory and test-reference inventory from the current worktree.
- `S-INT-CODE-019` — existing route-contract Vitest proof for Dashboard, Coach, Arena, Hand Replay, and Data Health routing.
- `S-INT-CODE-011` — prior local QA checklist and source/config panel coverage.

## Readiness and safety result

Chrome CDP remained reachable. Relevant page targets were present for GTO Wizard Solutions, a RegLife member lesson, RegLife PokerTrainer, and a GTO Wizard login tab. A sanitized probe extracted only structural selector/control counts and intentionally omitted raw URLs, query strings, account data, cookies, local/session storage, screenshots, solver ranges/frequencies, trainer answers, and hand-history text.

Outcome:

- GTO Wizard Solutions was inspectable: `readyState: complete`, 9 buttons, 24 links, 0 forms/inputs, and 535 stable test-attribute nodes. The useful abstraction is not the proprietary selector list itself; it is the product pattern of broad stable hooks around navigation, source/config selection, state controls, action/history areas, and study/practice/analyze/upload routes.
- RegLife lesson, RegLife PokerTrainer, and the GTO Wizard login tab timed out under read-only `Runtime.evaluate`. No login, account, payment, upload, progress-changing, or trainer-answer action was attempted.
- Local selector inventory scanned 190 source/test files and found 58 static `data-testid` definitions plus 47 test-referenced IDs. Dynamic selector definitions exist in Study Queue, Trainer Spot Card, Arena, and Hands surfaces.

## Local selector inventory snapshot

Critical product-owned selector families from the sanitized inventory:

| Prefix | Static definitions | Test references | Interpretation |
|---|---:|---:|---|
| `study-queue-*` | 20 | 21 | Strong coverage for dashboard packet state, source/config drawer, progress controls, Data Health link, and Arena/Hand Replay packet CTAs. |
| `coachs-note-*` | 4 | 4 | Coach packet and fallback drill routing have stable test anchors. |
| `arena-study-*` | 3 | 3 | Arena imported-packet drill state and packet menu have stable anchors. |
| `spot-source-panel-*` | 6 | 6 | Source/config panel has stable anchors aligned with the no-solver boundary. |
| `trainer-spot-card-*` | 6 | 5 | Local neutral trainer prompt mostly has tested anchors; one static card selector is not directly referenced by current tests. |
| `hand-replay-*` | 0 | 0 | Remaining explicit-anchor gap for browser/manual route-smoke assertions, even though current tests verify the route via a mocked Hand Replay. |
| `hands-upload-*` | 0 | 0 | Remaining explicit-anchor gap for upload/Data Health browser assertions; current static anchor is `import-data-health` and route-contract tests use a mocked upload panel. |

## Finding / concept

Finding: the app already owns enough stable selectors to keep Study Queue, Coach, Arena, Spot Source, and Trainer Prompt QA deterministic, but the next browser/manual smoke should not rely on visual text or mocks for the terminal route surfaces. Hand Replay packet-review entry and Upload/Data Health entry need explicit product-owned anchors before a real browser runner becomes trustworthy.

- Source(s): `S-AUTH-GTOW-008`, `S-INT-CODE-020`, `S-INT-CODE-019`, `S-INT-CODE-011`
- Source type: user-authorized private/tool result plus internal repo source/tests
- Confidence: high
- IP / usage status: safe-to-implement-as-abstraction; GTO Wizard remains private/tool workflow evidence only; RegLife remains licensed-private brand-neutral scope only
- Product implication: preserve existing selectors during refactors and add narrow anchors at Hand Replay/Data Health boundaries before replacing route-contract unit tests with, or supplementing them by, browser-runner smoke tests.
- Implementation candidate: add stable `data-testid` hooks for the Hand Replay packet review surface and Data Health/upload panel entry, then extend the local route-contract/browser smoke to assert those anchors without raw hand text, local paths, villain names, solver EV, trainer answers, trainer scores, screenshots, or private URLs.
- Validation needed: component/route-contract assertions around the new selectors, plus the existing Study Queue route-contract smoke.
- Competitor comparison: GTO Wizard reinforces the value of dense stable hooks around source/config/state/workflow areas, but the product wedge remains a private/local study loop whose QA is driven by owned selectors and sanitized packets rather than external private-tab availability.

## Implementation handoff candidate

### Now

Problem / opportunity: the self-contained route contract is passing, but a future browser-runner smoke still has two weak terminal anchors: Hand Replay packet review and Upload/Data Health entry.

Evidence summary: CDP showed mature private-tool workflow surfaces expose broad stable selector hooks, while the local inventory showed strong selector coverage in Study Queue/Coach/Arena/SpotSource/TrainerCard and no `hand-replay-*` or `hands-upload-*` static selector families.

Safe abstraction to implement: product-owned stable anchors at the terminal review/data-health surfaces, not copied private selectors or proprietary workflow labels.

Files likely touched:

- `src/components/hands/HandReplay.tsx`
- `src/components/hands/HandsUpload.tsx`
- `src/components/hands/__tests__/HandReplay.test.tsx`
- `src/components/hands/__tests__/HandsUpload.test.tsx`
- optionally `src/__tests__/studyQueueRouteContract.test.tsx` if the route-contract test stops mocking those terminal surfaces

Acceptance criteria:

- Hand Replay exposes a stable anchor for a packet-specific review route/state without rendering raw hand text, local paths, private villain names, solver EV, trainer answers, or trainer scores.
- Upload/Data Health exposes a stable anchor for the importer diagnostics/data-health panel reached from Study Queue fallback routes.
- Existing route-contract assertions continue to pass and remain source/evidence-boundary focused.
- No external private browser tab, account state, upload flow, or screenshot is required for the smoke.

Tests / verification:

- Add/update focused component assertions for the new selectors.
- Keep running `npx vitest run src/__tests__/studyQueueRouteContract.test.tsx src/pages/__tests__/ArenaPage.test.tsx --reporter=verbose` after study-loop route changes.

Risks and refusal boundaries:

- Do not submit PokerTrainer answers or alter external progress.
- Do not store raw private URLs, account state, screenshots, solver ranges/frequencies, or private chart data in repo artifacts.
- Do not call local selector-driven prompts solver-backed until a real external validation path exists.

### Later

- If a browser runner is added, seed sanitized local/demo packets and assert owned selectors instead of automating private GTO Wizard/RegLife/PokerTrainer state.
- Retry RegLife/PokerTrainer read-only CDP only when existing authenticated tabs respond; otherwise keep repo-visible QA moving.

## Claim generated

- `C-UX-STUDY-009`

## Implementation follow-up

Same-day follow-up closed the terminal-anchor gap identified above:

- Hand Replay now exposes owned `hand-replay-overlay`, `hand-replay-dialog`, and `hand-replay-study-packet-review` selectors around the packet-review surface.
- HandsUpload now exposes owned `hands-upload-root`, `hands-upload-dropzone`, and `hands-upload-data-health-entry` selectors while preserving the existing `import-data-health-panel` anchor and `#data-health` hash target.
- Focused component tests assert the new anchors without adding solver EV, trainer answers/scores, raw hand text, local paths, account data, screenshots, or private URLs.

Second same-day follow-up extended the self-contained route-contract smoke so it now renders the real terminal surfaces rather than mocked placeholders:

- The SpotPacket Hand Replay route asserts `hand-replay-dialog`, `hand-replay-study-packet-review`, `spot-source-panel`, and `trainer-spot-card` against sanitized local seat/action data.
- The Data Health fallback route asserts `hands-upload-root`, `hands-upload-data-health-entry`, and `import-data-health-panel`/`#data-health` against the real importer panel.
- The route smoke preserves the no-private-tab/no-upload/no-trainer-answer boundary and rejects raw private villain names, EV-loss/chipEV claims, correct-answer wording, and trainer-score labels.

Source/claim follow-up: `S-INT-CODE-021`, `S-INT-CODE-022`, `C-UX-STUDY-009`.