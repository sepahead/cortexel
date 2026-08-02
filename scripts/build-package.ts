/** Build package code without letting tsup materialize a bundled config beside source. */

import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type Options } from 'tsup';

import tsupConfig from '../tsup.config.js';

if (
  typeof tsupConfig !== 'object' ||
  tsupConfig === null ||
  Array.isArray(tsupConfig)
) {
  throw new Error(
    'the Cortexel tsup config must remain one static options object',
  );
}

export interface PackageBuildFileSystem {
  existsSync(target: string): boolean;
  unlinkSync(target: string): void;
}

export interface PackageBuildDependencies {
  build(options: Options): Promise<unknown>;
  fileSystem: PackageBuildFileSystem;
}

const NATIVE_PACKAGE_BUILD_FILE_SYSTEM: PackageBuildFileSystem = {
  existsSync,
  unlinkSync,
};

// Public ESM and CommonJS bundles intentionally converge on the CJS module-cache
// instance selected by package `imports`. Keeping an alternate ESM runtime file in
// the tarball would create a second private WeakSet for hosts that deliberately
// resolve physical package files. Declarations remain in both formats; only the
// unused alternate runtime and its source map are removed.
export function removeAlternateEsmRuntimeArtifacts(
  internalDist: string,
  fileSystem: PackageBuildFileSystem = NATIVE_PACKAGE_BUILD_FILE_SYSTEM,
): void {
  const targets = [
    'figure-result-capability.js',
    'figure-result-capability.js.map',
    'knowledge-graph-presentation-capability.js',
    'knowledge-graph-presentation-capability.js.map',
    'request-capability.js',
    'request-capability.js.map',
  ].map((basename) => path.resolve(internalDist, basename));
  const missing = targets.filter((target) => !fileSystem.existsSync(target));
  if (missing.length > 0) {
    throw new Error(
      `tsup did not emit every expected private runtime artifact: ${missing.join(', ')}`,
    );
  }
  for (const target of targets) fileSystem.unlinkSync(target);
}

export async function buildPackage(
  dependencies?: PackageBuildDependencies,
): Promise<void> {
  const buildImplementation = dependencies?.build ?? build;
  const fileSystem = dependencies?.fileSystem ?? NATIVE_PACKAGE_BUILD_FILE_SYSTEM;

  // tsup's default programmatic path reloads tsup.config.ts through
  // bundle-require, which writes a randomized intermediate beside source. The
  // reviewed options are already imported above, so disable that second loader
  // explicitly.
  await buildImplementation({ ...(tsupConfig as Options), config: false });
  removeAlternateEsmRuntimeArtifacts(
    path.resolve(import.meta.dirname, '../dist/internal'),
    fileSystem,
  );
}

function isDirectExecution(): boolean {
  const entryPoint = process.argv[1];
  return (
    entryPoint !== undefined &&
    path.resolve(entryPoint) === path.resolve(fileURLToPath(import.meta.url))
  );
}

if (isDirectExecution()) await buildPackage();
