# Study Loop Selector / State QA Pass

Date: 2026-06-30  
Source posture: mixed internal code plus user-authorized private/tool workflow evidence.  
Usage status: safe-to-implement-as-abstraction for workflow/state/testability concepts only; not public evidence and not a license to copy proprietary solver ranges, frequencies, chart data, account data, or product copy.

## Research question

After the Study Queue, Coach, and Arena slices, does the local product loop have the same trustworthy workflow spine as a mature study tool: source/config context, explicit spot state, practice route, local state controls, and stable selectors before any strategy-looking output?

## Sources used

- `S-AUTH-GTOW-004` — authenticated GTO Wizard Solutions view, read-only CDP selector/state refresh on `/solutions`; query/account data not retained.
- `S-INT-CODE-003` — current `SpotPacket`, `SpotSourcePanel`, `TrainerSpotCard`, and solver-boundary code/tests.
- `S-INT-CODE-009` — current Study Queue-to-Arena bridge and browser-local packet progress/SRS behavior.
- `S-INT-CODE-010` — current Coach's Note selected Study Queue packet behavior.

RegLife lesson and PokerTrainer tabs were present in Chrome CDP, but read-only Runtime/DOM/Accessibility inspection timed out in this tick. No login, account, payment, upload, or trainer-answer flow was touched.

## Sanitized CDP findings from GTO Wizard

Observed abstraction, with proprietary strategy data deliberately excluded:

- The study surface keeps the top-level workflow adjacent: Study, Practice, Analyze, and Upload are visible from the solution workspace.
- The spot itself is wrapped in a source/config selector before the strategy workspace: game family, table/depth/config family, action tree, node/action cards, and change/select controls are visible before any matrix output.
- The local study state controls are attached to the spot: reset/history, saved spots, and a practice-this-spot route are visible as first-class controls rather than buried settings.
- The workspace splits strategy views into separate surfaces such as strategy, ranges, breakdown, and reports.
- The DOM exposes stable selector families for navigation, source/config selectors, action cards, tabs, and range/workspace panels.

## Product-fit comparison

| Pattern | External evidence | Current app evidence | Assessment | Safe next candidate |
|---|---|---|---|---|
| Source/config before action | `S-AUTH-GTOW-004` | `SpotSourcePanel`, `TrainerSpotCard`, Study Queue source/config drawer | Aligned. Local panels show evidence labels, parser confidence, legal menu, warnings, and no-solver copy before downstream review. | Preserve this order in every new Coach/Arena surface; avoid “recommendation first” cards. |
| Practice route from the exact spot | `S-AUTH-GTOW-004` | Study Queue `Drill in Arena`, Coach packet `Drill packet`, Arena route query for ordered packet IDs | Aligned. The route carries the imported-hand packet sequence instead of launching a generic drill when a packet is available; the final Coach CTA is now covered for packet versus fallback routing. | Keep final selector in manual/CDP QA; next candidate is an end-to-end local demo walkthrough checklist. |
| Local state controls near the spot | `S-AUTH-GTOW-004` | Study Queue reviewed/starred/snoozed/reset controls backed by browser-local packet markers | Aligned with private/local posture. The app stores local repetition metadata only, not answers, scores, solver EV, raw hands, or account tokens. | Keep state controls scoped to sanitized packet keys; do not add account-backed progress sync without a new privacy/product decision. |
| Stable selectors for inspection/tests | `S-AUTH-GTOW-004` | `study-queue-*`, `spot-source-panel-*`, `trainer-spot-card-*`, `coachs-note-study-packet-*`, `coachs-note-final-drill-link`, `arena-study-*` selectors | Aligned. Critical packet surfaces and the generic-or-packet Coach final drill CTA have selectors for focused tests and manual QA. | Preserve stable selectors when refactoring the Coach/Arena route loop. |
| No solver-looking output without a solver | `S-AUTH-GTOW-004`, `S-INT-CODE-003` | SpotPacket warnings, no-EV/no-answer/no-score copy, ungraded Arena review-only paths | Aligned. Current UX uses study/export labels rather than EV-loss or frequency claims. | Keep exact EV/frequency/range output reference-only until an external solver/export validation path exists. |

## Claim generated

- `C-PB-GTOW-004`

## Implementation handoff candidates

### Now — completed follow-up

Problem / opportunity: the local study loop is structurally close to the desired source-config-practice spine, and the Coach route QA now has a stable final CTA selector for future browser/CDP/manual checks.

Safe abstraction implemented: `coachs-note-final-drill-link` distinguishes:

- no selectable Study Queue packet -> generic `/arena` fallback;
- selectable Study Queue packet -> packet-specific Arena route;
- no solver EV-loss, trainer score, or answer-feedback claim appears in the CTA path.

Files touched:

- `src/pages/CoachsNotePage.tsx`
- `src/pages/__tests__/CoachsNotePage.test.tsx`

Acceptance status:

- The final Coach CTA has a stable `data-testid`.
- Tests prove the route target changes based on packet availability without altering packet logic.
- No raw hand text, local paths, villain names, solver EV-loss output, trainer answers, or account data are stored or rendered by the new selector slice.

Verification target:

- `npx vitest run src/pages/__tests__/CoachsNotePage.test.tsx --reporter=verbose`
- `npx tsc -b --pretty false`
- `npm run build`
- `npm run docs:check`

### Later

- Add a manual/visual QA checklist or lightweight e2e story for `Dashboard Study Queue -> Coach packet -> Arena packet drill -> Hand Replay` using local demo data.
- Re-attempt RegLife/PokerTrainer CDP inspection only when those existing authenticated tabs respond to read-only DOM calls; do not submit trainer answers.
- Keep GTO Wizard exact frequencies/ranges, private solution data, account state, and quota/account flows reference-only.
