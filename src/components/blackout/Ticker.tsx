/**
 * Ticker — the live mono marquee under the top bar. Real stats in motion, with
 * refusals travelling IN the stream (data honesty you can't miss). See
 * docs/design/BLACKOUT_ROLLOUT.md (signature 4: the live ticker).
 *
 * The item list is rendered twice so the -50% translate loops seamlessly.
 * `prefers-reduced-motion` halts the scroll (handled in blackout.css).
 */

export interface TickerItem {
  label: string;
  value?: string;
  /** up = money-positive (green), dn = loss (red). Data never carries violet. */
  tone?: 'up' | 'dn';
}

interface TickerProps {
  items: TickerItem[];
}

export function Ticker({ items }: TickerProps) {
  if (items.length === 0) return null;
  const stream = [...items, ...items];
  return (
    <div className="bk-ticker-rail" aria-hidden="true">
      <div className="bk-ticker">
        {stream.map((item, i) => (
          <span key={`${item.label}-${i}`}>
            {item.label}
            {item.value != null && <> <b className={item.tone ?? ''}>{item.value}</b></>}
          </span>
        ))}
      </div>
    </div>
  );
}
