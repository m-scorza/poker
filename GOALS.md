# GOALS.md — the identity gate

> Owner-authored via structured interview, 2026-07-17. This is the
> gatekeeper document every EPIC G reference points at (ROADMAP III-5).
> It records **intent**; `docs/product/STATUS.md` records **fact**. When
> they disagree, STATUS wins on what exists, this file wins on what we're
> trying to build. Changing this file is an owner decision only.

## Identity

**This is a product in validation.** The goal is external users and,
eventually, revenue. The owner's own tournament study is the first test
case and the proof-of-honesty bench — not the end state.

Consequence: the validation track (`docs/validation/USER_VALIDATION_PLAN.md`)
is not optional homework; it is the active gate in front of the expansion
tracks below.

## Who it's for

**Players like the owner:** micro/low-stakes tournament players who want
honest leak-finding without a solver subscription. When a product question
has no obvious answer, decide for that persona — post-session review, real
hand histories, a game plan they can actually follow — not for
high-stakes pros, not for HUD-driven grinders.

## What success looks like (12 months)

1. **Strangers use it weekly** — players the owner doesn't know import
   hands on a recurring basis.
2. **First dollar** — someone pays for a named outcome (the G3 gate opens
   on evidence, not on hope).
3. **Reference-quality repo** — audits stay clean, the honesty boundary
   stays intact, and the codebase remains something worth showing anyone.

Notably *not* on this list: feature count, dashboard breadth, or matching
competitor checklists.

## Boundaries

- **No real-time HUD. Ever.** This is constitutional, not evidence-gated.
  A refusal to become in-game assistance software is part of the identity
  (and keeps the tool clear of site-tooling policy problems). Any PR or
  plan proposing live-play assistance gets refused, full stop.
- **No silent telemetry.** The app phones home nothing by default. If
  usage analytics ever matter for validation, they arrive opt-in and
  through the sharing-boundary work (G2), never quietly.
- **Backend and cloud are next steps, not never-list items.** The owner's
  explicit ruling: accounts/sync (G1) and the sharing/export boundary (G2)
  are committed directions on the path to a real product — sequenced
  behind validation evidence, but planned, not hypothetical. Local-first
  remains the default posture until they land.
- **The honesty boundary is the brand and is non-negotiable.** The app
  compares decisions against pre-defined owner-approved ranges; it does
  not fake solver output or real-time GTO. Where the engine can't grade,
  it says so in the UI (refusal-as-UI). Silence beats error.

## The gates (EPIC G mapping)

| Track | Standing | Opens when |
|---|---|---|
| Validation interviews (E-track) | **Active now** | — this is the current work |
| G1 Backend/accounts | Committed next step | Demo-retention evidence: ≥1 external user returns with a second batch |
| G2 Sharing/export boundary | Committed next step | G1 + explicit user demand |
| G3 Payments/pricing | Planned | A participant names a price for a named outcome |
| G4 Solver evaluation spike | Planned | Analytical milestones complete; evaluation only, per the solver boundary |

## How agents should use this file

Truth order: `code → STATUS.md → GOALS.md → CLAUDE.md → ROADMAP.md`.
Before proposing expansion work (backend, sharing, payments, solver),
check the table above; before proposing anything on the boundaries list,
don't.
