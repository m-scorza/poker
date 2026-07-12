---
status: open
date: 2026-07-03
related:
  - docs/reports/archive/2026-07-01-abyss-audit.md
  - docs/design/DESIGN.md
  - docs/design/DECISIONS.md
  - docs/design/DESIGN_SYSTEM_PORT_PLAN.md
  - docs/product/ROADMAP.md
---

# Post-Fable X-Ray — Main Tree Product/Beauty Review (2026-07-03)

> Fresh read of `origin/main` after the salvage/Act III landings. Goal: see what
> landed, verify the gate, and choose the next polish plan for making the app feel
> like a premium private poker study instrument rather than a stitched-together
> agent prototype.

## 0. Baseline checked

- Worktree: `C:\Users\MICRO\OneDrive\Documentos\GitHub\poker-xray-pretty-20260703`
- Branch: `hermes/xray-pretty-20260703`
- Base: `origin/main` @ `388eac6` (`fix(abyss): Wave 1 correctness quickies — F3-F6, F20, F22, F23, F27`)
- Demo data loaded in browser for visual review.
- Baseline browser title on `origin/main` still said **"Poker Analyzer HUD"**;
  this branch's first polish slice changes it to **"Poker Analyzer"**.

Verification run on the fresh worktree:

| Check | Result |
|---|---:|
| `npm run docs:check` | pass |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm test` | **77 files / 851 tests passed** |
| `npm run build` | pass |

Largest production chunks from the verified build:

| Chunk | Size |
|---|---:|
| `SessionsPage` | 453.1 KB |
| `CareerPage` | 433.5 KB |
| app shell `index` | 367.1 KB |
| `HandsPage` | 205.7 KB |
| `html2canvas` | 194.9 KB |
| CSS bundle | 136.7 KB |
| framer-motion proxy chunk | 118.4 KB |
| `DashboardPage` | 86.8 KB |

## 1. What Fable blessed us with

Main is materially ahead of the old Hermes snapshot:

1. **The gate is green again.** The broken dirty-tree state from the Abyss audit
   is gone. Wave 1 landed real fixes: type cycle, STATUS drift, `@eslint/js`,
   dropzone a11y, shared confirm dialog, fake Arena pot removal, OOP probe/donk
   labels, and colon-in-player-name parser handling.
2. **The coach loop is real, not just copy.** `/` is the Coach's Note; Arena has
   SRS from real misplays; the routed Study Queue/SpotPacket path exists and is
   tested.
3. **Refusal-as-UI is now productized.** Ungraded spots show up as review queues
   instead of fake red grades.
4. **Import provenance/data health landed.** Hands upload exposes source-aware
   data-health posture and Leaks can warn when analysis is directional.
5. **SpotPacket boundary landed.** Hand Replay can export/review solver-neutral
   packets with explicit "no solver EV / no answer bucket" caveats.
6. **Command Desk aesthetics exist.** Dashboard has a real visual direction:
   quiet dark chassis, monument number, wire tape, ring telemetry, chart craft,
   and a positional felt visualization.

Short version: the hard trust substrate is stronger than it has ever been, and
there is now enough design-system work in the tree to port instead of inventing
from scratch.

## 2. Current product feel

### The good

- The app now feels like a **private study cockpit**, especially on Dashboard.
- The sidebar/nav is much calmer than the old neon HUD shell.
- Data honesty is visible: evidence badges, not-graded queues, source caveats,
  and sample counts are surfaced in the UI instead of buried in docs.
- The Hands table is finally the hero on the Hands page; it scans well with real
  demo volume.
- Arena's top-level concept is clean: "Turn theory into instinct" + four drill
  cards is easy to understand.

### The unresolved vibe mismatch

The app currently contains **three visual generations at once**:

1. **Command Desk generation** — Dashboard/chassis: premium, dark, instrumented.
2. **Covenant/coach generation** — Coach's Note: simple, honest, but visually
   much plainer than the Dashboard.
3. **Legacy neon/prototype generation** — Hands, Leaks, Career, SpotPacket,
   upload, and several shared widgets still use raw Tailwind palette colors,
   heavy uppercase, `font-black`, `font-data`, violet/sky/cyan/emerald/rose
   badges, and bright outlined buttons.

Measured signs of this mismatch:

- `297` raw Tailwind semantic/accent palette hits across `src/` (`violet`, `sky`,
  `cyan`, `emerald`, `rose`, `red`, `amber`, etc.).
- `335` old/raw color-token or palette-style hits across `src/` when including
  `text-white`, `bg-black`, `font-data`, and old token patterns.
- `StudyPlanCard` and `ValueSnapshotCard` remain present but effectively orphaned
  from routed product UI; the routed Study Queue intentionally did not port the
  old StudyPlanCard CTA.
- Major god-files grew after the salvaged features: `spotPacket.ts` 1288 lines,
  `ArenaPage.tsx` 1092, `HandsUpload.tsx` 949, `store.ts` 932,
  `HandReplay.tsx` 723, `CareerPage.tsx` 702.

## 3. Screen-by-screen visual x-ray

### A. Coach's Note (`/`)

**Verdict:** the correct front door, but not yet the prettiest front door.

What works:
- It answers one question: what should I study now?
- Focus/receipts/drill is the right product skeleton.
- Empty and loaded states are honest.

Problems:
- It looks weaker than the demoted Dashboard, so the app's front door is not the
  visual showpiece.
- Typography still leans `font-black` and generic card styling instead of the
  Command Desk kicker/monument system.
- The focus card needs a stronger "single object of study" composition: severity,
  estimated bb cost, confidence, and receipts should read as one instrument.
- Demo-loading overlay duplicates information and visually competes with the
  top-right button/state.

Best next move:
- Make Coach's Note the **Study Brief**: a polished hero brief with one jewel,
  compact evidence rail, receipt hand strip, and a clear drill CTA. Keep the
  current logic; change the composition.

### B. Dashboard / Command Desk (`/dashboard`)

**Verdict:** the most visually advanced screen; also the screen with the worst
posture violations.

What works:
- The monument P&L + equity curve is strong.
- Ring HUD and positional felt ring are distinctive and on-brand.
- It feels like a premium instrument, not a generic CRUD dashboard.

Problems:
- **"Sync" button with cloud icon is a privacy/posture bug** in a local-only app.
  It implies cloud behavior that does not exist.
- `Export report` appears as a primary action but is not clearly wired from this
  page; if inert, it is fake affordance.
- Copy says `Command Desk`, `THE WIRE`, `System`, etc. It looks cool but can feel
  more like a design demo than the user's private study loop.
- Dashboard is visually stronger than `/`, which inverts product priority.
- The page still relies on Dashboard-specific CSS archaeology (`desk.css` /
  `reinterpretation.css`) rather than reusable components that the other pages
  can adopt.

Best next move:
- Keep the dashboard style as the visual north star, but remove fake cloud/report
  affordances and port its reusable primitives to `/`, Hands, and Leaks.

### C. Hands (`/hands`)

**Verdict:** functionally strong, visually still old.

What works:
- The table is the hero and handles 10k+ rows well.
- Filters are visible and compact enough.
- Not-graded queue is clear and trust-building.

Problems:
- Header `HAND ARCHIVE` is still loud mono/prototype copy.
- The green Import button and red Reset DB button are much louder than the rest
  of the shell.
- Not-graded panel is important, but it visually overwhelms the table; it should
  become a compact, collapsible data-health/review strip.
- Table columns scan, but the page lacks the Command Desk section header/kicker
  rhythm.
- The reset affordance should move behind a lower-emphasis danger zone/modal; it
  should not be a primary top-right object beside normal study workflow.

Best next move:
- Reskin Hands as **Hand Archive / Data Health**: calm title, compact health strip,
  instrumented filters, tokenized table states, danger action demoted.

### D. Leaks (`/leaks`)

**Verdict:** high-value information, too much visual noise.

What works:
- Prioritized queue is exactly the right product mental model.
- Evidence labels and caveats are trust-building.
- Large sample counts and target ranges are visible.

Problems:
- Leak cards are too tall and too saturated. The top five consume an enormous
  scroll column.
- Badge palette is noisy: red, green, blue, violet, white outlines, all at once.
- Repeated button stacks create a wall of outlines; primary/secondary hierarchy is
  weak.
- Critical red wash across multiple cards makes severity feel constant rather
  than ranked.
- The right `Start here` card is helpful but under-designed and detached.

Best next move:
- Turn Leaks into a **ranked repair queue**: compact row/card hybrid, one selected
  detail panel, unified evidence chips, and one primary action per leak.

### E. Arena (`/arena`)

**Verdict:** conceptually clean; visually underbuilt compared with Dashboard.

What works:
- Hero copy is strong and simple.
- Four drill entry points are understandable.
- Study Queue routed drills are a meaningful new capability.

Problems:
- Empty-card layout feels sparse, like a wireframe.
- Purple lightning jewel is currently decorative and not yet functionally tied to
  progress/schedule/identity.
- Drill cards need progress states, due/new counts, confidence labels, and a
  stronger connection to Coach's Note.
- "The Arena" is still a little game-y; `Drills` or `Practice` may fit the
  serious private coach posture better.

Best next move:
- Keep Arena as Practice/Drills, but add a compact progress instrument and tie
  each drill card to the same evidence language as Leaks/Coach.

## 4. Priority findings for the pretty pass

### Immediate slice landed on this branch

After the x-ray, this worktree applied the smallest safe posture fix:

- `index.html`: removed HUD/GTO marketing language from metadata and changed the
  browser title to `Poker Analyzer`.
- `DashboardPage`: removed fake `Sync` chrome, kept `Export report`, and wired it
  to a real local markdown download.
- Sidebar + Arena + Coach CTA: renamed visible `The Arena` affordances to
  `Drills` / `Open Drills` while preserving the `/arena` route.
- `careerCoach.ts`: generated local report footer no longer says `Poker Analyzer
  HUD`.

Post-slice checks: `npm run typecheck`, `npm run lint`, targeted route/sidebar
tests, `npm run docs:check`, and `npm run build` pass.

### P0 — remove fake/privacy-breaking affordances

1. [x] Change browser title from `Poker Analyzer HUD` to `Poker Analyzer`.
2. [x] Remove/disable Dashboard `Sync`; no cloud affordance until a future
   explicit identity gate allows it.
3. [x] Wire Dashboard `Export report`; no inert primary buttons.
4. [x] Rename nav `The Arena` → `Drills`.

### P1 — make the real front door prettier than the report screen

1. Redesign Coach's Note as the visual flagship.
2. Use one jewel max: likely the focus-study card, not a random overlay.
3. Add an evidence rail: confidence, sample, estimated bb cost, data-health state.
4. Convert receipts into clickable hand chips/cards.
5. Make `Drill it` feel like the next step in a loop, not a third generic card.

### P2 — token unification wave

1. Add shared primitives: `PageHeader`, `MetricTile`, `EvidenceChip`,
   `ActionButton`, `DangerButton`, `ReviewQueueCard`, `DataHealthStrip`.
2. Replace raw Tailwind palette colors with design tokens.
3. Replace broad `font-black`/`font-data` usage with display/sans/mono rules.
4. Keep semantic colors meaningful: money green, loss red, warn mauve, violet only
   wayfinding/user presence.

### P3 — high-value page reskins

1. Hands: header/filters/data-health/table/danger-zone pass.
2. Leaks: compact repair queue + selected detail panel.
3. Arena: practice dashboard with due/new/progress and evidence labels.
4. Career/Sessions: after chunk work, because they are bundle-heavy and visually
   still use older career widgets.

### P4 — efficiency and code-health that supports beauty

1. Lazy-load PDF/html2canvas export stack so Sessions/Career stop carrying export
   weight by default.
2. Decide animation strategy: either lazy-load Dashboard's GSAP or port its four
   components to the app's primary motion system.
3. Decompose `ArenaPage`, `HandsUpload`, `store`, and `spotPacket` as each page is
   reskinned. Do not do a pure refactor PR without a user-visible win.
4. Split pure Vitest files into Node environment to cut CI wall/time cost.

## 5. Proposed execution plan

### Slice 1 — "No fake chrome" polish PR

Small, safe, high-trust.

- `index.html`: update title away from HUD.
- `src/pages/DashboardPage.tsx`: remove `Sync`; remove or honestly wire `Export
  report`; adjust `Command Desk` copy to private report/supporting evidence.
- `src/components/layout/Sidebar.tsx`: rename `The Arena` if owner approves.
- Tests: route smoke plus any affected sidebar assertions.
- Verification: `npm run typecheck && npm run lint && npm test && npm run build`.

### Slice 2 — Coach's Note flagship pass

Make `/` prettier than `/dashboard` without changing analysis logic.

- Create small shared UI primitives if needed, but only those used by the page.
- Compose focus leak, receipts, confidence/sample, and drill CTA into one premium
  study brief.
- Add/adjust component tests around empty/focus/all-clear states.
- Browser-verify empty + demo-loaded screenshots.

### Slice 3 — Hands page trust/table pass

- Tokenize header/buttons/filter shell.
- Convert not-graded panel into compact Data Health / Review Queue strip.
- Demote Reset DB into a danger-zone affordance using `ConfirmDialog`.
- Preserve table behavior and virtualized performance.

### Slice 4 — Leaks queue compression

- Convert repeated full-card stack into ranked queue rows + selected detail.
- Deduplicate evidence chip styling with shared `EvidenceChip`.
- Use one primary action and one secondary overflow/action group per leak.

### Slice 5 — Arena/Drills polish

- Rename/reframe if approved.
- Add progress states and due/new instrumentation.
- Make Study Queue packet drills visually consistent with Coach/Leaks evidence
  language.

### Slice 6 — bundle + CSS archaeology

- Lazy PDF/html2canvas exports.
- Retire unused Dashboard orphan components or consciously rewire them.
- Collapse design CSS layers after token migration.

## 6. Recommendation

Do **not** start with a giant full-app redesign PR. The tree is green and the
new features are valuable; the risk is visual churn across many touched files.

Start with **Slice 1 + Slice 2**:

1. Remove fake/local-posture-breaking chrome immediately.
2. Make the front door excellent.

That gives the owner a visible, reviewable improvement on the new main while
preserving the hard-won trust substrate Fable landed.
