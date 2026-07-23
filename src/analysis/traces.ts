/** Deterministic preparation of trace observations before render geometry is chosen. */

import {
  conversionReceipt,
  compareExactUnitSumToValue,
  convertDifference,
  convertExactUnitSum,
  convert,
  dimensionOf,
  isKnownUnit,
  type ConversionReceipt,
} from '../core/units.js';
import {
  binary64RelativeDifferenceWithinEpsilons,
  exactBinary64AffineFraction,
  exactBinary64Mean,
  exactBinary64RatioToMean,
  exactBinary64Sum,
  exactBinary64SumUnits,
  roundedBinary64Mean,
} from '../core/exact-binary64.js';

export type TraceObservationKind = 'point_sample' | 'piecewise_constant';
export type TraceDuplicatePolicy = 'reject' | 'keep_replicates' | 'aggregate';
export type TraceAggregateMethod = 'mean' | 'median' | 'min' | 'max';

export interface TraceWindow {
  readonly start: number;
  readonly stop: number;
  readonly unit: string;
  readonly finalEdgeInclusive: boolean;
}

export interface TraceNormalization {
  readonly method: 'z_score' | 'min_max' | 'divide_by_baseline_mean';
  readonly statisticsWindow: TraceWindow;
}

export interface TraceSeriesInput {
  readonly id: string;
  readonly label: string;
  readonly observationKind: TraceObservationKind;
  readonly times: readonly number[];
  readonly timeUnit: string;
  readonly values: readonly (number | null)[];
  readonly valueUnit: string;
  readonly timeOffset?: { readonly value: number; readonly unit: string };
}

export interface PrepareTraceOptions {
  readonly window: TraceWindow;
  readonly duplicatePolicy?: TraceDuplicatePolicy;
  readonly aggregateMethod?: TraceAggregateMethod;
  readonly targetValueUnit?: string;
  readonly normalization?: TraceNormalization;
}

export interface PreparedTraceSeries {
  readonly id: string;
  readonly label: string;
  readonly observationKind: TraceObservationKind;
  readonly times: readonly number[];
  readonly values: readonly (number | null)[];
  readonly replicateCounts: readonly number[];
  /** One record per retained/drawn row, preserving its exact source lineage. */
  readonly observations: readonly PreparedTraceObservation[];
  readonly timeUnit: string;
  readonly valueUnit: string;
  readonly sourceTimeUnit: string;
  readonly sourceValueUnit: string;
  readonly inputCount: number;
  readonly outputCount: number;
  readonly excludedBelow: number;
  readonly excludedAbove: number;
  readonly missingCount: number;
  readonly duplicateGroups: number;
  readonly reordered: boolean;
  readonly timeConversion?: TraceUnitConversion;
  readonly valueConversion?: TraceUnitConversion;
  readonly timeOffset?: {
    readonly sourceValue: number;
    readonly sourceUnit: string;
    readonly displayValue: number;
    readonly displayUnit: string;
    readonly conversion: ConversionReceipt;
  };
  readonly normalization?: TraceNormalizationReceipt;
}

export type TraceUnitConversion = ConversionReceipt;

export interface TraceNormalizationReceipt {
  readonly method: TraceNormalization['method'];
  readonly statisticsWindow: TraceWindow;
  readonly basisCount: number;
  readonly center?: number;
  readonly sampleStandardDeviation?: number;
  readonly zCoordinateMode?: 'centered_difference' | 'scaled_value';
  readonly zCoordinateReference?: number;
  readonly zInputScale?: number;
  readonly zCoordinateMean?: number;
  readonly zCoordinateSampleStandardDeviation?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly baselineMean?: number;
  /** Exact basis sum as an integer multiple of 2^-1074. */
  readonly baselineSumMinSubnormalUnits?: string;
}

export interface PreparedTraceObservation {
  readonly recordedTime: number;
  readonly sourceValues: readonly (number | null)[];
  readonly sourceOrdinals: readonly number[];
  readonly time: number;
  readonly value: number | null;
  readonly replicateCount: number;
}

interface Sample {
  readonly sourceTime: number;
  readonly displayTime: number;
  readonly value: number | null;
  readonly sourceValues: readonly (number | null)[];
  readonly sourceOrdinals: readonly number[];
  readonly replicateCount: number;
}

/** A correctly rounded mean without an order-dependent or overflowing intermediate sum. */
function mean(values: readonly number[]): number {
  return exactBinary64Mean(values);
}

function aggregate(values: readonly (number | null)[], method: TraceAggregateMethod): number | null {
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (finite.length === 0) return null;
  switch (method) {
    case 'mean':
      return mean(finite);
    case 'min': {
      let result = finite[0];
      for (let i = 1; i < finite.length; i++) if (finite[i] < result) result = finite[i];
      return result === 0 ? 0 : result;
    }
    case 'max': {
      let result = finite[0];
      for (let i = 1; i < finite.length; i++) if (finite[i] > result) result = finite[i];
      return result === 0 ? 0 : result;
    }
    case 'median': {
      const ordered = [...finite].sort((a, b) => a - b);
      const middle = Math.floor(ordered.length / 2);
      const result = ordered.length % 2 === 1
        ? ordered[middle]
        : mean([ordered[middle - 1], ordered[middle]]);
      return result === 0 ? 0 : result;
    }
    default:
      throw new Error(`unknown trace aggregate method: ${String(method)}`);
  }
}

function convertWithoutInventing(value: number, from: string, to: string): number {
  return from === to ? value : convert(value, from, to);
}

function canonicalZero(value: number): number {
  return value === 0 ? 0 : value;
}

function insideWindow(value: number, window: TraceWindow): boolean {
  return value >= window.start && (window.finalEdgeInclusive ? value <= window.stop : value < window.stop);
}

function windowPosition(value: number, window: TraceWindow): -1 | 0 | 1 {
  if (value < window.start) return -1;
  if (window.finalEdgeInclusive ? value > window.stop : value >= window.stop) return 1;
  return 0;
}

function exactWindowPosition(
  sourceTime: number,
  sourceUnit: string,
  offset: TraceSeriesInput['timeOffset'],
  window: TraceWindow,
): -1 | 0 | 1 {
  const terms = [
    { value: sourceTime, unit: sourceUnit },
    ...(offset ? [{ value: offset.value, unit: offset.unit }] : []),
  ];
  const start = compareExactUnitSumToValue(terms, { value: window.start, unit: window.unit });
  if (start < 0) return -1;
  const stop = compareExactUnitSumToValue(terms, { value: window.stop, unit: window.unit });
  if (window.finalEdgeInclusive ? stop > 0 : stop >= 0) return 1;
  return 0;
}

/** Form `(value - center) / denominator` without overflowing the subtraction. */
function stableCenteredRatio(value: number, center: number, denominator: number): number {
  const directDifference = value - center;
  if (Number.isFinite(directDifference)) return directDifference / denominator;
  const magnitude = Math.max(Math.abs(value), Math.abs(center), Math.abs(denominator));
  if (magnitude === 0) return 0;
  return (value / magnitude - center / magnitude) / (denominator / magnitude);
}

function zCoordinateSystem(values: readonly number[]): {
  readonly mode: 'centered_difference' | 'scaled_value';
  readonly reference: number;
  readonly scale: number;
  readonly coordinates: readonly number[];
} {
  let reference = values[0];
  for (let index = 1; index < values.length; index++) {
    if (values[index] < reference) reference = values[index];
  }
  const differences = values.map((value) => value - reference);
  if (differences.every(Number.isFinite)) {
    let scale = 0;
    for (const difference of differences) scale = Math.max(scale, Math.abs(difference));
    if (scale > 0) {
      return {
        mode: 'centered_difference',
        reference,
        scale,
        coordinates: differences.map((difference) => difference / scale),
      };
    }
  }
  let scale = 0;
  for (const value of values) scale = Math.max(scale, Math.abs(value));
  if (!(scale > 0) || !Number.isFinite(scale)) {
    throw new Error('z_score requires distinct finite values');
  }
  return {
    mode: 'scaled_value',
    reference: 0,
    scale,
    coordinates: values.map((value) => value / scale),
  };
}

function zCoordinate(value: number, receipt: TraceNormalizationReceipt): number {
  const scale = receipt.zInputScale!;
  return receipt.zCoordinateMode === 'centered_difference'
    ? stableCenteredRatio(value, receipt.zCoordinateReference!, scale)
    : value / scale;
}

/**
 * Binary64 effects are judged relative to the effect itself, never to a large origin.
 * Eight unit roundoffs allow the add and subtract used to recover an applied displacement
 * while still rejecting a 10,000-unit declaration that becomes 16,384 at a large clock.
 */
const EFFECT_RELATIVE_EPSILON_MULTIPLES = 8;

export function binary64EffectWasPreserved(
  declared: number,
  applied: number,
  epsilonMultiples = EFFECT_RELATIVE_EPSILON_MULTIPLES,
): boolean {
  return binary64RelativeDifferenceWithinEpsilons(declared, applied, epsilonMultiples);
}

function assertStrictAffineOrdering(
  sourceValues: readonly number[],
  transformedValues: readonly number[],
  transformDifference?: (lowerSource: number, upperSource: number) => number,
  effectEpsilonMultiples = EFFECT_RELATIVE_EPSILON_MULTIPLES,
): void {
  if (sourceValues.length !== transformedValues.length) {
    throw new Error('trace affine transform source and output lengths differ');
  }
  const pairs = sourceValues.map((source, index) => ({ source, transformed: transformedValues[index] }));
  pairs.sort((a, b) => a.source - b.source || a.transformed - b.transformed);
  for (let index = 1; index < pairs.length; index++) {
    const previous = pairs[index - 1];
    const current = pairs[index];
    if (current.source > previous.source && !(current.transformed > previous.transformed)) {
      throw new Error('trace affine transform collapsed distinct values below binary64 resolution');
    }
    if (current.source > previous.source && transformDifference) {
      let expectedDifference: number;
      try {
        expectedDifference = transformDifference(previous.source, current.source);
      } catch (error) {
        if (error instanceof Error && error.message.includes('overflowed binary64')) continue;
        throw error;
      }
      const actualDifference = current.transformed - previous.transformed;
      if (
        !(expectedDifference > 0) ||
        !Number.isFinite(expectedDifference) ||
        !Number.isFinite(actualDifference) ||
        !binary64EffectWasPreserved(expectedDifference, actualDifference, effectEpsilonMultiples)
      ) {
        throw new Error('trace affine transform materially distorted distinct values at binary64 resolution');
      }
    }
  }
}

function assertNormalizationPostconditions(
  method: TraceNormalization['method'],
  basisValues: readonly number[],
  transformedBasis: readonly number[],
): void {
  assertStrictAffineOrdering(basisValues, transformedBasis);

  if (method === 'z_score') {
    const sum = exactBinary64Sum(transformedBasis);
    const sumSquares = exactBinary64Sum(transformedBasis.map((value) => value * value));
    const expectedSquares = transformedBasis.length - 1;
    // Correctly rounded z values obey these identities up to a small accumulation bound.
    // The bound grows with N but remains below 1e-8 at the contract maximum of 2e6 rows.
    const sumTolerance = 16 * Number.EPSILON * Math.sqrt(
      transformedBasis.length * Math.max(0, transformedBasis.length - 1),
    );
    const squareTolerance = 32 * Number.EPSILON * Math.max(1, expectedSquares);
    if (
      !Number.isFinite(sum) ||
      !Number.isFinite(sumSquares) ||
      Math.abs(sum) > Math.max(Number.MIN_VALUE, sumTolerance) ||
      Math.abs(sumSquares - expectedSquares) > squareTolerance
    ) {
      throw new Error('z_score normalization identities are unrepresentable at binary64 resolution');
    }
    return;
  }

  if (method === 'min_max') {
    let minimum = transformedBasis[0];
    let maximum = transformedBasis[0];
    for (let index = 1; index < transformedBasis.length; index++) {
      if (transformedBasis[index] < minimum) minimum = transformedBasis[index];
      if (transformedBasis[index] > maximum) maximum = transformedBasis[index];
    }
    if (minimum !== 0 || maximum !== 1) {
      throw new Error('min_max normalization endpoints are unrepresentable at binary64 resolution');
    }
    return;
  }

  const sum = exactBinary64Sum(transformedBasis);
  const tolerance = 16 * Number.EPSILON * transformedBasis.length;
  if (!Number.isFinite(sum) || Math.abs(sum - transformedBasis.length) > tolerance) {
    throw new Error('baseline normalization identity is unrepresentable at binary64 resolution');
  }
}

/** Apply the exact affine map recorded by a trace-normalization receipt. */
export function applyTraceNormalization(
  value: number,
  receipt: TraceNormalizationReceipt,
  dispersion = false,
): number {
  let result: number;
  if (receipt.method === 'z_score') {
    if (receipt.zInputScale && receipt.zCoordinateSampleStandardDeviation) {
      const coordinateDeviation = receipt.zCoordinateSampleStandardDeviation;
      result = dispersion
        ? (value / receipt.zInputScale) / coordinateDeviation
        : stableCenteredRatio(
          zCoordinate(value, receipt),
          receipt.zCoordinateMean!,
          coordinateDeviation,
        );
    } else {
      const deviation = receipt.sampleStandardDeviation!;
      result = dispersion
        ? value / deviation
        : stableCenteredRatio(value, receipt.center!, deviation);
    }
  } else if (receipt.method === 'min_max') {
    const minimum = receipt.minimum!;
    const maximum = receipt.maximum!;
    result = exactBinary64AffineFraction(
      value,
      dispersion ? 0 : minimum,
      minimum,
      maximum,
    );
  } else {
    result = receipt.baselineSumMinSubnormalUnits
      ? exactBinary64RatioToMean(
        value,
        receipt.baselineSumMinSubnormalUnits,
        receipt.basisCount,
      )
      : value / receipt.baselineMean!;
  }
  const collapsedNonZero = result === 0 && (
    dispersion
      ? value !== 0
      : receipt.method === 'z_score'
        ? receipt.zCoordinateMode
          ? zCoordinate(value, receipt) !== receipt.zCoordinateMean
          : value !== receipt.center
        : receipt.method === 'min_max'
          ? value !== receipt.minimum
          : value !== 0
  );
  if (!Number.isFinite(result) || collapsedNonZero) {
    throw new Error('trace normalization produced an unrepresentable binary64 value');
  }
  return result;
}

function normalizeValues(
  samples: readonly Sample[],
  normalization: TraceNormalization,
): { readonly values: readonly (number | null)[]; readonly receipt: TraceNormalizationReceipt } {
  const basis = samples
    .filter((sample) => insideWindow(sample.displayTime, normalization.statisticsWindow))
    .map((sample) => sample.value)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (normalization.method === 'z_score') {
    if (basis.length < 2) throw new Error('z_score requires at least two non-missing samples');
    const coordinateSystem = zCoordinateSystem(basis);
    const coordinateMean = roundedBinary64Mean(coordinateSystem.coordinates);
    const squared = exactBinary64Sum(coordinateSystem.coordinates.map((coordinate) => {
      const difference = coordinate - coordinateMean;
      return difference * difference;
    }));
    const coordinateDeviation = Math.sqrt(squared / (basis.length - 1));
    if (!(coordinateDeviation > 0) || !Number.isFinite(coordinateDeviation)) {
      throw new Error('z_score requires a positive finite sample standard deviation');
    }
    const center = roundedBinary64Mean(basis);
    const deviation = coordinateSystem.scale * coordinateDeviation;
    const receipt: TraceNormalizationReceipt = {
      method: normalization.method,
      statisticsWindow: normalization.statisticsWindow,
      basisCount: basis.length,
      center,
      ...(deviation > 0 && Number.isFinite(deviation) ? { sampleStandardDeviation: deviation } : {}),
      zCoordinateMode: coordinateSystem.mode,
      zCoordinateReference: coordinateSystem.reference,
      zInputScale: coordinateSystem.scale,
      zCoordinateMean: coordinateMean,
      zCoordinateSampleStandardDeviation: coordinateDeviation,
    };
    const values = samples.map((sample) =>
      sample.value === null ? null : applyTraceNormalization(sample.value, receipt));
    assertStrictAffineOrdering(
      samples.filter((sample) => sample.value !== null).map((sample) => sample.value as number),
      values.filter((value): value is number => value !== null),
    );
    const transformedBasis = samples
      .map((sample, index) => ({ sample, value: values[index] }))
      .filter((entry) =>
        insideWindow(entry.sample.displayTime, normalization.statisticsWindow) &&
        entry.sample.value !== null &&
        entry.value !== null,
      )
      .map((entry) => entry.value as number);
    assertNormalizationPostconditions(normalization.method, basis, transformedBasis);
    return {
      values,
      receipt,
    };
  }

  if (normalization.method === 'min_max') {
    if (basis.length < 1) throw new Error('min_max requires a non-missing statistics sample');
    let minimum = basis[0];
    let maximum = basis[0];
    for (let i = 1; i < basis.length; i++) {
      if (basis[i] < minimum) minimum = basis[i];
      if (basis[i] > maximum) maximum = basis[i];
    }
    const magnitude = Math.max(Math.abs(minimum), Math.abs(maximum));
    const normalizedMinimum = magnitude === 0 ? 0 : minimum / magnitude;
    const normalizedMaximum = magnitude === 0 ? 0 : maximum / magnitude;
    const normalizedSpan = normalizedMaximum - normalizedMinimum;
    if (!(normalizedSpan > 0) || !Number.isFinite(normalizedSpan)) {
      throw new Error('min_max requires distinct finite extrema');
    }
    const receipt: TraceNormalizationReceipt = {
      method: normalization.method,
      statisticsWindow: normalization.statisticsWindow,
      basisCount: basis.length,
      minimum,
      maximum,
    };
    const values = samples.map((sample) =>
      sample.value === null ? null : applyTraceNormalization(sample.value, receipt));
    assertStrictAffineOrdering(
      samples.filter((sample) => sample.value !== null).map((sample) => sample.value as number),
      values.filter((value): value is number => value !== null),
    );
    const transformedBasis = samples
      .map((sample, index) => ({ sample, value: values[index] }))
      .filter((entry) =>
        insideWindow(entry.sample.displayTime, normalization.statisticsWindow) &&
        entry.sample.value !== null &&
        entry.value !== null,
      )
      .map((entry) => entry.value as number);
    assertNormalizationPostconditions(normalization.method, basis, transformedBasis);
    return {
      values,
      receipt,
    };
  }

  if (basis.length < 1) throw new Error('baseline normalization requires a non-missing sample');
  const baselineSumMinSubnormalUnits = exactBinary64SumUnits(basis);
  if (BigInt(baselineSumMinSubnormalUnits) <= 0n) {
    throw new Error('baseline normalization requires a strictly positive finite mean');
  }
  const baseline = roundedBinary64Mean(basis);
  const receipt: TraceNormalizationReceipt = {
    method: normalization.method,
    statisticsWindow: normalization.statisticsWindow,
    basisCount: basis.length,
    ...(baseline > 0 && Number.isFinite(baseline) ? { baselineMean: baseline } : {}),
    baselineSumMinSubnormalUnits,
  };
  const values = samples.map((sample) =>
    sample.value === null ? null : applyTraceNormalization(sample.value, receipt));
  assertStrictAffineOrdering(
    samples.filter((sample) => sample.value !== null).map((sample) => sample.value as number),
    values.filter((value): value is number => value !== null),
  );
  const transformedBasis = samples
    .map((sample, index) => ({ sample, value: values[index] }))
    .filter((entry) =>
      insideWindow(entry.sample.displayTime, normalization.statisticsWindow) &&
      entry.sample.value !== null &&
      entry.value !== null,
    )
    .map((entry) => entry.value as number);
  assertNormalizationPostconditions(normalization.method, basis, transformedBasis);
  return {
    values,
    receipt,
  };
}

/**
 * Sort, resolve duplicates, convert units, apply an optional declared normalization, and
 * filter one trace to its declared display window. This function never interpolates.
 */
export function prepareTraceSeries(
  input: TraceSeriesInput,
  options: PrepareTraceOptions,
): PreparedTraceSeries {
  if (input.observationKind !== 'point_sample' && input.observationKind !== 'piecewise_constant') {
    throw new Error(`unknown trace observation kind: ${String(input.observationKind)}`);
  }
  if (
    options.duplicatePolicy !== undefined &&
    options.duplicatePolicy !== 'reject' &&
    options.duplicatePolicy !== 'keep_replicates' &&
    options.duplicatePolicy !== 'aggregate'
  ) {
    throw new Error(`unknown trace duplicate policy: ${String(options.duplicatePolicy)}`);
  }
  if (
    options.aggregateMethod !== undefined &&
    !['mean', 'median', 'min', 'max'].includes(options.aggregateMethod)
  ) {
    throw new Error(`unknown trace aggregate method: ${String(options.aggregateMethod)}`);
  }
  if (
    options.normalization &&
    !['z_score', 'min_max', 'divide_by_baseline_mean'].includes(options.normalization.method)
  ) {
    throw new Error(`unknown trace normalization method: ${String(options.normalization.method)}`);
  }
  if (input.times.length !== input.values.length) {
    throw new Error('trace time and value arrays must have equal length');
  }
  if (
    !Number.isFinite(options.window.start) ||
    !Number.isFinite(options.window.stop) ||
    !(options.window.stop > options.window.start)
  ) {
    throw new Error('trace window must have finite increasing endpoints');
  }
  if (
    options.normalization &&
    (
      !Number.isFinite(options.normalization.statisticsWindow.start) ||
      !Number.isFinite(options.normalization.statisticsWindow.stop) ||
      !(options.normalization.statisticsWindow.stop > options.normalization.statisticsWindow.start)
    )
  ) {
    throw new Error('trace normalization statistics window must have finite increasing endpoints');
  }
  if (
    !isKnownUnit(input.timeUnit) ||
    !isKnownUnit(options.window.unit) ||
    dimensionOf(input.timeUnit) !== 'time' ||
    dimensionOf(options.window.unit) !== 'time'
  ) {
    throw new Error('trace time and display-window units must be registered time units');
  }
  if (!isKnownUnit(input.valueUnit)) {
    throw new Error('trace value unit must be registered');
  }
  if (options.targetValueUnit !== undefined && !isKnownUnit(options.targetValueUnit)) {
    throw new Error('trace target value unit must be registered');
  }
  if (
    input.timeOffset &&
    (
      !Number.isFinite(input.timeOffset.value) ||
      !isKnownUnit(input.timeOffset.unit) ||
      dimensionOf(input.timeOffset.unit) !== 'time'
    )
  ) {
    throw new Error('trace clock offset must be finite and use a registered time unit');
  }
  if (
    options.normalization &&
    options.normalization.statisticsWindow.unit !== options.window.unit
  ) {
    throw new Error('trace normalization statistics window must use the prepared display-time unit');
  }

  const offset = input.timeOffset
    ? canonicalZero(
      convertWithoutInventing(input.timeOffset.value, input.timeOffset.unit, options.window.unit),
    )
    : 0;
  const ordered = input.times.map((sourceTime, ordinal) => {
    const rawSourceValue = input.values[ordinal];
    if (!Number.isFinite(sourceTime)) throw new Error('trace timestamps must be finite');
    if (rawSourceValue !== null && !Number.isFinite(rawSourceValue)) {
      throw new Error('trace values must be finite or null');
    }
    const canonicalSourceTime = canonicalZero(sourceTime);
    const sourceValue = rawSourceValue === null ? null : canonicalZero(rawSourceValue);
    const convertedTime = canonicalZero(
      convertWithoutInventing(canonicalSourceTime, input.timeUnit, options.window.unit),
    );
    const displayTime = input.timeOffset
      ? canonicalZero(convertExactUnitSum([
        { value: canonicalSourceTime, unit: input.timeUnit },
        { value: canonicalZero(input.timeOffset.value), unit: input.timeOffset.unit },
      ], options.window.unit))
      : convertedTime;
    if (!Number.isFinite(displayTime)) throw new Error('trace clock conversion produced a non-finite time');
    if (offset !== 0) {
      const appliedOffset = displayTime - convertedTime;
      if (!Number.isFinite(appliedOffset) || !binary64EffectWasPreserved(offset, appliedOffset)) {
        throw new Error('trace clock offset is distorted below binary64 resolution at this timestamp');
      }
    }
    const hasNonzeroOffset = input.timeOffset !== undefined && input.timeOffset.value !== 0;
    if (input.timeUnit !== options.window.unit || hasNonzeroOffset) {
      const exactDisplayPosition = exactWindowPosition(
        canonicalSourceTime,
        input.timeUnit,
        input.timeOffset,
        options.window,
      );
      if (exactDisplayPosition !== windowPosition(displayTime, options.window)) {
        throw new Error('trace timestamp rounds across a display-window boundary at binary64 resolution');
      }
    }
    if (
      options.normalization &&
      (input.timeUnit !== options.normalization.statisticsWindow.unit || hasNonzeroOffset)
    ) {
      const exactStatisticsPosition = exactWindowPosition(
        canonicalSourceTime,
        input.timeUnit,
        input.timeOffset,
        options.normalization.statisticsWindow,
      );
      if (
        exactStatisticsPosition !==
        windowPosition(displayTime, options.normalization.statisticsWindow)
      ) {
        throw new Error('trace timestamp rounds across a statistics-window boundary at binary64 resolution');
      }
    }
    return {
      sourceTime: canonicalSourceTime,
      convertedTime,
      displayTime,
      value: sourceValue,
      sourceValues: [sourceValue] as readonly (number | null)[],
      sourceOrdinals: [ordinal] as readonly number[],
      ordinal,
    };
  }).sort((a, b) => a.sourceTime - b.sourceTime || a.ordinal - b.ordinal);

  assertStrictAffineOrdering(
    ordered.map((sample) => sample.sourceTime),
    ordered.map((sample) => sample.convertedTime),
    (lower, upper) => convertDifference(lower, upper, input.timeUnit, options.window.unit),
  );
  assertStrictAffineOrdering(
    ordered.map((sample) => sample.convertedTime),
    ordered.map((sample) => sample.displayTime),
    (lower, upper) => convertDifference(lower, upper, options.window.unit, options.window.unit),
  );

  const resolved: Sample[] = [];
  const reordered = ordered.some((sample, index) => sample.ordinal !== index);
  let duplicateGroups = 0;
  for (let start = 0; start < ordered.length;) {
    let stop = start + 1;
    // Strict numeric equality deliberately treats -0 and +0 as the same scientific time,
    // matching canonical JSON and every downstream numeric comparison.
    while (stop < ordered.length && ordered[stop].sourceTime === ordered[start].sourceTime) stop++;
    const count = stop - start;
    if (count > 1) {
      duplicateGroups++;
      if (options.duplicatePolicy === undefined || options.duplicatePolicy === 'reject') {
        throw new Error(`duplicate trace timestamp ${ordered[start].sourceTime} was rejected`);
      }
      if (options.duplicatePolicy === 'aggregate') {
        if (!options.aggregateMethod) throw new Error('duplicate aggregation needs a declared method');
        resolved.push({
          sourceTime: ordered[start].sourceTime,
          displayTime: ordered[start].displayTime,
          value: aggregate(ordered.slice(start, stop).map((sample) => sample.value), options.aggregateMethod),
          sourceValues: ordered.slice(start, stop).flatMap((sample) => sample.sourceValues),
          sourceOrdinals: ordered.slice(start, stop).flatMap((sample) => sample.sourceOrdinals),
          replicateCount: count,
        });
        start = stop;
        continue;
      }
    }
    for (let index = start; index < stop; index++) {
      resolved.push({
        sourceTime: ordered[index].sourceTime,
        displayTime: ordered[index].displayTime,
        value: ordered[index].value,
        sourceValues: ordered[index].sourceValues,
        sourceOrdinals: ordered[index].sourceOrdinals,
        replicateCount: 1,
      });
    }
    start = stop;
  }

  // A unit conversion must not collapse two distinct source times into one displayed time.
  for (let index = 1; index < resolved.length; index++) {
    const previous = resolved[index - 1];
    const current = resolved[index];
    if (current.sourceTime !== previous.sourceTime && current.displayTime === previous.displayTime) {
      throw new Error('time-unit conversion collapsed two distinct source timestamps');
    }
  }

  const targetUnit = options.normalization
    ? '1'
    : (options.targetValueUnit ?? input.valueUnit);
  const converted = resolved.map((sample): Sample => ({
    ...sample,
    value:
      sample.value === null || options.normalization
        ? sample.value
        : convertWithoutInventing(sample.value, input.valueUnit, targetUnit),
  }));
  if (!options.normalization) {
    assertStrictAffineOrdering(
      resolved.filter((sample) => sample.value !== null).map((sample) => sample.value as number),
      converted.filter((sample) => sample.value !== null).map((sample) => sample.value as number),
      (lower, upper) => input.valueUnit === targetUnit
        ? exactBinary64Sum([upper, -lower])
        : convertDifference(lower, upper, input.valueUnit, targetUnit),
    );
  }
  const normalizationResult = options.normalization
    ? normalizeValues(converted, options.normalization)
    : { values: converted.map((sample) => sample.value), receipt: undefined };

  const retained: Sample[] = [];
  let excludedBelow = 0;
  let excludedAbove = 0;
  for (let index = 0; index < converted.length; index++) {
    const sample = { ...converted[index], value: normalizationResult.values[index] };
    if (sample.displayTime < options.window.start) excludedBelow += sample.replicateCount;
    else if (!insideWindow(sample.displayTime, options.window)) excludedAbove += sample.replicateCount;
    else retained.push(sample);
  }

  return {
    id: input.id,
    label: input.label,
    observationKind: input.observationKind,
    times: retained.map((sample) => sample.displayTime),
    values: retained.map((sample) => sample.value),
    replicateCounts: retained.map((sample) => sample.replicateCount),
    observations: retained.map((sample) => ({
      recordedTime: sample.sourceTime,
      sourceValues: sample.sourceValues,
      sourceOrdinals: sample.sourceOrdinals,
      time: sample.displayTime,
      value: sample.value,
      replicateCount: sample.replicateCount,
    })),
    timeUnit: options.window.unit,
    valueUnit: targetUnit,
    sourceTimeUnit: input.timeUnit,
    sourceValueUnit: input.valueUnit,
    inputCount: input.times.length,
    outputCount: retained.length,
    excludedBelow,
    excludedAbove,
    missingCount: retained.reduce(
      (count, sample) => count + sample.sourceValues.filter((value) => value === null).length,
      0,
    ),
    duplicateGroups,
    reordered,
    ...(input.timeUnit !== options.window.unit
      ? {
        timeConversion: {
          ...conversionReceipt(input.timeUnit, options.window.unit),
        },
      }
      : {}),
    ...(!options.normalization && input.valueUnit !== targetUnit
      ? {
        valueConversion: {
          ...conversionReceipt(input.valueUnit, targetUnit),
        },
      }
      : {}),
    ...(input.timeOffset
      ? {
        timeOffset: {
          sourceValue: canonicalZero(input.timeOffset.value),
          sourceUnit: input.timeOffset.unit,
          displayValue: offset,
          displayUnit: options.window.unit,
          conversion: conversionReceipt(input.timeOffset.unit, options.window.unit),
        },
      }
      : {}),
    ...(normalizationResult.receipt ? { normalization: normalizationResult.receipt } : {}),
  };
}
