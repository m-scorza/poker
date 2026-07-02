# Hermes Worktree Salvage + Covenant Housekeeping Plan

> **Status: PLANNED, NOT EXECUTED.** Owner directive 2026-07-01: formalize only.
> No commits, branches, PRs, or worktree changes have been made. Any agent
> executing this later needs an explicit owner go, then follows
> `docs/agents/TASK_PROTOCOL.md` (claim the lane in `AGENT_HANDOFF.md` first).

**Goal:** Recover the ~3,456 insertions of good-but-stale-based work stranded
uncommitted in the Hermes worktree, land it in reviewable slices on `main`, and
clear five small covenant loose ends.

**Context:** The Active Covenant (ROADMAP Act I #94–#101, Act II #102–#110, plus
post-covenant #111–#113) is fully merged. The Hermes worktree at
`C:/Users/MICRO/OneDrive/Documentos/GitHub/poker-hermes` (branch
`hermes/worktree-20260627-213824`, based on #105 `e9b0c59`, **8 commits behind
main, never pushed**) holds substantial uncommitted work that implements, among
other things, the two refusal-as-UI follow-ups named in ROADMAP.

---

## ⚠️ Standing risk until step 0 runs

The worktree's ~3.5k lines exist **only as uncommitted files in one local
folder**. Its lone commit (`2af3a8f`) is a duplicate of #107 and carries none of
the real work. Until the safety snapshot below is allowed to run, an accidental
`git checkout`/`clean`/folder mishap destroys the only copy.

---

## Phase 0 — Safety snapshot (first action on go)

In the worktree: `git add -A && git commit` (message: preservation snapshot of
Hermes WIP). Pre-commit hook should pass — Hermes ran `docs:check` green there
on 2026-07-01, and `add -A` clears the untracked-src rule. If the hook still
blocks on drift, do **not** `--no-verify`; fall back to a plumbing backup ref
(`git write-tree` + `git commit-tree` + `git branch hermes/wip-backup-20260701`)
which preserves content without bypassing the hook on mainline work.

## Phase 1 — Housekeeping PR (one small branch off `main`)

1. **Archive the 2026-06-12 audit reports** — both
   `docs/reports/2026-06-12-principal-engineer-audit.md` and
   `...-appendix-subagents.md`: set `status: resolved` (Act I closed the open
   items), add closing PRs to `related:`, `git mv` into `docs/reports/archive/`,
   run `npm run docs:update`. Silences the SessionStart hook nag.
2. **ROADMAP drift**: tick the `bountyAnalyzer.ts:144` residual (landed in #111).
3. **`src/pages/CoachsNotePage.tsx` dangling edit on main** (uncommitted, ~12
   lines): `SEVERITY_ACCENT` map is defined but unused → lint failure as-is.
   Finish the wiring (left-edge severity bar + tint on the focus card, per the
   comment already in the diff) — or revert if the owner doesn't want the accent.
4. **`.claude/launch.json`** (untracked): commit it if machine-neutral, else
   gitignore. Pre-commit rule 2 only guards `src/`, but a clean tree is policy.
5. **`AGENT_HANDOFF.md` entry** claiming the salvage lane (per HANDOFF_PROTOCOL),
   so Hermes/Antigravity don't collide with the worktree while slices port.

Gate + PR + merge on green (hygiene lane).

## Phase 2 — Salvage slices (each: patch out of worktree → fresh branch off main → gate → PR)

**Method:** generate diffs from the worktree
(`git -C <worktree> diff HEAD -- <files>`), then apply/hand-port in the **main
checkout** — never Edit files under a worktree path directly (known redirect
trap). Mixed files get hunk-level surgery; new modules + their tests copy
wholesale. Worktree's `docs/product/ROADMAP.md`/`STATUS.md`/handoff edits are
stale-based — regenerate per slice instead of porting. The worktree's
`bountyAnalyzer.ts` edit likely duplicates #111 — verify, then drop.

### R1 — Refusal completion (land first; merge on green)

Implements ROADMAP's named follow-ups: "Stats/Leaks refusal surfacing + the
position-specific FACING_RAISE BTN/BB case", and kills a false-positive class
(BB suited-fold graded in multiway pots).

- Engine: `src/types/analysis.ts` (add `BB_VS_RAISE_MULTIWAY` to `Scenario`),
  `src/analysis/scenarioDetector.ts` (+6, multiway detection),
  `src/analysis/rangeChecker.ts` (+45, `complianceExclusionReasonForDecision()` —
  unknown opener / BTN-BB flats / unsupported hero-opener pairs / multiway),
  `src/analysis/ungradedScenarios.ts` + test (new, clean copy),
  `src/analysis/rangeValidator.ts` (+30) and `src/data/ranges.ts` (+4) — inspect,
  likely multiway/reaction-range support.
- Surfacing: `HandReplay.tsx` (+36, decision-level reason), `LeaksPage.tsx`
  (+140, ungraded-scenarios summary — hunk-pick, skip any Study-Queue bits),
  new `src/pages/__tests__/LeaksPage.test.tsx`.
- KB backing: worktree modifies `docs/knowledge/strategy/02-ranges-and-position.md`
  — inspect and port with this slice (multiway BB defense section).
- Integration with main's #113: make `complianceBreakdown()` consume the
  decision-level exclusions so RangesPage graded/excluded counts include the
  dynamic FACING_RAISE skips. Keep the back-compat note from #113 in mind.
- Tests to reconcile: `rangeChecker.test.ts` (+49), `scenarioDetector.test.ts`
  (+18), `rangeValidator.test.ts`, `ranges.test.ts`, `coachsNote.test.ts` (+28 —
  take refusal-related assertions only; rest may be R4).

### R2 — Import provenance / data health (land second; merge on green)

- `src/types/hand.ts` (+17, `HandImportSource`: site/fileType/accessMethod/
  parserConfidence — deliberately no paths/filenames),
  `src/parser/workerProcessor.ts` (+45), `workerImportSummary.test.ts` (+26),
  `HandsUpload.tsx` (+80, per-source import caveats) + test,
  `src/analysis/studyPlan.ts` (+111, `sourceContextReasons`/data-health context)
  + test (+57), `src/utils/evidence.ts` (+8) + test,
  `HandsFilters.tsx` (+17) + new test, `HandsPage.tsx` (+122 — hunk-pick
  provenance/data-health only), `store.test.ts` (importSource persistence
  assertions; rehydration assertions move to R3).
- Note: **no Dexie version bump anywhere** — no collision with main's db v7.

### R3 — Spot packets / solver boundary (open PR, then STOP for owner review)

New UX surface → review checkpoint per the covenant pattern.

- New: `src/analysis/spotPacket.ts` (+ test) — solver-neutral export packets
  (HRC/ICMizer/GTO Wizard/TexasSolver/wasm-postflop targets) with honest
  warnings (`not_solver_backed`, `tree_configuration_required`, …) and
  `localOnly: true`; `SpotSourcePanel.tsx`, `TrainerSpotCard.tsx` (non-scored
  drill prompt) + tests.
- `src/data/store.ts` (+22, `getParsedHandForHandId()` rehydration — review the
  empty `collectedAmounts`/`showdownWinners` at the packet boundary) + the
  rehydration half of `store.test.ts`.
- Integration hunks: HandReplay source panel; HandsPage selected-hand JSON
  export. Leave Study-Queue bundle export for R4.

### R4 — Study Queue (PARKED — needs product steer before any port)

`StudyPlanCard.tsx` (+430) + new test, `ArenaPage.tsx` (+588) + test (+275),
`studyPacketProgress.ts` + test, `studyQueueRouteContract.test.tsx`,
`DashboardPage.tsx` (+53 — predates #109 front-door swap), `CoachsNotePage.tsx`
(+121), `CareerPage.tsx` (+68), small diffs in SessionsPage/DualRangeMatrix/
RangeGrid/LifetimeScorecard — inspect, some may be R2-sized labels.

**Open product question for the owner:** Study Queue overlaps #106's SRS
("Spaced Review" from real misplays) and predates the #109 route demotion.
Reconcile: complementary (curriculum-driven queue + mistake-driven SRS) or
duplicate? Present the concrete diff, then port/drop per steer. Salvage the
route-contract test regardless.

### R5 — Research corpus (owner decided 2026-07-01: moves to poker-knowledge)

`docs/research/**` (source + claims ledgers, access protocol, poker-brain/
design/competitors/site-access/solvers notes) moves to the now-private
`poker-knowledge` repo (see the companion plan
`2026-07-01-poker-knowledge-eval-and-roadmap.md`). The public app repo gets
only a pointer + the brand-neutral abstractions already embedded in code
slices. Rationale: app repo is public with an explicit IP posture
(purge-reglife-mentions precedent); ledgers name RegLife/GTO Wizard throughout.

## Phase 3 — Cleanup (after slices land)

Remove the worktree + branch (or hand back to Hermes clean via handoff entry);
drop the duplicate `2af3a8f` commit with it. Separately: the stale app snapshot
at `C:/Users/MICRO/Downloads/poker-claude` — diff its
`src/parser/__tests__/fixtureVariants.test.ts` assertions against main's
`fixtureSweep.test.ts` variant checks, harvest anything missing, then propose
deletion of the folder (owner call).

---

## Constraints / gates

- Full gate per slice, before push:
  `npm run docs:check && npm run typecheck && npm run typecheck:test && npm run lint && npm test && npm run build`
  (CI runs `typecheck:test` separately — test-file type errors pass plain
  `typecheck` but fail CI).
- All changes via PR against protected `main`; no `--no-verify` ever without an
  explicit owner request.
- R1/R2 are correctness/honesty lanes → merge on green. R3 waits for owner
  review. R4 waits for product steer. UI copy in English.

## Verification

- R1 behavior: import a fixture set → BB multiway spots show "Not graded —
  here's why" in HandReplay; Leaks page renders the ungraded summary; RangesPage
  graded/excluded counts shift accordingly.
- R2 behavior: fresh import → hands carry `importSource`; HandsUpload shows
  source caveats; no Dexie upgrade errors on existing data.
- R3 behavior: exported packet JSON carries warnings + `localOnly`; no solver
  claims anywhere in UI copy.
- Housekeeping: `npm run docs:update` regenerates the reports index; next
  session's SessionStart hook is quiet.
