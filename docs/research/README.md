# docs/research/ — moved to the private vault

The research corpus (competitor ledgers, solver-feasibility notes, design
pattern studies, source/claims ledgers, and the knowledge-access protocol)
lives in the **private `poker-knowledge` repository** under `research/`,
per the owner's 2026-07-01 decision (salvage plan R5): the ledgers cite
third-party courses and tools by name, and this app repo is public with an
explicit IP posture.

Nothing in `src/` depends on these documents — code consumes only the
brand-neutral abstractions already embedded in the analysis modules and
`docs/knowledge/`.
