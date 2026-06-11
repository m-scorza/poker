import { useState } from 'react';
import { clsx } from 'clsx';
import type { PositionStats } from '../../analysis/positionStats';

interface PositionalHeatmapProps {
  stats: PositionStats[];
}

export function PositionalHeatmap({ stats }: PositionalHeatmapProps) {
  const [activePos, setActivePos] = useState<string>('BTN');
  const statMap: Record<string, PositionStats | undefined> = {};
  stats.forEach(s => statMap[s.position] = s);

  const activeP = statMap[activePos];

  return (
    <section className="card span-2 reveal lift in">
      <div className="chart-head">
        <div>
          <span className="kick accent">6-max ring telemetry</span>
          <h3 className="card-title">Positional profitability</h3>
        </div>
        <span className="kick">Click a seat to inspect</span>
      </div>
      <div className="pos-layout">
        <div className="felt-ring">
          <div className="felt-inner"></div>
          <div className="felt-lbl">Felt</div>
          {['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'].map(pos => {
            const s = statMap[pos];
            if (!s) return null;
            const isNeg = s.bb100Hands > 0 && s.bb100 < 0;
            return (
              <button 
                key={pos}
                className={clsx(
                  `seat-btn s-${pos.toLowerCase()}`,
                  isNeg ? 'neg' : 'pos',
                  activePos === pos && 'active'
                )}
                onClick={() => setActivePos(pos)}
              >
                {pos}<b>{s.bb100 > 0 ? '+' : ''}{s.bb100Hands > 0 ? s.bb100.toFixed(1) : '0'}bb</b>
              </button>
            );
          })}
        </div>
        
        {activeP ? (
          <div className="inspect">
            <span className="kick accent" id="inspectTitle">{activeP.position} · seat telemetry</span>
            <div className="inspect-grid">
              <div>
                <span className="kick">VPIP</span>
                <div className="iv">{activeP.vpip.toFixed(1)}%</div>
              </div>
              <div>
                <span className="kick">PFR</span>
                <div className="iv">{activeP.pfr.toFixed(1)}%</div>
              </div>
              <div>
                <span className="kick">bb/100 profit</span>
                <div className={clsx("iv", activeP.bb100 < 0 ? 'loss' : 'up')}>
                  {activeP.bb100Hands > 0 ? `${activeP.bb100 > 0 ? '+' : ''}${activeP.bb100.toFixed(1)} bb` : '—'}
                </div>
              </div>
              <div>
                <span className="kick">Hand volume</span>
                <div className="iv">{activeP.hands.toLocaleString()} hands</div>
              </div>
            </div>
            <div className="inspect-insight">
              <span className="kick">Coach insight</span>
              <p>{activeP.bb100 < -10 ? 'Significant leak detected from this seat. Review your ranges.' : activeP.bb100 > 10 ? 'Highly profitable seat. Good isolation and pressure.' : 'Stable baseline profitability.'}</p>
            </div>
          </div>
        ) : (
          <div className="inspect">Select a seat with data</div>
        )}
      </div>
    </section>
  );
}
