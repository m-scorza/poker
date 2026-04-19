import { parseGGPokerFile } from '../src/parser/ggpoker';
const mock = `Poker Hand #123: Hold'em No Limit
Tournament #888, $250,000 Guaranteed GGMasters $50
Level 1 (100/200)
2026/02/17 20:00:00
Seat 1: Hero (1000 in chips)
Seat 2: Villain (1000 in chips)
Hero: posts small blind 100
Villain: posts big blind 200
*** HOLE CARDS ***
Dealt to Hero [Ah As]
Hero: raises 800 to 1000 and is all-in
Villain: folds
*** SUMMARY ***
Total pot 200 | Rake 0
Seat 1: Hero won (200)`;
console.log(JSON.stringify(parseGGPokerFile(mock), null, 2));
