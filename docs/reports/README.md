# docs/reports/

Point-in-time janitor / codebase-health / kb-drift snapshots. Each file is a
dated record; we do **not** rewrite history in them. Instead, each report tracks
whether its action items are still open.

## Status convention

Every report **should** begin with YAML frontmatter:

```md
---
status: open        # open | resolved
---
# <Report title>
```

- **`status: open`** — the report has unfinished action items.
- **`status: resolved`** — every action item is done (or superseded by a newer
  report). Keep the file for history.
- **No frontmatter** — treated the same as `resolved` (archived). Older reports
  predating this convention are intentionally left unmarked.

## How open reports reach agents

`scripts/surface-open-reports.ts` runs as a **SessionStart hook**: at the start of
every Claude Code session its stdout is injected into context, listing the **open**
reports newest-first so no agent starts work without seeing them. It prints nothing
when nothing is open.

### Hook configuration

The hook is configured in the tracked `.claude/settings.json` as this `hooks` block
(alongside `permissions`):

```json
"hooks": {
  "SessionStart": [
    {
      "matcher": "startup|resume|clear|compact",
      "hooks": [
        { "type": "command",
          "command": "npx tsx \"${CLAUDE_PROJECT_DIR}/scripts/surface-open-reports.ts\"" }
      ]
    }
  ]
}
```

You can run the script directly any time to preview what it would inject:
`npx tsx scripts/surface-open-reports.ts`.

For each open report it surfaces, in priority order:

1. an `## Open items` section (preferred — a live, trimmed list of what's left), else
2. a `## Recommended next actions` section, else
3. the first lines of the body.

Prefer adding/maintaining a short **`## Open items`** section so the surfaced
text reflects what is *actually* still open, not the full historical action list.

## Lifecycle

1. A review lands as a new `YYYY-MM-DD-<name>.md` with `status: open` and an
   `## Open items` section.
2. As items are closed (by PRs), trim them from `## Open items`.
3. When the last item is done, set `status: resolved`. The hook stops surfacing it.

This keeps the "what's left" list in front of every session until it is genuinely
done — closing the recurring drift where report recommendations were completed but
nothing closed the loop.
