import {
  chmodSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CLOSED_PACKAGE_FILES,
  CLOSED_PACKAGE_SOURCE_TREES,
  finalizePackageModes,
  normalizePackageModes,
  PACKAGE_FILE_MODES,
  PACKAGE_MODE_TREE_LIMITS,
} from '../scripts/lib/package-modes.js';

function permissions(target: string): number {
  return lstatSync(target).mode & 0o777;
}

describe('deterministic package modes', () => {
  it('runs normalization after every build emitter', () => {
    const packageJson = JSON.parse(readFileSync(
      path.resolve(import.meta.dirname, '../package.json'),
      'utf8',
    )) as { scripts: Record<string, string> };
    expect(packageJson.scripts.build).toContain('tsx scripts/build-package.ts');
    expect(packageJson.scripts.build).not.toMatch(
      /(?:^|&&\s*)(?:tsdown|tsup)(?:\s*&&|$)/u,
    );
    expect(packageJson.scripts['lint:package']).toBe('publint --pack=false');
    expect(packageJson.scripts.build.endsWith('tsx scripts/finalize-package.ts')).toBe(true);
    expect(packageJson.scripts.build.indexOf('tsx scripts/emit-manifest.ts'))
      .toBeLessThan(packageJson.scripts.build.indexOf('tsx scripts/finalize-package.ts'));
    const finalizer = readFileSync(
      path.resolve(import.meta.dirname, '../scripts/finalize-package.ts'),
      'utf8',
    );
    expect(finalizer.match(/verifyFinalPackageBuildOutput\(ROOT\)/gu)).toHaveLength(2);
    expect(finalizer.indexOf('verifyFinalPackageBuildOutput(ROOT)'))
      .toBeLessThan(finalizer.indexOf('finalizePackageModes(ROOT)'));
    expect(finalizer.lastIndexOf('verifyFinalPackageBuildOutput(ROOT)'))
      .toBeGreaterThan(finalizer.indexOf('finalizePackageModes(ROOT)'));
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

  it('verifies the exact root tarball inventory while normalizing generated dist', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cortexel-package-root-modes-'));
    const previousUmask = process.umask(0o077);
    try {
      writeFileSync(
        path.join(root, 'package.json'),
        `${JSON.stringify({ files: CLOSED_PACKAGE_FILES })}\n`,
        'utf8',
      );
      for (const relative of CLOSED_PACKAGE_FILES) {
        if (relative === 'dist' || CLOSED_PACKAGE_SOURCE_TREES.includes(
          relative as (typeof CLOSED_PACKAGE_SOURCE_TREES)[number],
        )) continue;
        writeFileSync(path.join(root, relative), `${relative}\n`, 'utf8');
      }
      for (const relative of CLOSED_PACKAGE_SOURCE_TREES) {
        mkdirSync(path.join(root, relative));
        writeFileSync(path.join(root, relative, 'fixture.txt'), `${relative}\n`, 'utf8');
      }
      mkdirSync(path.join(root, 'dist', 'cli'), { recursive: true });
      writeFileSync(path.join(root, 'dist', 'index.js'), 'export {};\n', 'utf8');
      writeFileSync(path.join(root, 'dist', 'cli', 'main.js'), '#!/usr/bin/env node\n', 'utf8');
      writeFileSync(path.join(root, 'dist', 'skills.manifest.json'), '{}\n', 'utf8');
    } finally {
      process.umask(previousUmask);
    }

    try {
      chmodSync(path.join(root, 'package.json'), PACKAGE_FILE_MODES.regular);
      for (const relative of CLOSED_PACKAGE_FILES) {
        if (relative === 'dist') continue;
        const target = path.join(root, relative);
        chmodSync(
          target,
          CLOSED_PACKAGE_SOURCE_TREES.includes(
            relative as (typeof CLOSED_PACKAGE_SOURCE_TREES)[number],
          )
            ? PACKAGE_FILE_MODES.directory
            : PACKAGE_FILE_MODES.regular,
        );
      }
      for (const relative of CLOSED_PACKAGE_SOURCE_TREES) {
        chmodSync(path.join(root, relative, 'fixture.txt'), PACKAGE_FILE_MODES.regular);
      }

      const receipt = finalizePackageModes(root);
      expect(receipt).toEqual({ directories: 5, regularFiles: 19, executableFiles: 1 });
      for (const relative of ['package.json', 'README.md', 'LICENSES/fixture.txt', 'dist/index.js']) {
        expect(permissions(path.join(root, relative)), relative).toBe(PACKAGE_FILE_MODES.regular);
      }
      expect(permissions(path.join(root, 'LICENSES'))).toBe(PACKAGE_FILE_MODES.directory);
      expect(permissions(path.join(root, 'dist', 'cli', 'main.js')))
        .toBe(PACKAGE_FILE_MODES.executable);

      chmodSync(path.join(root, 'README.md'), 0o600);
      expect(() => finalizePackageModes(root)).toThrow(
        'package source entry must have mode 644: README.md; found 600',
      );
      expect(permissions(path.join(root, 'README.md'))).toBe(0o600);

      chmodSync(path.join(root, 'README.md'), PACKAGE_FILE_MODES.regular);
      chmodSync(path.join(root, 'LICENSES'), 0o700);
      expect(() => finalizePackageModes(root)).toThrow(
        'package source entry must have mode 755: LICENSES; found 700',
      );
      expect(permissions(path.join(root, 'LICENSES'))).toBe(0o700);

      chmodSync(path.join(root, 'LICENSES'), PACKAGE_FILE_MODES.directory);
      const externalRootFile = path.join(root, 'unpackaged-readme.md');
      writeFileSync(externalRootFile, 'external root file\n', 'utf8');
      chmodSync(externalRootFile, PACKAGE_FILE_MODES.regular);
      rmSync(path.join(root, 'README.md'));
      linkSync(externalRootFile, path.join(root, 'README.md'));
      expect(() => finalizePackageModes(root)).toThrow(
        'package root regular file must have exactly one hard link: README.md; found 2',
      );
      expect(readFileSync(externalRootFile, 'utf8')).toBe('external root file\n');
      expect(permissions(externalRootFile)).toBe(PACKAGE_FILE_MODES.regular);

      rmSync(path.join(root, 'README.md'));
      writeFileSync(path.join(root, 'README.md'), 'README.md\n', 'utf8');
      chmodSync(path.join(root, 'README.md'), PACKAGE_FILE_MODES.regular);
      const externalTreeFile = path.join(root, 'unpackaged-license.txt');
      writeFileSync(externalTreeFile, 'external tree file\n', 'utf8');
      chmodSync(externalTreeFile, PACKAGE_FILE_MODES.regular);
      linkSync(externalTreeFile, path.join(root, 'LICENSES', 'hardlinked.txt'));
      expect(() => finalizePackageModes(root)).toThrow(
        'package tree regular file must have exactly one hard link: ' +
        'LICENSES/hardlinked.txt; found 2',
      );
      expect(readFileSync(externalTreeFile, 'utf8')).toBe('external tree file\n');
      expect(permissions(externalTreeFile)).toBe(PACKAGE_FILE_MODES.regular);
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

  it('rejects a hard-linked dist file before changing any package mode', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'cortexel-package-modes-hardlink-'));
    try {
      const external = path.join(parent, 'external.js');
      writeFileSync(external, 'sentinel\n', 'utf8');
      chmodSync(external, 0o600);

      const dist = path.join(parent, 'dist');
      const cli = path.join(dist, 'cli');
      mkdirSync(cli, { recursive: true });
      writeFileSync(path.join(cli, 'main.js'), '#!/usr/bin/env node\n', 'utf8');
      writeFileSync(path.join(dist, 'index.js'), 'export {};\n', 'utf8');
      writeFileSync(path.join(dist, 'skills.manifest.json'), '{}\n', 'utf8');
      linkSync(external, path.join(dist, 'zz-external.js'));

      const packageEntries = [
        dist,
        cli,
        path.join(cli, 'main.js'),
        path.join(dist, 'index.js'),
        path.join(dist, 'skills.manifest.json'),
        path.join(dist, 'zz-external.js'),
      ] as const;
      chmodSync(dist, 0o700);
      chmodSync(cli, 0o700);
      for (const file of packageEntries.slice(2)) chmodSync(file, 0o600);
      const modesBefore = packageEntries.map(permissions);

      expect(() => normalizePackageModes(dist)).toThrow(
        'package tree regular file must have exactly one hard link: ' +
        'dist/zz-external.js; found 2',
      );
      expect(packageEntries.map(permissions)).toEqual(modesBefore);
      expect(readFileSync(external, 'utf8')).toBe('sentinel\n');
      expect(permissions(external)).toBe(0o600);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('bounds the complete mode tree before the first chmod', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'cortexel-package-modes-bounded-'));
    try {
      const dist = path.join(parent, 'dist');
      const cli = path.join(dist, 'cli');
      mkdirSync(cli, { recursive: true });
      writeFileSync(path.join(cli, 'main.js'), '#!/usr/bin/env node\n');
      writeFileSync(path.join(dist, 'skills.manifest.json'), '{}\n');
      for (let index = 0; index < PACKAGE_MODE_TREE_LIMITS.dist.directoryEntries; index += 1) {
        writeFileSync(path.join(dist, `entry-${index}.js`), '');
      }
      chmodSync(dist, 0o700);
      chmodSync(cli, 0o700);
      chmodSync(path.join(cli, 'main.js'), 0o600);
      chmodSync(path.join(dist, 'skills.manifest.json'), 0o600);
      expect(() => normalizePackageModes(dist)).toThrow(/per-directory entry bound/u);
      expect(permissions(dist)).toBe(0o700);
      expect(permissions(cli)).toBe(0o700);
      expect(permissions(path.join(cli, 'main.js'))).toBe(0o600);

      for (let index = 0; index < PACKAGE_MODE_TREE_LIMITS.dist.directoryEntries; index += 1) {
        rmSync(path.join(dist, `entry-${index}.js`));
      }
      const oversized = path.join(dist, 'oversized.js');
      writeFileSync(oversized, '');
      truncateSync(oversized, PACKAGE_MODE_TREE_LIMITS.dist.fileBytes + 1);
      expect(() => normalizePackageModes(dist)).toThrow(/physical profile/u);
      expect(permissions(dist)).toBe(0o700);
      expect(permissions(cli)).toBe(0o700);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('reads package.json through its stable one-megabyte authority', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cortexel-package-manifest-bound-'));
    try {
      const manifest = path.join(root, 'package.json');
      writeFileSync(manifest, '');
      truncateSync(manifest, PACKAGE_MODE_TREE_LIMITS.packageManifestBytes + 1);
      chmodSync(manifest, PACKAGE_FILE_MODES.regular);
      expect(() => finalizePackageModes(root)).toThrow(/file exceeds its 1048576-byte bound/u);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
