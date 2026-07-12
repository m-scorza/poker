import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { BustOutBucket } from '../../analysis/careerStats';

export function BustOutChart({ data }: { data: BustOutBucket[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-[var(--fg-dim)]">
        No finish data available
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis 
            dataKey="label" 
            type="category" 
            stroke="rgba(255,255,255,0.4)" 
            fontSize={10}
            axisLine={false}
            tickLine={false}
            width={70}
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
            formatter={(value) => [`${value} tournaments`, 'Count']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
