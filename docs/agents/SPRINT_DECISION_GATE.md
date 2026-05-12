# Sprint Decision Gate

**Created:** 2026-05-10
**Purpose:** prevent the project from drifting into feature work before the council's ground-truth gates are satisfied.

## Current gate status

| Gate | Status | Evidence |
|---|---|---|
| Parser fixture sweep published | Green | `docs/product/PARSER_HEALTH.md`: 302 / 302 supported fixture files pass, 0 fail, 0 skip. |
| Reg Life written partnership/license | Red | User reports informal verbal/DM encouragement only; no written terms in repo. |
| Product posture selected | Green | Private/local tool for now. |
| Reg Life-specific IP strategy | Red/changed | User chose to pivot away from Reg Life-specific content. Existing code/docs still contain Reg Life/GamePlan/dossier-derived logic and labels. |
| External user validation | Red | Planned but not yet executed. Target: 3 Reg Life students + 3 independent players. |

## Allowed work before the red gates clear

Allowed:

- Parser reliability and import confidence.
- Documentation that records ground truth.
- Removing or isolating Reg Life-specific references from user-facing copy.
- Refactoring toward generic poker analytics language.
- Preparing private/local demos.
- Running six user validation sessions and recording findings.
- Tests that protect existing behavior while de-risking IP/user-facing claims.

Not allowed yet:

- Public pricing/payment/funnel work.
- Reg Life-branded positioning.
- Shareable study-card virality.
- Public exported curriculum-derived PNG/JSON artifacts.
- Deepening Reg Life-specific strategy analysis as a commercial differentiator.
- Broad platform expansion unless user validation shows site support is the blocking issue.

## Next sprint cannot be chosen until

1. `docs/validation/USER_VALIDATION_PLAN.md` has at least six completed interview entries, or the user explicitly chooses to override the validation gate.
2. The product either:
   - has written permission/license terms for Reg Life-derived content, or
   - has a documented plan to remove/isolate Reg Life-specific content from public/commercial flows.
3. `docs/agents/PARTNERSHIP_STATUS.md` reflects the latest truth.

## Current recommended next sprint

Given the user's decision to pivot away from Reg Life-specific content, the likely next sprint is **IP-safe product repositioning**, not new features.

Candidate sprint:

> Make the app safe to demo as a private/local generic poker analyzer by removing Reg Life branding/citations from user-facing copy, isolating curriculum-derived internals behind neutral labels, and preserving parser/analysis tests.

Potential acceptance criteria:

- No user-facing text claims Reg Life affiliation.
- No pricing/demo page implies rights to Reg Life curriculum.
- Source citations remain internal docs/code comments only until licensing is resolved.
- Strategy profile labels are generic enough for private demo use.
- Existing parser and analysis tests still pass.

This should still wait until at least some user validation is scheduled or completed, unless the immediate goal is just to reduce IP exposure before demos.
