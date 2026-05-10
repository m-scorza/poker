# Codebase Review Stabilization and Productization Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Convert the current Poker Analyzer from a feature-rich prototype into a more trustworthy, demoable, test-backed paid MVP by fixing correctness risks first, then tightening the demo funnel and maintainability foundations.

**Architecture:** Execute in layered phases: parser/session correctness, evidence-backed UX, import/demo funnel, and then structural refactors. Keep each change small, covered by tests, and verified with the existing `npm run docs:update && npx tsc -b --pretty false && npm test && npm run build && npm run docs:check` gate.

**Tech Stack:** React 19, TypeScript strict, Vite 6, Vitest 3, Tailwind CSS 4, Zustand, Dexie 4, Recharts, Web Workers, Docker/nginx.

---

## Audit Snapshot

**Repo:** `/home/micro/projects/poker-analyzer`

**Branch:** `phase-6-consolidated-final`

**Approximate codebase size:**

| Area | Count |
|---|---:|
| `src/` files | 346 |
| TypeScript files | 72 / ~12.7k lines |
| TSX files | 28 / ~5.6k lines |
| Tests currently passing | 26 files / 385 tests |

**Largest risk files:**

| File | Approx lines | Risk |
|---|---:|---|
| `src/pages/HandsPage.tsx` | 763 | Import flow, filters, worker lifecycle, table, reset, replay all coupled |
| `src/parser/pokerstars.ts` | 563 | Large parser pipeline with silent per-block drops |
| `src/data/store.ts` | 514 | Dexie schema, import orchestration, settings, villain aggregation all coupled |
| `src/components/hands/HandReplay.tsx` | 478 | Large modal with accessibility/test risk |
| `src/pages/RangesPage.tsx` | 459 | Matrix selector correctness/performance risk |
| `src/analysis/leakDetector.ts` | 449 | Central scoring/leak logic needs stable tests for each metric |

**Current constraints:**

- Work in WSL repo: `/home/micro/projects/poker-analyzer`.
- Sync intentional changes to Windows copy: `/mnt/c/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh`.
- Raw hand-history chips are not a primary metric. Use BB deltas and BB/100 where possible; keep money ROI/profit only for tournament/career finance.
- Existing working tree is very dirty from prior feature work and copied fixture normalization. Do not use `git status` alone to infer current-task ownership.
- Docker commands should use `sg docker -c 'docker ...'` in this shell.

---

## Prioritized Execution Themes

1. **Correctness and trust first** — parser/session bugs can corrupt every premium UI surface.
2. **Evidence-backed product UX second** — leaks and career verdicts must show exactly why they matter.
3. **Import/demo funnel third** — prospects should get to value without guessing.
4. **Architecture cleanup fourth** — extract high-churn flows only after correctness is locked with tests.
5. **Performance/code splitting fifth** — reduce the current 1.67MB main bundle after the product path stabilizes.

---

## Phase 1 — Correctness Foundation

### Task 1: Fix GGPoker postflop `bets` parsing and collected winnings

**Objective:** Ensure GGPoker hands produce correct postflop action types and showdown winnings so c-bet, double-barrel, wonAmount, villain deltas, and BB metrics are trustworthy.

**Files:**
- Modify: `src/parser/ggpoker.ts`
- Modify/Test: `src/parser/__tests__/ggpoker.test.ts`
- Verify with: `src/analysis/scenarioDetector.ts`

**Current evidence:**

- `src/parser/ggpoker.ts:185` parses `bets` as `raise`.
- `src/analysis/scenarioDetector.ts:193` counts `cbetMade` only when hero flop action is `bet`.
- `src/parser/ggpoker.ts:219-229` fills `collectedAmounts`, but `src/parser/ggpoker.ts:287` returns `collectedAmounts: new Map()`.
- Therefore GGPoker showdown winnings can disappear before `buildHeroDecision` reads them.

**Step 1: Write failing tests**

Add tests in `src/parser/__tests__/ggpoker.test.ts`:

```ts
import { buildHeroDecision } from '../../analysis/scenarioDetector';
```

Assertions to add:

```ts
it('parses postflop bets as bet actions, not raises', () => {
  const hands = parseGGPokerFile(ggSample, 'scorza23');
  const villainBet = hands[0]!.actions.find(
    (a) => a.street === 'flop' && a.playerName === 'a81061d',
  );

  expect(villainBet?.actionType).toBe('bet');
  expect(villainBet?.amount).toBe(120);
});

it('returns collected amounts for showdown winners', () => {
  const hands = parseGGPokerFile(ggSample, 'scorza23');
  expect(hands[0]!.collectedAmounts.get('a81061d')).toBe(646);
  expect(hands[0]!.collectedAmounts.get('scorza23') ?? 0).toBe(0);

  const decision = buildHeroDecision(hands[0]!, 'scorza23');
  expect(decision?.wonAmount).toBe(0);
});
```

Add a small hero-cbet sample and assert:

```ts
const decision = buildHeroDecision(parsed, 'scorza23');
expect(decision?.cbetOpportunity).toBe(true);
expect(decision?.cbetMade).toBe(true);
```

**Step 2: Run tests to verify failure**

Run:

```bash
npx vitest run src/parser/__tests__/ggpoker.test.ts --isolate=false
```

Expected before implementation: at least the `bets`/`collectedAmounts` assertions fail.

**Step 3: Implement minimal fix**

In `src/parser/ggpoker.ts`:

```ts
else if (type === 'bets') actionType = 'bet';
```

And return the populated map:

```ts
collectedAmounts,
```

**Step 4: Verify targeted tests**

Run:

```bash
npx vitest run src/parser/__tests__/ggpoker.test.ts src/analysis/__tests__/scenarioDetector.test.ts --isolate=false
```

Expected: PASS.

**Step 5: Verify broader gate**

Run:

```bash
npx tsc -b --pretty false && npm test
```

Expected: PASS.

---

### Task 2: Make session finance include bounties consistently

**Objective:** Align Sessions with Stats/Career so bounty winnings affect tournament money metrics everywhere.

**Files:**
- Modify: `src/data/sessions.ts`
- Modify/Test: `src/data/__tests__/sessions.test.ts`

**Current evidence:**

- `src/data/sessions.ts` currently uses `t.prize ?? 0` for session prizes.
- `src/pages/StatsPage.tsx` and `src/pages/CareerPage.tsx` include `t.bounty ?? 0`.

**Step 1: Write failing test**

Add a test to `src/data/__tests__/sessions.test.ts` with one USD tournament:

```ts
const tournaments = new Map([
  ['T1', {
    id: 'T1', buyIn: 10, fee: 0, bounty: 25, prize: 0,
    finishPosition: 10, format: 'PKO', handsPlayed: 1, currency: 'USD',
  }],
]);
const sessions = groupIntoSessions(hands, decisions, tournaments);
expect(sessions[0]!.prizes).toBe(25);
expect(sessions[0]!.pnl).toBe(15);
expect(sessions[0]!.roi).toBe(150);
```

**Step 2: Run failure**

```bash
npx vitest run src/data/__tests__/sessions.test.ts --isolate=false
```

**Step 3: Implement minimal fix**

In `src/data/sessions.ts`, replace session prize accumulation with:

```ts
prizes += (t.prize ?? 0) + (t.bounty ?? 0);
```

Maintain existing `PLAY` / `TICKET` exclusion behavior.

**Step 4: Verify targeted tests**

```bash
npx vitest run src/data/__tests__/sessions.test.ts --isolate=false
```

---

### Task 3: Extract reusable tournament financial helpers

**Objective:** Prevent Stats, Career, Sessions, and Career Coach from drifting on buy-in, fee, bounty, prize, ROI, ITM, and non-cash currency semantics.

**Files:**
- Create: `src/analysis/financials.ts`
- Create/Test: `src/analysis/__tests__/financials.test.ts`
- Modify: `src/pages/StatsPage.tsx`
- Modify: `src/pages/CareerPage.tsx`
- Modify: `src/data/sessions.ts`
- Modify: `src/analysis/careerCoach.ts` only if helper adoption does not inflate scope.

**Rules:**

- USD/T$ cash tournaments count toward financial ROI.
- `PLAY` and `TICKET` rows are excluded from money ROI/profit.
- Revenue = `(prize ?? 0) + (bounty ?? 0)`.
- Cost = `(buyIn ?? 0) + (fee ?? 0)`.
- Net = revenue - cost.
- ITM/cash should count bounty-only cashes if product defines bounty as actual tracked cash.

**Steps:**

1. Write helper tests for USD, bounty-only, PLAY, TICKET, and missing values.
2. Implement `isCashTournamentCurrency`, `getTournamentCost`, `getTournamentRevenue`, `getTournamentNet`, `getTournamentRoi`.
3. Replace duplicated page-level financial math one page at a time.
4. Run targeted tests after each replacement.

---

## Phase 2 — Evidence-Backed Leak UX

### Task 4: Add URL-driven Hands filters

**Objective:** Make leak cards and coaching CTAs open the exact evidence set instead of a generic Hands page.

**Files:**
- Modify: `src/pages/HandsPage.tsx`
- Modify: `src/pages/LeaksPage.tsx`
- Optional Create: `src/features/hands/handsFilterParams.ts`

**Behavior:**

Support query params:

```text
/hands?compliance=deviation
/hands?deviation=LIMPED
/hands?position=SB
/hands?scenario=RFI
/hands?search=260356646368
```

**Steps:**

1. Extract parsing of current filter state from `window.location.search` / `useSearchParams`.
2. Initialize HandsPage filters from query params.
3. Update LeaksPage `REVIEW HANDS` links to include likely filters.
4. Add tests if React test tooling exists; otherwise verify with browser smoke.

---

### Task 5: Show evidence previews inside leak cards

**Objective:** Each top leak should show 3-5 representative hands with position, hand key, action, deviation, and BB delta.

**Files:**
- Modify: `src/pages/LeaksPage.tsx`
- Optional Create: `src/analysis/leakEvidence.ts`
- Test: `src/analysis/__tests__/leakEvidence.test.ts`

**Behavior:**

- For `RANGE_COMPLIANCE`, show non-compliant decisions.
- For `LIMPING`, show `deviationType === 'LIMPED' || 'LIMP_BEHIND' || 'SB_LIMPED'`.
- For c-bet leaks, show missed c-bet opportunities.
- Use `hand.bigBlind` to convert `decision.netProfit` to BB delta.
- If blind data missing, show no BB delta rather than raw chips as primary.

---

## Phase 3 — Demo and Revenue Funnel

### Task 6: Add persistent Demo Mode walkthrough

**Objective:** After loading demo data, guide a prospect through the paid-MVP value path.

**Files:**
- Create: `src/components/demo/DemoModeBanner.tsx`
- Modify: `src/components/shared/DemoDataButton.tsx`
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/CareerPage.tsx`
- Modify: `src/pages/LeaksPage.tsx`
- Modify: `src/pages/PricingPage.tsx`

**Checklist:**

1. Career Coach verdict.
2. Top blocker.
3. Leak evidence.
4. Review exact hands.
5. Export/share report.
6. Pilot/Pro CTA.

---

### Task 7: Add transparent Career Coach methodology panel

**Objective:** Make score/recommendations feel explainable and coach-grade rather than black-box.

**Files:**
- Modify: `src/analysis/careerCoach.ts`
- Modify: `src/components/career/CareerCoachCard.tsx`
- Modify/Test: `src/analysis/__tests__/careerCoach.test.ts`

**Behavior:**

Expose the components of the readiness score:

- ROI contribution.
- Recent ROI contribution.
- ITM contribution.
- Sample-size penalty.
- Drawdown penalty.
- Compliance/leak penalty.
- Confidence label and explanation.

---

### Task 8: Create one obvious paid conversion target

**Objective:** Convert Pricing from a narrative page into a usable founding-pilot lead capture / payment instruction page.

**Files:**
- Modify: `src/pages/PricingPage.tsx`
- Optional Create: `src/components/pricing/FoundingPilotCard.tsx`

**Behavior options:**

- Copy WhatsApp/Discord pilot message.
- Copy Pix/payment instruction placeholder.
- Save a local founding-pilot lead request object in IndexedDB/localStorage if no backend exists.
- Clear difference between Demo, Player Pro, and Coach Seat.

---

## Phase 4 — Import Trust and Diagnostics

### Task 9: Add import diagnostics summary

**Objective:** Show exactly what the importer understood, skipped, and stored.

**Files:**
- Modify: `src/pages/HandsPage.tsx`
- Modify: `src/parser/worker.ts`
- Optional Create: `src/features/import/importDiagnostics.ts`
- Test: worker/client diagnostics if extracted.

**Diagnostics:**

- Files selected.
- Files parsed.
- Hands imported.
- Duplicate hands skipped.
- Tournament summaries parsed/updated.
- Unsupported files.
- Failed files with reason.
- Detected site.
- Hero name.
- Next CTA: Career Coach / Leak Inbox.

---

## Phase 5 — Maintainability and Performance

### Task 10: Extract HandsPage modules

**Objective:** Reduce `HandsPage.tsx` coupling before future feature work.

**Files:**
- Create: `src/features/hands/useHandsArchive.ts`
- Create: `src/features/hands/HandsFilters.tsx`
- Create: `src/features/hands/HandsTable.tsx`
- Create: `src/features/import/HandImportPanel.tsx`
- Modify: `src/pages/HandsPage.tsx`

**Constraint:**

Do not change behavior in this task. Refactor only after Tasks 1-9 have added enough correctness and workflow coverage.

---

### Task 11: Add route-level code splitting

**Objective:** Reduce the current large Vite main chunk warning and improve perceived startup.

**Files:**
- Modify: `src/App.tsx`
- Optional Modify: `vite.config.ts`

**Behavior:**

Use `React.lazy` and `Suspense` for route pages. Defer heavy PDF/export/replay dependencies where possible.

---

## Final Verification Gate

After each implementation task, run targeted tests first. After every phase, run:

```bash
cd /home/micro/projects/poker-analyzer
npm run docs:update && npx tsc -b --pretty false && npm test && npm run build && npm run docs:check
sg docker -c 'docker build -t poker-analyzer .'
sg docker -c 'docker rm -f poker-analyzer-demo >/dev/null 2>&1 || true; docker run -d --name poker-analyzer-demo -p 8080:80 poker-analyzer'
```

Then browser-smoke the affected routes at:

```text
http://localhost:8080
```

Sync intentional files to:

```text
/mnt/c/Users/MICRO/Downloads/poker-claude-integrate-knowledge-base-vvCeh
```
