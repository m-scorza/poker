# Browser Runner Readiness for Local Study-Loop QA

Date: 2026-07-01

Source posture: mixed internal toolchain inventory plus user-authorized private/tool workflow evidence.

Usage status: safe-to-implement-as-abstraction for workflow/testability concepts only; not public evidence and not a license to copy proprietary solver ranges, frequencies, chart data, account data, trainer answers, private URLs, or private product copy.

## Research question

Can the next local Study Queue -> Coach -> Arena -> Hand Replay/Data Health smoke move from the self-contained Vitest route contract to a real browser runner in this worktree without adding dependency or auth risk?

## Sources used

- `S-AUTH-GTOW-009` — read-only Chrome/CDP readiness probe against existing user-authorized study-tool tabs; raw query/account/token data not retained.
- `S-INT-CODE-023` — package/config/bin inventory for browser-runner tooling in the current repo.
- `S-INT-CODE-022` — current self-contained route-contract smoke that already asserts real Hand Replay and Data Health terminal anchors.
- `S-INT-CODE-020` / `S-INT-CODE-021` — prior selector inventory and new terminal-anchor implementation.

## Readiness result

Chrome CDP remained reachable and existing authenticated tabs were present. A sanitized read-only probe used Python WebSocket CDP commands and wrote only a sanitized run artifact under `.agents/runs/2026-07-01-browser-readiness/cdp_probe.json`.

Result:

- GTO Wizard `/solutions` was inspectable and still showed broad stable selector instrumentation (`data-tst` nodes) around the private-tool workflow. This supports the abstraction that serious study tools benefit from stable hooks around source/config, action history, tabs, and state controls.
- RegLife lesson, RegLife PokerTrainer, and a GTO Wizard login tab were present but timed out at `Runtime.enable`. No login, account, payment, upload, storage, progress-changing, trainer-answer, solver-frequency/range, screenshot, or raw-private-URL action was attempted.
- A public Google search tab was also present but is not product evidence for this slice.

The local browser-runner toolchain is not ready as an existing repo capability:

- `package.json` declares no `@playwright/test`, `playwright`, `puppeteer`, `cypress`, `webdriverio`, or `selenium-webdriver` dependency.
- No `playwright.config.*`, `cypress.config.*`, `*.spec.ts`, or `*.e2e.*` files were found in the repo.
- `node_modules/.bin/playwright`, `node_modules/.bin/cypress`, and `node_modules/.bin/puppeteer` are absent.

## Finding / concept

Finding: a real browser-runner smoke is the right later direction, but it is not a safe implicit next step inside this dirty autonomous cron worktree because adding Playwright/Cypress would be a dependency/tooling change. The current repeatable gate should remain the local Vitest route-contract smoke until a separate dependency-change slice is explicitly scoped.

- Source(s): `S-AUTH-GTOW-009`, `S-INT-CODE-023`, `S-INT-CODE-022`, `S-INT-CODE-020`, `S-INT-CODE-021`
- Source type: user-authorized private/tool result plus internal repo/toolchain evidence
- Confidence: high
- IP / usage status: safe-to-implement-as-abstraction; GTO Wizard remains private/tool workflow evidence only; RegLife remains licensed-private brand-neutral scope only
- Product implication: preserve `src/__tests__/studyQueueRouteContract.test.tsx` as the required local smoke gate for Study Queue / Coach / Arena / Hand Replay / Data Health refactors. Treat browser automation as a separate repo/tooling decision, not as a hidden cron install.
- Implementation candidate: if the user wants browser-runner QA, add `@playwright/test` plus a local-only seeded demo/imported-packet smoke in a dedicated dependency-change branch. The smoke should assert owned selectors only and should not automate private GTO Wizard/RegLife/PokerTrainer tabs.
- Validation needed: continue running the route-contract Vitest now; for later browser QA, require package-lock review, privacy check, docs update, and no network/private-site dependency in the test.
- Competitor comparison: GTO Wizard validates stable workflow hooks, but the app's wedge remains private/local study-loop QA driven by sanitized packets and owned selectors rather than external private-tab automation.

## Implementation handoff candidate

### Now

Problem / opportunity: the previous handoff suggested a browser smoke if tooling was available; this readiness pass establishes that no such runner is currently declared or installed.

Evidence summary: CDP is reachable and useful for workflow inspiration, but RegLife/PokerTrainer tabs remain opportunistic. Local package/config/bin checks show no browser-runner stack. The route-contract test already covers the terminal Hand Replay and Data Health anchors without private-tab dependency.

Safe abstraction to preserve: source/config-first local study loop, owned stable selectors, sanitized `SpotPacket` handoff, browser-local SRS metadata, and explicit no-solver/no-answer/no-score/privacy boundaries.

Files likely touched by future implementation:

- `package.json` / `package-lock.json` if a browser runner is added later.
- A new local-only browser smoke under a clearly named test/e2e folder.
- `src/__tests__/studyQueueRouteContract.test.tsx` remains the current gate until that later slice lands.

Acceptance criteria for a later browser-runner slice:

- Uses sanitized local/demo packet data, not private study-tool tabs.
- Asserts owned selectors such as `study-queue-*`, `coachs-note-*`, `arena-study-*`, `hand-replay-*`, `spot-source-panel`, `trainer-spot-card`, `hands-upload-*`, and `import-data-health-panel`.
- Does not store or display raw hand histories, local paths, private villain names, account data, screenshots, solver EV/frequencies, trainer answers, or trainer scores.
- Runs deterministically in CI/local without requiring Chrome user profile auth.

Tests / verification for this docs slice:

- `npm run docs:check`
- `git diff --check`
- `npx vitest run src/__tests__/agentKernel.test.ts --reporter=verbose`

Risks and refusal boundaries:

- Do not install browser-runner dependencies implicitly from cron.
- Do not drive login/MFA/account/payment/upload flows.
- Do not submit PokerTrainer answers or alter external progress.
- Do not label local route QA as solver-backed validation.

## Claim generated

- `C-UX-STUDY-010`
