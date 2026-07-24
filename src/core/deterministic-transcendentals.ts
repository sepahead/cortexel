/**
 * Contract-owned binary64 logarithm/exponential kernels.
 *
 * ECMAScript specifies Math.log/Math.exp as implementation-approximated values, so their
 * low bits are not a portable authority for normative SVG coordinates or hashes. These
 * routines are a TypeScript port of fdlibm's IEEE-754 kernels and use only specified
 * binary64 arithmetic plus explicit bit manipulation.
 *
 * Copyright (C) 1993-2004 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft. Permission to use, copy, modify, and distribute this software is
 * freely granted, provided that this notice is preserved.
 */

const bits = new DataView(new ArrayBuffer(8));

function highWord(value: number): number {
  bits.setFloat64(0, value, false);
  return bits.getUint32(0, false);
}

function withHighWord(value: number, high: number): number {
  bits.setFloat64(0, value, false);
  bits.setUint32(0, high >>> 0, false);
  return bits.getFloat64(0, false);
}

const LN2_HI = 6.93147180369123816490e-1;
const LN2_LO = 1.90821492927058770002e-10;
const TWO54 = 1.80143985094819840000e16;
const LOG_COEFFICIENTS = [
  6.666666666666735130e-1,
  3.999999999940941908e-1,
  2.857142874366239149e-1,
  2.222219843214978396e-1,
  1.818357216161805012e-1,
  1.531383769920937332e-1,
  1.479819860511658591e-1,
] as const;

/** Deterministic fdlibm natural logarithm, with the usual IEEE special values. */
export function deterministicLog(value: number): number {
  if (Number.isNaN(value)) return NaN;
  if (value === 0) return -Infinity;
  if (value < 0) return NaN;
  if (value === Infinity) return Infinity;

  let x = value;
  let hx = highWord(x);
  let k = 0;
  if (hx < 0x00100000) {
    k -= 54;
    x *= TWO54;
    hx = highWord(x);
  }
  k += (hx >>> 20) - 1023;
  hx &= 0x000fffff;
  const i = (hx + 0x95f64) & 0x100000;
  x = withHighWord(x, hx | (i ^ 0x3ff00000));
  k += i >>> 20;
  const f = x - 1;
  if (((2 + hx) & 0x000fffff) < 3) {
    if (f === 0) return k === 0 ? 0 : k * LN2_HI + k * LN2_LO;
    const correction = f * f * (0.5 - 0.33333333333333333 * f);
    return k === 0
      ? f - correction
      : k * LN2_HI - ((correction - k * LN2_LO) - f);
  }

  const s = f / (2 + f);
  const z = s * s;
  const w = z * z;
  const [lg1, lg2, lg3, lg4, lg5, lg6, lg7] = LOG_COEFFICIENTS;
  const t1 = w * (lg2 + w * (lg4 + w * lg6));
  const t2 = z * (lg1 + w * (lg3 + w * (lg5 + w * lg7)));
  const remainder = t2 + t1;
  const branch = ((hx - 0x6147a) | (0x6b851 - hx)) > 0;
  if (branch) {
    const halfSquare = 0.5 * f * f;
    return k === 0
      ? f - (halfSquare - s * (halfSquare + remainder))
      : k * LN2_HI - ((halfSquare - (s * (halfSquare + remainder) + k * LN2_LO)) - f);
  }
  return k === 0
    ? f - s * (f - remainder)
    : k * LN2_HI - ((s * (f - remainder) - k * LN2_LO) - f);
}

const EXP_OVERFLOW_THRESHOLD = 7.09782712893383973096e2;
const EXP_UNDERFLOW_THRESHOLD = -7.45133219101941108420e2;
const INV_LN2 = 1.44269504088896338700;
const TWO_MINUS_1000 = 9.33263618503218878990e-302;
const EXP_COEFFICIENTS = [
  1.66666666666666019037e-1,
  -2.77777777770155933842e-3,
  6.61375632143793436117e-5,
  -1.65339022054652515390e-6,
  4.13813679705723846039e-8,
] as const;

/** Deterministic fdlibm exponential, with the usual IEEE special values. */
export function deterministicExp(value: number): number {
  if (Number.isNaN(value)) return NaN;
  if (value === Infinity) return Infinity;
  if (value === -Infinity) return 0;
  if (value > EXP_OVERFLOW_THRESHOLD) return Infinity;
  if (value < EXP_UNDERFLOW_THRESHOLD) return 0;

  let x = value;
  const absoluteHigh = highWord(x) & 0x7fffffff;
  const negative = (highWord(x) >>> 31) === 1;
  let k = 0;
  let hi = 0;
  let lo = 0;
  if (absoluteHigh > 0x3fd62e42) {
    if (absoluteHigh < 0x3ff0a2b2) {
      hi = x - (negative ? -LN2_HI : LN2_HI);
      lo = negative ? -LN2_LO : LN2_LO;
      k = negative ? -1 : 1;
    } else {
      k = Math.trunc(INV_LN2 * x + (negative ? -0.5 : 0.5));
      hi = x - k * LN2_HI;
      lo = k * LN2_LO;
    }
    x = hi - lo;
  } else if (absoluteHigh < 0x3e300000) {
    return 1 + x;
  }

  const square = x * x;
  const [p1, p2, p3, p4, p5] = EXP_COEFFICIENTS;
  const correction = x - square * (p1 + square * (p2 + square * (p3 + square * (p4 + square * p5))));
  if (k === 0) return 1 - ((x * correction) / (correction - 2) - x);
  let y = 1 - ((lo - (x * correction) / (2 - correction)) - hi);
  if (k >= -1021) {
    y = withHighWord(y, highWord(y) + k * 0x100000);
    return y;
  }
  y = withHighWord(y, highWord(y) + (k + 1000) * 0x100000);
  return y * TWO_MINUS_1000;
}

/** Deterministic fdlibm log1p for a finite non-negative input. */
export function deterministicLogOnePlus(delta: number): number {
  if (Number.isNaN(delta) || delta < 0) return NaN;
  if (delta === Infinity) return Infinity;

  const hx = highWord(delta);
  const absoluteHigh = hx & 0x7fffffff;
  let k = 1;
  let f = 0;
  let correction = 0;
  let reducedHigh = 0;

  if (hx < 0x3fda827a) {
    if (absoluteHigh < 0x3e200000) {
      if (absoluteHigh < 0x3c900000) return delta;
      return delta - delta * delta * 0.5;
    }
    k = 0;
    f = delta;
    reducedHigh = 1;
  }

  if (k !== 0) {
    let u: number;
    if (absoluteHigh < 0x43400000) {
      u = 1 + delta;
      reducedHigh = highWord(u);
      k = (reducedHigh >>> 20) - 1023;
      correction = k > 0 ? 1 - (u - delta) : delta - (u - 1);
      correction /= u;
    } else {
      u = delta;
      reducedHigh = highWord(u);
      k = (reducedHigh >>> 20) - 1023;
    }
    reducedHigh &= 0x000fffff;
    if (reducedHigh < 0x6a09e) {
      u = withHighWord(u, reducedHigh | 0x3ff00000);
    } else {
      k++;
      u = withHighWord(u, reducedHigh | 0x3fe00000);
      reducedHigh = (0x00100000 - reducedHigh) >>> 2;
    }
    f = u - 1;
  }

  const halfSquare = 0.5 * f * f;
  if (reducedHigh === 0) {
    if (f === 0) {
      if (k === 0) return 0;
      correction += k * LN2_LO;
      return k * LN2_HI + correction;
    }
    const remainder = halfSquare * (1 - 0.66666666666666666 * f);
    return k === 0
      ? f - remainder
      : k * LN2_HI - ((remainder - (k * LN2_LO + correction)) - f);
  }

  const s = f / (2 + f);
  const z = s * s;
  const [lp1, lp2, lp3, lp4, lp5, lp6, lp7] = LOG_COEFFICIENTS;
  const remainder = z * (
    lp1 + z * (lp2 + z * (lp3 + z * (lp4 + z * (lp5 + z * (lp6 + z * lp7)))))
  );
  return k === 0
    ? f - (halfSquare - s * (halfSquare + remainder))
    : k * LN2_HI - ((halfSquare - (s * (halfSquare + remainder) + (k * LN2_LO + correction))) - f);
}

function positiveMantissaExponent(value: number): { readonly mantissa: number; readonly exponent: number } {
  let normalized = value;
  let exponentAdjustment = 0;
  let high = highWord(normalized);
  if ((high & 0x7ff00000) === 0) {
    normalized *= TWO54;
    exponentAdjustment = -54;
    high = highWord(normalized);
  }
  const exponent = (high >>> 20) - 1023 + exponentAdjustment;
  const mantissa = withHighWord(normalized, (high & 0x000fffff) | 0x3ff00000);
  return { mantissa, exponent };
}

/**
 * Deterministic ln(larger / smaller) without first rounding a near-unity ratio to one.
 */
export function deterministicPositiveLogRatio(larger: number, smaller: number): number {
  if (!(larger >= smaller) || !(smaller > 0) || !Number.isFinite(larger)) return NaN;
  if (larger === smaller) return 0;
  const difference = larger - smaller;
  if (Number.isFinite(difference)) {
    const delta = difference / smaller;
    if (Number.isFinite(delta) && delta <= 1) return deterministicLogOnePlus(delta);
  }
  const numerator = positiveMantissaExponent(larger);
  const denominator = positiveMantissaExponent(smaller);
  let reducedRatio = numerator.mantissa / denominator.mantissa;
  let exponent = numerator.exponent - denominator.exponent;
  if (reducedRatio < 1) {
    reducedRatio *= 2;
    exponent--;
  } else if (reducedRatio >= 2) {
    reducedRatio *= 0.5;
    exponent++;
  }
  const reducedLog = deterministicLogOnePlus(reducedRatio - 1);
  return exponent * LN2_HI + (reducedLog + exponent * LN2_LO);
}
