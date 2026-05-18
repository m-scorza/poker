import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Zap, RotateCcw, ChevronRight, AlertCircle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../data/appStore';
import { getAllHeroDecisions } from '../data/store';
import { PokerCard } from '../components/shared/Card';
import { checkCompliance } from '../analysis/rangeChecker';
import type { HeroDecision } from '../types/analysis';

// Types for the Trainer
type DrillType = 'fault_fixer' | 'rfi_master' | 'cbet_clinic';

interface DrillState {
  isActive: boolean;
  type: DrillType | null;
  currentDecision: HeroDecision | null;
  score: { correct: number; total: number };
  lastFeedback: { isCorrect: boolean; note: string } | null;
}

export function ArenaPage() {
  const [drill, setDrill] = useState<DrillState>({
    isActive: false,
    type: null,
    currentDecision: null,
    score: { correct: 0, total: 0 },
    lastFeedback: null,
  });

  const { strategyProfile } = useAppStore();
  const [allDecisions, setAllDecisions] = useState<HeroDecision[]>([]);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load pool of decisions to draw from
  useEffect(() => {
    async function load() {
      const data = await getAllHeroDecisions();
      setAllDecisions(data);
    }
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const startDrill = (type: DrillType) => {
    let pool = allDecisions;
    
    // Filter pool based on drill type
    if (type === 'fault_fixer') {
      // Focus on historical deviations
      pool = allDecisions.filter(d => {
        const result = checkCompliance(d, strategyProfile);
        return result && !result.isCompliant;
      });
    } else if (type === 'rfi_master') {
      pool = allDecisions.filter(d => d.scenario === 'RFI' || d.scenario === 'BLIND_WAR');
    }

    if (pool.length === 0) {
      alert('Not enough data for this training. Import more hands!');
      return;
    }

    const first = pool[Math.floor(Math.random() * pool.length)]!;
    setDrill({
      isActive: true,
      type,
      currentDecision: first,
      score: { correct: 0, total: 0 },
      lastFeedback: null,
    });
  };

  const nextHand = useCallback(() => {
    let pool = allDecisions;
    if (drill.type === 'fault_fixer') {
      pool = allDecisions.filter(d => {
         const res = checkCompliance(d, strategyProfile);
         return res && !res.isCompliant;
      });
    } else if (drill.type === 'rfi_master') {
      pool = allDecisions.filter(d => d.scenario === 'RFI' || d.scenario === 'BLIND_WAR');
    }

    const next = pool[Math.floor(Math.random() * pool.length)]!;
    setDrill(prev => ({
      ...prev,
      currentDecision: next,
      lastFeedback: null,
    }));
  }, [allDecisions, drill.type, strategyProfile]);

  const handleAction = (action: 'fold' | 'raise' | 'call' | 'check') => {
    if (!drill.currentDecision) return;

    // Evaluate user's chosen action against GTO theory
    const testDecision = { ...drill.currentDecision, action };
    const result = checkCompliance(testDecision, strategyProfile);
    const userIsCorrect = result?.isCompliant ?? true;

    // Find a correct action to show in feedback if user was wrong
    let correctActionStr = 'the standard move';
    if (!userIsCorrect) {
      const actions: ('fold' | 'raise' | 'call' | 'check')[] = ['fold', 'raise', 'call', 'check'];
      const found = actions.find(a => checkCompliance({ ...drill.currentDecision!, action: a }, strategyProfile)?.isCompliant);
      if (found) correctActionStr = found.toUpperCase();
    }

    setDrill(prev => ({
      ...prev,
      score: {
        correct: prev.score.correct + (userIsCorrect ? 1 : 0),
        total: prev.score.total + 1
      },
      lastFeedback: {
        isCorrect: userIsCorrect,
        note: userIsCorrect 
          ? 'Excellent! Standard GTO move.' 
          : `Error! The theoretical range suggests ${correctActionStr}.`
      }
    }));

    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      nextHand();
    }, 2000);
  };

  if (!drill.isActive) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <header className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-3 bg-[var(--color-accent)]/10 rounded-2xl mb-4"
          >
            <Zap size={40} className="text-[var(--color-accent)]" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2 font-data">The Arena</h1>
          <p className="text-[var(--color-text-muted)]">Turn theory into instinct. Drill your flaws.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DrillCard 
            title="Fault Fixer" 
            desc="Replay hands where you made actual deviations." 
            icon={Target} 
            color="red"
            onClick={() => startDrill('fault_fixer')}
          />
          <DrillCard 
            title="RFI Master" 
            desc="Master pot opening across all positions." 
            icon={Zap} 
            color="emerald"
            onClick={() => startDrill('rfi_master')}
          />
          <DrillCard 
            title="C-bet Clinic" 
            desc="Perfect your flop aggression." 
            icon={Trophy} 
            color="blue"
            onClick={() => startDrill('cbet_clinic')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[#0a0a0f] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="flex justify-between items-center z-10 p-4 border-b border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setDrill(prev => ({ ...prev, isActive: false }))}
             className="p-2 hover:bg-white/5 rounded-lg text-[var(--color-text-dim)]"
           >
             <RotateCcw size={18} />
           </button>
           <div className="h-4 w-px bg-white/10" />
           <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{drill.type?.replace('_', ' ')}</span>
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-[10px] uppercase text-[var(--color-text-muted)] font-bold">Score</p>
              <p className="font-data font-bold text-[var(--color-accent)]">{drill.score.correct} / {drill.score.total}</p>
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
              <span className="text-xs font-data">{strategyProfile === 'game_plan' ? 'GTO' : 'ADV'}</span>
           </div>
        </div>
      </header>

      {/* Main Training Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        
        {/* Animated Table */}
        <div className="w-full max-w-4xl aspect-[2/1] relative flex items-center justify-center">
            {/* Table Surface */}
            <div className="absolute inset-0 bg-[#161b26] rounded-[180px] border-[12px] border-[#2a3142] shadow-[0_40px_100px_rgba(0,0,0,0.6),inset_0_0_80px_rgba(0,0,0,0.4)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 to-transparent" />
                <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')]" />
            </div>

            {/* Dealer Chip / Position Indicator */}
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 flex flex-col items-center">
               <div className="px-4 py-1.5 bg-black/40 border border-white/10 rounded-full shadow-lg backdrop-blur-md">
                 <span className="text-xs font-bold text-white tracking-widest uppercase">
                    {drill.currentDecision?.scenario.replace('_', ' ')}
                 </span>
               </div>
               <div className="mt-2 text-[10px] text-emerald-400 font-bold tracking-tighter uppercase opacity-80">
                  Stage: Pre-flop
               </div>
            </div>

            {/* Hero Seat */}
            <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
                <AnimatePresence mode='wait'>
                    <motion.div 
                      key={drill.currentDecision?.handId}
                      initial={{ y: 20, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: -20, opacity: 0, scale: 0.9 }}
                      className="flex gap-2"
                    >
                        {(() => {
                           const key = drill.currentDecision?.handKey || 'AA';
                           const r1 = key[0];
                           const r2 = key[1];
                           const s = key.endsWith('s') ? 's' : 'o';
                           // Map ranks to cards (simple heuristic for trainer)
                           // If paired: As Ah. If suited: As Ks. If offsuit: As Kh.
                           const c1 = `${r1}s`;
                           const c2 = s === 's' ? `${r2}s` : (r1 === r2 ? `${r2}h` : `${r2}h`);
                           return (
                             <>
                               <PokerCard card={c1} size="lg" className="shadow-2xl" />
                               <PokerCard card={c2} size="lg" className="shadow-2xl" />
                             </>
                           );
                        })()}
                    </motion.div>
                </AnimatePresence>
                
                <div className="mt-4 px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl backdrop-blur-md shadow-lg">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-sm font-bold text-white font-data">
                         {drill.currentDecision?.position}
                      </span>
                      <span className="text-xs text-emerald-400/80 font-data">
                         {drill.currentDecision?.stackBb.toFixed(0)}bb
                      </span>
                   </div>
                </div>
            </div>

            {/* Center Pot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-40">
               <p className="text-[10px] uppercase font-bold text-[var(--color-text-dim)] mb-1">Pot</p>
               <p className="text-2xl font-data font-bold text-white">0.0</p>
            </div>
        </div>

        {/* HUD Feedback Overlay */}
        <AnimatePresence>
          {drill.lastFeedback && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8, y: 20 }}
               animate={drill.lastFeedback.isCorrect ? 
                  { opacity: 1, scale: 1, y: 0 } : 
                  { opacity: 1, scale: 1, y: 0, x: [0, -10, 10, -10, 10, 0] }
               }
               transition={drill.lastFeedback.isCorrect ? {} : { duration: 0.4 }}
               exit={{ opacity: 0, scale: 0.8 }}
               className={clsx(
                 "absolute top-[20%] z-50 px-8 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex flex-col items-center gap-2",
                 drill.lastFeedback.isCorrect 
                    ? "bg-emerald-500/20 border-emerald-500/40" 
                    : "bg-red-500/20 border-red-500/40"
               )}
            >
                {drill.lastFeedback.isCorrect ? (
                  <CheckCircle2 size={32} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={32} className="text-red-400" />
                )}
                <p className="text-lg font-bold text-white">{drill.lastFeedback.isCorrect ? 'CORRECT' : 'DEVIATION'}</p>
                <p className="text-sm text-white/70 max-w-[200px] text-center">{drill.lastFeedback.note}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls */}
        <div className="flex gap-4 mt-8 pb-12 z-20">
            <ActionButton 
              label="Fold" 
              color="gray" 
              onClick={() => handleAction('fold')} 
              disabled={!!drill.lastFeedback}
            />
            <ActionButton 
              label="Call" 
              color="blue" 
              onClick={() => handleAction('call')} 
              disabled={!!drill.lastFeedback}
            />
            <ActionButton 
              label="Raise" 
              color="emerald" 
              onClick={() => handleAction('raise')} 
              disabled={!!drill.lastFeedback}
            />
        </div>
      </main>
    </div>
  );
}

interface DrillCardProps {
  title: string;
  desc: string;
  icon: LucideIcon;
  color: 'red' | 'emerald' | 'blue';
  onClick: () => void;
}

function DrillCard({ title, desc, icon: Icon, color, onClick }: DrillCardProps) {
  const colorMap = {
    red: 'from-red-900/20 via-red-900/5 to-transparent border-red-500/20 text-red-400 hover:border-red-500/40',
    emerald: 'from-emerald-900/20 via-emerald-900/5 to-transparent border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40',
    blue: 'from-blue-900/20 via-blue-900/5 to-transparent border-blue-500/20 text-blue-400 hover:border-blue-500/40',
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={clsx(
        "cursor-pointer p-6 rounded-2xl border bg-gradient-to-br backdrop-blur-sm transition-all shadow-lg",
        colorMap[color as keyof typeof colorMap]
      )}
    >
      <div className="mb-4">
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-text-dim)] leading-relaxed">{desc}</p>
      <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-60">
         Start Drill <ChevronRight size={14} />
      </div>
    </motion.div>
  );
}

interface ActionButtonProps {
  label: string;
  color: 'gray' | 'blue' | 'emerald';
  onClick: () => void;
  disabled: boolean;
}

function ActionButton({ label, color, onClick, disabled }: ActionButtonProps) {
  const colorMap = {
    gray: 'bg-white/5 border-white/10 text-white hover:bg-white/10',
    blue: 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30',
    emerald: 'bg-[var(--color-accent)]/20 border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/30',
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "px-10 py-4 rounded-xl border text-sm font-bold uppercase tracking-widest transition-all shadow-xl disabled:opacity-30",
        colorMap[color as keyof typeof colorMap]
      )}
    >
      {label}
    </button>
  );
}
