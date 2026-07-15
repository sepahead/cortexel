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

  it('flags a supplied rate that does not follow from its count', () => {
    // 5 events / (4 * 0.005 s) = 250, not 999.
    const mismatches = verifyRates([5, 1], [999, 50], [0, 5, 10], 'ms', 4, 'mean_rate_per_recorded_sender');
    expect(mismatches).toEqual([0]);
  });

  it('accepts a correctly supplied rate within tolerance', () => {
    expect(verifyRates([5, 1], [250, 50], [0, 5, 10], 'ms', 4, 'mean_rate_per_recorded_sender')).toEqual([]);
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

  it('distinguishes count_edges from count_unique_neighbours on a multapse', () => {
    // Two edges A->B (a multapse). In-degree of B: 2 by edges, 1 by unique neighbour.
    const byEdges = computeDegrees(['A', 'B'], ['A', 'A'], ['B', 'B'], 'in', 'count_edges');
    const byNeighbour = computeDegrees(['A', 'B'], ['A', 'A'], ['B', 'B'], 'in', 'count_unique_neighbours');
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
