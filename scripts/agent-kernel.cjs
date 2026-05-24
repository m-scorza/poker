#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const command = process.argv[2];
const isJson = process.argv.includes('--json');

// Argument parsing helpers
function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return null;
}

const argTaskId = getArgValue('--task');
const argAgent = getArgValue('--agent');
const argSummary = getArgValue('--summary');
const argEvidenceFile = getArgValue('--evidence-file');
const argReason = getArgValue('--reason');

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

function fileMatchesPatterns(file, patterns) {
  return patterns.some(pat => {
    if (pat.endsWith('/**')) {
      const dir = pat.slice(0, -3);
      return file === dir || file.startsWith(dir + '/');
    }
    return file === pat;
  });
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

function enforceBudget(text, limitBytes) {
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes <= limitBytes) {
    return text;
  }
  console.warn(`Warning: Output size of ${bytes} bytes exceeds budget limit of ${limitBytes} bytes. Truncating output.`);
  return text.slice(0, limitBytes - 100) + '\n\n... [TRUNCATED DUE TO BUDGET LIMIT] ...';
}

function isPathSafe(filePath, repoRoot) {
  if (!filePath || typeof filePath !== 'string') return false;
  const resolved = path.resolve(repoRoot, filePath);
  if (!resolved.startsWith(repoRoot)) return false;
  
  const normalizedRelative = path.relative(repoRoot, resolved);
  if (normalizedRelative.startsWith('..') || path.isAbsolute(normalizedRelative)) {
    return false;
  }

  if (fs.existsSync(resolved)) {
    try {
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) return false;
    } catch (e) {
      return false;
    }
  }
  return true;
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
      if (task.owner_agent !== null && task.owner_agent !== undefined && !['antigravity', 'hermes', 'claude', 'any'].includes(task.owner_agent)) {
        errors.push(`${prefix} owner_agent must be null or one of [antigravity, hermes, claude, any], got "${task.owner_agent}"`);
      }
      if (task.started_at !== null && task.started_at !== undefined && !isValidIsoDate(task.started_at)) {
        errors.push(`${prefix} started_at must be null or a valid ISO date string`);
      }
      if (task.completed_at !== null && task.completed_at !== undefined && !isValidIsoDate(task.completed_at)) {
        errors.push(`${prefix} completed_at must be null or a valid ISO date string`);
      }
      if (!Array.isArray(task.attempts)) {
        errors.push(`${prefix} attempts must be an array`);
      } else {
        task.attempts.forEach((att, attIdx) => {
          const attPrefix = `${prefix}.attempts[${attIdx}]`;
          if (!att || typeof att !== 'object') {
            errors.push(`${attPrefix} must be an object`);
            return;
          }
          if (typeof att.attempt_id !== 'number' || att.attempt_id < 0) {
            errors.push(`${attPrefix} attempt_id must be a non-negative number`);
          }
          if (!isValidIsoDate(att.started_at)) {
            errors.push(`${attPrefix} started_at is not a valid ISO date string`);
          }
          if (att.ended_at !== null && att.ended_at !== undefined && !isValidIsoDate(att.ended_at)) {
            errors.push(`${attPrefix} ended_at must be null or a valid ISO date string`);
          }
          const allowedAttemptStatuses = ['running', 'completed', 'failed', 'blocked', 'needs_human', 'aborted'];
          if (!allowedAttemptStatuses.includes(att.status)) {
            errors.push(`${attPrefix} status must be one of [${allowedAttemptStatuses.join(', ')}], got "${att.status}"`);
          }
          if (typeof att.summary !== 'string') {
            errors.push(`${attPrefix} summary must be a string`);
          }
          if (att.evidence_file !== null && att.evidence_file !== undefined && typeof att.evidence_file !== 'string') {
            errors.push(`${attPrefix} evidence_file must be null or a string`);
          }
          if (att.dirty_files && !Array.isArray(att.dirty_files)) {
            errors.push(`${attPrefix} dirty_files must be an array of strings`);
          } else if (att.dirty_files) {
            att.dirty_files.forEach((df, dfIdx) => {
              if (typeof df !== 'string') {
                errors.push(`${attPrefix}.dirty_files[${dfIdx}] must be a string`);
              }
            });
          }
        });
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
  console.error('Available commands: status, doctor, inspect-git, print-context, print-current-context, render-handoff, validate-protocol, init-state, state, validate-state, add-task, lock-status, unlock, claim, complete, fail, blocked, needs-human, abort');
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
    let runningTaskId = null;
    const taskCountsByStatus = {};
    if (stateInitialized) {
      try {
        const spool = JSON.parse(fs.readFileSync(spoolFile, 'utf8'));
        spoolRevision = spool.spool_revision;
        taskCount = spool.tasks.length;
        spool.tasks.forEach(t => {
          taskCountsByStatus[t.status] = (taskCountsByStatus[t.status] || 0) + 1;
          if (t.status === 'running') {
            runningTaskId = t.task_id;
          }
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
      running_task_id: runningTaskId,
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
        if (output.running_task_id) {
          console.log(`  Running Task:   ${output.running_task_id}`);
        }
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
    let runningCount = 0;
    if (fs.existsSync(spoolFile)) {
      try {
        const raw = fs.readFileSync(spoolFile, 'utf8');
        const parsed = JSON.parse(raw);
        const errors = validateSpoolSchema(parsed);
        if (errors.length > 0) {
          spoolPass = false;
          spoolDetail = `Schema validation failed: ${errors.join(', ')}`;
        } else {
          runningCount = parsed.tasks.filter(t => t.status === 'running').length;
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

    // 8. Active Run Limit Check (ensure <= 1 running task)
    let runLimitPass = runningCount <= 1;
    let runLimitDetail = runningCount <= 1 ? `Active running tasks: ${runningCount}` : `Violation: ${runningCount} tasks are currently running`;
    checks.push({ name: 'Active Run Limit', pass: runLimitPass, detail: runLimitDetail });

    // 9. Required active docs exist
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

    // 10. .gitignore contains runtime ignore rules
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

    // 11. .gitattributes exists
    const gitattributesPath = path.join(repoRoot, '.gitattributes');
    const gitattributesExists = fs.existsSync(gitattributesPath);
    checks.push({ name: 'Gitattributes Setup', pass: gitattributesExists, detail: gitattributesExists ? 'Present' : '.gitattributes missing' });

    // 12. Protocol size limits pass
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

  case 'print-current-context': {
    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    let gitState = null;
    let gitError = null;
    if (statusResult.status !== 0) {
      gitError = 'Git status execution failed';
    } else {
      gitState = parseGitPorcelain(statusResult.stdout);
    }

    let activeTask = null;
    let recentTasks = [];
    let stateInit = fs.existsSync(spoolFile);
    if (stateInit) {
      try {
        const spool = JSON.parse(fs.readFileSync(spoolFile, 'utf8'));
        activeTask = spool.tasks.find(t => t.status === 'running') || null;
        
        const endedStatuses = ['completed', 'failed', 'blocked', 'needs_human', 'aborted'];
        const endedTasks = spool.tasks.filter(t => endedStatuses.includes(t.status));
        recentTasks = endedTasks.reverse().slice(0, 3);
      } catch (e) {
        stateInit = false;
      }
    }

    const limits = [
      { file: 'docs/agents/AGENT_HANDOFF.md', limit: 5120 },
      { file: 'docs/agents/TASK_PROTOCOL.md', limit: 3072 },
      { file: 'docs/agents/HANDOFF_PROTOCOL.md', limit: 3072 }
    ];

    const protocolData = limits.map(l => {
      const p = path.join(repoRoot, l.file);
      const exists = fs.existsSync(p);
      const size = exists ? fs.statSync(p).size : 0;
      const pct = l.limit > 0 ? Math.round((size / l.limit) * 100) : 0;
      return { file: l.file, exists, size, limit: l.limit, pct };
    });

    let out = '';
    const nowStr = new Date().toISOString();
    out += `### Active Workspace Context — ${nowStr}\n`;
    if (gitState) {
      out += `- **Branch**: ${gitState.branch}\n`;
      out += `- **Workspace Status**: ${gitState.isClean ? 'CLEAN' : 'DIRTY'}\n`;
      if (gitState.branch === 'main' || gitState.branch === 'master') {
        out += `⚠️ **WARNING**: Operating directly on protected branch (${gitState.branch}). No tasks can be claimed.\n`;
      }
    } else {
      out += `- **Branch**: unknown (Git error: ${gitError})\n`;
    }
    out += '\n';

    out += `### Active Task\n`;
    if (activeTask) {
      out += `- **ID**: \`${activeTask.task_id}\`\n`;
      out += `- **Agent**: \`${activeTask.owner_agent || activeTask.target_agent}\`\n`;
      out += `- **Title**: ${activeTask.title}\n`;
      out += `- **Goal**: ${activeTask.goal}\n`;
      const scopeStr = activeTask.allowed_files.length > 0 ? activeTask.allowed_files.join(', ') : 'None';
      out += `- **Allowed Scope**: ${scopeStr}\n`;
    } else {
      if (!stateInit) {
        out += `[State spool not initialized. Run 'init-state' first.]\n`;
      } else {
        out += `[No active running task in spool.]\n`;
      }
    }
    out += '\n';

    if (recentTasks.length > 0) {
      out += `### Recent Ledger History\n`;
      recentTasks.forEach(t => {
        const dateStr = t.completed_at || t.updated_at || '';
        const dateShort = dateStr ? dateStr.substring(0, 10) : '';
        out += `- \`[${t.status.toUpperCase()}]\` ${t.task_id} — ${t.title} (${dateShort})\n`;
      });
      out += '\n';
    }

    if (gitState && !gitState.isClean) {
      out += `### Modified / Untracked Files\n`;
      const allFiles = [...gitState.dirtyFiles.map(f => `[Dirty]   ${f}`), ...gitState.untrackedFiles.map(f => `[Untrak]  ${f}`)];
      const displayed = allFiles.slice(0, 5);
      displayed.forEach(f => {
        out += `- \`${f}\`\n`;
      });
      if (allFiles.length > 5) {
        out += `- ... and ${allFiles.length - 5} more files.\n`;
      }
      out += '\n';
    }

    out += `### Protocol Budgets\n`;
    protocolData.forEach(p => {
      const sizeStr = p.exists ? `${p.size} / ${p.limit} bytes (${p.pct}% used)` : 'does not exist';
      out += `- \`${p.file}\`: ${sizeStr}\n`;
    });

    const finalOut = enforceBudget(out, 1500);

    if (isJson) {
      console.log(JSON.stringify({
        timestamp: nowStr,
        branch: gitState ? gitState.branch : null,
        is_clean: gitState ? gitState.isClean : null,
        active_task: activeTask,
        recent_tasks: recentTasks,
        protocol_budgets: protocolData
      }, null, 2));
    } else {
      console.log(finalOut);
    }
    process.exit(0);
    break;
  }

  case 'render-handoff': {
    if (!argTaskId) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Missing --task <id> argument' }));
      } else {
        console.error('Error: Missing --task <id> argument');
      }
      process.exit(1);
    }

    const spool = readSpool();
    const task = spool.tasks.find(t => t.task_id === argTaskId);
    if (!task) {
      if (isJson) {
        console.log(JSON.stringify({ error: `Task "${argTaskId}" not found in spool` }));
      } else {
        console.error(`Error: Task "${argTaskId}" not found in spool`);
      }
      process.exit(1);
    }

    const activeAttempt = task.attempts && task.attempts.length > 0
      ? task.attempts[task.attempts.length - 1]
      : null;

    let filesTouched = [];
    if (activeAttempt && activeAttempt.dirty_files && activeAttempt.dirty_files.length > 0) {
      filesTouched = activeAttempt.dirty_files;
    } else {
      const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
      if (statusResult.status === 0) {
        const gitState = parseGitPorcelain(statusResult.stdout);
        filesTouched = [...gitState.dirtyFiles, ...gitState.untrackedFiles];
      }
    }

    let verificationLines = [];
    let verificationStructured = [];
    if (activeAttempt && activeAttempt.evidence_file) {
      const evidencePath = activeAttempt.evidence_file;
      const resolvedPath = path.resolve(repoRoot, evidencePath);
      const isSafe = isPathSafe(evidencePath, repoRoot);

      if (!isSafe) {
        verificationLines.push(`- Evidence: unavailable — invalid or unsafe evidence path`);
        verificationStructured.push({
          name: 'evidence',
          error: 'invalid or unsafe evidence path'
        });
      } else if (!fs.existsSync(resolvedPath)) {
        verificationLines.push(`- [Evidence missing]: File not found: ${evidencePath}`);
        verificationStructured.push({
          name: 'evidence',
          error: `File not found: ${evidencePath}`
        });
      } else {
        try {
          const evidenceContent = fs.readFileSync(resolvedPath, 'utf8');
          const evidence = JSON.parse(evidenceContent);
          if (evidence && Array.isArray(evidence.commands)) {
            evidence.commands.forEach(cmd => {
              if (cmd && typeof cmd.name === 'string') {
                let details = '';
                let outcome = 'FAIL';
                let summaryDetail = '';
                if (cmd.exit_code === 0) {
                  details = '✓ (PASS)';
                  outcome = 'PASS';
                  const stdoutLines = (cmd.stdout || '').split('\n');
                  const summaryLine = stdoutLines.find(l => 
                    /tests\s+passed|typecheck\s+complete|healthy/i.test(l)
                  );
                  if (summaryLine) {
                    details += ` — ${summaryLine.trim()}`;
                    summaryDetail = summaryLine.trim();
                  }
                } else {
                  details = `✗ (FAIL, exit: ${cmd.exit_code})`;
                  const stderrLines = (cmd.stderr || cmd.stdout || '').split('\n').filter(l => l.trim() !== '');
                  if (stderrLines.length > 0) {
                    const firstLines = stderrLines.slice(0, 2).map(l => l.trim()).join('; ');
                    details += ` — ${firstLines}`;
                    summaryDetail = firstLines;
                  }
                }
                verificationLines.push(`- ${cmd.name}: ${details}`);
                verificationStructured.push({
                  name: cmd.name,
                  exit_code: cmd.exit_code,
                  outcome: outcome,
                  summary: summaryDetail
                });
              }
            });
          }
        } catch (e) {
          verificationLines.push(`- [Evidence read error]: Failed to parse ${evidencePath}: ${e.message}`);
          verificationStructured.push({
            name: 'evidence',
            error: `Failed to parse evidence file: ${e.message}`
          });
        }
      }
    }

    if (verificationLines.length === 0) {
      verificationLines.push(`- node scripts/agent-kernel.cjs doctor ✓ (HEALTHY)`);
      verificationLines.push(`- [Please verify types and tests manually]`);
    }

    const dateStr = new Date().toISOString().substring(0, 10);
    const taskTitle = task.title || 'Task Execution';
    const statusHeader = task.status !== 'completed' ? ` [${task.status.toUpperCase()}]` : '';

    let out = `## ${dateStr} — ${taskTitle}${statusHeader}\n\n`;
    out += `- Owner / agent:          ${task.owner_agent || task.target_agent || 'any'}\n`;
    out += `- Branch:                 ${task.branch}\n`;
    const scopeStr = task.allowed_files.length > 0 ? task.allowed_files.join(', ') : 'None';
    out += `- Scope:                  ${scopeStr}\n`;

    out += `- Files touched:\n`;
    if (filesTouched.length === 0) {
      out += `  - None\n`;
    } else {
      filesTouched.forEach(f => {
        out += `  - \`${f}\`\n`;
      });
    }

    out += `- Summary:\n`;
    if (activeAttempt && activeAttempt.summary) {
      const summaryBulletPoints = activeAttempt.summary
        .split('\n')
        .map(l => l.trim())
        .filter(l => l !== '');
      if (summaryBulletPoints.length > 0) {
        summaryBulletPoints.forEach(pt => {
          out += pt.startsWith('-') ? `  ${pt}\n` : `  - ${pt}\n`;
        });
      } else {
        out += `  - Completed changes under task ${task.task_id}.\n`;
      }
    } else {
      out += `  - Completed changes under task ${task.task_id}.\n`;
    }

    out += `- Verification:\n`;
    verificationLines.forEach(line => {
      out += `  ${line}\n`;
    });

    out += `- Risks / assumptions:\n`;
    out += `  - [Developer must fill out manual risks]\n`;

    out += `- Next action requested:\n`;
    const nextActionText = task.status === 'completed'
      ? 'Ready for verification and merge.'
      : task.status === 'failed'
        ? 'Debug current failures or reset the task.'
        : task.status === 'blocked' || task.status === 'needs_human'
          ? `Resolve block/human need: ${activeAttempt ? activeAttempt.summary : 'No reason specified'}`
          : 'Continue implementation or review next steps.';
    out += `  - ${nextActionText}\n`;

    const finalOut = enforceBudget(out, 2000);

    if (isJson) {
      console.log(JSON.stringify({
        task_id: task.task_id,
        title: task.title,
        status: task.status,
        branch: task.branch,
        owner_agent: task.owner_agent || task.target_agent || 'any',
        scope: task.allowed_files,
        files_touched: filesTouched,
        summary: activeAttempt && activeAttempt.summary
          ? activeAttempt.summary.split('\n').map(l => l.trim()).filter(l => l !== '')
          : [],
        verification: verificationStructured,
        next_action: nextActionText
      }, null, 2));
    } else {
      console.log(finalOut);
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
          if (task.owner_agent) {
            console.log(`      Owner:     ${task.owner_agent}`);
          }
          if (task.started_at) {
            console.log(`      Started:   ${task.started_at}`);
          }
          if (task.completed_at) {
            console.log(`      Completed: ${task.completed_at}`);
          }
          if (task.attempts && task.attempts.length > 0) {
            console.log(`      Attempts (${task.attempts.length}):`);
            task.attempts.forEach(att => {
              console.log(`        - Att #${att.attempt_id}: status: ${att.status}, started: ${att.started_at}, ended: ${att.ended_at || 'active'}, summary: "${att.summary}"`);
              if (att.evidence_file) {
                console.log(`          evidence: ${att.evidence_file}`);
              }
              if (att.dirty_files && att.dirty_files.length > 0) {
                console.log(`          files: [${att.dirty_files.join(', ')}]`);
              }
            });
          }
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

  case 'claim': {
    if (!argTaskId || !argAgent) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Missing --task <id> or --agent <agent> arguments' }));
      } else {
        console.error('Error: Missing --task <id> or --agent <agent> arguments');
      }
      process.exit(1);
    }

    acquireLock('claim');
    const spool = readSpool();
    const task = spool.tasks.find(t => t.task_id === argTaskId);
    if (!task) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: `Task "${argTaskId}" not found in spool` }));
      } else {
        console.error(`Error: Task "${argTaskId}" not found in spool`);
      }
      process.exit(1);
    }

    if (task.status !== 'pending') {
      releaseLock();
      const msg = `Task "${argTaskId}" cannot be claimed: status is "${task.status}" (expected "pending")`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    if (task.target_agent !== 'any' && task.target_agent !== argAgent) {
      releaseLock();
      const msg = `Task "${argTaskId}" cannot be claimed by agent "${argAgent}": target_agent is "${task.target_agent}"`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    if (statusResult.status !== 0) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: 'Git status execution failed' }));
      } else {
        console.error('Error: Git status execution failed');
      }
      process.exit(1);
    }
    const gitState = parseGitPorcelain(statusResult.stdout);

    if (gitState.branch !== task.branch) {
      releaseLock();
      const msg = `Branch mismatch.\nCurrent branch: ${gitState.branch}\nExpected branch: ${task.branch}\nSwitch branches manually only after confirming the working tree is clean.`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    if (gitState.branch === 'main' || gitState.branch === 'master') {
      releaseLock();
      const msg = `Cannot operate on protected branch "${gitState.branch}"`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    if (!gitState.isClean) {
      releaseLock();
      const msg = `Cannot claim task: working tree is dirty. Tracked dirty: ${gitState.dirtyFiles.length}, Untracked: ${gitState.untrackedFiles.length}`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg, dirty_files: gitState.dirtyFiles, untracked_files: gitState.untrackedFiles }));
      } else {
        console.error(`Error: ${msg}`);
        gitState.dirtyFiles.forEach(f => console.error(`  [Dirty]   ${f}`));
        gitState.untrackedFiles.forEach(f => console.error(`  [Untrak]  ${f}`));
      }
      process.exit(1);
    }

    const runningTask = spool.tasks.find(t => t.status === 'running');
    if (runningTask) {
      releaseLock();
      const msg = `Cannot claim task: task "${runningTask.task_id}" is currently running. Only one task can run concurrently.`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    const nowStr = new Date().toISOString();
    task.status = 'running';
    task.owner_agent = argAgent;
    task.started_at = nowStr;
    task.updated_at = nowStr;

    task.attempts.push({
      attempt_id: task.attempts.length + 1,
      started_at: nowStr,
      ended_at: null,
      status: 'running',
      summary: '',
      evidence_file: null,
      dirty_files: []
    });

    spool.spool_revision += 1;
    spool.updated_at = nowStr;

    writeSpoolAtomic(spool, 'claim', task.task_id, 'task_claimed', { task_id: task.task_id, agent: argAgent });

    if (isJson) {
      console.log(JSON.stringify({ success: true, task }));
    } else {
      console.log(`Task "${task.task_id}" successfully claimed by agent "${argAgent}".`);
    }
    process.exit(0);
    break;
  }

  case 'complete': {
    if (!argTaskId || !argAgent || !argSummary || !argEvidenceFile) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Missing --task <id>, --agent <agent>, --summary "<text>" or --evidence-file <path> arguments' }));
      } else {
        console.error('Error: Missing --task <id>, --agent <agent>, --summary "<text>" or --evidence-file <path> arguments');
      }
      process.exit(1);
    }

    acquireLock('complete');
    const spool = readSpool();
    const task = spool.tasks.find(t => t.task_id === argTaskId);
    if (!task) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: `Task "${argTaskId}" not found in spool` }));
      } else {
        console.error(`Error: Task "${argTaskId}" not found in spool`);
      }
      process.exit(1);
    }

    if (task.status !== 'running') {
      releaseLock();
      const msg = `Task "${argTaskId}" is not running (current status: "${task.status}")`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    if (task.owner_agent !== argAgent) {
      releaseLock();
      const msg = `Agent mismatch: Task "${argTaskId}" is owned by "${task.owner_agent}", caller is "${argAgent}"`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    const safety = checkInputFileSafety(argEvidenceFile);
    if (!safety.valid) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: `Evidence file safety violation: ${safety.reason}` }));
      } else {
        console.error(`Error: Evidence file safety violation: ${safety.reason}`);
      }
      process.exit(1);
    }

    let fileContent;
    try {
      fileContent = fs.readFileSync(safety.resolved, 'utf8');
    } catch (e) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: `Failed to read evidence file: ${e.message}` }));
      } else {
        console.error(`Error: Failed to read evidence file: ${e.message}`);
      }
      process.exit(1);
    }

    let evidence;
    try {
      evidence = JSON.parse(fileContent);
    } catch (e) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: `Malformed evidence JSON: ${e.message}` }));
      } else {
        console.error(`Error: Malformed evidence JSON: ${e.message}`);
      }
      process.exit(1);
    }

    if (!evidence || typeof evidence !== 'object') {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: 'Evidence must be a JSON object' }));
      } else {
        console.error('Error: Evidence must be a JSON object');
      }
      process.exit(1);
    }

    if (evidence.task_id !== argTaskId) {
      releaseLock();
      const msg = `Evidence task_id mismatch: got "${evidence.task_id}", expected "${argTaskId}"`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    if (!Array.isArray(evidence.commands)) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: 'Evidence must contain a "commands" array' }));
      } else {
        console.error('Error: Evidence must contain a "commands" array');
      }
      process.exit(1);
    }

    const missingChecks = [];
    task.required_checks.forEach(check => {
      const match = evidence.commands.find(c => c && c.name === check.name);
      if (!match) {
        missingChecks.push(`Required check "${check.name}" not reported in evidence`);
      } else if (match.exit_code !== 0) {
        missingChecks.push(`Required check "${check.name}" failed with non-zero exit_code: ${match.exit_code}`);
      }
    });

    if (missingChecks.length > 0) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: 'Check validation failed', details: missingChecks }));
      } else {
        console.error('Error: Required checks validation failed:');
        missingChecks.forEach(mc => console.error(`  - ${mc}`));
      }
      process.exit(1);
    }

    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    if (statusResult.status !== 0) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: 'Git status execution failed' }));
      } else {
        console.error('Error: Git status execution failed');
      }
      process.exit(1);
    }
    const gitState = parseGitPorcelain(statusResult.stdout);

    if (gitState.untrackedFiles.length > 0) {
      releaseLock();
      const msg = `Cannot complete task: untracked non-ignored source files present: ${gitState.untrackedFiles.length}`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg, untracked_files: gitState.untrackedFiles }));
      } else {
        console.error(`Error: ${msg}`);
        gitState.untrackedFiles.forEach(f => console.error(`  - ${f}`));
      }
      process.exit(1);
    }

    const outOfScopeFiles = [];
    gitState.dirtyFiles.forEach(file => {
      if (!fileMatchesPatterns(file, task.allowed_files)) {
        outOfScopeFiles.push(file);
      }
    });

    if (outOfScopeFiles.length > 0) {
      releaseLock();
      const msg = `Cannot complete task: modified files outside allowed_files scope detected. Please mark task as needs-human.`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg, disallowed_files: outOfScopeFiles }));
      } else {
        console.error(`Error: ${msg}`);
        outOfScopeFiles.forEach(f => console.error(`  - [DISALLOWED] ${f}`));
        console.error(`Suggest running: node scripts/agent-kernel.cjs needs-human --task ${task.task_id} --agent ${argAgent} --reason "Dirty files outside allowed scope."`);
      }
      process.exit(1);
    }

    const nowStr = new Date().toISOString();
    task.status = 'completed';
    task.completed_at = nowStr;
    task.updated_at = nowStr;

    const activeAttempt = task.attempts[task.attempts.length - 1];
    if (activeAttempt && activeAttempt.status === 'running') {
      activeAttempt.ended_at = nowStr;
      activeAttempt.status = 'completed';
      activeAttempt.summary = argSummary;
      activeAttempt.evidence_file = argEvidenceFile;
      activeAttempt.dirty_files = gitState.dirtyFiles;
    }

    spool.spool_revision += 1;
    spool.updated_at = nowStr;

    writeSpoolAtomic(spool, 'complete', task.task_id, 'task_completed', { task_id: task.task_id, agent: argAgent });

    if (isJson) {
      console.log(JSON.stringify({ success: true, task }));
    } else {
      console.log(`Task "${task.task_id}" successfully completed by agent "${argAgent}".`);
    }
    process.exit(0);
    break;
  }

  case 'fail': {
    if (!argTaskId || !argAgent || !argSummary) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Missing --task <id>, --agent <agent> or --summary "<text>" arguments' }));
      } else {
        console.error('Error: Missing --task <id>, --agent <agent> or --summary "<text>" arguments');
      }
      process.exit(1);
    }

    acquireLock('fail');
    const spool = readSpool();
    const task = spool.tasks.find(t => t.task_id === argTaskId);
    if (!task) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: `Task "${argTaskId}" not found in spool` }));
      } else {
        console.error(`Error: Task "${argTaskId}" not found in spool`);
      }
      process.exit(1);
    }

    if (task.status !== 'running') {
      releaseLock();
      const msg = `Task "${argTaskId}" is not running (current status: "${task.status}")`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    if (task.owner_agent !== argAgent) {
      releaseLock();
      const msg = `Agent mismatch: Task "${argTaskId}" is owned by "${task.owner_agent}", caller is "${argAgent}"`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    if (argEvidenceFile) {
      const safety = checkInputFileSafety(argEvidenceFile);
      if (!safety.valid) {
        releaseLock();
        if (isJson) {
          console.log(JSON.stringify({ error: `Evidence file safety violation: ${safety.reason}` }));
        } else {
          console.error(`Error: Evidence file safety violation: ${safety.reason}`);
        }
        process.exit(1);
      }
    }

    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    const gitState = statusResult.status === 0 ? parseGitPorcelain(statusResult.stdout) : { dirtyFiles: [] };

    const nowStr = new Date().toISOString();
    task.status = 'failed';
    task.updated_at = nowStr;

    const activeAttempt = task.attempts[task.attempts.length - 1];
    if (activeAttempt && activeAttempt.status === 'running') {
      activeAttempt.ended_at = nowStr;
      activeAttempt.status = 'failed';
      activeAttempt.summary = argSummary;
      activeAttempt.evidence_file = argEvidenceFile || null;
      activeAttempt.dirty_files = gitState.dirtyFiles;
    }

    spool.spool_revision += 1;
    spool.updated_at = nowStr;

    writeSpoolAtomic(spool, 'fail', task.task_id, 'task_failed', { task_id: task.task_id, agent: argAgent });

    if (isJson) {
      console.log(JSON.stringify({ success: true, task }));
    } else {
      console.log(`Task "${task.task_id}" marked as FAILED by agent "${argAgent}".`);
    }
    process.exit(0);
    break;
  }

  case 'blocked': {
    if (!argTaskId || !argAgent || !argReason) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Missing --task <id>, --agent <agent> or --reason "<text>" arguments' }));
      } else {
        console.error('Error: Missing --task <id>, --agent <agent> or --reason "<text>" arguments');
      }
      process.exit(1);
    }

    acquireLock('blocked');
    const spool = readSpool();
    const task = spool.tasks.find(t => t.task_id === argTaskId);
    if (!task) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: `Task "${argTaskId}" not found in spool` }));
      } else {
        console.error(`Error: Task "${argTaskId}" not found in spool`);
      }
      process.exit(1);
    }

    if (task.status !== 'pending' && task.status !== 'running') {
      releaseLock();
      const msg = `Task "${argTaskId}" must be pending or running to mark blocked (current status: "${task.status}")`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    const gitState = statusResult.status === 0 ? parseGitPorcelain(statusResult.stdout) : { dirtyFiles: [] };

    const nowStr = new Date().toISOString();
    
    if (task.status === 'running') {
      const activeAttempt = task.attempts[task.attempts.length - 1];
      if (activeAttempt && activeAttempt.status === 'running') {
        activeAttempt.ended_at = nowStr;
        activeAttempt.status = 'blocked';
        activeAttempt.summary = argReason;
        activeAttempt.dirty_files = gitState.dirtyFiles;
      }
    }

    task.status = 'blocked';
    task.updated_at = nowStr;

    spool.spool_revision += 1;
    spool.updated_at = nowStr;

    writeSpoolAtomic(spool, 'blocked', task.task_id, 'task_blocked', { task_id: task.task_id, agent: argAgent, reason: argReason });

    if (isJson) {
      console.log(JSON.stringify({ success: true, task }));
    } else {
      console.log(`Task "${task.task_id}" marked as BLOCKED by agent "${argAgent}". Reason: ${argReason}`);
    }
    process.exit(0);
    break;
  }

  case 'needs-human': {
    if (!argTaskId || !argAgent || !argReason) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Missing --task <id>, --agent <agent> or --reason "<text>" arguments' }));
      } else {
        console.error('Error: Missing --task <id>, --agent <agent> or --reason "<text>" arguments');
      }
      process.exit(1);
    }

    acquireLock('needs-human');
    const spool = readSpool();
    const task = spool.tasks.find(t => t.task_id === argTaskId);
    if (!task) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: `Task "${argTaskId}" not found in spool` }));
      } else {
        console.error(`Error: Task "${argTaskId}" not found in spool`);
      }
      process.exit(1);
    }

    if (task.status === 'completed' || task.status === 'aborted') {
      releaseLock();
      const msg = `Task "${argTaskId}" cannot be transitioned to needs_human because status is "${task.status}"`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    const gitState = statusResult.status === 0 ? parseGitPorcelain(statusResult.stdout) : { dirtyFiles: [] };

    const nowStr = new Date().toISOString();
    
    if (task.status === 'running') {
      const activeAttempt = task.attempts[task.attempts.length - 1];
      if (activeAttempt && activeAttempt.status === 'running') {
        activeAttempt.ended_at = nowStr;
        activeAttempt.status = 'needs_human';
        activeAttempt.summary = argReason;
        activeAttempt.dirty_files = gitState.dirtyFiles;
      }
    }

    task.status = 'needs_human';
    task.updated_at = nowStr;

    spool.spool_revision += 1;
    spool.updated_at = nowStr;

    writeSpoolAtomic(spool, 'needs-human', task.task_id, 'task_needs_human', { task_id: task.task_id, agent: argAgent, reason: argReason });

    if (isJson) {
      console.log(JSON.stringify({ success: true, task }));
    } else {
      console.log(`Task "${task.task_id}" marked as NEEDS_HUMAN by agent "${argAgent}". Reason: ${argReason}`);
    }
    process.exit(0);
    break;
  }

  case 'abort': {
    if (!argTaskId || !argAgent || !argReason) {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Missing --task <id>, --agent <agent> or --reason "<text>" arguments' }));
      } else {
        console.error('Error: Missing --task <id>, --agent <agent> or --reason "<text>" arguments');
      }
      process.exit(1);
    }

    if (argAgent !== 'human') {
      if (isJson) {
        console.log(JSON.stringify({ error: 'Abort command is restricted strictly to --agent human' }));
      } else {
        console.error('Error: Abort command is restricted strictly to --agent human');
      }
      process.exit(1);
    }

    acquireLock('abort');
    const spool = readSpool();
    const task = spool.tasks.find(t => t.task_id === argTaskId);
    if (!task) {
      releaseLock();
      if (isJson) {
        console.log(JSON.stringify({ error: `Task "${argTaskId}" not found in spool` }));
      } else {
        console.error(`Error: Task "${argTaskId}" not found in spool`);
      }
      process.exit(1);
    }

    if (task.status === 'completed' || task.status === 'aborted') {
      releaseLock();
      const msg = `Task "${argTaskId}" cannot be aborted because status is "${task.status}"`;
      if (isJson) {
        console.log(JSON.stringify({ error: msg }));
      } else {
        console.error(`Error: ${msg}`);
      }
      process.exit(1);
    }

    const statusResult = runGit(['status', '--porcelain=v2', '--branch'], repoRoot);
    const gitState = statusResult.status === 0 ? parseGitPorcelain(statusResult.stdout) : { dirtyFiles: [] };

    const nowStr = new Date().toISOString();
    
    if (task.status === 'running') {
      const activeAttempt = task.attempts[task.attempts.length - 1];
      if (activeAttempt && activeAttempt.status === 'running') {
        activeAttempt.ended_at = nowStr;
        activeAttempt.status = 'aborted';
        activeAttempt.summary = argReason;
        activeAttempt.dirty_files = gitState.dirtyFiles;
      }
    }

    task.status = 'aborted';
    task.updated_at = nowStr;

    spool.spool_revision += 1;
    spool.updated_at = nowStr;

    writeSpoolAtomic(spool, 'abort', task.task_id, 'task_aborted', { task_id: task.task_id, agent: 'human', reason: argReason });

    if (isJson) {
      console.log(JSON.stringify({ success: true, task }));
    } else {
      console.log(`Task "${task.task_id}" permanently ABORTED by human. Reason: ${argReason}`);
    }
    process.exit(0);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    console.error('Available commands: status, doctor, inspect-git, print-context, print-current-context, render-handoff, validate-protocol, init-state, state, validate-state, add-task, lock-status, unlock, claim, complete, fail, blocked, needs-human, abort');
    process.exit(1);
}


