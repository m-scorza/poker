#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const command = process.argv[2];
const isJson = process.argv.includes('--json');

// Helper to run Git commands via spawnSync
function runGit(args, cwd) {
  const result = spawnSync('git', args, {
    cwd: cwd || process.cwd(),
    encoding: 'utf8'
  });
  return {
    status: result.status === null ? -1 : result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  };
}

// Find repository root
let repoRoot = '';
let inGitRepo = false;

const gitCheck = runGit(['rev-parse', '--is-inside-work-tree']);
if (gitCheck.status === 0 && gitCheck.stdout === 'true') {
  inGitRepo = true;
  const rootCheck = runGit(['rev-parse', '--show-toplevel']);
  if (rootCheck.status === 0) {
    repoRoot = path.resolve(rootCheck.stdout);
  }
}

// State paths configuration
const stateDir = inGitRepo && repoRoot ? path.join(repoRoot, '.agents', 'state') : '';
const spoolFile = inGitRepo && repoRoot ? path.join(stateDir, 'task_spool.json') : '';
const tmpSpoolFile = inGitRepo && repoRoot ? path.join(stateDir, 'task_spool.tmp') : '';
const lockFile = inGitRepo && repoRoot ? path.join(stateDir, 'spool.lock') : '';
const eventLogFile = inGitRepo && repoRoot ? path.join(stateDir, 'events.ndjson') : '';

// Validation Helpers
function isValidIsoDate(str) {
  if (typeof str !== 'string') return false;
  const d = new Date(str);
  return !isNaN(d.getTime()) && str === d.toISOString();
}

function checkInputFileSafety(filePath) {
  if (!filePath) {
    return { valid: false, reason: 'Missing file path' };
  }
  const resolved = path.resolve(repoRoot, filePath);
  
  if (!resolved.startsWith(repoRoot)) {
    return { valid: false, reason: 'File path must reside within the repository root' };
  }
  
  if (!fs.existsSync(resolved)) {
    return { valid: false, reason: `File does not exist: ${filePath}` };
  }
  
  if (!fs.statSync(resolved).isFile()) {
    return { valid: false, reason: `Path is not a file: ${filePath}` };
  }
  
  if (path.extname(resolved).toLowerCase() !== '.json') {
    return { valid: false, reason: 'File must have a .json extension' };
  }
  
  return { valid: true, resolved };
}

function readLockMetadata() {
  if (!fs.existsSync(lockFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  } catch (e) {
    return {
      pid: 'unknown',
      command: 'unknown',
      created_at: new Date(0).toISOString()
    };
  }
}

function acquireLock(cmdName) {
  if (fs.existsSync(lockFile)) {
    const metadata = readLockMetadata();
    const age = Date.now() - new Date(metadata.created_at).getTime();
    if (age < 60000) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Lock held by active process', lock: metadata }));
      } else {
        console.error(`Error: Lock is currently held by active process (PID: ${metadata.pid}, Command: ${metadata.command}, Created: ${metadata.created_at})`);
      }
      process.exit(1);
    } else {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Stale lock detected', lock: metadata }));
      } else {
        console.error(`Error: Stale lock detected (Created: ${metadata.created_at}, PID: ${metadata.pid}). Run 'unlock --force' to clear.`);
      }
      process.exit(1);
    }
  }

  try {
    const metadata = {
      pid: process.pid,
      agent: 'human',
      command: cmdName,
      created_at: new Date().toISOString(),
      cwd: repoRoot,
      platform: process.platform
    };
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(lockFile, JSON.stringify(metadata, null, 2), { flag: 'wx', encoding: 'utf8' });
  } catch (e) {
    if (e.code === 'EEXIST') {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Lock acquisition collision' }));
      } else {
        console.error('Error: Lock acquisition collision (lock created by another process concurrently).');
      }
      process.exit(1);
    }
    throw e;
  }
}

function releaseLock() {
  if (fs.existsSync(lockFile)) {
    try {
      fs.unlinkSync(lockFile);
    } catch (e) {
      // Ignore cleanup failures
    }
  }
}

function logEvent(cmd, event, taskId, details) {
  try {
    const logRecord = {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      command: cmd,
      task_id: taskId || null,
      event: event,
      details: details || {}
    };
    fs.appendFileSync(eventLogFile, JSON.stringify(logRecord) + '\n', 'utf8');
  } catch (e) {
    console.warn(`Warning: Failed to append event log: ${e.message}`);
  }
}

function readSpool() {
  if (!fs.existsSync(spoolFile)) {
    if (isJson) {
      console.log(JSON.stringify({ error: 'Runtime state is not initialized. Run init-state first.' }));
    } else {
      console.error("Error: Runtime state is not initialized. Run 'init-state' first.");
    }
    process.exit(1);
  }

  let raw;
  try {
    raw = fs.readFileSync(spoolFile, 'utf8');
  } catch (e) {
    if (isJson) {
      console.log(JSON.stringify({ error: `Failed to read spool file: ${e.message}` }));
    } else {
      console.error(`Error: Failed to read spool file: ${e.message}`);
    }
    process.exit(1);
  }

  let spool;
  try {
    spool = JSON.parse(raw);
  } catch (e) {
    if (isJson) {
      console.log(JSON.stringify({ error: `Corrupted task ledger: invalid JSON (${e.message})` }));
    } else {
      console.error(`Error: Corrupted task ledger: invalid JSON (${e.message})`);
    }
    process.exit(1);
  }

  if (spool.schema_version !== '1.0') {
    if (isJson) {
      console.log(JSON.stringify({ error: 'Unsupported schema_version. Reset or manually migrate .agents/state/.' }));
    } else {
      console.error('Error: Unsupported schema_version. Reset or manually migrate .agents/state/.');
    }
    process.exit(1);
  }

  return spool;
}

function validateSpoolSchema(spool) {
  const errors = [];
  if (!spool || typeof spool !== 'object') {
    errors.push('Spool must be an object');
    return errors;
  }
  if (spool.schema_version !== '1.0') {
    errors.push(`Supported schema_version is "1.0", got "${spool.schema_version}"`);
  }
  if (typeof spool.spool_revision !== 'number' || spool.spool_revision < 0) {
    errors.push('spool_revision must be a non-negative number');
  }
  if (!isValidIsoDate(spool.created_at)) {
    errors.push('created_at is not a valid ISO date string');
  }
  if (!isValidIsoDate(spool.updated_at)) {
    errors.push('updated_at is not a valid ISO date string');
  }
  if (!Array.isArray(spool.tasks)) {
    errors.push('tasks must be an array');
  } else {
    const taskIds = new Set();
    spool.tasks.forEach((task, idx) => {
      const prefix = `tasks[${idx}]`;
      if (!task || typeof task !== 'object') {
        errors.push(`${prefix} must be an object`);
        return;
      }
      if (!task.task_id || typeof task.task_id !== 'string') {
        errors.push(`${prefix} missing task_id`);
      } else {
        if (!/^task-\d{4}-\d{2}-\d{2}-\d{3}$/.test(task.task_id)) {
          errors.push(`${prefix} has invalid task_id format: "${task.task_id}"`);
        }
        if (taskIds.has(task.task_id)) {
          errors.push(`${prefix} has duplicate task_id: "${task.task_id}"`);
        }
        taskIds.add(task.task_id);
      }
      if (typeof task.title !== 'string' || task.title.trim() === '') {
        errors.push(`${prefix} title must be a non-empty string`);
      }
      const allowedStatuses = ['draft', 'pending', 'running', 'completed', 'failed', 'blocked', 'needs_human', 'aborted'];
      if (!allowedStatuses.includes(task.status)) {
        errors.push(`${prefix} status must be one of [${allowedStatuses.join(', ')}], got "${task.status}"`);
      }
      const allowedAgents = ['antigravity', 'hermes', 'claude', 'any'];
      if (!allowedAgents.includes(task.target_agent)) {
        errors.push(`${prefix} target_agent must be one of [${allowedAgents.join(', ')}], got "${task.target_agent}"`);
      }
      if (typeof task.branch !== 'string' || task.branch.trim() === '') {
        errors.push(`${prefix} branch must be a non-empty string`);
      }
      if (typeof task.goal !== 'string' || task.goal.trim() === '') {
        errors.push(`${prefix} goal must be a non-empty string`);
      }
      if (!Array.isArray(task.allowed_files)) {
        errors.push(`${prefix} allowed_files must be an array`);
      } else {
        task.allowed_files.forEach((file, fidx) => {
          if (typeof file !== 'string') {
            errors.push(`${prefix}.allowed_files[${fidx}] must be a string`);
            return;
          }
          if (path.isAbsolute(file)) {
            errors.push(`${prefix}.allowed_files[${fidx}] must be a relative path, got absolute: "${file}"`);
          } else {
            const resolved = path.resolve(repoRoot, file);
            if (!resolved.startsWith(repoRoot)) {
              errors.push(`${prefix}.allowed_files[${fidx}] escapes repository root: "${file}"`);
            }
            if (file.includes('..')) {
              errors.push(`${prefix}.allowed_files[${fidx}] contains path traversal: "${file}"`);
            }
          }
        });
      }
      if (!Array.isArray(task.required_checks)) {
        errors.push(`${prefix} required_checks must be an array`);
      } else {
        task.required_checks.forEach((check, cidx) => {
          if (!check || typeof check !== 'object') {
            errors.push(`${prefix}.required_checks[${cidx}] must be an object`);
            return;
          }
          if (typeof check.name !== 'string' || check.name.trim() === '') {
            errors.push(`${prefix}.required_checks[${cidx}] name must be a non-empty string`);
          }
          if (typeof check.command !== 'string' || check.command.trim() === '') {
            errors.push(`${prefix}.required_checks[${cidx}] command must be a non-empty string`);
          }
        });
      }
      if (!Array.isArray(task.attempts)) {
        errors.push(`${prefix} attempts must be an array`);
      }
      if (!isValidIsoDate(task.created_at)) {
        errors.push(`${prefix} created_at is not a valid ISO date string`);
      }
      if (!isValidIsoDate(task.updated_at)) {
        errors.push(`${prefix} updated_at is not a valid ISO date string`);
      }
    });
  }
  return errors;
}

function writeSpoolAtomic(spool, cmd, taskId, eventName, eventDetails) {
  const errors = validateSpoolSchema(spool);
  if (errors.length > 0) {
    releaseLock();
    if (isJson) {
      console.log(JSON.stringify({ error: 'Atomic write failed: Schema validation errors', details: errors }));
    } else {
      console.error('Error: Atomic write failed due to schema validation errors:');
      errors.forEach(err => console.error(`  - ${err}`));
    }
    process.exit(1);
  }

  try {
    fs.writeFileSync(tmpSpoolFile, JSON.stringify(spool, null, 2), 'utf8');
  } catch (e) {
    releaseLock();
    if (isJson) {
      console.log(JSON.stringify({ error: `Failed to write temp spool file: ${e.message}` }));
    } else {
      console.error(`Error: Failed to write temp spool file: ${e.message}`);
    }
    process.exit(1);
  }

  try {
    fs.renameSync(tmpSpoolFile, spoolFile);
  } catch (e) {
    if (fs.existsSync(tmpSpoolFile)) {
      try { fs.unlinkSync(tmpSpoolFile); } catch (_) {}
    }
    releaseLock();
    if (isJson) {
      console.log(JSON.stringify({ error: `Failed to overwrite spool file: ${e.message}` }));
    } else {
      console.error(`Error: Failed to overwrite spool file: ${e.message}`);
    }
    process.exit(1);
  }

  logEvent(cmd, eventName, taskId, eventDetails);
  releaseLock();
}

// Helper to parse porcelain v2 status
function parseGitPorcelain(stdout) {
  const lines = stdout.split(/\r?\n/);
  let branch = '';
  const dirtyFiles = [];
  const untrackedFiles = [];

  for (const line of lines) {
    if (line.startsWith('# branch.head ')) {
      branch = line.substring('# branch.head '.length).trim();
    } else if (line.startsWith('? ')) {
      untrackedFiles.push(line.substring(2).trim());
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        dirtyFiles.push(parts.slice(8).join(' ').trim());
      }
    }
  }

  return {
    branch,
    isClean: dirtyFiles.length === 0 && untrackedFiles.length === 0,
    dirtyFiles,
    untrackedFiles
  };
}

// Main logic routing
if (!command) {
  console.error('Usage: node scripts/agent-kernel.cjs <command> [--json]');
  console.error('Available commands: status, doctor, inspect-git, print-context, validate-protocol, init-state, state, validate-state, add-task, lock-status, unlock');
  process.exit(1);
}

if (!inGitRepo || !repoRoot) {
  if (isJson) {
    console.log(JSON.stringify({ error: 'Not inside a Git repository' }));
  } else {
    console.error('Error: Not inside a Git repository');
  }
  process.exit(1);
}

switch (command) {
  case 'inspect-git': {
    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    if (statusResult.status !== 0) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Git status execution failed' }));
      } else {
        console.error('Error: Git status execution failed');
      }
      process.exit(1);
    }

    const gitState = parseGitPorcelain(statusResult.stdout);
    const contextPath = path.join(repoRoot, 'docs', 'agents', 'CURRENT_CONTEXT.md');
    const currentContextPresent = fs.existsSync(contextPath);

    const output = {
      in_git_repo: true,
      branch: gitState.branch,
      is_clean: gitState.isClean,
      dirty_files: gitState.dirtyFiles,
      untracked_files: gitState.untrackedFiles,
      current_context_present: currentContextPresent
    };

    if (isJson) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log('=== Git Inspection ===');
      console.log(`Branch:          ${output.branch}`);
      console.log(`Clean:           ${output.is_clean}`);
      console.log(`Dirty Files:     ${output.dirty_files.length}`);
      output.dirty_files.forEach(f => console.log(`  - [Dirty]   ${f}`));
      console.log(`Untracked Files: ${output.untracked_files.length}`);
      output.untracked_files.forEach(f => console.log(`  - [Untrak]  ${f}`));
      console.log(`Context Present: ${output.current_context_present}`);
    }
    process.exit(0);
    break;
  }

  case 'status': {
    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    if (statusResult.status !== 0) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Git status execution failed' }));
      } else {
        console.error('Error: Git status execution failed');
      }
      process.exit(1);
    }
    const gitState = parseGitPorcelain(statusResult.stdout);
    const contextPath = path.join(repoRoot, 'docs', 'agents', 'CURRENT_CONTEXT.md');
    const currentContextPresent = fs.existsSync(contextPath);

    // Check for state violations outside of state/
    const forbiddenPaths = [
      path.join(repoRoot, '.agents', 'spool.lock'),
      path.join(repoRoot, '.agents', 'events.ndjson'),
      path.join(repoRoot, 'task_spool.json')
    ];
    const presentForbidden = forbiddenPaths.filter(p => fs.existsSync(p)).map(p => path.relative(repoRoot, p));

    // Runtime state checks
    const stateInitialized = fs.existsSync(spoolFile);
    let spoolRevision = null;
    let taskCount = 0;
    const taskCountsByStatus = {};
    if (stateInitialized) {
      try {
        const spool = JSON.parse(fs.readFileSync(spoolFile, 'utf8'));
        spoolRevision = spool.spool_revision;
        taskCount = spool.tasks.length;
        spool.tasks.forEach(t => {
          taskCountsByStatus[t.status] = (taskCountsByStatus[t.status] || 0) + 1;
        });
      } catch (_) {}
    }

    const locked = fs.existsSync(lockFile);
    let isStaleLock = false;
    let lockMetadata = null;
    if (locked) {
      lockMetadata = readLockMetadata();
      const age = Date.now() - new Date(lockMetadata.created_at).getTime();
      isStaleLock = age >= 60000;
    }

    const output = {
      repo_root: repoRoot,
      branch: gitState ? gitState.branch : 'unknown',
      is_protected_branch: gitState ? (gitState.branch === 'main' || gitState.branch === 'master') : false,
      is_clean: gitState ? gitState.isClean : false,
      dirty_files: gitState ? gitState.dirtyFiles : [],
      untracked_files: gitState ? gitState.untrackedFiles : [],
      current_context_present: currentContextPresent,
      forbidden_files_present: presentForbidden,
      state_initialized: stateInitialized,
      spool_revision: spoolRevision,
      task_count: taskCount,
      task_counts_by_status: taskCountsByStatus,
      is_locked: locked,
      is_stale_lock: isStaleLock,
      lock_metadata: lockMetadata
    };

    if (isJson) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log('=== Agent Kernel Status ===');
      console.log(`Repo Root:       ${output.repo_root}`);
      console.log(`Branch:          ${output.branch}`);
      console.log(`Protected:       ${output.is_protected_branch}`);
      console.log(`Clean Workspace: ${output.is_clean}`);
      console.log(`Dirty Files:     ${output.dirty_files.length}`);
      output.dirty_files.forEach(f => console.log(`  - ${f}`));
      console.log(`Untracked Files: ${output.untracked_files.length}`);
      output.untracked_files.forEach(f => console.log(`  - ${f}`));
      console.log(`Context Present: ${output.current_context_present}`);
      console.log(`State Violations: ${output.forbidden_files_present.length}`);
      output.forbidden_files_present.forEach(f => console.log(`  - [VIOLATION] ${f}`));
      console.log(`State Init:      ${output.state_initialized}`);
      if (output.state_initialized) {
        console.log(`  Spool Revision: ${output.spool_revision}`);
        console.log(`  Total Tasks:    ${output.task_count}`);
        Object.entries(output.task_counts_by_status).forEach(([s, count]) => {
          console.log(`    - ${s}: ${count}`);
        });
      }
      console.log(`Locked:          ${output.is_locked}`);
      if (output.is_locked) {
        console.log(`  Lock Status:   ${output.is_stale_lock ? 'STALE (clear with unlock --force)' : 'ACTIVE'}`);
        console.log(`  Lock metadata: PID ${output.lock_metadata.pid}, Cmd ${output.lock_metadata.command}`);
      }
    }
    process.exit(0);
    break;
  }

  case 'doctor': {
    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    const gitState = statusResult.status === 0 ? parseGitPorcelain(statusResult.stdout) : null;

    const checks = [];

    // 1. Inside Git repo
    checks.push({ name: 'Git Repository', pass: inGitRepo, detail: inGitRepo ? 'Valid' : 'Not inside a Git repository' });

    // 2. Current branch is not main or master
    const isMain = gitState ? (gitState.branch === 'main' || gitState.branch === 'master') : true;
    checks.push({ name: 'Branch Safety', pass: !isMain, detail: !isMain ? `Safe branch: ${gitState.branch}` : 'Cannot operate directly on main/master' });

    // 3. Working tree has no tracked changes
    const noTrackedChanges = gitState ? gitState.dirtyFiles.length === 0 : false;
    checks.push({ name: 'Tracked Changes', pass: noTrackedChanges, detail: noTrackedChanges ? 'Clean' : `${gitState.dirtyFiles.length} files modified` });

    // 4. Working tree has no untracked non-ignored files
    const noUntracked = gitState ? gitState.untrackedFiles.length === 0 : false;
    checks.push({ name: 'Untracked Files', pass: noUntracked, detail: noUntracked ? 'Clean' : `${gitState.untrackedFiles.length} untracked files present` });

    // 5. Forbidden runtime state paths do not exist
    const forbiddenPaths = [
      { path: path.join(repoRoot, '.agents', 'spool.lock'), name: '.agents/spool.lock (outside state/)' },
      { path: path.join(repoRoot, '.agents', 'events.ndjson'), name: '.agents/events.ndjson (outside state/)' },
      { path: path.join(repoRoot, 'task_spool.json'), name: 'task_spool.json (outside state/)' }
    ];
    const presentForbidden = forbiddenPaths.filter(p => fs.existsSync(p.path));
    checks.push({
      name: 'State Isolation',
      pass: presentForbidden.length === 0,
      detail: presentForbidden.length === 0 ? 'No forbidden runtime state files present at forbidden paths' : `Found forbidden files: ${presentForbidden.map(p => p.name).join(', ')}`
    });

    // 6. State Spool Health (if exists)
    let spoolPass = true;
    let spoolDetail = 'No state spool initialized yet';
    if (fs.existsSync(spoolFile)) {
      try {
        const raw = fs.readFileSync(spoolFile, 'utf8');
        const parsed = JSON.parse(raw);
        const errors = validateSpoolSchema(parsed);
        if (errors.length > 0) {
          spoolPass = false;
          spoolDetail = `Schema validation failed: ${errors.join(', ')}`;
        } else {
          spoolPass = true;
          spoolDetail = `Valid (Revision ${parsed.spool_revision}, Tasks: ${parsed.tasks.length})`;
        }
      } catch (e) {
        spoolPass = false;
        spoolDetail = `Invalid spool JSON: ${e.message}`;
      }
    }
    checks.push({ name: 'State Spool Health', pass: spoolPass, detail: spoolDetail });

    // 7. Lock Health (if exists and is stale, fail/warn)
    let lockPass = true;
    let lockDetail = 'No active lock file';
    if (fs.existsSync(lockFile)) {
      const lockMetadata = readLockMetadata();
      const age = Date.now() - new Date(lockMetadata.created_at).getTime();
      if (age >= 60000) {
        lockPass = false;
        lockDetail = `Stale lock held since ${lockMetadata.created_at} by PID ${lockMetadata.pid}`;
      } else {
        lockDetail = `Active lock held by PID ${lockMetadata.pid} since ${lockMetadata.created_at}`;
      }
    }
    checks.push({ name: 'Lock Health', pass: lockPass, detail: lockDetail });

    // 8. Required active docs exist
    const requiredDocs = [
      'AGENTS.md',
      'CLAUDE.md',
      'docs/product/STATUS.md',
      'docs/agents/AGENT_HANDOFF.md',
      'docs/agents/TASK_PROTOCOL.md',
      'docs/agents/HANDOFF_PROTOCOL.md'
    ];
    const missingDocs = requiredDocs.filter(d => !fs.existsSync(path.join(repoRoot, d)));
    checks.push({
      name: 'Required Documentation',
      pass: missingDocs.length === 0,
      detail: missingDocs.length === 0 ? 'All active protocol and status documents present' : `Missing docs: ${missingDocs.join(', ')}`
    });

    // 9. .gitignore contains runtime ignore rules
    const gitignorePath = path.join(repoRoot, '.gitignore');
    let gitignorePass = false;
    let gitignoreDetail = '.gitignore file missing';
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const requiredIgnoreRules = [
        '.agents/state/',
        '.agents/spool.lock',
        '.agents/events.ndjson',
        '.agents/runs/',
        'docs/agents/CURRENT_CONTEXT.md'
      ];
      const missingRules = requiredIgnoreRules.filter(r => !gitignoreContent.includes(r));
      gitignorePass = missingRules.length === 0;
      gitignoreDetail = gitignorePass ? 'All local state ignore rules present' : `Missing gitignore rules: ${missingRules.join(', ')}`;
    }
    checks.push({ name: 'Gitignore Setup', pass: gitignorePass, detail: gitignoreDetail });

    // 10. .gitattributes exists
    const gitattributesPath = path.join(repoRoot, '.gitattributes');
    const gitattributesExists = fs.existsSync(gitattributesPath);
    checks.push({ name: 'Gitattributes Setup', pass: gitattributesExists, detail: gitattributesExists ? 'Present' : '.gitattributes missing' });

    // 11. Protocol size limits pass
    const limits = [
      { file: 'docs/agents/AGENT_HANDOFF.md', limit: 5120, label: 'AGENT_HANDOFF.md (<5KB)' },
      { file: 'docs/agents/TASK_PROTOCOL.md', limit: 3072, label: 'TASK_PROTOCOL.md (<3KB)' },
      { file: 'docs/agents/HANDOFF_PROTOCOL.md', limit: 3072, label: 'HANDOFF_PROTOCOL.md (<3KB)' }
    ];
    const sizeViolations = [];
    limits.forEach(l => {
      const p = path.join(repoRoot, l.file);
      if (fs.existsSync(p)) {
        const size = fs.statSync(p).size;
        if (size > l.limit) {
          sizeViolations.push(`${l.file} size is ${size} bytes (limit is ${l.limit})`);
        }
      }
    });
    checks.push({
      name: 'Context Size Bounds',
      pass: sizeViolations.length === 0,
      detail: sizeViolations.length === 0 ? 'All protocols within context size targets' : sizeViolations.join(', ')
    });

    const allPass = checks.every(c => c.pass);

    if (isJson) {
      console.log(JSON.stringify({ pass: allPass, checks }, null, 2));
    } else {
      console.log('=== Doctor Health Diagnostics ===');
      checks.forEach(c => {
        const marker = c.pass ? '[PASS]' : '[FAIL]';
        console.log(`${marker.padEnd(7)} ${c.name.padEnd(25)}: ${c.detail}`);
      });
      console.log('\nResult: ' + (allPass ? 'HEALTHY' : 'UNHEALTHY'));
    }

    process.exit(allPass ? 0 : 1);
    break;
  }

  case 'print-context': {
    const contextFiles = [
      'AGENTS.md',
      'CLAUDE.md',
      'docs/product/STATUS.md',
      'docs/agents/AGENT_HANDOFF.md',
      'docs/agents/TASK_PROTOCOL.md',
      'docs/agents/HANDOFF_PROTOCOL.md'
    ];

    const filesData = contextFiles.map(f => {
      const p = path.join(repoRoot, f);
      const exists = fs.existsSync(p);
      const size = exists ? fs.statSync(p).size : 0;
      return { file: f, exists, size };
    });

    if (isJson) {
      console.log(JSON.stringify({ files: filesData }, null, 2));
    } else {
      console.log('=== Active Boot Context Files ===');
      filesData.forEach(fd => {
        const sizeStr = fd.exists ? `${fd.size} bytes` : 'does not exist';
        console.log(`- ${fd.file.padEnd(35)}: ${sizeStr}`);
      });
    }
    process.exit(0);
    break;
  }

  case 'validate-protocol': {
    const limits = [
      { file: 'docs/agents/AGENT_HANDOFF.md', limit: 5120, label: 'AGENT_HANDOFF.md (<5KB)' },
      { file: 'docs/agents/TASK_PROTOCOL.md', limit: 3072, label: 'TASK_PROTOCOL.md (<3KB)' },
      { file: 'docs/agents/HANDOFF_PROTOCOL.md', limit: 3072, label: 'HANDOFF_PROTOCOL.md (<3KB)' }
    ];

    const results = [];
    let allPass = true;

    limits.forEach(l => {
      const p = path.join(repoRoot, l.file);
      const exists = fs.existsSync(p);
      const size = exists ? fs.statSync(p).size : 0;
      const pass = exists && size <= l.limit;
      if (!pass) allPass = false;

      results.push({
        file: l.file,
        exists,
        size,
        limit: l.limit,
        pass
      });
    });

    if (isJson) {
      console.log(JSON.stringify({ pass: allPass, protocols: results }, null, 2));
    } else {
      console.log('=== Protocol Document Verification ===');
      results.forEach(r => {
        const marker = r.pass ? '[PASS]' : '[FAIL]';
        const detail = r.exists ? `${r.size} bytes (limit: ${r.limit} bytes)` : 'file does not exist';
        console.log(`${marker.padEnd(7)} ${r.file.padEnd(35)}: ${detail}`);
      });
    }

    process.exit(allPass ? 0 : 1);
    break;
  }

  case 'init-state': {
    acquireLock('init-state');

    if (fs.existsSync(spoolFile)) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: 'Runtime state is already initialized.' }));
      } else {
        console.error('Error: Runtime state is already initialized. If you want to reset, delete .agents/state/ manually.');
      }
      process.exit(1);
    }

    const spool = {
      schema_version: '1.0',
      spool_revision: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tasks: []
    };

    writeSpoolAtomic(spool, 'init-state', null, 'initialized', { schema_version: '1.0' });

    if (isJson) {
      console.log(JSON.stringify({ success: true, message: 'Runtime state initialized successfully.' }));
    } else {
      console.log('Runtime state initialized successfully at .agents/state/task_spool.json');
    }
    process.exit(0);
    break;
  }

  case 'state': {
    const spool = readSpool();
    if (isJson) {
      console.log(JSON.stringify(spool, null, 2));
    } else {
      console.log('=== Task Spool Ledger ===');
      console.log(`Schema Version: ${spool.schema_version}`);
      console.log(`Revision:       ${spool.spool_revision}`);
      console.log(`Created:        ${spool.created_at}`);
      console.log(`Updated:        ${spool.updated_at}`);
      console.log(`Tasks (${spool.tasks.length}):`);
      if (spool.tasks.length === 0) {
        console.log('  No tasks in spool.');
      } else {
        spool.tasks.forEach((task, idx) => {
          console.log(`\n  [${idx + 1}] ID:        ${task.task_id}`);
          console.log(`      Title:     ${task.title}`);
          console.log(`      Status:    ${task.status}`);
          console.log(`      Agent:     ${task.target_agent}`);
          console.log(`      Branch:    ${task.branch}`);
          console.log(`      Goal:      ${task.goal}`);
        });
      }
    }
    process.exit(0);
    break;
  }

  case 'validate-state': {
    const spool = readSpool();
    const errors = validateSpoolSchema(spool);
    const pass = errors.length === 0;

    if (isJson) {
      console.log(JSON.stringify({ pass, errors }, null, 2));
    } else {
      if (pass) {
        console.log(`State ledger is valid. Schema version: ${spool.schema_version}, Revision: ${spool.spool_revision}.`);
      } else {
        console.error('Error: State validation failed:');
        errors.forEach(err => console.error(`  - ${err}`));
      }
    }
    process.exit(pass ? 0 : 1);
    break;
  }

  case 'add-task': {
    const fileArgIndex = process.argv.indexOf('--file');
    if (fileArgIndex === -1 || fileArgIndex + 1 >= process.argv.length) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Missing --file <path> argument' }));
      } else {
        console.error('Error: Missing --file <path> argument');
      }
      process.exit(1);
    }
    const filePath = process.argv[fileArgIndex + 1];
    
    const safety = checkInputFileSafety(filePath);
    if (!safety.valid) {
      if (isJson) {
        console.log(JSON.stringify({ error: safety.reason }));
      } else {
        console.error(`Error: Path safety violation: ${safety.reason}`);
      }
      process.exit(1);
    }

    let fileContent;
    try {
      fileContent = fs.readFileSync(safety.resolved, 'utf8');
    } catch (e) {
      if (isJson) {
        console.log(JSON.stringify({ error: `Failed to read file: ${e.message}` }));
      } else {
        console.error(`Error: Failed to read file: ${e.message}`);
      }
      process.exit(1);
    }

    let inputTask;
    try {
      inputTask = JSON.parse(fileContent);
    } catch (e) {
      if (isJson) {
        console.log(JSON.stringify({ error: `Malformed task JSON: ${e.message}` }));
      } else {
        console.error(`Error: Malformed task JSON: ${e.message}`);
      }
      process.exit(1);
    }

    if (!inputTask || typeof inputTask !== 'object') {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Task must be a JSON object' }));
      } else {
        console.error('Error: Task must be a JSON object');
      }
      process.exit(1);
    }

    const requiredInputFields = ['task_id', 'title', 'target_agent', 'branch', 'goal'];
    const missing = requiredInputFields.filter(f => typeof inputTask[f] !== 'string' || inputTask[f].trim() === '');
    if (missing.length > 0) {
      const msg = `Missing or empty required task fields: ${missing.join(', ')}`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    if (!/^task-\d{4}-\d{2}-\d{2}-\d{3}$/.test(inputTask.task_id)) {
      const msg = `Invalid task_id format: "${inputTask.task_id}". Expected format: task-YYYY-MM-DD-NNN`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    const allowedAgents = ['antigravity', 'hermes', 'claude', 'any'];
    if (!allowedAgents.includes(inputTask.target_agent)) {
      const msg = `Invalid target_agent: "${inputTask.target_agent}". Must be one of: ${allowedAgents.join(', ')}`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    acquireLock('add-task');
    const spool = readSpool();

    const exists = spool.tasks.some(t => t.task_id === inputTask.task_id);
    if (exists) {
      releaseLock();
      const msg = `Duplicate task ID: "${inputTask.task_id}" already exists in spool.`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    const newTask = {
      task_id: inputTask.task_id,
      title: inputTask.title.trim(),
      status: 'pending',
      target_agent: inputTask.target_agent,
      branch: inputTask.branch.trim(),
      goal: inputTask.goal.trim(),
      allowed_files: Array.isArray(inputTask.allowed_files) ? inputTask.allowed_files : [],
      required_checks: Array.isArray(inputTask.required_checks) ? inputTask.required_checks : [],
      attempts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    spool.tasks.push(newTask);
    spool.spool_revision += 1;
    spool.updated_at = new Date().toISOString();

    writeSpoolAtomic(spool, 'add-task', newTask.task_id, 'task_added', { task_id: newTask.task_id });

    if (isJson) {
      console.log(JSON.stringify({ success: true, task: newTask }));
    } else {
      console.log(`Task "${newTask.task_id}" ("${newTask.title}") successfully added to spool.`);
    }
    process.exit(0);
    break;
  }

  case 'lock-status': {
    const locked = fs.existsSync(lockFile);
    if (!locked) {
      if (isJson) {
        console.log(JSON.stringify({ locked: false }));
      } else {
        console.log('No active write lock file exists.');
      }
      process.exit(0);
    }

    const metadata = readLockMetadata();
    const age = Date.now() - new Date(metadata.created_at).getTime();
    const isStale = age >= 60000;

    const output = {
      locked: true,
      is_stale: isStale,
      age_ms: age,
      age_sec: Math.round(age / 1000),
      metadata: metadata
    };

    if (isJson) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log('=== Lock File Status ===');
      console.log(`Lock exists:    Yes`);
      console.log(`Status:         ${isStale ? 'STALE (clear with unlock --force)' : 'ACTIVE'}`);
      console.log(`Age:            ${output.age_sec} seconds`);
      console.log(`Held By PID:    ${metadata.pid}`);
      console.log(`Agent:          ${metadata.agent}`);
      console.log(`Command:        ${metadata.command}`);
      console.log(`Created At:     ${metadata.created_at}`);
      console.log(`Platform:       ${metadata.platform}`);
      console.log(`CWD:            ${metadata.cwd}`);
    }
    process.exit(0);
    break;
  }

  case 'unlock': {
    const hasForce = process.argv.includes('--force');
    if (!hasForce) {
      if (isJson) {
        console.log(JSON.stringify({ error: "Missing --force flag. Run 'unlock --force' to clear." }));
      } else {
        console.error("Error: unlock command requires '--force' flag to clear the write lock.");
      }
      process.exit(1);
    }

    const lockExists = fs.existsSync(lockFile);
    if (!lockExists) {
      if (isJson) {
        console.log(JSON.stringify({ success: true, message: 'No lock file to release.' }));
      } else {
        console.log('No active lock file exists to release.');
      }
      process.exit(0);
    }

    try {
      fs.unlinkSync(lockFile);
      if (isJson) {
        console.log(JSON.stringify({ success: true, message: 'Lock released successfully.' }));
      } else {
        console.log('Lock file successfully removed.');
      }
    } catch (e) {
      if (isJson) {
        console.log(JSON.stringify({ error: `Failed to remove lock: ${e.message}` }));
      } else {
        console.error(`Error: Failed to remove lock: ${e.message}`);
      }
      process.exit(1);
    }
    process.exit(0);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    console.error('Available commands: status, doctor, inspect-git, print-context, validate-protocol, init-state, state, validate-state, add-task, lock-status, unlock');
    process.exit(1);
}
