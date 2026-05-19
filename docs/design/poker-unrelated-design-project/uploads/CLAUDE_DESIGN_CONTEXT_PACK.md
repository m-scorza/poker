# Claude Design Context Pack — Poker Analyzer Redesign

Use this instead of pasting the whole repo into Claude Design.

## How to use

Start with Prompt 1 only. Do not paste every prompt at once.

After Claude Design returns options, pick one direction. Then use Prompt 2. After that, use Prompt 3 for implementation handoff.

This staged approach saves usage because Claude Design does not need the full repo until there is a chosen direction.

---

# Prompt 1 — Three dashboard visual directions

```text
You are designing a professional product UI for a private/local poker hand-history analyzer.

Important: do not redesign the whole app. Create one self-contained HTML design artifact with three visual directions for the main Dashboard screen. The artifact should have tabs or sections to compare the three directions side by side.

Product context:
- The app imports local poker hand histories and tournament summaries.
- It helps tournament players identify leaks, review hands, and understand career/session performance.
- Current posture is private/local generic poker analyzer.
- Do not imply Reg Life affiliation, public distribution, pricing, payment, or shareable/public study-card virality.
- User-facing copy should be English, calm, and validation-safe.
- Raw chips won/lost should not be the primary performance metric. Prefer bb deltas, bb/100, ROI/ABI/ITM where relevant, and always include sample/confidence context.

Current problem:
- The app currently feels like an agent-built prototype: neon green, glassmorphism, too many equal cards, noisy dashboard hierarchy, too much terminal/HUD energy.
- It needs to feel like a serious private performance terminal for tournament players.

Target personality:
- precise
- calm
- analytical
- credible
- private
- premium but restrained
- high-signal

Design references to transform, not copy:
- Linear: dark-mode-native precision, quiet surfaces, clear hierarchy.
- Kraken: financial/statistical trust and disciplined metric presentation.
- Superhuman: premium confidence and strong copy hierarchy.
- Sentry: data-dense developer-tool discipline, but avoid loudness.
- PokerTracker/HM3/SharkScope: functional inspiration only for filters/reports/hand review, not visual style.

Create three directions:
1. Conservative cleanup — close to current dark app but calmer and more professional.
2. Strong-fit "Tournament Lab" — dark neutral analytics cockpit, likely best direction.
3. Divergent premium analyst notebook — lighter or hybrid report-like interface, less HUD-like.

Dashboard content to include:
- Page title and scope selector: Full database / session view.
- Main verdict card: readiness/confidence/top blocker.
- Next best study block.
- Leak priority queue with severity, sample, confidence, and bb impact.
- Trend chart placeholder.
- Data confidence/import status module.
- A few core KPIs only; do not make a wall of stat cards.

Design constraints:
- Use real hierarchy, not decorative filler.
- Keep poker motifs restrained.
- Avoid casino visuals, aggressive neon, rainbow gradients, generic SaaS fluff, and fake testimonials.
- Include empty/loading/error-state treatment if space allows.
- Include a small token table for colors/type/radius/spacing for each direction.

Output:
- One polished self-contained HTML artifact.
- It should be suitable for reviewing visually and choosing a direction.
- Do not produce production React code yet.
```

---

# Prompt 2 — Expand chosen direction into core screen system

Use only after choosing a direction from Prompt 1.

```text
Continue from the chosen direction: [PASTE CHOSEN DIRECTION NAME].

Now expand it into a compact product design system for the poker analyzer.

Create one self-contained HTML artifact showing:
1. App shell / sidebar / top controls
2. Dashboard screen
3. Hands table screen with filters
4. Leak Analyzer screen with ranked queue + detail panel
5. Career/session screen
6. Demo/import progress state

Product rules:
- Private/local generic poker analyzer.
- No Reg Life branding/affiliation claims.
- No pricing/payment/funnel/public-sharing language.
- Poker visuals should be restrained.
- Raw chips should not be primary for hand-level performance. Use bb deltas/bb impact and confidence context.
- UI copy should be calm, English, and credible.

Component system to show:
- colors/tokens
- typography scale
- card variants
- metric card
- table row states
- filters/chips/selects
- buttons
- severity/confidence badges
- loading/import overlay
- empty state
- warning/error state

Design goal:
The design should feel like a serious tournament performance terminal, not a casino HUD and not a generic admin template.

Output:
- One self-contained HTML prototype with navigation or in-page tabs for the screens.
- Include a design-token/spec section at the end.
- Do not generate production code yet.
```

---

# Prompt 3 — Implementation handoff for Antigravity/Hermes

Use only after Prompt 2 produces a direction you like.

```text
Create an implementation handoff for React/Tailwind agents.

Input: Use the selected design system from the current prototype.

Output a concise but complete implementation spec with:
1. Design tokens
   - colors
   - typography
   - spacing
   - radii
   - borders
   - shadows/elevation
   - motion rules
2. Component mapping
   - current components likely affected:
     - src/index.css
     - src/components/layout/Sidebar.tsx
     - src/components/layout/Layout.tsx
     - src/components/shared/StatCard.tsx
     - src/components/shared/DemoDataButton.tsx
     - src/components/hands/HandsFilters.tsx
     - src/components/hands/HandsTable.tsx
     - src/pages/DashboardPage.tsx
     - src/pages/HandsPage.tsx
     - src/pages/LeaksPage.tsx
     - src/pages/CareerPage.tsx
     - src/pages/SessionsPage.tsx
3. Step-by-step implementation phases
   - Phase A: tokens/global CSS only
   - Phase B: shell/navigation
   - Phase C: shared components
   - Phase D: Dashboard
   - Phase E: Hands table/filters
   - Phase F: Leaks/Career polish
4. Acceptance criteria
5. Things not to change
   - parser logic
   - scenario/range/leak math unless explicitly requested
   - product posture/gate docs unless updating factual status
   - pricing/funnel/public-sharing language

Keep it implementation-ready but compact enough to paste into a coding agent.
```

---

# Minimal screen source pack, if Claude Design asks for current UI context

Do not paste whole files unless needed. Paste this summary first:

```text
Current app source summary:
- React/Vite/Tailwind app with CSS tokens in src/index.css.
- Current theme uses OLED black, glassmorphism, neon green accent, neon red danger, Inter + JetBrains Mono.
- Sidebar routes: Dashboard, Career, Demo, Hands, Statistics, Ranges, Leaks, Sessions, Villains, The Arena.
- Dashboard currently includes Career Snapshot, session selector, no-data/demo loader, ValueSnapshotCard, StudyPlanCard, many StatCards, TrendChart, leak cards, position heatmap, financial/tournament modules.
- Hands page has import toggle, reset DB, filter controls, virtualized table, hand replay modal.
- The product is powerful but too visually noisy and prototype-like.
- Need a calmer professional design system and better hierarchy.
```

Only if Claude Design needs exact code, paste one screen at a time, not the full repo:
- `src/index.css`
- `src/components/layout/Sidebar.tsx`
- `src/pages/DashboardPage.tsx` lines around the JSX return
- `src/components/hands/HandsTable.tsx`
- `src/components/hands/HandsFilters.tsx`

---

# Tiny follow-up prompts for efficient iteration

Use these instead of resending the whole brief.

## Make it less flashy
```text
Keep the selected layout, but reduce visual flash: fewer glows, less saturation, fewer icons, calmer semantic colors, more reliance on typography/spacing/surface hierarchy.
```

## Make it more premium
```text
Keep the selected structure, but make it feel more premium: tighter typography, better whitespace, fewer borders, subtler cards, stronger primary action hierarchy, less generic admin-template styling.
```

## Make the table better
```text
Focus only on the Hands table. Improve density, row scanning, filters, row state badges, numeric alignment, and review actions. Do not redesign the rest of the app.
```

## Make the dashboard clearer
```text
Focus only on the Dashboard. The top 5-second answer must be obvious: what is my current status, what is the top blocker, how confident is the sample, and what should I study next?
```

## Prepare for implementation
```text
Convert the current chosen design into a compact React/Tailwind implementation handoff. Include tokens, component mapping, phases, and acceptance criteria. Do not write full code.
```
