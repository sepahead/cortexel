/** Shared, bounded width-bin materialization used by semantics and analysis. */

import {
  exactRationalToBinary64,
  finiteBinary64ToMinSubnormalUnits,
} from './exact-binary64.js';

/** Matches the contract's maximum of 100001 explicit edges. */
export const MAX_MATERIALIZED_BINS = 100_000;

export type WidthBinMaterialization =
  | { readonly ok: true; readonly edges: readonly number[] }
  | {
      readonly ok: false;
      readonly reason:
        | 'nonfinite'
        | 'invalid_range'
        | 'non_tiling'
        | 'too_many'
        | 'unrepresentable';
    };

/**
 * Materialize `[start, stop]` into at most 100000 bins without throwing.
 *
 * Every edge is checked, not only the first: binary64 spacing can change while a range
 * crosses a power-of-two boundary, so a width representable at the origin may collapse
 * later. The final edge is exactly `stop`, but a genuine remainder bin is rejected:
 * width-mode means the declared width tiles the range. Variable-width bins must be
 * supplied explicitly as edges.
 */
export function materializeWidthBins(
  start: number,
  stop: number,
  width: number,
): WidthBinMaterialization {
  if (typeof start !== 'number' || typeof stop !== 'number' || typeof width !== 'number') {
    return { ok: false, reason: 'nonfinite' };
  }
  if (![start, stop, width].every(Number.isFinite)) return { ok: false, reason: 'nonfinite' };
  if (!(width > 0) || !(stop > start)) return { ok: false, reason: 'invalid_range' };

  const startUnits = finiteBinary64ToMinSubnormalUnits(start);
  const stopUnits = finiteBinary64ToMinSubnormalUnits(stop);
  const widthUnits = finiteBinary64ToMinSubnormalUnits(width);
  const spanUnits = stopUnits - startUnits;
  let ratio: number;
  try {
    ratio = exactRationalToBinary64(spanUnits, widthUnits);
  } catch {
    // An overflowing quotient is necessarily far beyond the materialization budget.
    return { ok: false, reason: 'too_many' };
  }
  if (!Number.isFinite(ratio)) return { ok: false, reason: 'nonfinite' };
  const count = Math.round(ratio);
  // Decimal inputs such as 0.3 / 0.1 need a small binary64 allowance. Scale it by
  // the quotient (not the absolute coordinate origin), and bound it to eight ulps of
  // ordinary divide/subtract error. This cannot turn a material remainder bin into a
  // fixed-width one.
  const tilingTolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(ratio));
  if (Math.abs(ratio - count) > tilingTolerance) {
    return { ok: false, reason: 'non_tiling' };
  }
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_MATERIALIZED_BINS) {
    return { ok: false, reason: 'too_many' };
  }

  const edges = new Array<number>(count + 1);
  edges[0] = start;
  for (let index = 1; index < count; index++) {
    const exactEdgeUnits = startUnits + BigInt(index) * widthUnits;
    let edge: number;
    try {
      edge = exactRationalToBinary64(exactEdgeUnits, 1n, -1074);
    } catch {
      return { ok: false, reason: 'unrepresentable' };
    }
    if (exactEdgeUnits !== 0n && edge === 0) return { ok: false, reason: 'unrepresentable' };
    if (!Number.isFinite(edge) || !(edge > edges[index - 1]) || !(edge < stop)) {
      return { ok: false, reason: 'unrepresentable' };
    }
    edges[index] = edge;
  }
  let reconstructedStop: number;
  try {
    reconstructedStop = exactRationalToBinary64(
      startUnits + BigInt(count) * widthUnits,
      1n,
      -1074,
    );
  } catch {
    return { ok: false, reason: 'non_tiling' };
  }
  const endpointTolerance =
    8 * Number.EPSILON * Math.max(1, Math.abs(start), Math.abs(stop), Math.abs(reconstructedStop));
  if (!Number.isFinite(reconstructedStop) || Math.abs(reconstructedStop - stop) > endpointTolerance) {
    return { ok: false, reason: 'non_tiling' };
  }
  edges[count] = stop;
  return { ok: true, edges };
}

/**
 * Materialize the centred lag geometry used by correlograms.
 *
 * `minCenter=-tau` and `maxCenter=+tau`; if `m=tau/width`, the result has `2m+1`
 * bins centred at `k*width` for `k=-m..m`, and outer edges half a width beyond the
 * declared centre range. This is deliberately separate from ordinary width bins:
 * treating the two centre coordinates as outer edges would lose the end bins and move
 * zero onto a boundary.
 */
export function materializeCenteredLagBins(
  minCenter: number,
  maxCenter: number,
  width: number,
  maxBins = MAX_MATERIALIZED_BINS,
): WidthBinMaterialization {
  if (
    typeof minCenter !== 'number' ||
    typeof maxCenter !== 'number' ||
    typeof width !== 'number' ||
    typeof maxBins !== 'number' ||
    !Number.isFinite(minCenter) ||
    !Number.isFinite(maxCenter) ||
    !Number.isFinite(width) ||
    !Number.isSafeInteger(maxBins)
  ) {
    return { ok: false, reason: 'nonfinite' };
  }
  if (!(width > 0) || !(maxCenter > minCenter) || maxBins < 1) {
    return { ok: false, reason: 'invalid_range' };
  }

  const symmetryTolerance =
    8 * Number.EPSILON * Math.max(1, Math.abs(minCenter), Math.abs(maxCenter));
  if (Math.abs(minCenter + maxCenter) > symmetryTolerance || !(maxCenter > 0)) {
    return { ok: false, reason: 'non_tiling' };
  }

  const ratio = maxCenter / width;
  const m = Math.round(ratio);
  const ratioTolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(ratio));
  if (!Number.isSafeInteger(m) || m < 1 || Math.abs(ratio - m) > ratioTolerance) {
    return { ok: false, reason: 'non_tiling' };
  }
  const binCount = 2 * m + 1;
  if (!Number.isSafeInteger(binCount) || binCount > maxBins) {
    return { ok: false, reason: 'too_many' };
  }

  const halfWidth = width / 2;
  const lower = minCenter - halfWidth;
  const upper = maxCenter + halfWidth;
  const materialized = materializeWidthBins(lower, upper, width);
  if (!materialized.ok) return materialized;
  return materialized.edges.length === binCount + 1
    ? materialized
    : { ok: false, reason: 'non_tiling' };
}
