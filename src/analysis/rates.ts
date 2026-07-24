/**
 * Population rate.
 *
 * The rate formula is auditable from raw counts. The only subtle part is the
 * denominator, and it is subtle in a way that always errs in the flattering direction
 * if you get it wrong: the denominator is the number of RECORDED senders, including the
 * ones that never fired. Use the number that spiked and every rate comes out too high.
 *
 * For millisecond bins the arithmetic reduces to the familiar
 * `rate_hz = count * 1000 / (senders * binWidthMs)`, but the implementation converts the
 * bin width to seconds through the typed unit layer rather than hard-coding 1000 — so a
 * request in microseconds is correct without a special case.
 */

import { binCounts, type Bins } from './bins.js';
import {
  binary64RelativeDifferenceWithinTolerance,
} from '../core/exact-binary64.js';
import {
  convertDifference,
  divideExactIntegerByConvertedDifference,
} from '../core/units.js';

export interface RateResult {
  readonly binStart: number[];
  readonly binEnd: number[];
  readonly binWidth: number[];
  readonly count: number[];
  readonly rateHz: number[];
  readonly excludedBelow: number;
  readonly excludedAbove: number;
  readonly receipt: {
    readonly operation: 'population_rate.binned';
    readonly normalization: 'mean_rate_per_recorded_sender' | 'total_event_rate';
    readonly recordedSenderCount: number;
    readonly timeUnit: string;
  };
}

export function computePopulationRate(
  eventTimes: readonly number[],
  bins: Bins,
  timeUnit: string,
  recordedSenderCount: number,
  normalization: 'mean_rate_per_recorded_sender' | 'total_event_rate',
): RateResult {
  if (!Number.isSafeInteger(recordedSenderCount) || recordedSenderCount < 1) {
    throw new Error('recorded sender count must be a positive safe integer');
  }
  if (
    normalization !== 'mean_rate_per_recorded_sender' &&
    normalization !== 'total_event_rate'
  ) {
    throw new Error('population-rate normalization is not registered');
  }

  const { counts, underflow, overflow } = binCounts([...eventTimes], bins);

  const binStart: number[] = [];
  const binEnd: number[] = [];
  const widths: number[] = [];
  const rateHz: number[] = [];

  for (let i = 0; i < counts.length; i++) {
    const lower = bins.edges[i];
    const upper = bins.edges[i + 1];
    binStart.push(lower);
    binEnd.push(upper);

    // Subtracting first can overflow (`-MAX_VALUE` to `MAX_VALUE`) or erase a narrow
    // separation at a large origin. Convert the exact endpoint separation and round
    // only the result.
    widths.push(convertDifference(lower, upper, timeUnit, timeUnit));
    const integerFactor =
      normalization === 'mean_rate_per_recorded_sender' ? recordedSenderCount : 1;
    rateHz.push(
      divideExactIntegerByConvertedDifference(
        counts[i],
        integerFactor,
        lower,
        upper,
        timeUnit,
        's',
      ),
    );
  }

  return {
    binStart,
    binEnd,
    binWidth: widths,
    count: counts,
    rateHz,
    excludedBelow: underflow,
    excludedAbove: overflow,
    receipt: {
      operation: 'population_rate.binned',
      normalization,
      recordedSenderCount,
      timeUnit,
    },
  };
}

/**
 * Verify a supplied rate against its count and denominator.
 *
 * Returns the indices where the supplied rate does not follow from the arithmetic. This
 * is the check behind SCIENCE_NORMALIZATION_UNVERIFIABLE: Cortexel re-derives rather than
 * trusts, so a rate that was mistranscribed or computed with the wrong denominator is
 * caught before it reaches a figure.
 *
 * The absolute tolerance field is retained for API compatibility, but it is never
 * applied to a non-zero rate. A fixed `1e-12` floor would make every positive
 * subnormal rate compare equal to values hundreds of orders of magnitude larger.
 */
export function verifyRates(
  counts: readonly number[],
  suppliedRates: readonly number[],
  edges: readonly number[],
  timeUnit: string,
  recordedSenderCount: number,
  normalization: 'mean_rate_per_recorded_sender' | 'total_event_rate',
  tolerance = { relative: 1e-9, absolute: 1e-12 },
): number[] {
  const mismatches: number[] = [];
  const n = Math.min(counts.length, suppliedRates.length);
  if (
    !Number.isSafeInteger(recordedSenderCount) ||
    recordedSenderCount < 1 ||
    (
      normalization !== 'mean_rate_per_recorded_sender' &&
      normalization !== 'total_event_rate'
    )
  ) {
    return Array.from({ length: n }, (_, index) => index);
  }

  for (let i = 0; i < n; i++) {
    let expected: number;
    try {
      if (!Number.isSafeInteger(counts[i]) || counts[i] < 0) {
        throw new Error('rate verification requires exact non-negative safe-integer counts');
      }
      const integerFactor =
        normalization === 'mean_rate_per_recorded_sender' ? recordedSenderCount : 1;
      expected = divideExactIntegerByConvertedDifference(
        counts[i],
        integerFactor,
        edges[i],
        edges[i + 1],
        timeUnit,
        's',
      );
    } catch {
      // The return value is the set of bins that could not be verified. A numeric or
      // unit failure is therefore a mismatch, never an instruction to trust the input.
      mismatches.push(i);
      continue;
    }

    const actual = suppliedRates[i];
    const zeroClassMatches = (actual === 0) === (expected === 0);
    const signMatches = actual === 0 || expected === 0 || Math.sign(actual) === Math.sign(expected);
    if (
      !Number.isFinite(actual) ||
      !zeroClassMatches ||
      !signMatches ||
      !binary64RelativeDifferenceWithinTolerance(actual, expected, tolerance.relative)
    ) {
      mismatches.push(i);
    }
  }

  return mismatches;
}
