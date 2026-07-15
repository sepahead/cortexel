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

import { binCounts, type Bins } from './bins.js';

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
): CorrelogramResult {
  const lagMin = bins.edges[0];
  const lagMax = bins.edges[bins.edges.length - 1];

  const lags: number[] = [];
  let selfPairsExcluded = 0;
  let zeroLagRetainedDistinctPairs = 0;

  // Both trains are sorted so the inner sweep can stop early once it passes lagMax,
  // keeping the work bounded rather than fully quadratic on well-separated data.
  const ref = [...referenceTimes].sort((a, b) => a - b);
  const tgt =
    kind === 'auto' ? ref : [...targetTimes].sort((a, b) => a - b);

  for (let i = 0; i < ref.length; i++) {
    const r = ref[i];
    for (let j = 0; j < tgt.length; j++) {
      // For an autocorrelogram, exclude the event paired with ITSELF — same index in the
      // same sorted array. A distinct event that merely shares the time is a different j
      // and is retained.
      if (kind === 'auto' && i === j) {
        selfPairsExcluded++;
        continue;
      }

      const lag = tgt[j] - r;
      if (lag < lagMin) continue;
      if (lag > lagMax) break; // tgt is sorted, so every later j is also out of range

      lags.push(lag);
      if (lag === 0) zeroLagRetainedDistinctPairs++;
    }
  }

  const { counts } = binCounts(lags, bins);

  return {
    counts,
    kind,
    totalPairs: lags.length,
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
