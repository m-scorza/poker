import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

try {
  // Check if we are in a git repository
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
} catch (e) {
  // Silent no-op when not in a git repository
  process.exit(0);
}

try {
  let hookDir;
  try {
    hookDir = execSync('git rev-parse --git-path hooks', { encoding: 'utf8' }).trim();
  } catch (e) {
    hookDir = '.git/hooks';
  }

  // Resolve absolute path to hook dir, but normalize it for reliability
  const resolvedHookDir = path.resolve(hookDir);

  if (!fs.existsSync(resolvedHookDir)) {
    fs.mkdirSync(resolvedHookDir, { recursive: true });
  }

  const hookPath = path.join(resolvedHookDir, 'pre-commit');

  const hookContent = `#!/usr/bin/env sh
set -e

# 1. Doc autogen freshness. Runs tsx directly so it works even if
#    npm scripts are missing (partial checkouts, wrong-dir commits).
npx --no-install tsx scripts/regen-status.ts --check || {
  echo "docs/product/STATUS.md autogen blocks are stale. Run: npm run docs:update"
  exit 1
}

# 2. Private/local runtime boundary.
npx --no-install tsx scripts/privacy-boundary-check.ts || {
  echo "Privacy boundary check failed. Run: npm run privacy:check"
  exit 1
}

# 3. No untracked files under src/ when committing anything in src/.
#    This is Gemini's recurring failure mode: leaving orphan feature
#    files outside git.
if git diff --cached --name-only | grep -q '^src/'; then
  untracked=$(git ls-files --others --exclude-standard src/)
  if [ -n "$untracked" ]; then
    echo "Untracked files in src/ — track or delete before committing:"
    echo "$untracked"
    exit 1
  fi
fi
`;

  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  
  // Try to make it executable explicitly on POSIX systems
  try {
    fs.chmodSync(hookPath, '755');
  } catch (e) {
    // Ignore chmod failures on systems that don't support it (e.g. Windows)
  }

  console.log(`Installed pre-commit hook at ${hookPath}`);
} catch (err) {
  console.error('Failed to install pre-commit hook:', err instanceof Error ? err.message : String(err));
  // Exit gracefully so npm install doesn't break if git hooks fail
  process.exit(0);
}
