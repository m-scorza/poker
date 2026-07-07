---
status: open
date: 2026-07-07
related: ['docs/reports/2026-07-01-abyss-audit.md', 'docs/reports/archive/2026-06-12-codebase-health-review.md']
---
# Codebase Health Review — 2026-07-07

Scheduled health review of `main` (HEAD `388eac6`, after PRs #116–#124),
performed in a remote session on branch `claude/relaxed-mccarthy-tkb291`.

**Graphify was not available this run.** The `/graphify` skill is not
installed in the remote container and `graphify-out/` is gitignored by
policy (`.gitignore:36-37`, decided in #65 after the 2026-06-12 review
found the committed snapshot stale and leaking local paths). The
navigation map was substituted with a fresh madge dependency graph
(195 files) plus fan-in/fan-out analysis; every finding below was verified
by direct inspection or by running the full verification gate.

## Codebase Health Summary

- **Overall health: good — the full gate is green in this container.**
  `docs:check`, `typecheck`, `typecheck:test`, `lint` (0 errors,
  **0 warnings**), **851/851 tests** (77 files, 43.9s wall under vitest 4),
  production build OK, **0 circular dependencies** (madge).
- **Main risks:** (1) god-file growth trend — `ArenaPage.tsx` grew
  634 → 1,092 lines (+72%) with R4 and `spotPacket.ts` (1,288 lines) is now
  the largest file in the repo, both added *after* the abyss audit's F19
  decomposition list was drawn; (2) the Wave 3 efficiency debt is intact
  and slightly worse — SessionsPage 453 KB / CareerPage 433 KB chunks, PDF
  stack route-bundled, PWA precache 2,407 → 2,479 KiB; (3) the F7 orphan
  decision is now unblocked (R4 landed) but not taken.
- **Highest-impact improvement:** execute Wave 3 F11 (dynamic-import the
  PDF/canvas stack) — ~150 KB gz off the largest route and out of the
  precache.
- **Confidence level:** high — all major claims verified against source or
  by executing the gate. No confidence lost to Graphify absence because
  nothing was taken on faith from a map.

## Repository / Graphify sync status

- **Branch:** `claude/relaxed-mccarthy-tkb291` @ `388eac6` — identical to
  `origin/main` tip at review time. Working tree clean; no uncommitted,
  deleted, renamed, or untracked files before this report was added.
- **Graphify freshness:** N/A — no index exists in this environment (see
  header). This is *by policy*, not staleness: the repo deliberately keeps
  Graphify local-only. Consequence: scheduled remote reviews can never use
  it; the madge + direct-inspection substitute worked and is repeatable.
- **Mismatches:** none possible (no index to drift). The substitute graph
  was generated from the exact working tree.

## Verification gate (this run)

| Check | Result |
|---|---|
| `npm run docs:check` | pass |
| `npm run typecheck` / `typecheck:test` | pass / pass |
| `npm run lint` | pass — 0 errors, **0 warnings** (Wave 1 F22 claim confirmed) |
| `npm test` | **851 / 851** (77 files, 43.9s — was 769/769 @ 210s at the abyss baseline) |
| `npm run build` | pass — precache 61 entries, 2,478.84 KiB |
| `npx madge --circular src` | **0 cycles** (Wave 1 F3 claim confirmed) |

## Dependency-map exploration (madge substitute)

- **Hubs (fan-in):** `types/analysis.ts` 57, `types/hand.ts` 55 (shared
  domain types — hub-by-design), `parser/pokerstars.ts` 22,
  `data/store.ts` 19, `leakDetector.ts` / `rangeChecker.ts` 15,
  `appStore.ts` 14.
- **Fan-out:** `CareerPage.tsx` 25, `DashboardPage.tsx` 17, `store.ts` 15,
  `App.tsx` / `HandReplay.tsx` 13.
- **True orphans (fan-in 0, non-entry):** `StudyPlanCard.tsx`,
  `ValueSnapshotCard.tsx` — exactly the abyss F7 pair, still orphaned.
  (`main.tsx`, `parser/worker.ts`, `vite-env.d.ts` are entry points, not
  orphans.)
- **Cycles:** none. The old `importRuns ↔ store` knot (June reviews) stays
  resolved — only a type-only `store.ts:14 → importRuns` import remains.

## Confirmed findings

### 1. Wave 1 abyss fixes verified landed — **Resolved**
F3 (0 cycles), F5 (`@eslint/js` in devDependencies), F6 (seated-name
actor resolution `pokerstars.ts:235-241` + adversarial fixture
`pokerstars.test.ts:122`), F20/F22 (ConfirmDialog; dropzone button, lint
0 warnings), F23 (fake "Pot 0.0" gone), F27 (`heroLedTurn` guard,
`postflopAnalyzer.ts:319`). All spot-verified in source, not just in the
PR description.

### 2. F7 orphan decision now unblocked — **Recurring, escalated**
- **Priority:** medium (was "decide at the R4 steer"; R4 landed as #121).
- **Evidence:** madge fan-in 0 for both dashboard cards; R4 built the
  Study Queue inline in `ArenaPage.tsx` and did **not** rewire
  `StudyPlanCard`. The blocking condition is gone; the decision (rewire vs
  delete) is simply untaken.
- **Action:** take the decision in Wave 2; if delete, also remove their
  dead imports/styles.

### 3. God-file growth trend — **Worsened**
- **Priority:** medium.
- **Evidence (vs abyss baseline `9068ddd`):** `ArenaPage.tsx` 634 → 1,092
  (+458, R4); `HandsUpload.tsx` 859 → 949 (+90, R2 provenance);
  `store.ts` 910 → 932. New: `analysis/spotPacket.ts` **1,288 lines** (R3)
  is now the repo's largest file — ~400 lines are exported type
  declarations living in `analysis/` while the project convention keeps
  shared types in `src/types/`. Mitigants: spotPacket has a 726-line test
  and 4 real consumers; ArenaPage's lines 143–307 are pure, extraction-ready
  helper functions.
- **Why it matters:** F19 (decomposition) was scoped before R2–R4 existed;
  executing it as written would still leave the two largest files untouched.
- **Action:** extend the F19 list with `spotPacket.ts` (split type layer →
  `types/spotPacket.ts` or a dedicated module) and `ArenaPage.tsx`
  (extract study-queue route/parse helpers + drill components).

### 4. Wave 3 efficiency debt intact, slightly worse — **Recurring/Worsened**
- **Priority:** medium.
- **Evidence:** SessionsPage chunk 453 KB and CareerPage 433 KB remain the
  two largest; `html2canvas` 194 KB still route-bundled (F11/F13);
  `gsap` + `@gsap/react` + `framer-motion` all still shipped (F12, gsap
  usage still the same 4 dashboard components); HandReplay equity still
  computed in a render IIFE (`HandReplay.tsx:611-638`, F14 — capped and
  cheap, low urgency); vitest still boots jsdom for every file
  (`vite.config.ts:42`, F16). Precache 2,407 → 2,479 KiB.
- **Nuance:** F16's payoff shrank — vitest 4 cut suite wall-clock
  210s → 44s (environment cost 458s → 77s cumulative). Deprioritize F16
  within Wave 3; F11 is now clearly the lane's biggest win.

### 5. F2 hero name still not configurable — **Recurring (scheduled)**
`saveHeroName` (`store.ts:825`) still has zero callers. Tracked for
Act III-5; no new evidence, listed only so the ledger stays honest.

### 6. Wave 4 beauty items all still present — **Recurring (expected)**
Spot-verified: `isBroadway`/`isHighCard` duplicate + dead
`heroBetFlop ? null : null` ternary (`postflopAnalyzer.ts:31-37, 308`,
F26); suit-keyed monotone textures (`strategyProfiles.ts:19-23`, F29);
30 inline hex literals in career/dashboard components (F17); all eight
F9 script-debris files still in `scripts/`. No drift — these waves are
open and correctly described by the abyss report.

## Signals not confirmed as issues

- **`types/analysis.ts` fan-in 57** — shared domain types; hub-by-design
  (same verdict as the 2026-06-12 review's "god nodes"). No action.
- **`spotPacket.ts` size as dead weight** — 4 production consumers
  (HandReplay, TrainerSpotCard, SpotSourcePanel, ArenaPage), dedicated
  13.9 KB lazy chunk, strong tests. Size is a cohesion concern (finding 3),
  not dead code.
- **10 `console.*` calls in production code** — all warn/error in genuine
  failure paths (e.g. `HandReplay.tsx:636`); none are debug leftovers.

## Review ledger

- **Date/time:** 2026-07-07 (remote scheduled session).
- **Trigger:** scheduled codebase health review (Graphify-assisted by
  design; Graphify unavailable, madge substitute used).
- **Branch / commit:** `claude/relaxed-mccarthy-tkb291` @ `388eac6`
  (= `origin/main`).
- **Scope:** full gate executed; madge graph over 195 files; direct reads
  of `postflopAnalyzer.ts`, `HandReplay.tsx`, `spotPacket.ts` (outline),
  `ArenaPage.tsx` (structure), `pokerstars.ts` (F6 region),
  `vite.config.ts`, `strategyProfiles.ts`, `scripts/`, dist chunk sizes.
- **Files changed since last review (abyss, 2026-07-01):** PRs #116–#124
  (R1–R4 salvage slices, Wave 0/1 fixes, research-corpus move).
- **New findings:** none at S1/S2 severity; growth-trend extension of F19
  (finding 3) is the only genuinely new item.
- **Recurring:** F7 (escalated — unblocked), F11–F17, F2, F26/F28/F29,
  F9 (all tracked in the abyss waves).
- **Resolved:** all Wave 0/1 items (verified in source);
  `importRuns ↔ store` cycle stays fixed; HandsUpload component test and
  shared `test/factories.ts` (June actions) stay in place.
- **Stale:** abyss F16's cost figures — vitest 4 changed the economics;
  noted in finding 4.

## Open items

- [ ] Take the F7 decision (rewire vs delete `StudyPlanCard` /
      `ValueSnapshotCard`) — the R4 blocker is gone. (Wave 2)
- [ ] Extend the abyss F19 decomposition list with `spotPacket.ts` (type
      layer split) and `ArenaPage.tsx` (study-queue helpers, lines
      143–307). (Wave 4 scope note)
- [ ] Re-rank Wave 3: F11 (lazy PDF stack) first; deprioritize F16 given
      the vitest-4 speedup (44s wall). (Wave 3 scope note)
- [ ] Flip this report `resolved` + archive once the three notes above are
      reflected in the abyss report or its waves.
