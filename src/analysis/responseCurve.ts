/**
 * Deterministic response-curve derivation.
 *
 * A response curve is unusually easy to make flattering by accident: omit silent
 * repeats, let nulls slide parallel arrays out of alignment, average with the attempted
 * rather than retained denominator, or connect nominal categories. This module closes
 * those degrees of freedom before any geometry is built. It accepts the already
 * structurally validated parallel arrays, re-checks the scientific bindings that the
 * revision-2 validator registry cannot express, and returns one canonical condition
 * order plus explicit accounting for every attempted repeat.
 */

import {
  exactBinary64Mean,
  floorExactBinary64TimesSafeInteger,
  isRoundedMeanOfSafeNonnegativeIntegers,
} from '../core/exact-binary64.js';
import { deriveExactAggregateCountRateInUnit } from '../core/units.js';

export type ResponseCurveAxis = 'numeric' | 'ordinal' | 'nominal';
export type ResponseCurveEstimator = 'mean' | 'median' | 'trimmed_mean';
export type ResponseCurveScale = 'linear' | 'log10';
const RESPONSE_CURVE_METHODS = [
  'mean_firing_rate',
  'peak_firing_rate',
  'first_spike_latency',
  'event_count',
] as const;
export type ResponseCurveMethod = (typeof RESPONSE_CURVE_METHODS)[number];
export type ResponseCurveRepeatDesign = 'independent' | 'paired';

export interface ResponseCurveConditionsInput {
  readonly axis: ResponseCurveAxis;
  readonly ids: readonly string[];
  readonly labels?: readonly string[];
  readonly inputValues?: readonly number[];
  readonly inputScale?: ResponseCurveScale;
}

export interface ResponseCurveRepeatsInput {
  readonly conditionIds: readonly string[];
  readonly repeatIds: readonly string[];
  readonly responses: readonly (number | null)[];
  /** Declared attempted-repeat count for each condition, parallel to conditions.ids. */
  readonly attemptedCounts: readonly number[];
}

export interface ResponseCurveAggregatesInput {
  readonly responses: readonly (number | null)[];
  readonly sampleCounts: readonly (number | null)[];
  readonly excludedCounts: readonly number[];
  /** Defined responses removed symmetrically by trimmed_mean; required only for that estimator. */
  readonly trimmedCounts?: readonly number[];
}

export interface ResponseCurveBinnedPeakAuditInput {
  /** Exact max-bin count for each raw repeat, parallel to response values. */
  readonly peakBinCounts: readonly (number | null)[];
  readonly integerDivisor: number;
  readonly binWidthValue: number;
  readonly binWidthUnit: string;
  readonly rateUnit: string;
}

export interface ResponseCurveInput {
  readonly conditions: ResponseCurveConditionsInput;
  readonly estimator: ResponseCurveEstimator;
  readonly responseMethod: ResponseCurveMethod;
  readonly repeatDesign: ResponseCurveRepeatDesign;
  readonly trimFraction?: number;
  readonly repeats?: ResponseCurveRepeatsInput;
  readonly aggregates?: ResponseCurveAggregatesInput;
  /**
   * Raw binned peaks are estimated and ordered from exact max-bin counts, then the
   * condition-level count rational is rounded once into the declared rate unit.
   */
  readonly binnedPeakAudit?: ResponseCurveBinnedPeakAuditInput;
}

export type ResponseCurveIssueCode =
  | 'length_mismatch'
  | 'duplicate_condition'
  | 'unknown_condition'
  | 'duplicate_repeat'
  | 'duplicate_input'
  | 'attempted_count_mismatch'
  | 'paired_repeats_incomplete'
  | 'nonpositive_log_input'
  | 'invalid_response_value'
  | 'count_not_integer'
  | 'count_estimator_incoherent'
  | 'rate_audit_incoherent'
  | 'trimmed_count_incoherent'
  | 'invalid_numeric'
  | 'invalid_estimator';

export interface ResponseCurveIssue {
  readonly code: ResponseCurveIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface ResponseCurveRepeatRow {
  readonly conditionId: string;
  readonly repeatId: string;
  readonly response: number | null;
  readonly estimatorRole: 'retained' | 'trimmed_low' | 'trimmed_high' | 'undefined';
  /** The position in the caller's canonical parallel arrays. */
  readonly sourceOrdinal: number;
}

export interface ResponseCurveConditionResult {
  readonly conditionId: string;
  readonly conditionLabel: string;
  readonly input: number | null;
  readonly declaredOrdinal: number;
  readonly displayOrdinal: number;
  readonly estimate: number | null;
  readonly attemptedCount: number;
  /** Canonical table value: null only for a caller-supplied missing aggregate. */
  readonly sampleCount: number | null;
  readonly retainedCount: number;
  readonly trimmedCount: number;
  readonly excludedCount: number;
  readonly repeats: readonly ResponseCurveRepeatRow[];
}

export interface ResponseCurveResult {
  readonly axis: ResponseCurveAxis;
  readonly inputScale: ResponseCurveScale | null;
  readonly conditions: readonly ResponseCurveConditionResult[];
  readonly sortedRepeats: readonly ResponseCurveRepeatRow[];
  readonly attemptedCount: number;
  readonly retainedCount: number;
  readonly trimmedCount: number;
  readonly excludedCount: number;
  readonly conditionsWithoutEstimate: number;
  readonly rawRepeatsSupplied: boolean;
}

export type ResponseCurveOutcome =
  | { readonly ok: true; readonly result: ResponseCurveResult }
  | { readonly ok: false; readonly issue: ResponseCurveIssue };
type ResponseCurveFailure = Extract<ResponseCurveOutcome, { readonly ok: false }>;

function issue(
  code: ResponseCurveIssueCode,
  path: string,
  message: string,
): ResponseCurveFailure {
  return { ok: false, issue: { code, path, message } };
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function numericCompare(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * The correctly rounded arithmetic mean of finite binary64 values.
 *
 * Every input is decoded as an exact integer multiple of 2^-1074, accumulated with BigInt,
 * divided by retained n as an exact rational, and rounded once to binary64. This is
 * permutation-invariant and cannot overflow merely because a finite mean has an
 * unrepresentable intermediate sum (for example [MAX_VALUE, MAX_VALUE]). A non-zero
 * exact result that would round to zero is deliberately refused instead of being
 * published as a measured zero.
 */
export function exactResponseCurveMean(values: readonly number[]): number {
  if (values.length === 0) throw new Error('a mean requires at least one retained value');
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error('response values must be finite');
  }
  return exactBinary64Mean(values);
}

export function responseCurveEstimate(
  retained: readonly number[],
  estimator: ResponseCurveEstimator,
  trimFraction?: number,
): number | null {
  for (const value of retained) {
    if (!Number.isFinite(value)) throw new Error('response values must be finite');
  }
  if (retained.length === 0) return null;
  if (estimator === 'mean') return exactResponseCurveMean(retained);

  const ordered = [...retained].sort(numericCompare);
  if (estimator === 'median') {
    const middle = Math.floor(ordered.length / 2);
    const estimate = ordered.length % 2 === 1
      ? ordered[middle]
      : exactResponseCurveMean([ordered[middle - 1], ordered[middle]]);
    return estimate === 0 ? 0 : estimate;
  }

  if (estimator === 'trimmed_mean') {
    if (trimFraction === undefined || !(trimFraction >= 0 && trimFraction < 0.5)) {
      throw new Error('trimmed_mean requires a finite trimFraction in [0, 0.5)');
    }
    const trimPerTail = floorExactBinary64TimesSafeInteger(trimFraction, ordered.length);
    const retainedAfterTrim = ordered.slice(trimPerTail, ordered.length - trimPerTail);
    if (retainedAfterTrim.length === 0) {
      throw new Error('trimmed_mean removed every retained response');
    }
    return exactResponseCurveMean(retainedAfterTrim);
  }

  throw new Error(`unknown response-curve estimator: ${String(estimator)}`);
}

function canonicalZero(value: number): number {
  return value === 0 ? 0 : value;
}

function validateResponseValue(
  value: number | null,
  method: ResponseCurveMethod,
  mode: 'repeats' | 'aggregates',
  path: string,
): ResponseCurveFailure | number | null {
  if (value === null) return null;
  if (!Number.isFinite(value)) {
    return issue('invalid_numeric', path, 'response values must be finite or null');
  }
  if (method === 'mean_firing_rate' || method === 'peak_firing_rate') {
    if (value < 0) {
      return issue(
        'invalid_response_value',
        path,
        `${method} is a firing rate and cannot be negative`,
      );
    }
  } else if (method === 'first_spike_latency') {
    if (value < 0) {
      return issue(
        'invalid_response_value',
        path,
        'a defined first-spike latency must be non-negative; zero means the first event occurred exactly at the included measurement-window start, while null means no spike occurred',
      );
    }
  } else if (method === 'event_count') {
    if (mode === 'repeats' && (!Number.isSafeInteger(value) || value < 0)) {
      return issue(
        'count_not_integer',
        path,
        'a raw repeat event count must be an exact non-negative safe integer',
      );
    }
    if (mode === 'aggregates' && value < 0) {
      return issue(
        'invalid_response_value',
        path,
        'an aggregate estimator over event counts may be fractional but cannot be negative',
      );
    }
  }
  return canonicalZero(value);
}

function isFailure(value: ResponseCurveFailure | number | null): value is ResponseCurveFailure {
  return typeof value === 'object' && value !== null && 'ok' in value && value.ok === false;
}

/** Derive one canonical response curve without consulting layout or presentation. */
export function deriveResponseCurve(input: ResponseCurveInput): ResponseCurveOutcome {
  const { conditions } = input;
  if (!['numeric', 'ordinal', 'nominal'].includes(conditions.axis)) {
    return issue('invalid_estimator', '/data/conditions/axis', 'response-curve axis is not registered');
  }
  if (!['mean', 'median', 'trimmed_mean'].includes(input.estimator)) {
    return issue('invalid_estimator', '/parameters/estimator', 'response-curve estimator is not registered');
  }
  if (!(RESPONSE_CURVE_METHODS as readonly string[]).includes(input.responseMethod)) {
    return issue('invalid_response_value', '/parameters/responseMethod', 'response method is not registered');
  }
  if (!['independent', 'paired'].includes(input.repeatDesign)) {
    return issue('paired_repeats_incomplete', '/parameters/repeatDesign', 'repeat design is not registered');
  }
  if (
    input.estimator === 'trimmed_mean' &&
    (input.trimFraction === undefined || !(input.trimFraction >= 0 && input.trimFraction < 0.5))
  ) {
    return issue(
      'invalid_estimator',
      '/parameters/trimFraction',
      'trimmed_mean requires a finite trimFraction in [0, 0.5)',
    );
  }
  if (input.estimator !== 'trimmed_mean' && input.trimFraction !== undefined) {
    return issue(
      'invalid_estimator',
      '/parameters/trimFraction',
      'trimFraction is meaningful only for the trimmed_mean estimator',
    );
  }
  if (conditions.ids.length === 0) {
    return issue('length_mismatch', '/data/conditions/ids', 'the declared condition universe is empty');
  }
  if (conditions.labels && conditions.labels.length !== conditions.ids.length) {
    return issue(
      'length_mismatch',
      '/data/conditions/labels',
      'condition labels must be parallel to condition ids',
    );
  }
  if (conditions.axis === 'numeric') {
    if (!conditions.inputValues || conditions.inputValues.length !== conditions.ids.length) {
      return issue(
        'length_mismatch',
        '/data/conditions/input/values',
        'numeric condition inputs must be parallel to condition ids',
      );
    }
    const seenInputs = new Map<number, number>();
    for (let index = 0; index < conditions.inputValues.length; index++) {
      const value = conditions.inputValues[index];
      if (!Number.isFinite(value)) {
        return issue('invalid_numeric', `/data/conditions/input/values/${index}`, 'condition inputs must be finite');
      }
      if (conditions.inputScale === 'log10' && !(value > 0)) {
        return issue(
          'nonpositive_log_input',
          `/data/conditions/input/values/${index}`,
          'a log10 response-curve input axis requires every declared condition input to be strictly positive',
        );
      }
      const prior = seenInputs.get(value);
      if (prior !== undefined) {
        return issue(
          'duplicate_input',
          `/data/conditions/input/values/${index}`,
          `numeric input ${value} is declared by more than one condition (indices ${prior} and ${index}); equal-input observations belong under one condition unless another explicit series factor exists`,
        );
      }
      seenInputs.set(value, index);
    }
  }

  const declaredIndex = new Map<string, number>();
  for (let index = 0; index < conditions.ids.length; index++) {
    const id = conditions.ids[index];
    if (declaredIndex.has(id)) {
      return issue(
        'duplicate_condition',
        `/data/conditions/ids/${index}`,
        `condition id ${JSON.stringify(id)} appears more than once`,
      );
    }
    declaredIndex.set(id, index);
  }

  const conditionOrder = conditions.ids.map((_id, index) => index);
  if (conditions.axis === 'numeric') {
    const values = conditions.inputValues!;
    conditionOrder.sort((left, right) => numericCompare(values[left], values[right]) || left - right);
  }
  const displayIndex = new Map<number, number>();
  conditionOrder.forEach((declaredOrdinal, displayOrdinal) => {
    displayIndex.set(declaredOrdinal, displayOrdinal);
  });

  const rawRepeatsSupplied = input.repeats !== undefined;
  if (rawRepeatsSupplied === (input.aggregates !== undefined)) {
    return issue(
      'length_mismatch',
      '/data',
      'exactly one of raw repeats or per-condition aggregates must be supplied',
    );
  }
  if (
    input.binnedPeakAudit &&
    (!input.repeats || input.responseMethod !== 'peak_firing_rate')
  ) {
    return issue(
      'rate_audit_incoherent',
      '/data/observations/response/audit/peakBinCounts',
      'a binned-peak count audit is legal only for raw peak_firing_rate repeats',
    );
  }

  const repeatsByDeclaredCondition = conditions.ids.map((): ResponseCurveRepeatRow[] => []);
  let aggregateValues: readonly (number | null)[] | undefined;
  let aggregateSamples: readonly (number | null)[] | undefined;
  let aggregateExcluded: readonly number[] | undefined;

  if (input.repeats) {
    const repeats = input.repeats;
    const binnedPeakAudit = input.binnedPeakAudit;
    if (
      binnedPeakAudit &&
      binnedPeakAudit.peakBinCounts.length !== repeats.responses.length
    ) {
      return issue(
        'length_mismatch',
        '/data/observations/response/audit/peakBinCounts',
        'peakBinCounts must be parallel to raw binned-peak response values',
      );
    }
    if (repeats.attemptedCounts.length !== conditions.ids.length) {
      return issue(
        'length_mismatch',
        '/data/observations/attemptedCounts',
        'declared attempted counts must be parallel to the condition universe',
      );
    }
    for (let index = 0; index < repeats.attemptedCounts.length; index++) {
      const count = repeats.attemptedCounts[index];
      if (!Number.isSafeInteger(count) || count < 0) {
        return issue(
          'invalid_numeric',
          `/data/observations/attemptedCounts/${index}`,
          'declared attempted counts must be exact non-negative safe integers',
        );
      }
    }
    if (
      repeats.conditionIds.length !== repeats.repeatIds.length ||
      repeats.conditionIds.length !== repeats.responses.length
    ) {
      return issue(
        'length_mismatch',
        '/data/observations',
        'conditionIds, repeatIds, and response.values must have identical lengths',
      );
    }
    const seenByCondition = new Map<string, Set<string>>();
    for (let sourceOrdinal = 0; sourceOrdinal < repeats.conditionIds.length; sourceOrdinal++) {
      const conditionId = repeats.conditionIds[sourceOrdinal];
      const ordinal = declaredIndex.get(conditionId);
      if (ordinal === undefined) {
        return issue(
          'unknown_condition',
          `/data/observations/conditionIds/${sourceOrdinal}`,
          `observation references undeclared condition ${JSON.stringify(conditionId)}`,
        );
      }
      const repeatId = repeats.repeatIds[sourceOrdinal];
      const seen = seenByCondition.get(conditionId) ?? new Set<string>();
      if (seen.has(repeatId)) {
        return issue(
          'duplicate_repeat',
          `/data/observations/repeatIds/${sourceOrdinal}`,
          `repeat ${JSON.stringify(repeatId)} appears more than once in condition ${JSON.stringify(conditionId)}`,
        );
      }
      seen.add(repeatId);
      seenByCondition.set(conditionId, seen);

      const checkedResponse = validateResponseValue(
        repeats.responses[sourceOrdinal],
        input.responseMethod,
        'repeats',
        `/data/observations/response/values/${sourceOrdinal}`,
      );
      if (isFailure(checkedResponse)) return checkedResponse;
      const response = checkedResponse;
      if (binnedPeakAudit) {
        const peakBinCount = binnedPeakAudit.peakBinCounts[sourceOrdinal];
        if ((peakBinCount === null) !== (response === null)) {
          return issue(
            'rate_audit_incoherent',
            `/data/observations/response/audit/peakBinCounts/${sourceOrdinal}`,
            'a peak-bin count must be null exactly where its raw binned-peak rate is null',
          );
        }
        if (
          peakBinCount !== null &&
          (!Number.isSafeInteger(peakBinCount) || peakBinCount < 0)
        ) {
          return issue(
            'count_not_integer',
            `/data/observations/response/audit/peakBinCounts/${sourceOrdinal}`,
            'a peak-bin count must be an exact non-negative safe integer',
          );
        }
        if (peakBinCount !== null && response !== null) {
          let expectedRate: number;
          try {
            expectedRate = deriveExactAggregateCountRateInUnit(
              BigInt(peakBinCount),
              binnedPeakAudit.integerDivisor,
              1,
              binnedPeakAudit.binWidthValue,
              binnedPeakAudit.binWidthUnit,
              binnedPeakAudit.rateUnit,
            );
          } catch (error) {
            return issue(
              'rate_audit_incoherent',
              `/data/observations/response/values/${sourceOrdinal}`,
              `raw binned-peak rate cannot be re-derived from its exact max-bin count (${error instanceof Error ? error.message : 'numeric failure'})`,
            );
          }
          if ((response === 0 ? 0 : response) !== expectedRate) {
            return issue(
              'rate_audit_incoherent',
              `/data/observations/response/values/${sourceOrdinal}`,
              `raw binned-peak rate ${response} ${binnedPeakAudit.rateUnit} does not equal the one-round exact rate ${expectedRate} ${binnedPeakAudit.rateUnit} derived from max-bin count ${peakBinCount}`,
            );
          }
        }
      }
      repeatsByDeclaredCondition[ordinal].push({
        conditionId,
        repeatId,
        response,
        estimatorRole: response === null ? 'undefined' : 'retained',
        sourceOrdinal,
      });
    }
    if (input.repeatDesign === 'paired') {
      const referenceConditionId = conditions.ids[0];
      const referenceIds = seenByCondition.get(referenceConditionId) ?? new Set<string>();
      const referenceSorted = [...referenceIds].sort(codeUnitCompare);
      for (let ordinal = 1; ordinal < conditions.ids.length; ordinal++) {
        const conditionId = conditions.ids[ordinal];
        const candidate = seenByCondition.get(conditionId) ?? new Set<string>();
        const missing = referenceSorted.filter((repeatId) => !candidate.has(repeatId));
        const extra = [...candidate]
          .filter((repeatId) => !referenceIds.has(repeatId))
          .sort(codeUnitCompare);
        if (missing.length > 0 || extra.length > 0) {
          const details = [
            missing.length > 0 ? `missing ${missing.map((value) => JSON.stringify(value)).join(', ')}` : '',
            extra.length > 0 ? `has unmatched ${extra.map((value) => JSON.stringify(value)).join(', ')}` : '',
          ].filter((part) => part.length > 0).join(' and ');
          return issue(
            'paired_repeats_incomplete',
            '/data/observations/repeatIds',
            `paired condition ${JSON.stringify(conditionId)} ${details} relative to ${JSON.stringify(referenceConditionId)}; every paired repeat id must occur at every condition`,
          );
        }
      }
    }
    for (const rows of repeatsByDeclaredCondition) {
      rows.sort((left, right) =>
        codeUnitCompare(left.repeatId, right.repeatId) || left.sourceOrdinal - right.sourceOrdinal,
      );
    }
    for (let ordinal = 0; ordinal < conditions.ids.length; ordinal++) {
      if (repeatsByDeclaredCondition[ordinal].length !== repeats.attemptedCounts[ordinal]) {
        return issue(
          'attempted_count_mismatch',
          `/data/observations/attemptedCounts/${ordinal}`,
          `condition ${JSON.stringify(conditions.ids[ordinal])} declares ${repeats.attemptedCounts[ordinal]} attempted repeats but supplies ${repeatsByDeclaredCondition[ordinal].length} rows`,
        );
      }
    }
  } else {
    const aggregates = input.aggregates!;
    if (input.estimator === 'trimmed_mean') {
      if (!aggregates.trimmedCounts || aggregates.trimmedCounts.length !== conditions.ids.length) {
        return issue(
          'trimmed_count_incoherent',
          '/data/aggregates/trimmedCounts',
          'trimmed_mean aggregate input requires one total symmetric-tail trimmed count per condition',
        );
      }
    } else if (aggregates.trimmedCounts !== undefined) {
      return issue(
        'trimmed_count_incoherent',
        '/data/aggregates/trimmedCounts',
        'trimmedCounts is meaningful only for the trimmed_mean estimator',
      );
    }
    if (
      aggregates.responses.length !== conditions.ids.length ||
      aggregates.sampleCounts.length !== conditions.ids.length ||
      aggregates.excludedCounts.length !== conditions.ids.length
    ) {
      return issue(
        'length_mismatch',
        '/data/aggregates',
        'aggregate responses, sampleCounts, and excludedCounts must be parallel to the declared condition universe',
      );
    }
    for (let index = 0; index < conditions.ids.length; index++) {
      const checkedResponse = validateResponseValue(
        aggregates.responses[index],
        input.responseMethod,
        'aggregates',
        `/data/aggregates/response/values/${index}`,
      );
      if (isFailure(checkedResponse)) return checkedResponse;
      const response = checkedResponse;
      const sampleCount = aggregates.sampleCounts[index];
      const excludedCount = aggregates.excludedCounts[index];
      const trimmedCount = aggregates.trimmedCounts?.[index] ?? 0;
      if ((response === null) !== (sampleCount === null)) {
        return issue(
          'length_mismatch',
          `/data/aggregates/sampleCounts/${index}`,
          'aggregate response and retained sample count must share one missingness mask',
        );
      }
      if (sampleCount !== null && (!Number.isSafeInteger(sampleCount) || sampleCount < 1)) {
        return issue('invalid_numeric', `/data/aggregates/sampleCounts/${index}`, 'retained sample counts must be positive safe integers');
      }
      if (!Number.isSafeInteger(excludedCount) || excludedCount < 0) {
        return issue('invalid_numeric', `/data/aggregates/excludedCounts/${index}`, 'excluded counts must be non-negative safe integers');
      }
      if (!Number.isSafeInteger(trimmedCount) || trimmedCount < 0 || trimmedCount % 2 !== 0) {
        return issue(
          'trimmed_count_incoherent',
          `/data/aggregates/trimmedCounts/${index}`,
          'a total symmetric-tail trimmed count must be an exact non-negative even safe integer',
        );
      }
      if (sampleCount === null && trimmedCount !== 0) {
        return issue(
          'trimmed_count_incoherent',
          `/data/aggregates/trimmedCounts/${index}`,
          'a condition with no aggregate estimate cannot claim trimmed defined observations',
        );
      }
      const pretrimDefinedCount = (sampleCount ?? 0) + trimmedCount;
      if (!Number.isSafeInteger(pretrimDefinedCount)) {
        return issue(
          'invalid_numeric',
          `/data/aggregates/trimmedCounts/${index}`,
          'pre-trim defined sample count exceeds the exact integer range',
        );
      }
      if (input.estimator === 'trimmed_mean') {
        const expectedTrimmedCount = 2 * floorExactBinary64TimesSafeInteger(
          input.trimFraction!,
          pretrimDefinedCount,
        );
        if (trimmedCount !== expectedTrimmedCount) {
          return issue(
            'trimmed_count_incoherent',
            `/data/aggregates/trimmedCounts/${index}`,
            `trimmed count ${trimmedCount} does not equal 2 * floor_exact((${sampleCount ?? 0} + ${trimmedCount}) * ${input.trimFraction}) = ${expectedTrimmedCount}`,
          );
        }
      }
      if (!Number.isSafeInteger(pretrimDefinedCount + excludedCount)) {
        return issue('invalid_numeric', `/data/aggregates/excludedCounts/${index}`, 'attempted sample count exceeds the exact integer range');
      }
      if (input.responseMethod === 'event_count' && response !== null && sampleCount !== null) {
        const estimatorDenominator = input.estimator === 'median'
          ? sampleCount % 2 === 0 ? 2 : 1
          : sampleCount;
        if (!isRoundedMeanOfSafeNonnegativeIntegers(response, estimatorDenominator)) {
          return issue(
            'count_estimator_incoherent',
            `/data/aggregates/response/values/${index}`,
            `aggregate event-count value ${response} cannot be the correctly rounded ${input.estimator} of ${sampleCount} exact non-negative safe-integer counts under the declared estimator convention`,
          );
        }
      }
    }
    aggregateValues = aggregates.responses.map((response) =>
      response === null ? null : canonicalZero(response),
    );
    aggregateSamples = aggregates.sampleCounts;
    aggregateExcluded = aggregates.excludedCounts;
  }

  const derivedConditions: ResponseCurveConditionResult[] = [];
  let attemptedCount = 0;
  let retainedCount = 0;
  let trimmedCount = 0;
  let excludedCount = 0;
  let conditionsWithoutEstimate = 0;

  for (const declaredOrdinal of conditionOrder) {
    const rows = repeatsByDeclaredCondition[declaredOrdinal];
    let estimate: number | null;
    let retained: number;
    let sampleCount: number | null;
    let trimmed: number;
    let excluded: number;
    let attempted: number;
    let resultRows: readonly ResponseCurveRepeatRow[];

    if (input.repeats) {
      const binnedPeakAudit = input.binnedPeakAudit;
      const definedRows = rows
        .filter((row): row is ResponseCurveRepeatRow & { readonly response: number } =>
          row.response !== null,
        )
        .sort((left, right) =>
          numericCompare(
            binnedPeakAudit
              ? binnedPeakAudit.peakBinCounts[left.sourceOrdinal] as number
              : left.response,
            binnedPeakAudit
              ? binnedPeakAudit.peakBinCounts[right.sourceOrdinal] as number
              : right.response,
          ) ||
          codeUnitCompare(left.repeatId, right.repeatId) ||
          left.sourceOrdinal - right.sourceOrdinal,
        );
      const trimPerTail = input.estimator === 'trimmed_mean'
        ? floorExactBinary64TimesSafeInteger(input.trimFraction!, definedRows.length)
        : 0;
      const roleBySourceOrdinal = new Map<number, ResponseCurveRepeatRow['estimatorRole']>();
      for (let index = 0; index < definedRows.length; index++) {
        roleBySourceOrdinal.set(
          definedRows[index].sourceOrdinal,
          index < trimPerTail
            ? 'trimmed_low'
            : index >= definedRows.length - trimPerTail
              ? 'trimmed_high'
              : 'retained',
        );
      }
      resultRows = rows.map((row) => ({
        ...row,
        estimatorRole: row.response === null
          ? 'undefined'
          : roleBySourceOrdinal.get(row.sourceOrdinal)!,
      }));
      const definedValues = rows
        .map((row) => row.response)
        .filter((value): value is number => value !== null);
      trimmed = 2 * trimPerTail;
      retained = definedValues.length - trimmed;
      sampleCount = retained;
      excluded = rows.length - definedValues.length;
      attempted = rows.length;
      try {
        if (binnedPeakAudit) {
          const orderedCounts = definedRows.map(
            (row) => binnedPeakAudit.peakBinCounts[row.sourceOrdinal] as number,
          );
          if (orderedCounts.length === 0) {
            estimate = null;
          } else {
            let estimatorCounts: readonly number[];
            let estimatorDenominator: number;
            if (input.estimator === 'median') {
              const middle = Math.floor(orderedCounts.length / 2);
              estimatorCounts = orderedCounts.length % 2 === 1
                ? [orderedCounts[middle]]
                : [orderedCounts[middle - 1], orderedCounts[middle]];
              estimatorDenominator = estimatorCounts.length;
            } else {
              estimatorCounts = orderedCounts.slice(
                trimPerTail,
                orderedCounts.length - trimPerTail,
              );
              estimatorDenominator = estimatorCounts.length;
            }
            const countTotal = estimatorCounts.reduce(
              (total, count) => total + BigInt(count),
              0n,
            );
            estimate = deriveExactAggregateCountRateInUnit(
              countTotal,
              binnedPeakAudit.integerDivisor,
              estimatorDenominator,
              binnedPeakAudit.binWidthValue,
              binnedPeakAudit.binWidthUnit,
              binnedPeakAudit.rateUnit,
            );
          }
        } else {
          estimate = responseCurveEstimate(definedValues, input.estimator, input.trimFraction);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'response-curve estimator failed';
        return issue(
          'invalid_numeric',
          '/data/observations/response/values',
          `condition ${JSON.stringify(conditions.ids[declaredOrdinal])} cannot be estimated in finite binary64: ${message}`,
        );
      }
    } else {
      estimate = aggregateValues![declaredOrdinal];
      sampleCount = aggregateSamples![declaredOrdinal];
      retained = sampleCount ?? 0;
      trimmed = input.aggregates!.trimmedCounts?.[declaredOrdinal] ?? 0;
      excluded = aggregateExcluded![declaredOrdinal];
      attempted = retained + trimmed + excluded;
      resultRows = rows;
    }

    attemptedCount += attempted;
    retainedCount += retained;
    trimmedCount += trimmed;
    excludedCount += excluded;
    if (
      !Number.isSafeInteger(attemptedCount) ||
      !Number.isSafeInteger(retainedCount) ||
      !Number.isSafeInteger(trimmedCount) ||
      !Number.isSafeInteger(excludedCount)
    ) {
      return issue(
        'invalid_numeric',
        '/data/aggregates',
        'response-curve total accounting exceeds the exact safe-integer range',
      );
    }
    if (estimate === null) conditionsWithoutEstimate++;
    derivedConditions.push({
      conditionId: conditions.ids[declaredOrdinal],
      conditionLabel: conditions.labels?.[declaredOrdinal] ?? conditions.ids[declaredOrdinal],
      input: conditions.axis === 'numeric' ? conditions.inputValues![declaredOrdinal] : null,
      declaredOrdinal,
      displayOrdinal: displayIndex.get(declaredOrdinal)!,
      estimate,
      attemptedCount: attempted,
      sampleCount,
      retainedCount: retained,
      trimmedCount: trimmed,
      excludedCount: excluded,
      repeats: resultRows,
    });
  }

  const sortedRepeats = derivedConditions.flatMap((condition) => condition.repeats);
  return {
    ok: true,
    result: {
      axis: conditions.axis,
      inputScale: conditions.axis === 'numeric' ? conditions.inputScale ?? 'linear' : null,
      conditions: derivedConditions,
      sortedRepeats,
      attemptedCount,
      retainedCount,
      trimmedCount,
      excludedCount,
      conditionsWithoutEstimate,
      rawRepeatsSupplied,
    },
  };
}
