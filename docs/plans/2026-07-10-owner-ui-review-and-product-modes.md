# Owner UI Review and Product Modes

> **Status: D1–D7 RATIFIED BY THE OWNER 2026-08-10.** Wave 0 correctness
> execution was authorized 2026-07-21; the product-mode and
> information-architecture decisions that gated Waves 1–2 are now answered — see
> §1.0 below for the ratified table and §5 for the re-sequenced dispatch order.
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

### 1.0 Ratified answers — owner decision workshop, 2026-08-10

Run per §5 step 2. Each decision was put to the owner with 2–3 low-fidelity
options, a named trade-off, a recommendation, and its exact backlog consequence.
The prototypes and the verified "what exists today" evidence behind each one are
in [`docs/design/decision-lab-2026-08/`](../design/decision-lab-2026-08/)
(open `index.html`). Every figure in that lab comes from the seeded demo dataset
— 250 tournaments / 15,245 hands — read back out of IndexedDB, not from prose.

| # | Ratified answer | Recommendation matched? |
|---|---|---|
| **D1** | **One route, adaptive body.** `/` stays a single route; composition follows data state. No first-run mode question, no persisted `productMode`. A mode preference may be layered on later without redoing this. | yes |
| **D2** | **Audit first, decide later.** UIR-009 executes as written — a duplicate-metric/formula/denominator inventory. D2 is re-asked with that map in hand. No route change this program until then. | no (recommended one `/performance`) |
| **D3** | **Restore the sidebar money hero, derived-stats layer first.** Two slices: a summary row written on import/seed, then the `ca7a08b` block against real values. | yes |
| **D4** | **Full settings drawer; `/data` absorbed.** Identity / Strategy / Data / Privacy tabs, `/data` redirects away. | no (recommended keeping `/data`) |
| **D5** | **Shared chip → reason → "Why?"** One component, three levels, attached to the result it qualifies, appearing only where earned. Permanent `HonestyStrip` retired. | yes |
| **D6** | **Keep Villains; build the repeat-opponent workflow.** Encounter history, field baselines, sample-confidence bands. UIR-023 becomes a build, not a spike. | no (recommended cutting the route) |
| **D7** | **Port F-2, retire the park list.** The four tested tool-page primitives land; the diagonal ribbon and permanent honesty strip are deleted in the same wave. | yes |

#### Constraints carried forward from the workshop

These were flagged when the options were presented and survive as design
requirements, not as re-litigation of the decision:

1. **D4 puts destructive actions in a dismissible overlay.** Export, restore and
   *replace the entire database* currently live on a page with a `ConfirmDialog`
   one click from the sidebar. Absorbing `/data` into a drawer must not make
   recovery harder to find at the moment a user needs it. UIR-007 owns an
   explicit design for destructive actions in an overlay, plus a redirect for the
   `/data` URL.
2. **D6 keeps a tenth nav item.** At 390px only 5 of 10 sidebar items are
   reachable without horizontal scrolling and labels are hidden entirely. D4
   removes one item (Data Vault); D6 keeps one. UIR-007 must solve narrow-viewport
   navigation on its own rather than relying on the item count falling.
3. **D6's evidence is synthetic.** The 1.1pp VPIP spread across the demo field is
   a property of the demo generator. Before the encounter-history work is scoped,
   re-run the numbers against a real PokerStars import from
   `src/test/fixtures/` — if real opponents also fail to separate, the field
   baseline is the feature and the per-opponent table is not.
4. **D2 leaves two visible defects standing.** Until the audit lands and D2 is
   re-asked, `/dashboard` keeps printing `$843.49` five times and Career stays
   15,912px tall with a 12,112px unpaginated timeline. That is an accepted cost
   of sequencing, recorded here so it is not rediscovered as a new bug.
5. **D3 and D2 overlap.** The derived-stats layer D3 needs and the duplicate-metric
   inventory D2 orders are the same question asked twice. Sequence UIR-009 first
   so its output specifies the summary row, then build it once.

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

**RATIFIED 2026-08-10 — one route, adaptive body.** `/` keeps resolving to a
single page whose composition branches on data state. The five situations above
become a documented state table, not a persisted mode:

- 0 hands → both doors on one screen (import hands / drill 11 packs), no refusal
  headline, no setup question;
- has decisions → the focus leak with its receipts, as today;
- drilled but never imported → resume the pack, with training history kept
  visibly separate from imported-hand evidence;
- mixed → data state decides; nothing to configure.

`buildCoachsNote()` already returns a discriminated union with an
`insufficient_data` arm to branch on, so no schema or route change is required.
A stored mode preference remains available later as an additive layer.

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

**RATIFIED 2026-08-10 — audit first, decide later.** No route change and no
`/performance` migration in this program. UIR-009 executes as written and
produces the inventory; D2 is then re-asked with it in hand.

Verified scale of the duplication the audit must map (demo dataset, page allowed
to settle so count-ups finished): `$843.49` appears **five times** in
`/dashboard`'s rendered text — wire tape, breadcrumb title, monument, and the
30-second answer — ROI **three times**, and "Hold Current Stake" twice.
`/career` then prints the same verdict a sixth time. Both derive from
`buildCareerCoachReport()`; Dashboard renders it as `VerdictGauge`, Career as
`CareerCoachCard`. Career is 15,912px tall, of which the unpaginated milestone
timeline is 12,112px (76%).

The audit must also record **denominators**, not just formulas: only 65 of 250
demo tournaments carry a recorded finish, so ITM 26.0% and the finish chart do
not share a denominator with ROI. That output is the input to both the D2 re-ask
and the D3 summary row.

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

**RATIFIED 2026-08-10 — restore the sidebar money hero; derived-stats layer
first.** The owner recalled this shipping, and it did. `ca7a08b`
("fix(ui): remove fabricated stats from sidebar + dashboard (CQ-1)", PR #80,
2026-06-17) deleted a `.jewel` block above the hero identity, money-green with a
`0 0 20px rgba(52,217,140,0.40)` glow, reading *Lifetime profit / +$388.85 /
+141.4% ROI · 250 tourneys*. Every value was a hardcoded literal, beside a fake
`Grinder · B+` rating and a hardcoded `scorza23` identity. The design was never
the problem; the data was.

That commit named its own condition for return, verbatim: *"Computing a real
lifetime figure here would add a full-table scan to an always-mounted component
— the perf anti-pattern the audit's 1.4 already flags — so the honest minimal fix
is to remove the lie; a real figure can come later behind a derived-stats
layer."*

**That layer still does not exist.** There is no cache, memo table or summary row
in `src/data/`; `DashboardPage.tsx:29–32` still calls `db.hands.toArray()` and
`db.heroDecisions.toArray()` on mount — 30,740 rows on the demo dataset. So this
is two slices, in order:

1. a derived-stats layer — one summary row (net, buy-ins, prizes, tournament
   count) written on import/seed, added to `src/data/backup.ts`, so an
   always-mounted sidebar reads one row rather than scanning;
2. restore the `ca7a08b` markup against real values.

`src/components/layout/__tests__/Sidebar.test.tsx` is the live regression guard —
it asserts no `388.85`, `141.4`, `250 tourneys` or `Grinder` renders. It stays
green by computing truth, **never** by weakening the assertions. Mobile needs an
explicit answer: below 768px the sidebar becomes a horizontal bottom bar with
nowhere to put the block.

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

**RATIFIED 2026-08-10 — full settings drawer; `/data` absorbed.** The hero block
becomes interactive and opens a drawer with Identity / Strategy / Data / Privacy
tabs; the `/data` route is redirected away rather than retained.

Verified starting point: `Sidebar.tsx:46–54` renders the hero block as a plain
`<div>` — no handler, no `role`, no keyboard affordance — while `/data` already
contains the entire D4 inventory (hero name persisted to the IndexedDB
`settings` table, strategy profile, the 184,000-row census across 11 tables,
export, and restore with merge-or-replace behind `ConfirmDialog`). The whole
settings surface is two controls; `SettingsCard.tsx` is the only settings
component in `src/`.

Binding requirement, per the constraint recorded in §1.0: absorbing the page
moves *replace the entire database* into a dismissible overlay. UIR-007 must
design destructive actions in that overlay deliberately — confirmation that
survives a stray Escape, and a discoverable path back to backup/restore — and
must ship a redirect so the `/data` URL keeps working.

### D5 — Caveats become progressive disclosure and an engineering burn-down

Honesty remains non-negotiable, but the current UI repeats implementation
boundaries until the caveats dominate the task. Use three levels:

1. a short status such as **Rule-based**, **Review only**, or **Needs more data**;
2. one plain-language reason beside the affected result;
3. full provenance/technical details behind **Why?** or an inspector.

Separately track why caveats exist and remove them when capability improves.
Copy reduction must never imply solver support or grading that does not exist.

**RATIFIED 2026-08-10 — one shared chip → reason → "Why?" component.** The three
levels above become a single component that attaches to the result it qualifies
and renders **only where it is earned**. The permanent `HonestyStrip` is retired
(D7's ratified answer removes it in the same wave).

The problem this fixes is not volume but *distribution*. A token census of each
page's rendered text on the demo dataset: `/leaks` says "rule-based" **8 times**
and "no solver" **7 times** inside 3,619 characters — roughly one honesty token
per 200 characters — with leak #1 carrying five badges, two of which
(`Rule-based`, `Rule-based, no EV`) say the same thing. `/dashboard` returns
**zero** on the same census while printing ROI +306.7% and ITM 26.0% over a
65-of-250 denominator. The page with the weakest denominator carries the least
honesty copy; the page with the safest math carries the most.

Consequence for UIR-012's scope: the component is small, the **audit is the
work** — every rendered metric must be classified as earning a chip or not, with
its denominator recorded. Sequence it after UIR-009, whose inventory produces
exactly that classification.

One copy defect to fix while there: the on-screen reason for ungraded spots reads
"facing 3-bets, all-ins, multiway BB defense", but **all 3,724** ungraded
decisions in the demo dataset are `FACING_RAISE` — the dataset contains only
three scenario families (RFI 8,974 · FACING_RAISE 3,724 · BB_VS_RAISE 2,547).
The stated reason does not match the actual cause. This confirms UIR-016 lane 1's
hypothesis with a count: the refusal is one bucket, not a spread of hard spots.

### D6 — Villains must earn its place

The current table is too thin for a first-class route after automatic archetypes
were parked. Run a keep-or-cut spike:

- keep only if repeat-opponent workflows are useful (search, encounter history,
  notes, observed tendencies with sample confidence, session comparison);
- otherwise fold opponent context into Hand Replay/Sessions and remove the
  standalone navigation item;
- do not revive automatic labels without the separately parked evidence and
  confidence design.

**RATIFIED 2026-08-10 — keep the route; build the repeat-opponent workflow.**
UIR-023 becomes a build rather than a keep-or-cut spike. The route earns its
place by answering *"have I played this person before?"*: encounter history per
tournament/session, field baselines rendered beside every stat, and explicit
sample-confidence bands.

Verified starting point: `VillainsPage.tsx` is a search box, a player count, a
7-column table capped at 100 rows, and a detail panel with notes and ten tags —
368 lines, no encounter history, no session comparison, no sample confidence, no
sort. On the demo dataset it renders 10 opponents whose stats are
indistinguishable: VPIP 13.0–14.1%, PFR 7.9–8.8%, AF 1.41–1.73, and Limp% and
3-bet% are **0.0% for every player** — two of seven columns carry no information.
The page also overflows horizontally at 390px (461 vs 390).

Two constraints from §1.0 apply before scoping: that uniformity is a property of
the synthetic demo generator, so **re-run the spread against a real PokerStars
fixture first** — if real opponents also fail to separate, the field baseline is
the feature and the per-opponent table is not. And keeping this route means the
nav item count does not fall, so UIR-007 must solve narrow-viewport navigation on
its own.

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

**RATIFIED 2026-08-10 — port F-2, retire the park list.** Two reviewable slices
in one wave, no route or IA change.

**The disposition above had inverted against `main` and this is the correction.**
Verified 2026-08-10: everything the park list names is *live on main* —
`src/components/blackout/` contains exactly `Folio`, `Ticker` and `HonestyStrip`,
all three wired into `CoachsNotePage.tsx` (the `/` route), and the diagonal
severity ribbon is `.bk-case::before` in `blackout.css:166–179`
(`content: attr(data-ribbon)`, `transform: rotate(45deg)`), which in the captured
demo state overlaps the heading beneath it. Meanwhile the salvage list is
*nowhere on main*: `DossierTable`, `FilterRail`, `EmptyState`, `chartTheme`,
`TitleReveal`, `FolioSection`, `PageTransition` and `CaseFileModal` exist only on
`origin/ui/blackout-f1-type-motion` (`ec1c3a8`) and
`origin/ui/blackout-f2-tranche2` (`4ff3866`). Only `useFocusTrap` crossed over,
and it landed under `src/components/shared/`. F-2 alone is 1,003 lines including
five test files and 366 lines of component CSS.

- **Slice 1 — port F-2.** `DossierTable`, `FilterRail`, `EmptyState`,
  `chartTheme`, with their existing tests. These are what UIR-003, UIR-010,
  UIR-015, UIR-020 and UIR-021 are actually blocked on.
- **Slice 2 — retire the park-list items now on main.** Delete the diagonal
  ribbon (closing UIR-011 / comment 3) and the permanent `HonestyStrip` (clearing
  D5's path).
- **Deferred:** F-1 typography and motion. Slice 1 of the original three-slice
  plan would add two font families and re-open a settled conflict — D9 ratified
  Inter + JetBrains on practicality grounds, D14 replaced them with Hanken +
  Space Mono; both are law and they disagree. That ruling is not required for
  anything currently blocked, so it is not made here.

**Related finding, not owned by D7.** The chassis has drifted from the palette
law it exists to enforce: 104 off-palette Tailwind hue classes across 20 files —
23 `text-sky`, 19 `text-amber` (D13 purged amber system-wide), 9 `text-cyan`,
4 `text-blue`, plus purple and orange, concentrated in `src/components/career/`.
This is mechanical and testable; fold it into whichever page slice touches each
file rather than spending a dedicated wave on it.

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

**Status (2026-07-11): In progress.** The recovery slice now handles unreadable
local files, worker startup/posting failures, silent-worker timeout, and explicit
user cancellation without leaving `isImporting` true. The overlay follows the
real async lifecycle through Reading files, Parsing hands, Saving locally, and
Updating analysis, with a deliberately paused regression at every boundary.
A tracked ZIP/browser reproduction remains before this task is complete.

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

**Status (2026-07-21): In progress.** The shared `chipAmount` formatter now
covers Hand Replay actions, blinds, antes, pots, hero/tournament-context
stacks, Hands table stack depth, and Spot Packet bb values, with direct
IEEE-754 rendering regressions. A repo-wide migration of remaining non-Hands
numeric render sites is still required before this task is complete.

**Scope:** locate every user-visible chip, blind, pot, currency, percentage, and
duration formatter. Fix `385.00000000000006` at the shared formatting boundary,
not with a one-off string replacement in Hand Replay.

**Acceptance criteria:** no floating-point artefacts appear in replay actions or
summary values; precision rules are documented and directly tested.

#### UIR-003 — Career chart failure audit (P0/P1)

**Comments:** 27.

**Status (2026-07-21): Complete.** The reported bubble plot was the Day/Hour
scatter. It now names the recorded-start-time metric, sizes bubbles by sample
rather than dollars, exposes readable axes and aggregate/average tooltips, and
refuses to imply a pattern for empty or one-bucket data. Direct component tests
pin those states.

**Scope:** identify which chart renders as an unexplained vertical bubble plot,
then verify its data contract, axes, responsive size, empty state, and demo data.

**Acceptance criteria:** the chart either communicates a named metric with
readable axes/tooltips or is removed; small/degenerate datasets get a deliberate
empty/insufficient-data state.

#### UIR-004 — Finish distribution semantics (P1 correctness)

**Comments:** 25.

**Status (2026-07-21): Complete.** Finish results now use five explicit,
mutually exclusive position bands with one recorded-finish denominator. The
chart keeps all bands visible on a common 0–N scale and shows reconciled counts
plus percentages in labels and tooltips; pure and component tests cover the
boundaries and empty state.

**Scope:** define mutually exclusive finish buckets and their denominator.
Include early exits, counts, and percentages; clarify whether a deep run includes
final tables/wins or is exclusive.

**Acceptance criteria:** bars have a visible common total/scale, counts and
percentages reconcile to the stated sample, and tests cover all finish buckets.

### Wave 1 — Product modes and information architecture

#### UIR-005 — Dual-startup product-mode specification

**Comments:** 2, 33.

**Status (2026-08-10): rescoped by D1.** No mode is persisted and the app asks
nothing on first launch, so this is no longer a state machine. It becomes a
documented state table for the adaptive home — what each data state renders, and
how practice-only history stays visibly separate from imported-hand evidence.
Sequenced *after* UIR-006 (item 5), since the build settles the states.

Write the state model for review-first, train-first, and mixed use. Define what
the app asks on first launch, what is persisted, how mode can be changed, how
real imports upgrade a training-first account, and which metrics exist for
practice-only history. Include wireframes before implementation.

#### UIR-006 — Adaptive home information architecture

**Comments:** 1, 2, 33.

**Status (2026-08-10): unblocked by D1, next after UIR-024 slice 1.** Buildable
now — one route, composition branching on data state, no schema or route change.
The empty state is also the answer to UIR-015's onboarding question, so scope
them together where they overlap.

Prototype the four home states from D1. The result must answer one question:
**What is the most useful next action for this user now?** Coach's Note becomes
one possible module/destination rather than the mandatory page composition.

#### UIR-007 — Navigation and profile/settings reorganization

**Comments:** 4, 5.

**Status (2026-08-10): rescoped by D4 — drawer, not menu.** `/data` is absorbed
and redirected. Three things this task now owns that it did not before:
a deliberate design for destructive actions inside a dismissible overlay
(constraint 1, §1.0); a redirect so the `/data` URL keeps working; and
narrow-viewport navigation solved on its own merits, because D6 keeps Villains
so the item count does not fall (constraint 2, §1.0). At 390px only 5 of 10 nav
items are reachable and labels are hidden entirely.

Design the interactive hero menu and move Data Vault/configuration beneath it.
Audit desktop and mobile navigation, keyboard access, route discoverability,
dangerous actions, and Command Palette entries.

#### UIR-008 — Persistent performance context experiment

**Comments:** 6, 15.

**Status (2026-08-10): decided by D3 — the alternatives no longer need testing.**
The sidebar block is chosen, and it is a restoration of `ca7a08b`, not a new
design. This task is now slice 2 of two: rebuild that markup against real values
once the derived-stats summary row exists (item 6 in §5.2), keep
`Sidebar.test.tsx` green by computing truth rather than weakening it, and answer
the sub-768px case where the sidebar becomes a bottom bar.

Create low-fidelity alternatives for a sidebar Monument, slim performance strip,
and no persistent metric module. Test information value and visual noise across
Hands, Ranges, Arena, and narrow viewports before choosing one.

#### UIR-009 — Dashboard/Career consolidation spike

**Comments:** 17, 18, 20, 22.

**Status (2026-08-10): promoted by D2 — this is the gate now.** D2 was ratified
as audit-first, so this spike runs early (item 3 in §5.2) and its output feeds
three things: the D2 re-ask, D3's summary row, and UIR-012's metric
classification. Add **denominators** to the inventory alongside metrics and
formulas — only 65 of 250 demo tournaments carry a recorded finish, so ITM and
ROI do not share one. Produce the proposed `/performance` hierarchy as a
*proposal only*; no route moves until D2 is re-asked.

Inventory duplicate metrics, formulas, charts, and routes. Produce a proposed
`/performance` hierarchy and migration map. The odd Career **Overview** tab is
resolved as part of this decision rather than restyled in isolation.

### Wave 2 — Shared visual language and disclosure

#### UIR-024 — Selective BLACKOUT foundation salvage

**Source:** parked Foundation v2 branch audit, not a new page redesign.

**Status (2026-08-10): rescoped by D7 to two slices, and it is now item 1.** The
original slice 1 (typography + motion) is deferred — it would add two font
families and force a ruling on the D9-versus-D14 conflict that nothing currently
blocked requires. The original slice 3 (modal shell) stays gated on UIR-013.
What replaces them:

1. **Port F-2** (`4ff3866`): `DossierTable`, `FilterRail`, `EmptyState`,
   `chartTheme`, with their existing tests. Verified absent from `main`.
2. **Retire the park-list items that are live on `main`**: the diagonal
   `.bk-case::before` ribbon (closes UIR-011 / comment 3) and the permanent
   `HonestyStrip` (clears D5's path).

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

**Status (2026-08-10): folded into UIR-024 slice 2 by D7.** The ribbon is
`.bk-case::before` in `blackout.css:166–179` and is on D7's park list while being
live on `main`; retiring it is in scope for that slice rather than a separate
task. The replacement treatment still has to be designed here.

Remove the diagonal **Critical** ribbon. Compare a restrained severity badge,
accent rule, and text treatment that remains accessible and does not make the
page feel like an alarm dashboard.

#### UIR-012 — Progressive-disclosure caveat component

**Comments:** 7, 13, 23.

**Status (2026-08-10): specified by D5.** The component API is the three levels:
chip → one plain reason → full provenance behind "Why?". It renders only where
earned, so `/dashboard`'s ITM rate gains a "partial sample" chip while `/leaks`
sheds seven repetitions. Retiring the permanent `HonestyStrip` happens in
UIR-024 slice 2. The component is small; **the audit is the work** — every
rendered metric classified as earning a chip or not, with its denominator — which
is why this is sequenced after UIR-009.

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

**Status (2026-08-10): converted to a build by D6.** The keep/remove decision is
made — the route stays. Scope: encounter history per tournament/session, field
baselines beside every stat, explicit sample-confidence bands, and a real
empty-state design. Per-encounter aggregation does not exist in `db.villains`
yet, so this carries data work as well as UI.

**Gate before scoping:** re-run the observed spread against a real PokerStars
fixture from `src/test/fixtures/`. On the demo dataset VPIP spans 1.1pp across
all 10 opponents and Limp%/3-bet% are 0.0% for every player — if real opponents
also fail to separate, the field baseline is the feature and the per-opponent
table is not.

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

## 5. Dispatch order

### 5.1 Original sequence (superseded 2026-08-10, kept for the record)

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

Steps 1 and 2 are done: Wave 0 landed, and the workshop ratified D1–D7 on
2026-08-10.

### 5.2 Re-sequenced backlog under the ratified decisions

Ordered so that each slice unblocks the next and nothing waits on a decision that
has not been made. One scoped PR per numbered item.

| # | Slice | Why here | Gated by |
|---|---|---|---|
| 1 | **UIR-024 slice 1** — port F-2 primitives (`DossierTable`, `FilterRail`, `EmptyState`, `chartTheme`) with their tests | D7 ratified; already reviewed code; unblocks five tasks | — |
| 2 | **UIR-024 slice 2 / UIR-011** — delete the diagonal ribbon and the permanent `HonestyStrip` | D7's park list is live on main; also clears D5's path | 1 |
| 3 | **UIR-009** — duplicate metric/formula/**denominator** inventory | D2 ratified as audit-first; its output specifies both the D2 re-ask and D3's summary row | — (can run parallel to 1–2) |
| 4 | **UIR-006** — adaptive home body | D1 ratified; no schema or route change needed | 1 |
| 5 | **UIR-005** — state table for the home's data states | Shrunk by D1 from a mode state machine to documentation | 4 |
| 6 | **D3 slice 1** — derived-stats summary row (`store.ts` version bump, written on import/seed, added to `backup.ts`) | D3 ratified; consumes UIR-009's denominator map | 3 |
| 7 | **UIR-008** — restore the `ca7a08b` sidebar money block against real values, `Sidebar.test.tsx` green, plus its mobile form | D3 slice 2 | 6 |
| 8 | **UIR-012** — the shared caveat component | D5 ratified; the audit half depends on UIR-009 | 1, 3 |
| 9 | **UIR-007** — settings drawer absorbing `/data`, `/data` redirect, destructive-actions-in-overlay design, narrow-viewport nav | D4 ratified; carries constraints 1 and 2 from §1.0 | 1 |
| 10 | **UIR-016** — gradeability recovery, starting with the 3,724 `FACING_RAISE` bucket | D5's Level 3 is its surface; the count is now known | 8 |
| 11 | **UIR-021** — Ranges restoration | Biggest single visual win; overflows at all three widths | 1 |
| 12 | **UIR-013 + UIR-014** — Hand Replay reading order and card treatment | Most-looked-at surface; needs the caveat component first | 8 |
| 13 | **UIR-015, UIR-017, UIR-020, UIR-010** — page slices consuming the shared primitives | Each folds in its own share of the 104 off-palette hue classes | 1, 2, 8 |
| 14 | **UIR-023** — Villains repeat-opponent workflow, **after** re-running the stat spread against a real fixture | D6 ratified as a build; constraint 3 from §1.0 gates the scope | — |
| 15 | **D2 re-ask**, then UIR-018 / UIR-019 | Deliberately last: the Dashboard/Career information model is unresolved by design | 3 |
| 16 | **UIR-022** — Arena split into Practice and Curriculum | Independent of every decision above | — |

**Still blocked, by design:** UIR-018 and UIR-019 cannot start until D2 is
re-asked (item 15). Until then `/dashboard` keeps printing `$843.49` five times
and Career stays 15,912px tall — an accepted, recorded cost, not an open bug.

**Not decided here:** the D9-versus-D14 typography conflict, and therefore
UIR-024's F-1 slice. Nothing currently blocked needs it.

### 5.3 Cross-cutting defects found while verifying

Not owned by any single decision; assign to whichever slice touches the file.

- **Horizontal overflow is not confined to Ranges.** `/ranges` overflows at all
  three widths (1604/1440, 1550/1024, 499/390). At 390px so do `/` (1092),
  `/dashboard` (905), `/sessions` (738), `/hands` (687) and `/villains` (461);
  at 1024, `/` (1332) and `/dashboard` (1145). UIR-021 names this defect but owns
  only one of seven pages.
- **The Ranges control row.** At 1024 the position selector renders as one
  unreadable string: `UTG (1836)UTG+1MPMP1MP2HJ (1768)CO (1811)BTN (1742)SB
  (1817)BB` — no spacing, no control chrome, hand counts fused to labels.
- **Palette drift.** 104 off-palette hue classes across 20 files (see D7).
- **Clone depth.** This session's clone arrived shallow at 50 commits, so none of
  §2's historical references resolved — including the `ec39b34` / `f6af6c2` /
  `0a64691` captures UIR-021 mandates as its starting point. It has been
  unshallowed to 262 and all referenced commits plus the `blackout/foundation-v2`
  and `ui/blackout-f*` branches are now reachable. Anyone picking up UIR-021 or
  UIR-024 in a fresh session should run `git rev-list --count HEAD` before
  assuming the history is present.

No tasks from this plan should be inserted into the current stale local task
spool until the spool is reconciled against source and each selected slice has
an owner, allowed files, protocol files, and required checks.
