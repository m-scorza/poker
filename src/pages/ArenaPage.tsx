import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Zap, RotateCcw, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../data/appStore';
import { CURRICULUM_SEED_PACKS, type CurriculumSeedPack, type CurriculumSpotSeed } from '../data/curriculumSeedPacks.generated';
import { readCurriculumProgress, recordCurriculumSpotReview } from '../data/curriculumProgress';
import { readStarterDiagnosticSummary, recordStarterDiagnosticAnswer } from '../data/starterDiagnostic';
import { getAllHeroDecisions, getSrsReviews, recordSrsReview } from '../data/store';
import { PokerCard } from '../components/shared/Card';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { buildFaultSpots, gradeSpot, requeueLapsedSpot, selectQueue, type FaultSpot, type SrsReviewRecord } from '../analysis/srsScheduler';
import { recordStudyPacketReview } from '../analysis/studyPacketProgress';
import { computeNextDrillStep, evaluateDrillAction } from '../analysis/arenaDrillEngine';
import type { HeroDecision } from '../types/analysis';
import type { SpotPacket } from '../analysis/spotPacket';
import { getDrillPool, type DrillType } from './arena/drillPool';
import {
  PREFLOP_ACTIONS,
  CBET_ACTIONS,
  studyPacketActionOptions,
  curriculumActionOptions,
  formatSourceValue,
  visiblePacketWarnings,
  getDisplayCards,
  type TrainerAction,
} from './arena/actionOptions';
import { pickRandomDecision } from '../analysis/arena/drillLogic';
import {
  STARTER_DIAGNOSTIC_PACK,
  CURRICULUM_PACK_GROUPS,
  sourcePackTitleForStarterSpot,
  diagnosticReviewAreaSummary,
  curriculumDecision,
  curriculumSpotStage,
  curriculumSpotBadge,
} from './arena/curriculumSeeds';
import {
  buildStudyQueueSessionSummary,
  handReplayPathForStudySummary,
  loadStudyQueuePacket,
  selectDueStudyReview,
  type StudyQueueSessionSummary,
} from './arena/studyQueueHelpers';
import { requestedStudyQueueRoute } from './arena/studyQueueRoute';
import { DrillCard } from '../components/arena/DrillCard';
import { ActionButton } from '../components/arena/ActionButton';
import { SpacedReviewCompleteScreen } from '../components/arena/SpacedReviewCompleteScreen';

/** New misplay patterns introduced per spaced-review session (the rest wait). */
const SRS_MAX_NEW = 15;

// Types for the Trainer
type FeedbackStatus = 'correct' | 'deviation' | 'review';

interface DrillFeedback {
  status: FeedbackStatus;
  note: string;
}

/** In-flight spaced-review session: an immutable ordered queue + a cursor. */
interface SrsSession {
  /** Patterns to drill this session, scheduled order (due first, then new). */
  queue: FaultSpot[];
  /** Index of the current card in `queue`. */
  index: number;
  /** Initial counts, for the session header. */
  dueCount: number;
  freshCount: number;
}

interface DrillState {
  isActive: boolean;
  type: DrillType | null;
  currentDecision: HeroDecision | null;
  /** Present only for `study_queue`; the packet backing the current spot. */
  currentPacket: SpotPacket | null;
  /** Present only for `curriculum`; source-governed seed practice, not imported-hand evidence. */
  currentCurriculumPack?: CurriculumSeedPack | null;
  currentCurriculumSpot?: CurriculumSpotSeed | null;
  /** Ordered hand ids for a routed multi-packet study session. */
  sessionHandIds: string[];
  sessionIndex: number;
  score: { correct: number; total: number };
  lastFeedback: DrillFeedback | null;
  /** Present only for `spaced_review`; null for the random drills. */
  srs: SrsSession | null;
}

const DRILL_LABELS: Record<DrillType, string> = {
  spaced_review: 'Spaced Review',
  fault_fixer: 'Fault Fixer',
  rfi_master: 'RFI Master',
  cbet_clinic: 'C-bet Clinic',
  study_queue: 'Study Queue spot',
  curriculum: 'Curriculum drill',
};

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
    srs: null,
  });
  const drillRef = useRef(drill);
  const [completedStudySession, setCompletedStudySession] = useState<StudyQueueSessionSummary | null>(null);

  const { strategyProfile } = useAppStore();
  const starterDiagnostic = readStarterDiagnosticSummary();
  const curriculumProgress = readCurriculumProgress();
  const topDiagnosticReviewArea = starterDiagnostic?.reviewAreas[0] ?? null;
  const recommendedCurriculumPack = starterDiagnostic?.recommendedPackTitle
    ? CURRICULUM_SEED_PACKS.find((pack) => pack.title === starterDiagnostic.recommendedPackTitle) ?? null
    : null;
  const requestedStudyQueue = useMemo(() => requestedStudyQueueRoute(), []);
  const requestedStudyHandId = requestedStudyQueue.handId;
  const requestedStudyHandIds = requestedStudyQueue.handIds;
  const requestedStudyRouteKey = requestedStudyHandIds.join('|');
  const [allDecisions, setAllDecisions] = useState<HeroDecision[]>([]);
  const [decisionsLoaded, setDecisionsLoaded] = useState(false);
  const [srsReviews, setSrsReviews] = useState<SrsReviewRecord[]>([]);
  const [srsComplete, setSrsComplete] = useState<{ correct: number; total: number } | null>(null);
  const [emptyDrillType, setEmptyDrillType] = useState<DrillType | null>(null);
  const [missingStudyQueueHandId, setMissingStudyQueueHandId] = useState<string | null>(null);
  // Ref, not state: making this a state dep of the auto-start effect lets the
  // effect's own cleanup cancel the in-flight packet load (state update →
  // re-render → cleanup) before a real IndexedDB read can resolve.
  const autoStartedStudyQueueRouteKeyRef = useRef<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    drillRef.current = drill;
  }, [drill]);

  // Load pool of decisions to draw from, plus persisted spaced-review state.
  useEffect(() => {
    async function load() {
      const [decisions, reviews] = await Promise.all([getAllHeroDecisions(), getSrsReviews()]);
      setAllDecisions(decisions);
      setSrsReviews(reviews);
      setDecisionsLoaded(true);
    }
    load();
  }, []);

  // Due / new counts for the Spaced Review card, recomputed as data changes.
  const srsPreview = useMemo(() => {
    const spots = buildFaultSpots(allDecisions, strategyProfile);
    const records = new Map(srsReviews.map((r) => [r.spotKey, r]));
    const { due, fresh } = selectQueue(spots, records, Date.now(), SRS_MAX_NEW);
    return { due: due.length, fresh: fresh.length };
  }, [allDecisions, srsReviews, strategyProfile]);


  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const activePool = useMemo(
    () => drill.type && drill.type !== 'curriculum'
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

  // A routed Study Queue link (/arena?drill=study-queue&handId=…) auto-starts
  // its review session once decisions are loaded — once per route key.
  useEffect(() => {
    if (requestedStudyHandIds.length === 0 || !decisionsLoaded) return;
    if (autoStartedStudyQueueRouteKeyRef.current === requestedStudyRouteKey) return;

    let isCancelled = false;

    async function autoStartStudyQueueSpot() {
      const pool = getDrillPool('study_queue', allDecisions, strategyProfile, { handIds: requestedStudyHandIds });
      const first = pool[0] ?? null;

      if (!first) {
        autoStartedStudyQueueRouteKeyRef.current = requestedStudyRouteKey;
        setMissingStudyQueueHandId(requestedStudyHandId ?? requestedStudyHandIds[0] ?? 'requested Study Queue spot');
        return;
      }

      const currentPacket = await loadStudyQueuePacket(first);
      // Commit the once-per-route guard only on an uncancelled completion —
      // a cancelled run (StrictMode double-invoke, dep churn) must leave the
      // route eligible for the surviving run.
      if (isCancelled) return;
      autoStartedStudyQueueRouteKeyRef.current = requestedStudyRouteKey;

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
        srs: null,
      });
    }

    void autoStartStudyQueueSpot();
    return () => {
      isCancelled = true;
    };
  }, [allDecisions, decisionsLoaded, requestedStudyHandId, requestedStudyHandIds, requestedStudyRouteKey, strategyProfile]);

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
        srs: null,
      });
    }

    void start(first);
  }, [allDecisions, requestedStudyHandId, requestedStudyHandIds, strategyProfile]);

  const startSpacedReview = useCallback(async () => {
    const spots = buildFaultSpots(allDecisions, strategyProfile);
    const reviews = await getSrsReviews();
    setSrsReviews(reviews);
    const records = new Map(reviews.map((r) => [r.spotKey, r]));
    const { due, fresh, queue } = selectQueue(spots, records, Date.now(), SRS_MAX_NEW);
    const [first] = queue;
    if (!first) {
      setEmptyDrillType('spaced_review');
      return;
    }
    setSrsComplete(null);
    setDrill({
      isActive: true,
      type: 'spaced_review',
      currentDecision: first.representative,
      currentPacket: null,
      sessionHandIds: [],
      sessionIndex: 0,
      score: { correct: 0, total: 0 },
      lastFeedback: null,
      srs: { queue, index: 0, dueCount: due.length, freshCount: fresh.length },
    });
  }, [allDecisions, strategyProfile]);

  const startCurriculumPack = useCallback((pack: CurriculumSeedPack) => {
    const first = pack.spots[0] ?? null;
    if (!first) return;
    setCompletedStudySession(null);
    setSrsComplete(null);
    setDrill({
      isActive: true,
      type: 'curriculum',
      currentDecision: curriculumDecision(pack, first),
      currentPacket: null,
      currentCurriculumPack: pack,
      currentCurriculumSpot: first,
      sessionHandIds: pack.spots.map((spot) => spot.id),
      sessionIndex: 0,
      score: { correct: 0, total: 0 },
      lastFeedback: null,
      srs: null,
    });
  }, []);

  // The SRS "due for review" CTA: buildStudyPacketArenaPath produced the route,
  // so navigate to it (deep-link correctness on reload) and then drive the drill
  // from that same route through the existing Study Queue parser + pool.
  const startDueStudyReview = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    const route = requestedStudyQueueRoute();
    const pool = getDrillPool('study_queue', allDecisions, strategyProfile, { handIds: route.handIds });
    const first = pool[0] ?? null;
    if (!first) return;

    async function start(decision: HeroDecision) {
      const currentPacket = await loadStudyQueuePacket(decision);
      setCompletedStudySession(null);
      setDrill({
        isActive: true,
        type: 'study_queue',
        currentDecision: decision,
        currentPacket,
        sessionHandIds: pool.map((entry) => entry.handId),
        sessionIndex: 0,
        score: { correct: 0, total: 0 },
        lastFeedback: null,
        srs: null,
      });
    }

    void start(first);
  }, [allDecisions, strategyProfile]);

  const nextHand = useCallback(() => {
    const currentDrill = drillRef.current;

    if (currentDrill.type === 'curriculum') {
      const pack = currentDrill.currentCurriculumPack;
      const nextIndex = currentDrill.sessionIndex + 1;
      const nextSpot = pack?.spots[nextIndex] ?? null;
      if (!pack || !nextSpot) {
        setDrill(prev => ({ ...prev, isActive: false, currentDecision: null, currentCurriculumPack: null, currentCurriculumSpot: null, sessionHandIds: [], sessionIndex: 0, lastFeedback: null }));
        return;
      }
      setDrill(prev => ({
        ...prev,
        currentDecision: curriculumDecision(pack, nextSpot),
        currentCurriculumSpot: nextSpot,
        sessionIndex: nextIndex,
        lastFeedback: null,
      }));
      return;
    }

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

    const step = computeNextDrillStep(activePool);
    if (step.kind === 'exhausted') {
      setDrill(prev => ({ ...prev, isActive: false, currentDecision: null, currentPacket: null, sessionHandIds: [], sessionIndex: 0, lastFeedback: null }));
      if (drill.type) {
        setEmptyDrillType(drill.type);
      }
      return;
    }

    setDrill(prev => ({
      ...prev,
      currentDecision: step.decision,
      lastFeedback: null,
    }));
  }, [activePool, drill.type]);

  const handleAction = (action: TrainerAction) => {
    if (!drill.currentDecision) return;

    const evaluation = evaluateDrillAction(drill, action, strategyProfile);
    if (!evaluation) return;
    const { userIsCorrect, note, feedbackStatus, shouldRecordScore } = evaluation;

    // Every reviewed Study Queue packet advances its browser-local SRS entry,
    // graded or review-only alike (the review itself is the event).
    if (drill.type === 'study_queue' && drill.currentPacket) {
      recordStudyPacketReview(drill.currentPacket);
    }

    if (drill.type === 'curriculum' && drill.currentCurriculumPack && shouldRecordScore) {
      const updatedAt = new Date().toISOString();
      if (drill.currentCurriculumPack.slug === STARTER_DIAGNOSTIC_PACK.slug) {
        recordStarterDiagnosticAnswer({
          packTitle: drill.currentCurriculumPack.title,
          sourcePackTitle: sourcePackTitleForStarterSpot(drill.currentCurriculumSpot),
          wasCorrect: userIsCorrect,
          isComplete: drill.sessionIndex + 1 >= drill.currentCurriculumPack.spots.length,
          updatedAt,
        });
      } else if (drill.currentCurriculumSpot) {
        recordCurriculumSpotReview({
          packSlug: drill.currentCurriculumPack.slug,
          spotId: drill.currentCurriculumSpot.id,
          wasCorrect: userIsCorrect,
          totalSpots: drill.currentCurriculumPack.spots.length,
          updatedAt,
        });
      }
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

    // Spaced review: persist the outcome, requeue a lapse for same-session
    // relearn, then advance the cursor (or finish).
    if (drill.type === 'spaced_review' && drill.srs) {
      const session = drill.srs;
      const spot = session.queue[session.index];
      const now = Date.now();
      let queue = session.queue;
      if (spot) {
        void recordSrsReview(spot.spotKey, userIsCorrect);
        // Mirror the persisted grade to decide (purely from its near-term dueAt)
        // whether the lapsed card must reappear before this session ends.
        const prevRecord = srsReviews.find((r) => r.spotKey === spot.spotKey);
        const graded = gradeSpot(spot.spotKey, prevRecord, userIsCorrect, now);
        queue = requeueLapsedSpot(session.queue, session.index, graded, now);
      }
      const nextScore = {
        correct: drill.score.correct + (userIsCorrect ? 1 : 0),
        total: drill.score.total + 1,
      };
      const isLast = session.index + 1 >= queue.length;
      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
        if (isLast) {
          setDrill(prev => ({ ...prev, isActive: false, currentDecision: null, lastFeedback: null, srs: null }));
          setSrsComplete(nextScore);
          void getSrsReviews().then(setSrsReviews);
        } else {
          setDrill(prev => {
            if (!prev.srs) return prev;
            const nextIndex = prev.srs.index + 1;
            const nextCard = queue[nextIndex];
            if (!nextCard) return prev;
            return {
              ...prev,
              currentDecision: nextCard.representative,
              lastFeedback: null,
              srs: { ...prev.srs, queue, index: nextIndex },
            };
          });
        }
      }, 2000);
      return;
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
    if (srsComplete) {
      return <SpacedReviewCompleteScreen score={srsComplete} onDismiss={() => setSrsComplete(null)} />;
    }
    const dueStudyReview = selectDueStudyReview(allDecisions, decisionsLoaded);
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
            <span className="kick sig block mb-2">Drills</span>
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
                    data-testid="arena-session-coach-link"
                  >
                    Back to the Coach&apos;s Note <ChevronRight size={13} />
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

          {/* Spaced Review — the headline: drill your real mistakes on a schedule. */}
          <button
            type="button"
            onClick={() => startSpacedReview()}
            className="w-full text-left compartment mb-6 hover:border-[var(--accent-line)] transition-all group"
          >
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="text-[var(--accent)] group-hover:scale-110 transition-transform">
                  <RotateCcw size={24} />
                </div>
                <div>
                  <span className="kick sig block mb-1">Spaced Review</span>
                  <h3 className="text-xl font-bold text-[var(--fg)] mb-1">Drill your real mistakes, on a schedule.</h3>
                  <p className="text-sm text-[var(--fg-dim)] max-w-md">
                    {srsPreview.due + srsPreview.fresh === 0
                      ? "You're all caught up — new misplay patterns appear here after your next import."
                      : 'The patterns you keep getting wrong come back until they stick; the rest space out.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--loss)]">{srsPreview.due}</p>
                  <p className="kick text-[var(--fg-muted)]">Due</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--accent)]">{srsPreview.fresh}</p>
                  <p className="kick text-[var(--fg-muted)]">New</p>
                </div>
              </div>
            </div>
          </button>

          {dueStudyReview && (
            <button
              type="button"
              onClick={() => startDueStudyReview(dueStudyReview.path)}
              data-testid="arena-study-due-cta"
              className="w-full text-left compartment mb-6 hover:border-[var(--accent-line)] transition-all group"
            >
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="text-[var(--sig)] group-hover:scale-110 transition-transform">
                    <RotateCcw size={24} />
                  </div>
                  <div>
                    <span className="kick sig block mb-1">Study Queue · SRS</span>
                    <h3 className="text-xl font-bold text-[var(--fg)] mb-1">Imported packets are due for review.</h3>
                    <p className="text-sm text-[var(--fg-dim)] max-w-md">
                      Browser-local spaced repetition scheduled these packets to come back today. Pick up the most overdue one next.
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--sig)]">{dueStudyReview.dueCount}</p>
                  <p className="kick text-[var(--fg-muted)]">Due</p>
                </div>
              </div>
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DrillCard
              title="Fault Fixer"
              desc="Replay hands where you made actual deviations."
              icon={Target}
              onClick={() => startDrill('fault_fixer')}
            />
            <DrillCard
              title="RFI Master"
              desc="Master pot opening across all positions."
              icon={Zap}
              onClick={() => startDrill('rfi_master')}
            />
            <DrillCard
              title="C-bet Clinic"
              desc="Perfect your flop aggression."
              icon={Trophy}
              onClick={() => startDrill('cbet_clinic')}
            />
          </div>

          {decisionsLoaded && allDecisions.length === 0 && (
            <section className="mt-8 rounded-2xl border border-sky-300/25 bg-sky-300/10 p-5 shadow-2xl shadow-sky-950/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="kick sig">Starter path</span>
                  <h2 className="mt-1 text-xl font-black text-[var(--fg)]">No hand history yet?</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--fg-dim)]">
                    Run a short lower-confidence diagnostic from brand-neutral curriculum seeds. It gives a starter direction only — not leak grading or imported-hand evidence.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn sig shrink-0 px-4 py-3 text-xs"
                  onClick={() => startCurriculumPack(STARTER_DIAGNOSTIC_PACK)}
                >
                  Start starter diagnostic
                </button>
              </div>
            </section>
          )}

          {recommendedCurriculumPack && topDiagnosticReviewArea && (
            <section
              className="mt-8 rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-5 shadow-2xl shadow-black/10"
              data-testid="arena-diagnostic-recommendation"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="kick sig">Recommended next</span>
                  <h2 className="mt-1 text-xl font-black text-[var(--fg)]">{recommendedCurriculumPack.title}</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--fg-dim)]">
                    Starter diagnostic signal: {diagnosticReviewAreaSummary(topDiagnosticReviewArea)}. Use this as lower-confidence curriculum orientation, not imported-hand evidence, leak grading, or solver EV.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Start recommended ${recommendedCurriculumPack.title}`}
                  className="btn sig shrink-0 px-4 py-3 text-xs"
                  onClick={() => startCurriculumPack(recommendedCurriculumPack)}
                >
                  Start recommended pack
                </button>
              </div>
            </section>
          )}

          <section className="mt-8 compartment" aria-labelledby="curriculum-drills-heading">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="kick sig">Practice-only seeds</span>
                <h2 id="curriculum-drills-heading" className="text-xl font-black text-[var(--fg)]">Curriculum drills</h2>
                <p className="text-sm text-[var(--fg-dim)]">Start here even before importing hand histories. These packs are brand-neutral local practice, not imported-hand evidence.</p>
              </div>
              <span className="text-xs font-mono text-[var(--fg-muted)]">{CURRICULUM_SEED_PACKS.length} packs</span>
            </div>
            <div className="space-y-5">
              {CURRICULUM_PACK_GROUPS.map((group) => {
                const packs = group.slugs.reduce<CurriculumSeedPack[]>((result, slug) => {
                  const pack = (CURRICULUM_SEED_PACKS as unknown as readonly CurriculumSeedPack[]).find((entry) => entry.slug === slug);
                  if (pack) result.push(pack);
                  return result;
                }, []);
                return (
                  <section key={group.title} aria-labelledby={`curriculum-group-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                    <div className="mb-3">
                      <h3 id={`curriculum-group-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-sm font-black uppercase tracking-[0.18em] text-[var(--fg)]">
                        {group.title}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--fg-muted)]">{group.description}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {packs.map((pack) => {
                        const progress = curriculumProgress[pack.slug];
                        const reviewedCount = progress?.reviewedSpotIds.length ?? 0;
                        return (
                          <button
                            key={pack.slug}
                            type="button"
                            aria-label={`Start ${pack.title}`}
                            className="rounded-xl border border-[var(--hairline)] bg-[var(--ink-1)] p-4 text-left transition hover:border-[var(--accent-line)] hover:bg-[var(--ink-2)]"
                            onClick={() => startCurriculumPack(pack)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-bold text-[var(--fg)]">{pack.title}</h4>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">{pack.description}</p>
                                {progress && (
                                  <p className="mt-2 text-[11px] font-semibold text-sky-100/80">
                                    browser-local progress: {progress.isComplete ? 'Completed locally' : `${reviewedCount}/${pack.spots.length} locally reviewed`} · {progress.correct}/{progress.attempts} seed answers
                                  </p>
                                )}
                              </div>
                              <span className="rounded-full border border-[var(--accent-line)] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">{pack.spots.length} spots</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
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
    : drill.type === 'study_queue'
      ? studyPacketActionOptions(drill.currentPacket) ?? PREFLOP_ACTIONS
      : drill.type === 'curriculum'
        ? curriculumActionOptions(drill.currentCurriculumSpot ?? null) ?? PREFLOP_ACTIONS
        : PREFLOP_ACTIONS;

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
               if (advanceTimerRef.current !== null) {
                 clearTimeout(advanceTimerRef.current);
                 advanceTimerRef.current = null;
               }
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
           {drill.type === 'curriculum' && drill.currentCurriculumPack && (
             <span
               className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-sky-100"
               data-testid="arena-curriculum-source"
             >
               {drill.currentCurriculumPack.title} · Curriculum practice · practice-only seed · {drill.sessionIndex + 1}/{drill.currentCurriculumPack.spots.length}
             </span>
           )}
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="kick text-[var(--fg-muted)]">Score</p>
              <p className="font-mono font-bold text-[var(--accent)]">{drill.score.correct} / {drill.score.total}</p>
           </div>
           {drill.srs && (
             <>
               <div className="h-8 w-px bg-[var(--hairline)]" />
               <div className="text-right">
                  <p className="kick text-[var(--fg-muted)]">Review</p>
                  <p className="font-mono font-bold text-[var(--fg)]">{drill.srs.index + 1} / {drill.srs.queue.length}</p>
               </div>
             </>
           )}
           <div className="h-8 w-px bg-[var(--hairline)]" />
           <div className="px-3 py-1 bg-[var(--ink-2)] border border-[var(--hairline)] rounded-full">
              <span className="text-xs font-mono">{drill.type === 'study_queue' ? 'STUDY' : drill.type === 'curriculum' ? 'SEED' : strategyProfile === 'game_plan' ? 'BASE' : 'ADV'}</span>
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
                    {drill.type === 'curriculum'
                      ? curriculumSpotBadge(drill.currentCurriculumSpot)
                      : drill.currentDecision?.scenario.replace('_', ' ')}
                 </span>
               </div>
               <div className="mt-2 text-[10px] text-[var(--accent)] font-bold tracking-tighter uppercase opacity-80">
                  Stage: {drill.type === 'cbet_clinic'
                    ? 'Flop'
                    : drill.type === 'curriculum' && curriculumSpotStage(drill.currentCurriculumSpot) === 'postflop'
                      ? 'Postflop'
                      : 'Pre-flop'}
               </div>
            </div>

            {drill.type === 'curriculum' && drill.currentCurriculumSpot?.board && (
               <div
                 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20"
                 data-testid="arena-curriculum-board"
               >
                  {drill.currentCurriculumSpot.villainPosition && (
                    <span className="px-3 py-1 bg-[var(--ink)] border border-[var(--hairline)] rounded-full text-[10px] font-black uppercase tracking-wider text-[var(--fg-dim)]">
                       Villain: {drill.currentCurriculumSpot.villainPosition}
                    </span>
                  )}
                  <div className="flex gap-1.5">
                     {drill.currentCurriculumSpot.board.map((card, index) => (
                       <PokerCard key={`${card}-${index}`} card={card} size="md" className="shadow-xl" />
                     ))}
                  </div>
                  {drill.currentCurriculumSpot.preflopLine && (
                    <span className="max-w-[280px] text-center text-[11px] font-mono text-[var(--fg-muted)]">
                       {drill.currentCurriculumSpot.preflopLine}
                    </span>
                  )}
               </div>
            )}

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
        {drill.type === 'curriculum' && drill.currentCurriculumPack && (
          <div className="z-20 mb-4 max-w-3xl rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-center shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-100">
              {drill.currentCurriculumPack.title} · practice-only seed
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-sky-100/70">
              {drill.currentCurriculumPack.description} Answers are seed buckets only; this is lower-confidence orientation, not leak grading, imported-hand evidence, solver EV, or trainer score.
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
