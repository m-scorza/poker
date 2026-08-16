# Agent Handoff Log

Use this file as the shared baton between Hermes, Google Antigravity, and any other coding agent. Keep the newest entry at the top.

Older or compacted handoff records are archived in:

- [AGENT_HANDOFF_ARCHIVE_2026_07.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_07.md)
- [AGENT_HANDOFF_ARCHIVE_2026_06.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_06.md)
- [AGENT_HANDOFF_ARCHIVE_2026_05.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_05.md)

## 2026-08-10 - D1-D7 owner decision workshop (unblocks Wave 1)

- Owner / agent:          Claude (UI/UX lane)
- Branch:                 claude/new-session-rd8z5e
- Scope:                  `docs/design/decision-lab-2026-08/**` (new), `docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`, `docs/agents/AGENT_HANDOFF.md`. **No `src/` change** — the workshop brief is planning and prototypes only.
- Files touched:          `docs/design/decision-lab-2026-08/{index,d1-adaptive-home,d2-performance-product,d3-money-context,d4-profile-settings,d5-caveat-disclosure,d6-villains,d7-blackout-salvage}.html`, `lab.css`, `README.md`; the owner plan (§1.0 ratified table, per-decision RATIFIED blocks, seven task status lines, §5 rewritten as §5.1/5.2/5.3); this log.
- Summary:                Ran the workshop from the plan's §5 step 2. Verified every D1-D7 claim against source and the running app with the demo dataset seeded (250 tournaments / 15,245 hands / 15,245 decisions), captured every route at 1440/1024/390, built 2-3 low-fidelity options per decision from real IndexedDB numbers, and put all seven to the owner. **Ratified: D1 one route adaptive body · D2 audit first (UIR-009), re-ask after · D3 restore the sidebar money hero behind a derived-stats layer · D4 full settings drawer, `/data` absorbed · D5 shared chip → reason → "Why?" · D6 keep Villains and build the repeat-opponent workflow · D7 port F-2, retire the park list.** Backlog re-sequenced into 16 ordered slices in §5.2; UIR-024 slice 1 is first out of the gate.
- Verification:           `npm run docs:check` passes. Lab rendered in Chromium at 1440/1024/390: no whole-page horizontal scroll on any of the 8 pages (wide comparison tables scroll inside their own container), stylesheet resolves, no placeholder text. App evidence captured from a real seed, not from docs: `$843.49` printed 5x and ROI 3x on one settled `/dashboard`; Career `scrollHeight` 15,912px with a 12,112px unpaginated timeline; `/leaks` says "rule-based" 8x and "no solver" 7x in 3,619 chars while `/dashboard` says neither once over a 65-of-250 ITM denominator; all 3,724 ungraded decisions are `FACING_RAISE`; 10 demo villains span 1.1pp of VPIP with Limp% and 3-bet% 0.0% for every player; 104 off-palette Tailwind hue classes across 20 files. No `src/` touched, so no typecheck/test/build delta.
- Risks / assumptions:    (1) **The clone arrived shallow at 50 commits**, so none of the plan's historical references resolved; unshallowed to 262 and `ec39b34`/`f6af6c2`/`0a64691`/`a104a89`/`eff6452`/`39f56d5`/`ec1c3a8`/`4ff3866`/`aee83a7` plus the `blackout/foundation-v2` and `ui/blackout-f*` branches are now reachable. Check `git rev-list --count HEAD` in a fresh session before starting UIR-021 or UIR-024. (2) D7's disposition had **inverted against `main`** — its park list (Coach's Note wiring, `HonestyStrip`, the diagonal `.bk-case::before` ribbon) is live, its salvage list is not; §1.0 records the correction. (3) Three ratified answers went against the recommendation (D2, D4, D6); the constraints raised are recorded in §1.0 as design requirements, not re-argued. (4) D6's evidence is synthetic — the 1.1pp spread is a demo-generator property, so re-run it against a real PokerStars fixture before scoping UIR-023. (5) D2 leaves the Dashboard duplication and the 15,912px Career page standing until the audit lands; recorded so it is not refiled as a new bug.
- Next action requested:  Open **UIR-024 slice 1** — port F-2 (`4ff3866`) `DossierTable`, `FilterRail`, `EmptyState`, `chartTheme` with their existing tests onto a fresh branch from `main`. It unblocks UIR-003, 010, 015, 020 and 021, needs no further decision, and is already reviewed code. UIR-009 (the D2 audit) can run in parallel — different files, and its denominator inventory feeds both the D2 re-ask and D3's summary row.

## 2026-07-23 - III-4 postflop deal-from-range packs

- Owner / agent:          Codex
- Branch:                 codex/iii4-postflop-range-packs
- Scope:                  Snapshot curriculum importer and generated range packs; Arena curriculum session context/action menu; pack/Arena tests; III-4 truth docs
- Files touched:          `scripts/import-ct-curriculum.ts`, curriculum/range-pack types and generated artifacts, Arena range-pack wiring/tests, `vite.config.ts`, `src/test/setup.ts`, III-4 plan/ROADMAP/STATUS, handoff/archive
- Summary:                Extended the offline importer from 45 preflop packs to all 94 authorized configs. Added 49 board-aware flop/turn/river packs (589 cells) with exact dealt cards, positions, stacks, board, action line, and source-defined legal actions; Arena now renders and grades that context without converting exact combos to suitless classes. Generated combo arrays are compacted and expanded at lazy-chunk load, known snapshot noise is normalized deterministically, duplicate neutral titles receive stable variant labels, and the reviewed overlap report is no longer rewritten unless `--overlap` is explicit.
- Verification:           Deterministic importer and legacy-seed `--check` pass. Focused range/session tests pass 12/12; combined App/Study Queue/Arena tests pass 37/37; full Vitest passes 108 files / 1,131 tests. `typecheck`, `typecheck:test`, `knip`, production build, `docs:update`, `docs:check`, `privacy:check`, bundle budget, and `git diff --check` pass. Logs: `.agents/runs/2026-07-23-iii4-postflop-{full-tests-final,typecheck,test-typecheck,build,docs-check,privacy,bundle-budget}.log`.
- Risks / assumptions:    The importer removes board-colliding/duplicate source rows and never deals an ungraded combo; fidelity totals pin the resulting deterministic inventory. The shell remains 391.2 KB, while PWA precache is about 5.96 MiB because the offline build includes the lazy curriculum chunks.
- Next action requested:  Publish and merge this slice, then implement the remaining III-4 brand-neutral lesson-recommendation scoring port.

## 2026-07-23 - Integration sweep and React Router refresh

- Owner / agent:          Codex
- Branch:                 dependabot/npm_and_yarn/multi-92d8ff70db
- Scope:                  Integrate PRs #213-#217; repair and verify the generated-doc gate on #218
- Files touched:          `docs/product/STATUS.md`, `docs/agents/AGENT_HANDOFF.md`, July handoff archive
- Summary:                Merged the verified importer/GGPoker/Career/Hands batch as #217, closed #216 as superseded, and merged the refreshed dependency PRs #213-#215. Rebased #218 on that final `main` and regenerated the React Router dependency inventory.
- Verification:           Fresh required CI passed for #217 and each of #213-#215. On #218, isolated `App.test.tsx` passed 6/6 and `studyQueueRouteContract.test.tsx` passed 2/2; `typecheck`, build, `docs:check`, and `privacy:check` pass. Logs: `.agents/runs/2026-07-23-pr218-{app-route-isolated,study-route-isolated,typecheck,build,docs-check,privacy}.log`.
- Risks / assumptions:    A combined local run of the two route files produced one order/state-dependent packet-menu miss; both files pass independently, and no product-code change was made for that harness interaction. Final PR CI remains the merge gate.
- Next action requested:  Merge #218 after fresh CI, then resume III-4 slice 2 (postflop deal-from-range packs).

## Template

```md
## YYYY-MM-DD - <short task name>

- Owner / agent:          # Agent name (Antigravity, Hermes, Claude)
- Branch:                 # Active git branch name
- Scope:                  # Files allowed to be touched
- Files touched:          # Files modified or created
- Summary:                # Bullet points describing changes
- Verification:           # Output of validation commands and logs
- Risks / assumptions:    # Structural dependencies and risks
- Next action requested:  # Action instructions for the next agent
```
