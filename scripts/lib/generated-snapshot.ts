/** Raw-byte comparison for generator-owned trees. Text decoding is not an identity. */

import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export interface GeneratedDifference {
  readonly path: string;
  readonly kind: 'missing' | 'extra' | 'changed';
}

export type GeneratedSnapshot = ReadonlyMap<string, Uint8Array>;

const TRANSIENT_GENERATED_DIRECTORY_NAMES = new Set([
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
]);

/** Interpreter/test caches are neither generator output nor freshness evidence. */
export function isTransientGeneratedPath(relative: string): boolean {
  return relative.split(path.sep).some((part) => TRANSIENT_GENERATED_DIRECTORY_NAMES.has(part));
}

function walkGeneratedFiles(root: string, relative: string, out: Map<string, Buffer>): void {
  const absolute = path.join(root, relative);
  let stat: ReturnType<typeof lstatSync>;
  try {
    // lstat observes a dangling symlink as an entry; existsSync would follow it and
    // incorrectly turn an indirect extra into absence.
    stat = lstatSync(absolute);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) return;
    throw error;
  }
  if (isTransientGeneratedPath(relative)) {
    if (stat.isDirectory() && !stat.isSymbolicLink()) return;
    throw new Error(`transient generated path is not a direct directory: ${relative}`);
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`generator-owned tree contains an indirect entry: ${relative}`);
  }
  if (stat.isFile()) {
    out.set(relative, readFileSync(absolute));
    return;
  }
  if (!stat.isDirectory()) {
    throw new Error(`generator-owned tree contains a non-regular entry: ${relative}`);
  }
  for (const name of readdirSync(absolute).sort()) {
    walkGeneratedFiles(root, path.join(relative, name), out);
  }
}

/** Snapshot exactly the generator-owned files as raw bytes, excluding transient caches. */
export function snapshotGeneratedPaths(
  root: string,
  generatedPaths: readonly string[],
): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  for (const target of generatedPaths) walkGeneratedFiles(root, target, out);
  return out;
}

function bytesEqual(expected: Uint8Array, actual: Uint8Array): boolean {
  if (expected.byteLength !== actual.byteLength) return false;
  for (let index = 0; index < expected.byteLength; index += 1) {
    if (expected[index] !== actual[index]) return false;
  }
  return true;
}

/**
 * Compare two generator-owned path inventories without decoding their contents.
 *
 * This matters even for intended-to-be-text outputs: a permissive UTF-8 decoder maps
 * malformed bytes such as 0xff to U+FFFD, so a malformed file and a well-formed file
 * containing the replacement character can otherwise look equal.
 */
export function generatedSnapshotDifferences(
  expected: GeneratedSnapshot,
  actual: GeneratedSnapshot,
): GeneratedDifference[] {
  const paths = new Set([...expected.keys(), ...actual.keys()]);
  return [...paths].sort().flatMap((file): GeneratedDifference[] => {
    const expectedBytes = expected.get(file);
    const actualBytes = actual.get(file);
    if (actualBytes === undefined) return [{ path: file, kind: 'missing' }];
    if (expectedBytes === undefined) return [{ path: file, kind: 'extra' }];
    return bytesEqual(expectedBytes, actualBytes)
      ? []
      : [{ path: file, kind: 'changed' }];
  });
}
