import type { HeroDecision } from '../../types/analysis';

export type DrillType = 'spaced_review' | 'fault_fixer' | 'rfi_master' | 'cbet_clinic' | 'study_queue' | 'curriculum';
type CbetAction = 'check' | 'bet';

export function shouldCbet(decision: HeroDecision): boolean {
  if (decision.postflopActions?.some(action => action.spot === 'MISSED_CBET')) {
    return true;
  }
  return decision.cbetMade;
}

export function isCbetActionCorrect(decision: HeroDecision, action: CbetAction): boolean {
  return action === 'bet' ? shouldCbet(decision) : !shouldCbet(decision);
}

export type TrainerAction = string;

export function pickRandomDecision(pool: HeroDecision[]): HeroDecision | null {
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function labelSeedAction(action: string): string {
  if (action === 'all_in') return 'All-in';
  return action
    .replace(/^cbet_/, 'C-bet ')
    .replace(/^bet_/, 'Bet ')
    .replace(/^raise_/, 'Raise ')
    .replace(/_/g, '.')
    .replace(/pct/g, '%')
    .replace(/^\w/, (char) => char.toUpperCase());
}
