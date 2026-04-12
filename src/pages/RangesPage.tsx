/**
 * Range Compliance page — 13x13 grid per position showing compliance.
 * Supports viewing theoretical ranges and editing custom ranges.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Edit3, Eye } from 'lucide-react';
import { RangeGrid, type CellStatus } from '../components/shared/RangeGrid';
import { useAppStore } from '../data/appStore';
import { getAllHeroDecisions, saveCustomRange, loadCustomRange, deleteCustomRange } from '../data/store';
import { batchCheckCompliance, getRFIRange } from '../analysis/rangeChecker';
import { compliancePercentage } from '../analysis/rangeChecker';
import { getPushRangeForPosition } from '../analysis/pushFoldChecker';
import type { Position, HeroDecision } from '../types/analysis';

const RFI_POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP1', 'MP2', 'HJ', 'CO', 'BTN', 'SB'];

type ViewMode = 'compliance' | 'edit' | 'push_fold';

export function RangesPage() {
  const [decisions, setDecisions] = useState<HeroDecision[]>([]);
  const [selectedPos, setSelectedPos] = useState<Position>('UTG');
  const [viewMode, setViewMode] = useState<ViewMode>('compliance');
  const [customRange, setCustomRange] = useState<Set<string>>(new Set());
  const [hasCustom, setHasCustom] = useState(false);
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);
  const { strategyProfile } = useAppStore();

  useEffect(() => {
    async function load() {
      const raw = await getAllHeroDecisions();
      const checked = batchCheckCompliance(raw, strategyProfile);
      setDecisions(checked);
    }
    load();
  }, [strategyProfile]);

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

  const posDecisions = useMemo(
    () => decisions.filter((d) => d.position === selectedPos && d.scenario === 'RFI'),
    [decisions, selectedPos],
  );

  const handKeyMap = useMemo(() => {
    const map = new Map<string, { correct: number; deviation: number }>();
    for (const d of posDecisions) {
      const entry = map.get(d.handKey) ?? { correct: 0, deviation: 0 };
      if (d.isCompliant) entry.correct++;
      else entry.deviation++;
      map.set(d.handKey, entry);
    }
    return map;
  }, [posDecisions]);

  const hoveredDetails = useMemo(() => {
    if (!hoveredHand) return null;
    const decisionsForHand = posDecisions.filter((d) => d.handKey === hoveredHand);
    if (decisionsForHand.length === 0) return null;
    const correct = decisionsForHand.filter((d) => d.isCompliant).length;
    const deviations = decisionsForHand.filter((d) => !d.isCompliant);
    return { total: decisionsForHand.length, correct, deviations };
  }, [hoveredHand, posDecisions]);

  const theoreticalRange = getRFIRange(selectedPos);
  const pushRange = getPushRangeForPosition(selectedPos);

  const getCellStatus = useCallback(
    (handKey: string): CellStatus => {
      if (viewMode === 'edit') {
        return customRange.has(handKey) ? 'in-range' : 'out-of-range';
      }
      if (viewMode === 'push_fold') {
        return pushRange?.has(handKey) ? 'in-range' : 'out-of-range';
      }
      // Compliance mode
      const played = handKeyMap.get(handKey);
      if (played) {
        if (played.deviation > 0) return 'played-deviation';
        return 'played-correct';
      }
      if (theoreticalRange?.has(handKey)) return 'in-range';
      return 'not-dealt';
    },
    [viewMode, customRange, pushRange, handKeyMap, theoreticalRange],
  );

  const handleCellClick = useCallback(
    (handKey: string) => {
      if (viewMode !== 'edit') return;
      setCustomRange((prev) => {
        const next = new Set(prev);
        if (next.has(handKey)) {
          next.delete(handKey);
        } else {
          next.add(handKey);
        }
        return next;
      });
    },
    [viewMode],
  );

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
            <Edit3 size={12} /> Editar
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
        </div>
      </div>

      {/* Position selector */}
      <div className="flex gap-2 mb-6">
        {RFI_POSITIONS.map((pos) => {
          const posCount = decisions.filter((d) => d.position === pos && d.scenario === 'RFI').length;
          return (
            <button
              key={pos}
              onClick={() => setSelectedPos(pos)}
              className={`px-3 py-2 rounded-lg text-sm font-data transition-colors ${
                selectedPos === pos
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-dim)] border border-[var(--color-border)] hover:border-[var(--color-border-active)]'
              }`}
            >
              {pos}
              {posCount > 0 && viewMode === 'compliance' && (
                <span className="ml-1 text-xs text-[var(--color-text-muted)]">({posCount})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        {viewMode === 'compliance' && (
          <>
            <div>
              <span className="text-[var(--color-text-dim)]">Mãos RFI: </span>
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
            Customizado
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
            <Save size={12} /> Salvar Range
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-[var(--color-text-dim)] border border-[var(--color-border)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
          >
            <RotateCcw size={12} /> Resetar para Teórico
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        {viewMode === 'compliance' && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-900/50 border border-emerald-500" />
              <span className="text-[var(--color-text-dim)]">Jogou corretamente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-900/50 border border-red-500" />
              <span className="text-[var(--color-text-dim)]">Desvio</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[var(--color-range-in)] border border-[var(--color-accent-dim)]" />
          <span className="text-[var(--color-text-dim)]">
            {viewMode === 'push_fold' ? 'No push range' : viewMode === 'edit' ? 'Selecionado' : 'No range (não jogado)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[var(--color-range-neutral)] border border-[var(--color-border)] opacity-50" />
          <span className="text-[var(--color-text-dim)]">
            {viewMode === 'push_fold' ? 'Fora do push range' : viewMode === 'edit' ? 'Não selecionado' : 'Fora do range'}
          </span>
        </div>
      </div>

      {/* Grid container with adjacent Info Panel */}
      <div className="flex flex-col lg:flex-row gap-6 items-start mt-6">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 inline-block shadow-sm">
          <RangeGrid
            getCellStatus={getCellStatus}
            onCellClick={viewMode === 'edit' ? handleCellClick : undefined}
            onCellHover={setHoveredHand}
          />
        </div>

        {/* Hover Information Panel */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 min-w-[280px] shadow-sm hidden md:block">
          {hoveredHand ? (
            <div>
               <h3 className="text-2xl font-data font-bold text-white mb-2 pb-2 border-b border-[var(--color-border)]">{hoveredHand}</h3>
               {hoveredDetails ? (
                 <div className="space-y-3 mt-4 text-sm">
                   <div className="flex justify-between items-center text-[var(--color-text-dim)]">
                      <span>Vezes em que recebeu:</span>
                      <span className="font-data font-bold text-[var(--color-text)] text-base">{hoveredDetails.total}</span>
                   </div>
                   <div className="flex justify-between items-center text-[var(--color-text-dim)]">
                      <span>Jogadas GTO Corretas:</span>
                      <span className="font-data font-bold text-emerald-400 text-base">{hoveredDetails.correct}</span>
                   </div>
                   {hoveredDetails.deviations.length > 0 && (
                     <div className="mt-4 pt-4 border-t border-[var(--color-border)]/50">
                        <span className="text-xs uppercase tracking-wide text-red-400 font-bold mb-2 block">Lista de Desvios:</span>
                        <ul className="space-y-2">
                           {hoveredDetails.deviations.slice(0, 3).map((d, i) => (
                              <li key={i} className="text-xs flex flex-col bg-red-900/10 p-2 rounded">
                                 <span className="text-[var(--color-text-dim)]">{d.deviationType}</span>
                                 <span className="font-data font-bold text-red-200">Ação: {d.action} ({d.stackBb.toFixed(0)}bb)</span>
                              </li>
                           ))}
                           {hoveredDetails.deviations.length > 3 && (
                             <li className="text-xs text-[var(--color-text-muted)] italic">+{hoveredDetails.deviations.length - 3} desvios omitidos...</li>
                           )}
                        </ul>
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="mt-4 text-sm text-[var(--color-text-muted)] italic">
                   Você ainda não recebeu esta mão sob essas condições nesta posição.
                 </div>
               )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] p-6 text-center">
               <Eye size={32} className="mb-3 opacity-50 mx-auto" />
               <p className="text-sm">Passe o mouse sobre qualquer mão na matriz para ver o histórico detalhado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Push/fold info */}
      {viewMode === 'push_fold' && (
        <div className="mt-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 max-w-xl">
          <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wide mb-2">Push/Fold (10bb)</p>
          <p className="text-sm text-[var(--color-text)]">
            Com stack de 10bb ou menos, a estratégia é all-in ou fold.
            Este é o push range para <span className="font-data font-bold text-[var(--color-accent)]">{selectedPos}</span>.
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Fonte: [Vol.2, NERD] — docs/strategy/02-ranges-and-position.md §4
          </p>
        </div>
      )}
    </div>
  );
}
