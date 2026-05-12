# Parser Health — Fixture Sweep

**Last verified:** 2026-05-10 23:45 UTC
**Branch/worktree:** `phase-6-consolidated-final` at `/home/micro/projects/poker-analyzer`
**Purpose:** publish the exact parser fixture pass / skip / fail numbers requested by the council, so product decisions are based on measured parser health rather than vibes.

## Commands run

```bash
npx vitest run src/parser/__tests__/fixtureSweep.test.ts --reporter=verbose
npx tsx /tmp/parser-health-sweep.ts
```

Vitest result:

```text
Test Files  1 passed (1)
Tests       5 passed (5)
```

The `/tmp/parser-health-sweep.ts` script was a one-off audit script that reused the production parser modules and fixture-oracle expectations from `src/parser/__tests__/fixtureSweep.test.ts`, plus `parsePokerStarsFileWithReport` for skipped-block visibility.

## Headline result

| Supported fixture group | Files | Pass | Fail | Skip |
|---|---:|---:|---:|---:|
| PokerStars hand histories | 92 | 92 | 0 | 0 |
| PokerStars tournament summaries | 157 | 157 | 0 | 0 |
| GGPoker zipped fixture entries | 53 | 53 | 0 | 0 |
| **Total supported fixture files** | **302** | **302** | **0** | **0** |

## PokerStars detail

| Metric | Count |
|---|---:|
| Hand-history fixture files | 92 |
| Tournament-summary fixture files | 157 |
| Hand blocks detected | 3,285 |
| Parsed hands | 3,285 |
| Skipped hand blocks | 0 |
| Duplicate hands | 0 |
| Buy-in / fee filename-oracle failures | 0 |
| Tournament ID filename-oracle failures | 0 |

## GGPoker detail

| Metric | Count |
|---|---:|
| Zip archives | 4 |
| Supported files inside archives | 53 |
| Hand-history files | 27 |
| Tournament-summary files | 26 |
| Parsed files | 53 |
| Failed files | 0 |
| Total hands parsed | 566 |
| Total summaries parsed | 26 |
| Aggregate confidence | high |
| Low-confidence files | 0 |
| Warning files | 0 |

## Current coverage boundary

This fixture sweep verifies the supported real-fixture corpus currently present under `src/test/fixtures/`:

- PokerStars hand histories
- PokerStars tournament summaries
- GGPoker zipped hand-history / tournament-summary exports

There are no Open Hand History real fixture files under `src/test/fixtures/` at this verification point. OHH parser behavior may have unit coverage elsewhere, but it is not represented in the real-fixture sweep number above.

## Council gate status

- Fixture sweep pass rate is now explicitly published: **302 / 302 supported fixture files pass; 0 fail; 0 skip**.
- PokerStars silent block-drop check is explicit: **3,285 / 3,285 hand blocks parsed; 0 skipped blocks**.
- GGPoker archive reliability report is high confidence with **0 failures, 0 warnings, 0 low-confidence files**.

The parser gate is therefore green for the fixture corpus currently in the repo. The remaining product gates are partnership / IP clarity and external user validation; see `docs/agents/PARTNERSHIP_STATUS.md`.
