/**
 * Hand-computable golden vectors for the analysis layer.
 *
 * Every expected value here is arithmetic you can check on paper. That is the point: an
 * external reference library (NEST, Elephant) can share a convention error with a second
 * library and both agree on a wrong answer. Arithmetic done by hand cannot. These
 * vectors are the floor of scientific evidence; the pinned-oracle differential tests
 * (honestly NOT_RUN until the reference environment is executed — see the evidence
 * ledger) sit on top of them, never in place of them.
 */

import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  binCounts,
  binIndex,
  edgesFromWidth,
  computeIsi,
  computePopulationRate,
  verifyRates,
  computeCorrelogram,
  computeDegrees,
  computeMatrix,
  makeEventTable,
  partitionByWindow,
  type Bins,
} from '../src/analysis/index.js';
import {
  rateDenominatorPositive,
  rateVerifyNormalization,
} from '../src/core/semantics/events.js';
import { exactBinary64DivideByIntegerProduct } from '../src/core/exact-binary64.js';
import {
  convertDifference,
  divideExactIntegerByConvertedDifference,
} from '../src/core/units.js';

interface EndpointRateOracleCase {
  readonly lower: number;
  readonly upper: number;
  readonly unit: 's' | 'ms' | 'us';
  readonly count: number;
  readonly factor: number;
}

type EndpointRateOracleResult =
  | { readonly status: 'value'; readonly value: number }
  | { readonly status: 'overflow' | 'underflow' };

function pythonFractionEndpointRates(
  cases: readonly EndpointRateOracleCase[],
): EndpointRateOracleResult[] | undefined {
  const script = `
import json, math, sys
from fractions import Fraction

scales = {
    "s": Fraction(1, 1),
    "ms": Fraction(1, 1000),
    "us": Fraction(1, 1000000),
}
out = []
for case in json.load(sys.stdin):
    width = (
        Fraction.from_float(float(case["upper"])) -
        Fraction.from_float(float(case["lower"]))
    ) * scales[case["unit"]]
    quotient = Fraction(case["count"], case["factor"]) / width
    try:
        value = float(quotient)
    except OverflowError:
        out.append({"status": "overflow"})
        continue
    if math.isinf(value):
        out.append({"status": "overflow"})
    elif value == 0.0 and quotient != 0:
        out.append({"status": "underflow"})
    else:
        out.append({"status": "value", "value": value})
print(json.dumps(out, allow_nan=False))
`;
  const result = spawnSync('python3', ['-c', script], {
    encoding: 'utf8',
    input: JSON.stringify(cases),
  });
  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Python Fraction endpoint-rate oracle failed: ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as EndpointRateOracleResult[];
}

describe('bins — the half-open convention', () => {
  const bins: Bins = { edges: [0, 5, 10], finalEdgeInclusive: true };

  it('places a value at the lower edge in that bin', () => {
    expect(binIndex(0, bins)).toBe(0);
    expect(binIndex(5, bins)).toBe(1); // exactly at an internal edge -> the higher bin
  });

  it('places a value just below an edge in the lower bin', () => {
    expect(binIndex(4.999, bins)).toBe(0);
  });

  it('includes the final upper edge in the final bin, so the maximum is never dropped', () => {
    expect(binIndex(10, bins)).toBe(1);
  });

  it('excludes the final upper edge when finalEdgeInclusive is false', () => {
    expect(binIndex(10, { edges: [0, 5, 10], finalEdgeInclusive: false })).toBe(-1);
  });

  it('reports out-of-range values as -1 rather than clamping them', () => {
    expect(binIndex(-1, bins)).toBe(-1);
    expect(binIndex(10.001, bins)).toBe(-1);
    expect(binIndex(Number.NaN, bins)).toBe(-1);
    expect(binIndex(Number.POSITIVE_INFINITY, bins)).toBe(-1);
  });

  it('counts a hand example exactly and reports overflow honestly', () => {
    // events at 1,1.5,2.5,2.5,3.75 -> bin 0 (all < 5); 8 -> bin 1; 12 -> overflow.
    const result = binCounts([1, 1.5, 2.5, 2.5, 3.75, 8, 12], bins);
    expect(result.counts).toEqual([5, 1]);
    expect(result.overflow).toBe(1);
    expect(result.invalid).toBe(0);
  });

  it('agrees with a linear scan for random inputs (differential invariant)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -5, max: 15, noNaN: true }), { maxLength: 50 }),
        (values) => {
          const b: Bins = { edges: [0, 3, 6, 9, 12], finalEdgeInclusive: true };
          const fast = binCounts(values, b).counts;
          const slow = new Array(4).fill(0);
          for (const v of values) {
            if (!Number.isFinite(v)) continue;
            for (let i = 0; i < 4; i++) {
              const lo = b.edges[i];
              const hi = b.edges[i + 1];
              const inFinal = i === 3;
              if (v >= lo && (inFinal ? v <= hi : v < hi)) {
                slow[i]++;
                break;
              }
            }
          }
          return JSON.stringify(fast) === JSON.stringify(slow);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('population rate — the formula and its denominator', () => {
  it('computes the textbook millisecond formula: 5 spikes / (4 senders x 5 ms) = 250 Hz', () => {
    const bins = { edges: [0, 5, 10], finalEdgeInclusive: true } as Bins;
    const result = computePopulationRate([1, 1.5, 2.5, 2.5, 3.75, 8], bins, 'ms', 4, 'mean_rate_per_recorded_sender');
    expect(result.count).toEqual([5, 1]);
    // 5 * 1000 / (4 * 5) = 250 ; 1 * 1000 / (4 * 5) = 50
    expect(result.rateHz[0]).toBeCloseTo(250, 9);
    expect(result.rateHz[1]).toBeCloseTo(50, 9);
  });

  it('gives a higher total-event rate when the per-neuron denominator is dropped', () => {
    const bins = { edges: [0, 5], finalEdgeInclusive: true } as Bins;
    const perNeuron = computePopulationRate([1, 2, 3, 4], bins, 'ms', 4, 'mean_rate_per_recorded_sender');
    const total = computePopulationRate([1, 2, 3, 4], bins, 'ms', 4, 'total_event_rate');
    // total = 4 / 0.005 = 800 ; perNeuron = 4 / (4 * 0.005) = 200
    expect(total.rateHz[0]).toBeCloseTo(800, 9);
    expect(perNeuron.rateHz[0]).toBeCloseTo(200, 9);
  });

  it('is unit-correct in microseconds without a hard-coded factor', () => {
    const bins = { edges: [0, 5000], finalEdgeInclusive: true } as Bins; // 5000 us = 5 ms
    const result = computePopulationRate([1, 2, 3, 4, 5], bins, 'us', 5, 'mean_rate_per_recorded_sender');
    // 5 / (5 * 0.005 s) = 200 Hz
    expect(result.rateHz[0]).toBeCloseTo(200, 6);
  });

  it('rounds the exact endpoint-defined rate once instead of rounding the width first', () => {
    const roundedWidthSeconds = convertDifference(0, 0.3, 'ms', 's');
    const oldTwoRoundResult = exactBinary64DivideByIntegerProduct(
      3,
      10,
      roundedWidthSeconds,
    );
    const exactOneRoundResult = divideExactIntegerByConvertedDifference(
      3,
      10,
      0,
      0.3,
      'ms',
      's',
    );

    expect(roundedWidthSeconds).toBe(0.0003);
    expect(oldTwoRoundResult).toBe(1000.0000000000001);
    expect(exactOneRoundResult).toBe(1000);
    expect(
      divideExactIntegerByConvertedDifference(5, 7, 0, 1, 'ms', 's'),
    ).toBe(714.2857142857143);

    const result = computePopulationRate(
      [0.05, 0.1, 0.2],
      { edges: [0, 0.3], finalEdgeInclusive: true },
      'ms',
      10,
      'mean_rate_per_recorded_sender',
    );
    expect(result.count).toEqual([3]);
    expect(result.rateHz).toEqual([1000]);
  });

  it('matches a Python Fraction oracle from endpoints through the final rounding', () => {
    const cases: EndpointRateOracleCase[] = [
      { lower: 0, upper: 0.3, unit: 'ms', count: 3, factor: 10 },
      { lower: 0, upper: 1, unit: 'ms', count: 5, factor: 7 },
      {
        lower: -Number.MAX_VALUE,
        upper: Number.MAX_VALUE,
        unit: 's',
        count: 1,
        factor: 1,
      },
      { lower: 0, upper: Number.MIN_VALUE, unit: 's', count: 1, factor: 1 },
      {
        lower: -Number.MAX_VALUE,
        upper: Number.MAX_VALUE,
        unit: 's',
        count: 1,
        factor: Number.MAX_SAFE_INTEGER,
      },
      { lower: -1, upper: 1, unit: 'us', count: 0, factor: 1 },
    ];

    for (let i = 1; i <= 256; i++) {
      const magnitude = 2 ** ((i % 41) - 20);
      const lower = (((i * 7919) % 10001) - 5000) * magnitude;
      const width = (((i * 104729) % 1000) + 1) * 2 ** ((i % 37) - 25);
      const upper = lower + width;
      if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) continue;
      cases.push({
        lower,
        upper,
        unit: (['s', 'ms', 'us'] as const)[i % 3],
        count: (i * 97) % 1001,
        factor: ((i * 193) % 997) + 1,
      });
    }

    const expected = pythonFractionEndpointRates(cases);
    if (!expected) return;
    expect(expected).toHaveLength(cases.length);

    cases.forEach((entry, index) => {
      let actual: EndpointRateOracleResult;
      try {
        actual = {
          status: 'value',
          value: divideExactIntegerByConvertedDifference(
            entry.count,
            entry.factor,
            entry.lower,
            entry.upper,
            entry.unit,
            's',
          ),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('underflowed')) actual = { status: 'underflow' };
        else if (message.includes('overflowed')) actual = { status: 'overflow' };
        else throw error;
      }
      expect(actual, `Python Fraction endpoint-rate case ${index}`).toEqual(expected[index]);
    });
  });

  it('handles endpoint-rate extremes and refuses unsafe or unrepresentable inputs', () => {
    expect(
      divideExactIntegerByConvertedDifference(
        1,
        1,
        -Number.MAX_VALUE,
        Number.MAX_VALUE,
        's',
        's',
      ),
    ).toBe(2.781342323134e-309);
    expect(() =>
      divideExactIntegerByConvertedDifference(
        1,
        1,
        0,
        Number.MIN_VALUE,
        's',
        's',
      ),
    ).toThrow(/overflowed binary64/);
    expect(() =>
      divideExactIntegerByConvertedDifference(
        1,
        Number.MAX_SAFE_INTEGER,
        -Number.MAX_VALUE,
        Number.MAX_VALUE,
        's',
        's',
      ),
    ).toThrow(/underflowed binary64/);

    for (const count of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        divideExactIntegerByConvertedDifference(count, 1, 0, 1, 's', 's'),
      ).toThrow(/non-negative safe-integer numerator/);
    }
    for (const factor of [0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        divideExactIntegerByConvertedDifference(1, factor, 0, 1, 's', 's'),
      ).toThrow(/positive safe-integer factor/);
    }
    expect(() =>
      divideExactIntegerByConvertedDifference(1, 1, 1, 0, 's', 's'),
    ).toThrow(/strictly ordered endpoints/);
    expect(() =>
      divideExactIntegerByConvertedDifference(1, 1, 0, 1, 'ms', 'mV'),
    ).toThrow(/across dimensions/);
  });

  it('flags a supplied rate that does not follow from its count', () => {
    // 5 events / (4 * 0.005 s) = 250, not 999.
    const mismatches = verifyRates([5, 1], [999, 50], [0, 5, 10], 'ms', 4, 'mean_rate_per_recorded_sender');
    expect(mismatches).toEqual([0]);
  });

  it('accepts a correctly supplied rate within tolerance', () => {
    expect(verifyRates([5, 1], [250, 50], [0, 5, 10], 'ms', 4, 'mean_rate_per_recorded_sender')).toEqual([]);
    expect(
      verifyRates(
        [5],
        [250 * (1 + 0.5e-9)],
        [0, 5],
        'ms',
        4,
        'mean_rate_per_recorded_sender',
      ),
    ).toEqual([]);
    expect(
      verifyRates(
        [5],
        [250 * (1 + 2e-9)],
        [0, 5],
        'ms',
        4,
        'mean_rate_per_recorded_sender',
      ),
    ).toEqual([0]);
  });

  it('keeps a representable rate when sender-count times MAX_VALUE seconds would overflow', () => {
    const bins = {
      edges: [0, Number.MAX_VALUE],
      finalEdgeInclusive: true,
    } as Bins;
    const result = computePopulationRate(
      [0],
      bins,
      's',
      2,
      'mean_rate_per_recorded_sender',
    );

    // 1 / (2 * MAX_VALUE) is finite and non-zero even though the binary64 product
    // 2 * MAX_VALUE is Infinity.
    expect(result.rateHz).toEqual([2.781342323134e-309]);
    expect(
      verifyRates(
        [1],
        result.rateHz,
        bins.edges,
        's',
        2,
        'mean_rate_per_recorded_sender',
      ),
    ).toEqual([]);
    expect(
      verifyRates([1], [0], bins.edges, 's', 2, 'mean_rate_per_recorded_sender'),
    ).toEqual([0]);
    expect(
      verifyRates(
        [1],
        [-Number.MIN_VALUE],
        bins.edges,
        's',
        2,
        'mean_rate_per_recorded_sender',
      ),
    ).toEqual([0]);

    const invalidPositiveRates = [
      Number.MIN_VALUE,
      1e-320,
      1e-100,
      1e-13,
      1e-12,
    ];
    for (const suppliedRate of invalidPositiveRates) {
      expect(
        verifyRates(
          [1],
          [suppliedRate],
          bins.edges,
          's',
          2,
          'mean_rate_per_recorded_sender',
        ),
        `supplied ${suppliedRate} Hz`,
      ).toEqual([0]);
    }

    const adjacentSubnormal = result.rateHz[0] + Number.MIN_VALUE;
    expect(
      verifyRates(
        [1],
        [adjacentSubnormal],
        bins.edges,
        's',
        2,
        'mean_rate_per_recorded_sender',
      ),
    ).toEqual([]);

    const suppliedZero = rateVerifyNormalization({
      request: {
        data: {
          binEdges: { unit: 's', edges: bins.edges },
          counts: [1],
          recordedSenderCount: 2,
          rates: { unit: 'Hz', values: [0] },
        },
        parameters: { normalization: 'mean_rate_per_recorded_sender' },
      },
      skillId: 'neuro.population_rate',
    });
    expect(suppliedZero.map((error) => error.code)).toEqual([
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
    ]);

    for (const suppliedRate of invalidPositiveRates) {
      const errors = rateVerifyNormalization({
        request: {
          data: {
            binEdges: { unit: 's', edges: bins.edges },
            counts: [1],
            recordedSenderCount: 2,
            rates: { unit: 'Hz', values: [suppliedRate] },
          },
          parameters: { normalization: 'mean_rate_per_recorded_sender' },
        },
        skillId: 'neuro.population_rate',
      });
      expect(
        errors.map((error) => error.code),
        `supplied ${suppliedRate} Hz`,
      ).toEqual(['SCIENCE_NORMALIZATION_UNVERIFIABLE']);
    }

    expect(
      rateVerifyNormalization({
        request: {
          data: {
            binEdges: { unit: 's', edges: bins.edges },
            counts: [1],
            recordedSenderCount: 2,
            rates: { unit: 'Hz', values: [adjacentSubnormal] },
          },
          parameters: { normalization: 'mean_rate_per_recorded_sender' },
        },
        skillId: 'neuro.population_rate',
      }),
    ).toEqual([]);

    expect(
      verifyRates([0], [Number.MIN_VALUE], [0, 1], 's', 1, 'total_event_rate'),
    ).toEqual([0]);
    expect(
      rateVerifyNormalization({
        request: {
          data: {
            binEdges: { unit: 's', edges: [0, 1] },
            counts: [0],
            recordedSenderCount: 1,
            rates: { unit: 'Hz', values: [Number.MIN_VALUE] },
          },
          parameters: { normalization: 'total_event_rate' },
        },
        skillId: 'neuro.population_rate',
      }).map((error) => error.code),
    ).toEqual(['SCIENCE_NORMALIZATION_UNVERIFIABLE']);
  });

  it('fails closed when an exact endpoint separation cannot be represented', () => {
    const edges = [-Number.MAX_VALUE, Number.MAX_VALUE];
    expect(() =>
      computePopulationRate(
        [0],
        { edges, finalEdgeInclusive: true },
        's',
        1,
        'total_event_rate',
      ),
    ).toThrow(/difference overflowed binary64/);
    expect(
      verifyRates([1], [0], edges, 's', 1, 'total_event_rate'),
    ).toEqual([0]);

    const errors = rateVerifyNormalization({
      request: {
        data: {
          binEdges: { unit: 's', edges },
          counts: [1],
          recordedSenderCount: 1,
          rates: { unit: 'Hz', values: [0] },
        },
        parameters: { normalization: 'total_event_rate' },
      },
      skillId: 'neuro.population_rate',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe('SCIENCE_NORMALIZATION_UNVERIFIABLE');
  });

  it('verifies supplied firing rates in their declared unit, including kHz', () => {
    const correct = rateVerifyNormalization({
      request: {
        data: {
          binEdges: { unit: 'ms', edges: [0, 5, 10] },
          counts: [5, 1],
          recordedSenderCount: 4,
          rates: { unit: 'kHz', values: [0.25, 0.05] },
        },
        parameters: { normalization: 'mean_rate_per_recorded_sender' },
      },
      skillId: 'neuro.population_rate',
    });
    expect(correct).toEqual([]);

    const wrong = rateVerifyNormalization({
      request: {
        data: {
          binEdges: { unit: 'ms', edges: [0, 5] },
          counts: [5],
          recordedSenderCount: 4,
          rates: { unit: 'kHz', values: [250] },
        },
        parameters: { normalization: 'mean_rate_per_recorded_sender' },
      },
      skillId: 'neuro.population_rate',
    });
    expect(wrong.map((error) => error.code)).toEqual([
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
    ]);

    const incompatibleUnit = rateVerifyNormalization({
      request: {
        data: {
          binEdges: { unit: 'ms', edges: [0, 5] },
          counts: [5],
          recordedSenderCount: 4,
          rates: { unit: 'mV', values: [250] },
        },
        parameters: { normalization: 'mean_rate_per_recorded_sender' },
      },
      skillId: 'neuro.population_rate',
    });
    expect(incompatibleUnit.map((error) => error.code)).toEqual([
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
    ]);
  });

  it('refuses population and bin counts that are not safe exact JSON integers', () => {
    expect(() =>
      computePopulationRate(
        [0],
        { edges: [0, 1], finalEdgeInclusive: true },
        's',
        1e21,
        'mean_rate_per_recorded_sender',
      ),
    ).toThrow(/positive safe integer/);

    expect(
      rateDenominatorPositive({
        request: { data: { recordedSenderCount: 1e21 } },
        skillId: 'neuro.population_rate',
      }).map((error) => error.code),
    ).toEqual(['SCIENCE_DENOMINATOR_INVALID']);

    expect(
      rateVerifyNormalization({
        request: {
          data: {
            binEdges: { unit: 's', edges: [0, 1] },
            counts: [1e21],
            recordedSenderCount: 1,
            rates: { unit: 'Hz', values: [1e21] },
          },
          parameters: { normalization: 'total_event_rate' },
        },
        skillId: 'neuro.population_rate',
      }).map((error) => error.code),
    ).toEqual(['SCIENCE_COUNT_NOT_INTEGER']);
  });

  it('fails closed on invalid runtime denominator and normalization arguments', () => {
    expect(
      verifyRates([1], [1], [0, 1], 's', 0, 'total_event_rate'),
    ).toEqual([0]);
    expect(
      verifyRates(
        [1],
        [1],
        [0, 1],
        's',
        1,
        'not_registered' as never,
      ),
    ).toEqual([0]);
  });
});

describe('ISI — intervals only within a train', () => {
  it('forms intervals within each sender, never across senders', () => {
    // Sender A at 1, 3, 6 -> intervals 2, 3. Sender B at 2, 5 -> interval 3.
    // A cross-sender difference (e.g. 2-1) must NOT appear.
    const events = makeEventTable([1, 2, 3, 5, 6], ['A', 'B', 'A', 'B', 'A']);
    const result = computeIsi(events);
    expect(result.intervals.sort((a, b) => a - b)).toEqual([2, 3, 3]);
    expect(result.trainCount).toBe(2);
  });

  it('handles unsorted recorder output by sorting within the train', () => {
    // Same sender, recorded out of order: 6, 1, 3 -> sorted 1,3,6 -> intervals 2, 3.
    const events = makeEventTable([6, 1, 3], ['A', 'A', 'A']);
    const result = computeIsi(events);
    expect(result.intervals).toEqual([2, 3]);
  });

  it('separates trains by trial as well as sender', () => {
    // Sender A, trial 1 at 1,2 -> interval 1. Sender A, trial 2 at 5,9 -> interval 4.
    // No interval is formed across the trial boundary (2 -> 5 must not appear).
    const events = makeEventTable([1, 2, 5, 9], ['A', 'A', 'A', 'A'], ['t1', 't1', 't2', 't2']);
    const result = computeIsi(events);
    expect(result.intervals.sort((a, b) => a - b)).toEqual([1, 4]);
    expect(result.trainCount).toBe(2);
  });

  it('yields no interval from a single-event train', () => {
    const events = makeEventTable([1], ['A']);
    const result = computeIsi(events);
    expect(result.intervals).toEqual([]);
    expect(result.trainsWithoutInterval).toBe(1);
  });

  it('records a zero interval for coincident same-sender events rather than dropping it', () => {
    const events = makeEventTable([2, 2], ['A', 'A']);
    const result = computeIsi(events);
    expect(result.intervals).toEqual([0]);
    expect(result.zeroIntervals).toBe(1);
  });

  it('refuses an interval outside the finite binary64 range', () => {
    const events = makeEventTable(
      [-Number.MAX_VALUE, Number.MAX_VALUE],
      ['A', 'A'],
    );
    expect(() => computeIsi(events)).toThrow(/overflows/);
  });
});

describe('correlogram — orientation and self-pairs', () => {
  it('uses lag = target - reference (positive means target follows)', () => {
    // ref at 0; target at 2 -> lag +2. ref at 0; target at -1 -> lag -1.
    const bins = { edges: [-3, -1, 1, 3], finalEdgeInclusive: true } as Bins;
    const result = computeCorrelogram([0], [-1, 2], bins, 'cross');
    // Bins are half-open: [-3,-1), [-1,1), [1,3]. So lag -1 lands in [-1,1) (index 1),
    // NOT in [-3,-1) which excludes its upper edge. Lag +2 lands in [1,3] (index 2).
    expect(result.counts).toEqual([0, 1, 1]);
    expect(result.receipt.lagConvention).toBe('target_time - reference_time');
  });

  it('excludes identical-event self-pairs in an autocorrelogram but keeps distinct coincidences', () => {
    // Two distinct events at 0 and 1 in one train.
    // Auto pairs (excluding i===j): (0->1) lag +1, (1->0) lag -1. No zero-lag self-pair.
    const bins = { edges: [-2, 0, 2], finalEdgeInclusive: true } as Bins;
    const result = computeCorrelogram([0, 1], [0, 1], bins, 'auto');
    expect(result.selfPairsExcluded).toBe(2); // one per event
    // lag -1 in bin [-2,0) -> index 0 ; lag +1 in bin [0,2] -> index 1.
    expect(result.counts).toEqual([1, 1]);
  });

  it('retains a genuine zero-lag coincidence between two distinct events', () => {
    // Two DISTINCT events at the same time 0 in one autocorrelated train.
    const bins = { edges: [-1, 1], finalEdgeInclusive: true } as Bins;
    const result = computeCorrelogram([0, 0], [0, 0], bins, 'auto');
    // Distinct pairs (i!=j): (0,1) lag 0 and (1,0) lag 0 -> two retained zero-lag pairs.
    expect(result.zeroLagRetainedDistinctPairs).toBe(2);
    expect(result.counts[0]).toBe(2);
  });
});

describe('topology — degree and multapse handling', () => {
  it('counts in-degree over a declared universe, including a zero-degree isolate', () => {
    // Nodes A,B,C. Edges A->B, C->B. In-degree: A=0, B=2, C=0.
    const result = computeDegrees(['A', 'B', 'C'], ['A', 'C'], ['B', 'B'], 'in', 'count_edges');
    expect(result.degree).toEqual([0, 2, 0]);
  });

  it('distinguishes count_edges from count_unique_neighbors on a multapse', () => {
    // Two edges A->B (a multapse). In-degree of B: 2 by edges, 1 by unique neighbour.
    const byEdges = computeDegrees(['A', 'B'], ['A', 'A'], ['B', 'B'], 'in', 'count_edges');
    const byNeighbour = computeDegrees(['A', 'B'], ['A', 'A'], ['B', 'B'], 'in', 'count_unique_neighbors');
    expect(byEdges.degree[1]).toBe(2);
    expect(byNeighbour.degree[1]).toBe(1);
  });

  it('counts an autapse in the degree of its node', () => {
    // A->A self-loop. Out-degree of A = 1.
    const result = computeDegrees(['A'], ['A'], ['A'], 'out', 'count_edges');
    expect(result.degree[0]).toBe(1);
  });

  it('builds a sparse matrix where an absent cell is not a materialized zero', () => {
    // 2x2 universe, one edge A->B with weight 1.5. Only cell (row B, col A) is present.
    const matrix = computeMatrix(['A', 'B'], ['A', 'B'], ['A'], ['B'], [1.5], 'sum');
    expect(matrix.cells).toHaveLength(1);
    expect(matrix.cells[0]).toMatchObject({ row: 1, col: 0, value: 1.5, contributingCount: 1 });
  });

  it('aggregates a multapse cell and retains its contributor count', () => {
    // Two edges A->B with weights 1 and 3. Sum = 4, mean = 2, contributors = 2.
    const summed = computeMatrix(['A', 'B'], ['A', 'B'], ['A', 'A'], ['B', 'B'], [1, 3], 'sum');
    const meaned = computeMatrix(['A', 'B'], ['A', 'B'], ['A', 'A'], ['B', 'B'], [1, 3], 'mean');
    expect(summed.cells[0]).toMatchObject({ value: 4, contributingCount: 2 });
    expect(meaned.cells[0]).toMatchObject({ value: 2, contributingCount: 2 });
  });

  it('keeps the value array index-aligned when a value is null (missing)', () => {
    // Three edges: A->B (null weight), A->C (weight 5), B->C (weight 7). If the null were
    // filtered up front, edge A->C would be drawn with 7 and B->C with nothing — a silent
    // corruption. With per-cell skipping, cell (C,A) is 5 and cell (C,B) is 7, and cell
    // (B,A) has no finite contribution so it is absent.
    const matrix = computeMatrix(
      ['A', 'B', 'C'], ['A', 'B', 'C'],
      ['A', 'A', 'B'], ['B', 'C', 'C'],
      [null, 5, 7], 'sum',
    );
    const cellValue = (rowId: string, colId: string) => {
      const r = ['A', 'B', 'C'].indexOf(rowId);
      const c = ['A', 'B', 'C'].indexOf(colId);
      return matrix.cells.find((cell) => cell.row === r && cell.col === c)?.value;
    };
    expect(cellValue('C', 'A')).toBe(5); // target C, source A -> weight 5, NOT 7
    expect(cellValue('C', 'B')).toBe(7); // target C, source B -> weight 7
    expect(cellValue('B', 'A')).toBeUndefined(); // null weight -> no finite value, absent
  });
});

describe('window partitioning — half-open by default', () => {
  it('excludes an event exactly at stop under the half-open convention', () => {
    const result = partitionByWindow([0, 5, 10], 0, 10, false);
    expect(result.inside).toEqual([0, 1]); // indices of 0 and 5; 10 is excluded
    expect(result.excludedAbove).toBe(1);
  });

  it('includes an event at stop when the window is explicitly closed', () => {
    const result = partitionByWindow([0, 5, 10], 0, 10, true);
    expect(result.inside).toEqual([0, 1, 2]);
    expect(result.excludedAbove).toBe(0);
  });
});
