/**
 * Exclusive, no-clobber publication for generated mutable audit artifacts.
 *
 * The checks repeatedly establish one exact inode, bytes, mode, owner, link
 * count, and reviewed non-authorizing POSIX ACL state through the final
 * observation before return. Successful file and parent-directory fsync calls
 * are required, but do not establish persistence across power loss, backing
 * device behavior, or storage-stack semantics. These checks also do not
 * establish immutability or hostile same-user concurrency containment during
 * publication or after return.
 */
import { randomBytes } from 'node:crypto';
import {
  closeSync,
  constants as fsConstants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  unlinkSync,
  writeSync,
  type BigIntStats,
} from 'node:fs';
import path from 'node:path';

import {
  currentPosixUid,
  requireReviewedPosixAclAuthority,
  requireProtectedDirectoryEntryChain,
} from './posix-acl-authority.js';

const REVIEWED_DIRECTORY_OPEN_FLAGS =
  fsConstants.O_RDONLY |
  fsConstants.O_DIRECTORY |
  fsConstants.O_NOFOLLOW |
  fsConstants.O_NONBLOCK;
const MAX_AUDIT_PUBLICATION_PATH_BYTES = 4_096;
const MAX_AUDIT_PUBLICATION_BYTES = 16 * 1024 * 1024;

function requireBoundedResolvedPublicationPath(
  value: string,
  label: string,
): void {
  if (
    value.length > MAX_AUDIT_PUBLICATION_PATH_BYTES ||
    Buffer.byteLength(value, 'utf8') > MAX_AUDIT_PUBLICATION_PATH_BYTES
  ) {
    throw new Error(
      `${label} exceeds its ${MAX_AUDIT_PUBLICATION_PATH_BYTES}-byte bound`,
    );
  }
}

function missingOrStat(filename: string): BigIntStats | null {
  try {
    return lstatSync(filename, { bigint: true });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return null;
    }
    throw error;
  }
}

function sameObject(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function descriptorHasExactBytes(
  descriptor: number,
  expected: Buffer,
): boolean {
  const chunk = Buffer.allocUnsafe(
    Math.min(1024 * 1024, Math.max(1, expected.byteLength)),
  );
  let offset = 0;
  while (offset < expected.byteLength) {
    const count = readSync(
      descriptor,
      chunk,
      0,
      Math.min(chunk.byteLength, expected.byteLength - offset),
      offset,
    );
    if (
      count <= 0 ||
      !chunk.subarray(0, count).equals(expected.subarray(offset, offset + count))
    ) {
      return false;
    }
    offset += count;
  }
  return readSync(descriptor, chunk, 0, 1, offset) === 0;
}

function requireOutputParentAuthority(stat: BigIntStats, where: string): void {
  const uid = currentPosixUid();
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o022n) !== 0n ||
    stat.uid !== uid
  ) {
    throw new Error(
      `${where} must be current-user-owned with no group or other write bits`,
    );
  }
}

function exactRegularFile(
  stat: BigIntStats,
  expectedBytes: bigint,
  expectedLinks: bigint,
  where: string,
): void {
  const uid = currentPosixUid();
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o7777n) !== 0o644n ||
    stat.size !== expectedBytes ||
    stat.nlink !== expectedLinks ||
    stat.uid !== uid
  ) {
    throw new Error(`${where} is not the exact finalized regular file`);
  }
}

/**
 * Publish one absent file through an exclusive staging inode and hard-link.
 * A failure after target creation, or without authoritative proof that the
 * target remains absent, is reported and deliberately leaves any target for
 * manual inspection; callers must never treat that path as success.
 */
export function publishNewExclusiveAuditFile(
  requestedPath: string,
  content: string,
): void {
  if (
    typeof requestedPath !== 'string' ||
    typeof content !== 'string' ||
    requestedPath.length > MAX_AUDIT_PUBLICATION_PATH_BYTES ||
    content.length > MAX_AUDIT_PUBLICATION_BYTES ||
    requestedPath.includes('\0') ||
    Buffer.byteLength(requestedPath, 'utf8') >
      MAX_AUDIT_PUBLICATION_PATH_BYTES
  ) {
    throw new Error('audit output path and content must be primitive bounded strings');
  }
  const contentBytes = Buffer.byteLength(content, 'utf8');
  if (contentBytes > MAX_AUDIT_PUBLICATION_BYTES) {
    throw new Error(
      `audit output exceeds its ${MAX_AUDIT_PUBLICATION_BYTES}-byte bound`,
    );
  }
  const requestedTarget = path.resolve(requestedPath);
  requireBoundedResolvedPublicationPath(
    requestedTarget,
    'resolved audit output target',
  );
  const requestedParent = path.dirname(requestedTarget);
  requireBoundedResolvedPublicationPath(
    requestedParent,
    'resolved audit output parent',
  );
  const basename = path.basename(requestedTarget);
  if (basename === '.' || basename === '..' || basename.length === 0) {
    throw new Error('output path must name a file');
  }
  const initialParent = lstatSync(requestedParent, { bigint: true });
  if (
    !initialParent.isDirectory() ||
    initialParent.isSymbolicLink()
  ) {
    throw new Error('output parent must be a direct directory');
  }
  const parent = realpathSync(requestedParent);
  requireBoundedResolvedPublicationPath(
    parent,
    'canonical audit output parent',
  );
  if (parent !== requestedParent) {
    throw new Error('output parent path must not traverse a symbolic link');
  }
  requireProtectedDirectoryEntryChain(parent, 'output parent authority chain');
  const parentBefore = lstatSync(parent, { bigint: true });
  if (
    realpathSync(parent) !== parent ||
    !sameObject(initialParent, parentBefore)
  ) {
    throw new Error('output parent identity changed during ancestor inspection');
  }
  requireOutputParentAuthority(parentBefore, 'output parent');
  const target = path.join(parent, basename);
  if (missingOrStat(target) !== null) {
    throw new Error('output file already exists as a filesystem entry');
  }

  const staged = path.join(
    parent,
    `.${basename}.cortexel-${process.pid}-${randomBytes(12).toString('hex')}.tmp`,
  );
  requireBoundedResolvedPublicationPath(
    staged,
    'resolved audit staging path',
  );
  const bytes = Buffer.from(content, 'utf8');
  if (bytes.byteLength !== contentBytes) {
    throw new Error('audit output UTF-8 byte length changed during materialization');
  }
  let parentDescriptor: number | null = null;
  let descriptor: number | null = null;
  let stagedIdentity: BigIntStats | null = null;
  let targetRequiresInspection = false;
  let publicationFailed = false;
  let publicationError: unknown;
  const targetInspectionErrors: unknown[] = [];
  const cleanupErrors: unknown[] = [];
  const revalidateFinalTarget = (where: string): void => {
    if (descriptor === null || stagedIdentity === null) {
      throw new Error(`${where} publication descriptors are absent`);
    }
    const pathBefore = lstatSync(target, { bigint: true });
    const descriptorBefore = fstatSync(descriptor, { bigint: true });
    exactRegularFile(pathBefore, BigInt(bytes.byteLength), 1n, `${where} path`);
    exactRegularFile(
      descriptorBefore,
      BigInt(bytes.byteLength),
      1n,
      `${where} descriptor`,
    );
    if (
      !sameObject(stagedIdentity, pathBefore) ||
      !sameObject(stagedIdentity, descriptorBefore) ||
      !descriptorHasExactBytes(descriptor, bytes)
    ) {
      throw new Error(`${where} bytes or inode changed`);
    }
    const pathAfter = lstatSync(target, { bigint: true });
    const descriptorAfter = fstatSync(descriptor, { bigint: true });
    exactRegularFile(pathAfter, BigInt(bytes.byteLength), 1n, `${where} path`);
    exactRegularFile(
      descriptorAfter,
      BigInt(bytes.byteLength),
      1n,
      `${where} descriptor`,
    );
    if (
      !sameObject(pathBefore, pathAfter) ||
      !sameObject(descriptorBefore, descriptorAfter)
    ) {
      throw new Error(`${where} identity changed during byte inspection`);
    }
  };
  try {
    parentDescriptor = openSync(parent, REVIEWED_DIRECTORY_OPEN_FLAGS);
    const openedParent = fstatSync(parentDescriptor, { bigint: true });
    if (!sameObject(parentBefore, openedParent)) {
      throw new Error('output parent identity changed before publication');
    }
    requireOutputParentAuthority(openedParent, 'opened output parent');
    requireReviewedPosixAclAuthority([
      { kind: 'path', label: 'output parent path', value: parent },
      {
        kind: 'descriptor',
        label: 'output parent descriptor',
        value: parentDescriptor,
      },
    ]);

    descriptor = openSync(staged, 'wx+', 0o600);
    stagedIdentity = fstatSync(descriptor, { bigint: true });
    let offset = 0;
    while (offset < bytes.byteLength) {
      const written = writeSync(
        descriptor,
        bytes,
        offset,
        bytes.byteLength - offset,
      );
      if (written <= 0) {
        throw new Error('output staging write made no forward progress');
      }
      offset += written;
    }
    fchmodSync(descriptor, 0o644);
    fsyncSync(descriptor);
    stagedIdentity = fstatSync(descriptor, { bigint: true });
    exactRegularFile(
      stagedIdentity,
      BigInt(bytes.byteLength),
      1n,
      'output staging inode',
    );
    requireReviewedPosixAclAuthority([
      { kind: 'path', label: 'output staging path', value: staged },
      {
        kind: 'descriptor',
        label: 'output staging descriptor',
        value: descriptor,
      },
    ]);

    const stagedPathStat = lstatSync(staged, { bigint: true });
    exactRegularFile(
      stagedPathStat,
      BigInt(bytes.byteLength),
      1n,
      'output staging path',
    );
    if (!sameObject(stagedIdentity, stagedPathStat)) {
      throw new Error('output staging pathname no longer names its reviewed inode');
    }

    linkSync(staged, target);
    targetRequiresInspection = true;
    const linkedTargetStat = lstatSync(target, { bigint: true });
    exactRegularFile(
      linkedTargetStat,
      BigInt(bytes.byteLength),
      2n,
      'linked output target',
    );
    if (!sameObject(stagedIdentity, linkedTargetStat)) {
      throw new Error('linked output target does not name the staged inode');
    }
    exactRegularFile(
      fstatSync(descriptor, { bigint: true }),
      BigInt(bytes.byteLength),
      2n,
      'linked output descriptor',
    );
    unlinkSync(staged);

    const parentBeforeSync = fstatSync(parentDescriptor, { bigint: true });
    if (!sameObject(parentBefore, parentBeforeSync)) {
      throw new Error('output parent identity changed before parent-directory fsync');
    }
    fsyncSync(parentDescriptor);

    revalidateFinalTarget('final output before ACL inspection');
    requireReviewedPosixAclAuthority([
      { kind: 'path', label: 'final output target path', value: target },
      {
        kind: 'descriptor',
        label: 'final output target descriptor',
        value: descriptor,
      },
      { kind: 'path', label: 'final output parent path', value: parent },
      {
        kind: 'descriptor',
        label: 'final output parent descriptor',
        value: parentDescriptor,
      },
    ]);
    const parentAfter = lstatSync(parent, { bigint: true });
    if (!sameObject(parentBefore, parentAfter)) {
      throw new Error('output parent identity changed during publication');
    }
    requireOutputParentAuthority(parentAfter, 'output parent after ACL inspection');
    revalidateFinalTarget('final output after ACL inspection');
    const parentFinalPath = lstatSync(parent, { bigint: true });
    const parentFinalDescriptor = fstatSync(parentDescriptor, { bigint: true });
    if (
      !sameObject(parentBefore, parentFinalPath) ||
      !sameObject(parentBefore, parentFinalDescriptor)
    ) {
      throw new Error('output parent identity changed after ACL inspection');
    }
    requireOutputParentAuthority(parentFinalPath, 'final output parent path');
    requireOutputParentAuthority(
      parentFinalDescriptor,
      'final output parent descriptor',
    );
  } catch (error) {
    publicationFailed = true;
    publicationError = error;
    try {
      if (missingOrStat(target) !== null) {
        targetRequiresInspection = true;
      }
    } catch (inspectionError) {
      targetRequiresInspection = true;
      targetInspectionErrors.push(new Error(
        'output target absence cannot be established after publication failure',
        { cause: inspectionError },
      ));
    }
  } finally {
    for (const openDescriptor of [descriptor, parentDescriptor]) {
      if (openDescriptor !== null) {
        try {
          closeSync(openDescriptor);
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
    }
    try {
      const remainingStage = missingOrStat(staged);
      if (remainingStage !== null) {
        if (
          stagedIdentity === null ||
          !sameObject(remainingStage, stagedIdentity)
        ) {
          throw new Error('output staging pathname no longer names its reviewed inode');
        }
        unlinkSync(staged);
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (!publicationFailed && cleanupErrors.length === 0) return;

  const secondaryErrors = [...targetInspectionErrors, ...cleanupErrors];
  const cause = publicationFailed && secondaryErrors.length === 0
    ? publicationError
    : new AggregateError(
        [
          ...(publicationFailed ? [publicationError] : []),
          ...secondaryErrors,
        ],
        'output publication, target inspection, or cleanup failed',
      );
  if (targetRequiresInspection) {
    const detail = publicationError instanceof Error
      ? `: ${publicationError.message}`
      : '';
    throw new Error(
      `output publication failed with a present or uncertain target; inspect target manually${detail}`,
      { cause },
    );
  }
  if (publicationFailed && secondaryErrors.length === 0) throw publicationError;
  throw new Error('output publication cleanup failed', { cause });
}
