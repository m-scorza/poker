# Data Model and Privacy Boundary

**Created:** 2026-05-18
**Purpose:** define which poker-analyzer data may remain local raw data, which may be normalized for local analysis, and which may ever be exported as sanitized fixtures or aggregates.

This document is intentionally backend/engine-facing. It does not commit the product to a UI, upload endpoint, public dataset, or telemetry system.

---

## Operating posture

- The app is a private/local poker hand-history analyzer by default.
- Raw hand histories and local IndexedDB records must not leave the user's device unless a future explicit opt-in contribution/export flow is implemented.
- Any contribution/export flow must sanitize first, then optionally encrypt/package. Network upload is out of scope until consent, retention, deletion, and encryption rules are documented.
- Reversible pseudonym maps are local-only. Shared artifacts should be irreversible enough that the project cannot reconstruct real screen names from them.

## Static privacy guard

Run `npm run privacy:check` before merging runtime changes that might affect data movement.

The guard fails on unreviewed browser network APIs, remote runtime asset URLs, native share APIs, and known telemetry/cloud/payment/remote-AI SDK dependencies. This protects the current private/local posture from accidental drift.

This is not a permanent ban on future cloud, support-export, solver API, or opt-in analytics work. A future intentional feature must update the privacy design, add explicit opt-in UX, and add a narrow allowlist entry in `scripts/privacy-boundary-check.ts` for the exact file and pattern being introduced.

---

## Data classes

| Class | Meaning | Examples | Export posture |
|---|---|---|---|
| Local raw | Original or directly identifying user/import data | raw hand-history text, source filenames, real nicknames, exact table names, exact tournament IDs, manual notes | Never export by default |
| Local normalized | Parsed domain records used by the app | `Hand`, `PlayerInHand`, `Action`, `Tournament`, `HeroDecision`, villain profiles | Local IndexedDB only unless transformed |
| Sanitized fixture | Poker-semantics-preserving text with identities replaced | synthetic hand IDs, `Hero`, `Villain_1`, synthetic table/tournament IDs | Candidate for explicit opt-in parser debugging/regression |
| Aggregate signal | Counts/rates that cannot identify players or exact sessions | parser warning counts, scenario counts, leak category counts, confidence totals | Candidate for explicit opt-in analytics only after thresholds |
| Forbidden shared data | Fields too sensitive or identifying | real nicknames, raw notes, exact timestamps, local file paths, original tournament IDs | Must be rejected from shared payloads |

---

## Current local normalized records

### `Hand` (`src/types/hand.ts`)

| Field | Class | Notes |
|---|---|---|
| `id` | Local normalized / sensitive | Original hand ID can correlate with site records. Replace in sanitized exports. |
| `tournamentId` | Local normalized / sensitive | Replace in sanitized exports. |
| `date` | Local normalized / sensitive | Exact timestamp can identify sessions. Coarsen or synthesize in exports. |
| `level`, blinds, ante, max seats, active players, button seat | Poker semantic | Preserve where needed for parser/analysis fixtures. |
| board cards, pot, rake, showdown flag | Poker semantic | Preserve for parser/analysis fixtures. |
| `heroChipsBefore`, `heroChipsAfter` | Poker semantic | Preserve. |
| `villainDeltas.name` | Sensitive | Replace names with aliases or drop names from aggregate exports. |
| `isStarred` | Local user state | Do not export unless transformed to anonymous review intent. |

### `PlayerInHand`

| Field | Class | Notes |
|---|---|---|
| `playerName` | Sensitive | Must be aliased. Hero becomes `Hero`; others become deterministic `Villain_N`. |
| seat number, stack, position, hero flag, hole cards | Poker semantic | Preserve for parser/analysis fixtures. |

### `Action`

| Field | Class | Notes |
|---|---|---|
| `playerName` | Sensitive | Must be aliased consistently with seats and summaries. |
| street/action/amount/all-in/sequence | Poker semantic | Preserve. |

### `Tournament`

| Field | Class | Notes |
|---|---|---|
| `id` | Sensitive | Replace with synthetic ID. |
| `name`, `category`, `format` | Mixed | May include brand/private metadata. Prefer neutral category or sanitize names. |
| `startDate` | Sensitive | Coarsen or synthesize. |
| buy-in, fee, finish, prize, bounty, currency, hands played | Poker semantic | Preserve if needed; aggregate if possible. |

### `HeroDecision` (`src/types/analysis.ts`)

Mostly normalized analysis data. `handId` must be remapped if exported. Position, scenario, stack BB, hand key, action, compliance, deviation, c-bet/showdown flags, ICM stage, and net profit are analysis signals. They can be shared only after hand IDs are synthetic and sample size/consent rules are satisfied.

### Villain profiles (`src/types/villain.ts`)

Villain profiles are local-only by default.

- `playerName`, notes, tags, first/last seen, shown-hand hand IDs are sensitive.
- Aggregate villain stats may be exported only as anonymous pool/archetype signals after thresholding.
- Do not build cross-user opponent databases from contributed hands.

### Import runs (`src/data/importRuns.ts`)

Import-run records are automatic local diagnostics metadata.

- The app retains the latest 50 import diagnostic runs in IndexedDB.
- `sourceFiles` are stored as sanitized basenames only; local paths and archive subpaths are stripped.
- Parser warnings are collapsed to one line and capped before storage.
- Each new run stores local-only diagnostic policy metadata stating that raw hand histories, cards, actions, player-level hand data, and local paths are excluded.
- The upload UI can export or clear this local diagnostic ledger without deleting parsed hands.
- A derived confidence ledger summarizes retained runs into high/medium/low counts, parsed-file rate, analysis posture, and warning categories. The category ledger is aggregate support metadata; raw warning lines remain local diagnostics and are sanitized before display/export.
- Network upload or silent telemetry remains out of scope until the future upload/encryption gate below is satisfied.

---

## Sanitized fixture rules

A sanitized fixture is meant to improve parser coverage, not preserve user identity.

Required transformations:

1. Player nicknames
   - Configured hero name and any existing `Hero` token become `Hero`.
   - Every other player becomes `Villain_1`, `Villain_2`, etc.
   - Aliases must be consistent across seat lines, actions, dealt lines, collected lines, summary lines, and showdown lines.

2. IDs
   - Hand IDs become synthetic deterministic numeric IDs so existing parsers can still read them.
   - Tournament IDs become synthetic deterministic numeric IDs so existing parsers can still read them.
   - Table names become synthetic labels such as `Sanitized Table 1`.

3. Time
   - Exact original timestamps should be replaced with deterministic synthetic timestamps that still match parser expectations.
   - Preserve relative hand ordering when multiple hands are in one file.

4. Filenames and paths
   - Source paths and filenames must not appear in sanitized payloads.

5. Poker semantics to preserve
   - Cards, boards, blinds, antes, stacks, positions, action order, bet amounts, all-in markers, pots, rake, bounty lines, showdown/muck/collected summary structure.

6. Report shape
   - Redaction reports may contain counts and aliases, but not original nicknames or raw IDs.

---

## Safe aggregate rules

Aggregate signals may be useful for prioritizing parser and analysis work, but they should be thresholded and non-identifying.

Allowed candidate signals:

- parser identity: supported site/type, app/parser version, schema version
- confidence: high/medium/low counts
- file-level parse counts after removing names/filenames
- scenario counts: RFI, BB vs raise, facing limp, all-in, etc.
- warning categories, not raw warning lines if raw lines can include names
- leak category counts and sample sizes
- solver coverage category counts once solver adapters exist

Not allowed:

- exact player names or stable cross-user player identifiers
- manual notes or tags
- raw hand text
- local paths/filenames
- exact timestamps
- original tournament/table/hand IDs
- per-opponent databases across users

---

## Future upload/encryption gate

Before any network collection exists, the repo must contain a design covering:

- explicit opt-in consent text and user action
- local preview of what will be shared
- client-side sanitization tests
- optional client-side encryption using a project public key
- server retention window
- deletion/withdrawal flow
- server/offline validation that rejects raw-looking payloads
- handling of support/debug packages separately from aggregate telemetry

Until that design exists, contribution work should stop at local package generation and tests.

---

## Current local package builder

`src/parser/contributionPackage.ts` builds a local-only sanitized parser fixture package. It is deliberately not an uploader.

Current package contents:

- `schemaVersion` and package `kind`
- generated `createdAt` and caller-provided app version
- sanitized text chunks with synthetic source aliases such as `source-1.txt`
- site/type labels from local file detection
- parser hand counts after reparsing sanitized PokerStars, GGPoker, and Open Hand History chunks
- redaction reports with counts and public aliases only
- parser report with total files, sanitized files, unsupported files, hand count, confidence, and generic warnings
- forbidden-field findings that use generic marker labels instead of echoing sensitive strings

Current limits:

- Native text sanitizer/package coverage currently includes PokerStars and GGPoker hand histories.
- Standard Open Hand History JSON can be sanitized and reparsed while preserving player-id/action/pot relationships through synthetic IDs.
- Unsupported files are omitted from chunks and represented by generic source aliases/warnings.
- The package is marked `shareable: false` if a forbidden marker is detected in the serialized payload.
- No real filename, local path, raw nickname, original hand/tournament/table ID, or exact original date should appear in a shareable package.
