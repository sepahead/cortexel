import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeNewNestExampleInventoryFile } from '../scripts/generate-nest-example-source-inventory.js';
import { canonicalDigest, canonicalize } from '../src/core/canonicalize.js';
import { sha256Digest, utf8ByteLength } from '../src/core/sha256.js';
import {
  buildNestExampleSourceInventory,
  canonicalNestExampleSourceInventory,
  NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
  NEST_EXAMPLE_SOURCE_INVENTORY_V1_PREDECESSOR,
  NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
  NEST_EXAMPLE_RAW_BLOB_REFERENCE_SET_IDENTITY,
  PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
  PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
  PINNED_NEST_EXAMPLE_RAW_BLOB_MAX_BYTE_LENGTH,
  PINNED_NEST_EXAMPLE_RAW_BLOB_REFERENCE_SET_DIGEST,
  PINNED_NEST_EXAMPLE_RAW_BLOB_TOTAL_BYTE_LENGTH,
  PINNED_NEST_EXAMPLE_SHARED_BLOB_GROUPS,
  validateNestExampleSourceInventory,
  verifyNestExampleOfflineAcquisitionContext,
  type NestExampleInventoryAuthority,
} from '../scripts/lib/nest-example-source-inventory.js';
import {
  controlledGitCommandArguments,
  controlledGitEnvironment,
  verifyOfflineGitObjectDatabase,
} from '../scripts/lib/offline-git-object-database.js';
import {
  REVIEWED_POSIX_ACL_INSPECTOR_SHA256,
  requireExactPrivateDirectoryAuthority,
  requireReviewedPosixAclAuthority,
  requireProtectedDirectoryEntryChain,
  type PosixAclSubject,
} from '../scripts/lib/posix-acl-authority.js';

const temporaryDirectories: string[] = [];

function runPatchedNodeFixture(
  root: string,
  name: string,
  source: string,
  arguments_: readonly string[],
): Record<string, unknown> {
  const script = path.join(root, `${name}.mjs`);
  writeFileSync(script, source, 'utf8');
  const result = spawnSync(
    'node',
    ['--import', 'tsx', script, ...arguments_],
    {
      cwd: path.resolve('.'),
      encoding: 'utf8',
      env: {
        LANG: 'C',
        LC_ALL: 'C',
        PATH: process.env.PATH,
      },
      maxBuffer: 64 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15_000,
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function git(repository: string, args: readonly string[]): string {
  const result = spawnSync(
    'git',
    [
      '--no-replace-objects',
      '-c',
      'core.fsmonitor=false',
      '-c',
      'core.untrackedCache=false',
      '-C',
      repository,
      ...args,
    ],
    {
      cwd: repository,
      encoding: 'utf8',
      env: controlledGitEnvironment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(`fixture git ${args[0]} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function fixtureFile(repository: string, relativePath: string, content: string): string {
  const filename = path.join(repository, ...relativePath.split('/'));
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, content, 'utf8');
  return filename;
}

function gitObject(repository: string, commit: string, objectPath: string): {
  gitMode: '100644' | '100755';
  gitBlobSha1: string;
} {
  const line = git(repository, ['ls-tree', commit, '--', objectPath]);
  const match = /^(100644|100755) blob ([0-9a-f]{40})\t/u.exec(line);
  if (!match) throw new Error(`fixture object ${objectPath} is not a regular blob`);
  return {
    gitMode: match[1] as '100644' | '100755',
    gitBlobSha1: match[2]!,
  };
}

interface Fixture {
  readonly root: string;
  readonly repository: string;
  readonly sentinel: string;
  readonly authority: NestExampleInventoryAuthority;
}

function sourceFixture(): Fixture {
  const root = realpathSync(mkdtempSync(
    path.join(tmpdir(), 'cortexel-nest-inventory-test-'),
  ));
  temporaryDirectories.push(root);
  const repository = path.join(root, 'repository');
  const sentinel = path.join(root, 'upstream-executed');
  mkdirSync(repository);
  git(repository, ['init', '--quiet']);
  git(repository, ['config', 'core.symlinks', 'true']);

  const top = fixtureFile(
    repository,
    'pynest/examples/top.py',
    `from pathlib import Path\nPath(${JSON.stringify(sentinel)}).write_text("ran")\n`,
  );
  chmodSync(top, 0o755);
  fixtureFile(repository, 'pynest/examples/doc_only.py', 'print("docs")\n');
  fixtureFile(repository, 'pynest/examples/skipped.py', 'print("skip")\n');
  fixtureFile(repository, 'pynest/examples/group/main.py', 'print("main")\n');
  fixtureFile(repository, 'pynest/examples/group/helper.py', 'HELPER = True\n');
  symlinkSync('main.py', path.join(repository, 'pynest/examples/group/run_example.py'));
  fixtureFile(repository, 'pynest/examples/plain/a.py', 'print("a")\n');
  fixtureFile(repository, 'pynest/examples/plain/b.py', 'print("b")\n');
  fixtureFile(repository, 'pynest/examples/music/nest_script.py', 'print("nest")\n');
  fixtureFile(repository, 'pynest/examples/music/receiver_script.py', 'print("receiver")\n');

  fixtureFile(repository, 'pynest/examples/image.png', 'png fixture\n');
  fixtureFile(repository, 'pynest/examples/group/movie.gif', 'gif fixture\n');
  fixtureFile(repository, 'pynest/examples/plain/diagram.svg', '<svg/>\n');

  fixtureFile(
    repository,
    'doc/htmldoc/examples/index.rst',
    [
      '* :doc:`../auto_examples/doc_only`',
      '* :doc:`../auto_examples/skipped`',
      '* :doc:`../auto_examples/group/main`',
      '* :doc:`../auto_examples/music/nest_script`',
      ':doc:`../auto_examples/plain/index`',
      ':doc:`External <pd14:auto_examples/index>`',
      '',
    ].join('\n'),
  );
  const runner = fixtureFile(
    repository,
    'pynest/examples/run_examples.sh',
    [
      '#!/usr/bin/env bash',
      'find "${sourcedir}/pynest/examples" -maxdepth 1 -type d -not -exec test -e {}/run_example.py \\; -exec find {} -maxdepth 1 -name \'*.py\' \\;',
      'ls "${sourcedir}/pynest/examples"/*/run_example.py',
      'SKIP_LIST="skipped.py nest_script.py receiver_script.py"',
      'export MPLBACKEND=agg',
      'runner="python3"',
      '',
    ].join('\n'),
  );
  chmodSync(runner, 0o755);
  fixtureFile(
    repository,
    'pynest/examples/CMakeLists.txt',
    'install(PROGRAMS run_examples.sh DESTINATION bin)\n',
  );

  git(repository, ['add', '--all']);
  git(repository, [
    '-c',
    'user.name=Cortexel Test',
    '-c',
    'user.email=cortexel@example.invalid',
    'commit',
    '--quiet',
    '-m',
    'fixture',
  ]);
  const commit = git(repository, ['rev-parse', 'HEAD']);
  const rootTreeGitSha1 = git(repository, ['rev-parse', 'HEAD^{tree}']);
  const documentationIndex = gitObject(
    repository,
    commit,
    'doc/htmldoc/examples/index.rst',
  );
  const runnerObject = gitObject(
    repository,
    commit,
    'pynest/examples/run_examples.sh',
  );
  const orchestrationCmake = gitObject(
    repository,
    commit,
    'pynest/examples/CMakeLists.txt',
  );

  const authority: NestExampleInventoryAuthority = {
    project: 'NEST Simulator',
    release: 'fixture',
    repository: 'https://example.invalid/nest.git',
    commit,
    rootTreeGitSha1,
    exampleRoot: 'pynest/examples',
    documentationIndex: {
      path: 'doc/htmldoc/examples/index.rst',
      ...documentationIndex,
      expectedDocDirectiveCount: 6,
      expectedDirectPythonCount: 4,
      expectedGroupTargets: ['plain/index'],
      expectedExternalTargets: ['pd14:auto_examples/index'],
    },
    runner: {
      path: 'pynest/examples/run_examples.sh',
      ...runnerObject,
      pythonCommand: 'python3',
      matplotlibBackend: 'agg',
      skipBasenames: ['skipped.py', 'nest_script.py', 'receiver_script.py'],
      expectedCandidatePathCount: 8,
      expectedExecutedPathCount: 5,
      expectedExecutedCanonicalBodyCount: 5,
    },
    orchestrationCmake: {
      path: 'pynest/examples/CMakeLists.txt',
      ...orchestrationCmake,
    },
    aliases: {
      'pynest/examples/group/run_example.py':
        'pynest/examples/group/main.py',
    },
    coordinatedComponentPaths: [
      'pynest/examples/music/receiver_script.py',
    ],
    expected: {
      pythonPathEntryCount: 10,
      regularPythonFileCount: 9,
      pythonSymlinkCount: 1,
      regularExecutablePythonFileCount: 1,
      regularNonExecutablePythonFileCount: 8,
      canonicalPrimaryBodyCount: 7,
      supportOrCoordinatedBodyCount: 2,
      visualAssetPathEntryCount: 3,
      visualAssetCountsByExtension: {
        png: 1,
        gif: 1,
        svg: 1,
      },
      exampleTreeLeafCount: 15,
      uniqueExampleTreeGitBlobCount: 15,
      auxiliaryLeafCount: 2,
      auxiliaryLeafCountsByRole: {
        build_orchestration: 1,
        documentation: 0,
        example_input: 0,
        runner_orchestration: 1,
      },
      sharedGitBlobGroups: [],
    },
  };
  rmSync(path.join(repository, '.git', 'index'));
  return { root, repository, sentinel, authority };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('pinned NEST official-example source authority', () => {
  it('binds the exact upstream commit, trees, selector blobs, aliases, and counts', () => {
    expect(NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE).toEqual({
      schema: 'cortexel-source-inventory-acquisition-producer-profile.v1',
      producer: 'scripts/generate-nest-example-source-inventory.ts',
      profile:
        'cortexel.nest-example.git-sha1-blobless-structural-137-example-leaves-162-example-unique-blobs-159-acquired-unique-blobs-160-raw-https-selected-reviewed-posix-offline-batch-canonical-object-rehash.v6',
      harnessRevision: 6,
      executionEvidence:
        'profile_declaration_not_independent_execution_receipt',
    });
    expect(NEST_EXAMPLE_RAW_BLOB_REFERENCE_SET_IDENTITY).toBe(
      'cortexel.nest-example.raw-git-blob-reference-set.v1',
    );
    expect(PINNED_NEST_EXAMPLE_RAW_BLOB_REFERENCE_SET_DIGEST).toBe(
      'sha256:1c26fad63f624d1e1b1f859ffba5f6b3a5517e89a9992c9517ea2998a50d7a89',
    );
    expect(PINNED_NEST_EXAMPLE_RAW_BLOB_TOTAL_BYTE_LENGTH).toBe(19_427_499);
    expect(PINNED_NEST_EXAMPLE_RAW_BLOB_MAX_BYTE_LENGTH).toBe(6_339_219);
    expect(PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY).toMatchObject({
      repository: 'https://github.com/nest/nest-simulator.git',
      commit: 'acca9704da248750219a027db99fec6cd1f9052a',
      rootTreeGitSha1: '7f6f4f0407c4000cded433b86d658191dd82cd79',
      documentationIndex: {
        path: 'doc/htmldoc/examples/index.rst',
        gitMode: '100644',
        gitBlobSha1: '2965669bd03f128478fa107779485ad5934b73c5',
        expectedDocDirectiveCount: 94,
        expectedDirectPythonCount: 90,
      },
      runner: {
        path: 'pynest/examples/run_examples.sh',
        gitMode: '100755',
        gitBlobSha1: '6b36df9dd356a419e12aa477b0d05611111052f7',
        expectedCandidatePathCount: 98,
        expectedExecutedPathCount: 92,
        expectedExecutedCanonicalBodyCount: 92,
      },
      expected: {
        pythonPathEntryCount: 112,
        regularPythonFileCount: 109,
        pythonSymlinkCount: 3,
        canonicalPrimaryBodyCount: 98,
        supportOrCoordinatedBodyCount: 11,
        visualAssetPathEntryCount: 12,
        exampleTreeLeafCount: 162,
        uniqueExampleTreeGitBlobCount: 159,
        auxiliaryLeafCount: 38,
      },
    });
    expect(PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.aliases).toEqual({
      'pynest/examples/EI_clustered_network/run_example.py':
        'pynest/examples/EI_clustered_network/run_simulation.py',
      'pynest/examples/pong/run_example.py':
        'pynest/examples/pong/run_simulations.py',
      'pynest/examples/sudoku/run_example.py':
        'pynest/examples/sudoku/sudoku_solver.py',
    });
    expect(PINNED_NEST_EXAMPLE_SHARED_BLOB_GROUPS).toEqual([{
      gitBlobSha1: '2c63c0851048d8f7bff41ecf0f8cee05f52fd120',
      paths: [
        'pynest/examples/sonata_example/300_pointneurons/components/synaptic_models/ExcToExc.json',
        'pynest/examples/sonata_example/300_pointneurons/components/synaptic_models/ExcToInh.json',
        'pynest/examples/sonata_example/300_pointneurons/components/synaptic_models/InhToExc.json',
        'pynest/examples/sonata_example/300_pointneurons/components/synaptic_models/InhToInh.json',
      ],
    }]);
  });

  it('validates the exact checked-in semantic inventory and rejects evidence transfer', () => {
    const inventory = JSON.parse(readFileSync(
      path.resolve('docs/audit/nest-example-source-inventory.v2.json'),
      'utf8',
    ));
    expect(inventory.inventoryDigest).toBe(
      PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
    );
    expect(inventory.protocolVersion).toBe(2);
    expect(inventory.identityAlgorithm).toBe(
      'cortexel-nest-example-source-inventory.rfc8785-sha256.v2',
    );
    expect(inventory.predecessor).toEqual(
      NEST_EXAMPLE_SOURCE_INVENTORY_V1_PREDECESSOR,
    );
    expect(inventory.acquisition.producerProfile).toEqual(
      NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
    );
    expect(validateNestExampleSourceInventory(inventory)).toEqual([]);
    expect(inventory.invocationProfiles).toHaveLength(92);
    const completeLeaves = [
      ...inventory.sourcePaths,
      ...inventory.visualAssets,
      ...inventory.auxiliaryLeaves,
    ];
    expect(completeLeaves).toHaveLength(162);
    expect(new Set(completeLeaves.map(({ path: leafPath }: { path: string }) =>
      leafPath)).size).toBe(162);
    expect(new Set(completeLeaves.map(
      ({ gitBlobSha1 }: { gitBlobSha1: string }) => gitBlobSha1,
    )).size).toBe(159);
    expect(
      inventory.invocationProfiles.every(
        ({ profile }: { profile: string }) => profile === 'runner_agg_default',
      ),
    ).toBe(true);

    const inventedDocumentationInvocation = structuredClone(inventory);
    inventedDocumentationInvocation.invocationProfiles[0].profile =
      'documentation_reference';
    expect(
      validateNestExampleSourceInventory(inventedDocumentationInvocation),
    ).toEqual(expect.arrayContaining([
      expect.stringContaining('non-executable documentation selector'),
    ]));

    const missingAuxiliary = structuredClone(inventory);
    missingAuxiliary.auxiliaryLeaves.pop();
    const { inventoryDigest: _missingAuxiliaryDigest, ...missingAuxiliaryCore } =
      missingAuxiliary;
    missingAuxiliary.inventoryDigest = canonicalDigest({
      domain: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
      inventory: missingAuxiliaryCore,
    });
    expect(validateNestExampleSourceInventory(missingAuxiliary)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('exact disjoint 162-leaf/159-blob denominator'),
      ]),
    );

    const repeatedIdentity = completeLeaves.find(
      (leaf: { gitBlobSha1: string }, index: number) =>
        completeLeaves.findIndex((candidate: { gitBlobSha1: string }) =>
          candidate.gitBlobSha1 === leaf.gitBlobSha1) !== index,
    )!;
    const inconsistentDuplicate = structuredClone(inventory);
    const duplicateRow = [
      ...inconsistentDuplicate.sourcePaths,
      ...inconsistentDuplicate.visualAssets,
      ...inconsistentDuplicate.auxiliaryLeaves,
    ].find((leaf: { gitBlobSha1: string; path: string }) =>
      leaf.gitBlobSha1 === repeatedIdentity.gitBlobSha1 &&
      leaf.path !== repeatedIdentity.path)!;
    duplicateRow.sha256 = `sha256:${'0'.repeat(64)}`;
    const { inventoryDigest: _duplicateDigest, ...duplicateCore } =
      inconsistentDuplicate;
    inconsistentDuplicate.inventoryDigest = canonicalDigest({
      domain: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
      inventory: duplicateCore,
    });
    expect(validateNestExampleSourceInventory(inconsistentDuplicate)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sharing its Git blob identity'),
      ]),
    );

    const driftedSource = structuredClone(inventory);
    driftedSource.sourcePaths[0].path = 'pynest/examples/invented.py';
    expect(validateNestExampleSourceInventory(driftedSource)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('digest does not bind'),
        expect.stringContaining('mismatched identity'),
      ]),
    );

    const historicalUnprofiled = structuredClone(inventory);
    delete historicalUnprofiled.acquisition.producerProfile;
    const { inventoryDigest: _historicalDigest, ...historicalCore } =
      historicalUnprofiled;
    historicalUnprofiled.inventoryDigest = canonicalDigest({
      domain: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
      inventory: historicalCore,
    });
    expect(validateNestExampleSourceInventory(historicalUnprofiled)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('closed acquisition producer profile'),
      ]),
    );

    const unsupportedProfile = structuredClone(inventory);
    unsupportedProfile.acquisition.producerProfile.harnessRevision = 7;
    const { inventoryDigest: _unsupportedDigest, ...unsupportedCore } =
      unsupportedProfile;
    unsupportedProfile.inventoryDigest = canonicalDigest({
      domain: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
      inventory: unsupportedCore,
    });
    expect(validateNestExampleSourceInventory(unsupportedProfile)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('closed acquisition producer profile'),
      ]),
    );

    const evidenceTransfer = structuredClone(inventory);
    evidenceTransfer.predecessor.evidenceTransfer = 'all';
    const { inventoryDigest: _transferDigest, ...transferCore } = evidenceTransfer;
    evidenceTransfer.inventoryDigest = canonicalDigest({
      domain: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
      inventory: transferCore,
    });
    expect(validateNestExampleSourceInventory(evidenceTransfer)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('transferred evidence'),
      ]),
    );

    const historicalV1Raw = readFileSync(
      path.resolve('docs/audit/nest-example-source-inventory.v1.json'),
      'utf8',
    );
    const historicalV1 = JSON.parse(historicalV1Raw);
    expect(utf8ByteLength(historicalV1Raw)).toBe(196576);
    expect(sha256Digest(historicalV1Raw)).toBe(
      'sha256:1d762db8c60e174f42371308093c0d091937bde2299ed8cfce4217c9e9179c1a',
    );
    expect(historicalV1.inventoryDigest).toBe(
      'sha256:cd59e82a8eb5af6d482d3042afdf91b0793865aef75843f5b10da6ee61ba3fe6',
    );
    expect(historicalV1.acquisition).not.toHaveProperty('producerProfile');
    expect(validateNestExampleSourceInventory(historicalV1)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('closed V2 identity'),
        expect.stringContaining('closed acquisition producer profile'),
      ]),
    );
  });
});

describe('offline NEST official-example source inventory', () => {
  it('publishes generated audit bytes exclusively without clobbering any entry', () => {
    const root = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-audit-publication-test-'),
    ));
    temporaryDirectories.push(root);
    const target = path.join(root, 'inventory.json');
    let contentTrapCount = 0;
    const trappedContent = new Proxy(Object.create(null) as object, {
      get: () => {
        contentTrapCount += 1;
        throw new Error('must not execute');
      },
    });
    expect(() => writeNewNestExampleInventoryFile(
      target,
      trappedContent as never,
    )).toThrow(/primitive bounded strings/u);
    expect(contentTrapCount).toBe(0);
    expect(existsSync(target)).toBe(false);
    expect(() => writeNewNestExampleInventoryFile(
      path.join(root, 'a'.repeat(4_097)),
      '{}',
    )).toThrow(/primitive bounded strings/u);
    expect(() => writeNewNestExampleInventoryFile(
      path.join(root, 'missing', 'oversized.json'),
      'a'.repeat(16 * 1024 * 1024 + 1),
    )).toThrow(/primitive bounded strings/u);

    writeNewNestExampleInventoryFile(target, '{"exact":true}');
    expect(readFileSync(target, 'utf8')).toBe('{"exact":true}');
    expect(lstatSync(target).mode & 0o777).toBe(0o644);
    expect(() => writeNewNestExampleInventoryFile(
      target,
      '{"clobbered":true}',
    )).toThrow(/already exists as a filesystem entry/u);
    expect(readFileSync(target, 'utf8')).toBe('{"exact":true}');

    const danglingTarget = path.join(root, 'dangling.json');
    symlinkSync(path.join(root, 'missing'), danglingTarget);
    expect(() => writeNewNestExampleInventoryFile(
      danglingTarget,
      '{"unexpected":true}',
    )).toThrow(/already exists as a filesystem entry/u);

    const directParent = path.join(root, 'direct-parent');
    mkdirSync(directParent);
    mkdirSync(path.join(directParent, 'nested'));
    const linkedParent = path.join(root, 'linked-parent');
    symlinkSync(directParent, linkedParent, 'dir');
    expect(() => writeNewNestExampleInventoryFile(
      path.join(linkedParent, 'nested', 'escaped.json'),
      '{"unexpected":true}',
    )).toThrow(/must not traverse a symbolic link/u);
    expect(existsSync(path.join(directParent, 'nested', 'escaped.json'))).toBe(false);

    const writableAncestor = path.join(root, 'writable-ancestor');
    const protectedChild = path.join(writableAncestor, 'protected-child');
    mkdirSync(writableAncestor, { mode: 0o700 });
    mkdirSync(protectedChild, { mode: 0o700 });
    chmodSync(writableAncestor, 0o777);
    expect(() => requireProtectedDirectoryEntryChain(
      protectedChild,
      'non-sticky writable ancestor fixture',
    )).toThrow(/writable without sticky entry protection/u);
    expect(() => writeNewNestExampleInventoryFile(
      path.join(protectedChild, 'unsafe-ancestor.json'),
      '{"unexpected":true}',
    )).toThrow(/writable without sticky entry protection/u);
    expect(existsSync(path.join(protectedChild, 'unsafe-ancestor.json'))).toBe(false);

    const stickyModeResult = spawnSync(
      '/bin/chmod',
      ['1777', writableAncestor],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    expect(stickyModeResult.error).toBeUndefined();
    expect(stickyModeResult.status, stickyModeResult.stderr).toBe(0);
    expect(lstatSync(writableAncestor).mode & 0o7777).toBe(0o1777);
    requireProtectedDirectoryEntryChain(
      protectedChild,
      'sticky writable ancestor fixture',
    );
    const stickyTarget = path.join(protectedChild, 'sticky-protected.json');
    writeNewNestExampleInventoryFile(stickyTarget, '{"exact":true}');
    expect(readFileSync(stickyTarget, 'utf8')).toBe('{"exact":true}');

    if (process.platform === 'darwin') {
      const aclParent = path.join(root, 'acl-parent');
      mkdirSync(aclParent);
      const aclResult = spawnSync(
        '/bin/chmod',
        [
          '+a',
          'group:everyone allow list,search,readattr,readextattr,readsecurity',
          aclParent,
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      expect(aclResult.error).toBeUndefined();
      expect(aclResult.status, aclResult.stderr).toBe(0);
      expect(() => writeNewNestExampleInventoryFile(
        path.join(aclParent, 'acl-inherited.json'),
        '{"unexpected":true}',
      )).toThrow(/extended ACL/u);
      expect(existsSync(path.join(aclParent, 'acl-inherited.json'))).toBe(false);
    }
  }, 30_000);

  it('fails closed across no-clobber, post-link, and ambiguous-close faults', () => {
    if (process.platform === 'win32') return;
    const root = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-audit-publication-faults-'),
    ));
    temporaryDirectories.push(root);
    const modulePath = path.resolve('scripts/lib/exclusive-audit-publication.ts');
    const fixtureSource = String.raw`
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      import { pathToFileURL } from 'node:url';

      const [mode, root, modulePath] = process.argv.slice(2);
      const target = fs.realpathSync(root) + '/inventory-' + mode + '.json';
      const originalLink = fs.linkSync;
      const originalFsync = fs.fsyncSync;
      const originalClose = fs.closeSync;
      const originalFstat = fs.fstatSync;
      const originalLstat = fs.lstatSync;
      const closeCalls = [];
      let injectedClose = false;
      let linkAttempted = false;

      if (mode === 'link') {
        fs.linkSync = (source, destination) => {
          fs.writeFileSync(destination, 'foreign', { mode: 0o644 });
          return originalLink(source, destination);
        };
      } else if (mode === 'ambiguous-link') {
        fs.linkSync = (source, destination) => {
          originalLink(source, destination);
          throw new Error('injected ambiguous hard-link completion');
        };
      } else if (mode === 'target-uncertain') {
        fs.linkSync = () => {
          linkAttempted = true;
          throw new Error('injected hard-link failure');
        };
        fs.lstatSync = (filename, ...args) => {
          if (filename === target && linkAttempted) {
            const error = new Error('injected target inspection failure');
            error.code = 'EACCES';
            throw error;
          }
          return originalLstat(filename, ...args);
        };
      } else if (mode === 'fsync') {
        fs.fsyncSync = (descriptor) => {
          if (fs.existsSync(target)) throw new Error('injected parent fsync failure');
          return originalFsync(descriptor);
        };
      } else if (mode === 'close') {
        fs.closeSync = (descriptor) => {
          if (fs.existsSync(target)) {
            const descriptorStat = originalFstat(descriptor, { bigint: true });
            const targetStat = originalLstat(target, { bigint: true });
            const parentStat = originalLstat(root, { bigint: true });
            const isPublicationDescriptor =
              (descriptorStat.dev === targetStat.dev && descriptorStat.ino === targetStat.ino) ||
              (descriptorStat.dev === parentStat.dev && descriptorStat.ino === parentStat.ino);
            if (isPublicationDescriptor) {
              closeCalls.push(descriptor);
              originalClose(descriptor);
              if (!injectedClose) {
                injectedClose = true;
                throw new Error('injected ambiguous close failure');
              }
              return;
            }
          }
          return originalClose(descriptor);
        };
      } else {
        throw new Error('unknown fixture mode');
      }
      syncBuiltinESMExports();
      const { publishNewExclusiveAuditFile } = await import(
        pathToFileURL(modulePath).href + '?fault=' + mode + '-' + Date.now()
      );
      let message = '';
      try {
        publishNewExclusiveAuditFile(target, '{"exact":true}');
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      if (!message) throw new Error('fault did not fail publication');
      const names = fs.readdirSync(root);
      if (names.some((entry) => entry.includes('.cortexel-') && entry.endsWith('.tmp'))) {
        throw new Error('owned staging entry survived cleanup');
      }
      if (mode === 'link') {
        if (fs.readFileSync(target, 'utf8') !== 'foreign') {
          throw new Error('foreign no-clobber target changed');
        }
      } else if (mode === 'target-uncertain') {
        if (fs.existsSync(target)) {
          throw new Error('target-inspection fixture unexpectedly created a target');
        }
        if (!message.includes('inspect target manually')) {
          throw new Error('uncertain target absence did not require manual inspection');
        }
      } else {
        if (fs.readFileSync(target, 'utf8') !== '{"exact":true}') {
          throw new Error('published target bytes changed after target creation');
        }
        if (!message.includes('inspect target manually')) {
          throw new Error('post-link failure did not require manual inspection');
        }
      }
      if (mode === 'close') {
        if (closeCalls.length !== 2 || new Set(closeCalls).size !== 2) {
          throw new Error('publication did not close both descriptors exactly once');
        }
      }
      process.stdout.write(JSON.stringify({ message, closeCalls }));
    `;

    const link = runPatchedNodeFixture(
      root,
      'link-fault',
      fixtureSource,
      ['link', root, modulePath],
    );
    expect(link.message).toMatch(/EEXIST|exist/u);
    expect(link.message).toMatch(/inspect target manually/u);
    const ambiguousLink = runPatchedNodeFixture(
      root,
      'ambiguous-link-fault',
      fixtureSource,
      ['ambiguous-link', root, modulePath],
    );
    expect(ambiguousLink.message).toMatch(/inspect target manually/u);
    const targetUncertain = runPatchedNodeFixture(
      root,
      'target-uncertain-fault',
      fixtureSource,
      ['target-uncertain', root, modulePath],
    );
    expect(targetUncertain.message).toMatch(/inspect target manually/u);
    const fsync = runPatchedNodeFixture(
      root,
      'fsync-fault',
      fixtureSource,
      ['fsync', root, modulePath],
    );
    expect(fsync.message).toMatch(/inspect target manually/u);
    const close = runPatchedNodeFixture(
      root,
      'close-fault',
      fixtureSource,
      ['close', root, modulePath],
    );
    expect(close.closeCalls).toHaveLength(2);
  }, 60_000);

  it('attempts every ancestor close after one ambiguous close result', () => {
    if (process.platform === 'win32') return;
    const root = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-acl-cleanup-fault-'),
    ));
    temporaryDirectories.push(root);
    const modulePath = path.resolve('scripts/lib/posix-acl-authority.ts');
    const result = runPatchedNodeFixture(
      root,
      'acl-close-fault',
      String.raw`
        import fs from 'node:fs';
        import { syncBuiltinESMExports } from 'node:module';
        import { pathToFileURL } from 'node:url';

        const [root, modulePath] = process.argv.slice(2);
        const originalClose = fs.closeSync;
        const originalFstat = fs.fstatSync;
        const directoryCloses = [];
        let injected = false;
        fs.closeSync = (descriptor) => {
          const descriptorStat = originalFstat(descriptor);
          if (descriptorStat.isDirectory()) {
            directoryCloses.push(descriptor);
            originalClose(descriptor);
            if (!injected) {
              injected = true;
              throw new Error('injected ambiguous ancestor close');
            }
            return;
          }
          return originalClose(descriptor);
        };
        syncBuiltinESMExports();
        const { requireProtectedDirectoryEntryChain } = await import(
          pathToFileURL(modulePath).href + '?close-fault=' + Date.now()
        );
        let message = '';
        try {
          requireProtectedDirectoryEntryChain(root, 'close fault fixture');
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }
        if (!message.includes('cleanup is uncertain')) {
          throw new Error('ambiguous ancestor close did not fail closed');
        }
        if (directoryCloses.length < 2 || new Set(directoryCloses).size !== directoryCloses.length) {
          throw new Error('ancestor descriptors were not each closed exactly once');
        }
        process.stdout.write(JSON.stringify({ message, directoryCloses }));
      `,
      [root, modulePath],
    );
    expect(result.directoryCloses).toEqual(expect.any(Array));
    expect((result.directoryCloses as unknown[]).length).toBeGreaterThan(1);
  }, 30_000);

  it('bounds directory authority inputs and aggregates exact-directory operation and close faults', () => {
    let trapCount = 0;
    const hostile = new Proxy(Object.create(null) as object, {
      get: () => {
        trapCount += 1;
        throw new Error('must not execute');
      },
      getPrototypeOf: () => {
        trapCount += 1;
        throw new Error('must not execute');
      },
    });
    expect(() => requireProtectedDirectoryEntryChain(
      hostile as never,
      'hostile directory control',
    )).toThrow(/bounded primitive strings/u);
    expect(() => requireExactPrivateDirectoryAuthority(
      path.resolve('/'),
      hostile as never,
    )).toThrow(/bounded primitive strings/u);
    expect(trapCount).toBe(0);
    expect(() => requireProtectedDirectoryEntryChain(
      'a'.repeat(4_097),
      'oversized directory control',
    )).toThrow(/bounded primitive strings/u);
    expect(() => requireProtectedDirectoryEntryChain(
      `/${'é'.repeat(3_000)}`,
      'oversized UTF-8 directory control',
    )).toThrow(/bounded primitive strings/u);
    expect(() => requireProtectedDirectoryEntryChain(
      path.resolve('/'),
      'a'.repeat(129),
    )).toThrow(/bounded primitive strings/u);
    expect(() => requireProtectedDirectoryEntryChain(
      path.resolve('/'),
      'é'.repeat(100),
    )).toThrow(/bounded primitive strings/u);

    if (process.platform === 'win32') return;
    const root = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-exact-directory-close-fault-'),
    ));
    temporaryDirectories.push(root);
    const modulePath = path.resolve('scripts/lib/posix-acl-authority.ts');
    const result = runPatchedNodeFixture(
      root,
      'exact-directory-close-fault',
      String.raw`
        import fs from 'node:fs';
        import { syncBuiltinESMExports } from 'node:module';
        import { pathToFileURL } from 'node:url';

        const [root, modulePath] = process.argv.slice(2);
        const originalClose = fs.closeSync;
        const originalFstat = fs.fstatSync;
        const originalOpen = fs.openSync;
        let rootOpenCount = 0;
        let finalDescriptor = null;
        let operationInjected = false;
        const closeAttempts = [];
        fs.openSync = (filename, ...args) => {
          const descriptor = originalOpen(filename, ...args);
          if (filename === root) {
            rootOpenCount += 1;
            if (rootOpenCount === 2) finalDescriptor = descriptor;
          }
          return descriptor;
        };
        fs.fstatSync = (descriptor, ...args) => {
          if (descriptor === finalDescriptor && !operationInjected) {
            operationInjected = true;
            throw new Error('injected exact-directory operation failure');
          }
          return originalFstat(descriptor, ...args);
        };
        fs.closeSync = (descriptor) => {
          if (descriptor === finalDescriptor) {
            closeAttempts.push(descriptor);
            originalClose(descriptor);
            throw new Error('injected ambiguous exact-directory close');
          }
          return originalClose(descriptor);
        };
        syncBuiltinESMExports();
        const { requireExactPrivateDirectoryAuthority } = await import(
          pathToFileURL(modulePath).href + '?exact-close-fault=' + Date.now()
        );
        let observed;
        try {
          requireExactPrivateDirectoryAuthority(root, 'exact directory fault fixture');
          throw new Error('fault injection unexpectedly succeeded');
        } catch (error) {
          observed = {
            aggregate: error instanceof AggregateError,
            errors: error instanceof AggregateError
              ? error.errors.map((entry) => entry instanceof Error ? entry.message : String(entry))
              : [],
            message: error instanceof Error ? error.message : String(error),
          };
        }
        if (!operationInjected) throw new Error('operation fault was not reached');
        if (closeAttempts.length !== 1 || new Set(closeAttempts).size !== 1) {
          throw new Error('ambiguous exact-directory close was retried');
        }
        process.stdout.write(JSON.stringify({ ...observed, closeAttempts }));
      `,
      [root, modulePath],
    );
    expect(result).toEqual({
      aggregate: true,
      closeAttempts: [expect.any(Number)],
      errors: [
        'injected exact-directory operation failure',
        'exact directory fault fixture descriptor close is uncertain',
      ],
      message:
        'exact directory fault fixture inspection failed and descriptor cleanup is uncertain',
    });
  }, 30_000);

  it('removes ambient Git repository, config, template, helper, and trace injection', () => {
    const injected = {
      GIT_DIR: '/injected/repository',
      GIT_CONFIG_PARAMETERS: "'core.hooksPath'='/injected/hooks'",
      GIT_CONFIG_KEY_0: 'core.hooksPath',
      GIT_CONFIG_VALUE_0: '/injected/hooks',
      GIT_TEMPLATE_DIR: '/injected/template',
      GIT_EXEC_PATH: '/injected/helpers',
      GIT_TRACE2: '/injected/trace',
      GIT_CURL_VERBOSE: '1',
    } as const;
    const previous = Object.fromEntries(
      Object.keys(injected).map((name) => [name, process.env[name]]),
    );
    try {
      Object.assign(process.env, injected);
      const environment = controlledGitEnvironment();
      for (const name of Object.keys(injected)) {
        expect(environment[name]).toBeUndefined();
      }
      expect(environment).toMatchObject({
        HOME: '/dev/null',
        LANG: 'C',
        LC_ALL: 'C',
        PATH: '/usr/bin:/bin',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_COUNT: '0',
        GIT_NO_REPLACE_OBJECTS: '1',
        GIT_TERMINAL_PROMPT: '0',
      });
      expect(Object.keys(environment).sort()).toEqual([
        'GIT_ALLOW_PROTOCOL',
        'GIT_ATTR_NOSYSTEM',
        'GIT_CONFIG_COUNT',
        'GIT_CONFIG_GLOBAL',
        'GIT_CONFIG_NOSYSTEM',
        'GIT_LFS_SKIP_SMUDGE',
        'GIT_NO_REPLACE_OBJECTS',
        'GIT_OPTIONAL_LOCKS',
        'GIT_PROTOCOL_FROM_USER',
        'GIT_TERMINAL_PROMPT',
        'HOME',
        'LANG',
        'LC_ALL',
        'PATH',
      ]);
      expect(controlledGitEnvironment('/controlled/empty-home').HOME).toBe(
        '/controlled/empty-home',
      );
      expect(() => controlledGitEnvironment('relative/home')).toThrow(
        /must be absolute/u,
      );

      const fetchArguments = controlledGitCommandArguments(
        '/controlled/repository',
        ['fetch', '--quiet', 'origin', 'deadbeef'],
        '/controlled/empty-hooks',
      );
      expect(Object.isFrozen(fetchArguments)).toBe(true);
      expect(fetchArguments).toEqual([
        '--no-replace-objects',
        '-c', 'core.fsmonitor=false',
        '-c', 'core.untrackedCache=false',
        '-c', 'core.ignoreStat=false',
        '-c', 'maintenance.auto=false',
        '-c', 'maintenance.autoDetach=false',
        '-c', 'gc.auto=0',
        '-c', 'gc.autoDetach=false',
        '-c', 'core.hooksPath=/controlled/empty-hooks',
        '-C', '/controlled/repository',
        'fetch', '--no-auto-maintenance', '--quiet', 'origin', 'deadbeef',
      ]);
      expect(() => controlledGitCommandArguments(
        '/controlled/repository',
        ['fetch', '--auto-maintenance', 'origin'],
      )).toThrow(/owns the auto-maintenance option/u);
      expect(() => controlledGitCommandArguments(
        '/controlled/repository',
        ['fetch', '--auto-gc', 'origin'],
      )).toThrow(/owns the auto-maintenance option/u);
    } finally {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  it('rejects malformed ACL inspection subjects before invoking the helper', () => {
    const absolutePath = path.resolve('/');
    const oversizedSubjects: PosixAclSubject[] = [];
    oversizedSubjects.length = 0xffff_ffff;
    const originalGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
    let oversizedSubjectsEnumerated = false;
    Object.defineProperty(Object, 'getOwnPropertyDescriptors', {
      configurable: true,
      value: (value: object) => {
        if (value === oversizedSubjects) {
          oversizedSubjectsEnumerated = true;
          throw new Error('oversized subjects must be rejected before enumeration');
        }
        return originalGetOwnPropertyDescriptors(value);
      },
      writable: true,
    });
    try {
      expect(() => requireReviewedPosixAclAuthority(
        oversizedSubjects,
      )).toThrow(/outside their bound/u);
    } finally {
      Object.defineProperty(Object, 'getOwnPropertyDescriptors', {
        configurable: true,
        value: originalGetOwnPropertyDescriptors,
        writable: true,
      });
    }
    expect(oversizedSubjectsEnumerated).toBe(false);

    let proxyTrapCount = 0;
    const proxiedSubject = new Proxy({
      kind: 'path' as const,
      label: 'proxy control',
      value: absolutePath,
    }, {
      getPrototypeOf: () => {
        proxyTrapCount += 1;
        throw new Error('must not execute');
      },
    });
    expect(() => requireReviewedPosixAclAuthority([
      proxiedSubject,
    ])).toThrow(/not an ordinary object/u);
    expect(proxyTrapCount).toBe(0);

    const proxiedSubjects = new Proxy([{
      kind: 'path' as const,
      label: 'array proxy control',
      value: absolutePath,
    }], {
      getPrototypeOf: () => {
        proxyTrapCount += 1;
        throw new Error('must not execute');
      },
    });
    expect(() => requireReviewedPosixAclAuthority(
      proxiedSubjects,
    )).toThrow(/direct array/u);
    expect(proxyTrapCount).toBe(0);

    const accessorSubjects: PosixAclSubject[] = [];
    Object.defineProperty(accessorSubjects, '0', {
      enumerable: true,
      get: () => {
        throw new Error('must not execute');
      },
    });
    Object.defineProperty(accessorSubjects, 'length', { value: 1 });
    expect(() => requireReviewedPosixAclAuthority(
      accessorSubjects,
    )).toThrow(/own data member/u);

    expect(() => requireReviewedPosixAclAuthority([{
      kind: 'path',
      label: 'extra-key control',
      value: absolutePath,
      extra: true,
    }] as never)).toThrow(/unexpected keys/u);
    expect(() => requireReviewedPosixAclAuthority([{
      kind: 'path',
      label: 'accessor control',
      get value(): string {
        throw new Error('must not execute');
      },
    }])).toThrow(/not an exact data record/u);

    let extraAccessorCount = 0;
    const extraAccessor = {
      kind: 'path' as const,
      label: 'extra accessor control',
      value: absolutePath,
    };
    Object.defineProperty(extraAccessor, 'unexpected', {
      enumerable: true,
      get: () => {
        extraAccessorCount += 1;
        throw new Error('must not execute');
      },
    });
    expect(() => requireReviewedPosixAclAuthority([
      extraAccessor,
    ])).toThrow(/unexpected keys/u);
    expect(extraAccessorCount).toBe(0);
    expect(() => requireReviewedPosixAclAuthority([{
      kind: 'path',
      label: 'relative-path control',
      value: 'relative/path',
    }])).toThrow(/invalid path/u);
    expect(() => requireReviewedPosixAclAuthority([{
      kind: 'path',
      label: 'oversized-path control',
      value: `/${'a'.repeat(4_097)}`,
    }])).toThrow(/invalid path/u);
    expect(() => requireReviewedPosixAclAuthority([{
      kind: 'path',
      label: 'oversized UTF-8 path control',
      value: `/${'é'.repeat(3_000)}`,
    }])).toThrow(/invalid path/u);
    expect(() => requireReviewedPosixAclAuthority([{
      kind: 'descriptor',
      label: 'invalid-descriptor control',
      value: -1,
    }])).toThrow(/invalid descriptor/u);
  });

  it('rejects oversized ACL keys and UTF-8 labels before semantic lookup or helper execution', () => {
    const oversizedKey = 'oversized-enumerable-accessor-'.repeat(160);
    let oversizedGetterCalls = 0;
    let oversizedHasOwnCalls = 0;
    const subject = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(subject, oversizedKey, {
      enumerable: true,
      get: () => {
        oversizedGetterCalls += 1;
        throw new Error('must not execute');
      },
    });
    Object.defineProperties(subject, {
      kind: { enumerable: true, value: 'path' },
      label: { enumerable: true, value: 'oversized key control' },
      value: { enumerable: true, value: path.resolve('/') },
    });
    const originalHasOwn = Object.hasOwn;
    Object.defineProperty(Object, 'hasOwn', {
      configurable: true,
      value: (value: object, key: PropertyKey): boolean => {
        if (value === subject && key === oversizedKey) {
          oversizedHasOwnCalls += 1;
          throw new Error('must not inspect oversized key ownership');
        }
        return originalHasOwn(value, key);
      },
      writable: true,
    });
    try {
      expect(() => requireReviewedPosixAclAuthority([
        subject as never,
      ])).toThrow(/unexpected keys/u);
    } finally {
      Object.defineProperty(Object, 'hasOwn', {
        configurable: true,
        value: originalHasOwn,
        writable: true,
      });
    }
    expect(oversizedGetterCalls).toBe(0);
    expect(oversizedHasOwnCalls).toBe(0);

    const root = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-acl-label-bound-'),
    ));
    temporaryDirectories.push(root);
    const result = runPatchedNodeFixture(
      root,
      'acl-label-bound',
      String.raw`
        import childProcess from 'node:child_process';
        import { syncBuiltinESMExports } from 'node:module';
        import { pathToFileURL } from 'node:url';

        const [modulePath] = process.argv.slice(2);
        const originalSpawn = childProcess.spawnSync;
        let helperSpawnCalls = 0;
        childProcess.spawnSync = (...args) => {
          helperSpawnCalls += 1;
          return originalSpawn(...args);
        };
        syncBuiltinESMExports();
        const { requireReviewedPosixAclAuthority } = await import(
          pathToFileURL(modulePath).href + '?label-bound=' + Date.now()
        );

        const multibyteLabel = 'é'.repeat(65);
        const codeUnitOversizedLabel = 'a'.repeat(129);
        const originalByteLength = Buffer.byteLength;
        let multibyteScans = 0;
        let codeUnitOversizedScans = 0;
        Buffer.byteLength = (value, ...args) => {
          if (value === multibyteLabel) multibyteScans += 1;
          if (value === codeUnitOversizedLabel) codeUnitOversizedScans += 1;
          return originalByteLength(value, ...args);
        };
        const messages = [];
        try {
          for (const label of [multibyteLabel, codeUnitOversizedLabel]) {
            try {
              requireReviewedPosixAclAuthority([{
                kind: 'path',
                label,
                value: '/',
              }]);
              throw new Error('oversized label unexpectedly reached the helper');
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              if (!message.includes('invalid label')) throw error;
              messages.push(message);
            }
          }
        } finally {
          Buffer.byteLength = originalByteLength;
        }
        process.stdout.write(JSON.stringify({
          codeUnitOversizedScans,
          helperSpawnCalls,
          messages,
          multibyteScans,
        }));
      `,
      [path.resolve('scripts/lib/posix-acl-authority.ts')],
    );
    expect(result).toEqual({
      codeUnitOversizedScans: 0,
      helperSpawnCalls: 0,
      messages: [
        'ACL inspection subject 0 has an invalid label',
        'ACL inspection subject 0 has an invalid label',
      ],
      multibyteScans: 1,
    });
  }, 30_000);

  it('binds the copied ACL helper bytes and ignores only inert metadata', () => {
    const inspectorBytes = readFileSync(
      path.resolve('scripts/inspect-posix-acl.py'),
    );
    const digest = (bytes: Uint8Array): string =>
      `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    expect(digest(inspectorBytes)).toBe(
      REVIEWED_POSIX_ACL_INSPECTOR_SHA256,
    );
    const changedBytes = Buffer.from(inspectorBytes);
    changedBytes[0] = changedBytes[0]! ^ 1;
    expect(digest(changedBytes)).not.toBe(
      REVIEWED_POSIX_ACL_INSPECTOR_SHA256,
    );

    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const cleanPath = process.platform === 'linux' ? '/dev/shm' : '/';
    const subject = {
      kind: 'path' as const,
      label: 'inert metadata control',
      value: cleanPath,
    };
    Object.defineProperty(subject, 'hidden', {
      enumerable: false,
      get: () => {
        throw new Error('must not execute');
      },
    });
    Object.defineProperty(subject, Symbol('hidden'), {
      enumerable: true,
      get: () => {
        throw new Error('must not execute');
      },
    });
    const subjects = [subject];
    Object.defineProperty(subjects, 'hidden', {
      enumerable: false,
      get: () => {
        throw new Error('must not execute');
      },
    });
    Object.defineProperty(subjects, Symbol('hidden'), {
      enumerable: true,
      get: () => {
        throw new Error('must not execute');
      },
    });
    expect(() => requireReviewedPosixAclAuthority(subjects)).not.toThrow();
  });

  it('rejects ACL helper drift and ambiguous helper-descriptor cleanup', () => {
    if (process.platform !== 'darwin' && process.platform !== 'linux') return;
    const root = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-acl-helper-authority-'),
    ));
    temporaryDirectories.push(root);
    const sourceModule = readFileSync(
      path.resolve('scripts/lib/posix-acl-authority.ts'),
    );
    const sourceHelper = readFileSync(path.resolve('scripts/inspect-posix-acl.py'));
    const fixtureSource = String.raw`
      import childProcess from 'node:child_process';
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      import { pathToFileURL } from 'node:url';

      const [mode, modulePath, helperPath, cleanPath] = process.argv.slice(2);
      const originalSpawn = childProcess.spawnSync;
      const originalClose = fs.closeSync;
      const originalFstat = fs.fstatSync;
      const originalLstat = fs.lstatSync;
      const closeCalls = [];
      if (mode === 'after') {
        childProcess.spawnSync = (...arguments_) => {
          const result = originalSpawn(...arguments_);
          fs.appendFileSync(helperPath, ' ');
          return result;
        };
      } else if (mode === 'close') {
        fs.closeSync = (descriptor) => {
          const descriptorStat = originalFstat(descriptor, { bigint: true });
          const helperStat = originalLstat(helperPath, { bigint: true });
          if (descriptorStat.dev === helperStat.dev && descriptorStat.ino === helperStat.ino) {
            closeCalls.push(descriptor);
            originalClose(descriptor);
            throw new Error('injected ambiguous helper close');
          }
          return originalClose(descriptor);
        };
      } else if (mode !== 'before') {
        throw new Error('unknown helper fixture mode');
      }
      syncBuiltinESMExports();
      const { requireReviewedPosixAclAuthority } = await import(
        pathToFileURL(modulePath).href + '?helper-fault=' + mode + '-' + Date.now()
      );
      let message = '';
      try {
        requireReviewedPosixAclAuthority([{
          kind: 'path',
          label: 'helper authority fixture',
          value: cleanPath,
        }]);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      if (!message) throw new Error('helper authority fault was accepted');
      if (mode === 'before' && !message.includes('digest is not the reviewed')) {
        throw new Error('pre-execution helper drift was not digest-rejected');
      }
      if (mode === 'after' && !message.includes('authority changed during execution')) {
        throw new Error('post-execution helper drift was not identity-rejected');
      }
      if (mode === 'close' &&
          (!message.includes('descriptor close is uncertain') || closeCalls.length !== 1)) {
        throw new Error('ambiguous helper close was not retained exactly once');
      }
      process.stdout.write(JSON.stringify({ message, closeCalls }));
    `;
    const cleanPath = process.platform === 'linux' ? '/dev/shm' : '/';
    for (const mode of ['before', 'after', 'close'] as const) {
      const fixture = path.join(root, mode);
      const library = path.join(fixture, 'lib');
      mkdirSync(library, { recursive: true });
      const modulePath = path.join(library, 'posix-acl-authority.ts');
      const helperPath = path.join(fixture, 'inspect-posix-acl.py');
      writeFileSync(modulePath, sourceModule);
      const helperBytes = Buffer.from(sourceHelper);
      if (mode === 'before') helperBytes[0] = helperBytes[0]! ^ 1;
      writeFileSync(helperPath, helperBytes);
      const result = runPatchedNodeFixture(
        fixture,
        `helper-${mode}`,
        fixtureSource,
        [mode, modulePath, helperPath, cleanPath],
      );
      expect(result.message).toEqual(expect.any(String));
      if (mode === 'close') expect(result.closeCalls).toHaveLength(1);
    }
  }, 30_000);

  it('uses reviewed Linux VFS ACL checks for paths and descriptors', () => {
    if (process.platform !== 'linux') return;
    const root = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-linux-acl-authority-'),
    ));
    temporaryDirectories.push(root);
    const aclDirectory = path.join(root, 'acl-directory');
    mkdirSync(aclDirectory, { mode: 0o700 });
    const aclResult = spawnSync(
      '/usr/bin/setfacl',
      ['--modify', 'user:65534:r-x', '--', aclDirectory],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    expect(aclResult.error).toBeUndefined();
    expect(aclResult.status, aclResult.stderr).toBe(0);
    expect(() => requireReviewedPosixAclAuthority([
      { kind: 'path', label: 'Linux ACL path', value: aclDirectory },
    ])).toThrow(/carries an extended ACL/u);

    const descriptor = openSync(aclDirectory, 'r');
    try {
      const movedDirectory = path.join(root, 'moved-acl-directory');
      renameSync(aclDirectory, movedDirectory);
      mkdirSync(aclDirectory, { mode: 0o700 });
      requireReviewedPosixAclAuthority([
        { kind: 'path', label: 'replacement clean path', value: aclDirectory },
      ]);
      expect(() => requireReviewedPosixAclAuthority([
        { kind: 'descriptor', label: 'Linux ACL descriptor', value: descriptor },
      ])).toThrow(/carries an extended ACL/u);
    } finally {
      closeSync(descriptor);
    }

    const defaultAclDirectory = path.join(root, 'default-acl-directory');
    mkdirSync(defaultAclDirectory, { mode: 0o700 });
    const defaultAclResult = spawnSync(
      '/usr/bin/setfacl',
      ['--modify', 'default:user:65534:r-x', '--', defaultAclDirectory],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    expect(defaultAclResult.error).toBeUndefined();
    expect(defaultAclResult.status, defaultAclResult.stderr).toBe(0);
    expect(() => requireReviewedPosixAclAuthority([
      { kind: 'path', label: 'Linux default ACL path', value: defaultAclDirectory },
    ])).toThrow(/carries an extended default ACL/u);

    expect(() => requireReviewedPosixAclAuthority([
      { kind: 'path', label: 'Linux procfs path', value: '/proc' },
    ])).toThrow(/filesystem ACL model is unsupported/u);
  });

  it('admits only the exact Darwin everyone-deny-delete ACL restriction', () => {
    if (process.platform !== 'darwin') return;
    const root = realpathSync(mkdtempSync(
      path.join(tmpdir(), 'cortexel-darwin-acl-authority-'),
    ));
    temporaryDirectories.push(root);
    const applyAcl = (directory: string, entry: string): void => {
      const result = spawnSync(
        '/bin/chmod',
        ['+a', entry, directory],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
    };
    const removeAcl = (directory: string): void => {
      const result = spawnSync(
        '/bin/chmod',
        ['-N', directory],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
    };

    const reviewed = path.join(root, 'reviewed-deny-delete');
    mkdirSync(reviewed, { mode: 0o700 });
    applyAcl(reviewed, 'group:everyone deny delete');
    try {
      const descriptor = openSync(reviewed, 'r');
      try {
        requireReviewedPosixAclAuthority([
          { kind: 'path', label: 'reviewed Darwin ACL path', value: reviewed },
          {
            kind: 'descriptor',
            label: 'reviewed Darwin ACL descriptor',
            value: descriptor,
          },
        ]);
      } finally {
        closeSync(descriptor);
      }
      requireProtectedDirectoryEntryChain(
        reviewed,
        'reviewed Darwin ACL ancestor',
      );
    } finally {
      removeAcl(reviewed);
    }

    for (const [name, entries] of [
      ['allow', ['group:everyone allow list']],
      ['inheritance-flag', ['group:everyone deny delete,file_inherit']],
      [
        'additional-entry',
        [
          'group:everyone deny delete',
          'group:everyone deny read',
        ],
      ],
    ] as const) {
      const unsupported = path.join(root, name);
      mkdirSync(unsupported, { mode: 0o700 });
      const descriptor = openSync(unsupported, 'r');
      try {
        try {
          for (const entry of entries) applyAcl(unsupported, entry);
          expect(() => requireReviewedPosixAclAuthority([
            {
              kind: 'path',
              label: `unsupported Darwin ${name} ACL path`,
              value: unsupported,
            },
          ])).toThrow(/extended ACL/u);
          expect(() => requireReviewedPosixAclAuthority([
            {
              kind: 'descriptor',
              label: `unsupported Darwin ${name} ACL descriptor`,
              value: descriptor,
            },
          ])).toThrow(/extended ACL/u);
        } finally {
          removeAcl(unsupported);
        }
      } finally {
        closeSync(descriptor);
      }
    }
  }, 30_000);

  it('closes sources, aliases, selectors, primary bodies, profiles, and assets deterministically', () => {
    const fixture = sourceFixture();
    const first = buildNestExampleSourceInventory(
      fixture.repository,
      fixture.authority,
    );
    const second = buildNestExampleSourceInventory(
      fixture.repository,
      fixture.authority,
    );

    expect(existsSync(fixture.sentinel)).toBe(false);
    expect(first).toEqual(second);
    expect(first.acquisition).toEqual({
      producerProfile: { state: 'not_declared' },
      repositoryContext: 'caller_supplied_repository_unverified',
      upstreamCodeExecutedByInventoryBuilder: false,
      inventoryReadAuthority: 'not_asserted',
    });
    expect(first.summary).toEqual({
      pythonPathEntryCount: 10,
      regularPythonFileCount: 9,
      pythonSymlinkCount: 1,
      regularExecutablePythonFileCount: 1,
      regularNonExecutablePythonFileCount: 8,
      documentedDirectPythonBodyCount: 4,
      runnerCandidatePathCount: 8,
      runnerExecutedPathCount: 5,
      runnerExecutedCanonicalBodyCount: 5,
      canonicalPrimaryBodyCount: 7,
      supportOrCoordinatedBodyCount: 2,
      runnerAggProfileCount: 5,
      visualAssetPathEntryCount: 3,
      visualAssetCountsByExtension: { png: 1, gif: 1, svg: 1 },
      exampleTreeLeafCount: 15,
      uniqueExampleTreeGitBlobCount: 15,
      auxiliaryLeafCount: 2,
      auxiliaryLeafCountsByRole: {
        build_orchestration: 1,
        documentation: 0,
        example_input: 0,
        runner_orchestration: 1,
      },
    });
    expect(first.runnerSelector).toMatchObject({
      skippedPaths: [
        'pynest/examples/music/nest_script.py',
        'pynest/examples/music/receiver_script.py',
        'pynest/examples/skipped.py',
      ],
      executedCanonicalPaths: [
        'pynest/examples/doc_only.py',
        'pynest/examples/group/main.py',
        'pynest/examples/plain/a.py',
        'pynest/examples/plain/b.py',
        'pynest/examples/top.py',
      ],
      matplotlibBackend: 'agg',
    });
    expect(first.aliases).toHaveLength(1);
    expect(first.aliases[0]).toMatchObject({
      aliasPath: 'pynest/examples/group/run_example.py',
      targetLiteral: 'main.py',
      resolvedTargetPath: 'pynest/examples/group/main.py',
      resolutionStatus: 'resolved',
    });

    const main = first.sourcePaths.find(
      (source) => source.path === 'pynest/examples/group/main.py',
    )!;
    const alias = first.sourcePaths.find(
      (source) => source.path === 'pynest/examples/group/run_example.py',
    )!;
    expect(main.selectorMembership).toEqual(['docs_direct']);
    expect(main.canonicalSelectorMembership).toEqual([
      'docs_direct',
      'runner_default',
    ]);
    expect(alias.selectorMembership).toEqual([
      'runner_candidate',
      'runner_default',
    ]);
    expect(alias.canonicalSourceId).toBe(main.sourceId);
    expect(alias.byteLength).toBe(Buffer.byteLength('main.py'));
    expect(alias.sha256).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(first.auxiliaryLeaves.map(({ path: leafPath, role }) => ({
      path: leafPath,
      role,
    }))).toEqual([
      {
        path: 'pynest/examples/CMakeLists.txt',
        role: 'build_orchestration',
      },
      {
        path: 'pynest/examples/run_examples.sh',
        role: 'runner_orchestration',
      },
    ]);

    expect(
      first.sourcePaths
        .filter((source) => source.role === 'support_module')
        .map((source) => source.path),
    ).toEqual(['pynest/examples/group/helper.py']);
    expect(
      first.sourcePaths
        .filter((source) => source.role === 'coordinated_component')
        .map((source) => source.path),
    ).toEqual(['pynest/examples/music/receiver_script.py']);

    const canonical = canonicalNestExampleSourceInventory(first);
    expect(canonical).toBe(canonicalize(first));
    expect(JSON.parse(canonical)).toEqual(first);
    const { inventoryDigest: _inventoryDigest, ...core } = first;
    expect(first.inventoryDigest).toBe(canonicalDigest({
      domain: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
      inventory: core,
    }));
  }, 120_000);

  it('distinguishes verified offline context and ignores ambient Git repository redirects', {
    // This integration case intentionally performs several complete reviewed-Git
    // builds. Each command keeps its production timeout; this outer watchdog must
    // cover their bounded serial composition under a loaded CI host.
    timeout: 900_000,
  }, () => {
    const fixture = sourceFixture();
    const previousGitDir = process.env.GIT_DIR;
    const previousObjectDirectory = process.env.GIT_OBJECT_DIRECTORY;
    const previousConfigParameters = process.env.GIT_CONFIG_PARAMETERS;
    try {
      process.env.GIT_DIR = path.join(fixture.root, 'wrong-git-directory');
      process.env.GIT_OBJECT_DIRECTORY = path.join(fixture.root, 'wrong-objects');
      process.env.GIT_CONFIG_PARAMETERS = "'alias.rev-parse'='!false'";
      expect(
        buildNestExampleSourceInventory(fixture.repository, fixture.authority)
          .summary.pythonPathEntryCount,
      ).toBe(10);
    } finally {
      if (previousGitDir === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = previousGitDir;
      if (previousObjectDirectory === undefined) {
        delete process.env.GIT_OBJECT_DIRECTORY;
      } else {
        process.env.GIT_OBJECT_DIRECTORY = previousObjectDirectory;
      }
      if (previousConfigParameters === undefined) {
        delete process.env.GIT_CONFIG_PARAMETERS;
      } else {
        process.env.GIT_CONFIG_PARAMETERS = previousConfigParameters;
      }
    }

    const rootSnapshot = verifyOfflineGitObjectDatabase(
      fixture.repository,
      fixture.root,
      'snapshot binding fixture',
    );
    expect(rootSnapshot).toMatchObject({
      temporaryRoot: realpathSync(fixture.root),
      temporaryRootMode: '700',
      temporaryRootUid: String(process.getuid!()),
    });
    expect(rootSnapshot.temporaryRootIdentity).toMatch(/^\d+:\d+$/u);

    const acquisition = verifyNestExampleOfflineAcquisitionContext(
      fixture.repository,
      fixture.root,
    );
    const verified = buildNestExampleSourceInventory(
      fixture.repository,
      fixture.authority,
      acquisition,
    );
    expect(verified.acquisition).toEqual({
      producerProfile: { state: 'not_declared' },
      repositoryContext: 'temporary_repository_shape_verified',
      upstreamCodeExecutedByInventoryBuilder: false,
      inventoryReadAuthority:
        'local_git_object_database_no_configured_remote_or_alternates',
    });

    const profiled = buildNestExampleSourceInventory(
      fixture.repository,
      fixture.authority,
      acquisition,
      NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
    );
    expect(profiled.acquisition.producerProfile).toEqual(
      NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
    );
    expect(() => buildNestExampleSourceInventory(
      fixture.repository,
      fixture.authority,
      acquisition,
      { ...NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE },
    )).toThrow(/producer profile is unsupported/u);
    expect(() => buildNestExampleSourceInventory(
      fixture.repository,
      fixture.authority,
      undefined,
      NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
    )).toThrow(/lacks verified repository authority/u);

    git(fixture.repository, [
      'remote',
      'add',
      'unexpected',
      'https://example.invalid/unexpected.git',
    ]);
    expect(() => buildNestExampleSourceInventory(
      fixture.repository,
      fixture.authority,
      acquisition,
    )).toThrow(/still has a configured remote/u);
  });

  it('rejects transferable tokens and indirect object-database authority', () => {
    const first = sourceFixture();
    const second = sourceFixture();
    const context = verifyNestExampleOfflineAcquisitionContext(
      first.repository,
      first.root,
    );
    expect(Object.isFrozen(context)).toBe(true);
    const copiedAndRetargeted = {
      ...context,
      repository: second.repository,
    } as typeof context;
    expect(() => buildNestExampleSourceInventory(
      second.repository,
      second.authority,
      copiedAndRetargeted,
    )).toThrow(/does not bind this repository/u);

    const linkedRepository = path.join(first.root, 'repository-link');
    symlinkSync(first.repository, linkedRepository, 'dir');
    expect(() => verifyNestExampleOfflineAcquisitionContext(
      linkedRepository,
      first.root,
    )).toThrow(/repository must be a direct directory/u);

    const objectFixture = sourceFixture();
    const objectDirectory = path.join(objectFixture.repository, '.git', 'objects');
    const movedObjectDirectory = path.join(objectFixture.root, 'moved-objects');
    renameSync(objectDirectory, movedObjectDirectory);
    symlinkSync(movedObjectDirectory, objectDirectory, 'dir');
    expect(() => verifyNestExampleOfflineAcquisitionContext(
      objectFixture.repository,
      objectFixture.root,
    )).toThrow(/object database.*direct directory/u);

    const packFixture = sourceFixture();
    const packDirectory = path.join(packFixture.repository, '.git', 'objects', 'pack');
    const movedPackDirectory = path.join(packFixture.root, 'moved-pack');
    renameSync(packDirectory, movedPackDirectory);
    symlinkSync(movedPackDirectory, packDirectory, 'dir');
    expect(() => verifyNestExampleOfflineAcquisitionContext(
      packFixture.repository,
      packFixture.root,
    )).toThrow(
      /object database (?:must not contain symbolic links|entries must have direct single-link current-UID authority)/u,
    );

    const alternateFixture = sourceFixture();
    fixtureFile(
      alternateFixture.repository,
      '.git/objects/info/http-alternates',
      'https://example.invalid/objects\n',
    );
    expect(() => verifyNestExampleOfflineAcquisitionContext(
      alternateFixture.repository,
      alternateFixture.root,
    )).toThrow(/HTTP alternate/u);

    const publicRootFixture = sourceFixture();
    try {
      chmodSync(publicRootFixture.root, 0o500);
      expect(() => verifyNestExampleOfflineAcquisitionContext(
        publicRootFixture.repository,
        publicRootFixture.root,
      )).toThrow(/exact mode 0700/u);
      chmodSync(publicRootFixture.root, 0o701);
      expect(() => verifyNestExampleOfflineAcquisitionContext(
        publicRootFixture.repository,
        publicRootFixture.root,
      )).toThrow(/exact mode 0700/u);
      const specialModeResult = spawnSync(
        '/bin/chmod',
        ['1700', publicRootFixture.root],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      expect(specialModeResult.error).toBeUndefined();
      expect(specialModeResult.status, specialModeResult.stderr).toBe(0);
      expect(lstatSync(publicRootFixture.root).mode & 0o7777).toBe(0o1700);
      expect(() => verifyNestExampleOfflineAcquisitionContext(
        publicRootFixture.repository,
        publicRootFixture.root,
      )).toThrow(/exact mode 0700/u);
    } finally {
      chmodSync(publicRootFixture.root, 0o700);
    }
    if (process.platform === 'darwin') {
      const aclResult = spawnSync(
        '/bin/chmod',
        [
          '+a',
          'group:everyone allow list,search,readattr,readextattr,readsecurity',
          publicRootFixture.root,
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      expect(aclResult.error).toBeUndefined();
      expect(aclResult.status, aclResult.stderr).toBe(0);
      expect(() => verifyNestExampleOfflineAcquisitionContext(
        publicRootFixture.repository,
        publicRootFixture.root,
      )).toThrow(/extended ACL/u);
    }
  }, 180_000);

  it('fails closed on root-tree, mode, alias, and selector drift', {
    // Five independent fail-closed builds compose multiple reviewed Git commands;
    // their command-level bounds remain authoritative inside this outer watchdog.
    timeout: 300_000,
  }, () => {
    const fixture = sourceFixture();
    expect(() => buildNestExampleSourceInventory(
      fixture.repository,
      {
        ...fixture.authority,
        rootTreeGitSha1: '0'.repeat(40),
      },
    )).toThrow(/root tree drifted/u);

    expect(() => buildNestExampleSourceInventory(
      fixture.repository,
      {
        ...fixture.authority,
        documentationIndex: {
          ...fixture.authority.documentationIndex,
          gitMode: '100755',
        },
      },
    )).toThrow(/mode drifted/u);

    expect(() => buildNestExampleSourceInventory(
      fixture.repository,
      {
        ...fixture.authority,
        aliases: {
          'pynest/examples/group/run_example.py':
            'pynest/examples/group/helper.py',
        },
      },
    )).toThrow(/target drifted/u);

    expect(() => buildNestExampleSourceInventory(
      fixture.repository,
      {
        ...fixture.authority,
        runner: {
          ...fixture.authority.runner,
          skipBasenames: [
            ...fixture.authority.runner.skipBasenames,
            'invented.py',
          ],
        },
      },
    )).toThrow(/runner skip basenames drifted/u);

    expect(() => buildNestExampleSourceInventory(
      fixture.repository,
      {
        ...fixture.authority,
        documentationIndex: {
          ...fixture.authority.documentationIndex,
          expectedGroupTargets: ['plain/index', 'invented/index'],
        },
      },
    )).toThrow(/documentation group targets drifted/u);
  });
});
