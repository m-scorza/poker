import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Percent, TrendingUp, Trophy, Target, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';

interface StatPillProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  isPositive?: boolean;
}

function StatPill({ label, value, icon, trend, isPositive }: StatPillProps) {
  return (
    <div className="bg-[#15171f] border border-white/5 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
      <div className="flex items-center gap-2 text-[var(--fg-dim)] uppercase text-[10px] font-bold tracking-widest">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black font-data tracking-tight text-white">
        {value}
      </div>
      {trend && (
        <div className={clsx(
          "text-[10px] font-bold font-data",
          isPositive ? "text-emerald-400" : "text-red-400"
        )}>
          {isPositive ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
  );
}

interface CareerDashboardProps {
  stats: {
    totalWinnings: number;
    totalProfit: number;
    itmRate: number;
    roi: number;
    avgBuyIn: number;
    tournamentsPlayed: number;
  };
  profitHistory: { date: string; amount: number }[];
}

export function CareerDashboard({ stats, profitHistory }: CareerDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatPill 
          label="Total Prized" 
          value={`$${stats.totalWinnings.toLocaleString()}`} 
          icon={<Trophy size={14} />} 
        />
        <StatPill 
          label="Net Profit" 
          value={`$${stats.totalProfit.toLocaleString()}`} 
          icon={<DollarSign size={14} />} 
          trend={stats.totalProfit > 0 ? "Profitable" : "Down"}
          isPositive={stats.totalProfit > 0}
        />
        <StatPill 
          label="ROI" 
          value={`${stats.roi.toFixed(1)}%`} 
          icon={<TrendingUp size={14} />} 
          isPositive={stats.roi > 0}
        />
        <StatPill 
          label="ITM Rate" 
          value={`${stats.itmRate.toFixed(1)}%`} 
          icon={<Percent size={14} />} 
        />
        <StatPill 
          label="Avg Buy-in" 
          value={`$${stats.avgBuyIn.toFixed(2)}`} 
          icon={<Target size={14} />} 
        />
        <StatPill 
          label="Tournaments" 
          value={stats.tournamentsPlayed} 
          icon={<BarChart3 size={14} />} 
        />
      </div>

      <div className="bg-[#15171f] border border-white/5 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--accent)]" />
            Career Profit Graph
          </h3>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={profitHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1d26', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="var(--accent)" 
                fillOpacity={1} 
                fill="url(#profitGradient)" 
                strokeWidth={3}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
