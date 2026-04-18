const fs = require('fs');
const f = (file, cb) => {
  try {
    let c = fs.readFileSync(file, 'utf8');
    let r = cb(c);
    if(r !== c) {
      fs.writeFileSync(file, r);
      console.log('Fixed', file);
    }
  } catch(e) { console.error('Error on', file, e.message); }
};

f('src/data/appStore.ts', c => c.replace("import type { Hand } from '../types/hand';\r\n", "").replace("import type { Hand } from '../types/hand';\n", "").replace("HeroDecision, ", "").replace("import type { Leak, AggregateStats } from '../analysis/leakDetector';\r\n", "").replace("import type { Leak, AggregateStats } from '../analysis/leakDetector';\n", ""));

f('src/data/__tests__/sessions.test.ts', c => c.split("groupIntoSessions(hands, decisions)").join("groupIntoSessions(hands, decisions, new Map())")
.split("groupIntoSessions([], new Map())").join("groupIntoSessions([], new Map(), new Map())")
.split("groupIntoSessions(hands, decisions, 60 * 60 * 1000)").join("groupIntoSessions(hands, decisions, new Map(), 60 * 60 * 1000)")
.split("groupIntoSessions(hands, decisions, 2 * 60 * 60 * 1000)").join("groupIntoSessions(hands, decisions, new Map(), 2 * 60 * 60 * 1000)"));

f('src/pages/VillainsPage.tsx', c => c.replace("classifyVillain, computeVillainStats, ", "").replace("VillainRawCounters, ", "").replace("import { emptyCounters } from '../analysis/villainClassifier';\r\n", "").replace("import { emptyCounters } from '../analysis/villainClassifier';\n", ""));

f('src/pages/LeaksPage.tsx', c => c.replace("useEffect, ", ""));
f('src/pages/StatsPage.tsx', c => c.replace("useEffect, ", ""));
f('src/parser/tournamentSummary.ts', c => c.replace("import type { Tournament } from '../types/hand';\r\n", "").replace("import type { Tournament } from '../types/hand';\n", ""));
