import type { ICMStage } from '../data/strategyProfiles';

export type Position =
  | 'UTG'
  | 'UTG+1'
  | 'MP1'
  | 'MP'
  | 'MP2'
  | 'HJ'
  | 'CO'
  | 'BTN'
  | 'SB'
  | 'BB'
  | 'BTN/SB';

export type Scenario =
  | 'RFI'
  | 'BLIND_WAR'
  | 'HU_BTN'
  | 'FACING_RAISE'
  | 'FACING_ALL_IN'
  | 'FACING_LIMP'
  | 'BB_VS_RAISE'
  | 'BB_VS_LARGE_RAISE'
  | 'BB_VS_LIMP'
  | 'WALK';

export type DeviationType =
  | 'OVERFOLD'
  | 'OPENED_OUT_OF_RANGE'
  | 'LIMPED'
  | 'SB_OVERFOLD'
  | 'SB_LIMPED'
  | 'SB_OUT_OF_RANGE'
  | 'COLD_CALL'
  | 'BB_FOLD_SUITED'
  | 'SB_COLD_CALL'
  | 'FOLD_VS_LIMP'
  | 'LIMP_BEHIND'
  | 'HU_BTN_FOLD';

/** Hero's decision for a single hand, used for range compliance and leak detection. */
export interface HeroDecision {
  id?: number;
  handId: string;
  position: Position;
  handKey: string;
  stackBb: number;
  scenario: Scenario;
  action: 'fold' | 'raise' | 'call' | 'check';
  isCompliant: boolean;
  deviationType: DeviationType | null;
  sawFlop: boolean;
  wasPreFlopRaiser: boolean;
  cbetOpportunity: boolean;
  cbetMade: boolean;
  cbetHU: boolean;
  doubleBarrelOpportunity: boolean;
  doubleBarrelMade: boolean;
  wentToShowdown: boolean;
  wonAtShowdown: boolean;
  wonAmount: number;
  icmStage?: ICMStage;
  squeezeSpot?: { callerCount: number; heroAction: string; recommendedSizing: number } | null;
  netProfit: number;
  openerPosition?: Position | null;
}
