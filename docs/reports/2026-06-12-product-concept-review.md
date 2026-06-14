---
status: open
---
# Product Concept Review — Vision, Conceptual Critique, New Ideas

**Date:** 2026-06-12
**Companion to:** `2026-06-12-principal-engineer-audit.md` (the technical
audit) and its subagent appendix. That report covers *whether the thing is
built right*; this one covers *whether the right thing is being built*.

---

## Open items

Recovered to `main` on 2026-06-14 from the unmerged `chore/docs-cleanup` branch
(commit `b346101`); body preserved verbatim (2026-06-12 snapshot). These are
**directional product decisions and ideas to consider**, not bugs — triage,
adopt-or-drop, then flip `status: resolved`.

- Decide **mirror vs coach** identity (§2.6); shift from *analyzer* to a *loop* (§2.1).
- Make **"what should I study this week?"** the atomic answer; demote dashboards (§2.2).
- Treat **leaks as living entities**, not list rows (§2.3).
- Consider **cutting villain/MDA depth from v1.0** (§2.4).
- Lean into **calibrated honesty as the brand** — "the only poker tool that tells
  you when it doesn't know" (§1.2).
- New ideas + the v1.0 positioning sentence: §3–§4.

## 1. What the concept gets right — and should say out loud

### 1.1 The market gap is real, and the repo is sitting in it

The poker software landscape has two crowded seats and one empty one:

- **Stat warehouses** (PokerTracker 4, Hand2Note, HM3): enormous databases
  that assume *you* know how to find your own leaks. Powerful, intimidating,
  built for people who already study well.
- **Solver gyms** (GTO Wizard, DTO): theory study divorced from your own
  play. You drill ranges in the abstract; nothing connects to the hands you
  actually misplayed last night.
- **The empty seat:** *"look at MY hands and tell me what to fix, honestly,
  in priority order."* That is a coach, not a tracker. Coaches cost
  $50–200/hr and don't scale down to the $1 buy-in grinder.

This repo's soul is a coach. Its body is currently a tracker. Most of the
conceptual critique below is about closing that gap.

### 1.2 Honest evidence labels are the brand, not a compliance feature

The evidence taxonomy (`unsupported / rule_based / proxy_model /
solver_backed`) and the solver boundary that *refuses* to claim EV are
treated in the docs as guardrails. They are actually the most
differentiated idea in the product. The poker tool market is drowning in
fake authority — everything is marketed as "GTO," every number is presented
with false precision. A tool that says *"here's what we know, here's how
confident we are, and here's what we won't grade yet"* is culturally hard
for incumbents to copy, because their marketing depends on overstatement.

Calibrated honesty is a moat. Lean into it as identity:
**"the only poker tool that tells you when it doesn't know."**

### 1.3 Local-first privacy is right for this audience

Poker players are paranoid about their data for good reasons (opponents
buying hand histories, site ToS gray areas, account security). "Your raw
hands never leave your device unless you explicitly say so" should remain a
*feature* even after a backend exists — local-first with optional sync, not
cloud-first with a local cache.

### 1.4 The low/micro-stakes MTT focus is a strength — own it

The owner's own corpus is $0.45–$2 buy-ins. That is not an embarrassment to
hide; it is the wedge. Micro/low-stakes MTT grinders are: (a) a huge
population, (b) the players with the most fixable leaks and the most to gain
per study-hour, (c) priced out of PT4 + GTO Wizard subscriptions, and (d)
underserved by tools designed for mid/high-stakes pros. Position the
product as **the study tool for grinders trying to move up**, not as a
budget PT4.

---

## 2. What I'd change conceptually

### 2.1 From *analyzer* to *loop* (the biggest one)

The current product is read-only analytics: import → look at dashboards →
leave. Nothing closes the loop. The conceptual reframe:

> **Diagnose → Drill → Re-measure.**

- *Diagnose:* leaks with receipts (already mostly built).
- *Drill:* the Arena — currently a side room — becomes the engine. Your
  leaks generate your drills.
- *Re-measure:* the app shows the leak shrinking across your next imports.

Improvement-over-time is the retention engine and the emotional payoff. No
competitor closes this loop: trackers diagnose without drilling, solver
trainers drill without diagnosing from your hands, and neither re-measures
*your* leak trend. The product that closes it is a coach.

### 2.2 Demote dashboards; make "what should I study this week?" the atomic answer

The dashboard arms race is a fight a solo dev cannot win against 20-year-old
trackers — and it actively pulls toward the fake-stat aesthetic. (The
hardcoded sidebar profit found in the audit is a *symptom* of
dashboard-first thinking: the layout demanded a number before the data could
supply one.) Conceptually, the product's primary surface should answer one
question excellently — *what should I study this week, and why?* — with
dashboards as supporting evidence, not the destination.

### 2.3 Leaks as living entities, not list rows

Today a leak is a row with a severity badge. Conceptually it should be an
entity with a lifecycle:

```
detected → studying → improving → fixed (→ regressed)
```

with a per-leak trend sparkline and a "fixed leaks" history. The single most
motivating screen this product could have is the graveyard of leaks you
killed. That's also the honest version of gamification — no badges for
logging in, progress only when the numbers actually move.

### 2.4 Cut villain/MDA depth from v1.0

Auto-classifying villain archetypes from 30-hand local samples is
statistically perfume — at the owner's volume, against a rotating
low-stakes player pool, those labels are mostly noise wearing a confident
badge, which contradicts the honesty brand. Conceptually it also dilutes
the promise: this is a *hero improvement* product, not a HUD. Keep manual
notes and tags; shelve auto-archetypes until pooled data exists (a future
track, with consent design). This is subtraction-as-strategy: every removed
surface makes the trust story easier to defend in demos.

### 2.5 Design the first five minutes backwards from one sentence

The demo/onboarding should be engineered to produce a single
receipts-attached *"wow, that's me"* moment, e.g.:

> "You folded your big blind to min-raises 9 times where the rule set says
> defend. Here are the 3 most expensive ones — tap to replay."

One specific, personal, verifiable statement beats a tour of nine pages.
Design the import → first-insight path backwards from that sentence, and
measure demo success by whether it lands in the first five minutes.

### 2.6 Decide: mirror or coach

Everything above is one decision wearing six outfits. A *mirror* (tracker)
shows you everything and stays neutral. A *coach* picks what matters, says
it plainly, assigns work, and follows up. The codebase, the docs, and the
redesign brief oscillate between the two. Pick coach. The mirror market is
taken.

---

## 3. New ideas to bring to the table

Ordered roughly by leverage-per-effort.

1. **The Weekly Coach's Note.** Auto-generated one-pager per week of play:
   one leak (with receipts), three hands to review, one Arena drill
   assignment, trend vs last week. It is the product's atomic deliverable,
   the demo artifact, the future shareable unit (when the sharing track
   opens), and the obvious paid hook. Cheap to build: every input already
   exists (leak detector, study plan, proof-hand selector, Arena).

2. **Spaced repetition on your own misplayed spots.** Arena drills already
   exist; the novel mechanic is scheduling: misplayed spots become flashcards
   that return on an SRS curve (again at 1 day, 3 days, a week...) until you
   answer them correctly twice. "Anki for your own mistakes" does not exist
   in poker software, fits MTT study culture perfectly, and turns one
   import into weeks of personalized content — which also softens the
   data-scarcity problem.

3. **Second-opinion mode (single-hand analysis).** Paste one hand history,
   get the scenario classification, the rule-based read, and the confidence
   label. Zero-history utility: kills the cold-start problem (new users get
   value before importing 5k hands), perfect demo unit, natural future
   share unit, and a forcing function for parser robustness on arbitrary
   input.

4. **Shot-taking advisor.** Bankroll + ROI confidence intervals →
   "your evidence supports taking N shots at the $3.50s; variance band says
   expect X." Uses the most trustworthy math in the app (tournament-level
   money), directly serves the move-up dream of the target user, and is a
   feature literally no tracker frames this way. Honest version includes
   the confidence interval — on brand.

5. **Data-confidence meter as a progress mechanic.** Turn the project's own
   bottleneck into user motivation: stats and features visibly "firm up" as
   sample size grows ("import 400 more BB-defense spots to upgrade this
   leak from *directional* to *confident*"). This converts "not enough
   hands" from a hidden weakness into an explicit, honest game loop — and
   nudges users to import more, which feeds the contribution flywheel.

6. **Session bookends.** *Pre-session warmup:* a 2-minute drill of your top
   leak before you register. *Post-session debrief:* import → 90 seconds →
   three hands + one trend delta. Habit loops on both sides of the session
   make the app a ritual rather than a reference. Rituals retain; references
   get bookmarked and forgotten.

7. **Contributor flywheel (already 80% built).** The sanitized
   `contributionPackage` flow exists and is tested. Frame it as a community
   mechanic: "contribute sanitized hands → improve the parser for your
   site/locale → get early features." Every contributor extends the fixture
   corpus and the conservation-invariant coverage. The audit's demo playbook
   operationalizes this; conceptually it deserves to be a permanent product
   surface, not a one-off ask.

8. **Coach-readable export (later, gated).** A PDF/page a *human* coach can
   read in 5 minutes: leak summary, trends, the proof hands. Instead of
   competing with the coaching economy, bridge into it — coaches become a
   distribution channel ("have your students send me their Coach's Note").
   Gated behind the sharing-boundary track, as GOALS.md requires.

9. **Refusal as UI.** Where the engine declines to grade (FACING_3BET cold
   spots, extreme ICM, unsupported sites), say so *in the interface*:
   "We don't grade this spot yet — here's why." Every honest refusal a user
   encounters reinforces the one claim that differentiates the product. The
   audit recommends refusing more spots (false-positive fixes); this idea
   makes the refusals visible brand assets instead of silent gaps.

10. **Variance therapy (small, sneaky-valuable).** MTT grinders quit from
    downswings, not leaks. Using tournament finishes + ROI, show "given
    your ROI and field sizes, a 40-buy-in downswing has probability X —
    you are currently inside normal variance." Honest math (the strong part
    of the codebase), enormous emotional value, near-zero competition.

---

## 4. Positioning sentence and v1.0 conceptual scope

**Positioning:**

> A browser poker coach that studies your own hands, tells you what to fix,
> drills you on it, and shows the leak dying — and admits what it doesn't
> know.

**v1.0 conceptual scope under this lens:**

- **In:** import trust, leak diagnosis with receipts, Weekly Coach's Note,
  Arena drills generated from your own errors (with SRS), leak lifecycle
  trends, shot-taking advisor, data-confidence meter, contributor flywheel.
- **Demoted:** dashboard sprawl (one strong overview is enough), Stats-page
  breadth, villain auto-archetypes (manual notes stay).
- **Unchanged from GOALS.md:** backend/sharing/payments/solver remain gated
  tracks; the honesty boundary is non-negotiable because it *is* the brand.

**Monetization concept (when the gate opens):** the mirror is free
(import, basic stats, hand replay); the coach is paid (Coach's Note, SRS
drills, leak lifecycle, shot advisor). Players pay for outcomes, not
spreadsheets — and the free mirror is the acquisition surface the paid
coach feeds on.

---

*Read-only review; no product code or docs were changed. This file and the
two audit reports are the session's only artifacts.*
