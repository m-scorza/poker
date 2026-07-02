# Research Operating System

Purpose: turn poker/domain research, design references, solver/tool feasibility, and competitor/market scans into source-governed product decisions. This folder is not consumed directly by the app; it is the audit trail between evidence and future implementation.

## Fronts

| Front | Folder | Output |
|---|---|---|
| Poker brain / tournament knowledge | [`poker-brain/`](poker-brain/) | Concepts, claims, implementation candidates, test needs, drill/explanation ideas. |
| Design / UX references | [`design/`](design/) | Reference patterns, UX principles, page/component opportunities, anti-patterns. |
| Solver / tool feasibility | [`solvers/`](solvers/) | Local vs cloud trade-offs, licensing, cost model, integration boundaries. |
| Competitors / market positioning | [`competitors/`](competitors/) | Competitor matrix, pricing signals, positioning gaps, validation questions. |
| Site access / import sources | [`site-access/`](site-access/) | Room export paths, auth boundaries, source capabilities, parser-support priorities. |

Note: “site access / import sources” is about poker-room hand-history exports for the product. User-authorized research access to poker schools, GTO Wizard, or other study platforms belongs under `poker-brain/` and follows the private-source rules below.

## Ledgers

- [`SOURCE_LEDGER.md`](SOURCE_LEDGER.md) records every source before it influences product logic or positioning.
- [`CLAIMS_LEDGER.md`](CLAIMS_LEDGER.md) records normalized claims extracted from sources, including confidence, IP status, and implementation status.

## Source classes

| Source type | Examples | Allowed usage |
|---|---|---|
| Public | Public blog posts, docs, GitHub repos, public videos/transcripts. | Quote sparingly with attribution; implement abstractions after verification. |
| User-authorized private | Poker school dashboards/videos/PDFs the user logs into. | Internal reference only unless explicit license allows quotation. Translate into original abstractions; do not copy charts/copy/videos. |
| User-provided | Files the user directly provides. | Treat according to user instruction and file license; default to internal reference. |
| Internal repo | `docs/knowledge/`, source code, tests. | Source-of-truth for current app behavior; do not assume public-safe language. |
| Generated analysis | Hermes/Antigravity synthesis. | Never source alone; must point back to primary sources or code. |

## IP / usage statuses

- `safe-to-quote`: public source, short attributed excerpt or paraphrase acceptable.
- `safe-to-implement-as-abstraction`: concept may inform original logic/tests/UX, but do not copy expression or exact proprietary tables.
- `internal-reference-only`: useful for thinking; keep out of public docs/UI/marketing.
- `unsafe`: do not use until licensing/legal/user guidance changes.

## Research-to-code gate

A finding may become product work only when it has:

1. at least one source-ledger row,
2. a claims-ledger row,
3. an IP/usage status,
4. an explicit confidence level,
5. an implementation candidate or reason it is reference-only,
6. a validation path: fixture/test, user interview, solver check, or competitor comparison.

## Current posture

Keep the product positioned as a private/local generic poker hand-history analyzer and study coach. Solver-like or range-compliance claims must remain explicit about whether they are rule-based, reference/proxy-based, or truly solver-backed.
