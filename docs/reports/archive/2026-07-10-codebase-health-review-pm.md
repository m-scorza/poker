---
status: resolved
date: 2026-07-10
related:
  - docs/reports/2026-07-01-abyss-audit.md
  - docs/reports/archive/2026-07-10-codebase-health-review.md
note: >
  Archived on creation (second scheduled run of 2026-07-10, PM). The gate is
  fully green, every prior finding is resolved or tracked, and the two
  actionable items from this run — recording #153's partial F25 landing in
  the abyss report and flagging ArenaPage's renewed growth under F19 — were
  fixed in the same PR that adds this report. Nothing is left open here.
---

# Codebase Health Review — 2026-07-10 (PM)

Second scheduled health review of 2026-07-10, run against `main` @ `cc4732a`
(12 commits / 10 PRs after the morning review's baseline `1b63534`:
#143–#154). **Graphify was unavailable this run** — same as every prior
remote run: `graphify-out/` is gitignored by policy (PR #65) and no Graphify
tooling exists in a fresh container. Every conclusion below comes from direct
inspection: the full verification gate executed in-container, `madge`,
`knip`, build-output probing, and line-by-line review of the new PR diffs.

## Codebase Health Summary

- **Overall health: good — the gate is fully green and the day's 10 fix PRs
  are high quality.** In-container: `docs:check`, `typecheck`,
  `typecheck:test`, `lint` (0 errors, 0 warnings), **915/915 tests
  (90 files, ~33 s)**, production build OK (shell 376.41 KB, well under the
  432 KiB CI budget; PWA precache 1 758 KiB), `madge --circular` clean
  (220 modules), knip identical to the morning run (no unused-export refill
  across 12 commits, even without a CI gate).
- **Main risks:** (1) god-file drift resumed — `ArenaPage.tsx` grew 1 405 →
  1 499 lines (+6.7%) with #149's SRS CTA, after two runs of stability;
  (2) the report-update-with-the-landing discipline slipped again — #153
  landed the dead-CSS portion of abyss F25 without recording it (third
  occurrence of this class: #141/#142 on 07-09, now #153).
- **Highest-impact improvement:** decompose ArenaPage before the next Arena
  feature lands (abyss F19 is already tracked; the pressure is now rising,
  not stable), and wire knip into CI (ROADMAP P5, still unwired).
- **Confidence level:** high — all claims verified by executing the gate or
  reading source and diffs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-jksadh`, identical to
  `origin/main` @ `cc4732a` (merge-base = HEAD = origin/main after fetch).
- **Git status:** clean working tree before this report was added.
- **Uncommitted changes:** none.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from 07-09 and 07-10 AM. Index is local-only by policy; no
  tooling installed to regenerate. The task's "Graphify map" was substituted
  with madge (dependency graph), knip (reachability), build output (chunk
  clustering), and `wc -l` (hotspots).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** unchanged from the AM run — `src/parser/`,
  `src/analysis/`, `src/data/`, `src/pages/` (13 lazy routes),
  `src/components/`.
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; `scripts/*` hooks.
- **Core modules / hotspots (lines):** `ArenaPage.tsx` **1 499 (+94)**,
  `spotPacket.ts` 1 288, `HandsUpload.tsx` 949, `store.ts` 929,
  `HandReplay.tsx` 734, `CareerPage.tsx` 717, `pokerstars.ts` 717. Only
  ArenaPage moved.
- **Dependency clusters:** parser → analysis → pages; `store.ts` the hub.
  New this run: `financials.ts` gained `computeRoiPct` and is now the single
  ROI source for careerStats/careerCoach/careerScope/CareerPage — a
  *good* new dependency convergence (#147).
- **Circular dependencies:** none (madge, 220 modules; was 219).
- **Isolated/orphaned areas:** knip's four `scripts/` "unused files" — same
  false positives as prior runs (SessionStart hook, protocol CLIs, manual
  generator).
- **Suspicious dependency relationships:** ArenaPage's deep-link handling
  reads/writes `window.location`/`history.pushState` directly instead of
  going through React Router (`ArenaPage.tsx:244`, `:687`). #149 extended
  this idiom (consistently, so not a new bug) — fold a routing cleanup into
  the F19 decomposition.

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All six gate commands executed in-container | Green: 915/915 tests (90 files), lint 0/0, build OK, shell 376.41 KB, precache 1 758 KiB |
| Dependency graph | Cycle regression check | `npx madge --circular` (220 modules) | No cycles |
| Dead code | Refill check without CI gate | `npx knip` | Identical to AM run: 4 script false positives, 2 known deliberate exports (`saveHeroName`, `writeStarterDiagnosticSummary`), 52 forward-contract types. **No refill across 12 commits** |
| #147 ROI unification | Cross-module math change | `financials.ts` (`computeRoiPct`), `careerStats.ts` diff, new tests in 4 suites | Sound: one helper, freerolls (cost = 0) excluded from the ratio, fee included in cost, positive-cost zero-buyIn entries kept |
| #148 leak lifecycle | New `useEffect` writing to Dexie on profile switch | `LeaksPage.tsx:195-201` diff, commit rationale, `LeaksPage.profileSwitch.test.tsx` | Sound: effect keyed on `strategyProfile` only (loop avoided), store fn already profile-agnostic, failing-first test added |
| #149 SRS CTA wiring | +94 lines into the largest god file | `ArenaPage.tsx` diff (`selectDueStudyReview`, `startDueStudyReview`), routing idiom at `:244`/`:497` | Correct and consistent with the page's existing imperative deep-link idiom; but it grows the monolith — see Finding 1 |
| #145 ungraded filter | Compliance-math change | `RangesPage.tsx:161`, `LifetimeScorecard.tsx:18`, new tests | Both surfaces now filter via `isUngradedDecision()` — same source of truth as the banner |
| #153 dead CSS sweep | Overlaps abyss F25 | Diff vs `desk.css` (327 → 207 lines), commit message, F25 text | Legit sweep; `.compartment` correctly left alone (lives in tokens.css). **Not recorded in the abyss report** — Finding 2 |
| #143/#144/#152/#150/#151 | Remaining PRs of the batch | Commit messages + stat, `ci.yml:42` (privacy gate), spot-checks | All small, scoped, tested; `privacy:check` now enforced in CI |
| Report/doc coherence | Protocol check | `git log 1b63534..HEAD` on abyss report / ROADMAP; docs:check | Only #146 touched the reports; #153's F25 overlap unrecorded (fixed in this PR) |

## Confirmed Findings

#### Finding 1: ArenaPage god-file growth resumed (+94 lines via #149)

- **Status:** Worsened (was "Recurring / stable" in the last two runs)
- **Priority:** Medium → **High trend** (escalate if it grows again before F19 runs)
- **Evidence:** `wc -l`: 1 405 (07-09 and 07-10 AM) → 1 499 now. #149 added
  `selectDueStudyReview`, `startDueStudyReview`, and a CTA block directly to
  the monolith — exactly the growth mode the AM review warned about ("do not
  add the next drill to the monolith").
- **Affected files/modules:** `src/pages/ArenaPage.tsx`.
- **Graphify signal:** n/a; `wc -l` vs the run ledger.
- **Direct code confirmation:** yes — diff reviewed; the code itself is
  correct and tested, the issue is purely structural.
- **Why it matters:** abyss F19 targets ~500-line pages; every feature that
  lands in the monolith raises the decomposition cost and merge-conflict
  surface for the Arena reskin slice.
- **Recommended action:** noted inline in the abyss report's F19 entry (this
  PR). Next Arena change should start by extracting the Study Queue
  drill/SRS plumbing (~400 lines of `ArenaPage.tsx` already) into a module.

#### Finding 2: #153 landed part of abyss F25 without updating the report

- **Status:** Recurring (third instance of the report-lag class: #141/#142
  on 07-09, #153 now)
- **Priority:** Low (fixed in this PR), but the *class* is recurring —
  worth a process nudge
- **Evidence:** F25's scope is "sweep for dead selectors from the
  pre-reskin era once F17 lands"; #153 deleted the dead dock/command-palette
  /loader blocks (desk.css 327 → 207 lines) ahead of F17, and the abyss
  report still listed F25 as untouched.
- **Affected files/modules:** `docs/reports/2026-07-01-abyss-audit.md`.
- **Graphify signal:** n/a; found by diffing report text against `git log`.
- **Direct code confirmation:** yes — #153 diff vs F25 text.
- **Why it matters:** the abyss report is the SessionStart-surfaced
  execution ledger; a stale "still open" sends a future session re-sweeping
  CSS that's already clean.
- **Recommended action:** done in this PR — F25 marked partial (#153),
  remainder scoped to the post-F17 tokens/desk overlap re-sweep.

## Prior Findings — Disposition (07-10 AM → now)

| AM finding | Disposition | Verification |
|---|---|---|
| 1. Abyss report lagged #141/#142 | **Resolved** (#146) | Report text current for Waves 0–3 |
| 2. knip-in-CI gap | **Recurring / tracked, unchanged** | ROADMAP P5 line 397 present; `ci.yml` still has no knip step. Mitigating data: zero refill across 12 commits this period |
| 3. God-file drift "stable" | **Worsened** → Finding 1 | ArenaPage 1 405 → 1 499 |
| (AM code-quality note) stray `writeStarterDiagnosticSummary` export | **Stale / unchanged** | Still exported; still harmless; drop when the file is next touched |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Automated-tool signals that did not
survive verification, unchanged from prior runs:

- **Signal:** knip "Unused files (4)" in `scripts/`. **Conclusion:** false
  positives (hook/CLI entry points knip can't trace) — allowlist when knip
  joins CI.
- **Signal:** knip "52 unused exported types". **Conclusion:** documented
  forward contracts (solver boundary, spot-packet schema) — keep decision
  recorded in abyss Wave 2.

## Improvement Opportunities

- **Architecture:** extract ArenaPage's Study Queue/SRS plumbing before the
  next Arena feature (`src/pages/ArenaPage.tsx` → e.g.
  `src/analysis/studyQueueDrill.ts` + a CTA component); fold the
  `window.history.pushState` routing idiom into React Router while at it.
- **Code quality:** drop the stray `export` on
  `writeStarterDiagnosticSummary` (`src/data/starterDiagnostic.ts:130`) in
  the next touching PR (carried from AM run).
- **Tests:** healthy — 915 passing (+17 this period), every fix PR shipped
  failing-first or characterization tests. No new gaps found.
- **Documentation:** fixed in this PR (abyss F25 partial record, F19 growth
  note). Process nudge: PRs that touch an open report's scope must update
  the report in the same PR — third miss in two days.
- **Developer experience:** knip in CI (ROADMAP P5) remains the one
  unwired guard; the bundle-budget guard continues to prove the pattern.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged.

## Review Ledger

- **Date/time:** 2026-07-10 PM (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-jksadh` (== `origin/main` at review
  time).
- **Commit:** `cc4732a` (#154).
- **Scope:** full gate, madge, knip, bundle probing, line-by-line review of
  the #143–#154 batch, prior-findings reconciliation vs the 07-10 AM run.
- **Graphify sync status:** index absent by policy; review ran Graphify-free.
- **Files changed since last run:** 12 commits / 10 PRs, 36 files,
  +893/−229.
- **Areas inspected:** see table above.
- **New findings:** none net-new; both findings are movements of tracked
  items.
- **Recurring findings:** report-lag class (#153/F25, fixed here);
  knip-in-CI gap (tracked, mitigated by zero refill).
- **Resolved findings:** AM Finding 1 (abyss report lag for #141/#142).
- **Worsened findings:** ArenaPage growth (1 405 → 1 499).
- **Stale findings:** `writeStarterDiagnosticSummary` export (harmless,
  carried).
- **Recommended next actions:** (1) extract Study Queue/SRS plumbing from
  ArenaPage before the next Arena feature; (2) wire knip into CI per
  ROADMAP P5; (3) enforce report-updates-with-the-landing — third miss in
  two days.

## Recommended Next Actions

1. **Extract ArenaPage's Study Queue/SRS plumbing into its own module** —
   the god file resumed growing (+94) and F19's cost rises with every
   landing — `src/pages/ArenaPage.tsx`, new `src/analysis/`/component files.
2. **Wire knip into CI with the reviewed allowlist** — the manual sweep held
   for 12 commits, but only a gate makes that durable — `.github/workflows/
   ci.yml`, `knip.json`, ROADMAP P5.
3. **Update open reports in the same PR that lands their scope** — third
   report-lag in two days; the SessionStart hook only works if the ledger is
   true — process rule, `docs/reports/*`.
