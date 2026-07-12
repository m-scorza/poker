import { useState, useCallback, memo } from 'react';
import { clsx } from 'clsx';
import { Eye, Target, Zap, TrendingUp, AlertCircle, ChevronRight, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export interface RangeCellData {
  handKey: string;
  inTheoreticalRange: boolean;
  isPushHand?: boolean;
  totalInstances: number;
  correctInstances: number;
  deviations: Array<{
    handId: string;
    action: string;
    deviationType: string;
    stackBb: number;
    date: Date;
  }>;
  netProfit?: number;
  actionCounts: {
    fold: number;
    call: number;
    raise: number;
    other: number;
  };
}

interface DualRangeMatrixProps {
  data: Map<string, RangeCellData>;
  onHandClick?: (handId: string) => void;
  position: string;
  viewMode: 'compliance' | 'edit' | 'push_fold' | 'validator';
}

function getHandKey(row: number, col: number): string {
  const r1 = RANKS[row]!;
  const r2 = RANKS[col]!;
  if (row === col) return r1 + r2;
  if (row < col) return r1 + r2 + 's';
  return r2 + r1 + 'o';
}

interface OracleCellProps {
  handKey: string;
  inTheoreticalRange: boolean;
  isPushHand: boolean;
}

const OracleCell = memo(function OracleCell({
  handKey,
  inTheoreticalRange,
  isPushHand,
}: OracleCellProps) {
  return (
    <div
      className={clsx(
        'mc',
        isPushHand ? 'open' : inTheoreticalRange ? 'open' : 'fold'
      )}
    >
      {handKey}
    </div>
  );
});

interface MirrorCellProps {
  handKey: string;
  cell: RangeCellData | undefined;
  isSelected: boolean;
  onMouseEnter: (handKey: string) => void;
  onMouseLeave: () => void;
  onClick: (handKey: string) => void;
}

const MirrorCell = memo(function MirrorCell({
  handKey,
  cell,
  isSelected,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: MirrorCellProps) {
  const hasData = cell && cell.totalInstances > 0;
  const isCompliant = cell && cell.totalInstances > 0 && cell.deviations.length === 0;

  const total = cell?.totalInstances ?? 0;
  const raisePct = total > 0 && cell ? (cell.actionCounts.raise / total) * 100 : 0;
  const callPct = total > 0 && cell ? (cell.actionCounts.call / total) * 100 : 0;

  let stateClass = 'fold';
  if (hasData) {
     if (!isCompliant) stateClass = 'dev';
     else if (raisePct > 80 || callPct > 80) stateClass = 'open';
     else if (raisePct > 0 || callPct > 0) stateClass = 'mix';
  }

  return (
    <button
      onMouseEnter={() => onMouseEnter(handKey)}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(handKey)}
      className={clsx(
        'mc', stateClass,
        isSelected && 'ring-2 ring-white z-10 scale-110 shadow-xl'
      )}
    >
      <span className={clsx("relative z-10", hasData ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "")}>
         {handKey}
      </span>
    </button>
  );
});

export function DualRangeMatrix({ data, onHandClick, position, viewMode }: DualRangeMatrixProps) {
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);

  const activeHand = selectedHand || hoveredHand;
  const activeDetails = activeHand ? data.get(activeHand) : null;

  const handleMouseEnter = useCallback((handKey: string) => {
    setHoveredHand(handKey);
  }, []);

  const handleCellClick = useCallback((handKey: string) => {
    setSelectedHand((prev) => (prev === handKey ? null : handKey));
  }, []);

  const handleMouseLeaveMirror = useCallback(() => {
    setHoveredHand(null);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left: The Oracle (Theory) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Eye size={14} className="text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--fg-dim)]">The Oracle (Reference)</span>
        </div>
        <div 
          className="inline-grid gap-[2px] bg-black/20 p-1.5 rounded-lg border border-white/5" 
          style={{ gridTemplateColumns: `repeat(13, 1fr)` }}
        >
          {RANKS.map((_, row) =>
            RANKS.map((_, col) => {
              const handKey = getHandKey(row, col);
              const cell = data.get(handKey);
              const isPushHand = !!(cell?.isPushHand && viewMode !== 'edit');
              const inTheoreticalRange = !!cell?.inTheoreticalRange;

              return (
                <OracleCell
                  key={`oracle-${handKey}`}
                  handKey={handKey}
                  inTheoreticalRange={inTheoreticalRange}
                  isPushHand={isPushHand}
                />
              );
            })
          )}
        </div>
        
        {/* Oracle Legend */}
        <div className="mxleg mt-4">
           <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'color-mix(in srgb, var(--accent) 26%, var(--ink-2))', border: '1px solid var(--accent-line)', verticalAlign: '-1px' }}></span> in range</span>
        </div>
      </div>

      {/* Center: The Mirror (Reality) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Target size={14} className="text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--fg-dim)]">The Mirror (Performance)</span>
        </div>
        <div 
          className="inline-grid gap-[2px] bg-black/20 p-1.5 rounded-lg border border-white/5" 
          style={{ gridTemplateColumns: `repeat(13, 1fr)` }}
        >
          {RANKS.map((_, row) =>
            RANKS.map((_, col) => {
              const handKey = getHandKey(row, col);
              const cell = data.get(handKey);
              const isSelected = selectedHand === handKey;

              return (
                <MirrorCell
                  key={`mirror-${handKey}`}
                  handKey={handKey}
                  cell={cell}
                  isSelected={isSelected}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeaveMirror}
                  onClick={handleCellClick}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Right: Master-Detail Insight Pane */}
      <div className="flex-1 w-full lg:min-w-[320px] self-stretch">
        <AnimatePresence mode="wait">
          {activeDetails ? (
            <motion.div
              key={activeHand}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="compartment border border-[var(--hairline)] rounded-2xl p-6 shadow-2xl h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-3xl font-data font-black text-white">{activeHand}</h3>
                    <p className="text-xs text-[var(--fg-dim)] uppercase tracking-widest">{position} - Pre-flop</p>
                 </div>
                 <div className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    activeDetails.isPushHand ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-line)]" :
                    activeDetails.inTheoreticalRange ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-line)]" : "bg-white/5 text-[var(--fg-muted)]"
                 )}>
                    {activeDetails.isPushHand ? 'Push/Fold' : activeDetails.inTheoreticalRange ? 'Reference Range' : 'Exclude'}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                    <p className="text-[10px] uppercase text-[var(--fg-dim)] font-bold mb-1">Frequency</p>
                    <p className="text-xl font-data font-bold text-white">{activeDetails.totalInstances}</p>
                 </div>
                 <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                    <p className="text-[10px] uppercase text-[var(--fg-dim)] font-bold mb-1">Compliance</p>
                    <p className={clsx(
                       "text-xl font-data font-bold",
                       (activeDetails.correctInstances / activeDetails.totalInstances) >= 0.9 ? "text-emerald-400" : "text-rose-400"
                    )}>
                       {activeDetails.totalInstances > 0 
                          ? `${((activeDetails.correctInstances / activeDetails.totalInstances) * 100).toFixed(0)}%`
                          : '—'
                       }
                    </p>
                 </div>
              </div>

              {activeDetails.deviations.length > 0 ? (
                 <div className="flex-1 space-y-4">
                    <h4 className="text-[10px] uppercase font-bold text-rose-400 tracking-widest flex items-center gap-2">
                       <AlertCircle size={14} /> Critical Deviations
                    </h4>
                    <div className="space-y-3">
                       {activeDetails.deviations.map((d, i) => (
                          <button 
                            key={i}
                            onClick={() => onHandClick?.(d.handId)}
                            className="w-full text-left p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/15 transition-all group"
                          >
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-rose-300">{d.deviationType}</span>
                                <ChevronRight size={12} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <div className="flex justify-between items-end">
                                <span className="text-sm font-data font-bold text-white">Action: {d.action}</span>
                                <span className="text-[10px] text-[var(--fg-dim)]">{d.stackBb.toFixed(0)}bb</span>
                             </div>
                          </button>
                       ))}
                    </div>
                 </div>
                  ) : activeDetails.totalInstances > 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[var(--ink-2)] rounded-2xl">
                    <Zap size={32} className="text-[var(--accent)] mb-3 opacity-50" />
                    <p className="text-[var(--fg)] font-bold mb-1">Elite Execution</p>
                    <p className="text-xs text-[var(--fg-muted)] lowercase">No deviations recorded for this hand in this position.</p>
                 </div>
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 rounded-2xl">
                    <History size={32} className="text-[var(--fg-dim)] mb-3 opacity-20" />
                    <p className="text-xs text-[var(--fg-muted)]">No historical data found for {activeHand} in {position}.</p>
                 </div>
              )}

              <div className="mt-8 pt-6 border-t border-white/5">
                 <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-[var(--accent)]" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--fg-dim)]">Strategic Insight</span>
                 </div>
                 <p className="text-xs text-[var(--fg-dim)] leading-relaxed italic">
                    {activeDetails.inTheoreticalRange 
                       ? `The local reference includes ${activeHand} from ${position}; review stack depth and table context before treating it as automatic.`
                       : `${activeHand} is outside the local reference from ${position}; use this as a review cue, not a solver EV claim.`
                    }
                 </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="h-full flex flex-col items-center justify-center text-center p-12 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl"
            >
               <div className="p-4 bg-white/5 rounded-full mb-6">
                  <GridIcon size={40} className="text-[var(--fg-dim)] opacity-20" />
               </div>
               <h4 className="text-white font-bold mb-2">Select a Hand</h4>
               <p className="text-xs text-[var(--fg-dim)] leading-relaxed max-w-[200px]">
                  Compare reference ranges vs. your sample by clicking any cell in the Mirror matrix.
               </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GridIcon({ size, className }: { size: number; className?: string }) {
   return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
         <rect width="18" height="18" x="3" y="3" rx="2" />
         <path d="M3 9h18" />
         <path d="M3 15h18" />
         <path d="M9 3v18" />
         <path d="M15 3v18" />
      </svg>
   );
}
