---
status: resolved
date: 2026-07-10
related:
  - docs/reports/2026-07-01-abyss-audit.md
  - docs/reports/archive/2026-07-09-codebase-health-review.md
note: >
  Archived on creation: every prior finding was verified resolved (or stable
  and already tracked), and the two actionable items from this run — recording
  the #141/#142 landings in the abyss report and giving the knip-in-CI
  recommendation a tracking home in ROADMAP P5 — were fixed in the same PR
  that adds this report. Nothing is left open here.
---

# Codebase Health Review — 2026-07-10

Scheduled Graphify-assisted health review of `main` (HEAD `1b63534`, after the
#136–#142 abyss Wave 3/Wave 4 landings), performed in a remote session on
branch `claude/relaxed-mccarthy-j9uymm`. **Graphify was unavailable this run**
(same as 2026-07-09 — see sync status); every conclusion comes from direct
inspection: the full verification gate, `madge`, `knip`, and build-output
probing.

## Codebase Health Summary

- **Overall health: good, and measurably better than 2026-07-09.** Full gate
  green in this container: `docs:check`, `typecheck`, `typecheck:test`,
  `lint` (0 errors, 0 warnings), **898/898 tests (89 files, 43 s wall)**,
  production build OK, `madge --circular` clean (219 modules, no cycles).
  Both regressions flagged on 07-09 (eager shell 505.7 KB; unused-export
  refill) were fixed within a day (#136/#140/#142), and the shell now has a
  CI budget guard so the next regression fails loudly.
- **Main risks:** god-file drift is the only recurring structural issue —
  `ArenaPage.tsx` holds at 1 405 lines (unchanged since 07-09, so stable,
  not worsening). Report-maintenance discipline slipped for the last two
  PRs: #141/#142 landed abyss-wave work without updating the abyss report
  (fixed in this PR).
- **Highest-impact improvement:** wire `knip` into CI with a reviewed
  allowlist (now tracked in ROADMAP P5) — the manual de-export sweep is done
  and Wave 2 is closed, so a gate is the only thing stopping the pool from
  refilling again.
- **Confidence level:** high — all claims verified by executing the gate or
  reading source/build output. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-j9uymm`, identical to
  `origin/main` @ `1b63534` (merge-base = HEAD = origin/main).
- **Git status:** clean working tree before this report was added.
- **Uncommitted changes:** none.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from 07-09. `graphify-out/` is gitignored by policy (PR #65:
  local-only, 12 MB, embeds local paths), so a fresh clone has no index and
  no Graphify tooling is installed here to regenerate one.
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly. The
  map below is reconstructed from madge/knip/build output, not a Graphify
  snapshot.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** `src/parser/` (PokerStars/GGPoker/OHH +
  worker), `src/analysis/` (scenario/range/postflop, financials, career,
  tilt, spot packets, solver boundary), `src/data/` (Dexie `store.ts`,
  Zustand `appStore.ts`, ranges, curriculum), `src/pages/` (13 routed
  pages), `src/components/` (layout/dashboard/career/hands/coach/blackout/
  shared).
- **Entry points:** `src/main.tsx` → `App.tsx` (all routes lazy);
  `src/parser/worker.ts`; `scripts/analyze-cli.ts`; `scripts/*` hooks.
- **Core modules / hotspots (lines):** `curriculumSeedPacks.generated.ts`
  2 514 (generated), `ArenaPage.tsx` 1 405, `spotPacket.ts` 1 288,
  `HandsUpload.tsx` 949, `store.ts` 929, `HandReplay.tsx` 734,
  `CareerPage.tsx` 717, `pokerstars.ts` 717.
- **Dependency clusters:** parser → analysis → pages; `store.ts` the hub.
  PDF cluster (jspdf/autotable/html2canvas/dompurify) now fully lazy AND
  excluded from the PWA precache (#142). framer-motion confined to a lazy
  proxy chunk (121.2 KB); gsap confined to the DashboardPage chunk.
- **Circular dependencies:** none (madge, 219 files).
- **Isolated/orphaned areas:** knip's four "unused files" are all `scripts/`
  false positives (SessionStart hook, protocol CLIs, manual generator) —
  same verdict as 07-09.

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All six gate commands executed in-container | Green: 898/898 tests (89 files), lint 0/0, build OK, no >500 KB warning |
| Dependency graph | Cycle regression check | `npx madge --circular` (219 modules) | No cycles |
| Bundle output | 07-09 Finding 1 follow-up | Chunk listing; grep of `index-*.js` for library signatures; `check-bundle-budget.mjs` | Shell **376.5 KB** (was 505.7); framer-motion/recharts/jspdf/gsap all out of the shell; `pdfExport` its own lazy chunk (432.9 KB, precache-excluded); CareerPage chunk 443.9 → **53.3 KB** |
| CI budget guard | Verify the 07-09 recommendation landed | `scripts/check-bundle-budget.mjs`, `ci.yml:48` | Landed: 432 KiB hard budget on `index-*.js`, wired into CI |
| Lazy-import wiring | Confirm F11/palette fixes are real | `SessionsPage.tsx:75` (dynamic `import('../utils/pdfExport')`), `Layout.tsx:8-9` (`React.lazy` palette) | Confirmed in source, not just chunk names |
| Dead code | 07-09 Finding 4 follow-up | `npx knip` | Unused exports 14 → **2** (both known: `saveHeroName` = abyss F2/Act III-5; `writeStarterDiagnosticSummary`); 52 unused types = documented solver/spotPacket forward contracts (kept per Wave 2 record) |
| #141 correctness | New analysis-layer refactor (F21/F26/F28/F29) | `postflopAnalyzer.ts:349` (`FACING_BET_INFO`, `isCorrect: null`), `HandReplay.tsx:138-143` (legacy-`'NONE'` read normalization), `leakDetector.ts:174-178`, `ArenaPage.tsx:318` | Migration is sound: HandReplay is the only label consumer; leakDetector skips `isCorrect === null` rows, so persisted legacy `'NONE'` rows can't leak into stats |
| Test perf (F16) | 07-09 improvement opportunity | `vite.config.ts:91-114` (`test.projects` node/jsdom split); test run duration | Split landed; 43.4 s wall for 898 tests |
| God files | 07-09 Finding 5 follow-up | `wc -l` on the seven hotspots vs 07-09 numbers | ArenaPage 1 405 (unchanged), store 929, HandReplay 734, CareerPage 717 — stable, no new growth |
| Report/doc coherence | Protocol: reports updated when work lands | Abyss report Wave 3/4 text vs git log #141/#142; ROADMAP; scripts/README | Abyss report stale (Finding 1 below — fixed in this PR); ROADMAP "breaks today" prose and scripts/README rows confirmed fixed by #135 |

## Confirmed Findings

#### Finding 1: Abyss report lagged the last two landings (#141, #142)

- **Status:** New (instance of the recurring doc-drift class)
- **Priority:** Low (fixed in this PR)
- **Evidence:** Wave 3 said "F13 — CareerPage chunk audit not done (443.9 KB,
  unchanged)" while #142 had shrunk that chunk to 53.3 KB and pruned the PWA
  precache from 2 557 to 1 765 KiB; Wave 4 was unchecked with no record of
  #141 landing F21/F26/F28/F29. Neither PR touched the report.
- **Affected files/modules:** `docs/reports/2026-07-01-abyss-audit.md`.
- **Graphify signal:** n/a; found by diffing report text against `git log`.
- **Direct code confirmation:** yes — build output and #141/#142 diffs.
- **Why it matters:** the abyss report is the SessionStart-surfaced execution
  ledger; a stale "not done" sends the next session redoing landed work.
- **Recommended action:** done in this PR — Wave 3 ticked (all items landed
  or steered), Wave 4 partial recorded with the still-open remainder
  (F17/F18/F19/F24/F25, §6 util tests).

#### Finding 2: knip-in-CI recommendation had no tracking home

- **Status:** Recurring (07-09 recommendation, unblocked since Wave 2 closed)
- **Priority:** Medium
- **Evidence:** knip devDep landed (#140) and the sweep is done (2 unused
  exports left, both deliberate), but nothing runs knip in CI or the
  pre-commit hook; the recommendation lived only in the archived 07-09
  report.
- **Affected files/modules:** `.github/workflows/ci.yml`, `package.json`,
  future `knip.json`.
- **Graphify signal:** n/a.
- **Direct code confirmation:** grep of `ci.yml`/`package.json` — only the
  bundle-budget check was added, not knip.
- **Why it matters:** without a gate the unused-export pool refills every
  merge — observed happening after #132.
- **Recommended action:** tracked now in ROADMAP P5 (added in this PR) with
  the allowlist contents spelled out.

#### Finding 3: God-file drift — stable this run

- **Status:** Recurring / unchanged (not worsened)
- **Priority:** Medium (unchanged)
- **Evidence:** `ArenaPage.tsx` 1 405 lines (identical to 07-09),
  `spotPacket.ts` 1 288, `HandsUpload.tsx` 949, `store.ts` 929,
  `HandReplay.tsx` 734, `CareerPage.tsx` 717. #142 split CareerPage's
  *bundle*, not its source.
- **Affected files/modules:** `src/pages/ArenaPage.tsx` primarily.
- **Graphify signal:** n/a; `wc -l` vs the 07-09 ledger.
- **Direct code confirmation:** yes.
- **Why it matters:** abyss F19 / X-ray Slice 5 target ~500-line pages; the
  decomposition is already tracked, so this stays a watchlist item unless it
  grows again.
- **Recommended action:** no new action — extract drill families when the
  Arena reskin slice runs (already tracked; do not add the next drill to the
  monolith).

## Prior Findings — Disposition (2026-07-09 → today)

| 07-09 finding | Disposition | Verification |
|---|---|---|
| 1. Bundle regression (shell 505.7 KB, F11 unfixed) | **Resolved** (#136, #142) | Shell 376.5 KB, budget guard green, pdf/palette lazy, precache 1 765 KiB |
| 2. ROADMAP Act III drift ("breaks today") | **Resolved** (#135) | Prose gone; III boxes reflect in-progress arcs |
| 3. scripts/README missing rows | **Resolved** (#135) | Both rows present with sibling-repo caveat |
| 4. Unused-export refill from #132 | **Resolved** (#140) | knip: 14 → 2 exports, both deliberate; gate still missing (Finding 2) |
| 5. ArenaPage +29% growth | **Stable** | 1 405 lines, zero growth this period |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Automated-tool signals that did not
survive verification, same as 07-09:

- **Signal:** knip "Unused files (4)" in `scripts/`.
- **Conclusion:** false positives (SessionStart hook, protocol CLIs, manual
  generator) — re-verified unchanged; allowlist them when knip joins CI.
- **Signal:** knip "52 unused exported types".
- **Conclusion:** documented forward contracts (solver boundary, spot-packet
  schema) — Wave 2 recorded the keep decision; not dead code.

## Improvement Opportunities

- **Architecture:** none new — ArenaPage decomposition already tracked
  (abyss F19 / X-ray Slice 5).
- **Code quality:** drop the stray `export` on `writeStarterDiagnosticSummary`
  (`src/data/starterDiagnostic.ts:130`) in the next touching PR.
- **Tests:** healthy — 898 passing, node/jsdom split landed (F16), suite runs
  in 43 s. No new gaps found.
- **Documentation:** fixed in this PR (abyss Wave 3/4 records, ROADMAP P5
  knip item).
- **Developer experience:** the bundle-budget guard pattern worked — consider
  the same one-file guard for the PWA precache size if it regresses again.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged priority.

## Review Ledger

- **Date/time:** 2026-07-10 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-j9uymm` (== `origin/main`).
- **Commit:** `1b63534` (#141 Wave 4 analysis warts).
- **Scope:** full gate, madge, knip, bundle probing, #141 correctness
  spot-check, prior-findings reconciliation vs 07-09.
- **Graphify sync status:** index absent by policy; review ran Graphify-free.
- **Files changed since last run:** 6 PRs (#136–#142); vs the 07-03 X-ray
  baseline: 114 files, +10 563/−1 948.
- **Areas inspected:** see table above.
- **New findings:** abyss-report staleness (fixed here).
- **Recurring findings:** knip-in-CI gap (now tracked in ROADMAP), god files
  (stable).
- **Resolved findings:** 07-09 Findings 1–4 all verified resolved.
- **Stale findings:** none.
- **Recommended next actions:** (1) knip in CI per ROADMAP P5; (2) run the
  remaining Wave 4 items (F17/F18/F19/F24/F25) as pages get touched;
  (3) keep the report-update-with-the-landing discipline (#141/#142 missed
  it; this PR backfilled).
