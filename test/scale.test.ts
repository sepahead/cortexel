import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  linearScale,
  linearTicks,
  logarithmicTicks,
  logNumericScale,
  symlogInverse,
  symlogNumericScale,
  symlogTransform,
} from '../src/render/scale.js';
import {
  deterministicExp,
  deterministicLog,
  deterministicLogOnePlus,
  deterministicPositiveLogRatio,
} from '../src/core/deterministic-transcendentals.js';

const bits = new DataView(new ArrayBuffer(8));

function nextUp(value: number): number {
  if (value === Infinity) return Infinity;
  if (value === 0) return Number.MIN_VALUE;
  bits.setFloat64(0, value, false);
  let encoded = bits.getBigUint64(0, false);
  encoded += value > 0 ? 1n : -1n;
  bits.setBigUint64(0, encoded, false);
  return bits.getFloat64(0, false);
}

describe('linear render scales', () => {
  it('maps the full finite binary64 domain without overflowing its span', () => {
    const scale = linearScale(-Number.MAX_VALUE, Number.MAX_VALUE, 0, 100);
    expect(scale.map(-Number.MAX_VALUE)).toBe(0);
    expect(scale.map(0)).toBe(50);
    expect(scale.map(Number.MAX_VALUE)).toBe(100);
    expect(linearTicks(-Number.MAX_VALUE, Number.MAX_VALUE).map((tick) => tick.value)).toEqual([
      -Number.MAX_VALUE,
      0,
      Number.MAX_VALUE,
    ]);
  });

  it('centres an extreme constant without inventing an overflowing numeric extent', () => {
    const scale = linearScale(Number.MAX_VALUE, Number.MAX_VALUE, 10, 90);
    expect(scale.domainMin).toBe(Number.MAX_VALUE);
    expect(scale.domainMax).toBe(Number.MAX_VALUE);
    expect(scale.map(Number.MAX_VALUE)).toBe(50);
    expect(linearTicks(scale.domainMin, scale.domainMax)).toEqual([
      { value: Number.MAX_VALUE, label: '1.79769e+308' },
    ]);
    expect(Number.isNaN(scale.map(NaN))).toBe(true);
    expect(Number.isNaN(scale.map(Infinity))).toBe(true);
  });

  it('preserves finite range endpoints exactly even for a highly asymmetric reversed range', () => {
    const scale = linearScale(0, 1, 1e300, 1);
    expect(scale.map(0)).toBe(1e300);
    expect(scale.map(1)).toBe(1);
    expect(Number.isNaN(scale.map(NaN))).toBe(true);
    expect(linearTicks(10, 1)).toEqual([]);
    expect(linearTicks(0, 1, 0)).toEqual([]);
  });
});

describe('nonlinear render scales', () => {
  it('maps decades to equal distances and rejects non-positive logarithmic domains', () => {
    const scale = logNumericScale(1, 1000, 0, 300);
    expect(scale.map(1)).toBeCloseTo(0, 12);
    expect(scale.map(10)).toBeCloseTo(100, 12);
    expect(scale.map(100)).toBeCloseTo(200, 12);
    expect(scale.map(1000)).toBeCloseTo(300, 12);
    expect(scale.ticks().map((tick) => tick.value)).toEqual([1, 10, 100, 1000]);
    expect(() => logNumericScale(0, 10, 0, 100)).toThrow(/strictly positive/);
    expect(() => logNumericScale(-1, 10, 0, 100)).toThrow(/strictly positive/);
  });

  it('uses the contract-owned C1 piecewise symlog transform', () => {
    const threshold = 2;
    expect(symlogTransform(-threshold, threshold)).toBe(-1);
    expect(symlogTransform(0, threshold)).toBe(0);
    expect(symlogTransform(threshold, threshold)).toBe(1);
    expect(symlogTransform(Math.E * threshold, threshold)).toBeCloseTo(2, 15);
    expect(symlogTransform(-Math.E * threshold, threshold)).toBeCloseTo(-2, 15);

    const epsilon = 1e-7;
    const leftDerivative = (
      symlogTransform(threshold, threshold) -
      symlogTransform(threshold - epsilon, threshold)
    ) / epsilon;
    const rightDerivative = (
      symlogTransform(threshold + epsilon, threshold) -
      symlogTransform(threshold, threshold)
    ) / epsilon;
    expect(leftDerivative).toBeCloseTo(1 / threshold, 6);
    expect(rightDerivative).toBeCloseTo(1 / threshold, 6);
  });

  it('round-trips finite values and remains monotone', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -1e100, max: 1e100, noNaN: true, noDefaultInfinity: true }), {
          minLength: 2,
          maxLength: 30,
        }),
        (values) => {
          const threshold = 0.25;
          const ordered = [...values].sort((a, b) => a - b);
          const transformed = ordered.map((value) => symlogTransform(value, threshold));
          for (let index = 1; index < transformed.length; index++) {
            expect(transformed[index]).toBeGreaterThanOrEqual(transformed[index - 1]);
          }
          for (let index = 0; index < ordered.length; index++) {
            const recovered = symlogInverse(transformed[index], threshold);
            const scale = Math.max(1, Math.abs(ordered[index]));
            // log/exp round-trip error grows with the transformed exponent; this bound
            // is below 1e-13 across the declared finite test domain.
            expect(Math.abs(recovered - ordered[index]) / scale).toBeLessThan(1e-13);
          }
        },
      ),
      { numRuns: 500 },
    );

    const scale = symlogNumericScale(-100, 100, 0, 200, 2);
    expect(scale.transform).toBe('symlog');
    expect(scale.map(-100)).toBeCloseTo(0, 12);
    expect(scale.map(0)).toBeCloseTo(100, 12);
    expect(scale.map(100)).toBeCloseTo(200, 12);
  });

  it('does not overflow the symlog ratio at opposite binary64 extremes', () => {
    const threshold = Number.MIN_VALUE;
    const transformed = symlogTransform(Number.MAX_VALUE, threshold);
    expect(Number.isFinite(transformed)).toBe(true);
    const recovered = symlogInverse(transformed, threshold);
    expect(Number.isFinite(recovered)).toBe(true);
    expect(recovered / Number.MAX_VALUE).toBeCloseTo(1, 12);

    const scale = symlogNumericScale(-Number.MAX_VALUE, Number.MAX_VALUE, 0, 100, threshold);
    expect(scale.map(-Number.MAX_VALUE)).toBeCloseTo(0, 12);
    expect(scale.map(0)).toBeCloseTo(50, 12);
    expect(scale.map(Number.MAX_VALUE)).toBeCloseTo(100, 12);
    expect(scale.ticks().every((tick) => Number.isFinite(tick.value))).toBe(true);
  });

  it('pins the contract-owned fdlibm low bits and special cases', () => {
    expect(deterministicLog(2)).toBe(0.6931471805599453);
    expect(deterministicLog(Number.MIN_VALUE)).toBe(-744.4400719213812);
    expect(deterministicLog(0)).toBe(-Infinity);
    expect(Number.isNaN(deterministicLog(-1))).toBe(true);
    expect(deterministicLog(Infinity)).toBe(Infinity);

    expect(deterministicLogOnePlus(Number.EPSILON)).toBe(2.2204460492503128e-16);
    expect(deterministicLogOnePlus(1)).toBe(0.6931471805599453);
    expect(Number.isNaN(deterministicLogOnePlus(-0.5))).toBe(true);

    expect(deterministicExp(1)).toBe(2.7182818284590455);
    expect(deterministicExp(709.782712893384)).toBe(1.7976931348622732e308);
    expect(deterministicExp(709.7827128933841)).toBe(Infinity);
    expect(deterministicExp(-745.1332191019411)).toBe(Number.MIN_VALUE);
    expect(deterministicExp(-745.1332191019412)).toBe(0);
  });

  it('keeps positive log ratios monotone across the former branch reversal', () => {
    const smaller = 9.808157590553715e307;
    const first = 1.7560604248794206e308;
    const second = 1.7560604248794208e308;
    expect(deterministicPositiveLogRatio(second, smaller)).toBeGreaterThanOrEqual(
      deterministicPositiveLogRatio(first, smaller),
    );
    expect(deterministicPositiveLogRatio(2 * Number.MIN_VALUE, Number.MIN_VALUE)).toBe(
      0.6931471805599453,
    );
  });

  it('refuses materially lossy inner symlog values and bounds the outer fallback', () => {
    const threshold = 4.9791688925673634e89;
    expect(Number.isNaN(symlogTransform(1.7395649968693386e-234, threshold))).toBe(true);

    const tinyThreshold = 1e-100;
    const maximumTransform = symlogTransform(Number.MAX_VALUE, tinyThreshold);
    expect(symlogInverse(maximumTransform, tinyThreshold)).toBe(Number.MAX_VALUE);
    expect(symlogInverse(nextUp(maximumTransform), tinyThreshold)).toBe(Infinity);

    const fallbackThreshold = 9.407920371822056e-222;
    const value = 2.567006430606439e230;
    const recovered = symlogInverse(symlogTransform(value, fallbackThreshold), fallbackThreshold);
    expect(Math.abs(recovered - value) / value).toBeLessThan(2.1e-13);
  });

  it('keeps nonlinear endpoint maps exact and narrow tick labels unique', () => {
    const log = logNumericScale(1, 1000, 1e300, 1);
    expect(log.map(1)).toBe(1e300);
    expect(log.map(1000)).toBe(1);
    expect(Number.isNaN(log.map(NaN))).toBe(true);

    const symlog = symlogNumericScale(-100, 100, 1e300, 1, 2);
    expect(symlog.map(-100)).toBe(1e300);
    expect(symlog.map(100)).toBe(1);
    expect(Number.isNaN(symlog.map(NaN))).toBe(true);

    const adjacent = logarithmicTicks(1, nextUp(1));
    expect(adjacent.map((tick) => tick.value)).toEqual([1, nextUp(1)]);
    expect(new Set(adjacent.map((tick) => tick.label)).size).toBe(adjacent.length);
    expect(logarithmicTicks(10, 1)).toEqual([]);
  });
});
