# Agent Handoff Log

Use this file as the shared baton between Hermes, Google Antigravity, and any other coding agent. Keep the newest entry at the top.

Older or compacted handoff records are archived in:

- [AGENT_HANDOFF_ARCHIVE_2026_07.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_07.md)
- [AGENT_HANDOFF_ARCHIVE_2026_06.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_06.md)
- [AGENT_HANDOFF_ARCHIVE_2026_05.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_05.md)

## 2026-07-23 - Importer read recovery and GG collection accounting

- Owner / agent:          Codex
- Branch:                 codex/implementionday
- Scope:                  Hands importer picker/pipeline/tests; GGPoker winner parsing/direct + corpus tests; parser/status truth docs
- Files touched:          `HandsUpload.tsx`, `useImportPipeline.ts`, `HandsUpload.test.tsx`, `ggpoker.ts`, `ggpoker.test.ts`, `fixtureSweep.test.ts`, `PARSER_HEALTH.md`, `STATUS.md`
- Summary:                Keep the native selection alive until file serialization finishes, then reset it so the same hand-history can be selected again. Added a bounded `FileReader` fallback for browsers where `File.text()` never settles, plus regressions for both paths. Recovered GGPoker non-showdown `Seat N: player collected (amount)` awards and upgraded the ZIP sweep from 391/566 to 566/566 collection + chip-conservation coverage.
- Verification:           Human native Chrome selection completed twice with the same PokerStars fixture. Full Vitest: 108 files / 1,129 tests; HandsUpload focused: 20/20. `typecheck`, `typecheck:test`, production build, `docs:update`, `docs:check`, `privacy:check`, and `git diff --check` pass. Earlier focused logs: `.agents/runs/2026-07-22-{importer-focused,parser-health-focused,final-typecheck,final-test-typecheck,final-build,final-docs-check,final-privacy}.log`.
- Risks / assumptions:    The native-picker path and repeat selection were human-verified. Automated file injection remains unavailable until Chrome's ChatGPT extension is allowed to access file URLs; the in-app browser also produces an unreadable synthetic `File`, which is why the bounded `FileReader` recovery is directly regression-tested.
- Next action requested:  Push/integrate this full implementation-day batch, then triage clean PRs #213-#216 without rebasing away the verified work.

## 2026-07-21 - Implementation-day correctness batch 1

- Owner / agent:          Codex with parallel review agents
- Branch:                 codex/implementionday
- Scope:                  GGPoker ZIP fixture evidence; Career chart/finish semantics; Hands numeric display boundary; truth docs
- Files touched:          Parser fixture test/health; Career stats/charts/tests; Hands replay/table/spot formatting/tests; STATUS and owner UI plan
- Summary:                Activated 53-entry GG ZIP recovery coverage; made Career charts explicit and denominator-honest; removed float noise across Hands surfaces.
- Verification:           Focused 8 suites/71 tests; full 108/1126; typechecks, build, lint, docs, privacy, diff check pass. Logs: `.agents/runs/2026-07-21-implementation-day-{focused-tests,build}.log`.
- Risks / assumptions:    Browser runtime failed before local connection. Sweep exposed 175 GG `collected` hands missing winner awards; recovery is green but accounting remains directional.
- Next action requested:  Patch GG winner regex for `collected`, add direct regressions, require 566/566 conservation.

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
