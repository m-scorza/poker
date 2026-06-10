---
type: community
members: 6
---

# Data Model and Privacy Boundary

**Members:** 6 nodes

## Members
- [[Data Classes (rawnormalizedsanitizedaggregateforbidden)]] - concept - docs/product/DATA_MODEL_AND_PRIVACY.md
- [[Data Model and Privacy Boundary]] - document - docs/product/DATA_MODEL_AND_PRIVACY.md
- [[Import Run Diagnostics Ledger]] - concept - docs/product/DATA_MODEL_AND_PRIVACY.md
- [[Live Import Confidence Ledger]] - concept - docs/product/PARSER_HEALTH.md
- [[Local Contribution Package Builder]] - concept - docs/product/DATA_MODEL_AND_PRIVACY.md
- [[Sanitized Hand-History Fixture]] - concept - docs/product/DATA_MODEL_AND_PRIVACY.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Data_Model_and_Privacy_Boundary
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Engine, Solver Feasibility, and Pr]]
- 1 edge to [[_COMMUNITY_Privacy boundary check]]
- 1 edge to [[_COMMUNITY_PokerStars Hand History Format]]
- 1 edge to [[_COMMUNITY_Parser Health - Fixture Sweep]]

## Top bridge nodes
- [[Data Model and Privacy Boundary]] - degree 7, connects to 2 communities
- [[Sanitized Hand-History Fixture]] - degree 3, connects to 1 community
- [[Live Import Confidence Ledger]] - degree 2, connects to 1 community