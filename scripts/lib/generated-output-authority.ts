/**
 * Closed authority for contract-generator outputs and controlling source inputs.
 *
 * The generator and its freshness checker must consume the same inventory. A second
 * handwritten list would turn freshness into an agreement between two potentially
 * stale claims rather than evidence about the generator's actual authority.
 */

import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  type Stats,
} from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

import {
  generatedSnapshotDifferences,
  type GeneratedSnapshot,
} from './generated-snapshot.js';

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
    mkdirSync(target);
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
  const snapshot = new Map<string, Buffer>();

  const record = (
    relative: string,
    knownStat?: Stats,
  ): void => {
    const portableRelative = relative.split(path.sep).join('/');
    const absolute = path.join(root, relative);
    const stat = knownStat ?? lstatSync(absolute);
    const parts = portableRelative.split('/');
    if (parts.some((part) => GENERATED_TRANSIENT_DIRECTORY_NAMES.has(part))) {
      if (stat.isDirectory() && !stat.isSymbolicLink()) return;
      throw new Error(
        `transient generated path is not a direct directory: ${portableRelative}`,
      );
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`generated output contains an indirect entry: ${portableRelative}`);
    }
    if (snapshot.has(portableRelative)) {
      throw new Error(`generated output inventory overlaps at ${portableRelative}`);
    }
    if (stat.isFile()) {
      if (stat.nlink !== 1) {
        throw new Error(`generated output file is hard-linked: ${portableRelative}`);
      }
      snapshot.set(
        portableRelative,
        encodeSnapshotEntry('file', stat.mode, readFileSync(absolute), ''),
      );
      return;
    }
    if (!stat.isDirectory()) {
      throw new Error(`generated output contains a special entry: ${portableRelative}`);
    }

    snapshot.set(
      portableRelative,
      encodeSnapshotEntry('directory', stat.mode, Buffer.alloc(0), ''),
    );
    for (const name of strictDirectoryNames(absolute, portableRelative)) {
      record(path.join(relative, name));
    }
  };

  for (const entry of GENERATED_OUTPUT_INVENTORY) {
    const absolute = path.join(root, entry.path);
    let stat: Stats;
    try {
      stat = lstatSync(absolute);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`generated ${entry.kind} output is indirect: ${entry.path}`);
    }
    if (entry.kind === 'file' && !stat.isFile()) {
      throw new Error(`generated file output is not a direct regular file: ${entry.path}`);
    }
    if (entry.kind === 'tree' && !stat.isDirectory()) {
      throw new Error(`generated tree output is not a direct directory: ${entry.path}`);
    }
    record(entry.path, stat);
  }
  return snapshot;
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

interface SnapshotOptions {
  readonly include: (relative: string) => boolean;
  readonly includeRoot: boolean;
  readonly bindFilesystemIdentity: boolean;
}

function strictDirectoryNames(absolute: string, relative: string): string[] {
  const encodedNames = readdirSync(absolute, { encoding: 'buffer' }).sort(Buffer.compare);
  return encodedNames.map((encoded) => {
    let decoded: string;
    try {
      decoded = STRICT_UTF8.decode(encoded);
    } catch {
      throw new Error(
        `repository snapshot contains a non-UTF-8 path below ${relative || '.'}`,
      );
    }
    // The fatal decoder establishes validity. Re-encoding also establishes that the
    // string used as the map key names the exact directory-entry bytes.
    if (!Buffer.from(decoded, 'utf8').equals(encoded)) {
      throw new Error(
        `repository snapshot cannot round-trip a path below ${relative || '.'}`,
      );
    }
    return decoded;
  });
}

function encodeSnapshotEntry(
  kind: SnapshotEntryKind,
  mode: number,
  payload: Uint8Array,
  filesystemIdentity: string,
): Buffer {
  const header = Buffer.from(
    `${kind}\0mode:${(mode & 0o7777).toString(8).padStart(4, '0')}`
      + `${filesystemIdentity}\0`,
    'utf8',
  );
  return Buffer.concat([header, payload]);
}

function snapshotRepositoryTree(
  root: string,
  options: SnapshotOptions,
): Map<string, Buffer> {
  const snapshot = new Map<string, Buffer>();

  const walk = (relative: string): void => {
    const portableRelative = relative.split(path.sep).join('/');
    if (!options.include(portableRelative)) return;

    const absolute = relative === '' ? root : path.join(root, relative);
    const stat = lstatSync(absolute);
    const key = portableRelative === '' ? '.' : portableRelative;
    const includeEntry = portableRelative !== '' || options.includeRoot;

    if (stat.isSymbolicLink()) {
      if (includeEntry) {
        const identity = options.bindFilesystemIdentity
          ? `;dev:${stat.dev};ino:${stat.ino};nlink:${stat.nlink}`
          : '';
        snapshot.set(
          key,
          encodeSnapshotEntry(
            'symlink',
            // Symlink permission bits are not portable copy identity on macOS.
            // The cross-tree source seal binds exact target bytes and entry type;
            // the within-tree mutation seal additionally binds lstat metadata.
            options.bindFilesystemIdentity ? stat.mode : 0,
            readlinkSync(absolute, { encoding: 'buffer' }),
            identity,
          ),
        );
      }
      return;
    }

    if (stat.isFile()) {
      if (includeEntry) {
        const identity = options.bindFilesystemIdentity
          ? `;dev:${stat.dev};ino:${stat.ino};nlink:${stat.nlink}`
          : '';
        snapshot.set(
          key,
          encodeSnapshotEntry('file', stat.mode, readFileSync(absolute), identity),
        );
      }
      return;
    }

    if (!stat.isDirectory()) {
      throw new Error(`repository snapshot contains a non-regular entry: ${key}`);
    }

    if (includeEntry) {
      // Directory link counts change when an authorized generated directory is added.
      // Bind the directory object and mode, but not that topology-derived count.
      const identity = options.bindFilesystemIdentity
        ? `;dev:${stat.dev};ino:${stat.ino}`
        : '';
      snapshot.set(
        key,
        encodeSnapshotEntry('directory', stat.mode, Buffer.alloc(0), identity),
      );
    }
    for (const name of strictDirectoryNames(absolute, portableRelative)) {
      walk(relative === '' ? name : path.join(relative, name));
    }
  };

  walk('');
  return snapshot;
}

/** Snapshot every conservatively copied generator input by entry type, mode, and bytes. */
export function snapshotGeneratorControllingInputs(root: string): Map<string, Buffer> {
  return snapshotRepositoryTree(root, {
    include: isGeneratorControllingInputPath,
    includeRoot: false,
    bindFilesystemIdentity: false,
  });
}

/**
 * Snapshot the complete isolated repository state outside the authorized output roots.
 *
 * Symlinks are recorded but never followed. Filesystem identity is bound within this
 * single tree so replace-with-identical and hard-link mutations cannot disappear behind
 * equal final bytes.
 */
export function snapshotOutsideGeneratedOutputs(root: string): Map<string, Buffer> {
  return snapshotRepositoryTree(root, {
    include: (relative) => relative === '' || !isGeneratedOutputPath(relative),
    includeRoot: true,
    bindFilesystemIdentity: true,
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
