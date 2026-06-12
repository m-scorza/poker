# Codebase Health Review - 2026-06-12

Scheduled health review of `main` (HEAD `36ffabd`, after PRs #56-#57), performed
in a remote session on branch `claude/relaxed-mccarthy-3d0bo2`. Follows up on
`docs/reports/2026-06-10-codebase-health-review.md`.

> **Graphify caveat:** unlike the 2026-06-10 run, a Graphify index now exists
> in-repo (`graphify-out/`, committed by PR #57). It was generated 2026-06-10
> on the owner's Windows machine (492 files) from a working copy at roughly
> PR #56; HEAD #57 only added `graphify-out/` itself, so the index is
> effectively in sync with `src/` today. It was used as a navigation map only;
> every finding below was verified by direct inspection or by running the full
> verification gate in this clone.

## Summary

- **Overall health: good.** Working tree clean at `main` HEAD, full gate green
  in this remote sandbox: `docs:check`, `typecheck`, `typecheck:test`, `lint`
  (0 errors, 7 warnings), **693 / 693 tests (63 files)**. Both high/medium
  findings from the 2026-06-10 review are confirmed fixed.
- **Main new finding:** the committed `graphify-out/` artifact leaks the
  owner's local Windows identity — **506 occurrences of
  `C:\Users\MICRO\...` paths** across `manifest.json` (492), `.graphify_root`,
  `.graphify_python`, and Obsidian `file:///C:/Users/MICRO/...` links. For a
  project with an explicit local/private posture and a `privacy:check` static
  guard, pushing absolute personal-machine paths and a username to GitHub is
  off-posture. `scripts/privacy-boundary-check.ts` does not scan
  `graphify-out/`. The artifact is also 12 MB / 2,006 generated files that
  will go stale on the next code merge (regen is manual, machine-specific).

## Verification gate (this run)

| Check | Result |
|---|---|
| `npm run docs:check` | pass |
| `npm run typecheck` | pass |
| `npm run typecheck:test` | pass (now also enforced in CI — `.github/workflows/ci.yml:36`) |
| `npm run lint` | pass — 0 errors, 7 `jsx-a11y` warnings (recurring) |
| `npm test` | **693 / 693 (63 files)** — incl. `agentKernel.test.ts` in a remote sandbox |

## Confirmed findings

### 1. `graphify-out/` leaks local machine paths and username — NEW
- **Priority:** medium-high (privacy/professionalism, not correctness).
- **Evidence:** `grep -c 'MICRO|file:///C:'` → 506 hits; `manifest.json` keys
  are absolute `C:\Users\MICRO\OneDrive\Documentos\GitHub\poker\...` paths;
  `.graphify_python` records a local interpreter path; Obsidian notes carry
  `file://` links that only resolve on the owner's machine.
- **Recommended action:** either re-ignore `graphify-out/` (restore the
  `.gitignore` line removed in #57) and distribute the vault out-of-band, or
  regenerate with repo-relative paths and strip `manifest.json` /
  `.graphify_root` / `.graphify_python` from version control. If it stays
  tracked, extend `privacy-boundary-check.ts` to flag absolute user paths.

### 2. `STATUS.md` verification stamp stale — RECURRING (from 2026-06-10, unchanged)
- **Priority:** low.
- **Evidence:** `docs/product/STATUS.md:7-9` still says "2026-06-05, branch
  `codex/ohh-fixture-sweep`, 666 / 666 (61 files)". Reality: 693 / 693
  (63 files) verified this run on `main` @ `36ffabd`. Autogen blocks are
  current; only the hand-maintained header lags.
- **Recommended action:** bump the stamp; consider folding it into
  `regen-status.ts` so it can never drift again.

### 3. `typecheck:test` regression — RESOLVED
Fixed by PR #56; verified passing here and enforced as a CI step
(`.github/workflows/ci.yml:36`).

### 4. `agentKernel.test.ts` ambient git config dependency — RESOLVED
Fixed by PR #56; verified by a green 693/693 run in this managed remote
sandbox — exactly the environment class that previously failed.

### 5. `importRuns.ts` ↔ `store.ts` module cycle — NEW (confirmed, benign)
- **Priority:** low.
- **Evidence:** Graphify flagged the cycle; direct inspection:
  `src/data/importRuns.ts:12` value-re-exports `saveImportRun`/`getRecentImportRuns`
  from `./store`, while `src/data/store.ts:13` imports `ImportRunRecord` as
  `import type` (erased at compile time). No runtime circularity.
- **Recommended action:** move `ImportRunRecord` (and the re-exported store
  functions) so the dependency points one way — e.g. type into a shared types
  module, or drop the convenience re-export.

### 6. Duplicated test factory helpers — NEW
- **Priority:** low.
- **Evidence:** `makeDecision()` is defined 8× (7 test files +
  `src/data/demoDataset.ts:90`), `pct()` 7×, `makeHand()` 6×, `makePlayer()` 4×
  (Graphify duplicate-label signal, verified by grep). Most share the same
  `Partial<HeroDecision>` override shape.
- **Recommended action:** add `src/test/factories.ts` with shared
  `makeDecision`/`makeHand`/`makePlayer` builders; migrate opportunistically.

### 7. Critical advisory on `vitest` — NEW
- **Priority:** medium (dev-only exposure, but it's the repo's only critical).
- **Evidence:** Dependabot alert #8 on `main`; `npm audit` → `vitest <3.2.6`,
  GHSA-5xrq-8626-4rwp ("When Vitest UI server is listening, arbitrary file can
  be read and executed"), plus `@vitest/coverage-v8 <=3.2.5`. Dev dependency;
  only exploitable while the Vitest UI server is running locally.
- **Recommended action:** `npm audit fix` (bump vitest to >=3.2.6) in a small
  chore PR; the suite is green so the bump should be low-risk.

## Watchlist (recurring, no action required yet)

- **`HandsUpload.tsx` (802 lines, RECURRING):** still mixes ZIP extraction,
  worker lifecycle, diagnostics export, local HU-reference handling, and
  rendering; still the largest untested UI surface (no component test).
  Worker/ZIP plumbing (`processFiles`, zip-entry guards at lines 83-95) could
  move to a hook/module and gain tests without touching rendering.
- **`store.ts` (826 lines, RECURRING):** villain aggregation
  (`collectVillainHandObservation` line 508, `aggregateVillainStats` line 610)
  is analysis logic in the data layer; tested, so cohesion debt only.
- **`parser/money.ts` as de-facto shared util (RECURRING):** now imported by 7
  modules outside `src/parser/` (`store.ts`, `financials.ts`, `careerStats.ts`,
  `careerScope.ts`, `careerCoach.ts`, `CareerPage.tsx`, `DashboardPage.tsx`).
  Belongs in `src/utils/`.
- **7 `jsx-a11y` warnings (RECURRING):** `HandsUpload.tsx:424`,
  `DualRangeMatrix.tsx:197`, `RangeGrid.tsx:41` — clickable divs without
  keyboard support.
- **Page-level test gap (RECURRING, corrected scope):** the 2026-06-10 note
  understated component coverage — 12 `.test.tsx` files exist (shared widgets,
  career cards, TrendChart, HandReplay, App). The real gap is `HandsUpload`
  plus every page except `HandsPage`.

## Graphify signals checked and not confirmed as issues

- **680 isolated nodes:** sampled — predominantly JSON config keys
  (`allow`, `name`, `version`), doc concepts, and per-fixture nodes. Graph
  granularity noise, not orphaned code.
- **Duplicate god node** (`PokerStars Tournament Summary Format` listed twice):
  two graph nodes share one label (doc concept vs fixture corpus). Graph
  artifact, no codebase issue.
- **"Corpus Check: 2 files"** in `GRAPH_REPORT.md` contradicts the 492-file
  run in `cost.json` — incremental-run reporting quirk in Graphify itself.
- **`scripts/scratch.ts`:** looks like debris but is documented in
  `scripts/README.md:13` as an intentional ad-hoc W$SD checker. Left alone.

## Cross-run ledger

- 2026-06-10 finding 1 (`typecheck:test`) — **resolved, verified.**
- 2026-06-10 finding 2 (agentKernel git isolation) — **resolved, verified.**
- 2026-06-10 finding 3 (STATUS stamp) — **recurring, unchanged; second
  consecutive run.** Escalate to "just fix it next docs touch".
- 2026-06-10 watchlist (HandsUpload, store.ts villain logic, jsx-a11y, money.ts)
  — all **recurring, unchanged.**
- New this run: graphify-out privacy leak (finding 1), importRuns/store cycle
  (finding 5, benign), test factory duplication (finding 6).
