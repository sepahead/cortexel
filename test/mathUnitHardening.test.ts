import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  binIndex,
  computeCorrelogram,
  countEligibleCorrelogramPairs,
  PairwiseBudgetExceededError,
  type Bins,
} from '../src/analysis/index.js';
import {
  MAX_MATERIALIZED_BINS,
  materializeCenteredLagBins,
  materializeWidthBins,
} from '../src/core/binning.js';
import { topologyScopeSupportsClaim } from '../src/core/semantics/topology.js';
import { eventsWithinWindow } from '../src/core/semantics/events.js';
import { unitCanonicalCode, unitDimensionMatch } from '../src/core/semantics/units.js';
import {
  axesAreCompatible,
  conversionFactor,
  conversionReceipt,
  convert,
  dimensionOf,
  isKnownUnit,
  isSimulatorDefined,
  reciprocalUnit,
  resolveAlias,
  unitLabel,
} from '../src/core/units.js';
import { UNIT_CODES, UNITS } from '../src/generated/registry.js';

describe('unit conversion hardening', () => {
  it('walks quantity and bare-unit claims at every accepted request depth', () => {
    let mismatched: unknown = { kind: 'time', unit: 'mV', values: [1] };
    let aliased: unknown = { unit: 'milliseconds' };
    for (let depth = 0; depth < 48; depth++) {
      mismatched = { nested: mismatched };
      aliased = { nested: aliased };
    }

    const mismatchErrors = unitDimensionMatch({
      request: { data: mismatched },
      skillId: 'test.deep_units',
    });
    const aliasErrors = unitCanonicalCode({
      request: { parameters: aliased },
      skillId: 'test.deep_units',
    });
    expect(mismatchErrors.map((error) => error.code)).toContain('SCIENCE_UNIT_DIMENSION_MISMATCH');
    expect(aliasErrors.map((error) => error.code)).toContain('SCIENCE_UNIT_ALIAS_NOT_CANONICAL');
  });

  it('obeys the complete registered-unit relation, including identity and simulator-defined refusal', () => {
    for (const from of UNIT_CODES) {
      expect(isKnownUnit(from)).toBe(true);
      expect(dimensionOf(from)).toBe(UNITS[from].dimension);

      for (const to of UNIT_CODES) {
        const sameDimension = UNITS[from].dimension === UNITS[to].dimension;
        const simulatorDefined =
          UNITS[from].dimension === 'simulator_defined' ||
          UNITS[to].dimension === 'simulator_defined';
        const convertible = sameDimension && !simulatorDefined;

        expect(axesAreCompatible(from, to), `${from} and ${to}`).toBe(convertible);

        if (convertible) {
          const expectedFactor = conversionFactor(from, to);
          expect(convert(1, from, to), `${from} -> ${to}`).toBe(expectedFactor);
          expect(conversionReceipt(from, to)).toMatchObject({
            from,
            to,
            factor: expectedFactor,
            algorithm: 'exact_rational_round_to_binary64',
          });
          if (from === to) {
            expect(convert(-0, from, to), `${from} identity preserves its input`).toBe(-0);
          }
        } else {
          expect(() => conversionFactor(from, to), `${from} -> ${to}`).toThrow();
          expect(() => convert(1, from, to), `${from} -> ${to}`).toThrow();
        }
      }
    }

    expect(isSimulatorDefined('nest:weight')).toBe(true);
    expect(() => convert(1, 'nest:weight', 'nest:weight')).toThrow(/simulator-defined/);
    expect(() => conversionFactor('nest:weight', 'nest:weight')).toThrow();
  });

  it('uses exact decimal scale ratios and rounds the converted value only once', () => {
    expect(conversionFactor('ms', 'us')).toBe(1000);
    expect(conversionFactor('A', 'nA')).toBe(1_000_000_000);
    expect(convert(161556.8363554151, 'ms', 's')).toBe(161.55683635541507);
    expect(convert(6.902111393129918e199, 'us', 's')).toBe(6.902111393129918e193);
    expect(conversionReceipt('ms', 's').exactFactor).toEqual({
      numerator: '1',
      denominator: '1000',
      binaryExponent: 0,
    });
    expect(161556.8363554151 * conversionFactor('ms', 's')).not.toBe(
      convert(161556.8363554151, 'ms', 's'),
    );
  });

  it('assigns cross-unit event-window membership from exact rational quantities', () => {
    const validate = (values: number[], start: number, stop: number) => eventsWithinWindow({
      request: {
        data: {
          window: { start, stop, unit: 's', boundary: '[start,stop)' },
          eventTimes: { values, unit: 'ms' },
        },
      },
      skillId: 'test.events',
    });
    expect(validate([0, 10, 20, 30], 0, 0.04)).toEqual([]);
    expect(validate([1000.0000000000001], 0, 1.0000000000000002)).toEqual([]);
    expect(validate([1000.0000000000001], 1.0000000000000002, 2)[0]?.code).toBe(
      'SCIENCE_EVENT_OUT_OF_WINDOW',
    );
  });

  it('rejects unknown and hostile runtime values without coercing them', () => {
    const traps = { count: 0 };
    const hostile = new Proxy(
      {},
      {
        get() {
          traps.count++;
          throw new Error('must not inspect hostile unit object');
        },
        getPrototypeOf() {
          traps.count++;
          throw new Error('must not inspect hostile unit object');
        },
        ownKeys() {
          traps.count++;
          throw new Error('must not inspect hostile unit object');
        },
      },
    );
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();

    for (const value of [undefined, null, 1, Symbol('unit'), hostile, revocable.proxy]) {
      expect(() => isKnownUnit(value as never)).not.toThrow();
      expect(isKnownUnit(value as never)).toBe(false);
      expect(() => dimensionOf(value as never)).not.toThrow();
      expect(dimensionOf(value as never)).toBeUndefined();
      expect(() => resolveAlias(value as never)).not.toThrow();
      expect(resolveAlias(value as never)).toBeUndefined();
      expect(() => unitLabel(value as never)).not.toThrow();
      expect(unitLabel(value as never)).toBe('');
      expect(() => reciprocalUnit(value as never)).not.toThrow();
      expect(reciprocalUnit(value as never)).toBeUndefined();
      expect(axesAreCompatible(value as never, 'ms')).toBe(false);
      expect(() => convert(1, value as never, 'ms')).toThrow(/registered unit codes/);
      expect(() => conversionFactor(value as never, 'ms')).toThrow(/registered unit codes/);
    }

    expect(traps.count).toBe(0);
    expect(() => convert(1, 'not:a:unit', 'not:a:unit')).toThrow(/unknown unit/);
    expect(() => conversionFactor('not:a:unit', 'not:a:unit')).toThrow(/no conversion factor/);
    expect(() => convert(1, 'ms', 'mV')).toThrow(/across dimensions/);
  });

  it('rejects non-finite inputs and binary64 overflow or underflow', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => convert(value, 'ms', 's')).toThrow(/finite value/);
    }

    expect(() => convert(Number.MIN_VALUE, 'pA', 'A')).toThrow(/underflowed/);
    expect(() => convert(Number.MAX_VALUE, '/pA', '/A')).toThrow(/overflowed/);
    expect(convert(0, 'pA', 'A')).toBe(0);
  });
});

describe('bounded binary64 bin materialization', () => {
  it('materializes exact half-open tilings and accepts ordinary decimal roundoff', () => {
    expect(materializeWidthBins(0, 1, 0.25)).toEqual({
      ok: true,
      edges: [0, 0.25, 0.5, 0.75, 1],
    });
    expect(materializeWidthBins(0, 0.3, 0.1)).toEqual({
      ok: true,
      edges: [0, 0.1, 0.2, 0.3],
    });

    const materialized = materializeWidthBins(0, 1, 0.25);
    expect(materialized.ok).toBe(true);
    if (!materialized.ok) throw new Error('expected exact quarter-width bins');
    const bins: Bins = { edges: materialized.edges, finalEdgeInclusive: true };
    expect(binIndex(0, bins)).toBe(0);
    expect(binIndex(0.25, bins)).toBe(1);
    expect(binIndex(1, bins)).toBe(3);
  });

  it('refuses remainders, collapsed adjacent edges, excess bins, and hostile types', () => {
    expect(materializeWidthBins(0, 10, 6)).toEqual({ ok: false, reason: 'non_tiling' });

    const largeOrigin = 2 ** 53;
    expect(materializeWidthBins(largeOrigin, largeOrigin + 4, 1)).toEqual({
      ok: false,
      reason: 'unrepresentable',
    });

    expect(materializeWidthBins(0, MAX_MATERIALIZED_BINS, 1)).toMatchObject({ ok: true });
    expect(materializeWidthBins(0, MAX_MATERIALIZED_BINS + 1, 1)).toEqual({
      ok: false,
      reason: 'too_many',
    });

    const hostile = new Proxy({}, { get: () => { throw new Error('must not coerce'); } });
    for (const value of [undefined, null, '1', hostile, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => materializeWidthBins(value as never, 1, 0.5)).not.toThrow();
      expect(materializeWidthBins(value as never, 1, 0.5)).toEqual({
        ok: false,
        reason: 'nonfinite',
      });
    }
  });

  it('materializes symmetric centred lags with half-width outer edges and enforces its cap', () => {
    expect(materializeCenteredLagBins(-3, 3, 1, 7)).toEqual({
      ok: true,
      edges: [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5],
    });
    expect(materializeCenteredLagBins(-3, 3, 1, 6)).toEqual({
      ok: false,
      reason: 'too_many',
    });
    expect(materializeCenteredLagBins(-3, 4, 1, 20)).toEqual({
      ok: false,
      reason: 'non_tiling',
    });
    expect(materializeCenteredLagBins(-3, 3, 2, 20)).toEqual({
      ok: false,
      reason: 'non_tiling',
    });
    expect(materializeCenteredLagBins(-1, 1, 1, 3.5)).toEqual({
      ok: false,
      reason: 'nonfinite',
    });
  });

  it('preserves tiling and half-open ownership for randomized integer grids', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10_000, max: 10_000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 500 }),
        (start, width, count) => {
          const stop = start + width * count;
          const result = materializeWidthBins(start, stop, width);
          expect(result.ok).toBe(true);
          if (!result.ok) return;

          expect(result.edges).toHaveLength(count + 1);
          expect(result.edges[0]).toBe(start);
          expect(result.edges[count]).toBe(stop);
          for (let index = 0; index < count; index++) {
            expect(result.edges[index + 1] - result.edges[index]).toBe(width);
          }

          const bins: Bins = { edges: result.edges, finalEdgeInclusive: true };
          for (let index = 0; index < count; index++) {
            expect(binIndex(result.edges[index], bins)).toBe(index);
          }
          expect(binIndex(stop, bins)).toBe(count - 1);
        },
      ),
      { numRuns: 500 },
    );
  });
});

interface BruteCorrelogram {
  readonly counts: number[];
  readonly totalPairs: number;
  readonly zeroLagRetainedDistinctPairs: number;
}

function bruteCorrelogram(
  referenceTimes: readonly number[],
  targetTimes: readonly number[],
  bins: Bins,
  kind: 'auto' | 'cross',
): BruteCorrelogram {
  const reference = [...referenceTimes].sort((a, b) => a - b);
  const target = kind === 'auto' ? reference : [...targetTimes].sort((a, b) => a - b);
  const counts = new Array<number>(bins.edges.length - 1).fill(0);
  let totalPairs = 0;
  let zeroLagRetainedDistinctPairs = 0;

  for (let i = 0; i < reference.length; i++) {
    for (let j = 0; j < target.length; j++) {
      if (kind === 'auto' && i === j) continue;
      const lag = target[j] - reference[i];
      const index = binIndex(lag, bins);
      if (index < 0) continue;
      counts[index]++;
      totalPairs++;
      if (lag === 0) zeroLagRetainedDistinctPairs++;
    }
  }

  return { counts, totalPairs, zeroLagRetainedDistinctPairs };
}

describe('bounded optimized correlogram', () => {
  const comparisonBins: Bins = {
    edges: [-4, -2, -0.5, 0, 0.5, 2, 4],
    finalEdgeInclusive: true,
  };

  it('agrees exactly with a quadratic oracle on randomized bounded trains', () => {
    const train = fc.array(fc.integer({ min: -16, max: 16 }).map((value) => value / 2), {
      maxLength: 24,
    });

    fc.assert(
      fc.property(train, train, fc.constantFrom<'auto' | 'cross'>('auto', 'cross'), (ref, tgt, kind) => {
        const expected = bruteCorrelogram(ref, tgt, comparisonBins, kind);
        const actual = computeCorrelogram(ref, tgt, comparisonBins, kind, 10_000);

        expect(actual.counts).toEqual(expected.counts);
        expect(actual.totalPairs).toBe(expected.totalPairs);
        expect(actual.zeroLagRetainedDistinctPairs).toBe(expected.zeroLagRetainedDistinctPairs);
        expect(countEligibleCorrelogramPairs(ref, tgt, comparisonBins, kind, 10_000)).toBe(
          expected.totalPairs,
        );
      }),
      { numRuns: 1_000 },
    );
  });

  it('uses the documented internal and final-edge boundary convention exactly', () => {
    const inclusive: Bins = { edges: [-2, -1, 0, 1, 2], finalEdgeInclusive: true };
    const exclusive: Bins = { ...inclusive, finalEdgeInclusive: false };
    const target = [-2, -1, 0, 1, 2];

    expect(computeCorrelogram([0], target, inclusive, 'cross').counts).toEqual([1, 1, 1, 2]);
    expect(computeCorrelogram([0], target, exclusive, 'cross').counts).toEqual([1, 1, 1, 1]);
    expect(countEligibleCorrelogramPairs([0], target, inclusive, 'cross')).toBe(5);
    expect(countEligibleCorrelogramPairs([0], target, exclusive, 'cross')).toBe(4);
  });

  it('rejects invalid pair budgets and fails before filling an over-budget result', () => {
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => countEligibleCorrelogramPairs([0], [0], comparisonBins, 'cross', invalid)).toThrow(
        RangeError,
      );
      expect(() => computeCorrelogram([0], [0], comparisonBins, 'cross', invalid)).toThrow(
        RangeError,
      );
    }

    const threeCoincidentEvents = [0, 0, 0];
    expect(() =>
      computeCorrelogram(
        threeCoincidentEvents,
        threeCoincidentEvents,
        { edges: [-1, 1], finalEdgeInclusive: true },
        'cross',
        3,
      ),
    ).toThrow(PairwiseBudgetExceededError);

    try {
      computeCorrelogram(
        threeCoincidentEvents,
        threeCoincidentEvents,
        { edges: [-1, 1], finalEdgeInclusive: true },
        'cross',
        3,
      );
      throw new Error('expected the pairwise budget to be exceeded');
    } catch (error) {
      expect(error).toBeInstanceOf(PairwiseBudgetExceededError);
      expect(error).toMatchObject({ limit: 3, observedLowerBound: 4 });
    }

    expect(
      countEligibleCorrelogramPairs(
        threeCoincidentEvents,
        threeCoincidentEvents,
        { edges: [-1, 1], finalEdgeInclusive: true },
        'cross',
        3,
      ),
    ).toBe(4);
  });
});

describe('topology rank-merge diagnostics remain bounded by supplied ranks', () => {
  it('reports a near-cap world without materializing the missing rank universe', () => {
    const errors = topologyScopeSupportsClaim({
      request: {
        data: {
          scope: {
            kind: 'global_merged',
            worldSize: 1_000_000,
            mergedRanks: [0, 999_999],
          },
        },
        parameters: {},
      },
      skillId: 'network.connection_graph',
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('SCOPE_MERGE_INCOMPLETE');
    expect(errors[0].message).toContain('999998 ranks are missing');
    expect(errors[0].message).toContain('first: 1, 2, 3, 4, 5, 6, 7, 8, ...');
    expect(errors[0].message.length).toBeLessThan(500);
  });

  it('separately diagnoses duplicates, missing ranks, and ranks outside the world', () => {
    const errors = topologyScopeSupportsClaim({
      request: {
        data: {
          scope: {
            kind: 'global_merged',
            worldSize: 4,
            mergedRanks: [0, 0, 5, -1],
          },
        },
        parameters: {},
      },
      skillId: 'network.connection_graph',
    });

    expect(errors.map((error) => error.code)).toEqual([
      'SCOPE_MERGE_INCOMPLETE',
      'SCOPE_MERGE_CONFLICT',
      'SCOPE_MERGE_CONFLICT',
    ]);
    expect(errors[0].message).toContain('3 ranks are missing (first: 1, 2, 3)');
    expect(errors[1].message).toContain('appears more than once');
    expect(errors[2].message).toContain('2 merged ranks are outside the valid range 0..3');
  });

  it('rejects a target-local rank equal to its world size', () => {
    const errors = topologyScopeSupportsClaim({
      request: {
        data: {
          scope: {
            kind: 'mpi_target_rank_local',
            rank: 4,
            worldSize: 4,
            localTargetUniverseComplete: true,
          },
        },
        parameters: {},
      },
      skillId: 'network.connection_graph',
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'SCOPE_MERGE_CONFLICT',
      instancePath: '/data/scope/rank',
    });
    expect(errors[0].message).toBe('rank 4 is not valid in a world of size 4.');
  });
});
