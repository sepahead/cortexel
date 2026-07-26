import { describe, expect, it, vi } from 'vitest';

const BUILD_CALLS_KEY = '__cortexelBuildPackageTestCalls__';

vi.mock('tsup', () => ({
  defineConfig: (options: unknown) => options,
  build: async (options: unknown) => {
    const testGlobal = globalThis as typeof globalThis & {
      __cortexelBuildPackageTestCalls__?: unknown[];
    };
    (testGlobal.__cortexelBuildPackageTestCalls__ ??= []).push(options);
  },
}));

await import('../scripts/build-package.js');

describe('programmatic package build', () => {
  it('passes the reviewed static options while disabling tsup config materialization', () => {
    const calls = (globalThis as typeof globalThis & {
      [BUILD_CALLS_KEY]?: unknown[];
    })[BUILD_CALLS_KEY];
    expect(calls).toHaveLength(1);
    expect(calls?.[0]).toEqual(expect.objectContaining({
      config: false,
      clean: true,
      dts: true,
      format: ['esm', 'cjs'],
    }));
  });
});
