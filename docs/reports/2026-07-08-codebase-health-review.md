---
status: open
date: 2026-07-08
related: ['docs/reports/2026-07-01-abyss-audit.md', 'docs/reports/archive/2026-06-12-codebase-health-review.md']
---
# Codebase Health Review — 2026-07-08

Scheduled health review of `main` (HEAD `388eac6`, after PRs #116–#124),
performed in a remote session on branch `claude/relaxed-mccarthy-0j2861`.
**Graphify was unavailable this run** (skill not registered in the session;
the committed `graphify-out/` snapshot was removed by policy after the
2026-06-12 review). A self-built map substituted for it: madge (cycles +
orphans), jscpd (duplication), size/complexity inventory, symbol-usage greps,
and the full verification gate. Every finding below is direct-inspection
evidence.

## Open items

New, actionable, and not already tracked by the abyss-audit waves:

- [ ] Deduplicate the ICM/bounty predicates copied from `studyPlan.ts` into
      `spotPacket.ts` (see finding 1) — extract a shared helper in
      `src/analysis/`.
- [ ] Fix CLAUDE.md drift vs #108/#109: villain auto-classification is
      parked but still described as shipped (lines 87, 483); the Layout
      sidebar list omits the Coach's Note front door (line 377).
- [ ] Decide F7 (orphaned `StudyPlanCard.tsx` / `ValueSnapshotCard.tsx`) —
      the "decide at the R4 steer" gate has passed (R4 landed as #121 and
      built the Study Queue in Arena, not on the dashboard). Remove or
      rewire; also fold `spotPacket.ts`/`ArenaPage.tsx` into the abyss F19
      god-file list.

Recurring items (F8, F9, F11–F16, F17–F29 remnants) stay tracked by
`docs/reports/2026-07-01-abyss-audit.md` waves 2–4 — not re-listed here.

## Codebase Health Summary

- **Overall health: good — the best gate result of any review to date.**
  Fresh-container run: `docs:check`, `typecheck`, `typecheck:test`, `lint`
  (0 errors, **0 warnings**), **851/851 tests** (77 files, 37.8s wall),
  production build OK (precache 2,479 KiB / 61 entries). **Zero circular
  dependencies** (madge), zero `any`/suppressions/TODO in production code.
- **Main risks:** doc drift is creeping back (CLAUDE.md still sells parked
  auto-archetypes and the pre-#109 nav); the R3/R4 feature push re-introduced
  production duplication and two new god-file candidates that postdate the
  abyss audit's F19 list.
- **Highest-impact improvement:** execute abyss Wave 2 (dead code) now that
  R1–R4 have landed — the "wait for the Hermes salvage slices" precondition
  is satisfied, and F7's decision gate has passed.
- **Confidence level:** high — all claims verified against source or by
  executing the gate; no reliance on stale indexes.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-0j2861`, even with
  `origin/main` (0 ahead / 0 behind) at `388eac6` (2026-07-03).
- **Git status:** clean working tree; no uncommitted, deleted, renamed, or
  untracked files before this report was added.
- **Graphify freshness:** **unavailable.** No `/graphify` skill in this
  session and no `graphify-out/` in the tree (removed by policy — see the
  2026-06-12 review, finding 1, resolved via #65). There is no Graphify index
  to be stale *against*; nothing could be cross-checked.
- **Mismatches found:** n/a (no index).
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none on conclusions (everything was verified
  directly), but navigation leads had to be regenerated with madge/jscpd/
  grep instead of read from a map. If Graphify-assisted reviews are to
  continue, the skill needs to be installed in the scheduled session or a
  slim `GRAPH_REPORT.md` regenerated on merge.

## Verification gate (this run, fresh container)

| Check | Result |
|---|---|
| `npm run docs:check` | pass |
| `npm run typecheck` | pass |
| `npm run typecheck:test` | pass |
| `npm run lint` | pass — 0 errors, **0 warnings** (F22 fix holds) |
| `npm test` | **851 / 851** (77 files, 37.8s wall; vitest **4.1.8**) |
| `npm run build` | pass (PWA precache 61 entries, 2,478.84 KiB) |

## Map exploration (self-built, in lieu of Graphify)

- **Main areas:** `src/parser` (4 site parsers + sanitizer + worker),
  `src/analysis` (28 modules — the largest area, now including the R3/R4
  `spotPacket.ts`/`studyPacketProgress.ts`/`srsScheduler.ts` cluster),
  `src/data` (Dexie store, zustand appStore, ranges, importRuns), `src/pages`
  (11 routes, `/` = CoachsNotePage since #109), `src/components`
  (hands/career/dashboard/shared).
- **Entry points:** `src/main.tsx`, `src/parser/worker.ts` (both correctly
  flagged as madge "orphans" — they are roots, not dead).
- **Dependency health:** **0 cycles** across 195 modules. The former
  `importRuns ↔ store` knot is gone: `importRuns.ts` no longer re-exports
  from `store.ts`; the only remaining edge is a one-way `import type`
  (store.ts:14). Resolved.
- **True orphans:** `components/dashboard/StudyPlanCard.tsx` and
  `components/dashboard/ValueSnapshotCard.tsx` — the abyss F7 pair, still
  zero-referenced.
- **Size hotspots (post-R4):** `analysis/spotPacket.ts` **1,288** (now the
  largest file in the repo; ~40 exported types + builders, added by #120),
  `pages/ArenaPage.tsx` **1,092** (22 hook calls; URL-query parsing + SRS
  orchestration + drill logic + render in one file, grown by #106/#121),
  `components/hands/HandsUpload.tsx` 949, `data/store.ts` 932,
  `components/hands/HandReplay.tsx` 723, `parser/pokerstars.ts` 711.
- **Duplication:** jscpd (min 70 tokens) — production clones ≈1–1.9% by
  format; growth since the audit's 0.64% is mostly new R2–R4 *test* setup
  clones (studyQueueRouteContract ↔ ArenaPage tests, solverSpotBuilder ↔
  spotPacket tests, importRuns internal), plus one new *production* clone
  (finding 1).

## Areas inspected directly

- `src/analysis/spotPacket.ts` (+ its 726-line test) — new largest file;
  outline read, duplication block verified. Result: cohesive but oversized;
  finding 1 and god-file note.
- `src/analysis/studyPlan.ts:162–187` — clone counterpart. Confirmed.
- `src/pages/ArenaPage.tsx` — structure/hook census. God-file candidate.
- `src/data/store.ts` + `src/data/importRuns.ts` — cycle re-check. Resolved.
- `src/components/hands/HandReplay.tsx:610–638` — equity render IIFE.
  Still un-memoized (abyss F14, recurring).
- `src/App.tsx` routes, `src/pages/VillainsPage.tsx`,
  `src/analysis/villainClassifier.ts`, `store.ts:698–702` — post-#108/#109
  reality vs CLAUDE.md. Drift confirmed (finding 2). `villainClassifier.ts`
  itself is still live (store imports `computeVillainStats`/`emptyCounters`);
  only archetype stamping is parked, deliberately, with an explanatory
  comment — code side is honest, docs side is not.
- `scripts/` inventory — F9 debris unchanged (fix_imports.cjs,
  migrate-styles.mjs, scratch.ts, test-odds.cjs/.mjs, test-summaries.cjs,
  stress-test-parser.ts, hygiene-scanner.ts all still present).
- Dead-export spot checks (`saveHeroName`, `handExists`, `getVillainNote`,
  `REACTION_RANGES`, `BB_DEFENSE_RANGE`, `GAME_PLAN_THRESHOLDS`,
  `calculateLeakConfidence`) — each appears only in its defining file. F8
  recurring; F2 (hero-name UI, `saveHeroName` zero callers) recurring,
  scheduled for Arc 5.
- Bundle output — SessionsPage 463.96 kB (149 gz) and CareerPage 443.89 kB
  (125 gz) still the two largest routes; html2canvas 199.56 kB + purify
  26 kB chunks confirm the PDF stack still loads with routes (F11/F13
  recurring). Precache grew 2,407 → 2,479 KiB since the audit.
- `package.json` — gsap + @gsap/react + framer-motion all still declared
  (F12 recurring).
- `vite.config.ts:42` — single global `environment: 'jsdom'` (F16
  recurring, but demoted: 37.8s wall in this container vs 210s at audit,
  after the vitest 3→4 upgrade; env setup is still 65s of the 84s cumulative
  cost, so the split remains the biggest CI win, just less urgent).
- Wave 1 (#124) claim-by-claim verification — all six confirmed in source:
  0 cycles (F3), STATUS prose matches routes (F4), `@eslint/js` declared
  (F5), no `window.confirm` in src (F20), lint 0 warnings (F22), probe/donk
  OOP guards + adversarial name fixture present (F27/F6).

## Confirmed findings

### 1. R3 copied the ICM/bounty predicate trio into spotPacket.ts
- **Status:** New. **Priority:** Medium.
- **Evidence:** `spotPacket.ts:420–436` (`isIcmSensitive`, `isPkoContext`,
  `isPayJumpSensitive`) is byte-identical to `studyPlan.ts:167–183` — except
  the first is named `isIcmOrBountySensitive` there. jscpd flags the block;
  read confirms.
- **Why it matters:** "what counts as ICM-sensitive" is a semantic rule that
  now lives in two files under two names. The next bubble/ITM refinement
  will change one and silently not the other, and study-plan selection will
  disagree with the packets built from it.
- **Recommended action:** extract to a shared `src/analysis` helper (e.g.
  `icmSensitivity.ts`) and import from both; pick one name.

### 2. CLAUDE.md drifted again — sells parked auto-archetypes and pre-#109 nav
- **Status:** New (post-dates the F4 STATUS fix, which covered STATUS.md
  only). **Priority:** Medium.
- **Evidence:** CLAUDE.md:87 "Villain Tracker — Auto-classify opponents
  (Fish/Nit/TAG/LAG/Station/Maniac)" and the whole §"Villain
  Auto-Classification (MDA)" (line 483) — but archetype stamping was parked
  2026-06-23 (#108; `store.ts:698–702` stamps `archetype: null` with an
  explanatory comment; `VillainsPage.tsx:6` documents the parking).
  CLAUDE.md:377 sidebar list starts at "Dashboard" — `/` has been
  CoachsNotePage since #109 (`App.tsx:60`).
- **Why it matters:** this is the exact drift mode the repo's own rule
  ("update this file in the same PR as the code change") exists to prevent,
  and it misleads every agent that plans from CLAUDE.md.
- **Recommended action:** one small docs PR: mark auto-classification as
  parked (pointer to ROADMAP "Parked"), fix the Layout line, sweep the
  Core Features list against `App.tsx`.

### 3. Two new god-files postdate the abyss F19 list
- **Status:** New (files created/grown by #120/#121, after the audit).
  **Priority:** Low-Medium.
- **Evidence:** `spotPacket.ts` 1,288 lines (~40 exported interfaces/types
  + builder + bundle logic in one module); `ArenaPage.tsx` 1,092 lines / 22
  hook calls mixing query-string parsing helpers (:143–204), drill/SRS
  logic, and rendering. Both exceed every file on the audit's F19 list
  (store.ts 932 is now third).
- **Why it matters:** Wave 4's decomposition scope is already stale one week
  after it was written; if it executes as scribed, the two worst offenders
  are skipped.
- **Recommended action:** amend abyss F19 to include both (spotPacket: split
  the type layer from the builders, or move types to `src/types/`;
  ArenaPage: extract the study-queue routing helpers and drill components).

### 4. F7 orphan decision is now unblocked
- **Status:** Recurring (abyss F7) — decision gate passed. **Priority:**
  Medium (was "wait for R4 steer").
- **Evidence:** madge orphans: `StudyPlanCard.tsx`, `ValueSnapshotCard.tsx`
  (only non-entry-point orphans in `src/`). R4 landed as #121 and built the
  Study Queue drill inside Arena — not on the dashboard card.
- **Recommended action:** decide remove-vs-rewire in Wave 2; the blocking
  condition no longer exists.

### 5. Wave 1 (#124) — verified landed, claim by claim
- **Status:** Resolved (verification of prior fixes).
- **Evidence:** see "Areas inspected" — F3/F4/F5/F6/F20/F22/F23/F27 all
  confirmed in source; lint baseline is 0 warnings; madge reports 0 cycles.

### 6. 2026-06-12 ledger items — all five closed and verified
- **Status:** Resolved.
- **Evidence:** graphify-out policy (removed from tree); importRuns↔store
  knot (one-way type import only); `HandsUpload.test.tsx` exists (367
  lines); `src/test/factories.ts` exists (`makeHand` et al.); jsx-a11y
  warnings 0.

## Signals not confirmed / unverifiable

- **Abyss F10 (worktree/snapshot debris):** unverifiable from this remote
  container — `.claude/worktrees/` doesn't exist in a fresh clone and
  `git worktree list` shows only the primary checkout. The debris, if it
  still exists, is on the owner's machine. Follow up locally.
- **jscpd headline growth (0.64% → ~1%):** not treated as a quality
  regression — the delta is dominated by new *test* setup clones in R2–R4
  suites (acceptable; extract shared harness helpers opportunistically) and
  one real production clone (finding 1).
- **madge "orphans" `main.tsx`, `parser/worker.ts`, `vite-env.d.ts`:**
  false positives — entry points and ambient types, not dead code.
- **grep hit for `any` in production:** false positive — a comment in
  `postflopAnalyzer.ts:112`. Production `any` count remains 0.

## Improvement opportunities

- **Architecture:** extract shared ICM predicates (finding 1,
  `spotPacket.ts`/`studyPlan.ts`); amend F19 scope (finding 3).
- **Code quality:** memoize the HandReplay equity IIFE
  (`HandReplay.tsx:610–638`, abyss F14); Wave 4 remnants unchanged
  (F17 hex tokens, F18 clones incl. `csvExport.ts:44` ↔ `pdfExport.ts:153`,
  F21 rank tables, F24 sixteen `'scorza23'` literals, F26 `isBroadway`≡
  `isHighCard`, F29 suit-keyed monotone textures — all re-verified present).
- **Tests:** unchanged from abyss §6 (csvExport/pdfExport/format/
  strategyProfiles/appStore untested); new R2–R4 modules arrived *with*
  strong suites (spotPacket 726-line test, importRuns 572) — good pattern.
- **Documentation:** finding 2 (CLAUDE.md); keep the abyss report's wave
  checkboxes current (Wave 1 box already ticked — good).
- **Developer experience:** F16 env split still the biggest CI win (65s of
  84s cumulative is jsdom setup for pure-Node suites); vitest 4 upgrade
  already halved wall time.
- **Dependency cleanup:** F12 (drop gsap or lazy-load the quartet);
  F11 (dynamic-import the jsPDF/html2canvas stack — ~150 kB gz off
  SessionsPage and out of the 2.4 MB precache).

## Review Ledger

- **Date/time:** 2026-07-08 (scheduled remote session).
- **Trigger:** scheduled codebase health review.
- **Branch:** `claude/relaxed-mccarthy-0j2861` (even with `origin/main`).
- **Commit:** `388eac6`.
- **Scope:** full repo; full gate executed; map self-built (madge, jscpd,
  size census, symbol greps) — Graphify unavailable.
- **Graphify sync status:** no index present (removed by policy #65); skill
  not registered in session. Zero Graphify-derived claims in this report.
- **Files changed since last health review (2026-06-12, `36ffabd`):**
  PRs #58–#124 — notably the R1–R4 salvage slices (#117/#118/#120/#121),
  the dashboard demotion (#109), archetype parking (#108), refusal/
  provenance systems, abyss Wave 0/1 (#116/#124), vitest 3→4.
- **Areas inspected:** listed above.
- **New findings:** ICM-predicate duplication (1), CLAUDE.md drift (2),
  post-audit god-files (3).
- **Recurring findings:** F7 (now unblocked, 4), F8, F9, F11–F17, F18
  remnants, F21, F24, F26, F29, F2 (Arc 5), scorza23 literals.
- **Resolved findings:** Wave 1 set (5); all five 2026-06-12 ledger
  actions (6); importRuns↔store cycle; jsx-a11y warnings; HandsUpload test;
  shared factories.
- **Stale findings:** abyss F16 urgency (210s wall → 38s post-vitest-4;
  still worth doing, no longer alarming); abyss F19 file list (superseded by
  finding 3); F10 unverifiable remotely.
- **Recommended next actions:** below.

## Recommended next actions

1. Execute abyss Wave 2 (F8 prune, F9 script debris, F7 decision) — the
   R1–R4 precondition is satisfied and the orphans are the only true dead
   code left — `scripts/*`, `store.ts`, `ranges.ts`, `strategyProfiles.ts`,
   `components/dashboard/{StudyPlanCard,ValueSnapshotCard}.tsx`.
2. Extract the shared ICM predicates — prevents semantic drift between
   study-plan selection and spot packets — `src/analysis/spotPacket.ts:420`,
   `src/analysis/studyPlan.ts:167`.
3. Fix CLAUDE.md drift (archetypes parked, Coach's Note front door) — it is
   the top-of-funnel doc for every agent — `CLAUDE.md:87,377,483`.
4. Fold `spotPacket.ts` + `ArenaPage.tsx` into the F19 decomposition scope
   before Wave 4 executes — `docs/reports/2026-07-01-abyss-audit.md`.
5. When Wave 3 runs, keep F11 first (PDF lazy-load: largest single bundle
   win, ~150 kB gz) and re-measure F16 with vitest 4 numbers —
   `src/utils/pdfExport.ts`, `vite.config.ts`.
