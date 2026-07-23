/**
 * Exact conservation kernels for stable quantitative distributions.
 *
 * These functions deliberately accept already-typed, dependency-light inputs. They
 * do not trust redundant totals: every returned count is derived from observations,
 * and every supplied audit total is checked against an independently derived value.
 * Integer conservation uses bigint even though current structural budgets keep the
 * final counts below Number.MAX_SAFE_INTEGER.
 */

import {
  binary64RelativeDifferenceWithinTolerance,
  exactBinary64Mean,
  exactBinary64Sum,
  exactRationalToBinary64,
} from '../core/exact-binary64.js';
import {
  compareExactUnitArraySumToDifference,
  compareExactUnitSumToValue,
  convert,
  divideExactIntegerByConvertedDifference,
} from '../core/units.js';

export type DistributionDerivationCode =
  | 'SEMANTIC_DUPLICATE_ID'
  | 'SEMANTIC_LENGTH_MISMATCH'
  | 'SEMANTIC_UNKNOWN_REFERENCE'
  | 'SCIENCE_AGGREGATION_REQUIRED'
  | 'SCIENCE_BIN_EDGES_INVALID'
  | 'SCIENCE_COUNT_NOT_INTEGER'
  | 'SCIENCE_DELAY_NONPOSITIVE'
  | 'SCIENCE_DENOMINATOR_INVALID'
  | 'SCIENCE_EVENT_OUT_OF_WINDOW'
  | 'SCIENCE_NEGATIVE_INTERVAL'
  | 'SCIENCE_NORMALIZATION_UNVERIFIABLE'
  | 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE'
  | 'SCIENCE_UNIT_DIMENSION_MISMATCH'
  | 'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE'
  | 'SCIENCE_WINDOW_INVALID'
  | 'SCIENCE_ZERO_INTERVAL_POLICY'
  | 'SCOPE_INCOMPATIBLE_WITH_SKILL'
  | 'SCOPE_MERGE_CONFLICT'
  | 'SCOPE_NODE_UNIVERSE_REQUIRED'
  | 'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN'
  | 'RENDER_NO_DATA'
  | 'RENDER_SERIES_LIMIT_EXCEEDED'
  | 'RESOURCE_OBSERVATIONS_EXCEEDED';

export class DistributionDerivationError extends Error {
  readonly code: DistributionDerivationCode;
  readonly path: readonly (string | number)[];

  constructor(
    code: DistributionDerivationCode,
    path: readonly (string | number)[],
    message: string,
  ) {
    super(message);
    this.name = 'DistributionDerivationError';
    this.code = code;
    this.path = path;
  }
}

export type HistogramNormalization = 'count' | 'probability' | 'density';
export type OutOfRangePolicy = 'reject' | 'exclude_and_report';

export interface ExactBinsInput {
  readonly edges: readonly number[];
  readonly unit: string;
  readonly finalEdgeInclusive: boolean;
  /** Optional bounded edge equality allowance, in binary64 ulps of compared magnitude. */
  readonly edgeToleranceUlps?: number;
}

export interface GroupedObservation {
  readonly groupId: string;
  readonly value: number;
}

export interface ExactHistogramGroup {
  readonly groupId: string;
  readonly counts: readonly number[];
  readonly values: readonly number[];
  readonly observationCount: number;
  readonly binnedObservationCount: number;
  readonly underRangeCount: number;
  readonly overRangeCount: number;
}

export interface ExactGroupedHistogram {
  readonly edges: readonly number[];
  readonly binUnit: string;
  readonly normalization: HistogramNormalization;
  readonly groups: readonly ExactHistogramGroup[];
}

function fail(
  code: DistributionDerivationCode,
  path: readonly (string | number)[],
  message: string,
): never {
  throw new DistributionDerivationError(code, path, message);
}

function assertFinite(value: number, path: readonly (string | number)[]): void {
  if (!Number.isFinite(value)) {
    fail('SCIENCE_NORMALIZATION_UNVERIFIABLE', path, 'a quantitative observation must be finite.');
  }
}

function assertSafeCount(value: number, path: readonly (string | number)[]): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(
      'SCIENCE_COUNT_NOT_INTEGER',
      path,
      `a count must be an exact non-negative safe integer; got ${String(value)}.`,
    );
  }
}

function checkedSafeNumber(value: bigint, path: readonly (string | number)[]): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail(
      'SCIENCE_COUNT_NOT_INTEGER',
      path,
      'the exact integer total exceeds Number.MAX_SAFE_INTEGER and cannot be emitted as a JSON number.',
    );
  }
  return Number(value);
}

function compareIdentifier(left: string, right: string): number {
  const leftIterator = left[Symbol.iterator]();
  const rightIterator = right[Symbol.iterator]();
  while (true) {
    const leftNext = leftIterator.next();
    const rightNext = rightIterator.next();
    if (leftNext.done || rightNext.done) {
      if (leftNext.done && rightNext.done) return 0;
      return leftNext.done ? -1 : 1;
    }
    const leftCodePoint = leftNext.value.codePointAt(0)!;
    const rightCodePoint = rightNext.value.codePointAt(0)!;
    if (leftCodePoint !== rightCodePoint) return leftCodePoint < rightCodePoint ? -1 : 1;
  }
}

/** Collision-free tuple identity even when a direct helper caller supplies delimiters. */
function compositeKey(parts: readonly string[]): string {
  return parts.map((part) => `${Array.from(part).length}:${part}`).join('');
}

function uniqueIds(
  values: readonly string[],
  path: readonly (string | number)[],
): readonly string[] {
  const seen = new Set<string>();
  for (let index = 0; index < values.length; index++) {
    if (seen.has(values[index])) {
      fail(
        'SEMANTIC_DUPLICATE_ID',
        [...path, index],
        `identifier ${JSON.stringify(values[index])} appears more than once.`,
      );
    }
    seen.add(values[index]);
  }
  return values;
}

function assertParallel(
  expected: number,
  actual: number,
  path: readonly (string | number)[],
): void {
  if (actual !== expected) {
    fail(
      'SEMANTIC_LENGTH_MISMATCH',
      path,
      `parallel array has ${actual} entries; expected ${expected}.`,
    );
  }
}

function validateBins(bins: ExactBinsInput): void {
  if (
    bins.edgeToleranceUlps !== undefined &&
    (!Number.isSafeInteger(bins.edgeToleranceUlps) ||
      bins.edgeToleranceUlps < 0 ||
      bins.edgeToleranceUlps > 16)
  ) {
    fail(
      'SCIENCE_BIN_EDGES_INVALID',
      ['bins', 'edgeToleranceUlps'],
      'the edge allowance must be an integer from 0 through 16 binary64 ulps.',
    );
  }
  if (bins.edges.length < 2) {
    fail('SCIENCE_BIN_EDGES_INVALID', ['bins', 'edges'], 'at least two bin edges are required.');
  }
  for (let index = 0; index < bins.edges.length; index++) {
    const edge = bins.edges[index];
    if (!Number.isFinite(edge)) {
      fail('SCIENCE_BIN_EDGES_INVALID', ['bins', 'edges', index], 'bin edges must be finite.');
    }
    if (index > 0 && !(edge > bins.edges[index - 1])) {
      fail(
        'SCIENCE_BIN_EDGES_INVALID',
        ['bins', 'edges', index],
        'bin edges must be strictly increasing.',
      );
    }
  }
}

/**
 * Express a raw observation in the declared bin unit with the contract's one
 * correctly-rounded registered conversion, then compare on that common axis.
 */
function compareObservationToEdge(
  value: number,
  valueUnit: string,
  edge: number,
  bins: ExactBinsInput,
): -1 | 0 | 1 {
  let converted: number;
  try {
    converted = valueUnit === bins.unit ? value : convert(value, valueUnit, bins.unit);
  } catch (error) {
    fail(
      'SCIENCE_UNIT_DIMENSION_MISMATCH',
      ['valueUnit'],
      error instanceof Error ? error.message : 'observation unit is not convertible to the bin unit.',
    );
  }
  const toleranceUlps = bins.edgeToleranceUlps ?? 0;
  const tolerance = toleranceUlps * Number.EPSILON * Math.max(
    Number.MIN_VALUE,
    Math.abs(converted),
    Math.abs(edge),
  );
  if (Math.abs(converted - edge) <= tolerance) return 0;
  return converted < edge ? -1 : 1;
}

/** One-conversion half-open membership with one explicit final-edge choice. */
export function exactUnitBinIndex(
  value: number,
  valueUnit: string,
  bins: ExactBinsInput,
): number {
  assertFinite(value, ['value']);
  validateBins(bins);
  const finalIndex = bins.edges.length - 1;
  const againstFirst = compareObservationToEdge(value, valueUnit, bins.edges[0], bins);
  if (againstFirst < 0) return -1;
  const againstLast = compareObservationToEdge(
    value,
    valueUnit,
    bins.edges[finalIndex],
    bins,
  );
  if (againstLast > 0) return -1;
  if (againstLast === 0) return bins.finalEdgeInclusive ? finalIndex - 1 : -1;

  let low = 0;
  let high = finalIndex;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    const comparison = compareObservationToEdge(
      value,
      valueUnit,
      bins.edges[middle],
      bins,
    );
    if (comparison >= 0) low = middle;
    else high = middle - 1;
  }
  return low;
}

/**
 * Bin an exact sum of received binary64 quantities without rounding the sum into
 * an intermediate observation. Used to prove that a derived difference did not
 * round across a scientific bin boundary before the ordinary histogram path.
 */
function exactUnitSumBinIndex(
  terms: readonly { readonly value: number; readonly unit: string }[],
  bins: ExactBinsInput,
): number {
  validateBins(bins);
  const compare = (edge: number): -1 | 0 | 1 => compareExactUnitSumToValue(
    terms,
    { value: edge, unit: bins.unit },
  );
  const finalIndex = bins.edges.length - 1;
  if (compare(bins.edges[0]) < 0) return -1;
  const againstLast = compare(bins.edges[finalIndex]);
  if (againstLast > 0 || (againstLast === 0 && !bins.finalEdgeInclusive)) return -1;
  if (againstLast === 0) return finalIndex - 1;
  let low = 0;
  let high = finalIndex;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    if (compare(bins.edges[middle]) >= 0) low = middle;
    else high = middle - 1;
  }
  return low;
}

function normalizedValues(
  counts: readonly number[],
  edges: readonly number[],
  unit: string,
  normalization: HistogramNormalization,
  denominator: number,
): readonly number[] {
  if (normalization === 'count') return [...counts];
  if (denominator < 1) {
    fail(
      'RENDER_NO_DATA',
      ['normalization'],
      `cannot form a ${normalization} histogram from zero in-range observations.`,
    );
  }
  return counts.map((count, index) => {
    if (normalization === 'probability') {
      return exactRationalToBinary64(BigInt(count), BigInt(denominator), 0);
    }
    return divideExactIntegerByConvertedDifference(
      count,
      denominator,
      edges[index],
      edges[index + 1],
      unit,
      unit,
    );
  });
}

/**
 * Count every observation exactly once into an in-range bin, under-range, or
 * over-range class. Group order is canonical and therefore input-permutation
 * invariant. `groupIds` is an independent universe, so an empty group cannot vanish.
 */
export function deriveExactGroupedHistogram(input: {
  readonly observations: readonly GroupedObservation[];
  readonly groupIds: readonly string[];
  readonly valueUnit: string;
  readonly bins: ExactBinsInput;
  readonly normalization: HistogramNormalization;
  readonly outOfRangePolicy: OutOfRangePolicy;
}): ExactGroupedHistogram {
  validateBins(input.bins);
  const groups = [...uniqueIds(input.groupIds, ['groupIds'])].sort(compareIdentifier);
  const groupSet = new Set(groups);
  const countsByGroup = new Map<string, number[]>();
  const underByGroup = new Map<string, number>();
  const overByGroup = new Map<string, number>();
  const observationsByGroup = new Map<string, number>();
  for (const groupId of groups) {
    countsByGroup.set(groupId, new Array<number>(input.bins.edges.length - 1).fill(0));
    underByGroup.set(groupId, 0);
    overByGroup.set(groupId, 0);
    observationsByGroup.set(groupId, 0);
  }

  for (let ordinal = 0; ordinal < input.observations.length; ordinal++) {
    const observation = input.observations[ordinal];
    if (!groupSet.has(observation.groupId)) {
      fail(
        'SEMANTIC_UNKNOWN_REFERENCE',
        ['observations', ordinal, 'groupId'],
        `group ${JSON.stringify(observation.groupId)} is absent from the declared group universe.`,
      );
    }
    assertFinite(observation.value, ['observations', ordinal, 'value']);
    observationsByGroup.set(
      observation.groupId,
      (observationsByGroup.get(observation.groupId) ?? 0) + 1,
    );
    const index = exactUnitBinIndex(observation.value, input.valueUnit, input.bins);
    if (index >= 0) {
      countsByGroup.get(observation.groupId)![index]++;
      continue;
    }
    const below = compareObservationToEdge(
      observation.value,
      input.valueUnit,
      input.bins.edges[0],
      input.bins,
    ) < 0;
    if (below) {
      underByGroup.set(observation.groupId, (underByGroup.get(observation.groupId) ?? 0) + 1);
    } else {
      overByGroup.set(observation.groupId, (overByGroup.get(observation.groupId) ?? 0) + 1);
    }
  }

  const resultGroups: ExactHistogramGroup[] = [];
  for (const groupId of groups) {
    const counts = countsByGroup.get(groupId)!;
    const underRangeCount = underByGroup.get(groupId)!;
    const overRangeCount = overByGroup.get(groupId)!;
    const observationCount = observationsByGroup.get(groupId)!;
    const binnedBig = counts.reduce((total, count) => total + BigInt(count), 0n);
    const classified = binnedBig + BigInt(underRangeCount) + BigInt(overRangeCount);
    if (classified !== BigInt(observationCount)) {
      fail(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        ['groups', groupId],
        'independent histogram classification did not conserve the observation count.',
      );
    }
    if (
      input.outOfRangePolicy === 'reject' &&
      (underRangeCount !== 0 || overRangeCount !== 0)
    ) {
      fail(
        'SCIENCE_BIN_EDGES_INVALID',
        ['bins'],
        `group ${JSON.stringify(groupId)} has ${underRangeCount} observations below and ${overRangeCount} above the declared range under reject.`,
      );
    }
    const binnedObservationCount = checkedSafeNumber(binnedBig, ['groups', groupId, 'counts']);
    resultGroups.push({
      groupId,
      counts,
      values: normalizedValues(
        counts,
        input.bins.edges,
        input.bins.unit,
        input.normalization,
        binnedObservationCount,
      ),
      observationCount,
      binnedObservationCount,
      underRangeCount,
      overRangeCount,
    });
  }

  return {
    edges: [...input.bins.edges],
    binUnit: input.bins.unit,
    normalization: input.normalization,
    groups: resultGroups,
  };
}

export interface PopulationRateResultV1 {
  readonly counts: readonly number[];
  readonly ratesHz: readonly number[];
  readonly recordedSenderCount: number;
  readonly sourceEventCount: number;
}

/** Population-rate arithmetic after window, membership, and bin axes are bound. */
export function derivePopulationRateCounts(input: {
  readonly eventTimes: readonly number[];
  readonly eventUnit: string;
  readonly bins: ExactBinsInput;
  readonly recordedSenderCount: number;
  readonly normalization: 'mean_rate_per_recorded_sender' | 'total_event_rate';
}): PopulationRateResultV1 {
  if (!Number.isSafeInteger(input.recordedSenderCount) || input.recordedSenderCount < 1) {
    fail(
      'SCIENCE_DENOMINATOR_INVALID',
      ['recordedSenderCount'],
      'the recorded-sender denominator must be a positive safe integer.',
    );
  }
  const histogram = deriveExactGroupedHistogram({
    observations: input.eventTimes.map((value) => ({ groupId: 'all', value })),
    groupIds: ['all'],
    valueUnit: input.eventUnit,
    bins: input.bins,
    normalization: 'count',
    outOfRangePolicy: 'reject',
  }).groups[0];
  const divisor = input.normalization === 'mean_rate_per_recorded_sender'
    ? input.recordedSenderCount
    : 1;
  const ratesHz = histogram.counts.map((count, index) =>
    divideExactIntegerByConvertedDifference(
      count,
      divisor,
      input.bins.edges[index],
      input.bins.edges[index + 1],
      input.bins.unit,
      's',
    ),
  );
  return {
    counts: histogram.counts,
    ratesHz,
    recordedSenderCount: input.recordedSenderCount,
    sourceEventCount: input.eventTimes.length,
  };
}

export interface IsiTrainDeclaration {
  readonly senderId: string;
  readonly trialId?: string;
  readonly spikeCount: number;
}

export interface IsiDistributionResultV1 {
  readonly histogram: ExactGroupedHistogram;
  readonly intervalCount: number;
  readonly spikeCount: number;
  readonly trainCount: number;
  readonly trainsWithoutIntervalCount: number;
  readonly zeroIntervalCount: number;
}

function trainKey(senderId: string, trialId: string | undefined): string {
  return trialId === undefined
    ? compositeKey(['sender', senderId])
    : compositeKey(['sender-trial', senderId, trialId]);
}

function declaredTrainKeys(
  senders: readonly string[],
  trials: readonly string[] | undefined,
  maximum: number,
): readonly string[] {
  uniqueIds(senders, ['recordedSenderIds']);
  if (trials) uniqueIds(trials, ['trialIds']);
  const count = BigInt(senders.length) * BigInt(trials?.length ?? 1);
  if (count > BigInt(maximum)) {
    fail(
      'RESOURCE_OBSERVATIONS_EXCEEDED',
      ['trialIds'],
      `the declared sender-by-trial train universe contains ${count} trains; maximum ${maximum}.`,
    );
  }
  const keys: string[] = [];
  if (trials) {
    for (const sender of senders) for (const trial of trials) keys.push(trainKey(sender, trial));
  } else {
    for (const sender of senders) keys.push(trainKey(sender, undefined));
  }
  return keys;
}

/** Derive and conserve an ISI histogram from raw event trains. */
export function deriveIsiFromEvents(input: {
  readonly eventTimes: readonly number[];
  readonly eventSenderIds: readonly string[];
  readonly eventTrialIds?: readonly string[];
  readonly recordedSenderIds: readonly string[];
  readonly trialIds?: readonly string[];
  readonly intervalUnit: string;
  readonly window: {
    readonly start: number;
    readonly stop: number;
    readonly unit: string;
    readonly boundary: '[start,stop)';
  };
  readonly bins: ExactBinsInput;
  readonly normalization: HistogramNormalization;
  readonly zeroIntervalPolicy: 'reject' | 'retain_as_zero';
  readonly outOfRangePolicy: OutOfRangePolicy;
  readonly maximumTrainCount?: number;
}): IsiDistributionResultV1 {
  assertParallel(input.eventTimes.length, input.eventSenderIds.length, ['eventSenderIds']);
  if (input.eventTrialIds) {
    assertParallel(input.eventTimes.length, input.eventTrialIds.length, ['eventTrialIds']);
    if (!input.trialIds) {
      fail(
        'SEMANTIC_UNKNOWN_REFERENCE',
        ['trialIds'],
        'event trial ids require a complete declared trial universe.',
      );
    }
  } else if (input.trialIds) {
    fail(
      'SEMANTIC_LENGTH_MISMATCH',
      ['eventTrialIds'],
      'a declared multi-trial universe requires a trial id for every event.',
    );
  }
  const keys = declaredTrainKeys(
    input.recordedSenderIds,
    input.trialIds,
    input.maximumTrainCount ?? 2_000_000,
  );
  const keySet = new Set(keys);
  const timesByTrain = new Map(keys.map((key) => [key, [] as number[]]));
  for (let ordinal = 0; ordinal < input.eventTimes.length; ordinal++) {
    const key = trainKey(input.eventSenderIds[ordinal], input.eventTrialIds?.[ordinal]);
    const train = timesByTrain.get(key);
    if (!train || !keySet.has(key)) {
      fail(
        'SEMANTIC_UNKNOWN_REFERENCE',
        ['eventSenderIds', ordinal],
        'an event references a train outside the declared sender-by-trial universe.',
      );
    }
    assertFinite(input.eventTimes[ordinal], ['eventTimes', ordinal]);
    const lowerComparedWithEvent = compareExactUnitSumToValue(
      [{ value: input.window.start, unit: input.window.unit }],
      { value: input.eventTimes[ordinal], unit: input.intervalUnit },
    );
    const upperComparedWithEvent = compareExactUnitSumToValue(
      [{ value: input.window.stop, unit: input.window.unit }],
      { value: input.eventTimes[ordinal], unit: input.intervalUnit },
    );
    if (lowerComparedWithEvent > 0 || upperComparedWithEvent <= 0) {
      fail(
        'SCIENCE_EVENT_OUT_OF_WINDOW',
        ['eventTimes', ordinal],
        'an event lies outside the exact half-open observation window.',
      );
    }
    train.push(input.eventTimes[ordinal]);
  }

  const observations: GroupedObservation[] = [];
  let trainsWithoutIntervalCount = 0;
  let zeroIntervalCount = 0;
  for (const key of keys) {
    const times = timesByTrain.get(key)!;
    times.sort((left, right) => left - right);
    if (times.length < 2) trainsWithoutIntervalCount++;
    for (let ordinal = 1; ordinal < times.length; ordinal++) {
      const interval = exactBinary64Sum([times[ordinal], -times[ordinal - 1]]);
      const exactIndex = exactUnitSumBinIndex(
        [
          { value: times[ordinal], unit: input.intervalUnit },
          { value: -times[ordinal - 1], unit: input.intervalUnit },
        ],
        input.bins,
      );
      const roundedIndex = exactUnitBinIndex(interval, input.intervalUnit, input.bins);
      if (exactIndex !== roundedIndex) {
        fail(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          ['eventTimes'],
          'an exact within-train difference rounds across a declared bin boundary.',
        );
      }
      if (interval < 0) {
        fail('SCIENCE_NEGATIVE_INTERVAL', ['eventTimes'], 'sorting produced a negative interval.');
      }
      if (interval === 0) {
        zeroIntervalCount++;
        if (input.zeroIntervalPolicy === 'reject') {
          fail(
            'SCIENCE_ZERO_INTERVAL_POLICY',
            ['zeroIntervalPolicy'],
            'a same-train zero interval is present under the reject policy.',
          );
        }
      }
      observations.push({ groupId: 'all', value: interval });
    }
  }
  const expectedIntervals = input.eventTimes.length - keys.reduce(
    (singletons, key) => singletons + Math.min(1, timesByTrain.get(key)!.length),
    0,
  );
  if (observations.length !== expectedIntervals) {
    fail(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      ['eventTimes'],
      'the independently derived within-train interval identity did not conserve event counts.',
    );
  }
  return {
    histogram: deriveExactGroupedHistogram({
      observations,
      groupIds: ['all'],
      valueUnit: input.intervalUnit,
      bins: input.bins,
      normalization: input.normalization,
      outOfRangePolicy: input.outOfRangePolicy,
    }),
    intervalCount: observations.length,
    spikeCount: input.eventTimes.length,
    trainCount: keys.length,
    trainsWithoutIntervalCount,
    zeroIntervalCount,
  };
}

/** Verify and conserve already-formed intervals against a complete train table. */
export function deriveIsiFromIntervals(input: {
  readonly intervals: readonly number[];
  readonly intervalSenderIds: readonly string[];
  readonly intervalTrialIds?: readonly string[];
  readonly trains: readonly IsiTrainDeclaration[];
  readonly recordedSenderIds: readonly string[];
  readonly trialIds?: readonly string[];
  readonly intervalUnit: string;
  readonly window: {
    readonly start: number;
    readonly stop: number;
    readonly unit: string;
    readonly boundary: '[start,stop)';
  };
  readonly bins: ExactBinsInput;
  readonly normalization: HistogramNormalization;
  readonly zeroIntervalPolicy: 'reject' | 'retain_as_zero';
  readonly outOfRangePolicy: OutOfRangePolicy;
  readonly maximumTrainCount?: number;
}): IsiDistributionResultV1 {
  assertParallel(input.intervals.length, input.intervalSenderIds.length, ['intervalSenderIds']);
  if (input.intervalTrialIds) {
    assertParallel(input.intervals.length, input.intervalTrialIds.length, ['intervalTrialIds']);
    if (!input.trialIds) {
      fail('SEMANTIC_UNKNOWN_REFERENCE', ['trialIds'], 'interval trial ids require a trial universe.');
    }
  } else if (input.trialIds) {
    fail(
      'SEMANTIC_LENGTH_MISMATCH',
      ['intervalTrialIds'],
      'a declared multi-trial universe requires a trial id for every interval.',
    );
  }
  const keys = declaredTrainKeys(
    input.recordedSenderIds,
    input.trialIds,
    input.maximumTrainCount ?? 2_000_000,
  );
  if (input.trains.length !== keys.length) {
    fail(
      'SEMANTIC_LENGTH_MISMATCH',
      ['trains'],
      `complete train table has ${input.trains.length} rows; expected ${keys.length}.`,
    );
  }
  const expectedKeys = new Set(keys);
  const spikeCountByTrain = new Map<string, number>();
  for (let ordinal = 0; ordinal < input.trains.length; ordinal++) {
    const train = input.trains[ordinal];
    assertSafeCount(train.spikeCount, ['trains', ordinal, 'spikeCount']);
    const key = trainKey(train.senderId, train.trialId);
    if (!expectedKeys.has(key)) {
      fail(
        'SEMANTIC_UNKNOWN_REFERENCE',
        ['trains', ordinal],
        'train row is outside the declared sender-by-trial universe.',
      );
    }
    if (spikeCountByTrain.has(key)) {
      fail('SEMANTIC_DUPLICATE_ID', ['trains', ordinal], 'train composite identity is duplicated.');
    }
    spikeCountByTrain.set(key, train.spikeCount);
  }
  for (const key of keys) {
    if (!spikeCountByTrain.has(key)) {
      fail('SEMANTIC_UNKNOWN_REFERENCE', ['trains'], `declared train ${JSON.stringify(key)} is missing.`);
    }
  }

  const suppliedIntervalsByTrain = new Map(keys.map((key) => [key, 0]));
  const intervalValuesByTrain = new Map(keys.map((key) => [key, [] as number[]]));
  const observations: GroupedObservation[] = [];
  let zeroIntervalCount = 0;
  for (let ordinal = 0; ordinal < input.intervals.length; ordinal++) {
    const key = trainKey(input.intervalSenderIds[ordinal], input.intervalTrialIds?.[ordinal]);
    if (!suppliedIntervalsByTrain.has(key)) {
      fail(
        'SEMANTIC_UNKNOWN_REFERENCE',
        ['intervalSenderIds', ordinal],
        'interval references a train outside the declared train table.',
      );
    }
    const interval = input.intervals[ordinal];
    assertFinite(interval, ['intervals', ordinal]);
    if (interval < 0) {
      fail('SCIENCE_NEGATIVE_INTERVAL', ['intervals', ordinal], 'an inter-spike interval cannot be negative.');
    }
    const durationComparedWithInterval = compareExactUnitSumToValue(
      [
        { value: input.window.stop, unit: input.window.unit },
        { value: -input.window.start, unit: input.window.unit },
      ],
      { value: interval, unit: input.intervalUnit },
    );
    if (durationComparedWithInterval < 0) {
      fail(
        'SCIENCE_EVENT_OUT_OF_WINDOW',
        ['intervals', ordinal],
        'an interval exceeds the exact observation-window duration.',
      );
    }
    if (interval === 0) {
      zeroIntervalCount++;
      if (input.zeroIntervalPolicy === 'reject') {
        fail(
          'SCIENCE_ZERO_INTERVAL_POLICY',
          ['intervals', ordinal],
          'a zero interval is present under the reject policy.',
        );
      }
    }
    suppliedIntervalsByTrain.set(key, suppliedIntervalsByTrain.get(key)! + 1);
    intervalValuesByTrain.get(key)!.push(interval);
    observations.push({ groupId: 'all', value: interval });
  }

  let expectedTotal = 0n;
  let spikeTotal = 0n;
  let trainsWithoutIntervalCount = 0;
  for (const key of keys) {
    const spikeCount = spikeCountByTrain.get(key)!;
    const expected = Math.max(spikeCount - 1, 0);
    if (expected === 0) trainsWithoutIntervalCount++;
    if (suppliedIntervalsByTrain.get(key) !== expected) {
      fail(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        ['trains'],
        `train ${JSON.stringify(key)} supplies ${suppliedIntervalsByTrain.get(key)} intervals but ${spikeCount} in-window spikes require exactly ${expected}.`,
      );
    }
    const spanComparison = compareExactUnitArraySumToDifference(
      intervalValuesByTrain.get(key)!,
      input.intervalUnit,
      { value: input.window.start, unit: input.window.unit },
      { value: input.window.stop, unit: input.window.unit },
    );
    if (spanComparison >= 0 && expected > 0) {
      fail(
        'SCIENCE_EVENT_OUT_OF_WINDOW',
        ['intervals'],
        `successive intervals of train ${JSON.stringify(key)} do not fit strictly inside the half-open observation window.`,
      );
    }
    expectedTotal += BigInt(expected);
    spikeTotal += BigInt(spikeCount);
  }
  if (expectedTotal !== BigInt(input.intervals.length)) {
    fail(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      ['intervals'],
      'sum(max(spikeCount - 1, 0)) does not equal the supplied interval count.',
    );
  }
  return {
    histogram: deriveExactGroupedHistogram({
      observations,
      groupIds: ['all'],
      valueUnit: input.intervalUnit,
      bins: input.bins,
      normalization: input.normalization,
      outOfRangePolicy: input.outOfRangePolicy,
    }),
    intervalCount: input.intervals.length,
    spikeCount: checkedSafeNumber(spikeTotal, ['trains', 'spikeCount']),
    trainCount: keys.length,
    trainsWithoutIntervalCount,
    zeroIntervalCount,
  };
}

export interface DegreeDistributionResultV1 {
  readonly nodeIds: readonly string[];
  readonly degrees: readonly number[];
  readonly degreeLow: readonly number[];
  readonly degreeHigh: readonly number[];
  readonly nodeCounts: readonly number[];
  readonly values: readonly number[];
  readonly countedConnectionCount: number;
  readonly countedIncidenceCount: number;
  readonly excludedAutapseCount: number;
}

/** Exact degree and histogram conservation over a complete declared universe. */
export function deriveDegreeDistribution(input: {
  readonly nodeIds: readonly string[];
  readonly sourceIds?: readonly string[];
  readonly targetIds?: readonly string[];
  readonly suppliedNodeIds?: readonly string[];
  readonly suppliedDegrees?: readonly number[];
  readonly suppliedCountedConnectionCount?: number;
  readonly suppliedCountedIncidenceCount?: number;
  readonly suppliedExcludedAutapseCount?: number;
  readonly direction: 'in' | 'out';
  readonly countingPolicy: 'count_edges' | 'count_unique_neighbors';
  readonly autapsePolicy: 'include' | 'exclude';
  readonly binning: { readonly mode: 'per_integer_degree' } | {
    readonly mode: 'integer_width';
    readonly width: number;
    readonly start: 0;
  };
  readonly normalization: 'count' | 'probability';
}): DegreeDistributionResultV1 {
  uniqueIds(input.nodeIds, ['nodeIds']);
  const universe = new Set(input.nodeIds);
  let degrees: number[];
  let countedConnectionCount: number;
  let countedIncidenceCount: number;
  let excludedAutapseCount: number;

  if (input.sourceIds && input.targetIds) {
    const sourceIds: readonly string[] = input.sourceIds;
    const targetIds: readonly string[] = input.targetIds;
    assertParallel(sourceIds.length, targetIds.length, ['targetIds']);
    degrees = new Array<number>(input.nodeIds.length).fill(0);
    const index = new Map(input.nodeIds.map((id, ordinal) => [id, ordinal]));
    const neighbours = input.countingPolicy === 'count_unique_neighbors'
      ? input.nodeIds.map(() => new Set<string>())
      : undefined;
    let countedRows = 0n;
    let excluded = 0n;
    for (let ordinal = 0; ordinal < sourceIds.length; ordinal++) {
      const source: string = sourceIds[ordinal];
      const target: string = targetIds[ordinal];
      if (!universe.has(source)) {
        fail('SEMANTIC_UNKNOWN_REFERENCE', ['sourceIds', ordinal], 'source is outside node universe.');
      }
      if (!universe.has(target)) {
        fail('SEMANTIC_UNKNOWN_REFERENCE', ['targetIds', ordinal], 'target is outside node universe.');
      }
      if (source === target && input.autapsePolicy === 'exclude') {
        excluded++;
        continue;
      }
      countedRows++;
      const countedId: string = input.direction === 'in' ? target : source;
      const counterpart: string = input.direction === 'in' ? source : target;
      const nodeIndex = index.get(countedId)!;
      if (neighbours) neighbours[nodeIndex].add(counterpart);
      else degrees[nodeIndex]++;
    }
    if (neighbours) {
      for (let ordinal = 0; ordinal < degrees.length; ordinal++) {
        degrees[ordinal] = neighbours[ordinal].size;
      }
    }
    countedConnectionCount = checkedSafeNumber(countedRows, ['countedConnectionCount']);
    excludedAutapseCount = checkedSafeNumber(excluded, ['excludedAutapseCount']);
    countedIncidenceCount = checkedSafeNumber(
      degrees.reduce((total, degree) => total + BigInt(degree), 0n),
      ['countedIncidenceCount'],
    );
  } else if (input.suppliedNodeIds && input.suppliedDegrees) {
    assertParallel(input.suppliedNodeIds.length, input.suppliedDegrees.length, ['suppliedDegrees']);
    uniqueIds(input.suppliedNodeIds, ['suppliedNodeIds']);
    if (input.suppliedNodeIds.length !== input.nodeIds.length) {
      fail(
        'SEMANTIC_LENGTH_MISMATCH',
        ['suppliedNodeIds'],
        'supplied degree rows must cover the complete node universe exactly once.',
      );
    }
    const supplied = new Map<string, number>();
    for (let ordinal = 0; ordinal < input.suppliedNodeIds.length; ordinal++) {
      const id = input.suppliedNodeIds[ordinal];
      if (!universe.has(id)) {
        fail('SEMANTIC_UNKNOWN_REFERENCE', ['suppliedNodeIds', ordinal], 'node is outside universe.');
      }
      const degree = input.suppliedDegrees[ordinal];
      assertSafeCount(degree, ['suppliedDegrees', ordinal]);
      const maximum = input.autapsePolicy === 'exclude'
        ? Math.max(0, input.nodeIds.length - 1)
        : input.nodeIds.length;
      if (input.countingPolicy === 'count_unique_neighbors' && degree > maximum) {
        fail(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          ['suppliedDegrees', ordinal],
          `unique-neighbour degree ${degree} exceeds the policy maximum ${maximum}.`,
        );
      }
      supplied.set(id, degree);
    }
    degrees = input.nodeIds.map((id) => {
      const degree = supplied.get(id);
      if (degree === undefined) {
        fail('SEMANTIC_UNKNOWN_REFERENCE', ['suppliedNodeIds'], `node ${JSON.stringify(id)} is missing.`);
      }
      return degree;
    });
    const incidence = degrees.reduce((total, degree) => total + BigInt(degree), 0n);
    if (
      input.suppliedCountedConnectionCount === undefined ||
      input.suppliedCountedIncidenceCount === undefined
    ) {
      fail(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        ['countedIncidenceCount'],
        'supplied degree mode requires both raw counted-connection and policy-incidence totals.',
      );
    }
    assertSafeCount(input.suppliedCountedConnectionCount, ['countedConnectionCount']);
    assertSafeCount(input.suppliedCountedIncidenceCount, ['countedIncidenceCount']);
    if (incidence !== BigInt(input.suppliedCountedIncidenceCount)) {
      fail(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        ['countedIncidenceCount'],
        `sum(degrees) is ${incidence}, not declared counted incidence ${input.suppliedCountedIncidenceCount}.`,
      );
    }
    if (
      input.countingPolicy === 'count_edges' &&
      input.suppliedCountedConnectionCount !== input.suppliedCountedIncidenceCount
    ) {
      fail(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        ['countedConnectionCount'],
        'count_edges requires raw counted connections to equal counted incidence exactly.',
      );
    }
    if (
      input.countingPolicy === 'count_unique_neighbors' &&
      input.suppliedCountedIncidenceCount > input.suppliedCountedConnectionCount
    ) {
      fail(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        ['countedIncidenceCount'],
        'unique-neighbour incidence cannot exceed the counted connection rows.',
      );
    }
    countedConnectionCount = input.suppliedCountedConnectionCount;
    countedIncidenceCount = input.suppliedCountedIncidenceCount;
    excludedAutapseCount = input.suppliedExcludedAutapseCount ?? 0;
    assertSafeCount(excludedAutapseCount, ['excludedAutapseCount']);
  } else {
    fail(
      'SEMANTIC_LENGTH_MISMATCH',
      ['data'],
      'degree derivation requires either connection rows or one supplied degree per node.',
    );
  }

  const maxDegree = degrees.reduce((maximum, degree) => Math.max(maximum, degree), 0);
  const degreeLow: number[] = [];
  const degreeHigh: number[] = [];
  const nodeCounts: number[] = [];
  if (input.binning.mode === 'per_integer_degree') {
    for (let degree = 0; degree <= maxDegree; degree++) {
      degreeLow.push(degree);
      degreeHigh.push(degree);
      nodeCounts.push(0);
    }
  } else {
    if (!Number.isSafeInteger(input.binning.width) || input.binning.width < 2) {
      fail('SCIENCE_BIN_EDGES_INVALID', ['binning', 'width'], 'integer bin width must be at least 2.');
    }
    const binCount = Math.floor(maxDegree / input.binning.width) + 1;
    for (let ordinal = 0; ordinal < binCount; ordinal++) {
      degreeLow.push(ordinal * input.binning.width);
      degreeHigh.push((ordinal + 1) * input.binning.width - 1);
      nodeCounts.push(0);
    }
  }
  for (const degree of degrees) {
    const ordinal = input.binning.mode === 'per_integer_degree'
      ? degree
      : Math.floor(degree / input.binning.width);
    nodeCounts[ordinal]++;
  }
  const enumerated = nodeCounts.reduce((total, count) => total + BigInt(count), 0n);
  if (enumerated !== BigInt(input.nodeIds.length)) {
    fail(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      ['nodeCounts'],
      'sum(nodeCounts) does not equal the complete node-universe cardinality.',
    );
  }
  const histogramIncidence = nodeCounts.reduce((total, count, ordinal) => {
    if (degreeLow[ordinal] !== degreeHigh[ordinal]) return total;
    return total + BigInt(degreeLow[ordinal]) * BigInt(count);
  }, 0n);
  if (
    input.binning.mode === 'per_integer_degree' &&
    histogramIncidence !== BigInt(countedIncidenceCount)
  ) {
    fail(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      ['nodeCounts'],
      'sum(degree * nodeCount) does not equal the independently derived counted incidence.',
    );
  }
  const values = input.normalization === 'count'
    ? [...nodeCounts]
    : nodeCounts.map((count) =>
        exactRationalToBinary64(BigInt(count), BigInt(input.nodeIds.length), 0));
  return {
    nodeIds: [...input.nodeIds],
    degrees,
    degreeLow,
    degreeHigh,
    nodeCounts,
    values,
    countedConnectionCount,
    countedIncidenceCount,
    excludedAutapseCount,
  };
}

export type PairAggregation = 'sum' | 'mean' | 'min' | 'max' | 'no_aggregation';

function aggregateValues(
  values: readonly number[],
  aggregation: PairAggregation,
  path: readonly (string | number)[],
): number {
  if (values.length === 0) {
    fail('SCIENCE_NORMALIZATION_UNVERIFIABLE', path, 'cannot aggregate an empty pair.');
  }
  if (aggregation === 'no_aggregation') {
    if (values.length !== 1) {
      fail(
        'SCIENCE_AGGREGATION_REQUIRED',
        path,
        `no_aggregation was declared but the ordered pair has ${values.length} rows.`,
      );
    }
    return values[0];
  }
  const ordered = [...values].sort((left, right) => left - right);
  if (aggregation === 'sum') return exactBinary64Sum(ordered);
  if (aggregation === 'mean') return exactBinary64Mean(ordered);
  if (aggregation === 'min') return ordered[0];
  return ordered[ordered.length - 1];
}

export interface EdgeDistributionGroupAccounting extends ExactHistogramGroup {
  readonly consideredConnectionCount: number;
  readonly missingConnectionCount: number;
  readonly missingObservationCount: number;
  readonly zeroObservationCount: number;
}

export interface EdgeDistributionResultV1 {
  readonly histogram: ExactGroupedHistogram;
  readonly groups: readonly EdgeDistributionGroupAccounting[];
  readonly sourceConnectionCount: number;
  readonly observationCount: number;
  readonly missingConnectionCount: number;
  readonly missingObservationCount: number;
  readonly zeroObservationCount: number;
  readonly minimumObservation: number | null;
  readonly maximumObservation: number | null;
}

function validateEndpointRect(
  sourceIds: readonly string[],
  targetIds: readonly string[],
  sourceUniverse: readonly string[],
  targetUniverse: readonly string[],
): void {
  uniqueIds(sourceUniverse, ['sourceUniverse']);
  uniqueIds(targetUniverse, ['targetUniverse']);
  const sources = new Set(sourceUniverse);
  const targets = new Set(targetUniverse);
  for (let ordinal = 0; ordinal < sourceIds.length; ordinal++) {
    if (!sources.has(sourceIds[ordinal])) {
      fail('SEMANTIC_UNKNOWN_REFERENCE', ['sourceIds', ordinal], 'source is outside source universe.');
    }
    if (!targets.has(targetIds[ordinal])) {
      fail('SEMANTIC_UNKNOWN_REFERENCE', ['targetIds', ordinal], 'target is outside target universe.');
    }
  }
}

/** Delay rows: every row is valued, and grouping precedes optional pair aggregation. */
export function deriveDelayDistribution(input: {
  readonly sourceIds: readonly string[];
  readonly targetIds: readonly string[];
  readonly delayValues: readonly number[];
  readonly delayUnit: string;
  readonly nodeUniverse: readonly string[];
  readonly synapseModels?: readonly string[];
  readonly groupBy: 'none' | 'synapse_model';
  readonly countingPolicy: 'per_connection' | 'per_ordered_pair';
  readonly aggregation?: Exclude<PairAggregation, 'sum'>;
  readonly bins: ExactBinsInput;
  readonly normalization: HistogramNormalization;
  readonly outOfRangePolicy: OutOfRangePolicy;
}): EdgeDistributionResultV1 {
  assertParallel(input.sourceIds.length, input.targetIds.length, ['targetIds']);
  assertParallel(input.sourceIds.length, input.delayValues.length, ['delayValues']);
  if (input.synapseModels) {
    assertParallel(input.sourceIds.length, input.synapseModels.length, ['synapseModels']);
  }
  validateEndpointRect(
    input.sourceIds,
    input.targetIds,
    input.nodeUniverse,
    input.nodeUniverse,
  );
  if (input.groupBy === 'synapse_model' && !input.synapseModels) {
    fail(
      'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
      ['synapseModels'],
      'grouping by synapse model requires one model label per row.',
    );
  }
  const groupIds = input.groupBy === 'none'
    ? ['all']
    : [...new Set(input.synapseModels!)].sort(compareIdentifier);
  if (groupIds.length === 0) {
    fail(
      'RENDER_NO_DATA',
      ['synapseModels'],
      'grouping by synapse model cannot produce a figure from zero connection rows.',
    );
  }
  if (groupIds.length > 8) {
    fail('RENDER_SERIES_LIMIT_EXCEEDED', ['synapseModels'], 'at most eight groups are renderable.');
  }
  const rowCountByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const observations: GroupedObservation[] = [];
  if (input.countingPolicy === 'per_connection') {
    if (input.aggregation !== undefined) {
      fail(
        'SCIENCE_AGGREGATION_REQUIRED',
        ['aggregation'],
        'per_connection preserves every multapse row and therefore forbids pair aggregation.',
      );
    }
    for (let ordinal = 0; ordinal < input.delayValues.length; ordinal++) {
      const value = input.delayValues[ordinal];
      if (!(value > 0)) {
        fail('SCIENCE_DELAY_NONPOSITIVE', ['delayValues', ordinal], 'a delay must be positive.');
      }
      const groupId = input.groupBy === 'none' ? 'all' : input.synapseModels![ordinal];
      rowCountByGroup.set(groupId, rowCountByGroup.get(groupId)! + 1);
      observations.push({ groupId, value });
    }
  } else {
    if (!input.aggregation) {
      fail(
        'SCIENCE_AGGREGATION_REQUIRED',
        ['aggregation'],
        'per_ordered_pair requires a declared min, mean, max, or no_aggregation rule.',
      );
    }
    const pairs = new Map<string, { groupId: string; values: number[] }>();
    for (let ordinal = 0; ordinal < input.delayValues.length; ordinal++) {
      const value = input.delayValues[ordinal];
      if (!(value > 0)) {
        fail('SCIENCE_DELAY_NONPOSITIVE', ['delayValues', ordinal], 'a delay must be positive.');
      }
      const groupId = input.groupBy === 'none' ? 'all' : input.synapseModels![ordinal];
      rowCountByGroup.set(groupId, rowCountByGroup.get(groupId)! + 1);
      const key = compositeKey([
        groupId,
        input.sourceIds[ordinal],
        input.targetIds[ordinal],
      ]);
      const pair = pairs.get(key);
      if (pair) pair.values.push(value);
      else pairs.set(key, { groupId, values: [value] });
    }
    for (const key of [...pairs.keys()].sort(compareIdentifier)) {
      const pair = pairs.get(key)!;
      observations.push({
        groupId: pair.groupId,
        value: aggregateValues(pair.values, input.aggregation, ['pairs', key]),
      });
    }
  }
  const histogram = deriveExactGroupedHistogram({
    observations,
    groupIds,
    valueUnit: input.delayUnit,
    bins: input.bins,
    normalization: input.normalization,
    outOfRangePolicy: input.outOfRangePolicy,
  });
  const groups = histogram.groups.map((group) => ({
    ...group,
    consideredConnectionCount: rowCountByGroup.get(group.groupId)!,
    missingConnectionCount: 0,
    missingObservationCount: 0,
    zeroObservationCount: 0,
  }));
  const classifiedRows = groups.reduce(
    (total, group) => total + BigInt(group.consideredConnectionCount),
    0n,
  );
  if (classifiedRows !== BigInt(input.sourceIds.length)) {
    fail(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      ['groups'],
      'synapse-model groups do not partition the connection rows exactly once.',
    );
  }
  return {
    histogram,
    groups,
    sourceConnectionCount: input.sourceIds.length,
    observationCount: observations.length,
    missingConnectionCount: 0,
    missingObservationCount: 0,
    zeroObservationCount: 0,
    minimumObservation: observations.length === 0
      ? null
      : observations.reduce((minimum, observation) => Math.min(minimum, observation.value), Infinity),
    maximumObservation: observations.length === 0
      ? null
      : observations.reduce((maximum, observation) => Math.max(maximum, observation.value), -Infinity),
  };
}

/** Weight rows preserve measured zero and missing as disjoint exact categories. */
export function deriveWeightDistribution(input: {
  readonly sourceIds: readonly string[];
  readonly targetIds: readonly string[];
  readonly weightValues: readonly (number | null)[];
  readonly weightUnit: string;
  readonly sourceUniverse: readonly string[];
  readonly targetUniverse: readonly string[];
  readonly synapseModels: readonly string[];
  readonly grouping: 'none' | 'by_synapse_model';
  readonly observationUnit: 'synapse' | 'node_pair';
  readonly aggregation?: PairAggregation;
  readonly signTreatment: 'preserve' | 'magnitude';
  readonly bins: ExactBinsInput;
  readonly normalization: HistogramNormalization;
  readonly outOfRangePolicy: OutOfRangePolicy;
}): EdgeDistributionResultV1 {
  assertParallel(input.sourceIds.length, input.targetIds.length, ['targetIds']);
  assertParallel(input.sourceIds.length, input.weightValues.length, ['weightValues']);
  assertParallel(input.sourceIds.length, input.synapseModels.length, ['synapseModels']);
  validateEndpointRect(
    input.sourceIds,
    input.targetIds,
    input.sourceUniverse,
    input.targetUniverse,
  );
  const groupIds = input.grouping === 'none'
    ? ['all']
    : [...new Set(input.synapseModels)].sort(compareIdentifier);
  if (groupIds.length === 0) {
    fail(
      'RENDER_NO_DATA',
      ['synapseModels'],
      'grouping by synapse model cannot produce a figure from zero connection rows.',
    );
  }
  if (groupIds.length > 8) {
    fail('RENDER_SERIES_LIMIT_EXCEEDED', ['synapseModels'], 'at most eight groups are renderable.');
  }
  const rowCountByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const missingRowsByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const missingObservationsByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const zeroByGroup = new Map(groupIds.map((groupId) => [groupId, 0]));
  const observations: GroupedObservation[] = [];
  const transform = (value: number): number =>
    input.signTreatment === 'magnitude' ? Math.abs(value) : value;

  if (input.observationUnit === 'synapse') {
    if (input.aggregation !== undefined) {
      fail(
        'SCIENCE_AGGREGATION_REQUIRED',
        ['aggregation'],
        'synapse observations preserve every multapse and forbid pair aggregation.',
      );
    }
    for (let ordinal = 0; ordinal < input.weightValues.length; ordinal++) {
      const groupId = input.grouping === 'none' ? 'all' : input.synapseModels[ordinal];
      rowCountByGroup.set(groupId, rowCountByGroup.get(groupId)! + 1);
      const raw = input.weightValues[ordinal];
      if (raw === null) {
        missingRowsByGroup.set(groupId, missingRowsByGroup.get(groupId)! + 1);
        missingObservationsByGroup.set(groupId, missingObservationsByGroup.get(groupId)! + 1);
        continue;
      }
      assertFinite(raw, ['weightValues', ordinal]);
      const value = transform(raw);
      if (value === 0) zeroByGroup.set(groupId, zeroByGroup.get(groupId)! + 1);
      observations.push({ groupId, value });
    }
  } else {
    if (!input.aggregation) {
      fail('SCIENCE_AGGREGATION_REQUIRED', ['aggregation'], 'node_pair requires aggregation.');
    }
    const pairs = new Map<string, {
      groupId: string;
      values: number[];
      missing: boolean;
      connectionCount: number;
    }>();
    for (let ordinal = 0; ordinal < input.weightValues.length; ordinal++) {
      const groupId = input.grouping === 'none' ? 'all' : input.synapseModels[ordinal];
      rowCountByGroup.set(groupId, rowCountByGroup.get(groupId)! + 1);
      const key = compositeKey([
        groupId,
        input.sourceIds[ordinal],
        input.targetIds[ordinal],
      ]);
      const pair = pairs.get(key) ?? {
        groupId,
        values: [],
        missing: false,
        connectionCount: 0,
      };
      pair.connectionCount++;
      const raw = input.weightValues[ordinal];
      if (raw === null) {
        pair.missing = true;
        missingRowsByGroup.set(groupId, missingRowsByGroup.get(groupId)! + 1);
      } else {
        assertFinite(raw, ['weightValues', ordinal]);
        pair.values.push(raw);
      }
      pairs.set(key, pair);
    }
    for (const key of [...pairs.keys()].sort(compareIdentifier)) {
      const pair = pairs.get(key)!;
      if (input.aggregation === 'no_aggregation' && pair.connectionCount !== 1) {
        fail(
          'SCIENCE_AGGREGATION_REQUIRED',
          ['pairs', key],
          `no_aggregation was declared but the ordered pair has ${pair.connectionCount} rows.`,
        );
      }
      if (pair.missing) {
        missingObservationsByGroup.set(
          pair.groupId,
          missingObservationsByGroup.get(pair.groupId)! + 1,
        );
        continue;
      }
      const value = transform(aggregateValues(pair.values, input.aggregation, ['pairs', key]));
      if (value === 0) zeroByGroup.set(pair.groupId, zeroByGroup.get(pair.groupId)! + 1);
      observations.push({ groupId: pair.groupId, value });
    }
  }
  const histogram = deriveExactGroupedHistogram({
    observations,
    groupIds,
    valueUnit: input.weightUnit,
    bins: input.bins,
    normalization: input.normalization,
    outOfRangePolicy: input.outOfRangePolicy,
  });
  const groups = histogram.groups.map((group) => ({
    ...group,
    consideredConnectionCount: rowCountByGroup.get(group.groupId)!,
    missingConnectionCount: missingRowsByGroup.get(group.groupId)!,
    missingObservationCount: missingObservationsByGroup.get(group.groupId)!,
    zeroObservationCount: zeroByGroup.get(group.groupId)!,
  }));
  const classifiedRows = groups.reduce(
    (total, group) => total + BigInt(group.consideredConnectionCount),
    0n,
  );
  const missingConnectionCount = groups.reduce(
    (total, group) => total + group.missingConnectionCount,
    0,
  );
  if (classifiedRows !== BigInt(input.sourceIds.length)) {
    fail(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      ['groups'],
      'synapse-model groups do not partition every connection row exactly once.',
    );
  }
  return {
    histogram,
    groups,
    sourceConnectionCount: input.sourceIds.length,
    observationCount: observations.length,
    missingConnectionCount,
    missingObservationCount: groups.reduce(
      (total, group) => total + group.missingObservationCount,
      0,
    ),
    zeroObservationCount: groups.reduce(
      (total, group) => total + group.zeroObservationCount,
      0,
    ),
    minimumObservation: observations.length === 0
      ? null
      : observations.reduce((minimum, observation) => Math.min(minimum, observation.value), Infinity),
    maximumObservation: observations.length === 0
      ? null
      : observations.reduce((maximum, observation) => Math.max(maximum, observation.value), -Infinity),
  };
}

/** Verify optional normalized values against independently supplied exact counts. */
export function verifyHistogramValues(input: {
  readonly counts: readonly number[];
  readonly suppliedValues: readonly number[];
  readonly edges: readonly number[];
  readonly unit: string;
  readonly normalization: Exclude<HistogramNormalization, 'count'>;
  readonly tolerance?: number;
}): readonly number[] {
  assertParallel(input.counts.length, input.suppliedValues.length, ['suppliedValues']);
  assertParallel(input.counts.length + 1, input.edges.length, ['edges']);
  let denominatorBig = 0n;
  for (let ordinal = 0; ordinal < input.counts.length; ordinal++) {
    assertSafeCount(input.counts[ordinal], ['counts', ordinal]);
    denominatorBig += BigInt(input.counts[ordinal]);
  }
  const denominator = checkedSafeNumber(denominatorBig, ['counts']);
  const expected = normalizedValues(
    input.counts,
    input.edges,
    input.unit,
    input.normalization,
    denominator,
  );
  const mismatches: number[] = [];
  for (let ordinal = 0; ordinal < expected.length; ordinal++) {
    const actual = input.suppliedValues[ordinal];
    if (
      !Number.isFinite(actual) ||
      (actual === 0) !== (expected[ordinal] === 0) ||
      !binary64RelativeDifferenceWithinTolerance(
        actual,
        expected[ordinal],
        input.tolerance ?? 1e-9,
      )
    ) {
      mismatches.push(ordinal);
    }
  }
  return mismatches;
}
