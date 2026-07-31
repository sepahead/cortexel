// Verify the artifact consumers actually install, not just source imports.
// Runs in an isolated temp project: core first with only normal dependencies,
// then every React subpath after installing the documented optional peers.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  accessSync,
  chmodSync,
  closeSync,
  constants as fsConstants,
  copyFileSync,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  opendirSync,
  readFileSync,
  readSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  basename,
  delimiter,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
  win32 as windowsPath,
} from 'node:path';
import { pathToFileURL } from 'node:url';
import { TextDecoder } from 'node:util';
import { inflateRawSync } from 'node:zlib';
import {
  CORTEXEL_SKILL_VERSION,
  PARAM_CONSTRAINT_LANGUAGE,
} from '../core/skills/registry';
import { NEST_SKILL_IDS } from '../core/skills/skillIds';
import { CORTEXEL_SPEC_VERSION } from '../core/vizSpec';
import { canonicalize } from '../src/core/canonicalize';
import { getBudgetLimits } from '../src/core/limits';
import { parseJsonStrict, type JsonValue } from '../src/core/parse-json';
import { SOURCE_ADAPTER_CATALOG } from '../src/adapters/source-catalog';
import { nestSpikeRecorderToRaster as sourceNestSpikeRecorderToRaster } from '../src/adapters/nest';
import { validateRequestValue as validateSourceRequestValue } from '../src/core/request';
import {
  SKILL_AUTHORING as SOURCE_SKILL_AUTHORING,
  STABLE_SKILL_IDS as SOURCE_STABLE_SKILL_IDS,
} from '../src/generated';
import { serializeManifest } from './emit-manifest';
import { packagedContractRelativeFiles } from './lib/contract-package';
import {
  REVIEWED_NODE_COMMAND_HANDSHAKE_SCHEMA as COMMAND_HANDSHAKE_SCHEMA,
  REVIEWED_NODE_COMMAND_RESULT_SCHEMA as COMMAND_RESULT_SCHEMA,
  REVIEWED_NODE_COMMAND_TEST_HOOK_SCHEMA as COMMAND_TEST_HOOK_SCHEMA,
  REVIEWED_NODE_GUARDIAN_PAYLOAD_ENV,
  REVIEWED_NODE_SUPERVISOR_PAYLOAD_ENV,
  REVIEWED_NODE_SUPERVISOR_GRACE_MS as COMMAND_SUPERVISOR_GRACE_MS,
  REVIEWED_NODE_SUPERVISOR_SOURCE as REVIEWED_NODE_SUPERVISOR,
  REVIEWED_NODE_TEST_HOOK_ENV as COMMAND_TEST_HOOK_ENVIRONMENT,
  REVIEWED_NODE_WORKER_PAYLOAD_ENV,
} from './lib/reviewed-node-supervisor';

const root = resolve(import.meta.dirname, '..');
const fixtureRoot = join(root, 'scripts', 'fixtures', 'package-smoke');
const fixtureManifestPath = join(fixtureRoot, 'package.json');
const fixtureLockPath = join(fixtureRoot, 'package-lock.json');
export const PACKAGE_SMOKE_PREPARED_SCHEMA = 'cortexel-package-smoke-prepared.v2' as const;
export const PACKAGE_SMOKE_PHASE_SCHEMA = 'cortexel-package-smoke-phase.v2' as const;
export const PACKAGE_SMOKE_STATE_FILENAME = 'package-smoke-state.v2.json';
const PREPARED_STATE_SCHEMA = PACKAGE_SMOKE_PREPARED_SCHEMA;
const PHASE_OUTPUT_SCHEMA = PACKAGE_SMOKE_PHASE_SCHEMA;
const STATE_FILENAME = PACKAGE_SMOKE_STATE_FILENAME;
const PACK_RESULT_FILENAME = 'pack-result.v1.json';
const NETWORK_GUARD_FILENAME = 'network-and-write-guard.cjs';
const LOCAL_TARBALL_FILENAME = 'cortexel-smoke.tgz';
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_TREE_ENTRIES = 200_000;
const MAX_TREE_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_WORKSPACE_FILE_BYTES = 128 * 1024 * 1024;
const WORKSPACE_HASH_CHUNK_BYTES = 1024 * 1024;
const RUNTIME_AUTHORITY_SCOPE = 'node-executable-and-npm-package-tree.v1' as const;
const NPM_TREE_SCHEMA = 'cortexel-package-smoke-npm-tree.v1' as const;
const RUNTIME_TREE_HASH_DOMAIN = 'cortexel-package-smoke-npm-tree-v1\0';
const RUNTIME_ANCESTRY_HASH_DOMAIN = 'cortexel-package-smoke-path-ancestry-v1\0';
const MAX_RUNTIME_EXECUTABLE_BYTES = 256 * 1024 * 1024;
const DEFAULT_COMMAND_TIMEOUT_MS = 5 * 60_000;
const MAX_COMMAND_OUTPUT_BYTES = 16 * 1024 * 1024;
const MAX_COMMAND_PROTOCOL_OVERHEAD_BYTES = 4_096;
const MAX_COMMAND_PAYLOAD_BYTES = 256 * 1024;
const MAX_COMMAND_ARGUMENTS = 1_024;
const MAX_COMMAND_ARGUMENT_BYTES = 128 * 1024;
const SUPPORTED_NODE_MAJORS = new Set([22, 24, 26]);
export const PACKAGE_TARBALL_LIMITS = Object.freeze({
  compressedBytes: 128 * 1024 * 1024,
  uncompressedBytes: 512 * 1024 * 1024,
  fileBytes: 128 * 1024 * 1024,
  entries: 10_000,
  tarPathBytes: 99,
  sourceNodes: 20_000,
  sourceDepth: 32,
  directoryEntries: 10_000,
});
export interface NpmAuthorityLimits {
  readonly entries: number;
  readonly totalBytes: number;
  readonly fileBytes: number;
  readonly depth: number;
  readonly directoryEntries: number;
  readonly pathBytes: number;
  readonly segmentBytes: number;
  readonly symlinkTargetBytes: number;
}

export const NPM_AUTHORITY_LIMITS: NpmAuthorityLimits = Object.freeze({
  entries: 50_000,
  totalBytes: 512 * 1024 * 1024,
  fileBytes: 128 * 1024 * 1024,
  depth: 64,
  directoryEntries: 10_000,
  pathBytes: 4_096,
  segmentBytes: 255,
  symlinkTargetBytes: 4_096,
});
const NPM_PORTABLE_MTIME_SECONDS = 499_162_500;
const NPM_GZIP_HEADER = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff]);

let commandEnvironment: NodeJS.ProcessEnv | undefined;
let commandNodeAuthority: NodeExecutableFileAuthority | undefined;
let commandRuntimeAuthority: PackageRuntimeAuthority | undefined;

export interface ReviewedNodeCommandResult {
  readonly guardianSweepIntentCount: number;
  readonly status: number;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly outputOverflow: boolean;
}

export interface ReviewedNodeCommandTestHook {
  readonly phase:
    | 'worker-ready-before-handshake'
    | 'handshake-published-before-go'
    | 'go-sent'
    | 'guardian-swept-before-result';
  readonly readyPath: string;
}

/*
 * The synchronous child_process timeout waits for a signal-resistant target and
 * for descendant-held pipes. The exact reviewed Node therefore supervises a
 * trusted gated guardian in a fresh POSIX session/process group. The guardian is
 * the live group leader and is the only production process allowed to address the
 * group: it writes one bounded sweep intent and then calls
 * one self-addressed negative-PID SIGKILL while its own live identity pins the
 * PGID. The supervisor owns the guardian's exclusive control-pipe writer; EOF
 * therefore triggers the same anchored self-sweep if the supervisor dies at any
 * point. A non-leader worker sits between guardian and reviewed target so a target
 * that kills its immediate parent cannot kill the group anchor.
 *
 * The outer synchronous caller receives only an unforgeable-for-cleanup boolean
 * armed handshake, never a PID/PGID, and performs no numeric fallback after
 * supervisor completion. Deliberate regrouping/detachment, discovery and killing
 * of the guardian, or hostile signal-authority changes still require an external
 * cgroup/sandbox/Job Object; uncertain cleanup fails without signalling a reusable
 * numeric identity.
 */

function activeCommandEnvironment(): NodeJS.ProcessEnv {
  if (commandEnvironment === undefined) fail('package-smoke command environment is not initialized');
  return commandEnvironment;
}

function runtimeStatIdentity(stats: BigIntStats): readonly bigint[] {
  return [
    stats.dev,
    stats.ino,
    stats.mode,
    stats.size,
    stats.nlink,
    stats.uid,
    stats.gid,
    stats.mtimeNs,
    stats.ctimeNs,
    stats.birthtimeNs,
  ];
}

function sameRuntimeStat(left: BigIntStats, right: BigIntStats): boolean {
  const leftIdentity = runtimeStatIdentity(left);
  const rightIdentity = runtimeStatIdentity(right);
  return leftIdentity.every((value, index) => value === rightIdentity[index]);
}

function boundedBigIntNumber(value: bigint, maximum: number, label: string): number {
  if (value < 0n || value > BigInt(maximum)) fail(`${label} is outside its byte budget`);
  return Number(value);
}

function portableUnsignedBigInt(value: bigint, label: string, minimum = 0n): number {
  if (value < minimum || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail(`${label} is outside the portable integer domain`);
  }
  return Number(value);
}

function portableRuntimeFileAuthority(
  path: string,
  stats: BigIntStats,
  digest: string,
  size: number,
): RuntimeFileAuthority {
  const mode = Number(stats.mode & 0o7777n);
  const uid = portableUnsignedBigInt(stats.uid, `runtime authority uid: ${path}`);
  const gid = portableUnsignedBigInt(stats.gid, `runtime authority gid: ${path}`);
  return {
    path,
    sha256: digest,
    size,
    mode,
    uid,
    gid,
    linkCount: 1,
    device: stats.dev.toString(10),
    inode: stats.ino.toString(10),
    mtimeNs: stats.mtimeNs.toString(10),
    ctimeNs: stats.ctimeNs.toString(10),
    birthtimeNs: stats.birthtimeNs.toString(10),
  };
}

function inspectRuntimeRegularFile(
  path: string,
  maximumBytes: number,
  label: string,
  executable = false,
): RuntimeFileAuthority {
  if (!isAbsolute(path) || Buffer.byteLength(path, 'utf8') > NPM_AUTHORITY_LIMITS.pathBytes ||
      realpathSync(path) !== path) {
    fail(`${label} must be one bounded canonical physical absolute path`);
  }
  const initial = lstatSync(path, { bigint: true });
  if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1n) {
    fail(`${label} must be a unique real regular file`);
  }
  const mode = initial.mode & 0o7777n;
  if ((mode & 0o7022n) !== 0n) {
    fail(`${label} must not carry special or group/world-write mode authority`);
  }
  if (executable && (mode & 0o111n) === 0n) fail(`${label} is not executable`);
  if (executable) accessSync(path, fsConstants.X_OK);
  const size = boundedBigIntNumber(initial.size, maximumBytes, label);
  const descriptor = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameRuntimeStat(opened, initial)) {
      fail(`${label} changed before it could be hashed`);
    }
    const digest = createHash('sha256');
    const chunk = Buffer.allocUnsafe(WORKSPACE_HASH_CHUNK_BYTES);
    let offset = 0;
    while (offset < size) {
      const length = Math.min(chunk.byteLength, size - offset);
      const count = readSync(descriptor, chunk, 0, length, offset);
      if (count <= 0) fail(`${label} ended before its declared size`);
      digest.update(chunk.subarray(0, count));
      offset += count;
    }
    const finalDescriptor = fstatSync(descriptor, { bigint: true });
    const rebound = lstatSync(path, { bigint: true });
    if (!sameRuntimeStat(opened, finalDescriptor) || !sameRuntimeStat(opened, rebound)) {
      fail(`${label} changed while it was being hashed`);
    }
    return portableRuntimeFileAuthority(
      path,
      opened,
      `sha256:${digest.digest('hex')}`,
      size,
    );
  } finally {
    closeSync(descriptor);
  }
}

function inspectRuntimePathAncestry(path: string, label: string): RuntimePathAncestry {
  const components: string[] = [];
  let cursor = dirname(path);
  while (true) {
    components.push(cursor);
    if (components.length > NPM_AUTHORITY_LIMITS.depth) {
      fail(`${label} ancestry exceeds its depth budget`);
    }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  components.reverse();
  const inspect = (): Array<Record<string, JsonValue>> => components.map((component) => {
    if (realpathSync(component) !== component) {
      fail(`${label} ancestry contains a symbolic or noncanonical directory`);
    }
    const stats = lstatSync(component, { bigint: true });
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      fail(`${label} ancestry contains a non-directory component`);
    }
    const uid = portableUnsignedBigInt(stats.uid, `${label} ancestry uid`);
    const gid = portableUnsignedBigInt(stats.gid, `${label} ancestry gid`);
    return {
      path: component,
      device: stats.dev.toString(10),
      inode: stats.ino.toString(10),
      mode: Number(stats.mode & 0o7777n),
      uid,
      gid,
    };
  });
  const records = inspect();
  if (!exactJsonEqual(records, inspect())) fail(`${label} ancestry changed while it was sealed`);
  return {
    sha256: sha256(`${RUNTIME_ANCESTRY_HASH_DOMAIN}${canonicalize(records)}`),
    entryCount: records.length,
  };
}

export function inspectNodeExecutableAuthority(executable: string): NodeExecutableFileAuthority {
  return {
    executable,
    file: inspectRuntimeRegularFile(
      executable,
      MAX_RUNTIME_EXECUTABLE_BYTES,
      'reviewed Node executable authority',
      true,
    ),
    ancestry: inspectRuntimePathAncestry(executable, 'reviewed Node executable'),
  };
}

function assertNodeExecutableAuthority(
  expected: NodeExecutableFileAuthority,
  label: string,
): void {
  const observed = inspectNodeExecutableAuthority(expected.executable);
  if (!exactJsonEqual(observed, expected)) fail(`${label} Node executable authority changed`);
}

export function runReviewedNodeCommand(
  reviewedNodeExecutable: string,
  args: readonly string[],
  cwd: string,
  options: {
    readonly environment?: NodeJS.ProcessEnv;
    readonly timeoutMs?: number;
    readonly outputLimitBytes?: number;
    readonly nodeAuthority?: NodeExecutableFileAuthority;
    /** Host-controlled regression rendezvous; never copied into guardian, worker, or target input. */
    readonly trustedTestHook?: ReviewedNodeCommandTestHook;
  } = {},
): ReviewedNodeCommandResult {
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    fail('reviewed Node command supervision is implemented only for reviewed macOS/Linux semantics');
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
  const outputLimitBytes = options.outputLimitBytes ?? MAX_COMMAND_OUTPUT_BYTES;
  if (!isAbsolute(reviewedNodeExecutable) || realpathSync(reviewedNodeExecutable) !== reviewedNodeExecutable) {
    fail('reviewed Node command executable must be a canonical absolute path');
  }
  const expectedNodeAuthority = options.nodeAuthority ??
    commandNodeAuthority ?? inspectNodeExecutableAuthority(reviewedNodeExecutable);
  if (expectedNodeAuthority.executable !== reviewedNodeExecutable) {
    fail('reviewed Node command executable differs from its byte authority');
  }
  assertNodeExecutableAuthority(expectedNodeAuthority, 'pre-command');
  if (!isAbsolute(cwd) || realpathSync(cwd) !== cwd || !lstatSync(cwd).isDirectory()) {
    fail('reviewed Node command working directory must be a canonical absolute directory');
  }
  let trustedTestHookPayload: string | undefined;
  if (options.trustedTestHook !== undefined) {
    const hook = options.trustedTestHook;
    if (
      hook.phase !== 'worker-ready-before-handshake' &&
      hook.phase !== 'handshake-published-before-go' &&
      hook.phase !== 'go-sent' &&
      hook.phase !== 'guardian-swept-before-result'
    ) {
      fail('reviewed Node command test hook has an invalid phase');
    }
    const readyPath = hook.readyPath;
    if (
      !isAbsolute(readyPath) ||
      resolve(readyPath) !== readyPath ||
      readyPath.includes('\0') ||
      Buffer.byteLength(readyPath, 'utf8') > NPM_AUTHORITY_LIMITS.pathBytes ||
      !isInside(cwd, readyPath)
    ) {
      fail('reviewed Node command test hook ready path is not bounded inside its working directory');
    }
    const readyParent = dirname(readyPath);
    const readyParentStats = lstatSync(readyParent);
    if (
      realpathSync(readyParent) !== readyParent ||
      !readyParentStats.isDirectory() ||
      readyParentStats.isSymbolicLink()
    ) {
      fail('reviewed Node command test hook ready parent is not one canonical directory');
    }
    if (existsSync(readyPath)) fail('reviewed Node command test hook ready path already exists');
    trustedTestHookPayload = canonicalize({
      phase: hook.phase,
      readyPath: hook.readyPath,
      schema: COMMAND_TEST_HOOK_SCHEMA,
    });
  }
  let payloadInputBytes = Buffer.byteLength(cwd, 'utf8');
  if (args.length > MAX_COMMAND_ARGUMENTS) fail('reviewed Node command has too many arguments');
  for (const [index, argument] of args.entries()) {
    if (typeof argument !== 'string' || argument.includes('\0') ||
        Buffer.byteLength(argument, 'utf8') > MAX_COMMAND_ARGUMENT_BYTES) {
      fail(`reviewed Node command argument ${index} is invalid or oversized`);
    }
    payloadInputBytes += Buffer.byteLength(argument, 'utf8');
    if (payloadInputBytes > MAX_COMMAND_PAYLOAD_BYTES) {
      fail('reviewed Node command payload input exceeds its pre-serialization byte budget');
    }
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > DEFAULT_COMMAND_TIMEOUT_MS) {
    fail('reviewed Node command timeout is outside its bound');
  }
  if (!Number.isSafeInteger(outputLimitBytes) || outputLimitBytes < 1 ||
      outputLimitBytes > MAX_COMMAND_OUTPUT_BYTES) {
    fail('reviewed Node command output budget is outside its bound');
  }
  const targetEnvironment = Object.fromEntries(
    Object.entries(options.environment ?? activeCommandEnvironment())
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  for (const reserved of [
    REVIEWED_NODE_SUPERVISOR_PAYLOAD_ENV,
    REVIEWED_NODE_GUARDIAN_PAYLOAD_ENV,
    REVIEWED_NODE_WORKER_PAYLOAD_ENV,
    COMMAND_TEST_HOOK_ENVIRONMENT,
  ]) {
    if (Object.hasOwn(targetEnvironment, reserved)) {
      fail(`reviewed Node command environment contains reserved entry ${reserved}`);
    }
  }
  for (const [key, value] of Object.entries(targetEnvironment)) {
    if (key.length === 0 || key.includes('\0') || key.includes('=') || value.includes('\0')) {
      fail('reviewed Node command environment contains an invalid entry');
    }
    payloadInputBytes += Buffer.byteLength(key, 'utf8') + Buffer.byteLength(value, 'utf8');
    if (payloadInputBytes > MAX_COMMAND_PAYLOAD_BYTES) {
      fail('reviewed Node command payload input exceeds its pre-serialization byte budget');
    }
  }
  const payload = canonicalize({
    args,
    cwd,
    environment: targetEnvironment,
    outputLimitBytes,
    timeoutMs,
  });
  if (Buffer.byteLength(payload, 'utf8') > MAX_COMMAND_PAYLOAD_BYTES) {
    fail('reviewed Node command payload exceeds its environment-safe byte budget');
  }
  // Control-plane processes receive a fresh closed environment. In particular,
  // arbitrary target loader/runtime variables (LD_PRELOAD, DYLD_*, NODE_OPTIONS,
  // and future equivalents) must never execute before the supervisor/guardian
  // JavaScript can enforce its protocol. The exact target environment travels
  // only as bounded JSON and is installed by the worker for the reviewed target.
  const supervisorEnvironment: NodeJS.ProcessEnv = {
    [REVIEWED_NODE_SUPERVISOR_PAYLOAD_ENV]: payload,
  };
  if (trustedTestHookPayload !== undefined) {
    supervisorEnvironment[COMMAND_TEST_HOOK_ENVIRONMENT] = trustedTestHookPayload;
  }
  const maximumEnvelopeBytes = 4 * Math.ceil(outputLimitBytes / 3) +
    MAX_COMMAND_PROTOCOL_OVERHEAD_BYTES;
  const outer = spawnSync(reviewedNodeExecutable, ['-e', REVIEWED_NODE_SUPERVISOR], {
    cwd,
    encoding: null,
    env: supervisorEnvironment,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs + COMMAND_SUPERVISOR_GRACE_MS,
    killSignal: 'SIGKILL',
    maxBuffer: maximumEnvelopeBytes,
    windowsHide: true,
  });
  const outerStdout = Buffer.isBuffer(outer.stdout) ? outer.stdout : Buffer.alloc(0);
  let guardianArmed = false;
  let resultRaw = outerStdout;
  const firstLineEnd = outerStdout.indexOf(0x0a);
  if (firstLineEnd >= 0 && firstLineEnd + 1 <= MAX_COMMAND_PROTOCOL_OVERHEAD_BYTES) {
    const firstLine = outerStdout.subarray(0, firstLineEnd + 1);
    const firstValue = parseCanonicalJsonBuffer(
      firstLine,
      'reviewed Node command handshake',
      MAX_COMMAND_PROTOCOL_OVERHEAD_BYTES,
    );
    if (isRecord(firstValue) && firstValue.schema === COMMAND_HANDSHAKE_SCHEMA) {
      exactKeys(
        firstValue,
        ['guardianArmed', 'schema'],
        'reviewed Node command handshake',
      );
      if (firstValue.guardianArmed !== true) {
        fail('reviewed Node command handshake did not arm its private guardian');
      }
      guardianArmed = true;
      resultRaw = outerStdout.subarray(firstLineEnd + 1);
    }
  }
  // The production handshake deliberately carries no numeric cleanup handle.
  // Abnormal supervisor completion fails here without signalling or probing a
  // potentially reusable PID/PGID; the exclusive guardian-lease writer closes
  // with the supervisor and the still-live guardian self-sweeps its own group.
  assertNodeExecutableAuthority(expectedNodeAuthority, 'post-command');
  if (outer.error !== undefined) {
    const code = (outer.error as NodeJS.ErrnoException).code;
    if (code === 'ENOBUFS') {
      fail('reviewed Node command supervisor crossed its outer output bound');
    }
    if (code === 'ETIMEDOUT') {
      fail('reviewed Node command supervisor crossed its outer hard timeout');
    }
    fail(`reviewed Node command supervisor failed: ${code ?? 'unknown error'}`);
  }
  if (outer.status !== 0 || outer.signal !== null) {
    const detail = Buffer.isBuffer(outer.stderr) && outer.stderr.byteLength > 0
      ? decodeUtf8Fatal(outer.stderr, 'reviewed Node supervisor stderr').slice(0, 2_048).trimEnd()
      : '';
    const summary = outer.signal === 'SIGKILL'
      ? 'reviewed Node command supervisor was terminated by SIGKILL without a valid result'
      : 'reviewed Node command supervisor failed without a valid result';
    fail(
      summary +
      ` (status ${String(outer.status)}, signal ${String(outer.signal)})` +
      (detail ? `: ${detail}` : ''),
    );
  }
  const outerStderr = Buffer.isBuffer(outer.stderr) ? outer.stderr : Buffer.alloc(0);
  if (outerStderr.byteLength !== 0) {
    fail('reviewed Node command supervisor wrote outside its result envelope');
  }
  if (resultRaw.byteLength === 0 || resultRaw.byteLength > maximumEnvelopeBytes) {
    fail('reviewed Node command supervisor returned an invalid result size');
  }
  const resultValue = parseCanonicalJsonBuffer(
    resultRaw,
    'reviewed Node command result',
    maximumEnvelopeBytes,
  );
  const record = expectRecord(resultValue, 'reviewed Node command result');
  exactKeys(
    record,
    [
      'guardianSweepIntentCount',
      'outputOverflow',
      'schema',
      'signal',
      'spawnError',
      'status',
      'stderrBase64',
      'stdoutBase64',
      'timedOut',
    ],
    'reviewed Node command result',
  );
  const validSignal = record.signal === null ||
    (typeof record.signal === 'string' && /^SIG[A-Z0-9]+$/u.test(record.signal));
  const validStatus = record.status === null ||
    (typeof record.status === 'number' && Number.isSafeInteger(record.status) &&
      record.status >= 0 && record.status <= 255);
  if (
    record.schema !== COMMAND_RESULT_SCHEMA ||
    (record.guardianSweepIntentCount !== 0 && record.guardianSweepIntentCount !== 1) ||
    typeof record.outputOverflow !== 'boolean' ||
    typeof record.timedOut !== 'boolean' ||
    (record.spawnError !== null &&
      (typeof record.spawnError !== 'string' ||
        record.spawnError.length === 0 ||
        record.spawnError.length > 256)) ||
    typeof record.stderrBase64 !== 'string' ||
    typeof record.stdoutBase64 !== 'string' ||
    !validSignal ||
    !validStatus
  ) {
    fail('reviewed Node command supervisor returned an invalid result record');
  }
  const hasSpawnError = record.spawnError !== null;
  const wasHardStopped = record.timedOut || record.outputOverflow;
  const hasStatus = typeof record.status === 'number';
  const hasSignal = typeof record.signal === 'string';
  if (hasSpawnError) {
    if (
      hasStatus ||
      hasSignal ||
      wasHardStopped ||
      (record.guardianSweepIntentCount === 0) === guardianArmed
    ) {
      fail('reviewed Node command spawn failure has an impossible completion state');
    }
    fail(`reviewed Node target spawn failed: ${record.spawnError}`);
  }
  if (!guardianArmed) {
    fail('reviewed Node command result has no pre-execution guardian handshake');
  }
  if (record.guardianSweepIntentCount !== 1) {
    fail('reviewed Node command did not publish exactly one guardian sweep intent');
  }
  if (wasHardStopped) {
    if (hasStatus || record.signal !== 'SIGKILL') {
      fail('reviewed Node command did not terminate with the required hard signal');
    }
  } else if (hasStatus === hasSignal) {
    fail('reviewed Node command completion must have exactly one status discriminator');
  }
  // Normal completion is accepted only after the gated worker published the
  // target result, the live guardian published one intent, and the guardian
  // closed by SIGKILL. No numeric group identity crosses this boundary.
  const decodeCanonicalBase64 = (value: string, label: string): Buffer => {
    if (value.length % 4 !== 0) {
      fail(`${label} is not canonical base64`);
    }
    let padding = 0;
    if (value.endsWith('=')) padding++;
    if (value.endsWith('==')) padding++;
    const encodedLength = value.length - padding;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      const alphabet =
        (code >= 0x41 && code <= 0x5a) ||
        (code >= 0x61 && code <= 0x7a) ||
        (code >= 0x30 && code <= 0x39) ||
        code === 0x2b ||
        code === 0x2f;
      if ((index < encodedLength && !alphabet) ||
          (index >= encodedLength && code !== 0x3d)) {
        fail(`${label} is not canonical base64`);
      }
    }
    const decoded = Buffer.from(value, 'base64');
    if (decoded.toString('base64') !== value) fail(`${label} is not canonical base64`);
    return decoded;
  };
  const stdoutRaw = decodeCanonicalBase64(record.stdoutBase64 as string, 'reviewed Node stdout');
  const stderrRaw = decodeCanonicalBase64(record.stderrBase64 as string, 'reviewed Node stderr');
  if (stdoutRaw.byteLength + stderrRaw.byteLength > outputLimitBytes) {
    fail('reviewed Node command output crossed its supervisor budget');
  }
  const stdout = decodeUtf8Fatal(stdoutRaw, 'reviewed Node command stdout');
  const stderr = decodeUtf8Fatal(stderrRaw, 'reviewed Node command stderr');
  return {
    guardianSweepIntentCount: record.guardianSweepIntentCount as number,
    status: typeof record.status === 'number' ? record.status : -1,
    signal: record.signal as NodeJS.Signals | null,
    stdout,
    stderr,
    timedOut: record.timedOut,
    outputOverflow: record.outputOverflow,
  };
}

function runResult(command: string, args: string[], cwd: string): ReviewedNodeCommandResult {
  const result = runReviewedNodeCommand(command, args, cwd);
  if (result.timedOut) fail(`${command} exceeded its hard timeout`);
  if (result.outputOverflow) fail(`${command} exceeded its output budget`);
  return result;
}

const REVIEWED_COMMAND_DIAGNOSTIC_LIMITS = Object.freeze({
  commandEncodedBytes: 1_024,
  channelEncodedBytes: 3_072,
});

function jsonDiagnosticString(
  value: string,
  encodedByteLimit: number,
): { readonly encoded: string; readonly truncated: boolean } {
  let body = '';
  let encodedBytes = 2; // Opening and closing JSON quotes.
  let consumedUtf16Units = 0;

  for (const character of value) {
    let fragment: string;
    if (
      /\p{Cc}|\p{Cf}/u.test(character) ||
      character === '\u2028' ||
      character === '\u2029'
    ) {
      fragment = '';
      for (let index = 0; index < character.length; index += 1) {
        fragment += `\\u${character.charCodeAt(index).toString(16).padStart(4, '0')}`;
      }
    } else {
      // JSON.stringify escapes quotes, backslashes, and the remaining JSON controls.
      fragment = JSON.stringify(character).slice(1, -1);
    }

    const fragmentBytes = Buffer.byteLength(fragment);
    if (encodedBytes + fragmentBytes > encodedByteLimit) {
      return { encoded: `"${body}"`, truncated: true };
    }
    body += fragment;
    encodedBytes += fragmentBytes;
    consumedUtf16Units += character.length;
  }

  return {
    encoded: `"${body}"`,
    truncated: consumedUtf16Units !== value.length,
  };
}

export function formatReviewedNodeCommandFailure(
  command: string,
  result: Pick<ReviewedNodeCommandResult, 'status' | 'signal' | 'stdout' | 'stderr'>,
): string {
  const encodedCommand = jsonDiagnosticString(
    command,
    REVIEWED_COMMAND_DIAGNOSTIC_LIMITS.commandEncodedBytes,
  );
  const encodedStdout = jsonDiagnosticString(
    result.stdout,
    REVIEWED_COMMAND_DIAGNOSTIC_LIMITS.channelEncodedBytes,
  );
  const encodedStderr = jsonDiagnosticString(
    result.stderr,
    REVIEWED_COMMAND_DIAGNOSTIC_LIMITS.channelEncodedBytes,
  );
  return (
    'reviewed Node command failed: {' +
    `"command":${encodedCommand.encoded},` +
    `"commandTruncated":${String(encodedCommand.truncated)},` +
    `"status":${String(result.status)},` +
    `"signal":${result.signal === null ? 'null' : JSON.stringify(result.signal)},` +
    `"stdout":${encodedStdout.encoded},` +
    `"stdoutTruncated":${String(encodedStdout.truncated)},` +
    `"stderr":${encodedStderr.encoded},` +
    `"stderrTruncated":${String(encodedStderr.truncated)}` +
    '}'
  );
}

function run(command: string, args: string[], cwd: string): string {
  const result = runResult(command, args, cwd);
  if (result.status !== 0 || result.signal !== null) {
    // Many CLIs (including TypeScript) report diagnostics on stdout. Preserve both
    // channels without argv/environment, and encode them for one bounded terminal-safe
    // diagnostic rather than allowing child output to forge report structure.
    fail(formatReviewedNodeCommandFailure(command, result));
  }
  return result.stdout.trim();
}

const EXPECTED_FIXTURE_MANIFEST_SHA256 =
  '8507e234f5f9b9ebed89339d172b57f89ec558b279f6cd2930564322cdbb5be8';
const EXPECTED_FIXTURE_LOCK_SHA256 =
  '1b1f20245812f21d5353635a7e9242450ec4fb042af07efb9f4f48548c15428e';
const EXPECTED_DEV_DEPENDENCIES = Object.freeze({
  '@types/node': '20.19.43',
  '@types/react': '19.2.17',
  '@types/react-dom': '19.2.3',
  react: '19.2.7',
  'react-dom': '19.2.7',
  typescript: '5.9.3',
});
const EXPECTED_OPTIONAL_DEPENDENCIES = Object.freeze({
  '@react-three/fiber': '9.6.1',
  '@types/three': '0.185.1',
  'd3-force-3d': '3.0.6',
  three: '0.185.1',
});
const EXPECTED_PACKAGE_FILE_ENTRIES = Object.freeze([
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
]);
const JSON_LIMITS = Object.freeze({
  ...getBudgetLimits('standard'),
  rawInputBytes: MAX_JSON_BYTES,
  jsonDepth: 64,
  jsonTotalNodes: 200_000,
  jsonStringLength: 2 * 1024 * 1024,
  jsonNumberTokenLength: 128,
  jsonObjectKeys: 100_000,
  jsonArrayItems: 100_000,
});
const NPM_CI_FLAGS = [
  'ci',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
  '--legacy-peer-deps',
  '--install-strategy=nested',
  '--registry=https://registry.npmjs.org/',
] as const;

type SmokePhase = 'prepare' | 'execute';

interface SmokeInvocation {
  readonly command: 'all' | SmokePhase;
  readonly workspace?: string;
  readonly nodeExecutable?: string;
  readonly npmExecutable?: string;
  readonly expectedStateDigest?: string;
}

export interface PackedFile {
  readonly path: string;
  readonly size: number;
  readonly mode: number;
}

export interface PackedResult {
  readonly name: string;
  readonly version: string;
  readonly size: number;
  readonly unpackedSize: number;
  readonly shasum: string;
  readonly integrity: string;
  readonly filename: string;
  readonly files: readonly PackedFile[];
  readonly entryCount: number;
}

export interface ExpectedPackageFile extends PackedFile {
  readonly digest: string;
}

export interface PackageTarballInspection {
  readonly compressedBytes: number;
  readonly uncompressedBytes: number;
  readonly fileBytes: number;
  readonly entryCount: number;
  readonly treeDigest: string;
}

interface WorkspaceSeal {
  readonly digest: string;
  readonly entryCount: number;
  readonly fileCount: number;
  readonly byteCount: number;
  readonly root: WorkspaceRootAuthority;
  readonly parentAncestry: RuntimePathAncestry;
}

interface WorkspaceRootAuthority {
  readonly path: string;
  readonly device: string;
  readonly inode: string;
  readonly mode: number;
  readonly uid: number;
  readonly gid: number;
  readonly linkCount: number;
}

export interface RuntimeFileAuthority {
  readonly path: string;
  readonly sha256: string;
  readonly size: number;
  readonly mode: number;
  readonly uid: number;
  readonly gid: number;
  readonly linkCount: 1;
  readonly device: string;
  readonly inode: string;
  readonly mtimeNs: string;
  readonly ctimeNs: string;
  readonly birthtimeNs: string;
}

export interface RuntimePathAncestry {
  readonly sha256: string;
  readonly entryCount: number;
}

export interface NodeExecutableFileAuthority {
  readonly executable: string;
  readonly file: RuntimeFileAuthority;
  readonly ancestry: RuntimePathAncestry;
}

export interface NodeExecutableAuthority extends NodeExecutableFileAuthority {
  readonly version: string;
}

export interface NpmPackageTreeAuthority {
  readonly schema: typeof NPM_TREE_SCHEMA;
  readonly sha256: string;
  readonly entryCount: number;
  readonly directoryCount: number;
  readonly fileCount: number;
  readonly symlinkCount: number;
  readonly byteCount: number;
}

export interface NpmPackageAuthority {
  readonly root: string;
  readonly cli: string;
  readonly version: string;
  readonly packageJsonSha256: string;
  readonly cliFile: RuntimeFileAuthority;
  readonly ancestry: RuntimePathAncestry;
  readonly tree: NpmPackageTreeAuthority;
}

export interface PackageRuntimeAuthority {
  readonly scope: typeof RUNTIME_AUTHORITY_SCOPE;
  readonly node: NodeExecutableAuthority;
  readonly npm: NpmPackageAuthority;
}

interface PreparedState {
  readonly schema: typeof PREPARED_STATE_SCHEMA;
  readonly workspace: string;
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly packageVersion: string;
  readonly artifactIntegrity: string;
  readonly artifactSha256: string;
  readonly fixtureManifestSha256: string;
  readonly fixtureLockSha256: string;
  readonly packResultSha256: string;
  readonly runtimeAuthority: PackageRuntimeAuthority;
  readonly coreConsumer: string;
  readonly chartsConsumer: string;
  readonly consumer: string;
  readonly unrelatedDirectory: string;
  readonly nodeModules: readonly [string, string, string];
  readonly workspaceSeal: WorkspaceSeal;
  readonly readOnlyWorkspace: boolean;
}

export interface PackageSmokePhaseSuccessOutput {
  readonly schema: typeof PHASE_OUTPUT_SCHEMA;
  readonly phase: SmokePhase;
  readonly status: 'prepared' | 'passed';
  readonly workspace: string;
  readonly stateFile: string;
  readonly stateDigest: string;
  readonly packageVersion: string;
  readonly artifactIntegrity: string;
  readonly runtimeAuthority: PackageRuntimeAuthority;
  readonly nodeModules: readonly [string, string, string];
  readonly workspaceSeal: string;
}

export interface PackageSmokePhaseFailureOutput {
  readonly schema: typeof PHASE_OUTPUT_SCHEMA;
  readonly phase: SmokePhase;
  readonly status: 'failed';
  readonly code: 'PACKAGE_SMOKE_FAILED';
  readonly message: string;
}

/**
 * Canonical CLI transport/status union. This is intentionally not named or
 * represented as a durable execution receipt: it does not bind the harness source
 * closure or retain each internal reviewed-command lifecycle/result record.
 */
export type PackageSmokePhaseOutput =
  | PackageSmokePhaseSuccessOutput
  | PackageSmokePhaseFailureOutput;

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, JsonValue>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (canonicalize(actual) !== canonicalize(wanted)) {
    fail(`${label} has unexpected keys: ${actual.join(', ')}`);
  }
}

function strictJson(text: string, label: string, maximumBytes = MAX_JSON_BYTES): JsonValue {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    fail(`${label} has an invalid JSON byte budget`);
  }
  const limits = maximumBytes === MAX_JSON_BYTES
    ? JSON_LIMITS
    : {
        ...JSON_LIMITS,
        rawInputBytes: maximumBytes,
        jsonStringLength: maximumBytes,
      };
  const parsed = parseJsonStrict(text, { limits });
  if (!parsed.ok) {
    fail(`${label} is not strict JSON: ${parsed.errors[0]?.message ?? 'unknown parse error'}`);
  }
  return parsed.value;
}

function decodeUtf8Fatal(raw: Buffer, label: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
  } catch {
    fail(`${label} is not well-formed UTF-8`);
  }
}

function readStrictJson(path: string, label: string): JsonValue {
  const raw = readRegularFileStable(path, undefined, label, MAX_JSON_BYTES);
  return strictJson(decodeUtf8Fatal(raw, label), label);
}

function parseCanonicalJsonBuffer(
  raw: Buffer,
  label: string,
  maximumBytes = MAX_JSON_BYTES,
): JsonValue {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    fail(`${label} has an invalid JSON byte budget`);
  }
  if (raw.byteLength > maximumBytes) fail(`${label} exceeds the JSON byte budget`);
  const text = decodeUtf8Fatal(raw, label);
  const parsed = strictJson(text, label, maximumBytes);
  if (text !== `${canonicalize(parsed)}\n`) fail(`${label} is not canonical JSON`);
  return parsed;
}

function sha256(raw: string | Buffer): string {
  return `sha256:${createHash('sha256').update(raw).digest('hex')}`;
}

function sha512Integrity(raw: Buffer): string {
  return `sha512-${createHash('sha512').update(raw).digest('base64')}`;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(raw: Buffer): number {
  let value = 0xffff_ffff;
  for (const byte of raw) value = CRC32_TABLE[(value ^ byte) & 0xff]! ^ (value >>> 8);
  return (value ^ 0xffff_ffff) >>> 0;
}

function allZero(raw: Buffer): boolean {
  return raw.every((byte) => byte === 0);
}

function assertZeroField(raw: Buffer, label: string): void {
  if (!allZero(raw)) fail(`${label} must be empty`);
}

function parseCanonicalTarOctal(raw: Buffer, digits: number, label: string): number {
  if (
    raw.byteLength !== digits + 2 ||
    raw[digits] !== 0x20 ||
    raw[digits + 1] !== 0 ||
    !raw.subarray(0, digits).every((byte) => byte >= 0x30 && byte <= 0x37)
  ) {
    fail(`${label} is not canonical octal`);
  }
  const value = Number.parseInt(raw.subarray(0, digits).toString('ascii'), 8);
  if (!Number.isSafeInteger(value)) fail(`${label} exceeds the safe integer domain`);
  return value;
}

function parseCanonicalTarName(raw: Buffer): string {
  const terminator = raw.indexOf(0);
  if (terminator <= 0 || terminator > PACKAGE_TARBALL_LIMITS.tarPathBytes) {
    fail('package tar path is missing its canonical terminator');
  }
  if (!allZero(raw.subarray(terminator))) fail('package tar path has nonzero suffix bytes');
  const nameBytes = raw.subarray(0, terminator);
  if (!nameBytes.every((byte) => byte >= 0x21 && byte <= 0x7e)) {
    fail('package tar path must use printable ASCII');
  }
  return nameBytes.toString('ascii');
}

function isCanonicalArtifactSegment(segment: string): boolean {
  if (!/^[A-Za-z0-9_@.+-]+$/u.test(segment) || segment === '.' || segment === '..' ||
      segment.endsWith('.')) return false;
  const basenameBeforeDot = segment.split('.')[0]!.toUpperCase();
  return !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/u.test(basenameBeforeDot);
}

function assertCanonicalArtifactPath(path: string, label: string): void {
  if (
    path.length === 0 ||
    Buffer.byteLength(path, 'ascii') !== path.length ||
    Buffer.byteLength(`package/${path}`, 'ascii') > PACKAGE_TARBALL_LIMITS.tarPathBytes ||
    path.startsWith('/') ||
    path.endsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((segment) => !isCanonicalArtifactSegment(segment))
  ) {
    fail(`${label} is not a canonical package-relative path: ${path}`);
  }
}

function expectedArtifactMode(path: string): number {
  return path === 'dist/cli/main.js' ? 0o755 : 0o644;
}

export function installedArtifactMode(mode: number): number {
  if (!Number.isSafeInteger(mode) || mode < 0) {
    fail('installed Cortexel file mode is invalid');
  }
  return mode & 0o7777;
}

function gunzipSinglePackageMember(tarball: Buffer): Buffer {
  if (
    tarball.byteLength < 18 ||
    tarball.byteLength > PACKAGE_TARBALL_LIMITS.compressedBytes
  ) {
    fail('package tarball compressed size is outside its bound');
  }
  if (!tarball.subarray(0, 3).equals(NPM_GZIP_HEADER.subarray(0, 3))) {
    fail('package tarball gzip header is malformed');
  }
  if (tarball[3] !== 0) {
    fail('package tarball gzip optional fields are unsupported');
  }
  if (!tarball.subarray(0, NPM_GZIP_HEADER.byteLength).equals(NPM_GZIP_HEADER)) {
    fail('package tarball gzip header is not the canonical npm portable profile');
  }
  const deflateOffset = 10;
  let result: { readonly buffer: Buffer; readonly engine: { readonly bytesWritten: number } };
  try {
    result = inflateRawSync(tarball.subarray(deflateOffset), {
      info: true,
      maxOutputLength: PACKAGE_TARBALL_LIMITS.uncompressedBytes,
    }) as unknown as typeof result;
  } catch {
    fail('package tarball contains malformed, truncated, or over-budget DEFLATE data');
  }
  const deflateBytes = result.engine.bytesWritten;
  if (!Number.isSafeInteger(deflateBytes) || deflateBytes <= 0) {
    fail('package tarball DEFLATE length is invalid');
  }
  const footerOffset = deflateOffset + deflateBytes;
  if (footerOffset + 8 > tarball.byteLength) {
    fail('package tarball has a truncated gzip footer');
  }
  if (footerOffset + 8 < tarball.byteLength) {
    fail('package tarball has a concatenated gzip member or trailing bytes');
  }
  const expectedCrc = tarball.readUInt32LE(footerOffset);
  const expectedSize = tarball.readUInt32LE(footerOffset + 4);
  if (crc32(result.buffer) !== expectedCrc) fail('package tarball gzip CRC-32 mismatch');
  if (result.buffer.byteLength !== expectedSize) fail('package tarball gzip size mismatch');
  return result.buffer;
}

function artifactFileMap<T extends PackedFile>(
  files: readonly T[],
  label: string,
  requireDigest: boolean,
): Map<string, T> {
  if (files.length === 0 || files.length > PACKAGE_TARBALL_LIMITS.entries) {
    fail(`${label} entry count is outside its bound`);
  }
  const result = new Map<string, T>();
  const caseFolded = new Set<string>();
  for (const file of files) {
    assertCanonicalArtifactPath(file.path, `${label} path`);
    if (
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      file.size > PACKAGE_TARBALL_LIMITS.fileBytes
    ) {
      fail(`${label} file size is outside its bound: ${file.path}`);
    }
    if (file.mode !== expectedArtifactMode(file.path)) {
      fail(`${label} file mode is invalid: ${file.path}`);
    }
    const folded = file.path.toLowerCase();
    if (result.has(file.path) || caseFolded.has(folded)) {
      fail(`${label} contains a duplicate semantic path: ${file.path}`);
    }
    if (requireDigest) {
      const digest = (file as T & { readonly digest?: unknown }).digest;
      if (typeof digest !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(digest)) {
        fail(`${label} content digest is invalid: ${file.path}`);
      }
    }
    result.set(file.path, file);
    caseFolded.add(folded);
  }
  return result;
}

/** Independently inspects the gzip and USTAR bytes npm produced before any install. */
export function inspectNpmPackageTarball(
  tarball: Buffer,
  packed: PackedResult,
  expectedFiles: readonly ExpectedPackageFile[],
): PackageTarballInspection {
  if (packed.name !== 'cortexel') fail('npm pack artifact name is not Cortexel');
  if (packed.size !== tarball.byteLength) fail('npm pack size differs from package tarball bytes');
  if (packed.entryCount !== packed.files.length) fail('npm pack entryCount differs from its file list');
  if (packed.integrity !== sha512Integrity(tarball)) fail('npm pack integrity differs from tarball bytes');
  if (packed.shasum !== createHash('sha1').update(tarball).digest('hex')) {
    fail('npm pack legacy shasum differs from tarball bytes');
  }
  if (packed.filename !== `cortexel-${packed.version}.tgz`) {
    fail('npm pack filename differs from the package identity');
  }

  const npmFiles = artifactFileMap(packed.files, 'npm pack inventory', false);
  const expected = artifactFileMap(expectedFiles, 'expected package closure', true);
  if (npmFiles.size !== expected.size) fail('npm pack inventory differs from expected package closure');
  let expectedFileBytes = 0;
  for (const [path, file] of expected) {
    const npmFile = npmFiles.get(path);
    if (npmFile === undefined || npmFile.size !== file.size || npmFile.mode !== file.mode) {
      fail(`npm pack inventory differs from expected package file: ${path}`);
    }
    expectedFileBytes += file.size;
    if (expectedFileBytes > PACKAGE_TARBALL_LIMITS.uncompressedBytes) {
      fail('expected package closure exceeds its byte bound');
    }
  }
  if (packed.unpackedSize !== expectedFileBytes) {
    fail('npm pack unpackedSize differs from expected package closure');
  }

  const tar = gunzipSinglePackageMember(tarball);
  if (tar.byteLength % 512 !== 0) fail('package tar byte length is not block-aligned');
  const seen = new Set<string>();
  const seenFolded = new Set<string>();
  const inspected: ExpectedPackageFile[] = [];
  let offset = 0;
  let fileBytes = 0;
  while (true) {
    if (offset + 512 > tar.byteLength) fail('package tar is truncated before its end marker');
    const header = tar.subarray(offset, offset + 512);
    if (allZero(header)) {
      const trailing = tar.subarray(offset);
      if (trailing.byteLength !== 1024 || !allZero(trailing)) {
        fail('package tar has an ambiguous end marker or trailing bytes');
      }
      break;
    }
    if (inspected.length >= PACKAGE_TARBALL_LIMITS.entries) {
      fail('package tar entry count exceeds its bound');
    }
    const storedChecksum = parseCanonicalTarOctal(header.subarray(148, 156), 6, 'tar checksum');
    let observedChecksum = 0;
    for (let index = 0; index < header.length; index++) {
      observedChecksum += index >= 148 && index < 156 ? 0x20 : header[index]!;
    }
    if (observedChecksum !== storedChecksum) fail('package tar header checksum mismatch');
    if (!header.subarray(257, 263).equals(Buffer.from('ustar\0', 'ascii')) ||
        !header.subarray(263, 265).equals(Buffer.from('00', 'ascii'))) {
      fail('package tar entry is not canonical USTAR');
    }
    assertZeroField(header.subarray(108, 116), 'tar uid');
    assertZeroField(header.subarray(116, 124), 'tar gid');
    assertZeroField(header.subarray(157, 257), 'tar link name');
    assertZeroField(header.subarray(265, 329), 'tar owner/group names');
    if (!header.subarray(329, 337).equals(Buffer.from('000000 \0', 'ascii')) ||
        !header.subarray(337, 345).equals(Buffer.from('000000 \0', 'ascii'))) {
      fail('package tar device fields are not canonical zero values');
    }
    assertZeroField(header.subarray(345, 500), 'tar path prefix');
    assertZeroField(header.subarray(500, 512), 'tar header padding');
    if (header[156] !== 0x30) {
      fail('package tar contains a non-regular or extension entry');
    }
    const tarPath = parseCanonicalTarName(header.subarray(0, 100));
    if (!tarPath.startsWith('package/')) fail('package tar path lacks the package/ root');
    const path = tarPath.slice('package/'.length);
    assertCanonicalArtifactPath(path, 'package tar path');
    const folded = path.toLowerCase();
    if (seen.has(path) || seenFolded.has(folded)) {
      fail(`package tar contains a duplicate semantic path: ${path}`);
    }
    const mode = parseCanonicalTarOctal(header.subarray(100, 108), 6, 'tar mode');
    const size = parseCanonicalTarOctal(header.subarray(124, 136), 10, 'tar size');
    const mtime = parseCanonicalTarOctal(header.subarray(136, 148), 10, 'tar mtime');
    if (mtime !== NPM_PORTABLE_MTIME_SECONDS) fail(`package tar mtime is not portable: ${path}`);
    if (size > PACKAGE_TARBALL_LIMITS.fileBytes) fail(`package tar file exceeds its bound: ${path}`);
    if (mode !== expectedArtifactMode(path)) fail(`package tar file mode is invalid: ${path}`);
    const dataOffset = offset + 512;
    const paddedSize = Math.ceil(size / 512) * 512;
    const nextOffset = dataOffset + paddedSize;
    if (!Number.isSafeInteger(nextOffset) || nextOffset > tar.byteLength) {
      fail(`package tar file is truncated: ${path}`);
    }
    const content = tar.subarray(dataOffset, dataOffset + size);
    if (!allZero(tar.subarray(dataOffset + size, nextOffset))) {
      fail(`package tar file has nonzero padding: ${path}`);
    }
    const npmFile = npmFiles.get(path);
    const expectedFile = expected.get(path);
    if (npmFile === undefined || npmFile.size !== size || npmFile.mode !== mode) {
      fail(`package tar entry differs from npm pack inventory: ${path}`);
    }
    const digest = sha256(content);
    if (expectedFile === undefined || expectedFile.size !== size ||
        expectedFile.mode !== mode || expectedFile.digest !== digest) {
      fail(`package tar entry differs from expected package content: ${path}`);
    }
    inspected.push({ path, size, mode, digest });
    fileBytes += size;
    seen.add(path);
    seenFolded.add(folded);
    offset = nextOffset;
  }
  if (inspected.length === 0 || inspected.length !== npmFiles.size || fileBytes !== expectedFileBytes) {
    fail('package tar file closure is incomplete');
  }
  inspected.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return {
    compressedBytes: tarball.byteLength,
    uncompressedBytes: tar.byteLength,
    fileBytes,
    entryCount: inspected.length,
    treeDigest: sha256(canonicalize(inspected)),
  };
}

function sourceDigest(path: string): string {
  const stats = lstatSync(path);
  return digestRegularFileStable(path, stats.size, 'package-smoke JSON source', MAX_JSON_BYTES)
    .slice('sha256:'.length);
}

function canonicalJsonSourceDigest(path: string, label: string): string {
  return createHash('sha256')
    .update(canonicalize(readStrictJson(path, label)))
    .digest('hex');
}

function exactJsonEqual(left: unknown, right: unknown): boolean {
  return canonicalize(left) === canonicalize(right);
}

function expectRecord(value: JsonValue | undefined, label: string): Record<string, JsonValue> {
  if (!isRecord(value)) fail(`${label} must be an object`);
  return value;
}

function expectString(value: JsonValue | undefined, label: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`);
  return value;
}

function expectInteger(value: JsonValue | undefined, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    fail(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function assertSri512(value: string, label: string): void {
  if (!value.startsWith('sha512-')) fail(`${label} must use SHA-512 SRI`);
  const encoded = value.slice('sha512-'.length);
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.byteLength !== 64 || decoded.toString('base64') !== encoded) {
    fail(`${label} is not a canonical SHA-512 SRI value`);
  }
}

function isCanonicalPackageName(name: string): boolean {
  const bare = '[A-Za-z0-9][A-Za-z0-9._~-]*';
  return new RegExp(`^(?:${bare}|@${bare}/${bare})$`, 'u').test(name);
}

function isCanonicalLockPackagePath(path: string): boolean {
  if (path.includes('\\') || path === '' || path !== path.split('/').join('/')) return false;
  const segments = path.split('/');
  let index = 0;
  while (index < segments.length) {
    if (segments[index] !== 'node_modules') return false;
    index++;
    const first = segments[index];
    if (first === undefined) return false;
    if (first.startsWith('@')) {
      const second = segments[index + 1];
      if (second === undefined || !isCanonicalPackageName(`${first}/${second}`)) return false;
      index += 2;
    } else {
      if (!isCanonicalPackageName(first)) return false;
      index++;
    }
  }
  return true;
}

function dependencyLockCandidates(parentPath: string, dependency: string): string[] {
  const candidates: string[] = [];
  let ancestor = parentPath;
  while (ancestor !== '') {
    candidates.push(`${ancestor}/node_modules/${dependency}`);
    const marker = ancestor.lastIndexOf('/node_modules/');
    ancestor = marker === -1 ? '' : ancestor.slice(0, marker);
  }
  candidates.push(`node_modules/${dependency}`);
  return [...new Set(candidates)];
}

/** The fixture lock is executable policy: every registry artifact is exact and integrity-bound. */
export function validatePackageSmokeFixture(
  manifestValue: JsonValue,
  lockValue: JsonValue,
  cortexelPackageValue: JsonValue,
): void {
  const manifest = expectRecord(manifestValue, 'fixture package.json');
  exactKeys(
    manifest,
    [
      'name',
      'version',
      'private',
      'type',
      'dependencies',
      'devDependencies',
      'optionalDependencies',
    ],
    'fixture package.json',
  );
  if (
    manifest.name !== 'cortexel-package-smoke-fixture' ||
    manifest.version !== '1.0.0' ||
    manifest.private !== true ||
    manifest.type !== 'module'
  ) {
    fail('fixture package.json identity is invalid');
  }
  const dependencies = expectRecord(manifest.dependencies, 'fixture dependencies');
  if (!exactJsonEqual(dependencies, { cortexel: `file:${LOCAL_TARBALL_FILENAME}` })) {
    fail('fixture must have only the local Cortexel tarball as a normal dependency');
  }
  const devDependencies = expectRecord(manifest.devDependencies, 'fixture devDependencies');
  if (!exactJsonEqual(devDependencies, EXPECTED_DEV_DEPENDENCIES)) {
    fail('fixture devDependencies must be exact reviewed versions');
  }
  const optionalDependencies = expectRecord(
    manifest.optionalDependencies,
    'fixture optionalDependencies',
  );
  if (!exactJsonEqual(optionalDependencies, EXPECTED_OPTIONAL_DEPENDENCIES)) {
    fail('fixture optionalDependencies must be exact reviewed versions');
  }

  const lock = expectRecord(lockValue, 'fixture package-lock.json');
  exactKeys(
    lock,
    ['name', 'version', 'lockfileVersion', 'requires', 'packages'],
    'fixture package-lock.json',
  );
  if (
    lock.name !== manifest.name ||
    lock.version !== manifest.version ||
    lock.lockfileVersion !== 3 ||
    lock.requires !== true
  ) {
    fail('fixture package-lock.json header is invalid');
  }
  const packages = expectRecord(lock.packages, 'fixture lock packages');
  if (Object.keys(packages).length > 10_000) fail('fixture lock package count exceeds its budget');
  const lockRoot = expectRecord(packages[''], 'fixture lock root');
  exactKeys(
    lockRoot,
    ['name', 'version', 'dependencies', 'devDependencies', 'optionalDependencies'],
    'fixture lock root',
  );
  if (
    lockRoot.name !== manifest.name ||
    lockRoot.version !== manifest.version ||
    !exactJsonEqual(lockRoot.dependencies, dependencies) ||
    !exactJsonEqual(lockRoot.devDependencies, devDependencies) ||
    !exactJsonEqual(lockRoot.optionalDependencies, optionalDependencies)
  ) {
    fail('fixture lock root differs from package.json');
  }

  const sourcePackage = expectRecord(cortexelPackageValue, 'Cortexel package.json');
  const lockedCortexel = expectRecord(packages['node_modules/cortexel'], 'locked Cortexel package');
  if (Object.hasOwn(lockedCortexel, 'integrity')) {
    fail('the mutable local artifact integrity belongs in prepared state, not the committed lock');
  }
  exactKeys(
    lockedCortexel,
    [
      'version',
      'resolved',
      'license',
      'dependencies',
      'bin',
      'engines',
      'peerDependencies',
      'peerDependenciesMeta',
    ],
    'locked Cortexel package',
  );
  if (lockedCortexel.resolved !== `file:${LOCAL_TARBALL_FILENAME}`) {
    fail('Cortexel fixture dependency must resolve only from the local tarball');
  }
  for (const key of [
    'version',
    'license',
    'dependencies',
    'engines',
    'peerDependencies',
    'peerDependenciesMeta',
  ] as const) {
    if (!exactJsonEqual(lockedCortexel[key], sourcePackage[key])) {
      fail(`fixture lock Cortexel metadata is stale at ${key}`);
    }
  }
  const sourceBin = expectRecord(sourcePackage.bin, 'Cortexel package bin');
  const normalizedSourceBin = Object.fromEntries(
    Object.entries(sourceBin).map(([name, path]) => [
      name,
      typeof path === 'string' ? path.replace(/^\.\//u, '') : path,
    ]),
  );
  if (!exactJsonEqual(lockedCortexel.bin, normalizedSourceBin)) {
    fail('fixture lock Cortexel metadata is stale at bin');
  }

  for (const [path, candidate] of Object.entries(packages)) {
    if (path === '' || path === 'node_modules/cortexel') continue;
    if (!isCanonicalLockPackagePath(path)) fail(`fixture lock has an unsafe package path ${path}`);
    const record = expectRecord(candidate, `fixture lock package ${path}`);
    if (
      record.link === true ||
      record.inBundle === true ||
      record.bundled === true ||
      record.hasInstallScript === true
    ) {
      fail(`fixture lock package ${path} uses an unreviewed script, bundle, or link`);
    }
    const version = expectString(record.version, `fixture lock package ${path} version`);
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
      fail(`fixture lock package ${path} does not have an exact version`);
    }
    const resolved = expectString(record.resolved, `fixture lock package ${path} resolved`);
    if (!resolved.startsWith('https://registry.npmjs.org/')) {
      fail(`fixture lock package ${path} is not pinned to the reviewed npm registry`);
    }
    assertSri512(expectString(record.integrity, `fixture lock package ${path} integrity`), path);
  }

  for (const [path, candidate] of Object.entries(packages)) {
    const record = expectRecord(candidate, `fixture lock package ${path || '<root>'}`);
    for (const field of ['dependencies', 'optionalDependencies'] as const) {
      if (record[field] === undefined) continue;
      const dependencyMap = expectRecord(record[field], `fixture lock ${path || '<root>'} ${field}`);
      for (const dependency of Object.keys(dependencyMap)) {
        if (!isCanonicalPackageName(dependency)) {
          fail(`fixture lock ${path || '<root>'} has an unsafe dependency name ${dependency}`);
        }
        if (!dependencyLockCandidates(path, dependency).some((entry) => packages[entry] !== undefined)) {
          fail(`fixture lock ${path || '<root>'} has an unresolved ${field} edge to ${dependency}`);
        }
      }
    }
  }
}

function validateFixtureSources(): {
  readonly manifest: JsonValue;
  readonly manifestRaw: Buffer;
  readonly lock: JsonValue;
  readonly packageJson: JsonValue;
} {
  const manifestRaw = readRegularFileStable(
    fixtureManifestPath,
    undefined,
    'package-smoke fixture manifest',
    MAX_JSON_BYTES,
  );
  const manifest = strictJson(
    decodeUtf8Fatal(manifestRaw, 'package-smoke fixture manifest'),
    'package-smoke fixture manifest',
  );
  if (createHash('sha256').update(canonicalize(manifest)).digest('hex') !==
      EXPECTED_FIXTURE_MANIFEST_SHA256) {
    fail('package-smoke fixture manifest digest mismatch');
  }
  const lockRaw = readRegularFileStable(
    fixtureLockPath,
    undefined,
    'package-smoke fixture lock',
    MAX_JSON_BYTES,
  );
  const lock = strictJson(
    decodeUtf8Fatal(lockRaw, 'package-smoke fixture lock'),
    'package-smoke fixture lock',
  );
  if (createHash('sha256').update(canonicalize(lock)).digest('hex') !==
      EXPECTED_FIXTURE_LOCK_SHA256) {
    fail('package-smoke fixture lock digest mismatch');
  }
  const packageJson = readStrictJson(join(root, 'package.json'), 'Cortexel package.json');
  validatePackageSmokeFixture(manifest, lock, packageJson);
  return { manifest, manifestRaw, lock, packageJson };
}

function isInside(parent: string, candidate: string): boolean {
  const rel = relative(parent, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

export function readDirectoryNamesBounded(
  directoryPath: string,
  label: string,
  maximumEntries: number = PACKAGE_TARBALL_LIMITS.directoryEntries,
): string[] {
  if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 0 ||
      maximumEntries > MAX_TREE_ENTRIES) {
    fail(`${label} has an invalid directory-entry budget`);
  }
  const directory = opendirSync(directoryPath);
  const names: string[] = [];
  try {
    let child = directory.readSync();
    while (child !== null) {
      if (names.length >= maximumEntries) fail(`${label} exceeds its child-entry budget`);
      names.push(child.name);
      child = directory.readSync();
    }
  } finally {
    directory.closeSync();
  }
  return names;
}

function resolveExecutable(explicit: string | undefined, command: string, label: string): string {
  let candidate: string | undefined;
  if (explicit !== undefined) {
    if (!isAbsolute(explicit)) fail(`${label} must be an absolute path`);
    candidate = explicit;
  } else {
    const pathValue = process.env.PATH ?? '';
    const extensions = process.platform === 'win32'
      ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';')
      : [''];
    outer: for (const directory of pathValue.split(delimiter)) {
      if (!directory) continue;
      for (const extension of extensions) {
        const possible = join(directory, `${command}${extension.toLowerCase()}`);
        try {
          accessSync(possible, fsConstants.X_OK);
          candidate = possible;
          break outer;
        } catch {
          // Continue through the finite PATH search.
        }
      }
    }
  }
  if (candidate === undefined) fail(`${label} was not found`);
  const canonical = realpathSync(candidate);
  const stats = statSync(canonical);
  if (!stats.isFile()) fail(`${label} must resolve to a regular file`);
  if (process.platform !== 'win32') accessSync(canonical, fsConstants.X_OK);
  return canonical;
}

function resolveNpmCli(explicit: string | undefined): string {
  const resolved = resolveExecutable(explicit, 'npm', 'npm executable');
  if (basename(resolved) === 'npm-cli.js' && basename(dirname(resolved)) === 'bin') return resolved;
  fail('npm executable must resolve to the exact npm-cli.js entry point');
}

export function scrubbedEnvironment(
  nodeExecutable: string,
  source: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): NodeJS.ProcessEnv {
  if (!isAbsolute(nodeExecutable)) fail('reviewed Node environment path must be absolute');
  const environment: NodeJS.ProcessEnv = {};
  const inherited = new Map<string, string | undefined>();
  let systemRoot: string | undefined;
  if (platform === 'win32') {
    for (const [key, value] of Object.entries(source)) {
      const folded = key.toUpperCase();
      if (inherited.has(folded)) {
        fail(`Windows environment has a case-folded key collision at ${folded}`);
      }
      inherited.set(folded, value);
    }
    const declaredRoots = ['SYSTEMROOT', 'WINDIR']
      .map((name) => inherited.get(name))
      .filter((value): value is string => value !== undefined);
    if (declaredRoots.length === 0) {
      fail('Windows environment must declare one reviewed system root');
    }
    const normalizedRoots = declaredRoots.map((value) => {
      if (value.includes('\0') || !windowsPath.isAbsolute(value) || windowsPath.normalize(value) !== value) {
        fail('Windows system root must be one normalized absolute path');
      }
      return value;
    });
    systemRoot = normalizedRoots[0]!;
    if (normalizedRoots.some((value) => value.toUpperCase() !== systemRoot!.toUpperCase())) {
      fail('Windows SYSTEMROOT and WINDIR authorities disagree');
    }
    environment.SYSTEMROOT = systemRoot;
    environment.WINDIR = systemRoot;
  }
  const fixedSystemPaths = platform === 'win32'
    ? [systemRoot === undefined ? undefined : windowsPath.join(systemRoot, 'System32'), systemRoot]
    : ['/usr/bin', '/bin'];
  environment.PATH = fixedSystemPaths
    .filter((value): value is string => value !== undefined)
    .join(platform === 'win32' ? ';' : ':');
  environment.LANG = 'C';
  environment.LC_ALL = 'C';
  environment.NO_COLOR = '1';
  environment.TZ = 'UTC';
  return environment;
}

interface PackageSmokeOperationalPaths {
  readonly root: string;
  readonly home: string;
  readonly temporary: string;
  readonly npmCache: string;
  readonly executeDenied: string;
}

function packageSmokeOperationalPaths(workspace: string): PackageSmokeOperationalPaths {
  const operationalRoot = join(workspace, 'operational');
  return {
    root: operationalRoot,
    home: join(operationalRoot, 'home'),
    temporary: join(operationalRoot, 'tmp'),
    npmCache: join(operationalRoot, 'npm-cache'),
    executeDenied: join(operationalRoot, 'execute-denied'),
  };
}

function createPackageSmokeOperationalDirectories(workspace: string): void {
  const paths = packageSmokeOperationalPaths(workspace);
  mkdirSync(paths.root, { mode: 0o700 });
  for (const path of [paths.home, paths.temporary, paths.npmCache]) {
    mkdirSync(path, { mode: 0o700 });
  }
  writeFileSync(paths.executeDenied, 'not-a-directory\n', { flag: 'wx', mode: 0o444 });
}

function assertPackageSmokeOperationalDirectories(workspace: string): void {
  const paths = packageSmokeOperationalPaths(workspace);
  for (const path of [paths.root, paths.home, paths.temporary, paths.npmCache]) {
    const stats = lstatSync(path);
    if (!stats.isDirectory() || stats.isSymbolicLink() || realpathSync(path) !== path) {
      fail(`package-smoke operational path is not a canonical real directory: ${path}`);
    }
    if (!isInside(workspace, path)) fail('package-smoke operational path escapes the workspace');
  }
  const deniedStats = lstatSync(paths.executeDenied);
  if (!deniedStats.isFile() || deniedStats.isSymbolicLink() || deniedStats.nlink !== 1) {
    fail('package-smoke execute-denied anchor is not a unique regular file');
  }
  const deniedBytes = readRegularFileStable(
    paths.executeDenied,
    deniedStats.size,
    'package-smoke execute-denied anchor',
    64,
  );
  if (!deniedBytes.equals(Buffer.from('not-a-directory\n'))) {
    fail('package-smoke execute-denied anchor bytes changed');
  }
}

export function packageSmokeEnvironment(
  nodeExecutable: string,
  workspace: string,
  source: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  phase: SmokePhase = 'prepare',
): NodeJS.ProcessEnv {
  if (!isAbsolute(workspace)) fail('package-smoke environment workspace must be absolute');
  const environment = scrubbedEnvironment(nodeExecutable, source, platform);
  const paths = packageSmokeOperationalPaths(workspace);
  const home = phase === 'prepare' ? paths.home : join(paths.executeDenied, 'home');
  const temporary = phase === 'prepare' ? paths.temporary : join(paths.executeDenied, 'tmp');
  const npmCache = phase === 'prepare' ? paths.npmCache : join(paths.executeDenied, 'npm-cache');
  environment.HOME = home;
  environment.TMPDIR = temporary;
  environment.TMP = temporary;
  environment.TEMP = temporary;
  environment.npm_config_cache = npmCache;
  environment.npm_config_strict_ssl = 'true';
  environment.npm_config_registry = 'https://registry.npmjs.org/';
  // Ambient CA files and system-CA opt-ins are authority-bearing mutable paths;
  // omitting all of them leaves the reviewed Node default CA set in force.
  return environment;
}

function executableVersion(executable: string, label: string): string {
  const value = run(executable, ['--version'], root);
  if (!/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value)) {
    fail(`${label} returned an invalid version`);
  }
  return value;
}

function nodeCliVersion(nodeExecutable: string, cli: string, label: string): string {
  const value = runNpmCommand(nodeExecutable, cli, ['--version'], root);
  if (!/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value)) {
    fail(`${label} returned an invalid version`);
  }
  return value;
}

function runNpmCommand(
  nodeExecutable: string,
  npmExecutable: string,
  args: string[],
  cwd: string,
): string {
  const expected = commandRuntimeAuthority;
  if (expected === undefined) fail('npm command runtime authority is not initialized');
  if (expected.node.executable !== nodeExecutable || expected.npm.cli !== npmExecutable) {
    fail('npm command differs from its reviewed runtime authority');
  }
  const assertNpm = (phase: string): void => {
    const observed = inspectNpmPackageAuthority(npmExecutable);
    if (!exactJsonEqual(observed, expected.npm)) {
      fail(`${phase} npm package authority changed`);
    }
  };
  assertNpm('pre-command');
  try {
    return run(nodeExecutable, [npmExecutable, ...args], cwd);
  } finally {
    assertNpm('post-command');
  }
}

function assertSupportedNodeVersion(version: string): void {
  const major = Number.parseInt(version.replace(/^v/u, '').split('.')[0] ?? '', 10);
  if (!SUPPORTED_NODE_MAJORS.has(major)) {
    fail(`package smoke requires Node 22, 24, or 26; received ${version}`);
  }
}

function assertEmptyWorkspace(workspace: string): void {
  if (!isAbsolute(workspace)) fail('workspace must be an absolute path');
  if (existsSync(workspace)) {
    const stats = lstatSync(workspace);
    if (!stats.isDirectory() || stats.isSymbolicLink()) fail('workspace must be a real directory');
    if (readDirectoryNamesBounded(workspace, 'package-smoke workspace', 1).length !== 0) {
      fail('workspace must be absent or empty');
    }
  } else {
    mkdirSync(workspace, { recursive: true, mode: 0o755 });
  }
  const canonical = realpathSync(workspace);
  if (canonical !== workspace) fail('workspace must already be canonical');
}

function canonicalWorkspacePath(candidate: string): string {
  const absolute = resolve(candidate);
  if (existsSync(absolute)) return realpathSync(absolute);
  return join(realpathSync(dirname(absolute)), basename(absolute));
}

function normalizePackResult(value: JsonValue, tarball: Buffer): PackedResult {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    fail('npm pack did not return exactly one package record');
  }
  const record = value[0];
  exactKeys(
    record,
    [
      'id',
      'name',
      'version',
      'size',
      'unpackedSize',
      'shasum',
      'integrity',
      'filename',
      'files',
      'entryCount',
      'bundled',
    ],
    'npm pack record',
  );
  const filesValue = record.files;
  if (!Array.isArray(filesValue) || filesValue.length === 0 ||
      filesValue.length > PACKAGE_TARBALL_LIMITS.entries) {
    fail('npm pack returned an invalid file inventory');
  }
  const files: PackedFile[] = [];
  const seen = new Set<string>();
  for (const [index, candidate] of filesValue.entries()) {
    const file = expectRecord(candidate, `npm pack file ${index}`);
    exactKeys(file, ['path', 'size', 'mode'], `npm pack file ${index}`);
    const path = expectString(file.path, `npm pack file ${index} path`);
    assertCanonicalArtifactPath(path, `npm pack file ${index} path`);
    if (
      seen.has(path)
    ) {
      fail(`npm pack returned an unsafe or duplicate path ${path}`);
    }
    seen.add(path);
    files.push({
      path,
      size: expectInteger(file.size, `npm pack file ${path} size`),
      mode: expectInteger(file.mode, `npm pack file ${path} mode`),
    });
  }
  const integrity = expectString(record.integrity, 'npm pack integrity');
  assertSri512(integrity, 'npm pack integrity');
  if (integrity !== sha512Integrity(tarball)) fail('npm pack integrity differs from the tarball bytes');
  const name = expectString(record.name, 'npm pack name');
  const version = expectString(record.version, 'npm pack version');
  const size = expectInteger(record.size, 'npm pack size');
  const unpackedSize = expectInteger(record.unpackedSize, 'npm pack unpacked size');
  const entryCount = expectInteger(record.entryCount, 'npm pack entry count');
  const shasum = expectString(record.shasum, 'npm pack shasum');
  const filename = expectString(record.filename, 'npm pack filename');
  if (record.id !== `${name}@${version}` || size !== tarball.byteLength ||
      entryCount !== files.length || !Array.isArray(record.bundled) || record.bundled.length !== 0 ||
      !/^[0-9a-f]{40}$/u.test(shasum) || filename !== `cortexel-${version}.tgz`) {
    fail('npm pack metadata is internally inconsistent');
  }
  return {
    name,
    version,
    size,
    unpackedSize,
    shasum,
    integrity,
    filename,
    files,
    entryCount,
  };
}

function writeCanonicalJson(path: string, value: unknown, mode = 0o644): string {
  const raw = `${canonicalize(value)}\n`;
  writeFileSync(path, raw, { encoding: 'utf8', flag: 'wx', mode });
  return raw;
}

interface PackageSmokeStateReservation {
  readonly path: string;
  readonly descriptor: number;
  readonly initial: BigIntStats;
  closed: boolean;
}

function samePinnedFileIdentity(initial: BigIntStats, observed: BigIntStats): boolean {
  return (
    initial.dev === observed.dev &&
    initial.ino === observed.ino &&
    initial.nlink === observed.nlink &&
    initial.uid === observed.uid &&
    initial.gid === observed.gid &&
    initial.birthtimeNs === observed.birthtimeNs
  );
}

function assertPinnedStateFile(
  reservation: PackageSmokeStateReservation,
  expectedSize: number,
  expectedMode: 0o444 | 0o600,
  label: string,
): void {
  if (reservation.closed) fail(`${label} descriptor is already closed`);
  if (realpathSync(reservation.path) !== reservation.path) {
    fail(`${label} path is no longer canonical and physical`);
  }
  const before = fstatSync(reservation.descriptor, { bigint: true });
  const pathStats = lstatSync(reservation.path, { bigint: true });
  const after = fstatSync(reservation.descriptor, { bigint: true });
  if (
    !before.isFile() || before.isSymbolicLink() || before.nlink !== 1n ||
    !pathStats.isFile() || pathStats.isSymbolicLink() || pathStats.nlink !== 1n ||
    !sameRuntimeStat(before, pathStats) || !sameRuntimeStat(before, after) ||
    !samePinnedFileIdentity(reservation.initial, before) ||
    before.size !== BigInt(expectedSize) || Number(before.mode & 0o7777n) !== expectedMode
  ) {
    fail(`${label} descriptor or pathname authority changed`);
  }
}

function fsyncDirectoryStable(path: string, label: string): void {
  if (realpathSync(path) !== path) fail(`${label} must be one canonical physical directory`);
  const initial = lstatSync(path, { bigint: true });
  if (!initial.isDirectory() || initial.isSymbolicLink()) {
    fail(`${label} must be one physical directory`);
  }
  const descriptor = openSync(
    path,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
  );
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isDirectory() || !sameRuntimeStat(initial, opened)) {
      fail(`${label} changed before its directory entry could be synchronized`);
    }
    fsyncSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const rebound = lstatSync(path, { bigint: true });
    if (!sameRuntimeStat(opened, after) || !sameRuntimeStat(opened, rebound)) {
      fail(`${label} changed while its directory entry was synchronized`);
    }
  } finally {
    closeSync(descriptor);
  }
}

export function reservePackageSmokeStateFile(workspace: string): PackageSmokeStateReservation {
  if (process.platform === 'win32') {
    fail('package-smoke state reservation currently requires POSIX descriptor semantics');
  }
  if (!isAbsolute(workspace) || realpathSync(workspace) !== workspace) {
    fail('package-smoke state workspace must be one canonical physical absolute directory');
  }
  const statePath = join(workspace, STATE_FILENAME);
  const descriptor = openSync(
    statePath,
    fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    fchmodSync(descriptor, 0o600);
    const initial = fstatSync(descriptor, { bigint: true });
    const reservation: PackageSmokeStateReservation = {
      path: statePath,
      descriptor,
      initial,
      closed: false,
    };
    assertPinnedStateFile(reservation, 0, 0o600, 'reserved package-smoke state');
    fsyncSync(descriptor);
    fsyncDirectoryStable(workspace, 'package-smoke state parent');
    assertPinnedStateFile(reservation, 0, 0o600, 'reserved package-smoke state');
    return reservation;
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

export function publishPackageSmokeStateFile(
  reservation: PackageSmokeStateReservation,
  value: unknown,
): string {
  const raw = `${canonicalize(value)}\n`;
  const intended = Buffer.from(raw, 'utf8');
  if (intended.byteLength < 1 || intended.byteLength > MAX_JSON_BYTES) {
    fail('canonical package-smoke state exceeds its byte budget');
  }
  assertPinnedStateFile(reservation, 0, 0o444, 'reserved package-smoke state');
  let offset = 0;
  while (offset < intended.byteLength) {
    const written = writeSync(
      reservation.descriptor,
      intended,
      offset,
      intended.byteLength - offset,
      offset,
    );
    if (written <= 0) fail('canonical package-smoke state ended before publication completed');
    offset += written;
  }
  fchmodSync(reservation.descriptor, 0o444);
  fsyncSync(reservation.descriptor);
  assertPinnedStateFile(
    reservation,
    intended.byteLength,
    0o444,
    'published package-smoke state',
  );
  const observed = Buffer.allocUnsafe(intended.byteLength);
  offset = 0;
  while (offset < observed.byteLength) {
    const count = readSync(
      reservation.descriptor,
      observed,
      offset,
      observed.byteLength - offset,
      offset,
    );
    if (count <= 0) fail('published package-smoke state ended before its declared size');
    offset += count;
  }
  if (!observed.equals(intended)) fail('published package-smoke state bytes differ from intent');
  readExactIntentFile(
    reservation.path,
    intended,
    0o444,
    'published package-smoke state',
  );
  fsyncDirectoryStable(dirname(reservation.path), 'package-smoke state parent');
  assertPinnedStateFile(
    reservation,
    intended.byteLength,
    0o444,
    'published package-smoke state',
  );
  return raw;
}

export function closePackageSmokeStateFile(reservation: PackageSmokeStateReservation): void {
  if (reservation.closed) return;
  closeSync(reservation.descriptor);
  reservation.closed = true;
}

export function inspectPreparedStateFileAuthority(
  workspace: string,
  expectedStateDigest: string,
): RuntimeFileAuthority {
  const statePath = join(workspace, STATE_FILENAME);
  const authority = inspectRuntimeRegularFile(
    statePath,
    MAX_JSON_BYTES,
    'prepared package-smoke state authority',
  );
  const workspaceStats = lstatSync(workspace, { bigint: true });
  if (
    authority.mode !== 0o444 ||
    authority.uid !== portableUnsignedBigInt(workspaceStats.uid, 'workspace root uid') ||
    authority.gid !== portableUnsignedBigInt(workspaceStats.gid, 'workspace root gid')
  ) {
    fail('prepared package-smoke state must retain exact 0444 workspace-owner authority');
  }
  if (authority.sha256 !== expectedStateDigest) {
    fail('prepared-state authority digest differs from the prepare output');
  }
  return authority;
}

function assertPreparedStateFileAuthority(
  workspace: string,
  expectedStateDigest: string,
  expectedAuthority: RuntimeFileAuthority,
  label: string,
): void {
  const observed = inspectPreparedStateFileAuthority(workspace, expectedStateDigest);
  if (!exactJsonEqual(observed, expectedAuthority)) {
    fail(`${label} prepared-state file authority changed`);
  }
}

function readRegularFileStable(
  path: string,
  expectedSize: number | undefined,
  label = 'workspace file',
  maxBytes = MAX_WORKSPACE_FILE_BYTES,
): Buffer {
  const pathBefore = lstatSync(path);
  if (!pathBefore.isFile()) fail(`${label} must be a regular file`);
  if (pathBefore.nlink !== 1) fail(`${label} must not be hard-linked`);
  if (expectedSize !== undefined && pathBefore.size !== expectedSize) {
    fail(`${label} changed before it could be read`);
  }
  if (pathBefore.size > maxBytes) fail(`${label} exceeds its byte budget`);
  const noFollow = process.platform === 'win32' ? 0 : fsConstants.O_NOFOLLOW;
  const descriptor = openSync(path, fsConstants.O_RDONLY | noFollow);
  try {
    const before = fstatSync(descriptor);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.dev !== pathBefore.dev ||
      before.ino !== pathBefore.ino ||
      before.size !== pathBefore.size ||
      before.mode !== pathBefore.mode ||
      before.nlink !== pathBefore.nlink ||
      before.uid !== pathBefore.uid ||
      before.gid !== pathBefore.gid ||
      before.birthtimeMs !== pathBefore.birthtimeMs
    ) {
      fail(`${label} changed before it could be read`);
    }
    const raw = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    const pathAfter = lstatSync(path);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      before.mode !== after.mode ||
      before.nlink !== after.nlink ||
      before.uid !== after.uid ||
      before.gid !== after.gid ||
      before.birthtimeMs !== after.birthtimeMs ||
      raw.byteLength !== before.size ||
      !pathAfter.isFile() ||
      pathAfter.nlink !== 1 ||
      pathAfter.dev !== before.dev ||
      pathAfter.ino !== before.ino ||
      pathAfter.size !== before.size ||
      pathAfter.mtimeMs !== before.mtimeMs ||
      pathAfter.ctimeMs !== before.ctimeMs ||
      pathAfter.mode !== before.mode ||
      pathAfter.uid !== before.uid ||
      pathAfter.gid !== before.gid ||
      pathAfter.birthtimeMs !== before.birthtimeMs
    ) {
      fail(`${label} changed while it was being read`);
    }
    return raw;
  } finally {
    closeSync(descriptor);
  }
}

function readExactIntentFile(
  path: string,
  expectedValue: string | Buffer,
  expectedMode: 0o444 | 0o644,
  label: string,
): Buffer {
  if (!isAbsolute(path) || realpathSync(path) !== path) {
    fail(`${label} must be a canonical absolute regular path`);
  }
  const expected = typeof expectedValue === 'string'
    ? Buffer.from(expectedValue, 'utf8')
    : expectedValue;
  if (expected.byteLength > MAX_WORKSPACE_FILE_BYTES) fail(`${label} exceeds its byte budget`);
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
    fail(`${label} must be a unique real regular file`);
  }
  if (process.platform !== 'win32' && (before.mode & 0o7777) !== expectedMode) {
    fail(`${label} mode differs from its exact permission phase`);
  }
  const actual = readRegularFileStable(
    path,
    expected.byteLength,
    label,
    MAX_WORKSPACE_FILE_BYTES,
  );
  const after = lstatSync(path);
  if (
    !after.isFile() || after.isSymbolicLink() || after.nlink !== 1 ||
    after.dev !== before.dev || after.ino !== before.ino || after.mode !== before.mode ||
    after.size !== before.size || after.mtimeMs !== before.mtimeMs ||
    after.ctimeMs !== before.ctimeMs || after.uid !== before.uid || after.gid !== before.gid ||
    after.birthtimeMs !== before.birthtimeMs
  ) {
    fail(`${label} changed across its intent comparison`);
  }
  if (!actual.equals(expected)) fail(`${label} bytes differ from their exact intended value`);
  return actual;
}

export function assertFinalizedHostFile(
  path: string,
  expectedValue: string | Buffer,
  label: string,
): void {
  readExactIntentFile(path, expectedValue, 0o444, label);
}

function digestRegularFileStable(
  path: string,
  expectedSize: number,
  label: string,
  maxBytes: number,
): string {
  const pathBefore = lstatSync(path);
  if (!pathBefore.isFile()) fail(`${label} must be a regular file`);
  if (pathBefore.nlink !== 1) fail(`${label} must not be hard-linked`);
  if (pathBefore.size !== expectedSize) fail(`${label} changed before it could be hashed`);
  if (pathBefore.size > maxBytes) fail(`${label} exceeds its per-file byte budget`);
  const noFollow = process.platform === 'win32' ? 0 : fsConstants.O_NOFOLLOW;
  const descriptor = openSync(path, fsConstants.O_RDONLY | noFollow);
  try {
    const before = fstatSync(descriptor);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.dev !== pathBefore.dev ||
      before.ino !== pathBefore.ino ||
      before.size !== pathBefore.size ||
      before.mode !== pathBefore.mode ||
      before.uid !== pathBefore.uid ||
      before.gid !== pathBefore.gid ||
      before.birthtimeMs !== pathBefore.birthtimeMs
    ) {
      fail(`${label} changed before it could be hashed`);
    }
    const hash = createHash('sha256');
    const chunk = Buffer.allocUnsafe(WORKSPACE_HASH_CHUNK_BYTES);
    let offset = 0;
    while (offset < before.size) {
      const length = Math.min(chunk.byteLength, before.size - offset);
      const count = readSync(descriptor, chunk, 0, length, offset);
      if (count <= 0) fail(`${label} ended before its declared size`);
      hash.update(chunk.subarray(0, count));
      offset += count;
    }
    const after = fstatSync(descriptor);
    const pathAfter = lstatSync(path);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      before.mode !== after.mode ||
      before.nlink !== after.nlink ||
      before.uid !== after.uid ||
      before.gid !== after.gid ||
      before.birthtimeMs !== after.birthtimeMs ||
      !pathAfter.isFile() ||
      pathAfter.nlink !== 1 ||
      pathAfter.dev !== before.dev ||
      pathAfter.ino !== before.ino ||
      pathAfter.size !== before.size ||
      pathAfter.mtimeMs !== before.mtimeMs ||
      pathAfter.ctimeMs !== before.ctimeMs ||
      pathAfter.mode !== before.mode ||
      pathAfter.uid !== before.uid ||
      pathAfter.gid !== before.gid ||
      pathAfter.birthtimeMs !== before.birthtimeMs
    ) {
      fail(`${label} changed while it was being hashed`);
    }
    return `sha256:${hash.digest('hex')}`;
  } finally {
    closeSync(descriptor);
  }
}

function readUtf8RegularFileStable(path: string, label: string, maxBytes: number): string {
  return decodeUtf8Fatal(readRegularFileStable(path, undefined, label, maxBytes), label);
}

function validateNpmAuthorityLimits(limits: NpmAuthorityLimits): void {
  const maxima = NPM_AUTHORITY_LIMITS;
  for (const key of Object.keys(maxima) as Array<keyof NpmAuthorityLimits>) {
    const value = limits[key];
    if (!Number.isSafeInteger(value) || value < 1 || value > maxima[key]) {
      fail(`npm package authority ${key} limit is invalid`);
    }
  }
}

function assertPortableRuntimeSegment(name: string, label: string, limits: NpmAuthorityLimits): void {
  const bytes = Buffer.byteLength(name, 'utf8');
  if (
    name === '' || name === '.' || name === '..' || name.includes('\\') ||
    bytes > limits.segmentBytes ||
    [...name].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 0x20 || code > 0x7e;
    })
  ) {
    fail(`${label} has a nonportable filesystem segment`);
  }
}

function runtimeDirectoryRecord(
  path: string,
  relativePath: string,
  expectedUid: bigint,
  expectedGid: bigint,
  label: string,
  discovered?: BigIntStats,
): Record<string, JsonValue> {
  const stats = lstatSync(path, { bigint: true });
  const mode = stats.mode & 0o7777n;
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    fail(`${label} must be a physical directory`);
  }
  if (discovered !== undefined && !sameRuntimeStat(stats, discovered)) {
    fail(`${label} changed after it was discovered`);
  }
  if ((mode & 0o7022n) !== 0n) {
    fail(`${label} must not carry special or group/world-write mode authority`);
  }
  if (stats.uid !== expectedUid || stats.gid !== expectedGid) {
    fail(`${label} ownership differs from the npm package root`);
  }
  return {
    path: relativePath,
    type: 'directory',
    device: stats.dev.toString(10),
    inode: stats.ino.toString(10),
    mode: Number(mode),
    uid: portableUnsignedBigInt(stats.uid, `${label} uid`),
    gid: portableUnsignedBigInt(stats.gid, `${label} gid`),
    linkCount: portableUnsignedBigInt(stats.nlink, `${label} link count`, 1n),
    mtimeNs: stats.mtimeNs.toString(10),
    ctimeNs: stats.ctimeNs.toString(10),
    birthtimeNs: stats.birthtimeNs.toString(10),
  };
}

function npmTreeOnce(rootPath: string, limits: NpmAuthorityLimits): NpmPackageTreeAuthority {
  if (!isAbsolute(rootPath) || realpathSync(rootPath) !== rootPath) {
    fail('npm package root must be one canonical physical absolute directory');
  }
  const rootInitial = lstatSync(rootPath, { bigint: true });
  if (!rootInitial.isDirectory() || rootInitial.isSymbolicLink()) {
    fail('npm package root must be a physical directory');
  }
  const records: Array<Record<string, JsonValue>> = [
    runtimeDirectoryRecord(
      rootPath,
      '',
      rootInitial.uid,
      rootInitial.gid,
      'npm package root',
      rootInitial,
    ),
  ];
  const pending: Array<{
    readonly absolute: string;
    readonly relative: string;
    readonly depth: number;
    readonly discovered: BigIntStats;
  }> = [
    { absolute: rootPath, relative: '', depth: 0, discovered: rootInitial },
  ];
  let entryCount = 1;
  let directoryCount = 1;
  let fileCount = 0;
  let symlinkCount = 0;
  let byteCount = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    const directoryBefore = lstatSync(current.absolute, { bigint: true });
    if (
      !sameRuntimeStat(directoryBefore, current.discovered) ||
      !directoryBefore.isDirectory() || directoryBefore.isSymbolicLink() ||
      realpathSync(current.absolute) !== current.absolute ||
      !isInside(rootPath, current.absolute)
    ) {
      fail(`npm package directory changed after discovery: ${current.relative || '<root>'}`);
    }
    const names = readDirectoryNamesBounded(
      current.absolute,
      `npm package directory ${current.relative || '<root>'}`,
      limits.directoryEntries,
    ).sort();
    for (const name of names) {
      assertPortableRuntimeSegment(name, 'npm package path', limits);
      const relativePath = current.relative ? `${current.relative}/${name}` : name;
      if (Buffer.byteLength(relativePath, 'utf8') > limits.pathBytes) {
        fail(`npm package path exceeds its byte budget: ${relativePath}`);
      }
      const depth = current.depth + 1;
      if (depth > limits.depth) fail(`npm package path exceeds its depth budget: ${relativePath}`);
      entryCount++;
      if (entryCount > limits.entries) fail('npm package tree exceeds its entry budget');
      const absolutePath = join(current.absolute, name);
      const stats = lstatSync(absolutePath, { bigint: true });
      if (stats.uid !== rootInitial.uid || stats.gid !== rootInitial.gid) {
        fail(`npm package entry ownership differs from its root: ${relativePath}`);
      }
      if (stats.isDirectory() && !stats.isSymbolicLink()) {
        records.push(runtimeDirectoryRecord(
          absolutePath,
          relativePath,
          rootInitial.uid,
          rootInitial.gid,
          `npm package directory ${relativePath}`,
          stats,
        ));
        directoryCount++;
        pending.push({ absolute: absolutePath, relative: relativePath, depth, discovered: stats });
        continue;
      }
      if (stats.isFile() && !stats.isSymbolicLink()) {
        const authority = inspectRuntimeRegularFile(
          absolutePath,
          limits.fileBytes,
          `npm package file ${relativePath}`,
        );
        byteCount += authority.size;
        if (byteCount > limits.totalBytes) fail('npm package tree exceeds its byte budget');
        fileCount++;
        records.push({
          path: relativePath,
          type: 'file',
          sha256: authority.sha256,
          size: authority.size,
          mode: authority.mode,
          uid: authority.uid,
          gid: authority.gid,
          linkCount: authority.linkCount,
          device: authority.device,
          inode: authority.inode,
          mtimeNs: authority.mtimeNs,
          ctimeNs: authority.ctimeNs,
          birthtimeNs: authority.birthtimeNs,
        });
        continue;
      }
      if (stats.isSymbolicLink()) {
        if (stats.nlink !== 1n) fail(`npm package symlink is hard-linked: ${relativePath}`);
        const target = readlinkSync(absolutePath);
        if (
          target.length === 0 || isAbsolute(target) || target.includes('\\') || target.includes('\0') ||
          Buffer.byteLength(target, 'utf8') > limits.symlinkTargetBytes ||
          [...target].some((character) => {
            const code = character.codePointAt(0) ?? 0;
            return code < 0x20 || code > 0x7e;
          })
        ) {
          fail(`npm package symlink target is unsafe: ${relativePath}`);
        }
        const resolvedTarget = resolve(dirname(absolutePath), target);
        if (!isInside(rootPath, resolvedTarget) || resolvedTarget === rootPath) {
          fail(`npm package symlink escapes its root: ${relativePath}`);
        }
        const targetStats = lstatSync(resolvedTarget, { bigint: true });
        if (!targetStats.isFile() || targetStats.isSymbolicLink() ||
            realpathSync(absolutePath) !== resolvedTarget) {
          fail(`npm package symlink must directly target one internal regular file: ${relativePath}`);
        }
        symlinkCount++;
        records.push({
          path: relativePath,
          type: 'symlink',
          target,
          resolvedTarget: relative(rootPath, resolvedTarget).split(sep).join('/'),
          device: stats.dev.toString(10),
          inode: stats.ino.toString(10),
          mode: Number(stats.mode & 0o7777n),
          uid: portableUnsignedBigInt(stats.uid, `npm package symlink uid: ${relativePath}`),
          gid: portableUnsignedBigInt(stats.gid, `npm package symlink gid: ${relativePath}`),
          linkCount: 1,
          mtimeNs: stats.mtimeNs.toString(10),
          ctimeNs: stats.ctimeNs.toString(10),
          birthtimeNs: stats.birthtimeNs.toString(10),
        });
        continue;
      }
      fail(`npm package tree contains a special filesystem node: ${relativePath}`);
    }
    const directoryAfter = lstatSync(current.absolute, { bigint: true });
    const namesAfter = readDirectoryNamesBounded(
      current.absolute,
      `npm package directory ${current.relative || '<root>'}`,
      limits.directoryEntries,
    ).sort();
    if (!sameRuntimeStat(directoryBefore, directoryAfter) ||
        JSON.stringify(namesAfter) !== JSON.stringify(names)) {
      fail(`npm package directory changed while it was sealed: ${current.relative || '<root>'}`);
    }
  }
  const rootFinal = lstatSync(rootPath, { bigint: true });
  if (!sameRuntimeStat(rootInitial, rootFinal)) fail('npm package root changed while it was sealed');
  records.sort((left, right) => {
    const leftPath = String(left.path);
    const rightPath = String(right.path);
    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
  });
  return {
    schema: NPM_TREE_SCHEMA,
    sha256: sha256(`${RUNTIME_TREE_HASH_DOMAIN}${canonicalize(records)}`),
    entryCount,
    directoryCount,
    fileCount,
    symlinkCount,
    byteCount,
  };
}

export function fingerprintNpmPackageTree(
  rootPath: string,
  limits: NpmAuthorityLimits = NPM_AUTHORITY_LIMITS,
): NpmPackageTreeAuthority {
  validateNpmAuthorityLimits(limits);
  const first = npmTreeOnce(rootPath, limits);
  const second = npmTreeOnce(rootPath, limits);
  if (!exactJsonEqual(first, second)) fail('npm package tree changed across its stable seal');
  return first;
}

function npmManifestIdentity(cli: string): {
  readonly root: string;
  readonly version: string;
  readonly packageJson: string;
} {
  if (basename(cli) !== 'npm-cli.js' || basename(dirname(cli)) !== 'bin') {
    fail('npm executable must be the exact npm package bin/npm-cli.js entry point');
  }
  const rootPath = dirname(dirname(cli));
  if (realpathSync(rootPath) !== rootPath || !lstatSync(rootPath).isDirectory()) {
    fail('npm package root must be one canonical physical directory');
  }
  const packageJsonPath = join(rootPath, 'package.json');
  const manifest = expectRecord(readStrictJson(packageJsonPath, 'npm package manifest'), 'npm package manifest');
  const bin = expectRecord(manifest.bin, 'npm package manifest bin');
  const version = expectString(manifest.version, 'npm package manifest version');
  if (manifest.name !== 'npm' || bin.npm !== 'bin/npm-cli.js') {
    fail('npm package manifest does not bind the exact npm CLI identity');
  }
  reviewedNpmMajor(version);
  return { root: rootPath, version, packageJson: packageJsonPath };
}

export function inspectNpmPackageAuthority(cli: string): NpmPackageAuthority {
  if (!isAbsolute(cli) || realpathSync(cli) !== cli) {
    fail('npm CLI must be one canonical physical absolute path');
  }
  const firstIdentity = npmManifestIdentity(cli);
  const firstTree = fingerprintNpmPackageTree(firstIdentity.root);
  const cliFile = inspectRuntimeRegularFile(
    cli,
    NPM_AUTHORITY_LIMITS.fileBytes,
    'reviewed npm CLI authority',
    true,
  );
  const packageJsonFile = inspectRuntimeRegularFile(
    firstIdentity.packageJson,
    MAX_JSON_BYTES,
    'reviewed npm package manifest authority',
  );
  const secondIdentity = npmManifestIdentity(cli);
  const secondTree = fingerprintNpmPackageTree(secondIdentity.root);
  if (
    !exactJsonEqual(firstIdentity, secondIdentity) ||
    !exactJsonEqual(firstTree, secondTree)
  ) {
    fail('npm package authority changed across semantic inspection');
  }
  return {
    root: firstIdentity.root,
    cli,
    version: firstIdentity.version,
    packageJsonSha256: packageJsonFile.sha256,
    cliFile,
    ancestry: inspectRuntimePathAncestry(firstIdentity.root, 'reviewed npm package root'),
    tree: firstTree,
  };
}

export function assertPackageRuntimeAuthority(expected: PackageRuntimeAuthority, label: string): void {
  const nodeFile = inspectNodeExecutableAuthority(expected.node.executable);
  const npm = inspectNpmPackageAuthority(expected.npm.cli);
  const observed: PackageRuntimeAuthority = {
    scope: RUNTIME_AUTHORITY_SCOPE,
    node: { ...nodeFile, version: expected.node.version },
    npm,
  };
  if (!exactJsonEqual(observed, expected)) fail(`${label} package runtime authority changed`);
}

function expectedPackageClosure(packageJsonValue: JsonValue): ExpectedPackageFile[] {
  const packageJson = expectRecord(packageJsonValue, 'Cortexel package.json');
  if (!exactJsonEqual(packageJson.files, EXPECTED_PACKAGE_FILE_ENTRIES)) {
    fail('Cortexel package files allowlist differs from the reviewed package closure');
  }
  const pending = ['package.json', ...EXPECTED_PACKAGE_FILE_ENTRIES];
  const files: ExpectedPackageFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;
  let visitedNodes = 0;
  while (pending.length > 0) {
    const relativePath = pending.pop()!;
    assertCanonicalArtifactPath(relativePath, 'expected package path');
    if (relativePath.split('/').length > PACKAGE_TARBALL_LIMITS.sourceDepth) {
      fail(`expected package path exceeds its depth bound: ${relativePath}`);
    }
    visitedNodes++;
    if (visitedNodes > PACKAGE_TARBALL_LIMITS.sourceNodes) {
      fail('expected package closure exceeds its filesystem-node bound');
    }
    const absolutePath = join(root, ...relativePath.split('/'));
    const stats = lstatSync(absolutePath);
    if (stats.isSymbolicLink()) fail(`expected package closure contains a symlink: ${relativePath}`);
    if (stats.isDirectory()) {
      const directory = opendirSync(absolutePath);
      const children: string[] = [];
      try {
        let child = directory.readSync();
        while (child !== null) {
          children.push(child.name);
          if (children.length > PACKAGE_TARBALL_LIMITS.directoryEntries) {
            fail(`expected package directory exceeds its child bound: ${relativePath}`);
          }
          child = directory.readSync();
        }
      } finally {
        directory.closeSync();
      }
      children.sort().reverse();
      for (const child of children) pending.push(`${relativePath}/${child}`);
      if (visitedNodes + pending.length > PACKAGE_TARBALL_LIMITS.sourceNodes) {
        fail('expected package closure pending-node count exceeds its bound');
      }
      continue;
    }
    if (!stats.isFile()) fail(`expected package closure contains a special file: ${relativePath}`);
    if (seen.has(relativePath)) fail(`expected package closure duplicates ${relativePath}`);
    if (files.length >= PACKAGE_TARBALL_LIMITS.entries) {
      fail('expected package closure exceeds its entry bound');
    }
    if (stats.size > PACKAGE_TARBALL_LIMITS.fileBytes) {
      fail(`expected package file exceeds its bound: ${relativePath}`);
    }
    const mode = expectedArtifactMode(relativePath);
    if (process.platform !== 'win32' && (stats.mode & 0o7777) !== mode) {
      fail(`expected package source mode is invalid: ${relativePath}`);
    }
    const raw = readRegularFileStable(
      absolutePath,
      stats.size,
      `expected package file ${relativePath}`,
      PACKAGE_TARBALL_LIMITS.fileBytes,
    );
    totalBytes += raw.byteLength;
    if (totalBytes > PACKAGE_TARBALL_LIMITS.uncompressedBytes) {
      fail('expected package closure exceeds its byte bound');
    }
    files.push({ path: relativePath, size: raw.byteLength, mode, digest: sha256(raw) });
    seen.add(relativePath);
  }
  files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return files;
}

export function verifyInstalledPackageClosure(
  installedRoot: string,
  expectedFiles: readonly ExpectedPackageFile[],
  permissionPhase: 'prepared-writable' | 'finalized-read-only' = 'prepared-writable',
): void {
  if (permissionPhase !== 'prepared-writable' && permissionPhase !== 'finalized-read-only') {
    fail('installed Cortexel closure has an invalid permission phase');
  }
  if (realpathSync(installedRoot) !== installedRoot || !lstatSync(installedRoot).isDirectory()) {
    fail('installed Cortexel package root is not a canonical real directory');
  }
  const expected = artifactFileMap(expectedFiles, 'installed package expectation', true);
  const expectedDirectories = new Set<string>(['']);
  for (const path of expected.keys()) {
    const segments = path.split('/');
    for (let index = 1; index < segments.length; index++) {
      expectedDirectories.add(segments.slice(0, index).join('/'));
    }
  }
  const pending = [''];
  const seen = new Set<string>();
  let visitedNodes = 0;
  let fileBytes = 0;
  while (pending.length > 0) {
    const relativePath = pending.pop()!;
    const absolutePath = relativePath
      ? join(installedRoot, ...relativePath.split('/'))
      : installedRoot;
    const stats = lstatSync(absolutePath);
    visitedNodes++;
    if (visitedNodes > PACKAGE_TARBALL_LIMITS.sourceNodes) {
      fail('installed Cortexel closure exceeds its filesystem-node bound');
    }
    if (stats.isSymbolicLink()) fail(`installed Cortexel closure contains a link: ${relativePath}`);
    if (stats.isDirectory()) {
      // npm's reviewed nested strategy grafts Cortexel's locked dependencies here;
      // those are validated by the consumer lock and whole-workspace seal, not by
      // the package tar's own file closure.
      if (relativePath === 'node_modules') continue;
      if (!expectedDirectories.has(relativePath)) {
        fail(`installed Cortexel closure contains an unexpected directory: ${relativePath}`);
      }
      const directory = opendirSync(absolutePath);
      const children: string[] = [];
      try {
        let child = directory.readSync();
        while (child !== null) {
          children.push(child.name);
          if (children.length > PACKAGE_TARBALL_LIMITS.directoryEntries) {
            fail(`installed Cortexel directory exceeds its child bound: ${relativePath}`);
          }
          child = directory.readSync();
        }
      } finally {
        directory.closeSync();
      }
      for (const child of children.sort().reverse()) {
        const childPath = relativePath ? `${relativePath}/${child}` : child;
        assertCanonicalArtifactPath(childPath, 'installed Cortexel path');
        if (childPath.split('/').length > PACKAGE_TARBALL_LIMITS.sourceDepth) {
          fail(`installed Cortexel path exceeds its depth bound: ${childPath}`);
        }
        pending.push(childPath);
      }
      if (visitedNodes + pending.length > PACKAGE_TARBALL_LIMITS.sourceNodes) {
        fail('installed Cortexel pending-node count exceeds its bound');
      }
      continue;
    }
    if (!stats.isFile()) fail(`installed Cortexel closure contains a special file: ${relativePath}`);
    const expectedFile = expected.get(relativePath);
    if (expectedFile === undefined || seen.has(relativePath)) {
      fail(`installed Cortexel closure contains an unexpected file: ${relativePath}`);
    }
    let expectedMode = expectedFile.mode;
    if (permissionPhase === 'finalized-read-only') {
      expectedMode = (expectedFile.mode & 0o111) === 0 ? 0o444 : 0o555;
    }
    if (process.platform !== 'win32' && installedArtifactMode(stats.mode) !== expectedMode) {
      fail(`installed Cortexel file mode differs from the tarball: ${relativePath}`);
    }
    const raw = readRegularFileStable(
      absolutePath,
      stats.size,
      `installed Cortexel file ${relativePath}`,
      PACKAGE_TARBALL_LIMITS.fileBytes,
    );
    if (raw.byteLength !== expectedFile.size || sha256(raw) !== expectedFile.digest) {
      fail(`installed Cortexel file bytes differ from the tarball: ${relativePath}`);
    }
    fileBytes += raw.byteLength;
    if (fileBytes > PACKAGE_TARBALL_LIMITS.uncompressedBytes) {
      fail('installed Cortexel closure exceeds its byte bound');
    }
    seen.add(relativePath);
  }
  if (seen.size !== expected.size) fail('installed Cortexel file closure is incomplete');
}

export function assertInstalledTopLevelPackageInventory(
  consumer: string,
  expectedPackages: readonly string[],
  expectedBinTargets: Readonly<Record<string, string>>,
): void {
  const nodeModules = join(consumer, 'node_modules');
  if (realpathSync(nodeModules) !== nodeModules || !lstatSync(nodeModules).isDirectory()) {
    fail('installed node_modules root is not a canonical real directory');
  }
  const expectedScopes = new Map<string, string[]>();
  const expectedRootEntries = new Set<string>(['.bin', '.package-lock.json']);
  const seenPackages = new Set<string>();
  for (const packageName of expectedPackages) {
    if (!isCanonicalPackageName(packageName)) fail(`invalid expected package name ${packageName}`);
    if (seenPackages.has(packageName)) fail(`duplicate expected package name ${packageName}`);
    seenPackages.add(packageName);
    const segments = packageName.split('/');
    if (packageName.startsWith('@')) {
      const scope = segments[0]!;
      const member = segments[1]!;
      expectedRootEntries.add(scope);
      const members = expectedScopes.get(scope) ?? [];
      members.push(member);
      expectedScopes.set(scope, members);
    } else {
      expectedRootEntries.add(packageName);
    }
  }
  const actualRootEntries = readDirectoryNamesBounded(
    nodeModules,
    'installed top-level node_modules',
  ).sort();
  const wantedRootEntries = [...expectedRootEntries].sort();
  if (!exactJsonEqual(actualRootEntries, wantedRootEntries)) {
    fail(`installed top-level node_modules inventory differs: ${actualRootEntries.join(', ')}`);
  }
  const binDirectory = join(nodeModules, '.bin');
  const binStats = lstatSync(binDirectory);
  if (!binStats.isDirectory() || binStats.isSymbolicLink() || realpathSync(binDirectory) !== binDirectory) {
    fail('installed .bin entry is not a canonical real directory');
  }
  const expectedBinNames = Object.keys(expectedBinTargets).sort();
  if (expectedBinNames.length === 0 || expectedBinNames.some((name) =>
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(name))) {
    fail('installed .bin expectation is empty or contains an invalid name');
  }
  const actualBinNames = readDirectoryNamesBounded(
    binDirectory,
    'installed top-level .bin directory',
  ).sort();
  if (!exactJsonEqual(actualBinNames, expectedBinNames)) {
    fail(`installed top-level .bin inventory differs: ${actualBinNames.join(', ')}`);
  }
  for (const binName of expectedBinNames) {
    const target = expectedBinTargets[binName]!;
    if (!isAbsolute(target) || !isInside(nodeModules, target)) {
      fail(`installed ${binName} target escapes top-level node_modules`);
    }
    assertInstalledNodeBinShim(consumer, binName, target);
  }
  readStrictJson(join(nodeModules, '.package-lock.json'), 'installed hidden package lock');
  for (const [scope, members] of expectedScopes) {
    const scopePath = join(nodeModules, scope);
    const scopeStats = lstatSync(scopePath);
    if (!scopeStats.isDirectory() || scopeStats.isSymbolicLink() || realpathSync(scopePath) !== scopePath) {
      fail(`installed package scope is not a canonical real directory: ${scope}`);
    }
    const actualMembers = readDirectoryNamesBounded(
      scopePath,
      `installed package scope ${scope}`,
    ).sort();
    if (!exactJsonEqual(actualMembers, members.sort())) {
      fail(`installed package scope inventory differs: ${scope}`);
    }
  }
  for (const packageName of expectedPackages) {
    const packagePath = join(nodeModules, ...packageName.split('/'));
    const stats = lstatSync(packagePath);
    if (!stats.isDirectory() || stats.isSymbolicLink() || realpathSync(packagePath) !== packagePath) {
      fail(`installed top-level package is not a canonical real directory: ${packageName}`);
    }
  }
}

type OmittedDependencyClass = 'dev' | 'optional';

interface InstalledBinExpectation {
  readonly providerRoot: string;
  readonly target: string;
}

function lockPackageContainer(path: string): string {
  const marker = path.lastIndexOf('/node_modules/');
  return marker === -1 ? 'node_modules' : `${path.slice(0, marker)}/node_modules`;
}

function lockPackageName(path: string): string {
  const container = lockPackageContainer(path);
  const name = path.slice(container.length + 1);
  if (!isCanonicalPackageName(name)) fail(`fixture lock has an invalid package name at ${path}`);
  return name;
}

/**
 * Proves the complete npm-installed package topology against the exact prepared
 * lock and omit policy. This deliberately derives the expectation from every
 * nested lock path rather than maintaining a second, top-level-only allowlist.
 */
export function assertInstalledRecursivePackageClosure(
  consumer: string,
  preparedLockValue: JsonValue,
  omittedDependencyClasses: readonly OmittedDependencyClass[],
  npmMajor: number,
): void {
  if (npmMajor !== 10 && npmMajor !== 11) {
    fail('recursive package closure requires reviewed npm major 10 or 11');
  }
  const omitted = new Set<OmittedDependencyClass>();
  for (const dependencyClass of omittedDependencyClasses) {
    if (dependencyClass !== 'dev' && dependencyClass !== 'optional') {
      fail('package-smoke consumer has an unsupported omit policy');
    }
    if (omitted.has(dependencyClass)) fail('package-smoke consumer omit policy has duplicates');
    omitted.add(dependencyClass);
  }
  const omitPolicy = [...omitted].sort().join('+');
  if (omitPolicy !== '' && omitPolicy !== 'optional' && omitPolicy !== 'dev+optional') {
    fail('package-smoke consumer has an unsupported omit policy');
  }

  const lock = expectRecord(preparedLockValue, 'prepared package lock');
  exactKeys(
    lock,
    ['name', 'version', 'lockfileVersion', 'requires', 'packages'],
    'prepared package lock',
  );
  if (
    typeof lock.name !== 'string' || lock.name.length === 0 ||
    typeof lock.version !== 'string' || lock.version.length === 0 ||
    lock.lockfileVersion !== 3 || lock.requires !== true
  ) {
    fail('prepared package lock header is invalid');
  }
  const lockedPackages = expectRecord(lock.packages, 'prepared package lock packages');
  expectRecord(lockedPackages[''], 'prepared package lock root');

  const expectedPackages = new Map<string, Record<string, JsonValue>>();
  for (const [path, candidate] of Object.entries(lockedPackages)) {
    if (path === '') continue;
    if (!isCanonicalLockPackagePath(path)) fail(`prepared package lock has an unsafe path ${path}`);
    const record = expectRecord(candidate, `prepared package lock package ${path}`);
    for (const dependencyClass of ['dev', 'optional'] as const) {
      if (record[dependencyClass] !== undefined && typeof record[dependencyClass] !== 'boolean') {
        fail(`prepared package lock ${path} has a non-boolean ${dependencyClass} flag`);
      }
    }
    if ([...omitted].some((dependencyClass) => record[dependencyClass] === true)) continue;
    expectedPackages.set(path, record);
  }
  if (expectedPackages.size === 0 || expectedPackages.size > 10_000) {
    fail('prepared package lock selected package count is outside its bound');
  }

  const containerPackages = new Map<string, Set<string>>();
  const containerBins = new Map<string, Map<string, InstalledBinExpectation>>();
  for (const [path, record] of expectedPackages) {
    const container = lockPackageContainer(path);
    if (container !== 'node_modules') {
      const parent = container.slice(0, -'/node_modules'.length);
      if (!expectedPackages.has(parent)) {
        fail(`prepared package lock includes ${path} beneath an omitted or absent parent`);
      }
    }
    const packageName = lockPackageName(path);
    const packages = containerPackages.get(container) ?? new Set<string>();
    if (packages.has(packageName)) fail(`prepared package lock duplicates ${path}`);
    packages.add(packageName);
    containerPackages.set(container, packages);

    if (record.bin === undefined) continue;
    const bin = expectRecord(record.bin, `prepared package lock ${path} bin`);
    if (Object.keys(bin).length === 0) fail(`prepared package lock ${path} has an empty bin map`);
    const expectations = containerBins.get(container) ?? new Map<string, InstalledBinExpectation>();
    for (const [binName, targetValue] of Object.entries(bin)) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(binName)) {
        fail(`prepared package lock ${path} has an unsafe bin name`);
      }
      const targetRelative = expectString(targetValue, `prepared package lock ${path} bin target`);
      assertCanonicalArtifactPath(targetRelative, `prepared package lock ${path} bin target`);
      if (expectations.has(binName)) {
        fail(`prepared package lock has an ambiguous ${binName} bin in ${container}`);
      }
      const providerRoot = join(consumer, ...path.split('/'));
      const target = join(providerRoot, ...targetRelative.split('/'));
      if (!isInside(providerRoot, target)) {
        fail(`prepared package lock ${path} bin target escapes its provider`);
      }
      expectations.set(binName, { providerRoot, target });
    }
    containerBins.set(container, expectations);
  }
  if (!containerPackages.has('node_modules')) {
    fail('prepared package lock has no installed top-level package closure');
  }

  const nodeModules = join(consumer, 'node_modules');
  if (realpathSync(nodeModules) !== nodeModules || !lstatSync(nodeModules).isDirectory()) {
    fail('installed node_modules root is not a canonical real directory');
  }

  const expectedHiddenPackages = Object.fromEntries(expectedPackages);
  const expectedHiddenLock = {
    name: lock.name,
    version: lock.version,
    lockfileVersion: lock.lockfileVersion,
    requires: lock.requires,
    packages: expectedHiddenPackages,
  };
  const hiddenLockPath = join(nodeModules, '.package-lock.json');
  const actualHiddenLock = readStrictJson(hiddenLockPath, 'installed hidden package lock');
  if (!exactJsonEqual(actualHiddenLock, expectedHiddenLock)) {
    fail('installed hidden package lock differs from the exact filtered prepared lock');
  }

  const expectedManagementPaths = new Set(containerPackages.keys());
  const expectedBinPaths = new Set<string>();
  const npm10ScopeResidues = new Map<string, Set<string>>();
  if (npmMajor === 10) {
    for (const path of Object.keys(lockedPackages)) {
      if (path === '') continue;
      const container = lockPackageContainer(path);
      if (!containerPackages.has(container)) continue;
      const packageName = lockPackageName(path);
      if (!packageName.startsWith('@')) continue;
      const scopes = npm10ScopeResidues.get(container) ?? new Set<string>();
      scopes.add(packageName.split('/')[0]!);
      npm10ScopeResidues.set(container, scopes);
    }
  }
  for (const [container, packageNames] of [...containerPackages].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0)) {
    const containerPath = join(consumer, ...container.split('/'));
    const containerStats = lstatSync(containerPath);
    if (
      !containerStats.isDirectory() || containerStats.isSymbolicLink() ||
      realpathSync(containerPath) !== containerPath
    ) {
      fail(`installed package container is not a canonical real directory: ${container}`);
    }
    const expectedEntries = new Set<string>();
    const scopes = new Map<string, string[]>();
    for (const packageName of packageNames) {
      if (packageName.startsWith('@')) {
        const [scope, member] = packageName.split('/');
        expectedEntries.add(scope!);
        const members = scopes.get(scope!) ?? [];
        members.push(member!);
        scopes.set(scope!, members);
      } else {
        expectedEntries.add(packageName);
      }
    }
    // npm 10 deterministically materializes an empty scope directory before it
    // discovers that all direct members of that scope are omitted. npm 11 does
    // not. Bind that exact reviewed-major difference without admitting any
    // arbitrary empty directory or omitted package member.
    if (npmMajor === 10) {
      for (const scope of npm10ScopeResidues.get(container) ?? []) {
        expectedEntries.add(scope);
        if (!scopes.has(scope)) scopes.set(scope, []);
      }
    }
    const binExpectations = containerBins.get(container);
    if (binExpectations !== undefined) {
      expectedEntries.add('.bin');
      expectedBinPaths.add(`${container}/.bin`);
    }
    if (container === 'node_modules') expectedEntries.add('.package-lock.json');
    const actualEntries = readDirectoryNamesBounded(
      containerPath,
      `installed package container ${container}`,
    ).sort();
    const wantedEntries = [...expectedEntries].sort();
    if (!exactJsonEqual(actualEntries, wantedEntries)) {
      fail(`installed package container inventory differs: ${container}`);
    }

    for (const [scope, expectedMembers] of scopes) {
      const scopePath = join(containerPath, scope);
      const scopeStats = lstatSync(scopePath);
      if (
        !scopeStats.isDirectory() || scopeStats.isSymbolicLink() ||
        realpathSync(scopePath) !== scopePath
      ) {
        fail(`installed package scope is not a canonical real directory: ${container}/${scope}`);
      }
      const actualMembers = readDirectoryNamesBounded(
        scopePath,
        `installed package scope ${container}/${scope}`,
      ).sort();
      if (!exactJsonEqual(actualMembers, [...expectedMembers].sort())) {
        fail(`installed package scope inventory differs: ${container}/${scope}`);
      }
    }

    for (const packageName of packageNames) {
      const packagePath = `${container}/${packageName}`;
      const packageRoot = join(consumer, ...packagePath.split('/'));
      const packageStats = lstatSync(packageRoot);
      if (
        !packageStats.isDirectory() || packageStats.isSymbolicLink() ||
        realpathSync(packageRoot) !== packageRoot
      ) {
        fail(`installed package is not a canonical real directory: ${packagePath}`);
      }
      const packageRecord = expectedPackages.get(packagePath);
      if (packageRecord === undefined) fail(`missing prepared package record for ${packagePath}`);
      const packageManifest = expectRecord(
        readStrictJson(join(packageRoot, 'package.json'), `installed ${packagePath} manifest`),
        `installed ${packagePath} manifest`,
      );
      if (
        packageManifest.name !== packageName ||
        packageManifest.version !== expectString(packageRecord.version, `${packagePath} version`)
      ) {
        fail(`installed package identity differs from the prepared lock: ${packagePath}`);
      }
    }

    if (binExpectations !== undefined) {
      const binPath = join(containerPath, '.bin');
      const binStats = lstatSync(binPath);
      if (!binStats.isDirectory() || binStats.isSymbolicLink() || realpathSync(binPath) !== binPath) {
        fail(`installed .bin is not a canonical real directory: ${container}`);
      }
      const actualBinNames = readDirectoryNamesBounded(
        binPath,
        `installed .bin ${container}`,
      ).sort();
      const expectedBinNames = [...binExpectations.keys()].sort();
      if (!exactJsonEqual(actualBinNames, expectedBinNames)) {
        fail(`installed .bin inventory differs: ${container}`);
      }
      for (const [binName, expectation] of binExpectations) {
        if (!isInside(nodeModules, expectation.providerRoot) ||
            !isInside(expectation.providerRoot, expectation.target)) {
          fail(`installed ${binName} bin expectation escapes its package closure`);
        }
        assertInstalledNodeBinShimAt(binPath, binName, expectation.target);
      }
    }
  }

  // Package payloads are otherwise opaque registry bytes. Traverse them only to
  // prove that no extra npm management subtree or metadata file is concealed at
  // an unmodeled depth (including beneath a package that should be a leaf).
  const pending = [nodeModules];
  let visitedEntries = 0;
  while (pending.length > 0) {
    const directory = pending.pop() ?? nodeModules;
    for (const name of readDirectoryNamesBounded(directory, `installed package tree ${directory}`)) {
      visitedEntries++;
      if (visitedEntries > MAX_TREE_ENTRIES) {
        fail('installed recursive package closure exceeds its filesystem-node bound');
      }
      const path = join(directory, name);
      const stats = lstatSync(path);
      const relativePath = relative(nodeModules, path).split(sep).join('/');
      const managementPath = `node_modules/${relativePath}`;
      if (name === 'node_modules' && !expectedManagementPaths.has(managementPath)) {
        fail(`installed package tree contains an unexpected node_modules path: ${managementPath}`);
      }
      if (name === '.bin' && !expectedBinPaths.has(managementPath)) {
        fail(`installed package tree contains an unexpected .bin path: ${managementPath}`);
      }
      if (name === '.package-lock.json' && managementPath !== 'node_modules/.package-lock.json') {
        fail(`installed package tree contains an unexpected hidden lock: ${managementPath}`);
      }
      if (stats.isDirectory() && !stats.isSymbolicLink()) pending.push(path);
    }
  }
}

/** Byte-, topology-, ownership-, and mode-bound seal used on both sides of inspection. */
export function fingerprintPackageSmokeWorkspace(
  workspace: string,
  requireFinalizedRoot = false,
): WorkspaceSeal {
  const canonicalRoot = realpathSync(workspace);
  if (canonicalRoot !== workspace) fail('workspace root is not canonical while sealing');
  const rootInitial = lstatSync(workspace, { bigint: true });
  if (!rootInitial.isDirectory() || rootInitial.isSymbolicLink()) {
    fail('workspace root must be one physical directory while sealing');
  }
  const initialRootMode = Number(rootInitial.mode & 0o7777n);
  if (requireFinalizedRoot && initialRootMode !== 0o555) {
    fail('workspace root does not have its finalized read-only mode while sealing');
  }
  const parentAncestry = inspectRuntimePathAncestry(workspace, 'package-smoke workspace');
  const pending = [''];
  const records: Array<Record<string, JsonValue>> = [];
  let entryCount = 0;
  let fileCount = 0;
  let byteCount = 0;
  while (pending.length > 0) {
    const directoryRelative = pending.pop() ?? '';
    const directory = directoryRelative ? join(workspace, directoryRelative) : workspace;
    const names = readDirectoryNamesBounded(
      directory,
      `package-smoke workspace directory ${directoryRelative || '<root>'}`,
    ).sort();
    for (const name of names) {
      const pathRelative = directoryRelative ? `${directoryRelative}/${name}` : name;
      if (pathRelative === STATE_FILENAME) continue;
      entryCount++;
      if (entryCount > MAX_TREE_ENTRIES) fail('package-smoke workspace exceeds the entry budget');
      const path = join(workspace, ...pathRelative.split('/'));
      const stats = lstatSync(path);
      const common = {
        path: pathRelative,
        mode: stats.mode & 0o7777,
        uid: stats.uid,
        gid: stats.gid,
      };
      if (stats.isDirectory()) {
        records.push({ type: 'directory', ...common });
        pending.push(pathRelative);
      } else if (stats.isSymbolicLink()) {
        const target = readlinkSync(path);
        if (Buffer.byteLength(target, 'utf8') > 4_096) fail(`oversized symlink target at ${pathRelative}`);
        const resolved = realpathSync(path);
        if (!isInside(workspace, resolved)) fail(`workspace symlink escapes its root: ${pathRelative}`);
        records.push({ type: 'symlink', target, ...common });
      } else if (stats.isFile()) {
        if (stats.nlink !== 1) fail(`workspace regular file is hard-linked: ${pathRelative}`);
        if (stats.size > MAX_WORKSPACE_FILE_BYTES) {
          fail(`workspace file exceeds its per-file byte budget: ${pathRelative}`);
        }
        byteCount += stats.size;
        fileCount++;
        if (byteCount > MAX_TREE_BYTES) fail('package-smoke workspace exceeds the byte budget');
        const digest = digestRegularFileStable(
          path,
          stats.size,
          `workspace file ${pathRelative}`,
          MAX_WORKSPACE_FILE_BYTES,
        );
        records.push({ type: 'file', digest, size: stats.size, ...common });
      } else {
        fail(`workspace contains a special file: ${pathRelative}`);
      }
    }
  }
  records.sort((left, right) => {
    const leftPath = String(left.path);
    const rightPath = String(right.path);
    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
  });
  const rootFinal = lstatSync(workspace, { bigint: true });
  const finalParentAncestry = inspectRuntimePathAncestry(workspace, 'package-smoke workspace');
  if (!sameRuntimeStat(rootInitial, rootFinal) ||
      !exactJsonEqual(parentAncestry, finalParentAncestry)) {
    fail('workspace root or parent ancestry changed while sealing');
  }
  const root: WorkspaceRootAuthority = {
    path: workspace,
    device: rootInitial.dev.toString(10),
    inode: rootInitial.ino.toString(10),
    mode: initialRootMode,
    uid: portableUnsignedBigInt(rootInitial.uid, 'workspace root uid'),
    gid: portableUnsignedBigInt(rootInitial.gid, 'workspace root gid'),
    linkCount: portableUnsignedBigInt(rootInitial.nlink, 'workspace root link count', 1n),
  };
  return {
    digest: sha256(canonicalize({ parentAncestry, records, root })),
    entryCount,
    fileCount,
    byteCount,
    root,
    parentAncestry,
  };
}

function makeWorkspaceReadOnly(workspace: string): boolean {
  if (process.platform === 'win32') return false;
  const pending = [workspace];
  const directories: string[] = [];
  let visitedEntries = 0;
  while (pending.length > 0) {
    const directory = pending.pop() ?? workspace;
    directories.push(directory);
    for (const name of readDirectoryNamesBounded(directory, `workspace directory ${directory}`)) {
      visitedEntries++;
      if (visitedEntries > MAX_TREE_ENTRIES) fail('workspace exceeds the read-only entry budget');
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isDirectory()) pending.push(path);
      else if (stats.isFile()) chmodSync(path, (stats.mode & 0o111) === 0 ? 0o444 : 0o555);
    }
  }
  for (const directory of directories.reverse()) {
    if (directory !== workspace) chmodSync(directory, 0o555);
  }
  return true;
}

function assertWorkspaceReadOnly(workspace: string, expected: boolean): void {
  if (!expected) return;
  const pending = [workspace];
  let visitedEntries = 0;
  while (pending.length > 0) {
    const directory = pending.pop() ?? workspace;
    const directoryStats = lstatSync(directory);
    if ((directoryStats.mode & 0o222) !== 0) fail(`workspace directory is writable: ${directory}`);
    for (const name of readDirectoryNamesBounded(directory, `workspace directory ${directory}`)) {
      visitedEntries++;
      if (visitedEntries > MAX_TREE_ENTRIES) fail('workspace exceeds the read-only entry budget');
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isDirectory()) pending.push(path);
      else if (!stats.isSymbolicLink() && (stats.mode & 0o222) !== 0) {
        fail(`workspace file is writable: ${path}`);
      }
    }
  }
}

function makeWorkspaceWritableForCleanup(workspace: string): void {
  if (process.platform === 'win32' || !existsSync(workspace)) return;
  const pending = [workspace];
  let visitedEntries = 0;
  while (pending.length > 0) {
    const directory = pending.pop() ?? workspace;
    chmodSync(directory, 0o755);
    for (const name of readDirectoryNamesBounded(directory, `workspace directory ${directory}`)) {
      visitedEntries++;
      if (visitedEntries > MAX_TREE_ENTRIES) fail('workspace exceeds the cleanup entry budget');
      const path = join(directory, name);
      const stats = lstatSync(path);
      if (stats.isDirectory()) pending.push(path);
      else if (stats.isFile()) chmodSync(path, (stats.mode & 0o111) === 0 ? 0o644 : 0o755);
    }
  }
}

const NETWORK_AND_WRITE_GUARD = String.raw`'use strict';
const denied = (authority) => {
  throw new Error('[cortexel package smoke] denied execute-phase authority: ' + authority);
};
const deny = (authority) => function deniedAuthority() { return denied(authority); };

const net = require('node:net');
net.connect = deny('net.connect');
net.createConnection = deny('net.createConnection');
net.Socket.prototype.connect = deny('net.Socket.connect');
const tls = require('node:tls');
tls.connect = deny('tls.connect');
const http = require('node:http');
http.request = deny('http.request');
http.get = deny('http.get');
const https = require('node:https');
https.request = deny('https.request');
https.get = deny('https.get');
const http2 = require('node:http2');
http2.connect = deny('http2.connect');
const dns = require('node:dns');
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'reverse']) {
  dns[name] = deny('dns.' + name);
}
const dnsPromises = require('node:dns/promises');
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'reverse']) {
  if (typeof dnsPromises[name] === 'function') dnsPromises[name] = deny('dns.promises.' + name);
  if (dns.promises && typeof dns.promises[name] === 'function') {
    dns.promises[name] = deny('dns.promises.' + name);
  }
}
const dgram = require('node:dgram');
dgram.createSocket = deny('dgram.createSocket');
if (typeof globalThis.fetch === 'function') globalThis.fetch = deny('fetch');
if (typeof globalThis.WebSocket === 'function') globalThis.WebSocket = deny('WebSocket');

const childProcess = require('node:child_process');
for (const name of ['exec', 'execFile', 'execFileSync', 'execSync', 'fork', 'spawn', 'spawnSync']) {
  childProcess[name] = deny('child_process.' + name);
}

const fs = require('node:fs');
for (const name of [
  'appendFile', 'appendFileSync', 'chmod', 'chmodSync', 'chown', 'chownSync',
  'copyFile', 'copyFileSync', 'cp', 'cpSync', 'createWriteStream', 'fchmod', 'fchmodSync',
  'fchown', 'fchownSync', 'fdatasync', 'fdatasyncSync', 'ftruncate', 'ftruncateSync',
  'fsync', 'fsyncSync', 'futimes', 'futimesSync', 'link', 'linkSync', 'lchown',
  'lchownSync', 'lutimes',
  'lutimesSync', 'mkdir', 'mkdirSync', 'mkdtemp', 'mkdtempSync', 'rename', 'renameSync',
  'rm', 'rmSync', 'rmdir', 'rmdirSync', 'symlink', 'symlinkSync', 'truncate',
  'truncateSync', 'unlink', 'unlinkSync', 'utimes', 'utimesSync', 'write', 'writeFile',
  'writeFileSync', 'writeSync', 'writev', 'writevSync',
]) {
  if (typeof fs[name] === 'function') fs[name] = deny('fs.' + name);
}
const writeMask = fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_APPEND |
  fs.constants.O_CREAT | fs.constants.O_TRUNC;
const isWriteFlag = (flags) => typeof flags === 'number'
  ? (flags & writeMask) !== 0
  : typeof flags !== 'string' || /[wa+]/u.test(flags);
const originalOpen = fs.open;
const originalOpenSync = fs.openSync;
fs.open = function guardedOpen(path, flags, ...rest) {
  if (isWriteFlag(flags)) return denied('fs.open(write)');
  return originalOpen.call(this, path, flags, ...rest);
};
fs.openSync = function guardedOpenSync(path, flags, ...rest) {
  if (isWriteFlag(flags)) return denied('fs.openSync(write)');
  return originalOpenSync.call(this, path, flags, ...rest);
};
const promiseSurfaces = [...new Set([fs.promises, require('node:fs/promises')].filter(Boolean))];
for (const promises of promiseSurfaces) {
  for (const name of [
    'appendFile', 'chmod', 'chown', 'copyFile', 'cp', 'lchmod', 'lchown', 'link',
    'lutimes', 'mkdir', 'mkdtemp', 'rename', 'rm', 'rmdir', 'symlink', 'truncate',
    'unlink', 'utimes', 'writeFile',
  ]) {
    if (typeof promises[name] === 'function') promises[name] = deny('fs.promises.' + name);
  }
  const originalPromiseOpen = promises.open.bind(promises);
  promises.open = async function guardedPromiseOpen(path, flags, ...rest) {
    if (isWriteFlag(flags)) return Promise.reject(new Error(
      '[cortexel package smoke] denied execute-phase authority: fs.promises.open(write)',
    ));
    const handle = await originalPromiseOpen(path, flags, ...rest);
    for (const name of [
      'appendFile', 'chmod', 'chown', 'createWriteStream', 'datasync', 'sync', 'truncate',
      'utimes', 'write', 'writeFile', 'writev',
    ]) {
      if (typeof handle[name] === 'function') handle[name] = deny('FileHandle.' + name);
    }
    return handle;
  };
}
require('node:module').syncBuiltinESMExports();
`;

function reviewedNpmMajor(npmVersion: string): 10 | 11 {
  if (!/^(?:10|11)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?$/u.test(
    npmVersion,
  )) {
    fail(`package smoke requires an exact reviewed npm 10 or 11 version; received ${npmVersion}`);
  }
  return npmVersion.startsWith('10.') ? 10 : 11;
}

function artifactBoundFixtureLock(
  exactFixtureLockValue: JsonValue,
  artifactIntegrity: string,
): JsonValue {
  assertSri512(artifactIntegrity, 'prepared artifact integrity');
  const derivedLock = structuredClone(exactFixtureLockValue);
  const derivedPackages = expectRecord(
    expectRecord(derivedLock, 'package-smoke fixture lock').packages,
    'package-smoke fixture lock packages',
  );
  const derivedCortexel = expectRecord(
    derivedPackages['node_modules/cortexel'],
    'package-smoke fixture Cortexel lock entry',
  );
  if (Object.hasOwn(derivedCortexel, 'integrity')) {
    fail('committed fixture lock unexpectedly pre-binds a mutable local artifact');
  }
  derivedCortexel.integrity = artifactIntegrity;
  return derivedLock;
}

function prepareConsumer(
  consumer: string,
  tarballPath: string,
  artifactIntegrity: string,
  exactFixtureLockValue: JsonValue,
  exactFixtureManifestRaw: Buffer,
  expectedFiles: readonly ExpectedPackageFile[],
  nodeExecutable: string,
  npmExecutable: string,
  omittedDependencyClasses: readonly ('dev' | 'optional')[],
  npmMajor: number,
): void {
  mkdirSync(consumer, { mode: 0o755 });
  writeFileSync(join(consumer, 'package.json'), exactFixtureManifestRaw, {
    flag: 'wx',
    mode: 0o644,
  });
  const derivedLock = artifactBoundFixtureLock(exactFixtureLockValue, artifactIntegrity);
  const consumerLockPath = join(consumer, 'package-lock.json');
  writeFileSync(consumerLockPath, `${canonicalize(derivedLock)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o644,
  });
  const derivedLockDigest = sourceDigest(consumerLockPath);
  copyFileSync(tarballPath, join(consumer, LOCAL_TARBALL_FILENAME), fsConstants.COPYFILE_EXCL);
  runNpmCommand(
    nodeExecutable,
    npmExecutable,
    [
      ...NPM_CI_FLAGS,
      ...omittedDependencyClasses.map((dependencyClass) => `--omit=${dependencyClass}`),
    ],
    consumer,
  );
  if (
    canonicalJsonSourceDigest(join(consumer, 'package.json'), 'installed fixture manifest') !==
    EXPECTED_FIXTURE_MANIFEST_SHA256
  ) {
    fail('npm ci changed the committed fixture manifest');
  }
  if (sourceDigest(consumerLockPath) !== derivedLockDigest) {
    fail('npm ci changed the artifact-bound fixture lock');
  }
  verifyInstalledPackageClosure(join(consumer, 'node_modules', 'cortexel'), expectedFiles);
  assertInstalledRecursivePackageClosure(
    consumer,
    derivedLock,
    omittedDependencyClasses,
    npmMajor,
  );
}

function assertPreparedConsumerClosures(options: {
  readonly artifact: Buffer;
  readonly artifactIntegrity: string;
  readonly chartsConsumer: string;
  readonly consumer: string;
  readonly coreConsumer: string;
  readonly expectedFiles: readonly ExpectedPackageFile[];
  readonly exactFixtureLockValue: JsonValue;
  readonly exactFixtureManifestRaw: Buffer;
  readonly npmVersion: string;
  readonly permissionPhase: 'prepared-writable' | 'finalized-read-only';
}): void {
  if (sha512Integrity(options.artifact) !== options.artifactIntegrity) {
    fail('semantic consumer revalidation received artifact bytes with the wrong integrity');
  }
  const npmMajor = reviewedNpmMajor(options.npmVersion);
  const expectedLock = artifactBoundFixtureLock(
    options.exactFixtureLockValue,
    options.artifactIntegrity,
  );
  const expectedLockRaw = `${canonicalize(expectedLock)}\n`;
  const expectedMode = options.permissionPhase === 'prepared-writable' ? 0o644 : 0o444;
  const consumers = [
    [options.coreConsumer, ['dev', 'optional']],
    [options.chartsConsumer, ['optional']],
    [options.consumer, []],
  ] as const satisfies readonly [string, readonly OmittedDependencyClass[]][];
  for (const [consumer, omittedDependencyClasses] of consumers) {
    const lockPath = join(consumer, 'package-lock.json');
    const lockRaw = readExactIntentFile(
      lockPath,
      expectedLockRaw,
      expectedMode,
      `artifact-bound consumer lock ${consumer}`,
    );
    const installedLock = parseCanonicalJsonBuffer(
      lockRaw,
      `artifact-bound consumer lock ${consumer}`,
    );
    if (!exactJsonEqual(installedLock, expectedLock)) {
      fail(`consumer lock differs from the exact artifact-bound fixture: ${consumer}`);
    }
    readExactIntentFile(
      join(consumer, 'package.json'),
      options.exactFixtureManifestRaw,
      expectedMode,
      `artifact-bound consumer manifest ${consumer}`,
    );
    readExactIntentFile(
      join(consumer, LOCAL_TARBALL_FILENAME),
      options.artifact,
      expectedMode,
      `artifact-bound consumer tarball ${consumer}`,
    );
    verifyInstalledPackageClosure(
      join(consumer, 'node_modules', 'cortexel'),
      options.expectedFiles,
      options.permissionPhase,
    );
    assertInstalledRecursivePackageClosure(
      consumer,
      installedLock,
      omittedDependencyClasses,
      npmMajor,
    );
  }
}

function parsePackedResult(value: JsonValue): PackedResult {
  const record = expectRecord(value, 'prepared npm pack result');
  exactKeys(
    record,
    [
      'name',
      'version',
      'size',
      'unpackedSize',
      'shasum',
      'integrity',
      'filename',
      'files',
      'entryCount',
    ],
    'prepared npm pack result',
  );
  const filesValue = record.files;
  if (!Array.isArray(filesValue) || filesValue.length === 0) fail('prepared pack inventory is empty');
  const files: PackedFile[] = filesValue.map((candidate, index) => {
    const file = expectRecord(candidate, `prepared pack file ${index}`);
    exactKeys(file, ['path', 'size', 'mode'], `prepared pack file ${index}`);
    return {
      path: expectString(file.path, `prepared pack file ${index} path`),
      size: expectInteger(file.size, `prepared pack file ${index} size`),
      mode: expectInteger(file.mode, `prepared pack file ${index} mode`),
    };
  });
  return {
    name: expectString(record.name, 'prepared pack name'),
    version: expectString(record.version, 'prepared pack version'),
    size: expectInteger(record.size, 'prepared pack size'),
    unpackedSize: expectInteger(record.unpackedSize, 'prepared pack unpacked size'),
    shasum: expectString(record.shasum, 'prepared pack shasum'),
    integrity: expectString(record.integrity, 'prepared pack integrity'),
    filename: expectString(record.filename, 'prepared pack filename'),
    files,
    entryCount: expectInteger(record.entryCount, 'prepared pack entry count'),
  };
}

function readPackedResultStable(path: string): { readonly packed: PackedResult; readonly raw: Buffer } {
  const raw = readRegularFileStable(
    path,
    undefined,
    'prepared npm pack result',
    MAX_JSON_BYTES,
  );
  return {
    packed: parsePackedResult(parseCanonicalJsonBuffer(raw, 'prepared npm pack result')),
    raw,
  };
}

function expectBoundedInteger(
  value: JsonValue | undefined,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = expectInteger(value, label);
  if (parsed < minimum || parsed > maximum) fail(`${label} is outside its bound`);
  return parsed;
}

function expectSha256(value: JsonValue | undefined, label: string): string {
  const parsed = expectString(value, label);
  if (!/^sha256:[0-9a-f]{64}$/u.test(parsed)) fail(`${label} is not canonical SHA-256`);
  return parsed;
}

function expectUnsignedDecimal(value: JsonValue | undefined, label: string): string {
  const parsed = expectString(value, label);
  if (!/^(?:0|[1-9][0-9]{0,39})$/u.test(parsed)) {
    fail(`${label} is not one bounded canonical unsigned decimal`);
  }
  return parsed;
}

function parseRuntimeFileAuthority(value: JsonValue | undefined, label: string): RuntimeFileAuthority {
  const record = expectRecord(value, label);
  exactKeys(record, [
    'path',
    'sha256',
    'size',
    'mode',
    'uid',
    'gid',
    'linkCount',
    'device',
    'inode',
    'mtimeNs',
    'ctimeNs',
    'birthtimeNs',
  ], label);
  const path = expectString(record.path, `${label} path`);
  if (!isAbsolute(path) || resolve(path) !== path || Buffer.byteLength(path, 'utf8') >
      NPM_AUTHORITY_LIMITS.pathBytes) {
    fail(`${label} path is not one bounded normalized absolute path`);
  }
  const linkCount = expectBoundedInteger(record.linkCount, `${label} linkCount`, 1, 1);
  return {
    path,
    sha256: expectSha256(record.sha256, `${label} sha256`),
    size: expectBoundedInteger(record.size, `${label} size`, 1, MAX_RUNTIME_EXECUTABLE_BYTES),
    mode: expectBoundedInteger(record.mode, `${label} mode`, 0, 0o7777),
    uid: expectBoundedInteger(record.uid, `${label} uid`, 0, Number.MAX_SAFE_INTEGER),
    gid: expectBoundedInteger(record.gid, `${label} gid`, 0, Number.MAX_SAFE_INTEGER),
    linkCount: linkCount as 1,
    device: expectUnsignedDecimal(record.device, `${label} device`),
    inode: expectUnsignedDecimal(record.inode, `${label} inode`),
    mtimeNs: expectUnsignedDecimal(record.mtimeNs, `${label} mtimeNs`),
    ctimeNs: expectUnsignedDecimal(record.ctimeNs, `${label} ctimeNs`),
    birthtimeNs: expectUnsignedDecimal(record.birthtimeNs, `${label} birthtimeNs`),
  };
}

function parseRuntimeAncestry(value: JsonValue | undefined, label: string): RuntimePathAncestry {
  const record = expectRecord(value, label);
  exactKeys(record, ['sha256', 'entryCount'], label);
  return {
    sha256: expectSha256(record.sha256, `${label} sha256`),
    entryCount: expectBoundedInteger(
      record.entryCount,
      `${label} entryCount`,
      1,
      NPM_AUTHORITY_LIMITS.depth,
    ),
  };
}

function parseNpmTreeAuthority(value: JsonValue | undefined): NpmPackageTreeAuthority {
  const label = 'prepared npm package tree authority';
  const record = expectRecord(value, label);
  exactKeys(record, [
    'schema',
    'sha256',
    'entryCount',
    'directoryCount',
    'fileCount',
    'symlinkCount',
    'byteCount',
  ], label);
  if (record.schema !== NPM_TREE_SCHEMA) fail('prepared npm package tree schema is unsupported');
  const entryCount = expectBoundedInteger(record.entryCount, `${label} entryCount`, 1,
    NPM_AUTHORITY_LIMITS.entries);
  const directoryCount = expectBoundedInteger(record.directoryCount, `${label} directoryCount`, 1,
    entryCount);
  const fileCount = expectBoundedInteger(record.fileCount, `${label} fileCount`, 1, entryCount);
  const symlinkCount = expectBoundedInteger(record.symlinkCount, `${label} symlinkCount`, 0,
    entryCount);
  if (directoryCount + fileCount + symlinkCount !== entryCount) {
    fail('prepared npm package tree counts are inconsistent');
  }
  return {
    schema: NPM_TREE_SCHEMA,
    sha256: expectSha256(record.sha256, `${label} sha256`),
    entryCount,
    directoryCount,
    fileCount,
    symlinkCount,
    byteCount: expectBoundedInteger(record.byteCount, `${label} byteCount`, 1,
      NPM_AUTHORITY_LIMITS.totalBytes),
  };
}

function parsePackageRuntimeAuthority(value: JsonValue | undefined): PackageRuntimeAuthority {
  const record = expectRecord(value, 'prepared package runtime authority');
  exactKeys(record, ['scope', 'node', 'npm'], 'prepared package runtime authority');
  if (record.scope !== RUNTIME_AUTHORITY_SCOPE) fail('prepared runtime authority scope is unsupported');
  const nodeRecord = expectRecord(record.node, 'prepared Node executable authority');
  exactKeys(nodeRecord, ['executable', 'version', 'file', 'ancestry'],
    'prepared Node executable authority');
  const nodeExecutable = expectString(nodeRecord.executable, 'prepared Node executable');
  const nodeFile = parseRuntimeFileAuthority(nodeRecord.file, 'prepared Node executable file');
  const nodeVersion = expectString(nodeRecord.version, 'prepared Node version');
  if (nodeFile.path !== nodeExecutable || !/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(
    nodeVersion,
  )) {
    fail('prepared Node executable authority is internally inconsistent');
  }
  assertSupportedNodeVersion(nodeVersion);
  const npmRecord = expectRecord(record.npm, 'prepared npm package authority');
  exactKeys(npmRecord, [
    'root',
    'cli',
    'version',
    'packageJsonSha256',
    'cliFile',
    'ancestry',
    'tree',
  ], 'prepared npm package authority');
  const npmRoot = expectString(npmRecord.root, 'prepared npm root');
  const npmCli = expectString(npmRecord.cli, 'prepared npm CLI');
  const npmCliFile = parseRuntimeFileAuthority(npmRecord.cliFile, 'prepared npm CLI file');
  const npmVersion = expectString(npmRecord.version, 'prepared npm version');
  if (
    !isAbsolute(npmRoot) || resolve(npmRoot) !== npmRoot ||
    npmCli !== join(npmRoot, 'bin', 'npm-cli.js') || npmCliFile.path !== npmCli
  ) {
    fail('prepared npm package authority paths are inconsistent');
  }
  reviewedNpmMajor(npmVersion);
  return {
    scope: RUNTIME_AUTHORITY_SCOPE,
    node: {
      executable: nodeExecutable,
      version: nodeVersion,
      file: nodeFile,
      ancestry: parseRuntimeAncestry(nodeRecord.ancestry, 'prepared Node ancestry'),
    },
    npm: {
      root: npmRoot,
      cli: npmCli,
      version: npmVersion,
      packageJsonSha256: expectSha256(
        npmRecord.packageJsonSha256,
        'prepared npm packageJsonSha256',
      ),
      cliFile: npmCliFile,
      ancestry: parseRuntimeAncestry(npmRecord.ancestry, 'prepared npm ancestry'),
      tree: parseNpmTreeAuthority(npmRecord.tree),
    },
  };
}

function parseWorkspaceRootAuthority(
  value: JsonValue | undefined,
  workspace: string,
): WorkspaceRootAuthority {
  const label = 'prepared workspace root authority';
  const record = expectRecord(value, label);
  exactKeys(record, [
    'path',
    'device',
    'inode',
    'mode',
    'uid',
    'gid',
    'linkCount',
  ], label);
  if (record.path !== workspace || record.mode !== 0o555) {
    fail('prepared workspace root authority path or finalized mode is invalid');
  }
  return {
    path: workspace,
    device: expectUnsignedDecimal(record.device, `${label} device`),
    inode: expectUnsignedDecimal(record.inode, `${label} inode`),
    mode: 0o555,
    uid: expectBoundedInteger(record.uid, `${label} uid`, 0, Number.MAX_SAFE_INTEGER),
    gid: expectBoundedInteger(record.gid, `${label} gid`, 0, Number.MAX_SAFE_INTEGER),
    linkCount: expectBoundedInteger(record.linkCount, `${label} linkCount`, 1,
      Number.MAX_SAFE_INTEGER),
  };
}

function validatePreparedState(value: JsonValue, workspace: string): PreparedState {
  const record = expectRecord(value, 'prepared package-smoke state');
  exactKeys(
    record,
    [
      'schema',
      'workspace',
      'platform',
      'arch',
      'packageVersion',
      'artifactIntegrity',
      'artifactSha256',
      'fixtureManifestSha256',
      'fixtureLockSha256',
      'packResultSha256',
      'runtimeAuthority',
      'coreConsumer',
      'chartsConsumer',
      'consumer',
      'unrelatedDirectory',
      'nodeModules',
      'workspaceSeal',
      'readOnlyWorkspace',
    ],
    'prepared package-smoke state',
  );
  if (
    record.schema !== PREPARED_STATE_SCHEMA ||
    record.workspace !== workspace ||
    record.platform !== process.platform ||
    record.arch !== process.arch ||
    record.fixtureManifestSha256 !== EXPECTED_FIXTURE_MANIFEST_SHA256 ||
    record.fixtureLockSha256 !== EXPECTED_FIXTURE_LOCK_SHA256 ||
    record.readOnlyWorkspace !== true
  ) {
    fail('prepared package-smoke state identity does not match this execution');
  }
  const expectedCore = join(workspace, 'core-consumer');
  const expectedCharts = join(workspace, 'charts-consumer');
  const expectedConsumer = join(workspace, 'consumer');
  const expectedUnrelated = join(workspace, 'unrelated-working-directory');
  const nodeModulesValue = record.nodeModules;
  if (
    record.coreConsumer !== expectedCore ||
    record.chartsConsumer !== expectedCharts ||
    record.consumer !== expectedConsumer ||
    record.unrelatedDirectory !== expectedUnrelated ||
    !Array.isArray(nodeModulesValue) ||
    nodeModulesValue.length !== 3 ||
    nodeModulesValue[0] !== join(expectedCore, 'node_modules') ||
    nodeModulesValue[1] !== join(expectedCharts, 'node_modules') ||
    nodeModulesValue[2] !== join(expectedConsumer, 'node_modules')
  ) {
    fail('prepared package-smoke state paths are invalid');
  }
  const sealValue = expectRecord(record.workspaceSeal, 'prepared workspace seal');
  exactKeys(
    sealValue,
    ['digest', 'entryCount', 'fileCount', 'byteCount', 'root', 'parentAncestry'],
    'prepared workspace seal',
  );
  const digest = expectString(sealValue.digest, 'prepared workspace digest');
  if (!/^sha256:[0-9a-f]{64}$/u.test(digest)) fail('prepared workspace digest is invalid');
  const state: PreparedState = {
    schema: PREPARED_STATE_SCHEMA,
    workspace,
    platform: process.platform,
    arch: expectString(record.arch, 'prepared architecture'),
    packageVersion: expectString(record.packageVersion, 'prepared package version'),
    artifactIntegrity: expectString(record.artifactIntegrity, 'prepared artifact integrity'),
    artifactSha256: expectString(record.artifactSha256, 'prepared artifact SHA-256'),
    fixtureManifestSha256: EXPECTED_FIXTURE_MANIFEST_SHA256,
    fixtureLockSha256: EXPECTED_FIXTURE_LOCK_SHA256,
    packResultSha256: expectString(record.packResultSha256, 'prepared pack result SHA-256'),
    runtimeAuthority: parsePackageRuntimeAuthority(record.runtimeAuthority),
    coreConsumer: expectedCore,
    chartsConsumer: expectedCharts,
    consumer: expectedConsumer,
    unrelatedDirectory: expectedUnrelated,
    nodeModules: [
      join(expectedCore, 'node_modules'),
      join(expectedCharts, 'node_modules'),
      join(expectedConsumer, 'node_modules'),
    ],
    workspaceSeal: {
      digest,
      entryCount: expectInteger(sealValue.entryCount, 'prepared workspace entry count'),
      fileCount: expectInteger(sealValue.fileCount, 'prepared workspace file count'),
      byteCount: expectInteger(sealValue.byteCount, 'prepared workspace byte count'),
      root: parseWorkspaceRootAuthority(sealValue.root, workspace),
      parentAncestry: parseRuntimeAncestry(
        sealValue.parentAncestry,
        'prepared workspace parent ancestry',
      ),
    },
    readOnlyWorkspace: record.readOnlyWorkspace,
  };
  for (const digestValue of [state.artifactSha256, state.packResultSha256]) {
    if (!/^sha256:[0-9a-f]{64}$/u.test(digestValue)) fail('prepared state has an invalid SHA-256');
  }
  assertSri512(state.artifactIntegrity, 'prepared artifact integrity');
  return state;
}

function readAndVerifyPreparedState(
  workspace: string,
  expectedStateDigest: string,
  requestedNodeExecutable?: string,
): {
  readonly state: PreparedState;
  readonly packed: PackedResult;
  readonly stateFileAuthority: RuntimeFileAuthority;
} {
  commandNodeAuthority = undefined;
  commandRuntimeAuthority = undefined;
  if (!isAbsolute(workspace) || realpathSync(workspace) !== workspace) {
    fail('execute workspace must be an existing canonical absolute directory');
  }
  const fixture = validateFixtureSources();
  const statePath = join(workspace, STATE_FILENAME);
  if (!/^sha256:[0-9a-f]{64}$/u.test(expectedStateDigest)) {
    fail('expected prepared-state digest is invalid');
  }
  const stateFileAuthority = inspectPreparedStateFileAuthority(
    workspace,
    expectedStateDigest,
  );
  const stateRaw = readRegularFileStable(
    statePath,
    undefined,
    'prepared package-smoke state',
    MAX_JSON_BYTES,
  );
  if (sha256(stateRaw) !== expectedStateDigest) {
    fail('prepared-state digest differs from the prepare output');
  }
  const state = validatePreparedState(
    parseCanonicalJsonBuffer(stateRaw, 'prepared package-smoke state'),
    workspace,
  );
  const preparedNode = state.runtimeAuthority.node;
  const canonicalNode = resolveExecutable(
    requestedNodeExecutable ?? preparedNode.executable,
    'node',
    'Node executable',
  );
  if (canonicalNode !== preparedNode.executable) fail('execute Node differs from prepared Node');
  assertPackageRuntimeAuthority(state.runtimeAuthority, 'pre-execute');
  commandNodeAuthority = {
    executable: preparedNode.executable,
    file: preparedNode.file,
    ancestry: preparedNode.ancestry,
  };
  commandRuntimeAuthority = state.runtimeAuthority;
  assertWorkspaceReadOnly(workspace, state.readOnlyWorkspace);
  assertPackageSmokeOperationalDirectories(workspace);
  commandEnvironment = packageSmokeEnvironment(
    canonicalNode,
    workspace,
    process.env,
    process.platform,
    'execute',
  );
  const artifactPath = join(workspace, 'artifact', LOCAL_TARBALL_FILENAME);
  const artifactStats = lstatSync(artifactPath);
  const artifact = readRegularFileStable(
    artifactPath,
    artifactStats.size,
    'prepared Cortexel package tarball',
    PACKAGE_TARBALL_LIMITS.compressedBytes,
  );
  if (sha256(artifact) !== state.artifactSha256 || sha512Integrity(artifact) !== state.artifactIntegrity) {
    fail('prepared Cortexel artifact bytes changed');
  }
  const packResultPath = join(workspace, PACK_RESULT_FILENAME);
  const { packed, raw: packResultRaw } = readPackedResultStable(packResultPath);
  if (sha256(packResultRaw) !== state.packResultSha256) {
    fail('prepared npm pack inventory changed');
  }
  if (
    packed.version !== state.packageVersion ||
    packed.integrity !== state.artifactIntegrity ||
    packed.name !== 'cortexel'
  ) {
    fail('prepared npm pack inventory differs from prepared state');
  }
  const expectedFiles = expectedPackageClosure(fixture.packageJson);
  inspectNpmPackageTarball(artifact, packed, expectedFiles);
  const observedSeal = fingerprintPackageSmokeWorkspace(workspace, true);
  if (!exactJsonEqual(observedSeal, state.workspaceSeal)) fail('prepared workspace seal mismatch');
  assertPreparedConsumerClosures({
    artifact,
    artifactIntegrity: state.artifactIntegrity,
    chartsConsumer: state.chartsConsumer,
    consumer: state.consumer,
    coreConsumer: state.coreConsumer,
    exactFixtureLockValue: fixture.lock,
    exactFixtureManifestRaw: fixture.manifestRaw,
    expectedFiles,
    npmVersion: state.runtimeAuthority.npm.version,
    permissionPhase: 'finalized-read-only',
  });
  const postSemanticSeal = fingerprintPackageSmokeWorkspace(workspace, true);
  if (!exactJsonEqual(postSemanticSeal, state.workspaceSeal)) {
    fail('prepared workspace changed across execute semantic revalidation');
  }
  const guardPath = join(workspace, NETWORK_GUARD_FILENAME);
  assertFinalizedHostFile(
    guardPath,
    NETWORK_AND_WRITE_GUARD,
    'package-smoke execute network-and-write guard',
  );
  commandEnvironment.NODE_OPTIONS = `--require=${JSON.stringify(guardPath)}`;
  commandEnvironment.CORTEXEL_PACKAGE_SMOKE_PHASE = 'execute';
  commandEnvironment.npm_config_offline = 'true';
  const observedNodeVersion = executableVersion(canonicalNode, 'Node');
  if (observedNodeVersion !== preparedNode.version) {
    fail('execute Node version differs from prepared Node');
  }
  assertPackageRuntimeAuthority(state.runtimeAuthority, 'post-execute preparation');
  assertPreparedStateFileAuthority(
    workspace,
    expectedStateDigest,
    stateFileAuthority,
    'post-execute preparation',
  );
  return { state, packed, stateFileAuthority };
}

export function parsePackageSmokeInvocation(argv: readonly string[]): SmokeInvocation {
  if (argv.length === 0) return { command: 'all' };
  const [command, ...rest] = argv;
  if (command !== 'prepare' && command !== 'execute') {
    fail(
      'usage: smoke-package.ts prepare --workspace ABS --node-executable ABS ' +
      '--npm-executable ABS | execute --workspace ABS --expected-state-digest sha256:HEX ' +
      '[--node-executable ABS]',
    );
  }
  let workspace: string | undefined;
  let nodeExecutable: string | undefined;
  let npmExecutable: string | undefined;
  let expectedStateDigest: string | undefined;
  for (let index = 0; index < rest.length; index += 2) {
    const option = rest[index];
    const value = rest[index + 1];
    if (value === undefined) fail(`missing value for ${String(option)}`);
    if (option === '--workspace' && workspace === undefined) workspace = value;
    else if (option === '--node-executable' && nodeExecutable === undefined) nodeExecutable = value;
    else if (option === '--npm-executable' && npmExecutable === undefined) npmExecutable = value;
    else if (option === '--expected-state-digest' && expectedStateDigest === undefined) {
      expectedStateDigest = value;
    }
    else fail(`unknown or duplicate package-smoke option ${String(option)}`);
  }
  if (workspace === undefined || !isAbsolute(workspace)) {
    fail(`${command} requires --workspace with an absolute path`);
  }
  if (command === 'execute' && npmExecutable !== undefined) {
    fail('--npm-executable is valid only during prepare');
  }
  if (command === 'prepare' && expectedStateDigest !== undefined) {
    fail('--expected-state-digest is valid only during execute');
  }
  if (command === 'execute' && expectedStateDigest === undefined) {
    fail('execute requires --expected-state-digest from the prepare output');
  }
  if (command === 'prepare' && (nodeExecutable === undefined || npmExecutable === undefined)) {
    fail('explicit prepare requires absolute --node-executable and --npm-executable paths');
  }
  return {
    command,
    workspace: resolve(workspace),
    ...(nodeExecutable === undefined ? {} : { nodeExecutable }),
    ...(npmExecutable === undefined ? {} : { npmExecutable }),
    ...(expectedStateDigest === undefined ? {} : { expectedStateDigest }),
  };
}

function phaseOutput(
  phase: SmokePhase,
  status: 'prepared' | 'passed',
  state: PreparedState,
  stateDigest: string,
): PackageSmokePhaseSuccessOutput {
  return {
    schema: PHASE_OUTPUT_SCHEMA,
    phase,
    status,
    workspace: state.workspace,
    stateFile: join(state.workspace, STATE_FILENAME),
    stateDigest,
    packageVersion: state.packageVersion,
    artifactIntegrity: state.artifactIntegrity,
    runtimeAuthority: state.runtimeAuthority,
    nodeModules: state.nodeModules,
    workspaceSeal: state.workspaceSeal.digest,
  };
}

const runtimeAnalysisProbe = `
  const inclusiveLeft = core.spikeTrialsToPsthParams(
    [{ times: [19.9], senders: [1] }],
    {
      alignmentTimesMs: [20],
      windowMs: [-0.1, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'package smoke',
    },
  );
  const exclusiveRight = core.spikeTrialsToPsthParams(
    [{ times: [0.3], senders: [1] }],
    {
      alignmentTimesMs: [0.2],
      windowMs: [0, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'package smoke',
    },
  );
  const highIndex = core.spikeRecorderToPopulationRateParams(
    { times: [49998.99999], senders: [1] },
    {
      startMs: 0,
      stopMs: 50000,
      binWidthMs: 1,
      populations: [{ id: 'E', label: 'E', senderIds: [1] }],
      unassignedPolicy: 'reject',
    },
  );
  if (!inclusiveLeft.ok || inclusiveLeft.params.values[0] !== 1 ||
      !exclusiveRight.ok || exclusiveRight.params.values[0] !== 0 ||
      !highIndex.ok || highIndex.params.series[0].spike_counts[49998] !== 1 ||
      highIndex.params.series[0].spike_counts[49999] !== 0) {
    throw new Error('packed analysis boundary semantics are incorrect');
  }
`;

const runtimeTopologyProbe = `
  const scalarSnapshot = core.normalizeSynapseCollectionSnapshot({
    source: 1,
    target: 3,
    weight: 0,
    delay: 1.5,
    target_thread: 0,
    synapse_id: 7,
    port: 0,
  });
  const snapshot = {
    source: [1, 1, 2],
    target: [3, 3, 4],
    weight: [2, -2, 0],
    delay: [1, 2, 3],
    synapse_model: ['static_synapse', 'static_synapse', 'static_synapse'],
  };
  const synapseModelSemantics = [{
    synapseModel: 'static_synapse',
    weight: 'effective',
    delay: 'effective',
  }];
  const endpointOnly = core.getConnectionsToSceneData({
    sources: [1],
    targets: [2],
  });
  const unusedMeasurementUnits = core.getConnectionsToSceneData({
    sources: [1],
    targets: [2],
  }, { weightUnits: 'pA' });
  const emptyMeasuredScene = core.getConnectionsToSceneData({
    sources: [],
    targets: [],
    weights: [],
    delays: [],
    synapse_models: [],
  }, {
    weightUnits: 'pA',
    delayUnits: 'ms',
    synapseModelSemantics: [],
  });
  const emptyMeasuredVerification = emptyMeasuredScene.ok
    ? core.detectEmptyScene(emptyMeasuredScene.data)
    : null;
  const unusedMeasurementAuthority = core.getConnectionsToSceneData({
    sources: [1],
    targets: [2],
    synapse_models: ['static_synapse'],
  }, { synapseModelSemantics });
  const common = {
    sourceIds: [1, 2],
    targetIds: [3, 4],
    snapshotTimeMs: 0,
    snapshotScope: { kind: 'single_process_complete' },
  };
  const adjacency = core.synapseCollectionToAdjacencyMatrixParams(snapshot, common);
  const graph = core.synapseCollectionToConnectionGraphParams(snapshot, {
    ...common,
    weightUnits: 'pA',
    delayUnits: 'ms',
    synapseModelSemantics,
    samplePolicy: { kind: 'complete' },
  });
  const weights = core.synapseCollectionToWeightMatrixParams(snapshot, {
    ...common,
    synapseModelSemantics,
    weightUnits: 'pA',
    aggregation: 'sum',
  });
  const delays = core.synapseCollectionToDelayMatrixParams(snapshot, {
    ...common,
    synapseModelSemantics,
    delayUnits: 'ms',
    aggregation: 'mean',
  });
  const inDegree = core.synapseCollectionToInDegreeDistributionParams(snapshot, {
    ...common,
    normalization: 'count',
  });
  const localInDegree = core.synapseCollectionToInDegreeDistributionParams(snapshot, {
    ...common,
    snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 },
    normalization: 'count',
  });
  const localOutDegree = core.synapseCollectionToOutDegreeDistributionParams(snapshot, {
    ...common,
    snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 },
    normalization: 'count',
  });
  const delayDistribution = core.synapseCollectionToDelayDistributionParams(snapshot, {
    ...common,
    synapseModelSemantics,
    delayUnits: 'ms',
    binWidthMs: 1,
    windowStartMs: 1,
    windowStopMs: 4,
    normalization: 'count',
  });
  const spatial = core.getPositionToSpatialMap2DParams(
    [[-5, 0], [5, 0]],
    {
      nodeIds: [1, 2],
      coordinateUnits: 'µm',
      extent: [10, 4],
      center: [0, 0],
      edgeWrap: false,
      positionScope: { kind: 'single_process_complete' },
    },
  );
  const largeOrigin = 1e9;
  const preciseDelay = core.synapseCollectionToDelayDistributionParams(
    {
      source: [1],
      target: [2],
      delay: [largeOrigin + 1 - 1e-6],
      synapse_model: ['static_synapse'],
    },
    {
      sourceIds: [1],
      targetIds: [2],
      snapshotTimeMs: 0,
      snapshotScope: { kind: 'single_process_complete' },
      synapseModelSemantics,
      delayUnits: 'ms',
      binWidthMs: 1,
      windowStartMs: largeOrigin,
      windowStopMs: largeOrigin + 2,
      normalization: 'count',
    },
  );
  const meanUnderflow = core.synapseCollectionToWeightMatrixParams(
    {
      source: [1, 1],
      target: [3, 3],
      weight: [-5e-324, 0],
      synapse_model: ['static_synapse', 'static_synapse'],
    },
    { ...common, synapseModelSemantics, weightUnits: 'pA', aggregation: 'mean' },
  );
  const densityOverflow = core.synapseCollectionToDelayDistributionParams(
    {
      source: [1, 1],
      target: [3, 3],
      delay: [1, 2],
      synapse_model: ['static_synapse', 'static_synapse'],
    },
    {
      ...common,
      synapseModelSemantics,
      delayUnits: 'ms',
      binWidthMs: Number.MAX_VALUE,
      windowStartMs: 0,
      windowStopMs: Number.MAX_VALUE,
      normalization: 'probability_density',
    },
  );
  const spatialDrift = core.getPositionToSpatialMap2DParams(
    [[1e15 + 0.75, 1e15]],
    {
      nodeIds: [1], coordinateUnits: 'mm', extent: [1, 1], center: [1e15, 1e15],
      edgeWrap: false, positionScope: { kind: 'single_process_complete' },
    },
  );
  const falseIdentity = graph.ok
    ? core.ConnectionGraphParamsSchema.safeParse({
        ...graph.params,
        edges: [{ ...graph.params.edges[0], id: 'not-a-canonical-id' }, ...graph.params.edges.slice(1)],
      }).success
    : true;
  if (Object.hasOwn(core, 'validateSynapseModelMeasurementSemantics') ||
      !scalarSnapshot.ok || scalarSnapshot.params.weights?.[0] !== 0 ||
      !endpointOnly.ok || unusedMeasurementUnits.ok || unusedMeasurementAuthority.ok ||
      !emptyMeasuredScene.ok ||
      Object.hasOwn(emptyMeasuredScene.data, 'networkWeightUnits') ||
      Object.hasOwn(emptyMeasuredScene.data, 'networkDelayUnits') ||
      !emptyMeasuredVerification?.valid || !emptyMeasuredVerification.empty ||
      !adjacency.ok || adjacency.params.connection_count !== 3 ||
      adjacency.params.cells[0].connection_count !== 2 ||
      !graph.ok || graph.params.edges.length !== 3 ||
      graph.params.edge_identity !== 'canonical_sorted_ordinal' ||
      !weights.ok || weights.params.cells[0].value !== 0 ||
      weights.params.cells[0].connection_count !== 2 ||
      !delays.ok || delays.params.cells[0].value !== 1.5 ||
      !inDegree.ok || inDegree.params.connection_count !== 3 ||
      localInDegree.ok || localOutDegree.ok || !delayDistribution.ok ||
      delayDistribution.params.delay_counts.join(',') !== '1,1,1' ||
      !spatial.ok || spatial.params.nodes.length !== 2 ||
      !preciseDelay.ok || preciseDelay.params.delay_counts.join(',') !== '1,0' ||
      meanUnderflow.ok || densityOverflow.ok || spatialDrift.ok || falseIdentity) {
    throw new Error('packed topology normalization or transform semantics are incorrect');
  }
`;

const runtimeManifestTopologyProbe = `
  for (const skill of manifest.skills) {
    if (skill.transform && typeof core[skill.transform.id] !== 'function') {
      throw new Error(\`manifest transform \${skill.transform.id} is not a packed core export\`);
    }
  }
  if (JSON.stringify(core.ROUTING_DISCRIMINATORS) !==
      JSON.stringify(manifest.routingDiscriminators)) {
    throw new Error('packed routing discriminators differ from the manifest');
  }
`;

const runtimeFigureContractProbe = `
  const renderSvgExportNames = Object.keys(renderSvg).sort();
  const expectedRenderSvgExportNames = [
    'buildFigure',
    'buildFigureFromJson',
    'buildFigureFromValidated',
  ];
  if (JSON.stringify(renderSvgExportNames) !== JSON.stringify(expectedRenderSvgExportNames)) {
    throw new Error('packed render-svg entry exposes raw plan or serializer authority: ' +
      JSON.stringify(renderSvgExportNames));
  }

  const identity = figure.getBuildIdentity();
  if (identity.requestContract !== 'cortexel-figure-request/1.0' ||
      identity.artifactContract !== 'cortexel-figure-artifact/1.0' ||
      identity.sourceRevision !== 'unreleased-worktree' || identity.release !== false ||
      identity.contractDigest !== contractManifest.contractDigest ||
      identity.catalogDigest !== contractManifest.catalogDigest ||
      authoring.CATALOG_DIGEST_DOMAIN !== contractManifest.catalogDigestDomain ||
      authoring.CATALOG_DIGEST !== contractManifest.catalogDigest ||
      identity.stableSkillCount !== contractManifest.stableSkillCount) {
    throw new Error('packed FigureRequest identity is incoherent');
  }
  const authoringExportNames = Object.keys(authoring).sort();
  if (JSON.stringify(authoringExportNames) !== JSON.stringify([
      'AUTHORING_SCHEMA_COMPILATION_PROFILE_V1',
      'CATALOG_DIGEST',
      'CATALOG_DIGEST_DOMAIN',
      'SKILL_AUTHORING',
      'SKILL_CATALOG',
      'SOURCE_ADAPTER_CATALOG',
      'SOURCE_ADAPTER_CATALOG_DIGEST',
      'SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN',
      'SOURCE_ADAPTER_IDS',
      'STABLE_CATALOG_SCHEMA_RESOURCES',
      'STABLE_SKILL_IDS',
      'isSourceAdapterId',
      'isStableSkillId',
      'lookupSkillCatalogEntry',
      'lookupSourceAdapter',
    ])) {
    throw new Error('packed authoring entry exposes an unexpected runtime surface: ' +
      JSON.stringify(authoringExportNames));
  }

  const inventory = [];
  for (const record of contractManifest.normativeSources) {
    if (!record.path.startsWith('contract/')) throw new Error('unsafe contract inventory path');
    const relative = record.path.slice('contract/'.length);
    if (relative.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error('unsafe contract inventory segment');
    }
    const value = JSON.parse(readFileSync(join(contractRoot, relative), 'utf8'));
    const digest = figure.sha256Digest(figure.canonicalize(value));
    if (digest !== record.digest) throw new Error('shipped contract file digest mismatch: ' + relative);
    inventory.push({ path: record.path, digest });
  }
  if (figure.sha256Digest(figure.canonicalize(inventory)) !== contractManifest.contractDigest) {
    throw new Error('shipped contract inventory does not reproduce contractDigest');
  }
  const stableIds = [...figure.STABLE_SKILL_IDS].sort();
  if (JSON.stringify([...authoring.STABLE_SKILL_IDS].sort()) !==
      JSON.stringify(stableIds) ||
      JSON.stringify(authoring.SKILL_CATALOG) !== JSON.stringify(figure.SKILL_CATALOG)) {
    throw new Error('packed authoring discovery metadata differs from figure');
  }
  for (const id of stableIds) {
    if (!authoring.isStableSkillId(id) ||
        !figure.isStableSkillId(id) ||
        authoring.lookupSkillCatalogEntry(id) !== authoring.SKILL_CATALOG[id] ||
        figure.lookupSkillCatalogEntry(id) !== figure.SKILL_CATALOG[id]) {
      throw new Error('packed stable catalog guard or lookup disagrees with its finite map');
    }
  }
  for (const id of ['', 'not.a.skill', '__proto__', 'constructor']) {
    if (authoring.isStableSkillId(id) ||
        figure.isStableSkillId(id) ||
        authoring.lookupSkillCatalogEntry(id) !== undefined ||
        figure.lookupSkillCatalogEntry(id) !== undefined) {
      throw new Error('packed stable catalog lookup admitted an unknown or prototype key');
    }
  }
  if (JSON.stringify(authoring.SOURCE_ADAPTER_IDS) !==
      JSON.stringify(['nest-spike-recorder']) ||
      Object.keys(authoring.SOURCE_ADAPTER_CATALOG.adapters).length !== 1 ||
      !authoring.isSourceAdapterId('nest-spike-recorder') ||
      authoring.lookupSourceAdapter('nest-spike-recorder') !==
        authoring.SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder']) {
    throw new Error('packed executable source-adapter discovery is incomplete');
  }
  for (const id of ['', 'nest-multimeter', '__proto__', 'constructor']) {
    if (authoring.isSourceAdapterId(id) ||
        authoring.lookupSourceAdapter(id) !== undefined) {
      throw new Error('packed source-adapter lookup admitted an unknown or prototype key');
    }
  }
  if (figure.sha256Digest(figure.canonicalize({
    domain: authoring.SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
    catalog: authoring.SOURCE_ADAPTER_CATALOG,
  })) !== authoring.SOURCE_ADAPTER_CATALOG_DIGEST) {
    throw new Error('packed source-adapter discovery bytes do not reproduce their digest');
  }
  const catalogView = {
    domain: authoring.CATALOG_DIGEST_DOMAIN,
    schemaCompilationProfile: authoring.AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
    schemaResources: authoring.STABLE_CATALOG_SCHEMA_RESOURCES,
    skills: stableIds.map((id) => ({
      ...figure.SKILL_CATALOG[id],
      ...authoring.SKILL_AUTHORING[id],
    })),
  };
  if (figure.sha256Digest(figure.canonicalize(catalogView)) !== contractManifest.catalogDigest) {
    throw new Error('packed public discovery and authoring bytes do not reproduce catalogDigest');
  }
  if (!contractManifest.stableSkills.every((skill) =>
      skill.availability === 'packaged' && skill.releaseReady === false)) {
    throw new Error('packaged availability was conflated with publication/release readiness');
  }

  const validated = figure.parseAndValidateRequest(JSON.stringify(spikeContract.examples.valid[0]));
  if (!validated.ok || validated.request.skillId !== 'neuro.spike_raster') {
    throw new Error('packed validator cannot validate a shipped living example');
  }
  const repairInput = JSON.parse(JSON.stringify(spikeContract.examples.valid[0]));
  delete repairInput.contract;
  repairInput.verified = true;
  repairInput.data.eventTimes.unit = 'milliseconds';
  const repaired = figure.applySafeRepairs(repairInput);
  if (!repaired.ok || repaired.request.skillId !== 'neuro.spike_raster' ||
      JSON.stringify(repaired.appliedRepairs.map((entry) => entry.reasonCode)) !==
        JSON.stringify([
          'PROVENANCE_CALLER_ASSURANCE_FORBIDDEN',
          'CONTRACT_MISSING',
          'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
        ]) ||
      Object.hasOwn(repairInput, 'contract') || repairInput.verified !== true ||
      repairInput.data.eventTimes.unit !== 'milliseconds') {
    throw new Error('packed safe-repair boundary is absent, non-deterministic, or mutated input');
  }
  const cappedRepairInput = JSON.parse(JSON.stringify(spikeContract.examples.valid[0]));
  cappedRepairInput.presentation = { budgetProfile: 'agent' };
  for (let index = 0; index < 200; index++) {
    cappedRepairInput['wrapper' + String(index).padStart(3, '0')] = { verified: true };
  }
  const cappedRepair = figure.applySafeRepairs(cappedRepairInput, { budgetProfile: 'agent' });
  if (cappedRepair.ok || cappedRepair.errors.length !== 32 ||
      !cappedRepair.errors.some((error) => error.code === 'RESOURCE_BUDGET_EXCEEDED') ||
      !cappedRepair.errors.some((error) => error.code === 'ERROR_LIMIT_REACHED')) {
    throw new Error('packed safe-repair boundary hid its governing operation-budget stop');
  }
  const renderedValidated = validated.ok
    ? renderSvg.buildFigureFromValidated(validated.request)
    : null;
  if (!renderedValidated?.ok || !renderedValidated.svg.startsWith('<svg')) {
    throw new Error('packed renderer rejected a capability minted by the paired validator');
  }
  const rendered = renderSvg.buildFigure(spikeContract.examples.valid[0]);
  if (!rendered.ok || !rendered.svg.startsWith('<svg')) {
    throw new Error('packed headless renderer cannot render a shipped living example');
  }
  const packagedNestSource = authoring.lookupSourceAdapter('nest-spike-recorder');
  if (packagedNestSource !== authoring.SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'] ||
      packagedNestSource.revision !== 5 ||
      JSON.stringify(Object.keys(packagedNestSource.examples)) !==
        JSON.stringify(['positiveInfinity', 'finiteStop'])) {
    throw new Error('packed NEST adapter descriptor or branch inventory is incoherent');
  }
  for (const branch of ['positiveInfinity', 'finiteStop']) {
    const example = packagedNestSource.examples[branch];
    const adapted = nestAdapter.nestSpikeRecorderToRaster(
      example.exportedStatus,
      example.options,
    );
    if (!adapted.ok || !figure.validateRequestValue(adapted.request).ok) {
      throw new Error('packed NEST adapter ' + branch +
        ' example does not pass the packed adapter and validator');
    }
  }
  if (capabilityRegistry.registry !== 'cortexel-capabilities' ||
      requestSchema.$id !== 'https://sepahead.github.io/cortexel/schemas/v1/figure-request.v1.schema.json' ||
      packageMetadata.imports?.['#cortexel-request-capability'] !==
        './dist/internal/request-capability.cjs' ||
      JSON.stringify(packageMetadata.imports?.['#cortexel-validated-request-brand']) !==
        JSON.stringify({
          types: './dist/internal/validated-request-brand.d.ts',
          import: './dist/internal/validated-request-brand.js',
          require: './dist/internal/validated-request-brand.cjs',
        })) {
    throw new Error('packaged registry/schema exports are incomplete');
  }
`;

interface PackageSmokeContext {
  readonly workspace: string;
  readonly coreConsumer: string;
  readonly chartsConsumer: string;
  readonly consumer: string;
  readonly unrelated: string;
  readonly nodeExecutable: string;
  readonly packed: PackedResult;
}

function assertInstalledNodeBinShim(
  consumer: string,
  binName: string,
  installedJavaScript: string,
): void {
  assertInstalledNodeBinShimAt(
    join(consumer, 'node_modules', '.bin'),
    binName,
    installedJavaScript,
  );
}

function assertInstalledNodeBinShimAt(
  binDirectory: string,
  binName: string,
  installedJavaScript: string,
): void {
  const targetStats = lstatSync(installedJavaScript);
  if (!targetStats.isFile() || targetStats.isSymbolicLink() || targetStats.nlink !== 1) {
    fail(`installed ${binName} JavaScript target is not a unique regular file`);
  }
  const targetText = decodeUtf8Fatal(
    readRegularFileStable(
      installedJavaScript,
      targetStats.size,
      `installed ${binName} JavaScript target`,
      4 * 1024 * 1024,
    ),
    `installed ${binName} JavaScript target`,
  );
  if (!targetText.startsWith('#!/usr/bin/env node\n')) {
    fail(`installed ${binName} JavaScript target is missing its reviewed Node shebang`);
  }
  const shim = join(binDirectory, binName);
  const shimStats = lstatSync(shim);
  if (!shimStats.isSymbolicLink()) fail(`installed ${binName} shim must be a symbolic link`);
  const linkTarget = readlinkSync(shim);
  const expectedLinkTarget = relative(dirname(shim), installedJavaScript);
  if (linkTarget !== expectedLinkTarget || realpathSync(shim) !== installedJavaScript) {
    fail(`installed ${binName} shim does not resolve to its exact JavaScript target`);
  }
  if ((statSync(shim).mode & 0o111) === 0) fail(`installed ${binName} target is not executable`);
}

function runPackageSmokeBody(phase: SmokePhase, context: PackageSmokeContext): string {
  let consumer = context.coreConsumer;
  const chartsConsumer = context.chartsConsumer;
  const fullConsumer = context.consumer;
  const unrelated = context.unrelated;
  const nodeExecutable = context.nodeExecutable;
  const packed = context.packed;
  const phaseRun = (command: string, args: string[], cwd: string): string => {
    if (command !== nodeExecutable) fail('package-smoke phase attempted a non-reviewed runtime');
    return phase === 'execute' ? run(command, args, cwd) : '';
  };
  const phaseWriteFile = (path: string, intendedUtf8: string): void => {
    if (phase === 'prepare') {
      writeFileSync(path, intendedUtf8, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
      return;
    }
    assertFinalizedHostFile(path, intendedUtf8, `package-smoke phase input ${path}`);
  };

  const packedPaths = packed.files.map((file) => file.path);
  for (const file of packed.files) {
    const packedPath = file.path;
    const expectedMode = packedPath === 'dist/cli/main.js' ? 0o755 : 0o644;
    if (file.mode !== expectedMode) {
      throw new Error(
        `tarball mode is not deterministic for ${packedPath}: ` +
        `expected ${expectedMode.toString(8)}, received ${file.mode.toString(8)}`,
      );
    }
  }
  const expectedContractFiles = packagedContractRelativeFiles(join(root, 'contract'))
    .map((relative) => `dist/contract/${relative}`);
  const actualContractFiles = packedPaths
    .filter((entry) => entry.startsWith('dist/contract/'))
    .sort();
  if (JSON.stringify(actualContractFiles) !== JSON.stringify(expectedContractFiles.sort())) {
    throw new Error('tarball contract tree differs from the closed normative package inventory');
  }
  const physicalContractManifests = packedPaths.filter(
    (entry) => entry.endsWith('contract/manifest.v1.json'),
  );
  if (physicalContractManifests.length !== 1 ||
      physicalContractManifests[0] !== 'dist/contract/manifest.v1.json') {
    throw new Error('tarball does not contain exactly one physical normative contract copy');
  }
  for (const entry of packedPaths) {
    if (
      /(^|\/)\.env(?:\.|$)/u.test(entry) ||
      /^(?:src|core|react|contract|scripts|test|python)\//u.test(entry)
    ) {
      throw new Error(`tarball contains a source or environment path: ${entry}`);
    }
  }
  if (!packedPaths.includes('package.json')) {
    throw new Error('tarball is missing package.json');
  }
  if (!packedPaths.includes('dist/internal/request-capability.cjs')) {
    throw new Error('tarball is missing the shared request-capability runtime');
  }
  for (const nominalBrandPath of [
    'dist/internal/validated-request-brand.cjs',
    'dist/internal/validated-request-brand.d.cts',
    'dist/internal/validated-request-brand.d.ts',
    'dist/internal/validated-request-brand.js',
  ]) {
    if (!packedPaths.includes(nominalBrandPath)) {
      throw new Error(`tarball is missing the shared nominal type module: ${nominalBrandPath}`);
    }
  }

  let installedRoot = join(consumer, 'node_modules', 'cortexel');
  for (const declarationPath of packedPaths.filter(
    (entry) => entry.endsWith('.d.ts') || entry.endsWith('.d.cts'),
  )) {
    const declaration = readUtf8RegularFileStable(
      join(installedRoot, ...declarationPath.split('/')),
      `packed declaration ${declarationPath}`,
      PACKAGE_TARBALL_LIMITS.fileBytes,
    );
    if (declaration.includes('requestBoundary.internal')) {
      throw new Error(
        `packed declaration leaks the private request-boundary module path: ${declarationPath}`,
      );
    }
  }
  for (const requiredNotice of [
    'THIRD_PARTY_NOTICES.md',
    'LICENSES/Apache-2.0.txt',
    'LICENSES/CC0-1.0.txt',
    'LICENSES/Matplotlib.txt',
    'LICENSES/PNNL-cividis.txt',
  ]) {
    if (!existsSync(join(installedRoot, requiredNotice))) {
      throw new Error(`packed package is missing required third-party notice ${requiredNotice}`);
    }
  }
  for (const forbiddenPeer of [
    'react',
    'react-dom',
    'three',
    '@react-three/fiber',
    'd3-force-3d',
  ]) {
    if (existsSync(join(consumer, 'node_modules', forbiddenPeer))) {
      throw new Error(`pure package probe unexpectedly installed optional peer ${forbiddenPeer}`);
    }
  }

  phaseRun(
    nodeExecutable,
    [
      '-e',
      `
        let networkDenied = false;
        let writeDenied = false;
        try { require('node:net').connect({ host: '127.0.0.1', port: 9 }); }
        catch (error) { networkDenied = String(error).includes('denied execute-phase authority'); }
        try { require('node:fs').writeFileSync('forbidden-execute-write', 'x'); }
        catch (error) { writeDenied = String(error).includes('denied execute-phase authority'); }
        if (!networkDenied || !writeDenied ||
            process.env.CORTEXEL_PACKAGE_SMOKE_PHASE !== 'execute') {
          throw new Error('execute-phase network/write guard is not active');
        }
      `,
    ],
    consumer,
  );

  phaseRun(
    nodeExecutable,
    [
      '--input-type=module',
      '-e',
      `
        import { connect } from 'node:net';
        import { resolve4 } from 'node:dns/promises';
        import { writeFileSync } from 'node:fs';
        import { open } from 'node:fs/promises';
        const denied = (error) => String(error).includes('denied execute-phase authority');
        let netDenied = false;
        let dnsDenied = false;
        let writeDenied = false;
        let handleDenied = false;
        try { connect({ host: '127.0.0.1', port: 9 }); } catch (error) { netDenied = denied(error); }
        try { await resolve4('invalid.example'); } catch (error) { dnsDenied = denied(error); }
        try { writeFileSync('forbidden-esm-write', 'x'); } catch (error) { writeDenied = denied(error); }
        const handle = await open('package.json', 'r');
        try { await handle.utimes(new Date(0), new Date(0)); }
        catch (error) { handleDenied = denied(error); }
        finally { await handle.close(); }
        if (!netDenied || !dnsDenied || !writeDenied || !handleDenied) {
          throw new Error('execute-phase ESM network/write guard is not active');
        }
      `,
    ],
    consumer,
  );

  phaseRun(
    nodeExecutable,
    [
      '--input-type=module',
      '-e',
      `
        const root = await import('cortexel');
        const core = await import('cortexel/core');
        const figure = await import('cortexel/figure');
        const authoring = await import('cortexel/authoring');
        const renderSvg = await import('cortexel/render-svg');
        const nestAdapter = await import('cortexel/adapters/nest');
        const manifest = (await import('cortexel/skills.manifest.json', {
          with: { type: 'json' },
        })).default;
        const contractManifest = (await import('cortexel/contract/manifest.json', {
          with: { type: 'json' },
        })).default;
        const spikeContract = (await import(
          'cortexel/contract/skills/neuro.spike_raster.v1.json',
          { with: { type: 'json' } },
        )).default;
        const capabilityRegistry = (await import(
          'cortexel/contract/registries/capabilities.v1.json',
          { with: { type: 'json' } },
        )).default;
        const requestSchema = (await import(
          'cortexel/contract/schemas/figure-request.v1.schema.json',
          { with: { type: 'json' } },
        )).default;
        const packageMetadata = (await import('cortexel/package.json', {
          with: { type: 'json' },
        })).default;
        let deepRenderImportBlocked = false;
        try {
          await import('cortexel/dist/render-svg/index.js');
        } catch (error) {
          deepRenderImportBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!deepRenderImportBlocked) {
          throw new Error('ESM package exports did not encapsulate the render implementation');
        }
        const { readFileSync } = await import('node:fs');
        const { dirname, join } = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const contractRoot = dirname(fileURLToPath(import.meta.resolve(
          'cortexel/contract/manifest.json',
        )));
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            typeof figure.parseAndValidateRequest !== 'function' ||
            typeof authoring.SKILL_AUTHORING !== 'object' ||
            typeof authoring.SOURCE_ADAPTER_CATALOG !== 'object' ||
            typeof authoring.lookupSourceAdapter !== 'function' ||
            typeof renderSvg.buildFigure !== 'function' ||
            typeof nestAdapter.nestSpikeRecorderToRaster !== 'function' ||
            packageMetadata.name !== 'cortexel' ||
            core.ROUTING_DISCRIMINATORS?.get_connections?.connection_graph !== 'nest.connection_graph') {
          throw new Error('ESM core exports are incomplete');
        }
        ${runtimeAnalysisProbe}
        ${runtimeTopologyProbe}
        ${runtimeManifestTopologyProbe}
        ${runtimeFigureContractProbe}
      `,
    ],
    consumer,
  );
  phaseRun(
    nodeExecutable,
    [
      '-e',
      `
        const root = require('cortexel');
        const core = require('cortexel/core');
        const figure = require('cortexel/figure');
        const authoring = require('cortexel/authoring');
        const renderSvg = require('cortexel/render-svg');
        const nestAdapter = require('cortexel/adapters/nest');
        const manifest = require('cortexel/skills.manifest.json');
        const contractManifest = require('cortexel/contract/manifest.json');
        const spikeContract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
        const capabilityRegistry = require('cortexel/contract/registries/capabilities.v1.json');
        const requestSchema = require('cortexel/contract/schemas/figure-request.v1.schema.json');
        const packageMetadata = require('cortexel/package.json');
        let deepRenderRequireBlocked = false;
        try {
          require('cortexel/dist/render-svg/index.cjs');
        } catch (error) {
          deepRenderRequireBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!deepRenderRequireBlocked) {
          throw new Error('CJS package exports did not encapsulate the render implementation');
        }
        const { readFileSync } = require('node:fs');
        const { dirname, join } = require('node:path');
        const contractRoot = dirname(require.resolve('cortexel/contract/manifest.json'));
        if (typeof root.buildVizSpec !== 'function' || typeof core.validateSpec !== 'function' ||
            typeof core.spikeRecorderToPopulationRateParams !== 'function' ||
            typeof core.correlationDetectorToCorrelogramParams !== 'function' ||
            typeof core.normalizeSynapseCollectionSnapshot !== 'function' ||
            typeof core.synapseCollectionToConnectionGraphParams !== 'function' ||
            typeof core.getPositionToSpatialMap2DParams !== 'function' ||
            typeof figure.parseAndValidateRequest !== 'function' ||
            typeof authoring.SKILL_AUTHORING !== 'object' ||
            typeof authoring.SOURCE_ADAPTER_CATALOG !== 'object' ||
            typeof authoring.lookupSourceAdapter !== 'function' ||
            typeof renderSvg.buildFigure !== 'function' ||
            typeof nestAdapter.nestSpikeRecorderToRaster !== 'function' ||
            packageMetadata.name !== 'cortexel' ||
            core.ROUTING_DISCRIMINATORS?.get_connections?.connection_graph !== 'nest.connection_graph') {
          throw new Error('CJS core exports are incomplete');
        }
        if (!Array.isArray(manifest.skills) || manifest.skills.length !== ${NEST_SKILL_IDS.length} ||
            manifest.manifestVersion !== '11' ||
            manifest.paramConstraintLanguage?.version !== ${JSON.stringify(PARAM_CONSTRAINT_LANGUAGE.version)} ||
            manifest.skillAxisVersion !== ${JSON.stringify(CORTEXEL_SKILL_VERSION)} ||
            manifest.specVersion !== ${JSON.stringify(CORTEXEL_SPEC_VERSION)} ||
            manifest.routingDiscriminators?.get_connections?.weight_matrix !== 'nest.weight_matrix' ||
            manifest.skills.find((skill) => skill.id === 'nest.connection_graph')?.transform?.id !==
              'synapseCollectionToConnectionGraphParams' ||
            manifest.skills.find((skill) => skill.id === 'nest.connectivity_matrix')?.deprecation?.replacement !==
              'nest.connection_graph') {
          throw new Error('manifest export is missing or incomplete');
        }
        ${runtimeAnalysisProbe}
        ${runtimeTopologyProbe}
        ${runtimeManifestTopologyProbe}
        ${runtimeFigureContractProbe}
      `,
    ],
    consumer,
  );

  // One process can load either conditional public surface. Every producer/consumer
  // pairing must share the exact private WeakSet, including mixed module formats.
  phaseWriteFile(
    join(consumer, 'mixed-capability-probe.mjs'),
    `
      import { createRequire } from 'node:module';
      import * as esmFigure from 'cortexel/figure';
      import * as esmRenderer from 'cortexel/render-svg';
      const require = createRequire(import.meta.url);
      const cjsFigure = require('cortexel/figure');
      const cjsRenderer = require('cortexel/render-svg');
      // An export map is API encapsulation, not a sandbox against code already
      // executing in this process: createRequire can deliberately choose a parent
      // inside another package. Even through that unsupported route, the physical
      // singleton must expose only the same validating functions, never membership
      // mutation or the private WeakSet itself.
      const packageScopedRequire = createRequire(require.resolve('cortexel/package.json'));
      const internalCapability = packageScopedRequire('#cortexel-request-capability');
      const nominalBrandRuntime = packageScopedRequire('#cortexel-validated-request-brand');
      const expectedInternalExports = [
        'isValidatedRequest',
        'parseAndValidateRequest',
        'validateRequestValue',
      ];
      if (JSON.stringify(Object.keys(internalCapability).sort()) !==
          JSON.stringify(expectedInternalExports) ||
          internalCapability.parseAndValidateRequest !== esmFigure.parseAndValidateRequest ||
          internalCapability.parseAndValidateRequest !== cjsFigure.parseAndValidateRequest) {
        throw new Error('shared request-capability runtime exposes excess authority or split identity');
      }
      if (JSON.stringify(Object.keys(nominalBrandRuntime)) !== JSON.stringify([])) {
        throw new Error('type-only validated-request brand exposes runtime authority');
      }
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const input = JSON.stringify(contract.examples.valid[0]);
      const esmValidated = esmFigure.parseAndValidateRequest(input);
      const cjsValidated = cjsFigure.parseAndValidateRequest(input);
      const repairInput = JSON.parse(input);
      delete repairInput.contract;
      const esmRepaired = esmFigure.applySafeRepairs(repairInput);
      const cjsRepaired = cjsFigure.applySafeRepairs(repairInput);
      if (!esmValidated.ok || !cjsValidated.ok || !esmRepaired.ok || !cjsRepaired.ok) {
        throw new Error('mixed-format probe could not mint validated requests');
      }
      const combinations = [
        ['ESM to ESM', esmRenderer.buildFigureFromValidated(esmValidated.request)],
        ['CJS to CJS', cjsRenderer.buildFigureFromValidated(cjsValidated.request)],
        ['ESM to CJS', cjsRenderer.buildFigureFromValidated(esmValidated.request)],
        ['CJS to ESM', esmRenderer.buildFigureFromValidated(cjsValidated.request)],
        ['repaired ESM to CJS', cjsRenderer.buildFigureFromValidated(esmRepaired.request)],
        ['repaired CJS to ESM', esmRenderer.buildFigureFromValidated(cjsRepaired.request)],
      ];
      for (const [label, result] of combinations) {
        if (!result.ok || !result.svg.startsWith('<svg')) {
          throw new Error(label + ' request-capability handoff failed');
        }
      }
      const copiedToken = { ...esmValidated.request };
      const proxiedToken = new Proxy(esmValidated.request, {});
      for (const [label, candidate] of [
        ['copied', copiedToken],
        ['proxied', proxiedToken],
      ]) {
        for (const renderer of [esmRenderer, cjsRenderer]) {
          const result = renderer.buildFigureFromValidated(candidate);
          if (result.ok || result.errors?.[0]?.code !== 'RENDER_UNVALIDATED_REQUEST') {
            throw new Error(label + ' request token forged the private WeakSet capability');
          }
        }
      }
      for (const specifier of [
        'cortexel/internal/request-capability',
        'cortexel/dist/internal/request-capability.cjs',
      ]) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        try { require(specifier); } catch (error) {
          requireBlocked = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('private capability module escaped through package exports: ' + specifier);
        }
      }
      for (const specifier of [
        'cortexel/contract/../internal/request-capability.cjs',
        'cortexel/contract/%2e%2e/internal/request-capability.cjs',
      ]) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_INVALID_MODULE_SPECIFIER';
        }
        try { require(specifier); } catch (error) {
          requireBlocked = error?.code === 'ERR_INVALID_MODULE_SPECIFIER';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('contract wildcard traversed into the private runtime: ' + specifier);
        }
      }
      let privateImportBlocked = false;
      let privateRequireBlocked = false;
      try { await import('#cortexel-request-capability'); } catch (error) {
        privateImportBlocked = error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED';
      }
      try { require('#cortexel-request-capability'); } catch (error) {
        privateRequireBlocked =
          error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED' || error?.code === 'MODULE_NOT_FOUND';
      }
      if (!privateImportBlocked || !privateRequireBlocked) {
        throw new Error('consumer reached Cortexel package-private import mapping');
      }
      for (const specifier of ['#cortexel-validated-request-brand']) {
        let importBlocked = false;
        let requireBlocked = false;
        try { await import(specifier); } catch (error) {
          importBlocked = error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED';
        }
        try { require(specifier); } catch (error) {
          requireBlocked =
            error?.code === 'ERR_PACKAGE_IMPORT_NOT_DEFINED' || error?.code === 'MODULE_NOT_FOUND';
        }
        if (!importBlocked || !requireBlocked) {
          throw new Error('consumer reached Cortexel package-private nominal brand mapping');
        }
      }
    `,
  );
  phaseRun(nodeExecutable, [join(consumer, 'mixed-capability-probe.mjs')], consumer);

  // Resolve the package from the probe module, then execute it from a directory with
  // no package.json, node_modules, or contract tree. Validation must locate schemas
  // relative to the installed bundle rather than process.cwd().
  phaseWriteFile(
    join(consumer, 'unrelated-cwd-probe.mjs'),
    `
      import * as figure from 'cortexel/figure';
      import * as renderSvg from 'cortexel/render-svg';
      import * as nestAdapter from 'cortexel/adapters/nest';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const result = figure.parseAndValidateRequest(JSON.stringify(contract.examples.valid[0]));
      if (!result.ok || typeof renderSvg.buildFigure !== 'function' ||
          typeof nestAdapter.nestSpikeRecorderToRaster !== 'function') {
        throw new Error('ESM validation failed from unrelated cwd');
      }
    `,
  );
  phaseWriteFile(
    join(consumer, 'unrelated-cwd-probe.cjs'),
    `
      const figure = require('cortexel/figure');
      const renderSvg = require('cortexel/render-svg');
      const nestAdapter = require('cortexel/adapters/nest');
      const contract = require('cortexel/contract/skills/neuro.spike_raster.v1.json');
      const result = figure.parseAndValidateRequest(JSON.stringify(contract.examples.valid[0]));
      if (!result.ok || typeof renderSvg.buildFigure !== 'function' ||
          typeof nestAdapter.nestSpikeRecorderToRaster !== 'function') {
        throw new Error('CJS validation failed from unrelated cwd');
      }
    `,
  );
  phaseRun(nodeExecutable, [join(consumer, 'unrelated-cwd-probe.mjs')], unrelated);
  phaseRun(nodeExecutable, [join(consumer, 'unrelated-cwd-probe.cjs')], unrelated);

  const installedCliEsm = join(installedRoot, 'dist', 'cli', 'main.js');
  const installedCliCjs = join(installedRoot, 'dist', 'cli', 'main.cjs');
  assertInstalledNodeBinShim(consumer, 'cortexel', installedCliEsm);
  const runInstalledCli = (args: string[]) => {
    // Execute is a finalized, globally write-denied evidence phase. Publication
    // semantics have their own CLI tests; the installed-package probe exercises the
    // complete adapter/validation/derivation/render path through --dry-run without
    // weakening this phase or running target code before the workspace seal.
    if (args.includes('--output') || args.includes('--force')) {
      fail('finalized installed-CLI probe requested forbidden publication authority');
    }
    return runResult(nodeExecutable, [installedCliEsm, ...args], unrelated);
  };

  phaseWriteFile(
    join(consumer, 'import-cli.mjs'),
    `await import(${JSON.stringify(pathToFileURL(installedCliEsm).href)});\nprocess.stdout.write('imported\\n');\n`,
  );
  phaseWriteFile(
    join(consumer, 'import-cli.cjs'),
    `require(${JSON.stringify(installedCliCjs)});\nprocess.stdout.write('imported\\n');\n`,
  );
  const authoringFixturePaths = new Map<string, string>();
  for (const skillId of SOURCE_STABLE_SKILL_IDS) {
    const authoringPath = join(unrelated, `authoring-${skillId}.json`);
    phaseWriteFile(
      authoringPath,
      `${canonicalize(SOURCE_SKILL_AUTHORING[skillId].authoringExample)}\n`,
    );
    authoringFixturePaths.set(skillId, authoringPath);
  }
  const sourceAdapterFixturePath = join(
    unrelated,
    'source-adapter-nest-spike-recorder.json',
  );
  phaseWriteFile(
    sourceAdapterFixturePath,
    `${canonicalize(SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].example)}\n`,
  );
  const sourceAdapterExample =
    SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'].example;
  const sourceAdapted = sourceNestSpikeRecorderToRaster(
    sourceAdapterExample.exportedStatus,
    sourceAdapterExample.options,
  );
  if (!sourceAdapted.ok) {
    fail('source adapter rejected the source-catalog example before package execution');
  }
  const sourceAdaptedValidation = validateSourceRequestValue(sourceAdapted.request);
  if (!sourceAdaptedValidation.ok) {
    fail('source adapter example failed the source validation pipeline before package execution');
  }
  const adaptedRequestPath = join(unrelated, 'adapted-nest-spike-raster.json');
  const expectedAdaptedRequest =
    `${canonicalize(sourceAdaptedValidation.request.canonicalRequest)}\n`;
  phaseWriteFile(adaptedRequestPath, expectedAdaptedRequest);
  if (phase === 'execute') {
    for (const importer of ['import-cli.mjs', 'import-cli.cjs']) {
      const imported = runResult(nodeExecutable, [join(consumer, importer)], unrelated);
      if (imported.status !== 0 || imported.stdout !== 'imported\n' || imported.stderr !== '') {
        throw new Error(`packed CLI import guard failed for ${importer}`);
      }
    }

    const identityResult = runInstalledCli(['identity', '--json']);
    if (identityResult.status !== 0 || identityResult.stderr !== '') {
      throw new Error('packed CLI identity command failed');
    }
    const cliIdentityValue = strictJson(identityResult.stdout, 'installed CLI identity');
    if (!isRecord(cliIdentityValue)) throw new Error('packed CLI identity is not an object');
    const cliIdentity = cliIdentityValue;
    const installedContractManifest = JSON.parse(readUtf8RegularFileStable(
      join(installedRoot, 'dist', 'contract', 'manifest.v1.json'),
      'installed contract manifest',
      MAX_JSON_BYTES,
    )) as Record<string, unknown>;
    const installedPackage = JSON.parse(readUtf8RegularFileStable(
      join(installedRoot, 'package.json'),
      'installed Cortexel package metadata',
      MAX_JSON_BYTES,
    )) as Record<string, unknown>;
    if (installedPackage.main !== './dist/index.cjs') {
      throw new Error('legacy main entry was not retained alongside package exports');
    }
    if (
      cliIdentity.packageVersion !== installedPackage.version ||
      cliIdentity.contractDigest !== installedContractManifest.contractDigest ||
      cliIdentity.catalogDigest !== installedContractManifest.catalogDigest ||
      cliIdentity.catalogDigestDomain !== installedContractManifest.catalogDigestDomain ||
      cliIdentity.sourceRevision !== 'unreleased-worktree' ||
      cliIdentity.release !== false
    ) {
      throw new Error('packed CLI identity differs from shipped package/contract bytes');
    }

    const catalogResult = runInstalledCli(['catalog', '--json']);
    if (catalogResult.status !== 0 || catalogResult.stderr !== '') {
      throw new Error('packed CLI catalog command failed');
    }
    const cliCatalog = strictJson(catalogResult.stdout, 'installed CLI catalog');
    if (
      !isRecord(cliCatalog) ||
      cliCatalog.protocol !== 'cortexel-cli-catalog' ||
      cliCatalog.protocolVersion !== 1 ||
      !Array.isArray(cliCatalog.skills)
    ) {
      throw new Error('packed CLI catalog protocol is malformed');
    }
    const catalogIds = cliCatalog.skills.map((candidate) =>
      isRecord(candidate) && typeof candidate.id === 'string' ? candidate.id : null
    );
    const manifestSkills = installedContractManifest.stableSkills;
    if (!Array.isArray(manifestSkills)) {
      throw new Error('installed contract manifest stableSkills is malformed');
    }
    const manifestIds = manifestSkills.map((candidate) =>
      isRecord(candidate) && typeof candidate.id === 'string' ? candidate.id : null
    ).sort();
    if (
      catalogIds.some((id) => id === null) ||
      JSON.stringify([...catalogIds].sort()) !== JSON.stringify(manifestIds) ||
      catalogIds.length !== 19
    ) {
      throw new Error('packed CLI catalog does not enumerate the exact stable manifest ids');
    }

    const sourceCatalogResult = runInstalledCli(['source', 'catalog', '--json']);
    if (sourceCatalogResult.status !== 0 || sourceCatalogResult.stderr !== '') {
      throw new Error('packed CLI source catalog command failed');
    }
    const cliSourceCatalog = strictJson(
      sourceCatalogResult.stdout,
      'installed CLI source catalog',
    );
    if (
      !isRecord(cliSourceCatalog) ||
      cliSourceCatalog.protocol !== 'cortexel-cli-source-catalog' ||
      cliSourceCatalog.protocolVersion !== 1 ||
      typeof cliSourceCatalog.sourceAdapterCatalogDigest !== 'string' ||
      typeof cliSourceCatalog.sourceAdapterCatalogDigestDomain !== 'string' ||
      !Array.isArray(cliSourceCatalog.adapters) ||
      cliSourceCatalog.adapters.length !== 1 ||
      !isRecord(cliSourceCatalog.adapters[0]) ||
      cliSourceCatalog.adapters[0].id !== 'nest-spike-recorder' ||
      cliSourceCatalog.adapters[0].outputSkillId !== 'neuro.spike_raster'
    ) {
      throw new Error('packed CLI source catalog protocol is malformed');
    }
    if (
      sha256(canonicalize({
        domain: cliSourceCatalog.sourceAdapterCatalogDigestDomain,
        catalog: SOURCE_ADAPTER_CATALOG,
      })) !== cliSourceCatalog.sourceAdapterCatalogDigest
    ) {
      throw new Error('packed CLI source discovery bytes do not reproduce its digest');
    }
    const sourceDescribeResult = runInstalledCli([
      'source',
      'describe',
      'nest-spike-recorder',
      '--json',
    ]);
    const sourceDescription = strictJson(
      sourceDescribeResult.stdout,
      'installed CLI source description',
    );
    if (
      sourceDescribeResult.status !== 0 ||
      sourceDescribeResult.stderr !== '' ||
      !isRecord(sourceDescription) ||
      sourceDescription.protocol !== 'cortexel-cli-source-describe' ||
      sourceDescription.protocolVersion !== 1 ||
      canonicalize(sourceDescription.adapter) !==
        canonicalize(SOURCE_ADAPTER_CATALOG.adapters['nest-spike-recorder'])
    ) {
      throw new Error('packed CLI source description differs from prepared source');
    }
    const sourceAdaptResult = runInstalledCli([
      'source',
      'adapt',
      'nest-spike-recorder',
      sourceAdapterFixturePath,
      '--format',
      'json',
    ]);
    if (sourceAdaptResult.status !== 0 || sourceAdaptResult.stderr !== '') {
      throw new Error('packed CLI source adapter rejected its copyable example');
    }
    const adaptedRequest = strictJson(
      sourceAdaptResult.stdout,
      'installed CLI adapted request',
    );
    if (
      !isRecord(adaptedRequest) ||
      !isRecord(adaptedRequest.skill) ||
      adaptedRequest.skill.id !== 'neuro.spike_raster' ||
      sourceAdaptResult.stdout !== expectedAdaptedRequest
    ) {
      throw new Error('packed CLI source adapter emitted bytes differing from prepared source');
    }
    const adaptedValidation = runInstalledCli(['validate', adaptedRequestPath]);
    const adaptedRender = runInstalledCli([
      'render',
      adaptedRequestPath,
      '--dry-run',
      '--format',
      'json',
    ]);
    if (
      adaptedValidation.status !== 0 ||
      adaptedValidation.stderr !== '' ||
      adaptedRender.status !== 0 ||
      adaptedRender.stderr !== ''
    ) {
      throw new Error('packed CLI adapted request did not validate and render end to end');
    }
    const adaptedRenderValue = strictJson(
      adaptedRender.stdout,
      'installed CLI adapted-request dry render',
    );
    const directSourceDryRun = runInstalledCli([
      'source',
      'render',
      'nest-spike-recorder',
      sourceAdapterFixturePath,
      '--dry-run',
      '--format',
      'json',
    ]);
    if (directSourceDryRun.status !== 0 || directSourceDryRun.stderr !== '') {
      throw new Error('packed CLI direct source dry render failed');
    }
    const directSourceDryRunValue = strictJson(
      directSourceDryRun.stdout,
      'installed CLI direct source dry render',
    );
    if (
      !isRecord(directSourceDryRunValue) ||
      directSourceDryRunValue.protocol !== 'cortexel-cli-source-render' ||
      directSourceDryRunValue.protocolVersion !== 1 ||
      directSourceDryRunValue.ok !== true ||
      directSourceDryRunValue.dryRun !== true ||
      !isRecord(directSourceDryRunValue.sourceAdapterExecution) ||
      directSourceDryRunValue.sourceAdapterExecution.id !== 'nest-spike-recorder' ||
      directSourceDryRunValue.sourceAdapterExecution.revision !== 5 ||
      directSourceDryRunValue.sourceAdapterExecution.catalogDigest !==
        cliSourceCatalog.sourceAdapterCatalogDigest ||
      directSourceDryRunValue.sourceAdapterExecution.catalogDigestDomain !==
        cliSourceCatalog.sourceAdapterCatalogDigestDomain ||
      directSourceDryRunValue.sourceAdapterExecution.sourceAuthentication !==
        'not_performed' ||
      directSourceDryRunValue.sourceAdapterExecution.requestDigest !==
        sourceAdaptedValidation.request.requestDigest ||
      typeof directSourceDryRunValue.sourceAdapterExecution.artifactDigest !== 'string' ||
      !/^sha256:[0-9a-f]{64}$/u.test(
        directSourceDryRunValue.sourceAdapterExecution.artifactDigest,
      ) ||
      !isRecord(adaptedRenderValue) ||
      directSourceDryRunValue.svgByteLength !== adaptedRenderValue.svgByteLength ||
      directSourceDryRunValue.tableRowsTotal !== adaptedRenderValue.tableRowsTotal
    ) {
      throw new Error('packed CLI direct source-render protocol or dry-run parity failed');
    }

    let discoveryCompilationProfile: Record<string, JsonValue> | undefined;
    let discoveryResources: JsonValue[] | undefined;
    const discoverySkills: Record<string, JsonValue>[] = [];
    for (const skillId of catalogIds as string[]) {
      const describeResult = runInstalledCli([
        'describe',
        skillId,
        '--json',
        '--section',
        'all',
      ]);
      if (describeResult.status !== 0 || describeResult.stderr !== '') {
        throw new Error(`packed CLI describe failed for ${skillId}`);
      }
      const described = strictJson(
        describeResult.stdout,
        `installed CLI describe ${skillId}`,
      );
      if (
        !isRecord(described) ||
        described.protocol !== 'cortexel-cli-describe' ||
        described.protocolVersion !== 1 ||
        described.section !== 'all' ||
        !isRecord(described.buildIdentity) ||
        described.buildIdentity.catalogDigest !== installedContractManifest.catalogDigest ||
        !isRecord(described.skill) ||
        described.skill.id !== skillId ||
        !isRecord(described.requestSchema) ||
        !isRecord(described.authoringExample) ||
        !isRecord(described.schemaCompilationProfile) ||
        !Array.isArray(described.schemaResources)
      ) {
        throw new Error(`packed CLI describe protocol is malformed for ${skillId}`);
      }
      if (
        !isRecord(described.authoringExample.source) ||
        described.authoringExample.source.kind !== 'synthetic_fixture'
      ) {
        throw new Error(`packed CLI authoring fixture is not synthetic for ${skillId}`);
      }
      if (discoveryResources === undefined) {
        discoveryResources = described.schemaResources;
      } else if (
        canonicalize(discoveryResources) !== canonicalize(described.schemaResources)
      ) {
        throw new Error('packed CLI describe schema resources differ between skills');
      }
      if (discoveryCompilationProfile === undefined) {
        discoveryCompilationProfile = described.schemaCompilationProfile;
      } else if (
        canonicalize(discoveryCompilationProfile) !==
          canonicalize(described.schemaCompilationProfile)
      ) {
        throw new Error('packed CLI describe schema compilation profiles differ between skills');
      }
      discoverySkills.push({
        ...described.skill,
        requestSchema: described.requestSchema,
        authoringExample: described.authoringExample,
      });

      const authoringPath = authoringFixturePaths.get(skillId);
      if (authoringPath === undefined) {
        throw new Error(`packed CLI described an unprepared stable skill ${skillId}`);
      }
      if (
        readUtf8RegularFileStable(
          authoringPath,
          `prepared authoring fixture ${skillId}`,
          MAX_JSON_BYTES,
        ) !== `${canonicalize(described.authoringExample)}\n`
      ) {
        throw new Error(`packed CLI authoring fixture differs from prepared source for ${skillId}`);
      }
      const validateResult = runInstalledCli(['validate', authoringPath]);
      if (validateResult.status !== 0 || validateResult.stderr !== '') {
        throw new Error(`packed CLI rejected its own authoring fixture for ${skillId}`);
      }
    }
    discoverySkills.sort((left, right) =>
      String(left.id) < String(right.id) ? -1 : String(left.id) > String(right.id) ? 1 : 0
    );
    if (
      discoveryResources === undefined ||
      discoveryCompilationProfile === undefined ||
      sha256(canonicalize({
        domain: installedContractManifest.catalogDigestDomain,
        schemaCompilationProfile: discoveryCompilationProfile,
        schemaResources: discoveryResources,
        skills: discoverySkills,
      })) !== installedContractManifest.catalogDigest
    ) {
      throw new Error('packed CLI discovery bytes do not reproduce catalogDigest');
    }

    const unknownResult = runInstalledCli([
      'describe',
      'neuro.reponse_curve',
      '--json',
    ]);
    const unknownPayload = strictJson(
      unknownResult.stderr,
      'installed CLI unknown-skill error',
    );
    if (
      unknownResult.status !== 2 ||
      unknownResult.stdout !== '' ||
      !isRecord(unknownPayload) ||
      unknownPayload.protocol !== 'cortexel-cli-error' ||
      !isRecord(unknownPayload.error) ||
      unknownPayload.error.code !== 'CLI_UNKNOWN_STABLE_SKILL' ||
      unknownPayload.error.didYouMean !== 'neuro.response_curve'
    ) {
      throw new Error('packed CLI unknown-skill protocol is malformed');
    }
    const unknownSourceResult = runInstalledCli([
      'source',
      'describe',
      'nest-multimeter',
      '--json',
    ]);
    const unknownSourcePayload = strictJson(
      unknownSourceResult.stderr,
      'installed CLI unknown-source error',
    );
    if (
      unknownSourceResult.status !== 2 ||
      unknownSourceResult.stdout !== '' ||
      !isRecord(unknownSourcePayload) ||
      unknownSourcePayload.protocol !== 'cortexel-cli-error' ||
      !isRecord(unknownSourcePayload.error) ||
      unknownSourcePayload.error.code !== 'CLI_UNKNOWN_SOURCE_ADAPTER'
    ) {
      throw new Error('packed CLI unknown-source protocol is malformed');
    }
  }

  const validRequestPath = join(unrelated, 'valid.json');
  const malformedPath = join(unrelated, 'malformed.json');
  const structuralPath = join(unrelated, 'structural.json');
  const legacyPath = join(unrelated, 'legacy.json');
  const installedSpikeContract = JSON.parse(readUtf8RegularFileStable(
    join(installedRoot, 'dist', 'contract', 'skills', 'neuro.spike_raster.v1.json'),
    'installed spike-raster contract',
    MAX_JSON_BYTES,
  )) as { examples: { valid: unknown[] } };
  phaseWriteFile(validRequestPath, `${JSON.stringify(installedSpikeContract.examples.valid[0])}\n`);
  phaseWriteFile(malformedPath, '{');
  phaseWriteFile(structuralPath, '{}\n');
  phaseWriteFile(
    legacyPath,
    '{"skill":{"id":"nest.voltage_trace"},"data":{},"parameters":{}}\n',
  );
  const cliExitCases: Array<{ args: string[]; expected: number }> = [
    { args: [], expected: 2 },
    { args: ['validate', validRequestPath], expected: 0 },
    { args: ['validate', malformedPath], expected: 3 },
    { args: ['validate', structuralPath], expected: 4 },
    { args: ['migrate', legacyPath], expected: 5 },
    { args: ['validate', join(unrelated, 'absent.json')], expected: 7 },
  ];
  if (phase === 'execute') {
    for (const testCase of cliExitCases) {
      const result = runInstalledCli(testCase.args);
      if (result.status !== testCase.expected) {
        throw new Error(
          `packed CLI exit mismatch: expected ${testCase.expected}, got ${result.status}`,
        );
      }
    }
  }

  consumer = chartsConsumer;
  installedRoot = join(consumer, 'node_modules', 'cortexel');
  for (const forbiddenHeavyPeer of ['three', '@react-three/fiber', 'd3-force-3d']) {
    if (existsSync(join(consumer, 'node_modules', forbiddenHeavyPeer))) {
      throw new Error(`chart-only probe unexpectedly installed heavy peer ${forbiddenHeavyPeer}`);
    }
  }

  // The canonical chart subpath is intentionally React + SVG only. Exercise it
  // before installing three/r3f/d3 so an accidental heavyweight import fails.
  for (const mode of ['import', 'require'] as const) {
    const expression = mode === 'import'
      ? `
          const charts = await import('cortexel/react/charts');
          if (typeof charts.ReferenceVizSpecFigure !== 'function' ||
              typeof charts.ReferenceChartScene !== 'function' ||
              Object.hasOwn(charts, 'CheckedReferenceChartScene') ||
              typeof charts.binnedStepPath !== 'function' ||
              typeof charts.boundedStemPointPaths !== 'function' ||
              typeof charts.matrixValueBucketPaths !== 'function' ||
              typeof charts.circleTopologyGeometry !== 'function' ||
              typeof charts.equalAspectDomains !== 'function' ||
              charts.REFERENCE_CHART_SKILLS?.length !== 19 ||
              !charts.REFERENCE_CHART_SKILLS.includes('nest.spatial_map_2d')) {
            throw new Error('ESM chart exports are incomplete');
          }
        `
      : `
          const charts = require('cortexel/react/charts');
          if (typeof charts.ReferenceVizSpecFigure !== 'function' ||
              typeof charts.ReferenceChartScene !== 'function' ||
              Object.hasOwn(charts, 'CheckedReferenceChartScene') ||
              typeof charts.binnedStepPath !== 'function' ||
              typeof charts.boundedStemPointPaths !== 'function' ||
              typeof charts.matrixValueBucketPaths !== 'function' ||
              typeof charts.circleTopologyGeometry !== 'function' ||
              typeof charts.equalAspectDomains !== 'function' ||
              charts.REFERENCE_CHART_SKILLS?.length !== 19 ||
              !charts.REFERENCE_CHART_SKILLS.includes('nest.spatial_map_2d')) {
            throw new Error('CJS chart exports are incomplete');
          }
        `;
    phaseRun(
      nodeExecutable,
      mode === 'import'
        ? ['--input-type=module', '-e', expression]
        : ['-e', expression],
      consumer,
    );
  }

  consumer = fullConsumer;
  installedRoot = join(consumer, 'node_modules', 'cortexel');

  for (const mode of ['import', 'require'] as const) {
    const expression =
      mode === 'import'
        ? `
            const react = await import('cortexel/react');
            const graph = await import('cortexel/react/knowledge-graph');
            if (typeof react.VizSpecRenderer !== 'function' ||
                typeof react.PopulationA11yList !== 'function' ||
                typeof react.NeuronA11yPager !== 'function' ||
                typeof graph.KnowledgeGraph3DScene !== 'function' ||
                typeof graph.KnowledgeGraphLegend !== 'function') {
              throw new Error('ESM React exports are incomplete');
            }
          `
        : `
            const react = require('cortexel/react');
            const graph = require('cortexel/react/knowledge-graph');
            if (typeof react.VizSpecRenderer !== 'function' ||
                typeof react.PopulationA11yList !== 'function' ||
                typeof react.NeuronA11yPager !== 'function' ||
                typeof graph.KnowledgeGraph3DScene !== 'function' ||
                typeof graph.KnowledgeGraphLegend !== 'function') {
              throw new Error('CJS React exports are incomplete');
            }
          `;
    phaseRun(
      nodeExecutable,
      mode === 'import'
        ? ['--input-type=module', '-e', expression]
        : ['-e', expression],
      consumer,
    );
  }

  // Prove the published conditional declarations work in a real consumer, not
  // only under Cortexel's source tsconfig. .ts selects import types; .cts selects
  // require types under NodeNext.
  phaseWriteFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        jsx: 'react-jsx',
        types: ['node'],
      },
      include: [
        'consumer.ts',
        'consumer.cts',
        'brand-producer.mts',
        'brand-consumer.cts',
        'brand-producer.cts',
        'brand-consumer.mts',
      ],
    }),
  );
  phaseWriteFile(
    join(consumer, 'consumer.ts'),
    `
      import { buildVizSpec } from 'cortexel';
      import {
        applySafeRepairs,
        getBuildIdentity,
        parseAndValidateRequest,
        type AppliedSafeRepair,
        type InputAssurance,
        type SafeRepairOutcome,
        type ValidatedRequest,
      } from 'cortexel/figure';
      import {
        AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
        CATALOG_DIGEST as AUTHORING_CATALOG_DIGEST,
        lookupSkillCatalogEntry as lookupAuthoringSkillCatalogEntry,
        SKILL_AUTHORING,
        SKILL_CATALOG as AUTHORING_SKILL_CATALOG,
        STABLE_CATALOG_SCHEMA_RESOURCES,
        STABLE_SKILL_IDS as AUTHORING_STABLE_SKILL_IDS,
        type SkillAuthoringEntry,
        type SkillCatalogEntry,
        type StableSkillId,
      } from 'cortexel/authoring';
      import {
        buildFigure,
        buildFigureFromJson,
        buildFigureFromValidated,
        type FigureFailure,
        type FigureResult,
      } from 'cortexel/render-svg';
      import * as renderSvgSurface from 'cortexel/render-svg';
      import {
        nestSpikeRecorderToRaster,
        type NestSpikeExport,
        type NestSpikeOptions,
      } from 'cortexel/adapters/nest';
      import {
        correlationDetectorToCorrelogramParams,
        ROUTING_DISCRIMINATORS,
        getPositionToSpatialMap2DParams,
        normalizeSynapseCollectionSnapshot,
        spikeRecorderToIsiParams,
        spikeRecorderToPopulationRateParams,
        spikeTrialsToPsthParams,
        synapseCollectionToAdjacencyMatrixParams,
        synapseCollectionToConnectionGraphParams,
        synapseCollectionToDelayDistributionParams,
        synapseCollectionToDelayMatrixParams,
        synapseCollectionToInDegreeDistributionParams,
        synapseCollectionToOutDegreeDistributionParams,
        synapseCollectionToWeightMatrixParams,
        validateHostRendererSpec,
        type ConnectionGraphOptions,
        type DelayDistributionOptions,
        type GetConnectionsSceneOptions,
        type NestTopologyResult,
        type SpatialMap2DOptions,
        type SynapseModelMeasurementSemantics,
        type WeightMatrixParams,
      } from 'cortexel/core';
      import * as coreSurface from 'cortexel/core';
      import {
        NeuronA11yPager,
        PopulationA11yList,
        VizSpecRenderer,
        type RenderSceneArgs,
      } from 'cortexel/react';
      import {
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
        KnowledgeGraphLegend,
      } from 'cortexel/react/knowledge-graph';
      import {
        ReferenceVizSpecFigure,
        aggregateDegreeBins,
        aggregateUniformHistogramBins,
        binnedStepPath,
        boundedStemPointPaths,
        circleTopologyGeometry,
        equalAspectDomains,
        matrixValueBucketPaths,
      } from 'cortexel/react/charts';
      import * as chartSurface from 'cortexel/react/charts';

      const authored = buildVizSpec({
        skill: 'nest.spike_raster',
        params: { times_ms: [1], senders: [1] },
        source: 'type-smoke',
      });
      const checkedRequest = parseAndValidateRequest('{}');
      if (checkedRequest.ok) buildFigureFromValidated(checkedRequest.request);
      const safeRepairOutcome: SafeRepairOutcome = applySafeRepairs('{}');
      const safeRepairAudit = {} as AppliedSafeRepair;
      const args = {} as RenderSceneArgs;
      const graphOptions = {} as ConnectionGraphOptions;
      const delayOptions = {} as DelayDistributionOptions;
      const connectionSceneOptions = {} as GetConnectionsSceneOptions;
      const modelSemantics = {} as SynapseModelMeasurementSemantics;
      const spatialOptions = {} as SpatialMap2DOptions;
      const topologyResult = {} as NestTopologyResult<WeightMatrixParams>;
      const assurance = {} as InputAssurance;
      const validatedRequest = {} as ValidatedRequest;
      const authoringSkillId: StableSkillId = 'neuro.spike_raster';
      const authoringEntry: SkillAuthoringEntry = SKILL_AUTHORING[authoringSkillId];
      const authoringCatalogEntry: SkillCatalogEntry =
        AUTHORING_SKILL_CATALOG[authoringSkillId];
      const figureResult = {} as FigureResult;
      const figureFailure = {} as FigureFailure;
      const nestExport = {} as NestSpikeExport;
      const nestOptions = {} as NestSpikeOptions;
      // @ts-expect-error the raw serializer is intentionally compiler-internal
      void renderSvgSurface.renderSvg;
      // @ts-expect-error resource accounting is intentionally compiler-internal
      void renderSvgSurface.countPlanResources;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatNumber;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatCoordinate;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvgSurface.formatWithUnit;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvgSurface.linearScale;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvgSurface.linearTicks;
      // @ts-expect-error callers cannot import a plan-construction grammar
      type ForbiddenRenderPlan = import('cortexel/render-svg').RenderPlanV1;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenPanel = import('cortexel/render-svg').Panel;
      // @ts-expect-error the checked chart dispatcher is package-internal
      void chartSurface.CheckedReferenceChartScene;
      // @ts-expect-error raw model-semantics validation is package-internal
      void coreSurface.validateSynapseModelMeasurementSemantics;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenMark = import('cortexel/render-svg').Mark;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAxis = import('cortexel/render-svg').Axis;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenTableModel = import('cortexel/render-svg').TableModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAccessibilityModel = import('cortexel/render-svg').AccessibilityModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenDisclosureBlock = import('cortexel/render-svg').DisclosureBlock;
      // @ts-expect-error callers cannot import the raw serializer report
      type ForbiddenSvgReport = import('cortexel/render-svg').SvgReport;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenLinearScale = import('cortexel/render-svg').LinearScale;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenTick = import('cortexel/render-svg').Tick;
      // @ts-expect-error the package export map encapsulates built implementation files
      type ForbiddenDeepRenderModule = typeof import('cortexel/dist/render-svg/index.js');
      // @ts-expect-error the shared capability registry is package-private
      type ForbiddenCapabilityModule = typeof import('cortexel/internal/request-capability');
      // @ts-expect-error package imports do not leak into the consumer package scope
      type ForbiddenPrivateImport = typeof import('#cortexel-request-capability');
      // @ts-expect-error the package-private nominal brand is not a consumer import
      type ForbiddenNominalBrandImport = typeof import('#cortexel-validated-request-brand');
      // @ts-expect-error unknown stable skill ids are rejected by the authoring map
      void SKILL_AUTHORING['not.a.skill'];
      const unknownCatalogEntry: SkillCatalogEntry | undefined =
        lookupAuthoringSkillCatalogEntry('not.a.skill');
      // @ts-expect-error an untrusted catalog lookup cannot be assumed present
      const requiredUnknownCatalogEntry: SkillCatalogEntry =
        lookupAuthoringSkillCatalogEntry('not.a.skill');
      // @ts-expect-error unknown literals are not keys of the finite catalog
      void AUTHORING_SKILL_CATALOG['not.a.skill'];
      void [
        authored,
        safeRepairOutcome,
        safeRepairAudit,
        applySafeRepairs,
        getBuildIdentity,
        parseAndValidateRequest,
        buildFigure,
        buildFigureFromJson,
        buildFigureFromValidated,
        nestSpikeRecorderToRaster,
        assurance,
        validatedRequest,
        AUTHORING_CATALOG_DIGEST,
        AUTHORING_SCHEMA_COMPILATION_PROFILE_V1.options.strictRequired,
        AUTHORING_STABLE_SKILL_IDS,
        STABLE_CATALOG_SCHEMA_RESOURCES,
        authoringEntry.requestSchema,
        authoringEntry.authoringExample,
        authoringCatalogEntry.id,
        unknownCatalogEntry,
        requiredUnknownCatalogEntry,
        figureResult,
        figureFailure,
        nestExport,
        nestOptions,
        args.skill,
        validateHostRendererSpec,
        spikeRecorderToIsiParams,
        spikeTrialsToPsthParams,
        spikeRecorderToPopulationRateParams,
        correlationDetectorToCorrelogramParams,
        ROUTING_DISCRIMINATORS,
        graphOptions,
        delayOptions,
        connectionSceneOptions,
        modelSemantics,
        spatialOptions,
        topologyResult,
        normalizeSynapseCollectionSnapshot,
        synapseCollectionToConnectionGraphParams,
        synapseCollectionToAdjacencyMatrixParams,
        synapseCollectionToWeightMatrixParams,
        synapseCollectionToDelayMatrixParams,
        synapseCollectionToInDegreeDistributionParams,
        synapseCollectionToOutDegreeDistributionParams,
        synapseCollectionToDelayDistributionParams,
        getPositionToSpatialMap2DParams,
        VizSpecRenderer,
        PopulationA11yList,
        NeuronA11yPager,
        ReferenceVizSpecFigure,
        binnedStepPath,
        boundedStemPointPaths,
        matrixValueBucketPaths,
        circleTopologyGeometry,
        aggregateDegreeBins,
        aggregateUniformHistogramBins,
        equalAspectDomains,
        KnowledgeGraph3DScene,
        KnowledgeGraphA11yList,
        KnowledgeGraphLegend,
      ];
    `,
  );
  phaseWriteFile(
    join(consumer, 'consumer.cts'),
    `
      import cortexel = require('cortexel');
      import core = require('cortexel/core');
      import figure = require('cortexel/figure');
      import authoring = require('cortexel/authoring');
      import renderSvg = require('cortexel/render-svg');
      import nestAdapter = require('cortexel/adapters/nest');
      import react = require('cortexel/react');
      import charts = require('cortexel/react/charts');
      import graph = require('cortexel/react/knowledge-graph');
      const build: typeof cortexel.buildVizSpec = core.buildVizSpec;
      const graphOptions = {} as core.ConnectionGraphOptions;
      const delayOptions = {} as core.DelayDistributionOptions;
      const connectionSceneOptions = {} as core.GetConnectionsSceneOptions;
      const modelSemantics = {} as core.SynapseModelMeasurementSemantics;
      const spatialOptions = {} as core.SpatialMap2DOptions;
      const topologyResult = {} as core.NestTopologyResult<core.WeightMatrixParams>;
      const assurance = {} as figure.InputAssurance;
      const validatedRequest = {} as figure.ValidatedRequest;
      const authoringSkillId: authoring.StableSkillId = 'neuro.spike_raster';
      const authoringEntry: authoring.SkillAuthoringEntry =
        authoring.SKILL_AUTHORING[authoringSkillId];
      const authoringCatalogEntry: authoring.SkillCatalogEntry =
        authoring.SKILL_CATALOG[authoringSkillId];
      const figureResult = {} as renderSvg.FigureResult;
      const figureFailure = {} as renderSvg.FigureFailure;
      const nestExport = {} as nestAdapter.NestSpikeExport;
      const nestOptions = {} as nestAdapter.NestSpikeOptions;
      const checkedRequest = figure.parseAndValidateRequest('{}');
      if (checkedRequest.ok) renderSvg.buildFigureFromValidated(checkedRequest.request);
      const safeRepairOutcome: figure.SafeRepairOutcome = figure.applySafeRepairs('{}');
      const safeRepairAudit = {} as figure.AppliedSafeRepair;
      // @ts-expect-error the raw serializer is intentionally compiler-internal
      void renderSvg.renderSvg;
      // @ts-expect-error resource accounting is intentionally compiler-internal
      void renderSvg.countPlanResources;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatNumber;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatCoordinate;
      // @ts-expect-error deterministic formatting is an internal renderer primitive
      void renderSvg.formatWithUnit;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvg.linearScale;
      // @ts-expect-error deterministic scales are internal renderer primitives
      void renderSvg.linearTicks;
      // @ts-expect-error callers cannot import a plan-construction grammar
      type ForbiddenRenderPlan = renderSvg.RenderPlanV1;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenPanel = renderSvg.Panel;
      // @ts-expect-error the checked chart dispatcher is package-internal
      void charts.CheckedReferenceChartScene;
      // @ts-expect-error raw model-semantics validation is package-internal
      void core.validateSynapseModelMeasurementSemantics;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenMark = renderSvg.Mark;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAxis = renderSvg.Axis;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenTableModel = renderSvg.TableModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenAccessibilityModel = renderSvg.AccessibilityModel;
      // @ts-expect-error callers cannot import plan-construction types
      type ForbiddenDisclosureBlock = renderSvg.DisclosureBlock;
      // @ts-expect-error callers cannot import the raw serializer report
      type ForbiddenSvgReport = renderSvg.SvgReport;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenLinearScale = renderSvg.LinearScale;
      // @ts-expect-error deterministic scales are internal renderer types
      type ForbiddenTick = renderSvg.Tick;
      // @ts-expect-error the package export map encapsulates built implementation files
      type ForbiddenDeepRenderModule = typeof import('cortexel/dist/render-svg/index.cjs');
      // @ts-expect-error the shared capability registry is package-private
      type ForbiddenCapabilityModule = typeof import('cortexel/internal/request-capability');
      // @ts-expect-error package imports do not leak into the consumer package scope
      type ForbiddenPrivateImport = typeof import('#cortexel-request-capability');
      // @ts-expect-error the package-private nominal brand is not a consumer import
      type ForbiddenNominalBrandImport = typeof import('#cortexel-validated-request-brand');
      // @ts-expect-error unknown stable skill ids are rejected by the authoring map
      void authoring.SKILL_AUTHORING['not.a.skill'];
      const unknownCatalogEntry: authoring.SkillCatalogEntry | undefined =
        authoring.lookupSkillCatalogEntry('not.a.skill');
      // @ts-expect-error an untrusted catalog lookup cannot be assumed present
      const requiredUnknownCatalogEntry: authoring.SkillCatalogEntry =
        authoring.lookupSkillCatalogEntry('not.a.skill');
      // @ts-expect-error unknown literals are not keys of the finite catalog
      void authoring.SKILL_CATALOG['not.a.skill'];
      void [
        build,
        safeRepairOutcome,
        safeRepairAudit,
        figure.applySafeRepairs,
        figure.getBuildIdentity,
        figure.parseAndValidateRequest,
        renderSvg.buildFigure,
        renderSvg.buildFigureFromJson,
        renderSvg.buildFigureFromValidated,
        nestAdapter.nestSpikeRecorderToRaster,
        assurance,
        validatedRequest,
        authoring.CATALOG_DIGEST,
        authoring.AUTHORING_SCHEMA_COMPILATION_PROFILE_V1.options.strictRequired,
        authoring.STABLE_SKILL_IDS,
        authoring.STABLE_CATALOG_SCHEMA_RESOURCES,
        authoringEntry.requestSchema,
        authoringEntry.authoringExample,
        authoringCatalogEntry.id,
        unknownCatalogEntry,
        requiredUnknownCatalogEntry,
        figureResult,
        figureFailure,
        nestExport,
        nestOptions,
        core.ROUTING_DISCRIMINATORS,
        graphOptions,
        delayOptions,
        connectionSceneOptions,
        modelSemantics,
        spatialOptions,
        topologyResult,
        core.spikeRecorderToIsiParams,
        core.spikeTrialsToPsthParams,
        core.spikeRecorderToPopulationRateParams,
        core.correlationDetectorToCorrelogramParams,
        core.normalizeSynapseCollectionSnapshot,
        core.synapseCollectionToConnectionGraphParams,
        core.synapseCollectionToAdjacencyMatrixParams,
        core.synapseCollectionToWeightMatrixParams,
        core.synapseCollectionToDelayMatrixParams,
        core.synapseCollectionToInDegreeDistributionParams,
        core.synapseCollectionToOutDegreeDistributionParams,
        core.synapseCollectionToDelayDistributionParams,
        core.getPositionToSpatialMap2DParams,
        react.VizSpecRenderer,
        charts.ReferenceVizSpecFigure,
        charts.binnedStepPath,
        charts.boundedStemPointPaths,
        charts.matrixValueBucketPaths,
        charts.circleTopologyGeometry,
        charts.aggregateDegreeBins,
        charts.aggregateUniformHistogramBins,
        charts.equalAspectDomains,
        graph.KnowledgeGraph3DScene,
        graph.KnowledgeGraphLegend,
      ];
    `,
  );
  phaseWriteFile(
    join(consumer, 'brand-producer.mts'),
    `
      import { applySafeRepairs } from 'cortexel/figure';
      export type EsmRepairedRequest =
        Extract<ReturnType<typeof applySafeRepairs>, { readonly ok: true }>['request'];
    `,
  );
  phaseWriteFile(
    join(consumer, 'brand-consumer.cts'),
    `
      import renderSvg = require('cortexel/render-svg');
      import type { EsmRepairedRequest } from './brand-producer.mjs';
      declare const request: EsmRepairedRequest;
      renderSvg.buildFigureFromValidated(request);
    `,
  );
  phaseWriteFile(
    join(consumer, 'brand-producer.cts'),
    `
      import figure = require('cortexel/figure');
      export type CjsRepairedRequest =
        Extract<ReturnType<typeof figure.applySafeRepairs>, { readonly ok: true }>['request'];
    `,
  );
  phaseWriteFile(
    join(consumer, 'brand-consumer.mts'),
    `
      import { buildFigureFromValidated } from 'cortexel/render-svg';
      import type { CjsRepairedRequest } from './brand-producer.cjs';
      declare const request: CjsRepairedRequest;
      buildFigureFromValidated(request);
    `,
  );
  const installedTsc = join(consumer, 'node_modules', 'typescript', 'bin', 'tsc');
  assertInstalledNodeBinShim(consumer, 'tsc', installedTsc);
  phaseRun(
    nodeExecutable,
    [installedTsc, '-p', 'tsconfig.json'],
    consumer,
  );

  // Guard that the packed manifest is the exact deterministic artifact emitted
  // by this source tree, not merely a version-compatible stale file.
  const installedManifest = readUtf8RegularFileStable(
    join(consumer, 'node_modules/cortexel/dist/skills.manifest.json'),
    'installed skills manifest',
    MAX_JSON_BYTES,
  );
  if (installedManifest !== serializeManifest()) {
    throw new Error('packed skills manifest differs from the deterministic source emit');
  }
  const packageJson = JSON.parse(
    readUtf8RegularFileStable(
      join(consumer, 'node_modules/cortexel/package.json'),
      'installed Cortexel package metadata',
      MAX_JSON_BYTES,
    ),
  ) as { version: string };
  return packageJson.version;
}

export function preparePackageSmokeWorkspace(options: {
  readonly workspace: string;
  readonly nodeExecutable?: string;
  readonly npmExecutable?: string;
}): PackageSmokePhaseSuccessOutput {
  if (process.platform === 'win32') {
    fail('package smoke currently requires POSIX process-group semantics');
  }
  commandNodeAuthority = undefined;
  commandRuntimeAuthority = undefined;
  const workspace = canonicalWorkspacePath(options.workspace);
  const fixture = validateFixtureSources();
  if (existsSync(join(root, '.npmrc'))) {
    fail('package smoke rejects project-local npm configuration');
  }
  assertEmptyWorkspace(workspace);
  const nodeExecutable = resolveExecutable(options.nodeExecutable, 'node', 'Node executable');
  const nodeFileAuthority = inspectNodeExecutableAuthority(nodeExecutable);
  commandNodeAuthority = nodeFileAuthority;
  createPackageSmokeOperationalDirectories(workspace);
  assertPackageSmokeOperationalDirectories(workspace);
  commandEnvironment = packageSmokeEnvironment(nodeExecutable, workspace);
  const nodeVersion = executableVersion(nodeExecutable, 'Node');
  assertSupportedNodeVersion(nodeVersion);
  const npmExecutable = resolveNpmCli(options.npmExecutable);
  const npmAuthority = inspectNpmPackageAuthority(npmExecutable);
  const runtimeAuthority: PackageRuntimeAuthority = {
    scope: RUNTIME_AUTHORITY_SCOPE,
    node: { ...nodeFileAuthority, version: nodeVersion },
    npm: npmAuthority,
  };
  commandRuntimeAuthority = runtimeAuthority;
  const npmVersion = nodeCliVersion(nodeExecutable, npmExecutable, 'npm');
  if (npmVersion !== npmAuthority.version) {
    fail('npm CLI version differs from its package manifest authority');
  }
  const npmMajor = reviewedNpmMajor(npmVersion);
  commandEnvironment.CORTEXEL_PACKAGE_SMOKE_PHASE = 'prepare';
  commandEnvironment.npm_config_ignore_scripts = 'true';
  commandEnvironment.npm_config_audit = 'false';
  commandEnvironment.npm_config_fund = 'false';
  commandEnvironment.npm_config_legacy_peer_deps = 'true';
  commandEnvironment.npm_config_install_strategy = 'nested';

  const artifactDirectory = join(workspace, 'artifact');
  const coreConsumer = join(workspace, 'core-consumer');
  const chartsConsumer = join(workspace, 'charts-consumer');
  const consumer = join(workspace, 'consumer');
  const unrelated = join(workspace, 'unrelated-working-directory');
  const npmUserConfig = join(workspace, 'npm-userconfig');
  const npmGlobalConfig = join(workspace, 'npm-globalconfig');
  writeFileSync(npmUserConfig, '# isolated package-smoke npm user config\n', { flag: 'wx' });
  writeFileSync(npmGlobalConfig, '# isolated package-smoke npm global config\n', { flag: 'wx' });
  commandEnvironment.npm_config_userconfig = npmUserConfig;
  commandEnvironment.npm_config_globalconfig = npmGlobalConfig;
  commandEnvironment.npm_config_package_lock = 'true';
  commandEnvironment.npm_config_bin_links = 'true';
  commandEnvironment.npm_config_engine_strict = 'true';
  commandEnvironment.npm_config_update_notifier = 'false';
  commandEnvironment.npm_config_progress = 'false';
  commandEnvironment.npm_config_loglevel = 'error';
  mkdirSync(artifactDirectory, { mode: 0o755 });
  mkdirSync(unrelated, { mode: 0o755 });
  const packText = runNpmCommand(
    nodeExecutable,
    npmExecutable,
    ['pack', '--ignore-scripts', '--json', '--pack-destination', artifactDirectory],
    root,
  );
  const rawPackValue = strictJson(packText, 'npm pack output');
  if (!Array.isArray(rawPackValue) || rawPackValue.length !== 1 || !isRecord(rawPackValue[0])) {
    fail('npm pack output has an invalid envelope');
  }
  const generatedFilename = expectString(rawPackValue[0].filename, 'npm pack filename');
  if (generatedFilename.includes('/') || generatedFilename.includes('\\')) {
    fail('npm pack returned an unsafe filename');
  }
  const generatedTarball = join(artifactDirectory, generatedFilename);
  const tarballPath = join(artifactDirectory, LOCAL_TARBALL_FILENAME);
  if (generatedTarball !== tarballPath) renameSync(generatedTarball, tarballPath);
  const tarballStats = lstatSync(tarballPath);
  const tarball = readRegularFileStable(
    tarballPath,
    tarballStats.size,
    'fresh Cortexel package tarball',
    PACKAGE_TARBALL_LIMITS.compressedBytes,
  );
  const packed = normalizePackResult(rawPackValue, tarball);
  const sourcePackage = expectRecord(fixture.packageJson, 'Cortexel package.json');
  if (packed.name !== sourcePackage.name || packed.version !== sourcePackage.version) {
    fail('npm pack identity differs from Cortexel package.json');
  }
  const expectedFiles = expectedPackageClosure(fixture.packageJson);
  inspectNpmPackageTarball(tarball, packed, expectedFiles);
  const packResultPath = join(workspace, PACK_RESULT_FILENAME);
  const packResultRaw = writeCanonicalJson(packResultPath, packed);
  prepareConsumer(
    coreConsumer,
    tarballPath,
    packed.integrity,
    fixture.lock,
    fixture.manifestRaw,
    expectedFiles,
    nodeExecutable,
    npmExecutable,
    ['dev', 'optional'],
    npmMajor,
  );
  prepareConsumer(
    chartsConsumer,
    tarballPath,
    packed.integrity,
    fixture.lock,
    fixture.manifestRaw,
    expectedFiles,
    nodeExecutable,
    npmExecutable,
    ['optional'],
    npmMajor,
  );
  prepareConsumer(
    consumer,
    tarballPath,
    packed.integrity,
    fixture.lock,
    fixture.manifestRaw,
    expectedFiles,
    nodeExecutable,
    npmExecutable,
    [],
    npmMajor,
  );
  writeFileSync(join(workspace, NETWORK_GUARD_FILENAME), NETWORK_AND_WRITE_GUARD, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o644,
  });

  const context: PackageSmokeContext = {
    workspace,
    coreConsumer,
    chartsConsumer,
    consumer,
    unrelated,
    nodeExecutable,
    packed,
  };
  const packageVersion = runPackageSmokeBody('prepare', context);
  if (packageVersion !== packed.version) fail('prepared consumer package version differs from npm pack');
  const consumerClosureOptions = {
    artifact: tarball,
    artifactIntegrity: packed.integrity,
    chartsConsumer,
    consumer,
    coreConsumer,
    exactFixtureLockValue: fixture.lock,
    exactFixtureManifestRaw: fixture.manifestRaw,
    expectedFiles,
    npmVersion,
  } as const;
  assertPreparedConsumerClosures({
    ...consumerClosureOptions,
    permissionPhase: 'prepared-writable',
  });
  const stateReservation = reservePackageSmokeStateFile(workspace);
  try {
    const readOnlyWorkspace = makeWorkspaceReadOnly(workspace);
    if (readOnlyWorkspace) chmodSync(workspace, 0o555);
    assertPreparedConsumerClosures({
      ...consumerClosureOptions,
      permissionPhase: 'finalized-read-only',
    });
    const firstFinalizedSeal = fingerprintPackageSmokeWorkspace(workspace, true);
    assertPreparedConsumerClosures({
      ...consumerClosureOptions,
      permissionPhase: 'finalized-read-only',
    });
    const workspaceSeal = fingerprintPackageSmokeWorkspace(workspace, true);
    if (!exactJsonEqual(firstFinalizedSeal, workspaceSeal)) {
      fail('package-smoke workspace changed across finalized semantic revalidation');
    }
    assertPackageRuntimeAuthority(runtimeAuthority, 'pre-publication');
    const state: PreparedState = {
      schema: PREPARED_STATE_SCHEMA,
      workspace,
      platform: process.platform,
      arch: process.arch,
      packageVersion,
      artifactIntegrity: packed.integrity,
      artifactSha256: sha256(tarball),
      fixtureManifestSha256: EXPECTED_FIXTURE_MANIFEST_SHA256,
      fixtureLockSha256: EXPECTED_FIXTURE_LOCK_SHA256,
      packResultSha256: sha256(packResultRaw),
      runtimeAuthority,
      coreConsumer,
      chartsConsumer,
      consumer,
      unrelatedDirectory: unrelated,
      nodeModules: [
        join(coreConsumer, 'node_modules'),
        join(chartsConsumer, 'node_modules'),
        join(consumer, 'node_modules'),
      ],
      workspaceSeal,
      readOnlyWorkspace,
    };
    const stateRaw = publishPackageSmokeStateFile(stateReservation, state);
    assertWorkspaceReadOnly(workspace, readOnlyWorkspace);
    const publishedWorkspaceSeal = fingerprintPackageSmokeWorkspace(workspace, true);
    if (!exactJsonEqual(publishedWorkspaceSeal, workspaceSeal)) {
      fail('package-smoke workspace authority changed during state publication');
    }
    assertPackageRuntimeAuthority(runtimeAuthority, 'post-publication');
    return phaseOutput('prepare', 'prepared', state, sha256(stateRaw));
  } finally {
    closePackageSmokeStateFile(stateReservation);
  }
}

export function executePackageSmokeWorkspace(options: {
  readonly workspace: string;
  readonly expectedStateDigest: string;
  readonly nodeExecutable?: string;
}): PackageSmokePhaseSuccessOutput {
  if (process.platform === 'win32') {
    fail('package smoke currently requires POSIX process-group semantics');
  }
  const workspace = canonicalWorkspacePath(options.workspace);
  const { state, packed, stateFileAuthority } = readAndVerifyPreparedState(
    workspace,
    options.expectedStateDigest,
    options.nodeExecutable,
  );
  const context: PackageSmokeContext = {
    workspace,
    coreConsumer: state.coreConsumer,
    chartsConsumer: state.chartsConsumer,
    consumer: state.consumer,
    unrelated: state.unrelatedDirectory,
    nodeExecutable: state.runtimeAuthority.node.executable,
    packed,
  };
  const failures: unknown[] = [];
  try {
    const packageVersion = runPackageSmokeBody('execute', context);
    if (packageVersion !== state.packageVersion) fail('executed consumer package version changed');
  } catch (error) {
    failures.push(error);
  }
  const recheck = (check: () => void): void => {
    try {
      check();
    } catch (error) {
      failures.push(error);
    }
  };
  recheck(() => assertPackageRuntimeAuthority(state.runtimeAuthority, 'post-execute command'));
  recheck(() => {
    const finalSeal = fingerprintPackageSmokeWorkspace(workspace, true);
    if (!exactJsonEqual(finalSeal, state.workspaceSeal)) {
      fail('execute phase mutated the prepared workspace');
    }
  });
  recheck(() => assertWorkspaceReadOnly(workspace, state.readOnlyWorkspace));
  recheck(() => assertPreparedStateFileAuthority(
    workspace,
    options.expectedStateDigest,
    stateFileAuthority,
    'final execute',
  ));
  recheck(() => assertPackageRuntimeAuthority(state.runtimeAuthority, 'final execute'));
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      'package-smoke execute failed with one or more final authority revalidation failures',
    );
  }
  return phaseOutput('execute', 'passed', state, options.expectedStateDigest);
}

function runMain(): void {
  if (process.platform === 'win32') {
    fail('package smoke currently requires POSIX process-group semantics');
  }
  const invocation = parsePackageSmokeInvocation(process.argv.slice(2));
  if (invocation.command === 'prepare') {
    const result = preparePackageSmokeWorkspace({
      workspace: invocation.workspace!,
      ...(invocation.nodeExecutable === undefined
        ? {}
        : { nodeExecutable: invocation.nodeExecutable }),
      ...(invocation.npmExecutable === undefined ? {} : { npmExecutable: invocation.npmExecutable }),
    });
    process.stdout.write(`${canonicalize(result)}\n`);
    return;
  }
  if (invocation.command === 'execute') {
    const result = executePackageSmokeWorkspace({
      workspace: invocation.workspace!,
      expectedStateDigest: invocation.expectedStateDigest!,
      ...(invocation.nodeExecutable === undefined
        ? {}
        : { nodeExecutable: invocation.nodeExecutable }),
    });
    process.stdout.write(`${canonicalize(result)}\n`);
    return;
  }

  const temp = mkdtempSync(join(tmpdir(), 'cortexel-package-smoke-'));
  const workspace = join(temp, 'workspace');
  try {
    const prepared = preparePackageSmokeWorkspace({ workspace });
    const result = executePackageSmokeWorkspace({
      workspace,
      expectedStateDigest: prepared.stateDigest,
    });
    console.log(`[cortexel] package smoke passed for ${result.packageVersion}`);
  } finally {
    makeWorkspaceWritableForCleanup(workspace);
    rmSync(temp, { recursive: true, force: true });
  }
}

function isDirectInvocation(): boolean {
  const script = process.argv[1];
  if (script === undefined || !existsSync(script)) return false;
  return pathToFileURL(realpathSync(script)).href === import.meta.url;
}

if (isDirectInvocation()) {
  try {
    runMain();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const requestedPhase = process.argv[2] === 'prepare' || process.argv[2] === 'execute'
      ? process.argv[2]
      : 'all';
    if (requestedPhase === 'all') {
      console.error(`[cortexel] package smoke failed: ${message}`);
    } else {
      const failure: PackageSmokePhaseFailureOutput = {
        schema: PHASE_OUTPUT_SCHEMA,
        phase: requestedPhase,
        status: 'failed',
        code: 'PACKAGE_SMOKE_FAILED',
        message: message.slice(0, 8_192),
      };
      process.stderr.write(`${canonicalize(failure)}\n`);
    }
    process.exitCode = 1;
  }
}
