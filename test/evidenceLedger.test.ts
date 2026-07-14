import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  EXPECTED_GATE_COUNT,
  LEDGER_PATH,
  assertsStableContract,
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
    ledgerVersion: 1,
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

describe('evidence ledger — the committed ledger', () => {
  it('is structurally valid', () => {
    const parsed: unknown = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
    const { errors, gates } = validateLedger(parsed);
    expect(errors).toEqual([]);
    expect(gates).toHaveLength(EXPECTED_GATE_COUNT);
  });

  it('never records a PASS without a reproducible receipt', () => {
    const parsed: unknown = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
    const { gates } = validateLedger(parsed);
    for (const gate of gates.filter((entry) => entry.status === 'PASS')) {
      expect(gate.evidence?.receipt, `${gate.id} receipt`).toBeTruthy();
      expect(gate.evidence?.sourceCommit, `${gate.id} sourceCommit`).toBeTruthy();
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
    expect(errors).toContain('R001: PASS requires an ISO-8601 evidence.reviewedAt');
  });

  it('rejects a PASS whose source commit is not a SHA', () => {
    const ledger = buildLedger();
    const gate = (ledger.gates as LedgerGate[])[0];
    gate.status = 'PASS';
    gate.evidence = { ...VALID_EVIDENCE, sourceCommit: 'HEAD' };
    const { errors } = validateLedger(ledger);
    expect(errors).toContain('R001: PASS requires evidence.sourceCommit');
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

  it('rejects a truncated baseline commit', () => {
    const { errors } = validateLedger(buildLedger({ baselineCommit: '16f2da7' }));
    expect(errors).toContain('baselineCommit must be a full 40-character commit SHA');
  });

  it('rejects a non-object root', () => {
    expect(validateLedger(null).errors).toEqual(['ledger root must be an object']);
    expect(validateLedger([]).errors).toEqual(['ledger root must be an object']);
  });
});

describe('evidence ledger — the stable-tag gate', () => {
  it('treats only 1.x+ final versions as asserting the stable contract', () => {
    expect(assertsStableContract('1.0.0')).toBe(true);
    expect(assertsStableContract('2.3.4')).toBe(true);
    expect(assertsStableContract('0.9.0')).toBe(false);
    expect(assertsStableContract('0.5.0')).toBe(false);
    expect(assertsStableContract('1.0.0-rc.1')).toBe(false);
  });

  it('blocks a simulated v1.0.0 tag while any release-blocking gate is unproven', () => {
    const { gates } = validateLedger(buildLedger());
    const unmet = unmetReleaseGates(gates);
    expect(unmet).toHaveLength(EXPECTED_GATE_COUNT);
  });

  it('authorizes a simulated v1.0.0 tag only when every blocking gate is PASS', () => {
    const ledger = buildLedger();
    for (const gate of ledger.gates as LedgerGate[]) {
      gate.status = 'PASS';
      gate.evidence = { ...VALID_EVIDENCE };
    }
    const { errors, gates } = validateLedger(ledger);
    expect(errors).toEqual([]);
    expect(unmetReleaseGates(gates)).toEqual([]);
  });
});
