import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  it('keeps ignored dotenv values out of Bun tooling, including nested invocations', () => {
    const bunfig = readFileSync(path.join(REPO, 'bunfig.toml'), 'utf8');
    expect(bunfig).toMatch(/^env = false$/mu);

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
