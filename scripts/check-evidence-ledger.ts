/**
 * Evidence-ledger gate.
 *
 * The ledger is the only place a release claim may live. This checker exists so
 * the ledger cannot become ceremonial: it is parsed strictly, a forged `PASS`
 * (one without a reproducible receipt) is rejected, and a stable release tag
 * cannot be built while a release-blocking gate is unproven.
 *
 *   bun run check:ledger                  # structural audit
 *   bun run check:ledger -- --release 1.0.0   # stable-tag gate
 *
 * Exit codes: 0 ok, 1 ledger invalid or gate unmet, 2 usage.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const LEDGER_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../docs/release/evidence-ledger.v1.json',
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
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An ISO-8601 instant. A `PASS` whose timestamp cannot be parsed is not evidence. */
function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return Number.isFinite(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T/.test(value);
}

/**
 * Validate a parsed ledger. Pure: takes a value, returns findings. The CLI and the
 * test suite share this so a forged `PASS` cannot pass in one and fail in the other.
 */
export function validateLedger(parsed: unknown): LedgerValidation {
  const errors: string[] = [];
  const fail = (message: string): void => {
    errors.push(message);
  };

  if (!isPlainObject(parsed)) {
    return { errors: ['ledger root must be an object'], gates: [] };
  }
  if (parsed.ledgerVersion !== 1) {
    fail(`unsupported ledgerVersion: ${String(parsed.ledgerVersion)}`);
  }
  if (typeof parsed.baselineCommit !== 'string' || !/^[0-9a-f]{40}$/.test(parsed.baselineCommit)) {
    fail('baselineCommit must be a full 40-character commit SHA');
  }
  if (!Array.isArray(parsed.gates)) {
    fail('ledger.gates must be an array');
    return { errors, gates: [] };
  }

  const seen = new Set<string>();
  const gates: LedgerGate[] = [];

  for (const [index, entry] of parsed.gates.entries()) {
    const where = `gates[${index}]`;
    if (!isPlainObject(entry)) {
      fail(`${where}: must be an object`);
      continue;
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

    if (typeof section !== 'string' || section.length === 0) fail(`${id}: section is required`);
    if (typeof requirement !== 'string' || requirement.length === 0) {
      fail(`${id}: requirement is required`);
    }
    if (typeof releaseBlocking !== 'boolean') fail(`${id}: releaseBlocking must be a boolean`);
    if (typeof notes !== 'string') fail(`${id}: notes must be a string (use "" when empty)`);

    if (typeof status !== 'string' || !(LEDGER_STATUSES as readonly string[]).includes(status)) {
      fail(
        `${id}: status must be one of ${LEDGER_STATUSES.join(' | ')} (got ${JSON.stringify(status)})`,
      );
      continue;
    }

    // The core anti-forgery rule: a PASS must carry a reproducible receipt. Every
    // other status may be evidence-free, because it asserts nothing.
    if (status === 'PASS') {
      if (!isPlainObject(evidence)) {
        fail(`${id}: status PASS requires an evidence object`);
      } else {
        const ev = evidence as LedgerEvidence;
        if (typeof ev.receipt !== 'string' || ev.receipt.length === 0) {
          fail(`${id}: PASS requires evidence.receipt (what was run / where the log is)`);
        }
        if (!isIsoTimestamp(ev.reviewedAt)) {
          fail(`${id}: PASS requires an ISO-8601 evidence.reviewedAt`);
        }
        if (typeof ev.toolchain !== 'string' || ev.toolchain.length === 0) {
          fail(`${id}: PASS requires evidence.toolchain`);
        }
        if (typeof ev.sourceCommit !== 'string' || !/^[0-9a-f]{7,40}$/.test(ev.sourceCommit)) {
          fail(`${id}: PASS requires evidence.sourceCommit`);
        }
      }
    }

    if (status === 'NOT_APPLICABLE' && (typeof notes !== 'string' || notes.trim().length === 0)) {
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

  return { errors, gates };
}

/**
 * Only a stable 1.x+ tag asserts the full 1.0 contract. A pre-1.0 tag (`0.y.z`) or a
 * prerelease asserts nothing beyond "this is what we built", so it is gated on ledger
 * integrity alone.
 */
export function assertsStableContract(version: string): boolean {
  return /^(?!0\.)\d+\.\d+\.\d+$/.test(version);
}

/** Gates that block a stable tag: release-blocking and not proven. */
export function unmetReleaseGates(gates: readonly LedgerGate[]): LedgerGate[] {
  return gates.filter((gate) => gate.releaseBlocking && gate.status !== 'PASS');
}

function main(argv: readonly string[]): number {
  let releaseVersion: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--release') {
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
  try {
    parsed = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  } catch (error) {
    process.stderr.write(`ledger not readable/parseable at ${LEDGER_PATH}: ${String(error)}\n`);
    return 1;
  }

  const { errors, gates } = validateLedger(parsed);

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

  if (!assertsStableContract(releaseVersion)) {
    process.stdout.write(
      `\n${releaseVersion} is a pre-1.0 / prerelease version: it makes no stable-contract claim.\n` +
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
  process.exit(main(process.argv.slice(2)));
}
