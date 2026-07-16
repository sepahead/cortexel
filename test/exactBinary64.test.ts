import { describe, expect, it } from 'vitest';

import {
  binary64RelativeDifferenceWithinEpsilons,
  exactBinary64AffineFraction,
  exactBinary64Mean,
  exactBinary64MultiplyByRational,
  exactBinary64RatioToMean,
  exactBinary64Sum,
  exactBinary64SumUnits,
  exactRationalToBinary64,
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

  it('correctly rounds exact affine fractions over opposite finite extremes', () => {
    expect(exactBinary64AffineFraction(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE)).toBe(0);
    expect(exactBinary64AffineFraction(0, -Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE)).toBe(0.5);
    expect(exactBinary64AffineFraction(Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE)).toBe(1);
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
});
