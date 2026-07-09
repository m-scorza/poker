// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  STUDY_PACKET_PROGRESS_STORAGE_KEY,
  buildStudyPacketArenaPath,
  buildStudyPacketArenaPathFromIds,
  buildStudyPacketArenaSession,
  isStudyPacketSrsDue,
  normalizeStudyPacketProgressEntry,
  readStudyPacketProgress,
  recordStudyPacketReview,
  resetStudyPacketProgress,
  selectNextActionableStudyPacket,
  selectNextStudyPacket,
  studyPacketNextDueLabel,
  studyPacketProgressKey,
  studyPacketSrsStatusLabel,
  updateStudyPacketProgress,
  type StudyPacketProgressTarget,
} from '../studyPacketProgress';

function installMemoryStorage(): void {
  const backing = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return backing.size;
    },
    clear: () => backing.clear(),
    getItem: (key) => backing.get(key) ?? null,
    key: (index) => Array.from(backing.keys())[index] ?? null,
    removeItem: (key) => {
      backing.delete(key);
    },
    setItem: (key, value) => {
      backing.set(key, value);
    },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: memoryStorage });
}

const packet: StudyPacketProgressTarget = {
  packetId: 'spot-a',
  source: { handId: 'hand-a' },
};

describe('studyPacketProgress', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('normalizes legacy entries and derives a stable fallback key', () => {
    expect(studyPacketProgressKey({ packetId: '', source: { handId: 'legacy-hand' } })).toBe('hand:legacy-hand');
    expect(normalizeStudyPacketProgressEntry({ packetId: 'spot-a', handId: 'hand-a' })).toMatchObject({
      packetId: 'spot-a',
      handId: 'hand-a',
      repetitionCount: 0,
      starred: false,
      updatedAt: '1970-01-01T00:00:00.000Z',
    });
    expect(normalizeStudyPacketProgressEntry({ packetId: 'spot-a' })).toBeNull();
  });

  it('marks reviews with SRS metadata while clearing snoozed state', () => {
    const next = updateStudyPacketProgress(
      {
        'spot-a': {
          packetId: 'spot-a',
          handId: 'hand-a',
          reviewedAt: '2026-06-10T12:00:00.000Z',
          snoozedAt: '2026-06-10T13:00:00.000Z',
          lastDrilledAt: '2026-06-10T12:00:00.000Z',
          nextDueAt: '2026-06-11T12:00:00.000Z',
          repetitionCount: 1,
          intervalDays: 1,
          starred: true,
          updatedAt: '2026-06-10T13:00:00.000Z',
        },
      },
      packet,
      'reviewed',
      '2026-06-12T12:00:00.000Z',
    );

    expect(next['spot-a']).toMatchObject({
      packetId: 'spot-a',
      handId: 'hand-a',
      reviewedAt: '2026-06-12T12:00:00.000Z',
      lastDrilledAt: '2026-06-12T12:00:00.000Z',
      nextDueAt: '2026-06-15T12:00:00.000Z',
      repetitionCount: 2,
      intervalDays: 3,
      starred: true,
      updatedAt: '2026-06-12T12:00:00.000Z',
    });
    expect(next['spot-a']?.snoozedAt).toBeUndefined();
  });

  it('labels due, future, and snoozed SRS states consistently', () => {
    const dueEntry = updateStudyPacketProgress({}, packet, 'reviewed', '2026-06-12T12:00:00.000Z')['spot-a'];
    expect(dueEntry).toBeDefined();
    expect(isStudyPacketSrsDue(dueEntry, Date.parse('2026-06-13T12:00:00.000Z'))).toBe(true);
    expect(studyPacketSrsStatusLabel(dueEntry, Date.parse('2026-06-13T12:00:00.000Z'))).toBe('SRS repeat due now');
    expect(studyPacketSrsStatusLabel(dueEntry, Date.parse('2026-06-12T13:00:00.000Z'))).toBe('Next SRS repeat in 1 day');

    const snoozedEntry = updateStudyPacketProgress({ 'spot-a': dueEntry! }, packet, 'snoozed', '2026-06-13T13:00:00.000Z')['spot-a'];
    expect(isStudyPacketSrsDue(snoozedEntry, Date.parse('2026-06-14T12:00:00.000Z'))).toBe(false);
    expect(studyPacketSrsStatusLabel(snoozedEntry, Date.parse('2026-06-14T12:00:00.000Z'))).toBe('SRS repeat snoozed');
  });

  it('selects due packets before untouched packets and skips snoozed routing first', () => {
    const duePacket: StudyPacketProgressTarget = { packetId: 'spot-due', source: { handId: 'hand-due' } };
    const untouchedPacket: StudyPacketProgressTarget = { packetId: 'spot-untouched', source: { handId: 'hand-untouched' } };
    const snoozedPacket: StudyPacketProgressTarget = { packetId: 'spot-snoozed', source: { handId: 'hand-snoozed' } };
    const progress = {
      ...updateStudyPacketProgress({}, duePacket, 'reviewed', '2026-06-10T12:00:00.000Z'),
      ...updateStudyPacketProgress({}, snoozedPacket, 'snoozed', '2026-06-12T12:00:00.000Z'),
    };

    expect(selectNextActionableStudyPacket([snoozedPacket, untouchedPacket, duePacket], progress)?.packetId).toBe('spot-due');
    expect(selectNextStudyPacket([snoozedPacket, untouchedPacket, duePacket], progress)?.packetId).toBe('spot-due');
    expect(buildStudyPacketArenaSession([snoozedPacket, untouchedPacket, duePacket], duePacket, progress).map((entry) => entry.packetId)).toEqual([
      'spot-due',
      'spot-untouched',
    ]);
    expect(buildStudyPacketArenaPath(duePacket, [snoozedPacket, untouchedPacket, duePacket], progress)).toBe(
      '/arena?drill=study-queue&handId=hand-due&handIds=hand-due,hand-untouched&packetIds=spot-due,spot-untouched#study-packet-drill',
    );
    expect(buildStudyPacketArenaPathFromIds([' hand one ', 'hand/two'], ['spot one', 'spot/two'])).toBe(
      '/arena?drill=study-queue&handId=hand%20one&handIds=hand%20one,hand%2Ftwo&packetIds=spot%20one,spot%2Ftwo#study-packet-drill',
    );

    const notDueProgress = updateStudyPacketProgress({}, snoozedPacket, 'snoozed', '2026-06-12T12:00:00.000Z');
    expect(selectNextActionableStudyPacket([snoozedPacket, untouchedPacket], notDueProgress)?.packetId).toBe('spot-untouched');
    expect(selectNextStudyPacket([snoozedPacket, untouchedPacket], notDueProgress)?.packetId).toBe('spot-untouched');
  });

  it('returns no actionable packet when all packets are snoozed or waiting for future SRS', () => {
    const firstSnoozedPacket: StudyPacketProgressTarget = { packetId: 'spot-snoozed-a', source: { handId: 'hand-snoozed-a' } };
    const secondSnoozedPacket: StudyPacketProgressTarget = { packetId: 'spot-snoozed-b', source: { handId: 'hand-snoozed-b' } };
    const allSnoozedProgress = {
      ...updateStudyPacketProgress({}, firstSnoozedPacket, 'snoozed', '2026-06-12T12:00:00.000Z'),
      ...updateStudyPacketProgress({}, secondSnoozedPacket, 'snoozed', '2026-06-12T12:05:00.000Z'),
    };

    expect(selectNextActionableStudyPacket([firstSnoozedPacket, secondSnoozedPacket], allSnoozedProgress)).toBeNull();
    expect(selectNextStudyPacket([firstSnoozedPacket, secondSnoozedPacket], allSnoozedProgress)?.packetId).toBe('spot-snoozed-a');
    expect(buildStudyPacketArenaPath(
      selectNextActionableStudyPacket([firstSnoozedPacket, secondSnoozedPacket], allSnoozedProgress),
      [firstSnoozedPacket, secondSnoozedPacket],
      allSnoozedProgress,
    )).toBeNull();

    const firstFuturePacket: StudyPacketProgressTarget = { packetId: 'spot-future-a', source: { handId: 'hand-future-a' } };
    const secondFuturePacket: StudyPacketProgressTarget = { packetId: 'spot-future-b', source: { handId: 'hand-future-b' } };
    const futureProgress = {
      ...updateStudyPacketProgress({}, firstFuturePacket, 'reviewed', '2099-01-01T12:00:00.000Z'),
      ...updateStudyPacketProgress({}, secondFuturePacket, 'reviewed', '2099-01-02T12:00:00.000Z'),
    };

    expect(selectNextActionableStudyPacket([firstFuturePacket, secondFuturePacket], futureProgress)).toBeNull();
    expect(selectNextStudyPacket([firstFuturePacket, secondFuturePacket], futureProgress)?.packetId).toBe('spot-future-a');
    expect(buildStudyPacketArenaPath(
      selectNextActionableStudyPacket([firstFuturePacket, secondFuturePacket], futureProgress),
      [firstFuturePacket, secondFuturePacket],
      futureProgress,
    )).toBeNull();
  });

  it('keeps reviewed packets out of multi-packet Arena routes until their SRS date is due', () => {
    const duePacket: StudyPacketProgressTarget = { packetId: 'spot-due', source: { handId: 'hand-due' } };
    const untouchedPacket: StudyPacketProgressTarget = { packetId: 'spot-untouched', source: { handId: 'hand-untouched' } };
    const futureReviewedPacket: StudyPacketProgressTarget = { packetId: 'spot-future', source: { handId: 'hand-future' } };
    const progress = {
      ...updateStudyPacketProgress({}, duePacket, 'reviewed', '2026-06-10T12:00:00.000Z'),
      ...updateStudyPacketProgress({}, futureReviewedPacket, 'reviewed', '2099-01-01T12:00:00.000Z'),
    };

    expect(buildStudyPacketArenaSession(
      [futureReviewedPacket, untouchedPacket, duePacket],
      duePacket,
      progress,
    ).map((entry) => entry.packetId)).toEqual([
      'spot-due',
      'spot-untouched',
    ]);
    expect(buildStudyPacketArenaPath(duePacket, [futureReviewedPacket, untouchedPacket, duePacket], progress)).toBe(
      '/arena?drill=study-queue&handId=hand-due&handIds=hand-due,hand-untouched&packetIds=spot-due,spot-untouched#study-packet-drill',
    );
  });

  it('resets a single packet progress entry without touching other local markers', () => {
    const otherPacket: StudyPacketProgressTarget = { packetId: 'spot-b', source: { handId: 'hand-b' } };
    const progress = {
      ...updateStudyPacketProgress({}, packet, 'reviewed', '2026-06-12T12:00:00.000Z'),
      ...updateStudyPacketProgress({}, otherPacket, 'starred', '2026-06-12T12:05:00.000Z'),
    };

    const reset = resetStudyPacketProgress(progress, packet);

    expect(reset['spot-a']).toBeUndefined();
    expect(reset['spot-b']).toMatchObject({
      packetId: 'spot-b',
      handId: 'hand-b',
      starred: true,
      repetitionCount: 0,
    });
    expect(updateStudyPacketProgress(progress, packet, 'reset')).toEqual(reset);
  });

  it('records browser-local review progress without retaining packet payload fields', () => {
    const packetWithPayload = {
      packetId: 'spot-payload',
      source: { handId: 'hand-payload' },
      rawVillainName: 'VillainA',
    };

    recordStudyPacketReview(packetWithPayload);

    const raw = window.localStorage.getItem(STUDY_PACKET_PROGRESS_STORAGE_KEY) ?? '';
    expect(raw).toContain('spot-payload');
    expect(raw).not.toContain('VillainA');
    expect(readStudyPacketProgress()['spot-payload']).toMatchObject({
      packetId: 'spot-payload',
      handId: 'hand-payload',
      repetitionCount: 1,
      intervalDays: 1,
      starred: false,
    });
    expect(studyPacketNextDueLabel(packetWithPayload)).toContain('Next local SRS repeat in');
  });
});
