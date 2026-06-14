---
status: resolved
date: 2026-05-12
---
# Janitor Triage — 2026-05-12

**Author:** Claude Code (third agent, validation-track / janitor role)
**Repo state at audit:** branch `phase-6-consolidated-final`, HEAD `9878ba8`, working tree dirty (38 modified, 14+ untracked).
**Purpose:** propose a clean sequence of small commits to land Phase 5→7 work and shut down the line-ending war, before opening a parallel worktree.

> Nothing in this report is acted on until the user signs off. The dirty tree may contain Hermes's or Antigravity's in-progress work, and the janitor proposes, owners approve.

---

## The headline finding

**Phase 7 has been shipping orphan feature files.** The pre-commit hook in [CLAUDE.md](../../CLAUDE.md) (end-of-session contract item 2) is supposed to block exactly this — but it has never fired because nothing has been committed since `9878ba8` (docs-only).

[src/App.tsx](../../src/App.tsx) (modified) wires lazy routes / virtualized tables whose source files are untracked:

| Untracked file | Referenced from |
|---|---|
| `src/components/hands/HandsFilters.tsx` | `src/pages/HandsPage.tsx` (modified) |
| `src/components/hands/HandsTable.tsx` | `src/pages/HandsPage.tsx` |
| `src/components/hands/HandsUpload.tsx` | `src/pages/HandsPage.tsx` |
| `src/components/career/DayHourHeatmap.tsx` | `src/pages/CareerPage.tsx` (modified) |
| `src/components/career/LifetimeScorecard.tsx` | `src/pages/CareerPage.tsx` |
| `src/__tests__/App.test.tsx` | route-smoke test from Phase 7 |

If any of these files vanish, the build dies. They must be tracked in the same commit as the pages that import them, or the hook will (rightly) refuse.

---

## Untracked file dispositions

| Path | Disposition | Notes |
|---|---|---|
| `AGENTS.md` | **Track (commit A)** | Master agent contract referenced everywhere. |
| `.agents/agents.md`, `.agents/skills/`, `.agents/workflows/` | **Track (commit A)** | Hermes 2026-05-10 collaboration scaffolding. |
| `.claude/settings.json` | **Track (commit A)** | Shared Claude Code config. |
| `.claude/settings.local.json` | Already in `.gitignore` | ✓ |
| `.claude/scheduled_tasks.lock` | **Add to .gitignore** | Local runtime state, never commit. |
| `docs/agents/AGENT_HANDOFF.md` | **Track (commit A)** | Shared handoff log. |
| `docs/agents/AI_COLLABORATION.md` | **Track (commit A)** | Process doc. |
| `docs/audits/IP_COPY_AUDIT.md` | **Track (commit A)** | Hermes audit output. |
| `docs/product/PARSER_HEALTH.md` | **Track (commit A)** | Fixture-sweep evidence (council gate green). |
| `docs/agents/PARTNERSHIP_STATUS.md` | **Track (commit A)** | IP posture. |
| `docs/agents/SPRINT_DECISION_GATE.md` | **Track (commit A)** | Active sprint gate. |
| `docs/agents/TWO_AGENT_BOARD.md` | **Track (commit A)** | Operating board. |
| `docs/validation/USER_VALIDATION_PLAN.md` | **Track (commit A)** | Validation framework. |
| `docs/plans/2026-05-10-ip-safe-demo-repositioning.md` | **Track (commit A)** | Planning doc. |
| `docs/plans/2026-05-12-parallel-reliability-next-steps.md` | **Track (commit A)** | Planning doc. |
| `docs/design/CLAUDE_DESIGN_CONTEXT_PACK.md` | **Track (commit A)** | Design brief. |
| `docs/design/PROFESSIONAL_REDESIGN_BRIEF.md` | **Track (commit A)** | Design brief. |
| `scratch.tsx` | **Delete** | One-off Antigravity debug script that proved MemoryRouter+Suspense works. Real test is in `src/__tests__/App.test.tsx`. No imports reference it. |
| `src/__tests__/App.test.tsx` | **Track (commit B)** | Phase 7 route-smoke. |
| `src/components/career/DayHourHeatmap.tsx` | **Track (commit B)** | Phase 7 Career expansion. |
| `src/components/career/LifetimeScorecard.tsx` | **Track (commit B)** | Phase 7 Career expansion. |
| `src/components/hands/HandsFilters.tsx` | **Track (commit B)** | Phase 7 HandsPage decomp. |
| `src/components/hands/HandsTable.tsx` | **Track (commit B)** | Phase 7 HandsPage decomp. |
| `src/components/hands/HandsUpload.tsx` | **Track (commit B)** | Phase 7 HandsPage decomp. |

---

## Modified file groupings

### Commit B — Phase 7 reliability + Career expansion

Bundles the orphan untracked files above with their modified call sites.

- `src/App.tsx` (lazy routing + Suspense)
- `src/pages/HandsPage.tsx` (605-line decomp into Hands{Upload,Filters,Table})
- `src/pages/CareerPage.tsx`
- `src/pages/DashboardPage.tsx` (query split: live + memo)
- `index.html`, `vite.config.ts` (PWA)
- `package.json`, `package-lock.json` (deps: `@tanstack/react-table`, `@tanstack/react-virtual`, `vite-plugin-pwa`)
- AUTOGEN: re-run `npm run docs:update` before this commit (deps + tree + tests changed → hook will block otherwise).

### Commit C — Demo seed UX + analysis polish

- `src/data/{appStore,demoDataset,store}.ts`
- `src/data/__tests__/{demoDataset,demoSeedProgress}.test.ts`
- `src/components/shared/DemoDataButton.tsx`
- `src/components/layout/Layout.tsx` (global demo progress overlay)
- `src/components/layout/Sidebar.tsx`
- `src/components/shared/ConfirmDialog.tsx` (a11y: role/aria-modal/focus trap)
- `src/components/hands/HandReplay.tsx` (a11y)
- `src/components/career/CareerCoachCard.tsx`

### Commit D — IP-safe copy neutralization + English purge

- `src/pages/{Pricing,Sessions,Leaks,Ranges,Stats}Page.tsx`
- `src/analysis/leakDetector.ts` (user-visible strings only — source tags neutralized to `[Baseline]`, `[04-postflop §3]`)
- `src/analysis/bountyAnalyzer.ts`, `finalTableAnalyzer.ts`, `icmDetector.ts`, `postflopAnalyzer.ts`, `pushFoldChecker.ts`, `rangeValidator.ts`, `squeezeDetector.ts` — English purge of `note` strings
- `src/analysis/__tests__/{finalTableAnalyzer,icmDetector,pushFoldChecker}.test.ts`

### Commit E — Doc state catch-up

- `CLAUDE.md` — phase 5/6 status, drift warnings, Reg Life neutralization
- `docs/product/STATUS.md` — current STATUS snapshot
- `docs/product/ROADMAP.md` — checkboxes
- Re-run `npm run docs:update` to re-sync the autogen blocks if any drift since commit B.

---

## Hygiene fixes to land first

Before any commit above, two zero-risk preconditions:

### 1. Stop the CRLF/LF war

Almost every "modified" file shows `LF will be replaced by CRLF the next time Git touches it`. This is the warning that bit Hermes vs Antigravity twice in [docs/agents/AGENT_HANDOFF.md](../AGENT_HANDOFF.md) (2026-05-11 + 2026-05-12 entries).

**Proposal:** add `.gitattributes` at repo root:

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.pdf binary
*.zip binary
```

That pins line endings to LF in the index regardless of OS, ending the war. No source diff results from this; the working tree continues to use whatever EOL Windows/WSL want.

### 2. Extend .gitignore

Append to [.gitignore](../../.gitignore):

```gitignore
# Local runtime state from agent tooling
.claude/scheduled_tasks.lock

# Janitor reports stay local until reviewed
# (remove this line once we agree to track janitor outputs)
# docs/reports/janitor-*.md

# Throwaway debug scripts at repo root
/scratch.*
```

---

## Proposed execution order

```
0.  .gitattributes + .gitignore + delete scratch.tsx   (no commit yet — staging only)
1.  Refresh line endings on every dirty file via git add (re-normalizes)
2.  Commit A — docs/agent scaffolding (lowest risk, no src changes)
3.  npm run docs:update + npm test
4.  Commit B — Phase 7 architecture + orphans (deps changed → docs:update required)
5.  npm test + npx tsc -b
6.  Commit C — demo seed UX + a11y
7.  Commit D — IP-safe copy + English purge
8.  Commit E — doc state catch-up (last, to absorb any STATUS.md drift from B/C/D)
9.  Open `claude/validation-track` worktree at the new HEAD
```

Each commit gets its own `docs/agents/AGENT_HANDOFF.md` entry. None use `--no-verify`. If the hook blocks, fix and re-stage — never bypass.

---

## What I will NOT do without sign-off

- Stage anything in any of the modified `src/analysis/*.ts` files. Those are Hermes's territory and the changes look like English purge + IP source-tag neutralization — but I am not the original author and shouldn't quietly rewrite the diffs.
- Touch the `package-lock.json` re-write (7546+ / 2788− lines). I want to confirm with you that this lockfile state corresponds to a deliberate `npm install` and not a corrupted state.
- Reorder, squash, or amend any commits.
- Push anything.
