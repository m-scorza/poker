import { parsePokerStarsFile } from '../src/parser/pokerstars';
import { buildHeroDecision } from '../src/analysis/scenarioDetector';
import * as fs from 'fs';
import * as path from 'path';

const heroName = 'scorza23';
const fixtureDir = path.join(process.cwd(), 'src/test/fixtures');

const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.txt'));
let wtsdHands = 0;
let wonSDHands = 0;

for (const f of files) {
   const content = fs.readFileSync(path.join(fixtureDir, f), 'utf-8');
   const parsedHands = parsePokerStarsFile(content, heroName);
   
   for (const p of parsedHands) {
     const decision = buildHeroDecision(p, heroName);
     if (decision && decision.wentToShowdown) {
       wtsdHands++;
       console.log(`[Hand ${decision.handId}] Went to SD. WonAmount: ${decision.wonAmount}`);
       if (decision.wonAtShowdown) wonSDHands++;
     }
   }
}

console.log(`\nResults: ${wtsdHands} went to showdown. ${wonSDHands} won at showdown.`);
console.log(`WSD% = ${wtsdHands > 0 ? (wonSDHands / wtsdHands) * 100 : 0}%`);
