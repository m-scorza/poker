import { StatCard } from 'poker-analyzer';

export const Accents = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
    <StatCard label="Net Profit" value="+$1,204.50" accent="green" subtext="18 sessions" />
    <StatCard label="Biggest Loss" value="-$312.00" accent="red" subtext="NLHE 100bb" />
    <StatCard label="Range Compliance" value="87.4%" accent="warning" subtext="target 90%+" />
    <StatCard label="Hands Reviewed" value="12,480" accent="info" subtext="last 30 days" />
  </div>
);

export const CoreStats = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
    <StatCard
      label="VPIP"
      value="24.3%"
      accent="green"
      subtext="+2.1% vs baseline"
      info={{ text: 'Voluntarily Put In Pot — how often you enter the pot.', target: '20-30%' }}
    />
    <StatCard
      label="PFR"
      value="19.8%"
      accent="default"
      info={{ text: 'Preflop Raise frequency across all positions.', target: '15-23%' }}
    />
    <StatCard label="3-Bet %" value="8.1%" accent="info" subtext="low sample" />
  </div>
);
