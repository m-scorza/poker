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
});
