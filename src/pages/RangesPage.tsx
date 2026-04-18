/**
 * Range Compliance page — 13x13 grid per position showing compliance.
 * Supports viewing theoretical ranges and editing custom ranges.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Edit3, Eye, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';
import { RangeGrid, type CellStatus } from '../components/shared/RangeGrid';
import { HandReplay } from '../components/hands/HandReplay';
import { DualRangeMatrix, type RangeCellData } from '../components/shared/DualRangeMatrix';
import { useAppStore } from '../data/appStore';
import { getAllHeroDecisions, saveCustomRange, loadCustomRange, deleteCustomRange, db } from '../data/store';
import { batchCheckCompliance, getRFIRange } from '../analysis/rangeChecker';
import { compliancePercentage } from '../analysis/rangeChecker';
import { getPushRangeForPosition } from '../analysis/pushFoldChecker';
import { rangeValidationSummary } from '../analysis/rangeValidator';
import { getReactionRange } from '../data/ranges';
import type { Position, HeroDecision } from '../types/analysis';
import type { Hand } from '../types/hand';

const RFI_POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP1', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

type ViewMode = 'compliance' | 'edit' | 'push_fold' | 'validator';

export function RangesPage() {
  const [decisions, setDecisions] = useState<HeroDecision[]>([]);
  const [selectedPos, setSelectedPos] = useState<Position>('UTG');
  const [selectedScenario, setSelectedScenario] = useState<'RFI' | 'FACING_RAISE'>('RFI');
  const [viewMode, setViewMode] = useState<ViewMode>('compliance');
  const [customRange, setCustomRange] = useState<Set<string>>(new Set());
  const [hasCustom, setHasCustom] = useState(false);
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);
  
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

  // For SB we want BLIND_WAR and RFI, including HU BTN/SB hands which are technically small blind positions
  // For BB we want BB_VS_RAISE
  const posDecisions = useMemo(
    () => decisions.filter((d) => {
      // If SB is selected, it must catch both true 'SB' and 'BTN/SB'
      // Filter by scenario
      if (selectedScenario === 'RFI') {
         return d.scenario === 'RFI' || d.scenario === 'BLIND_WAR' || d.scenario === 'HU_BTN';
      } else {
         return d.scenario === 'FACING_RAISE' || d.scenario === 'BB_VS_RAISE';
      }
    }),
    [decisions, selectedPos, selectedScenario],
  );

  const theoreticalRange = useMemo(() => {
    if (selectedScenario === 'RFI') return getRFIRange(selectedPos);
    // Generic opener for reaction (CO is common)
    return getReactionRange(selectedPos, 'CO');
  }, [selectedPos, selectedScenario]);

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

        const handDecisions = posDecisions.filter(d => d.handKey === handKey);
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
    saveCustomRange(selectedPos, [...customRange]);
    setHasCustom(true);
  };

  const handleReset = () => {
    deleteCustomRange(selectedPos);
    const theoretical = getRFIRange(selectedPos);
    setCustomRange(theoretical ? new Set(theoretical) : new Set());
    setHasCustom(false);
  };

  const compliance = compliancePercentage(posDecisions, strategyProfile);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Ranges</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => setViewMode('compliance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              viewMode === 'compliance'
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]'
                : 'text-[var(--color-text-dim)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            <Eye size={12} /> Compliance
          </button>
          <button
            onClick={() => setViewMode('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              viewMode === 'edit'
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]'
                : 'text-[var(--color-text-dim)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            <Edit3 size={12} /> Edit
          </button>
          <button
            onClick={() => setViewMode('push_fold')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              viewMode === 'push_fold'
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]'
                : 'text-[var(--color-text-dim)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            Push/Fold
          </button>
          <button
            onClick={() => setViewMode('validator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              viewMode === 'validator'
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]'
                : 'text-[var(--color-text-dim)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            <BarChart3 size={12} /> Validação
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
         {/* Position selector */}
         <div className="flex bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-1 overflow-x-auto">
           {RFI_POSITIONS.map((pos) => {
             const posCount = decisions.filter((d) => {
               const matchPos = (pos === 'SB') ? (d.position === 'SB' || d.position === 'BTN/SB') : (d.position === pos);
               if (!matchPos) return false;
               if (selectedScenario === 'RFI') {
                  return d.scenario === 'RFI' || d.scenario === 'BLIND_WAR' || d.scenario === 'HU_BTN';
               } else {
                  return d.scenario === 'FACING_RAISE' || d.scenario === 'BB_VS_RAISE';
               }
             }).length;
             
             return (
               <button
                 key={pos}
                 onClick={() => setSelectedPos(pos)}
                 className={clsx(
                    "px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5",
                    selectedPos === pos ? "bg-white text-black shadow-lg" : "text-[var(--color-text-dim)] hover:text-white"
                 )}
               >
                 {pos}
                 {posCount > 0 && <span className="opacity-50 text-[10px]">({posCount})</span>}
               </button>
             );
           })}
         </div>

         {/* Scenario selector */}
         <div className="flex bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-1">
            <button 
              onClick={() => setSelectedScenario('RFI')}
              className={clsx(
                 "px-4 py-1.5 rounded text-xs font-bold transition-all",
                 selectedScenario === 'RFI' ? "bg-blue-600 text-white shadow-lg" : "text-[var(--color-text-dim)] hover:text-white"
              )}
            >
               RFI / Open
            </button>
            <button 
              onClick={() => setSelectedScenario('FACING_RAISE')}
              className={clsx(
                 "px-4 py-1.5 rounded text-xs font-bold transition-all",
                 selectedScenario === 'FACING_RAISE' ? "bg-rose-600 text-white shadow-lg" : "text-[var(--color-text-dim)] hover:text-white"
              )}
            >
               Reaction (vs Raise)
            </button>
         </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        {viewMode === 'compliance' && (
          <>
            <div>
              <span className="text-[var(--color-text-dim)]">RFI Hands: </span>
              <span className="font-data font-bold">{posDecisions.length}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-dim)]">Compliance: </span>
              <span className={`font-data font-bold ${compliance >= 90 ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
                {compliance.toFixed(1)}%
              </span>
            </div>
          </>
        )}
        <div>
          <span className="text-[var(--color-text-dim)]">
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
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-info)]/20 text-[var(--color-info)]">
            Custom
          </span>
        )}
      </div>

      {/* Edit mode actions */}
      {viewMode === 'edit' && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 transition-colors"
          >
            <Save size={12} /> Save Range
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-[var(--color-text-dim)] border border-[var(--color-border)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
          >
            <RotateCcw size={12} /> Reset to Theoretical
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
          <span className="text-[var(--color-text-dim)]">Played Correctly</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
          <span className="text-[var(--color-text-dim)]">Deviation</span>
        </div>
        <div className="flex items-center gap-1.5">
           <div className="w-3 h-3 bg-white/5 border border-white/10 rounded-sm" />
           <span className="text-[var(--color-text-dim)]">No Data</span>
        </div>
      </div>

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
        <div className="mt-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 max-w-xl">
          <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wide mb-2">Push/Fold (10bb)</p>
          <p className="text-sm text-[var(--color-text)]">
            With a stack of 10bb or less, the standard strategy is all-in or fold.
            This is the push range for <span className="font-data font-bold text-[var(--color-accent)]">{selectedPos}</span>.
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Source: [Vol.2, NERD] — docs/strategy/02-ranges-and-position.md §4
          </p>
        </div>
      )}

      {/* Range Validator */}
      {viewMode === 'validator' && <RangeValidatorPanel />}
    </div>
  );
}

function RangeValidatorPanel() {
  const validation = useMemo(() => rangeValidationSummary(), []);

  const directionLabel = (d: string) =>
    d === 'wider' ? 'Mais aberto' : d === 'tighter' ? 'Mais fechado' : 'OK';
  const directionColor = (d: string) =>
    d === 'match' ? 'text-emerald-400' : 'text-yellow-400';

  return (
    <div className="mt-4 space-y-4 max-w-2xl">
      {/* Overall Score */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-text-dim)]">
            Precisão dos Ranges
          </h3>
          <span className={`text-2xl font-data font-bold ${validation.overallScore >= 80 ? 'text-emerald-400' : validation.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {validation.overallScore}%
          </span>
        </div>
        <div className="flex gap-4 text-xs text-[var(--color-text-dim)]">
          <span>RFI: <span className="font-data font-bold text-[var(--color-text)]">{validation.rfi.score}%</span></span>
          <span>Push/Fold: <span className="font-data font-bold text-[var(--color-text)]">{validation.push.score}%</span></span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          Comparação dos nossos ranges com baselines de solvers GTO.
        </p>
      </div>

      {/* RFI Validation Table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-dim)] mb-3">RFI por Posição</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
              <th className="text-left py-1.5 pr-4">Posição</th>
              <th className="text-right py-1.5 px-3">Nosso %</th>
              <th className="text-right py-1.5 px-3">Solver %</th>
              <th className="text-right py-1.5 px-3">Delta</th>
              <th className="text-left py-1.5 pl-3">Direção</th>
            </tr>
          </thead>
          <tbody>
            {validation.rfi.results.map((r) => (
              <tr key={r.position} className="border-b border-[var(--color-border)]/30">
                <td className="py-1.5 pr-4 font-data font-bold">{r.position}</td>
                <td className="py-1.5 px-3 text-right font-data">{r.ourPct.toFixed(1)}%</td>
                <td className="py-1.5 px-3 text-right font-data text-[var(--color-text-dim)]">{r.solverPct.toFixed(1)}%</td>
                <td className="py-1.5 px-3 text-right font-data">{r.delta.toFixed(1)}%</td>
                <td className={`py-1.5 pl-3 text-xs font-bold ${directionColor(r.direction)}`}>{directionLabel(r.direction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Push Validation Table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-dim)] mb-3">Push/Fold (10bb) por Posição</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
              <th className="text-left py-1.5 pr-4">Posição</th>
              <th className="text-right py-1.5 px-3">Nosso %</th>
              <th className="text-right py-1.5 px-3">Solver %</th>
              <th className="text-right py-1.5 px-3">Delta</th>
              <th className="text-left py-1.5 pl-3">Direção</th>
            </tr>
          </thead>
          <tbody>
            {validation.push.results.map((r) => (
              <tr key={r.position} className="border-b border-[var(--color-border)]/30">
                <td className="py-1.5 pr-4 font-data font-bold">{r.position}</td>
                <td className="py-1.5 px-3 text-right font-data">{r.ourPct.toFixed(1)}%</td>
                <td className="py-1.5 px-3 text-right font-data text-[var(--color-text-dim)]">{r.solverPct.toFixed(1)}%</td>
                <td className="py-1.5 px-3 text-right font-data">{r.delta.toFixed(1)}%</td>
                <td className={`py-1.5 pl-3 text-xs font-bold ${directionColor(r.direction)}`}>{directionLabel(r.direction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        Fonte: Solver baselines a 50bb (RFI) e 10bb (Push/Fold). Scores ponderados: RFI 60% + Push 40%.
      </p>
    </div>
  );
}
