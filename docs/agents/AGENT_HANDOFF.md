# Agent Handoff Log

Use this file as the shared baton between Hermes, Google Antigravity, and any other coding agent. Keep the newest entry at the top.

Older or compacted handoff records are archived in:

- [AGENT_HANDOFF_ARCHIVE_2026_06.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_06.md)
- [AGENT_HANDOFF_ARCHIVE_2026_05.md](./archive/AGENT_HANDOFF_ARCHIVE_2026_05.md)

## 2026-06-14 - Code health: break importRuns↔store cycle + dedupe test factories

- Owner / agent:          Claude
- Branch:                 claude/nifty-gould-3c3457
- Scope:                  `src/data/importRuns.ts`, shared test-factory module + test files
- Files touched:
  - `src/data/importRuns.ts` - removed the dead `export { saveImportRun, getRecentImportRuns } from './store'` re-export.
  - `src/test/factories.ts` (new) - canonical `makeHand`/`makePlayer`/`makeAction`/`makeTournament` with neutral defaults.
  - `bountyAnalyzer`, `finalTableAnalyzer`, `icmDetector`, `scenarioDetector`, `squeezeDetector`, `careerCoach`, `sessions` test files - replaced ~20-line literal factories with thin baseline wrappers (or direct import) over the shared module.
- Summary:
  - Closes the 2026-06-12 health review's finding #2 (next-action #3): the `importRuns → store` re-export was the only value-level cycle edge. Verified all three consumers (`HandsUpload`, `LeaksPage`, `CareerPage`) and both test files already import persistence directly from `store`, so the re-export was dead code. After removal `importRuns.ts` has zero dependency on `store`; the surviving `import type { ImportRunRecord }` in `store.ts` is type-only/erased.
  - Closes finding #5 (next-action #5): full `Hand`/`PlayerInHand`/`Action`/`Tournament` shapes now live once in `src/test/factories.ts`. Each migrated file keeps its previous effective defaults via a thin wrapper, so adding a domain field is a one-place edit. Bespoke helpers (`store.test.ts` positional factories, `makeImportRunRecord`, `makePlayers`, `makeParsedHand`, `makeDecision`, `sessions` date-string `makeHand`) left local. Net -104 lines.
- Verification:
  - `npm run typecheck` - pass.
  - `npm run typecheck:test` - pass.
  - `npm run lint` - pass (0 errors, 10 pre-existing jsx-a11y warnings, untouched).
  - `npm test` - **693 / 693** (63 files).
  - `npm run build` - pass (PWA precache 56 entries).
  - `npm run docs:check` - pass (no autogen drift; `src/test/` is outside the enumerated src-tree blocks).
- Risks / assumptions:    Test-only refactor plus one dead-code deletion; no runtime/product code paths changed.
- Next action requested:  None blocking. Follow-ups from the 2026-06-12 review remain open: #4 `HandsUpload` component test (separate larger PR), `hygiene-scanner.ts` false positives, jsx-a11y warnings.

## 2026-06-11 - Reskin UI to "Precision Instrument" Design System

- Owner / agent:          Antigravity
- Branch:                 main
- Scope:                  Full application reskin using the Design Lab components and GSAP/Three.js
- Files touched:          `src/index.css`, `src/App.tsx`, `src/pages/*.tsx`, `src/components/**/*.tsx` (28+ files)
- Summary:                
  - Updated Tailwind v4 variables mapping to the `tokens.css` design system primitives (`--bg`, `--fg`, `--ink`, `--hairline`, `--loss`, etc.).
  - Replaced legacy `.glass-card` elements with the system's strict `.compartment` constraint across all pages.
  - Implemented the `.mc` and `.tabs` matrix structures for the Range grids.
  - Ported Dashboard, Hands, Leaks, Sessions, Arena, Career, and Villains pages to match the "Command Desk R" reference pixel for pixel.
  - Ran a global migration script converting legacy CSS custom properties to the new naming scheme.
- Verification:           
  - `npm run build` - passed (zero TypeScript or Vite PWA build errors).
- Risks / assumptions:    
  - Some components relying on legacy `bg-black/20` inline utilities were migrated, but very specific bespoke positioning in non-standard plugins should be checked on edge-case data.
- Next action requested:  
  - Visual QA check on Safari. Review the hand replays visually to ensure the "felt" aesthetic matches the design lab exactly.

## 2026-06-07 - Leak Confidence, Branding Neutralization, and Variant Fixtures

- Owner / agent:          Antigravity
- Branch:                 codex/parser-confidence-ledger
- Scope:                  Leak confidence computation, brand comment neutralization, and specialized variant fixtures (Zoom/Cap/6+/Play-Money).
- Files touched:
  - `src/analysis/leakDetector.ts` - adds `confidence` to `Leak` interface and `detectLeaks` calculation.
  - `src/analysis/rangeChecker.ts`, `src/data/ranges.ts`, `src/data/strategyProfiles.ts` - neutralizes comments containing "Reg Life" or "Plano de Jogo" references.
  - `src/parser/pokerstars.ts` - adds button blind parsing for 6+ Hold'em and play money cash game stakes fallback.
  - `src/parser/__tests__/fixtureSweep.test.ts` - adds specialized variant fixture checks.
- Summary:
  - Added confidence logic to the leak detector to compute Low/Medium/High confidence based on sample size thresholds (e.g. Low if < 30 hands for preflop, or < 10 opportunities for postflop/3-bet).
  - Purged remaining comments mentioning "Reg Life" or "Plano de Jogo" from strategy/ranges files.
  - Implemented button blind parsing and play money cash game stakes parsing fallbacks in the parser.
  - Added dedicated test sweeps verifying correct parsing of Zoom, Cap, 6+ Hold'em, and play-money fixtures.
- Verification:
  - `npm test` - passed, 693 tests.
  - `npx tsc -b --pretty false` - passed.
  - `npm run docs:update` and `npm run docs:check` - passed.
  - `npm run build` - passed.
- Risks / assumptions:
  - Play money detection relies on the absence of cash symbols in cash blinds headers (e.g. `(100/200)`).
- Next action requested:
  - Verify the engine outputs and proceed with validation loops.

## Template

```md
## YYYY-MM-DD - <short task name>

- Owner / agent:          # Agent name (Antigravity, Hermes, Claude)
- Branch:                 # Active git branch name
- Scope:                  # Files allowed to be touched
- Files touched:          # Files modified or created
- Summary:                # Bullet points describing changes
- Verification:           # Output of validation commands and logs
- Risks / assumptions:    # Structural dependencies and risks
- Next action requested:  # Action instructions for the next agent
```
