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
