#!/usr/bin/env node
/**
 * Prepare isolated worktrees for non-overlapping pending agent tasks.
 *
 * Dry-run by default:
 *   node scripts/parallel-runner.cjs
 *
 * Execute after reviewing the plan:
 *   node scripts/parallel-runner.cjs --execute
 *
 * Narrow to explicit tasks:
 *   node scripts/parallel-runner.cjs --task task-2026-05-30-007 --execute
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const execute = args.includes('--execute');
const launchAgents = args.includes('--launch-agents');
const forceConflicts = args.includes('--force-conflicts');
const selectedTaskIds = valuesFor('--task');

const mainRepoPath = path.resolve(__dirname, '..');
const spoolPath = path.join(mainRepoPath, '.agents', 'state', 'task_spool.json');
const worktreesParentDir = path.resolve(mainRepoPath, '..', 'poker-agent-worktrees');

function valuesFor(flag) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === flag && args[i + 1]) {
      values.push(args[i + 1]);
      i += 1;
    }
  }
  return values;
}

function run(command, commandArgs, options = {}) {
  if (!execute) {
    console.log(`[dry-run] ${command} ${commandArgs.map(quoteArg).join(' ')}`);
    return { status: 0, stdout: '', stderr: '' };
  }

  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || mainRepoPath,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    shell: false,
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`${command} ${commandArgs.join(' ')} failed${stderr ? `: ${stderr}` : ''}`);
  }

  return result;
}

function quoteArg(value) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function assertSafeBranchName(branch) {
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..') || branch.startsWith('/') || branch.endsWith('/')) {
    throw new Error(`Unsafe branch name in task spool: ${branch}`);
  }
}

function assertSafeTaskId(taskId) {
  if (!/^task-\d{4}-\d{2}-\d{2}-\d{3}$/.test(taskId)) {
    throw new Error(`Unsafe task id in task spool: ${taskId}`);
  }
}

function laneFor(task) {
  const files = task.allowed_files || [];
  if (files.some((file) => file.includes('rangeChecker') || file.includes('ranges.ts') || file.includes('RangesPage'))) return 'range';
  if (files.some((file) => file.includes('scenarioDetector') || file.includes('postflopAnalyzer'))) return 'scenario';
  if (files.some((file) => file.includes('store.ts') || file.includes('types/villain'))) return 'store';
  if (files.some((file) => file.includes('worker') || file.includes('HandsUpload') || file.includes('siteIdentifier'))) return 'worker/import';
  if (files.some((file) => file.endsWith('.tsx') || file.includes('components/') || file.includes('pages/'))) return 'ui';
  if (files.some((file) => file.startsWith('docs/') || file.startsWith('.agents/') || file.startsWith('scripts/'))) return 'docs/protocol';
  return 'general';
}

function findConflicts(tasks) {
  const byFile = new Map();
  const byLane = new Map();

  for (const task of tasks) {
    for (const file of task.allowed_files || []) {
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file).push(task);
    }

    const lane = laneFor(task);
    if (!byLane.has(lane)) byLane.set(lane, []);
    byLane.get(lane).push(task);
  }

  return {
    fileConflicts: [...byFile.entries()].filter(([, taskList]) => taskList.length > 1),
    laneConflicts: [...byLane.entries()].filter(([, taskList]) => taskList.length > 1),
  };
}

function printConflictReport(conflicts) {
  if (conflicts.fileConflicts.length > 0) {
    console.error('\nFile-scope conflicts:');
    for (const [file, tasks] of conflicts.fileConflicts) {
      console.error(`  ${file}`);
      for (const task of tasks) {
        console.error(`    - ${task.task_id}: ${task.title}`);
      }
    }
  }

  if (conflicts.laneConflicts.length > 0) {
    console.error('\nLane conflicts:');
    for (const [lane, tasks] of conflicts.laneConflicts) {
      console.error(`  ${lane}`);
      for (const task of tasks) {
        console.error(`    - ${task.task_id}: ${task.title}`);
      }
    }
  }
}

function ensureDirectory(dir) {
  if (!execute) {
    console.log(`[dry-run] mkdir ${dir}`);
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(file, content) {
  if (!execute) {
    console.log(`[dry-run] write ${file}`);
    return;
  }
  fs.writeFileSync(file, content, 'utf8');
}

function copyJsonSettings(sourceJsonPath, destJsonPath, worktreePath) {
  if (!fs.existsSync(sourceJsonPath)) return;

  if (!execute) {
    console.log(`[dry-run] adapt ${sourceJsonPath} -> ${destJsonPath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(sourceJsonPath, 'utf8'));
  if (!data.permissions) data.permissions = {};
  if (!Array.isArray(data.permissions.additionalDirectories)) {
    data.permissions.additionalDirectories = [];
  }

  for (const dir of [worktreePath, path.join(worktreePath, '.claude'), path.join(worktreePath, 'docs')]) {
    if (!data.permissions.additionalDirectories.includes(dir)) {
      data.permissions.additionalDirectories.push(dir);
    }
  }

  fs.writeFileSync(destJsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function createPrompt(task) {
  const checks = (task.required_checks || [])
    .map((check) => `- ${check.name}: ${check.command}`)
    .join('\n');
  const files = (task.allowed_files || []).map((file) => `- ${file}`).join('\n');

  return `You are executing ${task.task_id}: ${task.title}.

Read first:
1. AGENTS.md
2. docs/agents/TWO_AGENT_BOARD.md
3. docs/agents/TASK_PROTOCOL.md
4. docs/agents/AGENT_HANDOFF.md

Task goal:
${task.goal}

Allowed files:
${files || '- No files listed; stop and ask for a corrected task contract.'}

Required checks:
${checks || '- No required checks listed; choose the narrowest useful verification and record it.'}

Workflow:
1. Confirm the branch is ${task.branch}.
2. Claim the task with: node scripts/agent-kernel.cjs claim --task ${task.task_id} --agent ${task.target_agent}
3. Edit only the allowed files.
4. Run the required checks and write .agents/state/evidence-${task.task_id}.json with task_id and command exit codes.
5. Complete with: node scripts/agent-kernel.cjs complete --task ${task.task_id} --agent ${task.target_agent} --summary "<short summary>" --evidence-file .agents/state/evidence-${task.task_id}.json
6. After completion, update docs/agents/AGENT_HANDOFF.md and stop.
`;
}

if (!fs.existsSync(spoolPath)) {
  console.error(`Error: spool ledger not found at ${spoolPath}`);
  process.exit(1);
}

const spool = JSON.parse(fs.readFileSync(spoolPath, 'utf8'));
let pendingTasks = spool.tasks.filter((task) => task.status === 'pending');

if (selectedTaskIds.length > 0) {
  const selected = new Set(selectedTaskIds);
  pendingTasks = pendingTasks.filter((task) => selected.has(task.task_id));
}

if (pendingTasks.length === 0) {
  console.log('No matching pending tasks found.');
  process.exit(0);
}

for (const task of pendingTasks) {
  assertSafeTaskId(task.task_id);
  assertSafeBranchName(task.branch);
}

const conflicts = findConflicts(pendingTasks);
const hasConflicts = conflicts.fileConflicts.length > 0 || conflicts.laneConflicts.length > 0;

console.log(`Selected pending tasks: ${pendingTasks.length}`);
for (const task of pendingTasks) {
  console.log(`- ${task.task_id} [${laneFor(task)}] ${task.branch}: ${task.title}`);
}

if (hasConflicts) {
  printConflictReport(conflicts);
  if (!forceConflicts) {
    console.error('\nRefusing to prepare parallel worktrees until conflicts are resolved.');
    console.error('Use repeated --task flags to choose a non-overlapping subset, or pass --force-conflicts only after human review.');
    process.exit(1);
  }
}

if (!execute) {
  console.log('\nDry-run only. Re-run with --execute after reviewing this plan.');
}

ensureDirectory(worktreesParentDir);

for (const task of pendingTasks) {
  const worktreePath = path.join(worktreesParentDir, task.task_id);
  const nodeModulesPath = path.join(worktreePath, 'node_modules');
  const agentStatePath = path.join(worktreePath, '.agents', 'state');
  const claudePath = path.join(worktreePath, '.claude');
  const runnerPath = path.join(worktreePath, 'TASK_RUNNER.bat');

  console.log(`\nPreparing ${task.task_id} at ${worktreePath}`);

  if (!fs.existsSync(worktreePath)) {
    try {
      run('git', ['worktree', 'add', '-b', task.branch, worktreePath, 'origin/main'], { stdio: 'inherit' });
    } catch (error) {
      console.log(`Branch creation failed, trying existing branch: ${task.branch}`);
      run('git', ['worktree', 'add', worktreePath, task.branch], { stdio: 'inherit' });
    }
  } else {
    console.log(`Worktree already exists: ${worktreePath}`);
  }

  if (!fs.existsSync(nodeModulesPath)) {
    run('cmd.exe', ['/c', 'mklink', '/J', nodeModulesPath, path.join(mainRepoPath, 'node_modules')], { stdio: 'inherit' });
  }

  ensureDirectory(path.join(worktreePath, '.agents'));
  if (!fs.existsSync(agentStatePath)) {
    run('cmd.exe', ['/c', 'mklink', '/J', agentStatePath, path.join(mainRepoPath, '.agents', 'state')], { stdio: 'inherit' });
  }

  ensureDirectory(claudePath);
  copyJsonSettings(path.join(mainRepoPath, '.claude', 'settings.json'), path.join(claudePath, 'settings.json'), worktreePath);
  copyJsonSettings(path.join(mainRepoPath, '.claude', 'settings.local.json'), path.join(claudePath, 'settings.local.json'), worktreePath);

  writeFile(path.join(worktreePath, 'TASK_PROMPT.txt'), createPrompt(task));

  const agentCommand = task.target_agent === 'antigravity' ? 'antigravity' : 'claude';
  writeFile(runnerPath, `@echo off\r\ncd /d "${worktreePath}"\r\n${agentCommand} "Read and execute the instructions in TASK_PROMPT.txt"\r\n`);

  if (launchAgents) {
    run('cmd.exe', ['/c', 'start', '', 'cmd.exe', '/k', runnerPath], { stdio: 'inherit' });
  } else {
    console.log(`Agent launcher prepared: ${runnerPath}`);
  }
}

console.log(execute ? '\nDone.' : '\nDry-run complete; no files or worktrees were changed.');
