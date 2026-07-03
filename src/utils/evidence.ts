/**
 * Utility to resolve evidence labels for leaks and study plan items.
 *
 * Mapped categories:
 * - rule-based: preflop local range comparisons and simple heuristics.
 * - proxy-model: postflop frequency expectations and baseline approximation metrics.
 * - local-reference: heads-up push/fold charts loaded locally by the user.
 * - unsupported: pure chip/BB outcome counts without matching strategic model mapping.
 */

import type { Evidence, EvidenceKind } from '../types/evidence';

type EvidenceCitationStatus = 'not_required' | 'present' | 'missing';

export interface EvidenceMetadata {
  label: string;
  tooltip: string;
  badgeClass: string;
  strength: 'rule_based' | 'directional' | 'reference_check' | 'review_only';
  strengthLabel: string;
  strengthClass: string;
  citationStatus: EvidenceCitationStatus;
  citationLabel: string;
  citationClass: string;
  citationTooltip: string;
  canonicalKind: EvidenceKind | null;
  caveat: string;
  solverBacked: boolean;
  canRenderAsAdvice: boolean;
}

const STRENGTH_CLASS: Record<EvidenceMetadata['strength'], string> = {
  rule_based: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  directional: 'bg-warn/10 text-warn border-warn/30',
  reference_check: 'bg-warn/10 text-[var(--fg-muted)] border-warn/20',
  review_only: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

const CITATION_CLASS: Record<EvidenceCitationStatus, string> = {
  present: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  missing: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  not_required: 'bg-white/5 text-white/45 border-white/10',
};

const CITATION_LABEL: Record<EvidenceCitationStatus, string> = {
  present: 'KB cited',
  missing: 'Needs citation',
  not_required: 'No citation',
};

function citationStatusFor(evidence?: Evidence): EvidenceCitationStatus {
  if (!evidence || evidence.kind === 'unsupported') return 'not_required';
  return evidence.citations.length > 0 ? 'present' : 'missing';
}

function citationTooltipFor(status: EvidenceCitationStatus, evidence?: Evidence): string {
  if (!evidence) return 'No canonical evidence object was attached to this UI item yet.';
  if (status === 'present') return 'This claim includes at least one knowledge-base citation.';
  if (status === 'missing') return 'This claim has a non-unsupported evidence kind, but no knowledge-base citation is attached yet.';
  return 'Unsupported or review-only items do not require a knowledge-base citation.';
}

function evidenceMetadata(
  input: Omit<
    EvidenceMetadata,
    | 'strengthClass'
    | 'citationStatus'
    | 'citationLabel'
    | 'citationClass'
    | 'citationTooltip'
    | 'canonicalKind'
    | 'solverBacked'
    | 'canRenderAsAdvice'
  > & {
    evidence?: Evidence;
    canonicalKind?: EvidenceKind | null;
    solverBacked?: boolean;
    canRenderAsAdvice?: boolean;
  },
): EvidenceMetadata {
  const citationStatus = citationStatusFor(input.evidence);
  const solverBacked = input.solverBacked ?? (input.evidence?.kind === 'solver_backed');
  const canRenderAsAdvice = input.canRenderAsAdvice ?? (input.evidence ? input.evidence.kind !== 'unsupported' : true);

  return {
    ...input,
    strengthClass: STRENGTH_CLASS[input.strength],
    citationStatus,
    citationLabel: CITATION_LABEL[citationStatus],
    citationClass: CITATION_CLASS[citationStatus],
    citationTooltip: citationTooltipFor(citationStatus, input.evidence),
    canonicalKind: input.canonicalKind ?? input.evidence?.kind ?? null,
    solverBacked,
    canRenderAsAdvice,
  };
}

function metadataFromCanonicalEvidence(evidence: Evidence): EvidenceMetadata {
  if (evidence.kind === 'unsupported') {
    return evidenceMetadata({
      label: 'unsupported',
      tooltip: 'No strategic model or knowledge-base rule supports this as advice.',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      strength: 'review_only',
      strengthLabel: 'Review only',
      caveat: evidence.note ?? 'Use this to pick hands for manual review, not as a strategy verdict.',
      evidence,
      canRenderAsAdvice: false,
    });
  }

  if (evidence.kind === 'rule_based') {
    return evidenceMetadata({
      label: 'rule-based',
      tooltip: 'Mapped from written strategy rules in the local knowledge base.',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      strength: 'rule_based',
      strengthLabel: 'Rule-based, no EV',
      caveat: evidence.note ?? 'Chart/rule comparison only. No solver EV is attached, so review the hand context before changing strategy.',
      evidence,
    });
  }

  if (evidence.kind === 'local_reference') {
    return evidenceMetadata({
      label: 'local-reference',
      tooltip: 'Calculated from a local table or reference source rather than live solver output.',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      strength: 'reference_check',
      strengthLabel: 'Reference check',
      caveat: evidence.note ?? 'Uses a local reference table. Treat as a practical drill prompt; EV loss is unknown.',
      evidence,
    });
  }

  if (evidence.kind === 'solver_backed') {
    return evidenceMetadata({
      label: 'solver-backed',
      tooltip: 'Backed by real solver output.',
      badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      strength: 'rule_based',
      strengthLabel: 'Solver-backed',
      caveat: evidence.note ?? 'Solver-backed result. Still verify the hand context, format, and assumptions before applying it broadly.',
      evidence,
      solverBacked: true,
    });
  }

  return evidenceMetadata({
    label: 'proxy-model',
    tooltip: 'Deterministic proxy output or frequency heuristic; this is not solver EV.',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    strength: 'directional',
    strengthLabel: 'Directional only',
    caveat: evidence.note ?? 'Frequency heuristic only. No solver EV is attached; use this as a study prompt until the spot is manually reviewed.',
    evidence,
  });
}

export function getEvidenceMetadata(id: string, sourceKind?: string, evidence?: Evidence): EvidenceMetadata {
  if (evidence) return metadataFromCanonicalEvidence(evidence);

  const cleanId = id.toLowerCase();

  // 1. Local Heads-Up push/fold references
  if (cleanId.includes('reference-hu-push-fold') || cleanId.includes('cbet_hu') || sourceKind === 'reference') {
    // Note: cbet_hu itself is preflop PFR cbet in HU pots, but HU references are local-reference.
    // If it's the specific HU push/fold reference queue item:
    if (cleanId.includes('reference-hu-push-fold')) {
      return evidenceMetadata({
        label: 'local-reference',
        tooltip: 'Calculated using your uploaded or configured local heads-up push/fold CSV/table references.',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        strength: 'reference_check',
        strengthLabel: 'Reference check',
        caveat: 'Uses your local reference table. Treat as a practical drill prompt; EV loss is unknown.',
      });
    }
  }

  // 2. Unsupported / Raw outcomes (like big BB losses)
  if (cleanId.includes('loss-biggest-bb-swings') || sourceKind === 'loss') {
    return evidenceMetadata({
      label: 'unsupported',
      tooltip: 'Derived directly from net big blind outcomes without strategic ranges or solver approximations.',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      strength: 'review_only',
      strengthLabel: 'Review only',
      caveat: 'Sorted by normalized loss, not by a strategy model. Use this to choose hands to inspect, not as a verdict.',
    });
  }

  // 3. Rule-based preflop rules
  // VPIP, PFR, Limping, VPIP-PFR Gap, 3-Bet, range compliance, and preflop deviations.
  const isPreflopRule = 
    cleanId.includes('vpip') || 
    cleanId.includes('pfr') || 
    cleanId.includes('limping') || 
    cleanId.includes('limps') || 
    cleanId.includes('3bet') || 
    cleanId.includes('three_bet') || 
    cleanId.includes('compliance') || 
    cleanId.includes('deviation-') ||
    sourceKind === 'deviation';

  // Make sure postflop deviations are not misclassified as preflop (deviationType is only preflop)
  if (isPreflopRule && !cleanId.includes('postflop_')) {
    return evidenceMetadata({
      label: 'rule-based',
      tooltip: 'Preflop checks mapped from documented preflop charts and standard tactical rules.',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      strength: 'rule_based',
      strengthLabel: 'Rule-based, no EV',
      caveat: 'Chart/rule comparison only. No solver EV is attached, so review the hand context before changing strategy.',
    });
  }

  // 4. Proxy-model postflop frequency expectations
  // Flop C-Bet, C-Bet HU, WTSD, Won at SD, AF, and detailed postflop errors.
  return evidenceMetadata({
    label: 'proxy-model',
    tooltip: 'Postflop frequency expectations and baseline approximation ranges.',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    strength: 'directional',
    strengthLabel: 'Directional only',
    caveat: 'Frequency heuristic only. No solver EV is attached; use this as a study prompt until the spot is manually reviewed.',
  });
}
