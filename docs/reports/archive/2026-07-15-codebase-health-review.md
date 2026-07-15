---
status: resolved
date: 2026-07-15
related:
  - docs/reports/archive/2026-07-13-codebase-health-review.md
note: >
  Archived on creation (scheduled run of 2026-07-15). The gate is fully green
  and three of the 07-13 run's four recommended actions landed this period
  (#195 settings editors, #196/#198 knip-in-CI, and the arena test-import fix
  applied in this PR — with a correction: the shim re-export is NOT trimmable,
  ArenaPage legitimately consumes it). The stale CLAUDE.md dependency block
  (vite 6/vitest 3 → actually vite 8/vitest 4 since #152) was fixed in this
  PR. Everything still open (UIR-002 formatter migration, GOALS.md identity
  gate, merge-path trim hardening) is tracked in ROADMAP/plans.
---

# Codebase Health Review — 2026-07-15

Scheduled health review, run against `main` @ `a75caf4` (5 commits / PRs
#193–#198 after the 07-13 review's baseline `ae20052`). **Graphify was
unavailable this run** — same as every prior remote run: no Graphify index,
skill, or tooling exists in a fresh container. Every conclusion below comes
from direct inspection: the full verification gate executed in-container,
`madge`, `knip` (now also a CI gate), layering greps, line-by-line review of
all four substantive diffs, and a runtime probe of the bounty-line regex.

## Codebase Health Summary

- **Overall health: excellent — gate fully green, and this was the most
  responsive period in the series.** In-container: `docs:check`, `typecheck`,
  `typecheck:test`, `lint` (0/0), **1029/1029 tests (100 files; +7 tests,
  +1 file)**, production build OK (shell 376.77 KB, +0.09; precache
  1 764.03 KiB, +3.8), `npx knip` exit 0, `madge --circular` clean
  (258 modules, +2). Three of the 07-13 run's four recommended actions landed
  as PRs (#195, #196, #198); the fourth (a one-line test-import fix) is
  applied in this PR.
- **Main risks:** (1) `chipAmount` is still adopted at exactly one render
  site (UIR-002, third consecutive run); (2) `mergePersistedSettings`
  (appStore.ts:33-36) still passes a legacy persisted hero name through
  untrimmed — mitigated in practice by the boot-read (`getHeroName →
  setHeroName` now trims), but the localStorage copy is a second source of
  truth that can resurrect an untrimmed name if the Dexie read ever fails;
  (3) CLAUDE.md's build-tool versions had silently drifted two majors
  (vite 6→8, vitest 3→4, landed at #152) — fixed in this PR, but it shows the
  "verified on date X" stamps go stale without a checker.
- **Highest-impact improvement:** decide the GOALS.md identity gate
  (ROADMAP III-5) — it is now the only thing keeping the III-5 box unticked,
  and it gates EPIC G and the backend/payments question.
- **Confidence level:** high — all claims verified by executing the gate or
  reading source, diffs, and history. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-g0bcp7`, identical to
  `origin/main` @ `a75caf4` at review start (HEAD is ancestor check passed;
  0 ahead / 0 behind after fetch).
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none at start; this PR carries the report, the
  one-line test-import fix, and the CLAUDE.md dependency-block refresh.
- **Graphify freshness:** **no Graphify index exists in this container** —
  the `/graphify` skill is not registered and no index files exist in the
  repo (unchanged from all prior remote runs; local-only by policy).
  Substituted with madge (cycles), knip (reachability — now also enforced in
  CI by #196), grep (layering direction), build output (chunk clustering),
  and `git log -S` (history archaeology).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** `src/parser/`, `src/analysis/`, `src/data/`,
  `src/pages/`, `src/components/` (9 subdirs). New module this period:
  `components/settings/SettingsCard.tsx` (+ its test suite) — the first file
  in `components/settings/`.
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; the four `scripts/` entries now codified in
  `knip.jsonc`.
- **Core modules / hotspots:** unchanged from 07-13 —
  `curriculumSeedPacks.generated.ts` 2 514 (generated), `spotPacket.ts`
  1 288, `ArenaPage.tsx` ~998, `store.ts` ~790, `pokerstars.ts` 718. No
  non-generated file above 1 300 lines.
- **Dependency clusters:** parser → analysis → pages remains unidirectional
  in production code (grep: zero `pages/` imports from
  analysis/data/parser/utils production files). New edge this period:
  `components/settings/SettingsCard.tsx` → `data/appStore.ts` +
  `data/store.ts` (`saveHeroName`, previously a dead export, now live).
- **Highly connected files:** `data/appStore.ts` gained its first
  settings-UI consumer; `pages/arena/actionOptions.ts` confirmed as a
  same-layer barrel for `ArenaPage` (see Finding 2 correction).
- **Isolated or orphaned areas:** none new; knip now exits 0 with the
  reviewed `knip.jsonc` allowlist (4 CLI/hook entries + 3 forward-contract
  files), so the recurring "unused files (4)" false positives are formally
  dispositioned rather than re-litigated each run.
- **Suspicious dependency relationships:** the analysis-test → pages-shim
  edge from 07-13 was still present at review start; fixed in this PR
  (`arenaDrillEngine.test.ts:7` now imports from `../arena/drillLogic`).
- **Complexity or metric hotspots:** shell chunk 376.77 KB (+0.09, under
  budget); `pdfExport` lazy chunk 432.39 KB (flat); precache 1 764.03 KiB
  (+3.8, from the new settings card).

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All gate commands executed in-container (exit 0) | Green: 1029/1029 tests (100 files), lint 0/0, build OK, knip 0 findings |
| Dependency graph | Cycle check after new module | `npx madge --circular` (258 modules) | No cycles |
| Layering direction | Recurring check | grep for `pages/` imports across analysis/data/parser/utils | Production clean; the one test wart fixed in this PR |
| #195 settings editors | Top recommendation from 07-13; touches persistence | Full `SettingsCard.tsx` diff, `appStore.ts` full read, `store.ts:676-686`, `Layout.tsx:60-66`, new tests | Sound: trims at `setHeroName`, blank-name guard, Dexie write path live; residual: merge path untrimmed (Finding 3), dual persistence noted |
| #194 prize-extraction fix | Parser correctness on money paths | `tournamentSummary.ts` diff, `RE_MONEY` before/after, new regression tests | Sound: digit-anchored capture, eliminating/bounties lines excluded from prize fallback |
| #196/#198 knip-in-CI | Closes 6-run recurring finding | `knip.jsonc` full read, `ci.yml` step, #198 de-export diff, `npx knip` run | Sound: allowlist is documented per-entry and was *narrowed* in #198 rather than left file-wide |
| Prior Finding 3 (test → shim import) | Recurrence check | `arenaDrillEngine.test.ts:7`, `actionOptions.ts:7`, grep for all `pickRandomDecision` consumers, `ArenaPage.tsx:20-29` | Still present at start; **prior claim corrected** — ArenaPage also consumes the re-export, so only the test import was wrong. Fixed in this PR; suite + typecheck + knip re-verified green |
| Prior Finding 4 (`chipAmount`) | Recurrence check | grep for render consumers | Still only `HandReplay.tsx:451` — recurring |
| CLAUDE.md dependency block | Doc-drift sweep | `package.json` vs CLAUDE.md:434-454; `git log -S '"vite": "^8'` | **Stale two majors** (vite 6→8, vitest 3→4, plugin-react 4→6, since #152) — fixed in this PR |
| Bounty-line regex | Adjacent to #194's fix | Runtime probe of `RE_BOUNTY_LINE` against plausible wordings; fixture grep | Hypothetical miscapture on "won 3 bounties totalling $X" wording — **unconfirmed**, no fixture shows that format (see Signals Not Confirmed) |
| GOALS.md gate | #195 commit message references it | `find` for GOALS.md; ROADMAP III-5 read | Still absent; III-5 correctly remains unticked with an honest update note |

## Confirmed Findings

#### Finding 1: CLAUDE.md dependency block drifted two major versions

- **Status:** New (drift itself dates to #152, before the last review window;
  first detected this run)
- **Priority:** Low (doc-only; fixed in this PR)
- **Evidence:** CLAUDE.md:451-453 claimed `vite 6, @vitejs/plugin-react 4,
  vitest 3` under a "verified 2026-05-31" stamp; `package.json` has
  `vite ^8.0.0`, `@vitejs/plugin-react ^6.0.0`, `vitest ^4.0.0` (the gate run
  itself printed `vitest v4.1.8`). `git log -S '"vite": "^8'` attributes the
  bump to #152.
- **Affected files/modules:** `CLAUDE.md`.
- **Graphify signal:** n/a; caught by cross-checking gate output against docs.
- **Direct code confirmation:** yes.
- **Why it matters:** CLAUDE.md's own preamble warns it drifts, but the deps
  block carries a "verified against package.json" date that was 6 weeks and
  two tool majors stale — exactly the false-confidence pattern the preamble
  warns about.
- **Recommended action:** done in this PR (block updated + re-stamped
  2026-07-15, knip 6 added). Consider folding a version check into
  `docs:check` if this recurs.

#### Finding 2: analysis-layer test imported the pages shim — fixed, with a correction to the 07-13 record

- **Status:** Recurring → **Resolved in this PR**
- **Priority:** Low
- **Evidence:** `arenaDrillEngine.test.ts:7` still imported
  `pickRandomDecision` from `../../pages/arena/actionOptions` at review
  start. Grep of all consumers shows `ArenaPage.tsx:27` **also** imports it
  from the same barrel — so the 07-13 claim that the test was the re-export's
  "sole consumer" and the re-export would become trimmable was wrong; the
  re-export is legitimate same-layer API for the Arena page. #198
  independently confirmed this by trimming `labelSeedAction`/`shouldCbet` but
  keeping `pickRandomDecision`.
- **Affected files/modules:**
  `src/analysis/__tests__/arenaDrillEngine.test.ts` (fixed),
  `src/pages/arena/actionOptions.ts` (unchanged — correctly keeps the
  re-export).
- **Graphify signal:** layering grep (substitute).
- **Direct code confirmation:** yes; suite (6/6), `typecheck:test`, and knip
  re-run green after the fix.
- **Why it matters:** the test edge inverted dependency direction
  (analysis test → pages); the record correction matters because a future
  "trim the shim" cleanup based on the 07-13 note would have broken
  `ArenaPage`.
- **Recommended action:** none further — done.

#### Finding 3: hero-name trim is enforced at one of two persistence boundaries

- **Status:** New (successor to the 07-13 "whitespace footgun" note — the
  primary fix landed in #195; this is the residual)
- **Priority:** Low
- **Evidence:** `setHeroName` now trims (appStore.ts:104) and `SettingsCard`
  trims + blank-guards before saving, but `mergePersistedSettings`
  (appStore.ts:33-36) assigns `incoming.heroName` untrimmed when rehydrating
  the Zustand persist copy from localStorage. In practice the boot-read
  (`Layout.tsx:65` → `getHeroName()` → `setHeroName`) re-trims immediately,
  so the untrimmed value only survives if the Dexie read fails. Note also
  the architectural wrinkle: `heroName` is persisted **twice** (localStorage
  via `partialize`, Dexie `settings` table via `saveHeroName`), with Dexie
  winning at boot.
- **Affected files/modules:** `src/data/appStore.ts`,
  `src/components/layout/Layout.tsx`, `src/data/store.ts:676-686`.
- **Graphify signal:** n/a; source read.
- **Direct code confirmation:** yes (including the characterization tests
  added in #195 — `appStore.test.ts` pins both the trim and the merge
  passthrough).
- **Why it matters:** an untrimmed hero name silently breaks
  `Dealt to <name>` matching in every parser; the remaining window is narrow
  but the dual-store design means the two copies can disagree.
- **Recommended action:** trim inside `mergePersistedSettings` (one line +
  update the characterization test) on the next appStore touch; longer-term,
  consider making Dexie the single source of truth and dropping `heroName`
  from `partialize`.

#### Finding 4: `chipAmount` still adopted at a single render site (UIR-002)

- **Status:** Recurring (third run; unchanged this period — no UI PRs touched
  render formatting)
- **Priority:** Low
- **Evidence:** grep — render consumers of `chipAmount` are still only
  `HandReplay.tsx:25,451`.
- **Affected files/modules:** `src/utils/format.ts`, pages rendering raw
  chip/pot numbers.
- **Graphify signal:** n/a; grep.
- **Direct code confirmation:** yes.
- **Why it matters:** the `385.00000000000006` float-artifact class remains
  fixed only where it was originally reported.
- **Recommended action:** finish the UIR-002 formatter migration (tracked in
  `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`).

## Prior Findings — Disposition (07-13 → now)

| 07-13 finding | Disposition | Verification |
|---|---|---|
| 1. Dual-profile feature dark (selector never existed) | **Resolved** — #195 shipped `SettingsCard` on `/data`: `setStrategyProfile` has its first UI call site; `advanced` profile reachable; hero-name editor + trim landed with tests | Diff read line-by-line; `SettingsCard.test.tsx` (89 lines) + appStore trim test verified in gate |
| 2. knip not wired into CI (sixth run) | **Resolved** — #196 added `knip.jsonc` + CI step; #198 narrowed the allowlist by de-exporting 11 candidates across 7 files and deleting `writeStarterDiagnosticSummary` | `ci.yml` step read; `knip.jsonc` reviewed entry-by-entry; `npx knip` exit 0 in-container |
| 3. analysis test imports pages shim | **Resolved in this PR**, with a record correction (re-export is NOT trimmable — ArenaPage consumes it) | See Finding 2 |
| 4. `chipAmount` single-site (UIR-002) | **Recurring, unchanged** | See Finding 4 |
| Stale `writeStarterDiagnosticSummary` export (4 runs) | **Resolved** — deleted in #198 | #198 diff |
| `saveHeroName` dead export (reclassified 07-13 as III-5's write path) | **Resolved as predicted** — now live via `SettingsCard` | grep + diff |
| heroName whitespace footgun (ROADMAP III-5 note) | **Mostly resolved** (#195); merge-path residual carried as Finding 3 | appStore.ts read |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Substitute-tool/probe signals that
did not survive verification:

- **Signal:** runtime probe shows `RE_BOUNTY_LINE`
  (tournamentSummary.ts:32) captures the *count* ("3") instead of the amount
  for a hypothetical `You won 3 bounties totalling $4.50` summary line.
  **Why it was suspicious:** #194 fixed the sibling `RE_MONEY` leading-comma
  quirk; the lazy `.*?` in the bounty regex has an analogous first-number
  bias. **What was checked:** grep of the full fixture corpus — every real
  bounty line uses `wins ($X for eliminating|the $X bounty for eliminating)`
  wording, which the regex parses correctly; no fixture or test shows a
  count-before-amount summary wording. **Conclusion:** unconfirmed — no
  evidence PokerStars emits that format; behavior on all attested formats is
  correct. **Recommended follow-up:** if a real multi-bounty tournament
  summary is ever imported, add it as a fixture before touching the regex.
- **Signal:** knip historical noise (4 unused files, 52 unused types).
  **Conclusion:** formally closed — #196's `knip.jsonc` documents each
  allowlisted entry with its reason, #198 narrowed it, and knip now runs in
  CI at exit 0. This signal class should not recur.

## Improvement Opportunities

- **Architecture:** make Dexie the single source of truth for `heroName`
  (drop it from `partialize` in `appStore.ts`) or trim in
  `mergePersistedSettings` — Finding 3. Small, next appStore touch.
- **Code quality:** `SettingsCard.handleSaveName` awaits the Dexie write with
  no failure path (`void handleSaveName()`); a quota/private-mode rejection
  is silent (no "Saved." shown, no error). Within the repo's
  "no error handling for impossible scenarios" rule this is acceptable —
  watchlist only.
- **Tests:** none outstanding this period — #194/#195 shipped regression and
  characterization coverage with their changes (1029 tests, +7).
- **Documentation:** CLAUDE.md dependency block fixed in this PR (Finding 1);
  the ROADMAP III-5 update note is a good honesty pattern (slice landed, box
  stays unticked pending GOALS.md).
- **Developer experience:** consider a `docs:check` extension that diffs
  CLAUDE.md's dependency block against `package.json` majors, so "verified
  on" stamps can't silently rot (Finding 1's class).
- **Dependency cleanup:** `framer-motion@12 → motion` migration still queued
  in ROADMAP P5; unchanged.

## Review Ledger

- **Date/time:** 2026-07-15 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine
  (Graphify unavailable; direct-inspection substitute, same as all prior
  remote runs).
- **Branch:** `claude/relaxed-mccarthy-g0bcp7` (== `origin/main` at review
  start).
- **Commit:** `a75caf4` (#198).
- **Scope:** full gate (docs:check / typecheck / typecheck:test / lint /
  1029 tests / build / knip), madge, layering greps, line-by-line review of
  #194, #195, #196, #198, prior-findings reconciliation vs 07-13, bounty-regex
  runtime probe, CLAUDE.md dependency audit.
- **Graphify sync status:** index absent by policy; review ran Graphify-free.
- **Files changed since last run:** 5 commits / 5 PRs (#193–#198), 25 files,
  ~+470/−90.
- **Areas inspected:** see table above.
- **New findings:** Finding 1 (CLAUDE.md dep-block drift — fixed in this PR),
  Finding 3 (merge-path trim residual + dual heroName persistence).
- **Recurring findings:** Finding 4 (`chipAmount` single-site, third run).
- **Resolved findings:** 07-13 Findings 1 (dual-profile dark — #195),
  2 (knip-in-CI — #196/#198), 3 (test → shim import — this PR, with record
  correction), plus the `writeStarterDiagnosticSummary`/`saveHeroName` stale
  exports (#198/#195).
- **Worsened findings:** none.
- **Stale findings:** none carried — the stale-export class was cleared by
  #198.
- **Recommended next actions:** see below.

## Recommended Next Actions

1. **Decide the GOALS.md identity gate (ROADMAP III-5)** — it is now the only
   open item in III-5 and gates EPIC G / backend-payments decisions; every
   later arc references it — `GOALS.md` (new), `docs/product/ROADMAP.md`.
2. **Finish the UIR-002 formatter migration** — third consecutive run at one
   render site; the float-artifact class is otherwise latent everywhere raw
   chips render — `src/utils/format.ts`, pages rendering chip/pot values
   (plan: `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`).
3. **Trim in `mergePersistedSettings` (or single-source heroName in Dexie)**
   — closes the last untrimmed path and removes the dual-persistence
   disagreement window — `src/data/appStore.ts`,
   `src/data/__tests__/appStore.test.ts`.
