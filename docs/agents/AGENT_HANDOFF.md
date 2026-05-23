# Agent Handoff Log

Use this file as the shared baton between Hermes, Google Antigravity, and any other coding agent. Keep the newest entry at the top.

All historical handoff records older than May 2026 are archived in [AGENT_HANDOFF_ARCHIVE_2026_05.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_05.md).

## Template

```md
## YYYY-MM-DD — <short task name>

- Owner / agent:
- Branch:                        # feature branch name, e.g. solver/<slice>
- PR:                            # https://github.com/m-scorza/poker/pull/<n> (or "open: <url>" if not merged yet)
- Scope:
- Files touched:
- Summary:
- Verification:                  # local commands run + CI result (green/red on which checks)
- Risks / assumptions:
- Next action requested:
```

## 2026-05-23 — Career hub consolidation (Stats fold-in + streaks + format breakdown)

- Owner / agent: Claude
- Branch: `feat/career-hub-and-stats-consolidation` (rebased onto fresh `origin/main`, single commit)
- PR: https://github.com/m-scorza/poker/pull/20
- Scope: Finish the in-flight Career/Stats consolidation found dirty in the working tree, and complete the two remaining ROADMAP P4 career surfaces ("Streaks, format breakdown").
- Files touched:
  - `src/analysis/careerStats.ts` — added `computeCareerStreaks` (current/longest ITM, win, cashless streaks) and `computeFormatBreakdown` (per-format count/ITM/ROI/profit/avgBuyIn via `classifyTournamentFormat`); both use `financials.ts` helpers.
  - `src/analysis/__tests__/careerStats.test.ts` — reworked/extended for the new aggregators (7 tests green).
  - `src/components/career/CareerStreaksCard.tsx` (NEW) — presentational card consuming `computeCareerStreaks`.
  - `src/components/career/FormatBreakdownTable.tsx` (NEW) — table consuming `computeFormatBreakdown`, formatted via `utils/format`.
  - `src/components/career/__tests__/CareerStreaksCard.test.tsx` + `FormatBreakdownTable.test.tsx` (NEW) — smoke tests matching the `LifetimeScorecard` convention (render-with-data + null-on-empty).
  - `src/pages/CareerPage.tsx` — wired the two new cards into the overview/tiers tabs.
  - `src/pages/StatsPage.tsx` — slimmed after folding content into Career.
  - `src/components/shared/DualRangeMatrix.tsx` — matrix display updates.
  - `docs/product/STATUS.md` — regenerated autogen blocks.
- Summary:
  - The dirty tree was a mid-implementation consolidation: `CareerPage` imported `CareerStreaksCard`/`FormatBreakdownTable` that did not exist, so typecheck failed. The aggregation layer was already done + tested; only the two presentational components were missing. Built them against the existing tested contracts.
  - Rebased the branch onto fresh `origin/main` (`--onto origin/main 1de48f3`) so the PR contains exactly this one consolidation commit — the prior HU push/fold (#19) and EvidenceKind (#18) commits on the old base were already merged.
- Verification:
  - `npm run docs:check` ✓, `npm run typecheck` ✓, `npm run lint` ✓ (0 errors, 8 pre-existing warnings, none in new files), `npm test -- --run` ✓ (52 files / 551 tests before the 4 new component tests; 555 with them), `npm run build` ✓ (production PWA).
- Risks / assumptions:
  - Pure additive UI on top of already-tested analysis helpers; no parser/scenario/range/math changes.
  - `classifyTournamentFormat` is heuristic on tournament name/format strings; unusual format labels fall through to MTT.
- Next action requested:
  - After merge, the remaining open P4 item is "opponent overlap, day×hour heatmap polish." Antigravity could wire study-queue confidence/evidence into a UI card next; Hermes lane stays on confidence propagation into leak/range/scenario outputs.
