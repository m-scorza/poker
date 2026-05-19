# 00 — Design Control Cockpit

**Status:** review draft — design brief, not implementation contract  
**Purpose:** guide the dashboard redesign before implementation.  
**Important boundary:** this is **not** a repo source of truth. It is our product/design cockpit for deciding what the redesign should feel like, what the dashboard should prioritize, and how future HTML versions should be judged.

This document may borrow from repo reality, market benchmarks, and teammate feedback, but it does not define shipped code, route contracts, parser behavior, database schema, or final metric formulas.

---

## 1. What we are trying to build

A private poker performance tool for serious online MTT players who treat the game like a discipline.

The product reads a player's imported hand histories and tournament data to answer:

1. **Am I profitable?**
2. **What is the biggest thing holding me back?**
3. **What should I review, compare, or drill next?**

The product sits between two worlds:

- Traditional trackers: powerful, but dense, dated, and often too raw.
- Solvers/study tools: rigorous, but complex, expensive, and not always designed around the player's own database.

The product's lane is:

> **A private, confidence-aware poker performance lab that turns imported hands into one clear next action.**

It should feel like a serious poker cockpit: calm, sharp, financial, and proof-backed — not a neon HUD, not a generic analytics dashboard, and not a solver clone.

---

## 2. The 30-second promise

Within 30 seconds of opening the dashboard, the player should understand:

### 1. Financial state

Are they winning or losing?

Shown through the Money Hero:

- Net profit.
- ROI.
- ABI.
- ITM.
- Volume.
- Recent trend, using the most reliable available unit for the active scope.
- Data/financial confidence.

### 2. Main blocker

What is the highest-impact, highest-confidence issue right now?

Shown through:

- One top blocker.
- Clear position/spot label.
- Sample size.
- Confidence.
- Estimated impact.
- Evidence preview.

### 3. Next action

What should they click next?

Shown through one primary CTA:

- Fix import confidence.
- Import more hands/summaries.
- Review hands.
- Compare range.
- Start drill, only when supported.

The dashboard is successful when it says:

> **Here is where you stand. Here is the signal we trust most. Here is the next click.**

---

## 3. Product posture

### Core posture

The product is:

- Diagnosis-first.
- Impact-coded.
- Dollar-aware when supported.
- Confidence-labeled.
- Proof-backed through ranges, hands, and samples.
- Built around action, not stat browsing.

### Better wording than “dollar-coded”

The product should absolutely make poker feel financially real, especially for MTT players. But tactical leak dollar estimates can become fake precision if the math or import data is weak.

So the product stance is:

> **Impact-coded. Dollar-aware when the data supports it. Always confidence-labeled.**

Money is still the hero for career and tournament performance. Leak impact should use the most trustworthy available unit.

---

## 4. Target audience

### Primary user

A serious self-coaching online MTT grinder.

Typical profile:

- Plays micro-to-low stakes tournaments.
- Roughly $1–$25 ABI.
- Understands poker-native terms: VPIP, PFR, 3-bet, ROI, ITM, ABI, stack depth, bb/100, ranges, villains, leaks.
- Has enough volume to care about sample size.
- Wants useful diagnosis without hiring a coach.
- Wants the tool to speak like a serious poker peer.

Primary questions:

- “Am I actually winning?”
- “Where am I bleeding value?”
- “Is this signal real or variance?”
- “What should I fix first?”

### Secondary user

An aspirational low-to-mid-stakes player trying to move up.

Additional questions:

- “Am I ready for the next stake?”
- “Which leak becomes expensive as ABI increases?”
- “Is my current win rate supported by enough sample?”

### Not the initial design target

- Players who mainly want a live HUD.
- Cash-game-first players.
- Solver power users who already run custom sims.
- Beginners who need basic poker education.
- Public/community/social users.

---

## 5. Core product loop

The product loop is:

> **Diagnose → Prove → Review → Drill → Track**

### Diagnose

Find the most important current issue.

Primary surfaces:

- Dashboard.
- Leaks.
- Stats, if kept as an advanced surface.

### Prove

Show why the tool believes the issue is real.

Evidence may include:

- Sample size.
- Confidence.
- Baseline comparison.
- Range difference.
- Stack band concentration.
- Supporting KPIs.
- Matching hands.

Primary surfaces:

- Leaks.
- Ranges.
- Hands.

### Review

Let the player inspect the actual hands behind the signal.

Primary surface:

- Hands.

### Drill

Turn diagnosis into repetition.

Primary surface:

- Arena.

### Track

Show whether the player is improving.

Primary surfaces:

- Dashboard.
- Career.
- Sessions.

This loop is the actual product. Every redesigned module should support one part of it.

---

## 6. Dashboard thesis

The dashboard is not a stats overview.

The dashboard is a **decision surface**.

It should answer:

1. What is my financial state?
2. How much do we trust the data?
3. What is the highest-confidence blocker?
4. What evidence supports it?
5. What should I click next?

The dashboard should not try to be:

- The full hand database.
- The full range explorer.
- The full leak report.
- The full career page.
- The full practice arena.
- A miniature version of every page.

It should be the triage layer that points the user into the right deep surface.

---

## 7. Data confidence principle

The app must never present a precise conclusion with vague data.

Every major dashboard conclusion should be affected by data confidence.

### High confidence

Conditions may include:

- Hands imported correctly.
- Tournament summaries matched.
- Buy-ins and prizes parsed.
- Hero identified.
- Positions mapped.
- Supported site/format.
- No major parser warnings.

UI behavior:

- Money Hero can show full financial metrics.
- Estimated dollar impact can be shown if formula support exists.
- Top blocker can be framed as actionable.
- CTA can point to review/range/drill.

### Medium confidence

Conditions may include:

- Hands parsed, but some summaries are missing.
- Financial metadata incomplete.
- Some unsupported files or warnings.
- Enough tactical sample, but incomplete tournament economics.

UI behavior:

- Money Hero includes qualification.
- Dollar estimates become “estimated” or are softened.
- Leak ranking may use bb/opportunity or bb/100 instead of $/T.
- CTA may suggest fixing missing summaries before acting on financial conclusions.

### Low confidence

Conditions may include:

- Missing buy-ins.
- Missing tournament summaries.
- Unsupported format/site.
- Unknown hero.
- Very low sample.
- Parser warnings affecting core metrics.

UI behavior:

- Money Hero becomes qualified or incomplete.
- Dollar estimates are hidden.
- Readiness/stake advice is disabled.
- Top blocker becomes tentative or unavailable.
- Primary CTA becomes “Fix import confidence” or “Import more data.”

### Empty/degraded state rule

Bad:

> “You are losing $0.62/T from BB defense” with 9 opportunities.

Good:

> “Not enough BB defense spots yet. Import more hands or review raw BB hands.”

Bad:

> “ROI: 0%” when tournament summaries are missing.

Good:

> “ROI unavailable — tournament summaries missing.”

---

## 8. Empty and degraded state matrix

The dashboard should not be designed only for the perfect happy path.

| State | Dashboard behavior | Primary CTA |
|---|---|---|
| No hands imported | Empty Money Hero, no leak claims, onboarding/import prompt | Import hands |
| Hands imported, no tournament summaries | Tactical stats may appear, but ROI/profit/ABI are unavailable or qualified | Add tournament summaries |
| Summaries imported, weak hand sample | Financial state may appear, but leak claims remain tentative | Import more hands |
| Good hands, weak financial data | Tactical leak ranking can use bb/opportunity or bb/100; dollar estimates hidden or softened | Fix financial metadata |
| Parser warnings present | Show warning in confidence header and diagnostics drawer | Review import warnings |
| High-confidence full state | Money Hero, top blocker, evidence, and one next action are fully enabled | Review top leak hands |

This state matrix should be checked before each dashboard mockup iteration. If the design only works for the high-confidence full state, it is incomplete.

---

## 9. Impact-unit principle

The dashboard should rank problems using the most trustworthy impact unit available.

### Preferred hierarchy

1. **Sample/opportunities** — always shown when relevant.
2. **bb/opportunity or bb/100** — tactical leak impact when hand data is reliable.
3. **Tournament-context weighting** — when tournament metadata is reliable.
4. **Estimated $/T** — only when summaries, ABI, sample, and formula support are strong enough.

### Copy rule

Use precise money language only when supported.

Allowed when supported:

> “Estimated -$0.62/T”

Safer fallback:

> “High-impact leak · 1,142 opportunities · dollar estimate unavailable”

Best general label:

> “Estimated impact”

Avoid unsupported precision.

---

## 10. Strategy baseline language

Avoid claiming solver-grade accuracy unless the underlying baseline is actually solver-derived and documented.

Preferred language:

- Reference Baseline.
- Baseline Strategy.
- Game Plan baseline, if applicable.
- Player vs Baseline.

Use “GTO” only when the baseline is genuinely solver-backed and documented.

The dashboard can still show a baseline comparison, but it must not imply false precision.

---

## 11. GTO Wizard structural lesson

GTO Wizard is useful as workflow inspiration, not as a UI or claims model.

The useful lesson is separation of jobs:

- Analyze finds the mistake.
- Study explains the correct strategy.
- Practice builds skill through repetition.
- Reports expose broader patterns.
- Ranges/Breakdown prove strategy composition.

For this product, the equivalent structure is:

- Dashboard = triage and next action.
- Leaks = full diagnosis.
- Ranges = baseline proof.
- Hands = exact review.
- Arena = drills.
- Career/Sessions = long-term and session tracking.

We borrow the workflow separation, not the visual design or solver-accuracy posture.

---

## 12. Design ownership map

This is a design map, not a repo contract.

### Dashboard

Owns:

- Money Hero.
- Data confidence status.
- Main verdict.
- One top blocker.
- One primary CTA.
- Top 3 leak preview.
- Compact evidence strip.
- Range preview tied to active blocker.
- Stack-band context only when relevant.
- Collapsed diagnostics.

Does not own:

- Full hand review.
- Full range library.
- Full leak history.
- Full career timeline.
- Full villain analysis.
- Advanced reports.

### Leaks

Owns:

- Full leak queue.
- Selected leak detail.
- Impact model.
- Confidence/severity/sample.
- Supporting hands.
- Leak history.
- CTA to ranges, hands, arena.

### Hands

Owns:

- Full searchable/filterable hand table.
- Replay.
- Tags.
- Starred/reviewed state.
- Raw evidence behind any recommendation.

### Ranges

Owns:

- Full 13×13 matrices.
- Position and stack controls.
- Player vs Baseline vs Difference overlays.
- Sample-size annotations.
- Range explanation.

### Arena

Owns:

- Drills.
- Quizzes.
- Repetition.
- Accuracy and progress.

Dashboard should only point to Arena when the drill set is trustworthy.

### Career

Owns:

- Long-term profit story.
- ROI.
- ITM.
- ABI.
- Best cash.
- Drawdown.
- Milestones.
- By-stake breakdown.
- Progress over time.

Career can be beautiful and profile-like, but the Dashboard should not duplicate it unless the preview directly supports the recommendation.

### Sessions

Owns:

- Individual sessions.
- Session results.
- Hands played.
- Session deviations.
- Session-level review path.

### Villains

Owns:

- Opponent profiles.
- Villain classifications.
- Per-villain tendencies.
- Links to hands/leaks.

“Villains” is the correct poker-native term. “Predator” language is experimental and should not be primary until it proves useful without making the product feel gimmicky.

### Stats

Potential role:

- Advanced reports.
- Legacy/transition stat surface.
- Aggregated non-dashboard metrics.

Open decision:

- Keep as advanced reports, or fold its core ownership into Dashboard, Leaks, Career, and Sessions.

---

## 13. Module readiness labels

The cockpit can discuss all product surfaces, but the dashboard should not treat every shipped or imagined module as equally reliable.

Every dashboard module should be tagged as one of:

- **Shipped and reliable** — safe to make primary when data confidence is high.
- **Shipped but confidence-gated** — available, but not safe as primary without sample/data support.
- **Prototype/design-only** — useful for mockups, not assumed real.
- **Future** — strategic direction, not v5 dependency.

Working examples:

| Module | Readiness stance for dashboard design |
|---|---|
| Money Hero | Reliable only when tournament summaries, buy-ins, prizes, and hero identity are present. |
| Leak Queue | Core design concept, but dollar ranking requires formula and financial metadata support. |
| Range Preview | Valuable evidence module; baseline language must remain non-solver unless verified. |
| Top Blocker | Primary only when sample/confidence are sufficient. Otherwise tentative. |
| Arena CTA | Confidence-gated; should appear only when drill generation is trustworthy for the active leak. |
| Villain context | Deep-page first; dashboard only if sample/confidence is high and the note helps the current blocker. |
| Career Arc | Optional dashboard preview; should not compete with the main action layer. |
| Readiness / stake advice | Gated; should not be a strong recommendation until formulas and samples are defensible. |

---

## 14. Dashboard v5 structure

The next design target is:

> `dashboard-v5-action-layer.html`

Goal:

> Make the dashboard explicitly answer “what now?” while preserving the strong visual identity from v4.

### Recommended visible zones

#### A. Scope + confidence header

Shows:

- Active scope: Lifetime / 30d / Session.
- Site/database context.
- Import/data confidence.
- Missing summary warnings if relevant.

Purpose:

- Prevent conclusions from feeling ungrounded.

#### B. Money Hero

Always the visual anchor.

Shows:

- Net profit.
- ROI.
- ABI.
- Volume.
- ITM.
- Recent trend.
- Financial confidence badge.

The chip stack visual stays. It is part of the product personality and should remain, as long as it does not overpower the action layer.

Design principle:

> The chip stack should make the product feel poker-native and financial, not casino-like.

#### C. Decision Card

Reads as:

- Decision.
- Reason.
- Next action.

Example structure:

> **Profitable sample. Fix BTN open width before adding volume.**  
> 1,142 matching opportunities · confidence high · biggest current blocker.  
> CTA: Review BTN hands.

#### D. Evidence Pair

Two linked modules:

1. Top Blocker.
2. Range Preview.

Changing the selected position/spot updates both.

Purpose:

- The user sees not only what is wrong, but why.

#### E. Supporting Context Strip

Shows only what supports the active recommendation:

- Sample.
- Confidence.
- Impact unit.
- Stack band.
- 1–2 relevant KPIs.

Avoid turning this into a full KPI wall.

#### F. Leak Queue Preview

Show:

- Top 3 leaks.
- Top blocker expanded.
- Other two collapsed.
- CTA: View all leaks.

Do not show top 5 by default on the dashboard.

#### G. Diagnostics Drawer

Collapsed by default.

Owns:

- Import warnings.
- Missing summaries.
- Parser confidence.
- Unsupported files.
- Advanced stat diagnostics.

---

## 15. Dashboard CTA priority

The dashboard should have one primary CTA at a time.

Priority order:

### 1. Low data confidence

Primary CTA:

> Fix import confidence

or

> Review import warnings

### 2. Insufficient sample

Primary CTA:

> Import more hands

or

> Add tournament summaries

### 3. Reliable top leak with hand evidence

Primary CTA:

> Review hands

### 4. Reliable range baseline exists

Secondary CTA:

> Compare range

### 5. Drill is trustworthy and relevant

Primary or secondary CTA:

> Start drill

Drill should usually come after evidence review, not before.

---

## 16. Visual identity principles

### Emotional target

The product should feel:

- Serious.
- Calm.
- Sharp.
- Poker-native.
- Financially grounded.
- Audited, not hyped.
- Premium, but not flashy.

### Keep

- Dark interface.
- Money-first hero.
- Chip stack visual.
- Violet accent.
- Green for financial-positive states.
- Red for financial-negative states.
- Mono/tabular numerals.
- Range matrix visuals.
- Subtle micro-status marks.
- Collapsed diagnostics.

### Avoid

- Neon HUD chrome.
- Casino energy.
- Fake “AI coach” gloss.
- Heavy glassmorphism on dense data.
- Overcolored cards.
- Excessive confidence from weak data.
- Generic SaaS dashboard feel.

### Numbers

Numbers should feel audited.

Use:

- Mono/tabular numerals.
- Clear units.
- Explicit confidence labels.
- Honest missing-data states.

Avoid:

- Fake precision.
- Unsupported dollar projections.
- Overclaiming sample reliability.

---

## 17. Language rules

### Use poker-native language

Allowed:

- Villains.
- BTN.
- CO.
- BB.
- Stack bands.
- VPIP.
- PFR.
- 3-bet.
- ROI.
- ABI.
- ITM.
- bb/100.
- Range.
- Leak.

Do not over-explain standard poker terms for the primary audience.

### Avoid invented marketing language

Avoid or use carefully:

- Dollar-coded.
- Digitally bonded.
- Predator, unless validated.
- AI coach.
- Solver-grade, unless true.
- GTO, unless documented.

### Preferred phrasing

Use:

- Top blocker.
- Estimated impact.
- Reference baseline.
- Confidence high/medium/low.
- Matching opportunities.
- Review hands.
- Compare range.
- Start drill.

---

## 18. Pretty is allowed

The dashboard should be functional, but it should still be beautiful.

The redesign should not become sterile just because we are adding data confidence and product skepticism.

Important visual elements to preserve or improve:

- Chip stack hero.
- Large money number.
- Dark premium surface.
- Range grid as a signature product object.
- Crisp cards.
- Smooth interaction states.
- Poker-native geometry.

The goal is not to remove personality. The goal is to make the personality trustworthy.

---

## 19. V1 / later boundary for design thinking

This is a design boundary, not a repo implementation commitment.

### Design as central now

- Dashboard.
- Money Hero.
- Data confidence.
- Main verdict.
- Top blocker.
- Range preview.
- Leak queue preview.
- Hands/ranges CTAs.

### Design as available but gated

- Arena drills.
- Villain analysis.
- Readiness/stake advice.
- Dollar leak estimates.
- ICM-specific claims.

### Defer from dashboard focus

- Pricing/funnel optimization.
- Public sharing artifacts.
- Community/social features.
- Live HUD.
- Cash-game mode.
- Full mobile redesign.
- Brand name/mark finalization.

### Dashboard v5 non-goals

Dashboard v5 should not introduce:

- New pricing UI.
- Share/export/community artifacts.
- Reg Life-branded public positioning.
- Solver-grade or GTO claims without documented support.
- New unsupported formula claims.
- Full mobile redesign.
- A full career page embedded into the dashboard.
- A full reports page embedded into the dashboard.
- A drill-first workflow before the evidence is reviewable.

---

## 20. Pre-review dashboard decisions

### Decided for v5

1. Dashboard is a decision surface, not a report overview.
2. Money Hero stays dominant.
3. Chip stack stays.
4. Add data/financial confidence near the top.
5. Show one primary blocker.
6. Show top 3 leak preview, not top 5.
7. Use “Reference Baseline” or safer baseline language.
8. Use “estimated impact” unless dollar math is supported.
9. One primary CTA at a time.
10. Diagnostics collapsed by default.
11. Range preview remains, but only as proof for the active blocker.
12. Career Arc is optional and should be removed/shrunk if it competes with actionability.

### Still open for review

1. How large should the Money Hero be after adding confidence/action modules?
2. Should KPI strip remain visible, or move lower/collapsed?
3. Should stack bands sit beside Top Blocker or inside the evidence strip?
4. Should Career Arc appear on Dashboard v5 at all?
5. How explicit should import confidence be visually?
6. Should the range preview show player/baseline/diff in one compact grid, or one active mode at a time?
7. When does Arena become a dashboard CTA?
8. Should villain context appear on the dashboard, or only in deep pages?

---

## 21. Success criteria for dashboard v5

A fluent poker player opening v5 should understand within 10 seconds:

1. Whether they are profitable.
2. Whether the financial data is trustworthy.
3. Their biggest current blocker.
4. Why the tool believes that blocker matters.
5. What they should click next.

If the user cannot identify the next click quickly, v5 fails.

If the dashboard looks beautiful but overclaims weak data, v5 fails.

If the dashboard becomes a mini version of every page, v5 fails.

If the dashboard loses the strong poker-native visual identity, v5 fails.

---

## 22. Working north star

> **A serious, private poker performance cockpit that shows your financial state, identifies the most trustworthy blocker, proves it with data, and gives you one next click.**

The dashboard should feel like the player opened the app and immediately got a useful answer — not a pile of stats.

