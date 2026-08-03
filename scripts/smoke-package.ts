// Verify the artifact consumers actually install, not just source imports.
// Runs in an isolated temp project: core first with only normal dependencies,
// then every React subpath after installing the documented optional peers.

import { createHash } from 'node:crypto';
import {
  accessSync,
  chmodSync,
  closeSync,
  constants as fsConstants,
  copyFileSync,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  opendirSync,
  readSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  basename,
  delimiter,
  dirname,
  isAbsolute,
  join,
  posix,
  relative,
  resolve,
  sep,
  win32 as windowsPath,
} from 'node:path';
import { pathToFileURL } from 'node:url';
import { TextDecoder } from 'node:util';
import { inflateRawSync } from 'node:zlib';
import ts from 'typescript';
import {
  CORTEXEL_SKILL_VERSION,
  PARAM_CONSTRAINT_LANGUAGE,
} from '../core/skills/registry';
import { NEST_SKILL_IDS } from '../core/skills/skillIds';
import { CORTEXEL_SPEC_VERSION } from '../core/vizSpec';
import { canonicalize } from '../src/core/canonicalize';
import { getBudgetLimits } from '../src/core/limits';
import { parseJsonStrict, type JsonValue } from '../src/core/parse-json';
import {
  SOURCE_ADAPTER_CATALOG,
  SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE,
  SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN,
  SOURCE_ADAPTER_DESCRIPTOR_DIGESTS,
  SOURCE_ADAPTER_DISCOVERY_CATALOG,
} from '../src/adapters/source-catalog';
import { SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER } from '../src/adapters/source-example';
import { nestSpikeRecorderToRaster as sourceNestSpikeRecorderToRaster } from '../src/adapters/nest';
import { validateRequestValue as validateSourceRequestValue } from '../src/core/request';
import {
  SKILL_AUTHORING as SOURCE_SKILL_AUTHORING,
  STABLE_SKILL_IDS as SOURCE_STABLE_SKILL_IDS,
  type StableSkillId,
} from '../src/generated';
import { serializeManifest } from './emit-manifest';
import {
  isCanonicalPackageRelativePath,
  PACKAGE_TAR_NAME_BYTES,
} from './lib/canonical-package-path';
import { packagedContractRelativeFiles } from './lib/contract-package';
import {
  assertReviewedPackageSourceMapInputClosure,
  assertReviewedSourceMapResourceBounds,
  inspectReviewedSourceMapMappings,
  inspectReviewedSourceMapMetadata,
  isReviewedMaplessPackageRuntime,
  REVIEWED_PACKAGE_SOURCE_MAP_LIMITS,
  resolveReviewedPackageSourceMapInput,
} from './lib/package-source-map-authority';
import {
  assertReviewedNodeRuntimeLive,
  createReviewedNodeRuntime,
  disposeReviewedNodeRuntime,
  type ReviewedNodeRuntime,
} from './lib/reviewed-node-runtime';
import {
  REVIEWED_POSIX_COMMAND_LIMITS,
  runReviewedPosixCommand,
} from './lib/reviewed-posix-command';
import { parseJsonSourceStrict } from './lib/strict-json-source';

const root = resolve(import.meta.dirname, '..');
const fixtureRoot = join(root, 'scripts', 'fixtures', 'package-smoke');
const fixtureManifestPath = join(fixtureRoot, 'package.json');
const fixtureLockPath = join(fixtureRoot, 'package-lock.json');
export const PACKAGE_SMOKE_PREPARED_SCHEMA = 'cortexel-package-smoke-prepared.v3' as const;
export const PACKAGE_SMOKE_PHASE_SCHEMA = 'cortexel-package-smoke-phase.v2' as const;
export const PACKAGE_SMOKE_STATE_FILENAME = 'package-smoke-state.v3.json';
const PREPARED_STATE_SCHEMA = PACKAGE_SMOKE_PREPARED_SCHEMA;
const PHASE_OUTPUT_SCHEMA = PACKAGE_SMOKE_PHASE_SCHEMA;
const STATE_FILENAME = PACKAGE_SMOKE_STATE_FILENAME;
const PACK_RESULT_FILENAME = 'pack-result.v1.json';
const NETWORK_GUARD_FILENAME = 'network-and-write-guard.cjs';
const LOCAL_TARBALL_FILENAME = 'cortexel-smoke.tgz';
const BROWSER_BUNDLE_ENTRY_FILENAME = 'browser-bundle-entry.ts';
const BROWSER_BUNDLE_BUILDER_FILENAME = 'browser-bundle-build.mjs';
const BROWSER_BUNDLE_OUTPUT_FILENAME = 'browser-bundle-output.mjs';
const BROWSER_BUNDLE_RECEIPT_FILENAME = 'browser-bundle-receipt.v1.json';
const BROWSER_BUNDLE_RECEIPT_SCHEMA = 'cortexel-package-smoke-browser-bundle.v1';
const CJS_URL_CACHE_PROBE_FILENAME = 'cjs-url-cache-probe.cjs';
const REVIEWED_ESBUILD_VERSION = '0.28.1';
const TYPESCRIPT_CHECK_PROFILE = 'nodenext-noemit.v1' as const;
const TYPESCRIPT_CHECK_COMPILER_BIN = 'consumer/node_modules/typescript/bin/tsc' as const;
const TYPESCRIPT_CHECK_CWD = 'consumer' as const;
const TYPESCRIPT_CHECK_ARGUMENTS = Object.freeze([
  '-p',
  'tsconfig.json',
  '--noEmit',
  '--pretty',
  'false',
] as const);
const BROWSER_BARE_CHUNK_IMPORT_PATTERN =
  String.raw`^import "(\.\./chunk-[A-Za-z0-9_-]+\.js)";$`;
const BROWSER_INSTALLED_CHUNK_PATH_PATTERN =
  String.raw`^node_modules/cortexel/dist/chunk-[A-Za-z0-9_-]+\.js$`;
const BROWSER_BARE_CHUNK_IMPORT_REGEXP = new RegExp(
  BROWSER_BARE_CHUNK_IMPORT_PATTERN,
  'u',
);
const BROWSER_INSTALLED_CHUNK_PATH_REGEXP = new RegExp(
  BROWSER_INSTALLED_CHUNK_PATH_PATTERN,
  'u',
);

/** Exact regex declarations embedded in the sealed browser-build helper. */
export function generatedBrowserBundlePatternDeclarations(): string {
  return [
    `const reviewedBareChunkImport = new RegExp(${JSON.stringify(
      BROWSER_BARE_CHUNK_IMPORT_PATTERN,
    )}, 'u');`,
    `const reviewedInstalledChunkPath = new RegExp(${JSON.stringify(
      BROWSER_INSTALLED_CHUNK_PATH_PATTERN,
    )}, 'u');`,
  ].join('\n');
}

/**
 * A fresh CJS consumer must reach the installed structural validator without a
 * generated bare `url` specifier consulting the caller-mutable module cache.
 * Preserve and restore the cache descriptor even when loading or validation
 * fails so the probe itself never widens authority for later consumer code.
 */
export function generatedCjsUrlCacheProbeSource(): string {
  return `
    function withPoisonedBareUrl(operation) {
      const priorDescriptor = Object.getOwnPropertyDescriptor(require.cache, 'url');
      let poisonedPropertyReads = 0;
      let operationError;
      let cleanupError;
      try {
        const poisonedExports = new Proxy(Object.create(null), {
          get(_target, property) {
            poisonedPropertyReads += 1;
            throw new Error('bare url builtin resolved through require.cache: ' + String(property));
          },
        });
        Object.defineProperty(require.cache, 'url', {
          configurable: true,
          enumerable: true,
          value: {
            id: 'url',
            filename: 'url',
            loaded: true,
            exports: poisonedExports,
          },
          writable: true,
        });
        operation();
      } catch (error) {
        operationError = error;
      } finally {
        try {
          if (priorDescriptor === undefined) {
            delete require.cache.url;
          } else {
            Object.defineProperty(require.cache, 'url', priorDescriptor);
          }
        } catch (error) {
          cleanupError = error;
        }
      }
      const restoredDescriptor = Object.getOwnPropertyDescriptor(require.cache, 'url');
      const cacheRestored = priorDescriptor === undefined
        ? restoredDescriptor === undefined
        : restoredDescriptor?.configurable === priorDescriptor.configurable &&
          restoredDescriptor?.enumerable === priorDescriptor.enumerable &&
          restoredDescriptor?.writable === priorDescriptor.writable &&
          restoredDescriptor?.value === priorDescriptor.value &&
          restoredDescriptor?.get === priorDescriptor.get &&
          restoredDescriptor?.set === priorDescriptor.set;
      if (!cacheRestored && cleanupError === undefined) {
        cleanupError = new Error('CJS url cache poison was not restored exactly');
      }
      if (cleanupError !== undefined) {
        if (operationError !== undefined) {
          throw new AggregateError(
            [operationError, cleanupError],
            'CJS url cache probe and cleanup failed',
          );
        }
        throw cleanupError;
      }
      return { operationError, poisonedPropertyReads };
    }

    const shadowabilityControl = withPoisonedBareUrl(() => {
      require('url').pathToFileURL;
    });
    if (shadowabilityControl.operationError === undefined ||
        shadowabilityControl.poisonedPropertyReads !== 1) {
      throw new Error('bare url cache-shadow negative control was not exercised');
    }

    const validatorProbe = withPoisonedBareUrl(() => {
      const figure = require('cortexel/figure');
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const accepted = figure.parseAndValidateRequest(
        JSON.stringify(contract.examples.valid[0]),
      );
      if (!accepted.ok || typeof accepted.request !== 'object') {
        throw new Error('CJS validator did not accept the shipped living example');
      }
    });
    if (validatorProbe.operationError !== undefined) {
      throw validatorProbe.operationError;
    }
    if (validatorProbe.poisonedPropertyReads !== 0) {
      throw new Error('CJS validator consulted the poisoned bare url module');
    }
  `;
}

const MAX_BROWSER_BUNDLE_BYTES = 4 * 1024 * 1024;
const MAX_BROWSER_BUNDLE_RECEIPT_BYTES = 1024 * 1024;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_TREE_ENTRIES = 200_000;
const MAX_TREE_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_WORKSPACE_FILE_BYTES = 128 * 1024 * 1024;
const WORKSPACE_HASH_CHUNK_BYTES = 1024 * 1024;
const RUNTIME_AUTHORITY_SCOPE = 'node-executable-and-npm-package-tree.v1' as const;
const NPM_TREE_SCHEMA = 'cortexel-package-smoke-npm-tree.v1' as const;
const RUNTIME_TREE_HASH_DOMAIN = 'cortexel-package-smoke-npm-tree-v1\0';
const RUNTIME_ANCESTRY_HASH_DOMAIN = 'cortexel-package-smoke-path-ancestry-v1\0';
const MAX_RUNTIME_EXECUTABLE_BYTES = 256 * 1024 * 1024;
const DEFAULT_COMMAND_TIMEOUT_MS = 5 * 60_000;
const NPM_CI_COMMAND_TIMEOUT_MS = REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs;
const MAX_COMMAND_OUTPUT_BYTES = 16 * 1024 * 1024;

interface PackageSmokeCommandPolicy {
  readonly operation: string;
  readonly timeoutMs: number;
}

export const PACKAGE_SMOKE_COMMAND_POLICIES = Object.freeze({
  executeNode: Object.freeze({
    operation: 'execute.node-command',
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  }),
  nodeVersion: Object.freeze({
    operation: 'runtime.node-version',
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  }),
  npmVersion: Object.freeze({
    operation: 'prepare.npm-version',
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  }),
  nodeRuntimeIdentity: Object.freeze({
    operation: 'runtime.node-identity',
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  }),
  npmPack: Object.freeze({
    operation: 'prepare.npm-pack',
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  }),
  npmCiCore: Object.freeze({
    operation: 'prepare.npm-ci.core',
    timeoutMs: NPM_CI_COMMAND_TIMEOUT_MS,
  }),
  npmCiCharts: Object.freeze({
    operation: 'prepare.npm-ci.charts',
    timeoutMs: NPM_CI_COMMAND_TIMEOUT_MS,
  }),
  npmCiFull: Object.freeze({
    operation: 'prepare.npm-ci.full',
    timeoutMs: NPM_CI_COMMAND_TIMEOUT_MS,
  }),
  browserBundle: Object.freeze({
    operation: 'prepare.browser-bundle',
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  }),
  typescriptCheck: Object.freeze({
    operation: 'prepare.typescript-nodenext',
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
  }),
} satisfies Readonly<Record<string, PackageSmokeCommandPolicy>>);

type PackageSmokeConsumerProfile = Readonly<{
  commandPolicy: PackageSmokeCommandPolicy;
  maximumMaterializationAttempts: 1 | 2;
  npmCacheRole: PackageSmokeConsumerNpmCacheRole;
  omittedDependencyClasses: readonly ('dev' | 'optional')[];
}>;

export type PackageSmokeNpmCacheRole = 'control' | 'core' | 'charts' | 'full';
export type PackageSmokeNpmCacheRoleState = 'unused' | 'active' | 'complete';
type PackageSmokeConsumerNpmCacheRole = Exclude<PackageSmokeNpmCacheRole, 'control'>;
const PACKAGE_SMOKE_NPM_CACHE_ROLES = Object.freeze([
  'control',
  'core',
  'charts',
  'full',
] as const satisfies readonly PackageSmokeNpmCacheRole[]);

export const PACKAGE_SMOKE_CONSUMER_PROFILES = Object.freeze({
  core: Object.freeze({
    commandPolicy: PACKAGE_SMOKE_COMMAND_POLICIES.npmCiCore,
    maximumMaterializationAttempts: 1,
    npmCacheRole: 'core',
    omittedDependencyClasses: Object.freeze(['dev', 'optional'] as const),
  }),
  charts: Object.freeze({
    commandPolicy: PACKAGE_SMOKE_COMMAND_POLICIES.npmCiCharts,
    maximumMaterializationAttempts: 1,
    npmCacheRole: 'charts',
    omittedDependencyClasses: Object.freeze(['optional'] as const),
  }),
  full: Object.freeze({
    commandPolicy: PACKAGE_SMOKE_COMMAND_POLICIES.npmCiFull,
    maximumMaterializationAttempts: 2,
    npmCacheRole: 'full',
    omittedDependencyClasses: Object.freeze([] as const),
  }),
} satisfies Readonly<Record<string, PackageSmokeConsumerProfile>>);

const CLOSED_PACKAGE_SMOKE_COMMAND_POLICIES = new Set<PackageSmokeCommandPolicy>(
  Object.values(PACKAGE_SMOKE_COMMAND_POLICIES),
);
// npm ci is always invoked with --ignore-scripts. This record acknowledges the
// exact locked package whose manifest contains a lifecycle script without ever
// authorizing that script to execute; esbuild's platform binary is supplied by
// its exact optional package closure instead.
const REVIEWED_IGNORED_INSTALL_SCRIPT_PACKAGES: ReadonlyMap<string, string> = new Map([
  ['node_modules/esbuild', REVIEWED_ESBUILD_VERSION],
] as const);
const LEGACY_REVIEWED_NODE_RESERVED_ENVIRONMENT_KEYS = Object.freeze([
  'CORTEXEL_PACKAGE_SMOKE_SUPERVISOR_PAYLOAD',
  'CORTEXEL_PACKAGE_SMOKE_GUARDIAN_PAYLOAD',
  'CORTEXEL_PACKAGE_SMOKE_WORKER_PAYLOAD',
  'CORTEXEL_PACKAGE_SMOKE_TRUSTED_COMMAND_TEST_HOOK',
] as const);
const SUPPORTED_NODE_MAJORS = new Set([22, 24, 26]);
const EXPECTED_REGULAR_READ_FLAGS = fsConstants.O_RDONLY |
  (process.platform === 'win32'
    ? 0
    : fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK);
const EXPECTED_DIRECTORY_READ_FLAGS = fsConstants.O_RDONLY |
  fsConstants.O_DIRECTORY |
  (process.platform === 'win32'
    ? 0
    : fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK);
export const PACKAGE_TARBALL_LIMITS = Object.freeze({
  compressedBytes: 128 * 1024 * 1024,
  uncompressedBytes: 512 * 1024 * 1024,
  fileBytes: 128 * 1024 * 1024,
  entries: 10_000,
  tarPathBytes: PACKAGE_TAR_NAME_BYTES,
  sourceNodes: 20_000,
  sourceDepth: 32,
  directoryEntries: 10_000,
});
export interface NpmAuthorityLimits {
  readonly entries: number;
  readonly totalBytes: number;
  readonly fileBytes: number;
  readonly depth: number;
  readonly directoryEntries: number;
  readonly pathBytes: number;
  readonly segmentBytes: number;
  readonly symlinkTargetBytes: number;
}

export const NPM_AUTHORITY_LIMITS: NpmAuthorityLimits = Object.freeze({
  entries: 50_000,
  totalBytes: 512 * 1024 * 1024,
  fileBytes: 128 * 1024 * 1024,
  depth: 64,
  directoryEntries: 10_000,
  pathBytes: 4_096,
  segmentBytes: 255,
  symlinkTargetBytes: 4_096,
});
const NPM_PORTABLE_MTIME_SECONDS = 499_162_500;
const NPM_GZIP_HEADER = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff]);

let commandEnvironment: NodeJS.ProcessEnv | undefined;
let commandNodeAuthority: NodeExecutableFileAuthority | undefined;
let commandRuntimeAuthority: PackageRuntimeAuthority | undefined;
let commandNpmCacheAuthorities: PackageSmokeNpmCacheAuthorities | undefined;
interface PackageSmokeNpmCacheWorkspaceBinding {
  readonly path: string;
  readonly device: string;
  readonly inode: string;
  readonly mode: number;
  readonly uid: number;
  readonly gid: number;
  readonly parentAncestry: RuntimePathAncestry;
}
interface PackageSmokeNpmCacheRoleBinding {
  readonly authority: PackageSmokeNpmCacheAuthority;
  readonly ancestry: RuntimePathAncestry;
  environment?: NodeJS.ProcessEnv;
  state: PackageSmokeNpmCacheRoleState;
}
interface PackageSmokeNpmCacheSession {
  readonly workspace: PackageSmokeNpmCacheWorkspaceBinding;
  readonly authorities: PackageSmokeNpmCacheAuthorities;
  readonly roles: Record<PackageSmokeNpmCacheRole, PackageSmokeNpmCacheRoleBinding>;
}
let packageSmokeNpmCacheSession: PackageSmokeNpmCacheSession | undefined;
interface PackageSmokeCommandRuntimeScope {
  readonly protectedParent: string;
  runtime?: ReviewedNodeRuntime;
}
let activeCommandRuntimeScope: PackageSmokeCommandRuntimeScope | undefined;

export interface ReviewedNodeCommandResult {
  readonly guardianSweepIntentCount: number;
  readonly status: number;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly outputOverflow: boolean;
}

export interface ReviewedNodeCommandTestHook {
  readonly phase:
    | 'worker-ready-before-handshake'
    | 'handshake-published-before-go'
    | 'go-sent'
    | 'guardian-swept-before-result';
  readonly readyPath: string;
}

export interface PackageSmokeRegularFileOpenTestEvent {
  readonly phase: 'regular-file-reviewed-before-open';
  readonly path: string;
  readonly label: string;
}

export interface PackageSmokeRegularFileReadTestEvent {
  readonly phase: 'regular-file-reviewed-after-fstat-before-read';
  readonly path: string;
  readonly label: string;
  readonly reviewedSize: number;
  readonly maximumBytes: number;
}

export type PackageSmokeRegularFileTestEvent =
  | PackageSmokeRegularFileOpenTestEvent
  | PackageSmokeRegularFileReadTestEvent;

export type PackageSmokeRegularFileTestHook = (
  event: PackageSmokeRegularFileTestEvent,
) => void;

function openExpectedRegularFileAfterReview(
  path: string,
  label: string,
  trustedTestHook?: PackageSmokeRegularFileTestHook,
): number {
  trustedTestHook?.(Object.freeze({
    phase: 'regular-file-reviewed-before-open',
    path,
    label,
  }));
  return openSync(path, EXPECTED_REGULAR_READ_FLAGS);
}

/*
 * The synchronous child_process timeout is an outer operational kill, not an
 * owner-death join for signal-resistant descendants. The shared reviewed-POSIX
 * boundary therefore starts an exact launcher, supervisor, gated guardian, and
 * non-leader worker. The
 * guardian is the live group leader and the only production process allowed to
 * address the group: it writes one bounded sweep intent and then calls one
 * self-addressed negative-PID SIGKILL while its own live identity pins the PGID.
 * The supervisor owns the guardian's exclusive control-pipe writer; EOF therefore
 * triggers the same anchored self-sweep if the supervisor dies at any point. The
 * worker remains the reviewed target's immediate parent, so killing that parent
 * cannot kill the group anchor.
 *
 * While the exact launcher remains live, it actively drains a dedicated zero-data
 * pipe retained only by the guardian and withholds buffered protocol until real
 * peer EOF plus supervisor close. The caller receives only an
 * unforgeable-for-cleanup boolean armed handshake, never a PID/PGID, and performs
 * no numeric fallback. Launcher SIGKILL/OOM loss or the outer hard kill can still
 * let Bun return before asynchronous group cleanup. Those cases, deliberate
 * regrouping/detachment, guardian killing, and hostile signal-authority changes
 * require an external cgroup/sandbox/Job Object; uncertainty never triggers a
 * signal to a reusable numeric identity.
 */

function activeCommandEnvironment(): NodeJS.ProcessEnv {
  if (commandEnvironment === undefined) fail('package-smoke command environment is not initialized');
  return commandEnvironment;
}

function runtimeStatIdentity(stats: BigIntStats): readonly bigint[] {
  return [
    stats.dev,
    stats.ino,
    stats.mode,
    stats.size,
    stats.nlink,
    stats.uid,
    stats.gid,
    stats.mtimeNs,
    stats.ctimeNs,
    stats.birthtimeNs,
  ];
}

function sameRuntimeStat(left: BigIntStats, right: BigIntStats): boolean {
  const leftIdentity = runtimeStatIdentity(left);
  const rightIdentity = runtimeStatIdentity(right);
  return leftIdentity.every((value, index) => value === rightIdentity[index]);
}

function boundedBigIntNumber(value: bigint, maximum: number, label: string): number {
  if (value < 0n || value > BigInt(maximum)) fail(`${label} is outside its byte budget`);
  return Number(value);
}

function portableUnsignedBigInt(value: bigint, label: string, minimum = 0n): number {
  if (value < minimum || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail(`${label} is outside the portable integer domain`);
  }
  return Number(value);
}

function portableRuntimeFileAuthority(
  path: string,
  stats: BigIntStats,
  digest: string,
  size: number,
): RuntimeFileAuthority {
  const mode = Number(stats.mode & 0o7777n);
  const uid = portableUnsignedBigInt(stats.uid, `runtime authority uid: ${path}`);
  const gid = portableUnsignedBigInt(stats.gid, `runtime authority gid: ${path}`);
  return {
    path,
    sha256: digest,
    size,
    mode,
    uid,
    gid,
    linkCount: 1,
    device: stats.dev.toString(10),
    inode: stats.ino.toString(10),
    mtimeNs: stats.mtimeNs.toString(10),
    ctimeNs: stats.ctimeNs.toString(10),
    birthtimeNs: stats.birthtimeNs.toString(10),
  };
}

function inspectRuntimeRegularFile(
  path: string,
  maximumBytes: number,
  label: string,
  executable = false,
  trustedTestHook?: PackageSmokeRegularFileTestHook,
): RuntimeFileAuthority {
  if (!isAbsolute(path) || Buffer.byteLength(path, 'utf8') > NPM_AUTHORITY_LIMITS.pathBytes ||
      realpathSync(path) !== path) {
    fail(`${label} must be one bounded canonical physical absolute path`);
  }
  const initial = lstatSync(path, { bigint: true });
  if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1n) {
    fail(`${label} must be a unique real regular file`);
  }
  const mode = initial.mode & 0o7777n;
  if ((mode & 0o7022n) !== 0n) {
    fail(`${label} must not carry special or group/world-write mode authority`);
  }
  if (executable && (mode & 0o111n) === 0n) fail(`${label} is not executable`);
  if (executable) accessSync(path, fsConstants.X_OK);
  const size = boundedBigIntNumber(initial.size, maximumBytes, label);
  const descriptor = openExpectedRegularFileAfterReview(path, label, trustedTestHook);
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameRuntimeStat(opened, initial)) {
      fail(`${label} changed before it could be hashed`);
    }
    const digest = createHash('sha256');
    const chunk = Buffer.allocUnsafe(WORKSPACE_HASH_CHUNK_BYTES);
    let offset = 0;
    while (offset < size) {
      const length = Math.min(chunk.byteLength, size - offset);
      const count = readSync(descriptor, chunk, 0, length, offset);
      if (count <= 0) fail(`${label} ended before its declared size`);
      digest.update(chunk.subarray(0, count));
      offset += count;
    }
    const finalDescriptor = fstatSync(descriptor, { bigint: true });
    const rebound = lstatSync(path, { bigint: true });
    if (!sameRuntimeStat(opened, finalDescriptor) || !sameRuntimeStat(opened, rebound)) {
      fail(`${label} changed while it was being hashed`);
    }
    return portableRuntimeFileAuthority(
      path,
      opened,
      `sha256:${digest.digest('hex')}`,
      size,
    );
  } finally {
    closeSync(descriptor);
  }
}

function inspectRuntimePathAncestry(path: string, label: string): RuntimePathAncestry {
  const components: string[] = [];
  let cursor = dirname(path);
  while (true) {
    components.push(cursor);
    if (components.length > NPM_AUTHORITY_LIMITS.depth) {
      fail(`${label} ancestry exceeds its depth budget`);
    }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  components.reverse();
  const inspect = (): Array<Record<string, JsonValue>> => components.map((component) => {
    if (realpathSync(component) !== component) {
      fail(`${label} ancestry contains a symbolic or noncanonical directory`);
    }
    const stats = lstatSync(component, { bigint: true });
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      fail(`${label} ancestry contains a non-directory component`);
    }
    const uid = portableUnsignedBigInt(stats.uid, `${label} ancestry uid`);
    const gid = portableUnsignedBigInt(stats.gid, `${label} ancestry gid`);
    return {
      path: component,
      device: stats.dev.toString(10),
      inode: stats.ino.toString(10),
      mode: Number(stats.mode & 0o7777n),
      uid,
      gid,
    };
  });
  const records = inspect();
  if (!exactJsonEqual(records, inspect())) fail(`${label} ancestry changed while it was sealed`);
  return {
    sha256: sha256(`${RUNTIME_ANCESTRY_HASH_DOMAIN}${canonicalize(records)}`),
    entryCount: records.length,
  };
}

export function inspectNodeExecutableAuthority(
  executable: string,
  trustedTestHook?: PackageSmokeRegularFileTestHook,
): NodeExecutableFileAuthority {
  return {
    executable,
    file: inspectRuntimeRegularFile(
      executable,
      MAX_RUNTIME_EXECUTABLE_BYTES,
      'reviewed Node executable authority',
      true,
      trustedTestHook,
    ),
    ancestry: inspectRuntimePathAncestry(executable, 'reviewed Node executable'),
  };
}

function assertNodeExecutableAuthority(
  expected: NodeExecutableFileAuthority,
  label: string,
): void {
  const observed = inspectNodeExecutableAuthority(expected.executable);
  if (!exactJsonEqual(observed, expected)) fail(`${label} Node executable authority changed`);
}

function openPackageSmokeCommandRuntimeScope(protectedParent = tmpdir()): void {
  if (activeCommandRuntimeScope !== undefined) {
    fail('package-smoke reviewed Node runtime scope is already active');
  }
  if (typeof protectedParent !== 'string') {
    fail('package-smoke reviewed Node runtime parent must be one string');
  }
  activeCommandRuntimeScope = { protectedParent };
}

function closePackageSmokeCommandRuntimeScope(): void {
  const scope = activeCommandRuntimeScope;
  if (scope === undefined) {
    fail('package-smoke reviewed Node runtime scope is not active');
  }
  if (scope.runtime !== undefined) {
    disposeReviewedNodeRuntime(scope.runtime);
  }
  activeCommandRuntimeScope = undefined;
}

function isPotentiallyAsynchronousResult(value: unknown): boolean {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) return false;
  const visited = new Set<object>();
  let cursor: object | null = value;
  for (let depth = 0; cursor !== null && depth < 128; depth++) {
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(cursor, 'then');
      cursor = Object.getPrototypeOf(cursor);
    } catch {
      return true;
    }
    if (descriptor === undefined) continue;
    if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) return true;
    return typeof descriptor.value === 'function';
  }
  return cursor !== null;
}

/**
 * Runs one strictly synchronous operation inside an exclusive staged-Node scope.
 * The callback must not start asynchronous work; Promise/thenable results fail
 * closed and the staged runtime is disposed before the rejection is returned.
 */
export function withPackageSmokeCommandRuntime<T>(
  operation: () => T,
  protectedParent = tmpdir(),
): T {
  if (typeof operation !== 'function') {
    fail('package-smoke reviewed Node runtime operation must be callable');
  }
  openPackageSmokeCommandRuntimeScope(protectedParent);
  let completed = false;
  let result: T | undefined;
  let operationError: unknown;
  try {
    const operationResult = operation();
    if (isPotentiallyAsynchronousResult(operationResult)) {
      fail('package-smoke reviewed Node runtime operation must be synchronous');
    }
    result = operationResult;
    completed = true;
  } catch (error) {
    operationError = error;
  }

  let cleanupFailed = false;
  let cleanupError: unknown;
  try {
    closePackageSmokeCommandRuntimeScope();
  } catch (error) {
    cleanupFailed = true;
    cleanupError = error;
  }
  if (!completed) {
    if (cleanupFailed) {
      throw new AggregateError(
        [operationError, cleanupError],
        'package-smoke operation failed and staged Node runtime disposal was uncertain',
        { cause: operationError },
      );
    }
    throw operationError;
  }
  if (cleanupFailed) throw cleanupError;
  return result as T;
}

function assertPackageSmokeCommandRuntimeBinding(
  runtime: ReviewedNodeRuntime,
  expectedSource: NodeExecutableFileAuthority,
  label: string,
): void {
  assertReviewedNodeRuntimeLive(runtime);
  const acquired = runtime.node.executable;
  const stagedAuthority = runtime.node.authority;
  if (
    runtime.sourceNodeExecutable !== expectedSource.executable ||
    acquired.sourcePath !== expectedSource.executable ||
    acquired.sourceSha256 !== expectedSource.file.sha256 ||
    acquired.stagedSha256 !== expectedSource.file.sha256 ||
    acquired.size !== expectedSource.file.size ||
    stagedAuthority.executable !== acquired.stagedPath ||
    stagedAuthority.file.path !== acquired.stagedPath ||
    stagedAuthority.file.sha256 !== expectedSource.file.sha256 ||
    stagedAuthority.file.size !== expectedSource.file.size
  ) {
    fail(`${label} staged Node runtime differs from its source authority`);
  }
  if (
    commandRuntimeAuthority !== undefined &&
    commandRuntimeAuthority.node.executable === expectedSource.executable &&
    runtime.nodeVersion !== commandRuntimeAuthority.node.version.replace(/^v/u, '')
  ) {
    fail(`${label} staged Node version differs from package runtime authority`);
  }
}

function activePackageSmokeCommandRuntime(
  expectedSource: NodeExecutableFileAuthority,
): ReviewedNodeRuntime {
  const scope = activeCommandRuntimeScope;
  if (scope === undefined) {
    fail('reviewed Node command requires one active operation-scoped staged runtime');
  }
  if (scope.runtime === undefined) {
    scope.runtime = createReviewedNodeRuntime(scope.protectedParent, {
      sourceNodeCandidates: [expectedSource.executable],
    });
  }
  assertPackageSmokeCommandRuntimeBinding(scope.runtime, expectedSource, 'pre-command');
  return scope.runtime;
}

export function runReviewedNodeCommand(
  reviewedNodeExecutable: string,
  args: readonly string[],
  cwd: string,
  options: {
    readonly environment?: NodeJS.ProcessEnv;
    readonly timeoutMs?: number;
    readonly outputLimitBytes?: number;
    readonly nodeAuthority?: NodeExecutableFileAuthority;
    /** Explicit already-acquired runtime for focused tests outside an operation scope. */
    readonly reviewedRuntime?: ReviewedNodeRuntime;
    /** Host-controlled regression rendezvous; never copied into guardian, worker, or target input. */
    readonly trustedTestHook?: ReviewedNodeCommandTestHook;
  } = {},
): ReviewedNodeCommandResult {
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    fail('reviewed Node command supervision is implemented only for reviewed macOS/Linux semantics');
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
  const outputLimitBytes = options.outputLimitBytes ?? MAX_COMMAND_OUTPUT_BYTES;
  if (
    !isAbsolute(reviewedNodeExecutable) ||
    realpathSync(reviewedNodeExecutable) !== reviewedNodeExecutable
  ) {
    fail('reviewed Node command executable must be a canonical absolute path');
  }
  const expectedNodeAuthority = options.nodeAuthority ??
    commandNodeAuthority ?? inspectNodeExecutableAuthority(reviewedNodeExecutable);
  if (expectedNodeAuthority.executable !== reviewedNodeExecutable) {
    fail('reviewed Node command executable differs from its byte authority');
  }
  assertNodeExecutableAuthority(expectedNodeAuthority, 'pre-command');
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs
  ) {
    fail('reviewed Node command timeout is outside its bound');
  }
  if (
    !Number.isSafeInteger(outputLimitBytes) ||
    outputLimitBytes < 1 ||
    outputLimitBytes > MAX_COMMAND_OUTPUT_BYTES
  ) {
    fail('reviewed Node command output budget is outside its bound');
  }
  const targetEnvironment = Object.fromEntries(
    Object.entries(options.environment ?? activeCommandEnvironment())
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  for (const reserved of LEGACY_REVIEWED_NODE_RESERVED_ENVIRONMENT_KEYS) {
    if (Object.hasOwn(targetEnvironment, reserved)) {
      fail(`reviewed Node command environment contains reserved entry ${reserved}`);
    }
  }

  // The original package-smoke authority remains source/provenance evidence.
  // Execution uses only its descriptor-acquired private copy; the two authority
  // records have deliberately different ancestry-digest domains and are never
  // relabelled as each other.
  let commandResult: ReturnType<typeof runReviewedPosixCommand> | undefined;
  let reviewedRuntime: ReviewedNodeRuntime | undefined;
  const failures: unknown[] = [];
  try {
    reviewedRuntime = options.reviewedRuntime ??
      activePackageSmokeCommandRuntime(expectedNodeAuthority);
    assertPackageSmokeCommandRuntimeBinding(
      reviewedRuntime,
      expectedNodeAuthority,
      'pre-command',
    );
    const stagedNode = reviewedRuntime.node.authority.executable;
    commandResult = runReviewedPosixCommand(
      stagedNode,
      stagedNode,
      args,
      cwd,
      {
        controlRuntimeAuthority: reviewedRuntime.node.authority,
        environment: targetEnvironment,
        outputLimitBytes,
        targetAuthority: reviewedRuntime.node.authority,
        timeoutMs,
        trustedTestHook: options.trustedTestHook,
      },
    );
  } catch (error) {
    failures.push(error);
  }
  try {
    assertNodeExecutableAuthority(expectedNodeAuthority, 'post-command');
    if (reviewedRuntime !== undefined) {
      assertPackageSmokeCommandRuntimeBinding(
        reviewedRuntime,
        expectedNodeAuthority,
        'post-command',
      );
    }
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      'reviewed Node command failed with a post-command authority revalidation failure',
    );
  }
  if (commandResult === undefined) {
    fail('reviewed Node command returned no result');
  }

  return {
    guardianSweepIntentCount: commandResult.guardianSweepIntentCount,
    status: commandResult.status ?? -1,
    signal: commandResult.signal,
    stdout: decodeUtf8Fatal(commandResult.stdout, 'reviewed Node command stdout'),
    stderr: decodeUtf8Fatal(commandResult.stderr, 'reviewed Node command stderr'),
    timedOut: commandResult.timedOut,
    outputOverflow: commandResult.outputOverflow,
  };
}

function assertClosedPackageSmokeCommandPolicy(
  policy: PackageSmokeCommandPolicy,
): void {
  if (!CLOSED_PACKAGE_SMOKE_COMMAND_POLICIES.has(policy)) {
    fail('reviewed Node operation policy is not one closed host-authored profile');
  }
}

export function formatReviewedNodeOperationBoundFailure(
  policy: PackageSmokeCommandPolicy,
  kind: 'timeout' | 'output-overflow',
): string {
  assertClosedPackageSmokeCommandPolicy(policy);
  return kind === 'timeout'
    ? `reviewed Node operation ${JSON.stringify(policy.operation)} exceeded its ` +
      `${policy.timeoutMs} ms hard timeout`
    : `reviewed Node operation ${JSON.stringify(policy.operation)} exceeded its ` +
      `${MAX_COMMAND_OUTPUT_BYTES}-byte output budget`;
}

function runResult(
  command: string,
  args: string[],
  cwd: string,
  policy: PackageSmokeCommandPolicy,
): ReviewedNodeCommandResult {
  assertClosedPackageSmokeCommandPolicy(policy);
  const result = runReviewedNodeCommand(command, args, cwd, {
    timeoutMs: policy.timeoutMs,
  });
  if (result.timedOut) fail(formatReviewedNodeOperationBoundFailure(policy, 'timeout'));
  if (result.outputOverflow) {
    fail(formatReviewedNodeOperationBoundFailure(policy, 'output-overflow'));
  }
  return result;
}

const REVIEWED_COMMAND_DIAGNOSTIC_LIMITS = Object.freeze({
  commandEncodedBytes: 1_024,
  channelEncodedBytes: 3_072,
});

function jsonDiagnosticString(
  value: string,
  encodedByteLimit: number,
): { readonly encoded: string; readonly truncated: boolean } {
  let body = '';
  let encodedBytes = 2; // Opening and closing JSON quotes.
  let consumedUtf16Units = 0;

  for (const character of value) {
    let fragment: string;
    if (
      /\p{Cc}|\p{Cf}/u.test(character) ||
      character === '\u2028' ||
      character === '\u2029'
    ) {
      fragment = '';
      for (let index = 0; index < character.length; index += 1) {
        fragment += `\\u${character.charCodeAt(index).toString(16).padStart(4, '0')}`;
      }
    } else {
      // JSON.stringify escapes quotes, backslashes, and the remaining JSON controls.
      fragment = JSON.stringify(character).slice(1, -1);
    }

    const fragmentBytes = Buffer.byteLength(fragment);
    if (encodedBytes + fragmentBytes > encodedByteLimit) {
      return { encoded: `"${body}"`, truncated: true };
    }
    body += fragment;
    encodedBytes += fragmentBytes;
    consumedUtf16Units += character.length;
  }

  return {
    encoded: `"${body}"`,
    truncated: consumedUtf16Units !== value.length,
  };
}

export function formatReviewedNodeCommandFailure(
  command: string,
  result: Pick<ReviewedNodeCommandResult, 'status' | 'signal' | 'stdout' | 'stderr'>,
): string {
  const encodedCommand = jsonDiagnosticString(
    command,
    REVIEWED_COMMAND_DIAGNOSTIC_LIMITS.commandEncodedBytes,
  );
  const encodedStdout = jsonDiagnosticString(
    result.stdout,
    REVIEWED_COMMAND_DIAGNOSTIC_LIMITS.channelEncodedBytes,
  );
  const encodedStderr = jsonDiagnosticString(
    result.stderr,
    REVIEWED_COMMAND_DIAGNOSTIC_LIMITS.channelEncodedBytes,
  );
  return (
    'reviewed Node command failed: {' +
    `"command":${encodedCommand.encoded},` +
    `"commandTruncated":${String(encodedCommand.truncated)},` +
    `"status":${String(result.status)},` +
    `"signal":${result.signal === null ? 'null' : JSON.stringify(result.signal)},` +
    `"stdout":${encodedStdout.encoded},` +
    `"stdoutTruncated":${String(encodedStdout.truncated)},` +
    `"stderr":${encodedStderr.encoded},` +
    `"stderrTruncated":${String(encodedStderr.truncated)}` +
    '}'
  );
}

function run(
  command: string,
  args: string[],
  cwd: string,
  policy: PackageSmokeCommandPolicy,
): string {
  const result = runResult(command, args, cwd, policy);
  if (result.status !== 0 || result.signal !== null) {
    // Many CLIs (including TypeScript) report diagnostics on stdout. Preserve both
    // channels without argv/environment, and encode them for one bounded terminal-safe
    // diagnostic rather than allowing child output to forge report structure.
    fail(formatReviewedNodeCommandFailure(command, result));
  }
  return result.stdout.trim();
}

// Fixture receipts bind SHA-256(JCS(strictly parsed JSON)); pretty-print bytes
// are intentionally outside this semantic digest domain.
const EXPECTED_FIXTURE_MANIFEST_SHA256 =
  'd91462201f6907ce0bea98638c65d2ad84b672d0eed06b96e05b0f25cd79780e';
const EXPECTED_FIXTURE_LOCK_SHA256 =
  '01d9c1f54a98559275983c539ee0372b3746a839a5b98edb9f736a68d55b7d16';
const EXPECTED_DEV_DEPENDENCIES = Object.freeze({
  '@types/node': '26.1.2',
  '@types/react': '19.2.18',
  '@types/react-dom': '19.2.4',
  esbuild: '0.28.1',
  react: '19.2.8',
  'react-dom': '19.2.8',
  typescript: '7.0.2',
});
const EXPECTED_OPTIONAL_DEPENDENCIES = Object.freeze({
  '@react-three/fiber': '9.7.0',
  '@types/three': '0.185.3',
  'd3-force-3d': '3.0.6',
  three: '0.185.1',
});
const EXPECTED_PACKAGE_FILE_ENTRIES = Object.freeze([
  'dist',
  'assets',
  'docs',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'GOVERNANCE.md',
  'MIGRATION.md',
  'ROADMAP.md',
  'SECURITY.md',
  'SUPPORT.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'LICENSES',
  'CHANGELOG.md',
]);
const JSON_LIMITS = Object.freeze({
  ...getBudgetLimits('standard'),
  rawInputBytes: MAX_JSON_BYTES,
  jsonDepth: 64,
  jsonTotalNodes: 200_000,
  jsonStringLength: 2 * 1024 * 1024,
  jsonNumberTokenLength: 128,
  jsonObjectKeys: 100_000,
  jsonArrayItems: 100_000,
});
const NPM_CI_FLAGS = [
  'ci',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
  '--legacy-peer-deps',
  '--install-strategy=nested',
  '--registry=https://registry.npmjs.org/',
] as const;
const NPM_USER_CONFIG_SOURCE = '# isolated package-smoke npm user config\n';
const NPM_GLOBAL_CONFIG_SOURCE = '# isolated package-smoke npm global config\n';

type SmokePhase = 'prepare' | 'execute';

interface SmokeInvocation {
  readonly command: 'all' | SmokePhase;
  readonly workspace?: string;
  readonly nodeExecutable?: string;
  readonly npmExecutable?: string;
  readonly expectedStateDigest?: string;
}

export interface PackedFile {
  readonly path: string;
  readonly size: number;
  readonly mode: number;
}

export interface PackedResult {
  readonly name: string;
  readonly version: string;
  readonly size: number;
  readonly unpackedSize: number;
  readonly shasum: string;
  readonly integrity: string;
  readonly filename: string;
  readonly files: readonly PackedFile[];
  readonly entryCount: number;
}

export interface ExpectedPackageFile extends PackedFile {
  readonly digest: string;
}

export interface PackageTarballInspection {
  readonly compressedBytes: number;
  readonly uncompressedBytes: number;
  readonly fileBytes: number;
  readonly entryCount: number;
  readonly treeDigest: string;
}

interface WorkspaceSeal {
  readonly digest: string;
  readonly entryCount: number;
  readonly fileCount: number;
  readonly byteCount: number;
  readonly root: WorkspaceRootAuthority;
  readonly parentAncestry: RuntimePathAncestry;
}

interface WorkspaceRootAuthority {
  readonly path: string;
  readonly device: string;
  readonly inode: string;
  readonly mode: number;
  readonly uid: number;
  readonly gid: number;
  readonly linkCount: number;
}

export interface RuntimeFileAuthority {
  readonly path: string;
  readonly sha256: string;
  readonly size: number;
  readonly mode: number;
  readonly uid: number;
  readonly gid: number;
  readonly linkCount: 1;
  readonly device: string;
  readonly inode: string;
  readonly mtimeNs: string;
  readonly ctimeNs: string;
  readonly birthtimeNs: string;
}

export interface RuntimePathAncestry {
  readonly sha256: string;
  readonly entryCount: number;
}

export interface NodeExecutableFileAuthority {
  readonly executable: string;
  readonly file: RuntimeFileAuthority;
  readonly ancestry: RuntimePathAncestry;
}

export interface NodeExecutableAuthority extends NodeExecutableFileAuthority {
  readonly version: string;
  readonly runtime: NodeRuntimeIdentity;
}

export interface NodeRuntimeIdentity {
  readonly platform: NodeJS.Platform;
  readonly arch: string;
}

export interface NpmPackageTreeAuthority {
  readonly schema: typeof NPM_TREE_SCHEMA;
  readonly sha256: string;
  readonly entryCount: number;
  readonly directoryCount: number;
  readonly fileCount: number;
  readonly symlinkCount: number;
  readonly byteCount: number;
}

export interface NpmPackageAuthority {
  readonly root: string;
  readonly cli: string;
  readonly version: string;
  readonly packageJsonSha256: string;
  readonly cliFile: RuntimeFileAuthority;
  readonly ancestry: RuntimePathAncestry;
  readonly tree: NpmPackageTreeAuthority;
}

export interface PackageRuntimeAuthority {
  readonly scope: typeof RUNTIME_AUTHORITY_SCOPE;
  readonly node: NodeExecutableAuthority;
  readonly npm: NpmPackageAuthority;
}

interface TypeScriptConsumerCheck {
  readonly profile: typeof TYPESCRIPT_CHECK_PROFILE;
  readonly compiler: {
    readonly name: 'typescript';
    readonly version: '7.0.2';
    readonly bin: typeof TYPESCRIPT_CHECK_COMPILER_BIN;
  };
  readonly argv: typeof TYPESCRIPT_CHECK_ARGUMENTS;
  readonly cwd: typeof TYPESCRIPT_CHECK_CWD;
  readonly workspaceSealDigest: string;
  readonly result: {
    readonly status: 0;
    readonly signal: null;
    readonly stdoutBytes: 0;
    readonly stderrBytes: 0;
  };
}

interface PreparedState {
  readonly schema: typeof PREPARED_STATE_SCHEMA;
  readonly workspace: string;
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly packageVersion: string;
  readonly artifactIntegrity: string;
  readonly artifactSha256: string;
  readonly fixtureManifestSha256: string;
  readonly fixtureLockSha256: string;
  readonly packResultSha256: string;
  readonly runtimeAuthority: PackageRuntimeAuthority;
  readonly coreConsumer: string;
  readonly chartsConsumer: string;
  readonly consumer: string;
  readonly unrelatedDirectory: string;
  readonly nodeModules: readonly [string, string, string];
  readonly typescriptCheck: TypeScriptConsumerCheck;
  readonly workspaceSeal: WorkspaceSeal;
  readonly readOnlyWorkspace: boolean;
}

export interface PackageSmokePhaseSuccessOutput {
  readonly schema: typeof PHASE_OUTPUT_SCHEMA;
  readonly phase: SmokePhase;
  readonly status: 'prepared' | 'passed';
  readonly workspace: string;
  readonly stateFile: string;
  readonly stateDigest: string;
  readonly packageVersion: string;
  readonly artifactIntegrity: string;
  readonly runtimeAuthority: PackageRuntimeAuthority;
  readonly nodeModules: readonly [string, string, string];
  readonly workspaceSeal: string;
}

export interface PackageSmokePhaseFailureOutput {
  readonly schema: typeof PHASE_OUTPUT_SCHEMA;
  readonly phase: SmokePhase;
  readonly status: 'failed';
  readonly code: 'PACKAGE_SMOKE_FAILED';
  readonly message: string;
}

/**
 * Canonical CLI transport/status union. This is intentionally not named or
 * represented as a durable execution receipt: it does not bind the harness source
 * closure or retain each internal reviewed-command lifecycle/result record.
 */
export type PackageSmokePhaseOutput =
  | PackageSmokePhaseSuccessOutput
  | PackageSmokePhaseFailureOutput;

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, JsonValue>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (canonicalize(actual) !== canonicalize(wanted)) {
    fail(`${label} has unexpected keys: ${actual.join(', ')}`);
  }
}

function strictJson(text: string, label: string, maximumBytes = MAX_JSON_BYTES): JsonValue {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    fail(`${label} has an invalid JSON byte budget`);
  }
  const limits = maximumBytes === MAX_JSON_BYTES
    ? JSON_LIMITS
    : {
        ...JSON_LIMITS,
        rawInputBytes: maximumBytes,
        jsonStringLength: maximumBytes,
      };
  const parsed = parseJsonStrict(text, { limits });
  if (!parsed.ok) {
    fail(`${label} is not strict JSON: ${parsed.errors[0]?.message ?? 'unknown parse error'}`);
  }
  return parsed.value;
}

/**
 * Prove the source-map contract against the installed tarball bytes, not the
 * source checkout. Runtime maps must be terminally referenced and carry every
 * mapped source inline; declaration output deliberately carries no map metadata.
 */
export function assertInstalledSourceMapClosure(
  installedRoot: string,
  packedPaths: readonly string[],
  options: { readonly requireExactSourceInventory?: boolean } = {},
): void {
  const packedPathSet = new Set(packedPaths);
  const referencedMaps = new Set<string>();
  const reviewedInputContents = new Map<string, string>();

  for (const declarationPath of packedPaths.filter(
    (entry) => entry.endsWith('.d.ts') || entry.endsWith('.d.cts'),
  )) {
    const declaration = readUtf8RegularFileStable(
      join(installedRoot, ...declarationPath.split('/')),
      `packed declaration ${declarationPath}`,
      PACKAGE_TARBALL_LIMITS.fileBytes,
    );
    try {
      inspectReviewedSourceMapMetadata(declaration, declarationPath, 'declaration');
    } catch (error) {
      fail(`packed ${(error as Error).message}`);
    }
  }

  for (const ownerPath of packedPaths.filter(
    (entry) => entry.startsWith('dist/') && /\.(?:js|cjs)$/u.test(entry),
  )) {
    const owner = readUtf8RegularFileStable(
      join(installedRoot, ...ownerPath.split('/')),
      `packed runtime ${ownerPath}`,
      REVIEWED_PACKAGE_SOURCE_MAP_LIMITS.generatedCodeBytes,
    );
    let reference: string | undefined;
    try {
      reference = inspectReviewedSourceMapMetadata(owner, ownerPath, 'runtime');
    } catch (error) {
      fail(`packed ${(error as Error).message}`);
    }
    const expectedMapless = isReviewedMaplessPackageRuntime(ownerPath, owner);
    if (reference === undefined) {
      if (!expectedMapless) fail(`packed runtime is unexpectedly mapless: ${ownerPath}`);
      continue;
    }
    if (expectedMapless) {
      fail(`packed reviewed mapless runtime acquired source-map metadata: ${ownerPath}`);
    }
    const mapPath = posix.join(posix.dirname(ownerPath), reference);
    if (
      posix.basename(mapPath) !== reference ||
      !packedPathSet.has(mapPath) ||
      referencedMaps.has(mapPath)
    ) {
      fail(`packed runtime source-map reference is absent or ambiguous: ${ownerPath}`);
    }
    referencedMaps.add(mapPath);

    const mapLabel = `packed runtime source map ${mapPath}`;
    let mapValue: JsonValue;
    try {
      mapValue = parseJsonSourceStrict<JsonValue>(
        readUtf8RegularFileStable(
        join(installedRoot, ...mapPath.split('/')),
        mapLabel,
        REVIEWED_PACKAGE_SOURCE_MAP_LIMITS.mapBytes,
        ),
        mapLabel,
      );
    } catch (error) {
      fail(`${mapLabel} is not strict JSON: ${(error as Error).message}`);
    }
    if (!isRecord(mapValue)) fail(`packed runtime source map is not an object: ${mapPath}`);
    exactKeys(mapValue, [
      'file',
      'mappings',
      'names',
      'sources',
      'sourcesContent',
      'version',
    ], `packed runtime source map ${mapPath}`);
    const names = mapValue.names;
    const sources = mapValue.sources;
    const sourcesContent = mapValue.sourcesContent;
    if (
      mapValue.version !== 3 ||
      mapValue.file !== posix.basename(ownerPath) ||
      typeof mapValue.mappings !== 'string' ||
      mapValue.mappings.length === 0 ||
      !Array.isArray(names) ||
      names.some((name) => typeof name !== 'string') ||
      !Array.isArray(sources) ||
      sources.length === 0 ||
      !Array.isArray(sourcesContent) ||
      sourcesContent.length !== sources.length ||
      sources.some((source) => typeof source !== 'string') ||
      sourcesContent.some((content) => typeof content !== 'string')
    ) {
      fail(`packed runtime source map is incomplete: ${mapPath}`);
    }
    assertReviewedSourceMapResourceBounds(
      mapValue.mappings as string,
      names as string[],
      sourcesContent as string[],
      owner,
      mapPath,
    );
    const sourceIdentities = new Set<string>();
    const resolvedSourceIdentities: string[] = [];
    for (let index = 0; index < sources.length; index++) {
      const source = sources[index];
      let sourceIdentity: string;
      try {
        sourceIdentity = resolveReviewedPackageSourceMapInput(mapPath, source);
      } catch (error) {
        fail(`packed ${(error as Error).message}`);
      }
      if (sourceIdentities.has(sourceIdentity)) {
        fail(`packed runtime source map has a duplicate embedded source: ${mapPath}`);
      }
      sourceIdentities.add(sourceIdentity);
      resolvedSourceIdentities.push(sourceIdentity);
    }
    inspectReviewedSourceMapMappings(
      mapValue.mappings as string,
      names as string[],
      sourcesContent as string[],
      owner,
      mapPath,
    );
    for (let index = 0; index < resolvedSourceIdentities.length; index++) {
      const sourceIdentity = resolvedSourceIdentities[index];
      const content = sourcesContent[index];
      if (sourceIdentity === undefined || typeof content !== 'string') {
        fail(`packed runtime source map has an unsafe embedded source: ${mapPath}`);
      }
      const prior = reviewedInputContents.get(sourceIdentity);
      if (prior !== undefined && prior !== content) {
        fail(`packed runtime source maps disagree on embedded input: ${sourceIdentity}`);
      }
      reviewedInputContents.set(sourceIdentity, content);
    }
  }

  const publishedMaps = packedPaths
    .filter((entry) => entry.endsWith('.map'))
    .sort();
  const expectedMaps = [...referencedMaps].sort();
  if (canonicalize(publishedMaps) !== canonicalize(expectedMaps)) {
    fail('packed source-map inventory contains an unreferenced or non-runtime map');
  }
  if (options.requireExactSourceInventory !== false) {
    try {
      assertReviewedPackageSourceMapInputClosure(reviewedInputContents);
    } catch (error) {
      fail(`packed ${(error as Error).message}`);
    }
  }
}

/** Duplicate-key-safe JSON equality over values, deliberately independent of wire formatting. */
export function parseAndAssertExactJsonValue(
  text: string,
  label: string,
  expected: unknown,
  maximumBytes = MAX_JSON_BYTES,
): JsonValue {
  const observed = strictJson(text, label, maximumBytes);
  if (canonicalize(observed) !== canonicalize(expected)) {
    fail(`${label} differs from the expected JSON value`);
  }
  return observed;
}

function decodeUtf8Fatal(raw: Buffer, label: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
  } catch {
    fail(`${label} is not well-formed UTF-8`);
  }
}

function readStrictJson(path: string, label: string): JsonValue {
  const raw = readRegularFileStable(path, undefined, label, MAX_JSON_BYTES);
  return strictJson(decodeUtf8Fatal(raw, label), label);
}

function parseCanonicalJsonBuffer(
  raw: Buffer,
  label: string,
  maximumBytes = MAX_JSON_BYTES,
): JsonValue {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    fail(`${label} has an invalid JSON byte budget`);
  }
  if (raw.byteLength > maximumBytes) fail(`${label} exceeds the JSON byte budget`);
  const text = decodeUtf8Fatal(raw, label);
  const parsed = strictJson(text, label, maximumBytes);
  if (text !== `${canonicalize(parsed)}\n`) fail(`${label} is not canonical JSON`);
  return parsed;
}

function sha256(raw: string | Buffer): string {
  return `sha256:${createHash('sha256').update(raw).digest('hex')}`;
}

function sha512Integrity(raw: Buffer): string {
  return `sha512-${createHash('sha512').update(raw).digest('base64')}`;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(raw: Buffer): number {
  let value = 0xffff_ffff;
  for (const byte of raw) value = CRC32_TABLE[(value ^ byte) & 0xff]! ^ (value >>> 8);
  return (value ^ 0xffff_ffff) >>> 0;
}

function allZero(raw: Buffer): boolean {
  return raw.every((byte) => byte === 0);
}

function assertZeroField(raw: Buffer, label: string): void {
  if (!allZero(raw)) fail(`${label} must be empty`);
}

function parseCanonicalTarOctal(raw: Buffer, digits: number, label: string): number {
  if (
    raw.byteLength !== digits + 2 ||
    raw[digits] !== 0x20 ||
    raw[digits + 1] !== 0 ||
    !raw.subarray(0, digits).every((byte) => byte >= 0x30 && byte <= 0x37)
  ) {
    fail(`${label} is not canonical octal`);
  }
  const value = Number.parseInt(raw.subarray(0, digits).toString('ascii'), 8);
  if (!Number.isSafeInteger(value)) fail(`${label} exceeds the safe integer domain`);
  return value;
}

function parseCanonicalTarName(raw: Buffer): string {
  const terminator = raw.indexOf(0);
  if (terminator <= 0 || terminator > PACKAGE_TARBALL_LIMITS.tarPathBytes) {
    fail('package tar path is missing its canonical terminator');
  }
  if (!allZero(raw.subarray(terminator))) fail('package tar path has nonzero suffix bytes');
  const nameBytes = raw.subarray(0, terminator);
  if (!nameBytes.every((byte) => byte >= 0x21 && byte <= 0x7e)) {
    fail('package tar path must use printable ASCII');
  }
  return nameBytes.toString('ascii');
}

function assertCanonicalArtifactPath(path: string, label: string): void {
  if (!isCanonicalPackageRelativePath(path)) {
    fail(`${label} is not a canonical package-relative path: ${path}`);
  }
}

const MAX_PACKED_MARKDOWN_LINKS = 50_000;
const MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES = 8 * 1024;
const MAX_PACKED_MARKDOWN_LINK_CANDIDATE_CODE_UNITS =
  MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES * 2 + 16;
const MAX_PACKED_MARKDOWN_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_PACKED_MARKDOWN_TOTAL_BYTES = 32 * 1024 * 1024;

export interface PackedMarkdownDocument {
  readonly path: string;
  readonly source: string;
}

export interface PackedMarkdownLinkTarget {
  readonly line: number;
  readonly target: string;
}

export interface PackedMarkdownAngleReferenceScan {
  readonly inspectedCodeUnits: number;
  readonly targets: readonly PackedMarkdownLinkTarget[];
  readonly workLimit: number;
}

function appendPackedMarkdownTargets(
  result: PackedMarkdownLinkTarget[],
  additions: readonly PackedMarkdownLinkTarget[],
): void {
  if (result.length + additions.length > MAX_PACKED_MARKDOWN_LINKS) {
    fail('packed Markdown link count exceeds its bound');
  }
  for (const target of additions) result.push(target);
}

function asciiCaseInsensitiveAt(source: string, index: number, expected: string): boolean {
  if (index < 0 || index + expected.length > source.length) return false;
  for (let offset = 0; offset < expected.length; offset++) {
    const code = source.charCodeAt(index + offset);
    const lowerCode = code >= 0x41 && code <= 0x5a ? code + 0x20 : code;
    if (lowerCode !== expected.charCodeAt(offset)) return false;
  }
  return true;
}

function markdownBackslashEscaped(source: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor--) {
    slashCount++;
  }
  return slashCount % 2 === 1;
}

function utf8ByteLengthForCodePoint(codePoint: number): number {
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

function boundedMarkdownLinkTargetValue(
  source: string,
  start: number,
  end: number,
  label: string,
): string {
  if (end - start > MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
    fail(`${label} exceeds its code-unit bound`);
  }
  let decodedBytes = 0;
  for (let cursor = start; cursor < end;) {
    if (source[cursor] === '\\' && cursor + 1 < end) cursor++;
    const codePoint = source.codePointAt(cursor)!;
    decodedBytes += utf8ByteLengthForCodePoint(codePoint);
    if (decodedBytes > MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
      fail(`${label} exceeds its UTF-8 byte bound`);
    }
    cursor += codePoint > 0xffff ? 2 : 1;
  }

  let result = '';
  for (let cursor = start; cursor < end; cursor++) {
    if (source[cursor] === '\\' && cursor + 1 < end) cursor++;
    const codePoint = source.codePointAt(cursor)!;
    const width = codePoint > 0xffff ? 2 : 1;
    result += source.slice(cursor, cursor + width);
    cursor += width - 1;
  }
  return result;
}

function parseInlineMarkdownLinkTarget(
  source: string,
  openingParenthesis: number,
  label: string,
): { readonly target: string; readonly end: number } | undefined {
  const candidateStart = openingParenthesis + 1;
  let cursor = openingParenthesis + 1;
  while (source[cursor] === ' ' || source[cursor] === '\t') {
    if (cursor - candidateStart >= MAX_PACKED_MARKDOWN_LINK_CANDIDATE_CODE_UNITS) {
      fail(`${label} candidate exceeds its code-unit bound`);
    }
    cursor++;
  }
  if (cursor >= source.length) return undefined;
  if (source[cursor] === '<') {
    const targetStart = ++cursor;
    while (cursor < source.length) {
      if (source[cursor] === '>' && !markdownBackslashEscaped(source, cursor)) break;
      if (cursor - candidateStart >= MAX_PACKED_MARKDOWN_LINK_CANDIDATE_CODE_UNITS) {
        fail(`${label} candidate exceeds its code-unit bound`);
      }
      if (cursor - targetStart >= MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
        fail(`${label} target exceeds its code-unit bound`);
      }
      cursor++;
    }
    if (cursor >= source.length) return undefined;
    const target = boundedMarkdownLinkTargetValue(
      source,
      targetStart,
      cursor,
      `${label} target`,
    );
    cursor++;
    while (source[cursor] === ' ' || source[cursor] === '\t') {
      if (cursor - candidateStart >= MAX_PACKED_MARKDOWN_LINK_CANDIDATE_CODE_UNITS) {
        fail(`${label} candidate exceeds its code-unit bound`);
      }
      cursor++;
    }
    if (source[cursor] !== ')') return undefined;
    return { target, end: cursor + 1 };
  }

  const targetStart = cursor;
  let depth = 1;
  let targetEnd = -1;
  while (cursor < source.length) {
    const character = source[cursor]!;
    const targetTerminator = depth === 1 && (
      character === ')' || character === ' ' || character === '\t'
    );
    if (
      cursor - candidateStart >= MAX_PACKED_MARKDOWN_LINK_CANDIDATE_CODE_UNITS &&
      !(character === ')' && depth === 1)
    ) {
      fail(`${label} candidate exceeds its code-unit bound`);
    }
    if (
      targetEnd < 0 &&
      cursor - targetStart >= MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES &&
      !targetTerminator
    ) {
      fail(`${label} target exceeds its code-unit bound`);
    }
    if (character === '\\' && cursor + 1 < source.length) {
      if (
        cursor + 1 - candidateStart >=
          MAX_PACKED_MARKDOWN_LINK_CANDIDATE_CODE_UNITS
      ) {
        fail(`${label} candidate exceeds its code-unit bound`);
      }
      if (
        targetEnd < 0 &&
        cursor + 1 - targetStart >= MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES
      ) {
        fail(`${label} target exceeds its code-unit bound`);
      }
      cursor += 2;
      continue;
    }
    if (character === '(') {
      depth++;
      if (depth > 32) return undefined;
    } else if (character === ')') {
      depth--;
      if (depth === 0) {
        if (targetEnd < 0) targetEnd = cursor;
        return {
          target: boundedMarkdownLinkTargetValue(
            source,
            targetStart,
            targetEnd,
            `${label} target`,
          ),
          end: cursor + 1,
        };
      }
    } else if ((character === ' ' || character === '\t') && depth === 1 && targetEnd < 0) {
      targetEnd = cursor;
    }
    cursor++;
  }
  return undefined;
}

function parseReferenceMarkdownLinkTarget(
  source: string,
  destinationStart: number,
  label: string,
): string | undefined {
  let cursor = destinationStart;
  while (source[cursor] === ' ' || source[cursor] === '\t') {
    if (
      cursor - destinationStart >=
        MAX_PACKED_MARKDOWN_LINK_CANDIDATE_CODE_UNITS
    ) {
      fail(`${label} candidate exceeds its code-unit bound`);
    }
    cursor++;
  }
  if (cursor >= source.length) return undefined;
  if (source[cursor] === '<') {
    const targetStart = ++cursor;
    while (cursor < source.length) {
      if (source[cursor] === '>' && !markdownBackslashEscaped(source, cursor)) {
        return boundedMarkdownLinkTargetValue(
          source,
          targetStart,
          cursor,
          `${label} target`,
        );
      }
      if (
        cursor - destinationStart >=
          MAX_PACKED_MARKDOWN_LINK_CANDIDATE_CODE_UNITS
      ) {
        fail(`${label} candidate exceeds its code-unit bound`);
      }
      if (cursor - targetStart >= MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
        fail(`${label} target exceeds its code-unit bound`);
      }
      cursor++;
    }
    return undefined;
  }
  const targetStart = cursor;
  while (cursor < source.length && source[cursor] !== ' ' && source[cursor] !== '\t') {
    if (
      cursor - destinationStart >=
        MAX_PACKED_MARKDOWN_LINK_CANDIDATE_CODE_UNITS
    ) {
      fail(`${label} candidate exceeds its code-unit bound`);
    }
    if (cursor - targetStart >= MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
      fail(`${label} target exceeds its code-unit bound`);
    }
    if (source[cursor] === '\\' && cursor + 1 < source.length) {
      if (cursor + 1 - targetStart >= MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
        fail(`${label} target exceeds its code-unit bound`);
      }
      cursor++;
    }
    cursor++;
  }
  return boundedMarkdownLinkTargetValue(
    source,
    targetStart,
    cursor,
    `${label} target`,
  );
}

function conservativeReferenceDestinationOffset(line: string): number | null {
  // Scan one line once and recognize a reference-definition-like destination in
  // every context, including indentation, block markers, code, and comments.
  // This deliberately accepts more than CommonMark. A nested '[' simply starts
  // a newer candidate, keeping rejected bracket runs linear.
  let inLabel = false;
  let labelHasContent = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index]!;
    if (character === '[') {
      inLabel = true;
      labelHasContent = false;
      continue;
    }
    if (!inLabel) continue;
    if (character === '\\' && index + 1 < line.length) {
      labelHasContent = true;
      index++;
      continue;
    }
    if (character === ']') {
      if (labelHasContent && line[index + 1] === ':') {
        return index + 2;
      }
      inLabel = false;
      labelHasContent = false;
      continue;
    }
    labelHasContent = true;
  }
  return null;
}

function decodePackedHtmlReferenceValue(raw: string, label: string): string {
  if (raw.length > MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
    fail(`${label} exceeds its code-unit bound`);
  }
  let result = '';
  let decodedBytes = 0;
  const appendDecoded = (value: string): void => {
    for (let cursor = 0; cursor < value.length;) {
      const codePoint = value.codePointAt(cursor)!;
      decodedBytes += utf8ByteLengthForCodePoint(codePoint);
      if (decodedBytes > MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
        fail(`${label} exceeds its UTF-8 byte bound`);
      }
      cursor += codePoint > 0xffff ? 2 : 1;
    }
    result += value;
  };
  for (let index = 0; index < raw.length;) {
    if (raw[index] !== '&') {
      const codePoint = raw.codePointAt(index)!;
      const width = codePoint > 0xffff ? 2 : 1;
      appendDecoded(raw.slice(index, index + width));
      index += width;
      continue;
    }
    const terminator = raw.indexOf(';', index + 1);
    if (terminator < 0 || terminator - index > 32) {
      fail(`${label} contains an unterminated HTML character reference`);
    }
    const token = raw.slice(index + 1, terminator);
    const named: Readonly<Record<string, string>> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      quot: '"',
    };
    let decoded = named[token];
    if (decoded === undefined && /^#[0-9]+$/u.test(token)) {
      const codePoint = Number.parseInt(token.slice(1), 10);
      if (
        !Number.isSafeInteger(codePoint) ||
        codePoint <= 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        fail(`${label} contains an invalid numeric HTML character reference`);
      }
      decoded = String.fromCodePoint(codePoint);
    }
    if (decoded === undefined && /^#x[0-9A-Fa-f]+$/u.test(token)) {
      const codePoint = Number.parseInt(token.slice(2), 16);
      if (
        !Number.isSafeInteger(codePoint) ||
        codePoint <= 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        fail(`${label} contains an invalid hexadecimal HTML character reference`);
      }
      decoded = String.fromCodePoint(codePoint);
    }
    if (decoded === undefined) {
      fail(`${label} contains an unsupported HTML character reference`);
    }
    appendDecoded(decoded);
    index = terminator + 1;
  }
  return result;
}

function packedSrcsetTargets(
  value: string,
  documentPath: string,
  line: number,
): readonly PackedMarkdownLinkTarget[] {
  if (value.trim().length === 0) return [];
  const result: PackedMarkdownLinkTarget[] = [];
  const candidates = value.split(',');
  for (const candidate of candidates) {
    const fields = candidate.trim().split(/[ \t\r\n]+/u);
    if (fields.length < 1 || fields.length > 2 || fields[0]!.length === 0) {
      fail(`packed Markdown HTML srcset is malformed: ${documentPath}:${line}`);
    }
    if (fields.length === 2) {
      const descriptor = fields[1]!;
      const width = /^([1-9][0-9]*)w$/u.exec(descriptor);
      const density = /^((?:[0-9]+(?:\.[0-9]+)?)|(?:\.[0-9]+))x$/u.exec(descriptor);
      if (
        (width === null && density === null) ||
        (density !== null && (!Number.isFinite(Number(density[1])) || Number(density[1]) <= 0))
      ) {
        fail(`packed Markdown HTML srcset descriptor is malformed: ${documentPath}:${line}`);
      }
    }
    result.push({ line, target: fields[0]! });
  }
  return result;
}

function packedHtmlAttributeLikeTargets(
  source: string,
  documentPath: string,
): readonly PackedMarkdownLinkTarget[] {
  const result: PackedMarkdownLinkTarget[] = [];
  const nameCharacter = /[A-Za-z0-9_.:-]/u;
  let cursor = 0;
  let line = 1;
  while (cursor < source.length) {
    if (source[cursor] === '\n') {
      line++;
      cursor++;
      continue;
    }
    const firstCode = source.charCodeAt(cursor);
    const firstLowerCode = firstCode >= 0x41 && firstCode <= 0x5a
      ? firstCode + 0x20
      : firstCode;
    const candidate = firstLowerCode === 0x68
      ? 'href'
      : firstLowerCode === 0x73 && asciiCaseInsensitiveAt(source, cursor, 'srcset')
        ? 'srcset'
        : firstLowerCode === 0x73
          ? 'src'
          : undefined;
    const name = candidate !== undefined &&
      asciiCaseInsensitiveAt(source, cursor, candidate) &&
      !nameCharacter.test(source[cursor - 1] ?? '') &&
      !nameCharacter.test(source[cursor + candidate.length] ?? '')
      ? candidate
      : undefined;
    if (name === undefined) {
      cursor++;
      continue;
    }
    const startLine = line;
    let probe = cursor + name.length;
    while (/\s/u.test(source[probe] ?? '')) probe++;
    if (source[probe] !== '=') {
      if (source[probe] === '>') {
        fail(`packed Markdown raw HTML-like ${name} lacks a value: ${documentPath}:${startLine}`);
      }
      cursor += name.length;
      continue;
    }
    for (let index = cursor + name.length; index < probe; index++) {
      if (source[index] === '\n') line++;
    }
    probe++;
    while (/\s/u.test(source[probe] ?? '')) {
      if (source[probe] === '\n') line++;
      probe++;
    }
    const quote = source[probe] === '"' || source[probe] === "'"
      ? source[probe]!
      : undefined;
    let value: string;
    if (quote !== undefined) {
      const valueStart = ++probe;
      while (probe < source.length && source[probe] !== quote) {
        if (source[probe] === '\n') line++;
        probe++;
        if (probe - valueStart > MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
          fail(`packed Markdown raw HTML-like ${name} exceeds its bound: ${documentPath}:${startLine}`);
        }
      }
      if (source[probe] !== quote) {
        fail(`packed Markdown raw HTML-like ${name} quote is unterminated: ${documentPath}:${startLine}`);
      }
      value = source.slice(valueStart, probe);
      probe++;
    } else {
      const valueStart = probe;
      while (probe < source.length && !/[\s>]/u.test(source[probe]!)) {
        probe++;
        if (probe - valueStart > MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
          fail(`packed Markdown raw HTML-like ${name} exceeds its bound: ${documentPath}:${startLine}`);
        }
      }
      value = source.slice(valueStart, probe);
      if (value.length === 0 || /["'<=`]/u.test(value)) {
        fail(`packed Markdown raw HTML-like ${name} value is malformed: ${documentPath}:${startLine}`);
      }
    }
    const decoded = decodePackedHtmlReferenceValue(
      value,
      `packed Markdown raw HTML-like ${name} at ${documentPath}:${startLine}`,
    );
    if (name === 'srcset') {
      appendPackedMarkdownTargets(
        result,
        packedSrcsetTargets(decoded, documentPath, startLine),
      );
    } else {
      appendPackedMarkdownTargets(result, [{ line: startLine, target: decoded }]);
    }
    cursor = probe;
  }
  return result;
}

export function inspectPackedMarkdownAngleReferences(
  source: string,
  documentPath: string,
): PackedMarkdownAngleReferenceScan {
  const result: PackedMarkdownLinkTarget[] = [];
  let cursor = 0;
  let line = 1;
  let inspectedCodeUnits = 0;
  // The outer cursor visits each ordinary code unit once. An angle candidate
  // scans its disjoint bounded body once, and nested '<' advances directly to
  // that delimiter rather than rescanning the suffix. Four source lengths
  // therefore conservatively dominate every branch.
  const workLimit = source.length * 4 + 1;
  const readCodeUnit = (index: number): string | undefined => {
    inspectedCodeUnits++;
    if (inspectedCodeUnits > workLimit) {
      fail(`packed Markdown angle-reference scan exceeds its work bound: ${documentPath}`);
    }
    return source[index];
  };
  while (cursor < source.length) {
    const outerCharacter = readCodeUnit(cursor)!;
    if (outerCharacter === '\n') {
      line++;
      cursor++;
      continue;
    }
    if (outerCharacter !== '<') {
      cursor++;
      continue;
    }
    const start = cursor;
    const startLine = line;

    // URI/email autolinks cannot contain another '<', '>', or an ASCII control
    // or space. Stop at the first such delimiter and advance directly to a nested
    // '<' so an invalid prefix never rescans the remaining suffix.
    let simpleEnd = -1;
    let barrier = -1;
    let barrierCharacter: string | undefined;
    let probe = start + 1;
    while (probe < source.length) {
      const character = readCodeUnit(probe)!;
      if (character === '>') {
        simpleEnd = probe;
        break;
      }
      if (
        character === '<' ||
        character.charCodeAt(0) <= 0x20 ||
        character.charCodeAt(0) === 0x7f
      ) {
        barrier = probe;
        barrierCharacter = character;
        break;
      }
      if (probe - (start + 1) >= MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES) {
        fail(`packed Markdown angle-reference candidate exceeds its bound: ${documentPath}:${startLine}`);
      }
      probe++;
    }
    if (simpleEnd >= 0) {
      const body = source.slice(start + 1, simpleEnd);
      if (
        /^[A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\u0000-\u0020\u007f]*$/u.test(body)
      ) {
        appendPackedMarkdownTargets(result, [{
          line: startLine,
          target: decodePackedHtmlReferenceValue(
            body,
            `packed Markdown autolink at ${documentPath}:${startLine}`,
          ),
        }]);
      } else if (
        /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/u
          .test(body)
      ) {
        appendPackedMarkdownTargets(result, [{ line: startLine, target: `mailto:${body}` }]);
      }
      cursor = simpleEnd + 1;
      continue;
    }
    if (barrier >= 0) {
      cursor = barrierCharacter === '<' ? barrier : barrier + 1;
      if (barrierCharacter === '\n') line++;
      continue;
    }
    cursor = source.length;
  }
  return Object.freeze({
    inspectedCodeUnits,
    targets: Object.freeze(result.slice()),
    workLimit,
  });
}

function packedMarkdownLinkTargets(
  document: PackedMarkdownDocument,
): readonly PackedMarkdownLinkTarget[] {
  const targets: PackedMarkdownLinkTarget[] = [];
  const lines = document.source.split('\n');
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]!;
    const referenceOffset = conservativeReferenceDestinationOffset(line);
    if (referenceOffset !== null) {
      const target = parseReferenceMarkdownLinkTarget(
        line,
        referenceOffset,
        `packed Markdown reference at ${document.path}:${lineIndex + 1}`,
      );
      if (target === undefined) {
        fail(`packed Markdown has an unsupported reference destination: ${document.path}:${lineIndex + 1}`);
      }
      appendPackedMarkdownTargets(targets, [{ line: lineIndex + 1, target }]);
    }

    for (let index = 0; index + 1 < line.length;) {
      const openingParenthesis = line.indexOf('](', index);
      if (openingParenthesis < 0) break;
      if (markdownBackslashEscaped(line, openingParenthesis)) {
        index = openingParenthesis + 2;
        continue;
      }
      const parsed = parseInlineMarkdownLinkTarget(
        line,
        openingParenthesis + 1,
        `packed Markdown inline link at ${document.path}:${lineIndex + 1}`,
      );
      if (parsed === undefined) {
        fail(`packed Markdown has an unsupported inline link destination: ${document.path}:${lineIndex + 1}`);
      }
      appendPackedMarkdownTargets(targets, [{
        line: lineIndex + 1,
        target: parsed.target,
      }]);
      index = parsed.end;
    }
  }
  appendPackedMarkdownTargets(
    targets,
    packedHtmlAttributeLikeTargets(document.source, document.path),
  );
  appendPackedMarkdownTargets(
    targets,
    inspectPackedMarkdownAngleReferences(document.source, document.path).targets,
  );
  return targets;
}

/**
 * Checks a conservative syntactic over-approximation of Markdown destinations as
 * package-consumer paths, not source-checkout paths. Code, comments, fences, raw
 * HTML blocks, and indented regions are scanned too: this is deliberately not a
 * CommonMark render-equivalence claim, and false positives fail closed rather than
 * letting parser precedence hide a live destination. Relative targets must stay
 * inside and resolve within the exact tar inventory; external targets must carry an
 * explicit HTTPS origin. The policy does not forgive unpackaged source files.
 */
export function assertPackedMarkdownLinkClosure(
  documents: readonly PackedMarkdownDocument[],
  packedPaths: readonly string[],
): void {
  const packageFiles = new Set(packedPaths);
  const expectedMarkdownPaths = packedPaths
    .filter((path) => /\.(?:md|markdown)$/iu.test(path))
    .sort();
  const packageDirectories = new Set<string>();
  for (const path of packedPaths) {
    assertCanonicalArtifactPath(path, 'packed Markdown inventory path');
    let parent = posix.dirname(path);
    while (parent !== '.') {
      packageDirectories.add(parent);
      parent = posix.dirname(parent);
    }
  }
  const seenDocuments = new Set<string>();
  let linkCount = 0;
  let markdownBytes = 0;
  for (const document of documents) {
    assertCanonicalArtifactPath(document.path, 'packed Markdown document path');
    if (!packageFiles.has(document.path) || seenDocuments.has(document.path)) {
      fail(`packed Markdown document is absent or duplicated: ${document.path}`);
    }
    seenDocuments.add(document.path);
    const documentBytes = Buffer.byteLength(document.source, 'utf8');
    if (documentBytes > MAX_PACKED_MARKDOWN_DOCUMENT_BYTES) {
      fail(`packed Markdown document exceeds its byte bound: ${document.path}`);
    }
    markdownBytes += documentBytes;
    if (markdownBytes > MAX_PACKED_MARKDOWN_TOTAL_BYTES) {
      fail('packed Markdown documents exceed their total byte bound');
    }
    for (const link of packedMarkdownLinkTargets(document)) {
      linkCount++;
      if (linkCount > MAX_PACKED_MARKDOWN_LINKS) {
        fail('packed Markdown link count exceeds its bound');
      }
      if (
        link.target.length > MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES ||
        Buffer.byteLength(link.target, 'utf8') > MAX_PACKED_MARKDOWN_LINK_TARGET_BYTES ||
        /[\u0000-\u001f\u007f]/u.test(link.target)
      ) {
        fail(`packed Markdown link target is invalid: ${document.path}:${link.line}`);
      }
      if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(link.target)) {
        let url: URL;
        try {
          url = new URL(link.target);
        } catch {
          fail(`packed Markdown external link is malformed: ${document.path}:${link.line}`);
        }
        if (
          url.protocol !== 'https:' ||
          url.hostname.length === 0 ||
          url.username.length > 0 ||
          url.password.length > 0
        ) {
          fail(`packed Markdown external link is not an explicit HTTPS URL: ${document.path}:${link.line}`);
        }
        continue;
      }
      if (link.target.startsWith('//') || link.target.includes('\\')) {
        fail(`packed Markdown relative link is ambiguous: ${document.path}:${link.line}`);
      }
      const encodedPath = link.target.split(/[?#]/u, 1)[0]!;
      let decodedPath: string;
      try {
        decodedPath = decodeURIComponent(encodedPath);
      } catch {
        fail(`packed Markdown relative link has malformed encoding: ${document.path}:${link.line}`);
      }
      if (decodedPath.includes('\\') || decodedPath.startsWith('/')) {
        fail(`packed Markdown relative link escapes package semantics: ${document.path}:${link.line}`);
      }
      const resolved = decodedPath.length === 0
        ? document.path
        : posix.normalize(posix.join(posix.dirname(document.path), decodedPath));
      if (
        resolved === '..' ||
        resolved.startsWith('../') ||
        (!packageFiles.has(resolved) && !packageDirectories.has(resolved.replace(/\/$/u, '')))
      ) {
        fail(
          `packed Markdown relative link does not resolve inside the tarball: ` +
          `${document.path}:${link.line} -> ${link.target}`,
        );
      }
    }
  }
  const observedMarkdownPaths = [...seenDocuments].sort();
  if (canonicalize(observedMarkdownPaths) !== canonicalize(expectedMarkdownPaths)) {
    fail('packed Markdown document set differs from the exact tar inventory');
  }
}

function expectedArtifactMode(path: string): number {
  return path === 'dist/cli/main.js' ? 0o755 : 0o644;
}

export function installedArtifactMode(mode: number): number {
  if (!Number.isSafeInteger(mode) || mode < 0) {
    fail('installed Cortexel file mode is invalid');
  }
  return mode & 0o7777;
}

function gunzipSinglePackageMember(tarball: Buffer): Buffer {
  if (
    tarball.byteLength < 18 ||
    tarball.byteLength > PACKAGE_TARBALL_LIMITS.compressedBytes
  ) {
    fail('package tarball compressed size is outside its bound');
  }
  if (!tarball.subarray(0, 3).equals(NPM_GZIP_HEADER.subarray(0, 3))) {
    fail('package tarball gzip header is malformed');
  }
  if (tarball[3] !== 0) {
    fail('package tarball gzip optional fields are unsupported');
  }
  if (!tarball.subarray(0, NPM_GZIP_HEADER.byteLength).equals(NPM_GZIP_HEADER)) {
    fail('package tarball gzip header is not the canonical npm portable profile');
  }
  const deflateOffset = 10;
  let result: { readonly buffer: Buffer; readonly engine: { readonly bytesWritten: number } };
  try {
    result = inflateRawSync(tarball.subarray(deflateOffset), {
      info: true,
      maxOutputLength: PACKAGE_TARBALL_LIMITS.uncompressedBytes,
    }) as unknown as typeof result;
  } catch {
    fail('package tarball contains malformed, truncated, or over-budget DEFLATE data');
  }
  const deflateBytes = result.engine.bytesWritten;
  if (!Number.isSafeInteger(deflateBytes) || deflateBytes <= 0) {
    fail('package tarball DEFLATE length is invalid');
  }
  const footerOffset = deflateOffset + deflateBytes;
  if (footerOffset + 8 > tarball.byteLength) {
    fail('package tarball has a truncated gzip footer');
  }
  if (footerOffset + 8 < tarball.byteLength) {
    fail('package tarball has a concatenated gzip member or trailing bytes');
  }
  const expectedCrc = tarball.readUInt32LE(footerOffset);
  const expectedSize = tarball.readUInt32LE(footerOffset + 4);
  if (crc32(result.buffer) !== expectedCrc) fail('package tarball gzip CRC-32 mismatch');
  if (result.buffer.byteLength !== expectedSize) fail('package tarball gzip size mismatch');
  return result.buffer;
}

function artifactFileMap<T extends PackedFile>(
  files: readonly T[],
  label: string,
  requireDigest: boolean,
): Map<string, T> {
  if (files.length === 0 || files.length > PACKAGE_TARBALL_LIMITS.entries) {
    fail(`${label} entry count is outside its bound`);
  }
  const result = new Map<string, T>();
  const caseFolded = new Set<string>();
  for (const file of files) {
    assertCanonicalArtifactPath(file.path, `${label} path`);
    if (
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      file.size > PACKAGE_TARBALL_LIMITS.fileBytes
    ) {
      fail(`${label} file size is outside its bound: ${file.path}`);
    }
    if (file.mode !== expectedArtifactMode(file.path)) {
      fail(`${label} file mode is invalid: ${file.path}`);
    }
    const folded = file.path.toLowerCase();
    if (result.has(file.path) || caseFolded.has(folded)) {
      fail(`${label} contains a duplicate semantic path: ${file.path}`);
    }
    if (requireDigest) {
      const digest = (file as T & { readonly digest?: unknown }).digest;
      if (typeof digest !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(digest)) {
        fail(`${label} content digest is invalid: ${file.path}`);
      }
    }
    result.set(file.path, file);
    caseFolded.add(folded);
  }
  return result;
}

/** Independently inspects the gzip and USTAR bytes npm produced before any install. */
export function inspectNpmPackageTarball(
  tarball: Buffer,
  packed: PackedResult,
  expectedFiles: readonly ExpectedPackageFile[],
): PackageTarballInspection {
  if (packed.name !== 'cortexel') fail('npm pack artifact name is not Cortexel');
  if (packed.size !== tarball.byteLength) fail('npm pack size differs from package tarball bytes');
  if (packed.entryCount !== packed.files.length) fail('npm pack entryCount differs from its file list');
  if (packed.integrity !== sha512Integrity(tarball)) fail('npm pack integrity differs from tarball bytes');
  if (packed.shasum !== createHash('sha1').update(tarball).digest('hex')) {
    fail('npm pack legacy shasum differs from tarball bytes');
  }
  if (packed.filename !== `cortexel-${packed.version}.tgz`) {
    fail('npm pack filename differs from the package identity');
  }

  const npmFiles = artifactFileMap(packed.files, 'npm pack inventory', false);
  const expected = artifactFileMap(expectedFiles, 'expected package closure', true);
  if (npmFiles.size !== expected.size) fail('npm pack inventory differs from expected package closure');
  let expectedFileBytes = 0;
  for (const [path, file] of expected) {
    const npmFile = npmFiles.get(path);
    if (npmFile === undefined || npmFile.size !== file.size || npmFile.mode !== file.mode) {
      fail(`npm pack inventory differs from expected package file: ${path}`);
    }
    expectedFileBytes += file.size;
    if (expectedFileBytes > PACKAGE_TARBALL_LIMITS.uncompressedBytes) {
      fail('expected package closure exceeds its byte bound');
    }
  }
  if (packed.unpackedSize !== expectedFileBytes) {
    fail('npm pack unpackedSize differs from expected package closure');
  }

  const tar = gunzipSinglePackageMember(tarball);
  if (tar.byteLength % 512 !== 0) fail('package tar byte length is not block-aligned');
  const seen = new Set<string>();
  const seenFolded = new Set<string>();
  const inspected: ExpectedPackageFile[] = [];
  const markdownDocuments: PackedMarkdownDocument[] = [];
  let offset = 0;
  let fileBytes = 0;
  while (true) {
    if (offset + 512 > tar.byteLength) fail('package tar is truncated before its end marker');
    const header = tar.subarray(offset, offset + 512);
    if (allZero(header)) {
      const trailing = tar.subarray(offset);
      if (trailing.byteLength !== 1024 || !allZero(trailing)) {
        fail('package tar has an ambiguous end marker or trailing bytes');
      }
      break;
    }
    if (inspected.length >= PACKAGE_TARBALL_LIMITS.entries) {
      fail('package tar entry count exceeds its bound');
    }
    const storedChecksum = parseCanonicalTarOctal(header.subarray(148, 156), 6, 'tar checksum');
    let observedChecksum = 0;
    for (let index = 0; index < header.length; index++) {
      observedChecksum += index >= 148 && index < 156 ? 0x20 : header[index]!;
    }
    if (observedChecksum !== storedChecksum) fail('package tar header checksum mismatch');
    if (!header.subarray(257, 263).equals(Buffer.from('ustar\0', 'ascii')) ||
        !header.subarray(263, 265).equals(Buffer.from('00', 'ascii'))) {
      fail('package tar entry is not canonical USTAR');
    }
    assertZeroField(header.subarray(108, 116), 'tar uid');
    assertZeroField(header.subarray(116, 124), 'tar gid');
    assertZeroField(header.subarray(157, 257), 'tar link name');
    assertZeroField(header.subarray(265, 329), 'tar owner/group names');
    if (!header.subarray(329, 337).equals(Buffer.from('000000 \0', 'ascii')) ||
        !header.subarray(337, 345).equals(Buffer.from('000000 \0', 'ascii'))) {
      fail('package tar device fields are not canonical zero values');
    }
    assertZeroField(header.subarray(345, 500), 'tar path prefix');
    assertZeroField(header.subarray(500, 512), 'tar header padding');
    if (header[156] !== 0x30) {
      fail('package tar contains a non-regular or extension entry');
    }
    const tarPath = parseCanonicalTarName(header.subarray(0, 100));
    if (!tarPath.startsWith('package/')) fail('package tar path lacks the package/ root');
    const path = tarPath.slice('package/'.length);
    assertCanonicalArtifactPath(path, 'package tar path');
    const folded = path.toLowerCase();
    if (seen.has(path) || seenFolded.has(folded)) {
      fail(`package tar contains a duplicate semantic path: ${path}`);
    }
    const mode = parseCanonicalTarOctal(header.subarray(100, 108), 6, 'tar mode');
    const size = parseCanonicalTarOctal(header.subarray(124, 136), 10, 'tar size');
    const mtime = parseCanonicalTarOctal(header.subarray(136, 148), 10, 'tar mtime');
    if (mtime !== NPM_PORTABLE_MTIME_SECONDS) fail(`package tar mtime is not portable: ${path}`);
    if (size > PACKAGE_TARBALL_LIMITS.fileBytes) fail(`package tar file exceeds its bound: ${path}`);
    if (mode !== expectedArtifactMode(path)) fail(`package tar file mode is invalid: ${path}`);
    const dataOffset = offset + 512;
    const paddedSize = Math.ceil(size / 512) * 512;
    const nextOffset = dataOffset + paddedSize;
    if (!Number.isSafeInteger(nextOffset) || nextOffset > tar.byteLength) {
      fail(`package tar file is truncated: ${path}`);
    }
    const content = tar.subarray(dataOffset, dataOffset + size);
    if (!allZero(tar.subarray(dataOffset + size, nextOffset))) {
      fail(`package tar file has nonzero padding: ${path}`);
    }
    const npmFile = npmFiles.get(path);
    const expectedFile = expected.get(path);
    if (npmFile === undefined || npmFile.size !== size || npmFile.mode !== mode) {
      fail(`package tar entry differs from npm pack inventory: ${path}`);
    }
    const digest = sha256(content);
    if (expectedFile === undefined || expectedFile.size !== size ||
        expectedFile.mode !== mode || expectedFile.digest !== digest) {
      fail(`package tar entry differs from expected package content: ${path}`);
    }
    if (/\.(?:md|markdown)$/iu.test(path)) {
      markdownDocuments.push({
        path,
        source: decodeUtf8Fatal(content, `packed Markdown ${path}`),
      });
    }
    inspected.push({ path, size, mode, digest });
    fileBytes += size;
    seen.add(path);
    seenFolded.add(folded);
    offset = nextOffset;
  }
  if (inspected.length === 0 || inspected.length !== npmFiles.size || fileBytes !== expectedFileBytes) {
    fail('package tar file closure is incomplete');
  }
  assertPackedMarkdownLinkClosure(
    markdownDocuments,
    inspected.map((file) => file.path),
  );
  inspected.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return {
    compressedBytes: tarball.byteLength,
    uncompressedBytes: tar.byteLength,
    fileBytes,
    entryCount: inspected.length,
    treeDigest: sha256(canonicalize(inspected)),
  };
}

function exactJsonEqual(left: unknown, right: unknown): boolean {
  return canonicalize(left) === canonicalize(right);
}

function jsonDifferencePathSegment(key: string): string {
  const bounded = jsonDiagnosticString(key, 256);
  return `[${bounded.encoded}${bounded.truncated ? '<truncated>' : ''}]`;
}

function firstJsonDifferencePath(
  expected: JsonValue,
  actual: JsonValue,
  path = '$',
  depth = 0,
): string | undefined {
  if (Object.is(expected, actual)) return undefined;
  if (depth >= 128) return path;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return `${path}.length`;
    for (let index = 0; index < expected.length; index++) {
      const difference = firstJsonDifferencePath(
        expected[index]!,
        actual[index]!,
        `${path}[${index}]`,
        depth + 1,
      );
      if (difference !== undefined) return difference;
    }
    return undefined;
  }
  if (isRecord(expected) && isRecord(actual)) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      const nextPath = `${path}${jsonDifferencePathSegment(key)}`;
      if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key)) return nextPath;
      const difference = firstJsonDifferencePath(
        expected[key]!,
        actual[key]!,
        nextPath,
        depth + 1,
      );
      if (difference !== undefined) return difference;
    }
    return undefined;
  }
  return path;
}

function expectRecord(value: JsonValue | undefined, label: string): Record<string, JsonValue> {
  if (!isRecord(value)) fail(`${label} must be an object`);
  return value;
}

function expectString(value: JsonValue | undefined, label: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`);
  return value;
}

function expectInteger(value: JsonValue | undefined, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    fail(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function assertSri512(value: string, label: string): void {
  if (!value.startsWith('sha512-')) fail(`${label} must use SHA-512 SRI`);
  const encoded = value.slice('sha512-'.length);
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.byteLength !== 64 || decoded.toString('base64') !== encoded) {
    fail(`${label} is not a canonical SHA-512 SRI value`);
  }
}

function isCanonicalPackageName(name: string): boolean {
  const bare = '[A-Za-z0-9][A-Za-z0-9._~-]*';
  return new RegExp(`^(?:${bare}|@${bare}/${bare})$`, 'u').test(name);
}

function isCanonicalLockPackagePath(path: string): boolean {
  if (path.includes('\\') || path === '' || path !== path.split('/').join('/')) return false;
  const segments = path.split('/');
  let index = 0;
  while (index < segments.length) {
    if (segments[index] !== 'node_modules') return false;
    index++;
    const first = segments[index];
    if (first === undefined) return false;
    if (first.startsWith('@')) {
      const second = segments[index + 1];
      if (second === undefined || !isCanonicalPackageName(`${first}/${second}`)) return false;
      index += 2;
    } else {
      if (!isCanonicalPackageName(first)) return false;
      index++;
    }
  }
  return true;
}

function dependencyLockCandidates(parentPath: string, dependency: string): string[] {
  const candidates: string[] = [];
  let ancestor = parentPath;
  while (ancestor !== '') {
    candidates.push(`${ancestor}/node_modules/${dependency}`);
    const marker = ancestor.lastIndexOf('/node_modules/');
    ancestor = marker === -1 ? '' : ancestor.slice(0, marker);
  }
  candidates.push(`node_modules/${dependency}`);
  return [...new Set(candidates)];
}

/** The fixture lock is executable policy: every registry artifact is exact and integrity-bound. */
export function validatePackageSmokeFixture(
  manifestValue: JsonValue,
  lockValue: JsonValue,
  cortexelPackageValue: JsonValue,
): void {
  const manifest = expectRecord(manifestValue, 'fixture package.json');
  exactKeys(
    manifest,
    [
      'name',
      'version',
      'private',
      'type',
      'dependencies',
      'devDependencies',
      'optionalDependencies',
    ],
    'fixture package.json',
  );
  if (
    manifest.name !== 'cortexel-package-smoke-fixture' ||
    manifest.version !== '1.0.0' ||
    manifest.private !== true ||
    manifest.type !== 'module'
  ) {
    fail('fixture package.json identity is invalid');
  }
  const dependencies = expectRecord(manifest.dependencies, 'fixture dependencies');
  if (!exactJsonEqual(dependencies, { cortexel: `file:${LOCAL_TARBALL_FILENAME}` })) {
    fail('fixture must have only the local Cortexel tarball as a normal dependency');
  }
  const devDependencies = expectRecord(manifest.devDependencies, 'fixture devDependencies');
  if (!exactJsonEqual(devDependencies, EXPECTED_DEV_DEPENDENCIES)) {
    fail('fixture devDependencies must be exact reviewed versions');
  }
  const optionalDependencies = expectRecord(
    manifest.optionalDependencies,
    'fixture optionalDependencies',
  );
  if (!exactJsonEqual(optionalDependencies, EXPECTED_OPTIONAL_DEPENDENCIES)) {
    fail('fixture optionalDependencies must be exact reviewed versions');
  }

  const lock = expectRecord(lockValue, 'fixture package-lock.json');
  exactKeys(
    lock,
    ['name', 'version', 'lockfileVersion', 'requires', 'packages'],
    'fixture package-lock.json',
  );
  if (
    lock.name !== manifest.name ||
    lock.version !== manifest.version ||
    lock.lockfileVersion !== 3 ||
    lock.requires !== true
  ) {
    fail('fixture package-lock.json header is invalid');
  }
  const packages = expectRecord(lock.packages, 'fixture lock packages');
  if (Object.keys(packages).length > 10_000) fail('fixture lock package count exceeds its budget');
  const lockRoot = expectRecord(packages[''], 'fixture lock root');
  exactKeys(
    lockRoot,
    ['name', 'version', 'dependencies', 'devDependencies', 'optionalDependencies'],
    'fixture lock root',
  );
  if (
    lockRoot.name !== manifest.name ||
    lockRoot.version !== manifest.version ||
    !exactJsonEqual(lockRoot.dependencies, dependencies) ||
    !exactJsonEqual(lockRoot.devDependencies, devDependencies) ||
    !exactJsonEqual(lockRoot.optionalDependencies, optionalDependencies)
  ) {
    fail('fixture lock root differs from package.json');
  }

  const sourcePackage = expectRecord(cortexelPackageValue, 'Cortexel package.json');
  const lockedCortexel = expectRecord(packages['node_modules/cortexel'], 'locked Cortexel package');
  if (Object.hasOwn(lockedCortexel, 'integrity')) {
    fail('the mutable local artifact integrity belongs in prepared state, not the committed lock');
  }
  exactKeys(
    lockedCortexel,
    [
      'version',
      'resolved',
      'license',
      'dependencies',
      'bin',
      'engines',
      'peerDependencies',
      'peerDependenciesMeta',
    ],
    'locked Cortexel package',
  );
  if (lockedCortexel.resolved !== `file:${LOCAL_TARBALL_FILENAME}`) {
    fail('Cortexel fixture dependency must resolve only from the local tarball');
  }
  for (const key of [
    'version',
    'license',
    'dependencies',
    'engines',
    'peerDependencies',
    'peerDependenciesMeta',
  ] as const) {
    if (!exactJsonEqual(lockedCortexel[key], sourcePackage[key])) {
      fail(`fixture lock Cortexel metadata is stale at ${key}`);
    }
  }
  const sourceBin = expectRecord(sourcePackage.bin, 'Cortexel package bin');
  const normalizedSourceBin = Object.fromEntries(
    Object.entries(sourceBin).map(([name, path]) => [
      name,
      typeof path === 'string' ? path.replace(/^\.\//u, '') : path,
    ]),
  );
  if (!exactJsonEqual(lockedCortexel.bin, normalizedSourceBin)) {
    fail('fixture lock Cortexel metadata is stale at bin');
  }

  for (const [path, candidate] of Object.entries(packages)) {
    if (path === '' || path === 'node_modules/cortexel') continue;
    if (!isCanonicalLockPackagePath(path)) fail(`fixture lock has an unsafe package path ${path}`);
    const record = expectRecord(candidate, `fixture lock package ${path}`);
    if (record.link === true || record.inBundle === true || record.bundled === true) {
      fail(`fixture lock package ${path} uses an unreviewed bundle or link`);
    }
    const version = expectString(record.version, `fixture lock package ${path} version`);
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
      fail(`fixture lock package ${path} does not have an exact version`);
    }
    if (
      record.hasInstallScript === true &&
      REVIEWED_IGNORED_INSTALL_SCRIPT_PACKAGES.get(path) !== version
    ) {
      fail(`fixture lock package ${path} uses an unreviewed script`);
    }
    const resolved = expectString(record.resolved, `fixture lock package ${path} resolved`);
    if (!resolved.startsWith('https://registry.npmjs.org/')) {
      fail(`fixture lock package ${path} is not pinned to the reviewed npm registry`);
    }
    assertSri512(expectString(record.integrity, `fixture lock package ${path} integrity`), path);
  }

  for (const [path, version] of REVIEWED_IGNORED_INSTALL_SCRIPT_PACKAGES) {
    const record = expectRecord(packages[path], `reviewed ignored-script package ${path}`);
    if (record.version !== version || record.hasInstallScript !== true) {
      fail(`fixture lock does not preserve the exact ignored-script authority for ${path}`);
    }
  }

  for (const [path, candidate] of Object.entries(packages)) {
    const record = expectRecord(candidate, `fixture lock package ${path || '<root>'}`);
    for (const field of ['dependencies', 'optionalDependencies'] as const) {
      if (record[field] === undefined) continue;
      const dependencyMap = expectRecord(record[field], `fixture lock ${path || '<root>'} ${field}`);
      for (const dependency of Object.keys(dependencyMap)) {
        if (!isCanonicalPackageName(dependency)) {
          fail(`fixture lock ${path || '<root>'} has an unsafe dependency name ${dependency}`);
        }
        if (!dependencyLockCandidates(path, dependency).some((entry) => packages[entry] !== undefined)) {
          fail(`fixture lock ${path || '<root>'} has an unresolved ${field} edge to ${dependency}`);
        }
      }
    }
  }
}

export function validateFixtureSources(): {
  readonly manifest: JsonValue;
  readonly manifestRaw: Buffer;
  readonly lock: JsonValue;
  readonly packageJson: JsonValue;
} {
  const manifestRaw = readRegularFileStable(
    fixtureManifestPath,
    undefined,
    'package-smoke fixture manifest',
    MAX_JSON_BYTES,
  );
  const manifest = strictJson(
    decodeUtf8Fatal(manifestRaw, 'package-smoke fixture manifest'),
    'package-smoke fixture manifest',
  );
  if (createHash('sha256').update(canonicalize(manifest)).digest('hex') !==
      EXPECTED_FIXTURE_MANIFEST_SHA256) {
    fail('package-smoke fixture manifest digest mismatch');
  }
  const lockRaw = readRegularFileStable(
    fixtureLockPath,
    undefined,
    'package-smoke fixture lock',
    MAX_JSON_BYTES,
  );
  const lock = strictJson(
    decodeUtf8Fatal(lockRaw, 'package-smoke fixture lock'),
    'package-smoke fixture lock',
  );
  if (createHash('sha256').update(canonicalize(lock)).digest('hex') !==
      EXPECTED_FIXTURE_LOCK_SHA256) {
    fail('package-smoke fixture lock digest mismatch');
  }
  const packageJson = readStrictJson(join(root, 'package.json'), 'Cortexel package.json');
  validatePackageSmokeFixture(manifest, lock, packageJson);
  return { manifest, manifestRaw, lock, packageJson };
}

function isInside(parent: string, candidate: string): boolean {
  const rel = relative(parent, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

export function readDirectoryNamesBounded(
  directoryPath: string,
  label: string,
  maximumEntries: number = PACKAGE_TARBALL_LIMITS.directoryEntries,
): string[] {
  if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 0 ||
      maximumEntries > MAX_TREE_ENTRIES) {
    fail(`${label} has an invalid directory-entry budget`);
  }
  const directory = opendirSync(directoryPath);
  const names: string[] = [];
  try {
    let child = directory.readSync();
    while (child !== null) {
      if (names.length >= maximumEntries) fail(`${label} exceeds its child-entry budget`);
      names.push(child.name);
      child = directory.readSync();
    }
  } finally {
    directory.closeSync();
  }
  return names;
}

function resolveExecutable(explicit: string | undefined, command: string, label: string): string {
  let candidate: string | undefined;
  if (explicit !== undefined) {
    if (!isAbsolute(explicit)) fail(`${label} must be an absolute path`);
    candidate = explicit;
  } else {
    const pathValue = process.env.PATH ?? '';
    const extensions = process.platform === 'win32'
      ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';')
      : [''];
    outer: for (const directory of pathValue.split(delimiter)) {
      if (!directory) continue;
      for (const extension of extensions) {
        const possible = join(directory, `${command}${extension.toLowerCase()}`);
        try {
          accessSync(possible, fsConstants.X_OK);
          candidate = possible;
          break outer;
        } catch {
          // Continue through the finite PATH search.
        }
      }
    }
  }
  if (candidate === undefined) fail(`${label} was not found`);
  const canonical = realpathSync(candidate);
  const stats = statSync(canonical);
  if (!stats.isFile()) fail(`${label} must resolve to a regular file`);
  if (process.platform !== 'win32') accessSync(canonical, fsConstants.X_OK);
  return canonical;
}

function resolveNpmCli(explicit: string | undefined): string {
  const resolved = resolveExecutable(explicit, 'npm', 'npm executable');
  if (basename(resolved) === 'npm-cli.js' && basename(dirname(resolved)) === 'bin') return resolved;
  fail('npm executable must resolve to the exact npm-cli.js entry point');
}

export function scrubbedEnvironment(
  nodeExecutable: string,
  source: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): NodeJS.ProcessEnv {
  if (!isAbsolute(nodeExecutable)) fail('reviewed Node environment path must be absolute');
  const environment: NodeJS.ProcessEnv = {};
  const inherited = new Map<string, string | undefined>();
  let systemRoot: string | undefined;
  if (platform === 'win32') {
    for (const [key, value] of Object.entries(source)) {
      const folded = key.toUpperCase();
      if (inherited.has(folded)) {
        fail(`Windows environment has a case-folded key collision at ${folded}`);
      }
      inherited.set(folded, value);
    }
    const declaredRoots = ['SYSTEMROOT', 'WINDIR']
      .map((name) => inherited.get(name))
      .filter((value): value is string => value !== undefined);
    if (declaredRoots.length === 0) {
      fail('Windows environment must declare one reviewed system root');
    }
    const normalizedRoots = declaredRoots.map((value) => {
      if (value.includes('\0') || !windowsPath.isAbsolute(value) || windowsPath.normalize(value) !== value) {
        fail('Windows system root must be one normalized absolute path');
      }
      return value;
    });
    systemRoot = normalizedRoots[0]!;
    if (normalizedRoots.some((value) => value.toUpperCase() !== systemRoot!.toUpperCase())) {
      fail('Windows SYSTEMROOT and WINDIR authorities disagree');
    }
    environment.SYSTEMROOT = systemRoot;
    environment.WINDIR = systemRoot;
  }
  const fixedSystemPaths = platform === 'win32'
    ? [systemRoot === undefined ? undefined : windowsPath.join(systemRoot, 'System32'), systemRoot]
    : ['/usr/bin', '/bin'];
  environment.PATH = fixedSystemPaths
    .filter((value): value is string => value !== undefined)
    .join(platform === 'win32' ? ';' : ':');
  environment.LANG = 'C';
  environment.LC_ALL = 'C';
  environment.NO_COLOR = '1';
  environment.TZ = 'UTC';
  return environment;
}

interface PackageSmokeOperationalPaths {
  readonly root: string;
  readonly home: string;
  readonly temporary: string;
  readonly npmCacheRoot: string;
  readonly executeDenied: string;
}

export interface PackageSmokeNpmConfigPaths {
  readonly userConfig: string;
  readonly globalConfig: string;
}

export interface PackageSmokeNpmCacheAuthority {
  readonly role: PackageSmokeNpmCacheRole;
  readonly path: string;
  readonly device: string;
  readonly inode: string;
  readonly mode: 0o700;
  readonly uid: number;
  readonly gid: number;
}

export type PackageSmokeNpmCacheAuthorities = Readonly<
  Record<PackageSmokeNpmCacheRole, PackageSmokeNpmCacheAuthority>
>;

function packageSmokeOperationalPaths(workspace: string): PackageSmokeOperationalPaths {
  const operationalRoot = join(workspace, 'operational');
  return {
    root: operationalRoot,
    home: join(operationalRoot, 'home'),
    temporary: join(operationalRoot, 'tmp'),
    npmCacheRoot: join(operationalRoot, 'npm-cache'),
    executeDenied: join(operationalRoot, 'execute-denied'),
  };
}

export function packageSmokeNpmCachePath(
  workspace: string,
  role: PackageSmokeNpmCacheRole,
): string {
  if (!PACKAGE_SMOKE_NPM_CACHE_ROLES.includes(role)) {
    fail('package-smoke npm cache role is outside the closed profile');
  }
  return join(packageSmokeOperationalPaths(workspace).npmCacheRoot, role);
}

function inspectPackageSmokeNpmCacheAuthority(
  workspace: string,
  role: PackageSmokeNpmCacheRole,
  label: string,
): PackageSmokeNpmCacheAuthority {
  const path = packageSmokeNpmCachePath(workspace, role);
  const stats = lstatSync(path, { bigint: true });
  const currentUid = process.getuid?.();
  if (
    currentUid === undefined ||
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    realpathSync(path) !== path ||
    Number(stats.mode & 0o7777n) !== 0o700 ||
    stats.uid !== BigInt(currentUid)
  ) {
    fail(`${label} npm cache is not one canonical current-UID mode-0700 directory`);
  }
  return Object.freeze({
    role,
    path,
    device: stats.dev.toString(10),
    inode: stats.ino.toString(10),
    mode: 0o700,
    uid: portableUnsignedBigInt(stats.uid, `${label} npm cache uid`),
    gid: portableUnsignedBigInt(stats.gid, `${label} npm cache gid`),
  });
}

export function inspectPackageSmokeNpmCacheAuthorities(
  workspace: string,
  label: string,
): PackageSmokeNpmCacheAuthorities {
  return Object.freeze(Object.fromEntries(PACKAGE_SMOKE_NPM_CACHE_ROLES.map((role) => [
    role,
    inspectPackageSmokeNpmCacheAuthority(workspace, role, `${label} ${role}`),
  ])) as unknown as PackageSmokeNpmCacheAuthorities);
}

export function assertPackageSmokeNpmCacheIdentity(
  activePath: string | undefined,
  expected: PackageSmokeNpmCacheAuthority,
  label: string,
): void {
  if (activePath !== expected.path) {
    fail(`${label} npm cache identity changed`);
  }
  const npmCacheRoot = dirname(expected.path);
  const operationalRoot = dirname(npmCacheRoot);
  const workspace = dirname(operationalRoot);
  if (
    npmCacheRoot !== join(operationalRoot, 'npm-cache') ||
    operationalRoot !== join(workspace, 'operational') ||
    expected.path !== packageSmokeNpmCachePath(workspace, expected.role)
  ) {
    fail(`${label} npm cache authority has an invalid workspace ancestry`);
  }
  const observed = inspectPackageSmokeNpmCacheAuthority(
    workspace,
    expected.role,
    label,
  );
  if (!exactJsonEqual(observed, expected)) {
    fail(`${label} npm cache authority changed`);
  }
}

function inspectPackageSmokeNpmCacheWorkspaceBinding(
  workspace: string,
  label: string,
): PackageSmokeNpmCacheWorkspaceBinding {
  if (!isAbsolute(workspace) || realpathSync(workspace) !== workspace) {
    fail(`${label} workspace is not one canonical physical absolute directory`);
  }
  const stats = lstatSync(workspace, { bigint: true });
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    fail(`${label} workspace is not one canonical physical absolute directory`);
  }
  return Object.freeze({
    path: workspace,
    device: stats.dev.toString(10),
    inode: stats.ino.toString(10),
    mode: Number(stats.mode & 0o7777n),
    uid: portableUnsignedBigInt(stats.uid, `${label} workspace uid`),
    gid: portableUnsignedBigInt(stats.gid, `${label} workspace gid`),
    parentAncestry: inspectRuntimePathAncestry(workspace, `${label} workspace`),
  });
}

function assertClosedPackageSmokeNpmCacheRole(
  role: PackageSmokeNpmCacheRole,
): void {
  if (!PACKAGE_SMOKE_NPM_CACHE_ROLES.includes(role)) {
    fail('package-smoke npm cache role is outside the closed profile');
  }
}

function copyPackageSmokeNpmCacheAuthorities(
  authorities: PackageSmokeNpmCacheAuthorities,
): PackageSmokeNpmCacheAuthorities {
  return Object.freeze(Object.fromEntries(PACKAGE_SMOKE_NPM_CACHE_ROLES.map((role) => {
    const authority = authorities[role];
    if (authority === undefined || authority.role !== role) {
      fail('package-smoke npm cache authorities do not cover the closed role profile');
    }
    return [role, Object.freeze({ ...authority })];
  })) as unknown as PackageSmokeNpmCacheAuthorities);
}

/**
 * Opens the one prepare-local first-use ledger. Emptiness is deliberately not
 * inspected here: each role proves it exactly once at its command-adjacent cold
 * activation, after every controlling identity has been rebound.
 */
export function beginPackageSmokeNpmCacheSession(
  workspace: string,
  authorities: PackageSmokeNpmCacheAuthorities,
): void {
  if (packageSmokeNpmCacheSession !== undefined) {
    fail('package-smoke npm cache session is already active');
  }
  const workspaceBinding = inspectPackageSmokeNpmCacheWorkspaceBinding(
    workspace,
    'new package-smoke npm cache session',
  );
  const capturedAuthorities = copyPackageSmokeNpmCacheAuthorities(authorities);
  const roles = Object.fromEntries(PACKAGE_SMOKE_NPM_CACHE_ROLES.map((role) => {
    const authority = capturedAuthorities[role];
    if (authority.path !== packageSmokeNpmCachePath(workspace, role)) {
      fail(`new package-smoke ${role} npm cache path differs from its workspace role`);
    }
    assertPackageSmokeNpmCacheIdentity(
      authority.path,
      authority,
      `new package-smoke ${role}`,
    );
    return [role, {
      authority,
      ancestry: inspectRuntimePathAncestry(
        authority.path,
        `new package-smoke ${role} npm cache`,
      ),
      state: 'unused' as const,
    }];
  })) as Record<PackageSmokeNpmCacheRole, PackageSmokeNpmCacheRoleBinding>;
  const reboundWorkspace = inspectPackageSmokeNpmCacheWorkspaceBinding(
    workspace,
    'rebound package-smoke npm cache session',
  );
  if (!exactJsonEqual(reboundWorkspace, workspaceBinding)) {
    fail('package-smoke npm cache workspace changed while its session was captured');
  }
  packageSmokeNpmCacheSession = {
    workspace: workspaceBinding,
    authorities: capturedAuthorities,
    roles,
  };
}

export function resetPackageSmokeNpmCacheSession(): void {
  packageSmokeNpmCacheSession = undefined;
}

function activePackageSmokeNpmCacheSession(
  authorities: PackageSmokeNpmCacheAuthorities,
  label: string,
): PackageSmokeNpmCacheSession {
  const session = packageSmokeNpmCacheSession;
  if (session === undefined) fail(`${label} has no active package-smoke npm cache session`);
  if (!exactJsonEqual(authorities, session.authorities)) {
    fail(`${label} npm cache authorities differ from the captured session`);
  }
  const workspace = inspectPackageSmokeNpmCacheWorkspaceBinding(
    session.workspace.path,
    label,
  );
  if (!exactJsonEqual(workspace, session.workspace)) {
    fail(`${label} npm cache workspace authority changed`);
  }
  return session;
}

function assertPackageSmokeNpmCacheRoleBinding(
  session: PackageSmokeNpmCacheSession,
  role: PackageSmokeNpmCacheRole,
  label: string,
): PackageSmokeNpmCacheRoleBinding {
  assertClosedPackageSmokeNpmCacheRole(role);
  const binding = session.roles[role];
  const expected = binding.authority;
  if (
    expected.role !== role ||
    expected.path !== packageSmokeNpmCachePath(session.workspace.path, role)
  ) {
    fail(`${label} npm cache role or path differs from the captured session`);
  }
  const ancestry = inspectRuntimePathAncestry(expected.path, `${label} npm cache`);
  if (!exactJsonEqual(ancestry, binding.ancestry)) {
    fail(`${label} npm cache ancestry changed`);
  }
  assertPackageSmokeNpmCacheIdentity(expected.path, expected, label);
  return binding;
}

function assertPackageSmokeNpmCacheExactlyEmpty(
  path: string,
  label: string,
): void {
  // bufferSize=1 plus one read prevents a seeded directory from inducing an
  // unbounded inventory. Dirent type is irrelevant; a FIFO is named, never opened.
  const directory = opendirSync(path, { bufferSize: 1 });
  try {
    if (directory.readSync() !== null) {
      fail(`${label} npm cache is not empty at its unique cold activation`);
    }
  } finally {
    directory.closeSync();
  }
}

export function activatePackageSmokeNpmCache(
  environment: NodeJS.ProcessEnv,
  authorities: PackageSmokeNpmCacheAuthorities,
  role: PackageSmokeNpmCacheRole,
  label: string,
): void {
  const session = activePackageSmokeNpmCacheSession(authorities, label);
  const binding = assertPackageSmokeNpmCacheRoleBinding(session, role, label);
  if (binding.state !== 'unused') {
    fail(`${label} npm cache cold activation requires the unused role state`);
  }
  for (const otherRole of PACKAGE_SMOKE_NPM_CACHE_ROLES) {
    if (otherRole !== role && session.roles[otherRole].state === 'active') {
      fail(`${label} cannot activate while npm cache role ${otherRole} remains active`);
    }
  }
  assertPackageSmokeNpmCacheExactlyEmpty(binding.authority.path, label);
  assertPackageSmokeNpmCacheRoleBinding(session, role, `${label} post-empty`);
  environment.npm_config_cache = binding.authority.path;
  assertPackageSmokeNpmCacheIdentity(
    environment.npm_config_cache,
    binding.authority,
    `${label} active environment`,
  );
  assertPackageSmokeNpmCacheRoleBinding(session, role, `${label} pre-activation`);
  binding.environment = environment;
  binding.state = 'active';
}

export function assertPackageSmokeNpmCacheRoleActive(
  environment: NodeJS.ProcessEnv,
  authorities: PackageSmokeNpmCacheAuthorities,
  role: PackageSmokeNpmCacheRole,
  label: string,
): void {
  const session = activePackageSmokeNpmCacheSession(authorities, label);
  const binding = assertPackageSmokeNpmCacheRoleBinding(session, role, label);
  if (binding.state !== 'active' || binding.environment !== environment) {
    fail(`${label} npm cache role is not active in the captured environment`);
  }
  assertPackageSmokeNpmCacheIdentity(
    environment.npm_config_cache,
    binding.authority,
    label,
  );
}

export function completePackageSmokeNpmCacheRole(
  environment: NodeJS.ProcessEnv,
  authorities: PackageSmokeNpmCacheAuthorities,
  role: PackageSmokeNpmCacheRole,
  label: string,
): void {
  assertPackageSmokeNpmCacheRoleActive(environment, authorities, role, label);
  packageSmokeNpmCacheSession!.roles[role].state = 'complete';
}

function assertPackageSmokeNpmCacheSessionComplete(
  authorities: PackageSmokeNpmCacheAuthorities,
): void {
  const session = activePackageSmokeNpmCacheSession(
    authorities,
    'completed package-smoke npm cache session',
  );
  for (const role of PACKAGE_SMOKE_NPM_CACHE_ROLES) {
    if (session.roles[role].state !== 'complete') {
      fail(`package-smoke npm cache role ${role} did not reach complete`);
    }
  }
}

function createPackageSmokeOperationalDirectories(
  workspace: string,
): PackageSmokeNpmCacheAuthorities {
  const paths = packageSmokeOperationalPaths(workspace);
  mkdirSync(paths.root, { mode: 0o700 });
  chmodSync(paths.root, 0o700);
  for (const path of [paths.home, paths.temporary, paths.npmCacheRoot]) {
    mkdirSync(path, { mode: 0o700 });
    chmodSync(path, 0o700);
  }
  for (const role of PACKAGE_SMOKE_NPM_CACHE_ROLES) {
    const path = packageSmokeNpmCachePath(workspace, role);
    mkdirSync(path, { mode: 0o700 });
    chmodSync(path, 0o700);
  }
  writeFileSync(paths.executeDenied, 'not-a-directory\n', { flag: 'wx', mode: 0o444 });
  chmodSync(paths.executeDenied, 0o444);
  return inspectPackageSmokeNpmCacheAuthorities(workspace, 'new package-smoke');
}

function assertPackageSmokeOperationalDirectories(workspace: string): void {
  const paths = packageSmokeOperationalPaths(workspace);
  const npmCaches = PACKAGE_SMOKE_NPM_CACHE_ROLES.map((role) =>
    packageSmokeNpmCachePath(workspace, role));
  for (const path of [
    paths.root,
    paths.home,
    paths.temporary,
    paths.npmCacheRoot,
    ...npmCaches,
  ]) {
    const stats = lstatSync(path);
    if (!stats.isDirectory() || stats.isSymbolicLink() || realpathSync(path) !== path) {
      fail(`package-smoke operational path is not a canonical real directory: ${path}`);
    }
    if (!isInside(workspace, path)) fail('package-smoke operational path escapes the workspace');
  }
  const deniedStats = lstatSync(paths.executeDenied);
  if (!deniedStats.isFile() || deniedStats.isSymbolicLink() || deniedStats.nlink !== 1) {
    fail('package-smoke execute-denied anchor is not a unique regular file');
  }
  const deniedBytes = readRegularFileStable(
    paths.executeDenied,
    deniedStats.size,
    'package-smoke execute-denied anchor',
    64,
  );
  if (!deniedBytes.equals(Buffer.from('not-a-directory\n'))) {
    fail('package-smoke execute-denied anchor bytes changed');
  }
}

function assertPackageSmokeNpmConfigAuthority(
  paths: PackageSmokeNpmConfigPaths,
  label: string,
): void {
  const workspace = dirname(paths.userConfig);
  if (
    paths.userConfig !== join(workspace, 'npm-userconfig') ||
    paths.globalConfig !== join(workspace, 'npm-globalconfig')
  ) {
    fail(`${label} paths differ from their closed workspace locations`);
  }
  assertPackageSmokeOperationalDirectories(workspace);
  readExactIntentFile(
    paths.userConfig,
    NPM_USER_CONFIG_SOURCE,
    0o600,
    `${label} user config`,
  );
  readExactIntentFile(
    paths.globalConfig,
    NPM_GLOBAL_CONFIG_SOURCE,
    0o600,
    `${label} global config`,
  );
}

export function createPackageSmokeNpmConfigFiles(
  workspace: string,
): PackageSmokeNpmConfigPaths {
  if (
    !isAbsolute(workspace) ||
    realpathSync(workspace) !== workspace ||
    !lstatSync(workspace).isDirectory()
  ) {
    fail('package-smoke npm config workspace must be one canonical real directory');
  }
  const paths = {
    userConfig: join(workspace, 'npm-userconfig'),
    globalConfig: join(workspace, 'npm-globalconfig'),
  };
  writeFileSync(paths.userConfig, NPM_USER_CONFIG_SOURCE, {
    flag: 'wx',
    mode: 0o600,
  });
  writeFileSync(paths.globalConfig, NPM_GLOBAL_CONFIG_SOURCE, {
    flag: 'wx',
    mode: 0o600,
  });
  // An arbitrary caller umask may remove requested bits. Normalize only after
  // exclusive owner-only creation, so no permissive-umask write window exists.
  chmodSync(paths.userConfig, 0o600);
  chmodSync(paths.globalConfig, 0o600);
  assertPackageSmokeNpmConfigAuthority(paths, 'new package-smoke npm config');
  return Object.freeze(paths);
}

export function assertPackageSmokeNpmConfigIdentity(
  active: PackageSmokeNpmConfigPaths,
  expected: PackageSmokeNpmConfigPaths,
  label: string,
): void {
  if (
    active.userConfig !== expected.userConfig ||
    active.globalConfig !== expected.globalConfig
  ) {
    fail(`${label} npm configuration identity changed`);
  }
  assertPackageSmokeNpmConfigAuthority(active, label);
}

export function assertPackageSmokeProjectNpmConfigAbsent(
  cwd: string,
  label: string,
): void {
  const projectConfig = join(cwd, '.npmrc');
  try {
    lstatSync(projectConfig);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    fail(`${label} project npm configuration absence could not be established`);
  }
  fail(`${label} project npm configuration must be absent`);
}

function assertActivePackageSmokeNpmConfigAuthority(label: string): void {
  const environment = activeCommandEnvironment();
  const userConfig = environment.npm_config_userconfig;
  const globalConfig = environment.npm_config_globalconfig;
  if (userConfig === undefined || globalConfig === undefined) {
    fail(`${label} has incomplete npm configuration authority`);
  }
  assertPackageSmokeNpmConfigAuthority({ userConfig, globalConfig }, label);
}

export function assertPackageMaterializationInputAuthority(options: {
  readonly artifact: Buffer;
  readonly artifactPath: string;
  readonly artifactIntegrity: string;
  readonly consumer: string;
  readonly exactFixtureLockRaw: Buffer;
  readonly exactFixtureManifestRaw: Buffer;
  readonly npmConfigs: PackageSmokeNpmConfigPaths;
  readonly npmCacheAuthority: PackageSmokeNpmCacheAuthority;
  readonly label: string;
}): void {
  assertSri512(options.artifactIntegrity, `${options.label} artifact integrity`);
  if (sha512Integrity(options.artifact) !== options.artifactIntegrity) {
    fail(`${options.label} artifact bytes differ from their integrity`);
  }
  readExactIntentFile(
    options.artifactPath,
    options.artifact,
    0o644,
    `${options.label} source tarball`,
  );
  assertPackageSmokeProjectNpmConfigAbsent(options.consumer, options.label);
  assertPackageSmokeNpmConfigAuthority(options.npmConfigs, `${options.label} npm config`);
  assertPackageSmokeNpmCacheIdentity(
    options.npmCacheAuthority.path,
    options.npmCacheAuthority,
    `${options.label} npm cache`,
  );
  readExactIntentFile(
    join(options.consumer, 'package.json'),
    options.exactFixtureManifestRaw,
    0o644,
    `${options.label} fixture manifest`,
  );
  readExactIntentFile(
    join(options.consumer, 'package-lock.json'),
    options.exactFixtureLockRaw,
    0o644,
    `${options.label} fixture lock`,
  );
  readExactIntentFile(
    join(options.consumer, LOCAL_TARBALL_FILENAME),
    options.artifact,
    0o644,
    `${options.label} local tarball`,
  );
}

export function packageSmokeEnvironment(
  nodeExecutable: string,
  workspace: string,
  source: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  phase: SmokePhase = 'prepare',
): NodeJS.ProcessEnv {
  if (!isAbsolute(workspace)) fail('package-smoke environment workspace must be absolute');
  const environment = scrubbedEnvironment(nodeExecutable, source, platform);
  const paths = packageSmokeOperationalPaths(workspace);
  const home = phase === 'prepare' ? paths.home : join(paths.executeDenied, 'home');
  const temporary = phase === 'prepare' ? paths.temporary : join(paths.executeDenied, 'tmp');
  const npmCache = phase === 'prepare'
    ? packageSmokeNpmCachePath(workspace, 'control')
    : join(paths.executeDenied, 'npm-cache');
  environment.HOME = home;
  environment.TMPDIR = temporary;
  environment.TMP = temporary;
  environment.TEMP = temporary;
  environment.npm_config_cache = npmCache;
  environment.npm_config_strict_ssl = 'true';
  environment.npm_config_registry = 'https://registry.npmjs.org/';
  // Ambient CA files and system-CA opt-ins are authority-bearing mutable paths;
  // omitting all of them leaves the reviewed Node default CA set in force.
  return environment;
}

function executableVersion(executable: string, label: string): string {
  const value = run(
    executable,
    ['--version'],
    root,
    PACKAGE_SMOKE_COMMAND_POLICIES.nodeVersion,
  );
  if (!/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value)) {
    fail(`${label} returned an invalid version`);
  }
  return value;
}

function nodeRuntimeIdentity(nodeExecutable: string): NodeRuntimeIdentity {
  const output = run(
    nodeExecutable,
    [
      '--input-type=module',
      '--eval',
      'process.stdout.write(JSON.stringify({arch:process.arch,platform:process.platform}))',
    ],
    root,
    PACKAGE_SMOKE_COMMAND_POLICIES.nodeRuntimeIdentity,
  );
  const record = expectRecord(
    strictJson(output, 'reviewed Node runtime identity'),
    'reviewed Node runtime identity',
  );
  exactKeys(record, ['arch', 'platform'], 'reviewed Node runtime identity');
  const platform = expectString(record.platform, 'reviewed Node platform');
  const arch = expectString(record.arch, 'reviewed Node architecture');
  if (
    (platform !== 'darwin' && platform !== 'linux') ||
    !/^[a-z0-9][a-z0-9_-]{0,31}$/u.test(arch)
  ) {
    fail('reviewed Node runtime identity is outside the supported POSIX domain');
  }
  if (platform !== process.platform) {
    fail('reviewed Node platform differs from the supervising host platform');
  }
  return Object.freeze({ platform, arch });
}

export function assertPreparedNodeRuntimeIdentity(
  observed: NodeRuntimeIdentity,
  expected: NodeRuntimeIdentity,
  label: string,
): void {
  if (observed.platform !== expected.platform || observed.arch !== expected.arch) {
    fail(`${label} Node runtime identity changed`);
  }
}

function nodeCliVersion(nodeExecutable: string, cli: string, label: string): string {
  const value = runNpmCommand(
    nodeExecutable,
    cli,
    ['--version'],
    root,
    PACKAGE_SMOKE_COMMAND_POLICIES.npmVersion,
  );
  if (!/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value)) {
    fail(`${label} returned an invalid version`);
  }
  return value;
}

function npmCacheRoleForCommandPolicy(
  policy: PackageSmokeCommandPolicy,
): PackageSmokeNpmCacheRole {
  if (
    policy === PACKAGE_SMOKE_COMMAND_POLICIES.npmVersion ||
    policy === PACKAGE_SMOKE_COMMAND_POLICIES.npmPack
  ) {
    return 'control';
  }
  if (policy === PACKAGE_SMOKE_COMMAND_POLICIES.npmCiCore) return 'core';
  if (policy === PACKAGE_SMOKE_COMMAND_POLICIES.npmCiCharts) return 'charts';
  if (policy === PACKAGE_SMOKE_COMMAND_POLICIES.npmCiFull) return 'full';
  fail('npm command policy has no closed cache identity');
}

function runNpmCommand(
  nodeExecutable: string,
  npmExecutable: string,
  args: string[],
  cwd: string,
  policy: PackageSmokeCommandPolicy,
): string {
  assertClosedPackageSmokeCommandPolicy(policy);
  const expected = commandRuntimeAuthority;
  if (expected === undefined) fail('npm command runtime authority is not initialized');
  if (expected.node.executable !== nodeExecutable || expected.npm.cli !== npmExecutable) {
    fail('npm command differs from its reviewed runtime authority');
  }
  const npmCacheAuthorities = commandNpmCacheAuthorities;
  if (npmCacheAuthorities === undefined) {
    fail('npm command cache authority is not initialized');
  }
  const npmCacheRole = npmCacheRoleForCommandPolicy(policy);
  const npmCacheAuthority = npmCacheAuthorities[npmCacheRole];
  const assertNpm = (phase: string): void => {
    assertPackageSmokeNpmCacheRoleActive(
      activeCommandEnvironment(),
      npmCacheAuthorities,
      npmCacheRole,
      `${phase} ${npmCacheRole}`,
    );
    const observed = inspectNpmPackageAuthority(npmExecutable);
    if (!exactJsonEqual(observed, expected.npm)) {
      fail(`${phase} npm package authority changed`);
    }
    assertPackageSmokeProjectNpmConfigAbsent(cwd, `${phase} npm command`);
    assertActivePackageSmokeNpmConfigAuthority(`${phase} npm configuration`);
    assertPackageSmokeNpmCacheIdentity(
      activeCommandEnvironment().npm_config_cache,
      npmCacheAuthority,
      `${phase} ${npmCacheRole}`,
    );
  };
  assertNpm('pre-command');
  try {
    return run(nodeExecutable, [npmExecutable, ...args], cwd, policy);
  } finally {
    assertNpm('post-command');
  }
}

function assertSupportedNodeVersion(version: string): void {
  const major = Number.parseInt(version.replace(/^v/u, '').split('.')[0] ?? '', 10);
  if (!SUPPORTED_NODE_MAJORS.has(major)) {
    fail(`package smoke requires Node 22, 24, or 26; received ${version}`);
  }
}

function assertEmptyWorkspace(workspace: string): void {
  if (!isAbsolute(workspace)) fail('workspace must be an absolute path');
  if (existsSync(workspace)) {
    const stats = lstatSync(workspace);
    if (!stats.isDirectory() || stats.isSymbolicLink()) fail('workspace must be a real directory');
    if (readDirectoryNamesBounded(workspace, 'package-smoke workspace', 1).length !== 0) {
      fail('workspace must be absent or empty');
    }
  } else {
    mkdirSync(workspace, { recursive: true, mode: 0o755 });
  }
  const canonical = realpathSync(workspace);
  if (canonical !== workspace) fail('workspace must already be canonical');
}

function canonicalWorkspacePath(candidate: string): string {
  const absolute = resolve(candidate);
  if (existsSync(absolute)) return realpathSync(absolute);
  return join(realpathSync(dirname(absolute)), basename(absolute));
}

function normalizePackResult(value: JsonValue, tarball: Buffer): PackedResult {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    fail('npm pack did not return exactly one package record');
  }
  const record = value[0];
  exactKeys(
    record,
    [
      'id',
      'name',
      'version',
      'size',
      'unpackedSize',
      'shasum',
      'integrity',
      'filename',
      'files',
      'entryCount',
      'bundled',
    ],
    'npm pack record',
  );
  const filesValue = record.files;
  if (!Array.isArray(filesValue) || filesValue.length === 0 ||
      filesValue.length > PACKAGE_TARBALL_LIMITS.entries) {
    fail('npm pack returned an invalid file inventory');
  }
  const files: PackedFile[] = [];
  const seen = new Set<string>();
  for (const [index, candidate] of filesValue.entries()) {
    const file = expectRecord(candidate, `npm pack file ${index}`);
    exactKeys(file, ['path', 'size', 'mode'], `npm pack file ${index}`);
    const path = expectString(file.path, `npm pack file ${index} path`);
    assertCanonicalArtifactPath(path, `npm pack file ${index} path`);
    if (
      seen.has(path)
    ) {
      fail(`npm pack returned an unsafe or duplicate path ${path}`);
    }
    seen.add(path);
    files.push({
      path,
      size: expectInteger(file.size, `npm pack file ${path} size`),
      mode: expectInteger(file.mode, `npm pack file ${path} mode`),
    });
  }
  const integrity = expectString(record.integrity, 'npm pack integrity');
  assertSri512(integrity, 'npm pack integrity');
  if (integrity !== sha512Integrity(tarball)) fail('npm pack integrity differs from the tarball bytes');
  const name = expectString(record.name, 'npm pack name');
  const version = expectString(record.version, 'npm pack version');
  const size = expectInteger(record.size, 'npm pack size');
  const unpackedSize = expectInteger(record.unpackedSize, 'npm pack unpacked size');
  const entryCount = expectInteger(record.entryCount, 'npm pack entry count');
  const shasum = expectString(record.shasum, 'npm pack shasum');
  const filename = expectString(record.filename, 'npm pack filename');
  if (record.id !== `${name}@${version}` || size !== tarball.byteLength ||
      entryCount !== files.length || !Array.isArray(record.bundled) || record.bundled.length !== 0 ||
      !/^[0-9a-f]{40}$/u.test(shasum) || filename !== `cortexel-${version}.tgz`) {
    fail('npm pack metadata is internally inconsistent');
  }
  return {
    name,
    version,
    size,
    unpackedSize,
    shasum,
    integrity,
    filename,
    files,
    entryCount,
  };
}

function writeCanonicalJson(path: string, value: unknown, mode = 0o644): string {
  const raw = `${canonicalize(value)}\n`;
  writeFileSync(path, raw, { encoding: 'utf8', flag: 'wx', mode });
  return raw;
}

interface PackageSmokeStateReservation {
  readonly path: string;
  readonly descriptor: number;
  readonly initial: BigIntStats;
  closed: boolean;
}

function samePinnedFileIdentity(initial: BigIntStats, observed: BigIntStats): boolean {
  return (
    initial.dev === observed.dev &&
    initial.ino === observed.ino &&
    initial.nlink === observed.nlink &&
    initial.uid === observed.uid &&
    initial.gid === observed.gid &&
    initial.birthtimeNs === observed.birthtimeNs
  );
}

function assertPinnedStateFile(
  reservation: PackageSmokeStateReservation,
  expectedSize: number,
  expectedMode: 0o444 | 0o600,
  label: string,
): void {
  if (reservation.closed) fail(`${label} descriptor is already closed`);
  if (realpathSync(reservation.path) !== reservation.path) {
    fail(`${label} path is no longer canonical and physical`);
  }
  const before = fstatSync(reservation.descriptor, { bigint: true });
  const pathStats = lstatSync(reservation.path, { bigint: true });
  const after = fstatSync(reservation.descriptor, { bigint: true });
  if (
    !before.isFile() || before.isSymbolicLink() || before.nlink !== 1n ||
    !pathStats.isFile() || pathStats.isSymbolicLink() || pathStats.nlink !== 1n ||
    !sameRuntimeStat(before, pathStats) || !sameRuntimeStat(before, after) ||
    !samePinnedFileIdentity(reservation.initial, before) ||
    before.size !== BigInt(expectedSize) || Number(before.mode & 0o7777n) !== expectedMode
  ) {
    fail(`${label} descriptor or pathname authority changed`);
  }
}

function fsyncDirectoryStable(path: string, label: string): void {
  if (realpathSync(path) !== path) fail(`${label} must be one canonical physical directory`);
  const initial = lstatSync(path, { bigint: true });
  if (!initial.isDirectory() || initial.isSymbolicLink()) {
    fail(`${label} must be one physical directory`);
  }
  const descriptor = openSync(
    path,
    EXPECTED_DIRECTORY_READ_FLAGS,
  );
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isDirectory() || !sameRuntimeStat(initial, opened)) {
      fail(`${label} changed before its directory entry could be synchronized`);
    }
    fsyncSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const rebound = lstatSync(path, { bigint: true });
    if (!sameRuntimeStat(opened, after) || !sameRuntimeStat(opened, rebound)) {
      fail(`${label} changed while its directory entry was synchronized`);
    }
  } finally {
    closeSync(descriptor);
  }
}

export function reservePackageSmokeStateFile(workspace: string): PackageSmokeStateReservation {
  if (process.platform === 'win32') {
    fail('package-smoke state reservation currently requires POSIX descriptor semantics');
  }
  if (!isAbsolute(workspace) || realpathSync(workspace) !== workspace) {
    fail('package-smoke state workspace must be one canonical physical absolute directory');
  }
  const statePath = join(workspace, STATE_FILENAME);
  const descriptor = openSync(
    statePath,
    fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    fchmodSync(descriptor, 0o600);
    const initial = fstatSync(descriptor, { bigint: true });
    const reservation: PackageSmokeStateReservation = {
      path: statePath,
      descriptor,
      initial,
      closed: false,
    };
    assertPinnedStateFile(reservation, 0, 0o600, 'reserved package-smoke state');
    fsyncSync(descriptor);
    fsyncDirectoryStable(workspace, 'package-smoke state parent');
    assertPinnedStateFile(reservation, 0, 0o600, 'reserved package-smoke state');
    return reservation;
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

export function publishPackageSmokeStateFile(
  reservation: PackageSmokeStateReservation,
  value: unknown,
): string {
  const raw = `${canonicalize(value)}\n`;
  const intended = Buffer.from(raw, 'utf8');
  if (intended.byteLength < 1 || intended.byteLength > MAX_JSON_BYTES) {
    fail('canonical package-smoke state exceeds its byte budget');
  }
  assertPinnedStateFile(reservation, 0, 0o444, 'reserved package-smoke state');
  let offset = 0;
  while (offset < intended.byteLength) {
    const written = writeSync(
      reservation.descriptor,
      intended,
      offset,
      intended.byteLength - offset,
      offset,
    );
    if (written <= 0) fail('canonical package-smoke state ended before publication completed');
    offset += written;
  }
  fchmodSync(reservation.descriptor, 0o444);
  fsyncSync(reservation.descriptor);
  assertPinnedStateFile(
    reservation,
    intended.byteLength,
    0o444,
    'published package-smoke state',
  );
  const observed = Buffer.allocUnsafe(intended.byteLength);
  offset = 0;
  while (offset < observed.byteLength) {
    const count = readSync(
      reservation.descriptor,
      observed,
      offset,
      observed.byteLength - offset,
      offset,
    );
    if (count <= 0) fail('published package-smoke state ended before its declared size');
    offset += count;
  }
  if (!observed.equals(intended)) fail('published package-smoke state bytes differ from intent');
  readExactIntentFile(
    reservation.path,
    intended,
    0o444,
    'published package-smoke state',
  );
  fsyncDirectoryStable(dirname(reservation.path), 'package-smoke state parent');
  assertPinnedStateFile(
    reservation,
    intended.byteLength,
    0o444,
    'published package-smoke state',
  );
  return raw;
}

export function closePackageSmokeStateFile(reservation: PackageSmokeStateReservation): void {
  if (reservation.closed) return;
  closeSync(reservation.descriptor);
  reservation.closed = true;
}

export function inspectPreparedStateFileAuthority(
  workspace: string,
  expectedStateDigest: string,
): RuntimeFileAuthority {
  const statePath = join(workspace, STATE_FILENAME);
  const authority = inspectRuntimeRegularFile(
    statePath,
    MAX_JSON_BYTES,
    'prepared package-smoke state authority',
  );
  const workspaceStats = lstatSync(workspace, { bigint: true });
  if (
    authority.mode !== 0o444 ||
    authority.uid !== portableUnsignedBigInt(workspaceStats.uid, 'workspace root uid') ||
    authority.gid !== portableUnsignedBigInt(workspaceStats.gid, 'workspace root gid')
  ) {
    fail('prepared package-smoke state must retain exact 0444 workspace-owner authority');
  }
  if (authority.sha256 !== expectedStateDigest) {
    fail('prepared-state authority digest differs from the prepare output');
  }
  return authority;
}

function assertPreparedStateFileAuthority(
  workspace: string,
  expectedStateDigest: string,
  expectedAuthority: RuntimeFileAuthority,
  label: string,
): void {
  const observed = inspectPreparedStateFileAuthority(workspace, expectedStateDigest);
  if (!exactJsonEqual(observed, expectedAuthority)) {
    fail(`${label} prepared-state file authority changed`);
  }
}

function readRegularFileStable(
  path: string,
  expectedSize: number | undefined,
  label = 'workspace file',
  maxBytes = MAX_WORKSPACE_FILE_BYTES,
  trustedTestHook?: PackageSmokeRegularFileTestHook,
): Buffer {
  const pathBefore = lstatSync(path);
  if (!pathBefore.isFile()) fail(`${label} must be a regular file`);
  if (pathBefore.nlink !== 1) fail(`${label} must not be hard-linked`);
  if (expectedSize !== undefined && pathBefore.size !== expectedSize) {
    fail(`${label} changed before it could be read`);
  }
  if (pathBefore.size > maxBytes) fail(`${label} exceeds its byte budget`);
  const descriptor = openExpectedRegularFileAfterReview(path, label, trustedTestHook);
  try {
    const before = fstatSync(descriptor);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.dev !== pathBefore.dev ||
      before.ino !== pathBefore.ino ||
      before.size !== pathBefore.size ||
      before.mode !== pathBefore.mode ||
      before.nlink !== pathBefore.nlink ||
      before.uid !== pathBefore.uid ||
      before.gid !== pathBefore.gid ||
      before.birthtimeMs !== pathBefore.birthtimeMs
    ) {
      fail(`${label} changed before it could be read`);
    }
    trustedTestHook?.(Object.freeze({
      phase: 'regular-file-reviewed-after-fstat-before-read',
      path,
      label,
      reviewedSize: before.size,
      maximumBytes: maxBytes,
    }));

    // Allocate only the descriptor size reviewed above. A descriptor-wide
    // read can follow concurrent growth and allocate attacker-controlled bytes
    // beyond the preflight cap before the final identity check gets a chance to
    // reject them.
    const raw = Buffer.allocUnsafe(before.size);
    let offset = 0;
    while (offset < before.size) {
      const count = readSync(
        descriptor,
        raw,
        offset,
        before.size - offset,
        offset,
      );
      if (count <= 0) fail(`${label} ended before its declared size`);
      offset += count;
    }
    const overflowProbe = Buffer.allocUnsafe(1);
    const overflowCount = readSync(descriptor, overflowProbe, 0, 1, before.size);
    if (overflowCount !== 0) {
      fail(`${label} grew beyond its declared size while it was being read`);
    }
    const after = fstatSync(descriptor);
    const pathAfter = lstatSync(path);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      before.mode !== after.mode ||
      before.nlink !== after.nlink ||
      before.uid !== after.uid ||
      before.gid !== after.gid ||
      before.birthtimeMs !== after.birthtimeMs ||
      raw.byteLength !== before.size ||
      !pathAfter.isFile() ||
      pathAfter.nlink !== 1 ||
      pathAfter.dev !== before.dev ||
      pathAfter.ino !== before.ino ||
      pathAfter.size !== before.size ||
      pathAfter.mtimeMs !== before.mtimeMs ||
      pathAfter.ctimeMs !== before.ctimeMs ||
      pathAfter.mode !== before.mode ||
      pathAfter.uid !== before.uid ||
      pathAfter.gid !== before.gid ||
      pathAfter.birthtimeMs !== before.birthtimeMs
    ) {
      fail(`${label} changed while it was being read`);
    }
    return raw;
  } finally {
    closeSync(descriptor);
  }
}

function readExactIntentFile(
  path: string,
  expectedValue: string | Buffer,
  expectedMode: 0o444 | 0o600 | 0o644,
  label: string,
  trustedTestHook?: PackageSmokeRegularFileTestHook,
): Buffer {
  if (!isAbsolute(path) || realpathSync(path) !== path) {
    fail(`${label} must be a canonical absolute regular path`);
  }
  const expected = typeof expectedValue === 'string'
    ? Buffer.from(expectedValue, 'utf8')
    : expectedValue;
  if (expected.byteLength > MAX_WORKSPACE_FILE_BYTES) fail(`${label} exceeds its byte budget`);
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
    fail(`${label} must be a unique real regular file`);
  }
  if (process.platform !== 'win32' && (before.mode & 0o7777) !== expectedMode) {
    fail(`${label} mode differs from its exact permission phase`);
  }
  const actual = readRegularFileStable(
    path,
    expected.byteLength,
    label,
    MAX_WORKSPACE_FILE_BYTES,
    trustedTestHook,
  );
  const after = lstatSync(path);
  if (
    !after.isFile() || after.isSymbolicLink() || after.nlink !== 1 ||
    after.dev !== before.dev || after.ino !== before.ino || after.mode !== before.mode ||
    after.size !== before.size || after.mtimeMs !== before.mtimeMs ||
    after.ctimeMs !== before.ctimeMs || after.uid !== before.uid || after.gid !== before.gid ||
    after.birthtimeMs !== before.birthtimeMs
  ) {
    fail(`${label} changed across its intent comparison`);
  }
  if (!actual.equals(expected)) fail(`${label} bytes differ from their exact intended value`);
  return actual;
}

export function assertFinalizedHostFile(
  path: string,
  expectedValue: string | Buffer,
  label: string,
  trustedTestHook?: PackageSmokeRegularFileTestHook,
): void {
  readExactIntentFile(path, expectedValue, 0o444, label, trustedTestHook);
}

function digestRegularFileStable(
  path: string,
  expectedSize: number,
  label: string,
  maxBytes: number,
  trustedTestHook?: PackageSmokeRegularFileTestHook,
): string {
  const pathBefore = lstatSync(path);
  if (!pathBefore.isFile()) fail(`${label} must be a regular file`);
  if (pathBefore.nlink !== 1) fail(`${label} must not be hard-linked`);
  if (pathBefore.size !== expectedSize) fail(`${label} changed before it could be hashed`);
  if (pathBefore.size > maxBytes) fail(`${label} exceeds its per-file byte budget`);
  const descriptor = openExpectedRegularFileAfterReview(path, label, trustedTestHook);
  try {
    const before = fstatSync(descriptor);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.dev !== pathBefore.dev ||
      before.ino !== pathBefore.ino ||
      before.size !== pathBefore.size ||
      before.mode !== pathBefore.mode ||
      before.uid !== pathBefore.uid ||
      before.gid !== pathBefore.gid ||
      before.birthtimeMs !== pathBefore.birthtimeMs
    ) {
      fail(`${label} changed before it could be hashed`);
    }
    const hash = createHash('sha256');
    const chunk = Buffer.allocUnsafe(WORKSPACE_HASH_CHUNK_BYTES);
    let offset = 0;
    while (offset < before.size) {
      const length = Math.min(chunk.byteLength, before.size - offset);
      const count = readSync(descriptor, chunk, 0, length, offset);
      if (count <= 0) fail(`${label} ended before its declared size`);
      hash.update(chunk.subarray(0, count));
      offset += count;
    }
    const after = fstatSync(descriptor);
    const pathAfter = lstatSync(path);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      before.mode !== after.mode ||
      before.nlink !== after.nlink ||
      before.uid !== after.uid ||
      before.gid !== after.gid ||
      before.birthtimeMs !== after.birthtimeMs ||
      !pathAfter.isFile() ||
      pathAfter.nlink !== 1 ||
      pathAfter.dev !== before.dev ||
      pathAfter.ino !== before.ino ||
      pathAfter.size !== before.size ||
      pathAfter.mtimeMs !== before.mtimeMs ||
      pathAfter.ctimeMs !== before.ctimeMs ||
      pathAfter.mode !== before.mode ||
      pathAfter.uid !== before.uid ||
      pathAfter.gid !== before.gid ||
      pathAfter.birthtimeMs !== before.birthtimeMs
    ) {
      fail(`${label} changed while it was being hashed`);
    }
    return `sha256:${hash.digest('hex')}`;
  } finally {
    closeSync(descriptor);
  }
}

function readUtf8RegularFileStable(path: string, label: string, maxBytes: number): string {
  return decodeUtf8Fatal(readRegularFileStable(path, undefined, label, maxBytes), label);
}

function validateNpmAuthorityLimits(limits: NpmAuthorityLimits): void {
  const maxima = NPM_AUTHORITY_LIMITS;
  for (const key of Object.keys(maxima) as Array<keyof NpmAuthorityLimits>) {
    const value = limits[key];
    if (!Number.isSafeInteger(value) || value < 1 || value > maxima[key]) {
      fail(`npm package authority ${key} limit is invalid`);
    }
  }
}

function assertPortableRuntimeSegment(name: string, label: string, limits: NpmAuthorityLimits): void {
  const bytes = Buffer.byteLength(name, 'utf8');
  if (
    name === '' || name === '.' || name === '..' || name.includes('\\') ||
    bytes > limits.segmentBytes ||
    [...name].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 0x20 || code > 0x7e;
    })
  ) {
    fail(`${label} has a nonportable filesystem segment`);
  }
}

function runtimeDirectoryRecord(
  path: string,
  relativePath: string,
  expectedUid: bigint,
  expectedGid: bigint,
  label: string,
  discovered?: BigIntStats,
): Record<string, JsonValue> {
  const stats = lstatSync(path, { bigint: true });
  const mode = stats.mode & 0o7777n;
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    fail(`${label} must be a physical directory`);
  }
  if (discovered !== undefined && !sameRuntimeStat(stats, discovered)) {
    fail(`${label} changed after it was discovered`);
  }
  if ((mode & 0o7022n) !== 0n) {
    fail(`${label} must not carry special or group/world-write mode authority`);
  }
  if (stats.uid !== expectedUid || stats.gid !== expectedGid) {
    fail(`${label} ownership differs from the npm package root`);
  }
  return {
    path: relativePath,
    type: 'directory',
    device: stats.dev.toString(10),
    inode: stats.ino.toString(10),
    mode: Number(mode),
    uid: portableUnsignedBigInt(stats.uid, `${label} uid`),
    gid: portableUnsignedBigInt(stats.gid, `${label} gid`),
    linkCount: portableUnsignedBigInt(stats.nlink, `${label} link count`, 1n),
    mtimeNs: stats.mtimeNs.toString(10),
    ctimeNs: stats.ctimeNs.toString(10),
    birthtimeNs: stats.birthtimeNs.toString(10),
  };
}

function npmTreeOnce(rootPath: string, limits: NpmAuthorityLimits): NpmPackageTreeAuthority {
  if (!isAbsolute(rootPath) || realpathSync(rootPath) !== rootPath) {
    fail('npm package root must be one canonical physical absolute directory');
  }
  const rootInitial = lstatSync(rootPath, { bigint: true });
  if (!rootInitial.isDirectory() || rootInitial.isSymbolicLink()) {
    fail('npm package root must be a physical directory');
  }
  const records: Array<Record<string, JsonValue>> = [
    runtimeDirectoryRecord(
      rootPath,
      '',
      rootInitial.uid,
      rootInitial.gid,
      'npm package root',
      rootInitial,
    ),
  ];
  const pending: Array<{
    readonly absolute: string;
    readonly relative: string;
    readonly depth: number;
    readonly discovered: BigIntStats;
  }> = [
    { absolute: rootPath, relative: '', depth: 0, discovered: rootInitial },
  ];
  let entryCount = 1;
  let directoryCount = 1;
  let fileCount = 0;
  let symlinkCount = 0;
  let byteCount = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    const directoryBefore = lstatSync(current.absolute, { bigint: true });
    if (
      !sameRuntimeStat(directoryBefore, current.discovered) ||
      !directoryBefore.isDirectory() || directoryBefore.isSymbolicLink() ||
      realpathSync(current.absolute) !== current.absolute ||
      !isInside(rootPath, current.absolute)
    ) {
      fail(`npm package directory changed after discovery: ${current.relative || '<root>'}`);
    }
    const names = readDirectoryNamesBounded(
      current.absolute,
      `npm package directory ${current.relative || '<root>'}`,
      limits.directoryEntries,
    ).sort();
    for (const name of names) {
      assertPortableRuntimeSegment(name, 'npm package path', limits);
      const relativePath = current.relative ? `${current.relative}/${name}` : name;
      if (Buffer.byteLength(relativePath, 'utf8') > limits.pathBytes) {
        fail(`npm package path exceeds its byte budget: ${relativePath}`);
      }
      const depth = current.depth + 1;
      if (depth > limits.depth) fail(`npm package path exceeds its depth budget: ${relativePath}`);
      entryCount++;
      if (entryCount > limits.entries) fail('npm package tree exceeds its entry budget');
      const absolutePath = join(current.absolute, name);
      const stats = lstatSync(absolutePath, { bigint: true });
      if (stats.uid !== rootInitial.uid || stats.gid !== rootInitial.gid) {
        fail(`npm package entry ownership differs from its root: ${relativePath}`);
      }
      if (stats.isDirectory() && !stats.isSymbolicLink()) {
        records.push(runtimeDirectoryRecord(
          absolutePath,
          relativePath,
          rootInitial.uid,
          rootInitial.gid,
          `npm package directory ${relativePath}`,
          stats,
        ));
        directoryCount++;
        pending.push({ absolute: absolutePath, relative: relativePath, depth, discovered: stats });
        continue;
      }
      if (stats.isFile() && !stats.isSymbolicLink()) {
        const authority = inspectRuntimeRegularFile(
          absolutePath,
          limits.fileBytes,
          `npm package file ${relativePath}`,
        );
        byteCount += authority.size;
        if (byteCount > limits.totalBytes) fail('npm package tree exceeds its byte budget');
        fileCount++;
        records.push({
          path: relativePath,
          type: 'file',
          sha256: authority.sha256,
          size: authority.size,
          mode: authority.mode,
          uid: authority.uid,
          gid: authority.gid,
          linkCount: authority.linkCount,
          device: authority.device,
          inode: authority.inode,
          mtimeNs: authority.mtimeNs,
          ctimeNs: authority.ctimeNs,
          birthtimeNs: authority.birthtimeNs,
        });
        continue;
      }
      if (stats.isSymbolicLink()) {
        if (stats.nlink !== 1n) fail(`npm package symlink is hard-linked: ${relativePath}`);
        const target = readlinkSync(absolutePath);
        if (
          target.length === 0 || isAbsolute(target) || target.includes('\\') || target.includes('\0') ||
          Buffer.byteLength(target, 'utf8') > limits.symlinkTargetBytes ||
          [...target].some((character) => {
            const code = character.codePointAt(0) ?? 0;
            return code < 0x20 || code > 0x7e;
          })
        ) {
          fail(`npm package symlink target is unsafe: ${relativePath}`);
        }
        const resolvedTarget = resolve(dirname(absolutePath), target);
        if (!isInside(rootPath, resolvedTarget) || resolvedTarget === rootPath) {
          fail(`npm package symlink escapes its root: ${relativePath}`);
        }
        const targetStats = lstatSync(resolvedTarget, { bigint: true });
        if (!targetStats.isFile() || targetStats.isSymbolicLink() ||
            realpathSync(absolutePath) !== resolvedTarget) {
          fail(`npm package symlink must directly target one internal regular file: ${relativePath}`);
        }
        symlinkCount++;
        records.push({
          path: relativePath,
          type: 'symlink',
          target,
          resolvedTarget: relative(rootPath, resolvedTarget).split(sep).join('/'),
          device: stats.dev.toString(10),
          inode: stats.ino.toString(10),
          mode: Number(stats.mode & 0o7777n),
          uid: portableUnsignedBigInt(stats.uid, `npm package symlink uid: ${relativePath}`),
          gid: portableUnsignedBigInt(stats.gid, `npm package symlink gid: ${relativePath}`),
          linkCount: 1,
          mtimeNs: stats.mtimeNs.toString(10),
          ctimeNs: stats.ctimeNs.toString(10),
          birthtimeNs: stats.birthtimeNs.toString(10),
        });
        continue;
      }
      fail(`npm package tree contains a special filesystem node: ${relativePath}`);
    }
    const directoryAfter = lstatSync(current.absolute, { bigint: true });
    const namesAfter = readDirectoryNamesBounded(
      current.absolute,
      `npm package directory ${current.relative || '<root>'}`,
      limits.directoryEntries,
    ).sort();
    if (!sameRuntimeStat(directoryBefore, directoryAfter) ||
        JSON.stringify(namesAfter) !== JSON.stringify(names)) {
      fail(`npm package directory changed while it was sealed: ${current.relative || '<root>'}`);
    }
  }
  const rootFinal = lstatSync(rootPath, { bigint: true });
  if (!sameRuntimeStat(rootInitial, rootFinal)) fail('npm package root changed while it was sealed');
  records.sort((left, right) => {
    const leftPath = String(left.path);
    const rightPath = String(right.path);
    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
  });
  return {
    schema: NPM_TREE_SCHEMA,
    sha256: sha256(`${RUNTIME_TREE_HASH_DOMAIN}${canonicalize(records)}`),
    entryCount,
    directoryCount,
    fileCount,
    symlinkCount,
    byteCount,
  };
}

export function fingerprintNpmPackageTree(
  rootPath: string,
  limits: NpmAuthorityLimits = NPM_AUTHORITY_LIMITS,
): NpmPackageTreeAuthority {
  validateNpmAuthorityLimits(limits);
  const first = npmTreeOnce(rootPath, limits);
  const second = npmTreeOnce(rootPath, limits);
  if (!exactJsonEqual(first, second)) fail('npm package tree changed across its stable seal');
  return first;
}

function npmManifestIdentity(cli: string): {
  readonly root: string;
  readonly version: string;
  readonly packageJson: string;
} {
  if (basename(cli) !== 'npm-cli.js' || basename(dirname(cli)) !== 'bin') {
    fail('npm executable must be the exact npm package bin/npm-cli.js entry point');
  }
  const rootPath = dirname(dirname(cli));
  if (realpathSync(rootPath) !== rootPath || !lstatSync(rootPath).isDirectory()) {
    fail('npm package root must be one canonical physical directory');
  }
  const packageJsonPath = join(rootPath, 'package.json');
  const manifest = expectRecord(readStrictJson(packageJsonPath, 'npm package manifest'), 'npm package manifest');
  const bin = expectRecord(manifest.bin, 'npm package manifest bin');
  const version = expectString(manifest.version, 'npm package manifest version');
  if (manifest.name !== 'npm' || bin.npm !== 'bin/npm-cli.js') {
    fail('npm package manifest does not bind the exact npm CLI identity');
  }
  reviewedNpmTopologyProfile(version);
  return { root: rootPath, version, packageJson: packageJsonPath };
}

export function inspectNpmPackageAuthority(cli: string): NpmPackageAuthority {
  if (!isAbsolute(cli) || realpathSync(cli) !== cli) {
    fail('npm CLI must be one canonical physical absolute path');
  }
  const firstIdentity = npmManifestIdentity(cli);
  const firstTree = fingerprintNpmPackageTree(firstIdentity.root);
  const cliFile = inspectRuntimeRegularFile(
    cli,
    NPM_AUTHORITY_LIMITS.fileBytes,
    'reviewed npm CLI authority',
    true,
  );
  const packageJsonFile = inspectRuntimeRegularFile(
    firstIdentity.packageJson,
    MAX_JSON_BYTES,
    'reviewed npm package manifest authority',
  );
  const secondIdentity = npmManifestIdentity(cli);
  const secondTree = fingerprintNpmPackageTree(secondIdentity.root);
  if (
    !exactJsonEqual(firstIdentity, secondIdentity) ||
    !exactJsonEqual(firstTree, secondTree)
  ) {
    fail('npm package authority changed across semantic inspection');
  }
  return {
    root: firstIdentity.root,
    cli,
    version: firstIdentity.version,
    packageJsonSha256: packageJsonFile.sha256,
    cliFile,
    ancestry: inspectRuntimePathAncestry(firstIdentity.root, 'reviewed npm package root'),
    tree: firstTree,
  };
}

export function assertPackageRuntimeAuthority(expected: PackageRuntimeAuthority, label: string): void {
  const nodeFile = inspectNodeExecutableAuthority(expected.node.executable);
  const npm = inspectNpmPackageAuthority(expected.npm.cli);
  const observed: PackageRuntimeAuthority = {
    scope: RUNTIME_AUTHORITY_SCOPE,
    node: {
      ...nodeFile,
      version: expected.node.version,
      runtime: expected.node.runtime,
    },
    npm,
  };
  if (!exactJsonEqual(observed, expected)) fail(`${label} package runtime authority changed`);
}

function expectedPackageClosure(packageJsonValue: JsonValue): ExpectedPackageFile[] {
  const packageJson = expectRecord(packageJsonValue, 'Cortexel package.json');
  if (!exactJsonEqual(packageJson.files, EXPECTED_PACKAGE_FILE_ENTRIES)) {
    fail('Cortexel package files allowlist differs from the reviewed package closure');
  }
  const pending = ['package.json', ...EXPECTED_PACKAGE_FILE_ENTRIES];
  const files: ExpectedPackageFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;
  let visitedNodes = 0;
  while (pending.length > 0) {
    const relativePath = pending.pop()!;
    assertCanonicalArtifactPath(relativePath, 'expected package path');
    if (relativePath.split('/').length > PACKAGE_TARBALL_LIMITS.sourceDepth) {
      fail(`expected package path exceeds its depth bound: ${relativePath}`);
    }
    visitedNodes++;
    if (visitedNodes > PACKAGE_TARBALL_LIMITS.sourceNodes) {
      fail('expected package closure exceeds its filesystem-node bound');
    }
    const absolutePath = join(root, ...relativePath.split('/'));
    const stats = lstatSync(absolutePath);
    if (stats.isSymbolicLink()) fail(`expected package closure contains a symlink: ${relativePath}`);
    if (stats.isDirectory()) {
      const directory = opendirSync(absolutePath);
      const children: string[] = [];
      try {
        let child = directory.readSync();
        while (child !== null) {
          children.push(child.name);
          if (children.length > PACKAGE_TARBALL_LIMITS.directoryEntries) {
            fail(`expected package directory exceeds its child bound: ${relativePath}`);
          }
          child = directory.readSync();
        }
      } finally {
        directory.closeSync();
      }
      children.sort().reverse();
      for (const child of children) pending.push(`${relativePath}/${child}`);
      if (visitedNodes + pending.length > PACKAGE_TARBALL_LIMITS.sourceNodes) {
        fail('expected package closure pending-node count exceeds its bound');
      }
      continue;
    }
    if (!stats.isFile()) fail(`expected package closure contains a special file: ${relativePath}`);
    if (seen.has(relativePath)) fail(`expected package closure duplicates ${relativePath}`);
    if (files.length >= PACKAGE_TARBALL_LIMITS.entries) {
      fail('expected package closure exceeds its entry bound');
    }
    if (stats.size > PACKAGE_TARBALL_LIMITS.fileBytes) {
      fail(`expected package file exceeds its bound: ${relativePath}`);
    }
    const mode = expectedArtifactMode(relativePath);
    if (process.platform !== 'win32' && (stats.mode & 0o7777) !== mode) {
      fail(`expected package source mode is invalid: ${relativePath}`);
    }
    const raw = readRegularFileStable(
      absolutePath,
      stats.size,
      `expected package file ${relativePath}`,
      PACKAGE_TARBALL_LIMITS.fileBytes,
    );
    totalBytes += raw.byteLength;
    if (totalBytes > PACKAGE_TARBALL_LIMITS.uncompressedBytes) {
      fail('expected package closure exceeds its byte bound');
    }
    files.push({ path: relativePath, size: raw.byteLength, mode, digest: sha256(raw) });
    seen.add(relativePath);
  }
  files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return files;
}

export function verifyInstalledPackageClosure(
  installedRoot: string,
  expectedFiles: readonly ExpectedPackageFile[],
  permissionPhase: 'prepared-writable' | 'finalized-read-only' = 'prepared-writable',
): void {
  if (permissionPhase !== 'prepared-writable' && permissionPhase !== 'finalized-read-only') {
    fail('installed Cortexel closure has an invalid permission phase');
  }
  if (realpathSync(installedRoot) !== installedRoot || !lstatSync(installedRoot).isDirectory()) {
    fail('installed Cortexel package root is not a canonical real directory');
  }
  const expected = artifactFileMap(expectedFiles, 'installed package expectation', true);
  const expectedDirectories = new Set<string>(['']);
  for (const path of expected.keys()) {
    const segments = path.split('/');
    for (let index = 1; index < segments.length; index++) {
      expectedDirectories.add(segments.slice(0, index).join('/'));
    }
  }
  const pending = [''];
  const seen = new Set<string>();
  let visitedNodes = 0;
  let fileBytes = 0;
  while (pending.length > 0) {
    const relativePath = pending.pop()!;
    const absolutePath = relativePath
      ? join(installedRoot, ...relativePath.split('/'))
      : installedRoot;
    const stats = lstatSync(absolutePath);
    visitedNodes++;
    if (visitedNodes > PACKAGE_TARBALL_LIMITS.sourceNodes) {
      fail('installed Cortexel closure exceeds its filesystem-node bound');
    }
    if (stats.isSymbolicLink()) fail(`installed Cortexel closure contains a link: ${relativePath}`);
    if (stats.isDirectory()) {
      // npm's reviewed nested strategy grafts Cortexel's locked dependencies here;
      // those are validated by the consumer lock and whole-workspace seal, not by
      // the package tar's own file closure.
      if (relativePath === 'node_modules') continue;
      if (!expectedDirectories.has(relativePath)) {
        fail(`installed Cortexel closure contains an unexpected directory: ${relativePath}`);
      }
      const directory = opendirSync(absolutePath);
      const children: string[] = [];
      try {
        let child = directory.readSync();
        while (child !== null) {
          children.push(child.name);
          if (children.length > PACKAGE_TARBALL_LIMITS.directoryEntries) {
            fail(`installed Cortexel directory exceeds its child bound: ${relativePath}`);
          }
          child = directory.readSync();
        }
      } finally {
        directory.closeSync();
      }
      for (const child of children.sort().reverse()) {
        const childPath = relativePath ? `${relativePath}/${child}` : child;
        assertCanonicalArtifactPath(childPath, 'installed Cortexel path');
        if (childPath.split('/').length > PACKAGE_TARBALL_LIMITS.sourceDepth) {
          fail(`installed Cortexel path exceeds its depth bound: ${childPath}`);
        }
        pending.push(childPath);
      }
      if (visitedNodes + pending.length > PACKAGE_TARBALL_LIMITS.sourceNodes) {
        fail('installed Cortexel pending-node count exceeds its bound');
      }
      continue;
    }
    if (!stats.isFile()) fail(`installed Cortexel closure contains a special file: ${relativePath}`);
    const expectedFile = expected.get(relativePath);
    if (expectedFile === undefined || seen.has(relativePath)) {
      fail(`installed Cortexel closure contains an unexpected file: ${relativePath}`);
    }
    let expectedMode = expectedFile.mode;
    if (permissionPhase === 'finalized-read-only') {
      expectedMode = (expectedFile.mode & 0o111) === 0 ? 0o444 : 0o555;
    }
    if (process.platform !== 'win32' && installedArtifactMode(stats.mode) !== expectedMode) {
      fail(`installed Cortexel file mode differs from the tarball: ${relativePath}`);
    }
    const raw = readRegularFileStable(
      absolutePath,
      stats.size,
      `installed Cortexel file ${relativePath}`,
      PACKAGE_TARBALL_LIMITS.fileBytes,
    );
    if (raw.byteLength !== expectedFile.size || sha256(raw) !== expectedFile.digest) {
      fail(`installed Cortexel file bytes differ from the tarball: ${relativePath}`);
    }
    fileBytes += raw.byteLength;
    if (fileBytes > PACKAGE_TARBALL_LIMITS.uncompressedBytes) {
      fail('installed Cortexel closure exceeds its byte bound');
    }
    seen.add(relativePath);
  }
  if (seen.size !== expected.size) fail('installed Cortexel file closure is incomplete');
}

export function assertInstalledTopLevelPackageInventory(
  consumer: string,
  expectedPackages: readonly string[],
  expectedBinTargets: Readonly<Record<string, string>>,
): void {
  const nodeModules = join(consumer, 'node_modules');
  if (realpathSync(nodeModules) !== nodeModules || !lstatSync(nodeModules).isDirectory()) {
    fail('installed node_modules root is not a canonical real directory');
  }
  const expectedScopes = new Map<string, string[]>();
  const expectedRootEntries = new Set<string>(['.bin', '.package-lock.json']);
  const seenPackages = new Set<string>();
  for (const packageName of expectedPackages) {
    if (!isCanonicalPackageName(packageName)) fail(`invalid expected package name ${packageName}`);
    if (seenPackages.has(packageName)) fail(`duplicate expected package name ${packageName}`);
    seenPackages.add(packageName);
    const segments = packageName.split('/');
    if (packageName.startsWith('@')) {
      const scope = segments[0]!;
      const member = segments[1]!;
      expectedRootEntries.add(scope);
      const members = expectedScopes.get(scope) ?? [];
      members.push(member);
      expectedScopes.set(scope, members);
    } else {
      expectedRootEntries.add(packageName);
    }
  }
  const actualRootEntries = readDirectoryNamesBounded(
    nodeModules,
    'installed top-level node_modules',
  ).sort();
  const wantedRootEntries = [...expectedRootEntries].sort();
  if (!exactJsonEqual(actualRootEntries, wantedRootEntries)) {
    fail(`installed top-level node_modules inventory differs: ${actualRootEntries.join(', ')}`);
  }
  const binDirectory = join(nodeModules, '.bin');
  const binStats = lstatSync(binDirectory);
  if (!binStats.isDirectory() || binStats.isSymbolicLink() || realpathSync(binDirectory) !== binDirectory) {
    fail('installed .bin entry is not a canonical real directory');
  }
  const expectedBinNames = Object.keys(expectedBinTargets).sort();
  if (expectedBinNames.length === 0 || expectedBinNames.some((name) =>
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(name))) {
    fail('installed .bin expectation is empty or contains an invalid name');
  }
  const actualBinNames = readDirectoryNamesBounded(
    binDirectory,
    'installed top-level .bin directory',
  ).sort();
  if (!exactJsonEqual(actualBinNames, expectedBinNames)) {
    fail(`installed top-level .bin inventory differs: ${actualBinNames.join(', ')}`);
  }
  for (const binName of expectedBinNames) {
    const target = expectedBinTargets[binName]!;
    if (!isAbsolute(target) || !isInside(nodeModules, target)) {
      fail(`installed ${binName} target escapes top-level node_modules`);
    }
    assertInstalledNodeBinShim(consumer, binName, target);
  }
  readStrictJson(join(nodeModules, '.package-lock.json'), 'installed hidden package lock');
  for (const [scope, members] of expectedScopes) {
    const scopePath = join(nodeModules, scope);
    const scopeStats = lstatSync(scopePath);
    if (!scopeStats.isDirectory() || scopeStats.isSymbolicLink() || realpathSync(scopePath) !== scopePath) {
      fail(`installed package scope is not a canonical real directory: ${scope}`);
    }
    const actualMembers = readDirectoryNamesBounded(
      scopePath,
      `installed package scope ${scope}`,
    ).sort();
    if (!exactJsonEqual(actualMembers, members.sort())) {
      fail(`installed package scope inventory differs: ${scope}`);
    }
  }
  for (const packageName of expectedPackages) {
    const packagePath = join(nodeModules, ...packageName.split('/'));
    const stats = lstatSync(packagePath);
    if (!stats.isDirectory() || stats.isSymbolicLink() || realpathSync(packagePath) !== packagePath) {
      fail(`installed top-level package is not a canonical real directory: ${packageName}`);
    }
  }
}

type OmittedDependencyClass = 'dev' | 'optional';

type OmittedScopeTopologyPolicy =
  | 'exact-derived-empty-omitted-scopes'
  | 'forbid-empty-omitted-scopes';

interface ReviewedNpmTopologyProfile {
  readonly exactNpmVersion: string;
  readonly profileId: string;
  readonly omittedScopePolicy: OmittedScopeTopologyPolicy;
}

const DERIVED_EMPTY_OMITTED_SCOPES_PROFILE_ID =
  'npm-derived-empty-omitted-scopes.v1';
const FORBID_EMPTY_OMITTED_SCOPES_PROFILE_ID =
  'npm-forbid-empty-omitted-scopes.v1';

const REVIEWED_NPM_VERSIONS = Object.freeze([
  '10.9.0',
  '10.9.8',
  '11.3.0',
  '11.12.1',
  '11.16.0',
  '11.17.0',
  '11.18.0',
] as const);
type ReviewedNpmVersion = (typeof REVIEWED_NPM_VERSIONS)[number];

const REVIEWED_NPM_TOPOLOGY_PROFILES = Object.freeze({
  '10.9.0': Object.freeze({
    exactNpmVersion: '10.9.0',
    profileId: DERIVED_EMPTY_OMITTED_SCOPES_PROFILE_ID,
    omittedScopePolicy: 'exact-derived-empty-omitted-scopes',
  }),
  '10.9.8': Object.freeze({
    exactNpmVersion: '10.9.8',
    profileId: DERIVED_EMPTY_OMITTED_SCOPES_PROFILE_ID,
    omittedScopePolicy: 'exact-derived-empty-omitted-scopes',
  }),
  '11.3.0': Object.freeze({
    exactNpmVersion: '11.3.0',
    profileId: DERIVED_EMPTY_OMITTED_SCOPES_PROFILE_ID,
    omittedScopePolicy: 'exact-derived-empty-omitted-scopes',
  }),
  '11.12.1': Object.freeze({
    exactNpmVersion: '11.12.1',
    profileId: FORBID_EMPTY_OMITTED_SCOPES_PROFILE_ID,
    omittedScopePolicy: 'forbid-empty-omitted-scopes',
  }),
  '11.16.0': Object.freeze({
    exactNpmVersion: '11.16.0',
    profileId: FORBID_EMPTY_OMITTED_SCOPES_PROFILE_ID,
    omittedScopePolicy: 'forbid-empty-omitted-scopes',
  }),
  '11.17.0': Object.freeze({
    exactNpmVersion: '11.17.0',
    profileId: FORBID_EMPTY_OMITTED_SCOPES_PROFILE_ID,
    omittedScopePolicy: 'forbid-empty-omitted-scopes',
  }),
  '11.18.0': Object.freeze({
    exactNpmVersion: '11.18.0',
    profileId: FORBID_EMPTY_OMITTED_SCOPES_PROFILE_ID,
    omittedScopePolicy: 'forbid-empty-omitted-scopes',
  }),
}) satisfies Readonly<Record<ReviewedNpmVersion, ReviewedNpmTopologyProfile>>;

export function reviewedNpmTopologyProfile(
  npmVersion: string,
): ReviewedNpmTopologyProfile {
  const profile = Object.hasOwn(REVIEWED_NPM_TOPOLOGY_PROFILES, npmVersion)
    ? REVIEWED_NPM_TOPOLOGY_PROFILES[npmVersion as ReviewedNpmVersion]
    : undefined;
  if (profile === undefined) {
    const received = jsonDiagnosticString(npmVersion, 128);
    fail(
      'package smoke requires one exact reviewed npm version ' +
      `(${REVIEWED_NPM_VERSIONS.join(', ')}); received ${received.encoded}` +
      `${received.truncated ? ' (truncated)' : ''}`,
    );
  }
  if (profile.exactNpmVersion !== npmVersion) {
    fail('reviewed npm topology profile identity is inconsistent');
  }
  return profile;
}

class RetryableOptionalMaterializationGapError extends Error {
  constructor(readonly missingPaths: readonly string[]) {
    const sample = missingPaths.slice(0, 8).map((path) => {
      const diagnostic = jsonDiagnosticString(path, 512);
      return `${diagnostic.encoded}${diagnostic.truncated ? ' (truncated)' : ''}`;
    }).join(', ');
    super(
      'npm reported success after pruning an exact optional-only package subset ' +
      `(${missingPaths.length} missing; sample: ${sample}` +
      `${missingPaths.length > 8 ? ', ...' : ''})`,
    );
    this.name = 'RetryableOptionalMaterializationGapError';
  }
}

interface InstalledBinExpectation {
  readonly providerRoot: string;
  readonly target: string;
}

function lockPackageContainer(path: string): string {
  const marker = path.lastIndexOf('/node_modules/');
  return marker === -1 ? 'node_modules' : `${path.slice(0, marker)}/node_modules`;
}

function lockPackageName(path: string): string {
  const container = lockPackageContainer(path);
  const name = path.slice(container.length + 1);
  if (!isCanonicalPackageName(name)) fail(`fixture lock has an invalid package name at ${path}`);
  return name;
}

function retryableOptionalMaterializationGap(options: {
  readonly actualHiddenLock: JsonValue;
  readonly expectedPackages: ReadonlyMap<string, Record<string, JsonValue>>;
  readonly lock: Record<string, JsonValue>;
  readonly lockedPackages: Record<string, JsonValue>;
}): { readonly missingPaths: readonly string[]; readonly reducedLock: JsonValue } | undefined {
  const actual = options.actualHiddenLock;
  if (!isRecord(actual)) return undefined;
  const actualKeys = Object.keys(actual).sort();
  if (!exactJsonEqual(
    actualKeys,
    ['lockfileVersion', 'name', 'packages', 'requires', 'version'],
  )) return undefined;
  if (
    actual.name !== options.lock.name ||
    actual.version !== options.lock.version ||
    actual.lockfileVersion !== options.lock.lockfileVersion ||
    actual.requires !== options.lock.requires ||
    !isRecord(actual.packages)
  ) return undefined;

  const actualPackages = actual.packages;
  for (const [path, record] of Object.entries(actualPackages)) {
    const expected = options.expectedPackages.get(path);
    if (expected === undefined || !exactJsonEqual(record, expected)) return undefined;
  }
  const missingPaths: string[] = [];
  for (const [path, record] of options.expectedPackages) {
    if (Object.hasOwn(actualPackages, path)) continue;
    if (record.optional !== true) return undefined;
    missingPaths.push(path);
  }
  if (missingPaths.length === 0) return undefined;
  return {
    missingPaths: Object.freeze(missingPaths.sort()),
    reducedLock: {
      name: options.lock.name,
      version: options.lock.version,
      lockfileVersion: options.lock.lockfileVersion,
      requires: options.lock.requires,
      packages: {
        '': options.lockedPackages['']!,
        ...actualPackages,
      },
    },
  };
}

function lockRuntimeSelectorMatches(
  value: JsonValue | undefined,
  observed: string,
  label: string,
): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty selector array`);
  }
  if (value.length === 1 && value[0] === 'any') return true;
  const positive: string[] = [];
  const negative = new Set<string>();
  for (const candidate of value) {
    if (
      typeof candidate !== 'string' ||
      !/^!?[a-z0-9][a-z0-9_-]*$/u.test(candidate)
    ) {
      fail(`${label} contains an invalid selector`);
    }
    if (candidate.startsWith('!')) negative.add(candidate.slice(1));
    else positive.push(candidate);
  }
  return !negative.has(observed) && (positive.length === 0 || positive.includes(observed));
}

function lockPackageSupportsCurrentRuntime(
  record: Record<string, JsonValue>,
  path: string,
  runtime: NodeRuntimeIdentity,
): boolean {
  if (record.libc !== undefined) {
    fail(`prepared package lock ${path} uses an unreviewed libc selector`);
  }
  // Parse both selectors unconditionally. A nonmatching OS must not hide a
  // malformed CPU selector and make lock validity depend on the verifier host.
  const osMatches = lockRuntimeSelectorMatches(
    record.os,
    runtime.platform,
    `${path} os`,
  );
  const cpuMatches = lockRuntimeSelectorMatches(
    record.cpu,
    runtime.arch,
    `${path} cpu`,
  );
  return osMatches && cpuMatches;
}

/**
 * Proves the complete npm-installed package topology against the exact prepared
 * lock and omit policy. This deliberately derives the expectation from every
 * nested lock path rather than maintaining a second, top-level-only allowlist.
 */
export function assertInstalledRecursivePackageClosure(
  consumer: string,
  preparedLockValue: JsonValue,
  omittedDependencyClasses: readonly OmittedDependencyClass[],
  npmVersion: string,
  runtime: NodeRuntimeIdentity,
): void {
  const npmTopologyProfile = reviewedNpmTopologyProfile(npmVersion);
  assertInstalledRecursivePackageClosureWithRetryPolicy(
    consumer,
    preparedLockValue,
    omittedDependencyClasses,
    npmTopologyProfile,
    runtime,
    true,
  );
}

function assertInstalledRecursivePackageClosureWithRetryPolicy(
  consumer: string,
  preparedLockValue: JsonValue,
  omittedDependencyClasses: readonly OmittedDependencyClass[],
  npmTopologyProfile: ReviewedNpmTopologyProfile,
  runtime: NodeRuntimeIdentity,
  retryClassificationEnabled: boolean,
): void {
  if (
    (runtime.platform !== 'darwin' && runtime.platform !== 'linux') ||
    !/^[a-z0-9][a-z0-9_-]{0,31}$/u.test(runtime.arch)
  ) {
    fail('recursive package closure received an invalid reviewed Node runtime identity');
  }
  const omitted = new Set<OmittedDependencyClass>();
  for (const dependencyClass of omittedDependencyClasses) {
    if (dependencyClass !== 'dev' && dependencyClass !== 'optional') {
      fail('package-smoke consumer has an unsupported omit policy');
    }
    if (omitted.has(dependencyClass)) fail('package-smoke consumer omit policy has duplicates');
    omitted.add(dependencyClass);
  }
  const omitPolicy = [...omitted].sort().join('+');
  if (omitPolicy !== '' && omitPolicy !== 'optional' && omitPolicy !== 'dev+optional') {
    fail('package-smoke consumer has an unsupported omit policy');
  }

  const lock = expectRecord(preparedLockValue, 'prepared package lock');
  exactKeys(
    lock,
    ['name', 'version', 'lockfileVersion', 'requires', 'packages'],
    'prepared package lock',
  );
  if (
    typeof lock.name !== 'string' || lock.name.length === 0 ||
    typeof lock.version !== 'string' || lock.version.length === 0 ||
    lock.lockfileVersion !== 3 || lock.requires !== true
  ) {
    fail('prepared package lock header is invalid');
  }
  const lockedPackages = expectRecord(lock.packages, 'prepared package lock packages');
  expectRecord(lockedPackages[''], 'prepared package lock root');

  const expectedPackages = new Map<string, Record<string, JsonValue>>();
  for (const [path, candidate] of Object.entries(lockedPackages)) {
    if (path === '') continue;
    if (!isCanonicalLockPackagePath(path)) fail(`prepared package lock has an unsafe path ${path}`);
    const record = expectRecord(candidate, `prepared package lock package ${path}`);
    for (const dependencyClass of ['dev', 'optional', 'devOptional'] as const) {
      if (record[dependencyClass] !== undefined && record[dependencyClass] !== true) {
        fail(`prepared package lock ${path} has a noncanonical ${dependencyClass} flag`);
      }
    }
    if (record.devOptional === true && (record.dev === true || record.optional === true)) {
      fail(`prepared package lock ${path} has redundant dependency-class flags`);
    }
    const omittedByClass =
      (omitted.has('dev') && record.dev === true) ||
      (omitted.has('optional') && record.optional === true) ||
      (
        record.devOptional === true &&
        omitted.has('dev') &&
        omitted.has('optional')
      );
    if (omittedByClass) continue;
    if (!lockPackageSupportsCurrentRuntime(record, path, runtime)) {
      if (record.optional !== true) {
        fail(`prepared package lock ${path} is runtime-incompatible but not optional`);
      }
      continue;
    }
    expectedPackages.set(path, record);
  }
  if (expectedPackages.size === 0 || expectedPackages.size > 10_000) {
    fail('prepared package lock selected package count is outside its bound');
  }

  const containerPackages = new Map<string, Set<string>>();
  const containerBins = new Map<string, Map<string, InstalledBinExpectation>>();
  for (const [path, record] of expectedPackages) {
    const container = lockPackageContainer(path);
    if (container !== 'node_modules') {
      const parent = container.slice(0, -'/node_modules'.length);
      if (!expectedPackages.has(parent)) {
        fail(`prepared package lock includes ${path} beneath an omitted or absent parent`);
      }
    }
    const packageName = lockPackageName(path);
    const packages = containerPackages.get(container) ?? new Set<string>();
    if (packages.has(packageName)) fail(`prepared package lock duplicates ${path}`);
    packages.add(packageName);
    containerPackages.set(container, packages);

    if (record.bin === undefined) continue;
    const bin = expectRecord(record.bin, `prepared package lock ${path} bin`);
    if (Object.keys(bin).length === 0) fail(`prepared package lock ${path} has an empty bin map`);
    const expectations = containerBins.get(container) ?? new Map<string, InstalledBinExpectation>();
    for (const [binName, targetValue] of Object.entries(bin)) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(binName)) {
        fail(`prepared package lock ${path} has an unsafe bin name`);
      }
      const targetRelative = expectString(targetValue, `prepared package lock ${path} bin target`);
      assertCanonicalArtifactPath(targetRelative, `prepared package lock ${path} bin target`);
      if (expectations.has(binName)) {
        fail(`prepared package lock has an ambiguous ${binName} bin in ${container}`);
      }
      const providerRoot = join(consumer, ...path.split('/'));
      const target = join(providerRoot, ...targetRelative.split('/'));
      if (!isInside(providerRoot, target)) {
        fail(`prepared package lock ${path} bin target escapes its provider`);
      }
      expectations.set(binName, { providerRoot, target });
    }
    containerBins.set(container, expectations);
  }
  if (!containerPackages.has('node_modules')) {
    fail('prepared package lock has no installed top-level package closure');
  }

  const nodeModules = join(consumer, 'node_modules');
  if (realpathSync(nodeModules) !== nodeModules || !lstatSync(nodeModules).isDirectory()) {
    fail('installed node_modules root is not a canonical real directory');
  }

  const expectedHiddenPackages = Object.fromEntries(
    expectedPackages,
  );
  const expectedHiddenLock = {
    name: lock.name,
    version: lock.version,
    lockfileVersion: lock.lockfileVersion,
    requires: lock.requires,
    packages: expectedHiddenPackages,
  };
  const hiddenLockPath = join(nodeModules, '.package-lock.json');
  const actualHiddenLock = readStrictJson(hiddenLockPath, 'installed hidden package lock');
  if (!exactJsonEqual(actualHiddenLock, expectedHiddenLock)) {
    if (omitPolicy === '' && retryClassificationEnabled) {
      const retryableGap = retryableOptionalMaterializationGap({
        actualHiddenLock,
        expectedPackages,
        lock,
        lockedPackages,
      });
      if (retryableGap !== undefined) {
        let reducedClosureIsExact = false;
        try {
          assertInstalledRecursivePackageClosureWithRetryPolicy(
            consumer,
            retryableGap.reducedLock,
            [],
            npmTopologyProfile,
            runtime,
            false,
          );
          reducedClosureIsExact = true;
        } catch {
          // The ordinary exact-mismatch diagnostic below remains authoritative
          // unless the reduced optional-only filesystem closure is also exact.
        }
        if (reducedClosureIsExact) {
          throw new RetryableOptionalMaterializationGapError(retryableGap.missingPaths);
        }
      }
    }
    const consumerName = jsonDiagnosticString(basename(consumer), 256);
    const difference = firstJsonDifferencePath(expectedHiddenLock, actualHiddenLock) ?? '$';
    fail(
      'installed hidden package lock differs from the exact filtered prepared lock for ' +
      `consumer ${consumerName.encoded}${consumerName.truncated ? ' (truncated)' : ''}, ` +
      `omit=${omitPolicy || 'none'}, first difference ${difference}`,
    );
  }

  const expectedManagementPaths = new Set(containerPackages.keys());
  const expectedBinPaths = new Set<string>();
  const derivedEmptyOmittedScopes = new Map<string, Set<string>>();
  if (npmTopologyProfile.omittedScopePolicy === 'exact-derived-empty-omitted-scopes') {
    for (const path of Object.keys(lockedPackages)) {
      if (path === '' || expectedPackages.has(path)) continue;
      const container = lockPackageContainer(path);
      if (!containerPackages.has(container)) continue;
      const packageName = lockPackageName(path);
      if (!packageName.startsWith('@')) continue;
      const scopes = derivedEmptyOmittedScopes.get(container) ?? new Set<string>();
      scopes.add(packageName.split('/')[0]!);
      derivedEmptyOmittedScopes.set(container, scopes);
    }
  }
  for (const [container, packageNames] of [...containerPackages].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0)) {
    const containerPath = join(consumer, ...container.split('/'));
    const containerStats = lstatSync(containerPath);
    if (
      !containerStats.isDirectory() || containerStats.isSymbolicLink() ||
      realpathSync(containerPath) !== containerPath
    ) {
      fail(`installed package container is not a canonical real directory: ${container}`);
    }
    const expectedEntries = new Set<string>();
    const scopes = new Map<string, string[]>();
    for (const packageName of packageNames) {
      if (packageName.startsWith('@')) {
        const [scope, member] = packageName.split('/');
        expectedEntries.add(scope!);
        const members = scopes.get(scope!) ?? [];
        members.push(member!);
        scopes.set(scope!, members);
      } else {
        expectedEntries.add(packageName);
      }
    }
    // Some exact reviewed npm versions materialize an empty scope directory
    // when every lock member in that scope is filtered out. Other exact reviewed
    // versions materialize no such residue. The profile is derived from the
    // verified npm package authority, and the residue set is derived only from
    // excluded scoped lock entries beneath an otherwise-live package container.
    if (npmTopologyProfile.omittedScopePolicy === 'exact-derived-empty-omitted-scopes') {
      for (const scope of derivedEmptyOmittedScopes.get(container) ?? []) {
        expectedEntries.add(scope);
        if (!scopes.has(scope)) scopes.set(scope, []);
      }
    }
    const binExpectations = containerBins.get(container);
    if (binExpectations !== undefined) {
      expectedEntries.add('.bin');
      expectedBinPaths.add(`${container}/.bin`);
    }
    if (container === 'node_modules') expectedEntries.add('.package-lock.json');
    const actualEntries = readDirectoryNamesBounded(
      containerPath,
      `installed package container ${container}`,
    ).sort();
    const wantedEntries = [...expectedEntries].sort();
    if (!exactJsonEqual(actualEntries, wantedEntries)) {
      const wantedDiagnostic = jsonDiagnosticString(JSON.stringify(wantedEntries), 768);
      const actualDiagnostic = jsonDiagnosticString(JSON.stringify(actualEntries), 768);
      fail(
        `installed package container inventory differs: ${container}; expected ` +
        `${wantedDiagnostic.encoded}${wantedDiagnostic.truncated ? ' (truncated)' : ''}; ` +
        `actual ${actualDiagnostic.encoded}${actualDiagnostic.truncated ? ' (truncated)' : ''}`,
      );
    }

    for (const [scope, expectedMembers] of scopes) {
      const scopePath = join(containerPath, scope);
      const scopeStats = lstatSync(scopePath);
      if (
        !scopeStats.isDirectory() || scopeStats.isSymbolicLink() ||
        realpathSync(scopePath) !== scopePath
      ) {
        fail(`installed package scope is not a canonical real directory: ${container}/${scope}`);
      }
      const actualMembers = readDirectoryNamesBounded(
        scopePath,
        `installed package scope ${container}/${scope}`,
      ).sort();
      if (!exactJsonEqual(actualMembers, [...expectedMembers].sort())) {
        fail(`installed package scope inventory differs: ${container}/${scope}`);
      }
    }

    for (const packageName of packageNames) {
      const packagePath = `${container}/${packageName}`;
      const packageRoot = join(consumer, ...packagePath.split('/'));
      const packageStats = lstatSync(packageRoot);
      if (
        !packageStats.isDirectory() || packageStats.isSymbolicLink() ||
        realpathSync(packageRoot) !== packageRoot
      ) {
        fail(`installed package is not a canonical real directory: ${packagePath}`);
      }
      const packageRecord = expectedPackages.get(packagePath);
      if (packageRecord === undefined) fail(`missing prepared package record for ${packagePath}`);
      const packageManifest = expectRecord(
        readStrictJson(join(packageRoot, 'package.json'), `installed ${packagePath} manifest`),
        `installed ${packagePath} manifest`,
      );
      if (
        packageManifest.name !== packageName ||
        packageManifest.version !== expectString(packageRecord.version, `${packagePath} version`)
      ) {
        fail(`installed package identity differs from the prepared lock: ${packagePath}`);
      }
    }

    if (binExpectations !== undefined) {
      const binPath = join(containerPath, '.bin');
      const binStats = lstatSync(binPath);
      if (!binStats.isDirectory() || binStats.isSymbolicLink() || realpathSync(binPath) !== binPath) {
        fail(`installed .bin is not a canonical real directory: ${container}`);
      }
      const actualBinNames = readDirectoryNamesBounded(
        binPath,
        `installed .bin ${container}`,
      ).sort();
      const expectedBinNames = [...binExpectations.keys()].sort();
      if (!exactJsonEqual(actualBinNames, expectedBinNames)) {
        fail(`installed .bin inventory differs: ${container}`);
      }
      for (const [binName, expectation] of binExpectations) {
        if (!isInside(nodeModules, expectation.providerRoot) ||
            !isInside(expectation.providerRoot, expectation.target)) {
          fail(`installed ${binName} bin expectation escapes its package closure`);
        }
        assertInstalledNodeBinShimAt(binPath, binName, expectation.target);
      }
    }
  }

  // Package payloads are otherwise opaque registry bytes. Traverse them only to
  // prove that no extra npm management subtree or metadata file is concealed at
  // an unmodeled depth (including beneath a package that should be a leaf).
  const pending = [nodeModules];
  let visitedEntries = 0;
  while (pending.length > 0) {
    const directory = pending.pop() ?? nodeModules;
    for (const name of readDirectoryNamesBounded(directory, `installed package tree ${directory}`)) {
      visitedEntries++;
      if (visitedEntries > MAX_TREE_ENTRIES) {
        fail('installed recursive package closure exceeds its filesystem-node bound');
      }
      const path = join(directory, name);
      const stats = lstatSync(path);
      const relativePath = relative(nodeModules, path).split(sep).join('/');
      const managementPath = `node_modules/${relativePath}`;
      if (name === 'node_modules' && !expectedManagementPaths.has(managementPath)) {
        fail(`installed package tree contains an unexpected node_modules path: ${managementPath}`);
      }
      if (name === '.bin' && !expectedBinPaths.has(managementPath)) {
        fail(`installed package tree contains an unexpected .bin path: ${managementPath}`);
      }
      if (name === '.package-lock.json' && managementPath !== 'node_modules/.package-lock.json') {
        fail(`installed package tree contains an unexpected hidden lock: ${managementPath}`);
      }
      if (stats.isDirectory() && !stats.isSymbolicLink()) pending.push(path);
    }
  }
}

/** Byte-, topology-, ownership-, and mode-bound seal used on both sides of inspection. */
export function fingerprintPackageSmokeWorkspace(
  workspace: string,
  requireFinalizedRoot = false,
  trustedTestHook?: PackageSmokeRegularFileTestHook,
): WorkspaceSeal {
  const canonicalRoot = realpathSync(workspace);
  if (canonicalRoot !== workspace) fail('workspace root is not canonical while sealing');
  const rootInitial = lstatSync(workspace, { bigint: true });
  if (!rootInitial.isDirectory() || rootInitial.isSymbolicLink()) {
    fail('workspace root must be one physical directory while sealing');
  }
  const initialRootMode = Number(rootInitial.mode & 0o7777n);
  if (requireFinalizedRoot && initialRootMode !== 0o555) {
    fail('workspace root does not have its finalized read-only mode while sealing');
  }
  const parentAncestry = inspectRuntimePathAncestry(workspace, 'package-smoke workspace');
  const pending = [''];
  const records: Array<Record<string, JsonValue>> = [];
  let entryCount = 0;
  let fileCount = 0;
  let byteCount = 0;
  while (pending.length > 0) {
    const directoryRelative = pending.pop() ?? '';
    const directory = directoryRelative ? join(workspace, directoryRelative) : workspace;
    const names = readDirectoryNamesBounded(
      directory,
      `package-smoke workspace directory ${directoryRelative || '<root>'}`,
    ).sort();
    for (const name of names) {
      const pathRelative = directoryRelative ? `${directoryRelative}/${name}` : name;
      if (pathRelative === STATE_FILENAME) continue;
      entryCount++;
      if (entryCount > MAX_TREE_ENTRIES) fail('package-smoke workspace exceeds the entry budget');
      const path = join(workspace, ...pathRelative.split('/'));
      const stats = lstatSync(path);
      const common = {
        path: pathRelative,
        mode: stats.mode & 0o7777,
        uid: stats.uid,
        gid: stats.gid,
      };
      if (stats.isDirectory()) {
        records.push({ type: 'directory', ...common });
        pending.push(pathRelative);
      } else if (stats.isSymbolicLink()) {
        const target = readlinkSync(path);
        if (Buffer.byteLength(target, 'utf8') > 4_096) fail(`oversized symlink target at ${pathRelative}`);
        const resolved = realpathSync(path);
        if (!isInside(workspace, resolved)) fail(`workspace symlink escapes its root: ${pathRelative}`);
        records.push({ type: 'symlink', target, ...common });
      } else if (stats.isFile()) {
        if (stats.nlink !== 1) fail(`workspace regular file is hard-linked: ${pathRelative}`);
        if (stats.size > MAX_WORKSPACE_FILE_BYTES) {
          fail(`workspace file exceeds its per-file byte budget: ${pathRelative}`);
        }
        byteCount += stats.size;
        fileCount++;
        if (byteCount > MAX_TREE_BYTES) fail('package-smoke workspace exceeds the byte budget');
        const digest = digestRegularFileStable(
          path,
          stats.size,
          `workspace file ${pathRelative}`,
          MAX_WORKSPACE_FILE_BYTES,
          trustedTestHook,
        );
        records.push({ type: 'file', digest, size: stats.size, ...common });
      } else {
        fail(`workspace contains a special file: ${pathRelative}`);
      }
    }
  }
  records.sort((left, right) => {
    const leftPath = String(left.path);
    const rightPath = String(right.path);
    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
  });
  const rootFinal = lstatSync(workspace, { bigint: true });
  const finalParentAncestry = inspectRuntimePathAncestry(workspace, 'package-smoke workspace');
  if (!sameRuntimeStat(rootInitial, rootFinal) ||
      !exactJsonEqual(parentAncestry, finalParentAncestry)) {
    fail('workspace root or parent ancestry changed while sealing');
  }
  const root: WorkspaceRootAuthority = {
    path: workspace,
    device: rootInitial.dev.toString(10),
    inode: rootInitial.ino.toString(10),
    mode: initialRootMode,
    uid: portableUnsignedBigInt(rootInitial.uid, 'workspace root uid'),
    gid: portableUnsignedBigInt(rootInitial.gid, 'workspace root gid'),
    linkCount: portableUnsignedBigInt(rootInitial.nlink, 'workspace root link count', 1n),
  };
  return {
    digest: sha256(canonicalize({ parentAncestry, records, root })),
    entryCount,
    fileCount,
    byteCount,
    root,
    parentAncestry,
  };
}

function makeWorkspaceReadOnly(workspace: string): boolean {
  if (process.platform === 'win32') return false;
  const pending = [workspace];
  const directories: string[] = [];
  let visitedEntries = 0;
  while (pending.length > 0) {
    const directory = pending.pop() ?? workspace;
    directories.push(directory);
    for (const name of readDirectoryNamesBounded(directory, `workspace directory ${directory}`)) {
      visitedEntries++;
      if (visitedEntries > MAX_TREE_ENTRIES) fail('workspace exceeds the read-only entry budget');
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isDirectory()) pending.push(path);
      else if (stats.isFile()) chmodSync(path, (stats.mode & 0o111) === 0 ? 0o444 : 0o555);
    }
  }
  for (const directory of directories.reverse()) {
    if (directory !== workspace) chmodSync(directory, 0o555);
  }
  return true;
}

function assertWorkspaceReadOnly(workspace: string, expected: boolean): void {
  if (!expected) return;
  const pending = [workspace];
  let visitedEntries = 0;
  while (pending.length > 0) {
    const directory = pending.pop() ?? workspace;
    const directoryStats = lstatSync(directory);
    if ((directoryStats.mode & 0o222) !== 0) fail(`workspace directory is writable: ${directory}`);
    for (const name of readDirectoryNamesBounded(directory, `workspace directory ${directory}`)) {
      visitedEntries++;
      if (visitedEntries > MAX_TREE_ENTRIES) fail('workspace exceeds the read-only entry budget');
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isDirectory()) pending.push(path);
      else if (!stats.isSymbolicLink() && (stats.mode & 0o222) !== 0) {
        fail(`workspace file is writable: ${path}`);
      }
    }
  }
}

function makeWorkspaceWritableForCleanup(workspace: string): void {
  if (process.platform === 'win32' || !existsSync(workspace)) return;
  const pending = [workspace];
  let visitedEntries = 0;
  while (pending.length > 0) {
    const directory = pending.pop() ?? workspace;
    chmodSync(directory, 0o755);
    for (const name of readDirectoryNamesBounded(directory, `workspace directory ${directory}`)) {
      visitedEntries++;
      if (visitedEntries > MAX_TREE_ENTRIES) fail('workspace exceeds the cleanup entry budget');
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isDirectory()) pending.push(path);
      else if (stats.isFile()) chmodSync(path, (stats.mode & 0o111) === 0 ? 0o644 : 0o755);
    }
  }
}

export const NETWORK_AND_WRITE_GUARD = String.raw`'use strict';
const denied = (authority) => {
  throw new Error('[cortexel package smoke] denied execute-phase authority: ' + authority);
};
const deny = (authority) => function deniedAuthority() { return denied(authority); };

const net = require('node:net');
net.connect = deny('net.connect');
net.createConnection = deny('net.createConnection');
net.Socket.prototype.connect = deny('net.Socket.connect');
const tls = require('node:tls');
tls.connect = deny('tls.connect');
const http = require('node:http');
http.request = deny('http.request');
http.get = deny('http.get');
const https = require('node:https');
https.request = deny('https.request');
https.get = deny('https.get');
const http2 = require('node:http2');
http2.connect = deny('http2.connect');
const dns = require('node:dns');
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'reverse']) {
  dns[name] = deny('dns.' + name);
}
const dnsPromises = require('node:dns/promises');
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'reverse']) {
  if (typeof dnsPromises[name] === 'function') dnsPromises[name] = deny('dns.promises.' + name);
  if (dns.promises && typeof dns.promises[name] === 'function') {
    dns.promises[name] = deny('dns.promises.' + name);
  }
}
const dgram = require('node:dgram');
dgram.createSocket = deny('dgram.createSocket');
if (typeof globalThis.fetch === 'function') globalThis.fetch = deny('fetch');
if (typeof globalThis.WebSocket === 'function') globalThis.WebSocket = deny('WebSocket');

const childProcess = require('node:child_process');
for (const name of ['exec', 'execFile', 'execFileSync', 'execSync', 'fork', 'spawn', 'spawnSync']) {
  childProcess[name] = deny('child_process.' + name);
}
if (typeof childProcess.ChildProcess?.prototype?.spawn === 'function') {
  childProcess.ChildProcess.prototype.spawn =
    deny('child_process.ChildProcess.prototype.spawn');
}
if (typeof process.execve === 'function') {
  process.execve = deny('process.execve');
}

const fs = require('node:fs');
for (const name of [
  'appendFile', 'appendFileSync', 'chmod', 'chmodSync', 'chown', 'chownSync',
  'copyFile', 'copyFileSync', 'cp', 'cpSync', 'createWriteStream', 'fchmod', 'fchmodSync',
  'fchown', 'fchownSync', 'fdatasync', 'fdatasyncSync', 'ftruncate', 'ftruncateSync',
  'fsync', 'fsyncSync', 'futimes', 'futimesSync', 'link', 'linkSync', 'lchown',
  'lchownSync', 'lutimes',
  'lutimesSync', 'mkdir', 'mkdirSync', 'mkdtemp', 'mkdtempSync', 'rename', 'renameSync',
  'rm', 'rmSync', 'rmdir', 'rmdirSync', 'symlink', 'symlinkSync', 'truncate',
  'truncateSync', 'unlink', 'unlinkSync', 'utimes', 'utimesSync', 'write', 'writeFile',
  'writeFileSync', 'writeSync', 'writev', 'writevSync',
]) {
  if (typeof fs[name] === 'function') fs[name] = deny('fs.' + name);
}
const writeMask = fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_APPEND |
  fs.constants.O_CREAT | fs.constants.O_TRUNC;
const isWriteFlag = (flags) => typeof flags === 'number'
  ? (flags & writeMask) !== 0
  : typeof flags !== 'string' || /[wa+]/u.test(flags);
const originalOpen = fs.open;
const originalOpenSync = fs.openSync;
fs.open = function guardedOpen(path, flags, ...rest) {
  if (isWriteFlag(flags)) return denied('fs.open(write)');
  return originalOpen.call(this, path, flags, ...rest);
};
fs.openSync = function guardedOpenSync(path, flags, ...rest) {
  if (isWriteFlag(flags)) return denied('fs.openSync(write)');
  return originalOpenSync.call(this, path, flags, ...rest);
};
const promiseSurfaces = [...new Set([fs.promises, require('node:fs/promises')].filter(Boolean))];
for (const promises of promiseSurfaces) {
  for (const name of [
    'appendFile', 'chmod', 'chown', 'copyFile', 'cp', 'lchmod', 'lchown', 'link',
    'lutimes', 'mkdir', 'mkdtemp', 'rename', 'rm', 'rmdir', 'symlink', 'truncate',
    'unlink', 'utimes', 'writeFile',
  ]) {
    if (typeof promises[name] === 'function') promises[name] = deny('fs.promises.' + name);
  }
  const originalPromiseOpen = promises.open.bind(promises);
  promises.open = async function guardedPromiseOpen(path, flags, ...rest) {
    if (isWriteFlag(flags)) return Promise.reject(new Error(
      '[cortexel package smoke] denied execute-phase authority: fs.promises.open(write)',
    ));
    const handle = await originalPromiseOpen(path, flags, ...rest);
    for (const name of [
      'appendFile', 'chmod', 'chown', 'createWriteStream', 'datasync', 'sync', 'truncate',
      'utimes', 'write', 'writeFile', 'writev',
    ]) {
      if (typeof handle[name] === 'function') handle[name] = deny('FileHandle.' + name);
    }
    return handle;
  };
}
require('node:module').syncBuiltinESMExports();
`;

function artifactBoundFixtureLock(
  exactFixtureLockValue: JsonValue,
  artifactIntegrity: string,
): JsonValue {
  assertSri512(artifactIntegrity, 'prepared artifact integrity');
  const derivedLock = structuredClone(exactFixtureLockValue);
  const derivedPackages = expectRecord(
    expectRecord(derivedLock, 'package-smoke fixture lock').packages,
    'package-smoke fixture lock packages',
  );
  const derivedCortexel = expectRecord(
    derivedPackages['node_modules/cortexel'],
    'package-smoke fixture Cortexel lock entry',
  );
  if (Object.hasOwn(derivedCortexel, 'integrity')) {
    fail('committed fixture lock unexpectedly pre-binds a mutable local artifact');
  }
  derivedCortexel.integrity = artifactIntegrity;
  return derivedLock;
}

/**
 * Accepts only a completely verified final materialization. npm deliberately
 * exits zero when an optional dependency download fails, so the full peer
 * profile may reuse its private cache for one bounded second attempt. A command
 * or runtime-authority failure is never retryable, and two validation failures
 * retain both causes.
 */
export function runVerifiedPackageMaterialization(
  materialize: (attempt: 1 | 2) => unknown,
  verify: () => unknown,
  maximumAttempts: 1 | 2,
  authorizeRetry: (failure: unknown) => unknown,
): void {
  if (maximumAttempts !== 1 && maximumAttempts !== 2) {
    fail('package materialization attempt bound is outside its closed profile');
  }
  const materializeSynchronously = (attempt: 1 | 2): void => {
    const result = materialize(attempt);
    if (isPotentiallyAsynchronousResult(result)) {
      fail('package materialization command callback must be synchronous');
    }
    if (result !== undefined) {
      fail('package materialization command callback must return undefined');
    }
  };
  const verifySynchronously = (): void => {
    const result = verify();
    if (isPotentiallyAsynchronousResult(result)) {
      fail('package materialization verification callback must be synchronous');
    }
    if (result !== undefined) {
      fail('package materialization verification callback must return undefined');
    }
  };
  materializeSynchronously(1);
  try {
    verifySynchronously();
    return;
  } catch (firstValidationFailure) {
    if (maximumAttempts === 1) throw firstValidationFailure;
    let retryAuthorized: boolean;
    try {
      const retryDecision = authorizeRetry(firstValidationFailure);
      if (isPotentiallyAsynchronousResult(retryDecision)) {
        fail('package materialization retry authority callback must be synchronous');
      }
      if (typeof retryDecision !== 'boolean') {
        fail('package materialization retry authority returned a non-boolean decision');
      }
      retryAuthorized = retryDecision;
    } catch (retryAuthorityFailure) {
      throw new AggregateError(
        [firstValidationFailure, retryAuthorityFailure],
        'package materialization validation failed and retry authority could not be established',
      );
    }
    if (!retryAuthorized) throw firstValidationFailure;
    try {
      materializeSynchronously(2);
    } catch (secondMaterializationFailure) {
      throw new AggregateError(
        [firstValidationFailure, secondMaterializationFailure],
        'package materialization validation failed before the bounded retry command failed',
      );
    }
    try {
      verifySynchronously();
    } catch (secondValidationFailure) {
      throw new AggregateError(
        [firstValidationFailure, secondValidationFailure],
        'package materialization validation failed across both bounded attempts',
      );
    }
  }
}

function prepareConsumer(
  consumer: string,
  tarballPath: string,
  artifact: Buffer,
  artifactIntegrity: string,
  exactFixtureLockValue: JsonValue,
  exactFixtureManifestRaw: Buffer,
  expectedFiles: readonly ExpectedPackageFile[],
  npmConfigs: PackageSmokeNpmConfigPaths,
  nodeExecutable: string,
  npmExecutable: string,
  profile: PackageSmokeConsumerProfile,
  npmVersion: string,
  runtime: NodeRuntimeIdentity,
): void {
  reviewedNpmTopologyProfile(npmVersion);
  const {
    commandPolicy,
    maximumMaterializationAttempts,
    npmCacheRole,
    omittedDependencyClasses,
  } = profile;
  assertClosedPackageSmokeCommandPolicy(commandPolicy);
  const environment = commandEnvironment;
  const npmCacheAuthorities = commandNpmCacheAuthorities;
  if (environment === undefined || npmCacheAuthorities === undefined) {
    fail('package materialization cache authority is not initialized');
  }
  const npmCacheAuthority = npmCacheAuthorities[npmCacheRole];
  mkdirSync(consumer, { mode: 0o755 });
  writeFileSync(join(consumer, 'package.json'), exactFixtureManifestRaw, {
    flag: 'wx',
    mode: 0o644,
  });
  const derivedLock = artifactBoundFixtureLock(exactFixtureLockValue, artifactIntegrity);
  const derivedLockRaw = Buffer.from(`${canonicalize(derivedLock)}\n`, 'utf8');
  const consumerLockPath = join(consumer, 'package-lock.json');
  writeFileSync(consumerLockPath, derivedLockRaw, {
    flag: 'wx',
    mode: 0o644,
  });
  const localTarballPath = join(consumer, LOCAL_TARBALL_FILENAME);
  copyFileSync(tarballPath, localTarballPath, fsConstants.COPYFILE_EXCL);
  // Normalize after owner-only/exclusive creation semantics so ambient umask
  // cannot alter the exact npm input profile.
  chmodSync(join(consumer, 'package.json'), 0o644);
  chmodSync(consumerLockPath, 0o644);
  chmodSync(localTarballPath, 0o644);
  const assertInputAuthority = (label: string): void => {
    assertPackageMaterializationInputAuthority({
      artifact,
      artifactPath: tarballPath,
      artifactIntegrity,
      consumer,
      exactFixtureLockRaw: derivedLockRaw,
      exactFixtureManifestRaw,
      npmConfigs,
      npmCacheAuthority,
      label,
    });
  };
  const assertActiveInputAuthority = (label: string): void => {
    const environment = commandEnvironment;
    if (environment === undefined) {
      fail(`${label} has no active command environment`);
    }
    const userConfig = environment.npm_config_userconfig;
    const globalConfig = environment.npm_config_globalconfig;
    if (userConfig === undefined || globalConfig === undefined) {
      fail(`${label} has no exact npm configuration authority`);
    }
    assertPackageSmokeNpmConfigIdentity(
      { userConfig, globalConfig },
      npmConfigs,
      label,
    );
    assertPackageSmokeNpmCacheIdentity(
      environment.npm_config_cache,
      npmCacheAuthority,
      `${label} ${npmCacheRole}`,
    );
    assertPackageSmokeNpmCacheRoleActive(
      environment,
      npmCacheAuthorities,
      npmCacheRole,
      `${label} ${npmCacheRole}`,
    );
    assertInputAuthority(label);
  };
  const npmCiArguments = [
    ...NPM_CI_FLAGS,
    ...omittedDependencyClasses.map((dependencyClass) => `--omit=${dependencyClass}`),
  ];
  activatePackageSmokeNpmCache(
    environment,
    npmCacheAuthorities,
    npmCacheRole,
    `initial ${npmCacheRole} materialization`,
  );
  runVerifiedPackageMaterialization(
    (attempt) => {
      assertActiveInputAuthority(
        `materialization attempt ${attempt} immediate pre-command authority`,
      );
      runNpmCommand(
        nodeExecutable,
        npmExecutable,
        npmCiArguments,
        consumer,
        commandPolicy,
      );
    },
    () => {
      assertInputAuthority('post-materialization');
      verifyInstalledPackageClosure(join(consumer, 'node_modules', 'cortexel'), expectedFiles);
      assertInstalledRecursivePackageClosure(
        consumer,
        derivedLock,
        omittedDependencyClasses,
        npmVersion,
        runtime,
      );
    },
    maximumMaterializationAttempts,
    (failure) => {
      if (!(failure instanceof RetryableOptionalMaterializationGapError)) return false;
      assertActiveInputAuthority('package materialization retry authorization');
      return true;
    },
  );
  completePackageSmokeNpmCacheRole(
    environment,
    npmCacheAuthorities,
    npmCacheRole,
    `completed ${npmCacheRole} materialization`,
  );
}

function assertPreparedConsumerClosures(options: {
  readonly artifact: Buffer;
  readonly artifactIntegrity: string;
  readonly chartsConsumer: string;
  readonly consumer: string;
  readonly coreConsumer: string;
  readonly expectedFiles: readonly ExpectedPackageFile[];
  readonly exactFixtureLockValue: JsonValue;
  readonly exactFixtureManifestRaw: Buffer;
  readonly npmVersion: string;
  readonly runtime: NodeRuntimeIdentity;
  readonly permissionPhase: 'prepared-writable' | 'finalized-read-only';
}): void {
  if (sha512Integrity(options.artifact) !== options.artifactIntegrity) {
    fail('semantic consumer revalidation received artifact bytes with the wrong integrity');
  }
  reviewedNpmTopologyProfile(options.npmVersion);
  const expectedLock = artifactBoundFixtureLock(
    options.exactFixtureLockValue,
    options.artifactIntegrity,
  );
  const expectedLockRaw = `${canonicalize(expectedLock)}\n`;
  const expectedMode = options.permissionPhase === 'prepared-writable' ? 0o644 : 0o444;
  const consumers = [
    [options.coreConsumer, ['dev', 'optional']],
    [options.chartsConsumer, ['optional']],
    [options.consumer, []],
  ] as const satisfies readonly [string, readonly OmittedDependencyClass[]][];
  for (const [consumer, omittedDependencyClasses] of consumers) {
    const lockPath = join(consumer, 'package-lock.json');
    const lockRaw = readExactIntentFile(
      lockPath,
      expectedLockRaw,
      expectedMode,
      `artifact-bound consumer lock ${consumer}`,
    );
    const installedLock = parseCanonicalJsonBuffer(
      lockRaw,
      `artifact-bound consumer lock ${consumer}`,
    );
    if (!exactJsonEqual(installedLock, expectedLock)) {
      fail(`consumer lock differs from the exact artifact-bound fixture: ${consumer}`);
    }
    readExactIntentFile(
      join(consumer, 'package.json'),
      options.exactFixtureManifestRaw,
      expectedMode,
      `artifact-bound consumer manifest ${consumer}`,
    );
    readExactIntentFile(
      join(consumer, LOCAL_TARBALL_FILENAME),
      options.artifact,
      expectedMode,
      `artifact-bound consumer tarball ${consumer}`,
    );
    verifyInstalledPackageClosure(
      join(consumer, 'node_modules', 'cortexel'),
      options.expectedFiles,
      options.permissionPhase,
    );
    assertInstalledRecursivePackageClosure(
      consumer,
      installedLock,
      omittedDependencyClasses,
      options.npmVersion,
      options.runtime,
    );
  }
}

function parsePackedResult(value: JsonValue): PackedResult {
  const record = expectRecord(value, 'prepared npm pack result');
  exactKeys(
    record,
    [
      'name',
      'version',
      'size',
      'unpackedSize',
      'shasum',
      'integrity',
      'filename',
      'files',
      'entryCount',
    ],
    'prepared npm pack result',
  );
  const filesValue = record.files;
  if (!Array.isArray(filesValue) || filesValue.length === 0) fail('prepared pack inventory is empty');
  const files: PackedFile[] = filesValue.map((candidate, index) => {
    const file = expectRecord(candidate, `prepared pack file ${index}`);
    exactKeys(file, ['path', 'size', 'mode'], `prepared pack file ${index}`);
    return {
      path: expectString(file.path, `prepared pack file ${index} path`),
      size: expectInteger(file.size, `prepared pack file ${index} size`),
      mode: expectInteger(file.mode, `prepared pack file ${index} mode`),
    };
  });
  return {
    name: expectString(record.name, 'prepared pack name'),
    version: expectString(record.version, 'prepared pack version'),
    size: expectInteger(record.size, 'prepared pack size'),
    unpackedSize: expectInteger(record.unpackedSize, 'prepared pack unpacked size'),
    shasum: expectString(record.shasum, 'prepared pack shasum'),
    integrity: expectString(record.integrity, 'prepared pack integrity'),
    filename: expectString(record.filename, 'prepared pack filename'),
    files,
    entryCount: expectInteger(record.entryCount, 'prepared pack entry count'),
  };
}

function readPackedResultStable(path: string): { readonly packed: PackedResult; readonly raw: Buffer } {
  const raw = readRegularFileStable(
    path,
    undefined,
    'prepared npm pack result',
    MAX_JSON_BYTES,
  );
  return {
    packed: parsePackedResult(parseCanonicalJsonBuffer(raw, 'prepared npm pack result')),
    raw,
  };
}

function expectBoundedInteger(
  value: JsonValue | undefined,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = expectInteger(value, label);
  if (parsed < minimum || parsed > maximum) fail(`${label} is outside its bound`);
  return parsed;
}

function expectSha256(value: JsonValue | undefined, label: string): string {
  const parsed = expectString(value, label);
  if (!/^sha256:[0-9a-f]{64}$/u.test(parsed)) fail(`${label} is not canonical SHA-256`);
  return parsed;
}

function expectUnsignedDecimal(value: JsonValue | undefined, label: string): string {
  const parsed = expectString(value, label);
  if (!/^(?:0|[1-9][0-9]{0,39})$/u.test(parsed)) {
    fail(`${label} is not one bounded canonical unsigned decimal`);
  }
  return parsed;
}

function parseRuntimeFileAuthority(value: JsonValue | undefined, label: string): RuntimeFileAuthority {
  const record = expectRecord(value, label);
  exactKeys(record, [
    'path',
    'sha256',
    'size',
    'mode',
    'uid',
    'gid',
    'linkCount',
    'device',
    'inode',
    'mtimeNs',
    'ctimeNs',
    'birthtimeNs',
  ], label);
  const path = expectString(record.path, `${label} path`);
  if (!isAbsolute(path) || resolve(path) !== path || Buffer.byteLength(path, 'utf8') >
      NPM_AUTHORITY_LIMITS.pathBytes) {
    fail(`${label} path is not one bounded normalized absolute path`);
  }
  const linkCount = expectBoundedInteger(record.linkCount, `${label} linkCount`, 1, 1);
  return {
    path,
    sha256: expectSha256(record.sha256, `${label} sha256`),
    size: expectBoundedInteger(record.size, `${label} size`, 1, MAX_RUNTIME_EXECUTABLE_BYTES),
    mode: expectBoundedInteger(record.mode, `${label} mode`, 0, 0o7777),
    uid: expectBoundedInteger(record.uid, `${label} uid`, 0, Number.MAX_SAFE_INTEGER),
    gid: expectBoundedInteger(record.gid, `${label} gid`, 0, Number.MAX_SAFE_INTEGER),
    linkCount: linkCount as 1,
    device: expectUnsignedDecimal(record.device, `${label} device`),
    inode: expectUnsignedDecimal(record.inode, `${label} inode`),
    mtimeNs: expectUnsignedDecimal(record.mtimeNs, `${label} mtimeNs`),
    ctimeNs: expectUnsignedDecimal(record.ctimeNs, `${label} ctimeNs`),
    birthtimeNs: expectUnsignedDecimal(record.birthtimeNs, `${label} birthtimeNs`),
  };
}

function parseRuntimeAncestry(value: JsonValue | undefined, label: string): RuntimePathAncestry {
  const record = expectRecord(value, label);
  exactKeys(record, ['sha256', 'entryCount'], label);
  return {
    sha256: expectSha256(record.sha256, `${label} sha256`),
    entryCount: expectBoundedInteger(
      record.entryCount,
      `${label} entryCount`,
      1,
      NPM_AUTHORITY_LIMITS.depth,
    ),
  };
}

function parseNpmTreeAuthority(value: JsonValue | undefined): NpmPackageTreeAuthority {
  const label = 'prepared npm package tree authority';
  const record = expectRecord(value, label);
  exactKeys(record, [
    'schema',
    'sha256',
    'entryCount',
    'directoryCount',
    'fileCount',
    'symlinkCount',
    'byteCount',
  ], label);
  if (record.schema !== NPM_TREE_SCHEMA) fail('prepared npm package tree schema is unsupported');
  const entryCount = expectBoundedInteger(record.entryCount, `${label} entryCount`, 1,
    NPM_AUTHORITY_LIMITS.entries);
  const directoryCount = expectBoundedInteger(record.directoryCount, `${label} directoryCount`, 1,
    entryCount);
  const fileCount = expectBoundedInteger(record.fileCount, `${label} fileCount`, 1, entryCount);
  const symlinkCount = expectBoundedInteger(record.symlinkCount, `${label} symlinkCount`, 0,
    entryCount);
  if (directoryCount + fileCount + symlinkCount !== entryCount) {
    fail('prepared npm package tree counts are inconsistent');
  }
  return {
    schema: NPM_TREE_SCHEMA,
    sha256: expectSha256(record.sha256, `${label} sha256`),
    entryCount,
    directoryCount,
    fileCount,
    symlinkCount,
    byteCount: expectBoundedInteger(record.byteCount, `${label} byteCount`, 1,
      NPM_AUTHORITY_LIMITS.totalBytes),
  };
}

function parsePackageRuntimeAuthority(value: JsonValue | undefined): PackageRuntimeAuthority {
  const record = expectRecord(value, 'prepared package runtime authority');
  exactKeys(record, ['scope', 'node', 'npm'], 'prepared package runtime authority');
  if (record.scope !== RUNTIME_AUTHORITY_SCOPE) fail('prepared runtime authority scope is unsupported');
  const nodeRecord = expectRecord(record.node, 'prepared Node executable authority');
  exactKeys(nodeRecord, ['executable', 'version', 'runtime', 'file', 'ancestry'],
    'prepared Node executable authority');
  const nodeExecutable = expectString(nodeRecord.executable, 'prepared Node executable');
  const nodeFile = parseRuntimeFileAuthority(nodeRecord.file, 'prepared Node executable file');
  const nodeVersion = expectString(nodeRecord.version, 'prepared Node version');
  if (nodeFile.path !== nodeExecutable || !/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(
    nodeVersion,
  )) {
    fail('prepared Node executable authority is internally inconsistent');
  }
  assertSupportedNodeVersion(nodeVersion);
  const runtimeRecord = expectRecord(nodeRecord.runtime, 'prepared Node runtime identity');
  exactKeys(runtimeRecord, ['platform', 'arch'], 'prepared Node runtime identity');
  const runtimePlatform = expectString(runtimeRecord.platform, 'prepared Node platform');
  const runtimeArch = expectString(runtimeRecord.arch, 'prepared Node architecture');
  if (
    (runtimePlatform !== 'darwin' && runtimePlatform !== 'linux') ||
    !/^[a-z0-9][a-z0-9_-]{0,31}$/u.test(runtimeArch)
  ) {
    fail('prepared Node runtime identity is outside the supported POSIX domain');
  }
  const npmRecord = expectRecord(record.npm, 'prepared npm package authority');
  exactKeys(npmRecord, [
    'root',
    'cli',
    'version',
    'packageJsonSha256',
    'cliFile',
    'ancestry',
    'tree',
  ], 'prepared npm package authority');
  const npmRoot = expectString(npmRecord.root, 'prepared npm root');
  const npmCli = expectString(npmRecord.cli, 'prepared npm CLI');
  const npmCliFile = parseRuntimeFileAuthority(npmRecord.cliFile, 'prepared npm CLI file');
  const npmVersion = expectString(npmRecord.version, 'prepared npm version');
  if (
    !isAbsolute(npmRoot) || resolve(npmRoot) !== npmRoot ||
    npmCli !== join(npmRoot, 'bin', 'npm-cli.js') || npmCliFile.path !== npmCli
  ) {
    fail('prepared npm package authority paths are inconsistent');
  }
  reviewedNpmTopologyProfile(npmVersion);
  return {
    scope: RUNTIME_AUTHORITY_SCOPE,
    node: {
      executable: nodeExecutable,
      version: nodeVersion,
      runtime: {
        platform: runtimePlatform,
        arch: runtimeArch,
      },
      file: nodeFile,
      ancestry: parseRuntimeAncestry(nodeRecord.ancestry, 'prepared Node ancestry'),
    },
    npm: {
      root: npmRoot,
      cli: npmCli,
      version: npmVersion,
      packageJsonSha256: expectSha256(
        npmRecord.packageJsonSha256,
        'prepared npm packageJsonSha256',
      ),
      cliFile: npmCliFile,
      ancestry: parseRuntimeAncestry(npmRecord.ancestry, 'prepared npm ancestry'),
      tree: parseNpmTreeAuthority(npmRecord.tree),
    },
  };
}

function parseWorkspaceRootAuthority(
  value: JsonValue | undefined,
  workspace: string,
): WorkspaceRootAuthority {
  const label = 'prepared workspace root authority';
  const record = expectRecord(value, label);
  exactKeys(record, [
    'path',
    'device',
    'inode',
    'mode',
    'uid',
    'gid',
    'linkCount',
  ], label);
  if (record.path !== workspace || record.mode !== 0o555) {
    fail('prepared workspace root authority path or finalized mode is invalid');
  }
  return {
    path: workspace,
    device: expectUnsignedDecimal(record.device, `${label} device`),
    inode: expectUnsignedDecimal(record.inode, `${label} inode`),
    mode: 0o555,
    uid: expectBoundedInteger(record.uid, `${label} uid`, 0, Number.MAX_SAFE_INTEGER),
    gid: expectBoundedInteger(record.gid, `${label} gid`, 0, Number.MAX_SAFE_INTEGER),
    linkCount: expectBoundedInteger(record.linkCount, `${label} linkCount`, 1,
      Number.MAX_SAFE_INTEGER),
  };
}

export function parseTypeScriptConsumerCheck(
  value: JsonValue | undefined,
  workspaceSealDigest: string,
): TypeScriptConsumerCheck {
  const label = 'prepared TypeScript consumer check';
  if (!/^sha256:[0-9a-f]{64}$/u.test(workspaceSealDigest)) {
    fail(`${label} received an invalid workspace seal digest`);
  }
  const record = expectRecord(value, label);
  exactKeys(record, [
    'profile',
    'compiler',
    'argv',
    'cwd',
    'workspaceSealDigest',
    'result',
  ], label);
  const compiler = expectRecord(record.compiler, `${label} compiler`);
  exactKeys(compiler, ['name', 'version', 'bin'], `${label} compiler`);
  const result = expectRecord(record.result, `${label} result`);
  exactKeys(
    result,
    ['status', 'signal', 'stdoutBytes', 'stderrBytes'],
    `${label} result`,
  );
  if (
    record.profile !== TYPESCRIPT_CHECK_PROFILE ||
    compiler.name !== 'typescript' ||
    compiler.version !== EXPECTED_DEV_DEPENDENCIES.typescript ||
    compiler.bin !== TYPESCRIPT_CHECK_COMPILER_BIN ||
    !exactJsonEqual(record.argv, TYPESCRIPT_CHECK_ARGUMENTS) ||
    record.cwd !== TYPESCRIPT_CHECK_CWD ||
    record.workspaceSealDigest !== workspaceSealDigest ||
    result.status !== 0 ||
    result.signal !== null ||
    result.stdoutBytes !== 0 ||
    result.stderrBytes !== 0
  ) {
    fail('prepared TypeScript consumer check differs from the exact sealed success profile');
  }
  return {
    profile: TYPESCRIPT_CHECK_PROFILE,
    compiler: {
      name: 'typescript',
      version: EXPECTED_DEV_DEPENDENCIES.typescript,
      bin: TYPESCRIPT_CHECK_COMPILER_BIN,
    },
    argv: TYPESCRIPT_CHECK_ARGUMENTS,
    cwd: TYPESCRIPT_CHECK_CWD,
    workspaceSealDigest,
    result: {
      status: 0,
      signal: null,
      stdoutBytes: 0,
      stderrBytes: 0,
    },
  };
}

function validatePreparedState(value: JsonValue, workspace: string): PreparedState {
  const record = expectRecord(value, 'prepared package-smoke state');
  exactKeys(
    record,
    [
      'schema',
      'workspace',
      'platform',
      'arch',
      'packageVersion',
      'artifactIntegrity',
      'artifactSha256',
      'fixtureManifestSha256',
      'fixtureLockSha256',
      'packResultSha256',
      'runtimeAuthority',
      'coreConsumer',
      'chartsConsumer',
      'consumer',
      'unrelatedDirectory',
      'nodeModules',
      'typescriptCheck',
      'workspaceSeal',
      'readOnlyWorkspace',
    ],
    'prepared package-smoke state',
  );
  if (
    record.schema !== PREPARED_STATE_SCHEMA ||
    record.workspace !== workspace ||
    record.platform !== process.platform ||
    record.arch !== process.arch ||
    record.fixtureManifestSha256 !== EXPECTED_FIXTURE_MANIFEST_SHA256 ||
    record.fixtureLockSha256 !== EXPECTED_FIXTURE_LOCK_SHA256 ||
    record.readOnlyWorkspace !== true
  ) {
    fail('prepared package-smoke state identity does not match this execution');
  }
  const expectedCore = join(workspace, 'core-consumer');
  const expectedCharts = join(workspace, 'charts-consumer');
  const expectedConsumer = join(workspace, 'consumer');
  const expectedUnrelated = join(workspace, 'unrelated-working-directory');
  const nodeModulesValue = record.nodeModules;
  if (
    record.coreConsumer !== expectedCore ||
    record.chartsConsumer !== expectedCharts ||
    record.consumer !== expectedConsumer ||
    record.unrelatedDirectory !== expectedUnrelated ||
    !Array.isArray(nodeModulesValue) ||
    nodeModulesValue.length !== 3 ||
    nodeModulesValue[0] !== join(expectedCore, 'node_modules') ||
    nodeModulesValue[1] !== join(expectedCharts, 'node_modules') ||
    nodeModulesValue[2] !== join(expectedConsumer, 'node_modules')
  ) {
    fail('prepared package-smoke state paths are invalid');
  }
  const sealValue = expectRecord(record.workspaceSeal, 'prepared workspace seal');
  exactKeys(
    sealValue,
    ['digest', 'entryCount', 'fileCount', 'byteCount', 'root', 'parentAncestry'],
    'prepared workspace seal',
  );
  const digest = expectString(sealValue.digest, 'prepared workspace digest');
  if (!/^sha256:[0-9a-f]{64}$/u.test(digest)) fail('prepared workspace digest is invalid');
  const state: PreparedState = {
    schema: PREPARED_STATE_SCHEMA,
    workspace,
    platform: process.platform,
    arch: expectString(record.arch, 'prepared architecture'),
    packageVersion: expectString(record.packageVersion, 'prepared package version'),
    artifactIntegrity: expectString(record.artifactIntegrity, 'prepared artifact integrity'),
    artifactSha256: expectString(record.artifactSha256, 'prepared artifact SHA-256'),
    fixtureManifestSha256: EXPECTED_FIXTURE_MANIFEST_SHA256,
    fixtureLockSha256: EXPECTED_FIXTURE_LOCK_SHA256,
    packResultSha256: expectString(record.packResultSha256, 'prepared pack result SHA-256'),
    runtimeAuthority: parsePackageRuntimeAuthority(record.runtimeAuthority),
    coreConsumer: expectedCore,
    chartsConsumer: expectedCharts,
    consumer: expectedConsumer,
    unrelatedDirectory: expectedUnrelated,
    nodeModules: [
      join(expectedCore, 'node_modules'),
      join(expectedCharts, 'node_modules'),
      join(expectedConsumer, 'node_modules'),
    ],
    typescriptCheck: parseTypeScriptConsumerCheck(record.typescriptCheck, digest),
    workspaceSeal: {
      digest,
      entryCount: expectInteger(sealValue.entryCount, 'prepared workspace entry count'),
      fileCount: expectInteger(sealValue.fileCount, 'prepared workspace file count'),
      byteCount: expectInteger(sealValue.byteCount, 'prepared workspace byte count'),
      root: parseWorkspaceRootAuthority(sealValue.root, workspace),
      parentAncestry: parseRuntimeAncestry(
        sealValue.parentAncestry,
        'prepared workspace parent ancestry',
      ),
    },
    readOnlyWorkspace: record.readOnlyWorkspace,
  };
  for (const digestValue of [state.artifactSha256, state.packResultSha256]) {
    if (!/^sha256:[0-9a-f]{64}$/u.test(digestValue)) fail('prepared state has an invalid SHA-256');
  }
  assertSri512(state.artifactIntegrity, 'prepared artifact integrity');
  return state;
}

function readAndVerifyPreparedState(
  workspace: string,
  expectedStateDigest: string,
  requestedNodeExecutable?: string,
): {
  readonly state: PreparedState;
  readonly packed: PackedResult;
  readonly stateFileAuthority: RuntimeFileAuthority;
} {
  resetPackageSmokeNpmCacheSession();
  commandNodeAuthority = undefined;
  commandRuntimeAuthority = undefined;
  commandNpmCacheAuthorities = undefined;
  if (!isAbsolute(workspace) || realpathSync(workspace) !== workspace) {
    fail('execute workspace must be an existing canonical absolute directory');
  }
  const fixture = validateFixtureSources();
  const statePath = join(workspace, STATE_FILENAME);
  if (!/^sha256:[0-9a-f]{64}$/u.test(expectedStateDigest)) {
    fail('expected prepared-state digest is invalid');
  }
  const stateFileAuthority = inspectPreparedStateFileAuthority(
    workspace,
    expectedStateDigest,
  );
  const stateRaw = readRegularFileStable(
    statePath,
    undefined,
    'prepared package-smoke state',
    MAX_JSON_BYTES,
  );
  if (sha256(stateRaw) !== expectedStateDigest) {
    fail('prepared-state digest differs from the prepare output');
  }
  const state = validatePreparedState(
    parseCanonicalJsonBuffer(stateRaw, 'prepared package-smoke state'),
    workspace,
  );
  const preparedNode = state.runtimeAuthority.node;
  const canonicalNode = resolveExecutable(
    requestedNodeExecutable ?? preparedNode.executable,
    'node',
    'Node executable',
  );
  if (canonicalNode !== preparedNode.executable) fail('execute Node differs from prepared Node');
  assertPackageRuntimeAuthority(state.runtimeAuthority, 'pre-execute');
  commandNodeAuthority = {
    executable: preparedNode.executable,
    file: preparedNode.file,
    ancestry: preparedNode.ancestry,
  };
  commandRuntimeAuthority = state.runtimeAuthority;
  assertWorkspaceReadOnly(workspace, state.readOnlyWorkspace);
  assertPackageSmokeOperationalDirectories(workspace);
  commandEnvironment = packageSmokeEnvironment(
    canonicalNode,
    workspace,
    process.env,
    process.platform,
    'execute',
  );
  assertPreparedNodeRuntimeIdentity(
    nodeRuntimeIdentity(canonicalNode),
    preparedNode.runtime,
    'pre-closure execute',
  );
  const artifactPath = join(workspace, 'artifact', LOCAL_TARBALL_FILENAME);
  const artifactStats = lstatSync(artifactPath);
  const artifact = readRegularFileStable(
    artifactPath,
    artifactStats.size,
    'prepared Cortexel package tarball',
    PACKAGE_TARBALL_LIMITS.compressedBytes,
  );
  if (sha256(artifact) !== state.artifactSha256 || sha512Integrity(artifact) !== state.artifactIntegrity) {
    fail('prepared Cortexel artifact bytes changed');
  }
  const packResultPath = join(workspace, PACK_RESULT_FILENAME);
  const { packed, raw: packResultRaw } = readPackedResultStable(packResultPath);
  if (sha256(packResultRaw) !== state.packResultSha256) {
    fail('prepared npm pack inventory changed');
  }
  if (
    packed.version !== state.packageVersion ||
    packed.integrity !== state.artifactIntegrity ||
    packed.name !== 'cortexel'
  ) {
    fail('prepared npm pack inventory differs from prepared state');
  }
  const expectedFiles = expectedPackageClosure(fixture.packageJson);
  inspectNpmPackageTarball(artifact, packed, expectedFiles);
  const observedSeal = fingerprintPackageSmokeWorkspace(workspace, true);
  if (!exactJsonEqual(observedSeal, state.workspaceSeal)) fail('prepared workspace seal mismatch');
  assertPreparedConsumerClosures({
    artifact,
    artifactIntegrity: state.artifactIntegrity,
    chartsConsumer: state.chartsConsumer,
    consumer: state.consumer,
    coreConsumer: state.coreConsumer,
    exactFixtureLockValue: fixture.lock,
    exactFixtureManifestRaw: fixture.manifestRaw,
    expectedFiles,
    npmVersion: state.runtimeAuthority.npm.version,
    runtime: state.runtimeAuthority.node.runtime,
    permissionPhase: 'finalized-read-only',
  });
  const postSemanticSeal = fingerprintPackageSmokeWorkspace(workspace, true);
  if (!exactJsonEqual(postSemanticSeal, state.workspaceSeal)) {
    fail('prepared workspace changed across execute semantic revalidation');
  }
  const guardPath = join(workspace, NETWORK_GUARD_FILENAME);
  assertFinalizedHostFile(
    guardPath,
    NETWORK_AND_WRITE_GUARD,
    'package-smoke execute network-and-write guard',
  );
  commandEnvironment.NODE_OPTIONS = `--require=${JSON.stringify(guardPath)}`;
  commandEnvironment.CORTEXEL_PACKAGE_SMOKE_PHASE = 'execute';
  commandEnvironment.npm_config_offline = 'true';
  const observedNodeVersion = executableVersion(canonicalNode, 'Node');
  if (observedNodeVersion !== preparedNode.version) {
    fail('execute Node version differs from prepared Node');
  }
  assertPackageRuntimeAuthority(state.runtimeAuthority, 'post-execute preparation');
  assertPreparedStateFileAuthority(
    workspace,
    expectedStateDigest,
    stateFileAuthority,
    'post-execute preparation',
  );
  return { state, packed, stateFileAuthority };
}

export function parsePackageSmokeInvocation(argv: readonly string[]): SmokeInvocation {
  if (argv.length === 0) return { command: 'all' };
  const [command, ...rest] = argv;
  if (command !== 'prepare' && command !== 'execute') {
    fail(
      'usage: smoke-package.ts prepare --workspace ABS --node-executable ABS ' +
      '--npm-executable ABS | execute --workspace ABS --expected-state-digest sha256:HEX ' +
      '[--node-executable ABS]',
    );
  }
  let workspace: string | undefined;
  let nodeExecutable: string | undefined;
  let npmExecutable: string | undefined;
  let expectedStateDigest: string | undefined;
  for (let index = 0; index < rest.length; index += 2) {
    const option = rest[index];
    const value = rest[index + 1];
    if (value === undefined) fail(`missing value for ${String(option)}`);
    if (option === '--workspace' && workspace === undefined) workspace = value;
    else if (option === '--node-executable' && nodeExecutable === undefined) nodeExecutable = value;
    else if (option === '--npm-executable' && npmExecutable === undefined) npmExecutable = value;
    else if (option === '--expected-state-digest' && expectedStateDigest === undefined) {
      expectedStateDigest = value;
    }
    else fail(`unknown or duplicate package-smoke option ${String(option)}`);
  }
  if (workspace === undefined || !isAbsolute(workspace)) {
    fail(`${command} requires --workspace with an absolute path`);
  }
  if (command === 'execute' && npmExecutable !== undefined) {
    fail('--npm-executable is valid only during prepare');
  }
  if (command === 'prepare' && expectedStateDigest !== undefined) {
    fail('--expected-state-digest is valid only during execute');
  }
  if (command === 'execute' && expectedStateDigest === undefined) {
    fail('execute requires --expected-state-digest from the prepare output');
  }
  if (command === 'prepare' && (nodeExecutable === undefined || npmExecutable === undefined)) {
    fail('explicit prepare requires absolute --node-executable and --npm-executable paths');
  }
  return {
    command,
    workspace: resolve(workspace),
    ...(nodeExecutable === undefined ? {} : { nodeExecutable }),
    ...(npmExecutable === undefined ? {} : { npmExecutable }),
    ...(expectedStateDigest === undefined ? {} : { expectedStateDigest }),
  };
}

function phaseOutput(
  phase: SmokePhase,
  status: 'prepared' | 'passed',
  state: PreparedState,
  stateDigest: string,
): PackageSmokePhaseSuccessOutput {
  return {
    schema: PHASE_OUTPUT_SCHEMA,
    phase,
    status,
    workspace: state.workspace,
    stateFile: join(state.workspace, STATE_FILENAME),
    stateDigest,
    packageVersion: state.packageVersion,
    artifactIntegrity: state.artifactIntegrity,
    runtimeAuthority: state.runtimeAuthority,
    nodeModules: state.nodeModules,
    workspaceSeal: state.workspaceSeal.digest,
  };
}

const runtimeAnalysisProbe = `
  const inclusiveLeft = core.spikeTrialsToPsthParams(
    [{ times: [19.9], senders: [1] }],
    {
      alignmentTimesMs: [20],
      windowMs: [-0.1, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'package smoke',
    },
  );
  const exclusiveRight = core.spikeTrialsToPsthParams(
    [{ times: [0.3], senders: [1] }],
    {
      alignmentTimesMs: [0.2],
      windowMs: [0, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'package smoke',
    },
  );
  const highIndex = core.spikeRecorderToPopulationRateParams(
    { times: [49998.99999], senders: [1] },
    {
      startMs: 0,
      stopMs: 50000,
      binWidthMs: 1,
      populations: [{ id: 'E', label: 'E', senderIds: [1] }],
      unassignedPolicy: 'reject',
    },
  );
  if (!inclusiveLeft.ok || inclusiveLeft.params.values[0] !== 1 ||
      !exclusiveRight.ok || exclusiveRight.params.values[0] !== 0 ||
      !highIndex.ok || highIndex.params.series[0].spike_counts[49998] !== 1 ||
      highIndex.params.series[0].spike_counts[49999] !== 0) {
    throw new Error('packed analysis boundary semantics are incorrect');
  }
`;

const runtimeTopologyProbe = `
  const scalarSnapshot = core.normalizeSynapseCollectionSnapshot({
    source: 1,
    target: 3,
    weight: 0,
    delay: 1.5,
    target_thread: 0,
    synapse_id: 7,
    port: 0,
  });
  const snapshot = {
    source: [1, 1, 2],
    target: [3, 3, 4],
    weight: [2, -2, 0],
    delay: [1, 2, 3],
    synapse_model: ['static_synapse', 'static_synapse', 'static_synapse'],
  };
  const synapseModelSemantics = [{
    synapseModel: 'static_synapse',
    weight: 'effective',
    delay: 'effective',
  }];
  const endpointOnly = core.getConnectionsToSceneData({
    sources: [1],
    targets: [2],
  });
  const unusedMeasurementUnits = core.getConnectionsToSceneData({
    sources: [1],
    targets: [2],
  }, { weightUnits: 'pA' });
  const emptyMeasuredScene = core.getConnectionsToSceneData({
    sources: [],
    targets: [],
    weights: [],
    delays: [],
    synapse_models: [],
  }, {
    weightUnits: 'pA',
    delayUnits: 'ms',
    synapseModelSemantics: [],
  });
  const emptyMeasuredVerification = emptyMeasuredScene.ok
    ? core.detectEmptyScene(emptyMeasuredScene.data)
    : null;
  const unusedMeasurementAuthority = core.getConnectionsToSceneData({
    sources: [1],
    targets: [2],
    synapse_models: ['static_synapse'],
  }, { synapseModelSemantics });
  const common = {
    sourceIds: [1, 2],
    targetIds: [3, 4],
    snapshotTimeMs: 0,
    snapshotScope: { kind: 'single_process_complete' },
  };
  const adjacency = core.synapseCollectionToAdjacencyMatrixParams(snapshot, common);
  const graph = core.synapseCollectionToConnectionGraphParams(snapshot, {
    ...common,
    weightUnits: 'pA',
    delayUnits: 'ms',
    synapseModelSemantics,
    samplePolicy: { kind: 'complete' },
  });
  const weights = core.synapseCollectionToWeightMatrixParams(snapshot, {
    ...common,
    synapseModelSemantics,
    weightUnits: 'pA',
    aggregation: 'sum',
  });
  const delays = core.synapseCollectionToDelayMatrixParams(snapshot, {
    ...common,
    synapseModelSemantics,
    delayUnits: 'ms',
    aggregation: 'mean',
  });
  const inDegree = core.synapseCollectionToInDegreeDistributionParams(snapshot, {
    ...common,
    normalization: 'count',
  });
  const localInDegree = core.synapseCollectionToInDegreeDistributionParams(snapshot, {
    ...common,
    snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 },
    normalization: 'count',
  });
  const localOutDegree = core.synapseCollectionToOutDegreeDistributionParams(snapshot, {
    ...common,
    snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 },
    normalization: 'count',
  });
  const delayDistribution = core.synapseCollectionToDelayDistributionParams(snapshot, {
    ...common,
    synapseModelSemantics,
    delayUnits: 'ms',
    binWidthMs: 1,
    windowStartMs: 1,
    windowStopMs: 4,
    normalization: 'count',
  });
  const spatial = core.getPositionToSpatialMap2DParams(
    [[-5, 0], [5, 0]],
    {
      nodeIds: [1, 2],
      coordinateUnits: 'µm',
      extent: [10, 4],
      center: [0, 0],
      edgeWrap: false,
      positionScope: { kind: 'single_process_complete' },
    },
  );
  const largeOrigin = 1e9;
  const preciseDelay = core.synapseCollectionToDelayDistributionParams(
    {
      source: [1],
      target: [2],
      delay: [largeOrigin + 1 - 1e-6],
      synapse_model: ['static_synapse'],
    },
    {
      sourceIds: [1],
      targetIds: [2],
      snapshotTimeMs: 0,
      snapshotScope: { kind: 'single_process_complete' },
      synapseModelSemantics,
      delayUnits: 'ms',
      binWidthMs: 1,
      windowStartMs: largeOrigin,
      windowStopMs: largeOrigin + 2,
      normalization: 'count',
    },
  );
  const meanUnderflow = core.synapseCollectionToWeightMatrixParams(
    {
      source: [1, 1],
      target: [3, 3],
      weight: [-5e-324, 0],
      synapse_model: ['static_synapse', 'static_synapse'],
    },
    { ...common, synapseModelSemantics, weightUnits: 'pA', aggregation: 'mean' },
  );
  const densityOverflow = core.synapseCollectionToDelayDistributionParams(
    {
      source: [1, 1],
      target: [3, 3],
      delay: [1, 2],
      synapse_model: ['static_synapse', 'static_synapse'],
    },
    {
      ...common,
      synapseModelSemantics,
      delayUnits: 'ms',
      binWidthMs: Number.MAX_VALUE,
      windowStartMs: 0,
      windowStopMs: Number.MAX_VALUE,
      normalization: 'probability_density',
    },
  );
  const spatialDrift = core.getPositionToSpatialMap2DParams(
    [[1e15 + 0.75, 1e15]],
    {
      nodeIds: [1], coordinateUnits: 'mm', extent: [1, 1], center: [1e15, 1e15],
      edgeWrap: false, positionScope: { kind: 'single_process_complete' },
    },
  );
  const falseIdentity = graph.ok
    ? core.ConnectionGraphParamsSchema.safeParse({
        ...graph.params,
        edges: [{ ...graph.params.edges[0], id: 'not-a-canonical-id' }, ...graph.params.edges.slice(1)],
      }).success
    : true;
  if (Object.hasOwn(core, 'validateSynapseModelMeasurementSemantics') ||
      !scalarSnapshot.ok || scalarSnapshot.params.weights?.[0] !== 0 ||
      !endpointOnly.ok || unusedMeasurementUnits.ok || unusedMeasurementAuthority.ok ||
      !emptyMeasuredScene.ok ||
      Object.hasOwn(emptyMeasuredScene.data, 'networkWeightUnits') ||
      Object.hasOwn(emptyMeasuredScene.data, 'networkDelayUnits') ||
      !emptyMeasuredVerification?.valid || !emptyMeasuredVerification.empty ||
      !adjacency.ok || adjacency.params.connection_count !== 3 ||
      adjacency.params.cells[0].connection_count !== 2 ||
      !graph.ok || graph.params.edges.length !== 3 ||
      graph.params.edge_identity !== 'canonical_sorted_ordinal' ||
      !weights.ok || weights.params.cells[0].value !== 0 ||
      weights.params.cells[0].connection_count !== 2 ||
      !delays.ok || delays.params.cells[0].value !== 1.5 ||
      !inDegree.ok || inDegree.params.connection_count !== 3 ||
      localInDegree.ok || localOutDegree.ok || !delayDistribution.ok ||
      delayDistribution.params.delay_counts.join(',') !== '1,1,1' ||
      !spatial.ok || spatial.params.nodes.length !== 2 ||
      !preciseDelay.ok || preciseDelay.params.delay_counts.join(',') !== '1,0' ||
      meanUnderflow.ok || densityOverflow.ok || spatialDrift.ok || falseIdentity) {
    throw new Error('packed topology normalization or transform semantics are incorrect');
  }
`;

const runtimeManifestTopologyProbe = `
  for (const skill of manifest.skills) {
    if (skill.transform && typeof core[skill.transform.id] !== 'function') {
      throw new Error(\`manifest transform \${skill.transform.id} is not a packed core export\`);
    }
  }
  if (JSON.stringify(core.ROUTING_DISCRIMINATORS) !==
      JSON.stringify(manifest.routingDiscriminators)) {
    throw new Error('packed routing discriminators differ from the manifest');
  }
`;

const runtimeFigureContractProbe = `
  const renderSvgExportNames = Object.keys(renderSvg).sort();
  const expectedRenderSvgExportNames = [
    'buildFigure',
    'buildFigureFromJson',
    'buildFigureFromValidated',
  ];
  if (JSON.stringify(renderSvgExportNames) !== JSON.stringify(expectedRenderSvgExportNames)) {
    throw new Error('packed render-svg entry exposes raw plan or serializer authority: ' +
      JSON.stringify(renderSvgExportNames));
  }

  const identity = figure.getBuildIdentity();
  if (identity.requestContract !== 'cortexel-figure-request/1.0' ||
      identity.artifactContract !== 'cortexel-figure-artifact/1.0' ||
      identity.sourceRevision !== 'unreleased-worktree' || identity.release !== false ||
      identity.contractDigest !== contractManifest.contractDigest ||
      identity.catalogDigest !== contractManifest.catalogDigest ||
      authoring.CATALOG_DIGEST_DOMAIN !== contractManifest.catalogDigestDomain ||
      authoring.CATALOG_DIGEST !== contractManifest.catalogDigest ||
      identity.stableSkillCount !== contractManifest.stableSkillCount) {
    throw new Error('packed FigureRequest identity is incoherent');
  }
  const authoringExportNames = Object.keys(authoring).sort();
  if (JSON.stringify(authoringExportNames) !== JSON.stringify([
      'AUTHORING_SCHEMA_COMPILATION_PROFILE_V1',
      'CAPABILITY_AVAILABILITIES',
      'CAPABILITY_CATALOG',
      'CAPABILITY_IDS',
      'CATALOG_DIGEST',
      'CATALOG_DIGEST_DOMAIN',
      'SKILL_AUTHORING',
      'SKILL_CATALOG',
      'SOURCE_ADAPTER_CATALOG',
      'SOURCE_ADAPTER_CATALOG_DIGEST',
      'SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN',
      'SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE',
      'SOURCE_ADAPTER_DESCRIPTOR_DIGESTS',
      'SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN',
      'SOURCE_ADAPTER_DISCOVERY_CATALOG',
      'SOURCE_ADAPTER_EXAMPLE_ACTION',
      'SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER',
      'SOURCE_ADAPTER_EXAMPLE_PROTOCOL',
      'SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION',
      'SOURCE_ADAPTER_IDS',
      'STABLE_CATALOG_SCHEMA_RESOURCES',
      'STABLE_SKILL_IDS',
      'classifySourceAdapterExampleEnvelope',
      'isCapabilityId',
      'isSourceAdapterExampleGuard',
      'isSourceAdapterId',
      'isStableSkillId',
      'lookupCapabilityCatalogEntry',
      'lookupSkillCatalogEntry',
      'lookupSourceAdapter',
      'lookupSourceAdapterDescriptorDigest',
    ])) {
    throw new Error('packed authoring entry exposes an unexpected runtime surface: ' +
      JSON.stringify(authoringExportNames));
  }

  const inventory = [];
  for (const record of contractManifest.normativeSources) {
    if (!record.path.startsWith('contract/')) throw new Error('unsafe contract inventory path');
    const relative = record.path.slice('contract/'.length);
    if (relative.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error('unsafe contract inventory segment');
    }
    const value = JSON.parse(readFileSync(join(contractRoot, relative), 'utf8'));
    const digest = figure.sha256Digest(figure.canonicalize(value));
    if (digest !== record.digest) throw new Error('shipped contract file digest mismatch: ' + relative);
    inventory.push({ path: record.path, digest });
  }
  if (figure.sha256Digest(figure.canonicalize(inventory)) !== contractManifest.contractDigest) {
    throw new Error('shipped contract inventory does not reproduce contractDigest');
  }
  const stableIds = [...figure.STABLE_SKILL_IDS].sort();
  if (JSON.stringify([...authoring.STABLE_SKILL_IDS].sort()) !==
      JSON.stringify(stableIds) ||
      JSON.stringify(authoring.SKILL_CATALOG) !== JSON.stringify(figure.SKILL_CATALOG)) {
    throw new Error('packed authoring discovery metadata differs from figure');
  }
  for (const id of stableIds) {
    if (!authoring.isStableSkillId(id) ||
        !figure.isStableSkillId(id) ||
        authoring.lookupSkillCatalogEntry(id) !== authoring.SKILL_CATALOG[id] ||
        figure.lookupSkillCatalogEntry(id) !== figure.SKILL_CATALOG[id]) {
      throw new Error('packed stable catalog guard or lookup disagrees with its finite map');
    }
  }
  for (const id of ['', 'not.a.skill', '__proto__', 'constructor']) {
    if (authoring.isStableSkillId(id) ||
        figure.isStableSkillId(id) ||
        authoring.lookupSkillCatalogEntry(id) !== undefined ||
        figure.lookupSkillCatalogEntry(id) !== undefined) {
      throw new Error('packed stable catalog lookup admitted an unknown or prototype key');
    }
  }
  const capabilityIds = [...figure.CAPABILITY_IDS];
  if (JSON.stringify(capabilityIds) !== JSON.stringify([...capabilityIds].sort()) ||
      JSON.stringify(authoring.CAPABILITY_IDS) !== JSON.stringify(capabilityIds) ||
      JSON.stringify(Object.keys(figure.CAPABILITY_CATALOG)) !== JSON.stringify(capabilityIds) ||
      JSON.stringify(authoring.CAPABILITY_CATALOG) !==
        JSON.stringify(figure.CAPABILITY_CATALOG) ||
      JSON.stringify(authoring.CAPABILITY_AVAILABILITIES) !==
        JSON.stringify(figure.CAPABILITY_AVAILABILITIES)) {
    throw new Error('packed finite capability catalog surfaces disagree');
  }
  for (const id of capabilityIds) {
    if (!authoring.isCapabilityId(id) || !figure.isCapabilityId(id) ||
        authoring.lookupCapabilityCatalogEntry(id) !== authoring.CAPABILITY_CATALOG[id] ||
        figure.lookupCapabilityCatalogEntry(id) !== figure.CAPABILITY_CATALOG[id]) {
      throw new Error('packed capability guard or lookup disagrees with its finite map');
    }
  }
  for (const id of ['', 'not.a.capability', '__proto__', 'constructor']) {
    if (authoring.isCapabilityId(id) || figure.isCapabilityId(id) ||
        authoring.lookupCapabilityCatalogEntry(id) !== undefined ||
        figure.lookupCapabilityCatalogEntry(id) !== undefined) {
      throw new Error('packed capability lookup admitted an unknown or prototype key');
    }
  }
  if (JSON.stringify(authoring.SOURCE_ADAPTER_IDS) !==
      JSON.stringify(['nest-spike-recorder']) ||
      Object.keys(authoring.SOURCE_ADAPTER_CATALOG.adapters).length !== 1 ||
      !authoring.isSourceAdapterId('nest-spike-recorder') ||
      authoring.lookupSourceAdapter('nest-spike-recorder') !==
        authoring.SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder']) {
    throw new Error('packed executable source-adapter discovery is incomplete');
  }
  for (const id of ['', 'nest-multimeter', '__proto__', 'constructor']) {
    if (authoring.isSourceAdapterId(id) ||
        authoring.lookupSourceAdapter(id) !== undefined) {
      throw new Error('packed source-adapter lookup admitted an unknown or prototype key');
    }
  }
  const sourceAdapterDescriptor =
    authoring.SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'];
  if (figure.sha256Digest(figure.canonicalize(
        authoring.SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE,
      )) !== authoring.SOURCE_ADAPTER_CATALOG_DIGEST ||
      JSON.stringify(authoring.SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE) !==
        JSON.stringify({
          domain: authoring.SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
          catalog: authoring.SOURCE_ADAPTER_DISCOVERY_CATALOG,
        }) ||
      figure.sha256Digest(figure.canonicalize({
        domain: authoring.SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN,
        descriptor: sourceAdapterDescriptor,
      })) !== authoring.SOURCE_ADAPTER_DESCRIPTOR_DIGESTS['nest-spike-recorder'] ||
      authoring.lookupSourceAdapterDescriptorDigest('nest-spike-recorder') !==
        authoring.SOURCE_ADAPTER_DESCRIPTOR_DIGESTS['nest-spike-recorder'] ||
      authoring.lookupSourceAdapterDescriptorDigest('constructor') !== undefined) {
    throw new Error('packed source-adapter discovery bytes do not reproduce their digest');
  }
  const catalogView = {
    domain: authoring.CATALOG_DIGEST_DOMAIN,
    schemaCompilationProfile: authoring.AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
    schemaResources: authoring.STABLE_CATALOG_SCHEMA_RESOURCES,
    skills: stableIds.map((id) => ({
      ...figure.SKILL_CATALOG[id],
      ...authoring.SKILL_AUTHORING[id],
    })),
  };
  if (figure.sha256Digest(figure.canonicalize(catalogView)) !== contractManifest.catalogDigest) {
    throw new Error('packed public discovery and authoring bytes do not reproduce catalogDigest');
  }
  if (!contractManifest.stableSkills.every((skill) =>
      skill.availability === 'packaged' && skill.releaseReady === false)) {
    throw new Error('packaged availability was conflated with publication/release readiness');
  }

  const validated = figure.parseAndValidateRequest(JSON.stringify(spikeContract.examples.valid[0]));
  if (!validated.ok || validated.request.skillId !== 'neuro.spike_raster') {
    throw new Error('packed validator cannot validate a shipped living example');
  }
  const repairInput = JSON.parse(JSON.stringify(spikeContract.examples.valid[0]));
  delete repairInput.contract;
  repairInput.verified = true;
  repairInput.data.eventTimes.unit = 'milliseconds';
  const repaired = figure.applySafeRepairs(repairInput);
  if (!repaired.ok || repaired.request.skillId !== 'neuro.spike_raster' ||
      JSON.stringify(repaired.appliedRepairs.map((entry) => entry.reasonCode)) !==
        JSON.stringify([
          'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN',
          'CONTRACT_MISSING',
          'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
        ]) ||
      Object.hasOwn(repairInput, 'contract') || repairInput.verified !== true ||
      repairInput.data.eventTimes.unit !== 'milliseconds') {
    throw new Error('packed safe-repair boundary is absent, non-deterministic, or mutated input');
  }
  const cappedRepairInput = JSON.parse(JSON.stringify(spikeContract.examples.valid[0]));
  cappedRepairInput.presentation = { budgetProfile: 'agent' };
  for (let index = 0; index < 200; index++) {
    cappedRepairInput['wrapper' + String(index).padStart(3, '0')] = { verified: true };
  }
  const cappedRepair = figure.applySafeRepairs(cappedRepairInput, { budgetProfile: 'agent' });
  if (cappedRepair.ok || cappedRepair.errors.length !== 32 ||
      !cappedRepair.errors.some((error) => error.code === 'RESOURCE_BUDGET_EXCEEDED') ||
      !cappedRepair.errors.some((error) => error.code === 'ERROR_LIMIT_REACHED')) {
    throw new Error('packed safe-repair boundary hid its governing operation-budget stop');
  }
  const renderedValidated = validated.ok
    ? renderSvg.buildFigureFromValidated(validated.request)
    : null;
  if (!renderedValidated?.ok || !renderedValidated.svg.startsWith('<svg')) {
    throw new Error('packed renderer rejected a capability minted by the paired validator');
  }
  const rendered = renderSvg.buildFigure(spikeContract.examples.valid[0]);
  if (!rendered.ok || !rendered.svg.startsWith('<svg')) {
    throw new Error('packed headless renderer cannot render a shipped living example');
  }
  const packagedNestSource = authoring.lookupSourceAdapter('nest-spike-recorder');
  if (packagedNestSource !== authoring.SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'] ||
      packagedNestSource.revision !== 5 ||
      JSON.stringify(Object.keys(packagedNestSource.examples)) !==
        JSON.stringify(['positiveInfinity', 'finiteStop'])) {
    throw new Error('packed NEST adapter descriptor or branch inventory is incoherent');
  }
  for (const branch of ['positiveInfinity', 'finiteStop']) {
    const exampleEnvelope = packagedNestSource.examples[branch];
    if (authoring.classifySourceAdapterExampleEnvelope(exampleEnvelope).kind !==
          'template_only') {
      throw new Error('packed NEST source example lost its template-only envelope');
    }
    const guardedInput = exampleEnvelope.inputTemplate;
    const guardedAttempt = nestAdapter.nestSpikeRecorderToRaster(
      guardedInput.exportedStatus,
      guardedInput.options,
    );
    if (guardedAttempt.ok ||
        !guardedAttempt.errors.some((error) =>
          error.instancePath === '/' + authoring.SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER)) {
      throw new Error('packed NEST adapter admitted its extracted guarded ' + branch + ' input');
    }
    // Explicit package-smoke-only model of a caller that replaced the template:
    // the installed API never performs either acknowledgement on the caller's behalf.
    const callerCapture = JSON.parse(JSON.stringify(guardedInput));
    delete callerCapture.options[authoring.SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER];
    callerCapture.options.captureAuthority.kind = 'caller_declaration';
    const adapted = nestAdapter.nestSpikeRecorderToRaster(
      callerCapture.exportedStatus,
      callerCapture.options,
    );
    if (!adapted.ok || !figure.validateRequestValue(adapted.request).ok) {
      throw new Error('packed NEST adapter ' + branch +
        ' explicit test-owned caller capture does not pass the adapter and validator');
    }
  }
  if (capabilityRegistry.registry !== 'cortexel-capabilities' ||
      requestSchema.$id !== 'https://sepahead.github.io/cortexel/schemas/v1/figure-request.v1.schema.json' ||
      packageMetadata.imports?.['#cortexel-figure-result-capability'] !==
        './dist/internal/figure-result-capability.cjs' ||
      JSON.stringify(packageMetadata.imports?.['#cortexel-figure-result-brand']) !==
        JSON.stringify({
          types: './dist/internal/figure-result-brand.d.ts',
          import: './dist/internal/figure-result-brand.js',
          require: './dist/internal/figure-result-brand.cjs',
        }) ||
      packageMetadata.imports?.['#cortexel-knowledge-graph-presentation-capability'] !==
        './dist/internal/knowledge-graph-presentation-capability.cjs' ||
      JSON.stringify(
        packageMetadata.imports?.['#cortexel-knowledge-graph-presentation-brand'],
      ) !== JSON.stringify({
        types: './dist/internal/knowledge-graph-presentation-brand.d.ts',
        import: './dist/internal/knowledge-graph-presentation-brand.js',
        require: './dist/internal/knowledge-graph-presentation-brand.cjs',
      }) ||
      packageMetadata.imports?.['#cortexel-request-capability'] !==
        './dist/internal/request-capability.cjs' ||
      JSON.stringify(packageMetadata.imports?.['#cortexel-validated-request-brand']) !==
        JSON.stringify({
          types: './dist/internal/validated-request-brand.d.ts',
          import: './dist/internal/validated-request-brand.js',
          require: './dist/internal/validated-request-brand.cjs',
        })) {
    throw new Error('packaged registry/schema exports are incomplete');
  }
`;

interface PackageSmokeContext {
  readonly workspace: string;
  readonly coreConsumer: string;
  readonly chartsConsumer: string;
  readonly consumer: string;
  readonly unrelated: string;
  readonly nodeExecutable: string;
  readonly packed: PackedResult;
}

function assertInstalledNodeBinShim(
  consumer: string,
  binName: string,
  installedJavaScript: string,
): void {
  assertInstalledNodeBinShimAt(
    join(consumer, 'node_modules', '.bin'),
    binName,
    installedJavaScript,
  );
}

function assertInstalledNodeBinShimAt(
  binDirectory: string,
  binName: string,
  installedJavaScript: string,
): void {
  const targetStats = lstatSync(installedJavaScript);
  if (!targetStats.isFile() || targetStats.isSymbolicLink() || targetStats.nlink !== 1) {
    fail(`installed ${binName} JavaScript target is not a unique regular file`);
  }
  const targetText = decodeUtf8Fatal(
    readRegularFileStable(
      installedJavaScript,
      targetStats.size,
      `installed ${binName} JavaScript target`,
      4 * 1024 * 1024,
    ),
    `installed ${binName} JavaScript target`,
  );
  if (!targetText.startsWith('#!/usr/bin/env node\n')) {
    fail(`installed ${binName} JavaScript target is missing its reviewed Node shebang`);
  }
  const shim = join(binDirectory, binName);
  const shimStats = lstatSync(shim);
  if (!shimStats.isSymbolicLink()) fail(`installed ${binName} shim must be a symbolic link`);
  const linkTarget = readlinkSync(shim);
  const expectedLinkTarget = relative(dirname(shim), installedJavaScript);
  if (linkTarget !== expectedLinkTarget || realpathSync(shim) !== installedJavaScript) {
    fail(`installed ${binName} shim does not resolve to its exact JavaScript target`);
  }
  if ((statSync(shim).mode & 0o111) === 0) fail(`installed ${binName} target is not executable`);
}

function readPreparedBrowserBundleFile(
  path: string,
  label: string,
  maximumBytes: number,
  permissionPhase: 'prepared-writable' | 'finalized-read-only',
): Buffer {
  const stats = lstatSync(path);
  const expectedMode = permissionPhase === 'prepared-writable' ? 0o644 : 0o444;
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1 ||
    (stats.mode & 0o777) !== expectedMode ||
    stats.size < 1 ||
    stats.size > maximumBytes
  ) {
    fail(`${label} lacks exact regular-file authority`);
  }
  return readRegularFileStable(path, stats.size, label, maximumBytes);
}

function assertPreparedBrowserBundle(options: {
  readonly consumer: string;
  readonly entrySource: string;
  readonly packedPaths: readonly string[];
  readonly permissionPhase: 'prepared-writable' | 'finalized-read-only';
}): void {
  const bundle = readPreparedBrowserBundleFile(
    join(options.consumer, BROWSER_BUNDLE_OUTPUT_FILENAME),
    'prepared browser bundle',
    MAX_BROWSER_BUNDLE_BYTES,
    options.permissionPhase,
  );
  const receiptRaw = readPreparedBrowserBundleFile(
    join(options.consumer, BROWSER_BUNDLE_RECEIPT_FILENAME),
    'prepared browser-bundle receipt',
    MAX_BROWSER_BUNDLE_RECEIPT_BYTES,
    options.permissionPhase,
  );
  const receipt = expectRecord(
    parseCanonicalJsonBuffer(
      receiptRaw,
      'prepared browser-bundle receipt',
      MAX_BROWSER_BUNDLE_RECEIPT_BYTES,
    ),
    'prepared browser-bundle receipt',
  );
  exactKeys(receipt, [
    'schema',
    'esbuildVersion',
    'entrySourceSha256',
    'bundleSha256',
    'bundleBytes',
    'publicInputs',
    'warnings',
  ], 'prepared browser-bundle receipt');
  const expectedPublicInputs = [
    'node_modules/cortexel/dist/knowledge-graph/index.js',
    'node_modules/cortexel/dist/react/knowledge-graph.js',
  ];
  if (
    receipt.schema !== BROWSER_BUNDLE_RECEIPT_SCHEMA ||
    receipt.esbuildVersion !== REVIEWED_ESBUILD_VERSION ||
    receipt.entrySourceSha256 !== sha256(options.entrySource) ||
    receipt.bundleSha256 !== sha256(bundle) ||
    receipt.bundleBytes !== bundle.byteLength ||
    !Array.isArray(receipt.publicInputs) ||
    canonicalize(receipt.publicInputs) !== canonicalize(expectedPublicInputs) ||
    !Array.isArray(receipt.warnings)
  ) {
    fail('prepared browser-bundle receipt does not bind the reviewed build');
  }
  const bundleText = decodeUtf8Fatal(bundle, 'prepared browser bundle');
  if (bundleText.includes('#cortexel-knowledge-graph-presentation-capability')) {
    fail('prepared browser bundle retains an unresolved private capability specifier');
  }
  const warningIdentities = new Set<string>();
  for (let index = 0; index < receipt.warnings.length; index++) {
    const warning = expectRecord(
      receipt.warnings[index],
      `prepared browser-bundle warning ${index}`,
    );
    exactKeys(warning, [
      'id',
      'source',
      'line',
      'lineText',
      'target',
      'bytesInOutput',
    ], `prepared browser-bundle warning ${index}`);
    const source = expectString(warning.source, `browser-bundle warning ${index} source`);
    const line = expectInteger(warning.line, `browser-bundle warning ${index} line`);
    const lineText = expectString(
      warning.lineText,
      `browser-bundle warning ${index} line text`,
    );
    const target = expectString(warning.target, `browser-bundle warning ${index} target`);
    const bytesInOutput = expectInteger(
      warning.bytesInOutput,
      `browser-bundle warning ${index} output bytes`,
    );
    const specifier = BROWSER_BARE_CHUNK_IMPORT_REGEXP.exec(lineText)?.[1];
    if (
      warning.id !== 'ignored-bare-import' ||
      !expectedPublicInputs.includes(source) ||
      line < 1 ||
      specifier === undefined ||
      join(dirname(source), specifier) !== target ||
      !BROWSER_INSTALLED_CHUNK_PATH_REGEXP.test(target) ||
      bytesInOutput < 1
    ) {
      fail(`browser-bundle warning ${index} is outside the reviewed warning class`);
    }
    const packagePath = target.slice('node_modules/cortexel/'.length);
    if (!options.packedPaths.includes(packagePath)) {
      fail(`browser-bundle warning ${index} targets an unsealed package path`);
    }
    const identity = canonicalize([source, line, lineText, target]);
    if (warningIdentities.has(identity)) {
      fail(`browser-bundle warning ${index} duplicates a prior warning`);
    }
    warningIdentities.add(identity);
  }
}

export function declarationReferencesPrivateRequestBoundary(source: string): boolean {
  if (typeof source !== 'string') {
    fail('packed declaration source must be one string');
  }
  const preprocessed = ts.preProcessFile(source, true, true);
  const sourceFile = ts.createSourceFile(
    'packed-declaration.d.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = (
    sourceFile as ts.SourceFile & {
      readonly parseDiagnostics?: readonly ts.Diagnostic[];
    }
  ).parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    fail(
      'packed declaration could not be parsed while inspecting private references: ' +
      ts.flattenDiagnosticMessageText(
        diagnostics[0]?.messageText ?? 'unknown parse failure',
        '\n',
      ),
    );
  }
  const referencedSpecifiers = [
    ...preprocessed.importedFiles.map((reference) => reference.fileName),
    ...preprocessed.referencedFiles.map((reference) => reference.fileName),
    ...preprocessed.typeReferenceDirectives.map((reference) => reference.fileName),
    ...preprocessed.libReferenceDirectives.map((reference) => reference.fileName),
    ...(preprocessed.ambientExternalModules ?? []),
    ...sourceFile.amdDependencies.map((dependency) => dependency.path),
    ...(sourceFile.moduleName === undefined ? [] : [sourceFile.moduleName]),
  ];
  return referencedSpecifiers.some((specifier) =>
    specifier.toLowerCase().includes('requestboundary.internal')
  );
}

const PACKAGE_SMOKE_PHASE_OPERATIONS = Object.freeze([
  'browser-bundle.esm',
  'charts.import',
  'charts.require',
  'cjs-url-cache',
  'core.cjs',
  'core.esm',
  'guard.cjs',
  'guard.esm',
  'mixed-capability.esm',
  'react.import',
  'react.require',
  'unrelated-cwd.cjs',
  'unrelated-cwd.esm',
] as const);
type PackageSmokePhaseOperation = (typeof PACKAGE_SMOKE_PHASE_OPERATIONS)[number];

const PACKAGE_SMOKE_FIXED_CLI_OPERATIONS = Object.freeze([
  'cli.identity',
  'cli.catalog',
  'cli.source-catalog',
  'cli.source-describe',
  'cli.source-example.initial',
  'cli.source-example.repeat',
  'cli.source-adapt.guarded-envelope',
  'cli.source-adapt.guarded-input',
  'cli.source-adapt.caller-capture',
  'cli.validate-adapted',
  'cli.render-adapted',
  'cli.source-render',
  'cli.unknown-skill',
  'cli.unknown-source',
] as const);

const PACKAGE_SMOKE_CLI_EXIT_OPERATIONS = Object.freeze([
  'cli.exit.usage',
  'cli.exit.valid',
  'cli.exit.malformed',
  'cli.exit.structural',
  'cli.exit.legacy',
  'cli.exit.absent',
] as const);

type PackageSmokeExecuteOperation =
  | PackageSmokePhaseOperation
  | 'cli.import.esm'
  | 'cli.import.cjs'
  | (typeof PACKAGE_SMOKE_FIXED_CLI_OPERATIONS)[number]
  | (typeof PACKAGE_SMOKE_CLI_EXIT_OPERATIONS)[number]
  | `cli.describe-all.${StableSkillId}`
  | `cli.validate-authoring.${StableSkillId}`;

const PACKAGE_SMOKE_STABLE_SKILL_CLI_OPERATIONS = Object.freeze(
  SOURCE_STABLE_SKILL_IDS.flatMap((skillId) => [
    `cli.describe-all.${skillId}` as const,
    `cli.validate-authoring.${skillId}` as const,
  ]),
);

export const PACKAGE_SMOKE_EXECUTE_OPERATIONS = Object.freeze([
  ...PACKAGE_SMOKE_PHASE_OPERATIONS,
  'cli.import.esm',
  'cli.import.cjs',
  ...PACKAGE_SMOKE_FIXED_CLI_OPERATIONS,
  ...PACKAGE_SMOKE_STABLE_SKILL_CLI_OPERATIONS,
  ...PACKAGE_SMOKE_CLI_EXIT_OPERATIONS,
] satisfies readonly PackageSmokeExecuteOperation[]);

export function assertPackageSmokeExecuteArgumentsExcludeTypeScript(
  args: readonly string[],
): void {
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== 'string')) {
    fail('package-smoke execute arguments must be one string array');
  }
  for (const argument of args) {
    const normalized = argument.replaceAll('\\', '/').toLowerCase();
    if (
      normalized.includes('typescript') ||
      /(?:^|\/)tsc(?:$|[./-])/u.test(normalized)
    ) {
      fail('package-smoke execute command attempted to target the TypeScript compiler');
    }
  }
}

function runPackageSmokeBody(phase: SmokePhase, context: PackageSmokeContext): string {
  let consumer = context.coreConsumer;
  const chartsConsumer = context.chartsConsumer;
  const fullConsumer = context.consumer;
  const unrelated = context.unrelated;
  const nodeExecutable = context.nodeExecutable;
  const packed = context.packed;
  const observedOperations = new Set<PackageSmokeExecuteOperation>();
  if (
    new Set(PACKAGE_SMOKE_EXECUTE_OPERATIONS).size !==
    PACKAGE_SMOKE_EXECUTE_OPERATIONS.length
  ) {
    fail('package-smoke execute operation inventory contains duplicates');
  }
  const recordOperation = (operation: PackageSmokeExecuteOperation): void => {
    if (!(PACKAGE_SMOKE_EXECUTE_OPERATIONS as readonly string[]).includes(operation)) {
      fail('package-smoke phase received an unreviewed operation identity');
    }
    if (observedOperations.has(operation)) {
      fail(`package-smoke phase repeated operation ${operation}`);
    }
    observedOperations.add(operation);
  };
  const phaseRun = (
    operation: PackageSmokePhaseOperation,
    args: string[],
    cwd: string,
  ): string => {
    assertPackageSmokeExecuteArgumentsExcludeTypeScript(args);
    recordOperation(operation);
    if (phase !== 'execute') return '';
    try {
      return run(
        nodeExecutable,
        args,
        cwd,
        PACKAGE_SMOKE_COMMAND_POLICIES.executeNode,
      );
    } catch (error) {
      throw new AggregateError(
        [error],
        `package-smoke execute probe ${operation} failed`,
      );
    }
  };
  const executeRunResult = (
    operation: Exclude<PackageSmokeExecuteOperation, PackageSmokePhaseOperation>,
    args: string[],
    cwd: string,
  ): ReviewedNodeCommandResult => {
    if (phase !== 'execute') {
      fail('execute-only package-smoke operation was requested during prepare');
    }
    assertPackageSmokeExecuteArgumentsExcludeTypeScript(args);
    recordOperation(operation);
    try {
      return runResult(
        nodeExecutable,
        args,
        cwd,
        PACKAGE_SMOKE_COMMAND_POLICIES.executeNode,
      );
    } catch (error) {
      throw new AggregateError(
        [error],
        `package-smoke execute operation ${operation} failed`,
      );
    }
  };
  const phaseWriteFile = (path: string, intendedUtf8: string): void => {
    if (phase === 'prepare') {
      writeFileSync(path, intendedUtf8, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
      return;
    }
    assertFinalizedHostFile(path, intendedUtf8, `package-smoke phase input ${path}`);
  };

  const packedPaths = packed.files.map((file) => file.path);
  for (const file of packed.files) {
    const packedPath = file.path;
    const expectedMode = packedPath === 'dist/cli/main.js' ? 0o755 : 0o644;
    if (file.mode !== expectedMode) {
      throw new Error(
        `tarball mode is not deterministic for ${packedPath}: ` +
        `expected ${expectedMode.toString(8)}, received ${file.mode.toString(8)}`,
      );
    }
  }
  const expectedContractFiles = packagedContractRelativeFiles(join(root, 'contract'))
    .map((relative) => `dist/contract/${relative}`);
  const actualContractFiles = packedPaths
    .filter((entry) => entry.startsWith('dist/contract/'))
    .sort();
  if (JSON.stringify(actualContractFiles) !== JSON.stringify(expectedContractFiles.sort())) {
    throw new Error('tarball contract tree differs from the closed normative package inventory');
  }
  const physicalContractManifests = packedPaths.filter(
    (entry) => entry.endsWith('contract/manifest.v1.json'),
  );
  if (physicalContractManifests.length !== 1 ||
      physicalContractManifests[0] !== 'dist/contract/manifest.v1.json') {
    throw new Error('tarball does not contain exactly one physical normative contract copy');
  }
  for (const entry of packedPaths) {
    if (
      /(^|\/)\.env(?:\.|$)/u.test(entry) ||
      /^(?:src|core|react|contract|scripts|test|python)\//u.test(entry)
    ) {
      throw new Error(`tarball contains a source or environment path: ${entry}`);
    }
  }
  if (!packedPaths.includes('package.json')) {
    throw new Error('tarball is missing package.json');
  }
  if (!packedPaths.includes('dist/internal/request-capability.cjs')) {
    throw new Error('tarball is missing the shared request-capability runtime');
  }
  if (!packedPaths.includes('dist/internal/figure-result-capability.cjs')) {
    throw new Error('tarball is missing the shared built-figure-result capability runtime');
  }
  if (!packedPaths.includes('dist/internal/knowledge-graph-presentation-capability.cjs')) {
    throw new Error('tarball is missing the shared knowledge-graph capability runtime');
  }
  for (const forbiddenUnreachableOutput of [
    'dist/cli/main.cjs',
    'dist/cli/main.cjs.map',
    'dist/cli/main.d.cts',
    'dist/cli/main.d.ts',
    'dist/internal/figure-result-capability.js',
    'dist/internal/figure-result-capability.js.map',
    'dist/internal/figure-result-capability.d.ts',
    'dist/internal/request-capability.js',
    'dist/internal/request-capability.js.map',
    'dist/internal/request-capability.d.ts',
    'dist/internal/knowledge-graph-presentation-capability.js',
    'dist/internal/knowledge-graph-presentation-capability.js.map',
    'dist/internal/knowledge-graph-presentation-capability.d.ts',
    'dist/internal/figure-result-brand.d.cts',
    'dist/internal/knowledge-graph-presentation-brand.d.cts',
    'dist/internal/validated-request-brand.d.cts',
  ]) {
    if (packedPaths.includes(forbiddenUnreachableOutput)) {
      throw new Error(
        `tarball contains an unreachable alternate output: ${forbiddenUnreachableOutput}`,
      );
    }
  }
  for (const nominalBrandPath of [
    'dist/internal/figure-result-brand.cjs',
    'dist/internal/figure-result-brand.d.ts',
    'dist/internal/figure-result-brand.js',
    'dist/internal/knowledge-graph-presentation-brand.cjs',
    'dist/internal/knowledge-graph-presentation-brand.d.ts',
    'dist/internal/knowledge-graph-presentation-brand.js',
    'dist/internal/validated-request-brand.cjs',
    'dist/internal/validated-request-brand.d.ts',
    'dist/internal/validated-request-brand.js',
  ]) {
    if (!packedPaths.includes(nominalBrandPath)) {
      throw new Error(`tarball is missing the shared nominal type module: ${nominalBrandPath}`);
    }
  }

  let installedRoot = join(consumer, 'node_modules', 'cortexel');
  assertInstalledSourceMapClosure(installedRoot, packedPaths);
  for (const declarationPath of packedPaths.filter(
    (entry) => entry.endsWith('.d.ts') || entry.endsWith('.d.cts'),
  )) {
    const declaration = readUtf8RegularFileStable(
      join(installedRoot, ...declarationPath.split('/')),
      `packed declaration ${declarationPath}`,
      PACKAGE_TARBALL_LIMITS.fileBytes,
    );
    if (declarationReferencesPrivateRequestBoundary(declaration)) {
      throw new Error(
        `packed declaration leaks the private request-boundary module path: ${declarationPath}`,
      );
    }
  }
  for (const requiredNotice of [
    'THIRD_PARTY_NOTICES.md',
    'LICENSES/Apache-2.0.txt',
    'LICENSES/CC0-1.0.txt',
    'LICENSES/Matplotlib.txt',
    'LICENSES/PNNL-cividis.txt',
    'LICENSES/Rolldown.txt',
  ]) {
    if (!existsSync(join(installedRoot, requiredNotice))) {
      throw new Error(`packed package is missing required third-party notice ${requiredNotice}`);
    }
  }
  for (const forbiddenPeer of [
    'react',
    'react-dom',
    'three',
    '@react-three/fiber',
    'd3-force-3d',
  ]) {
    if (existsSync(join(consumer, 'node_modules', forbiddenPeer))) {
      throw new Error(`pure package probe unexpectedly installed optional peer ${forbiddenPeer}`);
    }
  }

  phaseRun(
    'guard.cjs',
    [
      '-e',
      `
        let networkDenied = false;
        let writeDenied = false;
        let childProcessDenied = false;
        let childProcessPrototypeDenied = false;
        let execveDeniedOrUnavailable = typeof process.execve !== 'function';
        try { require('node:net').connect({ host: '127.0.0.1', port: 9 }); }
        catch (error) { networkDenied = String(error).includes('denied execute-phase authority'); }
        try { require('node:fs').writeFileSync('forbidden-execute-write', 'x'); }
        catch (error) { writeDenied = String(error).includes('denied execute-phase authority'); }
        const childProcess = require('node:child_process');
        try { childProcess.execFileSync('/cortexel-does-not-exist'); }
        catch (error) {
          childProcessDenied = String(error).includes('denied execute-phase authority');
        }
        try { new childProcess.ChildProcess().spawn({ file: '/cortexel-does-not-exist' }); }
        catch (error) {
          childProcessPrototypeDenied =
            String(error).includes('denied execute-phase authority');
        }
        if (typeof process.execve === 'function') {
          try { process.execve('/cortexel-does-not-exist', ['/cortexel-does-not-exist'], {}); }
          catch (error) {
            execveDeniedOrUnavailable = String(error).includes('denied execute-phase authority');
          }
        }
        if (!networkDenied || !writeDenied || !childProcessDenied ||
            !childProcessPrototypeDenied ||
            !execveDeniedOrUnavailable ||
            process.env.CORTEXEL_PACKAGE_SMOKE_PHASE !== 'execute') {
          throw new Error('execute-phase authority guard is not active');
        }
      `,
    ],
    consumer,
  );

  const cjsUrlCacheProbePath = join(consumer, CJS_URL_CACHE_PROBE_FILENAME);
  phaseWriteFile(cjsUrlCacheProbePath, generatedCjsUrlCacheProbeSource());
  phaseRun('cjs-url-cache', [cjsUrlCacheProbePath], consumer);

  phaseRun(
    'guard.esm',
    [
      '--input-type=module',
      '-e',
      `
        import { connect } from 'node:net';
        import { resolve4 } from 'node:dns/promises';
        import { writeFileSync } from 'node:fs';
        import { open } from 'node:fs/promises';
        import { execFileSync } from 'node:child_process';
        const denied = (error) => String(error).includes('denied execute-phase authority');
        let netDenied = false;
        let dnsDenied = false;
        let writeDenied = false;
        let handleDenied = false;
        let childProcessDenied = false;
        try { connect({ host: '127.0.0.1', port: 9 }); } catch (error) { netDenied = denied(error); }
        try { await resolve4('invalid.example'); } catch (error) { dnsDenied = denied(error); }
        try { writeFileSync('forbidden-esm-write', 'x'); } catch (error) { writeDenied = denied(error); }
        const handle = await open('package.json', 'r');
        try { await handle.utimes(new Date(0), new Date(0)); }
        catch (error) { handleDenied = denied(error); }
        finally { await handle.close(); }
        try { execFileSync('/cortexel-does-not-exist'); }
        catch (error) { childProcessDenied = denied(error); }
        if (!netDenied || !dnsDenied || !writeDenied || !handleDenied ||
            !childProcessDenied) {
          throw new Error('execute-phase ESM network/write/launch guard is not active');
        }
      `,
    ],
    consumer,
  );

  phaseRun(
    'core.esm',
    [
      '--input-type=module',
      '-e',
      `
        const root = await import('cortexel');
        const core = await import('cortexel/core');
        const figure = await import('cortexel/figure');
        const authoring = await import('cortexel/authoring');
        const renderSvg = await import('cortexel/render-svg');
        const knowledgeGraph = await import('cortexel/knowledge-graph');
        const nestAdapter = await import('cortexel/adapters/nest');
        const manifest = (await import('cortexel/skills.manifest.json', {
          with: { type: 'json' },
        })).default;
        const contractManifest = (await import('cortexel/contract/manifest.json', {
          with: { type: 'json' },
        })).default;
        const spikeContract = (await import(
          'cortexel/contract/skills/neuro.spike_raster.v1.json',
          { with: { type: 'json' } },
        )).default;
        const capabilityRegistry = (await import(
          'cortexel/contract/registries/capabilities.v1.json',
          { with: { type: 'json' } },
        )).default;
        const requestSchema = (await import(
          'cortexel/contract/schemas/figure-request.v1.schema.json',
          { with: { type: 'json' } },
        )).default;
        const packageMetadata = (await import('cortexel/package.json', {
          with: { type: 'json' },
        })).default;
        let deepRenderImportBlocked = false;
        try {
          await import('cortexel/dist/render-svg/index.js');
        } catch (error) {
          deepRenderImportBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!deepRenderImportBlocked) {
          throw new Error('ESM package exports did not encapsulate the render implementation');
        }
        const { readFileSync } = await import('node:fs');
        const { dirname, join } = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const contractRoot = dirname(fileURLToPath(import.meta.resolve(
          'cortexel/contract/manifest.json',
        )));
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            typeof figure.parseAndValidateRequest !== 'function' ||
            typeof authoring.SKILL_AUTHORING !== 'object' ||
            typeof authoring.SOURCE_ADAPTER_CATALOG !== 'object' ||
            typeof authoring.lookupSourceAdapter !== 'function' ||
            typeof renderSvg.buildFigure !== 'function' ||
            typeof knowledgeGraph.prepareKnowledgeGraphPresentation !== 'function' ||
            typeof knowledgeGraph.isPreparedKnowledgeGraphPresentation !== 'function' ||
            typeof nestAdapter.nestSpikeRecorderToRaster !== 'function' ||
            packageMetadata.name !== 'cortexel' ||
            core.ROUTING_DISCRIMINATORS?.get_connections?.connection_graph !== 'nest.connection_graph') {
          throw new Error('ESM core exports are incomplete');
        }
        const headlessGraph = knowledgeGraph.prepareKnowledgeGraphPresentation({
          contract: knowledgeGraph.KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
          profile: 'generic_visual',
          graphIdentity: 'package-smoke:peer-free-esm',
          nodes: [{ id: 'n', label: 'Node', kind: 'model', color: '#fff', radius: 4 }],
          edges: [],
        });
        if (!knowledgeGraph.isPreparedKnowledgeGraphPresentation(headlessGraph) ||
            headlessGraph.nodes[0]?.nodeGlyph !== 'sphere_outline') {
          throw new Error('ESM peer-free knowledge-graph surface is incomplete');
        }
        ${runtimeAnalysisProbe}
        ${runtimeTopologyProbe}
        ${runtimeManifestTopologyProbe}
        ${runtimeFigureContractProbe}
      `,
    ],
    consumer,
  );
  phaseRun(
    'core.cjs',
    [
      '-e',
      `
        const root = require('cortexel');
        const core = require('cortexel/core');
        const figure = require('cortexel/figure');
        const authoring = require('cortexel/authoring');
        const renderSvg = require('cortexel/render-svg');
        const knowledgeGraph = require('cortexel/knowledge-graph');
        const nestAdapter = require('cortexel/adapters/nest');
        const manifest = require('cortexel/skills.manifest.json');
        const contractManifest = require('cortexel/contract/manifest.json');
        const spikeContract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
        const capabilityRegistry = require('cortexel/contract/registries/capabilities.v1.json');
        const requestSchema = require('cortexel/contract/schemas/figure-request.v1.schema.json');
        const packageMetadata = require('cortexel/package.json');
        let deepRenderRequireBlocked = false;
        try {
          require('cortexel/dist/render-svg/index.cjs');
        } catch (error) {
          deepRenderRequireBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!deepRenderRequireBlocked) {
          throw new Error('CJS package exports did not encapsulate the render implementation');
        }
        const { readFileSync } = require('node:fs');
        const { dirname, join } = require('node:path');
        const contractRoot = dirname(require.resolve('cortexel/contract/manifest.json'));
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            typeof figure.parseAndValidateRequest !== 'function' ||
            typeof authoring.SKILL_AUTHORING !== 'object' ||
            typeof authoring.SOURCE_ADAPTER_CATALOG !== 'object' ||
            typeof authoring.lookupSourceAdapter !== 'function' ||
            typeof renderSvg.buildFigure !== 'function' ||
            typeof knowledgeGraph.prepareKnowledgeGraphPresentation !== 'function' ||
            typeof knowledgeGraph.isPreparedKnowledgeGraphPresentation !== 'function' ||
            typeof nestAdapter.nestSpikeRecorderToRaster !== 'function' ||
            packageMetadata.name !== 'cortexel' ||
            core.ROUTING_DISCRIMINATORS?.get_connections?.connection_graph !== 'nest.connection_graph') {
          throw new Error('CJS core exports are incomplete');
        }
        const headlessGraph = knowledgeGraph.prepareKnowledgeGraphPresentation({
          contract: knowledgeGraph.KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
          profile: 'generic_visual',
          graphIdentity: 'package-smoke:peer-free-cjs',
          nodes: [{ id: 'n', label: 'Node', kind: 'model', color: '#fff', radius: 4 }],
          edges: [],
        });
        if (!knowledgeGraph.isPreparedKnowledgeGraphPresentation(headlessGraph) ||
            headlessGraph.nodes[0]?.nodeGlyph !== 'sphere_outline') {
          throw new Error('CJS peer-free knowledge-graph surface is incomplete');
        }
        if (!Array.isArray(manifest.skills) || manifest.skills.length !== ${NEST_SKILL_IDS.length} ||
            manifest.manifestVersion !== '11' ||
            manifest.paramConstraintLanguage?.version !== ${JSON.stringify(PARAM_CONSTRAINT_LANGUAGE.version)} ||
            manifest.skillAxisVersion !== ${JSON.stringify(CORTEXEL_SKILL_VERSION)} ||
            manifest.specVersion !== ${JSON.stringify(CORTEXEL_SPEC_VERSION)} ||
            manifest.routingDiscriminators?.get_connections?.weight_matrix !== 'nest.weight_matrix' ||
            manifest.skills.find((skill) => skill.id === 'nest.connection_graph')?.transform?.id !==
              'synapseCollectionToConnectionGraphParams' ||
            manifest.skills.find((skill) => skill.id === 'nest.connectivity_matrix')?.deprecation?.replacement !==
              'nest.connection_graph') {
          throw new Error('manifest export is missing or incomplete');
        }
        ${runtimeAnalysisProbe}
        ${runtimeTopologyProbe}
        ${runtimeManifestTopologyProbe}
        ${runtimeFigureContractProbe}
      `,
    ],
    consumer,
  );

  // One process can load either conditional public surface. Every producer/consumer
  // pairing must share the exact private WeakSet, including mixed module formats.
  phaseWriteFile(
    join(fullConsumer, 'mixed-capability-probe.mjs'),
    `
      import { createRequire } from 'node:module';
      import * as esmFigure from 'cortexel/figure';
      import * as esmRenderer from 'cortexel/render-svg';
      import * as esmGraph from 'cortexel/knowledge-graph';
      import * as esmInteractiveGraph from 'cortexel/react/knowledge-graph';
      import * as esmCore from 'cortexel/core';
      const require = createRequire(import.meta.url);
      const cjsFigure = require('cortexel/figure');
      const cjsRenderer = require('cortexel/render-svg');
      const cjsGraph = require('cortexel/knowledge-graph');
      const cjsInteractiveGraph = require('cortexel/react/knowledge-graph');
      const cjsCore = require('cortexel/core');
      // An export map is API encapsulation, not a sandbox against code already
      // executing in this process: createRequire can deliberately choose a parent
      // inside another package. Even through that unsupported route, the physical
      // singleton must expose only checked preparation/predicate functions, never
      // unchecked registry mutation or the private WeakSet/WeakMap objects themselves.
      const packageScopedRequire = createRequire(require.resolve('cortexel/package.json'));
      const internalCapability = packageScopedRequire('#cortexel-request-capability');
      const internalFigureResultCapability = packageScopedRequire(
        '#cortexel-figure-result-capability'
      );
      const internalGraphCapability = packageScopedRequire(
        '#cortexel-knowledge-graph-presentation-capability'
      );
      const nominalBrandRuntime = packageScopedRequire('#cortexel-validated-request-brand');
      const figureResultNominalBrandRuntime = packageScopedRequire(
        '#cortexel-figure-result-brand'
      );
      const graphNominalBrandRuntime = packageScopedRequire(
        '#cortexel-knowledge-graph-presentation-brand'
      );
      const expectedInternalExports = [
        'isValidatedRequest',
        'parseAndValidateRequest',
        'validateRequestValue',
      ];
      if (JSON.stringify(Object.keys(internalCapability).sort()) !==
          JSON.stringify(expectedInternalExports) ||
          internalCapability.parseAndValidateRequest !== esmFigure.parseAndValidateRequest ||
          internalCapability.parseAndValidateRequest !== cjsFigure.parseAndValidateRequest) {
        throw new Error('shared request-capability runtime exposes excess authority or split identity');
      }
      if (JSON.stringify(Object.keys(nominalBrandRuntime)) !== JSON.stringify([])) {
        throw new Error('type-only validated-request brand exposes runtime authority');
      }
      const expectedFigureResultInternalExports = [
        'assertLiveBuiltFigureResult',
        'buildFigure',
        'buildFigureFromJson',
        'buildFigureFromValidated',
        'isLiveBuiltFigureResult',
      ];
      if (JSON.stringify(Object.keys(internalFigureResultCapability).sort()) !==
          JSON.stringify(expectedFigureResultInternalExports) ||
          internalFigureResultCapability.buildFigure !== esmRenderer.buildFigure ||
          internalFigureResultCapability.buildFigure !== cjsRenderer.buildFigure ||
          JSON.stringify(Object.keys(figureResultNominalBrandRuntime)) !== JSON.stringify([])) {
        throw new Error(
          'shared built-figure-result capability exposes excess or unchecked authority or split identity'
        );
      }
      const expectedGraphInternalExports = [
        'KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1',
        'KnowledgeGraphPresentationJsonError',
        'PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1',
        'PREPARED_KNOWLEDGE_GRAPH_VIEW_V1',
        'assertPreparedCorpusKnowledgeGraphPresentation',
        'assertPreparedGenericKnowledgeGraphPresentation',
        'assertPreparedKnowledgeGraphPresentation',
        'assertPreparedKnowledgeGraphView',
        'isPreparedKnowledgeGraphPresentation',
        'isPreparedKnowledgeGraphView',
        'knowledgeGraphPresentationContainsNode',
        'knowledgeGraphViewContainsNode',
        'parseKnowledgeGraphPresentationJson',
        'prepareCorpusKnowledgeGraphPresentation',
        'prepareKnowledgeGraphPresentation',
        'prepareKnowledgeGraphView',
        'serializePreparedKnowledgeGraphPresentation',
      ];
      const expectedGraphPublicExports = [
        'CORPUS_GRAPH_RADIUS_MEANING',
        'KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1',
        'KnowledgeGraphPresentationJsonError',
        'PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1',
        'PREPARED_KNOWLEDGE_GRAPH_VIEW_V1',
        'assertPreparedGenericKnowledgeGraphPresentation',
        'assertPreparedKnowledgeGraphPresentation',
        'assertPreparedKnowledgeGraphView',
        'corpusGraphInstanceIdentity',
        'corpusGraphRadiusMeaning',
        'isPreparedKnowledgeGraphPresentation',
        'isPreparedKnowledgeGraphView',
        'knowledgeGraphPresentationContainsNode',
        'knowledgeGraphViewContainsNode',
        'parseKnowledgeGraphPresentationJson',
        'prepareCorpusKnowledgeGraphFigure',
        'prepareCorpusKnowledgeGraphFigureJson',
        'prepareKnowledgeGraphPresentation',
        'prepareKnowledgeGraphView',
        'serializePreparedKnowledgeGraphPresentation',
      ];
      if (JSON.stringify(Object.keys(esmGraph).sort()) !==
            JSON.stringify(expectedGraphPublicExports) ||
          JSON.stringify(Object.keys(cjsGraph).sort()) !==
            JSON.stringify(expectedGraphPublicExports)) {
        throw new Error('public knowledge-graph surface drifted or leaked authority');
      }
      if (Object.hasOwn(esmGraph, 'mapCorpusKnowledgeGraph') ||
          Object.hasOwn(cjsGraph, 'mapCorpusKnowledgeGraph') ||
          Object.hasOwn(esmInteractiveGraph, 'mapCorpusKnowledgeGraph') ||
          Object.hasOwn(cjsInteractiveGraph, 'mapCorpusKnowledgeGraph')) {
        throw new Error('public knowledge-graph surface exposed the ungated corpus mapper');
      }
      if (JSON.stringify(Object.keys(internalGraphCapability).sort()) !==
          JSON.stringify(expectedGraphInternalExports) ||
          internalGraphCapability.prepareKnowledgeGraphPresentation !==
            esmGraph.prepareKnowledgeGraphPresentation ||
          internalGraphCapability.prepareKnowledgeGraphPresentation !==
            cjsGraph.prepareKnowledgeGraphPresentation ||
          Object.keys(internalGraphCapability).some((key) =>
            /unchecked|register|weakset|weakmap/i.test(key))) {
        throw new Error(
          'shared knowledge-graph capability exposes unchecked registry authority or split identity'
        );
      }
      if (JSON.stringify(Object.keys(graphNominalBrandRuntime)) !== JSON.stringify([])) {
        throw new Error('type-only knowledge-graph brand exposes runtime authority');
      }
      const graphInput = {
        contract: esmGraph.KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
        profile: 'generic_visual',
        graphIdentity: 'package-smoke:graph',
        nodes: [{ id: 'n', label: 'Node', kind: 'model', color: '#fff', radius: 4 }],
        edges: [],
      };
      const esmPreparedGraph = esmGraph.prepareKnowledgeGraphPresentation(graphInput);
      const cjsPreparedGraph = cjsGraph.prepareKnowledgeGraphPresentation(graphInput);
      if (esmPreparedGraph.nodes[0]?.nodeGlyph !== 'sphere_outline' ||
          cjsPreparedGraph.nodes[0]?.nodeGlyph !== 'sphere_outline') {
        throw new Error('packed generic graph did not close its default glyph channel');
      }
      const parsedEsmGraph = esmGraph.parseKnowledgeGraphPresentationJson(
        JSON.stringify(graphInput)
      );
      const parsedCjsGraph = cjsGraph.parseKnowledgeGraphPresentationJson(
        JSON.stringify(graphInput)
      );
      for (const token of [
        esmPreparedGraph,
        cjsPreparedGraph,
        parsedEsmGraph,
        parsedCjsGraph,
      ]) {
        if (!esmGraph.isPreparedKnowledgeGraphPresentation(token) ||
            !cjsGraph.isPreparedKnowledgeGraphPresentation(token)) {
          throw new Error('mixed-format knowledge-graph capability handoff failed');
        }
        const esmBytes = esmGraph.serializePreparedKnowledgeGraphPresentation(token);
        const cjsBytes = cjsGraph.serializePreparedKnowledgeGraphPresentation(token);
        if (esmBytes !== cjsBytes ||
            esmGraph.isPreparedKnowledgeGraphPresentation(JSON.parse(esmBytes)) ||
            cjsGraph.isPreparedKnowledgeGraphPresentation(JSON.parse(cjsBytes))) {
          throw new Error('canonical graph record bytes drifted or rehydrated authority');
        }
      }
      for (const candidate of [
        { ...esmPreparedGraph },
        new Proxy(esmPreparedGraph, {}),
      ]) {
        if (esmGraph.isPreparedKnowledgeGraphPresentation(candidate) ||
            cjsGraph.isPreparedKnowledgeGraphPresentation(candidate)) {
          throw new Error('knowledge-graph capability identity was forgeable');
        }
      }
      if (!esmGraph.knowledgeGraphPresentationContainsNode(cjsPreparedGraph, 'n') ||
          !cjsGraph.knowledgeGraphPresentationContainsNode(esmPreparedGraph, 'n')) {
        throw new Error('mixed-format presentation membership lookup failed');
      }
      const esmViewOverCjsSource = esmGraph.prepareKnowledgeGraphView(
        cjsPreparedGraph,
        { nodeKinds: ['model'] },
      );
      const cjsViewOverEsmSource = cjsGraph.prepareKnowledgeGraphView(
        esmPreparedGraph,
        { nodeKinds: ['model'] },
      );
      for (const [view, source, wrongSource] of [
        [esmViewOverCjsSource, cjsPreparedGraph, esmPreparedGraph],
        [cjsViewOverEsmSource, esmPreparedGraph, cjsPreparedGraph],
      ]) {
        if (!esmGraph.isPreparedKnowledgeGraphView(view) ||
            !cjsGraph.isPreparedKnowledgeGraphView(view) ||
            !esmGraph.knowledgeGraphViewContainsNode(view, source, 'n') ||
            !cjsGraph.knowledgeGraphViewContainsNode(view, source, 'n')) {
          throw new Error('mixed-format knowledge-graph view handoff failed');
        }
        for (const graph of [esmGraph, cjsGraph]) {
          graph.assertPreparedKnowledgeGraphView(view, source);
          let wrongSourceRejected = false;
          try { graph.assertPreparedKnowledgeGraphView(view, wrongSource); } catch {
            wrongSourceRejected = true;
          }
          if (!wrongSourceRejected) {
            throw new Error('knowledge-graph view was rebound to an equal wrong source');
          }
        }
      }
      let forgedViewTrapCount = 0;
      const proxiedView = new Proxy(esmViewOverCjsSource, {
        get() { forgedViewTrapCount += 1; throw new Error('must not read forged view'); },
        getPrototypeOf() {
          forgedViewTrapCount += 1;
          throw new Error('must not inspect forged view');
        },
      });
      for (const candidate of [{ ...esmViewOverCjsSource }, proxiedView]) {
        if (esmGraph.isPreparedKnowledgeGraphView(candidate) ||
            cjsGraph.isPreparedKnowledgeGraphView(candidate)) {
          throw new Error('knowledge-graph view capability identity was forgeable');
        }
      }
      if (forgedViewTrapCount !== 0) {
        throw new Error('knowledge-graph view predicate executed candidate traps');
      }
      const corpusSpec = esmCore.getExamplePayload('corpus.knowledge_graph');
      const corpusSpecCjs = cjsCore.getExamplePayload('corpus.knowledge_graph');
      const esmCorpus = esmGraph.prepareCorpusKnowledgeGraphFigure(corpusSpec, {
        viewPolicy: { nodeKinds: ['paper'] },
      });
      const cjsCorpus = cjsGraph.prepareCorpusKnowledgeGraphFigure(corpusSpecCjs, {
        viewPolicy: { nodeKinds: ['paper'] },
      });
      const esmRawCorpus = esmGraph.prepareCorpusKnowledgeGraphFigureJson(
        JSON.stringify(corpusSpec),
        { viewPolicy: { nodeKinds: ['paper'] } },
      );
      const cjsRawCorpus = cjsGraph.prepareCorpusKnowledgeGraphFigureJson(
        JSON.stringify(corpusSpecCjs),
        { viewPolicy: { nodeKinds: ['paper'] } },
      );
      for (const result of [esmCorpus, cjsCorpus, esmRawCorpus, cjsRawCorpus]) {
        const expectedBackground = result.ok && result.hostPolicy.themeMode === 'light'
          ? '#f8fafc'
          : '#030711';
        const glyphByKind = {
          paper: 'sphere_outline',
          model: 'box_shell',
          family: 'diamond_shell',
        };
        const strokeByKind = {
          cites: 'solid',
          same_as: 'solid',
          variant_of: 'long_dash',
          instantiates: 'short_dash',
          belongs_to_family: 'dotted',
        };
        if (!result.ok || result.caption.length < 1 ||
            !esmGraph.isPreparedKnowledgeGraphPresentation(result.presentation) ||
            !cjsGraph.isPreparedKnowledgeGraphPresentation(result.presentation) ||
            !esmGraph.isPreparedKnowledgeGraphView(result.view) ||
            !cjsGraph.isPreparedKnowledgeGraphView(result.view) ||
            result.hostPolicy.presentation !== result.presentation ||
            result.hostPolicy.view !== result.view ||
            result.hostPolicy.sourceInputAssurance !== result.sourceInputAssurance ||
            result.hostPolicy.backgroundColor !== expectedBackground ||
            result.hostPolicy.liveForceAvailability?.status !== 'available' ||
            result.hostPolicy.liveForceAvailability.nodeCount !== result.view.nodes.length ||
            result.hostPolicy.liveForceAvailability.edgeCount !== result.view.edges.length ||
            !Object.isFrozen(result.hostPolicy.liveForceAvailability) ||
            !Object.isFrozen(result.hostPolicy.liveForceAvailability.exceeded) ||
            !result.presentation.nodes.every((node) =>
              node.nodeGlyph === glyphByKind[node.kind]) ||
            !result.presentation.edges.every((edge) =>
              edge.edgeStrokePattern === strokeByKind[edge.kind]) ||
            !Object.isFrozen(result.hostPolicy)) {
          throw new Error('packed corpus bind-and-prepare boundary is incoherent');
        }
      }
      const directSurfaceArgs = (presentation) => ({
        scene: {
          presentation,
          selectedId: null,
          query: '',
          onSelect() {},
          hoverId: null,
          onHover() {},
        },
        list: { presentation, selectedId: null, onSelect() {} },
        legend: { presentation },
        records: { presentation },
      });
      for (const [surface, result] of [
        [esmInteractiveGraph, esmCorpus],
        [cjsInteractiveGraph, cjsCorpus],
      ]) {
        const args = directSurfaceArgs(result.presentation);
        for (const [component, props] of [
          [surface.KnowledgeGraph3DScene, args.scene],
          [surface.KnowledgeGraphA11yList, args.list],
          [surface.KnowledgeGraphLegend, args.legend],
          [surface.KnowledgeGraphStaticRecordView, args.records],
        ]) {
          let rejected = false;
          try { component(props); } catch (error) {
            rejected = /only generic_visual/.test(String(error?.message));
          }
          if (!rejected) {
            throw new Error('direct packed graph surface accepted a captionless corpus token');
          }
        }
      }
      if (esmCorpus.sourceInputAssurance.boundary !== 'materialized_javascript_value' ||
          cjsCorpus.sourceInputAssurance.boundary !== 'materialized_javascript_value' ||
          esmRawCorpus.sourceInputAssurance.boundary !== 'raw_json_text' ||
          cjsRawCorpus.sourceInputAssurance.boundary !== 'raw_json_text') {
        throw new Error('packed corpus input assurance crossed its actual boundary');
      }
      const duplicateCorpus = esmGraph.prepareCorpusKnowledgeGraphFigureJson(
        JSON.stringify(corpusSpec).replace(
          '{',
          '{"skill":"corpus.knowledge_graph",',
        ),
      );
      if (duplicateCorpus.ok ||
          duplicateCorpus.errors?.[0]?.gateCode !== 'JSON_DUPLICATE_KEY') {
        throw new Error('packed raw corpus boundary admitted a duplicate member');
      }
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const input = JSON.stringify(contract.examples.valid[0]);
      const esmValidated = esmFigure.parseAndValidateRequest(input);
      const cjsValidated = cjsFigure.parseAndValidateRequest(input);
      const repairInput = JSON.parse(input);
      delete repairInput.contract;
      const esmRepaired = esmFigure.applySafeRepairs(repairInput);
      const cjsRepaired = cjsFigure.applySafeRepairs(repairInput);
      if (!esmValidated.ok || !cjsValidated.ok || !esmRepaired.ok || !cjsRepaired.ok) {
        throw new Error('mixed-format probe could not mint validated requests');
      }
      const combinations = [
        ['ESM to ESM', esmRenderer.buildFigureFromValidated(esmValidated.request)],
        ['CJS to CJS', cjsRenderer.buildFigureFromValidated(cjsValidated.request)],
        ['ESM to CJS', cjsRenderer.buildFigureFromValidated(esmValidated.request)],
        ['CJS to ESM', esmRenderer.buildFigureFromValidated(cjsValidated.request)],
        ['repaired ESM to CJS', cjsRenderer.buildFigureFromValidated(esmRepaired.request)],
        ['repaired CJS to ESM', esmRenderer.buildFigureFromValidated(cjsRepaired.request)],
      ];
      const expectedFigureResultKeys = [
        'ok',
        'artifact',
        'svg',
        'plan',
        'table',
        'disclosures',
      ];
      const assertRecursivelyFrozen = (root) => {
        const seen = new WeakSet();
        const pending = [root];
        while (pending.length > 0) {
          const current = pending.pop();
          if (seen.has(current)) continue;
          seen.add(current);
          if (!Object.isFrozen(current)) {
            throw new Error('built-figure result contains mutable nested state');
          }
          for (const key of Reflect.ownKeys(current)) {
            const descriptor = Object.getOwnPropertyDescriptor(current, key);
            const child = descriptor && Object.hasOwn(descriptor, 'value')
              ? descriptor.value
              : null;
            if (child !== null && typeof child === 'object') pending.push(child);
          }
        }
      };
      for (const [label, result] of combinations) {
        if (!result.ok || !result.svg.startsWith('<svg') ||
            !internalFigureResultCapability.isLiveBuiltFigureResult(result)) {
          throw new Error(label + ' request-capability handoff failed');
        }
        if (JSON.stringify(Reflect.ownKeys(result)) !==
              JSON.stringify(expectedFigureResultKeys) ||
            Object.getOwnPropertySymbols(result).length !== 0 ||
            result.table !== result.plan.table) {
          throw new Error(label + ' result is not the exact ordinary six-key record');
        }
        assertRecursivelyFrozen(result);
      }
      const populationContract = require(
        'cortexel/contract/skills/neuro.population_rate.v1.json'
      );
      const unrenderablePopulation = structuredClone(
        populationContract.examples.valid[0]
      );
      unrenderablePopulation.presentation = {
        ...unrenderablePopulation.presentation,
        width: 160,
      };
      const validatedUnrenderable = esmFigure.validateRequestValue(
        unrenderablePopulation
      );
      if (!validatedUnrenderable.ok) {
        throw new Error('packed width-160 population-rate negative is not valid input');
      }
      const layoutFailure = cjsRenderer.buildFigureFromValidated(
        validatedUnrenderable.request
      );
      if (layoutFailure.ok ||
          JSON.stringify(layoutFailure.errors.map((error) => error.code)) !==
            JSON.stringify(['RENDER_LAYOUT_UNAVAILABLE']) ||
          internalFigureResultCapability.isLiveBuiltFigureResult(layoutFailure)) {
        throw new Error('validated but unrenderable request received result authority');
      }
      const liveResult = combinations[0][1];
      const reconstructedResult = {
        ok: true,
        artifact: liveResult.artifact,
        svg: liveResult.svg,
        plan: liveResult.plan,
        table: liveResult.table,
        disclosures: liveResult.disclosures,
      };
      let figureResultProxyTraps = 0;
      const hostileResultProxy = new Proxy({}, {
        get() { figureResultProxyTraps++; throw new Error('unexpected result get'); },
        getOwnPropertyDescriptor() {
          figureResultProxyTraps++;
          throw new Error('unexpected result descriptor read');
        },
        getPrototypeOf() {
          figureResultProxyTraps++;
          throw new Error('unexpected result prototype read');
        },
        ownKeys() { figureResultProxyTraps++; throw new Error('unexpected result key read'); },
      });
      const spreadResult = { ...liveResult };
      if (JSON.stringify(Reflect.ownKeys(spreadResult)) !==
            JSON.stringify(expectedFigureResultKeys) ||
          internalFigureResultCapability.isLiveBuiltFigureResult(spreadResult)) {
        throw new Error('ordinary six-key spread inherited built-result authority');
      }
      for (const candidate of [
        spreadResult,
        structuredClone(liveResult),
        JSON.parse(JSON.stringify(liveResult)),
        reconstructedResult,
        hostileResultProxy,
      ]) {
        if (internalFigureResultCapability.isLiveBuiltFigureResult(candidate)) {
          throw new Error('built-figure-result identity was transferable or forgeable');
        }
      }
      try {
        internalFigureResultCapability.assertLiveBuiltFigureResult(hostileResultProxy);
        throw new Error('built-figure-result guard admitted a hostile Proxy');
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
      }
      if (figureResultProxyTraps !== 0) {
        throw new Error('built-figure-result rejection inspected a hostile Proxy');
      }
      const copiedToken = { ...esmValidated.request };
      const proxiedToken = new Proxy(esmValidated.request, {});
      for (const [label, candidate] of [
        ['copied', copiedToken],
        ['proxied', proxiedToken],
      ]) {
        for (const renderer of [esmRenderer, cjsRenderer]) {
          const result = renderer.buildFigureFromValidated(candidate);
          if (result.ok || result.errors?.[0]?.code !== 'RENDER_UNVALIDATED_REQUEST') {
            throw new Error(label + ' request token forged the private WeakSet capability');
          }
        }
      }
      for (const specifier of [
        'cortexel/internal/figure-result-capability',
        'cortexel/dist/internal/figure-result-capability.cjs',
        'cortexel/internal/request-capability',
        'cortexel/dist/internal/request-capability.cjs',
        'cortexel/internal/knowledge-graph-presentation-capability',
        'cortexel/dist/internal/knowledge-graph-presentation-capability.cjs',
      ]) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        try { require(specifier); } catch (error) {
          requireBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('private capability module escaped through package exports: ' + specifier);
        }
      }
      for (const specifier of [
        'cortexel/contract/../internal/figure-result-capability.cjs',
        'cortexel/contract/%2e%2e/internal/figure-result-capability.cjs',
        'cortexel/contract/../internal/request-capability.cjs',
        'cortexel/contract/%2e%2e/internal/request-capability.cjs',
        'cortexel/contract/../internal/knowledge-graph-presentation-capability.cjs',
        'cortexel/contract/%2e%2e/internal/knowledge-graph-presentation-capability.cjs',
      ]) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_INVALID_MODULE_SPECIFIER';
        }
        try { require(specifier); } catch (error) {
          requireBlocked = error?.code === 'ERR_INVALID_MODULE_SPECIFIER';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('contract wildcard traversed into the private runtime: ' + specifier);
        }
      }
      let privateImportBlocked = false;
      let privateRequireBlocked = false;
      try { await import('#cortexel-request-capability'); } catch (error) {
        privateImportBlocked = error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED';
      }
      try { require('#cortexel-request-capability'); } catch (error) {
        privateRequireBlocked =
          error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED' || error?.code === 'MODULE_NOT_FOUND';
      }
      if (!privateImportBlocked || !privateRequireBlocked) {
        throw new Error('consumer reached Cortexel package-private import mapping');
      }
      for (const specifier of [
        '#cortexel-figure-result-brand',
        '#cortexel-figure-result-capability',
        '#cortexel-validated-request-brand',
        '#cortexel-knowledge-graph-presentation-capability',
        '#cortexel-knowledge-graph-presentation-brand',
      ]) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED';
        }
        try { require(specifier); } catch (error) {
          requireBlocked =
            error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED' || error?.code === 'MODULE_NOT_FOUND';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('consumer reached Cortexel package-private nominal brand mapping');
        }
      }
    `,
  );
  phaseRun(
    'mixed-capability.esm',
    [join(fullConsumer, 'mixed-capability-probe.mjs')],
    fullConsumer,
  );

  // Build with the full consumer's exact locked esbuild + visualization peers
  // during prepare, while the reviewed POSIX supervisor can contain esbuild's
  // native service. The generated bundle and canonical build receipt are then
  // sealed with the workspace. Execute imports only that sealed bundle under the
  // normal reviewed launch-surface/network/write guard; the guard is never weakened.
  const browserBundleEntrySource = `
    import * as headless from 'cortexel/knowledge-graph';
    import * as interactive from 'cortexel/react/knowledge-graph';
    const input = {
      contract: headless.KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
      profile: 'generic_visual',
      graphIdentity: 'package-smoke:browser-bundle',
      nodes: [{ id: 'n', label: 'Node', kind: 'model', color: '#fff', radius: 4 }],
      edges: [],
    };
    const token = headless.prepareKnowledgeGraphPresentation(input);
    if (!interactive.isPreparedKnowledgeGraphPresentation(token)) {
      throw new Error('browser bundle split knowledge-graph capability identity');
    }
    const liveForce = interactive.knowledgeGraphLiveForceAvailability(
      interactive.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
      interactive.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
    );
    if (liveForce.status !== 'available' || !Object.isFrozen(liveForce)) {
      throw new Error('browser bundle omitted the live-force admission boundary');
    }
    const view = interactive.prepareKnowledgeGraphView(token, { nodeKinds: ['model'] });
    headless.assertPreparedKnowledgeGraphView(view, token);
    const rawRejected = headless.prepareCorpusKnowledgeGraphFigureJson('{}');
    if (rawRejected.ok || rawRejected.errors[0]?.code !== 'strict_gate_rejected') {
      throw new Error('browser bundle did not retain the raw corpus JSON boundary');
    }
    export const browserBundleCapabilityVerified = true;
  `;
  const browserBundleBuilderSource = `
    import { createHash } from 'node:crypto';
    import {
      lstatSync,
      readFileSync,
      realpathSync,
      writeFileSync,
    } from 'node:fs';
    import { dirname, join, relative, resolve, sep } from 'node:path';
    import { build, version as esbuildVersion } from 'esbuild';

    const root = import.meta.dirname;
    const entryFilename = ${JSON.stringify(BROWSER_BUNDLE_ENTRY_FILENAME)};
    const bundleFilename = ${JSON.stringify(BROWSER_BUNDLE_OUTPUT_FILENAME)};
    const receiptFilename = ${JSON.stringify(BROWSER_BUNDLE_RECEIPT_FILENAME)};
    const expectedVersion = ${JSON.stringify(REVIEWED_ESBUILD_VERSION)};
    const receiptSchema = ${JSON.stringify(BROWSER_BUNDLE_RECEIPT_SCHEMA)};
    const expectedPublicInputs = [
      'node_modules/cortexel/dist/knowledge-graph/index.js',
      'node_modules/cortexel/dist/react/knowledge-graph.js',
    ];
    ${generatedBrowserBundlePatternDeclarations()}
    const canonicalize = (value) => {
      if (value === null || typeof value === 'boolean' || typeof value === 'number' ||
          typeof value === 'string') return JSON.stringify(value);
      if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
      const keys = Object.keys(value).sort();
      return '{' + keys.map((key) => JSON.stringify(key) + ':' + canonicalize(value[key]))
        .join(',') + '}';
    };
    const sha256 = (value) => 'sha256:' + createHash('sha256').update(value).digest('hex');
    const relativePath = (value) => {
      const absolute = resolve(root, value);
      const result = relative(root, absolute).split(sep).join('/');
      if (result === '' || result === '..' || result.startsWith('../')) {
        throw new Error('browser-bundle path escaped the full consumer');
      }
      return result;
    };

    if (esbuildVersion !== expectedVersion) {
      throw new Error('browser bundle used an unreviewed esbuild version');
    }
    const result = await build({
      absWorkingDir: root,
      entryPoints: [entryFilename],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      conditions: ['browser', 'import', 'default'],
      treeShaking: true,
      write: false,
      metafile: true,
      logLevel: 'silent',
      legalComments: 'none',
      charset: 'utf8',
    });
    if (result.outputFiles.length !== 1) {
      throw new Error('browser bundle produced an ambiguous output set');
    }
    const inputPaths = new Set(Object.keys(result.metafile.inputs).map(relativePath));
    for (const expected of expectedPublicInputs) {
      if (!inputPaths.has(expected)) {
        throw new Error('browser bundle omitted reviewed public input ' + expected);
      }
    }
    const outputs = Object.values(result.metafile.outputs);
    if (outputs.length !== 1) throw new Error('browser bundle metafile output is ambiguous');
    const outputInputs = new Map(Object.entries(outputs[0].inputs).map(
      ([path, value]) => [relativePath(path), value],
    ));
    const packageRoot = realpathSync(join(root, 'node_modules', 'cortexel'));
    const warnings = result.warnings.map((warning) => {
      if (warning.id !== 'ignored-bare-import' || warning.location == null) {
        throw new Error('browser bundle emitted an unreviewed warning');
      }
      const source = relativePath(warning.location.file);
      if (!expectedPublicInputs.includes(source)) {
        throw new Error('ignored bare import came from an unreviewed source');
      }
      const match = reviewedBareChunkImport.exec(warning.location.lineText);
      if (match == null) throw new Error('ignored bare import has an unreviewed spelling');
      const target = relativePath(join(dirname(source), match[1]));
      if (!reviewedInstalledChunkPath.test(target)) {
        throw new Error('ignored bare import targets an unreviewed path');
      }
      const targetPath = resolve(root, target);
      const targetStats = lstatSync(targetPath);
      const targetReal = realpathSync(targetPath);
      if (!targetStats.isFile() || targetStats.isSymbolicLink() || targetStats.nlink !== 1 ||
          !targetReal.startsWith(packageRoot + sep)) {
        throw new Error('ignored bare import lacks installed-package file authority');
      }
      const bytesInOutput = outputInputs.get(target)?.bytesInOutput;
      if (!Number.isSafeInteger(bytesInOutput) || bytesInOutput < 1) {
        throw new Error('ignored bare target is not independently retained in the bundle');
      }
      return {
        id: warning.id,
        source,
        line: warning.location.line,
        lineText: warning.location.lineText,
        target,
        bytesInOutput,
      };
    }).sort((left, right) => {
      const a = canonicalize(left);
      const b = canonicalize(right);
      return a < b ? -1 : a > b ? 1 : 0;
    });
    const warningKeys = warnings.map((warning) => canonicalize([
      warning.source,
      warning.line,
      warning.lineText,
      warning.target,
    ]));
    if (new Set(warningKeys).size !== warningKeys.length) {
      throw new Error('browser bundle emitted duplicate warnings');
    }
    const bundle = Buffer.from(result.outputFiles[0].contents);
    const bundleText = bundle.toString('utf8');
    if (bundleText.includes('#cortexel-knowledge-graph-presentation-capability')) {
      throw new Error('browser bundle retained an unresolved private capability specifier');
    }
    const entrySource = readFileSync(join(root, entryFilename));
    const receipt = {
      schema: receiptSchema,
      esbuildVersion,
      entrySourceSha256: sha256(entrySource),
      bundleSha256: sha256(bundle),
      bundleBytes: bundle.byteLength,
      publicInputs: expectedPublicInputs,
      warnings,
    };
    writeFileSync(join(root, bundleFilename), bundle, { flag: 'wx', mode: 0o644 });
    writeFileSync(
      join(root, receiptFilename),
      canonicalize(receipt) + '\\n',
      { encoding: 'utf8', flag: 'wx', mode: 0o644 },
    );
  `;
  const browserEntryPath = join(fullConsumer, BROWSER_BUNDLE_ENTRY_FILENAME);
  const browserBuilderPath = join(fullConsumer, BROWSER_BUNDLE_BUILDER_FILENAME);
  const browserOutputPath = join(fullConsumer, BROWSER_BUNDLE_OUTPUT_FILENAME);
  phaseWriteFile(browserEntryPath, browserBundleEntrySource);
  phaseWriteFile(browserBuilderPath, browserBundleBuilderSource);
  if (phase === 'prepare') {
    run(
      nodeExecutable,
      [browserBuilderPath],
      fullConsumer,
      PACKAGE_SMOKE_COMMAND_POLICIES.browserBundle,
    );
  }
  assertPreparedBrowserBundle({
    consumer: fullConsumer,
    entrySource: browserBundleEntrySource,
    packedPaths,
    permissionPhase: phase === 'prepare' ? 'prepared-writable' : 'finalized-read-only',
  });
  phaseRun('browser-bundle.esm', [browserOutputPath], fullConsumer);

  // Resolve the package from the probe module, then execute it from a directory with
  // no package.json, node_modules, or contract tree. Validation must locate schemas
  // relative to the installed bundle rather than process.cwd().
  phaseWriteFile(
    join(consumer, 'unrelated-cwd-probe.mjs'),
    `
      import * as figure from 'cortexel/figure';
      import * as renderSvg from 'cortexel/render-svg';
      import * as nestAdapter from 'cortexel/adapters/nest';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const result = figure.parseAndValidateRequest(JSON.stringify(contract.examples.valid[0]));
      if (!result.ok || typeof renderSvg.buildFigure !== 'function' ||
          typeof nestAdapter.nestSpikeRecorderToRaster !== 'function') {
        throw new Error('ESM validation failed from unrelated cwd');
      }
    `,
  );
  phaseWriteFile(
    join(consumer, 'unrelated-cwd-probe.cjs'),
    `
      const figure = require('cortexel/figure');
      const renderSvg = require('cortexel/render-svg');
      const nestAdapter = require('cortexel/adapters/nest');
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const result = figure.parseAndValidateRequest(JSON.stringify(contract.examples.valid[0]));
      if (!result.ok || typeof renderSvg.buildFigure !== 'function' ||
          typeof nestAdapter.nestSpikeRecorderToRaster !== 'function') {
        throw new Error('CJS validation failed from unrelated cwd');
      }
    `,
  );
  phaseRun(
    'unrelated-cwd.esm',
    [join(consumer, 'unrelated-cwd-probe.mjs')],
    unrelated,
  );
  phaseRun(
    'unrelated-cwd.cjs',
    [join(consumer, 'unrelated-cwd-probe.cjs')],
    unrelated,
  );

  const installedCliEsm = join(installedRoot, 'dist', 'cli', 'main.js');
  assertInstalledNodeBinShim(consumer, 'cortexel', installedCliEsm);
  const runInstalledCli = (
    operation: Exclude<PackageSmokeExecuteOperation, PackageSmokePhaseOperation>,
    args: string[],
  ): ReviewedNodeCommandResult => {
    // Execute is a finalized, globally write-denied evidence phase. Publication
    // semantics have their own CLI tests; the installed-package probe exercises the
    // complete adapter/validation/derivation/render path through --dry-run without
    // weakening this phase or running target code before the workspace seal.
    if (args.includes('--output') || args.includes('--force')) {
      fail('finalized installed-CLI probe requested forbidden publication authority');
    }
    return executeRunResult(operation, [installedCliEsm, ...args], unrelated);
  };

  phaseWriteFile(
    join(consumer, 'import-cli.mjs'),
    `await import(${JSON.stringify(pathToFileURL(installedCliEsm).href)});\nprocess.stdout.write('imported\\n');\n`,
  );
  phaseWriteFile(
    join(consumer, 'import-cli.cjs'),
    `(async () => {\n` +
      `  await import(${JSON.stringify(pathToFileURL(installedCliEsm).href)});\n` +
      `  process.stdout.write('imported\\n');\n` +
      `})().catch(() => { process.exitCode = 1; });\n`,
  );
  const authoringFixturePaths = new Map<string, string>();
  for (const skillId of SOURCE_STABLE_SKILL_IDS) {
    const authoringPath = join(unrelated, `authoring-${skillId}.json`);
    phaseWriteFile(
      authoringPath,
      `${canonicalize(SOURCE_SKILL_AUTHORING[skillId].authoringExample)}\n`,
    );
    authoringFixturePaths.set(skillId, authoringPath);
  }
  const sourceAdapterExample =
    SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].example;
  const sourceAdapterCliExamplePath = join(
    unrelated,
    'source-example-nest-spike-recorder.json',
  );
  phaseWriteFile(
    sourceAdapterCliExamplePath,
    `${canonicalize(sourceAdapterExample)}\n`,
  );
  const guardedSourceAdapterInputPath = join(
    unrelated,
    'source-example-guarded-input-nest-spike-recorder.json',
  );
  phaseWriteFile(
    guardedSourceAdapterInputPath,
    `${canonicalize(sourceAdapterExample.inputTemplate)}\n`,
  );

  const callerCaptureTemplate = structuredClone(sourceAdapterExample.inputTemplate);
  const callerCaptureOptions = {
    ...callerCaptureTemplate.options,
  } as Record<string, unknown>;
  // This package-smoke fixture explicitly models the post-replacement caller
  // boundary. The shipped outer envelope and guarded nested input are exercised
  // separately as negative controls; no installed-package path strips this marker.
  delete callerCaptureOptions[SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER];
  callerCaptureOptions.captureAuthority = {
    ...(callerCaptureOptions.captureAuthority as Record<string, unknown>),
    kind: 'caller_declaration',
  };
  const sourceAdapterCallerCapture = {
    exportedStatus: callerCaptureTemplate.exportedStatus,
    options: callerCaptureOptions,
  } as unknown as {
    readonly exportedStatus: Parameters<typeof sourceNestSpikeRecorderToRaster>[0];
    readonly options: Parameters<typeof sourceNestSpikeRecorderToRaster>[1];
  };
  const sourceAdapterFixturePath = join(
    unrelated,
    'source-adapter-test-owned-nest-spike-recorder.json',
  );
  phaseWriteFile(
    sourceAdapterFixturePath,
    `${canonicalize(sourceAdapterCallerCapture)}\n`,
  );
  const sourceAdapted = sourceNestSpikeRecorderToRaster(
    sourceAdapterCallerCapture.exportedStatus,
    sourceAdapterCallerCapture.options,
  );
  if (!sourceAdapted.ok) {
    fail('source adapter rejected the explicit test-owned caller capture before package execution');
  }
  const sourceAdaptedValidation = validateSourceRequestValue(sourceAdapted.request);
  if (!sourceAdaptedValidation.ok) {
    fail('source adapter example failed the source validation pipeline before package execution');
  }
  const adaptedRequestPath = join(unrelated, 'adapted-nest-spike-raster.json');
  const expectedAdaptedRequest =
    `${canonicalize(sourceAdaptedValidation.request.canonicalRequest)}\n`;
  phaseWriteFile(adaptedRequestPath, expectedAdaptedRequest);
  if (phase === 'execute') {
    for (const importer of ['import-cli.mjs', 'import-cli.cjs']) {
      const imported = executeRunResult(
        importer === 'import-cli.mjs' ? 'cli.import.esm' : 'cli.import.cjs',
        [join(consumer, importer)],
        unrelated,
      );
      if (imported.status !== 0 || imported.stdout !== 'imported\n' || imported.stderr !== '') {
        throw new Error(`packed CLI import guard failed for ${importer}`);
      }
    }

    const identityResult = runInstalledCli('cli.identity', ['identity', '--json']);
    if (identityResult.status !== 0 || identityResult.stderr !== '') {
      throw new Error('packed CLI identity command failed');
    }
    const cliIdentityValue = strictJson(identityResult.stdout, 'installed CLI identity');
    if (!isRecord(cliIdentityValue)) throw new Error('packed CLI identity is not an object');
    const cliIdentity = cliIdentityValue;
    const installedContractManifest = JSON.parse(readUtf8RegularFileStable(
      join(installedRoot, 'dist', 'contract', 'manifest.v1.json'),
      'installed contract manifest',
      MAX_JSON_BYTES,
    )) as Record<string, unknown>;
    const installedPackage = JSON.parse(readUtf8RegularFileStable(
      join(installedRoot, 'package.json'),
      'installed Cortexel package metadata',
      MAX_JSON_BYTES,
    )) as Record<string, unknown>;
    if (installedPackage.main !== './dist/index.cjs') {
      throw new Error('legacy main entry was not retained alongside package exports');
    }
    if (
      cliIdentity.packageVersion !== installedPackage.version ||
      cliIdentity.contractDigest !== installedContractManifest.contractDigest ||
      cliIdentity.catalogDigest !== installedContractManifest.catalogDigest ||
      cliIdentity.catalogDigestDomain !== installedContractManifest.catalogDigestDomain ||
      cliIdentity.sourceRevision !== 'unreleased-worktree' ||
      cliIdentity.release !== false
    ) {
      throw new Error('packed CLI identity differs from shipped package/contract bytes');
    }

    const catalogResult = runInstalledCli('cli.catalog', ['catalog', '--json']);
    if (catalogResult.status !== 0 || catalogResult.stderr !== '') {
      throw new Error('packed CLI catalog command failed');
    }
    const cliCatalog = strictJson(catalogResult.stdout, 'installed CLI catalog');
    if (
      !isRecord(cliCatalog) ||
      cliCatalog.protocol !== 'cortexel-cli-catalog' ||
      cliCatalog.protocolVersion !== 1 ||
      !Array.isArray(cliCatalog.skills)
    ) {
      throw new Error('packed CLI catalog protocol is malformed');
    }
    const catalogIds = cliCatalog.skills.map((candidate) =>
      isRecord(candidate) && typeof candidate.id === 'string' ? candidate.id : null
    );
    const manifestSkills = installedContractManifest.stableSkills;
    if (!Array.isArray(manifestSkills)) {
      throw new Error('installed contract manifest stableSkills is malformed');
    }
    const manifestIds = manifestSkills.map((candidate) =>
      isRecord(candidate) && typeof candidate.id === 'string' ? candidate.id : null
    ).sort();
    if (
      catalogIds.some((id) => id === null) ||
      JSON.stringify([...catalogIds].sort()) !== JSON.stringify(manifestIds) ||
      catalogIds.length !== 19
    ) {
      throw new Error('packed CLI catalog does not enumerate the exact stable manifest ids');
    }

    const sourceCatalogResult = runInstalledCli(
      'cli.source-catalog',
      ['source', 'catalog', '--json'],
    );
    if (sourceCatalogResult.status !== 0 || sourceCatalogResult.stderr !== '') {
      throw new Error('packed CLI source catalog command failed');
    }
    const cliSourceCatalog = strictJson(
      sourceCatalogResult.stdout,
      'installed CLI source catalog',
    );
    if (
      !isRecord(cliSourceCatalog) ||
      cliSourceCatalog.protocol !== 'cortexel-cli-source-catalog' ||
      cliSourceCatalog.protocolVersion !== 1 ||
      typeof cliSourceCatalog.sourceAdapterCatalogDigest !== 'string' ||
      typeof cliSourceCatalog.sourceAdapterCatalogDigestDomain !== 'string' ||
      !isRecord(cliSourceCatalog.sourceAdapterCatalogDigestPreimage) ||
      !Array.isArray(cliSourceCatalog.adapters) ||
      cliSourceCatalog.adapters.length !== 1 ||
      !isRecord(cliSourceCatalog.adapters[0]) ||
      cliSourceCatalog.adapters[0].id !== 'nest-spike-recorder' ||
      cliSourceCatalog.adapters[0].outputSkillId !== 'neuro.spike_raster'
    ) {
      throw new Error('packed CLI source catalog protocol is malformed');
    }
    if (
      canonicalize(cliSourceCatalog.sourceAdapterCatalogDigestPreimage) !==
        canonicalize(SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE) ||
      canonicalize(cliSourceCatalog.adapters) !==
        canonicalize(SOURCE_ADAPTER_DISCOVERY_CATALOG.adapters) ||
      cliSourceCatalog.sourceAdapterCatalogDigestPreimage.domain !==
        cliSourceCatalog.sourceAdapterCatalogDigestDomain ||
      canonicalize(cliSourceCatalog.sourceAdapterCatalogDigestPreimage.catalog) !==
        canonicalize({
          protocol: 'cortexel-source-adapter-discovery-catalog',
          protocolVersion: 1,
          adapters: cliSourceCatalog.adapters,
        }) ||
      sha256(canonicalize(cliSourceCatalog.sourceAdapterCatalogDigestPreimage)) !==
        cliSourceCatalog.sourceAdapterCatalogDigest
    ) {
      throw new Error('packed CLI source discovery bytes do not reproduce its digest');
    }
    const sourceDescribeResult = runInstalledCli('cli.source-describe', [
      'source',
      'describe',
      'nest-spike-recorder',
      '--json',
    ]);
    const sourceDescription = strictJson(
      sourceDescribeResult.stdout,
      'installed CLI source description',
    );
    if (
      sourceDescribeResult.status !== 0 ||
      sourceDescribeResult.stderr !== '' ||
      !isRecord(sourceDescription) ||
      sourceDescription.protocol !== 'cortexel-cli-source-describe' ||
      sourceDescription.protocolVersion !== 1 ||
      sourceDescription.sourceAdapterDescriptorDigestDomain !==
        SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN ||
      sourceDescription.sourceAdapterDescriptorDigest !==
        SOURCE_ADAPTER_DESCRIPTOR_DIGESTS['nest-spike-recorder'] ||
      canonicalize(sourceDescription.adapter) !==
        canonicalize(SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder']) ||
      sha256(canonicalize({
        domain: sourceDescription.sourceAdapterDescriptorDigestDomain,
        descriptor: sourceDescription.adapter,
      })) !== sourceDescription.sourceAdapterDescriptorDigest
    ) {
      throw new Error('packed CLI source description differs from prepared source');
    }
    const sourceExampleResult = runInstalledCli('cli.source-example.initial', [
      'source',
      'example',
      'nest-spike-recorder',
    ]);
    if (sourceExampleResult.status !== 0 || sourceExampleResult.stderr !== '') {
      throw new Error('packed CLI source example command failed');
    }
    parseAndAssertExactJsonValue(
      sourceExampleResult.stdout,
      'installed CLI source example',
      sourceAdapterExample,
    );
    // Deterministic stdout is a separate property from the descriptor-bound JSON
    // value: compare two packed invocations, never pretty JSON against JCS bytes.
    const repeatedSourceExampleResult = runInstalledCli('cli.source-example.repeat', [
      'source',
      'example',
      'nest-spike-recorder',
    ]);
    if (
      repeatedSourceExampleResult.status !== sourceExampleResult.status ||
      repeatedSourceExampleResult.stdout !== sourceExampleResult.stdout ||
      repeatedSourceExampleResult.stderr !== sourceExampleResult.stderr
    ) {
      throw new Error('packed CLI source example output is not deterministic');
    }
    const guardedSourceAdapt = runInstalledCli('cli.source-adapt.guarded-envelope', [
      'source',
      'adapt',
      'nest-spike-recorder',
      sourceAdapterCliExamplePath,
      '--format',
      'json',
    ]);
    if (
      guardedSourceAdapt.status !== 5 ||
      guardedSourceAdapt.stdout !== '' ||
      !guardedSourceAdapt.stderr.includes('not simulator output')
    ) {
      throw new Error('packed CLI admitted its unchanged synthetic source example');
    }
    const guardedInputAdapt = runInstalledCli('cli.source-adapt.guarded-input', [
      'source',
      'adapt',
      'nest-spike-recorder',
      guardedSourceAdapterInputPath,
      '--format',
      'json',
    ]);
    if (
      guardedInputAdapt.status !== 5 ||
      guardedInputAdapt.stdout !== '' ||
      !guardedInputAdapt.stderr.includes(SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER)
    ) {
      throw new Error('packed CLI admitted the extracted guarded synthetic input');
    }
    const sourceAdaptResult = runInstalledCli('cli.source-adapt.caller-capture', [
      'source',
      'adapt',
      'nest-spike-recorder',
      sourceAdapterFixturePath,
      '--format',
      'json',
    ]);
    if (sourceAdaptResult.status !== 0 || sourceAdaptResult.stderr !== '') {
      throw new Error('packed CLI source adapter rejected the explicit test-owned caller capture');
    }
    const adaptedRequest = strictJson(
      sourceAdaptResult.stdout,
      'installed CLI adapted request',
    );
    if (
      !isRecord(adaptedRequest) ||
      !isRecord(adaptedRequest.skill) ||
      adaptedRequest.skill.id !== 'neuro.spike_raster' ||
      sourceAdaptResult.stdout !== expectedAdaptedRequest
    ) {
      throw new Error('packed CLI source adapter emitted bytes differing from prepared source');
    }
    const adaptedValidation = runInstalledCli(
      'cli.validate-adapted',
      ['validate', adaptedRequestPath],
    );
    const adaptedRender = runInstalledCli('cli.render-adapted', [
      'render',
      adaptedRequestPath,
      '--dry-run',
      '--format',
      'json',
    ]);
    if (
      adaptedValidation.status !== 0 ||
      adaptedValidation.stderr !== '' ||
      adaptedRender.status !== 0 ||
      adaptedRender.stderr !== ''
    ) {
      throw new Error('packed CLI adapted request did not validate and render end to end');
    }
    const adaptedRenderValue = strictJson(
      adaptedRender.stdout,
      'installed CLI adapted-request dry render',
    );
    const directSourceDryRun = runInstalledCli('cli.source-render', [
      'source',
      'render',
      'nest-spike-recorder',
      sourceAdapterFixturePath,
      '--dry-run',
      '--format',
      'json',
    ]);
    if (directSourceDryRun.status !== 0 || directSourceDryRun.stderr !== '') {
      throw new Error('packed CLI direct source dry render failed');
    }
    const directSourceDryRunValue = strictJson(
      directSourceDryRun.stdout,
      'installed CLI direct source dry render',
    );
    if (
      !isRecord(directSourceDryRunValue) ||
      directSourceDryRunValue.protocol !== 'cortexel-cli-source-render' ||
      directSourceDryRunValue.protocolVersion !== 1 ||
      directSourceDryRunValue.ok !== true ||
      directSourceDryRunValue.dryRun !== true ||
      !isRecord(directSourceDryRunValue.sourceAdapterExecution) ||
      directSourceDryRunValue.sourceAdapterExecution.id !== 'nest-spike-recorder' ||
      directSourceDryRunValue.sourceAdapterExecution.revision !== 5 ||
      directSourceDryRunValue.sourceAdapterExecution.catalogDigest !==
        cliSourceCatalog.sourceAdapterCatalogDigest ||
      directSourceDryRunValue.sourceAdapterExecution.catalogDigestDomain !==
        cliSourceCatalog.sourceAdapterCatalogDigestDomain ||
      directSourceDryRunValue.sourceAdapterExecution.sourceAuthentication !==
        'not_performed' ||
      directSourceDryRunValue.sourceAdapterExecution.requestDigest !==
        sourceAdaptedValidation.request.requestDigest ||
      typeof directSourceDryRunValue.sourceAdapterExecution.artifactDigest !== 'string' ||
      !/^sha256:[0-9a-f]{64}$/u.test(
        directSourceDryRunValue.sourceAdapterExecution.artifactDigest,
      ) ||
      !isRecord(adaptedRenderValue) ||
      directSourceDryRunValue.svgByteLength !== adaptedRenderValue.svgByteLength ||
      directSourceDryRunValue.tableRowsTotal !== adaptedRenderValue.tableRowsTotal
    ) {
      throw new Error('packed CLI direct source-render protocol or dry-run parity failed');
    }

    let discoveryCompilationProfile: Record<string, JsonValue> | undefined;
    let discoveryResources: JsonValue[] | undefined;
    const discoverySkills: Record<string, JsonValue>[] = [];
    // Process output is evidence to compare, never command-selection authority.
    // Drive the closed matrix from the source-owned stable-id tuple.
    for (const skillId of SOURCE_STABLE_SKILL_IDS) {
      const describeResult = runInstalledCli(`cli.describe-all.${skillId}`, [
        'describe',
        skillId,
        '--json',
        '--section',
        'all',
      ]);
      if (describeResult.status !== 0 || describeResult.stderr !== '') {
        throw new Error(`packed CLI describe failed for ${skillId}`);
      }
      const described = strictJson(
        describeResult.stdout,
        `installed CLI describe ${skillId}`,
      );
      if (
        !isRecord(described) ||
        described.protocol !== 'cortexel-cli-describe' ||
        described.protocolVersion !== 1 ||
        described.section !== 'all' ||
        !isRecord(described.buildIdentity) ||
        described.buildIdentity.catalogDigest !== installedContractManifest.catalogDigest ||
        !isRecord(described.skill) ||
        described.skill.id !== skillId ||
        !isRecord(described.requestSchema) ||
        !isRecord(described.authoringExample) ||
        !isRecord(described.schemaCompilationProfile) ||
        !Array.isArray(described.schemaResources)
      ) {
        throw new Error(`packed CLI describe protocol is malformed for ${skillId}`);
      }
      if (
        !isRecord(described.authoringExample.source) ||
        described.authoringExample.source.kind !== 'synthetic_fixture'
      ) {
        throw new Error(`packed CLI authoring fixture is not synthetic for ${skillId}`);
      }
      if (discoveryResources === undefined) {
        discoveryResources = described.schemaResources;
      } else if (
        canonicalize(discoveryResources) !== canonicalize(described.schemaResources)
      ) {
        throw new Error('packed CLI describe schema resources differ between skills');
      }
      if (discoveryCompilationProfile === undefined) {
        discoveryCompilationProfile = described.schemaCompilationProfile;
      } else if (
        canonicalize(discoveryCompilationProfile) !==
          canonicalize(described.schemaCompilationProfile)
      ) {
        throw new Error('packed CLI describe schema compilation profiles differ between skills');
      }
      discoverySkills.push({
        ...described.skill,
        requestSchema: described.requestSchema,
        authoringExample: described.authoringExample,
      });

      const authoringPath = authoringFixturePaths.get(skillId);
      if (authoringPath === undefined) {
        throw new Error(`packed CLI described an unprepared stable skill ${skillId}`);
      }
      if (
        readUtf8RegularFileStable(
          authoringPath,
          `prepared authoring fixture ${skillId}`,
          MAX_JSON_BYTES,
        ) !== `${canonicalize(described.authoringExample)}\n`
      ) {
        throw new Error(`packed CLI authoring fixture differs from prepared source for ${skillId}`);
      }
      const validateResult = runInstalledCli(
        `cli.validate-authoring.${skillId}`,
        ['validate', authoringPath],
      );
      if (validateResult.status !== 0 || validateResult.stderr !== '') {
        throw new Error(`packed CLI rejected its own authoring fixture for ${skillId}`);
      }
    }
    discoverySkills.sort((left, right) =>
      String(left.id) < String(right.id) ? -1 : String(left.id) > String(right.id) ? 1 : 0
    );
    if (
      discoveryResources === undefined ||
      discoveryCompilationProfile === undefined ||
      sha256(canonicalize({
        domain: installedContractManifest.catalogDigestDomain,
        schemaCompilationProfile: discoveryCompilationProfile,
        schemaResources: discoveryResources,
        skills: discoverySkills,
      })) !== installedContractManifest.catalogDigest
    ) {
      throw new Error('packed CLI discovery bytes do not reproduce catalogDigest');
    }

    const unknownResult = runInstalledCli('cli.unknown-skill', [
      'describe',
      'neuro.reponse_curve',
      '--json',
    ]);
    const unknownPayload = strictJson(
      unknownResult.stderr,
      'installed CLI unknown-skill error',
    );
    if (
      unknownResult.status !== 2 ||
      unknownResult.stdout !== '' ||
      !isRecord(unknownPayload) ||
      unknownPayload.protocol !== 'cortexel-cli-error' ||
      !isRecord(unknownPayload.error) ||
      unknownPayload.error.code !== 'CLI_UNKNOWN_STABLE_SKILL' ||
      unknownPayload.error.didYouMean !== 'neuro.response_curve'
    ) {
      throw new Error('packed CLI unknown-skill protocol is malformed');
    }
    const unknownSourceResult = runInstalledCli('cli.unknown-source', [
      'source',
      'describe',
      'nest-multimeter',
      '--json',
    ]);
    const unknownSourcePayload = strictJson(
      unknownSourceResult.stderr,
      'installed CLI unknown-source error',
    );
    if (
      unknownSourceResult.status !== 2 ||
      unknownSourceResult.stdout !== '' ||
      !isRecord(unknownSourcePayload) ||
      unknownSourcePayload.protocol !== 'cortexel-cli-error' ||
      !isRecord(unknownSourcePayload.error) ||
      unknownSourcePayload.error.code !== 'CLI_UNKNOWN_SOURCE_ADAPTER'
    ) {
      throw new Error('packed CLI unknown-source protocol is malformed');
    }
  }

  const validRequestPath = join(unrelated, 'valid.json');
  const malformedPath = join(unrelated, 'malformed.json');
  const structuralPath = join(unrelated, 'structural.json');
  const legacyPath = join(unrelated, 'legacy.json');
  const installedSpikeContract = JSON.parse(readUtf8RegularFileStable(
    join(installedRoot, 'dist', 'contract', 'skills', 'neuro.spike_raster.v1.json'),
    'installed spike-raster contract',
    MAX_JSON_BYTES,
  )) as { examples: { valid: unknown[] } };
  phaseWriteFile(validRequestPath, `${JSON.stringify(installedSpikeContract.examples.valid[0])}\n`);
  phaseWriteFile(malformedPath, '{');
  phaseWriteFile(structuralPath, '{}\n');
  phaseWriteFile(
    legacyPath,
    '{"skill":{"id":"nest.voltage_trace"},"data":{},"parameters":{}}\n',
  );
  const cliExitCases: Array<{
    operation: (typeof PACKAGE_SMOKE_CLI_EXIT_OPERATIONS)[number];
    args: string[];
    expected: number;
  }> = [
    { operation: 'cli.exit.usage', args: [], expected: 2 },
    { operation: 'cli.exit.valid', args: ['validate', validRequestPath], expected: 0 },
    {
      operation: 'cli.exit.malformed',
      args: ['validate', malformedPath],
      expected: 3,
    },
    {
      operation: 'cli.exit.structural',
      args: ['validate', structuralPath],
      expected: 4,
    },
    { operation: 'cli.exit.legacy', args: ['migrate', legacyPath], expected: 5 },
    {
      operation: 'cli.exit.absent',
      args: ['validate', join(unrelated, 'absent.json')],
      expected: 7,
    },
  ];
  if (phase === 'execute') {
    for (const testCase of cliExitCases) {
      const result = runInstalledCli(testCase.operation, testCase.args);
      if (result.status !== testCase.expected) {
        throw new Error(
          `packed CLI exit mismatch: expected ${testCase.expected}, got ${result.status}`,
        );
      }
    }
  }

  consumer = chartsConsumer;
  installedRoot = join(consumer, 'node_modules', 'cortexel');
  for (const forbiddenHeavyPeer of ['three', '@react-three/fiber', 'd3-force-3d']) {
    if (existsSync(join(consumer, 'node_modules', forbiddenHeavyPeer))) {
      throw new Error(`chart-only probe unexpectedly installed heavy peer ${forbiddenHeavyPeer}`);
    }
  }

  // The canonical chart subpath is intentionally React + SVG only. Exercise it
  // before installing three/r3f/d3 so an accidental heavyweight import fails.
  for (const mode of ['import', 'require'] as const) {
    const expression = mode === 'import'
      ? `
          const charts = await import('cortexel/react/charts');
          if (typeof charts.ReferenceVizSpecFigure !== 'function' ||
              typeof charts.ReferenceChartScene !== 'function' ||
              Object.hasOwn(charts, 'CheckedReferenceChartScene') ||
              typeof charts.binnedStepPath !== 'function' ||
              typeof charts.boundedStemPointPaths !== 'function' ||
              typeof charts.matrixValueBucketPaths !== 'function' ||
              typeof charts.circleTopologyGeometry !== 'function' ||
              typeof charts.equalAspectDomains !== 'function' ||
              charts.REFERENCE_CHART_SKILLS?.length !== 19 ||
              !charts.REFERENCE_CHART_SKILLS.includes('nest.spatial_map_2d')) {
            throw new Error('ESM chart exports are incomplete');
          }
        `
      : `
          const charts = require('cortexel/react/charts');
          if (typeof charts.ReferenceVizSpecFigure !== 'function' ||
              typeof charts.ReferenceChartScene !== 'function' ||
              Object.hasOwn(charts, 'CheckedReferenceChartScene') ||
              typeof charts.binnedStepPath !== 'function' ||
              typeof charts.boundedStemPointPaths !== 'function' ||
              typeof charts.matrixValueBucketPaths !== 'function' ||
              typeof charts.circleTopologyGeometry !== 'function' ||
              typeof charts.equalAspectDomains !== 'function' ||
              charts.REFERENCE_CHART_SKILLS?.length !== 19 ||
              !charts.REFERENCE_CHART_SKILLS.includes('nest.spatial_map_2d')) {
            throw new Error('CJS chart exports are incomplete');
          }
        `;
    phaseRun(
      `charts.${mode}`,
      mode === 'import'
        ? ['--input-type=module', '-e', expression]
        : ['-e', expression],
      consumer,
    );
  }

  consumer = fullConsumer;
  installedRoot = join(consumer, 'node_modules', 'cortexel');

  for (const mode of ['import', 'require'] as const) {
    const expression =
      mode === 'import'
        ? `
            const react = await import('cortexel/react');
            const graph = await import('cortexel/react/knowledge-graph');
            const headlessGraph = await import('cortexel/knowledge-graph');
            const liveLimit = graph.knowledgeGraphLiveForceAvailability(
              graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
              graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
            );
            const liveOverLimit = graph.knowledgeGraphLiveForceAvailability(
              graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES + 1,
              graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES + 1,
            );
            if (typeof react.VizSpecRenderer !== 'function' ||
                typeof react.PopulationA11yList !== 'function' ||
                typeof react.NeuronA11yPager !== 'function' ||
                typeof graph.KnowledgeGraph3DScene !== 'function' ||
                typeof graph.KnowledgeGraphLegend !== 'function' ||
                typeof graph.KnowledgeGraphAccessibleFigure !== 'function' ||
                typeof graph.knowledgeGraphLiveForceAvailability !== 'function' ||
                graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES !== 250 ||
                graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES !== 1000 ||
                liveLimit.status !== 'available' ||
                liveLimit.exceeded.length !== 0 ||
                liveOverLimit.status !== 'unavailable_resource_limit' ||
                liveOverLimit.exceeded.join(',') !== 'nodes,edges' ||
                !Object.isFrozen(liveLimit) || !Object.isFrozen(liveLimit.exceeded) ||
                !Object.isFrozen(liveOverLimit) || !Object.isFrozen(liveOverLimit.exceeded) ||
                typeof headlessGraph.prepareCorpusKnowledgeGraphFigure !== 'function' ||
                typeof headlessGraph.prepareCorpusKnowledgeGraphFigureJson !== 'function' ||
                typeof headlessGraph.prepareKnowledgeGraphView !== 'function' ||
                typeof headlessGraph.serializePreparedKnowledgeGraphPresentation !== 'function' ||
                graph.prepareKnowledgeGraphPresentation !==
                  headlessGraph.prepareKnowledgeGraphPresentation ||
                graph.isPreparedKnowledgeGraphPresentation !==
                  headlessGraph.isPreparedKnowledgeGraphPresentation) {
              throw new Error('ESM React exports are incomplete');
            }
          `
        : `
            const react = require('cortexel/react');
            const graph = require('cortexel/react/knowledge-graph');
            const headlessGraph = require('cortexel/knowledge-graph');
            const liveLimit = graph.knowledgeGraphLiveForceAvailability(
              graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
              graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
            );
            const liveOverLimit = graph.knowledgeGraphLiveForceAvailability(
              graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES + 1,
              graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES + 1,
            );
            if (typeof react.VizSpecRenderer !== 'function' ||
                typeof react.PopulationA11yList !== 'function' ||
                typeof react.NeuronA11yPager !== 'function' ||
                typeof graph.KnowledgeGraph3DScene !== 'function' ||
                typeof graph.KnowledgeGraphLegend !== 'function' ||
                typeof graph.KnowledgeGraphAccessibleFigure !== 'function' ||
                typeof graph.knowledgeGraphLiveForceAvailability !== 'function' ||
                graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES !== 250 ||
                graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES !== 1000 ||
                liveLimit.status !== 'available' ||
                liveLimit.exceeded.length !== 0 ||
                liveOverLimit.status !== 'unavailable_resource_limit' ||
                liveOverLimit.exceeded.join(',') !== 'nodes,edges' ||
                !Object.isFrozen(liveLimit) || !Object.isFrozen(liveLimit.exceeded) ||
                !Object.isFrozen(liveOverLimit) || !Object.isFrozen(liveOverLimit.exceeded) ||
                typeof headlessGraph.prepareCorpusKnowledgeGraphFigure !== 'function' ||
                typeof headlessGraph.prepareCorpusKnowledgeGraphFigureJson !== 'function' ||
                typeof headlessGraph.prepareKnowledgeGraphView !== 'function' ||
                typeof headlessGraph.serializePreparedKnowledgeGraphPresentation !== 'function' ||
                graph.prepareKnowledgeGraphPresentation !==
                  headlessGraph.prepareKnowledgeGraphPresentation ||
                graph.isPreparedKnowledgeGraphPresentation !==
                  headlessGraph.isPreparedKnowledgeGraphPresentation) {
              throw new Error('CJS React exports are incomplete');
            }
          `;
    phaseRun(
      `react.${mode}`,
      mode === 'import'
        ? ['--input-type=module', '-e', expression]
        : ['-e', expression],
      consumer,
    );
  }

  // Prove the published conditional declarations work in a real consumer, not
  // only under Cortexel's source tsconfig. .ts selects import types; .cts selects
  // require types under NodeNext.
  phaseWriteFile(
    join(consumer, 'documented-knowledge-graph-example.tsx'),
    `
      import { useState } from 'react';
      import { Canvas } from '@react-three/fiber';
      import {
        prepareCorpusKnowledgeGraphFigureJson,
        serializePreparedKnowledgeGraphPresentation,
      } from 'cortexel/knowledge-graph';
      import { KnowledgeGraphAccessibleFigure } from
        'cortexel/react/knowledge-graph';

      export function prepareCorpusGraphJson(text: string) {
        const result = prepareCorpusKnowledgeGraphFigureJson(text);
        if (!result.ok) return result;
        return {
          caption: result.caption,
          sourceInputAssurance: result.sourceInputAssurance,
          presentationRecord: serializePreparedKnowledgeGraphPresentation(
            result.presentation,
          ),
        };
      }

      export function CorpusGraphFigure({ spec }: { spec: unknown }) {
        const [selectedId, setSelectedId] = useState<string | null>(null);
        const [hoverId, setHoverId] = useState<string | null>(null);
        return (
          <KnowledgeGraphAccessibleFigure
            spec={spec}
            selectedId={selectedId}
            onSelect={setSelectedId}
            hoverId={hoverId}
            onHover={setHoverId}
            renderVisual={(scene, hostPolicy) => (
              <div
                data-theme={hostPolicy.themeMode}
                style={{ height: 640, background: hostPolicy.backgroundColor }}
              >
                <Canvas
                  frameloop="demand"
                  camera={{ position: [0, 0, 260], fov: 50, near: 0.1, far: 10_000 }}
                >
                  <color attach="background" args={[hostPolicy.backgroundColor]} />
                  {scene}
                </Canvas>
              </div>
            )}
          />
        );
      }

      export function CorpusGraphJsonFigure({ text }: { text: string }) {
        const [selectedId, setSelectedId] = useState<string | null>(null);
        const [hoverId, setHoverId] = useState<string | null>(null);
        return (
          <KnowledgeGraphAccessibleFigure
            specJson={text}
            selectedId={selectedId}
            onSelect={setSelectedId}
            hoverId={hoverId}
            onHover={setHoverId}
            renderVisual={(scene) => <Canvas frameloop="demand">{scene}</Canvas>}
          />
        );
      }
    `,
  );
  phaseWriteFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        jsx: 'react-jsx',
        types: ['node'],
      },
      include: [
        'consumer.ts',
        'consumer.cts',
        'brand-producer.mts',
        'brand-consumer.cts',
        'brand-producer.cts',
        'brand-consumer.mts',
        'figure-result-brand-producer.mts',
        'figure-result-brand-consumer.cts',
        'figure-result-brand-producer.cts',
        'figure-result-brand-consumer.mts',
        'graph-brand-producer.mts',
        'graph-brand-consumer.cts',
        'graph-brand-producer.cts',
        'graph-brand-consumer.mts',
        'documented-knowledge-graph-example.tsx',
      ],
    }),
  );
  phaseWriteFile(
    join(consumer, 'consumer.ts'),
    `
      import { buildVizSpec } from 'cortexel';
      import {
        applySafeRepairs,
        getBuildIdentity,
        parseAndValidateRequest,
        type AppliedSafeRepair,
        type InputAssurance,
        type SafeRepairOutcome,
        type ValidatedRequest,
      } from 'cortexel/figure';
      import {
        AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
        CAPABILITY_CATALOG as AUTHORING_CAPABILITY_CATALOG,
        CAPABILITY_IDS as AUTHORING_CAPABILITY_IDS,
        CATALOG_DIGEST as AUTHORING_CATALOG_DIGEST,
        isCapabilityId as isAuthoringCapabilityId,
        lookupCapabilityCatalogEntry as lookupAuthoringCapabilityCatalogEntry,
        lookupSkillCatalogEntry as lookupAuthoringSkillCatalogEntry,
        SKILL_AUTHORING,
        SKILL_CATALOG as AUTHORING_SKILL_CATALOG,
        STABLE_CATALOG_SCHEMA_RESOURCES,
        STABLE_SKILL_IDS as AUTHORING_STABLE_SKILL_IDS,
        type CapabilityCatalogEntry,
        type CapabilityId,
        type SkillAuthoringEntry,
        type SkillCatalogEntry,
        type StableSkillId,
      } from 'cortexel/authoring';
      import {
        buildFigure,
        buildFigureFromJson,
        buildFigureFromValidated,
        type FigureFailure,
        type FigureResult,
      } from 'cortexel/render-svg';
      import * as renderSvgSurface from 'cortexel/render-svg';
      import {
        nestSpikeRecorderToRaster,
        type NestSpikeExport,
        type NestSpikeOptions,
      } from 'cortexel/adapters/nest';
      import {
        correlationDetectorToCorrelogramParams,
        ROUTING_DISCRIMINATORS,
        getPositionToSpatialMap2DParams,
        normalizeSynapseCollectionSnapshot,
        spikeRecorderToIsiParams,
        spikeRecorderToPopulationRateParams,
        spikeTrialsToPsthParams,
        synapseCollectionToAdjacencyMatrixParams,
        synapseCollectionToConnectionGraphParams,
        synapseCollectionToDelayDistributionParams,
        synapseCollectionToDelayMatrixParams,
        synapseCollectionToInDegreeDistributionParams,
        synapseCollectionToOutDegreeDistributionParams,
        synapseCollectionToWeightMatrixParams,
        validateHostRendererSpec,
        type ConnectionGraphOptions,
        type DelayDistributionOptions,
        type GetConnectionsSceneOptions,
        type NestTopologyResult,
        type SpatialMap2DOptions,
        type SynapseModelMeasurementSemantics,
        type WeightMatrixParams,
      } from 'cortexel/core';
      import * as coreSurface from 'cortexel/core';
      import {
        NeuronA11yPager,
        PopulationA11yList,
        VizSpecRenderer,
        type RenderSceneArgs,
      } from 'cortexel/react';
      import {
        MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
        MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
        KnowledgeGraphAccessibleFigure,
        KnowledgeGraphLegend,
        KnowledgeGraphStaticRecordView,
        knowledgeGraphLiveForceAvailability,
        type KnowledgeGraphLiveForceAvailabilityV1,
      } from 'cortexel/react/knowledge-graph';
      import * as headlessGraph from 'cortexel/knowledge-graph';
      import {
        ReferenceVizSpecFigure,
        aggregateDegreeBins,
        aggregateUniformHistogramBins,
        binnedStepPath,
        boundedStemPointPaths,
        circleTopologyGeometry,
        equalAspectDomains,
        matrixValueBucketPaths,
      } from 'cortexel/react/charts';
      import * as chartSurface from 'cortexel/react/charts';

      const authored = buildVizSpec({
        skill: 'nest.spike_raster',
        params: { times_ms: [1], senders: [1] },
        source: 'type-smoke',
      });
      const checkedRequest = parseAndValidateRequest('{}');
      if (checkedRequest.ok) buildFigureFromValidated(checkedRequest.request);
      const safeRepairOutcome: SafeRepairOutcome = applySafeRepairs('{}');
      const safeRepairAudit = {} as AppliedSafeRepair;
      const args = {} as RenderSceneArgs;
      const graphOptions = {} as ConnectionGraphOptions;
      const delayOptions = {} as DelayDistributionOptions;
      const connectionSceneOptions = {} as GetConnectionsSceneOptions;
      const modelSemantics = {} as SynapseModelMeasurementSemantics;
      const spatialOptions = {} as SpatialMap2DOptions;
      const topologyResult = {} as NestTopologyResult<WeightMatrixParams>;
      const assurance = {} as InputAssurance;
      const validatedRequest = {} as ValidatedRequest;
      const authoringSkillId: StableSkillId = 'neuro.spike_raster';
      const authoringEntry: SkillAuthoringEntry = SKILL_AUTHORING[authoringSkillId];
      const authoringCatalogEntry: SkillCatalogEntry =
        AUTHORING_SKILL_CATALOG[authoringSkillId];
      const capabilityId: CapabilityId = 'cortexel/authoring';
      const capabilityEntry: CapabilityCatalogEntry =
        AUTHORING_CAPABILITY_CATALOG[capabilityId];
      const unknownCapabilityEntry: CapabilityCatalogEntry | undefined =
        lookupAuthoringCapabilityCatalogEntry('not.a.capability');
      declare const untrustedCapabilityId: string;
      if (isAuthoringCapabilityId(untrustedCapabilityId)) {
        const narrowedCapabilityId: CapabilityId = untrustedCapabilityId;
        void AUTHORING_CAPABILITY_CATALOG[narrowedCapabilityId];
      }
      const figureResult = {} as FigureResult;
      type PublicFigureResult = Pick<
        FigureResult,
        Extract<keyof FigureResult, string>
      >;
      declare const structuralFigureResult: PublicFigureResult;
      // @ts-expect-error a complete structural result lacks the private nominal brand
      const forgedFigureResult: FigureResult = structuralFigureResult;
      const figureFailure = {} as FigureFailure;
      const nestExport = {} as NestSpikeExport;
      const nestOptions = {} as NestSpikeOptions;
      type AccessibleGraphProps = Parameters<typeof KnowledgeGraphAccessibleFigure>[0];
      type AccessibleGraphHostContext = Parameters<
        AccessibleGraphProps['renderVisual']
      >[1];
      const accessibleGraphContext = {} as AccessibleGraphHostContext;
      const liveForceAvailability: KnowledgeGraphLiveForceAvailabilityV1 =
        knowledgeGraphLiveForceAvailability(
          MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
          MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
        );
      type PreparedGraph = ReturnType<
        typeof headlessGraph.prepareKnowledgeGraphPresentation
      >;
      type PublicPreparedGraph = Pick<PreparedGraph, Extract<keyof PreparedGraph, string>>;
      declare const structuralPreparedGraph: PublicPreparedGraph;
      // @ts-expect-error a complete structural graph record lacks the private nominal brand
      const forgedPreparedGraph: PreparedGraph = structuralPreparedGraph;
      type PreparedGraphView = ReturnType<typeof headlessGraph.prepareKnowledgeGraphView>;
      type PublicPreparedGraphView = Pick<
        PreparedGraphView,
        Extract<keyof PreparedGraphView, string>
      >;
      declare const structuralPreparedGraphView: PublicPreparedGraphView;
      // @ts-expect-error a complete structural view record lacks the private nominal brand
      const forgedPreparedGraphView: PreparedGraphView = structuralPreparedGraphView;
      // @ts-expect-error the canonical figure derives presentation from spec
      type ForbiddenIndependentPresentationProp = AccessibleGraphProps['presentation'];
      // @ts-expect-error the canonical figure derives its bound caption from spec
      type ForbiddenIndependentCaptionProp = AccessibleGraphProps['honestyCaption'];
      // @ts-expect-error the raw serializer is intentionally compiler-internal
      void renderSvgSurface.renderSvg;
      // @ts-expect-error resource accounting is intentionally compiler-internal
      void renderSvgSurface.countPlanResources;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatNumber;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatCoordinate;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatWithUnit;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvgSurface.linearScale;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvgSurface.linearTicks;
      // @ts-expect-error callers cannot import a plan-construction grammar
      type ForbiddenRenderPlan = import('cortexel/render-svg').RenderPlanV1;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenPanel = import('cortexel/render-svg').Panel;
      // @ts-expect-error the checked chart dispatcher is package-internal
      void chartSurface.CheckedReferenceChartScene;
      // @ts-expect-error raw model-semantics validation is package-internal
      void coreSurface.validateSynapseModelMeasurementSemantics;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenMark = import('cortexel/render-svg').Mark;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAxis = import('cortexel/render-svg').Axis;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenTableModel = import('cortexel/render-svg').TableModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAccessibilityModel = import('cortexel/render-svg').AccessibilityModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenDisclosureBlock = import('cortexel/render-svg').DisclosureBlock;
      // @ts-expect-error callers cannot import the raw serializer report
      type ForbiddenSvgReport = import('cortexel/render-svg').SvgReport;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenLinearScale = import('cortexel/render-svg').LinearScale;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenTick = import('cortexel/render-svg').Tick;
      // @ts-expect-error the package export map encapsulates built implementation files
      type ForbiddenDeepRenderModule = typeof import('cortexel/dist/render-svg/index.js');
      // @ts-expect-error the shared capability registry is package-private
      type ForbiddenCapabilityModule = typeof import('cortexel/internal/request-capability');
      type ForbiddenFigureResultCapabilityModule =
        // @ts-expect-error the built-result capability registry is package-private
        typeof import('cortexel/internal/figure-result-capability');
      type ForbiddenGraphCapabilityModule =
        // @ts-expect-error the graph capability registry is package-private
        typeof import('cortexel/internal/knowledge-graph-presentation-capability');
      // @ts-expect-error package imports do not leak into the consumer package scope
      type ForbiddenPrivateImport = typeof import('#cortexel-request-capability');
      type ForbiddenFigureResultPrivateImport =
        // @ts-expect-error built-result package imports do not leak into consumer scope
        typeof import('#cortexel-figure-result-capability');
      type ForbiddenGraphPrivateImport =
        // @ts-expect-error graph package imports do not leak into the consumer package scope
        typeof import('#cortexel-knowledge-graph-presentation-capability');
      // @ts-expect-error the package-private nominal brand is not a consumer import
      type ForbiddenNominalBrandImport = typeof import('#cortexel-validated-request-brand');
      type ForbiddenFigureResultNominalBrandImport =
        // @ts-expect-error the built-result nominal brand is package-private
        typeof import('#cortexel-figure-result-brand');
      type ForbiddenGraphNominalBrandImport =
        // @ts-expect-error the graph nominal brand is package-private
        typeof import('#cortexel-knowledge-graph-presentation-brand');
      // @ts-expect-error unknown stable skill ids are rejected by the authoring map
      void SKILL_AUTHORING['not.a.skill'];
      const unknownCatalogEntry: SkillCatalogEntry | undefined =
        lookupAuthoringSkillCatalogEntry('not.a.skill');
      // @ts-expect-error an untrusted catalog lookup cannot be assumed present
      const requiredUnknownCatalogEntry: SkillCatalogEntry =
        lookupAuthoringSkillCatalogEntry('not.a.skill');
      // @ts-expect-error unknown literals are not keys of the finite catalog
      void AUTHORING_SKILL_CATALOG['not.a.skill'];
      // @ts-expect-error unknown literals are not keys of the finite capability catalog
      void AUTHORING_CAPABILITY_CATALOG['not.a.capability'];
      // @ts-expect-error an untrusted capability lookup cannot be assumed present
      const requiredUnknownCapabilityEntry: CapabilityCatalogEntry =
        lookupAuthoringCapabilityCatalogEntry('not.a.capability');
      void [
        authored,
        safeRepairOutcome,
        safeRepairAudit,
        applySafeRepairs,
        getBuildIdentity,
        parseAndValidateRequest,
        buildFigure,
        buildFigureFromJson,
        buildFigureFromValidated,
        nestSpikeRecorderToRaster,
        assurance,
        validatedRequest,
        AUTHORING_CATALOG_DIGEST,
        AUTHORING_SCHEMA_COMPILATION_PROFILE_V1.options.strictRequired,
        AUTHORING_CAPABILITY_IDS,
        AUTHORING_STABLE_SKILL_IDS,
        STABLE_CATALOG_SCHEMA_RESOURCES,
        authoringEntry.requestSchema,
        authoringEntry.authoringExample,
        authoringCatalogEntry.id,
        capabilityEntry.id,
        unknownCapabilityEntry,
        requiredUnknownCapabilityEntry,
        unknownCatalogEntry,
        requiredUnknownCatalogEntry,
        figureResult,
        figureFailure,
        nestExport,
        nestOptions,
        args.skill,
        validateHostRendererSpec,
        spikeRecorderToIsiParams,
        spikeTrialsToPsthParams,
        spikeRecorderToPopulationRateParams,
        correlationDetectorToCorrelogramParams,
        ROUTING_DISCRIMINATORS,
        graphOptions,
        delayOptions,
        connectionSceneOptions,
        modelSemantics,
        spatialOptions,
        topologyResult,
        normalizeSynapseCollectionSnapshot,
        synapseCollectionToConnectionGraphParams,
        synapseCollectionToAdjacencyMatrixParams,
        synapseCollectionToWeightMatrixParams,
        synapseCollectionToDelayMatrixParams,
        synapseCollectionToInDegreeDistributionParams,
        synapseCollectionToOutDegreeDistributionParams,
        synapseCollectionToDelayDistributionParams,
        getPositionToSpatialMap2DParams,
        VizSpecRenderer,
        PopulationA11yList,
        NeuronA11yPager,
        ReferenceVizSpecFigure,
        binnedStepPath,
        boundedStemPointPaths,
        matrixValueBucketPaths,
        circleTopologyGeometry,
        aggregateDegreeBins,
        aggregateUniformHistogramBins,
        equalAspectDomains,
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
        KnowledgeGraphAccessibleFigure,
        KnowledgeGraphLegend,
        KnowledgeGraphStaticRecordView,
        liveForceAvailability.status,
        headlessGraph.prepareKnowledgeGraphPresentation,
        headlessGraph.prepareCorpusKnowledgeGraphFigure,
        headlessGraph.prepareCorpusKnowledgeGraphFigureJson,
        headlessGraph.prepareKnowledgeGraphView,
        headlessGraph.serializePreparedKnowledgeGraphPresentation,
        accessibleGraphContext.view,
        accessibleGraphContext.sourceInputAssurance.boundary,
        forgedFigureResult,
        forgedPreparedGraph,
        forgedPreparedGraphView,
      ];
    `,
  );
  phaseWriteFile(
    join(consumer, 'consumer.cts'),
    `
      import cortexel = require('cortexel');
      import core = require('cortexel/core');
      import figure = require('cortexel/figure');
      import authoring = require('cortexel/authoring');
      import renderSvg = require('cortexel/render-svg');
      import nestAdapter = require('cortexel/adapters/nest');
      import react = require('cortexel/react');
      import charts = require('cortexel/react/charts');
      import graph = require('cortexel/react/knowledge-graph');
      import headlessGraph = require('cortexel/knowledge-graph');
      const build: typeof cortexel.buildVizSpec = core.buildVizSpec;
      const graphOptions = {} as core.ConnectionGraphOptions;
      const delayOptions = {} as core.DelayDistributionOptions;
      const connectionSceneOptions = {} as core.GetConnectionsSceneOptions;
      const modelSemantics = {} as core.SynapseModelMeasurementSemantics;
      const spatialOptions = {} as core.SpatialMap2DOptions;
      const topologyResult = {} as core.NestTopologyResult<core.WeightMatrixParams>;
      const assurance = {} as figure.InputAssurance;
      const validatedRequest = {} as figure.ValidatedRequest;
      const authoringSkillId: authoring.StableSkillId = 'neuro.spike_raster';
      const authoringEntry: authoring.SkillAuthoringEntry =
        authoring.SKILL_AUTHORING[authoringSkillId];
      const authoringCatalogEntry: authoring.SkillCatalogEntry =
        authoring.SKILL_CATALOG[authoringSkillId];
      const capabilityId: authoring.CapabilityId = 'cortexel/authoring';
      const capabilityEntry: authoring.CapabilityCatalogEntry =
        authoring.CAPABILITY_CATALOG[capabilityId];
      const unknownCapabilityEntry: authoring.CapabilityCatalogEntry | undefined =
        authoring.lookupCapabilityCatalogEntry('not.a.capability');
      declare const untrustedCapabilityId: string;
      if (authoring.isCapabilityId(untrustedCapabilityId)) {
        const narrowedCapabilityId: authoring.CapabilityId = untrustedCapabilityId;
        void authoring.CAPABILITY_CATALOG[narrowedCapabilityId];
      }
      const figureResult = {} as renderSvg.FigureResult;
      type PublicFigureResult = Pick<
        renderSvg.FigureResult,
        Extract<keyof renderSvg.FigureResult, string>
      >;
      declare const structuralFigureResult: PublicFigureResult;
      // @ts-expect-error a complete structural result lacks the private nominal brand
      const forgedFigureResult: renderSvg.FigureResult = structuralFigureResult;
      const figureFailure = {} as renderSvg.FigureFailure;
      const nestExport = {} as nestAdapter.NestSpikeExport;
      const nestOptions = {} as nestAdapter.NestSpikeOptions;
      type AccessibleGraphProps = Parameters<typeof graph.KnowledgeGraphAccessibleFigure>[0];
      type AccessibleGraphHostContext = Parameters<
        AccessibleGraphProps['renderVisual']
      >[1];
      const accessibleGraphContext = {} as AccessibleGraphHostContext;
      const liveForceAvailability: graph.KnowledgeGraphLiveForceAvailabilityV1 =
        graph.knowledgeGraphLiveForceAvailability(
          graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
          graph.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
        );
      type PreparedGraph = ReturnType<typeof headlessGraph.prepareKnowledgeGraphPresentation>;
      type PublicPreparedGraph = Pick<PreparedGraph, Extract<keyof PreparedGraph, string>>;
      declare const structuralPreparedGraph: PublicPreparedGraph;
      // @ts-expect-error a complete structural graph record lacks the private nominal brand
      const forgedPreparedGraph: PreparedGraph = structuralPreparedGraph;
      type PreparedGraphView = ReturnType<typeof headlessGraph.prepareKnowledgeGraphView>;
      type PublicPreparedGraphView = Pick<
        PreparedGraphView,
        Extract<keyof PreparedGraphView, string>
      >;
      declare const structuralPreparedGraphView: PublicPreparedGraphView;
      // @ts-expect-error a complete structural view record lacks the private nominal brand
      const forgedPreparedGraphView: PreparedGraphView = structuralPreparedGraphView;
      // @ts-expect-error the canonical figure derives presentation from spec
      type ForbiddenIndependentPresentationProp = AccessibleGraphProps['presentation'];
      // @ts-expect-error the canonical figure derives its bound caption from spec
      type ForbiddenIndependentCaptionProp = AccessibleGraphProps['honestyCaption'];
      const checkedRequest = figure.parseAndValidateRequest('{}');
      if (checkedRequest.ok) renderSvg.buildFigureFromValidated(checkedRequest.request);
      const safeRepairOutcome: figure.SafeRepairOutcome = figure.applySafeRepairs('{}');
      const safeRepairAudit = {} as figure.AppliedSafeRepair;
      // @ts-expect-error the raw serializer is intentionally compiler-internal
      void renderSvg.renderSvg;
      // @ts-expect-error resource accounting is intentionally compiler-internal
      void renderSvg.countPlanResources;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatNumber;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatCoordinate;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatWithUnit;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvg.linearScale;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvg.linearTicks;
      // @ts-expect-error callers cannot import a plan-construction grammar
      type ForbiddenRenderPlan = renderSvg.RenderPlanV1;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenPanel = renderSvg.Panel;
      // @ts-expect-error the checked chart dispatcher is package-internal
      void charts.CheckedReferenceChartScene;
      // @ts-expect-error raw model-semantics validation is package-internal
      void core.validateSynapseModelMeasurementSemantics;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenMark = renderSvg.Mark;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAxis = renderSvg.Axis;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenTableModel = renderSvg.TableModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAccessibilityModel = renderSvg.AccessibilityModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenDisclosureBlock = renderSvg.DisclosureBlock;
      // @ts-expect-error callers cannot import the raw serializer report
      type ForbiddenSvgReport = renderSvg.SvgReport;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenLinearScale = renderSvg.LinearScale;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenTick = renderSvg.Tick;
      // @ts-expect-error the package export map encapsulates built implementation files
      type ForbiddenDeepRenderModule = typeof import('cortexel/dist/render-svg/index.cjs');
      // @ts-expect-error the shared capability registry is package-private
      type ForbiddenCapabilityModule = typeof import('cortexel/internal/request-capability');
      type ForbiddenFigureResultCapabilityModule =
        // @ts-expect-error the built-result capability registry is package-private
        typeof import('cortexel/internal/figure-result-capability');
      type ForbiddenGraphCapabilityModule =
        // @ts-expect-error the graph capability registry is package-private
        typeof import('cortexel/internal/knowledge-graph-presentation-capability');
      // @ts-expect-error package imports do not leak into the consumer package scope
      type ForbiddenPrivateImport = typeof import('#cortexel-request-capability');
      type ForbiddenFigureResultPrivateImport =
        // @ts-expect-error built-result package imports do not leak into consumer scope
        typeof import('#cortexel-figure-result-capability');
      type ForbiddenGraphPrivateImport =
        // @ts-expect-error graph package imports do not leak into the consumer package scope
        typeof import('#cortexel-knowledge-graph-presentation-capability');
      // @ts-expect-error the package-private nominal brand is not a consumer import
      type ForbiddenNominalBrandImport = typeof import('#cortexel-validated-request-brand');
      type ForbiddenFigureResultNominalBrandImport =
        // @ts-expect-error the built-result nominal brand is package-private
        typeof import('#cortexel-figure-result-brand');
      type ForbiddenGraphNominalBrandImport =
        // @ts-expect-error the graph nominal brand is package-private
        typeof import('#cortexel-knowledge-graph-presentation-brand');
      // @ts-expect-error unknown stable skill ids are rejected by the authoring map
      void authoring.SKILL_AUTHORING['not.a.skill'];
      const unknownCatalogEntry: authoring.SkillCatalogEntry | undefined =
        authoring.lookupSkillCatalogEntry('not.a.skill');
      // @ts-expect-error an untrusted catalog lookup cannot be assumed present
      const requiredUnknownCatalogEntry: authoring.SkillCatalogEntry =
        authoring.lookupSkillCatalogEntry('not.a.skill');
      // @ts-expect-error unknown literals are not keys of the finite catalog
      void authoring.SKILL_CATALOG['not.a.skill'];
      // @ts-expect-error unknown literals are not keys of the finite capability catalog
      void authoring.CAPABILITY_CATALOG['not.a.capability'];
      // @ts-expect-error an untrusted capability lookup cannot be assumed present
      const requiredUnknownCapabilityEntry: authoring.CapabilityCatalogEntry =
        authoring.lookupCapabilityCatalogEntry('not.a.capability');
      void [
        build,
        safeRepairOutcome,
        safeRepairAudit,
        figure.applySafeRepairs,
        figure.getBuildIdentity,
        figure.parseAndValidateRequest,
        renderSvg.buildFigure,
        renderSvg.buildFigureFromJson,
        renderSvg.buildFigureFromValidated,
        nestAdapter.nestSpikeRecorderToRaster,
        assurance,
        validatedRequest,
        authoring.CATALOG_DIGEST,
        authoring.AUTHORING_SCHEMA_COMPILATION_PROFILE_V1.options.strictRequired,
        authoring.CAPABILITY_IDS,
        authoring.STABLE_SKILL_IDS,
        authoring.STABLE_CATALOG_SCHEMA_RESOURCES,
        authoringEntry.requestSchema,
        authoringEntry.authoringExample,
        authoringCatalogEntry.id,
        capabilityEntry.id,
        unknownCapabilityEntry,
        requiredUnknownCapabilityEntry,
        unknownCatalogEntry,
        requiredUnknownCatalogEntry,
        figureResult,
        figureFailure,
        nestExport,
        nestOptions,
        core.ROUTING_DISCRIMINATORS,
        graphOptions,
        delayOptions,
        connectionSceneOptions,
        modelSemantics,
        spatialOptions,
        topologyResult,
        core.spikeRecorderToIsiParams,
        core.spikeTrialsToPsthParams,
        core.spikeRecorderToPopulationRateParams,
        core.correlationDetectorToCorrelogramParams,
        core.normalizeSynapseCollectionSnapshot,
        core.synapseCollectionToConnectionGraphParams,
        core.synapseCollectionToAdjacencyMatrixParams,
        core.synapseCollectionToWeightMatrixParams,
        core.synapseCollectionToDelayMatrixParams,
        core.synapseCollectionToInDegreeDistributionParams,
        core.synapseCollectionToOutDegreeDistributionParams,
        core.synapseCollectionToDelayDistributionParams,
        core.getPositionToSpatialMap2DParams,
        react.VizSpecRenderer,
        charts.ReferenceVizSpecFigure,
        charts.binnedStepPath,
        charts.boundedStemPointPaths,
        charts.matrixValueBucketPaths,
        charts.circleTopologyGeometry,
        charts.aggregateDegreeBins,
        charts.aggregateUniformHistogramBins,
        charts.equalAspectDomains,
        graph.KnowledgeGraph3DScene,
        graph.KnowledgeGraphAccessibleFigure,
        graph.KnowledgeGraphLegend,
        graph.KnowledgeGraphStaticRecordView,
        liveForceAvailability.status,
        headlessGraph.prepareKnowledgeGraphPresentation,
        headlessGraph.prepareCorpusKnowledgeGraphFigure,
        headlessGraph.prepareCorpusKnowledgeGraphFigureJson,
        headlessGraph.prepareKnowledgeGraphView,
        headlessGraph.serializePreparedKnowledgeGraphPresentation,
        accessibleGraphContext.view,
        accessibleGraphContext.sourceInputAssurance.boundary,
        forgedFigureResult,
        forgedPreparedGraph,
        forgedPreparedGraphView,
      ];
    `,
  );
  phaseWriteFile(
    join(consumer, 'brand-producer.mts'),
    `
      import { applySafeRepairs } from 'cortexel/figure';
      export type EsmRepairedRequest =
        Extract<ReturnType<typeof applySafeRepairs>, { readonly ok: true }>['request'];
    `,
  );
  phaseWriteFile(
    join(consumer, 'brand-consumer.cts'),
    `
      import renderSvg = require('cortexel/render-svg');
      import type { EsmRepairedRequest } from './brand-producer.mjs';
      declare const request: EsmRepairedRequest;
      renderSvg.buildFigureFromValidated(request);
    `,
  );
  phaseWriteFile(
    join(consumer, 'brand-producer.cts'),
    `
      import figure = require('cortexel/figure');
      export type CjsRepairedRequest =
        Extract<ReturnType<typeof figure.applySafeRepairs>, { readonly ok: true }>['request'];
    `,
  );
  phaseWriteFile(
    join(consumer, 'brand-consumer.mts'),
    `
      import { buildFigureFromValidated } from 'cortexel/render-svg';
      import type { CjsRepairedRequest } from './brand-producer.cjs';
      declare const request: CjsRepairedRequest;
      buildFigureFromValidated(request);
    `,
  );
  phaseWriteFile(
    join(consumer, 'figure-result-brand-producer.mts'),
    `
      import { buildFigure } from 'cortexel/render-svg';
      export type EsmFigureResult =
        Extract<ReturnType<typeof buildFigure>, { readonly ok: true }>;
    `,
  );
  phaseWriteFile(
    join(consumer, 'figure-result-brand-consumer.cts'),
    `
      import renderSvg = require('cortexel/render-svg');
      import type { EsmFigureResult } from './figure-result-brand-producer.mjs';
      declare const result: EsmFigureResult;
      const accepted: renderSvg.FigureResult = result;
      void accepted;
    `,
  );
  phaseWriteFile(
    join(consumer, 'figure-result-brand-producer.cts'),
    `
      import renderSvg = require('cortexel/render-svg');
      export type CjsFigureResult =
        Extract<ReturnType<typeof renderSvg.buildFigure>, { readonly ok: true }>;
    `,
  );
  phaseWriteFile(
    join(consumer, 'figure-result-brand-consumer.mts'),
    `
      import type { FigureResult } from 'cortexel/render-svg';
      import type { CjsFigureResult } from './figure-result-brand-producer.cjs';
      declare const result: CjsFigureResult;
      const accepted: FigureResult = result;
      void accepted;
    `,
  );
  phaseWriteFile(
    join(consumer, 'graph-brand-producer.mts'),
    `
      import {
        prepareKnowledgeGraphPresentation,
        prepareKnowledgeGraphView,
      } from
        'cortexel/knowledge-graph';
      export type EsmPreparedGraph =
        ReturnType<typeof prepareKnowledgeGraphPresentation>;
      export type EsmPreparedGraphView =
        ReturnType<typeof prepareKnowledgeGraphView>;
    `,
  );
  phaseWriteFile(
    join(consumer, 'graph-brand-consumer.cts'),
    `
      import graph = require('cortexel/react/knowledge-graph');
      import type {
        EsmPreparedGraph,
        EsmPreparedGraphView,
      } from './graph-brand-producer.mjs';
      declare const presentation: EsmPreparedGraph;
      type CjsPresentation =
        Parameters<typeof graph.KnowledgeGraphStaticRecordView>[0]['presentation'];
      const accepted: CjsPresentation = presentation;
      declare const view: EsmPreparedGraphView;
      type CjsView = NonNullable<
        Parameters<typeof graph.KnowledgeGraphStaticRecordView>[0]['view']
      >;
      const acceptedView: CjsView = view;
      void [accepted, acceptedView];
    `,
  );
  phaseWriteFile(
    join(consumer, 'graph-brand-producer.cts'),
    `
      import graph = require('cortexel/knowledge-graph');
      export type CjsPreparedGraph =
        ReturnType<typeof graph.prepareKnowledgeGraphPresentation>;
      export type CjsPreparedGraphView =
        ReturnType<typeof graph.prepareKnowledgeGraphView>;
    `,
  );
  phaseWriteFile(
    join(consumer, 'graph-brand-consumer.mts'),
    `
      import type {
        CjsPreparedGraph,
        CjsPreparedGraphView,
      } from './graph-brand-producer.cjs';
      import type { KnowledgeGraphStaticRecordViewProps } from
        'cortexel/react/knowledge-graph';
      declare const presentation: CjsPreparedGraph;
      const accepted: KnowledgeGraphStaticRecordViewProps['presentation'] = presentation;
      declare const view: CjsPreparedGraphView;
      const acceptedView: NonNullable<KnowledgeGraphStaticRecordViewProps['view']> = view;
      void [accepted, acceptedView];
    `,
  );
  const installedTsc = join(consumer, 'node_modules', 'typescript', 'bin', 'tsc');
  assertInstalledNodeBinShim(consumer, 'tsc', installedTsc);

  // Guard that the packed manifest is the exact deterministic artifact emitted
  // by this source tree, not merely a version-compatible stale file.
  const installedManifest = readUtf8RegularFileStable(
    join(consumer, 'node_modules/cortexel/dist/skills.manifest.json'),
    'installed skills manifest',
    MAX_JSON_BYTES,
  );
  if (installedManifest !== serializeManifest()) {
    throw new Error('packed skills manifest differs from the deterministic source emit');
  }
  const packageJson = JSON.parse(
    readUtf8RegularFileStable(
      join(consumer, 'node_modules/cortexel/package.json'),
      'installed Cortexel package metadata',
      MAX_JSON_BYTES,
    ),
  ) as { version: string };
  const expectedOperations = phase === 'prepare'
    ? PACKAGE_SMOKE_PHASE_OPERATIONS
    : PACKAGE_SMOKE_EXECUTE_OPERATIONS;
  if (!exactJsonEqual(
    [...observedOperations].sort(),
    [...expectedOperations].sort(),
  )) {
    fail(`package-smoke ${phase} did not cover its closed operation inventory`);
  }
  return packageJson.version;
}

export function buildTypeScriptConsumerCheck(
  result: Pick<ReviewedNodeCommandResult, 'status' | 'signal' | 'stdout' | 'stderr'>,
  finalizedWorkspaceSealDigest: string,
): TypeScriptConsumerCheck {
  if (!/^sha256:[0-9a-f]{64}$/u.test(finalizedWorkspaceSealDigest)) {
    fail('TypeScript consumer check received an invalid finalized workspace digest');
  }
  if (result.status !== 0 || result.signal !== null) {
    fail(formatReviewedNodeCommandFailure('typescript', result));
  }
  if (result.stdout.length !== 0 || result.stderr.length !== 0) {
    const stdout = jsonDiagnosticString(
      result.stdout,
      REVIEWED_COMMAND_DIAGNOSTIC_LIMITS.channelEncodedBytes,
    );
    const stderr = jsonDiagnosticString(
      result.stderr,
      REVIEWED_COMMAND_DIAGNOSTIC_LIMITS.channelEncodedBytes,
    );
    fail(
      'finalized TypeScript consumer check emitted unexpected output: ' +
      `{"stdout":${stdout.encoded},"stdoutTruncated":${String(stdout.truncated)},` +
      `"stderr":${stderr.encoded},"stderrTruncated":${String(stderr.truncated)}}`,
    );
  }
  return {
    profile: TYPESCRIPT_CHECK_PROFILE,
    compiler: {
      name: 'typescript',
      version: EXPECTED_DEV_DEPENDENCIES.typescript,
      bin: TYPESCRIPT_CHECK_COMPILER_BIN,
    },
    argv: TYPESCRIPT_CHECK_ARGUMENTS,
    cwd: TYPESCRIPT_CHECK_CWD,
    workspaceSealDigest: finalizedWorkspaceSealDigest,
    result: {
      status: 0,
      signal: null,
      stdoutBytes: 0,
      stderrBytes: 0,
    },
  };
}

export function assertTypeScriptConsumerCheckSealStability(
  before: WorkspaceSeal,
  after: WorkspaceSeal,
  check: TypeScriptConsumerCheck,
): void {
  if (!exactJsonEqual(before, after)) {
    fail(
      'package-smoke workspace changed across the finalized TypeScript check ' +
      'and semantic revalidation',
    );
  }
  if (check.workspaceSealDigest !== after.digest) {
    fail('TypeScript consumer check is not bound to the finalized workspace seal');
  }
}

interface FinalizedTypeScriptEvidenceSteps {
  readonly captureFirstSeal: () => WorkspaceSeal;
  readonly runTypeScriptCheck: (seal: WorkspaceSeal) => TypeScriptConsumerCheck;
  readonly revalidateConsumerClosures: () => void;
  readonly captureSecondSeal: () => WorkspaceSeal;
  readonly revalidateRuntimeAuthority: () => void;
}

interface FinalizedTypeScriptEvidence {
  readonly typescriptCheck: TypeScriptConsumerCheck;
  readonly workspaceSeal: WorkspaceSeal;
}

let finalizedTypeScriptEvidenceSequenceActive = false;

function invokeSynchronousFinalizationStep<T>(
  label: string,
  operation: () => T,
): T {
  const result = operation();
  if (isPotentiallyAsynchronousResult(result)) {
    fail(`${label} must be strictly synchronous`);
  }
  return result;
}

function invokeSynchronousFinalizationVoidStep(
  label: string,
  operation: () => void,
): void {
  const result: unknown = operation();
  if (isPotentiallyAsynchronousResult(result)) {
    fail(`${label} must be strictly synchronous`);
  }
  if (result !== undefined) {
    fail(`${label} must return undefined`);
  }
}

/**
 * Builds the only evidence value that may precede prepared-state publication.
 * A failed or asynchronous compiler, semantic recheck, second seal, stability
 * check, or runtime-authority check cannot return this value. Publication remains
 * an explicit irreversible action in the caller after this function succeeds.
 */
export function finalizeTypeScriptConsumerCheckBeforePublication(
  steps: FinalizedTypeScriptEvidenceSteps,
): FinalizedTypeScriptEvidence {
  if (finalizedTypeScriptEvidenceSequenceActive) {
    fail('finalized TypeScript evidence sequence is already active');
  }
  finalizedTypeScriptEvidenceSequenceActive = true;
  try {
    const firstSeal = invokeSynchronousFinalizationStep(
      'first finalized workspace seal',
      steps.captureFirstSeal,
    );
    const candidateCheck = invokeSynchronousFinalizationStep(
      'finalized TypeScript consumer check',
      () => steps.runTypeScriptCheck(firstSeal),
    );
    const check = parseTypeScriptConsumerCheck(
      candidateCheck as unknown as JsonValue,
      firstSeal.digest,
    );
    invokeSynchronousFinalizationVoidStep(
      'finalized consumer-closure revalidation',
      steps.revalidateConsumerClosures,
    );
    const secondSeal = invokeSynchronousFinalizationStep(
      'second finalized workspace seal',
      steps.captureSecondSeal,
    );
    assertTypeScriptConsumerCheckSealStability(firstSeal, secondSeal, check);
    invokeSynchronousFinalizationVoidStep(
      'pre-publication runtime-authority revalidation',
      steps.revalidateRuntimeAuthority,
    );
    return Object.freeze({
      typescriptCheck: check,
      workspaceSeal: secondSeal,
    });
  } finally {
    finalizedTypeScriptEvidenceSequenceActive = false;
  }
}

function runFinalizedTypeScriptConsumerCheck(
  context: PackageSmokeContext,
  finalizedWorkspaceSeal: WorkspaceSeal,
): TypeScriptConsumerCheck {
  if (
    context.consumer !== join(context.workspace, TYPESCRIPT_CHECK_CWD) ||
    finalizedWorkspaceSeal.root.path !== context.workspace ||
    finalizedWorkspaceSeal.root.mode !== 0o555
  ) {
    fail('TypeScript consumer check received an inconsistent finalized workspace');
  }
  assertWorkspaceReadOnly(context.workspace, true);
  const installedTsc = join(
    context.workspace,
    ...TYPESCRIPT_CHECK_COMPILER_BIN.split('/'),
  );
  assertInstalledNodeBinShim(context.consumer, 'tsc', installedTsc);
  const result = runResult(
    context.nodeExecutable,
    [installedTsc, ...TYPESCRIPT_CHECK_ARGUMENTS],
    context.consumer,
    PACKAGE_SMOKE_COMMAND_POLICIES.typescriptCheck,
  );
  return buildTypeScriptConsumerCheck(result, finalizedWorkspaceSeal.digest);
}

function preparePackageSmokeWorkspaceWithinCommandRuntime(options: {
  readonly workspace: string;
  readonly nodeExecutable?: string;
  readonly npmExecutable?: string;
}): PackageSmokePhaseSuccessOutput {
  if (process.platform === 'win32') {
    fail('package smoke currently requires POSIX process-group semantics');
  }
  resetPackageSmokeNpmCacheSession();
  commandNodeAuthority = undefined;
  commandRuntimeAuthority = undefined;
  commandNpmCacheAuthorities = undefined;
  const workspace = canonicalWorkspacePath(options.workspace);
  const fixture = validateFixtureSources();
  assertPackageSmokeProjectNpmConfigAbsent(root, 'initial package-smoke source');
  const nodeExecutable = resolveExecutable(options.nodeExecutable, 'node', 'Node executable');
  const nodeFileAuthority = inspectNodeExecutableAuthority(nodeExecutable);
  const npmExecutable = resolveNpmCli(options.npmExecutable);
  // Exact npm topology is a read-only preflight. Reject an unknown manifest
  // before creating the workspace, operational cache tree, or any subprocess.
  const npmAuthority = inspectNpmPackageAuthority(npmExecutable);
  assertEmptyWorkspace(workspace);
  commandNodeAuthority = nodeFileAuthority;
  const npmCacheAuthorities = createPackageSmokeOperationalDirectories(workspace);
  commandNpmCacheAuthorities = npmCacheAuthorities;
  assertPackageSmokeOperationalDirectories(workspace);
  commandEnvironment = packageSmokeEnvironment(nodeExecutable, workspace);
  beginPackageSmokeNpmCacheSession(workspace, npmCacheAuthorities);
  const nodeVersion = executableVersion(nodeExecutable, 'Node');
  assertSupportedNodeVersion(nodeVersion);
  const nodeRuntime = nodeRuntimeIdentity(nodeExecutable);
  const runtimeAuthority: PackageRuntimeAuthority = {
    scope: RUNTIME_AUTHORITY_SCOPE,
    node: { ...nodeFileAuthority, version: nodeVersion, runtime: nodeRuntime },
    npm: npmAuthority,
  };
  commandRuntimeAuthority = runtimeAuthority;
  const npmConfigs = createPackageSmokeNpmConfigFiles(workspace);
  commandEnvironment.npm_config_userconfig = npmConfigs.userConfig;
  commandEnvironment.npm_config_globalconfig = npmConfigs.globalConfig;
  commandEnvironment.CORTEXEL_PACKAGE_SMOKE_PHASE = 'prepare';
  commandEnvironment.npm_config_ignore_scripts = 'true';
  commandEnvironment.npm_config_audit = 'false';
  commandEnvironment.npm_config_fund = 'false';
  commandEnvironment.npm_config_legacy_peer_deps = 'true';
  commandEnvironment.npm_config_install_strategy = 'nested';
  commandEnvironment.npm_config_package_lock = 'true';
  commandEnvironment.npm_config_bin_links = 'true';
  commandEnvironment.npm_config_engine_strict = 'true';
  commandEnvironment.npm_config_update_notifier = 'false';
  commandEnvironment.npm_config_progress = 'false';
  commandEnvironment.npm_config_loglevel = 'error';
  activatePackageSmokeNpmCache(
    commandEnvironment,
    npmCacheAuthorities,
    'control',
    'initial package-smoke control',
  );
  const npmVersion = nodeCliVersion(nodeExecutable, npmExecutable, 'npm');
  if (npmVersion !== npmAuthority.version) {
    fail('npm CLI version differs from its package manifest authority');
  }
  reviewedNpmTopologyProfile(npmVersion);

  const artifactDirectory = join(workspace, 'artifact');
  const coreConsumer = join(workspace, 'core-consumer');
  const chartsConsumer = join(workspace, 'charts-consumer');
  const consumer = join(workspace, 'consumer');
  const unrelated = join(workspace, 'unrelated-working-directory');
  mkdirSync(artifactDirectory, { mode: 0o755 });
  mkdirSync(unrelated, { mode: 0o755 });
  const packText = runNpmCommand(
    nodeExecutable,
    npmExecutable,
    ['pack', '--ignore-scripts', '--json', '--pack-destination', artifactDirectory],
    root,
    PACKAGE_SMOKE_COMMAND_POLICIES.npmPack,
  );
  completePackageSmokeNpmCacheRole(
    commandEnvironment,
    npmCacheAuthorities,
    'control',
    'completed package-smoke control commands',
  );
  const rawPackValue = strictJson(packText, 'npm pack output');
  if (!Array.isArray(rawPackValue) || rawPackValue.length !== 1 || !isRecord(rawPackValue[0])) {
    fail('npm pack output has an invalid envelope');
  }
  const generatedFilename = expectString(rawPackValue[0].filename, 'npm pack filename');
  if (generatedFilename.includes('/') || generatedFilename.includes('\\')) {
    fail('npm pack returned an unsafe filename');
  }
  const generatedTarball = join(artifactDirectory, generatedFilename);
  const tarballPath = join(artifactDirectory, LOCAL_TARBALL_FILENAME);
  if (generatedTarball !== tarballPath) renameSync(generatedTarball, tarballPath);
  chmodSync(tarballPath, 0o644);
  const tarballStats = lstatSync(tarballPath);
  const tarball = readRegularFileStable(
    tarballPath,
    tarballStats.size,
    'fresh Cortexel package tarball',
    PACKAGE_TARBALL_LIMITS.compressedBytes,
  );
  const packed = normalizePackResult(rawPackValue, tarball);
  const sourcePackage = expectRecord(fixture.packageJson, 'Cortexel package.json');
  if (packed.name !== sourcePackage.name || packed.version !== sourcePackage.version) {
    fail('npm pack identity differs from Cortexel package.json');
  }
  const expectedFiles = expectedPackageClosure(fixture.packageJson);
  inspectNpmPackageTarball(tarball, packed, expectedFiles);
  const packResultPath = join(workspace, PACK_RESULT_FILENAME);
  const packResultRaw = writeCanonicalJson(packResultPath, packed);
  prepareConsumer(
    coreConsumer,
    tarballPath,
    tarball,
    packed.integrity,
    fixture.lock,
    fixture.manifestRaw,
    expectedFiles,
    npmConfigs,
    nodeExecutable,
    npmExecutable,
    PACKAGE_SMOKE_CONSUMER_PROFILES.core,
    npmVersion,
    nodeRuntime,
  );
  prepareConsumer(
    chartsConsumer,
    tarballPath,
    tarball,
    packed.integrity,
    fixture.lock,
    fixture.manifestRaw,
    expectedFiles,
    npmConfigs,
    nodeExecutable,
    npmExecutable,
    PACKAGE_SMOKE_CONSUMER_PROFILES.charts,
    npmVersion,
    nodeRuntime,
  );
  prepareConsumer(
    consumer,
    tarballPath,
    tarball,
    packed.integrity,
    fixture.lock,
    fixture.manifestRaw,
    expectedFiles,
    npmConfigs,
    nodeExecutable,
    npmExecutable,
    PACKAGE_SMOKE_CONSUMER_PROFILES.full,
    npmVersion,
    nodeRuntime,
  );
  assertPackageSmokeNpmCacheSessionComplete(npmCacheAuthorities);
  writeFileSync(join(workspace, NETWORK_GUARD_FILENAME), NETWORK_AND_WRITE_GUARD, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o644,
  });

  const context: PackageSmokeContext = {
    workspace,
    coreConsumer,
    chartsConsumer,
    consumer,
    unrelated,
    nodeExecutable,
    packed,
  };
  const packageVersion = runPackageSmokeBody('prepare', context);
  if (packageVersion !== packed.version) fail('prepared consumer package version differs from npm pack');
  const consumerClosureOptions = {
    artifact: tarball,
    artifactIntegrity: packed.integrity,
    chartsConsumer,
    consumer,
    coreConsumer,
    exactFixtureLockValue: fixture.lock,
    exactFixtureManifestRaw: fixture.manifestRaw,
    expectedFiles,
    npmVersion,
    runtime: nodeRuntime,
  } as const;
  assertPreparedConsumerClosures({
    ...consumerClosureOptions,
    permissionPhase: 'prepared-writable',
  });
  const stateReservation = reservePackageSmokeStateFile(workspace);
  try {
    const readOnlyWorkspace = makeWorkspaceReadOnly(workspace);
    if (readOnlyWorkspace) chmodSync(workspace, 0o555);
    assertPreparedConsumerClosures({
      ...consumerClosureOptions,
      permissionPhase: 'finalized-read-only',
    });
    const finalizedTypeScriptEvidence = finalizeTypeScriptConsumerCheckBeforePublication({
      captureFirstSeal: () => fingerprintPackageSmokeWorkspace(workspace, true),
      runTypeScriptCheck: (firstFinalizedSeal) =>
        runFinalizedTypeScriptConsumerCheck(context, firstFinalizedSeal),
      revalidateConsumerClosures: () => assertPreparedConsumerClosures({
        ...consumerClosureOptions,
        permissionPhase: 'finalized-read-only',
      }),
      captureSecondSeal: () => fingerprintPackageSmokeWorkspace(workspace, true),
      revalidateRuntimeAuthority: () =>
        assertPackageRuntimeAuthority(runtimeAuthority, 'pre-publication'),
    });
    const { typescriptCheck, workspaceSeal } = finalizedTypeScriptEvidence;
    const state: PreparedState = {
      schema: PREPARED_STATE_SCHEMA,
      workspace,
      platform: process.platform,
      arch: process.arch,
      packageVersion,
      artifactIntegrity: packed.integrity,
      artifactSha256: sha256(tarball),
      fixtureManifestSha256: EXPECTED_FIXTURE_MANIFEST_SHA256,
      fixtureLockSha256: EXPECTED_FIXTURE_LOCK_SHA256,
      packResultSha256: sha256(packResultRaw),
      runtimeAuthority,
      coreConsumer,
      chartsConsumer,
      consumer,
      unrelatedDirectory: unrelated,
      nodeModules: [
        join(coreConsumer, 'node_modules'),
        join(chartsConsumer, 'node_modules'),
        join(consumer, 'node_modules'),
      ],
      typescriptCheck,
      workspaceSeal,
      readOnlyWorkspace,
    };
    const stateRaw = publishPackageSmokeStateFile(stateReservation, state);
    assertWorkspaceReadOnly(workspace, readOnlyWorkspace);
    const publishedWorkspaceSeal = fingerprintPackageSmokeWorkspace(workspace, true);
    if (!exactJsonEqual(publishedWorkspaceSeal, workspaceSeal)) {
      fail('package-smoke workspace authority changed during state publication');
    }
    assertPackageRuntimeAuthority(runtimeAuthority, 'post-publication');
    return phaseOutput('prepare', 'prepared', state, sha256(stateRaw));
  } finally {
    closePackageSmokeStateFile(stateReservation);
  }
}

export function preparePackageSmokeWorkspace(options: {
  readonly workspace: string;
  readonly nodeExecutable?: string;
  readonly npmExecutable?: string;
}): PackageSmokePhaseSuccessOutput {
  resetPackageSmokeNpmCacheSession();
  try {
    return withPackageSmokeCommandRuntime(
      () => preparePackageSmokeWorkspaceWithinCommandRuntime(options),
    );
  } finally {
    resetPackageSmokeNpmCacheSession();
  }
}

function executePackageSmokeWorkspaceWithinCommandRuntime(options: {
  readonly workspace: string;
  readonly expectedStateDigest: string;
  readonly nodeExecutable?: string;
}): PackageSmokePhaseSuccessOutput {
  if (process.platform === 'win32') {
    fail('package smoke currently requires POSIX process-group semantics');
  }
  const workspace = canonicalWorkspacePath(options.workspace);
  const { state, packed, stateFileAuthority } = readAndVerifyPreparedState(
    workspace,
    options.expectedStateDigest,
    options.nodeExecutable,
  );
  const context: PackageSmokeContext = {
    workspace,
    coreConsumer: state.coreConsumer,
    chartsConsumer: state.chartsConsumer,
    consumer: state.consumer,
    unrelated: state.unrelatedDirectory,
    nodeExecutable: state.runtimeAuthority.node.executable,
    packed,
  };
  const failures: unknown[] = [];
  try {
    const packageVersion = runPackageSmokeBody('execute', context);
    if (packageVersion !== state.packageVersion) fail('executed consumer package version changed');
  } catch (error) {
    failures.push(error);
  }
  const recheck = (check: () => void): void => {
    try {
      check();
    } catch (error) {
      failures.push(error);
    }
  };
  recheck(() => assertPackageRuntimeAuthority(state.runtimeAuthority, 'post-execute command'));
  recheck(() => {
    const finalSeal = fingerprintPackageSmokeWorkspace(workspace, true);
    if (!exactJsonEqual(finalSeal, state.workspaceSeal)) {
      fail('execute phase mutated the prepared workspace');
    }
  });
  recheck(() => assertWorkspaceReadOnly(workspace, state.readOnlyWorkspace));
  recheck(() => assertPreparedStateFileAuthority(
    workspace,
    options.expectedStateDigest,
    stateFileAuthority,
    'final execute',
  ));
  recheck(() => assertPackageRuntimeAuthority(state.runtimeAuthority, 'final execute'));
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      'package-smoke execute failed with one or more final authority revalidation failures',
    );
  }
  return phaseOutput('execute', 'passed', state, options.expectedStateDigest);
}

export function executePackageSmokeWorkspace(options: {
  readonly workspace: string;
  readonly expectedStateDigest: string;
  readonly nodeExecutable?: string;
}): PackageSmokePhaseSuccessOutput {
  resetPackageSmokeNpmCacheSession();
  try {
    return withPackageSmokeCommandRuntime(
      () => executePackageSmokeWorkspaceWithinCommandRuntime(options),
    );
  } finally {
    resetPackageSmokeNpmCacheSession();
  }
}

/**
 * Flattens the bounded portion of nested AggregateError causes without letting
 * control characters or an arbitrary thrown object's coercion forge CLI output.
 */
export function formatPackageSmokeFailure(error: unknown): string {
  const maximumNodes = 8;
  const maximumDepth = 4;
  const fragments: string[] = [];
  const visited = new Set<object>();
  let nodeCount = 0;

  const visit = (value: unknown, path: string, depth: number): void => {
    if (nodeCount >= maximumNodes) return;
    nodeCount += 1;
    const objectValue =
      value !== null && (typeof value === 'object' || typeof value === 'function')
        ? value
        : undefined;
    if (objectValue !== undefined) {
      if (visited.has(objectValue)) {
        fragments.push(`${path}="[cyclic thrown value]"`);
        return;
      }
      visited.add(objectValue);
    }

    let rawMessage: string;
    let causes: readonly unknown[] | undefined;
    let totalCauseCount: number | undefined;
    let causeInspectionFailed = false;
    let errorValue: Error | undefined;
    try {
      if (value instanceof Error) {
        errorValue = value;
        rawMessage = typeof value.message === 'string'
          ? value.message
          : '[Error with a non-string message]';
      } else if (typeof value === 'string') {
        rawMessage = value;
      } else if (value === null) {
        rawMessage = '[null thrown]';
      } else {
        rawMessage = `[non-Error ${typeof value} thrown]`;
      }
    } catch {
      rawMessage = '[uninspectable thrown value]';
    }
    if (errorValue !== undefined && depth < maximumDepth) {
      try {
        if (errorValue instanceof AggregateError) {
          const candidate = errorValue.errors;
          if (Array.isArray(candidate)) {
            const candidateLength: unknown = Reflect.get(candidate, 'length');
            if (
              typeof candidateLength !== 'number' ||
              !Number.isSafeInteger(candidateLength) ||
              candidateLength < 0 ||
              candidateLength > 0xffff_ffff
            ) {
              causeInspectionFailed = true;
            } else {
              totalCauseCount = candidateLength;
              const snapshot: unknown[] = [];
              for (
                let index = 0;
                index < Math.min(candidateLength, maximumNodes);
                index++
              ) {
                snapshot.push(Reflect.get(candidate, String(index)));
              }
              causes = Object.freeze(snapshot);
            }
          }
        }
      } catch {
        causeInspectionFailed = true;
        causes = undefined;
        totalCauseCount = undefined;
      }
    }
    const diagnostic = jsonDiagnosticString(rawMessage, 768);
    fragments.push(
      `${path}=${diagnostic.encoded}${diagnostic.truncated ? ' (truncated)' : ''}`,
    );
    if (causeInspectionFailed) {
      fragments.push(`${path}.causes="[uninspectable aggregate causes]"`);
    }
    if (causes === undefined || depth >= maximumDepth) return;

    const remainingNodes = maximumNodes - nodeCount;
    const inspectedCauses = Math.min(causes.length, remainingNodes);
    for (let index = 0; index < inspectedCauses; index++) {
      visit(causes[index], `${path}.cause[${index}]`, depth + 1);
    }
    if (totalCauseCount !== undefined && totalCauseCount > inspectedCauses) {
      fragments.push(`${path}.causesOmitted=${totalCauseCount - inspectedCauses}`);
    }
  };

  visit(error, 'error', 0);
  return fragments.join('; ');
}

export function allocateDefaultPackageSmokeWorkspaceAfterRuntimePreflight(
  options: {
    readonly nodeExecutable?: string;
    readonly npmExecutable?: string;
    readonly temporaryParent?: string;
  } = {},
): {
  readonly temp: string;
  readonly workspace: string;
  readonly nodeExecutable: string;
  readonly npmExecutable: string;
} {
  const nodeExecutable = resolveExecutable(
    options.nodeExecutable,
    'node',
    'Node executable',
  );
  inspectNodeExecutableAuthority(nodeExecutable);
  const npmExecutable = resolveNpmCli(options.npmExecutable);
  // This exact-profile check must finish before the default no-argument entry
  // creates even its outer temporary directory.
  inspectNpmPackageAuthority(npmExecutable);
  const temporaryParent = realpathSync(options.temporaryParent ?? tmpdir());
  const parentStats = lstatSync(temporaryParent);
  if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) {
    fail('package-smoke temporary parent must be one canonical real directory');
  }
  const temp = mkdtempSync(join(temporaryParent, 'cortexel-package-smoke-'));
  return Object.freeze({
    temp,
    workspace: join(temp, 'workspace'),
    nodeExecutable,
    npmExecutable,
  });
}

function runMain(): void {
  if (process.platform === 'win32') {
    fail('package smoke currently requires POSIX process-group semantics');
  }
  const invocation = parsePackageSmokeInvocation(process.argv.slice(2));
  if (invocation.command === 'prepare') {
    const result = preparePackageSmokeWorkspace({
      workspace: invocation.workspace!,
      ...(invocation.nodeExecutable === undefined
        ? {}
        : { nodeExecutable: invocation.nodeExecutable }),
      ...(invocation.npmExecutable === undefined ? {} : { npmExecutable: invocation.npmExecutable }),
    });
    process.stdout.write(`${canonicalize(result)}\n`);
    return;
  }
  if (invocation.command === 'execute') {
    const result = executePackageSmokeWorkspace({
      workspace: invocation.workspace!,
      expectedStateDigest: invocation.expectedStateDigest!,
      ...(invocation.nodeExecutable === undefined
        ? {}
        : { nodeExecutable: invocation.nodeExecutable }),
    });
    process.stdout.write(`${canonicalize(result)}\n`);
    return;
  }

  const allocation = allocateDefaultPackageSmokeWorkspaceAfterRuntimePreflight();
  const { temp, workspace, nodeExecutable, npmExecutable } = allocation;
  try {
    const prepared = preparePackageSmokeWorkspace({
      workspace,
      nodeExecutable,
      npmExecutable,
    });
    const result = executePackageSmokeWorkspace({
      workspace,
      expectedStateDigest: prepared.stateDigest,
    });
    console.log(`[cortexel] package smoke passed for ${result.packageVersion}`);
  } finally {
    makeWorkspaceWritableForCleanup(workspace);
    rmSync(temp, { recursive: true, force: true });
  }
}

function isDirectInvocation(): boolean {
  const script = process.argv[1];
  if (script === undefined || !existsSync(script)) return false;
  return pathToFileURL(realpathSync(script)).href === import.meta.url;
}

if (isDirectInvocation()) {
  try {
    runMain();
  } catch (error) {
    const message = formatPackageSmokeFailure(error);
    const requestedPhase = process.argv[2] === 'prepare' || process.argv[2] === 'execute'
      ? process.argv[2]
      : 'all';
    if (requestedPhase === 'all') {
      console.error(`[cortexel] package smoke failed: ${message}`);
    } else {
      const failure: PackageSmokePhaseFailureOutput = {
        schema: PHASE_OUTPUT_SCHEMA,
        phase: requestedPhase,
        status: 'failed',
        code: 'PACKAGE_SMOKE_FAILED',
        message,
      };
      process.stderr.write(`${canonicalize(failure)}\n`);
    }
    process.exitCode = 1;
  }
}
