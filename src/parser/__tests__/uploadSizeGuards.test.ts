import { describe, expect, it } from 'vitest';
import { parsePokerStarsFile, MAX_HAND_HISTORY_INPUT_BYTES } from '../pokerstars';
import { parseGGPokerFile } from '../ggpoker';
import { parseOpenHandHistoryFile } from '../openHandHistory';
import { processWorkerFiles, MAX_PARSER_INPUT_BYTES, type WorkerMessage } from '../workerProcessor';
import type { StrategyProfile, ICMStage } from '../../data/strategyProfiles';

const oneMb = 1024 * 1024;

describe('parser size guards', () => {
  it('parsePokerStarsFile returns [] for oversized input without throwing', () => {
    const huge = 'x'.repeat(MAX_HAND_HISTORY_INPUT_BYTES + 1);
    expect(parsePokerStarsFile(huge)).toEqual([]);
  });

  it('parseGGPokerFile returns [] for oversized input without throwing', () => {
    const huge = 'x'.repeat(MAX_HAND_HISTORY_INPUT_BYTES + 1);
    expect(parseGGPokerFile(huge)).toEqual([]);
  });

  it('parseOpenHandHistoryFile returns [] for oversized input without throwing', () => {
    const huge = 'x'.repeat(MAX_HAND_HISTORY_INPUT_BYTES + 1);
    expect(parseOpenHandHistoryFile(huge)).toEqual([]);
  });
});

describe('processWorkerFiles defensive bail', () => {
  it('emits FILE_ERROR for content above MAX_PARSER_INPUT_BYTES and skips parsing', async () => {
    const oversized = 'x'.repeat(MAX_PARSER_INPUT_BYTES + 1);
    const messages: WorkerMessage[] = [];
    await processWorkerFiles(
      {
        files: [{ name: 'bomb.txt', content: oversized }],
        heroName: 'scorza23',
        profile: 'game_plan' as StrategyProfile,
        icmStage: 'early' as ICMStage,
      },
      (m) => messages.push(m),
    );

    expect(messages).toContainEqual(expect.objectContaining({
      type: 'FILE_ERROR',
      filename: 'bomb.txt',
      error: expect.stringContaining('parser limit'),
    }));

    const complete = messages[messages.length - 1];
    expect(complete).toMatchObject({
      type: 'COMPLETE',
      hands: [],
      summaries: [],
      importSummary: { totalFiles: 1, parsedFiles: 0, failedFiles: 1 },
    });
  });

  it('still processes legitimately sized files in the same batch', async () => {
    const oversized = 'x'.repeat(MAX_PARSER_INPUT_BYTES + 1);
    const small = 'not a recognized poker file body — size: ' + oneMb;
    const messages: WorkerMessage[] = [];
    await processWorkerFiles(
      {
        files: [
          { name: 'bomb.txt', content: oversized },
          { name: 'small.txt', content: small },
        ],
        heroName: 'scorza23',
        profile: 'game_plan' as StrategyProfile,
        icmStage: 'early' as ICMStage,
      },
      (m) => messages.push(m),
    );

    const errors = messages.filter((m) => m.type === 'FILE_ERROR');
    expect(errors).toHaveLength(2);
    expect(errors.find((m) => m.type === 'FILE_ERROR' && m.filename === 'bomb.txt')?.type)
      .toBe('FILE_ERROR');

    const complete = messages[messages.length - 1];
    expect(complete).toMatchObject({
      type: 'COMPLETE',
      importSummary: { totalFiles: 2, failedFiles: 2 },
    });
  });
});
