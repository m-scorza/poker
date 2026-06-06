# Agent Handoff Log

Use this file as the shared baton between Hermes, Google Antigravity, and any other coding agent. Keep the newest entry at the top.

Older or compacted handoff records are archived in:

- [AGENT_HANDOFF_ARCHIVE_2026_06.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_06.md)
- [AGENT_HANDOFF_ARCHIVE_2026_05.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_05.md)

## 2026-06-06 - Parser confidence ledger

- Owner / agent:          Codex
- Branch:                 codex/parser-confidence-ledger
- Scope:                  Turn retained local import diagnostics into an explicit parser confidence ledger that downstream analysis and support exports can trust.
- Files touched:
  - `src/data/importRuns.ts` - adds import warning categorization, confidence ledger derivation, ledger-backed data health, and a ledger section in diagnostics Markdown.
  - `src/data/__tests__/importRuns.test.ts` - covers warning categories, ledger aggregation, empty posture, data-health linkage, and diagnostics export output.
  - `src/components/hands/HandsUpload.tsx` - shows parsed-file rate, high/medium/low run mix, and top parser warning categories in the Data Health card.
  - `docs/product/DATA_MODEL_AND_PRIVACY.md`, `docs/product/PARSER_HEALTH.md`, and `docs/product/STATUS.md` - document the local aggregate ledger and shipped parser-confidence behavior.
  - `docs/agents/archive/AGENT_HANDOFF_ARCHIVE_2026_06.md` - archives the previous active handoff entry to keep this baton compact.
- Summary:
  - Retained import runs now derive an `ImportConfidenceLedger` with ready/directional/blocked posture, latest confidence, parsed-file rate, saved record totals, high/medium/low run counts, and grouped parser warning categories with sanitized examples.
  - Diagnostics Markdown now includes an "Import Confidence Ledger" section before per-run details, so support/debug reports explain why analysis should be trusted, treated as directional, or reviewed.
  - Hands upload Data Health now exposes the same ledger summary locally without adding telemetry, raw hand export, network upload, or solver claims.
- Verification:
  - `npx.cmd vitest run src\data\__tests__\importRuns.test.ts` - passed, 19 tests.
  - `npx.cmd tsc -b --pretty false` - passed.
  - `npm.cmd run typecheck:test` - passed.
  - `npm.cmd run privacy:check` - passed.
  - `npm.cmd run docs:update` - updated `docs/product/STATUS.md`.
  - `npm.cmd run docs:check` - passed.
  - `npm.cmd run build` - passed.
  - `npx.cmd vitest run --reporter=dot` - passed, 63 files / 681 tests.
  - `git diff --check` - passed.
- Risks / assumptions:
  - Warning categories are deterministic string buckets for support triage. They are not a full parser root-cause classifier.
  - The ledger summarizes retained local import history; it does not prove fixture coverage beyond the committed parser sweep.
  - This stacked branch still inherits historical third-party wording from its base. This slice did not add new references and neutralized the touched parser-health line.
- Next action requested:
  - Review this stacked branch after the local privacy guard branch. The next research-derived slice can be native-format fixture sourcing or a shareable-local support package preview that still stays offline/local-first.

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
