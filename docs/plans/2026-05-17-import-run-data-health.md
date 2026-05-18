# Import Run Data Health Implementation Plan

> **For Hermes:** Use test-driven-development for each source-code task. Keep the design/dashboard track separate; this is engine/backend reliability plus a minimal existing-upload UI surface.

**Goal:** Persist each completed import as a durable local audit record and show a compact data-health summary after reload.

**Architecture:** Add a Dexie `importRuns` table plus pure helpers for building import-run records and summarizing current data health. Wire `HandsUpload` completion to save a run after parsed hands/summaries are persisted. Render a minimal persistent Data Health panel near the upload controls using tested view-model copy.

**Tech Stack:** React 19, TypeScript, Dexie, Vitest, Vite, existing worker `ImportSummary` confidence model.

---

## Constraints / gates

- Product posture remains private/local generic poker analyzer.
- Do not start pricing/funnel/share/public-distribution work.
- Keep UI copy in English.
- Use Windows Node commands for verification in this checkout because WSL `node_modules` has Windows native optional packages.
- Before final handoff, update `docs/agents/AGENT_HANDOFF.md`.

## Task 1: Add pure import-run record and data-health tests

**Objective:** Define desired durable audit behavior before production code.

**Files:**
- Create: `src/data/__tests__/importRuns.test.ts`
- Create/modify after RED: `src/data/importRuns.ts`

**Step 1: Write failing tests**

Tests should cover:
- `buildImportRunRecord()` preserves worker import summary, source filenames, saved hand/summary counts, failed file counts, warnings, confidence, and timestamp.
- `summarizeDataHealth([])` returns an empty neutral status.
- `summarizeDataHealth([latestMedium, olderHigh])` uses latest run for current confidence while aggregating recent saved counts/warnings.
- `summarizeDataHealth([latestLowWithWarnings])` returns low status with warning copy.

**Step 2: Run RED**

Run:
`cmd.exe /c "cd /d C:\\Users\\MICRO\\Downloads\\poker-claude-integrate-knowledge-base-vvCeh && npm test -- --run src/data/__tests__/importRuns.test.ts"`

Expected: FAIL because `src/data/importRuns.ts` does not exist.

**Step 3: Implement minimal helper module**

Create `src/data/importRuns.ts` exporting:
- `ImportRunRecord`
- `SavedImportCounts`
- `buildImportRunRecord(summary, sourceFiles, savedCounts, importedAt?)`
- `summarizeDataHealth(runs)`

**Step 4: Run GREEN**

Run same focused test. Expected: PASS.

## Task 2: Add Dexie table and persistence functions

**Objective:** Store import audit records in IndexedDB.

**Files:**
- Modify: `src/data/store.ts`
- Modify: `src/data/__tests__/importRuns.test.ts`

**Step 1: Write failing persistence test**

Add tests for:
- `saveImportRun(record)` writes an import run.
- `getRecentImportRuns(limit)` returns newest-first and respects limit.
- `clearAllData()` clears import runs with other local data if current implementation treats it as full reset.

**Step 2: Run RED**

Expected: FAIL because persistence functions/table are not wired.

**Step 3: Implement schema/version**

- Add `importRuns: EntityTable<ImportRunRecord, 'id'>` to the typed Dexie instance.
- Add `db.version(5).stores({ importRuns: 'id, importedAt, confidence' })`.
- Export `saveImportRun()` and `getRecentImportRuns()` from `store.ts`.
- Include `db.importRuns.clear()` in full reset if `clearAllData()` clears the local corpus.

**Step 4: Run GREEN**

Run focused test. Expected: PASS.

## Task 3: Wire upload completion to save import-run records

**Objective:** Persist a durable audit record every time the worker completes and DB saves finish.

**Files:**
- Modify: `src/components/hands/HandsUpload.tsx`

**Step 1: Add/adjust tests if practical**

Prefer pure helpers for record construction. If component tests are too heavy, rely on Task 1 helper tests and TypeScript for the wiring.

**Step 2: Implement wiring**

After `importHands()` and `importTournamentSummaries()` resolve:
- Build saved counts from returned hand count and summary import result.
- Use `fileDataArr.map(f => f.name)` as source filenames.
- Save via `saveImportRun(buildImportRunRecord(...))`.
- If saving the audit fails, log `console.warn` but do not mark the import itself failed.

## Task 4: Render minimal Data Health panel

**Objective:** Make persisted import confidence visible after reload.

**Files:**
- Modify: `src/components/hands/HandsUpload.tsx`
- Or create: `src/components/hands/DataHealthPanel.tsx` if markup grows.

**Step 1: Add pure copy helper tests if needed**

If UI copy branches get complex, extract/test a small view model. Keep first slice minimal.

**Step 2: Implement UI**

- Load recent import runs with `useLiveQuery` or a local effect.
- Render near upload controls:
  - No import history: “Data Health: No imports recorded yet.”
  - Otherwise: confidence badge, last import time, files parsed/total, saved hands/summaries, failed file count, capped warning preview.

## Task 5: Docs, verification, commit, push

**Objective:** Close the loop with traceability and clean verification.

**Files:**
- Modify: `docs/product/STATUS.md` via `npm run docs:update` if source inventory changes.
- Modify: `docs/agents/AGENT_HANDOFF.md` with final entry.

**Verification commands:**

Run:
`cmd.exe /c "cd /d C:\\Users\\MICRO\\Downloads\\poker-claude-integrate-knowledge-base-vvCeh && npm run docs:update && npm run docs:check && npx tsc -b --pretty false && npm test -- --run src/data/__tests__/importRuns.test.ts src/parser/__tests__/uploadSizeGuards.test.ts src/data/__tests__/localStorage.test.ts && npm test -- --run && npm run build"`

Expected:
- docs check passes
- TypeScript passes
- focused tests pass
- full tests pass
- build passes

Commit message:
`feat: persist import data health`
