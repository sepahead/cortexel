import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  generatedSnapshotDifferences,
  snapshotGeneratedPaths,
} from '../scripts/lib/generated-snapshot.js';

describe('generated-tree raw-byte identity', () => {
  it('distinguishes malformed UTF-8 bytes from a well-formed replacement character', () => {
    const malformed = Buffer.from([0xff]);
    const replacement = Buffer.from([0xef, 0xbf, 0xbd]);

    // This is the precise counterexample to permissive string snapshots.
    expect(malformed.toString('utf8')).toBe(replacement.toString('utf8'));
    expect(generatedSnapshotDifferences(
      new Map([['generated.ts', malformed]]),
      new Map([['generated.ts', replacement]]),
    )).toEqual([{ path: 'generated.ts', kind: 'changed' }]);
  });

  it('compares both path inventory and exact bytes', () => {
    const expected = new Map<string, Uint8Array>([
      ['same.json', Buffer.from('{"ok":true}\n', 'utf8')],
      ['missing.json', Buffer.from('missing', 'utf8')],
    ]);
    const actual = new Map<string, Uint8Array>([
      ['same.json', Buffer.from('{"ok":true}\n', 'utf8')],
      ['extra.json', Buffer.from('extra', 'utf8')],
    ]);

    expect(generatedSnapshotDifferences(expected, actual)).toEqual([
      { path: 'extra.json', kind: 'extra' },
      { path: 'missing.json', kind: 'missing' },
    ]);
  });

  it('does not treat Python interpreter caches as generator-owned extras', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cortexel-generated-snapshot-'));
    try {
      const generated = path.join(root, 'python', 'src', 'cortexel', 'generated');
      mkdirSync(path.join(generated, '__pycache__'), { recursive: true });
      writeFileSync(path.join(generated, 'identity.py'), 'PACKAGE_VERSION = "0.9.0"\n', 'utf8');
      writeFileSync(path.join(generated, '__pycache__', 'identity.cpython.pyc'), Buffer.from([0xff]));

      const snapshot = snapshotGeneratedPaths(root, ['python/src/cortexel/generated']);
      expect([...snapshot.keys()]).toEqual(['python/src/cortexel/generated/identity.py']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses an extra indirect entry in a generator-owned tree', () => {
    if (process.platform === 'win32') return;
    const root = mkdtempSync(path.join(tmpdir(), 'cortexel-generated-indirect-'));
    try {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      const absentTarget = path.join(root, 'deliberately-absent.ts');
      symlinkSync(absentTarget, path.join(generated, 'obsolete-extra.ts'));

      expect(() => snapshotGeneratedPaths(root, ['src/generated']))
        .toThrow('generator-owned tree contains an indirect entry');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
