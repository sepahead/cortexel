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

import { binCounts, binWidths, type Bins } from './bins.js';
import { toSeconds } from '../core/units.js';

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
  if (recordedSenderCount < 1) {
    throw new Error('recorded sender count must be positive');
  }

  const { counts, underflow, overflow } = binCounts([...eventTimes], bins);
  const widths = binWidths(bins);

  const binStart: number[] = [];
  const binEnd: number[] = [];
  const rateHz: number[] = [];

  for (let i = 0; i < counts.length; i++) {
    binStart.push(bins.edges[i]);
    binEnd.push(bins.edges[i + 1]);

    const widthSeconds = toSeconds(widths[i], timeUnit);
    const denominator =
      normalization === 'mean_rate_per_recorded_sender'
        ? recordedSenderCount * widthSeconds
        : widthSeconds;
    rateHz.push(denominator > 0 ? counts[i] / denominator : 0);
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

  for (let i = 0; i < n; i++) {
    const width = edges[i + 1] - edges[i];
    const widthSeconds = toSeconds(width, timeUnit);
    if (!(widthSeconds > 0)) continue;

    const denominator =
      normalization === 'mean_rate_per_recorded_sender'
        ? recordedSenderCount * widthSeconds
        : widthSeconds;
    const expected = counts[i] / denominator;
    const actual = suppliedRates[i];

    const difference = Math.abs(actual - expected);
    const scale = Math.max(Math.abs(actual), Math.abs(expected));
    if (difference > Math.max(tolerance.absolute, tolerance.relative * scale)) {
      mismatches.push(i);
    }
  }

  return mismatches;
}
