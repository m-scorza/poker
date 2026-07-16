---
status: resolved
date: 2026-07-16
related:
  - docs/reports/archive/2026-07-13-codebase-health-review.md
note: >
  Archived on creation (scheduled run of 2026-07-16). The gate is fully green
  and both of the 07-13 run's headline items landed this period: the III-5
  settings editors (#195) lit up the dark dual-profile feature, and knip was
  wired into CI (#196/#198). The one recurring code wart — the analysis-layer
  test importing a pages shim — was fixed in this PR (one-line import move,
  second recurrence). Remaining items (UIR-002 formatter migration, heroName
  dual persistence cleanup, RE_BOUNTY_LINE regex parity) are tracked as
  watchlist/ROADMAP work, nothing left open here.
---

# Codebase Health Review — 2026-07-16

Scheduled health review, run against `main` @ `a75caf4` (5 commits / 5 PRs
after the 07-13 review's baseline `ae20052`: #193–#198). **Graphify was
unavailable this run** — same as every prior remote run: no Graphify index,
skill, or tooling exists in a fresh container (`graphify-out/` is gitignored
by policy, PR #65; no `/graphify` skill is installed in this environment).
Every conclusion below comes from direct inspection: the full CI gate executed
in-container (now nine steps, including the new knip and privacy checks),
`madge`, layering greps, and line-by-line review of every substantive diff in
the period.

## Codebase Health Summary

- **Overall health: excellent — gate fully green, and this was the most
  productive review-to-review period in the series for closing findings.**
  In-container: `docs:check`, `typecheck`, `typecheck:test`, `lint` (0/0),
  `knip` (exit 0 — now a CI gate), `privacy:check`, **1029/1029 tests
  (100 files, ~39 s; +7 tests, +1 file)**, production build OK (shell
  376.77 KB, flat, under the 432 KB budget; precache 1 764.03 KiB, +3.8),
  `madge --circular` clean (258 modules, +2).
- **Main risks:** genuinely thin this period. (1) `chipAmount` is still
  adopted at exactly one render site (UIR-002, third run — now the oldest
  open finding in the series). (2) `heroName` is persisted in two places
  (Zustand `partialize` → localStorage *and* the Dexie `settings` table),
  with the Dexie copy always winning at boot — redundancy, not a bug, but a
  divergence trap. (3) `RE_BOUNTY_LINE` still carries the leading-comma
  regex quirk that #194 fixed in its sibling `RE_MONEY`.
- **Highest-impact improvement:** finish the UIR-002 formatter migration —
  the float-artifact class (`385.00000000000006`) remains fixed only in
  `HandReplay.tsx` while every other page renders raw chip/pot numbers.
- **Confidence level:** high — all claims verified by executing the gate or
  reading source and diffs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-fwlv4q`, identical to
  `origin/main` @ `a75caf4` at review start (0 ahead / 0 behind after fetch).
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none at start; this PR carries the report plus the
  one-line Finding 3 fix.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from all prior remote runs; the index is local-only by policy and
  no tooling is installed to regenerate it. Substituted with madge
  (cycles/module count), knip (reachability — now also a CI step), grep
  (layering direction), build output (chunk clustering), and `wc -l`
  (hotspots).
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** unchanged — `src/parser/`, `src/analysis/`,
  `src/data/`, `src/pages/`, `src/components/` (10 subdirs; `settings/` is
  new this period, added by #195 with `SettingsCard.tsx` + its test suite).
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; the four knip-allowlisted `scripts/` entries
  (now documented in `knip.jsonc` rather than folklore).
- **Core modules / hotspots (lines):** `curriculumSeedPacks.generated.ts`
  2 514 (generated), `spotPacket.ts` 1 288, `ArenaPage.tsx` 998, `store.ts`
  790, `pokerstars.ts` 718, `HandReplay.tsx` 697 — all flat vs 07-13; no
  non-generated file above 1 300 lines.
- **Dependency clusters:** parser → analysis → pages remains unidirectional
  in production code (layering grep: zero `pages/` imports from
  analysis/data/parser/utils production files).
- **Highly connected files:** `data/localStorage.ts` (leaf constants),
  `analysis/arena/drillLogic.ts` (shared core under the pages shims and
  `arenaDrillEngine`), `data/appStore.ts` (gained its first settings-UI
  consumer).
- **Isolated or orphaned areas:** none new — the four `scripts/` knip
  false positives are now a *reviewed, documented allowlist* in `knip.jsonc`
  instead of a per-run re-derivation; `writeStarterDiagnosticSummary` (stale
  4 runs) was **deleted** by #198.
- **Suspicious dependency relationships:** the analysis-test → pages-shim
  import survived #198's shim cleanup (Finding 1 below, fixed in this PR).
  One correction to the 07-13 record: the shim's `pickRandomDecision`
  re-export is *not* test-only — `ArenaPage.tsx:27` consumes it, so the
  re-export is legitimately load-bearing pages-internal API and stays.
- **Complexity or metric hotspots:** shell chunk 376.77 KB (+0.09, flat,
  `check:bundle-budget` green: 367.9 KB vs 432 KB budget); `pdfExport` lazy
  chunk 432.39 KB (flat, lazy); precache 1 764.03 KiB (+3.8).

## Areas Inspected Directly

| Area inspected | Why | Evidence reviewed | Result |
|---|---|---|---|
| Verification gate | Ground truth | All nine CI steps executed in-container (exit 0) | Green: 1029/1029 tests (100 files), lint 0/0, knip 0, privacy 0, build OK, budget OK |
| Dependency graph | Cycle check | `npx madge --circular` (258 modules) | No cycles |
| Layering direction | Recurring check | grep for `pages/` imports across analysis/data/parser/utils | Production code: zero hits; the one test hit fixed in this PR |
| #195 settings editors | Closes 07-13 Finding 1; new component | `SettingsCard.tsx` full read (143 lines), its 89-line test suite, `DataVaultPage.tsx` wiring, `appStore.ts` trim change | Sound: trim at store boundary (`setHeroName`), blank-name guard, radiogroup a11y; all four recommended behaviors tested |
| #194 prize-extraction fix | Parser correctness on money paths | `tournamentSummary.ts` full read + diff + rewritten test suite | Sound: `RE_MONEY` digit-anchored; `You received` fallback now skips bounty lines. Sibling `RE_BOUNTY_LINE` still has the old pattern (watchlist) |
| #196/#198 knip-in-CI | Closes 07-13 Finding 2 (sixth-run recurrence) | `ci.yml` steps, `knip.jsonc` full read, #198 diff | Sound: reviewed allowlist with per-entry rationale; #198 de-exported 8 file-local symbols, trimmed 2 shim re-exports, deleted `writeStarterDiagnosticSummary` |
| heroName persistence topology | New dual-write path after #195 | `appStore.ts:79-125`, `store.ts:676-685`, `Layout.tsx:60-66`, `clearAllData` (store.ts:656) | Dexie always wins at boot (Layout re-read overwrites hydration); `clearAllData` spares `settings`, so no wipe-path divergence. localStorage copy is effectively write-only (Finding 3) |
| Finding 3 (07-13) test import | Recurring check | grep + `arenaDrillEngine.test.ts:7` | Still present → **fixed in this PR**; verified: suite 6/6, `typecheck:test`, knip still exit 0 |
| chipAmount adoption (UIR-002) | Recurring check | grep for render consumers | Still `HandReplay.tsx:451` only (third run) |
| Reports/docs coherence | Report-lag class | `docs:check` (autogen), reports index, #193 dispositions | Green; zero open reports; every code PR this period carries doc updates |

## Confirmed Findings

#### Finding 1: analysis-layer test imports a pages shim — fixed in this PR

- **Status:** Recurring (second run) → **Resolved** (fixed here)
- **Priority:** Low (escalated from advisory to acted-on per the
  two-run recurrence rule)
- **Evidence:** `src/analysis/__tests__/arenaDrillEngine.test.ts:7` still
  imported `pickRandomDecision` from `../../pages/arena/actionOptions`
  after #198's shim cleanup explicitly trimmed the *other* two re-exports
  but had to keep this one.
- **Affected files/modules:** `src/analysis/__tests__/arenaDrillEngine.test.ts`.
- **Graphify signal:** n/a; layering grep (substitute).
- **Direct code confirmation:** yes; fix verified (suite 6/6,
  `typecheck:test` 0, knip 0).
- **Why it matters:** it was the only inverted test-layer edge in the repo
  (analysis test → pages). Correction to the 07-13 record: removing it does
  *not* make the shim's `pickRandomDecision` re-export trimmable —
  `ArenaPage.tsx:27` consumes it, which is legitimate pages-internal use.
- **Recommended action:** none further — done.

#### Finding 2: `chipAmount` still adopted at a single render site (UIR-002)

- **Status:** Recurring (third run — now the oldest open finding in the
  series)
- **Priority:** Low→Medium trajectory: unchanged for three runs while the
  plan that tracks it (`docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`)
  ages.
- **Evidence:** grep — render consumers of `chipAmount` are still only
  `HandReplay.tsx:451`.
- **Affected files/modules:** `src/utils/format.ts`, every page rendering
  raw chip/pot numbers (Dashboard, Sessions, Career, Hands table).
- **Graphify signal:** n/a; grep.
- **Direct code confirmation:** yes.
- **Why it matters:** the `385.00000000000006` float-artifact class remains
  fixed only where it was originally reported.
- **Recommended action:** schedule the UIR-002 raw-render audit + formatter
  migration as its own slice; if it slips again next period, escalate to
  Medium formally.

#### Finding 3: `heroName` has two persistence homes; the localStorage copy is write-only

- **Status:** New (created by the interaction of #195's dual write with the
  pre-existing Layout boot-read)
- **Priority:** Low
- **Evidence:** `appStore.ts:118-120` partializes `heroName` into the
  Zustand persist blob (localStorage `poker-app-settings`); `SettingsCard`
  writes both that store *and* Dexie (`saveHeroName`, store.ts:683);
  `Layout.tsx:65` re-reads Dexie on every boot and calls `setHeroName`,
  overwriting whatever the persist middleware just hydrated. The
  localStorage copy therefore never survives to be user-visible — Dexie
  always wins.
- **Affected files/modules:** `src/data/appStore.ts`,
  `src/components/layout/Layout.tsx`, `src/data/store.ts`,
  `src/components/settings/SettingsCard.tsx`.
- **Graphify signal:** n/a; found by tracing the #195 write path against the
  boot read path.
- **Direct code confirmation:** yes — including the mitigating facts:
  `clearAllData` (store.ts:656) deliberately spares the `settings` table, so
  the app's own reset flow cannot desynchronize the two; and the v2 Dexie
  upgrade seeds the settings row, so `getHeroName` rarely falls back.
- **Why it matters:** two sources of truth for the single most
  parser-critical setting. Today they agree because SettingsCard writes
  both, but any future writer that touches only one (or a user clearing
  IndexedDB but not localStorage) produces a name that silently reverts on
  next boot. It also makes `mergePersistedSettings`' heroName branch dead in
  practice.
- **Recommended action:** pick one home. Simplest: drop `heroName` from
  `partialize` (Dexie is already authoritative via the Layout boot-read) and
  let `mergePersistedSettings` handle only `strategyProfile`. One-file
  change + test update; fold into the next settings touch.

#### Finding 4: `RE_BOUNTY_LINE` still carries the leading-comma quirk #194 fixed in `RE_MONEY`

- **Status:** New (surfaced by reviewing #194's diff for completeness)
- **Priority:** Low (no observed real-world failure; fixture-dependent)
- **Evidence:** `src/parser/tournamentSummary.ts:32` —
  `RE_BOUNTY_LINE = /(?:received|won|bounty).*?\$?([\d,]+\.?\d*).*?(?:bounties|eliminating)/i`
  — the capture still allows a leading comma, the exact class #194 fixed in
  `RE_MONEY` (line 31) by anchoring on a digit (`\d[\d,]*`).
- **Affected files/modules:** `src/parser/tournamentSummary.ts`,
  `src/parser/__tests__/tournamentSummary.test.ts`.
- **Graphify signal:** n/a; diff review.
- **Direct code confirmation:** yes — pattern read in place; no failing
  fixture constructed (a comma directly before the amount with no `$` is
  needed to trigger it, which no current fixture exhibits), so impact is
  **unconfirmed**, parity is the argument.
- **Why it matters:** two money regexes three lines apart with different
  robustness invites the next summary-format variant to fail in only one of
  them; a comma capture parses to `null` and silently drops a bounty.
- **Recommended action:** apply the same digit-anchor
  (`\$?(\d[\d,]*\.?\d*)`) to `RE_BOUNTY_LINE`'s capture on the next parser
  touch, with a pinned test.

## Prior Findings — Disposition (07-13 → now)

| 07-13 finding | Disposition | Verification |
|---|---|---|
| 1. Dual-profile feature dark (selector never existed) | **Resolved** — #195 shipped `SettingsCard` on `/data`: hero-name editor (trim at store boundary, blank guard) + strategy-profile radiogroup; `setStrategyProfile` has its first UI call site; 4-test suite covers exactly the behaviors the 07-13 review specified (including the trim footgun it predicted) | Full component + test read; `DataVaultPage.tsx:123` wiring |
| 2. knip not wired into CI (sixth run) | **Resolved** — #196 added the CI step + reviewed `knip.jsonc` allowlist with per-entry rationale; #198 narrowed it and cleaned the 11 flagged exports | `ci.yml` read; `npm run knip` exit 0 in-container |
| 3. Analysis test imports pages shim | **Recurring → fixed in this PR** (see Finding 1) | Edit + suite 6/6 + typecheck:test + knip |
| 4. `chipAmount` single-site (UIR-002) | **Recurring** (third run; see Finding 2) | grep |
| Stale `writeStarterDiagnosticSummary` export (4 runs) | **Resolved** — deleted by #198 | diff + grep |
| `saveHeroName` dead-export watch | **Resolved as predicted** — it was III-5's intended write path; now consumed by `SettingsCard` | grep |
| heroName trim footgun (improvement note) | **Resolved** — `setHeroName` trims at the store boundary (appStore.ts:104); SettingsCard guards blank-after-trim | appStore read + test |

## Graphify Signals Not Confirmed

Graphify produced no signals (no index in this container). Substitute-tool
signals that did not survive verification:

- **Signal:** madge "2 warnings" during graph build. **Why suspicious:**
  could hide unresolved edges. **What was checked:** warnings are madge's
  standard skipped-dynamic-import notices; the cycle scan itself is clean.
  **Conclusion:** benign, unchanged from prior runs. **Follow-up:** none.
- **Signal:** knip's historical `scripts/` false positives. **Conclusion:**
  no longer a live signal — the four entries are now a documented allowlist
  in `knip.jsonc` with rationale, and knip is a green CI gate. **Follow-up:**
  none; the per-run re-derivation this series used to do is retired.

## Improvement Opportunities

- **Architecture:** consolidate `heroName` persistence to one home
  (Finding 3) — drop it from the Zustand `partialize` and let the Dexie
  `settings` row stay authoritative (`src/data/appStore.ts`,
  `src/data/__tests__/appStore.test.ts`).
- **Code quality:** align `RE_BOUNTY_LINE` with the digit-anchored money
  capture from #194 (Finding 4) — `src/parser/tournamentSummary.ts:32`.
- **Tests:** none outstanding — the period's three feature PRs all landed
  with direct suites (#194 rewrote the pinned characterizations to corrected
  behavior; #195 shipped a 4-test component suite; #198 is covered by knip
  itself). `SettingsCard.handleSaveName` has no rejection path for the Dexie
  write; per repo guidelines (no error handling for impossible scenarios)
  this is acceptable, noted only for completeness.
- **Documentation:** in sync — `docs:check` green; CLAUDE.md/STATUS.md
  settings claims now match shipped reality (fixed by #193/#195); reports
  index shows zero open reports.
- **Developer experience:** none new — knip-in-CI was the last standing DX
  item and it landed.
- **Dependency cleanup:** `framer-motion@12 → motion@11` still queued in
  ROADMAP P5; unchanged, low urgency.

## Review Ledger

- **Date/time:** 2026-07-16 (UTC), scheduled remote session.
- **Trigger:** scheduled Graphify-assisted codebase health routine.
- **Branch:** `claude/relaxed-mccarthy-fwlv4q` (== `origin/main` at review
  start).
- **Commit:** `a75caf4` (#198).
- **Scope:** full nine-step CI gate in-container, madge, layering greps,
  line-by-line review of the #193–#198 batch (all three substantive diffs:
  #194, #195, #196+#198), heroName persistence-topology trace,
  prior-findings reconciliation vs the 07-13 run, one-line fix for the
  recurring test-layer edge.
- **Graphify sync status:** index absent by policy; review ran Graphify-free.
- **Files changed since last run:** 5 commits / 5 PRs, 26 files,
  +748/−90.
- **Areas inspected:** see table above.
- **New findings:** Finding 3 (heroName dual persistence, Low), Finding 4
  (`RE_BOUNTY_LINE` regex parity, Low, impact unconfirmed).
- **Recurring findings:** Finding 2 / UIR-002 `chipAmount` single-site
  (third run — oldest open item; escalate to Medium if untouched next
  period).
- **Resolved findings:** 07-13 Finding 1 (dual-profile dark — #195),
  07-13 Finding 2 (knip-in-CI — #196/#198), 07-13 Finding 3 (test-layer
  edge — fixed in this PR), `writeStarterDiagnosticSummary` stale export
  (deleted, #198), heroName trim footgun (fixed at store boundary, #195).
- **Worsened findings:** none.
- **Stale findings:** none — the stale bucket is empty for the first time
  in the series.
- **Recommended next actions:** (1) UIR-002 formatter migration;
  (2) heroName single-home cleanup; (3) `RE_BOUNTY_LINE` digit anchor.

## Recommended Next Actions

1. **Finish the UIR-002 formatter migration** — the float-artifact fix
   still protects exactly one render site after three review periods —
   `src/utils/format.ts`, pages rendering raw chip/pot values
   (`docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`).
2. **Consolidate `heroName` to one persistence home** — drop it from the
   Zustand `partialize`; Dexie is already authoritative at boot —
   `src/data/appStore.ts`, `src/data/__tests__/appStore.test.ts`.
3. **Digit-anchor `RE_BOUNTY_LINE`'s money capture** — parity with #194's
   `RE_MONEY` fix, with a pinned comma-edge test —
   `src/parser/tournamentSummary.ts:32`,
   `src/parser/__tests__/tournamentSummary.test.ts`.
