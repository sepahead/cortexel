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
import {
  deterministicExp,
  deterministicLog,
  deterministicPositiveLogRatio,
} from '../core/deterministic-transcendentals.js';

export interface LinearScale {
  readonly domainMin: number;
  readonly domainMax: number;
  readonly rangeMin: number;
  readonly rangeMax: number;
  map(value: number): number;
}

export interface NumericScale extends LinearScale {
  readonly transform: 'linear' | 'log' | 'symlog';
  ticks(target?: number): readonly Tick[];
}

export function linearScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): LinearScale {
  if (
    !Number.isFinite(domainMin) ||
    !Number.isFinite(domainMax) ||
    domainMax < domainMin ||
    !Number.isFinite(rangeMin) ||
    !Number.isFinite(rangeMax)
  ) {
    throw new Error('linear scale requires an ordered finite domain and finite range');
  }
  const lo = domainMin;
  const hi = domainMax;
  const rangeSpan = rangeMax - rangeMin;
  if (!Number.isFinite(rangeSpan)) {
    throw new Error('linear scale range span must be finite');
  }

  // A constant domain has no data-derived width. Map the observed constant to the visual
  // midpoint and publish a single tick instead of inventing a numerical extent. This also
  // remains finite at Number.MAX_VALUE, where a symmetric arithmetic widening is impossible.
  if (lo === hi) {
    const midpoint = rangeMin + rangeSpan / 2;
    return {
      domainMin: lo,
      domainMax: hi,
      rangeMin,
      rangeMax,
      map(value: number): number {
        if (!Number.isFinite(value)) return NaN;
        if (value === lo) return midpoint;
        return value < lo ? rangeMin : rangeMax;
      },
    };
  }

  const directSpan = hi - lo;
  const normalizationScale = Math.max(Math.abs(lo), Math.abs(hi));
  const normalizedLo = lo / normalizationScale;
  const normalizedSpan = hi / normalizationScale - normalizedLo;

  return {
    domainMin: lo,
    domainMax: hi,
    rangeMin,
    rangeMax,
    map(value: number): number {
      if (!Number.isFinite(value)) return NaN;
      if (value === lo) return rangeMin;
      if (value === hi) return rangeMax;
      // The ordinary expression is most accurate for nearby endpoints. When `hi - lo`
      // overflows (for example [-MAX_VALUE,+MAX_VALUE]), normalize all three values by one
      // positive factor so the equivalent ratio is formed in [-1,+1].
      const ratio = Number.isFinite(directSpan)
        ? (value - lo) / directSpan
        : (value / normalizationScale - normalizedLo) / normalizedSpan;
      return rangeMin + ratio * rangeSpan;
    },
  };
}

/** A linear scale carrying its own deterministic tick authority. */
export function linearNumericScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): NumericScale {
  const scale = linearScale(domainMin, domainMax, rangeMin, rangeMax);
  return {
    ...scale,
    transform: 'linear',
    ticks(target = 6): readonly Tick[] {
      return linearTicks(scale.domainMin, scale.domainMax, target);
    },
  };
}

/** A positive logarithmic scale. Invalid domains are caller errors, never clipped. */
export function logNumericScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): NumericScale {
  if (
    !(domainMin > 0) ||
    !(domainMax > 0) ||
    !Number.isFinite(domainMin) ||
    !Number.isFinite(domainMax) ||
    domainMax < domainMin ||
    !Number.isFinite(rangeMin) ||
    !Number.isFinite(rangeMax)
  ) {
    throw new Error('log scale requires an ordered finite strictly positive domain and finite range');
  }
  const rangeSpan = rangeMax - rangeMin;
  if (!Number.isFinite(rangeSpan)) throw new Error('log scale range span must be finite');
  if (domainMin === domainMax) {
    const midpoint = rangeMin + rangeSpan / 2;
    return {
      domainMin,
      domainMax,
      rangeMin,
      rangeMax,
      transform: 'log',
      map(value: number): number {
        if (!(value > 0) || !Number.isFinite(value)) return NaN;
        if (value === domainMin) return midpoint;
        return value < domainMin ? rangeMin : rangeMax;
      },
      ticks(): readonly Tick[] {
        return ticksFromValues([domainMin]);
      },
    };
  }
  const span = deterministicPositiveLogRatio(domainMax, domainMin);
  if (!(span > 0) || !Number.isFinite(span)) {
    throw new Error('log scale domain is unrepresentable at binary64 resolution');
  }
  return {
    domainMin,
    domainMax,
    rangeMin,
    rangeMax,
    transform: 'log',
    map(value: number): number {
      if (!(value > 0) || !Number.isFinite(value)) return NaN;
      if (value === domainMin) return rangeMin;
      if (value === domainMax) return rangeMax;
      const distance = value >= domainMin
        ? deterministicPositiveLogRatio(value, domainMin)
        : -deterministicPositiveLogRatio(domainMin, value);
      return rangeMin + (distance / span) * rangeSpan;
    },
    ticks(target = 6): readonly Tick[] {
      return logarithmicTicks(domainMin, domainMax, target);
    },
  };
}

/**
 * The contract's symmetric-log transform.
 *
 * It is exactly linear inside [-threshold,+threshold] and C1-continuous at both
 * boundaries: sign(x) * (1 + ln(|x|/threshold)) outside. The threshold is therefore
 * a scientific presentation parameter, not a data-dependent heuristic.
 */
export function symlogTransform(value: number, threshold: number): number {
  if (!(threshold > 0) || !Number.isFinite(threshold) || !Number.isFinite(value)) return NaN;
  const magnitude = Math.abs(value);
  if (magnitude <= threshold) {
    const transformed = value / threshold;
    if (value !== 0) {
      const restored = transformed * threshold;
      const scale = Math.max(Math.abs(value), Math.abs(restored));
      if (
        transformed === 0 ||
        !Number.isFinite(restored) ||
        Math.abs(value / scale - restored / scale) > 8 * Number.EPSILON
      ) return NaN;
    }
    return transformed;
  }
  const logarithm = deterministicPositiveLogRatio(magnitude, threshold);
  return Math.sign(value) * (1 + logarithm);
}

export function symlogInverse(value: number, threshold: number): number {
  if (!(threshold > 0) || !Number.isFinite(threshold) || !Number.isFinite(value)) return NaN;
  const magnitude = Math.abs(value);
  if (magnitude <= 1) {
    const restored = value * threshold;
    return value !== 0 && restored === 0 ? NaN : restored;
  }
  const exponent = magnitude - 1;
  let restored = threshold * deterministicExp(exponent);
  if (!Number.isFinite(restored) || (restored === 0 && threshold !== 0)) {
    restored = deterministicExp(deterministicLog(threshold) + exponent);
  }
  if (!Number.isFinite(restored)) {
    const maximumTransform = 1 + deterministicPositiveLogRatio(Number.MAX_VALUE, threshold);
    if (magnitude <= maximumTransform) restored = Number.MAX_VALUE;
  }
  return Math.sign(value) * restored;
}

function innerSymlogDistance(from: number, to: number, threshold: number): number {
  const difference = to - from;
  return Number.isFinite(difference)
    ? difference / threshold
    : to / threshold - from / threshold;
}

/** Exact piecewise distance in transform space, formed without subtracting near-equal logs. */
function symlogDistance(from: number, to: number, threshold: number): number {
  if (from === to) return 0;
  if (from > to) return -symlogDistance(to, from, threshold);
  let cursor = from;
  let distance = 0;
  if (cursor < -threshold) {
    const end = Math.min(to, -threshold);
    distance += deterministicPositiveLogRatio(Math.abs(cursor), Math.abs(end));
    cursor = end;
  }
  if (cursor < threshold && cursor < to) {
    const end = Math.min(to, threshold);
    distance += innerSymlogDistance(cursor, end, threshold);
    cursor = end;
  }
  if (cursor < to) {
    distance += deterministicPositiveLogRatio(to, cursor);
  }
  return distance;
}

export function symlogNumericScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
  threshold: number,
): NumericScale {
  if (
    !Number.isFinite(domainMin) ||
    !Number.isFinite(domainMax) ||
    domainMax < domainMin ||
    !(threshold > 0) ||
    !Number.isFinite(threshold) ||
    !Number.isFinite(rangeMin) ||
    !Number.isFinite(rangeMax)
  ) {
    throw new Error('symlog scale requires an ordered finite domain, finite range, and positive finite threshold');
  }
  const rangeSpan = rangeMax - rangeMin;
  if (!Number.isFinite(rangeSpan)) throw new Error('symlog scale range span must be finite');
  if (domainMin === domainMax) {
    const midpoint = rangeMin + rangeSpan / 2;
    return {
      domainMin,
      domainMax,
      rangeMin,
      rangeMax,
      transform: 'symlog',
      map(value: number): number {
        if (!Number.isFinite(value)) return NaN;
        if (value === domainMin) return midpoint;
        return value < domainMin ? rangeMin : rangeMax;
      },
      ticks(): readonly Tick[] {
        return ticksFromValues([domainMin]);
      },
    };
  }
  // Inside the linear region, cancel the threshold algebraically. This keeps adjacent
  // finite values distinct even when value/threshold would underflow or round together.
  const entirelyLinear = domainMin >= -threshold && domainMax <= threshold;
  const linear = entirelyLinear ? linearScale(domainMin, domainMax, rangeMin, rangeMax) : undefined;
  const span = entirelyLinear ? 1 : symlogDistance(domainMin, domainMax, threshold);
  if (!(span > 0) || !Number.isFinite(span)) {
    throw new Error('symlog scale domain is unrepresentable at binary64 resolution');
  }
  return {
    domainMin,
    domainMax,
    rangeMin,
    rangeMax,
    transform: 'symlog',
    map(value: number): number {
      if (!Number.isFinite(value)) return NaN;
      if (value === domainMin) return rangeMin;
      if (value === domainMax) return rangeMax;
      if (linear) return linear.map(value);
      return rangeMin + (symlogDistance(domainMin, value, threshold) / span) * rangeSpan;
    },
    ticks(target = 6): readonly Tick[] {
      if (linear) return linearTicks(domainMin, domainMax, target);
      const values: number[] = [domainMin, domainMax];
      if (domainMin < -threshold) {
        const closest = Math.max(domainMin, Math.min(domainMax, -threshold));
        for (const tick of logarithmicTicks(Math.abs(closest), Math.abs(domainMin), target)) {
          values.push(-tick.value);
        }
      }
      const innerMin = Math.max(domainMin, -threshold);
      const innerMax = Math.min(domainMax, threshold);
      if (innerMin <= innerMax) values.push(...linearTicks(innerMin, innerMax, target).map((tick) => tick.value));
      if (domainMax > threshold) {
        const first = Math.max(domainMin, threshold);
        for (const tick of logarithmicTicks(first, domainMax, target)) values.push(tick.value);
      }
      for (const special of [-threshold, 0, threshold]) {
        if (special >= domainMin && special <= domainMax) values.push(special);
      }
      values.sort((a, b) => a - b);
      const unique: number[] = [];
      for (const value of values) {
        if (unique.length === 0 || value !== unique[unique.length - 1]) unique.push(value);
      }
      return ticksFromValues(unique);
    },
  };
}

/** A "nice" step at or above the raw step: 1, 2, or 5 times a power of ten. */
function niceStep(rawStep: number): number {
  if (rawStep <= 0 || !Number.isFinite(rawStep)) return 1;
  const exponentText = rawStep.toExponential().split('e')[1];
  const exponent = Number(exponentText);
  const magnitude = Number(`1e${exponent}`) || Number.MIN_VALUE;
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

function ticksFromValues(values: readonly number[]): Tick[] {
  const unique: number[] = [];
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (unique.length === 0 || value !== unique[unique.length - 1]) unique.push(value === 0 ? 0 : value);
  }
  let labels = unique.map((value) => formatNumber(value));
  if (new Set(labels).size !== labels.length) labels = unique.map((value) => formatNumber(value, 17));
  return unique.map((value, index) => ({ value, label: labels[index] }));
}

function decimalPower(exponent: number): number {
  return Number(`1e${exponent}`);
}

function decimalExponent(value: number): number {
  return Number(value.toExponential().split('e')[1]);
}

/** Deterministic power-of-ten ticks, with endpoints when a narrow decade has none. */
export function logarithmicTicks(min: number, max: number, target = 6): Tick[] {
  if (
    !(min > 0) ||
    !(max > 0) ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max < min ||
    !Number.isFinite(target) ||
    !(target > 0)
  ) return [];
  if (min === max) return ticksFromValues([min]);
  let first = decimalExponent(min);
  if (!(decimalPower(first) >= min)) first++;
  let last = decimalExponent(max);
  if (!(decimalPower(last) <= max)) last--;
  const count = Math.max(0, last - first + 1);
  const step = Math.max(1, Math.ceil(count / Math.max(1, target)));
  const values: number[] = [];
  for (let exponent = first, guard = 0; exponent <= last && guard < 1000; exponent += step, guard++) {
    const value = decimalPower(exponent);
    if (Number.isFinite(value) && value >= min && value <= max) values.push(value);
  }
  if (values.length < 2) values.push(min, max);
  values.sort((a, b) => a - b);
  return ticksFromValues(values);
}

/**
 * Generate approximately `target` round intervals spanning [min, max].
 *
 * Deterministic: the same domain always yields the same ticks, because the step is a
 * pure function of the domain and the target count.
 */
export function linearTicks(min: number, max: number, target = 6): Tick[] {
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max < min ||
    !Number.isFinite(target) ||
    !(target > 0)
  ) return [];
  if (min === max) {
    return ticksFromValues([min]);
  }

  const span = max - min;
  if (!Number.isFinite(span)) {
    const values = [min, ...(min < 0 && max > 0 ? [0] : []), max];
    return ticksFromValues(values);
  }

  const rawStep = span / Math.max(1, target);
  const step = niceStep(rawStep);
  const start = Math.ceil(min / step) * step;

  if (!Number.isFinite(start)) {
    return ticksFromValues([min, max]);
  }

  const ticks: Tick[] = [];
  // Cap the loop hard so a pathological domain cannot generate unbounded ticks.
  for (let value = start, guard = 0; value <= max + step * 1e-9 && guard < 1000; guard++) {
    // Snap to the step grid to remove accumulated binary64 drift, so labels read as
    // round numbers (0, 5, 10) rather than (0, 4.9999999, 10.0000001).
    const snapped = Math.round(value / step) * step;
    if (
      Number.isFinite(snapped) &&
      snapped >= min &&
      snapped <= max &&
      (ticks.length === 0 || snapped !== ticks[ticks.length - 1].value)
    ) {
      ticks.push({ value: snapped, label: formatNumber(snapped) });
    }
    const next = value + step;
    if (next === value || !Number.isFinite(next)) break;
    value = next;
  }

  return ticks.length > 1
    ? ticksFromValues(ticks.map((tick) => tick.value))
    : ticksFromValues([min, max]);
}
