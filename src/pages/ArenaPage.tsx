import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Zap, RotateCcw, ChevronRight, AlertCircle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../data/appStore';
import { getAllHeroDecisions, getParsedHandForHandId } from '../data/store';
import { PokerCard } from '../components/shared/Card';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { checkCompliance } from '../analysis/rangeChecker';
import { buildSpotPacketFromParsedHand } from '../analysis/spotPacket';
import { recordStudyPacketReview, studyPacketNextDueLabel } from '../analysis/studyPacketProgress';
import type { HeroDecision } from '../types/analysis';
import type { StrategyProfile } from '../data/strategyProfiles';
import type { SpotPacket, SpotPacketLegalAction, SpotPacketWarning } from '../analysis/spotPacket';

// Types for the Trainer
type DrillType = 'fault_fixer' | 'rfi_master' | 'cbet_clinic' | 'study_queue';
type PreflopAction = 'fold' | 'raise' | 'call' | 'check';
type CbetAction = 'check' | 'bet';
type TrainerAction = PreflopAction | CbetAction | 'all_in';
type FeedbackStatus = 'correct' | 'deviation' | 'review';
type ActionColor = 'gray' | 'blue' | 'emerald' | 'amber' | 'rose';

interface ActionOption {
  id: string;
  label: string;
  action: TrainerAction;
  color: ActionColor;
  meta?: string;
}

interface DrillFeedback {
  status: FeedbackStatus;
  note: string;
}

interface DrillState {
  isActive: boolean;
  type: DrillType | null;
  currentDecision: HeroDecision | null;
  currentPacket: SpotPacket | null;
  sessionHandIds: string[];
  sessionIndex: number;
  score: { correct: number; total: number };
  lastFeedback: DrillFeedback | null;
}

interface StudyQueueSessionSummary {
  reviewedCount: number;
  totalCount: number;
  correct: number;
  graded: number;
  lastHandId: string | null;
  nextDueLabel: string;
}

const DRILL_LABELS: Record<DrillType, string> = {
  fault_fixer: 'Fault Fixer',
  rfi_master: 'RFI Master',
  cbet_clinic: 'C-bet Clinic',
  study_queue: 'Study Queue spot',
};

const PREFLOP_ACTIONS: ActionOption[] = [
  { id: 'fold', label: 'Fold', action: 'fold', color: 'gray' },
  { id: 'call', label: 'Call', action: 'call', color: 'blue' },
  { id: 'raise', label: 'Raise', action: 'raise', color: 'emerald' },
];

const CBET_ACTIONS: ActionOption[] = [
  { id: 'check', label: 'Check', action: 'check', color: 'gray' },
  { id: 'cbet', label: 'C-bet', action: 'bet', color: 'emerald' },
];

const STUDY_PACKET_WARNING_LABELS: Partial<Record<SpotPacketWarning, string>> = {
  not_solver_backed: 'not solver-backed',
  trainer_scoring_not_included: 'trainer scoring omitted',
  legal_action_menu_inferred: 'legal menu inferred',
  source_summary_missing: 'summary missing',
  icm_risk_context_estimated: 'ICM risk estimated',
  missing_payouts: 'payouts missing',
  missing_field_stack_distribution: 'field stacks missing',
  bb_multiway_defense_context: 'BB multiway caveat',
};

const LEGAL_ACTION_COLOR: Record<SpotPacketLegalAction['action'], ActionColor> = {
  fold: 'gray',
  check: 'gray',
  call: 'blue',
  bet: 'amber',
  raise: 'emerald',
  all_in: 'rose',
};

const LEGAL_ACTION_SOURCE_LABEL: Record<SpotPacketLegalAction['source'], string> = {
  observed_hero_action: 'observed',
  scenario_inferred: 'inferred',
  trainer_config: 'trainer config',
};

const STUDY_PACKET_WARNING_PRIORITY: SpotPacketWarning[] = [
  'not_solver_backed',
  'trainer_scoring_not_included',
  'legal_action_menu_inferred',
  'bb_multiway_defense_context',
  'icm_risk_context_estimated',
  'missing_payouts',
  'missing_field_stack_distribution',
];

interface StudyQueueRouteRequest {
  handId: string | null;
  handIds: string[];
  packetIds: string[];
}

interface GetDrillPoolOptions {
  handId?: string | null;
  handIds?: string[];
}

function decodeQueryComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function rawQueryParam(search: string, names: readonly string[]): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) return null;

  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [rawKey, ...rawValueParts] = pair.split('=');
    const key = decodeQueryComponent(rawKey ?? '');
    if (names.includes(key)) return rawValueParts.join('=');
  }

  return null;
}

function parseEncodedDelimitedParam(value: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => decodeQueryComponent(entry).trim())
    .filter(Boolean);
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function requestedStudyQueueRoute(): StudyQueueRouteRequest {
  if (typeof window === 'undefined') {
    return { handId: null, handIds: [], packetIds: [] };
  }
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const requestedDrill = params.get('drill') ?? params.get('source');
  if (requestedDrill !== 'study-queue') {
    return { handId: null, handIds: [], packetIds: [] };
  }
  const handId = params.get('handId') ?? params.get('reviewHand');
  const handIds = uniqueNonEmpty([
    handId ?? '',
    ...parseEncodedDelimitedParam(rawQueryParam(search, ['handIds'])),
  ]);
  return {
    handId: handIds[0] ?? null,
    handIds,
    packetIds: uniqueNonEmpty(parseEncodedDelimitedParam(rawQueryParam(search, ['packetIds']))),
  };
}

function buildStudyQueueSessionSummary(drill: DrillState): StudyQueueSessionSummary {
  const reviewedCount = Math.max(0, Math.min(drill.sessionIndex + 1, drill.sessionHandIds.length || drill.sessionIndex + 1));
  const totalCount = drill.sessionHandIds.length || reviewedCount;
  return {
    reviewedCount,
    totalCount,
    correct: drill.score.correct,
    graded: drill.score.total,
    lastHandId: drill.currentDecision?.handId ?? null,
    nextDueLabel: studyPacketNextDueLabel(drill.currentPacket),
  };
}

function handReplayPathForStudySummary(summary: StudyQueueSessionSummary | null): string | null {
  if (!summary?.lastHandId) return null;
  return `/hands?panel=spot-packet&reviewHand=${encodeURIComponent(summary.lastHandId)}#spot-packet`;
}

export function getDrillPool(
  type: DrillType,
  allDecisions: HeroDecision[],
  strategyProfile: StrategyProfile,
  options: GetDrillPoolOptions = {},
): HeroDecision[] {
  if (type === 'study_queue') {
    const requestedHandIds = options.handIds?.length
      ? uniqueNonEmpty(options.handIds)
      : options.handId
        ? [options.handId]
        : [];
    if (requestedHandIds.length === 0) return [];

    const decisionByHandId = new Map<string, HeroDecision>();
    for (const decision of allDecisions) {
      if (!decisionByHandId.has(decision.handId)) decisionByHandId.set(decision.handId, decision);
    }
    return requestedHandIds
      .map((handId) => decisionByHandId.get(handId))
      .filter((decision): decision is HeroDecision => Boolean(decision));
  }

  if (type === 'fault_fixer') {
    return allDecisions.filter(d => {
      const result = checkCompliance(d, strategyProfile);
      return result && !result.isCompliant;
    });
  }

  if (type === 'rfi_master') {
    return allDecisions.filter(d => d.scenario === 'RFI' || d.scenario === 'BLIND_WAR');
  }

  return allDecisions.filter(d => d.cbetOpportunity);
}

export function shouldCbet(decision: HeroDecision): boolean {
  if (decision.postflopActions?.some(action => action.spot === 'MISSED_CBET')) {
    return true;
  }
  return decision.cbetMade;
}

export function isCbetActionCorrect(decision: HeroDecision, action: CbetAction): boolean {
  return action === 'bet' ? shouldCbet(decision) : !shouldCbet(decision);
}

export function getDisplayCards(handKey: string | undefined): [string, string] {
  const key = handKey && handKey.length >= 2 ? handKey : 'AA';
  const r1 = key[0] ?? 'A';
  const r2 = key[1] ?? r1;
  const suited = key.endsWith('s');
  return [`${r1}s`, suited ? `${r2}s` : `${r2}h`];
}

function pickRandomDecision(pool: HeroDecision[]): HeroDecision | null {
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function formatSourceValue(value: string): string {
  return value.replace(/_/g, ' ');
}

function packetWarningLabel(warning: SpotPacketWarning): string {
  return STUDY_PACKET_WARNING_LABELS[warning] ?? formatSourceValue(warning);
}

function visiblePacketWarnings(packet: SpotPacket): string {
  const prioritized = [
    ...STUDY_PACKET_WARNING_PRIORITY.filter((warning) => packet.warnings.includes(warning)),
    ...packet.warnings.filter((warning) => !STUDY_PACKET_WARNING_PRIORITY.includes(warning)),
  ];
  const visible = prioritized.slice(0, 4).map(packetWarningLabel);
  const extraCount = prioritized.length - visible.length;
  return extraCount > 0 ? `${visible.join(' · ')} · +${extraCount} more` : visible.join(' · ');
}

function studyPacketActionOptions(packet: SpotPacket | null): ActionOption[] | null {
  if (!packet?.trainerPrompt.legalActions.length) return null;
  return packet.trainerPrompt.legalActions.map((legalAction) => ({
    id: legalAction.id,
    label: legalAction.label,
    action: legalAction.action,
    color: LEGAL_ACTION_COLOR[legalAction.action],
    meta: LEGAL_ACTION_SOURCE_LABEL[legalAction.source],
  }));
}

async function loadStudyQueuePacket(decision: HeroDecision): Promise<SpotPacket | null> {
  const parsedHand = await getParsedHandForHandId(decision.handId);
  return parsedHand ? buildSpotPacketFromParsedHand(parsedHand, decision) : null;
}

export function ArenaPage() {
  const [drill, setDrill] = useState<DrillState>({
    isActive: false,
    type: null,
    currentDecision: null,
    currentPacket: null,
    sessionHandIds: [],
    sessionIndex: 0,
    score: { correct: 0, total: 0 },
    lastFeedback: null,
  });
  const drillRef = useRef(drill);
  const [completedStudySession, setCompletedStudySession] = useState<StudyQueueSessionSummary | null>(null);

  const { strategyProfile } = useAppStore();
  const requestedStudyQueue = useMemo(() => requestedStudyQueueRoute(), []);
  const requestedStudyHandId = requestedStudyQueue.handId;
  const requestedStudyHandIds = requestedStudyQueue.handIds;
  const requestedStudyRouteKey = requestedStudyHandIds.join('|');
  const [allDecisions, setAllDecisions] = useState<HeroDecision[]>([]);
  const [decisionsLoaded, setDecisionsLoaded] = useState(false);
  const [emptyDrillType, setEmptyDrillType] = useState<DrillType | null>(null);
  const [missingStudyQueueHandId, setMissingStudyQueueHandId] = useState<string | null>(null);
  const [autoStartedStudyQueueRouteKey, setAutoStartedStudyQueueRouteKey] = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    drillRef.current = drill;
  }, [drill]);

  // Load pool of decisions to draw from
  useEffect(() => {
    async function load() {
      const data = await getAllHeroDecisions();
      setAllDecisions(data);
      setDecisionsLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const activePool = useMemo(
    () => drill.type
      ? getDrillPool(
        drill.type,
        allDecisions,
        strategyProfile,
        {
          handId: drill.type === 'study_queue' ? drill.currentDecision?.handId ?? requestedStudyHandId : null,
          handIds: drill.type === 'study_queue'
            ? (drill.sessionHandIds.length > 0 ? drill.sessionHandIds : requestedStudyHandIds)
            : [],
        },
      )
      : [],
    [allDecisions, drill.currentDecision?.handId, drill.sessionHandIds, drill.type, requestedStudyHandId, requestedStudyHandIds, strategyProfile],
  );

  useEffect(() => {
    if (requestedStudyHandIds.length === 0 || !decisionsLoaded) return;
    if (autoStartedStudyQueueRouteKey === requestedStudyRouteKey) return;

    let isCancelled = false;

    async function autoStartStudyQueueSpot() {
      const pool = getDrillPool('study_queue', allDecisions, strategyProfile, { handIds: requestedStudyHandIds });
      const first = pool[0] ?? null;
      setAutoStartedStudyQueueRouteKey(requestedStudyRouteKey);

      if (!first) {
        setMissingStudyQueueHandId(requestedStudyHandId ?? requestedStudyHandIds[0] ?? 'requested Study Queue spot');
        return;
      }

      const currentPacket = await loadStudyQueuePacket(first);
      if (isCancelled) return;

      setMissingStudyQueueHandId(null);
      setCompletedStudySession(null);
      setDrill({
        isActive: true,
        type: 'study_queue',
        currentDecision: first,
        currentPacket,
        sessionHandIds: pool.map((decision) => decision.handId),
        sessionIndex: 0,
        score: { correct: 0, total: 0 },
        lastFeedback: null,
      });
    }

    void autoStartStudyQueueSpot();
    return () => {
      isCancelled = true;
    };
  }, [allDecisions, autoStartedStudyQueueRouteKey, decisionsLoaded, requestedStudyHandId, requestedStudyHandIds, requestedStudyRouteKey, strategyProfile]);

  const startDrill = useCallback((type: DrillType) => {
    const pool = getDrillPool(type, allDecisions, strategyProfile, {
      handId: type === 'study_queue' ? requestedStudyHandId : null,
      handIds: type === 'study_queue' ? requestedStudyHandIds : [],
    });
    const first = type === 'study_queue' ? pool[0] ?? null : pickRandomDecision(pool);
    if (!first) {
      setEmptyDrillType(type);
      return;
    }

    async function start(decision: HeroDecision) {
      const currentPacket = type === 'study_queue' ? await loadStudyQueuePacket(decision) : null;
      setCompletedStudySession(null);
      setDrill({
        isActive: true,
        type,
        currentDecision: decision,
        currentPacket,
        sessionHandIds: type === 'study_queue' ? pool.map((entry) => entry.handId) : [],
        sessionIndex: 0,
        score: { correct: 0, total: 0 },
        lastFeedback: null,
      });
    }

    void start(first);
  }, [allDecisions, requestedStudyHandId, requestedStudyHandIds, strategyProfile]);

  const nextHand = useCallback(() => {
    const currentDrill = drillRef.current;

    if (currentDrill.type === 'study_queue') {
      const nextIndex = currentDrill.sessionIndex + 1;
      const next = activePool[nextIndex] ?? null;
      if (!next) {
        setCompletedStudySession(buildStudyQueueSessionSummary(currentDrill));
        setDrill(prev => ({
          ...prev,
          isActive: false,
          currentDecision: null,
          currentPacket: null,
          sessionHandIds: [],
          sessionIndex: 0,
          lastFeedback: null,
        }));
        return;
      }

      async function advanceStudyQueue(decision: HeroDecision, sessionIndex: number) {
        const currentPacket = await loadStudyQueuePacket(decision);
        setDrill(prev => ({
          ...prev,
          currentDecision: decision,
          currentPacket,
          sessionIndex,
          lastFeedback: null,
        }));
      }

      void advanceStudyQueue(next, nextIndex);
      return;
    }

    const next = pickRandomDecision(activePool);
    if (!next) {
      setDrill(prev => ({ ...prev, isActive: false, currentDecision: null, currentPacket: null, sessionHandIds: [], sessionIndex: 0, lastFeedback: null }));
      if (drill.type) {
        setEmptyDrillType(drill.type);
      }
      return;
    }

    async function advance(decision: HeroDecision) {
      const currentPacket = drill.type === 'study_queue' ? await loadStudyQueuePacket(decision) : null;
      setDrill(prev => ({
        ...prev,
        currentDecision: decision,
        currentPacket,
        lastFeedback: null,
      }));
    }

    void advance(next);
  }, [activePool, drill.type]);

  const handleAction = (action: TrainerAction) => {
    if (!drill.currentDecision) return;

    let userIsCorrect = true;
    let note = 'Good. This matches the local baseline check.';
    let feedbackStatus: FeedbackStatus = 'correct';
    let shouldRecordScore = true;

    if (drill.type === 'cbet_clinic') {
      if (action !== 'bet' && action !== 'check') return;
      userIsCorrect = isCbetActionCorrect(drill.currentDecision, action);
      feedbackStatus = userIsCorrect ? 'correct' : 'deviation';
      const correctActionStr = shouldCbet(drill.currentDecision) ? 'C-BET' : 'CHECK';
      note = userIsCorrect
        ? action === 'bet'
          ? 'Correct. This spot wants a continuation bet.'
          : 'Correct. Checking is acceptable in this spot.'
        : `Error! The postflop model prefers ${correctActionStr}.`;
    } else {
      if (action === 'bet' && drill.type !== 'study_queue') return;

      if (action === 'all_in' || action === 'bet') {
        shouldRecordScore = false;
        feedbackStatus = 'review';
        note = action === 'all_in'
          ? 'Review-only all-in option: the SpotPacket legal menu captures this action, but Arena does not grade all-in ranges, solver EV, or trainer answer buckets. Use the study packet/export boundary for external review.'
          : 'Review-only bet option: the SpotPacket legal menu captures this action, but this Arena route does not grade postflop bet sizes, solver EV, or trainer answer buckets. Use the study packet/export boundary for external review.';
      } else {

        const testDecision = { ...drill.currentDecision, action };
        const result = checkCompliance(testDecision, strategyProfile);

        if (drill.type === 'study_queue' && result === null) {
          shouldRecordScore = false;
          feedbackStatus = 'review';
          note = 'Review-only Study Queue spot: no local range rule grades this exact action. Use Hand Replay or an external study packet; no score, solver EV, or trainer answer is stored.';
        } else {
          userIsCorrect = result?.isCompliant ?? true;
          feedbackStatus = userIsCorrect ? 'correct' : 'deviation';

          let correctActionStr = 'the standard move';
          if (!userIsCorrect) {
            const actions: PreflopAction[] = ['fold', 'raise', 'call', 'check'];
            const found = actions.find(a => checkCompliance({ ...drill.currentDecision!, action: a }, strategyProfile)?.isCompliant);
            if (found) correctActionStr = found.toUpperCase();
          }

          if (drill.type === 'study_queue') {
            note = userIsCorrect
              ? 'Matches the local rule/proxy check for this imported Study Queue spot. No solver EV or trainer answer is attached.'
              : `The local rule/proxy check prefers ${correctActionStr}. Treat this as a review prompt, not solver-backed EV or trainer scoring.`;
          } else {
            note = userIsCorrect
              ? 'Good. This matches the local baseline check.'
              : `The local reference check prefers ${correctActionStr}.`;
          }
        }
      }
    }

    if (drill.type === 'study_queue' && drill.currentPacket) {
      recordStudyPacketReview(drill.currentPacket);
    }

    setDrill(prev => ({
      ...prev,
      score: shouldRecordScore
        ? {
          correct: prev.score.correct + (userIsCorrect ? 1 : 0),
          total: prev.score.total + 1
        }
        : prev.score,
      lastFeedback: {
        status: feedbackStatus,
        note,
      }
    }));

    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      nextHand();
    }, 2000);
  };

  const clearEmptyDrillDialog = () => setEmptyDrillType(null);
  const clearMissingStudyQueueDialog = () => setMissingStudyQueueHandId(null);
  const emptyDrillLabel = emptyDrillType ? DRILL_LABELS[emptyDrillType] : 'this drill';
  const completedHandReplayPath = handReplayPathForStudySummary(completedStudySession);

  if (!drill.isActive) {
    return (
      <>
        <div className="max-w-4xl mx-auto py-12">
          <header className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block p-3 border border-[var(--sig-line)] bg-[var(--sig-soft)] rounded-2xl mb-4"
            >
              <Zap size={40} className="text-[var(--sig)]" />
            </motion.div>
            <span className="kick sig block mb-2">The Arena</span>
            <h1 className="text-4xl font-bold text-[var(--fg)] mb-2">Turn theory into instinct.</h1>
            <p className="lede text-[var(--fg-dim)]">Drill your flaws.</p>
          </header>

          {completedStudySession && (
            <section
              className="mb-8 overflow-hidden rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-5 shadow-2xl shadow-emerald-950/10"
              data-testid="arena-study-session-complete"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="kick sig mb-2">Study Queue session complete</p>
                  <h2 className="text-2xl font-black text-[var(--fg)]">
                    {completedStudySession.reviewedCount}/{completedStudySession.totalCount} packets reviewed
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--fg-dim)]">
                    {completedStudySession.nextDueLabel} Graded score: {completedStudySession.correct}/{completedStudySession.graded}; review-only all-in or unsupported spots do not change the score.
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/70">
                    Browser-local progress only. No solver EV, trainer answer, trainer score, raw hand text, or villain name was stored.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-emerald-400"
                    data-testid="arena-session-dashboard-link"
                  >
                    Return to dashboard <ChevronRight size={13} />
                  </Link>
                  {completedHandReplayPath && (
                    <Link
                      to={completedHandReplayPath}
                      className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/20"
                      data-testid="arena-session-hand-replay-link"
                    >
                      Open last packet <ChevronRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DrillCard
              title="Fault Fixer"
              desc="Replay hands where you made actual deviations."
              icon={Target}
              color="red"
              onClick={() => startDrill('fault_fixer')}
            />
            <DrillCard
              title="RFI Master"
              desc="Master pot opening across all positions."
              icon={Zap}
              color="emerald"
              onClick={() => startDrill('rfi_master')}
            />
            <DrillCard
              title="C-bet Clinic"
              desc="Perfect your flop aggression."
              icon={Trophy}
              color="blue"
              onClick={() => startDrill('cbet_clinic')}
            />
          </div>
        </div>

        <ConfirmDialog
          isOpen={emptyDrillType !== null}
          title="Not enough data"
          description={`No ${emptyDrillLabel} spots are available yet. Import more hands to train this drill.`}
          confirmLabel="Got it"
          cancelLabel="Close"
          onConfirm={clearEmptyDrillDialog}
          onCancel={clearEmptyDrillDialog}
          variant="info"
        />
        <ConfirmDialog
          isOpen={missingStudyQueueHandId !== null}
          title="Study Queue spot unavailable"
          description="The requested Study Queue hand is not in the local Arena decision store. Rebuild the Study Queue from current imports or open the packet in Hand Replay first."
          confirmLabel="Got it"
          cancelLabel="Close"
          onConfirm={clearMissingStudyQueueDialog}
          onCancel={clearMissingStudyQueueDialog}
          variant="info"
        />
      </>
    );
  }

  const actionOptions = drill.type === 'cbet_clinic'
    ? CBET_ACTIONS
    : studyPacketActionOptions(drill.currentPacket) ?? PREFLOP_ACTIONS;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[var(--ink)] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--sig)]/5 blur-[120px] rounded-full" />
      </div>

      <header className="flex justify-between items-center z-10 p-4 border-b border-[var(--hairline)] bg-[var(--ink-2)] backdrop-blur-sm">
        <div className="flex items-center gap-4">
           <button 
             onClick={() => {
               setCompletedStudySession(null);
               setDrill(prev => ({ ...prev, isActive: false }));
             }}
             className="p-2 hover:bg-[var(--accent-soft)] rounded-lg text-[var(--fg-dim)] hover:text-[var(--accent)]"
             type="button"
             aria-label="Exit drill"
           >
             <RotateCcw size={18} />
           </button>
           <div className="h-4 w-px bg-[var(--hairline)]" />
           <span className="kick sig">{drill.type ? DRILL_LABELS[drill.type] : 'Drill'}</span>
           {drill.type === 'study_queue' && (
             <span
               className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-100"
               data-testid="arena-study-queue-source"
             >
               Imported Study Queue packet · study-only{drill.sessionHandIds.length > 1 ? ` · packet ${drill.sessionIndex + 1}/${drill.sessionHandIds.length}` : ''}
             </span>
           )}
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="kick text-[var(--fg-muted)]">Score</p>
              <p className="font-mono font-bold text-[var(--accent)]">{drill.score.correct} / {drill.score.total}</p>
           </div>
           <div className="h-8 w-px bg-[var(--hairline)]" />
           <div className="px-3 py-1 bg-[var(--ink-2)] border border-[var(--hairline)] rounded-full">
              <span className="text-xs font-mono">{drill.type === 'study_queue' ? 'STUDY' : strategyProfile === 'game_plan' ? 'BASE' : 'ADV'}</span>
           </div>
        </div>
      </header>

      {/* Main Training Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        
        {/* Animated Table */}
        <div className="w-full max-w-4xl aspect-[2/1] relative flex items-center justify-center">
            {/* Table Surface */}
            <div className="absolute inset-0 bg-[var(--ink-2)] rounded-[180px] border-[12px] border-[var(--ink-3)] shadow-[0_40px_100px_rgba(0,0,0,0.6),inset_0_0_80px_rgba(0,0,0,0.4)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--sig-soft)] to-transparent" />
                <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(45deg,var(--accent-line)_0_1px,transparent_1px_8px)]" />
            </div>

            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 flex flex-col items-center">
               <div className="px-4 py-1.5 bg-[var(--ink)] border border-[var(--hairline)] rounded-full shadow-lg backdrop-blur-md">
                 <span className="kick text-[var(--fg)]">
                    {drill.currentDecision?.scenario.replace('_', ' ')}
                 </span>
               </div>
               <div className="mt-2 text-[10px] text-[var(--accent)] font-bold tracking-tighter uppercase opacity-80">
                  Stage: {drill.type === 'cbet_clinic' ? 'Flop' : 'Pre-flop'}
               </div>
            </div>

            {/* Hero Seat */}
            <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
                <AnimatePresence mode='wait'>
                    <motion.div 
                      key={drill.currentDecision?.handId}
                      initial={{ y: 20, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: -20, opacity: 0, scale: 0.9 }}
                      className="flex gap-2"
                    >
                        {(() => {
                           const [c1, c2] = getDisplayCards(drill.currentDecision?.handKey);
                           return (
                             <>
                               <PokerCard card={c1} size="lg" className="shadow-2xl" />
                               <PokerCard card={c2} size="lg" className="shadow-2xl" />
                             </>
                           );
                        })()}
                    </motion.div>
                </AnimatePresence>
                
                <div className="mt-4 px-6 py-2 bg-[var(--accent-soft)] border border-[var(--accent-line)] rounded-xl backdrop-blur-md shadow-lg">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                      <span className="text-sm font-bold text-[var(--fg)] font-mono">
                         {drill.currentDecision?.position}
                      </span>
                      <span className="text-xs text-[var(--accent)] font-mono">
                         {drill.currentDecision?.stackBb.toFixed(0)}bb
                      </span>
                   </div>
                </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-40">
               <p className="kick text-[var(--fg-dim)] mb-1">Pot</p>
               <p className="text-2xl font-mono font-bold text-[var(--fg)]">0.0</p>
            </div>
        </div>

        {/* HUD Feedback Overlay */}
        <AnimatePresence>
          {drill.lastFeedback && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8, y: 20 }}
               animate={drill.lastFeedback.status !== 'deviation' ?
                  { opacity: 1, scale: 1, y: 0 } : 
                  { opacity: 1, scale: 1, y: 0, x: [0, -10, 10, -10, 10, 0] }
               }
               transition={drill.lastFeedback.status !== 'deviation' ? {} : { duration: 0.4 }}
               exit={{ opacity: 0, scale: 0.8 }}
               className={clsx(
                 "absolute top-[20%] z-50 px-8 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex flex-col items-center gap-2",
                 drill.lastFeedback.status === 'correct'
                    ? "bg-[var(--money-soft)] border-[var(--money-line)]"
                    : drill.lastFeedback.status === 'review'
                      ? "border-sky-300/35 bg-sky-300/10"
                      : "bg-[var(--loss-soft)] border-[var(--loss-line)]"
               )}
            >
                {drill.lastFeedback.status === 'correct' ? (
                  <CheckCircle2 size={32} className="text-[var(--money)]" />
                ) : (
                  <AlertCircle size={32} className={drill.lastFeedback.status === 'review' ? 'text-sky-200' : 'text-[var(--loss)]'} />
                )}
                <p className="text-lg font-bold text-[var(--fg)]">
                  {drill.lastFeedback.status === 'correct' ? 'CORRECT' : drill.lastFeedback.status === 'review' ? 'REVIEW ONLY' : 'DEVIATION'}
                </p>
                <p className="text-sm text-[var(--fg-dim)] max-w-[200px] text-center">{drill.lastFeedback.note}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls */}
        {drill.type === 'study_queue' && drill.currentPacket && (
          <div
            className="z-20 mb-4 max-w-3xl rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-center shadow-lg"
            data-testid="arena-study-packet-menu"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-100">
              SpotPacket legal menu · {formatSourceValue(drill.currentPacket.trainerPrompt.source)} · {drill.currentPacket.trainerPrompt.legalActions.length} action{drill.currentPacket.trainerPrompt.legalActions.length === 1 ? '' : 's'}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-sky-100/70">
              {visiblePacketWarnings(drill.currentPacket)}. Buttons reflect the packet menu for local practice only; no solver EV, answer bucket, trainer score, raw hand text, or villain name is stored.
            </p>
          </div>
        )}
        <div className="flex gap-4 mt-8 pb-12 z-20">
            {actionOptions.map((option) => (
              <ActionButton
                key={option.id}
                label={option.label}
                color={option.color}
                meta={option.meta}
                onClick={() => handleAction(option.action)}
                disabled={!!drill.lastFeedback}
                testId={`arena-action-${option.id}`}
              />
            ))}
        </div>
      </main>
    </div>
  );
}

interface DrillCardProps {
  title: string;
  desc: string;
  icon: LucideIcon;
  color: 'red' | 'emerald' | 'blue';
  onClick: () => void;
}

function DrillCard({ title, desc, icon: Icon, onClick }: DrillCardProps) {
  return (
    <motion.button
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="cursor-pointer compartment transition-all hover:border-[var(--accent-line)] group text-left"
      type="button"
    >
      <div className="mb-4 text-[var(--accent)] group-hover:scale-110 transition-transform">
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold text-[var(--fg)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--fg-dim)] leading-relaxed">{desc}</p>
      <div className="inner-rule mt-6 text-xs font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
         Start Drill <ChevronRight size={14} />
      </div>
    </motion.button>
  );
}

interface ActionButtonProps {
  label: string;
  color: ActionColor;
  meta?: string;
  onClick: () => void;
  disabled: boolean;
  testId?: string;
}

function ActionButton({ label, color, meta, onClick, disabled, testId }: ActionButtonProps) {
  const colorMap = {
    gray: 'btn outline',
    blue: 'btn',
    emerald: 'btn sig',
    amber: 'btn border-amber-300/40 bg-amber-300/10 text-amber-100 hover:border-amber-200/60',
    rose: 'btn border-rose-300/40 bg-rose-300/10 text-rose-100 hover:border-rose-200/60',
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "px-10 py-4 font-bold text-sm",
        colorMap[color]
      )}
      type="button"
      data-testid={testId}
      aria-label={meta ? `${label} ${meta}` : label}
    >
      <span>{label}</span>
      {meta && <span className="ml-2 text-[9px] opacity-60">{meta}</span>}
    </button>
  );
}
