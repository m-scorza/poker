import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import JSZip from 'jszip';
import { Search, Filter, ChevronDown, ChevronUp, Eye, Upload as UploadIcon, CheckCircle, ChevronLeft, ChevronRight, Trash2, Star } from 'lucide-react';
import { useAppStore } from '../data/appStore';
import { getAllHeroDecisions, getHands, importHands, importTournamentSummaries, getTotalHandCount, clearAllData, toggleStarHand, db } from '../data/store';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { groupIntoSessions } from '../data/sessions';
import { HandReplay } from '../components/hands/HandReplay';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

import { motion, AnimatePresence } from 'framer-motion';
import type { Hand } from '../types/hand';
import type { HeroDecision, Position, Scenario, DeviationType } from '../types/analysis';

const POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP1', 'MP', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB', 'BTN/SB'];

const SCENARIOS: Scenario[] = [
  'RFI', 'BLIND_WAR', 'HU_BTN', 'FACING_RAISE', 'FACING_ALL_IN',
  'FACING_LIMP', 'BB_VS_RAISE', 'BB_VS_LARGE_RAISE', 'BB_VS_LIMP', 'WALK',
];

const STACK_DEPTHS = ['deep', 'medium', 'short'] as const;
type StackDepth = typeof STACK_DEPTHS[number];

const HAND_CATEGORIES = ['pairs', 'broadway', 'suited-connectors', 'suited-aces', 'offsuit'] as const;
type HandCategory = typeof HAND_CATEGORIES[number];

const DEVIATION_LABELS: Record<DeviationType, string> = {
  OVERFOLD: 'Overfold',
  OPENED_OUT_OF_RANGE: 'Out of Range',
  LIMPED: 'Limp',
  SB_OVERFOLD: 'SB Overfold',
  SB_LIMPED: 'SB Limp',
  SB_OUT_OF_RANGE: 'SB Out of Range',
  COLD_CALL: 'Cold Call',
  BB_FOLD_SUITED: 'BB Fold Suited',
  SB_COLD_CALL: 'SB Cold Call',
  FOLD_VS_LIMP: 'Fold vs Limp',
  LIMP_BEHIND: 'Limp Behind',
  HU_BTN_FOLD: 'HU BTN Fold',
};

function getStackDepth(bb: number): StackDepth {
  if (bb > 40) return 'deep';
  if (bb >= 20) return 'medium';
  return 'short';
}

function getHandCategory(handKey: string): HandCategory {
  if (handKey.length === 2) return 'pairs';
  if (handKey.endsWith('s')) {
    const r1 = handKey[0]!;
    const r2 = handKey[1]!;
    if (r1 === 'A') return 'suited-aces';
    const broadways = new Set(['A', 'K', 'Q', 'J', 'T']);
    if (broadways.has(r1) && broadways.has(r2)) return 'broadway';
    const ranks = '23456789TJQKA';
    const diff = Math.abs(ranks.indexOf(r1) - ranks.indexOf(r2));
    if (diff === 1) return 'suited-connectors';
    return 'broadway';
  }
  const broadways = new Set(['A', 'K', 'Q', 'J', 'T']);
  if (broadways.has(handKey[0]!) && broadways.has(handKey[1]!)) return 'broadway';
  return 'offsuit';
}

const STACK_DEPTH_LABELS: Record<StackDepth, string> = {
  deep: 'Deep (>40bb)',
  medium: 'Medium (20-40bb)',
  short: 'Short (<20bb)',
};

const CATEGORY_LABELS: Record<HandCategory, string> = {
  pairs: 'Pairs',
  broadway: 'Broadway',
  'suited-connectors': 'Suited Connectors',
  'suited-aces': 'Suited Aces',
  offsuit: 'Offsuit',
};

export function HandsPage() {
  const [decisions, setDecisions] = useState<HeroDecision[]>([]);
  const [handsMap, setHandsMap] = useState<Map<string, Hand>>(new Map());
  const [sessionHandIds, setSessionHandIds] = useState<Set<string> | null>(null);
  
  // Filters
  const [posFilter, setPosFilter] = useState<Position | ''>('');
  const [scenarioFilter, setScenarioFilter] = useState<Scenario | ''>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [complianceFilter, setComplianceFilter] = useState<string>('');
  const [stackFilter, setStackFilter] = useState<StackDepth | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<HandCategory | ''>('');
  const [searchKey, setSearchKey] = useState('');
  
  // Sorting
  const [sortField, setSortField] = useState<'handId' | 'position' | 'handKey' | 'scenario' | 'action' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // View state
  const [showUpload, setShowUpload] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [replayHandId, setReplayHandId] = useState<string | null>(null);
  const { strategyProfile, activeSessionId } = useAppStore();

  // Derived replay data
  const replayHand = replayHandId ? handsMap.get(replayHandId) ?? null : null;
  const replayDecision = replayHandId ? decisions.find((d) => d.handId === replayHandId) ?? null : null;

  const load = useCallback(async () => {
    const [raw, hands, rawTournaments] = await Promise.all([
      getAllHeroDecisions(), 
      getHands(),
      db.tournaments.toArray()
    ]);
    const checked = batchCheckCompliance(raw, strategyProfile);
    setDecisions(checked);
    const hMap = new Map(hands.map((h) => [h.id, h]));
    setHandsMap(hMap);

    if (activeSessionId !== 'all') {
      const tMap = new Map(rawTournaments.map(t => [t.id, t]));
      const dMap = new Map(checked.map(d => [d.handId, d]));
      const sessions = groupIntoSessions(hands, dMap, tMap);
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession) {
        setSessionHandIds(new Set(activeSession.hands.map(h => h.id)));
      } else {
        setSessionHandIds(null);
      }
    } else {
      setSessionHandIds(null);
    }
  }, [strategyProfile, activeSessionId]);

  useEffect(() => {
    load();
  }, [load, activeSessionId]);

  const filtered = useMemo(() => {
    let result = decisions;
    
    if (sessionHandIds) {
      result = result.filter(d => sessionHandIds.has(d.handId));
    }

    if (posFilter) result = result.filter((d) => d.position === posFilter);
    if (scenarioFilter) result = result.filter((d) => d.scenario === scenarioFilter);
    if (actionFilter) result = result.filter((d) => d.action === actionFilter);
    if (complianceFilter === 'compliant') result = result.filter((d) => d.isCompliant);
    if (complianceFilter === 'deviation') result = result.filter((d) => !d.isCompliant && d.deviationType !== null);
    if (stackFilter) result = result.filter((d) => getStackDepth(d.stackBb) === stackFilter);
    if (categoryFilter) result = result.filter((d) => getHandCategory(d.handKey) === categoryFilter);
    if (searchKey) result = result.filter((d) => d.handKey.toLowerCase().includes(searchKey.toLowerCase()));

    result.sort((a, b) => {
      let av: any = a[sortField as keyof HeroDecision];
      let bv: any = b[sortField as keyof HeroDecision];
      
      if (sortField === 'date') {
        av = handsMap.get(a.handId)?.date.getTime() ?? 0;
        bv = handsMap.get(b.handId)?.date.getTime() ?? 0;
      }
      
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [decisions, handsMap, posFilter, scenarioFilter, actionFilter, complianceFilter, stackFilter, categoryFilter, searchKey, sortField, sortAsc]);

  // Reset page to 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [posFilter, scenarioFilter, actionFilter, complianceFilter, stackFilter, categoryFilter, searchKey]);

  const paginated = useMemo(() => {
    return filtered.slice(page * pageSize, (page + 1) * pageSize);
  }, [filtered, page]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleToggleStar = async (handId: string) => {
    const newState = await toggleStarHand(handId);
    setHandsMap(prev => {
      const next = new Map(prev);
      const hand = next.get(handId);
      if (hand) next.set(handId, { ...hand, isStarred: newState });
      return next;
    });
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const handleClearData = async () => {
    await clearAllData();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black font-data text-white uppercase tracking-tight">Hand Archive</h1>
            <div className="h-6 w-px bg-white/10" />
            <button 
              onClick={() => setShowUpload(!showUpload)}
              className={clsx(
                "flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-full transition-all ring-1",
                showUpload ? "bg-white text-black ring-white" : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 hover:bg-emerald-500/20"
              )}
            >
               <UploadIcon size={14} />
               {showUpload ? 'Hide Importer' : 'Import Hands'}
            </button>
         </div>
         <button 
           type="button"
           onClick={() => setShowResetConfirm(true)}
           className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-100 bg-red-900/50 hover:bg-red-800/80 border border-red-900/50 rounded-lg transition-colors"
           title="Delete everything"
         >
            <Trash2 size={14} />
            Reset DB
         </button>
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-10"
          >
            <HandsPageUpload onUploadSuccess={load} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search hand (e.g., AKs)"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>


          <Select value={posFilter} onChange={setPosFilter} options={POSITIONS} placeholder="Position" />
          <Select value={scenarioFilter} onChange={setScenarioFilter} options={SCENARIOS} placeholder="Scenario" />
          <Select value={actionFilter} onChange={setActionFilter} options={['fold', 'raise', 'call', 'check']} placeholder="Pre-flop Action" />
          <Select value={complianceFilter} onChange={setComplianceFilter} options={['compliant', 'deviation']} placeholder="GTO / Compliance" />
          <SelectLabeled value={stackFilter} onChange={setStackFilter} options={STACK_DEPTHS} labels={STACK_DEPTH_LABELS} placeholder="Stack" />
          <SelectLabeled value={categoryFilter} onChange={setCategoryFilter} options={HAND_CATEGORIES} labels={CATEGORY_LABELS} placeholder="Category" />
        </div>

        <div className="flex justify-between items-center mb-3">
          <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
            <Filter size={12} />
            {filtered.length} of {decisions.length} hands
          </p>

          <div className="flex items-center gap-3">
             <button 
               onClick={() => setPage(p => Math.max(0, p - 1))}
               disabled={page === 0}
               className="p-1 rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
               aria-label="Previous page"
             >
               <ChevronLeft size={16} />
             </button>
             <span className="text-xs font-data">Page {page + 1} of {Math.ceil(filtered.length / pageSize) || 1}</span>
             <button 
               onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / pageSize) - 1, p + 1))}
               disabled={page >= Math.ceil(filtered.length / pageSize) - 1}
               className="p-1 rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
               aria-label="Next page"
             >
               <ChevronRight size={16} />
             </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left bg-[var(--color-bg-hover)]">
                  {([
                    ['date', 'Date'],
                    ['handId', 'Hand ID'],
                    ['position', 'Position'],
                    ['handKey', 'Hand'],
                    ['scenario', 'Scenario'],
                    ['action', 'Action'],
                  ] as const).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className="px-3 py-2.5 text-xs text-[var(--color-text-dim)] uppercase tracking-wide cursor-pointer hover:text-[var(--color-text)]"
                    >
                      <span className="flex items-center gap-1">
                        {label} <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-xs text-[var(--color-text-dim)] uppercase tracking-wide">
                    Stack
                  </th>
                  <th className="px-3 py-2.5 text-xs text-[var(--color-text-dim)] uppercase tracking-wide text-right">
                    Review
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((d) => {
                  const h = handsMap.get(d.handId);
                  return (
                    <tr
                      key={d.handId}
                      className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <td className="px-3 py-2 font-data text-xs text-[var(--color-text-dim)] whitespace-nowrap">
                        {h?.date.toLocaleDateString() ?? ''} <span className="text-[10px] opacity-70">{h?.date.toLocaleTimeString().slice(0,5)}</span>
                      </td>
                      <td className="px-3 py-2 font-data text-xs text-[var(--color-text-muted)]">
                        {d.handId.slice(-8)}
                      </td>
                      <td className="px-3 py-2 font-data text-xs text-blue-400 font-bold">{d.position}</td>
                      <td className="px-3 py-2 font-data font-bold tracking-wider">{d.handKey}</td>
                      <td className="px-3 py-2 text-xs text-[var(--color-text-dim)]">{d.scenario}</td>
                      <td className="px-3 py-2">
                        <span className={clsx(
                          'text-xs px-1.5 py-0.5 rounded font-data uppercase tracking-wider',
                          d.action === 'raise' && 'bg-emerald-900/40 text-[var(--color-accent)] border border-[var(--color-accent)]/20',
                          d.action === 'fold' && 'bg-gray-800 text-[var(--color-text-dim)] border border-gray-700',
                          d.action === 'call' && 'bg-blue-900/40 text-[var(--color-info)] border border-[var(--color-info)]/20',
                          d.action === 'check' && 'bg-gray-800 text-[var(--color-text-dim)] border border-gray-700',
                        )}>
                          {d.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-data text-xs text-[var(--color-text-dim)]">
                        <span className={clsx(
                          d.stackBb < 20 && 'text-[var(--color-danger)] font-bold',
                          d.stackBb >= 20 && d.stackBb <= 40 && 'text-[var(--color-warning)] font-bold',
                        )}>
                          {d.stackBb.toFixed(0)}bb
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {d.deviationType ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-900/30 text-[var(--color-danger)] uppercase tracking-wider border border-[var(--color-danger)]/30">
                            {DEVIATION_LABELS[d.deviationType]}
                          </span>
                        ) : d.isCompliant ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-900/30 text-[var(--color-accent)] uppercase tracking-wider border border-[var(--color-accent)]/30">
                            COMPLIANT
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleStar(d.handId)}
                            className={clsx(
                               "p-1.5 rounded-full transition-all ring-1",
                               h?.isStarred 
                                ? "bg-amber-400 text-black ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]" 
                                : "text-[var(--color-text-dim)] hover:text-amber-400 ring-white/5 hover:ring-amber-400/50"
                            )}
                            title={h?.isStarred ? "Featured Hand" : "Star for Review"}
                            aria-label={h?.isStarred ? "Remove star" : "Star hand for review"}
                          >
                            <Star size={12} fill={h?.isStarred ? "currentColor" : "none"} />
                          </button>
                          {h && (
                            <button
                              onClick={() => setReplayHandId(d.handId)}
                              className="bg-white/5 hover:bg-[var(--color-accent)]/20 ring-1 ring-white/5 hover:ring-[var(--color-accent)]/50 p-1.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all"
                              title="In-depth analysis"
                              aria-label="Open hand replay"
                            >
                              <Eye size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
              No hands found.
            </div>
          )}
        </div>
      </div>

      {replayHand && (
        <HandReplay
          hand={replayHand}
          heroDecision={replayDecision}
          onClose={() => setReplayHandId(null)}
        />
      )}

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Critical Action: Reset Database"
        description="Are you absolutely sure you want to DELETE ALL hands and tournaments from your machine? This action is irreversible and all your imported history will be lost."
        confirmLabel="Delete Everything"
        onConfirm={handleClearData}
        onCancel={() => setShowResetConfirm(false)}
        variant="danger"
      />
    </div>
  );
}

// Upload Component Extracted
function HandsPageUpload({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<Array<{
    name: string;
    parsed?: number;
    imported?: number;
    summaryDetail?: { updated: number; created: number; buyInPreserved: number };
    type: 'hand' | 'summary';
    error?: string;
  }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isImporting, setImporting, setTotalHands, heroName, strategyProfile } = useAppStore();

  const [importProgress, setImportProgress] = useState(0);
  const [currentImportFile, setCurrentImportFile] = useState('');
  const [statsFound, setStatsFound] = useState({ hands: 0, summaries: 0, deviations: 0 });

  const processFiles = useCallback(async (files: FileList) => {
    setImporting(true);
    setImportProgress(0);
    setStatsFound({ hands: 0, summaries: 0, deviations: 0 });
    setResults([]);
    
    // Convert FileList to serialized content for the worker
    const fileDataArr: any[] = [];
    for (const file of Array.from(files)) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.txt') || lowerName.endsWith('.json')) {
        const content = await file.text();
        fileDataArr.push({ name: file.name, content });
      } else if (lowerName.endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipFiles = Object.keys(zip.files);
          
          for (const zipFileName of zipFiles) {
            const entry = zip.files[zipFileName]!;
            if (!entry.dir && (zipFileName.toLowerCase().endsWith('.txt') || zipFileName.toLowerCase().endsWith('.json'))) {
              const content = await entry.async('string');
              fileDataArr.push({ name: `${file.name}/${zipFileName}`, content });
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not read this ZIP archive';
          setResults(prev => [...prev, {
            name: file.name,
            type: 'hand',
            error: `ZIP import failed: ${message}`,
          }]);
        }
      } else {
        setResults(prev => [...prev, {
          name: file.name,
          type: 'hand',
          error: 'Unsupported file type. Upload PokerStars/GGPoker .txt files, Open Hand History .json files, or .zip archives.',
        }]);
      }
    }

    if (fileDataArr.length === 0) {
      setImporting(false);
      setCurrentImportFile('');
      setResults(prev => prev.length > 0 ? prev : [{
        name: 'No parseable files found',
        type: 'hand',
        error: 'No .txt/.json hand histories or tournament summaries were found in the selected upload.',
      }]);
      return;
    }

    // Initialize Worker
    const worker = new Worker(new URL('../parser/worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = async (e: MessageEvent) => {
      const { type, progress, filename, handsFound, summariesFound, deviationsFound, hands, error } = e.data;

      if (type === 'PROGRESS') {
        setImportProgress(progress);
        setCurrentImportFile(filename);
        setStatsFound(prev => ({
          hands: prev.hands + (handsFound || 0),
          summaries: prev.summaries + (summariesFound || 0),
          deviations: prev.deviations + (deviationsFound || 0)
        }));
      } else if (type === 'FILE_ERROR') {
        setResults(prev => [...prev, {
          name: filename || 'Unknown file',
          type: 'hand',
          error: error || 'Parser failed on this file. Other files will continue importing.',
        }]);
      } else if (type === 'COMPLETE') {
        // Save results to DB
        const [handImported, summaryImported] = await Promise.all([
           importHands(hands),
           importTournamentSummaries(e.data.summaries || [])
        ]);
        
        // Update store and UI
        const totalCount = await getTotalHandCount();
        setTotalHands(totalCount);
        setImporting(false);
        setResults(prev => [
          ...prev,
          { name: `${fileDataArr.length} files`, type: 'hand', imported: handImported },
          {
            name: `${fileDataArr.length} files`,
            type: 'summary',
            imported: summaryImported.updated + summaryImported.created,
            summaryDetail: summaryImported,
          }
        ]);
        onUploadSuccess();
        
        worker.terminate();
      }
    };

    worker.onerror = (event) => {
      setImporting(false);
      setCurrentImportFile('');
      setResults(prev => [...prev, {
        name: 'Parser worker',
        type: 'hand',
        error: event.message || 'The background parser crashed before completing the import.',
      }]);
      worker.terminate();
    };

    worker.postMessage({
      files: fileDataArr,
      heroName,
      profile: strategyProfile,
      icmStage: 'early' // Default for now
    });
  }, [heroName, strategyProfile, setImporting, setTotalHands, onUploadSuccess]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
  }, [processFiles]);

  const totalHandNodes = results.filter(r => r.type === 'hand' && !r.error);
  const totalSummaryNodes = results.filter(r => r.type === 'summary' && !r.error);
  
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-active)] bg-[var(--color-bg-base)]',
        )}
      >
        <UploadIcon
          size={32}
          className={clsx('mx-auto mb-3', dragOver ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-dim)]')}
        />
        <p className="text-[var(--color-text)] font-semibold mb-1">
          Drag and Drop Poker Files
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Supports Hand Histories, Summaries, OHH JSON and ZIPs (.txt, .json, .zip)
        </p>
      </div>

      <input ref={fileRef} type="file" accept=".txt,.json,.zip" multiple onChange={onFileSelect} className="hidden" />

      <AnimatePresence>
        {isImporting && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 space-y-4"
          >
            <div className="flex justify-between items-end mb-1">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                  Processing History...
                </p>
                <p className="text-[10px] text-[var(--color-text-dim)] font-data truncate max-w-[300px]">
                  File: {currentImportFile}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-data font-bold text-[var(--color-accent)]">{Math.round(importProgress)}%</p>
              </div>
            </div>

            {/* Premium Progress Bar */}
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <motion.div 
                className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[#4ade80] shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                initial={{ width: 0 }}
                animate={{ width: `${importProgress}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-data text-[var(--color-text-muted)] uppercase tracking-wider">
                <div className="flex gap-4">
                  <span>Hands: <span className="text-white">{statsFound.hands}</span></span>
                  <span>Summaries: <span className="text-white">{statsFound.summaries}</span></span>
                  <span>Deviations: <span className="text-[var(--color-danger)]">{statsFound.deviations}</span></span>
                </div>
               <span>Do not close this page</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {results.length > 0 && !isImporting && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-sm space-y-2">
           <div className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
             <CheckCircle size={16} className="text-[var(--color-accent)]" />
             Processing Completed
           </div>
           {results.some(r => r.error) && (
             <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs font-semibold text-red-200">
               Some files need attention. Valid files were still imported when possible.
             </div>
           )}
           <div className="text-[var(--color-text-dim)] text-xs space-y-1">
             <div>
               {totalHandNodes.reduce((acc, curr) => acc + (curr.imported ?? 0), 0)} New Hands
             </div>
             {totalSummaryNodes.map((r, i) => r.summaryDetail && (
               <div key={i}>
                 Summaries: {r.summaryDetail.updated} updated, {r.summaryDetail.created} created
                 {r.summaryDetail.buyInPreserved > 0 && (
                   <span className="text-[var(--color-warning,#ffaa00)]">
                     {' '}({r.summaryDetail.buyInPreserved} buy-in{r.summaryDetail.buyInPreserved !== 1 ? 's' : ''} preserved from hand history)
                   </span>
                 )}
               </div>
             ))}
             {results.filter(r => r.error).map((r, i) => (
               <div key={`error-${i}`} className="text-red-300">
                 {r.name}: {r.error}
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T | '';
  onChange: (val: T | '') => void;
  options: readonly T[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | '')}
      className="px-3 py-2 text-sm bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function SelectLabeled<T extends string>({
  value,
  onChange,
  options,
  labels,
  placeholder,
}: {
  value: T | '';
  onChange: (val: T | '') => void;
  options: readonly T[];
  labels: Record<T, string>;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | '')}
      className="px-3 py-2 text-sm bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labels[opt]}
        </option>
      ))}
    </select>
  );
}
