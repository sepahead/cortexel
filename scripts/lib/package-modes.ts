/** Deterministic, indirect-entry-free package mode normalization and verification. */

import { chmodSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { parseJsonSourceStrict } from './strict-json-source.js';

export interface PackageModeReceipt {
  readonly directories: number;
  readonly regularFiles: number;
  readonly executableFiles: number;
}

export const CLOSED_PACKAGE_FILES = Object.freeze([
  'dist',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'LICENSES',
  'CHANGELOG.md',
] as const);

const ROOT_REGULAR_FILES = Object.freeze([
  'package.json',
  ...CLOSED_PACKAGE_FILES.filter((entry) => entry !== 'dist' && entry !== 'LICENSES'),
]);

const REGULAR_MODE = 0o644;
const EXECUTABLE_MODE = 0o755;
const DIRECTORY_MODE = 0o755;

function isCliEntry(relative: string): boolean {
  return relative.split(path.sep).join('/') === 'cli/main.js';
}

/**
 * Normalize modes only after every package artifact has been emitted.
 *
 * The walk uses lstat and refuses symlinks and every non-file/non-directory entry.
 * Following an indirect entry here would let mode normalization escape `dist`; silently
 * skipping one would leave a package whose readability depends on the builder's umask.
 */
export function normalizePackageModes(distRoot: string): PackageModeReceipt {
  const root = lstatSync(distRoot);
  if (!root.isDirectory() || root.isSymbolicLink()) {
    throw new Error('package dist root must be a direct directory');
  }
  requireDirectRegularFile(
    path.join(distRoot, 'skills.manifest.json'),
    'dist/skills.manifest.json',
  );

  let directories = 0;
  let regularFiles = 0;
  let executableFiles = 0;

  const walk = (absolute: string, relative: string): void => {
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      throw new Error(`package dist contains an indirect entry: ${relative || '.'}`);
    }
    if (stat.isDirectory()) {
      chmodSync(absolute, DIRECTORY_MODE);
      directories += 1;
      for (const name of readdirSync(absolute).sort()) {
        walk(path.join(absolute, name), path.join(relative, name));
      }
      return;
    }
    if (!stat.isFile()) {
      throw new Error(`package dist contains a non-regular entry: ${relative || '.'}`);
    }
    const executable = isCliEntry(relative);
    chmodSync(absolute, executable ? EXECUTABLE_MODE : REGULAR_MODE);
    regularFiles += 1;
    if (executable) executableFiles += 1;
  };

  walk(distRoot, '');
  if (executableFiles !== 1) {
    throw new Error(`package dist must contain exactly one executable cli/main.js; found ${executableFiles}`);
  }
  return { directories, regularFiles, executableFiles };
}

function requireDirectRegularFile(target: string, relative: string): void {
  const stat = lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`package root entry must be a direct regular file: ${relative}`);
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
  const rootStat = lstatSync(absolute);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error(`package root entry must be a direct directory: ${relative}`);
  }
  requireExactMode(absolute, relative, DIRECTORY_MODE);
  let directories = 0;
  let regularFiles = 0;
  const walk = (directory: string, display: string): void => {
    const stat = lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`package root contains an indirect or non-directory entry: ${display}`);
    }
    requireExactMode(directory, display, DIRECTORY_MODE);
    directories += 1;
    for (const name of readdirSync(directory).sort()) {
      const child = path.join(directory, name);
      const childDisplay = path.join(display, name);
      const childStat = lstatSync(child);
      if (childStat.isSymbolicLink()) {
        throw new Error(`package root contains an indirect entry: ${childDisplay}`);
      }
      if (childStat.isDirectory()) {
        walk(child, childDisplay);
        continue;
      }
      if (!childStat.isFile()) {
        throw new Error(`package root contains a non-regular entry: ${childDisplay}`);
      }
      requireExactMode(child, childDisplay, REGULAR_MODE);
      regularFiles += 1;
    }
  };
  walk(absolute, relative);
  return { directories, regularFiles, executableFiles: 0 };
}

/**
 * Normalize generated dist modes and verify tracked package-source modes without
 * mutating those read-only inputs or traversing unrelated repository paths.
 */
export function finalizePackageModes(repositoryRoot: string): PackageModeReceipt {
  const packagePath = path.join(repositoryRoot, 'package.json');
  requireDirectRegularFile(packagePath, 'package.json');
  const packageJson = parseJsonSourceStrict(
    readFileSync(packagePath),
    'package.json',
  ) as { files?: unknown };
  if (
    !Array.isArray(packageJson.files) ||
    packageJson.files.some((entry) => typeof entry !== 'string') ||
    new Set(packageJson.files).size !== packageJson.files.length ||
    [...packageJson.files].sort().join('\0') !== [...CLOSED_PACKAGE_FILES].sort().join('\0')
  ) {
    throw new Error('package.json files must equal the closed package mode inventory');
  }

  let sourceRegularFiles = 0;
  for (const relative of ROOT_REGULAR_FILES) {
    const target = path.join(repositoryRoot, relative);
    requireDirectRegularFile(target, relative);
    requireExactMode(target, relative, REGULAR_MODE);
    sourceRegularFiles += 1;
  }
  const licenses = verifyClosedRegularTree(repositoryRoot, 'LICENSES');
  const dist = normalizePackageModes(path.join(repositoryRoot, 'dist'));
  return {
    directories: dist.directories + licenses.directories,
    regularFiles: dist.regularFiles + sourceRegularFiles + licenses.regularFiles,
    executableFiles: dist.executableFiles,
  };
}

export const PACKAGE_FILE_MODES = Object.freeze({
  regular: REGULAR_MODE,
  executable: EXECUTABLE_MODE,
  directory: DIRECTORY_MODE,
});
