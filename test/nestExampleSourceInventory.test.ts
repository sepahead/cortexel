import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { canonicalDigest, canonicalize } from '../src/core/canonicalize.js';
import {
  buildNestExampleSourceInventory,
  canonicalNestExampleSourceInventory,
  NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
  PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
  PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
  validateNestExampleSourceInventory,
  verifyNestExampleOfflineAcquisitionContext,
  type NestExampleInventoryAuthority,
} from '../scripts/lib/nest-example-source-inventory.js';

const temporaryDirectories: string[] = [];

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
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_COUNT: '0',
        GIT_NO_REPLACE_OBJECTS: '1',
        GIT_OPTIONAL_LOCKS: '0',
      },
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
  const root = mkdtempSync(path.join(tmpdir(), 'cortexel-nest-inventory-test-'));
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
    },
  };
  return { root, repository, sentinel, authority };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('pinned NEST official-example source authority', () => {
  it('binds the exact upstream commit, trees, selector blobs, aliases, and counts', () => {
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
  });

  it('validates the exact checked-in semantic inventory and rejects evidence transfer', () => {
    const inventory = JSON.parse(readFileSync(
      path.resolve('docs/audit/nest-example-source-inventory.v1.json'),
      'utf8',
    ));
    expect(inventory.inventoryDigest).toBe(
      PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
    );
    expect(validateNestExampleSourceInventory(inventory)).toEqual([]);
    expect(inventory.invocationProfiles).toHaveLength(92);
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

    const driftedSource = structuredClone(inventory);
    driftedSource.sourcePaths[0].path = 'pynest/examples/invented.py';
    expect(validateNestExampleSourceInventory(driftedSource)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('digest does not bind'),
        expect.stringContaining('mismatched identity'),
      ]),
    );
  });
});

describe('offline NEST official-example source inventory', () => {
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
  });

  it('distinguishes verified offline context and ignores ambient Git repository redirects', () => {
    const fixture = sourceFixture();
    const previousGitDir = process.env.GIT_DIR;
    const previousObjectDirectory = process.env.GIT_OBJECT_DIRECTORY;
    try {
      process.env.GIT_DIR = path.join(fixture.root, 'wrong-git-directory');
      process.env.GIT_OBJECT_DIRECTORY = path.join(fixture.root, 'wrong-objects');
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
    }

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
      repositoryContext: 'temporary_repository_shape_verified',
      upstreamCodeExecutedByInventoryBuilder: false,
      inventoryReadAuthority:
        'local_git_object_database_no_configured_remote_or_alternates',
    });

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

  it('fails closed on root-tree, mode, alias, and selector drift', () => {
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
