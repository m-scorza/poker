import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../store';
import {
  BACKUP_FORMAT,
  BACKUP_TABLES,
  backupCounts,
  backupFileName,
  buildBackup,
  liveCounts,
  parseBackup,
  restoreBackup,
  serializeBackup,
} from '../backup';
import type { Hand } from '../../types/hand';

function hand(id: string, date: Date): Hand {
  return {
    id,
    tournamentId: 't1',
    date,
    level: 1,
    smallBlind: 50,
    bigBlind: 100,
    ante: 0,
    maxSeats: 9,
    activePlayers: 9,
    buttonSeat: 1,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 300,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: 10000,
    heroChipsAfter: 10100,
    villainDeltas: [{ name: 'villain1', net: -100 }],
  };
}

async function clearAll() {
  for (const name of BACKUP_TABLES) {
    await db.table(name).clear();
  }
}

describe('Data Vault backup/restore', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('round-trips every table through serialize → parse → replace, reviving Dates', async () => {
    const when = new Date('2026-05-01T12:34:56.000Z');
    await db.hands.put(hand('h1', when));
    await db.settings.put({ id: 'global', heroName: 'testhero' });
    await db.villains.put({ playerName: 'villain1' } as never);

    const json = serializeBackup(await buildBackup());
    await clearAll();
    expect((await liveCounts()).hands).toBe(0);

    const parsed = parseBackup(json);
    const after = await restoreBackup(parsed, 'replace');

    expect(after.hands).toBe(1);
    expect(after.settings).toBe(1);
    expect(after.villains).toBe(1);
    const restored = await db.hands.get('h1');
    expect(restored?.date).toBeInstanceOf(Date);
    expect(restored?.date.toISOString()).toBe(when.toISOString());
    expect(restored?.villainDeltas).toEqual([{ name: 'villain1', net: -100 }]);
    expect((await db.settings.get('global'))?.heroName).toBe('testhero');
  });

  it('merge keeps rows the backup does not mention; replace removes them', async () => {
    await db.hands.put(hand('backup-only', new Date('2026-05-01T10:00:00Z')));
    const json = serializeBackup(await buildBackup());

    await clearAll();
    await db.hands.put(hand('current-only', new Date('2026-06-01T10:00:00Z')));

    const merged = await restoreBackup(parseBackup(json), 'merge');
    expect(merged.hands).toBe(2);
    expect(await db.hands.get('current-only')).toBeDefined();
    expect(await db.hands.get('backup-only')).toBeDefined();

    const replaced = await restoreBackup(parseBackup(json), 'replace');
    expect(replaced.hands).toBe(1);
    expect(await db.hands.get('current-only')).toBeUndefined();
  });

  it('refuses a backup from a different schema version and says why', async () => {
    const json = serializeBackup(await buildBackup());
    const tampered = json.replace(`"schemaVersion":${db.verno}`, '"schemaVersion":1');
    expect(() => parseBackup(tampered)).toThrowError(/schema v1.*running schema/s);
  });

  it('refuses non-backup files with a plain message', () => {
    expect(() => parseBackup('not json at all')).toThrowError(/not valid JSON/);
    expect(() => parseBackup('{"some":"json"}')).toThrowError(/not a vault backup/);
    expect(() => parseBackup('[1,2,3]')).toThrowError(/not a vault backup/);
  });

  it('refuses a truncated backup missing a table', async () => {
    const backup = await buildBackup();
    const withoutVillains = JSON.parse(serializeBackup(backup)) as { tables: Record<string, unknown> };
    delete withoutVillains.tables.villains;
    expect(() => parseBackup(JSON.stringify(withoutVillains))).toThrowError(/missing the "villains" table/);
  });

  it('does not revive user data that merely looks like a date tag', async () => {
    await db.settings.put({ id: 'global', heroName: 'x' });
    const backup = await buildBackup();
    // A hand note-ish payload containing $date plus other keys must survive as-is.
    backup.tables.settings.push({ id: 'weird', heroName: 'y', extra: { $date: 'not-a-tag', more: 1 } } as never);
    const reparsed = parseBackup(serializeBackup(backup));
    const weird = reparsed.tables.settings.find((s) => (s as { id: string }).id === 'weird') as {
      extra: { $date: string; more: number };
    };
    expect(weird.extra).toEqual({ $date: 'not-a-tag', more: 1 });
  });

  it('counts what it exports', async () => {
    await db.hands.bulkPut([hand('a', new Date()), hand('b', new Date())]);
    const backup = await buildBackup();
    const counts = backupCounts(backup);
    expect(counts.hands).toBe(2);
    expect(counts.actions).toBe(0);
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backupFileName(new Date('2026-07-07T22:00:00Z'))).toBe('poker-analyzer-backup-2026-07-07.json');
  });
});
