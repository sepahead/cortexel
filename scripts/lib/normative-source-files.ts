/** Closed deterministic filesystem inventory for the normative contract source set. */

import { lstatSync, readdirSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import path from 'node:path';

export const NORMATIVE_CONTRACT_DIRECTORIES = Object.freeze([
  'meta',
  'registries',
  'schemas',
  'skills',
] as const);

export const NORMATIVE_CONTRACT_INCLUDE_PATTERNS = Object.freeze(
  NORMATIVE_CONTRACT_DIRECTORIES.map((directory) => `contract/${directory}/**`),
);

const EXCLUDED_ROOT_FILES = new Set(['manifest.v1.json', 'README.md']);
const EXCLUDED_ROOT_DIRECTORIES = new Set(['conformance']);

function portable(relative: string): string {
  return relative.split(path.sep).join('/');
}

/** The registry specifies UTF-8 byte ordering, not JavaScript's UTF-16 ordering. */
export function compareNormativePathsUtf8(left: string, right: string): number {
  const order = Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
  // Directory names cross a fatal UTF-8 boundary before reaching this comparator, so
  // equal bytes imply equal names. The fallback keeps this standalone helper total.
  return order !== 0 ? order : left < right ? -1 : left > right ? 1 : 0;
}

function directUtf8Names(directory: string, label: string): string[] {
  const entries = readdirSync(directory, { encoding: 'buffer' });
  const names = entries.map((entry) => {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(entry);
    } catch {
      throw new Error(`${label} contains a filename that is not well-formed UTF-8`);
    }
  });
  return names.sort(compareNormativePathsUtf8);
}

function requireDirectDirectory(root: string, label: string): void {
  const stat = lstatSync(root);
  if (stat.isSymbolicLink()) throw new Error(`${label} is a symbolic link`);
  if (!stat.isDirectory()) throw new Error(`${label} is not a directory`);
}

function requireExcludedRootEntryShape(absolute: string, name: string): void {
  const stat = lstatSync(absolute);
  const label = name === 'manifest.v1.json'
    ? 'contract/manifest.v1.json'
    : `excluded contract-root path ${name}`;
  if (stat.isSymbolicLink()) {
    throw new Error(`${label} is a symbolic link`);
  }
  if (EXCLUDED_ROOT_FILES.has(name) && !stat.isFile()) {
    throw new Error(`${label} is not a regular file`);
  }
  if (EXCLUDED_ROOT_DIRECTORIES.has(name) && !stat.isDirectory()) {
    throw new Error(`${label} is not a directory`);
  }
}

function walkJsonFiles(root: string, relative: string, output: string[]): void {
  const absolute = path.join(root, relative);
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink()) {
    throw new Error(`normative contract path is a symbolic link: ${portable(relative)}`);
  }
  if (stat.isFile()) {
    if (!relative.endsWith('.json')) {
      throw new Error(
        `non-JSON file appears in a normative contract directory: ${portable(relative)}`,
      );
    }
    output.push(portable(relative));
    return;
  }
  if (!stat.isDirectory()) {
    throw new Error(`unsupported normative contract entry: ${portable(relative)}`);
  }
  for (const name of directUtf8Names(absolute, `normative directory ${portable(relative)}`)) {
    walkJsonFiles(root, path.join(relative, name), output);
  }
}

/**
 * Enumerate every regular JSON file below the declared normative roots.
 *
 * The contract root itself is closed. Its generated manifest, explanatory README,
 * and non-normative conformance corpus are named exclusions rather than accidental
 * omissions. Every declared subtree is recursive, symlink-free, and JSON-only.
 */
export function enumerateNormativeContractFiles(
  contractRoot: string,
): string[] {
  requireDirectDirectory(contractRoot, 'contract root');
  const rootEntries = directUtf8Names(contractRoot, 'contract root');
  const rootEntrySet = new Set(rootEntries);
  for (const directory of NORMATIVE_CONTRACT_DIRECTORIES) {
    if (!rootEntrySet.has(directory)) {
      throw new Error(`missing normative contract directory ${directory}`);
    }
    requireDirectDirectory(path.join(contractRoot, directory), `contract/${directory}`);
  }
  // Check named exclusions before reporting unrelated unexpected entries. In
  // particular, a replaced manifest must be diagnosed as an indirect manifest even
  // when its attacker-controlled target happens to sit beside it.
  for (const name of [...EXCLUDED_ROOT_FILES, ...EXCLUDED_ROOT_DIRECTORIES]) {
    if (rootEntrySet.has(name)) {
      requireExcludedRootEntryShape(path.join(contractRoot, name), name);
    }
  }
  for (const name of rootEntries) {
    if ((NORMATIVE_CONTRACT_DIRECTORIES as readonly string[]).includes(name)) continue;
    if (EXCLUDED_ROOT_FILES.has(name) || EXCLUDED_ROOT_DIRECTORIES.has(name)) continue;
    throw new Error(`unexpected contract-root entry: ${name}`);
  }

  const files: string[] = [];
  for (const directory of NORMATIVE_CONTRACT_DIRECTORIES) {
    walkJsonFiles(contractRoot, directory, files);
  }
  return files.sort(compareNormativePathsUtf8);
}
