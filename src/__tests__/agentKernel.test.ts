import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const kernelPath = resolve(process.cwd(), 'scripts/agent-kernel.cjs');

const tempRepos: string[] = [];

function runGit(repo: string, args: string[]) {
  execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
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
  });
}

afterEach(() => {
  while (tempRepos.length > 0) {
    const repo = tempRepos.pop();
    if (repo) rmSync(repo, { recursive: true, force: true });
  }
});

describe('agent-kernel task scope', () => {
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
  it('orders handoff before completion and stops after completion', () => {
    const runner = readFileSync(resolve(process.cwd(), 'scripts/parallel-runner.cjs'), 'utf8');

    expect(runner.indexOf('validate-evidence')).toBeLessThan(runner.indexOf('render-handoff'));
    expect(runner.indexOf('render-handoff')).toBeLessThan(runner.indexOf('complete --task'));
    expect(runner.indexOf('complete --task')).toBeLessThan(runner.indexOf('Do not edit or generate any repo files after completion'));
  });

  it('keeps the active handoff inside the kernel context budget', () => {
    expect(statSync(resolve(process.cwd(), 'docs/agents/AGENT_HANDOFF.md')).size).toBeLessThanOrEqual(5120);
  });
});
