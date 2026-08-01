/** Fail-closed POSIX ACL-authority inspection through the reviewed Python helper. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  type BigIntStats,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { types as utilTypes } from 'node:util';

const ACL_INSPECTOR = fileURLToPath(
  new URL('../inspect-posix-acl.py', import.meta.url),
);
// This is an explicit OS trust prerequisite, not a PATH-selected interpreter.
// Its version and bytes are not a reproducibility receipt of the inspected tree.
const ACL_INSPECTOR_PYTHON = '/usr/bin/python3';
const MAX_ACL_INSPECTOR_BYTES = 64 * 1024;
export const REVIEWED_POSIX_ACL_INSPECTOR_SHA256 =
  'sha256:4ed5f7af2d97fdc838b8c41fbcd760d3af2829172dbb2737e90cdaee6a1b33b6';
const REVIEWED_DIRECTORY_OPEN_FLAGS =
  fsConstants.O_RDONLY |
  fsConstants.O_DIRECTORY |
  fsConstants.O_NOFOLLOW |
  fsConstants.O_NONBLOCK;
const MAX_ACL_SUBJECTS = 128;
const MAX_ACL_AUTHORITY_PATH_BYTES = 4_096;
const MAX_ACL_AUTHORITY_LABEL_BYTES = 128;

export type PosixAclSubject =
  | { readonly kind: 'path'; readonly label: string; readonly value: string }
  | { readonly kind: 'descriptor'; readonly label: string; readonly value: number };

export interface ExactPrivateDirectoryAuthority {
  readonly path: string;
  readonly device: bigint;
  readonly inode: bigint;
  readonly mode: bigint;
  readonly uid: bigint;
}

export function currentPosixUid(): bigint {
  if (
    typeof process.getuid !== 'function' ||
    typeof process.geteuid !== 'function'
  ) {
    throw new Error('current POSIX real/effective uid authority is unavailable');
  }
  const realUid = BigInt(process.getuid());
  const effectiveUid = BigInt(process.geteuid());
  if (realUid !== effectiveUid) {
    throw new Error('current POSIX real and effective uids differ');
  }
  return effectiveUid;
}

function sameDirectory(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameFileAuthority(left: BigIntStats, right: BigIntStats): boolean {
  return sameDirectory(left, right) &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.nlink === right.nlink &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.birthtimeNs === right.birthtimeNs;
}

function reviewedNoFollowNonblockingFileFlags(): number {
  if (
    !Number.isSafeInteger(fsConstants.O_NOFOLLOW) ||
    fsConstants.O_NOFOLLOW <= 0 ||
    !Number.isSafeInteger(fsConstants.O_NONBLOCK) ||
    fsConstants.O_NONBLOCK <= 0
  ) {
    throw new Error(
      'ACL inspector no-follow/nonblocking file authority is unavailable',
    );
  }
  return fsConstants.O_RDONLY |
    fsConstants.O_NOFOLLOW |
    fsConstants.O_NONBLOCK;
}

function requireReviewedInspectorStat(stat: BigIntStats, where: string): void {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size < 1n ||
    stat.size > BigInt(MAX_ACL_INSPECTOR_BYTES)
  ) {
    throw new Error(`${where} is not one bounded regular file`);
  }
}

function readReviewedInspectorBytes(
  descriptor: number,
  authority: BigIntStats,
  where: string,
): Buffer {
  requireReviewedInspectorStat(authority, where);
  const size = Number(authority.size);
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(
      descriptor,
      bytes,
      offset,
      Math.min(64 * 1024, size - offset),
      offset,
    );
    if (count <= 0) {
      throw new Error(`${where} ended before its reviewed size`);
    }
    offset += count;
  }
  const overflow = Buffer.allocUnsafe(1);
  if (readSync(descriptor, overflow, 0, 1, size) !== 0) {
    throw new Error(`${where} grew beyond its reviewed size`);
  }
  const after = fstatSync(descriptor, { bigint: true });
  if (!sameFileAuthority(authority, after)) {
    throw new Error(`${where} descriptor authority changed while reading`);
  }
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  if (digest !== REVIEWED_POSIX_ACL_INSPECTOR_SHA256) {
    throw new Error(`${where} digest is not the reviewed helper identity`);
  }
  return bytes;
}

function requireOnlyEnumerableKeys(
  value: object,
  expected: ReadonlySet<string>,
  label: string,
): void {
  let maximumExpectedKeyCodeUnits = 0;
  for (const key of expected) {
    maximumExpectedKeyCodeUnits = Math.max(maximumExpectedKeyCodeUnits, key.length);
  }
  let observed = 0;
  for (const key in value) {
    observed += 1;
    if (
      observed > expected.size ||
      key.length > maximumExpectedKeyCodeUnits ||
      !Object.hasOwn(value, key) ||
      !expected.has(key)
    ) {
      throw new Error(`${label} has unexpected keys in its enumerable projection`);
    }
  }
  if (observed !== expected.size) {
    throw new Error(`${label} is missing an enumerable key`);
  }
}

function ownEnumerableDataValue(
  value: object,
  key: string,
  label: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (
    descriptor === undefined ||
    !descriptor.enumerable ||
    !Object.hasOwn(descriptor, 'value')
  ) {
    throw new Error(`${label} is not an exact data record`);
  }
  return descriptor.value;
}

function requireProtectedAncestorMode(
  stat: BigIntStats,
  uid: bigint,
  label: string,
): void {
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`${label} is not a direct directory`);
  }
  if (stat.uid !== 0n && stat.uid !== uid) {
    throw new Error(`${label} is not owned by root or the current user`);
  }
  if ((stat.mode & 0o022n) !== 0n && (stat.mode & 0o1000n) === 0n) {
    throw new Error(`${label} is writable without sticky entry protection`);
  }
}

function requireBoundedDirectoryAuthorityRequest(
  requestedDirectory: unknown,
  label: unknown,
): asserts requestedDirectory is string {
  if (
    typeof requestedDirectory !== 'string' ||
    typeof label !== 'string' ||
    requestedDirectory.length === 0 ||
    requestedDirectory.length > MAX_ACL_AUTHORITY_PATH_BYTES ||
    label.length === 0 ||
    label.length > MAX_ACL_AUTHORITY_LABEL_BYTES ||
    requestedDirectory.includes('\0') ||
    /[\0\r\n]/u.test(label) ||
    Buffer.byteLength(requestedDirectory, 'utf8') >
      MAX_ACL_AUTHORITY_PATH_BYTES ||
    Buffer.byteLength(label, 'utf8') > MAX_ACL_AUTHORITY_LABEL_BYTES
  ) {
    throw new Error(
      'directory authority path and label must be bounded primitive strings',
    );
  }
}

/**
 * Reject an ACL grant or an indeterminate/unsupported inspection result. Darwin
 * admits only its exact canonical everyone-deny-delete entry; Linux still admits
 * no extended access/default ACL. Descriptors use fixed inherited child slots.
 * Only the enumerable `kind`, `label`, and `value` projection is semantic.
 * Non-enumerable and symbol metadata is never enumerated or propagated; enumerable
 * extras fail within the three-key projection bound.
 */
export function requireReviewedPosixAclAuthority(
  subjects: readonly PosixAclSubject[],
): void {
  if (
    utilTypes.isProxy(subjects) ||
    !Array.isArray(subjects) ||
    Object.getPrototypeOf(subjects) !== Array.prototype
  ) {
    throw new Error('ACL inspection subjects must be one direct array');
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(subjects, 'length');
  if (
    lengthDescriptor === undefined ||
    !Object.hasOwn(lengthDescriptor, 'value') ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 1 ||
    lengthDescriptor.value > MAX_ACL_SUBJECTS
  ) {
    throw new Error('ACL inspection subjects are absent or outside their bound');
  }
  const subjectCount = lengthDescriptor.value as number;
  const expectedSubjectKeys = new Set(
    Array.from({ length: subjectCount }, (_, index) => String(index)),
  );
  requireOnlyEnumerableKeys(
    subjects,
    expectedSubjectKeys,
    'ACL inspection subjects',
  );
  const subjectValues = Array.from({ length: subjectCount }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(subjects, String(index));
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, 'value')
    ) {
      throw new Error(`ACL inspection subject ${index} is not an own data member`);
    }
    return descriptor.value as unknown;
  });
  const reviewedSubjects = subjectValues.map((subject, index): PosixAclSubject => {
    if (
      subject === null ||
      typeof subject !== 'object' ||
      utilTypes.isProxy(subject) ||
      Array.isArray(subject)
    ) {
      throw new Error(`ACL inspection subject ${index} is not an ordinary object`);
    }
    const prototype = Object.getPrototypeOf(subject);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`ACL inspection subject ${index} is not an ordinary object`);
    }
    const record = subject as object;
    const kind = ownEnumerableDataValue(
      record,
      'kind',
      `ACL inspection subject ${index} kind`,
    );
    if (kind !== 'path' && kind !== 'descriptor') {
      throw new Error(`ACL inspection subject ${index} has unexpected keys`);
    }
    requireOnlyEnumerableKeys(
      record,
      new Set(['kind', 'label', 'value']),
      `ACL inspection subject ${index}`,
    );
    const label = ownEnumerableDataValue(
      record,
      'label',
      `ACL inspection subject ${index} label`,
    );
    const value = ownEnumerableDataValue(
      record,
      'value',
      `ACL inspection subject ${index} value`,
    );
    if (
      typeof label !== 'string' ||
      label.length === 0 ||
      label.length > MAX_ACL_AUTHORITY_LABEL_BYTES ||
      /[\0\r\n]/u.test(label) ||
      Buffer.byteLength(label, 'utf8') > MAX_ACL_AUTHORITY_LABEL_BYTES
    ) {
      throw new Error(`ACL inspection subject ${index} has an invalid label`);
    }
    if (kind === 'path') {
      if (
        typeof value !== 'string' ||
        value.length > MAX_ACL_AUTHORITY_PATH_BYTES ||
        value.includes('\0') ||
        Buffer.byteLength(value, 'utf8') > MAX_ACL_AUTHORITY_PATH_BYTES ||
        !path.isAbsolute(value) ||
        path.resolve(value) !== value
      ) {
        throw new Error(`ACL inspection subject ${index} has an invalid path`);
      }
      return Object.freeze({ kind, label, value });
    }
    if (!Number.isSafeInteger(value) || (value as number) < 0) {
      throw new Error(`ACL inspection subject ${index} has an invalid descriptor`);
    }
    return Object.freeze({ kind: 'descriptor', label, value: value as number });
  });
  const arguments_: string[] = ['-I', '-B', '-S', '-'];
  const stdio: Array<'ignore' | 'pipe' | number> = ['pipe', 'pipe', 'pipe'];
  for (const subject of reviewedSubjects) {
    if (subject.kind === 'path') {
      arguments_.push('--path', subject.label, subject.value);
    } else {
      const inheritedDescriptor = stdio.length;
      stdio.push(subject.value);
      arguments_.push('--fd', subject.label, String(inheritedDescriptor));
    }
  }
  const inspectorPathBefore = lstatSync(ACL_INSPECTOR, { bigint: true });
  requireReviewedInspectorStat(inspectorPathBefore, 'ACL inspector path');
  if (realpathSync(ACL_INSPECTOR) !== ACL_INSPECTOR) {
    throw new Error('ACL inspector path must not traverse a symbolic link');
  }
  let inspectorDescriptor: number | null = null;
  let result: ReturnType<typeof spawnSync> | undefined;
  const inspectorErrors: unknown[] = [];
  try {
    inspectorDescriptor = openSync(
      ACL_INSPECTOR,
      reviewedNoFollowNonblockingFileFlags(),
    );
    const inspectorDescriptorBefore = fstatSync(
      inspectorDescriptor,
      { bigint: true },
    );
    requireReviewedInspectorStat(
      inspectorDescriptorBefore,
      'ACL inspector descriptor',
    );
    if (!sameFileAuthority(inspectorPathBefore, inspectorDescriptorBefore)) {
      throw new Error('ACL inspector identity changed while opening');
    }
    const inspectorBytes = readReviewedInspectorBytes(
      inspectorDescriptor,
      inspectorDescriptorBefore,
      'ACL inspector source',
    );
    try {
      result = spawnSync(ACL_INSPECTOR_PYTHON, arguments_, {
        encoding: 'utf8',
        env: {
          LANG: 'C',
          LC_ALL: 'C',
          PATH: '/usr/bin:/bin',
        },
        input: inspectorBytes,
        maxBuffer: 64 * 1024,
        stdio,
        timeout: 10_000,
      });
    } catch (error) {
      inspectorErrors.push(error);
    }
    try {
      const inspectorPathAfter = lstatSync(ACL_INSPECTOR, { bigint: true });
      const inspectorDescriptorAfter = fstatSync(
        inspectorDescriptor,
        { bigint: true },
      );
      if (
        realpathSync(ACL_INSPECTOR) !== ACL_INSPECTOR ||
        !sameFileAuthority(inspectorPathBefore, inspectorPathAfter) ||
        !sameFileAuthority(inspectorDescriptorBefore, inspectorDescriptorAfter)
      ) {
        throw new Error('ACL inspector authority changed during execution');
      }
      const inspectorBytesAfter = readReviewedInspectorBytes(
        inspectorDescriptor,
        inspectorDescriptorBefore,
        'ACL inspector source after execution',
      );
      if (!inspectorBytes.equals(inspectorBytesAfter)) {
        throw new Error('ACL inspector bytes changed during execution');
      }
    } catch (error) {
      inspectorErrors.push(error);
    }
  } catch (error) {
    inspectorErrors.push(error);
  } finally {
    if (inspectorDescriptor !== null) {
      try {
        closeSync(inspectorDescriptor);
      } catch (error) {
        inspectorErrors.push(new Error(
          'ACL inspector descriptor close is uncertain',
          { cause: error },
        ));
      }
    }
  }
  if (inspectorErrors.length === 1) throw inspectorErrors[0];
  if (inspectorErrors.length > 1) {
    throw new AggregateError(
      inspectorErrors,
      'ACL inspector execution or cleanup is uncertain',
    );
  }
  if (result === undefined) {
    throw new Error('ACL inspector did not produce a process result');
  }
  if (
    result.error ||
    result.status !== 0 ||
    result.signal !== null ||
    result.stdout !== '' ||
    result.stderr !== ''
  ) {
    const diagnostic = typeof result.stderr === 'string'
      ? result.stderr
        .replace(/[\u0000-\u001f\u007f-\u009f]/gu, '\uFFFD')
        .trim()
        .slice(0, 1_000)
      : '';
    throw new Error(
      'extended ACL authority cannot be established' +
      (diagnostic.length > 0 ? `: ${diagnostic}` : ''),
    );
  }
}

/**
 * Prove that another ordinary UID cannot rename any component of one resolved
 * directory path. Root/current ownership, sticky semantics, and Darwin's exact
 * everyone-deny-delete restriction are the only admitted entry-authority shapes;
 * every component is checked by path and FD.
 * This is not containment against root or another process with the current UID.
 */
export function requireProtectedDirectoryEntryChain(
  requestedDirectory: string,
  label: string,
): void {
  requireBoundedDirectoryAuthorityRequest(requestedDirectory, label);
  const directory = path.resolve(requestedDirectory);
  if (realpathSync(directory) !== directory) {
    throw new Error(`${label} path must not traverse a symbolic link`);
  }
  const paths: string[] = [];
  let cursor = directory;
  while (true) {
    paths.push(cursor);
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  paths.reverse();
  // One closed helper invocation receives both the path and retained descriptor
  // for every component. Keep the combined subject set within its 128-entry
  // protocol bound.
  if (paths.length > 64) {
    throw new Error(`${label} ancestor depth exceeds the reviewed bound`);
  }

  const uid = currentPosixUid();
  const descriptors: number[] = [];
  const identities: BigIntStats[] = [];
  let inspectionCompleted = false;
  let inspectionError: unknown;
  try {
    for (let index = 0; index < paths.length; index++) {
      const component = paths[index]!;
      const pathStat = lstatSync(component, { bigint: true });
      requireProtectedAncestorMode(
        pathStat,
        uid,
        `${label} ancestor ${index}`,
      );
      if (realpathSync(component) !== component) {
        throw new Error(`${label} ancestor ${index} traverses a symbolic link`);
      }
      const descriptor = openSync(component, REVIEWED_DIRECTORY_OPEN_FLAGS);
      descriptors.push(descriptor);
      identities.push(pathStat);
      const descriptorStat = fstatSync(descriptor, { bigint: true });
      if (!sameDirectory(pathStat, descriptorStat)) {
        throw new Error(`${label} ancestor ${index} identity changed while opening`);
      }
      requireProtectedAncestorMode(
        descriptorStat,
        uid,
        `${label} ancestor descriptor ${index}`,
      );
    }
    requireReviewedPosixAclAuthority(paths.flatMap((component, index) => [
      {
        kind: 'path' as const,
        label: `directory ancestor path ${index}`,
        value: component,
      },
      {
        kind: 'descriptor' as const,
        label: `directory ancestor descriptor ${index}`,
        value: descriptors[index]!,
      },
    ]));
    for (let index = 0; index < paths.length; index++) {
      const component = paths[index]!;
      const pathStat = lstatSync(component, { bigint: true });
      const descriptorStat = fstatSync(descriptors[index]!, { bigint: true });
      const identity = identities[index]!;
      if (
        realpathSync(component) !== component ||
        !sameDirectory(identity, pathStat) ||
        !sameDirectory(identity, descriptorStat)
      ) {
        throw new Error(`${label} ancestor ${index} identity changed during inspection`);
      }
      requireProtectedAncestorMode(pathStat, uid, `${label} ancestor ${index}`);
      requireProtectedAncestorMode(
        descriptorStat,
        uid,
        `${label} ancestor descriptor ${index}`,
      );
    }
    inspectionCompleted = true;
  } catch (error) {
    inspectionError = error;
  }
  const cleanupErrors: Error[] = [];
  for (let index = descriptors.length - 1; index >= 0; index--) {
    try {
      closeSync(descriptors[index]!);
    } catch (error) {
      cleanupErrors.push(new Error(
        `${label} ancestor descriptor ${index} close failed`,
        { cause: error },
      ));
    }
  }
  if (!inspectionCompleted) {
    if (cleanupErrors.length === 0) throw inspectionError;
    throw new AggregateError(
      [inspectionError, ...cleanupErrors],
      `${label} inspection failed and descriptor cleanup is uncertain`,
      { cause: inspectionError },
    );
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      `${label} ancestor descriptor cleanup is uncertain`,
    );
  }
}

/** Establish an exact current-UID-owned 0700 directory after ancestor closure. */
export function requireExactPrivateDirectoryAuthority(
  requestedDirectory: string,
  label: string,
): ExactPrivateDirectoryAuthority {
  requireBoundedDirectoryAuthorityRequest(requestedDirectory, label);
  const directory = path.resolve(requestedDirectory);
  requireProtectedDirectoryEntryChain(directory, label);
  const uid = currentPosixUid();
  const before = lstatSync(directory, { bigint: true });
  if (
    !before.isDirectory() ||
    before.isSymbolicLink() ||
    (before.mode & 0o7777n) !== 0o700n ||
    before.uid !== uid
  ) {
    throw new Error(`${label} must be current-user-owned with exact mode 0700`);
  }
  const descriptor = openSync(directory, REVIEWED_DIRECTORY_OPEN_FLAGS);
  let operationCompleted = false;
  let operationError: unknown;
  let authority: ExactPrivateDirectoryAuthority | undefined;
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (
      !sameDirectory(before, opened) ||
      (opened.mode & 0o7777n) !== 0o700n ||
      opened.uid !== uid
    ) {
      throw new Error(`${label} authority changed while opening`);
    }
    requireReviewedPosixAclAuthority([
      { kind: 'path', label: 'exact private directory path', value: directory },
      {
        kind: 'descriptor',
        label: 'exact private directory descriptor',
        value: descriptor,
      },
    ]);
    const pathAfter = lstatSync(directory, { bigint: true });
    const descriptorAfter = fstatSync(descriptor, { bigint: true });
    if (
      realpathSync(directory) !== directory ||
      !sameDirectory(before, pathAfter) ||
      !sameDirectory(before, descriptorAfter) ||
      (pathAfter.mode & 0o7777n) !== 0o700n ||
      (descriptorAfter.mode & 0o7777n) !== 0o700n ||
      pathAfter.uid !== uid ||
      descriptorAfter.uid !== uid
    ) {
      throw new Error(`${label} authority changed during ACL inspection`);
    }
    authority = Object.freeze({
      path: directory,
      device: before.dev,
      inode: before.ino,
      mode: before.mode & 0o7777n,
      uid: before.uid,
    });
    operationCompleted = true;
  } catch (error) {
    operationError = error;
  }
  let closeError: Error | undefined;
  try {
    closeSync(descriptor);
  } catch (error) {
    closeError = new Error(
      `${label} descriptor close is uncertain`,
      { cause: error },
    );
  }
  if (!operationCompleted) {
    if (closeError === undefined) throw operationError;
    throw new AggregateError(
      [operationError, closeError],
      `${label} inspection failed and descriptor cleanup is uncertain`,
      { cause: operationError },
    );
  }
  if (closeError !== undefined) throw closeError;
  if (authority === undefined) {
    throw new Error(`${label} produced no reviewed directory authority`);
  }
  return authority;
}
