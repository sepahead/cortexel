import { describe, expect, it } from 'vitest';
import path from 'node:path';

import {
  buildPackage,
  removeAlternateEsmRuntimeArtifacts,
  type PackageBuildFileSystem,
} from '../scripts/build-package.js';

function expectedCleanupTargets(): string[] {
  const internalDist = path.resolve(import.meta.dirname, '../dist/internal');
  return [
    'knowledge-graph-presentation-capability.js',
    'knowledge-graph-presentation-capability.js.map',
    'request-capability.js',
    'request-capability.js.map',
  ].map((basename) => path.join(internalDist, basename));
}

function cleanupFileSystem(missing: ReadonlySet<string> = new Set()): {
  fileSystem: PackageBuildFileSystem;
  unlinked: string[];
} {
  const present = new Set(expectedCleanupTargets());
  const unlinked: string[] = [];
  return {
    fileSystem: {
      existsSync: (target) => present.has(target) && !missing.has(target),
      unlinkSync: (target) => {
        if (!present.delete(target)) {
          throw new Error(
            `attempted to unlink absent test artifact: ${target}`,
          );
        }
        unlinked.push(target);
      },
    },
    unlinked,
  };
}

if (false) {
  // @ts-expect-error test authority must replace both the builder and filesystem
  void buildPackage({ build: async () => undefined });
}

describe('programmatic package build', () => {
  it('passes the reviewed static options while disabling tsup config materialization', async () => {
    const calls: unknown[] = [];
    const { fileSystem } = cleanupFileSystem();
    await buildPackage({
      build: async (options) => {
        calls.push(options);
      },
      fileSystem,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(
      expect.objectContaining({
        config: false,
        clean: true,
        dts: true,
        format: ['esm', 'cjs'],
      }),
    );
  });

  it('removes exactly the unused alternate ESM runtime artifacts', () => {
    const internalDist = path.resolve(import.meta.dirname, '../dist/internal');
    const { fileSystem, unlinked } = cleanupFileSystem();
    removeAlternateEsmRuntimeArtifacts(internalDist, fileSystem);

    expect(unlinked).toEqual(expectedCleanupTargets());
  });

  it('preflights the complete cleanup set before deleting any artifact', () => {
    const internalDist = path.resolve(import.meta.dirname, '../dist/internal');
    const missing = path.join(internalDist, 'request-capability.js.map');
    const { fileSystem, unlinked } = cleanupFileSystem(new Set([missing]));
    expect(() =>
      removeAlternateEsmRuntimeArtifacts(internalDist, fileSystem),
    ).toThrow(/did not emit every expected private runtime artifact/u);
    expect(unlinked).toEqual([]);
  });
});
