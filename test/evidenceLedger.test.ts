import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  EXPECTED_GATE_COUNT,
  LEDGER_PATH,
  LEDGER_SCHEMA_PATH,
  assertsStableContract,
  ledgerReleaseArgumentProblems,
  parseLedgerJsonStrict,
  runEvidenceLedgerCli,
  unmetReleaseGates,
  validateLedger,
  type LedgerGate,
} from '../scripts/check-evidence-ledger';

/** A ledger whose gates are all NOT_RUN: structurally valid, asserting nothing. */
function buildLedger(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const gates = Array.from({ length: EXPECTED_GATE_COUNT }, (_unused, index) => ({
    id: `R${String(index + 1).padStart(3, '0')}`,
    section: 'Product boundary and identity',
    requirement: 'placeholder requirement',
    releaseBlocking: true,
    status: 'NOT_RUN',
    evidence: null,
    notes: '',
  }));
  return {
    $schema: './evidence-ledger.schema.json',
    ledgerVersion: 1,
    project: 'cortexel',
    targetRelease: '1.0.0',
    currentRelease: '0.9.0',
    statement: 'Cortexel 0.9.0 evidence state for the future 1.0 target.',
    baselineCommit: '16f2da71a5beb863235a90e552e6772639638be3',
    gates,
    ...overrides,
  };
}

const VALID_EVIDENCE = {
  command: 'bun run test',
  exitCode: 0,
  toolchain: 'node v26.3.0 / bun 1.3.14',
  sourceCommit: '16f2da71a5beb863235a90e552e6772639638be3',
  reviewedAt: '2026-07-14T00:00:00Z',
  receipt: 'docs/release/evidence/unit-tests.log',
};

const VALID_STABLE_EVIDENCE = {
  ...VALID_EVIDENCE,
  artifactDigest: `sha256:${'a'.repeat(64)}`,
};

describe('evidence ledger — the committed ledger', () => {
  it('is structurally valid', () => {
    expect(() => parseLedgerJsonStrict(
      readFileSync(LEDGER_SCHEMA_PATH),
      LEDGER_SCHEMA_PATH,
    )).not.toThrow();
    const parsed = parseLedgerJsonStrict(readFileSync(LEDGER_PATH), LEDGER_PATH);
    const { errors, gates } = validateLedger(parsed);
    expect(errors).toEqual([]);
    expect(gates).toHaveLength(EXPECTED_GATE_COUNT);
  });

  it('uses the symlink-refusing release reader at the standalone CLI boundary', () => {
    if (process.platform === 'win32') return;
    const repository = mkdtempSync(path.join(tmpdir(), 'cortexel-ledger-cli-'));
    const outside = mkdtempSync(path.join(tmpdir(), 'cortexel-ledger-outside-'));
    try {
      const release = path.join(repository, 'docs', 'release');
      mkdirSync(release, { recursive: true });
      writeFileSync(
        path.join(release, 'evidence-ledger.schema.json'),
        readFileSync(LEDGER_SCHEMA_PATH),
      );
      writeFileSync(path.join(outside, 'ledger.json'), '{}\n');
      symlinkSync(path.join(outside, 'ledger.json'), path.join(release, 'evidence-ledger.v1.json'));
      expect(runEvidenceLedgerCli([], repository)).toBe(1);
    } finally {
      rmSync(repository, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('never records a PASS without a reproducible receipt', () => {
    const parsed = parseLedgerJsonStrict(readFileSync(LEDGER_PATH), LEDGER_PATH);
    const { gates } = validateLedger(parsed);
    for (const gate of gates.filter((entry) => entry.status === 'PASS')) {
      expect(gate.evidence?.receipt, `${gate.id} receipt`).toBeTruthy();
      expect(gate.evidence?.sourceCommit, `${gate.id} sourceCommit`).toBeTruthy();
    }
  });

  it('keeps the six-claim R027 gate unproven after its partial receipt was demoted', () => {
    const parsed = parseLedgerJsonStrict(readFileSync(LEDGER_PATH), LEDGER_PATH);
    const { gates } = validateLedger(parsed);
    const gate = gates.find((entry) => entry.id === 'R027');
    expect(gate?.status).toBe('NOT_RUN');
    expect(gate?.evidence).toBeNull();
    expect(gate?.notes).toContain('all six exact scope claims');
  });

  it('keeps removed or future checklist scope explicit and release-blocking', () => {
    const parsed = parseLedgerJsonStrict(readFileSync(LEDGER_PATH), LEDGER_PATH);
    const { gates } = validateLedger(parsed);
    for (const id of ['R002', 'R055', 'R070', 'R091']) {
      const gate = gates.find((entry) => entry.id === id);
      expect(gate?.status, id).toBe('NOT_RUN');
      expect(gate?.notes.length, id).toBeGreaterThan(0);
      expect(unmetReleaseGates(gates).map((entry) => entry.id), id).toContain(id);
    }
  });
});

describe('evidence ledger — a valid fixture', () => {
  it('accepts an all-NOT_RUN ledger', () => {
    expect(validateLedger(buildLedger()).errors).toEqual([]);
  });

  it('accepts a PASS that carries a complete receipt', () => {
    const ledger = buildLedger();
    (ledger.gates as LedgerGate[])[0].status = 'PASS';
    (ledger.gates as LedgerGate[])[0].evidence = { ...VALID_EVIDENCE };
    expect(validateLedger(ledger).errors).toEqual([]);
  });
});

describe('evidence ledger — forged and malformed fixtures fail closed', () => {
  it('rejects a PASS with no evidence at all', () => {
    const ledger = buildLedger();
    (ledger.gates as LedgerGate[])[0].status = 'PASS';
    const { errors } = validateLedger(ledger);
    expect(errors).toContain('R001: status PASS requires an evidence object');
  });

  it('rejects a PASS whose receipt is missing', () => {
    const ledger = buildLedger();
    const gate = (ledger.gates as LedgerGate[])[0];
    gate.status = 'PASS';
    const { receipt: _dropped, ...withoutReceipt } = VALID_EVIDENCE;
    gate.evidence = withoutReceipt;
    const { errors } = validateLedger(ledger);
    expect(errors.some((error) => error.includes('R001: PASS requires evidence.receipt'))).toBe(
      true,
    );
  });

  it('rejects a PASS whose timestamp is malformed', () => {
    const ledger = buildLedger();
    const gate = (ledger.gates as LedgerGate[])[0];
    gate.status = 'PASS';
    gate.evidence = { ...VALID_EVIDENCE, reviewedAt: 'last Tuesday' };
    const { errors } = validateLedger(ledger);
    expect(errors).toContain('R001: PASS requires a real RFC 3339 evidence.reviewedAt instant');
  });

  it('rejects a PASS whose source commit is not a SHA', () => {
    const ledger = buildLedger();
    const gate = (ledger.gates as LedgerGate[])[0];
    gate.status = 'PASS';
    gate.evidence = { ...VALID_EVIDENCE, sourceCommit: 'HEAD' };
    const { errors } = validateLedger(ledger);
    expect(errors).toContain('R001: PASS requires a full evidence.sourceCommit SHA');
  });

  it('rejects abbreviated commits, impossible/local timestamps, whitespace receipts, and extras', () => {
    const ledger = buildLedger();
    const gate = (ledger.gates as unknown as Array<Record<string, unknown>>)[0];
    gate.status = 'PASS';
    gate.invented = true;
    gate.evidence = {
      ...VALID_EVIDENCE,
      receipt: ' ',
      toolchain: ' ',
      sourceCommit: 'abcdef0',
      reviewedAt: '2026-02-31T00:00:00Z',
      invented: true,
    };
    const { errors } = validateLedger(ledger);
    expect(errors).toEqual(expect.arrayContaining([
      'gates[0]: unknown member "invented"',
      'R001: evidence has unknown member "invented"',
      'R001: PASS requires evidence.receipt (what was run / where the log is)',
      'R001: PASS requires evidence.toolchain',
      'R001: PASS requires a full evidence.sourceCommit SHA',
      'R001: PASS requires a real RFC 3339 evidence.reviewedAt instant',
    ]));
  });

  it('rejects an unknown gate id', () => {
    const ledger = buildLedger();
    (ledger.gates as LedgerGate[])[0].id = 'R1000';
    const { errors } = validateLedger(ledger);
    expect(errors.some((error) => error.includes('id must match R###'))).toBe(true);
    expect(errors).toContain('missing gate R001');
  });

  it('rejects a duplicate gate id', () => {
    const ledger = buildLedger();
    (ledger.gates as LedgerGate[])[1].id = 'R001';
    const { errors } = validateLedger(ledger);
    expect(errors).toContain('gates[1]: duplicate gate id R001');
    expect(errors).toContain('missing gate R002');
  });

  it('rejects a complete but reordered gate inventory', () => {
    const ledger = buildLedger();
    const gates = ledger.gates as LedgerGate[];
    [gates[0], gates[1]] = [gates[1], gates[0]];
    expect(validateLedger(ledger).errors).toEqual(expect.arrayContaining([
      'gates[0]: gate order must be contiguous; expected R001, found R002',
      'gates[1]: gate order must be contiguous; expected R002, found R001',
    ]));
  });

  it('rejects a missing gate', () => {
    const ledger = buildLedger();
    (ledger.gates as LedgerGate[]).pop();
    const { errors } = validateLedger(ledger);
    expect(errors).toContain(`expected ${EXPECTED_GATE_COUNT} gates, found ${EXPECTED_GATE_COUNT - 1}`);
    expect(errors).toContain(`missing gate R${String(EXPECTED_GATE_COUNT).padStart(3, '0')}`);
  });

  it('rejects an unknown status', () => {
    const ledger = buildLedger();
    (ledger.gates as unknown as Array<Record<string, unknown>>)[0].status = 'MOSTLY_PASSING';
    const { errors } = validateLedger(ledger);
    expect(errors.some((error) => error.startsWith('R001: status must be one of'))).toBe(true);
  });

  it('rejects NOT_APPLICABLE without a rationale', () => {
    const ledger = buildLedger();
    (ledger.gates as LedgerGate[])[0].status = 'NOT_APPLICABLE';
    const { errors } = validateLedger(ledger);
    expect(errors).toContain('R001: NOT_APPLICABLE requires a rationale in notes');
  });

  it('does not let a fixed gate opt out of release blocking', () => {
    const ledger = buildLedger();
    (ledger.gates as LedgerGate[])[0].releaseBlocking = false;
    const result = validateLedger(ledger);
    expect(result.errors).toContain(
      'R001: releaseBlocking must be true for every fixed release gate',
    );
    expect(unmetReleaseGates(result.gates)).toHaveLength(EXPECTED_GATE_COUNT);
  });

  it('rejects a contradictory nonzero exit code on PASS evidence', () => {
    const ledger = buildLedger();
    const gate = (ledger.gates as LedgerGate[])[0];
    gate.status = 'PASS';
    gate.evidence = { ...VALID_EVIDENCE, exitCode: 1 };
    expect(validateLedger(ledger).errors).toContain(
      'R001: PASS evidence.exitCode must be 0 when it is recorded',
    );
  });

  it('rejects a truncated baseline commit', () => {
    const { errors } = validateLedger(buildLedger({ baselineCommit: '16f2da7' }));
    expect(errors).toContain('baselineCommit must be a full 40-character commit SHA');
  });

  it('validates the closed project/release/statement metadata', () => {
    expect(validateLedger(buildLedger({ project: 'other' })).errors)
      .toContain('project must be "cortexel"');
    expect(validateLedger(buildLedger({ targetRelease: '0.10.0' })).errors)
      .toContain('targetRelease must be a strict final 1.x+ core SemVer');
    expect(validateLedger(buildLedger({ currentRelease: 'banana' })).errors)
      .toContain('currentRelease must be a strict final core SemVer');
    expect(validateLedger(buildLedger({ statement: ' ' })).errors)
      .toContain('statement must be a nonblank trimmed string of at most 2000 characters');
    expect(validateLedger(buildLedger({ statement: 'Cortexel 0.9.0\u001b[2J' })).errors)
      .toContain('statement must be a nonblank trimmed string of at most 2000 characters');
    expect(validateLedger(buildLedger({ statement: 'Spoofed 10.9.00 evidence state.' })).errors)
      .toContain('statement must name currentRelease explicitly');
    expect(validateLedger(buildLedger({ statement: 'Spoofed α0.9.0β evidence state.' })).errors)
      .toContain('statement must name currentRelease explicitly');
    expect(validateLedger(buildLedger({ currentRelease: '1.0.1' })).errors)
      .toContain('currentRelease must not be newer than targetRelease');
    expect(validateLedger(buildLedger({ invented: true })).errors)
      .toContain('ledger root has unknown member "invented"');
  });

  it('rejects terminal and bidirectional controls in printable ledger claims', () => {
    const ledger = buildLedger();
    const gate = (ledger.gates as LedgerGate[])[0];
    gate.requirement = 'Looks safe\u202eexe.txt';
    expect(validateLedger(ledger).errors).toContain(
      'R001: requirement must be a trimmed nonblank string of at most 4096 characters',
    );
  });

  it('rejects duplicate raw members before ledger materialization', () => {
    expect(() => parseLedgerJsonStrict(
      '{"ledgerVersion":1,"ledgerVersion":1}',
      'duplicate-ledger.json',
    )).toThrow(/duplicate JSON object member "ledgerVersion"/u);
    expect(() => parseLedgerJsonStrict(
      '{"gates":[{"id":"R001","id":"R001"}]}',
      'duplicate-nested-ledger.json',
    )).toThrow(/duplicate JSON object member "id"/u);
  });

  it('rejects a non-object root', () => {
    expect(validateLedger(null).errors).toContain('ledger root must be an object');
    expect(validateLedger([]).errors).toContain('ledger root must be an object');
  });
});

describe('evidence ledger — the stable-tag gate', () => {
  it('treats only 1.x+ final versions as asserting the stable contract', () => {
    expect(assertsStableContract('1.0.0')).toBe(true);
    expect(assertsStableContract('2.3.4')).toBe(true);
    expect(assertsStableContract('0.9.0')).toBe(false);
    expect(assertsStableContract('0.5.0')).toBe(false);
    expect(assertsStableContract('1.0.0-rc.1')).toBe(false);
    expect(assertsStableContract('banana')).toBe(false);
    expect(assertsStableContract('01.0.0')).toBe(false);
  });

  it('blocks a simulated v1.0.0 tag while any release-blocking gate is unproven', () => {
    const { gates } = validateLedger(buildLedger());
    const unmet = unmetReleaseGates(gates);
    expect(unmet).toHaveLength(EXPECTED_GATE_COUNT);
  });

  it('treats NOT_APPLICABLE as unresolved rather than an authorization shortcut', () => {
    const ledger = buildLedger();
    const gate = (ledger.gates as LedgerGate[])[0];
    gate.status = 'NOT_APPLICABLE';
    gate.notes = 'The capability is outside the current product scope.';
    const result = validateLedger(ledger);
    expect(result.errors).toEqual([]);
    expect(unmetReleaseGates(result.gates).map((entry) => entry.id)).toContain('R001');
  });

  it('requires exit status and a receipt digest before any stable-release PASS', () => {
    const stableMetadata = {
      currentRelease: '1.0.0',
      statement: 'Cortexel 1.0.0 stable-release evidence.',
    };
    const missing = buildLedger(stableMetadata);
    const missingGate = (missing.gates as LedgerGate[])[0];
    missingGate.status = 'PASS';
    const { exitCode: _exitCode, ...withoutExit } = VALID_EVIDENCE;
    missingGate.evidence = withoutExit;
    const missingErrors = validateLedger(missing).errors.join('\n');
    expect(missingErrors).toContain('stable-release PASS requires evidence.exitCode 0');
    expect(missingErrors).toContain('stable-release PASS requires a lowercase SHA-256 evidence.artifactDigest');

    const complete = buildLedger(stableMetadata);
    const completeGate = (complete.gates as LedgerGate[])[0];
    completeGate.status = 'PASS';
    completeGate.evidence = { ...VALID_STABLE_EVIDENCE };
    expect(validateLedger(complete).errors).toEqual([]);
  });

  it('accepts only the exact final currentRelease at the --release boundary', () => {
    const { metadata } = validateLedger(buildLedger());
    expect(ledgerReleaseArgumentProblems('0.9.0', metadata)).toEqual([]);
    expect(ledgerReleaseArgumentProblems('banana', metadata)).toEqual([
      'release argument must be a strict final core SemVer (X.Y.Z)',
    ]);
    expect(ledgerReleaseArgumentProblems('0.9.0-dev.1', metadata)).toEqual([
      'release argument must be a strict final core SemVer (X.Y.Z)',
    ]);
    expect(ledgerReleaseArgumentProblems('0.9.0+rebuilt', metadata)).toEqual([
      'release argument must be a strict final core SemVer (X.Y.Z)',
    ]);
    expect(ledgerReleaseArgumentProblems('0.10.0', metadata)).toEqual([
      'release argument 0.10.0 does not equal ledger currentRelease 0.9.0',
    ]);
  });

  it('returns nonzero from the CLI path for malformed, development, and stale release arguments', () => {
    expect(runEvidenceLedgerCli(['--release', 'banana'])).not.toBe(0);
    expect(runEvidenceLedgerCli(['--release', '0.9.0-dev.1'])).not.toBe(0);
    expect(runEvidenceLedgerCli(['--release', '0.10.0'])).not.toBe(0);
    expect(runEvidenceLedgerCli(['--release', '0.9.0'])).toBe(0);
    expect(runEvidenceLedgerCli(['--release', '0.9.0', '--release', '0.9.0'])).toBe(2);
  });

  it('authorizes a simulated v1.0.0 tag only when every blocking gate is PASS', () => {
    const ledger = buildLedger({
      currentRelease: '1.0.0',
      statement: 'Cortexel 1.0.0 stable-release evidence.',
    });
    for (const gate of ledger.gates as LedgerGate[]) {
      gate.status = 'PASS';
      gate.evidence = { ...VALID_STABLE_EVIDENCE };
    }
    const { errors, gates } = validateLedger(ledger);
    expect(errors).toEqual([]);
    expect(unmetReleaseGates(gates)).toEqual([]);
  });
});
