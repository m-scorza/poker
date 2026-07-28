---
status: open
date: 2026-07-28
related: ['#221', '#226', '#227', 'docs/product/STATUS.md', 'AUDIT_NEW.md']
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

1. **Cash-game support.** Out of the current tournament scope. The float→cents
   path exists, but cash-specific parsing (blinds, straddles, rake caps) is
   unverified. Decide: in or out for launch.
2. **OHH uncalled bets.** The Open Hand History parser does not return uncalled
   bets, so `heroChipsAfter` can be understated. OHH is outside the PS/GG scope
   and the fix is uncertain without a real OHH fixture — confirm whether OHH is
   a launch format at all before investing.
3. **ASK_USER audit items** (from `AUDIT_NEW.md`): G2 (cbetHU in 3-bet pots),
   G3 (non-1500 MTT starting stacks for BPWR), G4 (ICM RP magnitudes), G8
   (run-it-twice / disconnect markers). Each needs a domain answer.
4. **A8 / A9** — confirmed **not bugs** this pass (cbetHU subtracts preflop
   all-ins; the non-monotone ICM RP number is display-only, grading uses a
   separate monotone table). Flagging so they're not re-opened.

## Open items — hardening (code, low-risk, no decision needed)

1. **CSP / PWA** (`AUDIT_NEW.md` B4/B8) — no Content-Security-Policy on a PWA
   that loads user files; service worker lacks `skipWaiting`, so security fixes
   activate lazily. Add a strict `index.html` CSP + `skipWaiting`/`clientsClaim`
   (needs a build + manual smoke to avoid breaking inline styles/worker/blob).
2. **Accessibility** — one surface done (#223, VillainsPage earlier). A full
   sweep (dialog `aria-labelledby`, remaining pages) would round it out.
3. **Error reporting** — client-only app has no error surface beyond
   `ErrorBoundary` console logs; a lightweight local error log would help triage
   real-user parser failures post-launch.

## Recommended next actions

1. Owner answers the four decision items above (30 min) — unblocks the largest
   chunk of remaining work.
2. Ship the CSP + PWA hardening PR (in-scope, no decision).
3. If cash games are in scope, add a cash-game parser fixture + tests before
   launch; if not, gate the uploader to tournament formats with a clear message.
4. Close this report (`status: resolved`, move to `archive/`) once the decision
   items are answered and the hardening PR lands.
