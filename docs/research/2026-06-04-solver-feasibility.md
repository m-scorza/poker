# Solver Feasibility Refresh - 2026-06-04

## Verdict

Do not wire a real solver into the product yet.

The current app should remain a private/local, rule-based hand-history analyzer
with explicit no-solver caveats. Solver integration is technically possible as
a future offline/post-session spike, but no reviewed option is ready to become a
silent in-browser or user-facing EV-loss engine in this repo.

## Candidate Review

| Candidate | Current fit | Main blocker |
|---|---|---|
| [WASM Postflop](https://github.com/b-inary/wasm-postflop) | Interesting browser proof that a postflop solver can run through WebAssembly. | Development is suspended, license is AGPL-3.0, and runtime/memory footprint is too heavy for automatic per-hand review. |
| [postflop-solver](https://github.com/b-inary/postflop-solver) | Best technical reference for a Rust postflop engine boundary. | Development is suspended, license is AGPL-3.0, and the README says direct library use by other developers is not the primary purpose, with breaking changes possible. |
| [TexasSolver](https://github.com/bupticybee/TexasSolver) | Strongest native/offline candidate because it supports cross-language calls and dumping strategy to JSON. | Native/GPU/desktop integration does not match the current local browser app. License and packaging implications need review before product dependency. |
| [noambrown/poker_solver](https://github.com/noambrown/poker_solver) | Useful research-grade CFR reference and validation source. | It is a river subgame/research solver, not a drop-in NLHE tournament hand-review engine. |
| Commercial solvers/APIs | Could provide real EV and study workflow parity if API/licensing exists. | No clear license/API contract is present in this repo; do not depend on commercial solvers until terms are explicit. |

## Practical Path

1. Keep `src/analysis/solverAdapter.ts` as the boundary.
2. Keep `evLossBb` hidden unless `evidenceKind === "solver_backed"`.
3. Add no solver dependency to the app bundle in the current sprint.
4. If solver work resumes, start with an offline CLI spike:
   - input: sanitized single spot fixture
   - output: action frequencies, EVs if available, source/version metadata
   - timeout/memory envelope
   - license conclusion
   - comparison fixture against a known public solver output
5. Only after the offline spike passes should a Web Worker/WASM/native bridge be
   considered.

## Workaround for Current Product

For now, improve trust by making rule coverage explicit:

- show which facing-raise hero/opener pairs have encoded rule charts
- label those charts as rule-based, not solver-backed
- skip or caveat unsupported spots instead of guessing
- use sample size and data-health warnings to prevent overconfident advice

This is enough for private validation. It is not enough for a solver product.
