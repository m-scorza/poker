# CT Curriculum Importer Proposal (III-4, snapshot-powered)

> **Status: APPROVED 2026-07-19 — owner rulings recorded in §7.**
> Q1 lazy chunks, Q3 preflop first, Q4 neutral tags, Q5 ICM/PKO included —
> as recommended. **Q2 amended by owner: keep BOTH pack families**, gated on
> a thorough overlap analysis ("no laziness allowed") — see §6. Slice 1
> (§5.1) is unblocked.

**Goal:** replace the curriculum's thin 230-spot seed base with drills built
from the authorized CT trainer snapshot — 94 complete drill configs with full
dealt ranges and exact-combo answer buckets — while keeping the app repo
brand-clean and the snapshot itself vault-only.

**Outcome (2026-07-23):** slices 1 and 2 are implemented as 94 lazy,
brand-neutral deal-from-range packs (45 preflop, 49 postflop; 765 cells).
Postflop sessions preserve exact suits, board, stack, position, action-line,
and legal-action context. III-4 now has only the separate
lesson-recommendation scoring port left.

---

## 1. The source

`poker-knowledge/research/ct-trainer-2026-07-18/` (vault commit `1795cf4`;
inventory report `research/2026-07-18-ct-trainer-spot-inventory.md`):

- 94 valid configs across 19 categories / 93 unique titles, three tiers.
- 859 position×stack answer groups, 2,914 accepted-action buckets,
  531,027 exact-combo assignments, 7.7 MB raw.
- Each config carries `rangeToBeDealt` (exact combos the drill deals from)
  plus per-cell buckets — so a drill can **deal any hand from the real range
  and grade it**, instead of replaying one of 230 fixed spots.
- Multi-stack cells (e.g. RFI at 100/50/25/15bb per position), postflop
  configs with per-board hero ranges and action history, ICM/PKO RFI
  variants, squeeze, check-raise, probe, delayed c-bet, 3-bet pots.
- Captured with the owner's explicit authorization from the owner's own
  subscription; multi-accepted buckets are **not** solver frequencies and
  must never be labeled solver-backed.

Known source defects to normalize (from the inventory): 4 duplicate catalog
titles, 2 mislabeled squeeze rows, inconsistent labels (`BTN`/`BU`), one
config 404 upstream (absent from the snapshot by design).

## 2. Clean-room boundary

- The importer (`scripts/import-ct-curriculum.ts --snapshot <vault path>`) runs
  offline against the vault clone. The snapshot never enters the app repo;
  no runtime dependency on the external site or API — same posture as the
  existing extract script.
- Normalization target is the provider-neutral shape the inventory proposed
  (`TrainingSpotPolicy`-like): street, hero/villain positions, effective
  stack, optional board + prior-action line (reusing #208's `actionLine`
  conventions), legal actions, accepted-action buckets, dealt range.
- Brand neutrality: a `PACK_COPY`-style English rename map for all 19
  categories and 93 titles (no vendor names, no `MC -` codes in slugs);
  provenance kind `'brand_neutralized_snapshot_config'` with `capturedAt`
  and the vault-relative source path.
- Validation fails loudly on malformed cards, unknown action labels, and
  empty usable dealt ranges. Known snapshot noise is normalized
  deterministically: duplicate rows and board-colliding combos are removed,
  and dealt combos without an accepted-action bucket are never sampled.

## 3. What changes in the Arena

- **Deal-from-range drills:** for a chosen cell, the drill samples a combo
  from the config's dealt range and grades via bucket membership — the same
  mechanic `arenaDrillEngine` already uses (`acceptedActions.includes`),
  now fed by real per-cell buckets instead of a single fixed combo. The 230
  fixed spots become ~859 cells × full ranges.
- Multi-accepted combos grade as mixed (any listed action compliant) — the
  engine already supports this.
- Practice-only posture unchanged: curriculum drills stay outside leak
  grading, SRS-from-misplays, and trainer scores (no double-grading).
- Methodology tags: configs are labeled `GTO cEV` or `MDA / Exploit` at the
  source; proposed to keep as a neutral enum (`gto_cev | mda_exploit`)
  displayed as "solver-derived baseline" / "population exploit" (§7 Q4).

## 4. The size problem (the thing that needs a ruling)

531k combo assignments cannot ship raw: the main bundle is at 391KB of a
432KB budget. Options:

- **A — lazy per-pack chunks (recommended):** importer emits one JSON/TS
  module per pack, dynamically imported when a pack is opened. Main bundle
  grows ~0; dist/PWA precache grows an estimated 1–2MB gzipped (combos
  compress extremely well). Packs work offline after first load, no user
  friction.
- **B — class compaction + chunks:** additionally collapse exact combos to
  the 169 canonical classes wherever a class is uniformly bucketed (most
  preflop cells), keeping exact combos only where suits matter (postflop).
  Smallest footprint, slightly more importer complexity and a lossiness
  audit obligation.
- **C — Data Vault import:** packs are not bundled at all; the owner imports
  a pack file via the `/data` page into Dexie. Cleanest repo, worst UX
  (packs stop being in-the-box).

## 5. Slices

1. **Importer + preflop packs** — RFI (incl. multi-stack + ICM/PKO variants
   per §7 Q5), vs RFI, BB defense, blind war, multiway defense, squeeze,
   facing 3-bet (incl. the jam cells). Fidelity tests pin per-pack
   cell/bucket/combo counts and spot-check anchors transcribed from the
   snapshot manifest hashes.
2. **Postflop packs** — board-aware cells riding on #208's board rendering
   (per-board ranges, `actionLine` from real action history). Review
   checkpoint (Arena UI is already flagged as UI-debt; slice 2 should not
   attempt the visual overhaul, just data).
3. Already-sequenced separate lanes (not this proposal): FACING_3BET
   de-interpolation from the full 3-bet configs; FACING_ALL_IN gold-anchor
   test from the vs-all-in 10bb BTN-vs-CO real range.

## 6. Honesty guardrails

- Per-pack provenance with `capturedAt` + vault path; UI keeps the existing
  practice-only copy.
- No frequency invention: multi-accepted = mixed, full stop.
- Importer is deterministic; regenerating from the same snapshot yields
  byte-identical output (CI-checkable with the committed artifacts).
- The legacy 11 quiz-config packs **stay** (owner ruling Q2), gated on a
  rigorous overlap analysis the importer must emit as a generated report:
  for every legacy spot, the matching snapshot cell (position, stack,
  scenario, combo) if any, and — most importantly — every spot where the
  legacy accepted actions **disagree** with the snapshot buckets for the
  same cell. Disagreements are surfaced for owner review, never silently
  reconciled; the analysis lands in the slice-1 PR as a human-readable
  summary plus the raw generated report. No supersession, no deletion, no
  hand-waved "probably the same" claims.

## 7. Owner decisions (answered 2026-07-19)

- **Q1 — delivery:** **lazy per-pack chunks** (option A). Main bundle
  unchanged; packs load on open and work offline afterward.
- **Q2 — legacy packs:** **keep both**, amended by the owner: a thorough
  overlap analysis is mandatory ("no laziness allowed") — see the §6
  guardrail for the required disagreement report.
- **Q3 — slice 1 scope:** **preflop first**; postflop is slice 2 on top of
  #208's board rendering.
- **Q4 — methodology tags:** **keep** as the neutral `gto_cev` /
  `mda_exploit` enum with neutral display labels.
- **Q5 — ICM/PKO RFI variants:** **include in slice 1**, clearly labeled
  with their tournament-stage context; no engine ICM claims.
