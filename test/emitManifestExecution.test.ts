import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { isDirectManifestExecution } from '../scripts/emit-manifest.js';

describe('legacy manifest executable identity', () => {
  it('recognizes the exact script through an aliased repository path', () => {
    if (process.platform === 'win32') return;
    const temporary = mkdtempSync(path.join(tmpdir(), 'cortexel-manifest-alias-'));
    try {
      const repository = path.resolve(import.meta.dirname, '..');
      const alias = path.join(temporary, 'aliased-repository');
      symlinkSync(repository, alias, 'dir');
      const aliasedEntry = path.join(alias, 'scripts', 'emit-manifest.ts');
      expect(isDirectManifestExecution(aliasedEntry)).toBe(true);
      expect(isDirectManifestExecution(path.join(alias, 'scripts', 'generate-contract.ts')))
        .toBe(false);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
});
