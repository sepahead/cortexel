/**
 * Descriptor-acquired Node control runtime for reviewed host commands.
 *
 * A caller-selected Node pathname is acquisition input, never executable
 * authority. The executable and the bounded, known Homebrew-relative
 * `libnode.<number>.dylib` companions are copied through no-follow descriptors
 * into one current-UID-owned 0700 runtime below an explicitly protected parent.
 * The staged executable then has to identify itself as an exact supported Node
 * runtime through the reviewed POSIX command boundary.
 *
 * The companion list is only the known relative set needed by supported
 * Homebrew Node layouts. It is not a closed dynamic-library dependency
 * inventory, a complete runtime provenance receipt, or hostile same-UID
 * containment. Callers must preserve that limitation when projecting this
 * acquisition into a larger evidence record.
 */
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  opendirSync,
  realpathSync,
  rmSync,
  type Dir,
} from 'node:fs';
import path from 'node:path';
import { TextDecoder, types as utilTypes } from 'node:util';

import {
  acquireReviewedExecutableIntoPrivateRoot,
  REVIEWED_POSIX_COMMAND_LIMITS,
  runReviewedPosixCommand,
  type ReviewedExecutableAcquisition,
  type ReviewedPosixCommandResult,
} from './reviewed-posix-command.js';
import {
  requireExactPrivateDirectoryAuthority,
  requireProtectedDirectoryEntryChain,
} from './posix-acl-authority.js';

export const REVIEWED_NODE_RUNTIME_SCHEMA =
  'cortexel-reviewed-node-runtime.v1' as const;

const REVIEWED_NODE_RUNTIME_PREFIX = 'cortexel-reviewed-node-runtime-';
const SUPPORTED_NODE_MAJORS = new Set([22, 24, 26]);
const MAX_NODE_CANDIDATES = 32;
const MAX_NODE_PROBE_BYTES = 4 * 1024;
const MAX_DIAGNOSTIC_BYTES = 2_000;
const MAX_HOST_PATH_BYTES = 64 * 1024;
const MAX_HOST_PATH_ENTRIES = 1_024;
const MAX_HOST_LIBRARY_ENTRIES = 16_384;
const MAX_DIRECTORY_ENTRY_NAME_BYTES = 4_096;

export interface ReviewedNodeRuntimeOptions {
  /** Candidate pathnames are acquisition input and never executable authority. */
  readonly sourceNodeCandidates?: readonly string[];
}

export interface ReviewedNodeRuntime {
  readonly schema: typeof REVIEWED_NODE_RUNTIME_SCHEMA;
  readonly runtimeRoot: string;
  /** Canonical acquisition pathname selected from the caller/host candidates. */
  readonly sourceNodeExecutable: string;
  /** Complete copied-file inventory and the staged executable authority. */
  readonly node: ReviewedExecutableAcquisition;
  readonly nodeVersion: string;
}

interface OwnedRuntimeIdentity {
  readonly device: bigint;
  readonly inode: bigint;
  disposed: boolean;
}

const OWNED_RUNTIMES = new WeakMap<ReviewedNodeRuntime, OwnedRuntimeIdentity>();

function fail(message: string): never {
  throw new Error(`reviewed Node runtime: ${message}`);
}

function withClosedDirectory<T>(
  directory: Dir,
  label: string,
  operation: () => T,
): T {
  let outcome: { readonly ok: true; readonly value: T } |
    { readonly ok: false; readonly error: unknown };
  try {
    outcome = { ok: true, value: operation() };
  } catch (error) {
    outcome = { ok: false, error };
  }

  let closeFailed = false;
  let closeError: unknown;
  try {
    directory.closeSync();
  } catch (error) {
    closeFailed = true;
    closeError = error;
  }
  if (!outcome.ok) {
    if (closeFailed) {
      throw new AggregateError(
        [outcome.error, closeError],
        `reviewed Node runtime: ${label} failed and its directory descriptor close was ambiguous`,
      );
    }
    throw outcome.error;
  }
  if (closeFailed) {
    throw new AggregateError(
      [closeError],
      `reviewed Node runtime: ${label} directory descriptor close was ambiguous`,
    );
  }
  return outcome.value;
}

function ownDataRecord(
  value: unknown,
  label: string,
  optional: readonly string[],
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be a plain own-data object`);
  }
  if (utilTypes.isProxy(value)) fail(`${label} must not be a Proxy`);
  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(value);
  } catch {
    fail(`${label} cannot be inspected safely`);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`${label} has an unreviewed prototype`);
  }
  const allowed = new Set(optional);
  const maximumAllowedKeyCodeUnits = optional.reduce(
    (maximum, key) => Math.max(maximum, key.length),
    0,
  );
  const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  let enumerated = 0;
  for (const key in value as Record<string, unknown>) {
    enumerated++;
    if (
      enumerated > allowed.size ||
      key.length > maximumAllowedKeyCodeUnits ||
      !allowed.has(key) ||
      !Object.prototype.hasOwnProperty.call(value, key)
    ) {
      fail(`${label} does not have its exact reviewed member set`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      fail(`${label}.${key} cannot be inspected safely`);
    }
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      fail(`${label}.${key} must be an enumerable own data property`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function ownDataArray(
  value: unknown,
  label: string,
  maximumLength: number,
): readonly unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be a direct array`);
  if (utilTypes.isProxy(value)) fail(`${label} must not be a Proxy`);
  let prototype: object | null;
  let lengthDescriptor: PropertyDescriptor | undefined;
  try {
    prototype = Object.getPrototypeOf(value);
    lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  } catch {
    fail(`${label} cannot be inspected safely`);
  }
  if (
    prototype !== Array.prototype ||
    lengthDescriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value') ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > maximumLength
  ) {
    fail(`${label} has an invalid or excessive length authority`);
  }
  const length = lengthDescriptor.value as number;
  const maximumIndexKeyCodeUnits = String(Math.max(0, length - 1)).length;
  let enumerated = 0;
  for (const key in value as unknown[]) {
    enumerated++;
    if (enumerated > length || key.length > maximumIndexKeyCodeUnits) {
      fail(`${label} must be dense and contain no extra enumerable members`);
    }
    const index = /^(?:0|[1-9][0-9]*)$/u.test(key) ? Number(key) : -1;
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= length ||
      String(index) !== key ||
      !Object.prototype.hasOwnProperty.call(value, key)
    ) {
      fail(`${label} must be dense and contain no extra enumerable members`);
    }
  }
  const snapshot: unknown[] = [];
  for (let index = 0; index < length; index++) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    } catch {
      fail(`${label}[${index}] cannot be inspected safely`);
    }
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      fail(`${label}[${index}] must be an enumerable own data property`);
    }
    snapshot.push(descriptor.value);
  }
  return Object.freeze(snapshot);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function boundedDirectoryNames(
  directoryPath: string,
  label: string,
  maximumEntries: number,
): readonly string[] {
  if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 0) {
    fail(`${label} entry bound is invalid`);
  }
  const directory = opendirSync(directoryPath, { encoding: 'utf8' });
  const names = withClosedDirectory(directory, label, () => {
    const inspected: string[] = [];
    while (true) {
      const entry = directory.readSync();
      if (entry === null) break;
      if (inspected.length >= maximumEntries) {
        fail(`${label} exceeds its ${maximumEntries}-entry bound`);
      }
      if (Buffer.byteLength(entry.name, 'utf8') > MAX_DIRECTORY_ENTRY_NAME_BYTES) {
        fail(`${label} contains an excessive entry name`);
      }
      inspected.push(entry.name);
    }
    return inspected;
  });
  names.sort();
  return Object.freeze(names);
}

function requireCandidatePath(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > REVIEWED_POSIX_COMMAND_LIMITS.pathBytes ||
    value.includes('\0') ||
    !path.isAbsolute(value) ||
    path.resolve(value) !== value ||
    Buffer.byteLength(value, 'utf8') > REVIEWED_POSIX_COMMAND_LIMITS.pathBytes
  ) {
    fail(`${label} must be an absolute normalized pathname within its byte bound`);
  }
  return value;
}

function candidatePathsFromHost(): readonly string[] {
  const ambientPath = process.env.PATH ?? '';
  if (
    ambientPath.length > MAX_HOST_PATH_BYTES ||
    Buffer.byteLength(ambientPath, 'utf8') > MAX_HOST_PATH_BYTES
  ) {
    fail(`ambient PATH exceeds its ${MAX_HOST_PATH_BYTES}-byte bound`);
  }
  let pathEntryCount = ambientPath.length === 0 ? 0 : 1;
  for (const character of ambientPath) {
    if (character === path.delimiter) pathEntryCount++;
    if (pathEntryCount > MAX_HOST_PATH_ENTRIES) {
      fail(`ambient PATH exceeds its ${MAX_HOST_PATH_ENTRIES}-entry bound`);
    }
  }
  const candidates = [
    process.execPath,
    ...ambientPath
      .split(path.delimiter)
      .filter((entry) => entry.length > 0)
      .map((entry) => path.resolve(entry, 'node')),
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    '/usr/bin/node',
  ];
  const canonical: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    try {
      if (
        candidate.length === 0 ||
        candidate.length > REVIEWED_POSIX_COMMAND_LIMITS.pathBytes ||
        Buffer.byteLength(candidate, 'utf8') > REVIEWED_POSIX_COMMAND_LIMITS.pathBytes ||
        !path.isAbsolute(candidate) ||
        !existsSync(candidate)
      ) continue;
      const resolved = realpathSync(candidate);
      if (path.basename(resolved) !== 'node' || seen.has(resolved)) continue;
      const stat = lstatSync(resolved);
      if (!stat.isFile() || stat.isSymbolicLink()) continue;
      seen.add(resolved);
      canonical.push(resolved);
    } catch {
      // A disappearing or non-canonical host candidate has no authority.
    }
  }
  return Object.freeze(canonical);
}

function canonicalCandidates(explicit: unknown): readonly string[] {
  if (explicit === undefined) return candidatePathsFromHost();
  const values = ownDataArray(
    explicit,
    'reviewed Node source candidates',
    MAX_NODE_CANDIDATES,
  );
  if (values.length === 0) fail('explicit Node candidate list is empty');
  const result: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < values.length; index++) {
    const candidate = requireCandidatePath(
      values[index],
      `explicit Node candidate ${index + 1}`,
    );
    const resolved = realpathSync(candidate);
    if (!seen.has(resolved)) {
      seen.add(resolved);
      result.push(resolved);
    }
  }
  return Object.freeze(result);
}

function homebrewNodeCompanions(sourceNode: string): readonly {
  readonly sourcePath: string;
  readonly stagedRelativePath: string;
}[] {
  if (process.platform !== 'darwin') return Object.freeze([]);
  const libraryDirectory = path.join(path.dirname(path.dirname(sourceNode)), 'lib');
  if (!existsSync(libraryDirectory)) return Object.freeze([]);
  const companions = boundedDirectoryNames(
    libraryDirectory,
    'Homebrew Node companion library directory',
    MAX_HOST_LIBRARY_ENTRIES,
  )
    .filter((name) => /^libnode\.[0-9]+\.dylib$/u.test(name))
    .sort()
    .map((name) => Object.freeze({
      sourcePath: realpathSync(path.join(libraryDirectory, name)),
      stagedRelativePath: path.join('lib', name),
    }));
  return Object.freeze(companions);
}

function safeDiagnostic(buffer: Buffer): string {
  return buffer
    .subarray(0, MAX_DIAGNOSTIC_BYTES)
    .toString('utf8')
    .replace(
      /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,
      '\uFFFD',
    )
    .trim();
}

function exactSuccessfulResult(
  result: ReviewedPosixCommandResult,
  label: string,
): void {
  if (
    result.status !== 0 ||
    result.signal !== null ||
    result.timedOut ||
    result.outputOverflow ||
    result.guardianSweepIntentCount !== 1
  ) {
    fail(
      `${label} failed (status ${String(result.status)}, signal ` +
      `${String(result.signal)}, timeout ${String(result.timedOut)}, overflow ` +
      `${String(result.outputOverflow)})`,
    );
  }
  if (result.stderr.byteLength !== 0) {
    const diagnostic = safeDiagnostic(result.stderr);
    fail(`${label} wrote stderr${diagnostic ? `: ${diagnostic}` : ''}`);
  }
}

function decodeProbe(buffer: Buffer): Readonly<Record<string, unknown>> {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
  } catch {
    fail('staged Node identity probe is not well-formed UTF-8');
  }
  if (!text.endsWith('\n') || text.slice(0, -1).includes('\n')) {
    fail('staged Node identity probe did not return one exact JSON line');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    fail('staged Node identity probe did not return valid JSON');
  }
  const record = ownDataRecord(
    parsed,
    'staged Node identity probe result',
    ['bun', 'execPath', 'node', 'releaseName'],
  );
  if (Object.keys(record).length !== 4) {
    fail('staged Node identity probe result does not have its exact reviewed member set');
  }
  return record;
}

function probeNodeRuntime(
  acquisition: ReviewedExecutableAcquisition,
  runtimeRoot: string,
): string {
  const probeSource = [
    "'use strict';",
    'const result = {',
    '  bun: process.versions.bun ?? null,',
    '  execPath: process.execPath,',
    '  node: process.versions.node ?? null,',
    '  releaseName: process.release?.name ?? null,',
    '};',
    "process.stdout.write(`${JSON.stringify(result)}\\n`);",
  ].join('\n');
  const probe = runReviewedPosixCommand(
    acquisition.authority.executable,
    acquisition.authority.executable,
    ['--input-type=commonjs', '--eval', probeSource],
    runtimeRoot,
    {
      controlRuntimeAuthority: acquisition.authority,
      environment: {
        LANG: 'C',
        LC_ALL: 'C',
        PATH: '/usr/bin:/bin',
        TZ: 'UTC',
      },
      outputLimitBytes: MAX_NODE_PROBE_BYTES,
      targetAuthority: acquisition.authority,
      timeoutMs: 10_000,
    },
  );
  exactSuccessfulResult(probe, 'staged Node identity probe');
  const parsed = decodeProbe(probe.stdout);
  const nodeVersion = parsed.node;
  if (typeof nodeVersion !== 'string') {
    fail('staged control runtime is not an exact supported Node 22/24/26 runtime');
  }
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/u.exec(nodeVersion);
  if (
    parsed.bun !== null ||
    parsed.releaseName !== 'node' ||
    parsed.execPath !== acquisition.authority.executable ||
    match === null ||
    !SUPPORTED_NODE_MAJORS.has(Number(match[1]))
  ) {
    fail('staged control runtime is not an exact supported Node 22/24/26 runtime');
  }
  return nodeVersion;
}

function rootIdentity(runtimeRoot: string): OwnedRuntimeIdentity {
  const authority = requireExactPrivateDirectoryAuthority(
    runtimeRoot,
    'reviewed Node runtime root authority',
  );
  return {
    device: authority.device,
    inode: authority.inode,
    disposed: false,
  };
}

function removeExactRuntimeRoot(
  runtimeRoot: string,
  identity: OwnedRuntimeIdentity,
): void {
  const authority = requireExactPrivateDirectoryAuthority(
    runtimeRoot,
    'reviewed Node runtime root removal authority',
  );
  if (authority.device !== identity.device || authority.inode !== identity.inode) {
    fail('runtime root identity changed; foreign pathname was retained');
  }
  rmSync(runtimeRoot, { recursive: true, force: false });
}

function throwWithCleanupFailure(primary: unknown, cleanup: unknown): never {
  throw new AggregateError(
    [primary, cleanup],
    'reviewed Node runtime acquisition failed and cleanup authority is uncertain',
    { cause: primary },
  );
}

export function createReviewedNodeRuntime(
  protectedParentPath: string,
  options: ReviewedNodeRuntimeOptions = {},
): ReviewedNodeRuntime {
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    fail('runtime acquisition is implemented only on macOS/Linux');
  }
  const optionSnapshot = ownDataRecord(
    options,
    'reviewed Node runtime options',
    ['sourceNodeCandidates'],
  );
  const candidates = canonicalCandidates(optionSnapshot.sourceNodeCandidates);
  requireCandidatePath(protectedParentPath, 'runtime parent');
  const protectedParent = realpathSync(protectedParentPath);
  requireProtectedDirectoryEntryChain(
    protectedParent,
    'reviewed Node runtime parent authority',
  );
  if (candidates.length === 0) fail('no Node candidate was available');

  let lastFailure = 'no candidate was available';
  for (const candidate of candidates) {
    const runtimeRoot = realpathSync(mkdtempSync(
      path.join(protectedParent, REVIEWED_NODE_RUNTIME_PREFIX),
    ));
    chmodSync(runtimeRoot, 0o700);
    const identity = rootIdentity(runtimeRoot);
    try {
      mkdirSync(path.join(runtimeRoot, 'bin'), { mode: 0o700 });
      const companions = homebrewNodeCompanions(candidate);
      if (companions.length > 0) {
        mkdirSync(path.join(runtimeRoot, 'lib'), { mode: 0o700 });
      }
      const node = acquireReviewedExecutableIntoPrivateRoot(
        candidate,
        runtimeRoot,
        path.join('bin', 'node'),
        { companions },
      );
      const nodeVersion = probeNodeRuntime(node, runtimeRoot);
      const runtime = deepFreeze({
        schema: REVIEWED_NODE_RUNTIME_SCHEMA,
        runtimeRoot,
        sourceNodeExecutable: candidate,
        node,
        nodeVersion,
      } satisfies ReviewedNodeRuntime);
      OWNED_RUNTIMES.set(runtime, identity);
      return runtime;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
      try {
        removeExactRuntimeRoot(runtimeRoot, identity);
      } catch (cleanupError) {
        throwWithCleanupFailure(error, cleanupError);
      }
    }
  }
  fail(`no Node candidate passed staged identity review: ${lastFailure}`);
}

export function assertReviewedNodeRuntimeLive(runtime: ReviewedNodeRuntime): void {
  const identity = OWNED_RUNTIMES.get(runtime);
  if (identity === undefined || identity.disposed) {
    fail('runtime is foreign or already disposed');
  }
  const authority = requireExactPrivateDirectoryAuthority(
    runtime.runtimeRoot,
    'reviewed Node live runtime root authority',
  );
  if (authority.device !== identity.device || authority.inode !== identity.inode) {
    fail('runtime root authority changed');
  }
}

function disposeReviewedNodeRuntimeWith(
  runtime: ReviewedNodeRuntime,
  remove: (runtimeRoot: string) => void,
): void {
  assertReviewedNodeRuntimeLive(runtime);
  const identity = OWNED_RUNTIMES.get(runtime)!;
  remove(runtime.runtimeRoot);
  // Failed removal leaves the runtime live for a checked retry. The command
  // boundary still revalidates executable authority before every execution.
  identity.disposed = true;
}

export function disposeReviewedNodeRuntime(runtime: ReviewedNodeRuntime): void {
  const identity = OWNED_RUNTIMES.get(runtime);
  if (identity === undefined || identity.disposed) {
    fail('runtime is foreign or already disposed');
  }
  disposeReviewedNodeRuntimeWith(runtime, (runtimeRoot) => {
    removeExactRuntimeRoot(runtimeRoot, identity);
  });
}

export const reviewedNodeRuntimeTesting = Object.freeze({
  disposeWithRemove: (
    runtime: ReviewedNodeRuntime,
    remove: (runtimeRoot: string) => void,
  ): void => disposeReviewedNodeRuntimeWith(runtime, remove),
  hostNodeCandidates: (): readonly string[] => candidatePathsFromHost(),
  maximumHostPathBytes: MAX_HOST_PATH_BYTES,
  maximumPathBytes: REVIEWED_POSIX_COMMAND_LIMITS.pathBytes,
});
