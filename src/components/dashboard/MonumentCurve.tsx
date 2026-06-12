import { useRef, useMemo } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface MonumentCurveProps {
  totalPnl: number;
  tournaments: number;
  roi: string;
  itmRate: string;
  verdict: string;
}

export function MonumentCurve({ totalPnl, tournaments, roi, itmRate, verdict }: MonumentCurveProps) {
  const containerRef = useRef<HTMLElement>(null);

  const EQUITY = [0,12,8,22,18,30,26,40,52,46,60,74,66,88,102,94,118,140,128,150,142,170,196,182,214,236,228,262,250,286,318,306,344,366,356,389];
  
  const { pathData, areaData, lastPoint } = useMemo(() => {
    const W = 560, H = 320, pad = 10;
    const max = Math.max(...EQUITY), min = Math.min(...EQUITY);
    const xs = (i: number) => pad + (i / (EQUITY.length - 1)) * (W - pad * 2);
    const ys = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
    
    const pts = EQUITY.length ? EQUITY.map((v, i) => [xs(i), ys(v)]) : [[0, 0]];
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0]!.toFixed(1) + ' ' + p[1]!.toFixed(1)).join(' ');
    const area = line + ` L${xs(Math.max(0, EQUITY.length - 1)).toFixed(1)} ${H} L${pad} ${H} Z`;
    
    return { pathData: line, areaData: area, lastPoint: pts[pts.length - 1] ?? [0,0] };
  }, []);

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
  }, { scope: containerRef });

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
          <path d={areaData} fill="url(#mong)" className="mon-area" style={{ opacity: 0 }} />
          <path d={pathData} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mon-line" style={{ filter: 'drop-shadow(0 0 8px var(--accent-glow))' }} />
          <circle cx={lastPoint[0]!.toFixed(1)} cy={lastPoint[1]!.toFixed(1)} r="4" fill="var(--accent-2)" className="mon-dot" style={{ opacity: 0, filter: 'drop-shadow(0 0 6px var(--accent-glow))' }} />
        </svg>
      </div>
      <div className="mon-left">
        <span className="kick accent">Lifetime net profit · {tournaments} tournaments</span>
        <div className="mon-num" id="monNum">
          <span className="sign">{totalPnl >= 0 ? '+' : '-'}</span>$
          <span className="int" id="monInt">{pnlInt}</span>
          <span className="cents">.{pnlDec || '00'}</span>
        </div>
        <div className="mon-verdict" dangerouslySetInnerHTML={{ __html: verdict }} />
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
          <span className="kick">Best cash</span>
          <div className="v">+$22.50</div>
          <span className="sub">1st of 89 · Oct</span>
        </div>
        <div className="substat">
          <span className="kick">Max drawdown</span>
          <div className="v">$18.40</div>
          <span className="sub">recovered in 11</span>
        </div>
      </div>
    </section>
  );
}
