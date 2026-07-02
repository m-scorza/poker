---
status: resolved
date: 2026-07-01
related: ['#114', 'docs/product/ROADMAP.md Act III (The Whetstone)', 'docs/reports/2026-07-01-abyss-audit.md', 'docs/plans/2026-07-01-hermes-worktree-salvage-and-covenant-housekeeping.md', 'docs/plans/2026-07-01-poker-knowledge-eval-and-roadmap.md']
---

# Direction Review — Where This Project Is Going (Act III Proposal)

> Owner asked (2026-07-01): *"re-eval our current roadmap, next steps, where are
> we going, can we make it."* This is the answer. Companion doc: the
> [Abyss Audit](../2026-07-01-abyss-audit.md) covers code quality; this one covers
> direction. **Planning only — nothing here is started until the owner adopts
> an arc into ROADMAP.**

## 1. Where we are (honest state, verified today)

**The covenant delivered.** Act I made the numbers true (chip accounting #94,
conservation invariant in CI, honest denominators). Act II built the coach loop
(Coach's Note is the front door → Arena SRS drills from real misplays →
import-time re-measure), with refusal-as-UI honesty throughout. Post-covenant
landings hardened perf (#112) and disclosure (#113).

**The engine is healthy.** 769/769 tests green. ~22.4k production LOC with
essentially zero `any`, zero lint suppressions, 0.64% duplication, one TODO.
For a solo-owner, multi-agent codebase this is top-tier hygiene. The abyss
audit found real dirt, but it is *localized* dirt with a finite list.

**Assets waiting outside `main`:**
- The Hermes worktree holds ready-to-port slices (refusal completion, import
  provenance, solver spot-packets) — already planned as R1–R5.
- `poker-knowledge` (now private) holds the RegLife-derived quiz database
  whose **vs-3bet answer keys are the exact data that unblocks the
  grade-FACING_3BET frontier item**, plus a 163-lesson curriculum taxonomy.

**Liabilities that shape direction:**
- The hero name has **no editing UI** — `saveHeroName` is dead code. Today the
  app only truly works for `scorza23`. Fine for a personal tool; fatal for a
  product. This single fact is the fork in the road, in miniature.
- `GOALS.md` — the file ROADMAP gates all of EPIC G (backend/sharing/payments/
  solver) behind — **does not exist**. The gate has no gatekeeper.
- The user-validation track (`docs/validation/USER_VALIDATION_PLAN.md`) exists
  as a plan and has never been executed. Zero external evidence of demand.

## 2. Where are we going? Three honest identities

**(A) The personal edge machine.** The owner's own study OS: import → diagnose
→ drill → re-measure, sharpened by the vault's licensed curriculum data and
local solver validation. Success metric: the owner's leaks die and stay dead.
No users, no distribution, no compromises with honesty. *Status: already real,
and every remaining frontier item (grade-the-ungraded, drill seed packs,
spot packets) makes it sharper.*

**(B) The shippable niche product.** A local-first, privacy-absolute MTT study
tool for grinders — positioned exactly where Hermes's competitor ledger says
the gap is: not a HUD (PT4/HM3 own that), not a cloud solver (GTO Wizard owns
that), but a *private upload-to-study loop with honest, rule-based grading*.
Plausible, but it requires: config/onboarding UI (hero name first), multi-site
coverage beyond PokerStars, packaging, support posture, and **evidence anyone
wants it** — which is what the unexecuted validation plan was for. EPIC G
(backend/sharing/payments) sits behind this identity, not before it.

**(C) The portfolio showpiece.** The public repo as an engineering credential:
disciplined docs culture, enforced honesty posture, agent-orchestrated
development. Cheapest to finish — it mostly *is* finished; the abyss audit's
polish waves close the gap.

## 3. Can we make it?

- As **(A)**: yes — it is made. The question is only how sharp it gets.
- As **(C)**: yes — ~90% there; the audit waves + a strong README finish it.
- As **(B)**: unknown, and *unknowable from inside the repo*. The competitor
  research says the positioning is defensible but narrow. The only honest next
  step toward (B) is running the 5-interview validation plan, not writing more
  code. Building EPIC G before that evidence would repeat the exact mistake
  this project's own review culture exists to prevent: shipping conclusions
  before measurements.

**Recommendation: A-first, C-for-free, B-behind-evidence.** Sharpen the
personal machine (that work is identical to what (B) would need anyway),
let the polish waves make the repo a showpiece as a side effect, and gate any
product ambition on validation interviews — not vibes.

## 4. Act III proposal — "The Whetstone" (sharpen what exists)

Six arcs, ordered. Each arc lands via PRs with the full gate; arcs 1–3 are
merge-on-mandate hygiene/correctness; arcs 4–6 carry review checkpoints.

- **Arc 0 — Restore the gate (day 0).** The housekeeping PR (already planned):
  fix the dirty `CoachsNotePage` edit that breaks `typecheck`/`build` today,
  archive the 2026-06-12 reports, tick ROADMAP drift, settle `launch.json`.
- **Arc 1 — Salvage the worktree.** Land Hermes R1 (refusal completion — also
  closes ROADMAP's named follow-ups) → R2 (import provenance) → R3 (spot
  packets, review checkpoint). R4 (Study Queue vs SRS) gets a steer decision:
  the owner sees the diff and picks *merge concepts / port pieces / drop*.
  R5 research corpus moves to the vault.
- **Arc 2 — Abyss cleanup waves.** Execute the audit's Open items in its
  cheapest-first wave order (dead code → efficiency → beauty). Target state:
  zero orphans, one animation library, zero token bypasses, no god-files over
  ~500 lines, node-env tests for pure modules (big CI speedup).
- **Arc 3 — Grade the ungraded (the analytical moat).** Vault P2: extract the
  vs-3bet grid from `poker-knowledge` quiz data → grade `FACING_3BET` for
  real; then `FACING_ALL_IN` via pot-odds + ICM. Every refusal that becomes a
  grade is a feature no competitor's rule-based tier has. This is the highest-
  value poker work available and it is *unblocked now* (the data exists).
- **Arc 4 — Curriculum drills.** Map the vault's 223 quiz scenarios into Arena
  seed packs (curriculum-driven drills alongside SRS-from-your-misplays), and
  port the lesson-recommendation scoring (concepts only, brand-neutral) into
  the study plan. The coach loop stops depending solely on the owner's own
  mistake volume.
- **Arc 5 — The identity gate.** Write `GOALS.md` (the missing gatekeeper):
  either (a) declare identity (A) and codify what this app will *never* do
  (no HUD, no cloud, no telemetry — the privacy:check posture as constitution),
  or (b) commit to running the validation plan's interviews, and only then
  reconsider EPIC G. Also in this arc, fix the hero-name settings UI — it is
  required under *every* identity (even (A): the owner may rename).

**Explicit non-goals for Act III** (from the competitor-ledger guardrails +
parked decisions): no real-time HUD, no global player database claims, no
backend/payments before the identity gate, no villain auto-archetype revival
(parked), no derived-stats cache (F1 exonerated — measured 24ms@25k).

## 5. Success criteria

- Arc 0/1/2: gate green on a clean tree; worktree deleted; audit report flipped
  `resolved`; STATUS prose matches autogen blocks.
- Arc 3: `FACING_3BET` graded with owner-approved ranges + tests; refusal list
  shrinks by one scenario class, honestly.
- Arc 4: Arena offers a curriculum drill with a real answer key; SRS and
  curriculum drills coexist without double-grading.
- Arc 5: `GOALS.md` exists and every EPIC G reference points at a real gate;
  hero name editable in the UI and covered by a test.

## Open items

- [x] Owner picks the identity posture (§2: A / B / C emphasis) — **adopted
      with the proposal as recommended (§3): A-first, C-for-free,
      B-behind-evidence.** Formal codification (the never-list / GOALS.md)
      lands in Arc 5 (ROADMAP III-5), which preserves the declare-(A)-vs-run-
      interviews decision point.
- [x] Owner adopts (or amends) the Whetstone arcs into `docs/product/ROADMAP.md`
      as Act III — **adopted verbatim 2026-07-01** as "Act III — The Whetstone"
      (III-0 … III-5); this report flips `resolved` (adoption = closure, same
      lifecycle as the 2026-06-12 product concept review).
- [x] R4 Study-Queue-vs-SRS steer decision — **carried into ROADMAP III-1** as
      an explicit owner-steer gate (due during Arc 1; also decides abyss F7).
