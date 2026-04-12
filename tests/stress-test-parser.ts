#!/usr/bin/env node
/**
 * Parser Stress Test — parses every .txt file in tests/fixtures/
 * and reports success/failure rates with detailed diagnostics.
 *
 * Usage: npx tsx tests/stress-test-parser.ts
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parsePokerStarsFile } from '../src/parser/pokerstars';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'src', 'test', 'fixtures');

interface FileResult {
  file: string;
  totalBlocks: number;
  parsedHands: number;
  failedBlocks: number;
  errors: Array<{ blockIndex: number; preview: string; error: string }>;
}

function stressTest(heroName: string): void {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.txt'));

  if (files.length === 0) {
    console.log('No .txt files found in tests/fixtures/');
    console.log('Place your PokerStars hand history files there and re-run.');
    return;
  }

  console.log(`\n=== Parser Stress Test ===`);
  console.log(`Hero: ${heroName}`);
  console.log(`Files: ${files.length}`);
  console.log(`Fixtures dir: ${FIXTURES_DIR}\n`);

  const results: FileResult[] = [];
  let totalHands = 0;
  let totalFailed = 0;
  let totalFiles = 0;
  let filesWithErrors = 0;

  for (const file of files) {
    totalFiles++;
    const filePath = join(FIXTURES_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    // Normalize line endings for block counting
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rawBlocks = normalized.split(/\n{2,}/).filter((b) => b.trim().length > 0);
    const handBlocks = rawBlocks.filter((b) => /PokerStars (?:Zoom )?Hand #/.test(b));

    // Now parse with the actual parser
    let parsedHands = 0;
    const errors: FileResult['errors'] = [];

    try {
      const parsed = parsePokerStarsFile(content, heroName);
      parsedHands = parsed.length;
    } catch (e) {
      // If the whole file throws, try block-by-block
      for (let i = 0; i < handBlocks.length; i++) {
        try {
          const result = parsePokerStarsFile(handBlocks[i]!, heroName);
          parsedHands += result.length;
        } catch (blockErr) {
          const preview = handBlocks[i]!.substring(0, 120).replace(/\n/g, ' ');
          errors.push({
            blockIndex: i,
            preview,
            error: blockErr instanceof Error ? blockErr.message : String(blockErr),
          });
        }
      }
    }

    const failedBlocks = handBlocks.length - parsedHands;
    totalHands += parsedHands;
    totalFailed += failedBlocks;
    if (failedBlocks > 0 || errors.length > 0) filesWithErrors++;

    results.push({
      file: basename(file),
      totalBlocks: handBlocks.length,
      parsedHands,
      failedBlocks,
      errors,
    });
  }

  // === Summary ===
  console.log(`--- SUMMARY ---`);
  console.log(`Files processed: ${totalFiles}`);
  console.log(`Files with errors: ${filesWithErrors}`);
  console.log(`Total hand blocks found: ${totalHands + totalFailed}`);
  console.log(`Successfully parsed: ${totalHands}`);
  console.log(`Failed: ${totalFailed}`);
  const rate = totalHands + totalFailed > 0
    ? ((totalHands / (totalHands + totalFailed)) * 100).toFixed(1)
    : '0.0';
  console.log(`Success rate: ${rate}%\n`);

  // === Per-file details ===
  console.log(`--- PER-FILE RESULTS ---`);
  for (const r of results) {
    const status = r.failedBlocks === 0 && r.errors.length === 0 ? '✓' : '✗';
    console.log(
      `${status} ${r.file}: ${r.parsedHands}/${r.totalBlocks} hands parsed` +
      (r.failedBlocks > 0 ? ` (${r.failedBlocks} failed)` : ''),
    );

    for (const err of r.errors) {
      console.log(`   Block #${err.blockIndex}: ${err.error}`);
      console.log(`   Preview: ${err.preview.substring(0, 80)}...`);
    }
  }

  // === Error categorization ===
  const errorCategories = new Map<string, number>();
  for (const r of results) {
    for (const err of r.errors) {
      const category = categorizeError(err.error);
      errorCategories.set(category, (errorCategories.get(category) ?? 0) + 1);
    }
  }

  if (errorCategories.size > 0) {
    console.log(`\n--- ERROR CATEGORIES ---`);
    const sorted = [...errorCategories.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cat, count] of sorted) {
      console.log(`  ${count}x ${cat}`);
    }
  }

  // === Line ending analysis ===
  console.log(`\n--- LINE ENDING ANALYSIS ---`);
  for (const file of files.slice(0, 5)) {
    const content = readFileSync(join(FIXTURES_DIR, file), 'utf-8');
    const hasCRLF = content.includes('\r\n');
    const hasCR = content.includes('\r') && !hasCRLF;
    const hasBOM = content.charCodeAt(0) === 0xFEFF;
    const lineEnding = hasCRLF ? 'CRLF (\\r\\n)' : hasCR ? 'CR (\\r)' : 'LF (\\n)';
    console.log(`  ${basename(file)}: ${lineEnding}${hasBOM ? ', BOM' : ''}`);
  }
  if (files.length > 5) console.log(`  ... and ${files.length - 5} more files`);

  console.log(`\n=== End of Stress Test ===\n`);
}

function categorizeError(msg: string): string {
  if (msg.includes('Unsupported player count')) return 'UNSUPPORTED_PLAYER_COUNT';
  if (msg.includes('Button seat') && msg.includes('not found')) return 'BUTTON_SEAT_NOT_FOUND';
  if (msg.includes('position')) return 'POSITION_ERROR';
  if (msg.includes('date') || msg.includes('Date')) return 'DATE_PARSE_ERROR';
  if (msg.includes('NaN')) return 'NaN_VALUE';
  if (msg.includes('regex') || msg.includes('match')) return 'REGEX_FAILURE';
  return `OTHER: ${msg.substring(0, 60)}`;
}

// Detect hero name from first file if possible
function detectHeroFromFiles(): string {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.txt'));
  if (files.length === 0) return 'scorza23';

  const content = readFileSync(join(FIXTURES_DIR, files[0]!), 'utf-8');
  const match = /Dealt to (.+?) \[/.exec(content);
  return match ? match[1]! : 'scorza23';
}

const heroName = process.argv[2] ?? detectHeroFromFiles();
stressTest(heroName);
