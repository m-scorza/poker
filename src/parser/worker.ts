/**
 * Web Worker for parsing PokerStars hand history files.
 * Offloads regex parsing and compliance checking from the main thread.
 */

import { parsePokerStarsFile } from './pokerstars';
import { buildHeroDecision } from '../analysis/scenarioDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import type { ParsedHand } from './pokerstars';
import type { HeroDecision } from '../types/analysis';

// Standard worker context
const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent) => {
  const { files, heroName, profile, icmStage } = e.data;
  
  const allHands: any[] = [];
  let totalFiles = files.length;
  let processedFiles = 0;

  for (const file of files) {
    try {
      // 1. Parse raw text
      const parsedHands: ParsedHand[] = parsePokerStarsFile(file.content, heroName);
      
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
      
      // 4. Report progress per file
      processedFiles++;
      ctx.postMessage({
        type: 'PROGRESS',
        progress: (processedFiles / totalFiles) * 100,
        filename: file.name,
        handsFound: handsToImport.length,
        deviationsFound: handsToImport.filter(h => h.heroDecision && !h.heroDecision.isCompliant).length
      });

      // Optional: Batch the results back to main thread in smaller chunks if needed
      // for extremely large datasets. For now, we collect all and send as COMPLETE.
    } catch (err) {
      console.error(`Worker failed to parse ${file.name}:`, err);
    }
  }

  ctx.postMessage({
    type: 'COMPLETE',
    hands: allHands
  });
};
