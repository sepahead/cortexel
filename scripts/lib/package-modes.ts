/** Deterministic, indirect-entry-free package mode normalization and verification. */

import { chmodSync, lstatSync, realpathSync, type Stats } from 'node:fs';
import path from 'node:path';

import {
  inspectBoundedPackageTree,
  type BoundedPackageTreeEntry,
} from './bounded-package-tree.js';
import { readDirectRepositoryFile } from './direct-repository-file.js';
import { parseJsonSourceStrict } from './strict-json-source.js';

export interface PackageModeReceipt {
  readonly directories: number;
  readonly regularFiles: number;
  readonly executableFiles: number;
}

export const CLOSED_PACKAGE_FILES = Object.freeze([
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
] as const);

/** Tracked package trees verified recursively without mutating their modes. */
export const CLOSED_PACKAGE_SOURCE_TREES = Object.freeze([
  'assets',
  'docs',
  'LICENSES',
] as const);
const CLOSED_PACKAGE_SOURCE_TREE_SET: ReadonlySet<string> = new Set(
  CLOSED_PACKAGE_SOURCE_TREES,
);

const ROOT_REGULAR_FILES = Object.freeze([
  'package.json',
  ...CLOSED_PACKAGE_FILES.filter((entry) =>
    entry !== 'dist' && !CLOSED_PACKAGE_SOURCE_TREE_SET.has(entry)),
]);

const REGULAR_MODE = 0o644;
const EXECUTABLE_MODE = 0o755;
const DIRECTORY_MODE = 0o755;
const DIST_MODE_TREE_LIMITS = Object.freeze({
  files: 1_024,
  directories: 129,
  nodes: 1_153,
  directoryEntries: 512,
  pathSegments: 17,
  segmentBytes: 255,
  fileBytes: 32 * 1024 * 1024,
  aggregateBytes: 128 * 1024 * 1024,
} as const);
const SOURCE_MODE_TREE_LIMITS = Object.freeze({
  files: 1_024,
  directories: 129,
  nodes: 1_153,
  directoryEntries: 512,
  pathSegments: 17,
  segmentBytes: 255,
  fileBytes: 32 * 1024 * 1024,
  aggregateBytes: 128 * 1024 * 1024,
} as const);
export const PACKAGE_MODE_TREE_LIMITS = Object.freeze({
  dist: DIST_MODE_TREE_LIMITS,
  source: SOURCE_MODE_TREE_LIMITS,
  packageManifestBytes: 1024 * 1024,
} as const);

function isCliEntry(relative: string): boolean {
  return relative === 'dist/cli/main.js';
}

function samePreflightIdentity(left: Stats, right: Stats): boolean {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs &&
    left.birthtimeMs === right.birthtimeMs;
}

function samePostChmodIdentity(left: Stats, right: Stats): boolean {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mtimeMs === right.mtimeMs &&
    left.birthtimeMs === right.birthtimeMs;
}

function inspectCurrentEntry(
  entry: BoundedPackageTreeEntry,
  phase: 'before' | 'after',
): Stats {
  const current = lstatSync(entry.absolute);
  const shapeMatches = !current.isSymbolicLink() && (
    entry.kind === 'directory' ? current.isDirectory() : current.isFile() && current.nlink === 1
  );
  const identityMatches = phase === 'before'
    ? samePreflightIdentity(entry.stat, current)
    : samePostChmodIdentity(entry.stat, current);
  if (!shapeMatches || !identityMatches) {
    throw new Error(`package mode tree changed ${phase} normalization: ${entry.relative}`);
  }
  return current;
}

/**
 * Normalize modes only after every package artifact has been emitted.
 *
 * The walk uses lstat and refuses symlinks and every non-file/non-directory entry.
 * Following an indirect entry here would let mode normalization escape `dist`; silently
 * skipping one would leave a package whose readability depends on the builder's umask.
 */
export function normalizePackageModes(distRoot: string): PackageModeReceipt {
  const inventory = inspectBoundedPackageTree(
    path.resolve(distRoot),
    'dist',
    DIST_MODE_TREE_LIMITS,
  );
  const skillsManifest = inventory.entries.find(
    (entry) => entry.relative === 'dist/skills.manifest.json' && entry.kind === 'file',
  );
  if (skillsManifest === undefined) {
    throw new Error('package root entry must be a direct regular file: dist/skills.manifest.json');
  }
  const executableFiles = inventory.entries.filter(
    (entry) => entry.kind === 'file' && isCliEntry(entry.relative),
  ).length;
  if (executableFiles !== 1) {
    throw new Error(`package dist must contain exactly one executable cli/main.js; found ${executableFiles}`);
  }
  // Revalidate the complete retained inventory immediately before the first
  // mutation. Same-principal mutation after this point remains outside the
  // pathname-time authority described in the repository build contract.
  for (const entry of inventory.entries) inspectCurrentEntry(entry, 'before');
  for (const entry of inventory.entries) {
    chmodSync(
      entry.absolute,
      entry.kind === 'directory'
        ? DIRECTORY_MODE
        : isCliEntry(entry.relative) ? EXECUTABLE_MODE : REGULAR_MODE,
    );
  }
  for (const entry of inventory.entries) {
    const current = inspectCurrentEntry(entry, 'after');
    const expected = entry.kind === 'directory'
      ? DIRECTORY_MODE
      : isCliEntry(entry.relative) ? EXECUTABLE_MODE : REGULAR_MODE;
    if ((current.mode & 0o7777) !== expected) {
      throw new Error(`package mode normalization did not persist: ${entry.relative}`);
    }
  }
  return {
    directories: inventory.directories,
    regularFiles: inventory.regularFiles,
    executableFiles,
  };
}

function requireDirectRegularFile(target: string, relative: string): void {
  const stat = lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`package root entry must be a direct regular file: ${relative}`);
  }
  if (stat.nlink !== 1) {
    throw new Error(
      `package root regular file must have exactly one hard link: ${relative}; ` +
      `found ${stat.nlink}`,
    );
  }
  if (!Number.isSafeInteger(stat.size) || stat.size < 0 || stat.size > 32 * 1024 * 1024) {
    throw new Error(`package root regular file exceeds the reviewed profile: ${relative}`);
  }
}

function requireExactMode(target: string, relative: string, expected: number): void {
  const actual = lstatSync(target).mode & 0o7777;
  if (actual !== expected) {
    throw new Error(
      `package source entry must have mode ${expected.toString(8)}: ${relative}; ` +
      `found ${actual.toString(8)}`,
    );
  }
}

function verifyClosedRegularTree(root: string, relative: string): PackageModeReceipt {
  const absolute = path.join(root, relative);
  const inventory = inspectBoundedPackageTree(
    path.resolve(absolute),
    relative,
    SOURCE_MODE_TREE_LIMITS,
  );
  for (const entry of inventory.entries) {
    requireExactMode(
      entry.absolute,
      entry.relative,
      entry.kind === 'directory' ? DIRECTORY_MODE : REGULAR_MODE,
    );
  }
  return {
    directories: inventory.directories,
    regularFiles: inventory.regularFiles,
    executableFiles: 0,
  };
}

/**
 * Normalize generated dist modes and verify tracked package-source modes without
 * mutating those read-only inputs or traversing unrelated repository paths.
 */
export function finalizePackageModes(repositoryRoot: string): PackageModeReceipt {
  const suppliedRoot = path.resolve(repositoryRoot);
  const rootStat = lstatSync(suppliedRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error('package repository root must be a direct directory');
  }
  const canonicalRoot = realpathSync(suppliedRoot);
  const packagePath = path.join(canonicalRoot, 'package.json');
  requireDirectRegularFile(packagePath, 'package.json');
  const packageJson = parseJsonSourceStrict(
    readDirectRepositoryFile(
      canonicalRoot,
      'package.json',
      PACKAGE_MODE_TREE_LIMITS.packageManifestBytes,
    ),
    'package.json',
  );
  if (
    packageJson === null ||
    typeof packageJson !== 'object' ||
    Array.isArray(packageJson) ||
    !Array.isArray((packageJson as { files?: unknown }).files) ||
    (packageJson as { files: unknown[] }).files.some((entry) => typeof entry !== 'string') ||
    new Set((packageJson as { files: string[] }).files).size !==
      (packageJson as { files: string[] }).files.length ||
    [...(packageJson as { files: string[] }).files].sort().join('\0') !==
      [...CLOSED_PACKAGE_FILES].sort().join('\0')
  ) {
    throw new Error('package.json files must equal the closed package mode inventory');
  }

  let sourceRegularFiles = 0;
  for (const relative of ROOT_REGULAR_FILES) {
    const target = path.join(canonicalRoot, relative);
    requireDirectRegularFile(target, relative);
    requireExactMode(target, relative, REGULAR_MODE);
    sourceRegularFiles += 1;
  }
  const sourceTrees = CLOSED_PACKAGE_SOURCE_TREES.map((relative) =>
    verifyClosedRegularTree(canonicalRoot, relative));
  const dist = normalizePackageModes(path.join(canonicalRoot, 'dist'));
  return {
    directories: dist.directories + sourceTrees.reduce(
      (total, receipt) => total + receipt.directories,
      0,
    ),
    regularFiles: dist.regularFiles + sourceRegularFiles + sourceTrees.reduce(
      (total, receipt) => total + receipt.regularFiles,
      0,
    ),
    executableFiles: dist.executableFiles,
  };
}

export const PACKAGE_FILE_MODES = Object.freeze({
  regular: REGULAR_MODE,
  executable: EXECUTABLE_MODE,
  directory: DIRECTORY_MODE,
});
