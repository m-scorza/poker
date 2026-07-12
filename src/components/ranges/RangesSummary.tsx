import { Save, RotateCcw, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

import type { ComplianceBreakdown } from '../../analysis/rangeChecker';
import type { ReactionRangeInfo } from '../../data/ranges';
import type { ViewMode } from './rangeFilters';

interface RangesSummaryProps {
  viewMode: ViewMode;
  selectedScenario: 'RFI' | 'FACING_RAISE';
  posDecisionsCount: number;
  compliance: ComplianceBreakdown;
  pushRange: Set<string> | undefined;
  customRange: Set<string>;
  theoreticalRange: Set<string> | undefined;
  hasCustom: boolean;
  reactionRangeInfo: ReactionRangeInfo | null;
  handleSave: () => void;
  handleReset: () => void;
  saveError: string | null;
}

export function RangesSummary({
  viewMode,
  selectedScenario,
  posDecisionsCount,
  compliance,
  pushRange,
  customRange,
  theoreticalRange,
  hasCustom,
  reactionRangeInfo,
  handleSave,
  handleReset,
  saveError,
}: RangesSummaryProps) {
  return (
    <>
      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        {viewMode === 'compliance' && (
          <>
            <div>
              <span className="text-[var(--fg-dim)]">
                {selectedScenario === 'RFI' ? 'RFI Hands: ' : 'Spot Hands: '}
              </span>
              <span className="font-data font-bold">{posDecisionsCount}</span>
            </div>
            <div>
              <span className="text-[var(--fg-dim)]">Compliance: </span>
              {compliance.percentage === null ? (
                <span
                  className="font-data font-bold text-[var(--fg-muted)]"
                  title="No spots in this position are gradeable yet — they're all scenarios the engine refuses to grade (facing 3-bets/all-ins, extreme ICM)."
                >
                  — <span className="text-[10px] font-normal">no graded spots</span>
                </span>
              ) : (
                <span className={`font-data font-bold ${compliance.percentage >= 90 ? 'text-[var(--accent)]' : 'text-[var(--loss)]'}`}>
                  {compliance.percentage.toFixed(1)}%
                </span>
              )}
            </div>
            {compliance.excluded > 0 && (
              <div
                className="text-[11px] text-[var(--fg-muted)]"
                title="These spots have no agreed range yet (facing 3-bets/all-ins, extreme ICM), so the engine refuses to grade them rather than guess. They're left out of the % above."
              >
                <span className="font-data">{compliance.graded}</span> graded ·{' '}
                <span className="font-data">{compliance.excluded}</span> not graded
              </div>
            )}
          </>
        )}
        <div>
          <span className="text-[var(--fg-dim)]">
            {viewMode === 'push_fold' ? 'Push range: ' : viewMode === 'edit' ? 'Custom range: ' : 'Range: '}
          </span>
          <span className="font-data font-bold">
            {viewMode === 'push_fold'
              ? `${pushRange?.size ?? 0} combos`
              : viewMode === 'edit'
                ? `${customRange.size} combos`
                : `${theoreticalRange?.size ?? 0} combos`}
          </span>
        </div>
        {viewMode === 'edit' && hasCustom && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--sig-line)] text-[var(--sig)]">
            Custom
          </span>
        )}
      </div>

      {selectedScenario === 'FACING_RAISE' && reactionRangeInfo && (
        <div className={clsx(
          "mb-4 rounded-lg border p-3 text-xs",
          reactionRangeInfo.status === 'supported'
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
            : "border-warn/20 bg-warn/10 text-warn"
        )}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold uppercase tracking-wider">
              {reactionRangeInfo.status === 'supported' ? 'Chart available' : 'No chart yet'}
            </span>
            <span className="font-data text-[var(--fg)]">
              {reactionRangeInfo.label}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-data text-[10px] uppercase tracking-wider text-white/80">
              {reactionRangeInfo.comboCount} combos
            </span>
          </div>
          <p className="mt-1 text-[var(--fg-muted)]">
            {reactionRangeInfo.note}
          </p>
        </div>
      )}

      {/* Edit mode actions */}
      {viewMode === 'edit' && (
        <div className="mb-4">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors"
            >
              <Save size={12} /> Save Range
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-[var(--fg-dim)] border border-[var(--hairline)] hover:text-[var(--loss)] hover:border-[var(--loss)] transition-colors"
            >
              <RotateCcw size={12} /> Reset to Theoretical
            </button>
          </div>
          {saveError && (
            <div role="alert" className="mt-2 flex items-start gap-1.5 px-2 py-1.5 text-xs rounded-md bg-[var(--loss)]/10 text-[var(--loss)] border border-[var(--loss)]/40">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
