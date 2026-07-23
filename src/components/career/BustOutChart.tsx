import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { BustOutBucket } from '../../analysis/careerStats';

export function BustOutChart({ data }: { data: BustOutBucket[] }) {
  const denominator = data[0]?.denominator ?? 0;

  if (data.length === 0 || denominator === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-[var(--fg-dim)]">
        No finish data available
      </div>
    );
  }

  const chartData = data.map((bucket) => ({
    ...bucket,
    displayValue: `${bucket.count} · ${bucket.percentage.toFixed(1)}%`,
  }));

  return (
    <div className="flex h-full w-full flex-col">
      <p className="mb-2 text-[10px] leading-relaxed text-[var(--fg-dim)]">
        {denominator} tournament {denominator === 1 ? 'result' : 'results'} with a recorded finish. Each bar uses the same 0–{denominator} tournament scale.
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 70, top: 0, bottom: 12 }}>
          <XAxis
            type="number"
            domain={[0, denominator]}
            ticks={[0, denominator]}
            allowDecimals={false}
            stroke="rgba(255,255,255,0.3)"
            fontSize={9}
          />
          <YAxis 
            dataKey="rangeLabel"
            type="category" 
            stroke="rgba(255,255,255,0.4)" 
            fontSize={10}
            axisLine={false}
            tickLine={false}
            width={76}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ 
              backgroundColor: 'var(--color-card-surface-2)',
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
            labelStyle={{ display: 'none' }}
            itemStyle={{ color: '#fff', padding: '2px 0' }}
            formatter={(value, _name, item) => {
              const bucket = item.payload as BustOutBucket;
              return [`${value} of ${bucket.denominator} (${bucket.percentage.toFixed(1)}%)`, bucket.label];
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
            <LabelList dataKey="displayValue" position="right" fill="var(--fg-muted)" fontSize={9} />
          </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
