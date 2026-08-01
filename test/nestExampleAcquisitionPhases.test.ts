import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readNestExampleGitBlobsOffline } from '../scripts/lib/nest-example-source-inventory.js';
import { verifyOfflineGitReadAuthority } from '../scripts/lib/offline-git-object-database.js';
import {
  createReviewedGitRuntime,
  disposeReviewedGitRuntime,
} from '../scripts/lib/reviewed-git-command.js';

const temporaryDirectories: string[] = [];

function fixtureGit(
  repository: string,
  arguments_: readonly string[],
  input?: string,
): string {
  const result = spawnSync(
    '/usr/bin/git',
    ['--no-replace-objects', '-C', repository, ...arguments_],
    {
      encoding: 'utf8',
      env: {
        GIT_CONFIG_COUNT: '0',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_NO_REPLACE_OBJECTS: '1',
        HOME: '/dev/null',
        LANG: 'C',
        LC_ALL: 'C',
        PATH: '/usr/bin:/bin',
      },
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('NEST example acquisition phase ordering', () => {
  it('closes Git transport before raw acquisition and proves both object closures', () => {
    const source = readFileSync(
      path.resolve('scripts/generate-nest-example-source-inventory.ts'),
      'utf8',
    );
    const indexOf = (needle: string, from = 0): number => {
      const index = source.indexOf(needle, from);
      expect(index, needle).toBeGreaterThan(-1);
      return index;
    };
    const initialFetch = indexOf("'--depth=1'");
    const references = indexOf(
      'const selectedReferences = nestExampleRawBlobReferences(',
      initialFetch,
    );
    const removeRemote = indexOf("['remote', 'remove', 'origin']", references);
    const removeSidecars = indexOf(
      'removeGitAcquisitionSidecars(',
      removeRemote,
    );
    const structuralTransition = indexOf(
      'const structuralReadAuthority = verifyOfflineGitReadAuthority(',
      removeSidecars,
    );
    const initialClosure = indexOf(
      "'NEST example initial structural-only object closure'",
      structuralTransition,
    );
    const rawDownload = indexOf(
      'const stagedPaths = await downloadPinnedRawGitBlobsWithBoundary(',
      initialClosure,
    );
    const preImportClosure = indexOf(
      "'NEST example pre-import structural-only object closure'",
      rawDownload,
    );
    const importBlobs = indexOf(
      'importSelectedSourceBlobs(',
      preImportClosure,
    );
    const finalTransition = indexOf(
      'const offlineReadAuthority = verifyOfflineGitReadAuthority(',
      importBlobs,
    );
    const preMaterializationClosure = indexOf(
      "'NEST example pre-materialization complete object closure'",
      finalTransition,
    );
    const materialize = indexOf(
      'const materialized = materializeNestExampleTreeBlobs(',
      preMaterializationClosure,
    );
    const postReadClosure = indexOf(
      "'NEST example structural-plus-complete-tree object closure'",
      materialize,
    );
    expect([
      initialFetch,
      references,
      removeRemote,
      removeSidecars,
      structuralTransition,
      initialClosure,
      rawDownload,
      preImportClosure,
      importBlobs,
      finalTransition,
      preMaterializationClosure,
      materialize,
      postReadClosure,
    ]).toEqual([...[
      initialFetch,
      references,
      removeRemote,
      removeSidecars,
      structuralTransition,
      initialClosure,
      rawDownload,
      preImportClosure,
      importBlobs,
      finalTransition,
      preMaterializationClosure,
      materialize,
      postReadClosure,
    ]].sort((left, right) => left - right));

    const occurrenceCount = (needle: string): number =>
      source.split(needle).length - 1;
    expect(occurrenceCount("['remote', 'remove', 'origin']")).toBe(1);
    expect(occurrenceCount("'http.version=HTTP/1.1'")).toBe(1);
    expect(occurrenceCount('nestExampleRawBlobReferences')).toBe(2);
    expect(occurrenceCount('downloadPinnedRawGitBlobsWithBoundary')).toBe(2);
    expect(occurrenceCount('removeGitAcquisitionSidecars')).toBe(2);
    expect(occurrenceCount('verifyOfflineGitReadAuthority')).toBe(3);
    expect(occurrenceCount('materializeNestExampleTreeBlobs')).toBe(2);
    expect(occurrenceCount(
      'deriveOfflineGitStructuralObjectSetWithAuthority',
    )).toBe(2);
    expect(occurrenceCount(
      'requireExactOfflineGitObjectSetWithAuthority',
    )).toBe(5);
    expect(occurrenceCount('importSelectedSourceBlobs')).toBe(2);
    expect(source).not.toContain('prefetchNestExampleTreeBlobs');
    expect(source).not.toContain('deriveOfflineGitStructuralObjectSet(');
    expect(source).not.toContain('requireExactOfflineGitObjectSet(');
    expect(source).not.toContain('readNestExampleGitBlobsOffline(');
    expect(source).not.toContain('readReviewedGitBlobBatch(');
    expect(source).not.toContain("['cat-file'");

    const library = readFileSync(
      path.resolve('scripts/lib/nest-example-source-inventory.ts'),
      'utf8',
    );
    expect(library).toContain("GIT_NO_LAZY_FETCH: '1'");
    expect(library).toContain('requireOfflineGitReadAuthority(');
    expect(library).toContain(
      'PINNED_NEST_EXAMPLE_RAW_BLOB_REFERENCE_SET_DIGEST',
    );
    const offlineLibrary = readFileSync(
      path.resolve('scripts/lib/offline-git-object-database.ts'),
      'utf8',
    );
    expect(offlineLibrary).toContain(
      'offline-read repository uses an alternate Git object database',
    );
    expect(offlineLibrary).toContain('VERIFIED_OFFLINE_GIT_READ_AUTHORITIES');
  });
  it('reads complete local blobs after remote removal and fails locally when one is missing', {
    // Two independently sealed reviewed-Git runtimes and their offline authority
    // transitions compose here. Their command bounds remain narrower than this
    // outer integration-test watchdog.
    timeout: 180_000,
  }, () => {
    const root = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-nest-phase-test-'),
    ));
    temporaryDirectories.push(root);
    const repository = path.join(root, 'repository');
    const helperDirectory = path.join(root, 'hostile-git-exec-path');
    const helperSentinel = path.join(root, 'remote-helper-invoked');
    mkdirSync(repository, { mode: 0o700 });
    mkdirSync(helperDirectory, { mode: 0o700 });
    const helper = path.join(helperDirectory, 'git-remote-https');
    writeFileSync(
      helper,
      `#!/bin/sh\nprintf invoked > ${JSON.stringify(helperSentinel)}\nexit 99\n`,
      { encoding: 'utf8', mode: 0o700 },
    );
    chmodSync(helper, 0o700);

    fixtureGit(repository, ['init', '--quiet', '--object-format=sha1']);
    const contentByIdentity = new Map<string, string>();
    for (const content of ['alpha\n', 'beta\n']) {
      const identity = fixtureGit(
        repository,
        ['hash-object', '-w', '--stdin'],
        content,
      );
      contentByIdentity.set(identity, content);
    }
    const identities = [...contentByIdentity.keys()].sort();
    fixtureGit(repository, [
      'remote',
      'add',
      'origin',
      'https://example.invalid/should-never-run.git',
    ]);
    fixtureGit(repository, ['config', '--local', 'remote.origin.promisor', 'true']);
    fixtureGit(repository, [
      'config',
      '--local',
      'remote.origin.partialclonefilter',
      'blob:none',
    ]);

    const reviewedGit = createReviewedGitRuntime(root);
    let otherReviewedGit: ReturnType<typeof createReviewedGitRuntime>;
    try {
      otherReviewedGit = createReviewedGitRuntime(root);
    } catch (error) {
      disposeReviewedGitRuntime(reviewedGit);
      throw error;
    }
    const previousExecPath = process.env.GIT_EXEC_PATH;
    const previousPath = process.env.PATH;
    process.env.GIT_EXEC_PATH = helperDirectory;
    process.env.PATH = helperDirectory;
    try {
      expect(() => verifyOfflineGitReadAuthority(
        repository,
        root,
        'configured-remote negative control',
        reviewedGit,
      )).toThrow(/remote, promisor, or config redirection/u);
      expect(existsSync(helperSentinel)).toBe(false);

      fixtureGit(repository, ['remote', 'remove', 'origin']);
      expect(fixtureGit(repository, ['remote'])).toBe('');
      const offlineReadAuthority = verifyOfflineGitReadAuthority(
        repository,
        root,
        'complete offline-read control',
        reviewedGit,
      );
      expect(Object.isFrozen(offlineReadAuthority)).toBe(true);
      const copiedAuthority = { ...offlineReadAuthority };
      expect(() => readNestExampleGitBlobsOffline(
        copiedAuthority,
        identities,
        reviewedGit,
      )).toThrow(/unrecognized or bound to another runtime/u);
      let tokenTrapCount = 0;
      const proxiedAuthority = new Proxy(offlineReadAuthority, {
        get: () => {
          tokenTrapCount++;
          throw new Error('must not execute');
        },
        getPrototypeOf: () => {
          tokenTrapCount++;
          throw new Error('must not execute');
        },
        ownKeys: () => {
          tokenTrapCount++;
          throw new Error('must not execute');
        },
      });
      expect(() => readNestExampleGitBlobsOffline(
        proxiedAuthority,
        identities,
        reviewedGit,
      )).toThrow(/not an opaque verified state/u);
      expect(tokenTrapCount).toBe(0);
      expect(() => readNestExampleGitBlobsOffline(
        offlineReadAuthority,
        identities,
        otherReviewedGit,
      )).toThrow(/unrecognized or bound to another runtime/u);
      const records = readNestExampleGitBlobsOffline(
        offlineReadAuthority,
        identities,
        reviewedGit,
      );
      expect(records.map(({ gitBlobSha1 }) => gitBlobSha1)).toEqual(identities);
      expect(records.map((record) => record.copyBytes().toString('utf8'))).toEqual(
        identities.map((identity) => contentByIdentity.get(identity)),
      );
      expect(existsSync(helperSentinel)).toBe(false);

      const missingIdentity = identities[0]!;
      const alternateRepository = path.join(root, 'alternate-repository');
      mkdirSync(alternateRepository, { mode: 0o700 });
      fixtureGit(alternateRepository, ['init', '--quiet', '--object-format=sha1']);
      expect(fixtureGit(
        alternateRepository,
        ['hash-object', '-w', '--stdin'],
        contentByIdentity.get(missingIdentity)!,
      )).toBe(missingIdentity);
      unlinkSync(path.join(
        repository,
        '.git',
        'objects',
        missingIdentity.slice(0, 2),
        missingIdentity.slice(2),
      ));
      const alternateObjectDirectory = path.join(
        alternateRepository,
        '.git',
        'objects',
      );
      const alternatesPath = path.join(
        repository,
        '.git',
        'objects',
        'info',
        'alternates',
      );
      writeFileSync(
        alternatesPath,
        `${alternateObjectDirectory}\n`,
        'utf8',
      );
      expect(existsSync(path.join(
        repository,
        '.git',
        'objects',
        missingIdentity.slice(0, 2),
        missingIdentity.slice(2),
      ))).toBe(false);
      expect(existsSync(path.join(
        alternateObjectDirectory,
        missingIdentity.slice(0, 2),
        missingIdentity.slice(2),
      ))).toBe(true);
      expect(() => verifyOfflineGitReadAuthority(
        repository,
        root,
        'local-alternate negative transition',
        reviewedGit,
      )).toThrow(/alternate Git object database/u);
      expect(() => readNestExampleGitBlobsOffline(
        offlineReadAuthority,
        identities,
        reviewedGit,
      )).toThrow(/alternate Git object database/u);
      unlinkSync(alternatesPath);
      const missingLocalAuthority = verifyOfflineGitReadAuthority(
        repository,
        root,
        'missing-local-object offline transition',
        reviewedGit,
      );
      expect(() => readNestExampleGitBlobsOffline(
        missingLocalAuthority,
        identities,
        reviewedGit,
      )).toThrow(/does not bind|missing/u);
      expect(fixtureGit(repository, ['remote'])).toBe('');
      expect(existsSync(helperSentinel)).toBe(false);
    } finally {
      if (previousExecPath === undefined) delete process.env.GIT_EXEC_PATH;
      else process.env.GIT_EXEC_PATH = previousExecPath;
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
      try {
        disposeReviewedGitRuntime(otherReviewedGit);
      } finally {
        disposeReviewedGitRuntime(reviewedGit);
      }
    }
  });
});
