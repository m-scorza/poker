export const STUDY_PACKET_PROGRESS_STORAGE_KEY = 'poker-hermes.studyPacketProgress.v1';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STUDY_PACKET_SRS_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

export interface StudyPacketProgressTarget {
  packetId?: string | null;
  source: {
    handId: string;
  };
}

export interface StudyPacketProgressEntry {
  packetId: string;
  handId: string;
  reviewedAt?: string;
  snoozedAt?: string;
  lastDrilledAt?: string;
  nextDueAt?: string;
  repetitionCount: number;
  intervalDays?: number;
  starred: boolean;
  updatedAt: string;
}

export type StudyPacketProgressStore = Record<string, StudyPacketProgressEntry>;
export type StudyPacketProgressUpdateKind = 'reviewed' | 'starred' | 'snoozed' | 'reset';

export function studyPacketProgressKey(packet: StudyPacketProgressTarget): string {
  return packet.packetId || `hand:${packet.source.handId}`;
}

export function normalizeStudyPacketProgressEntry(raw: unknown): StudyPacketProgressEntry | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.packetId !== 'string' || typeof record.handId !== 'string') return null;
  return {
    packetId: record.packetId,
    handId: record.handId,
    ...(typeof record.reviewedAt === 'string' ? { reviewedAt: record.reviewedAt } : {}),
    ...(typeof record.snoozedAt === 'string' ? { snoozedAt: record.snoozedAt } : {}),
    ...(typeof record.lastDrilledAt === 'string' ? { lastDrilledAt: record.lastDrilledAt } : {}),
    ...(typeof record.nextDueAt === 'string' ? { nextDueAt: record.nextDueAt } : {}),
    repetitionCount: typeof record.repetitionCount === 'number' && Number.isFinite(record.repetitionCount)
      ? Math.max(0, Math.floor(record.repetitionCount))
      : 0,
    ...(typeof record.intervalDays === 'number' && Number.isFinite(record.intervalDays)
      ? { intervalDays: Math.max(1, Math.floor(record.intervalDays)) }
      : {}),
    starred: record.starred === true,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
  };
}

export function readStudyPacketProgress(): StudyPacketProgressStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STUDY_PACKET_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce<StudyPacketProgressStore>((store, [key, value]) => {
      const entry = normalizeStudyPacketProgressEntry(value);
      if (entry) store[key] = entry;
      return store;
    }, {});
  } catch {
    return {};
  }
}

export function writeStudyPacketProgress(progress: StudyPacketProgressStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDY_PACKET_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    return;
  }
}

function srsIntervalDays(repetitionCount: number): number {
  const safeCount = Number.isFinite(repetitionCount) ? Math.max(1, Math.floor(repetitionCount)) : 1;
  return STUDY_PACKET_SRS_INTERVAL_DAYS[Math.min(safeCount - 1, STUDY_PACKET_SRS_INTERVAL_DAYS.length - 1)]!;
}

function nextDueIso(fromIso: string, intervalDays: number): string {
  const base = Date.parse(fromIso);
  const baseTime = Number.isFinite(base) ? base : Date.now();
  return new Date(baseTime + intervalDays * MS_PER_DAY).toISOString();
}

export function isStudyPacketSrsDue(entry: StudyPacketProgressEntry | undefined, now = Date.now()): boolean {
  if (!entry?.nextDueAt || entry.snoozedAt) return false;
  const dueTime = Date.parse(entry.nextDueAt);
  return Number.isFinite(dueTime) && dueTime <= now;
}

export function selectNextStudyPacket<T extends StudyPacketProgressTarget>(
  packets: readonly T[],
  progress: StudyPacketProgressStore,
): T | null {
  if (packets.length === 0) return null;

  const actionablePacket = selectNextActionableStudyPacket(packets, progress);
  if (actionablePacket) return actionablePacket;

  return packets.find((packet) => !progress[studyPacketProgressKey(packet)]?.reviewedAt)
    ?? packets.find((packet) => !progress[studyPacketProgressKey(packet)]?.snoozedAt)
    ?? packets[0]!;
}

export function selectNextActionableStudyPacket<T extends StudyPacketProgressTarget>(
  packets: readonly T[],
  progress: StudyPacketProgressStore,
): T | null {
  if (packets.length === 0) return null;

  const duePackets = packets
    .filter((packet) => isStudyPacketSrsDue(progress[studyPacketProgressKey(packet)]))
    .sort((left, right) => {
      const leftDue = Date.parse(progress[studyPacketProgressKey(left)]?.nextDueAt ?? '') || 0;
      const rightDue = Date.parse(progress[studyPacketProgressKey(right)]?.nextDueAt ?? '') || 0;
      return leftDue - rightDue || studyPacketProgressKey(left).localeCompare(studyPacketProgressKey(right));
    });
  if (duePackets.length > 0) return duePackets[0]!;

  return packets.find((packet) => {
    const entry = progress[studyPacketProgressKey(packet)];
    return !entry?.reviewedAt && !entry?.snoozedAt;
  })
    ?? null;
}

export function buildStudyPacketArenaSession<T extends StudyPacketProgressTarget>(
  packets: readonly T[],
  selectedPacket: T | null | undefined,
  progress: StudyPacketProgressStore,
): T[] {
  if (!selectedPacket) return [];
  const sourcePackets = packets.length > 0 ? packets : [selectedPacket];
  const selectedKey = studyPacketProgressKey(selectedPacket);
  const routeablePackets = sourcePackets.filter((packet) => {
    const key = studyPacketProgressKey(packet);
    const entry = progress[key];
    if (key === selectedKey) return true;
    if (entry?.snoozedAt) return false;
    if (isStudyPacketSrsDue(entry)) return true;
    return !entry?.reviewedAt;
  });
  const duePackets = routeablePackets
    .filter((packet) => {
      const key = studyPacketProgressKey(packet);
      return key !== selectedKey && isStudyPacketSrsDue(progress[key]);
    })
    .sort((left, right) => {
      const leftDue = Date.parse(progress[studyPacketProgressKey(left)]?.nextDueAt ?? '') || 0;
      const rightDue = Date.parse(progress[studyPacketProgressKey(right)]?.nextDueAt ?? '') || 0;
      return leftDue - rightDue || studyPacketProgressKey(left).localeCompare(studyPacketProgressKey(right));
    });
  const untouchedPackets = routeablePackets.filter((packet) => {
    const key = studyPacketProgressKey(packet);
    return key !== selectedKey && !progress[key]?.reviewedAt;
  });
  const ordered = [selectedPacket, ...duePackets, ...untouchedPackets];
  const seenPacketKeys = new Set<string>();
  return ordered.filter((packet) => {
    const key = studyPacketProgressKey(packet);
    if (seenPacketKeys.has(key)) return false;
    seenPacketKeys.add(key);
    return true;
  });
}

function encodedListParam(values: readonly string[]): string {
  return values.map((value) => encodeURIComponent(value)).join(',');
}

function nonEmptyValues(values: readonly string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function buildStudyPacketArenaPathFromIds(
  handIds: readonly string[],
  packetIds: readonly string[] = [],
): string | null {
  const cleanHandIds = nonEmptyValues(handIds);
  const primaryHandId = cleanHandIds[0];
  if (!primaryHandId) return null;

  const query = [
    'drill=study-queue',
    `handId=${encodeURIComponent(primaryHandId)}`,
  ];
  if (cleanHandIds.length > 1) {
    query.push(`handIds=${encodedListParam(cleanHandIds)}`);
    const cleanPacketIds = nonEmptyValues(packetIds);
    if (cleanPacketIds.length > 0) query.push(`packetIds=${encodedListParam(cleanPacketIds)}`);
  }

  return `/arena?${query.join('&')}#study-packet-drill`;
}

export function buildStudyPacketArenaPath<T extends StudyPacketProgressTarget>(
  selectedPacket: T | null | undefined,
  packets: readonly T[],
  progress: StudyPacketProgressStore,
): string | null {
  if (!selectedPacket?.source.handId) return null;
  const sessionPackets = buildStudyPacketArenaSession(packets, selectedPacket, progress);
  const routePackets = sessionPackets.length > 0 ? sessionPackets : [selectedPacket];
  return buildStudyPacketArenaPathFromIds(
    routePackets.map((entry) => entry.source.handId),
    routePackets.map((entry) => entry.packetId || studyPacketProgressKey(entry)),
  );
}

export function studyPacketSrsStatusLabel(entry: StudyPacketProgressEntry | undefined, now = Date.now()): string {
  if (!entry?.reviewedAt) return 'SRS repeat starts after first review';
  if (!entry.nextDueAt) return 'SRS repeat not scheduled';
  const dueTime = Date.parse(entry.nextDueAt);
  if (!Number.isFinite(dueTime)) return 'SRS repeat date unavailable';
  if (entry.snoozedAt) return 'SRS repeat snoozed';
  if (dueTime <= now) return 'SRS repeat due now';
  const days = Math.max(1, Math.ceil((dueTime - now) / MS_PER_DAY));
  return `Next SRS repeat in ${days} day${days === 1 ? '' : 's'}`;
}

function baseProgressEntry(
  packet: StudyPacketProgressTarget,
  existing: StudyPacketProgressEntry | undefined,
  now: string,
): StudyPacketProgressEntry {
  return {
    ...existing,
    packetId: studyPacketProgressKey(packet),
    handId: packet.source.handId,
    repetitionCount: existing?.repetitionCount ?? 0,
    starred: existing?.starred ?? false,
    updatedAt: now,
  };
}

export function resetStudyPacketProgress(
  progress: StudyPacketProgressStore,
  packet: StudyPacketProgressTarget,
): StudyPacketProgressStore {
  const key = studyPacketProgressKey(packet);
  if (!(key in progress)) return progress;
  const next = { ...progress };
  delete next[key];
  return next;
}

export function updateStudyPacketProgress(
  progress: StudyPacketProgressStore,
  packet: StudyPacketProgressTarget,
  kind: StudyPacketProgressUpdateKind,
  now = new Date().toISOString(),
): StudyPacketProgressStore {
  if (kind === 'reset') return resetStudyPacketProgress(progress, packet);

  const key = studyPacketProgressKey(packet);
  const existing = normalizeStudyPacketProgressEntry(progress[key]);
  const updated = baseProgressEntry(packet, existing ?? undefined, now);

  if (kind === 'reviewed') {
    const repetitionCount = (existing?.repetitionCount ?? 0) + 1;
    const intervalDays = srsIntervalDays(repetitionCount);
    updated.reviewedAt = now;
    updated.lastDrilledAt = now;
    updated.repetitionCount = repetitionCount;
    updated.intervalDays = intervalDays;
    updated.nextDueAt = nextDueIso(now, intervalDays);
    delete updated.snoozedAt;
  }

  if (kind === 'starred') updated.starred = !existing?.starred;

  if (kind === 'snoozed') {
    if (existing?.snoozedAt) delete updated.snoozedAt;
    else updated.snoozedAt = now;
  }

  return { ...progress, [key]: updated };
}

export function recordStudyPacketReview(packet: StudyPacketProgressTarget): StudyPacketProgressEntry {
  const next = updateStudyPacketProgress(readStudyPacketProgress(), packet, 'reviewed');
  writeStudyPacketProgress(next);
  return next[studyPacketProgressKey(packet)]!;
}

export function studyPacketNextDueLabel(packet: StudyPacketProgressTarget | null, now = Date.now()): string {
  if (!packet) return 'Next local SRS repeat was not scheduled because this imported hand could not be rehydrated into a packet.';
  const entry = readStudyPacketProgress()[studyPacketProgressKey(packet)];
  if (!entry?.nextDueAt) return 'Next local SRS repeat was not scheduled for this packet yet.';
  const dueTime = Date.parse(entry.nextDueAt);
  if (!Number.isFinite(dueTime)) return 'Next local SRS repeat date is unavailable for this packet.';
  const remainingDays = Math.max(1, Math.ceil((dueTime - now) / MS_PER_DAY));
  return `Next local SRS repeat in ${remainingDays} day${remainingDays === 1 ? '' : 's'} from browser-only packet progress.`;
}
