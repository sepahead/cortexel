/**
 * Binning.
 *
 * Every binned analysis in Cortexel shares this one binning rule, so the boundary
 * convention is defined in exactly one place. A bin `[lo, hi)` is half-open — a value
 * exactly at `hi` belongs to the NEXT bin — with one documented exception: a value
 * exactly at the final upper edge falls in the final bin, because otherwise the single
 * largest observation would always be silently dropped.
 *
 * Half-open is not a stylistic choice. If two adjacent bins both claimed their shared
 * edge, a value on it would be counted twice; if neither did, it would vanish.
 * Half-open is the only convention under which bins tile a line without gap or overlap.
 */

import {
  MAX_MATERIALIZED_BINS,
  materializeWidthBins,
} from '../core/binning.js';
import {
  exactBinary64Sum,
  roundedBinary64Mean,
} from '../core/exact-binary64.js';

export interface Bins {
  /** n+1 strictly increasing edges defining n bins. */
  readonly edges: readonly number[];
  /** Whether a value exactly at the last edge falls in the final bin. */
  readonly finalEdgeInclusive: boolean;
}

export { MAX_MATERIALIZED_BINS };

/** Build edges from a width that tiles [start, stop). */
export function edgesFromWidth(start: number, stop: number, width: number): number[] {
  const result = materializeWidthBins(start, stop, width);
  if (!result.ok) throw new Error(`invalid width-mode bin specification (${result.reason})`);
  return [...result.edges];
}

/** The no-throw form for public boundaries and preflight code. */
export function tryEdgesFromWidth(start: number, stop: number, width: number): number[] | undefined {
  const result = materializeWidthBins(start, stop, width);
  return result.ok ? [...result.edges] : undefined;
}

/**
 * The bin index for a value, or -1 if it lies outside every bin.
 *
 * Binary search, so binning a large event list against many bins stays n log n rather
 * than n squared.
 */
export function binIndex(value: number, bins: Bins): number {
  const { edges, finalEdgeInclusive } = bins;
  const n = edges.length - 1;
  if (!Number.isFinite(value) || n < 1) return -1;

  if (value < edges[0]) return -1;
  if (value > edges[n]) return -1;
  if (value === edges[n]) return finalEdgeInclusive ? n - 1 : -1;

  // Largest i with edges[i] <= value; since value < edges[n] and value >= edges[0],
  // that i is a valid bin.
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (edges[mid] <= value) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Count values into bins.
 *
 * Returns exact integer counts plus how many values fell below, above, or (if
 * non-finite) could not be placed. Nothing is dropped silently: an out-of-range value
 * is counted as out-of-range, and that count reaches the disclosure.
 */
export function binCounts(
  values: readonly number[],
  bins: Bins,
): { counts: number[]; underflow: number; overflow: number; invalid: number } {
  const counts = new Array<number>(bins.edges.length - 1).fill(0);
  let underflow = 0;
  let overflow = 0;
  let invalid = 0;

  for (const value of values) {
    if (!Number.isFinite(value)) {
      invalid++;
      continue;
    }
    const index = binIndex(value, bins);
    if (index < 0) {
      if (value < bins.edges[0]) underflow++;
      else overflow++;
      continue;
    }
    counts[index]++;
  }

  return { counts, underflow, overflow, invalid };
}

export function binWidths(bins: Bins): number[] {
  const widths: number[] = [];
  for (let i = 0; i < bins.edges.length - 1; i++) {
    widths.push(exactBinary64Sum([bins.edges[i + 1], -bins.edges[i]]));
  }
  return widths;
}

export function binCenters(bins: Bins): number[] {
  const centers: number[] = [];
  for (let i = 0; i < bins.edges.length - 1; i++) {
    centers.push(roundedBinary64Mean([bins.edges[i], bins.edges[i + 1]]));
  }
  return centers;
}
