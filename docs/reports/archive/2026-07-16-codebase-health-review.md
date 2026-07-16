---
status: resolved
date: 2026-07-16
related:
  - docs/reports/archive/2026-07-13-codebase-health-review.md
note: >
  Archived on creation (scheduled run of 2026-07-16). Quietest run in the
  series: the gate is fully green, knip reports zero unused exports for the
  first time, and all three of the 07-13 run's headline findings (dark
  dual-profile feature, knip-in-CI gap, stale dead exports) were resolved by
  #194–#198. The two carried Low items (arena test-shim import, chipAmount
  single-site adoption) remain tracked in their existing homes; nothing new
  needs an open report.
---

# Codebase Health Review — 2026-07-16

Scheduled health review, run against `main` @ `a75caf4` (5 commits / 5 PRs
after the 07-13 review's baseline `ae20052`: #193–#198). **Graphify was
unavailable this run** — same as every prior remote run: no `/graphify` skill,
no deferred Graphify tool, and no index in a fresh container (`graphify-out/`
is gitignored by policy, PR #65). Every conclusion below comes from direct
inspection: the full verification gate executed in-container, `madge`, `knip`,
layering greps, and line-by-line review of all four substantive diffs of the
period.

## Codebase Health Summary

- **Overall health: excellent — the quietest, cleanest run in the series.**
  In-container: `docs:check`, `typecheck`, `lint` (0/0), **1029/1029 tests
  (100 files, ~31 s; +7 tests, +1 file)**, production build OK (shell
  376.77 KB, flat; precache 1 764.03 KiB, +3.8), `madge --circular` clean
  (258 modules, +2), and **`npx knip` exits 0 with zero unused exports** — a
  first: every dead export carried since 07-09 is now deleted, de-exported,
  or in use.
- **Main risks:** none High or Medium. Two Low items recur: (1) the
  analysis-layer test `arenaDrillEngine.test.ts:7` still imports
  `pickRandomDecision` from the pages shim rather than
  `analysis/arena/drillLogic` (second run); (2) `chipAmount` is still adopted
  at exactly one render site, `HandReplay.tsx:451` (third run, UIR-002).
- **Highest-impact improvement:** with the audit backlog fully drained, the
  next leverage is product work (ROADMAP Act III), not cleanup. The only
  sub-hour code nit is the one-line test-import fix.
- **Confidence level:** high — all claims verified by executing the gate or
  reading source and diffs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-gw5q5p`, identical to
  `origin/main` @ `a75caf4` at review start (0 ahead / 0 behind after fetch).
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none at start; this report + regenerated index only.
- **Graphify freshness:** **no Graphify index, skill, or tooling exists in
  this container** — unchanged from all prior remote runs; the index is
  local-only by policy. Substituted with madge (dependency graph/cycles),
  knip (reachability, now also CI-enforced), grep (layering direction),
  build output (chunk clustering), and `wc -l` (hotspots).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** unchanged — `src/parser/`, `src/analysis/`,
  `src/data/`, `src/pages/`, `src/components/` (10 subdirs; **new this
  period: `components/settings/`** with `SettingsCard.tsx` + test, #195).
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; the four knip-allowlisted `scripts/` CLIs/hooks.
- **Core modules / hotspots (lines):** `curriculumSeedPacks.generated.ts`
  2 514 (generated), `spotPacket.ts` 1 288, `ArenaPage.tsx` 998, `store.ts`
  790, `pokerstars.ts` 718 — all byte-flat vs 07-13; no non-generated file
  above 1 300 lines.
- **Dependency clusters:** parser → analysis → pages remains unidirectional
  in production code (grep across analysis/data/parser/utils: zero `pages/`
  imports outside the one known test). New edges this period are all
  in-layer: `DataVaultPage` → `SettingsCard` → `appStore`/`store`.
- **Highly connected files:** `data/appStore.ts` gained its first UI writer
  for `setStrategyProfile` (SettingsCard); `data/store.ts`'s `saveHeroName`
  (dead-listed for 4 prior runs) is now live product code.
- **Isolated or orphaned areas:** none — knip exits 0; the four `scripts/`
  false positives are now formally allowlisted as entries in `knip.jsonc`
  with per-line rationale.
- **Suspicious dependency relationships:** only the recurring test-layer
  wart — `analysis/__tests__/arenaDrillEngine.test.ts:7` imports from
  `pages/arena/actionOptions` (see Finding 1, with a correction to the
  07-13 record).
- **Complexity or metric hotspots:** shell chunk 376.77 KB (+0.09, flat,
  under budget); `pdfExport` lazy chunk 432.39 KB (flat); precache
  1 764.03 KiB (+3.8, from the new settings code).

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All gate commands executed in-container (exit 0) | Green: 1029/1029 tests (100 files), lint 0/0, build OK, shell 376.77 KB |
| Dependency graph | Cycle check after new settings module | `npx madge --circular` (258 modules) | No cycles |
| Dead code | First run with knip CI-enforced | `npx knip` (exit 0) | **Zero unused exports/types-refill; all carried dead exports gone** |
| Layering direction | Recurring check | grep for `pages/` imports across analysis/data/parser/utils | Production code: zero hits; one known test import remains (Finding 1) |
| #195 settings UI (III-5) | Resolves 07-13 Finding 1 | `SettingsCard.tsx` full read (143 lines), `DataVaultPage.tsx` wiring, `appStore.ts:104` trim, `SettingsCard.test.tsx` + `appStore.test.ts` new cases | Sound: trim at both UI and store boundary exactly as 07-13 recommended; blank-name rejection; Dexie + Zustand persistence both exercised by tests |
| #194 prize-extraction fix | Parser correctness on money paths | `tournamentSummary.ts:88-116` in context; regex change diff; 4 new/rewritten regression tests | Sound: digit-anchored `RE_MONEY` drops leading commas, keeps thousands grouping; eliminating-line double-count fixed; remaining no-comma quirk honestly characterized (test :99) |
| #196/#198 knip wiring | Resolves 07-13 Finding 2 | `ci.yml:41-42`, `knip.jsonc` full read, #198 diff (11 candidates across 7 files resolved) | Sound: gate wired, file-level allowlist narrowed to 4 scripts + 3 documented forward contracts; `writeStarterDiagnosticSummary` deleted, `labelSeedAction`/`shouldCbet` re-exports trimmed |
| Arena shim consumers | 07-13 Finding 3 accuracy | grep `pickRandomDecision`; `git show ae20052:src/pages/ArenaPage.tsx` | **Correction:** ArenaPage already consumed the shim's re-export at the 07-13 baseline — the test was never the "sole consumer" (see Finding 1) |
| `chipAmount` adoption | 07-13 Finding 4 | grep render consumers | Still `HandReplay.tsx:451` only (Finding 2) |
| Doc/report coherence | Recurring check | STATUS.md:48-53 vs SettingsCard source; reports index; ROADMAP §prize-quirks | Coherent: STATUS matches shipped code; index shows 0 open reports; ROADMAP residual ticked with fix note |

## Confirmed Findings

#### Finding 1: analysis-layer test still imports the pages shim (with a correction to the 07-13 record)

- **Status:** Recurring (second run)
- **Priority:** Low
- **Evidence:** `src/analysis/__tests__/arenaDrillEngine.test.ts:7` —
  `import { pickRandomDecision } from '../../pages/arena/actionOptions'` —
  while the engine under test imports the same symbol from
  `./arena/drillLogic` (`arenaDrillEngine.ts:22`). **Correction to 07-13:**
  that report claimed the test was the shim re-export's *sole* consumer;
  `git show ae20052:src/pages/ArenaPage.tsx:27` shows `ArenaPage` already
  imported `pickRandomDecision` from the shim then (and still does), so the
  re-export is legitimately load-bearing and the issue is *only* the
  test-layer dependency direction (analysis test → pages), not a masked
  dead export.
- **Affected files/modules:** `src/analysis/__tests__/arenaDrillEngine.test.ts`.
- **Graphify signal:** layering grep (substitute).
- **Direct code confirmation:** yes.
- **Why it matters:** it inverts test-layer dependency direction and survived
  the #198 shim-trim (which correctly removed `labelSeedAction`/`shouldCbet`
  but had to keep `pickRandomDecision`).
- **Recommended action:** one-line change — point the test at
  `../arena/drillLogic`. No urgency; knip cannot regress on it since
  ArenaPage keeps the re-export live.

#### Finding 2: `chipAmount` still adopted at a single render site (UIR-002)

- **Status:** Recurring (third run; unchanged this period — no UI-facing PR
  touched number formatting)
- **Priority:** Low
- **Evidence:** grep — render consumers of `chipAmount` are still only
  `HandReplay.tsx:25,451`; behavior pinned by `format.test.ts` since #180.
- **Affected files/modules:** `src/utils/format.ts`, pages rendering raw
  chip/pot numbers (Dashboard, Hands table, Sessions).
- **Graphify signal:** n/a; grep.
- **Direct code confirmation:** yes.
- **Why it matters:** the `385.00000000000006` float-artifact class remains
  fixed only where it was originally reported.
- **Recommended action:** finish the UIR-002 formatter migration (tracked in
  `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`). Third
  recurrence with zero movement — fold it into the next UI-touching PR
  rather than letting it ride indefinitely.

## Prior Findings — Disposition (07-13 → now)

| 07-13 finding | Disposition | Verification |
|---|---|---|
| 1. Dual-profile feature dark (selector never existed) | **Resolved** — #195 shipped `SettingsCard` on `/data`: hero-name editor (Dexie `settings` sink) + strategy-profile radio group, `setStrategyProfile`'s first-ever UI call site; trim normalization landed at both boundaries exactly as recommended (`appStore.ts:104`, `SettingsCard.tsx:55`); STATUS/CLAUDE updated in the same period | Full component + test read; grep for call sites |
| 2. knip not wired into CI (6th run) | **Resolved** — #196 added the CI step (`ci.yml:41-42`) + `knip.jsonc`; #198 narrowed the allowlist from 11 files to 4 scripts + 3 documented forward contracts and fixed the 11 deferred export candidates; `npx knip` exits 0 in-container | ci.yml + knip.jsonc reads; knip executed |
| 3. Analysis test imports pages shim | **Recurring** — untouched by #198's shim trim; carried as this run's Finding 1 **with a factual correction** (the shim was never test-only) | grep + history check |
| 4. `chipAmount` single-site (UIR-002) | **Recurring, unchanged** — this run's Finding 2 | grep |
| Stale: `writeStarterDiagnosticSummary` export (4 runs) | **Resolved** — deleted in #198 | diff + knip |
| Stale: `saveHeroName` "dead" export (4 runs) | **Resolved as predicted** — became live product code via #195, exactly the III-5 write path the 07-13 report reclassified it as | SettingsCard.tsx:17,60 |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index, no skill, no tooling — stated above).
Substitute-tool signals that did not survive verification:

- **Signal:** madge "2 warnings" during graph build. **Why suspicious:** could
  hide unparsed edges. **What was checked:** warnings are madge's standard
  skipped-dynamic-import notices, unchanged from prior runs; the cycle scan
  itself is clean. **Conclusion:** benign. **Follow-up:** none.
- **Signal:** knip's former `scripts/` false positives. **Conclusion:** no
  longer signals at all — formally converted to documented `entry` allowlist
  lines in `knip.jsonc` (#196), which is the recommended terminal state.
  **Follow-up:** none.

## Improvement Opportunities

- **Architecture:** none new — layering clean, no cycles, no oversized
  non-generated files. The one-line Finding 1 fix tidies test-layer direction.
- **Code quality (watchlist, not a finding):** `SettingsCard.handleSaveName`
  (`SettingsCard.tsx:54-65`) updates the Zustand store *before* awaiting the
  Dexie write and has no rejection path — a failed `saveHeroName` (quota,
  private-browsing IndexedDB) would leave in-memory and persisted names
  divergent until next boot, with no UI feedback. Rare-failure class; note it
  if a settings bug report ever mentions "name reverted after reload."
- **Tests:** the no-comma finish-line quirk (`finishMatch` consumes the whole
  line → prize 0) is characterized in `tournamentSummary.test.ts:99` but not
  fixed — acceptable as documented behavior; fix only if a real fixture hits
  it.
- **Documentation:** coherent this period — STATUS/CLAUDE/ROADMAP all match
  shipped code; reports index shows zero open reports; no action.
- **Developer experience:** knip gate landed; nothing further queued.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged (third run).

## Review Ledger

- **Date/time:** 2026-07-16 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-gw5q5p` (== `origin/main` at review
  start).
- **Commit:** `a75caf4` (#198).
- **Scope:** full gate, madge, knip, layering greps, line-by-line review of
  all four substantive diffs of the period (#194, #195, #196, #198),
  resolution verification for every 07-13 finding, doc-coherence checks
  (STATUS/CLAUDE/ROADMAP/reports index vs source).
- **Graphify sync status:** index/skill/tooling absent by policy; review ran
  Graphify-free with substitute instrumentation.
- **Files changed since last run:** 5 commits / 5 PRs, 22 files,
  +710/−52.
- **Areas inspected:** see table above.
- **New findings:** none confirmed (one watchlist note: SettingsCard save
  path has no rejection handling).
- **Recurring findings:** Finding 1 (test-shim import, 2nd run — corrected:
  shim was never test-only), Finding 2 (`chipAmount` single-site, 3rd run,
  zero movement).
- **Resolved findings:** 07-13 Finding 1 (dual-profile dark → #195 shipped
  with trim), 07-13 Finding 2 (knip-in-CI → #196/#198, knip now exits 0),
  both multi-run stale exports (`writeStarterDiagnosticSummary` deleted,
  `saveHeroName` now live).
- **Worsened findings:** none.
- **Stale findings:** none — the stale-export bucket is empty for the first
  time in the series.
- **Recommended next actions:** (1) fold the UIR-002 formatter migration into
  the next UI-touching PR (third recurrence); (2) one-line test-import fix;
  (3) otherwise ship Act III product work — the cleanup backlog is drained.

## Recommended Next Actions

1. **Fold the UIR-002 `chipAmount` migration into the next UI PR** — third
   recurrence with zero movement; the float-artifact class is fixed at only
   one render site — `src/utils/format.ts`, Dashboard/Hands/Sessions render
   paths.
2. **Point `arenaDrillEngine.test.ts:7` at `analysis/arena/drillLogic`** —
   one line; removes the last analysis→pages test edge —
   `src/analysis/__tests__/arenaDrillEngine.test.ts`.
3. **Proceed with ROADMAP Act III product work** — the gate is green, knip is
   enforced and clean, docs are coherent, and no High/Medium finding remains;
   further cleanup passes have hit diminishing returns.
