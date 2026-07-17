---
status: resolved
date: 2026-07-14
related:
  - docs/reports/archive/2026-07-13-codebase-health-review.md
note: >
  Archived on creation (scheduled run of 2026-07-14). Small, high-quality
  period: the 07-13 review's top two recommendations (III-5 settings editors,
  knip-in-CI) both landed within a day, plus a parser prize fix and a
  dead-export cleanup. The two residuals this run found — the analysis test
  still importing the arena pages shim (recurring Finding 3) and the
  rehydration path preserving untrimmed hero names — were both fixed in this
  PR. Nothing is left open here.
---

# Codebase Health Review — 2026-07-14

Scheduled health review, run against `main` @ `a75caf4` (5 commits / 5 PRs
after the 07-13 review's baseline `ae20052`: #193–#198). **Graphify was
unavailable this run** — same as every prior remote run: no Graphify index or
tooling exists in a fresh container (`graphify-out/` is gitignored by policy,
PR #65). Every conclusion below comes from direct inspection: the full
verification gate executed in-container, `madge`, `knip`, layering greps, and
line-by-line review of all four substantive diffs of the period.

## Codebase Health Summary

- **Overall health: excellent — the strongest single period in the series.**
  In-container: `docs:check`, `typecheck`, `typecheck:test`, `lint` (0/0),
  **1029/1029 tests (100 files, ~31 s; +7 tests, +1 file)**, production build
  OK (shell 376.77 KB, +0.09 flat; precache 1 764.03 KiB, +3.8),
  `madge --circular` clean (258 modules, +2), **`knip` exit 0 and now a
  required CI step**. The 07-13 review's top two recommended actions — the
  III-5 settings editors (#195) and knip-in-CI (#196/#198) — both shipped
  within a day of the report.
- **Main risks:** essentially none new. (1) `chipAmount` is still adopted at
  one render site (UIR-002, third run, tracked upstream). (2) The `GOALS.md`
  identity gatekeeper (III-5) remains unwritten — a product-direction gap,
  not a code risk. (3) `RE_BOUNTY_LINE` in `tournamentSummary.ts:32` retains
  the un-anchored `[\d,]+` money pattern that #194 fixed in `RE_MONEY` one
  line above — no realistic failing input constructed, watchlist only.
- **Highest-impact improvement:** shipped in this PR — the recurring
  analysis-test→pages-shim edge (07-13 Finding 3) is removed and the trim
  normalization is completed on the rehydration path, closing the last
  untrimmed hero-name entry point.
- **Confidence level:** high — all claims verified by executing the gate or
  reading source and diffs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-bwnhm8`, identical to
  `origin/main` @ `a75caf4` at review start (0 ahead / 0 behind after fetch).
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none at start; this PR's two small fixes + report.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from all prior remote runs; index is local-only by policy, no
  tooling installed to regenerate. Substituted with madge (dependency
  graph/cycles), knip (reachability, now CI-gated), grep (layering
  direction), build output (chunk clustering), and targeted diff reads.
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** unchanged — `src/parser/`, `src/analysis/`,
  `src/data/`, `src/pages/`, `src/components/` (10 subdirs; **new this
  period: `components/settings/`** with `SettingsCard.tsx` + test, #195).
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; `scripts/*` hooks and fleet CLIs (now explicitly
  entry-listed in `knip.jsonc`).
- **Core modules / hotspots (lines):** unchanged roster —
  `curriculumSeedPacks.generated.ts` (generated), `spotPacket.ts`,
  `ArenaPage.tsx`, `store.ts`, `pokerstars.ts`, `HandReplay.tsx` — all flat;
  no non-generated file above 1 300 lines.
- **Dependency clusters:** parser → analysis → pages remains unidirectional
  in production code. New edges this period: `DataVaultPage` →
  `components/settings/SettingsCard` → `data/appStore` + `data/store`
  (correct direction); `SettingsCard` gives `setStrategyProfile` and
  `saveHeroName` their first UI call sites.
- **Highly connected files:** `data/appStore.ts` gained the SettingsCard
  consumer; `analysis/arena/drillLogic.ts` gains two direct consumers in
  this PR (ArenaPage, arenaDrillEngine test) as the shim re-export retires.
- **Isolated or orphaned areas:** knip now exits 0 — the four `scripts/`
  false positives of every prior run are resolved via the reviewed
  `knip.jsonc` entry allowlist rather than being re-reported.
- **Suspicious dependency relationships:** the one recurring wart —
  `analysis/__tests__/arenaDrillEngine.test.ts:7` importing
  `pickRandomDecision` from `pages/arena/actionOptions` — **fixed in this
  PR** (both the test and ArenaPage now import from
  `analysis/arena/drillLogic`; the shim re-export is deleted).
- **Complexity or metric hotspots:** shell chunk 376.77 KB (+0.09, flat,
  `check:bundle-budget` green); `pdfExport` lazy chunk 432.39 KB (flat);
  precache 1 764.03 KiB (+3.8, the SettingsCard).

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All gate commands executed in-container (exit 0) | Green: 1029/1029 tests (100 files), lint 0/0, knip 0, build OK, shell 376.77 KB |
| Dependency graph | Cycle check after 2 new modules | `npx madge --circular` (258 modules) | No cycles |
| Layering direction | Recurring check | grep for `pages/` imports across analysis/data/parser/utils | One hit: the known test→shim edge (fixed in this PR); production code zero |
| #195 SettingsCard (III-5) | Resolves 07-13 Finding 1 | Full read of `SettingsCard.tsx` (143 lines), its 89-line test, `appStore.ts` diff, `DataVaultPage.tsx` wiring | Sound: trim at store boundary, blank-name guard, Dexie persist via `saveHeroName` (the boot-read row), profile radiogroup with a11y roles; 4 direct test cases |
| heroName trim completeness | 07-13 recommended `.trim()` normalization | All read/write paths traced: `setHeroName` (trims, #195), SettingsCard (pre-trims), Layout boot (`getHeroName→setHeroName`, trims), `mergePersistedSettings` (appStore.ts:33-36) | One residual: rehydration returned the **untrimmed** legacy value (explicitly characterized as "not asserting it's desirable") — **fixed in this PR** + test updated |
| #194 prize-extraction fix | Parser correctness on money paths | Full diff + `tournamentSummary.ts` full read (187 lines) | Sound: `RE_MONEY` digit-anchored; `You received … eliminating` no longer double-counted; regression tests added. Residual: `RE_BOUNTY_LINE` keeps un-anchored `[\d,]+` (watchlist, below) |
| #196/#198 knip wiring | Resolves 07-13 Finding 2 | `ci.yml` step, `knip.jsonc` full read, `npx knip` exit 0 | Closed properly: allowlist narrowed from 11 file-level entries to 3 documented forward-contract files + 4 untraceable script entries; 11 dead candidates de-exported or deleted per-symbol |
| Arena shim consumers | 07-13 Finding 3 (recurring) | grep for `actionOptions` / `pickRandomDecision` consumers; ArenaPage import block | 07-13's "test is sole consumer" was imprecise — ArenaPage also routed through the shim; **both re-pointed at `drillLogic` in this PR, re-export deleted** |
| `chipAmount` adoption | UIR-002 (third run) | grep for render consumers | Still `HandReplay.tsx` only — recurring, tracked |
| Docs/report coherence | Report-lag tripwire | `docs:check` + STATUS.md:48-53, ROADMAP III-5 update note vs shipped code | In sync: STATUS/CLAUDE/ROADMAP all describe the SettingsCard reality; III-5 box correctly unticked (GOALS.md gatekeeper open); zero open reports in the index |

## Confirmed Findings

#### Finding 1: analysis test (and ArenaPage) imported the arena pages shim — fixed in this PR

- **Status:** Recurring (second run) → **Resolved this run**
- **Priority:** Low
- **Evidence:** `arenaDrillEngine.test.ts:7` imported `pickRandomDecision`
  from `../../pages/arena/actionOptions`; grep showed `ArenaPage.tsx:27` also
  consumed it through the shim (07-13's "sole consumer" note was imprecise).
  After #198 trimmed `labelSeedAction`/`shouldCbet`, this was the shim's only
  remaining value re-export.
- **Affected files/modules:** `src/analysis/__tests__/arenaDrillEngine.test.ts`,
  `src/pages/ArenaPage.tsx`, `src/pages/arena/actionOptions.ts`.
- **Graphify signal:** layering grep (substitute); knip could not flag it
  because the imports kept the re-export "used."
- **Direct code confirmation:** yes; fix verified — typecheck, lint, knip
  exit 0, targeted suites green, full gate green.
- **Why it matters:** it inverted test-layer dependency direction and kept
  the shim artificially load-bearing after #198 trimmed its siblings.
- **Recommended action:** done — both consumers now import from
  `analysis/arena/drillLogic`; the re-export is deleted (only the
  `TrainerAction` type re-export remains, which typed consumers still use).

#### Finding 2: hero-name trim normalization was incomplete on the rehydration path — fixed in this PR

- **Status:** New (residual of 07-13's recommendation, which #195 implemented
  for the write boundary only)
- **Priority:** Low (no live write path could produce an untrimmed name after
  #195; only pre-#195 localStorage state could carry one in)
- **Evidence:** `mergePersistedSettings` (appStore.ts:33-36) validated with
  `trim().length > 0` but assigned the **raw** `incoming.heroName`; the
  characterization test asserted `'  bob  '` survives verbatim and said
  "documenting current behavior, not asserting it's desirable."
- **Affected files/modules:** `src/data/appStore.ts`,
  `src/data/__tests__/appStore.test.ts`, ROADMAP III-5 update note.
- **Graphify signal:** n/a; found by tracing every heroName read/write path.
- **Direct code confirmation:** yes; one-line fix + test updated to assert
  `'bob'`.
- **Why it matters:** an untrimmed hero name silently breaks
  `Dealt to <name>` matching in every parser — the exact footgun III-5's
  trim work exists to prevent; rehydration was the last unguarded entry.
- **Recommended action:** done.

#### Finding 3: `chipAmount` still adopted at a single render site (UIR-002)

- **Status:** Recurring (third run; tracked upstream, unchanged)
- **Priority:** Low
- **Evidence:** grep — render consumers of `chipAmount` are still only
  `HandReplay.tsx`; `format.test.ts` pins the behavior.
- **Affected files/modules:** `src/utils/format.ts`, pages rendering raw
  chip/pot numbers.
- **Graphify signal:** n/a; grep.
- **Direct code confirmation:** yes.
- **Why it matters:** the `385.00000000000006` float-artifact class remains
  fixed only where it was reported.
- **Recommended action:** finish the UIR-002 formatter migration (tracked in
  `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`). No new
  evidence this run; not escalated — it is plan-tracked and low-severity.

## Prior Findings — Disposition (07-13 → now)

| 07-13 finding | Disposition | Verification |
|---|---|---|
| 1. Dual-profile feature dark (selector never existed) | **Resolved** — #195 shipped `SettingsCard` on `/data` with both editors; `setStrategyProfile` has its first UI call site; docs already corrected in #193 and now match shipped code | Full component + test read; STATUS/ROADMAP cross-check |
| 2. knip not wired into CI (sixth run) | **Resolved** — #196 added the CI step + `knip.jsonc`; #198 narrowed the allowlist per-symbol; `npx knip` exits 0 in-container | ci.yml diff, knip.jsonc full read, knip executed |
| 3. Analysis test imports pages shim | **Resolved this run** (was recurring) — see Finding 1 | Fix applied + gate green |
| 4. `chipAmount` single-site (UIR-002) | **Recurring** (third run, unchanged) — see Finding 3 | grep |
| Stale: `writeStarterDiagnosticSummary` dead export (4 runs) | **Resolved** — deleted outright in #198 | diff + knip |
| Stale: `saveHeroName` unused (reclassified 07-13 as III-5's write path) | **Resolved as predicted** — became live code in #195 (SettingsCard) | grep |
| Watch: `migrate` identity passthrough in persist config | **Stale / unchanged** — fine until a version bump needs it; characterization test documents it | appStore.ts read |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index). Substitute-tool signals that did not
survive verification:

- **Signal:** madge "2 warnings" during graph build. **Why suspicious:**
  could hide cycles. **What was checked:** warnings are the standard
  skipped-dynamic-import notices; the cycle scan itself is clean.
  **Conclusion:** benign, unchanged from prior runs. **Follow-up:** none.
- **Signal:** `RE_BOUNTY_LINE` (tournamentSummary.ts:32) retains the
  un-anchored `[\d,]+` money pattern that #194 fixed in `RE_MONEY` one line
  above. **Why suspicious:** same leading-comma capture class as bug (a) of
  #194. **What was checked:** the regex against realistic PokerStars bounty
  lines — the lazy `.*?\$?` prefix only captures a leading comma if a comma
  directly precedes the first digit-run after a received/won/bounty keyword
  with no intervening digits; no real summary line with that shape was
  found in the fixture corpus. **Conclusion:** unconfirmed — consistency
  watchlist, not a bug. **Recommended follow-up:** anchor it
  (`\d[\d,]*`) opportunistically on the next parser touch.

## Improvement Opportunities

- **Architecture:** heroName now persists in **two stores** — the Zustand
  persist partialize (appStore.ts:117-119) *and* the Dexie `settings` table —
  with `Layout.tsx:65` unconditionally overwriting the store from Dexie at
  boot. The localStorage copy is effectively vestigial (always clobbered),
  and a failed Dexie write with a successful Zustand write would show "Saved."
  until reload, then revert. Consider dropping `heroName` from partialize or
  documenting Dexie as the single source of truth. Low urgency; behavior is
  correct in the happy path.
- **Code quality:** `SettingsCard.handleSaveName` does not catch a rejected
  `saveHeroName` (Dexie quota/private-mode failure) — the `void` call swallows
  it as an unhandled rejection and no error state shows. Rare, but the card
  already has an error affordance (`nameError`); wiring the catch is ~3 lines.
- **Tests:** none outstanding — the period added SettingsCard (4 cases),
  prize-extraction regressions (#194), and this PR updates the merge-trim
  characterization. Test count 1022 → 1029.
- **Documentation:** in sync — STATUS.md:48-53, CLAUDE.md, and ROADMAP III-5
  all describe the shipped SettingsCard; III-5 correctly stays unticked on the
  `GOALS.md` gatekeeper. This PR extends the III-5 update note for the
  rehydration trim.
- **Developer experience:** knip is now CI-gated with a reviewed, documented
  allowlist — the sixth-run recurring gap is closed; nothing further.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged.

## Review Ledger

- **Date/time:** 2026-07-14 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-bwnhm8` (== `origin/main` at review
  start).
- **Commit:** `a75caf4` (#198).
- **Scope:** full gate, madge, knip, layering greps, line-by-line review of
  the period's four substantive PRs (#194, #195, #196, #198), heroName
  read/write path trace, prior-findings reconciliation vs the 07-13 run; two
  small fixes applied in this PR.
- **Graphify sync status:** index absent by policy; review ran Graphify-free.
- **Files changed since last run:** 5 commits / 5 PRs, 26 files,
  +748/−90.
- **Areas inspected:** see table above.
- **New findings:** Finding 2 (rehydration trim residual — fixed in this PR);
  watchlist: `RE_BOUNTY_LINE` anchor asymmetry, heroName dual-persistence,
  SettingsCard unhandled save rejection.
- **Recurring findings:** Finding 3 (`chipAmount` single-site, third run,
  plan-tracked).
- **Resolved findings:** 07-13 Finding 1 (III-5 settings editors, #195),
  07-13 Finding 2 (knip-in-CI, #196/#198), 07-13 Finding 3 (shim test import
  — fixed in this PR), `writeStarterDiagnosticSummary` stale export (deleted,
  #198), `saveHeroName` (became live, #195).
- **Worsened findings:** none.
- **Stale findings:** `migrate` identity passthrough (documented, harmless).
- **Recommended next actions:** (1) write `GOALS.md` to close the III-5
  identity gate; (2) finish UIR-002 formatter migration; (3) opportunistic:
  anchor `RE_BOUNTY_LINE`, catch `saveHeroName` rejection, decide heroName's
  single source of truth.

## Recommended Next Actions

1. **Write `GOALS.md` (III-5 identity gate)** — the only remaining item of
   the arc; every EPIC G reference points at it and the settings-UI slice is
   already done — repo root, ROADMAP III-5.
2. **Finish the UIR-002 formatter migration** — third run with the
   float-artifact fix protecting exactly one render site —
   `src/utils/format.ts`, pages rendering raw chip/pot values.
3. **Opportunistic hardening on next touch** — anchor `RE_BOUNTY_LINE` money
   capture (`src/parser/tournamentSummary.ts:32`), surface a save error when
   `saveHeroName` rejects (`src/components/settings/SettingsCard.tsx:59`),
   and pick one source of truth for heroName persistence
   (`src/data/appStore.ts:117-119` vs Dexie `settings`).
