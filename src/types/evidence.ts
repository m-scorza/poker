/**
 * Shared evidence vocabulary for analysis outputs.
 *
 * Every analysis primitive surfaced to the UI (leaks, study-queue items,
 * push/fold checks, solver recommendations, postflop flags) should carry an
 * `Evidence` value so the UI can render confidence honestly. The goal is to
 * never let unsupported analysis look as authoritative as a rule-based finding,
 * and never let a rule-based finding look solver-backed.
 *
 * `EvidenceKind` was first introduced inside `src/analysis/solverAdapter.ts`
 * as `SolverEvidenceKind`. This module is the canonical home; `solverAdapter`
 * re-exports the alias for back-compat.
 */

/**
 * Provenance of an analysis claim.
 *
 * - `unsupported`     no basis — placeholder; never to be rendered as advice.
 * - `rule_based`      derived from a written rule in `/docs/knowledge/strategy/`.
 * - `local_reference` matches a local table/CSV (e.g. HU push/fold equilibrium).
 * - `proxy_model`     deterministic proxy adapter output; never solver EV.
 * - `solver_backed`   real solver output. No code path produces this today.
 */
export type EvidenceKind =
  | 'unsupported'
  | 'rule_based'
  | 'local_reference'
  | 'proxy_model'
  | 'solver_backed';

/**
 * A pointer into the knowledge base, with a verbatim excerpt the UI can show.
 *
 * `docPath` is repo-relative (e.g. `docs/knowledge/strategy/04-postflop-strategy.md`).
 * `section` is a stable anchor (e.g. `§3.2 C-bet IP vs BB`).
 * `quote` is a short excerpt that must appear verbatim in the doc.
 */
export interface KbCitation {
  docPath: string;
  section: string;
  quote: string;
}

/**
 * A trust label attached to an analysis output.
 *
 * `citations` may be empty even when `kind !== 'unsupported'` — that means the
 * rule is known to exist but the doc-of-record has not been written yet. The
 * UI can render a "needs citation" badge for that state. Do not fabricate
 * citations to fill the gap.
 */
export interface Evidence {
  kind: EvidenceKind;
  citations: KbCitation[];
  note?: string;
}

/** Stable paths into the knowledge base, used by analysis modules to cite without typos. */
export const KB_PATHS = {
  pokerMath: 'docs/knowledge/strategy/01-poker-math.md',
  rangesAndPosition: 'docs/knowledge/strategy/02-ranges-and-position.md',
  preflopStrategy: 'docs/knowledge/strategy/03-preflop-strategy.md',
  postflopStrategy: 'docs/knowledge/strategy/04-postflop-strategy.md',
  icmAndRiskPremium: 'docs/knowledge/strategy/05-icm-and-risk-premium.md',
  bountyTournaments: 'docs/knowledge/strategy/06-bounty-tournaments.md',
  finalTablePlay: 'docs/knowledge/strategy/07-final-table-play.md',
  gtoAndExploits: 'docs/knowledge/strategy/08-gto-and-exploits.md',
  studyMethods: 'docs/knowledge/strategy/09-study-methods-and-tools.md',
  metricsDictionary: 'docs/knowledge/strategy/METRICS_DICTIONARY.md',
} as const;

/**
 * Convenience constructor. Callers can also build `Evidence` objects inline.
 */
export function createEvidence(
  kind: EvidenceKind,
  citations: KbCitation[] = [],
  note?: string,
): Evidence {
  return note === undefined ? { kind, citations } : { kind, citations, note };
}

/**
 * The single `unsupported` value used wherever an analysis path has no basis
 * to make a claim. Stable identity makes it trivially detectable in tests
 * and UI guards.
 */
export const UNSUPPORTED_EVIDENCE: Evidence = { kind: 'unsupported', citations: [] };
