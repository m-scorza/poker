---
status: resolved
date: 2026-07-08
related: ['docs/reports/2026-07-01-abyss-audit.md', 'docs/reports/archive/2026-06-12-codebase-health-review.md']
---
# Codebase Health Review — 2026-07-08

Scheduled codebase-health review of `main` (HEAD `388eac6`, after the Hermes
salvage slices R2–R5 and Abyss Wave 1 landed). Point-in-time snapshot; new
actionable items are delegated to the open abyss-audit waves rather than
tracked here, so this report is born `resolved`.

> **Graphify note:** prior reviews used a Graphify map as the navigation
> layer. The `graphify-out/` artifact was removed from the repo (see abyss
> F10 — it was a worktree experiment) and no Graphify skill/tooling exists in
> the review environment, so this run built its own map: a full static import
> graph (fan-in/fan-out, cycle detection, orphan detection) plus size/hygiene
> metrics, all cross-checked by direct file reads. Confidence is unaffected —
> every conclusion below is backed by direct inspection or the executed gate.

## Verdict

**Healthy, and measurably healthier than the 2026-07-01 baseline.** Full gate
green from a fresh clone: `docs:check`, `typecheck`, `typecheck:test`, `lint`
(0 errors, 0 warnings), **851/851 tests in 77 files** (up from 769/69), build
implied by CI on `main`. Zero `any`, zero suppressions, zero TODOs, zero
circular imports (F3 fix holding). All five recommended actions from the
2026-06-12 review ledger are now resolved. The remaining debt is exactly the
open abyss waves 2–4 — no new correctness issues found in the post-audit code
(spotPacket, importRuns provenance, Arena study queue).

## Map (independent, this run)

- **Top fan-in:** `types/analysis.ts` (57), `types/hand.ts` (55) — shared
  domain types, hub-ness by design (same conclusion as 2026-06-12);
  `parser/pokerstars.ts` (23), `data/store.ts` (19), `analysis/leakDetector.ts` (19).
- **Top fan-out:** `pages/CareerPage.tsx` (25), `pages/DashboardPage.tsx` (17),
  `data/store.ts` (15).
- **Cycles:** 0 (madge-equivalent DFS over resolved relative imports).
- **Orphans:** all zero-fan-in pages are `React.lazy` routes in `App.tsx`
  (verified) — not orphans. True orphans remain exactly the abyss F7 pair:
  `components/dashboard/StudyPlanCard.tsx`, `ValueSnapshotCard.tsx`.
- **Size hotspots:** `analysis/spotPacket.ts` **1288** (new #1, R3),
  `pages/ArenaPage.tsx` 1092 (grew +~50 in R4), `components/hands/HandsUpload.tsx`
  949 (grew +~90 since audit flagged 859), `data/store.ts` 932.

## Findings

1. **CLAUDE.md `Scenario` union drift (new, fixed in this PR).** Source
   (`types/analysis.ts:8`) has `FACING_3BET` and `BB_VS_RAISE_MULTIWAY`
   (shipped #99/#100); CLAUDE.md's Data Model block listed neither.
   `DeviationType` and `Position` verified in sync. Fixed inline per
   CLAUDE.md's own same-PR rule.
2. **spotPacket.ts is well-written but is the new largest file (watchlist).**
   ~340 lines are type schema; logic is small pure functions with
   honest-refusal warnings and a stable FNV hash; 726-line test file.
   No bug found. If it grows again, split the type schema
   (`spotPacketTypes.ts`) from the builders — candidate for Wave 4 (F19 class).
3. **God-file trajectory worsened where waves haven't run:** HandsUpload
   859→949, ArenaPage ~1044→1092 (study-queue routing/session logic inline).
   Reinforces F19's priority; no new decomposition target beyond it.
4. **F16 re-measured on this hardware:** suite 43.5s wall, but environment
   setup is still the dominant component (76.5s cumulative vs 20.8s of actual
   tests). The node-env split remains the biggest CI win, though smaller in
   absolute terms than the audit's 210s-wall machine suggested.
5. **Recurring, no new evidence (open abyss waves, verified still present):**
   F2/F8 dead exports (`saveHeroName`, `getVillainNote`, `handExists` — zero
   callers, grep-verified); F9 script debris (all listed files still in
   `scripts/`); F14 equity in un-memoized render IIFE
   (HandReplay.tsx:611–638); F17 inline hex (33 hits in components/pages).
6. **Resolved since last health review (2026-06-12 ledger):** graphify-out
   policy (artifact removed), STATUS.md stamp (autogen + hook-enforced),
   importRuns↔store knot (broken via `importDiagnosticsPolicy.ts` extraction),
   HandsUpload component test (367-line test file exists), shared test
   factories (`src/test/factories.ts`, fan-in 8).
7. **Cross-page URL contract (watchlist, minor):** Arena study-queue links to
   `/hands?panel=spot-packet&reviewHand=…#spot-packet`; HandsPage parses
   `panel`/`reviewHand` with alias fallbacks (verified both sides + tests
   exist). Stringly-typed across two pages — if a third consumer appears,
   extract a shared route-builder.

## Review Ledger

- **Date/time:** 2026-07-08 (scheduled remote session).
- **Trigger:** scheduled codebase-health routine.
- **Branch:** `claude/relaxed-mccarthy-m8cack` (from `main`).
- **Commit:** `388eac6`.
- **Scope:** full repo; full gate executed from fresh clone; independent
  import-graph map built and cross-checked.
- **Graphify sync status:** Graphify unavailable (artifact removed from repo,
  no tooling in environment) — replaced by locally built map; explicitly
  flagged, confidence maintained via direct inspection.
- **Files changed since last health run (2026-06-12, `36ffabd`):** the R1–R5
  salvage slices (#118 provenance, #120 spot packets, #121 study queue, #122
  corpus move), Wave 0/1 abyss fixes (#116, #124), CoachsNote/dashboard
  demotion line (#108/#109), FACING_3BET + leak denominators (#99/#100).
- **Areas inspected:** `analysis/spotPacket.ts` (full structure + logic
  reads), `data/importRuns.ts` + `data/store.ts` (knot verification),
  `pages/ArenaPage.tsx` (R4 study-queue additions), `pages/HandsPage.tsx`
  (URL contract), `components/hands/HandReplay.tsx` (F14), `App.tsx` (lazy
  routes), `vite.config.ts` (F16), `types/analysis.ts` vs CLAUDE.md,
  `scripts/` (F9), hygiene greps repo-wide, full gate.
- **New findings:** CLAUDE.md Scenario drift (fixed in this PR);
  spotPacket size watchlist; URL-contract watchlist.
- **Recurring findings:** F2/F8, F9, F14, F16, F17, F19 (all owned by open
  abyss waves 2–4 — not re-escalated here, evidence re-verified).
- **Worsened:** HandsUpload and ArenaPage line counts (F19 lane).
- **Resolved findings:** all 5 actions from the 2026-06-12 ledger (see
  finding 6); abyss Wave 1 items spot-verified (cycle 0, lint 0/0,
  ConfirmDialog in HandsUpload, no fake "Pot 0.0").
- **Stale findings:** none detected.
- **Recommended next actions:** run abyss Wave 2 (dead-code prune) next —
  cheapest; then Wave 3 with F16 first (measured biggest CI component);
  consider splitting spotPacket types/builders when Wave 4 touches F19.
