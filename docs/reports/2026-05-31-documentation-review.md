# Documentation Review - 2026-05-31

## Scope

Reviewed high-signal Markdown entry points against current source and the active
private/local gate:

- `README.md`
- `CLAUDE.md`
- `docs/README.md`
- `docs/product/STATUS.md`
- `docs/product/ROADMAP.md`
- `docs/product/PARSER_HEALTH.md`
- `docs/audits/IP_COPY_AUDIT.md`
- `scripts/README.md`
- `docs/agents/TWO_AGENT_BOARD.md`
- `docs/agents/AGENT_HANDOFF.md`

Older plans, reports, and archives were treated as historical snapshots unless
they directly pointed current docs at missing or renamed active files.

## Corrections made

- Reframed the root README around the current private/local analyzer posture and
  current parser surface: PokerStars, GGPoker, and Open Hand History.
- Removed stale README references to `tailwind.config.ts`, PokerStars-only
  parser fixtures, a fixed default hero identity, and an old approximate test
  count.
- Updated `STATUS.md` manual sections for the `/demo` route, current dependency
  families, current analysis inventory, recent merged correctness fixes, and
  open follow-ups.
- Updated `ROADMAP.md` for completed UI/component smoke tests, completed
  villain aggregation repair-path work, completed HandsPage TanStack
  Table/Virtual work, configured PWA support, and the still-open
  `statsByPosition` persistence issue.
- Updated `PARSER_HEALTH.md` so the remaining gate points to the active board
  and IP audit instead of the old non-active partnership-status path.
- Added a current note to `IP_COPY_AUDIT.md` explaining that `/demo` superseded
  the old `/pricing` route.
- Expanded `scripts/README.md` to include the active agent/kernel/docs scripts.

## Remaining drift risks

- Historical plans and reports still mention older `/pricing` and
  `PARTNERSHIP_STATUS.md` paths. They were left unchanged because their value is
  historical context, not current command/control.
- `CLAUDE.md` still contains detailed strategy notes and examples. It now warns
  that source/tests/`STATUS.md` win, but any future behavior-changing work
  should still verify the relevant sections before relying on them.
- The task spool is local and still needs scheduler cleanup after recent PR
  merges; this review did not mutate `.agents/state/task_spool.json`.
