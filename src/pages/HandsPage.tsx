import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Filter, Upload as UploadIcon, Trash2 } from 'lucide-react';
import { useAppStore } from '../data/appStore';
import { getAllHeroDecisions, getHands, clearAllData, toggleStarHand, db } from '../data/store';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import {
  buildUngradedScenarioSummary,
  isUngradedDecision,
} from '../analysis/ungradedScenarios';
import { groupIntoSessions } from '../data/sessions';
import { HandReplay } from '../components/hands/HandReplay';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import type { Hand } from '../types/hand';
import type { HeroDecision, Position, Scenario } from '../types/analysis';
import type { SortingState } from '@tanstack/react-table';

// Extracted Components
import { HandsUpload } from '../components/hands/HandsUpload';
import { HandsFilters } from '../components/hands/HandsFilters';
import type { StackDepth, HandCategory, ComplianceFilter } from '../components/hands/HandsFilters';
import { HandsTable } from '../components/hands/HandsTable';

function getStackDepth(bb: number): StackDepth {
  if (bb > 40) return 'deep';
  if (bb >= 20) return 'medium';
  return 'short';
}

export function getHandCategory(handKey: string): HandCategory {
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
    return 'suited-gappers';
  }
  const broadways = new Set(['A', 'K', 'Q', 'J', 'T']);
  if (broadways.has(handKey[0]!) && broadways.has(handKey[1]!)) return 'broadway';
  return 'offsuit';
}

function formatScenarioLabel(scenario: Scenario): string {
  return scenario.replace(/_/g, ' ');
}

export function shouldOpenImporterFromLocation(search: string, hash = ''): boolean {
  const params = new URLSearchParams(search);
  const panel = params.get('panel') ?? params.get('view');
  return panel === 'data-health'
    || panel === 'import'
    || panel === 'upload'
    || hash === '#data-health'
    || hash === '#import';
}

export function HandsPage() {
  const location = useLocation();
  const [decisions, setDecisions] = useState<HeroDecision[]>([]);
  const [handsMap, setHandsMap] = useState<Map<string, Hand>>(new Map());
  const [sessionHandIds, setSessionHandIds] = useState<Set<string> | null>(null);

  // Filters State
  const [posFilter, setPosFilter] = useState<Position | ''>('');
  const [scenarioFilter, setScenarioFilter] = useState<Scenario | ''>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter | ''>('');
  const [stackFilter, setStackFilter] = useState<StackDepth | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<HandCategory | ''>('');
  const [searchKey, setSearchKey] = useState('');

  // Sorting State for TanStack Table
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }
  ]);

  // View state
  const [showUpload, setShowUpload] = useState(() => shouldOpenImporterFromLocation(location.search, location.hash));
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [replayHandId, setReplayHandId] = useState<string | null>(null);
  const { strategyProfile, activeSessionId } = useAppStore();

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

  useEffect(() => {
    if (shouldOpenImporterFromLocation(location.search, location.hash)) {
      setShowUpload(true);
    }
  }, [location.search, location.hash]);

  const scopedDecisions = useMemo(() => {
    if (!sessionHandIds) return decisions;
    return decisions.filter((d) => sessionHandIds.has(d.handId));
  }, [decisions, sessionHandIds]);

  const ungradedScenarioSummary = useMemo(() => buildUngradedScenarioSummary(scopedDecisions), [scopedDecisions]);

  const filtered = useMemo(() => {
    let result = scopedDecisions;

    if (posFilter) result = result.filter((d) => d.position === posFilter);
    if (scenarioFilter) result = result.filter((d) => d.scenario === scenarioFilter);
    if (actionFilter) result = result.filter((d) => d.action === actionFilter);
    if (complianceFilter === 'compliant') result = result.filter((d) => d.isCompliant && !isUngradedDecision(d));
    if (complianceFilter === 'deviation') result = result.filter((d) => !d.isCompliant && d.deviationType !== null);
    if (complianceFilter === 'not-graded') result = result.filter((d) => isUngradedDecision(d));
    if (stackFilter) result = result.filter((d) => getStackDepth(d.stackBb) === stackFilter);
    if (categoryFilter) result = result.filter((d) => getHandCategory(d.handKey) === categoryFilter);
    if (searchKey) result = result.filter((d) => d.handKey.toLowerCase().includes(searchKey.toLowerCase()));

    return result;
  }, [scopedDecisions, posFilter, scenarioFilter, actionFilter, complianceFilter, stackFilter, categoryFilter, searchKey]);

  const totalUngraded = ungradedScenarioSummary.reduce((sum, item) => sum + item.count, 0);

  const handleToggleStar = async (handId: string) => {
    const newState = await toggleStarHand(handId);
    setHandsMap(prev => {
      const next = new Map(prev);
      const hand = next.get(handId);
      if (hand) next.set(handId, { ...hand, isStarred: newState });
      return next;
    });
  };

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
            <HandsUpload onUploadSuccess={load} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <HandsFilters
          searchKey={searchKey} setSearchKey={setSearchKey}
          posFilter={posFilter} setPosFilter={setPosFilter}
          scenarioFilter={scenarioFilter} setScenarioFilter={setScenarioFilter}
          actionFilter={actionFilter} setActionFilter={setActionFilter}
          complianceFilter={complianceFilter} setComplianceFilter={setComplianceFilter}
          stackFilter={stackFilter} setStackFilter={setStackFilter}
          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
        />

        {ungradedScenarioSummary.length > 0 && (
          <section
            data-testid="ungraded-scenario-summary"
            className="compartment border-[var(--warn-line)] bg-[var(--warn-soft)] p-4"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--warn)]">Not graded review queue</p>
                <p className="mt-1 text-sm text-[var(--fg-dim)]">
                  {totalUngraded} hand{totalUngraded === 1 ? '' : 's'} are excluded from range compliance because the engine needs pot odds, ICM, multiway, or 3-bet-defense data before grading.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScenarioFilter('');
                  setComplianceFilter('not-graded');
                }}
                className="w-fit rounded-full border border-[var(--warn-line)] bg-[var(--ink-2)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--warn)] hover:bg-[var(--warn-soft)]"
              >
                Filter all not graded
              </button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {ungradedScenarioSummary.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.reason}
                  data-testid={`ungraded-scenario-${item.scenario}`}
                  onClick={() => {
                    setScenarioFilter(item.scenario);
                    setComplianceFilter('not-graded');
                  }}
                  className={clsx(
                    'rounded-xl border p-3 text-left transition-colors',
                    scenarioFilter === item.scenario
                      ? 'border-[var(--warn)] bg-[var(--warn-soft)] text-[var(--fg)]'
                      : 'border-[var(--hairline)] bg-[var(--ink-2)] hover:border-[var(--warn-line)] hover:bg-[var(--ink-3)]',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-wide text-[var(--fg)]">{formatScenarioLabel(item.scenario)}</span>
                    <span className="rounded-full bg-[var(--warn-soft)] px-2 py-0.5 font-data text-xs font-bold text-[var(--warn)]">{item.count}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--fg-muted)]">
                    {item.folded} folded · {item.continued} continued. Review as a study/export spot, not a leak verdict.
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-between items-center mb-3">
          <p className="text-xs text-[var(--fg-muted)] flex items-center gap-1">
            <Filter size={12} />
            {filtered.length} of {scopedDecisions.length} hands
          </p>
        </div>

        <HandsTable
          decisions={filtered}
          handsMap={handsMap}
          onToggleStar={handleToggleStar}
          onReplayHand={setReplayHandId}
          sorting={sorting}
          onSortingChange={setSorting}
        />
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
