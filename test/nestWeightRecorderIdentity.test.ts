import fc from 'fast-check';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

import {
  splitWeightRecorderByRecordedTuple,
  splitWeightRecorderBySynapse,
  weightRecorderToSceneData,
} from '../core/nest/adapters';
import { getExamplePayload } from '../core/skills/examples';
import { validateSkillInvocation } from '../core/skills/validateSkillInvocation';
import { detectEmptyScene } from '../core/skills/verify';

const completeCapture = {
  times: [2, 1, 2],
  weights: [0.1, Number.MAX_VALUE, 0.3],
  senders: [7, 7, 7],
  targets: [9, 9, 9],
  ports: [3, 4, 3],
  receptors: [1, 1, 1],
};

describe('weight-recorder structural tuple boundary', () => {
  it('separates changes in each recorded field and preserves first-seen order', () => {
    const result = splitWeightRecorderByRecordedTuple({
      times: [0, 0, 0, 0, 0, 1],
      weights: [1, 2, 3, 4, 5, 6],
      senders: [10, 11, 10, 10, 10, 10],
      targets: [20, 20, 21, 20, 20, 20],
      ports: [4, 4, 4, 5, 4, 4],
      receptors: [1, 1, 1, 1, 2, 1],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.groups.map((group) => group.weightRecorderTuple)).toEqual([
      { kind: 'recorded_tuple_only', sender: 10, target: 20, port: 4, receptor: 1 },
      { kind: 'recorded_tuple_only', sender: 11, target: 20, port: 4, receptor: 1 },
      { kind: 'recorded_tuple_only', sender: 10, target: 21, port: 4, receptor: 1 },
      { kind: 'recorded_tuple_only', sender: 10, target: 20, port: 5, receptor: 1 },
      { kind: 'recorded_tuple_only', sender: 10, target: 20, port: 4, receptor: 2 },
    ]);
    expect(result.groups.map((group) => group.sourceOrdinals)).toEqual([
      [0, 5],
      [1],
      [2],
      [3],
      [4],
    ]);
  });

  it('preserves capture order, duplicate/nonchronological times, and binary64 values', () => {
    const result = splitWeightRecorderByRecordedTuple(completeCapture);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toEqual({
      weightRecorderTuple: {
        kind: 'recorded_tuple_only',
        sender: 7,
        target: 9,
        port: 3,
        receptor: 1,
      },
      sourceOrdinals: [0, 2],
      times: [2, 2],
      weights: [0.1, 0.3],
    });
    expect(result.groups[0].weights[0]).toBe(0.1);
    expect(result.groups[1].times).toEqual([1]);
    expect(result.groups[1].weights).toEqual([Number.MAX_VALUE]);
    expect(result.groups[1].weights).not.toBeInstanceOf(Float32Array);
  });

  it('accepts an exact empty capture without claiming source completeness', () => {
    const result = splitWeightRecorderByRecordedTuple({
      times: [],
      weights: [],
      senders: [],
      targets: [],
      ports: [],
      receptors: [],
    });
    expect(result).toEqual({ ok: true, groups: [] });
    expect(result.ok && Object.isFrozen(result.groups)).toBe(true);
    expect(splitWeightRecorderByRecordedTuple({
      times: new Float64Array(0),
      weights: new Float64Array(0),
      senders: new Uint32Array(0),
      targets: new Uint32Array(0),
      ports: new Uint32Array(0),
      receptors: new Uint32Array(0),
    })).toEqual({ ok: true, groups: [] });
  });

  it('returns a detached deeply frozen snapshot rather than aliases into the input', () => {
    const input = structuredClone(completeCapture);
    const result = splitWeightRecorderByRecordedTuple(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    input.times[0] = 99;
    input.weights[0] = 99;
    input.senders[0] = 99;
    input.targets[0] = 99;
    input.ports[0] = 99;
    input.receptors[0] = 99;

    expect(result.groups[0].times[0]).toBe(2);
    expect(result.groups[0].weights[0]).toBe(0.1);
    expect(result.groups[0].weightRecorderTuple).toEqual({
      kind: 'recorded_tuple_only', sender: 7, target: 9, port: 3, receptor: 1,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.groups)).toBe(true);
    for (const group of result.groups) {
      expect(Object.isFrozen(group)).toBe(true);
      expect(Object.isFrozen(group.weightRecorderTuple)).toBe(true);
      expect(Object.isFrozen(group.sourceOrdinals)).toBe(true);
      expect(Object.isFrozen(group.times)).toBe(true);
      expect(Object.isFrozen(group.weights)).toBe(true);
    }
  });

  it('requires every exact raw channel and rejects every length mismatch', () => {
    for (const field of [
      'times',
      'weights',
      'senders',
      'targets',
      'ports',
      'receptors',
    ]) {
      const missing: Record<string, unknown> = { ...completeCapture };
      delete missing[field];
      expect(splitWeightRecorderByRecordedTuple(missing).ok, `missing ${field}`).toBe(false);

      const mismatched: Record<string, unknown> = { ...completeCapture, [field]: [0] };
      expect(
        splitWeightRecorderByRecordedTuple(mismatched).ok,
        `mismatched ${field}`,
      ).toBe(false);
    }
  });

  it('rejects anonymous, pair-only, singular-pair, and extra identity-like forms', () => {
    const rejected = [
      { times: [0], weights: [1] },
      { times: [0], weights: [1], senders: [1], targets: [2] },
      { times: [0], weights: [1], sender: 1, target: 2 },
      { ...completeCapture, synapse_models: ['a', 'b', 'a'] },
    ];
    for (const value of rejected) {
      expect(splitWeightRecorderByRecordedTuple(value).ok).toBe(false);
    }
  });

  it('rejects every non-safe-integer tuple representation', () => {
    for (const field of ['senders', 'targets', 'ports', 'receptors']) {
      for (const invalid of [
        -0,
        -1,
        0.5,
        Number.MAX_SAFE_INTEGER + 1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        '1',
      ]) {
        expect(splitWeightRecorderByRecordedTuple({
          times: [0],
          weights: [1],
          senders: [1],
          targets: [2],
          ports: [3],
          receptors: [4],
          [field]: [invalid],
        }).ok, `${field}: ${String(invalid)}`).toBe(false);
      }
    }
    const portDiagnostic = splitWeightRecorderByRecordedTuple({
      times: [0], weights: [1], senders: [1], targets: [2],
      ports: [-1], receptors: [3],
    });
    expect(portDiagnostic.ok).toBe(false);
    if (!portDiagnostic.ok) {
      expect(portDiagnostic.errors.join(' ')).toContain('ports.0');
      expect(portDiagnostic.errors.join(' ')).toContain(
        'identifier values must be non-negative safe integers',
      );
    }
  });

  it('rejects time-in-steps offsets instead of silently projecting them away', () => {
    expect(splitWeightRecorderByRecordedTuple({
      ...completeCapture,
      offsets: [0, 0, 0],
    }).ok).toBe(false);
  });

  it('rejects nonfinite samples and accepts the safe-integer tuple boundary', () => {
    for (const field of ['times', 'weights']) {
      for (const invalid of [
        Number.NaN,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
      ]) {
        expect(splitWeightRecorderByRecordedTuple({
          times: [0],
          weights: [1],
          senders: [1],
          targets: [2],
          ports: [3],
          receptors: [4],
          [field]: [invalid],
        }).ok, `${field}: ${String(invalid)}`).toBe(false);
      }
    }
    expect(splitWeightRecorderByRecordedTuple({
      times: [Number.MAX_VALUE],
      weights: [-Number.MAX_VALUE],
      senders: [Number.MAX_SAFE_INTEGER],
      targets: [Number.MAX_SAFE_INTEGER],
      ports: [Number.MAX_SAFE_INTEGER],
      receptors: [Number.MAX_SAFE_INTEGER],
    }).ok).toBe(true);
  });

  it('does not invoke new-field accessors or throw on hostile proxies', () => {
    let reads = 0;
    const rootAccessor = { ...completeCapture };
    Object.defineProperty(rootAccessor, 'ports', {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return [3, 4, 3];
      },
    });
    expect(splitWeightRecorderByRecordedTuple(rootAccessor).ok).toBe(false);
    expect(reads).toBe(0);

    const receptors = [1, 1, 1];
    Object.defineProperty(receptors, '1', {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    expect(splitWeightRecorderByRecordedTuple({
      ...completeCapture,
      receptors,
    }).ok).toBe(false);
    expect(reads).toBe(0);

    const hostile = new Proxy({}, {
      getPrototypeOf() {
        throw new Error('hostile prototype');
      },
      ownKeys() {
        throw new Error('hostile keys');
      },
    });
    expect(() => splitWeightRecorderByRecordedTuple(hostile)).not.toThrow();
    expect(splitWeightRecorderByRecordedTuple(hostile).ok).toBe(false);
  });

  it('rejects concurrently mutable SharedArrayBuffer-backed typed arrays', () => {
    if (typeof SharedArrayBuffer !== 'function') return;
    const sharedTimes = new Float64Array(new SharedArrayBuffer(8));
    sharedTimes[0] = 1;
    const result = splitWeightRecorderByRecordedTuple({
      times: sharedTimes,
      weights: [1],
      senders: [1],
      targets: [2],
      ports: [3],
      receptors: [4],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('SharedArrayBuffer');
  });

  it('rejects detached typed arrays instead of reclassifying them as empty captures', () => {
    function detached<T extends Float64Array | Uint32Array>(view: T): T {
      structuredClone(view.buffer, { transfer: [view.buffer] });
      return view;
    }
    const result = splitWeightRecorderByRecordedTuple({
      times: detached(new Float64Array([1])),
      weights: detached(new Float64Array([1])),
      senders: detached(new Uint32Array([1])),
      targets: detached(new Uint32Array([2])),
      ports: detached(new Uint32Array([3])),
      receptors: detached(new Uint32Array([4])),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('backing storage');
  });

  it('checks backing-store liveness without invoking ArrayBuffer species accessors', () => {
    let reads = 0;
    class HostileArrayBuffer extends ArrayBuffer {}
    const buffer = new HostileArrayBuffer(8);
    Object.defineProperty(buffer, 'constructor', {
      configurable: true,
      get() {
        reads += 1;
        throw new Error('constructor/species must not execute');
      },
    });
    const times = new Float64Array(buffer);
    times[0] = 1;
    expect(splitWeightRecorderByRecordedTuple({
      times,
      weights: [1],
      senders: [1],
      targets: [2],
      ports: [3],
      receptors: [4],
    }).ok).toBe(true);
    expect(reads).toBe(0);
  });

  it('accepts live ordinary typed arrays created in another JavaScript realm', () => {
    const foreignArrays = runInNewContext(`({
      times: new Float64Array([2, 1]),
      weights: new Float64Array([0.125, 0.25]),
      senders: new Uint32Array([7, 7]),
      targets: new Uint32Array([9, 9]),
      ports: new Uint32Array([3, 3]),
      receptors: new Uint32Array([1, 1]),
    })`) as Record<keyof typeof completeCapture, Float64Array | Uint32Array>;

    // The transport envelope remains an ordinary object in this realm; only
    // the explicitly supported numeric typed-array leaves cross the boundary.
    const result = splitWeightRecorderByRecordedTuple({
      times: foreignArrays.times,
      weights: foreignArrays.weights,
      senders: foreignArrays.senders,
      targets: foreignArrays.targets,
      ports: foreignArrays.ports,
      receptors: foreignArrays.receptors,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.groups).toEqual([{
      weightRecorderTuple: {
        kind: 'recorded_tuple_only',
        sender: 7,
        target: 9,
        port: 3,
        receptor: 1,
      },
      sourceOrdinals: [0, 1],
      times: [2, 1],
      weights: [0.125, 0.25],
    }]);
  });

  it('bounds distinct recorded-tuple fan-out before admitting another group', () => {
    const count = 4_097;
    const ports = Array.from({ length: count }, (_, index) => index);
    const result = splitWeightRecorderByRecordedTuple({
      times: new Array(count).fill(0),
      weights: new Array(count).fill(1),
      senders: new Array(count).fill(1),
      targets: new Array(count).fill(2),
      ports,
      receptors: new Array(count).fill(0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('4096');
  });

  it('matches a four-field reference partition over generated 2–32-row captures', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        sender: fc.integer({ min: 0, max: 3 }),
        target: fc.integer({ min: 0, max: 3 }),
        port: fc.integer({ min: 0, max: 4 }),
        receptor: fc.integer({ min: 0, max: 2 }),
      }), {
        minLength: 2,
        maxLength: 32,
      }),
      (tuples) => {
        const rows = tuples.map((tuple, index) => ({
          time: tuples.length - index,
          weight: index + 0.125,
          ...tuple,
        }));
        const result = splitWeightRecorderByRecordedTuple({
          times: rows.map((row) => row.time),
          weights: rows.map((row) => row.weight),
          senders: rows.map((row) => row.sender),
          targets: rows.map((row) => row.target),
          ports: rows.map((row) => row.port),
          receptors: rows.map((row) => row.receptor),
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const expected: Array<{
          tuple: (typeof tuples)[number];
          ordinals: number[];
        }> = [];
        for (let ordinal = 0; ordinal < rows.length; ordinal++) {
          const row = rows[ordinal];
          let group = expected.find(({ tuple }) =>
            tuple.sender === row.sender &&
            tuple.target === row.target &&
            tuple.port === row.port &&
            tuple.receptor === row.receptor
          );
          if (!group) {
            group = { tuple: row, ordinals: [] };
            expected.push(group);
          }
          group.ordinals.push(ordinal);
        }
        expect(result.groups).toHaveLength(expected.length);
        expect(result.groups.map((group) => group.weightRecorderTuple)).toEqual(
          expected.map(({ tuple }) => ({
            kind: 'recorded_tuple_only',
            sender: tuple.sender,
            target: tuple.target,
            port: tuple.port,
            receptor: tuple.receptor,
          })),
        );
        expect(result.groups.map((group) => group.sourceOrdinals)).toEqual(
          expected.map(({ ordinals }) => ordinals),
        );
        for (const group of result.groups) {
          group.sourceOrdinals.forEach((ordinal, localIndex) => {
            const row = rows[ordinal];
            expect(group.weightRecorderTuple).toEqual({
              kind: 'recorded_tuple_only',
              sender: row.sender,
              target: row.target,
              port: row.port,
              receptor: row.receptor,
            });
            expect(group.times[localIndex]).toBe(row.time);
            expect(group.weights[localIndex]).toBe(row.weight);
          });
        }
      },
    ), { numRuns: 200 });
  });

  it('does not turn equal tuples into connection identity when models differ out of band', () => {
    const callerModelClaims = ['stdp_synapse', 'custom_stdp_synapse'];
    const result = splitWeightRecorderByRecordedTuple({
      times: [0, 1],
      weights: [1, 2],
      senders: [4, 4],
      targets: [8, 8],
      ports: [2, 2],
      receptors: [1, 1],
    });
    expect(callerModelClaims).toHaveLength(2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.groups).toHaveLength(1);
    expect(Object.hasOwn(result.groups[0].weightRecorderTuple, 'synapseModel')).toBe(false);
  });

  it('keeps the misleading compatibility entrypoints permanently fail-closed', () => {
    let inspections = 0;
    const uninspectable = new Proxy({}, {
      ownKeys() {
        inspections += 1;
        throw new Error('must not inspect');
      },
    });
    const retiredSplit = splitWeightRecorderBySynapse(uninspectable);
    const retiredAdapter = weightRecorderToSceneData(uninspectable, uninspectable);
    expect(retiredSplit.ok).toBe(false);
    expect(retiredAdapter.ok).toBe(false);
    expect(retiredSplit.errors.join(' ')).toContain('retired');
    expect(retiredAdapter.errors.join(' ')).toContain('retired');
    expect(inspections).toBe(0);
  });

  it('rejects the removed pair-only weightSynapse SceneData metadata', () => {
    expect(detectEmptyScene({
      traceTimes: new Float64Array([0]),
      weightSeries: new Float32Array([1]),
      weightUnits: 'nS',
      timeUnits: 'ms',
      weightSynapse: { sender: 1, target: 2 },
    })).toMatchObject({ valid: false, empty: false });
  });

  it('binds legacy caller-authored traces to an unsuppressible limitation caption', () => {
    const example = structuredClone(getExamplePayload('nest.plasticity_dynamics')!);
    const result = validateSkillInvocation('nest.plasticity_dynamics', example);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.caption).toContain('Caller-attributed weight trace');
    expect(result.caption).toContain('connection identity');
    expect(result.caption).toContain('cross-row continuity');
    expect(result.caption).toContain('pre/post-update semantics');
  });
});
