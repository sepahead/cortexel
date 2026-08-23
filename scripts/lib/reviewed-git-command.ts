/**
 * Exact-runtime Git boundary for the pinned source-inventory generators.
 *
 * The caller-selected Node pathname is acquisition input only. Its bytes (and
 * Homebrew's relative libnode companion when present) are copied through
 * no-follow descriptors into a current-UID-owned 0700 runtime before any child
 * control-plane JavaScript executes under that acquired runtime. The staged
 * runtime must then identify itself as a supported Node runtime through the
 * reviewed POSIX boundary.
 *
 * Production uses the canonical protected `/usr/bin/git` on Linux. On macOS a
 * direct reviewed `/usr/bin/xcode-select -p` call resolves the selected
 * developer directory. Direct protected entries from that directory through a
 * native Git are descriptor- and digest-joined into private acquisition. The
 * `/usr/bin/git` xcrun shim and every physical or byte-identical alias are
 * excluded before Git acquisition. Tests and unusual hosts may explicitly
 * acquire a weaker caller-selected Git into a second private runtime. A frozen
 * closed profile distinguishes those three source-authority routes. Every
 * command revalidates both executable authorities and runs with copied binary
 * stdin, bounded binary output, a closed environment, and the reviewed
 * live-guardian lifecycle. HOME is either the protected canonical null device
 * or an empty current-UID-owned 0700 directory with a reviewed ACL; its exact
 * authority is sealed across the command.
 *
 * The default macOS review starts at the selected Developer directory. It does
 * not attest its parent entry, administrative selection, code signature, or
 * same-UID/admin/root replacement. It also does not close Git's compiled
 * helper/dynamic-library dependency graph, authenticate an HTTPS peer beyond
 * the platform trust store, impose a byte quota on stock Git's smart-HTTP
 * input, or contain a malicious same-UID target that detaches or kills the
 * guardian. Those require stronger containment and retained receipts.
 */
import { createHash } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  opendirSync,
  readSync,
  realpathSync,
  rmSync,
  type Dir,
  type BigIntStats,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { TextDecoder, types as utilTypes } from 'node:util';

import {
  acquireReviewedExecutableIntoPrivateRoot,
  inspectReviewedExecutableAuthority,
  REVIEWED_POSIX_COMMAND_LIMITS,
  runReviewedPosixCommand,
  type ReviewedExecutableAcquisition,
  type ReviewedExecutableAuthority,
  type ReviewedPosixCommandResult,
} from './reviewed-posix-command.js';
import {
  assertReviewedNodeRuntimeLive,
  createReviewedNodeRuntime,
  reviewedNodeRuntimeTesting,
  type ReviewedNodeRuntime,
} from './reviewed-node-runtime.js';
import {
  currentPosixUid,
  requireExactPrivateDirectoryAuthority,
  requireProtectedDirectoryEntryChain,
  requireReviewedPosixAclAuthority,
  type ExactPrivateDirectoryAuthority,
} from './posix-acl-authority.js';

const REVIEWED_GIT_RUNTIME_PREFIX = 'cortexel-reviewed-git-runtime-';
const REVIEWED_GIT_RUNTIME_SCHEMA =
  'cortexel-reviewed-git-runtime.v1' as const;
export const REVIEWED_GIT_SOURCE_AUTHORITY_PROFILE_SCHEMA =
  'cortexel-reviewed-git-source-authority-profile.v1' as const;
const REVIEWED_GIT_BATCH_SCHEMA =
  'cortexel-reviewed-git-blob-batch.v1' as const;
const SYSTEM_GIT_EXECUTABLE = '/usr/bin/git';
const DARWIN_XCODE_SELECT_EXECUTABLE = '/usr/bin/xcode-select';
const DARWIN_GIT_RELATIVE_PATH = path.join('usr', 'bin', 'git');
const MAX_GIT_VERSION_BYTES = 4 * 1024;
const MAX_DARWIN_DEVELOPER_SELECTION_BYTES =
  REVIEWED_POSIX_COMMAND_LIMITS.pathBytes + 1;
const DARWIN_XCODE_SELECT_ENVIRONMENT = Object.freeze({
  LANG: 'C',
  LC_ALL: 'C',
  TZ: 'UTC',
});
const DARWIN_NATIVE_EXECUTABLE_MAGICS = new Set([
  'bebafeca',
  'bfbafeca',
  'cafebabe',
  'cafebabf',
  'cefaedfe',
  'cffaedfe',
  'feedface',
  'feedfacf',
]);
const GIT_IDENTITY_HASH_CHUNK_BYTES = 1024 * 1024;
const MAX_GIT_BATCH_REQUESTS = 100_000;
const MAX_GIT_BATCH_OBJECT_BYTES = 512 * 1024 * 1024;
const MAX_DIAGNOSTIC_BYTES = 2_000;
const SHA1 = /^[0-9a-f]{40}$/u;
const GIT_VERSION =
  /^git version [0-9]+\.[0-9]+(?:\.[0-9]+)*(?:[.+_-][0-9A-Za-z.+_-]+)?(?: \([0-9A-Za-z][0-9A-Za-z .+_-]{0,126}\))?$/u;
const REVIEWED_GIT_BATCH_CONFIG_ARGUMENTS = Object.freeze([
  '-c',
  'core.fsmonitor=false',
  '-c',
  'core.untrackedCache=false',
  '-c',
  'core.ignoreStat=false',
  '-c',
  'maintenance.auto=false',
  '-c',
  'maintenance.autoDetach=false',
  '-c',
  'gc.auto=0',
  '-c',
  'gc.autoDetach=false',
] as const);

export interface ReviewedGitRuntimeOptions {
  /** Candidate names only; their pathnames are never executable authority. */
  readonly sourceNodeCandidates?: readonly string[];
  /** Non-default candidates are descriptor-acquired before use. */
  readonly sourceGitExecutable?: string;
}

export interface ReviewedGitRuntime {
  readonly schema: typeof REVIEWED_GIT_RUNTIME_SCHEMA;
  readonly runtimeRoot: string;
  readonly sourceNodeExecutable: string;
  readonly node: ReviewedExecutableAcquisition;
  readonly nodeVersion: string;
  readonly gitExecutable: string;
  readonly gitAuthority: ReviewedExecutableAuthority;
  readonly gitAcquisition: ReviewedExecutableAcquisition | null;
  readonly gitSourceAuthorityProfile: ReviewedGitSourceAuthorityProfile;
  readonly gitVersion: string;
}

export type ReviewedGitSourceAuthorityProfile = Readonly<{
  readonly schema: typeof REVIEWED_GIT_SOURCE_AUTHORITY_PROFILE_SCHEMA;
  readonly kind:
    | 'linux_protected_system_git'
    | 'darwin_selected_developer_tree_git_bytes'
    | 'explicit_caller_selected_git_bytes';
}>;

export interface ReviewedGitCommandOptions {
  readonly environment: NodeJS.ProcessEnv;
  readonly stdin?: Uint8Array;
  readonly timeoutMs: number;
  readonly outputLimitBytes: number;
  readonly acceptedStatuses?: readonly number[];
  readonly requireEmptyStderr?: boolean;
}

export interface ReviewedGitBlobRequest {
  readonly objectName: string;
  readonly expectedGitBlobSha1: string;
}

export interface ReviewedGitBlobRecord {
  readonly schema: typeof REVIEWED_GIT_BATCH_SCHEMA;
  readonly objectName: string;
  readonly gitBlobSha1: string;
  readonly byteLength: number;
  readonly sha256: string;
  /** Return a detached copy; authoritative batch bytes are never exposed mutably. */
  readonly copyBytes: () => Buffer;
}

export interface ReviewedGitObjectIntegrityRequest {
  readonly objectName: string;
  readonly expectedGitObjectSha1: string;
  readonly expectedObjectType: 'blob' | 'commit' | 'tag' | 'tree';
}

export interface ReviewedGitObjectIntegrityRecord {
  readonly objectName: string;
  readonly gitObjectSha1: string;
  readonly objectType: ReviewedGitObjectIntegrityRequest['expectedObjectType'];
  readonly byteLength: number;
  readonly sha256: string;
}

interface OwnedRuntimeIdentity {
  readonly device: bigint;
  readonly inode: bigint;
  readonly nodeRuntime: ReviewedNodeRuntime;
  disposed: boolean;
}

interface ReviewedGitNullHomeAuthority {
  readonly kind: 'canonical_null_device';
  readonly path: '/dev/null';
  readonly device: bigint;
  readonly inode: bigint;
  readonly rawDevice: bigint;
  readonly mode: bigint;
  readonly uid: bigint;
  readonly gid: bigint;
}

interface ReviewedGitPrivateHomeAuthority {
  readonly kind: 'empty_private_directory';
  readonly path: string;
  readonly device: bigint;
  readonly inode: bigint;
  readonly mode: bigint;
  readonly uid: bigint;
  readonly changeTimeNanoseconds: bigint;
  readonly modificationTimeNanoseconds: bigint;
}

type ReviewedGitHomeAuthority =
  | ReviewedGitNullHomeAuthority
  | ReviewedGitPrivateHomeAuthority;

const OWNED_RUNTIMES = new WeakMap<ReviewedGitRuntime, OwnedRuntimeIdentity>();
let processRuntime: ReviewedGitRuntime | null = null;

const CLOSED_GIT_ENVIRONMENT_KEYS = new Set([
  'GIT_ALLOW_PROTOCOL',
  'GIT_ATTR_NOSYSTEM',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_NOSYSTEM',
  'GIT_LFS_SKIP_SMUDGE',
  'GIT_NO_LAZY_FETCH',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_OPTIONAL_LOCKS',
  'GIT_PROTOCOL_FROM_USER',
  'GIT_TERMINAL_PROMPT',
  'HOME',
  'LANG',
  'LC_ALL',
  'PATH',
  'TZ',
]);
const REQUIRED_GIT_ENVIRONMENT = Object.freeze({
  GIT_ALLOW_PROTOCOL: 'https',
  GIT_ATTR_NOSYSTEM: '1',
  GIT_CONFIG_COUNT: '0',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_LFS_SKIP_SMUDGE: '1',
  GIT_NO_REPLACE_OBJECTS: '1',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_PROTOCOL_FROM_USER: '0',
  GIT_TERMINAL_PROMPT: '0',
  LANG: 'C',
  LC_ALL: 'C',
  PATH: '/usr/bin:/bin',
});

function fail(message: string): never {
  throw new Error(`reviewed Git boundary: ${message}`);
}

function withClosedDirectory<T>(
  directory: Dir,
  label: string,
  operation: () => T,
): T {
  let outcome: { readonly ok: true; readonly value: T } |
    { readonly ok: false; readonly error: unknown };
  try {
    outcome = { ok: true, value: operation() };
  } catch (error) {
    outcome = { ok: false, error };
  }

  let closeFailed = false;
  let closeError: unknown;
  try {
    directory.closeSync();
  } catch (error) {
    closeFailed = true;
    closeError = error;
  }
  if (!outcome.ok) {
    if (closeFailed) {
      throw new AggregateError(
        [outcome.error, closeError],
        `reviewed Git boundary: ${label} failed and its directory descriptor close was ambiguous`,
      );
    }
    throw outcome.error;
  }
  if (closeFailed) {
    throw new AggregateError(
      [closeError],
      `reviewed Git boundary: ${label} directory descriptor close was ambiguous`,
    );
  }
  return outcome.value;
}

function withClosedDescriptor<T>(
  descriptor: number,
  label: string,
  operation: () => T,
): T {
  let outcome: { readonly ok: true; readonly value: T } |
    { readonly ok: false; readonly error: unknown };
  try {
    outcome = { ok: true, value: operation() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  let closeFailed = false;
  let closeError: unknown;
  try {
    closeSync(descriptor);
  } catch (error) {
    closeFailed = true;
    closeError = error;
  }
  if (!outcome.ok) {
    if (closeFailed) {
      throw new AggregateError(
        [outcome.error, closeError],
        `reviewed Git boundary: ${label} failed and its descriptor close was ambiguous`,
      );
    }
    throw outcome.error;
  }
  if (closeFailed) {
    throw new AggregateError(
      [closeError],
      `reviewed Git boundary: ${label} descriptor close was ambiguous`,
    );
  }
  return outcome.value;
}

function directoryIsEmpty(directoryPath: string, label: string): boolean {
  const directory = opendirSync(directoryPath, { encoding: 'utf8' });
  return withClosedDirectory(
    directory,
    label,
    () => directory.readSync() === null,
  );
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function ownDataRecord(
  value: unknown,
  label: string,
  required: readonly string[],
  optional: readonly string[] = [],
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be a plain own-data object`);
  }
  if (utilTypes.isProxy(value)) fail(`${label} must not be a Proxy`);
  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(value);
  } catch {
    fail(`${label} cannot be inspected safely`);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`${label} has an unreviewed prototype`);
  }
  const allowed = new Set([...required, ...optional]);
  let maximumAllowedKeyCodeUnits = 0;
  for (const key of allowed) {
    maximumAllowedKeyCodeUnits = Math.max(maximumAllowedKeyCodeUnits, key.length);
  }
  const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  let enumerated = 0;
  // Only enumerable string members participate in the semantic input. Inert
  // non-enumerable and symbol metadata is ignored without materializing it.
  for (const key in value as Record<string, unknown>) {
    enumerated++;
    if (
      enumerated > allowed.size ||
      key.length > maximumAllowedKeyCodeUnits ||
      !allowed.has(key) ||
      !Object.prototype.hasOwnProperty.call(value, key)
    ) {
      fail(`${label} does not have its exact reviewed member set`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      fail(`${label}.${key} cannot be inspected safely`);
    }
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      fail(`${label}.${key} must be an enumerable own data property`);
    }
    snapshot[key] = descriptor.value;
  }
  if (required.some((key) => !Object.prototype.hasOwnProperty.call(snapshot, key))) {
    fail(`${label} does not have its exact reviewed member set`);
  }
  return Object.freeze(snapshot);
}

function ownDataArray(
  value: unknown,
  label: string,
  maximumLength: number,
): readonly unknown[] {
  if (!Array.isArray(value)) {
    fail(`${label} must be a direct array`);
  }
  if (utilTypes.isProxy(value)) fail(`${label} must not be a Proxy`);
  let prototype: object | null;
  let lengthDescriptor: PropertyDescriptor | undefined;
  try {
    prototype = Object.getPrototypeOf(value);
    lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  } catch {
    fail(`${label} cannot be inspected safely`);
  }
  if (
    prototype !== Array.prototype ||
    lengthDescriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value') ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > maximumLength
  ) {
    fail(`${label} has an invalid or excessive length authority`);
  }
  const length = lengthDescriptor.value as number;
  const maximumIndexKeyCodeUnits = String(Math.max(0, length - 1)).length;
  let enumerated = 0;
  for (const key in value as unknown[]) {
    enumerated++;
    if (
      enumerated > length ||
      key.length > maximumIndexKeyCodeUnits
    ) {
      fail(`${label} must be dense and contain no extra enumerable members`);
    }
    const index = /^(?:0|[1-9][0-9]*)$/u.test(key) ? Number(key) : -1;
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= length ||
      String(index) !== key ||
      !Object.prototype.hasOwnProperty.call(value, key)
    ) {
      fail(`${label} must be dense and contain no extra enumerable members`);
    }
  }
  const snapshot: unknown[] = [];
  for (let index = 0; index < length; index++) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    } catch {
      fail(`${label}[${index}] cannot be inspected safely`);
    }
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      fail(`${label}[${index}] must be an enumerable own data property`);
    }
    snapshot.push(descriptor.value);
  }
  return Object.freeze(snapshot);
}

function stringArray(
  value: unknown,
  label: string,
  maximumLength: number = REVIEWED_POSIX_COMMAND_LIMITS.arguments,
): readonly string[] {
  const values = ownDataArray(value, label, maximumLength);
  if (values.some((entry) => typeof entry !== 'string')) {
    fail(`${label} contains a non-string member`);
  }
  return Object.freeze(values as string[]);
}

function closedGitEnvironment(value: unknown): NodeJS.ProcessEnv {
  const record = ownDataRecord(
    value,
    'reviewed Git environment',
    [],
    [...CLOSED_GIT_ENVIRONMENT_KEYS],
  );
  const environment: NodeJS.ProcessEnv = Object.create(null) as NodeJS.ProcessEnv;
  let aggregateBytes = 0;
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry !== 'string' || entry.includes('\0')) {
      fail(`reviewed Git environment ${key} is not a bounded string`);
    }
    aggregateBytes += Buffer.byteLength(key, 'utf8') +
      Buffer.byteLength(entry, 'utf8');
    if (aggregateBytes > REVIEWED_POSIX_COMMAND_LIMITS.payloadBytes) {
      fail('reviewed Git environment exceeds its aggregate byte bound');
    }
    environment[key] = entry;
  }
  for (const [key, expected] of Object.entries(REQUIRED_GIT_ENVIRONMENT)) {
    if (environment[key] !== expected) {
      fail(`reviewed Git environment does not close ${key}`);
    }
  }
  if (
    environment.HOME === undefined ||
    !path.isAbsolute(environment.HOME) ||
    path.resolve(environment.HOME) !== environment.HOME ||
    (environment.GIT_NO_LAZY_FETCH !== undefined &&
      environment.GIT_NO_LAZY_FETCH !== '1') ||
    (environment.TZ !== undefined && environment.TZ !== 'UTC')
  ) {
    fail('reviewed Git environment has an invalid HOME/lazy-fetch/TZ authority');
  }
  return Object.freeze(environment);
}

function sameNullDeviceIdentity(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.rdev === right.rdev;
}

function requireExactCanonicalNullDevice(
  stat: BigIntStats,
  label: string,
): void {
  if (
    !stat.isCharacterDevice() ||
    stat.isSymbolicLink() ||
    stat.uid !== 0n ||
    stat.gid !== 0n ||
    stat.nlink !== 1n ||
    (stat.mode & 0o7777n) !== 0o666n
  ) {
    fail(`${label} is not the exact canonical root-owned null device`);
  }
}

function inspectCanonicalNullHome(): ReviewedGitNullHomeAuthority {
  const nullPath = '/dev/null' as const;
  if (realpathSync(nullPath) !== nullPath) {
    fail('reviewed Git HOME /dev/null is not canonical');
  }
  requireProtectedDirectoryEntryChain(
    '/dev',
    'reviewed Git HOME null-device parent authority',
  );
  const before = lstatSync(nullPath, { bigint: true });
  requireExactCanonicalNullDevice(before, 'reviewed Git HOME /dev/null');
  const descriptor = openSync(
    nullPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  return withClosedDescriptor(descriptor, 'reviewed Git HOME /dev/null', () => {
    const opened = fstatSync(descriptor, { bigint: true });
    requireExactCanonicalNullDevice(
      opened,
      'reviewed Git HOME /dev/null descriptor',
    );
    if (!sameNullDeviceIdentity(before, opened)) {
      fail('reviewed Git HOME /dev/null identity changed while opening');
    }
    const after = lstatSync(nullPath, { bigint: true });
    const descriptorAfter = fstatSync(descriptor, { bigint: true });
    requireExactCanonicalNullDevice(after, 'reviewed Git HOME /dev/null');
    requireExactCanonicalNullDevice(
      descriptorAfter,
      'reviewed Git HOME /dev/null descriptor',
    );
    if (
      realpathSync(nullPath) !== nullPath ||
      !sameNullDeviceIdentity(before, after) ||
      !sameNullDeviceIdentity(before, descriptorAfter)
    ) {
      fail('reviewed Git HOME /dev/null identity changed during inspection');
    }
    return Object.freeze({
      kind: 'canonical_null_device',
      path: nullPath,
      device: before.dev,
      inode: before.ino,
      rawDevice: before.rdev,
      mode: before.mode & 0o7777n,
      uid: before.uid,
      gid: before.gid,
    });
  });
}

function samePrivateDirectoryAuthority(
  left: ExactPrivateDirectoryAuthority,
  right: ExactPrivateDirectoryAuthority,
): boolean {
  return left.path === right.path &&
    left.device === right.device &&
    left.inode === right.inode &&
    left.mode === right.mode &&
    left.uid === right.uid;
}

function inspectEmptyPrivateHome(home: string): ReviewedGitPrivateHomeAuthority {
  const before = requireExactPrivateDirectoryAuthority(
    home,
    'reviewed Git HOME private-directory authority',
  );
  const beforeStat = lstatSync(home, { bigint: true });
  if (!directoryIsEmpty(home, 'reviewed Git HOME emptiness inspection')) {
    fail('reviewed Git HOME private directory must be empty');
  }
  const after = requireExactPrivateDirectoryAuthority(
    home,
    'reviewed Git HOME private-directory authority',
  );
  const afterStat = lstatSync(home, { bigint: true });
  if (
    !directoryIsEmpty(home, 'reviewed Git HOME final emptiness inspection') ||
    !samePrivateDirectoryAuthority(before, after) ||
    beforeStat.dev !== afterStat.dev ||
    beforeStat.ino !== afterStat.ino ||
    beforeStat.uid !== afterStat.uid ||
    (beforeStat.mode & 0o7777n) !== (afterStat.mode & 0o7777n) ||
    beforeStat.ctimeNs !== afterStat.ctimeNs ||
    beforeStat.mtimeNs !== afterStat.mtimeNs
  ) {
    fail('reviewed Git HOME private directory changed during inspection');
  }
  return Object.freeze({
    kind: 'empty_private_directory',
    path: after.path,
    device: after.device,
    inode: after.inode,
    mode: after.mode,
    uid: after.uid,
    changeTimeNanoseconds: afterStat.ctimeNs,
    modificationTimeNanoseconds: afterStat.mtimeNs,
  });
}

function inspectReviewedGitHome(home: string): ReviewedGitHomeAuthority {
  return home === '/dev/null'
    ? inspectCanonicalNullHome()
    : inspectEmptyPrivateHome(home);
}

function sameReviewedGitHomeAuthority(
  left: ReviewedGitHomeAuthority,
  right: ReviewedGitHomeAuthority,
): boolean {
  if (left.kind !== right.kind || left.path !== right.path) return false;
  if (left.kind === 'canonical_null_device') {
    if (right.kind !== 'canonical_null_device') return false;
    return left.device === right.device &&
      left.inode === right.inode &&
      left.rawDevice === right.rawDevice &&
      left.mode === right.mode &&
      left.uid === right.uid &&
      left.gid === right.gid;
  }
  if (right.kind !== 'empty_private_directory') return false;
  return left.device === right.device &&
    left.inode === right.inode &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.changeTimeNanoseconds === right.changeTimeNanoseconds &&
    left.modificationTimeNanoseconds === right.modificationTimeNanoseconds;
}

function snapshotReviewedStdin(value: unknown): Buffer {
  if (!ArrayBuffer.isView(value) || !(value instanceof Uint8Array)) {
    fail('reviewed Git stdin must be one direct Uint8Array or Buffer');
  }
  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(value);
  } catch {
    fail('reviewed Git stdin cannot be inspected safely');
  }
  if (prototype !== Uint8Array.prototype && prototype !== Buffer.prototype) {
    fail('reviewed Git stdin must be one direct Uint8Array or Buffer');
  }
  const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype) as object;
  const bufferGetter = Object.getOwnPropertyDescriptor(
    typedArrayPrototype,
    'buffer',
  )?.get;
  const byteOffsetGetter = Object.getOwnPropertyDescriptor(
    typedArrayPrototype,
    'byteOffset',
  )?.get;
  const byteLengthGetter = Object.getOwnPropertyDescriptor(
    typedArrayPrototype,
    'byteLength',
  )?.get;
  if (
    bufferGetter === undefined ||
    byteOffsetGetter === undefined ||
    byteLengthGetter === undefined
  ) {
    fail('reviewed Git stdin byte authority is unavailable');
  }
  let buffer: ArrayBufferLike;
  let byteOffset: number;
  let byteLength: number;
  try {
    buffer = bufferGetter.call(value) as ArrayBufferLike;
    byteOffset = byteOffsetGetter.call(value) as number;
    byteLength = byteLengthGetter.call(value) as number;
  } catch {
    fail('reviewed Git stdin byte authority cannot be inspected');
  }
  if (utilTypes.isSharedArrayBuffer(buffer)) {
    fail('reviewed Git stdin must not have concurrently mutable shared backing');
  }
  let bufferPrototype: object | null;
  let resizable = false;
  try {
    bufferPrototype = Object.getPrototypeOf(buffer);
    const resizableGetter = Object.getOwnPropertyDescriptor(
      ArrayBuffer.prototype,
      'resizable',
    )?.get;
    resizable = resizableGetter === undefined
      ? false
      : resizableGetter.call(buffer) === true;
  } catch {
    fail('reviewed Git stdin backing authority cannot be inspected');
  }
  if (
    !utilTypes.isArrayBuffer(buffer) ||
    bufferPrototype !== ArrayBuffer.prototype ||
    resizable
  ) {
    fail('reviewed Git stdin must have one direct fixed ArrayBuffer backing');
  }
  if (
    !Number.isSafeInteger(byteOffset) ||
    byteOffset < 0 ||
    !Number.isSafeInteger(byteLength) ||
    byteLength < 0 ||
    byteLength > REVIEWED_POSIX_COMMAND_LIMITS.stdinBytes
  ) {
    fail('reviewed Git stdin exceeds its byte bound');
  }
  try {
    // These are intrinsic view/copy operations: no caller iterator, species,
    // accessor, proxy, or subclass hook participates in the authoritative copy.
    return Buffer.from(new Uint8Array(buffer, byteOffset, byteLength));
  } catch {
    fail('reviewed Git stdin bytes cannot be copied exactly');
  }
}

function decodeUtf8(buffer: Buffer, label: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
  } catch {
    fail(`${label} is not well-formed UTF-8`);
  }
}

function safeDiagnostic(buffer: Buffer): string {
  return buffer
    .subarray(0, MAX_DIAGNOSTIC_BYTES)
    .toString('utf8')
    .replace(
      /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,
      '\uFFFD',
    )
    .trim();
}

function exactSuccessfulResult(
  result: ReviewedPosixCommandResult,
  label: string,
  requireEmptyStderr = true,
): void {
  if (
    result.status !== 0 ||
    result.signal !== null ||
    result.timedOut ||
    result.outputOverflow ||
    result.guardianSweepIntentCount !== 1
  ) {
    fail(
      `${label} failed (status ${String(result.status)}, signal ` +
      `${String(result.signal)}, timeout ${String(result.timedOut)}, overflow ` +
      `${String(result.outputOverflow)})`,
    );
  }
  if (requireEmptyStderr && result.stderr.byteLength !== 0) {
    const diagnostic = safeDiagnostic(result.stderr);
    fail(`${label} wrote stderr${diagnostic ? `: ${diagnostic}` : ''}`);
  }
}

function sameRegularFileStat(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.nlink === right.nlink &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.birthtimeNs === right.birthtimeNs;
}

function hashRegularFileDescriptor(
  descriptor: number,
  size: number,
  label: string,
): string {
  const chunk = Buffer.allocUnsafe(Math.min(
    GIT_IDENTITY_HASH_CHUNK_BYTES,
    Math.max(size, 1),
  ));
  const digest = createHash('sha256');
  let offset = 0;
  while (offset < size) {
    const count = readSync(
      descriptor,
      chunk,
      0,
      Math.min(chunk.byteLength, size - offset),
      offset,
    );
    if (count <= 0) fail(`${label} ended before its declared size`);
    digest.update(chunk.subarray(0, count));
    offset += count;
  }
  return `sha256:${digest.digest('hex')}`;
}

interface DarwinGitCandidateIdentity {
  readonly device: string;
  readonly inode: string;
  readonly sha256: string;
  readonly size: number;
}

interface DarwinDeveloperTreeEntryAuthority {
  readonly canonicalPath: string;
  readonly kind: 'directory' | 'file';
  readonly mode: number;
  readonly path: string;
  readonly uid: number;
}

interface DarwinDeveloperTreeAuthorityFixture {
  readonly developerDirectory: string;
  readonly entries: readonly DarwinDeveloperTreeEntryAuthority[];
  readonly gitMagicHex: string;
}

function requireDistinctDarwinShimIdentity(
  candidate: DarwinGitCandidateIdentity,
  shim: DarwinGitCandidateIdentity,
): void {
  if (
    candidate.device === shim.device &&
    candidate.inode === shim.inode
  ) {
    fail(
      'macOS Git candidate has the physical identity of the /usr/bin/git xcrun shim',
    );
  }
  if (candidate.size === shim.size && candidate.sha256 === shim.sha256) {
    fail(
      'macOS Git candidate has the byte identity of the /usr/bin/git xcrun shim',
    );
  }
}

function darwinShimIdentity(): DarwinGitCandidateIdentity {
  const shim = inspectReviewedExecutableAuthority(
    SYSTEM_GIT_EXECUTABLE,
    'reviewed macOS Git shim identity',
  );
  return Object.freeze({
    device: shim.file.device,
    inode: shim.file.inode,
    sha256: shim.file.sha256,
    size: shim.file.size,
  });
}

/** Reject the multiplexer by opened-file identity, never by pathname spelling. */
function inspectNonShimDarwinGitCandidate(
  candidate: string,
  requireNativeExecutable = false,
): DarwinGitCandidateIdentity {
  const shim = darwinShimIdentity();
  const initial = lstatSync(candidate, { bigint: true });
  if (
    !initial.isFile() ||
    initial.isSymbolicLink() ||
    initial.size < 0n ||
    initial.size > BigInt(REVIEWED_POSIX_COMMAND_LIMITS.executableBytes)
  ) {
    fail('macOS Git candidate is not a bounded direct regular file');
  }
  const descriptor = openSync(
    candidate,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK,
  );
  return withClosedDescriptor(descriptor, 'macOS Git shim identity inspection', () => {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || !sameRegularFileStat(initial, opened)) {
      fail('macOS Git candidate changed before shim identity inspection');
    }
    const nativeMagic = Buffer.alloc(4);
    if (readSync(descriptor, nativeMagic, 0, nativeMagic.byteLength, 0) !== 4) {
      fail('macOS Git candidate is too short for executable format review');
    }
    if (
      requireNativeExecutable &&
      !DARWIN_NATIVE_EXECUTABLE_MAGICS.has(nativeMagic.toString('hex'))
    ) {
      fail('selected macOS developer Git is not a native Mach-O executable');
    }
    const size = Number(opened.size);
    const sha256 = hashRegularFileDescriptor(
      descriptor,
      size,
      'macOS Git candidate identity',
    );
    const finalDescriptor = fstatSync(descriptor, { bigint: true });
    const rebound = lstatSync(candidate, { bigint: true });
    if (
      !sameRegularFileStat(opened, finalDescriptor) ||
      !sameRegularFileStat(opened, rebound)
    ) {
      fail('macOS Git candidate changed during shim identity inspection');
    }
    const identity = Object.freeze({
      device: opened.dev.toString(10),
      inode: opened.ino.toString(10),
      sha256,
      size,
    });
    requireDistinctDarwinShimIdentity(identity, shim);
    return identity;
  });
}

function requireDarwinDeveloperTreeFixture(
  fixture: DarwinDeveloperTreeAuthorityFixture,
): string {
  const expectedPaths = [
    fixture.developerDirectory,
    path.join(fixture.developerDirectory, 'usr'),
    path.join(fixture.developerDirectory, 'usr', 'bin'),
    path.join(fixture.developerDirectory, DARWIN_GIT_RELATIVE_PATH),
  ];
  if (
    !path.isAbsolute(fixture.developerDirectory) ||
    path.resolve(fixture.developerDirectory) !== fixture.developerDirectory ||
    fixture.entries.length !== expectedPaths.length
  ) {
    fail('selected macOS developer tree fixture is malformed');
  }
  for (let index = 0; index < expectedPaths.length; index++) {
    const entry = fixture.entries[index]!;
    const expectedPath = expectedPaths[index]!;
    const expectedKind = index === expectedPaths.length - 1 ? 'file' : 'directory';
    if (
      entry.path !== expectedPath ||
      entry.canonicalPath !== expectedPath
    ) {
      fail('selected macOS developer tree contains a symbolic or escaping entry');
    }
    if (entry.kind !== expectedKind) {
      fail('selected macOS developer tree contains an unexpected entry kind');
    }
    if (entry.uid !== 0) {
      fail('selected macOS developer tree is not root-owned from Developer downward');
    }
    if ((entry.mode & 0o7022) !== 0) {
      fail('selected macOS developer tree has special or group/world-write authority');
    }
    if (
      expectedKind === 'directory'
        ? (entry.mode & 0o100) === 0
        : (entry.mode & 0o111) === 0
    ) {
      fail('selected macOS developer tree is not traversable/executable');
    }
  }
  if (!DARWIN_NATIVE_EXECUTABLE_MAGICS.has(fixture.gitMagicHex)) {
    fail('selected macOS developer Git is not a native Mach-O executable');
  }
  const gitExecutable = expectedPaths.at(-1)!;
  const relativeGit = path.relative(fixture.developerDirectory, gitExecutable);
  if (
    relativeGit !== DARWIN_GIT_RELATIVE_PATH ||
    relativeGit.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeGit)
  ) {
    fail('selected macOS developer Git escapes its Developer directory');
  }
  return gitExecutable;
}

function withDarwinDeveloperTreeDescriptors<T>(
  paths: readonly string[],
  operation: (descriptors: readonly number[]) => T,
): T {
  const descriptors: number[] = [];
  let outcome: { readonly ok: true; readonly value: T } |
    { readonly ok: false; readonly error: unknown };
  try {
    for (let index = 0; index < paths.length; index++) {
      const flags = fsConstants.O_RDONLY |
        fsConstants.O_NOFOLLOW |
        fsConstants.O_NONBLOCK |
        (index === paths.length - 1 ? 0 : fsConstants.O_DIRECTORY);
      descriptors.push(openSync(paths[index]!, flags));
    }
    outcome = { ok: true, value: operation(descriptors) };
  } catch (error) {
    outcome = { ok: false, error };
  }
  const cleanupErrors: unknown[] = [];
  for (let index = descriptors.length - 1; index >= 0; index--) {
    try {
      closeSync(descriptors[index]!);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (!outcome.ok) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [outcome.error, ...cleanupErrors],
        'reviewed Git boundary: selected macOS developer tree review and descriptor cleanup failed',
        { cause: outcome.error },
      );
    }
    throw outcome.error;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      'reviewed Git boundary: selected macOS developer tree descriptor cleanup failed',
    );
  }
  return outcome.value;
}

function inspectDarwinDeveloperTree(
  developerDirectory: string,
): { readonly gitExecutable: string; readonly gitIdentity: DarwinGitCandidateIdentity } {
  const paths = [
    developerDirectory,
    path.join(developerDirectory, 'usr'),
    path.join(developerDirectory, 'usr', 'bin'),
    path.join(developerDirectory, DARWIN_GIT_RELATIVE_PATH),
  ];
  const initial = paths.map((entryPath) => lstatSync(entryPath, { bigint: true }));
  return withDarwinDeveloperTreeDescriptors(paths, (descriptors) => {
    const opened = descriptors.map((descriptor) =>
      fstatSync(descriptor, { bigint: true }));
    const entries = paths.map((entryPath, index): DarwinDeveloperTreeEntryAuthority => {
      const stat = initial[index]!;
      const descriptorStat = opened[index]!;
      if (!sameRegularFileStat(stat, descriptorStat)) {
        fail('selected macOS developer tree changed while it was opened');
      }
      if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
        fail('selected macOS developer tree contains a non-direct entry');
      }
      return Object.freeze({
        canonicalPath: realpathSync(entryPath),
        kind: stat.isDirectory() ? 'directory' : 'file',
        mode: Number(stat.mode & 0o7777n),
        path: entryPath,
        uid: Number(stat.uid),
      });
    });
    const gitDescriptor = descriptors.at(-1)!;
    const gitMagic = Buffer.alloc(4);
    if (readSync(gitDescriptor, gitMagic, 0, gitMagic.byteLength, 0) !== 4) {
      fail('selected macOS developer Git is too short for executable format review');
    }
    const gitExecutable = requireDarwinDeveloperTreeFixture({
      developerDirectory,
      entries,
      gitMagicHex: gitMagic.toString('hex'),
    });
    requireReviewedPosixAclAuthority(paths.flatMap((entryPath, index) => [
      {
        kind: 'path' as const,
        label: `selected developer entry path ${index}`,
        value: entryPath,
      },
      {
        kind: 'descriptor' as const,
        label: `selected developer entry descriptor ${index}`,
        value: descriptors[index]!,
      },
    ]));
    const gitStat = opened.at(-1)!;
    const gitSize = Number(gitStat.size);
    if (
      gitStat.size < 0n ||
      gitStat.size > BigInt(REVIEWED_POSIX_COMMAND_LIMITS.executableBytes)
    ) {
      fail('selected macOS developer Git exceeds its executable byte bound');
    }
    const gitIdentity = Object.freeze({
      device: gitStat.dev.toString(10),
      inode: gitStat.ino.toString(10),
      sha256: hashRegularFileDescriptor(
        gitDescriptor,
        gitSize,
        'selected macOS developer Git identity',
      ),
      size: gitSize,
    });
    for (let index = 0; index < paths.length; index++) {
      const rebound = lstatSync(paths[index]!, { bigint: true });
      const reboundDescriptor = fstatSync(descriptors[index]!, { bigint: true });
      if (
        realpathSync(paths[index]!) !== paths[index] ||
        !sameRegularFileStat(opened[index]!, rebound) ||
        !sameRegularFileStat(opened[index]!, reboundDescriptor)
      ) {
        fail('selected macOS developer tree changed during authority review');
      }
    }
    requireDistinctDarwinShimIdentity(gitIdentity, darwinShimIdentity());
    return Object.freeze({ gitExecutable, gitIdentity });
  });
}

function darwinDeveloperSelection(
  stdout: Buffer,
): { readonly developerDirectory: string; readonly gitExecutable: string } {
  const text = decodeUtf8(stdout, 'reviewed xcode-select output');
  if (
    text.length < 2 ||
    !text.endsWith('\n') ||
    text.indexOf('\n') !== text.length - 1 ||
    text.includes('\r') ||
    text.includes('\0')
  ) {
    fail('reviewed xcode-select output must contain one absolute path and one newline');
  }
  const developerDirectory = text.slice(0, -1);
  if (
    developerDirectory.length === 0 ||
    developerDirectory.length > REVIEWED_POSIX_COMMAND_LIMITS.pathBytes ||
    Buffer.byteLength(developerDirectory, 'utf8') >
      REVIEWED_POSIX_COMMAND_LIMITS.pathBytes ||
    !path.isAbsolute(developerDirectory) ||
    path.resolve(developerDirectory) !== developerDirectory
  ) {
    fail('reviewed xcode-select output is not a bounded normalized absolute path');
  }
  const gitExecutable = path.join(developerDirectory, DARWIN_GIT_RELATIVE_PATH);
  if (
    gitExecutable.length > REVIEWED_POSIX_COMMAND_LIMITS.pathBytes ||
    Buffer.byteLength(gitExecutable, 'utf8') > REVIEWED_POSIX_COMMAND_LIMITS.pathBytes
  ) {
    fail('reviewed xcode-select output resolves beyond its Git path bound');
  }
  return Object.freeze({
    developerDirectory,
    gitExecutable,
  });
}

function resolveDarwinDefaultGitExecutable(
  runtimeRoot: string,
  nodeRuntime: ReviewedNodeRuntime,
): { readonly gitExecutable: string; readonly gitIdentity: DarwinGitCandidateIdentity } {
  const selectorAuthority = inspectReviewedExecutableAuthority(
    DARWIN_XCODE_SELECT_EXECUTABLE,
    'reviewed xcode-select executable',
  );
  const result = runReviewedPosixCommand(
    nodeRuntime.node.authority.executable,
    DARWIN_XCODE_SELECT_EXECUTABLE,
    ['-p'],
    runtimeRoot,
    {
      controlRuntimeAuthority: nodeRuntime.node.authority,
      environment: DARWIN_XCODE_SELECT_ENVIRONMENT,
      outputLimitBytes: MAX_DARWIN_DEVELOPER_SELECTION_BYTES,
      targetAuthority: selectorAuthority,
      timeoutMs: 10_000,
    },
  );
  exactSuccessfulResult(result, 'reviewed xcode-select probe');
  const selection = darwinDeveloperSelection(result.stdout);
  if (realpathSync(selection.developerDirectory) !== selection.developerDirectory) {
    fail('reviewed xcode-select developer directory is not canonical');
  }
  return inspectDarwinDeveloperTree(selection.developerDirectory);
}

function gitSourceAuthorityProfile(
  kind: ReviewedGitSourceAuthorityProfile['kind'],
): ReviewedGitSourceAuthorityProfile {
  return Object.freeze({
    schema: REVIEWED_GIT_SOURCE_AUTHORITY_PROFILE_SCHEMA,
    kind,
  });
}

function acquireGit(
  runtimeRoot: string,
  nodeRuntime: ReviewedNodeRuntime,
  sourceGitExecutable: string | undefined,
): {
  readonly executable: string;
  readonly authority: ReviewedExecutableAuthority;
  readonly acquisition: ReviewedExecutableAcquisition | null;
  readonly sourceAuthorityProfile: ReviewedGitSourceAuthorityProfile;
} {
  const defaultDarwinGit = process.platform === 'darwin'
    ? sourceGitExecutable === undefined
      ? resolveDarwinDefaultGitExecutable(runtimeRoot, nodeRuntime)
      : null
    : null;
  const defaultGitExecutable = process.platform === 'darwin'
    ? defaultDarwinGit?.gitExecutable ?? null
    : SYSTEM_GIT_EXECUTABLE;
  const requested = sourceGitExecutable ?? defaultGitExecutable!;
  const sourceAuthorityProfile = gitSourceAuthorityProfile(
    sourceGitExecutable !== undefined
      ? 'explicit_caller_selected_git_bytes'
      : process.platform === 'darwin'
        ? 'darwin_selected_developer_tree_git_bytes'
        : 'linux_protected_system_git',
  );
  const canonical = realpathSync(requested);
  const darwinIdentity = process.platform === 'darwin'
    ? inspectNonShimDarwinGitCandidate(
        canonical,
        sourceGitExecutable === undefined,
      )
    : null;
  if (
    defaultDarwinGit !== null &&
    darwinIdentity !== null &&
    (
      defaultDarwinGit.gitIdentity.device !== darwinIdentity.device ||
      defaultDarwinGit.gitIdentity.inode !== darwinIdentity.inode ||
      defaultDarwinGit.gitIdentity.size !== darwinIdentity.size ||
      defaultDarwinGit.gitIdentity.sha256 !== darwinIdentity.sha256
    )
  ) {
    fail('selected macOS developer Git changed after Developer-tree review');
  }
  if (
    process.platform !== 'darwin' &&
    sourceGitExecutable === undefined &&
    defaultGitExecutable !== null &&
    requested === defaultGitExecutable &&
    canonical === defaultGitExecutable
  ) {
    const authority = inspectReviewedExecutableAuthority(
      defaultGitExecutable,
      'reviewed system Git executable',
    );
    return Object.freeze({
      executable: defaultGitExecutable,
      authority,
      acquisition: null,
      sourceAuthorityProfile,
    });
  }
  const gitRuntime = path.join(runtimeRoot, 'git');
  mkdirSync(gitRuntime, { mode: 0o700 });
  mkdirSync(path.join(gitRuntime, 'bin'), { mode: 0o700 });
  const acquisition = acquireReviewedExecutableIntoPrivateRoot(
    canonical,
    gitRuntime,
    path.join('bin', 'git'),
  );
  if (
    darwinIdentity !== null &&
    (acquisition.executable.sourceSha256 !== darwinIdentity.sha256 ||
      acquisition.executable.size !== darwinIdentity.size)
  ) {
    fail('macOS Git candidate changed between shim review and acquisition');
  }
  return Object.freeze({
    executable: acquisition.authority.executable,
    authority: acquisition.authority,
    acquisition,
    sourceAuthorityProfile,
  });
}

export function createReviewedGitRuntime(
  protectedParentPath: string,
  options: ReviewedGitRuntimeOptions = {},
): ReviewedGitRuntime {
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    fail('runtime acquisition is implemented only on macOS/Linux');
  }
  const optionSnapshot = ownDataRecord(
    options,
    'reviewed Git runtime options',
    [],
    ['sourceGitExecutable', 'sourceNodeCandidates'],
  );
  const sourceNodeCandidates = optionSnapshot.sourceNodeCandidates === undefined
    ? undefined
    : stringArray(
        optionSnapshot.sourceNodeCandidates,
        'reviewed Git Node candidates',
        32,
      );
  const sourceGitExecutable = optionSnapshot.sourceGitExecutable;
  if (
    sourceGitExecutable !== undefined &&
    (typeof sourceGitExecutable !== 'string' ||
      !path.isAbsolute(sourceGitExecutable) ||
      path.resolve(sourceGitExecutable) !== sourceGitExecutable ||
      sourceGitExecutable.includes('\0'))
  ) {
    fail(
      'reviewed Git source executable candidate must be an absolute normalized pathname',
    );
  }
  if (
    typeof protectedParentPath !== 'string' ||
    !path.isAbsolute(protectedParentPath) ||
    path.resolve(protectedParentPath) !== protectedParentPath ||
    protectedParentPath.includes('\0')
  ) {
    fail('reviewed Git runtime parent must be an absolute normalized pathname');
  }
  const protectedParent = realpathSync(protectedParentPath);
  requireProtectedDirectoryEntryChain(
    protectedParent,
    'reviewed Git runtime parent authority',
  );
  const runtimeRoot = realpathSync(mkdtempSync(
    path.join(protectedParent, REVIEWED_GIT_RUNTIME_PREFIX),
  ));
  chmodSync(runtimeRoot, 0o700);
  try {
    requireExactPrivateDirectoryAuthority(
      runtimeRoot,
      'reviewed Git runtime root authority',
    );
    const nodeRuntime = createReviewedNodeRuntime(runtimeRoot, {
      ...(sourceNodeCandidates === undefined ? {} : { sourceNodeCandidates }),
    });
    const git = acquireGit(runtimeRoot, nodeRuntime, sourceGitExecutable);
    const versionProbe = runReviewedPosixCommand(
      nodeRuntime.node.authority.executable,
      git.executable,
      ['--version'],
      runtimeRoot,
      {
        controlRuntimeAuthority: nodeRuntime.node.authority,
        environment: {
          LANG: 'C',
          LC_ALL: 'C',
          PATH: '/usr/bin:/bin',
          TZ: 'UTC',
        },
        outputLimitBytes: MAX_GIT_VERSION_BYTES,
        targetAuthority: git.authority,
        timeoutMs: 10_000,
      },
    );
    exactSuccessfulResult(versionProbe, 'reviewed Git version probe');
    const gitVersion = decodeUtf8(versionProbe.stdout, 'reviewed Git version probe').trim();
    if (!GIT_VERSION.test(gitVersion)) {
      fail('reviewed Git version probe returned an invalid identity');
    }
    const runtime = deepFreeze({
      schema: REVIEWED_GIT_RUNTIME_SCHEMA,
      runtimeRoot,
      sourceNodeExecutable: nodeRuntime.sourceNodeExecutable,
      node: nodeRuntime.node,
      nodeVersion: nodeRuntime.nodeVersion,
      gitExecutable: git.executable,
      gitAuthority: git.authority,
      gitAcquisition: git.acquisition,
      gitSourceAuthorityProfile: git.sourceAuthorityProfile,
      gitVersion,
    } satisfies ReviewedGitRuntime);
    const stat = lstatSync(runtimeRoot, { bigint: true });
    OWNED_RUNTIMES.set(runtime, {
      device: stat.dev,
      inode: stat.ino,
      nodeRuntime,
      disposed: false,
    });
    return runtime;
  } catch (error) {
    rmSync(runtimeRoot, { recursive: true, force: true });
    throw error;
  }
}

function requireLiveRuntime(runtime: ReviewedGitRuntime): OwnedRuntimeIdentity {
  const identity = OWNED_RUNTIMES.get(runtime);
  if (identity === undefined || identity.disposed) {
    fail('runtime is foreign or already disposed');
  }
  const stat = lstatSync(runtime.runtimeRoot, { bigint: true });
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.dev !== identity.device ||
    stat.ino !== identity.inode ||
    stat.uid !== currentPosixUid() ||
    (stat.mode & 0o7777n) !== 0o700n ||
    realpathSync(runtime.runtimeRoot) !== runtime.runtimeRoot
  ) {
    fail('runtime root authority changed');
  }
  assertReviewedNodeRuntimeLive(identity.nodeRuntime);
  return identity;
}

function disposeReviewedGitRuntimeWith(
  runtime: ReviewedGitRuntime,
  remove: (runtimeRoot: string) => void,
): void {
  const identity = requireLiveRuntime(runtime);
  remove(runtime.runtimeRoot);
  // Disposal is a one-way boundary only after the exact-root remover returns
  // successfully. If removal throws, a later retry is admitted only when the
  // owned runtime-root authority still passes requireLiveRuntime; executable
  // contents are revalidated by the reviewed command boundary before execution.
  identity.disposed = true;
  if (processRuntime === runtime) processRuntime = null;
}

export function disposeReviewedGitRuntime(runtime: ReviewedGitRuntime): void {
  disposeReviewedGitRuntimeWith(runtime, (runtimeRoot) => {
    rmSync(runtimeRoot, { recursive: true, force: false });
  });
}

export const reviewedGitCommandTesting = Object.freeze({
  darwinGitExecutableFromXcodeSelectOutput: (stdout: Buffer): string =>
    darwinDeveloperSelection(stdout).gitExecutable,
  darwinGitShimExecutable: (): string => SYSTEM_GIT_EXECUTABLE,
  requireDistinctDarwinShimIdentity: (
    candidate: DarwinGitCandidateIdentity,
    shim: DarwinGitCandidateIdentity,
  ): void => requireDistinctDarwinShimIdentity(candidate, shim),
  requireDarwinDeveloperTreeFixture: (
    fixture: DarwinDeveloperTreeAuthorityFixture,
  ): string => requireDarwinDeveloperTreeFixture(fixture),
  darwinXcodeSelectExecutable: (): string => DARWIN_XCODE_SELECT_EXECUTABLE,
  darwinXcodeSelectEnvironment: (): Readonly<Record<string, string>> =>
    DARWIN_XCODE_SELECT_ENVIRONMENT,
  hostNodeCandidates: (): readonly string[] =>
    reviewedNodeRuntimeTesting.hostNodeCandidates(),
  maximumArgumentBytes: REVIEWED_POSIX_COMMAND_LIMITS.argumentBytes,
  maximumHostPathBytes: reviewedNodeRuntimeTesting.maximumHostPathBytes,
  maximumPathBytes: REVIEWED_POSIX_COMMAND_LIMITS.pathBytes,
  disposeWithRemove: (
    runtime: ReviewedGitRuntime,
    remove: (runtimeRoot: string) => void,
  ): void => disposeReviewedGitRuntimeWith(runtime, remove),
});

/**
 * Process-scoped fallback for direct library consumers and unit tests. The two
 * generators create an explicit runtime inside their private acquisition root
 * and dispose it before publication; this fallback is cleaned synchronously on
 * ordinary process exit and is not an execution receipt.
 */
export function processReviewedGitRuntime(): ReviewedGitRuntime {
  if (processRuntime !== null) {
    requireLiveRuntime(processRuntime);
    return processRuntime;
  }
  const parent = realpathSync(tmpdir());
  processRuntime = createReviewedGitRuntime(parent);
  process.once('exit', () => {
    if (processRuntime === null) return;
    try {
      disposeReviewedGitRuntime(processRuntime);
    } catch {
      // Exit cleanup is best effort; generators never rely on this fallback.
    }
  });
  return processRuntime;
}

export function runReviewedGitCommand(
  runtime: ReviewedGitRuntime,
  repository: string,
  args: readonly string[],
  options: ReviewedGitCommandOptions,
): ReviewedPosixCommandResult {
  if (
    typeof repository !== 'string' ||
    repository.length === 0 ||
    repository.length > REVIEWED_POSIX_COMMAND_LIMITS.pathBytes
  ) {
    fail('reviewed Git repository must be an absolute normalized pathname within its byte bound');
  }
  if (
    repository.includes('\0') ||
    Buffer.byteLength(repository, 'utf8') > REVIEWED_POSIX_COMMAND_LIMITS.pathBytes ||
    !path.isAbsolute(repository) ||
    path.resolve(repository) !== repository
  ) {
    fail('reviewed Git repository must be an absolute normalized pathname within its byte bound');
  }
  const argumentSnapshot = stringArray(args, 'reviewed Git arguments');
  if (argumentSnapshot.length > REVIEWED_POSIX_COMMAND_LIMITS.arguments) {
    fail('reviewed Git arguments exceed their count or byte bound');
  }
  for (const argument of argumentSnapshot) {
    if (
      argument.length > REVIEWED_POSIX_COMMAND_LIMITS.argumentBytes ||
      argument.includes('\0')
    ) {
      fail('reviewed Git arguments exceed their count or byte bound');
    }
    if (Buffer.byteLength(argument, 'utf8') > REVIEWED_POSIX_COMMAND_LIMITS.argumentBytes) {
      fail('reviewed Git arguments exceed their count or byte bound');
    }
  }
  const optionSnapshot = ownDataRecord(
    options,
    'reviewed Git command options',
    ['environment', 'outputLimitBytes', 'timeoutMs'],
    ['acceptedStatuses', 'requireEmptyStderr', 'stdin'],
  );
  const environment = closedGitEnvironment(optionSnapshot.environment);
  const timeoutMs = optionSnapshot.timeoutMs;
  const outputLimitBytes = optionSnapshot.outputLimitBytes;
  if (
    typeof timeoutMs !== 'number' ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs ||
    typeof outputLimitBytes !== 'number' ||
    !Number.isSafeInteger(outputLimitBytes) ||
    outputLimitBytes < 1 ||
    outputLimitBytes > REVIEWED_POSIX_COMMAND_LIMITS.outputBytes
  ) {
    fail('reviewed Git timeout or output bound is invalid');
  }
  const suppliedStdin = optionSnapshot.stdin;
  const stdin = suppliedStdin === undefined
    ? undefined
    : snapshotReviewedStdin(suppliedStdin);
  const requireEmptyStderr = optionSnapshot.requireEmptyStderr ?? true;
  if (typeof requireEmptyStderr !== 'boolean') {
    fail('reviewed Git stderr policy must be boolean');
  }
  const acceptedStatusValues = optionSnapshot.acceptedStatuses === undefined
    ? Object.freeze([0])
    : ownDataArray(
        optionSnapshot.acceptedStatuses,
        'reviewed Git accepted statuses',
        256,
      );
  if (acceptedStatusValues.some((status) => typeof status !== 'number')) {
    fail('reviewed Git accepted statuses contain a non-number');
  }
  const acceptedStatuses = acceptedStatusValues as readonly number[];
  requireLiveRuntime(runtime);
  if (
    acceptedStatuses.length === 0 ||
    new Set(acceptedStatuses).size !== acceptedStatuses.length ||
    acceptedStatuses.some((status) =>
      !Number.isSafeInteger(status) || status < 0 || status > 255)
  ) {
    fail('accepted Git status set is invalid');
  }
  const homeBefore = inspectReviewedGitHome(environment.HOME!);
  let execution:
    | { readonly ok: true; readonly result: ReviewedPosixCommandResult }
    | { readonly ok: false; readonly error: unknown };
  try {
    execution = {
      ok: true,
      result: runReviewedPosixCommand(
        runtime.node.authority.executable,
        runtime.gitExecutable,
        argumentSnapshot,
        repository,
        {
          controlRuntimeAuthority: runtime.node.authority,
          environment,
          stdin,
          outputLimitBytes,
          targetAuthority: runtime.gitAuthority,
          timeoutMs,
        },
      ),
    };
  } catch (error) {
    execution = { ok: false, error };
  }
  // Credential/config authority is checked even when process execution or its
  // guardian protocol fails. A post-command HOME failure takes precedence: the
  // command may already have observed authority outside the reviewed envelope.
  const homeAfter = inspectReviewedGitHome(environment.HOME!);
  if (!sameReviewedGitHomeAuthority(homeBefore, homeAfter)) {
    fail('reviewed Git HOME authority changed during command execution');
  }
  if (!execution.ok) throw execution.error;
  const { result } = execution;
  if (
    result.signal !== null ||
    result.status === null ||
    !acceptedStatuses.includes(result.status) ||
    result.timedOut ||
    result.outputOverflow ||
    result.guardianSweepIntentCount !== 1
  ) {
    const diagnostic = safeDiagnostic(result.stderr);
    fail(
      `Git command failed (status ${String(result.status)}, signal ` +
      `${String(result.signal)}, timeout ${String(result.timedOut)}, overflow ` +
      `${String(result.outputOverflow)})${diagnostic ? `: ${diagnostic}` : ''}`,
    );
  }
  if (requireEmptyStderr && result.stderr.byteLength !== 0) {
    const diagnostic = safeDiagnostic(result.stderr);
    fail(`Git command wrote stderr${diagnostic ? `: ${diagnostic}` : ''}`);
  }
  return result;
}

/**
 * Read every requested object through one ordered binary batch and independently
 * recompute its canonical Git SHA-1 from `type + size + bytes`. This prevents a
 * loose-object pathname or pack index from being mistaken for content identity.
 */
export function inspectReviewedGitObjectIntegrityBatch(
  runtime: ReviewedGitRuntime,
  repository: string,
  gitArgs: readonly string[],
  environment: NodeJS.ProcessEnv,
  requests: readonly ReviewedGitObjectIntegrityRequest[],
  options: {
    readonly timeoutMs: number;
    readonly outputLimitBytes: number;
  },
): readonly ReviewedGitObjectIntegrityRecord[] {
  const gitArgumentSnapshot = stringArray(
    gitArgs,
    'reviewed Git object-integrity batch arguments',
  );
  const exactBatchArguments = [
    '--no-replace-objects',
    ...REVIEWED_GIT_BATCH_CONFIG_ARGUMENTS,
    '-C',
    repository,
    'cat-file',
    '--batch',
  ];
  if (
    gitArgumentSnapshot.length !== exactBatchArguments.length ||
    gitArgumentSnapshot.some((argument, index) =>
      argument !== exactBatchArguments[index])
  ) {
    fail('reviewed Git object-integrity arguments are not the exact closed command');
  }
  const requestValues = ownDataArray(
    requests,
    'reviewed Git object-integrity requests',
    MAX_GIT_BATCH_REQUESTS,
  );
  const optionSnapshot = ownDataRecord(
    options,
    'reviewed Git object-integrity options',
    ['outputLimitBytes', 'timeoutMs'],
  );
  if (requestValues.length === 0) {
    fail('Git object-integrity request count is outside its bound');
  }
  const outputLimitBytes = optionSnapshot.outputLimitBytes;
  const timeoutMs = optionSnapshot.timeoutMs;
  if (
    typeof outputLimitBytes !== 'number' ||
    !Number.isSafeInteger(outputLimitBytes) ||
    outputLimitBytes < 1 ||
    outputLimitBytes > MAX_GIT_BATCH_OBJECT_BYTES ||
    outputLimitBytes > REVIEWED_POSIX_COMMAND_LIMITS.outputBytes ||
    typeof timeoutMs !== 'number' ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs
  ) {
    fail('Git object-integrity timeout/output limit is outside its bound');
  }

  const requestSnapshots: ReviewedGitObjectIntegrityRequest[] = [];
  const seenNames = new Set<string>();
  const seenIdentities = new Set<string>();
  let requestInputBytes = 0;
  for (const [index, requestValue] of requestValues.entries()) {
    const request = ownDataRecord(
      requestValue,
      `reviewed Git object-integrity request ${index}`,
      ['expectedGitObjectSha1', 'expectedObjectType', 'objectName'],
    );
    if (
      typeof request.objectName !== 'string' ||
      typeof request.expectedGitObjectSha1 !== 'string' ||
      typeof request.expectedObjectType !== 'string' ||
      request.objectName.length !== 40 ||
      request.expectedGitObjectSha1.length !== 40
    ) {
      fail(`Git object-integrity request ${index} is invalid`);
    }
    if (
      request.objectName !== request.expectedGitObjectSha1 ||
      !SHA1.test(request.objectName) ||
      !['blob', 'commit', 'tag', 'tree'].includes(request.expectedObjectType)
    ) {
      fail(`Git object-integrity request ${index} is invalid`);
    }
    if (
      seenNames.has(request.objectName) ||
      seenIdentities.has(request.expectedGitObjectSha1)
    ) {
      fail('Git object-integrity requests must be deduplicated by name and identity');
    }
    seenNames.add(request.objectName);
    seenIdentities.add(request.expectedGitObjectSha1);
    requestInputBytes += Buffer.byteLength(request.objectName, 'utf8') + 1;
    if (requestInputBytes > REVIEWED_POSIX_COMMAND_LIMITS.stdinBytes) {
      fail('Git object-integrity request bytes exceed the reviewed stdin bound');
    }
    requestSnapshots.push(Object.freeze({
      objectName: request.objectName,
      expectedGitObjectSha1: request.expectedGitObjectSha1,
      expectedObjectType:
        request.expectedObjectType as ReviewedGitObjectIntegrityRequest['expectedObjectType'],
    }));
  }

  const stdin = Buffer.from(
    `${requestSnapshots.map(({ objectName }) => objectName).join('\n')}\n`,
    'ascii',
  );
  if (stdin.byteLength !== requestInputBytes) {
    fail('Git object-integrity request byte accounting drifted');
  }
  const result = runReviewedGitCommand(runtime, repository, gitArgumentSnapshot, {
    environment,
    stdin,
    timeoutMs,
    outputLimitBytes,
  });
  const records: ReviewedGitObjectIntegrityRecord[] = [];
  let offset = 0;
  for (const request of requestSnapshots) {
    const headerEnd = result.stdout.indexOf(0x0a, offset);
    if (headerEnd < 0) fail('Git object-integrity output has an unterminated header');
    const header = decodeUtf8(
      result.stdout.subarray(offset, headerEnd),
      'reviewed Git object-integrity header',
    );
    const match = /^([0-9a-f]{40}) (blob|commit|tag|tree) ([0-9]+)$/u.exec(header);
    if (
      match === null ||
      match[1] !== request.expectedGitObjectSha1 ||
      match[2] !== request.expectedObjectType
    ) {
      fail(`Git object-integrity output does not bind ${request.objectName}`);
    }
    const byteLength = Number(match[3]);
    const contentStart = headerEnd + 1;
    if (
      !Number.isSafeInteger(byteLength) ||
      byteLength < 0 ||
      byteLength > result.stdout.byteLength - contentStart - 1
    ) {
      fail(`Git object-integrity output has an invalid byte length for ${request.objectName}`);
    }
    const contentEnd = contentStart + byteLength;
    if (result.stdout[contentEnd] !== 0x0a) {
      fail(`Git object-integrity output is truncated for ${request.objectName}`);
    }
    const bytes = result.stdout.subarray(contentStart, contentEnd);
    const canonicalIdentity = createHash('sha1')
      .update(Buffer.from(`${request.expectedObjectType} ${byteLength}\0`, 'ascii'))
      .update(bytes)
      .digest('hex');
    if (canonicalIdentity !== request.expectedGitObjectSha1) {
      fail(
        `Git object ${request.objectName} bytes do not reproduce their canonical SHA-1`,
      );
    }
    records.push(Object.freeze({
      objectName: request.objectName,
      gitObjectSha1: canonicalIdentity,
      objectType: request.expectedObjectType,
      byteLength,
      sha256: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    }));
    offset = contentEnd + 1;
  }
  if (offset !== result.stdout.byteLength) {
    fail('Git object-integrity output contains trailing unreviewed bytes');
  }
  return Object.freeze(records);
}

export function readReviewedGitBlobBatch(
  runtime: ReviewedGitRuntime,
  repository: string,
  gitArgs: readonly string[],
  environment: NodeJS.ProcessEnv,
  requests: readonly ReviewedGitBlobRequest[],
  options: {
    readonly timeoutMs: number;
    readonly outputLimitBytes: number;
  },
): readonly ReviewedGitBlobRecord[] {
  const gitArgumentSnapshot = stringArray(gitArgs, 'reviewed Git batch arguments');
  const exactBatchArguments = [
    '--no-replace-objects',
    ...REVIEWED_GIT_BATCH_CONFIG_ARGUMENTS,
    '-C',
    repository,
    'cat-file',
    '--batch',
  ];
  if (
    gitArgumentSnapshot.length !== exactBatchArguments.length ||
    gitArgumentSnapshot.some((argument, index) =>
      argument !== exactBatchArguments[index])
  ) {
    fail('reviewed Git blob batch arguments are not the exact closed command');
  }
  const requestValues = ownDataArray(
    requests,
    'reviewed Git blob batch requests',
    MAX_GIT_BATCH_REQUESTS,
  );
  const optionSnapshot = ownDataRecord(
    options,
    'reviewed Git blob batch options',
    ['outputLimitBytes', 'timeoutMs'],
  );
  if (requestValues.length === 0 || requestValues.length > MAX_GIT_BATCH_REQUESTS) {
    fail('Git blob batch request count is outside its bound');
  }
  const outputLimitBytes = optionSnapshot.outputLimitBytes;
  const timeoutMs = optionSnapshot.timeoutMs;
  if (
    typeof outputLimitBytes !== 'number' ||
    !Number.isSafeInteger(outputLimitBytes) ||
    outputLimitBytes < 1 ||
    outputLimitBytes > MAX_GIT_BATCH_OBJECT_BYTES ||
    outputLimitBytes > REVIEWED_POSIX_COMMAND_LIMITS.outputBytes ||
    typeof timeoutMs !== 'number' ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs
  ) {
    fail('Git blob batch timeout/output limit is outside its bound');
  }
  const seenNames = new Set<string>();
  const seenIdentities = new Set<string>();
  const requestSnapshots: ReviewedGitBlobRequest[] = [];
  let requestInputBytes = 0;
  for (const [index, requestValue] of requestValues.entries()) {
    const request = ownDataRecord(
      requestValue,
      `reviewed Git blob batch request ${index}`,
      ['expectedGitBlobSha1', 'objectName'],
    );
    if (
      typeof request.objectName !== 'string' ||
      typeof request.expectedGitBlobSha1 !== 'string' ||
      request.objectName.length === 0 ||
      request.objectName.length > 4_096 ||
      request.expectedGitBlobSha1.length !== 40
    ) {
      fail(`Git blob batch request ${index} is invalid`);
    }
    if (
      request.objectName.includes('\0') ||
      request.objectName.includes('\n') ||
      request.objectName.includes('\r') ||
      Buffer.byteLength(request.objectName, 'utf8') > 4_096 ||
      !SHA1.test(request.expectedGitBlobSha1)
    ) {
      fail(`Git blob batch request ${index} is invalid`);
    }
    if (seenNames.has(request.objectName) || seenIdentities.has(request.expectedGitBlobSha1)) {
      fail('Git blob batch requests must be deduplicated by name and identity');
    }
    seenNames.add(request.objectName);
    seenIdentities.add(request.expectedGitBlobSha1);
    requestInputBytes += Buffer.byteLength(request.objectName, 'utf8') + 1;
    if (requestInputBytes > REVIEWED_POSIX_COMMAND_LIMITS.stdinBytes) {
      fail('Git blob batch request bytes exceed the reviewed stdin bound');
    }
    requestSnapshots.push(Object.freeze({
      objectName: request.objectName,
      expectedGitBlobSha1: request.expectedGitBlobSha1,
    }));
  }
  const stdin = Buffer.from(
    `${requestSnapshots.map(({ objectName }) => objectName).join('\n')}\n`,
    'utf8',
  );
  if (stdin.byteLength !== requestInputBytes) {
    fail('Git blob batch request byte accounting drifted');
  }
  const result = runReviewedGitCommand(runtime, repository, gitArgumentSnapshot, {
    environment,
    stdin,
    timeoutMs,
    outputLimitBytes,
  });
  const records: ReviewedGitBlobRecord[] = [];
  let offset = 0;
  for (const request of requestSnapshots) {
    const headerEnd = result.stdout.indexOf(0x0a, offset);
    if (headerEnd < 0) fail('Git blob batch output has an unterminated header');
    const header = decodeUtf8(
      result.stdout.subarray(offset, headerEnd),
      'Git blob batch header',
    );
    const match = /^([0-9a-f]{40}) blob ([0-9]+)$/u.exec(header);
    if (match === null || match[1] !== request.expectedGitBlobSha1) {
      fail(`Git blob batch output does not bind ${request.objectName}`);
    }
    const byteLength = Number(match[2]);
    if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
      fail(`Git blob batch output has an invalid byte length for ${request.objectName}`);
    }
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + byteLength;
    if (contentEnd >= result.stdout.byteLength || result.stdout[contentEnd] !== 0x0a) {
      fail(`Git blob batch output is truncated for ${request.objectName}`);
    }
    const bytes = Buffer.from(result.stdout.subarray(contentStart, contentEnd));
    const gitIdentity = createHash('sha1')
      .update(Buffer.from(`blob ${byteLength}\0`, 'utf8'))
      .update(bytes)
      .digest('hex');
    if (gitIdentity !== request.expectedGitBlobSha1) {
      fail(`Git blob batch bytes do not hash to ${request.objectName}`);
    }
    const privateBytes = Buffer.from(bytes);
    records.push(deepFreeze({
      schema: REVIEWED_GIT_BATCH_SCHEMA,
      objectName: request.objectName,
      gitBlobSha1: gitIdentity,
      byteLength,
      sha256: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
      copyBytes: () => Buffer.from(privateBytes),
    }));
    offset = contentEnd + 1;
  }
  if (offset !== result.stdout.byteLength) {
    fail('Git blob batch output contains trailing unreviewed bytes');
  }
  return Object.freeze(records);
}
