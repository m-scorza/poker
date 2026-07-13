/**
 * HonestyStrip — the brand spoken in the chrome, not a tooltip. A three-cell
 * strip under every verdict surface: rule-based (no EV), refusal-as-UI (with a
 * live count), local-only. See docs/design/BLACKOUT_ROLLOUT.md (signature 5).
 */

interface HonestyCell {
  label: string;
  body: string;
}

interface HonestyStripProps {
  cells: HonestyCell[];
}

export function HonestyStrip({ cells }: HonestyStripProps) {
  return (
    <div className="bk-honesty">
      {cells.map((cell) => (
        <div key={cell.label}>
          <b>{cell.label}</b>
          {cell.body}
        </div>
      ))}
    </div>
  );
}
