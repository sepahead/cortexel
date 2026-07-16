/**
 * buildFigure — the end-to-end pipeline.
 *
 *   request -> validate -> derive (src/analysis) -> compile plan -> render SVG
 *           -> assemble FigureArtifactV1 + table + disclosures
 *
 * Rendering accepts ONLY a validated request (the branded token from the validation
 * pipeline). A plain object that merely looks validated cannot be rendered — the type
 * refuses it and, if forced, the runtime does too. That is what makes "no renderer may
 * bypass validation" a fact rather than a convention.
 *
 * The science happens once, in the derivation step, and the compiler consumes it. So the
 * CLI and React, both calling this, cannot disagree about a value.
 */

import {
  isValidatedRequest,
  parseAndValidateRequest,
  validateRequestValue,
  type ValidatedRequest,
  type ValidationOutcome,
  type ValidateOptions,
} from '../core/request.js';
import { canonicalDigest, canonicalDigestExcluding } from '../core/canonicalize.js';
import { deepFreeze } from '../core/deep-freeze.js';
import { sha256Digest, utf8ByteLength } from '../core/sha256.js';
import { deriveDisclosures, type Disclosure, type DisclosureFacts } from '../core/disclosures.js';
import {
  CATEGORICAL_SERIES_STYLES,
  SKILL_CATALOG,
  UNCERTAINTY_STYLES_BY_KIND,
} from '../generated/catalog.js';
import {
  axesAreCompatible,
  conversionFactor,
  conversionReceipt,
  convert,
  convertDifference,
  dimensionOf,
  unitLabel,
  type ConversionReceipt,
} from '../core/units.js';
import {
  edgesFromWidth,
  tryEdgesFromWidth,
  binCounts,
  binCenters,
  computePopulationRate,
  computeIsi,
  computeDegrees,
  computeMatrix,
  computeCorrelogram,
  countEligibleCorrelogramPairs,
  makeEventTable,
  applyTraceNormalization,
  binary64EffectWasPreserved,
  prepareTraceSeries,
  type Bins,
  type TraceAggregateMethod,
  type TraceDuplicatePolicy,
  type TraceNormalization,
  type TraceObservationKind,
  type PreparedTraceSeries,
  type TraceSeriesInput,
  type TraceWindow,
} from '../analysis/index.js';
import { countPlanResources, renderSvg, type SvgReport } from './svg.js';
import { formatNumber } from './format.js';
import { MIN_PLOT_PANEL_HEIGHT } from './layout.js';
import { compileLineFigure, compileStepFigure } from './compile.js';
import {
  compileBarFigure,
  compileRasterFigure,
  compileMatrixFigure,
  compileScatterFigure,
  compileStemFigure,
  compilePointsLineFigure,
  compileTrajectoryFigure,
  compileGraphFigure,
  compileTraceFigure,
  type TracePanelSpec,
} from './compileFamilies.js';
import type { CompileContext } from './compile.js';
import type { RenderPlanV1 } from './model/renderPlan.js';
import { getBuildIdentity } from '../generated/identity.js';
import { makeError, type CortexelError } from '../core/errors.js';
import {
  DEFAULT_PROFILE,
  trySelectTighterBudgetProfile,
  type BudgetProfileId,
} from '../core/limits.js';
import { finiteExtent } from '../core/numeric.js';
import { materializeCenteredLagBins } from '../core/binning.js';
import type { ErrorCode, ErrorStage } from '../generated/registry.js';

export interface FigureResult {
  readonly ok: true;
  readonly artifact: Record<string, unknown>;
  readonly svg: string;
  readonly plan: RenderPlanV1;
  readonly table: RenderPlanV1['table'];
  readonly disclosures: readonly Disclosure[];
}

export interface FigureFailure {
  readonly ok: false;
  readonly errors: readonly CortexelError[];
}

interface DerivationOperation {
  readonly id: string;
  readonly algorithm: string;
  readonly algorithmRevision: number;
  readonly parameters: Record<string, unknown>;
  readonly inputDigest?: string;
  readonly outputDigest?: string;
  readonly receipt: Record<string, unknown>;
}

interface CompiledFigure {
  readonly plan: RenderPlanV1;
  readonly rendererId: string;
  readonly derivationOperations: readonly DerivationOperation[];
  readonly derivedDisclosureFacts: Partial<DisclosureFacts>;
}

type CompileOutcome =
  | CompiledFigure
  | { readonly pending: string }
  | { readonly errors: readonly CortexelError[] };

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function arr(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}
function rec(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Build the disclosure facts from the canonical request.
 *
 * This is where the honesty promise is actually kept: a rank-local network figure only
 * gets its "partial network view" disclosure if `scopeKind` is threaded here from the
 * request, and a compacted figure only gets its downsampling disclosure if `compacted`
 * is set. So this reads the request's scope, node universe, multapse aggregation, missing
 * values, and uncertainty — not just the source — because every one of those is a fact a
 * disclosure rule fires on.
 */
function disclosureFacts(
  request: Record<string, unknown>,
  extra: Partial<DisclosureFacts>,
): DisclosureFacts {
  const source = rec(request.source) ?? {};
  const data = rec(request.data) ?? {};
  const parameters = rec(request.parameters) ?? {};
  const uncertainty = rec(parameters.uncertainty) ?? rec(data.uncertainty);
  const scope = rec(data.scope);
  const nodeUniverse = rec(data.nodeUniverse);

  // Count missing observations across any series/value array, so MISSING_VALUES_PRESENT
  // fires when a null observation is actually present.
  let missing = 0;
  const countMissing = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    const pending: object[] = [node];
    while (pending.length > 0) {
      const current = pending.pop()!;
      const values = Array.isArray(current)
        ? current
        : Object.values(current as Record<string, unknown>);
      for (const value of values) {
        if (value === null) missing++;
        else if (typeof value === 'object') pending.push(value);
      }
    }
  };
  countMissing(data.series);

  const facts: DisclosureFacts = {
    sourceKind: (source.kind as string) ?? 'unknown',
    sourceAuthenticityVerified: false,
    referenceComparisonRun: false,
    compacted: false,
    tableRowsInline: 0,
    tableRowsTotal: 0,
    callerNotePresent: typeof source.declaredNote === 'string',
    uncertaintyKind: uncertainty ? (uncertainty.kind as string) : undefined,
    uncertaintyReason: uncertainty ? (uncertainty.reason as string) : undefined,
    ...(scope ? { scopeKind: scope.kind as string } : {}),
    ...(scope && typeof scope.rank === 'number' ? { rank: scope.rank as number } : {}),
    ...(scope && typeof scope.worldSize === 'number' ? { worldSize: scope.worldSize as number } : {}),
    ...(scope && typeof scope.retainedConnectionCount === 'number'
      ? { retainedConnectionCount: scope.retainedConnectionCount as number, sampledRetained: scope.retainedConnectionCount as number }
      : {}),
    ...(scope && typeof scope.sourceConnectionCount === 'number'
      ? { sourceConnectionCount: scope.sourceConnectionCount as number, sampledSource: scope.sourceConnectionCount as number }
      : {}),
    ...(nodeUniverse && typeof nodeUniverse.complete === 'boolean'
      ? { nodeUniverseComplete: nodeUniverse.complete as boolean }
      : {}),
    ...(typeof parameters.multapseAggregation === 'string'
      ? { multapseAggregation: parameters.multapseAggregation as string }
      : {}),
    ...(missing > 0 ? { missingValueCount: missing } : {}),
    // A schematic layout carries no spatial meaning; disclose it whenever the layout mode
    // says so, in addition to the compiler-forced case for the connection graph.
    ...(typeof rec(parameters.layout)?.mode === 'string' &&
    (rec(parameters.layout)!.mode as string).startsWith('schematic')
      ? { schematicLayout: true }
      : {}),
    ...extra,
  };

  // Uncertainty fails closed: if a figure that CAN show uncertainty was given none — whether
  // by an explicit kind:'none' or by omitting the field entirely — it must disclose the
  // absence, so a missing band is never read as a small one.
  if (facts.uncertaintyKind === undefined) {
    (facts as { uncertaintyKind?: string; uncertaintyReason?: string }).uncertaintyKind = 'none';
    (facts as { uncertaintyReason?: string }).uncertaintyReason = 'not_provided';
  }

  // Spatial position coverage: a node in the universe with no declared position is omitted,
  // not placed at the origin, and that omission is disclosed.
  const positions = rec(data.positions);
  const universeIds = arr(nodeUniverse?.ids);
  const positionIds = arr(positions?.nodeIds);
  if (universeIds && positionIds && positionIds.length < universeIds.length) {
    (facts as { positionsMissing?: number; positionsTotal?: number }).positionsMissing =
      universeIds.length - positionIds.length;
    (facts as { positionsTotal?: number }).positionsTotal = universeIds.length;
  }

  return facts;
}

/**
 * Disclosures a figure must ALWAYS emit because they depend on a fact the compiler knows
 * rather than a field in the request — the correlogram's lag orientation, the matrix's
 * absent-is-not-zero, the schematic graph layout. These have a `() => false` predicate in
 * the registry precisely because the compiler, not a request field, decides they fire.
 */
function forcedDisclosures(skillId: string, request: Record<string, unknown>): string[] {
  const data = rec(request.data) ?? {};
  const forced: string[] = [];

  if (skillId === 'neuro.correlogram') {
    forced.push('LAG_ORIENTATION');
    // An autocorrelogram (one train) excludes each event's self-pairing.
    const distinctSenders = new Set(
      (arr(data.eventSenderIds) ?? []).filter((s): s is string => typeof s === 'string'),
    );
    if (distinctSenders.size < 2) forced.push('ZERO_LAG_SELF_PAIRS_EXCLUDED');
  }

  if (skillId === 'network.adjacency_matrix' || skillId === 'network.weight_matrix' || skillId === 'network.delay_matrix') {
    forced.push('ABSENT_IS_NOT_ZERO');
  }

  if (skillId === 'network.connection_graph') {
    // The 0.9.0 graph compiler uses a schematic circular layout, never measured positions.
    forced.push('SCHEMATIC_LAYOUT');
  }

  return forced;
}

function numbers(value: unknown): number[] {
  return (arr(value) ?? []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}
function strings(value: unknown): string[] {
  return (arr(value) ?? []).filter((v): v is string => typeof v === 'string');
}

/**
 * The declared final-edge convention for a bin spec, or undefined if not stated.
 *
 * A binned figure must honour the request's boundary rather than assume one, or the
 * largest observation could be included or dropped against the caller's intent.
 */
function binBoundaryInclusive(spec: Record<string, unknown> | undefined): boolean | undefined {
  if (!spec) return undefined;
  if (typeof spec.finalEdgeInclusive === 'boolean') return spec.finalEdgeInclusive;
  if (spec.boundary === '[start,stop]' || spec.boundary === '[lo,hi]') return true;
  if (spec.boundary === '[start,stop)' || spec.boundary === '[lo,hi)') return false;
  return undefined;
}

function eventCorrelogramInputs(
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
): {
  readonly ref: number[];
  readonly tgt: number[];
  readonly spec: Bins;
  readonly kind: 'auto' | 'cross';
  readonly lagUnit: string;
} | undefined {
  if (data.mode !== 'events') return undefined;
  const times = numbers(rec(data.eventTimes)?.values);
  const senders = strings(data.eventSenderIds);
  const lag = rec(parameters.lagRange);
  const bins = rec(parameters.bins);
  const min = num(lag?.min);
  const max = num(lag?.max);
  const width = num(bins?.width);
  if (min === undefined || max === undefined || width === undefined) return undefined;

  const distinct = [...new Set(senders)];
  const refId = distinct[0];
  const tgtId = distinct[1] ?? distinct[0];
  const kind: 'auto' | 'cross' = distinct.length < 2 ? 'auto' : 'cross';
  const materialized = materializeCenteredLagBins(min, max, width, 20_001);
  if (!materialized.ok) return undefined;
  return {
    ref: times.filter((_time, index) => senders[index] === refId),
    tgt: times.filter((_time, index) => senders[index] === tgtId),
    spec: { edges: [...materialized.edges], finalEdgeInclusive: true },
    kind,
    lagUnit: (lag?.unit as string) ?? 'ms',
  };
}

/** Apply the PSTH normalization the request declared, not a hardcoded per-trial divisor. */
function normalizePsth(counts: readonly number[], trials: number, normalization: string): number[] {
  switch (normalization) {
    case 'count':
      return [...counts];
    case 'count_per_trial':
    default:
      return counts.map((c) => c / trials);
  }
}

function psthYLabel(normalization: string): string {
  return normalization === 'count' ? 'count' : 'count / trial';
}

function traceWindowFrom(
  node: Record<string, unknown> | undefined,
  targetUnit?: string,
): TraceWindow | undefined {
  const start = num(node?.start);
  const stop = num(node?.stop);
  const sourceUnit = typeof node?.unit === 'string' ? node.unit : undefined;
  if (start === undefined || stop === undefined || sourceUnit === undefined) return undefined;
  const unit = targetUnit ?? sourceUnit;
  const convertedStart = sourceUnit === unit ? start : convert(start, sourceUnit, unit);
  const convertedStop = sourceUnit === unit ? stop : convert(stop, sourceUnit, unit);
  if (sourceUnit !== unit) {
    const expectedWidth = convertDifference(start, stop, sourceUnit, unit);
    const actualWidth = convertedStop - convertedStart;
    if (
      !(expectedWidth > 0) ||
      !Number.isFinite(expectedWidth) ||
      !Number.isFinite(actualWidth) ||
      !binary64EffectWasPreserved(expectedWidth, actualWidth)
    ) {
      throw new Error('trace window conversion materially distorted its width at binary64 resolution');
    }
  }
  return {
    start: convertedStart,
    stop: convertedStop,
    unit,
    finalEdgeInclusive: typeof node?.boundary === 'string' && node.boundary.endsWith(']'),
  };
}

function traceDuplicateOptions(parameters: Record<string, unknown>): {
  readonly duplicatePolicy?: TraceDuplicatePolicy;
  readonly aggregateMethod?: TraceAggregateMethod;
} {
  const policyNode = parameters.duplicateTimePolicy;
  const structuredPolicy = rec(policyNode);
  const duplicatePolicy = (
    typeof policyNode === 'string' ? policyNode : structuredPolicy?.policy
  ) as TraceDuplicatePolicy | undefined;
  const structuredAggregate = structuredPolicy?.aggregate;
  const aggregateMethod = (
    parameters.aggregateMethod ??
    parameters.duplicateTimeAggregate ??
    (typeof structuredAggregate === 'string'
      ? structuredAggregate
      : rec(structuredAggregate)?.method)
  ) as TraceAggregateMethod | undefined;
  return {
    ...(duplicatePolicy ? { duplicatePolicy } : {}),
    ...(aggregateMethod ? { aggregateMethod } : {}),
  };
}

function traceValues(node: Record<string, unknown> | undefined): (number | null)[] {
  return (arr(node?.values) ?? []).map((value) =>
    value === null ? null : typeof value === 'number' && Number.isFinite(value) ? value : null,
  );
}

function traceNormalizationFrom(
  parameters: Record<string, unknown>,
  displayWindow: TraceWindow,
): TraceNormalization | undefined {
  const normalization = rec(parameters.normalization);
  const method = normalization?.method as TraceNormalization['method'] | undefined;
  if (!normalization || !method) return undefined;
  const statisticsWindow = traceWindowFrom(rec(normalization.statisticsWindow), displayWindow.unit);
  return statisticsWindow ? { method, statisticsWindow } : undefined;
}

function prepareTrace(
  input: TraceSeriesInput,
  window: TraceWindow,
  parameters: Record<string, unknown>,
  targetValueUnit?: string,
  normalization?: TraceNormalization,
) {
  return prepareTraceSeries(input, {
    window,
    ...traceDuplicateOptions(parameters),
    ...(targetValueUnit ? { targetValueUnit } : {}),
    ...(normalization ? { normalization } : {}),
  });
}

function traceCell(values: readonly (string | number | null)[]): string | number | null {
  return values.length === 1 ? values[0] : JSON.stringify(values);
}

function traceUncertaintyTransform(
  declared: Record<string, unknown>,
  prepared: PreparedTraceSeries,
  value: unknown,
  dispersion: boolean,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const sourceUnit = typeof declared.unit === 'string' ? declared.unit : prepared.valueUnit;
  if (!prepared.normalization) {
    const converted = sourceUnit === prepared.valueUnit
      ? value
      : convert(value, sourceUnit, prepared.valueUnit);
    return Number.isFinite(converted) ? converted : null;
  }
  const sourceValue = sourceUnit === prepared.sourceValueUnit
    ? value
    : convert(value, sourceUnit, prepared.sourceValueUnit);
  return applyTraceNormalization(sourceValue, prepared.normalization, dispersion);
}

function traceUncertaintyDifferenceTransform(
  declared: Record<string, unknown>,
  prepared: PreparedTraceSeries,
  lower: number,
  upper: number,
): number {
  const sourceUnit = typeof declared.unit === 'string' ? declared.unit : prepared.valueUnit;
  const targetUnit = prepared.normalization ? prepared.sourceValueUnit : prepared.valueUnit;
  const convertedDifference = convertDifference(lower, upper, sourceUnit, targetUnit);
  return prepared.normalization
    ? applyTraceNormalization(convertedDifference, prepared.normalization, true)
    : convertedDifference;
}

function assertUncertaintyAffineSequence(
  sourceValues: readonly unknown[],
  transformedValues: readonly (number | null)[],
  transformDifference?: (lower: number, upper: number) => number | null,
  effectEpsilonMultiples?: number,
): void {
  const pairs = sourceValues.flatMap((source, index) =>
    typeof source === 'number' && Number.isFinite(source) &&
    typeof transformedValues[index] === 'number' && Number.isFinite(transformedValues[index])
      ? [{ source, transformed: transformedValues[index] as number }]
      : []);
  pairs.sort((left, right) => left.source - right.source || left.transformed - right.transformed);
  for (let index = 1; index < pairs.length; index++) {
    const previous = pairs[index - 1];
    const current = pairs[index];
    if (current.source === previous.source) continue;
    const actualDifference = current.transformed - previous.transformed;
    if (!(actualDifference > 0) || !Number.isFinite(actualDifference)) {
      throw new Error('uncertainty affine transform collapsed distinct values below binary64 resolution');
    }
    if (effectEpsilonMultiples === undefined || !transformDifference) continue;
    const expectedDifference = transformDifference(previous.source, current.source);
    if (
      expectedDifference === null ||
      !(expectedDifference > 0) ||
      !Number.isFinite(expectedDifference) ||
      !binary64EffectWasPreserved(expectedDifference, actualDifference, effectEpsilonMultiples)
    ) {
      throw new Error('uncertainty affine transform materially distorted distinct values at binary64 resolution');
    }
  }
}

function traceUncertaintyCells(
  uncertainty: Record<string, unknown> | undefined,
  sourceOrdinal: number | undefined,
  prepared: PreparedTraceSeries,
  displayedValue: number | null,
): readonly [number | null, number | null, string | null] {
  const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : undefined;
  if (!kind || kind === 'none' || sourceOrdinal === undefined) {
    const reason = typeof uncertainty?.reason === 'string' ? uncertainty.reason : undefined;
    return [null, null, kind === 'none' ? `none${reason ? ` (${reason})` : ''}` : null];
  }
  const declared = uncertainty ?? {};
  const effectEpsilonMultiples = prepared.normalization ? 32 : 8;
  const transform = (value: unknown, dispersion: boolean): number | null =>
    traceUncertaintyTransform(declared, prepared, value, dispersion);
  const describe = (extra: string[] = []): string => [kind, ...extra].join('; ');
  const sampleCount = arr(declared.sampleCount)?.[sourceOrdinal];
  if (kind === 'standard_deviation' || kind === 'standard_error') {
    const description = describe([
      `basis=${String(declared.basis ?? 'unspecified')}`,
      ...(typeof sampleCount === 'number' ? [`sampleCount=${sampleCount}`] : []),
    ]);
    const dispersion = transform(arr(declared.values)?.[sourceOrdinal], true);
    if (displayedValue === null || dispersion === null) return [null, null, description];
    const lower = displayedValue - dispersion;
    const upper = displayedValue + dispersion;
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
      throw new Error('uncertainty transformation produced a non-finite bound');
    }
    if (
      dispersion !== 0 &&
      (!binary64EffectWasPreserved(dispersion, displayedValue - lower, effectEpsilonMultiples) ||
        !binary64EffectWasPreserved(dispersion, upper - displayedValue, effectEpsilonMultiples))
    ) {
      throw new Error('uncertainty dispersion is distorted below binary64 resolution');
    }
    return [lower, upper, description];
  }
  const sourceLower = arr(declared.lower)?.[sourceOrdinal];
  const sourceUpper = arr(declared.upper)?.[sourceOrdinal];
  const lower = transform(sourceLower, false);
  const upper = transform(sourceUpper, false);
  if (
    typeof sourceLower === 'number' &&
    typeof sourceUpper === 'number' &&
    sourceLower < sourceUpper &&
    lower !== null &&
    upper !== null &&
    lower === upper
  ) {
    throw new Error('uncertainty interval collapsed below binary64 resolution');
  }
  if (
    typeof sourceLower === 'number' &&
    typeof sourceUpper === 'number' &&
    sourceLower < sourceUpper &&
    lower !== null &&
    upper !== null
  ) {
    const expectedWidth = traceUncertaintyDifferenceTransform(
      declared,
      prepared,
      sourceLower,
      sourceUpper,
    );
    const actualWidth = upper - lower;
    if (
      expectedWidth !== null &&
      expectedWidth > 0 &&
      Number.isFinite(expectedWidth) &&
      (!Number.isFinite(actualWidth) ||
        !binary64EffectWasPreserved(expectedWidth, actualWidth, effectEpsilonMultiples))
    ) {
      throw new Error('uncertainty interval width is distorted below binary64 resolution');
    }
  }
  const description = describe([
    ...(typeof declared.method === 'string' ? [`method=${declared.method}`] : []),
    ...(typeof declared.level === 'number' ? [`level=${declared.level}`] : []),
    ...(typeof declared.coverage === 'string' ? [`coverage=${declared.coverage}`] : []),
    ...(typeof declared.lowerQuantile === 'number'
      ? [`lowerQuantile=${declared.lowerQuantile}`]
      : []),
    ...(typeof declared.upperQuantile === 'number'
      ? [`upperQuantile=${declared.upperQuantile}`]
      : []),
    ...(typeof declared.basis === 'string' ? [`basis=${declared.basis}`] : []),
    ...(typeof sampleCount === 'number' ? [`sampleCount=${sampleCount}`] : []),
  ]);
  return [lower, upper, description];
}

function traceUncertaintyPresentation(
  uncertainty: Record<string, unknown> | undefined,
  prepared: PreparedTraceSeries,
): TracePanelSpec['series'][number]['uncertainty'] | undefined {
  const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : 'none';
  if (kind === 'none') return undefined;
  const registeredStyle = (UNCERTAINTY_STYLES_BY_KIND as Readonly<Record<string, {
    readonly mark: string;
    readonly label: string;
  }>>)[kind];
  if (!registeredStyle || (registeredStyle.mark !== 'band' && registeredStyle.mark !== 'whisker')) {
    throw new Error(`uncertainty kind ${kind} has no registered drawable mark`);
  }
  const basis = String(uncertainty?.basis ?? 'unspecified basis');
  const counts = prepared.observations
    .flatMap((observation) => observation.sourceOrdinals.length === 1
      ? [arr(uncertainty?.sampleCount)?.[observation.sourceOrdinals[0]]]
      : [])
    .filter((value): value is number => typeof value === 'number' && Number.isInteger(value));
  const uniqueCounts = [...new Set(counts)].sort((a, b) => a - b);
  const countLabel = uniqueCounts.length === 0
    ? 'not supplied'
    : uniqueCounts.length === 1
      ? String(uniqueCounts[0])
      : `${uniqueCounts[0]}–${uniqueCounts[uniqueCounts.length - 1]}, varying by point; exact n is in the table`;
  const substitutions: Readonly<Record<string, string>> = {
    level: typeof uncertainty?.level === 'number'
      ? formatNumber(uncertainty.level * 100)
      : 'not supplied',
    coverage: String(uncertainty?.coverage ?? 'not supplied'),
    method: String(uncertainty?.method ?? 'not supplied'),
    lowerQuantile: typeof uncertainty?.lowerQuantile === 'number'
      ? formatNumber(uncertainty.lowerQuantile)
      : 'not supplied',
    upperQuantile: typeof uncertainty?.upperQuantile === 'number'
      ? formatNumber(uncertainty.upperQuantile)
      : 'not supplied',
    basis,
    sampleCount: countLabel,
    reason: String(uncertainty?.reason ?? 'not supplied'),
  };
  const label = registeredStyle.label.replace(/\{(\w+)\}/g, (_whole, key: string) => {
    const replacement = substitutions[key];
    if (replacement === undefined) {
      throw new Error(`uncertainty style ${kind} has unresolved label placeholder ${key}`);
    }
    return replacement;
  });
  if (/\{\w+\}/.test(label)) {
    throw new Error(`uncertainty style ${kind} has an unresolved label placeholder`);
  }
  return {
    kind,
    mark: registeredStyle.mark,
    label,
  };
}

function traceUncertaintyArrays(
  uncertainty: Record<string, unknown> | undefined,
  prepared: PreparedTraceSeries,
): {
  readonly uncertaintyLower?: readonly (number | null)[];
  readonly uncertaintyUpper?: readonly (number | null)[];
  readonly uncertainty?: TracePanelSpec['series'][number]['uncertainty'];
} {
  const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : 'none';
  if (kind === 'none') return {};
  const lower: (number | null)[] = [];
  const upper: (number | null)[] = [];
  for (const observation of prepared.observations) {
    if (observation.sourceOrdinals.length !== 1) {
      throw new Error('uncertainty cannot be synthesized for an aggregated duplicate-time group');
    }
    const [lo, hi] = traceUncertaintyCells(
      uncertainty,
      observation.sourceOrdinals[0],
      prepared,
      observation.value,
    );
    // A declared interval remains inspectable in the table/canonical request, but it cannot
    // make a missing central observation visually present. Break the band at the same null
    // that breaks the trace instead of synthesizing continuous evidence through the gap.
    lower.push(observation.value === null ? null : lo);
    upper.push(observation.value === null ? null : hi);
  }
  const transformDifference = (lowerValue: number, upperValue: number): number | null =>
    traceUncertaintyDifferenceTransform(uncertainty ?? {}, prepared, lowerValue, upperValue);
  const effectEpsilonMultiples = prepared.normalization ? undefined : 8;
  if (kind === 'standard_deviation' || kind === 'standard_error') {
    const sourceDispersions = prepared.observations.map((observation) =>
      observation.sourceOrdinals.length === 1
        ? arr(uncertainty?.values)?.[observation.sourceOrdinals[0]]
        : null);
    const transformedDispersions = sourceDispersions.map((value) =>
      traceUncertaintyTransform(uncertainty ?? {}, prepared, value, true));
    assertUncertaintyAffineSequence(
      sourceDispersions,
      transformedDispersions,
      transformDifference,
      effectEpsilonMultiples,
    );
  } else {
    const sourceLower = prepared.observations.map((observation) =>
      observation.sourceOrdinals.length === 1
        ? arr(uncertainty?.lower)?.[observation.sourceOrdinals[0]]
        : null);
    const sourceUpper = prepared.observations.map((observation) =>
      observation.sourceOrdinals.length === 1
        ? arr(uncertainty?.upper)?.[observation.sourceOrdinals[0]]
        : null);
    assertUncertaintyAffineSequence(sourceLower, lower, transformDifference, effectEpsilonMultiples);
    assertUncertaintyAffineSequence(sourceUpper, upper, transformDifference, effectEpsilonMultiples);
  }
  return {
    uncertaintyLower: lower,
    uncertaintyUpper: upper,
    uncertainty: traceUncertaintyPresentation(uncertainty, prepared),
  };
}

function traceSeriesHasCompleteDrawableUncertainty(entry: TracePanelSpec['series'][number]): boolean {
  const lower = entry.uncertaintyLower;
  const upper = entry.uncertaintyUpper;
  if (!lower || !upper || !entry.uncertainty) return false;
  let observed = false;
  for (let index = 0; index < entry.series.values.length; index++) {
    if (entry.series.values[index] === null) continue;
    observed = true;
    if (
      typeof lower[index] !== 'number' || !Number.isFinite(lower[index]) ||
      typeof upper[index] !== 'number' || !Number.isFinite(upper[index])
    ) return false;
  }
  return observed;
}

function traceUncertaintyLengthMismatch(
  uncertainty: Record<string, unknown> | undefined,
  expected: number,
): { readonly key: string; readonly observed: number } | undefined {
  if (!uncertainty || uncertainty.kind === 'none') return undefined;
  for (const key of ['values', 'lower', 'upper', 'sampleCount'] as const) {
    const values = arr(uncertainty[key]);
    if (values && values.length !== expected) return { key, observed: values.length };
  }
  return undefined;
}

function traceUncertaintyValidationError(
  uncertainty: Record<string, unknown> | undefined,
  valueUnit: string,
  sourceValues: readonly (number | null)[],
  skillId: string,
  instancePath: string,
): CortexelError | undefined {
  const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : 'none';
  if (kind === 'none') return undefined;
  if (!(SKILL_CATALOG[skillId].uncertaintySupport as readonly string[]).includes(kind)) {
    return makeError({
      code: 'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
      stage: 'science',
      instancePath: `${instancePath}/kind`,
      skillId,
      message: `${skillId} does not support uncertainty kind ${kind}.`,
    });
  }
  if (kind === 'credible_interval') {
    return makeError({
      code: 'PROVENANCE_ATTESTATION_UNVERIFIED',
      stage: 'provenance',
      instancePath: `${instancePath}/kind`,
      skillId,
      message: 'a credible interval requires a verified external posterior attestation; request data cannot author that assurance.',
    });
  }
  const uncertaintyUnit = typeof uncertainty?.unit === 'string' ? uncertainty.unit : undefined;
  if (
    uncertaintyUnit &&
    (dimensionOf(uncertaintyUnit) !== dimensionOf(valueUnit) ||
      (dimensionOf(valueUnit) === 'simulator_defined' && uncertaintyUnit !== valueUnit))
  ) {
    return makeError({
      code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
      stage: 'science',
      instancePath: `${instancePath}/unit`,
      skillId,
      message: `uncertainty unit ${uncertaintyUnit} is not compatible with series unit ${valueUnit}.`,
    });
  }
  if (kind === 'standard_deviation' || kind === 'standard_error') {
    const values = arr(uncertainty?.values) ?? [];
    const sampleCount = arr(uncertainty?.sampleCount) ?? [];
    const invalid = values.findIndex((value) => typeof value === 'number' && value < 0);
    if (invalid >= 0) {
      return makeError({
        code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
        stage: 'science',
        instancePath: `${instancePath}/values/${invalid}`,
        skillId,
        message: `${kind} is a non-negative distance; a negative dispersion cannot be drawn.`,
      });
    }
    for (let index = 0; index < Math.min(values.length, sampleCount.length); index++) {
      if ((values[index] === null) !== (sampleCount[index] === null)) {
        return makeError({
          code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
          stage: 'science',
          instancePath: `${instancePath}/sampleCount/${index}`,
          skillId,
          message: `${kind} and sampleCount must be present or missing together at every point.`,
        });
      }
      if (sourceValues[index] === null && values[index] !== null) {
        return makeError({
          code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
          stage: 'science',
          instancePath: `${instancePath}/values/${index}`,
          skillId,
          message: `uncertainty at index ${index} cannot qualify a missing central observation. The uncertainty value and sample count must also be null.`,
        });
      }
    }
  }
  const lower = arr(uncertainty?.lower);
  const upper = arr(uncertainty?.upper);
  if (lower && upper) {
    const sampleCount = arr(uncertainty?.sampleCount);
    for (let index = 0; index < Math.min(lower.length, upper.length); index++) {
      const lo = lower[index];
      const hi = upper[index];
      if ((lo === null) !== (hi === null)) {
        return makeError({
          code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
          stage: 'science',
          instancePath: `${instancePath}/${hi === null ? 'upper' : 'lower'}/${index}`,
          skillId,
          message: `lower and upper uncertainty bounds must be present or missing together at index ${index}.`,
        });
      }
      if (sampleCount && index < sampleCount.length && ((lo === null) !== (sampleCount[index] === null))) {
        return makeError({
          code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
          stage: 'science',
          instancePath: `${instancePath}/sampleCount/${index}`,
          skillId,
          message: `uncertainty bounds and sampleCount must share one missingness mask at index ${index}.`,
        });
      }
      if (sourceValues[index] === null && lo !== null) {
        return makeError({
          code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
          stage: 'science',
          instancePath: `${instancePath}/lower/${index}`,
          skillId,
          message: `uncertainty bounds at index ${index} cannot qualify a missing central observation. Both bounds${sampleCount ? ' and sampleCount' : ''} must also be null.`,
        });
      }
      if (typeof lo === 'number' && typeof hi === 'number' && lo > hi) {
        return makeError({
          code: 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
          stage: 'science',
          instancePath: `${instancePath}/lower/${index}`,
          skillId,
          message: `uncertainty lower bound ${lo} exceeds upper bound ${hi}.`,
        });
      }
    }
  }
  if (
    kind === 'quantile_interval' &&
    typeof uncertainty?.lowerQuantile === 'number' &&
    typeof uncertainty?.upperQuantile === 'number' &&
    !(uncertainty.lowerQuantile < uncertainty.upperQuantile)
  ) {
    return makeError({
      code: 'SCIENCE_UNCERTAINTY_LEVEL_INVALID',
      stage: 'science',
      instancePath: `${instancePath}/upperQuantile`,
      skillId,
      message: 'the lower uncertainty quantile must be strictly below the upper quantile.',
    });
  }
  return undefined;
}

function traceOperation(
  inputPayload: unknown,
  prepared: PreparedTraceSeries,
  window: TraceWindow,
  parameters: Record<string, unknown>,
  uncertainty?: {
    readonly lower?: readonly (number | null)[];
    readonly upper?: readonly (number | null)[];
    readonly conversion?: ConversionReceipt;
  },
): DerivationOperation {
  const duplicate = traceDuplicateOptions(parameters);
  const retainedSourceCount = prepared.replicateCounts.reduce((sum, count) => sum + count, 0);
  return {
    id: `trace.prepare.${prepared.id}`,
    algorithm: 'cortexel.trace.prepare_series',
    algorithmRevision: 1,
    parameters: {
      window,
      duplicateTimePolicy: duplicate.duplicatePolicy ?? 'reject_if_present',
      ...(duplicate.aggregateMethod ? { aggregateMethod: duplicate.aggregateMethod } : {}),
      targetTimeUnit: prepared.timeUnit,
      targetValueUnit: prepared.valueUnit,
      ...(prepared.normalization ? { normalization: prepared.normalization.method } : {}),
    },
    inputDigest: canonicalDigest(inputPayload),
    outputDigest: canonicalDigest({
      id: prepared.id,
      observations: prepared.observations,
      timeUnit: prepared.timeUnit,
      valueUnit: prepared.valueUnit,
      sourceTimeUnit: prepared.sourceTimeUnit,
      sourceValueUnit: prepared.sourceValueUnit,
      ...(uncertainty?.lower ? { uncertaintyLower: uncertainty.lower } : {}),
      ...(uncertainty?.upper ? { uncertaintyUpper: uncertainty.upper } : {}),
    }),
    receipt: {
      inputObservationCount: prepared.inputCount,
      retainedObservationCount: retainedSourceCount,
      outputRowCount: prepared.outputCount,
      excludedBelowWindow: prepared.excludedBelow,
      excludedAboveWindow: prepared.excludedAbove,
      excludedOutOfWindow: prepared.excludedBelow + prepared.excludedAbove,
      missingObservationCount: prepared.missingCount,
      duplicateGroupCount: prepared.duplicateGroups,
      reordered: prepared.reordered,
      sourceOrderBoundByInputDigest: true,
      retainedSourceOrdinalDigest: canonicalDigest(
        prepared.observations.flatMap((observation) => observation.sourceOrdinals),
      ),
      ...(prepared.timeConversion ? { timeConversion: prepared.timeConversion } : {}),
      ...(prepared.valueConversion ? { valueConversion: prepared.valueConversion } : {}),
      ...(prepared.timeOffset ? { timeOffset: prepared.timeOffset } : {}),
      ...(prepared.normalization ? { normalization: prepared.normalization } : {}),
      ...(uncertainty?.lower || uncertainty?.upper
        ? {
          uncertaintyTransformed: true,
          ...(uncertainty.conversion ? { uncertaintyConversion: uncertainty.conversion } : {}),
        }
        : {}),
    },
  };
}

function traceDerivedFacts(
  series: readonly PreparedTraceSeries[],
  aggregateMethod?: TraceAggregateMethod,
  uncertainties: readonly (Record<string, unknown> | undefined)[] = [],
): Partial<DisclosureFacts> {
  const conversions: string[] = [];
  for (const prepared of series) {
    if (prepared.timeConversion) {
      conversions.push(
        `${prepared.id}: ${prepared.timeConversion.from} -> ${prepared.timeConversion.to} (factor ${prepared.timeConversion.factor})`,
      );
    }
    if (prepared.valueConversion) {
      conversions.push(
        `${prepared.id}: ${prepared.valueConversion.from} -> ${prepared.valueConversion.to} (factor ${prepared.valueConversion.factor})`,
      );
    }
    if (prepared.timeOffset && prepared.timeOffset.sourceUnit !== prepared.timeOffset.displayUnit) {
      conversions.push(
        `${prepared.id} offset: ${prepared.timeOffset.sourceUnit} -> ${prepared.timeOffset.displayUnit} (factor ${conversionFactor(prepared.timeOffset.sourceUnit, prepared.timeOffset.displayUnit)})`,
      );
    }
  }
  for (let index = 0; index < Math.min(series.length, uncertainties.length); index++) {
    const uncertainty = uncertainties[index];
    const sourceUnit = typeof uncertainty?.unit === 'string' ? uncertainty.unit : undefined;
    if (!sourceUnit || uncertainty?.kind === 'none') continue;
    const targetUnit = series[index].normalization
      ? series[index].sourceValueUnit
      : series[index].valueUnit;
    if (sourceUnit !== targetUnit) {
      conversions.push(
        `${series[index].id} uncertainty: ${sourceUnit} -> ${targetUnit} (factor ${conversionFactor(sourceUnit, targetUnit)})`,
      );
    }
  }
  const duplicateGroups = series.reduce((sum, prepared) => sum + prepared.duplicateGroups, 0);
  const missingOutputRows = series.reduce(
    (sum, prepared) => sum + prepared.observations.filter((observation) => observation.value === null).length,
    0,
  );
  const missingAggregateReplicateCount = series.reduce(
    (sum, prepared) => sum + prepared.observations.reduce(
      (seriesSum, observation) => seriesSum + (
        observation.replicateCount > 1 && observation.value !== null
          ? observation.sourceValues.filter((value) => value === null).length
          : 0
      ),
      0,
    ),
    0,
  );
  return {
    excludedOutOfWindow: series.reduce(
      (sum, prepared) => sum + prepared.excludedBelow + prepared.excludedAbove,
      0,
    ),
    missingValueCount: missingOutputRows,
    ...(missingAggregateReplicateCount > 0 ? { missingAggregateReplicateCount } : {}),
    ...(conversions.length > 0 ? { unitConversions: conversions } : {}),
    ...(duplicateGroups > 0 && aggregateMethod
      ? { duplicateTimeAggregateMethod: aggregateMethod }
      : {}),
  };
}

function tracePreparationError(
  error: unknown,
  skillId: string,
  instancePath: string,
): CortexelError {
  const message = error instanceof Error ? error.message : 'trace preparation failed';
  let code: ErrorCode = 'INTERNAL_INVARIANT_VIOLATED';
  let stage: ErrorStage = 'internal';
  if (message.includes('equal length')) {
    code = 'SEMANTIC_LENGTH_MISMATCH';
    stage = 'semantic';
  } else if (message.includes('duplicate')) {
    code = 'SCIENCE_DUPLICATE_TIME_POLICY';
    stage = 'science';
  } else if (
    message.includes('binary64 resolution') ||
    message.includes('overflowed') ||
    message.includes('overflows') ||
    message.includes('underflowed') ||
    message.includes('underflows to zero') ||
    message.includes('unrepresentable binary64') ||
    message.includes('collapsed') ||
    message.includes('clock conversion produced a non-finite time')
  ) {
    code = 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE';
    stage = 'science';
  } else if (message.includes('normalization') || message.includes('z_score') || message.includes('min_max')) {
    code = 'SCIENCE_NORMALIZATION_UNVERIFIABLE';
    stage = 'science';
  } else if (message.includes('uncertainty cannot be synthesized')) {
    code = 'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL';
    stage = 'science';
  } else if (message.includes('uncertainty')) {
    code = 'SCIENCE_UNCERTAINTY_BOUNDS_INVALID';
    stage = 'science';
  } else if (message.includes('convert') || message.includes('dimension') || message.includes('unit')) {
    code = 'SCIENCE_UNIT_DIMENSION_MISMATCH';
    stage = 'science';
  }
  return makeError({
    code,
    stage,
    instancePath,
    skillId,
    message: code === 'INTERNAL_INVARIANT_VIOLATED'
      ? 'validated trace data could not be transformed without violating a finite-output invariant'
      : message,
  });
}

/**
 * Dispatch a validated request to its family compiler.
 *
 * Specialized families derive through audited analysis helpers before geometry is built.
 * Other registered families still use their legacy compiler until their scientific
 * postconditions are closed; the dispatcher must therefore preserve typed refusal and
 * pending outcomes rather than imply that every renderer is already contract-complete.
 */
function compile(
  validated: ValidatedRequest,
  context: (rowsTotal: number, extraFacts?: Partial<DisclosureFacts>) => CompileContext,
  pairwiseOperations: number,
): CompileOutcome {
  const request = validated.canonicalRequest;
  const data = rec(request.data) ?? {};
  const parameters = rec(request.parameters) ?? {};
  const skillId = validated.skillId;
  const rendererId = SKILL_CATALOG[skillId].renderer.id;

  const done = (
    plan: RenderPlanV1,
    derivationOperations: readonly DerivationOperation[] = [],
    derivedDisclosureFacts: Partial<DisclosureFacts> = {},
  ): CompiledFigure => ({ plan, rendererId, derivationOperations, derivedDisclosureFacts });
  const fail = (
    code: ErrorCode,
    stage: ErrorStage,
    message: string,
    instancePath = '',
  ): CompileOutcome => ({
    errors: [makeError({ code, stage, message, instancePath, skillId })],
  });

  // ---- population rate -----------------------------------------------------
  if (skillId === 'neuro.population_rate') {
    const mode = data.mode as string;
    if (mode === 'events') {
      const times = numbers(rec(data.eventTimes)?.values);
      const recorded = strings(data.recordedSenderIds);
      const bins = rec(parameters.bins);
      const window = rec(data.window);
      const start = num(bins?.start) ?? num(window?.start) ?? 0;
      const stop = num(bins?.stop) ?? num(window?.stop) ?? 1;
      const width = num(bins?.width) ?? stop - start;
      const timeUnit = (bins?.unit as string) ?? (rec(data.eventTimes)?.unit as string) ?? 'ms';
      const normalization = (parameters.normalization as 'mean_rate_per_recorded_sender' | 'total_event_rate') ?? 'total_event_rate';
      const binSpec: Bins = { edges: edgesFromWidth(start, stop, width), finalEdgeInclusive: binBoundaryInclusive(bins) ?? binBoundaryInclusive(window) ?? true };
      const result = computePopulationRate(times, binSpec, timeUnit, recorded.length || 1, normalization);
      return done(compileStepFigure(context(result.count.length), result.binStart, result.binEnd, result.rateHz, `time (${unitLabel(timeUnit)})`, 'rate (Hz)', skillId));
    }
    const edges = numbers(rec(data.binEdges)?.edges);
    const rates = arr(rec(data.rates)?.values) ?? arr(data.counts) ?? [];
    const values = rates.map((v) => (typeof v === 'number' ? v : 0));
    return done(compileStepFigure(context(values.length), edges.slice(0, -1), edges.slice(1), values, 'time', 'rate (Hz)', skillId));
  }

  // ---- analog trace --------------------------------------------------------
  if (skillId === 'neuro.analog_trace') {
    const window = traceWindowFrom(rec(data.window));
    const rawSeries = arr(data.series) ?? [];
    const seriesIds = strings(data.seriesIds);
    if (!window || rawSeries.length === 0) return { pending: rendererId };

    const inputs = rawSeries.map((value, index): TraceSeriesInput => {
      const entry = rec(value) ?? {};
      const time = rec(entry.time) ?? {};
      const values = rec(entry.values) ?? {};
      return {
        id: seriesIds[index] ?? `series-${index + 1}`,
        label: typeof entry.label === 'string' ? entry.label : seriesIds[index] ?? `Series ${index + 1}`,
        observationKind: (entry.observationKind as TraceObservationKind) ?? 'point_sample',
        times: numbers(time.values),
        timeUnit: (time.unit as string) ?? window.unit,
        values: traceValues(values),
        valueUnit: (values.unit as string) ?? '1',
      };
    });
    const analogUncertainty = rec(parameters.uncertainty);
    if (analogUncertainty?.kind !== undefined && analogUncertainty.kind !== 'none' && inputs.length !== 1) {
      return fail(
        'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
        'science',
        'registry 1.0 analog uncertainty is figure-level and therefore unambiguous only for exactly one series. Use separate figures or declare uncertainty:none for a multi-series trace.',
        '/parameters/uncertainty',
      );
    }
    if (inputs.length === 1) {
      const uncertaintyError = traceUncertaintyValidationError(
        analogUncertainty,
        inputs[0].valueUnit,
        inputs[0].values,
        skillId,
        '/parameters/uncertainty',
      );
      if (uncertaintyError) return { errors: [uncertaintyError] };
      const mismatch = traceUncertaintyLengthMismatch(analogUncertainty, inputs[0].values.length);
      if (mismatch) {
        return fail(
          'SEMANTIC_LENGTH_MISMATCH',
          'semantic',
          `analog uncertainty.${mismatch.key} has ${mismatch.observed} entries for ${inputs[0].values.length} samples.`,
          `/parameters/uncertainty/${mismatch.key}`,
        );
      }
    }

    const layout = parameters.layout as string;
    if (layout === 'shared_axis' && inputs.length > CATEGORICAL_SERIES_STYLES.length) {
      return fail(
        'RENDER_SERIES_LIMIT_EXCEEDED',
        'render',
        `${inputs.length} series were assigned to one shared axis, but the registered palette has only ${CATEGORICAL_SERIES_STYLES.length} stable distinguishable style tuples.`,
        '/data/series',
      );
    }
    const panels: TracePanelSpec[] = [];
    if (layout === 'small_multiples') {
      const groupBy = (parameters.groupBy as string) ?? 'series';
      const groups = new Map<string, number[]>();
      for (let index = 0; index < inputs.length; index++) {
        const key = groupBy === 'quantity_kind'
          ? String(rec(rawSeries[index]) && rec(rec(rawSeries[index])!.values)?.kind)
          : inputs[index].id;
        const members = groups.get(key) ?? [];
        members.push(index);
        groups.set(key, members);
      }
      for (const [key, indexes] of groups) {
        if (indexes.length > CATEGORICAL_SERIES_STYLES.length) {
          return fail(
            'RENDER_SERIES_LIMIT_EXCEEDED',
            'render',
            `panel ${key} would overlay ${indexes.length} series, above the ${CATEGORICAL_SERIES_STYLES.length}-style distinguishability limit.`,
            '/data/series',
          );
        }
        if (groupBy === 'quantity_kind') {
          const dimensions = new Set(indexes.map((index) => dimensionOf(inputs[index].valueUnit)));
          const incompatible = indexes.length > 1 && indexes
            .slice(1)
            .some((index) => !axesAreCompatible(inputs[indexes[0]].valueUnit, inputs[index].valueUnit));
          if (dimensions.size > 1 || incompatible) {
            return fail(
              'SCIENCE_UNIT_DIMENSION_MISMATCH',
              'science',
              `quantity-kind group ${key} cannot share one numeric axis. Use groupBy=series; Cortexel will not force dimensionally incompatible or simulator-defined state variables into a comparison.`,
              '/parameters/groupBy',
            );
          }
        }
        const targetUnit = inputs[indexes[0]].valueUnit;
        const prepared: TracePanelSpec['series'][number][] = [];
        for (const index of indexes) {
          try {
            const series = prepareTrace(inputs[index], window, parameters, targetUnit);
            prepared.push({
              series,
              styleIndex: index,
              tableMetadata: { sourceIndex: index },
              ...traceUncertaintyArrays(analogUncertainty, series),
            });
          } catch (error) {
            return { errors: [tracePreparationError(error, skillId, `/data/series/${index}`)] };
          }
        }
        panels.push({
          id: `panel-${panels.length + 1}`,
          label: groupBy === 'series' ? prepared[0].series.label : key,
          yLabel: `value (${unitLabel(targetUnit)})`,
          series: prepared,
        });
      }
    } else {
      const targetUnit = (parameters.valueUnit as string) ?? inputs[0].valueUnit;
      const prepared: TracePanelSpec['series'][number][] = [];
      for (let index = 0; index < inputs.length; index++) {
        try {
          const series = prepareTrace(inputs[index], window, parameters, targetUnit);
          prepared.push({
            series,
            styleIndex: index,
            tableMetadata: { sourceIndex: index },
            ...traceUncertaintyArrays(analogUncertainty, series),
          });
        } catch (error) {
          return { errors: [tracePreparationError(error, skillId, `/data/series/${index}`)] };
        }
      }
      panels.push({
        id: 'main',
        label: 'Shared value axis',
        yLabel: `value (${unitLabel(targetUnit)})`,
        series: prepared,
      });
    }
    const allEntries = panels.flatMap((panel) => panel.series);
    const allPrepared = allEntries.map((entry) => entry.series);
    const empty = allPrepared.find((prepared) => prepared.outputCount === 0);
    if (empty) {
      return fail(
        'RENDER_NO_DATA',
        'render',
        `series ${empty.id} has no observation inside the declared display window. Cortexel refuses an empty trace because it is visually indistinguishable from a measured flat or silent signal.`,
        '/data/window',
      );
    }
    const rowsTotal = allPrepared.reduce(
      (total, entry) => total + entry.outputCount,
      0,
    );
    const duplicate = traceDuplicateOptions(parameters);
    const uncertaintyDeclared = analogUncertainty?.kind !== undefined && analogUncertainty.kind !== 'none';
    const derivedFacts: Partial<DisclosureFacts> = {
      ...traceDerivedFacts(
        allPrepared,
        duplicate.aggregateMethod,
        allPrepared.map(() => analogUncertainty),
      ),
      uncertaintySeriesDeclared: uncertaintyDeclared ? 1 : 0,
      uncertaintySeriesShown: allEntries.filter(traceSeriesHasCompleteDrawableUncertainty).length,
      uncertaintySeriesTotal: allEntries.length,
    };
    const operations = allEntries.map((entry) => {
      const sourceIndex = Number(entry.tableMetadata?.sourceIndex ?? 0);
      const uncertaintySourceUnit = typeof analogUncertainty?.unit === 'string'
        ? analogUncertainty.unit
        : entry.series.valueUnit;
      const uncertaintyTargetUnit = entry.series.normalization
        ? entry.series.sourceValueUnit
        : entry.series.valueUnit;
      return traceOperation({ series: rawSeries[sourceIndex], uncertainty: analogUncertainty }, entry.series, window, parameters, {
        lower: entry.uncertaintyLower,
        upper: entry.uncertaintyUpper,
        ...(analogUncertainty?.kind &&
          analogUncertainty.kind !== 'none' &&
          uncertaintySourceUnit !== uncertaintyTargetUnit
          ? { conversion: conversionReceipt(uncertaintySourceUnit, uncertaintyTargetUnit) }
          : {}),
      });
    });
    return done(compileTraceFigure(
      context(rowsTotal, derivedFacts),
      panels,
      {
        xLabel: `time (${unitLabel(window.unit)})`,
        ...(layout !== 'small_multiples' || parameters.sharedTimeAxis !== false
          ? { xDomain: [window.start, window.stop] as const }
          : {}),
        sharedXAxis: layout !== 'small_multiples' || parameters.sharedTimeAxis !== false,
        showSamplePoints: parameters.showSamplePoints === true,
        summaryStatements: [
          `Display window [${formatNumber(window.start)}, ${formatNumber(window.stop)}${window.finalEdgeInclusive ? ']' : ')'} ${unitLabel(window.unit)}.`,
          `Layout ${layout}; ${layout === 'small_multiples' && parameters.sharedTimeAxis === false ? 'panel time domains are independent' : 'all panels share the declared time domain'}.`,
          ...(layout === 'small_multiples'
            ? ['Panel y domains are independent; curve heights are not comparable across panels.']
            : []),
        ],
        tableColumns: [
          { key: 'seriesId', header: 'Series' },
          { key: 'seriesLabel', header: 'Label' },
          { key: 'quantityKind', header: 'Quantity' },
          { key: 'observationKind', header: 'Observation' },
          { key: 'origin', header: 'Origin' },
          { key: 'time', header: 'Time' },
          { key: 'timeUnit', header: 'Time unit' },
          { key: 'value', header: 'Value' },
          { key: 'valueUnit', header: 'Unit' },
          { key: 'missing', header: 'Missing' },
          { key: 'replicateCount', header: 'Replicates' },
          { key: 'uncertaintyLower', header: 'Uncertainty lower' },
          { key: 'uncertaintyUpper', header: 'Uncertainty upper' },
          { key: 'uncertaintyMethod', header: 'Uncertainty declaration' },
          { key: 'sourceOrdinal', header: 'Source row' },
        ],
        tableRow: (entry, observationIndex) => {
          const sourceIndex = Number(entry.tableMetadata?.sourceIndex ?? 0);
          const raw = rec(rawSeries[sourceIndex]) ?? {};
          const origin = rec(raw.origin) ?? {};
          const observation = entry.series.observations[observationIndex];
          const sourceOrdinal = observation.sourceOrdinals.length === 1
            ? observation.sourceOrdinals[0]
            : undefined;
          const [uncertaintyLower, uncertaintyUpper, uncertaintyMethod] = traceUncertaintyCells(
            rec(parameters.uncertainty),
            sourceOrdinal,
            entry.series,
            observation.value,
          );
          return [
            entry.series.id,
            entry.series.label,
            String(rec(raw.values)?.kind ?? 'unknown'),
            entry.series.observationKind,
            origin.kind === 'derived'
              ? `derived: ${String(origin.method ?? 'unspecified')}`
              : String(origin.kind ?? 'unknown'),
            observation.time,
            entry.series.timeUnit,
            observation.value,
            entry.series.valueUnit,
            observation.value === null ? 'true' : 'false',
            observation.replicateCount,
            uncertaintyLower,
            uncertaintyUpper,
            uncertaintyMethod,
            traceCell(observation.sourceOrdinals),
          ];
        },
      },
      skillId,
    ), operations, derivedFacts);
  }

  // ---- multi-signal trace --------------------------------------------------
  if (skillId === 'neuro.multisignal_trace') {
    const window = traceWindowFrom(rec(data.window));
    const rawSeries = arr(data.series) ?? [];
    const declaredPanels = arr(parameters.panels) ?? [];
    if (!window || rawSeries.length === 0 || declaredPanels.length === 0) return { pending: rendererId };

    const sharedTime = rec(data.eventTimes);
    const inputs = rawSeries.map((value, index): TraceSeriesInput & { readonly panelId: string } => {
      const entry = rec(value) ?? {};
      const time = data.timeBase === 'shared' ? sharedTime ?? {} : rec(entry.time) ?? {};
      const values = rec(entry.values) ?? {};
      const offset = rec(entry.timeOffset);
      return {
        id: (entry.seriesId as string) ?? `series-${index + 1}`,
        label: (entry.label as string) ?? (entry.seriesId as string) ?? `Series ${index + 1}`,
        panelId: (entry.panelId as string) ?? 'main',
        observationKind: (entry.observationKind as TraceObservationKind) ?? 'point_sample',
        times: numbers(time.values),
        timeUnit: (time.unit as string) ?? window.unit,
        values: traceValues(values),
        valueUnit: (values.unit as string) ?? '1',
        ...(offset && num(offset.value) !== undefined && typeof offset.unit === 'string'
          ? { timeOffset: { value: num(offset.value)!, unit: offset.unit } }
          : {}),
      };
    });
    let normalization: TraceNormalization | undefined;
    try {
      normalization = traceNormalizationFrom(parameters, window);
    } catch (error) {
      return { errors: [tracePreparationError(error, skillId, '/parameters/normalization/statisticsWindow')] };
    }
    const seriesIds = inputs.map((input) => input.id);
    if (new Set(seriesIds).size !== seriesIds.length) {
      return fail(
        'SEMANTIC_DUPLICATE_ID',
        'semantic',
        'multi-signal series ids must be unique; duplicate identities cannot bind an unambiguous legend or table.',
        '/data/series',
      );
    }
    const orderedPanelRecords = declaredPanels.map((value, panelIndex) => ({
      panel: rec(value) ?? {},
      declaredIndex: panelIndex,
    }));
    const panelIds = orderedPanelRecords.map(({ panel, declaredIndex }) =>
      (panel.panelId as string) ?? `panel-${declaredIndex + 1}`);
    if (new Set(panelIds).size !== panelIds.length) {
      return fail(
        'SEMANTIC_DUPLICATE_ID',
        'semantic',
        'multi-signal panel ids must be unique; duplicate panels would duplicate observations in the artifact.',
        '/parameters/panels',
      );
    }
    const panelIdSet = new Set(panelIds);
    const undeclared = inputs.find((input) => !panelIdSet.has(input.panelId));
    if (undeclared) {
      return fail(
        'RENDER_NO_DATA',
        'render',
        `series ${undeclared.id} names undeclared panel ${undeclared.panelId}. Cortexel refuses rather than silently dropping the series.`,
        '/data/series',
      );
    }
    if (parameters.panelOrder === 'by_panel_id') {
      orderedPanelRecords.sort((a, b) => {
        const left = String(a.panel.panelId ?? '');
        const right = String(b.panel.panelId ?? '');
        return left < right ? -1 : left > right ? 1 : a.declaredIndex - b.declaredIndex;
      });
    }
    const panels: TracePanelSpec[] = [];
    for (const { panel, declaredIndex } of orderedPanelRecords) {
      const panelId = (panel.panelId as string) ?? `panel-${declaredIndex + 1}`;
      const memberInputs = inputs
        .map((input, index) => ({ input, index }))
        .filter(({ input }) => input.panelId === panelId);
      if (memberInputs.length === 0) {
        return fail(
          'RENDER_NO_DATA',
          'render',
          `declared panel ${panelId} has no member series. Cortexel refuses an empty coordinate system.`,
          '/parameters/panels',
        );
      }
      if (memberInputs.length > CATEGORICAL_SERIES_STYLES.length) {
        return fail(
          'RENDER_SERIES_LIMIT_EXCEEDED',
          'render',
          `panel ${panelId} contains ${memberInputs.length} overlaid series, above the ${CATEGORICAL_SERIES_STYLES.length}-style distinguishability limit.`,
          '/data/series',
        );
      }
      const targetUnit = normalization ? '1' : (panel.unit as string) ?? '1';
      const members: TracePanelSpec['series'][number][] = [];
      if (
        memberInputs.length > 1 &&
        memberInputs.some(({ input }) => dimensionOf(input.valueUnit) === 'simulator_defined')
      ) {
        return fail(
          'SCIENCE_UNIT_DIMENSION_MISMATCH',
          'science',
          `panel ${panelId} contains a simulator-defined unit alongside another series. Its meaning is model-dependent even when the unit codes are identical, so it must occupy a panel of its own.`,
          `/parameters/panels/${declaredIndex}`,
        );
      }
      for (const { input, index } of memberInputs) {
        if (input.times.length !== input.values.length) {
          return fail(
            'SEMANTIC_LENGTH_MISMATCH',
            'semantic',
            `series ${input.id} has ${input.times.length} timestamps and ${input.values.length} values.`,
            `/data/series/${index}`,
          );
        }
        const seriesUncertainty = rec(rec(rawSeries[index])?.uncertainty);
        const uncertaintyError = traceUncertaintyValidationError(
          seriesUncertainty,
          input.valueUnit,
          input.values,
          skillId,
          `/data/series/${index}/uncertainty`,
        );
        if (uncertaintyError) return { errors: [uncertaintyError] };
        const uncertaintyMismatch = traceUncertaintyLengthMismatch(
          seriesUncertainty,
          input.values.length,
        );
        if (uncertaintyMismatch) {
          return fail(
            'SEMANTIC_LENGTH_MISMATCH',
            'semantic',
            `series ${input.id} uncertainty.${uncertaintyMismatch.key} has ${uncertaintyMismatch.observed} entries for ${input.values.length} samples.`,
            `/data/series/${index}/uncertainty/${uncertaintyMismatch.key}`,
          );
        }
        let prepared: PreparedTraceSeries;
        let uncertaintyArrays: ReturnType<typeof traceUncertaintyArrays>;
        try {
          prepared = prepareTrace(input, window, parameters, targetUnit, normalization);
          uncertaintyArrays = traceUncertaintyArrays(seriesUncertainty, prepared);
        } catch (error) {
          return { errors: [tracePreparationError(error, skillId, `/data/series/${index}`)] };
        }
        if (prepared.excludedBelow + prepared.excludedAbove > 0) {
          return fail(
            'SCIENCE_EVENT_OUT_OF_WINDOW',
            'science',
            `series ${input.id} has ${prepared.excludedBelow + prepared.excludedAbove} samples outside the declared display window after applying its clock offset. Multi-signal traces refuse this contradiction rather than cropping it.`,
            `/data/series/${index}`,
          );
        }
        if (prepared.outputCount === 0) {
          return fail(
            'RENDER_NO_DATA',
            'render',
            `series ${input.id} has no observation to draw.`,
            `/data/series/${index}`,
          );
        }
        members.push({
          series: prepared,
          styleIndex: index,
          tableMetadata: { sourceIndex: index, panelId },
          ...uncertaintyArrays,
        });
      }
      const scale = (panel.scale as 'linear' | 'log' | 'symlog' | undefined) ?? 'linear';
      if (
        scale === 'log' &&
        members.some((entry) => [
          ...entry.series.values,
          ...(entry.uncertaintyLower ?? []),
          ...(entry.uncertaintyUpper ?? []),
        ].some((value) => value !== null && value <= 0))
      ) {
        return fail(
          'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
          'render',
          `panel ${panelId} requests a logarithmic scale but contains a zero or negative displayed value. Cortexel never clips those observations.`,
          `/parameters/panels/${declaredIndex}/scale`,
        );
      }
      panels.push({
        id: panelId,
        label: (panel.label as string) ?? panelId,
        yLabel: normalization
          ? `${normalization.method} (${unitLabel('1')})`
          : `value (${unitLabel(targetUnit)})`,
        series: members,
        scale,
        ...(scale === 'symlog' && typeof panel.symlogLinearThreshold === 'number'
          ? { symlogLinearThreshold: panel.symlogLinearThreshold }
          : {}),
      });
    }
    const allEntries = panels.flatMap((panel) => panel.series);
    const allPrepared = allEntries.map((entry) => entry.series);
    const rowsTotal = allPrepared.reduce((total, entry) => total + entry.outputCount, 0);
    const duplicate = traceDuplicateOptions(parameters);
    const declaredUncertainties = allEntries.map((entry) => {
      const sourceIndex = Number(entry.tableMetadata?.sourceIndex ?? 0);
      return rec(rec(rawSeries[sourceIndex])?.uncertainty);
    });
    const declaredUncertaintyCount = declaredUncertainties.filter(
      (uncertainty) => uncertainty?.kind !== undefined && uncertainty.kind !== 'none',
    ).length;
    const shownUncertaintyCount = allEntries.filter(traceSeriesHasCompleteDrawableUncertainty).length;
    const uncertaintyReasons = declaredUncertainties
      .map((uncertainty) => uncertainty?.reason)
      .filter((reason): reason is string => typeof reason === 'string');
    const derivedFacts: Partial<DisclosureFacts> = {
      ...traceDerivedFacts(allPrepared, duplicate.aggregateMethod, declaredUncertainties),
      uncertaintyKind: declaredUncertaintyCount > 0 ? 'provided' : 'none',
      uncertaintySeriesDeclared: declaredUncertaintyCount,
      uncertaintySeriesShown: shownUncertaintyCount,
      uncertaintySeriesTotal: declaredUncertainties.length,
      ...(declaredUncertaintyCount === 0 && uncertaintyReasons.length > 0
        ? { uncertaintyReason: [...new Set(uncertaintyReasons)].join(', ') }
        : {}),
    };
    const operations = allEntries.map((entry) => {
      const sourceIndex = Number(entry.tableMetadata?.sourceIndex ?? 0);
      const raw = rawSeries[sourceIndex];
      const rawRecord = rec(raw) ?? {};
      const uncertainty = rec(rawRecord.uncertainty);
      const uncertaintySourceUnit = typeof uncertainty?.unit === 'string'
        ? uncertainty.unit
        : entry.series.valueUnit;
      const uncertaintyTargetUnit = entry.series.normalization
        ? entry.series.sourceValueUnit
        : entry.series.valueUnit;
      return traceOperation(
        data.timeBase === 'shared' ? { series: raw, eventTimes: sharedTime } : raw,
        entry.series,
        window,
        parameters,
        {
          lower: entry.uncertaintyLower,
          upper: entry.uncertaintyUpper,
          ...(uncertainty?.kind &&
            uncertainty.kind !== 'none' &&
            uncertaintySourceUnit !== uncertaintyTargetUnit
            ? { conversion: conversionReceipt(uncertaintySourceUnit, uncertaintyTargetUnit) }
            : {}),
        },
      );
    });
    return done(compileTraceFigure(
      context(rowsTotal, derivedFacts),
      panels,
      {
        xLabel: `time (${unitLabel(window.unit)})`,
        xDomain: [window.start, window.stop],
        sharedXAxis: true,
        showSamplePoints: parameters.showSamplePoints === true,
        summaryStatements: [
          `Display window [${formatNumber(window.start)}, ${formatNumber(window.stop)}${window.finalEdgeInclusive ? ']' : ')'} ${unitLabel(window.unit)}.`,
          `Layout ${String(parameters.layout)}; panel order ${String(parameters.panelOrder ?? 'as_declared')}; time alignment ${String(rec(data.timeAlignment)?.kind ?? 'unknown')}.`,
          ...(parameters.layout === 'small_multiples'
            ? ['Panel y domains and units are independent; curve heights are not comparable across panels.']
            : []),
        ],
        tableColumns: [
          { key: 'seriesId', header: 'Series' },
          { key: 'seriesLabel', header: 'Label' },
          { key: 'entityId', header: 'Entity' },
          { key: 'entityKind', header: 'Entity kind' },
          { key: 'compartmentId', header: 'Compartment' },
          { key: 'pathwayId', header: 'Pathway' },
          { key: 'variableId', header: 'Variable' },
          { key: 'panelId', header: 'Panel' },
          { key: 'observationKind', header: 'Observation kind' },
          { key: 'origin', header: 'Origin' },
          { key: 'originMethod', header: 'Derivation method' },
          { key: 'recordedTime', header: 'Recorded time' },
          { key: 'recordedTimeUnit', header: 'Recorded time unit' },
          { key: 'timeOffset', header: 'Declared offset' },
          { key: 'timeOffsetUnit', header: 'Declared offset unit' },
          { key: 'time', header: 'Time' },
          { key: 'timeUnit', header: 'Time unit' },
          { key: 'value', header: 'Value' },
          { key: 'unit', header: 'Unit' },
          { key: 'displayValue', header: 'Drawn value' },
          { key: 'displayUnit', header: 'Drawn unit' },
          { key: 'missing', header: 'Missing' },
          { key: 'replicateCount', header: 'Replicates' },
          { key: 'uncertaintyKind', header: 'Uncertainty kind' },
          { key: 'uncertaintyLower', header: 'Uncertainty lower' },
          { key: 'uncertaintyUpper', header: 'Uncertainty upper' },
          { key: 'uncertaintyMethod', header: 'Uncertainty declaration' },
          { key: 'normalizationParameters', header: 'Normalization parameters' },
          { key: 'sourceRowIndex', header: 'Source row' },
        ],
        tableRow: (entry, observationIndex, panel) => {
          const sourceIndex = Number(entry.tableMetadata?.sourceIndex ?? 0);
          const raw = rec(rawSeries[sourceIndex]) ?? {};
          const origin = rec(raw.origin) ?? {};
          const uncertainty = rec(raw.uncertainty);
          const rawValues = rec(raw.values) ?? {};
          const observation = entry.series.observations[observationIndex];
          const sourceOrdinal = observation.sourceOrdinals.length === 1
            ? observation.sourceOrdinals[0]
            : undefined;
          const [uncertaintyLower, uncertaintyUpper, uncertaintyMethod] = traceUncertaintyCells(
            uncertainty,
            sourceOrdinal,
            entry.series,
            observation.value,
          );
          return [
            entry.series.id,
            entry.series.label,
            String(raw.entityId ?? ''),
            String(raw.entityKind ?? ''),
            typeof raw.compartmentId === 'string' ? raw.compartmentId : null,
            typeof raw.pathwayId === 'string' ? raw.pathwayId : null,
            String(raw.variableId ?? ''),
            panel.id,
            entry.series.observationKind,
            String(origin.kind ?? 'unknown'),
            typeof origin.method === 'string' ? origin.method : null,
            observation.recordedTime,
            entry.series.sourceTimeUnit,
            entry.series.timeOffset?.sourceValue ?? 0,
            entry.series.timeOffset?.sourceUnit ?? entry.series.sourceTimeUnit,
            observation.time,
            entry.series.timeUnit,
            traceCell(observation.sourceValues),
            String(rawValues.unit ?? entry.series.valueUnit),
            observation.value,
            entry.series.valueUnit,
            observation.value === null ? 'true' : 'false',
            observation.replicateCount,
            String(uncertainty?.kind ?? 'none'),
            uncertaintyLower,
            uncertaintyUpper,
            uncertaintyMethod,
            entry.series.normalization ? JSON.stringify(entry.series.normalization) : null,
            traceCell(observation.sourceOrdinals),
          ];
        },
      },
      skillId,
    ), operations, derivedFacts);
  }

  // ---- remaining trace families -------------------------------------------
  if (rendererId === 'figure.compartment_trace' || rendererId === 'figure.synaptic_weight_trace') {
    const series = arr(data.series);
    const first = series && rec(series[0]);
    if (first) {
      const timeRec = rec(first.time) ?? rec(data.eventTimes) ?? rec(data.sharedTime);
      const valueRec = rec(first.values) ?? rec(first.value) ?? rec(first.weight);
      const time = numbers(timeRec?.values);
      const values = (arr(valueRec?.values) ?? []) as (number | null)[];
      const timeUnit = (timeRec?.unit as string) ?? 'ms';
      const valueUnit = (valueRec?.unit as string) ?? '';
      if (time.length > 0 && values.length > 0) {
        return done(compileLineFigure(context(time.length), time, values, `time (${unitLabel(timeUnit)})`, valueUnit ? `value (${unitLabel(valueUnit)})` : 'value', skillId));
      }
    }
    return { pending: rendererId };
  }

  // ---- spike raster --------------------------------------------------------
  if (skillId === 'neuro.spike_raster') {
    const times = numbers(rec(data.eventTimes)?.values);
    const senders = strings(data.eventSenderIds);
    const recorded = strings(data.recordedSenderIds);
    const window = rec(data.window);
    const timeExtent = finiteExtent(times);
    const start = num(window?.start) ?? timeExtent?.min ?? 0;
    const stop = num(window?.stop) ?? timeExtent?.max ?? 1;
    const timeUnit = (rec(data.eventTimes)?.unit as string) ?? 'ms';
    const order = recorded.length ? recorded : [...new Set(senders)];
    return done(compileRasterFigure(context(times.length), times, senders, order, start, stop, `time (${unitLabel(timeUnit)})`, skillId));
  }

  // ---- correlogram ---------------------------------------------------------
  if (skillId === 'neuro.correlogram') {
    const inputs = eventCorrelogramInputs(data, parameters);
    if (!inputs) return { pending: rendererId };
    const result = computeCorrelogram(
      inputs.ref,
      inputs.tgt,
      inputs.spec,
      inputs.kind,
      pairwiseOperations,
    );
    return done(compileStemFigure(context(result.counts.length), binCenters(inputs.spec), result.counts, `lag (${unitLabel(inputs.lagUnit)})`, 'pair count', skillId));
  }

  // ---- distributions -------------------------------------------------------
  if (rendererId === 'figure.distribution') {
    if (skillId === 'neuro.isi_distribution') {
      const times = numbers(rec(data.eventTimes)?.values);
      const senders = strings(data.eventSenderIds);
      const trials = strings(data.eventTrialIds);
      const events = makeEventTable(times, senders, trials.length === times.length ? trials : undefined);
      const isi = computeIsi(events);
      const bins = rec(parameters.bins);
      const start = num(bins?.start) ?? 0;
      const stop = num(bins?.stop) ?? finiteExtent(isi.intervals)?.max ?? 1;
      const width = num(bins?.width) ?? ((stop - start) / 10 || 1);
      const unit = (bins?.unit as string) ?? 'ms';
      const edges = edgesFromWidth(start, stop, width);
      const { counts } = binCounts(isi.intervals, { edges, finalEdgeInclusive: binBoundaryInclusive(bins) ?? true });
      return done(compileBarFigure(context(counts.length), edges, counts, `ISI (${unitLabel(unit)})`, 'count', skillId));
    }

    if (skillId === 'network.degree_distribution') {
      const ids = strings(rec(data.nodeUniverse)?.ids);
      const conns = rec(data.connections);
      const sources = strings(conns?.sourceIds);
      const targets = strings(conns?.targetIds);
      const direction = (parameters.direction as 'in' | 'out') ?? 'in';
      const counting = (parameters.countingPolicy as 'count_edges' | 'count_unique_neighbours') ?? 'count_edges';
      const degrees = computeDegrees(ids, sources, targets, direction, counting);
      // Integer-degree histogram: one bar per degree value.
      const maxDeg = Math.max(0, finiteExtent(degrees.degree)?.max ?? 0);
      const edges = Array.from({ length: maxDeg + 2 }, (_v, i) => i - 0.5);
      const { counts } = binCounts(degrees.degree, { edges, finalEdgeInclusive: true });
      return done(compileBarFigure(context(counts.length), edges, counts, `${direction}-degree`, 'node count', skillId));
    }

    // delay / weight distribution: histogram the edge value population.
    const conns = rec(data.connections);
    const values = skillId === 'network.delay_distribution' ? numbers(rec(conns?.delays)?.values) : numbers(rec(conns?.weights)?.values);
    const bins = rec(parameters.bins);
    const valueExtent = finiteExtent(values);
    const start = num(bins?.start) ?? valueExtent?.min ?? 0;
    const stop = num(bins?.stop) ?? valueExtent?.max ?? 1;
    const width = num(bins?.width) ?? ((stop - start) / 10 || 1);
    const unit = (bins?.unit as string) ?? (skillId === 'network.delay_distribution' ? 'ms' : '');
    const edges = start < stop ? edgesFromWidth(start, stop, width) : [start, start + 1];
    const { counts } = binCounts(values, { edges, finalEdgeInclusive: binBoundaryInclusive(bins) ?? true });
    const label = skillId === 'network.delay_distribution' ? `delay (${unitLabel(unit)})` : 'weight';
    return done(compileBarFigure(context(counts.length), edges, counts, label, 'count', skillId));
  }

  // ---- matrices ------------------------------------------------------------
  if (rendererId === 'figure.matrix') {
    const ids = strings(rec(data.nodeUniverse)?.ids);
    const conns = rec(data.connections);
    const sources = strings(conns?.sourceIds);
    const targets = strings(conns?.targetIds);
    const aggregation = (parameters.multapseAggregation as 'sum' | 'mean' | 'min' | 'max' | 'no_aggregation') ?? 'sum';
    // Keep the value array INDEX-ALIGNED with the edge arrays — do not filter out nulls
    // here, or every later edge would be drawn with the wrong cell's value. computeMatrix
    // skips a null per-cell.
    const rawValues =
      skillId === 'network.weight_matrix' ? arr(rec(conns?.weights)?.values)
        : skillId === 'network.delay_matrix' ? arr(rec(conns?.delays)?.values)
          : undefined;
    const values = rawValues?.map((v) => (typeof v === 'number' ? v : null));
    const cellMode = (parameters.cellMode as string) ?? 'multiplicity';
    const method = skillId === 'network.adjacency_matrix' && cellMode !== 'multiplicity' ? 'count' : (values ? aggregation : 'count');
    const matrix = computeMatrix(ids, ids, sources, targets, values, method);
    return done(compileMatrixFigure(context(matrix.cells.length), matrix.cells, ids, ids, skillId));
  }

  // ---- spatial map ---------------------------------------------------------
  if (skillId === 'network.spatial_map_2d') {
    const positions = rec(data.positions);
    const ids = strings(positions?.nodeIds);
    const xs = numbers(rec(positions?.x)?.values);
    const ys = numbers(rec(positions?.y)?.values);
    const xLabel = (rec(positions?.frame)?.xAxisLabel as string) ?? `x (${unitLabel((rec(positions?.x)?.unit as string) ?? 'um')})`;
    const yLabel = (rec(positions?.frame)?.yAxisLabel as string) ?? `y (${unitLabel((rec(positions?.y)?.unit as string) ?? 'um')})`;
    return done(compileScatterFigure(context(xs.length), xs, ys, ids, xLabel, yLabel, skillId));
  }

  // ---- response curve ------------------------------------------------------
  if (skillId === 'neuro.response_curve') {
    const conditions = rec(data.conditions);
    const inputRec = rec(conditions?.input);
    const inputValues = numbers(inputRec?.values);
    const conditionIds = strings(conditions?.ids);
    const observations = rec(data.observations);
    const obsConditionIds = strings(observations?.conditionIds);
    const responses = numbers(rec(observations?.response)?.values);
    // Aggregate observations per condition by mean (the declared estimator for the example).
    const byCondition = new Map<string, number[]>();
    for (let i = 0; i < obsConditionIds.length && i < responses.length; i++) {
      const list = byCondition.get(obsConditionIds[i]) ?? [];
      list.push(responses[i]);
      byCondition.set(obsConditionIds[i], list);
    }
    const x: number[] = [];
    const y: number[] = [];
    conditionIds.forEach((id, i) => {
      const list = byCondition.get(id);
      if (list && list.length && i < inputValues.length) {
        x.push(inputValues[i]);
        y.push(list.reduce((a, b) => a + b, 0) / list.length);
      }
    });
    const ordered = (conditions?.axis as string) === 'numeric';
    const xLabel = (inputRec?.label as string) ?? `input (${unitLabel((inputRec?.unit as string) ?? '1')})`;
    const yLabel = `response (${unitLabel((rec(observations?.response)?.unit as string) ?? '1')})`;
    return done(compilePointsLineFigure(context(x.length), x, y, ordered, xLabel, yLabel, skillId));
  }

  // ---- PSTH ----------------------------------------------------------------
  if (skillId === 'neuro.psth') {
    const trialIds = strings(data.trialIds);
    const trials = Math.max(1, trialIds.length || num(data.trialCount) || 1);
    const normalization = (parameters.normalization as string) ?? 'count_per_trial';
    const bins = rec(parameters.bins);

    if (data.mode === 'prebinned') {
      // A pre-binned PSTH carries its own edges and counts; draw them, do not treat the
      // absence of raw events as an all-zero figure. The counts stay INDEX-ALIGNED with the
      // edges: a missing (null) bin count is rendered as an empty bar, never filtered out,
      // which would shift every later bar onto the wrong bin.
      const edges = (arr(rec(bins)?.edges) ?? arr(rec(data.binEdges)?.edges) ?? []).map((v) =>
        typeof v === 'number' ? v : 0,
      );
      const counts = (arr(data.counts) ?? []).map((v) => (typeof v === 'number' ? v : 0));
      const unit = (rec(bins)?.unit as string) ?? 'ms';
      const values = normalizePsth(counts, trials, normalization);
      return done(
        compileBarFigure(context(values.length), edges.length ? edges : [0, 1], values, `time from alignment (${unitLabel(unit)})`, psthYLabel(normalization), skillId),
      );
    }

    // Events mode: align each event to its trial reference, then bin over the relative window.
    const times = numbers(rec(data.eventTimes)?.values);
    const eventTrials = strings(data.eventTrialIds);
    const alignTimes = numbers(data.alignmentTimes);
    const alignByTrial = new Map<string, number>();
    trialIds.forEach((id, i) => { if (i < alignTimes.length) alignByTrial.set(id, alignTimes[i]); });
    const relative = times.map((t, i) => t - (alignByTrial.get(eventTrials[i]) ?? 0)).filter((v) => Number.isFinite(v));
    const win = rec(data.relativeWindow);
    const relativeExtent = finiteExtent(relative);
    const start = num(win?.start) ?? num(bins?.start) ?? relativeExtent?.min ?? -1;
    const stop = num(win?.stop) ?? num(bins?.stop) ?? relativeExtent?.max ?? 1;
    const width = num(bins?.width) ?? ((stop - start) / 10 || 1);
    const unit = (win?.unit as string) ?? (bins?.unit as string) ?? 'ms';
    const edges = start < stop ? edgesFromWidth(start, stop, width) : [start, start + 1];
    const boundary = binBoundaryInclusive(bins) ?? binBoundaryInclusive(win) ?? true;
    const { counts } = binCounts(relative, { edges, finalEdgeInclusive: boundary });
    const values = normalizePsth(counts, trials, normalization);
    return done(compileBarFigure(context(values.length), edges, values, `time from alignment (${unitLabel(unit)})`, psthYLabel(normalization), skillId));
  }

  // ---- phase plane ---------------------------------------------------------
  if (skillId === 'neuro.phase_plane') {
    // `trajectories` and `axes` are OBJECTS (not arrays): trajectories carries parallel
    // x/y state arrays directly; axes carries `.x`/`.y` axis descriptors.
    const trajectories = rec(data.trajectories);
    const xs = numbers(rec(trajectories?.x)?.values);
    const ys = numbers(rec(trajectories?.y)?.values);
    const axes = rec(data.axes);
    const xLabel = (rec(axes?.x)?.label as string) ?? 'x';
    const yLabel = (rec(axes?.y)?.label as string) ?? 'y';
    if (xs.length && ys.length) {
      // A phase-plane trajectory is an ordered path in state space; draw it as a line.
      return done(compileTrajectoryFigure(context(xs.length), xs, ys, xLabel, yLabel, skillId));
    }
    return { pending: rendererId };
  }

  // ---- connection graph (schematic circular layout) ------------------------
  if (skillId === 'network.connection_graph') {
    const ids = strings(rec(data.nodeUniverse)?.ids);
    const conns = rec(data.connections);
    const sources = strings(conns?.sourceIds);
    const targets = strings(conns?.targetIds);
    if (ids.length) {
      return done(compileGraphFigure(context(ids.length), ids, sources, targets, skillId));
    }
    return { pending: rendererId };
  }

  return { pending: rendererId };
}

function assembleArtifact(
  validated: ValidatedRequest,
  disclosures: readonly Disclosure[],
  plan: RenderPlanV1,
  render: SvgReport,
  summary: string,
  budgetProfile: BudgetProfileId,
  derivationOperations: readonly DerivationOperation[],
): Record<string, unknown> {
  const identity = getBuildIdentity();
  const catalog = SKILL_CATALOG[validated.skillId];
  const tableRows = { inline: plan.table.rowsInline, total: plan.table.rowsTotal };

  const artifactWithoutDigest: Record<string, unknown> = {
    artifact: { name: 'cortexel-figure-artifact', version: '1.0' },
    buildIdentity: {
      packageVersion: identity.packageVersion,
      requestContract: identity.requestContract,
      artifactContract: identity.artifactContract,
      contractDigest: identity.contractDigest,
      catalogDigest: identity.catalogDigest,
      sourceRevision: identity.sourceRevision,
      release: identity.release,
    },
    canonicalRequest: validated.canonicalRequest,
    inputAssurance: validated.inputAssurance,
    validation: {
      structural: { validatorId: 'ajv-2020', validatorRevision: 1, result: 'passed' },
      semantic: {
        validatorId: 'cortexel-semantics',
        validatorRevision: 1,
        result: 'passed',
        checkedRuleIds: validated.checkedValidatorIds,
      },
      resource: { validatorId: 'budget-preflight', validatorRevision: 1, result: 'passed' },
      referenceComparison: { status: 'not_run', oracle: null, oracleVersion: null },
      warnings: validated.warnings.map((w) => ({
        code: w.code,
        severity: w.severity,
        stage: w.stage,
        instancePath: w.instancePath,
        message: w.message,
      })),
    },
    derivation: { operations: derivationOperations },
    budgetDecision: {
      outcome: 'accepted_full',
      profileId: budgetProfile,
      countBefore: tableRows.total,
      countAfter: tableRows.total,
    },
    provenance: {
      source: rec(validated.canonicalRequest.source) ?? { kind: 'unknown' },
      inputDigest: validated.requestDigest,
      assurances: [
        { id: 'structural', issuer: 'cortexel', method: 'json-schema-2020-12', result: 'passed' },
        { id: 'semantic', issuer: 'cortexel', method: 'named-validators', result: 'passed' },
        { id: 'reference', issuer: 'cortexel', method: 'independent-oracle', result: 'not_run' },
      ],
      attestations: [],
    },
    disclosures: disclosures.map((d) => ({ id: d.id, severity: d.severity, text: d.text })),
    render: {
      rendererId: catalog.renderer.id,
      rendererRevision: catalog.renderer.revision,
      width: render.width,
      height: render.height,
      themeId: plan.themeId,
      markCount: render.markCount,
      textCount: render.textCount,
      idSeed: validated.requestDigest,
    },
    accessibility: {
      profileId: 'cortexel-accessibility',
      profileVersion: '1.0',
      summary,
      tablePolicy: plan.table.policy,
      tableRowsInline: tableRows.inline,
      tableRowsTotal: tableRows.total,
    },
    outputs: [
      {
        role: 'figure_svg',
        mediaType: 'image/svg+xml',
        sha256: render.digest,
        byteLength: utf8ByteLength(render.svg),
        normative: true,
      },
    ],
  };

  const artifactDigest = canonicalDigestExcluding(artifactWithoutDigest, 'artifactDigest');
  return deepFreeze({ ...artifactWithoutDigest, artifactDigest });
}

/**
 * Count the observations a request carries, by summing the lengths of the arrays that
 * hold data. This is a conservative preflight: it never has to be exact, only an upper
 * bound that catches an input which would blow the derivation or render budget.
 */
function countObservations(node: unknown): number {
  if (node === null || typeof node !== 'object') return 0;

  // The accepted JSON depth is profile-controlled and may exceed the historical
  // recursion cutoff. Walk iteratively so a deeply nested, schema-valid carrier cannot
  // disappear from the budget count and so this preflight cannot exhaust the JS stack.
  const pending: object[] = [node];
  let total = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (Array.isArray(current)) {
      // Count every array dimension conservatively. Nested arrays therefore contribute
      // both their outer cardinality and their leaf observations, which is an upper bound.
      total = Math.min(Number.MAX_SAFE_INTEGER, total + current.length);
      for (const item of current) {
        if (item !== null && typeof item === 'object') pending.push(item);
      }
    } else {
      for (const value of Object.values(current as Record<string, unknown>)) {
        if (value !== null && typeof value === 'object') pending.push(value);
      }
    }
  }
  return total;
}

function maxLeafArrayLength(node: unknown): number {
  if (node === null || typeof node !== 'object') return 0;

  const pending: object[] = [node];
  let maximum = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (Array.isArray(current)) {
      let hasNestedValue = false;
      for (const item of current) {
        if (item !== null && typeof item === 'object') {
          hasNestedValue = true;
          pending.push(item);
        }
      }
      if (!hasNestedValue) maximum = Math.max(maximum, current.length);
    } else {
      for (const value of Object.values(current as Record<string, unknown>)) {
        if (value !== null && typeof value === 'object') pending.push(value);
      }
    }
  }
  return maximum;
}

/** Build a figure from an already-validated request. */
export function buildFigureFromValidated(validated: ValidatedRequest): FigureResult | FigureFailure {
  // Check module-owned identity before reading even one property. In particular, a proxy
  // cannot use a `get` trap to forge the private TypeScript symbol or execute code while
  // this failure is being diagnosed.
  if (!isValidatedRequest(validated)) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RENDER_UNVALIDATED_REQUEST',
          stage: 'render',
          message:
            'buildFigureFromValidated requires the exact frozen token returned by a successful Cortexel validation. Plain objects, copies, proxies, and type casts have no validation authority.',
        }),
      ],
    };
  }

  const request = validated.canonicalRequest;
  const catalog = SKILL_CATALOG[validated.skillId];
  const presentation = rec(request.presentation) ?? {};
  const requestedProfile = presentation.budgetProfile ?? DEFAULT_PROFILE;
  const activeBudget = trySelectTighterBudgetProfile(
    validated.inputAssurance.budgetProfile,
    requestedProfile,
  );
  if (!activeBudget) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'INTERNAL_INVARIANT_VIOLATED',
          stage: 'internal',
          message:
            'the host and request budget profiles are absent or incomparable in this build. Cortexel cannot combine resource authority without an explicit composition contract.',
        }),
      ],
    };
  }
  const { limits } = activeBudget;
  const markLimit = Math.min(catalog.budgets.maxVisibleMarks, limits.visibleMarks);

  const data = rec(request.data) ?? {};
  const universeSize = arr(rec(data.nodeUniverse)?.ids)?.length ?? 0;
  const connections = rec(data.connections);
  const connectionCount = Math.max(
    arr(connections?.sourceIds)?.length ?? 0,
    arr(connections?.targetIds)?.length ?? 0,
  );

  const preflightMarks =
    validated.skillId === 'neuro.spike_raster'
      ? arr(rec(data.eventTimes)?.values)?.length ?? 0
      : validated.skillId === 'network.connection_graph'
        ? universeSize + connectionCount
        : 0;
  if (preflightMarks > markLimit) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_MARKS_EXCEEDED',
          stage: 'budget',
          instancePath: '/data',
          skillId: validated.skillId,
          message: `the request requires at least ${preflightMarks} visible data marks, over the active limit of ${markLimit}. Cortexel refused it before allocating render geometry.`,
          limit: { name: 'visibleMarks', limit: markLimit, observed: preflightMarks },
        }),
      ],
    };
  }

  if (universeSize > limits.graphNodes) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_BUDGET_EXCEEDED',
          stage: 'budget',
          instancePath: '/data/nodeUniverse/ids',
          skillId: validated.skillId,
          message: `the declared node universe contains ${universeSize} nodes, over the active limit of ${limits.graphNodes}.`,
          limit: { name: 'graphNodes', limit: limits.graphNodes, observed: universeSize },
        }),
      ],
    };
  }
  if (connectionCount > limits.graphEdges) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_BUDGET_EXCEEDED',
          stage: 'budget',
          instancePath: '/data/connections',
          skillId: validated.skillId,
          message: `the connection snapshot contains ${connectionCount} rows, over the active limit of ${limits.graphEdges}.`,
          limit: { name: 'graphEdges', limit: limits.graphEdges, observed: connectionCount },
        }),
      ],
    };
  }

  if (catalog.renderer.id === 'figure.matrix') {
    // The structural request budget bounds a node universe far below sqrt(2^53), so
    // this product is an exact safe integer. Preserve that exact observation in the
    // diagnostic instead of returning a saturating sentinel that looks measured.
    const matrixCells = universeSize * universeSize;
    if (matrixCells > limits.matrixCells) {
      return {
        ok: false,
        errors: [
          makeError({
            code: 'RESOURCE_MATRIX_CELLS_EXCEEDED',
            stage: 'budget',
            instancePath: '/data/nodeUniverse/ids',
            skillId: validated.skillId,
            message: `the ${universeSize} by ${universeSize} declared matrix exceeds the active limit of ${limits.matrixCells} logical cells. Cortexel preflights the universe product without materializing a dense matrix.`,
            limit: { name: 'matrixCells', limit: limits.matrixCells, observed: matrixCells },
          }),
        ],
      };
    }
  }

  // Budget preflight, BEFORE derivation. The parser already bounded the raw input, but the
  // per-figure observation budget is a distinct, tighter limit: it protects the derivation
  // and render stages from an input that is within parser limits yet still too large to
  // draw. A hard limit fails; it is never silently truncated.
  const observations = countObservations(request.data);
  const longestSeries = maxLeafArrayLength(request.data);
  if (longestSeries > limits.observationsPerSeries) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_OBSERVATIONS_EXCEEDED',
          stage: 'budget',
          instancePath: '/data',
          skillId: validated.skillId,
          message: `a single observation array carries ${longestSeries} entries, over the active per-series limit of ${limits.observationsPerSeries}.`,
          limit: {
            name: 'observationsPerSeries',
            limit: limits.observationsPerSeries,
            observed: longestSeries,
          },
        }),
      ],
    };
  }
  const observationLimit = Math.min(
    catalog.budgets.maxObservations,
    limits.observationsPerRequest,
  );
  if (observations > observationLimit) {
    return {
      ok: false,
      errors: [
        {
          code: 'RESOURCE_OBSERVATIONS_EXCEEDED',
          severity: 'error',
          stage: 'budget',
          instancePath: '/data',
          message: `this request carries about ${observations} observations, over the ${observationLimit} active request budget for ${validated.skillId}. Reduce the data or reference it with a DataRef. Cortexel never silently truncates.`,
          limit: { name: 'observationsPerRequest', limit: observationLimit, observed: observations },
        },
      ],
    };
  }

  if (validated.skillId === 'neuro.correlogram') {
    const inputs = eventCorrelogramInputs(
      rec(request.data) ?? {},
      rec(request.parameters) ?? {},
    );
    if (inputs) {
      const pairs = countEligibleCorrelogramPairs(
        inputs.ref,
        inputs.tgt,
        inputs.spec,
        inputs.kind,
        limits.pairwiseOperations,
      );
      if (pairs > limits.pairwiseOperations) {
        return {
          ok: false,
          errors: [
            makeError({
              code: 'RESOURCE_PAIRWISE_EXCEEDED',
              stage: 'budget',
              instancePath: '/data/eventTimes/values',
              skillId: validated.skillId,
              message: `the eligible correlogram pair count is at least ${limits.pairwiseOperations + 1}, over the active limit of ${limits.pairwiseOperations}. The bounded preflight formed no pairs and Cortexel refuses the derivation.`,
              limit: {
                name: 'pairwiseOperations',
                limit: limits.pairwiseOperations,
                observed: pairs,
              },
            }),
          ],
        };
      }
    }
  }

  const forced = forcedDisclosures(validated.skillId, request);

  const makeContext = (
    rowsTotal: number,
    extraFacts: Partial<DisclosureFacts> = {},
  ): CompileContext => {
    const facts = disclosureFacts(request, {
      ...extraFacts,
      tableRowsTotal: rowsTotal,
      tableRowsInline: Math.min(rowsTotal, limits.inlineTableRows),
      budgetProfileId: activeBudget.profile,
    });
    const disclosures = deriveDisclosures(facts, catalog.disclosures, forced);
    return {
      sourceRequestDigest: validated.requestDigest,
      width: num(presentation.width) ?? 720,
      height: num(presentation.height) ?? 440,
      themeId: (presentation.themeId as string) ?? 'light',
      title: (presentation.title as string) ?? catalog.title,
      disclosures,
      summary: catalog.accessibility.summaryTemplate.replace(/\{[^}]+\}/g, '…'),
      inlineTableRows: limits.inlineTableRows,
    };
  };

  let compiled: ReturnType<typeof compile>;
  try {
    compiled = compile(validated, makeContext, limits.pairwiseOperations);
  } catch {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'INTERNAL_INVARIANT_VIOLATED',
          stage: 'internal',
          skillId: validated.skillId,
          message:
            'a request passed validation but its render-plan compiler could not process it. Cortexel refused to emit a partial or potentially misleading artifact.',
        }),
      ],
    };
  }

  if ('errors' in compiled) return { ok: false, errors: compiled.errors };

  if ('pending' in compiled) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RENDER_UNSUPPORTED_SKILL',
          stage: 'render',
          skillId: validated.skillId,
          message: `stable skill ${validated.skillId} selected renderer ${compiled.pending}, but its compiler produced no render plan. Cortexel refuses to emit a schema-invalid partial artifact.`,
        }),
      ],
    };
  }

  if (
    compiled.plan.panels.some(
      (panel) =>
        !Number.isFinite(panel.x) ||
        !Number.isFinite(panel.y) ||
        !Number.isFinite(panel.width) ||
        !Number.isFinite(panel.height) ||
        panel.width <= 0 ||
        panel.height <= 0 ||
        (panel.axes.length > 0 && panel.height < MIN_PLOT_PANEL_HEIGHT),
    )
  ) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RENDER_LAYOUT_UNAVAILABLE',
          stage: 'render',
          instancePath: '/presentation',
          skillId: validated.skillId,
          message:
            `the requested dimensions leave no finite plotting region of at least ${MIN_PLOT_PANEL_HEIGHT} CSS pixels per data panel after axes, legends, and mandatory disclosures are reserved. Increase the height or reduce the panel count.`,
        }),
      ],
    };
  }

  const context = makeContext(
    compiled.plan.table.rowsTotal,
    compiled.derivedDisclosureFacts,
  );

  // Replace the ellipsis-filled template with a real, value-filled accessible summary
  // derived from the compiled figure, then render — so the SVG <desc> and the artifact
  // carry the SAME true summary rather than a placeholder.
  const summary = buildSummary(compiled.plan, context.title);
  const plan = deepFreeze<RenderPlanV1>({
    ...compiled.plan,
    accessibility: { ...compiled.plan.accessibility, summary },
  });

  const resourceCounts = countPlanResources(plan);
  if (resourceCounts.markCount > markLimit) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_MARKS_EXCEEDED',
          stage: 'budget',
          instancePath: '/data',
          skillId: validated.skillId,
          message: `the compiled figure requires ${resourceCounts.markCount} visible data marks, over the active limit of ${markLimit}. The requested representation was not silently truncated.`,
          limit: { name: 'visibleMarks', limit: markLimit, observed: resourceCounts.markCount },
        }),
      ],
    };
  }
  if (resourceCounts.textCount > limits.svgTextNodes) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_MARKS_EXCEEDED',
          stage: 'budget',
          skillId: validated.skillId,
          message: `the compiled figure requires ${resourceCounts.textCount} SVG text nodes, over the active limit of ${limits.svgTextNodes}.`,
          limit: {
            name: 'svgTextNodes',
            limit: limits.svgTextNodes,
            observed: resourceCounts.textCount,
          },
        }),
      ],
    };
  }

  if (plan.table.rowsInline > limits.inlineTableRows) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_COMPACTION_UNAVAILABLE',
          stage: 'budget',
          skillId: validated.skillId,
          message: `the compiler produced ${plan.table.rowsInline} inline table rows, over the active limit of ${limits.inlineTableRows}. No complete digest-bound sidecar was assembled, so Cortexel refuses instead of silently excerpting the table.`,
          limit: {
            name: 'inlineTableRows',
            limit: limits.inlineTableRows,
            observed: plan.table.rowsInline,
          },
        }),
      ],
    };
  }
  if (plan.table.rowsInline < plan.table.rowsTotal && plan.table.sidecarDigest === undefined) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_COMPACTION_UNAVAILABLE',
          stage: 'budget',
          skillId: validated.skillId,
          message:
            'the compiled table is an excerpt but has no digest-bound complete sidecar. Cortexel refuses an incomplete artifact rather than claiming the full accepted data remains available.',
        }),
      ],
    };
  }

  const report = renderSvg(plan, sha256Digest);
  const outputBytes = utf8ByteLength(report.svg);
  if (outputBytes > limits.svgBytes) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_OUTPUT_BYTES_EXCEEDED',
          stage: 'serialize',
          skillId: validated.skillId,
          message: `the normative SVG is ${outputBytes} UTF-8 bytes, over the active limit of ${limits.svgBytes}. Cortexel refuses the output rather than emitting an unbounded artifact.`,
          limit: { name: 'svgBytes', limit: limits.svgBytes, observed: outputBytes },
        }),
      ],
    };
  }

  const artifact = assembleArtifact(
    validated,
    context.disclosures,
    plan,
    report,
    summary,
    activeBudget.profile,
    compiled.derivationOperations,
  );

  return { ok: true, artifact, svg: report.svg, plan, table: plan.table, disclosures: context.disclosures };
}

/**
 * A deterministic, value-filled accessible summary from the compiled plan.
 *
 * Built from the figure's OWN data (its title, identities, row count, a named scientific
 * value column, its disclosures) rather than an interpretive claim. It states what
 * is plotted, not what it means — a screen reader hears real numbers, never "significant"
 * or "increased".
 */
function buildSummary(plan: RenderPlanV1, title: string): string {
  const rows = plan.table.rowsTotal;
  const preferredValueKeys = [
    'displayValue',
    'value',
    'rate',
    'count',
    'probability',
    'density',
    'weight',
    'delay',
    'degree',
  ];
  let valueColumn = -1;
  for (const key of preferredValueKeys) {
    valueColumn = plan.table.columns.findIndex((column) => column.key === key);
    if (valueColumn >= 0) break;
  }

  const numericValues: number[] = [];
  for (const row of plan.table.rows) {
    const cell = row[valueColumn];
    const value = typeof cell === 'number' ? cell : typeof cell === 'string' ? Number(cell) : NaN;
    if (Number.isFinite(value)) numericValues.push(value);
  }

  const parts = [`${title}.`];
  if (plan.legend && plan.legend.length > 0) {
    const seriesItems = plan.legend.filter((entry) => (entry.glyph ?? 'series') === 'series');
    const uncertaintyItems = plan.legend.filter((entry) => entry.glyph === 'band' || entry.glyph === 'whisker');
    if (seriesItems.length > 0) parts.push(`Series: ${seriesItems.map((entry) => entry.label).join(', ')}.`);
    if (uncertaintyItems.length > 0) {
      parts.push(`Uncertainty marks: ${uncertaintyItems.map((entry) => entry.label).join(', ')}.`);
    }
  }
  const panelLabels = plan.panels
    .map((panel) => panel.label)
    .filter((label): label is string => typeof label === 'string' && label.length > 0);
  if (panelLabels.length > 1) parts.push(`Panels: ${panelLabels.join(', ')}.`);
  for (const statement of plan.accessibility.panelSummaries) parts.push(statement);
  parts.push(`${rows} ${rows === 1 ? 'row' : 'rows'} of data.`);

  if (
    valueColumn >= 0 &&
    numericValues.length > 0 &&
    plan.accessibility.suppressGlobalValueRange !== true
  ) {
    const header = plan.table.columns[valueColumn]?.header ?? 'value';
    const extent = finiteExtent(numericValues)!;
    const min = extent.min;
    const max = extent.max;
    parts.push(`${header} ranges from ${formatSummaryNumber(min)} to ${formatSummaryNumber(max)}.`);
  }

  const uncertaintyColumn = plan.table.columns.findIndex((column) => column.key === 'uncertaintyMethod');
  if (uncertaintyColumn >= 0) {
    const methods = [...new Set(plan.table.rows
      .map((row) => row[uncertaintyColumn])
      .filter((value): value is string => typeof value === 'string' && value.length > 0))];
    if (methods.length > 0) parts.push(`Uncertainty declarations: ${methods.join(', ')}.`);
  }

  const disclosureCount = plan.disclosures.length;
  if (disclosureCount > 0) {
    parts.push(
      `${disclosureCount} ${disclosureCount === 1 ? 'disclosure applies' : 'disclosures apply'}: ${plan.disclosures
        .map((disclosure) => disclosure.text)
        .join(' ')}`,
    );
  }
  const emptyPanels = plan.panels.filter((panel) => panel.noData);
  if (emptyPanels.length > 0) {
    parts.push(`No data: ${emptyPanels.map((panel) => panel.noData!.reason).join('; ')}.`);
  }

  return parts.join(' ');
}

function formatSummaryNumber(value: number): string {
  return formatNumber(value);
}

/** Build a figure from raw JSON request text (the strong, duplicate-key-aware boundary). */
export function buildFigureFromJson(
  text: string,
  options: ValidateOptions = {},
): FigureResult | FigureFailure {
  const outcome = parseAndValidateRequest(text, options);
  return dispatch(outcome);
}

/** Build a figure from an already-materialized JS request value. */
export function buildFigure(
  value: unknown,
  options: ValidateOptions = {},
): FigureResult | FigureFailure {
  const outcome = validateRequestValue(value, options);
  return dispatch(outcome);
}

function dispatch(outcome: ValidationOutcome): FigureResult | FigureFailure {
  if (!outcome.ok) return { ok: false, errors: outcome.errors };
  return buildFigureFromValidated(outcome.request);
}

/** Exposed for tests: the observation-count preflight logic. */
export function countObservationsForTest(data: unknown): number {
  return countObservations(data);
}

export { canonicalDigest };
