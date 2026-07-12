import { useMemo } from 'react';
import { clsx } from 'clsx';
import { ExternalLink, Flame } from 'lucide-react';
import type { Hand } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';

interface CareerHighImpactHandsTabProps {
  decisions: HeroDecision[];
  hands: Hand[];
  onOpenReplay: (hand: Hand, decision: HeroDecision) => void;
}

export function CareerHighImpactHandsTab({ decisions, hands, onOpenReplay }: CareerHighImpactHandsTabProps) {
  const bigHands = useMemo(() => {
    const handById = new Map(hands.map((hand) => [hand.id, hand]));
    return [...decisions]
       .map((decision) => {
          const hand = handById.get(decision.handId);
          const netBb = hand && hand.bigBlind > 0 ? decision.netProfit / hand.bigBlind : null;
          return { decision, hand, netBb };
       })
       .filter((item): item is { decision: typeof decisions[number]; hand: Hand; netBb: number | null } => Boolean(item.hand))
       .sort((a, b) => Math.abs(b.netBb ?? 0) - Math.abs(a.netBb ?? 0))
       .slice(0, 10);
  }, [decisions, hands]);

  return (
    <div className="space-y-6">
       <section className="compartment p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between">
             <h3 className="kick text-[var(--sig)] flex items-center gap-2 mb-0">
                <Flame size={16} /> High Impact Hands
             </h3>
             <span className="text-[10px] text-[var(--fg-muted)] font-bold uppercase tracking-wider">Top 10 by BB Delta</span>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead>
                   <tr className="border-b border-[var(--hairline)] text-[10px] text-[var(--fg-dim)] uppercase tracking-widest">
                      <th className="px-6 py-4 font-bold">Rank</th>
                      <th className="px-6 py-4 font-bold">Hole Cards</th>
                      <th className="px-6 py-4 text-center font-bold">Position</th>
                      <th className="px-6 py-4 text-right font-bold">BB Profit/Loss</th>
                      <th className="px-6 py-4 text-center font-bold">Action</th>
                   </tr>
                </thead>
                <tbody className="font-mono font-bold">
                   {bigHands.map((item, i) => (
                      <tr key={item.decision.handId} className="border-b border-[var(--hairline)] hover:bg-[var(--ink-2)] transition-colors">
                         <td className="px-6 py-5 text-[var(--fg-dim)] w-16">#{i+1}</td>
                         <td className="px-6 py-5 text-[var(--fg)] text-base w-32 font-mono">{item.decision.handKey}</td>
                         <td className="px-6 py-5 text-center">
                            <span className="text-[var(--sig)] uppercase tracking-wide text-xs">{item.decision.position}</span>
                         </td>
                         <td className="px-6 py-5 text-right">
                            <span className={clsx("text-base block", (item.netBb ?? 0) >= 0 ? "text-[var(--money)]" : "text-[var(--loss)]")}>
                               {item.netBb === null ? '—' : `${item.netBb >= 0 ? '+' : ''}${item.netBb.toFixed(1)} bb`}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-[var(--fg-muted)] mt-0.5 block">
                               {item.decision.netProfit >= 0 ? '+' : ''}{item.decision.netProfit.toLocaleString()} chips
                            </span>
                         </td>
                         <td className="px-6 py-5 text-center">
                           <button
                             onClick={() => onOpenReplay(item.hand, item.decision)}
                             className="btn outline"
                           >
                             Replay <ExternalLink size={12} />
                           </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </section>
    </div>
  );
}
