#!/usr/bin/env sh
# Install .git/hooks/pre-commit. Runs on `npm install` via the
# "prepare" script, so any clone gets the drift gate automatically.
# Silent no-op when not in a git work tree (e.g. npm install inside
# a published tarball).

set -e

if [ ! -d .git ] && ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

HOOK_DIR="$(git rev-parse --git-path hooks 2>/dev/null || echo .git/hooks)"
mkdir -p "$HOOK_DIR"
HOOK="$HOOK_DIR/pre-commit"

cat > "$HOOK" <<'HOOK_EOF'
#!/usr/bin/env sh
set -e

# 1. Doc autogen freshness. Runs tsx directly so it works even if
#    npm scripts are missing (partial checkouts, wrong-dir commits).
npx --no-install tsx scripts/regen-status.ts --check || {
  echo "docs/STATUS.md autogen blocks are stale. Run: npm run docs:update"
  exit 1
}

# 2. No untracked files under src/ when committing anything in src/.
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
HOOK_EOF

chmod +x "$HOOK"
echo "Installed pre-commit hook at $HOOK"
