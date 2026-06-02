# Review Output Refresh - 2026-06-01

## Scope

Reviewed `C:\Users\MICRO\poker-review-output` against the current repo state on
branch `codex/review-output-refresh-2026-06-01`, based on `main` at `14e1fae`.

Primary external reports reviewed:

- `REPORT.md`
- `OPUS_DEEP_REVIEW.md`
- `HERMES_DEEP_VERIFICATION_REPORT.md`
- `findings/R01` through `R12`
- `research/W01` through `W07`

The old reports were written against an earlier May 24 working copy. Since then,
PRs #27 through #34 landed the main correctness batch: range position filtering,
OHH detection, c-bet guards, facing-raise ranges, villain stats persistence,
advanced analyzer context attachment, and test hygiene.

## Current Verdict

The May 24 reports are now stale in their highest-priority section. Most of the
old "fix now" findings are either fixed or were already overstated by Opus and
Hermes.

The codebase is in materially better shape than the external reports suggest:
full tests are green, typechecking is green, the stale Vitest cache failure is
gone, and the old Map serialization problem has been replaced by a record plus
raw counters.

The remaining risks are narrower but still important. They are mostly
integration and truth-in-product issues: per-hand ICM is detected but not used by
compliance recomputation, some advanced contexts are attached but barely surfaced,
and HandReplay can still recompute postflop advice differently from the import
pipeline.

## Finding Status

| Old finding | Current status | Evidence |
|---|---|---|
| "Range compliance always reads 0%" | Refuted / stale | `buildHeroDecision()` still initializes `isCompliant: false`, but worker/pages rerun `batchCheckCompliance()`. Full tests pass. |
| RangesPage selected position does not filter | Fixed | `RangesPage.tsx` now filters with `matchesPosition(d, selectedPos)` and `matchesScenario(...)`. |
| `MP` missing from `RFI_RANGES` | Fixed | `RFI_RANGES` now includes `MP: rangeSet(MP1_RANGE)`. |
| Suited gappers classified as broadway | Fixed | `HandsPage.getHandCategory()` returns `suited-gappers`; inline assertions cover `K5s`, `86s`, `Q4s`. |
| C-bet false positives after donk bets / no flop / OOP | Fixed in import pipeline | `scenarioDetector.ts` gates saw-flop, donk-before-hero, all-in, and passes a computed flop pot into `analyzePostflop()`. |
| Facing-raise fallback too loose / SB fallthrough | Mostly fixed | Unsupported pairs now skip instead of using a loose fallback; SB/late-position cases have focused tests. Dedicated reaction charts remain a strategy-data follow-up. |
| `statsByPosition` Map serialization and denominator bugs | Fixed | `VillainProfile.statsByPosition` is now `Partial<Record<Position, PositionStats>>` with persisted raw counters and store tests. |
| OHH JSON over 65KB misidentified | Fixed | `siteIdentifier.ts` checks full JSON/OHH shape before the 65KB text marker scan; tests cover large OHH JSON. |
| Worker lifecycle/concurrency cleanup | Fixed | `HandsUpload.tsx` terminates superseded/unmounted workers and gates stale callbacks with `importSeqRef`. |
| Bounty/final-table analyzers dead code | Partially fixed | `scenarioDetector.ts` attaches `bountyContext`, `fakeShoveSpot`, and `restealSpot` to `HeroDecision`, but UI surfacing remains limited. |
| Test isolation / missing coverage tooling | Fixed | `package.json` uses `vitest run`; coverage and `typecheck:test` are configured. |
| PWA icons missing | Still open | `vite.config.ts` references icons/assets, but there is no `public/` directory. |
| `poker-odds-calculator` should be pinned exactly | Still open | Dependency remains `^0.4.0` in `package.json` and `package-lock.json`. |

## Active Findings

### P1 - Per-hand ICM is detected but compliance recomputation still defaults to early

**Resolved 2026-06-02:** `checkCompliance()` now uses
`decision.icmStage ?? icmStage`, and `batchCheckCompliance()` /
`compliancePercentage()` inherit that per-decision behavior.

`buildHeroDecision()` attaches `icmStage`, and HandReplay can display it. But the
range-compliance call path still mostly ignores that per-hand field:

- `HandsUpload.tsx` posts `icmStage: 'early'` to the worker.
- `workerProcessor.ts` passes that payload-level stage into `batchCheckCompliance()`.
- Pages call `batchCheckCompliance(raw, strategyProfile)` or
  `compliancePercentage(..., strategyProfile)` without passing a stage.
- `batchCheckCompliance()` applies one stage to every decision instead of using
  `decision.icmStage ?? fallbackStage`.

Impact: Advanced-profile BB suited-fold rules can still be evaluated as early
game even when the hand itself was detected as bubble, ITM, or final-table. This
is much narrower than the old "ICM is all hardcoded early" report, but still a
real analytical-trust bug.

Recommended fix: complete. Regression coverage now covers Advanced
`BB_VS_RAISE` suited folds at bubble/final-table stages, including batch and
percentage recomputation.

### P1 - HandReplay can diverge from imported postflop analysis

The import path now calls `analyzePostflop()` with a computed flop-pot value.
HandReplay still recomputes the same analysis with `hand.totalPot`, which is the
final stored hand pot and can be much larger than the flop pot.

Impact: a hand can have one stored `HeroDecision.postflopActions` result, while
the replay modal displays a different sizing judgment. This is exactly the kind
of trust issue the old reports were worried about.

Recommended fix: prefer `heroDecision.postflopActions` in HandReplay when
available, or share the same pot-before-flop helper between scenario detection
and replay.

### P1 - Postflop notes still contain Portuguese-facing text

`postflopAnalyzer.ts` still emits notes such as `C-bet HU em board`,
`Recomendado`, `Double barrel no turn`, `Missed c-bet HU como PFR`, and
`Bet vs missed c-bet (correto)`.

Impact: these notes are visible in HandReplay and can feed user-facing analysis.
This contradicts the repo rule that UI copy stays English and the docs claim
that analysis-layer note strings were purged.

Recommended fix: translate the remaining notes and add a focused assertion that
postflop notes emitted by `analyzePostflop()` contain no Portuguese markers.

### P1 - Bounty/final-table context is attached but not surfaced enough for the docs claim

The old "dead code" finding is no longer accurate. `bountyContext`,
`fakeShoveSpot`, and `restealSpot` are attached to `HeroDecision` and tested.
However, current UI search only finds visible rendering for ICM stage and
squeeze spots in HandReplay. I did not find UI rendering for bounty context,
fake-shove context, or resteal context.

Impact: `CLAUDE.md` and `ROADMAP.md` still read as if full Bounty & FT analysis
is a shipped user-facing feature. The safer current description is "analysis
metadata is attached; UI surfacing is partial."

Recommended fix: either surface these contexts in HandReplay/Leaks/Study Plan,
or downgrade the docs claim until the UI exists.

### P2 - PWA install assets are still missing

`vite.config.ts` includes `favicon.ico`, `apple-touch-icon.png`,
`masked-icon.svg`, `pwa-192x192.png`, and `pwa-512x512.png`, but `public/` is
absent.

Impact: PWA install metadata can warn or fall back to generic icons.

Recommended fix: add minimal generated assets under `public/`, or remove the
manifest/icon references until assets exist.

### P2 - `poker-odds-calculator` remains caret-ranged

The old research recommendation to pin the package exactly remains valid:
`package.json` still has `^0.4.0`.

Impact: pre-1.0 packages can make breaking changes on minor versions. The app
uses this package only in HandReplay equity display, so the blast radius is
small but user-visible.

Recommended fix: change it to `0.4.0` and refresh the lockfile.

### P3 - Test-only assertions live inside `HandsPage.tsx`

`HandsPage.tsx` has self-executing test assertions behind a test-environment
guard. They did catch the suited-gapper bug, but they introduce `as any` in
production source and keep test logic inside a page module.

Impact: not a runtime bug, but it is a code hygiene regression versus the repo's
prior "no explicit any in src/scripts" standard.

Recommended fix: move those assertions into a real test file.

## Research Update

The package recommendations need to be reprioritized after the May 31 work:

1. `@vitest/coverage-v8` is no longer a recommendation; it is installed and
   configured.
2. Removing `--isolate=false` is no longer a recommendation; `npm test` now uses
   standard isolated Vitest workers.
3. Store integration tests are no longer a blank spot; `store.test.ts` now covers
   serializable position stats and denominator behavior.
4. The best next "research-to-action" item is not a new library. It is resolving
   the ICM/compliance and postflop replay inconsistencies with shared code paths.
5. The PWA research remains actionable only after icon assets exist.
6. The React Compiler / bundle analyzer ideas from Opus remain speculative. Do
   not prioritize them ahead of the remaining trust bugs.

## Verification

Commands run during this refresh:

```text
npx.cmd vitest run src/analysis/__tests__/rangeChecker.test.ts src/analysis/__tests__/scenarioDetector.test.ts src/analysis/__tests__/postflopAnalyzer.test.ts src/data/__tests__/store.test.ts src/parser/__tests__/siteIdentifier.test.ts src/parser/__tests__/uploadSizeGuards.test.ts
exit 0 - 6 files, 122 tests
```

```text
npm.cmd test
first sandboxed run failed before startup with esbuild access denied reading the Vite config
rerun outside sandbox exit 0 - 57 files, 609 tests
```

```text
npm.cmd run typecheck
exit 0
```

```text
npm.cmd run typecheck:test
exit 0
```

```text
npm.cmd run docs:check
exit 0
```

```text
npm.cmd run build
exit 0
```

```text
git diff --check
exit 0
```

## Recommended Next Batch

1. Make HandReplay reuse stored postflop analysis or the same flop-pot helper,
   then translate remaining postflop notes.
2. Decide whether to surface or delist bounty/fake-shove/resteal contexts.
3. Add PWA icon assets.
4. Pin `poker-odds-calculator` exactly.
