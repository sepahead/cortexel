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
import {
  parseAndValidateRequest,
  validateRequestValue,
} from '../core/request.js';
import { parseJsonStrict, type JsonValue } from '../core/parse-json.js';
import { getBudgetLimits } from '../core/limits.js';
import { migrateLegacyRequest } from '../core/migrate-v0.js';
import {
  CATALOG_DIGEST_DOMAIN,
  getBuildIdentity,
} from '../generated/identity.js';
import {
  EXPERIMENTAL_CAPABILITY_IDS,
  isStableSkillId,
  SKILL_CATALOG,
  STABLE_SKILL_IDS,
  type SkillCatalogEntry,
} from '../generated/catalog.js';
import {
  AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
  SKILL_AUTHORING,
  STABLE_CATALOG_SCHEMA_RESOURCES,
} from '../generated/authoring.js';
import { ERROR_STAGES } from '../generated/registry.js';
import {
  buildFigureFromJson,
  type FigureFailure,
  type FigureResult,
} from '../render/buildFigure.js';
import {
  isSourceAdapterId,
  lookupSourceAdapter,
  SOURCE_ADAPTER_CATALOG_DIGEST,
  SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
  SOURCE_ADAPTER_IDS,
} from '../adapters/source-catalog.js';
import {
  nestSpikeRecorderToRaster,
  type NestSpikeOptionsInput,
} from '../adapters/nest/index.js';
import {
  makeError,
  safeText,
  UNSAFE_DISPLAY_PATTERN_SOURCE,
  type CortexelError,
} from '../core/errors.js';
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
const CLI_UNSAFE_DISPLAY_REGEX = new RegExp(UNSAFE_DISPLAY_PATTERN_SOURCE, 'gu');

/**
 * Preserve exact parsed JSON values while preventing bidi/control code points from
 * reaching a terminal literally. JSON.stringify already escapes JSON controls; this
 * closes the additional display-spoofing set used by Cortexel diagnostics.
 */
export function serializeCliJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(
    CLI_UNSAFE_DISPLAY_REGEX,
    (character) => {
      // JSON.stringify has already escaped every C0 character that occurs inside a
      // key or string value. A literal C0 match here is therefore pretty-printing
      // whitespace outside a JSON token and must be retained. C1, bidi, zero-width,
      // XML-forbidden U+FFFE/U+FFFF code points and line separators can still occur
      // literally inside string tokens; spelling them as JSON escapes preserves
      // their parsed value exactly.
      if (character.charCodeAt(0) <= 0x1f) return character;
      return [...character]
        .map((part) => `\\u${part.charCodeAt(0).toString(16).padStart(4, '0')}`)
        .join('');
    },
  );
}

function writeCliJson(value: unknown, stream: NodeJS.WriteStream = process.stdout): void {
  stream.write(`${serializeCliJson(value)}\n`);
}

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
    writeCliJson({ ok: false, errors }, process.stderr);
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
    writeCliJson({
      ok: false,
      cliError: {
        kind: 'input_io',
        message,
      },
    }, process.stderr);
  } else {
    process.stderr.write(`I/O error: ${message}\n`);
  }
}

function writeInternalCliDiagnostic(message: string, asJson = false): void {
  if (asJson) {
    writeCliJson({
      ok: false,
      cliError: { kind: 'internal', message },
    }, process.stderr);
  } else {
    process.stderr.write(`Internal error: ${message}\n`);
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
    writeCliJson({
      ok: false,
      cliError: {
        kind: 'output_io',
        message,
      },
    }, process.stderr);
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

function discoveryIdentity(): ReturnType<typeof getBuildIdentity> & {
  readonly catalogDigestDomain: typeof CATALOG_DIGEST_DOMAIN;
} {
  return {
    ...getBuildIdentity(),
    catalogDigestDomain: CATALOG_DIGEST_DOMAIN,
  };
}

/** Explicit v1 top-level projection; nested records are the versioned public catalog types. */
function describeSkillProjection(skill: SkillCatalogEntry): SkillCatalogEntry {
  return {
    id: skill.id,
    revision: skill.revision,
    status: skill.status,
    availability: skill.availability,
    releaseReady: skill.releaseReady,
    title: skill.title,
    canonicalQuestion: skill.canonicalQuestion,
    cannotEstablish: skill.cannotEstablish,
    renderer: skill.renderer,
    semanticValidators: skill.semanticValidators,
    disclosures: skill.disclosures,
    budgets: skill.budgets,
    uncertaintySupport: skill.uncertaintySupport,
    accessibility: skill.accessibility,
    outputAuthority: skill.outputAuthority,
    evidence: skill.evidence,
    adapters: skill.adapters,
    legacyIds: skill.legacyIds,
    owner: skill.owner,
    knownLimitations: skill.knownLimitations,
  };
}

/** Prompt-bounded identity/routing summary used outside the explicit `all` section. */
function describeSkillSummaryProjection(skill: SkillCatalogEntry): Record<string, unknown> {
  return {
    id: skill.id,
    revision: skill.revision,
    title: skill.title,
    question: skill.canonicalQuestion,
    availability: skill.availability,
    releaseReady: skill.releaseReady,
    renderer: skill.renderer,
    adapters: skill.adapters.map((adapter) => ({
      mappingId: adapter.mappingId,
      feasibilityStatus: adapter.feasibilityStatus,
      definitionStatus: adapter.definitionStatus,
      implementationAvailability: adapter.implementationAvailability,
    })),
  };
}

function utf16EditDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      current.push(Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + (left[leftIndex] === right[rightIndex] ? 0 : 1),
      ));
    }
    previous = current;
  }
  return previous[right.length];
}

function nearestStableSkillId(value: string): string | null {
  if (value.length === 0 || value.length > 64 || !/^[a-z0-9._-]+$/u.test(value)) {
    return null;
  }
  const nearest = [...STABLE_SKILL_IDS]
    .map((id) => ({ id, distance: utf16EditDistance(value, id) }))
    .sort((left, right) =>
      left.distance - right.distance ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))[0];
  return nearest !== undefined && nearest.distance <= 3 ? nearest.id : null;
}

function cmdIdentity(args: readonly string[]): number {
  const parsed = parseOrReport(args, { flags: ['--json'], positionalCount: 0 });
  if (!parsed) return EXIT.usage;
  const identity = getBuildIdentity();
  if (parsed.flags.has('--json')) {
    writeCliJson(discoveryIdentity());
  } else {
    process.stdout.write(
      `Cortexel ${identity.packageVersion}\n` +
        `  request contract:  ${identity.requestContract}\n` +
        `  artifact contract: ${identity.artifactContract}\n` +
        `  contract digest:   ${identity.contractDigest}\n` +
        `  catalog digest:    ${identity.catalogDigest}\n` +
        `  catalog domain:    ${CATALOG_DIGEST_DOMAIN}\n` +
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
      revision: SKILL_CATALOG[id].revision,
      title: SKILL_CATALOG[id].title,
      question: SKILL_CATALOG[id].canonicalQuestion,
      availability: SKILL_CATALOG[id].availability,
      releaseReady: SKILL_CATALOG[id].releaseReady,
      adapters: SKILL_CATALOG[id].adapters.map((adapter) => ({
        mappingId: adapter.mappingId,
        feasibilityStatus: adapter.feasibilityStatus,
        definitionStatus: adapter.definitionStatus,
        implementationAvailability: adapter.implementationAvailability,
      })),
    }));
    const payload: Record<string, unknown> = {
      protocol: 'cortexel-cli-catalog',
      protocolVersion: 1,
      buildIdentity: discoveryIdentity(),
      skills: stable,
    };
    if (includeExperimental) payload.experimentalSkillIds = EXPERIMENTAL_CAPABILITY_IDS;
    writeCliJson(payload);
    return EXIT.ok;
  }

  process.stdout.write(`Stable catalog (${STABLE_SKILL_IDS.length}):\n`);
  for (const id of STABLE_SKILL_IDS) {
    process.stdout.write(`  ${id.padEnd(32)} ${safeText(SKILL_CATALOG[id].title, 512)}\n`);
  }
  if (includeExperimental) {
    process.stdout.write(`\nExperimental (not covered by the stable contract):\n`);
    for (const id of EXPERIMENTAL_CAPABILITY_IDS) process.stdout.write(`  ${id}\n`);
  } else {
    process.stdout.write(`\nUse --include-experimental to also list experimental capabilities.\n`);
  }
  return EXIT.ok;
}

function cmdDescribe(args: readonly string[]): number {
  const parsed = parseOrReport(args, {
    flags: ['--json'],
    valueOptions: ['--section'],
    positionalCount: 1,
  });
  if (!parsed) return EXIT.usage;
  const section = parsed.values.get('--section') ?? 'all';
  if (!['summary', 'example', 'schema', 'all'].includes(section)) {
    process.stderr.write(
      'usage error: --section accepts summary, example, schema, or all\n',
    );
    return EXIT.usage;
  }
  if (parsed.values.has('--section') && !parsed.flags.has('--json')) {
    process.stderr.write('usage error: --section requires --json\n');
    return EXIT.usage;
  }
  const id = parsed.positionals[0];
  if (!isStableSkillId(id)) {
    if (parsed.flags.has('--json')) {
      writeCliJson({
        protocol: 'cortexel-cli-error',
        protocolVersion: 1,
        buildIdentity: discoveryIdentity(),
        error: {
          code: 'CLI_UNKNOWN_STABLE_SKILL',
          message: 'Unknown stable skill id.',
          didYouMean: nearestStableSkillId(id),
          validSkillIds: STABLE_SKILL_IDS,
        },
      }, process.stderr);
    } else {
      const suggestion = nearestStableSkillId(id);
      process.stderr.write(
        'usage error: unknown stable skill id' +
          (suggestion === null ? '\n' : `; did you mean ${suggestion}?\n`),
      );
    }
    return EXIT.usage;
  }
  const skill = SKILL_CATALOG[id];

  if (parsed.flags.has('--json')) {
    const authoring = SKILL_AUTHORING[id];
    if (authoring === undefined) {
      // Catalog/authoring generation is one atomic source projection. Reaching this
      // branch means the packaged runtime is internally incoherent, not that the
      // caller supplied a repairable request.
      process.stderr.write('internal error: stable authoring entry is unavailable\n');
      return EXIT.internal;
    }
    const payload: Record<string, unknown> = {
      protocol: 'cortexel-cli-describe',
      protocolVersion: 1,
      buildIdentity: discoveryIdentity(),
      section,
      skill: section === 'all'
        ? describeSkillProjection(skill)
        : describeSkillSummaryProjection(skill),
      acceptanceBoundary: {
        command: 'cortexel validate <request.json>',
        note:
          'Structural schema success is not acceptance. Cortexel validation also runs ' +
          'identity, semantic, scientific, provenance, and request-budget gates. ' +
          'Use render --dry-run to prove derivation and output-budget acceptance.',
      },
    };
    if (section === 'example' || section === 'all') {
      payload.authoringExample = authoring.authoringExample;
    }
    if (section === 'schema' || section === 'all') {
      payload.requestSchema = authoring.requestSchema;
      payload.schemaCompilationProfile = AUTHORING_SCHEMA_COMPILATION_PROFILE_V1;
      payload.schemaResources = STABLE_CATALOG_SCHEMA_RESOURCES;
    }
    writeCliJson(payload);
    return EXIT.ok;
  }

  process.stdout.write(
    `${skill.id}@${skill.revision} — ${safeText(skill.title, 512)}\n` +
      `Question: ${safeText(skill.canonicalQuestion, 4_096)}\n` +
      `Availability: ${skill.availability}; release ready: ${skill.releaseReady}\n` +
      `Renderer: ${skill.renderer.id}@${skill.renderer.revision}\n` +
      `Source mappings (${skill.adapters.length}):\n`,
  );
  for (const adapter of skill.adapters) {
    process.stdout.write(
      `  ${adapter.mappingId}: ${adapter.feasibilityStatus}; ` +
        `${adapter.definitionStatus}; ${adapter.implementationAvailability}\n`,
    );
    for (const source of adapter.sources) {
      process.stdout.write(
        `    ${source.role}: ${safeText(source.sourceId, 128)} ` +
          `(${safeText(source.system, 512)})\n`,
      );
    }
  }
  process.stdout.write(
    `Use "cortexel describe ${skill.id} --json --section example" for the synthetic ` +
      'request fixture, or --section schema/all for structural resources and the complete bundle.\n',
  );
  return EXIT.ok;
}

function sourceDiscoveryIdentity(): Record<string, unknown> {
  return {
    buildIdentity: discoveryIdentity(),
    sourceAdapterCatalogDigest: SOURCE_ADAPTER_CATALOG_DIGEST,
    sourceAdapterCatalogDigestDomain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
  };
}

function nearestSourceAdapterId(value: string): string | null {
  if (value.length === 0 || value.length > 64 || !/^[a-z0-9._-]+$/u.test(value)) {
    return null;
  }
  const nearest = [...SOURCE_ADAPTER_IDS]
    .map((id) => ({ id, distance: utf16EditDistance(value, id) }))
    .sort((left, right) =>
      left.distance - right.distance ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))[0];
  return nearest !== undefined && nearest.distance <= 3 ? nearest.id : null;
}

function reportUnknownSourceAdapter(value: string, asJson: boolean): number {
  const suggestion = nearestSourceAdapterId(value);
  if (asJson) {
    writeCliJson({
      protocol: 'cortexel-cli-error',
      protocolVersion: 1,
      ...sourceDiscoveryIdentity(),
      error: {
        code: 'CLI_UNKNOWN_SOURCE_ADAPTER',
        message: 'Unknown executable source-adapter id.',
        didYouMean: suggestion,
        validSourceAdapterIds: SOURCE_ADAPTER_IDS,
      },
    }, process.stderr);
  } else {
    process.stderr.write(
      'usage error: unknown executable source-adapter id' +
        (suggestion === null ? '\n' : `; did you mean ${suggestion}?\n`),
    );
  }
  return EXIT.usage;
}

function cmdSourceCatalog(args: readonly string[]): number {
  const parsed = parseOrReport(args, { flags: ['--json'], positionalCount: 0 });
  if (!parsed) return EXIT.usage;
  if (parsed.flags.has('--json')) {
    writeCliJson({
      protocol: 'cortexel-cli-source-catalog',
      protocolVersion: 1,
      ...sourceDiscoveryIdentity(),
      adapters: SOURCE_ADAPTER_IDS.map((id) => {
        const descriptor = lookupSourceAdapter(id)!;
        return {
          id: descriptor.id,
          revision: descriptor.revision,
          title: descriptor.title,
          sourceSystem: descriptor.sourceSystem,
          admittedSourceVersions: descriptor.admittedSourceVersions,
          outputSkillId: descriptor.outputSkillId,
          command: descriptor.cli.command,
          renderCommand: descriptor.cli.renderCommand,
        };
      }),
    });
    return EXIT.ok;
  }

  process.stdout.write(`Executable source adapters (${SOURCE_ADAPTER_IDS.length}):\n`);
  for (const id of SOURCE_ADAPTER_IDS) {
    const descriptor = lookupSourceAdapter(id)!;
    process.stdout.write(
      `  ${id.padEnd(28)} ${safeText(descriptor.title, 512)}\n`,
    );
  }
  process.stdout.write(
    '\nCandidate mappings described by a skill are not executable unless listed here.\n',
  );
  return EXIT.ok;
}

function cmdSourceDescribe(args: readonly string[]): number {
  const parsed = parseOrReport(args, { flags: ['--json'], positionalCount: 1 });
  if (!parsed) return EXIT.usage;
  const id = parsed.positionals[0];
  if (!isSourceAdapterId(id)) {
    return reportUnknownSourceAdapter(id, parsed.flags.has('--json'));
  }
  const descriptor = lookupSourceAdapter(id)!;

  if (parsed.flags.has('--json')) {
    writeCliJson({
      protocol: 'cortexel-cli-source-describe',
      protocolVersion: 1,
      ...sourceDiscoveryIdentity(),
      adapter: descriptor,
    });
    return EXIT.ok;
  }

  process.stdout.write(
    `${descriptor.id}@${descriptor.revision} — ${safeText(descriptor.title, 512)}\n` +
      `Source: ${safeText(descriptor.sourceSystem, 256)} ` +
      `(${descriptor.admittedSourceVersions.join(', ')})\n` +
      `Output skill: ${descriptor.outputSkillId}\n` +
      `Command: ${descriptor.cli.command}\n` +
      `Direct render: ${descriptor.cli.renderCommand}\n` +
      'Use --json for the complete authority statement, limitations, and copyable input.\n',
  );
  return EXIT.ok;
}

function adapterEnvelopeFailure(
  instancePath: string,
  message: string,
): readonly CortexelError[] {
  return [makeError({
    code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE',
    stage: 'adapter',
    instancePath,
    message,
  })];
}

function isPlainJsonRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

type ParsedSourceInput =
  | { readonly ok: true; readonly value: JsonValue }
  | { readonly ok: false; readonly exitCode: number };

function readSourceInput(input: string, asJson: boolean): ParsedSourceInput {
  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    return { ok: false, exitCode: handleInputReadFailure(error, asJson) };
  }
  const parsed = parseJsonStrict(text, { limits: getBudgetLimits('standard') });
  if (!parsed.ok) {
    printDiagnostics(parsed.errors, asJson);
    return { ok: false, exitCode: exitCodeForErrors(parsed.errors) };
  }
  return { ok: true, value: parsed.value };
}

type PreparedSourceRequest =
  | { readonly ok: true; readonly canonicalRequestText: string }
  | { readonly ok: false; readonly errors: readonly CortexelError[] }
  | { readonly ok: false; readonly internal: true };

/** One adapter execution + complete materialized request gate, shared by emit/render. */
function prepareSourceRequest(
  id: (typeof SOURCE_ADAPTER_IDS)[number],
  value: JsonValue,
): PreparedSourceRequest {
  if (!isPlainJsonRecord(value)) {
    return {
      ok: false,
      errors: adapterEnvelopeFailure(
        '',
        'source-adapter input must be one object with exportedStatus and options members.',
      ),
    };
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== 'exportedStatus' || keys[1] !== 'options') {
    return {
      ok: false,
      errors: adapterEnvelopeFailure(
        '',
        'source-adapter input must contain exactly exportedStatus and options.',
      ),
    };
  }

  // Discovery remains separate from dispatch: catalog data alone grants no execution.
  let adapted: ReturnType<typeof nestSpikeRecorderToRaster>;
  switch (id) {
    case 'nest-spike-recorder':
      adapted = nestSpikeRecorderToRaster(
        value.exportedStatus,
        value.options as unknown as NestSpikeOptionsInput,
      );
      break;
  }
  if (!adapted.ok) return { ok: false, errors: adapted.errors };

  const checked = validateRequestValue(adapted.request);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  try {
    return {
      ok: true,
      canonicalRequestText: `${canonicalize(checked.request.canonicalRequest)}\n`,
    };
  } catch {
    return { ok: false, internal: true };
  }
}

function reportPreparedSourceFailure(
  prepared: Exclude<PreparedSourceRequest, { readonly ok: true }>,
  asJson: boolean,
): number {
  if ('internal' in prepared) {
    writeInternalCliDiagnostic('adapted request canonicalization failed', asJson);
    return EXIT.internal;
  }
  printDiagnostics(prepared.errors, asJson);
  return exitCodeForErrors(prepared.errors);
}

function cmdSourceAdapt(args: readonly string[]): number {
  const parsed = parseOrReport(args, {
    valueOptions: ['--format'],
    positionalCount: 2,
  });
  if (!parsed || !validateJsonFormat(parsed)) return EXIT.usage;
  const [id, input] = parsed.positionals;
  const asJson = parsed.values.get('--format') === 'json';
  if (!isSourceAdapterId(id)) return reportUnknownSourceAdapter(id, asJson);

  const sourceInput = readSourceInput(input, asJson);
  if (!sourceInput.ok) return sourceInput.exitCode;
  const prepared = prepareSourceRequest(id, sourceInput.value);
  if (!prepared.ok) return reportPreparedSourceFailure(prepared, asJson);
  process.stdout.write(prepared.canonicalRequestText);
  return EXIT.ok;
}

function cmdSourceRender(args: readonly string[]): number {
  const parsed = parseOrReport(args, {
    flags: ['--force', '--dry-run'],
    valueOptions: ['--output', '--format'],
    positionalCount: 2,
  });
  if (!parsed || !validateJsonFormat(parsed)) return EXIT.usage;
  const renderOptions = parseRenderInvocation(parsed);
  if (renderOptions === undefined) return EXIT.usage;

  const [id, input] = parsed.positionals;
  if (!isSourceAdapterId(id)) {
    return reportUnknownSourceAdapter(id, renderOptions.asJson);
  }
  const sourceInput = readSourceInput(input, renderOptions.asJson);
  if (!sourceInput.ok) return sourceInput.exitCode;
  const prepared = prepareSourceRequest(id, sourceInput.value);
  if (!prepared.ok) return reportPreparedSourceFailure(prepared, renderOptions.asJson);

  // Re-enter through the raw boundary using the exact canonical bytes that `source
  // adapt` emits. Thus direct source rendering and `source adapt | render` mint the
  // same request assurance, request digest, artifact bytes, and SVG bytes.
  return finishFigureRender(
    buildFigureFromJson(prepared.canonicalRequestText),
    renderOptions,
    id,
  );
}

function cmdSource(args: readonly string[]): number {
  const [subcommand, ...rest] = args;
  switch (subcommand) {
    case 'catalog':
      return cmdSourceCatalog(rest);
    case 'describe':
      return cmdSourceDescribe(rest);
    case 'adapt':
      return cmdSourceAdapt(rest);
    case 'render':
      return cmdSourceRender(rest);
    default:
      process.stderr.write(
        'usage error: source requires catalog, describe, adapt, or render\n',
      );
      return EXIT.usage;
  }
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
      writeCliJson({
        ok: true,
        skill: outcome.request.skillId,
        requestDigest: outcome.request.requestDigest,
        inputAssurance: outcome.request.inputAssurance,
      });
    } else {
      process.stdout.write(`valid: ${outcome.request.skillId} (${outcome.request.requestDigest})\n`);
    }
    return EXIT.ok;
  }

  printDiagnostics(outcome.errors, asJson);
  return exitCodeForErrors(outcome.errors);
}

interface RenderInvocation {
  readonly output?: string;
  readonly force: boolean;
  readonly dryRun: boolean;
  readonly asJson: boolean;
}

function parseRenderInvocation(parsed: ParsedArguments): RenderInvocation | undefined {
  const output = parsed.values.get('--output');
  const force = parsed.flags.has('--force');
  const dryRun = parsed.flags.has('--dry-run');
  const asJson = parsed.values.get('--format') === 'json';

  if (output === '-') {
    process.stderr.write('usage error: --output requires a filesystem path\n');
    return undefined;
  }
  if (output !== undefined && (
    !output.endsWith('.svg') || path.basename(output).length <= '.svg'.length
  )) {
    process.stderr.write('usage error: --output must name a nonempty .svg file\n');
    return undefined;
  }
  if (!dryRun && !output) {
    process.stderr.write('usage error: render requires --output <figure.svg> unless --dry-run is set\n');
    return undefined;
  }
  if (dryRun && output) {
    process.stderr.write('usage error: --dry-run cannot be combined with --output\n');
    return undefined;
  }
  if (dryRun && force) {
    process.stderr.write('usage error: --force requires --output\n');
    return undefined;
  }
  return { output, force, dryRun, asJson };
}

function sourceAdapterExecutionMetadata(
  id: (typeof SOURCE_ADAPTER_IDS)[number],
  result: FigureResult,
): Record<string, unknown> {
  const requestDigest = (
    result.artifact.provenance as { readonly requestDigest: string }
  ).requestDigest;
  return {
    id,
    revision: lookupSourceAdapter(id)!.revision,
    catalogDigest: SOURCE_ADAPTER_CATALOG_DIGEST,
    catalogDigestDomain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
    requestDigest,
    artifactDigest: result.artifact.artifactDigest,
    sourceAuthentication: 'not_performed',
  };
}

function finishFigureRender(
  result: FigureResult | FigureFailure,
  invocation: RenderInvocation,
  sourceAdapterId?: (typeof SOURCE_ADAPTER_IDS)[number],
): number {
  const { output, force, dryRun, asJson } = invocation;

  if (!result.ok) {
    printDiagnostics(result.errors, asJson);
    return exitCodeForErrors(result.errors);
  }
  const sourceExecution = sourceAdapterId === undefined
    ? undefined
    : sourceAdapterExecutionMetadata(sourceAdapterId, result);
  const sourceProtocol = sourceExecution === undefined
    ? {}
    : {
        protocol: 'cortexel-cli-source-render',
        protocolVersion: 1,
      };

  const renderedSkill =
    (result.artifact.canonicalRequest as { skill?: { id?: string } })?.skill?.id ?? 'figure';

  if (dryRun) {
    const svgByteLength = Buffer.byteLength(result.svg, 'utf8');
    if (asJson) {
      writeCliJson({
        ...sourceProtocol,
        ok: true,
        dryRun: true,
        skill: renderedSkill,
        svgByteLength,
        tableRowsTotal: result.table.rowsTotal,
        ...(sourceExecution === undefined
          ? {}
          : { sourceAdapterExecution: sourceExecution }),
      });
    } else {
      process.stdout.write(
        `would render ${renderedSkill}` +
          (sourceAdapterId === undefined ? '' : ` via ${sourceAdapterId}`) +
          `: ${svgByteLength} SVG bytes, ${result.table.rowsTotal} in-memory table rows\n`,
      );
    }
    return EXIT.ok;
  }

  // A successful non-dry render has an output path by the shared usage gate.
  const svgTarget = output!;
  const base = svgTarget.slice(0, -'.svg'.length);
  const artifactTarget = `${base}.artifact.json`;
  let artifactJson: string;
  try {
    artifactJson = canonicalize(result.artifact);
  } catch {
    writeInternalCliDiagnostic('artifact canonicalization failed', asJson);
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
      writeCliJson({
        ...sourceProtocol,
        ok: true,
        dryRun: false,
        skill: renderedSkill,
        artifactDigest: result.artifact.artifactDigest,
        outputs: result.artifact.outputs,
        tableSidecar: null,
        ...(sourceExecution === undefined
          ? {}
          : { sourceAdapterExecution: sourceExecution }),
      });
    } else {
      process.stdout.write(
        'wrote figure SVG and completion artifact' +
          (sourceAdapterId === undefined ? '' : ` via ${sourceAdapterId}`) +
          ' (no canonical table sidecar)\n',
      );
    }
  } catch (error) {
    writeOutputIoDiagnostic(error, asJson);
    return EXIT.io;
  }

  return EXIT.ok;
}

function cmdRender(args: readonly string[]): number {
  const parsed = parseOrReport(args, {
    flags: ['--force', '--dry-run'],
    valueOptions: ['--output', '--format'],
    positionalCount: 1,
  });
  if (!parsed || !validateJsonFormat(parsed)) return EXIT.usage;
  const invocation = parseRenderInvocation(parsed);
  if (invocation === undefined) return EXIT.usage;
  const input = parsed.positionals[0];

  let text: string;
  try {
    text = readInput(input);
  } catch (error) {
    return handleInputReadFailure(error, invocation.asJson);
  }
  return finishFigureRender(buildFigureFromJson(text), invocation);
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
  writeCliJson(result);
  return result.report.errors.length > 0 ? EXIT.semantic : EXIT.ok;
}

const USAGE = `Cortexel — provenance-first scientific figure contracts

Usage:
  cortexel identity [--json]
  cortexel catalog  [--include-experimental] [--json]
  cortexel describe <stable-skill-id> [--json [--section summary|example|schema|all]]
  cortexel source catalog [--json]
  cortexel source describe <source-adapter-id> [--json]
  cortexel source adapt <source-adapter-id> <input|-> [--format json]
  cortexel source render <source-adapter-id> <input|-> --output figure.svg [--force] [--format json]
  cortexel source render <source-adapter-id> <input|-> --dry-run [--format json]
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
  describe: cmdDescribe,
  source: cmdSource,
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

function installDirectPipeErrorHandlers(): void {
  process.stdout.on('error', (error: Error & { code?: string }): void => {
    if (error.code === 'EPIPE') {
      process.exitCode = EXIT.ok;
      return;
    }
    throw error;
  });
  process.stderr.on('error', (error: Error & { code?: string }): void => {
    if (error.code === 'EPIPE') return;
    throw error;
  });
}

// Setting exitCode lets stdout/stderr drain naturally. Importing this module from a
// same-basename test or application never triggers the guard.
if (isDirectExecution()) {
  installDirectPipeErrorHandlers();
  process.exitCode = run(process.argv.slice(2));
}
