# Prompt Guide — How to Start a Session

This file tells you how to open a Claude/Hermes/Antigravity session so the
assistant starts with full context, follows the project rules, and documents
changes properly.

> **Verify before you trust.** CLAUDE.md / ROADMAP.md describe intent and
> can drift. `STATUS.md` is the single source of truth for what is actually
> shipped. Read it first. If a doc contradicts STATUS.md, trust STATUS.md
> and fix the doc in the same commit.

---

## Session Start Template

Copy-paste this at the start of every session. Fill in only the `[brackets]`.

```
Context check:
- Branch: [branch name, e.g. updated-trying-new-stuff-poker]
- Status: see STATUS.md (single source of truth for shipped state)
- Tests passing: [yes / no / unknown]
- Last session summary: [1-2 lines of what was done]

Task: [describe what you want to build or fix]

Rules to follow:
1. Read STATUS.md to know what's actually in the repo before acting.
2. Read CLAUDE.md before touching analysis logic.
3. Read docs/knowledge/strategy/claudecode_index.md before touching ranges or scenarios.
4. If a change alters structure, deps, routes, or UI language, update
   STATUS.md in the same commit (CLAUDE.md references it).
5. Update ROADMAP.md when you finish a punch-list item; mark fixed known
   issues ✅ FIXED in STATUS.md with the date.
6. UI target is English. Don't add new Portuguese strings. Residue is
   tracked in STATUS.md.
7. Run tests after changes: `npm test`.
```

---

## Minimal Session Start (Quick Tasks)

For small fixes or UI changes where you know exactly what to change:

```
Maintenance mode. Task: [one clear sentence].
File to change: [path]. Expected behavior: [what it should do].
Run tests after. Update ROADMAP.md / STATUS.md if applicable.
```

---

## Rules for Claude to Follow (Include When Relevant)

| When you want... | Add this to your prompt |
|---|---|
| Analysis logic change | "Read docs/knowledge/strategy/claudecode_index.md first and cite the source." |
| New leak detection rule | "Add source attribution [GamePlan/Vol.X/D#N] in code comment." |
| Parser changes | "Validate against the parsing rules table in CLAUDE.md." |
| New UI component | "Dark theme (#0a0a0f bg, #00ff88 accent). UI text in English." |
| Bug fix | "Add the bug to Known Bugs & Lessons Learned in CLAUDE.md after fixing." |
| Major feature | "Update ROADMAP.md checkboxes when done." |
| Multiple files | "Show which files you changed before finishing." |

---

## What Claude Reads Automatically

When you open a session in this project, Claude already loads:
- `CLAUDE.md` — project spec (intent): ranges, parsing rules, rules, bugs log
- `AGENTS.md` — multi-agent operating contract
- `STATUS.md` — **fact sheet.** What's actually shipped right now.
- `ROADMAP.md` — prioritised punch list of what's next

Order of trust when they disagree: **STATUS.md > code > CLAUDE.md > ROADMAP.md.**
If you catch a contradiction, fix STATUS.md first, then the doc that lied.

You do NOT need to re-paste ranges, parsing rules, or scenario tables.
Reference them by name.

---

## Prompts for Common Tasks

### Fix a Bug
```
Bug: [describe what's wrong and where it appears]
File: [file path if known]
Expected: [correct behavior]
Fix it and add to Known Bugs section in CLAUDE.md.
```

### Add a Feature
```
Feature: [name]
Phase 5 checklist item: [copy the line from ROADMAP.md]
Files likely involved: [guess if you know]
When done: update ROADMAP.md checkbox and run npm test.
```

### Review Analysis Logic
```
Check the [scenarioDetector / rangeChecker / leakDetector / postflopAnalyzer] logic for [specific concern].
Cross-reference with CLAUDE.md rules and docs/knowledge/strategy/. Report deviations.
```

### Refactor / Cleanup
```
Refactor [file or component]. Goal: [what to improve].
Do NOT change behavior — only code structure. Run tests after.
```

### Visual / UI Change
```
UI change: [describe]. Page: [page name].
Dark theme. English labels. Match existing component style in src/components/.
Test in browser before reporting done.
```

---

## Documentation Habits

After completing any non-trivial task, ask Claude to:

1. **Update STATUS.md** — if structure, deps, routes, or UI language
   shifted; mark fixed known issues ✅ FIXED with the date.
2. **Update ROADMAP.md** — check off completed punch-list items.
3. **Add to Known Bugs** (CLAUDE.md) — if a new edge case was discovered.
4. **Add source citation** — if a new analysis rule was added
   (`[GamePlan]`, `[Vol.X]`, `[D#N]`).
5. **Note what files changed** — so you can review the diff.

Prompt: *"Before closing: update STATUS.md if anything structural
changed, update ROADMAP.md, add any new bugs to CLAUDE.md, and list
every file you touched."*

---

## Tips

- **Be specific about the file.** "Fix the leak detector" is vague. "Fix
  `leakDetector.ts` — it's flagging BB fold suited in `BB_VS_LARGE_RAISE`
  scenarios" is actionable.
- **Reference the punch list.** Paste the exact line from ROADMAP.md so
  Claude knows which task this is.
- **Mention the test count.** If you know tests were passing (331/331 as
  of 2026-04-18), say so — Claude will alert you if they break.
- **Don't re-explain the whole project.** CLAUDE.md handles intent,
  STATUS.md handles fact. Just describe the delta: what's new, what's
  broken, what you want next.
- **Verify before documenting.** If Claude is about to claim a path,
  component, or dep exists, ask it to grep/ls first. Drift is how
  CLAUDE.md got out of sync in the first place.
