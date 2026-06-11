import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPLACEMENTS = {
  'var(--color-bg-base)': 'var(--bg)',
  'var(--color-bg-card)': 'var(--ink-2)',
  'var(--color-bg-hover)': 'var(--ink-3)',
  'var(--color-bg-input)': 'var(--ink-1)',
  'var(--color-text)': 'var(--fg)',
  'var(--color-text-dim)': 'var(--fg-dim)',
  'var(--color-text-muted)': 'var(--fg-muted)',
  'var(--color-border)': 'var(--hairline)',
  'var(--color-border-active)': 'var(--hairline)',
  'var(--color-accent)': 'var(--accent)',
  'var(--color-danger)': 'var(--loss)',
  'var(--color-warning)': 'var(--warn)',
  'var(--color-info)': 'var(--sig)',
  'glass-card': 'compartment',
};

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts') || dirPath.endsWith('.css')) {
        callback(path.join(dir, f));
      }
    }
  });
}

const srcPath = path.resolve(__dirname, '../src');

let count = 0;
walk(srcPath, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  
  for (const [key, value] of Object.entries(REPLACEMENTS)) {
    content = content.split(key).join(value);
  }
  
  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    count++;
    console.log(`Updated ${filepath}`);
  }
});

console.log(`\nUpdated ${count} files.`);
