# Codebase Health Review — 2026-06-11

Scheduled Graphify-assisted health review on branch
`claude/relaxed-mccarthy-mv10mr` (HEAD `36ffabd`, after PRs #56–#57),
performed in a remote session. Unlike the 2026-06-10 run, a Graphify index
exists this time (`graphify-out/`, committed by PR #57) and was used as a
navigation map; every conclusion below was verified by direct inspection.

## Verification gate (this run)

| Check | Result |
|---|---|
| `npm run docs:check` | pass |
| `npm run typecheck` | pass |
| `npm run typecheck:test` | pass |
| `npm run lint` | pass (7 `jsx-a11y` warnings, 0 errors — unchanged) |
| `npm test` | **693 / 693 (63 files)** |

PR #56's two fixes are confirmed working: `typecheck:test` is now enforced in
CI and passes, and `agentKernel.test.ts` passes in this remote sandbox
(the git-config isolation fix holds). Both 2026-06-10 findings → **resolved**.

## Graphify sync status

- Index generated 2026-06-10 12:26 UTC (492 files) + 22:53 UTC (2-file
  incremental) on the owner's Windows machine
  (`C:\Users\MICRO\OneDrive\Documentos\GitHub\poker`).
- **Predates PR #56** (merged 23:08 UTC): the `.github/workflows/ci.yml`
  "Typecheck tests" step and the kernel-test git isolation are absent from
  the graph. No `src/` runtime code drifted, so confidence impact is low for
  application areas, moderate for CI/test-infra conclusions.
- `GRAPH_REPORT.md` header ("Corpus Check — 2 files") reflects the 2-file
  incremental run, not the 492-file corpus; treat the header as misleading.

## Confirmed findings

### 1. Committed `graphify-out/` leaks local machine paths and sits outside every gate — NEW, HIGH
- PR #57 committed 2,006 generated files (12 MB raw; pack impact small —
  `.git` is 2.71 MiB). 1,759 Obsidian notes plus `manifest.json` (492
  occurrences) and `.graphify_root` embed
  `file:///C:/Users/MICRO/OneDrive/Documentos/GitHub/poker/...` —
  the owner's Windows username and directory layout.
- `scripts/privacy-boundary-check.ts` `candidateFiles()` only scans
  `src/`, `public/`, `index.html`, `vite.config.ts` — the leak is invisible
  to the privacy gate this repo otherwise enforces, and the vault will
  produce massive diffs on every regeneration.
- **Action:** either re-gitignore `graphify-out/` (revert the `.gitignore`
  change from #57), or sanitize generated links to repo-relative paths and
  extend `privacy-boundary-check.ts` to cover `graphify-out/`.

### 2. `importRuns.ts` ↔ `store.ts` module cycle — NEW (Graphify-surfaced), MEDIUM
- Graphify's only reported import cycle, verified:
  `src/data/importRuns.ts:12` re-exports `saveImportRun, getRecentImportRuns`
  from `./store`, while `src/data/store.ts:13` imports
  `type ImportRunRecord` from `./importRuns`.
- The back-edge is type-only (erased at runtime), so there is no runtime
  cycle — but ownership is blurred: import-run persistence lives in
  `store.ts` yet is published through `importRuns.ts` as if owned there.
- **Action:** move `saveImportRun`/`getRecentImportRuns` into
  `importRuns.ts` (or a thin `importRunsStore.ts`) so the domain module owns
  its persistence and the cycle disappears from the module graph.

### 3. `STATUS.md` verification stamp stale — RECURRING (2nd run), escalated LOW → MEDIUM
- `docs/product/STATUS.md:7-9` still says "Last verified 2026-06-05 …
  666 / 666 (61 files)"; reality is 693 / 693 (63 files) after #52–#57.
  Flagged yesterday, unchanged. Recurring drift in the file whose whole
  purpose is being the source of truth.
- **Action:** bump the stamp in this PR or the next verified pass of `main`.

### 4. Watchlist items re-confirmed — RECURRING, unchanged
- `HandsUpload.tsx` (802 lines): one ~700-line component function
  (from line 97) mixing ZIP handling, worker orchestration, diagnostics
  export, and rendering; **zero test references** repo-wide.
- `store.ts` (826 lines) imports `analysis/villainClassifier` at line 15 —
  analysis logic consumed by the data layer (cohesion debt, tested).
- `sumUsd` in `src/parser/money.ts` imported by `DashboardPage.tsx:16` and
  `CareerPage.tsx:34` — parser util acting as shared util; move to `utils/`.
- 7 `jsx-a11y` warnings (clickable divs without keyboard support) —
  identical to yesterday.

### 5. Critical Dependabot alert: vitest < 3.2.6 — NEW, FIXED IN THIS PR
- GitHub flagged 1 critical vulnerability on `main`
  (Dependabot alert #8): GHSA-5xrq-8626-4rwp — arbitrary file read/execute
  when the Vitest UI server is listening. Dev-only dependency and this repo
  runs `vitest run` (no UI server), so practical exposure was low.
- **Fix applied:** `npm audit fix` bumped vitest within the existing
  `^3.0.0` range (lockfile-only change); `npm audit` now reports
  0 vulnerabilities and the suite stays 693 / 693.

### 6. Correction to the 2026-06-10 ledger
- Yesterday's claim "only HandReplay and HandsPage have component tests"
  was inaccurate **at the time**: `shared/__tests__` (6 files, since
  2026-05-18), `career/__tests__` (3 files), and `TrendChart.test.tsx`
  already existed. Component coverage is thicker than recorded; the real
  gap is page-level components and `HandsUpload`.

## Graphify signals NOT confirmed as issues

- **"680 isolated nodes"** — sampled nodes are JSON config keys
  (`allow`, `name`, `version`, `additionalDirectories`); indexing noise,
  not undocumented components.
- **God nodes `HeroDecision` (48 edges), `Hand`, `Position`** — these are
  the core domain types in `src/types/`; high fan-in is the intended
  hub-and-spoke design, not coupling debt.
- **Duplicate god-node entries** ("PokerStars Tournament Summary Format"
  appears twice, ranks 2 and 9) — the graph holds duplicate nodes for one
  concept; treat edge counts on doc-derived nodes as approximate.

## Review ledger

- **Date:** 2026-06-11 · **Trigger:** scheduled Graphify-assisted review
- **Branch:** `claude/relaxed-mccarthy-mv10mr` · **Commit:** `36ffabd`
- **Graphify sync:** index present but stale by 1 commit (predates #56);
  generated on a different machine (Windows paths).
- **Changed since last run:** PR #56 (CI + kernel test fixes), PR #57
  (graphify-out committed).
- **Inspected directly:** `src/data/importRuns.ts`, `src/data/store.ts`,
  `src/components/hands/HandsUpload.tsx`, `scripts/privacy-boundary-check.ts`,
  `docs/product/STATUS.md`, `graphify-out/` (root marker, manifest, vault,
  report), component `__tests__` inventory, full verification gate.
- **New:** graphify-out path leak (high); importRuns/store cycle (medium).
- **Recurring:** STATUS stamp (escalated); HandsUpload monolith; store.ts
  data→analysis import; sumUsd placement; 7 a11y warnings.
- **Resolved:** typecheck:test regression (#56); agentKernel env dependence
  (#56) — both verified green in this sandbox.
- **Next actions:** (1) sanitize or re-ignore `graphify-out/`;
  (2) break the importRuns/store re-export cycle; (3) bump STATUS stamp;
  (4) extract + test `HandsUpload` ZIP/diagnostics logic.
