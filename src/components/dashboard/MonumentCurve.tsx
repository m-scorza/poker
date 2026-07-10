import { useRef, useMemo } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SessionTrendPoint } from '../../data/sessions';

gsap.registerPlugin(useGSAP);

interface MonumentCurveProps {
  totalPnl: number;
  tournaments: number;
  roi: string;
  itmRate: string;
  verdict: string;
  trendData: SessionTrendPoint[];
  maxDrawdown: number;
  maxDrawdownBuyIns: number;
}

export function MonumentCurve({ totalPnl, tournaments, roi, itmRate, verdict, trendData, maxDrawdown, maxDrawdownBuyIns }: MonumentCurveProps) {
  const containerRef = useRef<HTMLElement>(null);

  const { pathData, areaData, lastPoint } = useMemo(() => {
    if (trendData.length === 0) return { pathData: '', areaData: '', lastPoint: [0, 0] };

    const W = 560, H = 320, pad = 10;
    const equityCurve = trendData.map((d) => d.cumulativePnl);
    const max = Math.max(...equityCurve), min = Math.min(...equityCurve);
    const xs = (i: number) => pad + (i / Math.max(1, equityCurve.length - 1)) * (W - pad * 2);
    const ys = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);

    const pts = equityCurve.map((v, i) => [xs(i), ys(v)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0]!.toFixed(1) + ' ' + p[1]!.toFixed(1)).join(' ');
    const area = line + ` L${xs(Math.max(0, equityCurve.length - 1)).toFixed(1)} ${H} L${pad} ${H} Z`;

    return { pathData: line, areaData: area, lastPoint: pts[pts.length - 1] ?? [0, 0] };
  }, [trendData]);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });

    const path = containerRef.current?.querySelector('.mon-line') as SVGPathElement;
    if (path) {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(path, { strokeDashoffset: 0, duration: 2.2 }, 0);
    }

    tl.to('.mon-area', { opacity: 1, duration: 1.5 }, 0.6);
    tl.to('.mon-dot', { opacity: 1, duration: 0.5 }, 2);

    const intNode = containerRef.current?.querySelector('.int');
    if (intNode) {
       gsap.fromTo(intNode,
         { innerText: 0 },
         {
           innerText: Math.floor(Math.abs(totalPnl)),
           duration: 1.8,
           snap: { innerText: 1 },
           onUpdate: function() {
              intNode.innerHTML = Math.floor(Number(this.targets()[0].innerText)).toString();
           }
         }
       );
    }
  }, { scope: containerRef, dependencies: [pathData] });

  const pnlInt = Math.floor(Math.abs(totalPnl));
  const pnlDec = Math.abs(totalPnl).toFixed(2).split('.')[1];

  return (
    <section ref={containerRef} className="card monument reveal in">
      <div className="mon-curve" id="monCurve">
        <svg viewBox="0 0 560 320" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="mong" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {pathData && (
            <>
              <path d={areaData} fill="url(#mong)" className="mon-area" style={{ opacity: 0 }} />
              <path d={pathData} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mon-line" style={{ filter: 'drop-shadow(0 0 8px var(--accent-glow))' }} />
              <circle cx={lastPoint[0]!.toFixed(1)} cy={lastPoint[1]!.toFixed(1)} r="4" fill="var(--accent-2)" className="mon-dot" style={{ opacity: 0, filter: 'drop-shadow(0 0 6px var(--accent-glow))' }} />
            </>
          )}
        </svg>
      </div>
      <div className="mon-left">
        <span className="kick accent">Lifetime net profit · {tournaments} tournaments</span>
        <div className="mon-num" id="monNum">
          <span className="sign">{totalPnl >= 0 ? '+' : '-'}</span>$
          <span className="int" id="monInt">{pnlInt}</span>
          <span className="cents">.{pnlDec || '00'}</span>
        </div>
        <div className="mon-verdict">{verdict}</div>
      </div>
      <div className="mon-substats">
        <div className={`substat ${totalPnl >= 0 ? 'up' : 'loss'}`}>
          <span className="kick">Tracked ROI</span>
          <div className={`v ${totalPnl >= 0 ? 'up' : 'loss'}`} id="subRoi">{totalPnl >= 0 ? '+' : ''}{roi}</div>
          <span className="sub">vs 0% breakeven</span>
        </div>
        <div className="substat accent">
          <span className="kick">ITM rate</span>
          <div className="v accent" id="subItm">{itmRate}</div>
          <span className="sub">vs 16% field avg</span>
        </div>
        <div className="substat">
          <span className="kick">Max drawdown</span>
          <div className="v">${maxDrawdown.toFixed(2)}</div>
          <span className="sub">{maxDrawdownBuyIns.toFixed(1)} ABI</span>
        </div>
      </div>
    </section>
  );
}
