# GTO Wizard + RegLife Trainer Design Patterns

Date: 2026-06-28  
Source IDs: S-AUTH-REGLIFE-005, S-AUTH-GTOW-002  
Scope: product-fit UI/UX abstractions from authorized RegLife PokerTrainer and GTO Wizard screens.

## Pattern 1 — Source/config before recommendation

GTO Wizard makes the game tree configuration visible before strategy output:

- game family,
- format,
- stack depth,
- table size,
- stake/config family,
- cold-call/open-size assumptions,
- positions and action tree.

Product abstraction: every Hand Review / Study Queue / external review packet should begin with a compact `SpotSourcePanel`:

```text
Source: PokerStars HH / RegLife module / GTO Wizard workflow / Local rule
Mode: chipEV | ICM | bounty | unknown
Table: 8-max MTT, ante/blind context when known
Stack bucket: hero/villain/effective bb
Action history: opener, callers, sizing, players left
Evidence: rule-based | study-packet-only | solver-backed | licensed-private reference
Warnings: missing ICM, rake caveat, unsupported room, multiway caveat
```

## Pattern 2 — Full decision state, not just hand label

RegLife Trainer's screen is a complete decision state:

- prior action breadcrumb,
- all active seats and stacks,
- pot and blind/open chips,
- hero cards,
- legal action menu.

Product abstraction: a drill card should never say only “UTG1 with 55”. It needs to render the full spot packet.

## Pattern 3 — Legal action menu as primary UI

RegLife uses a finite, visible action menu with consistent color semantics:

- fold = blue,
- call = green,
- raises/all-in = red intensity family.

Product abstraction: use the same semantic action colors across drill UI, hand review, range matrix, and future trainer sessions. Keep legal actions explicit and avoid free-form recommendations until source/caveats are visible.

## Pattern 4 — Matrix + explanation split

GTO Wizard's screen pairs a large hand matrix with a right-side detail panel:

- left: range/strategy matrix,
- top/right: action frequencies and combo counts,
- right/bottom: selected hand/cards, blockers, summary, filters,
- small explanatory concepts like pot odds.

Product abstraction for our app:

- left/main: imported hands or range grid;
- right/side: why this spot matters, source evidence, action mix/proxy, confidence, next drill;
- never hide the assumptions panel.

## Pattern 5 — Stable selectors for agent/test inspection

GTO Wizard exposes stable `data-tst` attributes for key navigation and actions. RegLife Trainer exposes semantic CSS class names for table/action components.

Product abstraction: add stable `data-testid`/`data-tst` to any surface Hermes may inspect, test, or use for browser automation:

- upload status,
- data health warnings,
- leak priority card,
- hand review spot panel,
- trainer action buttons,
- source/config panel,
- study queue item,
- external review packet button.

## Pattern 6 — Coach/trainer feedback tiers

RegLife separates trainer session feedback into score thresholds. Product abstraction:

- action feedback: correct/mixed/unsupported for this exact spot;
- session feedback: score/threshold encouragement;
- study routing: missed category -> lesson/drill;
- progress feedback: “repeat this spot family” rather than generic praise.

## Surfaces affected

- Hand Review
- Arena / future Drill mode
- Study Queue
- Range Matrix
- Data Health / import confidence
- External review packet export
- Progress dashboard

## 2026-06-29 CDP continuation note

A sanitized Chrome/CDP smoke pass found authenticated/open tabs for RegLife lesson, RegLife PokerTrainer, and GTO Wizard. The GTO Wizard solution tab was inspectable through the browser target, while the RegLife lesson and PokerTrainer page targets were listed but did not respond to read-only DOM evaluation in this run. No login, account, payment, or trainer-answer interaction was attempted.

Source posture: this continues S-AUTH-GTOW-002 as user-authorized private/tool evidence for workflow/design abstraction only.

Reusable abstraction confirmed from the inspectable GTO Wizard tab:

- keep Study/Practice/Analyze/Upload routes adjacent to support an import-to-practice loop;
- show game/config/action-tree context before any strategy-looking output;
- render finite action choices as visible cards/pills, including sizes when known;
- keep matrix/list, action summary, breakdown/report tabs, and practice CTA as separate workflow surfaces;
- keep stable selectors on our own corresponding surfaces so future browser/CDP checks do not depend on raw visual scraping.

Implementation tie-in: `SpotSourcePanel` should keep surfacing source/config, legal actions, caveats, and now preflop caller/squeeze/iso context before any downstream review/export action.

## 2026-06-29 TrainerSpotCard implementation note

A follow-up sanitized CDP pass reconfirmed the GTO Wizard Solutions target exposes stable `data-tst` navigation/action selectors and visible Study/Practice/Analyze/Upload workflow affordances. RegLife lesson/PokerTrainer tabs remained listed but timed out on read-only Runtime evaluation, so no trainer answer interaction or private DOM extraction was attempted in this run.

Implementation outcome: `TrainerSpotCard` is now a neutral local drill-prompt component backed by `SpotPacket`. It renders the full decision state, anonymized seat/stacks, preflop action path, and finite legal action menu with stable `data-testid` hooks while explicitly omitting answer buttons, trainer scoring, solver EV, and raw villain names.

## 2026-06-29 Study Queue bundle drawer implementation note

Chrome/CDP remained reachable at the tab-list level, but Runtime evaluation against RegLife, PokerTrainer, and GTO Wizard page targets was blocked by the browser's remote-origin guard in this cron tick. No login/account/payment/trainer-answer flow was touched.

Implementation outcome: `StudyPlanCard` now includes a compact SpotPacket source/config drawer for Study Queue bundles. It previews target/evidence, packet coverage, next-packet hero/scenario/source, warning summary, and omission reasons before export, with stable `data-testid` hooks and the same no-solver/no-trainer-scoring/no-raw-hand boundary.

## 2026-06-29 Study Queue local progress implementation note

A sanitized CDP continuation used `suppress_origin=True` for the Chrome DevTools WebSocket and inspected the authenticated GTO Wizard Solutions target without retaining raw URLs or account data. The visible workflow again showed adjacent Study/Practice/Analyze/Upload routes, solution/report affordances, and finite action labels. RegLife lesson and PokerTrainer page targets remained listed but timed out on read-only WebSocket inspection; no login, account, payment, trainer-answer, or quota-consuming action was attempted.

Implementation outcome: `StudyPlanCard` now records browser-local reviewed/starred/snoozed markers for the next Study Queue SpotPacket, marks a packet reviewed when the Hand Replay link is opened, and summarizes bundle progress. The markers are local convenience metadata only and explicitly do not store trainer answers, scores, solver EV, raw hand text, local paths, or villain names.

## Safe next UI slice

Use the local progress markers to optionally de-prioritize reviewed/snoozed Study Queue packets, or continue the correctness lane with honest leak denominators now that `FACING_3BET` exclusion is represented in source/status docs.

## 2026-06-29 CDP selector/status refresh

A fresh sanitized Chrome/CDP pass at 18:31 local time confirmed:

- the GTO Wizard Solutions page remained inspectable with origin/path only retained (`/solutions`), stable selector names such as `analyze-menu-opener`, `analyze-menu-link`, `hspotcrd_action`, `gmf_selector_opener`, and per-position history selectors visible;
- the visible workflow still keeps Study, Practice, Analyze, Upgrade/Upload, focus/help/settings/account affordances adjacent to the study surface;
- finite action labels and game/config context are visible before any strategy-looking matrix output;
- RegLife lesson, RegLife PokerTrainer, and the GTO Wizard login tab were listed but timed out under read-only Runtime evaluation, so no login/account/payment/trainer-answer flow was touched.

Usage status: this continues `S-AUTH-GTOW-002` as user-authorized private/tool evidence for workflow/config/testability abstraction only. No raw tokenized URLs, account details, proprietary ranges, trainer answers, solver EV, or screenshots were committed.

Implementation implication: the current `SpotSourcePanel`, `TrainerSpotCard`, Study Queue bundle drawer, and local progress controls are aligned with the stable-selector/source-config pattern. The next safe UI product slice should shift from packet export mechanics to the Act II coach loop: Stats/Leaks refusal surfacing or own-mistake SRS drill routing.

## 2026-06-29 Study Queue local SRS routing implementation note

The next Act II coach-loop slice starts the own-mistake SRS path without trainer answers or solver feedback. `StudyPlanCard` now treats reviewed Study Queue `SpotPacket`s as browser-local spaced-repeat prompts: marking a packet reviewed records only local repetition metadata (`reviewedAt`, `lastDrilledAt`, `nextDueAt`, `repetitionCount`, `intervalDays`), and due reviewed packets route back into the next-packet CTA before untouched packets unless snoozed.

This is intentionally not a scored trainer and not a solver replay. The stored metadata does not include answers, score thresholds, EV, raw hand text, local paths, villain names, or account/source tokens. It only lets the dashboard recycle the user's own sanitized mistakes on a conservative 1/3/7/14/30-day cadence.

Next safe slice: connect the SRS due state to Arena/Drill entry or add refusal/data-health states to Stats/Leaks so unsupported scenarios are visible rather than silently omitted.

## 2026-06-29 Leaks Data Health refusal implementation note

A sanitized CDP pass confirmed the GTO Wizard Solutions target remained inspectable with stable workflow selectors and adjacent Study/Practice/Analyze/Upgrade affordances; RegLife and PokerTrainer targets were present but timed out under read-only Runtime evaluation, so no login/account/payment/trainer-answer flow was touched.

Implementation outcome: `LeaksPage` now surfaces low/medium import confidence before the leak cards as an explicit refusal/triage state. The notice distinguishes blocked vs directional posture, shows parsed-file rate, failed files, saved records, top warning categories, and links directly to `/hands?panel=data-health#data-health`. This keeps unparsed/unsupported sources visible in the coach loop instead of letting missing or biased samples look clean.

Next safe slice: add scenario aggregate counts for ungraded/refused decisions (`FACING_3BET`, `FACING_ALL_IN`, `BB_VS_RAISE_MULTIWAY`, `BB_VS_LARGE_RAISE`, `BB_VS_LIMP`) outside Hand Replay, or feed due Study Queue packets into Arena/dedicated drills.

## 2026-06-30 Study Queue SRS reset-control implementation note

A sanitized CDP pass found RegLife lesson, RegLife PokerTrainer, and GTO Wizard page targets still open. Read-only Runtime inspection succeeded for the authenticated GTO Wizard Solutions page and confirmed adjacent Study/Practice/Analyze/Upload affordances, stable `data-tst` selectors, and the same workflow/config-before-output pattern; RegLife/PokerTrainer targets timed out on read-only evaluation in this run. No login, account, payment, upload, or trainer-answer interaction was attempted, and no raw tokenized URLs, account data, solver values, screenshots, or private trainer answers were retained.

Implementation outcome: `studyPacketProgress` now has a narrow reset path for one sanitized packet key, and `StudyPlanCard` exposes a Reset button next to Reviewed/Star/Snooze. The control clears only browser-local progress/SRS metadata for that packet and keeps the no-answer/no-score/no-EV/no-raw-hand boundary intact. This gives users a safe way to restart a local SRS packet without deleting imported hands or changing any analysis result.

Next safe slice: add a small Study Queue progress overview (due count, snoozed count, reset affordance copy) outside the bundle drawer, or continue the Act II coach loop by surfacing due Study Queue packets in the Coach's Note page.

## 2026-06-30 Study Queue progress-overview implementation note

A sanitized CDP continuation found the RegLife lesson, RegLife PokerTrainer, and GTO Wizard Solutions targets still open. Read-only DOM inspection succeeded only for the GTO Wizard Solutions target and reconfirmed adjacent Study/Practice/Analyze/Upload workflow affordances plus stable selector families such as study/practice/analyze menu hooks, upload button, solution browser, source/config selector, action-card, and strategy-tab hooks. The local CDP log was sanitized after collection; raw strategy labels, combo counts, frequencies, account/menu details, query strings, screenshots, and trainer answers were not retained. RegLife and PokerTrainer targets timed out on read-only inspection; no login, account, payment, upload, or trainer-answer action was attempted.

Implementation outcome: `StudyPlanCard` now promotes Study Queue progress outside the source/config drawer with reviewed/starred/snoozed/due-now counts, due/snoozed routing copy, next-packet SRS status, and a reset-location cue. The drawer still owns the actual reset button, which clears only the selected browser-local marker and stores no answers, scores, solver EV, raw hand text, local paths, or villain names.

Next safe slice: feed due Study Queue packets into Coach's Note so the coach surface can say “study this now” without creating solver-backed grades, or add manual visual QA around the new dashboard progress block.
