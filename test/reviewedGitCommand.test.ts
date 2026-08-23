import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  constants as fsConstants,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  controlledGitCommandArguments,
  controlledGitEnvironment,
  offlineGitObjectDatabaseTesting,
  requireExactOfflineGitObjectSet,
  verifyOfflineGitObjectDatabase,
} from '../scripts/lib/offline-git-object-database.js';
import {
  createReviewedGitRuntime,
  disposeReviewedGitRuntime,
  readReviewedGitBlobBatch,
  REVIEWED_GIT_SOURCE_AUTHORITY_PROFILE_SCHEMA,
  reviewedGitCommandTesting,
  runReviewedGitCommand,
  type ReviewedGitRuntime,
} from '../scripts/lib/reviewed-git-command.js';
import { REVIEWED_POSIX_COMMAND_LIMITS } from '../scripts/lib/reviewed-posix-command.js';
import { reviewedFixtureGitTesting } from './reviewedFixtureGit.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PRODUCTION_GIT_CALLERS = [
  'scripts/generate-nest-example-source-inventory.ts',
  'scripts/generate-nest-documentation-source-inventory.ts',
  'scripts/lib/nest-example-source-inventory.ts',
  'scripts/lib/nest-documentation-source-inventory.ts',
  'scripts/lib/offline-git-object-database.ts',
  'scripts/lib/reviewed-git-command.ts',
  'scripts/verify-release.ts',
] as const;
function reviewedGit(
  runtime: ReviewedGitRuntime,
  repository: string,
  args: readonly string[],
  stdin?: Uint8Array,
) {
  return runReviewedGitCommand(
    runtime,
    repository,
    controlledGitCommandArguments(repository, args),
    {
      environment: { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      ...(stdin === undefined ? {} : { stdin }),
      outputLimitBytes: 1024 * 1024,
      timeoutMs: 30_000,
    },
  );
}

describe('reviewed Git command boundary', () => {
  let workspace = '';
  let repository = '';
  let runtime: ReviewedGitRuntime;
  let adversarialRuntime: ReviewedGitRuntime;
  let controlDriftRuntime: ReviewedGitRuntime;
  let runtimeDisposed = false;

  beforeAll(() => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    workspace = realpathSync(mkdtempSync(path.join(tmpdir(), 'cortexel-reviewed-git-test-')));
    chmodSync(workspace, 0o700);
    repository = path.join(workspace, 'repository');
    mkdirSync(repository, { mode: 0o700 });
    runtime = createReviewedGitRuntime(workspace);

    const fakeSourceDirectory = path.join(workspace, 'fake-source');
    mkdirSync(fakeSourceDirectory, { mode: 0o700 });
    const fakeGit = path.join(fakeSourceDirectory, 'git');
    writeFileSync(fakeGit, [
      '#!/bin/sh',
      'if [ "$1" = "--version" ]; then',
      '  printf "git version 99.0.0\\n"',
      '  exit 0',
      'fi',
      'case "$1" in',
      '  mutate-home)',
      '    umask 077',
      '    printf "machine example.invalid login leaked password leaked\\n" > "$HOME/.netrc"',
      '    printf "ok\\n"',
      '    ;;',
      '  nonzero) exit 7 ;;',
      '  overflow) while :; do printf "0123456789abcdef"; done ;;',
      '  preflight-marker) : > "$2"; printf "ok\\n" ;;',
      '  replace-home)',
      '    mv "$HOME" "$HOME.before"',
      '    mkdir -m 700 "$HOME"',
      '    printf "ok\\n"',
      '    ;;',
      '  timeout) while :; do :; done ;;',
      '  *) printf "ok\\n" ;;',
      'esac',
      '',
    ].join('\n'), { flag: 'wx', mode: 0o555 });
    chmodSync(fakeGit, 0o555);
    adversarialRuntime = createReviewedGitRuntime(workspace, {
      sourceGitExecutable: realpathSync(fakeGit),
    });
    controlDriftRuntime = createReviewedGitRuntime(workspace, {
      sourceGitExecutable: realpathSync(fakeGit),
    });

    reviewedGit(runtime, repository, [
      'init',
      '--quiet',
      '--object-format=sha1',
      '--template=',
    ]);
  }, 300_000);

  afterAll(() => {
    if (workspace === '') return;
    if (adversarialRuntime !== undefined) {
      disposeReviewedGitRuntime(adversarialRuntime);
    }
    if (controlDriftRuntime !== undefined) {
      disposeReviewedGitRuntime(controlDriftRuntime);
    }
    if (runtime !== undefined && !runtimeDisposed) disposeReviewedGitRuntime(runtime);
    rmSync(workspace, { recursive: true, force: true });
  });

  it('consumes the shared exact Node acquisition without narrowing its evidence', () => {
    if (workspace === '') return;
    expect(runtime.sourceNodeExecutable).toBe(runtime.node.executable.sourcePath);
    expect(runtime.node.executable.sourceSha256)
      .toBe(runtime.node.executable.stagedSha256);
    expect(runtime.node.authority.file.sha256)
      .toBe(runtime.node.executable.stagedSha256);
    expect(runtime.node.inventorySha256).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(runtime.gitSourceAuthorityProfile).toEqual({
      schema: REVIEWED_GIT_SOURCE_AUTHORITY_PROFILE_SCHEMA,
      kind: process.platform === 'darwin'
        ? 'darwin_selected_developer_tree_git_bytes'
        : 'linux_protected_system_git',
    });
    expect(Object.isFrozen(runtime.gitSourceAuthorityProfile)).toBe(true);
    expect(runtime.node.companions.every((companion) =>
      companion.sourceSha256 === companion.stagedSha256))
      .toBe(true);
    if (process.platform === 'darwin') {
      const selectionProbe = spawnSync(
        reviewedGitCommandTesting.darwinXcodeSelectExecutable(),
        ['-p'],
        {
          env: reviewedGitCommandTesting.darwinXcodeSelectEnvironment(),
          maxBuffer: 4_097,
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 10_000,
        },
      );
      expect(selectionProbe.error).toBeUndefined();
      expect(selectionProbe.status, selectionProbe.stderr.toString('utf8')).toBe(0);
      expect(selectionProbe.stderr).toEqual(Buffer.alloc(0));
      const selectedGitExecutable = realpathSync(
        reviewedGitCommandTesting.darwinGitExecutableFromXcodeSelectOutput(
          selectionProbe.stdout,
        ),
      );
      expect(runtime.gitAcquisition?.executable.sourcePath).toBe(
        selectedGitExecutable,
      );
      expect(runtime.gitExecutable).not.toBe(
        reviewedGitCommandTesting.darwinGitShimExecutable(),
      );
      expect(runtime.gitAcquisition).not.toBeNull();
      expect(runtime.gitAcquisition?.executable.sourceSha256).toBe(
        runtime.gitAcquisition?.executable.stagedSha256,
      );
    } else {
      expect(runtime.gitExecutable).toBe('/usr/bin/git');
      expect(runtime.gitAuthority.executable).toBe('/usr/bin/git');
    }
    const source = readFileSync(
      path.join(ROOT, 'scripts/lib/reviewed-git-command.ts'),
      'utf8',
    );
    expect(source).toContain("from './reviewed-node-runtime.js'");
    expect(source).not.toContain('libnode.');
    expect(source).not.toContain('SUPPORTED_NODE_MAJORS');
  });

  it('keeps caller-selected acquired bytes distinct from default Git authority', () => {
    if (workspace === '') return;
    expect(adversarialRuntime.gitSourceAuthorityProfile).toEqual({
      schema: REVIEWED_GIT_SOURCE_AUTHORITY_PROFILE_SCHEMA,
      kind: 'explicit_caller_selected_git_bytes',
    });
    expect(Object.isFrozen(adversarialRuntime.gitSourceAuthorityProfile)).toBe(true);
    expect(adversarialRuntime.gitAcquisition).not.toBeNull();
    expect(adversarialRuntime.gitSourceAuthorityProfile.kind).not.toBe(
      'darwin_selected_developer_tree_git_bytes',
    );
    expect(runtime.gitSourceAuthorityProfile.kind).not.toBe(
      'explicit_caller_selected_git_bytes',
    );
  });

  it('accepts only one bounded absolute xcode-select result for CLT or full Xcode', () => {
    expect(reviewedGitCommandTesting.darwinGitExecutableFromXcodeSelectOutput(
      Buffer.from('/Library/Developer/CommandLineTools\n'),
    )).toBe('/Library/Developer/CommandLineTools/usr/bin/git');
    expect(reviewedGitCommandTesting.darwinGitExecutableFromXcodeSelectOutput(
      Buffer.from('/Applications/Xcode Beta.app/Contents/Developer\n'),
    )).toBe('/Applications/Xcode Beta.app/Contents/Developer/usr/bin/git');

    for (const output of [
      Buffer.alloc(0),
      Buffer.from('/Applications/Xcode.app/Contents/Developer'),
      Buffer.from('Applications/Xcode.app/Contents/Developer\n'),
      Buffer.from('/Applications/Xcode.app/Contents/Developer\r\n'),
      Buffer.from('/first/Developer\n/second/Developer\n'),
      Buffer.from('/Applications/Xcode.app/Contents/Developer/\n'),
      Buffer.from(`/${'x'.repeat(4_090)}\n`),
      Buffer.from(`/${'x'.repeat(4_096)}\n`),
    ]) {
      expect(() =>
        reviewedGitCommandTesting.darwinGitExecutableFromXcodeSelectOutput(output))
        .toThrow(/xcode-select output/u);
    }
  });

  it('uses one closed xcode-select environment and ignores ambient DEVELOPER_DIR', () => {
    const environment = reviewedGitCommandTesting.darwinXcodeSelectEnvironment();
    expect(Object.keys(environment).sort()).toEqual(['LANG', 'LC_ALL', 'TZ']);
    expect(environment).toEqual({ LANG: 'C', LC_ALL: 'C', TZ: 'UTC' });
    expect(environment).not.toHaveProperty('DEVELOPER_DIR');
    expect(environment).not.toHaveProperty('PATH');
    if (process.platform !== 'darwin') return;

    const baseline = spawnSync(
      reviewedGitCommandTesting.darwinXcodeSelectExecutable(),
      ['-p'],
      {
        env: environment,
        maxBuffer: 4_097,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 10_000,
      },
    );
    expect(baseline.error).toBeUndefined();
    expect(baseline.status, baseline.stderr.toString('utf8')).toBe(0);
    const previousDeveloperDirectory = process.env.DEVELOPER_DIR;
    process.env.DEVELOPER_DIR = '/attacker/Developer';
    try {
      const canary = spawnSync(
        reviewedGitCommandTesting.darwinXcodeSelectExecutable(),
        ['-p'],
        {
          env: environment,
          maxBuffer: 4_097,
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 10_000,
        },
      );
      expect(canary.error).toBeUndefined();
      expect(canary.status, canary.stderr.toString('utf8')).toBe(0);
      expect(canary.stdout).toEqual(baseline.stdout);
    } finally {
      if (previousDeveloperDirectory === undefined) {
        delete process.env.DEVELOPER_DIR;
      } else {
        process.env.DEVELOPER_DIR = previousDeveloperDirectory;
      }
    }
  });

  it('rejects injected physical and byte-identical Darwin shim aliases', () => {
    const shim = {
      device: '7',
      inode: '11',
      sha256: `sha256:${'a'.repeat(64)}`,
      size: 1234,
    };
    expect(() => reviewedGitCommandTesting.requireDistinctDarwinShimIdentity(
      { ...shim, sha256: `sha256:${'b'.repeat(64)}` },
      shim,
    )).toThrow(/physical identity.*xcrun shim/u);
    expect(() => reviewedGitCommandTesting.requireDistinctDarwinShimIdentity(
      { ...shim, device: '8', inode: '12' },
      shim,
    )).toThrow(/byte identity.*xcrun shim/u);
    expect(() => reviewedGitCommandTesting.requireDistinctDarwinShimIdentity(
      {
        device: '8',
        inode: '12',
        sha256: `sha256:${'b'.repeat(64)}`,
        size: 1234,
      },
      shim,
    )).not.toThrow();
  });

  it('requires an injected selected Developer tree to stay direct, protected, and native', () => {
    const developerDirectory = '/Applications/Xcode.app/Contents/Developer';
    const paths = [
      developerDirectory,
      `${developerDirectory}/usr`,
      `${developerDirectory}/usr/bin`,
      `${developerDirectory}/usr/bin/git`,
    ];
    const fixture = () => ({
      developerDirectory,
      entries: paths.map((entryPath, index) => ({
        canonicalPath: entryPath,
        kind: index === paths.length - 1 ? 'file' as const : 'directory' as const,
        mode: index === paths.length - 1 ? 0o755 : 0o755,
        path: entryPath,
        uid: 0,
      })),
      gitMagicHex: 'cffaedfe',
    });
    expect(
      reviewedGitCommandTesting.requireDarwinDeveloperTreeFixture(fixture()),
    ).toBe(`${developerDirectory}/usr/bin/git`);

    const escaping = fixture();
    escaping.entries[3] = {
      ...escaping.entries[3]!,
      canonicalPath: '/tmp/attacker/git',
    };
    expect(() =>
      reviewedGitCommandTesting.requireDarwinDeveloperTreeFixture(escaping))
      .toThrow(/symbolic or escaping/u);

    const writable = fixture();
    writable.entries[1] = { ...writable.entries[1]!, mode: 0o775 };
    expect(() =>
      reviewedGitCommandTesting.requireDarwinDeveloperTreeFixture(writable))
      .toThrow(/group\/world-write authority/u);

    const setuid = fixture();
    setuid.entries[3] = { ...setuid.entries[3]!, mode: 0o4755 };
    expect(() =>
      reviewedGitCommandTesting.requireDarwinDeveloperTreeFixture(setuid))
      .toThrow(/special or group\/world-write authority/u);

    const userOwned = fixture();
    userOwned.entries[0] = { ...userOwned.entries[0]!, uid: 501 };
    expect(() =>
      reviewedGitCommandTesting.requireDarwinDeveloperTreeFixture(userOwned))
      .toThrow(/not root-owned from Developer downward/u);

    expect(() => reviewedGitCommandTesting.requireDarwinDeveloperTreeFixture({
      ...fixture(),
      gitMagicHex: Buffer.from('#!/b').toString('hex'),
    })).toThrow(/not a native Mach-O executable/u);
  });

  it('admits default reviewed fixture Git only on supported hosts', () => {
    expect(() => reviewedFixtureGitTesting.requireSupportedPlatform('linux'))
      .not.toThrow();
    expect(() => reviewedFixtureGitTesting.requireSupportedPlatform('darwin'))
      .not.toThrow();
    expect(() => reviewedFixtureGitTesting.requireSupportedPlatform('win32'))
      .toThrow(/implemented only on macOS\/Linux/u);
    const source = readFileSync(
      path.join(ROOT, 'test/reviewedFixtureGit.ts'),
      'utf8',
    );
    expect(source).not.toContain('/Library/Developer/CommandLineTools');
    expect(source).not.toContain('/Applications/Xcode.app');
  });

  it('rejects Darwin shim aliases but admits installed developer Git executables', () => {
    if (workspace === '' || process.platform !== 'darwin') return;
    const shim = reviewedGitCommandTesting.darwinGitShimExecutable();
    const shimStat = lstatSync(shim, { bigint: true });
    const hardlinkAlias = [
      '/usr/bin/clang',
      '/usr/bin/cc',
      '/usr/bin/gcc',
    ].find((candidate) => {
      if (!existsSync(candidate)) return false;
      const candidateStat = lstatSync(candidate, { bigint: true });
      return candidate !== shim &&
        candidateStat.dev === shimStat.dev &&
        candidateStat.ino === shimStat.ino;
    });
    if (hardlinkAlias !== undefined) {
      expect(() => createReviewedGitRuntime(workspace, {
        sourceGitExecutable: hardlinkAlias,
      })).toThrow(/physical identity.*xcrun shim/u);
    }

    const copiedShim = path.join(workspace, 'copied-macos-git-shim');
    copyFileSync(shim, copiedShim, fsConstants.COPYFILE_EXCL);
    chmodSync(copiedShim, 0o555);
    expect(() => createReviewedGitRuntime(workspace, {
      sourceGitExecutable: realpathSync(copiedShim),
    })).toThrow(/byte identity.*xcrun shim/u);

    const installedDeveloperGitExecutables = new Set([
      runtime.gitAcquisition?.executable.sourcePath,
      '/Library/Developer/CommandLineTools/usr/bin/git',
      '/Applications/Xcode.app/Contents/Developer/usr/bin/git',
    ]);
    for (const candidate of installedDeveloperGitExecutables) {
      if (candidate === undefined || !existsSync(candidate)) continue;
      const candidateStat = lstatSync(candidate, { bigint: true });
      expect(
        candidateStat.dev === shimStat.dev && candidateStat.ino === shimStat.ino,
        candidate,
      ).toBe(false);
      const ownsCandidateRuntime = candidate !==
        runtime.gitAcquisition?.executable.sourcePath;
      const candidateRuntime = ownsCandidateRuntime
        ? createReviewedGitRuntime(workspace, {
            sourceGitExecutable: realpathSync(candidate),
          })
        : runtime;
      try {
        expect(candidateRuntime.gitVersion).toMatch(/^git version /u);
        expect(candidateRuntime.gitExecutable).not.toBe(shim);
        const bytes = Buffer.from(`installed Git canary: ${candidate}\n`, 'utf8');
        const result = reviewedGit(
          candidateRuntime,
          repository,
          ['hash-object', '--stdin'],
          bytes,
        );
        const header = Buffer.from(`blob ${bytes.byteLength}\0`, 'utf8');
        expect(result.stdout.toString('ascii').trim()).toBe(
          createHash('sha1').update(header).update(bytes).digest('hex'),
        );
      } finally {
        if (ownsCandidateRuntime) disposeReviewedGitRuntime(candidateRuntime);
      }
    }
  }, 180_000);

  it('uses one ordered binary batch and rejects an identity/order mismatch', () => {
    if (workspace === '') return;
    const firstBytes = Buffer.from([0x00, 0x01, 0xfe, 0xff]);
    const secondBytes = Buffer.from('second\n', 'utf8');
    const first = reviewedGit(
      runtime,
      repository,
      ['hash-object', '-w', '--stdin'],
      firstBytes,
    ).stdout.toString('ascii').trim();
    const expectedFirst = createHash('sha1')
      .update(Buffer.from(`blob ${firstBytes.byteLength}\0`, 'ascii'))
      .update(firstBytes)
      .digest('hex');
    expect(first).toBe(expectedFirst);
    const second = reviewedGit(
      runtime,
      repository,
      ['hash-object', '-w', '--stdin'],
      secondBytes,
    ).stdout.toString('ascii').trim();
    const requests = [
      { objectName: second, expectedGitBlobSha1: second },
      { objectName: first, expectedGitBlobSha1: first },
    ];
    const records = readReviewedGitBlobBatch(
      runtime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      requests,
      { outputLimitBytes: 1024 * 1024, timeoutMs: 30_000 },
    );
    expect(records.map(({ gitBlobSha1 }) => gitBlobSha1)).toEqual([second, first]);
    expect(records.map(({ copyBytes }) => copyBytes())).toEqual([secondBytes, firstBytes]);
    const mutableCopy = records[0]!.copyBytes();
    mutableCopy.fill(0);
    expect(records[0]!.copyBytes()).toEqual(secondBytes);
    expect(records.every(({ sha256 }) => /^sha256:[0-9a-f]{64}$/u.test(sha256)))
      .toBe(true);

    expect(() => readReviewedGitBlobBatch(
      runtime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      [{ objectName: first, expectedGitBlobSha1: second }],
      { outputLimitBytes: 1024 * 1024, timeoutMs: 30_000 },
    )).toThrow(/does not bind/u);

    expect(() => readReviewedGitBlobBatch(
      runtime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      [{ objectName: first, expectedGitBlobSha1: first, extra: true }] as never,
      { outputLimitBytes: 1024 * 1024, timeoutMs: 30_000 },
    )).toThrow(/exact reviewed member set/u);
    expect(() => readReviewedGitBlobBatch(
      runtime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      [{
        get objectName(): string {
          throw new Error('must not execute');
        },
        expectedGitBlobSha1: first,
      }],
      { outputLimitBytes: 1024 * 1024, timeoutMs: 30_000 },
    )).toThrow(/own data property/u);
    const inheritedRequest = Object.assign(
      Object.create({ inherited: true }) as Record<string, unknown>,
      { objectName: first, expectedGitBlobSha1: first },
    );
    expect(() => readReviewedGitBlobBatch(
      runtime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      [inheritedRequest] as never,
      { outputLimitBytes: 1024 * 1024, timeoutMs: 30_000 },
    )).toThrow(/unreviewed prototype/u);
    expect(() => readReviewedGitBlobBatch(
      runtime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch', '--buffer']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      requests,
      { outputLimitBytes: 1024 * 1024, timeoutMs: 30_000 },
    )).toThrow(/exact closed command/u);
    expect(() => readReviewedGitBlobBatch(
      runtime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      requests,
      {
        outputLimitBytes: 1024 * 1024,
        timeoutMs: 30_000,
        extra: true,
      } as never,
    )).toThrow(/exact reviewed member set/u);
    expect(() => readReviewedGitBlobBatch(
      runtime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      requests,
      {
        outputLimitBytes: 1024 * 1024,
        get timeoutMs(): number {
          throw new Error('must not execute');
        },
      },
    )).toThrow(/own data property/u);
    const inheritedBatchOptions = Object.assign(
      Object.create({ inherited: true }) as Record<string, unknown>,
      { outputLimitBytes: 1024 * 1024, timeoutMs: 30_000 },
    );
    expect(() => readReviewedGitBlobBatch(
      runtime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      requests,
      inheritedBatchOptions as never,
    )).toThrow(/unreviewed prototype/u);
    expect(() => readReviewedGitBlobBatch(
      adversarialRuntime,
      repository,
      controlledGitCommandArguments(repository, ['cat-file', '--batch']),
      { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      [{ objectName: first, expectedGitBlobSha1: first }],
      { outputLimitBytes: 1024 * 1024, timeoutMs: 30_000 },
    )).toThrow(/does not bind/u);
  }, 90_000);

  it('independently rejects a loose-object pathname whose bytes hash elsewhere', () => {
    if (workspace === '') return;
    const integrityRepository = path.join(workspace, 'integrity-repository');
    mkdirSync(integrityRepository, { mode: 0o700 });
    reviewedGit(runtime, integrityRepository, [
      'init',
      '--quiet',
      '--object-format=sha1',
      '--template=',
    ]);
    const first = reviewedGit(
      runtime,
      integrityRepository,
      ['hash-object', '-w', '--stdin'],
      Buffer.from('AAAA\n'),
    ).stdout.toString('ascii').trim();
    const second = reviewedGit(
      runtime,
      integrityRepository,
      ['hash-object', '-w', '--stdin'],
      Buffer.from('BBBB\n'),
    ).stdout.toString('ascii').trim();
    const expected = [first, second]
      .sort()
      .map((identity) => ({ identity, objectType: 'blob' as const }));
    expect(() => requireExactOfflineGitObjectSet(
      integrityRepository,
      expected,
      'loose-object integrity negative control',
      runtime,
    )).not.toThrow();
    expect(verifyOfflineGitObjectDatabase(
      integrityRepository,
      workspace,
      'loose-object integrity positive control',
      runtime,
    ).objectContentSetSha256).toMatch(/^sha256:[0-9a-f]{64}$/u);

    const firstPath = path.join(
      integrityRepository,
      '.git',
      'objects',
      first.slice(0, 2),
      first.slice(2),
    );
    const secondPath = path.join(
      integrityRepository,
      '.git',
      'objects',
      second.slice(0, 2),
      second.slice(2),
    );
    const objectAlias = path.join(workspace, 'loose-object-hardlink-alias');
    linkSync(firstPath, objectAlias);
    expect(() => verifyOfflineGitObjectDatabase(
      integrityRepository,
      workspace,
      'loose-object hardlink negative control',
      runtime,
    )).toThrow(/single-link current-UID authority/u);
    rmSync(objectAlias);

    chmodSync(firstPath, 0o600);
    writeFileSync(firstPath, readFileSync(secondPath));
    expect(() => requireExactOfflineGitObjectSet(
      integrityRepository,
      expected,
      'loose-object integrity negative control',
      runtime,
    )).toThrow(/canonical SHA-1/u);
    expect(() => verifyOfflineGitObjectDatabase(
      integrityRepository,
      workspace,
      'loose-object integrity negative control',
      runtime,
    )).toThrow(/canonical SHA-1/u);
  }, 120_000);

  it('bounds direct directory/config inspection and rejects indirect ancestry', () => {
    if (workspace === '') return;
    const authorityRoot = path.join(workspace, 'offline-authority-negative-controls');
    mkdirSync(authorityRoot, { mode: 0o700 });
    const crowded = path.join(authorityRoot, 'crowded');
    mkdirSync(crowded, { mode: 0o700 });
    for (const name of ['a', 'b', 'c']) writeFileSync(path.join(crowded, name), name);
    expect(() => offlineGitObjectDatabaseTesting.boundedDirectoryNames(crowded, 2))
      .toThrow(/2-entry bound/u);

    const boundedFile = path.join(authorityRoot, 'config');
    writeFileSync(boundedFile, '1234', { mode: 0o600 });
    expect(() => offlineGitObjectDatabaseTesting.readBoundedDirectRegularFile(
      boundedFile,
      3,
    )).toThrow(/3-byte bound/u);
    const oversizedConfig = path.join(authorityRoot, 'oversized-config');
    writeFileSync(
      oversizedConfig,
      Buffer.alloc(offlineGitObjectDatabaseTesting.maximumLocalGitConfigBytes + 1),
      { mode: 0o600 },
    );
    expect(() => offlineGitObjectDatabaseTesting.readBoundedDirectRegularFile(
      oversizedConfig,
      offlineGitObjectDatabaseTesting.maximumLocalGitConfigBytes,
    )).toThrow(/1048576-byte bound/u);
    const configAlias = path.join(authorityRoot, 'config-hardlink');
    linkSync(boundedFile, configAlias);
    expect(() => offlineGitObjectDatabaseTesting.readBoundedDirectRegularFile(
      boundedFile,
      16,
    )).toThrow(/direct regular file/u);
    rmSync(configAlias);

    const directParent = path.join(authorityRoot, 'direct-parent');
    mkdirSync(directParent, { mode: 0o700 });
    const directChild = path.join(directParent, 'child');
    mkdirSync(directChild, { mode: 0o700 });
    const parentAlias = path.join(authorityRoot, 'parent-alias');
    symlinkSync(directParent, parentAlias, 'dir');
    expect(() => offlineGitObjectDatabaseTesting.directDirectory(
      path.join(parentAlias, 'child'),
    )).toThrow(/must be a direct directory/u);

    const regularBefore = `${boundedFile}.before`;
    try {
      expect(() => offlineGitObjectDatabaseTesting.readBoundedDirectRegularFile(
        boundedFile,
        16,
        () => {
          renameSync(boundedFile, regularBefore);
          const mkfifo = spawnSync('mkfifo', [boundedFile], {
            encoding: 'utf8',
            timeout: 10_000,
          });
          if (mkfifo.status !== 0 || mkfifo.error !== undefined) {
            throw new Error(`mkfifo failed: ${mkfifo.stderr}`);
          }
        },
      )).toThrow(/identity changed while opening/u);
    } finally {
      if (existsSync(boundedFile)) rmSync(boundedFile);
      if (existsSync(regularBefore)) renameSync(regularBefore, boundedFile);
    }

    const source = readFileSync(
      path.join(ROOT, 'scripts/lib/offline-git-object-database.ts'),
      'utf8',
    );
    expect(source).toContain(
      'fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK',
    );
    expect(source).not.toMatch(/\breaddirSync\s*\(/u);
    expect(source).not.toMatch(/\breadFileSync\s*\(config/u);
  }, 30_000);

  it('rejects hostile caller containers and PATH before getters or unbounded splitting', () => {
    if (workspace === '') return;
    let getterCalls = 0;
    const getterArguments = ['status'];
    Object.defineProperty(getterArguments, '0', {
      enumerable: true,
      get: () => {
        getterCalls++;
        throw new Error('must not execute');
      },
    });
    expect(() => controlledGitCommandArguments(workspace, getterArguments))
      .toThrow(/own data property/u);
    expect(getterCalls).toBe(0);

    const proxiedArguments = new Proxy(['status'], {
      get: () => {
        getterCalls++;
        throw new Error('must not execute');
      },
    });
    expect(() => controlledGitCommandArguments(workspace, proxiedArguments))
      .toThrow(/direct array/u);
    expect(getterCalls).toBe(0);

    const excessiveArguments: string[] = [];
    excessiveArguments.length = 0xffff_ffff;
    expect(() => controlledGitCommandArguments(workspace, excessiveArguments))
      .toThrow(/excessive length authority/u);

    const oversizedArgument = 'x'.repeat(
      reviewedGitCommandTesting.maximumArgumentBytes + 1,
    );
    const byteLengthSpy = vi.spyOn(Buffer, 'byteLength');
    try {
      expect(() => controlledGitCommandArguments(workspace, [oversizedArgument]))
        .toThrow(/not a bounded string/u);
      expect(() => runReviewedGitCommand(
        adversarialRuntime,
        workspace,
        [oversizedArgument],
        {
          environment: controlledGitEnvironment(),
          outputLimitBytes: 1024,
          timeoutMs: 10_000,
        },
      )).toThrow(/arguments exceed their count or byte bound/u);

      const oversizedRepository = `/${'x'.repeat(
        reviewedGitCommandTesting.maximumPathBytes,
      )}`;
      expect(() => runReviewedGitCommand(
        adversarialRuntime,
        oversizedRepository,
        ['success'],
        {
          environment: controlledGitEnvironment(),
          outputLimitBytes: 1024,
          timeoutMs: 10_000,
        },
      )).toThrow(/absolute normalized pathname/u);

      const oversizedObjectName = 'x'.repeat(4_097);
      expect(() => readReviewedGitBlobBatch(
        adversarialRuntime,
        workspace,
        controlledGitCommandArguments(workspace, ['cat-file', '--batch']),
        controlledGitEnvironment(),
        [{
          expectedGitBlobSha1: '0'.repeat(40),
          objectName: oversizedObjectName,
        }],
        { outputLimitBytes: 1024, timeoutMs: 10_000 },
      )).toThrow(/blob batch request 0 is invalid/u);

      expect(byteLengthSpy.mock.calls.some(([value]) => value === oversizedArgument))
        .toBe(false);
      expect(byteLengthSpy.mock.calls.some(([value]) => value === oversizedRepository))
        .toBe(false);
      expect(byteLengthSpy.mock.calls.some(([value]) => value === oversizedObjectName))
        .toBe(false);
    } finally {
      byteLengthSpy.mockRestore();
    }

    const excessiveMemberName = 'x'.repeat(256 * 1024);
    const decoratedArguments = ['status'];
    Object.defineProperty(decoratedArguments, excessiveMemberName, {
      enumerable: true,
      get: () => {
        getterCalls++;
        throw new Error('must not execute');
      },
    });
    expect(() => controlledGitCommandArguments(workspace, decoratedArguments))
      .toThrow(/no extra enumerable members/u);
    expect(getterCalls).toBe(0);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      decoratedArguments,
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/no extra enumerable members/u);
    expect(getterCalls).toBe(0);

    const decoratedEnvironment = controlledGitEnvironment();
    Object.defineProperty(decoratedEnvironment, 'UNREVIEWED', {
      enumerable: true,
      get: () => {
        getterCalls++;
        throw new Error('must not execute');
      },
    });
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: decoratedEnvironment,
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/exact reviewed member set/u);
    expect(getterCalls).toBe(0);

    const excessiveKeyEnvironment = controlledGitEnvironment();
    Object.defineProperty(excessiveKeyEnvironment, excessiveMemberName, {
      enumerable: true,
      get: () => {
        getterCalls++;
        throw new Error('must not execute');
      },
    });
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: excessiveKeyEnvironment,
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/exact reviewed member set/u);
    expect(getterCalls).toBe(0);

    const oldPath = process.env.PATH;
    try {
      process.env.PATH = 'x'.repeat(
        reviewedGitCommandTesting.maximumHostPathBytes + 1,
      );
      expect(() => reviewedGitCommandTesting.hostNodeCandidates())
        .toThrow(/PATH exceeds its .*byte bound/u);
    } finally {
      if (oldPath === undefined) delete process.env.PATH;
      else process.env.PATH = oldPath;
    }
    const source = readFileSync(
      path.join(ROOT, 'scripts/lib/reviewed-git-command.ts'),
      'utf8',
    );
    expect(source).not.toContain('Reflect.ownKeys(value)');
    expect(source).not.toMatch(/\breaddirSync\s*\(/u);
  }, 30_000);

  it('admits no ambient or mutable Git HOME authority', () => {
    if (workspace === '') return;
    const emptyHome = path.join(workspace, 'empty-home');
    mkdirSync(emptyHome, { mode: 0o700 });
    const accepted = runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(emptyHome),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    );
    expect(accepted.stdout.toString('utf8')).toBe('ok\n');
    expect(readdirSync(emptyHome)).toEqual([]);

    const nonemptyHome = path.join(workspace, 'nonempty-home');
    mkdirSync(nonemptyHome, { mode: 0o700 });
    writeFileSync(
      path.join(nonemptyHome, '.netrc'),
      'machine example.invalid login ambient password credential\n',
      { flag: 'wx', mode: 0o600 },
    );
    const preflightMarker = path.join(workspace, 'nonempty-home-command-ran');
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['preflight-marker', preflightMarker],
      {
        environment: controlledGitEnvironment(nonemptyHome),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/HOME private directory must be empty/u);
    expect(existsSync(preflightMarker)).toBe(false);

    const wrongModeHome = path.join(workspace, 'wrong-mode-home');
    mkdirSync(wrongModeHome, { mode: 0o700 });
    chmodSync(wrongModeHome, 0o755);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['preflight-marker', preflightMarker],
      {
        environment: controlledGitEnvironment(wrongModeHome),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/exact mode 0700/u);
    expect(existsSync(preflightMarker)).toBe(false);

    const contentMutationHome = path.join(workspace, 'content-mutation-home');
    mkdirSync(contentMutationHome, { mode: 0o700 });
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['mutate-home'],
      {
        environment: controlledGitEnvironment(contentMutationHome),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/HOME private directory must be empty/u);
    rmSync(path.join(contentMutationHome, '.netrc'));

    const identityMutationHome = path.join(workspace, 'identity-mutation-home');
    const originalHome = `${identityMutationHome}.before`;
    mkdirSync(identityMutationHome, { mode: 0o700 });
    try {
      expect(() => runReviewedGitCommand(
        adversarialRuntime,
        workspace,
        ['replace-home'],
        {
          environment: controlledGitEnvironment(identityMutationHome),
          outputLimitBytes: 1024,
          timeoutMs: 10_000,
        },
      )).toThrow(/HOME authority changed during command execution/u);
    } finally {
      rmSync(identityMutationHome, { recursive: true, force: true });
      renameSync(originalHome, identityMutationHome);
    }
  }, 180_000);

  it('fails closed on nonzero, timeout, overflow, target drift, and control-runtime drift', () => {
    if (workspace === '') return;
    const ResizableArrayBuffer = ArrayBuffer as unknown as new (
      byteLength: number,
      options: { readonly maxByteLength: number },
    ) => ArrayBuffer;
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
        unexpected: true,
      } as never,
    )).toThrow(/exact reviewed member set/u);
    const getterOptions = {
      environment: controlledGitEnvironment(),
      outputLimitBytes: 1024,
      get timeoutMs(): number {
        throw new Error('must not execute');
      },
    };
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      getterOptions,
    )).toThrow(/own data property/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      '.',
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/absolute normalized pathname/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 0,
        timeoutMs: 10_000,
      },
    )).toThrow(/timeout or output bound is invalid/u);
    const maximumTimeoutResult = runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs,
      },
    );
    expect(maximumTimeoutResult.stdout.toString('utf8')).toBe('ok\n');
    const overBoundMarker = path.join(workspace, 'over-bound-timeout-command-ran');
    let runtimeAuthorityTraps = 0;
    const inaccessibleRuntime = new Proxy(adversarialRuntime, {
      get() {
        runtimeAuthorityTraps++;
        throw new Error('runtime authority was inspected');
      },
      getOwnPropertyDescriptor() {
        runtimeAuthorityTraps++;
        throw new Error('runtime authority descriptor was inspected');
      },
      getPrototypeOf() {
        runtimeAuthorityTraps++;
        throw new Error('runtime authority prototype was inspected');
      },
      ownKeys() {
        runtimeAuthorityTraps++;
        throw new Error('runtime authority keys were inspected');
      },
    });
    expect(() => runReviewedGitCommand(
      inaccessibleRuntime,
      workspace,
      ['preflight-marker', overBoundMarker],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs + 1,
      },
    )).toThrow(/timeout or output bound is invalid/u);
    expect(runtimeAuthorityTraps).toBe(0);
    expect(existsSync(overBoundMarker)).toBe(false);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 0,
      },
    )).toThrow(/timeout or output bound is invalid/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        requireEmptyStderr: 'yes' as never,
        timeoutMs: 10_000,
      },
    )).toThrow(/stderr policy must be boolean/u);
    const inheritedOptions = Object.assign(
      Object.create({ inherited: true }) as Record<string, unknown>,
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    );
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      inheritedOptions as never,
    )).toThrow(/unreviewed prototype/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: { ...controlledGitEnvironment(), UNREVIEWED: '1' },
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/exact reviewed member set/u);
    const getterEnvironment = controlledGitEnvironment();
    Object.defineProperty(getterEnvironment, 'HOME', {
      enumerable: true,
      get: () => {
        throw new Error('must not execute');
      },
    });
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: getterEnvironment,
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/own data property/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        acceptedStatuses: [0, 0],
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/status set is invalid/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        stdin: 'not bytes' as never,
        timeoutMs: 10_000,
      },
    )).toThrow(/stdin must be one direct Uint8Array or Buffer/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        stdin: new Uint8Array(new SharedArrayBuffer(2)),
        timeoutMs: 10_000,
      },
    )).toThrow(/concurrently mutable shared backing/u);
    class ArrayBufferSubclass extends ArrayBuffer {}
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        stdin: new Uint8Array(new ArrayBufferSubclass(2)),
        timeoutMs: 10_000,
      },
    )).toThrow(/direct fixed ArrayBuffer backing/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        stdin: new Uint8Array(new ResizableArrayBuffer(2, { maxByteLength: 4 })),
        timeoutMs: 10_000,
      },
    )).toThrow(/direct fixed ArrayBuffer backing/u);
    const proxiedStdin = new Proxy(new Uint8Array([0x00, 0xff]), {});
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        stdin: proxiedStdin,
        timeoutMs: 10_000,
      },
    )).toThrow(/stdin (?:must be one direct|cannot be inspected)/u);
    class Uint8ArraySubclass extends Uint8Array {}
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        stdin: new Uint8ArraySubclass([0x00, 0xff]),
        timeoutMs: 10_000,
      },
    )).toThrow(/stdin must be one direct Uint8Array or Buffer/u);
    const getterArguments = ['success'];
    Object.defineProperty(getterArguments, '0', {
      enumerable: true,
      get: () => {
        throw new Error('must not execute');
      },
    });
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      getterArguments,
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/own data property/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['nonzero'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/status 7/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['timeout'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 250,
      },
    )).toThrow(/timeout true/u);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['overflow'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 257,
        timeoutMs: 10_000,
      },
    )).toThrow(/overflow true/u);

    chmodSync(adversarialRuntime.gitExecutable, 0o755);
    expect(() => runReviewedGitCommand(
      adversarialRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/authority changed|differs from its reviewed authority/u);

    chmodSync(controlDriftRuntime.node.authority.executable, 0o755);
    expect(() => runReviewedGitCommand(
      controlDriftRuntime,
      workspace,
      ['success'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/authority changed|differs from its reviewed authority/u);

    expect(() => reviewedGitCommandTesting.disposeWithRemove(
      runtime,
      () => {
        throw new Error('injected removal failure');
      },
    )).toThrow(/injected removal failure/u);
    expect(reviewedGit(
      runtime,
      repository,
      ['status', '--porcelain'],
    ).status).toBe(0);
    disposeReviewedGitRuntime(runtime);
    runtimeDisposed = true;
    expect(() => runReviewedGitCommand(
      runtime,
      workspace,
      ['status', '--porcelain'],
      {
        environment: controlledGitEnvironment(),
        outputLimitBytes: 1024,
        timeoutMs: 10_000,
      },
    )).toThrow(/foreign or already disposed/u);
  }, 180_000);

  it('rejects malformed runtime-acquisition controls before staging', () => {
    if (workspace === '') return;
    expect(() => createReviewedGitRuntime(workspace, {
      unexpected: true,
    } as never)).toThrow(/exact reviewed member set/u);
    expect(() => createReviewedGitRuntime(workspace, {
      gitSourceAuthorityProfile: {
        schema: REVIEWED_GIT_SOURCE_AUTHORITY_PROFILE_SCHEMA,
        kind: 'darwin_selected_developer_tree_git_bytes',
      },
      sourceGitExecutable: adversarialRuntime.gitAcquisition!.executable.sourcePath,
    } as never)).toThrow(/exact reviewed member set/u);
    expect(() => createReviewedGitRuntime(workspace, {
      get sourceNodeCandidates(): readonly string[] {
        throw new Error('must not execute');
      },
    })).toThrow(/own data property/u);
    const inheritedOptions = Object.assign(
      Object.create({ inherited: true }) as Record<string, unknown>,
      { sourceNodeCandidates: [] },
    );
    expect(() => createReviewedGitRuntime(
      workspace,
      inheritedOptions as never,
    )).toThrow(/unreviewed prototype/u);
    expect(() => createReviewedGitRuntime(workspace, {
      sourceGitExecutable: 'git',
    })).toThrow(/absolute normalized pathname/u);
    if (process.platform === 'darwin') {
      expect(() => createReviewedGitRuntime(workspace, {
        sourceGitExecutable: '/usr/bin/git',
      })).toThrow(/xcrun shim/u);
    }
    expect(() => createReviewedGitRuntime('.', {})).toThrow(
      /runtime parent must be an absolute normalized pathname/u,
    );
  }, 60_000);

  it('rejects Bun as a staged Node control runtime', () => {
    if (workspace === '') return;
    const probe = spawnSync('bun', ['--print', 'process.execPath'], {
      encoding: 'utf8',
      env: { LANG: 'C', LC_ALL: 'C', PATH: process.env.PATH ?? '' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10_000,
    });
    expect(probe.status).toBe(0);
    const bunExecutable = realpathSync(probe.stdout.trim());
    expect(() => createReviewedGitRuntime(workspace, {
      sourceNodeCandidates: [bunExecutable],
    })).toThrow(
      /(?:not an exact supported Node|no Node candidate passed staged identity review)/u,
    );
  }, 120_000);
});

describe('production reviewed Git callers', () => {
  it('keeps every production Git caller free of raw process execution', () => {
    for (const relativePath of PRODUCTION_GIT_CALLERS) {
      const source = readFileSync(path.join(ROOT, relativePath), 'utf8');
      expect(source, relativePath).not.toMatch(/(?:node:)?child_process/u);
      expect(source, relativePath).not.toMatch(
        /(?<![.\w])(?:exec|execFile|execFileSync|execSync|spawn|spawnSync)\s*\(/u,
      );
      expect(source, relativePath).not.toMatch(
        /\b(?:Bun\.spawn|Deno\.Command|execa(?:Command)?|process\.getBuiltinModule)\b/u,
      );
      expect(source, relativePath).not.toMatch(/\bBun\.\$/u);
    }
  });
});
