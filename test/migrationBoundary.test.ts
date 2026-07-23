import { describe, expect, it } from 'vitest';

import { migrateLegacyRequest } from '../src/core/migrate-v0.js';

describe('public legacy-migration materialized boundary', () => {
  it('rejects an accessor-backed skill id without invoking caller code', () => {
    let getterCalls = 0;
    const input = Object.defineProperty({}, 'skillId', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'nest.voltage_trace';
      },
    });

    const result = migrateLegacyRequest(input);
    expect(result.report.errors.map((error) => error.code)).toContain(
      'SNAPSHOT_ACCESSOR_PROPERTY',
    );
    expect(getterCalls).toBe(0);
  });

  it('is total for revoked and throwing proxies', () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const throwing = new Proxy({}, {
      ownKeys() {
        throw new Error('hostile reflection');
      },
    });

    for (const input of [revoked.proxy, throwing]) {
      expect(() => migrateLegacyRequest(input)).not.toThrow();
      expect(migrateLegacyRequest(input).report.errors.map((error) => error.code)).toContain(
        'SNAPSHOT_HOSTILE_REFLECTION',
      );
    }
  });

  it('does not invoke toJSON and does not silently ignore non-JSON legacy state', () => {
    let calls = 0;
    const input = {
      skillId: 'nest.voltage_trace',
      toJSON() {
        calls += 1;
        return { skillId: 'nest.spike_raster' };
      },
    };

    const result = migrateLegacyRequest(input);
    expect(result.report.errors.map((error) => error.code)).toContain(
      'SNAPSHOT_UNSUPPORTED_TYPE',
    );
    expect(calls).toBe(0);
  });

  it('preserves the deterministic report for plain legacy JSON data', () => {
    const result = migrateLegacyRequest({ skillId: 'nest.voltage_trace' });
    expect(result.report.legacyId).toBe('nest.voltage_trace');
    expect(result.report.targetId).toBe('neuro.analog_trace');
    expect(result.report.outcome).toBe('migrate');
  });

  it('migrates the misleading legacy connectivity name as edge-list topology, never a matrix', () => {
    const result = migrateLegacyRequest({
      skillId: 'nest.connectivity_matrix',
      params: {
        sources: [1],
        targets: [2],
        delays: [1],
        delay_units: 'ms',
      },
    });

    expect(result.request).toMatchObject({
      skill: { id: 'network.connection_graph' },
    });
    expect(result.report).toMatchObject({
      legacyId: 'nest.connectivity_matrix',
      outcome: 'migrate',
      targetId: 'network.connection_graph',
      unresolved: [
        'a complete node universe including isolates',
        'stable node and edge identities',
        'a network scope with snapshot time',
        'explicit multapse and autapse policies',
      ],
    });
    expect(result.report.errors.map((error) => error.code)).toEqual([
      'MIGRATION_INFORMATION_MISSING',
    ]);
    expect(result.report.errors.map((error) => error.code)).not.toContain(
      'MIGRATION_AMBIGUOUS_CONNECTIVITY_MATRIX',
    );
  });
});
