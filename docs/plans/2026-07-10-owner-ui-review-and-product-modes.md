# Owner UI Review and Product Modes

> **Status: PLANNED ONLY — NO PRODUCT IMPLEMENTATION AUTHORIZED.**
> Captured from the owner's 33 element-level browser comments against the local
> development build on 2026-07-10. The comments are product direction, not a
> request to patch the current UI in this session.

## 0. Verdict first

The problem is not simply that individual cards need polish. The current app
mixes three different products in one navigation and visual hierarchy:

1. an imported-hand analyzer for players with hand histories;
2. a configurable poker trainer for players who want to practise immediately;
3. an evidence-heavy internal/research surface that exposes every caveat and
   technical boundary at once.

The next UI effort should therefore start with product modes and information
architecture, then repair correctness defects, and only then redesign pages.
Painting the current page structure would preserve the confusion.

The owner-approved direction to explore is:

- **Review my play** — import-first; Coach, Hands, Leaks, performance, sessions,
  ranges, and drills driven by real mistakes.
- **Train from scratch** — drill-first; configurable random spots and curriculum
  create practice history and training metrics before any real hand is imported.
- Either user can add real hands later. Capabilities and navigation should
  progressively unlock instead of showing empty or irrelevant career surfaces.

## 1. Product decisions required before implementation

### D1 — Adaptive home, not one universal Coach's Note

The Coach's Note can remain a valuable review surface, but it should not be the
unconditional `/` route. The home should respond to product mode and available
data:

- no setup: choose **Review my play** or **Train from scratch**;
- review mode without data: focused import onboarding;
- review mode with data: concise command center / next best action;
- training mode: resume practice, configure a drill, or continue curriculum;
- mixed mode: user chooses a preferred home while both histories remain
  accessible.

Remove the nonsensical **Back to Dashboard** action when the Coach's Note is the
landing route. Any replacement navigation depends on the final home decision.

### D2 — Decide whether Dashboard and Career are one performance product

The current Dashboard and Career surfaces repeat profit, ROI, charts, and
summary metrics. Design a single information model before moving components:

- **Performance overview**: the answer in 30 seconds, lifetime money/ROI,
  current stake guidance, positional profitability, and recent form.
- **Career detail**: chronology, milestones, tournament distribution, trends,
  and deeper breakdowns.

Preferred experiment: one `/performance` route with Overview, Trends, and
Timeline sections or tabs. Preserve deep links during evaluation. Do not merge
routes until duplicated calculations and data semantics are audited.

### D3 — Persistent money context belongs in the shell, but must be restrained

The owner misses the Monument-style always-visible money context. Test a compact
shell-level performance summary sourced from the existing real Monument data:

- net profit;
- ROI only when its denominator is valid;
- volume/sample context;
- optional recent movement.

It may live above navigation, in a collapsible sidebar module, or as a slim
cross-page strip. It must not repeat entire Dashboard cards on every route or
crowd task-focused pages.

### D4 — Profile becomes the home for settings and data administration

Make the existing hero block interactive. Its menu/drawer should contain:

- hero identity and aliases;
- strategy profile;
- import/data health entry point;
- backup, restore, and reset (the current Data Vault capabilities);
- local/privacy information;
- display/preferences when those settings exist.

Remove **Data Vault** as a primary sidebar destination after the profile/settings
surface provides a clear route. Dangerous operations remain explicit and
confirmable; hiding a nav item must not hide recoverability.

### D5 — Caveats become progressive disclosure and an engineering burn-down

Honesty remains non-negotiable, but the current UI repeats implementation
boundaries until the caveats dominate the task. Use three levels:

1. a short status such as **Rule-based**, **Review only**, or **Needs more data**;
2. one plain-language reason beside the affected result;
3. full provenance/technical details behind **Why?** or an inspector.

Separately track why caveats exist and remove them when capability improves.
Copy reduction must never imply solver support or grading that does not exist.

### D6 — Villains must earn its place

The current table is too thin for a first-class route after automatic archetypes
were parked. Run a keep-or-cut spike:

- keep only if repeat-opponent workflows are useful (search, encounter history,
  notes, observed tendencies with sample confidence, session comparison);
- otherwise fold opponent context into Hand Replay/Sessions and remove the
  standalone navigation item;
- do not revive automatic labels without the separately parked evidence and
  confidence design.

### D7 — BLACKOUT is quarry, not the new product architecture

The parked Foundation v2 work was built and reviewed from
`origin/blackout/foundation-v2` after the 33-comment owner review. It passes
typecheck, 96 test files / 934 tests, build, and docs checks, but must not merge
wholesale: its Coach's Note reference-page wiring, severity ribbons, permanent
honesty chrome, and InkField-first rollout conflict with D1, D5, UIR-008, and
owner comments 2, 3, 7, 20, 23, and 33.

Use this selective disposition:

- **Salvage from F-1 (`ec1c3a8`):** self-hosted Hanken/Space Mono typography,
  motion tokens, `TitleReveal`, `FolioSection`, and `PageTransition`, subject to
  bundle/accessibility verification and no forced monumental titles on work
  pages.
- **Salvage from F-2 (`4ff3866`):** `DossierTable`, `FilterRail`, `EmptyState`,
  `chartTheme`, `useFocusTrap`, and the display/work density distinction. These
  directly support UIR-003, UIR-010, UIR-015, UIR-020, and UIR-021.
- **Rework before use:** `CaseFileModal` may donate its focus/slide shell, but
  loses the diagonal ribbon and follows UIR-013's simpler reading order.
  `Ticker` may become the restrained performance-context experiment in UIR-008,
  but not a duplicated marquee or global caveat strip.
- **Park/discard for this program:** F-3 `InkField` (`aee83a7`, `484d5d0`),
  Coach's Note page wiring, universal `HonestyStrip`, diagonal severity ribbons,
  and any rollout sequencing that chooses page chrome before D1-D6 are ratified.

The HTML design system remains useful visual reference, but this owner plan now
wins when it conflicts with the older BLACKOUT rollout document.

## 2. Historical design recovery references

These commits are references for archaeology, not revert targets:

- `0a64691` / `21b0abd` — design-system port that introduced the Monument and
  richer dashboard components.
- `a104a89` — demoted Dashboard and made Coach's Note the front door; the new
  home decision should explicitly revisit this choice.
- `ec39b34`, `f6af6c2`, `0a64691` — progressively richer historical Ranges
  implementations. Compare layout, spacing, controls, matrix legibility, and
  horizontal overflow against current source.
- `eff6452` — consolidated Stats into Career, relevant to the present
  Dashboard/Career overlap.
- `39f56d5` — removed villain auto-archetypes, explaining why the current
  Villains route became a bare observed-stats table.
- `d0ac3de` / `041af7d` — removed orphaned dashboard cards. Do not restore dead
  components merely because a visual resembles the remembered feature; reuse
  current real calculations.

## 3. Execution backlog

Tasks are ordered by dependency. Each task is intended to become one scoped PR
unless its discovery phase concludes that no implementation is warranted.

### Wave 0 — Reproduce correctness and broken-state reports

#### UIR-001 — Import hang investigation (P0)

**Comments:** 11.

**Scope:** `HandsUpload`, parser worker lifecycle, persistence completion, and
the visible import overlay. Reproduce with the smallest tracked fixture and a
representative ZIP before changing code.

**Acceptance criteria:**

- every import terminates as success, partial success, recoverable file error,
  fatal error, or explicit cancellation;
- no worker rejection or persistence failure can leave `isImporting` true;
- progress identifies the active phase (reading, parsing, saving, analysing);
- regression test covers the reproduced endless-load path;
- existing duplicate/import confidence behaviour remains intact.

#### UIR-002 — Numeric presentation boundary (P0)

**Comments:** 10.

**Scope:** locate every user-visible chip, blind, pot, currency, percentage, and
duration formatter. Fix `385.00000000000006` at the shared formatting boundary,
not with a one-off string replacement in Hand Replay.

**Acceptance criteria:** no floating-point artefacts appear in replay actions or
summary values; precision rules are documented and directly tested.

#### UIR-003 — Career chart failure audit (P0/P1)

**Comments:** 27.

**Scope:** identify which chart renders as an unexplained vertical bubble plot,
then verify its data contract, axes, responsive size, empty state, and demo data.

**Acceptance criteria:** the chart either communicates a named metric with
readable axes/tooltips or is removed; small/degenerate datasets get a deliberate
empty/insufficient-data state.

#### UIR-004 — Finish distribution semantics (P1 correctness)

**Comments:** 25.

**Scope:** define mutually exclusive finish buckets and their denominator.
Include early exits, counts, and percentages; clarify whether a deep run includes
final tables/wins or is exclusive.

**Acceptance criteria:** bars have a visible common total/scale, counts and
percentages reconcile to the stated sample, and tests cover all finish buckets.

### Wave 1 — Product modes and information architecture

#### UIR-005 — Dual-startup product-mode specification

**Comments:** 2, 33.

Write the state model for review-first, train-first, and mixed use. Define what
the app asks on first launch, what is persisted, how mode can be changed, how
real imports upgrade a training-first account, and which metrics exist for
practice-only history. Include wireframes before implementation.

#### UIR-006 — Adaptive home information architecture

**Comments:** 1, 2, 33.

Prototype the four home states from D1. The result must answer one question:
**What is the most useful next action for this user now?** Coach's Note becomes
one possible module/destination rather than the mandatory page composition.

#### UIR-007 — Navigation and profile/settings reorganization

**Comments:** 4, 5.

Design the interactive hero menu and move Data Vault/configuration beneath it.
Audit desktop and mobile navigation, keyboard access, route discoverability,
dangerous actions, and Command Palette entries.

#### UIR-008 — Persistent performance context experiment

**Comments:** 6, 15.

Create low-fidelity alternatives for a sidebar Monument, slim performance strip,
and no persistent metric module. Test information value and visual noise across
Hands, Ranges, Arena, and narrow viewports before choosing one.

#### UIR-009 — Dashboard/Career consolidation spike

**Comments:** 17, 18, 20, 22.

Inventory duplicate metrics, formulas, charts, and routes. Produce a proposed
`/performance` hierarchy and migration map. The odd Career **Overview** tab is
resolved as part of this decision rather than restyled in isolation.

### Wave 2 — Shared visual language and disclosure

#### UIR-024 — Selective BLACKOUT foundation salvage

**Source:** parked Foundation v2 branch audit, not a new page redesign.

Create a fresh branch from current `main`; do not merge the combined BLACKOUT
branch. Port only the D7 salvage list in independently reviewable slices:

1. typography + inert motion primitives;
2. tool-page table/filter/empty/chart/focus primitives;
3. optional reworked modal shell only after the Hand Replay wireframe exists.

**Acceptance criteria:** no page route or information architecture changes; no
severity ribbon, permanent honesty strip, or InkField; direct component tests;
reduced-motion/keyboard checks; bundle impact recorded; browser catalog proves
each primitive at display and work density.

#### UIR-010 — Reduce card fragmentation and restore text hierarchy

**Comments:** 16, 20, 24.

Define when a border/card represents a real interactive or semantic unit.
Reduce nested panels, improve label/value contrast and type size, and establish
readable metric-card rules. Test the Ability Rating composition within the new
hierarchy rather than discarding it; the owner likes the underlying feature.

#### UIR-011 — Replace decorative severity devices

**Comments:** 3.

Remove the diagonal **Critical** ribbon. Compare a restrained severity badge,
accent rule, and text treatment that remains accessible and does not make the
page feel like an alarm dashboard.

#### UIR-012 — Progressive-disclosure caveat component

**Comments:** 7, 13, 23.

Create one shared caveat/status pattern for Hand Replay, Hands, Career, Leaks,
and future drill results. Default view shows the consequence and one reason;
technical metadata is expandable. Do not duplicate the same global limitation
at the top of multiple pages.

### Wave 3 — Hands and grading capability

#### UIR-013 — Hand Replay simplification

**Comments:** 8.

Redesign the modal around a straight reading order:

1. hand identity + result;
2. compact table/cards/action context;
3. replay/action timeline;
4. analysis or review status;
5. expandable technical packet/export details.

The default viewport should not lead with packet hashes, inferred legal menus,
and a wall of caveats.

#### UIR-014 — Playing-card visual redesign

**Comments:** 9.

Explore two or three card treatments at replay and table sizes. Validate rank,
suit, contrast, red/black colour semantics, duplicate-card impossibility, and
mobile readability. Reuse one component across the app.

#### UIR-015 — Import guide becomes onboarding/help

**Comments:** 12.

Replace the permanent four-column source guide with first-import onboarding and
a persistent compact help entry (`?` or **Import help**). Remember dismissal
locally, but keep source compatibility and privacy guidance discoverable.

#### UIR-016 — Gradeability recovery program

**Comments:** 7, 13, 23.

Treat caveat reduction as capability work with three separate lanes:

1. **Recover missing context:** audit why the demo shows 3,712
   `FACING_RAISE` decisions with unknown opener position. The demo generator
   creates a raiser action but its `HeroDecision` path does not visibly assign
   that raiser's position; confirm whether this is demo-only or affects imports.
2. **Complete existing rule coverage:** enumerate hero/opener pairs deliberately
   missing from current reaction charts and add only owner-approved ranges.
3. **Add new analytical support:** `FACING_3BET` needs approved defence/4-bet
   ranges; `FACING_ALL_IN` needs pot odds plus tournament/ICM context; multiway
   and unusual sizings need explicit models or continued refusal.

**Acceptance criteria:** a generated coverage report explains every ungraded
bucket by root cause and count; improvements reduce the count without turning
unknowns into false grades; all new grading has direct fixtures/tests and clear
confidence/provenance.

### Wave 4 — Page-specific redesigns

#### UIR-017 — Leaks: from evidence wall to actionable inbox

**Comments:** 14.

Keep the useful data but redesign the default view around one prioritized leak,
why it matters, sample/confidence, proof hands, and a single next action. Move
secondary tags, provenance, and all-leak comparison behind expansion/filtering.

#### UIR-018 — Dashboard/Performance interaction pass

**Comments:** 17, 19, 21.

- add hover/focus points and meaningful period context to the Monument curve;
- decide whether the VPIP radar communicates more than a standard comparison;
- retain the promising positional table and improve selected-seat feedback,
  sample context, accessibility, and small-screen layout;
- eliminate duplicate graphs after UIR-009.

#### UIR-019 — Career chronology and layout pass

**Comments:** 22, 24, 25, 26, 27.

Keep and elevate the milestone timeline—the owner strongly values it—but add
pagination/windowing, clear end-of-history behaviour, filters, and denser empty
space handling. Integrate Ability Rating and corrected finish/chart surfaces
under the information model chosen in UIR-009.

#### UIR-020 — Sessions clarity pass

**Comments:** 28, 29.

Refine the session table and expanded detail so performance, nemesis, reference
consistency, and coaching guidance have a clear order. Remove decorative empty
space, make low-confidence warnings calmer, and verify row expansion on mobile.

#### UIR-021 — Ranges restoration and redesign

**Comments:** 30.

This is a full redesign, not a spacing ticket. Begin with side-by-side captures
of current HEAD and historical commits `ec39b34`, `f6af6c2`, and `0a64691`.
Preserve current correctness improvements while recovering the strongest visual
ideas. Requirements:

- controls have hierarchy and never concatenate into an unreadable line;
- position/scenario/opener selection is obvious;
- matrices fit without accidental whole-page horizontal scrolling;
- legend and cell states are legible;
- reference versus performance comparison is immediately understandable;
- edit and push/fold modes are separated from review mode;
- keyboard and narrow-screen behaviour are designed explicitly.

#### UIR-022 — Arena split into Practice and Curriculum

**Comments:** 31.

Preserve the current direction but separate two jobs:

- **Practice:** own mistakes, random ranges, or a configurable spot builder
  (positions, opener, stack size, scenario, action family, difficulty/sample).
- **Curriculum:** structured seed packs, lesson progression, prerequisites, and
  completion history.

The random trainer needs a clear `all spots / all stack sizes` mode and a
configurable mode. Practice-only results populate training history but must not
masquerade as imported-hand career results.

#### UIR-023 — Villains keep-or-cut spike

**Comments:** 32.

Prototype the repeat-opponent workflow from D6 using actual observed data. Make
the keep/remove decision before investing in visual polish.

## 4. Comment traceability

| Comment | Planned destination |
|---:|---|
| 1 | D1, UIR-006 |
| 2 | D1, UIR-005, UIR-006 |
| 3 | UIR-011 |
| 4 | D4, UIR-007 |
| 5 | D4, UIR-007 |
| 6 | D3, UIR-008 |
| 7 | D5, UIR-012, UIR-016 |
| 8 | UIR-013 |
| 9 | UIR-014 |
| 10 | UIR-002 |
| 11 | UIR-001 |
| 12 | UIR-015 |
| 13 | UIR-012, UIR-016 |
| 14 | UIR-017 |
| 15 | D3, UIR-008 |
| 16 | UIR-010 |
| 17 | D2, UIR-009, UIR-018 |
| 18 | D2, UIR-009 |
| 19 | UIR-018 |
| 20 | D2, UIR-009, UIR-010 |
| 21 | UIR-018 |
| 22 | D2, UIR-009, UIR-019 |
| 23 | D5, UIR-012, UIR-016 |
| 24 | UIR-010, UIR-019 |
| 25 | UIR-004, UIR-019 |
| 26 | UIR-019 |
| 27 | UIR-003, UIR-019 |
| 28 | UIR-020 |
| 29 | UIR-020 |
| 30 | UIR-021 |
| 31 | UIR-022 |
| 32 | D6, UIR-023 |
| 33 | D1, UIR-005, UIR-006 |

## 5. Recommended dispatch order

1. **Correctness triage:** UIR-001 through UIR-004. These can proceed without
   choosing the new visual direction, but require explicit execution approval.
2. **Owner review workshop:** D1 through D7 using low-fidelity wireframes and
   historical captures. Approve the information architecture before code.
3. **Shared foundations:** begin with UIR-024, then UIR-005 through UIR-016.
   Land small, non-overlapping
   PRs; do not let page teams independently invent caveat/settings patterns.
4. **Page slices:** UIR-017 through UIR-023 after shared decisions land.
5. **Independent visual/correctness review:** test both startup modes, real and
   demo data, empty states, desktop/narrow layouts, keyboard navigation, and all
   honesty boundaries before merging the final route changes.

No tasks from this plan should be inserted into the current stale local task
spool until the spool is reconciled against source and each selected slice has
an owner, allowed files, protocol files, and required checks.
