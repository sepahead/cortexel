/** Symlink-refusing reader for release-authority files beneath one repository root. */

import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  type BigIntStats,
} from 'node:fs';
import path from 'node:path';

const MAX_DIRECT_REPOSITORY_FILE_BYTES = 16 * 1024 * 1024;
const MAX_DIRECT_REPOSITORY_PATH_BYTES = 4_096;
const MAX_DIRECT_REPOSITORY_PATH_SEGMENTS = 64;

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
 * Read a regular file through direct, in-root path components.
 *
 * The final descriptor requires O_NOFOLLOW and O_NONBLOCK and is checked again with
 * fstat. Node does not expose portable openat(2) traversal, so the component lstat
 * checks are also retained for parent-directory diagnostics.
 */
export function readDirectRepositoryFile(
  root: string,
  relative: string,
  maximumBytes = MAX_DIRECT_REPOSITORY_FILE_BYTES,
): Buffer {
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 1 ||
    maximumBytes > MAX_DIRECT_REPOSITORY_FILE_BYTES
  ) {
    throw new Error('release metadata byte bound is invalid');
  }
  if (
    typeof root !== 'string' ||
    typeof relative !== 'string' ||
    root.length > MAX_DIRECT_REPOSITORY_PATH_BYTES ||
    relative.length > MAX_DIRECT_REPOSITORY_PATH_BYTES ||
    root.includes('\0') ||
    relative.includes('\0') ||
    Buffer.byteLength(root, 'utf8') > MAX_DIRECT_REPOSITORY_PATH_BYTES ||
    Buffer.byteLength(relative, 'utf8') > MAX_DIRECT_REPOSITORY_PATH_BYTES
  ) {
    throw new Error('release metadata paths must be bounded primitive strings');
  }
  const segments = relative.split('/');
  if (
    !path.isAbsolute(root) ||
    path.resolve(root) !== root ||
    path.isAbsolute(relative) ||
    relative.includes('\\') ||
    segments.length === 0 ||
    segments.length > MAX_DIRECT_REPOSITORY_PATH_SEGMENTS ||
    segments.some((segment) =>
      segment.length === 0 || segment === '.' || segment === '..' ||
      !/^[A-Za-z0-9._-]+$/u.test(segment))
  ) {
    throw new Error(`unsafe release metadata path ${JSON.stringify(relative)}`);
  }

  let current = root;
  const rootStat = lstatSync(current, { bigint: true });
  if (
    realpathSync(current) !== current ||
    rootStat.isSymbolicLink() ||
    !rootStat.isDirectory()
  ) {
    throw new Error('release repository root must be a direct directory');
  }
  const inspected: Array<{ readonly path: string; readonly stat: BigIntStats }> = [
    { path: current, stat: rootStat },
  ];
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    const stat = lstatSync(current, { bigint: true });
    const label = segments.slice(0, index + 1).join('/');
    if (stat.isSymbolicLink()) throw new Error(`release metadata path is a symbolic link: ${label}`);
    if (index < segments.length - 1 && !stat.isDirectory()) {
      throw new Error(`release metadata parent is not a directory: ${label}`);
    }
    if (index === segments.length - 1 && !stat.isFile()) {
      throw new Error(`release metadata path is not a regular file: ${label}`);
    }
    inspected.push({ path: current, stat });
  }

  if (
    !Number.isSafeInteger(constants.O_NOFOLLOW) ||
    constants.O_NOFOLLOW <= 0 ||
    !Number.isSafeInteger(constants.O_NONBLOCK) ||
    constants.O_NONBLOCK <= 0
  ) {
    throw new Error(
      'release metadata no-follow/nonblocking authority is unavailable',
    );
  }
  const descriptor = openSync(
    current,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  let completed = false;
  let readError: unknown;
  let reviewedBytes: Buffer | undefined;
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    const leafBefore = inspected.at(-1)!.stat;
    if (
      !opened.isFile() ||
      opened.nlink !== 1n ||
      !sameAuthority(leafBefore, opened)
    ) {
      throw new Error(`release metadata path is not a regular file: ${relative}`);
    }
    if (opened.size < 0n || opened.size > BigInt(maximumBytes)) {
      throw new Error(`release metadata file exceeds its ${maximumBytes}-byte bound`);
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
      if (count <= 0) {
        throw new Error(`release metadata file ended before its reviewed size: ${relative}`);
      }
      offset += count;
    }
    const overflowProbe = Buffer.allocUnsafe(1);
    if (readSync(descriptor, overflowProbe, 0, 1, size) !== 0) {
      throw new Error(`release metadata file grew beyond its reviewed size: ${relative}`);
    }
    const finalDescriptor = fstatSync(descriptor, { bigint: true });
    const finalLeaf = lstatSync(current, { bigint: true });
    if (
      !sameAuthority(opened, finalDescriptor) ||
      !sameAuthority(opened, finalLeaf)
    ) {
      throw new Error(`release metadata identity changed while reading: ${relative}`);
    }
    for (const entry of inspected) {
      const currentStat = lstatSync(entry.path, { bigint: true });
      if (
        !sameAuthority(entry.stat, currentStat) ||
        (entry.path === current ? !currentStat.isFile() : !currentStat.isDirectory()) ||
        currentStat.isSymbolicLink()
      ) {
        throw new Error(`release metadata path changed while reading: ${relative}`);
      }
    }
    reviewedBytes = bytes;
    completed = true;
  } catch (error) {
    readError = error;
  }
  let closeError: unknown;
  try {
    closeSync(descriptor);
  } catch (error) {
    closeError = new Error(
      'release metadata descriptor close is uncertain',
      { cause: error },
    );
  }
  if (!completed) {
    if (closeError === undefined) throw readError;
    throw new AggregateError(
      [readError, closeError],
      'release metadata read failed and descriptor cleanup is uncertain',
      { cause: readError },
    );
  }
  if (closeError !== undefined) throw closeError;
  if (reviewedBytes === undefined) {
    throw new Error('release metadata read produced no reviewed bytes');
  }
  return reviewedBytes;
}
