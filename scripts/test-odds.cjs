const { CardGroup, OddsCalculator } = require('poker-odds-calculator');

try {
  const player1Cards = CardGroup.fromString('AcAh');
  const player2Cards = CardGroup.fromString('7c7h');
  const board = CardGroup.fromString('2d9c3h');

  const result = OddsCalculator.calculate([player1Cards, player2Cards], board);

  console.log('Player 1 (AA) Equity:', result.equities[0].getEquity());
  console.log('Player 2 (77) Equity:', result.equities[1].getEquity());
} catch (e) {
  console.error("Error executing script", e);
}
