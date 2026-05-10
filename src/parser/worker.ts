/**
 * Unified Web Worker for parsing Poker hand history and summary files.
 * Offloads regex parsing and compliance checking from the main thread.
 * Supports PokerStars and GGPoker (skeleton).
 */

import { parsePokerStarsFile } from './pokerstars';
import { parseTournamentSummary } from './tournamentSummary';
import { parseGGPokerFile, parseGGPokerSummary } from './ggpoker';
import { parseOpenHandHistoryFile } from './openHandHistory';
import { identifyFile } from './siteIdentifier';
import { buildHeroDecision } from '../analysis/scenarioDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import type { ParsedHand } from './pokerstars';
import type { HeroDecision } from '../types/analysis';
import type { ParsedTournamentSummary } from './tournamentSummary';

// Standard worker context
const ctx: Worker = self as any;

interface WorkerFilePayload {
  name: string;
  content: string;
}

type WorkerMessage =
  | { type: 'PROGRESS'; progress: number; filename: string; handsFound: number; summariesFound: number; deviationsFound: number }
  | { type: 'FILE_ERROR'; progress: number; filename: string; error: string }
  | { type: 'COMPLETE'; hands: any[]; summaries: ParsedTournamentSummary[] };

function postWorkerMessage(message: WorkerMessage): void {
  ctx.postMessage(message);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

ctx.onmessage = async (e: MessageEvent) => {
  const { files, heroName, profile, icmStage } = e.data as {
    files: WorkerFilePayload[];
    heroName: string;
    profile: Parameters<typeof batchCheckCompliance>[1];
    icmStage: Parameters<typeof batchCheckCompliance>[2];
  };
  
  const allHands: any[] = [];
  const allSummaries: ParsedTournamentSummary[] = [];
  let totalFiles = files.length;
  let processedFiles = 0;

  for (const file of files) {
    try {
      const identity = identifyFile(file.content);
      
      if (identity.type === 'hand_history') {
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
          // 2. Build decision data
          const heroDecision = buildHeroDecision(parsed, heroName);
          
          // 3. Check compliance if decision exists
          let compliantDecision: HeroDecision | undefined = undefined;
          if (heroDecision) {
            [compliantDecision] = batchCheckCompliance([heroDecision], profile, icmStage);
          }

          return {
            hand: parsed.hand,
            players: parsed.players,
            actions: parsed.actions,
            tournament: parsed.tournament,
            heroDecision: compliantDecision
          };
        });

        allHands.push(...handsToImport);
        
        postWorkerMessage({
          type: 'PROGRESS',
          progress: ((processedFiles + 1) / totalFiles) * 100,
          filename: file.name,
          handsFound: handsToImport.length,
          summariesFound: 0,
          deviationsFound: handsToImport.filter(h => h.heroDecision && !h.heroDecision.isCompliant).length
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
        }
        
        postWorkerMessage({
          type: 'PROGRESS',
          progress: ((processedFiles + 1) / totalFiles) * 100,
          filename: file.name,
          handsFound: 0,
          summariesFound: summary ? 1 : 0,
          deviationsFound: 0
        });
      }

      processedFiles++;
    } catch (err) {
      const progress = ((processedFiles + 1) / totalFiles) * 100;
      postWorkerMessage({
        type: 'FILE_ERROR',
        progress,
        filename: file.name,
        error: errorMessage(err),
      });
      processedFiles++; // Still count as processed to avoid progress stuck
    }
  }

  postWorkerMessage({
    type: 'COMPLETE',
    hands: allHands,
    summaries: allSummaries
  });
};
