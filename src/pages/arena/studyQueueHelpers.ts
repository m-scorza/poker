import { getParsedHandForHandId } from '../../data/store';
import { buildSpotPacketFromParsedHand, type SpotPacket } from '../../analysis/spotPacket';
import {
  buildStudyPacketArenaPath,
  isStudyPacketSrsDue,
  readStudyPacketProgress,
  selectNextActionableStudyPacket,
  studyPacketNextDueLabel,
  studyPacketProgressKey,
  type StudyPacketProgressTarget,
} from '../../analysis/studyPacketProgress';
import type { HeroDecision } from '../../types/analysis';

export interface StudyQueueSessionSummary {
  reviewedCount: number;
  totalCount: number;
  correct: number;
  graded: number;
  lastHandId: string | null;
  nextDueLabel: string;
}

interface StudyQueueSummarySource {
  sessionIndex: number;
  sessionHandIds: string[];
  score: { correct: number; total: number };
  currentDecision: HeroDecision | null;
  currentPacket: SpotPacket | null;
}

interface DueStudyReview {
  dueCount: number;
  path: string;
}

export function buildStudyQueueSessionSummary(drill: StudyQueueSummarySource): StudyQueueSessionSummary {
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

export function handReplayPathForStudySummary(summary: StudyQueueSessionSummary | null): string | null {
  if (!summary?.lastHandId) return null;
  return `/hands?panel=spot-packet&reviewHand=${encodeURIComponent(summary.lastHandId)}#spot-packet`;
}

export async function loadStudyQueuePacket(decision: HeroDecision): Promise<SpotPacket | null> {
  const parsedHand = await getParsedHandForHandId(decision.handId);
  return parsedHand ? buildSpotPacketFromParsedHand(parsedHand, decision) : null;
}

// Which imported study packet the SRS scheduler says is due right now. Built
// from the browser-local progress store (keyed by real packetId) and gated by
// isStudyPacketSrsDue, so only packets whose Leitner interval has elapsed and
// whose hand still exists in the Arena store are offered. Called in render on
// the drills landing, so it re-reads localStorage fresh after a session ends.
export function selectDueStudyReview(allDecisions: HeroDecision[], decisionsLoaded: boolean): DueStudyReview | null {
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
