# 2026-05-18 — Engine, Solver Feasibility, and Privacy-Preserving Data Addendum

> **For Hermes / Antigravity:** This is an additive plan. Do not replace or reorder the active import-run/data-health and downstream trust plans. Use this as the next engine/backend lane once the current import confidence slice is committed or explicitly paused.

**Goal:** Build the non-UI base for reliable analysis, future solver integration, and opt-in privacy-preserving hand-history contribution without storing real player nicknames or raw identifiable hand histories.

**Architecture:** Treat imported hands as three separate data products: (1) local raw user corpus that never leaves the device by default, (2) deterministic sanitized fixtures useful for parser regression, and (3) aggregate/statistical analysis signals useful for improving rules and confidence. Solver work begins as a feasibility spike and adapter contract, not a product promise. Privacy work begins with local anonymization, explicit consent boundaries, encryption design, and deletion/export workflows before any network collection.

**Tech Stack:** TypeScript, Vitest, existing parser/analysis modules, Dexie local storage, Web Worker import pipeline, optional future WASM/native solver adapters.

---

## Relationship to current plans

Keep these plans intact and ahead of this addendum unless the user explicitly changes priority:

1. `docs/plans/2026-05-17-import-run-data-health.md` — durable local import audit records.
2. `docs/plans/2026-05-18-downstream-trust-timeline.md` — trust propagation and import timeline.
3. This addendum — next backend/engine lane for data quality, solver feasibility, privacy, and safe learning from user corpora.

This addendum intentionally avoids dashboard polish, new public sharing surfaces, pricing/funnel work, and broad UI/UX commitments.

---

## External benchmark notes

- GTO Wizard-style analyzer expectations: users expect mistake sorting, EV-loss-like prioritization, filters, reports, and drills. We should emulate the workflow shape while being honest that our first scoring is rule/range/proxy-EV based, not full solver EV.
- PokerTracker / Hand2Note expectations: strong products use reliable import pipelines, saved filters, situation-specific reports, auto notes, and custom/statistical research over hand histories.
- Solver feasibility references from current public search:
  - `b-inary/wasm-postflop` / WASM Postflop: open-source browser-based Texas Hold'em postflop solver via WebAssembly.
  - `noambrown/poker_solver`: research/river subgame CFR/CFR+ implementation useful for understanding architecture and validation concepts.
  - TexasSolver: open-source solver ecosystem to investigate for native/offline comparison, licensing, and API shape.
- Privacy benchmark: distinguish anonymization from pseudonymization. For our use case, default shared data should be irreversible sanitized fixtures/aggregates; reversible pseudonym maps should stay local only.

---

## Non-negotiable constraints

- Default is local/private. No hand-history upload, telemetry, or background collection without explicit opt-in.
- No real screen names, table names, tournament IDs, exact timestamps, or raw hand text in any contributed dataset.
- Do not send raw Reg Life/curriculum-derived labels or private strategy source citations in shared artifacts.
- Do not imply solver-grade EV unless a solver adapter produced that value and the spot was within solver coverage.
- All parser/analysis changes need direct tests or fixture coverage.
- Use Windows Node command wrappers for verification in this checkout unless the WSL `node_modules` issue is fixed.

---

## Phase A — Data model audit: raw, normalized, sanitized, aggregate

**Objective:** Make data boundaries explicit before adding any collection or solver work.

**Files likely touched:**
- Create: `docs/product/DATA_MODEL_AND_PRIVACY.md`
- Inspect: `src/types/hand.ts`
- Inspect: `src/types/analysis.ts`
- Inspect: `src/data/store.ts`
- Inspect: `src/parser/workerProcessor.ts`

**Steps:**
1. Inventory fields in `Hand`, `Tournament`, `HeroDecision`, villain counters, import run records, and notes.
2. Classify each field:
   - local raw only
   - local normalized analysis
   - safe sanitized fixture candidate
   - safe aggregate candidate
   - never export
3. Define exact redaction rules for names, tournament IDs, table IDs, timestamps, notes, and filenames.
4. Document which data is needed for parser improvement versus analysis improvement.
5. Add acceptance criteria for future PRs: no export/contribution path can bypass this classification.

**Verification:**
- `npx tsc -b --pretty false` if any generated/type docs tooling changes.
- `npm run docs:check` if docs checker includes this doc.

---

## Phase B — Sanitized hand-history fixture generator

**Objective:** Let users contribute parser-regression value without exposing real identities.

**Files likely touched:**
- Create: `src/parser/sanitizeHandHistory.ts`
- Create: `src/parser/__tests__/sanitizeHandHistory.test.ts`
- Modify only if needed: `src/parser/workerProcessor.ts`
- Document: `docs/product/DATA_MODEL_AND_PRIVACY.md`

**Design:**
- Input: raw hand-history text and optional source filename.
- Output: sanitized text plus redaction report.
- Replace every player nickname with deterministic per-file or per-export aliases: `Hero`, `Villain_1`, `Villain_2`, etc.
- Replace table names and tournament IDs with stable synthetic IDs.
- Coarsen timestamps to date bucket or synthetic sequence, depending on parser needs.
- Preserve all poker-relevant structure: positions, stacks, blinds, actions, cards, boards, pots, rake, summaries, bounty lines, all-in markers.
- Strip local file paths and filenames from export payloads.
- Keep pseudonym mapping in memory only; do not persist reversible mapping unless a future local-only debug mode explicitly needs it.

**Test cases:**
1. PokerStars hand with multiple villains, showdown, and summary aliases all matching.
2. GGPoker/PokerCraft style file with tournament summary and player names redacted.
3. Unicode / punctuation nicknames redacted safely.
4. Hero name redacted to `Hero` even when user-configured hero name changes.
5. Parser round-trip: sanitized output still parses to same count and same poker-relevant fields.
6. Redaction report includes counts but no original names.

**Verification:**
`cmd.exe /c "cd /d C:\\Users\\MICRO\\Downloads\\poker-claude-integrate-knowledge-base-vvCeh && npm test -- --run src/parser/__tests__/sanitizeHandHistory.test.ts && npx tsc -b --pretty false"`

---

## Phase C — Local contribution package builder, no network yet

**Objective:** Build exportable privacy-safe packages before implementing upload/collection.

**Files likely touched:**
- Create: `src/data/contributionPackage.ts`
- Create: `src/data/__tests__/contributionPackage.test.ts`
- Reuse: `src/parser/sanitizeHandHistory.ts`
- Document: `docs/product/DATA_MODEL_AND_PRIVACY.md`

**Package contents:**
- Schema version.
- App version / parser version if available.
- Site identity: PokerStars/GGPoker/OHH/unknown.
- Sanitized hand-history text or sanitized fixture chunks.
- Parser report: parsed hand count, skipped block count, warnings, confidence.
- Optional aggregate analysis metrics with no nicknames and no exact timestamps.
- Consent metadata: generated locally, user initiated, createdAt, no raw names claim.

**Explicitly excluded:**
- Real nicknames.
- Raw notes.
- Raw filenames/paths.
- Exact original tournament IDs.
- Exact original table names.
- User account identifiers unless future consent flow explicitly adds a separate account layer.

**Verification:**
- Unit tests assert forbidden strings from source never appear in the package JSON.
- Unit tests assert sanitized package can be parsed again.

---

## Phase D — Encryption and consent design before upload

**Objective:** Decide the secure collection architecture before adding any API endpoint.

**Files likely touched:**
- Create: `docs/product/SAFE_DATA_CONTRIBUTION_DESIGN.md`
- No source code required in first pass.

**Design questions to answer:**
1. Is the contribution package meant for human support/debugging, parser fixture corpus, aggregate analysis, or all three?
2. Who holds decryption keys?
3. Should package encryption be app-public-key only, passphrase-based user export, or both?
4. What deletion story exists if a user later withdraws consent?
5. Can we accept only sanitized packages and reject raw-looking data server-side?
6. Should we add k-anonymity thresholds for aggregate reports before anything leaves the device?

**Recommended first design:**
- Client-side sanitization first.
- Client-side encryption second using a project public key before network transport.
- Server stores only encrypted sanitized packages plus minimal metadata.
- Server-side validation rejects payloads containing obvious raw identifiers if decrypted in an offline admin pipeline.
- No automatic background telemetry; only user-triggered export/contribution.

**Acceptance criteria:**
- A future engineer can implement the first endpoint without inventing privacy policy on the fly.
- The design states retention, deletion, consent, and forbidden fields.

---

## Phase E — Solver feasibility spike and adapter contract

**Objective:** Determine whether solver integration is viable without coupling the app to one implementation or overpromising EV.

**Files likely touched:**
- Create: `docs/research/2026-05-18-solver-feasibility.md`
- Create: `src/analysis/solverAdapter.ts` only after the research doc defines the minimal contract.
- Create: `src/analysis/__tests__/solverAdapter.test.ts` for adapter shape only.

**Research targets:**
1. WASM Postflop (`b-inary/wasm-postflop`): browser feasibility, license, input model, output model, runtime/memory limits.
2. TexasSolver: native/offline feasibility, license, CLI/API, performance, supported spots.
3. Research CFR/CFR+ repos: validation concepts and toy-game tests, not immediate product dependency.
4. Commercial solvers: do not depend on them unless licensing/API terms are explicit.

**Adapter contract should separate:**
- `SolverSpotInput`: game tree inputs, board, stacks, pot, ranges, bet sizes, street, positions.
- `SolverCoverage`: whether the spot is solvable by the adapter.
- `SolverRecommendation`: actions, frequencies, EVs if available, abstraction notes.
- `SolverConfidence`: exact / abstracted / unsupported / failed.

**First implementation should be a fake adapter only:**
- It returns `unsupported` or deterministic fixture responses.
- It allows analysis code to distinguish solver-backed EV from rule-based/proxy scoring.
- It prevents UI/analysis copy from saying “solver says” when no solver ran.

**Feasibility gates:**
- License permits intended use.
- Spot construction is possible from our parsed hand model.
- Runtime is acceptable for offline post-session analysis.
- Worker isolation is possible so solving cannot freeze the app.
- Output can be tested against known fixtures.

---

## Phase F — Analysis learning loop from sanitized corpora

**Objective:** Use user corpora to improve parser and analysis safely without hoarding identifiable hand databases.

**Files likely touched:**
- Create: `docs/product/ANALYSIS_LEARNING_LOOP.md`
- Later create: `scripts/analyze-sanitized-corpus.ts`
- Later create tests under relevant parser/analysis modules.

**Safe improvement loops:**
1. Parser coverage loop:
   - Sanitized package fails parser or produces warnings.
   - Add sanitized fixture to repo.
   - Write regression test.
   - Fix parser.
2. Analysis confidence loop:
   - Aggregate scenario counts show many unsupported/ambiguous spots.
   - Add scenario fixture categories.
   - Improve detector only when ground truth is known.
3. Rule calibration loop:
   - Aggregate population shows repeated leak categories, but do not auto-change strategy rules from results alone.
   - Use this to prioritize review and user interviews, not silently rewrite ranges.
4. Solver comparison loop:
   - For supported solver spots, compare rule-based recommendation to solver adapter output.
   - Store mismatch categories without real nicknames.

**Do not do:**
- Do not train on raw nicknames or notes.
- Do not build opponent/player databases from contributed hands.
- Do not infer private player identity across users.
- Do not silently update analysis rules from aggregate outcomes.

---

## Phase G — Governance and agent workflow

**Objective:** Keep this lane from colliding with current UI/copy/import-trust work.

**Ownership recommendation:**
- Hermes primary: data model, privacy design, parser fixtures, solver feasibility, analysis tests.
- Antigravity reviewer/implementer only after Hermes writes narrow acceptance criteria.
- Antigravity should not touch UI pages for this lane unless a later source-backed task explicitly needs a minimal export button.

**Board update to make later:**
- Add a new row to `docs/agents/TWO_AGENT_BOARD.md` for “Privacy-preserving data contribution + solver feasibility”.
- Blocked areas: pricing/funnel, dashboard redesign, public sharing UX, Reg Life-branded copy.

**Handoff requirement:**
Every implementation slice must update `docs/agents/AGENT_HANDOFF.md` with:
- whether raw data ever left local storage
- tests proving redaction/encryption boundaries
- parser/analysis verification commands
- known unsupported solver spots

---

## Recommended execution order

1. Commit/close current downstream trust timeline slice if not already committed.
2. Phase A: write `DATA_MODEL_AND_PRIVACY.md` from source inventory.
3. Phase B: implement/test sanitized fixture generator.
4. Phase C: implement/test local contribution package builder, still no network.
5. Phase E: run solver feasibility research in parallel with B/C if desired, but do not wire product claims.
6. Phase D: write encryption/consent design after package shape is clear.
7. Phase F: add corpus analysis scripts only after sanitized package format is stable.

---

## Definition of done for this addendum

- The repo has a documented field-level data/privacy classification.
- Sanitized hand histories preserve poker semantics and remove identities under test.
- A local-only contribution package can be generated and proven free of forbidden raw strings.
- Solver feasibility is documented with license/runtime/input-output risks.
- A solver adapter boundary exists or is explicitly deferred with reasons.
- No network upload exists until privacy, consent, encryption, retention, and deletion are documented.
