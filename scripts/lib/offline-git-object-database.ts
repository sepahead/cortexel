/**
 * Shared fail-closed authority checks for source inventories that read a
 * temporary, network-disconnected Git object database.
 *
 * These checks establish a bounded pathname/object-database shape at the instants
 * they run; they do not establish backing-device locality. They are not hostile
 * same-user containment: callers must re-run them
 * immediately before and after active reads. The verifier checks current-user
 * ownership, exact Unix permission/special bits, and the reviewed
 * non-authorizing path/descriptor POSIX ACL profile on the temporary root. It does not establish hostile
 * same-user containment during or after acquisition.
 */
import { createHash } from 'node:crypto';
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  opendirSync,
  readSync,
  realpathSync,
  unlinkSync,
  type BigIntStats,
  type Dir,
} from 'node:fs';
import path from 'node:path';
import { types as utilTypes } from 'node:util';

import {
  currentPosixUid,
  requireExactPrivateDirectoryAuthority,
  type ExactPrivateDirectoryAuthority,
} from './posix-acl-authority.js';
import {
  inspectReviewedGitObjectIntegrityBatch,
  processReviewedGitRuntime,
  runReviewedGitCommand,
  type ReviewedGitRuntime,
} from './reviewed-git-command.js';
import { REVIEWED_POSIX_COMMAND_LIMITS } from './reviewed-posix-command.js';

const MAX_OBJECT_DATABASE_ENTRIES = 1_000_000;
const MAX_LOCAL_GIT_CONFIG_BYTES = 1024 * 1024;
const MAX_AUTHORITY_PATH_BYTES = 4_096;
const MAX_DIRECTORY_ENTRY_NAME_BYTES = 4_096;
const MAX_VERIFIED_GIT_OBJECTS = 100_000;
const GIT_OBJECT_INTEGRITY_HASH_DOMAIN =
  'cortexel-offline-git-object-integrity-v1\0';
const EXPECTED_REGULAR_OPEN_FLAGS =
  fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;
const VERIFIED_OFFLINE_GIT_READ_AUTHORITY = Symbol(
  'verified offline Git read authority',
);

const CONTROLLED_GIT_CONFIG_ARGUMENTS = Object.freeze([
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
const MAX_CONTROLLED_GIT_CALLER_ARGUMENTS = 1_000;

export interface OfflineGitObjectDatabaseSnapshot {
  readonly repository: string;
  readonly temporaryRoot: string;
  readonly temporaryRootIdentity: string;
  readonly temporaryRootMode: string;
  readonly temporaryRootUid: string;
  readonly gitDirectory: string;
  readonly objectDirectory: string;
  readonly repositoryIdentity: string;
  readonly gitDirectoryIdentity: string;
  readonly objectDirectoryIdentity: string;
  readonly configIdentity: string;
  readonly configSha256: string;
  readonly inspectedObjectDatabaseEntryCount: number;
  readonly objectDatabaseShapeSha256: string;
  readonly objectContentSetSha256: string;
}

export interface VerifiedOfflineGitReadAuthority {
  readonly [VERIFIED_OFFLINE_GIT_READ_AUTHORITY]: true;
  readonly repository: string;
  readonly temporaryRoot: string;
}

interface OfflineGitReadAuthoritySnapshot {
  readonly repository: string;
  readonly temporaryRoot: string;
  readonly temporaryRootIdentity: string;
  readonly gitDirectory: string;
  readonly objectDirectory: string;
  readonly repositoryIdentity: string;
  readonly gitDirectoryIdentity: string;
  readonly objectDirectoryIdentity: string;
  readonly configIdentity: string;
  readonly configSha256: string;
  readonly inspectedObjectDatabaseEntryCount: number;
  readonly objectDatabaseShapeSha256: string;
}

const VERIFIED_OFFLINE_GIT_READ_AUTHORITIES = new WeakMap<
  object,
  {
    readonly runtime: ReviewedGitRuntime;
    readonly snapshot: OfflineGitReadAuthoritySnapshot;
  }
>();

function fail(label: string, message: string): never {
  throw new Error(`${label}: ${message}`);
}

function exactAbsolutePath(value: unknown, where: string, label: string): string {
  if (
    typeof value !== 'string' ||
    value.length > MAX_AUTHORITY_PATH_BYTES ||
    Buffer.byteLength(value, 'utf8') > MAX_AUTHORITY_PATH_BYTES ||
    value.includes('\0') ||
    !path.isAbsolute(value) ||
    path.resolve(value) !== value
  ) {
    fail(label, `${where} must be absolute, normalized, primitive, and bounded`);
  }
  return value;
}

function ownDataArray(
  value: unknown,
  where: string,
  maximumLength: number,
): readonly unknown[] {
  if (!Array.isArray(value) || utilTypes.isProxy(value)) {
    throw new Error(`${where} must be a direct array`);
  }
  let prototype: object | null;
  let lengthDescriptor: PropertyDescriptor | undefined;
  try {
    prototype = Object.getPrototypeOf(value);
    lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  } catch {
    throw new Error(`${where} cannot be inspected safely`);
  }
  if (
    prototype !== Array.prototype ||
    lengthDescriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value') ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > maximumLength
  ) {
    throw new Error(`${where} has invalid or excessive length authority`);
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
      throw new Error(`${where} must be dense and contain no extra enumerable members`);
    }
    const index = /^(?:0|[1-9][0-9]*)$/u.test(key) ? Number(key) : -1;
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= length ||
      String(index) !== key ||
      !Object.prototype.hasOwnProperty.call(value, key)
    ) {
      throw new Error(`${where} must be dense and contain no extra enumerable members`);
    }
  }
  const snapshot: unknown[] = [];
  for (let index = 0; index < length; index++) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    } catch {
      throw new Error(`${where}[${index}] cannot be inspected safely`);
    }
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new Error(`${where}[${index}] must be an enumerable own data property`);
    }
    snapshot.push(descriptor.value);
  }
  return Object.freeze(snapshot);
}

function ownDataRecord(
  value: unknown,
  where: string,
  exactKeys: readonly string[],
): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    utilTypes.isProxy(value)
  ) {
    throw new Error(`${where} must be a plain own-data object`);
  }
  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(value);
  } catch {
    throw new Error(`${where} cannot be inspected safely`);
  }
  const expected = new Set(exactKeys);
  let maximumExpectedKeyCodeUnits = 0;
  for (const key of expected) {
    maximumExpectedKeyCodeUnits = Math.max(maximumExpectedKeyCodeUnits, key.length);
  }
  if (
    prototype !== Object.prototype && prototype !== null
  ) {
    throw new Error(`${where} does not have its exact reviewed own-data shape`);
  }
  const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  let enumerated = 0;
  for (const key in value as Record<string, unknown>) {
    enumerated++;
    if (
      enumerated > expected.size ||
      key.length > maximumExpectedKeyCodeUnits ||
      !expected.has(key) ||
      !Object.prototype.hasOwnProperty.call(value, key)
    ) {
      throw new Error(`${where} does not have its exact reviewed own-data shape`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      throw new Error(`${where}.${key} cannot be inspected safely`);
    }
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new Error(`${where}.${key} must be an enumerable own data property`);
    }
    snapshot[key] = descriptor.value;
  }
  if (exactKeys.some((key) => !Object.prototype.hasOwnProperty.call(snapshot, key))) {
    throw new Error(`${where} does not have its exact reviewed own-data shape`);
  }
  return Object.freeze(snapshot);
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
        `${label}: directory inspection failed and descriptor close was ambiguous`,
      );
    }
    throw outcome.error;
  }
  if (closeFailed) {
    throw new AggregateError(
      [closeError],
      `${label}: directory descriptor close was ambiguous`,
    );
  }
  return outcome.value;
}

function boundedDirectoryNames(
  directoryPath: string,
  label: string,
  maximumEntries: number,
): readonly string[] {
  if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 0) {
    fail(label, 'directory entry bound is invalid');
  }
  const directory = opendirSync(directoryPath, { encoding: 'utf8' });
  const names = withClosedDirectory(directory, label, () => {
    const inspected: string[] = [];
    while (true) {
      const entry = directory.readSync();
      if (entry === null) break;
      if (inspected.length >= maximumEntries) {
        fail(label, `directory exceeds its ${maximumEntries}-entry bound`);
      }
      if (Buffer.byteLength(entry.name, 'utf8') > MAX_DIRECTORY_ENTRY_NAME_BYTES) {
        fail(label, 'directory contains an excessive entry name');
      }
      inspected.push(entry.name);
    }
    return inspected;
  });
  names.sort();
  return Object.freeze(names);
}

function directoryIsEmpty(directoryPath: string, label: string): boolean {
  const directory = opendirSync(directoryPath, { encoding: 'utf8' });
  return withClosedDirectory(
    directory,
    label,
    () => directory.readSync() === null,
  );
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
        `${label}: file inspection failed and descriptor close was ambiguous`,
      );
    }
    throw outcome.error;
  }
  if (closeFailed) {
    throw new AggregateError(
      [closeError],
      `${label}: file descriptor close was ambiguous`,
    );
  }
  return outcome.value;
}

function sameAuthority(left: BigIntStats, right: BigIntStats): boolean {
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

/**
 * Admit only the minimal process context needed by Git. The controlled home is
 * an empty directory during network acquisition and /dev/null for offline
 * inspection, preventing ambient config, .netrc, helpers, proxies, and exported
 * secrets from entering Git or its HTTPS transport.
 */
export function controlledGitEnvironment(
  controlledHome = '/dev/null',
): NodeJS.ProcessEnv {
  const home = exactAbsolutePath(
    controlledHome,
    'controlled Git home',
    'controlled Git environment',
  );
  return {
    HOME: home,
    LANG: 'C',
    LC_ALL: 'C',
    PATH: '/usr/bin:/bin',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_COUNT: '0',
    GIT_NO_REPLACE_OBJECTS: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0',
    GIT_PROTOCOL_FROM_USER: '0',
    GIT_ALLOW_PROTOCOL: 'https',
    GIT_ATTR_NOSYSTEM: '1',
    GIT_LFS_SKIP_SMUDGE: '1',
  };
}

/**
 * Build the exact Git argv shared by acquisition and offline verification.
 * Fetch always disables its post-command auto-maintenance hook; every command
 * also disables all configured auto-maintenance/GC detachment paths.
 */
export function controlledGitCommandArguments(
  repository: string,
  args: readonly string[],
  hooksDirectory?: string,
): readonly string[] {
  const repositoryPath = exactAbsolutePath(
    repository,
    'controlled Git repository',
    'controlled Git arguments',
  );
  const hookPath = hooksDirectory === undefined
    ? undefined
    : exactAbsolutePath(
        hooksDirectory,
        'controlled Git hooks directory',
        'controlled Git arguments',
      );
  const argumentValues = ownDataArray(
    args,
    'controlled Git caller arguments',
    MAX_CONTROLLED_GIT_CALLER_ARGUMENTS,
  );
  if (argumentValues.length === 0) throw new Error('controlled Git command is missing');
  const argumentSnapshot: string[] = [];
  let aggregateBytes = 0;
  for (const [index, argument] of argumentValues.entries()) {
    if (typeof argument !== 'string') {
      throw new Error(`controlled Git caller argument ${index} is not a bounded string`);
    }
    if (
      argument.length > REVIEWED_POSIX_COMMAND_LIMITS.argumentBytes ||
      argument.includes('\0')
    ) {
      throw new Error(`controlled Git caller argument ${index} is not a bounded string`);
    }
    const argumentBytes = Buffer.byteLength(argument, 'utf8');
    if (argumentBytes > REVIEWED_POSIX_COMMAND_LIMITS.argumentBytes) {
      throw new Error(`controlled Git caller argument ${index} is not a bounded string`);
    }
    aggregateBytes += argumentBytes;
    if (aggregateBytes > REVIEWED_POSIX_COMMAND_LIMITS.payloadBytes) {
      throw new Error('controlled Git caller arguments exceed their aggregate byte bound');
    }
    argumentSnapshot.push(argument);
  }
  if (
    argumentSnapshot.includes('--auto-maintenance') ||
    argumentSnapshot.includes('--no-auto-maintenance') ||
    argumentSnapshot.includes('--auto-gc') ||
    argumentSnapshot.includes('--no-auto-gc')
  ) {
    throw new Error('controlled Git owns the auto-maintenance option');
  }
  const command = argumentSnapshot[0]!;
  const commandArguments = command === 'fetch'
    ? [command, '--no-auto-maintenance', ...argumentSnapshot.slice(1)]
    : argumentSnapshot;
  return Object.freeze([
    '--no-replace-objects',
    ...CONTROLLED_GIT_CONFIG_ARGUMENTS,
    ...(hookPath === undefined
      ? []
      : ['-c', `core.hooksPath=${hookPath}`]),
    '-C',
    repositoryPath,
    ...commandArguments,
  ]);
}

function gitResult(
  repository: string,
  args: readonly string[],
  runtime: ReviewedGitRuntime,
) {
  return runReviewedGitCommand(
    runtime,
    repository,
    controlledGitCommandArguments(repository, args),
    {
      acceptedStatuses: [0, 1],
      environment: { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
      outputLimitBytes: 8 * 1024 * 1024,
      timeoutMs: 30_000,
    },
  );
}

function gitText(
  repository: string,
  args: readonly string[],
  label: string,
  runtime: ReviewedGitRuntime,
): string {
  const result = gitResult(repository, args, runtime);
  if (result.status !== 0 || result.signal !== null) {
    fail(label, `git ${args[0] ?? '<missing>'} failed`);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
      .decode(result.stdout);
  } catch {
    fail(label, `git ${args[0] ?? '<missing>'} output is not UTF-8`);
  }
}

function gitOptionalText(
  repository: string,
  args: readonly string[],
  label: string,
  runtime: ReviewedGitRuntime,
): { readonly status: 0 | 1; readonly stdout: string } {
  const result = gitResult(repository, args, runtime);
  if (result.signal !== null || (result.status !== 0 && result.status !== 1)) {
    fail(label, `git ${args[0] ?? '<missing>'} failed`);
  }
  let stdout: string;
  try {
    stdout = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
      .decode(result.stdout);
  } catch {
    fail(label, `git ${args[0] ?? '<missing>'} output is not UTF-8`);
  }
  return {
    status: result.status as 0 | 1,
    stdout,
  };
}

export interface OfflineGitObjectIdentity {
  readonly identity: string;
  readonly objectType: 'blob' | 'commit' | 'tag' | 'tree';
}

/**
 * Low-level enumeration with lazy fetching disabled. This does not itself
 * reject a configured local alternate; acquisition flows must first consume a
 * `VerifiedOfflineGitReadAuthority` or use an authority-bound wrapper.
 */
export function inspectOfflineGitObjectSet(
  repository: string,
  label: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): readonly OfflineGitObjectIdentity[] {
  const output = gitText(
    repository,
    [
      'cat-file',
      '--batch-all-objects',
      '--batch-check=%(objectname) %(objecttype)',
    ],
    label,
    reviewedGit,
  ).trimEnd();
  if (output.length === 0) return Object.freeze([]);
  const identities: OfflineGitObjectIdentity[] = [];
  const seen = new Set<string>();
  for (const line of output.split('\n')) {
    const match = /^([0-9a-f]{40}) (blob|commit|tag|tree)$/u.exec(line);
    if (match === null || seen.has(match[1]!)) {
      fail(label, 'local Git object enumeration is malformed or duplicated');
    }
    seen.add(match[1]!);
    identities.push(Object.freeze({
      identity: match[1]!,
      objectType: match[2]! as OfflineGitObjectIdentity['objectType'],
    }));
  }
  identities.sort((left, right) => left.identity.localeCompare(right.identity));
  return Object.freeze(identities);
}

function normalizedExpectedObjectSet(
  expected: readonly OfflineGitObjectIdentity[],
  label: string,
): readonly OfflineGitObjectIdentity[] {
  const values = ownDataArray(
    expected,
    `${label} expected Git object set`,
    MAX_VERIFIED_GIT_OBJECTS,
  );
  const identities: OfflineGitObjectIdentity[] = [];
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    const record = ownDataRecord(
      value,
      `${label} expected Git object ${index}`,
      ['identity', 'objectType'],
    );
    if (
      typeof record.identity !== 'string' ||
      !/^[0-9a-f]{40}$/u.test(record.identity) ||
      typeof record.objectType !== 'string' ||
      !['blob', 'commit', 'tag', 'tree'].includes(record.objectType) ||
      seen.has(record.identity)
    ) {
      fail(label, 'expected Git object set is malformed or duplicated');
    }
    seen.add(record.identity);
    identities.push(Object.freeze({
      identity: record.identity,
      objectType: record.objectType as OfflineGitObjectIdentity['objectType'],
    }));
  }
  identities.sort((left, right) => left.identity.localeCompare(right.identity));
  return Object.freeze(identities);
}

function inspectOfflineGitObjectContentSet(
  repository: string,
  label: string,
  reviewedGit: ReviewedGitRuntime,
): {
  readonly identities: readonly OfflineGitObjectIdentity[];
  readonly contentSetSha256: string;
} {
  const identities = inspectOfflineGitObjectSet(repository, label, reviewedGit);
  if (identities.length > MAX_VERIFIED_GIT_OBJECTS) {
    fail(label, `local Git object count exceeds its ${MAX_VERIFIED_GIT_OBJECTS}-object bound`);
  }
  const aggregate = createHash('sha256').update(GIT_OBJECT_INTEGRITY_HASH_DOMAIN);
  if (identities.length === 0) {
    return Object.freeze({
      identities,
      contentSetSha256: `sha256:${aggregate.digest('hex')}`,
    });
  }
  const records = inspectReviewedGitObjectIntegrityBatch(
    reviewedGit,
    repository,
    controlledGitCommandArguments(repository, ['cat-file', '--batch']),
    { ...controlledGitEnvironment(), GIT_NO_LAZY_FETCH: '1' },
    identities.map(({ identity, objectType }) => Object.freeze({
      objectName: identity,
      expectedGitObjectSha1: identity,
      expectedObjectType: objectType,
    })),
    {
      outputLimitBytes: REVIEWED_POSIX_COMMAND_LIMITS.outputBytes,
      timeoutMs: REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs,
    },
  );
  if (
    records.length !== identities.length ||
    records.some((record, index) =>
      record.gitObjectSha1 !== identities[index]?.identity ||
      record.objectType !== identities[index]?.objectType)
  ) {
    fail(label, 'canonical Git object-integrity batch changed identity or order');
  }
  for (const record of records) {
    aggregate.update(JSON.stringify([
      record.gitObjectSha1,
      record.objectType,
      record.byteLength,
      record.sha256,
    ]));
    aggregate.update('\0');
  }
  return Object.freeze({
    identities,
    contentSetSha256: `sha256:${aggregate.digest('hex')}`,
  });
}

export function requireExactOfflineGitObjectSet(
  repository: string,
  expected: readonly OfflineGitObjectIdentity[],
  label: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): void {
  const normalizedExpected = normalizedExpectedObjectSet(expected, label);
  const actual = inspectOfflineGitObjectContentSet(
    repository,
    label,
    reviewedGit,
  ).identities;
  if (
    actual.length !== normalizedExpected.length ||
    actual.some((entry, index) =>
      entry.identity !== normalizedExpected[index]?.identity ||
      entry.objectType !== normalizedExpected[index]?.objectType)
  ) {
    fail(label, 'local Git object set differs from its exact expected closure');
  }
}

/** Derive the commit plus every unique reachable tree object from one exact root. */
export function deriveOfflineGitStructuralObjectSet(
  repository: string,
  commit: string,
  rootTree: string,
  label: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): readonly OfflineGitObjectIdentity[] {
  if (
    typeof commit !== 'string' ||
    typeof rootTree !== 'string' ||
    !/^[0-9a-f]{40}$/u.test(commit) ||
    !/^[0-9a-f]{40}$/u.test(rootTree)
  ) {
    fail(label, 'pinned structural Git identities are malformed');
  }
  const expected = new Map<string, OfflineGitObjectIdentity['objectType']>([
    [commit, 'commit'],
    [rootTree, 'tree'],
  ]);
  const output = gitText(
    repository,
    ['ls-tree', '-r', '-t', '-z', commit],
    label,
    reviewedGit,
  );
  for (const record of output.split('\0')) {
    if (record.length === 0) continue;
    const tab = record.indexOf('\t');
    const header = tab < 0 ? '' : record.slice(0, tab);
    const match = /^(?:040000|100644|100755|120000|160000) (blob|commit|tree) ([0-9a-f]{40})$/u
      .exec(header);
    if (match === null) fail(label, 'pinned Git tree enumeration is malformed');
    if (match[1] === 'tree') expected.set(match[2]!, 'tree');
  }
  return Object.freeze(
    [...expected]
      .map(([identity, objectType]) => Object.freeze({ identity, objectType }))
      .sort((left, right) => left.identity.localeCompare(right.identity)),
  );
}

function directDirectory(input: string, where: string, label: string): string {
  const directPath = exactAbsolutePath(input, where, label);
  const before = lstatSync(directPath, { bigint: true });
  const resolved = realpathSync(directPath);
  const after = lstatSync(directPath, { bigint: true });
  if (
    resolved !== directPath ||
    !before.isDirectory() ||
    before.isSymbolicLink() ||
    !after.isDirectory() ||
    after.isSymbolicLink() ||
    after.uid !== currentPosixUid() ||
    !sameAuthority(before, after)
  ) {
    fail(label, `${where} must be a direct directory`);
  }
  return directPath;
}

function directRegularFile(input: string, where: string, label: string): BigIntStats {
  const directPath = exactAbsolutePath(input, where, label);
  const before = lstatSync(directPath, { bigint: true });
  const resolved = realpathSync(directPath);
  const after = lstatSync(directPath, { bigint: true });
  if (
    resolved !== directPath ||
    !before.isFile() ||
    before.isSymbolicLink() ||
    !after.isFile() ||
    after.isSymbolicLink() ||
    after.nlink !== 1n ||
    after.uid !== currentPosixUid() ||
    !sameAuthority(before, after)
  ) {
    fail(label, `${where} must be a direct regular file`);
  }
  return after;
}

function readBoundedDirectRegularFile(
  input: string,
  where: string,
  label: string,
  maximumBytes: number,
  trustedBeforeOpenHook?: () => void,
): Buffer {
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 0 ||
    maximumBytes > MAX_LOCAL_GIT_CONFIG_BYTES
  ) {
    fail(label, `${where} byte bound is invalid`);
  }
  if (
    typeof fsConstants.O_NOFOLLOW !== 'number' ||
    typeof fsConstants.O_NONBLOCK !== 'number'
  ) {
    fail(label, `${where} nonblocking no-follow authority is unavailable`);
  }
  const before = directRegularFile(input, where, label);
  trustedBeforeOpenHook?.();
  const descriptor = openSync(input, EXPECTED_REGULAR_OPEN_FLAGS);
  return withClosedDescriptor(descriptor, label, () => {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || !sameAuthority(before, opened)) {
      fail(label, `${where} identity changed while opening`);
    }
    if (opened.size < 0n || opened.size > BigInt(maximumBytes)) {
      fail(label, `${where} exceeds its ${maximumBytes}-byte bound`);
    }
    const size = Number(opened.size);
    const bytes = Buffer.allocUnsafe(size);
    let offset = 0;
    while (offset < size) {
      const count = readSync(
        descriptor,
        bytes,
        offset,
        Math.min(1024 * 1024, size - offset),
        offset,
      );
      if (count <= 0) fail(label, `${where} ended before its reviewed size`);
      offset += count;
    }
    const overflowProbe = Buffer.allocUnsafe(1);
    if (readSync(descriptor, overflowProbe, 0, 1, size) !== 0) {
      fail(label, `${where} grew beyond its reviewed size`);
    }
    const descriptorAfter = fstatSync(descriptor, { bigint: true });
    const pathAfter = directRegularFile(input, where, label);
    if (
      !sameAuthority(opened, descriptorAfter) ||
      !sameAuthority(opened, pathAfter)
    ) {
      fail(label, `${where} identity changed while reading`);
    }
    return bytes;
  });
}

function identity(input: string): string {
  const stat = lstatSync(input, { bigint: true });
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
  ].map((value) => value.toString()).join(':');
}

function inspectDirectObjectDatabase(
  objectDirectory: string,
  label: string,
): {
  readonly count: number;
  readonly shapeSha256: string;
} {
  const pending = [objectDirectory];
  let count = 0;
  const shape = createHash('sha256');
  const currentUid = currentPosixUid();
  while (pending.length > 0) {
    const directory = pending.pop()!;
    const names = boundedDirectoryNames(
      directory,
      label,
      MAX_OBJECT_DATABASE_ENTRIES - count,
    );
    for (const name of names) {
      count++;
      if (count > MAX_OBJECT_DATABASE_ENTRIES) {
        fail(label, 'object database entry bound exceeded');
      }
      const entry = path.join(directory, name);
      const relativeEntry = path.relative(objectDirectory, entry);
      if (
        relativeEntry.endsWith('.promisor') ||
        relativeEntry.endsWith('.rev') ||
        /(?:^|\/)tmp[-_]/u.test(relativeEntry)
      ) {
        fail(
          label,
          'object database contains temporary or acquisition-sidecar residue',
        );
      }
      const stat = lstatSync(entry, { bigint: true });
      if (stat.isSymbolicLink()) {
        fail(label, 'object database must not contain symbolic links');
      }
      if (stat.uid !== currentUid || (stat.isFile() && stat.nlink !== 1n)) {
        fail(label, 'object database entries must have direct single-link current-UID authority');
      }
      shape.update(JSON.stringify([
        relativeEntry,
        stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'special',
        stat.dev.toString(),
        stat.ino.toString(),
        stat.mode.toString(),
        stat.size.toString(),
        stat.nlink.toString(),
        stat.uid.toString(),
        stat.gid.toString(),
        stat.mtimeNs.toString(),
        stat.ctimeNs.toString(),
        stat.birthtimeNs.toString(),
      ]));
      shape.update('\0');
      if (stat.isDirectory()) {
        if (realpathSync(entry) !== entry) {
          fail(label, 'object database directory path traverses a symbolic link');
        }
        pending.push(entry);
        continue;
      }
      if (!stat.isFile() || realpathSync(entry) !== entry) {
        fail(label, 'object database entries must be direct regular files or directories');
      }
    }
  }
  return { count, shapeSha256: `sha256:${shape.digest('hex')}` };
}

function verifyDirectPackFamilies(
  repository: string,
  objectDirectory: string,
  label: string,
  reviewedGit: ReviewedGitRuntime,
): ReadonlySet<string> {
  const packDirectory = directDirectory(
    path.join(objectDirectory, 'pack'),
    'repository pack directory',
    label,
  );
  const families = new Map<string, Set<'idx' | 'pack'>>();
  for (const name of boundedDirectoryNames(
    packDirectory,
    label,
    MAX_OBJECT_DATABASE_ENTRIES,
  )) {
    const match = /^(pack-[0-9a-f]{40})\.(idx|pack)$/u.exec(name);
    if (match === null) {
      fail(label, 'repository pack directory contains an unreviewed entry');
    }
    const entry = path.join(packDirectory, name);
    directRegularFile(entry, 'repository pack entry', label);
    const family = families.get(match[1]!) ?? new Set<'idx' | 'pack'>();
    if (family.has(match[2]! as 'idx' | 'pack')) {
      fail(label, 'repository pack family contains a duplicate member');
    }
    family.add(match[2]! as 'idx' | 'pack');
    families.set(match[1]!, family);
  }

  const packedIdentities = new Set<string>();
  for (const [stem, extensions] of [...families].sort(([left], [right]) =>
    left.localeCompare(right))) {
    if (extensions.size !== 2 || !extensions.has('idx') || !extensions.has('pack')) {
      fail(label, 'repository pack family is incomplete');
    }
    if (
      lstatSync(path.join(packDirectory, `${stem}.idx`)).size < 32 ||
      lstatSync(path.join(packDirectory, `${stem}.pack`)).size < 32
    ) {
      fail(label, 'repository pack family is truncated');
    }
    const output = gitText(
      repository,
      ['verify-pack', '-v', path.join(packDirectory, `${stem}.idx`)],
      label,
      reviewedGit,
    );
    let familyObjectCount = 0;
    for (const line of output.split('\n')) {
      const match = /^([0-9a-f]{40}) (blob|commit|tag|tree) /u.exec(line);
      if (match === null) continue;
      familyObjectCount++;
      if (packedIdentities.has(match[1]!)) {
        fail(label, 'repository packs contain a duplicate object identity');
      }
      packedIdentities.add(match[1]!);
    }
    if (familyObjectCount === 0) {
      fail(label, 'repository pack verification returned no object rows');
    }
  }
  return packedIdentities;
}

function verifyDirectLooseObjectShape(
  objectDirectory: string,
  packedIdentities: ReadonlySet<string>,
  label: string,
): void {
  const infoDirectory = directDirectory(
    path.join(objectDirectory, 'info'),
    'repository object-info directory',
    label,
  );
  if (!directoryIsEmpty(infoDirectory, label)) {
    fail(label, 'repository object-info directory must be empty');
  }
  const looseIdentities = new Set<string>();
  for (const name of boundedDirectoryNames(
    objectDirectory,
    label,
    MAX_OBJECT_DATABASE_ENTRIES,
  )) {
    if (name === 'info' || name === 'pack') continue;
    if (!/^[0-9a-f]{2}$/u.test(name)) {
      fail(label, 'repository object database has an invalid loose-object directory');
    }
    const directory = directDirectory(
      path.join(objectDirectory, name),
      'repository loose-object directory',
      label,
    );
    for (const leaf of boundedDirectoryNames(
      directory,
      label,
      MAX_OBJECT_DATABASE_ENTRIES,
    )) {
      if (!/^[0-9a-f]{38}$/u.test(leaf)) {
        fail(label, 'repository object database has an invalid loose-object entry');
      }
      const entry = path.join(directory, leaf);
      directRegularFile(entry, 'repository loose object', label);
      const identity = `${name}${leaf}`;
      if (looseIdentities.has(identity) || packedIdentities.has(identity)) {
        fail(label, 'repository object database duplicates an object physically');
      }
      looseIdentities.add(identity);
    }
  }
}

function rejectEntry(input: string, message: string, label: string): void {
  if (lstatSync(input, { throwIfNoEntry: false }) !== undefined) {
    fail(label, message);
  }
}

/** Remove only reviewed, non-authoritative transport/index sidecars after fetch. */
export function removeGitAcquisitionSidecars(
  repositoryPath: string,
  label: string,
): void {
  const repository = directDirectory(repositoryPath, 'repository', label);
  const packDirectory = directDirectory(
    path.join(repository, '.git', 'objects', 'pack'),
    'repository pack directory',
    label,
  );
  for (const name of boundedDirectoryNames(
    packDirectory,
    label,
    MAX_OBJECT_DATABASE_ENTRIES,
  )) {
    if (/^(?:tmp_|tmp-)/u.test(name)) {
      fail(label, 'Git object database contains a temporary pack entry');
    }
    const match = /^(pack-[0-9a-f]{40})\.(promisor|rev)$/u.exec(name);
    if (match === null) continue;
    const marker = path.join(packDirectory, name);
    directRegularFile(marker, 'Git acquisition sidecar', label);
    const stem = match[1]!;
    directRegularFile(
      path.join(packDirectory, `${stem}.idx`),
      'Git acquisition pack index',
      label,
    );
    directRegularFile(
      path.join(packDirectory, `${stem}.pack`),
      'Git acquisition pack',
      label,
    );
    unlinkSync(marker);
  }
  if (boundedDirectoryNames(
    packDirectory,
    label,
    MAX_OBJECT_DATABASE_ENTRIES,
  ).some((name) =>
    name.endsWith('.promisor') || name.endsWith('.rev'))) {
    fail(label, 'Git object database retains acquisition sidecar metadata');
  }
}

function inspectOfflineGitReadAuthority(
  repositoryPath: string,
  temporaryRootPath: string,
  label: string,
  reviewedGit: ReviewedGitRuntime,
): OfflineGitReadAuthoritySnapshot {
  const temporaryRoot = directDirectory(
    temporaryRootPath,
    'offline-read temporary root',
    label,
  );
  let temporaryRootAuthority: ExactPrivateDirectoryAuthority;
  try {
    temporaryRootAuthority = requireExactPrivateDirectoryAuthority(
      temporaryRoot,
      'offline-read temporary root',
    );
  } catch (error) {
    fail(
      label,
      error instanceof Error ? error.message : 'temporary-root authority failed',
    );
  }
  const repository = directDirectory(
    repositoryPath,
    'offline-read repository',
    label,
  );
  if (path.dirname(repository) !== temporaryRoot) {
    fail(label, 'offline-read repository must be a direct child of its temporary root');
  }
  const gitDirectory = directDirectory(
    path.join(repository, '.git'),
    'offline-read .git directory',
    label,
  );
  const config = path.join(gitDirectory, 'config');
  directRegularFile(config, 'offline-read repository-local Git config', label);
  rejectEntry(
    path.join(gitDirectory, 'commondir'),
    'offline-read repository must not redirect its common Git directory',
    label,
  );
  rejectEntry(
    path.join(gitDirectory, 'config.worktree'),
    'offline-read repository must not carry per-worktree Git configuration',
    label,
  );
  const objectDirectory = directDirectory(
    path.join(gitDirectory, 'objects'),
    'offline-read object database',
    label,
  );
  const objectInfoDirectory = directDirectory(
    path.join(objectDirectory, 'info'),
    'offline-read object-info directory',
    label,
  );
  // These pathname checks precede every Git command and every object-content
  // operation. An otherwise available object in an alternate is never admitted
  // while establishing this authority.
  rejectEntry(
    path.join(objectInfoDirectory, 'alternates'),
    'offline-read repository uses an alternate Git object database',
    label,
  );
  rejectEntry(
    path.join(objectInfoDirectory, 'http-alternates'),
    'offline-read repository uses an HTTP alternate Git object database',
    label,
  );
  const objectDatabaseInspection = inspectDirectObjectDatabase(
    objectDirectory,
    label,
  );
  const forbiddenConfiguration = gitOptionalText(
    repository,
    [
      'config',
      '--local',
      '--no-includes',
      '--get-regexp',
      '^(remote\\.|extensions\\.(partialclone|worktreeconfig)$|include(if)?\\.)',
    ],
    label,
    reviewedGit,
  );
  if (
    forbiddenConfiguration.status === 0 ||
    forbiddenConfiguration.stdout.trim().length !== 0
  ) {
    fail(label, 'offline-read repository retains remote, promisor, or config redirection');
  }
  if (gitText(repository, ['remote'], label, reviewedGit).trim().length !== 0) {
    fail(label, 'offline-read repository still has a configured remote');
  }
  const configBytes = readBoundedDirectRegularFile(
    config,
    'offline-read repository-local Git config',
    label,
    MAX_LOCAL_GIT_CONFIG_BYTES,
  );
  return Object.freeze({
    repository,
    temporaryRoot,
    temporaryRootIdentity:
      `${temporaryRootAuthority.device}:${temporaryRootAuthority.inode}`,
    gitDirectory,
    objectDirectory,
    repositoryIdentity: identity(repository),
    gitDirectoryIdentity: identity(gitDirectory),
    objectDirectoryIdentity: identity(objectDirectory),
    configIdentity: identity(config),
    configSha256:
      `sha256:${createHash('sha256').update(configBytes).digest('hex')}`,
    inspectedObjectDatabaseEntryCount: objectDatabaseInspection.count,
    objectDatabaseShapeSha256: objectDatabaseInspection.shapeSha256,
  });
}

function sameOfflineGitReadAuthority(
  left: OfflineGitReadAuthoritySnapshot,
  right: OfflineGitReadAuthoritySnapshot,
): boolean {
  return left.repository === right.repository &&
    left.temporaryRoot === right.temporaryRoot &&
    left.temporaryRootIdentity === right.temporaryRootIdentity &&
    left.gitDirectory === right.gitDirectory &&
    left.objectDirectory === right.objectDirectory &&
    left.repositoryIdentity === right.repositoryIdentity &&
    left.gitDirectoryIdentity === right.gitDirectoryIdentity &&
    left.objectDirectoryIdentity === right.objectDirectoryIdentity &&
    left.configIdentity === right.configIdentity &&
    left.configSha256 === right.configSha256 &&
    left.inspectedObjectDatabaseEntryCount ===
      right.inspectedObjectDatabaseEntryCount &&
    left.objectDatabaseShapeSha256 === right.objectDatabaseShapeSha256;
}

/**
 * Establish a non-transferable pre-object-read authority after acquisition
 * network state has been revoked. This inspects object-database shape, not
 * object content.
 */
export function verifyOfflineGitReadAuthority(
  repositoryPath: string,
  temporaryRootPath: string,
  label: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): VerifiedOfflineGitReadAuthority {
  const snapshot = inspectOfflineGitReadAuthority(
    repositoryPath,
    temporaryRootPath,
    label,
    reviewedGit,
  );
  const authority = Object.freeze({
    [VERIFIED_OFFLINE_GIT_READ_AUTHORITY]: true as const,
    repository: snapshot.repository,
    temporaryRoot: snapshot.temporaryRoot,
  });
  VERIFIED_OFFLINE_GIT_READ_AUTHORITIES.set(authority, {
    runtime: reviewedGit,
    snapshot,
  });
  return authority;
}

/** Revalidate and consume one opaque authority before an object-reading phase. */
export function requireOfflineGitReadAuthority(
  authority: VerifiedOfflineGitReadAuthority,
  label: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): string {
  if (
    authority === null ||
    typeof authority !== 'object' ||
    utilTypes.isProxy(authority)
  ) {
    fail(label, 'offline Git read authority is not an opaque verified state');
  }
  const retained = VERIFIED_OFFLINE_GIT_READ_AUTHORITIES.get(authority);
  if (retained === undefined || retained.runtime !== reviewedGit) {
    fail(label, 'offline Git read authority is unrecognized or bound to another runtime');
  }
  const current = inspectOfflineGitReadAuthority(
    retained.snapshot.repository,
    retained.snapshot.temporaryRoot,
    label,
    reviewedGit,
  );
  if (!sameOfflineGitReadAuthority(retained.snapshot, current)) {
    fail(label, 'offline Git read authority changed after its verified transition');
  }
  return retained.snapshot.repository;
}

export function deriveOfflineGitStructuralObjectSetWithAuthority(
  authority: VerifiedOfflineGitReadAuthority,
  commit: string,
  rootTree: string,
  label: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): readonly OfflineGitObjectIdentity[] {
  const repository = requireOfflineGitReadAuthority(
    authority,
    `${label} precondition`,
    reviewedGit,
  );
  const result = deriveOfflineGitStructuralObjectSet(
    repository,
    commit,
    rootTree,
    label,
    reviewedGit,
  );
  requireOfflineGitReadAuthority(
    authority,
    `${label} postcondition`,
    reviewedGit,
  );
  return result;
}

export function requireExactOfflineGitObjectSetWithAuthority(
  authority: VerifiedOfflineGitReadAuthority,
  expected: readonly OfflineGitObjectIdentity[],
  label: string,
  reviewedGit: ReviewedGitRuntime = processReviewedGitRuntime(),
): void {
  const repository = requireOfflineGitReadAuthority(
    authority,
    `${label} precondition`,
    reviewedGit,
  );
  requireExactOfflineGitObjectSet(
    repository,
    expected,
    label,
    reviewedGit,
  );
  requireOfflineGitReadAuthority(
    authority,
    `${label} postcondition`,
    reviewedGit,
  );
}

/** Verify one exact, direct-child, non-alternate local Git object database. */
export function verifyOfflineGitObjectDatabase(
  repositoryPath: string,
  temporaryRootPath: string,
  label: string,
  reviewedGit?: ReviewedGitRuntime,
): OfflineGitObjectDatabaseSnapshot {
  const temporaryRoot = directDirectory(
    temporaryRootPath,
    'acquisition temporary root',
    label,
  );
  let temporaryRootAuthority: ExactPrivateDirectoryAuthority;
  try {
    temporaryRootAuthority = requireExactPrivateDirectoryAuthority(
      temporaryRoot,
      'acquisition temporary root',
    );
  } catch (error) {
    fail(
      label,
      error instanceof Error ? error.message : 'temporary-root authority failed',
    );
  }
  const repository = directDirectory(
    repositoryPath,
    'acquisition repository',
    label,
  );
  if (path.dirname(repository) !== temporaryRoot) {
    fail(label, 'acquisition repository must be a direct child of its temporary root');
  }

  const gitDirectory = directDirectory(
    path.join(repository, '.git'),
    'repository .git directory',
    label,
  );
  const config = path.join(gitDirectory, 'config');
  directRegularFile(config, 'repository-local Git config', label);
  rejectEntry(
    path.join(gitDirectory, 'commondir'),
    'repository must not redirect its common Git directory',
    label,
  );
  rejectEntry(
    path.join(gitDirectory, 'config.worktree'),
    'repository must not carry per-worktree Git configuration',
    label,
  );
  rejectEntry(
    path.join(gitDirectory, 'index'),
    'repository must not carry a checkout index',
    label,
  );
  rejectEntry(
    path.join(gitDirectory, 'FETCH_HEAD'),
    'repository must not retain FETCH_HEAD',
    label,
  );
  rejectEntry(
    path.join(gitDirectory, 'info', 'sparse-checkout'),
    'repository must not retain sparse-checkout patterns',
    label,
  );
  rejectEntry(
    path.join(gitDirectory, 'info', 'grafts'),
    'repository must not carry legacy Git grafts',
    label,
  );

  const objectDirectory = directDirectory(
    path.join(gitDirectory, 'objects'),
    'repository object database',
    label,
  );
  rejectEntry(
    path.join(objectDirectory, 'info', 'alternates'),
    'repository uses an alternate Git object database',
    label,
  );
  rejectEntry(
    path.join(objectDirectory, 'info', 'http-alternates'),
    'repository uses an HTTP alternate Git object database',
    label,
  );
  const objectDatabaseInspection = inspectDirectObjectDatabase(
    objectDirectory,
    label,
  );
  const gitRuntime = reviewedGit ?? processReviewedGitRuntime();
  const packedIdentities = verifyDirectPackFamilies(
    repository,
    objectDirectory,
    label,
    gitRuntime,
  );
  verifyDirectLooseObjectShape(objectDirectory, packedIdentities, label);

  const absoluteGitDirectory = gitText(
    repository,
    ['rev-parse', '--absolute-git-dir'],
    label,
    gitRuntime,
  ).trim();
  if (absoluteGitDirectory !== gitDirectory) {
    fail(label, 'Git does not resolve the repository-local .git directory exactly');
  }
  const gitObjectDirectory = gitText(
    repository,
    ['rev-parse', '--git-path', 'objects'],
    label,
    gitRuntime,
  ).trim();
  const resolvedGitObjectDirectory = path.resolve(repository, gitObjectDirectory);
  if (
    resolvedGitObjectDirectory !== objectDirectory ||
    realpathSync(resolvedGitObjectDirectory) !== objectDirectory
  ) {
    fail(label, 'Git does not resolve the repository-local object database exactly');
  }
  if (
    gitText(
      repository,
      ['rev-parse', '--show-object-format'],
      label,
      gitRuntime,
    ).trim() !== 'sha1'
  ) {
    fail(label, 'repository object format is not SHA-1');
  }
  if (gitText(repository, ['remote'], label, gitRuntime).trim().length !== 0) {
    fail(label, 'repository still has a configured remote');
  }
  const forbiddenConfiguration = gitOptionalText(
    repository,
    [
      'config',
      '--local',
      '--no-includes',
      '--get-regexp',
      '^(remote\\.|extensions\\.(partialclone|worktreeconfig)$|core\\.sparsecheckout(cone)?$|index\\.sparse$|include(if)?\\.)',
    ],
    label,
    gitRuntime,
  );
  if (
    forbiddenConfiguration.status === 0 ||
    forbiddenConfiguration.stdout.trim().length !== 0
  ) {
    fail(label, 'repository local configuration redirects acquisition authority');
  }
  const objectContentSet = inspectOfflineGitObjectContentSet(
    repository,
    label,
    gitRuntime,
  );
  const configBytes = readBoundedDirectRegularFile(
    config,
    'repository-local Git config',
    label,
    MAX_LOCAL_GIT_CONFIG_BYTES,
  );

  return Object.freeze({
    repository,
    temporaryRoot,
    temporaryRootIdentity:
      `${temporaryRootAuthority.device}:${temporaryRootAuthority.inode}`,
    temporaryRootMode: temporaryRootAuthority.mode.toString(8),
    temporaryRootUid: temporaryRootAuthority.uid.toString(10),
    gitDirectory,
    objectDirectory,
    repositoryIdentity: identity(repository),
    gitDirectoryIdentity: identity(gitDirectory),
    objectDirectoryIdentity: identity(objectDirectory),
    configIdentity: identity(config),
    configSha256:
      `sha256:${createHash('sha256').update(configBytes).digest('hex')}`,
    inspectedObjectDatabaseEntryCount: objectDatabaseInspection.count,
    objectDatabaseShapeSha256: objectDatabaseInspection.shapeSha256,
    objectContentSetSha256: objectContentSet.contentSetSha256,
  });
}

export function sameOfflineGitObjectDatabase(
  left: OfflineGitObjectDatabaseSnapshot,
  right: OfflineGitObjectDatabaseSnapshot,
): boolean {
  return (
    left.repository === right.repository &&
    left.temporaryRoot === right.temporaryRoot &&
    left.temporaryRootIdentity === right.temporaryRootIdentity &&
    left.temporaryRootMode === right.temporaryRootMode &&
    left.temporaryRootUid === right.temporaryRootUid &&
    left.gitDirectory === right.gitDirectory &&
    left.objectDirectory === right.objectDirectory &&
    left.repositoryIdentity === right.repositoryIdentity &&
    left.gitDirectoryIdentity === right.gitDirectoryIdentity &&
    left.objectDirectoryIdentity === right.objectDirectoryIdentity &&
    left.configIdentity === right.configIdentity &&
    left.configSha256 === right.configSha256 &&
    left.inspectedObjectDatabaseEntryCount ===
      right.inspectedObjectDatabaseEntryCount &&
    left.objectDatabaseShapeSha256 === right.objectDatabaseShapeSha256 &&
    left.objectContentSetSha256 === right.objectContentSetSha256
  );
}

export const offlineGitObjectDatabaseTesting = Object.freeze({
  boundedDirectoryNames: (
    directoryPath: string,
    maximumEntries: number,
  ): readonly string[] => boundedDirectoryNames(
    directoryPath,
    'offline Git bounded-directory negative control',
    maximumEntries,
  ),
  directDirectory: (directoryPath: string): string => directDirectory(
    directoryPath,
    'test directory',
    'offline Git direct-directory negative control',
  ),
  maximumLocalGitConfigBytes: MAX_LOCAL_GIT_CONFIG_BYTES,
  readBoundedDirectRegularFile: (
    filePath: string,
    maximumBytes: number,
    trustedBeforeOpenHook?: () => void,
  ): Buffer => readBoundedDirectRegularFile(
    filePath,
    'test regular file',
    'offline Git direct-file negative control',
    maximumBytes,
    trustedBeforeOpenHook,
  ),
});
