/**
 * Utility to resolve evidence labels for leaks and study plan items.
 *
 * Mapped categories:
 * - rule-based: preflop GTO range comparisons and simple heuristics.
 * - proxy-model: postflop frequency expectations and GTO-approximate metrics.
 * - local-reference: heads-up push/fold charts loaded locally by the user.
 * - unsupported: pure chip/BB outcome counts without matching strategic model mapping.
 */

export interface EvidenceMetadata {
  label: string;
  tooltip: string;
  badgeClass: string;
  strength: 'rule_based' | 'directional' | 'reference_check' | 'review_only';
  strengthLabel: string;
  strengthClass: string;
  caveat: string;
  solverBacked: boolean;
}

const STRENGTH_CLASS: Record<EvidenceMetadata['strength'], string> = {
  rule_based: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  directional: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  reference_check: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  review_only: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

function evidenceMetadata(input: Omit<EvidenceMetadata, 'strengthClass' | 'solverBacked'> & { solverBacked?: boolean }): EvidenceMetadata {
  return {
    ...input,
    strengthClass: STRENGTH_CLASS[input.strength],
    solverBacked: input.solverBacked ?? false,
  };
}

export function getEvidenceMetadata(id: string, sourceKind?: string): EvidenceMetadata {
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
      tooltip: 'Preflop checks mapped from GTO preflop charts and standard tactical rules.',
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
    tooltip: 'Postflop frequency expectations and baseline GTO approximation ranges.',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    strength: 'directional',
    strengthLabel: 'Directional only',
    caveat: 'Frequency heuristic only. No solver EV is attached; use this as a study prompt until the spot is manually reviewed.',
  });
}
