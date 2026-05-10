import { Activity, BarChart3, CalendarDays, Flame, Gauge, LineChart as LineChartIcon, Percent, ShieldCheck, Trophy } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { clsx } from 'clsx';
import type { CareerScopeProfile } from '../../analysis/careerScope';

function money(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function pct(value: number | null): string {
  return value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatDate(date: Date | null): string {
  return date ? date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

interface MetricTileProps {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  accent?: 'green' | 'amber' | 'rose' | 'blue';
}

function MetricTile({ label, value, detail, icon, accent = 'blue' }: MetricTileProps) {
  const accentClasses = {
    green: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/15',
    amber: 'text-amber-300 bg-amber-400/10 border-amber-400/15',
    rose: 'text-rose-300 bg-rose-400/10 border-rose-400/15',
    blue: 'text-sky-300 bg-sky-400/10 border-sky-400/15',
  }[accent];

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--color-text-dim)]">{label}</div>
        <div className={clsx('rounded-xl border p-2', accentClasses)}>{icon}</div>
      </div>
      <div className="mt-3 font-data text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-[var(--color-text-dim)]">{detail}</div>
    </div>
  );
}

interface CareerScopePanelProps {
  profile: CareerScopeProfile;
}

export function CareerScopePanel({ profile }: CareerScopePanelProps) {
  const isProfitable = profile.totalProfit >= 0;
  const formAccent = profile.formLabel === 'Hot' || profile.formLabel === 'Uptrend'
    ? 'green'
    : profile.formLabel === 'Rebuild'
      ? 'rose'
      : 'amber';

  return (
    <section className="overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-[#0b111b] shadow-2xl shadow-cyan-950/20">
      <div className="relative border-b border-white/5 bg-gradient-to-r from-cyan-500/10 via-indigo-500/5 to-transparent p-6">
        <div className="absolute right-8 top-6 hidden rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-200 md:block">
          Private SharkScope
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">CareerScope Profile</h2>
            <p className="mt-1 max-w-3xl text-sm font-medium text-[var(--color-text-dim)]">
              SharkScope-style career intelligence built only from your imported hand histories and tournament summaries — no provider API required.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[320px_1fr]">
        <div className="rounded-3xl border border-white/5 bg-black/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-text-dim)]">Ability Rating</div>
              <div className="mt-2 font-data text-6xl font-black text-white">{profile.abilityRating}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-cyan-200">/ 100 Local Estimate</div>
            </div>
            <Gauge className="text-cyan-300" size={42} />
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
              style={{ width: `${profile.abilityRating}%` }}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-white/[0.03] p-3">
              <div className="text-[var(--color-text-dim)]">Form</div>
              <div className={clsx(
                'mt-1 font-black uppercase tracking-wide',
                formAccent === 'green' && 'text-emerald-300',
                formAccent === 'rose' && 'text-rose-300',
                formAccent === 'amber' && 'text-amber-300',
              )}>{profile.formLabel}</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-3">
              <div className="text-[var(--color-text-dim)]">Last 20 ROI</div>
              <div className={clsx('mt-1 font-data font-black', (profile.last20Roi ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                {pct(profile.last20Roi)}
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs leading-5 text-[var(--color-text-dim)]">
            This is deliberately labeled local: unlike SharkScope, it cannot see the global player pool. It scores only what you import, making it private and coach/share-ready.
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Total ROI" value={pct(profile.totalRoi)} detail={`${money(profile.totalProfit)} net`} icon={<Percent size={15} />} accent={isProfitable ? 'green' : 'rose'} />
            <MetricTile label="Average ROI" value={pct(profile.averageRoi)} detail="Mean ROI per tournament" icon={<BarChart3 size={15} />} accent={profile.averageRoi >= 0 ? 'green' : 'rose'} />
            <MetricTile label="ABI" value={`$${profile.averageStake.toFixed(2)}`} detail={`Stake $${profile.totalStake.toFixed(2)} · rake $${profile.totalRake.toFixed(2)}`} icon={<Activity size={15} />} />
            <MetricTile label="Activity" value={`${profile.gamesPerActiveDay.toFixed(1)}/day`} detail={`${profile.activeDays} active days · peak ${profile.mostGamesInDay}`} icon={<CalendarDays size={15} />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white">
                  <LineChartIcon size={15} className="text-cyan-300" />
                  Bankroll + Trendline
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-dim)]">
                  {formatDate(profile.firstGameDate)} → {formatDate(profile.lastGameDate)}
                </span>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profile.bankroll} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="index" stroke="rgba(255,255,255,0.35)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.35)" fontSize={10} tickFormatter={(value) => `$${value}`} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14 }}
                      labelFormatter={(label) => `Tournament #${label}`}
                      formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name === 'profit' ? 'Profit' : 'Trend']}
                    />
                    <Line type="monotone" dataKey="profit" stroke="#22d3ee" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="trend" stroke="#a78bfa" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3">
              <MetricTile label="ITM / Wins" value={`${profile.itmRate.toFixed(1)}%`} detail={`${profile.wins} outright wins`} icon={<Trophy size={15} />} accent="amber" />
              <MetricTile label="Cashes" value={`$${profile.totalCashes.toFixed(2)}`} detail={`${money(profile.averageProfit)} avg profit/game`} icon={<Flame size={15} />} accent={isProfitable ? 'green' : 'rose'} />
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-xs text-[var(--color-text-dim)]">
                <div className="font-black uppercase tracking-[0.22em] text-white">Streaks</div>
                <div className="mt-3 flex justify-between"><span>Best cashing streak</span><b className="text-emerald-300">{profile.maxCashingStreak}</b></div>
                <div className="mt-2 flex justify-between"><span>Worst losing streak</span><b className="text-rose-300">{profile.maxLosingStreak}</b></div>
                <div className="mt-2 flex justify-between"><span>Winning days</span><b className="text-white">{profile.winningDays}</b></div>
                <div className="mt-2 flex justify-between"><span>Losing days</span><b className="text-white">{profile.losingDays}</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
