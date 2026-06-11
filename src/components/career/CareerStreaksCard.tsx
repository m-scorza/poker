import { useMemo } from 'react';
import { Flame, Trophy, Snowflake, Repeat } from 'lucide-react';
import { clsx } from 'clsx';
import type { Tournament } from '../../types/hand';
import { computeCareerStreaks } from '../../analysis/careerStats';

interface CareerStreaksCardProps {
  tournaments: Tournament[];
}

interface StreakStat {
  icon: typeof Flame;
  label: string;
  value: number;
  hint: string;
  accent: string;
}

export function CareerStreaksCard({ tournaments }: CareerStreaksCardProps) {
  const streaks = useMemo(() => computeCareerStreaks(tournaments), [tournaments]);

  if (tournaments.length === 0) return null;

  const stats: StreakStat[] = [
    {
      icon: Repeat,
      label: 'Current ITM Streak',
      value: streaks.currentItmStreak,
      hint: 'Cashes in a row, right now',
      accent: 'text-emerald-400',
    },
    {
      icon: Flame,
      label: 'Longest ITM Streak',
      value: streaks.longestItmStreak,
      hint: 'Best cash run on record',
      accent: 'text-amber-400',
    },
    {
      icon: Trophy,
      label: 'Longest Win Streak',
      value: streaks.longestWinStreak,
      hint: 'Consecutive 1st-place finishes',
      accent: 'text-cyan-400',
    },
    {
      icon: Snowflake,
      label: 'Longest Cashless Run',
      value: streaks.longestCashlessStreak,
      hint: 'Worst dry spell on record',
      accent: 'text-rose-400',
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Flame size={16} className="text-amber-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Streaks &amp; Form</h3>
          {streaks.currentWinStreak > 0 && (
            <span className="ml-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-400">
              {streaks.currentWinStreak}× win streak live
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-[#15171f] border border-white/5 p-5"
            >
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--fg-dim)] mb-3">
                <stat.icon size={12} className={stat.accent} /> {stat.label}
              </div>
              <div className={clsx('text-4xl font-data font-black tracking-tighter', stat.accent)}>
                {stat.value}
              </div>
              <p className="mt-2 text-[10px] font-bold text-[var(--fg-dim)]">{stat.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
