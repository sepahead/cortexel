import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
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

import { describe, expect, it } from 'vitest';

import { canonicalDigest, canonicalize } from '../src/core/canonicalize.js';
import {
  downloadPinnedRawGitBlobsWithBoundary,
  type PinnedRawGitBlobRequestAuthority,
} from '../scripts/lib/pinned-raw-git-blob-acquisition.js';
import {
  nestDocumentationRawSourceTesting,
  nestDocumentationRawSourcePath,
  type NestDocumentationRawSourceTestAgent,
  type NestDocumentationRawSourceTestBoundary,
  type NestDocumentationRawSourceTestClock,
  type NestDocumentationRawSourceTestFileSystem,
  type NestDocumentationRawSourceTestRequest,
  type NestDocumentationRawSourceTestRequestOptions,
  type NestDocumentationRawSourceTestResponse,
} from '../scripts/generate-nest-documentation-source-inventory.js';
import {
  buildNestDocumentationSourceInventory,
  canonicalNestDocumentationSourceInventory,
  NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE,
  NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY,
  nestDocumentationSourceInventoryTesting,
  PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
  PINNED_NEST_DOCUMENTATION_SOURCE_INVENTORY_DIGEST,
  validateNestDocumentationSourceInventory,
  verifyNestDocumentationOfflineAcquisitionContext,
} from '../scripts/lib/nest-documentation-source-inventory.js';
import {
  inspectOfflineGitObjectSet,
  removeGitAcquisitionSidecars,
  requireExactOfflineGitObjectSet,
} from '../scripts/lib/offline-git-object-database.js';
import {
  PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
} from '../scripts/lib/nest-example-source-inventory.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const INVENTORY_PATH = path.join(
  ROOT,
  'docs/audit/nest-documentation-source-inventory.v1.json',
);

type JsonRecord = Record<string, any>;

const rawClassificationBlob = (sourcePath: string): JsonRecord => ({
  sourceId: `sha256:${'0'.repeat(64)}`,
  path: sourcePath,
  pathBytesBase64: Buffer.from(sourcePath, 'utf8').toString('base64'),
  gitMode: '100644',
  gitBlobSha1: '0'.repeat(40),
  byteLength: 0,
  sha256: `sha256:${'0'.repeat(64)}`,
  scopeMembership: [],
  documentationLeafClass: null,
  mediaExtension: null,
});

const { downloadSelectedSourceBlobs: downloadNestDocumentationRawSourcesForTest } =
  nestDocumentationRawSourceTesting;

interface ScheduledTestClockTask {
  readonly identity: number;
  readonly dueAt: number;
  readonly callback: () => void;
}

class ManualRawSourceClock implements NestDocumentationRawSourceTestClock {
  private now = 0;
  private nextIdentity = 1;
  private readonly tasks = new Map<number, ScheduledTestClockTask>();

  readonly setTimeout = (callback: () => void, delayMs: number): unknown => {
    const identity = this.nextIdentity++;
    this.tasks.set(identity, {
      identity,
      dueAt: this.now + delayMs,
      callback,
    });
    return identity;
  };

  readonly clearTimeout = (handle: unknown): void => {
    if (typeof handle === 'number') this.tasks.delete(handle);
  };

  runNext(): boolean {
    const next = [...this.tasks.values()].sort(
      (left, right) => left.dueAt - right.dueAt || left.identity - right.identity,
    )[0];
    if (next === undefined) return false;
    this.tasks.delete(next.identity);
    this.now = next.dueAt;
    next.callback();
    return true;
  }

  get pendingCount(): number {
    return this.tasks.size;
  }

  advanceBy(milliseconds: number): void {
    this.now += milliseconds;
  }

  get currentTime(): number {
    return this.now;
  }
}

class FakeRawSourceResponse implements NestDocumentationRawSourceTestResponse {
  readonly dataListeners: Array<(chunk: Buffer | string) => void> = [];
  readonly endListeners: Array<() => void> = [];
  readonly errorListeners: Array<(error: unknown) => void> = [];
  readonly abortedListeners: Array<() => void> = [];
  readonly closeListeners: Array<() => void> = [];
  destroyed = false;

  constructor(
    readonly statusCode: number | undefined,
    readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>,
    readonly rawHeaders: readonly string[],
  ) {}

  readonly on = (
    event: 'data' | 'end' | 'error' | 'aborted' | 'close',
    listener: (...args: any[]) => void,
  ): NestDocumentationRawSourceTestResponse => {
    if (event === 'data') {
      this.dataListeners.push(listener as (chunk: Buffer | string) => void);
    } else if (event === 'end') {
      this.endListeners.push(listener as () => void);
    } else if (event === 'error') {
      this.errorListeners.push(listener as (error: unknown) => void);
    } else if (event === 'aborted') {
      this.abortedListeners.push(listener as () => void);
    } else {
      this.closeListeners.push(listener as () => void);
    }
    return this;
  };

  readonly destroy = (): void => {
    this.destroyed = true;
  };

  emitData(bytes: Buffer | string): void {
    if (!this.destroyed) {
      for (const listener of this.dataListeners) listener(bytes);
    }
  }

  emitEnd(): void {
    if (!this.destroyed) {
      for (const listener of this.endListeners) listener();
    }
  }

  emitAborted(): void {
    if (!this.destroyed) {
      for (const listener of this.abortedListeners) listener();
    }
  }

  emitClose(): void {
    if (!this.destroyed) {
      for (const listener of this.closeListeners) listener();
    }
  }
}

type FakeRawSourcePlan = (
  | { readonly kind: 'throw'; readonly error: Error }
  | { readonly kind: 'hang' }
  | {
    readonly kind: 'response' | 'response-before-return';
    readonly statusCode?: number;
    readonly headers?: Readonly<Record<string, string | readonly string[] | undefined>>;
    readonly rawHeaders?: readonly string[];
    readonly chunks?: readonly (Buffer | string)[];
    readonly end?: boolean;
    readonly aborted?: boolean;
    readonly close?: boolean;
    readonly responseError?: Error;
  }
) & {
  readonly emitErrorOnDestroy?: boolean;
  readonly requestError?: Error;
};

class FakeRawSourceRequest implements NestDocumentationRawSourceTestRequest {
  private readonly errorListeners: Array<(error: unknown) => void> = [];
  destroyed = false;
  ended = false;

  constructor(
    readonly start: () => void,
    private readonly emitErrorOnDestroy: boolean,
  ) {}

  readonly on = (
    _event: 'error',
    listener: (error: unknown) => void,
  ): NestDocumentationRawSourceTestRequest => {
    this.errorListeners.push(listener);
    return this;
  };

  readonly destroy = (error?: Error): void => {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.emitErrorOnDestroy) {
      for (const listener of this.errorListeners) {
        listener(error ?? new Error('fake raw-source request destroyed'));
      }
    }
  };

  emitError(error: Error): void {
    if (!this.destroyed) {
      for (const listener of this.errorListeners) listener(error);
    }
  }

  readonly end = (): void => {
    this.ended = true;
    this.start();
  };
}

interface RawSourceHarness {
  readonly boundary: NestDocumentationRawSourceTestBoundary;
  readonly clock: ManualRawSourceClock;
  readonly requests: FakeRawSourceRequest[];
  readonly responses: FakeRawSourceResponse[];
  readonly requestOptions: NestDocumentationRawSourceTestRequestOptions[];
  readonly writes: Array<{ readonly target: string; readonly bytes: Buffer }>;
  readonly agentDestroyCount: () => number;
}

function gitBlobIdentity(bytes: Buffer): string {
  return createHash('sha1')
    .update(Buffer.from(`blob ${bytes.byteLength}\0`, 'ascii'))
    .update(bytes)
    .digest('hex');
}

function rawSourceReference(
  sourcePath: string,
  bytes: Buffer,
): { readonly path: string; readonly gitBlobSha1: string } {
  return { path: sourcePath, gitBlobSha1: gitBlobIdentity(bytes) };
}

function rawSourceAuthority(): PinnedRawGitBlobRequestAuthority {
  return {
    owner: 'nest',
    repository: 'nest-simulator',
    commit: PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit,
    userAgent: 'cortexel-test/1',
  };
}

function rawSourceHarness(
  expectedReferenceCount: number,
  planForRequest: (requestIndex: number) => FakeRawSourcePlan,
  options: {
    readonly limits?: Partial<NestDocumentationRawSourceTestBoundary['limits']>;
    readonly stagingFailure?: 'write' | 'lstat' | 'realpath';
    readonly agentDestroyFailure?: boolean;
  } = {},
): RawSourceHarness {
  const clock = new ManualRawSourceClock();
  const requests: FakeRawSourceRequest[] = [];
  const responses: FakeRawSourceResponse[] = [];
  const requestOptions: NestDocumentationRawSourceTestRequestOptions[] = [];
  const writes: Array<{ readonly target: string; readonly bytes: Buffer }> = [];
  const staged = new Map<string, Buffer>();
  let agentDestroyCount = 0;
  const agent: NestDocumentationRawSourceTestAgent = {
    destroy: () => {
      agentDestroyCount += 1;
      for (const activeRequest of requests) {
        activeRequest.destroy(new Error('fake raw-source agent destroyed'));
      }
      if (options.agentDestroyFailure) {
        throw new Error('synthetic agent destroy failure');
      }
    },
  };
  const fileSystem: NestDocumentationRawSourceTestFileSystem = {
    verifyPrivateDirectory: (target) => target,
    writeFile: (target, bytes) => {
      if (options.stagingFailure === 'write') {
        throw new Error('first staging write failure');
      }
      if (staged.has(target)) throw new Error('fake exclusive staging collision');
      const retained = Buffer.from(bytes);
      staged.set(target, retained);
      writes.push({ target, bytes: retained });
    },
    lstat: (target) => {
      if (options.stagingFailure === 'lstat') {
        throw new Error('first staging lstat failure');
      }
      const bytes = staged.get(target);
      if (bytes === undefined) throw new Error('fake staged file is absent');
      return {
        isFile: () => true,
        isSymbolicLink: () => false,
        uid: 501,
        mode: 0o100600,
        nlink: 1,
        size: bytes.byteLength,
      };
    },
    realpath: (target) => {
      if (options.stagingFailure === 'realpath') {
        throw new Error('first staging realpath failure');
      }
      return target;
    },
  };
  const boundary: NestDocumentationRawSourceTestBoundary = {
    limits: {
      expectedReferenceCount,
      concurrency: 1,
      attempts: 4,
      blobByteLimit: 32,
      successfulByteLimit: 128,
      receivedBodyByteLimit: 256,
      idleTimeoutMs: 10,
      absoluteTimeoutMs: 20,
      globalTimeoutMs: 100,
      dataEventLimit: 1_024,
      retryDelayMs: [1, 1, 1],
      ...options.limits,
    },
    clock,
    createAgent: () => agent,
    request: (requestConfiguration, onResponse) => {
      const requestIndex = requests.length;
      const plan = planForRequest(requestIndex);
      requestOptions.push(requestConfiguration);
      if (plan.kind === 'throw') throw plan.error;
      let fakeRequest: FakeRawSourceRequest;
      const deliverResponse = (): void => {
        if (plan.requestError !== undefined) {
          fakeRequest.emitError(plan.requestError);
          return;
        }
        if (plan.kind === 'hang') return;
        const response = new FakeRawSourceResponse(
          plan.statusCode ?? 200,
          plan.headers ?? {},
          plan.rawHeaders ?? [],
        );
        responses.push(response);
        onResponse(response);
        for (const chunk of plan.chunks ?? []) response.emitData(chunk);
        if (plan.responseError !== undefined) {
          for (const listener of response.errorListeners) {
            listener(plan.responseError);
          }
        }
        if (plan.end ?? true) response.emitEnd();
        if (plan.aborted ?? false) response.emitAborted();
        if (plan.close ?? false) response.emitClose();
      };
      fakeRequest = new FakeRawSourceRequest(
        deliverResponse,
        plan.emitErrorOnDestroy ?? true,
      );
      if (plan.kind === 'response-before-return') deliverResponse();
      requests.push(fakeRequest);
      return fakeRequest;
    },
    fileSystem,
    currentUid: 501,
  };
  return {
    boundary,
    clock,
    requests,
    responses,
    requestOptions,
    writes,
    agentDestroyCount: () => agentDestroyCount,
  };
}

async function flushRawSourceMicrotasks(): Promise<void> {
  for (let index = 0; index < 8; index++) await Promise.resolve();
}

function observeRawSourcePromise<T>(promise: Promise<T>): Promise<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: unknown }
> {
  return promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
}

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

function inventoryEvidence(): { raw: string; inventory: JsonRecord } {
  const raw = readFileSync(INVENTORY_PATH, 'utf8');
  return { raw, inventory: JSON.parse(raw) as JsonRecord };
}

function rebindInventoryDigest(inventory: JsonRecord): void {
  const { inventoryDigest: _discarded, ...core } = inventory;
  inventory.inventoryDigest = canonicalDigest({
    domain: NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY,
    inventory: core,
  });
}

function rebindRowIdentity(
  row: JsonRecord,
  idField: string,
  domain: string,
): void {
  const { [idField]: _discarded, ...payload } = row;
  row[idField] = canonicalDigest({ domain, payload });
}

function migrateRetainedArtifactToCurrentShape(inventory: JsonRecord): JsonRecord {
  const migrated = structuredClone(inventory);
  migrated.acquisition.producerProfile =
    NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE;
  migrated.acquisition.temporaryRootDiscretionaryAuthority =
    'current_uid_mode_0700_and_reviewed_non_authorizing_posix_acl_verified';
  migrated.linkedExampleSourceInventory.inventoryDigest =
    PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST;
  migrated.linkedExampleSourceInventory.protocolVersion = 2;
  migrated.notebookStoredOutputCounts = {
    imagePngDataCount: 50,
    textLatexDataCount: 12,
    textPlainDataCount: 54,
    streamOutputCount: 19,
  };
  migrated.userdocsDirectiveCounts = {
    figureDirectivesExcludedFromRstSourceCount: 2,
  };
  migrated.summary.notebookTextLatexDataCount = 12;
  migrated.summary.notebookTextPlainDataCount = 54;
  migrated.summary.notebookStreamOutputCount = 19;
  migrated.summary.userdocsFigureDirectiveCount = 2;
  migrated.buildBoundary = {
    sphinxGalleryExecution: 'configured_literal_false_string_not_executed',
    notebookExecution: 'configured_never_not_executed',
    ambientPatchUrl: 'may_download_and_git_apply_before_build',
    dependencySpecification: 'recommended_unlocked_requirements_not_lock',
    dependencyResolutionAuthority: 'not_established',
    networkIsolation: 'not_established',
    buildInputClosure: 'not_established',
    sourceMutationExclusion: 'not_established',
    reproducibleBuildReceipt: 'not_run',
  };
  migrated.buildAuthorityFiles.find(
    ({ path: sourcePath }: JsonRecord) => sourcePath === 'doc/requirements.txt',
  ).role = 'recommended_unlocked_requirements_not_lock';
  for (const asset of migrated.notebookPngAssets as JsonRecord[]) {
    asset.buildExecutionState =
      'stored_bytes_only_configured_never_not_executed';
    rebindRowIdentity(
      asset,
      'assetId',
      'cortexel.nest-documentation.notebook-png.v1',
    );
  }
  migrated.notebookPngAssets.sort(
    (left: JsonRecord, right: JsonRecord) =>
      String(left.assetId).localeCompare(String(right.assetId)),
  );
  for (const figure of migrated.documentationScriptFigures as JsonRecord[]) {
    delete figure.resolvedSaveTarget;
    delete figure.pinnedTargetPresence;
    const hasSave = figure.saveState === 'active_literal_save_call';
    figure.saveTargetCwdAuthority = hasSave
      ? 'unbound_not_assessed'
      : 'not_applicable';
    figure.saveTargetResolutionState = hasSave
      ? 'not_assessed'
      : 'not_applicable';
    rebindRowIdentity(
      figure,
      'figureId',
      'cortexel.nest-documentation.script-figure.v1',
    );
  }
  migrated.documentationScriptFigures.sort(
    (left: JsonRecord, right: JsonRecord) =>
      String(left.figureId).localeCompare(String(right.figureId)),
  );
  migrated.evidenceAxes[0].id = 'documentation_selected_source_inventory';
  migrated.evidenceAxes[2] = {
    id: 'execution_bound_visual_output_inventory',
    state: 'not_established',
  };
  migrated.excludedScriptCandidates[0].reason =
    'empty_active_top_level_figure_with_branch_render_invocations_and_save_commented';
  if ('inventoriedVisualOutputCount' in migrated.summary) {
    migrated.summary.admittedExecutionBoundVisualOutputCount =
      migrated.summary.inventoriedVisualOutputCount;
    delete migrated.summary.inventoriedVisualOutputCount;
  }
  rebindInventoryDigest(migrated);
  return migrated;
}

function gitEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_COUNT: '0',
    GIT_TERMINAL_PROMPT: '0',
  };
  for (const name of GIT_REPOSITORY_OVERRIDE_ENVIRONMENT) {
    delete environment[name];
  }
  return environment;
}

function git(cwd: string, args: readonly string[]): void {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: gitEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
}

function temporaryRepository(): {
  readonly temporaryRoot: string;
  readonly repository: string;
  readonly cleanup: () => void;
} {
  const temporaryRoot = realpathSync(mkdtempSync(path.join(
    tmpdir(),
    'cortexel-nest-documentation-acquisition-',
  )));
  const repository = path.join(temporaryRoot, 'repository');
  git(temporaryRoot, ['init', '--quiet', repository]);
  return {
    temporaryRoot,
    repository,
    cleanup: () => rmSync(temporaryRoot, { recursive: true, force: true }),
  };
}

describe('pinned NEST documentation selected-source inventory', () => {
  it('mints a frozen exact-repository token and rejects copies and retargeting', {
    timeout: 120_000,
  }, () => {
    const fixture = temporaryRepository();
    try {
      const context = verifyNestDocumentationOfflineAcquisitionContext(
        fixture.repository,
        fixture.temporaryRoot,
      );
      expect(Object.isFrozen(context)).toBe(true);
      expect(context).toMatchObject({
        repository: fixture.repository,
        temporaryRoot: fixture.temporaryRoot,
      });

      expect(() => buildNestDocumentationSourceInventory(
        fixture.repository,
        PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
        context,
        { ...NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE },
      )).toThrow(/producer profile is unsupported/u);
      expect(() => buildNestDocumentationSourceInventory(
        fixture.repository,
        PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
        undefined,
        NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE,
      )).toThrow(/lacks verified repository authority/u);

      const copied = { ...context };
      expect(() => buildNestDocumentationSourceInventory(
        fixture.repository,
        PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
        copied,
      )).toThrow(/does not authorize this exact repository/u);

      const secondRepository = path.join(fixture.temporaryRoot, 'second-repository');
      git(fixture.temporaryRoot, ['init', '--quiet', secondRepository]);
      expect(() => buildNestDocumentationSourceInventory(
        secondRepository,
        PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
        context,
      )).toThrow(/does not authorize this exact repository/u);
    } finally {
      fixture.cleanup();
    }
  });

  it('requires the repository to be one exact direct child of the temporary root', {
    timeout: 60_000,
  }, () => {
    const fixture = temporaryRepository();
    try {
      const nestedParent = path.join(fixture.temporaryRoot, 'nested');
      const nestedRepository = path.join(nestedParent, 'repository');
      mkdirSync(nestedParent);
      git(nestedParent, ['init', '--quiet', nestedRepository]);
      expect(() => verifyNestDocumentationOfflineAcquisitionContext(
        nestedRepository,
        fixture.temporaryRoot,
      )).toThrow(/must be a direct child/u);
    } finally {
      fixture.cleanup();
    }
  });

  it('builds only exact pinned raw-source paths with segment-wise encoding', () => {
    expect(NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE).toEqual({
      schema: 'cortexel-source-inventory-acquisition-producer-profile.v1',
      producer: 'scripts/generate-nest-documentation-source-inventory.ts',
      profile:
        'cortexel.nest-documentation.git-sha1-blobless-structural-137-raw-https-selected-784-reviewed-posix-opaque-offline-object-closure-batch-canonical-object-rehash.v4',
      harnessRevision: 4,
      executionEvidence:
        'profile_declaration_not_independent_execution_receipt',
    });
    expect(nestDocumentationRawSourcePath({
      gitBlobSha1: '3789246b5d236f8959f6c92938568626364727b5',
      path: 'doc/htmldoc/static/img/1_HBP + EBRAINS logo_Color.png',
    })).toBe(
      '/nest/nest-simulator/' +
      `${PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit}/` +
      'doc/htmldoc/static/img/1_HBP%20%2B%20EBRAINS%20logo_Color.png',
    );

    for (const reference of [
      { gitBlobSha1: 'x'.repeat(40), path: 'CMakeLists.txt' },
      { gitBlobSha1: '0'.repeat(40), path: '' },
      { gitBlobSha1: '0'.repeat(40), path: '/absolute' },
      { gitBlobSha1: '0'.repeat(40), path: '../escape' },
      { gitBlobSha1: '0'.repeat(40), path: 'double//segment' },
      { gitBlobSha1: '0'.repeat(40), path: 'nul\0segment' },
    ]) {
      expect(() => nestDocumentationRawSourcePath(reference)).toThrow(
        /invalid Git blob identity|non-canonical Git path/u,
      );
    }
  });

  it('snapshots mutable authority and reference records before any request', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/snapshot.py', bytes);
    const authority = rawSourceAuthority();
    const harness = rawSourceHarness(1, () => ({
      kind: 'response',
      chunks: [bytes],
    }));
    const result = downloadPinnedRawGitBlobsWithBoundary(
      [reference],
      '/private/staging',
      authority,
      harness.boundary,
    );
    (authority as { owner: string }).owner = 'substituted';
    (reference as { path: string }).path = 'doc/substituted.py';

    await expect(result).resolves.toEqual(['/private/staging/0000.blob']);
    expect(harness.requestOptions[0]!.path).toContain('/nest/nest-simulator/');
    expect(harness.requestOptions[0]!.path.endsWith('/doc/snapshot.py')).toBe(true);
  });

  it('rejects extra authority, reference, and array keys before any request', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const cases = [
      {
        authority: { ...rawSourceAuthority(), extra: 'unreviewed' },
        references: [rawSourceReference('doc/authority-extra.py', bytes)],
      },
      {
        authority: rawSourceAuthority(),
        references: [{
          ...rawSourceReference('doc/reference-extra.py', bytes),
          extra: 'unreviewed',
        }],
      },
      {
        authority: rawSourceAuthority(),
        references: Object.assign(
          [rawSourceReference('doc/array-extra.py', bytes)],
          { extra: 'unreviewed' },
        ),
      },
    ];
    for (const candidate of cases) {
      const harness = rawSourceHarness(1, () => ({ kind: 'hang' }));
      await expect(downloadPinnedRawGitBlobsWithBoundary(
        candidate.references,
        '/private/staging',
        candidate.authority,
        harness.boundary,
      )).rejects.toThrow(/authority is invalid|own data records|exact dense array/u);
      expect(harness.requestOptions).toEqual([]);
    }
  });

  it('rejects authority and reference accessors or proxies without invoking them', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/authority.py', bytes);
    for (const kind of ['authority-accessor', 'authority-proxy', 'reference-accessor',
      'reference-proxy'] as const) {
      const harness = rawSourceHarness(1, () => ({
        kind: 'response',
        chunks: [bytes],
      }));
      let trapCount = 0;
      let authority: PinnedRawGitBlobRequestAuthority = rawSourceAuthority();
      let selectedReference: typeof reference = { ...reference };
      if (kind === 'authority-accessor') {
        Object.defineProperty(authority, 'owner', {
          enumerable: true,
          get: () => {
            trapCount++;
            throw new Error('must not execute');
          },
        });
      } else if (kind === 'authority-proxy') {
        authority = new Proxy(authority, {
          get: () => {
            trapCount++;
            throw new Error('must not execute');
          },
          ownKeys: () => {
            trapCount++;
            throw new Error('must not execute');
          },
        });
      } else if (kind === 'reference-accessor') {
        Object.defineProperty(selectedReference, 'path', {
          enumerable: true,
          get: () => {
            trapCount++;
            throw new Error('must not execute');
          },
        });
      } else {
        selectedReference = new Proxy(selectedReference, {
          get: () => {
            trapCount++;
            throw new Error('must not execute');
          },
          ownKeys: () => {
            trapCount++;
            throw new Error('must not execute');
          },
        });
      }
      await expect(downloadPinnedRawGitBlobsWithBoundary(
        [selectedReference],
        '/private/staging',
        authority,
        harness.boundary,
      )).rejects.toThrow(/authority is invalid|own data records/u);
      expect(trapCount).toBe(0);
      expect(harness.requestOptions).toEqual([]);
    }
  });

  it.each(['path', 'identity'] as const)(
    'rejects a duplicate raw-source %s before creating a request',
    async (duplicate) => {
      const first = Buffer.from('first', 'utf8');
      const second = Buffer.from('second', 'utf8');
      const firstReference = rawSourceReference('doc/first.py', first);
      const secondReference = rawSourceReference(
        duplicate === 'path' ? firstReference.path : 'doc/second.py',
        duplicate === 'identity' ? first : second,
      );
      const harness = rawSourceHarness(2, () => ({ kind: 'hang' }));
      await expect(downloadPinnedRawGitBlobsWithBoundary(
        [firstReference, secondReference],
        '/private/staging',
        rawSourceAuthority(),
        harness.boundary,
      )).rejects.toThrow(/unique paths and blob identities/u);
      expect(harness.requestOptions).toEqual([]);
    },
  );

  it.each([408, 425, 429, 500, 503, 599])(
    'retries HTTP %i exactly four times, then closes every timer and request',
    async (statusCode) => {
      const bytes = Buffer.from('reviewed source', 'utf8');
      const reference = rawSourceReference('doc/retry.py', bytes);
      const harness = rawSourceHarness(1, () => ({
        kind: 'response',
        statusCode,
      }));
      const outcome = observeRawSourcePromise(
        downloadNestDocumentationRawSourcesForTest(
          [reference],
          '/private/staging',
          harness.boundary,
        ),
      );

      await flushRawSourceMicrotasks();
      for (let attempt = 1; attempt < 4; attempt++) {
        expect(harness.requests).toHaveLength(attempt);
        expect(harness.clock.runNext()).toBe(true);
        await flushRawSourceMicrotasks();
      }
      expect(harness.requests).toHaveLength(4);
      const result = await outcome;
      expect(result).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringContaining(`HTTP ${statusCode}`),
        }),
      });
      expect(harness.requests.every((request) => request.destroyed)).toBe(true);
      expect(harness.responses.every((response) => response.destroyed)).toBe(true);
      expect(harness.clock.pendingCount).toBe(0);
      expect(harness.agentDestroyCount()).toBeGreaterThan(0);
      expect(harness.writes).toEqual([]);
    },
  );

  it('clears per-request timers after each synchronous request-construction throw', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/construction.py', bytes);
    const harness = rawSourceHarness(1, () => ({
      kind: 'throw',
      error: new Error('synchronous construction failure'),
    }));
    const outcome = observeRawSourcePromise(
      downloadNestDocumentationRawSourcesForTest(
        [reference],
        '/private/staging',
        harness.boundary,
      ),
    );

    await flushRawSourceMicrotasks();
    for (let attempt = 1; attempt < 4; attempt++) {
      expect(harness.requestOptions).toHaveLength(attempt);
      // Only the global and retry timers may survive construction failure;
      // absolute and idle request timers must already have been cleared.
      expect(harness.clock.pendingCount).toBe(2);
      expect(harness.clock.runNext()).toBe(true);
      await flushRawSourceMicrotasks();
    }
    expect(harness.requestOptions).toHaveLength(4);
    expect(await outcome).toMatchObject({
      ok: false,
      error: expect.objectContaining({
        message: expect.stringContaining('synchronous construction failure'),
      }),
    });
    expect(harness.requests).toEqual([]);
    expect(harness.clock.pendingCount).toBe(0);
    expect(harness.agentDestroyCount()).toBeGreaterThan(0);
  });

  it.each(['request', 'response'] as const)(
    'recovers from one retryable %s error and stages only the later exact response',
    async (errorOrigin) => {
      const bytes = Buffer.from('reviewed source', 'utf8');
      const reference = rawSourceReference(`doc/${errorOrigin}-retry.py`, bytes);
      const harness = rawSourceHarness(1, (index) => index === 0
        ? {
          kind: 'response',
          end: false,
          ...(errorOrigin === 'request'
            ? { requestError: new Error('synthetic request failure') }
            : { responseError: new Error('synthetic response failure') }),
        }
        : { kind: 'response', chunks: [bytes] });
      const outcome = downloadNestDocumentationRawSourcesForTest(
        [reference],
        '/private/staging',
        harness.boundary,
      );

      await flushRawSourceMicrotasks();
      expect(harness.requests).toHaveLength(1);
      expect(harness.clock.runNext()).toBe(true);
      await flushRawSourceMicrotasks();

      await expect(outcome).resolves.toEqual(['/private/staging/0000.blob']);
      expect(harness.requests).toHaveLength(2);
      expect(harness.writes).toEqual([
        { target: '/private/staging/0000.blob', bytes },
      ]);
      expect(harness.clock.pendingCount).toBe(0);
    },
  );

  it('closes without ending a request whose response settles before request returns', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/synchronous-response.py', bytes);
    const harness = rawSourceHarness(1, () => ({
      kind: 'response-before-return',
      chunks: [bytes],
      emitErrorOnDestroy: false,
    }));

    const result = await downloadNestDocumentationRawSourcesForTest(
      [reference],
      '/private/staging',
      harness.boundary,
    );

    expect(result).toEqual(['/private/staging/0000.blob']);
    expect(harness.requests).toHaveLength(1);
    expect(harness.requests[0]).toMatchObject({
      destroyed: true,
      ended: false,
    });
    expect(harness.writes).toEqual([
      { target: '/private/staging/0000.blob', bytes },
    ]);
    expect(harness.clock.pendingCount).toBe(0);
  });

  it.each([
    {
      name: 'ordinary HTTP 404',
      plan: { kind: 'response', statusCode: 404 } as FakeRawSourcePlan,
      expected: /HTTP 404/u,
      limits: {},
    },
    {
      name: 'redirect with location',
      plan: {
        kind: 'response',
        statusCode: 307,
        headers: { location: 'https://example.invalid/substitute' },
      } as FakeRawSourcePlan,
      expected: /HTTP 307/u,
      limits: {},
    },
    {
      name: 'unsupported content encoding',
      plan: {
        kind: 'response',
        headers: { 'content-encoding': 'gzip' },
      } as FakeRawSourcePlan,
      expected: /unsupported content encoding/u,
      limits: {},
    },
    {
      name: 'duplicate content length',
      plan: {
        kind: 'response',
        headers: { 'content-length': '1' },
        rawHeaders: ['Content-Length', '1', 'content-length', '1'],
      } as FakeRawSourcePlan,
      expected: /repeated content-length/u,
      limits: {},
    },
    {
      name: 'unsupported transfer encoding',
      plan: {
        kind: 'response',
        headers: { 'transfer-encoding': 'gzip' },
        rawHeaders: ['Transfer-Encoding', 'gzip'],
      } as FakeRawSourcePlan,
      expected: /unsupported transfer-encoding/u,
      limits: {},
    },
    {
      name: 'duplicate transfer encoding',
      plan: {
        kind: 'response',
        headers: { 'transfer-encoding': 'chunked' },
        rawHeaders: [
          'Transfer-Encoding',
          'chunked',
          'transfer-encoding',
          'chunked',
        ],
      } as FakeRawSourcePlan,
      expected: /repeated transfer-encoding/u,
      limits: {},
    },
    {
      name: 'content length with transfer encoding',
      plan: {
        kind: 'response',
        headers: {
          'content-length': '15',
          'transfer-encoding': 'chunked',
        },
        rawHeaders: [
          'Content-Length',
          '15',
          'Transfer-Encoding',
          'chunked',
        ],
      } as FakeRawSourcePlan,
      expected: /combined content-length and transfer-encoding/u,
      limits: {},
    },
    {
      name: 'invalid content length',
      plan: {
        kind: 'response',
        headers: { 'content-length': '01' },
        rawHeaders: ['Content-Length', '01'],
      } as FakeRawSourcePlan,
      expected: /invalid content-length/u,
      limits: {},
    },
    {
      name: 'Git blob hash mismatch',
      plan: {
        kind: 'response',
        chunks: [Buffer.from('different source', 'utf8')],
      } as FakeRawSourcePlan,
      expected: /do not match pinned Git blob/u,
      limits: {},
    },
    {
      name: 'non-binary body event',
      plan: {
        kind: 'response',
        chunks: ['reviewed source'],
      } as FakeRawSourcePlan,
      expected: /non-binary data/u,
      limits: {},
    },
    {
      name: 'data-event overflow',
      plan: {
        kind: 'response',
        chunks: [Buffer.from('a'), Buffer.from('b')],
      } as FakeRawSourcePlan,
      expected: /data-event limit/u,
      limits: { dataEventLimit: 1 },
    },
    {
      name: 'received per-blob overflow',
      plan: {
        kind: 'response',
        chunks: [Buffer.alloc(5, 0x61)],
      } as FakeRawSourcePlan,
      expected: /per-blob byte limit/u,
      limits: { blobByteLimit: 4 },
    },
  ])('does not retry $name', async ({ plan, expected, limits }) => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/fatal.py', bytes);
    const harness = rawSourceHarness(1, () => plan, { limits });
    const result = await observeRawSourcePromise(
      downloadNestDocumentationRawSourcesForTest(
        [reference],
        '/private/staging',
        harness.boundary,
      ),
    );

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(String(result.error)).toMatch(expected);
    expect(harness.requestOptions).toHaveLength(1);
    expect(harness.requests.every((request) => request.destroyed)).toBe(true);
    expect(harness.clock.pendingCount).toBe(0);
    expect(harness.writes).toEqual([]);
  });

  it.each([
    {
      name: 'idle',
      limits: { idleTimeoutMs: 5, absoluteTimeoutMs: 50, globalTimeoutMs: 100 },
      expected: /became idle/u,
      attempts: 4,
    },
    {
      name: 'absolute',
      limits: { idleTimeoutMs: 50, absoluteTimeoutMs: 5, globalTimeoutMs: 100 },
      expected: /timed out/u,
      attempts: 4,
    },
    {
      name: 'global',
      limits: { idleTimeoutMs: 50, absoluteTimeoutMs: 60, globalTimeoutMs: 5 },
      expected: /global timeout/u,
      attempts: 1,
    },
  ])('closes all request and clock handles on $name timeout', async ({
    limits,
    expected,
    attempts,
  }) => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/timeout.py', bytes);
    const harness = rawSourceHarness(1, () => ({
      kind: 'hang',
      emitErrorOnDestroy: false,
    }), { limits });
    const outcome = observeRawSourcePromise(
      downloadNestDocumentationRawSourcesForTest(
        [reference],
        '/private/staging',
        harness.boundary,
      ),
    );

    await flushRawSourceMicrotasks();
    for (let attempt = 1; attempt <= attempts; attempt++) {
      expect(harness.requests).toHaveLength(attempt);
      expect(harness.clock.runNext()).toBe(true);
      await flushRawSourceMicrotasks();
      if (attempt < attempts) {
        expect(harness.clock.runNext()).toBe(true);
        await flushRawSourceMicrotasks();
      }
    }
    const result = await outcome;
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(String(result.error)).toMatch(expected);
    expect(harness.requests.every((request) => request.destroyed)).toBe(true);
    expect(harness.clock.pendingCount).toBe(0);
    expect(harness.agentDestroyCount()).toBeGreaterThan(0);
    expect(harness.writes).toEqual([]);
  });

  it('does not let zero-byte data events refresh the idle deadline', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/zero-byte-idle.py', bytes);
    const harness = rawSourceHarness(1, () => ({
      kind: 'response',
      end: false,
    }), {
      limits: {
        attempts: 1,
        retryDelayMs: [],
        idleTimeoutMs: 5,
        absoluteTimeoutMs: 50,
        globalTimeoutMs: 100,
      },
    });
    const outcome = observeRawSourcePromise(
      downloadNestDocumentationRawSourcesForTest(
        [reference],
        '/private/staging',
        harness.boundary,
      ),
    );

    await flushRawSourceMicrotasks();
    harness.clock.advanceBy(4);
    harness.responses[0]!.emitData(Buffer.alloc(0));
    expect(harness.clock.runNext()).toBe(true);
    expect(harness.clock.currentTime).toBe(5);
    await expect(outcome).resolves.toMatchObject({
      ok: false,
      error: expect.objectContaining({ message: expect.stringMatching(/became idle/u) }),
    });
    expect(harness.writes).toEqual([]);
    expect(harness.clock.pendingCount).toBe(0);
  });

  it('rejects declared Content-Length drift without staging bytes', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/content-length-drift.py', bytes);
    const declaredLength = String(bytes.byteLength + 1);
    const harness = rawSourceHarness(1, () => ({
      kind: 'response',
      headers: { 'content-length': declaredLength },
      rawHeaders: ['Content-Length', declaredLength],
      chunks: [bytes],
    }), {
      limits: { attempts: 1, retryDelayMs: [] },
    });

    await expect(downloadNestDocumentationRawSourcesForTest(
      [reference],
      '/private/staging',
      harness.boundary,
    )).rejects.toThrow(/response length drifted/u);
    expect(harness.writes).toEqual([]);
    expect(harness.clock.pendingCount).toBe(0);
  });

  it.each(['aborted', 'close'] as const)(
    'retries a response that emits %s before end and never stages it',
    async (terminalEvent) => {
      const bytes = Buffer.from('reviewed source', 'utf8');
      const reference = rawSourceReference('doc/premature.py', bytes);
      const harness = rawSourceHarness(1, () => ({
        kind: 'response',
        end: false,
        [terminalEvent]: true,
      }));
      const outcome = observeRawSourcePromise(
        downloadNestDocumentationRawSourcesForTest(
          [reference],
          '/private/staging',
          harness.boundary,
        ),
      );

      await flushRawSourceMicrotasks();
      for (let attempt = 1; attempt < 4; attempt++) {
        expect(harness.requests).toHaveLength(attempt);
        expect(harness.clock.runNext()).toBe(true);
        await flushRawSourceMicrotasks();
      }
      expect(await outcome).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringMatching(/aborted|closed before end/u),
        }),
      });
      expect(harness.requests).toHaveLength(4);
      expect(harness.writes).toEqual([]);
      expect(harness.clock.pendingCount).toBe(0);
    },
  );

  it('ignores close after an exact end and accepted body', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/complete-close.py', bytes);
    const harness = rawSourceHarness(1, () => ({
      kind: 'response',
      chunks: [bytes],
      close: true,
    }));

    await expect(downloadNestDocumentationRawSourcesForTest(
      [reference],
      '/private/staging',
      harness.boundary,
    )).resolves.toEqual(['/private/staging/0000.blob']);
    expect(harness.requests).toHaveLength(1);
    expect(harness.writes).toEqual([
      { target: '/private/staging/0000.blob', bytes },
    ]);
  });

  it('fails closed when HTTPS agent cleanup is uncertain after success', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/agent-cleanup.py', bytes);
    const harness = rawSourceHarness(1, () => ({
      kind: 'response',
      chunks: [bytes],
    }), { agentDestroyFailure: true });

    const result = await observeRawSourcePromise(
      downloadNestDocumentationRawSourcesForTest(
        [reference],
        '/private/staging',
        harness.boundary,
      ),
    );
    expect(result).toMatchObject({
      ok: false,
      error: expect.objectContaining({
        message: 'raw-source HTTPS agent cleanup is uncertain',
      }),
    });
    expect(harness.agentDestroyCount()).toBe(1);
  });

  it('retains both acquisition and HTTPS-agent cleanup failures', async () => {
    const bytes = Buffer.from('reviewed source', 'utf8');
    const reference = rawSourceReference('doc/combined-failure.py', bytes);
    const harness = rawSourceHarness(1, () => ({
      kind: 'response',
      statusCode: 404,
    }), { agentDestroyFailure: true });

    const result = await observeRawSourcePromise(
      downloadNestDocumentationRawSourcesForTest(
        [reference],
        '/private/staging',
        harness.boundary,
      ),
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AggregateError);
      expect((result.error as AggregateError).message).toBe(
        'raw-source acquisition and HTTPS agent cleanup both failed',
      );
      expect((result.error as AggregateError).errors.map(String)).toEqual([
        expect.stringMatching(/HTTP 404/u),
        expect.stringMatching(/HTTPS agent cleanup is uncertain/u),
      ]);
    }
    expect(harness.writes).toEqual([]);
    expect(harness.clock.pendingCount).toBe(0);
  });

  it('aborts all concurrent requests at the received-body budget crossing', async () => {
    const first = Buffer.from('abc', 'utf8');
    const second = Buffer.from('def', 'utf8');
    const references = [
      rawSourceReference('doc/received-a.py', first),
      rawSourceReference('doc/received-b.py', second),
    ];
    const harness = rawSourceHarness(2, (index) => index === 0
      ? {
        kind: 'response',
        chunks: [first],
        end: false,
        emitErrorOnDestroy: false,
      }
      : {
        kind: 'response',
        chunks: [second],
        end: false,
        emitErrorOnDestroy: false,
      }, {
      limits: {
        concurrency: 2,
        successfulByteLimit: 5,
        receivedBodyByteLimit: 5,
      },
    });
    const result = await observeRawSourcePromise(
      downloadNestDocumentationRawSourcesForTest(
        references,
        '/private/staging',
        harness.boundary,
      ),
    );

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(String(result.error)).toMatch(/received-body byte limit/u);
    expect(harness.requests).toHaveLength(2);
    expect(harness.requests.every((request) => request.destroyed)).toBe(true);
    expect(harness.responses.every((response) => response.destroyed)).toBe(true);
    expect(harness.clock.pendingCount).toBe(0);
    expect(harness.writes).toEqual([]);
  });

  it(
    'prevents a late successful response from staging after a concurrent fatal response',
    async () => {
      const first = Buffer.from('abc', 'utf8');
      const second = Buffer.from('def', 'utf8');
      const references = [
        rawSourceReference('doc/late-a.py', first),
        rawSourceReference('doc/fatal-b.py', second),
      ];
      const harness = rawSourceHarness(2, (index) => index === 0
        ? { kind: 'response', chunks: [first], end: false }
        : { kind: 'response', statusCode: 404 }, {
        limits: { concurrency: 2 },
      });
      const result = await observeRawSourcePromise(
        downloadNestDocumentationRawSourcesForTest(
          references,
          '/private/staging',
          harness.boundary,
        ),
      );

      expect(result).toMatchObject({ ok: false });
      if (!result.ok) expect(String(result.error)).toMatch(/HTTP 404/u);
      expect(harness.requests.every((request) => request.destroyed)).toBe(true);
      expect(harness.writes).toEqual([]);
      harness.responses[0]!.emitEnd();
      await flushRawSourceMicrotasks();
      expect(harness.writes).toEqual([]);
      expect(harness.clock.pendingCount).toBe(0);
    },
  );

  it('fails before staging the blob that crosses the successful-byte budget', async () => {
    const first = Buffer.from('abc', 'utf8');
    const second = Buffer.from('def', 'utf8');
    const references = [
      rawSourceReference('doc/success-a.py', first),
      rawSourceReference('doc/success-b.py', second),
    ];
    const harness = rawSourceHarness(2, (index) => ({
      kind: 'response',
      chunks: [index === 0 ? first : second],
    }), {
      limits: { successfulByteLimit: 5 },
    });
    const result = await observeRawSourcePromise(
      downloadNestDocumentationRawSourcesForTest(
        references,
        '/private/staging',
        harness.boundary,
      ),
    );

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(String(result.error)).toMatch(/successful-byte limit/u);
    expect(harness.requests).toHaveLength(2);
    expect(harness.writes).toHaveLength(1);
    expect(harness.writes[0]!.bytes).toEqual(first);
    expect(harness.clock.pendingCount).toBe(0);
  });

  it.each(['write', 'lstat', 'realpath'] as const)(
    'preserves the first %s staging exception and aborts a concurrent request',
    async (stagingFailure) => {
      const first = Buffer.from('abc', 'utf8');
      const second = Buffer.from('def', 'utf8');
      const references = [
        rawSourceReference('doc/stage-a.py', first),
        rawSourceReference('doc/stage-b.py', second),
      ];
      const harness = rawSourceHarness(2, (index) => index === 0
        ? { kind: 'response', chunks: [first] }
        : { kind: 'hang' }, {
        limits: { concurrency: 2 },
        stagingFailure,
      });
      const result = await observeRawSourcePromise(
        downloadNestDocumentationRawSourcesForTest(
          references,
          '/private/staging',
          harness.boundary,
        ),
      );

      expect(result).toMatchObject({ ok: false });
      if (!result.ok) {
        expect(String(result.error)).toContain(`first staging ${stagingFailure} failure`);
      }
      expect(harness.requests).toHaveLength(2);
      expect(harness.requests[1]!.destroyed).toBe(true);
      expect(harness.clock.pendingCount).toBe(0);
      const writeCountAtFailure = harness.writes.length;
      for (const response of harness.responses) {
        response.emitData(second);
        response.emitEnd();
      }
      await flushRawSourceMicrotasks();
      expect(harness.writes).toHaveLength(writeCountAtFailure);
    },
  );

  it(
    'uses only the fixed raw host, TLS, method, and identity-encoding request surface',
    async () => {
      expect(Object.isFrozen(nestDocumentationRawSourceTesting)).toBe(true);
      const bytes = Buffer.from('reviewed source', 'utf8');
      const reference = rawSourceReference('doc/request.py', bytes);
      const harness = rawSourceHarness(1, () => ({
        kind: 'response',
        chunks: [bytes],
      }));
      const result = await downloadNestDocumentationRawSourcesForTest(
        [reference],
        '/private/staging',
        harness.boundary,
      );

      expect(result).toEqual(['/private/staging/0000.blob']);
      expect(harness.requestOptions).toEqual([{
        agent: expect.any(Object),
        headers: {
          Accept: 'application/octet-stream',
          'Accept-Encoding': 'identity',
          'User-Agent': 'cortexel-nest-documentation-inventory/1',
        },
        hostname: 'raw.githubusercontent.com',
        maxHeaderSize: 16 * 1024,
        method: 'GET',
        path: nestDocumentationRawSourcePath(reference),
        port: 443,
        protocol: 'https:',
        rejectUnauthorized: true,
        signal: expect.any(AbortSignal),
      }]);
      expect(harness.requestOptions[0]!.signal.aborted).toBe(false);
      expect(harness.writes).toEqual([
        { target: '/private/staging/0000.blob', bytes },
      ]);
      expect(harness.clock.pendingCount).toBe(0);
    },
  );

  it('rejects a symlinked object database and a nested object-store symlink', () => {
    const temporaryRoot = realpathSync(mkdtempSync(path.join(
      tmpdir(),
      'cortexel-nest-documentation-acquisition-',
    )));
    try {
      const repository = path.join(temporaryRoot, 'repository');
      git(temporaryRoot, ['init', '--quiet', repository]);

      expect(verifyNestDocumentationOfflineAcquisitionContext(
        repository,
        temporaryRoot,
      )).toMatchObject({
        repository: realpathSync(repository),
        temporaryRoot,
      });

      const objectDirectory = path.join(repository, '.git', 'objects');
      const movedObjectDirectory = path.join(temporaryRoot, 'moved-objects');
      renameSync(objectDirectory, movedObjectDirectory);
      symlinkSync(movedObjectDirectory, objectDirectory, 'dir');
      expect(() => verifyNestDocumentationOfflineAcquisitionContext(
        repository,
        temporaryRoot,
      )).toThrow(/object database must be a direct directory/u);

      rmSync(objectDirectory);
      renameSync(movedObjectDirectory, objectDirectory);
      const nestedTarget = path.join(temporaryRoot, 'nested-object-entry');
      mkdirSync(nestedTarget);
      symlinkSync(
        nestedTarget,
        path.join(objectDirectory, 'info', 'nested-symlink'),
        'dir',
      );
      expect(() => verifyNestDocumentationOfflineAcquisitionContext(
        repository,
        temporaryRoot,
      )).toThrow(/must not contain symbolic links/u);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }, 120_000);

  it.each([
    {
      name: 'remote configuration',
      mutate: ({ repository }: ReturnType<typeof temporaryRepository>) =>
        git(repository, ['remote', 'add', 'stale', 'https://example.invalid/nest.git']),
      expected: /configured remote/u,
    },
    {
      name: 'filesystem alternates',
      mutate: ({ repository }: ReturnType<typeof temporaryRepository>) =>
        writeFileSync(path.join(repository, '.git', 'objects', 'info', 'alternates'), '/tmp\n'),
      expected: /alternate Git object database/u,
    },
    {
      name: 'HTTP alternates',
      mutate: ({ repository }: ReturnType<typeof temporaryRepository>) =>
        writeFileSync(
          path.join(repository, '.git', 'objects', 'info', 'http-alternates'),
          'https://example.invalid/objects\n',
        ),
      expected: /HTTP alternate Git object database/u,
    },
    {
      name: 'nested object-store symlink',
      mutate: (fixture: ReturnType<typeof temporaryRepository>) => {
        const target = path.join(fixture.temporaryRoot, 'late-object-entry');
        mkdirSync(target);
        symlinkSync(
          target,
          path.join(fixture.repository, '.git', 'objects', 'info', 'late-symlink'),
          'dir',
        );
      },
      expected: /must not contain symbolic links/u,
    },
    {
      name: 'FETCH_HEAD residue',
      mutate: ({ repository }: ReturnType<typeof temporaryRepository>) =>
        writeFileSync(path.join(repository, '.git', 'FETCH_HEAD'), 'unreviewed\n'),
      expected: /must not retain FETCH_HEAD/u,
    },
    {
      name: 'checkout index residue',
      mutate: ({ repository }: ReturnType<typeof temporaryRepository>) =>
        writeFileSync(path.join(repository, '.git', 'index'), 'unreviewed\n'),
      expected: /must not carry a checkout index/u,
    },
    {
      name: 'sparse-checkout state',
      mutate: ({ repository }: ReturnType<typeof temporaryRepository>) => {
        git(repository, ['config', '--local', 'core.sparseCheckout', 'true']);
        writeFileSync(
          path.join(repository, '.git', 'info', 'sparse-checkout'),
          '/selected\n',
        );
      },
      expected: /must not retain sparse-checkout patterns/u,
    },
    {
      name: 'temporary pack residue',
      mutate: ({ repository }: ReturnType<typeof temporaryRepository>) =>
        writeFileSync(
          path.join(repository, '.git', 'objects', 'pack', 'tmp_pack_unreviewed'),
          'partial',
        ),
      expected: /temporary or acquisition-sidecar residue/u,
    },
    {
      name: 'promisor marker residue',
      mutate: ({ repository }: ReturnType<typeof temporaryRepository>) =>
        writeFileSync(
          path.join(
            repository,
            '.git',
            'objects',
            'pack',
            `pack-${'0'.repeat(40)}.promisor`,
          ),
          '',
        ),
      expected: /temporary or acquisition-sidecar residue/u,
    },
    {
      name: 'corrupt pack family',
      mutate: ({ repository }: ReturnType<typeof temporaryRepository>) => {
        const stem = path.join(
          repository,
          '.git',
          'objects',
          'pack',
          `pack-${'0'.repeat(40)}`,
        );
        writeFileSync(`${stem}.idx`, 'not an index');
        writeFileSync(`${stem}.pack`, 'not a pack');
      },
      expected: /pack family is truncated/u,
    },
  ])('reverifies and rejects stale $name before builder reads', ({ mutate, expected }) => {
    const fixture = temporaryRepository();
    try {
      const context = verifyNestDocumentationOfflineAcquisitionContext(
        fixture.repository,
        fixture.temporaryRoot,
      );
      mutate(fixture);
      expect(() => buildNestDocumentationSourceInventory(
        fixture.repository,
        PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY,
        context,
      )).toThrow(expected);
    } finally {
      fixture.cleanup();
    }
  }, 30_000);

  it('removes only paired promisor and reverse-index acquisition sidecars', () => {
    const fixture = temporaryRepository();
    try {
      git(fixture.repository, [
        '-c',
        'user.name=Cortexel',
        '-c',
        'user.email=cortexel@example.invalid',
        'commit',
        '--quiet',
        '--allow-empty',
        '-m',
        'sidecar fixture',
      ]);
      git(fixture.repository, ['repack', '-a', '-d']);
      const packDirectory = path.join(
        fixture.repository,
        '.git',
        'objects',
        'pack',
      );
      const packName = readdirSync(packDirectory).find((name) =>
        /^pack-[0-9a-f]{40}\.pack$/u.test(name));
      expect(packName).toBeDefined();
      const stem = packName!.slice(0, -'.pack'.length);
      const promisor = path.join(packDirectory, `${stem}.promisor`);
      const reverseIndex = path.join(packDirectory, `${stem}.rev`);
      writeFileSync(promisor, '');
      if (!readdirSync(packDirectory).includes(`${stem}.rev`)) {
        writeFileSync(reverseIndex, '');
      }

      removeGitAcquisitionSidecars(
        fixture.repository,
        'acquisition-sidecar positive control',
      );

      expect(readdirSync(packDirectory).sort()).toEqual([
        `${stem}.idx`,
        `${stem}.pack`,
      ]);
    } finally {
      fixture.cleanup();
    }
  });

  it('rejects an extra valid loose object against an exact local closure', {
    timeout: 60_000,
  }, () => {
    const fixture = temporaryRepository();
    try {
      const expected = inspectOfflineGitObjectSet(
        fixture.repository,
        'empty exact-object fixture',
      );
      expect(expected).toEqual([]);
      const payload = path.join(fixture.temporaryRoot, 'extra-object-source');
      writeFileSync(payload, 'unreviewed object bytes');
      git(fixture.repository, ['hash-object', '-w', payload]);
      expect(() => requireExactOfflineGitObjectSet(
        fixture.repository,
        expected,
        'exact-object negative control',
      )).toThrow(/differs from its exact expected closure/u);
    } finally {
      fixture.cleanup();
    }
  });

  it('derives nonvisual notebook and UserDocs counts from raw selected records', () => {
    const notebookBlob = rawClassificationBlob('fixture/counts.ipynb');
    const notebook = {
      cells: [{
        outputs: [
          {
            output_type: 'execute_result',
            data: {
              'text/latex': ['x', ' + y'],
              'text/plain': 'x + y',
            },
          },
          { output_type: 'stream', text: ['first', 'second'] },
          {
            output_type: 'display_data',
            data: { 'text/plain': ['plain'] },
          },
        ],
      }],
    };
    expect(nestDocumentationSourceInventoryTesting.notebookStoredOutputs(
      notebookBlob as never,
      Buffer.from(JSON.stringify(notebook), 'utf8'),
    )).toMatchObject({
      pngAssets: [],
      counts: {
        imagePngDataCount: 0,
        textLatexDataCount: 1,
        textPlainDataCount: 2,
        streamOutputCount: 1,
      },
    });

    const changedNotebook = structuredClone(notebook);
    delete changedNotebook.cells[0]!.outputs[0]!.data!['text/latex'];
    expect(nestDocumentationSourceInventoryTesting.notebookStoredOutputs(
      notebookBlob as never,
      Buffer.from(JSON.stringify(changedNotebook), 'utf8'),
    ).counts.textLatexDataCount).toBe(0);

    const malformedNotebook = structuredClone(notebook);
    malformedNotebook.cells[0]!.outputs[2]!.data!['text/plain'] = [1] as never;
    expect(() => nestDocumentationSourceInventoryTesting.notebookStoredOutputs(
      notebookBlob as never,
      Buffer.from(JSON.stringify(malformedNotebook), 'utf8'),
    )).toThrow(/text\/plain.*not a string or string array/u);

    const userdocsBlob = rawClassificationBlob('fixture/model.h');
    const twoFigures = [
      'BeginUserDocs: model, neuron',
      '',
      '.. figure:: first.svg',
      '',
      '  .. figure:: second.svg',
      'ordinary figure:: text',
      'EndUserDocs',
      '',
    ].join('\n');
    expect(nestDocumentationSourceInventoryTesting.parseUserdocsBlock(
      userdocsBlob as never,
      Buffer.from(twoFigures, 'utf8'),
    )?.figureDirectiveCount).toBe(2);
    expect(nestDocumentationSourceInventoryTesting.parseUserdocsBlock(
      userdocsBlob as never,
      Buffer.from(twoFigures.replace('.. figure:: first.svg', '.. image:: first.svg'), 'utf8'),
    )?.figureDirectiveCount).toBe(1);
  });

  it('binds the exact commit, every admitted blob byte identity, and bounded classifications', () => {
    const { raw, inventory } = inventoryEvidence();
    expect(validateNestDocumentationSourceInventory(inventory)).toEqual([]);
    expect(inventory).toMatchObject({
      protocol: 'cortexel-nest-documentation-source-inventory',
      protocolVersion: 1,
      identityAlgorithm: NEST_DOCUMENTATION_SOURCE_INVENTORY_IDENTITY,
      inventoryDigest: PINNED_NEST_DOCUMENTATION_SOURCE_INVENTORY_DIGEST,
      acquisition: {
        producerProfile: NEST_DOCUMENTATION_ACQUISITION_PRODUCER_PROFILE,
        temporaryRootDiscretionaryAuthority:
          'current_uid_mode_0700_and_reviewed_non_authorizing_posix_acl_verified',
      },
      linkedExampleSourceInventory: {
        protocol: 'cortexel-nest-example-source-inventory',
        protocolVersion: 2,
        inventoryDigest: PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
        evidenceTransfer: 'none',
      },
      upstream: {
        commit: PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.commit,
        rootTreeGitSha1:
          PINNED_NEST_DOCUMENTATION_INVENTORY_AUTHORITY.rootTreeGitSha1,
      },
      buildBoundary: {
        sphinxGalleryExecution:
          'configured_literal_false_string_not_executed',
        notebookExecution: 'configured_never_not_executed',
        ambientPatchUrl: 'may_download_and_git_apply_before_build',
        dependencySpecification: 'recommended_unlocked_requirements_not_lock',
        dependencyResolutionAuthority: 'not_established',
        networkIsolation: 'not_established',
        buildInputClosure: 'not_established',
        sourceMutationExclusion: 'not_established',
        reproducibleBuildReceipt: 'not_run',
      },
    });
    expect(canonicalNestDocumentationSourceInventory(inventory as never)).toBe(raw);
    expect(raw).toBe(canonicalize(inventory));

    expect(inventory.sourceBlobs).toHaveLength(784);
    const paths = inventory.sourceBlobs.map(({ path: sourcePath }: JsonRecord) =>
      sourcePath);
    expect(paths).toEqual([...paths].sort());
    expect(new Set(paths).size).toBe(paths.length);
    for (const source of inventory.sourceBlobs as JsonRecord[]) {
      expect(source.gitBlobSha1).toMatch(/^[0-9a-f]{40}$/u);
      expect(source.sha256).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(source.byteLength).toBeGreaterThanOrEqual(0);
      expect(source.pathBytesBase64).toBe(
        Buffer.from(source.path, 'utf8').toString('base64'),
      );
    }

    expect(inventory.summary).toEqual(expect.objectContaining({
      documentationTreeLeafCount: 473,
      documentationRstCount: 142,
      documentationNotebookCount: 8,
      documentationPythonCount: 13,
      documentationMediaCount: 282,
      documentationSupportCount: 28,
      pynestPublicModuleCandidateCount: 29,
      userdocsHeaderCandidateCount: 278,
      userdocsBlockCount: 146,
      notebookPngCount: 50,
      notebookPlotPngCount: 38,
      notebookFormulaPngCount: 12,
      notebookTextLatexDataCount: 12,
      notebookTextPlainDataCount: 54,
      notebookStreamOutputCount: 19,
      userdocsFigureDirectiveCount: 2,
      scriptFigureFamilyCount: 18,
      scriptActiveSaveCount: 17,
      authoredDiagramSourceCount: 3,
      authoredDiagramDirectiveCount: 4,
      publicVisualizationModuleCount: 4,
      admittedExecutionBoundVisualOutputCount: 0,
      coverageClaim: 'none',
    }));
    expect(inventory.notebookStoredOutputCounts).toEqual({
      imagePngDataCount: 50,
      textLatexDataCount: 12,
      textPlainDataCount: 54,
      streamOutputCount: 19,
    });
    expect(inventory.userdocsDirectiveCounts).toEqual({
      figureDirectivesExcludedFromRstSourceCount: 2,
    });
  });

  it('keeps stored formulas, plot-like PNGs, source definitions, and built outputs distinct', () => {
    const { inventory } = inventoryEvidence();
    const notebookClasses = Object.fromEntries(
      ['plot_like_stored_output', 'formula_render_stored_output'].map(
        (classification) => [
          classification,
          inventory.notebookPngAssets.filter(
            (asset: JsonRecord) => asset.classification === classification,
          ).length,
  ],
      ),
    );
    expect(notebookClasses).toEqual({
      plot_like_stored_output: 38,
      formula_render_stored_output: 12,
    });
    expect(
      inventory.notebookPngAssets.every(
        ({ buildExecutionState }: JsonRecord) =>
          buildExecutionState ===
            'stored_bytes_only_configured_never_not_executed',
      ),
    ).toBe(true);

    const saved = inventory.documentationScriptFigures.filter(
      ({ saveState }: JsonRecord) => saveState === 'active_literal_save_call',
    );
    expect(saved).toHaveLength(17);
    expect(saved.every(({ literalSaveTarget }: JsonRecord) =>
      typeof literalSaveTarget === 'string')).toBe(true);
    expect(saved.every(({ saveTargetCwdAuthority }: JsonRecord) =>
      saveTargetCwdAuthority === 'unbound_not_assessed')).toBe(true);
    expect(saved.every(({ saveTargetResolutionState }: JsonRecord) =>
      saveTargetResolutionState === 'not_assessed')).toBe(true);
    expect(saved.every((figure: JsonRecord) =>
      !('resolvedSaveTarget' in figure) && !('pinnedTargetPresence' in figure))).toBe(true);
    expect(
      inventory.documentationScriptFigures.find(
        ({ family }: JsonRecord) => family === 'layer1',
      ),
    ).toMatchObject({
      saveState: 'no_active_save_call',
      literalSaveTarget: null,
      saveTargetCwdAuthority: 'not_applicable',
      saveTargetResolutionState: 'not_applicable',
    });
    expect(inventory.excludedScriptCandidates).toEqual([
      expect.objectContaining({
        family: 'conn_3d',
        reason:
          'empty_active_top_level_figure_with_branch_render_invocations_and_save_commented',
      }),
    ]);

    expect(
      Object.fromEntries(
        inventory.evidenceAxes.map(({ id, state }: JsonRecord) => [id, state]),
      ),
    ).toEqual({
      documentation_selected_source_inventory: 'complete',
      documentation_build_execution: 'not_run',
      execution_bound_visual_output_inventory: 'not_established',
      stable_contract_mapping: 'not_assessed',
      packaged_adapter_implementation: 'not_assessed',
      renderer_parity: 'not_assessed',
      scientific_certification: 'not_run',
    });
    expect(inventory.summary).toMatchObject({
      admittedExecutionBoundVisualOutputCount: 0,
      mappedVisualOutputCount: 0,
      executableVisualOutputCount: 0,
      renderedVisualOutputCount: 0,
      certifiedVisualOutputCount: 0,
      coverageClaim: 'none',
    });
  });

  it('independently rejects scope, class, figure, exclusion, acquisition, and evidence drift', () => {
    const retained = inventoryEvidence().inventory;
    const inventory = migrateRetainedArtifactToCurrentShape(retained);
    expect(validateNestDocumentationSourceInventory(inventory).filter(
      (problem) =>
        problem !==
          'documentation source inventory digest does not equal the reviewed pinned NEST v3.10 inventory',
    )).toEqual([]);

    const byteDrift = structuredClone(inventory);
    byteDrift.sourceBlobs[0].sha256 = `sha256:${'0'.repeat(64)}`;
    expect(validateNestDocumentationSourceInventory(byteDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('digest does not bind'),
        expect.stringContaining('mismatched identity'),
      ]),
    );

    const hiddenNonRecord = structuredClone(inventory);
    hiddenNonRecord.sourceBlobs.push(null);
    rebindInventoryDigest(hiddenNonRecord);
    expect(validateNestDocumentationSourceInventory(hiddenNonRecord)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sourceBlobs[784] must be a plain object row'),
        expect.stringContaining('row cardinality does not equal'),
      ]),
    );

    const unknownRootMember = structuredClone(inventory);
    unknownRootMember.unreviewedAuthority = 'complete';
    rebindInventoryDigest(unknownRootMember);
    expect(validateNestDocumentationSourceInventory(unknownRootMember)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('root does not have its exact closed member set'),
      ]),
    );

    const classificationDrift = structuredClone(inventory);
    const classificationAsset = classificationDrift.notebookPngAssets.find(
      ({ classification }: JsonRecord) => classification === 'plot_like_stored_output',
    );
    classificationAsset.classification = 'formula_render_stored_output';
    classificationAsset.buildExecutionState =
      'stored_bytes_only_configured_never_not_executed';
    rebindRowIdentity(
      classificationAsset,
      'assetId',
      'cortexel.nest-documentation.notebook-png.v1',
    );
    rebindInventoryDigest(classificationDrift);
    expect(validateNestDocumentationSourceInventory(classificationDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('violates its closed classification'),
      ]),
    );

    const scopeDrift = structuredClone(inventory);
    scopeDrift.sourceBlobs[0].scopeMembership = ['documentation_tree'];
    rebindInventoryDigest(scopeDrift);
    expect(validateNestDocumentationSourceInventory(scopeDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('mismatched scope or class projection'),
      ]),
    );

    const figureDrift = structuredClone(inventory);
    figureDrift.documentationScriptFigures.pop();
    rebindInventoryDigest(figureDrift);
    expect(validateNestDocumentationSourceInventory(figureDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('do not equal the closed source allowlist'),
        expect.stringContaining('summary is not derived from its rows'),
      ]),
    );

    const exclusionDrift = structuredClone(inventory);
    exclusionDrift.excludedScriptCandidates[0].reason = 'unreviewed_reason';
    rebindInventoryDigest(exclusionDrift);
    expect(validateNestDocumentationSourceInventory(exclusionDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('script exclusion projection drifted'),
      ]),
    );

    const buildBoundaryDrift = structuredClone(inventory);
    buildBoundaryDrift.buildBoundary.networkIsolation = 'established';
    rebindInventoryDigest(buildBoundaryDrift);
    expect(validateNestDocumentationSourceInventory(buildBoundaryDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('build boundary drifted or overclaims authority'),
      ]),
    );

    const buildAuthorityDrift = structuredClone(inventory);
    buildAuthorityDrift.buildAuthorityFiles[0].role = 'unreviewed_role';
    rebindInventoryDigest(buildAuthorityDrift);
    expect(validateNestDocumentationSourceInventory(buildAuthorityDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('build-authority file projection drifted'),
      ]),
    );

    const userdocsDrift = structuredClone(inventory);
    userdocsDrift.userdocsBlocks.pop();
    rebindInventoryDigest(userdocsDrift);
    expect(validateNestDocumentationSourceInventory(userdocsDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('summary is not derived from its rows'),
        expect.stringContaining('row counts do not equal the closed pin'),
      ]),
    );

    const diagramDrift = structuredClone(inventory);
    diagramDrift.authoredDiagramDirectives[0].line += 1;
    rebindRowIdentity(
      diagramDrift.authoredDiagramDirectives[0],
      'directiveId',
      'cortexel.nest-documentation.rst-diagram.v1',
    );
    diagramDrift.authoredDiagramDirectives.sort(
      (left: JsonRecord, right: JsonRecord) =>
        String(left.directiveId).localeCompare(String(right.directiveId)),
    );
    rebindInventoryDigest(diagramDrift);
    expect(validateNestDocumentationSourceInventory(diagramDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('authored diagram rows do not equal'),
      ]),
    );

    const moduleDrift = structuredClone(inventory);
    moduleDrift.publicVisualizationModules[0].publicNames.push('invented');
    rebindRowIdentity(
      moduleDrift.publicVisualizationModules[0],
      'moduleId',
      'cortexel.nest-documentation.visual-module.v1',
    );
    rebindInventoryDigest(moduleDrift);
    expect(validateNestDocumentationSourceInventory(moduleDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('public visualization module'),
      ]),
    );

    const rstCountDrift = structuredClone(inventory);
    rstCountDrift.rstDirectiveCounts.figureOrImageAssetReferences += 1;
    rebindInventoryDigest(rstCountDrift);
    expect(validateNestDocumentationSourceInventory(rstCountDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('RST directive counts drifted'),
      ]),
    );

    const summaryDrift = structuredClone(inventory);
    summaryDrift.summary.notebookPngCount += 1;
    rebindInventoryDigest(summaryDrift);
    expect(validateNestDocumentationSourceInventory(summaryDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('summary is not derived from its rows'),
      ]),
    );

    const acquisitionDrift = structuredClone(inventory);
    acquisitionDrift.acquisition.inventoryReadAuthority = 'not_asserted';
    rebindInventoryDigest(acquisitionDrift);
    expect(validateNestDocumentationSourceInventory(acquisitionDrift)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('verified offline acquisition shape'),
      ]),
    );

    const historicalUnprofiled = structuredClone(inventory);
    delete historicalUnprofiled.acquisition.producerProfile;
    rebindInventoryDigest(historicalUnprofiled);
    expect(validateNestDocumentationSourceInventory(historicalUnprofiled)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('closed acquisition producer profile'),
      ]),
    );

    const unsupportedProfile = structuredClone(inventory);
    unsupportedProfile.acquisition.producerProfile.harnessRevision = 5;
    rebindInventoryDigest(unsupportedProfile);
    expect(validateNestDocumentationSourceInventory(unsupportedProfile)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('closed acquisition producer profile'),
      ]),
    );

    const notebookOutputCountDrift = structuredClone(inventory);
    notebookOutputCountDrift.notebookStoredOutputCounts.textPlainDataCount += 1;
    rebindInventoryDigest(notebookOutputCountDrift);
    expect(
      validateNestDocumentationSourceInventory(notebookOutputCountDrift),
    ).toEqual(expect.arrayContaining([
      expect.stringContaining('notebook stored-output counts drifted'),
      expect.stringContaining('summary is not derived from its rows'),
    ]));

    const userdocsDirectiveCountDrift = structuredClone(inventory);
    userdocsDirectiveCountDrift.userdocsDirectiveCounts
      .figureDirectivesExcludedFromRstSourceCount += 1;
    rebindInventoryDigest(userdocsDirectiveCountDrift);
    expect(
      validateNestDocumentationSourceInventory(userdocsDirectiveCountDrift),
    ).toEqual(expect.arrayContaining([
      expect.stringContaining('UserDocs directive counts drifted'),
      expect.stringContaining('summary is not derived from its rows'),
    ]));

    const evidenceTransfer = structuredClone(inventory);
    evidenceTransfer.evidenceAxes[2].state = 'complete';
    rebindInventoryDigest(evidenceTransfer);
    expect(validateNestDocumentationSourceInventory(evidenceTransfer)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('evidence axes drifted or transferred evidence'),
      ]),
    );
  }, 30_000);
});
