/** Symlink-refusing reader for release-authority files beneath one repository root. */

import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';

/**
 * Read a regular file through direct, in-root path components.
 *
 * The final descriptor is opened with O_NOFOLLOW where the host provides it and is
 * checked again with fstat. Node does not expose portable openat(2) traversal, so the
 * component lstat checks are also retained for parent-directory diagnostics.
 */
export function readDirectRepositoryFile(root: string, relative: string): Buffer {
  const segments = relative.split('/');
  if (
    path.isAbsolute(relative) ||
    relative.includes('\\') ||
    segments.length === 0 ||
    segments.some((segment) =>
      segment.length === 0 || segment === '.' || segment === '..' ||
      !/^[A-Za-z0-9._-]+$/u.test(segment))
  ) {
    throw new Error(`unsafe release metadata path ${JSON.stringify(relative)}`);
  }

  let current = root;
  const rootStat = lstatSync(current);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error('release repository root must be a direct directory');
  }
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    const stat = lstatSync(current);
    const label = segments.slice(0, index + 1).join('/');
    if (stat.isSymbolicLink()) throw new Error(`release metadata path is a symbolic link: ${label}`);
    if (index < segments.length - 1 && !stat.isDirectory()) {
      throw new Error(`release metadata parent is not a directory: ${label}`);
    }
    if (index === segments.length - 1 && !stat.isFile()) {
      throw new Error(`release metadata path is not a regular file: ${label}`);
    }
  }

  const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
  const descriptor = openSync(current, constants.O_RDONLY | noFollow);
  try {
    if (!fstatSync(descriptor).isFile()) {
      throw new Error(`release metadata path is not a regular file: ${relative}`);
    }
    return readFileSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}
