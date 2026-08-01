#!/usr/bin/env -S tsx
/**
 * Fetch and verify the pinned official PyNEST source inventory.
 *
 * The upstream structural commit/tree closure is fetched into a fresh temporary
 * Git repository. After its Git remote is removed, exact tree-selected paths
 * are retrieved through a separately bounded raw-HTTPS boundary, independently
 * rehashed, imported, and then read from an exact offline object closure. No
 * checkout is created and upstream code is never executed.
 *
 * Usage:
 *   tsx scripts/generate-nest-example-source-inventory.ts
 *   tsx scripts/generate-nest-example-source-inventory.ts --output inventory.json
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
  buildNestExampleSourceInventory,
  canonicalNestExampleSourceInventory,
  materializeNestExampleTreeBlobs,
  NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
  nestExampleRawBlobReferences,
  PINNED_NEST_EXAMPLE_RAW_BLOB_MAX_BYTE_LENGTH,
  PINNED_NEST_EXAMPLE_RAW_BLOB_TOTAL_BYTE_LENGTH,
  PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
  validateNestExampleSourceInventory,
  verifyNestExampleOfflineAcquisitionContext,
} from './lib/nest-example-source-inventory.js';
import { publishNewExclusiveAuditFile } from './lib/exclusive-audit-publication.js';
import {
  controlledGitCommandArguments,
  controlledGitEnvironment,
  deriveOfflineGitStructuralObjectSetWithAuthority,
  removeGitAcquisitionSidecars,
  requireExactOfflineGitObjectSetWithAuthority,
  verifyOfflineGitReadAuthority,
} from './lib/offline-git-object-database.js';
import {
  downloadPinnedRawGitBlobsWithBoundary,
  productionPinnedRawGitBlobBoundary,
  type PinnedRawGitBlobLimits,
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
const RAW_SOURCE_LIMITS: PinnedRawGitBlobLimits = Object.freeze({
  expectedReferenceCount: 160,
  concurrency: 4,
  attempts: 4,
  blobByteLimit: PINNED_NEST_EXAMPLE_RAW_BLOB_MAX_BYTE_LENGTH,
  successfulByteLimit: PINNED_NEST_EXAMPLE_RAW_BLOB_TOTAL_BYTE_LENGTH,
  receivedBodyByteLimit: 96 * 1024 * 1024,
  idleTimeoutMs: 90_000,
  absoluteTimeoutMs: 5 * 60_000,
  globalTimeoutMs: 15 * 60_000,
  dataEventLimit: 65_536,
  retryDelayMs: Object.freeze([250, 1_000, 3_000]),
});
const RAW_SOURCE_REQUEST_AUTHORITY = Object.freeze({
  owner: 'nest',
  repository: 'nest-simulator',
  commit: PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
  userAgent: 'cortexel-nest-example-inventory/1',
});

function usage(): string {
  return [
    'Usage:',
    '  tsx scripts/generate-nest-example-source-inventory.ts',
    '  tsx scripts/generate-nest-example-source-inventory.ts --output <new-file.json>',
    '',
    'The output file must not already exist. Without --output, canonical JSON is',
    'written to stdout. The command fetches only the exact reviewed NEST commit',
    'and never executes upstream code.',
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
      if (!value || value === '-') {
        throw new Error('--output requires a non-stdout file path');
      }
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

function gitEnvironment(hooksDirectory: string): NodeJS.ProcessEnv {
  return controlledGitEnvironment(
    path.join(path.dirname(hooksDirectory), 'empty-git-home'),
  );
}

function git(
  reviewedGit: ReviewedGitRuntime,
  repository: string,
  args: readonly string[],
  timeout: number,
  hooksDirectory: string,
  noLazyFetch = false,
): string {
  const result = runReviewedGitCommand(
    reviewedGit,
    repository,
    controlledGitCommandArguments(repository, args, hooksDirectory),
    {
      environment: {
        ...gitEnvironment(hooksDirectory),
        ...(noLazyFetch ? { GIT_NO_LAZY_FETCH: '1' } : {}),
      },
      outputLimitBytes: 128 * 1024 * 1024,
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

function importSelectedSourceBlobs(
  reviewedGit: ReviewedGitRuntime,
  repository: string,
  hooksDirectory: string,
  references: readonly { readonly gitBlobSha1: string }[],
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
      outputLimitBytes: 64 * 1024,
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

async function fetchPinnedRepository(): Promise<{
  readonly repository: string;
  readonly acquisitionContext:
    ReturnType<typeof verifyNestExampleOfflineAcquisitionContext>;
  readonly reviewedGit: ReviewedGitRuntime;
  readonly cleanup: () => void;
}> {
  const temporaryParent = realpathSync(tmpdir());
  requireProtectedDirectoryEntryChain(
    temporaryParent,
    'acquisition temporary-parent authority',
  );
  const temporaryRoot = realpathSync(mkdtempSync(
    path.join(temporaryParent, 'cortexel-nest-example-inventory-'),
  ));
  const repository = path.join(temporaryRoot, 'repository');
  const emptyTemplate = path.join(temporaryRoot, 'empty-git-template');
  const emptyHooks = path.join(temporaryRoot, 'empty-git-hooks');
  const emptyHome = path.join(temporaryRoot, 'empty-git-home');
  const selectedBlobStaging = path.join(temporaryRoot, 'selected-blob-staging');
  let reviewedGit: ReviewedGitRuntime | null = null;
  let cleanup: (() => void) | null = null;
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
    const acquiredRuntime = reviewedGit;
    cleanup = retryableOrderedCleanup(
      () => disposeReviewedGitRuntime(acquiredRuntime),
      () => rmSync(temporaryRoot, { recursive: true, force: true }),
    );
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
      ['remote', 'add', 'origin', PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.repository],
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
        '-c',
        'http.version=HTTP/1.1',
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
        PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
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
        `${PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit}^{commit}`,
      ],
      30_000,
      emptyHooks,
      true,
    ).trim();
    if (resolved !== PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit) {
      throw new Error(
        `fetched commit mismatch: expected ` +
        `${PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit}, received ${resolved}`,
      );
    }
    const selectedReferences = nestExampleRawBlobReferences(
      repository,
      reviewedGit,
    );
    const expectedBlobIdentities = selectedReferences.map(
      ({ gitBlobSha1 }) => gitBlobSha1,
    );
    // Remove every Git transport/configuration path before the separately
    // bounded raw-HTTPS body acquisition. Raw requests reproduce the exact
    // tree-derived Git blob identities and never continue a failed smart-fetch
    // repository branch.
    git(
      reviewedGit,
      repository,
      ['remote', 'remove', 'origin'],
      30_000,
      emptyHooks,
      true,
    );
    removeGitAcquisitionSidecars(
      repository,
      'NEST example post-fetch acquisition-sidecar cleanup',
    );
    const structuralReadAuthority = verifyOfflineGitReadAuthority(
      repository,
      temporaryRoot,
      'NEST example structural-only offline-read transition',
      reviewedGit,
    );
    const structuralObjects = deriveOfflineGitStructuralObjectSetWithAuthority(
      structuralReadAuthority,
      PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.commit,
      PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY.rootTreeGitSha1,
      'NEST example pinned structural object derivation',
      reviewedGit,
    );
    if (structuralObjects.length !==
      PINNED_UNIQUE_REACHABLE_TREE_OBJECT_COUNT + 1) {
      throw new Error('pinned example Git structural-object count drifted');
    }
    requireExactOfflineGitObjectSetWithAuthority(
      structuralReadAuthority,
      structuralObjects,
      'NEST example initial structural-only object closure',
      reviewedGit,
    );
    requireExactPrivateDirectoryAuthority(
      selectedBlobStaging,
      'NEST example raw-source staging authority before download',
    );
    const stagedPaths = await downloadPinnedRawGitBlobsWithBoundary(
      selectedReferences,
      selectedBlobStaging,
      RAW_SOURCE_REQUEST_AUTHORITY,
      productionPinnedRawGitBlobBoundary(RAW_SOURCE_LIMITS),
    );
    requireExactPrivateDirectoryAuthority(
      selectedBlobStaging,
      'NEST example raw-source staging authority after download',
    );
    // Raw HTTPS is not Git remote authority. Revalidate the still-structural
    // object database immediately before the sole controlled mutation.
    requireExactOfflineGitObjectSetWithAuthority(
      structuralReadAuthority,
      structuralObjects,
      'NEST example pre-import structural-only object closure',
      reviewedGit,
    );
    importSelectedSourceBlobs(
      reviewedGit,
      repository,
      emptyHooks,
      selectedReferences,
      stagedPaths,
    );
    rmSync(selectedBlobStaging, { recursive: true });
    const offlineReadAuthority = verifyOfflineGitReadAuthority(
      repository,
      temporaryRoot,
      'NEST example post-import offline-read transition',
      reviewedGit,
    );
    const completeObjectClosure = [
      ...structuralObjects,
      ...expectedBlobIdentities.map((identity) => ({
        identity,
        objectType: 'blob' as const,
      })),
    ];
    requireExactOfflineGitObjectSetWithAuthority(
      offlineReadAuthority,
      completeObjectClosure,
      'NEST example pre-materialization complete object closure',
      reviewedGit,
    );
    const materialized = materializeNestExampleTreeBlobs(
      repository,
      offlineReadAuthority,
      PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
      reviewedGit,
    );
    if (
      materialized.exampleTreeLeafCount !== 162 ||
      materialized.uniqueExampleTreeGitBlobCount !== 159 ||
      materialized.acquiredUniqueGitBlobCount !== 160 ||
      materialized.totalUniqueByteLength !==
        PINNED_NEST_EXAMPLE_RAW_BLOB_TOTAL_BYTE_LENGTH
    ) {
      throw new Error('materialized example-tree blob denominator drifted');
    }
    if (
      materialized.requestedGitBlobSha1s.length !==
        expectedBlobIdentities.length ||
      materialized.requestedGitBlobSha1s.some((identity, index) =>
        identity !== expectedBlobIdentities[index])
    ) {
      throw new Error('offline materialization changed the raw acquisition identity set');
    }
    requireExactOfflineGitObjectSetWithAuthority(
      offlineReadAuthority,
      completeObjectClosure,
      'NEST example structural-plus-complete-tree object closure',
      reviewedGit,
    );
    assertEmptyDirectDirectory(emptyTemplate, 'Git template authority');
    assertEmptyDirectDirectory(emptyHooks, 'Git hook authority');
    assertEmptyDirectDirectory(emptyHome, 'Git home authority');
    const acquisitionContext = verifyNestExampleOfflineAcquisitionContext(
      repository,
      temporaryRoot,
      reviewedGit,
    );
    complete = true;
    return {
      repository,
      acquisitionContext,
      reviewedGit,
      cleanup,
    };
  } finally {
    if (!complete) {
      if (cleanup !== null) cleanup();
      else rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
}

export function writeNewNestExampleInventoryFile(
  requestedPath: string,
  content: string,
): void {
  publishNewExclusiveAuditFile(requestedPath, content);
}

function publishNestExampleInventoryAfterCleanup(
  output: string | null,
  canonical: string,
  cleanup: () => void,
  writeStdout: (content: string) => unknown,
  publishFile: (target: string, content: string) => void,
): void {
  cleanup();
  if (output === null) writeStdout(canonical);
  else publishFile(output, canonical);
}

function retryableOrderedCleanup(
  disposeRuntime: () => void,
  removeAcquisitionRoot: () => void,
): () => void {
  let runtimeDisposed = false;
  let acquisitionRootRemoved = false;
  return () => {
    if (!runtimeDisposed) {
      disposeRuntime();
      runtimeDisposed = true;
    }
    if (!acquisitionRootRemoved) {
      removeAcquisitionRoot();
      acquisitionRootRemoved = true;
    }
  };
}

export const nestExampleSourceInventoryGeneratorTesting = Object.freeze({
  publishAfterCleanup: publishNestExampleInventoryAfterCleanup,
  retryableOrderedCleanup,
});

function safeDiagnostic(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,
      '\uFFFD',
    )
    .slice(0, 2_000);
}

export async function runNestExampleSourceInventoryGenerator(
  argv: readonly string[] = process.argv.slice(2),
): Promise<number> {
  let parsed: ParsedArguments;
  try {
    parsed = parseArguments(argv);
  } catch (error) {
    process.stderr.write(`${safeDiagnostic(error)}\n${usage()}\n`);
    return 2;
  }
  if (parsed.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  let fetched: Awaited<ReturnType<typeof fetchPinnedRepository>> | null = null;
  try {
    fetched = await fetchPinnedRepository();
    const inventory = buildNestExampleSourceInventory(
      fetched.repository,
      PINNED_NEST_EXAMPLE_INVENTORY_AUTHORITY,
      fetched.acquisitionContext,
      NEST_EXAMPLE_ACQUISITION_PRODUCER_PROFILE,
      fetched.reviewedGit,
    );
    const problems = validateNestExampleSourceInventory(inventory);
    if (problems.length !== 0) {
      throw new Error(
        `generated NEST example inventory failed its pinned validator: ${problems[0]}`,
      );
    }
    const canonical = canonicalNestExampleSourceInventory(inventory);
    // Do not publish evidence until the temporary acquisition authority has
    // been removed successfully. A cleanup failure is a bounded command failure,
    // not an accepted artifact followed by an unhandled finally exception.
    const acquired = fetched;
    publishNestExampleInventoryAfterCleanup(
      parsed.output,
      canonical,
      () => {
        acquired.cleanup();
        fetched = null;
      },
      (content) => process.stdout.write(content),
      writeNewNestExampleInventoryFile,
    );
    return 0;
  } catch (error) {
    process.stderr.write(`${safeDiagnostic(error)}\n`);
    return 1;
  } finally {
    if (fetched !== null) {
      try {
        fetched.cleanup();
      } catch {
        // Preserve the primary bounded diagnostic. No artifact is published on
        // this path, and the randomized owner/mode/ACL-restricted temporary root
        // remains the only possible residue.
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void runNestExampleSourceInventoryGenerator().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
