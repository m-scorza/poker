# Solver Boundary

**Created:** 2026-05-18

This product may eventually compare selected hands against solver-like outputs, but current analysis must not imply solver-backed EV unless a real solver adapter covers the spot.

## Current implementation

`src/analysis/solverAdapter.ts` defines the boundary only:

- `SolverSpotInput` — normalized spot payload in bb units.
- `SolverCoverage` — explicit coverage status and confidence.
- `SolverRecommendation` — future action/frequency output shape.
- `SolverAnalysisResult` — result metadata with `evidenceKind` and nullable `evLossBb`.
- `createUnsupportedSolverAdapter()` — safe default adapter that returns no recommendation and no EV loss.
- `buildSolverSpotInputFromParsedHand()` — narrow preflop-only converter from parsed hand plus `HeroDecision` into a bb-normalized spot, with explicit warnings instead of guessed context.
- `classifySolverCoverage()` — readiness classifier that can be used by future real adapters while the default unsupported adapter still short-circuits to `no_solver_configured`.
- `createDeterministicProxySolverAdapter()` — internal-only deterministic proxy fixture that exercises the adapter boundary for tests/UI flows without solver-backed evidence or EV-loss claims.

The default adapter always reports:

- `coverage.status: "unsupported"`
- `coverage.reason: "no_solver_configured"`
- `coverage.confidence: "none"`
- `evidenceKind: "unsupported"`
- `evLossBb: null`

The deterministic proxy adapter is only test scaffolding. It may return a deterministic recommendation for structurally covered spots so UI/internal tests can exercise the boundary, but it always keeps `evLossBb: null`, labels covered outputs as `proxy_model`, and downgrades unsupported, ICM, or bounty-sensitive spots to no recommendation.

## Evidence labels

Use these labels consistently:

| Label | Meaning | EV language allowed? |
|---|---|---|
| `unsupported` | No solver/proxy/rule engine can evaluate the spot. | No. |
| `rule_based` | A human-coded heuristic or range rule flagged the spot. | No solver EV claims. May use review-priority language. |
| `proxy_model` | A non-solver estimate ranks or scores spots. | No solver EV claims. Must show confidence and approximation caveat. |
| `solver_backed` | A configured solver adapter covered the spot. | EV language allowed only for covered inputs with source/version metadata. |

## Guardrails

- Do not display `evLossBb` unless `evidenceKind === "solver_backed"` or a future proxy field is explicitly labeled as proxy-only.
- Keep bb units at the boundary; raw chip loss should not drive hand-level advice.
- Coverage classification must happen before recommendations are shown.
- If required context is missing, return unsupported or partial coverage instead of guessing.
- ICM and bounty spots need explicit coverage metadata; do not treat chip-EV and tournament-EV as interchangeable.

## Next implementation slices

1. Add a second converter slice for flop spots only after pot/action reconstruction tests prove the spot is the state before hero's decision.
2. Use [2026-06-04 solver feasibility](../research/2026-06-04-solver-feasibility.md) as the current research baseline: no real adapter should be wired until an offline CLI spike proves license, runtime, memory, spot construction, and output metadata.
3. Wire proxy outputs into isolated UI/internal fixtures only if the UI clearly labels them `proxy_model` and never displays solver EV.
