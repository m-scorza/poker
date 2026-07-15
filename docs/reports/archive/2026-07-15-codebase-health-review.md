---
status: resolved
date: 2026-07-15
related:
  - docs/reports/archive/2026-07-13-codebase-health-review.md
  - docs/reports/archive/2026-07-01-abyss-audit.md
note: >
  Archived on creation (scheduled run of 2026-07-15). The gate is fully green
  and the two headline recurrences from 07-13 — knip-not-in-CI (six runs) and
  the dark dual-profile feature — both resolved this period (#196/#198, #195).
  The three findings below (bounty-regex half-fix, SettingsCard save-path
  fragility, the two small carried-over items) are recorded in the ROADMAP /
  existing trackers; nothing needs to stay open here.
---

# Codebase Health Review — 2026-07-15

Scheduled health review, run against `main` @ `a75caf4` (5 commits / 5 PRs
after the 07-13 review's baseline `ae20052`: #193–#196, #198). **Graphify was
unavailable this run** — same as every prior remote run: no Graphify index,
skill, or tooling exists in a fresh container (`graphify-out/` is gitignored
by policy, PR #65; `SearchSkills`/`ToolSearch` both return nothing for it).
Every conclusion below comes from direct inspection: the full verification
gate executed in-container, `madge`, `knip` (now also a CI step), layering
greps, line-by-line review of the period's substantive diffs, and an
empirical regex check for the one new parser finding.

## Codebase Health Summary

- **Overall health: excellent — gate fully green, and both headline items
  from 07-13 landed.** In-container: `docs:check`, `typecheck`,
  `typecheck:test`, `lint` (0/0), `knip` (clean), `privacy:check`,
  **1029/1029 tests (100 files, ~33 s; +7 tests, +1 file)**, production
  build OK (precache 1 764.03 KiB, +3.8 vs 07-13 — consistent with the new
  SettingsCard), `madge --circular` clean (258 modules, +2).
- **Main risks:** (1) a **half-applied parser fix** — #194 anchored
  `RE_MONEY` on a digit but left `RE_BOUNTY_LINE` on the old unanchored
  pattern; an empirical check shows `"You received 3 bounties worth $15.00"`
  records a bounty of 3 cents (latent — no fixture hits this phrasing).
  (2) `SettingsCard.handleSaveName` updates Zustand before the awaited Dexie
  write and surfaces no error if that write rejects. (3) Two small
  carried-over items: the analysis→pages test-import edge (2nd run) and the
  UIR-002 formatter migration still at one render site.
- **Highest-impact improvement:** harmonize `RE_BOUNTY_LINE` with the
  digit-anchored money pattern and pin the two edge-case lines as regression
  tests — a two-line change that closes the only money-corruption path found
  this period.
- **Confidence level:** high — all claims verified by executing the gate,
  reading source and diffs, or running the regex against constructed and
  fixture inputs. Zero reliance on Graphify.

## Repository / Graphify Sync Status

- **Current branch:** `claude/relaxed-mccarthy-t0a6cy`, identical to
  `origin/main` @ `a75caf4` at review start (0 ahead / 0 behind after fetch).
- **Git status:** clean working tree at review start.
- **Uncommitted changes:** none at start; this report + index regen only.
- **Graphify freshness:** **no Graphify index exists in this container** —
  unchanged from all prior remote runs; the index is local-only by policy and
  no skill/tool to regenerate it is installed. Substituted with madge
  (dependency graph/cycles), knip (reachability, now CI-enforced), grep
  (layering direction), build output (bundle size), `wc -l` (hotspots), and
  `git show` diff review for every period PR.
- **Mismatches found:** n/a — nothing to diff against.
- **Files/modules changed locally but missing or stale in Graphify:** n/a.
- **Confidence impact:** none — all conclusions established directly.

## Graphify Map Exploration (reconstructed)

- **Main application areas:** unchanged — `src/parser/`, `src/analysis/`,
  `src/data/`, `src/pages/`, `src/components/` (10 subdirs; **new:
  `components/settings/`** with `SettingsCard.tsx` + test, from #195).
- **Entry points:** `src/main.tsx` → `App.tsx`; `src/parser/worker.ts`;
  `scripts/analyze-cli.ts`; scripts/hooks — now codified in `knip.jsonc`'s
  reviewed entry list (#196/#198), which doubles as a machine-checked
  entry-point inventory.
- **Core modules / hotspots (lines):** `curriculumSeedPacks.generated.ts`
  2 514 (generated), `spotPacket.ts` 1 288, `ArenaPage.tsx` 998, `store.ts`
  790, `pokerstars.ts` 718, `HandReplay.tsx` 697 — all flat vs 07-13; no
  non-generated file above 1 300 lines.
- **Dependency clusters:** parser → analysis → pages remains unidirectional
  in production code (grep over `src/analysis` for `pages/` imports:
  zero non-test hits). `pages/arena/actionOptions.ts` and `drillPool.ts`
  remain thin shims re-exporting from `analysis/arena/drillLogic`.
- **Highly connected files:** `data/appStore.ts` gained its first settings-UI
  consumer (`SettingsCard`); `data/store.ts:saveHeroName` likewise.
- **Isolated or orphaned areas:** none — `knip` runs clean under the narrowed
  allowlist (#198 removed 17 allowlist lines and fixed the underlying
  exports instead).
- **Suspicious dependency relationships:** only the known test-file edge
  (`analysis/__tests__/arenaDrillEngine.test.ts` → `pages/arena/actionOptions`).
- **Complexity or metric hotspots:** `ArenaPage.tsx` at 998 lines is the only
  page flirting with the 1 000-line mark (flat this period; watchlist).

## Areas Inspected Directly

- **Verification gate (all pieces)** — establish ground truth: `docs:check`,
  `typecheck`, `typecheck:test`, `lint`, `knip`, `privacy:check`,
  `npm test` (1029/1029, 100 files), `npm run build`, `madge --circular`
  (258 modules). Result: fully green.
- **`src/parser/tournamentSummary.ts` + #194 diff + test file** — the
  period's only parser fix; verified both quirk fixes are correct, then
  found the sibling regex was not given the same treatment (Finding 1),
  confirmed empirically with `node` against three constructed lines and
  checked the fixture corpus (`grep bounties|eliminating src/test/fixtures/`)
  for real-world reachability.
- **`src/components/settings/SettingsCard.tsx` (143 lines) + test +
  `DataVaultPage.tsx` wiring + `appStore.ts:104`** — the III-5 slice that
  closes the 07-13 headline finding; verified `setStrategyProfile` now has a
  real UI call site, trim happens at the store boundary, and Dexie
  persistence goes through `saveHeroName`. Found the save-path fragility and
  the missing re-import hint (Findings 2, 3).
- **`knip.jsonc` + `.github/workflows/ci.yml` + #196/#198 diffs** — verify
  the six-run recurrence is genuinely closed: knip is a CI step inside the
  required `lint / typecheck / test / build` job; the allowlist is commented
  per-entry and #198 narrowed it by fixing real exports.
- **`src/pages/arena/actionOptions.ts`, `drillPool.ts`,
  `analysis/__tests__/arenaDrillEngine.test.ts:7`** — check 07-13 action 3;
  the test still imports `pickRandomDecision` through the pages shim.
- **`HandReplay.tsx` + repo-wide `chipAmount` grep** — check UIR-002; still
  exactly one render site (line 451).
- **`docs/reports/README.md`, ROADMAP, AGENT_HANDOFF** — continuity: zero
  open reports; UIR-002 tracked in the 07-10 owner-UI plan + handoff;
  re-import machinery exists in `DataHealthPanel.tsx` (money-corruption
  driven, not hero-name driven).

## Confirmed Findings

#### Finding: `RE_BOUNTY_LINE` kept the unanchored money pattern #194 fixed in `RE_MONEY`

- **Status:** New
- **Priority:** Medium
- **Evidence:** `src/parser/tournamentSummary.ts:31-33` — `RE_MONEY` is now
  `/\$?(\d[\d,]*\.?\d*)/` (digit-anchored, #194) but `RE_BOUNTY_LINE` still
  embeds `([\d,]+\.?\d*)`. Empirical: `"You received $7.50 for eliminating 3
  players"` → `7.50` (correct); `"You received 3 bounties worth $15.00"` →
  captures `3` → bounty recorded as **3 cents**; a comma-leading capture
  (`","`) parses to `null` and is silently dropped.
- **Affected files/modules:** `src/parser/tournamentSummary.ts:33` (used at
  line 77–84), `src/parser/__tests__/tournamentSummary.test.ts`.
- **Graphify signal:** n/a (unavailable).
- **Direct code confirmation:** yes — regex executed in `node` against
  constructed lines; fixture corpus grep shows no current file uses the
  corrupting phrasing (all real bounty lines are hand-history-side, parsed
  by `pokerstars.ts`), so this is latent, not live.
- **Why it matters:** the same class of bug #194 just fixed (money
  mis-extraction in tournament summaries) survives one regex over; a summary
  variant phrased "won N bounties … $X" would corrupt bounty totals
  silently.
- **Recommended action:** change the capture to `(\d[\d,]*\.?\d*)` and — to
  avoid capturing a leading count — prefer the `\$`-prefixed amount when
  present; pin `"You received 3 bounties worth $15.00"` as a regression test.

#### Finding: `SettingsCard` hero-name save has no failure path and no stale-data hint

- **Status:** New
- **Priority:** Low
- **Evidence:** `src/components/settings/SettingsCard.tsx:52-62` —
  `setHeroName(trimmed)` mutates Zustand *before* `await saveHeroName(trimmed)`;
  if the Dexie write rejects (private mode / storage full — the exact modes
  `useImportPipeline.ts:385` already handles gracefully), the click handler's
  `void handleSaveName()` swallows the rejection: in-memory and persisted
  names diverge and the UI shows neither "Saved." nor an error. Separately,
  the card never mentions that already-imported hands keep their old
  hero-name analysis; the safe re-import mechanism (dedup by hand ID,
  `DataHealthPanel.tsx:142-150`) exists but is only triggered by
  money-corruption detection.
- **Affected files/modules:** `src/components/settings/SettingsCard.tsx`,
  `src/components/hands/DataHealthPanel.tsx` (pattern to reuse).
- **Graphify signal:** n/a.
- **Direct code confirmation:** yes — read of the full component, its test
  (no rejection-path case), `appStore.ts:104`, and `store.ts` `saveHeroName`.
- **Why it matters:** the hero name is the single field every parser lookup
  keys off; a silently-failed persist resurrects the old name on next boot,
  and a renamed hero with no re-import hint quietly leaves all prior stats
  computed under the previous identity.
- **Recommended action:** wrap the `saveHeroName` await in try/catch with an
  inline error state (mirroring the import pipeline's storage-failure copy),
  and add one sentence to the card pointing at re-import when the name
  changes with hands already in the vault.

#### Finding: knip wired into CI — six-run recurrence closed

- **Status:** Resolved
- **Priority:** — (was High-trending after six runs)
- **Evidence:** `.github/workflows/ci.yml` "Unused code check (knip)" step
  inside the required job (#196); `knip.jsonc` allowlist narrowed from 8 to
  4 entry files by fixing real exports (#198); in-container `npx knip` clean.
- **Affected files/modules:** `.github/workflows/ci.yml`, `knip.jsonc`.
- **Graphify signal:** n/a.
- **Direct code confirmation:** yes — diffs read, knip executed.
- **Why it matters / action:** the dead-export decay class (07-10, 07-12
  refills) now fails CI instead of waiting for a scheduled review. No
  further action.

#### Finding: III-5 settings editors shipped — the dual-profile feature is no longer dark

- **Status:** Resolved
- **Priority:** — (was the 07-13 headline)
- **Evidence:** `SettingsCard.tsx` (#195) gives `setStrategyProfile` its
  first-ever UI call site (`:120`) and a hero-name editor that trims at the
  store boundary (`appStore.ts:104`); wired at `DataVaultPage.tsx:123`;
  89-line test suite; STATUS/CLAUDE updated in the same PR.
- **Affected files/modules:** `src/components/settings/`,
  `src/pages/DataVaultPage.tsx`, `src/data/appStore.ts`.
- **Graphify signal:** n/a.
- **Direct code confirmation:** yes — component, test, and wiring read.
- **Why it matters / action:** the tested-but-unreachable `advanced` tier
  (thresholds, C-bet rules, leak targets) is now reachable; abyss F2 closed.
  Residual polish is Finding 2.

#### Finding: analysis test still reaches through the pages shim

- **Status:** Recurring (2nd consecutive run)
- **Priority:** Low
- **Evidence:** `src/analysis/__tests__/arenaDrillEngine.test.ts:7` imports
  `pickRandomDecision` from `../../pages/arena/actionOptions`, which merely
  re-exports it from `analysis/arena/drillLogic` (`actionOptions.ts:7`).
- **Affected files/modules:** `src/analysis/__tests__/arenaDrillEngine.test.ts`,
  `src/pages/arena/actionOptions.ts`, `src/pages/arena/drillPool.ts`.
- **Graphify signal:** n/a.
- **Direct code confirmation:** yes — production layering is otherwise clean
  (zero `pages/` imports in non-test `src/analysis`).
- **Why it matters:** it is the only analysis→pages edge in the repo and it
  keeps the shim re-exports pinned as "used", hiding that they are trimmable.
- **Recommended action:** the same one-line fix 07-13 prescribed — import
  from `../arena/drillLogic` directly.

#### Finding: UIR-002 formatter migration still at one render site

- **Status:** Recurring (tracked)
- **Priority:** Low
- **Evidence:** repo-wide grep — `chipAmount` is imported and rendered only
  in `HandReplay.tsx:25,451`; other pages still render raw chip/pot numbers.
- **Affected files/modules:** `src/utils/format.ts`, pages rendering raw
  amounts.
- **Graphify signal:** n/a.
- **Direct code confirmation:** yes.
- **Why it matters:** the float-artifact fix protects exactly one surface;
  the 07-10 owner-UI plan (UIR-002, P0 there) and AGENT_HANDOFF both call
  for the repo-wide migration.
- **Recommended action:** finish the migration or explicitly re-scope
  UIR-002 in the plan so it stops carrying P0 language.

## Graphify Signals Not Confirmed

None — Graphify produced no signals this run because **no index, skill, or
tooling exists in this container** (verified via skill registry search, tool
search, and a filesystem sweep for `*graphify*`). All map-level claims above
were reconstructed from madge/knip/grep/build evidence instead.

## Improvement Opportunities

- **Architecture:** retire the `pages/arena` re-export shims once the test
  import is fixed (`actionOptions.ts:6-7`, `drillPool.ts:7-8`) — they exist
  only to serve one test and knip pins them as used.
- **Code quality:** harmonize `RE_BOUNTY_LINE` with the digit-anchored money
  pattern (`tournamentSummary.ts:33`); add a rejection path to
  `SettingsCard.handleSaveName`.
- **Tests:** add a `saveHeroName`-rejection case to
  `SettingsCard.test.tsx`; pin the "N bounties worth $X" summary line in
  `tournamentSummary.test.ts`.
- **Documentation:** none new — docs:check green, STATUS/CLAUDE were updated
  in-PR with #195, reports index shows zero open reports.
- **Developer experience:** `ArenaPage.tsx` (998 lines) is one feature away
  from the 1 000-line mark; plan the next decomposition slice before adding
  to it.
- **Dependency cleanup:** none — knip clean under the narrowed allowlist;
  ROADMAP "Gated / later" already tracks Biome 2 / nuqs / motion migration.

## Review Ledger

- **Date/time:** 2026-07-15 (scheduled run)
- **Trigger:** scheduled codebase-health routine
- **Branch:** `claude/relaxed-mccarthy-t0a6cy` (== `origin/main` at start)
- **Commit:** `a75caf4`
- **Scope:** full gate + all 5 period PRs (#193–#196, #198) + carried-over
  findings from 07-13
- **Graphify sync status:** unavailable (no index in container; substituted
  madge/knip/grep/build — same as every prior remote run)
- **Files changed since last run:** 22 files, +710/−52 (`git diff --stat
  ae20052..a75caf4`)
- **Areas inspected:** parser (tournamentSummary + #194), settings slice
  (#195 end-to-end), knip/CI wiring (#196/#198), layering greps, hotspot
  line counts, reports index
- **New findings:** bounty-regex half-fix (Medium); SettingsCard save-path
  fragility + missing re-import hint (Low)
- **Recurring findings:** analysis→pages test edge (2nd run);
  UIR-002 single-site formatter (tracked)
- **Resolved findings:** knip-in-CI (after six runs); dark dual-profile /
  III-5 settings editors (07-13 headline)
- **Stale findings:** none
- **Recommended next actions:** (1) bounty-regex harmonization + regression
  test; (2) SettingsCard save-failure handling + re-import hint;
  (3) one-line test-import fix; (4) UIR-002 finish-or-rescope.

## Recommended Next Actions

1. **Anchor `RE_BOUNTY_LINE`'s money capture on a digit (prefer the
   `$`-prefixed amount) and pin the "3 bounties worth $15.00" regression
   test** — closes the only money-corruption path found this period, and
   finishes the fix #194 started — `src/parser/tournamentSummary.ts:33`,
   `src/parser/__tests__/tournamentSummary.test.ts`.
2. **Add a failure path to `SettingsCard.handleSaveName` and a re-import
   hint on hero-name change** — a silently-failed persist of the app's most
   load-bearing setting currently shows nothing —
   `src/components/settings/SettingsCard.tsx:52-62`.
3. **Point `arenaDrillEngine.test.ts:7` at `analysis/arena/drillLogic`** —
   removes the repo's only analysis→pages edge and unpins the trimmable
   shims (second consecutive run) —
   `src/analysis/__tests__/arenaDrillEngine.test.ts`.
4. **Finish or re-scope UIR-002** — the formatter protects one render site
   while the plan still labels it P0 — `src/utils/format.ts`, pages
   rendering raw amounts.
