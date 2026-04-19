/**
 * Unified Web Worker for parsing Poker hand history and summary files.
 * Offloads regex parsing and compliance checking from the main thread.
 * Supports PokerStars and GGPoker (skeleton).
 */

import { parsePokerStarsFile } from './pokerstars';
import { parseTournamentSummary } from './tournamentSummary';
import { parseGGPokerFile, parseGGPokerSummary } from './ggpoker';
import { identifyFile } from './siteIdentifier';
import { buildHeroDecision } from '../analysis/scenarioDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import type { ParsedHand } from './pokerstars';
import type { HeroDecision } from '../types/analysis';
import type { ParsedTournamentSummary } from './tournamentSummary';

// Standard worker context
const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent) => {
  const { files, heroName, profile, icmStage } = e.data;
  
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
        
        ctx.postMessage({
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
        
        ctx.postMessage({
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
      console.error(`Worker failed to parse ${file.name}:`, err);
      processedFiles++; // Still count as processed to avoid progress stuck
    }
  }

  ctx.postMessage({
    type: 'COMPLETE',
    hands: allHands,
    summaries: allSummaries
  });
};
