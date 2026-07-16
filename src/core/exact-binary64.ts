/** Exact finite-binary64 accumulation followed by one round-to-nearest, ties-to-even. */

const FRACTION_BITS = 52n;
const FRACTION_MASK = (1n << FRACTION_BITS) - 1n;
const HIDDEN_BIT = 1n << FRACTION_BITS;
const SIGN_BIT = 1n << 63n;
const scratch = new DataView(new ArrayBuffer(8));

function finiteValueInMinSubnormalUnits(value: number): bigint {
  if (!Number.isFinite(value)) throw new Error('exact binary64 accumulation requires finite values');
  scratch.setFloat64(0, value, false);
  const bits = scratch.getBigUint64(0, false);
  const negative = (bits & SIGN_BIT) !== 0n;
  const exponentBits = Number((bits >> FRACTION_BITS) & 0x7ffn);
  const fraction = bits & FRACTION_MASK;
  if (exponentBits === 0 && fraction === 0n) return 0n;
  const mantissa = exponentBits === 0 ? fraction : HIDDEN_BIT + fraction;
  const shift = exponentBits === 0 ? 0n : BigInt(exponentBits - 1);
  const units = mantissa << shift;
  return negative ? -units : units;
}

/** Exact integer coefficient `n` such that a finite binary64 value equals `n * 2^-1074`. */
export function finiteBinary64ToMinSubnormalUnits(value: number): bigint {
  return finiteValueInMinSubnormalUnits(value);
}

function bitLength(value: bigint): number {
  return value === 0n ? 0 : value.toString(2).length;
}

function roundedQuotientEven(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const doubled = remainder << 1n;
  if (doubled > denominator || (doubled === denominator && (quotient & 1n) === 1n)) {
    return quotient + 1n;
  }
  return quotient;
}

function binary64FromBits(bits: bigint): number {
  scratch.setBigUint64(0, bits, false);
  return scratch.getFloat64(0, false);
}

function floorBinaryLogarithmOfRational(numerator: bigint, denominator: bigint): number {
  let exponent = bitLength(numerator) - bitLength(denominator);
  const numeratorAtExponent = exponent >= 0
    ? denominator << BigInt(exponent)
    : denominator;
  const denominatorAtExponent = exponent >= 0
    ? numerator
    : numerator << BigInt(-exponent);
  if (denominatorAtExponent < numeratorAtExponent) exponent--;
  return exponent;
}

function roundedScaledQuotient(
  numerator: bigint,
  denominator: bigint,
  binaryShift: number,
): bigint {
  return binaryShift >= 0
    ? roundedQuotientEven(numerator << BigInt(binaryShift), denominator)
    : roundedQuotientEven(numerator, denominator << BigInt(-binaryShift));
}

/** Round `(signedNumerator / denominator) * 2^binaryExponent` to binary64. */
function roundRationalWithBinaryExponent(
  signedNumerator: bigint,
  denominator: bigint,
  binaryExponent: number,
): { readonly value: number; readonly exactNonZero: boolean } {
  if (denominator <= 0n) throw new Error('exact binary64 denominator must be positive');
  if (signedNumerator === 0n) return { value: 0, exactNonZero: false };

  const negative = signedNumerator < 0n;
  const numerator = negative ? -signedNumerator : signedNumerator;
  let exponentBits: number;
  let fraction: bigint;
  let valueExponent = floorBinaryLogarithmOfRational(numerator, denominator) + binaryExponent;

  // Values below the normal threshold are rounded directly on the subnormal grid, whose
  // quantum is exactly 2^-1074. A carry at the boundary becomes the smallest normal.
  if (valueExponent < -1022) {
    const subnormal = roundedScaledQuotient(
      numerator,
      denominator,
      binaryExponent + 1074,
    );
    if (subnormal === 0n) return { value: negative ? -0 : 0, exactNonZero: true };
    if (subnormal >= HIDDEN_BIT) {
      exponentBits = 1;
      fraction = 0n;
    } else {
      exponentBits = 0;
      fraction = subnormal;
    }
  } else {
    // Keep 53 significant bits and round exactly once. A carry advances the exponent.
    let mantissa = roundedScaledQuotient(
      numerator,
      denominator,
      binaryExponent + 52 - valueExponent,
    );
    if (mantissa === (HIDDEN_BIT << 1n)) {
      mantissa >>= 1n;
      valueExponent++;
    }
    exponentBits = valueExponent + 1023;
    if (exponentBits >= 0x7ff) {
      throw new Error('exact binary64 result overflows the finite range');
    }
    fraction = mantissa - HIDDEN_BIT;
  }

  const bits = (negative ? SIGN_BIT : 0n) | (BigInt(exponentBits) << FRACTION_BITS) | fraction;
  return { value: binary64FromBits(bits), exactNonZero: true };
}

/**
 * The correctly rounded arithmetic mean of finite binary64 inputs.
 *
 * Each input is decoded as an exact integer multiple of 2^-1074, all integers are summed,
 * division by N remains rational, and only the final result is rounded. The result is
 * invariant under input permutation. A non-zero exact mean that underflows to signed zero
 * is refused because downstream normalization could otherwise turn real variation into a
 * flat line while still claiming that the constants were representable.
 */
function exactBinary64MeanResult(values: readonly number[]): { readonly value: number; readonly exactNonZero: boolean } {
  if (values.length === 0) throw new Error('exact binary64 mean requires at least one value');
  let numerator = 0n;
  for (const value of values) numerator += finiteValueInMinSubnormalUnits(value);
  return roundRationalWithBinaryExponent(numerator, BigInt(values.length), -1074);
}

/** Correctly rounded mean, permitting a non-zero exact result to round to canonical zero. */
export function roundedBinary64Mean(values: readonly number[]): number {
  const rounded = exactBinary64MeanResult(values);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}

export function exactBinary64Mean(values: readonly number[]): number {
  const rounded = exactBinary64MeanResult(values);
  if (rounded.exactNonZero && rounded.value === 0) {
    throw new Error('exact binary64 mean underflows to zero');
  }
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}

/** Correctly rounded sum with exact cancellation before the one final rounding step. */
export function exactBinary64Sum(values: readonly number[]): number {
  let numerator = 0n;
  for (const value of values) numerator += finiteValueInMinSubnormalUnits(value);
  const rounded = roundRationalWithBinaryExponent(numerator, 1n, -1074);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}

/** Correctly round an exact rational times a power of two to binary64. */
export function exactRationalToBinary64(
  numerator: bigint,
  denominator: bigint,
  binaryExponent = 0,
): number {
  const rounded = roundRationalWithBinaryExponent(numerator, denominator, binaryExponent);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}

/** Correctly round `value * (numerator / denominator) * 2^binaryExponent`. */
export function exactBinary64MultiplyByRational(
  value: number,
  numerator: bigint,
  denominator: bigint,
  binaryExponent = 0,
): number {
  return exactRationalToBinary64(
    finiteValueInMinSubnormalUnits(value) * numerator,
    denominator,
    binaryExponent - 1074,
  );
}

/**
 * Correctly round `numerator / (integerFactor * denominatorValue)` without ever
 * materializing the product in binary64.
 *
 * This is the stable shape needed by rate derivations: a finite bin width and a
 * positive integer population/trial count may have a product above MAX_VALUE even
 * though the resulting rate remains representable. Conversely, a non-zero exact
 * quotient that rounds to zero is refused rather than being reported as a measured
 * zero.
 */
export function exactBinary64DivideByIntegerProduct(
  numerator: number,
  integerFactor: number,
  denominatorValue: number,
): number {
  if (!Number.isFinite(numerator)) {
    throw new Error('exact binary64 quotient requires a finite numerator');
  }
  if (!Number.isSafeInteger(integerFactor) || integerFactor < 1) {
    throw new Error('exact binary64 quotient requires a positive safe-integer factor');
  }
  if (!Number.isFinite(denominatorValue) || !(denominatorValue > 0)) {
    throw new Error('exact binary64 quotient requires a finite positive denominator value');
  }

  const numeratorUnits = finiteValueInMinSubnormalUnits(numerator);
  const denominatorUnits =
    BigInt(integerFactor) * finiteValueInMinSubnormalUnits(denominatorValue);
  const result = exactRationalToBinary64(numeratorUnits, denominatorUnits);
  if (numeratorUnits !== 0n && result === 0) {
    throw new Error('exact binary64 quotient underflows to zero');
  }
  return result;
}

/** Exact relative-error predicate: |a-b|/max(|a|,|b|) <= N*2^-52. */
export function binary64RelativeDifferenceWithinEpsilons(
  left: number,
  right: number,
  epsilonMultiples: number,
): boolean {
  if (
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    !Number.isSafeInteger(epsilonMultiples) ||
    epsilonMultiples < 0
  ) return false;
  const leftUnits = finiteValueInMinSubnormalUnits(left);
  const rightUnits = finiteValueInMinSubnormalUnits(right);
  const absoluteLeft = leftUnits < 0n ? -leftUnits : leftUnits;
  const absoluteRight = rightUnits < 0n ? -rightUnits : rightUnits;
  const scale = absoluteLeft > absoluteRight ? absoluteLeft : absoluteRight;
  if (scale === 0n) return true;
  const difference = leftUnits >= rightUnits ? leftUnits - rightUnits : rightUnits - leftUnits;
  return (difference << 52n) <= BigInt(epsilonMultiples) * scale;
}

/**
 * Exact relative-error predicate:
 * `|left-right| / max(|left|,|right|) <= relativeTolerance`.
 *
 * All three binary64 inputs are decoded to exact integers. The comparison is then
 * cross-multiplied in BigInt, so it remains meaningful for subnormals where ordinary
 * subtraction or `relativeTolerance * scale` may underflow to zero.
 */
export function binary64RelativeDifferenceWithinTolerance(
  left: number,
  right: number,
  relativeTolerance: number,
): boolean {
  if (
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    !Number.isFinite(relativeTolerance) ||
    relativeTolerance < 0
  ) return false;

  const leftUnits = finiteValueInMinSubnormalUnits(left);
  const rightUnits = finiteValueInMinSubnormalUnits(right);
  const toleranceUnits = finiteValueInMinSubnormalUnits(relativeTolerance);
  const absoluteLeft = leftUnits < 0n ? -leftUnits : leftUnits;
  const absoluteRight = rightUnits < 0n ? -rightUnits : rightUnits;
  const scale = absoluteLeft > absoluteRight ? absoluteLeft : absoluteRight;
  if (scale === 0n) return true;
  const difference = leftUnits >= rightUnits ? leftUnits - rightUnits : rightUnits - leftUnits;

  // toleranceUnits represents `relativeTolerance * 2^1074`, hence the matching
  // power of two on the left after cross multiplication.
  return (difference << 1074n) <= scale * toleranceUnits;
}

/** Exact finite-binary64 sum encoded as an integer multiple of 2^-1074. */
export function exactBinary64SumUnits(values: readonly number[]): string {
  let numerator = 0n;
  for (const value of values) numerator += finiteValueInMinSubnormalUnits(value);
  return numerator.toString(10);
}

/**
 * Correctly round `value / mean`, where `mean` is the exact arithmetic mean of the
 * binary64 values whose integer-unit sum is recorded by `exactBinary64SumUnits`.
 */
export function exactBinary64RatioToMean(
  value: number,
  exactSumUnits: string,
  count: number,
): number {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error('exact binary64 mean ratio requires a positive safe-integer count');
  }
  const denominator = BigInt(exactSumUnits);
  if (denominator <= 0n) {
    throw new Error('exact binary64 mean ratio requires a strictly positive exact mean');
  }
  const numerator = finiteValueInMinSubnormalUnits(value) * BigInt(count);
  const rounded = roundRationalWithBinaryExponent(numerator, denominator, 0);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}

/** Correctly round `(value - origin) / (maximum - minimum)` for finite binary64 inputs. */
export function exactBinary64AffineFraction(
  value: number,
  origin: number,
  minimum: number,
  maximum: number,
): number {
  const denominator = finiteValueInMinSubnormalUnits(maximum) - finiteValueInMinSubnormalUnits(minimum);
  if (denominator <= 0n) throw new Error('exact binary64 affine fraction requires maximum > minimum');
  const numerator = finiteValueInMinSubnormalUnits(value) - finiteValueInMinSubnormalUnits(origin);
  const rounded = roundRationalWithBinaryExponent(numerator, denominator, 0);
  return Object.is(rounded.value, -0) ? 0 : rounded.value;
}
