# Parser Health - Fixture Sweep

**Last verified:** 2026-07-22
**Branch/worktree:** `codex/implementionday` at `C:\dev\poker`
**Purpose:** publish exact parser fixture pass / skip / fail numbers so product decisions are based on measured parser health rather than vibes.

## Commands run

```bash
npx.cmd vitest run src/parser/__tests__/fixtureSweep.test.ts src/parser/__tests__/ggpoker.test.ts src/parser/__tests__/ggpoker_robustness.test.ts src/parser/__tests__/buyInExtractor.test.ts
```

Vitest result:

```text
Test Files  4 passed (4)
Tests       56 passed (56)
```

The current focused sweep covers PokerStars real fixtures and standardized
Open Hand History JSON fixtures committed under `src/test/fixtures/`. It now
also extracts and parses the four tracked GGPoker ZIP archives directly in
`fixtureSweep.test.ts`; the GGPoker numbers below are current test evidence,
not retained audit numbers.

## Headline result

| Supported fixture group | Files | Pass | Fail | Skip |
|---|---:|---:|---:|---:|
| PokerStars hand histories | 92 | 92 | 0 | 0 |
| PokerStars tournament summaries | 157 | 157 | 0 | 0 |
| Open Hand History JSON fixtures | 2 | 2 | 0 | 0 |
| GGPoker zipped fixture entries (extraction / parser recovery) | 53 | 53 | 0 | 0 |
| **Total supported fixture files / entries** | **304** | **304** | **0** | **0** |

## PokerStars Detail

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

## Open Hand History Detail

| Metric | Count |
|---|---:|
| JSON fixture files | 2 |
| Parsed files | 2 |
| Failed files | 0 |
| Parsed hands | 2 |
| Covered standardized shapes | iPoker object wrapper, 888/Pacific array wrapper |

The OHH fixtures verify standardized JSON parsing, not native proprietary
iPoker, 888/Pacific, WPN, PartyPoker, Chico, or Winamax text exports. Native
room formats still need real user/export samples before the app can claim
direct support. The supported import path for those rooms remains conversion
to standardized Open Hand History JSON.

## GGPoker Detail

| Metric | Count |
|---|---:|
| Zip archives | 4 |
| Supported files inside archives | 53 |
| Hand-history files | 27 |
| Tournament-summary files | 26 |
| Parsed files | 53 |
| Failed files | 0 |
| Total hands parsed | 566 |
| Skipped hand blocks | 0 |
| Total summaries parsed | 26 |
| Summary ID / buy-in / fee / currency failures | 0 |
| Hands with recovered winner collections and conserved chips | 566 |
| Hands missing winner collections / failing conservation | 0 |
| Chip-conservation coverage | 100% (566 / 566) |
| Aggregate confidence | high for the tracked fixture corpus |

### GGPoker chip-accounting result

Archive extraction, parser recovery, and GGPoker financial math are green for
the tracked corpus. All 566 parsed hands recover winner collection data and
satisfy the repository invariant `hero net + villain nets = -rake`, including
the 175 non-showdown hands whose summaries award the pot with
`Seat N: player collected (amount)`.

## Current Coverage Boundary

This fixture evidence verifies the supported corpus currently present under
`src/test/fixtures/`:

- PokerStars hand histories
- PokerStars tournament summaries
- standardized Open Hand History JSON examples
- GGPoker zipped hand-history / tournament-summary exports, extracted and
  parsed by the active fixture sweep

PokerStars, Open Hand History, GGPoker archive extraction, GGPoker file
recovery, and GGPoker chip conservation are green for the tracked fixture corpus.
The product gate also remains the private/local generic analyzer posture in
`docs/agents/TWO_AGENT_BOARD.md`; historical third-party/IP notes live in
`docs/audits/IP_COPY_AUDIT.md` and archived agent docs.

## Live Import Confidence

Fixture sweeps are the repo-level parser gate. User imports have a separate
local confidence ledger derived from retained import diagnostics in
`src/data/importRuns.ts`.

The ledger summarizes retained runs into:

- ready / directional / needs-review analysis posture
- high / medium / low confidence run counts
- parsed-file rate and failed-file count
- saved hand / tournament-summary totals
- grouped parser warning categories with sanitized examples

This keeps product guidance tied to the user's actual local import history
without exporting raw hand histories, cards, actions, player-level hand data, or
local paths.
