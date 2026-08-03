import { readFileSync } from 'node:fs';
import path from 'node:path';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  PACKAGE_BUILD_NODE_RANGE,
  type PackageBuildRuntimeIdentity,
  supportsPackageBuildNodeVersion,
  supportsPackageBuildRuntime,
} from '../scripts/lib/package-build-runtime.js';

const repositoryRoot = path.resolve(import.meta.dirname, '..');

function runtimeIdentity(
  overrides: Partial<PackageBuildRuntimeIdentity> = {},
): PackageBuildRuntimeIdentity {
  return {
    releaseName: 'node',
    nodeVersion: '26.0.0',
    hasBunVersionMarker: false,
    hasDenoVersionMarker: false,
    ...overrides,
  };
}

describe('source-only package build runtime', () => {
  it('admits exactly the reviewed tsdown-compatible floors and majors', () => {
    expect(PACKAGE_BUILD_NODE_RANGE).toBe('^22.18.0 || ^24.11.0 || ^26.0.0');
    for (const version of [
      '22.18.0',
      '22.99.999',
      '24.11.0',
      '24.99.999',
      '26.0.0',
      '26.99.999',
    ]) {
      expect(supportsPackageBuildNodeVersion(version), version).toBe(true);
    }
    for (const version of [
      '22.17.999',
      '24.10.999',
      '20.99.999',
      '23.0.0',
      '25.0.0',
      '27.0.0',
      '28.0.0',
      'v26.0.0',
      '26.0.0-rc.1',
      '026.0.0',
      '',
    ]) {
      expect(supportsPackageBuildNodeVersion(version), version).toBe(false);
    }
    for (const value of [undefined, null, 26, {}, []]) {
      expect(supportsPackageBuildNodeVersion(value)).toBe(false);
    }
    expect(supportsPackageBuildRuntime(runtimeIdentity())).toBe(true);
    for (const runtimeName of ['bun', 'deno', '', undefined, null]) {
      expect(supportsPackageBuildRuntime(runtimeIdentity({
        releaseName: runtimeName,
      }))).toBe(false);
    }
    expect(
      supportsPackageBuildRuntime(runtimeIdentity({ hasBunVersionMarker: true })),
      'Bun reports release.name=node and a Node compatibility version',
    ).toBe(false);
    expect(
      supportsPackageBuildRuntime(runtimeIdentity({ hasDenoVersionMarker: true })),
      'Deno reports a Node compatibility version through process',
    ).toBe(false);
    for (const value of [undefined, null, '', 0, 1]) {
      expect(supportsPackageBuildRuntime(runtimeIdentity({
        hasBunVersionMarker: value,
      }))).toBe(false);
      expect(supportsPackageBuildRuntime(runtimeIdentity({
        hasDenoVersionMarker: value,
      }))).toBe(false);
    }
  });

  it('matches the closed policy for every generated final core version', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 50 }),
      fc.integer({ min: 0, max: 100 }),
      fc.integer({ min: 0, max: 100 }),
      (major, minor, patch) => {
        const expected = (
          (major === 22 && minor >= 18)
          || (major === 24 && minor >= 11)
          || major === 26
        );
        expect(supportsPackageBuildNodeVersion(`${major}.${minor}.${patch}`)).toBe(expected);
      },
    ));
  });

  it('keeps the stricter build-only range out of the source package manifest', () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
    ) as {
      devEngines?: unknown;
      engines?: { node?: unknown };
      scripts?: { build?: unknown };
    };
    expect(Object.hasOwn(packageJson, 'devEngines')).toBe(false);
    expect(packageJson.engines?.node).toBe('^22.12.0 || ^24.0.0 || ^26.0.0');
    expect(packageJson.scripts?.build).toBe(
      'tsx scripts/check-package-build-runtime.ts && bun run check:generated '
        + '&& tsx scripts/build-package.ts && tsx scripts/prepare-package.ts '
        + '&& tsx scripts/emit-manifest.ts && tsx scripts/finalize-package.ts',
    );

    const tsdownPackage = JSON.parse(
      readFileSync(path.join(repositoryRoot, 'node_modules', 'tsdown', 'package.json'), 'utf8'),
    ) as { engines?: { node?: unknown }; version?: unknown };
    expect(tsdownPackage.version).toBe('0.22.14');
    expect(tsdownPackage.engines?.node).toBe('^22.18.0 || >=24.11.0');
  });
});
