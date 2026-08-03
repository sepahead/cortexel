/** Bounded, no-follow inventory for a tree that will enter the npm package. */

import { lstatSync, opendirSync, type Stats } from 'node:fs';
import path from 'node:path';

import {
  canonicalPackagePathCaseFold,
  isCanonicalPackageRelativePath,
  isCanonicalPackageSegment,
} from './canonical-package-path.js';

export interface BoundedPackageTreeLimits {
  readonly files: number;
  readonly directories: number;
  readonly nodes: number;
  readonly directoryEntries: number;
  readonly pathSegments: number;
  readonly segmentBytes: number;
  readonly fileBytes: number;
  readonly aggregateBytes: number;
}

export interface BoundedPackageTreeEntry {
  readonly absolute: string;
  readonly relative: string;
  readonly kind: 'directory' | 'file';
  readonly stat: Stats;
}

export interface BoundedPackageTreeInventory {
  readonly entries: readonly BoundedPackageTreeEntry[];
  readonly directories: number;
  readonly regularFiles: number;
  readonly aggregateBytes: number;
}

function assertLimits(limits: BoundedPackageTreeLimits): void {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error(`bounded package tree has an invalid ${name} limit`);
    }
  }
  if (limits.nodes < limits.files || limits.nodes < limits.directories) {
    throw new Error('bounded package tree node limit cannot cover its component limits');
  }
}

/**
 * Inspect one direct directory tree without retaining an unbounded entry set.
 *
 * The admitted pathname alphabet is the exact portable npm/USTAR profile. The
 * root is counted as one directory and one node. This is pathname-time authority
 * under the repository's documented single-principal build model; callers that
 * mutate afterward must revalidate identities before their first mutation.
 */
export function inspectBoundedPackageTree(
  absoluteRoot: string,
  packageRelativeRoot: string,
  limits: BoundedPackageTreeLimits,
): BoundedPackageTreeInventory {
  assertLimits(limits);
  if (!path.isAbsolute(absoluteRoot) || path.resolve(absoluteRoot) !== absoluteRoot) {
    throw new Error('bounded package tree root must be an absolute normalized path');
  }
  if (!isCanonicalPackageRelativePath(packageRelativeRoot)) {
    throw new Error('bounded package tree has a noncanonical package-relative root');
  }
  const rootStat = lstatSync(absoluteRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error(`package tree root must be a direct directory: ${packageRelativeRoot}`);
  }

  const entries: BoundedPackageTreeEntry[] = [{
    absolute: absoluteRoot,
    relative: packageRelativeRoot,
    kind: 'directory',
    stat: rootStat,
  }];
  const pending: Array<{
    readonly absolute: string;
    readonly relative: string;
  }> = [{ absolute: absoluteRoot, relative: packageRelativeRoot }];
  const exactIdentities = new Set([packageRelativeRoot]);
  const foldedIdentities = new Set([
    canonicalPackagePathCaseFold(packageRelativeRoot),
  ]);
  let directories = 1;
  let regularFiles = 0;
  let nodes = 1;
  let aggregateBytes = 0;
  if (directories > limits.directories || nodes > limits.nodes) {
    throw new Error('package tree exceeds the reviewed node bound');
  }

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    const handle = opendirSync(current.absolute, { bufferSize: 1 });
    let directEntries = 0;
    try {
      for (;;) {
        const entry = handle.readSync();
        if (entry === null) break;
        directEntries += 1;
        nodes += 1;
        if (directEntries > limits.directoryEntries) {
          throw new Error(
            `package tree exceeds the reviewed per-directory entry bound: ${current.relative}`,
          );
        }
        if (nodes > limits.nodes) {
          throw new Error('package tree exceeds the reviewed node bound');
        }
        const name = entry.name;
        if (
          Buffer.byteLength(name, 'utf8') > limits.segmentBytes ||
          !isCanonicalPackageSegment(name)
        ) {
          throw new Error(`package tree contains a nonportable path segment: ${name}`);
        }
        const relative = `${current.relative}/${name}`;
        if (
          !isCanonicalPackageRelativePath(relative) ||
          relative.split('/').length > limits.pathSegments
        ) {
          throw new Error(`package tree path exceeds the reviewed bound: ${relative}`);
        }
        const folded = canonicalPackagePathCaseFold(relative);
        if (exactIdentities.has(relative) || foldedIdentities.has(folded)) {
          throw new Error(`package tree contains a duplicate portable identity: ${relative}`);
        }
        exactIdentities.add(relative);
        foldedIdentities.add(folded);

        const absolute = path.join(current.absolute, name);
        const stat = lstatSync(absolute);
        if (stat.isSymbolicLink()) {
          throw new Error(`package tree contains an indirect entry: ${relative}`);
        }
        if (stat.isDirectory()) {
          directories += 1;
          if (directories > limits.directories) {
            throw new Error('package tree exceeds the reviewed directory bound');
          }
          entries.push({ absolute, relative, kind: 'directory', stat });
          pending.push({ absolute, relative });
          continue;
        }
        if (!stat.isFile()) {
          throw new Error(`package tree contains a non-regular entry: ${relative}`);
        }
        if (stat.nlink !== 1) {
          throw new Error(
            `package tree regular file must have exactly one hard link: ${relative}; ` +
            `found ${stat.nlink}`,
          );
        }
        if (
          !Number.isSafeInteger(stat.size) ||
          stat.size < 0 ||
          stat.size > limits.fileBytes
        ) {
          throw new Error(`package tree file exceeds the reviewed physical profile: ${relative}`);
        }
        regularFiles += 1;
        if (regularFiles > limits.files) {
          throw new Error('package tree exceeds the reviewed file bound');
        }
        aggregateBytes += stat.size;
        if (aggregateBytes > limits.aggregateBytes) {
          throw new Error('package tree exceeds the reviewed aggregate byte bound');
        }
        entries.push({ absolute, relative, kind: 'file', stat });
      }
    } finally {
      handle.closeSync();
    }
  }

  return { entries, directories, regularFiles, aggregateBytes };
}
