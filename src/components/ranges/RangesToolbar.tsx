import { Edit3, Eye, BarChart3 } from 'lucide-react';

import type { Position, HeroDecision } from '../../types/analysis';
import { RFI_POSITIONS, matchesPosition, matchesScenario, type ViewMode } from './rangeFilters';

interface RangesToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  decisions: HeroDecision[];
  selectedPos: Position;
  setSelectedPos: (pos: Position) => void;
  selectedScenario: 'RFI' | 'FACING_RAISE';
  setSelectedScenario: (scenario: 'RFI' | 'FACING_RAISE') => void;
  validReactionOpeners: Position[];
  selectedReactionOpener: Position | null;
  setSelectedOpener: (opener: Position) => void;
}

export function RangesToolbar({
  viewMode,
  setViewMode,
  decisions,
  selectedPos,
  setSelectedPos,
  selectedScenario,
  setSelectedScenario,
  validReactionOpeners,
  selectedReactionOpener,
  setSelectedOpener,
}: RangesToolbarProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6 border-b border-[var(--hairline)] pb-4">
        <div>
          <span className="kick sig">Range Matrix</span>
          <h1 style={{ marginTop: 4, marginBottom: 0 }}>Compliance & Theory</h1>
        </div>
        <div className="tabs">
          <button onClick={() => setViewMode('compliance')} className={viewMode === 'compliance' ? 'on' : ''}>
            <Eye size={12} className="inline mr-1 -mt-0.5" /> Compliance
          </button>
          <button onClick={() => setViewMode('edit')} className={viewMode === 'edit' ? 'on' : ''}>
            <Edit3 size={12} className="inline mr-1 -mt-0.5" /> Edit
          </button>
          <button onClick={() => setViewMode('push_fold')} className={viewMode === 'push_fold' ? 'on' : ''}>
            Push/Fold
          </button>
          <button onClick={() => setViewMode('validator')} className={viewMode === 'validator' ? 'on' : ''}>
            <BarChart3 size={12} className="inline mr-1 -mt-0.5" /> Validation
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
         {/* Position selector */}
         <div className="tabs" style={{ flexWrap: 'wrap', height: 'fit-content' }}>
           {RFI_POSITIONS.map((pos) => {
             const posCount = decisions.filter((d) => {
               return matchesPosition(d, pos) && matchesScenario(d, selectedScenario, selectedReactionOpener);
             }).length;

             return (
               <button
                 key={pos}
                 onClick={() => setSelectedPos(pos)}
                 className={selectedPos === pos ? "on" : ""}
               >
                 {pos} {posCount > 0 && `(${posCount})`}
               </button>
             );
           })}
         </div>

         {/* Scenario selector */}
         <div className="tabs">
            <button
              onClick={() => setSelectedScenario('RFI')}
              className={selectedScenario === 'RFI' ? "on" : ""}
            >
               RFI / Open
            </button>
            <button
              onClick={() => setSelectedScenario('FACING_RAISE')}
              className={selectedScenario === 'FACING_RAISE' ? "on" : ""}
            >
               Reaction (vs Raise)
            </button>
         </div>
         {selectedScenario === 'FACING_RAISE' && (
           <div className="tabs" style={{ flexWrap: 'wrap', height: 'fit-content' }}>
             {validReactionOpeners.length > 0 ? validReactionOpeners.map((opener) => (
               <button
                 key={opener}
                 onClick={() => setSelectedOpener(opener)}
                 className={selectedReactionOpener === opener ? "on" : ""}
               >
                 vs {opener}
               </button>
             )) : (
               <div className="px-3 py-1.5 text-xs text-[var(--fg-muted)]">
                 No earlier opener
               </div>
             )}
           </div>
         )}
      </div>
    </>
  );
}
