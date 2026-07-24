/**
 * Stable distribution contracts whose accepted product branches need more than a
 * generic shape check.
 *
 * Each wrapper delegates arithmetic to `src/analysis/distributions.ts`. The semantic
 * layer only binds request fields to that independent kernel and translates a failed
 * invariant into a bounded Cortexel diagnostic. This separation keeps the renderer
 * from becoming the authority for the science it displays.
 */

import {
  deriveDegreeDistribution,
  deriveDelayDistribution,
  deriveIsiFromEvents,
  deriveIsiFromIntervals,
  derivePopulationRateCounts,
  deriveWeightDistribution,
  DistributionDerivationError,
  verifyHistogramValues,
  type ExactBinsInput,
  type HistogramNormalization,
  type OutOfRangePolicy,
  type PairAggregation,
} from '../../analysis/distributions.js';
import { materializeWidthBins } from '../binning.js';
import { makeError, pointer, type CortexelError } from '../errors.js';
import {
  binary64RelativeDifferenceWithinTolerance,
} from '../exact-binary64.js';
import {
  axesAreCompatible,
  compareExactUnitSumToValue,
  convert,
  dimensionOf,
  divideExactIntegerByConvertedDifference,
  isKnownUnit,
  kindAcceptsDimension,
  reciprocalUnit,
} from '../units.js';
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

function stringArray(value: unknown): string[] | undefined {
  const array = asArray(value);
  if (!array || !array.every((entry): entry is string => typeof entry === 'string')) return undefined;
  return array;
}

function numberArray(value: unknown): number[] | undefined {
  const array = asArray(value);
  if (!array || !array.every((entry): entry is number =>
    typeof entry === 'number' && Number.isFinite(entry))) return undefined;
  return array;
}

function nullableNumberArray(value: unknown): (number | null)[] | undefined {
  const array = asArray(value);
  if (!array || !array.every((entry): entry is number | null =>
    entry === null || (typeof entry === 'number' && Number.isFinite(entry)))) return undefined;
  return array;
}

function stageForCode(code: string): CortexelError['stage'] {
  if (code.startsWith('SEMANTIC_')) return 'semantic';
  if (code.startsWith('SCOPE_')) return 'scope';
  if (code.startsWith('RESOURCE_')) return 'budget';
  if (code.startsWith('RENDER_')) return 'render';
  return 'science';
}

function fromDerivationError(
  error: unknown,
  validatorId: string,
  base: readonly (string | number)[] = [],
): CortexelError[] {
  if (!(error instanceof DistributionDerivationError)) {
    const detail = error instanceof Error ? error.message : 'unknown arithmetic failure';
    return [makeError({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      stage: 'science',
      instancePath: pointer(...base),
      validatorId,
      message: `the exact distribution derivation could not be completed (${detail}).`,
    })];
  }
  return [makeError({
    code: error.code,
    stage: stageForCode(error.code),
    instancePath: pointer(...base, ...error.path),
    validatorId,
    message: error.message,
  })];
}

function resolveBins(
  spec: Record<string, unknown> | undefined,
  defaultFinalEdgeInclusive: boolean,
): ExactBinsInput | undefined {
  if (!spec) return undefined;
  const mode = asString(spec.mode);
  const unit = asString(spec.unit);
  if (!unit) return undefined;
  let edges: readonly number[] | undefined;
  if (mode === 'edges') edges = numberArray(spec.edges);
  if (mode === 'width') {
    const start = asNumber(spec.start);
    const stop = asNumber(spec.stop);
    const width = asNumber(spec.width);
    if (start === undefined || stop === undefined || width === undefined) return undefined;
    const materialized = materializeWidthBins(start, stop, width);
    if (!materialized.ok) return undefined;
    edges = materialized.edges;
  }
  if (!edges) return undefined;
  return {
    edges,
    unit,
    finalEdgeInclusive:
      typeof spec.finalEdgeInclusive === 'boolean'
        ? spec.finalEdgeInclusive
        : defaultFinalEdgeInclusive,
  };
}

function exactOuterEdgesMatchWindow(
  bins: ExactBinsInput,
  window: Record<string, unknown>,
  validatorId: string,
): CortexelError[] {
  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  const unit = asString(window.unit);
  if (start === undefined || stop === undefined || !unit || bins.edges.length < 2) return [];
  const errors: CortexelError[] = [];
  for (const check of [
    { edge: bins.edges[0], value: start, name: 'start', ordinal: 0 },
    {
      edge: bins.edges[bins.edges.length - 1],
      value: stop,
      name: 'stop',
      ordinal: bins.edges.length - 1,
    },
  ] as const) {
    try {
      const comparison = compareExactUnitSumToValue(
        [{ value: check.edge, unit: bins.unit }],
        { value: check.value, unit },
      );
      if (comparison !== 0) {
        errors.push(makeError({
          code: 'SCIENCE_BIN_EDGES_INVALID',
          stage: 'science',
          instancePath: pointer('parameters', 'bins', 'edges', check.ordinal),
          validatorId,
          message: `the ${check.name} bin edge must equal the observation-window ${check.name} exactly after registered-unit scaling.`,
        }));
      }
    } catch (error) {
      // Unit compatibility is shared by both endpoint comparisons. Once that
      // relation fails, repeating the same diagnostic for start and stop adds no
      // independent repair target and breaks one-relation/one-owner semantics.
      return [makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('parameters', 'bins', 'unit'),
        validatorId,
        message: `the bin axis cannot be compared with the observation window (${error instanceof Error ? error.message : 'unit failure'}).`,
      })];
    }
  }
  return errors;
}

function exactCountSum(values: readonly unknown[]): bigint | undefined {
  let total = 0n;
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return undefined;
    total += BigInt(value);
  }
  return total;
}

function countError(
  validatorId: string,
  path: readonly (string | number)[],
  message: string,
): CortexelError {
  return makeError({
    code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
    stage: 'science',
    instancePath: pointer(...path),
    validatorId,
    message,
  });
}

/** Revision-2 meaning of the historical rate.verify_normalization validator id. */
export const rateVerifyNormalization: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  if (context.skillId !== 'neuro.population_rate') return [];
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = 'rate.verify_normalization';
  const errors: CortexelError[] = [];
  const window = asRecord(data.window);
  if (!window) return [];
  if ((asString(window.boundary) ?? '[start,stop)') !== '[start,stop)') {
    errors.push(makeError({
      code: 'SCIENCE_WINDOW_INVALID',
      stage: 'science',
      instancePath: pointer('data', 'window', 'boundary'),
      validatorId,
      message: 'population-rate revision 2 uses exactly the half-open observation window [start,stop).',
    }));
  }
  if (asString(parameters.rateMode) !== 'binned_count') {
    errors.push(makeError({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      stage: 'science',
      instancePath: pointer('parameters', 'rateMode'),
      validatorId,
      message: 'kernel estimates are not accepted until a kernel, edge policy, table, summary, legend, and geometry are implemented as one contract branch.',
    }));
    return errors;
  }
  const mode = asString(data.mode);
  const bins = mode === 'events'
    ? resolveBins(asRecord(parameters.bins), false)
    : (() => {
        const node = asRecord(data.binEdges);
        const unit = asString(node?.unit);
        const edges = numberArray(node?.edges);
        return unit && edges ? { edges, unit, finalEdgeInclusive: false } : undefined;
      })();
  if (!bins) return errors;
  const windowUnit = asString(window.unit);
  // Canonical-code and `window.valid` own an invalid window unit. For event-mode
  // bins this validator owns the bare time-axis relation; the pre-binned branch is
  // owned by `unit.dimension_match`. Do not attempt an exact conversion until both
  // independent carriers are legal, or one alias/kind defect acquires a second
  // derivative diagnostic.
  if (
    windowUnit === undefined ||
    !isKnownUnit(windowUnit) ||
    dimensionOf(windowUnit) !== 'time' ||
    !isKnownUnit(bins.unit)
  ) return errors;
  if (dimensionOf(bins.unit) !== 'time') {
    if (mode === 'events') {
      errors.push(makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('parameters', 'bins', 'unit'),
        validatorId,
        message: `population-rate bin coordinates require a registered time unit; got ${bins.unit}.`,
      }));
    }
    return errors;
  }
  if (bins.finalEdgeInclusive) {
    errors.push(makeError({
      code: 'SCIENCE_BIN_EDGES_INVALID',
      stage: 'science',
      instancePath: pointer('parameters', 'bins', 'finalEdgeInclusive'),
      validatorId,
      message: 'population-rate bins tile [start,stop) exactly; an event at stop is outside the window and cannot enter the final bin.',
    }));
  }
  errors.push(...exactOuterEdgesMatchWindow(bins, window, validatorId));
  if (errors.length > 0) return errors;

  const normalization = asString(parameters.normalization);
  if (
    normalization !== 'mean_rate_per_recorded_sender' &&
    normalization !== 'total_event_rate'
  ) return errors;
  if (mode === 'events') {
    const eventTimes = asRecord(data.eventTimes);
    const times = numberArray(eventTimes?.values);
    const eventUnit = legalKnownUnit(eventTimes);
    const senders = stringArray(data.eventSenderIds);
    const recorded = stringArray(data.recordedSenderIds);
    if (!times || !eventUnit || !senders || !recorded) return errors;
    if (senders.length !== times.length) return errors;
    const senderSet = new Set(recorded);
    for (let ordinal = 0; ordinal < senders.length; ordinal++) {
      if (!senderSet.has(senders[ordinal])) {
        errors.push(makeError({
          code: 'SEMANTIC_UNKNOWN_REFERENCE',
          stage: 'semantic',
          instancePath: pointer('data', 'eventSenderIds', ordinal),
          validatorId,
          message: 'an event sender is absent from the complete recorded-sender universe.',
        }));
        break;
      }
    }
    try {
      derivePopulationRateCounts({
        eventTimes: times,
        eventUnit,
        bins,
        recordedSenderCount: recorded.length,
        normalization,
      });
    } catch (error) {
      errors.push(...fromDerivationError(error, validatorId, ['data']));
    }
    return errors;
  }

  if (mode !== 'prebinned') return errors;
  const counts = asArray(data.counts);
  const recorded = stringArray(data.recordedSenderIds);
  const recordedCount = asNumber(data.recordedSenderCount);
  const sourceEventCount = asNumber(data.sourceEventCount);
  if (!counts || !recorded || recordedCount === undefined || sourceEventCount === undefined) {
    return errors;
  }
  if (new Set(recorded).size !== recorded.length) return errors;
  if (!Number.isSafeInteger(recordedCount) || recordedCount !== recorded.length) {
    errors.push(countError(
      validatorId,
      ['data', 'recordedSenderCount'],
      `recordedSenderCount ${recordedCount} must equal the complete recordedSenderIds length ${recorded.length}.`,
    ));
  }
  const sourceEventCountValid = Number.isSafeInteger(sourceEventCount) && sourceEventCount >= 0;
  if (!sourceEventCountValid) {
    errors.push(makeError({
      code: 'SCIENCE_COUNT_NOT_INTEGER',
      stage: 'science',
      instancePath: pointer('data', 'sourceEventCount'),
      validatorId,
      message: 'sourceEventCount must be an exact non-negative safe integer.',
    }));
  }
  if (counts.length !== bins.edges.length - 1) {
    errors.push(makeError({
      code: 'SEMANTIC_LENGTH_MISMATCH',
      stage: 'semantic',
      instancePath: pointer('data', 'counts'),
      validatorId,
      message: `counts has ${counts.length} entries for ${bins.edges.length - 1} bins.`,
    }));
    return errors;
  }
  const sum = exactCountSum(counts);
  if (sum === undefined) {
    errors.push(makeError({
      code: 'SCIENCE_COUNT_NOT_INTEGER',
      stage: 'science',
      instancePath: pointer('data', 'counts'),
      validatorId,
      message: 'every pre-binned event count must be an exact non-negative safe integer.',
    }));
    return errors;
  }
  if (sourceEventCountValid && sum !== BigInt(sourceEventCount)) {
    errors.push(countError(
      validatorId,
      ['data', 'sourceEventCount'],
      `sum(counts) is ${sum}, not declared in-window sourceEventCount ${sourceEventCount}. No first, middle, or final bin may vanish.`,
    ));
  }
  const ratesNode = asRecord(data.rates);
  const rates = numberArray(ratesNode?.values);
  const rateUnit = legalKnownUnit(ratesNode);
  if (rates && rateUnit) {
    if (rates.length !== counts.length) {
      errors.push(makeError({
        code: 'SEMANTIC_LENGTH_MISMATCH',
        stage: 'semantic',
        instancePath: pointer('data', 'rates', 'values'),
        validatorId,
        message: 'supplied rate values must be parallel to exact counts.',
      }));
    } else {
      for (let ordinal = 0; ordinal < rates.length; ordinal++) {
        const count = counts[ordinal];
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) continue;
        try {
          const divisor = normalization === 'mean_rate_per_recorded_sender' ? recorded.length : 1;
          const expected = divideExactIntegerByConvertedDifference(
            count,
            divisor,
            bins.edges[ordinal],
            bins.edges[ordinal + 1],
            bins.unit,
            's',
          );
          const actual = convert(rates[ordinal], rateUnit, 'Hz');
          if (
            (actual === 0) !== (expected === 0) ||
            !binary64RelativeDifferenceWithinTolerance(actual, expected, 1e-9)
          ) {
            errors.push(countError(
              validatorId,
              ['data', 'rates', 'values', ordinal],
              `supplied rate does not equal count/exposure for bin ${ordinal}; expected ${expected} Hz.`,
            ));
            break;
          }
        } catch (error) {
          errors.push(countError(
            validatorId,
            ['data', 'rates', 'values', ordinal],
            `supplied rate could not be verified (${error instanceof Error ? error.message : 'numeric failure'}).`,
          ));
          break;
        }
      }
    }
  }
  return errors;
};

/** Revision-2 meaning of isi.within_train_only: train authority plus conservation. */
export const isiWithinTrainOnly: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  if (context.skillId !== 'neuro.isi_distribution') return [];
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = 'isi.within_train_only';
  const window = asRecord(data.window);
  const bins = resolveBins(asRecord(parameters.bins), true);
  const recordedSenderIds = stringArray(data.recordedSenderIds);
  if (!window || !bins || !recordedSenderIds) return [];
  const boundary = asString(window.boundary) ?? '[start,stop)';
  if (boundary !== '[start,stop)') {
    return [makeError({
      code: 'SCIENCE_WINDOW_INVALID',
      stage: 'science',
      instancePath: pointer('data', 'window', 'boundary'),
      validatorId,
      message: 'ISI revision 2 forms intervals only from the exact half-open event window [start,stop).',
    })];
  }
  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  const windowUnit = asString(window.unit);
  if (start === undefined || stop === undefined || !windowUnit) return [];
  if (
    !isKnownUnit(windowUnit) || dimensionOf(windowUnit) !== 'time' ||
    !isKnownUnit(bins.unit) || dimensionOf(bins.unit) !== 'time'
  ) return [];
  const normalization = asString(parameters.normalization) as HistogramNormalization | undefined;
  const outOfRangePolicy = asString(parameters.outOfRangeIntervals) as OutOfRangePolicy | undefined;
  const zeroIntervalPolicy = asString(parameters.zeroIntervalPolicy) as
    | 'reject'
    | 'retain_as_zero'
    | undefined;
  if (!normalization || !outOfRangePolicy || !zeroIntervalPolicy) {
    return [makeError({
      code: 'SCIENCE_ZERO_INTERVAL_POLICY',
      stage: 'science',
      instancePath: pointer('parameters', 'zeroIntervalPolicy'),
      validatorId,
      message: 'every ISI request declares how a same-train zero interval is handled.',
    })];
  }
  const trialIds = stringArray(data.trialIds);
  try {
    if (asString(data.mode) === 'events') {
      const eventTimesNode = asRecord(data.eventTimes);
      const eventTimes = numberArray(eventTimesNode?.values);
      const eventUnit = legalKnownUnit(eventTimesNode);
      const eventSenderIds = stringArray(data.eventSenderIds);
      const eventTrialIds = stringArray(data.eventTrialIds);
      if (!eventTimes || !eventUnit || !eventSenderIds) return [];
      deriveIsiFromEvents({
        eventTimes,
        eventSenderIds,
        ...(eventTrialIds ? { eventTrialIds } : {}),
        recordedSenderIds,
        ...(trialIds ? { trialIds } : {}),
        intervalUnit: eventUnit,
        window: { start, stop, unit: windowUnit, boundary },
        bins,
        normalization,
        zeroIntervalPolicy,
        outOfRangePolicy,
      });
      return [];
    }
    if (asString(data.mode) === 'intervals') {
      const intervalsNode = asRecord(data.intervals);
      const intervals = numberArray(intervalsNode?.values);
      const intervalUnit = legalKnownUnit(intervalsNode);
      const intervalSenderIds = stringArray(data.intervalSenderIds);
      const intervalTrialIds = stringArray(data.intervalTrialIds);
      const rawTrains = asArray(data.trains);
      if (!intervals || !intervalUnit || !intervalSenderIds || !rawTrains) return [];
      const trains = rawTrains.flatMap((entry) => {
        const train = asRecord(entry);
        const senderId = asString(train?.senderId);
        const trialId = asString(train?.trialId);
        const spikeCount = asNumber(train?.spikeCount);
        return senderId !== undefined && spikeCount !== undefined
          ? [{ senderId, ...(trialId ? { trialId } : {}), spikeCount }]
          : [];
      });
      if (trains.length !== rawTrains.length) return [];
      deriveIsiFromIntervals({
        intervals,
        intervalSenderIds,
        ...(intervalTrialIds ? { intervalTrialIds } : {}),
        trains,
        recordedSenderIds,
        ...(trialIds ? { trialIds } : {}),
        intervalUnit,
        window: { start, stop, unit: windowUnit, boundary },
        bins,
        normalization,
        zeroIntervalPolicy,
        outOfRangePolicy,
      });
    }
    return [];
  } catch (error) {
    return fromDerivationError(error, validatorId, ['data']);
  }
};

/**
 * Historical narrow entrypoint. The full validator owns the exact composite train
 * key; this projection prevents the registry symbol from becoming a misleading
 * no-op while avoiding duplicate non-zero-policy diagnostics.
 */
export const isiZeroIntervalPolicy: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => isiWithinTrainOnly(context).filter(
  (error) => error.code === 'SCIENCE_ZERO_INTERVAL_POLICY',
);

function exactSameSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return rightSet.size === right.length && left.every((value) => rightSet.has(value));
}

/** Revision-2 degree validator: policy, universe, scope, and exact incidence identity. */
export const degreeCountingPolicyDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  if (context.skillId !== 'network.degree_distribution') return [];
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = 'degree.counting_policy_declared';
  const universe = asRecord(data.nodeUniverse);
  const nodeIds = stringArray(universe?.ids);
  if (!nodeIds) return [];
  const errors: CortexelError[] = [];
  if (universe?.complete !== true) {
    errors.push(makeError({
      code: 'SCOPE_NODE_UNIVERSE_REQUIRED',
      stage: 'scope',
      instancePath: pointer('data', 'nodeUniverse', 'complete'),
      validatorId,
      message: 'degree enumeration requires a complete node universe, including every zero-degree node.',
    }));
  }
  const scope = asRecord(data.scope);
  if (asString(scope?.kind) === 'mpi_target_rank_local') {
    const observed = stringArray(data.observedTargetIds);
    if (!observed || !exactSameSet(nodeIds, observed)) {
      errors.push(makeError({
        code: 'SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL',
        stage: 'scope',
        instancePath: pointer('data', 'observedTargetIds'),
        validatorId,
        message: 'a rank-local in-degree universe must equal the complete observed target-id authority exactly; silent owned targets cannot disappear.',
      }));
    }
  }
  if (asString(scope?.kind) === 'sampled') {
    errors.push(makeError({
      code: 'SCOPE_INCOMPATIBLE_WITH_SKILL',
      stage: 'scope',
      instancePath: pointer('data', 'scope', 'kind'),
      validatorId,
      message: 'a sampled edge set cannot establish exact degrees.',
    }));
  }
  const direction = asString(parameters.direction) as 'in' | 'out' | undefined;
  const countingPolicy = asString(parameters.countingPolicy) as
    | 'count_edges'
    | 'count_unique_neighbors'
    | undefined;
  const autapsePolicy = asString(parameters.autapsePolicy) as 'include' | 'exclude' | undefined;
  const normalization = asString(parameters.normalization) as 'count' | 'probability' | undefined;
  const binning = asRecord(parameters.binning);
  const binningMode = asString(binning?.mode);
  if (!direction || !countingPolicy || !autapsePolicy || !normalization || !binningMode) {
    return errors;
  }
  if (binningMode !== 'per_integer_degree') {
    errors.push(makeError({
      code: 'SCIENCE_BIN_EDGES_INVALID',
      stage: 'science',
      instancePath: pointer('parameters', 'binning', 'mode'),
      validatorId,
      message: 'revision 2 retains one integer degree per bin so sum(degree × nodeCount) remains independently recoverable from the returned table.',
    }));
    return errors;
  }
  try {
    if (asString(data.mode) === 'connections') {
      const connections = asRecord(data.connections);
      const sourceIds = stringArray(connections?.sourceIds);
      const targetIds = stringArray(connections?.targetIds);
      if (!sourceIds || !targetIds) return errors;
      deriveDegreeDistribution({
        nodeIds,
        sourceIds,
        targetIds,
        direction,
        countingPolicy,
        autapsePolicy,
        binning: { mode: 'per_integer_degree' },
        normalization,
      });
    } else if (asString(data.mode) === 'node_degrees') {
      const supplied = asRecord(data.nodeDegrees);
      const suppliedNodeIds = stringArray(supplied?.nodeIds);
      const suppliedDegrees = numberArray(supplied?.degrees);
      const countedConnectionCount = asNumber(data.countedConnectionCount);
      const countedIncidenceCount = asNumber(data.countedIncidenceCount);
      const excludedAutapseCount = asNumber(data.excludedAutapseCount);
      if (
        !suppliedNodeIds || !suppliedDegrees ||
        countedConnectionCount === undefined || countedIncidenceCount === undefined
      ) return errors;
      if (autapsePolicy === 'exclude' && excludedAutapseCount === undefined) {
        errors.push(countError(
          validatorId,
          ['data', 'excludedAutapseCount'],
          'supplied node degrees under autapse exclusion require the exact removed-row count.',
        ));
      }
      if (autapsePolicy === 'include' && excludedAutapseCount !== undefined) {
        errors.push(countError(
          validatorId,
          ['data', 'excludedAutapseCount'],
          'excludedAutapseCount has no role when autapses are included.',
        ));
      }
      deriveDegreeDistribution({
        nodeIds,
        suppliedNodeIds,
        suppliedDegrees,
        suppliedCountedConnectionCount: countedConnectionCount,
        suppliedCountedIncidenceCount: countedIncidenceCount,
        ...(excludedAutapseCount !== undefined ? { suppliedExcludedAutapseCount: excludedAutapseCount } : {}),
        direction,
        countingPolicy,
        autapsePolicy,
        binning: { mode: 'per_integer_degree' },
        normalization,
      });
    }
  } catch (error) {
    errors.push(...fromDerivationError(error, validatorId, ['data']));
  }
  return errors;
};

function rankLocalEdgeScopeErrors(input: {
  readonly context: SemanticContext;
  readonly validatorId: string;
  readonly targetIds?: readonly string[];
  readonly declaredTargets?: readonly string[];
  readonly allowedTargets?: readonly string[];
  readonly consideredConnectionCount: number;
  readonly pairAggregation: boolean;
}): CortexelError[] {
  const data = getData(input.context);
  const scope = asRecord(data.scope);
  const kind = asString(scope?.kind);
  const errors: CortexelError[] = [];
  if (kind === 'mpi_target_rank_local') {
    if (scope?.localTargetUniverseComplete !== true) {
      errors.push(makeError({
        code: 'SCOPE_INCOMPATIBLE_WITH_SKILL',
        stage: 'scope',
        instancePath: pointer('data', 'scope', 'localTargetUniverseComplete'),
        validatorId: input.validatorId,
        message: 'a target-rank-local edge distribution requires the complete local target rectangle.',
      }));
    }
    const observed = stringArray(data.observedTargetIds);
    if (!observed || observed.length === 0) {
      errors.push(makeError({
        code: 'SCOPE_INCOMPATIBLE_WITH_SKILL',
        stage: 'scope',
        instancePath: pointer('data', 'observedTargetIds'),
        validatorId: input.validatorId,
        message: 'rank-local edge evidence requires a complete non-empty observedTargetIds authority.',
      }));
    } else {
      if (input.declaredTargets && !exactSameSet(observed, input.declaredTargets)) {
        errors.push(makeError({
          code: 'SCOPE_MERGE_CONFLICT',
          stage: 'scope',
          instancePath: pointer('data', 'observedTargetIds'),
          validatorId: input.validatorId,
          message: 'the declared target selection must equal the target ids this rank says it owns.',
        }));
      }
      if (input.allowedTargets) {
        const allowed = new Set(input.allowedTargets);
        const outsideAuthority = observed.findIndex((target) => !allowed.has(target));
        if (outsideAuthority >= 0) {
          errors.push(makeError({
            code: 'SCOPE_MERGE_CONFLICT',
            stage: 'scope',
            instancePath: pointer('data', 'observedTargetIds', outsideAuthority),
            validatorId: input.validatorId,
            message: 'the rank-owned target authority must be contained in the declared endpoint universe.',
          }));
        }
      }
      if (input.targetIds) {
        const owned = new Set(observed);
        const outside = input.targetIds.findIndex((target) => !owned.has(target));
        if (outside >= 0) {
          errors.push(makeError({
            code: 'SCOPE_MERGE_CONFLICT',
            stage: 'scope',
            instancePath: pointer('data', 'connections', 'targetIds', outside),
            validatorId: input.validatorId,
            message: 'a rank-local connection targets a node absent from this rank’s ownership authority.',
          }));
        }
      }
    }
  }
  if (kind === 'sampled') {
    const retained = asNumber(scope?.retainedConnectionCount);
    if (retained !== undefined && retained !== input.consideredConnectionCount) {
      errors.push(countError(
        input.validatorId,
        ['data', 'scope', 'retainedConnectionCount'],
        `sampled scope retained ${retained} rows but the distribution accounts for ${input.consideredConnectionCount}.`,
      ));
    }
    if (input.pairAggregation) {
      errors.push(makeError({
        code: 'SCOPE_INCOMPATIBLE_WITH_SKILL',
        stage: 'scope',
        instancePath: pointer('data', 'scope', 'kind'),
        validatorId: input.validatorId,
        message: 'a sampled subset cannot establish a complete multapse aggregate for an ordered pair.',
      }));
    }
  }
  return errors;
}

function validatePrebinnedAccounting(input: {
  readonly data: Record<string, unknown>;
  readonly parameters: Record<string, unknown>;
  readonly bins: ExactBinsInput;
  readonly validatorId: string;
  readonly totalField: string;
  readonly underField: string;
  readonly overField: string;
}): CortexelError[] {
  const counts = asArray(input.data.counts);
  const total = asNumber(input.data[input.totalField]);
  const under = asNumber(input.data[input.underField]);
  const over = asNumber(input.data[input.overField]);
  if (!counts || total === undefined || under === undefined || over === undefined) return [];
  const errors: CortexelError[] = [];
  let accountingScalarsValid = true;
  if (counts.length !== input.bins.edges.length - 1) {
    errors.push(makeError({
      code: 'SEMANTIC_LENGTH_MISMATCH',
      stage: 'semantic',
      instancePath: pointer('data', 'counts'),
      validatorId: input.validatorId,
      message: `counts has ${counts.length} entries for ${input.bins.edges.length - 1} bins.`,
    }));
    return errors;
  }
  const countSum = exactCountSum(counts);
  for (const [name, value] of [
    [input.totalField, total],
    [input.underField, under],
    [input.overField, over],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      accountingScalarsValid = false;
      errors.push(makeError({
        code: 'SCIENCE_COUNT_NOT_INTEGER',
        stage: 'science',
        instancePath: pointer('data', name),
        validatorId: input.validatorId,
        message: `${name} must be an exact non-negative safe integer.`,
      }));
    }
  }
  if (countSum === undefined) {
    errors.push(makeError({
      code: 'SCIENCE_COUNT_NOT_INTEGER',
      stage: 'science',
      instancePath: pointer('data', 'counts'),
      validatorId: input.validatorId,
      message: 'every bin count must be an exact non-negative safe integer.',
    }));
    return errors;
  }
  if (!accountingScalarsValid) return errors;
  if (countSum + BigInt(under) + BigInt(over) !== BigInt(total)) {
    errors.push(countError(
      input.validatorId,
      ['data', input.totalField],
      `sum(counts) + ${input.underField} + ${input.overField} must equal ${input.totalField} exactly.`,
    ));
  }
  const policy = asString(
    input.parameters.outOfRangeDelays ?? input.parameters.outOfRangeWeights,
  );
  if (policy === 'reject' && (under !== 0 || over !== 0)) {
    errors.push(makeError({
      code: 'SCIENCE_BIN_EDGES_INVALID',
      stage: 'science',
      instancePath: pointer('data', under !== 0 ? input.underField : input.overField),
      validatorId: input.validatorId,
      message: 'reject requires every accepted observation to lie inside the declared bin range.',
    }));
  }
  const normalization = asString(input.parameters.normalization);
  const histogram = asRecord(input.data.histogram);
  const suppliedValues = numberArray(histogram?.values);
  const expectedKind = normalization === 'density' ? 'probability_density' : normalization;
  if (histogram && asString(histogram.kind) !== expectedKind) {
    errors.push(countError(
      input.validatorId,
      ['data', 'histogram', 'kind'],
      `histogram.kind must be ${expectedKind} for normalization ${normalization}.`,
    ));
  }
  if (suppliedValues && normalization === 'count') {
    if (
      suppliedValues.length !== counts.length ||
      suppliedValues.some((value, ordinal) => value !== counts[ordinal])
    ) {
      errors.push(countError(
        input.validatorId,
        ['data', 'histogram', 'values'],
        'count histogram values must equal the exact raw counts element for element.',
      ));
    }
  }
  if (suppliedValues && (normalization === 'probability' || normalization === 'density')) {
    try {
      const mismatches = verifyHistogramValues({
        counts: counts as number[],
        suppliedValues,
        edges: input.bins.edges,
        unit: input.bins.unit,
        normalization,
      });
      if (mismatches.length > 0) {
        errors.push(countError(
          input.validatorId,
          ['data', 'histogram', 'values', mismatches[0]],
          'supplied normalized value does not follow from its exact count and in-range denominator.',
        ));
      }
    } catch (error) {
      errors.push(...fromDerivationError(error, input.validatorId, ['data']));
    }
  }
  return errors;
}

/** Revision-2 delay validator: positivity plus scope, partition, and conservation. */
export const topologyDelayPositive: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  if (context.skillId !== 'network.delay_distribution') {
    // Other topology skills still use the historical pointwise positivity rule.
    const values = asArray(asRecord(asRecord(getData(context).connections)?.delays)?.values);
    if (!values) return [];
    // Adjacency carries an optional delay channel whose null entries mean that the
    // attribute is unobserved, not that a zero/nonpositive delay was measured.  The
    // structural schemas decide which historical consumers admit null; this shared
    // semantic guard must preserve the earlier topology rule and validate only present
    // measurements. Delay-matrix schemas still require a number for every row.
    const invalid = values.findIndex((value) =>
      value !== null &&
      (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)));
    return invalid < 0 ? [] : [makeError({
      code: 'SCIENCE_DELAY_NONPOSITIVE',
      stage: 'science',
      instancePath: pointer('data', 'connections', 'delays', 'values', invalid),
      validatorId: 'topology.delay_positive',
      message: 'a delay must be finite and strictly positive.',
    })];
  }
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = 'topology.delay_positive';
  const bins = resolveBins(asRecord(parameters.bins), true);
  if (!bins) return [];
  if (!isKnownUnit(bins.unit) || dimensionOf(bins.unit) !== 'time') return [];
  const normalization = asString(parameters.normalization) as HistogramNormalization | undefined;
  const outOfRangePolicy = asString(parameters.outOfRangeDelays) as OutOfRangePolicy | undefined;
  const countingPolicy = asString(parameters.countingPolicy) as
    | 'per_connection'
    | 'per_ordered_pair'
    | undefined;
  if (!normalization || !outOfRangePolicy || !countingPolicy) return [];
  const errors: CortexelError[] = [];
  if (asString(data.mode) === 'connections') {
    const connections = asRecord(data.connections);
    const sourceIds = stringArray(connections?.sourceIds);
    const targetIds = stringArray(connections?.targetIds);
    const delays = numberArray(asRecord(connections?.delays)?.values);
    const delayUnit = legalKnownUnit(asRecord(connections?.delays));
    const nodeIds = stringArray(asRecord(data.nodeUniverse)?.ids);
    const synapseModels = stringArray(connections?.synapseModels);
    const groupBy = asString(data.groupBy) as 'none' | 'synapse_model' | undefined;
    const aggregation = asString(parameters.multapseAggregation) as
      | 'min'
      | 'mean'
      | 'max'
      | 'no_aggregation'
      | undefined;
    if (!sourceIds || !targetIds || !delays || !delayUnit || !nodeIds || !groupBy) return [];
    try {
      deriveDelayDistribution({
        sourceIds,
        targetIds,
        delayValues: delays,
        delayUnit,
        nodeUniverse: nodeIds,
        ...(synapseModels ? { synapseModels } : {}),
        groupBy,
        countingPolicy,
        ...(aggregation ? { aggregation } : {}),
        bins: { ...bins, edgeToleranceUlps: 8 },
        normalization,
        outOfRangePolicy,
      });
    } catch (error) {
      errors.push(...fromDerivationError(error, validatorId, ['data', 'connections']));
    }
    errors.push(...rankLocalEdgeScopeErrors({
      context,
      validatorId,
      targetIds,
      allowedTargets: nodeIds,
      consideredConnectionCount: sourceIds.length,
      pairAggregation: countingPolicy === 'per_ordered_pair',
    }));
    return errors;
  }
  if (asString(data.mode) !== 'prebinned') return [];
  errors.push(...validatePrebinnedAccounting({
    data,
    parameters,
    bins,
    validatorId,
    totalField: 'totalObservationCount',
    underField: 'underRangeCount',
    overField: 'overRangeCount',
  }));
  const considered = asNumber(data.consideredConnectionCount);
  const total = asNumber(data.totalObservationCount);
  if (considered !== undefined && total !== undefined) {
    if (countingPolicy === 'per_connection' && considered !== total) {
      errors.push(countError(
        validatorId,
        ['data', 'totalObservationCount'],
        'per_connection requires exactly one delay observation per considered connection row.',
      ));
    }
    if (countingPolicy === 'per_ordered_pair') {
      const pairCount = asNumber(data.consideredOrderedPairCount);
      if (!Number.isSafeInteger(pairCount) || pairCount! < 0 || pairCount !== total || pairCount! > considered) {
        errors.push(countError(
          validatorId,
          ['data', 'consideredOrderedPairCount'],
          'pre-binned per_ordered_pair requires an exact pair count equal to total observations and no greater than considered rows.',
        ));
      }
    }
    if (asString(data.groupBy) !== 'none') {
      errors.push(countError(
        validatorId,
        ['data', 'groupBy'],
        'revision-2 pre-binned delay input has one count vector and therefore supports exactly groupBy: none.',
      ));
    }
    errors.push(...rankLocalEdgeScopeErrors({
      context,
      validatorId,
      declaredTargets: stringArray(data.observedTargetIds),
      consideredConnectionCount: considered,
      pairAggregation: countingPolicy === 'per_ordered_pair',
    }));
  }
  return errors;
};

function validateWeightZeroAxis(
  bins: ExactBinsInput,
  signTreatment: string | undefined,
  validatorId: string,
): CortexelError[] {
  const first = bins.edges[0];
  const last = bins.edges[bins.edges.length - 1];
  if (signTreatment === 'magnitude' && first < 0) {
    return [makeError({
      code: 'SCIENCE_BIN_EDGES_INVALID',
      stage: 'science',
      instancePath: pointer('parameters', 'bins'),
      validatorId,
      message: 'magnitude observations are non-negative; a negative bin domain has no accepted role.',
    })];
  }
  if (signTreatment === 'preserve' && first < 0 && last > 0 && !bins.edges.some((edge) => edge === 0)) {
    return [makeError({
      code: 'SCIENCE_BIN_EDGES_INVALID',
      stage: 'science',
      instancePath: pointer('parameters', 'bins'),
      validatorId,
      message: 'a sign-preserving range that spans zero requires an exact binary64 edge at 0; no bin may conflate negative and non-negative weights.',
    })];
  }
  return [];
}

function validateWeightComparability(
  parameters: Record<string, unknown>,
  models: readonly string[],
  validatorId: string,
): CortexelError[] {
  const distinct = [...new Set(models)].sort();
  const claim = asRecord(parameters.weightComparability);
  const mode = asString(claim?.mode);
  if (mode === 'single_synapse_model' && distinct.length !== 1) {
    return [makeError({
      code: 'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
      stage: 'science',
      instancePath: pointer('parameters', 'weightComparability'),
      validatorId,
      message: `single_synapse_model was declared but ${distinct.length} distinct models contribute.`,
    })];
  }
  if (mode === 'declared_comparable_models') {
    const declared = stringArray(claim?.comparableModels);
    if (!declared || new Set(declared).size !== declared.length || !exactSameSet(distinct, declared)) {
      return [makeError({
        code: 'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
        stage: 'science',
        instancePath: pointer('parameters', 'weightComparability', 'comparableModels'),
        validatorId,
        message: 'declared comparable models must equal the distinct contributing model set exactly once.',
      })];
    }
  }
  if (asString(parameters.grouping) === 'by_synapse_model' && distinct.length < 2) {
    return [makeError({
      code: 'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
      stage: 'science',
      instancePath: pointer('parameters', 'grouping'),
      validatorId,
      message: 'grouping one model is a redundant second encoding of the ungrouped figure.',
    })];
  }
  return [];
}

/** Revision-2 weight validator: comparability plus exact row/observation accounting. */
export const topologyWeightGroupCompatible: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  if (context.skillId !== 'network.weight_distribution') {
    // Preserve the historical guard for matrix and trace consumers.
    const data = getData(context);
    const connections = asRecord(data.connections);
    const models = stringArray(connections?.synapseModels);
    if (!models || new Set(models).size <= 1 || asString(getParameters(context).synapseModelGroup)) {
      return [];
    }
    return [makeError({
      code: 'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
      stage: 'science',
      instancePath: pointer('data', 'connections', 'synapseModels'),
      validatorId: 'topology.weight_group_compatible',
      message: 'weights from multiple models require an explicit comparability/group declaration.',
    })];
  }
  const data = getData(context);
  const parameters = getParameters(context);
  const validatorId = 'topology.weight_group_compatible';
  const mode = asString(data.mode);
  const bins = mode === 'connections'
    ? resolveBins(asRecord(parameters.bins), true)
    : (() => {
        const node = asRecord(data.binEdges);
        const edges = numberArray(node?.edges);
        const unit = asString(node?.unit);
        return edges && unit ? { edges, unit, finalEdgeInclusive: true } : undefined;
      })();
  if (!bins) return [];
  if (!isKnownUnit(bins.unit)) return [];
  if (
    mode === 'prebinned' &&
    !kindAcceptsDimension('synaptic_weight', String(dimensionOf(bins.unit)))
  ) return [];
  const errors = validateWeightZeroAxis(bins, asString(parameters.signTreatment), validatorId);
  const observationUnit = asString(parameters.observationUnit) as 'synapse' | 'node_pair' | undefined;
  const grouping = asString(parameters.grouping) as 'none' | 'by_synapse_model' | undefined;
  const signTreatment = asString(parameters.signTreatment) as 'preserve' | 'magnitude' | undefined;
  const normalization = asString(parameters.normalization) as HistogramNormalization | undefined;
  const outOfRangePolicy = asString(parameters.outOfRangeWeights) as OutOfRangePolicy | undefined;
  const aggregation = asString(parameters.aggregation) as PairAggregation | undefined;
  if (!observationUnit || !grouping || !signTreatment || !normalization || !outOfRangePolicy) {
    return errors;
  }
  const sourceUniverseNode = asRecord(data.sourceUniverse);
  const targetUniverseNode = asRecord(data.targetUniverse);
  const sourceUniverse = stringArray(sourceUniverseNode?.ids);
  const targetUniverse = stringArray(targetUniverseNode?.ids);
  if (!sourceUniverse || !targetUniverse) return errors;
  if (sourceUniverseNode?.complete !== true || targetUniverseNode?.complete !== true) {
    errors.push(makeError({
      code: 'SCOPE_NODE_UNIVERSE_REQUIRED',
      stage: 'scope',
      instancePath: pointer('data', sourceUniverseNode?.complete !== true ? 'sourceUniverse' : 'targetUniverse', 'complete'),
      validatorId,
      message: 'the selected source × target rectangle requires complete declared endpoint universes.',
    }));
  }
  if (mode === 'connections') {
    const connections = asRecord(data.connections);
    const sourceIds = stringArray(connections?.sourceIds);
    const targetIds = stringArray(connections?.targetIds);
    const weights = nullableNumberArray(asRecord(connections?.weights)?.values);
    const weightUnit = legalKnownUnit(asRecord(connections?.weights));
    const models = stringArray(connections?.synapseModels);
    if (!sourceIds || !targetIds || !weights || !weightUnit || !models) return errors;
    if (!(weightUnit === bins.unit || axesAreCompatible(weightUnit, bins.unit))) return errors;
    errors.push(...validateWeightComparability(parameters, models, validatorId));
    try {
      const result = deriveWeightDistribution({
        sourceIds,
        targetIds,
        weightValues: weights,
        weightUnit,
        sourceUniverse,
        targetUniverse,
        synapseModels: models,
        grouping,
        observationUnit,
        ...(aggregation ? { aggregation } : {}),
        signTreatment,
        bins,
        normalization,
        outOfRangePolicy,
      });
      if (
        asString(parameters.xScale) === 'log' &&
        (bins.edges.some((edge) => !(edge > 0)) ||
          result.minimumObservation === null ||
          !(result.minimumObservation > 0))
      ) {
        errors.push(makeError({
          code: 'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
          stage: 'render',
          instancePath: pointer('parameters', 'xScale'),
          validatorId,
          message: 'a logarithmic weight axis requires every edge and every formed observation to be strictly positive; missing values are not converted to zero.',
        }));
      }
    } catch (error) {
      errors.push(...fromDerivationError(error, validatorId, ['data', 'connections']));
    }
    errors.push(...rankLocalEdgeScopeErrors({
      context,
      validatorId,
      targetIds,
      declaredTargets: targetUniverse,
      consideredConnectionCount: sourceIds.length,
      pairAggregation: observationUnit === 'node_pair',
    }));
    return errors;
  }
  if (mode !== 'prebinned') return errors;
  const models = stringArray(data.contributingSynapseModels);
  if (models) errors.push(...validateWeightComparability(parameters, models, validatorId));
  if (grouping !== 'none') {
    errors.push(countError(
      validatorId,
      ['parameters', 'grouping'],
      'revision-2 pre-binned input has one count vector and therefore supports exactly grouping: none.',
    ));
  }
  errors.push(...validatePrebinnedAccounting({
    data,
    parameters,
    bins,
    validatorId,
    totalField: 'totalObservationCount',
    underField: 'excludedUnderRangeCount',
    overField: 'excludedOverRangeCount',
  }));
  const sourceConnectionCount = asNumber(data.sourceConnectionCount);
  const missingWeightCount = asNumber(data.missingWeightCount);
  const missingObservationCount = asNumber(data.missingObservationCount);
  const totalObservationCount = asNumber(data.totalObservationCount);
  const zeroWeightCount = asNumber(data.zeroWeightCount);
  if (
    sourceConnectionCount !== undefined && missingWeightCount !== undefined &&
    missingObservationCount !== undefined &&
    totalObservationCount !== undefined && zeroWeightCount !== undefined
  ) {
    let accountingScalarsValid = true;
    for (const [name, value] of [
      ['sourceConnectionCount', sourceConnectionCount],
      ['missingWeightCount', missingWeightCount],
      ['missingObservationCount', missingObservationCount],
      ['totalObservationCount', totalObservationCount],
      ['zeroWeightCount', zeroWeightCount],
    ] as const) {
      if (!Number.isSafeInteger(value) || value < 0) {
        accountingScalarsValid = false;
        errors.push(makeError({
          code: 'SCIENCE_COUNT_NOT_INTEGER',
          stage: 'science',
          instancePath: pointer('data', name),
          validatorId,
          message: `${name} must be an exact non-negative safe integer.`,
        }));
      }
    }
    if (!accountingScalarsValid) return errors;
    if (zeroWeightCount > totalObservationCount) {
      errors.push(countError(
        validatorId,
        ['data', 'zeroWeightCount'],
        'measured-zero observations cannot outnumber all formed observations.',
      ));
    }
    if (observationUnit === 'synapse') {
      if (
        missingObservationCount !== missingWeightCount ||
        BigInt(totalObservationCount) + BigInt(missingObservationCount) !== BigInt(sourceConnectionCount)
      ) {
        errors.push(countError(
          validatorId,
          ['data', 'sourceConnectionCount'],
          'synapse mode requires missing observations to equal missing rows and every connection to be exactly one measured or missing observation.',
        ));
      }
    } else {
      const pairCount = asNumber(data.sourceOrderedPairCount);
      if (
        !Number.isSafeInteger(pairCount) || pairCount! < 0 ||
        BigInt(totalObservationCount) + BigInt(missingObservationCount) !== BigInt(pairCount!) ||
        pairCount! > sourceConnectionCount ||
        missingObservationCount > missingWeightCount
      ) {
        errors.push(countError(
          validatorId,
          ['data', 'sourceOrderedPairCount'],
          'node_pair mode requires exact pair accounting: observed pairs + missing pairs = source ordered pairs <= connection rows.',
        ));
      }
    }
    if (asString(parameters.xScale) === 'log' && (bins.edges.some((edge) => !(edge > 0)) || zeroWeightCount > 0)) {
      errors.push(makeError({
        code: 'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
        stage: 'render',
        instancePath: pointer('parameters', 'xScale'),
        validatorId,
        message: 'a logarithmic axis cannot represent a measured zero or a non-positive bin edge.',
      }));
    }
    errors.push(...rankLocalEdgeScopeErrors({
      context,
      validatorId,
      declaredTargets: targetUniverse,
      consideredConnectionCount: sourceConnectionCount,
      pairAggregation: observationUnit === 'node_pair',
    }));
  }
  const histogram = asRecord(data.histogram);
  if (histogram) {
    const expectedUnit = normalization === 'density' ? reciprocalUnit(bins.unit) : '1';
    if (expectedUnit === undefined || asString(histogram.unit) !== expectedUnit) {
      errors.push(makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('data', 'histogram', 'unit'),
        validatorId,
        message: `the supplied normalized histogram requires unit ${String(expectedUnit)}.`,
      }));
    }
  }
  return errors;
};
