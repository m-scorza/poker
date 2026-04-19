const names = [
  "Tournament #1234, WSOP Circuit $250,000 Event #1 $50",
  "$50 Mega Satellite to GGMasters $1,050",
  "Bounty Hunters HR $525",
  "GGMasters High Roller $1,050",
  "$250,000 GTD GGMasters $50"
];

for (const name of names) {
  const cleanName = name.replace(/\$[\d,.]+[a-z]*\s*(?:GTD|Guaranteed|-)?/ig, '');
  const noComma = name.replace(/,/g, '');
  const matches = [...noComma.matchAll(/\$(\d+(?:\.\d+)?)/g)];
  
  // Find the first match that is < 50000 (since buyins aren't 250k)
  // Or just rely on stripping $250,000 completely
  
  console.log({
    name,
    all: matches.map(m => m[1])
  });
}
