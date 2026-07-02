# CDP Structural Probe Operational Note

Date: 2026-07-01

Source posture: user-authorized private/tool workflow evidence plus local toolchain execution notes.

Usage status: safe-to-implement-as-abstraction for workflow/testability concepts only. This note is not public evidence and is not a license to copy proprietary solver ranges, solver frequencies, chart data, account data, trainer answers, private URLs, or private product copy.

## Research question

Can the autonomous runner inspect existing authenticated study-tool tabs through Chrome CDP without copying private content, and what operational boundary should future runs use when direct WebSocket attach fails or private tabs time out?

## Sources used

- `S-AUTH-GTOW-010` — sanitized same-day CDP structural probe against existing GTO Wizard / RegLife / PokerTrainer tabs; local raw log is Gitignored under `.agents/runs/2026-07-01-cdp-structural-probe/probe.json`.
- `S-AUTH-GTOW-009` — earlier browser-runner readiness probe.
- `S-INT-CODE-023` — repo browser-runner/toolchain inventory.

## Readiness result

Chrome CDP at `127.0.0.1:9222` was reachable and listed the same relevant private-study targets: GTO Wizard `/solutions`, RegLife lesson, RegLife PokerTrainer, and a GTO Wizard login tab. The probe retained only host/path, sanitized titles, structural counts, visible high-level control labels, and selector-family samples.

Operational finding:

- A first direct WebSocket attach attempt failed with Chrome's Origin rejection (`403 Forbidden`) when an Origin header was sent.
- Repeating the attach with `websocket.create_connection(..., suppress_origin=True)` succeeded for the GTO Wizard `/solutions` page.
- That successful GTO Wizard page snapshot returned structural metadata only: 9 visible buttons, 24 links, 0 inputs, 2 iframes, and 120 sampled `data-tst` attributes. Visible controls included navigation/state affordances such as undo/redo, variant switching, Play/Study/Practice/Analyze, upload, account, and a practice-this-spot action, plus premium-gating copy.
- RegLife lesson, RegLife PokerTrainer, and the GTO Wizard login target still timed out under read-only `Runtime.evaluate`; no login, account, payment, upload, progress-changing, trainer-answer, screenshot, storage, solver-frequency/range, or raw-private-URL action was attempted.

## Finding / concept

Finding: CDP can remain useful for private-tool workflow inspiration, but it is an opportunistic research channel rather than a product QA gate. Future autonomous probes should use a sanitized structural whitelist, attach without an Origin header when Chrome rejects direct WebSocket connections, and immediately fall back to repo-visible local tests when private tabs time out.

- Source(s): `S-AUTH-GTOW-010`, `S-AUTH-GTOW-009`, `S-INT-CODE-023`
- Source type: user-authorized private/tool result plus internal toolchain inventory
- Confidence: high
- IP / usage status: GTO Wizard private/tool workflow abstraction only; RegLife licensed-private brand-neutral scope only; safe-to-implement-as-abstraction for our own workflow/testability patterns
- Product implication: keep local Study Queue / Coach / Arena / Hand Replay QA self-contained around owned selectors and sanitized packets. Do not require external private study-tool tabs for a passing product smoke.
- Implementation candidate: if CDP probing keeps recurring, factor the sanitized structural probe into a reusable local script that explicitly redacts query strings, account data, storage, screenshots, solver output, and trainer answers. Keep it as research/tooling, not as an app runtime feature.
- Validation needed: continue using `src/__tests__/studyQueueRouteContract.test.tsx` as the current local smoke gate; add a real browser runner only in a separate dependency/tooling slice.
- Competitor comparison: GTO Wizard reinforces dense stable workflow hooks around study navigation and practice routes, but the app's wedge remains a private/local analyzer with owned test selectors, not private-tab automation.

## Operational guardrail for future ticks

1. Sanitize target URLs to host/path only before logging.
2. Do not inspect cookies, localStorage, sessionStorage, account panels, payment flows, uploads, screenshots, solver tables, or trainer answer state.
3. Use a structural allowlist: counts, high-level visible controls, owned/public selector-family patterns, and readiness/timeouts.
4. Treat RegLife/PokerTrainer timeouts as non-blocking; continue repo-visible work instead of repeatedly probing the same frozen targets.
5. Do not install or configure a browser runner from cron; keep that as a scoped dependency-change task.

## Claim generated

- `C-UX-STUDY-011`
