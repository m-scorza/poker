import { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from 'recharts';
import { Calendar } from 'lucide-react';
import type { Tournament } from '../../types/hand';
import { getTournamentNet } from '../../analysis/financials';
import { money } from '../../utils/format';

interface DayHourHeatmapProps {
  tournaments: Tournament[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);
const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21];

interface DayHourPoint {
  day: number;
  hour: number;
  net: number;
  count: number;
}

function pointSummary(point: DayHourPoint): string {
  const tournamentLabel = point.count === 1 ? 'tournament' : 'tournaments';
  return `${DAYS[point.day]} at ${HOURS[point.hour]} · ${point.count} ${tournamentLabel} · Net ${money(point.net, true)}`;
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[var(--color-card-surface)] p-6">
      <div className="mb-5 flex items-start gap-2">
        <Calendar size={18} className="mt-0.5 text-[var(--accent)]" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Tournament Net by Recorded Start Time
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--fg-dim)]">
            Recorded start time by weekday and hour. Bubble size is the tournament sample; colour is aggregate net result.
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function DayHourHeatmap({ tournaments }: DayHourHeatmapProps) {
  const data = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({
      net: 0,
      count: 0
    })));

    tournaments.forEach(t => {
      const d = t.startDate;
      if (!d) return;
      const day = d.getDay();
      const hour = d.getHours();
      grid[day]![hour]!.net += getTournamentNet(t);
      grid[day]![hour]!.count += 1;
    });

    const flatData: DayHourPoint[] = [];
    grid.forEach((dayArr, dayIndex) => {
      dayArr.forEach((cell, hourIndex) => {
        if (cell.count > 0) {
          flatData.push({
            day: dayIndex,
            hour: hourIndex,
            net: cell.net,
            count: cell.count,
          });
        }
      });
    });

    return flatData;
  }, [tournaments]);

  if (data.length === 0) {
    return (
      <ChartFrame>
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-white/10 px-6 text-center text-sm text-[var(--fg-dim)]">
          No dated tournament results are available for this chart.
        </div>
      </ChartFrame>
    );
  }

  if (data.length === 1) {
    return (
      <ChartFrame>
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-5 text-sm text-[var(--fg-dim)]">
          <p>One populated time bucket is not enough to compare start-time performance.</p>
          <p className="mt-2 font-mono text-xs text-[var(--fg-muted)]">{pointSummary(data[0]!)}</p>
        </div>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart data={data} margin={{ top: 20, right: 20, bottom: 24, left: 10 }}>
            <XAxis
              dataKey="hour"
              type="number"
              name="Recorded start hour"
              domain={[0, 23]}
              ticks={HOUR_TICKS}
              tickFormatter={(val) => HOURS[val] || ''}
              stroke="rgba(255,255,255,0.3)"
              fontSize={10}
              label={{ value: 'Recorded start hour', position: 'insideBottom', offset: -12 }}
            />
            <YAxis
              dataKey="day"
              type="number"
              name="Weekday"
              domain={[0, 6]}
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              tickFormatter={(val) => DAYS[val] || ''}
              stroke="rgba(255,255,255,0.3)"
              fontSize={10}
              reversed
            />
            <ZAxis dataKey="count" type="number" name="Tournament sample" range={[70, 360]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0]!.payload as DayHourPoint;
                  return (
                    <div className="bg-[var(--color-card-surface-3)] border border-white/10 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-bold text-xs mb-1">
                        {DAYS[d.day]} at {HOURS[d.hour]}
                      </p>
                      <p className="text-[10px] text-[var(--fg-dim)]">
                        Tournaments: {d.count}
                      </p>
                      <p className={`text-xs font-bold ${d.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Aggregate net: {money(d.net, true)}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--fg-dim)]">
                        Average: {money(d.net / d.count, true)} per tournament
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter dataKey="net" name="Aggregate net result" data={data} shape="circle">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.net >= 0 ? 'var(--accent)' : '#ef4444'} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
