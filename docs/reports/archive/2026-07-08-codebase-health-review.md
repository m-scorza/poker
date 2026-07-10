---
status: resolved
date: 2026-07-08
related: ['docs/reports/2026-07-01-abyss-audit.md', 'docs/reports/archive/2026-06-12-codebase-health-review.md']
closed_by: point-in-time snapshot — all actionable items already tracked in the open abyss audit (Waves 2–4)
---

# Codebase Health Review — 2026-07-08

> Scheduled health-review run (remote container, fresh clone of `main` @
> `388eac6`). Method: Graphify was requested as the navigation layer but the
> skill is **not installed in this environment** (no project/plugin/claude.ai
> skill, no index in-tree — only the retired `graphify-out` worktree experiment
> named in abyss F10). Substituted a self-built import graph (static-import
> walker over `src/`), full verification gate, chunk-size re-measurement, and
> direct reads of post-audit code. All findings below are direct-inspection
> confirmed; no conclusions rest on a stale index.

## Verdict

**Healthy and improving; the audit backlog is now unblocked but untouched.**
Gate fully green on a fresh clone: docs:check ✓, typecheck ✓, lint ✓ (**0
warnings**, was 3), **851/851 tests** (was 769), build ✓. Zero `any` /
suppressions in the ~2.6k lines of post-audit code (spot packets, study queue,
provenance). Zero circular deps (abyss F3 fix confirmed by independent graph
walk). The one structural regression: the god-file problem **grew** while
Wave 1 fixed correctness — `spotPacket.ts` (1,288) and `ArenaPage.tsx` (1,092)
now top the size chart and neither is on F19's decomposition list.

## Repository / sync status

- Branch `claude/relaxed-mccarthy-rzehiw` == `origin/main` @ `388eac6`; tree clean.
- Import graph generated from the current tree (no staleness); no Graphify
  baseline exists to drift from.

## Map highlights (self-built graph, verified)

- **Cycles: 0.** F3 (types→analysis cycle) confirmed gone.
- **Fan-in hubs:** `types/analysis.ts` (57 importers), `types/hand.ts` (55),
  `parser/pokerstars.ts` (23), `analysis/leakDetector.ts` (19),
  `data/store.ts` (19). Types-as-hubs is healthy; `pokerstars.ts` doubling as
  the shared `ParsedHand` type source is why 23 files import a parser.
- **True orphans (0 production references):**
  `components/dashboard/StudyPlanCard.tsx`, `ValueSnapshotCard.tsx` — the F7
  pair. All 11 pages are lazy-loaded via `App.tsx` (false-positive orphans).

## Finding ledger (vs 2026-07-01 abyss audit + 2026-06-12 review)

**Resolved since last run (independently verified):**
- F1 gate break ✅ (#116); F3 cycle ✅ (0 cycles); F4 STATUS prose ✅;
  F5 `@eslint/js` ✅ (package.json:44); F6 fixture ✅ (+ actor-resolution fix);
  F20 ConfirmDialog ✅; F22 dropzone ✅ (lint 0 warnings); F23 fake "Pot 0.0" ✅;
  F27 probe/donk OOP guard ✅ (postflopAnalyzer + 4 tests).

**Recurring (re-verified this run, unchanged):**
- **F2** hero-name UI: `saveHeroName` still has zero callers outside
  store.ts/tests. Scheduled Arc 5.
- **F9** script debris: `fix_imports.cjs`, `migrate-styles.mjs`, `scratch.ts`,
  `test-odds.{cjs,mjs}`, `test-summaries.cjs`, `stress-test-parser.ts`,
  `hygiene-scanner.ts` all still present.
- **F11/F13** re-measured, byte-identical: SessionsPage chunk **463.96 kB**
  (149.1 gz), CareerPage **443.89 kB** (124.6 gz), html2canvas 199.56 kB —
  static `import { exportSessionsPDF }` at SessionsPage.tsx:11 is still the cause.
- **F12** gsap still in 4 dashboard components alongside framer-motion.
- **F14** HandReplay equity still an un-memoized render IIFE
  (HandReplay.tsx:611–637; `OddsCalculator.calculate` at :633).
- **F16** env-dominant test cost confirmed on fast hardware too: 79.4 s
  environment vs 21.7 s tests (45 s wall).
- **F24** fifteen `'scorza23'` literals across parser defaults, stores,
  HandReplay:140, pdfExport:24.
- **F26** `isBroadway`≡`isHighCard` duplicate (postflopAnalyzer.ts:31–37) and
  the vestigial `heroBetFlop ? null : null` (:308) survived Wave 1's edits to
  the same file.
- **F29** `monotone_h/c/d/s` still in strategyProfiles.ts:19–23.
- F8 (unused exports), F17/F18/F19/F21/F25/F28 not re-litigated — no new
  evidence; still open per the audit.

**New this run:**
1. **Waves 2–4 are unblocked and idle** (process, High). The audit's gate —
   "run after Hermes salvage R1–R3" — is satisfied: R1–R5 all landed
   (#117/#118/#120/#121/#122) plus Wave 1 (#124). Nothing has started Wave 2.
2. **F19 list is stale — god-files grew** (Worsened, Medium).
   `spotPacket.ts` 1,288 (new; ~330 lines are types, 726-line test file,
   cohesive but 2.5× the ~500 target), `ArenaPage.tsx` 1,092 (+600 in R4),
   `HandsUpload.tsx` 949 (859 at audit, +90 in R2 despite F19 naming it).
   Wave 4's "no god-files over ~500" needs these three added or re-scoped.
3. **F7 is decision-complete → deletable** (upgraded). The R4 "port pieces"
   steer explicitly did not port the StudyPlanCard/CoachsNote packet CTAs
   (studyQueueRouteContract.test.tsx header). Meanwhile R2 (#118) spent a
   4-line edit maintaining the dead StudyPlanCard — ongoing carry cost.
   Delete both components in Wave 2.
4. **ROADMAP checkbox drift** (New, Low). III-0 and III-1 are `[ ]` though
   #116–#122 landed both arcs. The drift is in the hand-written checklist the
   autogen guard doesn't cover.
5. **Persistence in the analysis layer** (New, Low — acknowledged).
   `analysis/studyPacketProgress.ts` writes `window.localStorage` directly:
   the inverse of F19's "analysis logic in the data layer" complaint. Already
   named in ROADMAP ("unify the two SRS stores"); fold the layer move into
   that unification.

**Unverifiable from this environment:** F10 workspace debris (local worktrees
don't clone; check on the owner's machine).

## Recommended next actions

1. Start **Wave 2** (F7 delete both orphans + F8 per-symbol prune + F9 script
   debris) — fully unblocked, cheapest, and orphans are accruing maintenance cost.
2. **F11 dynamic-import the PDF stack** — single biggest user-facing win
   (~150 kB gz off the largest route + PWA precache); SessionsPage.tsx:10–11.
3. **F16 node-env test split** — 79 s of 101 s CPU is jsdom setup for tests
   that don't need it; biggest CI win, zero product risk.
4. Amend F19's list with `spotPacket.ts` / `ArenaPage.tsx` targets and tick
   ROADMAP III-0/III-1 — keeps the audit honest as the single work queue.
