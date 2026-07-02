# Solver and Tool Feasibility Research

Scope: open-source solvers, commercial solver/API options, local computation, browser/WASM options, OCR/video/research tooling, and cost/licensing constraints.

## Feasibility tiers

1. Rule-based heuristics and explicit refusals.
2. Static references / lookup tables.
3. Local equity, odds, and deterministic proxies.
4. Offline solver spike with sanitized fixtures.
5. Local packaged solver bridge.
6. Licensed/commercial solver API.
7. Cloud solver backend.

## Required fields for any candidate

- Source ID from `../SOURCE_LEDGER.md`.
- License and redistribution constraints.
- Runtime footprint: browser, desktop, local native, cloud.
- Privacy impact.
- Cost model.
- Minimal proof fixture.
- Product label: rule-based, reference-backed, proxy, or solver-backed.

See also: `../2026-06-04-solver-feasibility.md`.

## Refreshes

- [2026-06-28 solver feasibility refresh and SpotPacket design](./2026-06-28-solver-feasibility-refresh-and-spot-packet.md) — HRC-first solver/export target review and v1 solver-neutral study-packet boundary.
