/**
 * Event, bin, window, and rate semantics.
 *
 * Spike analyses are deceptively easy to draw and easy to get subtly wrong. Every
 * rule here exists because the wrong version of it produces a figure that looks
 * completely reasonable and says something false.
 */

import { makeError, pointer, type CortexelError } from '../errors.js';
import {
  binary64RelativeDifferenceWithinTolerance,
  exactBinary64Sum,
  exactRationalToBinary64,
  finiteBinary64ToMinSubnormalUnits,
} from '../exact-binary64.js';
import {
  compareExactUnitSumToValue,
  convert,
  convertDifference,
  divideExactIntegerByConvertedDifference,
  reciprocalUnit,
} from '../units.js';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  getData,
  getParameters,
  NUMERIC_TOLERANCE,
  readPointer,
  type SemanticContext,
  type SemanticValidator,
} from './types.js';
import { checkReferencesInUniverse } from './structure.js';
import { MAX_MATERIALIZED_BINS, materializeWidthBins } from '../binning.js';

/** Resolve bin edges from either an explicit edge list or a width that tiles a range. */
export function resolveBinEdges(spec: Record<string, unknown> | undefined): number[] | undefined {
  if (!spec) return undefined;

  const mode = asString(spec.mode);

  if (mode === 'edges') {
    const edges = asArray(spec.edges);
    if (!edges) return undefined;
    const numeric = edges.map(asNumber);
    return numeric.every((value): value is number => value !== undefined)
      ? (numeric as number[])
      : undefined;
  }

  if (mode === 'width') {
    const width = asNumber(spec.width);
    const start = asNumber(spec.start);
    const stop = asNumber(spec.stop);
    if (width === undefined || start === undefined || stop === undefined) return undefined;
    if (!(width > 0) || !(stop > start)) return undefined;

    const result = materializeWidthBins(start, stop, width);
    return result.ok ? [...result.edges] : undefined;
  }

  return undefined;
}

/**
 * A population-rate figure has one declared observation window and one binned
 * domain. Their physical outer endpoints must be the same quantities, even when
 * written in different registered time units.
 *
 * This comparison stays exact. Converting an edge to binary64 first can make two
 * physically distinct declarations round to the same number (for example
 * `0.3 ms` and `0.0003 s`), after which validation could no longer recover the
 * contradiction.
 */
function populationRateBinsBindWindow(context: SemanticContext): CortexelError[] {
  if (context.skillId !== 'neuro.population_rate') return [];

  const data = getData(context);
  const parameters = getParameters(context);
  const window = asRecord(data.window);
  const windowStart = asNumber(window?.start);
  const windowStop = asNumber(window?.stop);
  const windowUnit = asString(window?.unit);
  if (windowStart === undefined || windowStop === undefined || !windowUnit) return [];

  let firstEdge: number | undefined;
  let lastEdge: number | undefined;
  let binUnit: string | undefined;
  let firstPath: (string | number)[];
  let lastPath: (string | number)[];

  if (asString(data.mode) === 'events') {
    const bins = asRecord(parameters.bins);
    binUnit = asString(bins?.unit);
    if (asString(bins?.mode) === 'width') {
      firstEdge = asNumber(bins?.start);
      lastEdge = asNumber(bins?.stop);
      firstPath = ['parameters', 'bins', 'start'];
      lastPath = ['parameters', 'bins', 'stop'];
    } else {
      const edgeValues = asArray(bins?.edges);
      firstEdge = asNumber(edgeValues?.[0]);
      lastEdge = asNumber(edgeValues?.[Math.max(0, (edgeValues?.length ?? 1) - 1)]);
      firstPath = ['parameters', 'bins', 'edges', 0];
      lastPath = ['parameters', 'bins', 'edges', Math.max(0, (edgeValues?.length ?? 1) - 1)];
    }
  } else if (asString(data.mode) === 'prebinned') {
    const binEdges = asRecord(data.binEdges);
    const edgeValues = asArray(binEdges?.edges);
    firstEdge = asNumber(edgeValues?.[0]);
    lastEdge = asNumber(edgeValues?.[Math.max(0, (edgeValues?.length ?? 1) - 1)]);
    binUnit = asString(binEdges?.unit);
    firstPath = ['data', 'binEdges', 'edges', 0];
    lastPath = ['data', 'binEdges', 'edges', Math.max(0, (edgeValues?.length ?? 1) - 1)];
  } else {
    return [];
  }

  if (firstEdge === undefined || lastEdge === undefined || !binUnit) return [];

  const errors: CortexelError[] = [];
  const checks = [
    {
      edge: firstEdge,
      windowValue: windowStart,
      windowName: 'start',
      at: firstPath,
    },
    {
      edge: lastEdge,
      windowValue: windowStop,
      windowName: 'stop',
      at: lastPath,
    },
  ] as const;

  for (const check of checks) {
    let comparison: -1 | 0 | 1;
    try {
      comparison = compareExactUnitSumToValue(
        [{ value: check.edge, unit: binUnit }],
        { value: check.windowValue, unit: windowUnit },
      );
    } catch {
      // Canonical-code and dimension validators own invalid/incompatible units.
      // This rule owns only the equality of otherwise comparable endpoints.
      continue;
    }
    if (comparison === 0) continue;

    errors.push(
      makeError({
        code: 'SCIENCE_BIN_EDGES_INVALID',
        stage: 'science',
        instancePath: pointer(...check.at),
        validatorId: 'bins.strictly_increasing',
        message: `population-rate bins must tile exactly the declared observation window: the ${check.windowName} bin edge ${check.edge} ${binUnit} is not exactly equal to window ${check.windowName} ${check.windowValue} ${windowUnit}. Rounded unit conversion is not sufficient because it can conceal a real boundary mismatch.`,
      }),
    );
  }

  return errors;
}

export const binsStrictlyIncreasing: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const errors: CortexelError[] = [];

  const check = (edges: unknown, at: (string | number)[]): void => {
    const array = asArray(edges);
    if (!array) return;

    for (let i = 0; i < array.length; i++) {
      const value = asNumber(array[i]);
      if (value === undefined) {
        errors.push(
          makeError({
            code: 'SCIENCE_BIN_EDGES_INVALID',
            stage: 'science',
            instancePath: pointer(...at, i),
            validatorId: 'bins.strictly_increasing',
            message: 'a bin edge must be a finite number.',
          }),
        );
        return;
      }
      if (i > 0) {
        const previous = asNumber(array[i - 1]);
        if (previous !== undefined && !(value > previous)) {
          errors.push(
            makeError({
              code: 'SCIENCE_BIN_EDGES_INVALID',
              stage: 'science',
              instancePath: pointer(...at, i),
              validatorId: 'bins.strictly_increasing',
              message: `bin edges must be strictly increasing: edge ${i} (${value}) is not greater than edge ${i - 1} (${previous}). A zero-width or inverted bin has no meaning.`,
            }),
          );
          return;
        }
      }
    }
  };

  const data = getData(context);
  const parameters = getParameters(context);

  check(asRecord(data.binEdges)?.edges, ['data', 'binEdges', 'edges']);
  check(asRecord(parameters.bins)?.edges, ['parameters', 'bins', 'edges']);

  // A width-mode spec must also tile a real interval.
  for (const [container, at] of [
    [asRecord(parameters.bins), ['parameters', 'bins']],
  ] as const) {
    if (!container || asString(container.mode) !== 'width') continue;
    const width = asNumber(container.width);
    const start = asNumber(container.start);
    const stop = asNumber(container.stop);
    if (width !== undefined && !(width > 0)) {
      errors.push(
        makeError({
          code: 'SCIENCE_BIN_EDGES_INVALID',
          stage: 'science',
          instancePath: pointer(...at, 'width'),
          validatorId: 'bins.strictly_increasing',
          message: 'the bin width must be positive.',
        }),
      );
    }
    if (start !== undefined && stop !== undefined && !(stop > start)) {
      errors.push(
        makeError({
          code: 'SCIENCE_BIN_EDGES_INVALID',
          stage: 'science',
          instancePath: pointer(...at, 'stop'),
          validatorId: 'bins.strictly_increasing',
          message: 'the binned range must be non-empty: stop must be greater than start.',
        }),
      );
    }
    if (width !== undefined && start !== undefined && stop !== undefined && width > 0 && stop > start) {
      const materialized = materializeWidthBins(start, stop, width);
      if (!materialized.ok) {
        errors.push(
          makeError({
            code: 'SCIENCE_BIN_EDGES_INVALID',
            stage: 'science',
            instancePath: pointer(...at, 'width'),
            validatorId: 'bins.strictly_increasing',
            message: `the width-mode specification cannot be materialized as at most ${MAX_MATERIALIZED_BINS} strictly increasing binary64 bins over the declared range. Increase the width or use explicit edges.`,
          }),
        );
      }
    }
  }

  errors.push(...populationRateBinsBindWindow(context));
  return errors;
};

export const windowValid: SemanticValidator = (context: SemanticContext): CortexelError[] => {
  const at = asString(context.parameters?.pointer) ?? '/data/window';
  const window = asRecord(readPointer(context.request, at));
  if (!window) return [];

  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  if (start === undefined || stop === undefined) return [];

  if (!(stop > start)) {
    return [
      makeError({
        code: 'SCIENCE_WINDOW_INVALID',
        stage: 'science',
        instancePath: `${at}/stop`,
        validatorId: 'window.valid',
        message: `the observation window is empty or inverted (start ${start}, stop ${stop}). It must satisfy start < stop.`,
      }),
    ];
  }

  return [];
};

/**
 * Events must lie within the declared observation window.
 *
 * The window is half-open [start, stop): an event exactly AT stop is outside it.
 * That is not pedantry. If two adjacent windows both claimed their shared boundary,
 * an event on it would be counted twice; if neither did, it would vanish. Half-open
 * is the only convention that tiles.
 *
 * Out-of-window events are reported with a COUNT, never silently dropped — a
 * disclosure on the figure then says how many were excluded.
 */
export const eventsWithinWindow: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const window = asRecord(data.window);
  if (!window) return [];

  const start = asNumber(window.start);
  const stop = asNumber(window.stop);
  if (start === undefined || stop === undefined) return [];

  const inclusiveStop = asString(window.boundary) === '[start,stop]';

  const eventTimes = asRecord(data.eventTimes);
  const times = asArray(eventTimes?.values);
  if (!times) return [];
  const eventUnit = asString(eventTimes?.unit);
  const windowUnit = asString(window.unit);
  if (!eventUnit || !windowUnit) return [];

  let outside = 0;
  let firstIndex = -1;

  for (let i = 0; i < times.length; i++) {
    const time = asNumber(times[i]);
    if (time === undefined) continue;
    let beforeStart: boolean;
    let beyondStop: boolean;
    try {
      if (eventUnit !== windowUnit) convert(time, eventUnit, windowUnit);
      const terms = [{ value: time, unit: eventUnit }];
      beforeStart = compareExactUnitSumToValue(terms, { value: start, unit: windowUnit }) < 0;
      const stopComparison = compareExactUnitSumToValue(terms, { value: stop, unit: windowUnit });
      beyondStop = inclusiveStop ? stopComparison > 0 : stopComparison >= 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'event-time unit conversion failed';
      const numericResolution = message.includes('overflowed') || message.includes('underflowed');
      return [
        makeError({
          code: numericResolution
            ? 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE'
            : 'SCIENCE_UNIT_DIMENSION_MISMATCH',
          stage: 'science',
          instancePath: pointer('data', 'eventTimes', 'values', i),
          validatorId: 'events.within_window',
          message: numericResolution
            ? `event ${i} cannot be converted from ${eventUnit} to ${windowUnit} without overflowing or underflowing finite binary64, so its window membership is not representable.`
            : `event times in ${eventUnit} cannot be compared with a window in ${windowUnit}: ${message}`,
        }),
      ];
    }
    if (beforeStart || beyondStop) {
      outside++;
      if (firstIndex < 0) firstIndex = i;
    }
  }

  if (outside === 0) return [];

  return [
    makeError({
      code: 'SCIENCE_EVENT_OUT_OF_WINDOW',
      stage: 'science',
      instancePath: pointer('data', 'eventTimes', 'values', firstIndex),
      validatorId: 'events.within_window',
      message: `${outside} of ${times.length} events fall outside the declared window [${start}, ${stop}${inclusiveStop ? ']' : ')'} ${windowUnit} after converting the event clock from ${eventUnit}. Widen the window, or remove them deliberately — Cortexel will not quietly ignore an observation you told it about.`,
    }),
  ];
};

/**
 * The recorded-sender universe must be declared, and every event must come from it.
 *
 * This is the rule that stops the most common silent error in population figures.
 * The number of neurons that SPIKED is not the number of neurons that were RECORDED.
 * A neuron that stayed silent for the whole window was still recorded, and it still
 * belongs in the denominator. Inferring the denominator from the event list drops
 * exactly those neurons — so the reported rate comes out too HIGH, in the direction
 * that makes the result look more interesting. Cortexel refuses to infer it.
 */
export const eventsSenderUniverseDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);

  const recorded = asArray(data.recordedSenderIds);
  const senders = asArray(data.eventSenderIds);

  // `prebinned` mode carries a count rather than a universe; nothing to check.
  if (recorded === undefined) return [];

  if (recorded.length === 0) {
    return [
      makeError({
        code: 'SCIENCE_POPULATION_UNIVERSE_REQUIRED',
        stage: 'science',
        instancePath: pointer('data', 'recordedSenderIds'),
        validatorId: 'events.sender_universe_declared',
        message:
          'the recorded-sender universe is empty. A per-neuron rate has no denominator without it, and Cortexel will not count the senders that happened to spike instead — a silent neuron is still a recorded neuron.',
      }),
    ];
  }

  if (!senders) return [];

  const universe = new Set(recorded.filter((id): id is string => typeof id === 'string'));
  return checkReferencesInUniverse(
    senders,
    universe,
    ['data', 'eventSenderIds'],
    'events.sender_universe_declared',
    'the declared recorded-sender universe',
  );
};

/**
 * The trial universe must be declared.
 *
 * Same failure, different axis: a trial in which nothing happened is still a trial.
 * Inferring the trial count from the maximum observed trial id silently drops the
 * empty ones, which shrinks the denominator and inflates every per-trial value.
 */
export const eventsTrialUniverseDeclared: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);

  const declaredCount = asNumber(data.trialCount);
  const trialIds = asArray(data.trialIds);
  const eventTrialIds = asArray(data.eventTrialIds);

  if (declaredCount === undefined && trialIds === undefined) {
    if (eventTrialIds !== undefined) {
      return [
        makeError({
          code: 'SCIENCE_TRIAL_UNIVERSE_REQUIRED',
          stage: 'science',
          instancePath: pointer('data'),
          validatorId: 'events.trial_universe_declared',
          message:
            'events carry trial ids but no trial universe or count was declared. Cortexel does not infer the trial count from the observed ids: a trial with no events is still a trial, and omitting it inflates every per-trial value.',
        }),
      ];
    }
    return [];
  }

  if (trialIds !== undefined && eventTrialIds !== undefined) {
    const universe = new Set(trialIds.filter((id): id is string => typeof id === 'string'));
    return checkReferencesInUniverse(
      eventTrialIds,
      universe,
      ['data', 'eventTrialIds'],
      'events.trial_universe_declared',
      'the declared trial universe',
    );
  }

  return [];
};

export const rateDenominatorPositive: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);

  const count = asNumber(data.recordedSenderCount);
  if (count === undefined) return [];

  if (!Number.isSafeInteger(count) || count < 1) {
    return [
      makeError({
        code: 'SCIENCE_DENOMINATOR_INVALID',
        stage: 'science',
        instancePath: pointer('data', 'recordedSenderCount'),
        validatorId: 'rate.denominator_positive',
        message: `the recorded-sender count must be a positive safe integer; got ${count}. Counts above Number.MAX_SAFE_INTEGER cannot be represented as arbitrary exact JSON integers.`,
      }),
    ];
  }

  return [];
};

/**
 * When the caller supplies BOTH a raw count and a normalized rate, re-derive the
 * rate and check it.
 *
 * Cortexel recomputes rather than trusts. A supplied rate that does not follow from
 * the count and the denominator means one of the three is wrong, and drawing the
 * number you were handed would propagate that error into the figure, the table, and
 * the archive — with a digest attesting to it.
 */
export const rateVerifyNormalization: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const parameters = getParameters(context);

  const counts = asArray(data.counts);
  const rates = asArray(asRecord(data.rates)?.values);
  if (!counts || !rates) return [];

  const senderCount = asNumber(data.recordedSenderCount);
  const edges = asArray(asRecord(data.binEdges)?.edges);
  const edgeUnit = asString(asRecord(data.binEdges)?.unit);
  const rateUnit = asString(asRecord(data.rates)?.unit);
  const normalization = asString(parameters.normalization);

  if (
    senderCount === undefined ||
    !edges ||
    !edgeUnit ||
    !rateUnit ||
    !normalization
  ) return [];

  const errors: CortexelError[] = [];

  for (let i = 0; i < counts.length && i < rates.length; i++) {
    const count = asNumber(counts[i]);
    const rate = asNumber(rates[i]);
    const lo = asNumber(edges[i]);
    const hi = asNumber(edges[i + 1]);

    if (count === undefined || rate === undefined || lo === undefined || hi === undefined) continue;

    if (!Number.isSafeInteger(count) || count < 0) {
      errors.push(
        makeError({
          code: 'SCIENCE_COUNT_NOT_INTEGER',
          stage: 'science',
          instancePath: pointer('data', 'counts', i),
          validatorId: 'rate.verify_normalization',
          message: `a bin count must be an exact non-negative safe integer; got ${count}. Counts above Number.MAX_SAFE_INTEGER cannot be represented as arbitrary exact JSON integers.`,
        }),
      );
      continue;
    }

    let expected: number;
    let rateHz: number;
    try {
      const integerFactor =
        normalization === 'mean_rate_per_recorded_sender' ? senderCount : 1;
      expected = divideExactIntegerByConvertedDifference(
        count,
        integerFactor,
        lo,
        hi,
        edgeUnit,
        's',
      );
      rateHz = convert(rate, rateUnit, 'Hz');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'numeric conversion failed';
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: pointer('data', 'rates', 'values', i),
          validatorId: 'rate.verify_normalization',
          message: `bin ${i}: the supplied rate cannot be verified from its count, bin endpoints, units, and denominator because the required exact binary64 derivation failed (${detail}). Cortexel refuses rather than trusting a pre-normalized value it could not re-derive.`,
        }),
      );
      continue;
    }

    const zeroClassMatches = (rateHz === 0) === (expected === 0);
    const signMatches =
      rateHz === 0 || expected === 0 || Math.sign(rateHz) === Math.sign(expected);
    const relativeMatch = binary64RelativeDifferenceWithinTolerance(
      rateHz,
      expected,
      NUMERIC_TOLERANCE.relative,
    );
    if (!zeroClassMatches || !signMatches || !relativeMatch) {
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: pointer('data', 'rates', 'values', i),
          validatorId: 'rate.verify_normalization',
          message: `bin ${i}: the supplied rate ${rate} ${rateUnit} (${rateHz} Hz) does not follow from its count. ${count} events over the exact converted interval [${lo}, ${hi}] ${edgeUnit}${normalization === 'mean_rate_per_recorded_sender' ? ` and ${senderCount} recorded senders` : ''} gives ${expected} Hz. Cortexel re-derives the rate rather than drawing the number it was handed.`,
        }),
      );
    }
  }

  return errors;
};

/**
 * Histogram normalization must be self-consistent.
 *
 * `count` must be exact integers. `probability` must sum to 1. `density` must
 * INTEGRATE to 1 — that is, sum(value x binWidth) = 1, not sum(value) = 1. The
 * difference between those two is the single most common histogram error there is,
 * and with unequal bin widths it is invisible in the picture.
 *
 * An EMPTY histogram normalizes to nothing at all — never to NaN, and never to a
 * fabricated flat distribution.
 */
export const histogramNormalizationConsistent: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const data = getData(context);
  const parameters = getParameters(context);

  const normalization = asString(parameters.normalization);
  if (!normalization) return [];

  const values = asArray(data.values) ?? asArray(asRecord(data.histogram)?.values);
  const valuesAtHistogram = asArray(asRecord(data.histogram)?.values) !== undefined;
  const edges =
    asArray(asRecord(data.binEdges)?.edges) ?? resolveBinEdges(asRecord(parameters.bins));
  const binUnit =
    asString(asRecord(data.binEdges)?.unit) ?? asString(asRecord(parameters.bins)?.unit);
  const histogramUnit = asString(asRecord(data.histogram)?.unit);
  const valuePath = valuesAtHistogram ? ['data', 'histogram', 'values'] as const : ['data', 'values'] as const;

  if (!values || !edges || values.length === 0) return [];
  if (edges.length !== values.length + 1) return [];

  const errors: CortexelError[] = [];

  if (normalization === 'count') {
    for (let i = 0; i < values.length; i++) {
      const value = asNumber(values[i]);
      if (value === undefined) continue;
      if (!Number.isSafeInteger(value) || value < 0) {
        errors.push(
          makeError({
            code: 'SCIENCE_COUNT_NOT_INTEGER',
            stage: 'science',
            instancePath: pointer(...valuePath, i),
            validatorId: 'histogram.normalization_consistent',
            message: `a count must be an exact non-negative integer; got ${value}.`,
          }),
        );
      }
    }
    return errors;
  }

  if (
    normalization === 'density' &&
    binUnit !== undefined &&
    histogramUnit !== undefined &&
    reciprocalUnit(binUnit) !== histogramUnit
  ) {
    errors.push(
      makeError({
        code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
        stage: 'science',
        instancePath: pointer('data', 'histogram', 'unit'),
        validatorId: 'histogram.normalization_consistent',
        message: `a density over bins in ${binUnit} must use the registered reciprocal unit ${String(reciprocalUnit(binUnit))}; got ${histogramUnit}.`,
      }),
    );
  }

  const probabilities: number[] = [];
  let exactIntegralUnits = 0n;
  let anyValue = false;

  for (let i = 0; i < values.length; i++) {
    const value = asNumber(values[i]);
    if (value === undefined) continue;
    anyValue = true;
    if (value < 0) {
      errors.push(
        makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: pointer(...valuePath, i),
          validatorId: 'histogram.normalization_consistent',
          message: `${normalization} values must be non-negative; got ${value}.`,
        }),
      );
      continue;
    }

    if (normalization === 'probability') {
      probabilities.push(value);
    } else {
      const lo = asNumber(edges[i]);
      const hi = asNumber(edges[i + 1]);
      if (lo === undefined || hi === undefined) return errors;
      // The density rule: value x width, not value. With unequal bins these differ,
      // and the resulting figure is wrong in a way no reader can see.
      const widthUnits =
        finiteBinary64ToMinSubnormalUnits(hi) - finiteBinary64ToMinSubnormalUnits(lo);
      exactIntegralUnits += finiteBinary64ToMinSubnormalUnits(value) * widthUnits;
    }
  }

  if (!anyValue) return errors;

  let total: number;
  try {
    total = normalization === 'probability'
      ? exactBinary64Sum(probabilities)
      : exactRationalToBinary64(exactIntegralUnits, 1n, -2148);
  } catch {
    errors.push(
      makeError({
        code: normalization === 'density'
          ? 'SCIENCE_DENSITY_DOES_NOT_INTEGRATE'
          : 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        stage: 'science',
        instancePath: pointer(...valuePath),
        validatorId: 'histogram.normalization_consistent',
        message: `the ${normalization} total is outside the finite binary64 range and cannot be verified.`,
      }),
    );
    return errors;
  }

  // A tolerance loose enough for accumulated binary64 error over many bins, and
  // tight enough that a genuinely unnormalized histogram cannot slip through.
  if (Math.abs(total - 1) > 1e-6) {
    errors.push(
      makeError({
        code:
          normalization === 'density'
            ? 'SCIENCE_DENSITY_DOES_NOT_INTEGRATE'
            : 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        stage: 'science',
        instancePath: pointer(...valuePath),
        validatorId: 'histogram.normalization_consistent',
        message:
          normalization === 'density'
            ? `a density must integrate to 1 over its bin widths, but sum(value x binWidth) = ${total}. Note that this is NOT the same as sum(value): with unequal bin widths the two differ, and only the integral is the density.`
            : `a probability histogram must sum to 1, but these values sum to ${total}.`,
      }),
    );
  }

  return errors;
};
