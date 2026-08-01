import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertReviewedNodeRuntimeLive,
  createReviewedNodeRuntime,
  disposeReviewedNodeRuntime,
  REVIEWED_NODE_RUNTIME_SCHEMA,
  reviewedNodeRuntimeTesting,
} from '../scripts/lib/reviewed-node-runtime.js';
import { runReviewedPosixCommand } from '../scripts/lib/reviewed-posix-command.js';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('reviewed Node runtime', () => {
  it('publishes the complete exact acquisition and revalidates root identity on disposal', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const workspace = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-reviewed-node-test-'),
    ));
    chmodSync(workspace, 0o700);
    let runtime: ReturnType<typeof createReviewedNodeRuntime> | null = null;
    try {
      const candidates = reviewedNodeRuntimeTesting.hostNodeCandidates();
      expect(candidates.length).toBeGreaterThan(0);
      runtime = createReviewedNodeRuntime(workspace, {
        sourceNodeCandidates: candidates,
      });

      expect(runtime.schema).toBe(REVIEWED_NODE_RUNTIME_SCHEMA);
      expect(candidates).toContain(runtime.sourceNodeExecutable);
      expect(runtime.sourceNodeExecutable).toBe(runtime.node.executable.sourcePath);
      expect(runtime.node.runtimeRoot).toBe(runtime.runtimeRoot);
      expect(runtime.node.executable.sourceSha256)
        .toBe(runtime.node.executable.stagedSha256);
      expect(runtime.node.authority.executable)
        .toBe(runtime.node.executable.stagedPath);
      expect(runtime.node.inventorySha256).toMatch(/^sha256:[0-9a-f]{64}$/u);
      const acquiredFiles = [
        runtime.node.executable,
        ...runtime.node.companions,
      ];
      expect(acquiredFiles.length).toBeGreaterThanOrEqual(1);
      // The generic inventory binds the runtime root, `bin`, optional `lib`,
      // and every acquired file; directories are first-class entries.
      expect(runtime.node.inventoryEntryCount).toBe(
        acquiredFiles.length + 2 + (runtime.node.companions.length > 0 ? 1 : 0),
      );
      for (const acquired of acquiredFiles) {
        expect(acquired).toEqual({
          sourcePath: expect.any(String),
          sourcePathAncestryProtected: expect.any(Boolean),
          sourceSha256: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
          stagedPath: expect.any(String),
          stagedSha256: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
          size: expect.any(Number),
        });
        expect(acquired.sourceSha256).toBe(acquired.stagedSha256);
      }
      expect(runtime.nodeVersion).toMatch(/^(?:22|24|26)\.[0-9]+\.[0-9]+/u);
      expect(Object.isFrozen(runtime)).toBe(true);
      expect(Object.isFrozen(runtime.node)).toBe(true);
      expect(lstatSync(runtime.runtimeRoot).mode & 0o7777).toBe(0o700);
      expect(runtime.node.companions.every((companion) =>
        companion.sourceSha256 === companion.stagedSha256 &&
        path.dirname(path.dirname(companion.stagedPath)) === runtime!.runtimeRoot))
        .toBe(true);
      expect(() => assertReviewedNodeRuntimeLive(runtime!)).not.toThrow();
      const identityProbe = runReviewedPosixCommand(
        runtime.node.authority.executable,
        runtime.node.authority.executable,
        ['--print', 'process.execPath'],
        runtime.runtimeRoot,
        {
          controlRuntimeAuthority: runtime.node.authority,
          environment: {
            LANG: 'C',
            LC_ALL: 'C',
            PATH: '/usr/bin:/bin',
            TZ: 'UTC',
          },
          outputLimitBytes: 4 * 1024,
          targetAuthority: runtime.node.authority,
          timeoutMs: 10_000,
        },
      );
      expect(identityProbe.status).toBe(0);
      expect(identityProbe.signal).toBeNull();
      expect(identityProbe.stderr.byteLength).toBe(0);
      expect(identityProbe.stdout.toString('utf8').trim())
        .toBe(runtime.node.authority.executable);

      const frozenLookalike = Object.freeze({ ...runtime });
      expect(() => assertReviewedNodeRuntimeLive(frozenLookalike))
        .toThrow(/foreign or already disposed/u);
      expect(() => disposeReviewedNodeRuntime(frozenLookalike))
        .toThrow(/foreign or already disposed/u);

      chmodSync(runtime.runtimeRoot, 0o755);
      expect(() => disposeReviewedNodeRuntime(runtime!))
        .toThrow(/exact mode 0700|current-user-owned/u);
      expect(existsSync(runtime.runtimeRoot)).toBe(true);
      chmodSync(runtime.runtimeRoot, 0o700);

      expect(() => reviewedNodeRuntimeTesting.disposeWithRemove(
        runtime!,
        () => {
          throw new Error('injected removal failure');
        },
      )).toThrow(/injected removal failure/u);
      expect(() => assertReviewedNodeRuntimeLive(runtime!)).not.toThrow();

      const runtimeRoot = runtime.runtimeRoot;
      disposeReviewedNodeRuntime(runtime);
      expect(existsSync(runtimeRoot)).toBe(false);
      expect(() => assertReviewedNodeRuntimeLive(runtime!))
        .toThrow(/foreign or already disposed/u);
      runtime = null;
    } finally {
      if (runtime !== null) {
        try {
          chmodSync(runtime.runtimeRoot, 0o700);
          disposeReviewedNodeRuntime(runtime);
        } catch {
          // The outer exact test root is still cleaned below after test failure.
        }
      }
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 120_000);

  it('rejects hostile acquisition controls before creating a runtime root', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const workspace = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-reviewed-node-options-test-'),
    ));
    chmodSync(workspace, 0o700);
    try {
      let getterCalls = 0;
      expect(() => createReviewedNodeRuntime(workspace, {
        get sourceNodeCandidates(): readonly string[] {
          getterCalls++;
          throw new Error('must not execute');
        },
      })).toThrow(/own data property/u);
      expect(getterCalls).toBe(0);
      expect(() => createReviewedNodeRuntime(workspace, {
        sourceNodeCandidates: [],
      })).toThrow(/candidate list is empty/u);
      expect(() => createReviewedNodeRuntime(workspace, {
        sourceNodeCandidates: ['node'],
      })).toThrow(/absolute normalized pathname/u);
      expect(() => createReviewedNodeRuntime(workspace, {
        unexpected: true,
      } as never)).toThrow(/exact reviewed member set/u);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('keeps the known companion set explicitly non-closed', () => {
    const source = readFileSync(
      path.join(ROOT, 'scripts/lib/reviewed-node-runtime.ts'),
      'utf8',
    );
    expect(source).toContain('not a closed dynamic-library dependency');
    expect(source).toContain('acquireReviewedExecutableIntoPrivateRoot');
    expect(source).toContain('requireProtectedDirectoryEntryChain');
    expect(source).not.toMatch(/(?:node:)?child_process/u);
  });
});
