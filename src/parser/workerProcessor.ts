import { buildHeroDecision } from '../analysis/scenarioDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import type { HeroDecision } from '../types/analysis';
import type { Hand, PlayerInHand, Action, Tournament } from '../types/hand';
import { parseGGPokerFile, parseGGPokerSummary } from './ggpoker';
import { parseOpenHandHistoryFile } from './openHandHistory';
import { parsePokerStarsFile, type ParsedHand } from './pokerstars';
import { identifyFile } from './siteIdentifier';
import { parseTournamentSummary, type ParsedTournamentSummary } from './tournamentSummary';

export interface ImportedHandEntry {
  hand: Hand;
  players: PlayerInHand[];
  actions: Action[];
  tournament: Partial<Tournament>;
  heroDecision?: HeroDecision;
}

export interface WorkerFilePayload {
  name: string;
  content: string;
}

export const MAX_PARSER_INPUT_BYTES = 20 * 1024 * 1024;

export type ImportConfidence = 'high' | 'medium' | 'low';

export interface ImportSummary {
  totalFiles: number;
  parsedFiles: number;
  failedFiles: number;
  handsFound: number;
  summariesFound: number;
  confidence: ImportConfidence;
  warnings: string[];
}

export type WorkerMessage =
  | { type: 'PROGRESS'; progress: number; filename: string; handsFound: number; summariesFound: number; deviationsFound: number }
  | { type: 'FILE_ERROR'; progress: number; filename: string; error: string }
  | { type: 'COMPLETE'; hands: ImportedHandEntry[]; summaries: ParsedTournamentSummary[]; importSummary: ImportSummary };

export interface WorkerPayload {
  files: WorkerFilePayload[];
  heroName: string;
  profile: Parameters<typeof batchCheckCompliance>[1];
  icmStage: Parameters<typeof batchCheckCompliance>[2];
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function processWorkerFiles(
  payload: WorkerPayload,
  postMessage: (message: WorkerMessage) => void,
): Promise<void> {
  const { files, heroName, profile, icmStage } = payload;
  const allHands: ImportedHandEntry[] = [];
  const allSummaries: ParsedTournamentSummary[] = [];
  const totalFiles = files.length;
  let processedFiles = 0;
  let parsedFiles = 0;
  let failedFiles = 0;
  const warnings: string[] = [];

  const fileProgress = () => totalFiles === 0 ? 100 : ((processedFiles + 1) / totalFiles) * 100;

  const recordFileError = (file: WorkerFilePayload, message: string) => {
    const warning = `${file.name}: ${message}`;
    failedFiles++;
    warnings.push(warning);
    postMessage({
      type: 'FILE_ERROR',
      progress: fileProgress(),
      filename: file.name,
      error: message,
    });
  };

  for (const file of files) {
    try {
      if (file.content.length > MAX_PARSER_INPUT_BYTES) {
        recordFileError(file, `File body exceeded parser limit (${(file.content.length / (1024 * 1024)).toFixed(1)} MB > ${(MAX_PARSER_INPUT_BYTES / (1024 * 1024)).toFixed(0)} MB).`);
        processedFiles++;
        continue;
      }
      const identity = identifyFile(file.content);

      if (identity.type === 'unknown') {
        recordFileError(file, 'Unsupported or unrecognized poker file. Upload PokerStars/GGPoker hand histories, tournament summaries, Open Hand History JSON, or ZIPs containing those files.');
      } else if (identity.type === 'hand_history') {
        let parsedHands: ParsedHand[] = [];

        if (identity.site === 'pokerstars') {
          parsedHands = parsePokerStarsFile(file.content, heroName);
        } else if (identity.site === 'ggpoker') {
          parsedHands = parseGGPokerFile(file.content, heroName);
        } else if (identity.site === 'open_hand_history') {
          parsedHands = parseOpenHandHistoryFile(file.content, heroName);
        } else {
          throw new Error('Recognized poker room, but native parsing is not available yet. Convert/export as Open Hand History JSON or provide a raw export sample so a safe adapter can be added.');
        }

        const handsToImport = parsedHands.map(parsed => {
          const heroDecision = buildHeroDecision(parsed, heroName, profile);
          let compliantDecision: HeroDecision | undefined = undefined;
          if (heroDecision) {
            [compliantDecision] = batchCheckCompliance([heroDecision], profile, icmStage);
          }

          return {
            hand: parsed.hand,
            players: parsed.players,
            actions: parsed.actions,
            tournament: parsed.tournament,
            heroDecision: compliantDecision,
          };
        });

        allHands.push(...handsToImport);
        parsedFiles++;

        postMessage({
          type: 'PROGRESS',
          progress: fileProgress(),
          filename: file.name,
          handsFound: handsToImport.length,
          summariesFound: 0,
          deviationsFound: handsToImport.filter(h => h.heroDecision && !h.heroDecision.isCompliant).length,
        });
      } else if (identity.type === 'tournament_summary') {
        let summary: ParsedTournamentSummary | null = null;

        if (identity.site === 'pokerstars') {
          summary = parseTournamentSummary(file.content, heroName);
        } else if (identity.site === 'ggpoker') {
          summary = parseGGPokerSummary(file.content, heroName);
        }

        if (summary) {
          allSummaries.push(summary);
          parsedFiles++;
        } else {
          recordFileError(file, 'Recognized tournament summary but no summary records were recovered.');
        }

        postMessage({
          type: 'PROGRESS',
          progress: fileProgress(),
          filename: file.name,
          handsFound: 0,
          summariesFound: summary ? 1 : 0,
          deviationsFound: 0,
        });
      }

      processedFiles++;
    } catch (err) {
      recordFileError(file, errorMessage(err));
      processedFiles++;
    }
  }

  const confidence: ImportConfidence = parsedFiles === 0 || failedFiles === totalFiles
    ? 'low'
    : failedFiles > 0 || warnings.length > 0
      ? 'medium'
      : 'high';

  postMessage({
    type: 'COMPLETE',
    hands: allHands,
    summaries: allSummaries,
    importSummary: {
      totalFiles,
      parsedFiles,
      failedFiles,
      handsFound: allHands.length,
      summariesFound: allSummaries.length,
      confidence,
      warnings: warnings.slice(0, 20),
    },
  });
}
