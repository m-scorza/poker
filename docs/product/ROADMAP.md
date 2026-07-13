# Project Roadmap — Poker Hand Analyzer (scorza23)

> **Scope:** historical phase log + prioritised punch list.
> **What's actually shipped** lives in `STATUS.md` — read that first.
> If this file and `STATUS.md` disagree, STATUS.md wins; fix this one.

---

## Active Covenant (2026-06-20) — current punch list

The live, prioritised work. This is the *current* priority order; the dated
"Maintenance & Punch List" further down is retained as history. Direction set by
the 2026-06-12 reviews and the owner's 2026-06-20 decision: **make the numbers
true first, then build the coach loop** — both, sequenced.

### Owner UI/product review (2026-07-10) — planned only

The owner completed a 33-comment element-level review of the running app and
requested planning only. The resulting product-mode decisions, correctness
triage, historical-design references, and 24-task UI backlog live in
[`docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`](../plans/2026-07-10-owner-ui-review-and-product-modes.md).
No implementation is authorized by this roadmap entry. The plan's central
question is whether startup and navigation should adapt between import-first
and train-first users before the individual pages are redesigned.

### Act I — Make the numbers true (correctness foundation)

- [x] **I-1 · Parser chip accounting (EPIC A1)** — keystone. ✅ **Merged
      (PR #94, 2026-06-20):** per-street committed-chips + `Uncalled bet …
      returned` handling in `pokerstars.ts` and `ggpoker.ts`. Corpus chip
      conservation rose 324 → 3048 / 3285 hands.
- [x] **I-2 · Conservation invariant in CI (EPIC A2)** — ✅ done in this PR: a
      `Σ nets === −rake` sweep guards `fixtureSweep.test.ts`. The ~237 residuals
      were sitting-out players dropped from `villainDeltas`; now reincluded, so
      all 3285 hero-seated hands conserve. Carve-out: sit-out-*hero* hands
      (no seat → dead-ante non-event) are excluded and documented in the test.
- [x] **I-3 · `FACING_3BET` scenario (EPIC B4)** — ✅ done in this PR:
      `≥2 raises before hero → FACING_3BET`, excluded from compliance (no false
      OVERFOLD, and facing-3bet spots no longer pollute `threeBetOpps`) until real
      3-bet-defense ranges exist (see the "grade the excluded scenarios" reminder
      under Gated / later).
- [x] **I-4 · Real leak denominators + honest confidence (EPIC B5)** — ✅ done in
      this PR: postflop leaks fire on error *rate* over gradeable opportunities
      (not raw counts), with confidence keyed off the opportunity sample. A
      95%-correct, high-volume spot no longer manufactures a high-severity /
      high-confidence leak; `MISSED_CBET` is left to the aggregate c-bet leak.
- [x] **I-5 · `HandsUpload.tsx` test coverage (EPIC D2)** — ✅ done in this PR:
      14 tests now cover ZIP extraction + per-entry/decompressed guards, worker
      wiring (FILE_ERROR / COMPLETE / FATAL_ERROR / onerror), the CQ-3 error
      terminal states, and data-health / re-import-notice rendering.
      **→ Act I (make the numbers true) is complete.**

### Act II — Begin the coach loop (product reframe; after I-1)

Adopted from the 2026-06-12 product concept review (now archived): shift from
*analyzer* to a **Diagnose → Drill → Re-measure** loop. Each needs true P&L
underneath, hence sequenced after I-1.

- [x] **Coach's Note** — ✅ first slice done in this PR (`/coach`):
      `buildCoachsNote` composes the now-correct study queue + `selectProofHands`
      into a focus leak + receipt hands + an Arena drill. A discriminated result
      (insufficient-data / all-clear / focus) keeps it honest — empty receipts
      say "no single hand is decisive" rather than invent one. **Trend deferred**
      to v2 (per-session ≠ per-week; a wrong arrow is anti-brand), and so is the
      literal weekly windowing — it operates on the current dataset.
- [x] **Leaks as living entities** — ✅ first slice done in this PR: a persisted
      leak lifecycle (`active → studying → resolved → regressed`) with a "leaks
      you've killed" graveyard on LeaksPage. **Auto-resolve is gated on
      `studying`** (only a leak you marked & beat earns a tombstone — untouched
      leaks dropping below threshold never mint one), and the lifecycle advances
      **at import** (the re-measure event), never on render. `reconcileLeakStatuses`
      is pure + idempotent. **Trend sparkline deferred** to v2 (needs time-series
      snapshots — same fabricated-signal risk deferred on the Coach's Note).
- [x] **Demote dashboards** — ✅ done (PR #109): `/` now renders the Coach's Note
      (the front door — "what should I study, and why?"); the dashboard moved to
      `/dashboard` and into the sidebar's "Reports" section as supporting evidence.
- [x] **SRS drills from your own mistakes** — ✅ done (PR #106): Arena "Spaced
      Review" fed from hero's actual misplay *patterns* (`srsScheduler.ts`, Leitner
      schedule, db v7 `srsReview`). The pattern key carries every input the grader
      branches on (opener, stack bucket) so a card can't mask a leak. The Coach's
      Note's existing "Drill it → The Arena" CTA now lands on a real-mistakes drill.
- [x] **Refusal-as-UI** — ✅ first slice done in this PR: HandReplay now shows an
      explicit **"Not graded — here's why"** for scenarios the engine declines to
      grade (`FACING_3BET`, `FACING_ALL_IN`, `BB_VS_LARGE_RAISE`, `BB_VS_LIMP`)
      via `complianceExclusionReason`, instead of a blank/red badge. (Stats/Leaks
      refusal surfacing + the position-specific `FACING_RAISE` BTN/BB case are
      follow-ups.)
- [x] **Cut villain auto-archetypes from v1.0 (lean) — ⏸ PARKED for revival.**
      2026-06-23: stopped computing + showing auto-archetypes. VillainsPage and
      CareerPage now show only observed stats + manual notes — no guessed
      Fish/Nit/TAG label, no archetype filter, no exploit-advice block, and no
      ungated "REC" badge (`isRecreational` labelled on any sample size). `store.ts`
      no longer calls `classifyVillain`. **The classifier, the `VillainArchetype`
      type, and the profile `archetype`/`archetypeConfidence` fields are kept
      DORMANT (exported + still tested)** so revival is just re-wiring the call
      sites — see the banner in `src/analysis/villainClassifier.ts`.
      **⏸ The owner wants to bring archetypes back later, done properly, _when
      better-resourced_ — do NOT delete the dormant code; revive it then.**
      (The dead archetype→exploit cross-ref scaffolding was removed separately in
      #107; that was genuinely unused, unlike the dormant classifier.)

**→ Act II (the coach loop) is complete.** Diagnose (Coach's Note + living
leaks) → Drill (Arena Spaced Review) → Re-measure (import-time reconcile), with
the Coach's Note as the front door and honesty (refusal-as-UI, parked
archetypes) throughout. Remaining direction lives under Gated / later.

### Act III — The Whetstone (adopted 2026-07-01): sharpen what exists

Adopted from the 2026-07-01 direction review (archived:
`docs/reports/archive/2026-07-01-direction-review-act-iii.md`). Posture, per
that review's recommendation: **A-first, C-for-free, B-behind-evidence** —
sharpen the personal edge machine (that work is identical to what a product
would need anyway), let the polish waves make the repo a showpiece as a side
effect, and gate product ambition (EPIC G) on validation evidence, not vibes.
Arcs 0–2 are merge-on-mandate hygiene/correctness; arcs 3–5 carry review
checkpoints. Sequencing rule: **the abyss waves 2–4 run after the Hermes
salvage slices land** (same pages; salvage-first avoids porting churn).

- [x] **III-0 · Restore the gate (Arc 0)** — the housekeeping PR: finished the
      dirty `CoachsNotePage` edit that had broken `typecheck`/`build` (abyss
      F1), archived the 2026-06-12 reports, settled `launch.json`. ✅ **Landed
      (PR #116, abyss Wave 0)** — the gate has been fully green since.
      Plan: `docs/plans/2026-07-01-hermes-worktree-salvage-and-covenant-housekeeping.md`.
- [x] **III-1 · Salvage the worktree (Arc 1)** — land Hermes R1 (refusal
      completion — closes the refusal-as-UI follow-ups named under Act II) →
      R2 (import provenance) → R3 (spot packets; review checkpoint). **R1–R3
      landed** (e.g. #118 provenance, spot packets in tree). **R4 steered
      2026-07-09: DROP** — the R4 material rebuilt `StudyPlanCard` for the
      demoted dashboard, and #132's Arena curriculum/SRS/Study Queue
      supersedes the concept (F7 was already deleted in abyss Wave 2). The
      Hermes WIP is fully preserved on `hermes/worktree-20260627-213824`
      (pushed to origin, final snapshot `a5b60da`); the worktree checkout is
      removed. **Only R5 remains** — research corpus moves to the vault
      (source material lives on the preserved branch:
      `docs/research/CLAIMS_LEDGER.md`, `SOURCE_LEDGER.md`). Same plan doc
      as III-0. ✅ **R5 landed — Arc 1 complete (verified 2026-07-12):** the
      corpus was absorbed into the private `poker-knowledge` repo under
      `research/` (commit `60a1564`, pushed) and the app repo's
      `docs/research/` is the pointer README only. Loose end outside the
      repo: the stale `Downloads/poker-claude` snapshot is still awaiting
      the owner's manual delete (permission-gated, twice).
- [x] **III-2 · Abyss cleanup waves (Arc 2)** — execute the abyss audit's wave
      plan (F1–F29, cheapest-truth-first: correctness quickies → dead code →
      efficiency → beauty). Target state: zero orphans, one animation library,
      zero token bypasses, no god-files over ~500 lines, node-env tests for
      pure modules (biggest CI win). Report:
      `docs/reports/archive/2026-07-01-abyss-audit.md` (flipped `resolved`).
      ✅ **Complete 2026-07-12** — all five waves landed or steered across
      #116 → #190; report flipped `resolved` and archived. Residuals, named
      honestly: F12 animation-library convergence steered DEFER (gsap
      confined to the lazy dashboard chunk), and the F17 Tailwind-accent
      residual struck (revisit inside the owner UI-overhaul lane). F2
      hero-name UI is Arc 5's, not this arc's.
- [ ] **III-3 · Grade the ungraded (Arc 3)** — the analytical moat, unblocked
      now: extract the vs-3bet grid from the private `poker-knowledge` quiz
      data → grade `FACING_3BET` with owner-approved ranges + tests; then
      `FACING_ALL_IN` via pot-odds + ICM. Every refusal that becomes a real
      grade is a feature no competitor's rule-based tier has. Closes the ⏳
      reminder below. Plan: `docs/plans/2026-07-01-poker-knowledge-eval-and-roadmap.md`.
- [ ] **III-4 · Curriculum drills (Arc 4)** — map the vault's 223 quiz
      scenarios into Arena seed packs (curriculum drills alongside
      SRS-from-your-misplays, no double-grading) and port the
      lesson-recommendation scoring (concepts only, brand-neutral) into the
      study plan. The coach loop stops depending solely on the owner's own
      mistake volume. Review checkpoint.
- [ ] **III-5 · The identity gate (Arc 5)** — write `GOALS.md` (the missing
      gatekeeper every EPIC G reference points at): either declare identity
      (A) and codify the never-list (no HUD, no cloud, no telemetry) as
      constitution, or commit to running the validation plan's interviews
      before reconsidering EPIC G. Also in this arc: the **hero-name settings
      UI** (abyss F2 — required under every identity) with a test, and the
      **strategy-profile selector** (2026-07-13 health review: profile is
      pinned to `game_plan` — `setStrategyProfile` has zero UI call sites in
      the repo's entire history, so the `advanced` profile is unreachable dark
      code; when wiring either editor, normalize input — `setHeroName`
      persists untrimmed whitespace verbatim, see `appStore.test.ts:175`).
      Review checkpoint.
      *Update: the settings-UI slice landed — `SettingsCard` on the `/data` page
      wires both editors (hero name persists to the Dexie `settings` table,
      profile via Zustand) and `setHeroName` now trims at the store boundary;
      the `GOALS.md` gatekeeper decision remains open, so this box stays
      unticked.*

**Act III non-goals** (competitor-ledger guardrails + parked decisions): no
real-time HUD, no global player-database claims, no backend/payments before
the identity gate, no villain auto-archetype revival (parked), no
derived-stats cache (exonerated — measured 24ms @ 25k hands).

### Out-of-the-box slate (2026-07-07, owner-mandated "outside the box")

Shipped alongside Act III, deliberately off the abyss-wave files (owner
executes Waves 2–4 separately). One PR, five additions, all local-first with
honest sample gates:

- [x] **Tilt Detector** — `analysis/tiltDetector.ts` + Mindset card on the
      Coach's Note: post-trigger (20bb+ loss / half stack / bust-out) play vs
      same-session baseline; compliance counts graded spots only; refuses on
      thin data.
- [x] **Data Vault** — `/data` page + `data/backup.ts`: full-database export/
      restore (merge|replace, one transaction, cross-schema-version refusal).
- [x] **Parser fuzz harness** — seeded generator with an exact-accounting
      betting engine + 250-seed invariant suite; first run caught and fixed a
      real bug (seat-header lines minting phantom actors, F6's family).
- [x] **Headless CLI** — `npm run analyze -- <files>`: the UI's exact import
      pipeline from the terminal, `--json` for scripting.
- [x] **Command palette** — Cmd/Ctrl+K jump-anywhere; `NAV_ITEMS` extracted
      to a shared registry.

Named-but-deferred from the same slate (would collide with wave-owned files):
What-If Lab (EV explorer in HandReplay), Board-Texture Lens (postflop range
vs board), Playwright e2e layer (decide after F16 reshapes the test pipeline).

### Known residuals (audit follow-ups, re-verified 2026-06-20)

- [x] **`bountyAnalyzer.ts:144`** — last-resort hardcoded `1500` starting-stack
      fallback. ✅ **Dropped (PR #111, 2026-07-01):** the dead branch is gone;
      unknown stacks now surface honestly instead of defaulting.
- [x] **Colon-in-player-name parsing** — the `^(.+?): <action>` action regexes
      could mis-split a player name containing `": "`. ✅ **Fixed (abyss Wave
      1, commit `388eac6`)**: an adversarial fixture reproduced it; actors are
      now resolved against seated names, longest first.
- [x] **`store.ts:102` empty `db.version(4).stores({})`** — *not a bug.* It is an
      intentional no-op that keeps the Dexie version chain contiguous, now carrying
      an explanatory comment. Recorded so it is not re-flagged by future audits.
- [x] **`tournamentSummary.ts` prize-extraction quirks** (found by the §6
      characterization suite, 2026-07-12; pinned in
      `tournamentSummary.test.ts`, not yet fixed): (a) `RE_MONEY` captures a
      leading comma, so a `2nd: hero, $100.00` finish line parses prize as 0 —
      real summaries are rescued by the `You received $X` fallback line, but a
      summary without that line under-reports the prize; (b) a single
      `You received $X for eliminating` line is counted as **both** prize and
      bounty (double-count). ✅ **Fixed (2026-07-12):** `RE_MONEY` now anchors
      on a digit (`\d[\d,]*`) so leading commas are dropped, and the
      `You received` prize fallback skips `eliminating`/`bounties` lines so they
      count once as bounty; pinned tests rewritten to the corrected behavior.

### Gated / later (named so they aren't lost)

EPIC F perf ceiling (derived-stats layer, off-render-path equity), the rest of
EPIC D (pipeline/fixture tests), A4 (re-entry / honest ITM), C4/C5 UI cleanup,
and all of EPIC G (backend / sharing / payments / solver — each behind a
`GOALS.md` gate). Revisit after Act I + the first Act II slice land.

**Unify the two spaced-repetition stores** (named at the 2026-07-02 R4 steer):
#106's db-backed `srsScheduler` (mistake patterns, graded) and the R4-ported
browser-local `studyPacketProgress` (packet reviews, ungraded) coexist by
design for now — one scheduler should eventually own both cadences.

> **⏳ REMINDER — grade the excluded scenarios.** `FACING_3BET` (added in I-3)
> and `FACING_ALL_IN` are currently **excluded** from range compliance — the
> engine refuses to grade them rather than invent ranges. The future goal is to
> **actually grade** both: real 3-bet-defense / 4-bet ranges for `FACING_3BET`,
> and pot-odds + ICM for `FACING_ALL_IN`. Until then they surface via Act II
> refusal-as-UI ("not graded, here's why"). See the header note in
> `src/analysis/rangeChecker.ts`. **Now scheduled: Act III-3 (Arc 3), unblocked
> by the `poker-knowledge` vault's vs-3bet answer keys.**

---

## Phase log (shipped)

### Phase 1: MVP — Complete
- [x] PokerStars hand history parser (custom regex, BOM handling, dedup)
- [x] File upload (drag-and-drop, multi-file, inline in HandsPage)
- [x] Hand explorer with basic filters (position, scenario, action, compliance)
- [x] Basic stats: VPIP, PFR, C-bet, WTSD, AF, Won at SD
- [x] Range compliance by position with 13×13 grid

### Phase 2: Analysis — Complete
- [x] Leak detector with severity ratings (10 metrics, dual-profile thresholds)
- [x] Session manager (auto-group by 4h gap, per-session stats table)
- [x] Trend charts (Recharts, VPIP/PFR/C-bet/Compliance evolution)
- [x] Postflop analysis (board texture, missed c-bets, double barrel, probe, donk)

### Phase 2.5: Theory Integration — Complete
- [x] Strategy profile system (Game Plan vs Advanced)
- [x] Board texture classifier for context-dependent c-bet analysis
- [x] Villain Tracker with MDA-based auto-classification
- [x] Advanced profile: texture-dependent c-bet, ICM-aware BB defense,
      deep stack 3-bet sizing
- [x] Manual villain notes and tags
- [x] ICM stage detection (early/mid/bubble/FT)
- [x] Leak tooltips with source attribution (`[GamePlan]`, `[Vol.X]`, `[D#N]`)

### Phase 3: Polish — Complete
- [x] Hand replay (visual, street-by-street with postflop analysis)
- [x] Advanced filters (stack depth, ICM sensitivity, hand category)
- [x] Short stack push/fold checker (push ranges + resteal ranges)
- [x] CSV session export
- [x] Customizable ranges (user-editable grids with push/fold view)
- [x] PDF session export

### Phase 4: Bounty & Advanced — Complete as analysis plumbing, partial UI
- [x] Bounty tournament detection and equity drop calculation
- [x] BPWR (Bounty Power) calculator
- [x] FT-specific analysis (fake shove detection, resteal spots)
- [x] Squeeze play detection and analysis
- [x] Surface bounty/fake-shove/resteal contexts in HandReplay's Tournament
      Context panel (Completed 2026-06-02)

### Phase 5: Accuracy & Analytics Depth — Complete
- [x] W$SD false positives — detect actual `*** SHOW DOWN ***` section
- [x] PnL badge scoped to session filter
- [x] TrendChart Y-axis `['auto','auto']` for PnL charts
- [x] HandReplay duplicate postflop section removed
- [x] AF calculation fixed (raises + calls from `HeroDecision.action`)
- [x] Chips Won → Win %
- [x] TrendChart double card wrapper removed
- [x] Charts on session filter → intra-session 25-hand buckets
- [x] Session-scoped financials
- [x] Postflop stats row (C-bet, C-bet HU, Double Barrel, AF, ITM Rate)
- [x] Position performance heatmap (VPIP/PFR/Compliance/Win% per position)
- [x] Info tooltips on all stat cards
- [x] ITM rate from tournament summaries
- [x] Position-by-position breakdown table with color-coded cells
- [x] Postflop analysis section (missed C-bets, probe turns, donk bets)
- [x] Basic chip EV (`netProfit` = won - invested per hand)
- [x] Win rate metric (Chips / Hand)
- [x] Actionable leak cards (aggregated clusters)
- [x] Sidebar active indicator glow, StatCard accent bars
- [x] HandReplay modal frosted glass + slide-up animation
- [x] Sessions page PnL sparkline bars
- [x] RangeGrid multi-colored action strips (Mirror 2.0)

### Phase 6: Intelligence & Arena — Complete
- [x] High-performance parser (Web Worker + Framer-Motion progress)
- [x] Logic Solver: texture-aware compliance, equity math, MDF/Alpha
- [x] The Arena Trainer (isometric, fault-fixer game loop)
- [x] Expandable Report Cards + Session Nemesis tracking
- [x] Multi-surface Starred Hands system

---

## Maintenance & Punch List (2026-04-17)

Platform is in maintenance + targeted fixes mode. Items below are pulled
from the 2026-04-17 audit. Execution order is cheapest-to-biggest-payoff.
Known correctness issues with code anchors are tracked in `STATUS.md`.

### P0 — One-line fixes
- [x] PDF hero name hardcoded → parameterise (`utils/pdfExport.ts`)
- [x] Verify `lucide-react@^1.7.0` pin — confirmed current (2026-04-18):
      package bumped `0.577.0` → `1.0.0`, latest is `1.8.0`
- [x] ~~Guard HU_BTN from limp leak~~ (false alarm — filter at
      `leakDetector.ts:91` already excludes `HU_BTN`)

### P1 — Small, tested fixes
- [x] W$SD side-pot inflation (2026-04-18) — parser now tracks
      `showdownWinners: Set<string>` from SUMMARY `showed [cards] and won`
      lines; `scenarioDetector.ts:188` gates `wonAtShowdown` on Set
      membership, no longer on raw `wonAmount > 0`
- [x] AF leak alert (2026-04-18) — `detectLeaks` now pushes an `af` leak
      when `af < thresholds.af.min || af > thresholds.af.max`, gated on
      `totalCalls >= 10 && (totalBets + totalRaises) >= 10` so the ratio is
      stable before alerting. Severity via standard `computeSeverity`.
- [x] `rangeChecker.ts:152` silent null (2026-04-18) — `checkFacingRaise`
      now emits a `console.warn` on unknown `openerPosition` (hero/hand/
      action), so parser mapping drops are visible in dev tools; still
      returns `null` (skipped from compliance) to stay conservative.

### P2 — Medium fixes
- [x] Portuguese purge (2026-04-18) — 7 files from STATUS.md (TrendChart,
      LeaksPage, HandsPage, HandReplay, csvExport, pdfExport,
      villainExploitCrossRef) translated to English; 4 test assertions in
      `villainExploitCrossRef.test.ts` rewritten against the new English
      strings. Tests: 331/331 still green. Later analysis-layer cleanup added
      note-string assertions; the `postflopAnalyzer` follow-up was completed
      on 2026-06-02.
- [x] Postflop leak wiring (2026-04-18) — Surface `PostflopAction` flags
      (`postflopAnalyzer.ts:156-174`) as per-hand leaks in HandsPage
      and LeaksPage. Logic attributed to [Vol.2], [D#07], [D#21].
- [x] Promote `activeSessionId` into `useAppStore` (2026-04-18) — Session filter
      now applies globally to Dashboard, Hands, and Stats pages.
- [x] UI/component smoke tests for routed app boot and shared/career components
      (route smoke plus component tests added through 2026-05-12)
- [x] Villain aggregation atomicity — import path catches aggregation failure
      and preserves repair path instead of leaving silent stale profiles
- [x] Villain `statsByPosition` persistence — replaced `Map` with an
      IndexedDB-friendly record and stored raw opportunity/action counters
      (Completed 2026-05-31)
- [x] Per-decision ICM compliance — page/import recomputation now consumes
      `HeroDecision.icmStage` before falling back to a batch-level stage for
      Advanced-profile BB-defense checks (Completed 2026-06-02)
- [x] HandReplay postflop consistency — replay modal now prefers stored
      import-time `HeroDecision.postflopActions`, and `postflopAnalyzer` notes
      have a no-Portuguese-fragments regression (Completed 2026-06-02)

### P2.5 — Code + UX Audit (2026-04-18)

**Batch 1 (quick wins) — DONE:**
- [x] RangesPage `RangeValidatorPanel` Portuguese → English
- [x] HandsPage dead state removal (`dateFrom`/`dateTo` + orphaned date filter inputs)
- [x] `aria-label` on all icon-only buttons (HandsPage, HandReplay, ConfirmDialog)
- [x] Hardcoded hex → CSS variables (`--color-bg-dialog`, `--color-bg-tooltip`,
      `--color-bg-board`, `--color-bg-card-solid`)

**Batch 2 (medium effort):**
- [x] Dialog accessibility: `role="dialog"`, `aria-modal`, Esc key, focus trap (Completed)
- [x] Analysis-layer Portuguese purge: 7 files (pushFoldChecker, postflopAnalyzer, finalTableAnalyzer, bountyAnalyzer, squeezeDetector, rangeValidator, icmDetector) + `icmDetector.test.ts` assertions (Completed)
- [x] Worker error handling: `FILE_ERROR` posted from worker catch, `WorkerMessage` union defined in `workerProcessor.ts`, handled in `HandsUpload.tsx` (Completed 2026-05-15)
- [x] Villain aggregation atomicity: try/catch + repair path for `aggregateVillainStats` in `store.ts` (Completed)

**Batch 3 (structural):**
- [x] Route-level code splitting (React.lazy + Suspense in App.tsx) (Completed)
- [x] Component smoke tests (happy-dom + @testing-library/react) (Completed 2026-05-12)
- [x] HandsPage decomposition (extract `HandsTable`, `HandsUpload`, `HandsFilters`, TanStack Virtualization) (Completed)
- [x] DualRangeMatrix cell memoization (React.memo `RangeCell`) (Completed)
- [x] DashboardPage query optimization (split monolithic useLiveQuery) (Completed)

### P3 — Doc / repo hygiene
- [x] Root cleanup (2026-04-18) — loose scripts moved to `scripts/`,
      loose docs moved to `docs/`, empty `tests/` dir removed
- [x] Commit or gitignore the 100+ untracked summary fixtures in
      `src/test/fixtures/summaries/` (Committed)
- [x] Fixture variant tests (2026-06-14) — Cap / Zoom / 6+ / play-money each
      have dedicated assertions in `fixtureSweep.test.ts` ›
      `specialized variant fixture checks`. (ggpoker `.zip` sweep is still a
      separate `describe.todo` in the same file.)

### P4 — New feature: Career / SharkScope-style tab
- [x] `CareerPage` + `/career` route (2026-04-19) — basic tournament
      history, ROI / ITM dashboard, profit timeline. Reads `tournaments`
      table directly; no dedicated `careerAnalyzer.ts` module yet.
- [x] Lifetime scorecard, stake progression, bust-out distribution,
      rake-adjusted ROI, $/hour (Career hardening pass 2026-05-12)
- [x] Streaks, format breakdown, opponent overlap, day×hour heatmap (Completed)
- [ ] Decide: fold `StatsPage` into Career, or keep both

### P4.5 — Multi-site support (in progress)
- [x] `siteIdentifier.ts` + per-site router in `worker.ts` (2026-04-19)
- [x] ZIP upload (`jszip`) for PokerStars/GGPoker exports (2026-04-19)
- [x] GGPoker parser is a scaffold — produces valid `ParsedHand` shape
      but most fields are defaulted, `totalPot`/`rake`/`villainDeltas`
      extracted, `PlayerInHand.position` uses accurate active seats.
- [x] GGPoker Tournament Summary parser is stubbed; real PokerCraft
      summary extraction properly implemented.

### P5 — Library upgrades (2026-era)
- [x] Wire `knip` into CI (or the pre-commit hook) with a reviewed allowlist —
      the devDep landed in #140 and the manual de-export sweep is done, but
      without a gate every merge refills the unused-export pool (the 2026-07-09
      health review watched this happen after #132). Allowlist the documented
      forward contracts (`solverAdapter.ts` Solver\* types, `spotPacket.ts`
      packet schema, parked villain-archetype code) and the three script
      entry points knip can't trace (`surface-open-reports.ts`,
      `agent-kernel.cjs`, `parallel-runner.cjs`). Done via `knip.jsonc` +
      `npm run knip` in the CI `verify` job (chore/knip-in-ci); the 11
      unused-export candidates across 7 files that were initially allowlisted
      by file (chore/knip-allowlist-narrowing) are now resolved — de-exported
      or deleted per-symbol — and those 7 files are gone from the allowlist.
- [ ] Biome 2 (replace missing linter/formatter)
- [ ] nuqs (URL-sync Hands filters, Ranges position selector)
- [x] TanStack Table + TanStack Virtual on HandsPage list
- [x] vite-plugin-pwa configured with public icon assets
- [ ] `framer-motion@12` → `motion@11`
- [x] Vite 6→8 — landed in PR #73 (2026-06-14); `package.json` pins `vite ^8` / `vitest ^4` / `@vitejs/plugin-react ^6`. (pulls `@vitejs/plugin-react` 4→6 + Vitest 3→4; clears dev-only esbuild advisory GHSA-gv7w). React 19→19.1+, TS 5.7→5.8/5.9
  - Note (2026-06-14): must be **8**, not 7 — Vite 7 still ships esbuild `0.25`, so it would not clear the advisory; an `esbuild` override breaks `vite build`. Deliberate modernization, not a drive-by.

---

## Bug Fix Log

| Date | Bug | Fix |
|------|-----|-----|
| 2026-04-19 | SawFlop Preflop tracking | `scenarioDetector.ts` changed `sawFlop` to explicitly require `!heroFoldedPreflop` instead of just non-folding first action |
| 2026-04-19 | Mathematically Flawed WTSD | Switched WTSD denominator from `vpipHands` to `sawFlopHands` in `leakDetector.ts` to prevent false positive leak warnings |
| 2026-04-19 | Session Nemesis $0.00 read-out | Mapped fallback assassin amounts to `nemesisMap.get(assassin)` instead of hardcoded 0 in `sessions.ts` |
| 2026-04-19 | $0/Missing Buy-Ins | `pokerstars.ts` / `ggpoker.ts` regex expanded to explicitly capture formats like `Buy-In: $X/$Y` from textual Summaries and header parsing |
| 2026-04-19 | PokerStars bounties excluded from parsing | `pokerstars.ts` added capturing mechanisms to extract `bounty` lines from Hand Histories explicitly |
| 2026-04-19 | `store.ts` Tournament properties wiped | Fixed `store.ts:importHands` bulkPut wiping out existing tournament properties by accumulating/merging fields cleanly |
| 2026-04-19 | GGPoker Parsing limits | `ggpoker.ts` parses totalPot, rake, active positions, and real tournament summaries properly out of scaffold bounds |
| 2026-04-18 | Portuguese residue in 7 UI files | Translated TrendChart, LeaksPage, HandReplay, csvExport, pdfExport, villainExploitCrossRef (+ its tests) to English; ROADMAP P2 closed. Also switched `pdfExport.ts` date formats from BR (`dd/MM/yyyy`, `dd/MM HH:mm`) to ISO (`yyyy-MM-dd`, `MM-dd HH:mm`) — deliberate, to match English UI |
| 2026-04-18 | AF never surfaced as a leak | `detectLeaks` now pushes `af` leak when out of `[min,max]`, gated on stable sample |
| 2026-04-18 | `checkFacingRaise` silently dropped hands on unknown opener | Added `console.warn` on null `openerPosition` so parser mapping drops are visible |
| 2026-04-18 | W$SD inflation on chops / non-show wins | Parser exposes `showdownWinners` Set from SUMMARY "showed and won" lines; `wonAtShowdown` gates on membership, not `wonAmount > 0` |
| 2026-04-17 | PDF export hardcoded `scorza23` | `exportSessionsPDF` takes `heroName` arg from `useAppStore` |
| 2026-04-12 | W$SD 100% false positive | `hasShowdown` field via `*** SHOW DOWN ***` detection + DB v3 migration |
| 2026-04-12 | PnL badge ignores session filter | Financial stats scoped to `financialSessions` |
| 2026-04-12 | PnL chart clipped at 100 | `yDomain` prop, PnL uses `['auto','auto']` |
| 2026-04-12 | HandReplay postflop rendered twice | Removed duplicate JSX block |
| 2026-04-12 | AF always shows "—" | Count raise/call actions from `HeroDecision.action` |
| 2026-04-12 | Chips Won/Mão misleading | Replaced with Win % |
| 2026-04-12 | Chart/Position table overlap | Removed TrendChart inner card, increased height to h-72 |
| 2026-04-12 | Charts hide on session filter | `computeIntraSessionTrends()` for bucketed data |
| 2026-04-12 | Net Profit logic broken | Switched from gross `wonAmount` to stack delta (`netProfit`) |
| 2026-04-12 | Tournament Summary reader | Fuzzy matching parser + Bounty capture support |
| 2026-04-12 | SB/BB Hand Counts | Merger/scenario-aware counting in Ranges Page |
| 2026-04-12 | Syntax Error ranges.ts | Restored missing `RFI_RANGES` declaration |

---

## Status Summary

| Phase | Status |
|-------|--------|
| 1: MVP | Complete |
| 2: Analysis | Complete |
| 2.5: Theory Integration | Complete |
| 3: Polish | Complete |
| 4: Bounty & Advanced | Complete |
| 5: Accuracy & Analytics | Complete |
| 6: Intelligence & Arena | Complete |
| Maintenance & Punch List | In progress |

**Current test inventory:** see `docs/product/STATUS.md` autogenerated test block.
