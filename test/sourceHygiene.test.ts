import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
  it('contains no literal NUL byte in tracked or unignored text sources', () => {
    const listed = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
      cwd: REPO,
    })
      .toString('utf8')
      .split('\0')
      .filter(Boolean)
      .filter((file) => TEXT_EXTENSIONS.has(path.extname(file)));

    const contaminated = listed.filter((file) => readFileSync(path.join(REPO, file)).includes(0));
    expect(contaminated).toEqual([]);
  });
});
