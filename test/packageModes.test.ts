import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CLOSED_PACKAGE_FILES,
  finalizePackageModes,
  normalizePackageModes,
  PACKAGE_FILE_MODES,
} from '../scripts/lib/package-modes.js';

function permissions(target: string): number {
  return lstatSync(target).mode & 0o777;
}

describe('deterministic package modes', () => {
  it('runs normalization after every build emitter', () => {
    const packageJson = JSON.parse(readFileSync(
      path.resolve(import.meta.dirname, '../package.json'),
      'utf8',
    )) as { scripts: { build: string } };
    expect(packageJson.scripts.build.endsWith('tsx scripts/finalize-package.ts')).toBe(true);
    expect(packageJson.scripts.build.indexOf('tsx scripts/emit-manifest.ts'))
      .toBeLessThan(packageJson.scripts.build.indexOf('tsx scripts/finalize-package.ts'));
  });

  it('normalizes a restrictive-umask tree after every file has been emitted', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'cortexel-package-modes-'));
    const dist = path.join(parent, 'dist');
    const previousUmask = process.umask(0o077);
    try {
      mkdirSync(path.join(dist, 'cli'), { recursive: true });
      mkdirSync(path.join(dist, 'contract'), { recursive: true });
      writeFileSync(path.join(dist, 'index.js'), 'export {};\n', 'utf8');
      writeFileSync(path.join(dist, 'index.d.ts'), 'export {};\n', 'utf8');
      writeFileSync(path.join(dist, 'cli', 'main.js'), '#!/usr/bin/env node\n', 'utf8');
      writeFileSync(path.join(dist, 'skills.manifest.json'), '{}\n', 'utf8');
      writeFileSync(path.join(dist, 'contract', 'manifest.v1.json'), '{}\n', 'utf8');
      expect(permissions(path.join(dist, 'index.js'))).toBe(0o600);
    } finally {
      process.umask(previousUmask);
    }

    try {
      const receipt = normalizePackageModes(dist);
      expect(receipt).toEqual({ directories: 3, regularFiles: 5, executableFiles: 1 });
      expect(permissions(dist)).toBe(PACKAGE_FILE_MODES.directory);
      expect(permissions(path.join(dist, 'cli'))).toBe(PACKAGE_FILE_MODES.directory);
      expect(permissions(path.join(dist, 'index.js'))).toBe(PACKAGE_FILE_MODES.regular);
      expect(permissions(path.join(dist, 'index.d.ts'))).toBe(PACKAGE_FILE_MODES.regular);
      expect(permissions(path.join(dist, 'contract', 'manifest.v1.json')))
        .toBe(PACKAGE_FILE_MODES.regular);
      expect(permissions(path.join(dist, 'cli', 'main.js'))).toBe(PACKAGE_FILE_MODES.executable);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('normalizes the exact root tarball inventory as well as dist', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cortexel-package-root-modes-'));
    const previousUmask = process.umask(0o077);
    try {
      writeFileSync(
        path.join(root, 'package.json'),
        `${JSON.stringify({ files: CLOSED_PACKAGE_FILES })}\n`,
        'utf8',
      );
      for (const relative of CLOSED_PACKAGE_FILES) {
        if (relative === 'dist' || relative === 'LICENSES') continue;
        writeFileSync(path.join(root, relative), `${relative}\n`, 'utf8');
      }
      mkdirSync(path.join(root, 'LICENSES'));
      writeFileSync(path.join(root, 'LICENSES', 'license.txt'), 'license\n', 'utf8');
      mkdirSync(path.join(root, 'dist', 'cli'), { recursive: true });
      writeFileSync(path.join(root, 'dist', 'index.js'), 'export {};\n', 'utf8');
      writeFileSync(path.join(root, 'dist', 'cli', 'main.js'), '#!/usr/bin/env node\n', 'utf8');
      writeFileSync(path.join(root, 'dist', 'skills.manifest.json'), '{}\n', 'utf8');
    } finally {
      process.umask(previousUmask);
    }

    try {
      const receipt = finalizePackageModes(root);
      expect(receipt).toEqual({ directories: 3, regularFiles: 13, executableFiles: 1 });
      for (const relative of ['package.json', 'README.md', 'LICENSES/license.txt', 'dist/index.js']) {
        expect(permissions(path.join(root, relative)), relative).toBe(PACKAGE_FILE_MODES.regular);
      }
      expect(permissions(path.join(root, 'LICENSES'))).toBe(PACKAGE_FILE_MODES.directory);
      expect(permissions(path.join(root, 'dist', 'cli', 'main.js')))
        .toBe(PACKAGE_FILE_MODES.executable);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses an indirect dist root or descendant without touching its target', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'cortexel-package-modes-link-'));
    try {
      const external = path.join(parent, 'external.js');
      writeFileSync(external, 'sentinel\n', 'utf8');
      chmodSync(external, 0o600);

      const direct = path.join(parent, 'direct');
      mkdirSync(path.join(direct, 'cli'), { recursive: true });
      writeFileSync(path.join(direct, 'cli', 'main.js'), '#!/usr/bin/env node\n', 'utf8');
      writeFileSync(path.join(direct, 'skills.manifest.json'), '{}\n', 'utf8');
      symlinkSync(external, path.join(direct, 'escape.js'));
      expect(() => normalizePackageModes(direct)).toThrow('indirect entry');
      expect(readFileSync(external, 'utf8')).toBe('sentinel\n');
      expect(permissions(external)).toBe(0o600);

      const indirectRoot = path.join(parent, 'dist-link');
      symlinkSync(direct, indirectRoot, 'dir');
      expect(() => normalizePackageModes(indirectRoot)).toThrow('direct directory');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
