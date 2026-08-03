/** Closed deterministic filesystem inventory for the normative contract source set. */

import { Buffer } from 'node:buffer';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  opendirSync,
  readSync,
  readdirSync,
  type BigIntStats,
} from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

export const NORMATIVE_CONTRACT_DIRECTORIES = Object.freeze([
  'meta',
  'registries',
  'schemas',
  'skills',
] as const);

export const NORMATIVE_CONTRACT_INCLUDE_PATTERNS = Object.freeze(
  NORMATIVE_CONTRACT_DIRECTORIES.map((directory) => `contract/${directory}/**`),
);

export const NORMATIVE_CONTRACT_LIMITS = Object.freeze({
  files: 256,
  directories: 64,
  nodes: 320,
  depth: 8,
  directoryEntries: 256,
  pathBytes: 512,
  segmentBytes: 255,
  fileBytes: 4 * 1024 * 1024,
  aggregateBytes: 32 * 1024 * 1024,
  manifestBytes: 4 * 1024 * 1024,
} as const);

const EXCLUDED_ROOT_FILES = new Set(['manifest.v1.json', 'README.md']);
const EXCLUDED_ROOT_DIRECTORIES = new Set(['conformance']);
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** The registry specifies UTF-8 byte ordering, not JavaScript's UTF-16 ordering. */
export function compareNormativePathsUtf8(left: string, right: string): number {
  const order = Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
  return order !== 0 ? order : left < right ? -1 : left > right ? 1 : 0;
}

function directUtf8Names(directory: string, label: string): string[] {
  // Count through a one-entry streaming handle before allowing the raw-byte array.
  // Same-principal concurrent mutation remains outside this pathname-time authority.
  const handle = opendirSync(directory, { bufferSize: 1 });
  let streamedEntries = 0;
  try {
    while (handle.readSync() !== null) {
      streamedEntries += 1;
      if (streamedEntries > NORMATIVE_CONTRACT_LIMITS.directoryEntries) {
        throw new Error(`${label} exceeds the reviewed per-directory entry bound`);
      }
    }
  } finally {
    handle.closeSync();
  }

  const rawEntries = readdirSync(directory, { encoding: 'buffer' }) as unknown[];
  if (
    rawEntries.length !== streamedEntries ||
    rawEntries.length > NORMATIVE_CONTRACT_LIMITS.directoryEntries
  ) {
    throw new Error(`${label} changed during bounded enumeration`);
  }
  const names: string[] = [];
  const identities = new Set<string>();
  for (const entry of rawEntries) {
    const bytes = Buffer.isBuffer(entry)
      ? entry
      : entry instanceof Uint8Array
        ? Buffer.from(entry)
        : undefined;
    if (bytes === undefined) {
      throw new Error(`${label} did not return raw filename bytes`);
    }
    if (bytes.byteLength > NORMATIVE_CONTRACT_LIMITS.segmentBytes) {
      throw new Error(`${label} contains a filename above the reviewed byte bound`);
    }
    let name: string;
    try {
      name = STRICT_UTF8.decode(bytes);
    } catch {
      throw new Error(`${label} contains a filename that is not well-formed UTF-8`);
    }
    if (!Buffer.from(name, 'utf8').equals(bytes)) {
      throw new Error(`${label} contains a filename that is not canonical UTF-8`);
    }
    if (
      name.length === 0 ||
      name === '.' ||
      name === '..' ||
      name.includes('/') ||
      name.includes('\\') ||
      name.includes('\0')
    ) {
      throw new Error(`${label} contains an unsafe portable filename`);
    }
    if (identities.has(name)) {
      throw new Error(`${label} contains a duplicate decoded filename`);
    }
    identities.add(name);
    names.push(name);
  }
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
  if (stat.isSymbolicLink()) throw new Error(`${label} is a symbolic link`);
  if (EXCLUDED_ROOT_FILES.has(name) && !stat.isFile()) {
    throw new Error(`${label} is not a regular file`);
  }
  if (EXCLUDED_ROOT_DIRECTORIES.has(name) && !stat.isDirectory()) {
    throw new Error(`${label} is not a directory`);
  }
  if (
    name === 'manifest.v1.json' &&
    (!Number.isSafeInteger(stat.size) ||
      stat.size < 0 ||
      stat.size > NORMATIVE_CONTRACT_LIMITS.manifestBytes)
  ) {
    throw new Error(`contract/${name} exceeds the reviewed byte bound`);
  }
}

function assertBoundedRelative(relative: string): void {
  const segments = relative.split('/');
  if (
    relative.length === 0 ||
    path.posix.isAbsolute(relative) ||
    segments.length > NORMATIVE_CONTRACT_LIMITS.depth ||
    Buffer.byteLength(relative, 'utf8') > NORMATIVE_CONTRACT_LIMITS.pathBytes ||
    segments.some((segment) =>
      segment.length === 0 ||
      segment === '.' ||
      segment === '..' ||
      segment.includes('\\') ||
      segment.includes('\0') ||
      Buffer.byteLength(segment, 'utf8') > NORMATIVE_CONTRACT_LIMITS.segmentBytes)
  ) {
    throw new Error(`normative contract path exceeds the reviewed bound: ${relative}`);
  }
}

/**
 * Enumerate every regular JSON file below the declared normative roots.
 *
 * The contract root itself is closed. Its generated manifest, explanatory README,
 * and non-normative conformance corpus are named exclusions rather than accidental
 * omissions. Every declared subtree is iterative, bounded, symlink-free, and JSON-only.
 */
export function enumerateNormativeContractFiles(contractRoot: string): string[] {
  requireDirectDirectory(contractRoot, 'contract root');
  const rootEntries = directUtf8Names(contractRoot, 'contract root');
  const rootEntrySet = new Set(rootEntries);
  for (const directory of NORMATIVE_CONTRACT_DIRECTORIES) {
    if (!rootEntrySet.has(directory)) {
      throw new Error(`missing normative contract directory ${directory}`);
    }
    requireDirectDirectory(path.join(contractRoot, directory), `contract/${directory}`);
  }
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
  const pending = [...NORMATIVE_CONTRACT_DIRECTORIES] as string[];
  let directories = pending.length;
  let nodes = pending.length;
  let aggregateBytes = 0;
  while (pending.length > 0) {
    const relativeDirectory = pending.pop();
    if (relativeDirectory === undefined) break;
    assertBoundedRelative(relativeDirectory);
    const absoluteDirectory = path.join(
      contractRoot,
      ...relativeDirectory.split('/'),
    );
    requireDirectDirectory(absoluteDirectory, `contract/${relativeDirectory}`);
    for (const name of directUtf8Names(
      absoluteDirectory,
      `normative directory ${relativeDirectory}`,
    )) {
      const relative = `${relativeDirectory}/${name}`;
      assertBoundedRelative(relative);
      const absolute = path.join(contractRoot, ...relative.split('/'));
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        throw new Error(`normative contract path is a symbolic link: ${relative}`);
      }
      if (stat.isDirectory()) {
        directories += 1;
        nodes += 1;
        if (
          directories > NORMATIVE_CONTRACT_LIMITS.directories ||
          nodes > NORMATIVE_CONTRACT_LIMITS.nodes
        ) {
          throw new Error('normative contract tree exceeds the reviewed node bound');
        }
        pending.push(relative);
        continue;
      }
      nodes += 1;
      if (nodes > NORMATIVE_CONTRACT_LIMITS.nodes) {
        throw new Error('normative contract tree exceeds the reviewed node bound');
      }
      if (!stat.isFile()) {
        throw new Error(`unsupported normative contract entry: ${relative}`);
      }
      if (!relative.endsWith('.json')) {
        throw new Error(`non-JSON file appears in a normative contract directory: ${relative}`);
      }
      if (
        stat.nlink !== 1 ||
        !Number.isSafeInteger(stat.size) ||
        stat.size < 0 ||
        stat.size > NORMATIVE_CONTRACT_LIMITS.fileBytes
      ) {
        throw new Error(`normative contract file exceeds the reviewed physical profile: ${relative}`);
      }
      files.push(relative);
      if (files.length > NORMATIVE_CONTRACT_LIMITS.files) {
        throw new Error('normative contract tree exceeds the reviewed file bound');
      }
      aggregateBytes += stat.size;
      if (aggregateBytes > NORMATIVE_CONTRACT_LIMITS.aggregateBytes) {
        throw new Error('normative contract tree exceeds the reviewed aggregate byte bound');
      }
    }
  }
  return files.sort(compareNormativePathsUtf8);
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

/** Stable, bounded descriptor read for an enumerated contract identity. */
export function readNormativeContractFile(
  contractRoot: string,
  relative: string,
  maximumBytes: number = NORMATIVE_CONTRACT_LIMITS.fileBytes,
): Buffer {
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 1 ||
    maximumBytes > NORMATIVE_CONTRACT_LIMITS.fileBytes
  ) {
    throw new Error('normative contract file byte bound is invalid');
  }
  requireDirectDirectory(contractRoot, 'contract root');
  assertBoundedRelative(relative);
  const segments = relative.split('/');
  let current = contractRoot;
  const inspected: Array<{ readonly path: string; readonly stat: BigIntStats }> = [];
  const rootStat = lstatSync(current, { bigint: true });
  inspected.push({ path: current, stat: rootStat });
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    const stat = lstatSync(current, { bigint: true });
    if (stat.isSymbolicLink()) {
      throw new Error(`normative contract path is a symbolic link: ${relative}`);
    }
    if (index < segments.length - 1 && !stat.isDirectory()) {
      throw new Error(`normative contract parent is not a directory: ${relative}`);
    }
    if (index === segments.length - 1 && !stat.isFile()) {
      throw new Error(`normative contract path is not a regular file: ${relative}`);
    }
    inspected.push({ path: current, stat });
  }

  let flags = constants.O_RDONLY;
  if (process.platform !== 'win32') {
    if (constants.O_NOFOLLOW <= 0 || constants.O_NONBLOCK <= 0) {
      throw new Error('normative contract no-follow/nonblocking authority is unavailable');
    }
    flags |= constants.O_NOFOLLOW | constants.O_NONBLOCK;
  }
  const descriptor = openSync(current, flags);
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    const leafBefore = inspected.at(-1)!.stat;
    if (
      !opened.isFile() ||
      opened.nlink !== 1n ||
      !sameAuthority(leafBefore, opened) ||
      opened.size < 0n ||
      opened.size > BigInt(maximumBytes)
    ) {
      throw new Error(`normative contract file exceeds the reviewed profile: ${relative}`);
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
        throw new Error(`normative contract file ended before its reviewed size: ${relative}`);
      }
      offset += count;
    }
    const overflow = Buffer.allocUnsafe(1);
    if (readSync(descriptor, overflow, 0, 1, size) !== 0) {
      throw new Error(`normative contract file grew beyond its reviewed size: ${relative}`);
    }
    const descriptorAfter = fstatSync(descriptor, { bigint: true });
    if (!sameAuthority(opened, descriptorAfter)) {
      throw new Error(`normative contract file changed during read: ${relative}`);
    }
    for (const entry of inspected) {
      const after = lstatSync(entry.path, { bigint: true });
      if (
        !sameAuthority(entry.stat, after) ||
        after.isSymbolicLink() ||
        (entry.path === current ? !after.isFile() : !after.isDirectory())
      ) {
        throw new Error(`normative contract path changed during read: ${relative}`);
      }
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}
