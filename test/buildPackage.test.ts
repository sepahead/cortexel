import { describe, expect, it, vi } from 'vitest';

const { build } = vi.hoisted(() => ({
  build: vi.fn(async () => undefined),
}));

vi.mock('tsup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('tsup')>()),
  build,
}));

await import('../scripts/build-package.js');

describe('programmatic package build', () => {
  it('passes the reviewed static options while disabling tsup config materialization', () => {
    expect(build).toHaveBeenCalledOnce();
    expect(build).toHaveBeenCalledWith(expect.objectContaining({
      config: false,
      clean: true,
      dts: true,
      format: ['esm', 'cjs'],
    }));
  });
});
