# Professional Redesign Brief — Poker Analyzer

Owner: Hermes
Created: 2026-05-11
Purpose: Give the user, Figma, Claude Design, Antigravity, and future agents a compact design direction for making the app feel professional without spending a whole AI session rediscovering the product.

## 1. Executive recommendation

Use Figma or Claude Design, but do not start by pasting the whole codebase or asking for a full-app redesign.

The product needs a coherent design system more than it needs isolated pretty screens. Start with a small, high-leverage design package:

1. Product shell + navigation
2. Dashboard / Career Snapshot
3. Hands table + filters
4. Leak Analyzer queue/detail
5. Private demo/import state

Design those as one system, then implement the system across the rest of the app.

## 2. Current UI diagnosis

The current app is directionally powerful but reads like an agent-built prototype rather than a premium product.

Observed issues from source/browser review:

- Theme copy says "Premium Dark Poker HUD" and uses neon green/glassmorphism. This creates casino/HUD energy instead of serious analytics trust.
- Color system is too loud: OLED black + neon green + neon red/pink + blue + glass effects. Professional analytics products usually use calmer surface steps, fewer accent colors, and more disciplined semantic color.
- Typography mixes data/mono emphasis aggressively. Many headings are uppercase or `font-data`, making the product feel terminal-like in too many places.
- Dashboard density is high but hierarchy is weak. Many cards/sections compete: Career Snapshot, Study Queue, Strategy Efficiency, Postflop Dominance, Financials, charts, heatmaps, alerts.
- Navigation has too many equal-weight destinations. The user cannot immediately tell which surfaces matter for the first validation demo.
- Some labels feel internal or marketing-y: "EV Platform", "Post-flop Dominance", "Competitor-inspired study queue", "LEAK EXPLORER", etc. The app should feel like a trusted private coach/tool, not a hype dashboard.
- Components have inconsistent polish: cards, tables, badges, controls, overlays, empty states, and chart panels do not yet feel like a single design language.
- The current dark theme relies on blur/glass and shadows; this can look modern in screenshots but often feels unprofessional when data-dense.

## 3. Target product posture

Private/local generic poker performance analyzer.

Not:
- casino/gambling visual language
- Reg Life-branded product
- public sales funnel
- crypto-neon dashboard clone
- PokerTracker/HM3 clone

Should feel like:
- a serious tournament performance terminal
- private review workspace
- coaching-grade diagnostics
- premium but restrained
- trustworthy for imported hand histories
- practical enough for long study sessions

Core adjectives:
- precise
- calm
- analytical
- credible
- high-signal
- private
- fast
- focused

## 4. Design direction

Recommended visual blend:

- Linear: dark-mode-native precision, quiet surfaces, strict hierarchy, restrained accent use.
- Kraken: financial/statistical trust, clean metrics, disciplined number presentation.
- Superhuman: premium confidence, less clutter, strong copy hierarchy.
- Sentry: data-dense developer-tool learnings, but avoid its louder purple/green personality.
- PokerTracker / HM3 / SharkScope: functional inspiration only — reports, filters, sessions, hand lists, tournament/player stats — not visual styling.

Recommended original direction name:

"Tournament Lab"

Design system posture:
- dark neutral canvas, not pure black
- one primary accent, probably muted emerald or violet — not neon green
- semantic colors are muted and mostly used for state: positive, warning, critical, neutral
- typography prioritizes readable sans; mono only for IDs, hand keys, amounts, and compact numeric fields
- cards use surface/luminance hierarchy, not heavy glassmorphism
- tables feel like trading/BI tools: compact, scannable, calm
- poker suits/cards are secondary detail, not the brand foundation

## 5. Proposed design tokens

These are starting points for Figma/Claude Design, not final production values.

### Color

Backgrounds:
- page: #08090A or #0A0B0D
- sidebar: #0D0F12
- panel: #111318
- panel elevated: #161A20
- panel hover: #1B2028
- input: #0F1217

Borders:
- subtle: rgba(255,255,255,0.06)
- standard: rgba(255,255,255,0.10)
- strong: rgba(255,255,255,0.16)

Text:
- primary: #F5F7FA
- secondary: #B8C0CC
- muted: #7B8492
- faint: #4F5865

Accent option A — muted emerald:
- accent: #39D98A
- accent soft: rgba(57,217,138,0.12)
- accent border: rgba(57,217,138,0.28)

Accent option B — analytical violet:
- accent: #8B7CFF
- accent soft: rgba(139,124,255,0.13)
- accent border: rgba(139,124,255,0.28)

Semantic:
- positive: #4ADE80
- negative: #F87171
- warning: #FBBF24
- info: #60A5FA
- critical bg: rgba(248,113,113,0.10)
- warning bg: rgba(251,191,36,0.10)
- success bg: rgba(74,222,128,0.10)

Avoid:
- neon green as broad UI chrome
- pure white text everywhere
- saturated red/pink for routine warnings
- multiple accent colors in the same card

### Typography

Recommended stack:
- primary: Inter or Geist
- mono: JetBrains Mono or Geist Mono

Rules:
- headings use sans, not mono, except tiny technical labels
- numeric stats can use mono or tabular numbers
- body text should be normal case; uppercase reserved for overline labels/badges only
- reduce `font-black` usage; prefer 500/600 for premium feel

Suggested scale:
- page title: 28–32px, 600, -0.02em
- section title: 16–18px, 600
- card title: 13–15px, 600
- body: 14px, 400/500
- caption: 12px, 500
- metric value: 24–36px, 600, tabular numbers
- table cell: 12–13px

### Radius

- small control: 6px
- card/control: 10px
- featured panel: 14px
- pill: 999px only for chips/badges

### Density

- default desktop app shell: 24px page padding
- card padding: 16–20px
- dashboard grid gap: 12–16px
- table row height: 40–48px
- compact filter chips: 32–36px high

## 6. Information architecture recommendation

Do not treat all routes equally.

Primary validation demo nav:
1. Dashboard
2. Hands
3. Leaks
4. Career
5. Sessions

Secondary / advanced:
- Ranges
- Villains
- Arena
- Demo
- Settings/Profile

Possible nav cleanup:
- Rename "Statistics" to "Reports" or merge into Dashboard/Career until it has a distinct purpose.
- Rename "The Arena" to "Drills" if it stays visible.
- Move strategy profile selector out of the sidebar footer and into a settings/control area if it is not central to every page.
- Remove "v0.2.0 — EV Platform" from primary sidebar; it reads like internal/prototype copy.

## 7. Screen-level redesign direction

### Dashboard / Career Snapshot

Goal: answer "What should I fix next, and can I trust this sample?"

Hero layout:
- top row: product title + database/session scope + confidence badge
- primary panel: verdict, top blocker, readiness/confidence, next action
- right panel: trend/profit/volume summary
- below: prioritized study queue, not dozens of equal stat cards

Reduce stat card wall. Put raw VPIP/PFR/etc. into a secondary "Diagnostics" area.

Top 5 dashboard primitives:
1. Verdict card
2. Confidence/data quality card
3. Next best study block
4. Trend chart
5. Leak priority list

### Hands page

Goal: make 10k+ hands feel searchable, reviewable, and trustworthy.

Design priorities:
- table should be the hero, not a decorative panel
- filters should be compact and persistent
- hand rows need clear visual state: compliant/deviation/starred/reviewed
- row actions should be calm icon buttons, not noisy
- table typography should be tuned for scanning

Recommended columns:
- date/time
- hand
- position
- stack bb
- scenario
- action
- result bb
- compliance/deviation
- tags/actions

### Leak Analyzer

Goal: convert imported histories into a repair queue.

Design priorities:
- rank leaks by severity × confidence × sample × impact
- expose why it matters in one sentence
- show exact sample size and confidence
- route to filtered hand review
- avoid alarmist red everywhere; use severity bands calmly

### Career / Sessions

Goal: show tournament performance over time without over-claiming.

Design priorities:
- split financial metrics from hand-level behavior metrics
- show ABI, ROI, ITM, volume, drawdown only when sample is credible
- confidence indicator must be prominent
- raw chips should not be the main metric; use bb deltas and bb/100 where relevant

### Demo/import

Goal: prove local/private workflow and data confidence.

Design priorities:
- import progress must be visible and calm
- messages should be precise: checking, generating, writing, finalizing
- show final counts and confidence warnings
- no sales/prospect/public-sharing language

## 8. Competitive/reference research notes

Useful references found:

- Figma Community dashboards: https://www.figma.com/community/ui-kits/dashboards
  - Good source for reusable dashboard, chart, table, and UI-kit patterns.
  - Beware generic admin-template look.

- Figma data table kit: https://www.figma.com/community/file/1487078961388867385/ultimate-data-table-ui-kit-modern-responsive-figma-design
  - Useful specifically for Hands table/filter polish.

- PokerTracker screenshots: https://www.pokertracker.com/products/PT3/screenshots.php
  - Functional inspiration: general tab, hands tab, sessions tab, winnings, graphs, customizable fields.
  - Do not copy the old visual style.

- Holdem Manager 3: https://www.holdemmanager.com/
  - Functional inspiration: live play view, custom reports, situational views, visual filters, hand replay.
  - Key lesson: poker tools win by filtering/report power, not visual decoration.

- SharkScope: https://www.sharkscope.com/
  - Functional inspiration: ROI/profit/player/tournament metrics, leaderboards, tournament selector, public/private stats framing.
  - Do not copy public-search/commercial posture yet.

- SaaS dashboard examples: https://www.wearetenet.com/inspirations/saas-design-inspiration/saas-dashboard-design-examples
  - Useful summary of focused/actionable dashboard design: navigation, data visualization, KPIs, filters/search, reports, responsiveness.

- Data visualization dashboard examples: https://querio.ai/blogs/data-visualization-dashboard-examples
  - Strong principle: a dashboard is not a collection of charts; it should answer specific questions and drive action.

- Claude Design announcement: https://www.anthropic.com/news/claude-design-anthropic-labs
  - Claude Design can start from prompts, images, docs, codebases, and web captures; it can create prototypes, decks, HTML, and design-system-informed artifacts.

- Claude prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
  - Use explicit scope, concise context packs, and examples instead of dumping everything.

## 9. Figma approach

Use Figma if you want to actually design this with taste.

Recommended Figma file structure:

Page 1 — Brief
- target user
- product posture
- reference board
- non-goals

Page 2 — Design tokens
- colors
- typography
- spacing
- radii
- badges/status

Page 3 — Components
- app shell/sidebar
- page header
- card
- metric card
- table
- filter chip
- select/input
- button
- badge/severity pill
- progress overlay
- empty state

Page 4 — Core screens
- Dashboard
- Hands
- Leaks
- Career
- Demo/import

Page 5 — States
- empty database
- loading/importing
- partial confidence
- no leaks
- error/import warning

Do not start with 20 finished screens. Start with one excellent dashboard direction plus one data table direction.

## 10. Claude Design usage strategy

Do not paste the entire repository into Claude Design.

Use "context packs" instead:

1. Product brief pack — this file, or a shorter extracted version.
2. Screen pack — only the current source or screenshot for the screen being redesigned.
3. Design reference pack — 2–4 reference principles, not dozens of links.
4. Output constraint pack — exactly what Claude should return.

The best first Claude Design task is not "redesign my whole app." It is:

"Create three visual directions for the Dashboard screen using this brief. Return one HTML prototype with three tabs/options and a small design-token table. Do not implement production code."

Then after choosing a direction:

"Expand Direction B into Dashboard + Hands + Leak Analyzer component system."

Then after that:

"Create implementation handoff tokens/components for React/Tailwind."

## 11. Acceptance criteria for professional-enough redesign

A screen is ready for private validation when:

- A new user can identify the top action within 5 seconds.
- The most important metric has sample/confidence context.
- No card exists only because the data exists; every visible module answers a decision question.
- Tables are scannable at 10k rows.
- Semantic colors are consistent and not overused.
- Poker visual motifs are restrained.
- Copy is calm, English, private/local, and non-commercial.
- Empty/loading/error states look intentional.
- The same component rules appear across Dashboard, Hands, Leaks, Career, and Demo.

## 12. Recommended next step

Create a compact Claude Design/Figma input pack from this brief, then generate three Dashboard directions.

Suggested directions:

1. Conservative: Current app cleaned up — muted emerald, same IA, better hierarchy.
2. Strong-fit: Tournament Lab — dark neutral, precise cards, dashboard as decision cockpit.
3. Divergent: Light/private analyst notebook — white/cream surfaces, premium report-like feel.
