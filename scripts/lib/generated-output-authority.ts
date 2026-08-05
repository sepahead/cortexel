/**
 * Closed authority for contract-generator outputs and controlling source inputs.
 *
 * The generator and its freshness checker must consume the same inventory. A second
 * handwritten list would turn freshness into an agreement between two potentially
 * stale claims rather than evidence about the generator's actual authority.
 */

import {
  chmodSync,
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  opendirSync,
  readlinkSync,
  readSync,
  writeSync,
  type BigIntStats,
} from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

export interface GeneratedDifference {
  readonly path: string;
  readonly kind: 'missing' | 'extra' | 'changed';
}

export type GeneratedSnapshot = ReadonlyMap<string, Uint8Array>;

export interface GeneratedSnapshotLimits {
  readonly depth: number;
  readonly directoryEntries: number;
  readonly files: number;
  readonly directories: number;
  readonly nodes: number;
  readonly pathBytes: number;
  readonly segmentBytes: number;
  readonly fileBytes: number;
  readonly aggregateBytes: number;
  readonly symlinkBytes: number;
}

/** Closed allocation/work profile shared by every generated-authority snapshot. */
export const GENERATED_SNAPSHOT_LIMITS = Object.freeze({
  depth: 16,
  directoryEntries: 512,
  files: 1_024,
  directories: 256,
  nodes: 1_280,
  pathBytes: 1_024,
  segmentBytes: 255,
  fileBytes: 8 * 1024 * 1024,
  aggregateBytes: 64 * 1024 * 1024,
  symlinkBytes: 4_096,
} as const satisfies GeneratedSnapshotLimits);

export interface GeneratedOutputInventoryEntry {
  readonly path: string;
  readonly kind: 'file' | 'tree';
}

function generatedOutput(
  outputPath: string,
  kind: GeneratedOutputInventoryEntry['kind'],
): GeneratedOutputInventoryEntry {
  return Object.freeze({ path: outputPath, kind });
}

/** Complete typed inventory of repository paths the contract generator owns. */
export const GENERATED_OUTPUT_INVENTORY = Object.freeze([
  generatedOutput('src/generated', 'tree'),
  generatedOutput('contract/manifest.v1.json', 'file'),
  generatedOutput('contract/schemas/generated', 'tree'),
  generatedOutput('contract/schemas/skills', 'tree'),
  generatedOutput('contract/schemas/stable-figure-request-union.v1.schema.json', 'file'),
  generatedOutput('python/src/cortexel/generated', 'tree'),
  generatedOutput('python/src/cortexel/contract', 'tree'),
]);

/** Exact roots, derived rather than independently restating the typed inventory. */
export const GENERATED_OUTPUT_ROOTS = Object.freeze(
  GENERATED_OUTPUT_INVENTORY.map((entry) => entry.path),
);

/** Host-local or independently produced trees that are not generator inputs. */
export const GENERATOR_COPY_EXCLUDED_ROOTS = Object.freeze([
  '.git',
  '.superstack',
  '.venv',
  'coverage',
  'dist',
  'node_modules',
] as const);

const COPY_EXCLUDED_ROOT_SET = new Set<string>(GENERATOR_COPY_EXCLUDED_ROOTS);
const TRANSIENT_DIRECTORY_NAMES = new Set([
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.venv',
]);
const GENERATED_TRANSIENT_DIRECTORY_NAMES = new Set([
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
]);
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true });

function normalizeRepositoryRelative(relative: string): string | null {
  if (relative.includes('\0') || path.isAbsolute(relative)) return null;
  const normalized = path.normalize(relative);
  if (normalized === '.') return '';
  if (
    normalized === '..'
    || normalized.startsWith(`..${path.sep}`)
    || path.isAbsolute(normalized)
  ) return null;
  return normalized.split(path.sep).join('/');
}

function normalizedGeneratedOutputEntry(
  normalized: string,
): GeneratedOutputInventoryEntry | undefined {
  return GENERATED_OUTPUT_INVENTORY.find((entry) =>
    entry.kind === 'file'
      ? normalized === entry.path
      : normalized === entry.path || normalized.startsWith(`${entry.path}/`));
}

/** True only for an exact file output or a tree root/descendant. */
export function isGeneratedOutputPath(relative: string): boolean {
  const normalized = normalizeRepositoryRelative(relative);
  if (normalized === null || normalized === '') return false;
  return normalizedGeneratedOutputEntry(normalized) !== undefined;
}

/** True only for an exact file output or a strict file descendant of a tree output. */
export function isGeneratedOutputFilePath(relative: string): boolean {
  const normalized = normalizeRepositoryRelative(relative);
  if (normalized === null || normalized === '') return false;
  return GENERATED_OUTPUT_INVENTORY.some((entry) =>
    entry.kind === 'file'
      ? normalized === entry.path
      : normalized.startsWith(`${entry.path}/`));
}

/** True only for a tree root or a directory descendant of that tree. */
export function isGeneratedOutputDirectoryPath(relative: string): boolean {
  const normalized = normalizeRepositoryRelative(relative);
  if (normalized === null || normalized === '') return false;
  return GENERATED_OUTPUT_INVENTORY.some((entry) =>
    entry.kind === 'tree'
    && (normalized === entry.path || normalized.startsWith(`${entry.path}/`)));
}

/**
 * Authorize one generator mutation lexically within the repository and output inventory.
 *
 * Isolated generation starts with these roots absent, and the generated-tree snapshot
 * rejects indirect entries. This lexical check is the write-side complement: every
 * current generator mutation must name a path in the same closed inventory.
 */
export function assertGeneratedOutputPath(repositoryRoot: string, target: string): string {
  const resolvedRoot = path.resolve(repositoryRoot);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  const normalized = normalizeRepositoryRelative(relative);
  if (normalized === null || !isGeneratedOutputPath(normalized)) {
    throw new Error(
      `contract generator mutation is outside its closed output inventory: ${target}`,
    );
  }
  return normalized;
}

function assertGeneratedPathKind(
  repositoryRoot: string,
  target: string,
  kind: 'file' | 'directory',
): string {
  const resolvedRoot = path.resolve(repositoryRoot);
  const resolvedTarget = path.resolve(target);
  const normalized = normalizeRepositoryRelative(path.relative(resolvedRoot, resolvedTarget));
  const allowed = kind === 'file'
    ? normalized !== null && isGeneratedOutputFilePath(normalized)
    : normalized !== null && isGeneratedOutputDirectoryPath(normalized);
  if (!allowed || normalized === null) {
    throw new Error(
      `contract generator mutation is not an authorized generated ${kind}: ${target}`,
    );
  }
  return normalized;
}

export function assertGeneratedOutputFilePath(
  repositoryRoot: string,
  target: string,
): string {
  return assertGeneratedPathKind(repositoryRoot, target, 'file');
}

export function assertGeneratedOutputDirectoryPath(
  repositoryRoot: string,
  target: string,
): string {
  return assertGeneratedPathKind(repositoryRoot, target, 'directory');
}

/**
 * Inspect every repository-relative directory component without following a symlink.
 *
 * `lstat(targetParent)` alone is insufficient: an earlier component may be a symlink,
 * in which case the final lstat has already crossed an indirect authority boundary.
 * Absence is returned only after every existing prefix has been proven direct.
 */
export function directRepositoryDirectoryExists(
  repositoryRoot: string,
  directory: string,
): boolean {
  const resolvedRoot = path.resolve(repositoryRoot);
  const resolvedDirectory = path.resolve(directory);
  const relative = path.relative(resolvedRoot, resolvedDirectory);
  const normalized = normalizeRepositoryRelative(relative);
  if (normalized === null) {
    throw new Error(`repository directory is outside its root: ${directory}`);
  }

  const rootStat = lstatSync(resolvedRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`repository root is not a direct directory: ${resolvedRoot}`);
  }

  let current = resolvedRoot;
  for (const component of normalized === '' ? [] : normalized.split('/')) {
    current = path.join(current, component);
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(
        `repository directory chain contains an indirect or non-directory entry: ${current}`,
      );
    }
  }
  return true;
}

/**
 * Create a generated directory without recursively creating undeclared ancestors.
 *
 * Every missing component must itself be inside the closed output inventory. The
 * nearest existing parent must already be a direct repository directory.
 */
export function ensureGeneratedOutputDirectory(
  repositoryRoot: string,
  directory: string,
): void {
  assertGeneratedOutputDirectoryPath(repositoryRoot, directory);
  const missing: string[] = [];
  let current = path.resolve(directory);

  while (!directRepositoryDirectoryExists(repositoryRoot, current)) {
    // This rejects a missing non-owned ancestor before mkdir can create it.
    assertGeneratedOutputDirectoryPath(repositoryRoot, current);
    missing.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`generated directory has no direct repository ancestor: ${directory}`);
    }
    current = parent;
  }

  for (const target of missing.reverse()) {
    // Generated output modes are part of the freshness identity.  Do not let a
    // caller's ambient umask (the release sandbox intentionally uses 0077)
    // make an otherwise byte-identical generation appear stale.
    mkdirSync(target, { mode: 0o755 });
    chmodSync(target, 0o755);
    if (!directRepositoryDirectoryExists(repositoryRoot, target)) {
      throw new Error(`generated directory was not created directly: ${target}`);
    }
  }
}

/**
 * Snapshot each owned output with its declared kind, direct topology, mode, and bytes.
 *
 * Directory entries—including empty directories—participate in identity. Permission
 * bits are normalized to the low 12 POSIX mode bits; timestamps, uid/gid, device, and
 * inode are intentionally excluded because independent zero-state trees cannot share
 * those identities. Symlinks and special files fail closed.
 */
export function snapshotGeneratedOutputInventory(root: string): Map<string, Buffer> {
  return snapshotGeneratedOutputInventoryWithControl(root, {
    limits: GENERATED_SNAPSHOT_LIMITS,
    mutation: null,
  });
}

/**
 * The conservative source-copy/input policy used by isolated generation.
 *
 * It intentionally over-approximates the generator's imported and normative inputs.
 * That makes an unrelated copied source edit fail the check rather than allowing the
 * two isolated passes to observe a different source state.
 */
export function isGeneratorControllingInputPath(relative: string): boolean {
  const normalized = normalizeRepositoryRelative(relative);
  if (normalized === null) return false;
  if (normalized === '') return true;
  if (isGeneratedOutputPath(normalized)) return false;

  const parts = normalized.split('/');
  if (COPY_EXCLUDED_ROOT_SET.has(parts[0])) return false;
  if (parts.some((part) => TRANSIENT_DIRECTORY_NAMES.has(part))) return false;

  const basename = parts[parts.length - 1];
  // Contract generation has no credential-bearing input. Keep local environment
  // files out of both the temporary tree and the source-authority snapshot.
  if (
    basename === '.env'
    || (basename.startsWith('.env.') && basename !== '.env.example')
  ) return false;
  return true;
}

type SnapshotEntryKind = 'directory' | 'file' | 'symlink';

type SnapshotProfileKind = 'generated-output' | 'generated-paths' | 'repository';
type GeneratedSnapshotTestStage =
  | 'after-path-stat-before-open'
  | 'after-file-fstat-before-read'
  | 'before-final-symlink-target-revalidation';

interface SnapshotRoot {
  readonly relative: string;
  readonly expectedKind: 'file' | 'tree' | 'either';
}

interface SnapshotOptions {
  readonly profile: SnapshotProfileKind;
  readonly roots: readonly SnapshotRoot[] | null;
  readonly include: (relative: string) => boolean;
  readonly includeRoot: boolean;
  readonly bindFilesystemIdentity: boolean;
  readonly encodeEntryMetadata: boolean;
  readonly recordDirectories: boolean;
  readonly recordSymlinks: boolean;
  readonly rejectHardlinks: boolean;
  readonly transientDirectoryNames: ReadonlySet<string> | null;
}

interface SnapshotTestMutation {
  readonly stage: GeneratedSnapshotTestStage;
  readonly relative: string;
  readonly run: (absolute: string) => void;
}

interface SnapshotControl {
  readonly limits: GeneratedSnapshotLimits;
  readonly mutation: SnapshotTestMutation | null;
}

interface RuntimeSnapshotMutation extends SnapshotTestMutation {
  invoked: boolean;
}

interface ObservedSnapshotEntry {
  readonly absolute: string;
  readonly relative: string;
  readonly key: string;
  readonly kind: SnapshotEntryKind;
  readonly stat: BigIntStats;
  readonly record: boolean;
  readonly header: string;
}

interface ObservedPathAuthority {
  readonly absolute: string;
  readonly relative: string;
  readonly kind: SnapshotEntryKind;
  readonly stat: BigIntStats;
}

interface SnapshotCounters {
  files: number;
  directories: number;
  nodes: number;
  fileBytes: number;
  projectedRetainedBytes: number;
}

export interface TrustedGeneratedSnapshotTestControl {
  readonly limits: GeneratedSnapshotLimits;
  readonly mutation?: {
    readonly stage: GeneratedSnapshotTestStage;
    readonly relative: string;
    readonly run: (absolute: string) => void;
  };
}

function assertSnapshotLimits(limits: GeneratedSnapshotLimits): void {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error(`generated snapshot has an invalid ${name} limit`);
    }
  }
  if (limits.nodes < limits.files || limits.nodes < limits.directories) {
    throw new Error('generated snapshot node limit cannot cover its component limits');
  }
}

function sameSnapshotAuthority(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.nlink === right.nlink
    && left.uid === right.uid
    && left.gid === right.gid
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.birthtimeNs === right.birthtimeNs;
}

function snapshotEntryKind(stat: BigIntStats): SnapshotEntryKind | null {
  if (stat.isSymbolicLink()) return 'symlink';
  if (stat.isFile()) return 'file';
  if (stat.isDirectory()) return 'directory';
  return null;
}

function assertBoundedSnapshotRelative(
  relative: string,
  limits: GeneratedSnapshotLimits,
  allowRoot: boolean,
): void {
  if (typeof relative !== 'string') {
    throw new Error('generated snapshot paths must be primitive strings');
  }
  if (relative === '' && allowRoot) return;
  const segments = relative.split('/');
  if (
    relative.length === 0
    || path.posix.isAbsolute(relative)
    || segments.length > limits.depth
    || Buffer.byteLength(relative, 'utf8') > limits.pathBytes
    || segments.some((segment) =>
      segment.length === 0
      || segment === '.'
      || segment === '..'
      || segment.includes('/')
      || segment.includes('\\')
      || segment.includes('\0')
      || Buffer.byteLength(segment, 'utf8') > limits.segmentBytes)
  ) {
    throw new Error(`generated snapshot path exceeds the reviewed bound: ${relative || '.'}`);
  }
}

function canonicalSnapshotRoot(
  relative: string,
  limits: GeneratedSnapshotLimits,
): string {
  if (typeof relative !== 'string') {
    throw new Error('generated snapshot roots must be primitive strings');
  }
  const normalized = normalizeRepositoryRelative(relative);
  const portable = relative.split(path.sep).join('/');
  if (normalized === null || normalized === '' || normalized !== portable) {
    throw new Error(`generated snapshot root is not canonical: ${relative}`);
  }
  assertBoundedSnapshotRelative(normalized, limits, false);
  return normalized;
}

function decodeSnapshotDirectoryName(
  rawName: unknown,
  relative: string,
  limits: GeneratedSnapshotLimits,
): string {
  const encoded = Buffer.isBuffer(rawName)
    ? rawName
    : rawName instanceof Uint8Array
      ? Buffer.from(rawName)
      : null;
  if (encoded === null) {
    throw new Error(
      `repository snapshot did not receive raw path bytes below ${relative || '.'}`,
    );
  }
  if (encoded.byteLength > limits.segmentBytes) {
    throw new Error(
      `repository snapshot contains a path segment above the reviewed byte bound below `
        + `${relative || '.'}`,
    );
  }
  let decoded: string;
  try {
    decoded = STRICT_UTF8.decode(encoded);
  } catch {
    throw new Error(
      `repository snapshot contains a non-UTF-8 path below ${relative || '.'}`,
    );
  }
  if (
    !Buffer.from(decoded, 'utf8').equals(encoded)
    || decoded.length === 0
    || decoded === '.'
    || decoded === '..'
    || decoded.includes('/')
    || decoded.includes('\\')
    || decoded.includes('\0')
  ) {
    throw new Error(
      `repository snapshot cannot round-trip a safe path below ${relative || '.'}`,
    );
  }
  return decoded;
}

function reviewedSnapshotFileFlags(): number {
  if (
    !Number.isSafeInteger(constants.O_NOFOLLOW)
    || constants.O_NOFOLLOW <= 0
    || !Number.isSafeInteger(constants.O_NONBLOCK)
    || constants.O_NONBLOCK <= 0
  ) {
    throw new Error('generated snapshot no-follow/nonblocking file authority is unavailable');
  }
  return constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
}

function reviewedSnapshotDirectoryFlags(): number {
  if (
    !Number.isSafeInteger(constants.O_DIRECTORY)
    || constants.O_DIRECTORY <= 0
    || !Number.isSafeInteger(constants.O_NOFOLLOW)
    || constants.O_NOFOLLOW <= 0
    || !Number.isSafeInteger(constants.O_NONBLOCK)
    || constants.O_NONBLOCK <= 0
  ) {
    throw new Error('generated snapshot no-follow directory authority is unavailable');
  }
  return constants.O_RDONLY
    | constants.O_DIRECTORY
    | constants.O_NOFOLLOW
    | constants.O_NONBLOCK;
}

function readBoundedDirectoryNames(
  entry: ObservedSnapshotEntry,
  limits: GeneratedSnapshotLimits,
): string[] {
  const before = lstatSync(entry.absolute, { bigint: true });
  if (
    !before.isDirectory()
    || before.isSymbolicLink()
    || !sameSnapshotAuthority(entry.stat, before)
  ) {
    throw new Error(`repository snapshot directory changed before enumeration: ${entry.key}`);
  }

  const directoryFlags = reviewedSnapshotDirectoryFlags();
  const descriptor = openSync(entry.absolute, directoryFlags);
  let handle: ReturnType<typeof opendirSync> | null = null;
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isDirectory() || !sameSnapshotAuthority(before, opened)) {
      throw new Error(`repository snapshot directory changed before open: ${entry.key}`);
    }

    // Node returns Dirent names as raw Buffers and Bun 1.3 returns the raw
    // Uint8Array entry itself. A runtime that returns decoded strings has already
    // discarded raw filename-byte authority and must fail closed. Keep every
    // verified case on this one-entry-at-a-time path: an array-returning fallback
    // could allocate an attacker-expanded directory before its length is checked.
    handle = opendirSync(entry.absolute, {
      encoding: 'buffer' as BufferEncoding,
      bufferSize: 1,
    });
    let streamedEntries = 0;
    const streamedRawNames: Buffer[] = [];
    for (;;) {
      const directoryEntry = handle.readSync();
      if (directoryEntry === null) break;
      streamedEntries += 1;
      if (streamedEntries > limits.directoryEntries) {
        throw new Error(
          `repository snapshot exceeds the reviewed per-directory entry bound: ${entry.key}`,
        );
      }
      // Bun 1.3 returns the raw Uint8Array itself for `encoding: 'buffer'`;
      // Node returns a Dirent whose `name` carries those bytes.
      const returnedEntry: unknown = directoryEntry;
      const rawName = Buffer.isBuffer(returnedEntry) || returnedEntry instanceof Uint8Array
        ? returnedEntry
        : (returnedEntry as { readonly name?: unknown }).name;
      if (Buffer.isBuffer(rawName) || rawName instanceof Uint8Array) {
        if (rawName.byteLength > limits.segmentBytes) {
          throw new Error(
            `repository snapshot contains a path segment above the reviewed byte bound below `
              + `${entry.relative || '.'}`,
          );
        }
        streamedRawNames.push(Buffer.from(rawName));
      } else {
        throw new Error(
          `repository snapshot received an unsupported path representation below `
            + `${entry.relative || '.'}`,
        );
      }
    }
    handle.closeSync();
    handle = null;

    const rawNames = streamedRawNames;
    if (rawNames.length !== streamedEntries || rawNames.length > limits.directoryEntries) {
      throw new Error(`repository snapshot directory changed during enumeration: ${entry.key}`);
    }
    const names: Array<{ readonly bytes: Buffer; readonly decoded: string }> = [];
    const decodedNames = new Set<string>();
    for (const rawName of rawNames) {
      const decoded = decodeSnapshotDirectoryName(rawName, entry.relative, limits);
      if (decodedNames.has(decoded)) {
        throw new Error(`repository snapshot contains a duplicate decoded path: ${entry.key}`);
      }
      decodedNames.add(decoded);
      names.push({ bytes: rawName, decoded });
    }

    const descriptorAfter = fstatSync(descriptor, { bigint: true });
    if (!descriptorAfter.isDirectory() || !sameSnapshotAuthority(before, descriptorAfter)) {
      throw new Error(`repository snapshot directory changed during enumeration: ${entry.key}`);
    }
    const pathAfter = lstatSync(entry.absolute, { bigint: true });
    if (
      !pathAfter.isDirectory()
      || pathAfter.isSymbolicLink()
      || !sameSnapshotAuthority(before, pathAfter)
    ) {
      throw new Error(`repository snapshot directory path changed during enumeration: ${entry.key}`);
    }
    names.sort((left, right) => Buffer.compare(left.bytes, right.bytes));
    return names.map(({ decoded }) => decoded);
  } finally {
    if (handle !== null) handle.closeSync();
    closeSync(descriptor);
  }
}

function snapshotIdentity(
  kind: SnapshotEntryKind,
  stat: BigIntStats,
  bindFilesystemIdentity: boolean,
): string {
  if (!bindFilesystemIdentity) return '';
  if (kind === 'directory') return `;dev:${stat.dev};ino:${stat.ino}`;
  return `;dev:${stat.dev};ino:${stat.ino};nlink:${stat.nlink}`;
}

function snapshotHeader(
  kind: SnapshotEntryKind,
  stat: BigIntStats,
  options: SnapshotOptions,
): string {
  if (!options.encodeEntryMetadata) return '';
  const mode = kind === 'symlink' && !options.bindFilesystemIdentity
    ? 0n
    : stat.mode & 0o7777n;
  return `${kind}\0mode:${mode.toString(8).padStart(4, '0')}`
    + `${snapshotIdentity(kind, stat, options.bindFilesystemIdentity)}\0`;
}

function snapshotIndirectMessage(profile: SnapshotProfileKind, relative: string): string {
  return profile === 'generated-paths'
    ? `generator-owned tree contains an indirect entry: ${relative}`
    : profile === 'generated-output'
      ? `generated output contains an indirect entry: ${relative}`
      : `repository snapshot contains an indirect entry: ${relative}`;
}

function snapshotSpecialMessage(profile: SnapshotProfileKind, relative: string): string {
  return profile === 'generated-paths'
    ? `generator-owned tree contains a non-regular entry: ${relative}`
    : profile === 'generated-output'
      ? `generated output contains a special entry: ${relative}`
      : `repository snapshot contains a non-regular entry: ${relative}`;
}

function snapshotHardlinkMessage(profile: SnapshotProfileKind, relative: string): string {
  return profile === 'generated-paths'
    ? `generator-owned output file is hard-linked: ${relative}`
    : `generated output file is hard-linked: ${relative}`;
}

function fireSnapshotTestMutation(
  mutation: RuntimeSnapshotMutation | null,
  stage: GeneratedSnapshotTestStage,
  entry: ObservedSnapshotEntry,
): void {
  if (
    mutation === null
    || mutation.invoked
    || mutation.stage !== stage
    || mutation.relative !== entry.relative
  ) return;
  mutation.invoked = true;
  mutation.run(entry.absolute);
}

function stableSnapshotFileValue(
  entry: ObservedSnapshotEntry,
  options: SnapshotOptions,
  limits: GeneratedSnapshotLimits,
  mutation: RuntimeSnapshotMutation | null,
): Buffer {
  const beforeOpen = lstatSync(entry.absolute, { bigint: true });
  if (
    !beforeOpen.isFile()
    || beforeOpen.isSymbolicLink()
    || !sameSnapshotAuthority(entry.stat, beforeOpen)
  ) {
    throw new Error(`generated snapshot file changed before open: ${entry.key}`);
  }
  fireSnapshotTestMutation(mutation, 'after-path-stat-before-open', entry);

  let descriptor: number;
  try {
    descriptor = openSync(entry.absolute, reviewedSnapshotFileFlags());
  } catch (error) {
    throw new Error(
      `generated snapshot file could not be opened without following it: ${entry.key}`,
      { cause: error },
    );
  }
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (
      !opened.isFile()
      || !sameSnapshotAuthority(entry.stat, opened)
      || (options.rejectHardlinks && opened.nlink !== 1n)
      || opened.size < 0n
      || opened.size > BigInt(limits.fileBytes)
    ) {
      throw new Error(`generated snapshot file changed before read: ${entry.key}`);
    }
    const size = Number(opened.size);
    const headerBytes = Buffer.from(entry.header, 'utf8');
    const retainedSize = headerBytes.byteLength + size;
    if (
      !Number.isSafeInteger(retainedSize)
      || retainedSize > limits.aggregateBytes
    ) {
      throw new Error('generated snapshot exceeds the reviewed aggregate byte bound');
    }
    const value = Buffer.allocUnsafe(retainedSize);
    headerBytes.copy(value, 0);

    fireSnapshotTestMutation(mutation, 'after-file-fstat-before-read', entry);
    let offset = 0;
    while (offset < size) {
      const count = readSync(
        descriptor,
        value,
        headerBytes.byteLength + offset,
        Math.min(1024 * 1024, size - offset),
        offset,
      );
      if (count <= 0) {
        throw new Error(`generated snapshot file ended before its reviewed size: ${entry.key}`);
      }
      offset += count;
    }
    const overflowProbe = Buffer.allocUnsafe(1);
    if (readSync(descriptor, overflowProbe, 0, 1, size) !== 0) {
      throw new Error(`generated snapshot file grew beyond its reviewed size: ${entry.key}`);
    }
    const descriptorAfter = fstatSync(descriptor, { bigint: true });
    const pathAfter = lstatSync(entry.absolute, { bigint: true });
    if (
      !descriptorAfter.isFile()
      || !pathAfter.isFile()
      || pathAfter.isSymbolicLink()
      || !sameSnapshotAuthority(opened, descriptorAfter)
      || !sameSnapshotAuthority(opened, pathAfter)
      || (options.rejectHardlinks && descriptorAfter.nlink !== 1n)
    ) {
      throw new Error(`generated snapshot file changed during read: ${entry.key}`);
    }
    return value;
  } finally {
    closeSync(descriptor);
  }
}

function stableSnapshotSymlinkValue(
  entry: ObservedSnapshotEntry,
  limits: GeneratedSnapshotLimits,
): Buffer {
  const before = lstatSync(entry.absolute, { bigint: true });
  if (!before.isSymbolicLink() || !sameSnapshotAuthority(entry.stat, before)) {
    throw new Error(`repository snapshot symlink changed before read: ${entry.key}`);
  }
  const target = readlinkSync(entry.absolute, { encoding: 'buffer' });
  if (target.byteLength > limits.symlinkBytes) {
    throw new Error(`repository snapshot symlink exceeds the reviewed byte bound: ${entry.key}`);
  }
  const after = lstatSync(entry.absolute, { bigint: true });
  if (!after.isSymbolicLink() || !sameSnapshotAuthority(before, after)) {
    throw new Error(`repository snapshot symlink changed during read: ${entry.key}`);
  }
  const headerBytes = Buffer.from(entry.header, 'utf8');
  const value = Buffer.allocUnsafe(headerBytes.byteLength + target.byteLength);
  headerBytes.copy(value, 0);
  target.copy(value, headerBytes.byteLength);
  return value;
}

function revalidateSnapshotAuthorities(
  authorities: ReadonlyMap<string, ObservedPathAuthority>,
  snapshot: ReadonlyMap<string, Buffer>,
  entries: readonly ObservedSnapshotEntry[],
  limits: GeneratedSnapshotLimits,
  mutation: RuntimeSnapshotMutation | null,
): void {
  for (const authority of authorities.values()) {
    let after: BigIntStats;
    try {
      after = lstatSync(authority.absolute, { bigint: true });
    } catch (error) {
      throw new Error(`repository snapshot path disappeared: ${authority.relative}`, {
        cause: error,
      });
    }
    if (
      snapshotEntryKind(after) !== authority.kind
      || !sameSnapshotAuthority(authority.stat, after)
    ) {
      throw new Error(`repository snapshot path changed: ${authority.relative}`);
    }
  }

  // A symlink target is content, not merely lstat metadata. Re-read it without ever
  // descending through the link and compare it to the retained bounded record.
  for (const entry of entries) {
    if (!entry.record || entry.kind !== 'symlink') continue;
    fireSnapshotTestMutation(
      mutation,
      'before-final-symlink-target-revalidation',
      entry,
    );
    const before = lstatSync(entry.absolute, { bigint: true });
    if (!before.isSymbolicLink() || !sameSnapshotAuthority(entry.stat, before)) {
      throw new Error(`repository snapshot symlink changed before final read: ${entry.key}`);
    }
    const target = readlinkSync(entry.absolute, { encoding: 'buffer' });
    if (target.byteLength > limits.symlinkBytes) {
      throw new Error(`repository snapshot symlink exceeds the reviewed byte bound: ${entry.key}`);
    }
    const after = lstatSync(entry.absolute, { bigint: true });
    if (!after.isSymbolicLink() || !sameSnapshotAuthority(before, after)) {
      throw new Error(`repository snapshot symlink changed during final read: ${entry.key}`);
    }
    const value = snapshot.get(entry.key);
    const headerBytes = Buffer.byteLength(entry.header, 'utf8');
    if (value === undefined || !value.subarray(headerBytes).equals(target)) {
      throw new Error(`repository snapshot symlink target changed: ${entry.key}`);
    }
  }
}

function snapshotRepositoryTree(
  root: string,
  options: SnapshotOptions,
  control: SnapshotControl,
): Map<string, Buffer> {
  if (process.platform === 'win32') {
    throw new Error(
      'generated snapshot authority requires POSIX no-follow descriptor semantics',
    );
  }
  assertSnapshotLimits(control.limits);
  if (
    typeof root !== 'string'
    || root.length === 0
    || root.includes('\0')
    || Buffer.byteLength(root, 'utf8') > 4_096
  ) {
    throw new Error('generated snapshot root must be one bounded primitive path');
  }
  const absoluteRoot = path.resolve(root);
  const rootStat = lstatSync(absoluteRoot, { bigint: true });
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error('generated snapshot root must be a direct directory');
  }

  const mutation: RuntimeSnapshotMutation | null = control.mutation === null
    ? null
    : { ...control.mutation, invoked: false };
  if (mutation !== null) {
    assertBoundedSnapshotRelative(mutation.relative, control.limits, false);
  }

  const entries: ObservedSnapshotEntry[] = [];
  const pending: ObservedSnapshotEntry[] = [];
  const authorities = new Map<string, ObservedPathAuthority>();
  const relativeIdentities = new Set<string>();
  const counters: SnapshotCounters = {
    files: 0,
    directories: 0,
    nodes: 0,
    fileBytes: 0,
    projectedRetainedBytes: 0,
  };

  const observeAuthority = (
    absolute: string,
    relative: string,
    kind: SnapshotEntryKind,
    stat: BigIntStats,
  ): void => {
    const previous = authorities.get(absolute);
    if (previous !== undefined) {
      if (previous.kind !== kind || !sameSnapshotAuthority(previous.stat, stat)) {
        throw new Error(`repository snapshot authority changed: ${relative || '.'}`);
      }
      return;
    }
    authorities.set(absolute, { absolute, relative: relative || '.', kind, stat });
  };
  observeAuthority(absoluteRoot, '', 'directory', rootStat);

  const recordEntry = (
    absolute: string,
    relative: string,
    kind: SnapshotEntryKind,
    stat: BigIntStats,
    requestedRecord: boolean,
  ): ObservedSnapshotEntry => {
    const key = relative === '' ? '.' : relative;
    if (relativeIdentities.has(key)) {
      throw new Error(`generated output inventory overlaps at ${key}`);
    }
    relativeIdentities.add(key);
    counters.nodes += 1;
    if (counters.nodes > control.limits.nodes) {
      throw new Error('generated snapshot exceeds the reviewed node bound');
    }
    if (kind === 'directory') {
      counters.directories += 1;
      if (counters.directories > control.limits.directories) {
        throw new Error('generated snapshot exceeds the reviewed directory bound');
      }
    } else if (kind === 'file') {
      counters.files += 1;
      if (counters.files > control.limits.files) {
        throw new Error('generated snapshot exceeds the reviewed file bound');
      }
      if (
        stat.size < 0n
        || stat.size > BigInt(control.limits.fileBytes)
        || stat.size > BigInt(Number.MAX_SAFE_INTEGER)
      ) {
        throw new Error(`generated snapshot file exceeds the reviewed byte bound: ${key}`);
      }
      counters.fileBytes += Number(stat.size);
      if (counters.fileBytes > control.limits.aggregateBytes) {
        throw new Error('generated snapshot exceeds the reviewed aggregate byte bound');
      }
    }

    const record = requestedRecord
      && (kind !== 'directory' || options.recordDirectories)
      && (kind !== 'symlink' || options.recordSymlinks);
    const header = record ? snapshotHeader(kind, stat, options) : '';
    if (Buffer.byteLength(header, 'utf8') > 1_024) {
      throw new Error(`generated snapshot metadata exceeds its reviewed bound: ${key}`);
    }
    if (record) {
      const payloadReserve = kind === 'file'
        ? Number(stat.size)
        : kind === 'symlink'
          ? control.limits.symlinkBytes
          : 0;
      counters.projectedRetainedBytes += Buffer.byteLength(header, 'utf8') + payloadReserve;
      if (counters.projectedRetainedBytes > control.limits.aggregateBytes) {
        throw new Error('generated snapshot exceeds the reviewed retained-byte bound');
      }
    }
    const observed = { absolute, relative, key, kind, stat, record, header };
    entries.push(observed);
    observeAuthority(absolute, relative, kind, stat);
    if (kind === 'directory') pending.push(observed);
    return observed;
  };

  const admitPath = (
    absolute: string,
    relative: string,
    stat: BigIntStats,
    requestedRecord: boolean,
  ): void => {
    const kind = snapshotEntryKind(stat);
    const transient = options.transientDirectoryNames !== null
      && relative.split('/').some((part) => options.transientDirectoryNames!.has(part));
    if (transient) {
      if (kind === 'directory') return;
      throw new Error(`transient generated path is not a direct directory: ${relative}`);
    }
    if (kind === 'symlink') {
      if (!options.recordSymlinks) {
        throw new Error(snapshotIndirectMessage(options.profile, relative));
      }
      if (stat.size < 0n || stat.size > BigInt(control.limits.symlinkBytes)) {
        throw new Error(`repository snapshot symlink exceeds the reviewed byte bound: ${relative}`);
      }
      recordEntry(absolute, relative, kind, stat, requestedRecord);
      return;
    }
    if (kind === 'file') {
      if (options.rejectHardlinks && stat.nlink !== 1n) {
        throw new Error(snapshotHardlinkMessage(options.profile, relative));
      }
      recordEntry(absolute, relative, kind, stat, requestedRecord);
      return;
    }
    if (kind === 'directory') {
      recordEntry(absolute, relative, kind, stat, requestedRecord);
      return;
    }
    throw new Error(snapshotSpecialMessage(options.profile, relative));
  };

  if (options.roots === null) {
    admitPath(absoluteRoot, '', rootStat, options.includeRoot);
  } else {
    for (const rootEntry of options.roots) {
      const relative = canonicalSnapshotRoot(rootEntry.relative, control.limits);
      const segments = relative.split('/');
      let current = absoluteRoot;
      let leafStat: BigIntStats | null = null;
      let absent = false;
      for (const [index, segment] of segments.entries()) {
        current = path.join(current, segment);
        let stat: BigIntStats;
        try {
          stat = lstatSync(current, { bigint: true });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            absent = true;
            break;
          }
          throw error;
        }
        const componentRelative = segments.slice(0, index + 1).join('/');
        const kind = snapshotEntryKind(stat);
        if (index < segments.length - 1) {
          if (kind !== 'directory') {
            throw new Error(
              `generated snapshot root has an indirect or non-directory parent: ${relative}`,
            );
          }
          observeAuthority(current, componentRelative, kind, stat);
        } else {
          leafStat = stat;
        }
      }
      if (absent || leafStat === null) continue;
      const leafKind = snapshotEntryKind(leafStat);
      if (leafKind === 'symlink') {
        if (options.profile === 'generated-output' && rootEntry.expectedKind !== 'either') {
          throw new Error(
            `generated ${rootEntry.expectedKind} output is indirect: ${relative}`,
          );
        }
        throw new Error(snapshotIndirectMessage(options.profile, relative));
      }
      if (rootEntry.expectedKind === 'file' && leafKind !== 'file') {
        throw new Error(`generated file output is not a direct regular file: ${relative}`);
      }
      if (rootEntry.expectedKind === 'tree' && leafKind !== 'directory') {
        throw new Error(`generated tree output is not a direct directory: ${relative}`);
      }
      admitPath(current, relative, leafStat, true);
    }
  }

  while (pending.length > 0) {
    const directory = pending.pop();
    if (directory === undefined) break;
    const names = readBoundedDirectoryNames(directory, control.limits);
    // Stack in reverse UTF-8 order so traversal remains deterministic ascending order.
    for (let nameIndex = names.length - 1; nameIndex >= 0; nameIndex -= 1) {
      const name = names[nameIndex]!;
      const relative = directory.relative === '' ? name : `${directory.relative}/${name}`;
      assertBoundedSnapshotRelative(relative, control.limits, false);
      if (!options.include(relative)) continue;
      const absolute = path.join(directory.absolute, name);
      const stat = lstatSync(absolute, { bigint: true });
      admitPath(absolute, relative, stat, true);
    }
  }

  // Tree/file/aggregate limits are all closed before the first full file allocation.
  const snapshot = new Map<string, Buffer>();
  let retainedBytes = 0;
  for (const entry of entries) {
    if (!entry.record) continue;
    let value: Buffer;
    if (entry.kind === 'directory') {
      value = Buffer.from(entry.header, 'utf8');
    } else if (entry.kind === 'symlink') {
      value = stableSnapshotSymlinkValue(entry, control.limits);
    } else {
      value = stableSnapshotFileValue(entry, options, control.limits, mutation);
    }
    retainedBytes += value.byteLength;
    if (retainedBytes > control.limits.aggregateBytes) {
      throw new Error('generated snapshot exceeds the reviewed retained-byte bound');
    }
    snapshot.set(entry.key, value);
  }
  revalidateSnapshotAuthorities(
    authorities,
    snapshot,
    entries,
    control.limits,
    mutation,
  );
  return snapshot;
}

function snapshotGeneratedOutputInventoryWithControl(
  root: string,
  control: SnapshotControl,
): Map<string, Buffer> {
  return snapshotRepositoryTree(root, {
    profile: 'generated-output',
    roots: GENERATED_OUTPUT_INVENTORY.map((entry) => ({
      relative: entry.path,
      expectedKind: entry.kind,
    })),
    include: () => true,
    includeRoot: false,
    bindFilesystemIdentity: false,
    encodeEntryMetadata: true,
    recordDirectories: true,
    recordSymlinks: false,
    rejectHardlinks: true,
    transientDirectoryNames: GENERATED_TRANSIENT_DIRECTORY_NAMES,
  }, control);
}

/** Test-only seam restricted to resource limits and two exact file-read race points. */
export function snapshotGeneratedOutputInventoryForTrustedTest(
  root: string,
  control: TrustedGeneratedSnapshotTestControl,
): Map<string, Buffer> {
  return snapshotGeneratedOutputInventoryWithControl(root, {
    limits: control.limits,
    mutation: control.mutation === undefined ? null : control.mutation,
  });
}

/** Interpreter/test caches are neither generator output nor freshness evidence. */
export function isTransientGeneratedPath(relative: string): boolean {
  return relative
    .split(/[\\/]/u)
    .some((part) => GENERATED_TRANSIENT_DIRECTORY_NAMES.has(part));
}

/** Snapshot exact generator-owned file bytes through the shared bounded engine. */
export function snapshotGeneratedPaths(
  root: string,
  generatedPaths: readonly string[],
): Map<string, Buffer> {
  if (!Array.isArray(generatedPaths)) {
    throw new Error('generated snapshot roots must be a bounded array');
  }
  if (generatedPaths.length > GENERATED_SNAPSHOT_LIMITS.nodes) {
    throw new Error('generated snapshot has too many declared roots');
  }
  return snapshotRepositoryTree(root, {
    profile: 'generated-paths',
    roots: generatedPaths.map((relative) => ({ relative, expectedKind: 'either' })),
    include: () => true,
    includeRoot: false,
    bindFilesystemIdentity: false,
    encodeEntryMetadata: false,
    recordDirectories: false,
    recordSymlinks: false,
    rejectHardlinks: true,
    transientDirectoryNames: GENERATED_TRANSIENT_DIRECTORY_NAMES,
  }, {
    limits: GENERATED_SNAPSHOT_LIMITS,
    mutation: null,
  });
}

/** Snapshot every conservatively copied generator input by entry type, mode, and bytes. */
export function snapshotGeneratorControllingInputs(root: string): Map<string, Buffer> {
  return snapshotRepositoryTree(root, {
    profile: 'repository',
    roots: null,
    include: isGeneratorControllingInputPath,
    includeRoot: false,
    bindFilesystemIdentity: false,
    encodeEntryMetadata: true,
    recordDirectories: true,
    // The isolated copy preserves links rather than dereferencing them. Admitting
    // one here would let the generator later follow mutable authority whose bytes
    // are absent from this snapshot, including an absolute target outside the
    // repository. Controlling inputs therefore contain only direct directories
    // and regular files; outside-output mutation seals use a separate profile.
    recordSymlinks: false,
    rejectHardlinks: false,
    transientDirectoryNames: null,
  }, {
    limits: GENERATED_SNAPSHOT_LIMITS,
    mutation: null,
  });
}

interface CapturedGeneratorInputRecord {
  readonly relative: string;
  readonly kind: 'directory' | 'file';
  readonly mode: number;
  readonly payload: Buffer;
}

function decodeCapturedGeneratorInputRecord(
  relative: string,
  value: Uint8Array,
): CapturedGeneratorInputRecord {
  if (!(value instanceof Uint8Array) || value.byteLength > GENERATED_SNAPSHOT_LIMITS.fileBytes + 1_024) {
    throw new Error(`captured generator input has an invalid bounded value: ${relative}`);
  }
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  const firstSeparator = bytes.indexOf(0);
  const secondSeparator = firstSeparator < 0 ? -1 : bytes.indexOf(0, firstSeparator + 1);
  if (
    firstSeparator < 0
    || secondSeparator < 0
    || secondSeparator > 1_024
  ) {
    throw new Error(`captured generator input has invalid metadata framing: ${relative}`);
  }
  const kindBytes = bytes.subarray(0, firstSeparator);
  const metadataBytes = bytes.subarray(firstSeparator + 1, secondSeparator);
  const kindText = kindBytes.toString('utf8');
  const metadataText = metadataBytes.toString('utf8');
  if (
    !Buffer.from(kindText, 'utf8').equals(kindBytes)
    || !Buffer.from(metadataText, 'utf8').equals(metadataBytes)
    || (kindText !== 'directory' && kindText !== 'file')
  ) {
    throw new Error(`captured generator input has invalid entry metadata: ${relative}`);
  }
  const modeMatch = /^mode:([0-7]{4})$/u.exec(metadataText);
  if (modeMatch === null) {
    throw new Error(`captured generator input has invalid mode metadata: ${relative}`);
  }
  const mode = Number.parseInt(modeMatch[1]!, 8);
  if (
    !Number.isSafeInteger(mode)
    || mode < 0
    || mode > 0o7777
    || (mode & 0o7000) !== 0
    || (kindText === 'directory' && (mode & 0o500) !== 0o500)
    || (kindText === 'file' && (mode & 0o400) !== 0o400)
  ) {
    throw new Error(`captured generator input has unsafe materialization mode: ${relative}`);
  }
  const payload = bytes.subarray(secondSeparator + 1);
  if (
    (kindText === 'directory' && payload.byteLength !== 0)
    || (kindText === 'file' && payload.byteLength > GENERATED_SNAPSHOT_LIMITS.fileBytes)
  ) {
    throw new Error(`captured generator input has invalid payload: ${relative}`);
  }
  return {
    relative,
    kind: kindText,
    mode,
    payload,
  };
}

function exclusiveGeneratorInputFileFlags(): number {
  let flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL;
  if (
    !Number.isSafeInteger(constants.O_NOFOLLOW)
    || constants.O_NOFOLLOW <= 0
    || !Number.isSafeInteger(constants.O_NONBLOCK)
    || constants.O_NONBLOCK <= 0
  ) {
    throw new Error('generated input materialization no-follow authority is unavailable');
  }
  flags |= constants.O_NOFOLLOW | constants.O_NONBLOCK;
  return flags;
}

/**
 * Materialize the exact retained controlling-input bytes without rereading the source.
 *
 * This closes the post-snapshot `cp` expansion/type-swap window: source drift is
 * checked separately, while both isolated passes are authored only from this bounded
 * capture. The destination must be absent beneath one existing direct directory.
 */
export function materializeGeneratorControllingInputSnapshot(
  destination: string,
  snapshot: GeneratedSnapshot,
): void {
  if (process.platform === 'win32') {
    throw new Error(
      'generator input materialization requires POSIX no-follow and mode authority',
    );
  }
  if (
    typeof destination !== 'string'
    || destination.length === 0
    || destination.includes('\0')
    || Buffer.byteLength(destination, 'utf8') > 4_096
  ) {
    throw new Error('generator input destination must be one bounded primitive path');
  }
  if (!(snapshot instanceof Map) || Object.getPrototypeOf(snapshot) !== Map.prototype) {
    throw new Error('generator input capture must be one direct Map');
  }
  if (snapshot.size > GENERATED_SNAPSHOT_LIMITS.nodes) {
    throw new Error('generator input capture exceeds the reviewed node bound');
  }

  const records: CapturedGeneratorInputRecord[] = [];
  const byPath = new Map<string, CapturedGeneratorInputRecord>();
  const childCounts = new Map<string, number>();
  let files = 0;
  let directories = 0;
  let retainedBytes = 0;
  for (const [relative, value] of snapshot) {
    const canonical = canonicalSnapshotRoot(relative, GENERATED_SNAPSHOT_LIMITS);
    if (canonical !== relative) {
      throw new Error(`captured generator input path is not canonical: ${relative}`);
    }
    if (!isGeneratorControllingInputPath(relative)) {
      throw new Error(`captured generator input is outside the controlling policy: ${relative}`);
    }
    retainedBytes += value.byteLength;
    if (!Number.isSafeInteger(retainedBytes) || retainedBytes > GENERATED_SNAPSHOT_LIMITS.aggregateBytes) {
      throw new Error('generator input capture exceeds the reviewed aggregate byte bound');
    }
    const record = decodeCapturedGeneratorInputRecord(relative, value);
    if (record.kind === 'directory') {
      directories += 1;
      if (directories > GENERATED_SNAPSHOT_LIMITS.directories) {
        throw new Error('generator input capture exceeds the reviewed directory bound');
      }
    } else {
      files += 1;
      if (files > GENERATED_SNAPSHOT_LIMITS.files) {
        throw new Error('generator input capture exceeds the reviewed file bound');
      }
    }
    const parent = path.posix.dirname(relative);
    const parentKey = parent === '.' ? '' : parent;
    const nextChildren = (childCounts.get(parentKey) ?? 0) + 1;
    if (nextChildren > GENERATED_SNAPSHOT_LIMITS.directoryEntries) {
      throw new Error(`generator input capture exceeds the reviewed directory-entry bound: ${parentKey || '.'}`);
    }
    childCounts.set(parentKey, nextChildren);
    records.push(record);
    byPath.set(relative, record);
  }
  for (const record of records) {
    const parent = path.posix.dirname(record.relative);
    if (parent !== '.' && byPath.get(parent)?.kind !== 'directory') {
      throw new Error(`captured generator input lacks its direct parent: ${record.relative}`);
    }
  }

  const absoluteDestination = path.resolve(destination);
  const parent = path.dirname(absoluteDestination);
  const parentStat = lstatSync(parent, { bigint: true });
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error('generator input destination parent must be a direct directory');
  }
  try {
    lstatSync(absoluteDestination);
    throw new Error('generator input destination must be absent');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  mkdirSync(absoluteDestination, { mode: 0o700 });
  chmodSync(absoluteDestination, 0o700);
  const createdRoot = lstatSync(absoluteDestination, { bigint: true });
  if (
    !createdRoot.isDirectory()
    || createdRoot.isSymbolicLink()
    || (createdRoot.mode & 0o7777n) !== 0o700n
  ) {
    throw new Error('generator input destination was not created directly');
  }

  const ordered = [...records].sort((left, right) => {
    const depthDifference = left.relative.split('/').length - right.relative.split('/').length;
    return depthDifference !== 0
      ? depthDifference
      : Buffer.compare(Buffer.from(left.relative, 'utf8'), Buffer.from(right.relative, 'utf8'));
  });
  const directoriesToFinalize: CapturedGeneratorInputRecord[] = [];
  for (const record of ordered) {
    const target = path.join(absoluteDestination, ...record.relative.split('/'));
    const relativeTarget = path.relative(absoluteDestination, target);
    if (normalizeRepositoryRelative(relativeTarget) !== record.relative) {
      throw new Error(`captured generator input escaped its destination: ${record.relative}`);
    }
    if (record.kind === 'directory') {
      mkdirSync(target, { mode: 0o700 });
      chmodSync(target, 0o700);
      const created = lstatSync(target, { bigint: true });
      if (
        !created.isDirectory()
        || created.isSymbolicLink()
        || (created.mode & 0o7777n) !== 0o700n
      ) {
        throw new Error(`captured generator directory was not created directly: ${record.relative}`);
      }
      directoriesToFinalize.push(record);
      continue;
    }

    const descriptor = openSync(target, exclusiveGeneratorInputFileFlags(), 0o600);
    try {
      let offset = 0;
      while (offset < record.payload.byteLength) {
        const count = writeSync(
          descriptor,
          record.payload,
          offset,
          record.payload.byteLength - offset,
          offset,
        );
        if (count <= 0) {
          throw new Error(`captured generator input ended before publication: ${record.relative}`);
        }
        offset += count;
      }
      fsyncSync(descriptor);
      fchmodSync(descriptor, record.mode);
      fsyncSync(descriptor);
      const created = fstatSync(descriptor, { bigint: true });
      if (
        !created.isFile()
        || created.nlink !== 1n
        || created.size !== BigInt(record.payload.byteLength)
        || (created.mode & 0o7777n) !== BigInt(record.mode)
      ) {
        throw new Error(`captured generator input publication changed: ${record.relative}`);
      }
    } finally {
      closeSync(descriptor);
    }
    const pathAfter = lstatSync(target, { bigint: true });
    if (
      !pathAfter.isFile()
      || pathAfter.isSymbolicLink()
      || pathAfter.nlink !== 1n
      || pathAfter.size !== BigInt(record.payload.byteLength)
      || (pathAfter.mode & 0o7777n) !== BigInt(record.mode)
    ) {
      throw new Error(`captured generator input path changed after publication: ${record.relative}`);
    }
  }

  // Preserve source directory modes only after every child has been created.
  for (const record of directoriesToFinalize.reverse()) {
    const target = path.join(absoluteDestination, ...record.relative.split('/'));
    chmodSync(target, record.mode);
    const finalized = lstatSync(target, { bigint: true });
    if (
      !finalized.isDirectory()
      || finalized.isSymbolicLink()
      || (finalized.mode & 0o7777n) !== BigInt(record.mode)
    ) {
      throw new Error(`captured generator directory mode changed: ${record.relative}`);
    }
  }
  const observed = snapshotGeneratorControllingInputs(absoluteDestination);
  const differences = generatedSnapshotDifferences(snapshot, observed);
  if (differences.length > 0) {
    throw new Error(
      `materialized generator input differs from its bounded capture: `
        + `${differences[0]!.kind}: ${differences[0]!.path}`,
    );
  }
}

/**
 * Snapshot the complete isolated repository state outside the authorized output roots.
 *
 * Symlinks are recorded but never followed. Filesystem identity is bound within this
 * single tree so replace-with-identical and hard-link mutations cannot disappear behind
 * equal final bytes.
 */
function snapshotOutsideGeneratedOutputsWithControl(
  root: string,
  control: SnapshotControl,
): Map<string, Buffer> {
  return snapshotRepositoryTree(root, {
    profile: 'repository',
    roots: null,
    include: (relative) => relative === '' || !isGeneratedOutputPath(relative),
    includeRoot: true,
    bindFilesystemIdentity: true,
    encodeEntryMetadata: true,
    recordDirectories: true,
    recordSymlinks: true,
    rejectHardlinks: false,
    transientDirectoryNames: null,
  }, control);
}

export function snapshotOutsideGeneratedOutputs(root: string): Map<string, Buffer> {
  return snapshotOutsideGeneratedOutputsWithControl(root, {
    limits: GENERATED_SNAPSHOT_LIMITS,
    mutation: null,
  });
}

/** Test-only seam for final outside-symlink revalidation races. */
export function snapshotOutsideGeneratedOutputsForTrustedTest(
  root: string,
  control: TrustedGeneratedSnapshotTestControl,
): Map<string, Buffer> {
  return snapshotOutsideGeneratedOutputsWithControl(root, {
    limits: control.limits,
    mutation: control.mutation === undefined ? null : control.mutation,
  });
}

function bytesEqual(expected: Uint8Array, actual: Uint8Array): boolean {
  if (expected.byteLength !== actual.byteLength) return false;
  for (let index = 0; index < expected.byteLength; index += 1) {
    if (expected[index] !== actual[index]) return false;
  }
  return true;
}

/** Compare path inventory and exact raw/encoded snapshot bytes deterministically. */
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

/** Reject every added, removed, replaced, mode-changed, or byte-changed outside entry. */
export function assertNoOutsideGeneratedOutputMutations(
  before: GeneratedSnapshot,
  after: GeneratedSnapshot,
  label: string,
): void {
  const differences = generatedSnapshotDifferences(before, after);
  if (differences.length === 0) return;
  const rendered = differences
    .map((difference) => `${difference.kind}: ${difference.path}`)
    .join(', ');
  throw new Error(
    `${label} mutated repository state outside the closed generated-output inventory: `
      + rendered,
  );
}
