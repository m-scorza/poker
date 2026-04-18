import { useState, useMemo } from 'react';
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
  viewMode: 'compliance' | 'edit' | 'push_fold';
}

function getHandKey(row: number, col: number): string {
  const r1 = RANKS[row]!;
  const r2 = RANKS[col]!;
  if (row === col) return r1 + r2;
  if (row < col) return r1 + r2 + 's';
  return r2 + r1 + 'o';
}

export function DualRangeMatrix({ data, onHandClick, position, viewMode }: DualRangeMatrixProps) {
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);

  const activeHand = selectedHand || hoveredHand;
  const activeDetails = activeHand ? data.get(activeHand) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left: The Oracle (Theory) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Eye size={14} className="text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-dim)]">The Oracle (GTO)</span>
        </div>
        <div 
          className="inline-grid gap-[2px] bg-black/20 p-1.5 rounded-lg border border-white/5" 
          style={{ gridTemplateColumns: `repeat(13, 1fr)` }}
        >
          {RANKS.map((_, row) =>
            RANKS.map((_, col) => {
              const handKey = getHandKey(row, col);
              const cell = data.get(handKey);

              return (
                <div
                  key={`oracle-${handKey}`}
                  className={clsx(
                    'w-8 h-7 md:w-9 md:h-8 text-[9px] font-data flex items-center justify-center border rounded-sm transition-all',
                    cell?.isPushHand && viewMode !== 'edit'
                      ? 'bg-amber-500/30 border-amber-500/40 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                      : cell?.inTheoreticalRange 
                        ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-100 shadow-[inset_0_0_8px_rgba(16,185,129,0.1)]' 
                        : 'bg-white/[0.02] border-white/5 text-[var(--color-text-muted)] opacity-30'
                  )}
                >
                  {handKey}
                </div>
              );
            })
          )}
        </div>
        
        {/* Oracle Legend */}
        <div className="flex gap-4 mt-2 px-1">
           <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-[var(--color-text-dim)] uppercase">RFI / Open</span>
           </div>
           <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] text-[var(--color-text-dim)] uppercase">Push/Fold (10bb)</span>
           </div>
        </div>
      </div>

      {/* Center: The Mirror (Reality) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Target size={14} className="text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-dim)]">The Mirror (Performance)</span>
        </div>
        <div 
          className="inline-grid gap-[2px] bg-black/20 p-1.5 rounded-lg border border-white/5" 
          style={{ gridTemplateColumns: `repeat(13, 1fr)` }}
          onMouseLeave={() => setHoveredHand(null)}
        >
          {RANKS.map((_, row) =>
            RANKS.map((_, col) => {
              const handKey = getHandKey(row, col);
              const cell = data.get(handKey);
              const hasData = cell && cell.totalInstances > 0;
              const hasDeviations = cell && cell.deviations.length > 0;
              const isCompliant = cell && cell.totalInstances > 0 && cell.deviations.length === 0;

                const total = cell.totalInstances;
                const raisePct = total > 0 ? (cell.actionCounts.raise / total) * 100 : 0;
                const callPct = total > 0 ? (cell.actionCounts.call / total) * 100 : 0;
                const foldPct = total > 0 ? ((cell.actionCounts.fold + cell.actionCounts.other) / total) * 100 : 0;

                return (
                  <button
                    key={`mirror-${handKey}`}
                    onMouseEnter={() => setHoveredHand(handKey)}
                    onClick={() => setSelectedHand(selectedHand === handKey ? null : handKey)}
                    className={clsx(
                      'w-8 h-7 md:w-9 md:h-8 text-[9px] font-data border rounded-sm transition-all relative overflow-hidden group flex items-center justify-center',
                      selectedHand === handKey && 'ring-2 ring-white z-10 scale-110 shadow-xl',
                      !hasData 
                        ? 'bg-white/[0.01] border-white/5 text-[var(--color-text-dim)] opacity-20' 
                        : isCompliant
                          ? 'border-emerald-500/40 text-white'
                          : 'border-rose-500/50 text-white font-bold'
                    )}
                  >
                    {/* Action Strips */}
                    {hasData && (
                      <div className="absolute inset-0 flex flex-col pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity">
                         {raisePct > 0 && <div className="bg-emerald-500" style={{ height: `${raisePct}%` }} />}
                         {callPct > 0 && <div className="bg-blue-500" style={{ height: `${callPct}%` }} />}
                         {foldPct > 0 && <div className="bg-white/20" style={{ height: `${foldPct}%` }} />}
                      </div>
                    )}
                    
                    <span className={clsx(
                       "relative z-10",
                       hasData ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : ""
                    )}>
                       {handKey}
                    </span>
                  </button>
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
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-2xl h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-3xl font-data font-black text-white">{activeHand}</h3>
                    <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-widest">{position} - Pre-flop</p>
                 </div>
                 <div className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    activeDetails.isPushHand ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    activeDetails.inTheoreticalRange ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-[var(--color-text-muted)]"
                 )}>
                    {activeDetails.isPushHand ? 'Push/Fold' : activeDetails.inTheoreticalRange ? 'GTO Standard' : 'Exclude'}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                    <p className="text-[10px] uppercase text-[var(--color-text-dim)] font-bold mb-1">Frequency</p>
                    <p className="text-xl font-data font-bold text-white">{activeDetails.totalInstances}</p>
                 </div>
                 <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                    <p className="text-[10px] uppercase text-[var(--color-text-dim)] font-bold mb-1">Compliance</p>
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
                                <span className="text-[10px] text-[var(--color-text-dim)]">{d.stackBb.toFixed(0)}bb</span>
                             </div>
                          </button>
                       ))}
                    </div>
                 </div>
              ) : activeDetails.totalInstances > 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <Zap size={32} className="text-emerald-400 mb-3 opacity-50" />
                    <p className="text-emerald-400 font-bold mb-1">Elite Execution</p>
                    <p className="text-xs text-emerald-100/60 lowercase">No deviations recorded for this hand in this position.</p>
                 </div>
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 rounded-2xl">
                    <History size={32} className="text-[var(--color-text-dim)] mb-3 opacity-20" />
                    <p className="text-xs text-[var(--color-text-muted)]">No historical data found for {activeHand} in {position}.</p>
                 </div>
              )}

              <div className="mt-8 pt-6 border-t border-white/5">
                 <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-[var(--color-accent)]" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-text-dim)]">Strategic Insight</span>
                 </div>
                 <p className="text-xs text-[var(--color-text-dim)] leading-relaxed italic">
                    {activeDetails.inTheoreticalRange 
                       ? `Always open ${activeHand} from ${position}. Exploitative adjustment: check for aggressive 3-betters behind.`
                       : `${activeHand} is a standard fold from ${position}. Calling or raising creates long-term -EV scenarios.`
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
                  <GridIcon size={40} className="text-[var(--color-text-dim)] opacity-20" />
               </div>
               <h4 className="text-white font-bold mb-2">Select a Hand</h4>
               <p className="text-xs text-[var(--color-text-dim)] leading-relaxed max-w-[200px]">
                  Compare theory vs. reality by clicking any cell in the Mirror matrix.
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
