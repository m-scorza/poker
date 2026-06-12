import { useRef, useMemo, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { clsx } from 'clsx';
import type { SessionTrendPoint } from '../../data/sessions';

gsap.registerPlugin(useGSAP);

export function BankrollChart({ trendData }: { trendData: SessionTrendPoint[] }) {
  const containerRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<'lifetime'|'30d'|'7d'>('lifetime');

  const { pathData, areaData, evData, lastPoint } = useMemo(() => {
    if (!trendData || trendData.length === 0) return { pathData: '', areaData: '', evData: '', lastPoint: [0,0] };
    
    const W = 1140, H = 150, padX = 0, padY = 20;
    const data = trendData;
    const xs = (i: number) => padX + (i / Math.max(1, data.length - 1)) * (W - padX * 2);
    
    const maxVal = Math.max(...data.map(d => d.cumulativePnl));
    const minVal = Math.min(...data.map(d => d.cumulativePnl));
    const range = maxVal - minVal || 1;
    
    const ys = (v: number) => H - padY - ((v - minVal) / range) * (H - padY * 2);
    
    const pts = data.map((d, i) => [xs(i), ys(d.cumulativePnl)]);
    const evPts = data.map((d, i) => [xs(i), ys(d.cumulativePnl * 0.9)]); // mock EV for display
    
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0]!.toFixed(1) + ' ' + p[1]!.toFixed(1)).join(' ');
    const evLine = evPts.map((p, i) => (i ? 'L' : 'M') + p[0]!.toFixed(1) + ' ' + p[1]!.toFixed(1)).join(' ');
    const area = line + ` L ${W},${H+30} L 0,${H+30} Z`;
    
    return { pathData: line, areaData: area, evData: evLine, lastPoint: pts[pts.length - 1] || [0,0] };
  }, [trendData, tab]);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
    const line = containerRef.current?.querySelector('.ch-line') as SVGPathElement;
    if (line && pathData) {
      const len = line.getTotalLength();
      gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(line, { strokeDashoffset: 0, duration: 1.8 }, 0);
      
      tl.to('.ch-area', { opacity: 0.9, duration: 1.2 }, 0.5);
      tl.to('.ch-ev', { opacity: 0.7, duration: 0.8 }, 0.8);
      tl.to('.ch-dot', { opacity: 1, duration: 0.5 }, 1.6);
    }
  }, { scope: containerRef, dependencies: [pathData] });

  return (
    <section ref={containerRef} className="card span-2 reveal lift in">
      <div className="chart-head">
        <div>
          <span className="kick accent">Bankroll progression</span>
          <h3 className="card-title">Cumulative net P&amp;L</h3>
        </div>
        <div className="tab-menu">
          <button className={clsx(tab === 'lifetime' && 'on')} onClick={() => setTab('lifetime')}>Lifetime</button>
          <button className={clsx(tab === '30d' && 'on')} onClick={() => setTab('30d')}>30d</button>
          <button className={clsx(tab === '7d' && 'on')} onClick={() => setTab('7d')}>7d</button>
        </div>
      </div>
      
      <div className="chart-wrap relative">
        <svg viewBox="0 0 1140 200" preserveAspectRatio="none" style={{ width: '100%', height: '240px' }}>
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line className="ch-axis" x1="0" y1="50" x2="1140" y2="50" stroke="var(--border)" />
          <line className="ch-axis" x1="0" y1="100" x2="1140" y2="100" stroke="var(--border)" />
          <line className="ch-axis" x1="0" y1="150" x2="1140" y2="150" stroke="var(--border)" />
          
          {pathData && (
            <>
              <path className="ch-area" fill="url(#cg)" d={areaData} style={{ opacity: 0 }} />
              <path className="ch-ev" fill="none" stroke="var(--fg-dim)" strokeDasharray="4 4" d={evData} style={{ opacity: 0 }} />
              <path className="ch-line" fill="none" stroke="var(--accent)" strokeWidth="2" d={pathData} style={{ filter: 'drop-shadow(0 0 8px var(--accent-glow))' }} />
              <circle className="ch-dot" r="4" cx={lastPoint[0]} cy={lastPoint[1]} fill="var(--accent-2)" style={{ opacity: 0 }} />
            </>
          )}
        </svg>
      </div>
    </section>
  );
}
