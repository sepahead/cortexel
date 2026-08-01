#!/usr/bin/env -S tsx
/**
 * Fetch and verify the pinned official NEST documentation-source inventory.
 *
 * A blobless smart-HTTPS fetch first obtains only the exact shallow commit/tree
 * closure. After the remote and acquisition sidecars are removed, bounded
 * fixed-host raw requests retrieve only tree-selected blobs; their Git identities
 * are independently reproduced before inventory construction reads the closed
 * local object database. Upstream code is never imported or executed.
 */
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildNestDocumentationSourceInventory,
  canonicalNestDocumentationSourceInventory,
  materializeNestDocumentationSelectedSourceBlobs,
  NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE,
  nestDocumentationSelectedSourceReferences,
  PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
  type NestDocumentationSelectedSourceReference,
  validateNestDocumentationSourceInventory,
  verifyNestDocumentationOfflineAcquisitionContext,
} from './lib/nest-documentation-source-inventory.js';
import { publishNewExclusiveAuditFile } from './lib/exclusive-audit-publication.js';
import {
  controlledGitCommandArguments,
  controlledGitEnvironment,
  deriveOfflineGitStructuralObjectSetWithAuthority,
  removeGitAcquisitionSidecars,
  requireExactOfflineGitObjectSetWithAuthority,
  type OfflineGitObjectIdentity,
  type VerifiedOfflineGitReadAuthority,
  verifyOfflineGitReadAuthority,
} from './lib/offline-git-object-database.js';
import {
  downloadPinnedRawGitBlobsWithBoundary,
  pinnedRawGitBlobRequestPath,
  productionPinnedRawGitBlobBoundary,
  type PinnedRawGitBlobAgent,
  type PinnedRawGitBlobBoundary,
  type PinnedRawGitBlobClock,
  type PinnedRawGitBlobFileSystem,
  type PinnedRawGitBlobLimits,
  type PinnedRawGitBlobRequest,
  type PinnedRawGitBlobRequestOptions,
  type PinnedRawGitBlobResponse,
} from './lib/pinned-raw-git-blob-acquisition.js';
import {
  requireExactPrivateDirectoryAuthority,
  requireProtectedDirectoryEntryChain,
} from './lib/posix-acl-authority.js';
import {
  createReviewedGitRuntime,
  disposeReviewedGitRuntime,
  runReviewedGitCommand,
  type ReviewedGitRuntime,
} from './lib/reviewed-git-command.js';

interface ParsedArguments {
  readonly output: string | null;
  readonly help: boolean;
}

const PINNED_UNIQUE_REACHABLE_TREE_OBJECT_COUNT = 136;
const RAW_SOURCE_CONCURRENCY = 4;
const RAW_SOURCE_ATTEMPTS = 4;
const RAW_SOURCE_BLOB_BYTE_LIMIT = 4 * 1024 * 1024;
const RAW_SOURCE_SUCCESSFUL_BYTE_LIMIT = 64 * 1024 * 1024;
const RAW_SOURCE_RECEIVED_BODY_BYTE_LIMIT = 256 * 1024 * 1024;
const RAW_SOURCE_IDLE_TIMEOUT_MS = 90_000;
const RAW_SOURCE_ABSOLUTE_TIMEOUT_MS = 5 * 60_000;
const RAW_SOURCE_GLOBAL_TIMEOUT_MS = 15 * 60_000;
const RAW_SOURCE_DATA_EVENT_LIMIT = 65_536;
export type NestDocumentationRawSourceTestLimits = PinnedRawGitBlobLimits;
export type NestDocumentationRawSourceTestClock = PinnedRawGitBlobClock;
export type NestDocumentationRawSourceTestAgent = PinnedRawGitBlobAgent;
export type NestDocumentationRawSourceTestResponse = PinnedRawGitBlobResponse;
export type NestDocumentationRawSourceTestRequest = PinnedRawGitBlobRequest;
export type NestDocumentationRawSourceTestRequestOptions =
  PinnedRawGitBlobRequestOptions;
export type NestDocumentationRawSourceTestFileSystem =
  PinnedRawGitBlobFileSystem;
export type NestDocumentationRawSourceTestBoundary = PinnedRawGitBlobBoundary;

const RAW_SOURCE_REQUEST_AUTHORITY = Object.freeze({
  owner: 'nest',
  repository: 'nest-simulator',
  commit: PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit,
  userAgent: 'cortexel-nest-documentation-inventory/1',
});

const PRODUCTION_RAW_SOURCE_LIMITS: PinnedRawGitBlobLimits =
  Object.freeze({
    expectedReferenceCount:
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.expected.uniqueBoundBlobCount,
    concurrency: RAW_SOURCE_CONCURRENCY,
    attempts: RAW_SOURCE_ATTEMPTS,
    blobByteLimit: RAW_SOURCE_BLOB_BYTE_LIMIT,
    successfulByteLimit: RAW_SOURCE_SUCCESSFUL_BYTE_LIMIT,
    receivedBodyByteLimit: RAW_SOURCE_RECEIVED_BODY_BYTE_LIMIT,
    idleTimeoutMs: RAW_SOURCE_IDLE_TIMEOUT_MS,
    absoluteTimeoutMs: RAW_SOURCE_ABSOLUTE_TIMEOUT_MS,
    globalTimeoutMs: RAW_SOURCE_GLOBAL_TIMEOUT_MS,
    dataEventLimit: RAW_SOURCE_DATA_EVENT_LIMIT,
    retryDelayMs: Object.freeze([250, 1_000, 3_000]),
  });

function usage(): string {
  return [
    'Usage:',
    '  tsx scripts/generate-nest-documentation-source-inventory.ts',
    '  tsx scripts/generate-nest-documentation-source-inventory.ts --output <new-file.json>',
    '',
    'The output file must not already exist. The command fetches the exact reviewed',
    'NEST v3.10 commit without checking it out, removes the remote, and inventories',
    'source definitions without importing or executing upstream code.',
  ].join('\n');
}

function parseArguments(argv: readonly string[]): ParsedArguments {
  let output: string | null = null;
  let help = false;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]!;
    if (argument === '--help' || argument === '-h') {
      help = true;
      continue;
    }
    if (argument === '--output') {
      const value = argv[++index];
      if (!value || value === '-') throw new Error('--output requires a non-stdout file path');
      if (output !== null) throw new Error('--output may be supplied only once');
      output = value;
      continue;
    }
    throw new Error(`unknown argument ${JSON.stringify(argument)}`);
  }
  if (help && (argv.length !== 1 || output !== null)) {
    throw new Error('--help cannot be combined with other arguments');
  }
  return { output, help };
}

function safeDiagnostic(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,
      '\uFFFD',
    )
    .slice(0, 2_000);
}

function gitEnvironment(hooksDirectory: string): NodeJS.ProcessEnv {
  return controlledGitEnvironment(
    path.join(path.dirname(hooksDirectory), 'empty-git-home'),
  );
}

function git(
  reviewedGit: ReviewedGitRuntime,
  cwd: string,
  args: readonly string[],
  timeout: number,
  hooksDirectory: string,
  noLazyFetch = false,
): string {
  const result = runReviewedGitCommand(
    reviewedGit,
    cwd,
    controlledGitCommandArguments(cwd, args, hooksDirectory),
    {
      environment: {
        ...gitEnvironment(hooksDirectory),
        ...(noLazyFetch ? { GIT_NO_LAZY_FETCH: '1' } : {}),
      },
      outputLimitBytes: 8 * 1024 * 1024,
      timeoutMs: timeout,
    },
  );
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
      .decode(result.stdout);
  } catch {
    throw new Error(`git ${args[0] ?? '<missing>'} output is not UTF-8`);
  }
}

export function nestDocumentationRawSourcePath(
  reference: NestDocumentationSelectedSourceReference,
): string {
  return pinnedRawGitBlobRequestPath(
    reference,
    RAW_SOURCE_REQUEST_AUTHORITY,
  );
}

async function downloadNestDocumentationRawSourcesForTest(
  references: readonly NestDocumentationSelectedSourceReference[],
  stagingDirectory: string,
  boundary: NestDocumentationRawSourceTestBoundary,
): Promise<readonly string[]> {
  return downloadPinnedRawGitBlobsWithBoundary(
    references,
    stagingDirectory,
    RAW_SOURCE_REQUEST_AUTHORITY,
    boundary,
  );
}

export const nestDocumentationRawSourceTesting = Object.freeze({
  downloadSelectedSourceBlobs: downloadNestDocumentationRawSourcesForTest,
});

async function downloadSelectedSourceBlobs(
  references: readonly NestDocumentationSelectedSourceReference[],
  stagingDirectory: string,
): Promise<readonly string[]> {
  return downloadPinnedRawGitBlobsWithBoundary(
    references,
    stagingDirectory,
    RAW_SOURCE_REQUEST_AUTHORITY,
    productionPinnedRawGitBlobBoundary(PRODUCTION_RAW_SOURCE_LIMITS),
  );
}
function importSelectedSourceBlobs(
  reviewedGit: ReviewedGitRuntime,
  repository: string,
  hooksDirectory: string,
  references: readonly NestDocumentationSelectedSourceReference[],
  stagedPaths: readonly string[],
): void {
  const result = runReviewedGitCommand(
    reviewedGit,
    repository,
    controlledGitCommandArguments(
      repository,
      ['hash-object', '-w', '--no-filters', '--', ...stagedPaths],
      hooksDirectory,
    ),
    {
      environment: { ...gitEnvironment(hooksDirectory), GIT_NO_LAZY_FETCH: '1' },
      outputLimitBytes: 1024 * 1024,
      requireEmptyStderr: true,
      timeoutMs: 120_000,
    },
  );
  let stdout: string;
  try {
    stdout = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
      .decode(result.stdout);
  } catch {
    throw new Error('git hash-object output is not UTF-8');
  }
  const expectedStdout = `${references.map(
    ({ gitBlobSha1 }) => gitBlobSha1,
  ).join('\n')}\n`;
  if (stdout !== expectedStdout) {
    throw new Error('git hash-object did not reproduce the selected blob identities');
  }
}

function assertExactLocalGitObjectClosure(
  reviewedGit: ReviewedGitRuntime,
  offlineReadAuthority: VerifiedOfflineGitReadAuthority,
  structuralObjects: readonly OfflineGitObjectIdentity[],
  selectedReferences: readonly NestDocumentationSelectedSourceReference[],
  includeSelectedBlobs: boolean,
): void {
  const expected = new Map(
    structuralObjects.map(({ identity, objectType }) => [identity, objectType]),
  );
  if (includeSelectedBlobs) {
    for (const { gitBlobSha1 } of selectedReferences) {
      if (expected.has(gitBlobSha1)) {
        throw new Error('selected Git blob collides with structural object identity');
      }
      expected.set(gitBlobSha1, 'blob');
    }
  }
  requireExactOfflineGitObjectSetWithAuthority(
    offlineReadAuthority,
    [...expected].map(([identity, objectType]) => ({ identity, objectType })),
    includeSelectedBlobs
      ? 'NEST documentation structural-plus-selected object closure'
      : 'NEST documentation initial structural object closure',
    reviewedGit,
  );
}

function assertEmptyDirectDirectory(directory: string, label: string): void {
  const stat = lstatSync(directory);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    realpathSync(directory) !== directory ||
    readdirSync(directory).length !== 0
  ) {
    throw new Error(`${label} must remain an empty direct directory`);
  }
}

async function fetchPinnedRepository(): Promise<{
  readonly repository: string;
  readonly acquisitionContext:
    ReturnType<typeof verifyNestDocumentationOfflineAcquisitionContext>;
  readonly reviewedGit: ReviewedGitRuntime;
  readonly cleanup: () => void;
}> {
  const temporaryParent = realpathSync(tmpdir());
  requireProtectedDirectoryEntryChain(
    temporaryParent,
    'acquisition temporary-parent authority',
  );
  const temporaryRoot = realpathSync(mkdtempSync(
    path.join(temporaryParent, 'cortexel-nest-documentation-inventory-'),
  ));
  const repository = path.join(temporaryRoot, 'repository');
  const emptyTemplate = path.join(temporaryRoot, 'empty-git-template');
  const emptyHooks = path.join(temporaryRoot, 'empty-git-hooks');
  const emptyHome = path.join(temporaryRoot, 'empty-git-home');
  const selectedBlobStaging = path.join(temporaryRoot, 'selected-blob-staging');
  let reviewedGit: ReviewedGitRuntime | null = null;
  let complete = false;
  try {
    mkdirSync(repository, { mode: 0o700 });
    mkdirSync(emptyTemplate, { mode: 0o700 });
    mkdirSync(emptyHooks, { mode: 0o700 });
    mkdirSync(emptyHome, { mode: 0o700 });
    mkdirSync(selectedBlobStaging, { mode: 0o700 });
    requireExactPrivateDirectoryAuthority(
      temporaryRoot,
      'acquisition temporary-root authority before Git',
    );
    reviewedGit = createReviewedGitRuntime(temporaryRoot);
    assertEmptyDirectDirectory(emptyTemplate, 'Git template authority');
    assertEmptyDirectDirectory(emptyHooks, 'Git hook authority');
    assertEmptyDirectDirectory(emptyHome, 'Git home authority');
    git(
      reviewedGit,
      repository,
      [
        'init',
        '--quiet',
        '--object-format=sha1',
        `--template=${emptyTemplate}`,
      ],
      30_000,
      emptyHooks,
    );
    git(
      reviewedGit,
      repository,
      [
        'remote',
        'add',
        'origin',
        PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.repository,
      ],
      30_000,
      emptyHooks,
    );
    git(
      reviewedGit,
      repository,
      ['config', '--local', 'remote.origin.promisor', 'true'],
      30_000,
      emptyHooks,
    );
    git(
      reviewedGit,
      repository,
      ['config', '--local', 'remote.origin.partialclonefilter', 'blob:none'],
      30_000,
      emptyHooks,
    );
    git(
      reviewedGit,
      repository,
      [
        'fetch',
        '--quiet',
        '--depth=1',
        '--filter=blob:none',
        '--no-tags',
        '--no-write-commit-graph',
        '--no-write-fetch-head',
        '--no-recurse-submodules',
        '--refmap=',
        'origin',
        PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit,
      ],
      600_000,
      emptyHooks,
    );
    const resolved = git(
      reviewedGit,
      repository,
      [
        'rev-parse',
        '--verify',
        `${PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit}^{commit}`,
      ],
      30_000,
      emptyHooks,
    ).trim();
    if (resolved !== PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit) {
      throw new Error(`fetched commit mismatch: received ${resolved}`);
    }
    const rootTree = git(
      reviewedGit,
      repository,
      [
        'rev-parse',
        '--verify',
        `${PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit}^{tree}`,
      ],
      30_000,
      emptyHooks,
    ).trim();
    if (rootTree !== PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.rootTreeGitSha1) {
      throw new Error(`fetched root-tree mismatch: received ${rootTree}`);
    }
    git(
      reviewedGit,
      repository,
      [
        'update-ref',
        'refs/cortexel/documentation-inventory',
        PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit,
      ],
      30_000,
      emptyHooks,
    );
    git(
      reviewedGit,
      repository,
      ['symbolic-ref', 'HEAD', 'refs/cortexel/documentation-inventory'],
      30_000,
      emptyHooks,
    );
    const selectedReferences = nestDocumentationSelectedSourceReferences(
      repository,
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
      reviewedGit,
    );
    git(reviewedGit, repository, ['remote', 'remove', 'origin'], 30_000, emptyHooks);
    removeGitAcquisitionSidecars(
      repository,
      'NEST documentation post-fetch acquisition-sidecar cleanup',
    );
    const structuralReadAuthority = verifyOfflineGitReadAuthority(
      repository,
      temporaryRoot,
      'NEST documentation pre-download structural acquisition',
      reviewedGit,
    );
    const structuralObjects = deriveOfflineGitStructuralObjectSetWithAuthority(
      structuralReadAuthority,
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit,
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.rootTreeGitSha1,
      'NEST documentation pinned structural object derivation',
      reviewedGit,
    );
    if (structuralObjects.length !==
      PINNED_UNIQUE_REACHABLE_TREE_OBJECT_COUNT + 1) {
      throw new Error('pinned Git structural-object count drifted');
    }
    assertExactLocalGitObjectClosure(
      reviewedGit,
      structuralReadAuthority,
      structuralObjects,
      selectedReferences,
      false,
    );
    requireExactPrivateDirectoryAuthority(
      selectedBlobStaging,
      'selected raw-source staging authority before download',
    );
    const stagedPaths = await downloadSelectedSourceBlobs(
      selectedReferences,
      selectedBlobStaging,
    );
    requireExactPrivateDirectoryAuthority(
      selectedBlobStaging,
      'selected raw-source staging authority after download',
    );
    assertExactLocalGitObjectClosure(
      reviewedGit,
      structuralReadAuthority,
      structuralObjects,
      selectedReferences,
      false,
    );
    importSelectedSourceBlobs(
      reviewedGit,
      repository,
      emptyHooks,
      selectedReferences,
      stagedPaths,
    );
    const finalReadAuthority = verifyOfflineGitReadAuthority(
      repository,
      temporaryRoot,
      'NEST documentation post-import offline-read transition',
      reviewedGit,
    );
    assertExactLocalGitObjectClosure(
      reviewedGit,
      finalReadAuthority,
      structuralObjects,
      selectedReferences,
      true,
    );
    materializeNestDocumentationSelectedSourceBlobs(
      repository,
      finalReadAuthority,
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
      reviewedGit,
    );
    rmSync(selectedBlobStaging, { recursive: true });
    assertExactLocalGitObjectClosure(
      reviewedGit,
      finalReadAuthority,
      structuralObjects,
      selectedReferences,
      true,
    );
    assertEmptyDirectDirectory(emptyTemplate, 'Git template authority');
    assertEmptyDirectDirectory(emptyHooks, 'Git hook authority');
    assertEmptyDirectDirectory(emptyHome, 'Git home authority');
    const acquisitionContext = verifyNestDocumentationOfflineAcquisitionContext(
      repository,
      temporaryRoot,
      reviewedGit,
    );
    complete = true;
    return {
      repository,
      acquisitionContext,
      reviewedGit,
      cleanup: () => {
        disposeReviewedGitRuntime(reviewedGit!);
        rmSync(temporaryRoot, { recursive: true, force: true });
      },
    };
  } finally {
    if (!complete) {
      if (reviewedGit !== null) disposeReviewedGitRuntime(reviewedGit);
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
}

export function writeNewNestDocumentationInventoryFile(
  requestedPath: string,
  content: string,
): void {
  publishNewExclusiveAuditFile(requestedPath, content);
}

export async function runNestDocumentationSourceInventoryGenerator(
  argv: readonly string[] = process.argv.slice(2),
): Promise<number> {
  let args: ParsedArguments;
  try {
    args = parseArguments(argv);
  } catch (error) {
    process.stderr.write(`${safeDiagnostic(error)}\n${usage()}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  let fetched: Awaited<ReturnType<typeof fetchPinnedRepository>> | null = null;
  try {
    fetched = await fetchPinnedRepository();
    const inventory = buildNestDocumentationSourceInventory(
      fetched.repository,
      PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
      fetched.acquisitionContext,
      NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE,
      fetched.reviewedGit,
    );
    const problems = validateNestDocumentationSourceInventory(inventory);
    if (problems.length !== 0) {
      throw new Error(
        `generated NEST documentation inventory failed its pinned validator: ${problems[0]}`,
      );
    }
    const canonical = canonicalNestDocumentationSourceInventory(inventory);
    // Evidence does not escape until the owner/mode/ACL-restricted acquisition
    // repository has been removed successfully.
    fetched.cleanup();
    fetched = null;
    if (args.output === null) process.stdout.write(canonical);
    else writeNewNestDocumentationInventoryFile(args.output, canonical);
    return 0;
  } catch (error) {
    process.stderr.write(`NEST documentation inventory failed: ${safeDiagnostic(error)}\n`);
    return 1;
  } finally {
    if (fetched !== null) {
      try {
        fetched.cleanup();
      } catch {
        // Preserve the primary diagnostic. No artifact has been published on
        // this path; only the randomized owner/mode/ACL-restricted temporary
        // root may remain.
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void runNestDocumentationSourceInventoryGenerator().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
