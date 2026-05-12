# Parallel Reliability Next Steps — 2026-05-12

> **For Hermes:** Use `subagent-driven-development` only after the active file lanes below are claimed. Do not let multiple agents edit the same files.

**Goal:** keep Hermes, Google Antigravity, and the user's Claude Code run moving in parallel while the current private/local demo remains blocked by import responsiveness evidence.

**Current review verdict:** request changes on Antigravity's latest demo seed completion pass. TypeScript and focused tests pass, but Hermes browser smoke did not prove final completion. The app stayed responsive early, reached at least `Writing hands locally... 7,000 / 10,716`, then a browser command timed out after 30 seconds, matching the prior late-seed freeze pattern.

**Root-cause thesis:** reducing chunks from 500 to 200 helped UI progress but likely increased expensive repeated work. `seedDemoDataset()` currently calls `importHands(chunk)` roughly 54 times; `importHands()` runs `aggregateVillainStats(newHands)` after every chunk. This repeatedly reads/writes villain rows and gets slower as IndexedDB grows. The next fix should avoid re-aggregating villains on every synthetic demo chunk.

---

## Active file ownership lanes

### Lane A — Hermes: demo seed completion blocker

**Owner:** Hermes
**Reviewer:** Antigravity or Claude Code after handoff
**Allowed files:**
- `src/data/store.ts`
- `src/data/demoDataset.ts`
- `src/data/__tests__/demoSeedProgress.test.ts`
- `src/data/__tests__/demoDataset.test.ts` if the demo semantics change
- `docs/agents/AGENT_HANDOFF.md`

**Do not touch:** pricing/demo page copy, career cards, broad visual polish, parser/range/scenario logic.

**Acceptance criteria:**
1. Clean/no-demo IndexedDB browser smoke completes the full `10,716` hand seed.
2. Final success message appears: `Loaded 10,716 synthetic hands across 250 tournaments with varied depths.`
3. Browser remains responsive after completion; a console evaluation succeeds after the final chunk.
4. Browser console has no warning flood and no app-level errors.
5. `npx tsc -b --pretty false` passes.
6. Focused tests pass:
   - `npm test -- --run src/data/__tests__/demoSeedProgress.test.ts src/data/__tests__/demoDataset.test.ts src/__tests__/App.test.tsx`
7. `git diff --check` passes on touched files.

**Suggested implementation approach:**
- Preserve the default behavior of `importHands()` for normal user imports.
- Add a narrow option such as `importHands(hands, { aggregateVillains?: boolean })`, defaulting to `true`.
- In `seedDemoDataset()`, import demo chunks with villain aggregation disabled.
- After all demo chunks are written, run a single `aggregateVillainStats(dataset.handsData)` pass or otherwise defer/skip demo villain aggregation only if the product explicitly accepts it.
- Tighten the already-loaded check to require both `existingDemoHands >= DEMO_TARGET_HAND_COUNT` and `existingDemoTournaments >= DEMO_TOURNAMENT_COUNT`, not merely `existingDemoHands > 0`.
- Keep demo warning-spam fix, but separately track the semantic debt that all generated hero decisions are now `RFI` despite some `call` / `BB_FOLD_SUITED` / `COLD_CALL` labels.

### Lane B — Google Antigravity: non-overlapping UI/copy review

**Owner:** Google Antigravity
**Reviewer:** Hermes
**Allowed files:**
- `src/pages/PricingPage.tsx`
- `src/components/career/CareerCoachCard.tsx`
- `src/pages/LeaksPage.tsx`
- `src/pages/SessionsPage.tsx`
- `docs/agents/AGENT_HANDOFF.md`

**Blocked while Hermes owns Lane A:**
- `src/data/store.ts`
- `src/data/demoDataset.ts`
- `src/data/__tests__/demoSeedProgress.test.ts`
- `src/components/shared/DemoDataButton.tsx`
- `src/components/layout/Layout.tsx`

**Task:** run a user-facing copy-only audit for the private/local generic posture. Do not change parser, range, scenario, financial math, demo seeding, or data-store behavior.

**Acceptance criteria:**
1. No visible Reg Life affiliation claim.
2. No payment/pricing/public-funnel CTA.
3. Export/share language remains private-review-only.
4. Any remaining `Game Plan`, `D#`, or dossier strings are classified as internal-only, visible UI, or docs-only.
5. Run `npx tsc -b --pretty false` for source copy changes; run `npm run docs:check` if docs change.

### Lane C — Claude Code/user: parser/import confidence, not demo seed UI

**Owner:** User's Claude Code session
**Reviewer:** Hermes when handed off
**Recommended non-overlap files:**
- `src/parser/**`
- `src/parser/__tests__/**`
- `docs/product/PARSER_HEALTH.md`
- new fixture/audit docs under `docs/reports/` or `docs/plans/`

**Task:** continue the highest-leverage reliability lane: parser/import confidence and evidence. Avoid the demo seed files owned by Hermes and the copy/UI files owned by Antigravity.

**Acceptance criteria:**
1. Parser changes include fixtures/regression tests.
2. Fixture sweep still passes.
3. Any new import warnings are surfaced as data-confidence signals, not silent failures.
4. Handoff names exact files and verification.

---

## Immediate prompts

### Prompt for Antigravity

```text
Read AGENTS.md, docs/agents/TWO_AGENT_BOARD.md, docs/agents/SPRINT_DECISION_GATE.md, docs/agents/AGENT_HANDOFF.md, and docs/plans/2026-05-12-parallel-reliability-next-steps.md.

Hermes owns the demo seed completion blocker. Do not edit src/data/store.ts, src/data/demoDataset.ts, src/data/__tests__/demoSeedProgress.test.ts, src/components/shared/DemoDataButton.tsx, or src/components/layout/Layout.tsx.

Your task is a non-overlapping user-facing copy review only. Inspect:
- src/pages/PricingPage.tsx
- src/components/career/CareerCoachCard.tsx
- src/pages/LeaksPage.tsx
- src/pages/SessionsPage.tsx

Fix only visible private/local posture issues: Reg Life affiliation claims, payment/pricing/public funnel language, public sharing language, or visible Game Plan/D#/dossier labels. Do not change parser/range/scenario/math/data-store behavior.

Run npx tsc -b --pretty false if source changes. Run npm run docs:check if docs change. Update docs/agents/AGENT_HANDOFF.md with exact files, verification, risks, and ask Hermes to review.
```

### Prompt for Claude Code

```text
Read AGENTS.md and docs/plans/2026-05-12-parallel-reliability-next-steps.md.

Avoid files currently owned by Hermes and Antigravity:
- src/data/store.ts
- src/data/demoDataset.ts
- src/data/__tests__/demoSeedProgress.test.ts
- src/components/shared/DemoDataButton.tsx
- src/components/layout/Layout.tsx
- src/pages/PricingPage.tsx
- src/components/career/CareerCoachCard.tsx
- src/pages/LeaksPage.tsx
- src/pages/SessionsPage.tsx

Recommended lane: parser/import confidence. Work in src/parser/**, src/parser/__tests__/**, and docs/product/PARSER_HEALTH.md or docs/reports/**. Add or improve fixture/regression coverage; do not broaden into pricing/public-sharing/platform expansion.

Before stopping, update docs/agents/AGENT_HANDOFF.md with files touched, verification, risks, and explicit review request.
```

---

## Known review findings to carry forward

- Latest focused checks passed: `npx tsc -b --pretty false`; `npm test -- --run src/data/__tests__/demoSeedProgress.test.ts src/data/__tests__/demoDataset.test.ts src/__tests__/App.test.tsx`; scoped `git diff --check`.
- Generated dataset count is `10,716` hands and `250` summaries.
- Demo scenario generation is now warning-quiet but semantically thin: all decisions are `RFI`, while some actions/deviation labels still imply non-RFI contexts.
- Browser smoke did not validate final completion in Hermes's clean run; it timed out late after reaching at least `7,000 / 10,716`.
