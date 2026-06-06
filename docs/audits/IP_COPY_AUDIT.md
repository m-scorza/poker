# IP / Copy Risk Audit — Private Demo Repositioning

**Created:** 2026-05-10
**Current review note:** 2026-05-31 — this file is retained as audit history.
The active user-facing route is now `/demo` (`DemoPage`), not `/pricing`, and
the current operating gate lives in `docs/agents/TWO_AGENT_BOARD.md`.
**Repo audited:** Windows working copy at `/mnt/c/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh`
**Purpose:** give Antigravity and Hermes a shared map of user-facing language that must be neutralized before private/local validation demos.

## Current posture

- Product posture: private/local generic poker hand-history analyzer.
- Third-party curriculum status: informal verbal/DM encouragement only; no written licensing/distribution terms recorded.
- Do not imply third-party curriculum affiliation, third-party distribution rights, paid pilot readiness, public SaaS launch, or public shareable artifacts.

## Audit command

Searched `src/**/*.{ts,tsx}` for:

```text
third-party curriculum|GamePlan|Game Plan|D#|Dossiê|Dossie|luischiavo|payment|pricing|pilot|public|shareable|share report|Export/share
```

## Original highest-priority user-facing copy findings

The table below preserves the original 2026-05-10 audit findings. It is not a
current bug list; later copy work neutralized these surfaces, and `PricingPage`
has since been replaced by `DemoPage`.

These are the first places Antigravity should fix because they affect visible UI, navigation, demo copy, or user-facing messages.

| Priority | File | Current issue | Recommended neutral posture |
|---|---|---|---|
| P0 | `src/pages/PricingPage.tsx` | DM copy says `training-community players`, `Shareable report`, `founding-user pilot`, and `before making it public`; page says `private validation pilot`, `charge for ongoing reviews`, `Target buyer: training-community student`. | Reframe as private validation/demo page for a local generic analyzer. Remove payment/charge/founding-user/public launch wording. |
| P0 | `src/components/layout/Sidebar.tsx` | Main navigation exposes `Pricing`; profile dropdown says `Game Plan (GTO)`. | Rename pricing route label to neutral validation/demo wording, or hide/de-emphasize until validation gate clears. Rename profile label to `Baseline` / `Advanced` or similar. |
| P0 | `src/components/shared/DemoDataButton.tsx` | Shared demo loader button/status copy is the actual demo component in the Windows repo. | Keep behavior; only neutralize visible demo wording if needed. |
| P0 | `src/components/career/CareerCoachCard.tsx` | Links to `/pricing`, pushing funnel behavior from product UI. | Point to private demo/validation context or remove CTA until gates clear. |
| P0 | `src/data/demoDataset.ts` | Demo tournament names include `Demo third-party curriculum Sprint`. | Rename to generic demo session/tournament labels. |
| P1 | `src/pages/SessionsPage.tsx` | Visible success copy says `maintained the Game Plan`. | Change to `maintained your baseline strategy` or `kept disciplined baseline decisions`. |
| P1 | `src/pages/LeaksPage.tsx` | Visible profile copy shows `Game Plan`; source badges expose `[GamePlan]`. | Use neutral profile label in UI; keep detailed source attribution internal until licensing posture changes. |

## Source/comment/internal references to classify later

These are not necessarily user-facing, but they are still relevant for a later IP-safe refactor or source-attribution strategy.

| Area | Examples | Current recommendation |
|---|---|---|
| Strategy profile internals | `src/data/strategyProfiles.ts` comments and constants mention `Game Plan`, `third-party curriculum Plano de Jogo`, `[GamePlan]`, `[D#]`. | Do not rename in the current copy-only sprint unless tests are updated; create a separate internal-label refactor if needed. |
| Range source comments | `src/data/ranges.ts`, `src/data/pushFoldRanges.ts`, `src/analysis/rangeChecker.ts`, `src/analysis/rangeValidator.ts`. | Keep behavior stable for now. Later decide whether to neutralize comments or isolate source citations in internal docs. |
| Leak/source badges | `src/analysis/leakDetector.ts`, `src/pages/LeaksPage.tsx`. | User-facing badges should be neutralized first; internal source fields can be audited separately. |
| Test descriptions | `src/analysis/__tests__/*`. | Lower priority; tests can retain current labels until a larger internal rename/refactor. |
| Council transcripts and planning docs | `council-transcript*.md`, `CLAUDE.md`, strategy docs. | Not demo UI; do not edit as part of Antigravity copy sprint unless explicitly asked. |

## Non-overlap assignment

While Antigravity edits user-facing UI copy, Hermes should not touch those source files unless doing a tiny review fix after Antigravity hands off.

Antigravity current implementation scope:

- `src/pages/PricingPage.tsx`
- `src/components/shared/DemoDataButton.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/career/CareerCoachCard.tsx`
- `src/data/demoDataset.ts`
- `src/pages/SessionsPage.tsx`
- `src/pages/LeaksPage.tsx` only if it can be safely copy-neutralized without changing logic

Hermes current review scope:

- Verify actual diff against this audit.
- Search for remaining risky user-facing language.
- Run `npx tsc -b --pretty false` after source changes.
- Run `npm run docs:check` after docs changes.

## Acceptance criteria for the next review

Hermes should approve Antigravity's copy sprint only if:

1. No visible UI copy claims third-party curriculum affiliation or target audience.
2. No visible UI copy asks for payment, paid pilot, pro plan, or public launch before gates clear.
3. Export/share wording is private-review-only.
4. Strategy profile labels visible to demo users are generic enough for private validation.
5. Parser/scenario/range/leak/financial behavior was not changed.
6. TypeScript check passes or any failure is clearly unrelated and documented.
