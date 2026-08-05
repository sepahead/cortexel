import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  assertGeneratedOutputFilePath,
  assertGeneratedOutputPath,
  assertNoOutsideGeneratedOutputMutations,
  directRepositoryDirectoryExists,
  ensureGeneratedOutputDirectory,
  GENERATED_SNAPSHOT_LIMITS,
  isGeneratedOutputPath,
  isGeneratorControllingInputPath,
  materializeGeneratorControllingInputSnapshot,
  snapshotGeneratedOutputInventory,
  snapshotGeneratedOutputInventoryForTrustedTest,
  snapshotGeneratorControllingInputs,
  snapshotOutsideGeneratedOutputs,
  snapshotOutsideGeneratedOutputsForTrustedTest,
  type GeneratedSnapshotLimits,
} from '../scripts/lib/generated-output-authority.js';
import { generatedSnapshotDifferences } from '../scripts/lib/generated-snapshot.js';
import { resolveReviewedTsxCli } from '../scripts/lib/reviewed-tsx-cli.js';

function withTemporaryRepository(run: (root: string) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), 'cortexel-generated-authority-'));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function snapshotLimits(
  overrides: Partial<GeneratedSnapshotLimits>,
): GeneratedSnapshotLimits {
  return Object.freeze({ ...GENERATED_SNAPSHOT_LIMITS, ...overrides });
}

function generatedFixture(root: string, bytes = 'reviewed bytes\n'): string {
  const generated = path.join(root, 'src', 'generated');
  mkdirSync(generated, { recursive: true });
  const target = path.join(generated, 'catalog.ts');
  writeFileSync(target, bytes);
  return target;
}

describe('closed generated-output authority', () => {
  it('never captures generator pipes in either isolated pass', () => {
    const checkerSource = readFileSync(
      path.resolve('scripts/check-generated.ts'),
      'utf8',
    );
    expect(checkerSource).not.toContain("'pipe'");
    expect(checkerSource).toContain(
      "output === 'full' ? 'inherit' : ['ignore', 'ignore', 'inherit']",
    );
  });

  it('canonicalizes the exact reviewed tsx CLI inside its package authority', () => {
    withTemporaryRepository((root) => {
      const packageRoot = path.join(root, 'node_modules', 'tsx');
      const cli = path.join(packageRoot, 'dist', 'cli.mjs');
      mkdirSync(path.dirname(cli), { recursive: true });
      writeFileSync(cli, '#!/usr/bin/env node\n');

      expect(resolveReviewedTsxCli(root)).toBe(realpathSync.native(cli));
    });
  });

  it('rejects reviewed tsx CLI symlinks that escape or use sibling-prefix paths', () => {
    if (process.platform === 'win32') return;

    withTemporaryRepository((root) => {
      const packageRoot = path.join(root, 'node_modules', 'tsx');
      const cli = path.join(packageRoot, 'dist', 'cli.mjs');
      const outside = path.join(root, 'outside-cli.mjs');
      mkdirSync(path.dirname(cli), { recursive: true });
      writeFileSync(outside, '#!/usr/bin/env node\n');
      symlinkSync(outside, cli);

      expect(() => resolveReviewedTsxCli(root)).toThrow(
        /reviewed tsx CLI escapes its canonical package authority/u,
      );
    });

    withTemporaryRepository((root) => {
      const packageRoot = path.join(root, 'node_modules', 'tsx');
      const cli = path.join(packageRoot, 'dist', 'cli.mjs');
      const siblingCli = path.join(root, 'node_modules', 'tsx-attacker', 'dist', 'cli.mjs');
      mkdirSync(path.dirname(cli), { recursive: true });
      mkdirSync(path.dirname(siblingCli), { recursive: true });
      writeFileSync(siblingCli, '#!/usr/bin/env node\n');
      symlinkSync(siblingCli, cli);

      expect(() => resolveReviewedTsxCli(root)).toThrow(
        /reviewed tsx CLI escapes its canonical package authority/u,
      );
    });
  });

  it('rejects a tsx package that escapes the canonical node_modules authority', () => {
    if (process.platform === 'win32') return;

    withTemporaryRepository((root) => {
      const nodeModules = path.join(root, 'node_modules');
      const outsidePackage = path.join(root, 'outside-tsx');
      mkdirSync(path.join(outsidePackage, 'dist'), { recursive: true });
      mkdirSync(nodeModules, { recursive: true });
      writeFileSync(
        path.join(outsidePackage, 'dist', 'cli.mjs'),
        '#!/usr/bin/env node\n',
      );
      symlinkSync(outsidePackage, path.join(nodeModules, 'tsx'), 'dir');

      expect(() => resolveReviewedTsxCli(root)).toThrow(
        /reviewed tsx package escapes its canonical node_modules authority/u,
      );
    });
  });

  it('rejects a repository node_modules symlink before resolving tsx', () => {
    if (process.platform === 'win32') return;

    withTemporaryRepository((root) => {
      const outsideNodeModules = path.join(root, 'outside-node-modules');
      const cli = path.join(outsideNodeModules, 'tsx', 'dist', 'cli.mjs');
      mkdirSync(path.dirname(cli), { recursive: true });
      writeFileSync(cli, '#!/usr/bin/env node\n');
      symlinkSync(outsideNodeModules, path.join(root, 'node_modules'), 'dir');

      expect(() => resolveReviewedTsxCli(root)).toThrow(
        /repository node_modules authority is not a direct directory/u,
      );
    });
  });

  it('rejects a hard-linked tsx CLI with authority outside its package path', () => {
    withTemporaryRepository((root) => {
      const cli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
      const outside = path.join(root, 'outside-cli.mjs');
      mkdirSync(path.dirname(cli), { recursive: true });
      writeFileSync(outside, '#!/usr/bin/env node\n');
      linkSync(outside, cli);

      expect(() => resolveReviewedTsxCli(root)).toThrow(
        /direct single-link regular file/u,
      );
    });
  });

  it('authorizes only exact declared roots and their canonical descendants', () => {
    withTemporaryRepository((root) => {
      expect(assertGeneratedOutputPath(
        root,
        path.join(root, 'src', 'generated', 'catalog.ts'),
      )).toBe('src/generated/catalog.ts');
      expect(assertGeneratedOutputPath(
        root,
        path.join(root, 'contract', 'manifest.v1.json'),
      )).toBe('contract/manifest.v1.json');

      expect(isGeneratedOutputPath('src/generated')).toBe(true);
      expect(isGeneratedOutputPath('src/generated/nested/file.ts')).toBe(true);
      expect(isGeneratedOutputPath('contract/manifest.v1.json')).toBe(true);
      expect(isGeneratedOutputPath('contract/manifest.v1.json/extra')).toBe(false);
      expect(isGeneratedOutputPath('src/generated-adjacent/file.ts')).toBe(false);
      expect(isGeneratedOutputPath('src/generated/../not-generated.ts')).toBe(false);

      expect(() => assertGeneratedOutputPath(
        root,
        path.join(root, 'src', 'generated-adjacent', 'catalog.ts'),
      )).toThrow(/outside its closed output inventory/u);
      expect(() => assertGeneratedOutputPath(
        root,
        path.resolve(root, '..', 'escaped.ts'),
      )).toThrow(/outside its closed output inventory/u);
    });
  });

  it('does not authorize an exact file output as a directory container', () => {
    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'contract'), { recursive: true });
      const manifest = path.join(root, 'contract', 'manifest.v1.json');

      expect(() => ensureGeneratedOutputDirectory(root, manifest)).toThrow(
        /not an authorized generated directory/u,
      );
      expect(existsSync(manifest)).toBe(false);
    });
  });

  it('creates generated directories with canonical modes under a restrictive umask', () => {
    if (process.platform === 'win32') return;

    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'src'), { recursive: true });
      const previousUmask = process.umask(0o077);
      try {
        ensureGeneratedOutputDirectory(root, path.join(root, 'src', 'generated'));
      } finally {
        process.umask(previousUmask);
      }

      const mode = lstatSync(path.join(root, 'src', 'generated')).mode & 0o7777;
      expect(mode).toBe(0o755);
    });
  });

  it('does not authorize a tree root itself as a generated file', () => {
    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'src'), { recursive: true });

      expect(() => assertGeneratedOutputFilePath(
        root,
        path.join(root, 'src', 'generated'),
      )).toThrow(/not an authorized generated file/u);
    });
  });

  it('does not authorize an extra path below an exact file output', () => {
    withTemporaryRepository((root) => {
      expect(() => assertGeneratedOutputFilePath(
        root,
        path.join(root, 'contract', 'manifest.v1.json', 'extra'),
      )).toThrow(/not an authorized generated file/u);
    });
  });

  it('rejects wrong filesystem kinds while snapshotting typed outputs', () => {
    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'contract', 'manifest.v1.json'), { recursive: true });
      expect(() => snapshotGeneratedOutputInventory(root)).toThrow(
        /generated file output is not a direct regular file/u,
      );
    });

    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'src'), { recursive: true });
      writeFileSync(path.join(root, 'src', 'generated'), 'not a tree\n');
      expect(() => snapshotGeneratedOutputInventory(root)).toThrow(
        /generated tree output is not a direct directory/u,
      );
    });
  });

  it('includes empty generated directories in the output topology', () => {
    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      const before = snapshotGeneratedOutputInventory(root);

      mkdirSync(path.join(generated, 'empty-extra'));
      const after = snapshotGeneratedOutputInventory(root);

      expect(generatedSnapshotDifferences(before, after)).toEqual([
        { path: 'src/generated/empty-extra', kind: 'extra' },
      ]);
    });
  });

  it('detects same-byte executable-mode drift in generated files', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      const output = path.join(generated, 'catalog.ts');
      writeFileSync(output, 'same bytes\n', { mode: 0o644 });
      chmodSync(output, 0o644);
      const before = snapshotGeneratedOutputInventory(root);

      chmodSync(output, 0o755);
      const after = snapshotGeneratedOutputInventory(root);

      expect(generatedSnapshotDifferences(before, after)).toEqual([
        { path: 'src/generated/catalog.ts', kind: 'changed' },
      ]);
    });
  });

  it('rejects a generated file hard-linked to an external authority', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      const source = path.join(root, 'source.ts');
      writeFileSync(source, 'shared inode\n');
      linkSync(source, path.join(generated, 'catalog.ts'));

      expect(() => snapshotGeneratedOutputInventory(root)).toThrow(
        /generated output file is hard-linked/u,
      );
    });
  });

  it('publishes immutable closed limits and rejects every bounded tree-work excess', () => {
    expect(Object.isFrozen(GENERATED_SNAPSHOT_LIMITS)).toBe(true);
    expect(GENERATED_SNAPSHOT_LIMITS.nodes).toBeGreaterThanOrEqual(
      GENERATED_SNAPSHOT_LIMITS.files,
    );
    expect(GENERATED_SNAPSHOT_LIMITS.nodes).toBeGreaterThanOrEqual(
      GENERATED_SNAPSHOT_LIMITS.directories,
    );

    withTemporaryRepository((root) => {
      generatedFixture(root, '12345');
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: snapshotLimits({ fileBytes: 4, aggregateBytes: 1_024 }),
      })).toThrow(/file exceeds the reviewed byte bound/u);
    });

    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      writeFileSync(path.join(generated, 'first.ts'), 'x'.repeat(501));
      writeFileSync(path.join(generated, 'second.ts'), 'y'.repeat(501));
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: snapshotLimits({ fileBytes: 600, aggregateBytes: 1_000 }),
      })).toThrow(/aggregate byte bound/u);
    });

    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      for (let index = 0; index < 3; index += 1) {
        writeFileSync(path.join(generated, `entry-${index}.ts`), `${index}\n`);
      }
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: snapshotLimits({ directoryEntries: 2 }),
      })).toThrow(/per-directory entry bound/u);
    });

    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      writeFileSync(path.join(generated, 'first.ts'), '1\n');
      writeFileSync(path.join(generated, 'second.ts'), '2\n');
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: snapshotLimits({ files: 2, directories: 2, nodes: 2 }),
      })).toThrow(/reviewed node bound/u);
    });

    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(path.join(generated, 'nested'), { recursive: true });
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: snapshotLimits({ directories: 1 }),
      })).toThrow(/reviewed directory bound/u);
    });

    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      writeFileSync(path.join(generated, 'first.ts'), '1\n');
      writeFileSync(path.join(generated, 'second.ts'), '2\n');
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: snapshotLimits({ files: 1 }),
      })).toThrow(/reviewed file bound/u);
    });

    withTemporaryRepository((root) => {
      const nested = path.join(root, 'src', 'generated', 'nested');
      mkdirSync(nested, { recursive: true });
      writeFileSync(path.join(nested, 'too-deep.ts'), 'x\n');
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: snapshotLimits({ depth: 3 }),
      })).toThrow(/path exceeds the reviewed bound/u);
    });

    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      writeFileSync(path.join(generated, 'a'.repeat(65)), 'x\n');
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: snapshotLimits({ segmentBytes: 64 }),
      })).toThrow(/path segment above the reviewed byte bound/u);
    });

    withTemporaryRepository((root) => {
      const generated = path.join(root, 'src', 'generated');
      mkdirSync(generated, { recursive: true });
      writeFileSync(path.join(generated, 'b'.repeat(90)), 'x\n');
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: snapshotLimits({ pathBytes: 100 }),
      })).toThrow(/path exceeds the reviewed bound/u);
    });
  });

  it('does not follow a generated leaf replaced by a FIFO before descriptor open', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      generatedFixture(root);
      let hookCalls = 0;
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: GENERATED_SNAPSHOT_LIMITS,
        mutation: {
          stage: 'after-path-stat-before-open',
          relative: 'src/generated/catalog.ts',
          run: (absolute) => {
            hookCalls += 1;
            renameSync(absolute, `${absolute}.original`);
            const made = spawnSync('/usr/bin/mkfifo', [absolute], {
              stdio: ['ignore', 'pipe', 'pipe'],
            });
            if (made.error !== undefined || made.status !== 0) {
              throw new Error('mkfifo replacement fixture failed');
            }
          },
        },
      })).toThrow(/could not be opened without following|changed before read/u);
      expect(hookCalls).toBe(1);
    });
  });

  it('does not follow a generated leaf replaced by a symlink before descriptor open', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      generatedFixture(root);
      let hookCalls = 0;
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: GENERATED_SNAPSHOT_LIMITS,
        mutation: {
          stage: 'after-path-stat-before-open',
          relative: 'src/generated/catalog.ts',
          run: (absolute) => {
            hookCalls += 1;
            const original = `${absolute}.original`;
            renameSync(absolute, original);
            symlinkSync(original, absolute);
          },
        },
      })).toThrow(/could not be opened without following/u);
      expect(hookCalls).toBe(1);
    });
  });

  it('rejects a generated leaf replaced by a hard link before descriptor open', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      generatedFixture(root);
      let hookCalls = 0;
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: GENERATED_SNAPSHOT_LIMITS,
        mutation: {
          stage: 'after-path-stat-before-open',
          relative: 'src/generated/catalog.ts',
          run: (absolute) => {
            hookCalls += 1;
            const original = `${absolute}.original`;
            renameSync(absolute, original);
            // Re-link the exact reviewed inode so only nlink authority changes.
            linkSync(original, absolute);
          },
        },
      })).toThrow(/changed before read/u);
      expect(hookCalls).toBe(1);
    });
  });

  it('rejects append and truncate races after fstat and before positional read', () => {
    withTemporaryRepository((root) => {
      generatedFixture(root, 'reviewed');
      let hookCalls = 0;
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: GENERATED_SNAPSHOT_LIMITS,
        mutation: {
          stage: 'after-file-fstat-before-read',
          relative: 'src/generated/catalog.ts',
          run: (absolute) => {
            hookCalls += 1;
            appendFileSync(absolute, '-appended');
          },
        },
      })).toThrow(/grew beyond its reviewed size/u);
      expect(hookCalls).toBe(1);
    });

    withTemporaryRepository((root) => {
      generatedFixture(root, 'reviewed');
      let hookCalls = 0;
      expect(() => snapshotGeneratedOutputInventoryForTrustedTest(root, {
        limits: GENERATED_SNAPSHOT_LIMITS,
        mutation: {
          stage: 'after-file-fstat-before-read',
          relative: 'src/generated/catalog.ts',
          run: (absolute) => {
            hookCalls += 1;
            truncateSync(absolute, 0);
          },
        },
      })).toThrow(/ended before its reviewed size/u);
      expect(hookCalls).toBe(1);
    });
  });

  it('records an outside-output symlink itself without traversing its target', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      const outside = mkdtempSync(path.join(tmpdir(), 'cortexel-snapshot-link-target-'));
      try {
        writeFileSync(path.join(outside, 'not-in-repository.ts'), 'external\n');
        symlinkSync(outside, path.join(root, 'outside-link'), 'dir');

        const snapshot = snapshotOutsideGeneratedOutputs(root);
        expect(snapshot.has('outside-link')).toBe(true);
        expect([...snapshot.keys()].some((key) => key.startsWith('outside-link/'))).toBe(false);
      } finally {
        rmSync(outside, { recursive: true, force: true });
      }
    });
  });

  it('rejects same-target symlink replacement before final target revalidation', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      const link = path.join(root, 'outside-link');
      symlinkSync('./same-target', link);
      let hookCalls = 0;

      expect(() => snapshotOutsideGeneratedOutputsForTrustedTest(root, {
        limits: GENERATED_SNAPSHOT_LIMITS,
        mutation: {
          stage: 'before-final-symlink-target-revalidation',
          relative: 'outside-link',
          run: (absolute) => {
            hookCalls += 1;
            renameSync(absolute, `${absolute}.original`);
            symlinkSync('./same-target', absolute);
          },
        },
      })).toThrow(/symlink changed before final read/u);
      expect(hookCalls).toBe(1);
    });
  });

  it('rejects a controlling-input symlink whose target is outside snapshot authority', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      const outside = mkdtempSync(path.join(tmpdir(), 'cortexel-generator-input-target-'));
      try {
        const mutableAuthority = path.join(outside, 'ambient.ts');
        writeFileSync(mutableAuthority, 'export const ambient = 1;\n');
        mkdirSync(path.join(root, 'scripts'));
        symlinkSync(mutableAuthority, path.join(root, 'scripts', 'input.ts'));

        expect(() => snapshotGeneratorControllingInputs(root)).toThrow(
          /repository snapshot contains an indirect entry: scripts\/input\.ts/u,
        );
      } finally {
        rmSync(outside, { recursive: true, force: true });
      }
    });
  });

  it('materializes isolated inputs only from the retained bounded capture', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      const scripts = path.join(root, 'scripts');
      mkdirSync(scripts, { mode: 0o755 });
      const source = path.join(scripts, 'input.ts');
      writeFileSync(source, 'export const captured = 1;\n', { mode: 0o644 });
      chmodSync(source, 0o644);
      const captured = snapshotGeneratorControllingInputs(root);
      writeFileSync(source, 'export const ambient = 2;\n', { mode: 0o644 });

      const parent = mkdtempSync(path.join(tmpdir(), 'cortexel-materialized-inputs-'));
      try {
        const destination = path.join(parent, 'copy');
        materializeGeneratorControllingInputSnapshot(destination, captured);
        const observed = snapshotGeneratorControllingInputs(destination);

        expect(generatedSnapshotDifferences(captured, observed)).toEqual([]);
        expect(readFileSync(path.join(destination, 'scripts', 'input.ts'), 'utf8'))
          .toBe('export const captured = 1;\n');
      } finally {
        rmSync(parent, { recursive: true, force: true });
      }
    });
  });

  it('preflights malformed or out-of-policy captures before creating a destination', () => {
    withTemporaryRepository((root) => {
      const malformedDestination = path.join(root, 'malformed-copy');
      expect(() => materializeGeneratorControllingInputSnapshot(
        malformedDestination,
        new Map([['source', Buffer.from('directory\0mode:0755\0x')]]),
      )).toThrow(/invalid payload/u);
      expect(existsSync(malformedDestination)).toBe(false);

      const excludedDestination = path.join(root, 'excluded-copy');
      expect(() => materializeGeneratorControllingInputSnapshot(
        excludedDestination,
        new Map([['dist/ambient.js', Buffer.from('file\0mode:0644\0x')]]),
      )).toThrow(/outside the controlling policy/u);
      expect(existsSync(excludedDestination)).toBe(false);

      const missingParentDestination = path.join(root, 'missing-parent-copy');
      expect(() => materializeGeneratorControllingInputSnapshot(
        missingParentDestination,
        new Map([['nested/input.ts', Buffer.from('file\0mode:0644\0x')]]),
      )).toThrow(/lacks its direct parent/u);
      expect(existsSync(missingParentDestination)).toBe(false);
    });
  });

  it('uses one conservative policy for copied controlling inputs', () => {
    expect(isGeneratorControllingInputPath('package.json')).toBe(true);
    expect(isGeneratorControllingInputPath('.env.example')).toBe(true);
    expect(isGeneratorControllingInputPath('.env')).toBe(false);
    expect(isGeneratorControllingInputPath('secrets/.env.local')).toBe(false);
    expect(isGeneratorControllingInputPath('node_modules/tool/index.js')).toBe(false);
    expect(isGeneratorControllingInputPath('src/generated/catalog.ts')).toBe(false);
    expect(isGeneratorControllingInputPath('python/.mypy_cache/state.json')).toBe(false);
    expect(isGeneratorControllingInputPath('python/.venv/bin/python')).toBe(false);
  });

  it('creates only authorized missing directories below a direct existing parent', () => {
    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'src'));
      const target = path.join(root, 'src', 'generated', 'nested');

      ensureGeneratedOutputDirectory(root, target);

      expect(directRepositoryDirectoryExists(root, target)).toBe(true);
    });
  });

  it('cannot recursively manufacture a missing non-owned ancestor', () => {
    withTemporaryRepository((root) => {
      const target = path.join(root, 'src', 'generated', 'nested');

      expect(() => ensureGeneratedOutputDirectory(root, target)).toThrow(
        /not an authorized generated directory/u,
      );
      expect(existsSync(path.join(root, 'src'))).toBe(false);
    });
  });

  it('does not treat an adjacent output-root prefix as generated authority', () => {
    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'src'));
      const target = path.join(root, 'src', 'generated-adjacent', 'nested');

      expect(() => ensureGeneratedOutputDirectory(root, target)).toThrow(
        /not an authorized generated directory/u,
      );
      expect(existsSync(path.join(root, 'src', 'generated-adjacent'))).toBe(false);
    });
  });

  it('rejects an indirect ancestor before creating generated output', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      const outside = mkdtempSync(path.join(tmpdir(), 'cortexel-generated-outside-'));
      try {
        symlinkSync(outside, path.join(root, 'src'));
        const target = path.join(root, 'src', 'generated', 'nested');

        expect(() => ensureGeneratedOutputDirectory(root, target)).toThrow(
          /indirect or non-directory entry/u,
        );
        expect(existsSync(path.join(outside, 'generated'))).toBe(false);
      } finally {
        rmSync(outside, { recursive: true, force: true });
      }
    });
  });

  it('requires the repository root itself to be a direct directory', () => {
    if (process.platform === 'win32') return;
    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'src'));
      const indirectRoot = path.join(root, 'repository-alias');
      symlinkSync(root, indirectRoot);

      expect(() => ensureGeneratedOutputDirectory(
        indirectRoot,
        path.join(indirectRoot, 'src', 'generated'),
      )).toThrow(/repository root is not a direct directory/u);
      expect(existsSync(path.join(root, 'src', 'generated'))).toBe(false);
    });
  });

  it('negative control rejects a write outside the inventory while allowing owned output', () => {
    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'src'), { recursive: true });
      writeFileSync(path.join(root, 'src', 'input.ts'), 'export const input = 1;\n');
      const before = snapshotOutsideGeneratedOutputs(root);

      mkdirSync(path.join(root, 'src', 'generated'), { recursive: true });
      writeFileSync(
        path.join(root, 'src', 'generated', 'catalog.ts'),
        'export const generated = true;\n',
      );
      const afterOwnedOutput = snapshotOutsideGeneratedOutputs(root);
      expect(() => assertNoOutsideGeneratedOutputMutations(
        before,
        afterOwnedOutput,
        'negative-control generator',
      )).not.toThrow();

      writeFileSync(path.join(root, 'src', 'input.ts'), 'export const input = 2;\n');
      const afterChangedInput = snapshotOutsideGeneratedOutputs(root);
      expect(() => assertNoOutsideGeneratedOutputMutations(
        afterOwnedOutput,
        afterChangedInput,
        'negative-control generator',
      )).toThrow(
        /mutated repository state outside.*changed: src\/input\.ts/u,
      );

      rmSync(path.join(root, 'src', 'input.ts'));
      const afterDeletedInput = snapshotOutsideGeneratedOutputs(root);
      expect(() => assertNoOutsideGeneratedOutputMutations(
        afterChangedInput,
        afterDeletedInput,
        'negative-control generator',
      )).toThrow(
        /mutated repository state outside.*missing: src\/input\.ts/u,
      );

      writeFileSync(path.join(root, 'escaped.generated.txt'), 'unauthorized\n');
      const afterEscape = snapshotOutsideGeneratedOutputs(root);
      expect(() => assertNoOutsideGeneratedOutputMutations(
        afterDeletedInput,
        afterEscape,
        'negative-control generator',
      )).toThrow(
        /mutated repository state outside.*extra: escaped\.generated\.txt/u,
      );
    });
  });

  it('final input snapshots ignore non-authorities but expose source-byte drift', () => {
    withTemporaryRepository((root) => {
      mkdirSync(path.join(root, 'src', 'generated'), { recursive: true });
      writeFileSync(path.join(root, 'source.ts'), 'export const value = 1;\n');
      writeFileSync(path.join(root, '.env'), 'SECRET=first\n');
      writeFileSync(path.join(root, 'src', 'generated', 'catalog.ts'), 'first\n');
      const before = snapshotGeneratorControllingInputs(root);

      writeFileSync(path.join(root, '.env'), 'SECRET=second\n');
      writeFileSync(path.join(root, 'src', 'generated', 'catalog.ts'), 'second\n');
      expect(generatedSnapshotDifferences(
        before,
        snapshotGeneratorControllingInputs(root),
      )).toEqual([]);

      writeFileSync(path.join(root, 'source.ts'), 'export const value = 2;\n');
      expect(generatedSnapshotDifferences(
        before,
        snapshotGeneratorControllingInputs(root),
      )).toEqual([{ path: 'source.ts', kind: 'changed' }]);
    });
  });
});
