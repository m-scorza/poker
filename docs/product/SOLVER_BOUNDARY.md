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

The default adapter always reports:

- `coverage.status: "unsupported"`
- `coverage.reason: "no_solver_configured"`
- `coverage.confidence: "none"`
- `evidenceKind: "unsupported"`
- `evLossBb: null`

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

1. Add converters from parsed `Hand`/`HeroDecision` into `SolverSpotInput` for a narrow preflop-only subset.
2. Add coverage classifiers for unsupported game types, missing cards/board/action context, stack-depth caps, and ICM/bounty exclusions.
3. Add a fake deterministic adapter for UI/testing that is clearly `proxy_model` or `unsupported`, not `solver_backed`.
4. Research and choose a real adapter only after license/performance/coverage review.
