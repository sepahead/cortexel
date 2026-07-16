/**
 * Uncertainty, trace, and estimator semantics.
 *
 * A shaded band is meaningless unless it says what it is. "±error" is not a
 * statement — a standard deviation, a standard error, a 95% confidence interval,
 * and the observed min–max across an ensemble are four different things that render
 * identically and differ by factors that matter.
 *
 * So `UncertaintyV1` is a closed union in which the method, the level, the basis,
 * and the sample count are all structurally required, and there is deliberately no
 * generic `{lower, upper, label}` to fall back on.
 *
 * The rule underneath all of it: Cortexel never CONVERTS one kind of uncertainty
 * into another. A standard deviation is not an interval. An ensemble range carries
 * no coverage probability. An arbitrary pair of bounds is not a confidence interval
 * just because it has a lower and an upper.
 */

import { makeError, pointer, type CortexelError } from '../errors.js';
import { axesAreCompatible, dimensionOf } from '../units.js';
import { SKILL_CATALOG } from '../../generated/catalog.js';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  getData,
  getParameters,
  type SemanticContext,
  type SemanticValidator,
} from './types.js';

function findUncertainty(
  context: SemanticContext,
): { node: Record<string, unknown>; path: (string | number)[] } | undefined {
  const fromParameters = asRecord(getParameters(context).uncertainty);
  if (fromParameters) return { node: fromParameters, path: ['parameters', 'uncertainty'] };

  const fromData = asRecord(getData(context).uncertainty);
  if (fromData) return { node: fromData, path: ['data', 'uncertainty'] };

  return undefined;
}

export const uncertaintyValid: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const found = findUncertainty(context);
  if (!found) return [];

  const { node, path } = found;
  const kind = asString(node.kind);
  if (!kind || kind === 'none') return [];

  const errors: CortexelError[] = [];

  const level = asNumber(node.level);
  if (level !== undefined && !(level > 0 && level < 1)) {
    errors.push(
      makeError({
        code: 'SCIENCE_UNCERTAINTY_LEVEL_INVALID',
        stage: 'science',
        instancePath: pointer(...path, 'level'),
        validatorId: 'uncertainty.valid',
        message: `an interval level must lie strictly in (0, 1); got ${level}. A 95% interval is 0.95, not 95.`,
      }),
    );
  }

  // A dispersion cannot be negative. It is a distance.
  if (kind === 'standard_deviation' || kind === 'standard_error') {
    const values = asArray(node.values);
    if (values) {
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value === null) continue;
        const numeric = asNumber(value);
        if (numeric !== undefined && numeric < 0) {
          errors.push(
            makeError({
              code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
              stage: 'science',
              instancePath: pointer(...path, 'values', i),
              validatorId: 'uncertainty.valid',
              message: `a ${kind.replace('_', ' ')} cannot be negative; got ${numeric}. It is a distance.`,
            }),
          );
          break;
        }
      }
    }
    const sampleCounts = asArray(node.sampleCount);
    if (values && sampleCounts) {
      for (let i = 0; i < Math.min(values.length, sampleCounts.length); i++) {
        if ((values[i] === null) !== (sampleCounts[i] === null)) {
          errors.push(
            makeError({
              code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
              stage: 'science',
              instancePath: pointer(...path, 'sampleCount', i),
              validatorId: 'uncertainty.valid',
              message: `at index ${i}, ${kind.replace('_', ' ')} and sampleCount must be present or missing together. A sample count cannot qualify an absent dispersion, and a dispersion without its required count is incomplete.`,
            }),
          );
          break;
        }
      }
    }
  }

  // An interval's bounds must be ordered and equal in length.
  const lower = asArray(node.lower);
  const upper = asArray(node.upper);

  if (lower && upper) {
    if (lower.length !== upper.length) {
      errors.push(
        makeError({
          code: 'SEMANTIC_LENGTH_MISMATCH',
          stage: 'semantic',
          instancePath: pointer(...path, 'upper'),
          validatorId: 'uncertainty.valid',
          message: `the lower bounds have ${lower.length} entries and the upper bounds ${upper.length}. They describe the same points.`,
        }),
      );
    } else {
      for (let i = 0; i < lower.length; i++) {
        const lo = lower[i];
        const hi = upper[i];
        if ((lo === null) !== (hi === null)) {
          errors.push(
            makeError({
              code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
              stage: 'science',
              instancePath: pointer(...path, hi === null ? 'upper' : 'lower', i),
              validatorId: 'uncertainty.valid',
              message: `at index ${i}, lower and upper uncertainty bounds must be present or missing together. A one-sided value is not the declared two-sided interval.`,
            }),
          );
          break;
        }
        if (lo === null) continue;
        const loValue = asNumber(lo);
        const hiValue = asNumber(hi);
        if (loValue !== undefined && hiValue !== undefined && loValue > hiValue) {
          errors.push(
            makeError({
              code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
              stage: 'science',
              instancePath: pointer(...path, 'lower', i),
              validatorId: 'uncertainty.valid',
              message: `at index ${i} the lower bound (${loValue}) exceeds the upper bound (${hiValue}).`,
            }),
          );
          break;
        }
      }
    }
  }

  const sampleCounts = asArray(node.sampleCount);
  if (lower && upper && sampleCounts) {
    for (let i = 0; i < Math.min(lower.length, upper.length, sampleCounts.length); i++) {
      const boundsMissing = lower[i] === null && upper[i] === null;
      if (boundsMissing !== (sampleCounts[i] === null)) {
        errors.push(
          makeError({
            code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
            stage: 'science',
            instancePath: pointer(...path, 'sampleCount', i),
            validatorId: 'uncertainty.valid',
            message: `at index ${i}, interval bounds and sampleCount must share one missingness mask. A count cannot qualify an absent interval, and a counted interval cannot omit its count.`,
          }),
        );
        break;
      }
    }
  }
  if (sampleCounts) {
    for (let i = 0; i < sampleCounts.length; i++) {
      const count = sampleCounts[i];
      if (count === null) continue;
      const numeric = asNumber(count);
      if (numeric !== undefined && (!Number.isInteger(numeric) || numeric < 1)) {
        errors.push(
          makeError({
            code: 'SCIENCE_UNCERTAINTY_LEVEL_INVALID',
            stage: 'science',
            instancePath: pointer(...path, 'sampleCount', i),
            validatorId: 'uncertainty.valid',
            message: `a sample count must be a positive integer; got ${numeric}. An interval estimated from zero samples is not an interval.`,
          }),
        );
        break;
      }
    }
  }

  if (kind === 'quantile_interval') {
    const lowerQuantile = asNumber(node.lowerQuantile);
    const upperQuantile = asNumber(node.upperQuantile);
    if (
      lowerQuantile !== undefined &&
      upperQuantile !== undefined &&
      !(lowerQuantile < upperQuantile)
    ) {
      errors.push(
        makeError({
          code: 'SCIENCE_UNCERTAINTY_LEVEL_INVALID',
          stage: 'science',
          instancePath: pointer(...path, 'upperQuantile'),
          validatorId: 'uncertainty.valid',
          message: `the lower quantile (${lowerQuantile}) must be below the upper quantile (${upperQuantile}).`,
        }),
      );
    }
  }

  return errors;
};

/**
 * The figure must actually support the uncertainty variant it was handed.
 *
 * And `credible_interval` needs more than structural validity. A credible interval
 * is a statement about a posterior, and a posterior is a claim about a model that
 * Cortexel has no way to check. Structural validity establishes that a number is
 * shaped like a credible interval; it does not establish that a posterior was ever
 * computed, let alone calibrated. So it requires an external attestation, and the
 * request cannot supply one — attestations live on the artifact, verified.
 */
export const uncertaintySupportedVariant: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const found = findUncertainty(context);
  if (!found) return [];

  const { node, path } = found;
  const kind = asString(node.kind);
  if (!kind) return [];

  const catalog = SKILL_CATALOG[context.skillId];
  if (!catalog) return [];

  const supported = catalog.uncertaintySupport;
  const errors: CortexelError[] = [];

  if (!(supported as readonly string[]).includes(kind)) {
    errors.push(
      makeError({
        code: 'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
        stage: 'science',
        instancePath: pointer(...path, 'kind'),
        validatorId: 'uncertainty.supported_variant',
        skillId: context.skillId,
        message: `${context.skillId} cannot render a "${kind}" truthfully. It supports: ${supported.join(', ')}.`,
      }),
    );
  }

  if (kind === 'credible_interval') {
    errors.push(
      makeError({
        code: 'PROVENANCE_ATTESTATION_UNVERIFIED',
        stage: 'provenance',
        instancePath: pointer(...path, 'kind'),
        validatorId: 'uncertainty.supported_variant',
        message:
          'a credible interval is a statement about a posterior, and no verified attestation establishes that one was computed. Structural validity shows the number is SHAPED like a credible interval; it cannot show that a posterior exists, or that it is calibrated. Use quantile_interval or confidence_interval, or supply a verified attestation.',
      }),
    );
  }

  return errors;
};

/**
 * Duplicate timestamps in one series need an explicit policy.
 *
 * Last-write-wins would mean the surviving sample depends on array order, which is
 * not a scientific criterion. Cortexel makes the caller say what the duplicates mean.
 */
export const traceDuplicateTimePolicy: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const parameters = getParameters(context);

  const policyNode = parameters.duplicateTimePolicy;
  const policy = asString(policyNode) ?? asString(asRecord(policyNode)?.policy);
  const candidates: { readonly times: unknown[]; readonly label: string }[] = [];

  // Multi-signal traces may declare one shared clock instead of a time vector per series.
  const sharedTimes = asArray(asRecord(data.eventTimes)?.values);
  if (data.timeBase === 'shared' && sharedTimes) {
    candidates.push({ times: sharedTimes, label: 'the shared time base' });
  }

  const series = asArray(data.series);
  if (series) {
    for (let index = 0; index < series.length; index++) {
      const times = asArray(asRecord(asRecord(series[index])?.time)?.values);
      if (times) candidates.push({ times, label: `series ${index}` });
    }
  }

  for (const candidate of candidates) {
    const seen = new Set<number>();
    for (const time of candidate.times) {
      const value = asNumber(time);
      if (value === undefined) continue;
      if (seen.has(value)) {
        const declaration = policy === undefined
          ? 'no duplicate-time policy was declared'
          : `the declared policy is "${policy}", which requires duplicates to be absent`;
        if (policy === 'keep_replicates' || policy === 'aggregate') return [];
        return [
          makeError({
            code: 'SCIENCE_DUPLICATE_TIME_POLICY',
            stage: 'science',
            instancePath: pointer('parameters', 'duplicateTimePolicy'),
            validatorId: 'trace.duplicate_time_policy',
            message: `${candidate.label} has more than one sample at t = ${value}, and ${declaration}. Choose keep_replicates, or a named aggregate. Cortexel does not apply last-write-wins, because which sample survives would then depend on array order rather than on anything scientific.`,
          }),
        ];
      }
      seen.add(value);
    }
  }

  return [];
};

/** Series overlaid on one axis must share a dimension, or the comparison is fictional. */
export const traceAxisDimensionCompatible: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const series = asArray(getData(context).series);
  if (!series || series.length < 2) return [];

  const layout = asString(getParameters(context).layout);
  // Normalized overlays compare per-series dimensionless ratios, not source magnitudes.
  // Small-multiple panel membership is object-array data this registry validator cannot
  // resolve yet; the render boundary performs the within-panel check independently.
  if (layout === 'small_multiples' || layout === 'normalized_overlay') return [];

  const units: { unit: string; index: number }[] = [];
  for (let i = 0; i < series.length; i++) {
    const unit = asString(asRecord(asRecord(series[i])?.values)?.unit);
    if (unit !== undefined) units.push({ unit, index: i });
  }
  if (units.length < 2) return [];

  const errors: CortexelError[] = [];
  const first = units[0];

  // A simulator-defined code is not intrinsically comparable, even with itself.
  // The weight-trace contract is the one deliberate exception: it requires a
  // separate, explicit model-comparability claim and keeps every value in the
  // identical opaque unit code (there is still no conversion or SI mapping).
  if (
    context.skillId === 'network.synaptic_weight_trace' &&
    dimensionOf(first.unit) === 'simulator_defined' &&
    units.every((entry) => entry.unit === first.unit)
  ) {
    const comparability = asRecord(getParameters(context).weightComparability);
    const mode = asString(comparability?.mode);
    const models = series
      .map((entry) => asString(asRecord(entry)?.synapseModel))
      .filter((model): model is string => model !== undefined);
    const distinctModels = new Set(models);
    const declaredModels = asArray(comparability?.comparableModels)
      ?.filter((model): model is string => typeof model === 'string');
    const declaredSet = new Set(declaredModels ?? []);
    const claimMatches =
      (mode === 'single_synapse_model' && distinctModels.size === 1) ||
      (
        mode === 'declared_comparable_models' &&
        declaredSet.size === distinctModels.size &&
        [...distinctModels].every((model) => declaredSet.has(model))
      );

    if (models.length === series.length && claimMatches) return [];

    return [
      makeError({
        code: 'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
        stage: 'science',
        instancePath: pointer('parameters', 'weightComparability'),
        validatorId: 'trace.axis_dimension_compatible',
        message:
          'simulator-defined synaptic weights may share an axis only when the required model-comparability claim exactly matches the synapse models present. The opaque unit code alone does not make two model-dependent values comparable.',
      }),
    ];
  }

  for (const entry of units.slice(1)) {
    if (!axesAreCompatible(entry.unit, first.unit)) {
      const simulatorDefined =
        dimensionOf(entry.unit) === 'simulator_defined' ||
        dimensionOf(first.unit) === 'simulator_defined';
      errors.push(
        makeError({
          code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
          stage: 'science',
          instancePath: pointer('data', 'series', entry.index, 'values', 'unit'),
          validatorId: 'trace.axis_dimension_compatible',
          message: simulatorDefined
            ? `series ${entry.index} and series ${first.index} use simulator-defined units. Even an identical code cannot establish cross-series comparability because its physical meaning depends on the source model. Put each series on its own panel.`
            : `series ${entry.index} is in "${entry.unit}" but series ${first.index} is in "${first.unit}", and these are different dimensions. Overlaying them on one axis produces something that looks exactly like a comparison and is not one. Use layout "small_multiples".`,
          repair: {
            operation: 'replace',
            path: pointer('parameters', 'layout'),
            value: 'small_multiples',
            reasonCode: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
          },
        }),
      );
      break;
    }
  }

  return errors;
};

export const responseCurveEstimatorDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const parameters = getParameters(context);

  if (asString(parameters.responseMethod) !== undefined) return [];

  return [
    makeError({
      code: 'SEMANTIC_LENGTH_MISMATCH',
      stage: 'semantic',
      instancePath: pointer('parameters', 'responseMethod'),
      validatorId: 'response_curve.estimator_declared',
      message:
        'declare what the response VALUE is — a mean rate, a peak, a latency. It cannot be inferred from the name of the figure, and a curve whose y axis has no defined meaning is not a result.',
    }),
  ];
};

export const phasePlaneDerivativeDimension: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const field = asRecord(getData(context).vectorField);
  if (!field) return [];

  const errors: CortexelError[] = [];

  for (const axis of ['dx', 'dy'] as const) {
    const unit = asString(asRecord(field[axis])?.unit);
    const kind = asString(asRecord(field[axis])?.kind);
    if (unit === undefined || kind === undefined) continue;

    if (kind !== 'derivative') {
      errors.push(
        makeError({
          code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
          stage: 'science',
          instancePath: pointer('data', 'vectorField', axis, 'kind'),
          validatorId: 'phase_plane.derivative_dimension',
          message: `a vector-field component is a rate of change over time and must have kind "derivative"; got "${kind}".`,
        }),
      );
    }
  }

  return errors;
};

export const weightTraceObservationKindDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const parameters = getParameters(context);

  if (asString(parameters.observationKind) !== undefined) return [];

  return [
    makeError({
      code: 'SCIENCE_DUPLICATE_TIME_POLICY',
      stage: 'science',
      instancePath: pointer('parameters', 'observationKind'),
      validatorId: 'weight_trace.observation_kind_declared',
      message:
        'declare whether these weights are event-updated (piecewise-constant between updates — drawn as steps) or point samples of a continuously varying value (drawn as a line). An STDP weight drawn as a smooth line invents every intermediate value between two updates, none of which the synapse ever held.',
    }),
  ];
};
