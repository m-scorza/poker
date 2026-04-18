const fs = require('fs');
const path = require('path');

// We will use ts-node or just write a pure JS script that avoids TS imports,
// but since the parser is in TS, it's easier to run a script that compiles it,
// or we can just read the TS code and transpile it on the fly or duplicate the regex here.
// Let's duplicate the regex from parser/tournamentSummary.ts to test the data,
// because running ts-node inside a raw command might be hairy if not setup.

const RE_TOURNAMENT_ID_SUMMARY = /Tournament #(\d+)/;
const RE_FINISH_AND_PRIZE = /^(\d+):\s+(.+?)(?:\s+\([^)]+\))?\s*,\s*\$?([\d,.]+)/;
const RE_FINISH_ONLY = /^(\d+):\s+(.+?)(?:\s+\([^)]+\))?$/;

function parseTournamentSummary(fileContent, heroName = 'scorza23') {
  const content = fileContent
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = content.split('\n').map((l) => l.trim());

  let tournamentId = '';
  let finishPosition = null;
  let prize = null;

  for (const line of lines) {
    if (!tournamentId) {
      const tMatch = RE_TOURNAMENT_ID_SUMMARY.exec(line);
      if (tMatch) {
        tournamentId = tMatch[1];
      }
    }

    const finishPrizeMatch = RE_FINISH_AND_PRIZE.exec(line);
    if (finishPrizeMatch) {
      const pos = parseInt(finishPrizeMatch[1], 10);
      const name = finishPrizeMatch[2].trim();
      const amount = parseFloat(finishPrizeMatch[3].replace(/,/g, ''));
      if (name === heroName) {
        finishPosition = pos;
        prize = amount;
        break; // Found hero
      }
      continue;
    }

    const finishMatch = RE_FINISH_ONLY.exec(line);
    if (finishMatch) {
      const pos = parseInt(finishMatch[1], 10);
      const name = finishMatch[2].trim();
      if (name === heroName) {
        finishPosition = pos;
        prize = 0; // Finished but didn't cash
        break; // Found hero
      }
    }
  }

  if (!tournamentId) return null;

  return {
    tournamentId,
    finishPosition,
    prize,
    heroName,
  };
}

const dir = path.join(__dirname, '..', 'src/test/fixtures/summaries');
const files = fs.readdirSync(dir);

let successCount = 0;
let failCount = 0;
let totalPrize = 0;
let itmCount = 0;

for (const file of files) {
  if (file.endsWith('.txt')) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const result = parseTournamentSummary(content);
    if (result) {
      successCount++;
      if (result.prize !== null && result.prize > 0) {
        itmCount++;
        totalPrize += result.prize;
      }
    } else {
      console.log(`Failed to parse: ${file}`);
      failCount++;
    }
  }
}

console.log('--- TEST RESULTS ---');
console.log(`Total files read: ${files.length}`);
console.log(`Successfully Parsed: ${successCount}`);
console.log(`Failed to Parse: ${failCount}`);
console.log(`Tournaments In The Money (ITM): ${itmCount}`);
console.log(`Total Prize Money Found: $${totalPrize.toFixed(2)}`);
