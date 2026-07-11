import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const kernelPath = resolve(process.cwd(), 'scripts/agent-kernel.cjs');

const tempRepos: string[] = [];

// Ignore the host's global/system git config (e.g. forced commit signing)
// so temp-repo commits behave the same on every machine.
const gitEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_AUTHOR_NAME: 'Kernel Test',
  GIT_AUTHOR_EMAIL: 'kernel@example.test',
  GIT_COMMITTER_NAME: 'Kernel Test',
  GIT_COMMITTER_EMAIL: 'kernel@example.test',
};

function runGit(repo: string, args: string[]) {
  execFileSync('git', args, { cwd: repo, stdio: 'pipe', env: gitEnv });
}

function write(repo: string, file: string, contents: string) {
  const fullPath = join(repo, file);
  mkdirSync(resolve(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, contents, 'utf8');
}

function createKernelRepo(taskOverrides: Record<string, unknown> = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'agent-kernel-'));
  tempRepos.push(repo);

  runGit(repo, ['init']);
  write(repo, '.gitignore', '.agents/state/\n.agents/runs/\n');
  write(repo, 'src/app.ts', 'export const value = 1;\n');
  write(repo, 'docs/agents/AGENT_HANDOFF.md', '# Agent Handoff Log\n');
  write(repo, 'docs/agents/TASK_PROTOCOL.md', '# Task Protocol\n');
  write(repo, 'docs/agents/HANDOFF_PROTOCOL.md', '# Handoff Protocol\n');
  write(repo, 'docs/product/STATUS.md', '# Status\n');

  const task = {
    task_id: 'task-2026-06-06-001',
    title: 'Kernel test task',
    status: 'running',
    target_agent: 'hermes',
    owner_agent: 'hermes',
    branch: 'kernel-test',
    goal: 'Exercise kernel completion scope.',
    allowed_files: ['src/app.ts'],
    protocol_files: [],
    generated_files: [],
    required_checks: [{ name: 'typecheck', command: 'npm run typecheck' }],
    attempts: [
      {
        attempt_id: 1,
        started_at: '2026-06-06T00:00:00.000Z',
        ended_at: null,
        status: 'running',
        summary: '',
        evidence_file: null,
        dirty_files: [],
      },
    ],
    created_at: '2026-06-06T00:00:00.000Z',
    updated_at: '2026-06-06T00:00:00.000Z',
    ...taskOverrides,
  };

  write(
    repo,
    '.agents/state/task_spool.json',
    `${JSON.stringify(
      {
        schema_version: '1.0',
        spool_revision: 1,
        created_at: '2026-06-06T00:00:00.000Z',
        updated_at: '2026-06-06T00:00:00.000Z',
        tasks: [task],
      },
      null,
      2,
    )}\n`,
  );
  write(
    repo,
    '.agents/state/evidence-task-2026-06-06-001.json',
    `${JSON.stringify(
      {
        task_id: 'task-2026-06-06-001',
        commands: [
          {
            name: 'typecheck',
            command: 'npm run typecheck',
            exit_code: 0,
            stdout: 'passed',
            stderr: '',
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

  runGit(repo, ['add', '.']);
  runGit(repo, ['-c', 'user.name=Kernel Test', '-c', 'user.email=kernel@example.test', 'commit', '-m', 'init']);

  return repo;
}

function runKernel(repo: string, args: string[]) {
  return spawnSync(process.execPath, [kernelPath, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: gitEnv,
  });
}

afterEach(() => {
  while (tempRepos.length > 0) {
    const repo = tempRepos.pop();
    if (repo) rmSync(repo, { recursive: true, force: true });
  }
});

describe('agent-kernel task scope', () => {
  it('accepts codex plus explicit orchestration fields', () => {
    const repo = createKernelRepo({
      target_agent: 'codex',
      owner_agent: 'codex',
      mode: 'read_only',
      lane: 'ui-review',
      worker_tier: 'cheap',
      freshness_days: 7,
      expected_output: 'Return salvage, rework, and discard buckets.',
    });

    const result = runKernel(repo, ['validate-state', '--json']);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).pass).toBe(true);
  });

  it('completes with dirty files inside allowed, protocol, and generated scope', () => {
    const repo = createKernelRepo({
      protocol_files: ['docs/agents/AGENT_HANDOFF.md'],
      generated_files: ['docs/product/STATUS.md'],
    });

    write(repo, 'src/app.ts', 'export const value = 2;\n');
    write(repo, 'docs/agents/AGENT_HANDOFF.md', '# Agent Handoff Log\n\n## Test\n');
    write(repo, 'docs/product/STATUS.md', '# Status\n\nUpdated.\n');

    const result = runKernel(repo, [
      'complete',
      '--task',
      'task-2026-06-06-001',
      '--agent',
      'hermes',
      '--summary',
      'done',
      '--evidence-file',
      '.agents/state/evidence-task-2026-06-06-001.json',
      '--json',
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).success).toBe(true);
  });

  it('rejects dirty files outside the effective task scope', () => {
    const repo = createKernelRepo();

    write(repo, 'src/app.ts', 'export const value = 2;\n');
    write(repo, 'docs/agents/AGENT_HANDOFF.md', '# Agent Handoff Log\n\n## Out of scope\n');

    const result = runKernel(repo, [
      'complete',
      '--task',
      'task-2026-06-06-001',
      '--agent',
      'hermes',
      '--summary',
      'done',
      '--evidence-file',
      '.agents/state/evidence-task-2026-06-06-001.json',
      '--json',
    ]);

    expect(result.status).not.toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.disallowed_files).toContain('docs/agents/AGENT_HANDOFF.md');
  });

  it('preflights evidence without completing the task', () => {
    const repo = createKernelRepo();

    const result = runKernel(repo, [
      'validate-evidence',
      '--task',
      'task-2026-06-06-001',
      '--evidence-file',
      '.agents/state/evidence-task-2026-06-06-001.json',
      '--json',
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      pass: true,
      task_id: 'task-2026-06-06-001',
    });
  });
});

describe('agent runner protocol', () => {
  it('routes the cheap Claude tier to Haiku rather than an unpriced alias', () => {
    const workers = JSON.parse(readFileSync(resolve(process.cwd(), '.agents/workers.json'), 'utf8'));

    expect(workers.workers.claude.tier_args.cheap).toEqual(['--model', 'haiku', '--effort', 'low']);
    expect(workers.workers.claude.tier_args.cheap).not.toContain('fable');
  });

  it('orders handoff before completion and stops after completion', () => {
    const runner = readFileSync(resolve(process.cwd(), 'scripts/parallel-runner.cjs'), 'utf8');

    expect(runner.indexOf('validate-evidence')).toBeLessThan(runner.indexOf('render-handoff'));
    expect(runner.indexOf('render-handoff')).toBeLessThan(runner.indexOf('complete --task'));
    expect(runner.indexOf('complete --task')).toBeLessThan(runner.indexOf('Do not edit or generate any repo files after completion'));
  });

  it('keeps the active handoff inside the kernel context budget', () => {
    expect(statSync(resolve(process.cwd(), 'docs/agents/AGENT_HANDOFF.md')).size).toBeLessThanOrEqual(5120);
  });

  it('detects conflicts across the complete write scope and requires explicit selection', () => {
    const runner = readFileSync(resolve(process.cwd(), 'scripts/parallel-runner.cjs'), 'utf8');

    expect(runner).toContain('...(task.protocol_files || [])');
    expect(runner).toContain('...(task.generated_files || [])');
    expect(runner).toContain('Refusing implicit first/all-pending selection');
    expect(runner).toContain('Stale task truth checks');
    expect(runner).not.toContain("settings.local.json'), path.join(claudePath, 'settings.local.json");
    expect(runner).toContain('scripts\\\\agent-dispatch.ps1 -Task');
  });

  it('keeps read-only dispatch separate and redacts prompts from logs', () => {
    const dispatcher = readFileSync(resolve(process.cwd(), 'scripts/agent-dispatch.ps1'), 'utf8');

    expect(dispatcher).toContain('mode=read_only');
    expect(dispatcher).toContain('Do not edit, create, delete, stage, commit, push, or open a PR.');
    expect(dispatcher).toContain('Command: $($workerDef.command) $($displayArgs -join');
    expect(dispatcher).not.toContain('Command: $($workerDef.command) $($argsExpanded -join');
    expect(dispatcher).toContain("elseif ($declaredWorker) { $declaredWorker } elseif ($tierDefault)");
  });
});
