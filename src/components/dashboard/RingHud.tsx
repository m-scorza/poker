import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface Stat {
  val: number;
  pct: number;
  color: string;
  lbl: string;
  full: string;
  target: string;
}

interface RingHudProps {
  vpip: number;
  pfr: number;
  threeBet: number;
}

const STAT_KEYS = ['vpip', 'pfr', '3bet'] as const;
type StatKey = (typeof STAT_KEYS)[number];

export function RingHud({ vpip, pfr, threeBet }: RingHudProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [activeStat, setActiveStat] = useState<StatKey>('vpip');

  const STATS: Record<StatKey, Stat> = {
    vpip: { val: vpip, pct: Math.min(vpip / 100, 1), color: 'var(--accent)', lbl: 'VPIP', full: 'VPIP · voluntary in pot', target: 'Target 20–30%' },
    pfr:  { val: pfr, pct: Math.min(pfr / 100, 1), color: 'var(--accent-2)', lbl: 'PFR', full: 'PFR · preflop raise', target: 'Target 15–22%' },
    '3bet': { val: threeBet, pct: Math.min(threeBet / 100, 1), color: 'var(--loss)', lbl: '3-BET', full: '3-bet frequency', target: 'Target 6–10%' },
  };

  const radii: Record<StatKey, number> = { vpip: 76, pfr: 60, '3bet': 44 };

  useGSAP(() => {
    STAT_KEYS.forEach((k) => {
      const s = STATS[k];
      const r = radii[k];
      const circ = 2 * Math.PI * r;
      const ring = containerRef.current?.querySelector(`.ring-${k}`) as SVGElement;
      if (ring) {
        gsap.set(ring, { strokeDasharray: circ, strokeDashoffset: circ });
        gsap.to(ring, {
          strokeDashoffset: circ * (1 - s.pct),
          duration: 1.5,
          ease: 'power3.out',
          delay: 0.45
        });
      }
    });

    const valNode = containerRef.current?.querySelector('.hud-val');
    if (valNode && STATS[activeStat]) {
      gsap.fromTo(valNode,
        { innerText: 0 },
        {
          innerText: STATS[activeStat].val,
          duration: 0.7,
          snap: { innerText: 0.1 },
          onUpdate: function() {
            valNode.innerHTML = Number(this.targets()[0].innerText).toFixed(1) + '%';
          }
        }
      );
    }
  }, { scope: containerRef, dependencies: [vpip, pfr, threeBet, activeStat] });

  return (
    <section ref={containerRef} className="card reveal lift in">
      <span className="kick accent">Pre-flop telemetry · click to inspect</span>
      <div className="hud" style={{ marginTop: 'var(--s-md)' }}>
        <div className="hud-rings">
          <svg width="168" height="168">
            {STAT_KEYS.map((k) => {
              const s = STATS[k];
              const r = radii[k];
              const circ = 2 * Math.PI * r;
              return (
                <g key={k}>
                  <circle className="ring-bg" cx="84" cy="84" r={r} />
                  <circle 
                    className={`ring-fg ring-${k}`} 
                    cx="84" cy="84" r={r} 
                    stroke={s.color} 
                    style={{ strokeDasharray: circ, strokeDashoffset: circ }}
                  />
                </g>
              );
            })}
            <g className="hud-sweep">
              <line x1="84" y1="84" x2="84" y2="6" stroke="var(--border-strong)" strokeWidth="1" />
            </g>
          </svg>
          <div className="hud-center">
            <div className="lbl" id="hudLbl">{STATS[activeStat]?.lbl}</div>
            <div className="val hud-val" id="hudVal">0.0%</div>
          </div>
        </div>
        <div className="hud-stats">
          {Object.entries(STATS).map(([k, s]) => (
            <button 
              key={k}
              className={`stat-trigger ${activeStat === k ? 'active' : ''}`}
              onClick={() => setActiveStat(k as StatKey)}
            >
              <span className="sl">
                <span className="dotc" style={{ background: s.color }}></span>
                {s.full.split(' · ')[0]} <small>{s.full.split(' · ')[1]}</small>
              </span>
              <span className="sv">{s.val.toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
