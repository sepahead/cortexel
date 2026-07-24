/**
 * Evidence-ledger gate.
 *
 * The ledger is the only place a release claim may live. This checker exists so
 * the ledger cannot become ceremonial: it is parsed strictly, a forged `PASS`
 * (one without a reproducible receipt) is rejected, and a stable release tag
 * cannot be built while a release-blocking gate is unproven.
 *
 *   bun run check:ledger                  # structural audit
 *   bun run check:ledger -- --release 0.9.0   # exact final-tag ledger gate
 *
 * Exit codes: 0 ok, 1 ledger invalid or gate unmet, 2 usage.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';

import {
  compareFinalCoreSemVer,
  isFinalCoreSemVer,
  isRfc3339Instant,
  isStableContractRelease,
} from './lib/release-identity.js';
import { readDirectRepositoryFile } from './lib/direct-repository-file.js';
import { parseJsonSourceStrict } from './lib/strict-json-source.js';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const LEDGER_PATH = path.resolve(
  REPOSITORY_ROOT,
  'docs/release/evidence-ledger.v1.json',
);
export const LEDGER_SCHEMA_PATH = path.resolve(
  REPOSITORY_ROOT,
  'docs/release/evidence-ledger.schema.json',
);

/** Closed status set. A status outside this set is a ledger defect, not a new state. */
export const LEDGER_STATUSES = [
  'PASS',
  'FAIL',
  'NOT_RUN',
  'NOT_APPLICABLE',
  'BLOCKED',
] as const;
export type LedgerStatus = (typeof LEDGER_STATUSES)[number];

/** Gate IDs are fixed by the release checklist; drift means the ledger lost a gate. */
export const EXPECTED_GATE_COUNT = 155;
const GATE_ID_PATTERN = /^R(\d{3})$/;
const UNSAFE_LEDGER_TEXT = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

export interface LedgerEvidence {
  command?: string;
  exitCode?: number;
  toolchain?: string;
  sourceCommit?: string;
  reviewedAt?: string;
  receipt?: string;
  artifactDigest?: string;
  reviewer?: string;
}

export interface LedgerGate {
  id: string;
  section: string;
  requirement: string;
  releaseBlocking: boolean;
  status: LedgerStatus;
  evidence: LedgerEvidence | null;
  notes: string;
}

export interface LedgerValidation {
  errors: string[];
  gates: LedgerGate[];
  metadata: LedgerMetadata | null;
}

export interface LedgerMetadata {
  readonly project: 'cortexel';
  readonly targetRelease: string;
  readonly currentRelease: string;
  readonly statement: string;
}

const LEDGER_ROOT_KEYS = new Set([
  '$schema',
  'ledgerVersion',
  'project',
  'targetRelease',
  'currentRelease',
  'statement',
  'baselineCommit',
  'gates',
]);
const LEDGER_GATE_KEYS = new Set([
  'id',
  'section',
  'requirement',
  'releaseBlocking',
  'status',
  'evidence',
  'notes',
]);
const LEDGER_EVIDENCE_KEYS = new Set([
  'command',
  'exitCode',
  'toolchain',
  'sourceCommit',
  'reviewedAt',
  'receipt',
  'artifactDigest',
  'reviewer',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTrimmedString(value: unknown, options: { allowEmpty: boolean; max: number }): value is string {
  return typeof value === 'string' &&
    value.length <= options.max &&
    value === value.trim() &&
    !UNSAFE_LEDGER_TEXT.test(value) &&
    (options.allowEmpty || value.length > 0);
}

function statementNamesRelease(statement: string, release: string): boolean {
  const escaped = release.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}.+-])${escaped}(?:$|[^\\p{L}\\p{N}.+-])`, 'u')
    .test(statement);
}

let defaultLedgerSchema: unknown;
const ledgerSchemaValidators = new WeakMap<object, ValidateFunction>();

function getDefaultLedgerSchema(): unknown {
  defaultLedgerSchema ??= parseJsonSourceStrict(
    readDirectRepositoryFile(REPOSITORY_ROOT, 'docs/release/evidence-ledger.schema.json'),
    LEDGER_SCHEMA_PATH,
  );
  return defaultLedgerSchema;
}

function ledgerSchemaErrors(parsed: unknown, schema: unknown): string[] {
  if (!isPlainObject(schema)) return ['evidence ledger schema root must be an object'];
  let validate = ledgerSchemaValidators.get(schema);
  if (!validate) {
    try {
      validate = new Ajv2020({ allErrors: true, strict: true, validateSchema: true })
        .compile(schema);
    } catch {
      return ['evidence ledger schema is not strict-compilable'];
    }
    ledgerSchemaValidators.set(schema, validate);
  }
  if (validate(parsed)) return [];
  return (validate.errors ?? []).slice(0, 64).map((error) =>
    `schema ${error.instancePath || '/'} ${error.message ?? error.keyword}`,
  );
}

/**
 * Validate a parsed ledger. Pure: takes a value, returns findings. The CLI and the
 * test suite share this so a forged `PASS` cannot pass in one and fail in the other.
 */
export function validateLedger(
  parsed: unknown,
  schema: unknown = getDefaultLedgerSchema(),
): LedgerValidation {
  const errors: string[] = ledgerSchemaErrors(parsed, schema);
  const fail = (message: string): void => {
    errors.push(message);
  };

  if (!isPlainObject(parsed)) {
    return { errors: ['ledger root must be an object'], gates: [], metadata: null };
  }
  for (const key of Object.keys(parsed)) {
    if (!LEDGER_ROOT_KEYS.has(key)) fail(`ledger root has unknown member ${JSON.stringify(key)}`);
  }
  if (parsed.$schema !== './evidence-ledger.schema.json') {
    fail('$schema must be "./evidence-ledger.schema.json"');
  }
  if (parsed.ledgerVersion !== 1) {
    fail(`unsupported ledgerVersion: ${String(parsed.ledgerVersion)}`);
  }
  if (parsed.project !== 'cortexel') {
    fail('project must be "cortexel"');
  }
  if (!isFinalCoreSemVer(parsed.targetRelease) || !isStableContractRelease(parsed.targetRelease)) {
    fail('targetRelease must be a strict final 1.x+ core SemVer');
  }
  if (!isFinalCoreSemVer(parsed.currentRelease)) {
    fail('currentRelease must be a strict final core SemVer');
  }
  const releaseOrder = compareFinalCoreSemVer(parsed.currentRelease, parsed.targetRelease);
  if (releaseOrder !== null && releaseOrder > 0) {
    fail('currentRelease must not be newer than targetRelease');
  }
  if (
    typeof parsed.statement !== 'string' ||
    parsed.statement.trim().length === 0 ||
    parsed.statement !== parsed.statement.trim() ||
    parsed.statement.length > 2_000 ||
    UNSAFE_LEDGER_TEXT.test(parsed.statement)
  ) {
    fail('statement must be a nonblank trimmed string of at most 2000 characters');
  } else if (
    typeof parsed.currentRelease === 'string' &&
    !statementNamesRelease(parsed.statement, parsed.currentRelease)
  ) {
    fail('statement must name currentRelease explicitly');
  }
  if (typeof parsed.baselineCommit !== 'string' || !/^[0-9a-f]{40}$/.test(parsed.baselineCommit)) {
    fail('baselineCommit must be a full 40-character commit SHA');
  }
  if (!Array.isArray(parsed.gates)) {
    fail('ledger.gates must be an array');
    return { errors, gates: [], metadata: null };
  }

  const seen = new Set<string>();
  const gates: LedgerGate[] = [];
  const stableReleaseEvidence = isStableContractRelease(parsed.currentRelease);

  for (const [index, entry] of parsed.gates.entries()) {
    const where = `gates[${index}]`;
    if (!isPlainObject(entry)) {
      fail(`${where}: must be an object`);
      continue;
    }
    for (const key of Object.keys(entry)) {
      if (!LEDGER_GATE_KEYS.has(key)) fail(`${where}: unknown member ${JSON.stringify(key)}`);
    }
    const { id, section, requirement, releaseBlocking, status, evidence, notes } = entry;

    if (typeof id !== 'string' || !GATE_ID_PATTERN.test(id)) {
      fail(`${where}: id must match R### (got ${JSON.stringify(id)})`);
      continue;
    }
    if (seen.has(id)) {
      fail(`${where}: duplicate gate id ${id}`);
      continue;
    }
    seen.add(id);
    const expectedId = `R${String(index + 1).padStart(3, '0')}`;
    if (id !== expectedId) {
      fail(`${where}: gate order must be contiguous; expected ${expectedId}, found ${id}`);
    }

    if (!isTrimmedString(section, { allowEmpty: false, max: 4_096 })) {
      fail(`${id}: section must be a trimmed nonblank string of at most 4096 characters`);
    }
    if (!isTrimmedString(requirement, { allowEmpty: false, max: 4_096 })) {
      fail(`${id}: requirement must be a trimmed nonblank string of at most 4096 characters`);
    }
    if (releaseBlocking !== true) {
      fail(`${id}: releaseBlocking must be true for every fixed release gate`);
    }
    if (!isTrimmedString(notes, { allowEmpty: true, max: 8_192 })) {
      fail(`${id}: notes must be a trimmed string of at most 8192 characters (use "" when empty)`);
    }

    if (typeof status !== 'string' || !(LEDGER_STATUSES as readonly string[]).includes(status)) {
      fail(
        `${id}: status must be one of ${LEDGER_STATUSES.join(' | ')} (got ${JSON.stringify(status)})`,
      );
      continue;
    }

    if (evidence !== null && !isPlainObject(evidence)) {
      fail(`${id}: evidence must be an object or null`);
    }
    if (isPlainObject(evidence)) {
      for (const key of Object.keys(evidence)) {
        if (!LEDGER_EVIDENCE_KEYS.has(key)) {
          fail(`${id}: evidence has unknown member ${JSON.stringify(key)}`);
        }
      }
      const ev = evidence as LedgerEvidence;
      for (const key of ['receipt', 'toolchain', 'command', 'reviewer'] as const) {
        const value = ev[key];
        if (value !== undefined && !isTrimmedString(value, { allowEmpty: false, max: 4_096 })) {
          fail(`${id}: evidence.${key} must be a trimmed nonblank string of at most 4096 characters`);
        }
      }
      if (ev.sourceCommit !== undefined && !/^[0-9a-f]{40}$/u.test(ev.sourceCommit)) {
        fail(`${id}: evidence.sourceCommit must be a full 40-character commit SHA`);
      }
      if (ev.reviewedAt !== undefined && !isRfc3339Instant(ev.reviewedAt)) {
        fail(`${id}: evidence.reviewedAt must be a real RFC 3339 instant with a known offset`);
      }
      if (ev.exitCode !== undefined && !Number.isInteger(ev.exitCode)) {
        fail(`${id}: evidence.exitCode must be an integer`);
      }
      if (
        ev.artifactDigest !== undefined &&
        (typeof ev.artifactDigest !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(ev.artifactDigest))
      ) {
        fail(`${id}: evidence.artifactDigest must be one lowercase SHA-256 identity`);
      }
    }

    // The core anti-forgery rule: a PASS must carry a reproducible receipt. Every
    // other status may be evidence-free, because it asserts nothing.
    if (status === 'PASS') {
      if (!isPlainObject(evidence)) {
        fail(`${id}: status PASS requires an evidence object`);
      } else {
        const ev = evidence as LedgerEvidence;
        if (!isTrimmedString(ev.receipt, { allowEmpty: false, max: 4_096 })) {
          fail(`${id}: PASS requires evidence.receipt (what was run / where the log is)`);
        }
        if (!isRfc3339Instant(ev.reviewedAt)) {
          fail(`${id}: PASS requires a real RFC 3339 evidence.reviewedAt instant`);
        }
        if (!isTrimmedString(ev.toolchain, { allowEmpty: false, max: 4_096 })) {
          fail(`${id}: PASS requires evidence.toolchain`);
        }
        if (typeof ev.sourceCommit !== 'string' || !/^[0-9a-f]{40}$/u.test(ev.sourceCommit)) {
          fail(`${id}: PASS requires a full evidence.sourceCommit SHA`);
        }
        if (ev.exitCode !== undefined && ev.exitCode !== 0) {
          fail(`${id}: PASS evidence.exitCode must be 0 when it is recorded`);
        }
        if (stableReleaseEvidence && ev.exitCode !== 0) {
          fail(`${id}: stable-release PASS requires evidence.exitCode 0`);
        }
        if (
          stableReleaseEvidence &&
          (typeof ev.artifactDigest !== 'string' ||
            !/^sha256:[0-9a-f]{64}$/u.test(ev.artifactDigest))
        ) {
          fail(`${id}: stable-release PASS requires a lowercase SHA-256 evidence.artifactDigest`);
        }
      }
    }

    if (status === 'NOT_APPLICABLE' && !isTrimmedString(notes, { allowEmpty: false, max: 4_096 })) {
      fail(`${id}: NOT_APPLICABLE requires a rationale in notes`);
    }

    gates.push(entry as unknown as LedgerGate);
  }

  if (gates.length !== EXPECTED_GATE_COUNT) {
    fail(`expected ${EXPECTED_GATE_COUNT} gates, found ${gates.length}`);
  }

  // Contiguity: a silently dropped gate would otherwise read as "nothing to do".
  for (let n = 1; n <= EXPECTED_GATE_COUNT; n++) {
    const id = `R${String(n).padStart(3, '0')}`;
    if (!seen.has(id)) fail(`missing gate ${id}`);
  }

  const metadata =
    parsed.project === 'cortexel' &&
    isFinalCoreSemVer(parsed.targetRelease) &&
    isStableContractRelease(parsed.targetRelease) &&
    isFinalCoreSemVer(parsed.currentRelease) &&
    typeof parsed.statement === 'string'
      ? Object.freeze({
          project: 'cortexel' as const,
          targetRelease: parsed.targetRelease,
          currentRelease: parsed.currentRelease,
          statement: parsed.statement,
        })
      : null;

  return { errors, gates, metadata };
}

/** Duplicate-aware source boundary shared by the CLI, verifier, and tests. */
export function parseLedgerJsonStrict(
  source: string | Uint8Array,
  sourceName = 'docs/release/evidence-ledger.v1.json',
): unknown {
  return parseJsonSourceStrict(source, sourceName);
}

/**
 * Only a stable 1.x+ tag asserts the full 1.0 contract. A final pre-1.0 tag (`0.y.z`)
 * asserts no stable contract, but it must still equal the ledger's current release.
 * Prerelease/build identifiers are development identities and are not tag-gate inputs.
 */
export function assertsStableContract(version: string): boolean {
  return isStableContractRelease(version);
}

/**
 * Gates that block a stable tag. All fixed v1 ledger gates are release-blocking;
 * deliberately do not trust a caller-provided `false` if this helper is invoked on an
 * invalid ledger without first checking `errors`.
 */
export function unmetReleaseGates(gates: readonly LedgerGate[]): LedgerGate[] {
  return gates.filter((gate) => gate.status !== 'PASS');
}

/** Every final tag, including 0.x, must be the release this ledger says is current. */
export function ledgerReleaseArgumentProblems(
  releaseVersion: unknown,
  metadata: LedgerMetadata | null,
): string[] {
  const problems: string[] = [];
  if (!isFinalCoreSemVer(releaseVersion)) {
    problems.push('release argument must be a strict final core SemVer (X.Y.Z)');
    return problems;
  }
  if (metadata === null) {
    problems.push('ledger release metadata is invalid');
  } else if (releaseVersion !== metadata.currentRelease) {
    problems.push(
      `release argument ${releaseVersion} does not equal ledger currentRelease ${metadata.currentRelease}`,
    );
  }
  return problems;
}

export function runEvidenceLedgerCli(
  argv: readonly string[],
  repositoryRoot = REPOSITORY_ROOT,
): number {
  let releaseVersion: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--release') {
      if (releaseVersion !== undefined) {
        process.stderr.write('--release may be supplied only once\n');
        return 2;
      }
      releaseVersion = argv[i + 1];
      i++;
      if (!releaseVersion) {
        process.stderr.write('usage: check-evidence-ledger.ts [--release <version>]\n');
        return 2;
      }
    } else {
      process.stderr.write(`unknown argument: ${argv[i]}\n`);
      return 2;
    }
  }

  let parsed: unknown;
  let schema: unknown;
  try {
    parsed = parseLedgerJsonStrict(
      readDirectRepositoryFile(repositoryRoot, 'docs/release/evidence-ledger.v1.json'),
      path.resolve(repositoryRoot, 'docs/release/evidence-ledger.v1.json'),
    );
    schema = parseLedgerJsonStrict(
      readDirectRepositoryFile(repositoryRoot, 'docs/release/evidence-ledger.schema.json'),
      path.resolve(repositoryRoot, 'docs/release/evidence-ledger.schema.json'),
    );
  } catch (error) {
    process.stderr.write(`ledger/schema not readable/parseable: ${String(error)}\n`);
    return 1;
  }

  const { errors, gates, metadata } = validateLedger(parsed, schema);

  if (errors.length > 0) {
    process.stderr.write('Evidence ledger is invalid:\n');
    for (const error of errors) process.stderr.write(`  - ${error}\n`);
    return 1;
  }

  const counts = new Map<LedgerStatus, number>(LEDGER_STATUSES.map((s) => [s, 0]));
  for (const gate of gates) counts.set(gate.status, (counts.get(gate.status) ?? 0) + 1);

  process.stdout.write(`Evidence ledger: ${gates.length} gates\n`);
  for (const status of LEDGER_STATUSES) {
    process.stdout.write(`  ${status.padEnd(15)} ${counts.get(status) ?? 0}\n`);
  }

  if (!releaseVersion) {
    process.stdout.write(
      '\nStructural audit only. Pass --release <version> to apply the tag gate.\n',
    );
    return 0;
  }

  const releaseArgumentProblems = ledgerReleaseArgumentProblems(releaseVersion, metadata);
  if (releaseArgumentProblems.length > 0) {
    process.stderr.write('\nRelease argument is invalid:\n');
    for (const problem of releaseArgumentProblems) process.stderr.write(`  - ${problem}\n`);
    return 1;
  }

  if (!assertsStableContract(releaseVersion)) {
    process.stdout.write(
      `\n${releaseVersion} is a final pre-1.0 version: it makes no stable-contract claim.\n` +
        'Ledger integrity is enforced; unproven gates do not block the tag.\n',
    );
    return 0;
  }

  const unmet = unmetReleaseGates(gates);
  if (unmet.length > 0) {
    process.stderr.write(
      `\nRelease ${releaseVersion} is BLOCKED: ${unmet.length} release-blocking gate(s) are not PASS.\n`,
    );
    for (const gate of unmet.slice(0, 40)) {
      process.stderr.write(`  ${gate.id} [${gate.status}] ${gate.requirement}\n`);
    }
    if (unmet.length > 40) process.stderr.write(`  ... and ${unmet.length - 40} more\n`);
    return 1;
  }

  process.stdout.write(`\nRelease ${releaseVersion} is authorized by the ledger.\n`);
  return 0;
}

// Only act as a CLI when executed directly; the test suite imports the pure helpers.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(runEvidenceLedgerCli(process.argv.slice(2)));
}
