/**
 * Deterministic, source-only inventory of the pinned official PyNEST examples.
 *
 * This module never imports PyNEST and never executes an upstream script. It reads
 * exact content-addressed Git objects, verifies the pinned authority files,
 * reproduces the documentation and runner selectors, resolves the three
 * orchestration aliases,
 * and emits a closed inventory suitable for later per-output review.
 */
import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { types as utilTypes } from 'node:util';

import {
  canonicalDigest,
  canonicalize,
  type JsonValue,
} from '../../src/core/canonicalize.js';
import {
  controlledGitCommandArguments,
  controlledGitEnvironment,
  requireOfflineGitReadAuthority,
  sameOfflineGitObjectDatabase,
  verifyOfflineGitObjectDatabase,
  type OfflineGitObjectDatabaseSnapshot,
  type VerifiedOfflineGitReadAuthority,
} from './offline-git-object-database.js';
import {
  processReviewedGitRuntime,
  readReviewedGitBlobBatch,
  runReviewedGitCommand,
  type ReviewedGitBlobRecord,
  type ReviewedGitRuntime,
} from './reviewed-git-command.js';

const POSIX = path.posix;
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SAFE_PATH =
  /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._@+,:=-]+(?:\/[A-Za-z0-9._@+,:=-]+)*$/u;
const MAX_GIT_OUTPUT_BYTES = 128 * 1024 * 1024;
const MAX_GIT_BATCH_OUTPUT_BYTES = 512 * 1024 * 1024;
const NEST_EXAMPLE_UNIQUE_ACQUISITION_BLOB_COUNT = 160;
const VERIFIED_ACQUISITION_CONTEXT = Symbol('verified NEST inventory acquisition context');
const VERIFIED_ACQUISITION_CONTEXTS = new WeakMap<
  object,
  OfflineGitObjectDatabaseSnapshot
>();

export const NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY =
  'cortexel-nest-example-source-inventory.rfc8785-sha256.v2' as const;

export const NEST_EXAMPLE_RAW_BLOB_REFERENCE_SET_IDENTITY =
  'cortexel.nest-example.raw-git-blob-reference-set.v1' as const;
export const PINNED_NEST_EXAMPLE_RAW_BLOB_REFERENCE_SET_DIGEST =
  'sha256:1c26fad63f624d1e1b1f859ffba5f6b3a5517e89a9992c9517ea2998a50d7a89' as const;
export const PINNED_NEST_EXAMPLE_RAW_BLOB_TOTAL_BYTE_LENGTH = 19_427_499;
export const PINNED_NEST_EXAMPLE_RAW_BLOB_MAX_BYTE_LENGTH = 6_339_219;

/** The only intentional content aliasing inside the pinned 162-leaf tree. */
export const PINNED_NEST_EXAMPLE_SHARED_BLOB_GROUPS = Object.freeze([
  Object.freeze({
    gitBlobSha1: '2c63c0851048d8f7bff41ecf0f8cee05f52fd120',
    paths: Object.freeze([
      'pynest/examples/sonata_example/300_pointneurons/components/synaptic_models/ExcToExc.json',
      'pynest/examples/sonata_example/300_pointneurons/components/synaptic_models/ExcToInh.json',
      'pynest/examples/sonata_example/300_pointneurons/components/synaptic_models/InhToExc.json',
      'pynest/examples/sonata_example/300_pointneurons/components/synaptic_models/InhToInh.json',
    ]),
  }),
] as const);

/**
 * Closed declaration for the intended reviewed acquisition-harness procedure.
 * It identifies the procedure that the current generator requires; the retained
 * declaration is not an independent receipt that the procedure actually ran.
 */
export const NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE = Object.freeze({
  schema: 'cortexel-source-inventory-acquisition-producer-profile.v1',
  producer: 'scripts/generate-nest-example-source-inventory.ts',
  profile:
    'cortexel.nest-example.git-sha1-blobless-structural-137-example-leaves-162-example-unique-blobs-159-acquired-unique-blobs-160-raw-https-selected-reviewed-posix-offline-batch-canonical-object-rehash.v6',
  harnessRevision: 6,
  executionEvidence: 'profile_declaration_not_independent_execution_receipt',
} as const);

const UNDECLARED_ACQUISITION_PRODUCER_PROFILE = Object.freeze({
  state: 'not_declared',
} as const);

/** Byte-preserved predecessor identity; it contributes no authority to V2. */
export const NEST_EXAMPLE_SOURCE_INVENTORY_V1_PREDECESSOR = Object.freeze({
  path: 'docs/audit/nest-example-source-inventory.v1.json',
  protocol: 'cortexel-nest-example-source-inventory',
  protocolVersion: 1,
  identityAlgorithm:
    'cortexel-nest-example-source-inventory.rfc8785-sha256.v1',
  inventoryDigest:
    'sha256:cd59e82a8eb5af6d482d3042afdf91b0793865aef75843f5b10da6ee61ba3fe6',
  artifactByteLength: 196_576,
  artifactSha256:
    'sha256:1d762db8c60e174f42371308093c0d091937bde2299ed8cfce4217c9e9179c1a',
  evidenceTransfer: 'none',
} as const);

/** Exact semantic digest emitted from the pinned NEST v3.10 source authority. */
export const PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST =
  'sha256:1f039d9b4616ffa2de0c2acb6ca4ef9eaf473185b044a66bd8e6bbea27b1d216' as const;

export interface AuthorityFile {
  readonly path: string;
  readonly gitMode: '100644' | '100755';
  readonly gitBlobSha1: string;
}

export interface NestExampleInventoryAuthority {
  readonly project: 'NEST Simulator';
  readonly release: string;
  readonly repository: string;
  readonly commit: string;
  readonly rootTreeGitSha1: string;
  readonly exampleRoot: string;
  readonly documentationIndex: AuthorityFile & {
    readonly expectedDocDirectiveCount: number;
    readonly expectedDirectPythonCount: number;
    readonly expectedGroupTargets: readonly string[];
    readonly expectedExternalTargets: readonly string[];
  };
  readonly runner: AuthorityFile & {
    readonly pythonCommand: 'python3';
    readonly matplotlibBackend: 'agg';
    readonly skipBasenames: readonly string[];
    readonly expectedCandidatePathCount: number;
    readonly expectedExecutedPathCount: number;
    readonly expectedExecutedCanonicalBodyCount: number;
  };
  readonly orchestrationCmake: AuthorityFile;
  readonly aliases: Readonly<Record<string, string>>;
  readonly coordinatedComponentPaths: readonly string[];
  readonly expected: {
    readonly pythonPathEntryCount: number;
    readonly regularPythonFileCount: number;
    readonly pythonSymlinkCount: number;
    readonly regularExecutablePythonFileCount: number;
    readonly regularNonExecutablePythonFileCount: number;
    readonly canonicalPrimaryBodyCount: number;
    readonly supportOrCoordinatedBodyCount: number;
    readonly visualAssetPathEntryCount: number;
    readonly visualAssetCountsByExtension: Readonly<Record<'png' | 'gif' | 'svg', number>>;
    readonly exampleTreeLeafCount: number;
    readonly uniqueExampleTreeGitBlobCount: number;
    readonly auxiliaryLeafCount: number;
    readonly auxiliaryLeafCountsByRole: Readonly<Record<
      'build_orchestration' | 'documentation' | 'example_input' | 'runner_orchestration',
      number
    >>;
    readonly sharedGitBlobGroups: readonly {
      readonly gitBlobSha1: string;
      readonly paths: readonly string[];
    }[];
  };
}

export const PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY:
  NestExampleInventoryAuthority = Object.freeze({
    project: 'NEST Simulator',
    release: 'v3.10',
    repository: 'https://github.com/nest/nest-simulator.git',
    commit: 'acca9704da248750219a027db99fec6cd1f9052a',
    rootTreeGitSha1: '7f6f4f0407c4000cded433b86d658191dd82cd79',
    exampleRoot: 'pynest/examples',
    documentationIndex: {
      path: 'doc/htmldoc/examples/index.rst',
      gitMode: '100644',
      gitBlobSha1: '2965669bd03f128478fa107779485ad5934b73c5',
      expectedDocDirectiveCount: 94,
      expectedDirectPythonCount: 90,
      expectedGroupTargets: [
        'EI_clustered_network/index',
        'brette_et_al_2007/index',
        'eprop_plasticity/index',
      ],
      expectedExternalTargets: ['pd14:auto_examples/index'],
    },
    runner: {
      path: 'pynest/examples/run_examples.sh',
      gitMode: '100755',
      gitBlobSha1: '6b36df9dd356a419e12aa477b0d05611111052f7',
      pythonCommand: 'python3',
      matplotlibBackend: 'agg',
      skipBasenames: [
        'brette_et_al_2007_benchmark.py',
        'nest_script.py',
        'receiver_script.py',
        'eprop_supervised_classification_neuromorphic_mnist.py',
        'csa_example.py',
        'csa_spatial_example.py',
      ],
      expectedCandidatePathCount: 98,
      expectedExecutedPathCount: 92,
      expectedExecutedCanonicalBodyCount: 92,
    },
    orchestrationCmake: {
      path: 'pynest/examples/CMakeLists.txt',
      gitMode: '100644',
      gitBlobSha1: 'b1c834a050be5562edb54218d960fcf255ecd8ea',
    },
    aliases: {
      'pynest/examples/EI_clustered_network/run_example.py':
        'pynest/examples/EI_clustered_network/run_simulation.py',
      'pynest/examples/pong/run_example.py':
        'pynest/examples/pong/run_simulations.py',
      'pynest/examples/sudoku/run_example.py':
        'pynest/examples/sudoku/sudoku_solver.py',
    },
    coordinatedComponentPaths: [
      'pynest/examples/music_cont_out_proxy_example/receiver_script.py',
    ],
    expected: {
      pythonPathEntryCount: 112,
      regularPythonFileCount: 109,
      pythonSymlinkCount: 3,
      regularExecutablePythonFileCount: 13,
      regularNonExecutablePythonFileCount: 96,
      canonicalPrimaryBodyCount: 98,
      supportOrCoordinatedBodyCount: 11,
      visualAssetPathEntryCount: 12,
      visualAssetCountsByExtension: {
        png: 9,
        gif: 2,
        svg: 1,
      },
      exampleTreeLeafCount: 162,
      uniqueExampleTreeGitBlobCount: 159,
      auxiliaryLeafCount: 38,
      auxiliaryLeafCountsByRole: {
        build_orchestration: 1,
        documentation: 12,
        example_input: 23,
        runner_orchestration: 2,
      },
      sharedGitBlobGroups: PINNED_NEST_EXAMPLE_SHARED_BLOB_GROUPS,
    },
  } as const);

interface GitLeaf {
  readonly mode: string;
  readonly type: string;
  readonly sha: string;
  readonly path: string;
  readonly pathBytesBase64: string;
}

export interface NestExampleSourcePath {
  readonly sourceId: string;
  readonly path: string;
  readonly pathBytesBase64: string;
  readonly gitMode: '100644' | '100755' | '120000';
  readonly gitBlobSha1: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly kind: 'regular_python' | 'python_symlink';
  readonly role:
    | 'official_entrypoint'
    | 'support_module'
    | 'coordinated_component'
    | 'orchestration_alias';
  readonly canonicalSourceId: string;
  readonly selectorMembership: readonly (
    | 'docs_direct'
    | 'runner_candidate'
    | 'runner_default'
    | 'runner_skipped'
  )[];
  readonly canonicalSelectorMembership: readonly (
    | 'docs_direct'
    | 'runner_default'
    | 'runner_skipped'
  )[];
}

export interface NestExampleAlias {
  readonly aliasId: string;
  readonly aliasSourceId: string;
  readonly aliasPath: string;
  readonly targetLiteral: string;
  readonly resolvedTargetPath: string;
  readonly canonicalSourceId: string;
  readonly resolutionStatus: 'resolved';
}

export interface NestExampleEntrypoint {
  readonly entrypointId: string;
  readonly canonicalSourceId: string;
  readonly canonicalPath: string;
  readonly aliasPaths: readonly string[];
  readonly selectorMembership: readonly ('docs_direct' | 'runner_default')[];
  readonly documentationSelectedPaths: readonly string[];
  readonly runnerSelectedPaths: readonly string[];
}

export interface NestExampleInvocationProfile {
  readonly invocationId: string;
  readonly entrypointId: string;
  readonly profile: 'runner_agg_default';
  readonly selectedPath: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly environment: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  readonly executionState: 'definition_only_not_run';
  readonly targetEffect: 'executes_upstream_code_if_invoked';
  readonly authorityPath: string;
  readonly authorityGitBlobSha1: string;
}

export interface NestExampleVisualAsset {
  readonly assetId: string;
  readonly path: string;
  readonly pathBytesBase64: string;
  readonly gitMode: string;
  readonly gitBlobSha1: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly extension: 'png' | 'gif' | 'svg';
  readonly role: 'checked_in_upstream_visual_asset';
}

export interface NestExampleAuxiliaryLeaf {
  readonly auxiliaryId: string;
  readonly path: string;
  readonly pathBytesBase64: string;
  readonly gitMode: '100644' | '100755';
  readonly gitBlobSha1: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly role:
    | 'build_orchestration'
    | 'documentation'
    | 'example_input'
    | 'runner_orchestration';
}

export interface NestExampleTreeLeafReference {
  readonly path: string;
  readonly gitMode: '100644' | '100755' | '120000';
  readonly gitBlobSha1: string;
}

export interface VerifiedNestExampleAcquisitionContext {
  readonly [VERIFIED_ACQUISITION_CONTEXT]: true;
  readonly repository: string;
  readonly temporaryRoot: string;
}

export interface NestExampleSourceInventory {
  readonly protocol: 'cortexel-nest-example-source-inventory';
  readonly protocolVersion: 2;
  readonly identityAlgorithm: typeof NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY;
  readonly predecessor: typeof NEST_EXAMPLE_SOURCE_INVENTORY_V1_PREDECESSOR;
  readonly upstream: {
    readonly project: 'NEST Simulator';
    readonly release: string;
    readonly repository: string;
    readonly commit: string;
    readonly rootTreeGitSha1: string;
    readonly exampleRoot: string;
  };
  readonly acquisition: {
    readonly producerProfile:
      | typeof NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE
      | typeof UNDECLARED_ACQUISITION_PRODUCER_PROFILE;
    readonly repositoryContext:
      | 'caller_supplied_repository_unverified'
      | 'temporary_repository_shape_verified';
    readonly upstreamCodeExecutedByInventoryBuilder: false;
    readonly inventoryReadAuthority:
      | 'not_asserted'
      | 'local_git_object_database_no_configured_remote_or_alternates';
  };
  readonly authorityFiles: {
    readonly documentationIndex: AuthorityFile;
    readonly runner: AuthorityFile;
    readonly orchestrationCmake: AuthorityFile;
  };
  readonly documentationSelector: {
    readonly docDirectiveCount: number;
    readonly directPythonPaths: readonly string[];
    readonly groupTargets: readonly string[];
    readonly externalTargets: readonly string[];
  };
  readonly runnerSelector: {
    readonly candidatePaths: readonly string[];
    readonly skippedPaths: readonly string[];
    readonly executedPaths: readonly string[];
    readonly executedCanonicalPaths: readonly string[];
    readonly skipBasenames: readonly string[];
    readonly pythonCommand: 'python3';
    readonly matplotlibBackend: 'agg';
  };
  readonly sourcePaths: readonly NestExampleSourcePath[];
  readonly aliases: readonly NestExampleAlias[];
  readonly entrypoints: readonly NestExampleEntrypoint[];
  readonly invocationProfiles: readonly NestExampleInvocationProfile[];
  readonly visualAssets: readonly NestExampleVisualAsset[];
  readonly auxiliaryLeaves: readonly NestExampleAuxiliaryLeaf[];
  readonly summary: {
    readonly pythonPathEntryCount: number;
    readonly regularPythonFileCount: number;
    readonly pythonSymlinkCount: number;
    readonly regularExecutablePythonFileCount: number;
    readonly regularNonExecutablePythonFileCount: number;
    readonly documentedDirectPythonBodyCount: number;
    readonly runnerCandidatePathCount: number;
    readonly runnerExecutedPathCount: number;
    readonly runnerExecutedCanonicalBodyCount: number;
    readonly canonicalPrimaryBodyCount: number;
    readonly supportOrCoordinatedBodyCount: number;
    readonly runnerAggProfileCount: number;
    readonly visualAssetPathEntryCount: number;
    readonly visualAssetCountsByExtension: Readonly<Record<'png' | 'gif' | 'svg', number>>;
    readonly exampleTreeLeafCount: number;
    readonly uniqueExampleTreeGitBlobCount: number;
    readonly auxiliaryLeafCount: number;
    readonly auxiliaryLeafCountsByRole: Readonly<Record<
      NestExampleAuxiliaryLeaf['role'],
      number
    >>;
  };
  readonly inventoryDigest: string;
}

function fail(message: string): never {
  throw new Error(`NEST example source inventory: ${message}`);
}

function assertSha1(value: string, where: string): void {
  if (!SHA1.test(value)) fail(`${where} is not a full lowercase Git SHA-1`);
}

function assertSafeRepositoryPath(value: string, where: string): void {
  if (!SAFE_PATH.test(value) || POSIX.normalize(value) !== value) {
    fail(`${where} is not a safe audit repository-relative POSIX path`);
  }
}

function assertCanonicalGitPath(value: string, where: string): void {
  if (
    value.length === 0 ||
    value.includes('\0') ||
    POSIX.isAbsolute(value) ||
    POSIX.normalize(value) !== value ||
    value.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    fail(`${where} is not a canonical repository-relative POSIX path`);
  }
}

function utf8(buffer: Buffer, where: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return fail(`${where} is not well-formed UTF-8`);
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function gitEnvironment(): NodeJS.ProcessEnv {
  return {
    ...controlledGitEnvironment(),
    GIT_NO_LAZY_FETCH: '1',
  };
}

function gitBuffer(
  repository: string,
  args: readonly string[],
  reviewedGit: ReviewedGitRuntime,
  maxBuffer = MAX_GIT_OUTPUT_BYTES,
): Buffer {
  const result = runReviewedGitCommand(
    reviewedGit,
    repository,
    controlledGitCommandArguments(repository, args),
    {
      environment: gitEnvironment(),
      outputLimitBytes: maxBuffer,
      timeoutMs: 120_000,
    },
  );
  return result.stdout;
}

function gitText(
  repository: string,
  args: readonly string[],
  reviewedGit: ReviewedGitRuntime,
): string {
  return utf8(
    gitBuffer(repository, args, reviewedGit),
    `git ${args[0] ?? '<missing>'} output`,
  );
}

function parseLeafTree(buffer: Buffer): GitLeaf[] {
  const entries: GitLeaf[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    const end = buffer.indexOf(0, offset);
    if (end < 0) fail('git ls-tree output has an unterminated record');
    const record = buffer.subarray(offset, end);
    offset = end + 1;
    const tab = record.indexOf(0x09);
    if (tab < 0) fail('git ls-tree record has no path separator');
    const header = utf8(record.subarray(0, tab), 'git ls-tree header');
    const [mode, type, sha, ...extra] = header.split(' ');
    if (!mode || !type || !sha || extra.length !== 0) {
      fail('git ls-tree record has a malformed header');
    }
    assertSha1(sha, 'git ls-tree object id');
    const pathBytes = record.subarray(tab + 1);
    const entryPath = utf8(pathBytes, 'git tree path');
    // The complete upstream tree may legitimately contain spaces or Unicode in
    // unrelated paths. Preserve those bytes, then apply the narrower audit-path
    // alphabet only to paths admitted into this inventory.
    assertCanonicalGitPath(entryPath, 'git tree path');
    entries.push({
      mode,
      type,
      sha,
      path: entryPath,
      pathBytesBase64: pathBytes.toString('base64'),
    });
  }
  entries.sort((left, right) => compareText(left.path, right.path));
  return entries;
}

function objectAt(entries: readonly GitLeaf[], objectPath: string): GitLeaf {
  const found = entries.find((entry) => entry.path === objectPath);
  if (!found) fail(`required Git object ${JSON.stringify(objectPath)} is absent`);
  return found;
}

function verifyAuthorityFile(entries: readonly GitLeaf[], expected: AuthorityFile): void {
  assertSafeRepositoryPath(expected.path, 'authority file path');
  assertSha1(expected.gitBlobSha1, `${expected.path} expected blob`);
  const actual = objectAt(entries, expected.path);
  if (actual.type !== 'blob') fail(`${expected.path} is not a Git blob`);
  if (actual.mode !== expected.gitMode) {
    fail(`${expected.path} mode drifted: expected ${expected.gitMode}, received ${actual.mode}`);
  }
  if (actual.sha !== expected.gitBlobSha1) {
    fail(`${expected.path} blob drifted: expected ${expected.gitBlobSha1}, received ${actual.sha}`);
  }
}

function blob(
  bytesByPath: ReadonlyMap<string, Buffer>,
  objectPath: string,
): Buffer {
  assertSafeRepositoryPath(objectPath, 'Git blob path');
  return bytesByPath.get(objectPath) ?? fail(`Git blob ${objectPath} bytes are absent`);
}

function sourceId(commit: string, entry: GitLeaf): string {
  return canonicalDigest({
    domain: 'cortexel.nest-example.source.v1',
    payload: {
      commit,
      path: entry.path,
      gitMode: entry.mode,
      gitBlobSha1: entry.sha,
    },
  });
}

function identity(domain: string, payload: JsonValue): string {
  return canonicalDigest({ domain, payload });
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function assertExactStrings(
  actual: readonly string[],
  expected: readonly string[],
  where: string,
): void {
  const normalizedActual = sortedUnique(actual);
  const normalizedExpected = sortedUnique(expected);
  if (
    normalizedActual.length !== normalizedExpected.length ||
    normalizedActual.some((value, index) => value !== normalizedExpected[index])
  ) {
    fail(
      `${where} drifted: expected ${JSON.stringify(normalizedExpected)}, ` +
      `received ${JSON.stringify(normalizedActual)}`,
    );
  }
}

interface DocumentationSelection {
  readonly directiveCount: number;
  readonly directPythonPaths: readonly string[];
  readonly groupTargets: readonly string[];
  readonly externalTargets: readonly string[];
}

function documentationTarget(roleBody: string): string {
  const trimmed = roleBody.trim();
  const titled = /<([^<>]+)>$/u.exec(trimmed);
  return (titled?.[1] ?? trimmed).trim();
}

function deriveDocumentationSelection(
  source: string,
  regularPythonPathSet: ReadonlySet<string>,
  authority: NestExampleInventoryAuthority,
): DocumentationSelection {
  const roles = [...source.matchAll(/:doc:`([^`]+)`/gu)];
  const directPythonPaths: string[] = [];
  const groupTargets: string[] = [];
  const externalTargets: string[] = [];

  for (const role of roles) {
    const target = documentationTarget(role[1] ?? '');
    let relative: string | null = null;
    if (target.startsWith('../auto_examples/')) {
      relative = target.slice('../auto_examples/'.length);
    } else if (target.startsWith('/auto_examples/')) {
      relative = target.slice('/auto_examples/'.length);
    }
    if (relative === null) {
      externalTargets.push(target);
      continue;
    }
    if (relative.endsWith('/index')) {
      groupTargets.push(relative);
      continue;
    }
    const candidate = `${authority.exampleRoot}/${relative}.py`;
    assertSafeRepositoryPath(candidate, 'documentation-selected Python path');
    if (!regularPythonPathSet.has(candidate)) {
      fail(`documentation target ${JSON.stringify(target)} does not resolve to a regular Python body`);
    }
    directPythonPaths.push(candidate);
  }

  const selection = {
    directiveCount: roles.length,
    directPythonPaths: sortedUnique(directPythonPaths),
    groupTargets: sortedUnique(groupTargets),
    externalTargets: sortedUnique(externalTargets),
  };
  if (selection.directiveCount !== authority.documentationIndex.expectedDocDirectiveCount) {
    fail(
      `documentation :doc: directive count drifted: expected ` +
      `${authority.documentationIndex.expectedDocDirectiveCount}, ` +
      `received ${selection.directiveCount}`,
    );
  }
  if (
    selection.directPythonPaths.length !==
    authority.documentationIndex.expectedDirectPythonCount
  ) {
    fail(
      `documentation direct Python count drifted: expected ` +
      `${authority.documentationIndex.expectedDirectPythonCount}, ` +
      `received ${selection.directPythonPaths.length}`,
    );
  }
  assertExactStrings(
    selection.groupTargets,
    authority.documentationIndex.expectedGroupTargets,
    'documentation group targets',
  );
  assertExactStrings(
    selection.externalTargets,
    authority.documentationIndex.expectedExternalTargets,
    'documentation external targets',
  );
  return selection;
}

function assertRunnerSource(
  source: string,
  authority: NestExampleInventoryAuthority,
): void {
  const normalized = source.replace(/[ \t]+/gu, ' ');
  const required = [
    'find "${sourcedir}/pynest/examples" -maxdepth 1 -type d ' +
      '-not -exec test -e {}/run_example.py \\; ' +
      '-exec find {} -maxdepth 1 -name \'*.py\' \\;',
    'ls "${sourcedir}/pynest/examples"/*/run_example.py',
    `export MPLBACKEND=${authority.runner.matplotlibBackend}`,
    `runner="${authority.runner.pythonCommand}"`,
  ];
  for (const fragment of required) {
    if (!normalized.includes(fragment)) {
      fail(`runner selector authority no longer contains ${JSON.stringify(fragment)}`);
    }
  }
  const skip = /\bSKIP_LIST="([^"\r\n]*)"/u.exec(source);
  if (!skip) fail('runner selector authority has no canonical SKIP_LIST assignment');
  assertExactStrings(
    (skip[1] ?? '').split(' ').filter(Boolean),
    authority.runner.skipBasenames,
    'runner skip basenames',
  );
}

interface RunnerSelection {
  readonly candidatePaths: readonly string[];
  readonly skippedPaths: readonly string[];
  readonly executedPaths: readonly string[];
  readonly executedCanonicalPaths: readonly string[];
}

function deriveRunnerCandidates(
  pythonEntries: readonly GitLeaf[],
  exampleRoot: string,
): string[] {
  const relative = pythonEntries.map((entry) => ({
    entry,
    relative: entry.path.slice(`${exampleRoot}/`.length),
  }));
  const topLevel = relative
    .filter(({ relative: value }) => !value.includes('/'))
    .map(({ entry }) => entry.path);
  const byDirectory = new Map<string, GitLeaf[]>();
  for (const item of relative) {
    const parts = item.relative.split('/');
    if (parts.length !== 2) continue;
    const children = byDirectory.get(parts[0]!) ?? [];
    children.push(item.entry);
    byDirectory.set(parts[0]!, children);
  }
  const nested: string[] = [];
  for (const children of byDirectory.values()) {
    const alias = children.find((entry) => POSIX.basename(entry.path) === 'run_example.py');
    if (alias) {
      nested.push(alias.path);
    } else {
      nested.push(...children.map((entry) => entry.path));
    }
  }
  return sortedUnique([...topLevel, ...nested]);
}

function deriveRunnerSelection(
  pythonEntries: readonly GitLeaf[],
  aliasTargetByPath: ReadonlyMap<string, string>,
  authority: NestExampleInventoryAuthority,
): RunnerSelection {
  const candidatePaths = deriveRunnerCandidates(pythonEntries, authority.exampleRoot);
  const skipSet = new Set(authority.runner.skipBasenames);
  const skippedPaths = candidatePaths.filter((candidate) => skipSet.has(POSIX.basename(candidate)));
  const executedPaths = candidatePaths.filter((candidate) => !skipSet.has(POSIX.basename(candidate)));
  const executedCanonicalPaths = sortedUnique(
    executedPaths.map((candidate) => aliasTargetByPath.get(candidate) ?? candidate),
  );
  if (candidatePaths.length !== authority.runner.expectedCandidatePathCount) {
    fail(
      `runner candidate count drifted: expected ${authority.runner.expectedCandidatePathCount}, ` +
      `received ${candidatePaths.length}`,
    );
  }
  if (executedPaths.length !== authority.runner.expectedExecutedPathCount) {
    fail(
      `runner executed-path count drifted: expected ${authority.runner.expectedExecutedPathCount}, ` +
      `received ${executedPaths.length}`,
    );
  }
  if (
    executedCanonicalPaths.length !==
    authority.runner.expectedExecutedCanonicalBodyCount
  ) {
    fail(
      `runner canonical-body count drifted: expected ` +
      `${authority.runner.expectedExecutedCanonicalBodyCount}, ` +
      `received ${executedCanonicalPaths.length}`,
    );
  }
  const observedSkippedBasenames = skippedPaths.map((item) => POSIX.basename(item));
  assertExactStrings(
    observedSkippedBasenames,
    authority.runner.skipBasenames,
    'runner skipped candidate paths',
  );
  return {
    candidatePaths,
    skippedPaths,
    executedPaths,
    executedCanonicalPaths,
  };
}

function countExpected(actual: number, expected: number, where: string): void {
  if (actual !== expected) fail(`${where} drifted: expected ${expected}, received ${actual}`);
}

function resolveAliases(
  bytesByPath: ReadonlyMap<string, Buffer>,
  authority: NestExampleInventoryAuthority,
  pythonEntries: readonly GitLeaf[],
  sourceIdByPath: ReadonlyMap<string, string>,
): {
  aliases: NestExampleAlias[];
  aliasTargetByPath: ReadonlyMap<string, string>;
} {
  const pythonByPath = new Map(pythonEntries.map((entry) => [entry.path, entry]));
  const symlinks = pythonEntries.filter((entry) => entry.mode === '120000');
  const expectedPaths = Object.keys(authority.aliases);
  assertExactStrings(
    symlinks.map((entry) => entry.path),
    expectedPaths,
    'Python symlink paths',
  );
  const aliases: NestExampleAlias[] = [];
  const aliasTargetByPath = new Map<string, string>();
  for (const entry of symlinks) {
    const raw = blob(bytesByPath, entry.path);
    const targetLiteral = utf8(raw, `symlink target ${entry.path}`);
    if (
      targetLiteral.length === 0 ||
      targetLiteral.includes('\0') ||
      POSIX.isAbsolute(targetLiteral)
    ) {
      fail(`symlink ${entry.path} has an unsafe target`);
    }
    const resolvedTargetPath = POSIX.normalize(POSIX.join(POSIX.dirname(entry.path), targetLiteral));
    if (
      !resolvedTargetPath.startsWith(`${authority.exampleRoot}/`) ||
      resolvedTargetPath === authority.exampleRoot
    ) {
      fail(`symlink ${entry.path} escapes the example subtree`);
    }
    const expectedTarget = authority.aliases[entry.path];
    if (resolvedTargetPath !== expectedTarget) {
      fail(
        `symlink ${entry.path} target drifted: expected ${JSON.stringify(expectedTarget)}, ` +
        `received ${JSON.stringify(resolvedTargetPath)}`,
      );
    }
    const target = pythonByPath.get(resolvedTargetPath);
    if (!target || !['100644', '100755'].includes(target.mode)) {
      fail(`symlink ${entry.path} does not resolve to a regular Python body`);
    }
    const aliasSourceId = sourceIdByPath.get(entry.path);
    const canonicalSourceId = sourceIdByPath.get(resolvedTargetPath);
    if (!aliasSourceId || !canonicalSourceId) fail(`symlink ${entry.path} identity is absent`);
    aliasTargetByPath.set(entry.path, resolvedTargetPath);
    aliases.push({
      aliasId: identity('cortexel.nest-example.alias.v1', {
        commit: authority.commit,
        aliasPath: entry.path,
        aliasGitBlobSha1: entry.sha,
        targetLiteral,
        resolvedTargetPath,
      }),
      aliasSourceId,
      aliasPath: entry.path,
      targetLiteral,
      resolvedTargetPath,
      canonicalSourceId,
      resolutionStatus: 'resolved',
    });
  }
  aliases.sort((left, right) => compareText(left.aliasPath, right.aliasPath));
  return { aliases, aliasTargetByPath };
}

function membership<T extends string>(
  memberships: readonly T[],
  order: readonly T[],
): T[] {
  const values = new Set(memberships);
  return order.filter((item) => values.has(item));
}

function classifyAuxiliaryLeafPath(
  entryPath: string,
  authority: NestExampleInventoryAuthority,
): NestExampleAuxiliaryLeaf['role'] | null {
  const basename = POSIX.basename(entryPath);
  if (entryPath === authority.orchestrationCmake.path) {
    return 'build_orchestration';
  }
  if (basename === 'README.rst' || basename === 'README.md') {
    return 'documentation';
  }
  if (entryPath.endsWith('.sh')) return 'runner_orchestration';
  if (/\.(?:csv|h5|json|music|txt)$/u.test(entryPath)) return 'example_input';
  return null;
}

function pinnedExampleTree(
  repository: string,
  authority: NestExampleInventoryAuthority,
  reviewedGit: ReviewedGitRuntime,
): { readonly allLeaves: readonly GitLeaf[]; readonly exampleLeaves: readonly GitLeaf[] } {
  assertSha1(authority.commit, 'pinned commit');
  assertSha1(authority.rootTreeGitSha1, 'pinned root tree');
  assertSafeRepositoryPath(authority.exampleRoot, 'example root');
  const resolvedCommit = gitText(
    repository,
    ['rev-parse', '--verify', `${authority.commit}^{commit}`],
    reviewedGit,
  ).trim();
  if (resolvedCommit !== authority.commit) {
    fail(`commit drifted: expected ${authority.commit}, received ${resolvedCommit}`);
  }
  const rootTree = gitText(
    repository,
    ['rev-parse', '--verify', `${authority.commit}^{tree}`],
    reviewedGit,
  ).trim();
  if (rootTree !== authority.rootTreeGitSha1) {
    fail(`root tree drifted: expected ${authority.rootTreeGitSha1}, received ${rootTree}`);
  }
  const allLeaves = parseLeafTree(gitBuffer(
    repository,
    ['ls-tree', '-rz', '--full-tree', authority.commit],
    reviewedGit,
  ));
  verifyAuthorityFile(allLeaves, authority.documentationIndex);
  verifyAuthorityFile(allLeaves, authority.runner);
  verifyAuthorityFile(allLeaves, authority.orchestrationCmake);
  const exampleLeaves = allLeaves.filter((entry) =>
    entry.path.startsWith(`${authority.exampleRoot}/`));
  countExpected(
    exampleLeaves.length,
    authority.expected.exampleTreeLeafCount,
    'complete example-tree leaf count',
  );
  for (const entry of exampleLeaves) {
    assertSafeRepositoryPath(entry.path, 'example-tree leaf path');
    if (
      entry.type !== 'blob' ||
      !['100644', '100755', '120000'].includes(entry.mode)
    ) {
      fail(`example-tree leaf ${entry.path} has an unsupported type or Git mode`);
    }
  }
  const uniqueIdentities = new Set(exampleLeaves.map((entry) => entry.sha));
  countExpected(
    uniqueIdentities.size,
    authority.expected.uniqueExampleTreeGitBlobCount,
    'unique example-tree Git blob count',
  );
  const sharedBlobGroups = [...uniqueIdentities]
    .map((gitBlobSha1) => ({
      gitBlobSha1,
      paths: exampleLeaves
        .filter((entry) => entry.sha === gitBlobSha1)
        .map((entry) => entry.path)
        .sort(compareText),
    }))
    .filter(({ paths }) => paths.length > 1)
    .sort((left, right) => compareText(left.gitBlobSha1, right.gitBlobSha1));
  if (!canonicalMatches(sharedBlobGroups, authority.expected.sharedGitBlobGroups)) {
    fail('shared example-tree Git blob groups drifted from the exact SONATA alias');
  }
  return { allLeaves, exampleLeaves };
}

export function nestExampleTreeLeafReferences(
  repositoryPath: string,
  authority: NestExampleInventoryAuthority = PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): readonly NestExampleTreeLeafReference[] {
  if (!path.isAbsolute(repositoryPath)) fail('repository path must be absolute');
  const repositoryStat = lstatSync(repositoryPath);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    fail('repository path must be a direct directory');
  }
  const repository = realpathSync(repositoryPath);
  return Object.freeze(
    pinnedExampleTree(repository, authority, reviewedGit).exampleLeaves.map((entry) =>
      Object.freeze({
        path: entry.path,
        gitMode: entry.mode as NestExampleTreeLeafReference['gitMode'],
        gitBlobSha1: entry.sha,
      })),
  );
}

export interface NestExampleRawBlobReference {
  readonly path: string;
  readonly gitBlobSha1: string;
}

/**
 * Derive the exact 160-object raw acquisition set from the pinned tree closure.
 * Shared example-tree content selects its lexicographically first path, the
 * external documentation selector remains disjoint, and the final order is by
 * Git identity then path. The retained digest prevents a caller from silently
 * substituting another 160-row projection of the same structural repository.
 */
export function nestExampleRawBlobReferences(
  repositoryPath: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): readonly NestExampleRawBlobReference[] {
  const authority = PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY;
  if (!path.isAbsolute(repositoryPath)) fail('repository path must be absolute');
  const repositoryStat = lstatSync(repositoryPath);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    fail('repository path must be a direct directory');
  }
  const repository = realpathSync(repositoryPath);
  const { allLeaves, exampleLeaves } = pinnedExampleTree(
    repository,
    authority,
    reviewedGit,
  );
  const documentation = objectAt(allLeaves, authority.documentationIndex.path);
  const byIdentity = new Map<string, NestExampleRawBlobReference>();
  for (const entry of [...exampleLeaves, documentation]) {
    const existing = byIdentity.get(entry.sha);
    if (existing === undefined || compareText(entry.path, existing.path) < 0) {
      byIdentity.set(entry.sha, Object.freeze({
        path: entry.path,
        gitBlobSha1: entry.sha,
      }));
    }
  }
  const references = Object.freeze(
    [...byIdentity.values()].sort((left, right) =>
      compareText(left.gitBlobSha1, right.gitBlobSha1) ||
        compareText(left.path, right.path)),
  );
  if (references.length !== NEST_EXAMPLE_UNIQUE_ACQUISITION_BLOB_COUNT) {
    fail('raw blob reference denominator drifted from the exact pinned tree');
  }
  const digest = canonicalDigest({
    domain: NEST_EXAMPLE_RAW_BLOB_REFERENCE_SET_IDENTITY,
    references,
  });
  if (digest !== PINNED_NEST_EXAMPLE_RAW_BLOB_REFERENCE_SET_DIGEST) {
    fail('raw blob reference set drifted from its pinned semantic digest');
  }
  return references;
}

function exactOfflineBlobIdentitySnapshot(
  identities: readonly string[],
): readonly string[] {
  if (
    !Array.isArray(identities) ||
    utilTypes.isProxy(identities) ||
    Object.getPrototypeOf(identities) !== Array.prototype ||
    identities.length < 1 ||
    identities.length > NEST_EXAMPLE_UNIQUE_ACQUISITION_BLOB_COUNT
  ) {
    fail('offline blob read requires one bounded ordinary identity array');
  }
  const snapshot: string[] = [];
  const expectedEnumerableKeys = new Set<string>();
  for (let index = 0; index < identities.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(identities, index);
    if (
      descriptor === undefined ||
      !('value' in descriptor) ||
      descriptor.enumerable !== true ||
      typeof descriptor.value !== 'string' ||
      !SHA1.test(descriptor.value)
    ) {
      fail(`offline blob identity ${index} is not one own-data Git SHA-1`);
    }
    if (
      index > 0 &&
      compareText(snapshot[index - 1]!, descriptor.value) >= 0
    ) {
      fail('offline blob identities must be strictly sorted and deduplicated');
    }
    snapshot.push(descriptor.value);
    expectedEnumerableKeys.add(String(index));
  }
  let enumerableKeyCount = 0;
  for (const key in identities) {
    if (enumerableKeyCount >= identities.length) {
      fail('offline blob identities contain an enumerable extra key');
    }
    enumerableKeyCount++;
    if (key.length > 3 || !expectedEnumerableKeys.has(key)) {
      fail('offline blob identities contain an enumerable extra key');
    }
  }
  if (enumerableKeyCount !== identities.length) {
    fail('offline blob identities omit an enumerable index');
  }
  return Object.freeze(snapshot);
}

/**
 * Read and independently rehash an exact sorted blob set only after configured
 * remotes are absent. `GIT_NO_LAZY_FETCH=1` is present on both the remote check
 * and the content batch, so a missing object is a local failure rather than an
 * implicit promisor transport.
 */
export function readNestExampleGitBlobsOffline(
  offlineReadAuthority: VerifiedOfflineGitReadAuthority,
  requestedGitBlobSha1s: readonly string[],
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): readonly ReviewedGitBlobRecord[] {
  const repository = requireOfflineGitReadAuthority(
    offlineReadAuthority,
    'NEST example offline blob materialization precondition',
    reviewedGit,
  );
  const identities = exactOfflineBlobIdentitySnapshot(requestedGitBlobSha1s);
  const records = readReviewedGitBlobBatch(
    reviewedGit,
    repository,
    controlledGitCommandArguments(repository, ['cat-file', '--batch']),
    gitEnvironment(),
    identities.map((identity) => ({
      objectName: identity,
      expectedGitBlobSha1: identity,
    })),
    {
      outputLimitBytes: MAX_GIT_BATCH_OUTPUT_BYTES,
      timeoutMs: 600_000,
    },
  );
  requireOfflineGitReadAuthority(
    offlineReadAuthority,
    'NEST example offline blob materialization postcondition',
    reviewedGit,
  );
  return records;
}

/** Materialize every unique example-tree blob plus the external docs selector. */
export function materializeNestExampleTreeBlobs(
  repositoryPath: string,
  offlineReadAuthority: VerifiedOfflineGitReadAuthority,
  authority: NestExampleInventoryAuthority = PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): {
  readonly exampleTreeLeafCount: number;
  readonly uniqueExampleTreeGitBlobCount: number;
  readonly acquiredUniqueGitBlobCount: number;
  readonly totalUniqueByteLength: number;
  readonly requestedGitBlobSha1s: readonly string[];
} {
  const authorizedRepository = requireOfflineGitReadAuthority(
    offlineReadAuthority,
    'NEST example tree materialization precondition',
    reviewedGit,
  );
  if (!path.isAbsolute(repositoryPath)) fail('repository path must be absolute');
  const repositoryStat = lstatSync(repositoryPath);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    fail('repository path must be a direct directory');
  }
  const repository = realpathSync(repositoryPath);
  if (authorizedRepository !== repository) {
    fail('offline Git read authority does not bind this materialization repository');
  }
  const { allLeaves, exampleLeaves } = pinnedExampleTree(
    repository,
    authority,
    reviewedGit,
  );
  const documentation = objectAt(allLeaves, authority.documentationIndex.path);
  const uniqueByIdentity = new Map<string, GitLeaf>();
  for (const entry of [documentation, ...exampleLeaves]) {
    if (!uniqueByIdentity.has(entry.sha)) uniqueByIdentity.set(entry.sha, entry);
  }
  const requestedGitBlobSha1s = Object.freeze(
    [...uniqueByIdentity.keys()].sort(compareText),
  );
  const records = readNestExampleGitBlobsOffline(
    offlineReadAuthority,
    requestedGitBlobSha1s,
    reviewedGit,
  );
  const result = Object.freeze({
    exampleTreeLeafCount: exampleLeaves.length,
    uniqueExampleTreeGitBlobCount: new Set(exampleLeaves.map((entry) => entry.sha)).size,
    acquiredUniqueGitBlobCount: records.length,
    totalUniqueByteLength: records.reduce((sum, record) => sum + record.byteLength, 0),
    requestedGitBlobSha1s,
  });
  requireOfflineGitReadAuthority(
    offlineReadAuthority,
    'NEST example tree materialization postcondition',
    reviewedGit,
  );
  return result;
}

/**
 * Verify the bounded repository state used by the generator after its fetch
 * phase. This does not authenticate how the directory was created, so the
 * resulting provenance says only that its temporary-repository shape and
 * offline read authority were checked at inventory time.
 */
export function verifyNestExampleOfflineAcquisitionContext(
  repositoryPath: string,
  temporaryRootPath: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): VerifiedNestExampleAcquisitionContext {
  const snapshot = verifyOfflineGitObjectDatabase(
    repositoryPath,
    temporaryRootPath,
    'NEST example source inventory acquisition',
    reviewedGit,
  );
  const context = Object.freeze({
    [VERIFIED_ACQUISITION_CONTEXT]: true as const,
    repository: snapshot.repository,
    temporaryRoot: snapshot.temporaryRoot,
  });
  VERIFIED_ACQUISITION_CONTEXTS.set(context, snapshot);
  return context;
}

/**
 * Build and verify the source inventory from an already-fetched local Git object
 * database. The repository is read through plumbing commands; no checkout or
 * upstream code execution is required.
 */
export function buildNestExampleSourceInventory(
  repositoryPath: string,
  authority: NestExampleInventoryAuthority = PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
  acquisitionContext?: VerifiedNestExampleAcquisitionContext,
  acquisitionProducerProfile?: typeof NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): NestExampleSourceInventory {
  if (!path.isAbsolute(repositoryPath)) fail('repository path must be absolute');
  const repositoryStat = lstatSync(repositoryPath);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    fail('repository path must be a direct directory');
  }
  const repository = realpathSync(repositoryPath);
  let verifiedAcquisition = false;
  let acquisitionSnapshot: OfflineGitObjectDatabaseSnapshot | undefined;
  if (acquisitionContext !== undefined) {
    acquisitionSnapshot = VERIFIED_ACQUISITION_CONTEXTS.get(acquisitionContext);
    if (
      acquisitionContext[VERIFIED_ACQUISITION_CONTEXT] !== true ||
      acquisitionContext.repository !== repository ||
      acquisitionSnapshot === undefined
    ) {
      fail('verified acquisition context does not bind this repository');
    }
    const currentSnapshot = verifyOfflineGitObjectDatabase(
      acquisitionContext.repository,
      acquisitionContext.temporaryRoot,
      'NEST example source inventory acquisition',
      reviewedGit,
    );
    if (!sameOfflineGitObjectDatabase(acquisitionSnapshot, currentSnapshot)) {
      fail('verified acquisition repository identity changed before inventory reads');
    }
    verifiedAcquisition = true;
  }
  if (
    acquisitionProducerProfile !== undefined &&
    (acquisitionProducerProfile !== NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE ||
      !verifiedAcquisition)
  ) {
    fail(
      'acquisition producer profile is unsupported or lacks verified repository authority',
    );
  }
  const { allLeaves: leaves, exampleLeaves } = pinnedExampleTree(
    repository,
    authority,
    reviewedGit,
  );
  const documentationEntry = objectAt(leaves, authority.documentationIndex.path);
  const uniqueAcquisitionEntries = new Map<string, GitLeaf>();
  for (const entry of [documentationEntry, ...exampleLeaves]) {
    if (!uniqueAcquisitionEntries.has(entry.sha)) {
      uniqueAcquisitionEntries.set(entry.sha, entry);
    }
  }
  const batchRecords = readReviewedGitBlobBatch(
    reviewedGit,
    repository,
    controlledGitCommandArguments(repository, ['cat-file', '--batch']),
    { ...gitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
    [...uniqueAcquisitionEntries.values()].map((entry) => ({
      objectName: entry.sha,
      expectedGitBlobSha1: entry.sha,
    })),
    { outputLimitBytes: MAX_GIT_BATCH_OUTPUT_BYTES, timeoutMs: 600_000 },
  );
  const recordByGitIdentity = new Map<string, ReviewedGitBlobRecord>(
    batchRecords.map((record) => [record.gitBlobSha1, record]),
  );
  if (recordByGitIdentity.size !== uniqueAcquisitionEntries.size) {
    fail('batched Git blob inventory does not preserve every unique identity');
  }
  const bytesByPath = new Map<string, Buffer>();
  for (const entry of [documentationEntry, ...exampleLeaves]) {
    const record = recordByGitIdentity.get(entry.sha) ??
      fail(`batched Git blob ${entry.path} is absent`);
    bytesByPath.set(entry.path, record.copyBytes());
  }

  const pythonEntries = leaves.filter(
    (entry) =>
      entry.path.startsWith(`${authority.exampleRoot}/`) &&
      entry.path.endsWith('.py'),
  );
  const regularPythonEntries = pythonEntries.filter((entry) =>
    entry.mode === '100644' || entry.mode === '100755');
  const symlinkPythonEntries = pythonEntries.filter((entry) => entry.mode === '120000');
  for (const entry of pythonEntries) {
    assertSafeRepositoryPath(entry.path, 'Python source path');
  }
  if (
    pythonEntries.some((entry) =>
      entry.type !== 'blob' || !['100644', '100755', '120000'].includes(entry.mode))
  ) {
    fail('Python source universe contains a non-blob or unsupported Git mode');
  }

  countExpected(
    pythonEntries.length,
    authority.expected.pythonPathEntryCount,
    'Python path-entry count',
  );
  countExpected(
    regularPythonEntries.length,
    authority.expected.regularPythonFileCount,
    'regular Python body count',
  );
  countExpected(
    symlinkPythonEntries.length,
    authority.expected.pythonSymlinkCount,
    'Python symlink count',
  );
  countExpected(
    regularPythonEntries.filter((entry) => entry.mode === '100755').length,
    authority.expected.regularExecutablePythonFileCount,
    'executable regular Python count',
  );
  countExpected(
    regularPythonEntries.filter((entry) => entry.mode === '100644').length,
    authority.expected.regularNonExecutablePythonFileCount,
    'non-executable regular Python count',
  );

  const sourceIdByPath = new Map(
    pythonEntries.map((entry) => [entry.path, sourceId(authority.commit, entry)]),
  );
  const { aliases, aliasTargetByPath } = resolveAliases(
    bytesByPath,
    authority,
    pythonEntries,
    sourceIdByPath,
  );

  const regularPythonPathSet = new Set(regularPythonEntries.map((entry) => entry.path));
  const docs = deriveDocumentationSelection(
    utf8(
      blob(bytesByPath, authority.documentationIndex.path),
      'documentation index',
    ),
    regularPythonPathSet,
    authority,
  );
  const runnerSource = utf8(
    blob(bytesByPath, authority.runner.path),
    'example runner',
  );
  assertRunnerSource(runnerSource, authority);
  const runner = deriveRunnerSelection(pythonEntries, aliasTargetByPath, authority);

  const docsSet = new Set(docs.directPythonPaths);
  const runnerCandidateSet = new Set(runner.candidatePaths);
  const runnerSkippedSet = new Set(runner.skippedPaths);
  const runnerExecutedSet = new Set(runner.executedPaths);
  const runnerCanonicalSet = new Set(runner.executedCanonicalPaths);
  const runnerSkippedCanonicalSet = new Set(
    runner.skippedPaths.map((item) => aliasTargetByPath.get(item) ?? item),
  );
  const primaryPathSet = new Set([
    ...docs.directPythonPaths,
    ...runner.executedCanonicalPaths,
  ]);
  countExpected(
    primaryPathSet.size,
    authority.expected.canonicalPrimaryBodyCount,
    'canonical primary-body count',
  );
  const supportPaths = regularPythonEntries
    .map((entry) => entry.path)
    .filter((entryPath) => !primaryPathSet.has(entryPath));
  countExpected(
    supportPaths.length,
    authority.expected.supportOrCoordinatedBodyCount,
    'support/coordinated body count',
  );
  const supportPathSet = new Set(supportPaths);
  for (const coordinatedPath of authority.coordinatedComponentPaths) {
    if (!supportPathSet.has(coordinatedPath)) {
      fail(`coordinated component ${coordinatedPath} is not in the support-body remainder`);
    }
  }
  const coordinatedPathSet = new Set(authority.coordinatedComponentPaths);

  const aliasPathSet = new Set(aliases.map((alias) => alias.aliasPath));
  const sourcePaths: NestExampleSourcePath[] = pythonEntries.map((entry) => {
    const content = recordByGitIdentity.get(entry.sha) ??
      fail(`source content for ${entry.path} is absent`);
    const aliasTarget = aliasTargetByPath.get(entry.path);
    const canonicalPath = aliasTarget ?? entry.path;
    const entrySourceId = sourceIdByPath.get(entry.path);
    const canonicalSourceId = sourceIdByPath.get(canonicalPath);
    if (!entrySourceId || !canonicalSourceId) {
      return fail(`source identity for ${entry.path} is absent`);
    }
    const actualMembership: (
      'docs_direct' | 'runner_candidate' | 'runner_default' | 'runner_skipped'
    )[] = [];
    if (docsSet.has(entry.path)) actualMembership.push('docs_direct');
    if (runnerCandidateSet.has(entry.path)) actualMembership.push('runner_candidate');
    if (runnerExecutedSet.has(entry.path)) actualMembership.push('runner_default');
    if (runnerSkippedSet.has(entry.path)) actualMembership.push('runner_skipped');

    const canonicalMembership: ('docs_direct' | 'runner_default' | 'runner_skipped')[] = [];
    if (docsSet.has(canonicalPath)) canonicalMembership.push('docs_direct');
    if (runnerCanonicalSet.has(canonicalPath)) canonicalMembership.push('runner_default');
    if (runnerSkippedCanonicalSet.has(canonicalPath)) canonicalMembership.push('runner_skipped');

    let role: NestExampleSourcePath['role'];
    if (aliasPathSet.has(entry.path)) role = 'orchestration_alias';
    else if (primaryPathSet.has(entry.path)) role = 'official_entrypoint';
    else if (coordinatedPathSet.has(entry.path)) role = 'coordinated_component';
    else role = 'support_module';

    return {
      sourceId: entrySourceId,
      path: entry.path,
      pathBytesBase64: entry.pathBytesBase64,
      gitMode: entry.mode as NestExampleSourcePath['gitMode'],
      gitBlobSha1: entry.sha,
      byteLength: content.byteLength,
      sha256: content.sha256,
      kind: entry.mode === '120000' ? 'python_symlink' : 'regular_python',
      role,
      canonicalSourceId,
      selectorMembership: membership(actualMembership, [
        'docs_direct',
        'runner_candidate',
        'runner_default',
        'runner_skipped',
      ]),
      canonicalSelectorMembership: membership(canonicalMembership, [
        'docs_direct',
        'runner_default',
        'runner_skipped',
      ]),
    };
  });

  const aliasesByTarget = new Map<string, string[]>();
  for (const alias of aliases) {
    const targetAliases = aliasesByTarget.get(alias.resolvedTargetPath) ?? [];
    targetAliases.push(alias.aliasPath);
    aliasesByTarget.set(alias.resolvedTargetPath, targetAliases);
  }
  const runnerSelectedByCanonical = new Map<string, string[]>();
  for (const selectedPath of runner.executedPaths) {
    const canonicalPath = aliasTargetByPath.get(selectedPath) ?? selectedPath;
    const selected = runnerSelectedByCanonical.get(canonicalPath) ?? [];
    selected.push(selectedPath);
    runnerSelectedByCanonical.set(canonicalPath, selected);
  }

  const entrypoints: NestExampleEntrypoint[] = [...primaryPathSet]
    .sort(compareText)
    .map((canonicalPath) => {
      const canonicalSourceId = sourceIdByPath.get(canonicalPath);
      if (!canonicalSourceId) return fail(`entrypoint source ${canonicalPath} is absent`);
      const documentationSelectedPaths = docsSet.has(canonicalPath) ? [canonicalPath] : [];
      const runnerSelectedPaths = sortedUnique(
        runnerSelectedByCanonical.get(canonicalPath) ?? [],
      );
      const selectorMembership: ('docs_direct' | 'runner_default')[] = [];
      if (documentationSelectedPaths.length > 0) selectorMembership.push('docs_direct');
      if (runnerSelectedPaths.length > 0) selectorMembership.push('runner_default');
      return {
        entrypointId: identity('cortexel.nest-example.entrypoint.v1', {
          commit: authority.commit,
          canonicalSourceId,
          selectorMembership,
        }),
        canonicalSourceId,
        canonicalPath,
        aliasPaths: sortedUnique(aliasesByTarget.get(canonicalPath) ?? []),
        selectorMembership,
        documentationSelectedPaths,
        runnerSelectedPaths,
      };
    });
  const entrypointByPath = new Map(
    entrypoints.map((entrypoint) => [entrypoint.canonicalPath, entrypoint]),
  );

  // A documentation reference selects a source body; it does not define a
  // process invocation. Keep that evidence on the entrypoint row so a docs link
  // cannot inflate the executable-invocation denominator.
  const invocationProfiles: NestExampleInvocationProfile[] = [];
  for (const selectedPath of runner.executedPaths) {
    const canonicalPath = aliasTargetByPath.get(selectedPath) ?? selectedPath;
    const entrypoint = entrypointByPath.get(canonicalPath);
    if (!entrypoint) fail(`runner entrypoint ${canonicalPath} is absent`);
    const profile = {
      entrypointId: entrypoint.entrypointId,
      profile: 'runner_agg_default' as const,
      selectedPath,
      argv: [authority.runner.pythonCommand, POSIX.basename(selectedPath)],
      cwd: POSIX.dirname(selectedPath),
      environment: [
        { name: 'MPLBACKEND', value: authority.runner.matplotlibBackend },
        { name: 'NEST_DATA_PATH', value: '<runner-output-directory>' },
      ],
      executionState: 'definition_only_not_run' as const,
      targetEffect: 'executes_upstream_code_if_invoked' as const,
      authorityPath: authority.runner.path,
      authorityGitBlobSha1: authority.runner.gitBlobSha1,
    };
    invocationProfiles.push({
      invocationId: identity('cortexel.nest-example.invocation.v1', profile),
      ...profile,
    });
  }
  invocationProfiles.sort((left, right) =>
    compareText(left.invocationId, right.invocationId));

  const assetEntries = exampleLeaves.filter((entry) =>
    /\.(?:png|gif|svg)$/u.test(entry.path));
  for (const entry of assetEntries) {
    assertSafeRepositoryPath(entry.path, 'visual-asset path');
  }
  const assetCounts = { png: 0, gif: 0, svg: 0 };
  const visualAssets: NestExampleVisualAsset[] = assetEntries.map((entry) => {
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) {
      return fail(`visual asset ${entry.path} is not a regular Git blob`);
    }
    const content = recordByGitIdentity.get(entry.sha) ??
      fail(`visual-asset content for ${entry.path} is absent`);
    const extension = POSIX.extname(entry.path).slice(1) as 'png' | 'gif' | 'svg';
    assetCounts[extension]++;
    return {
      assetId: identity('cortexel.nest-example.visual-asset.v1', {
        commit: authority.commit,
        path: entry.path,
        gitMode: entry.mode,
        gitBlobSha1: entry.sha,
      }),
      path: entry.path,
      pathBytesBase64: entry.pathBytesBase64,
      gitMode: entry.mode,
      gitBlobSha1: entry.sha,
      byteLength: content.byteLength,
      sha256: content.sha256,
      extension,
      role: 'checked_in_upstream_visual_asset',
    };
  });
  countExpected(
    visualAssets.length,
    authority.expected.visualAssetPathEntryCount,
    'visual-asset path count',
  );
  for (const extension of ['png', 'gif', 'svg'] as const) {
    countExpected(
      assetCounts[extension],
      authority.expected.visualAssetCountsByExtension[extension],
      `${extension.toUpperCase()} visual-asset count`,
    );
  }

  const pythonPathSet = new Set(pythonEntries.map((entry) => entry.path));
  const assetPathSet = new Set(assetEntries.map((entry) => entry.path));
  const auxiliaryEntries = exampleLeaves.filter((entry) =>
    !pythonPathSet.has(entry.path) && !assetPathSet.has(entry.path));
  const auxiliaryCounts: Record<NestExampleAuxiliaryLeaf['role'], number> = {
    build_orchestration: 0,
    documentation: 0,
    example_input: 0,
    runner_orchestration: 0,
  };
  const auxiliaryLeaves: NestExampleAuxiliaryLeaf[] = auxiliaryEntries.map((entry) => {
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) {
      return fail(`auxiliary leaf ${entry.path} is not a regular Git blob`);
    }
    const role = classifyAuxiliaryLeafPath(entry.path, authority);
    if (role === null) {
      return fail(`auxiliary leaf ${entry.path} has no closed role classification`);
    }
    auxiliaryCounts[role]++;
    const content = recordByGitIdentity.get(entry.sha) ??
      fail(`auxiliary content for ${entry.path} is absent`);
    return {
      auxiliaryId: identity('cortexel.nest-example.auxiliary-leaf.v1', {
        commit: authority.commit,
        path: entry.path,
        gitMode: entry.mode,
        gitBlobSha1: entry.sha,
        role,
      }),
      path: entry.path,
      pathBytesBase64: entry.pathBytesBase64,
      gitMode: entry.mode as NestExampleAuxiliaryLeaf['gitMode'],
      gitBlobSha1: entry.sha,
      byteLength: content.byteLength,
      sha256: content.sha256,
      role,
    };
  });
  countExpected(
    auxiliaryLeaves.length,
    authority.expected.auxiliaryLeafCount,
    'auxiliary leaf count',
  );
  for (const role of Object.keys(auxiliaryCounts) as NestExampleAuxiliaryLeaf['role'][]) {
    countExpected(
      auxiliaryCounts[role],
      authority.expected.auxiliaryLeafCountsByRole[role],
      `${role} auxiliary leaf count`,
    );
  }
  const completeTreePaths = [
    ...sourcePaths.map((entry) => entry.path),
    ...visualAssets.map((entry) => entry.path),
    ...auxiliaryLeaves.map((entry) => entry.path),
  ];
  if (
    new Set(completeTreePaths).size !== exampleLeaves.length ||
    completeTreePaths.length !== exampleLeaves.length ||
    exampleLeaves.some((entry) => !completeTreePaths.includes(entry.path))
  ) {
    fail('Python, visual-asset, and auxiliary rows do not partition the example tree');
  }

  const core = {
    protocol: 'cortexel-nest-example-source-inventory' as const,
    protocolVersion: 2 as const,
    identityAlgorithm: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
    predecessor: NEST_EXAMPLE_SOURCE_INVENTORY_V1_PREDECESSOR,
    upstream: {
      project: authority.project,
      release: authority.release,
      repository: authority.repository,
      commit: authority.commit,
      rootTreeGitSha1: authority.rootTreeGitSha1,
      exampleRoot: authority.exampleRoot,
    },
    acquisition: {
      producerProfile: acquisitionProducerProfile ??
        UNDECLARED_ACQUISITION_PRODUCER_PROFILE,
      repositoryContext: verifiedAcquisition
        ? 'temporary_repository_shape_verified' as const
        : 'caller_supplied_repository_unverified' as const,
      upstreamCodeExecutedByInventoryBuilder: false as const,
      inventoryReadAuthority: verifiedAcquisition
        ? 'local_git_object_database_no_configured_remote_or_alternates' as const
        : 'not_asserted' as const,
    },
    authorityFiles: {
      documentationIndex: {
        path: authority.documentationIndex.path,
        gitMode: authority.documentationIndex.gitMode,
        gitBlobSha1: authority.documentationIndex.gitBlobSha1,
      },
      runner: {
        path: authority.runner.path,
        gitMode: authority.runner.gitMode,
        gitBlobSha1: authority.runner.gitBlobSha1,
      },
      orchestrationCmake: authority.orchestrationCmake,
    },
    documentationSelector: {
      docDirectiveCount: docs.directiveCount,
      directPythonPaths: docs.directPythonPaths,
      groupTargets: docs.groupTargets,
      externalTargets: docs.externalTargets,
    },
    runnerSelector: {
      candidatePaths: runner.candidatePaths,
      skippedPaths: runner.skippedPaths,
      executedPaths: runner.executedPaths,
      executedCanonicalPaths: runner.executedCanonicalPaths,
      skipBasenames: [...authority.runner.skipBasenames],
      pythonCommand: authority.runner.pythonCommand,
      matplotlibBackend: authority.runner.matplotlibBackend,
    },
    sourcePaths,
    aliases,
    entrypoints,
    invocationProfiles,
    visualAssets,
    auxiliaryLeaves,
    summary: {
      pythonPathEntryCount: pythonEntries.length,
      regularPythonFileCount: regularPythonEntries.length,
      pythonSymlinkCount: symlinkPythonEntries.length,
      regularExecutablePythonFileCount:
        regularPythonEntries.filter((entry) => entry.mode === '100755').length,
      regularNonExecutablePythonFileCount:
        regularPythonEntries.filter((entry) => entry.mode === '100644').length,
      documentedDirectPythonBodyCount: docs.directPythonPaths.length,
      runnerCandidatePathCount: runner.candidatePaths.length,
      runnerExecutedPathCount: runner.executedPaths.length,
      runnerExecutedCanonicalBodyCount: runner.executedCanonicalPaths.length,
      canonicalPrimaryBodyCount: entrypoints.length,
      supportOrCoordinatedBodyCount: supportPaths.length,
      runnerAggProfileCount:
        invocationProfiles.filter((profile) =>
          profile.profile === 'runner_agg_default').length,
      visualAssetPathEntryCount: visualAssets.length,
      visualAssetCountsByExtension: assetCounts,
      exampleTreeLeafCount: exampleLeaves.length,
      uniqueExampleTreeGitBlobCount:
        new Set(exampleLeaves.map((entry) => entry.sha)).size,
      auxiliaryLeafCount: auxiliaryLeaves.length,
      auxiliaryLeafCountsByRole: auxiliaryCounts,
    },
  };
  const inventory = {
    ...core,
    inventoryDigest: canonicalDigest({
      domain: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
      inventory: core,
    }),
  };
  if (acquisitionSnapshot !== undefined && acquisitionContext !== undefined) {
    const currentSnapshot = verifyOfflineGitObjectDatabase(
      acquisitionContext.repository,
      acquisitionContext.temporaryRoot,
      'NEST example source inventory acquisition',
      reviewedGit,
    );
    if (!sameOfflineGitObjectDatabase(acquisitionSnapshot, currentSnapshot)) {
      fail('verified acquisition repository identity changed during inventory reads');
    }
  }
  return inventory;
}

export function canonicalNestExampleSourceInventory(
  inventory: NestExampleSourceInventory,
): string {
  return canonicalize(inventory);
}

type UnknownRecord = Record<string, unknown>;

function unknownRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const record = unknownRecord(entry);
        return record === null ? [] : [record];
      })
    : [];
}

function canonicalMatches(left: unknown, right: unknown): boolean {
  try {
    return canonicalize(left as JsonValue) === canonicalize(right as JsonValue);
  } catch {
    return false;
  }
}

function exactDataKeys(
  record: UnknownRecord,
  expectedKeys: readonly string[],
  label: string,
  problems: string[],
): boolean {
  let keys: readonly (string | symbol)[];
  try {
    keys = Reflect.ownKeys(record);
  } catch {
    problems.push(`${label} members cannot be inspected safely`);
    return false;
  }
  const actual: string[] = [];
  for (const key of keys) {
    if (typeof key !== 'string') {
      problems.push(`${label} must not contain symbol members`);
      return false;
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(record, key);
    } catch {
      problems.push(`${label}.${key} cannot be inspected safely`);
      return false;
    }
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      problems.push(`${label}.${key} must be an enumerable data property`);
      return false;
    }
    actual.push(key);
  }
  if (!canonicalMatches(actual.sort(), [...expectedKeys].sort())) {
    problems.push(`${label} does not have its exact closed member set`);
    return false;
  }
  return true;
}

function validationIdentity(
  domain: string,
  payload: unknown,
): string | null {
  try {
    return identity(domain, payload as JsonValue);
  } catch {
    return null;
  }
}

function validateSortedUniqueField(
  rows: readonly UnknownRecord[],
  field: string,
  label: string,
  problems: string[],
): void {
  let previous: string | null = null;
  for (const [index, row] of rows.entries()) {
    const value = row[field];
    if (typeof value !== 'string') {
      problems.push(`${label}[${index}].${field} is not a string`);
      continue;
    }
    if (previous !== null && previous >= value) {
      problems.push(`${label} must be strictly sorted and unique by ${field}`);
      return;
    }
    previous = value;
  }
}

/**
 * Pure verification of a checked-in source inventory. This establishes only the
 * pinned source/selector denominator and its retained content digests. It does
 * not execute NEST, close runtime dependencies, classify every visualization
 * definition, inventory emitted outputs, or certify a Cortexel mapping.
 */
export function validateNestExampleSourceInventory(
  value: unknown,
): readonly string[] {
  const problems: string[] = [];
  const inventory = unknownRecord(value);
  if (inventory === null) return ['source inventory root must be an object'];
  exactDataKeys(inventory, [
    'protocol',
    'protocolVersion',
    'identityAlgorithm',
    'predecessor',
    'upstream',
    'acquisition',
    'authorityFiles',
    'documentationSelector',
    'runnerSelector',
    'sourcePaths',
    'aliases',
    'entrypoints',
    'invocationProfiles',
    'visualAssets',
    'auxiliaryLeaves',
    'summary',
    'inventoryDigest',
  ], 'source inventory root', problems);

  const {
    inventoryDigest,
    ...core
  } = inventory;
  let recomputedDigest: string | null = null;
  try {
    recomputedDigest = canonicalDigest({
      domain: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
      inventory: core as JsonValue,
    });
  } catch {
    problems.push('source inventory is not RFC 8785 canonicalizable JSON');
  }
  if (inventoryDigest !== recomputedDigest) {
    problems.push('source inventory digest does not bind its complete semantic projection');
  }
  if (inventoryDigest !== PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST) {
    problems.push('source inventory digest does not equal the reviewed pinned NEST v3.10 inventory');
  }

  const expectedUpstream = {
    project: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.project,
    release: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.release,
    repository: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.repository,
    commit: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
    rootTreeGitSha1:
      PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.rootTreeGitSha1,
    exampleRoot: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.exampleRoot,
  };
  if (!canonicalMatches(inventory.upstream, expectedUpstream)) {
    problems.push('source inventory upstream authority does not equal the closed pin');
  }
  if (!canonicalMatches(inventory.acquisition, {
    producerProfile: NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
    repositoryContext: 'temporary_repository_shape_verified',
    upstreamCodeExecutedByInventoryBuilder: false,
    inventoryReadAuthority:
      'local_git_object_database_no_configured_remote_or_alternates',
  })) {
    problems.push(
      'checked-in source inventory lacks the closed acquisition producer profile or verified offline acquisition shape',
    );
  }
  if (
    inventory.protocol !== 'cortexel-nest-example-source-inventory' ||
    inventory.protocolVersion !== 2 ||
    inventory.identityAlgorithm !== NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY
  ) {
    problems.push('source inventory protocol identity is not the closed V2 identity');
  }
  if (!canonicalMatches(
    inventory.predecessor,
    NEST_EXAMPLE_SOURCE_INVENTORY_V1_PREDECESSOR,
  )) {
    problems.push(
      'source inventory V1 predecessor identity drifted or transferred evidence',
    );
  }

  const sources = records(inventory.sourcePaths);
  const aliases = records(inventory.aliases);
  const entrypoints = records(inventory.entrypoints);
  const invocations = records(inventory.invocationProfiles);
  const assets = records(inventory.visualAssets);
  const auxiliary = records(inventory.auxiliaryLeaves);
  validateSortedUniqueField(sources, 'path', 'sourcePaths', problems);
  validateSortedUniqueField(aliases, 'aliasPath', 'aliases', problems);
  validateSortedUniqueField(entrypoints, 'canonicalPath', 'entrypoints', problems);
  validateSortedUniqueField(invocations, 'invocationId', 'invocationProfiles', problems);
  validateSortedUniqueField(assets, 'path', 'visualAssets', problems);
  validateSortedUniqueField(auxiliary, 'path', 'auxiliaryLeaves', problems);

  const contentByGitIdentity = new Map<string, string>();
  const validateLeafContent = (
    row: UnknownRecord,
    label: string,
  ): void => {
    if (
      !Number.isSafeInteger(row.byteLength) ||
      typeof row.byteLength !== 'number' ||
      row.byteLength < 0 ||
      row.byteLength > MAX_GIT_BATCH_OUTPUT_BYTES ||
      typeof row.sha256 !== 'string' ||
      !SHA256.test(row.sha256) ||
      typeof row.gitBlobSha1 !== 'string' ||
      !SHA1.test(row.gitBlobSha1)
    ) {
      problems.push(`${label} has invalid independently bound content metadata`);
      return;
    }
    const binding = `${String(row.byteLength)}:${row.sha256}`;
    const existing = contentByGitIdentity.get(row.gitBlobSha1);
    if (existing !== undefined && existing !== binding) {
      problems.push(`${label} disagrees with another path sharing its Git blob identity`);
    } else {
      contentByGitIdentity.set(row.gitBlobSha1, binding);
    }
  };

  const sourceById = new Map<string, UnknownRecord>();
  const sourceByPath = new Map<string, UnknownRecord>();
  const sourceRoles = new Set([
    'official_entrypoint',
    'support_module',
    'coordinated_component',
    'orchestration_alias',
  ]);
  for (const source of sources) {
    exactDataKeys(source, [
      'sourceId',
      'path',
      'pathBytesBase64',
      'gitMode',
      'gitBlobSha1',
      'byteLength',
      'sha256',
      'kind',
      'role',
      'canonicalSourceId',
      'selectorMembership',
      'canonicalSelectorMembership',
    ], `source ${JSON.stringify(source.path)}`, problems);
    validateLeafContent(source, `source ${JSON.stringify(source.path)}`);
    const pathValue = source.path;
    const idValue = source.sourceId;
    if (typeof pathValue !== 'string' || typeof idValue !== 'string') continue;
    if (sourceById.has(idValue) || sourceByPath.has(pathValue)) {
      problems.push('source inventory contains a duplicate source identity or path');
      continue;
    }
    sourceById.set(idValue, source);
    sourceByPath.set(pathValue, source);
    const expectedId = validationIdentity('cortexel.nest-example.source.v1', {
      commit: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
      path: pathValue,
      gitMode: source.gitMode as JsonValue,
      gitBlobSha1: source.gitBlobSha1 as JsonValue,
    });
    if (idValue !== expectedId) {
      problems.push(`source ${JSON.stringify(pathValue)} has a mismatched identity`);
    }
    if (
      typeof source.pathBytesBase64 !== 'string' ||
      Buffer.from(pathValue, 'utf8').toString('base64') !== source.pathBytesBase64
    ) {
      problems.push(`source ${JSON.stringify(pathValue)} path bytes are not bound exactly`);
    }
    const symlink = source.gitMode === '120000';
    if (
      !pathValue.startsWith(
        `${PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.exampleRoot}/`,
      ) ||
      !pathValue.endsWith('.py') ||
      !SAFE_PATH.test(pathValue) ||
      !['100644', '100755', '120000'].includes(String(source.gitMode)) ||
      !sourceRoles.has(String(source.role)) ||
      (symlink &&
        (source.kind !== 'python_symlink' ||
          source.role !== 'orchestration_alias')) ||
      (!symlink && source.kind !== 'regular_python')
    ) {
      problems.push(`source ${JSON.stringify(pathValue)} mode, kind, and role disagree`);
    }
  }

  for (const alias of aliases) {
    const expectedId = validationIdentity('cortexel.nest-example.alias.v1', {
      commit: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
      aliasPath: alias.aliasPath as JsonValue,
      aliasGitBlobSha1: sourceById.get(String(alias.aliasSourceId))
        ?.gitBlobSha1 as JsonValue,
      targetLiteral: alias.targetLiteral as JsonValue,
      resolvedTargetPath: alias.resolvedTargetPath as JsonValue,
    });
    if (alias.aliasId !== expectedId) {
      problems.push(`alias ${JSON.stringify(alias.aliasPath)} has a mismatched identity`);
    }
    const aliasSource = sourceById.get(String(alias.aliasSourceId));
    const canonicalSource = sourceById.get(String(alias.canonicalSourceId));
    if (
      aliasSource?.path !== alias.aliasPath ||
      canonicalSource?.path !== alias.resolvedTargetPath ||
      aliasSource?.canonicalSourceId !== alias.canonicalSourceId
    ) {
      problems.push(`alias ${JSON.stringify(alias.aliasPath)} does not close over its source rows`);
    }
  }

  const entrypointById = new Map<string, UnknownRecord>();
  for (const entrypoint of entrypoints) {
    const expectedId = validationIdentity('cortexel.nest-example.entrypoint.v1', {
      commit: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
      canonicalSourceId: entrypoint.canonicalSourceId as JsonValue,
      selectorMembership: entrypoint.selectorMembership as JsonValue,
    });
    if (entrypoint.entrypointId !== expectedId) {
      problems.push(`entrypoint ${JSON.stringify(entrypoint.canonicalPath)} has a mismatched identity`);
    }
    const source = sourceById.get(String(entrypoint.canonicalSourceId));
    if (
      source?.path !== entrypoint.canonicalPath ||
      source?.kind !== 'regular_python' ||
      source?.role !== 'official_entrypoint'
    ) {
      problems.push(`entrypoint ${JSON.stringify(entrypoint.canonicalPath)} does not bind a canonical source body`);
    }
    if (typeof entrypoint.entrypointId === 'string') {
      if (entrypointById.has(entrypoint.entrypointId)) {
        problems.push('entrypoint inventory contains a duplicate identity');
      }
      entrypointById.set(entrypoint.entrypointId, entrypoint);
    }
  }

  for (const invocation of invocations) {
    const { invocationId, ...profile } = invocation;
    if (
      invocation.profile !== 'runner_agg_default' ||
      invocation.executionState !== 'definition_only_not_run' ||
      invocation.targetEffect !== 'executes_upstream_code_if_invoked'
    ) {
      problems.push('invocation inventory admits a non-executable documentation selector or unknown profile');
    }
    if (!entrypointById.has(String(invocation.entrypointId))) {
      problems.push(`invocation ${JSON.stringify(invocationId)} references a missing entrypoint`);
    }
    if (
      invocationId !==
      validationIdentity('cortexel.nest-example.invocation.v1', profile)
    ) {
      problems.push(`invocation ${JSON.stringify(invocationId)} has a mismatched identity`);
    }
  }

  const assetCounts = { png: 0, gif: 0, svg: 0 };
  for (const asset of assets) {
    exactDataKeys(asset, [
      'assetId',
      'path',
      'pathBytesBase64',
      'gitMode',
      'gitBlobSha1',
      'byteLength',
      'sha256',
      'extension',
      'role',
    ], `visual asset ${JSON.stringify(asset.path)}`, problems);
    validateLeafContent(asset, `visual asset ${JSON.stringify(asset.path)}`);
    const expectedId = validationIdentity('cortexel.nest-example.visual-asset.v1', {
      commit: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
      path: asset.path as JsonValue,
      gitMode: asset.gitMode as JsonValue,
      gitBlobSha1: asset.gitBlobSha1 as JsonValue,
    });
    if (asset.assetId !== expectedId) {
      problems.push(`visual asset ${JSON.stringify(asset.path)} has a mismatched identity`);
    }
    if (
      typeof asset.path !== 'string' ||
      typeof asset.pathBytesBase64 !== 'string' ||
      Buffer.from(asset.path, 'utf8').toString('base64') !== asset.pathBytesBase64
    ) {
      problems.push(`visual asset ${JSON.stringify(asset.path)} path bytes are not bound exactly`);
    }
    const extension = typeof asset.path === 'string'
      ? POSIX.extname(asset.path).slice(1)
      : '';
    if (
      typeof asset.path !== 'string' ||
      !asset.path.startsWith(
        `${PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.exampleRoot}/`,
      ) ||
      !SAFE_PATH.test(asset.path) ||
      !['png', 'gif', 'svg'].includes(extension) ||
      asset.extension !== extension ||
      asset.role !== 'checked_in_upstream_visual_asset' ||
      !['100644', '100755'].includes(String(asset.gitMode))
    ) {
      problems.push(`visual asset ${JSON.stringify(asset.path)} is not a closed classified row`);
    } else {
      assetCounts[extension as keyof typeof assetCounts]++;
    }
  }

  const auxiliaryRoles = new Set([
    'build_orchestration',
    'documentation',
    'example_input',
    'runner_orchestration',
  ]);
  const auxiliaryCounts: Record<NestExampleAuxiliaryLeaf['role'], number> = {
    build_orchestration: 0,
    documentation: 0,
    example_input: 0,
    runner_orchestration: 0,
  };
  for (const leaf of auxiliary) {
    exactDataKeys(leaf, [
      'auxiliaryId',
      'path',
      'pathBytesBase64',
      'gitMode',
      'gitBlobSha1',
      'byteLength',
      'sha256',
      'role',
    ], `auxiliary leaf ${JSON.stringify(leaf.path)}`, problems);
    validateLeafContent(leaf, `auxiliary leaf ${JSON.stringify(leaf.path)}`);
    const expectedId = validationIdentity(
      'cortexel.nest-example.auxiliary-leaf.v1',
      {
        commit: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
        path: leaf.path as JsonValue,
        gitMode: leaf.gitMode as JsonValue,
        gitBlobSha1: leaf.gitBlobSha1 as JsonValue,
        role: leaf.role as JsonValue,
      },
    );
    if (leaf.auxiliaryId !== expectedId) {
      problems.push(`auxiliary leaf ${JSON.stringify(leaf.path)} has a mismatched identity`);
    }
    const classifiedRole = typeof leaf.path === 'string'
      ? classifyAuxiliaryLeafPath(
          leaf.path,
          PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
        )
      : null;
    if (
      typeof leaf.path !== 'string' ||
      typeof leaf.pathBytesBase64 !== 'string' ||
      Buffer.from(leaf.path, 'utf8').toString('base64') !== leaf.pathBytesBase64 ||
      !leaf.path.startsWith(
        `${PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.exampleRoot}/`,
      ) ||
      !SAFE_PATH.test(leaf.path) ||
      !auxiliaryRoles.has(String(leaf.role)) ||
      classifiedRole !== leaf.role ||
      !['100644', '100755'].includes(String(leaf.gitMode))
    ) {
      problems.push(`auxiliary leaf ${JSON.stringify(leaf.path)} is not a closed classified row`);
    } else {
      auxiliaryCounts[leaf.role as NestExampleAuxiliaryLeaf['role']]++;
    }
  }

  if (!canonicalMatches(assetCounts, { png: 9, gif: 2, svg: 1 })) {
    problems.push('visual-asset rows do not derive the exact extension counts');
  }
  if (!canonicalMatches(
    auxiliaryCounts,
    PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.expected.auxiliaryLeafCountsByRole,
  )) {
    problems.push('auxiliary rows do not derive the exact closed role counts');
  }

  const expectedSummary = {
    pythonPathEntryCount: 112,
    regularPythonFileCount: 109,
    pythonSymlinkCount: 3,
    regularExecutablePythonFileCount: 13,
    regularNonExecutablePythonFileCount: 96,
    documentedDirectPythonBodyCount: 90,
    runnerCandidatePathCount: 98,
    runnerExecutedPathCount: 92,
    runnerExecutedCanonicalBodyCount: 92,
    canonicalPrimaryBodyCount: 98,
    supportOrCoordinatedBodyCount: 11,
    runnerAggProfileCount: 92,
    visualAssetPathEntryCount: 12,
    visualAssetCountsByExtension: { png: 9, gif: 2, svg: 1 },
    exampleTreeLeafCount: 162,
    uniqueExampleTreeGitBlobCount: 159,
    auxiliaryLeafCount: 38,
    auxiliaryLeafCountsByRole: {
      build_orchestration: 1,
      documentation: 12,
      example_input: 23,
      runner_orchestration: 2,
    },
  };
  if (!canonicalMatches(inventory.summary, expectedSummary)) {
    problems.push('source inventory summary does not equal the closed pinned counts');
  }
  if (
    sources.length !== 112 ||
    aliases.length !== 3 ||
    entrypoints.length !== 98 ||
    invocations.length !== 92 ||
    assets.length !== 12 ||
    auxiliary.length !== 38
  ) {
    problems.push('source inventory row cardinalities do not equal the closed pinned denominator');
  }
  const completeLeafRows = [...sources, ...assets, ...auxiliary];
  const completeLeafPaths = completeLeafRows.map((row) => row.path);
  const sharedBlobGroups = [...contentByGitIdentity.keys()]
    .map((gitBlobSha1) => ({
      gitBlobSha1,
      paths: completeLeafRows
        .filter((row) => row.gitBlobSha1 === gitBlobSha1)
        .map((row) => row.path)
        .filter((entryPath): entryPath is string => typeof entryPath === 'string')
        .sort(compareText),
    }))
    .filter(({ paths }) => paths.length > 1)
    .sort((left, right) => compareText(left.gitBlobSha1, right.gitBlobSha1));
  if (
    completeLeafRows.length !== 162 ||
    new Set(completeLeafPaths).size !== 162 ||
    contentByGitIdentity.size !== 159
  ) {
    problems.push(
      'source, visual-asset, and auxiliary rows do not form the exact disjoint 162-leaf/159-blob denominator',
    );
  }
  if (!canonicalMatches(sharedBlobGroups, PINNED_NEST_EXAMPLE_SHARED_BLOB_GROUPS)) {
    problems.push('shared Git blob rows do not equal the exact four-path SONATA alias');
  }

  const unique = [...new Set(problems)].sort();
  // Envelope identity and authority failures must survive the bounded
  // diagnostic projection even when a historical or hostile payload also
  // produces hundreds of row-local errors. Otherwise the most actionable
  // reason for rejection can disappear solely because later details sort
  // ahead of it.
  const priority = [
    'source inventory is not RFC 8785 canonicalizable JSON',
    'source inventory digest does not bind its complete semantic projection',
    'source inventory digest does not equal the reviewed pinned NEST v3.10 inventory',
    'source inventory upstream authority does not equal the closed pin',
    'checked-in source inventory lacks the closed acquisition producer profile or verified offline acquisition shape',
    'source inventory protocol identity is not the closed V2 identity',
    'source inventory V1 predecessor identity drifted or transferred evidence',
  ].filter((problem) => unique.includes(problem));
  const prioritized = new Set(priority);
  return [
    ...priority,
    ...unique.filter((problem) => !prioritized.has(problem)),
  ].slice(0, 64);
}
