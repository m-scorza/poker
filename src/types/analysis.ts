import type { ICMStage } from '../data/strategyProfiles';
import type { PostflopAction } from '../analysis/postflopAnalyzer';
import type { BountyContext } from '../analysis/bountyAnalyzer';
import type { FakeShoveSpot, RestealSpot } from '../analysis/finalTableAnalyzer';
import type { Position } from './hand';
export type { Position };

export type Scenario =
  | 'RFI'
  | 'BLIND_WAR'
  | 'HU_BTN'
  | 'FACING_RAISE'
  | 'FACING_3BET'
  | 'FACING_ALL_IN'
  | 'FACING_LIMP'
  | 'BB_VS_RAISE'
  | 'BB_VS_RAISE_MULTIWAY'
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
  | 'HU_BTN_FOLD'
  | 'VS3BET_OVERFOLD'
  | 'VS3BET_LOOSE_CONTINUE'
  | 'VS3BET_WRONG_CONTINUE';

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
  bountyContext?: BountyContext | null;
  fakeShoveSpot?: FakeShoveSpot | null;
  restealSpot?: RestealSpot | null;
  squeezeSpot?: { callerCount: number; heroAction: string; recommendedSizing: number } | null;
  netProfit: number;
  /**
   * For FACING_RAISE/FACING_LIMP-family scenarios: the villain who opened.
   * For FACING_3BET with heroOpenedBefore3Bet: the villain who 3-bet hero's
   * open. For cold FACING_3BET: the original opener (first raiser).
   */
  openerPosition?: Position | null;
  /**
   * FACING_3BET only: true when hero opened (RFI) and a single villain 3-bet
   * behind with no callers in between — the vault-anchored spot that
   * checkFacing3Bet grades; `action` is then hero's RESPONSE to the 3-bet,
   * not the open. Absent/false on cold facing-3-bet spots and on rows
   * persisted before this field existed (both stay ungraded).
   */
  heroOpenedBefore3Bet?: boolean;
  /** FACING_3BET only: the villain's 3-bet was all-in. */
  threeBetAllIn?: boolean;
  /** True if hero's voluntary preflop action was all-in (used for short-stack 3-bet shove analysis). */
  wentAllInPreflop?: boolean;
  postflopActions?: PostflopAction[];
}
