---
type: community
members: 5
---

# PokerStars Hand History Format

**Members:** 5 nodes

## Members
- [[Fixture Sweep Test]] - concept - docs/product/PARSER_HEALTH.md
- [[PokerStars Cap All-In Cash Fixture (Isonoe III)]] - document - src/test/fixtures/pokerstars/hh/HH20260216 Isonoe III Cap - US$ 0,05-US$ 0,10 - USD No Limit All-in Poker.txt
- [[PokerStars Hand History Format]] - concept - src/test/fixtures/pokerstars/hh/HH20260216 Praxedis III - US$ 0,01-US$ 0,02 - USD No Limit Hold'em.txt
- [[PokerStars NLHE Cash Fixture (Praxedis III)]] - document - src/test/fixtures/pokerstars/hh/HH20260216 Praxedis III - US$ 0,01-US$ 0,02 - USD No Limit Hold'em.txt
- [[PokerStars Tournament Fixture T3974723402]] - document - src/test/fixtures/pokerstars/hh/HH20260216 T3974723402 No Limit Hold'em US$ 1,40 + US$ 0,10.txt

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/PokerStars_Hand_History_Format
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Data Model and Privacy Boundary]]
- 1 edge to [[_COMMUNITY_Parser Health - Fixture Sweep]]

## Top bridge nodes
- [[PokerStars Hand History Format]] - degree 4, connects to 1 community
- [[Fixture Sweep Test]] - degree 2, connects to 1 community