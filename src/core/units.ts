/**
 * Units.
 *
 * A non-blank string is not a unit. `"ms"` and `"milliseconds"` and `""` are three
 * different situations, and a library that treats them the same will eventually
 * multiply something by 1000 when it should not have.
 *
 * Three rules, and the second one is the interesting one:
 *
 *   1. A conversion is legal only WITHIN a dimension. Cross-dimension conversion
 *      is never attempted, so a voltage can never become a current.
 *
 *   2. An accepted ALIAS is rejected in a stable request rather than silently
 *      converted. This looks unfriendly and is deliberate: a silent conversion
 *      changes a number that the caller never sees change. The rejection carries a
 *      machine-applicable repair, so the fix is one operation — but it is the
 *      caller's operation, and it is recorded. Adapters and `cortexel migrate` may
 *      convert aliases, because there the conversion IS the caller's intent.
 *
 *   3. A `simulator_defined` unit — a NEST weight, say — has no SI mapping and is
 *      NEVER converted, compared, or pooled with anything, including another
 *      simulator-defined unit. A NEST weight's physical meaning depends on the
 *      synapse and neuron model: in one model it acts like a current, in another
 *      like a conductance. Two such numbers are not comparable merely because both
 *      are called "weight", and a histogram that pools them is a histogram of nothing.
 */

import { UNITS, UNIT_ALIASES, QUANTITY_KIND_DIMENSIONS } from '../generated/registry.js';
import { makeError, pointer, type CortexelError } from './errors.js';
import {
  exactBinary64MultiplyByRational,
  exactRationalToBinary64,
  finiteBinary64ToMinSubnormalUnits,
} from './exact-binary64.js';

export interface Quantity {
  readonly kind: string;
  readonly unit: string;
  readonly value: number;
}

export interface QuantitySeries {
  readonly kind: string;
  readonly unit: string;
  readonly values: readonly (number | null)[];
}

export function isKnownUnit(code: string): boolean {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(UNITS, code);
}

export function dimensionOf(code: string): string | undefined {
  return typeof code === 'string' && isKnownUnit(code) ? UNITS[code].dimension : undefined;
}

/** Registry-owned SI/canonical code for a convertible unit's dimension. */
export function canonicalUnitFor(code: string): string | undefined {
  if (!isKnownUnit(code)) return undefined;
  const dimension = UNITS[code].dimension;
  if (dimension === 'simulator_defined') return undefined;
  return Object.keys(UNITS).find((candidate) =>
    UNITS[candidate].dimension === dimension && UNITS[candidate].toCanonical === 1);
}

/** True when the unit has no safe SI mapping and must never be converted. */
export function isSimulatorDefined(code: string): boolean {
  return dimensionOf(code) === 'simulator_defined';
}

/** The canonical code an alias means, or undefined when the string is not an alias. */
export function resolveAlias(code: string): string | undefined {
  if (typeof code !== 'string') return undefined;
  if (isKnownUnit(code)) return undefined;
  return Object.prototype.hasOwnProperty.call(UNIT_ALIASES, code)
    ? UNIT_ALIASES[code]
    : undefined;
}

/** Whether a quantity kind may legally carry a unit of this dimension. */
export function kindAcceptsDimension(kind: string, dimension: string): boolean {
  if (typeof kind !== 'string' || typeof dimension !== 'string') return false;
  const allowed = QUANTITY_KIND_DIMENSIONS[kind];
  return Array.isArray(allowed) && allowed.includes(dimension);
}

/** True only for contract-registered physical quantity discriminators. */
export function isQuantityKind(kind: string): boolean {
  return typeof kind === 'string' && Object.prototype.hasOwnProperty.call(QUANTITY_KIND_DIMENSIONS, kind);
}

export interface ConversionReceipt {
  readonly from: string;
  readonly to: string;
  /** Rounded display value only; the exact tuple below is the reproducible authority. */
  readonly factor: number;
  readonly exactFactor: {
    readonly numerator: string;
    readonly denominator: string;
    readonly binaryExponent: number;
  };
  readonly algorithm: 'exact_rational_round_to_binary64';
}

interface ExactScale {
  readonly numerator: bigint;
  readonly denominator: bigint;
  readonly binaryExponent: number;
}

interface ExactQuantityRational extends ExactScale {}

function powerOfTen(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

function exactUnitScale(unit: (typeof UNITS)[string]): ExactScale {
  const decimalExponent = unit.toCanonicalDecimalExponent;
  if (decimalExponent !== null) {
    return decimalExponent >= 0
      ? { numerator: powerOfTen(decimalExponent), denominator: 1n, binaryExponent: 0 }
      : { numerator: 1n, denominator: powerOfTen(-decimalExponent), binaryExponent: 0 };
  }
  if (unit.toCanonical === null) {
    throw new Error('simulator-defined unit has no exact conversion scale');
  }
  return {
    numerator: finiteBinary64ToMinSubnormalUnits(unit.toCanonical),
    denominator: 1n,
    binaryExponent: -1074,
  };
}

function exactScaleRatio(from: (typeof UNITS)[string], to: (typeof UNITS)[string]): ExactScale {
  const source = exactUnitScale(from);
  const target = exactUnitScale(to);
  return {
    numerator: source.numerator * target.denominator,
    denominator: source.denominator * target.numerator,
    binaryExponent: source.binaryExponent - target.binaryExponent,
  };
}

function exactQuantityRational(value: number, unitCode: string): ExactQuantityRational {
  if (!Number.isFinite(value) || !isKnownUnit(unitCode)) {
    throw new Error('exact unit comparison requires finite values and registered units');
  }
  const unit = UNITS[unitCode];
  if (unit.toCanonical === null) {
    throw new Error('exact unit comparison is unavailable for simulator-defined units');
  }
  const scale = exactUnitScale(unit);
  return {
    numerator: finiteBinary64ToMinSubnormalUnits(value) * scale.numerator,
    denominator: scale.denominator,
    binaryExponent: scale.binaryExponent - 1074,
  };
}

function addExactRationals(
  left: ExactQuantityRational,
  right: ExactQuantityRational,
): ExactQuantityRational {
  const exponent = Math.min(left.binaryExponent, right.binaryExponent);
  return {
    numerator:
      (left.numerator * right.denominator << BigInt(left.binaryExponent - exponent)) +
      (right.numerator * left.denominator << BigInt(right.binaryExponent - exponent)),
    denominator: left.denominator * right.denominator,
    binaryExponent: exponent,
  };
}

function compareExactRationals(left: ExactQuantityRational, right: ExactQuantityRational): -1 | 0 | 1 {
  const exponent = Math.min(left.binaryExponent, right.binaryExponent);
  const leftInteger = left.numerator * right.denominator << BigInt(left.binaryExponent - exponent);
  const rightInteger = right.numerator * left.denominator << BigInt(right.binaryExponent - exponent);
  return leftInteger < rightInteger ? -1 : leftInteger > rightInteger ? 1 : 0;
}

/**
 * Compare an exact sum of registered physical quantities with a target quantity.
 * No unit factor or intermediate sum is rounded. All units must share one dimension.
 */
export function compareExactUnitSumToValue(
  terms: readonly { readonly value: number; readonly unit: string }[],
  target: { readonly value: number; readonly unit: string },
): -1 | 0 | 1 {
  if (terms.length === 0) throw new Error('exact unit sum comparison requires at least one term');
  const targetDimension = dimensionOf(target.unit);
  if (!targetDimension || targetDimension === 'simulator_defined') {
    throw new Error('exact unit sum comparison requires a registered physical target unit');
  }
  let sum: ExactQuantityRational = { numerator: 0n, denominator: 1n, binaryExponent: 0 };
  for (const term of terms) {
    if (dimensionOf(term.unit) !== targetDimension) {
      throw new Error('exact unit sum comparison refuses cross-dimension terms');
    }
    sum = addExactRationals(sum, exactQuantityRational(term.value, term.unit));
  }
  return compareExactRationals(sum, exactQuantityRational(target.value, target.unit));
}

/**
 * Compare a large same-unit array sum with an exact cross-unit endpoint difference.
 *
 * Unlike the general small-term helper above, this keeps the common denominator once:
 * every finite binary64 input is first accumulated as its integer coefficient of 2^-1074,
 * then the registered unit scale is applied once. Complexity is linear in the number of
 * values and intermediate integer size stays bounded by the exact sum, so a recorder-sized
 * train cannot cause denominator multiplication on every term.
 */
export function compareExactUnitArraySumToDifference(
  values: readonly number[],
  valueUnit: string,
  lower: { readonly value: number; readonly unit: string },
  upper: { readonly value: number; readonly unit: string },
): -1 | 0 | 1 {
  const dimension = dimensionOf(valueUnit);
  if (!dimension || dimension === 'simulator_defined') {
    throw new Error('exact unit array comparison requires a registered physical value unit');
  }
  if (dimensionOf(lower.unit) !== dimension || dimensionOf(upper.unit) !== dimension) {
    throw new Error('exact unit array comparison refuses cross-dimension endpoints');
  }
  const unit = UNITS[valueUnit];
  if (!unit || unit.toCanonical === null) {
    throw new Error('exact unit array comparison requires a physical unit scale');
  }
  let sumUnits = 0n;
  for (const value of values) {
    sumUnits += finiteBinary64ToMinSubnormalUnits(value);
  }
  const scale = exactUnitScale(unit);
  const sum: ExactQuantityRational = {
    numerator: sumUnits * scale.numerator,
    denominator: scale.denominator,
    binaryExponent: scale.binaryExponent - 1074,
  };
  const lowerRational = exactQuantityRational(lower.value, lower.unit);
  const upperRational = exactQuantityRational(upper.value, upper.unit);
  const duration = addExactRationals(upperRational, {
    ...lowerRational,
    numerator: -lowerRational.numerator,
  });
  return compareExactRationals(sum, duration);
}

/** Correctly round an exact sum of registered quantities into one target unit. */
export function convertExactUnitSum(
  terms: readonly { readonly value: number; readonly unit: string }[],
  targetUnit: string,
): number {
  if (terms.length === 0) throw new Error('exact unit sum conversion requires at least one term');
  const targetDimension = dimensionOf(targetUnit);
  if (!targetDimension || targetDimension === 'simulator_defined') {
    throw new Error('exact unit sum conversion requires a registered physical target unit');
  }
  let sum: ExactQuantityRational = { numerator: 0n, denominator: 1n, binaryExponent: 0 };
  for (const term of terms) {
    if (dimensionOf(term.unit) !== targetDimension) {
      throw new Error('exact unit sum conversion refuses cross-dimension terms');
    }
    sum = addExactRationals(sum, exactQuantityRational(term.value, term.unit));
  }
  const targetScale = exactUnitScale(UNITS[targetUnit]);
  try {
    const converted = exactRationalToBinary64(
      sum.numerator * targetScale.denominator,
      sum.denominator * targetScale.numerator,
      sum.binaryExponent - targetScale.binaryExponent,
    );
    if (sum.numerator !== 0n && converted === 0) {
      throw new Error('exact unit sum conversion underflowed binary64');
    }
    return converted;
  } catch (error) {
    if (error instanceof Error && error.message.includes('overflows')) {
      throw new Error('exact unit sum conversion overflowed binary64');
    }
    throw error;
  }
}

function conversionScaleRatio(from: string, to: string): ExactScale {
  if (typeof from !== 'string' || typeof to !== 'string') {
    throw new Error('conversion factor requires two registered unit codes');
  }
  const fromUnit = UNITS[from];
  const toUnit = UNITS[to];
  if (!fromUnit || !toUnit || fromUnit.toCanonical === null || toUnit.toCanonical === null) {
    throw new Error(`no conversion factor exists for ${from} -> ${to}`);
  }
  if (fromUnit.dimension !== toUnit.dimension) {
    throw new Error(
      `no conversion factor exists across dimensions: ${from} (${fromUnit.dimension}) -> ${to} (${toUnit.dimension})`,
    );
  }
  return from === to
    ? { numerator: 1n, denominator: 1n, binaryExponent: 0 }
    : exactScaleRatio(fromUnit, toUnit);
}

/**
 * Convert a value between two codes of the same dimension.
 *
 * Multiplies ONCE, by a single exact factor. It never chains through an
 * intermediate unit, because every extra binary64 multiply is another chance to
 * lose a digit for no reason.
 */
export function convert(value: number, from: string, to: string): number {
  if (!Number.isFinite(value) || typeof from !== 'string' || typeof to !== 'string') {
    throw new Error('conversion requires a finite value and two registered unit codes');
  }
  const fromUnit = UNITS[from];
  const toUnit = UNITS[to];

  if (!fromUnit || !toUnit) {
    throw new Error(`unknown unit in conversion: ${from} -> ${to}`);
  }
  if (fromUnit.dimension !== toUnit.dimension) {
    throw new Error(
      `refusing to convert across dimensions: ${from} (${fromUnit.dimension}) -> ${to} (${toUnit.dimension})`,
    );
  }
  if (fromUnit.toCanonical === null || toUnit.toCanonical === null) {
    throw new Error(
      `refusing to convert a simulator-defined unit: ${from} -> ${to}. Its physical meaning depends on the source model and has no SI mapping.`,
    );
  }

  if (from === to) return value;

  const ratio = exactScaleRatio(fromUnit, toUnit);
  let converted: number;
  try {
    converted = exactBinary64MultiplyByRational(
      value,
      ratio.numerator,
      ratio.denominator,
      ratio.binaryExponent,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('overflows')) {
      throw new Error('unit conversion overflowed binary64');
    }
    throw error;
  }
  if (!Number.isFinite(converted) || (value !== 0 && converted === 0)) {
    throw new Error('unit conversion overflowed or underflowed binary64');
  }
  return converted;
}

/** The single factor a conversion would apply, for the derivation receipt. */
export function conversionFactor(from: string, to: string): number {
  const ratio = conversionScaleRatio(from, to);
  return exactRationalToBinary64(
    ratio.numerator,
    ratio.denominator,
    ratio.binaryExponent,
  );
}

/** Complete reproducible authority for one registered unit conversion. */
export function conversionReceipt(from: string, to: string): ConversionReceipt {
  const ratio = conversionScaleRatio(from, to);
  return {
    from,
    to,
    factor: exactRationalToBinary64(
      ratio.numerator,
      ratio.denominator,
      ratio.binaryExponent,
    ),
    exactFactor: {
      numerator: ratio.numerator.toString(10),
      denominator: ratio.denominator.toString(10),
      binaryExponent: ratio.binaryExponent,
    },
    algorithm: 'exact_rational_round_to_binary64',
  };
}

/** Correctly round the exact converted separation `upper - lower` without subtracting first. */
export function convertDifference(
  lower: number,
  upper: number,
  from: string,
  to: string,
): number {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) {
    throw new Error('converted difference requires finite strictly ordered endpoints');
  }
  const ratio = conversionScaleRatio(from, to);
  const differenceUnits =
    finiteBinary64ToMinSubnormalUnits(upper) - finiteBinary64ToMinSubnormalUnits(lower);
  try {
    return exactRationalToBinary64(
      differenceUnits * ratio.numerator,
      ratio.denominator,
      ratio.binaryExponent - 1074,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('overflows')) {
      throw new Error('unit-converted difference overflowed binary64');
    }
    throw error;
  }
}

/**
 * Correctly round
 * `numerator / (integerFactor * exactConvert(upper - lower, from, to))`
 * without materializing or rounding the converted difference first.
 *
 * This is the authoritative rate/density denominator path for exact integer
 * observations over endpoint-defined intervals. Both endpoint subtraction and unit
 * conversion remain rational until the final quotient is rounded once.
 */
export function divideExactIntegerByConvertedDifference(
  numerator: number,
  integerFactor: number,
  lower: number,
  upper: number,
  from: string,
  to: string,
): number {
  if (!Number.isSafeInteger(numerator) || numerator < 0) {
    throw new Error('exact endpoint quotient requires a non-negative safe-integer numerator');
  }
  if (!Number.isSafeInteger(integerFactor) || integerFactor < 1) {
    throw new Error('exact endpoint quotient requires a positive safe-integer factor');
  }
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) {
    throw new Error('exact endpoint quotient requires finite strictly ordered endpoints');
  }

  const ratio = conversionScaleRatio(from, to);
  const differenceUnits =
    finiteBinary64ToMinSubnormalUnits(upper) - finiteBinary64ToMinSubnormalUnits(lower);
  // If D is the exact endpoint difference in 2^-1074 units and the registered
  // conversion scale is (P / Q) * 2^E, the requested quotient is exactly
  //
  //   numerator * Q
  //   ---------------------- * 2^(1074 - E).
  //   integerFactor * D * P
  //
  // Supplying that rational directly to the binary64 rounder is therefore one
  // round-to-nearest-even operation from the declared endpoints to the rate.
  let result: number;
  try {
    result = exactRationalToBinary64(
      BigInt(numerator) * ratio.denominator,
      BigInt(integerFactor) * differenceUnits * ratio.numerator,
      1074 - ratio.binaryExponent,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('overflows')) {
      throw new Error('exact endpoint quotient overflowed binary64');
    }
    throw error;
  }
  if (numerator !== 0 && result === 0) {
    throw new Error('exact endpoint quotient underflowed binary64');
  }
  return result;
}

/**
 * Correctly round an exact count rate directly into a declared frequency unit.
 *
 * Unlike deriving Hz and then converting, this combines the endpoint difference, time-unit
 * scale, sender/trial denominator, and output-frequency scale into one rational and rounds
 * once. It is the authoritative predicate for a caller-supplied rate audit.
 */
export function deriveExactCountRateInUnit(
  count: number,
  integerFactor: number,
  lower: number,
  upper: number,
  timeUnit: string,
  rateUnit: string,
): number {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('exact count rate requires a non-negative safe-integer count');
  }
  if (!Number.isSafeInteger(integerFactor) || integerFactor < 1) {
    throw new Error('exact count rate requires a positive safe-integer denominator');
  }
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) {
    throw new Error('exact count rate requires finite strictly ordered endpoints');
  }
  const timeToSeconds = conversionScaleRatio(timeUnit, 's');
  const rateToHz = conversionScaleRatio(rateUnit, 'Hz');
  const differenceUnits =
    finiteBinary64ToMinSubnormalUnits(upper) - finiteBinary64ToMinSubnormalUnits(lower);
  let result: number;
  try {
    result = exactRationalToBinary64(
      BigInt(count) * timeToSeconds.denominator * rateToHz.denominator,
      BigInt(integerFactor) * differenceUnits * timeToSeconds.numerator * rateToHz.numerator,
      1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('overflows')) {
      throw new Error('exact count rate overflowed binary64');
    }
    throw error;
  }
  if (count !== 0 && result === 0) {
    throw new Error('exact count rate underflowed binary64');
  }
  return result;
}

/**
 * Correctly round an exact count rate with more than one integer denominator.
 *
 * A PSTH rate may divide by both the number of covering trials and the number of
 * selected senders.  Multiplying those denominators as a JavaScript number first
 * would make the result depend on whether their product still happens to be a safe
 * integer.  Keep the product in BigInt and combine it with the endpoint difference,
 * time conversion, and output-rate conversion before the single binary64 rounding.
 */
export function deriveExactCountRateWithIntegerFactorsInUnit(
  count: number,
  integerFactors: readonly number[],
  lower: number,
  upper: number,
  timeUnit: string,
  rateUnit: string,
): number {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('exact count rate requires a non-negative safe-integer count');
  }
  if (
    integerFactors.length < 1 ||
    integerFactors.some((factor) => !Number.isSafeInteger(factor) || factor < 1)
  ) {
    throw new Error('exact count rate requires positive safe-integer factors');
  }
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) {
    throw new Error('exact count rate requires finite strictly ordered endpoints');
  }

  const timeToSeconds = conversionScaleRatio(timeUnit, 's');
  const rateToHz = conversionScaleRatio(rateUnit, 'Hz');
  const differenceUnits =
    finiteBinary64ToMinSubnormalUnits(upper) - finiteBinary64ToMinSubnormalUnits(lower);
  const integerFactor = integerFactors.reduce(
    (product, factor) => product * BigInt(factor),
    1n,
  );
  let result: number;
  try {
    result = exactRationalToBinary64(
      BigInt(count) * timeToSeconds.denominator * rateToHz.denominator,
      integerFactor * differenceUnits * timeToSeconds.numerator * rateToHz.numerator,
      1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('overflows')) {
      throw new Error('exact count rate overflowed binary64');
    }
    throw error;
  }
  if (count !== 0 && result === 0) {
    throw new Error('exact count rate underflowed binary64');
  }
  return result;
}

/**
 * Correctly round one aggregate count over a sum of exact, integer-weighted
 * endpoint exposures.
 *
 * This is the PSTH baseline authority.  The denominator is
 *
 *   sum_i(coveringTrials_i * (upper_i - lower_i)) * other integer factors
 *
 * in a registered time unit.  No bin width, exposure, unit factor, or partial sum
 * is rounded before the final rate is rounded into `rateUnit`.
 */
export function deriveExactAggregateCountRateOverIntervalsInUnit(
  countTotal: bigint,
  integerFactors: readonly number[],
  intervals: readonly {
    readonly lower: number;
    readonly upper: number;
    readonly integerWeight: number;
  }[],
  timeUnit: string,
  rateUnit: string,
): number {
  if (countTotal < 0n) {
    throw new Error('exact aggregate count rate requires a non-negative count total');
  }
  if (
    integerFactors.some((factor) => !Number.isSafeInteger(factor) || factor < 1)
  ) {
    throw new Error('exact aggregate count rate requires positive safe-integer factors');
  }
  if (intervals.length < 1) {
    throw new Error('exact aggregate count rate requires positive observed exposure');
  }

  let weightedDifferenceUnits = 0n;
  for (const interval of intervals) {
    if (
      !Number.isFinite(interval.lower) ||
      !Number.isFinite(interval.upper) ||
      !(interval.upper > interval.lower) ||
      !Number.isSafeInteger(interval.integerWeight) ||
      interval.integerWeight < 1
    ) {
      throw new Error(
        'exact aggregate count rate requires ordered finite intervals with positive safe-integer weights',
      );
    }
    const differenceUnits =
      finiteBinary64ToMinSubnormalUnits(interval.upper) -
      finiteBinary64ToMinSubnormalUnits(interval.lower);
    weightedDifferenceUnits += BigInt(interval.integerWeight) * differenceUnits;
  }
  if (weightedDifferenceUnits <= 0n) {
    throw new Error('exact aggregate count rate requires positive observed exposure');
  }

  const timeToSeconds = conversionScaleRatio(timeUnit, 's');
  const rateToHz = conversionScaleRatio(rateUnit, 'Hz');
  const integerFactor = integerFactors.reduce(
    (product, factor) => product * BigInt(factor),
    1n,
  );
  let result: number;
  try {
    result = exactRationalToBinary64(
      countTotal * timeToSeconds.denominator * rateToHz.denominator,
      integerFactor * weightedDifferenceUnits * timeToSeconds.numerator * rateToHz.numerator,
      1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('overflows')) {
      throw new Error('exact aggregate count rate overflowed binary64');
    }
    throw error;
  }
  if (countTotal !== 0n && result === 0) {
    throw new Error('exact aggregate count rate underflowed binary64');
  }
  return result;
}

/**
 * Correctly round the signed difference between one exact count rate and one
 * aggregate exact count rate.
 *
 * Both rates share the same typed time and output-frequency scales, but their
 * count and exposure fractions generally have different denominators.  Rounding
 * each rate before subtraction can turn a one-event difference into a different
 * displayed value at large counts.  Cross-multiply the two exact fractions and
 * round only the signed result.
 */
export function deriveExactCountRateMinusAggregateRateOverIntervalsInUnit(
  count: number,
  integerFactors: readonly number[],
  lower: number,
  upper: number,
  aggregateCount: bigint,
  aggregateIntegerFactors: readonly number[],
  intervals: readonly {
    readonly lower: number;
    readonly upper: number;
    readonly integerWeight: number;
  }[],
  timeUnit: string,
  rateUnit: string,
): number {
  if (!Number.isSafeInteger(count) || count < 0 || aggregateCount < 0n) {
    throw new Error('exact rate difference requires non-negative exact counts');
  }
  if (
    integerFactors.length < 1 ||
    integerFactors.some((factor) => !Number.isSafeInteger(factor) || factor < 1) ||
    aggregateIntegerFactors.some((factor) => !Number.isSafeInteger(factor) || factor < 1)
  ) {
    throw new Error('exact rate difference requires positive safe-integer factors');
  }
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) {
    throw new Error('exact rate difference requires finite strictly ordered endpoints');
  }

  const binDifferenceUnits =
    finiteBinary64ToMinSubnormalUnits(upper) - finiteBinary64ToMinSubnormalUnits(lower);
  const binIntegerFactor = integerFactors.reduce(
    (product, factor) => product * BigInt(factor),
    1n,
  );
  let aggregateDifferenceUnits = 0n;
  for (const interval of intervals) {
    if (
      !Number.isFinite(interval.lower) ||
      !Number.isFinite(interval.upper) ||
      !(interval.upper > interval.lower) ||
      !Number.isSafeInteger(interval.integerWeight) ||
      interval.integerWeight < 1
    ) {
      throw new Error(
        'exact rate difference requires ordered finite aggregate intervals with positive safe-integer weights',
      );
    }
    aggregateDifferenceUnits += BigInt(interval.integerWeight) *
      (finiteBinary64ToMinSubnormalUnits(interval.upper) -
        finiteBinary64ToMinSubnormalUnits(interval.lower));
  }
  if (aggregateDifferenceUnits <= 0n) {
    throw new Error('exact rate difference requires positive aggregate exposure');
  }
  const aggregateIntegerFactor = aggregateIntegerFactors.reduce(
    (product, factor) => product * BigInt(factor),
    1n,
  );

  const signedFractionNumerator =
    BigInt(count) * aggregateIntegerFactor * aggregateDifferenceUnits -
    aggregateCount * binIntegerFactor * binDifferenceUnits;
  const fractionDenominator =
    binIntegerFactor * binDifferenceUnits *
    aggregateIntegerFactor * aggregateDifferenceUnits;
  const timeToSeconds = conversionScaleRatio(timeUnit, 's');
  const rateToHz = conversionScaleRatio(rateUnit, 'Hz');
  let result: number;
  try {
    result = exactRationalToBinary64(
      signedFractionNumerator * timeToSeconds.denominator * rateToHz.denominator,
      fractionDenominator * timeToSeconds.numerator * rateToHz.numerator,
      1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('overflows')) {
      throw new Error('exact rate difference overflowed binary64');
    }
    throw error;
  }
  if (signedFractionNumerator !== 0n && result === 0) {
    throw new Error('exact rate difference underflowed binary64');
  }
  return result;
}

function floorNonnegativeRationalWithBinaryExponent(
  numerator: bigint,
  denominator: bigint,
  binaryExponent: number,
): bigint {
  if (numerator < 0n || denominator <= 0n) {
    throw new Error('exact rational floor requires a non-negative numerator and positive denominator');
  }
  return binaryExponent >= 0
    ? (numerator << BigInt(binaryExponent)) / denominator
    : numerator / (denominator << BigInt(-binaryExponent));
}

/**
 * Correctly round an exact aggregate of integer counts through one duration denominator.
 *
 * `countTotal / estimatorDenominator` is the count-level mean, trimmed mean, or
 * even-median midpoint. The division by the rate-normalization factor, typed duration,
 * and declared frequency-unit scale is combined with that estimator denominator into a
 * single rational and rounded exactly once. The integer total may exceed MAX_SAFE_INTEGER
 * but cannot exceed the sum of `estimatorDenominator` safe-integer observations.
 */
export function deriveExactAggregateCountRateInUnit(
  countTotal: bigint,
  integerFactor: number,
  estimatorDenominator: number,
  durationValue: number,
  durationUnit: string,
  rateUnit: string,
): number {
  if (
    countTotal < 0n ||
    !Number.isSafeInteger(integerFactor) ||
    integerFactor < 1 ||
    !Number.isSafeInteger(estimatorDenominator) ||
    estimatorDenominator < 1 ||
    countTotal >
      BigInt(estimatorDenominator) * BigInt(Number.MAX_SAFE_INTEGER) ||
    !Number.isFinite(durationValue) ||
    !(durationValue > 0) ||
    dimensionOf(durationUnit) !== 'time' ||
    dimensionOf(rateUnit) !== 'frequency'
  ) {
    throw new Error(
      'exact aggregate count rate requires a bounded non-negative integer total, positive exact denominators, a positive typed duration, and a registered frequency unit',
    );
  }

  const durationUnits = finiteBinary64ToMinSubnormalUnits(durationValue);
  const timeToSeconds = conversionScaleRatio(durationUnit, 's');
  const rateToHz = conversionScaleRatio(rateUnit, 'Hz');
  let result: number;
  try {
    result = exactRationalToBinary64(
      countTotal * timeToSeconds.denominator * rateToHz.denominator,
      BigInt(integerFactor) *
        BigInt(estimatorDenominator) *
        durationUnits *
        timeToSeconds.numerator *
        rateToHz.numerator,
      1074 - timeToSeconds.binaryExponent - rateToHz.binaryExponent,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('overflows')) {
      throw new Error('exact aggregate count rate overflowed binary64');
    }
    throw error;
  }
  if (countTotal !== 0n && result === 0) {
    throw new Error('exact aggregate count rate underflowed binary64');
  }
  return result;
}

/**
 * Whether a supplied rate can be the correctly rounded aggregate of exact integer counts.
 *
 * Each underlying observation has the form `count / (integerFactor * duration)`.
 * `estimatorDenominator` is 1 for a raw observation or odd-sample median, 2 for an
 * even-sample median, and the retained sample count for a mean or trimmed mean. The
 * unknown integer total is bounded by `estimatorDenominator * MAX_SAFE_INTEGER`.
 *
 * The submitted binary64 rate, duration, and registered unit scales are inverted as one
 * exact rational. Only the floor and ceiling integer totals can lie in that value's
 * contiguous round-to-nearest interval. The nearest integers on either side of the
 * inverse point are tested, together with the finite observation-domain boundary: the
 * rounded value of the maximum allowed total may have an inverse center just above that
 * boundary. Every candidate is forward-rounded through the same one-round count-rate
 * formula. No duration, denominator product, or unit conversion is first materialized
 * in binary64.
 */
export function isRoundedAggregateCountRateInUnit(
  value: number,
  integerFactor: number,
  estimatorDenominator: number,
  durationValue: number,
  durationUnit: string,
  rateUnit: string,
): boolean {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(integerFactor) ||
    integerFactor < 1 ||
    !Number.isSafeInteger(estimatorDenominator) ||
    estimatorDenominator < 1 ||
    !Number.isFinite(durationValue) ||
    !(durationValue > 0) ||
    dimensionOf(durationUnit) !== 'time' ||
    dimensionOf(rateUnit) !== 'frequency'
  ) return false;

  const canonicalValue = value === 0 ? 0 : value;
  const valueUnits = finiteBinary64ToMinSubnormalUnits(canonicalValue);
  const durationUnits = finiteBinary64ToMinSubnormalUnits(durationValue);
  const timeToSeconds = conversionScaleRatio(durationUnit, 's');
  const rateToHz = conversionScaleRatio(rateUnit, 'Hz');
  const combinedIntegerFactor = BigInt(integerFactor) * BigInt(estimatorDenominator);

  // Invert the exact forward formula used below:
  //
  //   rate = total * timeDen * rateDen
  //          ------------------------- * 2^(1074 - timeExp - rateExp)
  //          F * durationUnits * timeNum * rateNum
  //
  // while the submitted binary64 rate is `valueUnits * 2^-1074`.
  const inverseNumerator =
    valueUnits *
    combinedIntegerFactor *
    durationUnits *
    timeToSeconds.numerator *
    rateToHz.numerator;
  const inverseDenominator = timeToSeconds.denominator * rateToHz.denominator;
  const inverseBinaryExponent =
    -2148 + timeToSeconds.binaryExponent + rateToHz.binaryExponent;
  const floorTotal = floorNonnegativeRationalWithBinaryExponent(
    inverseNumerator,
    inverseDenominator,
    inverseBinaryExponent,
  );
  const maximumTotal =
    BigInt(estimatorDenominator) * BigInt(Number.MAX_SAFE_INTEGER);

  for (const total of new Set([floorTotal, floorTotal + 1n, maximumTotal])) {
    if (total < 0n || total > maximumTotal) continue;
    let rounded: number;
    try {
      rounded = deriveExactAggregateCountRateInUnit(
        total,
        integerFactor,
        estimatorDenominator,
        durationValue,
        durationUnit,
        rateUnit,
      );
    } catch {
      continue;
    }
    if (rounded === canonicalValue) return true;
  }
  return false;
}

/** Convert a duration to seconds. Used wherever a rate denominator is formed. */
export function toSeconds(value: number, unit: string): number {
  const dimension = dimensionOf(unit);
  if (dimension !== 'time') {
    throw new Error(`${unit} is not a time unit (${String(dimension)})`);
  }
  return convert(value, unit, 's');
}

/**
 * Validate one quantity's unit and kind.
 *
 * Returns diagnostics rather than throwing, so a request with several unit
 * problems reports all of them at once instead of one per round trip.
 */
export function checkQuantityUnit(
  kind: string,
  unit: string,
  path: readonly (string | number)[],
  validatorId: string,
): CortexelError[] {
  const errors: CortexelError[] = [];
  const at = pointer(...path);

  if (!isKnownUnit(unit)) {
    const canonical = resolveAlias(unit);
    if (canonical !== undefined) {
      errors.push(
        makeError({
          code: 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
          stage: 'science',
          instancePath: at,
          validatorId: 'unit.canonical_code',
          message: `"${unit}" is an accepted alias, not a canonical code. Use "${canonical}". It is not converted silently: a conversion that changes a number without the caller seeing it is exactly the kind of quiet edit this contract exists to prevent.`,
          repair: {
            operation: 'replace',
            path: at,
            value: canonical,
            reasonCode: 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
          },
        }),
      );
      return errors;
    }

    errors.push(
      makeError({
        code: 'SCHEMA_ENUM_MISMATCH',
        stage: 'structural',
        instancePath: at,
        validatorId,
        message: `"${unit}" is not a unit code in the registry.`,
      }),
    );
    return errors;
  }

  const dimension = UNITS[unit].dimension;
  if (!kindAcceptsDimension(kind, dimension)) {
    const allowed = QUANTITY_KIND_DIMENSIONS[kind] ?? [];
    errors.push(
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: at,
        validatorId: 'unit.dimension_match',
        message: `a quantity of kind "${kind}" cannot carry the unit "${unit}" (dimension ${dimension}); it accepts ${allowed.length > 0 ? allowed.join(', ') : 'no dimension'}.`,
      }),
    );
  }

  return errors;
}

/**
 * Whether two quantities may share one numeric axis.
 *
 * Equal array length is not a reason to put two signals on the same axis. A calcium
 * concentration and a membrane potential are both "numbers over time" and mean
 * entirely different things; overlaying them produces a picture that looks like a
 * comparison and is not one.
 */
export function axesAreCompatible(unitA: string, unitB: string): boolean {
  if (typeof unitA !== 'string' || typeof unitB !== 'string') return false;
  const a = dimensionOf(unitA);
  const b = dimensionOf(unitB);
  if (a === undefined || b === undefined) return false;
  // Two simulator-defined units are NOT compatible, even with each other: their
  // meanings come from models that may differ.
  if (a === 'simulator_defined' || b === 'simulator_defined') return false;
  return a === b;
}

/** The display label for a unit ("" for the dimensionless unit). */
export function unitLabel(code: string): string {
  return typeof code === 'string' && isKnownUnit(code) ? UNITS[code].label : '';
}

/**
 * The reciprocal unit a density over this axis must carry.
 *
 * A density is not dimensionless: an ISI density binned in milliseconds has the
 * unit ms^-1, and labelling it "probability" would overstate what it is.
 */
export function reciprocalUnit(code: string): string | undefined {
  if (typeof code !== 'string') return undefined;
  const reciprocal = `/${code}`;
  return isKnownUnit(reciprocal) ? reciprocal : undefined;
}
