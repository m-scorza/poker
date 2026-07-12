/**
 * Range Compliance page — 13x13 grid per position showing compliance.
 * Supports viewing theoretical ranges and editing custom ranges.
 */

import { useEffect, useState, useMemo } from 'react';

import { HandReplay } from '../components/hands/HandReplay';
import { DualRangeMatrix, type RangeCellData } from '../components/shared/DualRangeMatrix';
import { RangesToolbar } from '../components/ranges/RangesToolbar';
import { RangesSummary } from '../components/ranges/RangesSummary';
import { RangeValidatorPanel } from '../components/ranges/RangeValidatorPanel';
import { matchesPosition, matchesScenario, type ViewMode } from '../components/ranges/rangeFilters';
import { useAppStore } from '../data/appStore';
import { getAllHeroDecisions, saveCustomRange, loadCustomRange, deleteCustomRange, db } from '../data/store';
import { batchCheckCompliance, getRFIRange } from '../analysis/rangeChecker';
import { complianceBreakdown } from '../analysis/rangeChecker';
import { getPushRangeForPosition } from '../analysis/pushFoldChecker';
import { isUngradedDecision } from '../analysis/ungradedScenarios';
import {
  getFacingRaiseOpenersForPosition,
  getReactionRangeInfo,
} from '../data/ranges';
import type { Position, HeroDecision } from '../types/analysis';
import type { Hand } from '../types/hand';

export function RangesPage() {
  const [decisions, setDecisions] = useState<HeroDecision[]>([]);
  const [selectedPos, setSelectedPos] = useState<Position>('UTG');
  const [selectedScenario, setSelectedScenario] = useState<'RFI' | 'FACING_RAISE'>('RFI');
  const [selectedOpener, setSelectedOpener] = useState<Position>('CO');
  const [viewMode, setViewMode] = useState<ViewMode>('compliance');
  const [customRange, setCustomRange] = useState<Set<string>>(new Set());
  const [hasCustom, setHasCustom] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);


  // Hand Replay state
  const [replayedHandId, setReplayedHandId] = useState<string | null>(null);
  const [replayedHand, setReplayedHand] = useState<Hand | null>(null);
  const { strategyProfile } = useAppStore();

  useEffect(() => {
    async function load() {
      const raw = await getAllHeroDecisions();
      const checked = batchCheckCompliance(raw, strategyProfile);
      setDecisions(checked);
    }
    load();
  }, [strategyProfile]);

  // Load selected hand for replay
  useEffect(() => {
    if (!replayedHandId) {
       setReplayedHand(null);
       return;
    }
    async function loadHand() {
       const h = await db.hands.get(replayedHandId!);
       if (h) setReplayedHand(h);
    }
    loadHand();
  }, [replayedHandId]);

  // Load custom range when position changes
  useEffect(() => {
    setSaveError(null);
    const stored = loadCustomRange(selectedPos);
    if (stored) {
      setCustomRange(stored);
      setHasCustom(true);
    } else {
      // Initialize from theoretical range
      const theoretical = getRFIRange(selectedPos);
      setCustomRange(theoretical ? new Set(theoretical) : new Set());
      setHasCustom(false);
    }
  }, [selectedPos]);

  const validReactionOpeners = useMemo(
    () => getFacingRaiseOpenersForPosition(selectedPos),
    [selectedPos],
  );
  const selectedReactionOpener = selectedScenario === 'FACING_RAISE'
    ? validReactionOpeners.includes(selectedOpener)
      ? selectedOpener
      : validReactionOpeners[validReactionOpeners.length - 1] ?? null
    : null;

  useEffect(() => {
    if (
      selectedScenario === 'FACING_RAISE' &&
      selectedReactionOpener &&
      selectedReactionOpener !== selectedOpener
    ) {
      setSelectedOpener(selectedReactionOpener);
    }
  }, [selectedScenario, selectedOpener, selectedReactionOpener]);

  // For SB we want BLIND_WAR and RFI, including HU BTN/SB hands which are technically small blind positions
  // For BB we want BB_VS_RAISE
  const posDecisions = useMemo(
    () => decisions.filter((d) =>
      matchesPosition(d, selectedPos) &&
      matchesScenario(d, selectedScenario, selectedReactionOpener),
    ),
    [decisions, selectedPos, selectedScenario, selectedReactionOpener],
  );

  const reactionRangeInfo = useMemo(
    () => selectedScenario === 'FACING_RAISE'
      ? getReactionRangeInfo(selectedPos, selectedReactionOpener)
      : null,
    [selectedPos, selectedReactionOpener, selectedScenario],
  );

  const theoreticalRange = useMemo(() => {
    if (selectedScenario === 'RFI') return getRFIRange(selectedPos);
    return reactionRangeInfo?.range;
  }, [selectedPos, selectedScenario, reactionRangeInfo]);

  const pushRange = getPushRangeForPosition(selectedPos);

  const matrixData = useMemo(() => {
    const map = new Map<string, RangeCellData>();
    const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        let handKey = '';
        const r1 = RANKS[r]!;
        const r2 = RANKS[c]!;
        if (r === c) handKey = r1 + r2;
        else if (r < c) handKey = r1 + r2 + 's';
        else handKey = r2 + r1 + 'o';

        const handDecisions = posDecisions.filter(
          d => d.handKey === handKey && !isUngradedDecision(d),
        );
        map.set(handKey, {
          handKey,
          inTheoreticalRange: theoreticalRange?.has(handKey) ?? false,
          isPushHand: pushRange?.has(handKey) ?? false,
          totalInstances: handDecisions.length,
          correctInstances: handDecisions.filter(d => d.isCompliant).length,
          deviations: handDecisions
            .filter(d => !d.isCompliant)
            .map(d => ({
              handId: d.handId,
              action: d.action,
              deviationType: d.deviationType || 'Unknown',
              stackBb: d.stackBb,
              date: new Date()
            })),
          actionCounts: {
            raise: handDecisions.filter(d => d.action === 'raise').length,
            call: handDecisions.filter(d => d.action === 'call').length,
            fold: handDecisions.filter(d => d.action === 'fold').length,
            other: handDecisions.filter(d => !['raise', 'call', 'fold'].includes(d.action)).length,
          }
        });
      }
    }
    return map;
  }, [posDecisions, theoreticalRange, pushRange]);

  const handleHandClick = (handId: string) => {
    setReplayedHandId(handId);
  };

  const handleSave = () => {
    const result = saveCustomRange(selectedPos, [...customRange]);
    if (result.ok) {
      setHasCustom(true);
      setSaveError(null);
    } else if (result.reason === 'quota') {
      setSaveError('Storage quota exceeded — cannot save this range. Free up space or shrink the selection.');
    } else {
      setSaveError('Could not save this range. Check your browser storage settings.');
    }
  };

  const handleReset = () => {
    deleteCustomRange(selectedPos);
    const theoretical = getRFIRange(selectedPos);
    setCustomRange(theoretical ? new Set(theoretical) : new Set());
    setHasCustom(false);
    setSaveError(null);
  };

  const compliance = complianceBreakdown(posDecisions, strategyProfile);

  return (
    <div>
      <RangesToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        decisions={decisions}
        selectedPos={selectedPos}
        setSelectedPos={setSelectedPos}
        selectedScenario={selectedScenario}
        setSelectedScenario={setSelectedScenario}
        validReactionOpeners={validReactionOpeners}
        selectedReactionOpener={selectedReactionOpener}
        setSelectedOpener={setSelectedOpener}
      />

      <RangesSummary
        viewMode={viewMode}
        selectedScenario={selectedScenario}
        posDecisionsCount={posDecisions.length}
        compliance={compliance}
        pushRange={pushRange}
        customRange={customRange}
        theoreticalRange={theoreticalRange}
        hasCustom={hasCustom}
        reactionRangeInfo={reactionRangeInfo}
        handleSave={handleSave}
        handleReset={handleReset}
        saveError={saveError}
      />

      {/* Legend is now part of the Matrix */}

      {/* Dual Matrix */}
      <div className="mt-6">
        <DualRangeMatrix
          data={matrixData}
          onHandClick={handleHandClick}
          position={selectedPos}
          viewMode={viewMode}
        />
      </div>

      {/* Replay Modal */}
      {replayedHand && (
        <HandReplay
           hand={replayedHand}
           heroDecision={posDecisions.find(d => d.handId === replayedHandId) || null}
           onClose={() => {
              setReplayedHand(null);
              setReplayedHandId(null);
           }}
        />
      )}

      {/* Push/fold info */}
      {viewMode === 'push_fold' && (
        <div className="mt-4 compartment max-w-xl">
          <p className="kick mb-2">Push/Fold (10bb)</p>
          <p className="text-sm">
            With a stack of 10bb or less, the standard strategy is all-in or fold.
            This is the push range for <span className="font-mono font-bold">{selectedPos}</span>.
          </p>
          <div>
            Source: [Vol.2, NERD] — docs/knowledge/strategy/02-ranges-and-position.md §4
          </div>
        </div>
      )}

      {/* Range Validator */}
      {viewMode === 'validator' && <RangeValidatorPanel />}
    </div>
  );
}
