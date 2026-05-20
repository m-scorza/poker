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
}

export function getEvidenceMetadata(id: string, sourceKind?: string): EvidenceMetadata {
  const cleanId = id.toLowerCase();

  // 1. Local Heads-Up push/fold references
  if (cleanId.includes('reference-hu-push-fold') || cleanId.includes('cbet_hu') || sourceKind === 'reference') {
    // Note: cbet_hu itself is preflop PFR cbet in HU pots, but HU references are local-reference.
    // If it's the specific HU push/fold reference queue item:
    if (cleanId.includes('reference-hu-push-fold')) {
      return {
        label: 'local-reference',
        tooltip: 'Calculated using your uploaded or configured local heads-up push/fold CSV/table references.',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      };
    }
  }

  // 2. Unsupported / Raw outcomes (like big BB losses)
  if (cleanId.includes('loss-biggest-bb-swings') || sourceKind === 'loss') {
    return {
      label: 'unsupported',
      tooltip: 'Derived directly from net big blind outcomes without strategic ranges or solver approximations.',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
    };
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
    return {
      label: 'rule-based',
      tooltip: 'Preflop checks mapped from GTO preflop charts and standard tactical rules.',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    };
  }

  // 4. Proxy-model postflop frequency expectations
  // Flop C-Bet, C-Bet HU, WTSD, Won at SD, AF, and detailed postflop errors.
  return {
    label: 'proxy-model',
    tooltip: 'Postflop frequency expectations and baseline GTO approximation ranges.',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  };
}
