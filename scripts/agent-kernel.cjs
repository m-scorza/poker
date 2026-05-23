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
    repoRoot = rootCheck.stdout;
  }
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
  console.error('Available commands: status, doctor, inspect-git, print-context, validate-protocol');
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

    // Check for accidental Phase 3 forbidden runtime files
    const forbiddenPaths = [
      path.join(repoRoot, '.agents', 'state'),
      path.join(repoRoot, '.agents', 'spool.lock'),
      path.join(repoRoot, '.agents', 'events.ndjson'),
      path.join(repoRoot, '.agents', 'runs'),
      path.join(repoRoot, 'task_spool.json')
    ];
    const presentForbidden = forbiddenPaths.filter(p => fs.existsSync(p)).map(p => path.relative(repoRoot, p));

    const output = {
      repo_root: repoRoot,
      branch: gitState ? gitState.branch : 'unknown',
      is_protected_branch: gitState ? (gitState.branch === 'main' || gitState.branch === 'master') : false,
      is_clean: gitState ? gitState.isClean : false,
      dirty_files: gitState ? gitState.dirtyFiles : [],
      untracked_files: gitState ? gitState.untrackedFiles : [],
      current_context_present: currentContextPresent,
      forbidden_files_present: presentForbidden
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
      { path: path.join(repoRoot, '.agents', 'state'), name: '.agents/state/' },
      { path: path.join(repoRoot, '.agents', 'spool.lock'), name: '.agents/spool.lock' },
      { path: path.join(repoRoot, '.agents', 'events.ndjson'), name: '.agents/events.ndjson' },
      { path: path.join(repoRoot, '.agents', 'runs'), name: '.agents/runs/' },
      { path: path.join(repoRoot, 'task_spool.json'), name: 'task_spool.json' }
    ];
    const presentForbidden = forbiddenPaths.filter(p => fs.existsSync(p.path));
    checks.push({
      name: 'State Isolation',
      pass: presentForbidden.length === 0,
      detail: presentForbidden.length === 0 ? 'No forbidden runtime state files present' : `Found forbidden files: ${presentForbidden.map(p => p.name).join(', ')}`
    });

    // 6. Required active docs exist
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

    // 7. .gitignore contains runtime ignore rules
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

    // 8. .gitattributes exists
    const gitattributesPath = path.join(repoRoot, '.gitattributes');
    const gitattributesExists = fs.existsSync(gitattributesPath);
    checks.push({ name: 'Gitattributes Setup', pass: gitattributesExists, detail: gitattributesExists ? 'Present' : '.gitattributes missing' });

    // 9. Protocol size limits pass
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

  default:
    console.error(`Unknown command: ${command}`);
    console.error('Available commands: status, doctor, inspect-git, print-context, validate-protocol');
    process.exit(1);
}
