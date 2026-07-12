import type { Position, HeroDecision } from '../../types/analysis';

export const RFI_POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP', 'MP1', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export type ViewMode = 'compliance' | 'edit' | 'push_fold' | 'validator';

export function matchesPosition(decision: HeroDecision, position: Position): boolean {
  if (position === 'SB') {
    return decision.position === 'SB' || decision.position === 'BTN/SB';
  }
  return decision.position === position;
}

export function matchesScenario(
  decision: HeroDecision,
  scenario: 'RFI' | 'FACING_RAISE',
  openerPosition: Position | null = null,
): boolean {
  if (scenario === 'RFI') {
    return decision.scenario === 'RFI' || decision.scenario === 'BLIND_WAR' || decision.scenario === 'HU_BTN';
  }
  const isFacingRaise = decision.scenario === 'FACING_RAISE' || decision.scenario === 'BB_VS_RAISE';
  if (!isFacingRaise) return false;
  return openerPosition ? decision.openerPosition === openerPosition : true;
}
