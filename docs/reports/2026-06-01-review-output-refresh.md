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
| Bounty/final-table analyzers dead code | Fixed | `scenarioDetector.ts` attaches `bountyContext`, `fakeShoveSpot`, and `restealSpot` to `HeroDecision`; HandReplay now surfaces those contexts in a Tournament Context panel. |
| Test isolation / missing coverage tooling | Fixed | `package.json` uses `vitest run`; coverage and `typecheck:test` are configured. |
| PWA icons missing | Fixed | `public/` now contains `favicon.ico`, `apple-touch-icon.png`, `masked-icon.svg`, `pwa-192x192.png`, and `pwa-512x512.png`; build copies them into `dist/`. |
| `poker-odds-calculator` should be pinned exactly | Fixed | `package.json` and the root `package-lock.json` dependency spec now use exact `0.4.0`. |

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

**Resolved 2026-06-02:** HandReplay now prefers stored import-time
`heroDecision.postflopActions` when the field is present, and falls back to
recomputation only for older decisions without stored postflop analysis.

The import path now calls `analyzePostflop()` with a computed flop-pot value.
HandReplay still recomputes the same analysis with `hand.totalPot`, which is the
final stored hand pot and can be much larger than the flop pot.

Impact: a hand can have one stored `HeroDecision.postflopActions` result, while
the replay modal displays a different sizing judgment. This is exactly the kind
of trust issue the old reports were worried about.

Recommended fix: complete. The modal no longer recomputes over stored
postflop analysis.

### P1 - Postflop notes still contain Portuguese-facing text

**Resolved 2026-06-02:** the listed `postflopAnalyzer.ts` notes are translated
to English, and a focused test now rejects the Portuguese fragments found in
this refresh.

`postflopAnalyzer.ts` still emits notes such as `C-bet HU em board`,
`Recomendado`, `Double barrel no turn`, `Missed c-bet HU como PFR`, and
`Bet vs missed c-bet (correto)`.

Impact: these notes are visible in HandReplay and can feed user-facing analysis.
This contradicts the repo rule that UI copy stays English and the docs claim
that analysis-layer note strings were purged.

Recommended fix: complete.

### P1 - Bounty/final-table context is attached but not surfaced enough for the docs claim

**Resolved 2026-06-02:** HandReplay now renders attached
`bountyContext`, `fakeShoveSpot`, and `restealSpot` metadata in a Tournament
Context panel, with regression coverage for all three context types.

The old "dead code" finding is no longer accurate. `bountyContext`,
`fakeShoveSpot`, and `restealSpot` are attached to `HeroDecision` and tested.
Before this fix, UI search only found visible rendering for ICM stage and
squeeze spots in HandReplay, with no rendering for bounty context,
fake-shove context, or resteal context.

Impact before fix: `CLAUDE.md` and `ROADMAP.md` read as if Bounty & FT
analysis was a shipped user-facing feature, while the visible UI only showed
partial cues.

Recommended fix: complete. HandReplay now surfaces the stored tournament
contexts that the importer attaches to each `HeroDecision`.

### P2 - PWA install assets are still missing

**Resolved 2026-06-02:** added the referenced public assets:
`favicon.ico`, `apple-touch-icon.png`, `masked-icon.svg`, `pwa-192x192.png`,
and `pwa-512x512.png`. `npm.cmd run build` copies them into `dist/`.

`vite.config.ts` includes `favicon.ico`, `apple-touch-icon.png`,
`masked-icon.svg`, `pwa-192x192.png`, and `pwa-512x512.png`, but `public/` is
absent.

Impact: PWA install metadata can warn or fall back to generic icons.

Recommended fix: complete.

### P2 - `poker-odds-calculator` was caret-ranged

**Resolved 2026-06-02:** `package.json` and the root
`package-lock.json` dependency spec now pin `poker-odds-calculator` to
`0.4.0`; the installed lock entry was already resolved to `0.4.0`.

Before this fix, the old research recommendation to pin the package exactly
remained valid because `package.json` still had `^0.4.0`.

Impact: pre-1.0 packages can make breaking changes on minor versions. The app
uses this package only in HandReplay equity display, so the blast radius is
small but user-visible.

Recommended fix: complete.

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
5. The PWA icon-asset gap is closed; deeper PWA research should wait until
   offline/install behavior becomes a product priority.
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

1. Move test-only `HandsPage.tsx` assertions into a real test file.
