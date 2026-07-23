import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  binary64RelativeDifferenceWithinEpsilons,
  exactBinary64AffineFraction,
  exactBinary64EmpiricalQuantileType7,
  exactBinary64Mean,
  exactBinary64MultiplyByRational,
  exactBinary64RatioToDifference,
  exactBinary64RatioToMean,
  exactBinary64SampleStandardDeviation,
  exactBinary64SampleStandardError,
  exactBinary64Sum,
  exactBinary64SumUnits,
  exactBinary64WeightedMean,
  exactBinary64WeightedSum,
  exactRationalToBinary64,
  floorExactBinary64TimesSafeInteger,
  isRoundedMeanOfSafeNonnegativeIntegers,
  roundedBinary64Mean,
} from '../src/core/exact-binary64.js';

describe('exact binary64 arithmetic', () => {
  it('accumulates before rounding and is invariant under permutation', () => {
    const values = [1e16, 1, -1e16];
    expect(exactBinary64Mean(values)).toBe(1 / 3);
    expect(exactBinary64Mean([...values].reverse())).toBe(exactBinary64Mean(values));
    expect(exactBinary64Sum(values)).toBe(1);
    expect(exactBinary64Sum([Number.MAX_VALUE, -Number.MAX_VALUE])).toBe(0);
  });

  it('distinguishes an exact nonzero mean from its rounded metadata value', () => {
    const values = [Number.MIN_VALUE, -Number.MIN_VALUE, Number.MIN_VALUE];
    expect(roundedBinary64Mean(values)).toBe(0);
    expect(() => exactBinary64Mean(values)).toThrow(/underflows/);
    const sumUnits = exactBinary64SumUnits(values);
    expect(sumUnits).toBe('1');
    expect(values.map((value) => exactBinary64RatioToMean(value, sumUnits, values.length))).toEqual([
      3,
      -3,
      3,
    ]);
  });

  it('evaluates empirical Type-7 quantiles on the exact probability lattice', () => {
    expect(exactBinary64EmpiricalQuantileType7(
      [-Number.MAX_VALUE, Number.MAX_VALUE],
      0.5,
    )).toBe(0);

    // Binary64 1/3 is just below mathematical 1/3. Native multiplication rounds
    // 3*p up to 1 and chooses index 1; the exact lattice position remains in bin 0.
    const probability = 1 / 3;
    expect(3 * probability).toBe(1);
    expect(exactBinary64EmpiricalQuantileType7(
      [-Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE],
      probability,
    )).toBe(1.7976931348623155e+308);

    expect(exactBinary64EmpiricalQuantileType7([3, 1, 2], 0)).toBe(1);
    expect(exactBinary64EmpiricalQuantileType7([3, 1, 2], 0.5)).toBe(2);
    expect(exactBinary64EmpiricalQuantileType7([3, 1, 2], 1)).toBe(3);
    expect(exactBinary64EmpiricalQuantileType7([-0], 0.75)).toBe(0);
  });

  it('keeps Type-7 quantiles permutation-invariant and monotone on a bounded lattice', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: -1_000_000, max: 1_000_000 }), {
        minLength: 1,
        maxLength: 24,
      }),
      fc.constantFrom(0, 0.125, 0.25, 0.5, 0.75, 0.875, 1),
      (values, probability) => {
        const quantile = exactBinary64EmpiricalQuantileType7(values, probability);
        expect(exactBinary64EmpiricalQuantileType7([...values].reverse(), probability))
          .toBe(quantile);
        expect(exactBinary64EmpiricalQuantileType7(
          values.map((value) => value + 2 ** 40),
          probability,
        )).toBe(quantile + 2 ** 40);
        expect(quantile).toBeGreaterThanOrEqual(Math.min(...values));
        expect(quantile).toBeLessThanOrEqual(Math.max(...values));
      },
    ), { numRuns: 256 });

    const values = [-9, -2, 0, 7, 100];
    const probabilities = [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1];
    const quantiles = probabilities.map((probability) =>
      exactBinary64EmpiricalQuantileType7(values, probability));
    expect(quantiles).toEqual([...quantiles].sort((left, right) => left - right));
  });

  it('refuses invalid or non-representable Type-7 quantiles', () => {
    expect(() => exactBinary64EmpiricalQuantileType7([], 0.5)).toThrow(/at least one/);
    expect(() => exactBinary64EmpiricalQuantileType7([1], -0.1)).toThrow(/\[0, 1\]/);
    expect(() => exactBinary64EmpiricalQuantileType7([1], Number.NaN)).toThrow(/finite/);
    expect(() => exactBinary64EmpiricalQuantileType7([1, Number.POSITIVE_INFINITY], 0.5))
      .toThrow(/finite values/);
    expect(() => exactBinary64EmpiricalQuantileType7([0, Number.MIN_VALUE], 0.5))
      .toThrow(/underflows to zero/);
    expect(exactBinary64EmpiricalQuantileType7([0, Number.MIN_VALUE], 0.75))
      .toBe(Number.MIN_VALUE);
  });

  it('computes a correctly rounded finite sample standard deviation at extreme scale', () => {
    expect(exactBinary64SampleStandardDeviation([1, 2, 3])).toBe(1);
    expect(exactBinary64SampleStandardDeviation([7, 7])).toBe(0);
    expect(exactBinary64SampleStandardDeviation([-1e308, 1e308]))
      .toBe(1.4142135623730951e+308);
    expect(exactBinary64SampleStandardDeviation([0, Number.MIN_VALUE]))
      .toBe(Number.MIN_VALUE);

    const largeOrigin = [1e308, 1.0000000000000002e308, 1.0000000000000004e308];
    const largeOriginResult = exactBinary64SampleStandardDeviation(largeOrigin);
    expect(Number.isFinite(largeOriginResult)).toBe(true);
    expect(largeOriginResult).toBeGreaterThan(0);
    expect(exactBinary64SampleStandardDeviation([...largeOrigin].reverse()))
      .toBe(largeOriginResult);
  });

  it('keeps sample standard deviation translation-, scale-, and permutation-invariant', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: -1_000_000, max: 1_000_000 }), {
        minLength: 2,
        maxLength: 32,
      }),
      (values) => {
        const deviation = exactBinary64SampleStandardDeviation(values);
        expect(exactBinary64SampleStandardDeviation([...values].reverse())).toBe(deviation);
        expect(exactBinary64SampleStandardDeviation(
          values.map((value) => value + 2 ** 40),
        )).toBe(deviation);
        expect(exactBinary64SampleStandardDeviation(values.map((value) => value * 2)))
          .toBe(deviation * 2);
      },
    ), { numRuns: 256 });
  });

  it('refuses undefined, non-finite, underflowing, and overflowing sample deviations', () => {
    expect(() => exactBinary64SampleStandardDeviation([1])).toThrow(/at least two/);
    expect(() => exactBinary64SampleStandardDeviation([1, Number.NaN])).toThrow(/finite/);
    expect(() => exactBinary64SampleStandardDeviation([
      0,
      Number.MIN_VALUE,
      Number.MIN_VALUE,
      Number.MIN_VALUE,
    ])).toThrow(/underflows to zero/);
    expect(() => exactBinary64SampleStandardDeviation([
      -Number.MAX_VALUE,
      Number.MAX_VALUE,
    ])).toThrow(/overflows/);
  });

  it('computes sample standard error directly from the exact variance', () => {
    expect(exactBinary64SampleStandardError([1, 2, 3]))
      .toBe(0.5773502691896257);
    expect(exactBinary64SampleStandardError([7, 7, 7])).toBe(0);

    // The sample SD is sqrt(2) * MAX_VALUE and is not finite, while division by
    // sqrt(n) in the exact radicand makes the standard error exactly MAX_VALUE.
    const oppositeExtremes = [-Number.MAX_VALUE, Number.MAX_VALUE];
    expect(() => exactBinary64SampleStandardDeviation(oppositeExtremes))
      .toThrow(/overflows/);
    expect(exactBinary64SampleStandardError(oppositeExtremes))
      .toBe(Number.MAX_VALUE);

    // sqrt(1/4) of one minimum-subnormal unit is the exact halfway-to-zero tie.
    expect(() => exactBinary64SampleStandardError([0, Number.MIN_VALUE]))
      .toThrow(/underflows to zero/);
    expect(exactBinary64SampleStandardError([0, 2 * Number.MIN_VALUE]))
      .toBe(Number.MIN_VALUE);
  });

  it('keeps sample standard error translation-, scale-, and permutation-invariant', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: -1_000_000, max: 1_000_000 }), {
        minLength: 2,
        maxLength: 32,
      }),
      (values) => {
        const standardError = exactBinary64SampleStandardError(values);
        expect(exactBinary64SampleStandardError([...values].reverse()))
          .toBe(standardError);
        expect(exactBinary64SampleStandardError(
          values.map((value) => value + 2 ** 40),
        )).toBe(standardError);
        expect(exactBinary64SampleStandardError(values.map((value) => value * 2)))
          .toBe(standardError * 2);
        expect(standardError)
          .toBeLessThanOrEqual(exactBinary64SampleStandardDeviation(values));
      },
    ), { numRuns: 256 });
  });

  it('refuses undefined and non-finite standard errors', () => {
    expect(() => exactBinary64SampleStandardError([1])).toThrow(/at least two/);
    expect(() => exactBinary64SampleStandardError([1, Number.NaN])).toThrow(/finite/);
  });

  it('correctly rounds exact affine fractions over opposite finite extremes', () => {
    expect(exactBinary64AffineFraction(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE)).toBe(0);
    expect(exactBinary64AffineFraction(0, -Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE)).toBe(0.5);
    expect(exactBinary64AffineFraction(Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE)).toBe(1);
  });

  it('forms weighted aggregates from exact products before the one final rounding', () => {
    const subnormalWeights = [Number.MIN_VALUE, Number.MIN_VALUE];
    expect(exactBinary64WeightedMean([0.5, 1], subnormalWeights)).toBe(0.75);
    expect(exactBinary64WeightedSum([0.5, 1], subnormalWeights)).toBe(
      2 * Number.MIN_VALUE,
    );

    // Both products overflow natively, but their exact cancellation leaves a finite
    // weighted sum and mean. Input permutation cannot change either result.
    const values = [Number.MAX_VALUE, -Number.MAX_VALUE, 1];
    const weights = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
    expect(exactBinary64WeightedSum(values, weights)).toBe(Number.MAX_VALUE);
    expect(exactBinary64WeightedMean(values, weights)).toBe(1 / 3);
    expect(exactBinary64WeightedSum([...values].reverse(), [...weights].reverse())).toBe(
      Number.MAX_VALUE,
    );
    expect(exactBinary64WeightedMean([...values].reverse(), [...weights].reverse())).toBe(
      1 / 3,
    );
  });

  it('keeps weighted means invariant across representable common weight scales', () => {
    const values = [0.5, 1, 2];
    const ratios = [1, 2, 4];
    const expected = 1.5;
    for (const scale of [Number.MIN_VALUE, 2 ** -500, 1, 2 ** 500]) {
      const weights = ratios.map((ratio) => ratio * scale);
      expect(exactBinary64WeightedMean(values, weights)).toBe(expected);
      expect(exactBinary64WeightedMean(
        [values[2], values[0], values[1]],
        [weights[2], weights[0], weights[1]],
      )).toBe(expected);
    }
    expect(() => exactBinary64WeightedSum([Number.MIN_VALUE], [Number.MIN_VALUE]))
      .toThrow(/underflows to zero/);
  });

  it('matches the exact rational weighted formula on a bounded integer lattice', () => {
    for (let left = -4; left <= 4; left++) {
      for (let right = -4; right <= 4; right++) {
        for (let leftWeight = 1; leftWeight <= 4; leftWeight++) {
          for (let rightWeight = 1; rightWeight <= 4; rightWeight++) {
            const numerator = BigInt(left * leftWeight + right * rightWeight);
            const denominator = BigInt(leftWeight + rightWeight);
            const expectedMean = exactRationalToBinary64(numerator, denominator);
            const expectedSum = Number(numerator);
            expect(exactBinary64WeightedMean(
              [left, right],
              [leftWeight, rightWeight],
            )).toBe(expectedMean);
            expect(exactBinary64WeightedMean(
              [right, left],
              [rightWeight, leftWeight],
            )).toBe(expectedMean);
            expect(exactBinary64WeightedSum(
              [left, right],
              [leftWeight, rightWeight],
            )).toBe(expectedSum);
          }
        }
      }
    }
  });

  it('divides by exact binary64 endpoint differences without overflowing the span', () => {
    expect(exactBinary64RatioToDifference(1e308, -1e308, 1e308)).toBe(0.5);
    expect(exactBinary64RatioToDifference(1, -1e308, 1e308)).toBeGreaterThan(0);
    expect(exactBinary64RatioToDifference(
      Number.MIN_VALUE,
      0,
      2 * Number.MIN_VALUE,
    )).toBe(0.5);
    expect(() => exactBinary64RatioToDifference(Number.MAX_VALUE, 0, Number.MIN_VALUE))
      .toThrow(/overflows/);
    for (const exponent of [-1074, -1000, -500, 0, 500, 1023]) {
      const magnitude = 2 ** exponent;
      expect(exactBinary64RatioToDifference(
        magnitude,
        -magnitude,
        magnitude,
      )).toBe(0.5);
    }
  });

  it('applies the published epsilon bound as an exact integer inequality', () => {
    const declared = 4.765722808368112e-185;
    const justOutside = 4.7657228083681035e-185;
    expect(binary64RelativeDifferenceWithinEpsilons(declared, justOutside, 8)).toBe(false);
    expect(binary64RelativeDifferenceWithinEpsilons(declared, declared, 0)).toBe(true);
    expect(binary64RelativeDifferenceWithinEpsilons(0, Number.MIN_VALUE, 8)).toBe(false);
  });

  it('rounds ties to even at subnormal, unit, and overflow boundaries', () => {
    expect(exactRationalToBinary64(1n, 1n, -1075)).toBe(0);
    expect(exactRationalToBinary64(3n, 1n, -1075)).toBe(2 * Number.MIN_VALUE);
    expect(exactRationalToBinary64((1n << 53n) + 1n, 1n << 53n)).toBe(1);
    expect(exactRationalToBinary64((1n << 53n) + 3n, 1n << 53n)).toBe(1 + 2 ** -51);
    expect(() => exactRationalToBinary64(
      (1n << 1024n) - (1n << 970n),
      1n,
    )).toThrow(/overflows/);
    expect(exactBinary64MultiplyByRational(161556.8363554151, 1n, 1000n)).toBe(
      161.55683635541507,
    );
  });

  it('decides the exact safe-integer mean lattice without inventing observations', () => {
    expect(isRoundedMeanOfSafeNonnegativeIntegers(3.5, 2)).toBe(true);
    expect(isRoundedMeanOfSafeNonnegativeIntegers(1 / 3, 3)).toBe(true);
    expect(isRoundedMeanOfSafeNonnegativeIntegers(Math.PI, 9)).toBe(false);
    expect(isRoundedMeanOfSafeNonnegativeIntegers(3.5, 1)).toBe(false);
    expect(isRoundedMeanOfSafeNonnegativeIntegers(Number.MAX_SAFE_INTEGER + 1, 2)).toBe(false);
    for (let count = 1; count <= 20; count++) {
      for (const total of [0, 1, count - 1, count, count * 17 + 3]) {
        const rounded = exactRationalToBinary64(BigInt(total), BigInt(count));
        expect(isRoundedMeanOfSafeNonnegativeIntegers(rounded, count)).toBe(true);
      }
    }
  });

  it('floors integer products of the declared binary64 value without a rounded multiply', () => {
    const belowOneThird = 0.3333333333333333;
    expect(3 * belowOneThird).toBe(1);
    expect(floorExactBinary64TimesSafeInteger(belowOneThird, 3)).toBe(0);
    expect(floorExactBinary64TimesSafeInteger(0.2, 5)).toBe(1);
  });
});
