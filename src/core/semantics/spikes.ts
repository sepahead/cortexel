/**
 * ISI, PSTH, and correlogram semantics.
 *
 * Three analyses, three ways to be confidently wrong:
 *
 *   ISI — an interval must be formed between two successive events OF THE SAME
 *   TRAIN. Sort a mixed multi-neuron event list by time and take differences, and
 *   you get a distribution of the intervals between *whichever neurons happened to
 *   fire next* — a quantity that has no name because it means nothing. It looks
 *   like an ISI distribution. It is shaped like one. It is not one.
 *
 *   PSTH — the denominator is the number of trials that were RUN, not the number
 *   that produced a spike. Inferring it from the data drops the empty trials and
 *   inflates the response.
 *
 *   Correlogram — the lag sign convention, and whether an event is paired with
 *   itself, decide what the picture says. A zero-lag peak that is really just every
 *   spike counting itself is an artifact that looks exactly like synchrony.
 */

import { makeError, pointer, type CortexelError } from '../errors.js';
import { materializeCenteredLagBins } from '../binning.js';
import { binary64RelativeDifferenceWithinEpsilons } from '../exact-binary64.js';
import {
  compareExactUnitSumToValue,
  convert,
  dimensionOf,
  isKnownUnit,
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

/**
 * Intervals are formed only within a train.
 *
 * Cortexel's ISI derivation groups by sender (and by trial when trials are present)
 * BEFORE differencing, so a cross-neuron interval is structurally impossible. What
 * this validator checks is the arithmetic invariant that follows: after stable
 * sorting within a train, a successive difference cannot be negative. If one is, the
 * input contains something that is not a time.
 */
export const isiWithinTrainOnly: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);

  const times = asArray(asRecord(data.eventTimes)?.values);
  const senders = asArray(data.eventSenderIds);
  if (!times || !senders) return [];

  // Group by sender, preserving original order, then check monotonicity per group
  // after sorting. This mirrors exactly what the derivation will do.
  const byTrain = new Map<string, number[]>();
  const trials = asArray(data.eventTrialIds);

  for (let i = 0; i < Math.min(times.length, senders.length); i++) {
    const time = asNumber(times[i]);
    const sender = senders[i];
    if (time === undefined || typeof sender !== 'string') continue;

    const trial = trials && typeof trials[i] === 'string' ? (trials[i] as string) : '';
    const key = `${sender}\u0000${trial}`;

    const train = byTrain.get(key);
    if (train) train.push(time);
    else byTrain.set(key, [time]);
  }

  const errors: CortexelError[] = [];

  for (const [key, train] of byTrain) {
    const sorted = [...train].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const interval = sorted[i] - sorted[i - 1];
      if (interval < 0) {
        const [sender] = key.split('\u0000');
        errors.push(
          makeError({
            code: 'SCIENCE_NEGATIVE_INTERVAL',
            stage: 'science',
            instancePath: pointer('data', 'eventTimes', 'values'),
            validatorId: 'isi.within_train_only',
            message: `sender "${sender}" produced a negative interval after sorting, which is arithmetically impossible for real times. The event times contain something that is not a time.`,
          }),
        );
        break;
      }
    }
    if (errors.length > 0) break;
  }

  return errors;
};

/**
 * A zero-length interval needs an explicit policy.
 *
 * Two events from the same neuron at the same time is either a real coincidence the
 * source permits, or a duplicated record. Those imply different distributions, and
 * Cortexel will not pick one silently — a zero-ISI bin is a claim about the
 * refractory period.
 */
export const isiZeroIntervalPolicy: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const parameters = getParameters(context);

  const policy = asString(parameters.zeroIntervalPolicy);

  const times = asArray(asRecord(data.eventTimes)?.values);
  const senders = asArray(data.eventSenderIds);
  if (!times || !senders) return [];

  const seen = new Set<string>();
  let hasZero = false;

  for (let i = 0; i < Math.min(times.length, senders.length); i++) {
    const time = asNumber(times[i]);
    const sender = senders[i];
    if (time === undefined || typeof sender !== 'string') continue;

    const key = `${sender}\u0000${time}`;
    if (seen.has(key)) {
      hasZero = true;
      break;
    }
    seen.add(key);
  }

  if (!hasZero || policy !== undefined) return [];

  return [
    makeError({
      code: 'SCIENCE_ZERO_INTERVAL_POLICY',
      stage: 'science',
      instancePath: pointer('parameters', 'zeroIntervalPolicy'),
      validatorId: 'isi.zero_interval_policy',
      message:
        'the same sender has two events at the same time, which would produce a zero-length interval. Declare a policy: either the source permits coincident same-sender events (keep them) or it does not (this is a duplicated record). Cortexel will not choose — a zero-ISI bin is a claim about the refractory period.',
    }),
  ];
};

export const psthAlignmentDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const parameters = getParameters(context);
  const errors: CortexelError[] = [];

  const alignment = data.alignmentTimes ?? parameters.alignmentTimes;
  if (alignment === undefined) {
    errors.push(
      makeError({
        code: 'SCIENCE_TRIAL_UNIVERSE_REQUIRED',
        stage: 'science',
        instancePath: pointer('data', 'alignmentTimes'),
        validatorId: 'psth.alignment_declared',
        message:
          'a PSTH needs an alignment reference per trial. Without it there is nothing for time zero to mean.',
      }),
    );
  }

  const trialCount = asNumber(data.trialCount) ?? asArray(data.trialIds)?.length;
  if (trialCount !== undefined && trialCount < 1) {
    errors.push(
      makeError({
        code: 'SCIENCE_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: pointer('data', 'trialCount'),
        validatorId: 'psth.alignment_declared',
        message: 'the trial count must be at least 1 to normalize per trial.',
      }),
    );
  }

  const alignmentUnit = asString(data.alignmentUnit);
  if (
    alignmentUnit !== undefined &&
    isKnownUnit(alignmentUnit) &&
    dimensionOf(alignmentUnit) !== 'time'
  ) {
    errors.push(
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('data', 'alignmentUnit'),
        validatorId: 'psth.alignment_declared',
        message: `PSTH alignment times require a registered time unit; got ${alignmentUnit}.`,
      }),
    );
  }

  const binUnit = asString(asRecord(parameters.bins)?.unit);
  if (binUnit !== undefined && isKnownUnit(binUnit) && dimensionOf(binUnit) !== 'time') {
    errors.push(
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('parameters', 'bins', 'unit'),
        validatorId: 'psth.alignment_declared',
        message: `PSTH bin coordinates require a registered time unit; got ${binUnit}.`,
      }),
    );
  }

  return errors;
};

export const correlogramLagRangeValid: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const parameters = getParameters(context);
  const errors: CortexelError[] = [];

  const lagRange = asRecord(parameters.lagRange);
  if (!lagRange) return [];

  const min = asNumber(lagRange.min);
  const max = asNumber(lagRange.max);
  const bins = asRecord(parameters.bins);
  const width = asNumber(bins?.width);
  const lagUnit = asString(lagRange.unit);
  const widthUnit = asString(bins?.unit);

  for (const [path, unit] of [
    [['parameters', 'lagRange', 'unit'] as const, lagUnit],
    [['parameters', 'bins', 'unit'] as const, widthUnit],
  ] as const) {
    if (unit === undefined || !isKnownUnit(unit) || dimensionOf(unit) === 'time') continue;
    errors.push(
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer(...path),
        validatorId: 'correlogram.lag_range_valid',
        message: `correlogram lag coordinates require a registered time unit; got ${unit}.`,
      }),
    );
  }

  if (min !== undefined && max !== undefined && !(max > min)) {
    errors.push(
      makeError({
        code: 'SCIENCE_LAG_RANGE_INVALID',
        stage: 'science',
        instancePath: pointer('parameters', 'lagRange', 'max'),
        validatorId: 'correlogram.lag_range_valid',
        message: `the lag range is empty or inverted (min ${min}, max ${max}).`,
      }),
    );
  }

  if (width !== undefined && !(width > 0)) {
    errors.push(
      makeError({
        code: 'SCIENCE_LAG_RANGE_INVALID',
        stage: 'science',
        instancePath: pointer('parameters', 'bins', 'width'),
        validatorId: 'correlogram.lag_range_valid',
        message: 'the correlogram bin width must be positive.',
      }),
    );
  }

  if (
    min !== undefined && max !== undefined && width !== undefined && max > min && width > 0 &&
    lagUnit !== undefined && widthUnit !== undefined &&
    dimensionOf(lagUnit) === 'time' && dimensionOf(widthUnit) === 'time'
  ) {
    try {
      const widthInLagUnit = widthUnit === lagUnit ? width : convert(width, widthUnit, lagUnit);
      const materialized = materializeCenteredLagBins(min, max, widthInLagUnit, 20_001);
      if (materialized.ok) return errors;
      errors.push(
        makeError({
          code: 'SCIENCE_LAG_RANGE_INVALID',
          stage: 'science',
          instancePath: pointer('parameters', 'bins', 'width'),
          validatorId: 'correlogram.lag_range_valid',
          message:
            'the correlogram lag centres must be symmetric about zero and tauMax/binWidth must be a positive integer producing at most 20001 centred bins with representable half-width outer edges.',
        }),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unit conversion failed';
      errors.push(
        makeError({
          code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
          stage: 'science',
          instancePath: pointer('parameters', 'bins', 'unit'),
          validatorId: 'correlogram.lag_range_valid',
          message: `the correlogram bin width cannot be compared with the lag range: ${detail}.`,
        }),
      );
    }
  }

  return errors;
};

interface CorrelogramTrain {
  readonly path: readonly ['data', 'train' | 'referenceTrain' | 'targetTrain'];
  readonly value: Record<string, unknown>;
}

function rawCorrelogramTrains(data: Record<string, unknown>): readonly CorrelogramTrain[] {
  if (data.mode === 'events_auto') {
    const train = asRecord(data.train);
    return train ? [{ path: ['data', 'train'], value: train }] : [];
  }
  if (data.mode === 'events_cross') {
    const reference = asRecord(data.referenceTrain);
    const target = asRecord(data.targetTrain);
    return [
      ...(reference ? [{ path: ['data', 'referenceTrain'] as const, value: reference }] : []),
      ...(target ? [{ path: ['data', 'targetTrain'] as const, value: target }] : []),
    ];
  }
  return [];
}

function trainUniverse(data: Record<string, unknown>, name: string): unknown[] | undefined {
  return asArray(asRecord(data[name])?.recordedSenderIds);
}

/**
 * Validate each explicitly role-bound raw train without inferring scientific roles.
 *
 * A silent train has two empty event arrays and a non-empty recorded universe. It is
 * still a train. This validator therefore never derives auto/cross from active
 * senders, event counts, or array contents: the product discriminator already made
 * that decision, and these checks only establish the product's internal facts.
 */
export const correlogramEventTrainsValid: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const trains = rawCorrelogramTrains(data);
  if (trains.length === 0) return [];

  const window = asRecord(data.window);
  const start = asNumber(window?.start);
  const stop = asNumber(window?.stop);
  const windowUnit = asString(window?.unit);
  const boundary = asString(window?.boundary);
  const errors: CortexelError[] = [];

  for (const train of trains) {
    const at = train.path;
    const eventTimes = asRecord(train.value.eventTimes);
    const times = asArray(eventTimes?.values);
    const timeUnit = legalKnownUnit(eventTimes);
    const senders = asArray(train.value.eventSenderIds);
    const eventIds = asArray(train.value.eventIds);
    const recorded = asArray(train.value.recordedSenderIds);

    if (recorded !== undefined && recorded.length === 0) {
      errors.push(
        makeError({
          code: 'SCIENCE_POPULATION_UNIVERSE_REQUIRED',
          stage: 'science',
          instancePath: pointer(...at, 'recordedSenderIds'),
          validatorId: 'correlogram.event_trains_valid',
          message:
            'a correlogram train must declare at least one recorded sender, including senders that were silent. The event list cannot establish the recorded universe.',
        }),
      );
    }

    if (times && senders && times.length !== senders.length) {
      errors.push(
        makeError({
          code: 'SEMANTIC_LENGTH_MISMATCH',
          stage: 'semantic',
          instancePath: pointer(...at, 'eventSenderIds'),
          validatorId: 'correlogram.event_trains_valid',
          message: `this train has ${times.length} event times but ${senders.length} event sender ids. Every event has exactly one declared sender; Cortexel never truncates or broadcasts either array.`,
        }),
      );
    }
    if (times && eventIds && times.length !== eventIds.length) {
      errors.push(
        makeError({
          code: 'SEMANTIC_LENGTH_MISMATCH',
          stage: 'semantic',
          instancePath: pointer(...at, 'eventIds'),
          validatorId: 'correlogram.event_trains_valid',
          message: `this train has ${times.length} event times but ${eventIds.length} event ids. Optional event identity, when supplied, is parallel to every event rather than a partial annotation.`,
        }),
      );
    }

    if (recorded) {
      const universe = new Set<string>();
      for (let index = 0; index < recorded.length; index++) {
        const id = recorded[index];
        if (typeof id !== 'string') continue;
        if (universe.has(id)) {
          errors.push(
            makeError({
              code: 'SEMANTIC_DUPLICATE_ID',
              stage: 'semantic',
              instancePath: pointer(...at, 'recordedSenderIds', index),
              validatorId: 'correlogram.event_trains_valid',
              message: `sender id "${id}" appears more than once in this train's complete universe. A sender cannot occupy two denominator positions.`,
            }),
          );
          break;
        }
        universe.add(id);
      }

      if (senders) {
        for (let index = 0; index < senders.length; index++) {
          const id = senders[index];
          if (typeof id !== 'string' || universe.has(id)) continue;
          errors.push(
            makeError({
              code: 'SEMANTIC_UNKNOWN_REFERENCE',
              stage: 'semantic',
              instancePath: pointer(...at, 'eventSenderIds', index),
              validatorId: 'correlogram.event_trains_valid',
              message: `event sender "${id}" is not in this train's complete recorded-sender universe. A third sender belongs to a correlogram only through an explicit train universe; Cortexel never assigns it to a role from event order.`,
            }),
          );
          break;
        }
      }
    }

    if (eventIds) {
      const seen = new Map<string, number>();
      for (let index = 0; index < eventIds.length; index++) {
        const id = eventIds[index];
        if (typeof id !== 'string') continue;
        const first = seen.get(id);
        if (first !== undefined) {
          errors.push(
            makeError({
              code: 'SEMANTIC_DUPLICATE_ID',
              stage: 'semantic',
              instancePath: pointer(...at, 'eventIds', index),
              validatorId: 'correlogram.event_trains_valid',
              message: `event id "${id}" already identifies event ${first} in this train. Event ids are scoped to one train but must be unique within it, or self-pair identity is ambiguous.`,
            }),
          );
          break;
        }
        seen.set(id, index);
      }
    }

    if (
      !times ||
      start === undefined ||
      stop === undefined ||
      windowUnit === undefined ||
      timeUnit === undefined ||
      !isKnownUnit(windowUnit) ||
      dimensionOf(windowUnit) !== 'time' ||
      !(stop > start)
    ) continue;

    const openStart = boundary === '(start,stop]';
    const closedStop = boundary === '[start,stop]' || boundary === '(start,stop]';
    for (let index = 0; index < times.length; index++) {
      const time = asNumber(times[index]);
      if (time === undefined) continue;
      try {
        const lowerVsEvent = compareExactUnitSumToValue(
          [{ value: start, unit: windowUnit }],
          { value: time, unit: timeUnit },
        );
        const upperVsEvent = compareExactUnitSumToValue(
          [{ value: stop, unit: windowUnit }],
          { value: time, unit: timeUnit },
        );
        const beforeStart = openStart ? lowerVsEvent >= 0 : lowerVsEvent > 0;
        const beyondStop = closedStop ? upperVsEvent < 0 : upperVsEvent <= 0;
        if (!beforeStart && !beyondStop) continue;
        errors.push(
          makeError({
            code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
            stage: 'science',
            instancePath: pointer(...at, 'eventTimes', 'values', index),
            validatorId: 'correlogram.event_trains_valid',
            message: `this event lies outside the shared ${boundary ?? '[start,stop)'} window ${start} to ${stop} ${windowUnit}. Raw correlogram numerators and denominators must describe the same observation window; events are never silently dropped.`,
          }),
        );
        break;
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'unit comparison failed';
        errors.push(
          makeError({
            code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
            stage: 'science',
            instancePath: pointer(...at, 'eventTimes', 'unit'),
            validatorId: 'correlogram.event_trains_valid',
            message: `this train's event times cannot be compared with the shared observation window: ${detail}.`,
          }),
        );
        break;
      }
    }
  }

  return errors;
};

/** Cross roles must remain explicit even when either train has no observed events. */
export const correlogramRolesDisjoint: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const mode = asString(data.mode);
  const universes: readonly { readonly name: 'train' | 'referenceTrain' | 'targetTrain'; readonly value: unknown[] }[] =
    mode === 'prebinned_auto'
      ? (trainUniverse(data, 'train') ? [{ name: 'train', value: trainUniverse(data, 'train')! }] : [])
      : mode === 'prebinned_cross'
        ? [
            ...(trainUniverse(data, 'referenceTrain')
              ? [{ name: 'referenceTrain' as const, value: trainUniverse(data, 'referenceTrain')! }]
              : []),
            ...(trainUniverse(data, 'targetTrain')
              ? [{ name: 'targetTrain' as const, value: trainUniverse(data, 'targetTrain')! }]
              : []),
          ]
        : [];
  for (const universe of universes) {
    const seen = new Set<string>();
    for (let index = 0; index < universe.value.length; index++) {
      const id = universe.value[index];
      if (typeof id !== 'string') continue;
      if (!seen.has(id)) {
        seen.add(id);
        continue;
      }
      return [
        makeError({
          code: 'SEMANTIC_DUPLICATE_ID',
          stage: 'semantic',
          instancePath: pointer('data', universe.name, 'recordedSenderIds', index),
          validatorId: 'correlogram.roles_disjoint',
          message: `sender "${id}" appears twice in this pre-binned role's complete universe. A sender universe is a set, not a multiplicity-weighted denominator.`,
        }),
      ];
    }
  }
  if (data.mode !== 'events_cross' && data.mode !== 'prebinned_cross') return [];

  const reference = asRecord(data.referenceTrain);
  const target = asRecord(data.targetTrain);
  if (!reference || !target) return [];

  const referenceId = asString(reference.trainId);
  const targetId = asString(target.trainId);
  if (referenceId !== undefined && targetId === referenceId) {
    return [
      makeError({
        code: 'SEMANTIC_DUPLICATE_ID',
        stage: 'semantic',
        instancePath: pointer('data', 'targetTrain', 'trainId'),
        validatorId: 'correlogram.roles_disjoint',
        message: `cross roles both use train id "${referenceId}". Reference and target must be independently named containers; using one identity for both is an autocorrelogram, not a cross-correlogram.`,
      }),
    ];
  }

  const referenceUniverse = trainUniverse(data, 'referenceTrain');
  const targetUniverse = trainUniverse(data, 'targetTrain');
  if (!referenceUniverse || !targetUniverse) return [];
  const referenceSet = new Set(
    referenceUniverse.filter((id): id is string => typeof id === 'string'),
  );
  for (let index = 0; index < targetUniverse.length; index++) {
    const id = targetUniverse[index];
    if (typeof id !== 'string' || !referenceSet.has(id)) continue;
    return [
      makeError({
        code: 'SEMANTIC_DUPLICATE_ID',
        stage: 'semantic',
        instancePath: pointer('data', 'targetTrain', 'recordedSenderIds', index),
        validatorId: 'correlogram.roles_disjoint',
        message: `sender "${id}" is declared in both cross-role universes. Its own event pairs would add an autocorrelation to a figure labelled cross-correlation, so the roles must be disjoint.`,
      }),
    ];
  }
  return [];
};

/** Bind a pre-binned payload to the exact centred lag axis it claims to use. */
export const correlogramPrebinnedAxisConsistent: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  if (data.mode !== 'prebinned_auto' && data.mode !== 'prebinned_cross') return [];
  const parameters = getParameters(context);
  const binEdges = asRecord(data.binEdges);
  const edges = asArray(binEdges?.edges);
  const counts = asArray(data.pairCounts);
  const eligible = asArray(data.eligibleReferenceEventCounts);
  const errors: CortexelError[] = [];

  if (edges && counts && edges.length !== counts.length + 1) {
    errors.push(
      makeError({
        code: 'SEMANTIC_LENGTH_MISMATCH',
        stage: 'semantic',
        instancePath: pointer('data', 'pairCounts'),
        validatorId: 'correlogram.prebinned_axis_consistent',
        message: `${edges.length} lag edges define ${Math.max(0, edges.length - 1)} bins, but pairCounts has ${counts.length} entries. Every exact numerator belongs to exactly one declared bin.`,
      }),
    );
  }
  if (counts && eligible && counts.length !== eligible.length) {
    errors.push(
      makeError({
        code: 'SEMANTIC_LENGTH_MISMATCH',
        stage: 'semantic',
        instancePath: pointer('data', 'eligibleReferenceEventCounts'),
        validatorId: 'correlogram.prebinned_axis_consistent',
        message: `${counts.length} pair-count bins require ${counts.length} parallel eligible-reference denominators; got ${eligible.length}.`,
      }),
    );
  }

  for (const [name, values] of [
    ['pairCounts', counts] as const,
    ['eligibleReferenceEventCounts', eligible] as const,
  ]) {
    if (!values) continue;
    for (let index = 0; index < values.length; index++) {
      const value = asNumber(values[index]);
      if (value === undefined || (Number.isSafeInteger(value) && value >= 0)) continue;
      errors.push(
        makeError({
          code: 'SCIENCE_COUNT_NOT_INTEGER',
          stage: 'science',
          instancePath: pointer('data', name, index),
          validatorId: 'correlogram.prebinned_axis_consistent',
          message: `pre-binned count ${String(values[index])} is not an exact non-negative safe integer. A rounded or unsafe numerator/denominator cannot be audited exactly.`,
        }),
      );
      break;
    }
  }

  if (!edges || edges.length < 2) return errors;
  const numericEdges = edges.map(asNumber);
  if (!numericEdges.every((value): value is number => value !== undefined)) return errors;
  for (let index = 1; index < numericEdges.length; index++) {
    if (numericEdges[index] > numericEdges[index - 1]) continue;
    errors.push(
      makeError({
        code: 'SCIENCE_BIN_EDGES_INVALID',
        stage: 'science',
        instancePath: pointer('data', 'binEdges', 'edges', index),
        validatorId: 'correlogram.prebinned_axis_consistent',
        message: 'pre-binned lag edges must be finite and strictly increasing.',
      }),
    );
    return errors;
  }

  const lag = asRecord(parameters.lagRange);
  const bins = asRecord(parameters.bins);
  const min = asNumber(lag?.min);
  const max = asNumber(lag?.max);
  const width = asNumber(bins?.width);
  const lagUnit = asString(lag?.unit);
  const widthUnit = asString(bins?.unit);
  const edgeUnit = asString(binEdges?.unit);
  if (
    min === undefined || max === undefined || width === undefined ||
    lagUnit === undefined || widthUnit === undefined || edgeUnit === undefined
  ) return errors;
  // Canonical-code and the lag-range validator own malformed/non-time parameter
  // units. This relation owns the bare pre-binned edge unit, but only after the
  // code itself is registered; otherwise an alias/unknown would receive both its
  // canonical-code repair and a derivative dimension diagnostic.
  if (
    !isKnownUnit(lagUnit) || dimensionOf(lagUnit) !== 'time' ||
    !isKnownUnit(widthUnit) || dimensionOf(widthUnit) !== 'time' ||
    !isKnownUnit(edgeUnit)
  ) return errors;
  if (dimensionOf(edgeUnit) !== 'time') {
    errors.push(
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('data', 'binEdges', 'unit'),
        validatorId: 'correlogram.prebinned_axis_consistent',
        message: `pre-binned correlogram edges require a registered time unit; got ${edgeUnit}.`,
      }),
    );
    return errors;
  }

  try {
    const widthInLagUnit = widthUnit === lagUnit ? width : convert(width, widthUnit, lagUnit);
    const expected = materializeCenteredLagBins(min, max, widthInLagUnit, 20_001);
    if (!expected.ok || expected.edges.length !== numericEdges.length) {
      errors.push(
        makeError({
          code: 'SCIENCE_LAG_RANGE_INVALID',
          stage: 'science',
          instancePath: pointer('data', 'binEdges'),
          validatorId: 'correlogram.prebinned_axis_consistent',
          message: 'the supplied pre-binned edge count does not match the centred lag axis declared by lagRange and bins.',
        }),
      );
      return errors;
    }
    for (let index = 0; index < numericEdges.length; index++) {
      const actual = edgeUnit === lagUnit
        ? numericEdges[index]
        : convert(numericEdges[index], edgeUnit, lagUnit);
      if (
        actual === expected.edges[index] ||
        binary64RelativeDifferenceWithinEpsilons(actual, expected.edges[index], 16)
      ) continue;
      errors.push(
        makeError({
          code: 'SCIENCE_LAG_RANGE_INVALID',
          stage: 'science',
          instancePath: pointer('data', 'binEdges', 'edges', index),
          validatorId: 'correlogram.prebinned_axis_consistent',
          message: `pre-binned edge ${index} converts to ${actual} ${lagUnit}, but the declared centred lag axis requires ${expected.edges[index]} ${lagUnit}. Cortexel will not relabel an existing histogram with a different axis.`,
        }),
      );
      break;
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unit conversion failed';
    errors.push(
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('data', 'binEdges', 'unit'),
        validatorId: 'correlogram.prebinned_axis_consistent',
        message: `the pre-binned lag axis cannot be compared with lagRange and bins: ${detail}.`,
      }),
    );
  }
  return errors;
};

/** Bind the closed revision-2 statistic product to exact denominator/accounting laws. */
export const correlogramStatisticDenominator: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const parameters = getParameters(context);
  const data = getData(context);

  const statistic = asString(parameters.statistic);
  const edgeCorrection = asString(parameters.edgeCorrection);
  const mode = asString(data.mode);
  const raw = mode === 'events_auto' || mode === 'events_cross';
  const prebinned = mode === 'prebinned_auto' || mode === 'prebinned_cross';

  if (statistic !== 'raw_pair_count' && statistic !== 'target_rate_per_reference_event') {
    return [
      makeError({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: pointer('parameters', 'statistic'),
        validatorId: 'correlogram.statistic_denominator',
        message:
          'revision 2 renders only raw_pair_count and target_rate_per_reference_event. An unknown statistic is refused even if a structural gate was skipped.',
      }),
    ];
  }

  if (
    (statistic === 'raw_pair_count' && edgeCorrection !== 'none') ||
    (statistic === 'target_rate_per_reference_event' &&
      edgeCorrection !== 'none' && edgeCorrection !== 'eligible_reference_events')
  ) {
    return [
      makeError({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: pointer('parameters', 'edgeCorrection'),
        validatorId: 'correlogram.statistic_denominator',
        message:
          statistic === 'raw_pair_count'
            ? 'raw_pair_count has no denominator and requires edgeCorrection `none`.'
            : 'target_rate_per_reference_event requires `none` or exact `eligible_reference_events` correction.',
      }),
    ];
  }

  if (raw) {
    if (
      data.referenceEventCount !== undefined ||
      data.targetEventCount !== undefined ||
      data.eligibleReferenceEventCounts !== undefined
    ) {
      return [
        makeError({
          code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
          stage: 'science',
          instancePath: data.referenceEventCount !== undefined
            ? pointer('data', 'referenceEventCount')
            : data.targetEventCount !== undefined
              ? pointer('data', 'targetEventCount')
              : pointer('data', 'eligibleReferenceEventCounts'),
          validatorId: 'correlogram.statistic_denominator',
          message:
            'raw role counts and eligible-reference counts are derived from the explicit event arrays. A caller-supplied duplicate count would create a second authority.',
        }),
      ];
    }
    return [];
  }

  if (!prebinned) return [];

  const pairCounts = asArray(data.pairCounts);
  const referenceCount = asNumber(data.referenceEventCount);
  const targetCount = mode === 'prebinned_auto'
    ? referenceCount
    : asNumber(data.targetEventCount);
  for (const [name, count] of [
    ['referenceEventCount', referenceCount] as const,
    ['targetEventCount', targetCount] as const,
  ]) {
    if (count !== undefined && Number.isSafeInteger(count) && count >= 0) continue;
    return [
      makeError({
        code: 'SCIENCE_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: pointer('data', name),
        validatorId: 'correlogram.statistic_denominator',
        message: `pre-binned pair accounting requires ${name} as an exact non-negative safe integer, including zero for a completely observed silent role.`,
      }),
    ];
  }

  if (pairCounts && referenceCount !== undefined && targetCount !== undefined) {
    const exactCounts = pairCounts.map(asNumber);
    if (exactCounts.every(
      (value): value is number =>
        value !== undefined && Number.isSafeInteger(value) && value >= 0,
    )) {
      const counted = exactCounts.reduce((sum, value) => sum + BigInt(value), 0n);
      const candidate = BigInt(referenceCount) * BigInt(targetCount);
      const selfPairs = mode === 'prebinned_auto' ? BigInt(referenceCount) : 0n;
      if (candidate > BigInt(Number.MAX_SAFE_INTEGER)) {
        return [
          makeError({
            code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
            stage: 'science',
            instancePath: pointer(
              'data',
              mode === 'prebinned_auto' ? 'referenceEventCount' : 'targetEventCount',
            ),
            validatorId: 'correlogram.statistic_denominator',
            message:
              'the exact candidate role product exceeds the safe-integer JSON domain, so Cortexel cannot emit an exact pair-accounting receipt.',
          }),
        ];
      }
      const available = candidate - selfPairs;
      if (counted > available) {
        return [
          makeError({
            code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
            stage: 'science',
            instancePath: pointer('data', 'pairCounts'),
            validatorId: 'correlogram.statistic_denominator',
            message: `exact pair conservation failed: ${candidate.toString()} candidate ordered pairs minus ${selfPairs.toString()} excluded same-event self-pairs cannot contain ${counted.toString()} counted in-range pairs. The implied out-of-range count would be negative.`,
          }),
        ];
      }
    }
  }

  const eligible = asArray(data.eligibleReferenceEventCounts);
  if (statistic === 'raw_pair_count' || edgeCorrection === 'none') {
    if (eligible === undefined) return [];
    return [
      makeError({
        code: 'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: pointer('data', 'eligibleReferenceEventCounts'),
        validatorId: 'correlogram.statistic_denominator',
        message:
          statistic === 'raw_pair_count'
            ? 'raw_pair_count has no per-bin denominator, so eligibleReferenceEventCounts is a meaningless second authority.'
            : 'edgeCorrection `none` uses referenceEventCount for every lag; a parallel eligible-reference array would create two denominator authorities.',
      }),
    ];
  }

  if (!eligible || !pairCounts || eligible.length !== pairCounts.length) {
    return [
      makeError({
        code: 'SEMANTIC_LENGTH_MISMATCH',
        stage: 'semantic',
        instancePath: pointer('data', 'eligibleReferenceEventCounts'),
        validatorId: 'correlogram.statistic_denominator',
        message:
          'eligible_reference_events requires one exact eligible-reference denominator per pair-count bin.',
      }),
    ];
  }

  for (let index = 0; index < eligible.length; index++) {
    const eligibleCount = asNumber(eligible[index]);
    const pairCount = asNumber(pairCounts[index]);
    if (
      eligibleCount === undefined ||
      !Number.isSafeInteger(eligibleCount) ||
      eligibleCount < 0
    ) continue;
    if (referenceCount !== undefined && eligibleCount > referenceCount) {
      return [
        makeError({
          code: 'SCIENCE_DENOMINATOR_INVALID',
          stage: 'science',
          instancePath: pointer('data', 'eligibleReferenceEventCounts', index),
          validatorId: 'correlogram.statistic_denominator',
          message: `eligible-reference count ${eligibleCount} exceeds the exact reference-event count ${referenceCount}.`,
        }),
      ];
    }
    if (eligibleCount === 0 && pairCount !== 0) {
      return [
        makeError({
          code: 'SCIENCE_DENOMINATOR_INVALID',
          stage: 'science',
          instancePath: pointer('data', 'pairCounts', index),
          validatorId: 'correlogram.statistic_denominator',
          message:
            'a zero eligible-reference denominator can produce no eligible ordered pair. The bin is valid only with pairCount 0 and compiles to null with status undefined_zero_eligible_reference_events.',
        }),
      ];
    }
  }

  return [];
};
