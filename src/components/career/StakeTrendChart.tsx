import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { StakePoint } from '../../analysis/careerStats';

interface StakeTrendChartProps {
  data: StakePoint[];
}

export function StakeTrendChart({ data }: StakeTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-[var(--fg-dim)]">
        Insufficient history for trend
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="stakeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={9} 
            tickLine={false} 
            axisLine={false}
            interval={Math.ceil(data.length / 5)}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={9} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
            itemStyle={{ color: '#a78bfa' }}
            formatter={(value) => [`$${value}`, 'ABI (Moving Avg)']}
          />
          <Area 
            type="monotone" 
            dataKey="abi" 
            stroke="#a78bfa" 
            fillOpacity={1} 
            fill="url(#stakeGradient)" 
            strokeWidth={2}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
