import { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from 'recharts';
import { Calendar } from 'lucide-react';
import type { Tournament } from '../../types/hand';
import { getTournamentNet } from '../../analysis/financials';

interface DayHourHeatmapProps {
  tournaments: Tournament[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

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

    const flatData: { day: number; hour: number; net: number; count: number; absNet: number }[] = [];
    grid.forEach((dayArr, dayIndex) => {
      dayArr.forEach((cell, hourIndex) => {
        if (cell.count > 0) {
          flatData.push({
            day: dayIndex,
            hour: hourIndex,
            net: cell.net,
            count: cell.count,
            absNet: Math.abs(cell.net) || 1, // for ZAxis scaling
          });
        }
      });
    });

    return flatData;
  }, [tournaments]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--color-card-surface)] border border-white/5 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar size={18} className="text-[var(--accent)]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Profit Heatmap (Day / Hour)
        </h3>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              dataKey="hour"
              type="number"
              name="Hour"
              domain={[-0.5, 23.5]}
              tickFormatter={(val) => HOURS[val] || ''}
              stroke="rgba(255,255,255,0.3)"
              fontSize={10}
              tickCount={24}
            />
            <YAxis
              dataKey="day"
              type="number"
              name="Day"
              domain={[-0.5, 6.5]}
              tickFormatter={(val) => DAYS[val] || ''}
              stroke="rgba(255,255,255,0.3)"
              fontSize={10}
              reversed
              tickCount={7}
            />
            <ZAxis dataKey="absNet" type="number" range={[50, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0]!.payload;
                  return (
                    <div className="bg-[var(--color-card-surface-3)] border border-white/10 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-bold text-xs mb-1">
                        {DAYS[d.day]} at {HOURS[d.hour]}
                      </p>
                      <p className="text-[10px] text-[var(--fg-dim)]">
                        Tournaments: {d.count}
                      </p>
                      <p className={`text-xs font-bold ${d.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Net: {d.net >= 0 ? '+' : ''}${Math.round(d.net)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={data} shape="circle">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.net >= 0 ? 'var(--accent)' : '#ef4444'} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
