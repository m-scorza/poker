# Design Research

Scope: public design references, competitor UX patterns, and product-fit design principles for the private poker study coach/career cockpit.

## Capture format

For each reference:

- Source ID from `../SOURCE_LEDGER.md`.
- Screenshot/URL/date, if public and safe.
- What pattern is useful.
- Why it fits or does not fit poker study.
- Product surface affected: Upload, Data Health, Leak Priorities, Study Queue, Hand Review, Arena, Career, Settings.
- Safe implementation abstraction.

## Bias

Avoid casino/neon/HUD imitation unless it improves clarity. Prefer trustworthy analytic workflows: command center, evidence ledger, drill queue, proof hands, and confidence labels.

## Captures

- [2026-06-28 GTO Wizard + RegLife Trainer design patterns](./2026-06-28-gto-wizard-reglife-trainer-design-patterns.md) — authorized private/design abstraction pass covering source/config panels, trainer decision-state cards, legal action menus, matrix/detail split, stable selectors, and feedback tiers.
- [2026-06-30 Study Loop selector/state QA pass](./2026-06-30-study-loop-selector-state-qa.md) — sanitized CDP + internal-code comparison for source/config-first study loops, local progress controls, practice routes, and stable selector gaps.
- [2026-06-30 Local Study Loop manual QA checklist](./2026-06-30-local-study-loop-manual-qa.md) — route-contract checklist for Dashboard Study Queue → Coach packet → Arena packet drill → Hand Replay, grounded in current tests/code plus sanitized CDP selector evidence.
- [2026-07-01 Local Study Loop route-contract execution](./2026-07-01-local-study-loop-route-contract-execution.md) — read-only CDP readiness refresh plus focused Vitest proof that the local Study Queue → Coach → Arena → Hand Replay/Data Health route contract is self-contained and private-safe.
- [2026-07-01 Stable Selector crosswalk](./2026-07-01-stable-selector-crosswalk.md) — sanitized CDP + local `data-testid` inventory showing strong Study Queue/Coach/Arena selector coverage and the next Hand Replay/Data Health anchor gap before browser-runner QA.
- [2026-07-01 Browser Runner readiness](./2026-07-01-browser-runner-readiness.md) — sanitized CDP + repo toolchain check showing that a real browser smoke should be a separate dependency/tooling slice; the current gate remains the local route-contract Vitest.
- [2026-07-01 CDP structural probe operational note](./2026-07-01-cdp-structural-probe-operational-note.md) — same-day CDP attach/readiness follow-up: `suppress_origin=True` resolves Chrome Origin rejection for GTO Wizard structural probes, while RegLife/PokerTrainer timeouts remain non-blocking and local Study Queue QA stays self-contained.
