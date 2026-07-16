/**
 * Cross- and auto-correlogram.
 *
 * Three decisions decide what the picture means, and all three are made explicitly here
 * rather than left to a caller flag:
 *
 *   Orientation. Lag = target_time - reference_time. Positive lag means the target train
 *   follows the reference. Adapters, tables, and captions all state this one sentence.
 *
 *   Self-pairs. For an AUTOcorrelogram, each event paired with itself is excluded (that
 *   pairing is a trivial zero-lag artifact present for every event). But two DISTINCT
 *   events at the same time are retained — they are real coincidences. So the zero-lag
 *   bin is not blanked; it is computed. Blanking it merely because the lag is zero would
 *   hide genuine synchrony.
 *
 *   Statistic. This function returns a raw pair COUNT per lag bin. A raw count is an
 *   honest thing to plot. It is not a correlation coefficient, and the contract refuses
 *   to let it be labelled as one without the statistics that make it one.
 */

import { binIndex, type Bins } from './bins.js';
import { BUDGET_PROFILES } from '../generated/budgets.js';

export const DEFAULT_MAX_PAIRWISE_OPERATIONS = BUDGET_PROFILES.standard.pairwiseOperations;

export class PairwiseBudgetExceededError extends Error {
  readonly limit: number;
  readonly observedLowerBound: number;

  constructor(limit: number, observedLowerBound: number) {
    super(`correlogram pair count exceeds ${limit}`);
    this.name = 'PairwiseBudgetExceededError';
    this.limit = limit;
    this.observedLowerBound = observedLowerBound;
  }
}

function sortedTrains(
  referenceTimes: readonly number[],
  targetTimes: readonly number[],
  kind: 'auto' | 'cross',
): { ref: number[]; tgt: number[] } {
  const ref = [...referenceTimes].sort((a, b) => a - b);
  return { ref, tgt: kind === 'auto' ? ref : [...targetTimes].sort((a, b) => a - b) };
}

function countSortedEligiblePairs(
  ref: readonly number[],
  tgt: readonly number[],
  bins: Bins,
  kind: 'auto' | 'cross',
  stopAfter: number,
): number {
  const lagMin = bins.edges[0];
  const lagMax = bins.edges[bins.edges.length - 1];
  let lower = 0;
  let upper = 0;
  let total = 0;

  for (let i = 0; i < ref.length; i++) {
    const reference = ref[i];
    while (lower < tgt.length && tgt[lower] - reference < lagMin) lower++;
    if (upper < lower) upper = lower;
    while (
      upper < tgt.length &&
      (bins.finalEdgeInclusive
        ? tgt[upper] - reference <= lagMax
        : tgt[upper] - reference < lagMax)
    ) {
      upper++;
    }

    let eligible = upper - lower;
    if (kind === 'auto' && i >= lower && i < upper) eligible--;
    total += eligible;
    if (total > stopAfter) return stopAfter + 1;
  }

  return total;
}

/** Exact eligible-pair count without forming a pair; work is linear after sorting. */
export function countEligibleCorrelogramPairs(
  referenceTimes: readonly number[],
  targetTimes: readonly number[],
  bins: Bins,
  kind: 'auto' | 'cross',
  stopAfter = Number.MAX_SAFE_INTEGER - 1,
): number {
  if (!Number.isSafeInteger(stopAfter) || stopAfter < 0) {
    throw new RangeError('correlogram pair budget must be a non-negative safe integer');
  }
  const { ref, tgt } = sortedTrains(referenceTimes, targetTimes, kind);
  return countSortedEligiblePairs(ref, tgt, bins, kind, stopAfter);
}

export interface CorrelogramResult {
  readonly counts: number[];
  readonly kind: 'auto' | 'cross';
  readonly totalPairs: number;
  readonly selfPairsExcluded: number;
  readonly zeroLagRetainedDistinctPairs: number;
  readonly receipt: {
    readonly operation: 'correlogram.pair_count';
    readonly lagConvention: 'target_time - reference_time';
    readonly kind: 'auto' | 'cross';
    readonly selfPairPolicy: string;
  };
}

/**
 * Count pairs by lag.
 *
 * For each reference event, every target event within the lag range contributes to the
 * bin of `target - reference`. For an autocorrelogram, reference and target are the same
 * train and the identical-event pairing (i === j) is excluded — but distinct events with
 * equal times are kept.
 */
export function computeCorrelogram(
  referenceTimes: readonly number[],
  targetTimes: readonly number[],
  bins: Bins,
  kind: 'auto' | 'cross',
  maxPairwiseOperations = DEFAULT_MAX_PAIRWISE_OPERATIONS,
): CorrelogramResult {
  if (!Number.isSafeInteger(maxPairwiseOperations) || maxPairwiseOperations < 0) {
    throw new RangeError('correlogram pair budget must be a non-negative safe integer');
  }
  const lagMin = bins.edges[0];
  const lagMax = bins.edges[bins.edges.length - 1];

  const counts = new Array<number>(Math.max(0, bins.edges.length - 1)).fill(0);
  const selfPairsExcluded =
    kind === 'auto' && binIndex(0, bins) >= 0 ? referenceTimes.length : 0;
  let zeroLagRetainedDistinctPairs = 0;
  let totalPairs = 0;

  // Both trains are sorted. The preflight and the fill pass use monotone window pointers,
  // so even two huge, well-separated trains do O(N+M) comparisons rather than repeatedly
  // scanning an ineligible prefix for every reference event.
  const { ref, tgt } = sortedTrains(referenceTimes, targetTimes, kind);
  const eligible = countSortedEligiblePairs(ref, tgt, bins, kind, maxPairwiseOperations);
  if (eligible > maxPairwiseOperations) {
    throw new PairwiseBudgetExceededError(maxPairwiseOperations, eligible);
  }

  let lower = 0;
  let upper = 0;
  for (let i = 0; i < ref.length; i++) {
    const r = ref[i];
    while (lower < tgt.length && tgt[lower] - r < lagMin) lower++;
    if (upper < lower) upper = lower;
    while (
      upper < tgt.length &&
      (bins.finalEdgeInclusive ? tgt[upper] - r <= lagMax : tgt[upper] - r < lagMax)
    ) {
      upper++;
    }

    for (let j = lower; j < upper; j++) {
      // For an autocorrelogram, exclude the event paired with ITSELF — same index in the
      // same sorted array. A distinct event that merely shares the time is a different j
      // and is retained.
      if (kind === 'auto' && i === j) {
        continue;
      }

      const lag = tgt[j] - r;
      const index = binIndex(lag, bins);
      if (index < 0) continue;
      counts[index]++;
      totalPairs++;
      if (lag === 0) zeroLagRetainedDistinctPairs++;
    }
  }

  return {
    counts,
    kind,
    totalPairs,
    selfPairsExcluded,
    zeroLagRetainedDistinctPairs,
    receipt: {
      operation: 'correlogram.pair_count',
      lagConvention: 'target_time - reference_time',
      kind,
      selfPairPolicy:
        kind === 'auto'
          ? 'identical-event self-pairs excluded; distinct coincident events retained'
          : 'no self-pair exclusion (cross-correlogram of two trains)',
    },
  };
}
