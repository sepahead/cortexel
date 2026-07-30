/**
 * Deterministic, source-only inventory of the pinned official PyNEST examples.
 *
 * This module never imports PyNEST and never executes an upstream script. It reads
 * immutable Git objects, verifies the pinned authority files, reproduces the
 * documentation and runner selectors, resolves the three orchestration aliases,
 * and emits a closed inventory suitable for later per-output review.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';

import {
  canonicalDigest,
  canonicalize,
  type JsonValue,
} from '../../src/core/canonicalize.js';

const POSIX = path.posix;
const SHA1 = /^[0-9a-f]{40}$/u;
const SAFE_PATH =
  /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._@+,:=-]+(?:\/[A-Za-z0-9._@+,:=-]+)*$/u;
const MAX_GIT_OUTPUT_BYTES = 128 * 1024 * 1024;
const GIT_REPOSITORY_OVERRIDE_ENVIRONMENT = Object.freeze([
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_INDEX_FILE',
  'GIT_GRAFT_FILE',
  'GIT_SHALLOW_FILE',
  'GIT_NAMESPACE',
  'GIT_REPLACE_REF_BASE',
  'GIT_CEILING_DIRECTORIES',
  'GIT_DISCOVERY_ACROSS_FILESYSTEM',
] as const);
const VERIFIED_ACQUISITION_CONTEXT = Symbol('verified NEST inventory acquisition context');

export const NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY =
  'cortexel-nest-example-source-inventory.rfc8785-sha256.v1' as const;

/** Exact semantic digest emitted from the pinned NEST v3.10 source authority. */
export const PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST =
  'sha256:cd59e82a8eb5af6d482d3042afdf91b0793865aef75843f5b10da6ee61ba3fe6' as const;

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
  readonly extension: 'png' | 'gif' | 'svg';
  readonly role: 'checked_in_upstream_visual_asset';
}

export interface VerifiedNestExampleAcquisitionContext {
  readonly [VERIFIED_ACQUISITION_CONTEXT]: true;
  readonly repository: string;
  readonly temporaryRoot: string;
}

export interface NestExampleSourceInventory {
  readonly protocol: 'cortexel-nest-example-source-inventory';
  readonly protocolVersion: 1;
  readonly identityAlgorithm: typeof NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY;
  readonly upstream: {
    readonly project: 'NEST Simulator';
    readonly release: string;
    readonly repository: string;
    readonly commit: string;
    readonly rootTreeGitSha1: string;
    readonly exampleRoot: string;
  };
  readonly acquisition: {
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
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_COUNT: '0',
    GIT_NO_REPLACE_OBJECTS: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0',
  };
  for (const name of GIT_REPOSITORY_OVERRIDE_ENVIRONMENT) delete environment[name];
  return environment;
}

function gitArgs(repository: string, args: readonly string[]): string[] {
  return [
    '--no-replace-objects',
    '-c',
    'core.fsmonitor=false',
    '-c',
    'core.untrackedCache=false',
    '-c',
    'core.ignoreStat=false',
    '-C',
    repository,
    ...args,
  ];
}

function gitBuffer(
  repository: string,
  args: readonly string[],
  maxBuffer = MAX_GIT_OUTPUT_BYTES,
): Buffer {
  const result = spawnSync('git', gitArgs(repository, args), {
    cwd: repository,
    env: gitEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer,
    timeout: 120_000,
  });
  if (result.error || result.status !== 0) {
    const diagnostic = Buffer.isBuffer(result.stderr)
      ? utf8(result.stderr.subarray(0, 2_000), 'Git diagnostic')
      : '';
    fail(`git ${args[0] ?? '<missing>'} failed${diagnostic ? `: ${diagnostic.trim()}` : ''}`);
  }
  return result.stdout;
}

function gitText(repository: string, args: readonly string[]): string {
  return utf8(gitBuffer(repository, args), `git ${args[0] ?? '<missing>'} output`);
}

function gitOptionalText(
  repository: string,
  args: readonly string[],
): { readonly status: 0 | 1; readonly stdout: string } {
  const result = spawnSync('git', gitArgs(repository, args), {
    cwd: repository,
    env: gitEnvironment(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024,
    timeout: 30_000,
  });
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    const diagnostic = result.stderr.slice(0, 2_000).trim();
    fail(
      `git ${args[0] ?? '<missing>'} failed` +
      (diagnostic.length > 0 ? `: ${diagnostic}` : ''),
    );
  }
  return {
    status: result.status as 0 | 1,
    stdout: result.stdout,
  };
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

function blob(repository: string, commit: string, objectPath: string): Buffer {
  assertSafeRepositoryPath(objectPath, 'Git blob path');
  return gitBuffer(repository, ['cat-file', 'blob', `${commit}:${objectPath}`]);
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
  repository: string,
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
    const raw = blob(repository, authority.commit, entry.path);
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

/**
 * Verify the bounded repository state used by the generator after its fetch
 * phase. This does not authenticate how the directory was created, so the
 * resulting provenance says only that its temporary-repository shape and
 * offline read authority were checked at inventory time.
 */
export function verifyNestExampleOfflineAcquisitionContext(
  repositoryPath: string,
  temporaryRootPath: string,
): VerifiedNestExampleAcquisitionContext {
  if (!path.isAbsolute(repositoryPath) || !path.isAbsolute(temporaryRootPath)) {
    fail('verified acquisition paths must be absolute');
  }
  const repositoryStat = lstatSync(repositoryPath);
  const temporaryRootStat = lstatSync(temporaryRootPath);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    fail('verified acquisition repository must be a direct directory');
  }
  if (!temporaryRootStat.isDirectory() || temporaryRootStat.isSymbolicLink()) {
    fail('verified acquisition temporary root must be a direct directory');
  }
  const repository = realpathSync(repositoryPath);
  const temporaryRoot = realpathSync(temporaryRootPath);
  if (path.dirname(repository) !== temporaryRoot) {
    fail('verified acquisition repository must be a direct child of its temporary root');
  }

  const gitDirectoryText = gitText(
    repository,
    ['rev-parse', '--absolute-git-dir'],
  ).trim();
  if (!path.isAbsolute(gitDirectoryText) || !existsSync(gitDirectoryText)) {
    fail('verified acquisition repository has no local absolute Git directory');
  }
  const gitDirectoryStat = lstatSync(gitDirectoryText);
  const gitDirectory = realpathSync(gitDirectoryText);
  if (
    !gitDirectoryStat.isDirectory() ||
    gitDirectoryStat.isSymbolicLink() ||
    gitDirectory !== path.join(repository, '.git')
  ) {
    fail('verified acquisition Git directory is not the repository-local .git directory');
  }
  if (gitText(repository, ['remote']).trim().length !== 0) {
    fail('verified acquisition repository still has a configured remote');
  }
  const remoteConfiguration = gitOptionalText(
    repository,
    ['config', '--local', '--get-regexp', '^remote\\.'],
  );
  if (remoteConfiguration.status === 0 || remoteConfiguration.stdout.trim().length !== 0) {
    fail('verified acquisition repository still has local remote configuration');
  }
  const partialClone = gitOptionalText(
    repository,
    ['config', '--local', '--get', 'extensions.partialClone'],
  );
  if (partialClone.status === 0 || partialClone.stdout.trim().length !== 0) {
    fail('verified acquisition repository still names a partial-clone remote');
  }
  for (const filename of [
    path.join(gitDirectory, 'objects', 'info', 'alternates'),
    path.join(gitDirectory, 'objects', 'info', 'http-alternates'),
  ]) {
    if (existsSync(filename)) {
      fail('verified acquisition repository uses an alternate Git object database');
    }
  }

  return Object.freeze({
    [VERIFIED_ACQUISITION_CONTEXT]: true as const,
    repository,
    temporaryRoot,
  });
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
): NestExampleSourceInventory {
  if (!path.isAbsolute(repositoryPath)) fail('repository path must be absolute');
  const repositoryStat = lstatSync(repositoryPath);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    fail('repository path must be a direct directory');
  }
  const repository = realpathSync(repositoryPath);
  let verifiedAcquisition = false;
  if (acquisitionContext !== undefined) {
    if (
      acquisitionContext[VERIFIED_ACQUISITION_CONTEXT] !== true ||
      acquisitionContext.repository !== repository
    ) {
      fail('verified acquisition context does not bind this repository');
    }
    verifyNestExampleOfflineAcquisitionContext(
      acquisitionContext.repository,
      acquisitionContext.temporaryRoot,
    );
    verifiedAcquisition = true;
  }
  assertSha1(authority.commit, 'pinned commit');
  assertSha1(authority.rootTreeGitSha1, 'pinned root tree');
  assertSafeRepositoryPath(authority.exampleRoot, 'example root');

  const resolvedCommit = gitText(
    repository,
    ['rev-parse', '--verify', `${authority.commit}^{commit}`],
  ).trim();
  if (resolvedCommit !== authority.commit) {
    fail(`commit drifted: expected ${authority.commit}, received ${resolvedCommit}`);
  }
  const rootTree = gitText(
    repository,
    ['rev-parse', '--verify', `${authority.commit}^{tree}`],
  ).trim();
  if (rootTree !== authority.rootTreeGitSha1) {
    fail(
      `root tree drifted: expected ${authority.rootTreeGitSha1}, received ${rootTree}`,
    );
  }

  const leaves = parseLeafTree(
    gitBuffer(repository, ['ls-tree', '-rz', '--full-tree', authority.commit]),
  );
  verifyAuthorityFile(leaves, authority.documentationIndex);
  verifyAuthorityFile(leaves, authority.runner);
  verifyAuthorityFile(leaves, authority.orchestrationCmake);

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
    repository,
    authority,
    pythonEntries,
    sourceIdByPath,
  );

  const regularPythonPathSet = new Set(regularPythonEntries.map((entry) => entry.path));
  const docs = deriveDocumentationSelection(
    utf8(
      blob(repository, authority.commit, authority.documentationIndex.path),
      'documentation index',
    ),
    regularPythonPathSet,
    authority,
  );
  const runnerSource = utf8(
    blob(repository, authority.commit, authority.runner.path),
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

  const assetEntries = leaves.filter(
    (entry) =>
      entry.path.startsWith(`${authority.exampleRoot}/`) &&
      /\.(?:png|gif|svg)$/u.test(entry.path),
  );
  for (const entry of assetEntries) {
    assertSafeRepositoryPath(entry.path, 'visual-asset path');
  }
  const assetCounts = { png: 0, gif: 0, svg: 0 };
  const visualAssets: NestExampleVisualAsset[] = assetEntries.map((entry) => {
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) {
      return fail(`visual asset ${entry.path} is not a regular Git blob`);
    }
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

  const core = {
    protocol: 'cortexel-nest-example-source-inventory' as const,
    protocolVersion: 1 as const,
    identityAlgorithm: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
    upstream: {
      project: authority.project,
      release: authority.release,
      repository: authority.repository,
      commit: authority.commit,
      rootTreeGitSha1: authority.rootTreeGitSha1,
      exampleRoot: authority.exampleRoot,
    },
    acquisition: {
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
    },
  };
  return {
    ...core,
    inventoryDigest: canonicalDigest({
      domain: NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY,
      inventory: core,
    }),
  };
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
 * pinned source/selector denominator; it does not inspect source bodies, execute
 * NEST, inventory emitted outputs, or certify a Cortexel mapping.
 */
export function validateNestExampleSourceInventory(
  value: unknown,
): readonly string[] {
  const problems: string[] = [];
  const inventory = unknownRecord(value);
  if (inventory === null) return ['source inventory root must be an object'];

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
    repositoryContext: 'temporary_repository_shape_verified',
    upstreamCodeExecutedByInventoryBuilder: false,
    inventoryReadAuthority:
      'local_git_object_database_no_configured_remote_or_alternates',
  })) {
    problems.push('checked-in source inventory lacks the verified offline acquisition shape');
  }
  if (
    inventory.protocol !== 'cortexel-nest-example-source-inventory' ||
    inventory.protocolVersion !== 1 ||
    inventory.identityAlgorithm !== NEST_EXAMPLE_SOURCE_INVENTORY_IDENTITY
  ) {
    problems.push('source inventory protocol identity is not the closed V1 identity');
  }

  const sources = records(inventory.sourcePaths);
  const aliases = records(inventory.aliases);
  const entrypoints = records(inventory.entrypoints);
  const invocations = records(inventory.invocationProfiles);
  const assets = records(inventory.visualAssets);
  validateSortedUniqueField(sources, 'path', 'sourcePaths', problems);
  validateSortedUniqueField(aliases, 'aliasPath', 'aliases', problems);
  validateSortedUniqueField(entrypoints, 'canonicalPath', 'entrypoints', problems);
  validateSortedUniqueField(invocations, 'invocationId', 'invocationProfiles', problems);
  validateSortedUniqueField(assets, 'path', 'visualAssets', problems);

  const sourceById = new Map<string, UnknownRecord>();
  const sourceByPath = new Map<string, UnknownRecord>();
  for (const source of sources) {
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

  for (const asset of assets) {
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
  };
  if (!canonicalMatches(inventory.summary, expectedSummary)) {
    problems.push('source inventory summary does not equal the closed pinned counts');
  }
  if (
    sources.length !== 112 ||
    aliases.length !== 3 ||
    entrypoints.length !== 98 ||
    invocations.length !== 92 ||
    assets.length !== 12
  ) {
    problems.push('source inventory row cardinalities do not equal the closed pinned denominator');
  }

  return [...new Set(problems)].sort().slice(0, 64);
}
