#!/usr/bin/env node
/**
 * The Cortexel CLI.
 *
 * A narrow, auditable command surface for agents and reproducible pipelines: typed
 * input, deterministic output, explicit exit codes, and no network access. Everything is
 * offline by default; there is no `--url`, no implicit HTTP, and no shell hook, because a
 * scientific validator that could be turned into an ETL tool is a scientific validator
 * with an attack surface.
 *
 * The package installs this offline command as the `cortexel` bin. Importing the module
 * remains side-effect free; only exact direct execution reaches the dispatcher.
 *
 * Exit codes are a stable contract of their own: 0 ok, 2 usage, 3 parse, 4 schema,
 * 5 semantic, 6 budget, 7 I/O, 8 internal.
 */

import { randomBytes } from 'node:crypto';
import {
  closeSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalize } from '../core/canonicalize.js';
import { parseAndValidateRequest } from '../core/request.js';
import { parseJsonStrict } from '../core/parse-json.js';
import { getBudgetLimits } from '../core/limits.js';
import { migrateLegacyRequest } from '../core/migrate-v0.js';
import { getBuildIdentity } from '../generated/identity.js';
import { SKILL_CATALOG, STABLE_SKILL_IDS, EXPERIMENTAL_CAPABILITY_IDS } from '../generated/catalog.js';
import { ERROR_STAGES } from '../generated/registry.js';
import { buildFigureFromJson } from '../render/buildFigure.js';
import { makeError, type CortexelError } from '../core/errors.js';
import { CLI_COMMANDS, type CliCommand } from './commands.js';

export { CLI_COMMANDS } from './commands.js';

const EXIT = {
  ok: 0,
  usage: 2,
  parse: 3,
  schema: 4,
  semantic: 5,
  budget: 6,
  io: 7,
  internal: 8,
} as const;

/**
 * Map diagnostics to the stable CLI exit contract.
 *
 * Validation normally returns stage-sorted diagnostics. We nevertheless choose the
 * earliest error stage explicitly, while giving a genuine internal error precedence:
 * an invariant failure must never be reported as a caller repair problem. The terminal
 * ERROR_LIMIT_REACHED warning does not override the actual errors that preceded it.
 */
export function exitCodeForErrors(errors: readonly CortexelError[]): number {
  const actualErrors = errors.filter((error) => error.severity === 'error');
  const considered = actualErrors.length > 0 ? actualErrors : errors;
  if (considered.length === 0) return EXIT.internal;
  if (considered.some((error) => error.stage === 'internal')) return EXIT.internal;

  const firstStage = ERROR_STAGES.find((stage) =>
    considered.some((error) => error.stage === stage));

  switch (firstStage) {
    case 'parse':
    case 'snapshot':
      return EXIT.parse;
    case 'identity':
    case 'structural':
      return EXIT.schema;
    case 'budget':
    case 'serialize':
      // Serialization resource limits are still budget refusals. In particular,
      // RESOURCE_OUTPUT_BYTES_EXCEEDED is not a scientific-semantic error.
      return EXIT.budget;
    case 'semantic':
    case 'science':
    case 'scope':
    case 'provenance':
    case 'derivation':
    case 'render':
    case 'migrate':
    case 'adapter':
      return EXIT.semantic;
    case 'internal':
    case undefined:
      return EXIT.internal;
  }
}

const CLI_INPUT_BYTE_LIMIT = getBudgetLimits('standard').rawInputBytes;
const INPUT_READ_CHUNK_BYTES = 64 * 1024;

type CliInputBoundaryKind = 'bytes-exceeded' | 'invalid-utf8';

class CliInputBoundaryError extends Error {
  constructor(
    readonly kind: CliInputBoundaryKind,
    readonly limit?: number,
    readonly observed?: number,
  ) {
    super(kind);
    this.name = 'CliInputBoundaryError';
  }
}

/** Read at most limit+1 bytes so neither a growing file nor stdin can allocate freely. */
function readBoundedBytes(fd: number, limit: number): Buffer {
  const chunks: Buffer[] = [];
  let total = 0;
  while (total <= limit) {
    const remaining = limit + 1 - total;
    if (remaining === 0) break;
    const chunk = Buffer.allocUnsafe(Math.min(INPUT_READ_CHUNK_BYTES, remaining));
    const count = readSync(fd, chunk, 0, chunk.byteLength, null);
    if (count === 0) break;
    chunks.push(chunk.subarray(0, count));
    total += count;
  }
  if (total > limit) {
    throw new CliInputBoundaryError('bytes-exceeded', limit, total);
  }
  return Buffer.concat(chunks, total);
}

function readInput(source: string): string {
  let fd = 0;
  let close = false;
  try {
    if (source !== '-') {
      fd = openSync(source, 'r');
      close = true;
    }
    const bytes = readBoundedBytes(fd, CLI_INPUT_BYTE_LIMIT);
    try {
      // `ignoreBOM:true` preserves U+FEFF. The strict JSON parser must reject a BOM
      // explicitly; silently consuming it here would make raw-byte assurance false.
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      throw new CliInputBoundaryError('invalid-utf8');
    }
  } finally {
    if (close) closeSync(fd);
  }
}

function inputBoundaryErrors(error: unknown): readonly CortexelError[] | undefined {
  if (!(error instanceof CliInputBoundaryError)) return undefined;
  if (error.kind === 'bytes-exceeded') {
    return [makeError({
      code: 'JSON_BYTES_EXCEEDED',
      stage: 'parse',
      message: 'the raw input is larger than the CLI host budget permits',
      limit: {
        name: 'rawInputBytes',
        limit: error.limit!,
        observed: error.observed!,
      },
    })];
  }
  return [makeError({
    code: 'JSON_INVALID_UNICODE',
    stage: 'parse',
    message: 'the raw input byte stream is not well-formed UTF-8',
  })];
}

function printDiagnostics(errors: readonly CortexelError[], asJson: boolean): void {
  if (asJson) {
    process.stderr.write(`${JSON.stringify({ ok: false, errors }, null, 2)}\n`);
    return;
  }
  for (const error of errors) {
    process.stderr.write(`  ${error.code} at ${error.instancePath || '(root)'}: ${error.message}\n`);
  }
}

type CliIoKind =
  | 'destination-exists'
  | 'destination-directory'
  | 'destination-locked'
  | 'atomic-no-replace-unavailable';

class CliIoError extends Error {
  constructor(readonly kind: CliIoKind) {
    super(kind);
    this.name = 'CliIoError';
  }
}

function writeInputIoDiagnostic(asJson = false): void {
  // Native fs errors include caller-controlled paths. They are intentionally not
  // interpolated into a terminal or agent-visible diagnostic.
  const message = 'unable to read the selected input';
  if (asJson) {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      cliError: {
        kind: 'input_io',
        message,
      },
    }, null, 2)}\n`);
  } else {
    process.stderr.write(`I/O error: ${message}\n`);
  }
}

function outputIoMessage(error: unknown): string {
  if (error instanceof CliIoError) {
    if (error.kind === 'destination-exists') {
      return 'refusing to overwrite an existing destination entry without --force';
    }
    if (error.kind === 'destination-directory') {
      return '--force does not replace destination directories';
    }
    if (error.kind === 'destination-locked') {
      return 'another writer owns this figure output lock; if its process crashed, remove the stale .cortexel.figure-emission.lock entry manually';
    }
    return 'this output directory does not permit atomic no-replace publication';
  }
  return 'unable to publish the figure outputs';
}

function writeOutputIoDiagnostic(error: unknown, asJson = false): void {
  const message = outputIoMessage(error);
  if (asJson) {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      cliError: {
        kind: 'output_io',
        message,
      },
    }, null, 2)}\n`);
  } else {
    process.stderr.write(`I/O error: ${message}\n`);
  }
}

function handleInputReadFailure(error: unknown, asJson = false): number {
  const boundaryErrors = inputBoundaryErrors(error);
  if (boundaryErrors) {
    printDiagnostics(boundaryErrors, asJson);
    return exitCodeForErrors(boundaryErrors);
  }
  writeInputIoDiagnostic(asJson);
  return EXIT.io;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function fsyncIfSupported(fd: number): void {
  try {
    fsyncSync(fd);
  } catch (error) {
    // Some virtual/network filesystems do not implement fsync. Ignore only their
    // explicit "unsupported" results; every actual write/sync failure remains fatal.
    if (!['EINVAL', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP'].includes(errorCode(error) ?? '')) {
      throw error;
    }
  }
}

function directorySyncUnsupported(error: unknown): boolean {
  const code = errorCode(error);
  return (
    code === 'EINVAL' ||
    code === 'ENOSYS' ||
    code === 'ENOTSUP' ||
    code === 'EOPNOTSUPP' ||
    code === 'EISDIR' ||
    (process.platform === 'win32' && (code === 'EPERM' || code === 'EACCES'))
  );
}

/** Flush directory-entry changes on filesystems whose Node binding supports it. */
function fsyncDirectoryIfSupported(directory: string): void {
  let fd: number;
  try {
    fd = openSync(directory, 'r');
  } catch (error) {
    if (directorySyncUnsupported(error)) return;
    throw error;
  }
  try {
    fsyncIfSupported(fd);
  } finally {
    closeSync(fd);
  }
}

function removeTempBestEffort(temp: string | undefined): void {
  if (!temp) return;
  try {
    unlinkSync(temp);
  } catch {
    // Cleanup must not replace the original I/O failure. A unique temporary name
    // prevents a subsequent invocation from treating this path as authoritative.
  }
}

/** Stage complete UTF-8 bytes in a unique, exclusively-created sibling file. */
function stageSibling(target: string, content: string): string {
  const dir = path.dirname(target);
  mkdirSync(dir, { recursive: true });
  const bytes = Buffer.from(content, 'utf8');

  for (let attempt = 0; attempt < 16; attempt++) {
    const nonce = randomBytes(16).toString('hex');
    // The fixed-size basename remains safely below common NAME_MAX values even when
    // the caller's final basename itself is close to the filesystem limit.
    const temp = path.join(dir, `.${nonce}.cortexel.tmp`);
    let fd: number | undefined;
    let created = false;
    try {
      // `wx` is O_CREAT|O_EXCL: a pre-existing file or symlink is a collision, never
      // an object whose target we follow or overwrite.
      fd = openSync(temp, 'wx', 0o666);
      created = true;
      let offset = 0;
      while (offset < bytes.byteLength) {
        const written = writeSync(fd, bytes, offset, bytes.byteLength - offset);
        if (written <= 0) throw new Error('staging write made no progress');
        offset += written;
      }
      fsyncIfSupported(fd);
      closeSync(fd);
      fd = undefined;
      return temp;
    } catch (error) {
      if (fd !== undefined) {
        try {
          closeSync(fd);
        } catch {
          // Preserve the staging failure below.
        }
      }
      if (created) removeTempBestEffort(temp);
      if (errorCode(error) === 'EEXIST') continue;
      throw error;
    }
  }

  throw new Error('could not allocate a unique temporary sibling');
}

type DestinationState = 'absent' | 'directory' | 'entry';

/** Inspect the final directory entry itself; never follow a destination symlink. */
function destinationState(target: string): DestinationState {
  try {
    return lstatSync(target).isDirectory() ? 'directory' : 'entry';
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return 'absent';
    throw error;
  }
}

function preflightDestinations(targets: readonly string[], force: boolean): void {
  for (const target of targets) {
    const state = destinationState(target);
    if (!force && state !== 'absent') throw new CliIoError('destination-exists');
    if (force && state === 'directory') throw new CliIoError('destination-directory');
  }
}

function removeEntryIfPresent(target: string): void {
  try {
    // unlink operates on the directory entry and never follows a final symlink.
    unlinkSync(target);
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return;
    throw error;
  }
}

function publishNoReplace(temp: string, target: string): void {
  try {
    // A hard link from an exclusively-created sibling is an atomic no-replace
    // publication: any concurrently-created target entry makes link(2) fail EEXIST.
    linkSync(temp, target);
  } catch (error) {
    const code = errorCode(error);
    if (code === 'EEXIST') throw new CliIoError('destination-exists');
    if (
      code === 'EXDEV' ||
      code === 'EMLINK' ||
      code === 'ENOSYS' ||
      code === 'ENOTSUP' ||
      code === 'EOPNOTSUPP' ||
      code === 'EPERM' ||
      code === 'EACCES'
    ) {
      // Falling back to rename would silently restore the clobber race this boundary
      // exists to close. Refuse on filesystems that cannot provide link semantics.
      throw new CliIoError('atomic-no-replace-unavailable');
    }
    throw error;
  }
  // The final hard link exists now, so failure to remove its staging name is a real
  // publication failure rather than cleanup noise. The caller retains `temp` until
  // this function returns and will make one best-effort retry while preserving this
  // causal error; it must never report success with a hidden sibling left behind.
  unlinkSync(temp);
  fsyncDirectoryIfSupported(path.dirname(target));
}

interface EmissionLock {
  readonly fd: number;
  readonly path: string;
  readonly directory: string;
  readonly targets: readonly [string, string];
  readonly device: bigint;
  readonly inode: bigint;
}

/**
 * Acquire the cooperative lock for figure publication in one physical directory.
 *
 * A directory-wide fixed name is intentionally more conservative than a lock derived
 * from output basenames. Filesystems can treat byte-distinct case or Unicode spellings
 * as one directory entry; a lexical per-pair digest would then let two aliases acquire
 * different locks while publishing the same files. Resolving the containing directory
 * also makes aliases through a directory symlink converge. O_CREAT|O_EXCL refuses both
 * a live writer and a stale lock; stale locks are never guessed safe or reclaimed.
 */
function acquireEmissionLock(targets: readonly [string, string]): EmissionLock {
  const lexicalDirectories = targets.map((target) => path.dirname(path.resolve(target)));
  for (const directory of lexicalDirectories) mkdirSync(directory, { recursive: true });
  const directories = lexicalDirectories.map((directory) => realpathSync(directory));
  if (directories[0] !== directories[1]) {
    throw new Error('figure outputs do not share one physical directory');
  }
  const lockPath = path.join(directories[0], '.cortexel.figure-emission.lock');
  const canonicalTargets = targets.map((target) =>
    path.join(directories[0], path.basename(target))) as [string, string];
  let fd: number;
  try {
    // `wx` is O_CREAT|O_EXCL. A pre-existing regular file, directory, or symlink is
    // authority held by someone else, never an object Cortexel follows or replaces.
    fd = openSync(lockPath, 'wx', 0o600);
  } catch (error) {
    if (errorCode(error) === 'EEXIST') throw new CliIoError('destination-locked');
    throw error;
  }
  try {
    fsyncIfSupported(fd);
    fsyncDirectoryIfSupported(directories[0]);
    const identityStat = fstatSync(fd, { bigint: true });
    return {
      fd,
      path: lockPath,
      directory: directories[0],
      targets: canonicalTargets,
      device: identityStat.dev,
      inode: identityStat.ino,
    };
  } catch (error) {
    try {
      closeSync(fd);
    } finally {
      removeTempBestEffort(lockPath);
    }
    throw error;
  }
}

function releaseEmissionLock(lock: EmissionLock): void {
  let identityMatches = false;
  try {
    const current = lstatSync(lock.path, { bigint: true });
    identityMatches = current.dev === lock.device && current.ino === lock.inode;
  } finally {
    closeSync(lock.fd);
  }
  if (!identityMatches) {
    throw new Error('figure output lock entry was replaced while held');
  }
  // unlink removes the verified lock entry itself and never follows a symlink. The host
  // still owns the directory; Node exposes no fd-relative unlink that could close the
  // final lstat/unlink race against a different principal with rename authority.
  unlinkSync(lock.path);
  fsyncDirectoryIfSupported(lock.directory);
}

/**
 * Emit the two siblings with the artifact JSON as the completion marker.
 *
 * This is not a two-file transaction. A process or device failure after publishing the
 * SVG can leave an SVG without its artifact; artifact absence is the completion signal.
 * The caller must also control the output directory: no pathname protocol can prevent a
 * different principal with unlink/rename authority from replacing a completed entry.
 */
function writeFigureEmission(
  svgTarget: string,
  svg: string,
  artifactTarget: string,
  artifactJson: string,
  force: boolean,
): void {
  const requestedTargets = [svgTarget, artifactTarget] as const;
  // The lock precedes every preflight, staged write, removal, and publication. Therefore
  // two cooperative --force writers cannot interleave their SVG/artifact generations.
  const lock = acquireEmissionLock(requestedTargets);
  // Every subsequent operation uses the same resolved parent that owns the lock. A
  // caller changing a directory symlink after acquisition cannot redirect writes into a
  // second directory whose writer holds a different lock.
  const [canonicalSvgTarget, canonicalArtifactTarget] = lock.targets;
  const targets = lock.targets;
  let svgTemp: string | undefined;
  let artifactTemp: string | undefined;
  let publicationError: unknown;
  try {
    // Fail before staging when an entry is already visible. Non-force publication closes
    // the remaining race atomically below; force validates that it will not remove dirs.
    preflightDestinations(targets, force);
    svgTemp = stageSibling(canonicalSvgTarget, svg);
    artifactTemp = stageSibling(canonicalArtifactTarget, artifactJson);

    if (force) {
      // Recheck after staging, then remove the old completion marker before touching
      // the old SVG. A crash from this point until the final rename therefore cannot
      // leave an old artifact masquerading as proof for a newly-published SVG.
      preflightDestinations(targets, true);
      removeEntryIfPresent(canonicalArtifactTarget);
      removeEntryIfPresent(canonicalSvgTarget);
      fsyncDirectoryIfSupported(path.dirname(canonicalSvgTarget));

      renameSync(svgTemp, canonicalSvgTarget);
      svgTemp = undefined;
      fsyncDirectoryIfSupported(path.dirname(canonicalSvgTarget));
      renameSync(artifactTemp, canonicalArtifactTarget);
      artifactTemp = undefined;
      fsyncDirectoryIfSupported(path.dirname(canonicalArtifactTarget));
    } else {
      publishNoReplace(svgTemp, canonicalSvgTarget);
      svgTemp = undefined;
      publishNoReplace(artifactTemp, canonicalArtifactTarget);
      artifactTemp = undefined;
    }
  } catch (error) {
    publicationError = error;
    throw error;
  } finally {
    removeTempBestEffort(svgTemp);
    removeTempBestEffort(artifactTemp);
    try {
      releaseEmissionLock(lock);
    } catch (error) {
      // Preserve the causal publication error. If publication succeeded, failure to
      // remove/sync the lock is itself the I/O failure and the lock remains stale for
      // explicit operator recovery rather than being guessed safe.
      if (publicationError === undefined) throw error;
    }
  }
}

interface ArgumentGrammar {
  readonly flags?: readonly string[];
  readonly valueOptions?: readonly string[];
  readonly positionalCount: number;
}

interface ParsedArguments {
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
  readonly positionals: readonly string[];
}

type ArgumentParseResult =
  | { readonly ok: true; readonly args: ParsedArguments }
  | { readonly ok: false; readonly message: string };

/** Parse a closed command grammar, including the conventional `--` delimiter. */
function parseArguments(args: readonly string[], grammar: ArgumentGrammar): ArgumentParseResult {
  const allowedFlags = new Set(grammar.flags ?? []);
  const allowedValues = new Set(grammar.valueOptions ?? []);
  const seen = new Set<string>();
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const positionals: string[] = [];
  let optionsEnded = false;

  for (let index = 0; index < args.length; index++) {
    const token = args[index];
    if (!optionsEnded && token === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && token !== '-' && token.startsWith('-')) {
      if (allowedFlags.has(token)) {
        if (seen.has(token)) {
          return { ok: false, message: 'a singleton flag was supplied more than once' };
        }
        seen.add(token);
        flags.add(token);
        continue;
      }
      if (allowedValues.has(token)) {
        if (seen.has(token)) {
          return { ok: false, message: 'a singleton option was supplied more than once' };
        }
        const value = args[index + 1];
        if (
          value === undefined ||
          value.length === 0 ||
          value === '--' ||
          (value !== '-' && value.startsWith('-'))
        ) {
          return { ok: false, message: 'an option is missing its required value' };
        }
        seen.add(token);
        values.set(token, value);
        index++;
        continue;
      }
      return { ok: false, message: 'an unknown option was supplied' };
    }
    if (token.length === 0) {
      return { ok: false, message: 'an empty positional argument was supplied' };
    }
    positionals.push(token);
  }

  if (positionals.length !== grammar.positionalCount) {
    return { ok: false, message: `expected exactly ${grammar.positionalCount} positional argument${grammar.positionalCount === 1 ? '' : 's'}` };
  }
  return { ok: true, args: { flags, values, positionals } };
}

function parseOrReport(args: readonly string[], grammar: ArgumentGrammar): ParsedArguments | undefined {
  const parsed = parseArguments(args, grammar);
  if (parsed.ok) return parsed.args;
  process.stderr.write(`usage error: ${parsed.message}\n`);
  return undefined;
}

function validateJsonFormat(parsed: ParsedArguments): boolean {
  const format = parsed.values.get('--format');
  if (format === undefined || format === 'json') return true;
  process.stderr.write('usage error: --format accepts only json\n');
  return false;
}

function cmdIdentity(args: readonly string[]): number {
  const parsed = parseOrReport(args, { flags: ['--json'], positionalCount: 0 });
  if (!parsed) return EXIT.usage;
  const identity = getBuildIdentity();
  if (parsed.flags.has('--json')) {
    process.stdout.write(`${JSON.stringify(identity, null, 2)}\n`);
  } else {
    process.stdout.write(
      `Cortexel ${identity.packageVersion}\n` +
        `  request contract:  ${identity.requestContract}\n` +
        `  artifact contract: ${identity.artifactContract}\n` +
        `  contract digest:   ${identity.contractDigest}\n` +
        `  catalog digest:    ${identity.catalogDigest}\n` +
        `  stable skills:     ${identity.stableSkillCount}\n` +
        `  source revision:   ${identity.sourceRevision}\n` +
        `  release build:     ${identity.release}\n`,
    );
  }
  return EXIT.ok;
}

function cmdCatalog(args: readonly string[]): number {
  const parsed = parseOrReport(args, {
    flags: ['--include-experimental', '--json'],
    positionalCount: 0,
  });
  if (!parsed) return EXIT.usage;
  const includeExperimental = parsed.flags.has('--include-experimental');
  if (parsed.flags.has('--json')) {
    const stable = STABLE_SKILL_IDS.map((id) => ({
      id,
      title: SKILL_CATALOG[id].title,
      question: SKILL_CATALOG[id].canonicalQuestion,
    }));
    const payload: Record<string, unknown> = { stable };
    if (includeExperimental) payload.experimental = EXPERIMENTAL_CAPABILITY_IDS;
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return EXIT.ok;
  }

  process.stdout.write(`Stable catalog (${STABLE_SKILL_IDS.length}):\n`);
  for (const id of STABLE_SKILL_IDS) {
    process.stdout.write(`  ${id.padEnd(32)} ${SKILL_CATALOG[id].title}\n`);
  }
  if (includeExperimental) {
    process.stdout.write(`\nExperimental (not covered by the stable contract):\n`);
    for (const id of EXPERIMENTAL_CAPABILITY_IDS) process.stdout.write(`  ${id}\n`);
  } else {
    process.stdout.write(`\nUse --include-experimental to also list experimental capabilities.\n`);
  }
  return EXIT.ok;
}

function cmdValidate(args: readonly string[]): number {
  const parsed = parseOrReport(args, { valueOptions: ['--format'], positionalCount: 1 });
  if (!parsed || !validateJsonFormat(parsed)) return EXIT.usage;
  const input = parsed.positionals[0];
  const asJson = parsed.values.get('--format') === 'json';

  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    return handleInputReadFailure(error, asJson);
  }

  const outcome = parseAndValidateRequest(text);
  if (outcome.ok) {
    if (asJson) {
      process.stdout.write(
        `${JSON.stringify({ ok: true, skill: outcome.request.skillId, requestDigest: outcome.request.requestDigest, inputAssurance: outcome.request.inputAssurance }, null, 2)}\n`,
      );
    } else {
      process.stdout.write(`valid: ${outcome.request.skillId} (${outcome.request.requestDigest})\n`);
    }
    return EXIT.ok;
  }

  printDiagnostics(outcome.errors, asJson);
  return exitCodeForErrors(outcome.errors);
}

function cmdRender(args: readonly string[]): number {
  const parsed = parseOrReport(args, {
    flags: ['--force', '--dry-run'],
    valueOptions: ['--output', '--format'],
    positionalCount: 1,
  });
  if (!parsed || !validateJsonFormat(parsed)) return EXIT.usage;
  const input = parsed.positionals[0];
  const output = parsed.values.get('--output');
  const force = parsed.flags.has('--force');
  const dryRun = parsed.flags.has('--dry-run');
  const asJson = parsed.values.get('--format') === 'json';

  if (output === '-') {
    process.stderr.write('usage error: --output requires a filesystem path\n');
    return EXIT.usage;
  }
  if (output !== undefined && (
    !output.endsWith('.svg') || path.basename(output).length <= '.svg'.length
  )) {
    process.stderr.write('usage error: --output must name a nonempty .svg file\n');
    return EXIT.usage;
  }
  if (!dryRun && !output) {
    process.stderr.write('usage error: render requires --output <figure.svg> unless --dry-run is set\n');
    return EXIT.usage;
  }
  if (dryRun && output) {
    process.stderr.write('usage error: --dry-run cannot be combined with --output\n');
    return EXIT.usage;
  }
  if (dryRun && force) {
    process.stderr.write('usage error: --force requires --output\n');
    return EXIT.usage;
  }

  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    return handleInputReadFailure(error, asJson);
  }

  const result = buildFigureFromJson(text);
  if (!result.ok) {
    printDiagnostics(result.errors, asJson);
    return exitCodeForErrors(result.errors);
  }

  const renderedSkill =
    (result.artifact.canonicalRequest as { skill?: { id?: string } })?.skill?.id ?? 'figure';

  if (dryRun) {
    const svgByteLength = Buffer.byteLength(result.svg, 'utf8');
    if (asJson) {
      process.stdout.write(`${JSON.stringify({
        ok: true,
        dryRun: true,
        skill: renderedSkill,
        svgByteLength,
        tableRowsTotal: result.table.rowsTotal,
      }, null, 2)}\n`);
    } else {
      process.stdout.write(
        `would render ${renderedSkill}: ` +
          `${svgByteLength} SVG bytes, ${result.table.rowsTotal} in-memory table rows\n`,
      );
    }
    return EXIT.ok;
  }

  // A successful non-dry render has an output path by the usage gate above.
  const svgTarget = output!;
  const base = svgTarget.slice(0, -'.svg'.length);
  const artifactTarget = `${base}.artifact.json`;
  let artifactJson: string;
  try {
    artifactJson = canonicalize(result.artifact);
  } catch {
    if (asJson) {
      process.stderr.write(`${JSON.stringify({
        ok: false,
        cliError: {
          kind: 'internal',
          message: 'artifact canonicalization failed',
        },
      }, null, 2)}\n`);
    } else {
      process.stderr.write('Internal error: artifact canonicalization failed\n');
    }
    return EXIT.internal;
  }

  try {
    writeFigureEmission(svgTarget, result.svg, artifactTarget, artifactJson, force);
    // Do not invent a detached CSV here. Stringifying cells would collapse null with
    // empty string, number with numeric text, and labels containing delimiters; the
    // bytes would also be absent from the artifact output inventory. A canonical,
    // library-owned table sidecar must be introduced atomically with its schema,
    // digest binding, verifier, and byte-for-byte CLI passthrough.
    if (asJson) {
      process.stdout.write(`${JSON.stringify({
        ok: true,
        dryRun: false,
        skill: renderedSkill,
        artifactDigest: result.artifact.artifactDigest,
        outputs: result.artifact.outputs,
        tableSidecar: null,
      }, null, 2)}\n`);
    } else {
      process.stdout.write(
        'wrote figure SVG and completion artifact (no canonical table sidecar)\n',
      );
    }
  } catch (error) {
    writeOutputIoDiagnostic(error, asJson);
    return EXIT.io;
  }

  return EXIT.ok;
}

function cmdInspect(args: readonly string[]): number {
  const parsed = parseOrReport(args, { positionalCount: 1 });
  if (!parsed) return EXIT.usage;
  const input = parsed.positionals[0];
  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    return handleInputReadFailure(error, false);
  }
  const outcome = parseAndValidateRequest(text);
  if (!outcome.ok) {
    printDiagnostics(outcome.errors, false);
    return exitCodeForErrors(outcome.errors);
  }
  const catalog = SKILL_CATALOG[outcome.request.skillId];
  process.stdout.write(
    `skill:        ${outcome.request.skillId} (rev ${outcome.request.skillRevision})\n` +
      `renderer:     ${catalog.renderer.id}\n` +
      `requestDigest:${outcome.request.requestDigest}\n` +
      `assurance:    ${outcome.request.inputAssurance.duplicateKeys}\n` +
      `disclosures:  ${catalog.disclosures.length} possible rules\n`,
  );
  return EXIT.ok;
}

function cmdMigrate(args: readonly string[]): number {
  const parsedArgs = parseOrReport(args, { positionalCount: 1 });
  if (!parsedArgs) return EXIT.usage;
  const input = parsedArgs.positionals[0];
  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    return handleInputReadFailure(error, true);
  }
  // Route legacy input through the SAME strict boundary as validate/render — the raw
  // JSON.parse here bypassed the byte/depth/node limits and the duplicate-key rejection,
  // which is exactly the hardening a legacy (untrusted) payload most needs.
  const parsed = parseJsonStrict(text, { limits: getBudgetLimits('standard') });
  if (!parsed.ok) {
    printDiagnostics(parsed.errors, true);
    return exitCodeForErrors(parsed.errors);
  }
  const result = migrateLegacyRequest(parsed.value);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.report.errors.length > 0 ? EXIT.semantic : EXIT.ok;
}

const USAGE = `Cortexel — provenance-first scientific figure contracts

Usage:
  cortexel identity [--json]
  cortexel catalog  [--include-experimental] [--json]
  cortexel validate <input|-> [--format json]
  cortexel render   <input|-> --output figure.svg [--force] [--format json]
  cortexel render   <input|-> --dry-run [--format json]
  cortexel inspect  <input|->
  cortexel migrate  <input|->

In a repository checkout, replace cortexel with: bun src/cli/main.ts
Both forms are offline. There is no network access, no shell hook, and no --url.
Output publication is not a two-file transaction. The host must provide a trusted output directory.
Exit codes: 0 ok, 2 usage, 3 parse, 4 schema, 5 semantic, 6 budget, 7 I/O, 8 internal.
`;

const CLI_HANDLERS: Readonly<Record<CliCommand, (args: readonly string[]) => number>> = {
  identity: cmdIdentity,
  catalog: cmdCatalog,
  validate: cmdValidate,
  render: cmdRender,
  inspect: cmdInspect,
  migrate: cmdMigrate,
};

export function run(argv: readonly string[]): number {
  const [command, ...args] = argv;
  if ((CLI_COMMANDS as readonly string[]).includes(command ?? '')) {
    return CLI_HANDLERS[command as CliCommand](args);
  }
  switch (command) {
    case undefined:
      process.stdout.write(USAGE);
      return EXIT.usage;
    case '--help':
    case '-h':
    case 'help': {
      if (args.length > 0) {
        process.stderr.write(`usage error: help accepts no arguments\n\n${USAGE}`);
        return EXIT.usage;
      }
      process.stdout.write(USAGE);
      return EXIT.ok;
    }
    default:
      process.stderr.write(`usage error: unknown command\n\n${USAGE}`);
      return EXIT.usage;
  }
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    // npm exposes bins through a symlink on POSIX. Resolve both sides so exact
    // direct execution still works through node_modules/.bin, while an imported
    // same-basename module cannot trip the guard.
    return realpathSync(path.resolve(entry)) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

// Setting exitCode lets stdout/stderr drain naturally. Importing this module from a
// same-basename test or application never triggers the guard.
if (isDirectExecution()) {
  process.exitCode = run(process.argv.slice(2));
}
