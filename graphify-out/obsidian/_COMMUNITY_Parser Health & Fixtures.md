---
type: community
members: 11
---

# Parser Health & Fixtures

**Members:** 11 nodes

## Members
- [[Documentation Review 2026-05-31]] - document - docs/reports/2026-05-31-documentation-review.md
- [[Documentation Staleness and Alignment Audit]] - document - docs/reports/2026-05-17-docs-staleness-audit.md
- [[Fixture Sweep Test]] - concept - docs/product/PARSER_HEALTH.md
- [[Markdown Inventory and Cleanup Report]] - document - docs/reports/2026-05-17-markdown-inventory-and-cleanup.md
- [[Open Hand History JSON Adapter]] - concept - docs/research/2026-05-04-competitor-research-and-implementation-timeline.md
- [[Parser Health - Fixture Sweep]] - document - docs/product/PARSER_HEALTH.md
- [[PokerStars Tournament Fixture T3974723402]] - document - src/test/fixtures/pokerstars/hh/HH20260216 T3974723402 No Limit Hold'em US$ 1,40 + US$ 0,10.txt
- [[Review Output Refresh 2026-06-01]] - document - docs/reports/2026-06-01-review-output-refresh.md
- [[STATUS - What's Actually Shipped]] - document - docs/product/STATUS.md
- [[STATUS as Single Source of Truth]] - rationale - docs/product/STATUS.md
- [[Stale Findings Reconciliation 2026-06-05]] - document - docs/reports/2026-06-05-stale-findings-reconciliation.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Parser_Health__Fixtures
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Solver Boundary Spec]]
- 1 edge to [[_COMMUNITY_Data Model & Privacy Docs]]
- 1 edge to [[_COMMUNITY_Product Roadmap]]
- 1 edge to [[_COMMUNITY_Privacy Check & Status Docs]]
- 1 edge to [[_COMMUNITY_Product Readiness & Research]]
- 1 edge to [[_COMMUNITY_Hand History Fixtures]]

## Top bridge nodes
- [[STATUS - What's Actually Shipped]] - degree 8, connects to 3 communities
- [[Parser Health - Fixture Sweep]] - degree 5, connects to 1 community
- [[Review Output Refresh 2026-06-01]] - degree 2, connects to 1 community
- [[Open Hand History JSON Adapter]] - degree 2, connects to 1 community
- [[PokerStars Tournament Fixture T3974723402]] - degree 2, connects to 1 community