export function WireTape({ wireItems }: { wireItems: { t: string, v: string, cls?: string }[] }) {
  return (
    <div className="wire reveal in">
      <div className="wire-badge"><span className="pulse"></span><span className="t">THE<b>WIRE</b></span></div>
      <div className="wire-tape">
        <div className="wire-track">
          {[...wireItems, ...wireItems].map((w, i) => (
             <span key={i} className={w.cls}>{w.t} <b>{w.v}</b></span>
          ))}
        </div>
      </div>
    </div>
  );
}
