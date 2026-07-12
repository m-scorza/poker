import { rangeValidationSummary } from '../../analysis/rangeValidator';
import type { RangeValidationResult } from '../../analysis/rangeValidator';

const directionLabel = (d: string) =>
  d === 'wider' ? 'Wider' : d === 'tighter' ? 'Tighter' : 'OK';
const directionColor = (d: string) =>
  d === 'match' ? 'text-[var(--money)]' : 'text-warn';

function ValidationTable({ title, results }: { title: string; results: RangeValidationResult[] }) {
  return (
    <div className="compartment">
      <span className="kick mb-3">{title}</span>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-[var(--fg-muted)] border-b border-[var(--hairline)]">
            <th className="text-left py-1.5 pr-4">Position</th>
            <th className="text-right py-1.5 px-3">Ours %</th>
            <th className="text-right py-1.5 px-3">Reference %</th>
            <th className="text-right py-1.5 px-3">Delta</th>
            <th className="text-left py-1.5 pl-3">Direction</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.position} className="border-b border-[var(--hairline)]/30">
              <td className="py-1.5 pr-4 font-data font-bold">{r.position}</td>
              <td className="py-1.5 px-3 text-right font-data">{r.ourPct.toFixed(1)}%</td>
              <td className="py-1.5 px-3 text-right font-data text-[var(--fg-dim)]">{r.solverPct.toFixed(1)}%</td>
              <td className="py-1.5 px-3 text-right font-data">{r.delta.toFixed(1)}%</td>
              <td className={`py-1.5 pl-3 text-xs font-bold ${directionColor(r.direction)}`}>{directionLabel(r.direction)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RangeValidatorPanel() {
  const validation = rangeValidationSummary();

  return (
    <div className="mt-4 space-y-4 max-w-2xl">
      {/* Overall Score */}
      <div className="compartment">
        <div className="flex items-center justify-between mb-3">
          <span className="kick">Range Accuracy</span>
          <span className={`text-2xl font-mono font-bold ${validation.overallScore >= 80 ? 'text-[var(--money)]' : validation.overallScore >= 60 ? 'text-[var(--accent)]' : 'text-[var(--loss)]'}`}>
            {validation.overallScore}%
          </span>
        </div>
        <div className="flex gap-4 text-xs text-[var(--fg-dim)]">
          <span>RFI: <span className="font-mono font-bold text-[var(--fg)]">{validation.rfi.score}%</span></span>
          <span>Push/Fold: <span className="font-mono font-bold text-[var(--fg)]">{validation.push.score}%</span></span>
        </div>
        <div className="mt-2">
          Comparison of local ranges against documented chipEV reference baselines.
        </div>
      </div>

      <ValidationTable title="RFI by Position" results={validation.rfi.results} />

      <ValidationTable title="Push/Fold (10bb) by Position" results={validation.push.results} />

      <p className="text-xs text-[var(--fg-muted)]">
        Source: documented chipEV reference baselines at 50bb (RFI) and 10bb (Push/Fold). Weighted scores: RFI 60% + Push 40%.
      </p>
    </div>
  );
}
