/**
 * Request-only OutputAuthority evaluators for the four trace families.
 *
 * This module is intentionally independent of `analysis/traces`, every figure compiler,
 * RenderPlan, artifacts, and derivation receipts.  It reconstructs the accepted rows and
 * scientific-carrier sequence directly from the validated canonical request.  The only
 * shared arithmetic below is contract infrastructure: registered unit conversion,
 * canonical JSON, and exact binary64 primitives.
 */

import { canonicalize } from '../../core/canonicalize.js';
import {
  exactBinary64AffineFraction,
  exactBinary64EmpiricalQuantileType7,
  exactBinary64Mean,
  exactBinary64RatioToMean,
  exactBinary64SampleStandardDeviation,
  exactBinary64Sum,
  exactBinary64SumUnits,
  exactBinary64WeightedMean,
  exactBinary64WeightedSum,
  roundedBinary64Mean,
} from '../../core/exact-binary64.js';
import type {
  AuthorityCellV1,
  AuthorityGeometryEntryV1,
  AuthoritySummaryScalarV1,
  RegisteredAuthorityEvaluatorV1,
} from '../../core/output-authority.js';
import type { DisclosureFacts } from '../../core/disclosures.js';
import type { JsonValue } from '../../core/parse-json.js';
import {
  convert,
  convertExactUnitSum,
  conversionFactor,
  dimensionOf,
} from '../../core/units.js';
import {
  authorityEvaluatorId,
  carrier,
  defineAuthorityEvaluator,
  disclosureFactMap,
  geometrySequence,
  rowSequence,
  summaryFactMap,
} from './model.js';

type JsonRecord = Record<string, JsonValue>;
type Cell = AuthorityCellV1;
type DuplicatePolicy = 'reject' | 'keep_replicates' | 'aggregate';
type AggregateMethod = 'mean' | 'median' | 'min' | 'max';
type ObservationKind = 'point_sample' | 'piecewise_constant';

interface WindowV1 {
  readonly start: number;
  readonly stop: number;
  readonly unit: string;
  readonly finalEdgeInclusive: boolean;
}

interface IndependentObservation {
  readonly recordedTime: number;
  readonly sourceValues: readonly (number | null)[];
  readonly sourceOrdinals: readonly number[];
  readonly time: number;
  readonly value: number | null;
  readonly replicateCount: number;
}

interface NormalizationReceiptV1 {
  readonly method: 'z_score' | 'min_max' | 'divide_by_baseline_mean';
  readonly statisticsWindow: WindowV1;
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
  readonly baselineSumMinSubnormalUnits?: string;
}

interface IndependentTrace {
  readonly id: string;
  readonly label: string;
  readonly observationKind: ObservationKind;
  readonly observations: readonly IndependentObservation[];
  readonly times: readonly number[];
  readonly values: readonly (number | null)[];
  readonly sourceTimeUnit: string;
  readonly sourceValueUnit: string;
  readonly timeUnit: string;
  readonly valueUnit: string;
  readonly excludedBelow: number;
  readonly excludedAbove: number;
  readonly duplicateGroups: number;
  readonly normalization?: NormalizationReceiptV1;
  readonly timeOffset?: {
    readonly sourceValue: number;
    readonly sourceUnit: string;
  };
}

interface TraceInputV1 {
  readonly id: string;
  readonly label: string;
  readonly observationKind: ObservationKind;
  readonly times: readonly number[];
  readonly timeUnit: string;
  readonly values: readonly (number | null)[];
  readonly valueUnit: string;
  readonly timeOffset?: { readonly value: number; readonly unit: string };
}

interface PrepareOptionsV1 {
  readonly window: WindowV1;
  readonly duplicatePolicy?: DuplicatePolicy;
  readonly aggregateMethod?: AggregateMethod;
  readonly targetValueUnit?: string;
  readonly normalization?: {
    readonly method: NormalizationReceiptV1['method'];
    readonly statisticsWindow: WindowV1;
  };
}

interface IndependentSeriesView {
  readonly raw: JsonRecord;
  readonly trace: IndependentTrace;
  readonly sourceIndex: number;
  readonly uncertainty?: JsonRecord;
  readonly panelId?: string;
  readonly aggregate?: boolean;
  readonly renderRuns?: readonly IndependentRenderRun[];
  readonly markerObservationIndexes?: readonly number[];
}

interface IndependentPanel {
  readonly id: string;
  readonly series: readonly IndependentSeriesView[];
}

interface IndependentRenderRun {
  readonly vertices: readonly {
    readonly time: number;
    readonly value: number;
    readonly provenance: JsonValue;
  }[];
}

function record(value: JsonValue | undefined): JsonRecord {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: JsonValue | undefined): JsonValue[] {
  return Array.isArray(value) ? value : [];
}

function numberArray(value: JsonValue | undefined): number[] {
  return array(value).map((entry) => Number(entry));
}

function nullableNumberArray(value: JsonValue | undefined): (number | null)[] {
  return array(value).map((entry) => entry === null ? null : Number(entry));
}

function stringArray(value: JsonValue | undefined): string[] {
  return array(value).map(String);
}

function canonicalZero(value: number): number {
  return value === 0 ? 0 : value;
}

/** Iterative extrema avoid an argument-vector allocation at request budget scale. */
function sequenceMinimum(values: readonly number[]): number {
  if (values.length === 0) throw new Error('minimum of an empty sequence is undefined');
  let result = values[0];
  for (let index = 1; index < values.length; index++) result = Math.min(result, values[index]);
  return result;
}

function sequenceMaximum(values: readonly number[]): number {
  if (values.length === 0) throw new Error('maximum of an empty sequence is undefined');
  let result = values[0];
  for (let index = 1; index < values.length; index++) result = Math.max(result, values[index]);
  return result;
}

function sequenceMaximumAbsolute(values: readonly number[]): number {
  if (values.length === 0) throw new Error('maximum magnitude of an empty sequence is undefined');
  let result = Math.abs(values[0]);
  for (let index = 1; index < values.length; index++) result = Math.max(result, Math.abs(values[index]));
  return result;
}

function windowFrom(value: JsonValue | undefined, targetUnit?: string): WindowV1 {
  const source = record(value);
  const sourceUnit = String(source.unit);
  const unit = targetUnit ?? sourceUnit;
  return {
    start: sourceUnit === unit ? Number(source.start) : convert(Number(source.start), sourceUnit, unit),
    stop: sourceUnit === unit ? Number(source.stop) : convert(Number(source.stop), sourceUnit, unit),
    unit,
    finalEdgeInclusive: typeof source.boundary === 'string' && source.boundary.endsWith(']'),
  };
}

function inWindow(value: number, window: WindowV1): boolean {
  return value >= window.start && (window.finalEdgeInclusive ? value <= window.stop : value < window.stop);
}

function duplicateOptions(parameters: JsonRecord): {
  readonly duplicatePolicy?: DuplicatePolicy;
  readonly aggregateMethod?: AggregateMethod;
} {
  const node = parameters.duplicateTimePolicy;
  const structured = record(node);
  const duplicatePolicy = (typeof node === 'string' ? node : structured.policy) as DuplicatePolicy | undefined;
  const nestedAggregate = structured.aggregate;
  const aggregateMethod = (
    parameters.aggregateMethod ??
    parameters.duplicateTimeAggregate ??
    structured.method ??
    (typeof nestedAggregate === 'string' ? nestedAggregate : record(nestedAggregate).method)
  ) as AggregateMethod | undefined;
  return {
    ...(duplicatePolicy === undefined ? {} : { duplicatePolicy }),
    ...(aggregateMethod === undefined ? {} : { aggregateMethod }),
  };
}

function independentAggregate(values: readonly (number | null)[], method: AggregateMethod): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  if (method === 'mean') return canonicalZero(exactBinary64Mean(present));
  if (method === 'min') return canonicalZero(sequenceMinimum(present));
  if (method === 'max') return canonicalZero(sequenceMaximum(present));
  const sorted = [...present].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return canonicalZero(sorted.length % 2 === 1
    ? sorted[middle]
    : exactBinary64Mean([sorted[middle - 1], sorted[middle]]));
}

function stableCenteredRatio(value: number, center: number, denominator: number): number {
  const direct = value - center;
  if (Number.isFinite(direct)) return direct / denominator;
  const scale = Math.max(Math.abs(value), Math.abs(center), Math.abs(denominator));
  return (value / scale - center / scale) / (denominator / scale);
}

function zCoordinates(values: readonly number[]): {
  readonly mode: 'centered_difference' | 'scaled_value';
  readonly reference: number;
  readonly scale: number;
  readonly values: readonly number[];
} {
  const reference = sequenceMinimum(values);
  const differences = values.map((value) => value - reference);
  const differenceScale = sequenceMaximumAbsolute(differences);
  if (differenceScale > 0 && Number.isFinite(differenceScale) && differences.every(Number.isFinite)) {
    return {
      mode: 'centered_difference',
      reference,
      scale: differenceScale,
      values: differences.map((value) => value / differenceScale),
    };
  }
  const scale = sequenceMaximumAbsolute(values);
  return {
    mode: 'scaled_value',
    reference: 0,
    scale,
    values: values.map((value) => value / scale),
  };
}

function normalizeValue(
  value: number,
  receipt: NormalizationReceiptV1,
  dispersion = false,
): number {
  if (receipt.method === 'z_score') {
    if (receipt.zInputScale && receipt.zCoordinateSampleStandardDeviation) {
      if (dispersion) {
        return (value / receipt.zInputScale) / receipt.zCoordinateSampleStandardDeviation;
      }
      const coordinate = receipt.zCoordinateMode === 'centered_difference'
        ? stableCenteredRatio(value, receipt.zCoordinateReference!, receipt.zInputScale)
        : value / receipt.zInputScale;
      return stableCenteredRatio(
        coordinate,
        receipt.zCoordinateMean!,
        receipt.zCoordinateSampleStandardDeviation,
      );
    }
    return dispersion
      ? value / receipt.sampleStandardDeviation!
      : stableCenteredRatio(value, receipt.center!, receipt.sampleStandardDeviation!);
  }
  if (receipt.method === 'min_max') {
    return exactBinary64AffineFraction(
      value,
      dispersion ? 0 : receipt.minimum!,
      receipt.minimum!,
      receipt.maximum!,
    );
  }
  return receipt.baselineSumMinSubnormalUnits
    ? exactBinary64RatioToMean(value, receipt.baselineSumMinSubnormalUnits, receipt.basisCount)
    : value / receipt.baselineMean!;
}

function normalizeSamples(
  observations: readonly IndependentObservation[],
  declaration: NonNullable<PrepareOptionsV1['normalization']>,
): { readonly values: readonly (number | null)[]; readonly receipt: NormalizationReceiptV1 } {
  const basis = observations
    .filter((observation) => inWindow(observation.time, declaration.statisticsWindow))
    .map((observation) => observation.value)
    .filter((value): value is number => value !== null);
  if (declaration.method === 'z_score') {
    const coordinate = zCoordinates(basis);
    const coordinateMean = roundedBinary64Mean(coordinate.values);
    const sumSquares = exactBinary64Sum(coordinate.values.map((value) => {
      const difference = value - coordinateMean;
      return difference * difference;
    }));
    const coordinateDeviation = Math.sqrt(sumSquares / (basis.length - 1));
    const deviation = coordinate.scale * coordinateDeviation;
    const receipt: NormalizationReceiptV1 = {
      method: declaration.method,
      statisticsWindow: declaration.statisticsWindow,
      basisCount: basis.length,
      center: roundedBinary64Mean(basis),
      ...(deviation > 0 && Number.isFinite(deviation) ? { sampleStandardDeviation: deviation } : {}),
      zCoordinateMode: coordinate.mode,
      zCoordinateReference: coordinate.reference,
      zInputScale: coordinate.scale,
      zCoordinateMean: coordinateMean,
      zCoordinateSampleStandardDeviation: coordinateDeviation,
    };
    return {
      receipt,
      values: observations.map((observation) =>
        observation.value === null ? null : normalizeValue(observation.value, receipt)),
    };
  }
  if (declaration.method === 'min_max') {
    const receipt: NormalizationReceiptV1 = {
      method: declaration.method,
      statisticsWindow: declaration.statisticsWindow,
      basisCount: basis.length,
      minimum: sequenceMinimum(basis),
      maximum: sequenceMaximum(basis),
    };
    return {
      receipt,
      values: observations.map((observation) =>
        observation.value === null ? null : normalizeValue(observation.value, receipt)),
    };
  }
  const units = exactBinary64SumUnits(basis);
  const mean = roundedBinary64Mean(basis);
  const receipt: NormalizationReceiptV1 = {
    method: declaration.method,
    statisticsWindow: declaration.statisticsWindow,
    basisCount: basis.length,
    ...(mean > 0 && Number.isFinite(mean) ? { baselineMean: mean } : {}),
    baselineSumMinSubnormalUnits: units,
  };
  return {
    receipt,
    values: observations.map((observation) =>
      observation.value === null ? null : normalizeValue(observation.value, receipt)),
  };
}

function prepareIndependentTrace(input: TraceInputV1, options: PrepareOptionsV1): IndependentTrace {
  const sorted = input.times.map((rawTime, ordinal) => {
    const recordedTime = canonicalZero(rawTime);
    const sourceValue = input.values[ordinal];
    const convertedTime = input.timeUnit === options.window.unit
      ? recordedTime
      : convert(recordedTime, input.timeUnit, options.window.unit);
    const time = input.timeOffset
      ? convertExactUnitSum([
        { value: recordedTime, unit: input.timeUnit },
        { value: canonicalZero(input.timeOffset.value), unit: input.timeOffset.unit },
      ], options.window.unit)
      : convertedTime;
    return {
      recordedTime,
      time: canonicalZero(time),
      sourceValue: sourceValue === null ? null : canonicalZero(sourceValue),
      ordinal,
    };
  }).sort((left, right) => left.recordedTime - right.recordedTime || left.ordinal - right.ordinal);

  const resolved: IndependentObservation[] = [];
  let duplicateGroups = 0;
  for (let first = 0; first < sorted.length;) {
    let after = first + 1;
    while (after < sorted.length && sorted[after].recordedTime === sorted[first].recordedTime) after++;
    const tied = sorted.slice(first, after);
    if (tied.length > 1) duplicateGroups++;
    if (tied.length > 1 && options.duplicatePolicy === 'aggregate') {
      resolved.push({
        recordedTime: tied[0].recordedTime,
        time: tied[0].time,
        sourceValues: tied.map((entry) => entry.sourceValue),
        sourceOrdinals: tied.map((entry) => entry.ordinal),
        value: independentAggregate(tied.map((entry) => entry.sourceValue), options.aggregateMethod!),
        replicateCount: tied.length,
      });
    } else {
      for (const entry of tied) {
        resolved.push({
          recordedTime: entry.recordedTime,
          time: entry.time,
          sourceValues: [entry.sourceValue],
          sourceOrdinals: [entry.ordinal],
          value: entry.sourceValue,
          replicateCount: 1,
        });
      }
    }
    first = after;
  }

  const targetValueUnit = options.normalization ? '1' : (options.targetValueUnit ?? input.valueUnit);
  const converted = resolved.map((observation): IndependentObservation => ({
    ...observation,
    value: observation.value === null || options.normalization || input.valueUnit === targetValueUnit
      ? observation.value
      : canonicalZero(convert(observation.value, input.valueUnit, targetValueUnit)),
  }));
  const normalized = options.normalization
    ? normalizeSamples(converted, options.normalization)
    : undefined;
  const transformed = converted.map((observation, index): IndependentObservation => ({
    ...observation,
    value: normalized ? normalized.values[index] : observation.value,
  }));
  let excludedBelow = 0;
  let excludedAbove = 0;
  const retained: IndependentObservation[] = [];
  for (const observation of transformed) {
    if (observation.time < options.window.start) excludedBelow += observation.replicateCount;
    else if (!inWindow(observation.time, options.window)) excludedAbove += observation.replicateCount;
    else retained.push(observation);
  }
  return {
    id: input.id,
    label: input.label,
    observationKind: input.observationKind,
    observations: retained,
    times: retained.map((observation) => observation.time),
    values: retained.map((observation) => observation.value),
    sourceTimeUnit: input.timeUnit,
    sourceValueUnit: input.valueUnit,
    timeUnit: options.window.unit,
    valueUnit: targetValueUnit,
    excludedBelow,
    excludedAbove,
    duplicateGroups,
    ...(normalized ? { normalization: normalized.receipt } : {}),
    ...(input.timeOffset
      ? { timeOffset: { sourceValue: canonicalZero(input.timeOffset.value), sourceUnit: input.timeOffset.unit } }
      : {}),
  };
}

function traceCell(values: readonly (string | number | null)[]): Cell {
  return values.length === 1 ? values[0] : JSON.stringify(values);
}

function structuredCell(value: JsonValue | undefined): Cell {
  return value === undefined ? null : canonicalize(value);
}

/** Closed, bounded NetworkScope projection for synaptic-weight authority. */
function weightTraceScopeSummaryCell(value: JsonValue | undefined): string {
  const scope = record(value);
  const summary: JsonRecord = { kind: String(scope.kind) };
  if (scope.snapshotTime !== undefined) summary.snapshotTime = scope.snapshotTime;
  switch (scope.kind) {
    case 'single_process':
      break;
    case 'global_merged':
      summary.mergedRanksCoverage = 'all_ranks_0_through_worldSize_minus_1';
      summary.worldSize = scope.worldSize!;
      break;
    case 'mpi_target_rank_local':
      summary.localTargetUniverseComplete = scope.localTargetUniverseComplete!;
      summary.rank = scope.rank!;
      summary.worldSize = scope.worldSize!;
      break;
    case 'sampled':
      summary.method = scope.method!;
      summary.parentScope = scope.parentScope!;
      summary.retainedConnectionCount = scope.retainedConnectionCount!;
      summary.sourceConnectionCount = scope.sourceConnectionCount!;
      break;
    default:
      throw new Error(`unsupported NetworkScope kind ${String(scope.kind)}`);
  }
  return canonicalize(summary);
}

function uncertaintyCells(
  uncertainty: JsonRecord | undefined,
  sourceOrdinal: number | undefined,
  trace: IndependentTrace,
  displayedValue: number | null,
): readonly [number | null, number | null, string | null] {
  const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : undefined;
  if (!kind || kind === 'none' || sourceOrdinal === undefined) {
    const reason = typeof uncertainty?.reason === 'string' ? uncertainty.reason : undefined;
    return [null, null, kind === 'none' ? `none${reason ? ` (${reason})` : ''}` : null];
  }
  const declared = uncertainty as JsonRecord;
  const sourceUnit = typeof declared.unit === 'string' ? declared.unit : trace.valueUnit;
  const transform = (value: JsonValue | undefined, dispersion: boolean): number | null => {
    if (typeof value !== 'number') return null;
    if (!trace.normalization) {
      return sourceUnit === trace.valueUnit ? value : convert(value, sourceUnit, trace.valueUnit);
    }
    const source = sourceUnit === trace.sourceValueUnit
      ? value
      : convert(value, sourceUnit, trace.sourceValueUnit);
    return normalizeValue(source, trace.normalization, dispersion);
  };
  const sampleCount = array(declared.sampleCount)[sourceOrdinal];
  const extra: string[] = [];
  if (kind === 'standard_deviation' || kind === 'standard_error') {
    extra.push(`basis=${String(declared.basis ?? 'unspecified')}`);
    if (typeof sampleCount === 'number') extra.push(`sampleCount=${sampleCount}`);
    const dispersion = transform(array(declared.values)[sourceOrdinal], true);
    const description = [kind, ...extra].join('; ');
    return displayedValue === null || dispersion === null
      ? [null, null, description]
      : [displayedValue - dispersion, displayedValue + dispersion, description];
  }
  const lower = transform(array(declared.lower)[sourceOrdinal], false);
  const upper = transform(array(declared.upper)[sourceOrdinal], false);
  if (typeof declared.method === 'string') extra.push(`method=${declared.method}`);
  if (typeof declared.level === 'number') extra.push(`level=${declared.level}`);
  if (typeof declared.coverage === 'string') extra.push(`coverage=${declared.coverage}`);
  if (typeof declared.lowerQuantile === 'number') extra.push(`lowerQuantile=${declared.lowerQuantile}`);
  if (typeof declared.upperQuantile === 'number') extra.push(`upperQuantile=${declared.upperQuantile}`);
  if (typeof declared.basis === 'string') extra.push(`basis=${declared.basis}`);
  if (typeof sampleCount === 'number') extra.push(`sampleCount=${sampleCount}`);
  return [lower, upper, [kind, ...extra].join('; ')];
}

function originText(raw: JsonRecord): string {
  const origin = record(raw.origin);
  return origin.kind === 'derived'
    ? `derived: ${String(origin.method ?? 'unspecified')}`
    : String(origin.kind ?? 'unknown');
}

function sourceProvenance(
  trace: IndependentTrace,
  observation: IndependentObservation,
  atomKind: string,
  extra: JsonRecord = {},
): JsonValue {
  return {
    seriesId: trace.id,
    sourceOrdinals: [...observation.sourceOrdinals],
    atomKind,
    ...extra,
  };
}

function sourceProvenanceForView(
  view: IndependentSeriesView,
  observation: IndependentObservation,
  atomKind: string,
  extra: JsonRecord = {},
): JsonValue {
  const lineage = canonicalize([...observation.sourceOrdinals]);
  let renderRunOrdinal: number | undefined;
  for (let runOrdinal = 0; runOrdinal < (view.renderRuns?.length ?? 0); runOrdinal++) {
    if (view.renderRuns![runOrdinal].vertices.some((vertex) =>
      canonicalize(array(record(vertex.provenance).sourceOrdinals)) === lineage)) {
      if (renderRunOrdinal !== undefined && renderRunOrdinal !== runOrdinal) {
        throw new Error('one independent observation lineage appears in multiple render runs');
      }
      renderRunOrdinal = runOrdinal;
    }
  }
  return sourceProvenance(view.trace, observation, atomKind, {
    ...(renderRunOrdinal === undefined ? {} : { renderRunOrdinal }),
    ...extra,
  });
}

function joinUnique(values: readonly string[]): string {
  return [...new Set(values)].join(', ');
}

function noCompactionStatement(): string {
  return 'No compaction was applied; every accepted row is returned.';
}

/** ECMAScript's shortest round-trippable binary64 text, with canonical signed zero. */
function summaryNumber(value: number): string {
  return value === 0 ? '0' : String(value);
}

function unitConversionStatement(traces: readonly IndependentTrace[]): string {
  const conversions: string[] = [];
  for (const trace of traces) {
    if (trace.sourceTimeUnit !== trace.timeUnit) {
      conversions.push(`${trace.id} time ${trace.sourceTimeUnit} to ${trace.timeUnit}`);
    }
    if (!trace.normalization && trace.sourceValueUnit !== trace.valueUnit) {
      conversions.push(`${trace.id} value ${trace.sourceValueUnit} to ${trace.valueUnit}`);
    }
    if (trace.timeOffset && trace.timeOffset.sourceUnit !== trace.timeUnit) {
      conversions.push(`${trace.id} offset ${trace.timeOffset.sourceUnit} to ${trace.timeUnit}`);
    }
  }
  return conversions.length === 0
    ? 'No unit conversion was applied.'
    : `Unit conversions: ${conversions.join('; ')}.`;
}

function duplicateStatement(parameters: JsonRecord, traces: readonly IndependentTrace[]): string {
  const options = duplicateOptions(parameters);
  const groups = traces.reduce((sum, trace) => sum + trace.duplicateGroups, 0);
  if (groups === 0) return `${String(options.duplicatePolicy ?? 'reject_if_present')} (no duplicate groups present)`;
  return options.duplicatePolicy === 'aggregate'
    ? `aggregate (${String(options.aggregateMethod)}; ${groups} duplicate groups)`
    : `${String(options.duplicatePolicy)} (${groups} duplicate groups)`;
}

function uncertaintyStatement(uncertainties: readonly (JsonRecord | undefined)[]): string {
  const descriptions = uncertainties.map((value) => {
    const kind = typeof value?.kind === 'string' ? value.kind : 'none';
    return kind === 'none' && typeof value?.reason === 'string'
      ? `none (${value.reason})`
      : kind;
  });
  return `Uncertainty declarations: ${joinUnique(descriptions)}.`;
}

function weightUncertaintyStatement(
  uncertainties: readonly (JsonRecord | undefined)[],
): string {
  const descriptions = uncertainties.map((uncertainty) => {
    const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : 'none';
    if (kind === 'none') {
      return typeof uncertainty?.reason === 'string'
        ? `none (${uncertainty.reason})`
        : 'none';
    }
    const basis = String(uncertainty?.basis ?? 'ensemble_members');
    if (kind === 'standard_deviation') {
      return `standard_deviation (descriptive sample SD across exact ${basis}; center=arithmetic mean; divisor=n-1; no sampling-population or coverage claim)`;
    }
    if (kind === 'quantile_interval') {
      return `quantile_interval (descriptive empirical Type-7 linear q=${String(uncertainty?.lowerQuantile)}–${String(uncertainty?.upperQuantile)} across exact ${basis}; no coverage claim)`;
    }
    if (kind === 'ensemble_range') {
      return `ensemble_range (descriptive observed minimum–maximum across exact ${basis}; no sampling-population or coverage claim)`;
    }
    throw new Error(`unsupported independent synaptic-weight uncertainty summary kind ${kind}`);
  });
  return `Uncertainty declarations: ${joinUnique(descriptions)}.`;
}

function hasCompleteDrawableUncertainty(
  trace: IndependentTrace,
  uncertainty: JsonRecord | undefined,
): boolean {
  const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : 'none';
  if (kind === 'none') return false;
  let sawValue = false;
  for (const observation of trace.observations) {
    if (observation.value === null) continue;
    sawValue = true;
    const ordinal = observation.sourceOrdinals.length === 1 ? observation.sourceOrdinals[0] : undefined;
    const [lower, upper] = uncertaintyCells(uncertainty, ordinal, trace, observation.value);
    if (lower === null || upper === null) return false;
  }
  return sawValue;
}

function independentViewHasCompleteDrawableUncertainty(
  view: IndependentSeriesView,
  showSamplePoints: boolean,
): boolean {
  const uncertainty = view.uncertainty;
  const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : 'none';
  if (kind === 'none') return false;
  let eligibleIndexes: readonly number[];
  if (
    kind === 'standard_deviation' ||
    kind === 'standard_error' ||
    view.renderRuns === undefined
  ) {
    eligibleIndexes = view.trace.observations.map((_observation, index) => index);
  } else {
    const renderedLineage = new Set(
      view.renderRuns.flatMap((run) => run.vertices.map((vertex) =>
        canonicalize(array(record(vertex.provenance).sourceOrdinals)))),
    );
    const eligible = new Set(
      view.trace.observations.flatMap((observation, index) =>
        renderedLineage.has(canonicalize([...observation.sourceOrdinals]))
          ? [index]
          : []),
    );
    if (showSamplePoints) {
      for (const index of view.markerObservationIndexes ??
        view.trace.observations.map((_observation, observationIndex) => observationIndex)) {
        eligible.add(index);
      }
    }
    eligibleIndexes = [...eligible].sort((left, right) => left - right);
  }
  let observed = false;
  for (const index of eligibleIndexes) {
    const observation = view.trace.observations[index];
    if (observation?.value === null || observation === undefined) continue;
    observed = true;
    const ordinal = observation.sourceOrdinals.length === 1
      ? observation.sourceOrdinals[0]
      : undefined;
    const [lower, upper] = uncertaintyCells(
      uncertainty,
      ordinal,
      view.trace,
      observation.value,
    );
    if (lower === null || upper === null) return false;
  }
  return observed;
}

function exactConversionFacts(
  traces: readonly IndependentTrace[],
  uncertainties: readonly (JsonRecord | undefined)[],
): string[] {
  const conversions: string[] = [];
  for (const trace of traces) {
    if (trace.sourceTimeUnit !== trace.timeUnit) {
      conversions.push(
        `${trace.id}: ${trace.sourceTimeUnit} -> ${trace.timeUnit} (factor ${conversionFactor(trace.sourceTimeUnit, trace.timeUnit)})`,
      );
    }
    if (!trace.normalization && trace.sourceValueUnit !== trace.valueUnit) {
      conversions.push(
        `${trace.id}: ${trace.sourceValueUnit} -> ${trace.valueUnit} (factor ${conversionFactor(trace.sourceValueUnit, trace.valueUnit)})`,
      );
    }
    if (trace.timeOffset && trace.timeOffset.sourceUnit !== trace.timeUnit) {
      conversions.push(
        `${trace.id} offset: ${trace.timeOffset.sourceUnit} -> ${trace.timeUnit} (factor ${conversionFactor(trace.timeOffset.sourceUnit, trace.timeUnit)})`,
      );
    }
  }
  for (let index = 0; index < Math.min(traces.length, uncertainties.length); index++) {
    const uncertainty = uncertainties[index];
    const sourceUnit = typeof uncertainty?.unit === 'string' ? uncertainty.unit : undefined;
    if (!sourceUnit || uncertainty?.kind === 'none') continue;
    const targetUnit = traces[index].normalization
      ? traces[index].sourceValueUnit
      : traces[index].valueUnit;
    if (sourceUnit !== targetUnit) {
      conversions.push(
        `${traces[index].id} uncertainty: ${sourceUnit} -> ${targetUnit} (factor ${conversionFactor(sourceUnit, targetUnit)})`,
      );
    }
  }
  return conversions;
}

function traceDisclosureFacts(
  request: JsonRecord,
  parameters: JsonRecord,
  traces: readonly IndependentTrace[],
  uncertainties: readonly (JsonRecord | undefined)[],
  extras: Partial<DisclosureFacts> = {},
): DisclosureFacts {
  const source = record(request.source);
  const scope = record(record(request.data).scope);
  const conversions = exactConversionFacts(traces, uncertainties);
  const aggregateMethod = duplicateOptions(parameters).aggregateMethod;
  const duplicateGroups = traces.reduce((sum, trace) => sum + trace.duplicateGroups, 0);
  const missingValueCount = traces.reduce(
    (sum, trace) => sum + trace.observations.filter((observation) => observation.value === null).length,
    0,
  );
  const missingAggregateReplicateCount = traces.reduce(
    (sum, trace) => sum + trace.observations.reduce(
      (traceSum, observation) => traceSum + (
        observation.replicateCount > 1 && observation.value !== null
          ? observation.sourceValues.filter((value) => value === null).length
          : 0
      ),
      0,
    ),
    0,
  );
  const declared = uncertainties.filter((uncertainty) =>
    uncertainty?.kind !== undefined && uncertainty.kind !== 'none').length;
  const shown = traces.filter((trace, index) =>
    hasCompleteDrawableUncertainty(trace, uncertainties[index])).length;
  const reasons = uncertainties
    .map((uncertainty) => uncertainty?.reason)
    .filter((reason): reason is string => typeof reason === 'string');
  return {
    sourceKind: typeof source.kind === 'string' ? source.kind : 'unknown',
    sourceAuthenticityVerified: false,
    referenceComparisonRun: false,
    callerNotePresent: typeof source.declaredNote === 'string',
    ...(typeof scope.kind === 'string' ? { scopeKind: scope.kind } : {}),
    ...(typeof scope.rank === 'number' ? { rank: scope.rank } : {}),
    ...(typeof scope.worldSize === 'number' ? { worldSize: scope.worldSize } : {}),
    ...(typeof scope.retainedConnectionCount === 'number'
      ? {
        retainedConnectionCount: scope.retainedConnectionCount,
        sampledRetained: scope.retainedConnectionCount,
      }
      : {}),
    ...(typeof scope.sourceConnectionCount === 'number'
      ? {
        sourceConnectionCount: scope.sourceConnectionCount,
        sampledSource: scope.sourceConnectionCount,
      }
      : {}),
    excludedOutOfWindow: traces.reduce(
      (sum, trace) => sum + trace.excludedBelow + trace.excludedAbove,
      0,
    ),
    missingValueCount,
    ...(conversions.length > 0 ? { unitConversions: conversions } : {}),
    ...(duplicateGroups > 0 && aggregateMethod
      ? { duplicateTimeAggregateMethod: aggregateMethod }
      : {}),
    ...(missingAggregateReplicateCount > 0 ? { missingAggregateReplicateCount } : {}),
    uncertaintyKind: declared > 0 ? 'provided' : 'none',
    uncertaintySeriesDeclared: declared,
    uncertaintySeriesShown: shown,
    uncertaintySeriesTotal: uncertainties.length,
    ...(declared === 0 && reasons.length > 0
      ? { uncertaintyReason: joinUnique(reasons) }
      : declared === 0
        ? { uncertaintyReason: 'not_provided' }
        : {}),
    ...extras,
  };
}

function observationPath(
  trace: IndependentTrace,
): readonly {
  readonly observation: IndependentObservation;
  readonly connector: boolean;
}[][] {
  const subpaths: { observation: IndependentObservation; connector: boolean }[][] = [];
  let current: { observation: IndependentObservation; connector: boolean }[] = [];
  for (const observation of trace.observations) {
    if (observation.value === null) {
      if (current.length > 0) {
        if (trace.observationKind === 'piecewise_constant') {
          current.push({ observation, connector: true });
        }
        subpaths.push(current);
      }
      current = [];
      continue;
    }
    if (trace.observationKind === 'piecewise_constant' && current.length > 0) {
      current.push({ observation, connector: true });
    }
    current.push({ observation, connector: false });
  }
  if (current.length > 0) subpaths.push(current);
  return subpaths;
}

function pathPaints(
  path: readonly { readonly observation: IndependentObservation; readonly connector: boolean }[],
): boolean {
  if (path.length < 2) return false;
  const first = path[0];
  const firstValue = first.connector
    ? path[Math.max(0, path.indexOf(first) - 1)]?.observation.value
    : first.observation.value;
  let previousValue: number | null = firstValue;
  const coordinates = path.map((entry) => {
    const value = entry.connector ? previousValue : entry.observation.value;
    if (!entry.connector) previousValue = entry.observation.value;
    return [entry.observation.time, value] as const;
  });
  return coordinates.some(([time, value]) => time !== coordinates[0][0] || value !== coordinates[0][1]);
}

function uncertaintyGeometry(
  view: IndependentSeriesView,
  classId: string,
  showSamplePoints: boolean,
): AuthorityGeometryEntryV1[] {
  const uncertainty = view.uncertainty;
  const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : 'none';
  if (kind === 'none') return [];
  const usable = view.trace.observations.map((observation) => {
    const ordinal = observation.sourceOrdinals.length === 1 ? observation.sourceOrdinals[0] : undefined;
    const [lower, upper] = uncertaintyCells(uncertainty, ordinal, view.trace, observation.value);
    return { observation, lower, upper };
  });
  if (kind === 'standard_deviation' || kind === 'standard_error') {
    const finite = usable.filter(({ observation, lower, upper }) =>
      observation.value !== null && lower !== null && upper !== null);
    return [
      ...finite.map(({ observation }) => carrier(
        classId,
        sourceProvenanceForView(view, observation, 'uncertainty_whisker', { part: 'shaft' }),
      )),
      ...finite.flatMap(({ observation }) => [
        carrier(classId, sourceProvenanceForView(view, observation, 'uncertainty_whisker', { part: 'lower_cap' })),
        carrier(classId, sourceProvenanceForView(view, observation, 'uncertainty_whisker', { part: 'upper_cap' })),
      ]),
    ];
  }
  if (view.renderRuns) {
    const subpaths: {
      readonly time: number;
      readonly lower: number;
      readonly upper: number;
      readonly provenance: JsonRecord;
    }[][] = [];
    for (const run of view.renderRuns) {
      let current: (typeof subpaths)[number] = [];
      for (const vertex of run.vertices) {
        const provenance = record(vertex.provenance);
        const ordinals = array(provenance.sourceOrdinals);
        const ordinal = ordinals.length === 1 && typeof ordinals[0] === 'number'
          ? ordinals[0]
          : undefined;
        const [lower, upper] = uncertaintyCells(
          uncertainty,
          ordinal,
          view.trace,
          vertex.value,
        );
        if (lower === null || upper === null) {
          if (current.length > 0) subpaths.push(current);
          current = [];
          continue;
        }
        current.push({ time: vertex.time, lower, upper, provenance });
      }
      if (current.length > 0) subpaths.push(current);
    }
    if (showSamplePoints) {
      const renderedLineage = new Set(
        view.renderRuns.flatMap((run) => run.vertices.map((vertex) =>
          canonicalize(array(record(vertex.provenance).sourceOrdinals)))),
      );
      const markerIndexes = view.markerObservationIndexes ??
        view.trace.observations.map((_observation, index) => index);
      for (const index of markerIndexes) {
        const observation = view.trace.observations[index];
        if (
          observation === undefined ||
          observation.value === null ||
          renderedLineage.has(canonicalize([...observation.sourceOrdinals]))
        ) continue;
        const ordinal = observation.sourceOrdinals.length === 1
          ? observation.sourceOrdinals[0]
          : undefined;
        const [lower, upper] = uncertaintyCells(
          uncertainty,
          ordinal,
          view.trace,
          observation.value,
        );
        if (lower === null || upper === null) continue;
        subpaths.push([{
          time: observation.time,
          lower,
          upper,
          provenance: record(sourceProvenanceForView(
            view,
            observation,
            'uncertainty_band_vertex',
          )),
        }]);
      }
    }
    const vertices = subpaths.flatMap((path) => path.map((entry) =>
      carrier(classId, {
        ...entry.provenance,
        atomKind: 'uncertainty_band_vertex',
      })));
    const degenerate = subpaths.flatMap((path) => {
      if (path.length === 0) return [];
      const first = path[0];
      return path.every((entry) =>
        entry.time === first.time &&
        entry.lower === first.lower &&
        entry.upper === first.upper,
      ) && first.lower === first.upper
        ? [carrier(classId, {
          ...first.provenance,
          atomKind: 'uncertainty_degenerate_marker',
        })]
        : [];
    });
    return [...vertices, ...degenerate];
  }
  const subpaths: { observation: IndependentObservation; connector: boolean; lower: number; upper: number }[][] = [];
  let current: { observation: IndependentObservation; connector: boolean; lower: number; upper: number }[] = [];
  for (const entry of usable) {
    if (entry.lower === null || entry.upper === null || entry.observation.value === null) {
      if (current.length > 0) {
        if (view.trace.observationKind === 'piecewise_constant') {
          const previous = current[current.length - 1];
          current.push({
            observation: entry.observation,
            connector: true,
            lower: previous.lower,
            upper: previous.upper,
          });
        }
        subpaths.push(current);
      }
      current = [];
      continue;
    }
    if (view.trace.observationKind === 'piecewise_constant' && current.length > 0) {
      const previous = current[current.length - 1];
      current.push({
        observation: entry.observation,
        connector: true,
        lower: previous.lower,
        upper: previous.upper,
      });
    }
    current.push({
      observation: entry.observation,
      connector: false,
      lower: entry.lower,
      upper: entry.upper,
    });
  }
  if (current.length > 0) subpaths.push(current);
  const vertices = subpaths.flatMap((path) => path.flatMap((entry) => entry.connector
    ? []
    : [carrier(classId, sourceProvenance(view.trace, entry.observation, 'uncertainty_band_vertex'))]));
  const degenerate = subpaths.flatMap((path) => {
    if (path.length === 0) return [];
    const first = path[0];
    const same = path.every((entry) =>
      entry.observation.time === first.observation.time &&
      entry.lower === first.lower &&
      entry.upper === first.upper,
    );
    return same && first.lower === first.upper
      ? [carrier(classId, sourceProvenance(view.trace, first.observation, 'uncertainty_degenerate_marker'))]
      : [];
  });
  return [...vertices, ...degenerate];
}

function normalTraceGeometry(
  view: IndependentSeriesView,
  classes: {
    readonly paths: string;
    readonly samples: string;
    readonly uncertainty?: string;
  },
  showSamplePoints: boolean,
  atomKinds: {
    readonly pathVertex: string;
    readonly sampleMarker: string;
    readonly isolatedMarker: string;
  } = {
    pathVertex: 'observation_vertex',
    sampleMarker: 'observation_marker',
    isolatedMarker: 'isolated_observation_marker',
  },
): AuthorityGeometryEntryV1[] {
  const output: AuthorityGeometryEntryV1[] = [];
  if (classes.uncertainty) {
    output.push(...uncertaintyGeometry(view, classes.uncertainty, showSamplePoints));
  }
  if (view.renderRuns) {
    for (const run of view.renderRuns) {
      if (run.vertices.length < 2) continue;
      const first = run.vertices[0];
      if (!run.vertices.some((vertex) => vertex.time !== first.time || vertex.value !== first.value)) continue;
      for (const vertex of run.vertices) output.push(carrier(classes.paths, vertex.provenance));
    }
  } else {
    const paths = observationPath(view.trace);
    for (const path of paths) {
      if (!pathPaints(path)) continue;
      for (const entry of path) {
        if (!entry.connector) {
          output.push(carrier(
            classes.paths,
            sourceProvenance(view.trace, entry.observation, atomKinds.pathVertex),
          ));
        }
      }
    }
  }
  if (showSamplePoints) {
    const markerIndexes = view.markerObservationIndexes ??
      view.trace.observations.map((_observation, index) => index);
    for (const index of markerIndexes) {
      const observation = view.trace.observations[index];
      if (observation.value !== null) {
          output.push(carrier(
            classes.samples,
            sourceProvenanceForView(view, observation, atomKinds.sampleMarker),
          ));
      }
    }
  } else if (view.renderRuns) {
    for (const run of view.renderRuns) {
      if (run.vertices.length === 0) continue;
      const first = run.vertices[0];
      const paints = run.vertices.length >= 2 && run.vertices.some(
        (vertex) => vertex.time !== first.time || vertex.value !== first.value,
      );
      if (!paints) {
        output.push(carrier(
          classes.samples,
          { ...record(first.provenance), atomKind: atomKinds.isolatedMarker },
        ));
      }
    }
  } else {
    for (const path of observationPath(view.trace)) {
      if (!pathPaints(path) && path.length > 0) {
        output.push(carrier(
          classes.samples,
          sourceProvenance(view.trace, path[0].observation, atomKinds.isolatedMarker),
        ));
      }
    }
  }
  return output;
}

function analogModel(requestValue: JsonValue): {
  readonly rows: readonly (readonly Cell[])[];
  readonly geometry: readonly AuthorityGeometryEntryV1[];
  readonly summary: Readonly<Record<string, AuthoritySummaryScalarV1>>;
  readonly disclosures: Readonly<DisclosureFacts>;
} {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const window = windowFrom(data.window);
  const rawSeries = array(data.series).map(record);
  const ids = stringArray(data.seriesIds);
  const inputs = rawSeries.map((raw, index): TraceInputV1 => {
    const time = record(raw.time);
    const values = record(raw.values);
    return {
      id: ids[index] ?? `series-${index + 1}`,
      label: typeof raw.label === 'string' ? raw.label : ids[index] ?? `Series ${index + 1}`,
      observationKind: (raw.observationKind as ObservationKind | undefined) ?? 'point_sample',
      times: numberArray(time.values),
      timeUnit: typeof time.unit === 'string' ? time.unit : window.unit,
      values: nullableNumberArray(values.values),
      valueUnit: typeof values.unit === 'string' ? values.unit : '1',
    };
  });
  const layout = String(parameters.layout);
  const panelMembers: { readonly key: string; readonly indexes: readonly number[] }[] = [];
  if (layout === 'small_multiples') {
    const groupBy = typeof parameters.groupBy === 'string' ? parameters.groupBy : 'series';
    const groups = new Map<string, number[]>();
    for (let index = 0; index < inputs.length; index++) {
      const key = groupBy === 'quantity_kind'
        ? String(record(rawSeries[index].values).kind)
        : inputs[index].id;
      const group = groups.get(key);
      if (group) group.push(index);
      else groups.set(key, [index]);
    }
    for (const [key, indexes] of groups) panelMembers.push({ key, indexes });
  } else {
    panelMembers.push({ key: 'main', indexes: inputs.map((_input, index) => index) });
  }

  const panels: IndependentPanel[] = panelMembers.map((panel) => {
    const targetUnit = layout === 'small_multiples'
      ? inputs[panel.indexes[0]].valueUnit
      : typeof parameters.valueUnit === 'string'
        ? parameters.valueUnit
        : inputs[0].valueUnit;
    return {
      id: panel.key,
      series: panel.indexes.map((sourceIndex): IndependentSeriesView => ({
        raw: rawSeries[sourceIndex],
        sourceIndex,
        uncertainty: record(parameters.uncertainty),
        trace: prepareIndependentTrace(inputs[sourceIndex], {
          window,
          ...duplicateOptions(parameters),
          targetValueUnit: targetUnit,
        }),
      })),
    };
  });
  const uncertainty = record(parameters.uncertainty);
  const views = panels.flatMap((panel) => panel.series);
  const traces = views.map((view) => view.trace);
  const rows: Cell[][] = [];
  for (const panel of panels) {
    for (const view of panel.series) {
      const rawValues = record(view.raw.values);
      for (const observation of view.trace.observations) {
        const sourceOrdinal = observation.sourceOrdinals.length === 1
          ? observation.sourceOrdinals[0]
          : undefined;
        const [lower, upper, method] = uncertaintyCells(
          uncertainty,
          sourceOrdinal,
          view.trace,
          observation.value,
        );
        rows.push([
          view.trace.id,
          view.trace.label,
          String(rawValues.kind ?? 'unknown'),
          view.trace.observationKind,
          originText(view.raw),
          observation.time,
          view.trace.timeUnit,
          observation.value,
          view.trace.valueUnit,
          observation.value === null ? 'true' : 'false',
          observation.replicateCount,
          lower,
          upper,
          method,
          traceCell(observation.sourceOrdinals),
        ]);
      }
    }
  }
  const geometry = panels.flatMap((panel) => panel.series.flatMap((view) =>
    normalTraceGeometry(view, {
      paths: 'series_paths',
      samples: 'samples',
      uncertainty: 'uncertainty',
    }, parameters.showSamplePoints === true)));
  const missing = traces.reduce(
    (sum, trace) => sum + trace.observations.filter((observation) => observation.value === null).length,
    0,
  );
  const excluded = traces.reduce(
    (sum, trace) => sum + trace.excludedBelow + trace.excludedAbove,
    0,
  );
  const quantitySummary = joinUnique(views.map((view) =>
    `${String(record(view.raw.values).kind ?? 'unknown')} (${view.trace.valueUnit})`));
  const summary: Record<string, string> = {
    seriesCount: String(traces.length),
    windowStart: summaryNumber(window.start),
    windowStop: summaryNumber(window.stop),
    timeUnit: window.unit,
    layoutMode: layout,
    quantitySummary,
    sampleCount: String(rows.length),
    missingCount: String(missing),
    excludedCount: String(excluded),
    duplicateTimePolicy: duplicateStatement(parameters, traces),
    unitConversionStatement: unitConversionStatement(traces),
    uncertaintyStatement: uncertaintyStatement(traces.map(() => uncertainty)),
    compactionStatement: noCompactionStatement(),
  };
  return {
    rows,
    geometry,
    summary,
    disclosures: traceDisclosureFacts(
      request,
      parameters,
      traces,
      traces.map(() => uncertainty),
    ),
  };
}

const ANALOG_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.analog_trace', 2),
  (request) => {
    const model = analogModel(request);
    return {
      'table.rows': rowSequence(model.rows),
      'geometry.sequence': geometrySequence(model.geometry),
      'summary.facts': summaryFactMap(model.summary),
      'disclosure.facts': disclosureFactMap(model.disclosures),
    };
  },
);

function multisignalModel(requestValue: JsonValue): {
  readonly rows: readonly (readonly Cell[])[];
  readonly geometry: readonly AuthorityGeometryEntryV1[];
  readonly summary: Readonly<Record<string, AuthoritySummaryScalarV1>>;
  readonly disclosures: Readonly<DisclosureFacts>;
} {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const window = windowFrom(data.window);
  const rawSeries = array(data.series).map(record);
  const sharedTime = record(data.eventTimes);
  const inputs = rawSeries.map((raw, index): TraceInputV1 & { readonly panelId: string } => {
    const time = data.timeBase === 'shared' ? sharedTime : record(raw.time);
    const values = record(raw.values);
    const offset = record(raw.timeOffset);
    return {
      id: typeof raw.seriesId === 'string' ? raw.seriesId : `series-${index + 1}`,
      label: typeof raw.label === 'string'
        ? raw.label
        : typeof raw.seriesId === 'string'
          ? raw.seriesId
          : `Series ${index + 1}`,
      panelId: typeof raw.panelId === 'string' ? raw.panelId : 'main',
      observationKind: (raw.observationKind as ObservationKind | undefined) ?? 'point_sample',
      times: numberArray(time.values),
      timeUnit: typeof time.unit === 'string' ? time.unit : window.unit,
      values: nullableNumberArray(values.values),
      valueUnit: typeof values.unit === 'string' ? values.unit : '1',
      ...(typeof offset.value === 'number' && typeof offset.unit === 'string'
        ? { timeOffset: { value: offset.value, unit: offset.unit } }
        : {}),
    };
  });
  const normalizationNode = record(parameters.normalization);
  const normalization = typeof normalizationNode.method === 'string'
    ? {
      method: normalizationNode.method as NormalizationReceiptV1['method'],
      statisticsWindow: windowFrom(normalizationNode.statisticsWindow, window.unit),
    }
    : undefined;
  const declaredPanels = array(parameters.panels).map((value, declaredIndex) => ({
    panel: record(value),
    declaredIndex,
  }));
  if (parameters.panelOrder === 'by_panel_id') {
    declaredPanels.sort((left, right) => {
      const a = String(left.panel.panelId ?? '');
      const b = String(right.panel.panelId ?? '');
      return a < b ? -1 : a > b ? 1 : left.declaredIndex - right.declaredIndex;
    });
  }
  const panels: IndependentPanel[] = declaredPanels.map(({ panel, declaredIndex }) => {
    const panelId = typeof panel.panelId === 'string' ? panel.panelId : `panel-${declaredIndex + 1}`;
    const targetUnit = normalization ? '1' : String(panel.unit ?? '1');
    return {
      id: panelId,
      series: inputs.flatMap((input, sourceIndex): IndependentSeriesView[] => {
        if (input.panelId !== panelId) return [];
        const uncertainty = record(rawSeries[sourceIndex].uncertainty);
        return [{
          raw: rawSeries[sourceIndex],
          sourceIndex,
          panelId,
          uncertainty,
          trace: prepareIndependentTrace(input, {
            window,
            ...duplicateOptions(parameters),
            targetValueUnit: targetUnit,
            ...(normalization ? { normalization } : {}),
          }),
        }];
      }),
    };
  });
  const views = panels.flatMap((panel) => panel.series);
  const traces = views.map((view) => view.trace);
  const uncertainties = views.map((view) => view.uncertainty);
  const rows: Cell[][] = [];
  for (const panel of panels) {
    for (const view of panel.series) {
      const raw = view.raw;
      const origin = record(raw.origin);
      const rawValues = record(raw.values);
      const uncertainty = view.uncertainty;
      for (const observation of view.trace.observations) {
        const ordinal = observation.sourceOrdinals.length === 1
          ? observation.sourceOrdinals[0]
          : undefined;
        const [lower, upper, method] = uncertaintyCells(
          uncertainty,
          ordinal,
          view.trace,
          observation.value,
        );
        rows.push([
          view.trace.id,
          view.trace.label,
          String(raw.entityId ?? ''),
          String(raw.entityKind ?? ''),
          typeof raw.compartmentId === 'string' ? raw.compartmentId : null,
          typeof raw.pathwayId === 'string' ? raw.pathwayId : null,
          String(raw.variableId ?? ''),
          panel.id,
          view.trace.observationKind,
          String(origin.kind ?? 'unknown'),
          typeof origin.method === 'string' ? origin.method : null,
          observation.recordedTime,
          view.trace.sourceTimeUnit,
          view.trace.timeOffset?.sourceValue ?? 0,
          view.trace.timeOffset?.sourceUnit ?? view.trace.sourceTimeUnit,
          observation.time,
          view.trace.timeUnit,
          traceCell(observation.sourceValues),
          String(rawValues.unit ?? view.trace.valueUnit),
          observation.value,
          view.trace.valueUnit,
          observation.value === null ? 'true' : 'false',
          observation.replicateCount,
          String(uncertainty?.kind ?? 'none'),
          lower,
          upper,
          method,
          structuredCell(view.trace.normalization as unknown as JsonValue | undefined),
          traceCell(observation.sourceOrdinals),
        ]);
      }
    }
  }
  const geometry = panels.flatMap((panel) => panel.series.flatMap((view) =>
    normalTraceGeometry(view, {
      paths: 'series_paths',
      samples: 'samples',
      uncertainty: 'uncertainty',
    }, parameters.showSamplePoints === true)));
  const panelSummary = panels.map((panel) => {
    const panelDeclaration = declaredPanels.find(({ panel: candidate, declaredIndex }) =>
      String(candidate.panelId ?? `panel-${declaredIndex + 1}`) === panel.id)?.panel ?? {};
    return `${panel.id}: ${panel.series.length} series, unit ${normalization ? '1' : String(panelDeclaration.unit ?? '1')}, scale ${String(panelDeclaration.scale ?? 'linear')}`;
  }).join('; ');
  const seriesSummary = views.map((view) => {
    const values = record(view.raw.values);
    return `${view.trace.id}: ${String(view.raw.variableId ?? 'unknown')} (${String(values.kind ?? 'unknown')}, ${view.trace.valueUnit})`;
  }).join('; ');
  const missing = traces.reduce(
    (sum, trace) => sum + trace.observations.filter((observation) => observation.value === null).length,
    0,
  );
  const summary: Record<string, string> = {
    seriesCount: String(traces.length),
    panelCount: String(panels.length),
    windowStart: summaryNumber(window.start),
    windowStop: summaryNumber(window.stop),
    timeUnit: window.unit,
    windowBoundary: window.finalEdgeInclusive ? '[start,stop]' : '[start,stop)',
    layout: String(parameters.layout),
    timeAlignment: String(structuredCell(data.timeAlignment) ?? 'unknown'),
    panelSummary,
    seriesSummary,
    observationKindStatement: `Observation kinds: ${joinUnique(traces.map((trace) => trace.observationKind))}.`,
    originStatement: `Origins: ${joinUnique(views.map((view) => originText(view.raw)))}.`,
    sampleCount: String(rows.length),
    missingCount: String(missing),
    duplicateTimePolicy: duplicateStatement(parameters, traces),
    normalizationStatement: normalization
      ? `Normalization: ${normalization.method} using ${normalization.statisticsWindow.start} to ${normalization.statisticsWindow.stop} ${normalization.statisticsWindow.unit}.`
      : 'No normalization was applied.',
    uncertaintyStatement: uncertaintyStatement(uncertainties),
    unitConversionStatement: unitConversionStatement(traces),
    compactionStatement: noCompactionStatement(),
  };
  return {
    rows,
    geometry,
    summary,
    disclosures: traceDisclosureFacts(request, parameters, traces, uncertainties),
  };
}

const MULTISIGNAL_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.multisignal_trace', 2),
  (request) => {
    const model = multisignalModel(request);
    return {
      'table.rows': rowSequence(model.rows),
      'geometry.sequence': geometrySequence(model.geometry),
      'summary.facts': summaryFactMap(model.summary),
      'disclosure.facts': disclosureFactMap(model.disclosures),
    };
  },
);

function quantile(values: readonly number[], probability: number): number {
  return exactBinary64EmpiricalQuantileType7(values, probability);
}

function deriveIndependentCompartmentAggregate(
  declaration: JsonRecord,
  views: readonly IndependentSeriesView[],
  window: WindowV1,
): IndependentSeriesView {
  const selectedIds = stringArray(declaration.compartmentIds);
  const viewsByCompartment = new Map<string, IndependentSeriesView[]>();
  for (const view of views) {
    const id = String(view.raw.compartmentId);
    const existing = viewsByCompartment.get(id);
    if (existing) existing.push(view);
    else viewsByCompartment.set(id, [view]);
  }
  const selected = selectedIds.map((id) => {
    const matches = viewsByCompartment.get(id) ?? [];
    if (matches.length !== 1) throw new Error(`ambiguous compartment aggregate member ${id}`);
    return matches[0];
  });
  const targetUnit = selected[0].trace.valueUnit;
  const times = [...new Set(selected.flatMap((view) => [...view.trace.times]))]
    .sort((left, right) => left - right);
  const byMember = selected.map((view) => {
    const values = new Map<number, (number | null)[]>();
    for (const observation of view.trace.observations) {
      const existing = values.get(observation.time);
      if (existing) existing.push(observation.value);
      else values.set(observation.time, [observation.value]);
    }
    return values;
  });
  const weights = declaration.weighting === 'declared'
    ? numberArray(declaration.weights)
    : selected.map(() => 1);
  const method = String(declaration.method);
  const values = times.map((time): number | null => {
    const memberValues: number[] = [];
    for (let index = 0; index < selected.length; index++) {
      const candidates = byMember[index].get(time) ?? [];
      if (candidates.length !== 1 || candidates[0] === null) return null;
      memberValues.push(selected[index].trace.valueUnit === targetUnit
        ? candidates[0]
        : convert(candidates[0], selected[index].trace.valueUnit, targetUnit));
    }
    if (method === 'mean') {
      return exactBinary64WeightedMean(memberValues, weights);
    }
    if (method === 'sum') {
      return exactBinary64WeightedSum(memberValues, weights);
    }
    if (method === 'median') return quantile(memberValues, 0.5);
    if (method === 'min') return sequenceMinimum(memberValues);
    return sequenceMaximum(memberValues);
  });
  const id = `aggregate-${selectedIds.join('-')}`;
  const label = typeof declaration.label === 'string'
    ? declaration.label
    : `${method} over ${selected.length} declared compartments`;
  const trace = prepareIndependentTrace({
    id,
    label,
    observationKind: 'point_sample',
    times,
    timeUnit: window.unit,
    values,
    valueUnit: targetUnit,
  }, {
    window,
    duplicatePolicy: 'reject',
    targetValueUnit: targetUnit,
  });
  const source = selected.length === 1 ? selected[0] : undefined;
  const uncertainty = source?.uncertainty;
  const scale = method === 'sum' ? weights[0] : 1;
  let derivedUncertainty: JsonRecord | undefined;
  if (source && uncertainty && uncertainty.kind !== 'none') {
    const sourceLower: (number | null)[] = [];
    const sourceUpper: (number | null)[] = [];
    for (const observation of source.trace.observations) {
      const ordinal = observation.sourceOrdinals.length === 1 ? observation.sourceOrdinals[0] : undefined;
      const [lower, upper] = uncertaintyCells(uncertainty, ordinal, source.trace, observation.value);
      sourceLower.push(lower);
      sourceUpper.push(upper);
    }
    const uniqueSourceIndex = new Map<number, number | null>();
    for (let sourceIndex = 0; sourceIndex < source.trace.times.length; sourceIndex++) {
      const time = source.trace.times[sourceIndex];
      uniqueSourceIndex.set(time, uniqueSourceIndex.has(time) ? null : sourceIndex);
    }
    const lower: (number | null)[] = [];
    const upper: (number | null)[] = [];
    for (let index = 0; index < times.length; index++) {
      const sourceIndex = uniqueSourceIndex.get(times[index]);
      lower.push(
        typeof sourceIndex === 'number' && values[index] !== null && sourceLower[sourceIndex] !== null
          ? exactBinary64WeightedSum([sourceLower[sourceIndex]!], [scale])
          : null,
      );
      upper.push(
        typeof sourceIndex === 'number' && values[index] !== null && sourceUpper[sourceIndex] !== null
          ? exactBinary64WeightedSum([sourceUpper[sourceIndex]!], [scale])
          : null,
      );
    }
    derivedUncertainty = {
      kind: String(uncertainty.kind),
      unit: targetUnit,
      lower,
      upper,
      ...(uncertainty.method !== undefined ? { method: uncertainty.method } : {}),
      ...(uncertainty.level !== undefined ? { level: uncertainty.level } : {}),
      ...(uncertainty.coverage !== undefined ? { coverage: uncertainty.coverage } : {}),
      ...(uncertainty.lowerQuantile !== undefined ? { lowerQuantile: uncertainty.lowerQuantile } : {}),
      ...(uncertainty.upperQuantile !== undefined ? { upperQuantile: uncertainty.upperQuantile } : {}),
      ...(uncertainty.basis !== undefined ? { basis: uncertainty.basis } : {}),
    };
  }
  return {
    raw: {
      compartmentId: id,
      signalId: String(selected[0].raw.signalId),
      signalLabel: label,
      values: { kind: String(record(selected[0].raw.values).kind), unit: targetUnit, values },
    },
    sourceIndex: views.length,
    aggregate: true,
    trace,
    ...(derivedUncertainty ? { uncertainty: derivedUncertainty } : {}),
  };
}

function compartmentModel(requestValue: JsonValue): {
  readonly rows: readonly (readonly Cell[])[];
  readonly geometry: readonly AuthorityGeometryEntryV1[];
  readonly summary: Readonly<Record<string, AuthoritySummaryScalarV1>>;
  readonly disclosures: Readonly<DisclosureFacts>;
} {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const window = windowFrom(data.window);
  const rawSeries = array(data.series).map(record);
  const compartmentIds = stringArray(data.compartmentIds);
  const compartmentIndexById = new Map(compartmentIds.map((id, index) => [id, index]));
  const labels = stringArray(data.compartmentLabels);
  const parents = array(data.compartmentParentIds);
  const distances = record(data.compartmentPathDistances);
  const distanceValues = array(distances.values);
  const targetValueUnit = String(record(rawSeries[0].values).unit);
  const uncertainty = record(parameters.uncertainty);
  const views = rawSeries.map((raw, sourceIndex): IndependentSeriesView => {
    const time = record(raw.time);
    const values = record(raw.values);
    const compartmentId = String(raw.compartmentId);
    const signalId = String(raw.signalId);
    const compartmentIndex = compartmentIndexById.get(compartmentId) ?? -1;
    return {
      raw,
      sourceIndex,
      uncertainty,
      trace: prepareIndependentTrace({
        id: `compartment-source-${String(sourceIndex)}`,
        label: `${labels[compartmentIndex] ?? compartmentId}: ${String(raw.signalLabel ?? signalId)}`,
        observationKind: 'point_sample',
        times: numberArray(time.values),
        timeUnit: String(time.unit),
        values: nullableNumberArray(values.values),
        valueUnit: String(values.unit),
      }, {
        window,
        ...duplicateOptions(parameters),
        targetValueUnit,
      }),
    };
  });
  const aggregateDeclaration = record(parameters.compartmentAggregate);
  const aggregate = Object.keys(aggregateDeclaration).length > 0
    ? deriveIndependentCompartmentAggregate(aggregateDeclaration, views, window)
    : undefined;
  const byCompartment = new Map<string, IndependentSeriesView[]>();
  for (const view of views) {
    const id = String(view.raw.compartmentId);
    const existing = byCompartment.get(id);
    if (existing) existing.push(view);
    else byCompartment.set(id, [view]);
  }
  const rows: Cell[][] = [];
  for (let rowIndex = 0; rowIndex < compartmentIds.length; rowIndex++) {
    const compartmentId = compartmentIds[rowIndex];
    const common: Cell[] = [
      String(data.cellId),
      rowIndex,
      compartmentId,
      labels[rowIndex] ?? compartmentId,
      typeof parents[rowIndex] === 'string' ? parents[rowIndex] as string : null,
      typeof distanceValues[rowIndex] === 'number' ? distanceValues[rowIndex] as number : null,
      typeof distances.unit === 'string' ? distances.unit : null,
    ];
    const members = byCompartment.get(compartmentId) ?? [];
    if (members.length === 0) {
      rows.push([...common, 'no', null, null, null, null, null, null, null]);
      continue;
    }
    for (const view of members) {
      for (const observation of view.trace.observations) {
        rows.push([
          ...common,
          'yes',
          String(view.raw.signalId),
          observation.recordedTime,
          view.trace.sourceTimeUnit,
          observation.value,
          view.trace.valueUnit,
          observation.value === null ? 'true' : 'false',
          traceCell(observation.sourceOrdinals),
        ]);
      }
    }
  }
  const layout = String(parameters.layout);
  let geometry: AuthorityGeometryEntryV1[] = [];
  if (layout === 'heatmap') {
    const heatmapRows: IndependentSeriesView[] = [];
    for (const id of compartmentIds) heatmapRows.push(...(byCompartment.get(id) ?? []));
    if (aggregate) heatmapRows.push(aggregate);
    geometry = heatmapRows.flatMap((view) => view.trace.observations.map((observation) => carrier(
      view.aggregate ? 'aggregate' : 'heatmap_cells',
      sourceProvenance(
        view.trace,
        observation,
        view.aggregate ? 'aggregate_heatmap_cell' : 'heatmap_cell',
      ),
    )));
  } else {
    const panels: IndependentPanel[] = [];
    if (layout === 'small_multiples') {
      for (const id of compartmentIds) panels.push({ id, series: byCompartment.get(id) ?? [] });
      if (aggregate) panels.push({ id: aggregate.trace.id, series: [aggregate] });
    } else {
      const selected = new Set(stringArray(parameters.overlayCompartmentIds));
      panels.push({
        id: 'overlay',
        series: [
          ...views.filter((view) => selected.has(String(view.raw.compartmentId))),
          ...(aggregate ? [aggregate] : []),
        ],
      });
    }
    geometry = panels.flatMap((panel) => panel.series.flatMap((view) => normalTraceGeometry(
      view,
      view.aggregate
        ? { paths: 'aggregate', samples: 'aggregate', uncertainty: 'uncertainty' }
        : { paths: 'series_paths', samples: 'samples', uncertainty: 'uncertainty' },
      false,
    )));
  }
  const traces = views.map((view) => view.trace);
  const finiteValues = traces.flatMap((trace) => trace.values)
    .filter((value): value is number => value !== null);
  const recorded = new Set(views.map((view) => String(view.raw.compartmentId))).size;
  const missing = traces.reduce(
    (sum, trace) => sum + trace.observations.filter((observation) => observation.value === null).length,
    0,
  );
  const quantityKind = joinUnique(rawSeries.map((raw) => String(record(raw.values).kind)));
  const summary: Record<string, string> = {
    cellLabel: String(data.cellLabel ?? data.cellId),
    signalLabel: joinUnique(rawSeries.map((raw) => String(raw.signalLabel ?? raw.signalId))),
    quantityKind,
    unit: targetValueUnit,
    compartmentCount: String(compartmentIds.length),
    windowStart: summaryNumber(window.start),
    windowStop: summaryNumber(window.stop),
    timeUnit: window.unit,
    layoutMode: layout,
    scaleStatement: layout === 'heatmap'
      ? 'one global colour domain over all accepted cells'
      : layout === 'small_multiples'
        ? `${String(parameters.yScale)} y domains`
        : 'one shared y domain for the declared overlay selection',
    compartmentOrderBasis: String(data.compartmentOrderBasis),
    recordedCompartmentCount: String(recorded),
    notRecordedCount: String(compartmentIds.length - recorded),
    sampleCount: String(traces.reduce((sum, trace) => sum + trace.observations.length, 0)),
    missingSampleCount: String(missing),
    valueMin: finiteValues.length > 0 ? summaryNumber(sequenceMinimum(finiteValues)) : 'not available',
    valueMax: finiteValues.length > 0 ? summaryNumber(sequenceMaximum(finiteValues)) : 'not available',
    duplicateTimeStatement: `Duplicate timestamps: ${duplicateStatement(parameters, traces)}.`,
    aggregateStatement: aggregate
      ? `Aggregate: ${String(aggregateDeclaration.method)} over ${stringArray(aggregateDeclaration.compartmentIds).length} explicitly selected compartments with ${String(aggregateDeclaration.weighting)} weighting.`
      : 'No compartment aggregate was requested.',
    uncertaintyStatement: uncertaintyStatement(traces.map(() => uncertainty)),
    universeStatement: data.compartmentUniverseComplete === true
      ? 'The declared compartment universe is complete.'
      : 'The declared compartments are an incomplete subset of the cell.',
    compactionStatement: noCompactionStatement(),
  };
  const declared = uncertainty.kind !== undefined && uncertainty.kind !== 'none' ? 1 : 0;
  const shownViews = [
    ...views,
    ...(aggregate ? [aggregate] : []),
  ];
  const shown = shownViews.filter((view) =>
    hasCompleteDrawableUncertainty(view.trace, view.uncertainty)).length;
  return {
    rows,
    geometry,
    summary,
    disclosures: traceDisclosureFacts(
      request,
      parameters,
      traces,
      traces.map(() => uncertainty),
      {
        nodeUniverseComplete: data.compartmentUniverseComplete === true,
        uncertaintyKind: declared > 0 ? 'provided' : 'none',
        uncertaintySeriesDeclared: declared,
        uncertaintySeriesShown: shown,
        uncertaintySeriesTotal: views.length + (aggregate ? 1 : 0),
        ...(declared === 0 && typeof uncertainty.reason === 'string'
          ? { uncertaintyReason: uncertainty.reason }
          : {}),
      },
    ),
  };
}

const COMPARTMENT_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.compartment_trace', 2),
  (request) => {
    const model = compartmentModel(request);
    return {
      'table.rows': rowSequence(model.rows),
      'geometry.sequence': geometrySequence(model.geometry),
      'summary.facts': summaryFactMap(model.summary),
      'disclosure.facts': disclosureFactMap(model.disclosures),
    };
  },
);

interface IndependentWeightView extends IndependentSeriesView {
  readonly stateTrace: IndependentTrace;
  readonly recordedStart: number;
  readonly recordedStop: number;
  readonly recordedFinalEdgeInclusive: boolean;
  readonly stateStart: number;
  readonly stateStop: number;
  readonly initialStateTime: number;
  readonly initialValue?: number;
}

type IndependentWeightCarrierKind =
  | 'source_observation'
  | 'source_state_witness'
  | 'caller_reconstruction_point'
  | 'derived_aggregate_evaluation'
  | 'declared_aggregate_point'
  | 'declared_initial_state';

interface IndependentWeightCarrierCount {
  total: number;
  missing: number;
}

type IndependentWeightCarrierCounts = Record<
  IndependentWeightCarrierKind,
  IndependentWeightCarrierCount
>;

interface IndependentWeightInterval {
  readonly start: number;
  readonly stop: number;
}

function emptyIndependentWeightCarrierCounts(): IndependentWeightCarrierCounts {
  return {
    source_observation: { total: 0, missing: 0 },
    source_state_witness: { total: 0, missing: 0 },
    caller_reconstruction_point: { total: 0, missing: 0 },
    derived_aggregate_evaluation: { total: 0, missing: 0 },
    declared_aggregate_point: { total: 0, missing: 0 },
    declared_initial_state: { total: 0, missing: 0 },
  };
}

function independentWeightCarrierStatement(
  counts: Readonly<IndependentWeightCarrierCounts>,
  sourceReadingCount: number,
  missingSourceReadingCount: number,
  excludedSourceReadingCount: number,
  reconstructionPointCount: number,
  retainedReconstructionRowCount: number,
  missingReconstructionPointCount: number,
  excludedReconstructionPointCount: number,
): string {
  const clause = (kind: IndependentWeightCarrierKind, label: string): string =>
    `${label} ${counts[kind].total} rows (${counts[kind].missing} missing rows)`;
  return `Carriers: ${[
    `source readings ${sourceReadingCount} in ${counts.source_observation.total} retained rows (${missingSourceReadingCount} missing readings; ${excludedSourceReadingCount} excluded outside the window)`,
    clause('source_state_witness', 'source state witnesses'),
    clause('caller_reconstruction_point', 'caller reconstruction point carriers'),
    `reconstruction semantics ${reconstructionPointCount} raw points in ${retainedReconstructionRowCount} retained rows (${missingReconstructionPointCount} missing retained points; ${excludedReconstructionPointCount} excluded outside the window)`,
    clause('derived_aggregate_evaluation', 'Cortexel-derived aggregate evaluations'),
    clause('declared_aggregate_point', 'caller-declared aggregate points'),
    clause('declared_initial_state', 'influential declared initial states'),
  ].join('; ')}.`;
}

function coalesceIndependentWeightIntervals(
  intervals: readonly IndependentWeightInterval[],
): IndependentWeightInterval[] {
  const output: IndependentWeightInterval[] = [];
  for (const interval of intervals) {
    const previous = output[output.length - 1];
    if (previous && interval.start <= previous.stop) {
      output[output.length - 1] = {
        start: previous.start,
        stop: Math.max(previous.stop, interval.stop),
      };
    } else {
      output.push({ start: interval.start, stop: interval.stop });
    }
  }
  return output;
}

function independentDeclaredInitialHold(
  view: IndependentWeightView,
  observation: JsonRecord,
  membershipLifetimes?: readonly IndependentWeightInterval[],
): { readonly start: number; readonly stop: number; readonly value: number } | undefined {
  if (
    observation.kind !== 'event_updated' ||
    observation.updateSemantics !== 'value_after_update' ||
    view.initialValue === undefined
  ) return undefined;
  const lifetime = membershipLifetimes?.find((candidate) =>
    view.initialStateTime >= candidate.start && view.initialStateTime < candidate.stop);
  if (membershipLifetimes && !lifetime) return undefined;
  const stop = Math.min(
    view.stateTrace.observations[0]?.time ?? view.stateStop,
    view.recordedStop,
    lifetime?.stop ?? view.recordedStop,
  );
  const start = Math.max(
    view.stateStart,
    view.recordedStart,
    lifetime?.start ?? view.recordedStart,
  );
  return stop > start
    ? { start, stop, value: view.initialValue }
    : undefined;
}

interface IndependentWeightStateWitness {
  readonly observation: IndependentObservation;
  readonly role: 'carry_in' | 'look_ahead';
  readonly consultedByDerivedAggregate?: boolean;
}

interface IndependentEventUpdatedMaterialization {
  readonly runs: readonly IndependentRenderRun[];
  readonly witnesses: readonly IndependentWeightStateWitness[];
  readonly initialStatePainted: boolean;
}

function independentEventUpdatedMaterialization(
  view: IndependentWeightView,
  updateSemantics: 'value_after_update' | 'value_before_update',
  membershipLifetimes?: readonly IndependentWeightInterval[],
): IndependentEventUpdatedMaterialization {
  const segments: {
    readonly start: number;
    readonly stop: number;
    readonly value: number | null;
    readonly observation?: IndependentObservation;
    readonly provenance?: JsonValue;
  }[] = [];
  const clippedInitialHold = independentDeclaredInitialHold(view, {
    kind: 'event_updated',
    updateSemantics,
  }, membershipLifetimes);
  if (clippedInitialHold && clippedInitialHold.stop > clippedInitialHold.start) {
    segments.push({
      start: clippedInitialHold.start,
      stop: clippedInitialHold.stop,
      value: clippedInitialHold.value,
      provenance: {
        seriesId: view.trace.id,
        sourceOrdinals: [],
        atomKind: 'hold_segment',
        segmentSource: 'declared_initial_weight',
      },
    });
  }
  for (let index = 0; index < view.stateTrace.observations.length; index++) {
    const observation = view.stateTrace.observations[index];
    const sourceStart = updateSemantics === 'value_after_update'
      ? observation.time
      : index === 0 ? view.stateStart : view.stateTrace.observations[index - 1].time;
    const sourceStop = updateSemantics === 'value_after_update'
      ? view.stateTrace.observations[index + 1]?.time ?? view.stateStop
      : observation.time;
    const lifetime = membershipLifetimes?.find((candidate) =>
      updateSemantics === 'value_after_update'
        ? observation.time >= candidate.start && observation.time < candidate.stop
        : observation.time > candidate.start && observation.time <= candidate.stop);
    if (membershipLifetimes && !lifetime) continue;
    const start = Math.max(sourceStart, view.recordedStart, lifetime?.start ?? sourceStart);
    const stop = Math.min(sourceStop, view.recordedStop, lifetime?.stop ?? sourceStop);
    if (!(stop > start)) continue;
    segments.push({
      start,
      stop,
      value: observation.value,
      observation,
      provenance: sourceProvenance(view.stateTrace, observation, 'hold_segment'),
    });
  }
  const runs: { vertices: { time: number; value: number; provenance: JsonValue }[] }[] = [];
  const retainedOrdinals = new Set(
    view.trace.observations.flatMap((observation) => observation.sourceOrdinals),
  );
  const witnesses = new Map<string, IndependentWeightStateWitness>();
  let paintedInitial = false;
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const segment = segments[segmentIndex];
    if (segment.observation && segment.observation.sourceOrdinals.some(
      (ordinal) => !retainedOrdinals.has(ordinal),
    )) {
      const role: IndependentWeightStateWitness['role'] =
        segment.observation.time < view.recordedStart ? 'carry_in' : 'look_ahead';
      witnesses.set(
        `${role}:${segment.observation.sourceOrdinals.join(',')}`,
        { observation: segment.observation, role },
      );
    }
    if (record(segment.provenance).segmentSource === 'declared_initial_weight') paintedInitial = true;
    if (segment.value === null || segment.provenance === undefined) continue;
    const startProvenance = {
      ...record(segment.provenance),
      segmentIndex,
      endpoint: 'start',
    } as JsonValue;
    const stopProvenance = {
      ...record(segment.provenance),
      segmentIndex,
      endpoint: 'stop',
    } as JsonValue;
    const previous = runs[runs.length - 1];
    if (previous && previous.vertices[previous.vertices.length - 1].time === segment.start) {
      previous.vertices.push(
        { time: segment.start, value: segment.value, provenance: startProvenance },
        { time: segment.stop, value: segment.value, provenance: stopProvenance },
      );
    } else {
      runs.push({
        vertices: [
          { time: segment.start, value: segment.value, provenance: startProvenance },
          { time: segment.stop, value: segment.value, provenance: stopProvenance },
        ],
      });
    }
  }
  if (updateSemantics === 'value_after_update' && view.recordedFinalEdgeInclusive) {
    const terminalObservation = view.stateTrace.observations.find((observation) =>
      observation.time === view.recordedStop && observation.value !== null);
    const terminalLifetime = membershipLifetimes?.find((lifetime) =>
      terminalObservation !== undefined &&
      terminalObservation.time >= lifetime.start && terminalObservation.time < lifetime.stop);
    if (terminalObservation && (!membershipLifetimes || terminalLifetime)) {
      runs.push({
        vertices: [{
          time: terminalObservation.time,
          value: terminalObservation.value!,
          provenance: {
            seriesId: view.stateTrace.id,
            sourceOrdinals: [...terminalObservation.sourceOrdinals],
            atomKind: 'observation_vertex',
            terminalClosedStop: true,
          },
        }],
      });
    }
  }
  return {
    runs,
    witnesses: [...witnesses.values()],
    initialStatePainted: paintedInitial,
  };
}

function eventUpdatedRuns(
  view: IndependentWeightView,
  updateSemantics: 'value_after_update' | 'value_before_update',
): IndependentRenderRun[] {
  return [...independentEventUpdatedMaterialization(view, updateSemantics).runs];
}

function mergeIndependentWeightStateWitnesses(
  ...groups: readonly (readonly IndependentWeightStateWitness[] | undefined)[]
): IndependentWeightStateWitness[] {
  const merged = new Map<string, IndependentWeightStateWitness>();
  for (const group of groups) {
    for (const witness of group ?? []) {
      const key = `${witness.role}:${witness.observation.sourceOrdinals.join(',')}`;
      const prior = merged.get(key);
      merged.set(key, {
        observation: witness.observation,
        role: witness.role,
        ...(
          prior?.consultedByDerivedAggregate === true ||
          witness.consultedByDerivedAggregate === true
            ? { consultedByDerivedAggregate: true }
            : {}
        ),
      });
    }
  }
  return [...merged.values()].sort((left, right) =>
    left.observation.time - right.observation.time ||
    left.observation.sourceOrdinals[0] - right.observation.sourceOrdinals[0]);
}

function prepareWeightMember(
  raw: JsonRecord,
  observation: JsonRecord,
  targetValueUnit: string,
  data: JsonRecord,
  parameters: JsonRecord,
  window: WindowV1,
  hasRecordedInterval: boolean,
  sourceIndex: number,
): IndependentWeightView {
  const time = record(raw.time);
  const values = record(raw.values);
  const interval = hasRecordedInterval ? record(raw.recordedInterval) : record(data.window);
  const intervalUnit = String(interval.unit);
  const intervalStart = intervalUnit === window.unit
    ? Number(interval.start)
    : convert(Number(interval.start), intervalUnit, window.unit);
  const intervalStop = intervalUnit === window.unit
    ? Number(interval.stop)
    : convert(Number(interval.stop), intervalUnit, window.unit);
  const recordedStart = Math.max(window.start, intervalStart);
  const recordedStop = Math.min(window.stop, intervalStop);
  const intervalFinalEdgeInclusive = typeof interval.boundary === 'string' &&
    interval.boundary.endsWith(']');
  const recordedFinalEdgeInclusive =
    (recordedStop !== window.stop || window.finalEdgeInclusive) &&
    (recordedStop !== intervalStop || intervalFinalEdgeInclusive);
  const input: TraceInputV1 = {
    id: String(raw.edgeId ?? raw.groupId),
    label: String(raw.label ?? raw.groupLabel ?? raw.edgeId ?? raw.groupId),
    observationKind: observation.kind === 'event_updated' ? 'piecewise_constant' : 'point_sample',
    times: numberArray(time.values),
    timeUnit: String(time.unit),
    values: nullableNumberArray(values.values),
    valueUnit: String(values.unit),
  };
  const trace = prepareIndependentTrace(input, {
    window: {
      start: recordedStart,
      stop: recordedStop,
      unit: window.unit,
      finalEdgeInclusive: recordedFinalEdgeInclusive,
    },
    ...duplicateOptions(parameters),
    targetValueUnit,
  });
  const stateTrace = prepareIndependentTrace(input, {
    window: {
      start: intervalStart,
      stop: intervalStop,
      unit: window.unit,
      finalEdgeInclusive: intervalFinalEdgeInclusive,
    },
    ...duplicateOptions(parameters),
    targetValueUnit,
  });
  const initialQuantity = record(record(raw.initialWeight).quantity);
  const initialValue = typeof initialQuantity.value === 'number'
    ? String(initialQuantity.unit) === targetValueUnit
      ? initialQuantity.value
      : convert(initialQuantity.value, String(initialQuantity.unit), targetValueUnit)
    : undefined;
  const view: IndependentWeightView = {
    raw,
    sourceIndex,
    uncertainty: record(raw.uncertainty),
    trace,
    stateTrace,
    recordedStart,
    recordedStop,
    recordedFinalEdgeInclusive,
    stateStart: intervalStart,
    stateStop: intervalStop,
    initialStateTime: intervalStart,
    ...(initialValue === undefined ? {} : { initialValue }),
  };
  if (observation.kind === 'event_updated') {
    return {
      ...view,
      renderRuns: eventUpdatedRuns(
        view,
        observation.updateSemantics === 'value_before_update'
          ? 'value_before_update'
          : 'value_after_update',
      ),
    };
  }
  if (observation.kind === 'interpolated_trajectory') {
    if (independentTrajectoryNeedsExcludedKnot(view)) {
      throw new Error('the accepted reconstruction depends on an excluded boundary knot');
    }
    return { ...view, renderRuns: independentTrajectoryRuns(view) };
  }
  return view;
}

function countForObservation(
  counts: readonly number[],
  ordinals: readonly number[],
): number | null {
  const selected = ordinals.map((ordinal) => counts[ordinal]);
  return selected.length > 0 && selected.every((value) => value === selected[0])
    ? selected[0]
    : null;
}

interface IndependentWeightTableSeries {
  readonly view: IndependentWeightView;
  readonly observation: JsonRecord;
  readonly carrierKind: Exclude<IndependentWeightCarrierKind, 'declared_initial_state'>;
  readonly counts?: {
    readonly memberCounts: readonly number[];
    readonly contributingCounts: readonly number[];
  };
  readonly stateWitnesses?: readonly IndependentWeightStateWitness[];
  readonly initialStatePainted?: boolean;
  readonly initialStateConsumedByDerivedAggregate?: boolean;
  readonly membershipLifetimes?: readonly IndependentWeightInterval[];
  readonly renderRuns?: readonly IndependentRenderRun[];
}

function independentWeightRenderTopology(
  runs: readonly IndependentRenderRun[] | undefined,
  sourceOrdinals: readonly number[],
  timeUnit: string,
  declaredInitialState = false,
): { readonly paintedInterval: Cell; readonly renderRunOrdinal: number | null } {
  let matchedRunOrdinal: number | null = null;
  let paintedFrom: number | undefined;
  let paintedUntil: number | undefined;
  for (let renderRunOrdinal = 0; renderRunOrdinal < (runs?.length ?? 0); renderRunOrdinal++) {
    let matchedRun = false;
    for (const vertex of runs![renderRunOrdinal].vertices) {
      const provenance = record(vertex.provenance);
      const provenanceOrdinals = array(provenance.sourceOrdinals);
      const matches = declaredInitialState
        ? provenance.segmentSource === 'declared_initial_weight'
        : provenanceOrdinals.length === sourceOrdinals.length &&
          provenanceOrdinals.every((value, index) => value === sourceOrdinals[index]);
      if (!matches) continue;
      matchedRun = true;
      if (provenance.atomKind === 'hold_segment') {
        if (provenance.endpoint === 'start') paintedFrom = vertex.time;
        if (provenance.endpoint === 'stop') paintedUntil = vertex.time;
      }
    }
    if (!matchedRun) continue;
    if (matchedRunOrdinal !== null && matchedRunOrdinal !== renderRunOrdinal) {
      throw new Error('one independently derived weight carrier belongs to multiple render runs');
    }
    matchedRunOrdinal = renderRunOrdinal;
  }
  return {
    paintedInterval:
      paintedFrom !== undefined &&
      paintedUntil !== undefined &&
      paintedUntil > paintedFrom
        ? structuredCell({ from: paintedFrom, until: paintedUntil, unit: timeUnit })
        : null,
    renderRunOrdinal: matchedRunOrdinal,
  };
}

function independentDuplicateResolutionMetadata(
  observation: IndependentObservation,
  parameters: JsonRecord,
): JsonRecord {
  if (observation.replicateCount <= 1) return {};
  const options = duplicateOptions(parameters);
  if (options.duplicatePolicy !== 'aggregate' || typeof options.aggregateMethod !== 'string') {
    throw new Error('independent weight duplicate carrier lacks its aggregate method');
  }
  return {
    duplicateResolution: {
      policy: 'aggregate',
      method: options.aggregateMethod,
    },
  };
}

function independentPreparedWeightMetadata(
  semantics: JsonRecord,
  observation: IndependentObservation,
  parameters: JsonRecord,
): Cell {
  const metadata: JsonRecord = {
    ...(semantics.kind === 'interpolated_trajectory'
      ? {
        reconstruction: {
          method: semantics.method ?? null,
          interpolant: semantics.interpolant ?? null,
          reconstructedBy: semantics.reconstructedBy ?? null,
        },
      }
      : {}),
    ...independentDuplicateResolutionMetadata(observation, parameters),
  };
  return Object.keys(metadata).length === 0 ? null : structuredCell(metadata);
}

function bindIndependentWeightRunOrdinals(
  runs: readonly IndependentRenderRun[],
): readonly IndependentRenderRun[] {
  return runs.map((run, renderRunOrdinal) => ({
    vertices: run.vertices.map((vertex) => ({
      ...vertex,
      provenance: {
        ...record(vertex.provenance),
        renderRunOrdinal,
      },
    })),
  }));
}

function independentWeightModelsInData(data: JsonRecord): string[] {
  const records = data.mode === 'preaggregated'
    ? [record(data.aggregate)]
    : array(data.series).map(record);
  return [...new Set(records.flatMap((raw) => {
    const aggregateModels = array(raw.synapseModels).filter(
      (model): model is string => typeof model === 'string',
    );
    return aggregateModels.length > 0
      ? aggregateModels
      : typeof raw.synapseModel === 'string' ? [raw.synapseModel] : [];
  }))];
}

function independentWeightModelCell(
  raw: JsonRecord,
  data: JsonRecord,
  parameters: JsonRecord,
): Cell {
  const aggregateModels = array(raw.synapseModels).filter(
    (model): model is string => typeof model === 'string',
  );
  const actualModels = aggregateModels.length > 0
    ? aggregateModels
    : typeof raw.synapseModel === 'string' ? [raw.synapseModel] : [];
  const comparability = record(parameters.weightComparability);
  const mode = String(comparability.mode);
  const declaredModels = mode === 'declared_comparable_models'
    ? array(comparability.comparableModels).filter(
      (model): model is string => typeof model === 'string',
    )
    : independentWeightModelsInData(data);
  return structuredCell({
    kind: 'weight_model_comparability',
    actualModels,
    declaredModels,
    comparabilityMode: mode,
  });
}

function independentWeightRows(
  data: JsonRecord,
  parameters: JsonRecord,
  entries: readonly IndependentWeightTableSeries[],
): {
  readonly rows: readonly Cell[][];
  readonly carrierCounts: Readonly<IndependentWeightCarrierCounts>;
  readonly sourceReadingCount: number;
  readonly missingSourceReadingCount: number;
} {
  const scopeSummary = weightTraceScopeSummaryCell(data.scope);
  const rows: Cell[][] = [];
  const carrierCounts = emptyIndependentWeightCarrierCounts();
  let sourceReadingCount = 0;
  let missingSourceReadingCount = 0;
  const account = (kind: IndependentWeightCarrierKind, value: number | null): void => {
    carrierCounts[kind].total++;
    if (value === null) carrierCounts[kind].missing++;
  };
  const append = (
    entry: IndependentWeightTableSeries,
  ): void => {
    const { view, observation: semantics, carrierKind, counts } = entry;
    const endpoints = record(view.raw.endpoints);
    const eventKinds = array(view.raw.eventKinds);
    const initialInfluential = entry.initialStatePainted === true ||
      entry.initialStateConsumedByDerivedAggregate === true;
    const initialHold = initialInfluential
      ? independentDeclaredInitialHold(view, semantics, entry.membershipLifetimes)
      : undefined;
    const appendWitness = (
      witness: IndependentWeightStateWitness,
      carrierOrdinal: number,
    ): void => {
      const sample = witness.observation;
      const ordinal = sample.sourceOrdinals.length === 1 ? sample.sourceOrdinals[0] : undefined;
      const [lower, upper, uncertaintyMethod] = uncertaintyCells(
        view.uncertainty,
        ordinal,
        view.stateTrace,
        sample.value,
      );
      const rowEvents = sample.sourceOrdinals.flatMap((sourceOrdinal) =>
        typeof eventKinds[sourceOrdinal] === 'string' ? [eventKinds[sourceOrdinal] as string] : []);
      const topology = independentWeightRenderTopology(
        entry.renderRuns,
        sample.sourceOrdinals,
        view.stateTrace.timeUnit,
      );
      account('source_state_witness', sample.value);
      rows.push([
        String(view.raw.edgeId ?? view.raw.groupId),
        String(view.raw.label ?? view.raw.groupLabel ?? view.raw.edgeId ?? view.raw.groupId),
        typeof endpoints.sourceId === 'string' ? endpoints.sourceId : null,
        typeof endpoints.targetId === 'string' ? endpoints.targetId : null,
        independentWeightModelCell(view.raw, data, parameters),
        sample.time,
        view.stateTrace.timeUnit,
        sample.value,
        view.stateTrace.valueUnit,
        String(semantics.kind),
        typeof semantics.updateSemantics === 'string' ? semantics.updateSemantics : null,
        topology.paintedInterval,
        topology.renderRunOrdinal,
        rowEvents.length === 0 ? null : traceCell(rowEvents),
        sample.value === null ? 'true' : 'false',
        null,
        null,
        null,
        lower,
        upper,
        uncertaintyMethod,
        structuredCell(view.raw.initialWeight),
        structuredCell(view.raw.bounds),
        'source_state_witness',
        carrierOrdinal,
        structuredCell({
          role: witness.role,
          directlyPainted: topology.renderRunOrdinal !== null,
          consultedByDerivedAggregate:
            witness.consultedByDerivedAggregate === true,
          ...independentDuplicateResolutionMetadata(sample, parameters),
        }),
        traceCell(sample.sourceOrdinals),
        scopeSummary,
      ]);
    };
    const witnesses = [...(entry.stateWitnesses ?? [])];
    for (let index = 0; index < witnesses.length; index++) {
      if (witnesses[index].role === 'carry_in') appendWitness(witnesses[index], index);
    }
    if (initialHold) {
      const topology = independentWeightRenderTopology(
        entry.renderRuns,
        [],
        view.trace.timeUnit,
        true,
      );
      account('declared_initial_state', initialHold.value);
      rows.push([
        String(view.raw.edgeId ?? view.raw.groupId),
        String(view.raw.label ?? view.raw.groupLabel ?? view.raw.edgeId ?? view.raw.groupId),
        typeof endpoints.sourceId === 'string' ? endpoints.sourceId : null,
        typeof endpoints.targetId === 'string' ? endpoints.targetId : null,
        independentWeightModelCell(view.raw, data, parameters),
        initialHold.start,
        view.trace.timeUnit,
        initialHold.value,
        view.trace.valueUnit,
        String(semantics.kind),
        String(semantics.updateSemantics),
        topology.paintedInterval,
        topology.renderRunOrdinal,
        null,
        'false',
        null,
        null,
        null,
        null,
        null,
        null,
        structuredCell(view.raw.initialWeight),
        structuredCell(view.raw.bounds),
        'declared_initial_state',
        0,
        structuredCell({
          directlyPainted: topology.renderRunOrdinal !== null,
          consumedByDerivedAggregate: entry.initialStateConsumedByDerivedAggregate === true,
          declaredAt: view.initialStateTime,
          declaredAtUnit: view.trace.timeUnit,
        }),
        null,
        scopeSummary,
      ]);
    }
    for (let index = 0; index < view.trace.observations.length; index++) {
      const sample = view.trace.observations[index];
      const ordinal = sample.sourceOrdinals.length === 1 ? sample.sourceOrdinals[0] : undefined;
      const [lower, upper, uncertaintyMethod] = uncertaintyCells(
        view.uncertainty,
        ordinal,
        view.trace,
        sample.value,
      );
      const observationKind = String(semantics.kind);
      const updateSemantics = typeof semantics.updateSemantics === 'string'
        ? semantics.updateSemantics
        : null;
      const topology = independentWeightRenderTopology(
        entry.renderRuns,
        sample.sourceOrdinals,
        view.trace.timeUnit,
      );
      const isSourceObservation = carrierKind === 'source_observation';
      const hasSourceLineage = isSourceObservation ||
        semantics.kind === 'interpolated_trajectory';
      const rowEvents = isSourceObservation
        ? sample.sourceOrdinals.flatMap((sourceOrdinal) =>
          typeof eventKinds[sourceOrdinal] === 'string' ? [eventKinds[sourceOrdinal] as string] : [])
        : [];
      account(carrierKind, sample.value);
      if (isSourceObservation) {
        sourceReadingCount += sample.replicateCount;
        missingSourceReadingCount += sample.sourceValues.filter((value) => value === null).length;
      }
      rows.push([
        String(view.raw.edgeId ?? view.raw.groupId),
        String(view.raw.label ?? view.raw.groupLabel ?? view.raw.edgeId ?? view.raw.groupId),
        typeof endpoints.sourceId === 'string' ? endpoints.sourceId : null,
        typeof endpoints.targetId === 'string' ? endpoints.targetId : null,
        independentWeightModelCell(view.raw, data, parameters),
        sample.time,
        view.trace.timeUnit,
        sample.value,
        view.trace.valueUnit,
        observationKind,
        updateSemantics,
        topology.paintedInterval,
        topology.renderRunOrdinal,
        rowEvents.length === 0 ? null : traceCell(rowEvents),
        sample.value === null ? 'true' : 'false',
        hasSourceLineage ? sample.replicateCount : null,
        counts ? countForObservation(counts.memberCounts, sample.sourceOrdinals) : null,
        counts ? countForObservation(counts.contributingCounts, sample.sourceOrdinals) : null,
        lower,
        upper,
        uncertaintyMethod,
        structuredCell(view.raw.initialWeight),
        structuredCell(view.raw.bounds),
        carrierKind,
        index,
        independentPreparedWeightMetadata(semantics, sample, parameters),
        hasSourceLineage ? traceCell(sample.sourceOrdinals) : null,
        scopeSummary,
      ]);
    }
    for (let index = 0; index < witnesses.length; index++) {
      if (witnesses[index].role === 'look_ahead') appendWitness(witnesses[index], index);
    }
  };
  for (const entry of entries) append(entry);
  return { rows, carrierCounts, sourceReadingCount, missingSourceReadingCount };
}

function weightAggregateValue(values: readonly number[], method: string): number | null {
  if (values.length === 0) return null;
  if (method === 'mean') return exactBinary64Mean(values);
  if (method === 'median') return quantile(values, 0.5);
  if (method === 'min') return sequenceMinimum(values);
  return sequenceMaximum(values);
}

function independentMemberAvailability(
  member: IndependentWeightView,
  lifetimes: readonly IndependentWeightInterval[],
): IndependentWeightInterval[] {
  return lifetimes.flatMap((interval) => {
    const start = Math.max(interval.start, member.recordedStart);
    const stop = Math.min(interval.stop, member.recordedStop);
    return stop > start ? [{ start, stop }] : [];
  });
}

function independentUnionAvailability(
  members: readonly IndependentWeightView[],
  intervals: ReadonlyMap<string, readonly IndependentWeightInterval[]>,
): IndependentWeightInterval[] {
  const pieces = members.flatMap((member) =>
    independentMemberAvailability(member, intervals.get(member.trace.id) ?? []));
  pieces.sort((left, right) => left.start - right.start || left.stop - right.stop);
  return coalesceIndependentWeightIntervals(pieces);
}

function independentAvailabilityTransitions(
  members: readonly IndependentWeightView[],
  intervals: ReadonlyMap<string, readonly IndependentWeightInterval[]>,
): number[] {
  const transitions = members.flatMap((member) =>
    independentMemberAvailability(member, intervals.get(member.trace.id) ?? [])
      .flatMap((interval) => [interval.start, interval.stop]));
  transitions.sort((left, right) => left - right);
  return transitions.filter((time, index) => index === 0 || time !== transitions[index - 1]);
}

function independentAvailabilityConnects(
  availability: readonly IndependentWeightInterval[],
  from: number,
  to: number,
): boolean {
  if (!(to > from)) return true;
  return availability.some((interval) => interval.start <= from && interval.stop >= to);
}

function crossesIndependentAvailabilityTransition(
  transitions: readonly number[],
  from: number,
  to: number,
): boolean {
  let lower = 0;
  let upper = transitions.length;
  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (transitions[middle] <= from) lower = middle + 1;
    else upper = middle;
  }
  return lower < transitions.length && transitions[lower] < to;
}

function independentPointRuns(
  view: IndependentWeightView,
  availability: readonly IndependentWeightInterval[],
  filterPointsByAvailability: boolean,
  membershipLifetimes: readonly IndependentWeightInterval[] = [],
  availabilityTransitions: readonly number[] = [],
): {
  readonly runs: readonly IndependentRenderRun[];
  readonly markerObservationIndexes: readonly number[];
} {
  const runs: { vertices: { time: number; value: number; provenance: JsonValue }[] }[] = [];
  const markerObservationIndexes: number[] = [];
  let current: (typeof runs)[number] | undefined;
  for (let index = 0; index < view.trace.observations.length; index++) {
    const observation = view.trace.observations[index];
    const belongs = membershipLifetimes.some((interval) =>
      observation.time >= interval.start && observation.time < interval.stop);
    const recorded = observation.time >= view.recordedStart &&
      (observation.time < view.recordedStop ||
        (view.recordedFinalEdgeInclusive && observation.time === view.recordedStop));
    const available = !filterPointsByAvailability || (belongs && recorded);
    if (!available || observation.value === null) {
      current = undefined;
      continue;
    }
    markerObservationIndexes.push(index);
    const previousTime = current?.vertices[current.vertices.length - 1]?.time;
    if (
      !current || previousTime === undefined ||
      crossesIndependentAvailabilityTransition(
        availabilityTransitions,
        previousTime,
        observation.time,
      ) ||
      !independentAvailabilityConnects(availability, previousTime, observation.time)
    ) {
      current = { vertices: [] };
      runs.push(current);
    }
    current.vertices.push({
      time: observation.time,
      value: observation.value,
      provenance: sourceProvenance(view.trace, observation, 'observation_vertex'),
    });
  }
  return { runs, markerObservationIndexes };
}

function independentMarkerIndexesForRuns(
  view: IndependentWeightView,
  runs: readonly IndependentRenderRun[],
): number[] {
  const lineages = new Set<string>();
  for (const run of runs) {
    for (const vertex of run.vertices) {
      const ordinals = array(record(vertex.provenance).sourceOrdinals);
      if (ordinals.length > 0) lineages.add(canonicalize(ordinals));
    }
  }
  return view.trace.observations.flatMap((observation, index) =>
    lineages.has(canonicalize([...observation.sourceOrdinals])) ? [index] : []);
}

function independentTrajectoryNeedsExcludedKnot(view: IndependentWeightView): boolean {
  const retained = new Set(
    view.trace.observations.flatMap((observation) => observation.sourceOrdinals),
  );
  const observations = view.stateTrace.observations;
  for (let index = 1; index < observations.length; index++) {
    const left = observations[index - 1];
    const right = observations[index];
    if (left.value === null || right.value === null || !(right.time > left.time)) continue;
    const overlapStart = Math.max(left.time, view.recordedStart);
    const overlapStop = Math.min(right.time, view.recordedStop);
    if (
      overlapStop > overlapStart &&
      (left.sourceOrdinals.some((ordinal) => !retained.has(ordinal)) ||
        right.sourceOrdinals.some((ordinal) => !retained.has(ordinal)))
    ) return true;
  }
  return false;
}

function independentTrajectoryRuns(
  view: IndependentWeightView,
  atomKind = 'reconstruction_vertex',
): IndependentRenderRun[] {
  const runs: { vertices: { time: number; value: number; provenance: JsonValue }[] }[] = [];
  let current: (typeof runs)[number] | undefined;
  for (const observation of view.trace.observations) {
    if (observation.value === null) {
      current = undefined;
      continue;
    }
    if (!current) {
      current = { vertices: [] };
      runs.push(current);
    }
    current.vertices.push({
      time: observation.time,
      value: observation.value,
      provenance: sourceProvenance(view.trace, observation, atomKind),
    });
  }
  return runs;
}

function deriveIndependentWeightAggregate(
  data: JsonRecord,
  parameters: JsonRecord,
  window: WindowV1,
  members: readonly IndependentWeightView[],
): {
  readonly view: IndependentWeightView;
  readonly memberCounts: readonly number[];
  readonly contributingCounts: readonly number[];
  readonly selected: readonly IndependentWeightView[];
  readonly intervals: ReadonlyMap<string, readonly IndependentWeightInterval[]>;
  readonly stateWitnessesByMember: ReadonlyMap<string, readonly IndependentWeightStateWitness[]>;
  readonly initialStateContributorIds: ReadonlySet<string>;
} {
  const membership = record(data.membership);
  const aggregate = record(parameters.aggregate);
  const evaluation = record(aggregate.evaluation);
  const observation = record(data.observation);
  const membershipUnit = String(membership.unit);
  const intervals = new Map<string, readonly IndependentWeightInterval[]>();
  const membershipEndpointSet = new Set<number>();
  for (const memberValue of array(membership.members)) {
    const member = record(memberValue);
    const convertedIntervals = array(member.intervals).map((value) => {
      const interval = record(value);
      const converted = {
        start: membershipUnit === window.unit
          ? Number(interval.start)
          : convert(Number(interval.start), membershipUnit, window.unit),
        stop: membershipUnit === window.unit
          ? Number(interval.stop)
          : convert(Number(interval.stop), membershipUnit, window.unit),
      };
      membershipEndpointSet.add(converted.start);
      membershipEndpointSet.add(converted.stop);
      return converted;
    });
    intervals.set(String(member.edgeId), coalesceIndependentWeightIntervals(convertedIntervals));
  }
  const selected = members.filter((member) => intervals.has(member.trace.id));
  const timeSet = new Set<number>();
  const addTime = (time: number): void => {
    if (inWindow(time, window)) timeSet.add(time);
  };
  switch (evaluation.mode) {
    case 'hold_last_observed_at_declared_times': {
      const declared = record(evaluation.times);
      for (const value of array(declared.values)) {
        const numericValue = Number(value);
        addTime(
          declared.unit === window.unit
            ? numericValue
            : convert(numericValue, String(declared.unit), window.unit),
        );
      }
      break;
    }
    case 'shared_sample_grid':
      for (const time of selected[0]?.trace.times ?? []) addTime(time);
      break;
    case 'hold_last_observed_at_union_times':
      addTime(window.start);
      if (window.finalEdgeInclusive) addTime(window.stop);
      for (const time of membershipEndpointSet) addTime(time);
      for (const member of selected) {
        for (const time of member.trace.times) addTime(time);
        addTime(member.recordedStart);
        addTime(member.recordedStop);
      }
      break;
    default:
      throw new Error(
        `unsupported independent synaptic-weight aggregate evaluation mode ${String(evaluation.mode)}`,
      );
  }
  const times = [...timeSet].sort((left, right) => left - right);
  // Each evaluation grid is sorted above.  One stateful cursor per member makes
  // membership and sample lookup linear in the traversed interval/sample arrays;
  // there is no interval scan or findIndex for every member/time pair.
  const states = selected.map((member) => {
    const lifetimes = intervals.get(member.trace.id)!;
    const stateTrace = observation.kind === 'point_sample' ? member.trace : member.stateTrace;
    const pointIndexByTime = new Map<number, number>();
    for (let index = 0; index < member.trace.times.length; index++) {
      if (!pointIndexByTime.has(member.trace.times[index])) {
        pointIndexByTime.set(member.trace.times[index], index);
      }
    }
    return {
      member,
      stateTrace,
      lifetimes,
      lifetimeIndex: 0,
      before: 0,
      after: -1,
      pointIndexByTime,
      retainedSourceOrdinals: new Set(
        member.trace.observations.flatMap((candidate) => candidate.sourceOrdinals),
      ),
    };
  });
  const memberCounts: number[] = [];
  const contributingCounts: number[] = [];
  const dispersion = record(aggregate.dispersion);
  const values: (number | null)[] = [];
  const dispersionValues: (number | null)[] = [];
  const lowerValues: (number | null)[] = [];
  const upperValues: (number | null)[] = [];
  const stateWitnessMaps = new Map<string, Map<string, IndependentWeightStateWitness>>();
  const initialStateContributorIds = new Set<string>();
  for (const time of times) {
    const present: number[] = [];
    let memberCount = 0;
    for (const state of states) {
      while (
        state.lifetimeIndex < state.lifetimes.length &&
        time >= state.lifetimes[state.lifetimeIndex].stop
      ) state.lifetimeIndex++;
      const lifetime = state.lifetimes[state.lifetimeIndex];
      const belongs = lifetime !== undefined && time >= lifetime.start && time < lifetime.stop;
      if (belongs) memberCount++;
      const member = state.member;
      if (
        !lifetime || !belongs ||
        time < member.recordedStart ||
        time > member.recordedStop ||
        (!member.recordedFinalEdgeInclusive && time === member.recordedStop)
      ) continue;
      let candidate: number | null;
      let candidateObservation: IndependentObservation | undefined;
      let usedInitialState = false;
      if (observation.kind === 'point_sample') {
        const index = state.pointIndexByTime.get(time);
        candidate = index === undefined ? null : member.trace.values[index];
      } else if (observation.updateSemantics === 'value_before_update') {
        while (state.before < state.stateTrace.times.length && state.stateTrace.times[state.before] < time) {
          state.before++;
        }
        const candidateTime = state.stateTrace.times[state.before];
        candidateObservation = state.stateTrace.observations[state.before];
        const usable = state.before < state.stateTrace.values.length &&
          candidateTime >= Math.max(lifetime.start, member.stateStart) &&
          candidateTime <= lifetime.stop;
        candidate = usable ? state.stateTrace.values[state.before] : null;
        if (!usable) candidateObservation = undefined;
      } else {
        while (
          state.after + 1 < state.stateTrace.times.length &&
          state.stateTrace.times[state.after + 1] <= time
        ) state.after++;
        const candidateTime = state.stateTrace.times[state.after];
        if (
          state.after >= 0 &&
          candidateTime >= Math.max(lifetime.start, member.stateStart)
        ) {
          candidate = state.stateTrace.values[state.after];
          candidateObservation = state.stateTrace.observations[state.after];
        } else {
          const initialBelongsToLifetime = member.initialValue !== undefined &&
            member.initialStateTime >= lifetime.start &&
            member.initialStateTime < lifetime.stop;
          candidate = initialBelongsToLifetime ? member.initialValue! : null;
          usedInitialState = initialBelongsToLifetime;
        }
      }
      if (candidateObservation && candidateObservation.sourceOrdinals.some(
        (ordinal) => !state.retainedSourceOrdinals.has(ordinal),
      )) {
        const role: IndependentWeightStateWitness['role'] =
          candidateObservation.time < member.recordedStart ? 'carry_in' : 'look_ahead';
        const byMember = stateWitnessMaps.get(member.trace.id) ??
          new Map<string, IndependentWeightStateWitness>();
        byMember.set(
          `${role}:${candidateObservation.sourceOrdinals.join(',')}`,
          {
            observation: candidateObservation,
            role,
            consultedByDerivedAggregate: true,
          },
        );
        stateWitnessMaps.set(member.trace.id, byMember);
      }
      if (usedInitialState) initialStateContributorIds.add(member.trace.id);
      if (typeof candidate === 'number') present.push(candidate);
    }
    memberCounts.push(memberCount);
    contributingCounts.push(present.length);
    const aggregateValue = weightAggregateValue(present, String(aggregate.method));
    values.push(aggregateValue);
    if (dispersion.kind === 'standard_deviation') {
      if (present.length < 2 || aggregateValue === null) {
        dispersionValues.push(null);
      } else {
        dispersionValues.push(exactBinary64SampleStandardDeviation(present));
      }
    } else if (dispersion.kind === 'quantile_interval') {
      if (present.length === 0) {
        lowerValues.push(null);
        upperValues.push(null);
      } else {
        lowerValues.push(quantile(present, Number(dispersion.lowerQuantile)));
        upperValues.push(quantile(present, Number(dispersion.upperQuantile)));
      }
    } else if (dispersion.kind === 'ensemble_range') {
      lowerValues.push(present.length > 0 ? sequenceMinimum(present) : null);
      upperValues.push(present.length > 0 ? sequenceMaximum(present) : null);
    }
  }
  let uncertainty: JsonRecord;
  if (dispersion.kind === 'standard_deviation') {
    uncertainty = {
      kind: 'standard_deviation',
      unit: selected[0]?.trace.valueUnit ?? 'nest:weight',
      values: dispersionValues,
      sampleCount: dispersionValues.map((value, index) => value === null ? null : contributingCounts[index]),
      basis: 'ensemble_members',
    };
  } else if (dispersion.kind === 'quantile_interval') {
    uncertainty = {
      kind: 'quantile_interval',
      unit: selected[0]?.trace.valueUnit ?? 'nest:weight',
      lower: lowerValues,
      upper: upperValues,
      lowerQuantile: Number(dispersion.lowerQuantile),
      upperQuantile: Number(dispersion.upperQuantile),
      method: 'empirical_type_7_linear',
      sampleCount: contributingCounts.map((count) => count > 0 ? count : null),
      basis: 'ensemble_members',
    };
  } else if (dispersion.kind === 'ensemble_range') {
    uncertainty = {
      kind: 'ensemble_range',
      unit: selected[0]?.trace.valueUnit ?? 'nest:weight',
      lower: lowerValues,
      upper: upperValues,
      sampleCount: contributingCounts.map((count) => count > 0 ? count : null),
      basis: 'ensemble_members',
    };
  } else {
    uncertainty = { kind: 'none', reason: String(dispersion.reason ?? 'not_computed') };
  }
  const groupId = String(membership.groupId);
  const groupLabel = String(membership.groupLabel ?? groupId);
  const valueUnit = selected[0]?.trace.valueUnit ?? 'nest:weight';
  const raw: JsonRecord = {
    groupId,
    groupLabel,
    synapseModels: [...new Set(selected.map((member) => String(member.raw.synapseModel)))],
    weightComparabilityMode: String(record(parameters.weightComparability).mode),
    method: String(aggregate.method),
    observation: observation as JsonValue,
    time: { kind: 'time', unit: window.unit, values: times },
    values: { kind: 'synaptic_weight', unit: valueUnit, values },
    memberCounts,
    contributingCounts,
    uncertainty,
  };
  let view = prepareWeightMember(
    raw,
    observation,
    valueUnit,
    data,
    parameters,
    window,
    false,
    members.length,
  );
  view = {
    ...view,
    aggregate: true,
    uncertainty,
  };
  return {
    view,
    memberCounts,
    contributingCounts,
    selected,
    intervals,
    stateWitnessesByMember: new Map(
      [...stateWitnessMaps].map(([id, byKey]) => [id, [...byKey.values()]]),
    ),
    initialStateContributorIds,
  };
}

function weightReferenceGeometry(
  members: readonly IndependentWeightView[],
  parameters: JsonRecord,
): AuthorityGeometryEntryV1[] {
  if (parameters.showReferenceLines !== true) return [];
  const output: AuthorityGeometryEntryV1[] = [];
  for (const member of members) {
    const initial = record(member.raw.initialWeight);
    if (typeof record(initial.quantity).value === 'number') {
      output.push(carrier('references', {
        seriesId: member.trace.id,
        atomKind: 'reference_rule',
        reference: 'initial',
      }));
    }
    const bounds = record(member.raw.bounds);
    if (typeof record(bounds.lower).value === 'number') {
      output.push(carrier('references', {
        seriesId: member.trace.id,
        atomKind: 'reference_rule',
        reference: 'lower',
      }));
    }
    if (typeof record(bounds.upper).value === 'number') {
      output.push(carrier('references', {
        seriesId: member.trace.id,
        atomKind: 'reference_rule',
        reference: 'upper',
      }));
    }
  }
  return output;
}

function weightModel(requestValue: JsonValue): {
  readonly rows: readonly (readonly Cell[])[];
  readonly geometry: readonly AuthorityGeometryEntryV1[];
  readonly summary: Readonly<Record<string, AuthoritySummaryScalarV1>>;
  readonly disclosures: Readonly<DisclosureFacts>;
} {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const window = windowFrom(data.window);
  const dataObservation = record(data.observation);
  let members: IndependentWeightView[] = [];
  let aggregate: IndependentWeightView | undefined;
  let derived: ReturnType<typeof deriveIndependentWeightAggregate> | undefined;
  let counts: { readonly memberCounts: readonly number[]; readonly contributingCounts: readonly number[] } | undefined;
  let table: ReturnType<typeof independentWeightRows>;
  let drawn: readonly IndependentWeightView[];
  let references: readonly IndependentWeightView[];
  let modelMembers: readonly IndependentWeightView[];
  let sourceMembers: readonly IndependentWeightView[];
  let reconstructionMembers: readonly IndependentWeightView[];
  let identifiedMembers: readonly IndependentWeightView[];
  if (data.mode === 'preaggregated') {
    const raw = record(data.aggregate);
    const observation = record(raw.observation);
    aggregate = prepareWeightMember(
      raw,
      observation,
      String(record(raw.values).unit),
      data,
      parameters,
      window,
      false,
      0,
    );
    aggregate = { ...aggregate, aggregate: true };
    counts = {
      memberCounts: numberArray(raw.memberCounts),
      contributingCounts: numberArray(raw.contributingCounts),
    };
    const eventMaterialization = observation.kind === 'event_updated'
      ? independentEventUpdatedMaterialization(
        aggregate,
        observation.updateSemantics === 'value_before_update'
          ? 'value_before_update'
          : 'value_after_update',
      )
      : undefined;
    const aggregateRenderRuns = bindIndependentWeightRunOrdinals(
      eventMaterialization?.runs ??
      independentTrajectoryRuns(
        aggregate,
        observation.kind === 'interpolated_trajectory'
          ? 'reconstruction_vertex'
          : 'observation_vertex',
      ),
    );
    aggregate = { ...aggregate, renderRuns: aggregateRenderRuns };
    table = independentWeightRows(data, parameters, [{
      view: aggregate,
      observation,
      carrierKind: 'declared_aggregate_point',
      counts,
      stateWitnesses: eventMaterialization?.witnesses,
      initialStatePainted: eventMaterialization?.initialStatePainted,
      renderRuns: aggregateRenderRuns,
    }]);
    drawn = [aggregate];
    references = [aggregate];
    modelMembers = [aggregate];
    sourceMembers = [];
    reconstructionMembers = observation.kind === 'interpolated_trajectory' ? [aggregate] : [];
    identifiedMembers = [];
  } else {
    const rawSeries = array(data.series).map(record);
    const derivedDisplay = parameters.display === 'aggregate_derived' ||
      parameters.display === 'aggregate_derived_with_members';
    const membershipIds = new Set(
      array(record(data.membership).members).map((candidate) =>
        String(record(candidate).edgeId)),
    );
    const targetRaw = derivedDisplay
      ? rawSeries.find((candidate) => membershipIds.has(String(candidate.edgeId)))
      : rawSeries[0];
    const targetUnit = String(record(targetRaw?.values).unit);
    members = rawSeries.map((raw, index) => prepareWeightMember(
      raw,
      dataObservation,
      targetUnit,
      data,
      parameters,
      window,
      true,
      index,
    ));
    if (parameters.display === 'aggregate_derived' || parameters.display === 'aggregate_derived_with_members') {
      derived = deriveIndependentWeightAggregate(data, parameters, window, members);
      aggregate = derived.view;
      counts = {
        memberCounts: derived.memberCounts,
        contributingCounts: derived.contributingCounts,
      };
    }
    const selected = derived?.selected ?? [];
    const paintedMemberIds = parameters.display === 'individual'
      ? new Set(members.map((member) => member.trace.id))
      : parameters.display === 'aggregate_derived_with_members'
        ? new Set(selected.map((member) => member.trace.id))
        : new Set<string>();
    const eventSemantics = dataObservation.updateSemantics === 'value_before_update'
      ? 'value_before_update'
      : 'value_after_update';
    const globalAvailabilityTransitions = derived
      ? independentAvailabilityTransitions(selected, derived.intervals)
      : [];
    const paintedEventMaterializations = new Map<string, IndependentEventUpdatedMaterialization>();
    const memberRuns = new Map<string, readonly IndependentRenderRun[]>();
    const memberMarkerIndexes = new Map<string, readonly number[]>();
    if (dataObservation.kind === 'event_updated') {
      for (const member of members) {
        if (!paintedMemberIds.has(member.trace.id)) continue;
        const materialization = parameters.display === 'aggregate_derived_with_members'
          ? independentEventUpdatedMaterialization(
            member,
            eventSemantics,
            derived?.intervals.get(member.trace.id),
          )
          : independentEventUpdatedMaterialization(member, eventSemantics);
        paintedEventMaterializations.set(member.trace.id, materialization);
        const runs = bindIndependentWeightRunOrdinals(materialization.runs);
        memberRuns.set(member.trace.id, runs);
        if (parameters.display === 'aggregate_derived_with_members') {
          memberMarkerIndexes.set(
            member.trace.id,
            independentMarkerIndexesForRuns(member, runs),
          );
        }
      }
    } else {
      for (const member of members) {
        if (!paintedMemberIds.has(member.trace.id)) continue;
        if (
          dataObservation.kind === 'point_sample' &&
          parameters.display === 'aggregate_derived_with_members'
        ) {
          const lifetimes = derived?.intervals.get(member.trace.id) ?? [];
          const point = independentPointRuns(
            member,
            independentMemberAvailability(member, lifetimes),
            true,
            lifetimes,
            globalAvailabilityTransitions,
          );
          memberRuns.set(
            member.trace.id,
            bindIndependentWeightRunOrdinals(point.runs),
          );
          memberMarkerIndexes.set(
            member.trace.id,
            point.markerObservationIndexes,
          );
        } else {
          memberRuns.set(
            member.trace.id,
            bindIndependentWeightRunOrdinals(independentTrajectoryRuns(
              member,
              dataObservation.kind === 'interpolated_trajectory'
                ? 'reconstruction_vertex'
                : 'observation_vertex',
            )),
          );
        }
      }
    }
    if (aggregate && derived) {
      const aggregateRuns = dataObservation.kind === 'event_updated'
        ? independentEventUpdatedMaterialization(aggregate, eventSemantics).runs
        : independentPointRuns(
          aggregate,
          independentUnionAvailability(selected, derived.intervals),
          false,
          [],
          globalAvailabilityTransitions,
        ).runs;
      aggregate = {
        ...aggregate,
        renderRuns: bindIndependentWeightRunOrdinals(aggregateRuns),
      };
    }
    const sourceCarrierKind: IndependentWeightTableSeries['carrierKind'] =
      dataObservation.kind === 'interpolated_trajectory'
        ? 'caller_reconstruction_point'
        : 'source_observation';
    const tableEntries: readonly IndependentWeightTableSeries[] = [
      ...members.map((member): IndependentWeightTableSeries => ({
        view: member,
        observation: dataObservation,
        carrierKind: sourceCarrierKind,
        stateWitnesses: mergeIndependentWeightStateWitnesses(
          paintedEventMaterializations.get(member.trace.id)?.witnesses,
          derived?.stateWitnessesByMember.get(member.trace.id),
        ),
        initialStatePainted:
          paintedEventMaterializations.get(member.trace.id)?.initialStatePainted === true,
        initialStateConsumedByDerivedAggregate:
          derived?.initialStateContributorIds.has(member.trace.id) === true,
        ...(derived?.intervals.get(member.trace.id)
          ? { membershipLifetimes: derived.intervals.get(member.trace.id)! }
          : {}),
        ...(memberRuns.get(member.trace.id)
          ? { renderRuns: memberRuns.get(member.trace.id)! }
          : {}),
      })),
      ...(aggregate
        ? [{
          view: aggregate,
          observation: dataObservation,
          carrierKind: 'derived_aggregate_evaluation' as const,
          counts,
          renderRuns: aggregate.renderRuns,
        }]
        : []),
    ];
    table = independentWeightRows(data, parameters, tableEntries);
    const displayedSelected = parameters.display === 'aggregate_derived_with_members'
      ? selected.map((member) => ({
          ...member,
          renderRuns: memberRuns.get(member.trace.id)!,
          ...(memberMarkerIndexes.get(member.trace.id)
            ? { markerObservationIndexes: memberMarkerIndexes.get(member.trace.id)! }
            : {}),
        }))
      : [];
    drawn = parameters.display === 'individual'
      ? members.map((member) => ({
        ...member,
        renderRuns: memberRuns.get(member.trace.id)!,
        ...(memberMarkerIndexes.get(member.trace.id)
          ? { markerObservationIndexes: memberMarkerIndexes.get(member.trace.id)! }
          : {}),
      }))
      : [
        ...displayedSelected,
        ...(aggregate ? [aggregate] : []),
      ];
    references = parameters.display === 'individual'
      ? members
      : parameters.display === 'aggregate_derived_with_members'
        ? selected
        : [];
    modelMembers = parameters.display === 'individual' ? members : selected;
    sourceMembers = sourceCarrierKind === 'source_observation' ? members : [];
    reconstructionMembers = sourceCarrierKind === 'caller_reconstruction_point' ? members : [];
    identifiedMembers = parameters.display === 'individual' ? members : selected;
  }
  const rows = table.rows;
  const observation = data.mode === 'preaggregated'
    ? record(record(data.aggregate).observation)
    : dataObservation;
  const reconstruction = observation.kind === 'interpolated_trajectory';
  const geometry = [
    ...drawn.flatMap((view) => normalTraceGeometry(view, {
      paths: 'series_paths',
      samples: reconstruction ? 'reconstruction' : 'observations',
      uncertainty: 'uncertainty',
    }, parameters.showObservationMarkers === true, reconstruction
      ? {
        pathVertex: 'reconstruction_vertex',
        sampleMarker: 'reconstruction_marker',
        isolatedMarker: 'isolated_reconstruction_marker',
      }
      : undefined)),
    ...weightReferenceGeometry(references, parameters),
  ];
  const factViews = drawn;
  const traces = factViews.map((view) => view.trace);
  const uncertainties = factViews.map((view) => view.uncertainty);
  const rawModels = modelMembers.flatMap((view) => {
    const modelSet = array(view.raw.synapseModels).filter(
      (model): model is string => typeof model === 'string',
    );
    return modelSet.length > 0
      ? modelSet
      : typeof view.raw.synapseModel === 'string' ? [view.raw.synapseModel] : [];
  });
  const scope = record(data.scope);
  const declaredMemberCounts = data.mode === 'preaggregated'
    ? numberArray(record(data.aggregate).memberCounts)
    : [];
  const maximumConcurrentMembers = declaredMemberCounts.length === 0
    ? 0
    : Math.max(0, ...declaredMemberCounts);
  const excluded = sourceMembers.reduce(
    (sum, view) => sum + view.trace.excludedBelow + view.trace.excludedAbove,
    0,
  );
  const excludedReconstruction = reconstructionMembers.reduce(
    (sum, view) => sum + view.trace.excludedBelow + view.trace.excludedAbove,
    0,
  );
  const reconstructionPointCount = reconstructionMembers.reduce(
    (sum, view) => sum + array(record(view.raw.values).values).length,
    0,
  );
  const missingReconstructionPointCount = reconstructionMembers.reduce(
    (sum, view) => sum + view.trace.observations.reduce(
      (memberSum, candidate) => memberSum + candidate.sourceValues.filter(
        (value) => value === null,
      ).length,
      0,
    ),
    0,
  );
  const retainedReconstructionRowCount = reconstructionMembers.reduce(
    (sum, view) => sum + view.trace.observations.length,
    0,
  );
  const membership = record(data.membership);
  const comparability = record(parameters.weightComparability);
  const modelSet = [...new Set(rawModels)];
  const comparabilityClaim = canonicalize({
    mode: String(comparability.mode),
    models: modelSet,
  });
  const summary: Record<string, string> = {
    synapseCardinalityStatement: data.mode === 'preaggregated'
      ? `Unique synapse cardinality was not supplied; maximum concurrent memberCount is ${maximumConcurrentMembers}.`
      : `${identifiedMembers.length} identified synapse${identifiedMembers.length === 1 ? '' : 's'}.`,
    synapseModels: joinUnique(modelSet),
    weightUnit: traces[0]?.valueUnit ?? 'unknown',
    weightDimensionStatement: dimensionOf(traces[0]?.valueUnit ?? '') === 'simulator_defined'
      ? `simulator-defined; exact comparability claim ${comparabilityClaim}`
      : `registered ${String(dimensionOf(traces[0]?.valueUnit ?? '') ?? 'unknown')} dimension; exact comparability claim ${comparabilityClaim}`,
    windowStart: summaryNumber(window.start),
    windowStop: summaryNumber(window.stop),
    timeUnit: window.unit,
    observationStatement: observation.kind === 'interpolated_trajectory'
      ? `interpolated_trajectory (method=${String(observation.method)}; interpolant=${String(observation.interpolant)}; reconstructedBy=${String(observation.reconstructedBy)})`
      : `${String(observation.kind)}${typeof observation.updateSemantics === 'string' ? ` (${observation.updateSemantics})` : ''}`,
    duplicateTimeStatement: `Duplicate timestamps: ${duplicateStatement(
      parameters,
      (data.mode === 'preaggregated' ? [aggregate!] : members)
        .map((view) => view.trace),
    )}.`,
    retainedSourceRowCount: String(table.carrierCounts.source_observation.total),
    sourceReadingCount: String(table.sourceReadingCount),
    missingCount: String(table.missingSourceReadingCount),
    excludedCount: String(excluded),
    reconstructionPointCount: String(reconstructionPointCount),
    retainedReconstructionRowCount: String(retainedReconstructionRowCount),
    missingReconstructionPointCount: String(missingReconstructionPointCount),
    excludedReconstructionPointCount: String(excludedReconstruction),
    carrierStatement: independentWeightCarrierStatement(
      table.carrierCounts,
      table.sourceReadingCount,
      table.missingSourceReadingCount,
      excluded,
      reconstructionPointCount,
      retainedReconstructionRowCount,
      missingReconstructionPointCount,
      excludedReconstruction,
    ),
    displayMode: String(parameters.display),
    aggregateStatement: parameters.display === 'aggregate_declared'
      ? `The caller declared a ${String(record(data.aggregate).method)} aggregate using interval method ${String(record(data.aggregate).intervalMethod)}; Cortexel did not receive member observations and cannot re-derive either claim.`
      : aggregate
        ? `Cortexel-derived ${String(record(parameters.aggregate).method)} over the declared membership; denominator is contributingCount and zero contributors yield missing.`
        : 'No aggregate was requested.',
    membershipStatement: Object.keys(membership).length > 0
      ? `${String(membership.groupId)} with ${array(membership.members).length} identified members represented by declared half-open membership intervals.`
      : data.mode === 'preaggregated'
        ? 'Member identities were not supplied with the caller-declared aggregate.'
        : 'No aggregate membership was declared.',
    referenceStatement: parameters.showReferenceLines === true
      ? `${weightReferenceGeometry(references, parameters).length} declared initial-weight/bound reference lines are shown; they never clamp observations.`
      : 'Declared initial weights and bounds are not drawn as reference lines.',
    scopeStatement: weightTraceScopeSummaryCell(data.scope),
    uncertaintyStatement: weightUncertaintyStatement(uncertainties),
    compactionStatement: noCompactionStatement(),
  };
  const uncertaintySeriesShown = factViews.filter((view) =>
    independentViewHasCompleteDrawableUncertainty(
      view,
      parameters.showObservationMarkers === true,
    )).length;
  return {
    rows,
    geometry,
    summary,
    disclosures: traceDisclosureFacts(request, parameters, traces, uncertainties, {
      ...(typeof scope.kind === 'string' ? { scopeKind: scope.kind } : {}),
      ...(typeof scope.rank === 'number' ? { rank: scope.rank } : {}),
      ...(typeof scope.worldSize === 'number' ? { worldSize: scope.worldSize } : {}),
      uncertaintySeriesShown,
    }),
  };
}

const WEIGHT_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('network.synaptic_weight_trace', 2),
  (request) => {
    const model = weightModel(request);
    return {
      'table.rows': rowSequence(model.rows),
      'geometry.sequence': geometrySequence(model.geometry),
      'summary.facts': summaryFactMap(model.summary),
      'disclosure.facts': disclosureFactMap(model.disclosures),
    };
  },
);

// Remaining family evaluators are appended below; keeping the common interpreter local
// prevents a compiler from importing and thereby sharing the independent derivation path.

export const TRACE_AUTHORITY_EVALUATORS: readonly RegisteredAuthorityEvaluatorV1[] = [
  ANALOG_AUTHORITY,
  COMPARTMENT_AUTHORITY,
  MULTISIGNAL_AUTHORITY,
  WEIGHT_AUTHORITY,
];
