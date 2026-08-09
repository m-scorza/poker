---
status: open
date: 2026-07-28
related: ['#221', '#226', '#227', '#232', '#233', '#237', 'docs/product/STATUS.md', 'AUDIT_NEW.md']
---
# Launch-Readiness Assessment — 2026-07-28

Point-in-time snapshot from an overnight verification + bug-hunt pass. Target
per the owner: **public launch** (real external users uploading their own hand
histories), scope **PokerStars + GGPoker tournaments, including PKO**. Source
code wins over this document; every claim below was read against current `src/`.

## TL;DR

The app is in good shape for its stated scope. This pass found and fixed **three
real correctness bugs**, added regression coverage, and reconciled stale audit
docs. What remains before a confident public launch is mostly **product
decisions the owner must make** (not more code) plus a few hardening items.

## Fixed this session (merged)

| PR | Type | What |
|---|---|---|
| #221 | **Real bug** | GGPoker header timestamps parsed as local time (V8) / `Invalid Date` (Firefox/Safari) — shifted every non-UTC user's hands, corrupting session grouping, trends, and the career timeline. Now `Date.UTC`, with a TZ-independent test. |
| #226 | **Real bug** | `checkFacingLimp` flagged an SB completing behind a limp as a `LIMP_BEHIND` leak, contradicting the documented "SB may limp behind" rule. Now position-aware. |
| #227 | **Real bug** | `detectBountyTournament` matched `"ko"` as a bare substring, mislabeling names like "Lookout"/"Kickoff" as knockouts. Now a word-boundary token match. |
| #220 | Test | Pinned the poker evaluator's wheel / steel-wheel (ace-low) ranking. |
| #222 | Docs | Reconciled `AUDIT_NEW.md` (14 findings verified fixed/won't-fix/not-a-bug); clarified the `icmDetector` display-only RP estimate. |
| #223 | A11y | Labeled Hands filter inputs/selects and reference file pickers. |
| #224 | Test | OHH parser: UTC date, currency normalization, multi-hand, missing-date fallback. |
| #225 | Test | `BB_VS_LIMP` scenario detection coverage. |

## Verified solid (read this pass, no bug found)

- **Parsers** — PokerStars & GGPoker date handling (UTC), integer-cents chip
  math, uncalled-bet returns, chip conservation (fixture-swept), position
  assignment incl. non-active-button fallback, dedup by hand id.
- **Scenario detection** — false-OVERFOLD guard, all-in/3-bet/limp/blind-war
  classification, HU BTN/SB, cbetHU with preflop all-ins.
- **Compliance grading** — `FACING_ALL_IN` required-equity band (inclusive
  boundaries, bubble/FT refused), `BB_VS_RAISE` suited-fold + ICM, vs3bet grids
  (≤15bb premium floor, 40bb boundary, fold-default for ungraded cells).
- **Metrics** — VPIP/PFR/AF/limp/cbet aggregation (the historically-buggy AF is
  correct), leak thresholds.
- **Career math** — ROI via shared fee-inclusive helper, ITM%, guarded
  hourly-rate, bust-out bands.

## Open items — owner decisions (not code)

These need the owner's product/domain call before they can be actioned:

1. ~~**Cash-game support.**~~ **Closed by #233** — the uploader now gates
   cash-game files with a clear message, so tournament-only scope is enforced
   in code rather than assumed.
2. ~~**OHH uncalled bets.**~~ **Closed 2026-08-04.** Owner ruling: OHH stays a
   launch format, fix the gap. Done — the uncalled amount is now derived per
   street (top contributor beyond what any opponent matched) rather than
   inferred from a spec line OHH doesn't have, so the real fixture that was
   the stated blocker turned out not to be needed. The existing iPoker fixture
   test was pinning the bug and has been corrected.
3. **ASK_USER audit items** (from `AUDIT_NEW.md`). **G3 is struck** — verified
   resolved 2026-08-07 (#231 derives the real starting stack; no hardcoded
   1500 remains). Three left, written out here so they can be answered without
   re-reading the audit:

   - **G2 — the c-bet HU denominator.** `scenarioDetector.ts` decides whether a
     flop is heads-up. When hero opens, a villain 3-bet shoves, and a third
     player calls, the flop has two *active* players but three who saw it, and
     the shover cannot act. Should that count as a HU c-bet spot? This is the
     denominator of "C-bet HU 100%", the highest-priority leak in the app, so a
     wrong answer here quietly corrupts the headline number. *Recommendation if
     you have no strong view: count it as HU (subtract all-in players), since
     the c-bet decision hero actually faces is heads-up.*
   - **G4 — ICM risk-premium magnitudes.** Current mapping is bubble 10 → ITM 8
     → FT 15. The bubble→ITM drop is directionally right, but a flat RP of 8
     across *all* of ITM is coarse for late-ITM short stacks. Question: should
     ITM be split (early-ITM vs late-ITM), and what magnitudes? Note this
     affects **grading**, not just display — `checkFacingAllIn` adds the stage
     risk premium to required equity.
   - **G8 — run-it-twice / disconnect markers.** Neither is parsed. Question is
     purely factual: can PokerStars or GGPoker *tournament* hand histories ever
     emit them? If never, this is struck like G3 rather than fixed.
4. **A8 / A9** — confirmed **not bugs** this pass (cbetHU subtracts preflop
   all-ins; the non-monotone ICM RP number is display-only, grading uses a
   separate monotone table). Flagging so they're not re-opened.

## Open items — hardening (code, low-risk, no decision needed)

1. ~~**CSP / PWA**~~ **Closed by #232** — strict `index.html` CSP plus
   immediate service-worker activation.
2. **Accessibility** — one surface done (#223, VillainsPage earlier). A full
   sweep (dialog `aria-labelledby`, remaining pages) would round it out.
3. ~~**Error reporting**~~ **Closed by #237** — a local crash log now persists
   `ErrorBoundary` catches and unhandled promise rejections, with a Markdown
   export in Data Health. Note the framing above was slightly off: parser
   failures were already covered by the import-diagnostics ledger. The real
   gap was render crashes (the fallback's reload destroyed the evidence) and
   async rejections (nothing registered `unhandledrejection` at all).

## Recommended next actions

**Update 2026-08-04.** Every no-decision code item has now landed — #232
(CSP/PWA), #233 (cash-game gating), #237 (local crash log). The only
engineering work left is the accessibility sweep; everything else waits on
owner input.

1. Owner answers the remaining decision items above — OHH as a launch format,
   and the four ASK_USER audit items (G2 cbetHU in 3-bet pots, G3 non-1500 MTT
   starting stacks for BPWR, G4 ICM RP magnitudes, G8 run-it-twice / disconnect
   markers).
2. Optional before launch, no decision needed: finish the accessibility sweep
   (hardening item 2 — the last open code item in this report).
3. Close this report (`status: resolved`, move to `archive/`) once the decision
   items are answered.
