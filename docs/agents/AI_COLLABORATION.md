# AI Collaboration Playbook — Hermes + Google Antigravity

This playbook defines specialized agent roles, file ownership bounds, and pointers to coordination protocols for scheduler-controlled branch or worktree development.

## 1. Protocol Pointers
For task execution, claims, and handoff documentation, refer strictly to:
*   [TASK_PROTOCOL.md](./TASK_PROTOCOL.md) (workspace guards, state structure).
*   [HANDOFF_PROTOCOL.md](./HANDOFF_PROTOCOL.md) (handoff format, verification checklist).

## 2. Specialized Roles

### Hermes (Backend & Verification)
- Parser correctness and test suite diagnostics.
- Scenario detection, range validation, and financials math execution.
- Skeptical diff reviews and gate enforcement.
- Maintainer of `STATUS.md` and `ROADMAP.md` state.

### Google Antigravity (IDE & UI Implementation)
- Rapid IDE implementation and focused code edits.
- UI and presentational components polish.
- Copy neutralization and visual layout corrections.
- Execution of reviewer feedback from Hermes/human.

## 3. File Ownership Map

Only one agent should edit a given file area at a time. The review guidelines are structured as follows:

| Area | Primary Owner | Secondary Reviewer |
| :--- | :--- | :--- |
| Parser & Import logic | Hermes | Antigravity |
| Strategy & Math analysis | Hermes | Antigravity |
| UI & Page layouts | Antigravity | Hermes |
| Shared UI Components | Antigravity | Hermes |
| Copy / Demo posture | Antigravity | Hermes |
| Status & Handoff docs | Hermes | Antigravity |

## 4. Conflict Resolution Rules
- **No Overlapping Edits**: Parallel work is allowed only when the scheduler confirms non-overlapping file scopes and lanes.
- **Drift Principle**: If a code change shifts strategy bounds, the corresponding tests and strategy documentation must be updated in the same commit.
- **Source of Truth**: When documents disagree with execution behavior, trust the running source code and tests, then update the documentation to match.
