#!/usr/bin/env node
// Fails the build if the eager shell chunk (dist/assets/index-*.js) grows past
// a fixed byte budget. The eager shell is downloaded on every visit before any
// route renders, so a silent regression here (e.g. a heavy lib leaking into the
// index chunk) is exactly the kind of drift this guard exists to catch.
//
// Dependency-free on purpose: plain fs + a hard-coded uncompressed-byte budget.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS_DIR = 'dist/assets';
// ~15% headroom above the post-Wave-3 shell size (~376 KB). Raise deliberately
// with a measured justification, never to paper over a regression.
const BUDGET_BYTES = 432 * 1024;

let files;
try {
  files = readdirSync(ASSETS_DIR);
} catch {
  console.error(`[bundle-budget] ${ASSETS_DIR} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const shell = files.filter((f) => /^index-.*\.js$/.test(f));
if (shell.length !== 1) {
  console.error(`[bundle-budget] expected exactly one index-*.js, found ${shell.length}: ${shell.join(', ')}`);
  process.exit(1);
}

const bytes = statSync(join(ASSETS_DIR, shell[0])).size;
const kb = (bytes / 1024).toFixed(1);
const budgetKb = (BUDGET_BYTES / 1024).toFixed(1);

if (bytes > BUDGET_BYTES) {
  console.error(`[bundle-budget] FAIL: ${shell[0]} is ${kb} KB, over the ${budgetKb} KB budget.`);
  console.error('[bundle-budget] Keep heavy libs (framer-motion, jspdf, etc.) out of the eager shell, or raise the budget deliberately.');
  process.exit(1);
}

console.log(`[bundle-budget] OK: ${shell[0]} is ${kb} KB (budget ${budgetKb} KB).`);
