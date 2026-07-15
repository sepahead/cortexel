/**
 * Deterministic linear scales and tick generation.
 *
 * A scale maps a data value to a pixel coordinate. It is versioned and bounded: the tick
 * algorithm produces the same ticks for the same domain on every platform, because the
 * SVG that embeds those tick labels is normative and hashed.
 *
 * The tick step uses the "nice numbers" rule (1, 2, 5 × a power of ten), which is
 * standard, deterministic, and gives round labels. It is implemented here rather than
 * pulled from d3 so the stable render path has no d3 dependency.
 */

import { formatNumber } from './format.js';

export interface LinearScale {
  readonly domainMin: number;
  readonly domainMax: number;
  readonly rangeMin: number;
  readonly rangeMax: number;
  map(value: number): number;
}

export function linearScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): LinearScale {
  // A degenerate domain (min === max) would divide by zero. Widen it symmetrically so a
  // constant series still renders as a centered flat line rather than crashing.
  let lo = domainMin;
  let hi = domainMax;
  if (lo === hi) {
    const pad = lo === 0 ? 1 : Math.abs(lo) * 0.5;
    lo -= pad;
    hi += pad;
  }

  const domainSpan = hi - lo;
  const rangeSpan = rangeMax - rangeMin;

  return {
    domainMin: lo,
    domainMax: hi,
    rangeMin,
    rangeMax,
    map(value: number): number {
      return rangeMin + ((value - lo) / domainSpan) * rangeSpan;
    },
  };
}

/** A "nice" step at or above the raw step: 1, 2, or 5 times a power of ten. */
function niceStep(rawStep: number): number {
  if (rawStep <= 0 || !Number.isFinite(rawStep)) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

export interface Tick {
  readonly value: number;
  readonly label: string;
}

/**
 * Generate up to `target` round ticks spanning [min, max].
 *
 * Deterministic: the same domain always yields the same ticks, because the step is a
 * pure function of the domain and the target count.
 */
export function linearTicks(min: number, max: number, target = 6): Tick[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [{ value: min, label: formatNumber(min) }];
  }

  const rawStep = (max - min) / Math.max(1, target);
  const step = niceStep(rawStep);
  const start = Math.ceil(min / step) * step;

  const ticks: Tick[] = [];
  // Cap the loop hard so a pathological domain cannot generate unbounded ticks.
  for (let value = start, guard = 0; value <= max + step * 1e-9 && guard < 1000; value += step, guard++) {
    // Snap to the step grid to remove accumulated binary64 drift, so labels read as
    // round numbers (0, 5, 10) rather than (0, 4.9999999, 10.0000001).
    const snapped = Math.round(value / step) * step;
    ticks.push({ value: snapped, label: formatNumber(snapped) });
  }

  return ticks;
}
