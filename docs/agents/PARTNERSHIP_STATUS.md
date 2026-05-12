# Partnership and IP Status

**Last updated:** 2026-05-10
**Purpose:** make the Reg Life / curriculum / licensing state explicit before more product, funnel, pricing, or distribution work.

## Reg Life partnership status

**Status: informal encouragement only; not licensed / not verified in writing.**

The user reports informal verbal/DM encouragement from someone they can name privately, but no signed Reg Life partnership agreement, term sheet, email confirmation, revenue-share terms, licensing scope, or written distribution permission is present in this repository. Past council transcripts and project docs discuss Reg Life as the intended wedge / target community, but the repo does not contain evidence that a partnership is signed or that Reg Life has authorized this product to commercialize its curriculum.

Until written terms exist, treat the Reg Life partnership as **unconfirmed**. The current product posture is **private/local tool only**.

Minimum written terms to obtain before presenting this as a Reg Life companion or scaling distribution:

- Who at Reg Life approved the product and on what date.
- Whether use of Reg Life ranges, Game Plan concepts, and dossier-derived citations is licensed.
- Whether the product may be sold directly to students, bundled by Reg Life, or used only privately.
- Revenue split, if any.
- Customer ownership and support/refund responsibility.
- Exclusivity or non-exclusivity.
- Termination terms and what happens to existing users/data if the partnership ends.
- Whether public screenshots, exported study cards, demo datasets, and marketing pages may mention Reg Life or expose curriculum-derived advice.

## Strategy / curriculum IP standing

**Status: not cleared.**

The current codebase contains strategy logic and source labels that appear derived from, or at least explicitly attributed to, Reg Life / third-party curriculum material:

- `src/data/ranges.ts` says the RFI ranges come from the "Reg Life Game Plan" / "Plano de Jogo SNG".
- `src/data/strategyProfiles.ts` references Game Plan thresholds and postflop sources.
- `src/data/pushFoldRanges.ts` references `[Vol.2, NERD, GamePlan]`.
- Analysis modules include dossier-style source tags such as `[D#07]`, `[D#21]`, `[D#04]`, and volume references.
- `docs/knowledge/strategy/` and `CLAUDE.md` document strategy/range behavior as product logic.

This document is not legal advice. The practical product rule is simpler: do not scale distribution, publish shareable study artifacts, advertise a Reg Life companion, or monetize curriculum-derived recommendations until the license status is clear in writing.

## Product implication

The user has chosen to **pivot away from Reg Life-specific content** unless/until licensing is resolved. For now, the product should be treated as a private/local poker analyzer, not a Reg Life companion.

Until partnership and IP status are resolved:

- Do not pursue shareable study-card virality using curriculum-derived "why" explanations.
- Do not deepen proprietary Reg Life-specific analysis as a commercial feature.
- Do not ship pricing/payment flows that imply commercial rights to the curriculum.
- Prefer private/local verification work, parser reliability, generic poker-math infrastructure, and non-public user interviews.
- Start identifying user-facing Reg Life / GamePlan / dossier-derived labels that would need neutral wording before public demos or monetization.

## Next concrete action

Because the user chose to pivot away from Reg Life-specific content, the next concrete action is not a partnership pitch. It is an IP-safety and validation sequence:

1. Demo the private/local tool to 3 Reg Life students and 3 independent poker players without claiming Reg Life affiliation.
2. Record findings in `docs/validation/USER_VALIDATION_PLAN.md`.
3. Audit user-facing copy and public/demo/pricing flows for Reg Life / GamePlan / dossier-derived claims.
4. Decide whether to remove/isolate those references or later seek written licensing.

If the strategy changes back toward Reg Life-specific distribution, send a written partnership/license clarification message to a specific Reg Life decision-maker before building public/commercial features. The message should ask for permission and terms covering:

1. Use of the Game Plan ranges and postflop rules inside software.
2. Use of dossier-derived source citations and explanations.
3. Whether exported screenshots / PNG / JSON study artifacts may include curriculum-derived recommendations.
4. Whether the app can be sold directly, distributed by Reg Life, or used only as a private personal tool.

Record the outcome here as one of:

- `sent, awaiting reply`
- `approved in writing`
- `rejected`
- `not pursued; pivoting away from Reg Life-specific IP`

Current recorded outcome: **informal verbal/DM encouragement only; no written licensing/distribution terms in repo; pivoting away from Reg Life-specific content for now**.
