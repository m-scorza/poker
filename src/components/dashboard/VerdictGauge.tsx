import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface VerdictGaugeProps {
  score: number;
  verdictReco: string;
  verdictConf: string;
  roi: string;
  totalPnl: number;
  blockerTitle: string;
  blockerDesc: string;
  fixText: string;
  fixHref?: string;
}

export function VerdictGauge({ score, verdictReco, verdictConf, roi, totalPnl, blockerTitle, blockerDesc, fixText, fixHref }: VerdictGaugeProps) {
  const containerRef = useRef<HTMLElement>(null);
  const r = 42;
  const circ = 2 * Math.PI * r;

  useGSAP(() => {
    const fg = containerRef.current?.querySelector('.g-fg') as SVGElement;
    if (fg) {
      gsap.set(fg, { strokeDasharray: circ, strokeDashoffset: circ });
      gsap.to(fg, { 
        strokeDashoffset: circ * (1 - (score / 100)), 
        duration: 1.3, 
        ease: 'power3.out',
        delay: 0.5 
      });
    }

    const numNode = containerRef.current?.querySelector('.num');
    if (numNode) {
      gsap.fromTo(numNode, 
        { innerText: 0 },
        { 
          innerText: score, 
          duration: 1.3, 
          delay: 0.5,
          snap: { innerText: 1 },
          onUpdate: function() {
            numNode.innerHTML = Math.round(Number(this.targets()[0].innerText)).toString();
          }
        }
      );
    }
  }, { scope: containerRef, dependencies: [score] });

  return (
    <section ref={containerRef} className="card verdict reveal lift in">
      <span className="kick accent">The 30-second answer</span>
      <div className="verdict-top">
        <div className="gauge">
          <svg width="96" height="96">
            <circle className="g-bg" cx="48" cy="48" r="42" />
            <circle className="g-fg" cx="48" cy="48" r="42" style={{ strokeDasharray: circ, strokeDashoffset: circ }} />
          </svg>
          <div className="g-center">
            <div className="num">0</div>
            <div className="den">/100</div>
          </div>
        </div>
        <div>
          <div className="verdict-reco">{verdictReco}</div>
          <div className="verdict-conf">{verdictConf}</div>
        </div>
      </div>
      <div className="verdict-metrics">
        <div className="verdict-metric">
          <span className="kick">Tracked ROI</span>
          <div className="vm accent">{totalPnl >= 0 ? '+' : ''}{roi} ROI</div>
        </div>
        <div className="verdict-metric">
          <span className="kick">Profit</span>
          <div className="vm">{totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)} cumulative</div>
        </div>
      </div>
      <div className="verdict-blocker">
        <span className="kick loss">Main blocker</span>
        <div className="vb-t">{blockerTitle}</div>
        <p>{blockerDesc}</p>
      </div>
      {fixText && fixHref && (
        <Link to={fixHref} className="verdict-fix">
          <span className="ft">{fixText}</span>
          <span className="fa">→</span>
        </Link>
      )}
    </section>
  );
}
