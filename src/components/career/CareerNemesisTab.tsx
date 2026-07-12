import { useMemo } from 'react';
import { Swords, UserX, Users } from 'lucide-react';
import type { Hand } from '../../types/hand';
import type { VillainProfile } from '../../types/villain';

interface CareerNemesisTabProps {
  hands: Hand[];
  villains: VillainProfile[];
}

export function CareerNemesisTab({ hands, villains }: CareerNemesisTabProps) {
  const topNemesis = useMemo(() => {
    const villainMap = new Map(villains.map(v => [v.playerName, v]));
    const nemesisMap = new Map<string, number>();
    for (const h of hands) {
      if (!h.villainDeltas || h.bigBlind <= 0) continue;
      for (const v of h.villainDeltas) {
        if (v.net > 0) {
          nemesisMap.set(v.name, (nemesisMap.get(v.name) || 0) + v.net / h.bigBlind);
        }
      }
    }
    return Array.from(nemesisMap.entries())
      .map(([name, amountBb]) => {
        const vProf = villainMap.get(name);
        return {
          name,
          amountBb,
          handsCount: vProf?.totalHands || 0,
          notesCount: (vProf?.notes ? 1 : 0) + (vProf?.tags?.length || 0),
        };
      })
      .sort((a, b) => b.amountBb - a.amountBb)
      .slice(0, 8);
  }, [hands, villains]);

  const topVictims = useMemo(() => {
    const villainMap = new Map(villains.map(v => [v.playerName, v]));
    const victimsMap = new Map<string, number>();
    for (const h of hands) {
      if (!h.villainDeltas || h.bigBlind <= 0) continue;
      for (const v of h.villainDeltas) {
        if (v.net < 0) {
          victimsMap.set(v.name, (victimsMap.get(v.name) || 0) + Math.abs(v.net) / h.bigBlind);
        }
      }
    }
    return Array.from(victimsMap.entries())
      .map(([name, amountBb]) => {
        const vProf = villainMap.get(name);
        return {
          name,
          amountBb,
          handsCount: vProf?.totalHands || 0,
          notesCount: (vProf?.notes ? 1 : 0) + (vProf?.tags?.length || 0),
        };
      })
      .sort((a, b) => b.amountBb - a.amountBb)
      .slice(0, 8);
  }, [hands, villains]);

  const topOverlap = useMemo(() => {
    return [...villains]
      .sort((a, b) => b.totalHands - a.totalHands)
      .slice(0, 8)
      .map(v => ({
        name: v.playerName,
        handsCount: v.totalHands,
        notesCount: (v.notes ? 1 : 0) + (v.tags?.length || 0),
        vpip: v.stats.vpip,
        pfr: v.stats.pfr
      }));
  }, [villains]);

  return (
    <div className="space-y-8">
      {/* Global Predators */}
      <section className="compartment p-0 overflow-hidden">
         <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between text-[var(--loss)]">
            <h3 className="kick flex items-center gap-2 mb-0">
               <UserX size={16} /> Global Predators
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--loss)]/70">Most BB Won From Hero</span>
         </div>
         {topNemesis.length === 0 ? (
            <div className="p-8 text-center text-[var(--fg-dim)]">
              No predator exposure recorded. Keep importing hands to track predators.
            </div>
         ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
               {topNemesis.map((v, i) => (
                  <div key={v.name} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ink-2)] border border-[var(--hairline)] group hover:border-[var(--loss-line)] transition-all">
                     <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-[var(--loss)]/30 font-mono">#{i+1}</span>
                        <div className="flex flex-col">
                           <span className="font-mono font-bold text-[var(--fg)] text-base tracking-tight uppercase group-hover:text-[var(--loss)] transition-colors">{v.name}</span>
                           <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] text-[var(--fg-dim)] font-bold uppercase">
                                 {v.handsCount} hands observed
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="font-mono text-[var(--loss)] font-bold text-lg">-{v.amountBb.toFixed(1)} bb</span>
                        <span className="text-[9px] text-[var(--fg-muted)] uppercase tracking-widest font-bold mt-1">Loss exposure</span>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </section>

      {/* Global Prey */}
      <section className="compartment p-0 overflow-hidden">
         <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between text-[var(--money)]">
            <h3 className="kick flex items-center gap-2 mb-0">
               <Swords size={16} /> Global Prey
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--money)]/70">Most BB Won By Hero</span>
         </div>
         {topVictims.length === 0 ? (
            <div className="p-8 text-center text-[var(--fg-dim)]">
              No victim exposure recorded. Keep importing hands to track prey.
            </div>
         ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
               {topVictims.map((v, i) => (
                  <div key={v.name} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ink-2)] border border-[var(--hairline)] group hover:border-[var(--money-line)] transition-all">
                     <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-[var(--money)]/30 font-mono">#{i+1}</span>
                        <div className="flex flex-col">
                           <span className="font-mono font-bold text-[var(--fg)] text-base tracking-tight uppercase group-hover:text-[var(--money)] transition-colors">{v.name}</span>
                           <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] text-[var(--fg-dim)] font-bold uppercase">
                                 {v.handsCount} hands observed
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="font-mono text-[var(--money)] font-bold text-lg">+{v.amountBb.toFixed(1)} bb</span>
                        <span className="text-[9px] text-[var(--fg-muted)] uppercase tracking-widest font-bold mt-1">Win exposure</span>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </section>

      {/* Opponent Overlap */}
      <section className="compartment p-0 overflow-hidden">
         <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between text-[var(--sig)]">
            <h3 className="kick flex items-center gap-2 mb-0">
               <Users size={16} /> Opponent Overlap
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sig)]/70">Most Hands Played Against</span>
         </div>
         {topOverlap.length === 0 ? (
            <div className="p-8 text-center text-[var(--fg-dim)]">
              No opponent overlap recorded. Keep importing hands to track active opponents.
            </div>
         ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
               {topOverlap.map((v, i) => (
                  <div key={v.name} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ink-2)] border border-[var(--hairline)] group hover:border-[var(--sig-line)] transition-all">
                     <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-[var(--sig)]/30 font-mono">#{i+1}</span>
                        <div className="flex flex-col">
                           <span className="font-mono font-bold text-[var(--fg)] text-base tracking-tight uppercase group-hover:text-[var(--sig)] transition-colors">{v.name}</span>
                           <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] text-[var(--fg-dim)] font-bold uppercase">
                                 VPIP/PFR: {v.vpip.toFixed(0)}/{v.pfr.toFixed(0)}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="font-mono text-[var(--sig)] font-bold text-lg">{v.handsCount}</span>
                        <span className="text-[9px] text-[var(--fg-muted)] uppercase tracking-widest font-bold mt-1">Hands observed</span>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </section>
    </div>
  );
}
