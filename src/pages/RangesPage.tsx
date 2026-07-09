/**
 * Range Compliance page — 13x13 grid per position showing compliance.
 * Supports viewing theoretical ranges and editing custom ranges.
 */

import { useEffect, useState, useMemo } from 'react';
import { Save, RotateCcw, Edit3, Eye, BarChart3, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

import { HandReplay } from '../components/hands/HandReplay';
import { DualRangeMatrix, type RangeCellData } from '../components/shared/DualRangeMatrix';
import { useAppStore } from '../data/appStore';
import { getAllHeroDecisions, saveCustomRange, loadCustomRange, deleteCustomRange, db } from '../data/store';
import { batchCheckCompliance, getRFIRange } from '../analysis/rangeChecker';
import { complianceBreakdown } from '../analysis/rangeChecker';
import { getPushRangeForPosition } from '../analysis/pushFoldChecker';
import { rangeValidationSummary } from '../analysis/rangeValidator';
import { isUngradedDecision } from '../analysis/ungradedScenarios';
import {
  getFacingRaiseOpenersForPosition,
  getReactionRangeInfo,
} from '../data/ranges';
import type { Position, HeroDecision } from '../types/analysis';
import type { Hand } from '../types/hand';

const RFI_POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP', 'MP1', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

type ViewMode = 'compliance' | 'edit' | 'push_fold' | 'validator';

function matchesPosition(decision: HeroDecision, position: Position): boolean {
  if (position === 'SB') {
    return decision.position === 'SB' || decision.position === 'BTN/SB';
  }
  return decision.position === position;
}

function matchesScenario(
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
      <div className="flex items-center justify-between mb-6 border-b border-[var(--hairline)] pb-4">
        <div>
          <span className="kick sig">Range Matrix</span>
          <h1 style={{ marginTop: 4, marginBottom: 0 }}>Compliance & Theory</h1>
        </div>
        <div className="tabs">
          <button onClick={() => setViewMode('compliance')} className={viewMode === 'compliance' ? 'on' : ''}>
            <Eye size={12} className="inline mr-1 -mt-0.5" /> Compliance
          </button>
          <button onClick={() => setViewMode('edit')} className={viewMode === 'edit' ? 'on' : ''}>
            <Edit3 size={12} className="inline mr-1 -mt-0.5" /> Edit
          </button>
          <button onClick={() => setViewMode('push_fold')} className={viewMode === 'push_fold' ? 'on' : ''}>
            Push/Fold
          </button>
          <button onClick={() => setViewMode('validator')} className={viewMode === 'validator' ? 'on' : ''}>
            <BarChart3 size={12} className="inline mr-1 -mt-0.5" /> Validation
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
         {/* Position selector */}
         <div className="tabs" style={{ flexWrap: 'wrap', height: 'fit-content' }}>
           {RFI_POSITIONS.map((pos) => {
             const posCount = decisions.filter((d) => {
               return matchesPosition(d, pos) && matchesScenario(d, selectedScenario, selectedReactionOpener);
             }).length;
             
             return (
               <button
                 key={pos}
                 onClick={() => setSelectedPos(pos)}
                 className={selectedPos === pos ? "on" : ""}
               >
                 {pos} {posCount > 0 && `(${posCount})`}
               </button>
             );
           })}
         </div>

         {/* Scenario selector */}
         <div className="tabs">
            <button 
              onClick={() => setSelectedScenario('RFI')}
              className={selectedScenario === 'RFI' ? "on" : ""}
            >
               RFI / Open
            </button>
            <button 
              onClick={() => setSelectedScenario('FACING_RAISE')}
              className={selectedScenario === 'FACING_RAISE' ? "on" : ""}
            >
               Reaction (vs Raise)
            </button>
         </div>
         {selectedScenario === 'FACING_RAISE' && (
           <div className="tabs" style={{ flexWrap: 'wrap', height: 'fit-content' }}>
             {validReactionOpeners.length > 0 ? validReactionOpeners.map((opener) => (
               <button
                 key={opener}
                 onClick={() => setSelectedOpener(opener)}
                 className={selectedReactionOpener === opener ? "on" : ""}
               >
                 vs {opener}
               </button>
             )) : (
               <div className="px-3 py-1.5 text-xs text-[var(--fg-muted)]">
                 No earlier opener
               </div>
             )}
           </div>
         )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        {viewMode === 'compliance' && (
          <>
            <div>
              <span className="text-[var(--fg-dim)]">
                {selectedScenario === 'RFI' ? 'RFI Hands: ' : 'Spot Hands: '}
              </span>
              <span className="font-data font-bold">{posDecisions.length}</span>
            </div>
            <div>
              <span className="text-[var(--fg-dim)]">Compliance: </span>
              {compliance.percentage === null ? (
                <span
                  className="font-data font-bold text-[var(--fg-muted)]"
                  title="No spots in this position are gradeable yet — they're all scenarios the engine refuses to grade (facing 3-bets/all-ins, extreme ICM)."
                >
                  — <span className="text-[10px] font-normal">no graded spots</span>
                </span>
              ) : (
                <span className={`font-data font-bold ${compliance.percentage >= 90 ? 'text-[var(--accent)]' : 'text-[var(--loss)]'}`}>
                  {compliance.percentage.toFixed(1)}%
                </span>
              )}
            </div>
            {compliance.excluded > 0 && (
              <div
                className="text-[11px] text-[var(--fg-muted)]"
                title="These spots have no agreed range yet (facing 3-bets/all-ins, extreme ICM), so the engine refuses to grade them rather than guess. They're left out of the % above."
              >
                <span className="font-data">{compliance.graded}</span> graded ·{' '}
                <span className="font-data">{compliance.excluded}</span> not graded
              </div>
            )}
          </>
        )}
        <div>
          <span className="text-[var(--fg-dim)]">
            {viewMode === 'push_fold' ? 'Push range: ' : viewMode === 'edit' ? 'Custom range: ' : 'Range: '}
          </span>
          <span className="font-data font-bold">
            {viewMode === 'push_fold'
              ? `${pushRange?.size ?? 0} combos`
              : viewMode === 'edit'
                ? `${customRange.size} combos`
                : `${theoreticalRange?.size ?? 0} combos`}
          </span>
        </div>
        {viewMode === 'edit' && hasCustom && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--sig-line)] text-[var(--sig)]">
            Custom
          </span>
        )}
      </div>

      {selectedScenario === 'FACING_RAISE' && reactionRangeInfo && (
        <div className={clsx(
          "mb-4 rounded-lg border p-3 text-xs",
          reactionRangeInfo.status === 'supported'
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
            : "border-warn/20 bg-warn/10 text-warn"
        )}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold uppercase tracking-wider">
              {reactionRangeInfo.status === 'supported' ? 'Chart available' : 'No chart yet'}
            </span>
            <span className="font-data text-[var(--fg)]">
              {reactionRangeInfo.label}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-data text-[10px] uppercase tracking-wider text-white/80">
              {reactionRangeInfo.comboCount} combos
            </span>
          </div>
          <p className="mt-1 text-[var(--fg-muted)]">
            {reactionRangeInfo.note}
          </p>
        </div>
      )}

      {/* Edit mode actions */}
      {viewMode === 'edit' && (
        <div className="mb-4">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors"
            >
              <Save size={12} /> Save Range
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-[var(--fg-dim)] border border-[var(--hairline)] hover:text-[var(--loss)] hover:border-[var(--loss)] transition-colors"
            >
              <RotateCcw size={12} /> Reset to Theoretical
            </button>
          </div>
          {saveError && (
            <div role="alert" className="mt-2 flex items-start gap-1.5 px-2 py-1.5 text-xs rounded-md bg-[var(--loss)]/10 text-[var(--loss)] border border-[var(--loss)]/40">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>
      )}

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
          <div className="inner-rule">
            Source: [Vol.2, NERD] — docs/knowledge/strategy/02-ranges-and-position.md §4
          </div>
        </div>
      )}

      {/* Range Validator */}
      {viewMode === 'validator' && <RangeValidatorPanel />}
    </div>
  );
}

function RangeValidatorPanel() {
  const validation = rangeValidationSummary();

  const directionLabel = (d: string) =>
    d === 'wider' ? 'Wider' : d === 'tighter' ? 'Tighter' : 'OK';
  const directionColor = (d: string) =>
    d === 'match' ? 'text-[var(--money)]' : 'text-warn';

  return (
    <div className="mt-4 space-y-4 max-w-2xl">
      {/* Overall Score */}
      <div className="compartment">
        <div className="flex items-center justify-between mb-3">
          <span className="kick">Range Accuracy</span>
          <span className={`text-2xl font-mono font-bold ${validation.overallScore >= 80 ? 'text-[var(--money)]' : validation.overallScore >= 60 ? 'text-[var(--accent)]' : 'text-[var(--loss)]'}`}>
            {validation.overallScore}%
          </span>
        </div>
        <div className="flex gap-4 text-xs text-[var(--fg-dim)]">
          <span>RFI: <span className="font-mono font-bold text-[var(--fg)]">{validation.rfi.score}%</span></span>
          <span>Push/Fold: <span className="font-mono font-bold text-[var(--fg)]">{validation.push.score}%</span></span>
        </div>
        <div className="inner-rule mt-2">
          Comparison of local ranges against documented chipEV reference baselines.
        </div>
      </div>

      {/* RFI Validation Table */}
      <div className="compartment">
        <span className="kick mb-3">RFI by Position</span>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--fg-muted)] border-b border-[var(--hairline)]">
              <th className="text-left py-1.5 pr-4">Position</th>
              <th className="text-right py-1.5 px-3">Ours %</th>
              <th className="text-right py-1.5 px-3">Reference %</th>
              <th className="text-right py-1.5 px-3">Delta</th>
              <th className="text-left py-1.5 pl-3">Direction</th>
            </tr>
          </thead>
          <tbody>
            {validation.rfi.results.map((r) => (
              <tr key={r.position} className="border-b border-[var(--hairline)]/30">
                <td className="py-1.5 pr-4 font-data font-bold">{r.position}</td>
                <td className="py-1.5 px-3 text-right font-data">{r.ourPct.toFixed(1)}%</td>
                <td className="py-1.5 px-3 text-right font-data text-[var(--fg-dim)]">{r.solverPct.toFixed(1)}%</td>
                <td className="py-1.5 px-3 text-right font-data">{r.delta.toFixed(1)}%</td>
                <td className={`py-1.5 pl-3 text-xs font-bold ${directionColor(r.direction)}`}>{directionLabel(r.direction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Push Validation Table */}
      <div className="compartment">
        <span className="kick mb-3">Push/Fold (10bb) by Position</span>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--fg-muted)] border-b border-[var(--hairline)]">
              <th className="text-left py-1.5 pr-4">Position</th>
              <th className="text-right py-1.5 px-3">Ours %</th>
              <th className="text-right py-1.5 px-3">Reference %</th>
              <th className="text-right py-1.5 px-3">Delta</th>
              <th className="text-left py-1.5 pl-3">Direction</th>
            </tr>
          </thead>
          <tbody>
            {validation.push.results.map((r) => (
              <tr key={r.position} className="border-b border-[var(--hairline)]/30">
                <td className="py-1.5 pr-4 font-data font-bold">{r.position}</td>
                <td className="py-1.5 px-3 text-right font-data">{r.ourPct.toFixed(1)}%</td>
                <td className="py-1.5 px-3 text-right font-data text-[var(--fg-dim)]">{r.solverPct.toFixed(1)}%</td>
                <td className="py-1.5 px-3 text-right font-data">{r.delta.toFixed(1)}%</td>
                <td className={`py-1.5 pl-3 text-xs font-bold ${directionColor(r.direction)}`}>{directionLabel(r.direction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--fg-muted)]">
        Source: documented chipEV reference baselines at 50bb (RFI) and 10bb (Push/Fold). Weighted scores: RFI 60% + Push 40%.
      </p>
    </div>
  );
}
