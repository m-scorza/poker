# Solver Feasibility Refresh and SpotPacket Design

Date: 2026-06-28  
Front: Solver/tool feasibility  
Access posture: public docs/pages and current repo code only. No paid-account or private-course material.  
Research question: what can this app safely export to solver tools without claiming solver-backed EV before a real solver adapter exists?

## Verdict

Do **not** add an automatic solver dependency to the product yet.

The correct next step is a small, typed **SpotPacket** boundary:

> Parsed hand + decision context + tournament metadata + explicit missing-context warnings, exported as a solver-neutral study packet.

A SpotPacket should be safe to inspect locally, attach to a hand review, and later adapt into HRC / ICMIZER / GTO Wizard / Postflopizer / open-source solver workflows. It should **not** produce EV loss, frequencies, or solver-backed recommendations by itself.

## Current repo state

Current code already has the right safety posture:

- `src/analysis/solverAdapter.ts`
  - `SolverSpotInput` contains a narrow preflop/postflop boundary.
  - `createUnsupportedSolverAdapter()` blocks solver claims when no adapter is configured.
  - `createDeterministicProxySolverAdapter()` is explicitly `proxy_model`, returns no EV loss, and refuses ICM/bounty-sensitive contexts.
- `src/types/evidence.ts`
  - `solver_backed` exists in the vocabulary, but current comments correctly say no code path produces it today.
- `src/analysis/__tests__/solverAdapter.test.ts`
  - Guards unsupported/proxy labels and no-EV behavior.
- `src/analysis/__tests__/solverSpotBuilder.test.ts`
  - Verifies conversion from a parsed hand to bb-normalized solver input.

Gap: `SolverSpotInput` is useful for an internal adapter boundary, but too narrow for external solver review. It lacks explicit payout model, ante type, player list/state, rake settings, tree config, input-range assumptions, export target, and missing-context diagnostics.

## Feasibility matrix

| Target | Best use | Integration tier | Evidence basis | What a SpotPacket can do now | Main blocker before solver-backed claims |
|---|---|---|---|---|---|
| HRC Classic | Short-stacked tournament / push-fold / ICM preflop review | External manual/export target first | HRC public pricing/docs: Classic for short-stacked tournament calculations; docs cover push/fold setup, tree config, Monte Carlo sampling | Export stacks, blinds, antes, action path, tournament stage, payout gaps, and hero decision for manual setup | Need exact payout/player-count/stack context and a tested import path; HRC is powerful but setup-sensitive. |
| HRC Pro | Any-stack tournament/cash preflop + postflop review | External manual/export target; possible future script/config generator | HRC Pro docs: any stack depth, postflop, tree config, frequency locks, scripted tree building | Export richer tree-config hints, ranges-as-unknown, board/pot/action history | Need license, local installation, script/import workflow, and validation fixtures. |
| ICMIZER | Tournament push/fold mistake review and MTT Coach-style drill inspiration | External manual/export target | ICMIZER docs: load hands/tournament, find costly push/fold mistakes, ICM/FGS/Nash/ChipEV | Export push/fold candidate packet plus missing payout/range assumptions | Need exact supported hand-history/import format and model settings. |
| GTO Wizard Analyzer | Cloud upload analyzer and EV-loss workflow pattern | External hand-history export / upload guidance only | GTO Wizard docs: upload sessions, closest solution matching, EV-loss sorting, unsupported/partial statuses | Preserve original hand history and attach local context; link to unsupported/partial caveats | Cloud quota/subscription, supported sites/formats, closest-solution assumptions, no public local API for direct SpotPacket solve. |
| Postflopizer | Manual postflop solve setup with approachable UI | External manual/export target | Postflopizer page: custom stacks, bet sizings, preflop ranges, nodelocking, local CPU calculations | Export board, pot, stacks, action path, and placeholders for ranges/bet tree | Need actual range construction and user-owned solver install/license. |
| TexasSolver | Offline postflop research spike | Throwaway local CLI spike only | TexasSolver public repo/page: C++ solver, GUI/console, strategy JSON, AGPL-3.0, GPU version promoted | Use one sanitized heads-up postflop fixture to test CLI output and JSON shape | AGPL/license/package/runtime implications; postflop only; not automatic app dependency. |
| WASM/Desktop Postflop | Browser/desktop open-source postflop reference | Research spike only | Repos: AGPL-3.0, development suspended, browser/desktop postflop solver | Validate whether a tiny browser/desktop demo can consume a simplified packet | Development suspended, AGPL, memory/runtime, API instability. |
| postflop-solver Rust library | Solver-engine reference | Research reference only | Repo: Rust engine, development suspended, direct library use not primary, breaking changes likely | Inform future boundaries and warnings | Suspended, unstable API, AGPL, not product dependency. |

## SpotPacket design

A SpotPacket is a **study/export artifact**, not a solver answer.

### Goals

- Preserve the exact parsed hand context needed for external solver setup.
- Make missing context obvious before a user trusts a recommendation.
- Separate current local evidence labels from future solver output.
- Support multiple target adapters without changing parser/analysis internals.
- Keep private raw hands local unless the user explicitly exports/uploads them.

### Non-goals

- No EV-loss calculation.
- No solver frequencies.
- No automatic upload to paid/cloud tools.
- No proprietary chart/range embedding.
- No claim that a rule/proxy finding is solver-backed.

### Type sketch

```ts
export type SpotPacketTarget =
  | 'generic'
  | 'hrc'
  | 'icmizer'
  | 'gto_wizard'
  | 'postflopizer'
  | 'texas_solver'
  | 'wasm_postflop';

export type SpotPacketEvidenceLabel =
  | 'study_packet_only'
  | 'rule_based_source'
  | 'proxy_model_source'
  | 'solver_backed_result';

export interface SpotPacket {
  schemaVersion: 'spot-packet/v1';
  packetId: string;
  createdAt: string;
  source: {
    handId: string;
    originalSite?: string;
    parser?: string;
    importRunId?: string;
    localOnly: true;
  };
  target: SpotPacketTarget;
  evidenceLabel: SpotPacketEvidenceLabel;
  warnings: SpotPacketWarning[];

  game: SpotPacketGame;
  tournament?: SpotPacketTournament;
  players: SpotPacketPlayer[];
  hero: SpotPacketHero;
  actionPath: SpotPacketAction[];
  board: string[];
  pot: SpotPacketPot;
  treeHints?: SpotPacketTreeHints;
  rangeHints?: SpotPacketRangeHints;
  reviewQuestion: SpotPacketReviewQuestion;
}
```

### Required field groups

| Group | Required for HRC/ICM validation | Required for postflop validation | Notes |
|---|---:|---:|---|
| Blinds / antes / ante type | Yes | Yes | Convert all chip values and bb values; record if ante type is inferred. |
| Table seats / positions / stacks | Yes | Yes | Use ordered active seats; do not rely on raw contiguous seat numbers. |
| Payouts / remaining field / paid places | Yes for real ICM | No for chipEV postflop | If missing, mark `missing_payouts` and keep output as study packet only. |
| Bounty / PKO context | Yes for bounty spots | Sometimes | If bounty data is partial, mark `bounty_context_partial`. |
| Hero cards | Yes for single-hand review | Yes | If absent, packet can still describe population/spot but not exact combo. |
| Board | No for pure preflop | Yes | Empty for preflop; flop/turn/river arrays for postflop. |
| Pot and action path | Yes | Yes | The external solver must reconstruct the node. |
| Bet sizing / tree hints | Helpful | Required for postflop | HRC/Postflopizer/TexasSolver require explicit abstraction/tree decisions. |
| Ranges | Often solver-generated for push/fold; needed for custom trees | Required for postflop | If unknown, record as unknown instead of fabricating. |
| Rake | No for MTT table decisions | Yes for cash solver EV | Required for cash-game postflop accuracy. |

### Warning vocabulary

```ts
export type SpotPacketWarning =
  | 'missing_original_hand_history'
  | 'missing_hero_cards'
  | 'missing_big_blind'
  | 'missing_ante_type'
  | 'missing_payouts'
  | 'missing_players_remaining'
  | 'missing_paid_places'
  | 'missing_bounty_context'
  | 'range_assumptions_unknown'
  | 'tree_configuration_required'
  | 'multiway_postflop_solver_limited'
  | 'unsupported_large_field_icm'
  | 'external_tool_required'
  | 'not_solver_backed';
```

### Minimal v1 packet scope

The first implementation should support exactly these cases:

1. **Preflop MTT decision packet**
   - Works for RFI, facing raise, BB defense, squeeze, push/fold candidates.
   - Adds ICM warnings when payouts/field context are missing.
   - Targets `generic`, `hrc`, or `icmizer` as manual export labels.

2. **Postflop review packet**
   - Works for heads-up flop/turn/river spots only.
   - Requires board, pot, stacks, action path.
   - Marks `range_assumptions_unknown` and `tree_configuration_required` unless ranges/tree hints exist.

Do not attempt automatic multiway postflop solving in v1.

## Product labeling rules

| Artifact | UI label |
|---|---|
| SpotPacket with no external result | `study packet` / `external review ready` |
| Current range or study queue rule | `rule-based, no EV` |
| Deterministic local proxy | `directional only` |
| Manual import/export to HRC/ICMIZER/GTO Wizard with no result captured | `external review packet`, not solver-backed |
| Captured solver output with source/version/config and comparable fixture | `solver-backed` |

`solver_backed` should require all of:

- solver identity and version,
- exact input packet hash,
- calculation/config model,
- output frequencies/EVs,
- warning-free or explicitly caveated coverage,
- source/license permission to use the result.

## Implementation status after 2026-06-29 slices

The code-level `SpotPacket` boundary now exists without any solver dependency.

Implemented files:

- `src/analysis/spotPacket.ts`
- `src/analysis/__tests__/spotPacket.test.ts`
- `src/components/hands/SpotSourcePanel.tsx`
- `src/components/hands/__tests__/SpotSourcePanel.test.tsx`

Completed acceptance criteria:

1. Converts a parsed preflop `HeroDecision` into `SpotPacket` v1.
2. Includes warnings for missing payouts/field data on ICM-sensitive spots.
3. Includes `not_solver_backed` until an external solver result is attached.
4. Produces stable packet IDs/hashes for reproducible external review.
5. Does not expose raw hand text, filenames/paths, or villain names by default.
6. Does not modify `SolverAnalysisResult.evLossBb` behavior.
7. Offers a selected-hand local JSON download from Hand Replay for sanitized `SpotPacket` review/export.

Remaining next slice:

- Promote hand queues into a multi-packet Study Queue export, still local-only and still labeled `study_packet_only` until an external solver result with source/version/config is captured.

Verification used by the 2026-06-29 implementation slices:

```bash
npx vitest run src/analysis/__tests__/spotPacket.test.ts src/analysis/__tests__/solverAdapter.test.ts
npx vitest run src/components/hands/__tests__/SpotSourcePanel.test.tsx
npx tsc -b --pretty false
npm run docs:check
```
