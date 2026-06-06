# IP-Safe Demo Repositioning Implementation Plan

> **For Hermes:** Use this as the cross-agent scope. Antigravity should implement one task at a time and update `docs/agents/AGENT_HANDOFF.md`; Hermes should review each diff skeptically before the next task.

**Goal:** make the app safe to demo as a private/local generic poker hand-history analyzer before user validation, without changing parser/range/leak/math behavior.

**Architecture:** This is a copy/posture sprint, not a logic sprint. The implementation should neutralize user-facing third-party curriculum/payment/public-sharing language while preserving current behavior and tests. Internal comments/source citations can be audited later unless they surface in UI/demo output.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite, Vitest.

---

## Gate constraints

Read first:

- `docs/agents/SPRINT_DECISION_GATE.md`
- `docs/agents/PARTNERSHIP_STATUS.md`
- `docs/agents/TWO_AGENT_BOARD.md`
- `AGENTS.md`

Do not:

- alter parser/scenario/range/leak/financial logic,
- add pricing/payment/funnel CTAs,
- claim third-party curriculum affiliation,
- create public/shareable artifact flows,
- broaden platform support.

## Task 1: Neutralize pricing/pilot page posture

**Owner:** Antigravity implementer
**Reviewer:** Hermes

**Objective:** remove user-facing third-party curriculum and payment/funnel framing from the pricing/pilot page so it becomes private validation/demo posture only.

**Files:**

- Modify: `src/pages/PricingPage.tsx`
- Update handoff: `docs/agents/AGENT_HANDOFF.md`

**Steps:**

1. Inspect the current page for third-party curriculum, pilot purchase, charge/payment, public launch, founding-user funnel, and shareable-report language.
2. Replace with private/local validation language.
3. Keep existing route/component structure intact unless copy requires minor layout text changes.
4. Do not remove the route unless explicitly asked.
5. Run `npx tsc -b --pretty false` if practical.
6. Update `docs/agents/AGENT_HANDOFF.md` and ask Hermes to review remaining IP/funnel risk.

**Acceptance criteria:**

- No user-facing copy says third-party curriculum, training-community player/student, private validation pilot, or third-party curriculum companion.
- No user-facing copy asks the user to pay, buy, subscribe, join a paid pilot, or use payment links.
- The page is framed as private validation/demo preparation, not public SaaS launch.
- The diff is copy/posture-only.

## Task 2: Neutralize demo button and demo dataset labels

**Owner:** Antigravity implementer
**Reviewer:** Hermes

**Objective:** ensure demo-loading labels do not imply public sharing, paid pilot CTAs, or third-party-curriculum-specific demo data.

**Files:**

- Modify: `src/components/shared/DemoDataButton.tsx`
- Modify: `src/data/demoDataset.ts`
- Update handoff: `docs/agents/AGENT_HANDOFF.md`

**Steps:**

1. Keep the demo loader behavior intact; only neutralize visible button/status copy if needed.
2. Replace demo tournament names like `Demo third-party curriculum Sprint` with generic labels.
3. Keep demo behavior intact.
4. Run `npx tsc -b --pretty false` if practical.
5. Update `docs/agents/AGENT_HANDOFF.md` and ask Hermes to review for remaining public/share/payment wording.

**Acceptance criteria:**

- Demo mode does not mention third-party curriculum.
- Demo mode does not direct users toward payment/pro/pilot purchase.
- Export/share wording is private-review oriented.
- No parser/range/math source files changed.

## Task 3: Neutralize obvious user-facing Game Plan phrasing

**Owner:** Antigravity implementer
**Reviewer:** Hermes

**Objective:** remove obvious user-facing `Game Plan` wording where it reads like a branded/curriculum claim, while preserving internal strategy behavior.

**Files:**

- Start with: `src/pages/SessionsPage.tsx`
- Search changed UI paths for: `third-party curriculum`, `Game Plan`, `D#`, `Dossiê`, `Dossie`, `luischiavo`
- Update handoff: `docs/agents/AGENT_HANDOFF.md`

**Steps:**

1. Change visible phrases such as `maintained the Game Plan` to neutral phrases like `maintained your baseline strategy`.
2. Do not rename internal strategy profile constants/types unless Hermes creates a separate logic-safe refactor plan.
3. Run `npx tsc -b --pretty false` if practical.
4. Update handoff.

**Acceptance criteria:**

- Obvious user-facing branded/curriculum wording is neutralized.
- No behavior-changing internal renames are included.
- Hermes can still separately audit internal citations later.

## Task 4: Hermes review and risk search

**Owner:** Hermes
**Reviewer:** Antigravity reverse-review for implementability if needed

**Objective:** verify Antigravity's copy changes are safe and scoped.

**Commands:**

```bash
git status --short
git diff --stat
npx tsc -b --pretty false
npm run docs:check
```

Also search `src` for risky wording:

```text
third-party curriculum|GamePlan|Game Plan|D#|Dossiê|Dossie|luischiavo|payment|pricing|pilot|public|shareable
```

**Acceptance criteria:**

- Any remaining risky terms are categorized as user-facing, internal comment/source citation, or unrelated existing state.
- User-facing risky terms are either fixed or handed back to Antigravity with exact file/line prompts.
- Handoff log records verification and remaining risk.
