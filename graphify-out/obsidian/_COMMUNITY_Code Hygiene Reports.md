---
type: community
members: 3
---

# Code Hygiene Reports

**Members:** 3 nodes

## Members
- [[Code Hygiene Audit Report - Phase 1]] - document - docs/reports/code_hygiene_audit.md
- [[Formatter Consolidation (pctmoney to format.ts)]] - concept - docs/reports/code_hygiene_audit.md
- [[Position Type Circular Dependency]] - concept - docs/reports/code_hygiene_audit.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Code_Hygiene_Reports
SORT file.name ASC
```
