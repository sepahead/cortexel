import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO = path.resolve(import.meta.dirname, '..');
const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.py',
  '.sh',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

describe('source hygiene', () => {
  it('ignores every root .superstack entry type without hiding nested source paths', () => {
    const gitignore = readFileSync(path.join(REPO, '.gitignore'), 'utf8');
    expect(gitignore.split(/\r?\n/u).filter((line) => line.includes('.superstack'))).toEqual([
      '/.superstack',
    ]);
    expect(
      execFileSync('git', ['ls-files', '--', '.superstack'], {
        cwd: REPO,
        encoding: 'utf8',
      }),
    ).toBe('');

    const temporary = mkdtempSync(path.join(os.tmpdir(), 'cortexel-superstack-ignore-'));
    const emptyGitTemplate = path.join(temporary, 'empty-git-template');
    const isolatedGitConfig = ['-c', `core.excludesFile=${os.devNull}`] as const;
    const ignored = (candidate: string): number | null =>
      spawnSync(
        'git',
        [...isolatedGitConfig, 'check-ignore', '--no-index', '--quiet', '--', candidate],
        {
          cwd: temporary,
          encoding: 'utf8',
        },
      ).status;
    try {
      mkdirSync(emptyGitTemplate);
      execFileSync(
        'git',
        [...isolatedGitConfig, 'init', '--quiet', `--template=${emptyGitTemplate}`],
        { cwd: temporary },
      );
      writeFileSync(path.join(temporary, '.gitignore'), gitignore, {
        encoding: 'utf8',
        mode: 0o644,
      });

      const superstack = path.join(temporary, '.superstack');
      writeFileSync(superstack, 'regular file\n');
      expect(ignored('.superstack')).toBe(0);
      rmSync(superstack);

      mkdirSync(superstack);
      writeFileSync(path.join(superstack, 'probe'), 'directory member\n');
      expect(ignored('.superstack')).toBe(0);
      expect(ignored('.superstack/probe')).toBe(0);
      rmSync(superstack, { recursive: true });

      if (process.platform !== 'win32') {
        symlinkSync('missing-superstack-target', superstack);
        expect(ignored('.superstack')).toBe(0);
        rmSync(superstack);
      }

      mkdirSync(path.join(temporary, 'nested'));
      writeFileSync(path.join(temporary, 'nested', '.superstack'), 'nested source\n');
      expect(ignored('nested/.superstack')).toBe(1);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('pins every CI job to the reviewed Ubuntu OS family', () => {
    const workflow = readFileSync(
      path.join(REPO, '.github', 'workflows', 'ci.yml'),
      'utf8',
    );
    const runnerLabels = [...workflow.matchAll(/^\s+runs-on:\s+(\S+)\s*$/gmu)].map(
      (match) => match[1],
    );
    expect(runnerLabels).toEqual(Array.from({ length: 5 }, () => 'ubuntu-24.04'));
    expect(workflow).not.toContain('ubuntu-latest');
  });

  it('keeps ignored dotenv values out of Bun tooling, including nested invocations', () => {
    const bunfig = readFileSync(path.join(REPO, 'bunfig.toml'), 'utf8');
    expect(bunfig).toMatch(/^env = false$/mu);
    expect(bunfig).toMatch(/^auto = "disable"$/mu);

    const temporary = mkdtempSync(path.join(os.tmpdir(), 'cortexel-no-dotenv-'));
    try {
      writeFileSync(path.join(temporary, 'bunfig.toml'), bunfig, { encoding: 'utf8', mode: 0o644 });
      writeFileSync(path.join(temporary, '.env'), 'CORTEXEL_DOTENV_SENTINEL=must-not-load\n', {
        encoding: 'utf8',
        mode: 0o600,
      });
      writeFileSync(
        path.join(temporary, 'package.json'),
        JSON.stringify({
          scripts: {
            inner:
              'bun --print "process.env.CORTEXEL_DOTENV_SENTINEL === undefined ? \'absent\' : \'loaded\'"',
            outer: 'bun run inner',
          },
        }),
        { encoding: 'utf8', mode: 0o644 },
      );
      const environment = { ...process.env };
      delete environment.CORTEXEL_DOTENV_SENTINEL;
      const output = execFileSync('bun', ['run', 'outer'], {
        cwd: temporary,
        encoding: 'utf8',
        env: environment,
      });
      expect(output.trim().split(/\r?\n/u).at(-1)).toBe('absent');
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('requests copyfile bootstrapping and keeps CI installs on fresh detached caches', () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(REPO, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, unknown> };
    expect(packageJson.scripts?.bootstrap).toBe(
      'bun install --frozen-lockfile --force --backend=copyfile',
    );

    const workflow = readFileSync(
      path.join(REPO, '.github', 'workflows', 'ci.yml'),
      'utf8',
    );
    const workflowLines = workflow.split(/\r?\n/u);
    const installLineIndexes = workflowLines.flatMap((line, index) =>
      line.includes('install --frozen-lockfile --backend=copyfile') ? [index] : [],
    );
    expect(installLineIndexes).toHaveLength(3);
    expect(workflow.match(/BUN_INSTALL_CACHE_DIR=/gu)).toHaveLength(3);
    expect(
      workflow.match(/find -P node_modules -type f -links \+1 -print -quit/gu),
    ).toHaveLength(3);
    for (const installLineIndex of installLineIndexes) {
      const installBoundary = workflowLines
        .slice(Math.max(0, installLineIndex - 10), installLineIndex + 1)
        .join('\n');
      expect(installBoundary).toContain('env -i');
      expect(installBoundary).toContain('BUN_INSTALL_CACHE_DIR=');
      expect(installBoundary).toContain('HOME=');
      expect(installBoundary).toContain('XDG_CONFIG_HOME=');
      expect(installBoundary).toContain('TMPDIR=');
      expect(installBoundary).toContain('PATH="$(dirname "$');
    }
    expect(workflow).not.toMatch(/install --frozen-lockfile(?:\s|$)(?![^\r\n]*--backend)/u);
  });

  it('contains no literal NUL byte in tracked or unignored text sources', () => {
    const listed = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
      cwd: REPO,
    })
      .toString('utf8')
      .split('\0')
      .filter(Boolean)
      .filter((file) => TEXT_EXTENSIONS.has(path.extname(file)));

    const contaminated = listed.filter((file) => {
      try {
        return readFileSync(path.join(REPO, file)).includes(0);
      } catch (error) {
        // `git ls-files --cached` also reports tracked paths deleted by the current
        // worktree (for example stale content-hashed dist chunks after a clean build).
        // Such a path contains no bytes to scan. It can also disappear between listing
        // and reading in a concurrent build; every other I/O failure remains fatal.
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
        throw error;
      }
    });
    expect(contaminated).toEqual([]);
  });
});
