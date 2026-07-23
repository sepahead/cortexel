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
import {
  exactBinary64Mean,
  floorExactBinary64TimesSafeInteger,
  isRoundedMeanOfSafeNonnegativeIntegers,
} from '../exact-binary64.js';
import {
  axesAreCompatible,
  compareExactUnitArraySumToDifference,
  deriveExactAggregateCountRateInUnit,
  deriveExactCountRateInUnit,
  dimensionOf,
  isKnownUnit,
} from '../units.js';
import {
  verifyBinnedPeakValueLattice,
  verifyPeakBasisAgainstWindow,
  verifyResponseEventScope,
  verifyResponseRateAuthority,
  type PeakBasisVerification,
  type RateAuthorityResult,
} from '../response-curve-basis.js';
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
import { legalKnownUnit } from './units.js';

function findUncertainty(
  context: SemanticContext,
): { node: Record<string, unknown>; path: (string | number)[] } | undefined {
  const fromParameters = asRecord(getParameters(context).uncertainty);
  if (fromParameters) return { node: fromParameters, path: ['parameters', 'uncertainty'] };

  const fromData = asRecord(getData(context).uncertainty);
  if (fromData) return { node: fromData, path: ['data', 'uncertainty'] };

  return undefined;
}

/** Validate one already-structural uncertainty carrier at an explicit nested path. */
export function validateUncertaintyNode(
  node: Record<string, unknown>,
  path: readonly (string | number)[],
  validatorId = 'uncertainty.valid',
): CortexelError[] {
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
        validatorId,
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
              validatorId,
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
              validatorId,
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
          validatorId,
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
              validatorId,
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
              validatorId,
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
            validatorId,
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
      if (numeric !== undefined && (!Number.isSafeInteger(numeric) || numeric < 1)) {
        errors.push(
          makeError({
            code: 'SCIENCE_UNCERTAINTY_LEVEL_INVALID',
            stage: 'science',
            instancePath: pointer(...path, 'sampleCount', i),
            validatorId,
            message: `a sample count must be a positive safe integer; got ${numeric}. Binary64 cannot preserve exact cardinality outside the safe-integer domain, and an interval estimated from zero samples is not an interval.`,
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
          validatorId,
          message: `the lower quantile (${lowerQuantile}) must be below the upper quantile (${upperQuantile}).`,
        }),
      );
    }
  }

  return errors;
}

export const uncertaintyValid: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const found = findUncertainty(context);
  return found === undefined
    ? []
    : validateUncertaintyNode(found.node, found.path);
};

/**
 * The figure must actually support the uncertainty variant it was handed.
 *
 * `credible_interval` is intentionally present in the structural vocabulary so a
 * request receives a precise scientific refusal instead of being mistaken for a
 * typo. No stable 1.0 skill supports it: a credible interval is a statement about a
 * posterior, and Artifact 1.0 has neither an attestation input nor an attestation
 * verifier. Structural validity can only establish that two arrays have the shape
 * of an interval; it cannot establish that a posterior was computed or calibrated.
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
  if (!series || series.length < 1) return [];

  const parameters = getParameters(context);
  const layout = asString(parameters.layout);
  // Normalized overlays compare per-series dimensionless ratios, not source magnitudes.
  // Small-multiple panel membership is object-array data this registry validator cannot
  // resolve yet; the render boundary performs the within-panel check independently.
  if (layout === 'small_multiples' || layout === 'normalized_overlay') return [];

  const units: { unit: string; index: number }[] = [];
  for (let i = 0; i < series.length; i++) {
    const values = asRecord(asRecord(series[i])?.values);
    const declaredUnit = asString(values?.unit);
    if (declaredUnit === undefined) continue;
    const unit = legalKnownUnit(values);
    // Canonical-code and kind/dimension checks own malformed source units. The
    // shared-axis relation is meaningful only when every participant is itself a
    // legal registered quantity; dropping one bad participant would silently
    // change the comparison being validated.
    if (unit === undefined) return [];
    units.push({ unit, index: i });
  }
  if (units.length < 1) return [];

  // Analog shared-axis `valueUnit` is a scalar unit-code field, rather than a
  // `{kind, unit}` quantity. Canonical-code validation owns aliases/unknown codes;
  // this rule owns its relational claim: every displayed source series must be
  // convertible into the selected axis. Check only registered codes here so an
  // alias produces one actionable canonical-code diagnostic instead of a second,
  // derivative dimension failure.
  const targetUnit = asString(parameters.valueUnit);
  if (targetUnit !== undefined && isKnownUnit(targetUnit)) {
    for (const entry of units) {
      // Exact code identity requires no conversion. This is the only meaningful
      // single-series use of an opaque simulator-defined unit; comparability across
      // two opaque series remains forbidden by the multi-series rule below.
      if (
        !isKnownUnit(entry.unit) ||
        entry.unit === targetUnit ||
        axesAreCompatible(entry.unit, targetUnit)
      ) continue;
      const simulatorDefined =
        dimensionOf(entry.unit) === 'simulator_defined' ||
        dimensionOf(targetUnit) === 'simulator_defined';
      return [
        makeError({
          code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
          stage: 'science',
          instancePath: pointer('parameters', 'valueUnit'),
          validatorId: 'trace.axis_dimension_compatible',
          message: simulatorDefined
            ? `valueUnit "${targetUnit}" cannot be a shared display unit for series ${entry.index}: different simulator-defined unit codes have no registered conversion relation.`
            : `valueUnit "${targetUnit}" cannot display series ${entry.index} in "${entry.unit}" because their registered dimensions differ. A shared axis may convert scale, never physical meaning.`,
        }),
      ];
    }
  }

  if (units.length < 2) return [];

  const errors: CortexelError[] = [];
  const first = units[0];

  // A simulator-defined code is not intrinsically comparable, even with itself.
  // The weight-trace contract is the one deliberate exception: its dedicated
  // cross-field validator owns the exact model-comparability set claim, while this
  // validator owns only the unit-axis relation. Identical opaque codes require no
  // conversion; different opaque codes remain incompatible.
  if (
    context.skillId === 'network.synaptic_weight_trace' &&
    dimensionOf(first.unit) === 'simulator_defined' &&
    units.every((entry) => entry.unit === first.unit)
  ) {
    return [];
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
  const data = getData(context);
  const mode = asString(data.mode);
  const carrier = asRecord(
    mode === 'aggregates' ? data.aggregates : data.observations,
  );
  const response = asRecord(carrier?.response);
  const parameterMethod = asString(parameters.responseMethod);
  const responseMethod = asString(response?.method);
  const errors: CortexelError[] = [];
  let rateAuthority: RateAuthorityResult | undefined;
  let peakBasisVerification: PeakBasisVerification | undefined;

  const conditions = asRecord(data.conditions);
  if (asString(conditions?.axis) === 'numeric') {
    const inputs = asArray(asRecord(conditions?.input)?.values);
    if (inputs) {
      const seen = new Map<number, number>();
      for (let index = 0; index < inputs.length; index++) {
        const value = asNumber(inputs[index]);
        if (value === undefined) continue;
        if (asString(asRecord(conditions?.input)?.scale) === 'log10' && !(value > 0)) {
          errors.push(
            makeError({
              code: 'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
              stage: 'render',
              instancePath: pointer('data', 'conditions', 'input', 'values', index),
              validatorId: 'response_curve.estimator_declared',
              message: `a log10 response-curve input axis requires every declared value to be strictly positive; got ${value}.`,
            }),
          );
          break;
        }
        const prior = seen.get(value);
        if (prior !== undefined) {
          errors.push(
            makeError({
              code: 'SCIENCE_RESPONSE_INPUT_DUPLICATE',
              stage: 'science',
              instancePath: pointer('data', 'conditions', 'input', 'values', index),
              validatorId: 'response_curve.estimator_declared',
              message: `numeric input ${value} is declared by both condition indices ${prior} and ${index}. Overlapping them at one x coordinate would hide which condition owns a point or gap.`,
            }),
          );
          break;
        }
        seen.set(value, index);
      }
    }
  }

  if (parameterMethod === undefined) {
    errors.push(
      makeError({
        code: 'SEMANTIC_LENGTH_MISMATCH',
        stage: 'semantic',
        instancePath: pointer('parameters', 'responseMethod'),
        validatorId: 'response_curve.estimator_declared',
        message:
          'declare what the response VALUE is — a mean rate, a peak, a latency. It cannot be inferred from the name of the figure, and a curve whose y axis has no defined meaning is not a result.',
      }),
    );
  }

  if (responseMethod !== undefined && parameterMethod !== responseMethod) {
    errors.push(
      makeError({
        code: 'SCIENCE_RESPONSE_METHOD_MISMATCH',
        stage: 'science',
        instancePath: pointer('parameters', 'responseMethod'),
        validatorId: 'response_curve.estimator_declared',
        message: `parameters.responseMethod is ${JSON.stringify(parameterMethod)} but the response values are typed as ${JSON.stringify(responseMethod)}. Relabelling the same numbers as a different scientific quantity is refused.`,
      }),
    );
  }

  const rateResponse =
    responseMethod === 'mean_firing_rate' || responseMethod === 'peak_firing_rate';
  const eventScope = verifyResponseEventScope(data.eventScope);
  if (!eventScope.ok) {
    errors.push(
      makeError({
        code: 'SCIENCE_EVENT_SCOPE_UNVERIFIABLE',
        stage: 'science',
        instancePath: `/data${eventScope.path}`,
        validatorId: 'response_curve.estimator_declared',
        message: eventScope.message,
      }),
    );
  }
  if (rateResponse && eventScope.ok) {
    rateAuthority = verifyResponseRateAuthority(
      response?.rateNormalization,
      data.eventScope,
    );
    if (!rateAuthority.ok) {
      const instancePath = rateAuthority.path === '/rateNormalization'
        ? pointer(
          'data',
          mode === 'aggregates' ? 'aggregates' : 'observations',
          'response',
          'rateNormalization',
        )
        : `/data${rateAuthority.path}`;
      errors.push(
        makeError({
          code: rateAuthority.path.startsWith('/eventScope')
            ? 'SCIENCE_EVENT_SCOPE_UNVERIFIABLE'
            : 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath,
          validatorId: 'response_curve.estimator_declared',
          message: rateAuthority.message,
        }),
      );
    }
  }

  if (responseMethod === 'peak_firing_rate') {
    peakBasisVerification = verifyPeakBasisAgainstWindow(response?.basis, data.measurementWindow);
    if (!peakBasisVerification.ok) {
      const responseBase = pointer(
        'data',
        mode === 'aggregates' ? 'aggregates' : 'observations',
        'response',
      );
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: peakBasisVerification.path === '/measurementWindow'
            ? pointer('data', 'measurementWindow')
            : `${responseBase}${peakBasisVerification.path}`,
          validatorId: 'response_curve.estimator_declared',
          message: peakBasisVerification.message,
        }),
      );
    }
  }

  const values = asArray(response?.values);
  if (responseMethod !== undefined && values) {
    for (let index = 0; index < values.length; index++) {
      if (values[index] === null) continue;
      const value = asNumber(values[index]);
      if (value === undefined) continue;
      const instancePath = pointer(
        'data',
        mode === 'aggregates' ? 'aggregates' : 'observations',
        'response',
        'values',
        index,
      );
      if (
        (responseMethod === 'mean_firing_rate' || responseMethod === 'peak_firing_rate') &&
        value < 0
      ) {
        errors.push(
          makeError({
            code: 'SCIENCE_RESPONSE_VALUE_INVALID',
            stage: 'science',
            instancePath,
            validatorId: 'response_curve.estimator_declared',
            message: `${responseMethod} is a firing rate and cannot be negative; got ${value}. A silent repeat is measured zero, not a negative rate.`,
          }),
        );
        break;
      }
      if (responseMethod === 'first_spike_latency' && value < 0) {
        errors.push(
          makeError({
            code: 'SCIENCE_RESPONSE_VALUE_INVALID',
            stage: 'science',
            instancePath,
            validatorId: 'response_curve.estimator_declared',
            message: `a defined first-spike latency must be non-negative; got ${value}. Zero means the first event occurred exactly at the included measurement-window start; use null only when no first spike occurred.`,
          }),
        );
        break;
      }
      if (responseMethod === 'event_count') {
        if (mode === 'repeats' && (!Number.isSafeInteger(value) || value < 0)) {
          errors.push(
            makeError({
              code: 'SCIENCE_COUNT_NOT_INTEGER',
              stage: 'science',
              instancePath,
              validatorId: 'response_curve.estimator_declared',
              message: `a raw repeat event count must be an exact non-negative safe integer; got ${value}.`,
            }),
          );
          break;
        }
        if (mode === 'aggregates' && value < 0) {
          errors.push(
            makeError({
              code: 'SCIENCE_RESPONSE_VALUE_INVALID',
              stage: 'science',
              instancePath,
              validatorId: 'response_curve.estimator_declared',
              message: `an aggregate estimator over event counts may be fractional but cannot be negative; got ${value}.`,
            }),
          );
          break;
        }
      }
    }
  }

  if (
    responseMethod === 'first_spike_latency' &&
    asString(response?.latencyReference) !== 'measurement_window_start'
  ) {
    errors.push(
      makeError({
        code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        stage: 'science',
        instancePath: pointer(
          'data',
          mode === 'aggregates' ? 'aggregates' : 'observations',
          'response',
          'latencyReference',
        ),
        validatorId: 'response_curve.estimator_declared',
        message: 'revision 2 supports first-spike latency only from measurement_window_start; stimulus onset has no typed coordinate relative to the window.',
      }),
    );
  }

  if (
    responseMethod === 'first_spike_latency' &&
    asString(response?.latencyReference) === 'measurement_window_start' &&
    values
  ) {
    const window = asRecord(data.measurementWindow);
    const windowStart = asNumber(window?.start);
    const windowStop = asNumber(window?.stop);
    const windowUnit = asString(window?.unit);
    const responseUnit = asString(response?.unit);
    if (
      windowStart !== undefined &&
      windowStop !== undefined &&
      windowStop > windowStart &&
      windowUnit !== undefined &&
      responseUnit !== undefined &&
      dimensionOf(windowUnit) === dimensionOf(responseUnit)
    ) {
      const closedStop = asString(window?.boundary) === '[start,stop]';
      for (let index = 0; index < values.length; index++) {
        if (values[index] === null) continue;
        const latency = asNumber(values[index]);
        if (latency === undefined || latency < 0) continue;
        const comparison = compareExactUnitArraySumToDifference(
          [latency],
          responseUnit,
          { value: windowStart, unit: windowUnit },
          { value: windowStop, unit: windowUnit },
        );
        if (comparison > 0 || (comparison === 0 && !closedStop)) {
          errors.push(
            makeError({
              code: 'SCIENCE_LATENCY_OUTSIDE_WINDOW',
              stage: 'science',
              instancePath: pointer(
                'data',
                mode === 'aggregates' ? 'aggregates' : 'observations',
                'response',
                'values',
                index,
              ),
              validatorId: 'response_curve.estimator_declared',
              message: `first-spike latency ${latency} ${responseUnit} is referenced to the measurement-window start but does not lie inside the declared ${closedStop ? 'closed' : 'half-open'} window of exact duration (${windowStop} - ${windowStart}) ${windowUnit}.`,
            }),
          );
          break;
        }
      }
    }
  }

  if (mode === 'aggregates' && values) {
    const sampleCounts = asArray(carrier?.sampleCounts);
    const excludedCounts = asArray(carrier?.excludedCounts);
    const trimmedCounts = asArray(carrier?.trimmedCounts);
    const estimator = asString(parameters.estimator);
    const trimFraction = asNumber(parameters.trimFraction);
    if (estimator === 'trimmed_mean' && !trimmedCounts) {
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: pointer('data', 'aggregates', 'trimmedCounts'),
          validatorId: 'response_curve.estimator_declared',
          message: 'trimmed_mean aggregate input must declare how many defined observations were removed symmetrically from the two tails in each condition.',
        }),
      );
    } else if (estimator !== 'trimmed_mean' && carrier?.trimmedCounts !== undefined) {
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: pointer('data', 'aggregates', 'trimmedCounts'),
          validatorId: 'response_curve.estimator_declared',
          message: 'trimmedCounts is an unused scientific claim unless the estimator is trimmed_mean.',
        }),
      );
    }
    for (const [field, entries] of [
      ['sampleCounts', sampleCounts],
      ['excludedCounts', excludedCounts],
      ...(trimmedCounts ? [['trimmedCounts', trimmedCounts] as const] : []),
    ] as const) {
      if (entries && entries.length !== values.length) {
        errors.push(
          makeError({
            code: 'SEMANTIC_LENGTH_MISMATCH',
            stage: 'semantic',
            instancePath: pointer('data', 'aggregates', field),
            validatorId: 'response_curve.estimator_declared',
            message: `aggregate response values and ${field} must have identical lengths.`,
          }),
        );
      }
    }
    if (
      sampleCounts &&
      excludedCounts &&
      sampleCounts.length === values.length &&
      excludedCounts.length === values.length &&
      (!trimmedCounts || trimmedCounts.length === values.length)
    ) {
      let retainedTotal = 0n;
      let trimmedTotal = 0n;
      let excludedTotal = 0n;
      const maximum = BigInt(Number.MAX_SAFE_INTEGER);
      for (let index = 0; index < values.length; index++) {
        if ((values[index] === null) !== (sampleCounts[index] === null)) {
          errors.push(
            makeError({
              code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
              stage: 'science',
              instancePath: pointer('data', 'aggregates', 'sampleCounts', index),
              validatorId: 'response_curve.estimator_declared',
              message: `aggregate response and retained sample count must be present or missing together at condition index ${index}. A point cannot have n without an estimate, or an estimate without n.`,
            }),
          );
          break;
        }
        const rawSampleCount = sampleCounts[index];
        const sampleCount = rawSampleCount === null ? 0 : asNumber(rawSampleCount);
        const excludedCount = asNumber(excludedCounts[index]);
        const trimmedCount = trimmedCounts ? asNumber(trimmedCounts[index]) : 0;
        let invalidExactCount = false;
        for (const [field, value] of [
          ['sampleCounts', sampleCount],
          ['excludedCounts', excludedCount],
          ['trimmedCounts', trimmedCount],
        ] as const) {
          if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
            errors.push(
              makeError({
                code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
                stage: 'science',
                instancePath: pointer('data', 'aggregates', field, index),
                validatorId: 'response_curve.estimator_declared',
                message: `${field}[${index}] must be an exact non-negative safe integer for artifact accounting; got ${value}.`,
              }),
            );
            invalidExactCount = true;
            break;
          }
        }
        if (invalidExactCount) break;
        if (sampleCount === undefined || excludedCount === undefined || trimmedCount === undefined) {
          continue;
        }
        if (trimmedCount % 2 !== 0) {
          errors.push(
            makeError({
              code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
              stage: 'science',
              instancePath: pointer('data', 'aggregates', 'trimmedCounts', index),
              validatorId: 'response_curve.estimator_declared',
              message: 'a symmetric two-tail trimmed count must be even.',
            }),
          );
          break;
        }
        if (rawSampleCount === null && trimmedCount !== 0) {
          errors.push(
            makeError({
              code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
              stage: 'science',
              instancePath: pointer('data', 'aggregates', 'trimmedCounts', index),
              validatorId: 'response_curve.estimator_declared',
              message: 'a condition with no aggregate estimate cannot claim trimmed defined observations.',
            }),
          );
          break;
        }
        const pretrimDefined = sampleCount + trimmedCount;
        const attempted = pretrimDefined + excludedCount;
        if (!Number.isSafeInteger(pretrimDefined) || !Number.isSafeInteger(attempted)) {
          errors.push(
            makeError({
              code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
              stage: 'science',
              instancePath: pointer('data', 'aggregates'),
              validatorId: 'response_curve.estimator_declared',
              message: `condition index ${index} has a pre-trim defined or attempted count outside the exact safe-integer range.`,
            }),
          );
          break;
        }
        if (
          asString(asRecord(parameters.uncertainty)?.reason) === 'single_trial' &&
          attempted > 1
        ) {
          errors.push(
            makeError({
              code: 'SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA',
              stage: 'science',
              instancePath: pointer('parameters', 'uncertainty', 'reason'),
              validatorId: 'response_curve.estimator_declared',
              message: `uncertainty reason single_trial contradicts aggregate condition index ${index}, which declares ${attempted} attempted repeats.`,
            }),
          );
          break;
        }
        if (estimator === 'trimmed_mean' && trimFraction !== undefined) {
          const expectedTrimmed = 2 * floorExactBinary64TimesSafeInteger(
            trimFraction,
            pretrimDefined,
          );
          if (trimmedCount !== expectedTrimmed) {
            errors.push(
              makeError({
                code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
                stage: 'science',
                instancePath: pointer('data', 'aggregates', 'trimmedCounts', index),
                validatorId: 'response_curve.estimator_declared',
                message: `trimmed count ${trimmedCount} does not equal 2 * floor_exact((${sampleCount} + ${trimmedCount}) * ${trimFraction}) = ${expectedTrimmed}.`,
              }),
            );
            break;
          }
        }
        if (responseMethod === 'event_count' && values[index] !== null) {
          const estimate = asNumber(values[index]);
          const denominator = estimator === 'median'
            ? sampleCount % 2 === 0 ? 2 : 1
            : sampleCount;
          if (
            estimate !== undefined &&
            !isRoundedMeanOfSafeNonnegativeIntegers(estimate, denominator)
          ) {
            errors.push(
              makeError({
                code: 'SCIENCE_COUNT_ESTIMATOR_INCOHERENT',
                stage: 'science',
                instancePath: pointer('data', 'aggregates', 'response', 'values', index),
                validatorId: 'response_curve.estimator_declared',
                message: `event-count estimate ${estimate} cannot be the correctly rounded ${estimator ?? 'declared estimator'} of ${sampleCount} retained exact non-negative safe-integer counts.`,
              }),
            );
            break;
          }
        }
        retainedTotal += BigInt(sampleCount);
        trimmedTotal += BigInt(trimmedCount);
        excludedTotal += BigInt(excludedCount);
        if (
          retainedTotal > maximum ||
          trimmedTotal > maximum ||
          excludedTotal > maximum ||
          retainedTotal + trimmedTotal + excludedTotal > maximum
        ) {
          errors.push(
            makeError({
              code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
              stage: 'science',
              instancePath: pointer('data', 'aggregates'),
              validatorId: 'response_curve.estimator_declared',
              message: 'response-curve retained, trimmed, excluded, or attempted totals exceed the exact safe-integer range.',
            }),
          );
          break;
        }
      }
    }
  }

  if (mode === 'repeats' && values) {
    const audit = asRecord(response?.audit);
    if (
      responseMethod === 'peak_firing_rate' &&
      peakBasisVerification?.ok === true &&
      peakBasisVerification.kind === 'binned_count' &&
      rateAuthority?.ok === true
    ) {
      const peakBinCounts = asArray(audit?.peakBinCounts);
      const basis = asRecord(response?.basis);
      const binWidth = asRecord(basis?.binWidth);
      const binWidthValue = asNumber(binWidth?.value);
      const binWidthUnit = asString(binWidth?.unit);
      const rateUnit = asString(response?.unit);
      if (!peakBinCounts) {
        errors.push(
          makeError({
            code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            stage: 'science',
            instancePath: pointer(
              'data',
              'observations',
              'response',
              'audit',
              'peakBinCounts',
            ),
            validatorId: 'response_curve.estimator_declared',
            message: 'raw binned-count peaks require exact parallel peakBinCounts so repeat rates and condition estimators can be re-derived without mode-dependent rounding.',
          }),
        );
      } else if (peakBinCounts.length !== values.length) {
        errors.push(
          makeError({
            code: 'SEMANTIC_LENGTH_MISMATCH',
            stage: 'semantic',
            instancePath: pointer(
              'data',
              'observations',
              'response',
              'audit',
              'peakBinCounts',
            ),
            validatorId: 'response_curve.estimator_declared',
            message: 'response.audit.peakBinCounts must be parallel to raw binned-peak response values.',
          }),
        );
      } else if (
        binWidthValue !== undefined &&
        binWidthUnit !== undefined &&
        rateUnit !== undefined
      ) {
        for (let index = 0; index < peakBinCounts.length; index++) {
          const count = peakBinCounts[index];
          const rate = values[index];
          if ((count === null) !== (rate === null)) {
            errors.push(
              makeError({
                code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
                stage: 'science',
                instancePath: pointer(
                  'data',
                  'observations',
                  'response',
                  'audit',
                  'peakBinCounts',
                  index,
                ),
                validatorId: 'response_curve.estimator_declared',
                message: 'a peak-bin count must be null exactly where its raw binned-peak rate is null.',
              }),
            );
            break;
          }
          const numericCount = count === null ? undefined : asNumber(count);
          if (
            numericCount !== undefined &&
            (!Number.isSafeInteger(numericCount) || numericCount < 0)
          ) {
            errors.push(
              makeError({
                code: 'SCIENCE_COUNT_NOT_INTEGER',
                stage: 'science',
                instancePath: pointer(
                  'data',
                  'observations',
                  'response',
                  'audit',
                  'peakBinCounts',
                  index,
                ),
                validatorId: 'response_curve.estimator_declared',
                message: `peak-bin count ${numericCount} is not an exact non-negative safe integer.`,
              }),
            );
            break;
          }
          const numericRate = rate === null ? undefined : asNumber(rate);
          if (numericCount !== undefined && numericRate !== undefined) {
            let expectedRate: number;
            try {
              expectedRate = deriveExactAggregateCountRateInUnit(
                BigInt(numericCount),
                rateAuthority.integerDivisor,
                1,
                binWidthValue,
                binWidthUnit,
                rateUnit,
              );
            } catch (error) {
              errors.push(
                makeError({
                  code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
                  stage: 'science',
                  instancePath: pointer(
                    'data',
                    'observations',
                    'response',
                    'values',
                    index,
                  ),
                  validatorId: 'response_curve.estimator_declared',
                  message: `raw binned-peak rate could not be re-derived from its exact max-bin count, divisor, typed bin width, and response unit (${error instanceof Error ? error.message : 'numeric failure'}).`,
                }),
              );
              break;
            }
            if ((numericRate === 0 ? 0 : numericRate) !== expectedRate) {
              errors.push(
                makeError({
                  code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
                  stage: 'science',
                  instancePath: pointer(
                    'data',
                    'observations',
                    'response',
                    'values',
                    index,
                  ),
                  validatorId: 'response_curve.estimator_declared',
                  message: `raw binned-peak rate ${numericRate} ${rateUnit} does not equal the one-round exact rate ${expectedRate} ${rateUnit} derived from peak-bin count ${numericCount}, divisor ${rateAuthority.integerDivisor}, and bin width ${binWidthValue} ${binWidthUnit}.`,
                }),
              );
              break;
            }
          }
        }
      }
    }
    if (audit) {
      const eventCounts = asArray(audit.eventCounts);
      const measurementWindow = asRecord(data.measurementWindow);
      const windowStart = asNumber(measurementWindow?.start);
      const windowStop = asNumber(measurementWindow?.stop);
      const windowUnit = asString(measurementWindow?.unit);
      const responseUnit = asString(response?.unit);
      if (eventCounts) {
        if (eventCounts.length !== values.length) {
          errors.push(
            makeError({
              code: 'SEMANTIC_LENGTH_MISMATCH',
              stage: 'semantic',
              instancePath: pointer('data', 'observations', 'response', 'audit', 'eventCounts'),
              validatorId: 'response_curve.estimator_declared',
              message: 'response.audit.eventCounts must be parallel to response.values.',
            }),
          );
        } else {
          for (let index = 0; index < eventCounts.length; index++) {
            const count = eventCounts[index];
            const numericCount = count === null ? undefined : asNumber(count);
            if (count !== null) {
              if (
                numericCount !== undefined &&
                (!Number.isSafeInteger(numericCount) || numericCount < 0)
              ) {
                errors.push(
                  makeError({
                    code: 'SCIENCE_COUNT_NOT_INTEGER',
                    stage: 'science',
                    instancePath: pointer('data', 'observations', 'response', 'audit', 'eventCounts', index),
                    validatorId: 'response_curve.estimator_declared',
                    message: `audited event count ${numericCount} is not an exact non-negative safe integer.`,
                  }),
                );
                break;
              }
            }
            if ((count === null) !== (values[index] === null)) {
              errors.push(
                makeError({
                  code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
                  stage: 'science',
                  instancePath: pointer('data', 'observations', 'response', 'audit', 'eventCounts', index),
                  validatorId: 'response_curve.estimator_declared',
                  message: `audited event count and response value must be present or missing together at repeat index ${index}.`,
                }),
              );
              break;
            }
            const rate = values[index] === null ? undefined : asNumber(values[index]);
            if (
              numericCount !== undefined &&
              Number.isSafeInteger(numericCount) &&
              numericCount >= 0 &&
              rate !== undefined &&
              rateAuthority?.ok === true &&
              windowStart !== undefined &&
              windowStop !== undefined &&
              windowUnit !== undefined &&
              responseUnit !== undefined &&
              dimensionOf(windowUnit) === 'time' &&
              dimensionOf(responseUnit) === 'frequency'
            ) {
              let expectedRate: number;
              try {
                expectedRate = deriveExactCountRateInUnit(
                  numericCount,
                  rateAuthority.integerDivisor,
                  windowStart,
                  windowStop,
                  windowUnit,
                  responseUnit,
                );
              } catch (error) {
                const detail = error instanceof Error ? error.message : 'numeric conversion failed';
                errors.push(
                  makeError({
                    code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
                    stage: 'science',
                    instancePath: pointer('data', 'observations', 'response', 'values', index),
                    validatorId: 'response_curve.estimator_declared',
                    message: `mean-rate audit could not be re-derived from its exact count, ${rateAuthority.normalization} divisor, typed measurement window, and response unit (${detail}).`,
                  }),
                );
                break;
              }
              if ((rate === 0 ? 0 : rate) !== expectedRate) {
                errors.push(
                  makeError({
                    code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
                    stage: 'science',
                    instancePath: pointer('data', 'observations', 'response', 'values', index),
                    validatorId: 'response_curve.estimator_declared',
                    message: `supplied mean rate ${rate} ${responseUnit} does not equal the one-round exact ${rateAuthority.normalization} derived from audited count ${numericCount}, integer divisor ${rateAuthority.integerDivisor}, and exact window [${windowStart}, ${windowStop}] ${windowUnit}; the derived value is ${expectedRate} ${responseUnit}.`,
                  }),
                );
                break;
              }
            }
          }
        }
      }
    }
  }

  if (mode === 'repeats') {
    const conditionIds = asArray(asRecord(data.conditions)?.ids);
    const observationConditionIds = asArray(carrier?.conditionIds);
    const repeatIds = asArray(carrier?.repeatIds);
    const attemptedCounts = asArray(carrier?.attemptedCounts);
    if (
      conditionIds &&
      conditionIds.length > 0 &&
      observationConditionIds &&
      repeatIds &&
      observationConditionIds.length === repeatIds.length
    ) {
      const declared = conditionIds.filter((value): value is string => typeof value === 'string');
      const declaredSet = new Set(declared);
      const repeatSets = new Map(declared.map((conditionId) => [conditionId, new Set<string>()]));
      const submittedCounts = new Map(declared.map((conditionId) => [conditionId, 0]));
      const definedValues = new Map(declared.map((conditionId) => [conditionId, [] as number[]]));
      const rawBinnedPeakCounts =
        responseMethod === 'peak_firing_rate' &&
        peakBasisVerification?.ok === true &&
        peakBasisVerification.kind === 'binned_count'
          ? asArray(asRecord(response?.audit)?.peakBinCounts)
          : undefined;
      const definedPeakCountRows = new Map(declared.map((conditionId) => [
        conditionId,
        [] as { count: number; repeatId: string; sourceOrdinal: number }[],
      ]));
      for (let index = 0; index < observationConditionIds.length; index++) {
        const conditionId = asString(observationConditionIds[index]);
        const repeatId = asString(repeatIds[index]);
        if (conditionId !== undefined && repeatId !== undefined) {
          if (!declaredSet.has(conditionId)) {
            errors.push(
              makeError({
                code: 'SEMANTIC_UNKNOWN_REFERENCE',
                stage: 'semantic',
                instancePath: pointer('data', 'observations', 'conditionIds', index),
                validatorId: 'response_curve.estimator_declared',
                message: `observation condition ${JSON.stringify(conditionId)} is absent from the declared condition universe. Cortexel never extends that universe implicitly.`,
              }),
            );
            continue;
          }
          submittedCounts.set(conditionId, submittedCounts.get(conditionId)! + 1);
          const responseValue = values?.[index];
          if (responseValue !== null) {
            const numericValue = asNumber(responseValue);
            if (numericValue !== undefined) definedValues.get(conditionId)!.push(numericValue);
            const peakBinCount = rawBinnedPeakCounts?.[index];
            const numericPeakBinCount =
              peakBinCount === null ? undefined : asNumber(peakBinCount);
            if (
              numericPeakBinCount !== undefined &&
              Number.isSafeInteger(numericPeakBinCount) &&
              numericPeakBinCount >= 0
            ) {
              definedPeakCountRows.get(conditionId)!.push({
                count: numericPeakBinCount,
                repeatId,
                sourceOrdinal: index,
              });
            }
          }
          const seen = repeatSets.get(conditionId)!;
          if (seen.has(repeatId)) {
            errors.push(
              makeError({
                code: 'SEMANTIC_DUPLICATE_ID',
                stage: 'semantic',
                instancePath: pointer('data', 'observations', 'repeatIds', index),
                validatorId: 'response_curve.estimator_declared',
                message: `repeat ${JSON.stringify(repeatId)} appears more than once in condition ${JSON.stringify(conditionId)}. A duplicate composite identity would double-weight one measurement.`,
              }),
            );
            continue;
          }
          seen.add(repeatId);
        }
      }
      if (!attemptedCounts || attemptedCounts.length !== declared.length) {
        errors.push(
          makeError({
            code: 'SEMANTIC_LENGTH_MISMATCH',
            stage: 'semantic',
            instancePath: pointer('data', 'observations', 'attemptedCounts'),
            validatorId: 'response_curve.estimator_declared',
            message: 'attemptedCounts must be parallel to the declared condition universe.',
          }),
        );
      } else {
        for (let ordinal = 0; ordinal < declared.length; ordinal++) {
          const declaredCount = asNumber(attemptedCounts[ordinal]);
          if (
            declaredCount === undefined ||
            !Number.isSafeInteger(declaredCount) ||
            declaredCount < 0
          ) {
            errors.push(
              makeError({
                code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
                stage: 'science',
                instancePath: pointer('data', 'observations', 'attemptedCounts', ordinal),
                validatorId: 'response_curve.estimator_declared',
                message: `attempted count must be an exact non-negative safe integer; got ${declaredCount}.`,
              }),
            );
            break;
          }
          const submitted = submittedCounts.get(declared[ordinal]) ?? 0;
          if (declaredCount !== submitted) {
            errors.push(
              makeError({
                code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
                stage: 'science',
                instancePath: pointer('data', 'observations', 'attemptedCounts', ordinal),
                validatorId: 'response_curve.estimator_declared',
                message: `condition ${JSON.stringify(declared[ordinal])} declares ${declaredCount} attempted repeats but supplies ${submitted} rows.`,
              }),
            );
            break;
          }
        }
      }
      const estimator = asString(parameters.estimator);
      const trimFraction = asNumber(parameters.trimFraction);
      for (const conditionId of declared) {
        const conditionValues = definedValues.get(conditionId)!;
        if (conditionValues.length === 0) continue;
        try {
          const peakCountRows = definedPeakCountRows.get(conditionId)!;
          if (
            rawBinnedPeakCounts &&
            peakCountRows.length === conditionValues.length &&
            rateAuthority?.ok === true
          ) {
            const ordered = [...peakCountRows].sort((left, right) =>
              left.count - right.count ||
              (left.repeatId < right.repeatId ? -1 : left.repeatId > right.repeatId ? 1 : 0) ||
              left.sourceOrdinal - right.sourceOrdinal,
            );
            let selected = ordered;
            if (estimator === 'median') {
              const middle = Math.floor(ordered.length / 2);
              selected = ordered.length % 2 === 1
                ? [ordered[middle]]
                : [ordered[middle - 1], ordered[middle]];
            } else if (estimator === 'trimmed_mean' && trimFraction !== undefined) {
              const perTail = floorExactBinary64TimesSafeInteger(
                trimFraction,
                ordered.length,
              );
              selected = ordered.slice(perTail, ordered.length - perTail);
            }
            const basis = asRecord(response?.basis);
            const binWidth = asRecord(basis?.binWidth);
            const binWidthValue = asNumber(binWidth?.value);
            const binWidthUnit = asString(binWidth?.unit);
            const rateUnit = asString(response?.unit);
            if (
              selected.length > 0 &&
              binWidthValue !== undefined &&
              binWidthUnit !== undefined &&
              rateUnit !== undefined
            ) {
              const countTotal = selected.reduce(
                (total, row) => total + BigInt(row.count),
                0n,
              );
              deriveExactAggregateCountRateInUnit(
                countTotal,
                rateAuthority.integerDivisor,
                selected.length,
                binWidthValue,
                binWidthUnit,
                rateUnit,
              );
            }
          } else if (estimator === 'mean') {
            exactBinary64Mean(conditionValues);
          } else {
            const ordered = [...conditionValues].sort((left, right) => left - right);
            if (estimator === 'median' && ordered.length % 2 === 0) {
              const middle = ordered.length / 2;
              exactBinary64Mean([ordered[middle - 1], ordered[middle]]);
            } else if (estimator === 'trimmed_mean' && trimFraction !== undefined) {
              const perTail = floorExactBinary64TimesSafeInteger(
                trimFraction,
                ordered.length,
              );
              exactBinary64Mean(ordered.slice(perTail, ordered.length - perTail));
            }
          }
        } catch (error) {
          errors.push(
            makeError({
              code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
              stage: 'science',
              instancePath: pointer('data', 'observations', 'response', 'values'),
              validatorId: 'response_curve.estimator_declared',
              message: `condition ${JSON.stringify(conditionId)} cannot be estimated without collapsing a non-zero exact result (${error instanceof Error ? error.message : 'numeric failure'}).`,
            }),
          );
          break;
        }
      }
      if (asString(parameters.repeatDesign) === 'paired') {
        const reference = repeatSets.get(declared[0]) ?? new Set<string>();
        for (let ordinal = 1; ordinal < declared.length; ordinal++) {
          const conditionId = declared[ordinal];
          const candidate = repeatSets.get(conditionId) ?? new Set<string>();
          const differs = reference.size !== candidate.size ||
            [...reference].some((repeatId) => !candidate.has(repeatId));
          if (differs) {
            errors.push(
              makeError({
                code: 'SCIENCE_PAIRED_REPEATS_INCOMPLETE',
                stage: 'science',
                instancePath: pointer('data', 'observations', 'repeatIds'),
                validatorId: 'response_curve.estimator_declared',
                message: `repeatDesign is "paired", but condition ${JSON.stringify(conditionId)} does not carry the same repeat-id set as ${JSON.stringify(declared[0])}. Every paired replicate must have a row at every condition, including a null response when its measurement is undefined.`,
              }),
            );
            break;
          }
        }
      }
      if (asString(asRecord(parameters.uncertainty)?.reason) === 'single_trial') {
        const contradictingCondition = declared.find(
          (conditionId) => (submittedCounts.get(conditionId) ?? 0) > 1,
        );
        if (contradictingCondition !== undefined) {
          errors.push(
            makeError({
              code: 'SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA',
              stage: 'science',
              instancePath: pointer('parameters', 'uncertainty', 'reason'),
              validatorId: 'response_curve.estimator_declared',
              message: `uncertainty reason single_trial contradicts condition ${JSON.stringify(contradictingCondition)}, which contains ${submittedCounts.get(contradictingCondition)} attempted repeats.`,
            }),
          );
        }
      }
    }
  }

  if (
    responseMethod === 'peak_firing_rate' &&
    peakBasisVerification?.ok === true &&
    peakBasisVerification.kind === 'binned_count' &&
    rateAuthority?.ok === true &&
    values &&
    mode === 'aggregates' &&
    values.every((value) =>
      value === null ||
      (typeof value === 'number' && Number.isFinite(value) && value >= 0)
    )
  ) {
    const lattice = verifyBinnedPeakValueLattice(
      values,
      response?.basis,
      response?.unit,
      rateAuthority.integerDivisor,
      mode,
      parameters.estimator,
      mode === 'aggregates' ? carrier?.sampleCounts : undefined,
    );
    if (!lattice.ok) {
      const responseBase = pointer(
        'data',
        mode === 'aggregates' ? 'aggregates' : 'observations',
        'response',
      );
      const instancePath = lattice.path.startsWith('/values/')
        ? `${responseBase}${lattice.path}`
        : lattice.path.startsWith('/sampleCounts')
          ? `${pointer('data', 'aggregates')}${lattice.path}`
          : lattice.path === '/estimator'
            ? pointer('parameters', 'estimator')
            : `${responseBase}${lattice.path}`;
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath,
          validatorId: 'response_curve.estimator_declared',
          message: lattice.message,
        }),
      );
    }
  }

  return errors;
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
