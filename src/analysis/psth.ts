/**
 * Peri-event time histogram derivation.
 *
 * Counts are the authority.  Every other displayed value is re-derived from an
 * exact integer count, the bin's exact endpoint exposure, its covering-trial
 * denominator, and (only for the per-sender normalization) the complete selected
 * sender count.  Pre-normalized values are an assertion to audit, never an input to
 * geometry.
 */

import { binIndex } from './bins.js';
import {
  exactRationalToBinary64,
  finiteBinary64ToMinSubnormalUnits,
} from '../core/exact-binary64.js';
import {
  conversionReceipt,
  convert,
  convertDifference,
  convertExactUnitSum,
  deriveExactAggregateCountRateOverIntervalsInUnit,
  deriveExactCountRateMinusAggregateRateOverIntervalsInUnit,
  deriveExactCountRateWithIntegerFactorsInUnit,
  dimensionOf,
  type ConversionReceipt,
} from '../core/units.js';

export type PsthNormalization =
  | 'count'
  | 'count_per_trial'
  | 'total_event_rate_per_trial'
  | 'mean_rate_per_selected_sender_per_trial';

export type PsthDenominatorPolicy =
  | 'uniform_trial_count'
  | 'per_bin_covering_trials';

export type PsthDerivationErrorCode =
  | 'RESOURCE_OBSERVATIONS_EXCEEDED'
  | 'SCIENCE_BIN_EDGES_INVALID'
  | 'SCIENCE_COUNT_NOT_INTEGER'
  | 'SCIENCE_DENOMINATOR_INVALID'
  | 'SCIENCE_EVENT_OUT_OF_WINDOW'
  | 'SCIENCE_NORMALIZATION_UNVERIFIABLE'
  | 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE'
  | 'SCIENCE_UNIT_DIMENSION_MISMATCH';

export class PsthDerivationError extends Error {
  readonly code: PsthDerivationErrorCode;
  readonly instancePath: string;

  constructor(code: PsthDerivationErrorCode, instancePath: string, message: string) {
    super(message);
    this.name = 'PsthDerivationError';
    this.code = code;
    this.instancePath = instancePath;
  }
}

export interface PsthBinsInput {
  readonly edges: readonly number[];
  readonly unit: string;
  readonly boundary: '[lo,hi)' | '[lo,hi]';
  readonly finalEdgeInclusive: boolean;
}

export interface PsthWindowInput {
  readonly start: number;
  readonly stop: number;
  readonly unit: string;
  readonly boundary: '[start,stop)' | '[start,stop]';
}

export interface PsthBaselineInput {
  readonly mode: 'subtract_mean_rate';
  readonly start: number;
  readonly stop: number;
}

interface PsthCommonInput {
  readonly bins: PsthBinsInput;
  readonly relativeWindow: PsthWindowInput;
  readonly normalization: PsthNormalization;
  readonly denominatorPolicy: PsthDenominatorPolicy;
  readonly senderExposurePolicy?: 'all_selected_senders_cover_every_counted_trial_bin';
  readonly baseline?: PsthBaselineInput;
}

export interface PsthEventsInput extends PsthCommonInput {
  readonly mode: 'events';
  readonly eventTimes: readonly number[];
  readonly eventTimeUnit: string;
  readonly eventSenderIds: readonly string[];
  readonly eventTrialIds: readonly string[];
  readonly recordedSenderIds: readonly string[];
  readonly trialIds: readonly string[];
  readonly alignmentTimes: readonly number[];
  readonly alignmentUnit: string;
}

export interface PsthPrebinnedInput extends PsthCommonInput {
  readonly mode: 'prebinned';
  readonly trialIds: readonly string[];
  readonly alignmentTimes: readonly number[];
  readonly alignmentUnit: string;
  readonly counts: readonly (number | null)[];
  readonly trialDenominators: readonly (number | null)[];
  readonly recordedSenderCount: number;
  readonly includedTrialCount: number;
  readonly excludedTrialCount: number;
  readonly suppliedValues?: {
    readonly kind: string;
    readonly unit: string;
    readonly values: readonly (number | null)[];
  };
}

export type PsthInput = PsthEventsInput | PsthPrebinnedInput;

export interface PsthResult {
  readonly mode: 'events' | 'prebinned';
  readonly edges: readonly number[];
  readonly binUnit: string;
  readonly binWidths: readonly number[];
  readonly relativeWindowStart: number;
  readonly relativeWindowStop: number;
  readonly relativeWindowUnit: string;
  readonly relativeWindowBoundary: '[start,stop)' | '[start,stop]';
  readonly binBoundary: '[lo,hi)' | '[lo,hi]';
  readonly finalEdgeInclusive: boolean;
  readonly counts: readonly (number | null)[];
  readonly trialDenominators: readonly (number | null)[];
  readonly values: readonly (number | null)[];
  readonly displayValues: readonly (number | null)[];
  readonly valueUnit: string;
  readonly baselineCorrectedValues: readonly (number | null)[];
  readonly baselineRate: number | null;
  readonly baselineBinStartIndex: number | null;
  readonly baselineBinStopIndex: number | null;
  readonly baselineStart: number | null;
  readonly baselineStop: number | null;
  readonly baselineUnit: string | null;
  readonly selectedSenderCount: number;
  readonly senderExposurePolicy: 'all_selected_senders_cover_every_counted_trial_bin' | null;
  readonly includedTrialCount: number;
  readonly excludedTrialCount: number;
  readonly excludedOutOfWindowCount: number | null;
  readonly acceptedEventCount: number | null;
  readonly missingBinCount: number;
  readonly exactCountTotal: string;
  readonly unitConversions: readonly string[];
  readonly conversionReceipts: readonly ConversionReceipt[];
  readonly suppliedValuesPresent: boolean;
  readonly suppliedValuesVerified: boolean | null;
  readonly receipt: Readonly<Record<string, unknown>>;
}

const PSTH_VALUE_TOLERANCE = 1e-12;
const PSTH_MAX_EVENTS = 2_000_000;
const PSTH_MAX_BINS = 100_000;
const PSTH_MAX_IDENTITIES = 100_000;

function assertPublicInputShape(input: PsthInput): void {
  const candidate = input as unknown as Record<string, unknown>;
  if (!candidate || typeof candidate !== 'object') {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '',
      'PSTH derivation requires an object input.',
    );
  }
  if (candidate.mode !== 'events' && candidate.mode !== 'prebinned') {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/mode',
      `PSTH mode must be events or prebinned; got ${String(candidate.mode)}.`,
    );
  }
  if (![
    'count',
    'count_per_trial',
    'total_event_rate_per_trial',
    'mean_rate_per_selected_sender_per_trial',
  ].includes(String(candidate.normalization))) {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/normalization',
      `unknown PSTH normalization ${String(candidate.normalization)}.`,
    );
  }
  if (
    candidate.denominatorPolicy !== 'uniform_trial_count' &&
    candidate.denominatorPolicy !== 'per_bin_covering_trials'
  ) {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      '/parameters/denominatorPolicy',
      `unknown PSTH denominator policy ${String(candidate.denominatorPolicy)}.`,
    );
  }
  if (
    candidate.senderExposurePolicy !== undefined &&
    candidate.senderExposurePolicy !== 'all_selected_senders_cover_every_counted_trial_bin'
  ) {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      '/parameters/senderExposurePolicy',
      `unknown PSTH sender-exposure policy ${String(candidate.senderExposurePolicy)}.`,
    );
  }
  const baseline = candidate.baseline as Record<string, unknown> | undefined;
  if (baseline !== undefined && baseline?.mode !== 'subtract_mean_rate') {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/baseline/mode',
      `unknown PSTH baseline mode ${String(baseline?.mode)}.`,
    );
  }
}

function assertObservationBudgets(input: PsthInput): void {
  const binCount = input.bins.edges.length - 1;
  if (binCount > PSTH_MAX_BINS) {
    throw new PsthDerivationError(
      'RESOURCE_OBSERVATIONS_EXCEEDED',
      '/parameters/bins',
      `PSTH derivation materializes at most ${PSTH_MAX_BINS} bins; got ${binCount}.`,
    );
  }
  if (input.trialIds.length > PSTH_MAX_IDENTITIES) {
    throw new PsthDerivationError(
      'RESOURCE_OBSERVATIONS_EXCEEDED',
      '/data/trialIds',
      `PSTH derivation accepts at most ${PSTH_MAX_IDENTITIES} trial identities.`,
    );
  }
  if (input.mode === 'events') {
    if (input.eventTimes.length > PSTH_MAX_EVENTS) {
      throw new PsthDerivationError(
        'RESOURCE_OBSERVATIONS_EXCEEDED',
        '/data/eventTimes/values',
        `PSTH derivation accepts at most ${PSTH_MAX_EVENTS} source events.`,
      );
    }
    if (input.recordedSenderIds.length > PSTH_MAX_IDENTITIES) {
      throw new PsthDerivationError(
        'RESOURCE_OBSERVATIONS_EXCEEDED',
        '/data/recordedSenderIds',
        `PSTH derivation accepts at most ${PSTH_MAX_IDENTITIES} selected-sender identities.`,
      );
    }
  } else if (
    input.counts.length > PSTH_MAX_BINS ||
    input.trialDenominators.length > PSTH_MAX_BINS ||
    (input.suppliedValues?.values.length ?? 0) > PSTH_MAX_BINS
  ) {
    throw new PsthDerivationError(
      'RESOURCE_OBSERVATIONS_EXCEEDED',
      '/data/counts',
      `prebinned PSTH arrays accept at most ${PSTH_MAX_BINS} entries.`,
    );
  }
}
function endpointMatchesCanonicalTypedConversion(
  edge: number,
  edgeUnit: string,
  windowEndpoint: number,
  windowUnit: string,
): boolean {
  const converted = convert(windowEndpoint, windowUnit, edgeUnit);
  return edge === converted;
}

function assertBinsTileWindow(input: PsthCommonInput): void {
  const { edges, unit } = input.bins;
  if (edges.length < 2) {
    throw new PsthDerivationError(
      'SCIENCE_BIN_EDGES_INVALID',
      '/parameters/bins',
      'a PSTH needs at least two authoritative bin edges.',
    );
  }
  for (let index = 0; index < edges.length; index++) {
    if (!Number.isFinite(edges[index])) {
      throw new PsthDerivationError(
        'SCIENCE_BIN_EDGES_INVALID',
        `/parameters/bins/edges/${index}`,
        `every authoritative PSTH bin edge must be finite; edge ${index} is ${edges[index]}.`,
      );
    }
    if (index > 0 && !(edges[index] > edges[index - 1])) {
      throw new PsthDerivationError(
        'SCIENCE_BIN_EDGES_INVALID',
        `/parameters/bins/edges/${index}`,
        `authoritative PSTH bin edges must be strictly increasing; edge ${index - 1} is ${edges[index - 1]} and edge ${index} is ${edges[index]}.`,
      );
    }
  }
  if (
    input.relativeWindow.boundary !== '[start,stop)' &&
    input.relativeWindow.boundary !== '[start,stop]'
  ) {
    throw new PsthDerivationError(
      'SCIENCE_BIN_EDGES_INVALID',
      '/data/relativeWindow/boundary',
      'a PSTH relative-window boundary must be explicitly declared as [start,stop) or [start,stop].',
    );
  }
  if (input.bins.boundary !== '[lo,hi)' && input.bins.boundary !== '[lo,hi]') {
    throw new PsthDerivationError(
      'SCIENCE_BIN_EDGES_INVALID',
      '/parameters/bins/boundary',
      'a PSTH bin boundary must be explicitly declared as [lo,hi) or [lo,hi].',
    );
  }
  const closedWindow = input.relativeWindow.boundary === '[start,stop]';
  const expectedBinBoundary = closedWindow ? '[lo,hi]' : '[lo,hi)';
  if (
    input.bins.boundary !== expectedBinBoundary ||
    input.bins.finalEdgeInclusive !== closedWindow
  ) {
    throw new PsthDerivationError(
      'SCIENCE_BIN_EDGES_INVALID',
      '/parameters/bins',
      `PSTH membership and placement boundaries must agree: relative-window boundary ${input.relativeWindow.boundary} requires bin boundary ${expectedBinBoundary} and finalEdgeInclusive ${closedWindow}.`,
    );
  }
  let extent: number;
  try {
    extent = convertDifference(
      input.relativeWindow.start,
      input.relativeWindow.stop,
      input.relativeWindow.unit,
      unit,
    );
  } catch (error) {
    throw new PsthDerivationError(
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/relativeWindow',
      `the typed relative-window extent cannot be represented in the bin unit (${error instanceof Error ? error.message : 'numeric conversion failed'}).`,
    );
  }
  const startMatches = endpointMatchesCanonicalTypedConversion(
    edges[0],
    unit,
    input.relativeWindow.start,
    input.relativeWindow.unit,
  );
  const stopMatches = endpointMatchesCanonicalTypedConversion(
    edges[edges.length - 1],
    unit,
    input.relativeWindow.stop,
    input.relativeWindow.unit,
  );
  if (!startMatches || !stopMatches) {
    throw new PsthDerivationError(
      'SCIENCE_BIN_EDGES_INVALID',
      '/parameters/bins',
      `PSTH bins must tile the typed relative window exactly after each window endpoint is correctly rounded once into the bin unit (${extent} ${unit} extent).`,
    );
  }
}

function assertTimeUnit(unit: string, path: string): void {
  if (dimensionOf(unit) !== 'time') {
    throw new PsthDerivationError(
      'SCIENCE_UNIT_DIMENSION_MISMATCH',
      path,
      `PSTH time coordinates require a registered time unit; got ${unit}.`,
    );
  }
}

function assertUniqueIds(ids: readonly string[], path: string, label: string): void {
  const seen = new Set<string>();
  for (let index = 0; index < ids.length; index++) {
    if (seen.has(ids[index])) {
      throw new PsthDerivationError(
        'SCIENCE_DENOMINATOR_INVALID',
        `${path}/${index}`,
        `the ${label} must contain unique ids; ${ids[index]} appears more than once.`,
      );
    }
    seen.add(ids[index]);
  }
}

function assertFiniteValues(values: readonly number[], path: string, label: string): void {
  for (let index = 0; index < values.length; index++) {
    if (!Number.isFinite(values[index])) {
      throw new PsthDerivationError(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        `${path}/${index}`,
        `every ${label} must be finite; entry ${index} is ${values[index]}.`,
      );
    }
  }
}

function isRateNormalization(normalization: PsthNormalization): boolean {
  return normalization === 'total_event_rate_per_trial' ||
    normalization === 'mean_rate_per_selected_sender_per_trial';
}

function expectedValueKind(normalization: PsthNormalization): string {
  if (normalization === 'count') return 'count';
  if (normalization === 'count_per_trial') return 'ratio';
  return 'firing_rate';
}

function validateSafeCount(value: number, path: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PsthDerivationError(
      'SCIENCE_COUNT_NOT_INTEGER',
      path,
      `a PSTH count must be an exact non-negative safe integer; got ${value}.`,
    );
  }
}

function validatePositiveDenominator(value: number, path: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      path,
      `a PSTH denominator must be a positive safe integer; got ${value}.`,
    );
  }
}

function exactDifferenceWithinScaleTolerance(
  actual: number,
  expected: number,
  scale: number,
): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || !Number.isFinite(scale) || scale < 0) {
    return false;
  }
  const actualUnits = finiteBinary64ToMinSubnormalUnits(actual);
  const expectedUnits = finiteBinary64ToMinSubnormalUnits(expected);
  const scaleUnits = finiteBinary64ToMinSubnormalUnits(scale);
  const toleranceUnits = finiteBinary64ToMinSubnormalUnits(PSTH_VALUE_TOLERANCE);
  const difference = actualUnits >= expectedUnits
    ? actualUnits - expectedUnits
    : expectedUnits - actualUnits;
  if (scaleUnits === 0n) return difference === 0n;
  return (difference << 1074n) <= scaleUnits * toleranceUnits;
}

function exactCountTotal(counts: readonly (number | null)[]): bigint {
  return counts.reduce(
    (sum: bigint, count) => sum + (count === null ? 0n : BigInt(count)),
    0n,
  );
}

function deriveNormalizedValues(
  counts: readonly (number | null)[],
  denominators: readonly (number | null)[],
  edges: readonly number[],
  binUnit: string,
  selectedSenderCount: number,
  normalization: PsthNormalization,
  valueUnit: string,
): (number | null)[] {
  return counts.map((count, index) => {
    const denominator = denominators[index];
    if (count === null || denominator === null) return null;
    if (normalization === 'count') return count;
    if (normalization === 'count_per_trial') {
      return exactRationalToBinary64(BigInt(count), BigInt(denominator));
    }
    const factors = normalization === 'mean_rate_per_selected_sender_per_trial'
      ? [denominator, selectedSenderCount]
      : [denominator];
    return deriveExactCountRateWithIntegerFactorsInUnit(
      count,
      factors,
      edges[index],
      edges[index + 1],
      binUnit,
      valueUnit,
    );
  });
}

function matchingCanonicalEdgeIndices(
  edges: readonly number[],
  edgeUnit: string,
  value: number,
  valueUnit: string,
): number[] {
  const matches: number[] = [];
  for (let index = 0; index < edges.length; index++) {
    if (endpointMatchesCanonicalTypedConversion(edges[index], edgeUnit, value, valueUnit)) {
      matches.push(index);
    }
  }
  return matches;
}

function deriveBaseline(
  input: PsthCommonInput,
  counts: readonly (number | null)[],
  denominators: readonly (number | null)[],
  selectedSenderCount: number,
  valueUnit: string,
): {
  readonly rate: number | null;
  readonly corrected: readonly (number | null)[];
  readonly startIndex: number | null;
  readonly stopIndex: number | null;
  readonly exactBaselineCount: string | null;
} {
  if (!input.baseline) {
    return {
      rate: null,
      corrected: counts.map(() => null),
      startIndex: null,
      stopIndex: null,
      exactBaselineCount: null,
    };
  }
  if (!isRateNormalization(input.normalization)) {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/baseline',
      'PSTH baseline subtraction is defined only for a rate normalization.',
    );
  }
  if (!(input.baseline.stop > input.baseline.start)) {
    throw new PsthDerivationError(
      'SCIENCE_BIN_EDGES_INVALID',
      '/parameters/baseline/stop',
      'the PSTH baseline interval must have strictly positive width.',
    );
  }
  const startMatches = matchingCanonicalEdgeIndices(
    input.bins.edges,
    input.bins.unit,
    input.baseline.start,
    input.relativeWindow.unit,
  );
  const stopMatches = matchingCanonicalEdgeIndices(
    input.bins.edges,
    input.bins.unit,
    input.baseline.stop,
    input.relativeWindow.unit,
  );
  const startIndex = startMatches.length === 1 ? startMatches[0] : -1;
  const stopIndex = stopMatches.length === 1 ? stopMatches[0] : -1;
  if (startIndex < 0 || stopIndex <= startIndex) {
    throw new PsthDerivationError(
      'SCIENCE_BIN_EDGES_INVALID',
      '/parameters/baseline',
      'each PSTH baseline bound must identify exactly one authoritative edge after one correctly rounded typed conversion into the bin unit; no match, an ambiguous match, or reversed edges is invalid.',
    );
  }

  let baselineCount = 0n;
  const intervals: { lower: number; upper: number; integerWeight: number }[] = [];
  for (let index = startIndex; index < stopIndex; index++) {
    const count = counts[index];
    const denominator = denominators[index];
    if (count === null || denominator === null) continue;
    baselineCount += BigInt(count);
    intervals.push({
      lower: input.bins.edges[index],
      upper: input.bins.edges[index + 1],
      integerWeight: denominator,
    });
  }
  if (intervals.length === 0) {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      '/parameters/baseline',
      'no included trial covered any complete bin in the baseline interval, so its total exposure is zero.',
    );
  }
  const integerFactors = input.normalization === 'mean_rate_per_selected_sender_per_trial'
    ? [selectedSenderCount]
    : [];
  let rate: number;
  let corrected: (number | null)[];
  try {
    rate = deriveExactAggregateCountRateOverIntervalsInUnit(
      baselineCount,
      integerFactors,
      intervals,
      input.bins.unit,
      valueUnit,
    );
    corrected = counts.map((count, index) => {
      const denominator = denominators[index];
      if (count === null || denominator === null) return null;
      const perBinFactors = input.normalization === 'mean_rate_per_selected_sender_per_trial'
        ? [denominator, selectedSenderCount]
        : [denominator];
      return deriveExactCountRateMinusAggregateRateOverIntervalsInUnit(
        count,
        perBinFactors,
        input.bins.edges[index],
        input.bins.edges[index + 1],
        baselineCount,
        integerFactors,
        intervals,
        input.bins.unit,
        valueUnit,
      );
    });
  } catch (error) {
    throw new PsthDerivationError(
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/parameters/baseline',
      `the exact aggregate baseline exposure cannot be represented (${error instanceof Error ? error.message : 'numeric derivation failed'}).`,
    );
  }

  return {
    rate,
    corrected,
    startIndex,
    stopIndex,
    exactBaselineCount: baselineCount.toString(10),
  };
}

function auditSuppliedValues(
  supplied: PsthPrebinnedInput['suppliedValues'],
  expected: readonly (number | null)[],
  normalization: PsthNormalization,
): void {
  if (!supplied) return;
  const kind = expectedValueKind(normalization);
  if (supplied.kind !== kind) {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/rates/kind',
      `normalization ${normalization} requires supplied normalized values of kind ${kind}; got ${supplied.kind}.`,
    );
  }
  const expectedDimension = isRateNormalization(normalization) ? 'frequency' : 'dimensionless';
  if (dimensionOf(supplied.unit) !== expectedDimension) {
    throw new PsthDerivationError(
      'SCIENCE_UNIT_DIMENSION_MISMATCH',
      '/data/rates/unit',
      `normalization ${normalization} requires a ${expectedDimension} value unit; got ${supplied.unit}.`,
    );
  }
  if (supplied.values.length !== expected.length) {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/rates/values',
      'supplied normalized values must have exactly one entry per authoritative PSTH bin.',
    );
  }
  const finiteExpected = expected.filter((value): value is number => value !== null);
  if (finiteExpected.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/counts',
      'a count-derived PSTH normalization must remain finite and non-negative before optional baseline subtraction.',
    );
  }
  for (let index = 0; index < expected.length; index++) {
    const expectedValue = expected[index];
    const suppliedValue = supplied.values[index];
    if ((expectedValue === null) !== (suppliedValue === null)) {
      throw new PsthDerivationError(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        `/data/rates/values/${index}`,
        'supplied normalized values must have the same missing-bin mask as counts and trial denominators.',
      );
    }
    if (suppliedValue !== null && (!Number.isFinite(suppliedValue) || suppliedValue < 0)) {
      throw new PsthDerivationError(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        `/data/rates/values/${index}`,
        'a supplied count-derived PSTH value must be finite and non-negative.',
      );
    }
    if (
      expectedValue !== null &&
      (suppliedValue === null ||
        (normalization === 'count'
          ? !Number.isSafeInteger(suppliedValue) || suppliedValue !== expectedValue
          : !exactDifferenceWithinScaleTolerance(
            suppliedValue,
            expectedValue,
            Math.abs(expectedValue),
          )))
    ) {
      throw new PsthDerivationError(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        `/data/rates/values/${index}`,
        `supplied PSTH value ${suppliedValue} does not match the value ${expectedValue} re-derived from its exact count, covering-trial denominator, selected-sender denominator, and typed bin exposure within the declared relative tolerance ${PSTH_VALUE_TOLERANCE}.`,
      );
    }
  }
}

function conversionsFor(input: PsthInput): {
  readonly labels: string[];
  readonly receipts: ConversionReceipt[];
} {
  const pairs: [string, string][] = [];
  if (input.relativeWindow.unit !== input.bins.unit) {
    pairs.push([input.relativeWindow.unit, input.bins.unit]);
  }
  if (input.mode === 'events') {
    if (input.eventTimeUnit !== input.bins.unit) pairs.push([input.eventTimeUnit, input.bins.unit]);
    if (input.alignmentUnit !== input.bins.unit) pairs.push([input.alignmentUnit, input.bins.unit]);
  }
  if (isRateNormalization(input.normalization)) {
    if (input.bins.unit !== 's') pairs.push([input.bins.unit, 's']);
    const outputUnit = input.mode === 'prebinned' ? input.suppliedValues?.unit ?? 'Hz' : 'Hz';
    if (outputUnit !== 'Hz') pairs.push(['Hz', outputUnit]);
  }
  const unique = [...new Map(pairs.map((pair) => [`${pair[0]}\u0000${pair[1]}`, pair])).values()];
  return {
    labels: unique.map(([from, to]) => `${from} -> ${to}`),
    receipts: unique.map(([from, to]) => conversionReceipt(from, to)),
  };
}

function deriveEvents(input: PsthEventsInput): {
  counts: (number | null)[];
  denominators: (number | null)[];
  selectedSenderCount: number;
  includedTrialCount: number;
  excludedTrialCount: number;
  excludedOutOfWindowCount: number;
  acceptedEventCount: number;
} {
  if (input.denominatorPolicy !== 'uniform_trial_count') {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      '/parameters/denominatorPolicy',
      'events-mode per_bin_covering_trials requires per-trial coverage records, but this request branch carries none. Cortexel refuses instead of inventing uniform coverage.',
    );
  }
  const lengths = [input.eventTimes.length, input.eventSenderIds.length, input.eventTrialIds.length];
  if (!lengths.every((length) => length === lengths[0])) {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/eventTimes/values',
      'event times, sender ids, and trial ids must remain positionally parallel.',
    );
  }
  if (input.trialIds.length !== input.alignmentTimes.length || input.trialIds.length < 1) {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      '/data/alignmentTimes',
      'every declared trial must have exactly one alignment time.',
    );
  }
  validatePositiveDenominator(input.recordedSenderIds.length, '/data/recordedSenderIds');
  validatePositiveDenominator(input.trialIds.length, '/data/trialIds');
  assertUniqueIds(input.recordedSenderIds, '/data/recordedSenderIds', 'selected-sender universe');
  assertUniqueIds(input.trialIds, '/data/trialIds', 'trial universe');
  assertFiniteValues(input.eventTimes, '/data/eventTimes/values', 'event time');
  assertFiniteValues(input.alignmentTimes, '/data/alignmentTimes', 'alignment time');

  const alignmentByTrial = new Map<string, number>();
  input.trialIds.forEach((trialId, index) => alignmentByTrial.set(trialId, input.alignmentTimes[index]));
  const senderUniverse = new Set(input.recordedSenderIds);
  const counts = new Array<number>(input.bins.edges.length - 1).fill(0);
  let excludedOutOfWindowCount = 0;
  let acceptedEventCount = 0;
  const windowStart = convert(input.relativeWindow.start, input.relativeWindow.unit, input.bins.unit);
  const windowStop = convert(input.relativeWindow.stop, input.relativeWindow.unit, input.bins.unit);
  if (!(windowStop > windowStart)) {
    throw new PsthDerivationError(
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/relativeWindow',
      'the relative-window endpoints collapse after the single typed conversion into the bin unit.',
    );
  }
  const closedStop = input.relativeWindow.boundary === '[start,stop]';
  const placement = {
    edges: input.bins.edges,
    finalEdgeInclusive: closedStop && input.bins.finalEdgeInclusive,
  };

  for (let index = 0; index < input.eventTimes.length; index++) {
    const senderId = input.eventSenderIds[index];
    const trialId = input.eventTrialIds[index];
    const alignment = alignmentByTrial.get(trialId);
    if (!senderUniverse.has(senderId) || alignment === undefined) {
      throw new PsthDerivationError(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        `/data/eventTrialIds/${index}`,
        'each PSTH event must resolve to one declared selected sender and one declared aligned trial.',
      );
    }
    let relative: number;
    try {
      relative = convertExactUnitSum(
        [
          { value: input.eventTimes[index], unit: input.eventTimeUnit },
          { value: -alignment, unit: input.alignmentUnit },
        ],
        input.bins.unit,
      );
    } catch (error) {
      throw new PsthDerivationError(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        `/data/eventTimes/values/${index}`,
        `event ${index} cannot be aligned through one exact typed subtraction (${error instanceof Error ? error.message : 'numeric conversion failed'}).`,
      );
    }
    const inWindow = relative >= windowStart &&
      (closedStop ? relative <= windowStop : relative < windowStop);
    if (!inWindow) {
      excludedOutOfWindowCount++;
      continue;
    }
    const bin = binIndex(relative, placement);
    if (bin < 0) {
      throw new PsthDerivationError(
        'SCIENCE_EVENT_OUT_OF_WINDOW',
        `/data/eventTimes/values/${index}`,
        `event ${index} is inside the declared relative window after alignment but falls in no authoritative bin. The window and bin boundary declarations are inconsistent at this value.`,
      );
    }
    counts[bin]++;
    acceptedEventCount++;
  }
  return {
    counts,
    denominators: counts.map(() => input.trialIds.length),
    selectedSenderCount: input.recordedSenderIds.length,
    includedTrialCount: input.trialIds.length,
    excludedTrialCount: 0,
    excludedOutOfWindowCount,
    acceptedEventCount,
  };
}

function derivePrebinned(input: PsthPrebinnedInput): {
  counts: (number | null)[];
  denominators: (number | null)[];
  selectedSenderCount: number;
  includedTrialCount: number;
  excludedTrialCount: number;
  excludedOutOfWindowCount: null;
  acceptedEventCount: null;
} {
  validatePositiveDenominator(input.recordedSenderCount, '/data/recordedSenderCount');
  validatePositiveDenominator(input.includedTrialCount, '/data/includedTrialCount');
  if (input.trialIds.length !== input.alignmentTimes.length) {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      '/data/alignmentTimes',
      'every pre-binned trial-universe id must retain exactly one declared alignment time.',
    );
  }
  assertUniqueIds(input.trialIds, '/data/trialIds', 'trial universe');
  assertFiniteValues(input.alignmentTimes, '/data/alignmentTimes', 'alignment time');
  if (!Number.isSafeInteger(input.excludedTrialCount) || input.excludedTrialCount < 0) {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      '/data/excludedTrialCount',
      'the excluded-trial count must be an exact non-negative safe integer.',
    );
  }
  if (input.includedTrialCount + input.excludedTrialCount !== input.trialIds.length) {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      '/data/trialIds',
      'the declared trial universe length must equal includedTrialCount + excludedTrialCount exactly.',
    );
  }
  const binCount = input.bins.edges.length - 1;
  if (input.counts.length !== binCount || input.trialDenominators.length !== binCount) {
    throw new PsthDerivationError(
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/counts',
      'prebinned counts and trial denominators must have exactly one entry per authoritative bin.',
    );
  }

  for (let index = 0; index < binCount; index++) {
    const count = input.counts[index];
    const denominator = input.trialDenominators[index];
    if ((count === null) !== (denominator === null)) {
      throw new PsthDerivationError(
        'SCIENCE_DENOMINATOR_INVALID',
        `/data/trialDenominators/${index}`,
        'a pre-binned PSTH count and covering-trial denominator must be null together.',
      );
    }
    if (count === null || denominator === null) {
      if (input.denominatorPolicy === 'uniform_trial_count') {
        throw new PsthDerivationError(
          'SCIENCE_DENOMINATOR_INVALID',
          `/data/trialDenominators/${index}`,
          'uniform_trial_count asserts that every included trial covered every bin, so an unobserved null bin is a contradiction.',
        );
      }
      continue;
    }
    validateSafeCount(count, `/data/counts/${index}`);
    validatePositiveDenominator(denominator, `/data/trialDenominators/${index}`);
    if (denominator > input.includedTrialCount) {
      throw new PsthDerivationError(
        'SCIENCE_DENOMINATOR_INVALID',
        `/data/trialDenominators/${index}`,
        `bin ${index} declares ${denominator} covering trials, above includedTrialCount ${input.includedTrialCount}.`,
      );
    }
    if (
      input.denominatorPolicy === 'uniform_trial_count' &&
      denominator !== input.includedTrialCount
    ) {
      throw new PsthDerivationError(
        'SCIENCE_DENOMINATOR_INVALID',
        `/data/trialDenominators/${index}`,
        `uniform_trial_count requires denominator ${input.includedTrialCount} in every observed bin; bin ${index} declares ${denominator}.`,
      );
    }
  }
  return {
    counts: [...input.counts],
    denominators: [...input.trialDenominators],
    selectedSenderCount: input.recordedSenderCount,
    includedTrialCount: input.includedTrialCount,
    excludedTrialCount: input.excludedTrialCount,
    excludedOutOfWindowCount: null,
    acceptedEventCount: null,
  };
}

function derivePsthUnchecked(input: PsthInput): PsthResult {
  assertPublicInputShape(input);
  assertObservationBudgets(input);
  assertTimeUnit(input.bins.unit, '/parameters/bins/unit');
  assertTimeUnit(input.relativeWindow.unit, '/data/relativeWindow/unit');
  assertTimeUnit(input.alignmentUnit, '/data/alignmentUnit');
  if (input.mode === 'events') {
    assertTimeUnit(input.eventTimeUnit, '/data/eventTimes/unit');
  }
  if (
    input.normalization === 'mean_rate_per_selected_sender_per_trial' &&
    input.senderExposurePolicy !== 'all_selected_senders_cover_every_counted_trial_bin'
  ) {
    throw new PsthDerivationError(
      'SCIENCE_DENOMINATOR_INVALID',
      '/parameters/senderExposurePolicy',
      'the per-selected-sender PSTH normalization requires an explicit assertion that every selected sender was observable in every counted trial/bin.',
    );
  }
  assertBinsTileWindow(input);
  const base = input.mode === 'events' ? deriveEvents(input) : derivePrebinned(input);
  if (input.mode === 'prebinned' && input.suppliedValues) {
    const requiredKind = expectedValueKind(input.normalization);
    const requiredDimension = isRateNormalization(input.normalization)
      ? 'frequency'
      : 'dimensionless';
    if (input.suppliedValues.kind !== requiredKind) {
      throw new PsthDerivationError(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        '/data/rates/kind',
        `normalization ${input.normalization} requires supplied normalized values of kind ${requiredKind}; got ${input.suppliedValues.kind}.`,
      );
    }
    if (dimensionOf(input.suppliedValues.unit) !== requiredDimension) {
      throw new PsthDerivationError(
        'SCIENCE_UNIT_DIMENSION_MISMATCH',
        '/data/rates/unit',
        `normalization ${input.normalization} requires a ${requiredDimension} value unit; got ${input.suppliedValues.unit}.`,
      );
    }
  }
  const suppliedValueUnit = input.mode === 'prebinned' ? input.suppliedValues?.unit : undefined;
  const valueUnit = isRateNormalization(input.normalization)
    ? suppliedValueUnit ?? 'Hz'
    : '1';
  let values: (number | null)[];
  try {
    values = deriveNormalizedValues(
      base.counts,
      base.denominators,
      input.bins.edges,
      input.bins.unit,
      base.selectedSenderCount,
      input.normalization,
      valueUnit,
    );
  } catch (error) {
    throw new PsthDerivationError(
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/counts',
      `the exact PSTH normalization cannot be represented (${error instanceof Error ? error.message : 'numeric derivation failed'}).`,
    );
  }
  if (input.mode === 'prebinned') {
    auditSuppliedValues(input.suppliedValues, values, input.normalization);
  }
  const baseline = deriveBaseline(
    input,
    base.counts,
    base.denominators,
    base.selectedSenderCount,
    valueUnit,
  );
  const corrected = baseline.corrected;
  const displayValues = baseline.rate === null ? values : corrected;
  let binWidths: number[];
  try {
    binWidths = input.bins.edges.slice(0, -1).map((lower, index) =>
      convertDifference(lower, input.bins.edges[index + 1], input.bins.unit, input.bins.unit));
  } catch (error) {
    throw new PsthDerivationError(
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/parameters/bins',
      `an exact PSTH bin width cannot be represented (${error instanceof Error ? error.message : 'numeric derivation failed'}).`,
    );
  }
  const countTotal = exactCountTotal(base.counts);
  const conversions = conversionsFor(input);
  const missingBinCount = base.counts.filter((count) => count === null).length;
  const receipt: Readonly<Record<string, unknown>> = {
    operation: 'psth.derive',
    mode: input.mode,
    normalization: input.normalization,
    denominatorPolicy: input.denominatorPolicy,
    binCount: base.counts.length,
    binUnit: input.bins.unit,
    binWidths,
    binBoundary: input.bins.boundary,
    relativeWindow: input.relativeWindow,
    finalEdgeInclusive: input.bins.finalEdgeInclusive,
    countTotalExact: countTotal.toString(10),
    selectedSenderCount: base.selectedSenderCount,
    includedTrialCount: base.includedTrialCount,
    excludedTrialCount: base.excludedTrialCount,
    trialDenominators: base.denominators,
    acceptedEventCount: base.acceptedEventCount,
    excludedOutOfWindowCount: base.excludedOutOfWindowCount,
    missingBinCount,
    valueUnit,
    exactExposureAuthority:
      'integer_count_over_integer_denominators_and_exact_typed_endpoint_differences_one_round_to_binary64',
    senderDenominatorApplied:
      input.normalization === 'mean_rate_per_selected_sender_per_trial',
    senderExposurePolicy: input.senderExposurePolicy ?? null,
    senderExposureVerifiableFromInput: false,
    suppliedNormalizedValues: input.mode === 'prebinned' && input.suppliedValues !== undefined,
    suppliedNormalizedValuesVerified:
      input.mode === 'prebinned' && input.suppliedValues !== undefined ? true : null,
    suppliedValueRelativeTolerance:
      input.mode === 'prebinned' &&
      input.suppliedValues !== undefined &&
      input.normalization !== 'count'
        ? PSTH_VALUE_TOLERANCE
        : null,
    suppliedCountExactEquality:
      input.mode === 'prebinned' &&
      input.suppliedValues !== undefined &&
      input.normalization === 'count'
        ? true
        : null,
    suppliedValueTolerancePolicy:
      input.mode === 'prebinned' && input.suppliedValues !== undefined
        ? input.normalization === 'count'
          ? 'exact_safe_integer_equality'
          : 'per_value_relative_to_exact_derived_magnitude_zero_requires_exact_zero'
        : null,
    baselineMode: input.baseline?.mode ?? null,
    baselineStart: input.baseline?.start ?? null,
    baselineStop: input.baseline?.stop ?? null,
    baselineUnit: input.baseline ? input.relativeWindow.unit : null,
    baselineStartBinIndex: baseline.startIndex,
    baselineStopBinIndexExclusive: baseline.stopIndex,
    baselineCountTotalExact: baseline.exactBaselineCount,
    baselineRate: baseline.rate,
    baselineExposureAuthority: baseline.rate === null
      ? null
      : 'sum_of_integer_covering_trial_weights_times_exact_typed_endpoint_differences',
    baselineCorrectionAuthority: baseline.rate === null
      ? null
      : 'single_exact_signed_rational_difference_one_round_to_binary64',
    unitConversions: conversions.receipts,
  };

  return {
    mode: input.mode,
    edges: [...input.bins.edges],
    binUnit: input.bins.unit,
    binWidths,
    relativeWindowStart: input.relativeWindow.start,
    relativeWindowStop: input.relativeWindow.stop,
    relativeWindowUnit: input.relativeWindow.unit,
    relativeWindowBoundary: input.relativeWindow.boundary,
    binBoundary: input.bins.boundary,
    finalEdgeInclusive: input.bins.finalEdgeInclusive,
    counts: base.counts,
    trialDenominators: base.denominators,
    values,
    displayValues,
    valueUnit,
    baselineCorrectedValues: corrected,
    baselineRate: baseline.rate,
    baselineBinStartIndex: baseline.startIndex,
    baselineBinStopIndex: baseline.stopIndex,
    baselineStart: input.baseline?.start ?? null,
    baselineStop: input.baseline?.stop ?? null,
    baselineUnit: input.baseline ? input.relativeWindow.unit : null,
    selectedSenderCount: base.selectedSenderCount,
    senderExposurePolicy: input.senderExposurePolicy ?? null,
    includedTrialCount: base.includedTrialCount,
    excludedTrialCount: base.excludedTrialCount,
    excludedOutOfWindowCount: base.excludedOutOfWindowCount,
    acceptedEventCount: base.acceptedEventCount,
    missingBinCount,
    exactCountTotal: countTotal.toString(10),
    unitConversions: conversions.labels,
    conversionReceipts: conversions.receipts,
    suppliedValuesPresent: input.mode === 'prebinned' && input.suppliedValues !== undefined,
    suppliedValuesVerified:
      input.mode === 'prebinned' && input.suppliedValues !== undefined ? true : null,
    receipt,
  };
}

/** Total public boundary: every finite-but-unrepresentable numeric case is typed. */
export function derivePsth(input: PsthInput): PsthResult {
  try {
    return derivePsthUnchecked(input);
  } catch (error) {
    if (error instanceof PsthDerivationError) throw error;
    throw new PsthDerivationError(
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/relativeWindow',
      `the PSTH derivation could not preserve a finite typed numeric invariant (${error instanceof Error ? error.message : 'numeric derivation failed'}).`,
    );
  }
}
