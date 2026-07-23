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
import {
  compareExactUnitSumToValue,
  convertDifference,
  deriveExactCountRateInUnit,
} from '../core/units.js';

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

export interface CorrelogramPairAccounting {
  /** Cartesian role product before the auto same-record exclusion or lag filtering. */
  readonly candidatePairCount: number;
  /** Sum of the exact per-bin pair counts on the published lag ladder. */
  readonly countedPairCount: number;
  /** Candidate pairs outside [negative outer edge, positive outer edge). */
  readonly outOfRangePairCount: number;
  /** Exactly one per source event in auto mode; zero in cross mode. */
  readonly sameEventSelfPairCountExcluded: number;
}

function requireExactCount(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

/**
 * Derive the one exact pair partition used by raw and pre-binned products.
 *
 * The out-of-range term is not caller authority. It is the unique remainder in
 * candidate = counted + out-of-range + excluded-self-pairs.
 */
export function deriveCorrelogramPairAccounting(
  referenceEventCount: number,
  targetEventCount: number,
  kind: 'auto' | 'cross',
  countedPairCount: number,
): CorrelogramPairAccounting {
  requireExactCount(referenceEventCount, 'reference event count');
  requireExactCount(targetEventCount, 'target event count');
  requireExactCount(countedPairCount, 'counted pair count');
  if (kind === 'auto' && targetEventCount !== referenceEventCount) {
    throw new RangeError('an autocorrelogram uses the same event count in both roles');
  }

  const candidate = BigInt(referenceEventCount) * BigInt(targetEventCount);
  const selfPairs = kind === 'auto' ? BigInt(referenceEventCount) : 0n;
  const counted = BigInt(countedPairCount);
  const outOfRange = candidate - selfPairs - counted;
  if (outOfRange < 0n) {
    throw new RangeError(
      'counted pairs exceed the candidate role product after the auto self-pair exclusion',
    );
  }
  if (candidate > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('candidate pair count exceeds the exact JSON integer domain');
  }

  return {
    candidatePairCount: Number(candidate),
    countedPairCount,
    outOfRangePairCount: Number(outOfRange),
    sameEventSelfPairCountExcluded: Number(selfPairs),
  };
}

export type CorrelogramRateStatus =
  | 'defined'
  | 'undefined_zero_eligible_reference_events';

export interface CorrelogramRateBin {
  readonly pairCount: number;
  readonly eligibleReferenceEvents: number;
  readonly denominatorSeconds: number;
  readonly value: number | null;
  readonly status: CorrelogramRateStatus;
}

export type CorrelogramWindowBoundary = '[start,stop)' | '[start,stop]' | '(start,stop]';

export interface CorrelogramTypedWindow {
  readonly start: number;
  readonly stop: number;
  readonly unit: string;
  readonly boundary: CorrelogramWindowBoundary;
}

/**
 * Count reference events whose entire shifted half-open lag bin lies in the window.
 *
 * Unit-bearing sums are compared exactly from the received binary64 values. The
 * calculation never rounds `reference + edge` into an intermediate number that could
 * move a large-origin event across the window boundary.
 */
export function deriveEligibleCorrelogramReferenceCounts(
  referenceTimes: readonly number[],
  referenceTimeUnit: string,
  binEdges: readonly number[],
  binEdgeUnit: string,
  window: CorrelogramTypedWindow,
): number[] {
  if (
    !Number.isFinite(window.start) ||
    !Number.isFinite(window.stop) ||
    !(window.stop > window.start)
  ) {
    throw new RangeError('correlogram eligibility window must be finite and ordered');
  }
  if (binEdges.length < 2) {
    throw new RangeError('correlogram eligibility requires at least two bin edges');
  }
  for (let index = 0; index < binEdges.length; index++) {
    if (!Number.isFinite(binEdges[index])) {
      throw new RangeError(`correlogram bin edge ${index} must be finite`);
    }
    if (index > 0 && !(binEdges[index] > binEdges[index - 1])) {
      throw new RangeError('correlogram bin edges must be strictly increasing');
    }
  }
  for (let index = 0; index < referenceTimes.length; index++) {
    if (!Number.isFinite(referenceTimes[index])) {
      throw new RangeError(`correlogram reference time ${index} must be finite`);
    }
  }

  const openStart = window.boundary === '(start,stop]';
  const binCount = binEdges.length - 1;
  const deltas = new Array<number>(binCount + 1).fill(0);

  // For one reference event, eligible bins form one contiguous index interval because
  // both exact endpoint comparisons are monotone over strictly increasing edges. Two
  // binary searches plus a difference-array update therefore replace an O(events*bins)
  // scan without changing a single boundary comparison.
  const firstTrue = (predicate: (edge: number) => boolean): number => {
    let lower = 0;
    let upper = binEdges.length;
    while (lower < upper) {
      const middle = lower + Math.floor((upper - lower) / 2);
      if (predicate(binEdges[middle])) upper = middle;
      else lower = middle + 1;
    }
    return lower;
  };

  for (const time of referenceTimes) {
    const firstAdmissibleLowerEdge = firstTrue((edge) => {
      const comparison = compareExactUnitSumToValue(
        [
          { value: time, unit: referenceTimeUnit },
          { value: edge, unit: binEdgeUnit },
        ],
        { value: window.start, unit: window.unit },
      );
      return openStart ? comparison > 0 : comparison >= 0;
    });
    const firstUpperEdgeBeyondStop = firstTrue((edge) =>
      compareExactUnitSumToValue(
        [
          { value: time, unit: referenceTimeUnit },
          { value: edge, unit: binEdgeUnit },
        ],
        { value: window.stop, unit: window.unit },
      ) > 0);

    // If edge j is the final edge <= stop, every bin k with k+1 <= j has an
    // admissible (excluded) upper endpoint. Thus j itself is the exclusive bin index.
    const lowerBin = Math.min(firstAdmissibleLowerEdge, binCount);
    const upperBinExclusive = Math.max(
      0,
      Math.min(firstUpperEdgeBeyondStop - 1, binCount),
    );
    if (lowerBin < upperBinExclusive) {
      deltas[lowerBin]++;
      deltas[upperBinExclusive]--;
    }
  }

  const counts = new Array<number>(binCount);
  let active = 0;
  for (let index = 0; index < binCount; index++) {
    active += deltas[index];
    counts[index] = active;
  }
  return counts;
}

/** Derive target rates without turning a zero scientific denominator into zero or NaN. */
export function deriveCorrelogramTargetRates(
  pairCounts: readonly number[],
  eligibleReferenceEventCounts: readonly number[],
  binWidth: Readonly<{ readonly value: number; readonly unit: string }>,
): CorrelogramRateBin[] {
  if (pairCounts.length !== eligibleReferenceEventCounts.length) {
    throw new RangeError('each correlogram pair-count bin requires one eligible-reference count');
  }
  if (!Number.isFinite(binWidth.value) || !(binWidth.value > 0)) {
    throw new RangeError('correlogram bin width must be finite and positive');
  }
  const binWidthSeconds = convertDifference(0, binWidth.value, binWidth.unit, 's');

  return pairCounts.map((pairCount, index) => {
    const eligibleReferenceEvents = eligibleReferenceEventCounts[index];
    requireExactCount(pairCount, `pair count at bin ${index}`);
    requireExactCount(eligibleReferenceEvents, `eligible reference count at bin ${index}`);
    if (eligibleReferenceEvents === 0) {
      if (pairCount !== 0) {
        throw new RangeError(
          `pair count at bin ${index} must be zero when no reference event is eligible`,
        );
      }
      return {
        pairCount,
        eligibleReferenceEvents,
        denominatorSeconds: 0,
        value: null,
        status: 'undefined_zero_eligible_reference_events' as const,
      };
    }

    const exposureSeconds = eligibleReferenceEvents * binWidthSeconds;
    if (!Number.isFinite(exposureSeconds) || !(exposureSeconds > 0)) {
      throw new RangeError(`target-rate exposure at bin ${index} is not finite positive binary64`);
    }
    const value = deriveExactCountRateInUnit(
      pairCount,
      eligibleReferenceEvents,
      0,
      binWidth.value,
      binWidth.unit,
      'Hz',
    );
    return {
      pairCount,
      eligibleReferenceEvents,
      denominatorSeconds: exposureSeconds,
      value,
      status: 'defined' as const,
    };
  });
}

function sortedTrains(
  referenceTimes: readonly number[],
  targetTimes: readonly number[],
  kind: 'auto' | 'cross',
): { ref: number[]; tgt: number[] } {
  const ref = [...referenceTimes].sort((a, b) => a - b);
  return { ref, tgt: kind === 'auto' ? ref : [...targetTimes].sort((a, b) => a - b) };
}

function requireCorrelogramBins(bins: Bins): void {
  if (bins.finalEdgeInclusive) {
    throw new RangeError(
      'correlogram bins are left-closed/right-open at every edge; finalEdgeInclusive must be false',
    );
  }
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
    while (upper < tgt.length && tgt[upper] - reference < lagMax) {
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
  requireCorrelogramBins(bins);
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
    readonly binBoundary: 'left_closed_right_open';
    readonly positiveOuterEdge: 'excluded';
    readonly kind: 'auto' | 'cross';
    readonly selfPairPolicy: string;
    readonly pairAccounting: CorrelogramPairAccounting;
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
  requireCorrelogramBins(bins);
  const lagMin = bins.edges[0];
  const lagMax = bins.edges[bins.edges.length - 1];

  const counts = new Array<number>(Math.max(0, bins.edges.length - 1)).fill(0);
  const selfPairsExcluded = kind === 'auto' ? referenceTimes.length : 0;
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
    while (upper < tgt.length && tgt[upper] - r < lagMax) {
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

  const pairAccounting = deriveCorrelogramPairAccounting(
    referenceTimes.length,
    kind === 'auto' ? referenceTimes.length : targetTimes.length,
    kind,
    totalPairs,
  );

  return {
    counts,
    kind,
    totalPairs,
    selfPairsExcluded,
    zeroLagRetainedDistinctPairs,
    receipt: {
      operation: 'correlogram.pair_count',
      lagConvention: 'target_time - reference_time',
      binBoundary: 'left_closed_right_open',
      positiveOuterEdge: 'excluded',
      kind,
      selfPairPolicy:
        kind === 'auto'
          ? 'identical-event self-pairs excluded; distinct coincident events retained'
          : 'no self-pair exclusion (cross-correlogram of two trains)',
      pairAccounting,
    },
  };
}
