import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Zap, RotateCcw, ChevronRight, AlertCircle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../data/appStore';
import { CURRICULUM_SEED_PACKS, type CurriculumSeedPack, type CurriculumSpotSeed } from '../data/curriculumSeedPacks.generated';
import { readCurriculumProgress, recordCurriculumSpotReview } from '../data/curriculumProgress';
import { readStarterDiagnosticSummary, recordStarterDiagnosticAnswer } from '../data/starterDiagnostic';
import { getAllHeroDecisions, getParsedHandForHandId, getSrsReviews, recordSrsReview } from '../data/store';
import { PokerCard } from '../components/shared/Card';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { checkCompliance } from '../analysis/rangeChecker';
import { buildFaultSpots, selectQueue, type FaultSpot, type SrsReviewRecord } from '../analysis/srsScheduler';
import { buildSpotPacketFromParsedHand } from '../analysis/spotPacket';
import {
  buildStudyPacketArenaPath,
  isStudyPacketSrsDue,
  readStudyPacketProgress,
  recordStudyPacketReview,
  selectNextActionableStudyPacket,
  studyPacketNextDueLabel,
  studyPacketProgressKey,
  type StudyPacketProgressTarget,
} from '../analysis/studyPacketProgress';
import type { HeroDecision } from '../types/analysis';
import type { StrategyProfile } from '../data/strategyProfiles';
import type { SpotPacket, SpotPacketLegalAction, SpotPacketWarning } from '../analysis/spotPacket';

/** New misplay patterns introduced per spaced-review session (the rest wait). */
const SRS_MAX_NEW = 15;

// Types for the Trainer
type DrillType = 'spaced_review' | 'fault_fixer' | 'rfi_master' | 'cbet_clinic' | 'study_queue' | 'curriculum';
type PreflopAction = 'fold' | 'raise' | 'call' | 'check';
type CbetAction = 'check' | 'bet';
type TrainerAction = string;
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

interface StudyQueueSessionSummary {
  reviewedCount: number;
  totalCount: number;
  correct: number;
  graded: number;
  lastHandId: string | null;
  nextDueLabel: string;
}

const DRILL_LABELS: Record<DrillType, string> = {
  spaced_review: 'Spaced Review',
  fault_fixer: 'Fault Fixer',
  rfi_master: 'RFI Master',
  cbet_clinic: 'C-bet Clinic',
  study_queue: 'Study Queue spot',
  curriculum: 'Curriculum drill',
};

const STARTER_DIAGNOSTIC_PACK: CurriculumSeedPack = {
  slug: 'starter-diagnostic',
  title: 'Starter diagnostic',
  description: 'Lower-confidence starter path from brand-neutral curriculum seeds for players without imported hand histories.',
  source: {
    kind: 'brand_neutralized_quiz_config',
    path: '../poker-knowledge/quiz_configs.json',
    sourceConfigIndexes: Array.from(new Set(CURRICULUM_SEED_PACKS.flatMap((pack) => pack.source.sourceConfigIndexes))),
  },
  spots: CURRICULUM_SEED_PACKS.reduce<CurriculumSpotSeed[]>(
    (spots, pack) => spots.concat(pack.spots.slice(0, 2)),
    [],
  ).slice(0, 8),
};

const CURRICULUM_PACK_GROUPS: Array<{ title: string; description: string; slugs: string[] }> = [
  {
    title: 'Preflop foundations',
    description: 'Open, face 3-bets, and respond to opens before the hand gets complicated.',
    slugs: ['open-raise-fundamentals', 'facing-3bet-frontier', 'versus-open-raise'],
  },
  {
    title: 'Blind defense',
    description: 'Big blind, multiway, and blind-war decisions where players leak fast.',
    slugs: ['big-blind-defense', 'multiway-bb-defense', 'blind-war-preflop'],
  },
  {
    title: 'Postflop play',
    description: 'C-bet, continue, and respond across in-position and out-of-position nodes.',
    slugs: ['in-position-cbet-vs-bb', 'in-position-postflop', 'in-position-turn-river-barrels-vs-bb', 'out-of-position-cbet', 'versus-bb-cbet'],
  },
];

function sourcePackTitleForStarterSpot(spot: CurriculumSpotSeed | null | undefined): string {
  if (!spot) return 'Curriculum seed';
  return CURRICULUM_SEED_PACKS.find((pack) => pack.spots.some((packSpot) => packSpot.id === spot.id))?.title ?? 'Curriculum seed';
}

function diagnosticReviewAreaSummary(area: { misses: number; attempts: number }): string {
  const missLabel = area.misses === 1 ? 'miss' : 'misses';
  const spotLabel = area.attempts === 1 ? 'diagnostic spot' : 'diagnostic spots';
  return `${area.misses} ${missLabel} across ${area.attempts} ${spotLabel}`;
}

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

  if (type === 'cbet_clinic') {
    return allDecisions.filter(d => d.cbetOpportunity);
  }

  // spaced_review draws from a persisted SRS queue, not a random pool.
  return [];
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

function actionColorForSeed(action: string): ActionColor {
  if (action === 'fold' || action === 'check') return 'gray';
  if (action === 'call') return 'blue';
  if (action === 'all_in') return 'rose';
  if (action.startsWith('bet_')) return 'amber';
  return 'emerald';
}

function labelSeedAction(action: string): string {
  if (action === 'all_in') return 'All-in';
  return action
    .replace(/^cbet_/, 'C-bet ')
    .replace(/^bet_/, 'Bet ')
    .replace(/^raise_/, 'Raise ')
    .replace(/_/g, '.')
    .replace(/pct/g, '%')
    .replace(/^\w/, (char) => char.toUpperCase());
}

function curriculumActionOptions(spot: CurriculumSpotSeed | null): ActionOption[] | null {
  if (!spot) return null;
  const allActions = new Set<string>(['fold', 'call', 'raise', 'check', 'all_in', ...spot.acceptedActions]);
  return Array.from(allActions).map((action) => ({
    id: action,
    label: labelSeedAction(action),
    action,
    color: actionColorForSeed(action),
    meta: spot.acceptedActions.includes(action) ? 'seed answer' : 'option',
  }));
}

function curriculumScenarioForPack(pack: CurriculumSeedPack): HeroDecision['scenario'] {
  if (pack.slug.includes('3bet')) return 'FACING_3BET';
  if (pack.slug.includes('big-blind') || pack.slug.includes('bb-defense')) return 'BB_VS_RAISE';
  if (pack.slug.includes('blind-war')) return 'BLIND_WAR';
  return 'RFI';
}

function curriculumPosition(position: CurriculumSpotSeed['position']): HeroDecision['position'] {
  return position === 'LJ' ? 'MP' : position;
}

function curriculumDecision(pack: CurriculumSeedPack, spot: CurriculumSpotSeed): HeroDecision {
  return {
    handId: `curriculum-${spot.id}`,
    position: curriculumPosition(spot.position),
    handKey: spot.combo,
    stackBb: spot.stackBb,
    scenario: curriculumScenarioForPack(pack),
    action: 'fold',
    isCompliant: true,
    deviationType: null,
    sawFlop: false,
    wasPreFlopRaiser: false,
    cbetOpportunity: false,
    cbetMade: false,
    cbetHU: false,
    doubleBarrelOpportunity: false,
    doubleBarrelMade: false,
    wentToShowdown: false,
    wonAtShowdown: false,
    wonAmount: 0,
    netProfit: 0,
  };
}

async function loadStudyQueuePacket(decision: HeroDecision): Promise<SpotPacket | null> {
  const parsedHand = await getParsedHandForHandId(decision.handId);
  return parsedHand ? buildSpotPacketFromParsedHand(parsedHand, decision) : null;
}

interface DueStudyReview {
  dueCount: number;
  path: string;
}

// Which imported study packet the SRS scheduler says is due right now. Built
// from the browser-local progress store (keyed by real packetId) and gated by
// isStudyPacketSrsDue, so only packets whose Leitner interval has elapsed and
// whose hand still exists in the Arena store are offered. Called in render on
// the drills landing, so it re-reads localStorage fresh after a session ends.
function selectDueStudyReview(allDecisions: HeroDecision[], decisionsLoaded: boolean): DueStudyReview | null {
  if (!decisionsLoaded || allDecisions.length === 0) return null;
  const progress = readStudyPacketProgress();
  const decisionHandIds = new Set(allDecisions.map((decision) => decision.handId));
  const targets: StudyPacketProgressTarget[] = Object.values(progress)
    .filter((entry) => decisionHandIds.has(entry.handId))
    .map((entry) => ({ packetId: entry.packetId, source: { handId: entry.handId } }));
  if (targets.length === 0) return null;
  const dueCount = targets.filter((target) => isStudyPacketSrsDue(progress[studyPacketProgressKey(target)])).length;
  if (dueCount === 0) return null;
  const selected = selectNextActionableStudyPacket(targets, progress);
  const path = buildStudyPacketArenaPath(selected, targets, progress);
  if (!selected || !path) return null;
  return { dueCount, path };
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

    const next = pickRandomDecision(activePool);
    if (!next) {
      setDrill(prev => ({ ...prev, isActive: false, currentDecision: null, currentPacket: null, sessionHandIds: [], sessionIndex: 0, lastFeedback: null }));
      if (drill.type) {
        setEmptyDrillType(drill.type);
      }
      return;
    }

    setDrill(prev => ({
      ...prev,
      currentDecision: next,
      lastFeedback: null,
    }));
  }, [activePool, drill.type]);

  const handleAction = (action: TrainerAction) => {
    if (!drill.currentDecision) return;

    let userIsCorrect = true;
    let note = 'Good. This matches the local baseline check.';
    let feedbackStatus: FeedbackStatus = 'correct';
    let shouldRecordScore = true;

    if (drill.type === 'curriculum') {
      const accepted = drill.currentCurriculumSpot?.acceptedActions ?? [];
      userIsCorrect = accepted.includes(action);
      feedbackStatus = userIsCorrect ? 'correct' : 'deviation';
      note = userIsCorrect
        ? `Curriculum answer: ${labelSeedAction(action)} is accepted for this practice-only seed. This is not imported-hand evidence or solver EV.`
        : `Curriculum answer: this seed accepts ${accepted.map(labelSeedAction).join(' or ')}. This is not imported-hand evidence or solver EV.`;
    } else if (drill.type === 'cbet_clinic') {
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
        // Review-only actions from the packet's legal menu: the Arena does not
        // grade them, so they never touch the score (honesty boundary).
        shouldRecordScore = false;
        feedbackStatus = 'review';
        note = action === 'all_in'
          ? 'Review-only all-in option: the SpotPacket legal menu captures this action, but Arena does not grade all-in ranges, solver EV, or trainer answer buckets. Use the study packet/export boundary for external review.'
          : 'Review-only bet option: the SpotPacket legal menu captures this action, but this Arena route does not grade postflop bet sizes, solver EV, or trainer answer buckets. Use the study packet/export boundary for external review.';
      } else {
        const testDecision = { ...drill.currentDecision, action: action as HeroDecision['action'] };
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

    // Spaced review: persist the outcome, then advance the cursor (or finish).
    if (drill.type === 'spaced_review' && drill.srs) {
      const session = drill.srs;
      const spot = session.queue[session.index];
      if (spot) void recordSrsReview(spot.spotKey, userIsCorrect);
      const nextScore = {
        correct: drill.score.correct + (userIsCorrect ? 1 : 0),
        total: drill.score.total + 1,
      };
      const isLast = session.index + 1 >= session.queue.length;
      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
        if (isLast) {
          setDrill(prev => ({ ...prev, isActive: false, currentDecision: null, lastFeedback: null, srs: null }));
          setSrsComplete(nextScore);
          void getSrsReviews().then(setSrsReviews);
        } else {
          setDrill(prev => {
            if (!prev.srs) return prev;
            const nextCard = prev.srs.queue[prev.srs.index + 1];
            if (!nextCard) return prev;
            return {
              ...prev,
              currentDecision: nextCard.representative,
              lastFeedback: null,
              srs: { ...prev.srs, index: prev.srs.index + 1 },
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
      return (
        <div className="max-w-2xl mx-auto py-20 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-3 border border-[var(--money-line)] bg-[var(--money-soft)] rounded-2xl mb-4"
          >
            <CheckCircle2 size={40} className="text-[var(--money)]" />
          </motion.div>
          <span className="kick sig block mb-2">Spaced Review</span>
          <h1 className="text-4xl font-bold text-[var(--fg)] mb-2">Session complete.</h1>
          <p className="lede text-[var(--fg-dim)] mb-8">
            You drilled {srsComplete.total} {srsComplete.total === 1 ? 'pattern' : 'patterns'} —{' '}
            {srsComplete.correct} correct. Misses come back soon; the rest are scheduled further out.
          </p>
          <button type="button" className="btn sig px-8 py-3" onClick={() => setSrsComplete(null)}>
            Back to the Arena
          </button>
        </div>
      );
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

interface DrillCardProps {
  title: string;
  desc: string;
  icon: LucideIcon;
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
