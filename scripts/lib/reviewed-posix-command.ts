/**
 * Binary-safe, synchronous host boundary for the reviewed POSIX guardian.
 *
 * One exact reviewed Node executable runs the control plane; an independently
 * sealed canonical executable is the gated target. The outer caller never
 * receives or addresses a PID/PGID. Only the still-live guardian sends the one
 * self-addressed group SIGKILL, before its parent can reap it. After guardian
 * exit, the supervisor only drains already-open pipes and validates the receipt.
 * A still-live exact launcher additionally waits for real EOF on a dedicated
 * guardian-only endpoint before publishing the buffered supervisor protocol.
 *
 * Input and output use unlinked descriptor-backed spools. Target stdin is passed
 * through supervisor, guardian, and worker descriptor slots without becoming a
 * control-plane stdin stream before GO. Target stdout/stderr are bounded and
 * hashed by the supervisor without an environment/base64 size expansion.
 *
 * This establishes exact executable pathname bytes/metadata/ancestry before and
 * after the command. It is not hostile same-UID mutation containment and does not
 * close dynamic-library/runtime dependencies. A target that deliberately
 * re-groups or detaches can escape this process-group lifecycle and requires an
 * external sandbox/cgroup (or a Windows Job Object on an unimplemented port).
 *
 * Caller-owned records are projected onto their registered enumerable own
 * string-keyed data fields without materializing their complete own-key sets.
 * Unknown enumerable string keys fail closed under a field-count bound. Symbols
 * and unrelated non-enumerable properties are inert metadata: they are neither
 * inspected nor copied, so their accessors cannot run. A non-enumerable or
 * accessor property whose string key is registered as semantic input is not
 * inert and is rejected; inherited enumerable strings also fail closed. Arrays
 * apply the same rule to `length` and the exact dense indices `[0, length)`;
 * arbitrary environments have their own key, entry, and aggregate payload
 * bounds.
 */
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  accessSync,
  closeSync,
  constants as fsConstants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeSync,
  type BigIntStats,
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { TextDecoder, types as utilTypes } from 'node:util';

import { canonicalize, type JsonValue } from '../../src/core/canonicalize.js';
import {
  parseJsonStrict,
  type JsonParseLimits,
} from '../../src/core/parse-json.js';
import {
  REVIEWED_POSIX_COMMAND_HANDSHAKE_SCHEMA,
  REVIEWED_POSIX_COMMAND_RESULT_SCHEMA,
  REVIEWED_POSIX_COMMAND_TEST_HOOK_SCHEMA,
  REVIEWED_POSIX_GUARDIAN_PAYLOAD_ENV,
  REVIEWED_POSIX_OUTER_LAUNCHER_SOURCE,
  REVIEWED_POSIX_SUPERVISOR_GRACE_MS,
  REVIEWED_POSIX_SUPERVISOR_PAYLOAD_ENV,
  REVIEWED_POSIX_TEST_HOOK_ENV,
  REVIEWED_POSIX_WORKER_PAYLOAD_ENV,
} from './reviewed-posix-supervisor.js';
import {
  currentPosixUid,
  requireExactPrivateDirectoryAuthority,
  requireReviewedPosixAclAuthority,
  requireProtectedDirectoryEntryChain,
} from './posix-acl-authority.js';

const EXECUTABLE_ANCESTRY_HASH_DOMAIN =
  'cortexel-reviewed-posix-path-ancestry-v1\0';
const EMPTY_SHA256 =
  'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const MAX_EXECUTABLE_BYTES = 512 * 1024 * 1024;
const MAX_ACQUIRED_RUNTIME_FILES = 32;
const MAX_ACQUIRED_RUNTIME_BYTES = 512 * 1024 * 1024;
const MAX_PATH_BYTES = 4_096;
const MAX_ANCESTRY_DEPTH = 64;
const MAX_ARGUMENTS = 1_024;
const MAX_ARGUMENT_BYTES = 128 * 1024;
const MAX_ENVIRONMENT_ENTRIES = 1_024;
const MAX_ENVIRONMENT_KEY_BYTES = 4_096;
const MAX_PAYLOAD_BYTES = 256 * 1024;
// Large enough for the reviewed offline Git batch/hash request surfaces while
// remaining an explicit copied-input memory and spool bound.
const MAX_STDIN_BYTES = 32 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const MAX_TIMEOUT_MS = 15 * 60_000;
const MAX_PROTOCOL_BYTES = 64 * 1024;
const HASH_CHUNK_BYTES = 1024 * 1024;
/**
 * Private control receipts have their own closed parser authority. Depending on
 * the generated public FigureRequest budget registry here would make a zero-state
 * contract generator require output that it has not generated yet.
 *
 * The byte ceiling dominates these shape limits; the additional ceilings ensure
 * malformed but byte-bounded control records still fail with bounded work.
 */
const REVIEWED_POSIX_PROTOCOL_JSON_LIMITS = Object.freeze({
  rawInputBytes: MAX_PROTOCOL_BYTES,
  jsonDepth: 32,
  jsonTotalNodes: 32_768,
  jsonStringLength: MAX_PROTOCOL_BYTES,
  jsonNumberTokenLength: 64,
  jsonObjectKeys: 4_096,
  jsonArrayItems: 4_096,
}) satisfies JsonParseLimits;
const EXPECTED_REGULAR_OPEN_FLAGS =
  fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;
const EXPECTED_DIRECTORY_OPEN_FLAGS =
  EXPECTED_REGULAR_OPEN_FLAGS | fsConstants.O_DIRECTORY;

function reviewedPosixOuterTimeoutMs(timeoutMs: unknown): number {
  if (
    typeof timeoutMs !== 'number' ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > MAX_TIMEOUT_MS
  ) {
    fail('reviewed POSIX command timeout is outside its bound');
  }
  return timeoutMs + REVIEWED_POSIX_SUPERVISOR_GRACE_MS;
}

export const REVIEWED_EXECUTABLE_ACQUISITION_SCHEMA =
  'cortexel-reviewed-executable-acquisition.v1' as const;

export const REVIEWED_POSIX_COMMAND_LIMITS = Object.freeze({
  argumentBytes: MAX_ARGUMENT_BYTES,
  arguments: MAX_ARGUMENTS,
  environmentEntries: MAX_ENVIRONMENT_ENTRIES,
  environmentKeyBytes: MAX_ENVIRONMENT_KEY_BYTES,
  executableBytes: MAX_EXECUTABLE_BYTES,
  pathBytes: MAX_PATH_BYTES,
  runtimeBytes: MAX_ACQUIRED_RUNTIME_BYTES,
  runtimeFiles: MAX_ACQUIRED_RUNTIME_FILES,
  outputBytes: MAX_OUTPUT_BYTES,
  payloadBytes: MAX_PAYLOAD_BYTES,
  stdinBytes: MAX_STDIN_BYTES,
  timeoutMs: MAX_TIMEOUT_MS,
});

export interface ReviewedExecutableFileAuthority {
  readonly path: string;
  readonly sha256: string;
  readonly size: number;
  readonly mode: number;
  readonly uid: number;
  readonly gid: number;
  readonly linkCount: number;
  readonly device: string;
  readonly inode: string;
  readonly mtimeNs: string;
  readonly ctimeNs: string;
  readonly birthtimeNs: string;
}

export interface ReviewedExecutablePathAncestry {
  readonly sha256: string;
  readonly entryCount: number;
}

export interface ReviewedExecutableAuthority {
  readonly executable: string;
  readonly file: ReviewedExecutableFileAuthority;
  readonly ancestry: ReviewedExecutablePathAncestry;
}

export interface ReviewedRuntimeCompanionInput {
  readonly sourcePath: string;
  readonly stagedRelativePath: string;
}

export interface ReviewedExecutableAcquisitionOptions {
  readonly companions?: readonly ReviewedRuntimeCompanionInput[];
  /** Synchronous regression-only rendezvous; never used by production callers. */
  readonly trustedTestHook?: (event:
    | {
        readonly phase: 'source-reviewed-before-open';
        readonly sourcePath: string;
        readonly stagedPath: string;
      }
    | {
        readonly phase: 'source-opened-before-copy';
        readonly sourceDescriptor: number;
        readonly sourcePath: string;
        readonly stagedPath: string;
      }) => void;
}

export interface ReviewedAcquiredRuntimeFile {
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly sourcePathAncestryProtected: boolean;
  readonly stagedPath: string;
  readonly stagedSha256: string;
  readonly size: number;
}

export interface ReviewedExecutableAcquisition {
  readonly schema: typeof REVIEWED_EXECUTABLE_ACQUISITION_SCHEMA;
  readonly runtimeRoot: string;
  readonly executable: ReviewedAcquiredRuntimeFile;
  readonly companions: readonly ReviewedAcquiredRuntimeFile[];
  readonly inventoryEntryCount: number;
  readonly inventorySha256: string;
  readonly authority: ReviewedExecutableAuthority;
}

export interface ReviewedPosixCommandResult {
  readonly guardianSweepIntentCount: 1;
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly timedOut: boolean;
  readonly outputOverflow: boolean;
}

export interface ReviewedPosixCommandTestHook {
  readonly phase:
    | 'worker-ready-before-handshake'
    | 'handshake-published-before-go'
    | 'go-sent'
    | 'guardian-swept-before-result';
  readonly readyPath: string;
}

export interface ReviewedPosixCommandOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly stdin?: Uint8Array;
  readonly timeoutMs?: number;
  /** Combined stdout plus stderr byte limit. */
  readonly outputLimitBytes?: number;
  /** Untrusted claimed capability: snapshotted, then re-derived from the filesystem. */
  readonly controlRuntimeAuthority?: ReviewedExecutableAuthority;
  /** Untrusted claimed capability: snapshotted, then re-derived from the filesystem. */
  readonly targetAuthority?: ReviewedExecutableAuthority;
  /** Host-controlled regression rendezvous; never copied into target input. */
  readonly trustedTestHook?: ReviewedPosixCommandTestHook;
}

interface UnlinkedSpool {
  readonly descriptor: number;
  readonly device: bigint;
  readonly inode: bigint;
  readonly mode: bigint;
  readonly uid: bigint;
  readonly gid: bigint;
}

interface OwnedPathIdentity {
  readonly device: bigint;
  readonly inode: bigint;
}

function fail(message: string): never {
  throw new Error(message);
}

function requireBoundedPrimitiveString(
  value: unknown,
  label: string,
  maximumBytes = MAX_PATH_BYTES,
): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maximumBytes ||
    value.includes('\0') ||
    Buffer.byteLength(value, 'utf8') > maximumBytes
  ) {
    fail(`${label} must be one bounded primitive string`);
  }
}

function throwPrimaryWithCleanup(
  primary: unknown,
  cleanupErrors: readonly Error[],
  label: string,
): never {
  if (cleanupErrors.length === 0) throw primary;
  throw new AggregateError(
    [primary, ...cleanupErrors],
    `${label} failed and cleanup authority is uncertain`,
    { cause: primary },
  );
}

function withOwnedDescriptorCleanup<T>(
  descriptors: number[],
  label: string,
  operation: () => T,
): T {
  let completed = false;
  let value: T | undefined;
  let primary: unknown;
  try {
    value = operation();
    completed = true;
  } catch (error) {
    primary = error;
  }
  const cleanupErrors: Error[] = [];
  for (const descriptor of [...descriptors].reverse()) {
    try {
      closeSync(descriptor);
    } catch (error) {
      cleanupErrors.push(new Error(
        `${label} descriptor close failed`,
        { cause: error },
      ));
    }
  }
  if (!completed) throwPrimaryWithCleanup(primary, cleanupErrors, label);
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, `${label} cleanup authority is uncertain`);
  }
  return value as T;
}

function unlinkOwnedPath(
  path: string,
  identity: OwnedPathIdentity | null,
  label: string,
): void {
  if (identity === null) {
    fail(`${label} identity was not established; pathname was retained`);
  }
  const observed = lstatSync(path, { bigint: true });
  if (observed.dev !== identity.device || observed.ino !== identity.inode) {
    fail(`${label} identity changed; foreign pathname was retained`);
  }
  unlinkSync(path);
}

function removeOwnedDirectory(
  path: string,
  identity: OwnedPathIdentity,
  label: string,
): void {
  const observed = lstatSync(path, { bigint: true });
  if (
    !observed.isDirectory() ||
    observed.isSymbolicLink() ||
    observed.dev !== identity.device ||
    observed.ino !== identity.inode
  ) {
    fail(`${label} identity changed; foreign directory was retained`);
  }
  rmdirSync(path);
}

function portableUnsigned(value: bigint, label: string, minimum = 0n): number {
  if (value < minimum || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail(`${label} is outside the portable integer domain`);
  }
  return Number(value);
}

function statIdentity(stat: BigIntStats): readonly bigint[] {
  return [
    stat.dev,
    stat.ino,
    stat.mode,
    stat.size,
    stat.nlink,
    stat.uid,
    stat.gid,
    stat.mtimeNs,
    stat.ctimeNs,
    stat.birthtimeNs,
  ];
}

function sameStat(left: BigIntStats, right: BigIntStats): boolean {
  const first = statIdentity(left);
  const second = statIdentity(right);
  return first.every((value, index) => value === second[index]);
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, JsonValue>,
  expected: readonly string[],
  label: string,
): void {
  if (canonicalize(Object.keys(value).sort()) !== canonicalize([...expected].sort())) {
    fail(`${label} has unexpected keys`);
  }
}

function snapshotOwnDataRecord(
  value: unknown,
  allowedKeys: readonly string[],
  label: string,
  requiredKeys: readonly string[] = [],
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object') {
    fail(`${label} must be one ordinary object`);
  }
  if (utilTypes.isProxy(value)) fail(`${label} must not be a Proxy`);
  if (Array.isArray(value)) fail(`${label} must be one ordinary object`);
  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(value);
  } catch {
    fail(`${label} cannot be inspected safely`);
  }
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    utilTypes.isModuleNamespaceObject(value)
  ) fail(`${label} must be one ordinary object`);

  const allowed = new Set(allowedKeys);
  const maximumKeyCodeUnits = allowedKeys.reduce(
    (maximum, key) => Math.max(maximum, key.length),
    0,
  );
  let enumerableProjectionCount = 0;
  // `for...in` is intentionally used as a lazy enumerable-string projection.
  // Reflect.ownKeys/Object.keys would first allocate an attacker-sized key list.
  for (const key in value as Record<string, unknown>) {
    enumerableProjectionCount += 1;
    if (enumerableProjectionCount > allowedKeys.length + 1) {
      fail(`${label} exceeds its enumerable field bound`);
    }
    if (key.length > maximumKeyCodeUnits) {
      fail(`${label} has unexpected or missing keys`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      fail(`${label}.${key} cannot be inspected safely`);
    }
    if (descriptor === undefined) fail(`${label} has unexpected or missing keys`);
    if (!allowed.has(key)) {
      fail(`${label} has unexpected or missing keys`);
    }
  }

  const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of allowedKeys) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      fail(`${label}.${key} cannot be inspected safely`);
    }
    if (descriptor === undefined) {
      if (requiredKeys.includes(key)) fail(`${label} has unexpected or missing keys`);
      continue;
    }
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      fail(`${label}.${key} must be an enumerable own data property`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function snapshotOwnDataArray(
  value: unknown,
  maximumLength: number,
  label: string,
): readonly unknown[] {
  if (value === null || typeof value !== 'object') {
    fail(`${label} must be one direct array`);
  }
  if (utilTypes.isProxy(value)) fail(`${label} must not be a Proxy`);
  if (!Array.isArray(value)) fail(`${label} must be one direct array`);
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
    fail(`${label} has invalid direct-array authority`);
  }
  const length = lengthDescriptor.value as number;
  const maximumIndexCodeUnits = Math.max(String(Math.max(length - 1, 0)).length, 1);
  let enumerableProjectionCount = 0;
  for (const key in value as unknown[]) {
    enumerableProjectionCount += 1;
    if (enumerableProjectionCount > length + 1) {
      fail(`${label} exceeds its enumerable field bound`);
    }
    if (key.length > maximumIndexCodeUnits) {
      fail(`${label} must be dense and contain no unexpected enumerable members`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      fail(`${label}.${key} cannot be inspected safely`);
    }
    if (descriptor === undefined) {
      fail(`${label} must be dense and contain no unexpected enumerable members`);
    }
    const index = Number(key);
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= length ||
      String(index) !== key
    ) {
      fail(`${label} must be dense and contain no unexpected enumerable members`);
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

function snapshotReviewedExecutableAuthority(
  value: unknown,
  label: string,
): ReviewedExecutableAuthority {
  const authority = snapshotOwnDataRecord(
    value,
    ['ancestry', 'executable', 'file'],
    label,
    ['ancestry', 'executable', 'file'],
  );
  const file = snapshotOwnDataRecord(
    authority.file,
    [
      'birthtimeNs',
      'ctimeNs',
      'device',
      'gid',
      'inode',
      'linkCount',
      'mode',
      'mtimeNs',
      'path',
      'sha256',
      'size',
      'uid',
    ],
    `${label}.file`,
    [
      'birthtimeNs',
      'ctimeNs',
      'device',
      'gid',
      'inode',
      'linkCount',
      'mode',
      'mtimeNs',
      'path',
      'sha256',
      'size',
      'uid',
    ],
  );
  const ancestry = snapshotOwnDataRecord(
    authority.ancestry,
    ['entryCount', 'sha256'],
    `${label}.ancestry`,
    ['entryCount', 'sha256'],
  );
  const stringFields = [
    authority.executable,
    file.birthtimeNs,
    file.ctimeNs,
    file.device,
    file.inode,
    file.mtimeNs,
    file.path,
    file.sha256,
    ancestry.sha256,
  ];
  const numberFields = [
    file.gid,
    file.linkCount,
    file.mode,
    file.size,
    file.uid,
    ancestry.entryCount,
  ];
  if (
    stringFields.some((entry) => typeof entry !== 'string') ||
    numberFields.some((entry) => typeof entry !== 'number')
  ) {
    fail(`${label} contains an invalid authority field type`);
  }
  for (const [index, entry] of stringFields.entries()) {
    requireBoundedPrimitiveString(
      entry,
      `${label} authority string ${index + 1}`,
      MAX_PATH_BYTES,
    );
  }
  return Object.freeze({
    executable: authority.executable,
    file: Object.freeze({ ...file }),
    ancestry: Object.freeze({ ...ancestry }),
  }) as unknown as ReviewedExecutableAuthority;
}

function decodeUtf8Fatal(raw: Buffer, label: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
  } catch {
    fail(`${label} is not well-formed UTF-8`);
  }
}

function parseCanonicalJson(raw: Buffer, label: string): JsonValue {
  if (raw.byteLength === 0 || raw.byteLength > MAX_PROTOCOL_BYTES) {
    fail(`${label} is outside its protocol byte bound`);
  }
  const text = decodeUtf8Fatal(raw, label);
  const parsed = parseJsonStrict(text, {
    limits: REVIEWED_POSIX_PROTOCOL_JSON_LIMITS,
  });
  if (!parsed.ok) {
    fail(`${label} is not strict JSON: ${parsed.errors[0]?.message ?? 'unknown error'}`);
  }
  if (text !== `${canonicalize(parsed.value)}\n`) fail(`${label} is not canonical JSON`);
  return parsed.value;
}

function exactJsonEqual(left: unknown, right: unknown): boolean {
  try {
    return canonicalize(left as JsonValue) === canonicalize(right as JsonValue);
  } catch {
    return false;
  }
}

function readAndHashDescriptor(
  descriptor: number,
  size: number,
  label: string,
): { readonly bytes: Buffer; readonly sha256: string } {
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_OUTPUT_BYTES) {
    fail(`${label} size is outside its reviewed bound`);
  }
  const bytes = Buffer.allocUnsafe(size);
  const digest = createHash('sha256');
  let offset = 0;
  while (offset < size) {
    const count = readSync(
      descriptor,
      bytes,
      offset,
      Math.min(HASH_CHUNK_BYTES, size - offset),
      offset,
    );
    if (count <= 0) fail(`${label} ended before its declared size`);
    digest.update(bytes.subarray(offset, offset + count));
    offset += count;
  }
  return {
    bytes,
    sha256: `sha256:${digest.digest('hex')}`,
  };
}

function hashDescriptor(
  descriptor: number,
  size: number,
  maximumBytes: number,
  label: string,
): string {
  if (!Number.isSafeInteger(size) || size < 0 || size > maximumBytes) {
    fail(`${label} size is outside its reviewed bound`);
  }
  const chunk = Buffer.allocUnsafe(Math.min(HASH_CHUNK_BYTES, Math.max(size, 1)));
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

function inspectExecutableFile(
  executable: string,
  label: string,
): ReviewedExecutableFileAuthority {
  if (
    executable.length > MAX_PATH_BYTES ||
    executable.includes('\0') ||
    !isAbsolute(executable) ||
    resolve(executable) !== executable ||
    Buffer.byteLength(executable, 'utf8') > MAX_PATH_BYTES
  ) {
    fail(`${label} must be one bounded normalized absolute path`);
  }
  // Do not require realpath(executable) === executable. On macOS, protected
  // system tool shims such as /usr/bin/git are multiply hard-linked and
  // realpath(3) can report another same-inode link name. Hardlink spelling is
  // not physical identity. The terminal lstat/no-symlink check below, the
  // separately sealed canonical directory ancestry, and repeated descriptor ↔
  // pathname dev/inode/metadata/digest agreement establish the authority that
  // execution actually needs without depending on an unstable alias name.
  const initial = lstatSync(executable, { bigint: true });
  if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink < 1n) {
    fail(`${label} must be a directly named regular file`);
  }
  const mode = initial.mode & 0o7777n;
  const uid = currentPosixUid();
  if (initial.uid !== 0n && initial.uid !== uid) {
    fail(`${label} is not owned by root or the current user`);
  }
  if ((mode & 0o7022n) !== 0n) {
    fail(`${label} must not carry special or group/world-write mode authority`);
  }
  if ((mode & 0o111n) === 0n) fail(`${label} is not executable`);
  accessSync(executable, fsConstants.X_OK);
  if (initial.size < 0n || initial.size > BigInt(MAX_EXECUTABLE_BYTES)) {
    fail(`${label} is outside its executable byte budget`);
  }
  const size = Number(initial.size);
  const descriptor = openSync(
    executable,
    EXPECTED_REGULAR_OPEN_FLAGS,
  );
  return withOwnedDescriptorCleanup([descriptor], label, () => {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || !sameStat(initial, opened)) {
      fail(`${label} changed before it could be hashed`);
    }
    requireReviewedPosixAclAuthority([
      { kind: 'path', label: `${label} path`, value: executable },
      { kind: 'descriptor', label: `${label} descriptor`, value: descriptor },
    ]);
    const afterAcl = fstatSync(descriptor, { bigint: true });
    const reboundAfterAcl = lstatSync(executable, { bigint: true });
    if (!sameStat(opened, afterAcl) || !sameStat(opened, reboundAfterAcl)) {
      fail(`${label} changed during ACL inspection`);
    }
    const sha256 = hashDescriptor(descriptor, size, MAX_EXECUTABLE_BYTES, label);
    const finalDescriptor = fstatSync(descriptor, { bigint: true });
    const rebound = lstatSync(executable, { bigint: true });
    if (!sameStat(opened, finalDescriptor) || !sameStat(opened, rebound)) {
      fail(`${label} changed while it was being hashed`);
    }
    return {
      path: executable,
      sha256,
      size,
      mode: Number(mode),
      uid: portableUnsigned(opened.uid, `${label} uid`),
      gid: portableUnsigned(opened.gid, `${label} gid`),
      linkCount: portableUnsigned(opened.nlink, `${label} link count`, 1n),
      device: opened.dev.toString(10),
      inode: opened.ino.toString(10),
      mtimeNs: opened.mtimeNs.toString(10),
      ctimeNs: opened.ctimeNs.toString(10),
      birthtimeNs: opened.birthtimeNs.toString(10),
    };
  });
}

function inspectExecutableAncestry(
  executable: string,
  label: string,
): ReviewedExecutablePathAncestry {
  requireProtectedDirectoryEntryChain(dirname(executable), `${label} ancestry`);
  const components: string[] = [];
  let cursor = dirname(executable);
  while (true) {
    components.push(cursor);
    if (components.length > MAX_ANCESTRY_DEPTH) {
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
    const stat = lstatSync(component, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fail(`${label} ancestry contains a non-directory component`);
    }
    return {
      path: component,
      device: stat.dev.toString(10),
      inode: stat.ino.toString(10),
      mode: Number(stat.mode & 0o7777n),
      uid: portableUnsigned(stat.uid, `${label} ancestry uid`),
      gid: portableUnsigned(stat.gid, `${label} ancestry gid`),
    };
  });
  const records = inspect();
  if (!exactJsonEqual(records, inspect())) {
    fail(`${label} ancestry changed while it was sealed`);
  }
  return {
    sha256: `sha256:${createHash('sha256')
      .update(`${EXECUTABLE_ANCESTRY_HASH_DOMAIN}${canonicalize(records)}`)
      .digest('hex')}`,
    entryCount: records.length,
  };
}

export function inspectReviewedExecutableAuthority(
  executable: string,
  label = 'reviewed executable',
): ReviewedExecutableAuthority {
  requireBoundedPrimitiveString(executable, 'reviewed executable path');
  requireBoundedPrimitiveString(label, 'reviewed executable label');
  return {
    executable,
    file: inspectExecutableFile(executable, label),
    ancestry: inspectExecutableAncestry(executable, label),
  };
}

function reviewedStagedPath(
  runtimeRoot: string,
  relativePath: string,
  label: string,
): string {
  requireBoundedPrimitiveString(relativePath, `${label} relative path`);
  if (isAbsolute(relativePath)) {
    fail(`${label} relative path is invalid`);
  }
  const components = relativePath.split(sep);
  if (components.some((component) => component.length === 0 || component === '.' || component === '..')) {
    fail(`${label} relative path is not canonical`);
  }
  const stagedPath = join(runtimeRoot, ...components);
  requireBoundedPrimitiveString(stagedPath, `${label} staged path`);
  if (!isInside(runtimeRoot, stagedPath) || resolve(stagedPath) !== stagedPath) {
    fail(`${label} staged path escapes its runtime root`);
  }
  return stagedPath;
}

function sourceAncestryIsProtected(sourcePath: string, label: string): boolean {
  try {
    requireProtectedDirectoryEntryChain(dirname(sourcePath), label);
    return true;
  } catch {
    // Acquisition intentionally admits a source selected through an ancestry
    // another ordinary UID could rename. Its pathname is not provenance in that
    // case: only the path-bound open descriptor and copied digest are retained.
    return false;
  }
}

/**
 * Acquire exact runtime bytes into a protected private root before execution.
 *
 * The source pathname may traverse an unsafe ancestry (for example a
 * group-writable package-manager prefix). The source file itself must still be
 * root/current-owned, non-authorizing by mode and ACL, canonical, and stable
 * across a no-follow descriptor copy. When `sourcePathAncestryProtected` is
 * false, the recorded source path is only the observed acquisition name; it is
 * not protected pathname provenance. Only the copied bytes at the returned
 * staged authority are executable authority.
 *
 * Runtime companions are copied by the same descriptor protocol but are not
 * treated as a closed dynamic dependency inventory. Callers must preserve that
 * limitation explicitly.
 */
export function acquireReviewedExecutableIntoPrivateRoot(
  sourceExecutable: string,
  runtimeRoot: string,
  stagedExecutableRelativePath: string,
  options: ReviewedExecutableAcquisitionOptions = {},
): ReviewedExecutableAcquisition {
  requireBoundedPrimitiveString(sourceExecutable, 'reviewed source executable path');
  requireBoundedPrimitiveString(runtimeRoot, 'reviewed runtime root path');
  requireBoundedPrimitiveString(
    stagedExecutableRelativePath,
    'reviewed staged executable relative path',
  );
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    fail('reviewed executable acquisition is implemented only on macOS/Linux');
  }
  const optionSnapshot = snapshotOwnDataRecord(
    options,
    ['companions', 'trustedTestHook'],
    'reviewed executable acquisition options',
  );
  const trustedTestHook = optionSnapshot.trustedTestHook;
  if (
    trustedTestHook !== undefined &&
    (typeof trustedTestHook !== 'function' || utilTypes.isProxy(trustedTestHook))
  ) {
    fail('reviewed executable acquisition options are invalid');
  }
  const companionInputs = optionSnapshot.companions === undefined
    ? []
    : snapshotOwnDataArray(
        optionSnapshot.companions,
        MAX_ACQUIRED_RUNTIME_FILES - 1,
        'reviewed runtime companion inputs',
      ).map((value, index): ReviewedRuntimeCompanionInput => {
        const companion = snapshotOwnDataRecord(
          value,
          ['sourcePath', 'stagedRelativePath'],
          `reviewed runtime companion ${index + 1} input`,
          ['sourcePath', 'stagedRelativePath'],
        );
        if (
          typeof companion.sourcePath !== 'string' ||
          typeof companion.stagedRelativePath !== 'string'
        ) {
          fail(`reviewed runtime companion ${index + 1} input has invalid field types`);
        }
        requireBoundedPrimitiveString(
          companion.sourcePath,
          `reviewed runtime companion ${index + 1} source path`,
        );
        requireBoundedPrimitiveString(
          companion.stagedRelativePath,
          `reviewed runtime companion ${index + 1} staged relative path`,
        );
        return Object.freeze({
          sourcePath: companion.sourcePath,
          stagedRelativePath: companion.stagedRelativePath,
        });
      });
  const canonicalRoot = realpathSync(runtimeRoot);
  if (canonicalRoot !== runtimeRoot) fail('reviewed runtime root must be canonical');
  requireExactPrivateDirectoryAuthority(runtimeRoot, 'reviewed executable runtime root');
  const stagedExecutable = reviewedStagedPath(
    runtimeRoot,
    stagedExecutableRelativePath,
    'reviewed executable',
  );
  if (companionInputs.length > MAX_ACQUIRED_RUNTIME_FILES - 1) {
    fail('reviewed runtime acquisition has too many companions');
  }
  const requested = [
    {
      executable: true,
      sourcePath: sourceExecutable,
      stagedPath: stagedExecutable,
    },
    ...companionInputs.map((companion) => ({
      executable: false,
      sourcePath: companion.sourcePath,
      stagedPath: reviewedStagedPath(
        runtimeRoot,
        companion.stagedRelativePath,
        'reviewed runtime companion',
      ),
    })),
  ];
  if (requested.length > MAX_ACQUIRED_RUNTIME_FILES) {
    fail('reviewed runtime acquisition has too many files');
  }
  const destinations = new Set(requested.map(({ stagedPath }) => stagedPath));
  if (destinations.size !== requested.length) {
    fail('reviewed runtime acquisition has duplicate staged paths');
  }

  const uid = currentPosixUid();
  const createdPaths = new Map<string, OwnedPathIdentity | null>();
  const acquired: ReviewedAcquiredRuntimeFile[] = [];
  const stagedIdentities: BigIntStats[] = [];
  let acquiredRuntimeBytes = 0;
  try {
    for (const [index, item] of requested.entries()) {
      const label = index === 0 ? 'reviewed source executable' : `reviewed runtime companion ${index}`;
      if (
        item.sourcePath.length > MAX_PATH_BYTES ||
        item.sourcePath.includes('\0') ||
        !isAbsolute(item.sourcePath) ||
        resolve(item.sourcePath) !== item.sourcePath ||
        Buffer.byteLength(item.sourcePath, 'utf8') > MAX_PATH_BYTES ||
        realpathSync(item.sourcePath) !== item.sourcePath
      ) {
        fail(`${label} must be one canonical physical absolute path`);
      }
      const sourcePathAncestryProtected = sourceAncestryIsProtected(
        item.sourcePath,
        `${label} ancestry`,
      );
      const initial = lstatSync(item.sourcePath, { bigint: true });
      const sourceMode = initial.mode & 0o7777n;
      if (
        !initial.isFile() ||
        initial.isSymbolicLink() ||
        initial.nlink < 1n ||
        initial.uid !== 0n && initial.uid !== uid ||
        (sourceMode & 0o7022n) !== 0n ||
        item.executable && (sourceMode & 0o111n) === 0n ||
        initial.size < 0n ||
        initial.size > BigInt(MAX_EXECUTABLE_BYTES)
      ) {
        fail(`${label} does not satisfy reviewed file authority`);
      }
      if (item.executable) accessSync(item.sourcePath, fsConstants.X_OK);
      const sourceSize = Number(initial.size);
      acquiredRuntimeBytes += sourceSize;
      if (acquiredRuntimeBytes > MAX_ACQUIRED_RUNTIME_BYTES) {
        fail('reviewed runtime acquisition exceeds its aggregate byte bound');
      }
      const parent = dirname(item.stagedPath);
      requireExactPrivateDirectoryAuthority(parent, `${label} staged parent`);

      if (index === 0 && trustedTestHook !== undefined) {
        trustedTestHook({
          phase: 'source-reviewed-before-open',
          sourcePath: item.sourcePath,
          stagedPath: item.stagedPath,
        });
      }

      const sourceDescriptor = openSync(
        item.sourcePath,
        EXPECTED_REGULAR_OPEN_FLAGS,
      );
      const ownedDescriptors = [sourceDescriptor];
      withOwnedDescriptorCleanup(ownedDescriptors, label, () => {
        const openedSource = fstatSync(sourceDescriptor, { bigint: true });
        if (!openedSource.isFile() || !sameStat(initial, openedSource)) {
          fail(`${label} changed before descriptor acquisition`);
        }
        requireReviewedPosixAclAuthority([
          { kind: 'path', label: `${label} path`, value: item.sourcePath },
          { kind: 'descriptor', label: `${label} descriptor`, value: sourceDescriptor },
        ]);
        const sourceAfterAcl = fstatSync(sourceDescriptor, { bigint: true });
        const sourcePathAfterAcl = lstatSync(item.sourcePath, { bigint: true });
        if (
          realpathSync(item.sourcePath) !== item.sourcePath ||
          !sameStat(openedSource, sourceAfterAcl) ||
          !sameStat(openedSource, sourcePathAfterAcl)
        ) {
          fail(`${label} changed during ACL acquisition`);
        }
        if (index === 0 && trustedTestHook !== undefined) {
          trustedTestHook({
            phase: 'source-opened-before-copy',
            sourceDescriptor,
            sourcePath: item.sourcePath,
            stagedPath: item.stagedPath,
          });
        }

        const stagedDescriptor = openSync(
          item.stagedPath,
          fsConstants.O_RDWR |
            fsConstants.O_CREAT |
            fsConstants.O_EXCL |
            fsConstants.O_NOFOLLOW,
          item.executable ? 0o500 : 0o400,
        );
        ownedDescriptors.push(stagedDescriptor);
        createdPaths.set(item.stagedPath, null);
        const createdStaged = fstatSync(stagedDescriptor, { bigint: true });
        createdPaths.set(item.stagedPath, {
          device: createdStaged.dev,
          inode: createdStaged.ino,
        });
        const sourceDigest = createHash('sha256');
        const chunk = Buffer.allocUnsafe(Math.min(HASH_CHUNK_BYTES, Math.max(sourceSize, 1)));
        let offset = 0;
        while (offset < sourceSize) {
          const count = readSync(
            sourceDescriptor,
            chunk,
            0,
            Math.min(chunk.byteLength, sourceSize - offset),
            offset,
          );
          if (count <= 0) fail(`${label} ended during descriptor acquisition`);
          let written = 0;
          while (written < count) {
            const countWritten = writeSync(
              stagedDescriptor,
              chunk,
              written,
              count - written,
              offset + written,
            );
            if (countWritten <= 0) fail(`${label} staged copy made no forward progress`);
            written += countWritten;
          }
          sourceDigest.update(chunk.subarray(0, count));
          offset += count;
        }
        fchmodSync(stagedDescriptor, item.executable ? 0o555 : 0o444);
        fsyncSync(stagedDescriptor);
        const sourceSha256 = `sha256:${sourceDigest.digest('hex')}`;
        const stagedSha256 = hashDescriptor(
          stagedDescriptor,
          sourceSize,
          MAX_EXECUTABLE_BYTES,
          `${label} staged copy`,
        );
        if (sourceSha256 !== stagedSha256) fail(`${label} staged digest differs from its source`);
        requireReviewedPosixAclAuthority([
          { kind: 'path', label: `${label} staged path`, value: item.stagedPath },
          { kind: 'descriptor', label: `${label} staged descriptor`, value: stagedDescriptor },
        ]);

        const finalSourceDescriptor = fstatSync(sourceDescriptor, { bigint: true });
        const finalSourcePath = lstatSync(item.sourcePath, { bigint: true });
        const finalStagedDescriptor = fstatSync(stagedDescriptor, { bigint: true });
        const finalStagedPath = lstatSync(item.stagedPath, { bigint: true });
        const expectedStagedMode = item.executable ? 0o555n : 0o444n;
        if (
          realpathSync(item.sourcePath) !== item.sourcePath ||
          realpathSync(item.stagedPath) !== item.stagedPath ||
          !sameStat(openedSource, finalSourceDescriptor) ||
          !sameStat(openedSource, finalSourcePath) ||
          !sameStat(finalStagedDescriptor, finalStagedPath) ||
          !finalStagedDescriptor.isFile() ||
          finalStagedDescriptor.nlink !== 1n ||
          finalStagedDescriptor.uid !== uid ||
          finalStagedDescriptor.size !== BigInt(sourceSize) ||
          (finalStagedDescriptor.mode & 0o7777n) !== expectedStagedMode
        ) {
          fail(`${label} authority changed during acquisition`);
        }
        acquired.push({
          sourcePath: item.sourcePath,
          sourceSha256,
          sourcePathAncestryProtected,
          stagedPath: item.stagedPath,
          stagedSha256,
          size: sourceSize,
        });
        stagedIdentities.push(finalStagedDescriptor);
      });
    }

    for (const parent of new Set(requested.map(({ stagedPath }) => dirname(stagedPath)))) {
      requireExactPrivateDirectoryAuthority(parent, 'reviewed runtime parent before fsync');
      const initialParent = lstatSync(parent, { bigint: true });
      const descriptor = openSync(parent, EXPECTED_DIRECTORY_OPEN_FLAGS);
      withOwnedDescriptorCleanup([descriptor], 'reviewed runtime parent fsync', () => {
        const openedParent = fstatSync(descriptor, { bigint: true });
        const reboundParent = lstatSync(parent, { bigint: true });
        if (
          !openedParent.isDirectory() ||
          openedParent.isSymbolicLink() ||
          realpathSync(parent) !== parent ||
          !sameStat(initialParent, openedParent) ||
          !sameStat(initialParent, reboundParent)
        ) {
          fail('reviewed runtime parent authority changed before fsync');
        }
        fsyncSync(descriptor);
        const finalDescriptor = fstatSync(descriptor, { bigint: true });
        const finalPath = lstatSync(parent, { bigint: true });
        if (
          realpathSync(parent) !== parent ||
          !sameStat(openedParent, finalDescriptor) ||
          !sameStat(openedParent, finalPath)
        ) {
          fail('reviewed runtime parent authority changed during fsync');
        }
      });
    }

    const expectedFiles = new Map<string, {
      readonly acquired: ReviewedAcquiredRuntimeFile;
      readonly executable: boolean;
      readonly identity: BigIntStats;
    }>();
    const expectedDirectories = new Set<string>(['']);
    for (const [index, item] of requested.entries()) {
      const relativePath = relative(runtimeRoot, item.stagedPath);
      expectedFiles.set(relativePath, {
        acquired: acquired[index]!,
        executable: item.executable,
        identity: stagedIdentities[index]!,
      });
      let directory = dirname(relativePath);
      while (directory !== '.') {
        expectedDirectories.add(directory);
        const parent = dirname(directory);
        if (parent === directory) break;
        directory = parent;
      }
    }
    const inventoryRecords: Array<Record<string, JsonValue>> = [];
    for (const directoryRelative of [...expectedDirectories].sort()) {
      const directoryPath = directoryRelative === ''
        ? runtimeRoot
        : join(runtimeRoot, ...directoryRelative.split(sep));
      requireExactPrivateDirectoryAuthority(
        directoryPath,
        `reviewed runtime inventory directory ${directoryRelative || '<root>'}`,
      );
      const directoryStat = lstatSync(directoryPath, { bigint: true });
      if (
        !directoryStat.isDirectory() ||
        directoryStat.isSymbolicLink() ||
        directoryStat.uid !== uid ||
        (directoryStat.mode & 0o7777n) !== 0o700n ||
        realpathSync(directoryPath) !== directoryPath
      ) {
        fail('reviewed runtime staged directory authority changed');
      }
      const expectedNames = new Set<string>();
      for (const candidate of expectedDirectories) {
        if (candidate !== '' && dirname(candidate) === (directoryRelative || '.')) {
          expectedNames.add(candidate.split(sep).at(-1)!);
        }
      }
      for (const fileRelative of expectedFiles.keys()) {
        if (dirname(fileRelative) === (directoryRelative || '.')) {
          expectedNames.add(fileRelative.split(sep).at(-1)!);
        }
      }
      const actualNames = readdirSync(directoryPath, { encoding: 'utf8' }).sort();
      if (!exactJsonEqual(actualNames, [...expectedNames].sort())) {
        fail('reviewed runtime staged inventory contains an unexpected entry');
      }
      inventoryRecords.push({
        path: directoryRelative,
        type: 'directory',
      });
    }
    for (const [relativePath, expected] of [...expectedFiles.entries()].sort()) {
      const stagedPath = join(runtimeRoot, ...relativePath.split(sep));
      const initialPath = lstatSync(stagedPath, { bigint: true });
      const mode = expected.executable ? 0o555n : 0o444n;
      if (
        !initialPath.isFile() ||
        initialPath.isSymbolicLink() ||
        initialPath.nlink !== 1n ||
        initialPath.uid !== uid ||
        initialPath.size !== BigInt(expected.acquired.size) ||
        (initialPath.mode & 0o7777n) !== mode ||
        !sameStat(expected.identity, initialPath) ||
        realpathSync(stagedPath) !== stagedPath
      ) {
        fail('reviewed runtime staged file authority changed');
      }
      const descriptor = openSync(stagedPath, EXPECTED_REGULAR_OPEN_FLAGS);
      withOwnedDescriptorCleanup(
        [descriptor],
        `reviewed runtime inventory file ${relativePath}`,
        () => {
          const opened = fstatSync(descriptor, { bigint: true });
          if (
            !opened.isFile() ||
            !sameStat(expected.identity, opened) ||
            !sameStat(initialPath, opened)
          ) {
            fail('reviewed runtime staged file changed before final descriptor acquisition');
          }
          requireReviewedPosixAclAuthority([
            {
              kind: 'path',
              label: `reviewed runtime inventory file ${relativePath} path`,
              value: stagedPath,
            },
            {
              kind: 'descriptor',
              label: `reviewed runtime inventory file ${relativePath} descriptor`,
              value: descriptor,
            },
          ]);
          const afterAclDescriptor = fstatSync(descriptor, { bigint: true });
          const afterAclPath = lstatSync(stagedPath, { bigint: true });
          if (
            realpathSync(stagedPath) !== stagedPath ||
            !sameStat(expected.identity, afterAclDescriptor) ||
            !sameStat(expected.identity, afterAclPath)
          ) {
            fail('reviewed runtime staged file changed during final ACL inspection');
          }
          const observedSha256 = hashDescriptor(
            descriptor,
            expected.acquired.size,
            MAX_EXECUTABLE_BYTES,
            `reviewed runtime inventory file ${relativePath}`,
          );
          if (observedSha256 !== expected.acquired.stagedSha256) {
            fail('reviewed runtime staged file bytes changed before inventory publication');
          }
          const finalDescriptor = fstatSync(descriptor, { bigint: true });
          const finalPath = lstatSync(stagedPath, { bigint: true });
          if (
            realpathSync(stagedPath) !== stagedPath ||
            !sameStat(expected.identity, finalDescriptor) ||
            !sameStat(expected.identity, finalPath) ||
            !finalDescriptor.isFile() ||
            finalDescriptor.nlink !== 1n ||
            finalDescriptor.uid !== uid ||
            finalDescriptor.size !== BigInt(expected.acquired.size) ||
            (finalDescriptor.mode & 0o7777n) !== mode
          ) {
            fail('reviewed runtime staged file changed during final digest inspection');
          }
          inventoryRecords.push({
            path: relativePath,
            sha256: observedSha256,
            size: expected.acquired.size,
            type: 'file',
          });
        },
      );
    }
    inventoryRecords.sort((left, right) => String(left.path).localeCompare(String(right.path)));
    const inventorySha256 = `sha256:${createHash('sha256')
      .update(`cortexel-reviewed-runtime-inventory-v1\0${canonicalize(inventoryRecords)}`)
      .digest('hex')}`;
    const authority = inspectReviewedExecutableAuthority(
      stagedExecutable,
      'acquired reviewed executable',
    );
    if (authority.file.sha256 !== acquired[0]!.stagedSha256) {
      fail('acquired executable authority differs from its staged digest');
    }
    return {
      schema: REVIEWED_EXECUTABLE_ACQUISITION_SCHEMA,
      runtimeRoot,
      executable: acquired[0]!,
      companions: acquired.slice(1),
      inventoryEntryCount: inventoryRecords.length,
      inventorySha256,
      authority,
    };
  } catch (error) {
    const cleanupErrors: Error[] = [];
    for (const [stagedPath, identity] of [...createdPaths.entries()].reverse()) {
      try {
        unlinkOwnedPath(stagedPath, identity, 'reviewed staged acquisition cleanup');
      } catch (cleanupError) {
        cleanupErrors.push(new Error(
          'reviewed staged acquisition pathname cleanup failed',
          { cause: cleanupError },
        ));
      }
    }
    throwPrimaryWithCleanup(error, cleanupErrors, 'reviewed executable acquisition');
  }
}

function assertExecutableAuthority(
  expected: ReviewedExecutableAuthority,
  label: string,
): void {
  if (expected.executable !== expected.file.path) {
    fail(`${label} executable path differs from its file authority`);
  }
  const observed = inspectReviewedExecutableAuthority(expected.executable, label);
  if (!exactJsonEqual(observed, expected)) fail(`${label} authority changed`);
}

function writeAll(descriptor: number, bytes: Buffer, label: string): void {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const count = writeSync(descriptor, bytes, offset, bytes.byteLength - offset);
    if (count <= 0) fail(`${label} made no forward progress`);
    offset += count;
  }
}

function exactUnlinkedSpool(
  descriptor: number,
  expectedSize: number,
  uid: bigint,
  label: string,
): UnlinkedSpool {
  const stat = fstatSync(descriptor, { bigint: true });
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 0n ||
    (stat.mode & 0o7777n) !== 0o600n ||
    stat.uid !== uid ||
    stat.size !== BigInt(expectedSize)
  ) {
    fail(`${label} is not the exact unlinked spool inode`);
  }
  return {
    descriptor,
    device: stat.dev,
    inode: stat.ino,
    mode: stat.mode & 0o7777n,
    uid: stat.uid,
    gid: stat.gid,
  };
}

function sameSpoolIdentity(left: UnlinkedSpool, right: UnlinkedSpool): boolean {
  return left.descriptor === right.descriptor &&
    left.device === right.device &&
    left.inode === right.inode &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid;
}

function createUnlinkedSpools(stdin: Buffer | null): {
  readonly stdin: UnlinkedSpool | null;
  readonly stdout: UnlinkedSpool;
  readonly stderr: UnlinkedSpool;
} {
  const uid = currentPosixUid();
  const parent = realpathSync(tmpdir());
  requireProtectedDirectoryEntryChain(parent, 'reviewed POSIX command spool parent');
  const root = realpathSync(mkdtempSync(join(parent, 'cortexel-reviewed-command-')));
  const rootStat = lstatSync(root, { bigint: true });
  const rootIdentity = { device: rootStat.dev, inode: rootStat.ino };
  const failAfterRootCleanup = (message: string): never => {
    const primary = new Error(message);
    const cleanupErrors: Error[] = [];
    try {
      removeOwnedDirectory(root, rootIdentity, 'reviewed spool root cleanup');
    } catch (cleanupError) {
      cleanupErrors.push(new Error('reviewed spool root cleanup failed', {
        cause: cleanupError,
      }));
    }
    throwPrimaryWithCleanup(primary, cleanupErrors, 'reviewed spool root creation');
  };
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    rootStat.uid !== uid
  ) {
    failAfterRootCleanup('reviewed POSIX command spool root authority failed');
  }
  // mkdtemp is specified to apply 0700 on supported POSIX hosts, but an unusual
  // umask/runtime must not broaden this short-lived authority.
  if ((rootStat.mode & 0o7777n) !== 0o700n) {
    failAfterRootCleanup('reviewed POSIX command spool root is not exact mode 0700');
  }
  try {
    requireProtectedDirectoryEntryChain(root, 'reviewed POSIX command spool root');
  } catch (error) {
    const cleanupErrors: Error[] = [];
    try {
      removeOwnedDirectory(root, rootIdentity, 'reviewed spool root cleanup');
    } catch (cleanupError) {
      cleanupErrors.push(new Error('reviewed spool root cleanup failed', {
        cause: cleanupError,
      }));
    }
    throwPrimaryWithCleanup(error, cleanupErrors, 'reviewed spool root authority');
  }

  const descriptors: number[] = [];
  const remainingPaths = new Map<string, OwnedPathIdentity | null>();
  const createOutput = (name: string): UnlinkedSpool => {
    const spoolPath = join(root, `${name}-${randomBytes(16).toString('hex')}`);
    remainingPaths.set(spoolPath, null);
    const descriptor = openSync(spoolPath, 'wx+', 0o600);
    descriptors.push(descriptor);
    fchmodSync(descriptor, 0o600);
    const linked = fstatSync(descriptor, { bigint: true });
    if (!linked.isFile() || linked.nlink !== 1n || linked.uid !== uid || linked.size !== 0n) {
      fail(`reviewed ${name} spool creation failed`);
    }
    remainingPaths.set(spoolPath, { device: linked.dev, inode: linked.ino });
    requireReviewedPosixAclAuthority([
      { kind: 'path', label: `reviewed ${name} spool path`, value: spoolPath },
      { kind: 'descriptor', label: `reviewed ${name} spool descriptor`, value: descriptor },
    ]);
    const linkedAfterAcl = lstatSync(spoolPath, { bigint: true });
    const descriptorAfterAcl = fstatSync(descriptor, { bigint: true });
    if (!sameStat(linked, linkedAfterAcl) || !sameStat(linked, descriptorAfterAcl)) {
      fail(`reviewed ${name} spool changed during ACL inspection`);
    }
    unlinkSync(spoolPath);
    remainingPaths.delete(spoolPath);
    return exactUnlinkedSpool(descriptor, 0, uid, `reviewed ${name} spool`);
  };
  const createInput = (bytes: Buffer): UnlinkedSpool => {
    const spoolPath = join(root, `stdin-${randomBytes(16).toString('hex')}`);
    remainingPaths.set(spoolPath, null);
    const writer = openSync(spoolPath, 'wx', 0o600);
    withOwnedDescriptorCleanup([writer], 'reviewed stdin spool writer', () => {
      writeAll(writer, bytes, 'reviewed stdin spool write');
      fchmodSync(writer, 0o600);
      const written = fstatSync(writer, { bigint: true });
      if (
        !written.isFile() ||
        written.nlink !== 1n ||
        written.uid !== uid ||
        written.size !== BigInt(bytes.byteLength)
      ) {
        fail('reviewed stdin spool creation failed');
      }
      remainingPaths.set(spoolPath, { device: written.dev, inode: written.ino });
      requireReviewedPosixAclAuthority([
        { kind: 'path', label: 'reviewed stdin spool path', value: spoolPath },
        { kind: 'descriptor', label: 'reviewed stdin writer descriptor', value: writer },
      ]);
      const writtenAfterAcl = fstatSync(writer, { bigint: true });
      const linkedAfterAcl = lstatSync(spoolPath, { bigint: true });
      if (!sameStat(written, writtenAfterAcl) || !sameStat(written, linkedAfterAcl)) {
        fail('reviewed stdin spool changed during ACL inspection');
      }
    });
    const descriptor = openSync(
      spoolPath,
      EXPECTED_REGULAR_OPEN_FLAGS,
    );
    descriptors.push(descriptor);
    const reopened = fstatSync(descriptor, { bigint: true });
    if (!reopened.isFile() || reopened.size !== BigInt(bytes.byteLength)) {
      fail('reviewed stdin spool changed before read-only reopen');
    }
    requireReviewedPosixAclAuthority([
      { kind: 'path', label: 'reviewed stdin spool reopened path', value: spoolPath },
      { kind: 'descriptor', label: 'reviewed stdin reader descriptor', value: descriptor },
    ]);
    const reopenedAfterAcl = fstatSync(descriptor, { bigint: true });
    const reboundAfterAcl = lstatSync(spoolPath, { bigint: true });
    if (!sameStat(reopened, reopenedAfterAcl) || !sameStat(reopened, reboundAfterAcl)) {
      fail('reviewed stdin spool changed during read-only ACL inspection');
    }
    unlinkSync(spoolPath);
    remainingPaths.delete(spoolPath);
    const spool = exactUnlinkedSpool(
      descriptor,
      bytes.byteLength,
      uid,
      'reviewed stdin spool',
    );
    const inspected = readAndHashDescriptor(
      descriptor,
      bytes.byteLength,
      'reviewed stdin spool',
    );
    const expectedDigest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (!inspected.bytes.equals(bytes) || inspected.sha256 !== expectedDigest) {
      fail('reviewed stdin spool bytes differ before execution');
    }
    return spool;
  };

  try {
    const input = stdin === null ? null : createInput(stdin);
    const stdout = createOutput('stdout');
    const stderr = createOutput('stderr');
    removeOwnedDirectory(root, rootIdentity, 'reviewed spool root final removal');
    return { stdin: input, stdout, stderr };
  } catch (error) {
    const cleanupErrors: Error[] = [];
    for (const descriptor of descriptors.reverse()) {
      try {
        closeSync(descriptor);
      } catch (cleanupError) {
        cleanupErrors.push(new Error('reviewed spool descriptor cleanup failed', {
          cause: cleanupError,
        }));
      }
    }
    for (const [spoolPath, identity] of remainingPaths) {
      try {
        unlinkOwnedPath(spoolPath, identity, 'reviewed spool pathname cleanup');
      } catch (cleanupError) {
        cleanupErrors.push(new Error('reviewed spool pathname cleanup failed', {
          cause: cleanupError,
        }));
      }
    }
    try {
      removeOwnedDirectory(root, rootIdentity, 'reviewed spool root cleanup');
    } catch (cleanupError) {
      cleanupErrors.push(new Error('reviewed spool root cleanup failed', {
        cause: cleanupError,
      }));
    }
    throwPrimaryWithCleanup(error, cleanupErrors, 'reviewed spool creation');
  }
}

function isInside(parent: string, candidate: string): boolean {
  const rel = relative(parent, candidate);
  return rel.length > 0 && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function validateTestHook(
  hook: ReviewedPosixCommandTestHook,
  cwd: string,
): string {
  const phases = [
    'worker-ready-before-handshake',
    'handshake-published-before-go',
    'go-sent',
    'guardian-swept-before-result',
  ] as const;
  const maximumPhaseCodeUnits = Math.max(...phases.map((phase) => phase.length));
  if (hook.phase.length > maximumPhaseCodeUnits || !phases.includes(hook.phase)) {
    fail('reviewed POSIX command test hook has an invalid phase');
  }
  if (
    hook.readyPath.length > MAX_PATH_BYTES ||
    hook.readyPath.includes('\0') ||
    !isAbsolute(hook.readyPath) ||
    resolve(hook.readyPath) !== hook.readyPath ||
    Buffer.byteLength(hook.readyPath, 'utf8') > MAX_PATH_BYTES ||
    !isInside(cwd, hook.readyPath)
  ) {
    fail('reviewed POSIX command test hook path is outside its working directory');
  }
  const parent = dirname(hook.readyPath);
  const parentStat = lstatSync(parent);
  if (
    realpathSync(parent) !== parent ||
    !parentStat.isDirectory() ||
    parentStat.isSymbolicLink()
  ) {
    fail('reviewed POSIX command test hook parent is not one canonical directory');
  }
  try {
    lstatSync(hook.readyPath);
    fail('reviewed POSIX command test hook path already exists');
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      // Exact absence is required.
    } else {
      throw error;
    }
  }
  return canonicalize({
    phase: hook.phase,
    readyPath: hook.readyPath,
    schema: REVIEWED_POSIX_COMMAND_TEST_HOOK_SCHEMA,
  });
}

function snapshotEnvironment(
  environment: unknown,
  initialPayloadBytes: number,
): { readonly environment: Record<string, string>; readonly payloadBytes: number } {
  const label = 'reviewed POSIX command environment';
  if (environment === null || typeof environment !== 'object') {
    fail(`${label} must be one ordinary object`);
  }
  if (utilTypes.isProxy(environment)) fail(`${label} must not be a Proxy`);
  if (Array.isArray(environment)) fail(`${label} must be one ordinary object`);
  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(environment);
  } catch {
    fail(`${label} cannot be inspected safely`);
  }
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    utilTypes.isModuleNamespaceObject(environment)
  ) fail(`${label} must be one ordinary object`);
  if (
    !Number.isSafeInteger(initialPayloadBytes) ||
    initialPayloadBytes < 0 ||
    initialPayloadBytes > MAX_PAYLOAD_BYTES
  ) {
    fail('reviewed POSIX command payload input exceeds its byte budget');
  }

  const target: Record<string, string> = Object.create(null) as Record<string, string>;
  const reservedKeys = [
    REVIEWED_POSIX_SUPERVISOR_PAYLOAD_ENV,
    REVIEWED_POSIX_GUARDIAN_PAYLOAD_ENV,
    REVIEWED_POSIX_WORKER_PAYLOAD_ENV,
    REVIEWED_POSIX_TEST_HOOK_ENV,
  ] as const;
  let payloadBytes = initialPayloadBytes;
  let enumerableProjectionCount = 0;
  for (const key in environment as Record<string, unknown>) {
    enumerableProjectionCount += 1;
    if (enumerableProjectionCount > MAX_ENVIRONMENT_ENTRIES) {
      fail(`${label} exceeds its entry bound`);
    }
    if (key.length > MAX_ENVIRONMENT_KEY_BYTES) {
      fail('reviewed POSIX command environment contains an oversized key');
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(environment, key);
    } catch {
      fail(`${label}.${key} cannot be inspected safely`);
    }
    if (descriptor === undefined) fail(`${label} contains an inherited enumerable entry`);
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      fail(`${label}.${key} must be an enumerable own data property`);
    }
    const value = descriptor.value;
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      fail('reviewed POSIX command environment contains a non-string entry');
    }
    const remainingCodeUnits = MAX_PAYLOAD_BYTES - payloadBytes;
    // UTF-8 uses at least one byte per UTF-16 code unit. These cheap primitive
    // bounds therefore reject impossible inputs before NUL scans or byte counts.
    if (key.length > remainingCodeUnits || value.length > remainingCodeUnits - key.length) {
      fail('reviewed POSIX command payload input exceeds its byte budget');
    }
    if (key.length === 0 || key.includes('\0') || key.includes('=') || value.includes('\0')) {
      fail('reviewed POSIX command environment contains an invalid entry');
    }
    for (const reserved of reservedKeys) {
      if (key === reserved) {
        fail(`reviewed POSIX command environment contains reserved entry ${reserved}`);
      }
    }
    const keyBytes = Buffer.byteLength(key, 'utf8');
    if (keyBytes > MAX_ENVIRONMENT_KEY_BYTES) {
      fail('reviewed POSIX command environment contains an oversized key');
    }
    const entryBytes = keyBytes + Buffer.byteLength(value, 'utf8');
    if (entryBytes > MAX_PAYLOAD_BYTES - payloadBytes) {
      fail('reviewed POSIX command payload input exceeds its byte budget');
    }
    payloadBytes += entryBytes;
    target[key] = value;
  }
  return { environment: Object.freeze(target), payloadBytes };
}

function validateSpoolAfter(
  spool: UnlinkedSpool,
  size: number,
  label: string,
): { readonly bytes: Buffer; readonly sha256: string } {
  const current = exactUnlinkedSpool(spool.descriptor, size, spool.uid, label);
  if (!sameSpoolIdentity(spool, current)) fail(`${label} identity changed`);
  const inspected = readAndHashDescriptor(spool.descriptor, size, label);
  const final = exactUnlinkedSpool(spool.descriptor, size, spool.uid, label);
  if (!sameSpoolIdentity(spool, final)) fail(`${label} changed while being read`);
  return inspected;
}

/**
 * Run one canonical executable under the reviewed live-guardian lifecycle.
 * Status/signal are returned for ordinary target failure; lifecycle/protocol,
 * authority, spawn, and outer hard-timeout failures throw.
 */
export function runReviewedPosixCommand(
  controlRuntimeExecutable: string,
  targetExecutable: string,
  args: readonly string[],
  cwd: string,
  options: ReviewedPosixCommandOptions = {},
): ReviewedPosixCommandResult {
  requireBoundedPrimitiveString(
    controlRuntimeExecutable,
    'reviewed control runtime executable path',
  );
  requireBoundedPrimitiveString(targetExecutable, 'reviewed target executable path');
  requireBoundedPrimitiveString(cwd, 'reviewed POSIX command working directory path');
  const optionSnapshot = snapshotOwnDataRecord(options, [
    'controlRuntimeAuthority',
    'environment',
    'outputLimitBytes',
    'stdin',
    'targetAuthority',
    'timeoutMs',
    'trustedTestHook',
  ], 'reviewed POSIX command options');
  const argumentValues = snapshotOwnDataArray(
    args,
    MAX_ARGUMENTS,
    'reviewed POSIX command arguments',
  );
  if (argumentValues.some((argument) => typeof argument !== 'string')) {
    fail('reviewed POSIX command arguments contain a non-string member');
  }
  const commandArgs = argumentValues as readonly string[];
  let payloadInputCodeUnits = cwd.length + targetExecutable.length;
  if (payloadInputCodeUnits > MAX_PAYLOAD_BYTES) {
    fail('reviewed POSIX command payload input exceeds its byte budget');
  }
  let payloadInputBytes = Buffer.byteLength(cwd, 'utf8') +
    Buffer.byteLength(targetExecutable, 'utf8');
  for (const [index, argument] of commandArgs.entries()) {
    if (
      argument.length > MAX_ARGUMENT_BYTES ||
      argument.includes('\0')
    ) {
      fail(`reviewed POSIX command argument ${index} is invalid or oversized`);
    }
    payloadInputCodeUnits += argument.length;
    if (payloadInputCodeUnits > MAX_PAYLOAD_BYTES) {
      fail('reviewed POSIX command payload input exceeds its byte budget');
    }
    const argumentBytes = Buffer.byteLength(argument, 'utf8');
    if (argumentBytes > MAX_ARGUMENT_BYTES) {
      fail(`reviewed POSIX command argument ${index} is invalid or oversized`);
    }
    payloadInputBytes += argumentBytes;
    if (payloadInputBytes > MAX_PAYLOAD_BYTES) {
      fail('reviewed POSIX command payload input exceeds its byte budget');
    }
  }
  const targetEnvironment = optionSnapshot.environment === undefined
    ? Object.freeze(Object.create(null) as Record<string, string>)
    : snapshotEnvironment(optionSnapshot.environment, payloadInputBytes).environment;
  const testHookSnapshot = optionSnapshot.trustedTestHook === undefined
    ? undefined
    : (() => {
        const hook = snapshotOwnDataRecord(
          optionSnapshot.trustedTestHook,
          ['phase', 'readyPath'],
          'reviewed POSIX command test hook',
          ['phase', 'readyPath'],
        );
        if (typeof hook.phase !== 'string' || typeof hook.readyPath !== 'string') {
          fail('reviewed POSIX command test hook has invalid field types');
        }
        return Object.freeze({
          phase: hook.phase,
          readyPath: hook.readyPath,
        }) as ReviewedPosixCommandTestHook;
      })();
  const suppliedControlAuthority = optionSnapshot.controlRuntimeAuthority === undefined
    ? undefined
    : snapshotReviewedExecutableAuthority(
        optionSnapshot.controlRuntimeAuthority,
        'reviewed control runtime supplied authority',
      );
  const suppliedTargetAuthority = optionSnapshot.targetAuthority === undefined
    ? undefined
    : snapshotReviewedExecutableAuthority(
        optionSnapshot.targetAuthority,
        'reviewed target executable supplied authority',
      );
  const suppliedStdin = optionSnapshot.stdin;
  let stdin: Buffer | null = null;
  if (suppliedStdin !== undefined) {
    if (
      suppliedStdin !== null &&
      (typeof suppliedStdin === 'object' || typeof suppliedStdin === 'function') &&
      utilTypes.isProxy(suppliedStdin)
    ) {
      fail('reviewed POSIX command stdin must not be a Proxy');
    }
    if (
      !ArrayBuffer.isView(suppliedStdin) ||
      !(suppliedStdin instanceof Uint8Array) ||
      (Object.getPrototypeOf(suppliedStdin) !== Uint8Array.prototype &&
        Object.getPrototypeOf(suppliedStdin) !== Buffer.prototype)
    ) {
      fail('reviewed POSIX command stdin must be one direct Uint8Array or Buffer');
    }
    const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype) as object;
    const bufferGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'buffer')?.get;
    const byteOffsetGetter = Object.getOwnPropertyDescriptor(
      typedArrayPrototype,
      'byteOffset',
    )?.get;
    const byteLengthGetter = Object.getOwnPropertyDescriptor(
      typedArrayPrototype,
      'byteLength',
    )?.get;
    if (bufferGetter === undefined || byteOffsetGetter === undefined || byteLengthGetter === undefined) {
      fail('reviewed POSIX command cannot inspect stdin byte authority');
    }
    let buffer: ArrayBufferLike;
    let byteOffset: number;
    let byteLength: number;
    try {
      buffer = bufferGetter.call(suppliedStdin) as ArrayBufferLike;
      byteOffset = byteOffsetGetter.call(suppliedStdin) as number;
      byteLength = byteLengthGetter.call(suppliedStdin) as number;
    } catch {
      fail('reviewed POSIX command cannot inspect stdin byte authority');
    }
    const resizableGetter = Object.getOwnPropertyDescriptor(
      ArrayBuffer.prototype,
      'resizable',
    )?.get;
    if (
      !(buffer instanceof ArrayBuffer) ||
      Object.getPrototypeOf(buffer) !== ArrayBuffer.prototype ||
      (resizableGetter !== undefined && resizableGetter.call(buffer) === true)
    ) {
      fail('reviewed POSIX command stdin requires direct fixed ArrayBuffer backing');
    }
    if (!Number.isSafeInteger(byteLength) || byteLength < 0 || byteLength > MAX_STDIN_BYTES) {
      fail('reviewed POSIX command stdin exceeds its byte bound');
    }
    try {
      stdin = Buffer.from(new Uint8Array(buffer, byteOffset, byteLength));
    } catch {
      fail('reviewed POSIX command stdin backing is detached or invalid');
    }
  }
  // Snapshot caller-owned mutable bytes before any filesystem authority work,
  // subprocess, hook, or other fallible operation can yield an observation gap.
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    fail('reviewed POSIX command supervision is implemented only on macOS/Linux');
  }
  if (
    cwd.length > MAX_PATH_BYTES ||
    cwd.includes('\0') ||
    !isAbsolute(cwd) ||
    resolve(cwd) !== cwd ||
    Buffer.byteLength(cwd, 'utf8') > MAX_PATH_BYTES ||
    realpathSync(cwd) !== cwd ||
    !lstatSync(cwd).isDirectory()
  ) {
    fail('reviewed POSIX command working directory must be canonical and physical');
  }
  requireProtectedDirectoryEntryChain(cwd, 'reviewed POSIX command working directory');
  const requestedTimeoutMs = optionSnapshot.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const outerTimeoutMs = reviewedPosixOuterTimeoutMs(requestedTimeoutMs);
  const timeoutMs = outerTimeoutMs - REVIEWED_POSIX_SUPERVISOR_GRACE_MS;
  const outputLimitBytes = optionSnapshot.outputLimitBytes ?? 16 * 1024 * 1024;
  if (
    typeof outputLimitBytes !== 'number' ||
    !Number.isSafeInteger(outputLimitBytes) ||
    outputLimitBytes < 1 ||
    outputLimitBytes > MAX_OUTPUT_BYTES
  ) {
    fail('reviewed POSIX command output budget is outside its bound');
  }
  const trustedTestHook = testHookSnapshot === undefined
    ? undefined
    : validateTestHook(testHookSnapshot, cwd);

  const controlAuthority = suppliedControlAuthority ??
    inspectReviewedExecutableAuthority(controlRuntimeExecutable, 'reviewed control runtime');
  const targetAuthority = suppliedTargetAuthority ??
    inspectReviewedExecutableAuthority(targetExecutable, 'reviewed target executable');
  if (controlAuthority.executable !== controlRuntimeExecutable) {
    fail('reviewed control runtime differs from its authority');
  }
  if (targetAuthority.executable !== targetExecutable) {
    fail('reviewed target executable differs from its authority');
  }
  const sharedExecutableAuthority = controlRuntimeExecutable === targetExecutable;
  if (sharedExecutableAuthority && !exactJsonEqual(controlAuthority, targetAuthority)) {
    fail('shared reviewed executable has conflicting authorities');
  }
  assertExecutableAuthority(controlAuthority, 'pre-command control runtime');
  if (!sharedExecutableAuthority) {
    assertExecutableAuthority(targetAuthority, 'pre-command target executable');
  }

  const payload = canonicalize({
    args: commandArgs,
    cwd,
    environment: targetEnvironment,
    hasStdin: stdin !== null,
    outputLimitBytes,
    targetExecutable,
    timeoutMs,
  });
  if (payload.length > MAX_PAYLOAD_BYTES || Buffer.byteLength(payload, 'utf8') > MAX_PAYLOAD_BYTES) {
    fail('reviewed POSIX command payload exceeds its serialized byte budget');
  }
  const supervisorEnvironment: NodeJS.ProcessEnv = {
    [REVIEWED_POSIX_SUPERVISOR_PAYLOAD_ENV]: payload,
  };
  if (trustedTestHook !== undefined) {
    supervisorEnvironment[REVIEWED_POSIX_TEST_HOOK_ENV] = trustedTestHook;
  }

  const spools = createUnlinkedSpools(stdin);
  const descriptors = [
    spools.stdin?.descriptor,
    spools.stdout.descriptor,
    spools.stderr.descriptor,
  ].filter((value): value is number => value !== undefined);
  return withOwnedDescriptorCleanup(descriptors, 'reviewed command spools', () => {
    const outer = spawnSync(
      controlRuntimeExecutable,
      ['-e', REVIEWED_POSIX_OUTER_LAUNCHER_SOURCE],
      {
        cwd,
        encoding: null,
        env: supervisorEnvironment,
        stdio: [
          'ignore',
          'pipe',
          'pipe',
          spools.stdin?.descriptor ?? 'ignore',
          spools.stdout.descriptor,
          spools.stderr.descriptor,
        ],
        timeout: outerTimeoutMs,
        killSignal: 'SIGKILL',
        maxBuffer: MAX_PROTOCOL_BYTES,
        windowsHide: true,
      },
    );

    // Revalidation performs no process signalling or probing. While the exact
    // Node launcher remains live, it actively drains a dedicated guardian-only
    // lifetime pipe and withholds protocol publication until real peer EOF plus
    // supervisor close. Its inherited stdout is only a compatibility hold; Bun
    // does not guarantee descendant-held stdout delays return after launcher
    // SIGKILL or a spawnSync hard kill.
    assertExecutableAuthority(controlAuthority, 'post-command control runtime');
    if (!sharedExecutableAuthority) {
      assertExecutableAuthority(targetAuthority, 'post-command target executable');
    }
    requireReviewedPosixAclAuthority([
      ...(spools.stdin === null ? [] : [{
        kind: 'descriptor' as const,
        label: 'reviewed stdin spool after command',
        value: spools.stdin.descriptor,
      }]),
      {
        kind: 'descriptor',
        label: 'reviewed stdout spool after command',
        value: spools.stdout.descriptor,
      },
      {
        kind: 'descriptor',
        label: 'reviewed stderr spool after command',
        value: spools.stderr.descriptor,
      },
    ]);

    if (spools.stdin !== null && stdin !== null) {
      const inspectedInput = validateSpoolAfter(
        spools.stdin,
        stdin.byteLength,
        'reviewed stdin spool after command',
      );
      const stdinDigest = `sha256:${createHash('sha256').update(stdin).digest('hex')}`;
      if (!inspectedInput.bytes.equals(stdin) || inspectedInput.sha256 !== stdinDigest) {
        fail('reviewed POSIX command stdin spool bytes changed');
      }
    }

    const outerStdout = Buffer.isBuffer(outer.stdout) ? outer.stdout : Buffer.alloc(0);
    const firstLineEnd = outerStdout.indexOf(0x0a);
    let guardianArmed = false;
    let resultRaw = outerStdout;
    if (firstLineEnd >= 0 && firstLineEnd + 1 <= MAX_PROTOCOL_BYTES) {
      const handshakeValue = parseCanonicalJson(
        outerStdout.subarray(0, firstLineEnd + 1),
        'reviewed POSIX command handshake',
      );
      if (isRecord(handshakeValue) &&
          handshakeValue.schema === REVIEWED_POSIX_COMMAND_HANDSHAKE_SCHEMA) {
        exactKeys(
          handshakeValue,
          ['guardianArmed', 'schema'],
          'reviewed POSIX command handshake',
        );
        if (handshakeValue.guardianArmed !== true) {
          fail('reviewed POSIX command handshake did not arm its guardian');
        }
        guardianArmed = true;
        resultRaw = outerStdout.subarray(firstLineEnd + 1);
      }
    }

    if (outer.error !== undefined) {
      const code = (outer.error as NodeJS.ErrnoException).code;
      if (code === 'ENOBUFS') fail('reviewed POSIX supervisor crossed its protocol bound');
      if (code === 'ETIMEDOUT') fail('reviewed POSIX supervisor crossed its outer hard timeout');
      fail(`reviewed POSIX supervisor failed: ${code ?? 'unknown error'}`);
    }
    if (outer.status !== 0 || outer.signal !== null) {
      const detail = Buffer.isBuffer(outer.stderr) && outer.stderr.byteLength > 0
        ? decodeUtf8Fatal(outer.stderr, 'reviewed POSIX supervisor stderr')
          .slice(0, 2_048)
          .trimEnd()
        : '';
      fail(
        'reviewed POSIX supervisor failed without a valid result' +
        ` (status ${String(outer.status)}, signal ${String(outer.signal)})` +
        (detail ? `: ${detail}` : ''),
      );
    }
    const outerStderr = Buffer.isBuffer(outer.stderr) ? outer.stderr : Buffer.alloc(0);
    if (outerStderr.byteLength !== 0) {
      fail('reviewed POSIX supervisor wrote outside its protocol envelope');
    }

    const resultValue = parseCanonicalJson(resultRaw, 'reviewed POSIX command result');
    if (!isRecord(resultValue)) fail('reviewed POSIX command result is not an object');
    exactKeys(resultValue, [
      'guardianSweepIntentCount',
      'outputOverflow',
      'schema',
      'signal',
      'spawnError',
      'status',
      'stderrBytes',
      'stderrSha256',
      'stdoutBytes',
      'stdoutSha256',
      'timedOut',
    ], 'reviewed POSIX command result');
    const validSignal = resultValue.signal === null ||
      (typeof resultValue.signal === 'string' && /^SIG[A-Z0-9]+$/u.test(resultValue.signal));
    const validStatus = resultValue.status === null ||
      (typeof resultValue.status === 'number' && Number.isSafeInteger(resultValue.status) &&
        resultValue.status >= 0 && resultValue.status <= 255);
    const validDigest = (value: JsonValue | undefined): value is string =>
      typeof value === 'string' && /^sha256:[0-9a-f]{64}$/u.test(value);
    if (
      resultValue.schema !== REVIEWED_POSIX_COMMAND_RESULT_SCHEMA ||
      (resultValue.guardianSweepIntentCount !== 0 &&
        resultValue.guardianSweepIntentCount !== 1) ||
      typeof resultValue.outputOverflow !== 'boolean' ||
      typeof resultValue.timedOut !== 'boolean' ||
      (resultValue.outputOverflow && resultValue.timedOut) ||
      (resultValue.spawnError !== null &&
        (typeof resultValue.spawnError !== 'string' ||
          resultValue.spawnError.length === 0 || resultValue.spawnError.length > 256)) ||
      !validSignal ||
      !validStatus ||
      typeof resultValue.stdoutBytes !== 'number' ||
      !Number.isSafeInteger(resultValue.stdoutBytes) || resultValue.stdoutBytes < 0 ||
      typeof resultValue.stderrBytes !== 'number' ||
      !Number.isSafeInteger(resultValue.stderrBytes) || resultValue.stderrBytes < 0 ||
      !validDigest(resultValue.stdoutSha256) ||
      !validDigest(resultValue.stderrSha256) ||
      resultValue.stdoutBytes + resultValue.stderrBytes > outputLimitBytes
    ) {
      fail('reviewed POSIX command supervisor returned an invalid result record');
    }

    const stdout = validateSpoolAfter(
      spools.stdout,
      resultValue.stdoutBytes,
      'reviewed stdout spool after command',
    );
    const stderr = validateSpoolAfter(
      spools.stderr,
      resultValue.stderrBytes,
      'reviewed stderr spool after command',
    );
    if (
      stdout.sha256 !== resultValue.stdoutSha256 ||
      stderr.sha256 !== resultValue.stderrSha256
    ) {
      fail('reviewed POSIX command output spools differ from the supervisor receipt');
    }

    const hasSpawnError = resultValue.spawnError !== null;
    const hardStopped = resultValue.timedOut || resultValue.outputOverflow;
    const hasStatus = typeof resultValue.status === 'number';
    const hasSignal = typeof resultValue.signal === 'string';
    if (hasSpawnError) {
      if (
        hasStatus || hasSignal || hardStopped ||
        (resultValue.guardianSweepIntentCount === 0) === guardianArmed
      ) {
        fail('reviewed POSIX command spawn failure has an impossible state');
      }
      fail(`reviewed POSIX target spawn failed: ${String(resultValue.spawnError)}`);
    }
    if (!guardianArmed) fail('reviewed POSIX command result has no guardian handshake');
    if (resultValue.guardianSweepIntentCount !== 1) {
      fail('reviewed POSIX command did not publish exactly one guardian sweep intent');
    }
    if (hardStopped) {
      if (hasStatus || resultValue.signal !== 'SIGKILL') {
        fail('reviewed POSIX command did not terminate with the required hard signal');
      }
    } else if (hasStatus === hasSignal) {
      fail('reviewed POSIX command completion lacks one exact status discriminator');
    }
    return {
      guardianSweepIntentCount: 1,
      status: typeof resultValue.status === 'number' ? resultValue.status : null,
      signal: resultValue.signal as NodeJS.Signals | null,
      stdout: stdout.bytes,
      stderr: stderr.bytes,
      timedOut: resultValue.timedOut,
      outputOverflow: resultValue.outputOverflow,
    };
  });
}

export { EMPTY_SHA256 as REVIEWED_POSIX_EMPTY_SHA256 };

export const reviewedPosixCommandTesting = Object.freeze({
  outerTimeoutMs: reviewedPosixOuterTimeoutMs,
});
