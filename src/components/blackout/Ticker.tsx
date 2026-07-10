/**
 * Ticker — the live mono marquee under the top bar. Real stats in motion, with
 * refusals travelling IN the stream (data honesty you can't miss). See
 * docs/design/BLACKOUT_ROLLOUT.md (signature 4: the live ticker).
 *
 * A real marquee: the run is rendered twice so the -50% translate loops
 * seamlessly, the duplicate is `aria-hidden` so screen readers hear the stats
 * once, the scroll pauses on hover, and reduced-motion stands it still (both
 * handled in blackout.css).
 */

const RUN_STYLE: React.CSSProperties = { display: 'flex', gap: '56px', flex: 'none' };

export interface TickerItem {
  label: string;
  value?: string;
  /** up = money-positive (green), dn = loss (red). Data never carries violet. */
  tone?: 'up' | 'dn';
}

interface TickerProps {
  items: TickerItem[];
}

function TickerRun({ items, hidden }: { items: TickerItem[]; hidden?: boolean }) {
  return (
    <div style={RUN_STYLE} aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`}>
          {item.label}
          {item.value != null && (
            <>
              {' '}
              <b className={item.tone ?? ''}>{item.value}</b>
            </>
          )}
        </span>
      ))}
    </div>
  );
}

export function Ticker({ items }: TickerProps) {
  if (items.length === 0) return null;
  return (
    <div className="bk-ticker-rail">
      <div className="bk-ticker">
        <TickerRun items={items} />
        <TickerRun items={items} hidden />
      </div>
    </div>
  );
}
