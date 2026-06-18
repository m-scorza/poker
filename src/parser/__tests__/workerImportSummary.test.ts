import { describe, expect, it } from 'vitest';
import { processWorkerFiles, type WorkerMessage } from '../workerProcessor';
import { HAND_FULL_STREETS } from '../../test/fixtures/sample-hands';
import type { StrategyProfile, ICMStage } from '../../data/strategyProfiles';

const collectWorkerMessages = async (files: Array<{ name: string; content: string }>) => {
  const messages: WorkerMessage[] = [];
  await processWorkerFiles(
    {
      files,
      heroName: 'scorza23',
      profile: 'game_plan' as StrategyProfile,
      icmStage: 'early' as ICMStage,
    },
    (message) => messages.push(message),
  );
  return messages;
};

describe('processWorkerFiles import summary', () => {
  it('reports unknown files as per-file errors and completes with low confidence', async () => {
    const messages = await collectWorkerMessages([
      { name: 'notes.csv', content: 'player,notes\nVillain,likes to limp' },
    ]);

    expect(messages).toContainEqual(expect.objectContaining({
      type: 'FILE_ERROR',
      filename: 'notes.csv',
      error: expect.stringContaining('Unsupported or unrecognized poker file'),
    }));

    const complete = messages[messages.length - 1];
    expect(complete).toMatchObject({
      type: 'COMPLETE',
      hands: [],
      summaries: [],
      importSummary: {
        totalFiles: 1,
        parsedFiles: 0,
        failedFiles: 1,
        handsFound: 0,
        summariesFound: 0,
        confidence: 'low',
        warnings: [expect.stringContaining('notes.csv')],
      },
    });
  });

  it('downgrades mixed successful and failed imports to medium confidence', async () => {
    const messages = await collectWorkerMessages([
      { name: 'stars-good.txt', content: HAND_FULL_STREETS },
      { name: 'notes.csv', content: 'player,notes\nVillain,likes to limp' },
    ]);

    const complete = messages[messages.length - 1];
    expect(complete).toMatchObject({
      type: 'COMPLETE',
      importSummary: {
        totalFiles: 2,
        parsedFiles: 1,
        failedFiles: 1,
        handsFound: 1,
        confidence: 'medium',
        warnings: [expect.stringContaining('notes.csv')],
      },
    });
  });

  // CQ-4: a hand block that carries a `Hand #` header but cannot be parsed
  // (here: no valid date line) must be surfaced as a warning and pull the
  // file's confidence down — it can no longer report silently as "high".
  it('reports per-hand parse drops within an otherwise-parseable file', async () => {
    const corruptedBlock = [
      "PokerStars Hand #999999999: Tournament #1, $1.00+$0.00 USD Hold'em No Limit - Level I (10/20)",
      "Table 'x 1' 9-max Seat #1 is the button",
      'Seat 1: alpha (1500 in chips)',
      'Seat 2: beta (1500 in chips)',
    ].join('\n');

    const messages = await collectWorkerMessages([
      { name: 'stars-partial.txt', content: `${HAND_FULL_STREETS}\n\n\n${corruptedBlock}` },
    ]);

    const complete = messages[messages.length - 1];
    expect(complete).toMatchObject({
      type: 'COMPLETE',
      importSummary: {
        totalFiles: 1,
        parsedFiles: 1,
        failedFiles: 0,
        handsFound: 1,
        confidence: 'medium',
        warnings: [expect.stringContaining('could not be parsed')],
      },
    });
  });
});
