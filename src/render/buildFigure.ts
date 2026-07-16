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
  compareExactUnitSumToValue,
  compareExactUnitArraySumToDifference,
  convert,
  convertDifference,
  convertExactUnitSum,
  divideExactIntegerByConvertedDifference,
  dimensionOf,
  reciprocalUnit,
  unitLabel,
  type ConversionReceipt,
} from '../core/units.js';
import {
  edgesFromWidth,
  tryEdgesFromWidth,
  binCounts,
  binCenters,
  binIndex,
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
  compileGroupedBarFigure,
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
import {
  exactBinary64DivideByIntegerProduct,
  exactBinary64Mean,
  exactBinary64Sum,
} from '../core/exact-binary64.js';
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

interface DeclaredBins {
  readonly spec: Bins;
  readonly unit: string;
}

function declaredBins(
  node: Record<string, unknown> | undefined,
  fallbackUnit?: string,
): DeclaredBins | undefined {
  if (!node) return undefined;
  const unit = typeof node.unit === 'string' ? node.unit : fallbackUnit;
  if (!unit) return undefined;
  const finalEdgeInclusive = binBoundaryInclusive(node) ?? true;
  if (node.mode === 'edges' || arr(node.edges)) {
    const edges = numbers(node.edges);
    return edges.length >= 2 ? { spec: { edges, finalEdgeInclusive }, unit } : undefined;
  }
  const start = num(node.start);
  const stop = num(node.stop);
  const width = num(node.width);
  if (start === undefined || stop === undefined || width === undefined) return undefined;
  return {
    spec: { edges: edgesFromWidth(start, stop, width), finalEdgeInclusive },
    unit,
  };
}

function binValuesInDeclaredUnit(
  values: readonly number[],
  sourceUnit: string,
  bins: DeclaredBins,
): {
  readonly converted: readonly number[];
  readonly counts: readonly number[];
  readonly underflow: number;
  readonly overflow: number;
  readonly conversion?: ConversionReceipt;
} {
  // These are declared raw observations. Their contract fixes one typed conversion into
  // the bin unit and then applies half-open membership to that converted binary64 value.
  // Derived differences use binExactUnitSums instead, because there the subtraction itself
  // must not round an interval across an edge before membership is decided.
  const converted = sourceUnit === bins.unit
    ? [...values]
    : values.map((value) => convert(value, sourceUnit, bins.unit));
  const counts = new Array<number>(bins.spec.edges.length - 1).fill(0);
  let underflow = 0;
  let overflow = 0;
  for (const value of converted) {
    const index = binIndex(value, bins.spec);
    if (index >= 0) counts[index]++;
    else if (value < bins.spec.edges[0]) underflow++;
    else overflow++;
  }
  return {
    converted,
    counts,
    underflow,
    overflow,
    ...(sourceUnit !== bins.unit ? { conversion: conversionReceipt(sourceUnit, bins.unit) } : {}),
  };
}

function binExactUnitSums(
  observations: readonly (readonly { readonly value: number; readonly unit: string }[])[],
  bins: DeclaredBins,
): {
  readonly converted: readonly number[];
  readonly counts: readonly number[];
  readonly underflow: number;
  readonly overflow: number;
} {
  const edges = bins.spec.edges;
  const binCount = edges.length - 1;
  const counts = new Array<number>(binCount).fill(0);
  const converted: number[] = [];
  let underflow = 0;
  let overflow = 0;
  for (const terms of observations) {
    const compare = (edge: number): -1 | 0 | 1 => compareExactUnitSumToValue(
      terms,
      { value: edge, unit: bins.unit },
    );
    let exactIndex: number;
    if (compare(edges[0]) < 0) exactIndex = -1;
    else {
      const finalComparison = compare(edges[binCount]);
      if (finalComparison > 0 || (finalComparison === 0 && !bins.spec.finalEdgeInclusive)) {
        exactIndex = -1;
      } else if (finalComparison === 0) {
        exactIndex = binCount - 1;
      } else {
        let lo = 0;
        let hi = binCount;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (compare(edges[mid]) >= 0) lo = mid;
          else hi = mid - 1;
        }
        exactIndex = lo;
      }
    }
    const convertedValue = convertExactUnitSum(terms, bins.unit);
    const roundedIndex = binIndex(convertedValue, bins.spec);
    if (exactIndex !== roundedIndex) {
      throw new Error('exact derived quantity rounds across a declared bin boundary');
    }
    converted.push(convertedValue);
    if (exactIndex >= 0) counts[exactIndex]++;
    else if (compare(edges[0]) < 0) underflow++;
    else overflow++;
  }
  return { converted, counts, underflow, overflow };
}

class EmptyHistogramNormalizationError extends Error {}

function histogramValues(
  counts: readonly number[],
  edges: readonly number[],
  binUnit: string,
  normalization: string,
): number[] {
  let total = 0;
  for (const count of counts) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error('histogram counts must be non-negative safe integers');
    }
    total += count;
    if (!Number.isSafeInteger(total)) {
      throw new Error('histogram observation total exceeds the safe-integer domain');
    }
  }
  if (normalization === 'count') return [...counts];
  if (total === 0) {
    throw new EmptyHistogramNormalizationError(
      'probability and density are undefined for an empty histogram',
    );
  }
  if (normalization === 'probability') {
    return counts.map((count) => exactBinary64DivideByIntegerProduct(count, total, 1));
  }
  if (normalization === 'density') {
    return counts.map((count, index) =>
      divideExactIntegerByConvertedDifference(
        count,
        total,
        edges[index],
        edges[index + 1],
        binUnit,
        binUnit,
      ));
  }
  throw new Error(`unsupported histogram normalization ${normalization}`);
}

function histogramYAxisLabel(normalization: string, binUnit: string): string {
  if (normalization === 'count') return 'count';
  if (normalization === 'probability') return 'probability';
  if (normalization === 'density') {
    const unit = reciprocalUnit(binUnit);
    if (!unit) {
      throw new Error(`density requires a registered reciprocal unit for ${binUnit}`);
    }
    return `density (${unitLabel(unit) || unit})`;
  }
  throw new Error(`unsupported histogram normalization ${normalization}`);
}

function conversionDisclosureText(label: string, receipt: ConversionReceipt): string {
  return `${label}: ${receipt.from} -> ${receipt.to} (factor ${receipt.factor})`;
}

interface ConnectionValueGroup {
  readonly id: string;
  readonly values: readonly number[];
  readonly connectionCount: number;
  /** Extra connection rows collapsed into already-formed ordered-pair observations. */
  readonly aggregatedMultapseCount: number;
  readonly missingMeasurementCount: number;
  readonly missingObservationCount: number;
}

function aggregateConnectionValueGroups(
  values: readonly (number | null)[],
  sourceIds: readonly string[],
  targetIds: readonly string[],
  synapseModels: readonly string[],
  countingPolicy: string,
  aggregation: string | undefined,
  groupByModel: boolean,
  missingPairInvalidates: boolean,
  meanAlgorithm: 'canonical_binary64' | 'exact',
): ConnectionValueGroup[] {
  if (sourceIds.length !== values.length || targetIds.length !== values.length) {
    throw new Error('connection measurements must remain index-aligned with both endpoint arrays');
  }
  if (groupByModel && synapseModels.length !== values.length) {
    throw new Error('grouping by synapse model requires one model label per connection row');
  }

  interface MutableGroup {
    id: string;
    values: number[];
    connectionCount: number;
    aggregatedMultapseCount: number;
    missingMeasurementCount: number;
    missingObservationCount: number;
  }
  const canonicalGroups = (groups: Iterable<MutableGroup>): MutableGroup[] =>
    [...groups].sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );
  const groups = new Map<string, MutableGroup>();
  const groupFor = (index: number): MutableGroup => {
    const id = groupByModel ? synapseModels[index] : 'all';
    if (!id) throw new Error('a connection row has no synapse-model group label');
    const existing = groups.get(id);
    if (existing) return existing;
    const created: MutableGroup = {
      id,
      values: [],
      connectionCount: 0,
      aggregatedMultapseCount: 0,
      missingMeasurementCount: 0,
      missingObservationCount: 0,
    };
    groups.set(id, created);
    return created;
  };

  if (countingPolicy === 'per_connection') {
    for (let index = 0; index < values.length; index++) {
      const group = groupFor(index);
      group.connectionCount++;
      const value = values[index];
      if (value === null) {
        group.missingMeasurementCount++;
        group.missingObservationCount++;
      } else {
        group.values.push(value);
      }
    }
    return canonicalGroups(groups.values());
  }
  if (countingPolicy !== 'per_ordered_pair') {
    throw new Error(`unsupported connection counting policy ${countingPolicy}`);
  }
  if (!aggregation) throw new Error('per-ordered-pair counting requires an aggregation');

  interface PairAccumulator {
    readonly group: MutableGroup;
    readonly values: number[];
    connectionCount: number;
    missing: boolean;
  }
  const pairs = new Map<string, PairAccumulator>();
  for (let index = 0; index < values.length; index++) {
    const group = groupFor(index);
    group.connectionCount++;
    const key = `${group.id}\u0000${sourceIds[index]}\u0000${targetIds[index]}`;
    const pair = pairs.get(key) ?? { group, values: [], connectionCount: 0, missing: false };
    pair.connectionCount++;
    const value = values[index];
    if (value === null) {
      group.missingMeasurementCount++;
      pair.missing = true;
    } else {
      pair.values.push(value);
    }
    pairs.set(key, pair);
  }

  const aggregate = (pair: PairAccumulator): number | undefined => {
    if (aggregation === 'no_aggregation' && pair.connectionCount !== 1) {
      throw new Error('no_aggregation was declared for a node pair with multiple connections');
    }
    if (pair.values.length === 0 || (missingPairInvalidates && pair.missing)) {
      pair.group.missingObservationCount++;
      return undefined;
    }
    switch (aggregation) {
      case 'min':
        return pair.values.reduce(
          (minimum, value) => value < minimum ? value : minimum,
          pair.values[0],
        );
      case 'max':
        return pair.values.reduce(
          (maximum, value) => value > maximum ? value : maximum,
          pair.values[0],
        );
      case 'sum':
        return exactBinary64Sum(pair.values);
      case 'mean':
        if (meanAlgorithm === 'exact') return exactBinary64Mean(pair.values);
        {
          const ordered = [...pair.values].sort((left, right) => left - right);
          const sum = ordered.reduce((running, value) => running + value, 0);
          const mean = sum / ordered.length;
          if (!Number.isFinite(mean)) {
            throw new Error('canonical binary64 pair mean is not finite');
          }
          return Object.is(mean, -0) ? 0 : mean;
        }
      case 'no_aggregation':
        return pair.values[0];
      default:
        throw new Error(`unsupported per-pair aggregation ${aggregation}`);
    }
  };
  for (const pair of pairs.values()) {
    const value = aggregate(pair);
    if (value !== undefined) {
      pair.group.values.push(value);
      if (pair.connectionCount > 1) {
        pair.group.aggregatedMultapseCount += pair.connectionCount - 1;
      }
    }
  }
  return canonicalGroups(groups.values());
}

function derivationOperation(
  id: string,
  algorithm: string,
  parameters: Record<string, unknown>,
  input: unknown,
  output: unknown,
  receipt: Record<string, unknown>,
): DerivationOperation {
  return {
    id,
    algorithm,
    algorithmRevision: 1,
    parameters,
    inputDigest: canonicalDigest(input),
    outputDigest: canonicalDigest(output),
    receipt,
  };
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
  const convertedDifference = sourceUnit === targetUnit
    ? exactBinary64Sum([upper, -lower])
    : convertDifference(lower, upper, sourceUnit, targetUnit);
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
      if (parameters.rateMode !== 'binned_count') {
        return fail(
          'RENDER_UNSUPPORTED_SKILL',
          'render',
          `population rate mode ${String(parameters.rateMode)} has no contract-faithful compiler in this build. Cortexel will not substitute a binned count.`,
          '/parameters/rateMode',
        );
      }
      try {
        const timeRecord = rec(data.eventTimes) ?? {};
        const sourceUnit = (timeRecord.unit as string) ?? 'ms';
        const resolvedBins = declaredBins(rec(parameters.bins));
        if (!resolvedBins) return { pending: rendererId };
        const times = numbers(timeRecord.values);
        const recorded = strings(data.recordedSenderIds);
        const normalization = (parameters.normalization as 'mean_rate_per_recorded_sender' | 'total_event_rate') ?? 'total_event_rate';
        const binned = binValuesInDeclaredUnit(times, sourceUnit, resolvedBins);
        const result = computePopulationRate(
          binned.converted,
          resolvedBins.spec,
          resolvedBins.unit,
          recorded.length,
          normalization,
        );
        const operation = derivationOperation(
          'population_rate.binned',
          'cortexel.population_rate.binned_count',
          { bins: resolvedBins, normalization },
          data,
          {
            counts: result.count,
            binWidths: result.binWidth,
            binWidthUnit: resolvedBins.unit,
            ratesHz: result.rateHz,
          },
          {
            recordedSenderCount: recorded.length,
            excludedBelow: result.excludedBelow,
            excludedAbove: result.excludedAbove,
            ...(binned.conversion ? { eventTimeConversion: binned.conversion } : {}),
          },
        );
        const derivedFacts: Partial<DisclosureFacts> = binned.conversion
          ? {
            unitConversions: [
              conversionDisclosureText('population-rate event times', binned.conversion),
            ],
          }
          : {};
        return done(
          compileStepFigure(
            context(result.count.length, derivedFacts),
            result.binStart,
            result.binEnd,
            result.rateHz,
            `time (${unitLabel(resolvedBins.unit)})`,
            'rate (Hz)',
            skillId,
          ),
          [operation],
          derivedFacts,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'population-rate derivation failed';
        return fail(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          message,
          '/data',
        );
      }
    }
    try {
      const edgeRecord = rec(data.binEdges) ?? {};
      const edges = numbers(edgeRecord.edges);
      const timeUnit = (edgeRecord.unit as string) ?? 'ms';
      const counts = numbers(data.counts);
      const recordedSenderCount = num(data.recordedSenderCount) ?? 1;
      const normalization = (parameters.normalization as 'mean_rate_per_recorded_sender' | 'total_event_rate') ?? 'total_event_rate';
      const integerFactor = normalization === 'mean_rate_per_recorded_sender'
        ? recordedSenderCount
        : 1;
      const binWidthConversion = timeUnit !== 's'
        ? conversionReceipt(timeUnit, 's')
        : undefined;
      const suppliedRates = rec(data.rates);
      const suppliedRateUnit = typeof suppliedRates?.unit === 'string'
        ? suppliedRates.unit
        : undefined;
      const suppliedRateConversion = suppliedRateUnit && suppliedRateUnit !== 'Hz'
        ? conversionReceipt(suppliedRateUnit, 'Hz')
        : undefined;
      // Pre-binned input must satisfy the same finite-width obligation as events
      // mode. A rate can remain representable across [-MAX_VALUE, MAX_VALUE], but
      // the figure/table cannot truthfully carry a binary64 bin width for that
      // interval, so materialize every exact endpoint difference and fail closed.
      const binWidths = counts.map((_, index) =>
        convertDifference(edges[index], edges[index + 1], timeUnit, timeUnit));
      const ratesHz = counts.map((count, index) => {
        return divideExactIntegerByConvertedDifference(
          count,
          integerFactor,
          edges[index],
          edges[index + 1],
          timeUnit,
          's',
        );
      });
      const operation = derivationOperation(
        'population_rate.prebinned_verify',
        'cortexel.population_rate.rederive_prebinned',
        { normalization, timeUnit },
        data,
        { counts, binWidths, binWidthUnit: timeUnit, ratesHz },
        {
          recordedSenderCount,
          suppliedRatesReverified: suppliedRates !== undefined,
          ...(binWidthConversion ? { binWidthConversion } : {}),
          ...(suppliedRateConversion ? { suppliedRateConversion } : {}),
        },
      );
      const unitConversions = [
        ...(binWidthConversion
          ? [conversionDisclosureText('population-rate bin widths', binWidthConversion)]
          : []),
        ...(suppliedRateConversion
          ? [conversionDisclosureText('supplied population rates', suppliedRateConversion)]
          : []),
      ];
      const derivedFacts: Partial<DisclosureFacts> = {
        preBinned: true,
        ...(unitConversions.length > 0 ? { unitConversions } : {}),
      };
      return done(
        compileStepFigure(
          context(ratesHz.length, derivedFacts),
          edges.slice(0, -1),
          edges.slice(1),
          ratesHz,
          `time (${unitLabel(timeUnit)})`,
          'rate (Hz)',
          skillId,
        ),
        [operation],
        derivedFacts,
      );
    } catch (error) {
      return fail(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        'science',
        error instanceof Error ? error.message : 'prebinned population-rate derivation failed',
        '/data',
      );
    }
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
      const resolvedBins = declaredBins(rec(parameters.bins));
      if (!resolvedBins) return { pending: rendererId };
      let intervals: number[];
      let sourceUnit: string;
      let exactIntervalTerms:
        | readonly (readonly { readonly value: number; readonly unit: string }[])[]
        | undefined;
      let trainCount = 0;
      let trainsWithoutInterval = 0;
      let spikeCount = 0;
      try {
        if (data.mode === 'intervals') {
          const intervalRecord = rec(data.intervals) ?? {};
          intervals = numbers(intervalRecord.values);
          sourceUnit = (intervalRecord.unit as string) ?? resolvedBins.unit;
          if (intervals.some((interval) => interval < 0)) {
            return fail(
              'SCIENCE_NEGATIVE_INTERVAL',
              'science',
              'a supplied inter-spike interval is negative.',
              '/data/intervals/values',
            );
          }
          const intervalSenders = strings(data.intervalSenderIds);
          const intervalTrials = strings(data.intervalTrialIds);
          const trains = arr(data.trains) ?? [];
          const recordedSenders = strings(data.recordedSenderIds);
          const declaredTrials = strings(data.trialIds);
          const trialMode = arr(data.intervalTrialIds) !== undefined ||
            arr(data.trialIds) !== undefined ||
            trains.some((train) => typeof rec(train)?.trialId === 'string');
          if (trialMode && declaredTrials.length === 0) {
            return fail(
              'SCIENCE_TRIAL_UNIVERSE_REQUIRED',
              'science',
              'trial-partitioned intervals require the complete declared trial universe.',
              '/data/trialIds',
            );
          }
          const expectedTrainCount = recordedSenders.length * (trialMode ? declaredTrials.length : 1);
          if (!Number.isSafeInteger(expectedTrainCount)) {
            throw new Error('the declared sender-by-trial train universe exceeds the safe-integer domain');
          }
          if (trains.length !== expectedTrainCount) {
            return fail(
              'SEMANTIC_LENGTH_MISMATCH',
              'semantic',
              `the complete sender-by-trial universe contains ${expectedTrainCount} trains, but ${trains.length} train records were supplied.`,
              '/data/trains',
            );
          }
          const actualByTrain = new Map<string, number[]>();
          for (let index = 0; index < intervals.length; index++) {
            const key = trialMode
              ? `${intervalSenders[index]}\u0000${intervalTrials[index]}`
              : intervalSenders[index];
            const values = actualByTrain.get(key) ?? [];
            values.push(intervals[index]);
            actualByTrain.set(key, values);
          }
          const senderUniverse = new Set(recordedSenders);
          const trialUniverse = new Set(declaredTrials);
          const declaredTrainKeys = new Set<string>();
          let expectedIntervalCount = 0;
          trainCount = expectedTrainCount;
          for (const trainValue of trains) {
            const train = rec(trainValue) ?? {};
            const senderId = String(train.senderId ?? '');
            const trialId = typeof train.trialId === 'string' ? train.trialId : undefined;
            if (!senderUniverse.has(senderId) ||
              (trialMode && (!trialId || !trialUniverse.has(trialId))) ||
              (!trialMode && trialId !== undefined)) {
              return fail(
                'SEMANTIC_UNKNOWN_REFERENCE',
                'semantic',
                `train (${senderId}, ${trialId ?? 'no trial'}) is not a member of the declared sender-by-trial universe.`,
                '/data/trains',
              );
            }
            const count = num(train.spikeCount);
            if (count === undefined || !Number.isSafeInteger(count) || count < 0) {
              throw new Error('train spike counts must be non-negative safe integers');
            }
            const expected = Math.max(0, count - 1);
            expectedIntervalCount += expected;
            if (!Number.isSafeInteger(expectedIntervalCount)) {
              throw new Error('the expected interval total exceeds the safe-integer domain');
            }
            const key = trialMode ? `${senderId}\u0000${trialId}` : senderId;
            if (declaredTrainKeys.has(key)) {
              return fail(
                'SEMANTIC_DUPLICATE_ID',
                'semantic',
                `train ${key} is declared more than once.`,
                '/data/trains',
              );
            }
            declaredTrainKeys.add(key);
            const actual = actualByTrain.get(key)?.length ?? 0;
            if (actual !== expected) {
              return fail(
                'SEMANTIC_LENGTH_MISMATCH',
                'semantic',
                `train ${key} declares ${count} in-window spikes and therefore must contribute ${expected} intervals, but ${actual} were supplied.`,
                '/data/trains',
              );
            }
            spikeCount += count;
            if (!Number.isSafeInteger(spikeCount)) {
              throw new Error('the declared spike total exceeds the safe-integer domain');
            }
            if (expected === 0) trainsWithoutInterval++;
          }
          const undeclaredIntervalTrain = [...actualByTrain.keys()].find(
            (key) => !declaredTrainKeys.has(key),
          );
          if (undeclaredIntervalTrain !== undefined || expectedIntervalCount !== intervals.length) {
            return fail(
              'SEMANTIC_LENGTH_MISMATCH',
              'semantic',
              undeclaredIntervalTrain !== undefined
                ? `intervals are linked to undeclared train ${undeclaredIntervalTrain}.`
                : `the declared trains imply ${expectedIntervalCount} intervals, but ${intervals.length} were supplied.`,
              '/data/intervalSenderIds',
            );
          }
          const window = rec(data.window) ?? {};
          const windowStart = num(window.start);
          const windowStop = num(window.stop);
          const windowUnit = window.unit as string;
          if (windowStart !== undefined && windowStop !== undefined && typeof windowUnit === 'string') {
            const closedStop = window.boundary === '[start,stop]';
            const impossibleTrain = [...actualByTrain.entries()].find(([, trainIntervals]) => {
              const comparison = compareExactUnitArraySumToDifference(
                trainIntervals,
                sourceUnit,
                { value: windowStart, unit: windowUnit },
                { value: windowStop, unit: windowUnit },
              );
              return comparison > 0 || (comparison === 0 && !closedStop);
            });
            if (impossibleTrain) {
              return fail(
                'SCIENCE_EVENT_OUT_OF_WINDOW',
                'science',
                `the successive intervals of train ${impossibleTrain[0]} span longer than the declared observation window and cannot all join in-window spikes.`,
                '/data/intervals/values',
              );
            }
          }
        } else {
          const timeRecord = rec(data.eventTimes) ?? {};
          const times = numbers(timeRecord.values);
          const senders = strings(data.eventSenderIds);
          const trials = strings(data.eventTrialIds);
          sourceUnit = (timeRecord.unit as string) ?? resolvedBins.unit;
          const events = makeEventTable(
            times,
            senders,
            trials.length === times.length ? trials : undefined,
          );
          const isi = computeIsi(events);
          intervals = isi.intervals;
          exactIntervalTerms = isi.sourcePairs.map((pair) => [
            { value: pair.upper, unit: sourceUnit },
            { value: -pair.lower, unit: sourceUnit },
          ]);
          const recordedSenders = strings(data.recordedSenderIds);
          const declaredTrials = strings(data.trialIds);
          const trialMode = arr(data.eventTrialIds) !== undefined;
          trainCount = recordedSenders.length * (trialMode ? declaredTrials.length : 1);
          if (!Number.isSafeInteger(trainCount)) {
            throw new Error('the declared sender-by-trial train universe exceeds the safe-integer domain');
          }
          const observedTrainsWithIntervals = isi.trainCount - isi.trainsWithoutInterval;
          trainsWithoutInterval = trainCount - observedTrainsWithIntervals;
          spikeCount = times.length;
        }

        if (intervals.some((interval) => interval < 0)) {
          return fail(
            'SCIENCE_NEGATIVE_INTERVAL',
            'science',
            'an inter-spike interval is negative after within-train formation.',
            data.mode === 'intervals' ? '/data/intervals/values' : '/data/eventTimes/values',
          );
        }
        if (intervals.some((interval) => interval === 0) && parameters.zeroIntervalPolicy !== 'retain_as_zero') {
          return fail(
            'SCIENCE_ZERO_INTERVAL_POLICY',
            'science',
            'a zero-length same-train interval is present but the declared policy does not retain it.',
            '/parameters/zeroIntervalPolicy',
          );
        }
        if (
          parameters.xScale === 'log' &&
          (resolvedBins.spec.edges.some((edge) => !(edge > 0)) ||
            intervals.some((interval) => !(interval > 0)))
        ) {
          return fail(
            'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
            'render',
            'a logarithmic ISI axis requires every declared bin edge to be strictly positive.',
            '/parameters/bins',
          );
        }
        const binned = exactIntervalTerms
          ? binExactUnitSums(exactIntervalTerms, resolvedBins)
          : binValuesInDeclaredUnit(intervals, sourceUnit, resolvedBins);
        if (
          parameters.outOfRangeIntervals === 'reject' &&
          (binned.underflow > 0 || binned.overflow > 0)
        ) {
          return fail(
            'SCIENCE_BIN_EDGES_INVALID',
            'science',
            `${binned.underflow} intervals fall below and ${binned.overflow} above the declared bin range under the reject policy.`,
            '/parameters/bins',
          );
        }
        const normalization = String(parameters.normalization ?? 'count');
        const values = histogramValues(
          binned.counts,
          resolvedBins.spec.edges,
          resolvedBins.unit,
          normalization,
        );
        const yLabel = histogramYAxisLabel(normalization, resolvedBins.unit);
        const intervalConversion = sourceUnit !== resolvedBins.unit
          ? conversionReceipt(sourceUnit, resolvedBins.unit)
          : undefined;
        const operation = derivationOperation(
          'isi.within_train_histogram',
          'cortexel.isi.within_train_histogram',
          {
            bins: resolvedBins,
            normalization,
            zeroIntervalPolicy: parameters.zeroIntervalPolicy,
            outOfRangeIntervals: parameters.outOfRangeIntervals,
          },
          data,
          { counts: binned.counts, values },
          {
            formedIntervalCount: intervals.length,
            binnedIntervalCount: binned.counts.reduce((sum, count) => sum + count, 0),
            underRangeCount: binned.underflow,
            overRangeCount: binned.overflow,
            trainCount,
            trainsWithoutInterval,
            spikeCount,
            ...(intervalConversion ? { intervalConversion } : {}),
          },
        );
        const binnedIntervalCount = binned.counts.reduce((sum, count) => sum + count, 0);
        const excludedIntervalCount = binned.underflow + binned.overflow;
        const rangeMetadata = excludedIntervalCount > 0
          ? [
            { key: 'formedIntervalCount', header: 'Formed intervals', value: intervals.length },
            { key: 'binnedIntervalCount', header: 'Binned intervals', value: binnedIntervalCount },
            { key: 'underRangeCount', header: 'Under range', value: binned.underflow },
            { key: 'overRangeCount', header: 'Over range', value: binned.overflow },
          ]
          : [];
        const rangeSummary = excludedIntervalCount > 0
          ? [
            `${excludedIntervalCount} of ${intervals.length} formed intervals were outside the declared histogram range and excluded (${binned.underflow} below, ${binned.overflow} above).`,
          ]
          : [];
        const derivedFacts: Partial<DisclosureFacts> = intervalConversion
          ? { unitConversions: [conversionDisclosureText('inter-spike intervals', intervalConversion)] }
          : {};
        return done(
          compileBarFigure(
            context(values.length, derivedFacts),
            resolvedBins.spec.edges,
            values,
            `ISI (${unitLabel(resolvedBins.unit)})`,
            yLabel,
            skillId,
            parameters.xScale === 'log' ? 'log' : 'linear',
            { tableMetadata: rangeMetadata, summaryStatements: rangeSummary },
          ),
          [operation],
          derivedFacts,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'ISI derivation failed';
        if (error instanceof EmptyHistogramNormalizationError) {
          return fail('RENDER_NO_DATA', 'render', message, '/data');
        }
        const numericResolutionFailure =
          message.includes('overflows') ||
          message.includes('unrepresentable') ||
          message.includes('rounds across') ||
          message.includes('rounded') ||
          message.includes('safe-integer');
        return fail(
          numericResolutionFailure
            ? 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE'
            : 'INTERNAL_INVARIANT_VIOLATED',
          numericResolutionFailure
            ? 'science'
            : 'render',
          message,
          '/data',
        );
      }
    }

    if (skillId === 'network.degree_distribution') {
      const ids = strings(rec(data.nodeUniverse)?.ids);
      const conns = rec(data.connections);
      const sources = strings(conns?.sourceIds);
      const targets = strings(conns?.targetIds);
      const direction = (parameters.direction as 'in' | 'out') ?? 'in';
      const counting = (parameters.countingPolicy as 'count_edges' | 'count_unique_neighbors') ?? 'count_edges';
      const degrees = computeDegrees(ids, sources, targets, direction, counting);
      let collapsedMultapse = false;
      if (counting === 'count_unique_neighbors') {
        const seenPairs = new Set<string>();
        for (let index = 0; index < Math.min(sources.length, targets.length); index++) {
          const key = `${sources[index]}\u0000${targets[index]}`;
          if (seenPairs.has(key)) {
            collapsedMultapse = true;
            break;
          }
          seenPairs.add(key);
        }
      }
      const derivedFacts: Partial<DisclosureFacts> = collapsedMultapse
        ? {
          multapseAggregated: true,
          multapseAggregation: 'count_unique_neighbors',
        }
        : {};
      // Integer-degree histogram: one bar per degree value.
      const maxDeg = Math.max(0, finiteExtent(degrees.degree)?.max ?? 0);
      const edges = Array.from({ length: maxDeg + 2 }, (_v, i) => i - 0.5);
      const { counts } = binCounts(degrees.degree, { edges, finalEdgeInclusive: true });
      return done(
        compileBarFigure(
          context(counts.length, derivedFacts),
          edges,
          counts,
          `${direction}-degree`,
          'node count',
          skillId,
        ),
        [],
        derivedFacts,
      );
    }

    // delay / weight distribution: preserve declared binning, observation unit,
    // multapse aggregation and normalization. A pre-binned request is rendered from
    // its checked values rather than fabricated empty raw observations.
    try {
      const isDelay = skillId === 'network.delay_distribution';
      const normalization = String(parameters.normalization ?? 'count');
      let resolvedBins: DeclaredBins | undefined;
      let histogramGroups: {
        readonly id: string;
        readonly label: string;
        readonly values: readonly number[];
        readonly counts?: readonly number[];
        readonly connectionCount: number;
        readonly aggregatedMultapseCount: number;
        readonly observationCount: number;
        readonly binnedObservationCount: number;
        readonly underRangeCount: number;
        readonly overRangeCount: number;
        readonly missingMeasurementCount: number;
        readonly missingObservationCount?: number;
      }[] = [];
      let measurementConversion: ConversionReceipt | undefined;
      let renderAsGroups = false;

      if (data.mode === 'prebinned') {
        const histogram = rec(data.histogram);
        const edgeRecord = rec(data.binEdges);
        resolvedBins = declaredBins(
          edgeRecord
            ? { mode: 'edges', unit: edgeRecord.unit, edges: edgeRecord.edges, finalEdgeInclusive: true }
            : rec(parameters.bins),
        );
        if (!resolvedBins) return { pending: rendererId };
        if (isDelay && parameters.countingPolicy === 'per_ordered_pair') {
          return fail(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            'prebinned per-ordered-pair delays do not declare the formed pair-observation count, so their normalization denominator cannot be bound to the requested counting policy.',
            '/parameters/countingPolicy',
          );
        }
        const suppliedCounts = arr(data.counts) ? numbers(data.counts) : undefined;
        const underRangeCount = num(data.underRangeCount) ?? num(data.excludedUnderRangeCount) ?? 0;
        const overRangeCount = num(data.overRangeCount) ?? num(data.excludedOverRangeCount) ?? 0;
        const observationCount = num(data.totalObservationCount) ?? num(data.consideredConnectionCount) ?? 0;
        let values: number[];
        let binnedObservationCount: number;
        if (suppliedCounts) {
          values = histogramValues(
            suppliedCounts,
            resolvedBins.spec.edges,
            resolvedBins.unit,
            normalization,
          );
          binnedObservationCount = suppliedCounts.reduce((sum, count) => sum + count, 0);
        } else {
          values = numbers(histogram?.values);
          binnedObservationCount = observationCount - underRangeCount - overRangeCount;
          if (!Number.isSafeInteger(binnedObservationCount) || binnedObservationCount < 0) {
            throw new Error('prebinned histogram conservation produced an invalid observation count');
          }
          if (normalization !== 'count' && binnedObservationCount === 0) {
            throw new EmptyHistogramNormalizationError(
              'probability and density are undefined for an empty histogram',
            );
          }
        }
        histogramGroups = [{
          id: 'all',
          label: String(parameters.selectionLabel ?? 'All observations'),
          values,
          ...(suppliedCounts ? { counts: suppliedCounts } : {}),
          connectionCount: num(data.sourceConnectionCount) ?? num(data.consideredConnectionCount) ?? observationCount,
          // Pre-binned rows no longer reveal pair multiplicity, so Cortexel cannot
          // assert that any multapse was actually collapsed.
          aggregatedMultapseCount: 0,
          observationCount,
          binnedObservationCount,
          underRangeCount,
          overRangeCount,
          missingMeasurementCount: num(data.missingWeightCount) ?? 0,
          ...(!isDelay && parameters.observationUnit === 'synapse'
            ? { missingObservationCount: num(data.missingWeightCount) ?? 0 }
            : {}),
        }];
      } else {
        const connections = rec(data.connections) ?? {};
        const measurement = rec(isDelay ? connections.delays : connections.weights) ?? {};
        const sourceUnit = (measurement.unit as string) ?? (isDelay ? 'ms' : 'nest:weight');
        resolvedBins = declaredBins(rec(parameters.bins), sourceUnit);
        if (!resolvedBins) return { pending: rendererId };
        const sourceIds = strings(connections.sourceIds);
        const targetIds = strings(connections.targetIds);
        const synapseModels = strings(connections.synapseModels);
        const measured = (arr(measurement.values) ?? []).map((value) =>
          typeof value === 'number' && Number.isFinite(value) ? value : null,
        );
        if (isDelay && measured.some((value) => value === null)) {
          throw new Error('a delay connection row is missing its measurement');
        }
        const countingPolicy = isDelay
          ? String(parameters.countingPolicy)
          : parameters.observationUnit === 'node_pair'
            ? 'per_ordered_pair'
            : parameters.observationUnit === 'synapse'
              ? 'per_connection'
              : String(parameters.observationUnit);
        const aggregation = isDelay
          ? typeof parameters.multapseAggregation === 'string'
            ? parameters.multapseAggregation
            : undefined
          : typeof parameters.aggregation === 'string'
            ? parameters.aggregation
            : undefined;
        const groupByModel = isDelay
          ? data.groupBy === 'synapse_model'
          : parameters.grouping === 'by_synapse_model';
        renderAsGroups = groupByModel;
        const aggregatedGroups = aggregateConnectionValueGroups(
          measured,
          sourceIds,
          targetIds,
          synapseModels,
          countingPolicy,
          aggregation,
          groupByModel,
          !isDelay,
          isDelay ? 'canonical_binary64' : 'exact',
        );
        if (aggregatedGroups.length > 8) {
          return fail(
            'RENDER_SERIES_LIMIT_EXCEEDED',
            'render',
            `${aggregatedGroups.length} synapse-model histogram groups exceed the renderer limit of 8.`,
            isDelay ? '/data/groupBy' : '/parameters/grouping',
          );
        }
        const signTreatment = isDelay ? 'preserve' : String(parameters.signTreatment);
        histogramGroups = aggregatedGroups.map((group) => {
          const observations = signTreatment === 'magnitude'
            ? group.values.map((value) => Math.abs(value))
            : [...group.values];
          if (parameters.xScale === 'log' && observations.some((value) => !(value > 0))) {
            throw new Error('logarithmic distribution observations must be strictly positive');
          }
          const binned = binValuesInDeclaredUnit(observations, sourceUnit, resolvedBins!);
          measurementConversion = binned.conversion;
          const binnedObservationCount = binned.counts.reduce((sum, count) => sum + count, 0);
          return {
            id: group.id,
            label: group.id === 'all'
              ? String(parameters.selectionLabel ?? 'All observations')
              : group.id,
            values: histogramValues(
              binned.counts,
              resolvedBins!.spec.edges,
              resolvedBins!.unit,
              normalization,
            ),
            counts: binned.counts,
            connectionCount: group.connectionCount,
            aggregatedMultapseCount: group.aggregatedMultapseCount,
            observationCount: group.values.length,
            binnedObservationCount,
            underRangeCount: binned.underflow,
            overRangeCount: binned.overflow,
            missingMeasurementCount: group.missingMeasurementCount,
            missingObservationCount: group.missingObservationCount,
          };
        });
      }

      const binCount = resolvedBins.spec.edges.length - 1;
      for (const group of histogramGroups) {
        if (group.values.length !== binCount) {
          return fail(
            'SEMANTIC_LENGTH_MISMATCH',
            'semantic',
            `group ${group.id} has ${group.values.length} histogram values for ${binCount} declared bins.`,
            data.mode === 'prebinned' ? '/data' : '/parameters/bins',
          );
        }
        if (group.values.some((value) => !Number.isFinite(value) || value < 0)) {
          return fail(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            `group ${group.id} contains a histogram value that is not finite and non-negative.`,
            data.mode === 'prebinned' ? '/data' : '/parameters/normalization',
          );
        }
      }
      const underflow = histogramGroups.reduce((sum, group) => sum + group.underRangeCount, 0);
      const overflow = histogramGroups.reduce((sum, group) => sum + group.overRangeCount, 0);
      if (
        (isDelay ? parameters.outOfRangeDelays : parameters.outOfRangeWeights) === 'reject' &&
        (underflow > 0 || overflow > 0)
      ) {
        return fail(
          'SCIENCE_BIN_EDGES_INVALID',
          'science',
          `${underflow} observations fall below and ${overflow} above the declared bin range under the reject policy.`,
          '/parameters/bins',
        );
      }
      if (parameters.xScale === 'log' && resolvedBins.spec.edges.some((edge) => !(edge > 0))) {
        return fail(
          'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
          'render',
          'a logarithmic distribution axis requires strictly positive bin edges.',
          '/parameters/bins',
        );
      }
      const yLabel = histogramYAxisLabel(normalization, resolvedBins.unit);
      const sourceConnectionRowCount = histogramGroups.reduce(
        (sum, group) => sum + group.connectionCount,
        0,
      );
      const formedObservationCount = histogramGroups.reduce(
        (sum, group) => sum + group.observationCount,
        0,
      );
      const aggregatedMultapseCount = histogramGroups.reduce(
        (sum, group) => sum + group.aggregatedMultapseCount,
        0,
      );
      const missingMeasurementCount = histogramGroups.reduce(
        (sum, group) => sum + group.missingMeasurementCount,
        0,
      );
      const missingObservationCount = histogramGroups.reduce(
        (sum, group) => sum + (group.missingObservationCount ?? 0),
        0,
      );
      const missingObservationCountKnown = histogramGroups.every(
        (group) => group.missingObservationCount !== undefined,
      );
      const operation = derivationOperation(
        `${isDelay ? 'delay' : 'weight'}_distribution.histogram`,
        `cortexel.${isDelay ? 'delay' : 'weight'}_distribution.histogram`,
        {
          bins: resolvedBins,
          normalization,
          observationUnit: isDelay ? parameters.countingPolicy : parameters.observationUnit,
          ...((isDelay ? parameters.multapseAggregation : parameters.aggregation) !== undefined
            ? { aggregation: isDelay ? parameters.multapseAggregation : parameters.aggregation }
            : {}),
          ...((isDelay ? data.groupBy : parameters.grouping) !== undefined
            ? { grouping: isDelay ? data.groupBy : parameters.grouping }
            : {}),
          ...(isDelay ? {} : { signTreatment: parameters.signTreatment }),
        },
        data,
        {
          groups: histogramGroups.map((group) => ({
            id: group.id,
            ...(group.counts ? { counts: group.counts } : {}),
            values: group.values,
          })),
        },
        {
          sourceConnectionRowCount,
          aggregatedMultapseCount,
          formedObservationCount,
          binnedObservationCount: histogramGroups.reduce(
            (sum, group) => sum + group.binnedObservationCount,
            0,
          ),
          underRangeCount: underflow,
          overRangeCount: overflow,
          missingMeasurementCount,
          ...(missingObservationCountKnown ? { missingObservationCount } : {}),
          prebinned: data.mode === 'prebinned',
          ...(measurementConversion ? { measurementConversion } : {}),
          groups: histogramGroups.map((group) => ({
            id: group.id,
            connectionCount: group.connectionCount,
            aggregatedMultapseCount: group.aggregatedMultapseCount,
            observationCount: group.observationCount,
            binnedObservationCount: group.binnedObservationCount,
            underRangeCount: group.underRangeCount,
            overRangeCount: group.overRangeCount,
            missingMeasurementCount: group.missingMeasurementCount,
            ...(group.missingObservationCount !== undefined
              ? { missingObservationCount: group.missingObservationCount }
              : {}),
          })),
        },
      );
      const conversionFacts = measurementConversion
        ? [conversionDisclosureText(`${isDelay ? 'delay' : 'weight'} observations`, measurementConversion)]
        : [];
      const derivedFacts: Partial<DisclosureFacts> = {
        preBinned: data.mode === 'prebinned',
        missingValueCount: missingMeasurementCount,
        ...(conversionFacts.length > 0 ? { unitConversions: conversionFacts } : {}),
        ...(aggregatedMultapseCount > 0
          ? {
            multapseAggregated: true,
            multapseAggregation: String(
              isDelay ? parameters.multapseAggregation : parameters.aggregation,
            ),
          }
          : {}),
      };
      const rowsTotal = renderAsGroups ? histogramGroups.length * binCount : binCount;
      const xLabelBase = isDelay
        ? 'delay'
        : parameters.signTreatment === 'magnitude'
          ? '|weight|'
          : parameters.observationUnit === 'node_pair'
            ? 'per-pair weight'
            : 'weight';
      const excludedObservationCount = underflow + overflow;
      const reportUngroupedAccounting =
        !renderAsGroups &&
        (excludedObservationCount > 0 || missingMeasurementCount > 0);
      const ungroupedAccountingMetadata = reportUngroupedAccounting
        ? [
          { key: 'connectionCount', header: 'Connection rows', value: sourceConnectionRowCount },
          { key: 'observationCount', header: 'Formed observations', value: formedObservationCount },
          {
            key: 'binnedObservationCount',
            header: 'Binned observations',
            value: histogramGroups.reduce(
              (sum, group) => sum + group.binnedObservationCount,
              0,
            ),
          },
          { key: 'underRangeCount', header: 'Under range', value: underflow },
          { key: 'overRangeCount', header: 'Over range', value: overflow },
          {
            key: 'missingMeasurementCount',
            header: 'Missing measurements',
            value: missingMeasurementCount,
          },
          {
            key: 'missingObservationCount',
            header: 'Missing observations',
            value: missingObservationCountKnown ? missingObservationCount : null,
          },
        ]
        : [];
      const ungroupedAccountingSummary = reportUngroupedAccounting
        ? [
          `${formedObservationCount} observations were formed from ${sourceConnectionRowCount} connection rows; ${histogramGroups.reduce((sum, group) => sum + group.binnedObservationCount, 0)} were binned, ${underflow} fell below the range, ${overflow} above it, and ${missingMeasurementCount} measurements were missing.`,
        ]
        : [];
      const groupedAccountingSummary = renderAsGroups
        ? histogramGroups.map(
          (group) =>
            `Group ${group.id}: ${group.observationCount} observations were formed from ${group.connectionCount} connection rows; ${group.binnedObservationCount} were binned, ${group.underRangeCount} fell below the range, ${group.overRangeCount} above it, and ${group.missingMeasurementCount} measurements were missing.`,
        )
        : [];
      const plan = renderAsGroups
        ? compileGroupedBarFigure(
          context(rowsTotal, derivedFacts),
          resolvedBins.spec.edges,
          histogramGroups,
          `${xLabelBase} (${unitLabel(resolvedBins.unit)})`,
          yLabel,
          skillId,
          parameters.xScale === 'log' ? 'log' : 'linear',
          { summaryStatements: groupedAccountingSummary },
        )
        : compileBarFigure(
          context(rowsTotal, derivedFacts),
          resolvedBins.spec.edges,
          histogramGroups[0]?.values ?? [],
          `${xLabelBase} (${unitLabel(resolvedBins.unit)})`,
          yLabel,
          skillId,
          parameters.xScale === 'log' ? 'log' : 'linear',
          {
            tableMetadata: ungroupedAccountingMetadata,
            summaryStatements: ungroupedAccountingSummary,
          },
        );
      return done(plan, [operation], derivedFacts);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'distribution derivation failed';
      if (error instanceof EmptyHistogramNormalizationError) {
        return fail('RENDER_NO_DATA', 'render', message, '/data');
      }
      if (message.includes('no_aggregation')) {
        return fail('SCIENCE_AGGREGATION_REQUIRED', 'science', message, '/parameters');
      }
      if (message.includes('logarithmic distribution observations')) {
        return fail(
          'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
          'render',
          message,
          '/parameters/xScale',
        );
      }
      return fail(
        message.includes('unit') || message.includes('reciprocal')
          ? 'SCIENCE_UNIT_DIMENSION_MISMATCH'
          : message.includes('histogram') || message.includes('safe-integer')
            ? 'SCIENCE_NORMALIZATION_UNVERIFIABLE'
            : 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        'science',
        message,
        '/data',
      );
    }
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
    const aggregatedMultapse = matrix.cells.some((cell) => cell.contributingCount > 1);
    const derivedFacts: Partial<DisclosureFacts> = aggregatedMultapse
      ? {
        multapseAggregated: true,
        multapseAggregation: method,
      }
      : {};
    return done(
      compileMatrixFigure(
        context(matrix.cells.length, derivedFacts),
        matrix.cells,
        ids,
        ids,
        skillId,
      ),
      [],
      derivedFacts,
    );
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

/**
 * Conservative visible-mark lower bound for declared-bin compilers.
 *
 * This runs before derivation and geometry allocation. A request with 100000 bins and
 * eight model groups otherwise materializes hundreds of thousands of normalized values
 * and rectangle objects only to fail the mark budget after compilation; the same law
 * prevents a single 100000-bin ISI/PSTH figure from doing equivalent work first.
 */
function binnedMarkPreflight(
  skillId: string,
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
): number {
  const supported = new Set([
    'neuro.isi_distribution',
    'neuro.psth',
    'network.delay_distribution',
    'network.weight_distribution',
  ]);
  if (!supported.has(skillId)) return 0;

  const binRecord =
    rec(data.binEdges) ??
    rec(parameters.bins);
  let binCount = 0;
  const explicitEdges = arr(binRecord?.edges);
  if (explicitEdges) {
    binCount = Math.max(0, explicitEdges.length - 1);
  } else if (binRecord?.mode === 'width') {
    const start = num(binRecord.start);
    const stop = num(binRecord.stop);
    const width = num(binRecord.width);
    if (start !== undefined && stop !== undefined && width !== undefined) {
      const materialized = tryEdgesFromWidth(start, stop, width);
      binCount = materialized ? materialized.length - 1 : 0;
    }
  }
  if (binCount === 0) return 0;

  if (
    skillId !== 'network.delay_distribution' &&
    skillId !== 'network.weight_distribution'
  ) return binCount;

  const groupingRequested = skillId === 'network.delay_distribution'
    ? data.groupBy === 'synapse_model'
    : parameters.grouping === 'by_synapse_model';
  if (!groupingRequested || data.mode === 'prebinned') return binCount;

  const models = arr(rec(data.connections)?.synapseModels) ?? [];
  const groupIds = new Set<string>();
  for (const model of models) {
    if (typeof model === 'string') groupIds.add(model);
  }
  const groupCount = Math.max(1, groupIds.size);
  return binCount * groupCount;
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
  const parameters = rec(request.parameters) ?? {};
  const connectionCount = Math.max(
    arr(connections?.sourceIds)?.length ?? 0,
    arr(connections?.targetIds)?.length ?? 0,
  );

  const binnedMarks = binnedMarkPreflight(validated.skillId, data, parameters);
  const preflightMarks =
    validated.skillId === 'neuro.spike_raster'
      ? arr(rec(data.eventTimes)?.values)?.length ?? 0
      : validated.skillId === 'network.connection_graph'
        ? universeSize + connectionCount
        : binnedMarks;
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
