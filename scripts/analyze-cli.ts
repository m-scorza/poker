/**
 * Headless analyze CLI — the app's parser + analysis engine without the browser.
 *
 *   npm run analyze -- <files...> [--hero <name>] [--profile game_plan|advanced] [--json]
 *
 * Runs the exact pipeline the UI import uses (`processWorkerFiles` →
 * scenario detection → range compliance → aggregate stats → leak detection)
 * over hand-history files from disk and prints a study report. `--json`
 * emits a machine-readable version with stable keys for scripting.
 *
 * Proves the core is UI-free; nothing here touches IndexedDB or the DOM.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';
import {
  processWorkerFiles,
  type ImportedHandEntry,
  type ImportSummary,
  type WorkerFilePayload,
  type WorkerMessage,
} from '../src/parser/workerProcessor';
import type { ParsedTournamentSummary } from '../src/parser/tournamentSummary';
import type { HeroDecision } from '../src/types/analysis';
import { computeAggregateStats, detectLeaks, type Leak } from '../src/analysis/leakDetector';
import { complianceExclusionReasonForDecision } from '../src/analysis/rangeChecker';
import type { StrategyProfile } from '../src/data/strategyProfiles';

interface CliReport {
  files: { total: number; parsed: number; failed: number; confidence: string; warnings: string[] };
  hands: number;
  tournaments: number;
  summaries: number;
  decisions: number;
  stats: {
    vpipPct: number | null;
    pfrPct: number | null;
    threeBetPct: number | null;
    cbetPct: number | null;
    cbetHUPct: number | null;
    wtsdPct: number | null;
    af: number | null;
    limps: number;
    compliancePct: number | null;
    complianceEligible: number;
  };
  leaks: Array<Pick<Leak, 'id' | 'name' | 'severity' | 'value' | 'target' | 'sampleSize'>>;
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function buildReport(
  entries: ImportedHandEntry[],
  summaries: ParsedTournamentSummary[],
  importSummary: ImportSummary,
  profile: StrategyProfile,
): CliReport {
  const decisions = entries
    .map((e) => e.heroDecision)
    .filter((d): d is HeroDecision => d !== undefined);
  const stats = computeAggregateStats(decisions);
  const leaks = detectLeaks(stats, profile);
  const graded = decisions.filter((d) => complianceExclusionReasonForDecision(d) === null);
  const tournaments = new Set(entries.map((e) => e.hand.tournamentId).filter(Boolean));

  return {
    files: {
      total: importSummary.totalFiles,
      parsed: importSummary.parsedFiles,
      failed: importSummary.failedFiles,
      confidence: importSummary.confidence,
      warnings: importSummary.warnings,
    },
    hands: entries.length,
    tournaments: tournaments.size,
    summaries: summaries.length,
    decisions: decisions.length,
    stats: {
      vpipPct: pct(stats.vpipHands, stats.totalHands),
      pfrPct: pct(stats.pfrHands, stats.totalHands),
      threeBetPct: pct(stats.threeBetMade, stats.threeBetOpps),
      cbetPct: pct(stats.cbetMade, stats.cbetOpps),
      cbetHUPct: pct(stats.cbetHUMade, stats.cbetHUOpps),
      wtsdPct: pct(stats.wtsdHands, stats.sawFlopHands),
      af: stats.totalCalls > 0 ? Math.round(((stats.totalBets + stats.totalRaises) / stats.totalCalls) * 100) / 100 : null,
      limps: stats.limpHands,
      compliancePct: pct(graded.filter((d) => d.isCompliant).length, graded.length),
      complianceEligible: graded.length,
    },
    leaks: leaks.map((l) => ({
      id: l.id,
      name: l.name,
      severity: l.severity,
      value: Math.round(l.value * 10) / 10,
      target: l.target,
      sampleSize: l.sampleSize,
    })),
  };
}

function fmt(value: number | null, suffix = '%'): string {
  return value === null ? '—' : `${value}${suffix}`;
}

function printReport(report: CliReport): void {
  const { files, stats } = report;
  console.log('');
  console.log(`Files    ${files.parsed}/${files.total} parsed (${files.confidence} confidence${files.failed > 0 ? `, ${files.failed} failed` : ''})`);
  console.log(`Data     ${report.hands} hands · ${report.tournaments} tournaments · ${report.summaries} summaries · ${report.decisions} hero decisions`);
  console.log('');
  console.log(`VPIP     ${fmt(stats.vpipPct)}    PFR ${fmt(stats.pfrPct)}    3-bet ${fmt(stats.threeBetPct)}    AF ${fmt(stats.af, '')}`);
  console.log(`C-bet    ${fmt(stats.cbetPct)}    C-bet HU ${fmt(stats.cbetHUPct)}    WTSD ${fmt(stats.wtsdPct)}    Limps ${stats.limps}`);
  console.log(`Range compliance ${fmt(stats.compliancePct)} over ${stats.complianceEligible} graded decisions`);
  console.log('');
  if (report.leaks.length === 0) {
    console.log('Leaks    none detected at current thresholds');
  } else {
    console.log('Leaks:');
    for (const leak of report.leaks) {
      console.log(`  [${leak.severity.toUpperCase().padEnd(8)}] ${leak.name} — ${leak.value} (target ${leak.target[0]}–${leak.target[1]}, n=${leak.sampleSize})`);
    }
  }
  if (files.warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const warning of files.warnings) console.log(`  - ${warning}`);
  }
  console.log('');
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      hero: { type: 'string', default: 'scorza23' },
      profile: { type: 'string', default: 'game_plan' },
      json: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  if (positionals.length === 0) {
    console.error('Usage: npm run analyze -- <files...> [--hero <name>] [--profile game_plan|advanced] [--json]');
    return 1;
  }
  const profile = values.profile as StrategyProfile;
  if (profile !== 'game_plan' && profile !== 'advanced') {
    console.error(`Unknown profile "${values.profile}" — use game_plan or advanced.`);
    return 1;
  }

  const files: WorkerFilePayload[] = positionals.map((path) => ({
    name: basename(path),
    content: readFileSync(path, 'utf-8'),
    accessMethod: 'local_file',
  }));

  let entries: ImportedHandEntry[] = [];
  let summaries: ParsedTournamentSummary[] = [];
  let importSummary: ImportSummary | null = null;
  let fatal: string | null = null;

  await processWorkerFiles(
    { files, heroName: values.hero!, profile, icmStage: 'early' },
    (message: WorkerMessage) => {
      if (message.type === 'COMPLETE') {
        entries = message.hands;
        summaries = message.summaries;
        importSummary = message.importSummary;
      } else if (message.type === 'FATAL_ERROR') {
        fatal = message.error;
      }
    },
  );

  if (fatal !== null || importSummary === null) {
    console.error(`Fatal: ${fatal ?? 'no import summary produced'}`);
    return 2;
  }

  const report = buildReport(entries, summaries, importSummary, profile);
  if (values.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }
  return report.hands > 0 ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  },
);
