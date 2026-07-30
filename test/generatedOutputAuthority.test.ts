import {
  chmodSync,
  existsSync,
  linkSync,
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
  assertGeneratedOutputFilePath,
  assertGeneratedOutputPath,
  assertNoOutsideGeneratedOutputMutations,
  directRepositoryDirectoryExists,
  ensureGeneratedOutputDirectory,
  isGeneratedOutputPath,
  isGeneratorControllingInputPath,
  snapshotGeneratedOutputInventory,
  snapshotGeneratorControllingInputs,
  snapshotOutsideGeneratedOutputs,
} from '../scripts/lib/generated-output-authority.js';
import { generatedSnapshotDifferences } from '../scripts/lib/generated-snapshot.js';

function withTemporaryRepository(run: (root: string) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), 'cortexel-generated-authority-'));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
