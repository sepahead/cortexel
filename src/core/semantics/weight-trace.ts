/** Cross-field laws for the revision-2 synaptic-weight trace contract. */

import type { ErrorCode, ErrorStage } from '../../generated/registry.js';
import { MAX_ERROR_RECORDS, makeError, pointer, type CortexelError } from '../errors.js';
import { binary64RelativeDifferenceWithinEpsilons } from '../exact-binary64.js';
import {
  compareExactUnitSumToValue,
  convertDifference,
  convertExactUnitSum,
  dimensionOf,
  isKnownUnit,
  kindAcceptsDimension,
} from '../units.js';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  getData,
  getParameters,
  type SemanticValidator,
} from './types.js';
import { validateUncertaintyNode } from './uncertainty.js';

const VALIDATOR_ID = 'weight_trace.observation_kind_declared';
const EFFECT_RELATIVE_EPSILON_MULTIPLES = 8;

class BoundedWeightTraceErrors extends Array<CortexelError> {
  override push(...items: CortexelError[]): number {
    const remaining = Math.max(0, MAX_ERROR_RECORDS - this.length);
    if (remaining > 0) super.push(...items.slice(0, remaining));
    return this.length;
  }
}

interface TimeWitness {
  readonly value: number;
  readonly unit: string;
  readonly path: readonly (string | number)[];
}

interface QuantityWitness {
  readonly value: number;
  readonly unit: string;
  readonly path: readonly (string | number)[];
}

function issue(
  code: ErrorCode,
  stage: ErrorStage,
  path: readonly (string | number)[],
  message: string,
): CortexelError {
  return makeError({
    code,
    stage,
    instancePath: pointer(...path),
    validatorId: VALIDATOR_ID,
    message,
  });
}

function records(value: unknown): Record<string, unknown>[] {
  return (asArray(value) ?? []).flatMap((candidate) => {
    const record = asRecord(candidate);
    return record === undefined ? [] : [record];
  });
}

function finiteNumbers(value: unknown): number[] {
  return (asArray(value) ?? []).flatMap((candidate) => {
    const number = asNumber(candidate);
    return number === undefined ? [] : [number];
  });
}

function quantityArrayWitnesses(
  values: unknown,
  unit: string | undefined,
  path: readonly (string | number)[],
): QuantityWitness[] {
  if (unit === undefined) return [];
  return (asArray(values) ?? []).flatMap((candidate, index) => {
    const value = asNumber(candidate);
    return value === undefined ? [] : [{ value, unit, path: [...path, index] }];
  });
}

function quantityScalarWitness(
  quantity: Record<string, unknown> | undefined,
  path: readonly (string | number)[],
): QuantityWitness[] {
  const value = asNumber(quantity?.value);
  const unit = asString(quantity?.unit);
  return value === undefined || unit === undefined
    ? []
    : [{ value, unit, path: [...path, 'value'] }];
}

function convertScalar(
  value: number,
  unit: string,
  targetUnit: string,
  path: readonly (string | number)[],
  errors: CortexelError[],
): number | undefined {
  const sourceDimension = dimensionOf(unit);
  const targetDimension = dimensionOf(targetUnit);
  if (sourceDimension === undefined || targetDimension === undefined) return undefined;
  if (unit === targetUnit) return value;
  if (sourceDimension !== targetDimension || sourceDimension === 'simulator_defined') {
    return undefined;
  }
  try {
    return convertExactUnitSum([{ value, unit }], targetUnit);
  } catch {
    errors.push(
      issue(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        'science',
        path,
        `the declared ${unit} value cannot be converted once into ${targetUnit} as a finite nonzero binary64 value. Choose a better-scaled registered unit.`,
      ),
    );
    return undefined;
  }
}

function convertTimes(
  quantity: Record<string, unknown>,
  targetUnit: string,
  path: readonly (string | number)[],
  errors: CortexelError[],
): number[] | undefined {
  const unit = asString(quantity.unit);
  if (unit === undefined) return undefined;
  const values = finiteNumbers(quantity.values);
  const converted: number[] = [];
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    const result = convertScalar(value, unit, targetUnit, [...path, index], errors);
    if (result === undefined) return undefined;
    converted.push(result);
  }
  return converted;
}

function comparePhysicalTimes(left: TimeWitness, right: TimeWitness): -1 | 0 | 1 {
  return compareExactUnitSumToValue(
    [{ value: left.value, unit: left.unit }],
    { value: right.value, unit: right.unit },
  );
}

function compareDeclaredQuantities(
  left: number,
  leftUnit: string,
  right: number,
  rightUnit: string,
): -1 | 0 | 1 | undefined {
  if (leftUnit === rightUnit) return left < right ? -1 : left > right ? 1 : 0;
  const dimension = dimensionOf(leftUnit);
  if (
    dimension === undefined ||
    dimension === 'simulator_defined' ||
    dimensionOf(rightUnit) !== dimension
  ) return undefined;
  try {
    return compareExactUnitSumToValue(
      [{ value: left, unit: leftUnit }],
      { value: right, unit: rightUnit },
    );
  } catch {
    return undefined;
  }
}

/**
 * Correctly rounded positive unit conversion is monotone. Therefore every exact ordering
 * decision is preserved if and only if no two unequal decision-critical quantities collide
 * at one displayed binary64 value. Grouping by the rounded value makes this check O(n log n)
 * with only O(n) exact BigInt comparisons, including arbitrarily large equal-time groups.
 */
function validateDecisionTimeEmbedding(
  witnesses: readonly TimeWitness[],
  targetUnit: string,
  errors: CortexelError[],
): void {
  const converted: { readonly witness: TimeWitness; readonly value: number }[] = [];
  for (const witness of witnesses) {
    const value = convertScalar(witness.value, witness.unit, targetUnit, witness.path, errors);
    if (value === undefined) return;
    converted.push({ witness, value });
  }
  converted.sort((left, right) =>
    left.value < right.value ? -1 : left.value > right.value ? 1 : 0);
  for (let start = 0; start < converted.length;) {
    let stop = start + 1;
    while (stop < converted.length && converted[stop].value === converted[start].value) stop++;
    const reference = converted[start].witness;
    for (let index = start + 1; index < stop; index++) {
      const candidate = converted[index].witness;
      let comparison: -1 | 0 | 1;
      try {
        comparison = comparePhysicalTimes(reference, candidate);
      } catch {
        errors.push(
          issue(
            'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
            'science',
            candidate.path,
            `Cortexel could not compare this decision-critical time exactly with ${pointer(...reference.path)} after registered-unit conversion. Membership, recording, or window inclusion must not proceed without an exact ordering witness.`,
          ),
        );
        return;
      }
      if (comparison !== 0) {
        errors.push(
          issue(
            'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
            'science',
            candidate.path,
            `this decision-critical time is physically distinct from ${pointer(...reference.path)}, but both round to ${converted[start].value} ${targetUnit}. Membership, recording, or window inclusion would become representation-dependent; choose a better-scaled registered time unit.`,
          ),
        );
        return;
      }
    }
    start = stop;
  }
}

function validateTimeVectorFidelity(
  quantity: Record<string, unknown>,
  targetUnit: string,
  path: readonly (string | number)[],
  errors: CortexelError[],
): void {
  const sourceUnit = asString(quantity.unit);
  if (sourceUnit === undefined || sourceUnit === targetUnit) return;
  const source = finiteNumbers(quantity.values);
  const pairs: { readonly source: number; readonly converted: number; readonly index: number }[] = [];
  for (let index = 0; index < source.length; index++) {
    const converted = convertScalar(source[index], sourceUnit, targetUnit, [...path, index], errors);
    if (converted === undefined) return;
    pairs.push({ source: source[index], converted, index });
  }
  pairs.sort((left, right) => left.source - right.source || left.converted - right.converted);
  for (let index = 1; index < pairs.length; index++) {
    const previous = pairs[index - 1];
    const current = pairs[index];
    if (!(current.source > previous.source)) continue;
    let expected: number;
    try {
      expected = convertDifference(previous.source, current.source, sourceUnit, targetUnit);
    } catch {
      errors.push(
        issue(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          [...path, current.index],
          `the spacing from ${pointer(...path, previous.index)} cannot be represented exactly enough in ${targetUnit}. Choose a better-scaled registered time unit.`,
        ),
      );
      return;
    }
    const actual = current.converted - previous.converted;
    if (
      !(current.converted > previous.converted) ||
      !Number.isFinite(actual) ||
      !binary64RelativeDifferenceWithinEpsilons(
        expected,
        actual,
        EFFECT_RELATIVE_EPSILON_MULTIPLES,
      )
    ) {
      errors.push(
        issue(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          [...path, current.index],
          `the distinct ${sourceUnit} times at ${pointer(...path, previous.index)} and ${pointer(...path, current.index)} are materially distorted after conversion to ${targetUnit}. Choose a better-scaled registered time unit.`,
        ),
      );
      return;
    }
  }
}

function legalSynapticWeightUnit(unit: string | undefined): string | undefined {
  if (unit === undefined || !isKnownUnit(unit)) return undefined;
  const dimension = dimensionOf(unit);
  return dimension !== undefined && kindAcceptsDimension('synaptic_weight', dimension)
    ? unit
    : undefined;
}

function validateQuantityArrayFidelity(
  quantity: Record<string, unknown> | undefined,
  targetUnit: string | undefined,
  path: readonly (string | number)[],
  carrierLabel: string,
  errors: CortexelError[],
): void {
  const sourceUnit = asString(quantity?.unit);
  if (quantity === undefined || sourceUnit === undefined || targetUnit === undefined) return;
  const sourceDimension = dimensionOf(sourceUnit);
  const targetDimension = dimensionOf(targetUnit);
  // Canonical unit validation owns aliases and unknown codes. Relational checks must
  // not reinterpret one invalid carrier as the shared axis and multiply the error.
  if (sourceDimension === undefined || targetDimension === undefined) return;
  const sourceKind = asString(quantity.kind);
  if (sourceKind !== undefined && !kindAcceptsDimension(sourceKind, sourceDimension)) return;
  if (
    sourceUnit !== targetUnit &&
    (
      sourceDimension !== targetDimension ||
      sourceDimension === 'simulator_defined'
    )
  ) {
    errors.push(
      issue(
        'SCIENCE_UNIT_DIMENSION_MISMATCH',
        'science',
        [...path.slice(0, -1), 'unit'],
        `${carrierLabel} in ${sourceUnit} cannot be placed on the ${targetUnit} weight axis. Simulator-defined units are convertible only by exact code identity.`,
      ),
    );
    return;
  }

  const pairs: { readonly source: number; readonly converted: number; readonly index: number }[] = [];
  const values = asArray(quantity.values) ?? [];
  for (let index = 0; index < values.length; index++) {
    const source = asNumber(values[index]);
    if (source === undefined) continue;
    const converted = convertScalar(source, sourceUnit, targetUnit, [...path, index], errors);
    if (converted === undefined) return;
    pairs.push({ source, converted, index });
  }
  if (sourceUnit === targetUnit) return;
  pairs.sort((left, right) =>
    left.source < right.source ? -1 : left.source > right.source ? 1 : 0);
  for (let index = 1; index < pairs.length; index++) {
    const previous = pairs[index - 1];
    const current = pairs[index];
    if (!(current.source > previous.source)) continue;
    let expected: number;
    try {
      expected = convertDifference(previous.source, current.source, sourceUnit, targetUnit);
    } catch {
      errors.push(
        issue(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          [...path, current.index],
          `the ${carrierLabel} spacing from ${pointer(...path, previous.index)} cannot be represented in ${targetUnit}. Choose a better-scaled registered weight unit.`,
        ),
      );
      return;
    }
    const actual = current.converted - previous.converted;
    if (
      !(current.converted > previous.converted) ||
      !Number.isFinite(actual) ||
      !binary64RelativeDifferenceWithinEpsilons(
        expected,
        actual,
        EFFECT_RELATIVE_EPSILON_MULTIPLES,
      )
    ) {
      errors.push(
        issue(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          [...path, current.index],
          `distinct ${sourceUnit} ${carrierLabel} values at ${pointer(...path, previous.index)} and ${pointer(...path, current.index)} collapse or are materially distorted on the ${targetUnit} display axis. Choose a better-scaled registered weight unit.`,
        ),
      );
      return;
    }
  }
}

function validateWeightScalarQuantity(
  quantity: Record<string, unknown> | undefined,
  targetUnit: string | undefined,
  path: readonly (string | number)[],
  carrierLabel: string,
  errors: CortexelError[],
): number | undefined {
  const value = asNumber(quantity?.value);
  const sourceUnit = asString(quantity?.unit);
  if (value === undefined || sourceUnit === undefined || targetUnit === undefined) return undefined;
  const sourceDimension = dimensionOf(sourceUnit);
  const targetDimension = dimensionOf(targetUnit);
  if (sourceDimension === undefined || targetDimension === undefined) return undefined;
  const sourceKind = asString(quantity?.kind);
  if (sourceKind !== undefined && !kindAcceptsDimension(sourceKind, sourceDimension)) {
    return undefined;
  }
  if (
    sourceUnit !== targetUnit &&
    (
      sourceDimension !== targetDimension ||
      sourceDimension === 'simulator_defined'
    )
  ) {
    errors.push(
      issue(
        'SCIENCE_UNIT_DIMENSION_MISMATCH',
        'science',
        [...path, 'unit'],
        `${carrierLabel} in ${sourceUnit} cannot be placed on the ${targetUnit} weight axis. Simulator-defined units are convertible only by exact code identity.`,
      ),
    );
    return undefined;
  }
  return convertScalar(value, sourceUnit, targetUnit, [...path, 'value'], errors);
}

function validateUncertaintyAxisFidelity(
  uncertainty: Record<string, unknown> | undefined,
  targetUnit: string | undefined,
  path: readonly (string | number)[],
  errors: CortexelError[],
): void {
  const kind = asString(uncertainty?.kind);
  if (uncertainty === undefined || kind === undefined || kind === 'none') return;
  const keys = kind === 'standard_deviation' || kind === 'standard_error'
    ? ['values'] as const
    : ['lower', 'upper'] as const;
  for (const key of keys) {
    validateQuantityArrayFidelity(
      { unit: uncertainty.unit, values: uncertainty[key] },
      targetUnit,
      [...path, key],
      `uncertainty ${key}`,
      errors,
    );
  }
}

function validateWeightAxisEmbedding(
  witnesses: readonly QuantityWitness[],
  targetUnit: string | undefined,
  errors: CortexelError[],
): void {
  if (targetUnit === undefined || witnesses.length < 2) return;
  const units = new Set(witnesses.map(({ unit }) => unit));
  if (units.size === 1 && units.has(targetUnit)) return;

  const converted: { readonly witness: QuantityWitness; readonly value: number }[] = [];
  for (const witness of witnesses) {
    if (
      witness.unit !== targetUnit &&
      (
        dimensionOf(witness.unit) !== dimensionOf(targetUnit) ||
        dimensionOf(witness.unit) === 'simulator_defined'
      )
    ) return; // The carrier-specific validator already emitted the precise unit error.
    const value = convertScalar(
      witness.value,
      witness.unit,
      targetUnit,
      witness.path,
      errors,
    );
    if (value === undefined) return;
    converted.push({ witness, value });
  }
  converted.sort((left, right) =>
    left.value < right.value ? -1 : left.value > right.value ? 1 : 0);
  for (let index = 1; index < converted.length; index++) {
    const left = converted[index - 1];
    const right = converted[index];
    let exactOrder: -1 | 0 | 1;
    try {
      exactOrder = compareExactUnitSumToValue(
        [{ value: left.witness.value, unit: left.witness.unit }],
        { value: right.witness.value, unit: right.witness.unit },
      );
    } catch {
      errors.push(
        issue(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          right.witness.path,
          `Cortexel could not compare this weight-axis carrier exactly with ${pointer(...left.witness.path)}. The shared display axis must preserve cross-carrier ordering.`,
        ),
      );
      return;
    }
    if (exactOrder === 0) {
      if (right.value !== left.value) {
        errors.push(
          issue(
            'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
            'science',
            right.witness.path,
            `this carrier is physically equal to ${pointer(...left.witness.path)} but the two convert to different ${targetUnit} values. The shared axis would be representation-dependent.`,
          ),
        );
        return;
      }
      continue;
    }
    if (exactOrder > 0 || !(right.value > left.value)) {
      errors.push(
        issue(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          right.witness.path,
          `this carrier and ${pointer(...left.witness.path)} have a different exact physical order than their ${targetUnit} axis values. Choose a better-scaled registered weight unit.`,
        ),
      );
      return;
    }
    let expected: number;
    try {
      expected = convertExactUnitSum([
        { value: right.witness.value, unit: right.witness.unit },
        { value: -left.witness.value, unit: left.witness.unit },
      ], targetUnit);
    } catch {
      errors.push(
        issue(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          right.witness.path,
          `the exact physical spacing from ${pointer(...left.witness.path)} cannot be represented as a finite nonzero ${targetUnit} difference. Choose a better-scaled registered weight unit.`,
        ),
      );
      return;
    }
    const actual = right.value - left.value;
    if (
      !(expected > 0) ||
      !Number.isFinite(actual) ||
      !binary64RelativeDifferenceWithinEpsilons(
        expected,
        actual,
        EFFECT_RELATIVE_EPSILON_MULTIPLES,
      )
    ) {
      errors.push(
        issue(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          right.witness.path,
          `the cross-carrier spacing from ${pointer(...left.witness.path)} is materially distorted on the ${targetUnit} axis. Choose a better-scaled registered weight unit.`,
        ),
      );
      return;
    }
  }
}

function convertOrderedInterval(
  start: number,
  stop: number,
  sourceUnit: string,
  targetUnit: string,
  path: readonly (string | number)[],
  errors: CortexelError[],
): { readonly start: number; readonly stop: number } | undefined {
  const convertedStart = convertScalar(start, sourceUnit, targetUnit, [...path, 'start'], errors);
  const convertedStop = convertScalar(stop, sourceUnit, targetUnit, [...path, 'stop'], errors);
  if (convertedStart === undefined || convertedStop === undefined) return undefined;
  let expectedWidth: number;
  try {
    expectedWidth = convertDifference(start, stop, sourceUnit, targetUnit);
  } catch {
    errors.push(
      issue(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        'science',
        path,
        `the positive ${sourceUnit} interval cannot be represented as one finite binary64 interval in ${targetUnit}. Choose a better-scaled registered time unit.`,
      ),
    );
    return undefined;
  }
  const actualWidth = convertedStop - convertedStart;
  if (
    !(expectedWidth > 0) ||
    !(convertedStop > convertedStart) ||
    !Number.isFinite(actualWidth) ||
    !binary64RelativeDifferenceWithinEpsilons(
      expectedWidth,
      actualWidth,
      EFFECT_RELATIVE_EPSILON_MULTIPLES,
    )
  ) {
    errors.push(
      issue(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        'science',
        path,
        `the positive ${sourceUnit} interval collapses or is materially distorted after conversion to ${targetUnit}. Choose a better-scaled registered time unit.`,
      ),
    );
    return undefined;
  }
  return { start: convertedStart, stop: convertedStop };
}

function validateComparability(
  models: readonly string[],
  parameters: Record<string, unknown>,
  errors: CortexelError[],
): void {
  const comparability = asRecord(parameters.weightComparability) ?? {};
  const mode = asString(comparability.mode);
  const distinctModels = new Set(models);
  const declaredModels = (asArray(comparability.comparableModels) ?? [])
    .flatMap((candidate) => typeof candidate === 'string' ? [candidate] : []);
  const declaredSet = new Set<string>();
  for (let index = 0; index < declaredModels.length; index++) {
    if (declaredSet.has(declaredModels[index])) {
      errors.push(
        issue(
          'SEMANTIC_DUPLICATE_ID',
          'semantic',
          ['parameters', 'weightComparability', 'comparableModels', index],
          'comparableModels is an exact set claim and may name each synapse model only once.',
        ),
      );
    }
    declaredSet.add(declaredModels[index]);
  }
  const matches =
    models.length > 0 &&
    (
      (mode === 'single_synapse_model' && distinctModels.size === 1) ||
      (
        mode === 'declared_comparable_models' &&
        declaredModels.length === declaredSet.size &&
        declaredSet.size === distinctModels.size &&
        [...distinctModels].every((model) => declaredSet.has(model))
      )
    );
  if (!matches) {
    errors.push(
      issue(
        'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
        'science',
        ['parameters', 'weightComparability'],
        'the comparability declaration must exactly match the distinct synapse models whose weights share this axis. Unit compatibility alone cannot establish model-level comparability.',
      ),
    );
  }
}

function validateNestedUncertainty(
  uncertainty: Record<string, unknown> | undefined,
  centralValues: readonly unknown[],
  path: readonly (string | number)[],
  errors: CortexelError[],
): void {
  if (uncertainty === undefined) return;
  errors.push(...validateUncertaintyNode(uncertainty, path, VALIDATOR_ID));
  const kind = asString(uncertainty.kind);
  if (kind === undefined || kind === 'none') return;
  if (kind === 'credible_interval') {
    errors.push(
      issue(
        'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
        'science',
        [...path, 'kind'],
        'credible intervals are refused because this contract has no independently verified posterior-attestation input.',
      ),
    );
  }
  const keys = kind === 'standard_deviation' || kind === 'standard_error'
    ? ['values', 'sampleCount'] as const
    : ['lower', 'upper', 'sampleCount'] as const;
  for (const key of keys) {
    const values = asArray(uncertainty[key]);
    if (values !== undefined && values.length !== centralValues.length) {
      errors.push(
        issue(
          'SEMANTIC_LENGTH_MISMATCH',
          'semantic',
          [...path, key],
          `uncertainty.${key} has ${values.length} entries for ${centralValues.length} central observations.`,
        ),
      );
    }
  }
  for (let index = 0; index < centralValues.length; index++) {
    if (centralValues[index] !== null) continue;
    for (const key of keys) {
      const values = asArray(uncertainty[key]);
      if (values !== undefined && index < values.length && values[index] !== null) {
        errors.push(
          issue(
            'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
            'science',
            [...path, key, index],
            `uncertainty.${key} cannot qualify a missing central observation; it must be null at the same index.`,
          ),
        );
        break;
      }
    }
  }
}

function validatePreaggregatedAggregateUncertainty(
  aggregate: Record<string, unknown>,
  uncertainty: Record<string, unknown> | undefined,
  errors: CortexelError[],
): void {
  const kind = asString(uncertainty?.kind);
  if (kind !== 'ensemble_range' && kind !== 'quantile_interval') return;
  const central = asArray(asRecord(aggregate.values)?.values) ?? [];
  const centralUnit = asString(asRecord(aggregate.values)?.unit);
  const lower = asArray(uncertainty?.lower) ?? [];
  const upper = asArray(uncertainty?.upper) ?? [];
  const sampleCount = asArray(uncertainty?.sampleCount) ?? [];
  const uncertaintyUnit = asString(uncertainty?.unit);
  const method = asString(aggregate.method);
  const lowerQuantile = asNumber(uncertainty?.lowerQuantile);
  const upperQuantile = asNumber(uncertainty?.upperQuantile);
  if (centralUnit === undefined || uncertaintyUnit === undefined || method === undefined) return;

  const reject = (index: number, key: 'lower' | 'upper', law: string): void => {
    errors.push(
      issue(
        'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
        'science',
        ['data', 'aggregate', 'uncertainty', key, index],
        `the caller-declared ${kind} contradicts the caller-declared ${method} aggregate at index ${index}: ${law}. Cortexel cannot re-derive omitted members, but mutually impossible summary claims must fail closed.`,
      ),
    );
  };

  const length = Math.min(central.length, lower.length, upper.length);
  for (let index = 0; index < length; index++) {
    const value = asNumber(central[index]);
    const lo = asNumber(lower[index]);
    const hi = asNumber(upper[index]);
    if (value === undefined || lo === undefined || hi === undefined) continue;
    const toLower = compareDeclaredQuantities(value, centralUnit, lo, uncertaintyUnit);
    const toUpper = compareDeclaredQuantities(value, centralUnit, hi, uncertaintyUnit);
    if (toLower === undefined || toUpper === undefined) continue;

    if (sampleCount[index] === 1) {
      if (toLower !== 0) {
        reject(index, 'lower', 'with one contributing member, every aggregate and every empirical interval endpoint must equal that one member');
        return;
      }
      if (toUpper !== 0) {
        reject(index, 'upper', 'with one contributing member, every aggregate and every empirical interval endpoint must equal that one member');
        return;
      }
      continue;
    }

    if (kind === 'ensemble_range') {
      if (method === 'min' && toLower !== 0) {
        reject(index, 'lower', 'an observed ensemble range must begin at the declared minimum');
        return;
      }
      if (method === 'max' && toUpper !== 0) {
        reject(index, 'upper', 'an observed ensemble range must end at the declared maximum');
        return;
      }
      if ((method === 'mean' || method === 'median') && toLower < 0) {
        reject(index, 'lower', `a finite-sample ${method} cannot lie below the observed minimum`);
        return;
      }
      if ((method === 'mean' || method === 'median') && toUpper > 0) {
        reject(index, 'upper', `a finite-sample ${method} cannot lie above the observed maximum`);
        return;
      }
      continue;
    }

    if (method === 'min') {
      if (toLower > 0) {
        reject(index, 'lower', 'an empirical quantile cannot lie below the declared minimum');
        return;
      }
      if (lowerQuantile === 0 && toLower !== 0) {
        reject(index, 'lower', 'the Type-7 zero quantile must equal the declared minimum');
        return;
      }
    } else if (method === 'max') {
      if (toUpper < 0) {
        reject(index, 'upper', 'an empirical quantile cannot lie above the declared maximum');
        return;
      }
      if (upperQuantile === 1 && toUpper !== 0) {
        reject(index, 'upper', 'the Type-7 unit quantile must equal the declared maximum');
        return;
      }
    } else if (method === 'median' && lowerQuantile !== undefined && upperQuantile !== undefined) {
      if (lowerQuantile === 0.5 && toLower !== 0) {
        reject(index, 'lower', 'the Type-7 0.5 quantile must equal the declared Type-7 median');
        return;
      }
      if (upperQuantile === 0.5 && toUpper !== 0) {
        reject(index, 'upper', 'the Type-7 0.5 quantile must equal the declared Type-7 median');
        return;
      }
      if (lowerQuantile < 0.5 && upperQuantile > 0.5 && toLower < 0) {
        reject(index, 'lower', 'a quantile interval straddling 0.5 cannot begin above the declared median');
        return;
      }
      if (lowerQuantile < 0.5 && upperQuantile > 0.5 && toUpper > 0) {
        reject(index, 'upper', 'a quantile interval straddling 0.5 cannot end below the declared median');
        return;
      }
      if (upperQuantile < 0.5 && toUpper < 0) {
        reject(index, 'upper', 'a quantile below 0.5 cannot exceed the declared median');
        return;
      }
      if (lowerQuantile > 0.5 && toLower > 0) {
        reject(index, 'lower', 'a quantile above 0.5 cannot be below the declared median');
        return;
      }
    } else if (method === 'mean') {
      if (lowerQuantile === 0 && toLower < 0) {
        reject(index, 'lower', 'the observed minimum cannot exceed the finite-sample mean');
        return;
      }
      if (upperQuantile === 1 && toUpper > 0) {
        reject(index, 'upper', 'the observed maximum cannot be below the finite-sample mean');
        return;
      }
    }
  }
}

function validateIncreasingWindowTimes(
  times: readonly number[],
  window: Record<string, unknown>,
  path: readonly (string | number)[],
  errors: CortexelError[],
): void {
  for (let index = 1; index < times.length; index++) {
    if (!(times[index] > times[index - 1])) {
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          [...path, index],
          'aggregate evaluation times must be strictly increasing after exact registered-unit conversion. Cortexel does not sort or deduplicate a caller-authored aggregate grid.',
        ),
      );
    }
  }
  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  const closedStop = asString(window.boundary) === '[start,stop]';
  if (start === undefined || stop === undefined) return;
  for (let index = 0; index < times.length; index++) {
    const time = times[index];
    if (time < start || time > stop || (!closedStop && time === stop)) {
      errors.push(
        issue(
          'SCIENCE_EVENT_OUT_OF_WINDOW',
          'science',
          [...path, index],
          'an aggregate evaluation time lies outside the declared analysis window. It must be rejected, not silently filtered from the figure.',
        ),
      );
    }
  }
}

/**
 * The historical id is retained for compatibility, but revision 2 owns the complete
 * observation/membership/denominator coherence boundary for this skill.
 */
export const weightTraceObservationKindDeclared: SemanticValidator = (context) => {
  if (context.skillId !== 'network.synaptic_weight_trace') return [];

  const data = getData(context);
  const parameters = getParameters(context);
  const mode = asString(data.mode);
  const display = asString(parameters.display);
  const window = asRecord(data.window) ?? {};
  const windowUnit = asString(window.unit);
  const errors: CortexelError[] = new BoundedWeightTraceErrors();

  if (mode === 'preaggregated') {
    if (display !== 'aggregate_declared') {
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          ['parameters', 'display'],
          'preaggregated input is accepted only with aggregate_declared display. It cannot be relabelled as a Cortexel-derived or individual view.',
        ),
      );
    }
    const aggregate = asRecord(data.aggregate) ?? {};
    const aggregateModel = asString(aggregate.synapseModel);
    if (aggregateModel !== undefined) {
      validateComparability([aggregateModel], parameters, errors);
    }
    const observation = asRecord(aggregate.observation) ?? {};
    if (
      observation.kind === 'interpolated_trajectory' &&
      asString(observation.interpolant) !== 'linear'
    ) {
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          ['data', 'aggregate', 'observation', 'interpolant'],
          'revision 2 can render and authority-bind only a caller-supplied linear reconstruction. A non-linear interpolant must not be silently drawn as straight segments.',
        ),
      );
    }
    const intervalMethod = asString(aggregate.intervalMethod);
    if (
      (intervalMethod === 'hold_last_observed' && observation.kind !== 'event_updated') ||
      (intervalMethod === 'shared_sample_grid' && observation.kind !== 'point_sample')
    ) {
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          ['data', 'aggregate', 'intervalMethod'],
          'the preaggregated interval method contradicts the declared observation kind: holds require event-updated values and a shared grid requires point samples.',
        ),
      );
    }

    const time = asRecord(aggregate.time) ?? {};
    const rawTimeValues = asArray(time.values) ?? [];
    const rawAggregateValues = asArray(asRecord(aggregate.values)?.values) ?? [];
    const rawMemberCounts = asArray(aggregate.memberCounts) ?? [];
    const rawContributingCounts = asArray(aggregate.contributingCounts) ?? [];
    const aggregateLengths = [
      rawTimeValues.length,
      rawAggregateValues.length,
      rawMemberCounts.length,
      rawContributingCounts.length,
    ];
    if (aggregateLengths[0] === 0) {
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          ['data', 'aggregate', 'time', 'values'],
          'a caller-declared aggregate must contain at least one evaluation carrier. An empty array cannot produce a renderable or auditable aggregate figure.',
        ),
      );
    }
    if (!rawAggregateValues.some((value) => asNumber(value) !== undefined)) {
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          ['data', 'aggregate', 'values', 'values'],
          'a caller-declared aggregate must contain at least one finite displayed value. Revision 2 has no authority-bound empty-state figure for an all-missing aggregate.',
        ),
      );
    }
    if (aggregateLengths.some((length) => length !== aggregateLengths[0])) {
      errors.push(
        issue(
          'SEMANTIC_LENGTH_MISMATCH',
          'semantic',
          ['data', 'aggregate'],
          'preaggregated time, value, member-count, and contributing-count arrays must have identical lengths.',
        ),
      );
    }
    const declaredUncertainty = asRecord(aggregate.uncertainty);
    validateNestedUncertainty(
      declaredUncertainty,
      rawAggregateValues,
      ['data', 'aggregate', 'uncertainty'],
      errors,
    );
    validateUncertaintyAxisFidelity(
      declaredUncertainty,
      asString(asRecord(aggregate.values)?.unit),
      ['data', 'aggregate', 'uncertainty'],
      errors,
    );
    const aggregateValueUnit = legalSynapticWeightUnit(
      asString(asRecord(aggregate.values)?.unit),
    );
    const aggregateUncertaintyUnit = asString(declaredUncertainty?.unit);
    validateWeightAxisEmbedding(
      [
        ...quantityArrayWitnesses(
          rawAggregateValues,
          aggregateValueUnit,
          ['data', 'aggregate', 'values', 'values'],
        ),
        ...quantityArrayWitnesses(
          declaredUncertainty?.values,
          aggregateUncertaintyUnit,
          ['data', 'aggregate', 'uncertainty', 'values'],
        ),
        ...quantityArrayWitnesses(
          declaredUncertainty?.lower,
          aggregateUncertaintyUnit,
          ['data', 'aggregate', 'uncertainty', 'lower'],
        ),
        ...quantityArrayWitnesses(
          declaredUncertainty?.upper,
          aggregateUncertaintyUnit,
          ['data', 'aggregate', 'uncertainty', 'upper'],
        ),
      ],
      aggregateValueUnit,
      errors,
    );
    if (
      observation.kind === 'interpolated_trajectory' &&
      asString(declaredUncertainty?.kind) !== 'none'
    ) {
      errors.push(
        issue(
          'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
          'science',
          ['data', 'aggregate', 'uncertainty', 'kind'],
          'revision 2 does not define how uncertainty bounds are reconstructed between caller-supplied trajectory vertices. An interpolated trajectory therefore requires uncertainty:none.',
        ),
      );
    }
    if (windowUnit !== undefined) {
      const timeErrorCount = errors.length;
      validateTimeVectorFidelity(
        time,
        windowUnit,
        ['data', 'aggregate', 'time', 'values'],
        errors,
      );
      if (errors.length === timeErrorCount) {
        const converted = convertTimes(
          time,
          windowUnit,
          ['data', 'aggregate', 'time', 'values'],
          errors,
        );
        if (converted !== undefined) {
          validateIncreasingWindowTimes(
            converted,
            window,
            ['data', 'aggregate', 'time', 'values'],
            errors,
          );
        }
        const aggregateTimeUnit = asString(time.unit);
        const windowStart = asNumber(window.start);
        const windowStop = asNumber(window.stop);
        if (
          aggregateTimeUnit !== undefined &&
          windowStart !== undefined &&
          windowStop !== undefined
        ) {
          validateDecisionTimeEmbedding(
            [
              ...finiteNumbers(time.values).map((value, index) => ({
                value,
                unit: aggregateTimeUnit,
                path: ['data', 'aggregate', 'time', 'values', index] as const,
              })),
              { value: windowStart, unit: windowUnit, path: ['data', 'window', 'start'] },
              { value: windowStop, unit: windowUnit, path: ['data', 'window', 'stop'] },
            ],
            windowUnit,
            errors,
          );
        }
      }
    }

    const values = rawAggregateValues;
    const memberCounts = finiteNumbers(aggregate.memberCounts);
    const contributingCounts = finiteNumbers(aggregate.contributingCounts);
    const length = Math.min(values.length, memberCounts.length, contributingCounts.length);
    for (let index = 0; index < length; index++) {
      if (errors.length >= MAX_ERROR_RECORDS) break;
      const memberCount = memberCounts[index];
      const contributingCount = contributingCounts[index];
      if (!Number.isSafeInteger(memberCount) || memberCount < 0) {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['data', 'aggregate', 'memberCounts', index],
            'memberCount must be a non-negative safe integer. A rounded binary64 cardinality is not an auditable synapse count.',
          ),
        );
      }
      if (!Number.isSafeInteger(contributingCount) || contributingCount < 0) {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['data', 'aggregate', 'contributingCounts', index],
            'contributingCount must be a non-negative safe integer. A rounded binary64 cardinality cannot define an aggregate denominator.',
          ),
        );
      }
      if (contributingCount > memberCount) {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['data', 'aggregate', 'contributingCounts', index],
            'contributingCount cannot exceed memberCount. A denominator cannot contain synapses outside the declared group at that time.',
          ),
        );
      }
      const missing = values[index] === null;
      if (missing !== (contributingCount === 0)) {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['data', 'aggregate', 'values', 'values', index],
            'for the offered aggregate methods, an aggregate value is null exactly when contributingCount is zero. Zero contributors cannot yield a measured zero, and positive contributors cannot yield an unexplained missing aggregate.',
          ),
        );
      }
    }
    const uncertaintyKind = asString(declaredUncertainty?.kind);
    if (uncertaintyKind === 'standard_error') {
      errors.push(
        issue(
          'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
          'science',
          ['data', 'aggregate', 'uncertainty', 'kind'],
          'standard error is inferential and is unsupported for an exact declared synapse ensemble. The request declares no sampling estimand, sampling design, exchangeability model, or repeat universe from which sampling variability could be derived.',
        ),
      );
    }
    if (uncertaintyKind === 'confidence_interval') {
      errors.push(
        issue(
          'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
          'science',
          ['data', 'aggregate', 'uncertainty', 'kind'],
          'a confidence interval is unsupported because this request carries no sampling estimand, sampling design, repeat universe, or coverage-generating procedure. Dispersion across the exact declared members is descriptive evidence, not a confidence procedure.',
        ),
      );
    }
    if (
      uncertaintyKind === 'standard_deviation' &&
      asString(aggregate.method) !== 'mean'
    ) {
      errors.push(
        issue(
          'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
          'science',
          ['data', 'aggregate', 'uncertainty', 'kind'],
          'standard deviation is dispersion about the mean and revision 2 renders it as mean plus or minus one SD. Centering that carrier on a median, minimum, or maximum would fabricate endpoints with no declared statistical meaning.',
        ),
      );
    }
    if (
      uncertaintyKind === 'quantile_interval' &&
      asString(declaredUncertainty?.method) !== 'empirical_type_7_linear'
    ) {
      errors.push(
        issue(
          'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
          'science',
          ['data', 'aggregate', 'uncertainty', 'method'],
          'revision 2 validates and discloses only empirical Type-7 quantiles; uncertainty.method must be empirical_type_7_linear.',
        ),
      );
    }
    if (declaredUncertainty !== undefined && uncertaintyKind !== undefined && uncertaintyKind !== 'none') {
      if (asString(declaredUncertainty.basis) !== 'ensemble_members') {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['data', 'aggregate', 'uncertainty', 'basis'],
            'a declared aggregate uncertainty is dispersion across its contributing member synapses and must use the registered `ensemble_members` basis. Calling distinct synapses replicates would add an exchangeability claim the request does not establish.',
          ),
        );
      }
      const sampleCounts = asArray(declaredUncertainty.sampleCount);
      if (sampleCounts === undefined) {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['data', 'aggregate', 'uncertainty', 'sampleCount'],
            'a declared aggregate uncertainty must carry sampleCount at every evaluation time so its dispersion denominator can be checked against contributingCounts.',
          ),
        );
      } else {
        if (sampleCounts.length !== rawAggregateValues.length) {
          errors.push(
            issue(
              'SEMANTIC_LENGTH_MISMATCH',
              'semantic',
              ['data', 'aggregate', 'uncertainty', 'sampleCount'],
              `uncertainty.sampleCount has ${sampleCounts.length} entries for ${rawAggregateValues.length} aggregate observations.`,
            ),
          );
        }
        for (let index = 0; index < Math.min(sampleCounts.length, contributingCounts.length); index++) {
          if (errors.length >= MAX_ERROR_RECORDS) break;
          const minimumSampleCount = uncertaintyKind === 'standard_deviation' ? 2 : 1;
          const expected = contributingCounts[index] < minimumSampleCount
            ? null
            : contributingCounts[index];
          if (sampleCounts[index] !== expected) {
            errors.push(
              issue(
                'SCIENCE_NORMALIZATION_UNVERIFIABLE',
                'science',
                ['data', 'aggregate', 'uncertainty', 'sampleCount', index],
                `uncertainty.sampleCount must equal contributingCounts where the declared descriptive statistic is defined and be null otherwise; sample standard deviation requires at least two contributors, while empirical quantiles/ranges require one. Expected ${String(expected)} here.`,
              ),
            );
            break;
          }
        }
      }
    }
    validatePreaggregatedAggregateUncertainty(aggregate, declaredUncertainty, errors);
    return errors;
  }

  if (mode !== 'edges') return errors;
  if (display === 'aggregate_declared') {
    errors.push(
      issue(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        ['parameters', 'display'],
        'raw edge observations cannot use aggregate_declared display. Use a derived aggregate display or preaggregated input.',
      ),
    );
  }

  const series = records(data.series);
  validateComparability(
    series.flatMap((entry) => {
      const model = asString(entry.synapseModel);
      return model === undefined ? [] : [model];
    }),
    parameters,
    errors,
  );
  const edgeIds = new Set<string>();
  const timeGrids = new Map<string, { index: number; values: number[] }>();
  const decisionWitnessesByEdge = new Map<string, readonly TimeWitness[]>();
  const recordedIntervalsByEdge = new Map<string, { readonly start: number; readonly stop: number }>();
  const duplicateTimeEdges = new Set<string>();
  const excludedSourceTimeEdges = new Set<string>();
  const targetValueUnit = legalSynapticWeightUnit(
    asString(asRecord(series[0]?.values)?.unit),
  );
  const weightAxisWitnesses: QuantityWitness[] = [];
  for (let index = 0; index < series.length; index++) {
    if (errors.length >= MAX_ERROR_RECORDS) break;
    const edgeId = asString(series[index].edgeId);
    if (edgeId !== undefined && edgeIds.has(edgeId)) {
      errors.push(
        issue(
          'SEMANTIC_DUPLICATE_ID',
          'semantic',
          ['data', 'series', index, 'edgeId'],
          'each synapse series must have one unique edgeId. Duplicate identity would make membership resolution order-dependent.',
        ),
      );
    }
    if (edgeId !== undefined) edgeIds.add(edgeId);
    const timeLength = asArray(asRecord(series[index].time)?.values)?.length;
    const valueLength = asArray(asRecord(series[index].values)?.values)?.length;
    if (timeLength !== undefined && valueLength !== undefined && timeLength !== valueLength) {
      errors.push(
        issue(
          'SEMANTIC_LENGTH_MISMATCH',
          'semantic',
          ['data', 'series', index],
          'every synapse series must carry one weight entry for every time entry. This check applies to every series, not only the first catalog examples.',
        ),
      );
    }
    const eventKinds = asArray(series[index].eventKinds);
    if (eventKinds !== undefined && timeLength !== undefined && eventKinds.length !== timeLength) {
      errors.push(
        issue(
          'SEMANTIC_LENGTH_MISMATCH',
          'semantic',
          ['data', 'series', index, 'eventKinds'],
          `eventKinds has ${eventKinds.length} entries for ${timeLength} observation times. A missing event label cannot be shifted onto a different update.`,
        ),
      );
    }
    const valuesQuantity = asRecord(series[index].values);
    const valuesUnit = asString(valuesQuantity?.unit);
    const seriesUncertainty = asRecord(series[index].uncertainty);
    if (asString(seriesUncertainty?.kind) !== 'none') {
      errors.push(
        issue(
          'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
          'science',
          ['data', 'series', index, 'uncertainty', 'kind'],
          'revision 2 requires uncertainty:none on every identified raw edge. The request carries one synapse from one run but no aligned repeat universe, central estimator, or repeat-level values from which an SD, SE, interval, or bootstrap distribution could be verified.',
        ),
      );
    }
    validateNestedUncertainty(
      seriesUncertainty,
      asArray(valuesQuantity?.values) ?? [],
      ['data', 'series', index, 'uncertainty'],
      errors,
    );
    validateQuantityArrayFidelity(
      valuesQuantity,
      targetValueUnit,
      ['data', 'series', index, 'values', 'values'],
      'weight observation',
      errors,
    );
    validateUncertaintyAxisFidelity(
      seriesUncertainty,
      targetValueUnit,
      ['data', 'series', index, 'uncertainty'],
      errors,
    );
    weightAxisWitnesses.push(...quantityArrayWitnesses(
      valuesQuantity?.values,
      valuesUnit,
      ['data', 'series', index, 'values', 'values'],
    ));
    const uncertaintyUnit = asString(seriesUncertainty?.unit);
    for (const key of ['values', 'lower', 'upper'] as const) {
      weightAxisWitnesses.push(...quantityArrayWitnesses(
        seriesUncertainty?.[key],
        uncertaintyUnit,
        ['data', 'series', index, 'uncertainty', key],
      ));
    }
    const time = asRecord(series[index].time);
    const timeUnit = asString(time?.unit);
    const sourceTimes = finiteNumbers(time?.values);
    if (time !== undefined && windowUnit !== undefined) {
      validateTimeVectorFidelity(
        time,
        windowUnit,
        ['data', 'series', index, 'time', 'values'],
        errors,
      );
    }
    if (edgeId !== undefined) {
      const seenTimes = new Set<number>();
      for (const sourceTime of sourceTimes) {
        if (seenTimes.has(sourceTime)) duplicateTimeEdges.add(edgeId);
        seenTimes.add(sourceTime);
      }
    }
    const recorded = asRecord(series[index].recordedInterval);
    const start = asNumber(recorded?.start);
    const stop = asNumber(recorded?.stop);
    if (start !== undefined && stop !== undefined && !(start < stop)) {
      errors.push(
        issue(
          'SCIENCE_WINDOW_INVALID',
          'science',
          ['data', 'series', index, 'recordedInterval'],
          'a recorded interval must have start < stop. A reversed or empty observation span cannot silently become an empty trace.',
        ),
      );
    }
    const recordedUnit = asString(recorded?.unit);
    const windowStart = asNumber(window.start);
    const windowStop = asNumber(window.stop);
    let convertedRecordedStart: number | undefined;
    let convertedRecordedStop: number | undefined;
    if (
      start !== undefined &&
      stop !== undefined &&
      recordedUnit !== undefined &&
      windowUnit !== undefined &&
      windowStart !== undefined &&
      windowStop !== undefined &&
      start < stop
    ) {
      const convertedRecorded = convertOrderedInterval(
        start,
        stop,
        recordedUnit,
        windowUnit,
        ['data', 'series', index, 'recordedInterval'],
        errors,
      );
      convertedRecordedStart = convertedRecorded?.start;
      convertedRecordedStop = convertedRecorded?.stop;
      if (
        convertedRecordedStart !== undefined &&
        convertedRecordedStop !== undefined &&
        !(
          Math.min(windowStop, convertedRecordedStop) >
          Math.max(windowStart, convertedRecordedStart)
        )
      ) {
        errors.push(
          issue(
            'SCIENCE_WINDOW_INVALID',
            'science',
            ['data', 'series', index, 'recordedInterval'],
            'the recorded interval must have a positive-duration intersection with the analysis window. A trace cannot be compiled from a disjoint observation span.',
          ),
        );
      }
      if (
        edgeId !== undefined &&
        convertedRecordedStart !== undefined &&
        convertedRecordedStop !== undefined
      ) {
        recordedIntervalsByEdge.set(edgeId, {
          start: convertedRecordedStart,
          stop: convertedRecordedStop,
        });
      }
    }
    if (
      edgeId !== undefined &&
      timeUnit !== undefined &&
      recordedUnit !== undefined &&
      start !== undefined &&
      stop !== undefined &&
      windowUnit !== undefined &&
      windowStart !== undefined &&
      windowStop !== undefined
    ) {
      const witnesses: TimeWitness[] = [
        ...sourceTimes.map((value, timeIndex) => ({
          value,
          unit: timeUnit,
          path: ['data', 'series', index, 'time', 'values', timeIndex] as const,
        })),
        {
          value: start,
          unit: recordedUnit,
          path: ['data', 'series', index, 'recordedInterval', 'start'],
        },
        {
          value: stop,
          unit: recordedUnit,
          path: ['data', 'series', index, 'recordedInterval', 'stop'],
        },
        { value: windowStart, unit: windowUnit, path: ['data', 'window', 'start'] },
        { value: windowStop, unit: windowUnit, path: ['data', 'window', 'stop'] },
      ];
      validateDecisionTimeEmbedding(witnesses, windowUnit, errors);
    }
    if (
      edgeId !== undefined &&
      time !== undefined &&
      windowUnit !== undefined &&
      windowStart !== undefined &&
      windowStop !== undefined &&
      convertedRecordedStart !== undefined &&
      convertedRecordedStop !== undefined
    ) {
      const convertedTimes = convertTimes(
        time,
        windowUnit,
        ['data', 'series', index, 'time', 'values'],
        errors,
      );
      if (convertedTimes !== undefined) {
        const recordedClosed = asString(recorded?.boundary) === '[start,stop]';
        for (let timeIndex = 0; timeIndex < convertedTimes.length; timeIndex++) {
          const candidate = convertedTimes[timeIndex];
          if (
            candidate < convertedRecordedStart ||
            candidate > convertedRecordedStop ||
            (!recordedClosed && candidate === convertedRecordedStop)
          ) {
            errors.push(
              issue(
                'SCIENCE_EVENT_OUT_OF_WINDOW',
                'science',
                ['data', 'series', index, 'time', 'values', timeIndex],
                'a source observation lies outside its declared recordedInterval. Analysis-window filtering cannot repair a contradiction about when this synapse was actually observed.',
              ),
            );
            break;
          }
        }
        const lower = Math.max(windowStart, convertedRecordedStart);
        const upper = Math.min(windowStop, convertedRecordedStop);
        const windowClosed = asString(window.boundary) === '[start,stop]';
        const effectiveUpperClosed =
          (upper !== windowStop || windowClosed) &&
          (upper !== convertedRecordedStop || recordedClosed);
        const acceptedAt = (candidate: number): boolean =>
          candidate >= lower &&
          (candidate < upper || (effectiveUpperClosed && candidate === upper));
        const accepted = convertedTimes
          .filter(acceptedAt)
          .sort((left, right) => left - right)
          .filter((candidate, candidateIndex, all) =>
            candidateIndex === 0 || candidate !== all[candidateIndex - 1]);
        timeGrids.set(edgeId, { index, values: accepted });
        if (convertedTimes.some((candidate) => !acceptedAt(candidate))) {
          excludedSourceTimeEdges.add(edgeId);
        }
        const sourceWitnesses: TimeWitness[] = sourceTimes.map((value, timeIndex) => ({
          value,
          unit: timeUnit!,
          path: ['data', 'series', index, 'time', 'values', timeIndex],
        }));
        decisionWitnessesByEdge.set(edgeId, [
          ...sourceWitnesses,
          { value: start!, unit: recordedUnit!, path: ['data', 'series', index, 'recordedInterval', 'start'] },
          { value: stop!, unit: recordedUnit!, path: ['data', 'series', index, 'recordedInterval', 'stop'] },
          { value: windowStart, unit: windowUnit, path: ['data', 'window', 'start'] },
          { value: windowStop, unit: windowUnit, path: ['data', 'window', 'stop'] },
        ]);
      }
    }

    const lower = asRecord(asRecord(series[index].bounds)?.lower);
    const upper = asRecord(asRecord(series[index].bounds)?.upper);
    const lowerValue = asNumber(lower?.value);
    const upperValue = asNumber(upper?.value);
    const lowerUnit = asString(lower?.unit);
    const upperUnit = asString(upper?.unit);
    const initialQuantity = asRecord(asRecord(series[index].initialWeight)?.quantity);
    weightAxisWitnesses.push(
      ...quantityScalarWitness(
        initialQuantity,
        ['data', 'series', index, 'initialWeight', 'quantity'],
      ),
      ...quantityScalarWitness(
        lower,
        ['data', 'series', index, 'bounds', 'lower'],
      ),
      ...quantityScalarWitness(
        upper,
        ['data', 'series', index, 'bounds', 'upper'],
      ),
    );
    validateWeightScalarQuantity(
      initialQuantity,
      targetValueUnit,
      ['data', 'series', index, 'initialWeight', 'quantity'],
      'declared initial weight',
      errors,
    );
    const convertedLower = validateWeightScalarQuantity(
      lower,
      targetValueUnit,
      ['data', 'series', index, 'bounds', 'lower'],
      'declared lower weight bound',
      errors,
    );
    const convertedUpper = validateWeightScalarQuantity(
      upper,
      targetValueUnit,
      ['data', 'series', index, 'bounds', 'upper'],
      'declared upper weight bound',
      errors,
    );
    if (
      valuesUnit !== undefined &&
      lowerValue !== undefined &&
      upperValue !== undefined &&
      lowerUnit !== undefined &&
      upperUnit !== undefined
    ) {
      let exactOrder: -1 | 0 | 1 | undefined;
      if (lowerUnit === upperUnit) {
        exactOrder = lowerValue < upperValue ? -1 : lowerValue > upperValue ? 1 : 0;
      } else if (
        dimensionOf(lowerUnit) !== undefined &&
        dimensionOf(lowerUnit) !== 'simulator_defined' &&
        dimensionOf(lowerUnit) === dimensionOf(upperUnit)
      ) {
        try {
          exactOrder = compareExactUnitSumToValue(
            [{ value: lowerValue, unit: lowerUnit }],
            { value: upperValue, unit: upperUnit },
          );
        } catch {
          exactOrder = undefined;
        }
      }
      if (exactOrder === 1) {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['data', 'series', index, 'bounds'],
            'the declared lower reference bound exceeds the upper bound under exact registered-unit comparison. Rounded display conversion cannot erase this contradiction.',
          ),
        );
      } else if (
        exactOrder === -1 &&
        convertedLower !== undefined &&
        convertedUpper !== undefined
      ) {
        const physicalAxis = dimensionOf(targetValueUnit ?? valuesUnit) !== 'simulator_defined';
        let expectedWidth: number | undefined;
        if (physicalAxis) {
          try {
            expectedWidth = convertExactUnitSum([
              { value: upperValue, unit: upperUnit },
              { value: -lowerValue, unit: lowerUnit },
            ], targetValueUnit ?? valuesUnit);
          } catch {
            expectedWidth = undefined;
          }
        }
        const actualWidth = convertedUpper - convertedLower;
        if (
          !(convertedUpper > convertedLower) ||
          !Number.isFinite(actualWidth) ||
          (physicalAxis && expectedWidth === undefined) ||
          (expectedWidth !== undefined && (
            !(expectedWidth > 0) ||
            !binary64RelativeDifferenceWithinEpsilons(
              expectedWidth,
              actualWidth,
              EFFECT_RELATIVE_EPSILON_MULTIPLES,
            )
          ))
        ) {
          errors.push(
            issue(
              'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
              'science',
              ['data', 'series', index, 'bounds'],
              `the exactly ordered reference bounds collapse or are materially distorted on the ${targetValueUnit ?? valuesUnit} display axis. Choose a better-scaled registered weight unit.`,
            ),
          );
        }
      }
    }
  }

  validateWeightAxisEmbedding(weightAxisWitnesses, targetValueUnit, errors);

  const observation = asRecord(data.observation) ?? {};
  const duplicatePolicy = asString(asRecord(parameters.duplicateTimePolicy)?.policy) ??
    asString(parameters.duplicateTimePolicy);
  if (observation.kind === 'interpolated_trajectory') {
    if (asString(observation.interpolant) !== 'linear') {
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          ['data', 'observation', 'interpolant'],
          'revision 2 can render and authority-bind only a caller-supplied linear reconstruction. A non-linear interpolant must not be silently drawn as straight segments.',
        ),
      );
    }
    const eventKindSeries = series.findIndex((entry) => asArray(entry.eventKinds) !== undefined);
    if (eventKindSeries >= 0) {
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          ['data', 'series', eventKindSeries, 'eventKinds'],
          'interpolated trajectory points are caller reconstructions, not source events or observations. Their reconstruction carrier records method, interpolant, and author; eventKinds is forbidden rather than misrepresenting a reconstruction vertex as a source event.',
        ),
      );
    }
    if (excludedSourceTimeEdges.size > 0) {
      const seriesIndex = series.findIndex((entry) =>
        excludedSourceTimeEdges.has(asString(entry.edgeId) ?? ''));
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          ['data', 'series', Math.max(0, seriesIndex), 'time', 'values'],
          'revision 2 refuses to filter reconstruction vertices outside the effective analysis/recording window: an excluded linear knot can determine geometry inside the window. Pre-clip the trajectory upstream and declare the exact retained vertices.',
        ),
      );
    }
    if (duplicatePolicy === 'keep_replicates' && duplicateTimeEdges.size > 0) {
      errors.push(
        issue(
          'SCIENCE_DUPLICATE_TIME_POLICY',
          'science',
          ['parameters', 'duplicateTimePolicy'],
          'an interpolated trajectory must be a function of time. Two retained reconstruction vertices at one time cannot be kept as replicates; use a named duplicate aggregate or reject the request.',
        ),
      );
    }
  }
  if (
    duplicateTimeEdges.size > 0 &&
    observation.kind === 'event_updated'
  ) {
    errors.push(
      issue(
        'SCIENCE_DUPLICATE_TIME_POLICY',
        'science',
        ['parameters', 'duplicateTimePolicy'],
        'revision 2 refuses every event-updated duplicate timestamp. A single global before/after discriminator cannot identify the side or sequential event represented by each same-time row, and stable array order alone is not a scientific event-order claim.',
      ),
    );
  }
  if (
    duplicateTimeEdges.size > 0 &&
    observation.kind === 'point_sample' &&
    duplicatePolicy === 'keep_replicates'
  ) {
    errors.push(
      issue(
        'SCIENCE_DUPLICATE_TIME_POLICY',
        'science',
        ['parameters', 'duplicateTimePolicy'],
        'revision 2 cannot join repeated point samples at one time without inventing a within-time vertical trajectory or ordering. Collapse them by one named method or reject the figure; duplicate markers need a future explicit geometry carrier.',
      ),
    );
  }
  if (duplicatePolicy === 'aggregate') {
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
      const edgeId = asString(series[seriesIndex].edgeId);
      if (
        edgeId !== undefined &&
        duplicateTimeEdges.has(edgeId) &&
        asString(asRecord(series[seriesIndex].uncertainty)?.kind) !== 'none'
      ) {
        errors.push(
          issue(
            'SCIENCE_DUPLICATE_TIME_POLICY',
            'science',
            ['data', 'series', seriesIndex, 'uncertainty'],
            'a duplicate-time point aggregate cannot carry per-observation uncertainty: Cortexel has no declared model for propagating uncertainty from several source rows into the collapsed value.',
          ),
        );
        break;
      }
    }
  }
  const derived = display === 'aggregate_derived' || display === 'aggregate_derived_with_members';
  if (
    derived &&
    observation.kind === 'event_updated' &&
    observation.updateSemantics === 'value_before_update'
  ) {
    errors.push(
      issue(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        ['parameters', 'aggregate', 'evaluation'],
        'revision 2 derives hold aggregates only for value_after_update. A value-before aggregate needs side-qualified terminal and denominator-transition carriers to bind its trailing interval without painting a future state backward; those carriers do not yet exist.',
      ),
    );
  }
  const membership = asRecord(data.membership);
  if (derived && membership === undefined) {
    errors.push(
      issue(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        ['data', 'membership'],
        'a derived aggregate requires the exact identified membership and its intervals.',
      ),
    );
    return errors;
  }
  if (!derived && membership !== undefined) {
    errors.push(
      issue(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        ['data', 'membership'],
        'membership is meaningful only for a derived aggregate display. An individual view must not carry an unused denominator claim.',
      ),
    );
  }
  if (membership === undefined) return errors;

  const members = records(membership.members);
  const membershipUnit = asString(membership.unit);
  const groupId = asString(membership.groupId);
  if (groupId !== undefined && edgeIds.has(groupId)) {
    errors.push(
      issue(
        'SEMANTIC_DUPLICATE_ID',
        'semantic',
        ['data', 'membership', 'groupId'],
        'the aggregate groupId must not equal any member edgeId. Series identity is global within the figure table and geometry authority.',
      ),
    );
  }
  const memberIds = new Set<string>();
  const convertedMembershipByEdge = new Map<
    string,
    readonly { readonly start: number; readonly stop: number }[]
  >();
  const membershipWitnessesByEdge = new Map<string, readonly TimeWitness[]>();
  for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
    if (errors.length >= MAX_ERROR_RECORDS) break;
    const edgeId = asString(members[memberIndex].edgeId);
    if (edgeId !== undefined && memberIds.has(edgeId)) {
      errors.push(
        issue(
          'SEMANTIC_DUPLICATE_ID',
          'semantic',
          ['data', 'membership', 'members', memberIndex, 'edgeId'],
          'each aggregate member edgeId must appear exactly once. A Map overwrite is not a membership policy.',
        ),
      );
    }
    if (edgeId !== undefined) memberIds.add(edgeId);
    if (edgeId !== undefined && !edgeIds.has(edgeId)) {
      errors.push(
        issue(
          'SEMANTIC_UNKNOWN_REFERENCE',
          'semantic',
          ['data', 'membership', 'members', memberIndex, 'edgeId'],
          'an aggregate member must resolve to exactly one declared edge series.',
        ),
      );
    }
    const intervals = records(members[memberIndex].intervals);
    const convertedIntervals: { start: number; stop: number }[] = [];
    const intervalWitnesses: TimeWitness[] = [];
    let previousStop: number | undefined;
    for (let intervalIndex = 0; intervalIndex < intervals.length; intervalIndex++) {
      if (errors.length >= MAX_ERROR_RECORDS) break;
      const start = asNumber(intervals[intervalIndex].start);
      const stop = asNumber(intervals[intervalIndex].stop);
      if (start === undefined || stop === undefined) continue;
      if (!(start < stop)) {
        errors.push(
          issue(
            'SCIENCE_WINDOW_INVALID',
            'science',
            ['data', 'membership', 'members', memberIndex, 'intervals', intervalIndex],
            'membership intervals are half-open and must have start < stop. A reversed or empty interval cannot silently erase a member.',
          ),
        );
      }
      if (previousStop !== undefined && start < previousStop) {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['data', 'membership', 'members', memberIndex, 'intervals', intervalIndex],
            'membership intervals for one edge must be ordered and non-overlapping. Cortexel does not union or reorder caller-authored denominator spans.',
          ),
        );
      }
      if (membershipUnit !== undefined && windowUnit !== undefined && start < stop) {
        const intervalPath = [
          'data',
          'membership',
          'members',
          memberIndex,
          'intervals',
          intervalIndex,
        ] as const;
        const converted = convertOrderedInterval(
          start,
          stop,
          membershipUnit,
          windowUnit,
          intervalPath,
          errors,
        );
        if (converted !== undefined) convertedIntervals.push(converted);
        intervalWitnesses.push(
          { value: start, unit: membershipUnit, path: [...intervalPath, 'start'] },
          { value: stop, unit: membershipUnit, path: [...intervalPath, 'stop'] },
        );
      }
      previousStop = stop;
    }
    if (edgeId !== undefined) {
      convertedMembershipByEdge.set(edgeId, convertedIntervals);
      membershipWitnessesByEdge.set(edgeId, intervalWitnesses);
    }
  }
  const unusedSeriesIds = [...edgeIds].filter((edgeId) => !memberIds.has(edgeId));
  if (unusedSeriesIds.length > 0 || memberIds.size !== edgeIds.size) {
    errors.push(
      issue(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        ['data', 'membership', 'members'],
        `derived mode requires membership to select the exact data.series identity set. Unused raw series would enter the complete table and source-carrier counts without being drawn or influencing the aggregate${unusedSeriesIds.length > 0 ? `; unused ids: ${unusedSeriesIds.join(', ')}` : ''}.`,
      ),
    );
  }

  const aggregate = asRecord(parameters.aggregate) ?? {};
  const evaluation = asRecord(aggregate.evaluation) ?? {};
  const evaluationMode = asString(evaluation.mode);
  const selectedValueUnits = new Set(series.flatMap((entry) => {
    const edgeId = asString(entry.edgeId);
    const unit = asString(asRecord(entry.values)?.unit);
    return edgeId !== undefined && memberIds.has(edgeId) && unit !== undefined ? [unit] : [];
  }));
  if (selectedValueUnits.size > 1) {
    errors.push(
      issue(
        'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
        'science',
        ['parameters', 'weightComparability'],
        `a derived aggregate requires one exact weight unit code across every selected member; got ${[...selectedValueUnits].join(', ')}. Independently rounding heterogeneous units before pooling can erase real variation or double-round the statistic. Convert upstream under an explicit recorded transform.`,
      ),
    );
  }
  const initialWeightCanEnterDerivedHold = observation.kind === 'event_updated' && (
    evaluationMode === 'hold_last_observed_at_union_times' ||
    evaluationMode === 'hold_last_observed_at_declared_times'
  );
  if (initialWeightCanEnterDerivedHold) {
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
      const entry = series[seriesIndex];
      const edgeId = asString(entry.edgeId);
      if (edgeId === undefined || !memberIds.has(edgeId)) continue;
      const valueUnit = asString(asRecord(entry.values)?.unit);
      const initialUnit = asString(asRecord(asRecord(entry.initialWeight)?.quantity)?.unit);
      if (valueUnit !== undefined && initialUnit !== undefined && initialUnit !== valueUnit) {
        errors.push(
          issue(
            'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
            'science',
            ['data', 'series', seriesIndex, 'initialWeight', 'quantity', 'unit'],
            `a derived hold requires the declared initial weight to use the member series' exact unit code ${valueUnit}; got ${initialUnit}. Independently rounding an initial state before pooling can erase real variation or double-round the aggregate.`,
          ),
        );
        break;
      }
    }
  }
  const selectedDuplicateTime = [...memberIds].some((edgeId) => duplicateTimeEdges.has(edgeId));
  if (
    evaluationMode === 'shared_sample_grid' &&
    selectedDuplicateTime &&
    duplicatePolicy === 'keep_replicates'
  ) {
    errors.push(
      issue(
        'SCIENCE_DUPLICATE_TIME_POLICY',
        'science',
        ['parameters', 'duplicateTimePolicy'],
        'shared_sample_grid has no cross-synapse replicate identity with which to pair repeated samples at one timestamp. Aggregate the within-synapse point replicates by a named method first, or reject them; Cortexel will not pair them by array ordinal.',
      ),
    );
  }
  const dispersion = asRecord(aggregate.dispersion);
  const dispersionKind = asString(dispersion?.kind);
  if (
    dispersionKind === 'standard_error' ||
    dispersionKind === 'confidence_interval' ||
    dispersionKind === 'credible_interval'
  ) {
    errors.push(
      issue(
        'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
        'science',
        ['parameters', 'aggregate', 'dispersion', 'kind'],
        `${dispersionKind} is inferential and is unsupported for an exact declared synapse ensemble. The request declares no sampling estimand, sampling design, exchangeability model, repeat universe, coverage procedure, or verified posterior from which that carrier could be derived.`,
      ),
    );
  }
  if (
    dispersionKind === 'standard_deviation' &&
    asString(aggregate.method) !== 'mean'
  ) {
    errors.push(
      issue(
        'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
        'science',
        ['parameters', 'aggregate', 'dispersion', 'kind'],
        'standard deviation is dispersion about the mean and revision 2 renders it as mean plus or minus one SD. Centering that carrier on a median, minimum, or maximum would fabricate endpoints with no declared statistical meaning.',
      ),
    );
  }
  if (asString(dispersion?.kind) === 'quantile_interval') {
    const lowerQuantile = asNumber(dispersion?.lowerQuantile);
    const upperQuantile = asNumber(dispersion?.upperQuantile);
    if (
      lowerQuantile !== undefined &&
      upperQuantile !== undefined &&
      !(lowerQuantile < upperQuantile)
    ) {
      errors.push(
        issue(
          'SCIENCE_UNCERTAINTY_LEVEL_INVALID',
          'science',
          ['parameters', 'aggregate', 'dispersion', 'upperQuantile'],
          `the lower aggregate quantile (${lowerQuantile}) must be strictly below the upper quantile (${upperQuantile}).`,
        ),
      );
    }
  }
  if (
    ((evaluationMode === 'hold_last_observed_at_union_times' ||
      evaluationMode === 'hold_last_observed_at_declared_times') &&
      observation.kind !== 'event_updated') ||
    (evaluationMode === 'shared_sample_grid' && observation.kind !== 'point_sample')
  ) {
    errors.push(
      issue(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        ['parameters', 'aggregate', 'evaluation', 'mode'],
        'the aggregate evaluation contradicts the observation kind: holds require event-updated values and shared_sample_grid requires point samples.',
      ),
    );
  }
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const edgeId = asString(series[seriesIndex].edgeId);
    if (!memberIds.has(edgeId ?? '')) continue;
    if (
      (evaluationMode === 'hold_last_observed_at_union_times' ||
        evaluationMode === 'hold_last_observed_at_declared_times') &&
      asString(asRecord(series[seriesIndex].recordedInterval)?.boundary) !== '[start,stop)'
    ) {
      errors.push(
        issue(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          ['data', 'series', seriesIndex, 'recordedInterval', 'boundary'],
          'a derived hold aggregate currently requires half-open recorded intervals. A closed recorded stop creates a left-sided availability transition that the aggregate step carrier cannot encode without drawing the post-boundary denominator backward.',
        ),
      );
    }
  }

  if (windowUnit !== undefined) {
    const declaredTime = asRecord(evaluation.times);
    const declaredTimeUnit = asString(declaredTime?.unit);
    const declaredTimeValues = finiteNumbers(declaredTime?.values);
    if (declaredTime !== undefined) {
      validateTimeVectorFidelity(
        declaredTime,
        windowUnit,
        ['parameters', 'aggregate', 'evaluation', 'times', 'values'],
        errors,
      );
    }
    const globalWitnesses: TimeWitness[] = [
      ...[...memberIds].flatMap((edgeId) => decisionWitnessesByEdge.get(edgeId) ?? []),
      ...[...memberIds].flatMap((edgeId) => membershipWitnessesByEdge.get(edgeId) ?? []),
      ...(declaredTimeUnit === undefined
        ? []
        : declaredTimeValues.map((value, index) => ({
          value,
          unit: declaredTimeUnit,
          path: ['parameters', 'aggregate', 'evaluation', 'times', 'values', index] as const,
        }))),
    ];
    validateDecisionTimeEmbedding(globalWitnesses, windowUnit, errors);
  }

  const windowStart = asNumber(window.start);
  const windowStop = asNumber(window.stop);
  const windowClosed = asString(window.boundary) === '[start,stop]';
  const inAnalysisWindow = (value: number): boolean =>
    windowStart !== undefined &&
    windowStop !== undefined &&
    value >= windowStart &&
    (value < windowStop || (windowClosed && value === windowStop));
  const stateChangeTimes = [
    ...(windowStart === undefined ? [] : [windowStart]),
    ...(windowClosed && windowStop !== undefined ? [windowStop] : []),
    ...[...memberIds].flatMap((edgeId) => timeGrids.get(edgeId)?.values ?? []),
    ...[...memberIds].flatMap((edgeId) =>
      (convertedMembershipByEdge.get(edgeId) ?? []).flatMap((interval) => [interval.start, interval.stop])),
    ...[...memberIds].flatMap((edgeId) => {
      const interval = recordedIntervalsByEdge.get(edgeId);
      return interval === undefined ? [] : [interval.start, interval.stop];
    }),
  ].filter(inAnalysisWindow);
  const requiredStateChanges = [...new Set(stateChangeTimes)].sort((left, right) => left - right);

  if (
    evaluationMode === 'shared_sample_grid' &&
    edgeIds.size === series.length &&
    memberIds.size > 0
  ) {
    let reference: readonly number[] | undefined;
    for (const member of members) {
      const edgeId = asString(member.edgeId);
      if (edgeId === undefined) continue;
      const grid = timeGrids.get(edgeId);
      if (grid === undefined) continue;
      if (reference === undefined) {
        reference = grid.values;
        continue;
      }
      if (
        grid.values.length !== reference.length ||
        grid.values.some((value, index) => value !== reference?.[index])
      ) {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['data', 'series', grid.index, 'time', 'values'],
            'shared_sample_grid requires every selected member to have an exact elementwise-identical accepted time grid after one registered-unit conversion and recorded/window filtering. Cortexel does not interpolate or align nearby samples.',
          ),
        );
        break;
      }
    }
  }
  if (evaluationMode === 'hold_last_observed_at_declared_times' && windowUnit !== undefined) {
    const times = asRecord(evaluation.times) ?? {};
    const converted = convertTimes(
      times,
      windowUnit,
      ['parameters', 'aggregate', 'evaluation', 'times', 'values'],
      errors,
    );
    if (converted !== undefined) {
      validateIncreasingWindowTimes(
        converted,
        window,
        ['parameters', 'aggregate', 'evaluation', 'times', 'values'],
        errors,
      );
      const declaredSet = new Set(converted);
      const missingStateChange = requiredStateChanges.find((time) => !declaredSet.has(time));
      if (missingStateChange !== undefined) {
        errors.push(
          issue(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            ['parameters', 'aggregate', 'evaluation', 'times', 'values'],
            `a declared hold grid must contain every in-window observation, membership, recording, and initial-state transition so the derived step cannot be held across an omitted change. The converted grid is missing ${missingStateChange} ${windowUnit}.`,
          ),
        );
      }
    }
  }

  return errors;
};
