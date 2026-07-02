# Poker Brain Research

Scope: tournament-first poker knowledge that may improve leak detection, hand explanations, study queues, drills, or future solver/reference boundaries.

## Protocols

- [2026-06-28 user-authorized knowledge access protocol](./2026-06-28-user-authorized-knowledge-access-protocol.md) — how to use poker schools, GTO Wizard, and other authenticated study sources without leaking proprietary material into product code/copy.

## Authorized sessions

- [2026-06-28 RegLife / GTO Wizard authorized session 01](./2026-06-28-reglife-gtowizard-auth-session-01.md) — initial visible-tab inventory from RegLife curriculum/trainer and GTO Wizard preflop solution workflow.
- [2026-06-28 RegLife autonav deep pass 02](./2026-06-28-reglife-autonav-deep-pass-02.md) — autonomous navigation/extraction pass over RegLife open-raise and BB multiway material, including licensed-private PDF extraction to local cache.
- [2026-06-28 GTO Wizard / RegLife Trainer DOM + design pass 03](./2026-06-28-gto-wizard-trainer-dom-design-pass-03.md) — CDP/DOM inspection of RegLife PokerTrainer config/schema and GTO Wizard preflop solution workflow/design.
- [2026-06-28 GTO Wizard Analyze / Upload workflow pass 04](./2026-06-28-gto-wizard-analyze-upload-pass-04.md) — immediate continuation pass after cron/local-delivery clarification; extracts GTO Wizard Analyze workspace tabs and upload-state implications.
- [2026-06-28 RegLife ICM / risk premium / BB defense pass 04](./2026-06-28-reglife-icm-risk-premium-bb-defense-pass-04.md) — extracted the licensed-private `ICM NA PRÁTICA` PDF into risk-advantage, BB-defense-under-ICM, final-table, and SpotPacket context candidates.

## Implementation-candidate passes

- [2026-07-01 PKO / ICM missing-context study taxonomy](./2026-07-01-pko-icm-missing-context-study-taxonomy.md) — maps existing bounty/ICM KB and code boundaries into safe SpotPacket warning, Study Queue taxonomy, and fixture candidates without adding solver-backed claims.

## Output shape

Each research note should include:

- Research question.
- Sources used, with source IDs from `../SOURCE_LEDGER.md`.
- Claims generated, with claim IDs from `../CLAIMS_LEDGER.md`.
- Product implications.
- Safe-to-code candidates.
- Tests/fixtures needed.
- Refusal boundaries: spots we should not grade yet.

## Guardrails

- RegLife material may be used brand-neutrally inside the user-stated permission scope; label it as licensed-private/brand-neutral rather than public.
- For other private sources, prefer independently phrased abstractions unless direct reuse permission is recorded.
- Prefer independently phrased abstractions: stage, stack depth, position, pot odds, risk premium, coverage, confidence.
- Avoid false overfold regressions: scenario detection must classify what happened before hero's action.
- Keep hand-level raw chips secondary; use bb deltas and bb/100 for performance contexts.
- Solver-looking features must disclose whether they are rule-based, proxy/reference-based, or solver-backed.
