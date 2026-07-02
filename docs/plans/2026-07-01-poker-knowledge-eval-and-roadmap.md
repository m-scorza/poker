# poker-knowledge — Evaluation & Roadmap

> **Status: EVAL DELIVERED; P0 EXECUTED (owner-approved); P1–P3 PLANNED ONLY.**
> Owner directive 2026-07-01: formalize, don't execute. The single action taken
> was the owner-selected privacy flip (P0, verified). Everything else below
> awaits an explicit go.

**Subject:** `github.com/m-scorza/poker-knowledge` (evaluated from a fresh clone
on 2026-07-01: 283 MiB pack, 5 bulk-drop commits, created 2026-06-15, last push
2026-06-23, default branch `master`).

---

## Evaluation

### What it is

A raw study-archive repo, self-described as the "Reg Life Diagnostic & Study
Plan Database":

- **RegLife extracted member content** (`downloaded_materials/`, 263 MB):
  21 Portuguese course PDFs (Estudar da sorte Vol I–III, NERD Playbook, ICM na
  prática, Bounty Power, …) — these are the source materials behind the app's
  `[Vol.X]`/`[NERD]`/`[D#N]` KB attributions; the full **quiz database (223
  scenarios with answer keys** across 16 spots), the **163-lesson curriculum**
  catalog with video links, tiered interactive study plans (HTML/JSON), the
  platform's extracted Tailwind CSS, trainer SVGs, and the RegLife logo.
- **Personal data:** `study_plan_data.json` (the owner's own diagnostic
  results); `public_poker_knowledge.md` contains `file:///C:/Users/<real name>/...`
  links leaking the owner's real name and a local workspace path.
- **Public research** (`downloaded_materials/public/`, 5.4 MB): CFR / Libratus /
  Pluribus / Deep-CFR papers + an Awesome Poker AI index. Unproblematic.
- **Vendored solver repos** (`solvers/`, 104 MB): TexasSolver (C++/Qt,
  **AGPL-3.0**), DCFR-SOLVER (Rust, MIT © 2025 POKERGOSU), and QuickGTO
  (`solvers/gto`, Python/Streamlit trainer — provenance unclear; committed
  `__pycache__`/`.DS_Store` included).

### 🔴 Critical finding (now mitigated)

The repo was **public**. Even with RegLife's express brand-neutral usage
approval (documented in the Hermes research protocol), a public mirror of their
paid materials, logo, platform CSS, and complete answer keys goes far beyond
brand-neutral product use — plus the personal-data and real-name leaks above.

**P0 executed 2026-07-01 with owner approval:** flipped private via
`gh repo edit --visibility private`. Verified: `visibility: PRIVATE`,
unauthenticated API returns 404. Fork/watcher count was **0** before the flip,
so no known GitHub-side copies exist. (Caveat: prior clones/caches can't be
ruled out; the repo was public ~16 days.)

### Strengths

- **The data is exactly what the analyzer needs.** The quiz DB includes graded
  **vs-3bet spots** — the app's grade-FACING_3BET FRONTIER item is "blocked on
  owner-supplied ranges", and those ranges live here. The curriculum taxonomy
  maps onto a study/leak taxonomy; the lesson-recommendation scoring algorithm
  is documented in the README; the solver sources feed the spot-packet lane.
- Extraction is complete and well organized at the file level; README documents
  structure and algorithms clearly.

### Weaknesses

- **A dump, not a project:** no LICENSE or provenance/permission statement, no
  root `.gitignore` (build artifacts committed), vendored solver repos instead
  of pinned references (bloat + licensing incoherence: unlicensed repo default
  over AGPL code + RegLife copyright), broken absolute `file:///` links,
  `master` vs the app repo's `main`, 283 MB of binaries without LFS.
- **Undefined relationship** to the app's distilled `docs/knowledge/strategy/`
  KB — two sources of truth for the same theory, no cross-reference.

---

## Roadmap

### P0 — Stop the exposure ✅ DONE 2026-07-01

Private flip executed and verified (see above). Optional follow-up if the repo
must ever go public again: history rewrite (BFG) to purge RegLife material —
otherwise unnecessary while it stays private.

### P1 — Make it a real private vault

- README provenance + permission-scope statement (RegLife express approval,
  brand-neutral product use, private archive — not for redistribution).
- Root LICENSE-NOTE covering the mixed content (owner notes / RegLife licensed
  material / third-party code under their own licenses).
- `.gitignore` (`__pycache__/`, `.DS_Store`); remove committed artifacts.
- Restructure: `sources/reglife/` (licensed-private), `sources/public/`
  (papers/index), `derived/` (quiz JSON, catalogs, study plans), `tools/`
  (QuickGTO), `research/` (**receives the Hermes `docs/research/` corpus** —
  owner decision 2026-07-01; the public app repo keeps only a pointer).
- Replace vendored TexasSolver/DCFR-SOLVER with pinned references (SOURCES.md
  with upstream URL + SHA + license) — **only after verifying the upstreams
  still exist and match**; anything unverifiable (likely QuickGTO) stays
  vendored rather than deleted.
- Fix/remove the real-name `file:///` links; rename `master` → `main`.
- Working copy: clone properly to
  `C:/Users/MICRO/OneDrive/Documentos/GitHub/poker-knowledge` (next to the app
  repo) before this work; the eval clone in the session scratchpad is temporary.

### P2 — Connect it to the analyzer (the payoff)

- Extract **3-bet-defense / vs-3bet ranges** from the quiz DB + curriculum into
  a codeable grid → unblocks the app's grade-FACING_3BET FRONTIER item
  (see `src/analysis/rangeChecker.ts` header note + ROADMAP "grade the excluded
  scenarios" reminder).
- Map the 223 quiz scenarios into **Arena drill seed packs** (curriculum-driven
  drills alongside the existing SRS-from-your-misplays).
- Port the **lesson-recommendation scoring** (concepts/thresholds only,
  brand-neutral) into the app's study-plan "next lesson" logic.
- **KB-drift cross-check:** app `docs/knowledge/strategy/01–09` vs the source
  PDFs (janitor-style report in the app repo).

### P3 — Solver lane (gated, later)

Build TexasSolver / DCFR-SOLVER locally to generate owner-approved solutions
for the app's excluded scenarios (FACING_ALL_IN pot-odds/ICM, 3-bet pots),
consumed via the spot-packet boundary (salvage slice R3 in the companion plan).
**AGPL stays strictly outside the app bundle** — external-tool boundary,
packets in/out only. Gated behind `GOALS.md` like the rest of EPIC G.

---

## Repo relationship policy (proposed)

- **poker-knowledge (private):** raw sources, licensed material, research
  ledgers, derived datasets, solver experiments. The audit trail.
- **poker (public):** the product; only brand-neutral distilled knowledge
  (`docs/knowledge/strategy/`) and code. Anything naming RegLife/GTO Wizard
  beyond nominative code comments lives in the vault, not here.
