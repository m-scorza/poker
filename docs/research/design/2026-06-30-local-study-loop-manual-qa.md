# Local Study Loop Manual QA Checklist

Date: 2026-06-30  
Source posture: mixed internal code/test evidence plus user-authorized private/tool workflow evidence.  
Usage status: safe-to-implement-as-abstraction for workflow/state/testability concepts only; not public evidence and not a license to copy proprietary solver ranges, frequencies, chart data, account data, or product copy.

## Research question

What is the smallest repeatable QA contract for the local study loop now that Study Queue packets can route through Dashboard, Coach, Arena, and Hand Replay without claiming solver EV or trainer answers?

## Sources used

- `S-AUTH-GTOW-005` — authenticated GTO Wizard Solutions read-only CDP selector refresh; query/account data not retained.
- `S-AUTH-GTOW-006` — authenticated GTO Wizard Solutions plus RegLife/PokerTrainer tab readiness refresh through read-only direct-target and browser-attach CDP attempts; query/account/tokenized URLs not retained.
- `S-INT-CODE-011` — current local Study Queue / Coach / Arena / Hand Replay code and focused tests.
- `S-INT-CODE-003` — current SpotPacket, SpotSourcePanel, TrainerSpotCard, and solver-boundary code/tests.
- `S-INT-CODE-009` — current Study Queue-to-Arena bridge and browser-local packet progress/SRS behavior.
- `S-INT-CODE-010` — current Coach's Note selected Study Queue packet behavior.

## Readiness / CDP check from this tick

Chrome CDP was reachable at the local debugging endpoint and exposed sanitized tab metadata. Read-only Runtime inspection had mixed results:

- GTO Wizard `/solutions` succeeded. The DOM reported `readyState: complete`, 9 buttons, 18 links, 2 role nodes, and 499 stable test-attribute nodes. The sanitized selector sample included workflow/navigation and state-control families such as `variant-switcher`, `study-menu-*`, `practice-menu-*`, `analyze-menu-*`, `upload-button`, `solution-browser`, `study_layer`, `shrtbtn_reset_history`, `shrtbtn_save_spot`, `shrtbtn_practice_spot`, `gmf_selector_opener`, `hs_*`, and `hspotcrd_action`.
- RegLife lesson, PokerTrainer, and GTO Wizard login tabs were present but timed out on read-only Runtime evaluation in this tick.
- No login, account, payment, upload, trainer-answer, solver-frequency, raw hand-history, villain-name, screenshot, or tokenized-URL action was attempted.

2026-06-30 continuation: a follow-up CDP readiness pass used both direct page WebSockets and browser-level `Target.attachToTarget` as a fallback. GTO Wizard `/solutions` remained inspectable and again exposed the workflow/config/state-control spine (Study/Practice/Analyze/Upload adjacency, source/config selector, reset/history/save/practice controls, action-tree cards, range/table surfaces, stable `data-tst` families). RegLife lesson and PokerTrainer tabs were still listed, but both timed out under the direct-target and browser-attach strategies. The raw execution logs are local-only under `.agents/runs/`; the product-facing conclusion is only the abstraction above, not external selector reuse or proprietary strategy data.

## Route contract to manually QA

Use local/demo data or a private imported sample that produces at least one sanitized Study Queue `SpotPacket`. The tester should never need credentials, network upload, account pages, or trainer-answer submission.

| Surface | Stable selector / route | Expected state | Refusal / privacy boundary |
|---|---|---|---|
| Dashboard Study Queue | `study-queue-card`, `study-queue-next-packet-review-link`, `study-queue-next-packet-arena-link`, `study-queue-packet-bundle-config` | A next/due packet is selected; the source/config drawer shows packet coverage, parser confidence, warnings, local progress, and reset controls. The Hand Replay link targets `/hands?panel=spot-packet&reviewHand=...#spot-packet`; the Arena link targets `/arena?drill=study-queue&handId=...#study-packet-drill` and may include ordered `handIds`/`packetIds`. | Copy says local-only / study packet / no solver EV / no trainer answers. Local progress stores only packet IDs, hand IDs, SRS dates, and markers — not raw hands, villains, answers, scores, or EV. |
| Coach's Note | `coachs-note-study-packet`, `coachs-note-study-packet-review-link`, `coachs-note-study-packet-arena-link`, `coachs-note-final-drill-link` | When a packet is selectable, Coach shows the same next/due packet as the Study Queue router and both packet drill links use the packet-specific Arena route. When no packet is selectable, the final CTA falls back to `/arena`. | No EV-loss, correct-answer, trainer-score, raw hand text, local path, account, or villain-name claim appears in the Coach packet copy. |
| Arena active drill | `arena-study-queue-source`, `arena-study-packet-menu`, `arena-action-*` | The route auto-starts the requested imported hand sequence in order, surfaces the SpotPacket legal-action menu/caveats, and displays `STUDY` rather than a solver-looking mode. Multi-packet routes advance in URL order. | All-in, bet-size, and unsupported/ungraded local-rule spots remain `REVIEW ONLY`; they do not increment a scored denominator or store a trainer answer. |
| Arena completion | `arena-study-session-complete`, `arena-session-dashboard-link`, `arena-session-hand-replay-link` | Completion reports reviewed packet count, local SRS next-due copy, dashboard return, and a last-packet Hand Replay link. | Completion copy says browser-local progress only and excludes solver EV, trainer answer, trainer score, raw hand text, and villain names. |
| Hand Replay packet review | `spot-source-panel`, `spot-source-panel-legal-menu`, `spot-source-panel-caveats`, `trainer-spot-card`, `trainer-spot-card-action-path`, `trainer-spot-card-legal-actions` | Hand Replay opens the requested local hand with SpotSourcePanel and TrainerSpotCard visible, including evidence label, legal menu, risk/preflop context when available, action path, and seat-map abstractions. | Sanitized panels do not expose raw hand histories, local paths, or raw villain names; JSON export stays local-only and no-solver/no-EV/no-scoring. |
| Data Health fallback | `study-queue-data-health-link`, `/hands?panel=data-health#data-health` | If the ranked queue is driven by source/context caveats rather than a gradeable packet, the flow routes to Data Health instead of pretending a solver-ready drill exists. | Low/medium confidence, unsupported source, and warning categories remain visible before leak conclusions. |

## Suggested manual sequence

1. Load or seed local data until the Dashboard shows `study-queue-card` with at least one packet in the bundle.
2. Open the source/config drawer and confirm packet coverage, warnings, progress summary, and reset copy are visible before any drill action.
3. Use `Review next packet`; verify Hand Replay opens the matching local hand and shows `spot-source-panel` plus `trainer-spot-card` without raw villains or raw hand text.
4. Return to Dashboard and use `Drill in Arena`; verify the Arena auto-starts the same hand/packet route, uses packet legal actions, and shows `STUDY`/study-only copy.
5. Choose a review-only action when available; verify feedback says `REVIEW ONLY` and score remains `0 / 0` for ungraded/all-in paths.
6. Complete a multi-packet sequence if available; verify completion shows reviewed count, local SRS due copy, dashboard return, and last-packet Hand Replay link.
7. Open `/coach`; verify the packet panel and final drill CTA point to the same packet-specific Arena route, or fall back to generic `/arena` only when no packet exists.
8. Inspect browser localStorage for `poker-hermes.studyPacketProgress.v1`; confirm entries contain packet/hand IDs and timing markers only.

## Self-contained smoke candidate

Because private study-tool tabs can be unavailable or unresponsive even when Chrome CDP itself is reachable, the next automated QA slice should use local/demo imported hands and in-repo stable selectors rather than depending on RegLife/PokerTrainer/GTO Wizard page state.

Minimum smoke contract:

1. Seed or load local hands that produce at least two sanitized Study Queue packets: one gradeable local-rule packet and one review-only/refusal packet.
2. Assert the Dashboard packet drawer and Coach packet card agree on the selected due/next packet key and source evidence label.
3. Follow the packet Arena route and verify ordered packet progression, `REVIEW ONLY` treatment for ungraded/all-in/refusal spots, browser-local SRS progress copy, and completion links.
4. Return through the completion Hand Replay link and verify `spot-source-panel` plus `trainer-spot-card` render legal actions/caveats without raw hand text, villain names, local paths, solver EV, trainer answers, or trainer scores.
5. Exercise the Data Health fallback route when no safe packet is available.

Runner note: this repo currently has Vitest/jsdom coverage for the route pieces and no Playwright dependency in `package.json`. If a real browser runner is added later, keep it local-only and seed sanitized demo data; otherwise extend the existing Vitest route-contract tests first.

## Implementation handoff candidates

### Now

Use this checklist as the bounded manual/CDP QA contract before refactoring the Study Queue, Coach, Arena, or Hand Replay route loop. It converts the current private/tool workflow evidence into a repeatable local route audit without adding new solver claims.

2026-06-30 follow-up: the Arena completion exit path now has a focused regression for delimiter-sensitive hand/packet IDs. The test starts a multi-packet Study Queue drill with comma/slash/space/non-ASCII IDs, completes both review-only prompts, and verifies the final `Open last packet` link targets the encoded Hand Replay packet route for the last reviewed hand.

2026-06-30 follow-up: the self-contained route-contract smoke now also covers the no-actionable future-SRS state. Dashboard withholds packet-specific Hand Replay/Arena CTAs while keeping the Data Health deep-link available, and Coach falls back to generic `/arena` when no packet is due or untouched.

### Later

- Turn this checklist into a lightweight e2e/storybook-style smoke once a browser runner is chosen for the repo.
- Extend the special-character route-contract coverage into a real browser/manual QA pass once a browser runner is chosen for the repo.
- Retry RegLife/PokerTrainer read-only DOM inspection only when the existing authenticated tabs respond; do not submit trainer answers or alter progress.

## Claim generated

- `C-UX-STUDY-002`
- `C-UX-STUDY-004`
- `C-UX-STUDY-007`
