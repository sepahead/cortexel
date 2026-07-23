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
import { canonicalDigest, canonicalDigestExcluding, canonicalize } from '../core/canonicalize.js';
import { deepFreeze } from '../core/deep-freeze.js';
import { validateArtifactStructure } from '../core/structural-validator.js';
import { sha256Digest, utf8ByteLength } from '../core/sha256.js';
import { deriveDisclosures, type Disclosure, type DisclosureFacts } from '../core/disclosures.js';
import {
  exactBinary64EmpiricalQuantileType7,
  exactBinary64SampleStandardDeviation,
} from '../core/exact-binary64.js';
import {
  CATEGORICAL_SERIES_STYLES,
  SKILL_CATALOG,
  UNCERTAINTY_STYLES_BY_KIND,
} from '../generated/catalog.js';
import {
  axesAreCompatible,
  conversionFactor,
  conversionReceipt,
  canonicalUnitFor,
  compareExactUnitSumToValue,
  compareExactUnitArraySumToDifference,
  convert,
  convertDifference,
  convertExactUnitSum,
  deriveExactAggregateCountRateInUnit,
  deriveExactCountRateInUnit,
  divideExactIntegerByConvertedDifference,
  dimensionOf,
  reciprocalUnit,
  unitLabel,
  type ConversionReceipt,
} from '../core/units.js';
import {
  verifyBinnedPeakValueLattice,
  verifyPeakBasisAgainstWindow,
  verifyResponseEventScope,
  RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID,
  responseEventMembershipDigest,
  verifyResponseRateAuthority,
  type BinnedPeakValueLatticeVerification,
  type PeakBasisVerification,
  type RateAuthorityResult,
  type ResponseEventScopeAuthority,
} from '../core/response-curve-basis.js';
import {
  edgesFromWidth,
  tryEdgesFromWidth,
  binCenters,
  derivePsth,
  PsthDerivationError,
  computeDegrees,
  computeCorrelogram,
  countEligibleCorrelogramPairs,
  PairwiseBudgetExceededError,
  deriveEligibleCorrelogramReferenceCounts,
  deriveCorrelogramPairAccounting,
  deriveCorrelogramTargetRates,
  deriveResponseCurve,
  derivePopulationRateCounts,
  deriveIsiFromEvents,
  deriveIsiFromIntervals,
  deriveDegreeDistribution,
  deriveDelayDistribution,
  deriveWeightDistribution,
  DistributionDerivationError,
  type HistogramNormalization,
  type OutOfRangePolicy,
  type PairAggregation,
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
  deriveAdjacencyMatrix,
  deriveDelayMatrix,
  deriveWeightMatrix,
  aggregateTopologyScalar,
  classifySpatialChord,
  spatialDomainAxis,
  spatialDomainAxisContains,
  MatrixDerivationError,
  MATRIX_AXIS_ORDER,
  type MatrixAggregation,
  type MatrixScope,
  type MatrixTopologyInput,
  type SpatialChordRoute,
  type SpatialRoutingDomain,
  type TopologyScalarAggregation,
} from '../analysis/index.js';
import type { PreparedTraceObservation } from '../analysis/traces.js';
import {
  countPlanResources,
  renderSvg,
  RenderPlanGeometryError,
  type SvgReport,
} from './svg.js';
import { formatCoordinate, formatNumber } from './format.js';
import { linearScale, symlogTransform } from './scale.js';
import { MIN_PLOT_PANEL_HEIGHT } from './layout.js';
import { compileStepFigure } from './compile.js';
import {
  compileBarFigure,
  compilePsthFigure,
  compileGroupedBarFigure,
  compileRasterFigure,
  compileMatrixFigure,
  compileSpatialMapFigure,
  compileCompartmentHeatmapFigure,
  compileStemFigure,
  compileResponseCurveFigure,
  compilePhasePlaneFigure,
  compileGraphFigure,
  compileTraceFigure,
  type ConnectionGraphFigureSpec,
  type TracePanelSpec,
} from './compileFamilies.js';
import type { CompileContext } from './compile.js';
import type {
  OutputAuthorityAtomicRoleV1,
  RenderPlanV1,
} from './model/renderPlan.js';
import { closePlainRenderPlanForAuthorityV1 } from './plan-closure.js';
import { checkOutputAuthorityEmissionV1 } from './output-authority-gate.js';
import { getBuildIdentity } from '../generated/identity.js';
import { ARTIFACT_CONTRACT_IDENTITY } from '../core/contract-identity.js';
import { makeError, type CortexelError } from '../core/errors.js';
import {
  DEFAULT_PROFILE,
  trySelectTighterBudgetProfile,
} from '../core/limits.js';
import { finiteExtent } from '../core/numeric.js';
import {
  isOutputAuthoritySummaryFactSafeV1,
  isOutputAuthoritySummarySafeV1,
} from '../core/output-authority.js';
import { materializeCenteredLagBins } from '../core/binning.js';
import {
  exactBinary64DivideByIntegerProduct,
  exactBinary64Mean,
  exactBinary64RatioToDifference,
  exactBinary64Sum,
  exactBinary64WeightedMean,
  exactBinary64WeightedSum,
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
function exactNumberText(value: number): string {
  // ECMAScript Number-to-String is the RFC 8785 numeric spelling. It preserves the
  // complete binary64 value while canonicalizing signed zero, unlike the six-digit
  // display formatter used for ticks and prose summaries.
  return value === 0 ? '0' : String(value);
}
function arr(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}
function rec(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function responseRateAuthorityText(authority: Extract<RateAuthorityResult, { ok: true }>): string {
  if (authority.normalization === 'single_train_rate') {
    return 'single_train_rate (one event train; integer divisor 1)';
  }
  const recordedSenderCount = authority.eventScope.recordedSenderCount as number;
  if (authority.normalization === 'total_event_rate') {
    return `total_event_rate (pooled total over ${recordedSenderCount} recorded sender${recordedSenderCount === 1 ? '' : 's'}; integer divisor 1)`;
  }
  return `mean_rate_per_recorded_sender (pooled total divided by ${recordedSenderCount} recorded sender${recordedSenderCount === 1 ? '' : 's'})`;
}

function responseRateAxisQualifier(authority: Extract<RateAuthorityResult, { ok: true }>): string {
  if (authority.normalization === 'single_train_rate') return 'single train';
  const recordedSenderCount = authority.eventScope.recordedSenderCount as number;
  if (authority.normalization === 'total_event_rate') {
    return `pooled total, ${recordedSenderCount} sender${recordedSenderCount === 1 ? '' : 's'}`;
  }
  return `mean per sender, ${recordedSenderCount} sender${recordedSenderCount === 1 ? '' : 's'}`;
}

function responseEventMembershipText(
  authority: ResponseEventScopeAuthority,
): string {
  if (authority.membershipKind === 'single_train_selection_rule') {
    return 'single_train_selection_rule (source composition not bound)';
  }
  const binding = rec(authority.normalizedScope.membershipBinding);
  if (authority.membershipKind === 'explicit_sender_ids') {
    const normalized = rec(authority.normalizedScope.membershipBinding);
    const senderIds = (arr(normalized?.senderIds) ?? []) as string[];
    const membershipDigest = responseEventMembershipDigest(senderIds);
    return `explicit_sender_ids (${senderIds.length} unique ids; ${RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID}; canonical membership digest ${membershipDigest})`;
  }
  if (authority.membershipKind === 'canonical_sender_ids_digest') {
    return `canonical_sender_ids_digest (${String(binding?.canonicalization)}; ${String(binding?.digest)}; preimage unavailable)`;
  }
  return 'cardinality_only (member identities not bound)';
}

function responseEventAxisQualifier(
  method: string,
  authority: ResponseEventScopeAuthority,
): string {
  const selection = `declared selection ${authority.selectionId}`;
  if (authority.kind === 'single_train') {
    if (method === 'first_spike_latency') return `${selection}; first event in one selected train`;
    if (method === 'event_count') return `${selection}; count in one selected train`;
    return `${selection}; one selected event train`;
  }
  const count = authority.recordedSenderCount as number;
  if (method === 'first_spike_latency') {
    return `${selection}; minimum first-event latency over pooled union of ${count} declared sender trains`;
  }
  if (method === 'event_count') {
    return `${selection}; pooled total count over ${count} declared sender trains`;
  }
  return `${selection}; pooled union of ${count} declared sender trains`;
}

function responseEventScopeText(
  authority: ResponseEventScopeAuthority,
): string {
  const cardinality = authority.recordedSenderCount === null
    ? `${authority.selectedEventTrainCount} selected event train; no recorded-sender cardinality declared`
    : `${authority.selectedEventTrainCount} selected sender event train${authority.selectedEventTrainCount === 1 ? '' : 's'} (including silent senders)`;
  return `${authority.kind} selection ${authority.selectionId}; ${cardinality}; ${responseEventMembershipText(authority)}; declared pooling ${authority.poolingOperator}; declared completeness ${authority.eventCompleteness}`;
}

function peakSupportText(supportValue: unknown): string {
  const support = rec(supportValue);
  if (support?.kind === 'analytic_infinite') return 'analytic infinite support';
  if (support?.kind === 'finite_full_width') {
    return `finite full-width support, ${String(support.supportBoundary)} boundary`;
  }
  if (support?.kind === 'finite_cutoff') {
    const cutoff = rec(support.cutoff);
    return `finite ${String(support.geometry)} cutoff ${exactNumberText(num(cutoff?.value) ?? 0)} ${String(cutoff?.unit ?? '')}, ${String(support.cutoffBoundary)}, ${String(support.tailPolicy)}`;
  }
  return 'unrecognized support';
}

function peakEvaluationText(evaluationValue: unknown): string {
  const evaluation = rec(evaluationValue);
  if (evaluation?.mode === 'continuous_supremum') {
    return `continuous supremum over ${String(evaluation.domain)} ${String(evaluation.boundary)}`;
  }
  const step = rec(evaluation?.step);
  return `sampled grid of ${String(evaluation?.sampleCount)} points from measurement-window start, step ${exactNumberText(num(step?.value) ?? 0)} ${String(step?.unit ?? '')}, ${String(evaluation?.boundary)}, stop excluded, ${String(evaluation?.tilingPolicy)}, partial steps ${String(evaluation?.partialStepPolicy)}`;
}

function peakEstimatorBasisText(basisValue: unknown): string {
  const basis = rec(basisValue);
  if (basis?.estimator === 'binned_count') {
    const width = rec(basis.binWidth);
    return `binned-count peak over ${String(basis.binCount)} bins with exact physical exposure ${exactNumberText(num(width?.value) ?? 0)} ${String(width?.unit ?? '')} verified for every emitted interval, origin ${String(basis.origin)}, ${String(basis.boundary)}, ${String(basis.tilingPolicy)}, partial bins ${String(basis.partialBinPolicy)}`;
  }
  const bandwidth = rec(basis?.bandwidth);
  return `${String(basis?.shape)} ${String(basis?.kernelForm)} kernel, ${String(basis?.bandwidthDefinition)} ${exactNumberText(num(bandwidth?.value) ?? 0)} ${String(bandwidth?.unit ?? '')}, ${peakSupportText(basis?.support)}, ${String(basis?.normalization)}, ${String(basis?.evaluationOperator)}, edge policy ${String(basis?.edgePolicy)}, ${peakEvaluationText(basis?.evaluation)}`;
}

/**
 * Build the disclosure facts from the canonical request.
 *
 * This is where the honesty promise is actually kept: a rank-local network figure only
 * gets its "partial network view" disclosure if `scopeKind` is threaded here from the
 * request. This reads the request's scope, node universe, multapse aggregation, missing
 * values, and uncertainty — not just the source — because every one of those is a fact a
 * disclosure rule fires on. Artifact 1.0 has no compaction or table-excerpt disclosure
 * facts because neither state can be emitted.
 */
function disclosureFacts(
  request: Record<string, unknown>,
  extra: Partial<DisclosureFacts>,
): DisclosureFacts {
  const source = rec(request.source) ?? {};
  const data = rec(request.data) ?? {};
  const parameters = rec(request.parameters) ?? {};
  const uncertainty = rec(parameters.uncertainty) ?? rec(data.uncertainty);
  const eventWindow = rec(data.window);
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
    callerNotePresent: typeof source.declaredNote === 'string',
    nestSerializedClock:
      eventWindow?.kind === 'nest_recording_device_origin_relative',
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
    // Auto/cross is an explicit data-shape discriminator. A silent cross-role train must
    // never be reclassified as auto merely because no active target sender is observable.
    if (data.mode === 'events_auto' || data.mode === 'prebinned_auto') {
      forced.push('ZERO_LAG_SELF_PAIRS_EXCLUDED');
    }
  }

  if (skillId === 'network.adjacency_matrix' || skillId === 'network.weight_matrix' || skillId === 'network.delay_matrix') {
    forced.push('ABSENT_IS_NOT_ZERO');
  }

  if (skillId === 'network.connection_graph') {
    const layoutMode = rec(rec(request.parameters)?.layout)?.mode;
    if (typeof layoutMode === 'string' && layoutMode.startsWith('schematic')) {
      forced.push('SCHEMATIC_LAYOUT');
    }
  }

  if (skillId === 'neuro.response_curve' && data.mode === 'aggregates') {
    forced.push('AGGREGATE_WITHOUT_RAW_REPEATS');
  }

  return forced;
}

function numbers(value: unknown): number[] {
  return (arr(value) ?? []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}
function strings(value: unknown): string[] {
  return (arr(value) ?? []).filter((v): v is string => typeof v === 'string');
}

type TableCell = string | number | null;

/**
 * Bind a family compiler's geometry to the skill contract's normative alternative
 * table.  The source contract owns column identity and order; this boundary owns the
 * corresponding scientific cells.  A width mismatch is an internal contract breach,
 * never something the serializer may pad, truncate, or guess around.
 *
 * Every current stable skill is complete-returned-or-refuse. No internal excerpt is
 * labelled as complete and no unavailable sidecar/reference state exists in V1.
 */
function withContractTable(
  plan: RenderPlanV1,
  _context: CompileContext,
  skillId: string,
  rows: readonly (readonly TableCell[])[],
): RenderPlanV1 {
  const columns = SKILL_CATALOG[skillId].accessibility.tableColumns.map(
    ({ key, header }) => ({ key, header }),
  );
  for (let index = 0; index < rows.length; index++) {
    if (rows[index].length !== columns.length) {
      throw new Error(
        `accessibility table row ${index} for ${skillId} has ${rows[index].length} cells for ${columns.length} contract columns`,
      );
    }
  }
  const returnedRows = rows.map((row) => [...row]);
  return {
    ...plan,
    table: {
      policy: 'complete_returned',
      columns,
      rows: returnedRows,
      rowsInline: returnedRows.length,
      rowsTotal: rows.length,
    },
  };
}

/** A deterministic scalar cell for structured evidence in the row-shaped table. */
function structuredCell(value: unknown): string | null {
  return value === undefined ? null : canonicalize(value);
}

/**
 * Compiler-owned bounded NetworkScope projection. The authority evaluators
 * implement the same closed mapping independently from the canonical request.
 */
function compilerNetworkScopeSummaryCell(value: unknown): string {
  const scope = rec(value);
  if (!scope) throw new Error('NetworkScope must be an object');
  const summary: Record<string, unknown> = { kind: String(scope.kind) };
  if (scope.snapshotTime !== undefined) summary.snapshotTime = scope.snapshotTime;
  switch (scope.kind) {
    case 'single_process':
      break;
    case 'global_merged':
      summary.mergedRanksCoverage = 'all_ranks_0_through_worldSize_minus_1';
      summary.worldSize = scope.worldSize;
      break;
    case 'mpi_target_rank_local':
      summary.localTargetUniverseComplete = scope.localTargetUniverseComplete;
      summary.rank = scope.rank;
      summary.worldSize = scope.worldSize;
      break;
    case 'sampled':
      summary.method = scope.method;
      summary.parentScope = scope.parentScope;
      summary.retainedConnectionCount = scope.retainedConnectionCount;
      summary.sourceConnectionCount = scope.sourceConnectionCount;
      break;
    default:
      throw new Error(`unsupported NetworkScope kind ${String(scope.kind)}`);
  }
  return canonicalize(summary);
}

function booleanCell(value: boolean): string {
  return value ? 'true' : 'false';
}

function countExplicitNulls(values: readonly unknown[]): number {
  let total = 0;
  for (const value of values) if (value === null) total++;
  return total;
}

/** Bind named evidence cells to the generated contract's exact current column order. */
function contractOrderedTableRow(
  skillId: string,
  values: Readonly<Record<string, TableCell>>,
): TableCell[] {
  return SKILL_CATALOG[skillId].accessibility.tableColumns.map(({ key }) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      throw new Error(`compiler did not materialize contract table cell ${key}`);
    }
    return values[key];
  });
}

/** Lexicographic Unicode scalar/code-point order, including deterministic lone surrogates. */
function compareUnicodeCodePoints(left: string, right: string): number {
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

interface ExactSpikeWindowPartition {
  readonly times: readonly number[];
  readonly timeUnit: string;
  readonly windowUnit: string;
  readonly nestOriginRelative: boolean;
  readonly lowerTerms: readonly { readonly value: number; readonly unit: string }[];
  readonly upperTerms: readonly { readonly value: number; readonly unit: string }[];
  readonly boundary: string;
  readonly displayStart: number;
  readonly displayStop: number;
  readonly inWindow: readonly boolean[];
  readonly excludedBelow: number;
  readonly excludedAbove: number;
  readonly excludedCount: number;
  readonly acceptedCount: number;
}

/**
 * One exact implementation of spike-window membership shared by resource preflight and
 * compilation. Endpoint sums are compared as exact rationals; only the two display
 * endpoints are rounded, once, into the event clock.
 */
function exactSpikeWindowPartition(data: Record<string, unknown>): ExactSpikeWindowPartition {
  const eventTimes = rec(data.eventTimes) ?? {};
  const times = numbers(eventTimes.values);
  const window = rec(data.window) ?? {};
  const timeUnit = typeof eventTimes.unit === 'string' ? eventTimes.unit : 'ms';
  const windowUnit = typeof window.unit === 'string' ? window.unit : timeUnit;
  const nestOriginRelative = window.kind === 'nest_recording_device_origin_relative';
  const origin = nestOriginRelative ? num(window.origin) : undefined;
  const start = num(window.start);
  const stop = num(window.stop);
  if (
    start === undefined ||
    stop === undefined ||
    (nestOriginRelative && origin === undefined)
  ) {
    throw new Error('a validated spike-raster window did not retain its finite endpoint terms');
  }

  const lowerTerms = nestOriginRelative
    ? [
        { value: origin!, unit: windowUnit },
        { value: start, unit: windowUnit },
      ]
    : [{ value: start, unit: windowUnit }];
  const upperTerms = nestOriginRelative
    ? [
        { value: origin!, unit: windowUnit },
        { value: stop, unit: windowUnit },
      ]
    : [{ value: stop, unit: windowUnit }];
  const boundary = nestOriginRelative
    ? '(origin+start,origin+stop]'
    : String(window.boundary);
  const openStart = boundary.startsWith('(');
  const closedStop = boundary.endsWith(']');
  const displayStart = convertExactUnitSum(lowerTerms, timeUnit);
  const displayStop = convertExactUnitSum(upperTerms, timeUnit);
  if (!(displayStop > displayStart)) {
    throw new Error(
      'the exact event-window endpoints collapse or invert after their one permitted binary64 display conversion',
    );
  }

  const inWindow = new Array<boolean>(times.length).fill(false);
  let excludedBelow = 0;
  let excludedAbove = 0;
  for (let index = 0; index < times.length; index++) {
    const event = { value: times[index], unit: timeUnit };
    const lowerVsEvent = compareExactUnitSumToValue(lowerTerms, event);
    const upperVsEvent = compareExactUnitSumToValue(upperTerms, event);
    const below = openStart ? lowerVsEvent >= 0 : lowerVsEvent > 0;
    const above = closedStop ? upperVsEvent < 0 : upperVsEvent <= 0;
    if (below) excludedBelow++;
    else if (above) excludedAbove++;
    else inWindow[index] = true;
  }
  const excludedCount = excludedBelow + excludedAbove;
  return {
    times,
    timeUnit,
    windowUnit,
    nestOriginRelative,
    lowerTerms,
    upperTerms,
    boundary,
    displayStart,
    displayStop,
    inWindow,
    excludedBelow,
    excludedAbove,
    excludedCount,
    acceptedCount: times.length - excludedCount,
  };
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

class EmptyHistogramNormalizationError extends Error {}

function sameUnitDifference(lower: number, upper: number, unit: string): number {
  try {
    return convertDifference(lower, upper, unit, unit);
  } catch {
    // Simulator-defined code units deliberately have no conversion factor, even to
    // themselves. Their subtraction is nevertheless meaningful inside the one declared
    // code-unit system. Preserve that narrow case while still refusing overflow or a
    // binary64-collapsed positive interval.
    const difference = upper - lower;
    if (!Number.isFinite(difference) || !(difference > 0)) {
      throw new Error(`the declared ${unit} interval has no finite positive binary64 width`);
    }
    return difference;
  }
}

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

/**
 * Recover the unique integer histogram compatible with a normalized pre-binned
 * channel and its exact declared in-range observation total.  A rounded-looking
 * candidate is not enough: every candidate is run forward through the normative
 * one-round estimator, the complete vector must reproduce byte-identical binary64
 * values, and conservation must hold.  Ambiguity or non-membership fails closed.
 */
function recoverHistogramCounts(
  values: readonly number[],
  edges: readonly number[],
  binUnit: string,
  normalization: string,
  total: number,
): number[] {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error('prebinned histogram has no non-negative safe-integer denominator');
  }
  if (normalization === 'count') {
    if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error('prebinned count histogram contains a non-integer count');
    }
    return [...values];
  }
  const counts = values.map((value, index) => {
    const width = sameUnitDifference(edges[index], edges[index + 1], binUnit);
    const estimate = normalization === 'probability'
      ? value * total
      : value * total * width;
    const nearby = new Set<number>();
    for (let offset = -3; offset <= 3; offset++) {
      nearby.add(Math.floor(estimate) + offset);
      nearby.add(Math.ceil(estimate) + offset);
    }
    const matches = [...nearby].filter((candidate) => {
      if (!Number.isSafeInteger(candidate) || candidate < 0 || candidate > total) return false;
      const forward = normalization === 'probability'
        ? exactBinary64DivideByIntegerProduct(candidate, total, 1)
        : divideExactIntegerByConvertedDifference(
          candidate,
          total,
          edges[index],
          edges[index + 1],
          binUnit,
          binUnit,
        );
      return Object.is(forward, value);
    });
    if (matches.length !== 1) {
      throw new Error(
        `prebinned ${normalization} value at bin ${index} does not identify one unique exact integer count`,
      );
    }
    return matches[0];
  });
  const countTotal = counts.reduce((sum, count) => sum + count, 0);
  if (!Number.isSafeInteger(countTotal) || countTotal !== total) {
    throw new Error(
      `prebinned normalized histogram recovers ${countTotal} counts but declares ${total} in-range observations`,
    );
  }
  const forward = histogramValues(counts, edges, binUnit, normalization);
  if (forward.some((value, index) => !Object.is(value, values[index]))) {
    throw new Error('prebinned normalized histogram is not on the exact integer-count estimator lattice');
  }
  return counts;
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

interface CorrelogramAxis {
  readonly lagUnit: string;
  readonly binWidth: Readonly<{ readonly value: number; readonly unit: string }>;
  readonly binWidthInLagUnit: number;
  readonly spec: Bins;
  readonly centers: readonly number[];
  readonly unitConversions: readonly string[];
}

function correlogramAxis(parameters: Record<string, unknown>): CorrelogramAxis {
  const lag = rec(parameters.lagRange) ?? {};
  const bins = rec(parameters.bins) ?? {};
  const min = num(lag.min);
  const max = num(lag.max);
  const width = num(bins.width);
  const lagUnit = typeof lag.unit === 'string' ? lag.unit : undefined;
  const binUnit = typeof bins.unit === 'string' ? bins.unit : undefined;
  if (
    min === undefined ||
    max === undefined ||
    width === undefined ||
    lagUnit === undefined ||
    binUnit === undefined
  ) {
    throw new Error('validated correlogram request has no complete typed centred-lag axis');
  }
  const widthInLagUnit = binUnit === lagUnit ? width : convert(width, binUnit, lagUnit);
  const materialized = materializeCenteredLagBins(min, max, widthInLagUnit, 20_001);
  if (!materialized.ok) {
    throw new Error(`validated correlogram centred-lag axis cannot be materialized (${materialized.reason})`);
  }
  const spec: Bins = { edges: [...materialized.edges], finalEdgeInclusive: false };
  const widthConversion = binUnit === lagUnit
    ? undefined
    : conversionReceipt(binUnit, lagUnit);
  return {
    lagUnit,
    binWidth: { value: width, unit: binUnit },
    binWidthInLagUnit: widthInLagUnit,
    spec,
    centers: binCenters(spec),
    unitConversions: widthConversion
      ? [conversionDisclosureText('correlogram bin width', widthConversion)]
      : [],
  };
}

interface RawCorrelogramInputs extends CorrelogramAxis {
  readonly ref: readonly number[];
  readonly tgt: readonly number[];
  readonly referenceTimesInSourceUnit: readonly number[];
  readonly referenceTimeUnit: string;
  readonly kind: 'auto' | 'cross';
  readonly referenceLabel: string;
  readonly targetLabel: string;
  readonly referenceRecordedSenderCount: number;
  readonly targetRecordedSenderCount: number;
  readonly window: {
    readonly start: number;
    readonly stop: number;
    readonly unit: string;
    readonly boundary: '[start,stop)' | '[start,stop]' | '(start,stop]';
  };
}

function eventCorrelogramInputs(
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
): RawCorrelogramInputs | undefined {
  if (data.mode !== 'events_auto' && data.mode !== 'events_cross') return undefined;
  const axis = correlogramAxis(parameters);
  const window = rec(data.window) ?? {};
  const windowStart = num(window.start);
  const windowStop = num(window.stop);
  const windowUnit = typeof window.unit === 'string' ? window.unit : undefined;
  const windowBoundary = window.boundary;
  if (
    windowStart === undefined ||
    windowStop === undefined ||
    windowUnit === undefined ||
    (windowBoundary !== '[start,stop)' &&
      windowBoundary !== '[start,stop]' &&
      windowBoundary !== '(start,stop]')
  ) {
    throw new Error('validated correlogram request has no complete typed observation window');
  }

  const kind = data.mode === 'events_auto' ? 'auto' as const : 'cross' as const;
  const referenceTrain = rec(kind === 'auto' ? data.train : data.referenceTrain) ?? {};
  const targetTrain = kind === 'auto' ? referenceTrain : rec(data.targetTrain) ?? {};
  const referenceTimes = rec(referenceTrain.eventTimes) ?? {};
  const targetTimes = rec(targetTrain.eventTimes) ?? {};
  const referenceSourceValues = numbers(referenceTimes.values);
  const targetSourceValues = kind === 'auto'
    ? referenceSourceValues
    : numbers(targetTimes.values);
  const referenceTimeUnit = typeof referenceTimes.unit === 'string'
    ? referenceTimes.unit
    : undefined;
  const targetTimeUnit = typeof targetTimes.unit === 'string' ? targetTimes.unit : undefined;
  if (referenceTimeUnit === undefined || targetTimeUnit === undefined) {
    throw new Error('validated correlogram event train has no explicit event-time unit');
  }
  const ref = referenceTimeUnit === axis.lagUnit
    ? [...referenceSourceValues]
    : referenceSourceValues.map((value) => convert(value, referenceTimeUnit, axis.lagUnit));
  const tgt = kind === 'auto'
    ? ref
    : targetTimeUnit === axis.lagUnit
      ? [...targetSourceValues]
      : targetSourceValues.map((value) => convert(value, targetTimeUnit, axis.lagUnit));
  const referenceConversion = referenceTimeUnit === axis.lagUnit
    ? undefined
    : conversionReceipt(referenceTimeUnit, axis.lagUnit);
  const targetConversion = kind === 'cross' && targetTimeUnit !== axis.lagUnit
    ? conversionReceipt(targetTimeUnit, axis.lagUnit)
    : undefined;

  return {
    ...axis,
    ref,
    tgt,
    referenceTimesInSourceUnit: referenceSourceValues,
    referenceTimeUnit,
    kind,
    referenceLabel: String(referenceTrain.label),
    targetLabel: String(targetTrain.label),
    referenceRecordedSenderCount: strings(referenceTrain.recordedSenderIds).length,
    targetRecordedSenderCount: strings(targetTrain.recordedSenderIds).length,
    window: {
      start: windowStart,
      stop: windowStop,
      unit: windowUnit,
      boundary: windowBoundary,
    },
    unitConversions: [
      ...axis.unitConversions,
      ...(referenceConversion
        ? [conversionDisclosureText('correlogram reference-event times', referenceConversion)]
        : []),
      ...(targetConversion
        ? [conversionDisclosureText('correlogram target-event times', targetConversion)]
        : []),
    ],
  };
}

/**
 * Preserve the complete lag domain while refusing to draw an undefined rate as zero.
 *
 * The revision-2 stem compiler accepts only finite ordinates. We feed zero solely to
 * establish its non-negative full-domain scales, then remove the exact indexed stems
 * and points for null bins before the plan can escape this function. An all-null result
 * retains its lag axis and receives an explicit scientific no-data reason.
 */
function compileNullableCorrelogramStemFigure(
  context: CompileContext,
  edges: readonly number[],
  centers: readonly number[],
  values: readonly (number | null)[],
  xLabel: string,
  yLabel: string,
  skillId: string,
): RenderPlanV1 {
  if (centers.length !== values.length) {
    throw new Error('correlogram geometry has different centre and value cardinalities');
  }
  if (edges.length !== centers.length + 1) {
    throw new Error('correlogram geometry has no exact edge pair for every centre');
  }
  const defined = values.map((value) => value !== null);
  const definedCount = defined.filter(Boolean).length;
  const scaffold = compileStemFigure(
    context,
    centers,
    values.map((value) => value ?? 0),
    xLabel,
    yLabel,
    skillId,
  );
  const panels = scaffold.panels.map((panel) => {
    const marks = panel.marks.map((mark) => {
      if (mark.type === 'rule' && mark.orientation === 'vertical') {
        if (mark.lines.length !== defined.length) {
          throw new Error('correlogram stem scaffold lost its one-line-per-bin invariant');
        }
        return {
          ...mark,
          lines: mark.lines.flatMap((line, index) => defined[index]
            ? [{ ...line, authority: { tag: 'connector' as const } }]
            : []),
        };
      }
      if (mark.type === 'point') {
        if (mark.points.length !== defined.length) {
          throw new Error('correlogram stem scaffold lost its one-point-per-bin invariant');
        }
        return {
          ...mark,
          points: mark.points.flatMap((point, index) => defined[index]
            ? [{
              ...point,
              authority: {
                tag: 'data_carrier' as const,
                classId: 'bins',
                provenance: {
                  binIndex: index,
                  lagBinStart: edges[index],
                  lagBinCenter: centers[index],
                  lagBinEnd: edges[index + 1],
                },
              },
            }]
            : []),
        };
      }
      throw new Error(`correlogram stem scaffold emitted unexpected ${mark.type} geometry`);
    });
    return {
      ...panel,
      marks,
      ...(definedCount === 0
        ? {
          noData: {
            reason:
              'every target-rate bin is undefined because its eligible-reference count is zero',
          },
        }
        : {}),
    };
  });
  return { ...scaffold, panels };
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
    structuredPolicy?.method ??
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

function traceOutputAuthority(
  series: PreparedTraceSeries,
  pathClassId: string,
  sampleClassId: string,
  uncertaintyClassId: string,
): NonNullable<TracePanelSpec['series'][number]['outputAuthority']> {
  return {
    pathClassId,
    sampleClassId,
    uncertaintyClassId,
    observationProvenance: series.observations.map((observation) => ({
      seriesId: series.id,
      sourceOrdinals: [...observation.sourceOrdinals],
    })),
  };
}

function traceCell(values: readonly (string | number | null)[]): string | number | null {
  return values.length === 1 ? values[0] : JSON.stringify(values);
}

/**
 * Fill a source-owned accessibility template from compiler-owned facts.
 *
 * This is deliberately separate from every OutputAuthority evaluator.  The compiler
 * and evaluator must reach the same text through independent derivations; the emission
 * gate compares them.  A malformed template or display-unsafe fact is an internal
 * refusal, never something this boundary sanitizes into a different scientific claim.
 */
function traceCompilerSourceSummary(
  skillId: string,
  facts: Readonly<Record<string, string>>,
): string {
  const template = SKILL_CATALOG[skillId].accessibility.summaryTemplate;
  const placeholderPattern = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
  const required: string[] = [];
  for (const match of template.matchAll(placeholderPattern)) required.push(match[1]);
  const requiredSet = new Set(required);
  const templateLiterals = template.replace(placeholderPattern, '');
  if (
    required.length === 0 ||
    templateLiterals.includes('{') ||
    templateLiterals.includes('}')
  ) {
    throw new Error(`${skillId} accessibility summary template has no placeholders or contains a malformed token`);
  }
  const supplied = Object.keys(facts);
  const missing = [...requiredSet].filter((key) => !Object.prototype.hasOwnProperty.call(facts, key));
  const extra = supplied.filter((key) => !requiredSet.has(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${skillId} compiler summary facts do not exactly match its source template (missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'})`,
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!isOutputAuthoritySummaryFactSafeV1(value)) {
      throw new Error(`${skillId} compiler summary fact ${key} is not safe, well-formed display text`);
    }
  }
  const summary = template.replace(placeholderPattern, (_placeholder, key: string) => facts[key]);
  // Fact text is literal data. It must never be reparsed as a second template program.
  if (!isOutputAuthoritySummarySafeV1(summary)) {
    throw new Error(`${skillId} compiler produced an unsafe summary`);
  }
  return summary;
}

function traceCompilerContext(
  base: CompileContext,
  skillId: string,
  facts: Readonly<Record<string, string>>,
): CompileContext {
  return { ...base, summary: traceCompilerSourceSummary(skillId, facts) };
}

/**
 * Distribution compilers build their own summary body from analysis-owned facts.
 * This deliberately does not import or consult the request-only authority evaluator.
 */
function distributionCompilerSourceSummary(
  skillId: string,
  facts: Readonly<Record<string, string>>,
): string {
  const template = SKILL_CATALOG[skillId].accessibility.summaryTemplate;
  const placeholderPattern = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
  const required: string[] = [];
  for (const match of template.matchAll(placeholderPattern)) required.push(match[1]);
  const requiredSet = new Set(required);
  const templateLiterals = template.replace(placeholderPattern, '');
  if (
    required.length === 0 ||
    templateLiterals.includes('{') ||
    templateLiterals.includes('}')
  ) {
    throw new Error(`${skillId} accessibility summary template has no placeholders or contains a malformed token`);
  }
  const supplied = Object.keys(facts);
  const missing = [...requiredSet].filter(
    (key) => !Object.prototype.hasOwnProperty.call(facts, key),
  );
  const extra = supplied.filter((key) => !requiredSet.has(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${skillId} distribution compiler summary facts do not exactly match its source template (missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'})`,
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!isOutputAuthoritySummaryFactSafeV1(value)) {
      throw new Error(
        `${skillId} distribution compiler summary fact ${key} is not safe, well-formed display text`,
      );
    }
  }
  const summary = template.replace(placeholderPattern, (_placeholder, key: string) => facts[key]);
  // Fact text is literal data. It must never be reparsed as a second template program.
  if (!isOutputAuthoritySummarySafeV1(summary)) {
    throw new Error(`${skillId} distribution compiler produced an unsafe summary`);
  }
  return summary;
}

function distributionCompilerContext(
  base: CompileContext,
  skillId: string,
  facts: Readonly<Record<string, string>>,
): CompileContext {
  return { ...base, summary: distributionCompilerSourceSummary(skillId, facts) };
}

/**
 * Close one topology/dynamics compiler summary against its source-owned template.
 *
 * The facts passed here are derived inside the family compiler from its locally closed
 * scientific carriers.  The independent request-only authority evaluator performs a
 * separate derivation and the final frozen-plan gate requires byte-exact agreement.
 */
function topologyDynamicsCompilerSourceSummary(
  skillId: string,
  facts: Readonly<Record<string, string>>,
): string {
  const template = SKILL_CATALOG[skillId].accessibility.summaryTemplate;
  if (!isOutputAuthoritySummarySafeV1(template)) {
    throw new Error(
      `${skillId} topology/dynamics compiler source template is not bounded control-safe display text`,
    );
  }
  const placeholderPattern = /\{([A-Za-z][A-Za-z0-9]*)\}/gu;
  const withoutRecognizedTokens = template.replace(/\{[A-Za-z][A-Za-z0-9]*\}/gu, '');
  if (withoutRecognizedTokens.includes('{') || withoutRecognizedTokens.includes('}')) {
    throw new Error(
      `${skillId} topology/dynamics compiler source template contains an unrecognized brace token`,
    );
  }
  const required: string[] = [];
  for (const match of template.matchAll(placeholderPattern)) required.push(match[1]);
  const requiredSet = new Set(required);
  const supplied = Object.keys(facts);
  const missing = [...requiredSet].filter(
    (key) => !Object.prototype.hasOwnProperty.call(facts, key),
  );
  const extra = supplied.filter((key) => !requiredSet.has(key));
  if (
    required.length === 0 ||
    missing.length > 0 ||
    extra.length > 0
  ) {
    throw new Error(
      `${skillId} topology/dynamics compiler summary facts do not exactly match its source template (missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'})`,
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!isOutputAuthoritySummaryFactSafeV1(value)) {
      throw new Error(
        `${skillId} topology/dynamics compiler summary fact ${key} is not bounded control-safe display text`,
      );
    }
  }
  const summary = template.replace(placeholderPattern, (_placeholder, key: string) => facts[key]);
  if (!isOutputAuthoritySummarySafeV1(summary)) {
    throw new Error(
      `${skillId} topology/dynamics compiler produced an unsafe summary`,
    );
  }
  return summary;
}

function topologyDynamicsCompilerContext(
  base: CompileContext,
  skillId: string,
  facts: Readonly<Record<string, string>>,
): CompileContext {
  return { ...base, summary: topologyDynamicsCompilerSourceSummary(skillId, facts) };
}

function distributionCompilerNumber(value: number): string {
  return value === 0 ? '0' : String(value);
}

function distributionCompilerExtrema(
  values: readonly number[],
): { readonly min: number; readonly max: number } | null {
  if (values.length === 0) return null;
  let min = values[0];
  let max = values[0];
  for (let index = 1; index < values.length; index++) {
    const value = values[index];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function distributionCompilerSortedUnique(values: readonly string[]): string {
  return [...new Set(values)].sort(compareUnicodeCodePoints).join(', ');
}

/** ECMAScript shortest round-trippable binary64 text with canonical signed zero. */
function traceCompilerSummaryNumber(value: number): string {
  return value === 0 ? '0' : String(value);
}

function traceCompilerJoinUnique(values: readonly string[]): string {
  return [...new Set(values)].join(', ');
}

function traceCompilerOriginText(raw: Record<string, unknown>): string {
  const origin = rec(raw.origin) ?? {};
  return origin.kind === 'derived'
    ? `derived: ${String(origin.method ?? 'unspecified')}`
    : String(origin.kind ?? 'unknown');
}

function traceCompilerDuplicateStatement(
  parameters: Record<string, unknown>,
  traces: readonly PreparedTraceSeries[],
): string {
  const options = traceDuplicateOptions(parameters);
  const groups = traces.reduce((sum, trace) => sum + trace.duplicateGroups, 0);
  if (groups === 0) {
    return `${String(options.duplicatePolicy ?? 'reject_if_present')} (no duplicate groups present)`;
  }
  return options.duplicatePolicy === 'aggregate'
    ? `aggregate (${String(options.aggregateMethod)}; ${groups} duplicate groups)`
    : `${String(options.duplicatePolicy)} (${groups} duplicate groups)`;
}

function traceCompilerUnitConversionStatement(traces: readonly PreparedTraceSeries[]): string {
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

function traceCompilerUncertaintyStatement(
  uncertainties: readonly (Record<string, unknown> | undefined)[],
): string {
  const descriptions = uncertainties.map((uncertainty) => {
    const kind = typeof uncertainty?.kind === 'string' ? uncertainty.kind : 'none';
    return kind === 'none' && typeof uncertainty?.reason === 'string'
      ? `none (${uncertainty.reason})`
      : kind;
  });
  return `Uncertainty declarations: ${traceCompilerJoinUnique(descriptions)}.`;
}

function traceCompilerWeightUncertaintyStatement(
  uncertainties: readonly (Record<string, unknown> | undefined)[],
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
    throw new Error(`unsupported synaptic-weight uncertainty summary kind ${kind}`);
  });
  return `Uncertainty declarations: ${traceCompilerJoinUnique(descriptions)}.`;
}

function traceCompilerNoCompactionStatement(): string {
  return 'No compaction was applied; every accepted row is returned.';
}

function traceCompilerMinimum(values: readonly number[]): number {
  if (values.length === 0) throw new Error('minimum of an empty sequence is undefined');
  let result = values[0];
  for (let index = 1; index < values.length; index++) result = Math.min(result, values[index]);
  return result;
}

function traceCompilerMaximum(values: readonly number[]): number {
  if (values.length === 0) throw new Error('maximum of an empty sequence is undefined');
  let result = values[0];
  for (let index = 1; index < values.length; index++) result = Math.max(result, values[index]);
  return result;
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

function traceSeriesHasCompleteDrawableUncertainty(
  entry: TracePanelSpec['series'][number],
  showSamplePoints = false,
): boolean {
  const lower = entry.uncertaintyLower;
  const upper = entry.uncertaintyUpper;
  if (!lower || !upper || !entry.uncertainty) return false;
  let eligibleIndexes: readonly number[];
  if (entry.uncertainty.mark === 'whisker' || entry.renderRuns === undefined) {
    eligibleIndexes = entry.series.observations.map((_observation, index) => index);
  } else {
    const renderedLineage = new Set<string>();
    for (const run of entry.renderRuns) {
      for (const role of run.authority ?? []) {
        if (role.tag !== 'data_carrier') continue;
        const provenance = rec(role.provenance);
        const sourceOrdinals = arr(provenance?.sourceOrdinals);
        if (sourceOrdinals) renderedLineage.add(canonicalize(sourceOrdinals));
      }
    }
    const eligible = new Set(
      entry.series.observations.flatMap((observation, index) =>
        renderedLineage.has(canonicalize(observation.sourceOrdinals)) ? [index] : []),
    );
    if (showSamplePoints) {
      for (const index of entry.markerObservationIndexes ??
        entry.series.observations.map((_observation, observationIndex) => observationIndex)) {
        eligible.add(index);
      }
    }
    eligibleIndexes = [...eligible].sort((left, right) => left - right);
  }
  let observed = false;
  for (const index of eligibleIndexes) {
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
  if (kind === 'credible_interval') {
    return makeError({
      code: 'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
      stage: 'science',
      instancePath: `${instancePath}/kind`,
      skillId,
      message:
        'every stable Artifact 1.0 skill refuses credible intervals because the request and artifact contracts have no verified-attestation input or verifier; Cortexel cannot promote caller-supplied bounds into posterior evidence.',
    });
  }
  if (!(SKILL_CATALOG[skillId].uncertaintySupport as readonly string[]).includes(kind)) {
    return makeError({
      code: 'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
      stage: 'science',
      instancePath: `${instancePath}/kind`,
      skillId,
      message: `${skillId} does not support uncertainty kind ${kind}.`,
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
  stateEvidence?: {
    readonly observation: Record<string, unknown>;
    readonly statePrepared: PreparedTraceSeries;
    readonly stateWindow: {
      readonly start: number;
      readonly stop: number;
      readonly unit: string;
    };
    readonly membershipLifetimes?: readonly { readonly start: number; readonly stop: number }[];
    readonly fullMaterialization?: unknown;
    readonly displayedMaterialization?: unknown;
    readonly stateWitnesses?: readonly unknown[];
    readonly initialStateConsumedByDerivedAggregate?: boolean;
  },
): DerivationOperation {
  const duplicate = traceDuplicateOptions(parameters);
  const retainedSourceCount = prepared.replicateCounts.reduce((sum, count) => sum + count, 0);
  return {
    id: `trace.prepare.${prepared.id}`,
    algorithm: 'cortexel.trace.prepare_series',
    algorithmRevision: stateEvidence ? 2 : 1,
    parameters: {
      window,
      duplicateTimePolicy: duplicate.duplicatePolicy ?? 'reject_if_present',
      ...(duplicate.aggregateMethod ? { aggregateMethod: duplicate.aggregateMethod } : {}),
      targetTimeUnit: prepared.timeUnit,
      targetValueUnit: prepared.valueUnit,
      ...(prepared.normalization ? { normalization: prepared.normalization.method } : {}),
      ...(stateEvidence
        ? {
          observation: stateEvidence.observation,
          stateWindow: stateEvidence.stateWindow,
          ...(stateEvidence.membershipLifetimes
            ? { membershipLifetimes: stateEvidence.membershipLifetimes }
            : {}),
        }
        : {}),
    },
    inputDigest: canonicalDigest(stateEvidence
      ? {
        inputPayload,
        observation: stateEvidence.observation,
        analysisWindow: window,
        stateWindow: stateEvidence.stateWindow,
        membershipLifetimes: stateEvidence.membershipLifetimes ?? null,
      }
      : inputPayload),
    outputDigest: canonicalDigest({
      id: prepared.id,
      observations: prepared.observations,
      timeUnit: prepared.timeUnit,
      valueUnit: prepared.valueUnit,
      sourceTimeUnit: prepared.sourceTimeUnit,
      sourceValueUnit: prepared.sourceValueUnit,
      ...(uncertainty?.lower ? { uncertaintyLower: uncertainty.lower } : {}),
      ...(uncertainty?.upper ? { uncertaintyUpper: uncertainty.upper } : {}),
      ...(stateEvidence
        ? {
          stateObservations: stateEvidence.statePrepared.observations,
          stateTimeUnit: stateEvidence.statePrepared.timeUnit,
          stateValueUnit: stateEvidence.statePrepared.valueUnit,
          fullMaterialization: stateEvidence.fullMaterialization ?? null,
          displayedMaterialization: stateEvidence.displayedMaterialization ?? null,
          stateWitnesses: stateEvidence.stateWitnesses ?? [],
          initialStateConsumedByDerivedAggregate:
            stateEvidence.initialStateConsumedByDerivedAggregate === true,
        }
        : {}),
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
      ...(stateEvidence
        ? {
          fullStateBeforeDisplayClip: true,
          stateObservationCount: stateEvidence.statePrepared.observations.reduce(
            (sum, observation) => sum + observation.replicateCount,
            0,
          ),
          stateOutputRowCount: stateEvidence.statePrepared.outputCount,
          stateObservationDigest: canonicalDigest(stateEvidence.statePrepared.observations),
          displayedObservationDigest: canonicalDigest(prepared.observations),
          fullMaterializationDigest: canonicalDigest(stateEvidence.fullMaterialization ?? null),
          displayedMaterializationDigest: canonicalDigest(
            stateEvidence.displayedMaterialization ?? null,
          ),
          stateWitnessCount: stateEvidence.stateWitnesses?.length ?? 0,
          stateWitnessDigest: canonicalDigest(stateEvidence.stateWitnesses ?? []),
          initialStateConsumedByDerivedAggregate:
            stateEvidence.initialStateConsumedByDerivedAggregate === true,
        }
        : {}),
    },
  };
}

const WEIGHT_TRACE_PREPARATION_BATCH_DOMAIN =
  'cortexel.weight_trace.prepare_series_batch/v1';
const COMPARTMENT_TRACE_PREPARATION_BATCH_DOMAIN =
  'cortexel.compartment_trace.prepare_series_batch/v1';
const MAX_TRACE_PREPARATION_VIEW_ROWS = 250_000;

type TracePreparationBatchFamily = 'weight' | 'compartment';

interface TracePreparationBatchViewInput {
  readonly kind: 'display' | 'state';
  readonly prepared: PreparedTraceSeries;
  readonly window: TraceWindow;
  readonly uncertaintyLower?: readonly (number | null)[];
  readonly uncertaintyUpper?: readonly (number | null)[];
}

interface TracePreparationBatchEntryInput {
  readonly sourceIndex: number;
  readonly seriesIdentity: Readonly<Record<string, unknown>>;
  readonly role: 'source_series' | 'declared_aggregate';
  readonly inputPayload: unknown;
  readonly views: readonly TracePreparationBatchViewInput[];
  readonly transforms: Readonly<Record<string, unknown>>;
  readonly contextWitnesses?: readonly unknown[];
  readonly materialization?: {
    readonly full: unknown;
    readonly displayed: unknown;
  };
  readonly initialStatePainted: boolean;
  readonly initialStateConsumedByDerivedAggregate: boolean;
}

function traceBatchDigest(
  digestDomain: string,
  suffix:
    | 'global-context'
    | 'series-input'
    | 'view-output'
    | 'retained-source-ordinals'
    | 'context-witness'
    | 'materialization-full'
    | 'materialization-displayed'
    | 'operation-input'
    | 'operation-output',
  payload: unknown,
): string {
  return canonicalDigest({
    digestDomain: `${digestDomain}/${suffix}`,
    payload,
  });
}

function nonIdentityConversion(
  from: string | undefined,
  to: string | undefined,
): ConversionReceipt | null {
  return from !== undefined && to !== undefined && from !== to
    ? conversionReceipt(from, to)
    : null;
}

function tracePreparationBatchViewReceipt(
  digestDomain: string,
  sourceIndex: number,
  seriesIdentity: Readonly<Record<string, unknown>>,
  view: TracePreparationBatchViewInput,
): Record<string, unknown> {
  const prepared = view.prepared;
  const boundedCounters = [
    prepared.inputCount,
    prepared.outputCount,
    prepared.excludedBelow,
    prepared.excludedAbove,
    prepared.missingCount,
    prepared.duplicateGroups,
  ];
  if (
    !Number.isFinite(view.window.start) ||
    !Number.isFinite(view.window.stop) ||
    !(view.window.stop > view.window.start) ||
    view.window.unit !== prepared.timeUnit ||
    boundedCounters.some((count) =>
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > MAX_TRACE_PREPARATION_VIEW_ROWS) ||
    prepared.times.length !== prepared.outputCount ||
    prepared.values.length !== prepared.outputCount ||
    prepared.replicateCounts.length !== prepared.outputCount ||
    prepared.observations.length !== prepared.outputCount ||
    (view.uncertaintyLower === undefined) !== (view.uncertaintyUpper === undefined) ||
    (view.uncertaintyLower !== undefined &&
      view.uncertaintyLower.length !== prepared.outputCount) ||
    (view.uncertaintyUpper !== undefined &&
      view.uncertaintyUpper.length !== prepared.outputCount)
  ) {
    throw new Error('trace preparation batch view violates its bounded structural postconditions');
  }
  const sourceOrdinals = new Set<number>();
  let recomputedMissingSourceCount = 0;
  for (let index = 0; index < prepared.observations.length; index++) {
    const observation = prepared.observations[index];
    if (
      !Number.isSafeInteger(observation.replicateCount) ||
      observation.replicateCount < 1 ||
      observation.replicateCount > MAX_TRACE_PREPARATION_VIEW_ROWS ||
      observation.replicateCount !== prepared.replicateCounts[index] ||
      observation.sourceOrdinals.length !== observation.replicateCount ||
      observation.sourceValues.length !== observation.replicateCount ||
      observation.time !== prepared.times[index] ||
      observation.value !== prepared.values[index]
    ) {
      throw new Error('trace preparation batch view contains an inconsistent prepared observation');
    }
    for (const ordinal of observation.sourceOrdinals) {
      if (
        !Number.isSafeInteger(ordinal) ||
        ordinal < 0 ||
        ordinal >= prepared.inputCount ||
        sourceOrdinals.has(ordinal)
      ) {
        throw new Error('trace preparation batch view contains an invalid or repeated source ordinal');
      }
      sourceOrdinals.add(ordinal);
    }
    recomputedMissingSourceCount += observation.sourceValues.filter(
      (value) => value === null,
    ).length;
  }
  const retainedSourceCount = prepared.observations.reduce(
    (sum, observation) => sum + observation.replicateCount,
    0,
  );
  if (
    !Number.isSafeInteger(retainedSourceCount) ||
    retainedSourceCount !== sourceOrdinals.size ||
    prepared.inputCount !==
      retainedSourceCount + prepared.excludedBelow + prepared.excludedAbove ||
    prepared.outputCount !== prepared.observations.length ||
    retainedSourceCount > MAX_TRACE_PREPARATION_VIEW_ROWS ||
    prepared.missingCount !== recomputedMissingSourceCount ||
    prepared.missingCount > retainedSourceCount
  ) {
    throw new Error('trace preparation batch view violates exact count conservation or the 250000-row bound');
  }
  const retainedOrdinalGroups = prepared.observations.map((observation) =>
    [...observation.sourceOrdinals]);
  const outputPayload = {
    sourceIndex,
    seriesIdentity,
    kind: view.kind,
    window: view.window,
    prepared,
    uncertaintyLower: view.uncertaintyLower ?? null,
    uncertaintyUpper: view.uncertaintyUpper ?? null,
  };
  return {
    kind: view.kind,
    window: view.window,
    inputSourceCount: prepared.inputCount,
    retainedSourceCount,
    outputRowCount: prepared.outputCount,
    excludedBelowWindow: prepared.excludedBelow,
    excludedAboveWindow: prepared.excludedAbove,
    missingRetainedSourceCount: prepared.missingCount,
    duplicateGroupCount: prepared.duplicateGroups,
    reordered: prepared.reordered,
    sourceOrderBoundByInputDigest: true,
    retainedSourceOrdinalDigest: traceBatchDigest(
      digestDomain,
      'retained-source-ordinals',
      {
        sourceIndex,
        seriesIdentity,
        kind: view.kind,
        retainedOrdinalGroups,
      },
    ),
    outputDigest: traceBatchDigest(digestDomain, 'view-output', outputPayload),
  };
}

function tracePreparationContextWitnessReceipts(
  digestDomain: string,
  sourceIndex: number,
  seriesIdentity: Readonly<Record<string, unknown>>,
  displayView: TracePreparationBatchViewInput,
  statePrepared: PreparedTraceSeries | undefined,
  witnesses: readonly unknown[],
): readonly Record<string, unknown>[] {
  if (witnesses.length === 0) return [];
  if (!statePrepared || witnesses.length > 2) {
    throw new Error('trace preparation context witnesses require one bounded state view');
  }
  const seenRoles = new Set<string>();
  const displaySourceOrdinals = new Set(
    displayView.prepared.observations.flatMap((observation) =>
      observation.sourceOrdinals),
  );
  return witnesses.map((candidate) => {
    const witness = rec(candidate) ?? {};
    const role = String(witness.role);
    const observation = rec(witness.observation);
    if (
      (role !== 'carry_in' && role !== 'look_ahead') ||
      seenRoles.has(role) ||
      !observation
    ) {
      throw new Error('trace preparation context witnesses must have unique carry-in/look-ahead roles');
    }
    seenRoles.add(role);
    const witnessSourceOrdinals = numbers(observation.sourceOrdinals);
    const witnessTime = num(observation.time);
    const observationKey = canonicalize(observation);
    const stateObservationIndex = statePrepared.observations.findIndex(
      (stateObservation) => canonicalize(stateObservation) === observationKey,
    );
    if (
      stateObservationIndex < 0 ||
      stateObservationIndex >= MAX_TRACE_PREPARATION_VIEW_ROWS ||
      witnessTime === undefined ||
      witnessSourceOrdinals.some((ordinal) =>
        displaySourceOrdinals.has(ordinal)) ||
      (role === 'carry_in' &&
        !(witnessTime < displayView.window.start)) ||
      (role === 'look_ahead' &&
        !(
          witnessTime > displayView.window.stop ||
          (
            witnessTime === displayView.window.stop &&
            !displayView.window.finalEdgeInclusive
          )
        ))
    ) {
      throw new Error(
        'trace preparation context witness is not a role-correct out-of-display observation in the bounded state view',
      );
    }
    return {
      role,
      stateObservationIndex,
      consultedByDerivedAggregate:
        witness.consultedByDerivedAggregate === true,
      observationDigest: traceBatchDigest(
        digestDomain,
        'context-witness',
        {
          sourceIndex,
          seriesIdentity,
          role,
          stateObservationIndex,
          observation,
        },
      ),
    };
  });
}

function tracePreparationBatchOperation(
  family: TracePreparationBatchFamily,
  globalContextPayload: unknown,
  entryInputs: readonly TracePreparationBatchEntryInput[],
): DerivationOperation {
  const digestDomain = family === 'weight'
    ? WEIGHT_TRACE_PREPARATION_BATCH_DOMAIN
    : COMPARTMENT_TRACE_PREPARATION_BATCH_DOMAIN;
  const maximumSeries = family === 'weight' ? 1024 : 8192;
  if (entryInputs.length < 1 || entryInputs.length > maximumSeries) {
    throw new Error(
      `${family} trace preparation batch requires 1..${maximumSeries} canonical source entries`,
    );
  }
  const roles = new Set(entryInputs.map((entry) => entry.role));
  if (
    (family === 'compartment' && (
      roles.size !== 1 ||
      !roles.has('source_series')
    )) ||
    (family === 'weight' && roles.has('declared_aggregate') && (
      entryInputs.length !== 1 ||
      roles.size !== 1
    ))
  ) {
    throw new Error('trace preparation batch mixes an impossible family/role combination');
  }
  const identityKeys = new Set<string>();
  for (let index = 0; index < entryInputs.length; index++) {
    const entry = entryInputs[index];
    if (entry.sourceIndex !== index) {
      throw new Error('trace preparation batch sourceIndex must be contiguous canonical request order');
    }
    const identityKey = canonicalize(entry.seriesIdentity);
    if (identityKeys.has(identityKey)) {
      throw new Error('trace preparation batch contains a duplicate structured series identity');
    }
    identityKeys.add(identityKey);
    const viewKinds = entry.views.map((view) => view.kind).join(',');
    const expectedViewKinds = family === 'weight' && entry.role === 'source_series'
      ? 'display,state'
      : 'display';
    if (viewKinds !== expectedViewKinds) {
      throw new Error(
        `trace preparation batch ${family}/${entry.role} requires exact view order ${expectedViewKinds}`,
      );
    }
  }
  const globalContextDigest = traceBatchDigest(
    digestDomain,
    'global-context',
    globalContextPayload,
  );
  const seriesReceipts = entryInputs.map((entry) => {
    const inputDigest = traceBatchDigest(digestDomain, 'series-input', {
      globalContextDigest,
      sourceIndex: entry.sourceIndex,
      seriesIdentity: entry.seriesIdentity,
      role: entry.role,
      inputPayload: entry.inputPayload,
    });
    const views = entry.views.map((view) =>
      tracePreparationBatchViewReceipt(
        digestDomain,
        entry.sourceIndex,
        entry.seriesIdentity,
        view,
      ));
    const displayView = entry.views.find((view) => view.kind === 'display')!;
    const statePrepared = entry.views.find((view) => view.kind === 'state')?.prepared;
    const contextWitnesses = tracePreparationContextWitnessReceipts(
      digestDomain,
      entry.sourceIndex,
      entry.seriesIdentity,
      displayView,
      statePrepared,
      entry.contextWitnesses ?? [],
    );
    const materialization = entry.materialization
      ? {
        kind: 'event_updated',
        fullOutputDigest: traceBatchDigest(
          digestDomain,
          'materialization-full',
          {
            sourceIndex: entry.sourceIndex,
            seriesIdentity: entry.seriesIdentity,
            materialization: entry.materialization.full,
          },
        ),
        displayedOutputDigest: traceBatchDigest(
          digestDomain,
          'materialization-displayed',
          {
            sourceIndex: entry.sourceIndex,
            seriesIdentity: entry.seriesIdentity,
            materialization: entry.materialization.displayed,
          },
        ),
      }
      : null;
    return {
      sourceIndex: entry.sourceIndex,
      seriesIdentity: entry.seriesIdentity,
      role: entry.role,
      inputDigest,
      views,
      transforms: entry.transforms,
      contextWitnesses,
      materialization,
      initialStatePainted: entry.initialStatePainted,
      initialStateConsumedByDerivedAggregate:
        entry.initialStateConsumedByDerivedAggregate,
    };
  });
  const receipt = {
    globalContextDigest,
    seriesCount: seriesReceipts.length,
    seriesReceipts,
  };
  const inputDigest = traceBatchDigest(digestDomain, 'operation-input', {
    globalContextDigest,
    seriesInputDigests: seriesReceipts.map((entry) => entry.inputDigest),
  });
  const outputDigest = traceBatchDigest(
    digestDomain,
    'operation-output',
    receipt,
  );
  return {
    id: family === 'weight'
      ? 'weight.trace.prepare_series_batch'
      : 'compartment.trace.prepare_series_batch',
    algorithm: family === 'weight'
      ? 'cortexel.weight_trace.prepare_series_batch'
      : 'cortexel.compartment_trace.prepare_series_batch',
    algorithmRevision: 1,
    parameters: {
      seriesOrder: 'canonical_request_order',
      digestCanonicalization: 'rfc8785',
      digestDomain,
    },
    inputDigest,
    outputDigest,
    receipt,
  };
}

function chainAggregateToPreparationBatch(
  operation: DerivationOperation,
  preparationBatch: DerivationOperation,
): DerivationOperation {
  const preparationBatchOutputDigest = preparationBatch.outputDigest;
  if (
    (
      operation.algorithm !== 'cortexel.weight_trace.aggregate_members' &&
      operation.algorithm !== 'cortexel.compartment_trace.aggregate_explicit_selection'
    ) ||
    operation.inputDigest === undefined ||
    operation.outputDigest === undefined ||
    preparationBatchOutputDigest === undefined
  ) {
    throw new Error('only a fully digested registered trace aggregate can be chained to a preparation batch');
  }
  const algorithmRevision = 4;
  const digestDomain = `${operation.algorithm}/v${String(algorithmRevision)}`;
  const outputReceipt = rec(operation.receipt.output);
  const outputUnits = operation.algorithm === 'cortexel.weight_trace.aggregate_members'
    ? {
      timeUnit: String(rec(operation.parameters.analysisWindow)?.unit),
      valueUnit: String(operation.parameters.targetValueUnit),
    }
    : {
      timeUnit: String(rec(outputReceipt?.time)?.unit),
      valueUnit: String(rec(outputReceipt?.value)?.unit),
    };
  const scientificInputDigest = operation.inputDigest;
  const scientificOutputDigest = operation.outputDigest;
  const stateWitnessDigest = operation.algorithm ===
    'cortexel.weight_trace.aggregate_members'
    ? canonicalDigest({
      digestDomain:
        'cortexel.weight_trace.aggregate_members/v4/state-witnesses',
      payload: (arr(rec(preparationBatch.receipt)?.seriesReceipts) ?? [])
        .flatMap((candidate) => {
          const entry = rec(candidate) ?? {};
          return (arr(entry.contextWitnesses) ?? [])
            .map((witness) => rec(witness) ?? {})
            .filter((witness) =>
              witness.consultedByDerivedAggregate === true)
            .map((witness) => ({
              seriesIdentity: entry.seriesIdentity,
              role: witness.role,
              stateObservationIndex: witness.stateObservationIndex,
              observationDigest: witness.observationDigest,
            }));
        }),
    })
    : undefined;
  return {
    ...operation,
    algorithmRevision,
    parameters: {
      ...operation.parameters,
      digestCanonicalization: 'rfc8785',
      digestDomain,
      preparationBatchOutputDigest,
    },
    inputDigest: canonicalDigest({
      digestDomain: `${digestDomain}/operation-input`,
      payload: {
        preparationBatchOutputDigest,
        scientificInputDigest,
      },
    }),
    outputDigest: canonicalDigest({
      digestDomain: `${digestDomain}/operation-output`,
      payload: {
        scientificOutputDigest,
        outputUnits,
      },
    }),
    receipt: {
      ...operation.receipt,
      ...(stateWitnessDigest === undefined ? {} : { stateWitnessDigest }),
      scientificInputDigest,
      scientificOutputDigest,
      outputUnits,
      preparationBatchOutputDigest,
    },
  };
}

function derivationOperationIdsAreUnique(
  operationIds: readonly string[],
): boolean {
  return operationIds.length <= 64 &&
    operationIds.every((id) => id.trim().length > 0) &&
    new Set(operationIds).size === operationIds.length;
}

function uncertaintyConversionForPreparedTrace(
  rawUncertainty: Record<string, unknown> | undefined,
  prepared: PreparedTraceSeries,
): ConversionReceipt | null {
  return rawUncertainty?.kind !== undefined && rawUncertainty.kind !== 'none'
    ? nonIdentityConversion(
      typeof rawUncertainty.unit === 'string' ? rawUncertainty.unit : undefined,
      prepared.valueUnit,
    )
    : null;
}

function weightPreparationBatchTransforms(
  member: PreparedWeightMember,
  referenceRendered: boolean,
): Record<string, unknown> {
  const interval = rec(member.raw.recordedInterval);
  const initialQuantity = rec(rec(member.raw.initialWeight)?.quantity);
  const bounds = rec(member.raw.bounds);
  const lowerBound = rec(bounds?.lower);
  const upperBound = rec(bounds?.upper);
  return {
    time: member.prepared.timeConversion ?? null,
    value: member.prepared.valueConversion ?? null,
    recordedInterval: nonIdentityConversion(
      typeof interval?.unit === 'string' ? interval.unit : undefined,
      member.prepared.timeUnit,
    ),
    initialValue: nonIdentityConversion(
      typeof initialQuantity?.unit === 'string' ? initialQuantity.unit : undefined,
      member.prepared.valueUnit,
    ),
    uncertainty: null,
    normalization: null,
    renderedLowerBound: referenceRendered
      ? nonIdentityConversion(
        typeof lowerBound?.unit === 'string' ? lowerBound.unit : undefined,
        member.prepared.valueUnit,
      )
      : null,
    renderedUpperBound: referenceRendered
      ? nonIdentityConversion(
        typeof upperBound?.unit === 'string' ? upperBound.unit : undefined,
        member.prepared.valueUnit,
      )
      : null,
  };
}

function declaredWeightPreparationBatchTransforms(
  member: PreparedWeightMember,
): Record<string, unknown> {
  return {
    time: member.prepared.timeConversion ?? null,
    value: null,
    recordedInterval: null,
    initialValue: null,
    uncertainty: uncertaintyConversionForPreparedTrace(
      rec(member.raw.uncertainty),
      member.prepared,
    ),
    normalization: null,
    renderedLowerBound: null,
    renderedUpperBound: null,
  };
}

function compartmentPreparationBatchTransforms(
  entry: PreparedCompartmentEntry,
  uncertainty: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return {
    time: entry.prepared.timeConversion ?? null,
    value: entry.prepared.valueConversion ?? null,
    recordedInterval: null,
    initialValue: null,
    uncertainty: uncertaintyConversionForPreparedTrace(
      uncertainty,
      entry.prepared,
    ),
    normalization: null,
    renderedLowerBound: null,
    renderedUpperBound: null,
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

interface PreparedCompartmentEntry {
  readonly raw: Record<string, unknown>;
  readonly prepared: PreparedTraceSeries;
  readonly compartmentIndex: number;
  readonly seriesIndex: number;
  readonly uncertaintyLower?: readonly (number | null)[];
  readonly uncertaintyUpper?: readonly (number | null)[];
  readonly uncertainty?: TracePanelSpec['series'][number]['uncertainty'];
}

function compartmentTraceTableRows(
  data: Record<string, unknown>,
  preparedEntries: readonly PreparedCompartmentEntry[],
): TableCell[][] {
  const cellId = String(data.cellId);
  const compartmentIds = strings(data.compartmentIds);
  const labels = strings(data.compartmentLabels);
  const parents = arr(data.compartmentParentIds) ?? [];
  const distances = rec(data.compartmentPathDistances);
  const distanceValues = arr(distances?.values) ?? [];
  const distanceUnit = typeof distances?.unit === 'string' ? distances.unit : null;
  const seriesByCompartment = new Map<string, PreparedCompartmentEntry[]>();
  for (const entry of preparedEntries) {
    const compartmentId = String(entry.raw.compartmentId);
    const entries = seriesByCompartment.get(compartmentId);
    if (entries) entries.push(entry);
    else seriesByCompartment.set(compartmentId, [entry]);
  }

  const rows: TableCell[][] = [];
  for (let rowIndex = 0; rowIndex < compartmentIds.length; rowIndex++) {
    const compartmentId = compartmentIds[rowIndex];
    const entries = seriesByCompartment.get(compartmentId) ?? [];
    const common: TableCell[] = [
      cellId,
      rowIndex,
      compartmentId,
      labels[rowIndex] ?? compartmentId,
      typeof parents[rowIndex] === 'string' ? parents[rowIndex] as string : null,
      typeof distanceValues[rowIndex] === 'number' ? distanceValues[rowIndex] as number : null,
      distanceUnit,
    ];
    if (entries.length === 0) {
      rows.push([...common, 'no', null, null, null, null, null, null, null]);
      continue;
    }
    for (const entry of entries) {
      for (const observation of entry.prepared.observations) {
        rows.push([
          ...common,
          'yes',
          String(entry.raw.signalId),
          observation.recordedTime,
          entry.prepared.sourceTimeUnit,
          observation.value,
          entry.prepared.valueUnit,
          booleanCell(observation.value === null),
          traceCell(observation.sourceOrdinals),
        ]);
      }
    }
  }
  return rows;
}

interface DerivedCompartmentAggregate {
  readonly entry: TracePanelSpec['series'][number];
  readonly operation: DerivationOperation;
}

/**
 * Derive the explicitly requested cross-compartment series without resampling.
 * A time contributes only when every selected compartment has exactly one accepted
 * value there. Multiple retained replicates at one time are deliberately not paired
 * across compartments: the contract declares no replicate-alignment fact that would
 * make one such pairing scientific.
 */
function deriveCompartmentAggregate(
  aggregate: Record<string, unknown>,
  entries: readonly PreparedCompartmentEntry[],
  window: TraceWindow,
): DerivedCompartmentAggregate {
  const selectedIds = strings(aggregate.compartmentIds);
  const selected = selectedIds.map((compartmentId) => {
    const candidates = entries.filter((entry) => String(entry.raw.compartmentId) === compartmentId);
    if (candidates.length !== 1) {
      throw new Error(
        `compartment aggregate selection ${compartmentId} resolves to ${candidates.length} series; exactly one signal series per selected compartment is required`,
      );
    }
    return candidates[0];
  });
  if (selected.length === 0) throw new Error('compartment aggregate selection is empty');
  const signalIds = new Set(selected.map((entry) => String(entry.raw.signalId)));
  if (signalIds.size !== 1) {
    throw new Error('compartment aggregate selection spans more than one signal identity');
  }
  const targetUnit = selected[0].prepared.valueUnit;
  for (const entry of selected.slice(1)) {
    if (!axesAreCompatible(targetUnit, entry.prepared.valueUnit)) {
      throw new Error(`compartment aggregate cannot combine ${targetUnit} with ${entry.prepared.valueUnit}`);
    }
  }
  const times = [...new Set(selected.flatMap((entry) => [...entry.prepared.times]))]
    .sort((left, right) => left - right);
  const byMember = selected.map((entry) => {
    const values = new Map<number, (number | null)[]>();
    for (let index = 0; index < entry.prepared.times.length; index++) {
      const time = entry.prepared.times[index];
      const existing = values.get(time);
      if (existing) existing.push(entry.prepared.values[index]);
      else values.set(time, [entry.prepared.values[index]]);
    }
    return values;
  });
  const weighting = String(aggregate.weighting);
  const weights = weighting === 'declared'
    ? numbers(aggregate.weights)
    : selected.map(() => 1);
  const method = String(aggregate.method);
  const values = times.map((time): number | null => {
    const memberValues: number[] = [];
    for (let index = 0; index < selected.length; index++) {
      const candidates = byMember[index].get(time) ?? [];
      if (candidates.length !== 1 || candidates[0] === null) return null;
      const value = selected[index].prepared.valueUnit === targetUnit
        ? candidates[0]
        : convert(candidates[0]!, selected[index].prepared.valueUnit, targetUnit);
      memberValues.push(value!);
    }
    if (method === 'mean') {
      return exactBinary64WeightedMean(memberValues, weights);
    }
    if (method === 'sum') {
      return exactBinary64WeightedSum(memberValues, weights);
    }
    if (method === 'median') return empiricalQuantile(memberValues, 0.5);
    if (method === 'min') return traceCompilerMinimum(memberValues);
    if (method === 'max') return traceCompilerMaximum(memberValues);
    throw new Error(`unsupported compartment aggregate method ${method}`);
  });
  const id = `aggregate-${selectedIds.join('-')}`;
  const label = typeof aggregate.label === 'string'
    ? aggregate.label
    : `${method} over ${selected.length} declared compartments`;
  const prepared = prepareTraceSeries({
    id,
    label,
    observationKind: 'point_sample',
    times,
    timeUnit: window.unit,
    values,
    valueUnit: targetUnit,
  }, { window, duplicatePolicy: 'reject', targetValueUnit: targetUnit });
  // Contract 1.0 has one figure-level uncertainty declaration. It is only
  // unambiguous for one source series (enforced by the caller), in which case
  // a one-member aggregate has an exact affine uncertainty propagation.
  const uncertaintySource = selected.length === 1 ? selected[0] : undefined;
  const uncertaintyScale = method === 'sum' ? weights[0] : 1;
  const propagatedBounds = (
    source: readonly (number | null)[] | undefined,
  ): (number | null)[] | undefined => {
    if (!source || !uncertaintySource) return undefined;
    return times.map((time, timeIndex) => {
      const matching = uncertaintySource.prepared.times
        .map((candidate, index) => candidate === time ? index : -1)
        .filter((index) => index >= 0);
      if (matching.length !== 1 || values[timeIndex] === null) return null;
      const bound = source[matching[0]];
      return bound === null
        ? null
        : exactBinary64WeightedSum([bound], [uncertaintyScale]);
    });
  };
  const propagatedLower = propagatedBounds(uncertaintySource?.uncertaintyLower);
  const propagatedUpper = propagatedBounds(uncertaintySource?.uncertaintyUpper);
  return {
    entry: {
      series: prepared,
      styleIndex: entries.length,
      outputAuthority: traceOutputAuthority(prepared, 'aggregate', 'aggregate', 'uncertainty'),
      ...(propagatedLower ? { uncertaintyLower: propagatedLower } : {}),
      ...(propagatedUpper ? { uncertaintyUpper: propagatedUpper } : {}),
      ...(uncertaintySource?.uncertainty ? { uncertainty: uncertaintySource.uncertainty } : {}),
    },
    operation: {
      id: 'compartment.aggregate.explicit_selection',
      algorithm: 'cortexel.compartment_trace.aggregate_explicit_selection',
      algorithmRevision: 2,
      parameters: {
        selectedCompartmentIds: selectedIds,
        method,
        weighting,
        weights,
        binary64Arithmetic: 'exact_products_and_cancellation_then_one_final_round',
        ...(aggregate.weightBasis !== undefined ? { weightBasis: aggregate.weightBasis } : {}),
        alignment: 'exact_accepted_time_only',
        duplicateReplicateAlignment: 'undefined_yields_missing',
      },
      inputDigest: canonicalDigest(selected.map((entry) => entry.raw)),
      outputDigest: canonicalDigest({ times, values, unit: targetUnit }),
      receipt: {
        selectedCompartmentCount: selected.length,
        evaluationCount: times.length,
        missingBecauseAbsentOrAmbiguousCount: values.filter((value) => value === null).length,
        noInterpolation: true,
        noSurvivorOnlyDenominator: true,
        output: {
          time: { unit: window.unit, values: times },
          value: { unit: targetUnit, values },
        },
      },
    },
  };
}

function countForPreparedObservation(
  sourceCounts: readonly number[],
  sourceOrdinals: readonly number[],
): number | null {
  const counts = sourceOrdinals.map((ordinal) => sourceCounts[ordinal]);
  if (counts.length === 0 || counts.some((count) => typeof count !== 'number')) return null;
  if (counts.some((count) => count !== counts[0])) {
    throw new Error('duplicate aggregate observations disagree on their declared member count');
  }
  return counts[0];
}

type WeightCarrierKind =
  | 'source_observation'
  | 'source_state_witness'
  | 'caller_reconstruction_point'
  | 'derived_aggregate_evaluation'
  | 'declared_aggregate_point'
  | 'declared_initial_state';

interface WeightCarrierCount {
  total: number;
  missing: number;
}

type WeightCarrierCounts = Record<WeightCarrierKind, WeightCarrierCount>;

interface WeightTableSeries {
  readonly member: PreparedWeightMember;
  readonly observation: Record<string, unknown>;
  readonly carrierKind: Exclude<WeightCarrierKind, 'declared_initial_state'>;
  readonly counts?: {
    readonly memberCounts: readonly number[];
    readonly contributingCounts: readonly number[];
  };
  readonly stateWitnesses?: readonly WeightStateWitness[];
  readonly initialStatePainted?: boolean;
  readonly initialStateConsumedByDerivedAggregate?: boolean;
  readonly membershipLifetimes?: readonly WeightInterval[];
}

interface WeightTableMaterialization {
  readonly rows: readonly TableCell[][];
  readonly carrierCounts: Readonly<WeightCarrierCounts>;
  readonly sourceReadingCount: number;
  readonly missingSourceReadingCount: number;
}

function emptyWeightCarrierCounts(): WeightCarrierCounts {
  return {
    source_observation: { total: 0, missing: 0 },
    source_state_witness: { total: 0, missing: 0 },
    caller_reconstruction_point: { total: 0, missing: 0 },
    derived_aggregate_evaluation: { total: 0, missing: 0 },
    declared_aggregate_point: { total: 0, missing: 0 },
    declared_initial_state: { total: 0, missing: 0 },
  };
}

function weightCarrierStatement(
  counts: Readonly<WeightCarrierCounts>,
  sourceReadingCount: number,
  missingSourceReadingCount: number,
  excludedSourceReadingCount: number,
  reconstructionPointCount: number,
  retainedReconstructionRowCount: number,
  missingReconstructionPointCount: number,
  excludedReconstructionPointCount: number,
): string {
  const clause = (kind: WeightCarrierKind, label: string): string =>
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

function weightModelsInData(data: Record<string, unknown>): string[] {
  const records = data.mode === 'preaggregated'
    ? [rec(data.aggregate) ?? {}]
    : (arr(data.series) ?? []).map((candidate) => rec(candidate) ?? {});
  return [...new Set(records.flatMap((series) => {
    const aggregateModels = (arr(series.synapseModels) ?? [])
      .filter((model): model is string => typeof model === 'string');
    return aggregateModels.length > 0
      ? aggregateModels
      : typeof series.synapseModel === 'string' ? [series.synapseModel] : [];
  }))];
}

/**
 * Every returned carrier repeats the complete caller comparability claim. A scalar
 * model name on a raw row is insufficient audit context once the row is detached
 * from the request; the structured cell binds the row's actual model(s), the exact
 * declared model set, and the declaration mode in one canonical value.
 */
function weightSynapseModelCell(
  series: Record<string, unknown>,
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
): TableCell {
  const aggregateModels = (arr(series.synapseModels) ?? [])
    .filter((model): model is string => typeof model === 'string');
  const actualModels = aggregateModels.length > 0
    ? aggregateModels
    : typeof series.synapseModel === 'string' ? [series.synapseModel] : [];
  const comparability = rec(parameters.weightComparability) ?? {};
  const mode = String(comparability.mode);
  const declaredModels = mode === 'declared_comparable_models'
    ? (arr(comparability.comparableModels) ?? [])
      .filter((model): model is string => typeof model === 'string')
    : weightModelsInData(data);
  return structuredCell({
    kind: 'weight_model_comparability',
    actualModels,
    declaredModels,
    comparabilityMode: mode,
  });
}

type WeightTableCarrier =
  | {
    readonly tag: 'source_state_witness';
    readonly entry: WeightTableSeries;
    readonly witness: WeightStateWitness;
    readonly carrierOrdinal: number;
  }
  | {
    readonly tag: 'declared_initial_state';
    readonly entry: WeightTableSeries;
    readonly hold: DeclaredInitialHold;
  }
  | {
    readonly tag: 'prepared_observation';
    readonly entry: WeightTableSeries;
    readonly observationIndex: number;
  };

interface ExactWeightTableCarrierPreflight {
  readonly tag: 'exact_within_budget';
  readonly exactRowCount: number;
  readonly carriers: readonly WeightTableCarrier[];
}

interface SaturatedWeightTableCarrierPreflight {
  readonly tag: 'saturated_over_budget';
  /** A lower-bound sentinel only. It is deliberately never described as exact. */
  readonly saturatedRowCount: number;
}

type WeightTableCarrierPreflight =
  | ExactWeightTableCarrierPreflight
  | SaturatedWeightTableCarrierPreflight;

type WeightRowCountPreflight =
  | { readonly tag: 'exact_within_budget'; readonly exactRowCount: number }
  | SaturatedWeightTableCarrierPreflight;

/** Natural-number fold corresponding to formal/WeightRowSaturation.lean. */
function saturatingWeightRowSum(
  increments: readonly number[],
  limit: number,
): WeightRowCountPreflight {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit >= Number.MAX_SAFE_INTEGER) {
    throw new Error('weight returned-table limit must be a non-negative safe integer below MAX_SAFE_INTEGER');
  }
  let count = 0;
  for (const increment of increments) {
    if (!Number.isSafeInteger(increment) || increment < 0) {
      throw new Error('weight carrier increment must be a non-negative safe integer');
    }
    if (increment > limit - count) {
      return { tag: 'saturated_over_budget', saturatedRowCount: limit + 1 };
    }
    count += increment;
  }
  return { tag: 'exact_within_budget', exactRowCount: count };
}

/** Conclusive lower-bound pass used to avoid aggregate work when source rows alone exceed L. */
function preflightPreparedWeightObservationRows(
  members: readonly PreparedWeightMember[],
  limit: number,
): WeightRowCountPreflight {
  return saturatingWeightRowSum(
    members.map((member) => member.prepared.observations.length),
    limit,
  );
}

/**
 * Enumerate the canonical returned-row carriers once, stopping at L+1. Successful
 * compilation consumes this exact plan; the scientific timestamp/state logic is
 * therefore not re-run by the table materializer.
 */
function preflightWeightTableCarriers(
  seriesEntries: readonly WeightTableSeries[],
  limit: number,
): WeightTableCarrierPreflight {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit >= Number.MAX_SAFE_INTEGER) {
    throw new Error('weight returned-table limit must be a non-negative safe integer below MAX_SAFE_INTEGER');
  }
  const carriers: WeightTableCarrier[] = [];
  const saturationSentinel = limit + 1;
  const append = (carrier: WeightTableCarrier): boolean => {
    if (carriers.length === limit) return false;
    carriers.push(carrier);
    return true;
  };
  for (const entry of seriesEntries) {
    const witnesses = [...(entry.stateWitnesses ?? [])];
    for (let index = 0; index < witnesses.length; index++) {
      if (
        witnesses[index].role === 'carry_in' &&
        !append({
          tag: 'source_state_witness',
          entry,
          witness: witnesses[index],
          carrierOrdinal: index,
        })
      ) return { tag: 'saturated_over_budget', saturatedRowCount: saturationSentinel };
    }
    const initialInfluential = entry.initialStatePainted === true ||
      entry.initialStateConsumedByDerivedAggregate === true;
    const initialHold = initialInfluential
      ? declaredInitialHold(entry.member, entry.observation, entry.membershipLifetimes)
      : undefined;
    if (
      initialHold &&
      !append({ tag: 'declared_initial_state', entry, hold: initialHold })
    ) return { tag: 'saturated_over_budget', saturatedRowCount: saturationSentinel };
    for (let observationIndex = 0;
      observationIndex < entry.member.prepared.observations.length;
      observationIndex++) {
      if (!append({ tag: 'prepared_observation', entry, observationIndex })) {
        return { tag: 'saturated_over_budget', saturatedRowCount: saturationSentinel };
      }
    }
    for (let index = 0; index < witnesses.length; index++) {
      if (
        witnesses[index].role === 'look_ahead' &&
        !append({
          tag: 'source_state_witness',
          entry,
          witness: witnesses[index],
          carrierOrdinal: index,
        })
      ) return { tag: 'saturated_over_budget', saturatedRowCount: saturationSentinel };
    }
  }
  return { tag: 'exact_within_budget', exactRowCount: carriers.length, carriers };
}

function synapticWeightTraceTableRows(
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
  preflight: ExactWeightTableCarrierPreflight,
  renderedRunsByEntry: ReadonlyMap<WeightTableSeries, readonly TraceRenderRun[]> = new Map(),
): WeightTableMaterialization {
  const scopeSummary = compilerNetworkScopeSummaryCell(data.scope);
  const rows: TableCell[][] = [];
  const carrierCounts = emptyWeightCarrierCounts();
  let sourceReadingCount = 0;
  let missingSourceReadingCount = 0;

  const account = (kind: WeightCarrierKind, value: number | null): void => {
    carrierCounts[kind].total++;
    if (value === null) carrierCounts[kind].missing++;
  };

  for (const carrier of preflight.carriers) {
    const { entry } = carrier;
    const { member, observation, carrierKind, counts } = entry;
    const series = member.raw;
    const prepared = member.prepared;
    const endpoints = rec(series.endpoints);
    const uncertainty = rec(series.uncertainty);
    const eventKinds = arr(series.eventKinds) ?? [];
    const modelCell = weightSynapseModelCell(series, data, parameters);
    if (carrier.tag === 'source_state_witness') {
      const stateObservation = carrier.witness.observation;
      const witnessOrdinal = stateObservation.sourceOrdinals.length === 1
        ? stateObservation.sourceOrdinals[0]
        : undefined;
      const [lower, upper, uncertaintyMethod] = traceUncertaintyCells(
        uncertainty,
        witnessOrdinal,
        member.statePrepared,
        stateObservation.value,
      );
      const witnessEvents = stateObservation.sourceOrdinals.flatMap((ordinal: number) =>
        typeof eventKinds[ordinal] === 'string' ? [eventKinds[ordinal] as string] : []);
      const topology = weightCarrierRenderTopology(
        renderedRunsByEntry.get(entry),
        stateObservation.sourceOrdinals,
        member.statePrepared.timeUnit,
      );
      account('source_state_witness', stateObservation.value);
      rows.push([
        String(series.edgeId ?? series.groupId),
        String(series.label ?? series.groupLabel ?? series.edgeId ?? series.groupId),
        typeof endpoints?.sourceId === 'string' ? endpoints.sourceId : null,
        typeof endpoints?.targetId === 'string' ? endpoints.targetId : null,
        modelCell,
        stateObservation.time,
        member.statePrepared.timeUnit,
        stateObservation.value,
        member.statePrepared.valueUnit,
        String(observation.kind),
        typeof observation.updateSemantics === 'string' ? observation.updateSemantics : null,
        topology.paintedInterval,
        topology.renderRunOrdinal,
        witnessEvents.length === 0 ? null : traceCell(witnessEvents),
        booleanCell(stateObservation.value === null),
        null,
        null,
        null,
        lower,
        upper,
        uncertaintyMethod,
        structuredCell(series.initialWeight),
        structuredCell(series.bounds),
        'source_state_witness',
        carrier.carrierOrdinal,
        structuredCell({
          role: carrier.witness.role,
          directlyPainted: topology.renderRunOrdinal !== null,
          consultedByDerivedAggregate:
            carrier.witness.consultedByDerivedAggregate === true,
          ...weightDuplicateResolutionMetadata(stateObservation, parameters),
        }),
        traceCell(stateObservation.sourceOrdinals),
        scopeSummary,
      ]);
      continue;
    }
    if (carrier.tag === 'declared_initial_state') {
      const initialHold = carrier.hold;
      const topology = weightCarrierRenderTopology(
        renderedRunsByEntry.get(entry),
        [],
        prepared.timeUnit,
        true,
      );
      account('declared_initial_state', initialHold.value);
      rows.push([
        String(series.edgeId ?? series.groupId),
        String(series.label ?? series.groupLabel ?? series.edgeId ?? series.groupId),
        typeof endpoints?.sourceId === 'string' ? endpoints.sourceId : null,
        typeof endpoints?.targetId === 'string' ? endpoints.targetId : null,
        modelCell,
        initialHold.start,
        prepared.timeUnit,
        initialHold.value,
        prepared.valueUnit,
        String(observation.kind),
        String(observation.updateSemantics),
        topology.paintedInterval,
        topology.renderRunOrdinal,
        null,
        booleanCell(false),
        null,
        null,
        null,
        null,
        null,
        null,
        structuredCell(series.initialWeight),
        structuredCell(series.bounds),
        'declared_initial_state',
        0,
        structuredCell({
          directlyPainted: topology.renderRunOrdinal !== null,
          consumedByDerivedAggregate: entry.initialStateConsumedByDerivedAggregate === true,
          declaredAt: member.initialStateTime,
          declaredAtUnit: prepared.timeUnit,
        }),
        null,
        scopeSummary,
      ]);
      continue;
    }
    {
      const rowIndex = carrier.observationIndex;
      const preparedObservation = prepared.observations[rowIndex];
      const sourceOrdinals = preparedObservation.sourceOrdinals;
      const value = preparedObservation.value;
      const [uncertaintyLower, uncertaintyUpper, uncertaintyMethod] = traceUncertaintyCells(
        uncertainty,
        sourceOrdinals.length === 1 ? sourceOrdinals[0] : undefined,
        prepared,
        value,
      );
      const observationKind = String(observation.kind);
      const updateSemantics = typeof observation.updateSemantics === 'string'
        ? observation.updateSemantics
        : null;
      const topology = weightCarrierRenderTopology(
        renderedRunsByEntry.get(entry),
        sourceOrdinals,
        prepared.timeUnit,
      );
      const isSourceObservation = carrierKind === 'source_observation';
      const hasSourceLineage = isSourceObservation ||
        observation.kind === 'interpolated_trajectory';
      const rowEventKinds = isSourceObservation
        ? sourceOrdinals.flatMap((ordinal) =>
          typeof eventKinds[ordinal] === 'string' ? [eventKinds[ordinal] as string] : [])
        : [];
      account(carrierKind, value);
      if (isSourceObservation) {
        sourceReadingCount += preparedObservation.replicateCount;
        missingSourceReadingCount += preparedObservation.sourceValues.filter(
          (sourceValue) => sourceValue === null,
        ).length;
      }
      rows.push([
        String(series.edgeId ?? series.groupId),
        String(series.label ?? series.groupLabel ?? series.edgeId ?? series.groupId),
        typeof endpoints?.sourceId === 'string' ? endpoints.sourceId : null,
        typeof endpoints?.targetId === 'string' ? endpoints.targetId : null,
        modelCell,
        preparedObservation.time,
        prepared.timeUnit,
        value,
        prepared.valueUnit,
        observationKind,
        updateSemantics,
        topology.paintedInterval,
        topology.renderRunOrdinal,
        rowEventKinds.length === 0 ? null : traceCell(rowEventKinds),
        booleanCell(value === null),
        hasSourceLineage ? preparedObservation.replicateCount : null,
        counts
          ? countForPreparedObservation(counts.memberCounts, sourceOrdinals)
          : null,
        counts
          ? countForPreparedObservation(counts.contributingCounts, sourceOrdinals)
          : null,
        uncertaintyLower,
        uncertaintyUpper,
        uncertaintyMethod,
        structuredCell(series.initialWeight),
        structuredCell(series.bounds),
        carrierKind,
        rowIndex,
        weightPreparedCarrierMetadata(
          observation,
          preparedObservation,
          parameters,
        ),
        hasSourceLineage ? traceCell(sourceOrdinals) : null,
        scopeSummary,
      ]);
    }
  }
  return { rows, carrierCounts, sourceReadingCount, missingSourceReadingCount };
}

type TraceRenderRun = NonNullable<TracePanelSpec['series'][number]['renderRuns']>[number];

interface WeightCarrierRenderTopology {
  readonly paintedInterval: TableCell;
  readonly renderRunOrdinal: number | null;
}

function sameWeightSourceOrdinals(
  left: readonly unknown[],
  right: readonly number[],
): boolean {
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

/**
 * Derive table topology from the exact explicit runs handed to the compiler. The
 * accessibility path therefore never predicts geometry independently from timestamps.
 */
function weightCarrierRenderTopology(
  runs: readonly TraceRenderRun[] | undefined,
  sourceOrdinals: readonly number[],
  timeUnit: string,
  declaredInitialState = false,
): WeightCarrierRenderTopology {
  let matchedRunOrdinal: number | null = null;
  let paintedFrom: number | undefined;
  let paintedUntil: number | undefined;
  for (let runOrdinal = 0; runOrdinal < (runs?.length ?? 0); runOrdinal++) {
    const run = runs![runOrdinal];
    let matchedRun = false;
    for (let vertexIndex = 0; vertexIndex < run.times.length; vertexIndex++) {
      const role = run.authority?.[vertexIndex];
      if (role?.tag !== 'data_carrier') continue;
      const provenance = rec(role.provenance) ?? {};
      const matches = declaredInitialState
        ? provenance.segmentSource === 'declared_initial_weight'
        : sameWeightSourceOrdinals(
          arr(provenance.sourceOrdinals) ?? [],
          sourceOrdinals,
        );
      if (!matches) continue;
      matchedRun = true;
      if (provenance.atomKind === 'hold_segment') {
        if (provenance.endpoint === 'start') paintedFrom = run.times[vertexIndex];
        if (provenance.endpoint === 'stop') paintedUntil = run.times[vertexIndex];
      }
    }
    if (!matchedRun) continue;
    if (matchedRunOrdinal !== null && matchedRunOrdinal !== runOrdinal) {
      throw new Error('one weight carrier is assigned to more than one explicit render run');
    }
    matchedRunOrdinal = runOrdinal;
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

function weightDuplicateResolutionMetadata(
  observation: PreparedTraceObservation,
  parameters: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
  if (observation.replicateCount <= 1) return {};
  const duplicate = traceDuplicateOptions(parameters);
  if (
    duplicate.duplicatePolicy !== 'aggregate' ||
    typeof duplicate.aggregateMethod !== 'string'
  ) {
    throw new Error('a collapsed weight carrier lacks its named duplicate-resolution method');
  }
  return {
    duplicateResolution: {
      policy: 'aggregate',
      method: duplicate.aggregateMethod,
    },
  };
}

function weightPreparedCarrierMetadata(
  observation: Record<string, unknown>,
  preparedObservation: PreparedTraceObservation,
  parameters: Record<string, unknown>,
): TableCell {
  const metadata: Record<string, unknown> = {
    ...(observation.kind === 'interpolated_trajectory'
      ? {
        reconstruction: {
          method: observation.method,
          interpolant: observation.interpolant,
          reconstructedBy: observation.reconstructedBy,
        },
      }
      : {}),
    ...weightDuplicateResolutionMetadata(preparedObservation, parameters),
  };
  return Object.keys(metadata).length === 0 ? null : structuredCell(metadata);
}

function weightSourceOrdinalKey(sourceOrdinals: readonly unknown[]): string {
  return canonicalize(sourceOrdinals);
}

function bindWeightRenderRunOrdinals(
  runs: readonly TraceRenderRun[],
): readonly TraceRenderRun[] {
  return runs.map((run, renderRunOrdinal) => ({
    times: [...run.times],
    values: [...run.values],
    ...(run.uncertaintyLower
      ? { uncertaintyLower: [...run.uncertaintyLower] }
      : {}),
    ...(run.uncertaintyUpper
      ? { uncertaintyUpper: [...run.uncertaintyUpper] }
      : {}),
    ...(run.authority
      ? {
        authority: run.authority.map((role) =>
          role.tag === 'data_carrier'
            ? {
              ...role,
              provenance: {
                ...(rec(role.provenance) ?? {}),
                renderRunOrdinal,
              },
            }
            : { ...role }),
      }
      : {}),
  }));
}

function weightTraceOutputAuthority(
  series: PreparedTraceSeries,
  runs: readonly TraceRenderRun[],
  pathClassId: string,
  sampleClassId: string,
  uncertaintyClassId: string,
): NonNullable<TracePanelSpec['series'][number]['outputAuthority']> {
  const base = traceOutputAuthority(
    series,
    pathClassId,
    sampleClassId,
    uncertaintyClassId,
  );
  const runOrdinalByLineage = new Map<string, number>();
  for (let renderRunOrdinal = 0; renderRunOrdinal < runs.length; renderRunOrdinal++) {
    for (const role of runs[renderRunOrdinal].authority ?? []) {
      if (role.tag !== 'data_carrier') continue;
      const sourceOrdinals = arr((rec(role.provenance) ?? {}).sourceOrdinals);
      if (!sourceOrdinals) continue;
      const key = weightSourceOrdinalKey(sourceOrdinals);
      const prior = runOrdinalByLineage.get(key);
      if (prior !== undefined && prior !== renderRunOrdinal) {
        throw new Error('one weight observation lineage appears in multiple explicit render runs');
      }
      runOrdinalByLineage.set(key, renderRunOrdinal);
    }
  }
  return {
    ...base,
    observationProvenance: series.observations.map((observation) => {
      const renderRunOrdinal = runOrdinalByLineage.get(
        weightSourceOrdinalKey(observation.sourceOrdinals),
      );
      return {
        seriesId: series.id,
        sourceOrdinals: [...observation.sourceOrdinals],
        ...(renderRunOrdinal === undefined ? {} : { renderRunOrdinal }),
      };
    }),
  };
}

interface PreparedWeightMember {
  readonly raw: Record<string, unknown>;
  readonly prepared: PreparedTraceSeries;
  /** Duplicate-resolved observations across the complete declared recording interval. */
  readonly statePrepared: PreparedTraceSeries;
  readonly uncertaintyLower?: readonly (number | null)[];
  readonly uncertaintyUpper?: readonly (number | null)[];
  readonly stateUncertaintyLower?: readonly (number | null)[];
  readonly stateUncertaintyUpper?: readonly (number | null)[];
  readonly uncertainty?: TracePanelSpec['series'][number]['uncertainty'];
  readonly recordedStart: number;
  readonly recordedStop: number;
  readonly recordedFinalEdgeInclusive: boolean;
  readonly stateStart: number;
  readonly stateStop: number;
  /** Physical time of the declared initial state, before display-window clipping. */
  readonly initialStateTime: number;
  readonly initialValue?: number;
}

/** True exactly when the trace compiler can paint at least one data carrier. */
function weightPanelSeriesHasPaintableCarrier(
  entry: TracePanelSpec['series'][number],
  showObservationMarkers: boolean,
): boolean {
  if (entry.renderRuns !== undefined) {
    if (entry.renderRuns.some((run) => run.values.some(Number.isFinite))) return true;
    if (!showObservationMarkers) return false;
    const markerIndexes = entry.markerObservationIndexes ??
      entry.series.values.map((_value, index) => index);
    return markerIndexes.some((index) => {
      const value = entry.series.values[index];
      return typeof value === 'number' && Number.isFinite(value);
    });
  }
  return entry.series.values.some((value) =>
    typeof value === 'number' && Number.isFinite(value));
}

interface WeightInterval {
  readonly start: number;
  readonly stop: number;
}

/** Adjacent lifetimes are continuous; only a positive-duration gap resets held state. */
function coalesceWeightIntervals(intervals: readonly WeightInterval[]): WeightInterval[] {
  const output: WeightInterval[] = [];
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

interface DeclaredInitialHold {
  readonly start: number;
  readonly stop: number;
  readonly value: number;
}

function declaredInitialHold(
  member: PreparedWeightMember,
  observation: Record<string, unknown>,
  membershipLifetimes?: readonly WeightInterval[],
): DeclaredInitialHold | undefined {
  if (
    observation.kind !== 'event_updated' ||
    observation.updateSemantics !== 'value_after_update' ||
    member.initialValue === undefined
  ) return undefined;
  const lifetime = membershipLifetimes?.find((candidate) =>
    member.initialStateTime >= candidate.start && member.initialStateTime < candidate.stop);
  if (membershipLifetimes && !lifetime) return undefined;
  const stop = Math.min(
    member.statePrepared.observations[0]?.time ?? member.stateStop,
    member.recordedStop,
    lifetime?.stop ?? member.recordedStop,
  );
  const start = Math.max(
    member.stateStart,
    member.recordedStart,
    lifetime?.start ?? member.recordedStart,
  );
  return stop > start
    ? { start, stop, value: member.initialValue }
    : undefined;
}

interface WeightStateWitness {
  readonly observation: PreparedTraceObservation;
  readonly role: 'carry_in' | 'look_ahead';
  readonly consultedByDerivedAggregate?: boolean;
}

interface EventUpdatedMaterialization {
  readonly runs: readonly TraceRenderRun[];
  readonly witnesses: readonly WeightStateWitness[];
  readonly initialStatePainted: boolean;
}

/** Establish complete recorded-interval state first, then clip its holds to the panel. */
function eventUpdatedMaterialization(
  member: PreparedWeightMember,
  updateSemantics: 'value_after_update' | 'value_before_update',
  membershipLifetimes?: readonly WeightInterval[],
  includeRenderRuns = true,
): EventUpdatedMaterialization {
  const observations = member.statePrepared.observations;
  const runs: {
    times: number[];
    values: number[];
    uncertaintyLower: (number | null)[];
    uncertaintyUpper: (number | null)[];
    authority: OutputAuthorityAtomicRoleV1[];
  }[] = [];
  const witnesses = new Map<string, WeightStateWitness>();
  const retainedOrdinals = new Set(
    member.prepared.observations.flatMap((observation) => observation.sourceOrdinals),
  );
  let paintedInitial = false;
  let segmentCount = 0;
  const emitSegment = (segment: {
    readonly start: number;
    readonly stop: number;
    readonly value: number | null;
    readonly lower: number | null;
    readonly upper: number | null;
    readonly observation?: PreparedTraceObservation;
    readonly provenance?: Record<string, unknown>;
  }): void => {
    const segmentIndex = segmentCount++;
    if (segment.observation && segment.observation.sourceOrdinals.some(
      (ordinal: number) => !retainedOrdinals.has(ordinal),
    )) {
      const role: WeightStateWitness['role'] =
        segment.observation.time < member.recordedStart ? 'carry_in' : 'look_ahead';
      witnesses.set(
        `${role}:${segment.observation.sourceOrdinals.join(',')}`,
        { observation: segment.observation, role },
      );
    }
    if (segment.provenance?.segmentSource === 'declared_initial_weight') paintedInitial = true;
    // Evidence-only preflight deliberately allocates no render-run carriers. A missing
    // update remains an explicit state witness/gap but never creates drawable vertices.
    if (!includeRenderRuns || segment.value === null || !segment.provenance) return;
    const startAuthority: OutputAuthorityAtomicRoleV1 = {
      tag: 'data_carrier',
      classId: 'series_paths',
      provenance: {
        ...segment.provenance,
        segmentIndex,
        endpoint: 'start',
      },
    };
    const stopAuthority: OutputAuthorityAtomicRoleV1 = {
      tag: 'data_carrier',
      classId: 'series_paths',
      provenance: {
        ...segment.provenance,
        segmentIndex,
        endpoint: 'stop',
      },
    };
    const previous = runs[runs.length - 1];
    if (previous && previous.times[previous.times.length - 1] === segment.start) {
      previous.times.push(segment.start, segment.stop);
      previous.values.push(segment.value, segment.value);
      previous.uncertaintyLower.push(segment.lower, segment.lower);
      previous.uncertaintyUpper.push(segment.upper, segment.upper);
      previous.authority.push(startAuthority, stopAuthority);
    } else {
      runs.push({
        times: [segment.start, segment.stop],
        values: [segment.value, segment.value],
        uncertaintyLower: [segment.lower, segment.lower],
        uncertaintyUpper: [segment.upper, segment.upper],
        authority: [startAuthority, stopAuthority],
      });
    }
  };
  const clippedInitialHold = declaredInitialHold(member, {
    kind: 'event_updated',
    updateSemantics,
  }, membershipLifetimes);
  if (clippedInitialHold && clippedInitialHold.stop > clippedInitialHold.start) {
    emitSegment({
      start: clippedInitialHold.start,
      stop: clippedInitialHold.stop,
      value: clippedInitialHold.value,
      lower: null,
      upper: null,
      provenance: {
        seriesId: member.prepared.id,
        sourceOrdinals: [],
        atomKind: 'hold_segment',
        segmentSource: 'declared_initial_weight',
      },
    });
  }
  for (let index = 0; index < observations.length; index++) {
    const observation = observations[index];
    const sourceStart = updateSemantics === 'value_after_update'
      ? observation.time
      : index === 0 ? member.stateStart : observations[index - 1].time;
    const sourceStop = updateSemantics === 'value_after_update'
      ? observations[index + 1]?.time ?? member.stateStop
      : observation.time;
    const lifetime = membershipLifetimes?.find((candidate) =>
      updateSemantics === 'value_after_update'
        ? observation.time >= candidate.start && observation.time < candidate.stop
        : observation.time > candidate.start && observation.time <= candidate.stop);
    if (membershipLifetimes && !lifetime) continue;
    const start = Math.max(sourceStart, member.recordedStart, lifetime?.start ?? sourceStart);
    const stop = Math.min(sourceStop, member.recordedStop, lifetime?.stop ?? sourceStop);
    if (!(stop > start)) continue;
    emitSegment({
      start,
      stop,
      value: observation.value,
      lower: member.stateUncertaintyLower?.[index] ?? null,
      upper: member.stateUncertaintyUpper?.[index] ?? null,
      observation,
      provenance: {
        seriesId: member.statePrepared.id,
        sourceOrdinals: [...observation.sourceOrdinals],
        atomKind: 'hold_segment',
      },
    });
  }
  if (
    includeRenderRuns &&
    updateSemantics === 'value_after_update' &&
    member.recordedFinalEdgeInclusive
  ) {
    const terminalIndex = observations.findIndex((observation) =>
      observation.time === member.recordedStop && observation.value !== null);
    const terminalObservation = observations[terminalIndex];
    const terminalLifetime = membershipLifetimes?.find((lifetime) =>
      terminalObservation !== undefined &&
      terminalObservation.time >= lifetime.start && terminalObservation.time < lifetime.stop);
    if (terminalObservation && (!membershipLifetimes || terminalLifetime)) {
      runs.push({
        times: [terminalObservation.time],
        values: [terminalObservation.value!],
        uncertaintyLower: [member.stateUncertaintyLower?.[terminalIndex] ?? null],
        uncertaintyUpper: [member.stateUncertaintyUpper?.[terminalIndex] ?? null],
        authority: [{
          tag: 'data_carrier',
          classId: 'series_paths',
          provenance: {
            seriesId: member.statePrepared.id,
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

function mergeWeightStateWitnesses(
  ...groups: readonly (readonly WeightStateWitness[] | undefined)[]
): WeightStateWitness[] {
  const merged = new Map<string, WeightStateWitness>();
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

function markerIndexesForWeightRuns(
  member: PreparedWeightMember,
  runs: readonly TraceRenderRun[],
): number[] {
  const lineage = new Set<string>();
  for (const run of runs) {
    for (const role of run.authority ?? []) {
      if (role.tag !== 'data_carrier') continue;
      const provenance = rec(role.provenance);
      const ordinals = arr(provenance?.sourceOrdinals) ?? [];
      if (ordinals.length > 0) lineage.add(canonicalize(ordinals));
    }
  }
  return member.prepared.observations.flatMap((observation, index) =>
    lineage.has(canonicalize(observation.sourceOrdinals)) ? [index] : []);
}

function unionWeightAvailability(
  selectedMembers: readonly PreparedWeightMember[],
  membershipById: ReadonlyMap<string, readonly WeightInterval[]>,
): WeightInterval[] {
  const pieces = selectedMembers.flatMap((member) =>
    (membershipById.get(member.prepared.id) ?? []).flatMap((interval) => {
      const start = Math.max(interval.start, member.recordedStart);
      const stop = Math.min(interval.stop, member.recordedStop);
      return stop > start ? [{ start, stop }] : [];
    }));
  pieces.sort((left, right) => left.start - right.start || left.stop - right.stop);
  return coalesceWeightIntervals(pieces);
}

/** Times at which the exact set of available aggregate members changes. */
function weightAvailabilityTransitions(
  selectedMembers: readonly PreparedWeightMember[],
  membershipById: ReadonlyMap<string, readonly WeightInterval[]>,
): number[] {
  const transitions = selectedMembers.flatMap((member) =>
    memberWeightAvailability(member, membershipById.get(member.prepared.id) ?? [])
      .flatMap((interval) => [interval.start, interval.stop]));
  transitions.sort((left, right) => left - right);
  return transitions.filter((time, index) => index === 0 || time !== transitions[index - 1]);
}

function memberWeightAvailability(
  member: PreparedWeightMember,
  membershipLifetimes: readonly WeightInterval[],
): WeightInterval[] {
  return membershipLifetimes.flatMap((interval) => {
    const start = Math.max(interval.start, member.recordedStart);
    const stop = Math.min(interval.stop, member.recordedStop);
    return stop > start ? [{ start, stop }] : [];
  });
}

function availabilityConnects(
  availability: readonly WeightInterval[],
  from: number,
  to: number,
): boolean {
  if (!(to > from)) return true;
  return availability.some((interval) => interval.start <= from && interval.stop >= to);
}

function crossesWeightAvailabilityTransition(
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

/**
 * Point samples are only joined while selected membership/recording availability is
 * continuous. A known positive-duration zero-availability gap starts a new run, and
 * singleton runs remain explicit so the generic trace compiler paints a marker.
 */
function pointSampleAggregateRenderRuns(
  prepared: PreparedTraceSeries,
  uncertaintyLower: readonly (number | null)[] | undefined,
  uncertaintyUpper: readonly (number | null)[] | undefined,
  availability: readonly WeightInterval[],
  availabilityTransitions: readonly number[],
): readonly TraceRenderRun[] {
  const runs: {
    times: number[];
    values: number[];
    uncertaintyLower: (number | null)[];
    uncertaintyUpper: (number | null)[];
    authority: OutputAuthorityAtomicRoleV1[];
  }[] = [];
  let current: (typeof runs)[number] | undefined;
  for (let index = 0; index < prepared.observations.length; index++) {
    const observation = prepared.observations[index];
    if (observation.value === null) {
      current = undefined;
      continue;
    }
    const previousTime = current?.times[current.times.length - 1];
    if (
      current === undefined ||
      previousTime === undefined ||
      crossesWeightAvailabilityTransition(
        availabilityTransitions,
        previousTime,
        observation.time,
      ) ||
      !availabilityConnects(availability, previousTime, observation.time)
    ) {
      current = {
        times: [],
        values: [],
        uncertaintyLower: [],
        uncertaintyUpper: [],
        authority: [],
      };
      runs.push(current);
    }
    current.times.push(observation.time);
    current.values.push(observation.value);
    current.uncertaintyLower.push(uncertaintyLower?.[index] ?? null);
    current.uncertaintyUpper.push(uncertaintyUpper?.[index] ?? null);
    current.authority.push({
      tag: 'data_carrier',
      classId: 'series_paths',
      provenance: {
        seriesId: prepared.id,
        sourceOrdinals: [...observation.sourceOrdinals],
        atomKind: 'observation_vertex',
      },
    });
  }
  return runs;
}

function pointSampleMembershipRenderRuns(
  member: PreparedWeightMember,
  membershipLifetimes: readonly WeightInterval[],
  availabilityTransitions: readonly number[] = [],
): {
  readonly runs: readonly TraceRenderRun[];
  readonly markerObservationIndexes: readonly number[];
} {
  const availability = memberWeightAvailability(member, membershipLifetimes);
  const runs: TraceRenderRun[] = [];
  const markerObservationIndexes: number[] = [];
  let current: {
    times: number[];
    values: number[];
    uncertaintyLower: (number | null)[];
    uncertaintyUpper: (number | null)[];
    authority: OutputAuthorityAtomicRoleV1[];
  } | undefined;
  for (let index = 0; index < member.prepared.observations.length; index++) {
    const observation = member.prepared.observations[index];
    const belongs = membershipLifetimes.some((interval) =>
      observation.time >= interval.start && observation.time < interval.stop);
    const recorded = observation.time >= member.recordedStart &&
      (observation.time < member.recordedStop ||
        (member.recordedFinalEdgeInclusive && observation.time === member.recordedStop));
    const available = belongs && recorded;
    if (!available || observation.value === null) {
      current = undefined;
      continue;
    }
    markerObservationIndexes.push(index);
    const previousTime = current?.times[current.times.length - 1];
    if (
      !current || previousTime === undefined ||
      crossesWeightAvailabilityTransition(
        availabilityTransitions,
        previousTime,
        observation.time,
      ) ||
      !availabilityConnects(availability, previousTime, observation.time)
    ) {
      current = {
        times: [],
        values: [],
        uncertaintyLower: [],
        uncertaintyUpper: [],
        authority: [],
      };
      runs.push(current);
    }
    current.times.push(observation.time);
    current.values.push(observation.value);
    current.uncertaintyLower.push(member.uncertaintyLower?.[index] ?? null);
    current.uncertaintyUpper.push(member.uncertaintyUpper?.[index] ?? null);
    current.authority.push({
      tag: 'data_carrier',
      classId: 'series_paths',
      provenance: {
        seriesId: member.prepared.id,
        sourceOrdinals: [...observation.sourceOrdinals],
        atomKind: 'observation_vertex',
      },
    });
  }
  return { runs, markerObservationIndexes };
}

function interpolatedTrajectoryNeedsExcludedKnot(
  member: PreparedWeightMember,
): boolean {
  const retained = new Set(
    member.prepared.observations.flatMap((observation) => observation.sourceOrdinals),
  );
  const observations = member.statePrepared.observations;
  for (let index = 1; index < observations.length; index++) {
    const left = observations[index - 1];
    const right = observations[index];
    if (left.value === null || right.value === null || !(right.time > left.time)) continue;
    const overlapStart = Math.max(left.time, member.recordedStart);
    const overlapStop = Math.min(right.time, member.recordedStop);
    if (
      overlapStop > overlapStart &&
      (left.sourceOrdinals.some((ordinal) => !retained.has(ordinal)) ||
        right.sourceOrdinals.some((ordinal) => !retained.has(ordinal)))
    ) return true;
  }
  return false;
}

function interpolatedTrajectoryRenderRuns(
  member: PreparedWeightMember,
  atomKind = 'reconstruction_vertex',
): readonly TraceRenderRun[] {
  const runs: TraceRenderRun[] = [];
  let current: {
    times: number[];
    values: number[];
    uncertaintyLower: (number | null)[];
    uncertaintyUpper: (number | null)[];
    authority: OutputAuthorityAtomicRoleV1[];
  } | undefined;
  for (let index = 0; index < member.prepared.observations.length; index++) {
    const observation = member.prepared.observations[index];
    if (observation.value === null) {
      current = undefined;
      continue;
    }
    if (!current) {
      current = {
        times: [],
        values: [],
        uncertaintyLower: [],
        uncertaintyUpper: [],
        authority: [],
      };
      runs.push(current);
    }
    current.times.push(observation.time);
    current.values.push(observation.value);
    current.uncertaintyLower.push(member.uncertaintyLower?.[index] ?? null);
    current.uncertaintyUpper.push(member.uncertaintyUpper?.[index] ?? null);
    current.authority.push({
      tag: 'data_carrier',
      classId: 'series_paths',
      provenance: {
        seriesId: member.prepared.id,
        sourceOrdinals: [...observation.sourceOrdinals],
        atomKind,
      },
    });
  }
  return runs;
}

function empiricalQuantile(values: readonly number[], probability: number): number {
  return exactBinary64EmpiricalQuantileType7(values, probability);
}

function aggregateWeightValues(values: readonly number[], method: string): number | null {
  if (values.length === 0) return null;
  if (method === 'mean') return exactBinary64Mean(values);
  if (method === 'median') return empiricalQuantile(values, 0.5);
  if (method === 'min') return traceCompilerMinimum(values);
  if (method === 'max') return traceCompilerMaximum(values);
  throw new Error(`unsupported synaptic-weight aggregate method ${method}`);
}

interface DerivedWeightAggregate {
  readonly record: Record<string, unknown>;
  readonly prepared: PreparedTraceSeries;
  readonly uncertaintyLower?: readonly (number | null)[];
  readonly uncertaintyUpper?: readonly (number | null)[];
  readonly uncertainty?: TracePanelSpec['series'][number]['uncertainty'];
  readonly memberCounts: readonly number[];
  readonly contributingCounts: readonly number[];
  readonly selectedMembers: readonly PreparedWeightMember[];
  readonly membershipById: ReadonlyMap<string, readonly WeightInterval[]>;
  readonly stateWitnessesByMember: ReadonlyMap<string, readonly WeightStateWitness[]>;
  readonly initialStateContributorIds: ReadonlySet<string>;
  readonly operation: DerivationOperation;
}

interface PreparedWeightAggregateGrid {
  readonly membershipById: ReadonlyMap<string, readonly WeightInterval[]>;
  readonly selectedMembers: readonly PreparedWeightMember[];
  readonly evaluationTimes: readonly number[];
}

interface SaturatedWeightAggregateGridPreflight {
  readonly tag: 'saturated_over_budget';
  /**
   * A lower-bound sentinel for evaluation-grid cardinality. This count is not a
   * table-row count; the caller combines it with its already exact source rows.
   */
  readonly saturatedEvaluationCount: number;
}

type PreparedWeightAggregateGridPreflight =
  | {
    readonly tag: 'exact_within_budget';
    readonly grid: PreparedWeightAggregateGrid;
  }
  | SaturatedWeightAggregateGridPreflight;

/**
 * Canonicalize the aggregate membership and timestamp grid without evaluating one
 * member state. Compilation preflights its cardinality before entering the E x M
 * aggregate loop, and then passes this same state into the derivation.
 */
function prepareWeightAggregateGrid(
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
  window: TraceWindow,
  members: readonly PreparedWeightMember[],
  maximumEvaluationTimes: number,
): PreparedWeightAggregateGridPreflight {
  if (
    !Number.isSafeInteger(maximumEvaluationTimes) ||
    maximumEvaluationTimes < 0 ||
    maximumEvaluationTimes >= Number.MAX_SAFE_INTEGER
  ) {
    throw new Error('weight aggregate-grid limit must be a non-negative safe integer below MAX_SAFE_INTEGER');
  }
  const membership = rec(data.membership) ?? {};
  const evaluation = rec(rec(parameters.aggregate)?.evaluation) ?? {};
  const membershipUnit = String(membership.unit);
  const membershipById = new Map<string, readonly WeightInterval[]>();
  const evaluationTimeSet = new Set<number>();
  const saturated = (): SaturatedWeightAggregateGridPreflight => ({
    tag: 'saturated_over_budget',
    saturatedEvaluationCount: maximumEvaluationTimes + 1,
  });
  const addEvaluationTime = (time: number): boolean => {
    if (
      time < window.start ||
      time > window.stop ||
      (!window.finalEdgeInclusive && time === window.stop)
    ) return true;
    evaluationTimeSet.add(time);
    return evaluationTimeSet.size <= maximumEvaluationTimes;
  };
  let evaluationMode: 'declared' | 'shared' | 'union';
  switch (evaluation.mode) {
    case 'hold_last_observed_at_declared_times':
      evaluationMode = 'declared';
      break;
    case 'shared_sample_grid':
      evaluationMode = 'shared';
      break;
    case 'hold_last_observed_at_union_times':
      evaluationMode = 'union';
      break;
    default:
      throw new Error(
        `unsupported synaptic-weight aggregate evaluation mode ${String(evaluation.mode)}`,
      );
  }
  if (evaluationMode === 'union') {
    if (!addEvaluationTime(window.start)) {
      return saturated();
    }
    if (window.finalEdgeInclusive && !addEvaluationTime(window.stop)) {
      return saturated();
    }
  }
  const membershipMembers = arr(membership.members) ?? [];
  const membershipIds = new Set(
    membershipMembers.map((candidate) => String((rec(candidate) ?? {}).edgeId)),
  );
  const selectedMembers = members.filter((candidate) =>
    membershipIds.has(candidate.prepared.id));
  if (selectedMembers.length !== membershipIds.size) {
    const unresolved = [...membershipIds].filter((id) =>
      !selectedMembers.some((member) => member.prepared.id === id));
    throw new Error(`aggregate membership references undeclared edge ${unresolved.join(', ')}`);
  }
  // Declared/shared grids can be conclusively refused before membership interval
  // conversion or allocation because their grid does not depend on those spans.
  if (evaluationMode === 'declared') {
    const times = rec(evaluation.times) ?? {};
    const unit = String(times.unit);
    for (const candidate of arr(times.values) ?? []) {
      if (typeof candidate !== 'number') {
        throw new Error('declared synaptic-weight aggregate time must be a number');
      }
      const converted = unit === window.unit
        ? candidate
        : convert(candidate, unit, window.unit);
      if (!addEvaluationTime(converted)) return saturated();
    }
  } else if (evaluationMode === 'shared') {
    const sharedTimes = selectedMembers[0]?.prepared.times ?? [];
    for (const member of selectedMembers.slice(1)) {
      if (
        member.prepared.times.length !== sharedTimes.length ||
        member.prepared.times.some((time, index) => time !== sharedTimes[index])
      ) {
        throw new Error('shared_sample_grid requires exact elementwise-identical member times');
      }
    }
    for (const time of sharedTimes) {
      if (!addEvaluationTime(time)) return saturated();
    }
  }
  for (const candidate of membershipMembers) {
    const record = rec(candidate) ?? {};
    const convertedIntervals: WeightInterval[] = [];
    for (const interval of arr(record.intervals) ?? []) {
      const span = rec(interval) ?? {};
      const converted = {
        start: membershipUnit === window.unit
          ? num(span.start)!
          : convert(num(span.start)!, membershipUnit, window.unit),
        stop: membershipUnit === window.unit
          ? num(span.stop)!
          : convert(num(span.stop)!, membershipUnit, window.unit),
      };
      convertedIntervals.push(converted);
      if (
        evaluationMode === 'union' &&
        (!addEvaluationTime(converted.start) || !addEvaluationTime(converted.stop))
      ) {
        return saturated();
      }
    }
    membershipById.set(
      String(record.edgeId),
      coalesceWeightIntervals(convertedIntervals),
    );
  }
  if (evaluationMode === 'union') {
    for (const member of selectedMembers) {
      for (const time of member.prepared.times) {
        if (!addEvaluationTime(time)) return saturated();
      }
      if (
        !addEvaluationTime(member.recordedStart) ||
        !addEvaluationTime(member.recordedStop)
      ) {
        return saturated();
      }
    }
  }
  const evaluationTimes = [...evaluationTimeSet].sort((left, right) => left - right);
  return {
    tag: 'exact_within_budget',
    grid: { membershipById, selectedMembers, evaluationTimes },
  };
}

function deriveWeightAggregate(
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
  window: TraceWindow,
  preparedGrid: PreparedWeightAggregateGrid,
): DerivedWeightAggregate {
  const membership = rec(data.membership) ?? {};
  const aggregate = rec(parameters.aggregate) ?? {};
  const evaluation = rec(aggregate.evaluation) ?? {};
  const observation = rec(data.observation) ?? {};
  const { membershipById, selectedMembers, evaluationTimes } = preparedGrid;
  const membershipUnit = String(membership.unit);
  // Canonical edge-series order fixes identities and tie order. Exact mean/dispersion
  // arithmetic is permutation-invariant; membership-array order never reorders inputs.
  const selectedIds = selectedMembers.map((member) => member.prepared.id);

  // Validation establishes positive, ordered, non-overlapping intervals and unique
  // membership ids. Adjacent intervals are one lifetime; a positive-duration gap is
  // a genuine deletion/re-creation boundary and therefore resets held state.
  const states = selectedMembers.map((member) => {
    const lifetimes = membershipById.get(member.prepared.id)!;
    const stateTrace = observation.kind === 'point_sample'
      ? member.prepared
      : member.statePrepared;
    const pointIndexByTime = new Map<number, number>();
    for (let index = 0; index < member.prepared.times.length; index++) {
      if (!pointIndexByTime.has(member.prepared.times[index])) {
        pointIndexByTime.set(member.prepared.times[index], index);
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
        member.prepared.observations.flatMap((candidate) => candidate.sourceOrdinals),
      ),
    };
  });
  const memberCounts: number[] = [];
  const contributingCounts: number[] = [];
  const aggregateValues: (number | null)[] = [];
  const dispersion = rec(aggregate.dispersion) ?? { kind: 'none', reason: 'not_computed' };
  const dispersionValues: (number | null)[] = [];
  const lowerValues: (number | null)[] = [];
  const upperValues: (number | null)[] = [];
  const stateWitnessMaps = new Map<string, Map<string, WeightStateWitness>>();
  const initialStateContributorIds = new Set<string>();
  for (const time of evaluationTimes) {
    let memberCount = 0;
    const finite: number[] = [];
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
      let candidateObservation: PreparedTraceObservation | undefined;
      let usedInitialState = false;
      if (observation.kind === 'point_sample') {
        const index = state.pointIndexByTime.get(time);
        candidate = index === undefined ? null : member.prepared.values[index];
      } else if (observation.updateSemantics === 'value_before_update') {
        while (
          state.before < state.stateTrace.times.length &&
          state.stateTrace.times[state.before] < time
        ) state.before++;
        const candidateTime = state.stateTrace.times[state.before];
        candidateObservation = state.stateTrace.observations[state.before];
        candidate = state.before < state.stateTrace.values.length &&
          candidateTime >= Math.max(lifetime.start, member.stateStart) &&
          candidateTime <= lifetime.stop
          ? state.stateTrace.values[state.before]
          : null;
        if (!(state.before < state.stateTrace.values.length &&
          candidateTime >= Math.max(lifetime.start, member.stateStart) &&
          candidateTime <= lifetime.stop)) candidateObservation = undefined;
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
          const initialBelongsToLifetime =
            member.initialValue !== undefined &&
            member.initialStateTime >= lifetime.start &&
            member.initialStateTime < lifetime.stop;
          candidate = initialBelongsToLifetime ? member.initialValue! : null;
          usedInitialState = initialBelongsToLifetime;
        }
      }
      if (candidateObservation && candidateObservation.sourceOrdinals.some(
        (ordinal: number) => !state.retainedSourceOrdinals.has(ordinal),
      )) {
        const role: WeightStateWitness['role'] =
          candidateObservation.time < member.recordedStart ? 'carry_in' : 'look_ahead';
        const byMember = stateWitnessMaps.get(member.prepared.id) ?? new Map<string, WeightStateWitness>();
        byMember.set(
          `${role}:${candidateObservation.sourceOrdinals.join(',')}`,
          {
            observation: candidateObservation,
            role,
            consultedByDerivedAggregate: true,
          },
        );
        stateWitnessMaps.set(member.prepared.id, byMember);
      }
      if (usedInitialState) initialStateContributorIds.add(member.prepared.id);
      if (typeof candidate === 'number') finite.push(candidate);
    }
    memberCounts.push(memberCount);
    contributingCounts.push(finite.length);
    const aggregateValue = aggregateWeightValues(finite, String(aggregate.method));
    aggregateValues.push(aggregateValue);
    if (dispersion.kind === 'standard_deviation') {
      dispersionValues.push(
        finite.length < 2 || aggregateValue === null
          ? null
          : exactBinary64SampleStandardDeviation(finite),
      );
    } else if (dispersion.kind === 'quantile_interval') {
      lowerValues.push(finite.length > 0
        ? empiricalQuantile(finite, num(dispersion.lowerQuantile)!)
        : null);
      upperValues.push(finite.length > 0
        ? empiricalQuantile(finite, num(dispersion.upperQuantile)!)
        : null);
    } else if (dispersion.kind === 'ensemble_range') {
      lowerValues.push(finite.length > 0 ? traceCompilerMinimum(finite) : null);
      upperValues.push(finite.length > 0 ? traceCompilerMaximum(finite) : null);
    }
  }
  const valueUnit = selectedMembers[0]?.prepared.valueUnit ?? 'nest:weight';
  let uncertainty: Record<string, unknown>;
  if (dispersion.kind === 'standard_deviation') {
    uncertainty = {
      kind: 'standard_deviation',
      unit: valueUnit,
      values: dispersionValues,
      sampleCount: dispersionValues.map((value, index) =>
        value === null ? null : contributingCounts[index]),
      basis: 'ensemble_members',
    };
  } else if (dispersion.kind === 'quantile_interval') {
    uncertainty = {
      kind: 'quantile_interval',
      unit: valueUnit,
      lower: lowerValues,
      upper: upperValues,
      lowerQuantile: dispersion.lowerQuantile,
      upperQuantile: dispersion.upperQuantile,
      method: 'empirical_type_7_linear',
      sampleCount: contributingCounts.map((count) => count > 0 ? count : null),
      basis: 'ensemble_members',
    };
  } else if (dispersion.kind === 'ensemble_range') {
    uncertainty = {
      kind: 'ensemble_range',
      unit: valueUnit,
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
  const initialStateContributorIdList = selectedMembers
    .filter((member) => initialStateContributorIds.has(member.prepared.id))
    .map((member) => member.prepared.id);
  const aggregateObservationKind: TraceObservationKind = observation.kind === 'event_updated'
    ? 'piecewise_constant'
    : 'point_sample';
  const prepared = prepareTraceSeries({
    id: groupId,
    label: groupLabel,
    observationKind: aggregateObservationKind,
    times: evaluationTimes,
    timeUnit: window.unit,
    values: aggregateValues,
    valueUnit,
  }, { window, duplicatePolicy: 'reject', targetValueUnit: valueUnit });
  const uncertaintyArrays = traceUncertaintyArrays(uncertainty, prepared);
  const models = [...new Set(selectedMembers.map((member) => String(member.raw.synapseModel)))];
  const record: Record<string, unknown> = {
    groupId,
    groupLabel,
    synapseModels: models,
    weightComparabilityMode: String(rec(parameters.weightComparability)?.mode),
    method: aggregate.method,
    time: { kind: 'time', unit: window.unit, values: evaluationTimes },
    values: { kind: 'synaptic_weight', unit: valueUnit, values: aggregateValues },
    memberCounts,
    contributingCounts,
    uncertainty,
  };
  return {
    record,
    prepared,
    ...uncertaintyArrays,
    memberCounts,
    contributingCounts,
    selectedMembers,
    membershipById,
    stateWitnessesByMember: new Map(
      [...stateWitnessMaps].map(([id, byKey]) => [id, [...byKey.values()] as const]),
    ),
    initialStateContributorIds,
    operation: {
      id: 'weight.aggregate.membership_bound',
      algorithm: 'cortexel.weight_trace.aggregate_members',
      algorithmRevision: 2,
      parameters: {
        method: aggregate.method,
        evaluation,
        dispersion,
        membershipUnit,
        observation,
        analysisWindow: window,
        weightComparability: rec(parameters.weightComparability),
        targetValueUnit: valueUnit,
      },
      inputDigest: canonicalDigest({
        membership,
        members: selectedMembers.map((member) => member.raw),
        observation,
        analysisWindow: window,
        weightComparability: rec(parameters.weightComparability),
        targetValueUnit: valueUnit,
      }),
      outputDigest: canonicalDigest({ evaluationTimes, aggregateValues, memberCounts, contributingCounts, uncertainty }),
      receipt: {
        selectedMemberIds: selectedIds,
        evaluationCount: evaluationTimes.length,
        meanDenominator: 'contributing_count',
        zeroContributorsYieldNull: true,
        membershipTimeConversion: nonIdentityConversion(membershipUnit, window.unit),
        evaluationTimeConversion: evaluation.mode === 'hold_last_observed_at_declared_times'
          ? nonIdentityConversion(
            typeof rec(evaluation.times)?.unit === 'string'
              ? String(rec(evaluation.times)?.unit)
              : undefined,
            window.unit,
          )
          : null,
        quantileAlgorithm: dispersion.kind === 'quantile_interval' ? 'empirical_type_7_linear' : null,
        initialStateContributorIds: initialStateContributorIdList,
        output: {
          evaluationTimes,
          aggregateValues,
          memberCounts,
          contributingCounts,
          uncertainty,
        },
      },
    },
  };
}

function phaseConvergenceFlags(fixedPoints: Record<string, unknown> | undefined): boolean[] {
  if (!fixedPoints) return [];
  const residualDx = numbers(rec(fixedPoints.residualDxDt)?.values);
  const residualDy = numbers(rec(fixedPoints.residualDyDt)?.values);
  const toleranceDx = numbers(rec(fixedPoints.toleranceDxDt)?.values);
  const toleranceDy = numbers(rec(fixedPoints.toleranceDyDt)?.values);
  const residualDxUnit = String(rec(fixedPoints.residualDxDt)?.unit);
  const residualDyUnit = String(rec(fixedPoints.residualDyDt)?.unit);
  const toleranceDxUnit = String(rec(fixedPoints.toleranceDxDt)?.unit);
  const toleranceDyUnit = String(rec(fixedPoints.toleranceDyDt)?.unit);
  const within = (residual: number, tolerance: number): boolean =>
    residual <= tolerance ||
    residual - tolerance <= 1e-9 * Math.max(Math.abs(residual), Math.abs(tolerance), Number.MIN_VALUE);
  return strings(fixedPoints.ids).map((_id, index) => within(
    Math.abs(convert(residualDx[index], residualDxUnit, toleranceDxUnit)),
    toleranceDx[index],
  ) && within(
    Math.abs(convert(residualDy[index], residualDyUnit, toleranceDyUnit)),
    toleranceDy[index],
  ));
}

function phasePlaneTableRows(
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
  convergenceFlags: readonly boolean[] = phaseConvergenceFlags(rec(data.fixedPoints)),
): TableCell[][] {
  const axes = rec(data.axes) ?? {};
  const xAxis = rec(axes.x) ?? {};
  const yAxis = rec(axes.y) ?? {};
  const xUnit = String(xAxis.unit);
  const yUnit = String(yAxis.unit);
  const trajectories = rec(data.trajectories);
  const vectorField = rec(data.vectorField);
  const nullclines = rec(data.nullclines);
  const fixedPoints = rec(data.fixedPoints);
  const fieldDomain = rec(vectorField?.domain);
  const convertedCarrier = (
    carrier: Record<string, unknown> | undefined,
    targetUnit: string,
  ): (number | null)[] => {
    const sourceUnit = String(carrier?.unit);
    return (arr(carrier?.values) ?? []).map((value) => value === null
      ? null
      : sourceUnit === targetUnit
        ? value as number
        : convert(value as number, sourceUnit, targetUnit));
  };
  const convertedFinite = (
    carrier: Record<string, unknown> | undefined,
    targetUnit: string,
  ): number[] => convertedCarrier(carrier, targetUnit).filter(
    (value): value is number => value !== null,
  );
  const allX = [
    ...convertedFinite(rec(trajectories?.x), xUnit),
    ...convertedFinite(rec(vectorField?.x), xUnit),
    ...convertedFinite(rec(nullclines?.x), xUnit),
    ...convertedFinite(rec(fixedPoints?.x), xUnit),
    ...(num(rec(fieldDomain?.x)?.start) !== undefined
      ? [convert(num(rec(fieldDomain?.x)?.start)!, String(rec(fieldDomain?.x)?.unit), xUnit)]
      : []),
    ...(num(rec(fieldDomain?.x)?.stop) !== undefined
      ? [convert(num(rec(fieldDomain?.x)?.stop)!, String(rec(fieldDomain?.x)?.unit), xUnit)]
      : []),
  ];
  const allY = [
    ...convertedFinite(rec(trajectories?.y), yUnit),
    ...convertedFinite(rec(vectorField?.y), yUnit),
    ...convertedFinite(rec(nullclines?.y), yUnit),
    ...convertedFinite(rec(fixedPoints?.y), yUnit),
    ...(num(rec(fieldDomain?.y)?.start) !== undefined
      ? [convert(num(rec(fieldDomain?.y)?.start)!, String(rec(fieldDomain?.y)?.unit), yUnit)]
      : []),
    ...(num(rec(fieldDomain?.y)?.stop) !== undefined
      ? [convert(num(rec(fieldDomain?.y)?.stop)!, String(rec(fieldDomain?.y)?.unit), yUnit)]
      : []),
  ];
  const xExtent = finiteExtent(allX);
  const yExtent = finiteExtent(allY);
  const magnitudeBasis = String(parameters.magnitudeBasis ?? 'axis_normalized');
  const speed = (
    dx: number | null,
    dy: number | null,
    dxUnit: string | null,
    dyUnit: string | null,
  ): number | null => {
    if (dx === null || dy === null || dxUnit === null || dyUnit === null) return null;
    if (magnitudeBasis === 'physical') {
      if (dimensionOf(xUnit) !== dimensionOf(yUnit)) return null;
      const canonicalStateUnit = canonicalUnitFor(xUnit);
      const canonicalTimeUnit = canonicalUnitFor(dxUnit);
      if (!canonicalStateUnit || !canonicalTimeUnit) return null;
      const canonicalDx = dx * conversionFactor(xUnit, canonicalStateUnit) *
        conversionFactor(dxUnit, canonicalTimeUnit);
      const canonicalDy = dy * conversionFactor(yUnit, canonicalStateUnit) *
        conversionFactor(dyUnit, canonicalTimeUnit);
      return Math.hypot(canonicalDx, canonicalDy);
    }
    if (!xExtent || !yExtent || !(xExtent.max > xExtent.min) || !(yExtent.max > yExtent.min)) {
      return null;
    }
    return Math.hypot(
      exactBinary64RatioToDifference(dx, xExtent.min, xExtent.max),
      exactBinary64RatioToDifference(
        convert(dy, dyUnit, dxUnit),
        yExtent.min,
        yExtent.max,
      ),
    );
  };
  const derivativeUnitCell = (dxUnit: string | null, dyUnit: string | null): TableCell =>
    dxUnit === null && dyUnit === null
      ? null
      : structuredCell({
        x: dxUnit === null ? null : `${xUnit} ${dxUnit}`,
        y: dyUnit === null ? null : `${yUnit} ${dyUnit}`,
        magnitudeBasis,
        ...(magnitudeBasis === 'physical'
          ? { magnitudeUnit: `${canonicalUnitFor(xUnit) ?? xUnit} ${canonicalUnitFor(dxUnit ?? '') ?? dxUnit}` }
          : { magnitudeUnit: dxUnit }),
      });
  const rows: TableCell[][] = [];

  if (trajectories) {
    const pointIds = strings(trajectories.pointTrajectoryIds);
    const declaredIds = strings(rec(trajectories.universe)?.ids);
    const times = numbers(rec(trajectories.times)?.values);
    const xs = convertedCarrier(rec(trajectories.x), xUnit);
    const ys = convertedCarrier(rec(trajectories.y), yUnit);
    const dxs = arr(rec(trajectories.dxdt)?.values) ?? [];
    const dys = arr(rec(trajectories.dydt)?.values) ?? [];
    const dxUnit = typeof rec(trajectories.dxdt)?.unit === 'string'
      ? String(rec(trajectories.dxdt)?.unit)
      : null;
    const dyUnit = typeof rec(trajectories.dydt)?.unit === 'string'
      ? String(rec(trajectories.dydt)?.unit)
      : null;
    for (let index = 0; index < pointIds.length; index++) {
      const x = xs[index] ?? null;
      const y = ys[index] ?? null;
      const dx = typeof dxs[index] === 'number' ? dxs[index] as number : null;
      const dy = typeof dys[index] === 'number' ? dys[index] as number : null;
      rows.push([
        'trajectory_point',
        pointIds[index],
        index,
        times[index],
        x,
        y,
        dx,
        dy,
        derivativeUnitCell(dxUnit, dyUnit),
        speed(dx, dy, dxUnit, dyUnit),
        null,
        null,
        null,
      ]);
    }
    const represented = new Set(pointIds);
    for (const id of declaredIds) {
      if (!represented.has(id)) {
        rows.push(['trajectory_point', id, null, null, null, null, null, null, null, null, null, null, null]);
      }
    }
  }

  if (vectorField) {
    const xs = convertedFinite(rec(vectorField.x), xUnit);
    const ys = convertedFinite(rec(vectorField.y), yUnit);
    const dxs = numbers(rec(vectorField.dx)?.values);
    const dys = numbers(rec(vectorField.dy)?.values);
    const dxUnit = String(rec(vectorField.dx)?.unit);
    const dyUnit = String(rec(vectorField.dy)?.unit);
    for (let index = 0; index < xs.length; index++) {
      rows.push([
        'field_sample',
        null,
        index,
        null,
        xs[index],
        ys[index],
        dxs[index],
        dys[index],
        derivativeUnitCell(dxUnit, dyUnit),
        speed(dxs[index], dys[index], dxUnit, dyUnit),
        null,
        null,
        null,
      ]);
    }
  }

  if (nullclines) {
    const pointIds = strings(nullclines.pointCurveIds);
    const xs = convertedCarrier(rec(nullclines.x), xUnit);
    const ys = convertedCarrier(rec(nullclines.y), yUnit);
    const curveIds = strings(nullclines.curveIds);
    const methods = arr(nullclines.methods) ?? [];
    const methodById = new Map(curveIds.map((id, index) => [id, rec(methods[index]) ?? {}]));
    for (let index = 0; index < pointIds.length; index++) {
      const method = methodById.get(pointIds[index]) ?? {};
      rows.push([
        'nullcline_point',
        pointIds[index],
        index,
        null,
        xs[index] ?? null,
        ys[index] ?? null,
        null,
        null,
        null,
        null,
        String(method.kind),
        structuredCell(method.residualTolerance),
        null,
      ]);
    }
  }

  if (fixedPoints) {
    const ids = strings(fixedPoints.ids);
    const xs = convertedFinite(rec(fixedPoints.x), xUnit);
    const ys = convertedFinite(rec(fixedPoints.y), yUnit);
    const methods = strings(fixedPoints.methods);
    const residualDx = numbers(rec(fixedPoints.residualDxDt)?.values);
    const residualDy = numbers(rec(fixedPoints.residualDyDt)?.values);
    const toleranceDx = numbers(rec(fixedPoints.toleranceDxDt)?.values);
    const toleranceDy = numbers(rec(fixedPoints.toleranceDyDt)?.values);
    const residualDxUnit = String(rec(fixedPoints.residualDxDt)?.unit);
    const residualDyUnit = String(rec(fixedPoints.residualDyDt)?.unit);
    const toleranceDxUnit = String(rec(fixedPoints.toleranceDxDt)?.unit);
    const toleranceDyUnit = String(rec(fixedPoints.toleranceDyDt)?.unit);
    for (let index = 0; index < ids.length; index++) {
      const converged = convergenceFlags[index];
      rows.push([
        'fixed_point',
        ids[index],
        index,
        null,
        xs[index],
        ys[index],
        null,
        null,
        null,
        null,
        methods[index],
        structuredCell({
          dxdt: { value: residualDx[index], unit: residualDxUnit },
          dydt: { value: residualDy[index], unit: residualDyUnit },
          toleranceDxDt: { value: toleranceDx[index], unit: toleranceDxUnit },
          toleranceDyDt: { value: toleranceDy[index], unit: toleranceDyUnit },
        }),
        booleanCell(converged),
      ]);
    }
  }
  return rows;
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
  returnedTableRows: number,
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
  const failDistribution = (error: DistributionDerivationError): CompileOutcome => {
    const stage: ErrorStage = error.code.startsWith('RESOURCE_')
      ? 'budget'
      : error.code.startsWith('RENDER_')
        ? 'render'
        : error.code.startsWith('SCOPE_')
          ? 'scope'
          : error.code.startsWith('SCIENCE_')
            ? 'science'
            : 'semantic';
    const instancePath = error.path.length === 0
      ? '/data'
      : `/${error.path.map((part) => String(part)
        .replaceAll('~', '~0')
        .replaceAll('/', '~1')).join('/')}`;
    return fail(error.code, stage, error.message, instancePath);
  };

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
        const result = derivePopulationRateCounts({
          eventTimes: times,
          eventUnit: sourceUnit,
          bins: {
            edges: resolvedBins.spec.edges,
            unit: resolvedBins.unit,
            finalEdgeInclusive: resolvedBins.spec.finalEdgeInclusive,
          },
          recordedSenderCount: recorded.length,
          normalization,
        });
        const eventTimeConversion = sourceUnit !== resolvedBins.unit
          ? conversionReceipt(sourceUnit, resolvedBins.unit)
          : undefined;
        const binWidthConversion = resolvedBins.unit !== 's'
          ? conversionReceipt(resolvedBins.unit, 's')
          : undefined;
        const binWidths = result.counts.map((_, index) => sameUnitDifference(
          resolvedBins.spec.edges[index],
          resolvedBins.spec.edges[index + 1],
          resolvedBins.unit,
        ));
        const operation = derivationOperation(
          'population_rate.binned',
          'cortexel.population_rate.binned_count',
          { bins: resolvedBins, normalization },
          data,
          {
            counts: result.counts,
            binWidths,
            binWidthUnit: resolvedBins.unit,
            ratesHz: result.ratesHz,
          },
          {
            sourceEventCount: result.sourceEventCount,
            recordedSenderCount: result.recordedSenderCount,
            ...(eventTimeConversion ? { eventTimeConversion } : {}),
            ...(binWidthConversion ? { binWidthConversion } : {}),
          },
        );
        const unitConversions = [
          ...(eventTimeConversion
            ? [
              conversionDisclosureText('population-rate event times', eventTimeConversion),
            ]
            : []),
          ...(binWidthConversion
            ? [
              conversionDisclosureText('population-rate bin widths', binWidthConversion),
            ]
            : []),
        ];
        const derivedFacts: Partial<DisclosureFacts> = unitConversions.length > 0
          ? { unitConversions }
          : {};
        const tableRows = result.counts.map((count, index) => [
          resolvedBins.spec.edges[index],
          resolvedBins.spec.edges[index + 1],
          binWidths[index],
          count,
          result.recordedSenderCount,
          result.ratesHz[index],
          'Hz',
        ] as const);
        const rateExtent = distributionCompilerExtrema(result.ratesHz);
        if (rateExtent === null) throw new Error('population-rate bins unexpectedly empty');
        const populationWindow = rec(data.window) ?? {};
        const compileContext = distributionCompilerContext(
          context(tableRows.length, derivedFacts),
          skillId,
          {
            populationLabel: String(parameters.populationLabel ?? parameters.populationId),
            windowStart: distributionCompilerNumber(num(populationWindow.start)!),
            windowStop: distributionCompilerNumber(num(populationWindow.stop)!),
            timeUnit: String(populationWindow.unit),
            binCount: distributionCompilerNumber(result.counts.length),
            eventCount: distributionCompilerNumber(result.sourceEventCount),
            recordedSenderCount: distributionCompilerNumber(result.recordedSenderCount),
            normalization,
            rateMin: distributionCompilerNumber(rateExtent.min),
            rateMax: distributionCompilerNumber(rateExtent.max),
          },
        );
        return done(
          withContractTable(compileStepFigure(
            compileContext,
            resolvedBins.spec.edges.slice(0, -1),
            resolvedBins.spec.edges.slice(1),
            result.ratesHz,
            `time (${unitLabel(resolvedBins.unit)})`,
            'rate (Hz)',
            skillId,
            'bins',
          ), compileContext, skillId, tableRows),
          [operation],
          derivedFacts,
        );
      } catch (error) {
        if (error instanceof DistributionDerivationError) return failDistribution(error);
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
      const recordedSenderIds = strings(data.recordedSenderIds);
      const declaredRecordedSenderCount = num(data.recordedSenderCount);
      const recordedSenderCount = recordedSenderIds.length;
      if (declaredRecordedSenderCount !== recordedSenderCount) {
        return fail(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          `recordedSenderCount ${String(declaredRecordedSenderCount)} does not equal the complete recordedSenderIds cardinality ${recordedSenderCount}.`,
          '/data/recordedSenderCount',
        );
      }
      const sourceEventCount = num(data.sourceEventCount);
      const exactCountTotal = counts.reduce((total, count) => total + BigInt(count), 0n);
      if (sourceEventCount === undefined || exactCountTotal !== BigInt(sourceEventCount)) {
        return fail(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          `sum(counts) is ${exactCountTotal}, not sourceEventCount ${String(sourceEventCount)}.`,
          '/data/sourceEventCount',
        );
      }
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
          sourceEventCount,
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
      const tableRows = ratesHz.map((rate, index) => [
        edges[index],
        edges[index + 1],
        binWidths[index],
        counts[index],
        recordedSenderCount,
        rate,
        'Hz',
      ] as const);
      const rateExtent = distributionCompilerExtrema(ratesHz);
      if (rateExtent === null) throw new Error('population-rate bins unexpectedly empty');
      const populationWindow = rec(data.window) ?? {};
      const compileContext = distributionCompilerContext(
        context(tableRows.length, derivedFacts),
        skillId,
        {
          populationLabel: String(parameters.populationLabel ?? parameters.populationId),
          windowStart: distributionCompilerNumber(num(populationWindow.start)!),
          windowStop: distributionCompilerNumber(num(populationWindow.stop)!),
          timeUnit: String(populationWindow.unit),
          binCount: distributionCompilerNumber(counts.length),
          eventCount: distributionCompilerNumber(sourceEventCount),
          recordedSenderCount: distributionCompilerNumber(recordedSenderCount),
          normalization,
          rateMin: distributionCompilerNumber(rateExtent.min),
          rateMax: distributionCompilerNumber(rateExtent.max),
        },
      );
      return done(
        withContractTable(compileStepFigure(
          compileContext,
          edges.slice(0, -1),
          edges.slice(1),
          ratesHz,
          `time (${unitLabel(timeUnit)})`,
          'rate (Hz)',
          skillId,
          'bins',
        ), compileContext, skillId, tableRows),
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
              outputAuthority: traceOutputAuthority(series, 'series_paths', 'samples', 'uncertainty'),
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
            outputAuthority: traceOutputAuthority(series, 'series_paths', 'samples', 'uncertainty'),
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
      uncertaintySeriesShown: allEntries.filter((entry) =>
        traceSeriesHasCompleteDrawableUncertainty(entry)).length,
      uncertaintySeriesTotal: allEntries.length,
    };
    const analogSummaryFacts: Readonly<Record<string, string>> = {
      seriesCount: String(allPrepared.length),
      windowStart: traceCompilerSummaryNumber(window.start),
      windowStop: traceCompilerSummaryNumber(window.stop),
      timeUnit: window.unit,
      layoutMode: layout,
      quantitySummary: traceCompilerJoinUnique(allEntries.map((entry) => {
        const sourceIndex = Number(entry.tableMetadata?.sourceIndex ?? 0);
        const raw = rec(rawSeries[sourceIndex]) ?? {};
        return `${String(rec(raw.values)?.kind ?? 'unknown')} (${entry.series.valueUnit})`;
      })),
      sampleCount: String(rowsTotal),
      missingCount: String(allPrepared.reduce(
        (sum, trace) => sum + trace.observations.filter((observation) => observation.value === null).length,
        0,
      )),
      excludedCount: String(allPrepared.reduce(
        (sum, trace) => sum + trace.excludedBelow + trace.excludedAbove,
        0,
      )),
      duplicateTimePolicy: traceCompilerDuplicateStatement(parameters, allPrepared),
      unitConversionStatement: traceCompilerUnitConversionStatement(allPrepared),
      uncertaintyStatement: traceCompilerUncertaintyStatement(
        allPrepared.map(() => analogUncertainty),
      ),
      compactionStatement: traceCompilerNoCompactionStatement(),
    };
    const analogCompileContext = traceCompilerContext(
      context(rowsTotal, derivedFacts),
      skillId,
      analogSummaryFacts,
    );
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
      analogCompileContext,
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
          outputAuthority: traceOutputAuthority(prepared, 'series_paths', 'samples', 'uncertainty'),
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
    const shownUncertaintyCount = allEntries.filter((entry) =>
      traceSeriesHasCompleteDrawableUncertainty(entry)).length;
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
    const multisignalSummaryFacts: Readonly<Record<string, string>> = {
      seriesCount: String(allPrepared.length),
      panelCount: String(panels.length),
      windowStart: traceCompilerSummaryNumber(window.start),
      windowStop: traceCompilerSummaryNumber(window.stop),
      timeUnit: window.unit,
      windowBoundary: window.finalEdgeInclusive ? '[start,stop]' : '[start,stop)',
      layout: String(parameters.layout),
      timeAlignment: String(structuredCell(data.timeAlignment) ?? 'unknown'),
      panelSummary: panels.map((panel) => {
        const sourceIndex = declaredPanels.findIndex((candidate, candidateIndex) => {
          const declaration = rec(candidate) ?? {};
          return String(declaration.panelId ?? `panel-${candidateIndex + 1}`) === panel.id;
        });
        const declaration = sourceIndex >= 0 ? rec(declaredPanels[sourceIndex]) ?? {} : {};
        return `${panel.id}: ${panel.series.length} series, unit ${normalization ? '1' : String(declaration.unit ?? '1')}, scale ${String(declaration.scale ?? 'linear')}`;
      }).join('; '),
      seriesSummary: allEntries.map((entry) => {
        const sourceIndex = Number(entry.tableMetadata?.sourceIndex ?? 0);
        const raw = rec(rawSeries[sourceIndex]) ?? {};
        const values = rec(raw.values) ?? {};
        return `${entry.series.id}: ${String(raw.variableId ?? 'unknown')} (${String(values.kind ?? 'unknown')}, ${entry.series.valueUnit})`;
      }).join('; '),
      observationKindStatement: `Observation kinds: ${traceCompilerJoinUnique(
        allPrepared.map((trace) => trace.observationKind),
      )}.`,
      originStatement: `Origins: ${traceCompilerJoinUnique(allEntries.map((entry) => {
        const sourceIndex = Number(entry.tableMetadata?.sourceIndex ?? 0);
        return traceCompilerOriginText(rec(rawSeries[sourceIndex]) ?? {});
      }))}.`,
      sampleCount: String(rowsTotal),
      missingCount: String(allPrepared.reduce(
        (sum, trace) => sum + trace.observations.filter((observation) => observation.value === null).length,
        0,
      )),
      duplicateTimePolicy: traceCompilerDuplicateStatement(parameters, allPrepared),
      normalizationStatement: normalization
        ? `Normalization: ${normalization.method} using ${traceCompilerSummaryNumber(normalization.statisticsWindow.start)} to ${traceCompilerSummaryNumber(normalization.statisticsWindow.stop)} ${normalization.statisticsWindow.unit}.`
        : 'No normalization was applied.',
      uncertaintyStatement: traceCompilerUncertaintyStatement(declaredUncertainties),
      unitConversionStatement: traceCompilerUnitConversionStatement(allPrepared),
      compactionStatement: traceCompilerNoCompactionStatement(),
    };
    const multisignalCompileContext = traceCompilerContext(
      context(rowsTotal, derivedFacts),
      skillId,
      multisignalSummaryFacts,
    );
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
      multisignalCompileContext,
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
            structuredCell(entry.series.normalization),
            traceCell(observation.sourceOrdinals),
          ];
        },
      },
      skillId,
    ), operations, derivedFacts);
  }

  // ---- compartment trace --------------------------------------------------
  if (skillId === 'neuro.compartment_trace') {
    let window: TraceWindow | undefined;
    try {
      window = traceWindowFrom(rec(data.window));
    } catch (error) {
      return { errors: [tracePreparationError(error, skillId, '/data/window')] };
    }
    const rawSeries = arr(data.series) ?? [];
    if (!window || rawSeries.length === 0) return { pending: rendererId };
    const firstValues = rec(rec(rawSeries[0])?.values) ?? {};
    const targetValueUnit = String(firstValues.unit);
    const declaredUncertainty = rec(parameters.uncertainty);
    if (
      declaredUncertainty?.kind !== undefined &&
      declaredUncertainty.kind !== 'none' &&
      rawSeries.length !== 1
    ) {
      return fail(
        'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
        'science',
        'compartment-trace uncertainty is declared once for the whole figure in contract 1.0 and is therefore unambiguous only when exactly one source series is present.',
        '/parameters/uncertainty',
      );
    }
    if (parameters.layout === 'heatmap' && declaredUncertainty?.kind !== undefined && declaredUncertainty.kind !== 'none') {
      return fail(
        'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
        'science',
        'a heatmap cell has one colour channel and cannot simultaneously encode a declared interval without a registered uncertainty mark; choose a trace layout or uncertainty:none.',
        '/parameters/uncertainty',
      );
    }

    const compartmentIds = strings(data.compartmentIds);
    const labels = strings(data.compartmentLabels);
    const compartmentIndex = new Map(compartmentIds.map((id, index) => [id, index]));
    const entries: PreparedCompartmentEntry[] = [];
    const operations: DerivationOperation[] = [];
    try {
      for (let seriesIndex = 0; seriesIndex < rawSeries.length; seriesIndex++) {
        const raw = rec(rawSeries[seriesIndex]) ?? {};
        const time = rec(raw.time) ?? {};
        const values = rec(raw.values) ?? {};
        const sourceValues = traceValues(values);
        const uncertaintyError = traceUncertaintyValidationError(
          declaredUncertainty,
          String(values.unit),
          sourceValues,
          skillId,
          '/parameters/uncertainty',
        );
        if (uncertaintyError) return { errors: [uncertaintyError] };
        const mismatch = traceUncertaintyLengthMismatch(declaredUncertainty, sourceValues.length);
        if (mismatch) {
          return fail(
            'SEMANTIC_LENGTH_MISMATCH',
            'semantic',
            `compartment uncertainty.${mismatch.key} has ${mismatch.observed} entries for ${sourceValues.length} samples.`,
            `/parameters/uncertainty/${mismatch.key}`,
          );
        }
        const compartmentId = String(raw.compartmentId);
        const signalId = String(raw.signalId);
        const prepared = prepareTrace({
          id: `compartment-source-${String(seriesIndex)}`,
          label: `${labels[compartmentIndex.get(compartmentId) ?? -1] ?? compartmentId}: ${String(raw.signalLabel ?? signalId)}`,
          observationKind: 'point_sample',
          times: numbers(time.values),
          timeUnit: String(time.unit),
          values: sourceValues,
          valueUnit: String(values.unit),
        }, window, parameters, targetValueUnit);
        const uncertaintyArrays = traceUncertaintyArrays(declaredUncertainty, prepared);
        entries.push({
          raw,
          prepared,
          compartmentIndex: compartmentIndex.get(compartmentId) ?? seriesIndex,
          seriesIndex,
          ...uncertaintyArrays,
        });
      }
    } catch (error) {
      return { errors: [tracePreparationError(error, skillId, '/data/series')] };
    }
    let preparationBatch: DerivationOperation;
    try {
      preparationBatch = tracePreparationBatchOperation(
        'compartment',
        {
          skillId,
          dataContext: { ...data, series: null },
          parameters,
          analysisWindow: window,
          targetValueUnit,
        },
        entries.map((entry): TracePreparationBatchEntryInput => ({
          sourceIndex: entry.seriesIndex,
          seriesIdentity: {
            kind: 'compartment_series',
            compartmentId: String(entry.raw.compartmentId),
            signalId: String(entry.raw.signalId),
          },
          role: 'source_series',
          inputPayload: entry.raw,
          views: [{
            kind: 'display',
            prepared: entry.prepared,
            window,
            uncertaintyLower: entry.uncertaintyLower,
            uncertaintyUpper: entry.uncertaintyUpper,
          }],
          transforms: compartmentPreparationBatchTransforms(
            entry,
            declaredUncertainty,
          ),
          initialStatePainted: false,
          initialStateConsumedByDerivedAggregate: false,
        })),
      );
      operations.push(preparationBatch);
    } catch (error) {
      return { errors: [tracePreparationError(error, skillId, '/data/series')] };
    }

    let derivedAggregate: DerivedCompartmentAggregate | undefined;
    const aggregate = rec(parameters.compartmentAggregate);
    if (aggregate) {
      try {
        derivedAggregate = deriveCompartmentAggregate(aggregate, entries, window);
        operations.push(chainAggregateToPreparationBatch(
          derivedAggregate.operation,
          preparationBatch,
        ));
      } catch (error) {
        return { errors: [tracePreparationError(
          error,
          skillId,
          '/parameters/compartmentAggregate',
        )] };
      }
    }

    const asPanelEntry = (entry: PreparedCompartmentEntry, styleIndex = entry.seriesIndex): TracePanelSpec['series'][number] => ({
      series: entry.prepared,
      styleIndex,
      outputAuthority: traceOutputAuthority(entry.prepared, 'series_paths', 'samples', 'uncertainty'),
      uncertaintyLower: entry.uncertaintyLower,
      uncertaintyUpper: entry.uncertaintyUpper,
      uncertainty: entry.uncertainty,
    });
    const valueKind = String(firstValues.kind);
    const yLabel = `${valueKind.replaceAll('_', ' ')} (${unitLabel(targetValueUnit)})`;
    const layout = String(parameters.layout);
    let plan: RenderPlanV1;
    const tableRows = compartmentTraceTableRows(data, entries);
    const recordedCompartmentIds = new Set(entries.map((entry) => String(entry.raw.compartmentId)));
    const expectedCompartmentRows = entries.reduce(
      (sum, entry) => sum + entry.prepared.outputCount,
      0,
    ) + compartmentIds.filter((id) => !recordedCompartmentIds.has(id)).length;
    if (tableRows.length !== expectedCompartmentRows) {
      return fail(
        'INTERNAL_INVARIANT_VIOLATED',
        'internal',
        `compartment table materialized ${tableRows.length} rows for ${expectedCompartmentRows} accepted sample/unrecorded-compartment carriers.`,
        '/data',
      );
    }
    const derivedFacts: Partial<DisclosureFacts> = {
      ...traceDerivedFacts(entries.map((entry) => entry.prepared), traceDuplicateOptions(parameters).aggregateMethod, entries.map(() => declaredUncertainty)),
      nodeUniverseComplete: data.compartmentUniverseComplete === true,
      uncertaintyKind: declaredUncertainty?.kind && declaredUncertainty.kind !== 'none' ? 'provided' : 'none',
      uncertaintySeriesDeclared: declaredUncertainty?.kind && declaredUncertainty.kind !== 'none' ? 1 : 0,
      uncertaintySeriesShown: [
        ...entries.map((entry) => asPanelEntry(entry)),
        ...(derivedAggregate ? [derivedAggregate.entry] : []),
      ].filter((entry) => traceSeriesHasCompleteDrawableUncertainty(entry)).length,
      uncertaintySeriesTotal: entries.length + (derivedAggregate ? 1 : 0),
      ...(declaredUncertainty?.kind === 'none' && typeof declaredUncertainty.reason === 'string'
        ? { uncertaintyReason: declaredUncertainty.reason }
        : declaredUncertainty === undefined
          ? { uncertaintyReason: 'not_provided' }
        : {}),
    };
    const compartmentTraces = entries.map((entry) => entry.prepared);
    const compartmentFiniteValues = compartmentTraces.flatMap((trace) => trace.values)
      .filter((value): value is number => value !== null);
    const recordedCompartmentCount = recordedCompartmentIds.size;
    const compartmentSummaryFacts: Readonly<Record<string, string>> = {
      cellLabel: String(data.cellLabel ?? data.cellId),
      signalLabel: traceCompilerJoinUnique(rawSeries.map((candidate) => {
        const raw = rec(candidate) ?? {};
        return String(raw.signalLabel ?? raw.signalId);
      })),
      quantityKind: traceCompilerJoinUnique(rawSeries.map((candidate) =>
        String(rec(rec(candidate)?.values)?.kind))),
      unit: targetValueUnit,
      compartmentCount: String(compartmentIds.length),
      windowStart: traceCompilerSummaryNumber(window.start),
      windowStop: traceCompilerSummaryNumber(window.stop),
      timeUnit: window.unit,
      layoutMode: layout,
      scaleStatement: layout === 'heatmap'
        ? 'one global colour domain over all accepted cells'
        : layout === 'small_multiples'
          ? `${String(parameters.yScale)} y domains`
          : 'one shared y domain for the declared overlay selection',
      compartmentOrderBasis: String(data.compartmentOrderBasis),
      recordedCompartmentCount: String(recordedCompartmentCount),
      notRecordedCount: String(compartmentIds.length - recordedCompartmentCount),
      sampleCount: String(compartmentTraces.reduce(
        (sum, trace) => sum + trace.observations.length,
        0,
      )),
      missingSampleCount: String(compartmentTraces.reduce(
        (sum, trace) => sum + trace.observations.filter((observation) => observation.value === null).length,
        0,
      )),
      valueMin: compartmentFiniteValues.length > 0
        ? traceCompilerSummaryNumber(traceCompilerMinimum(compartmentFiniteValues))
        : 'not available',
      valueMax: compartmentFiniteValues.length > 0
        ? traceCompilerSummaryNumber(traceCompilerMaximum(compartmentFiniteValues))
        : 'not available',
      duplicateTimeStatement: `Duplicate timestamps: ${traceCompilerDuplicateStatement(parameters, compartmentTraces)}.`,
      aggregateStatement: aggregate
        ? `Aggregate: ${String(aggregate.method)} over ${strings(aggregate.compartmentIds).length} explicitly selected compartments with ${String(aggregate.weighting)} weighting.`
        : 'No compartment aggregate was requested.',
      uncertaintyStatement: traceCompilerUncertaintyStatement(
        compartmentTraces.map(() => declaredUncertainty),
      ),
      universeStatement: data.compartmentUniverseComplete === true
        ? 'The declared compartment universe is complete.'
        : 'The declared compartments are an incomplete subset of the cell.',
      compactionStatement: traceCompilerNoCompactionStatement(),
    };
    const compileContext = traceCompilerContext(
      context(tableRows.length, derivedFacts),
      skillId,
      compartmentSummaryFacts,
    );
    if (layout === 'heatmap') {
      const signalIds = new Set(entries.map((entry) => String(entry.raw.signalId)));
      if (signalIds.size !== 1) {
        return fail(
          'RENDER_SERIES_LIMIT_EXCEEDED',
          'render',
          `a heatmap has one global colour quantity, but ${signalIds.size} signal identities were supplied.`,
          '/data/series',
        );
      }
      const rowEntries = compartmentIds.map((id, index) => {
        const matches = entries.filter((entry) => String(entry.raw.compartmentId) === id);
        if (matches.length > 1) {
          throw new Error(`compartment ${id} has more than one ${[...signalIds][0]} series`);
        }
        return {
          id,
          label: labels[index] ?? id,
          times: matches[0]?.prepared.times ?? [],
          values: matches[0]?.prepared.values ?? [],
          ...(matches[0]
            ? {
              outputAuthority: {
                classId: 'heatmap_cells',
                provenance: matches[0].prepared.observations.map((observation) => ({
                  seriesId: matches[0]!.prepared.id,
                  sourceOrdinals: [...observation.sourceOrdinals],
                  atomKind: 'heatmap_cell',
                })),
              },
            }
            : {}),
        };
      });
      if (derivedAggregate) {
        rowEntries.push({
          id: derivedAggregate.entry.series.id,
          label: derivedAggregate.entry.series.label,
          times: derivedAggregate.entry.series.times,
          values: derivedAggregate.entry.series.values,
          outputAuthority: {
            classId: 'aggregate',
            provenance: derivedAggregate.entry.series.observations.map((observation) => ({
              seriesId: derivedAggregate!.entry.series.id,
              sourceOrdinals: [...observation.sourceOrdinals],
              atomKind: 'aggregate_heatmap_cell',
            })),
          },
        });
      }
      const colorScale = rec(parameters.colorScale) ?? {};
      plan = compileCompartmentHeatmapFigure(
        compileContext,
        rowEntries,
        [window.start, window.stop],
        `time (${unitLabel(window.unit)})`,
        yLabel,
        {
          family: colorScale.family === 'diverging' ? 'diverging' : 'sequential',
          ...(typeof colorScale.center === 'number' ? { center: colorScale.center } : {}),
        },
        skillId,
      );
    } else {
      const panels: TracePanelSpec[] = [];
      if (layout === 'small_multiples') {
        for (let index = 0; index < compartmentIds.length; index++) {
          const id = compartmentIds[index];
          const panelEntries = entries
            .filter((entry) => String(entry.raw.compartmentId) === id)
            .map((entry, entryIndex) => asPanelEntry(entry, entryIndex));
          if (panelEntries.length > CATEGORICAL_SERIES_STYLES.length) {
            return fail(
              'RENDER_SERIES_LIMIT_EXCEEDED',
              'render',
              `compartment ${id} has ${panelEntries.length} overlaid signals but only ${CATEGORICAL_SERIES_STYLES.length} stable style tuples exist.`,
              '/data/series',
            );
          }
          const panelLabel = panelEntries.length === 1
            ? `${labels[index] ?? id}: ${panelEntries[0].series.label.split(': ').slice(1).join(': ')}`
            : labels[index] ?? id;
          panels.push({
            id,
            label: panelLabel,
            yLabel,
            series: panelEntries.length === 1 && panelEntries[0].uncertainty === undefined
              ? [{ ...panelEntries[0], includeInLegend: false }]
              : panelEntries,
          });
        }
        if (derivedAggregate) {
          panels.push({
            id: derivedAggregate.entry.series.id,
            label: derivedAggregate.entry.series.label,
            yLabel,
            series: [{ ...derivedAggregate.entry, includeInLegend: false }],
          });
        }
      } else {
        const selected = new Set(strings(parameters.overlayCompartmentIds));
        const selectedEntries = entries.filter((entry) => selected.has(String(entry.raw.compartmentId)));
        const drawnCount = selectedEntries.length + (derivedAggregate ? 1 : 0);
        if (drawnCount > CATEGORICAL_SERIES_STYLES.length) {
          return fail(
            'RENDER_SERIES_LIMIT_EXCEEDED',
            'render',
            `${drawnCount} overlay series exceed the ${CATEGORICAL_SERIES_STYLES.length} registered distinguishable style tuples.`,
            '/parameters/overlayCompartmentIds',
          );
        }
        panels.push({
          id: 'overlay',
          label: `${String(data.cellLabel ?? data.cellId)} — declared compartment selection`,
          yLabel,
          series: [
            ...selectedEntries.map((entry, index) => asPanelEntry(entry, index)),
            ...(derivedAggregate ? [{ ...derivedAggregate.entry, styleIndex: selectedEntries.length }] : []),
          ],
        });
      }
      plan = compileTraceFigure(
        compileContext,
        panels,
        {
          xLabel: `time (${unitLabel(window.unit)})`,
          xDomain: [window.start, window.stop],
          sharedXAxis: true,
          sharedYDomain: layout === 'small_multiples' && parameters.yScale === 'shared',
          showSamplePoints: false,
          groupSeriesMarks: true,
          summaryStatements: [
            `Compartment order is caller-declared as ${String(data.compartmentOrderBasis)} and is never inferred.`,
            `${compartmentIds.length} compartments declared; ${new Set(entries.map((entry) => String(entry.raw.compartmentId))).size} recorded.`,
            ...(layout === 'small_multiples'
              ? [`Small-multiple value domains are ${String(parameters.yScale)}.`]
              : ['Only the explicitly selected compartments are overlaid.']),
          ],
        },
        skillId,
      );
    }
    return done(
      withContractTable(plan, compileContext, skillId, tableRows),
      operations,
      derivedFacts,
    );
  }

  // ---- synaptic weight trace ---------------------------------------------
  if (skillId === 'network.synaptic_weight_trace') {
    let window: TraceWindow | undefined;
    try {
      window = traceWindowFrom(rec(data.window));
    } catch (error) {
      return { errors: [tracePreparationError(error, skillId, '/data/window')] };
    }
    if (!window) return { pending: rendererId };
    const display = String(parameters.display);
    const dataObservation = rec(data.observation) ?? {};
    const refuseSaturatedWeightTable = (
      preflight: SaturatedWeightTableCarrierPreflight,
      instancePath: string,
    ): CompileOutcome => ({
      errors: [makeError({
        code: 'RESOURCE_COMPACTION_UNAVAILABLE',
        stage: 'budget',
        instancePath,
        skillId,
        message: `the complete synaptic-weight carrier table requires more than ${returnedTableRows} rows. Cortexel saturated the canonical carrier preflight at ${preflight.saturatedRowCount} (a lower-bound sentinel, not an exact count) and refused before allocating table cells or render geometry.`,
        limit: {
          name: 'returnedTableRows',
          limit: returnedTableRows,
          observed: preflight.saturatedRowCount,
        },
      })],
    });

    const prepareMember = (
      raw: Record<string, unknown>,
      observation: Record<string, unknown>,
      targetValueUnit: string,
      instancePath: string,
      hasRecordedInterval: boolean,
    ): PreparedWeightMember | CortexelError => {
      const time = rec(raw.time) ?? {};
      const values = rec(raw.values) ?? {};
      const sourceValues = traceValues(values);
      const uncertainty = rec(raw.uncertainty);
      const uncertaintyError = traceUncertaintyValidationError(
        uncertainty,
        String(values.unit),
        sourceValues,
        skillId,
        `${instancePath}/uncertainty`,
      );
      if (uncertaintyError) return uncertaintyError;
      const mismatch = traceUncertaintyLengthMismatch(uncertainty, sourceValues.length);
      if (mismatch) {
        return makeError({
          code: 'SEMANTIC_LENGTH_MISMATCH',
          stage: 'semantic',
          instancePath: `${instancePath}/uncertainty/${mismatch.key}`,
          skillId,
          message: `uncertainty.${mismatch.key} has ${mismatch.observed} entries for ${sourceValues.length} weight observations.`,
        });
      }
      const interval = hasRecordedInterval ? rec(raw.recordedInterval) ?? {} : rec(data.window) ?? {};
      const intervalUnit = String(interval.unit);
      const intervalStart = intervalUnit === window!.unit
        ? num(interval.start)!
        : convert(num(interval.start)!, intervalUnit, window!.unit);
      const intervalStop = intervalUnit === window!.unit
        ? num(interval.stop)!
        : convert(num(interval.stop)!, intervalUnit, window!.unit);
      const recordedStart = Math.max(window!.start, intervalStart);
      const recordedStop = Math.min(window!.stop, intervalStop);
      if (!(recordedStop > recordedStart)) {
        return makeError({
          code: 'SCIENCE_WINDOW_INVALID',
          stage: 'science',
          instancePath: `${instancePath}/recordedInterval`,
          skillId,
          message: 'the recorded interval does not overlap the requested analysis window.',
        });
      }
      const intervalFinalEdgeInclusive = typeof interval.boundary === 'string' &&
        interval.boundary.endsWith(']');
      const recordedFinalEdgeInclusive =
        (recordedStop !== window!.stop || window!.finalEdgeInclusive) &&
        (recordedStop !== intervalStop || intervalFinalEdgeInclusive);
      const memberWindow: TraceWindow = {
        start: recordedStart,
        stop: recordedStop,
        unit: window!.unit,
        finalEdgeInclusive: recordedFinalEdgeInclusive,
      };
      const observationKind: TraceObservationKind = observation.kind === 'event_updated'
        ? 'piecewise_constant'
        : 'point_sample';
      const prepared = prepareTrace({
        id: String(raw.edgeId ?? raw.groupId),
        label: String(raw.label ?? raw.groupLabel ?? raw.edgeId ?? raw.groupId),
        observationKind,
        times: numbers(time.values),
        timeUnit: String(time.unit),
        values: sourceValues,
        valueUnit: String(values.unit),
      }, memberWindow, parameters, targetValueUnit);
      const statePrepared = prepareTrace({
        id: String(raw.edgeId ?? raw.groupId),
        label: String(raw.label ?? raw.groupLabel ?? raw.edgeId ?? raw.groupId),
        observationKind,
        times: numbers(time.values),
        timeUnit: String(time.unit),
        values: sourceValues,
        valueUnit: String(values.unit),
      }, {
        start: intervalStart,
        stop: intervalStop,
        unit: window!.unit,
        finalEdgeInclusive: intervalFinalEdgeInclusive,
      }, parameters, targetValueUnit);
      const uncertaintyArrays = traceUncertaintyArrays(uncertainty, prepared);
      const stateUncertaintyArrays = traceUncertaintyArrays(uncertainty, statePrepared);
      const initialQuantity = rec(rec(raw.initialWeight)?.quantity);
      const initialValue = initialQuantity && typeof initialQuantity.value === 'number'
        ? (String(initialQuantity.unit) === targetValueUnit
          ? initialQuantity.value
          : convert(initialQuantity.value, String(initialQuantity.unit), targetValueUnit))
        : undefined;
      const member: PreparedWeightMember = {
        raw,
        prepared,
        statePrepared,
        ...uncertaintyArrays,
        stateUncertaintyLower: stateUncertaintyArrays.uncertaintyLower,
        stateUncertaintyUpper: stateUncertaintyArrays.uncertaintyUpper,
        recordedStart,
        recordedStop,
        recordedFinalEdgeInclusive,
        stateStart: intervalStart,
        stateStop: intervalStop,
        initialStateTime: intervalStart,
        ...(initialValue !== undefined ? { initialValue } : {}),
      };
      if (
        observation.kind === 'interpolated_trajectory' &&
        interpolatedTrajectoryNeedsExcludedKnot(member)
      ) {
        return makeError({
          code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          stage: 'science',
          instancePath: `${instancePath}/time/values`,
          skillId,
          message: 'the accepted reconstruction would depend on an excluded boundary knot; revision 1 refuses rather than synthesize an un-audited clipped interpolation point.',
        });
      }
      return member;
    };

    const referenceLines = (
      members: readonly PreparedWeightMember[],
      targetValueUnit: string,
    ): NonNullable<TracePanelSpec['referenceLines']> => {
      if (parameters.showReferenceLines !== true) return [];
      const lines: NonNullable<TracePanelSpec['referenceLines']>[number][] = [];
      const addQuantity = (
        member: PreparedWeightMember,
        idSuffix: string,
        quantity: Record<string, unknown> | undefined,
        label: string,
      ): void => {
        if (!quantity || typeof quantity.value !== 'number' || typeof quantity.unit !== 'string') return;
        const value = quantity.unit === targetValueUnit
          ? quantity.value
          : convert(quantity.value, quantity.unit, targetValueUnit);
        lines.push({
          id: `${member.prepared.id}-${idSuffix}`,
          value,
          label,
          color: '#6b7280',
          dash: idSuffix === 'initial' ? '2 2' : '6 3',
          authority: {
            tag: 'data_carrier',
            classId: 'references',
            provenance: {
              seriesId: member.prepared.id,
              atomKind: 'reference_rule',
              reference: idSuffix,
            },
          },
        });
      };
      for (const member of members) {
        const initial = rec(member.raw.initialWeight);
        addQuantity(
          member,
          'initial',
          rec(initial?.quantity),
          `${member.prepared.label}: declared initial weight (${String(initial?.origin ?? 'unknown origin')})`,
        );
        const bounds = rec(member.raw.bounds);
        addQuantity(
          member,
          'lower',
          rec(bounds?.lower),
          `${member.prepared.label}: declared ${String(bounds?.boundKind ?? '')} lower bound (${String(bounds?.origin ?? 'unknown origin')})`,
        );
        addQuantity(
          member,
          'upper',
          rec(bounds?.upper),
          `${member.prepared.label}: declared ${String(bounds?.boundKind ?? '')} upper bound (${String(bounds?.origin ?? 'unknown origin')})`,
        );
      }
      return lines;
    };

    const summaryFacts = (
      identifiedMembers: readonly PreparedWeightMember[],
      sourceMembers: readonly PreparedWeightMember[],
      reconstructionMembers: readonly PreparedWeightMember[],
      displayedMembers: readonly PreparedWeightMember[],
      modelMembers: readonly PreparedWeightMember[],
      aggregateMember: PreparedWeightMember | undefined,
      carrierCounts: Readonly<WeightCarrierCounts>,
      sourceReadingCount: number,
      missingSourceReadingCount: number,
      referenceMembers: readonly PreparedWeightMember[],
    ): Readonly<Record<string, string>> => {
      const traces = displayedMembers.map((member) => member.prepared);
      const uncertainties = displayedMembers.map((member) => rec(member.raw.uncertainty));
      const models = modelMembers.flatMap((member) => {
        const modelSet = (arr(member.raw.synapseModels) ?? [])
          .filter((model): model is string => typeof model === 'string');
        return modelSet.length > 0
          ? modelSet
          : typeof member.raw.synapseModel === 'string' ? [member.raw.synapseModel] : [];
      });
      const observation = data.mode === 'preaggregated'
        ? rec(rec(data.aggregate)?.observation) ?? {}
        : dataObservation;
      const memberCounts = data.mode === 'preaggregated'
        ? numbers(rec(data.aggregate)?.memberCounts)
        : [];
      const maximumConcurrentMembers = memberCounts.length === 0
        ? 0
        : Math.max(0, traceCompilerMaximum(memberCounts));
      const membership = rec(data.membership) ?? {};
      const comparability = rec(parameters.weightComparability) ?? {};
      const weightUnit = traces[0]?.valueUnit ?? 'unknown';
      const modelSet = [...new Set(models)];
      const comparabilityClaim = canonicalize({
        mode: String(comparability.mode),
        models: modelSet,
      });
      const referencesShown = parameters.showReferenceLines === true
        ? referenceMembers.reduce((count, member) => {
          const initial = rec(member.raw.initialWeight) ?? {};
          const bounds = rec(member.raw.bounds) ?? {};
          return count +
            (typeof rec(initial.quantity)?.value === 'number' ? 1 : 0) +
            (typeof rec(bounds.lower)?.value === 'number' ? 1 : 0) +
            (typeof rec(bounds.upper)?.value === 'number' ? 1 : 0);
        }, 0)
        : 0;
      const excludedSourceReadingCount = sourceMembers.reduce(
        (sum, member) => sum + member.prepared.excludedBelow + member.prepared.excludedAbove,
        0,
      );
      const excludedReconstructionPointCount = reconstructionMembers.reduce(
        (sum, member) => sum + member.prepared.excludedBelow + member.prepared.excludedAbove,
        0,
      );
      const reconstructionPointCount = reconstructionMembers.reduce(
        (sum, member) => sum + member.prepared.inputCount,
        0,
      );
      const missingReconstructionPointCount = reconstructionMembers.reduce(
        (sum, member) => sum + member.prepared.missingCount,
        0,
      );
      const retainedReconstructionRowCount = reconstructionMembers.reduce(
        (sum, member) => sum + member.prepared.outputCount,
        0,
      );
      return {
        synapseCardinalityStatement: data.mode === 'preaggregated'
          ? `Unique synapse cardinality was not supplied; maximum concurrent memberCount is ${maximumConcurrentMembers}.`
          : `${identifiedMembers.length} identified synapse${identifiedMembers.length === 1 ? '' : 's'}.`,
        synapseModels: traceCompilerJoinUnique(modelSet),
        weightUnit,
        weightDimensionStatement: dimensionOf(weightUnit) === 'simulator_defined'
          ? `simulator-defined; exact comparability claim ${comparabilityClaim}`
          : `registered ${String(dimensionOf(weightUnit) ?? 'unknown')} dimension; exact comparability claim ${comparabilityClaim}`,
        windowStart: traceCompilerSummaryNumber(window.start),
        windowStop: traceCompilerSummaryNumber(window.stop),
        timeUnit: window.unit,
        observationStatement: observation.kind === 'interpolated_trajectory'
          ? `interpolated_trajectory (method=${String(observation.method)}; interpolant=${String(observation.interpolant)}; reconstructedBy=${String(observation.reconstructedBy)})`
          : `${String(observation.kind)}${typeof observation.updateSemantics === 'string' ? ` (${observation.updateSemantics})` : ''}`,
        duplicateTimeStatement: `Duplicate timestamps: ${traceCompilerDuplicateStatement(
          parameters,
          (data.mode === 'preaggregated'
            ? displayedMembers
            : [...sourceMembers, ...reconstructionMembers])
            .map((candidate) => candidate.prepared),
        )}.`,
        retainedSourceRowCount: String(carrierCounts.source_observation.total),
        sourceReadingCount: String(sourceReadingCount),
        missingCount: String(missingSourceReadingCount),
        excludedCount: String(excludedSourceReadingCount),
        reconstructionPointCount: String(reconstructionPointCount),
        retainedReconstructionRowCount: String(retainedReconstructionRowCount),
        missingReconstructionPointCount: String(missingReconstructionPointCount),
        excludedReconstructionPointCount: String(excludedReconstructionPointCount),
        carrierStatement: weightCarrierStatement(
          carrierCounts,
          sourceReadingCount,
          missingSourceReadingCount,
          excludedSourceReadingCount,
          reconstructionPointCount,
          retainedReconstructionRowCount,
          missingReconstructionPointCount,
          excludedReconstructionPointCount,
        ),
        displayMode: String(parameters.display),
        aggregateStatement: parameters.display === 'aggregate_declared'
          ? `The caller declared a ${String(rec(data.aggregate)?.method)} aggregate using interval method ${String(rec(data.aggregate)?.intervalMethod)}; Cortexel did not receive member observations and cannot re-derive either claim.`
          : aggregateMember
            ? `Cortexel-derived ${String(rec(parameters.aggregate)?.method)} over the declared membership; denominator is contributingCount and zero contributors yield missing.`
            : 'No aggregate was requested.',
        membershipStatement: Object.keys(membership).length > 0
          ? `${String(membership.groupId)} with ${(arr(membership.members) ?? []).length} identified members represented by declared half-open membership intervals.`
          : data.mode === 'preaggregated'
            ? 'Member identities were not supplied with the caller-declared aggregate.'
            : 'No aggregate membership was declared.',
        referenceStatement: parameters.showReferenceLines === true
          ? `${referencesShown} declared initial-weight/bound reference lines are shown; they never clamp observations.`
          : 'Declared initial weights and bounds are not drawn as reference lines.',
        scopeStatement: compilerNetworkScopeSummaryCell(data.scope),
        uncertaintyStatement: traceCompilerWeightUncertaintyStatement(uncertainties),
        compactionStatement: traceCompilerNoCompactionStatement(),
      };
    };

    /**
     * Weight uncertainty is declared on each member/aggregate, not at the common
     * parameters or data root inspected by `disclosureFacts`. Bind the compiler's
     * mandatory-disclosure inputs to the exact member/aggregate fact views used for
     * the complete table and carrier derivation; an absent declaration remains
     * distinct from a declared `none` reason such as `single_trial`.
     */
    const weightDisclosureFacts = (
      factMembers: readonly PreparedWeightMember[],
      exactPresentationEntries?: readonly TracePanelSpec['series'][number][],
    ): Partial<DisclosureFacts> => {
      const uncertainties = factMembers.map((member) => rec(member.raw.uncertainty));
      const declared = uncertainties.filter(
        (uncertainty) => uncertainty?.kind !== undefined && uncertainty.kind !== 'none',
      ).length;
      const reasons = uncertainties
        .map((uncertainty) => uncertainty?.reason)
        .filter((reason): reason is string => typeof reason === 'string');
      const presentationEntries = exactPresentationEntries ?? factMembers.map(
        (member, index): TracePanelSpec['series'][number] => ({
          series: member.prepared,
          styleIndex: index,
          uncertaintyLower: member.uncertaintyLower,
          uncertaintyUpper: member.uncertaintyUpper,
          uncertainty: member.uncertainty,
        }),
      );
      return {
        ...traceDerivedFacts(
          factMembers.map((member) => member.prepared),
          traceDuplicateOptions(parameters).aggregateMethod,
          uncertainties,
        ),
        uncertaintyKind: declared > 0 ? 'provided' : 'none',
        uncertaintySeriesDeclared: declared,
        uncertaintySeriesShown: presentationEntries.filter(
          (entry) => traceSeriesHasCompleteDrawableUncertainty(
            entry,
            parameters.showObservationMarkers === true,
          ),
        ).length,
        uncertaintySeriesTotal: factMembers.length,
        ...(declared === 0
          ? { uncertaintyReason: reasons.length > 0 ? traceCompilerJoinUnique(reasons) : 'not_provided' }
          : {}),
      };
    };

    try {
      if (data.mode === 'preaggregated') {
        const rawAggregate = rec(data.aggregate) ?? {};
        const values = rec(rawAggregate.values) ?? {};
        const aggregateObservation = rec(rawAggregate.observation) ?? {};
        const preparedOrError = prepareMember(
          rawAggregate,
          aggregateObservation,
          String(values.unit),
          '/data/aggregate',
          false,
        );
        if ('code' in preparedOrError) return { errors: [preparedOrError] };
        const member = preparedOrError;
        const eventEvidence = aggregateObservation.kind === 'event_updated'
          ? eventUpdatedMaterialization(
            member,
            aggregateObservation.updateSemantics === 'value_before_update'
              ? 'value_before_update'
              : 'value_after_update',
            undefined,
            false,
          )
          : undefined;
        const memberCounts = numbers(rawAggregate.memberCounts);
        const contributingCounts = numbers(rawAggregate.contributingCounts);
        const tableEntries: readonly WeightTableSeries[] = [{
          member,
          observation: aggregateObservation,
          carrierKind: 'declared_aggregate_point',
          counts: { memberCounts, contributingCounts },
          stateWitnesses: eventEvidence?.witnesses,
          initialStatePainted: eventEvidence?.initialStatePainted,
        }];
        const rowPreflight = preflightWeightTableCarriers(tableEntries, returnedTableRows);
        if (rowPreflight.tag === 'saturated_over_budget') {
          return refuseSaturatedWeightTable(rowPreflight, '/data/aggregate');
        }
        const eventMaterialization = aggregateObservation.kind === 'event_updated'
          ? eventUpdatedMaterialization(
            member,
            aggregateObservation.updateSemantics === 'value_before_update'
              ? 'value_before_update'
              : 'value_after_update',
          )
          : undefined;
        const renderRuns = bindWeightRenderRunOrdinals(
          eventMaterialization?.runs ??
          interpolatedTrajectoryRenderRuns(
            member,
            aggregateObservation.kind === 'interpolated_trajectory'
              ? 'reconstruction_vertex'
              : 'observation_vertex',
          ),
        );
        const panelEntry: TracePanelSpec['series'][number] = {
          series: member.prepared,
          styleIndex: 0,
          outputAuthority: weightTraceOutputAuthority(
            member.prepared,
            renderRuns,
            'series_paths',
            aggregateObservation.kind === 'interpolated_trajectory' ? 'reconstruction' : 'observations',
            'uncertainty',
          ),
          ...member,
          renderRuns,
          ...(aggregateObservation.kind === 'interpolated_trajectory'
            ? {
              authorityAtomKinds: {
                pathVertex: 'reconstruction_vertex',
                sampleMarker: 'reconstruction_marker',
                isolatedMarker: 'isolated_reconstruction_marker',
              },
            }
            : {}),
        };
        if (!weightPanelSeriesHasPaintableCarrier(
          panelEntry,
          parameters.showObservationMarkers === true,
        )) {
          return fail(
            'RENDER_NO_DATA',
            'render',
            'the declared aggregate has no finite retained point, reconstructed vertex, event-held state, carry-in state, or painted initial state in the requested window.',
            '/data/aggregate',
          );
        }
        const table = synapticWeightTraceTableRows(
          data,
          parameters,
          rowPreflight,
          new Map([[tableEntries[0], renderRuns]]),
        );
        const tableRows = table.rows;
        if (tableRows.length !== rowPreflight.exactRowCount) {
          return fail(
            'INTERNAL_INVARIANT_VIOLATED',
            'internal',
            `declared aggregate table materialized ${tableRows.length} rows after an exact ${rowPreflight.exactRowCount}-row canonical carrier preflight.`,
            '/data/aggregate',
          );
        }
        const facts = weightDisclosureFacts([member], [panelEntry]);
        const compileContext = traceCompilerContext(
          context(tableRows.length, facts),
          skillId,
          summaryFacts(
            [],
            [],
            aggregateObservation.kind === 'interpolated_trajectory' ? [member] : [],
            [member],
            [member],
            member,
            table.carrierCounts,
            table.sourceReadingCount,
            table.missingSourceReadingCount,
            [member],
          ),
        );
        const plan = compileTraceFigure(
          compileContext,
          [{
            id: 'aggregate',
            label: member.prepared.label,
            yLabel: `synaptic weight (${unitLabel(member.prepared.valueUnit)})`,
            series: [panelEntry],
            referenceLines: referenceLines([member], member.prepared.valueUnit),
          }],
          {
            xLabel: `time (${unitLabel(window.unit)})`,
            xDomain: [window.start, window.stop],
            showSamplePoints: parameters.showObservationMarkers === true,
            groupSeriesMarks: true,
            summaryStatements: ['This is a caller-declared aggregate; Cortexel did not receive its member observations and cannot re-derive it.'],
          },
          skillId,
        );
        return done(
          withContractTable(plan, compileContext, skillId, tableRows),
          [tracePreparationBatchOperation(
            'weight',
            {
              skillId,
              dataContext: { ...data, aggregate: null },
              parameters,
              analysisWindow: window,
              observation: aggregateObservation,
              targetValueUnit: member.prepared.valueUnit,
            },
            [{
              sourceIndex: 0,
              seriesIdentity: {
                kind: 'declared_weight_aggregate',
                groupId: String(rawAggregate.groupId),
              },
              role: 'declared_aggregate',
              inputPayload: rawAggregate,
              views: [{
                kind: 'display',
                prepared: member.prepared,
                window,
                uncertaintyLower: member.uncertaintyLower,
                uncertaintyUpper: member.uncertaintyUpper,
              }],
              transforms: declaredWeightPreparationBatchTransforms(member),
              ...(eventMaterialization
                ? {
                  materialization: {
                    full: eventMaterialization,
                    displayed: eventMaterialization,
                  },
                }
                : {}),
              initialStatePainted: false,
              initialStateConsumedByDerivedAggregate: false,
            }],
          )],
          facts,
        );
      }

      const rawSeries = arr(data.series) ?? [];
      if (rawSeries.length === 0) return { pending: rendererId };
      const derivedDisplay = display === 'aggregate_derived' || display === 'aggregate_derived_with_members';
      const membershipIds = new Set(
        (arr(rec(data.membership)?.members) ?? []).map((candidate) =>
          String(rec(candidate)?.edgeId)),
      );
      const targetRawSeries = derivedDisplay
        ? rawSeries.find((candidate) => membershipIds.has(String(rec(candidate)?.edgeId)))
        : rawSeries[0];
      const targetValueUnit = String(rec(rec(targetRawSeries)?.values)?.unit);
      const members: PreparedWeightMember[] = [];
      const operations: DerivationOperation[] = [];
      for (let index = 0; index < rawSeries.length; index++) {
        const raw = rec(rawSeries[index]) ?? {};
        const preparedOrError = prepareMember(
          raw,
          dataObservation,
          targetValueUnit,
          `/data/series/${index}`,
          true,
        );
        if ('code' in preparedOrError) return { errors: [preparedOrError] };
        if (
          (display === 'aggregate_derived' || display === 'aggregate_derived_with_members') &&
          rec(raw.uncertainty)?.kind !== 'none'
        ) {
          return fail(
            'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
            'science',
            'derived weight aggregates require uncertainty:none on every member; across-trial edge uncertainty cannot be propagated across synapses without an error model.',
            `/data/series/${index}/uncertainty`,
          );
        }
        members.push(preparedOrError);
      }
      if (display === 'individual' && members.length > CATEGORICAL_SERIES_STYLES.length) {
        return fail(
          'RENDER_SERIES_LIMIT_EXCEEDED',
          'render',
          `${members.length} individual synapses exceed the ${CATEGORICAL_SERIES_STYLES.length} registered distinguishable style tuples.`,
          '/data/series',
        );
      }
      const sourceRowPreflight = preflightPreparedWeightObservationRows(
        members,
        returnedTableRows,
      );
      if (sourceRowPreflight.tag === 'saturated_over_budget') {
        // Prepared member observations are a strict subset of every complete weight
        // carrier table. This conclusive lower bound avoids aggregate/state work when
        // the source carriers already cannot fit.
        return refuseSaturatedWeightTable(sourceRowPreflight, '/data/series');
      }
      const aggregateGridPreflight = derivedDisplay
        ? prepareWeightAggregateGrid(
          data,
          parameters,
          window,
          members,
          returnedTableRows - sourceRowPreflight.exactRowCount,
        )
        : undefined;
      if (aggregateGridPreflight?.tag === 'saturated_over_budget') {
        return refuseSaturatedWeightTable(
          {
            tag: 'saturated_over_budget',
            saturatedRowCount:
              sourceRowPreflight.exactRowCount +
              aggregateGridPreflight.saturatedEvaluationCount,
          },
          '/parameters/aggregate/evaluation',
        );
      }
      const preparedAggregateGrid = aggregateGridPreflight?.grid;
      const memberEventEvidence = new Map<string, EventUpdatedMaterialization>();
      if (dataObservation.kind === 'event_updated') {
        const semantics = dataObservation.updateSemantics === 'value_before_update'
          ? 'value_before_update'
          : 'value_after_update';
        for (const member of members) {
          memberEventEvidence.set(
            member.prepared.id,
            eventUpdatedMaterialization(member, semantics, undefined, false),
          );
        }
      }
      const makeMemberEntry = (
        member: PreparedWeightMember,
        styleIndex: number,
        renderRuns: readonly TraceRenderRun[],
        markerObservationIndexes?: readonly number[],
      ): TracePanelSpec['series'][number] => {
        return {
          series: member.prepared,
          styleIndex,
          outputAuthority: weightTraceOutputAuthority(
            member.prepared,
            renderRuns,
            'series_paths',
            dataObservation.kind === 'interpolated_trajectory' ? 'reconstruction' : 'observations',
            'uncertainty',
          ),
          uncertaintyLower: member.uncertaintyLower,
          uncertaintyUpper: member.uncertaintyUpper,
          uncertainty: member.uncertainty,
          renderRuns,
          ...(markerObservationIndexes ? { markerObservationIndexes } : {}),
          ...(dataObservation.kind === 'interpolated_trajectory'
            ? {
              authorityAtomKinds: {
                pathVertex: 'reconstruction_vertex',
                sampleMarker: 'reconstruction_marker',
                isolatedMarker: 'isolated_reconstruction_marker',
              },
            }
            : {}),
        };
      };

      let derived: DerivedWeightAggregate | undefined;
      let aggregateMember: PreparedWeightMember | undefined;
      if (display === 'aggregate_derived' || display === 'aggregate_derived_with_members') {
        if (!preparedAggregateGrid) {
          return fail(
            'INTERNAL_INVARIANT_VIOLATED',
            'internal',
            'derived weight display reached aggregate evaluation without an exact bounded grid preflight.',
            '/parameters/aggregate/evaluation',
          );
        }
        derived = deriveWeightAggregate(
          data,
          parameters,
          window,
          preparedAggregateGrid,
        );
        aggregateMember = {
          raw: derived.record,
          prepared: derived.prepared,
          statePrepared: derived.prepared,
          uncertaintyLower: derived.uncertaintyLower,
          uncertaintyUpper: derived.uncertaintyUpper,
          stateUncertaintyLower: derived.uncertaintyLower,
          stateUncertaintyUpper: derived.uncertaintyUpper,
          uncertainty: derived.uncertainty,
          recordedStart: window.start,
          recordedStop: window.stop,
          recordedFinalEdgeInclusive: window.finalEdgeInclusive,
          stateStart: window.start,
          stateStop: window.stop,
          initialStateTime: window.start,
        };
      }
      const selectedMembers = derived?.selectedMembers ?? [];
      const selectedIds = new Set(selectedMembers.map((member) => member.prepared.id));
      const paintedMemberIds = display === 'individual'
        ? new Set(members.map((member) => member.prepared.id))
        : display === 'aggregate_derived_with_members'
          ? selectedIds
          : new Set<string>();
      const paintedEventEvidence = new Map<string, EventUpdatedMaterialization>();
      if (dataObservation.kind === 'event_updated') {
        const semantics = dataObservation.updateSemantics === 'value_before_update'
          ? 'value_before_update'
          : 'value_after_update';
        for (const member of members) {
          if (!paintedMemberIds.has(member.prepared.id)) continue;
          paintedEventEvidence.set(
            member.prepared.id,
            display === 'aggregate_derived_with_members'
              ? eventUpdatedMaterialization(
                member,
                semantics,
                derived?.membershipById.get(member.prepared.id),
                false,
              )
              : memberEventEvidence.get(member.prepared.id)!,
          );
        }
      }
      const sourceCarrierKind: WeightTableSeries['carrierKind'] =
        dataObservation.kind === 'interpolated_trajectory'
          ? 'caller_reconstruction_point'
          : 'source_observation';
      const tableEntries: readonly WeightTableSeries[] = [
        ...members.map((member): WeightTableSeries => ({
          member,
          observation: dataObservation,
          carrierKind: sourceCarrierKind,
            stateWitnesses: mergeWeightStateWitnesses(
              paintedMemberIds.has(member.prepared.id)
              ? paintedEventEvidence.get(member.prepared.id)?.witnesses
              : undefined,
            derived?.stateWitnessesByMember.get(member.prepared.id),
          ),
          initialStatePainted:
            paintedMemberIds.has(member.prepared.id) &&
            paintedEventEvidence.get(member.prepared.id)?.initialStatePainted === true,
          initialStateConsumedByDerivedAggregate:
            derived?.initialStateContributorIds.has(member.prepared.id) === true,
          ...(derived?.membershipById.get(member.prepared.id)
            ? { membershipLifetimes: derived.membershipById.get(member.prepared.id)! }
            : {}),
        })),
        ...(aggregateMember
          ? [{
            member: aggregateMember,
            observation: dataObservation,
            carrierKind: 'derived_aggregate_evaluation' as const,
            counts: {
              memberCounts: [...derived!.memberCounts],
              contributingCounts: [...derived!.contributingCounts],
            },
          }]
          : []),
      ];
      const rowPreflight = preflightWeightTableCarriers(tableEntries, returnedTableRows);
      if (rowPreflight.tag === 'saturated_over_budget') {
        return refuseSaturatedWeightTable(rowPreflight, '/data');
      }
      // The exact six-carrier table has passed before any render-run arrays are
      // allocated. Build every explicit run once, bind its ordinal into authority,
      // and hand the same object to both table topology and the trace compiler.
      const fullEventMaterializations = new Map<string, EventUpdatedMaterialization>();
      const paintedEventMaterializations = new Map<string, EventUpdatedMaterialization>();
      if (dataObservation.kind === 'event_updated') {
        const semantics = dataObservation.updateSemantics === 'value_before_update'
          ? 'value_before_update'
          : 'value_after_update';
        for (const member of members) {
          const full = eventUpdatedMaterialization(member, semantics);
          fullEventMaterializations.set(member.prepared.id, full);
          if (!paintedMemberIds.has(member.prepared.id)) continue;
          paintedEventMaterializations.set(
            member.prepared.id,
            display === 'aggregate_derived_with_members'
              ? eventUpdatedMaterialization(
                member,
                semantics,
                derived?.membershipById.get(member.prepared.id),
              )
              : full,
          );
        }
      }
      const globalAvailabilityTransitions = derived
        ? weightAvailabilityTransitions(selectedMembers, derived.membershipById)
        : [];
      const memberRenderRuns = new Map<string, readonly TraceRenderRun[]>();
      const memberMarkerIndexes = new Map<string, readonly number[]>();
      for (const member of members) {
        if (!paintedMemberIds.has(member.prepared.id)) continue;
        let rawRuns: readonly TraceRenderRun[];
        if (dataObservation.kind === 'event_updated') {
          const materialization = paintedEventMaterializations.get(member.prepared.id)!;
          rawRuns = materialization.runs;
          if (display === 'aggregate_derived_with_members') {
            memberMarkerIndexes.set(
              member.prepared.id,
              markerIndexesForWeightRuns(member, materialization.runs),
            );
          }
        } else if (
          dataObservation.kind === 'point_sample' &&
          display === 'aggregate_derived_with_members'
        ) {
          const materialization = pointSampleMembershipRenderRuns(
            member,
            derived?.membershipById.get(member.prepared.id) ?? [],
            globalAvailabilityTransitions,
          );
          rawRuns = materialization.runs;
          memberMarkerIndexes.set(
            member.prepared.id,
            materialization.markerObservationIndexes,
          );
        } else {
          rawRuns = interpolatedTrajectoryRenderRuns(
            member,
            dataObservation.kind === 'interpolated_trajectory'
              ? 'reconstruction_vertex'
              : 'observation_vertex',
          );
        }
        memberRenderRuns.set(
          member.prepared.id,
          bindWeightRenderRunOrdinals(rawRuns),
        );
      }
      let aggregateRenderRuns: readonly TraceRenderRun[] | undefined;
      if (aggregateMember && derived) {
        const rawRuns = dataObservation.kind === 'event_updated'
          ? eventUpdatedMaterialization(
            aggregateMember,
            dataObservation.updateSemantics === 'value_before_update'
              ? 'value_before_update'
              : 'value_after_update',
          ).runs
          : pointSampleAggregateRenderRuns(
            derived.prepared,
            derived.uncertaintyLower,
            derived.uncertaintyUpper,
            unionWeightAvailability(selectedMembers, derived.membershipById),
            globalAvailabilityTransitions,
          );
        aggregateRenderRuns = bindWeightRenderRunOrdinals(rawRuns);
      }
      const renderedRunsByEntry = new Map<
        WeightTableSeries,
        readonly TraceRenderRun[]
      >();
      for (let index = 0; index < members.length; index++) {
        const runs = memberRenderRuns.get(members[index].prepared.id);
        if (runs) renderedRunsByEntry.set(tableEntries[index], runs);
      }
      if (aggregateRenderRuns && tableEntries.length > members.length) {
        renderedRunsByEntry.set(tableEntries[tableEntries.length - 1], aggregateRenderRuns);
      }
      const table = synapticWeightTraceTableRows(
        data,
        parameters,
        rowPreflight,
        renderedRunsByEntry,
      );
      const tableRows = table.rows;
      if (tableRows.length !== rowPreflight.exactRowCount) {
        return fail(
          'INTERNAL_INVARIANT_VIOLATED',
          'internal',
          `weight table materialized ${tableRows.length} rows after an exact ${rowPreflight.exactRowCount}-row canonical carrier preflight.`,
          '/data',
        );
      }
      const panelSeries: TracePanelSpec['series'] = display === 'individual'
        ? members.map((member, index) => makeMemberEntry(
          member,
          index,
          memberRenderRuns.get(member.prepared.id)!,
          memberMarkerIndexes.get(member.prepared.id),
        ))
        : [
          ...(display === 'aggregate_derived_with_members'
            ? selectedMembers.map((member, index): TracePanelSpec['series'][number] => ({
              ...makeMemberEntry(
                member,
                index,
                memberRenderRuns.get(member.prepared.id)!,
                memberMarkerIndexes.get(member.prepared.id),
              ),
              style: { color: '#9ca3af', dash: 'none', marker: 'circle' },
              includeInLegend: false,
            }))
            : []),
          ...(aggregateMember
            ? [{
              ...makeMemberEntry(
                aggregateMember,
                0,
                aggregateRenderRuns!,
              ),
            }]
            : []),
        ];
      if (!panelSeries.some((entry) => weightPanelSeriesHasPaintableCarrier(
        entry,
        parameters.showObservationMarkers === true,
      ))) {
        return fail(
          'RENDER_NO_DATA',
          'render',
          'the selected display has no finite retained point, reconstructed vertex, event-held state, carry-in state, or painted initial state in the requested window.',
          '/data',
        );
      }
      const preparationBatch = tracePreparationBatchOperation(
        'weight',
        {
          skillId,
          dataContext: { ...data, series: null },
          parameters,
          analysisWindow: window,
          observation: dataObservation,
          targetValueUnit,
        },
        members.map((member, sourceIndex): TracePreparationBatchEntryInput => {
          const fullMaterialization = fullEventMaterializations.get(member.prepared.id);
          const displayedMaterialization =
            paintedEventMaterializations.get(member.prepared.id);
          const stateWitnesses = mergeWeightStateWitnesses(
            paintedMemberIds.has(member.prepared.id)
              ? displayedMaterialization?.witnesses
              : undefined,
            derived?.stateWitnessesByMember.get(member.prepared.id),
          );
          const recordedInterval = rec(member.raw.recordedInterval) ?? {};
          return {
            sourceIndex,
            seriesIdentity: {
              kind: 'weight_member',
              edgeId: String(member.raw.edgeId),
            },
            role: 'source_series',
            inputPayload: member.raw,
            views: [
              {
                kind: 'display',
                prepared: member.prepared,
                window: {
                  start: member.recordedStart,
                  stop: member.recordedStop,
                  unit: window.unit,
                  finalEdgeInclusive: member.recordedFinalEdgeInclusive,
                },
                uncertaintyLower: member.uncertaintyLower,
                uncertaintyUpper: member.uncertaintyUpper,
              },
              {
                kind: 'state',
                prepared: member.statePrepared,
                window: {
                  start: member.stateStart,
                  stop: member.stateStop,
                  unit: window.unit,
                  finalEdgeInclusive:
                    typeof recordedInterval.boundary === 'string' &&
                    recordedInterval.boundary.endsWith(']'),
                },
                uncertaintyLower: member.stateUncertaintyLower,
                uncertaintyUpper: member.stateUncertaintyUpper,
              },
            ],
            transforms: weightPreparationBatchTransforms(
              member,
              parameters.showReferenceLines === true &&
                paintedMemberIds.has(member.prepared.id),
            ),
            contextWitnesses: stateWitnesses,
            ...(dataObservation.kind === 'event_updated' && fullMaterialization
              ? {
                materialization: {
                  full: fullMaterialization,
                  displayed: displayedMaterialization ?? null,
                },
              }
              : {}),
            initialStatePainted:
              displayedMaterialization?.initialStatePainted === true,
            initialStateConsumedByDerivedAggregate:
              derived?.initialStateContributorIds.has(member.prepared.id) === true,
          };
        }),
      );
      operations.push(preparationBatch);
      if (derived) {
        operations.push(chainAggregateToPreparationBatch(
          derived.operation,
          preparationBatch,
        ));
      }
      const displayedMembers = display === 'individual'
        ? members
        : [
          ...(display === 'aggregate_derived_with_members' ? selectedMembers : []),
          ...(aggregateMember ? [aggregateMember] : []),
        ];
      const referenceMembers = display === 'individual'
        ? members
        : display === 'aggregate_derived_with_members'
          ? selectedMembers
          : [];
      const modelMembers = display === 'individual' ? members : selectedMembers;
      const sourceMembers = sourceCarrierKind === 'source_observation' ? members : [];
      const reconstructionMembers = sourceCarrierKind === 'caller_reconstruction_point' ? members : [];
      const facts = weightDisclosureFacts(displayedMembers, panelSeries);
      const compileContext = traceCompilerContext(
        context(tableRows.length, facts),
        skillId,
        summaryFacts(
          display === 'individual' ? members : selectedMembers,
          sourceMembers,
          reconstructionMembers,
          displayedMembers,
          modelMembers,
          aggregateMember,
          table.carrierCounts,
          table.sourceReadingCount,
          table.missingSourceReadingCount,
          referenceMembers,
        ),
      );
      const plan = compileTraceFigure(
        compileContext,
        [{
          id: 'weights',
          label: display === 'individual'
            ? 'Identified synapses'
            : String(rec(data.membership)?.groupLabel ?? rec(data.membership)?.groupId ?? 'Declared aggregate'),
          yLabel: `synaptic weight (${unitLabel(targetValueUnit)})`,
          series: panelSeries,
          referenceLines: referenceLines(referenceMembers, targetValueUnit),
        }],
        {
          xLabel: `time (${unitLabel(window.unit)})`,
          xDomain: [window.start, window.stop],
          showSamplePoints: parameters.showObservationMarkers === true,
          groupSeriesMarks: true,
          summaryStatements: [
            `Observation semantics: ${String(dataObservation.kind)}${typeof dataObservation.updateSemantics === 'string' ? `, ${dataObservation.updateSemantics}` : ''}.`,
            ...(derived
              ? [`Aggregate denominator is contributingCount at each evaluation time; zero contributors yield a missing value.`]
              : []),
          ],
        },
        skillId,
      );
      return done(
        withContractTable(plan, compileContext, skillId, tableRows),
        operations,
        facts,
      );
    } catch (error) {
      return { errors: [tracePreparationError(error, skillId, '/data')] };
    }
  }

  // ---- spike raster --------------------------------------------------------
  if (skillId === 'neuro.spike_raster') {
    let partition: ExactSpikeWindowPartition;
    try {
      partition = exactSpikeWindowPartition(data);
    } catch (error) {
      return fail(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        'science',
        error instanceof Error
          ? error.message
          : 'the event window cannot be represented on the spike-raster display axis.',
        '/data/window',
      );
    }
    const {
      times,
      timeUnit,
      windowUnit,
      nestOriginRelative,
      lowerTerms,
      upperTerms,
      boundary,
      displayStart,
      displayStop,
      inWindow,
      excludedBelow,
      excludedAbove,
      excludedCount,
      acceptedCount,
    } = partition;
    const senders = strings(data.eventSenderIds);
    const recorded = strings(data.recordedSenderIds);
    const eventTrials = arr(data.eventTrialIds) === undefined
      ? undefined
      : strings(data.eventTrialIds);
    const trialIds = strings(data.trialIds);
    const suppliedEventIds = arr(data.eventIds) === undefined
      ? undefined
      : strings(data.eventIds);
    const senderPopulationIds = strings(data.senderPopulationIds);
    const outOfWindowPolicy = parameters.outOfWindowPolicy as string;
    if (excludedCount > 0 && outOfWindowPolicy !== 'exclude_and_disclose') {
      return fail(
        'SCIENCE_EVENT_OUT_OF_WINDOW',
        'science',
        `${excludedCount} events are outside the declared ${boundary} window; a validated reject-policy request must not reach rendering.`,
        '/data/eventTimes/values',
      );
    }

    const populationBySender = new Map<string, string>();
    for (let index = 0; index < recorded.length; index++) {
      if (senderPopulationIds[index] !== undefined) {
        populationBySender.set(recorded[index], senderPopulationIds[index]);
      }
    }

    let orderedSenders = [...recorded];
    if (parameters.rowOrder === 'canonical_sender_id') {
      orderedSenders.sort(compareUnicodeCodePoints);
    } else if (parameters.rowOrder === 'grouped_by_population' && senderPopulationIds.length > 0) {
      // Preserve first-seen population-block order and within-block sender order in
      // one pass. Filtering the whole sender universe once per distinct population
      // makes an all-distinct declaration quadratic and turns a valid display choice
      // into a denial-of-service surface.
      const sendersByPopulation = new Map<string, string[]>();
      for (const senderId of recorded) {
        const populationId = populationBySender.get(senderId);
        if (populationId === undefined) continue;
        const populationSenders = sendersByPopulation.get(populationId);
        if (populationSenders === undefined) {
          sendersByPopulation.set(populationId, [senderId]);
        } else {
          populationSenders.push(senderId);
        }
      }
      orderedSenders = [];
      for (const populationSenders of sendersByPopulation.values()) {
        for (const senderId of populationSenders) orderedSenders.push(senderId);
      }
    }

    const rowKey = (senderId: string, trialId: string | null): string =>
      JSON.stringify([senderId, trialId]);
    const rows = orderedSenders.flatMap((senderId) => {
      const trials: readonly (string | null)[] = eventTrials ? trialIds : [null];
      return trials.map((trialId) => ({
        key: rowKey(senderId, trialId),
        label: trialId === null ? senderId : `${senderId} / ${trialId}`,
      }));
    });
    const rowIndexByKey = new Map(rows.map((row, index) => [row.key, index]));
    const rowLabelByKey = new Map(rows.map((row) => [row.key, row.label]));

    const events = times.map((time, sourceOrdinal) => {
      const senderId = senders[sourceOrdinal];
      const trialId = eventTrials?.[sourceOrdinal] ?? null;
      const key = rowKey(senderId, trialId);
      const rowIndex = rowIndexByKey.get(key);
      const rowLabel = rowLabelByKey.get(key);
      if (rowIndex === undefined || rowLabel === undefined) {
        throw new Error(
          `event ${sourceOrdinal} does not resolve to a row in the complete declared sender/trial universe`,
        );
      }
      return {
        sourceOrdinal,
        eventId: suppliedEventIds?.[sourceOrdinal] ?? `source-ordinal-${sourceOrdinal}`,
        time,
        timeUnit,
        senderId,
        trialId,
        populationId: populationBySender.get(senderId) ?? null,
        rowKey: key,
        rowIndex,
        rowLabel,
        inWindow: inWindow[sourceOrdinal],
      };
    });
    events.sort((left, right) =>
      left.time < right.time
        ? -1
        : left.time > right.time
          ? 1
          : left.rowIndex !== right.rowIndex
            ? left.rowIndex - right.rowIndex
            : left.sourceOrdinal - right.sourceOrdinal);

    const conversion = windowUnit !== timeUnit
      ? conversionReceipt(windowUnit, timeUnit)
      : undefined;
    const derivedFacts: Partial<DisclosureFacts> = {
      ...(excludedCount > 0 ? { excludedOutOfWindow: excludedCount } : {}),
      ...(conversion
        ? { unitConversions: [conversionDisclosureText('spike-raster window endpoints', conversion)] }
        : {}),
    };
    const operation: DerivationOperation = {
      ...derivationOperation(
        'spike_raster.partition_and_rows',
        'cortexel.spike_raster.exact_window_partition',
        {
          boundary,
          lowerEndpointTerms: lowerTerms,
          upperEndpointTerms: upperTerms,
          displayUnit: timeUnit,
          rowOrder: parameters.rowOrder,
          markStyle: parameters.markStyle ?? 'tick',
          outOfWindowPolicy,
          eventIdentityPolicy: suppliedEventIds
            ? 'caller_declared_unique_event_ids'
            : 'source_ordinal_v1',
        },
        data,
        { events, rows },
        {
          sourceEventCount: times.length,
          acceptedEventCount: acceptedCount,
          excludedOutOfWindow: excludedCount,
          excludedBelowOrAtOpenStart: excludedBelow,
          excludedAboveOrAtOpenStop: excludedAbove,
          displayStart,
          displayStop,
          displayUnit: timeUnit,
          rowCount: rows.length,
          drawnMarkCount: acceptedCount,
          stableSort: ['time', 'rowIndex', 'sourceOrdinal'],
          sourceClockMode: nestOriginRelative
            ? 'nest_3_9_or_3_10_memory_native_binary64_ms'
            : 'caller_declared_event_window',
          ...(conversion ? { windowEndpointConversion: conversion } : {}),
        },
      ),
      algorithmRevision: 2,
    };
    const axisPrefix = data.timeBase === 'trial_relative'
      ? `time relative to ${String(data.alignmentLabel)}`
      : 'time';
    const activeSenders = new Set(
      events.filter((event) => event.inWindow).map((event) => event.senderId),
    );
    const rasterContext = distributionCompilerContext(
      context(events.length, derivedFacts),
      skillId,
      {
        eventCount: distributionCompilerNumber(events.length),
        excludedCount: distributionCompilerNumber(excludedCount),
        activeSenderCount: distributionCompilerNumber(activeSenders.size),
        recordedSenderCount: distributionCompilerNumber(recorded.length),
        trialCount: distributionCompilerNumber(eventTrials ? trialIds.length : 1),
        windowStart: distributionCompilerNumber(displayStart),
        windowStop: distributionCompilerNumber(displayStop),
        timeUnit,
        windowBoundary: boundary,
        timeBase: String(data.timeBase),
        rowCount: distributionCompilerNumber(rows.length),
        rowOrder: String(parameters.rowOrder),
        senderUniverseComplete: String(data.senderUniverseComplete),
        markCount: distributionCompilerNumber(acceptedCount),
      },
    );
    return done(
      compileRasterFigure(
        rasterContext,
        events,
        rows,
        displayStart,
        displayStop,
        `${axisPrefix} (${unitLabel(timeUnit)}); ${boundary}`,
        parameters.markStyle === 'point' ? 'point' : 'tick',
        skillId,
      ),
      [operation],
      derivedFacts,
    );
  }

  // ---- correlogram ---------------------------------------------------------
  if (skillId === 'neuro.correlogram') {
    const statistic = String(parameters.statistic);
    const edgeCorrection = String(parameters.edgeCorrection);
    if (
      statistic !== 'raw_pair_count' &&
      statistic !== 'target_rate_per_reference_event'
    ) {
      return fail(
        'RENDER_UNSUPPORTED_SKILL',
        'render',
        `correlogram statistic ${statistic} is outside the closed revision-2 product.`,
        '/parameters/statistic',
      );
    }
    if (
      (statistic === 'raw_pair_count' && edgeCorrection !== 'none') ||
      (statistic === 'target_rate_per_reference_event' &&
        edgeCorrection !== 'none' &&
        edgeCorrection !== 'eligible_reference_events')
    ) {
      return fail(
        'SCIENCE_CORRELATION_DENOMINATOR_INVALID',
        'science',
        `${statistic} cannot use edge correction ${edgeCorrection}.`,
        '/parameters/edgeCorrection',
      );
    }

    try {
      const mode = String(data.mode);
      const preBinned = mode === 'prebinned_auto' || mode === 'prebinned_cross';
      const rawInputs = eventCorrelogramInputs(data, parameters);
      if (!preBinned && !rawInputs) {
        return fail(
          'RENDER_UNSUPPORTED_SKILL',
          'render',
          `correlogram data mode ${mode} is outside the four closed revision-2 modes.`,
          '/data/mode',
        );
      }

      const axis = rawInputs ?? correlogramAxis(parameters);
      const edges = [...axis.spec.edges];
      const centers = [...axis.centers];
      let pairCounts: number[];
      let kind: 'auto' | 'cross';
      let referenceEventCount: number;
      let targetEventCount: number;
      let referenceLabel: string;
      let targetLabel: string;
      let referenceRecordedSenderCount: number;
      let targetRecordedSenderCount: number;
      let window: RawCorrelogramInputs['window'];
      let pairAccounting: ReturnType<typeof deriveCorrelogramPairAccounting>;
      let zeroLagRetainedDistinctPairs: number | undefined;
      let unitConversions = [...axis.unitConversions];

      if (rawInputs) {
        const result = computeCorrelogram(
          rawInputs.ref,
          rawInputs.tgt,
          rawInputs.spec,
          rawInputs.kind,
          pairwiseOperations,
        );
        pairCounts = result.counts;
        kind = rawInputs.kind;
        referenceEventCount = rawInputs.ref.length;
        targetEventCount = kind === 'auto' ? referenceEventCount : rawInputs.tgt.length;
        referenceLabel = rawInputs.referenceLabel;
        targetLabel = rawInputs.targetLabel;
        referenceRecordedSenderCount = rawInputs.referenceRecordedSenderCount;
        targetRecordedSenderCount = rawInputs.targetRecordedSenderCount;
        window = rawInputs.window;
        pairAccounting = result.receipt.pairAccounting;
        zeroLagRetainedDistinctPairs = result.zeroLagRetainedDistinctPairs;
        unitConversions = [...rawInputs.unitConversions];
      } else {
        kind = mode === 'prebinned_auto' ? 'auto' : 'cross';
        pairCounts = numbers(data.pairCounts);
        referenceEventCount = num(data.referenceEventCount)!;
        targetEventCount = kind === 'auto'
          ? referenceEventCount
          : num(data.targetEventCount)!;
        const referenceTrain = rec(kind === 'auto' ? data.train : data.referenceTrain) ?? {};
        const targetTrain = kind === 'auto' ? referenceTrain : rec(data.targetTrain) ?? {};
        referenceLabel = String(referenceTrain.label);
        targetLabel = String(targetTrain.label);
        referenceRecordedSenderCount = strings(referenceTrain.recordedSenderIds).length;
        targetRecordedSenderCount = strings(targetTrain.recordedSenderIds).length;
        const windowRecord = rec(data.window) ?? {};
        window = {
          start: num(windowRecord.start)!,
          stop: num(windowRecord.stop)!,
          unit: String(windowRecord.unit),
          boundary: windowRecord.boundary as RawCorrelogramInputs['window']['boundary'],
        };
        const countedPairCount = pairCounts.reduce((sum, count) => sum + count, 0);
        if (!Number.isSafeInteger(countedPairCount)) {
          throw new RangeError('pre-binned correlogram counted-pair sum exceeds the exact JSON integer domain');
        }
        pairAccounting = deriveCorrelogramPairAccounting(
          referenceEventCount,
          targetEventCount,
          kind,
          countedPairCount,
        );
        const callerEdgeUnit = String(rec(data.binEdges)?.unit);
        if (callerEdgeUnit !== axis.lagUnit) {
          unitConversions.push(conversionDisclosureText(
            'pre-binned correlogram lag edges',
            conversionReceipt(callerEdgeUnit, axis.lagUnit),
          ));
        }
      }

      if (pairCounts.length !== centers.length) {
        throw new Error(
          `correlogram has ${pairCounts.length} pair counts for ${centers.length} materialized lag bins`,
        );
      }

      let eligibleReferenceEvents: (number | null)[];
      let denominators: (number | null)[];
      let values: (number | null)[];
      let valueStatuses: ('defined' | 'undefined_zero_eligible_reference_events')[];
      const valueUnit = statistic === 'raw_pair_count' ? '1' : 'Hz';
      if (statistic === 'raw_pair_count') {
        eligibleReferenceEvents = pairCounts.map(() => null);
        denominators = pairCounts.map(() => null);
        values = [...pairCounts];
        valueStatuses = pairCounts.map(() => 'defined');
      } else {
        const exactEligible = edgeCorrection === 'none'
          ? pairCounts.map(() => referenceEventCount)
          : rawInputs
            ? deriveEligibleCorrelogramReferenceCounts(
              rawInputs.referenceTimesInSourceUnit,
              rawInputs.referenceTimeUnit,
              edges,
              axis.lagUnit,
              rawInputs.window,
            )
            : numbers(data.eligibleReferenceEventCounts);
        const rateBins = deriveCorrelogramTargetRates(
          pairCounts,
          exactEligible,
          axis.binWidth,
        );
        eligibleReferenceEvents = rateBins.map((bin) => bin.eligibleReferenceEvents);
        denominators = rateBins.map((bin) => bin.denominatorSeconds);
        values = rateBins.map((bin) => bin.value);
        valueStatuses = rateBins.map((bin) => bin.status);
      }

      const undefinedRateBinCount = valueStatuses.filter(
        (status) => status === 'undefined_zero_eligible_reference_events',
      ).length;
      const observationDuration = convertDifference(
        window.start,
        window.stop,
        window.unit,
        window.unit,
      );
      const denominatorStatement = statistic === 'raw_pair_count'
        ? 'none'
        : edgeCorrection === 'none'
          ? 'reference event count multiplied by the typed bin width in seconds'
          : 'the per-bin eligible-reference count multiplied by the typed bin width in seconds; zero exposure yields null';
      const sourceAuthorityStatement = preBinned
        ? 'Source event counts and exact pair numerators were declared by the pre-binned product; duration was derived from its window'
        : 'Source event counts were derived from the explicit event arrays, and duration was derived from their shared window';
      const summaryStatements = [
        `Correlogram (${kind}): target ${targetLabel} relative to reference ${referenceLabel}. Positive lag means target follows reference. Declared senders, including silent: ${referenceRecordedSenderCount} reference and ${targetRecordedSenderCount} target.`,
        `${centers.length} centred left-closed/right-open bins of ${exactNumberText(axis.binWidthInLagUnit)} ${unitLabel(axis.lagUnit) || axis.lagUnit}, from centre ${exactNumberText(centers[0])} through ${exactNumberText(centers[centers.length - 1])}; the positive outer edge is excluded.`,
        `${statistic} (${valueUnit}); denominator: ${denominatorStatement}. ${undefinedRateBinCount} rate bins are null because their eligible-reference count is zero.`,
        `Events: ${referenceEventCount} reference and ${targetEventCount} target over ${exactNumberText(observationDuration)} ${unitLabel(window.unit) || window.unit}, boundary ${window.boundary}. ${sourceAuthorityStatement}`,
        `Exact pair accounting: ${pairAccounting.candidatePairCount} candidate = ${pairAccounting.countedPairCount} in-range + ${pairAccounting.outOfRangePairCount} out-of-range + ${pairAccounting.sameEventSelfPairCountExcluded} same-event self-pairs excluded.`,
        'Uncertainty kind none: no uncertainty interval is estimated or drawn.',
        ...(pairAccounting.countedPairCount === 0
          ? ['The all-zero pair statistic is reported without interpreting it as evidence of independence.']
          : []),
      ];

      const tableRows = pairCounts.map((pairCount, index) => contractOrderedTableRow(skillId, {
        lagBinStart: edges[index],
        lagBinCenter: centers[index],
        lagBinEnd: edges[index + 1],
        pairCount,
        eligibleReferenceEvents: eligibleReferenceEvents[index],
        denominator: denominators[index],
        value: values[index],
        valueUnit,
        valueStatus: valueStatuses[index],
        uncertaintyLower: null,
        uncertaintyUpper: null,
      }));
      const derivedFacts: Partial<DisclosureFacts> = {
        ...(preBinned ? { preBinned: true } : {}),
        ...(unitConversions.length > 0 ? { unitConversions } : {}),
        ...(undefinedRateBinCount > 0 ? { missingValueCount: undefinedRateBinCount } : {}),
      };
      const compileContext = distributionCompilerContext(
        context(tableRows.length, derivedFacts),
        skillId,
        {
          correlationKind: kind,
          targetLabel,
          referenceLabel,
          referenceRecordedSenderCount: distributionCompilerNumber(referenceRecordedSenderCount),
          targetRecordedSenderCount: distributionCompilerNumber(targetRecordedSenderCount),
          binCount: distributionCompilerNumber(pairCounts.length),
          binWidth: distributionCompilerNumber(axis.binWidthInLagUnit),
          lagUnit: axis.lagUnit,
          lagMin: distributionCompilerNumber(centers[0]),
          lagMax: distributionCompilerNumber(centers[centers.length - 1]),
          statistic,
          valueUnit,
          denominatorStatement,
          referenceEventCount: distributionCompilerNumber(referenceEventCount),
          targetEventCount: distributionCompilerNumber(targetEventCount),
          observationDuration: distributionCompilerNumber(observationDuration),
          timeUnit: window.unit,
          sourceAuthorityStatement,
          candidatePairCount: distributionCompilerNumber(pairAccounting.candidatePairCount),
          countedPairCount: distributionCompilerNumber(pairAccounting.countedPairCount),
          outOfRangePairCount: distributionCompilerNumber(pairAccounting.outOfRangePairCount),
          sameEventSelfPairCountExcluded: distributionCompilerNumber(
            pairAccounting.sameEventSelfPairCountExcluded,
          ),
          undefinedRateBinCount: distributionCompilerNumber(undefinedRateBinCount),
          uncertaintyStatement: 'No uncertainty interval is estimated or drawn.',
        },
      );
      const geometry = compileNullableCorrelogramStemFigure(
        compileContext,
        edges,
        centers,
        values,
        `lag (${unitLabel(axis.lagUnit) || axis.lagUnit})`,
        statistic === 'raw_pair_count'
          ? 'pair count'
          : 'target rate per reference event (Hz)',
        skillId,
      );
      const summarizedGeometry: RenderPlanV1 = {
        ...geometry,
        accessibility: {
          ...geometry.accessibility,
          panelSummaries: summaryStatements,
        },
      };
      const operation = derivationOperation(
        'correlogram.pair_count_and_rate',
        'cortexel.correlogram.exact_centered_pair_ladder',
        {
          mode,
          kind,
          statistic,
          edgeCorrection,
          lagConvention: 'target_time_minus_reference_time',
          binBoundary: 'left_closed_right_open',
          positiveOuterEdge: 'excluded',
          binWidth: axis.binWidth,
          lagUnit: axis.lagUnit,
        },
        data,
        {
          edges,
          centers,
          pairCounts,
          eligibleReferenceEvents,
          denominatorsSeconds: denominators,
          values,
          valueUnit,
          valueStatuses,
        },
        {
          sourceAuthority: preBinned
            ? 'prebinned_exact_pair_counts_and_declared_role_event_counts'
            : 'explicit_raw_event_arrays',
          referenceEventCount,
          targetEventCount,
          referenceRecordedSenderCount,
          targetRecordedSenderCount,
          observationDuration,
          observationDurationUnit: window.unit,
          observationWindowBoundary: window.boundary,
          undefinedRateBinCount,
          ...pairAccounting,
          ...(zeroLagRetainedDistinctPairs === undefined
            ? {}
            : { zeroLagRetainedDistinctPairs }),
        },
      );
      return done(
        withContractTable(summarizedGeometry, compileContext, skillId, tableRows),
        [operation],
        derivedFacts,
      );
    } catch (error) {
      if (error instanceof PairwiseBudgetExceededError) {
        return fail(
          'RESOURCE_PAIRWISE_EXCEEDED',
          'budget',
          `correlogram pair formation exceeded the active limit of ${error.limit}.`,
          '/data',
        );
      }
      return fail(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        'science',
        error instanceof Error ? error.message : 'correlogram derivation failed',
        '/data',
      );
    }
  }

  // ---- distributions -------------------------------------------------------
  if (rendererId === 'figure.distribution') {
    if (skillId === 'neuro.isi_distribution') {
      const resolvedBins = declaredBins(rec(parameters.bins));
      if (!resolvedBins) return { pending: rendererId };
      try {
        const window = rec(data.window) ?? {};
        const windowInput = {
          start: num(window.start)!,
          stop: num(window.stop)!,
          unit: String(window.unit),
          boundary: '[start,stop)' as const,
        };
        const bins = {
          edges: resolvedBins.spec.edges,
          unit: resolvedBins.unit,
          finalEdgeInclusive: resolvedBins.spec.finalEdgeInclusive,
        };
        const normalization = String(parameters.normalization ?? 'count') as HistogramNormalization;
        const outOfRangePolicy = String(
          parameters.outOfRangeIntervals ?? 'reject',
        ) as OutOfRangePolicy;
        const zeroIntervalPolicy = parameters.zeroIntervalPolicy === 'retain_as_zero'
          ? 'retain_as_zero' as const
          : 'reject' as const;
        const recordedSenderIds = strings(data.recordedSenderIds);
        const trialIds = arr(data.trialIds) === undefined
          ? undefined
          : strings(data.trialIds);
        let sourceUnit: string;
        let excludedOutOfWindowCount: number | null;
        const result = data.mode === 'intervals'
          ? (() => {
            const intervalRecord = rec(data.intervals) ?? {};
            sourceUnit = String(intervalRecord.unit ?? resolvedBins.unit);
            excludedOutOfWindowCount = null;
            return deriveIsiFromIntervals({
              intervals: numbers(intervalRecord.values),
              intervalSenderIds: strings(data.intervalSenderIds),
              ...(arr(data.intervalTrialIds) === undefined
                ? {}
                : { intervalTrialIds: strings(data.intervalTrialIds) }),
              trains: (arr(data.trains) ?? []).map((entry) => {
                const train = rec(entry) ?? {};
                return {
                  senderId: String(train.senderId),
                  ...(typeof train.trialId === 'string' ? { trialId: train.trialId } : {}),
                  spikeCount: num(train.spikeCount)!,
                };
              }),
              recordedSenderIds,
              ...(trialIds ? { trialIds } : {}),
              intervalUnit: sourceUnit,
              window: windowInput,
              bins,
              normalization,
              zeroIntervalPolicy,
              outOfRangePolicy,
            });
          })()
          : (() => {
            const timeRecord = rec(data.eventTimes) ?? {};
            sourceUnit = String(timeRecord.unit ?? resolvedBins.unit);
            excludedOutOfWindowCount = 0;
            return deriveIsiFromEvents({
              eventTimes: numbers(timeRecord.values),
              eventSenderIds: strings(data.eventSenderIds),
              ...(arr(data.eventTrialIds) === undefined
                ? {}
                : { eventTrialIds: strings(data.eventTrialIds) }),
              recordedSenderIds,
              ...(trialIds ? { trialIds } : {}),
              intervalUnit: sourceUnit,
              window: windowInput,
              bins,
              normalization,
              zeroIntervalPolicy,
              outOfRangePolicy,
            });
          })();
        const histogram = result.histogram.groups[0];
        if (
          parameters.xScale === 'log' &&
          (resolvedBins.spec.edges.some((edge) => !(edge > 0)) ||
            result.zeroIntervalCount > 0)
        ) {
          return fail(
            'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
            'render',
            'a logarithmic ISI axis requires strictly positive bin edges and intervals.',
            '/parameters/bins',
          );
        }
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
          { counts: histogram.counts, values: histogram.values },
          {
            formedIntervalCount: result.intervalCount,
            binnedIntervalCount: histogram.binnedObservationCount,
            underRangeCount: histogram.underRangeCount,
            overRangeCount: histogram.overRangeCount,
            trainCount: result.trainCount,
            trainsWithoutIntervalCount: result.trainsWithoutIntervalCount,
            spikeCount: result.spikeCount,
            zeroIntervalCount: result.zeroIntervalCount,
            ...(intervalConversion ? { intervalConversion } : {}),
          },
        );
        const excludedIntervalCount = histogram.underRangeCount + histogram.overRangeCount;
        const rangeMetadata = excludedIntervalCount > 0
          ? [
            { key: 'formedIntervalCount', header: 'Formed intervals', value: result.intervalCount },
            { key: 'binnedIntervalCount', header: 'Binned intervals', value: histogram.binnedObservationCount },
            { key: 'underRangeCount', header: 'Under range', value: histogram.underRangeCount },
            { key: 'overRangeCount', header: 'Over range', value: histogram.overRangeCount },
          ]
          : [];
        const rangeSummary = [
          `Exact conservation: ${result.intervalCount} formed intervals = ${histogram.binnedObservationCount} binned + ${histogram.underRangeCount} below range + ${histogram.overRangeCount} above range, across ${result.trainCount} declared trains and ${result.spikeCount} spikes.`,
        ];
        const derivedFacts: Partial<DisclosureFacts> = intervalConversion
          ? { unitConversions: [conversionDisclosureText('inter-spike intervals', intervalConversion)] }
          : {};
        const densityUnit = reciprocalUnit(resolvedBins.unit);
        const tableRows = histogram.counts.map((count, index) => [
          resolvedBins.spec.edges[index],
          resolvedBins.spec.edges[index + 1],
          sameUnitDifference(
            resolvedBins.spec.edges[index],
            resolvedBins.spec.edges[index + 1],
            resolvedBins.unit,
          ),
          resolvedBins.unit,
          count,
          normalization === 'probability' ? histogram.values[index] : null,
          normalization === 'density' ? histogram.values[index] : null,
          normalization === 'density' ? (densityUnit ?? null) : null,
          histogram.binnedObservationCount,
          result.intervalCount,
          histogram.underRangeCount,
          histogram.overRangeCount,
          result.trainCount,
          result.spikeCount,
          excludedOutOfWindowCount,
        ] as const);
        const isiWindowDuration = convertDifference(
          windowInput.start,
          windowInput.stop,
          windowInput.unit,
          windowInput.unit,
        );
        const compileContext = distributionCompilerContext(
          context(tableRows.length, derivedFacts),
          skillId,
          {
            selectionLabel: String(parameters.selectionLabel ?? parameters.selectionId),
            intervalCount: distributionCompilerNumber(result.intervalCount),
            trainCount: distributionCompilerNumber(result.trainCount),
            senderCount: distributionCompilerNumber(recordedSenderIds.length),
            trialCount: distributionCompilerNumber(trialIds ? trialIds.length : 1),
            spikeCount: distributionCompilerNumber(result.spikeCount),
            windowStart: distributionCompilerNumber(windowInput.start),
            windowStop: distributionCompilerNumber(windowInput.stop),
            timeUnit: windowInput.unit,
            trainsWithoutIntervalCount: distributionCompilerNumber(
              result.trainsWithoutIntervalCount,
            ),
            excludedOutOfWindowCount: excludedOutOfWindowCount === null
              ? 'not retained by interval input'
              : distributionCompilerNumber(excludedOutOfWindowCount),
            binCount: distributionCompilerNumber(histogram.counts.length),
            binMin: distributionCompilerNumber(resolvedBins.spec.edges[0]),
            binMax: distributionCompilerNumber(
              resolvedBins.spec.edges[resolvedBins.spec.edges.length - 1],
            ),
            intervalUnit: resolvedBins.unit,
            xScale: String(parameters.xScale ?? 'linear'),
            underRangeCount: distributionCompilerNumber(histogram.underRangeCount),
            overRangeCount: distributionCompilerNumber(histogram.overRangeCount),
            normalization,
            valueUnit: normalization === 'density' ? String(densityUnit) : '1',
            windowDuration: distributionCompilerNumber(isiWindowDuration),
            zeroIntervalStatement: result.zeroIntervalCount > 0
              ? `${result.zeroIntervalCount} exact zero intervals were retained by the declared policy.`
              : 'No exact zero interval was observed.',
          },
        );
        return done(
          withContractTable(compileBarFigure(
            compileContext,
            resolvedBins.spec.edges,
            histogram.values,
            `ISI (${unitLabel(resolvedBins.unit)})`,
            yLabel,
            skillId,
            parameters.xScale === 'log' ? 'log' : 'linear',
            {
              tableMetadata: rangeMetadata,
              summaryStatements: rangeSummary,
              outputAuthority: { classId: 'bins', groupId: 'all' },
            },
          ), compileContext, skillId, tableRows),
          [operation],
          derivedFacts,
        );
      } catch (error) {
        if (error instanceof DistributionDerivationError) return failDistribution(error);
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
      try {
        const ids = strings(rec(data.nodeUniverse)?.ids);
        const conns = rec(data.connections);
        const nodeDegrees = rec(data.nodeDegrees);
        const direction = (parameters.direction as 'in' | 'out') ?? 'in';
        const countingPolicy = (parameters.countingPolicy as 'count_edges' | 'count_unique_neighbors') ?? 'count_edges';
        const autapsePolicy = parameters.autapsePolicy === 'exclude' ? 'exclude' : 'include';
        const normalization = parameters.normalization === 'probability' ? 'probability' : 'count';
        const result = deriveDegreeDistribution({
          nodeIds: ids,
          ...(data.mode === 'node_degrees'
            ? {
              suppliedNodeIds: strings(nodeDegrees?.nodeIds),
              suppliedDegrees: numbers(nodeDegrees?.degrees),
              suppliedCountedConnectionCount: num(data.countedConnectionCount),
              suppliedCountedIncidenceCount: num(data.countedIncidenceCount),
              suppliedExcludedAutapseCount: num(data.excludedAutapseCount),
            }
            : {
              sourceIds: strings(conns?.sourceIds),
              targetIds: strings(conns?.targetIds),
            }),
          direction,
          countingPolicy,
          autapsePolicy,
          binning: { mode: 'per_integer_degree' },
          normalization,
        });
        const collapsedMultapse = countingPolicy === 'count_unique_neighbors' &&
          result.countedIncidenceCount < result.countedConnectionCount;
        const derivedFacts: Partial<DisclosureFacts> = collapsedMultapse
          ? {
            multapseAggregated: true,
            multapseAggregation: 'count_unique_neighbors',
          }
          : {};
        const edges = [
          result.degreeLow[0] - 0.5,
          ...result.degreeHigh.map((degree) => degree + 0.5),
        ];
        const tableRows = result.degreeLow.map((low, index) => [
          low,
          result.degreeHigh[index],
          result.nodeCounts[index],
          normalization === 'probability' ? result.values[index] : null,
          result.nodeIds.length,
          result.countedConnectionCount,
          result.countedIncidenceCount,
          '1',
        ] as const);
        const operation = derivationOperation(
          'degree_distribution.exact_enumeration',
          'cortexel.degree_distribution.exact_enumeration',
          { direction, countingPolicy, autapsePolicy, normalization, binning: 'per_integer_degree' },
          data,
          { degrees: result.degrees, nodeCounts: result.nodeCounts, values: result.values },
          {
            universeNodeCount: result.nodeIds.length,
            countedConnectionCount: result.countedConnectionCount,
            countedIncidenceCount: result.countedIncidenceCount,
            excludedAutapseCount: result.excludedAutapseCount,
          },
        );
        const maximumDegree = result.degreeHigh[result.degreeHigh.length - 1];
        const compileContext = distributionCompilerContext(
          context(tableRows.length, derivedFacts),
          skillId,
          {
            direction,
            selectionLabel: String(parameters.selectionLabel ?? parameters.selectionId),
            countingPolicy,
            autapsePolicy,
            excludedAutapseStatement: autapsePolicy === 'exclude'
              ? ` (${result.excludedAutapseCount} excluded)`
              : '',
            universeNodeCount: distributionCompilerNumber(result.nodeIds.length),
            scopeStatement: compilerNetworkScopeSummaryCell(data.scope),
            countedConnectionCount: distributionCompilerNumber(result.countedConnectionCount),
            countedIncidenceCount: distributionCompilerNumber(result.countedIncidenceCount),
            minDegree: '0',
            maxDegree: distributionCompilerNumber(maximumDegree),
            zeroDegreeNodeCount: distributionCompilerNumber(result.nodeCounts[0]),
            normalization,
          },
        );
        return done(
          withContractTable(compileBarFigure(
            compileContext,
            edges,
            result.values,
            `${direction}-degree`,
            normalization === 'probability' ? 'probability' : 'node count',
            skillId,
            'linear',
            {
              summaryStatements: [
                `Exact conservation: ${result.nodeIds.length} declared nodes are enumerated once; ${result.countedConnectionCount} retained connection rows produce ${result.countedIncidenceCount} counted incidences under ${countingPolicy}.`,
              ],
              outputAuthority: { classId: 'bins', groupId: 'all' },
            },
          ), compileContext, skillId, tableRows),
          [operation],
          derivedFacts,
        );
      } catch (error) {
        if (error instanceof DistributionDerivationError) return failDistribution(error);
        return fail(
          'INTERNAL_INVARIANT_VIOLATED',
          'render',
          error instanceof Error ? error.message : 'degree-distribution derivation failed',
          '/data',
        );
      }
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
        readonly zeroObservationCount: number;
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
        let suppliedCounts = arr(data.counts) ? numbers(data.counts) : undefined;
        const underRangeCount = num(data.underRangeCount) ?? num(data.excludedUnderRangeCount) ?? 0;
        const overRangeCount = num(data.overRangeCount) ?? num(data.excludedOverRangeCount) ?? 0;
        const observationCount = num(data.totalObservationCount) ?? 0;
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
          suppliedCounts = recoverHistogramCounts(
            values,
            resolvedBins.spec.edges,
            resolvedBins.unit,
            normalization,
            binnedObservationCount,
          );
        }
        const connectionCount = num(data.sourceConnectionCount) ??
          num(data.consideredConnectionCount) ?? observationCount;
        const pairCount = isDelay
          ? num(data.consideredOrderedPairCount)
          : num(data.sourceOrderedPairCount);
        const pairAggregationApplies = isDelay
          ? parameters.countingPolicy === 'per_ordered_pair'
          : parameters.observationUnit === 'node_pair';
        histogramGroups = [{
          id: 'all',
          label: String(parameters.selectionLabel ?? 'All observations'),
          values,
          ...(suppliedCounts ? { counts: suppliedCounts } : {}),
          connectionCount,
          // Pre-binned rows no longer reveal pair multiplicity, so Cortexel cannot
          // assert that any multapse was actually collapsed.
          aggregatedMultapseCount: pairAggregationApplies && pairCount !== undefined
            ? Math.max(0, connectionCount - pairCount)
            : 0,
          observationCount,
          binnedObservationCount,
          underRangeCount,
          overRangeCount,
          missingMeasurementCount: num(data.missingWeightCount) ?? 0,
          ...(!isDelay
            ? { missingObservationCount: num(data.missingObservationCount) ?? 0 }
            : { missingObservationCount: 0 }),
          zeroObservationCount: num(data.zeroWeightCount) ?? 0,
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
        const groupByModel = isDelay
          ? data.groupBy === 'synapse_model'
          : parameters.grouping === 'by_synapse_model';
        renderAsGroups = groupByModel;
        const bins = {
          edges: resolvedBins.spec.edges,
          unit: resolvedBins.unit,
          finalEdgeInclusive: resolvedBins.spec.finalEdgeInclusive,
          ...(isDelay ? { edgeToleranceUlps: 8 } : {}),
        };
        const result = isDelay
          ? deriveDelayDistribution({
            sourceIds,
            targetIds,
            delayValues: measured.map((value, ordinal) => {
              if (value === null) {
                throw new DistributionDerivationError(
                  'SEMANTIC_LENGTH_MISMATCH',
                  ['connections', 'delays', 'values', ordinal],
                  'a delay connection row is missing its measurement.',
                );
              }
              return value;
            }),
            delayUnit: sourceUnit,
            nodeUniverse: strings(rec(data.nodeUniverse)?.ids),
            ...(arr(connections.synapseModels) === undefined ? {} : { synapseModels }),
            groupBy: data.groupBy === 'synapse_model' ? 'synapse_model' : 'none',
            countingPolicy: parameters.countingPolicy === 'per_ordered_pair'
              ? 'per_ordered_pair'
              : 'per_connection',
            ...(typeof parameters.multapseAggregation === 'string'
              ? { aggregation: parameters.multapseAggregation as Exclude<PairAggregation, 'sum'> }
              : {}),
            bins,
            normalization: normalization as HistogramNormalization,
            outOfRangePolicy: String(parameters.outOfRangeDelays) as OutOfRangePolicy,
          })
          : deriveWeightDistribution({
            sourceIds,
            targetIds,
            weightValues: measured,
            weightUnit: sourceUnit,
            sourceUniverse: strings(rec(data.sourceUniverse)?.ids),
            targetUniverse: strings(rec(data.targetUniverse)?.ids),
            synapseModels,
            grouping: parameters.grouping === 'by_synapse_model'
              ? 'by_synapse_model'
              : 'none',
            observationUnit: parameters.observationUnit === 'node_pair'
              ? 'node_pair'
              : 'synapse',
            ...(typeof parameters.aggregation === 'string'
              ? { aggregation: parameters.aggregation as PairAggregation }
              : {}),
            signTreatment: parameters.signTreatment === 'magnitude'
              ? 'magnitude'
              : 'preserve',
            bins,
            normalization: normalization as HistogramNormalization,
            outOfRangePolicy: String(parameters.outOfRangeWeights) as OutOfRangePolicy,
          });
        if (
          parameters.xScale === 'log' &&
          result.minimumObservation !== null &&
          !(result.minimumObservation > 0)
        ) {
          return fail(
            'RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN',
            'render',
            'logarithmic distribution observations must be strictly positive.',
            '/parameters/xScale',
          );
        }
        measurementConversion = sourceUnit === resolvedBins.unit
          ? undefined
          : conversionReceipt(sourceUnit, resolvedBins.unit);
        histogramGroups = result.groups.map((group) => {
          const missingObservations = group.missingObservationCount;
          const aggregatedMultapseCount = isDelay && parameters.countingPolicy === 'per_connection'
            ? 0
            : Math.max(
              0,
              group.consideredConnectionCount - group.observationCount - missingObservations,
            );
          return {
            id: group.groupId,
            label: group.groupId === 'all'
              ? String(parameters.selectionLabel ?? 'All observations')
              : group.groupId,
            values: group.values,
            counts: group.counts,
            connectionCount: group.consideredConnectionCount,
            aggregatedMultapseCount,
            observationCount: group.observationCount,
            binnedObservationCount: group.binnedObservationCount,
            underRangeCount: group.underRangeCount,
            overRangeCount: group.overRangeCount,
            missingMeasurementCount: group.missingConnectionCount,
            missingObservationCount: missingObservations,
            zeroObservationCount: group.zeroObservationCount,
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
      const zeroObservationCount = histogramGroups.reduce(
        (sum, group) => sum + group.zeroObservationCount,
        0,
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
          zeroObservationCount,
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
            zeroObservationCount: group.zeroObservationCount,
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
      const reportUngroupedAccounting = !renderAsGroups;
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
          `Exact conservation: ${formedObservationCount} non-missing observations were formed from ${sourceConnectionRowCount} connection rows; ${histogramGroups.reduce((sum, group) => sum + group.binnedObservationCount, 0)} were binned + ${underflow} below range + ${overflow} above range. ${missingMeasurementCount} row measurements and ${missingObservationCount} observations were missing; ${zeroObservationCount} observations were measured zero.`,
        ]
        : [];
      const groupedAccountingSummary = renderAsGroups
        ? histogramGroups.map(
          (group) =>
            `Group ${group.id}: exact conservation gives ${group.observationCount} non-missing observations from ${group.connectionCount} connection rows; ${group.binnedObservationCount} were binned + ${group.underRangeCount} below range + ${group.overRangeCount} above range, with ${group.missingMeasurementCount} missing row measurements, ${group.missingObservationCount ?? 0} missing observations, and ${group.zeroObservationCount} measured zeros.`,
        )
        : [];
      const binnedObservationCount = histogramGroups.reduce(
        (sum, group) => sum + group.binnedObservationCount,
        0,
      );
      const measurementRecord = rec(
        isDelay
          ? rec(data.connections)?.delays
          : rec(data.connections)?.weights,
      ) ?? {};
      const measurementSourceUnit = data.mode === 'prebinned'
        ? resolvedBins.unit
        : String(measurementRecord.unit);
      const valueUnit = normalization === 'density'
        ? String(reciprocalUnit(resolvedBins.unit))
        : '1';
      let compilerSummaryFacts: Readonly<Record<string, string>>;
      if (isDelay) {
        const rawDelays = data.mode === 'prebinned'
          ? []
          : numbers(measurementRecord.values);
        const rawDelayExtent = distributionCompilerExtrema(rawDelays);
        const sourceResolution = rec(data.sourceResolution) ?? {};
        compilerSummaryFacts = {
          selectionLabel: String(parameters.selectionLabel ?? parameters.selectionId),
          consideredConnectionCount: distributionCompilerNumber(sourceConnectionRowCount),
          countingPolicy: String(parameters.countingPolicy),
          pairAggregationStatement: parameters.countingPolicy === 'per_ordered_pair'
            ? ` with ${String(parameters.multapseAggregation)} aggregation`
            : '',
          observationCount: distributionCompilerNumber(formedObservationCount),
          observationKind: parameters.countingPolicy === 'per_ordered_pair'
            ? 'ordered_pair'
            : 'connection',
          groupCount: distributionCompilerNumber(histogramGroups.length),
          groupByStatement: String(data.groupBy),
          scopeStatement: compilerNetworkScopeSummaryCell(data.scope),
          delayMin: rawDelayExtent === null
            ? 'not retained by pre-binned input'
            : distributionCompilerNumber(rawDelayExtent.min),
          delayMax: rawDelayExtent === null
            ? 'not retained by pre-binned input'
            : distributionCompilerNumber(rawDelayExtent.max),
          delayUnit: measurementSourceUnit,
          sourceResolution: `${distributionCompilerNumber(num(sourceResolution.value)!)} ${String(sourceResolution.unit)}`,
          binCount: distributionCompilerNumber(binCount),
          binMin: distributionCompilerNumber(resolvedBins.spec.edges[0]),
          binMax: distributionCompilerNumber(
            resolvedBins.spec.edges[resolvedBins.spec.edges.length - 1],
          ),
          binUnit: resolvedBins.unit,
          xScale: String(parameters.xScale ?? 'linear'),
          underRangeCount: distributionCompilerNumber(underflow),
          overRangeCount: distributionCompilerNumber(overflow),
          normalization,
          valueUnit,
        };
      } else {
        const connections = rec(data.connections) ?? {};
        const declaredSynapseModels = data.mode === 'prebinned'
          ? strings(data.contributingSynapseModels)
          : strings(connections.synapseModels);
        compilerSummaryFacts = {
          selectionLabel: String(parameters.selectionLabel ?? parameters.selectionId),
          inRangeObservationCount: distributionCompilerNumber(binnedObservationCount),
          observationUnit: String(parameters.observationUnit),
          sourceConnectionCount: distributionCompilerNumber(sourceConnectionRowCount),
          sourceNodeCount: distributionCompilerNumber(
            strings(rec(data.sourceUniverse)?.ids).length,
          ),
          targetNodeCount: distributionCompilerNumber(
            strings(rec(data.targetUniverse)?.ids).length,
          ),
          scopeStatement: compilerNetworkScopeSummaryCell(data.scope),
          synapseModels: distributionCompilerSortedUnique(declaredSynapseModels),
          weightComparability: structuredCell(parameters.weightComparability) ?? 'unknown',
          signTreatment: String(parameters.signTreatment),
          weightUnit: measurementSourceUnit,
          missingWeightCount: distributionCompilerNumber(missingMeasurementCount),
          missingObservationCount: distributionCompilerNumber(missingObservationCount),
          zeroWeightCount: distributionCompilerNumber(zeroObservationCount),
          binCount: distributionCompilerNumber(binCount),
          binMin: distributionCompilerNumber(resolvedBins.spec.edges[0]),
          binMax: distributionCompilerNumber(
            resolvedBins.spec.edges[resolvedBins.spec.edges.length - 1],
          ),
          binUnit: resolvedBins.unit,
          xScale: String(parameters.xScale ?? 'linear'),
          zeroEdgeStatement: resolvedBins.spec.edges.includes(0)
            ? 'Zero is an explicit bin edge.'
            : 'Zero is not an explicit bin edge.',
          underRangeCount: distributionCompilerNumber(underflow),
          overRangeCount: distributionCompilerNumber(overflow),
          normalization,
          valueUnit,
        };
      }
      const compileContext = distributionCompilerContext(
        context(rowsTotal, derivedFacts),
        skillId,
        compilerSummaryFacts,
      );
      const plan = renderAsGroups
        ? compileGroupedBarFigure(
          compileContext,
          resolvedBins.spec.edges,
          histogramGroups,
          `${xLabelBase} (${unitLabel(resolvedBins.unit)})`,
          yLabel,
          skillId,
          parameters.xScale === 'log' ? 'log' : 'linear',
          {
            summaryStatements: groupedAccountingSummary,
            outputAuthority: { classId: 'bins' },
          },
        )
        : compileBarFigure(
          compileContext,
          resolvedBins.spec.edges,
          histogramGroups[0]?.values ?? [],
          `${xLabelBase} (${unitLabel(resolvedBins.unit)})`,
          yLabel,
          skillId,
          parameters.xScale === 'log' ? 'log' : 'linear',
          {
            tableMetadata: ungroupedAccountingMetadata,
            summaryStatements: ungroupedAccountingSummary,
            outputAuthority: { classId: 'bins', groupId: 'all' },
          },
        );
      const scopeSummary = compilerNetworkScopeSummaryCell(data.scope);
      const tableRows: TableCell[][] = [];
      for (const group of histogramGroups) {
        if (!group.counts) {
          throw new Error(`histogram group ${group.id} has no exact integer count channel`);
        }
        for (let index = 0; index < binCount; index++) {
          const lower = resolvedBins.spec.edges[index];
          const upper = resolvedBins.spec.edges[index + 1];
          const width = sameUnitDifference(lower, upper, resolvedBins.unit);
          const value = group.values[index];
          if (isDelay) {
            const observationKind = parameters.countingPolicy === 'per_ordered_pair'
              ? 'ordered_pair'
              : 'connection';
            tableRows.push([
              group.id,
              lower,
              upper,
              width,
              resolvedBins.unit,
              group.counts[index],
              observationKind,
              normalization,
              scopeSummary,
              normalization === 'probability' ? value : null,
              normalization === 'density' ? value : null,
              normalization === 'density' ? (reciprocalUnit(resolvedBins.unit) ?? null) : null,
              group.binnedObservationCount,
              group.connectionCount,
              group.underRangeCount,
              group.overRangeCount,
            ]);
          } else {
            tableRows.push([
              group.id,
              lower,
              upper,
              width,
              upper <= 0 ? 'negative' : 'non_negative',
              group.counts[index],
              value,
              normalization === 'density'
                ? (reciprocalUnit(resolvedBins.unit) ?? null)
                : '1',
              group.binnedObservationCount,
              group.missingObservationCount ?? 0,
              group.connectionCount,
            ]);
          }
        }
      }
      return done(
        withContractTable(plan, compileContext, skillId, tableRows),
        [operation],
        derivedFacts,
      );
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
    /**
     * Compiler-side source-template materialization. Scientific facts below come from
     * the independently implemented matrix analysis result, never from the request-only
     * OutputAuthority evaluator. The shared safety predicates are summary-format TCB.
     */
    const matrixCompilerSummary = (facts: Readonly<Record<string, string>>): string => {
      const template = SKILL_CATALOG[skillId].accessibility.summaryTemplate;
      const placeholderPattern = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
      const required: string[] = [];
      for (const match of template.matchAll(placeholderPattern)) required.push(match[1]);
      const requiredSet = new Set(required);
      const templateLiterals = template.replace(placeholderPattern, '');
      const supplied = Object.keys(facts);
      const missing = [...requiredSet].filter(
        (key) => !Object.prototype.hasOwnProperty.call(facts, key),
      );
      const extra = supplied.filter((key) => !requiredSet.has(key));
      if (
        required.length === 0 ||
        templateLiterals.includes('{') ||
        templateLiterals.includes('}') ||
        missing.length > 0 ||
        extra.length > 0
      ) {
        throw new Error(
          `${skillId} matrix compiler summary facts do not exactly match its source template (missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'})`,
        );
      }
      for (const [key, value] of Object.entries(facts)) {
        if (!isOutputAuthoritySummaryFactSafeV1(value)) {
          throw new Error(`${skillId} matrix compiler summary fact ${key} is not safe display text`);
        }
      }
      const summary = template.replace(placeholderPattern, (_placeholder, key: string) => facts[key]);
      // Fact text is literal. A safe caller label such as "selection {A}" must not be
      // recursively interpreted as a second template program after substitution.
      if (!isOutputAuthoritySummarySafeV1(summary)) {
        throw new Error(`${skillId} matrix compiler produced an unsafe summary`);
      }
      return summary;
    };
    const matrixCompilerNumber = (value: number): string => value === 0 ? '0' : String(value);
    const matrixCompilerNoCompaction = (): string =>
      'No compaction was applied; every accepted row is returned.';
    const matrixCompilerScopeStatement = (matrixScope: Record<string, unknown>): string => {
      const kind = String(matrixScope.kind);
      if (kind === 'single_process') return 'single_process complete';
      if (kind === 'global_merged') {
        return `global_merged across all ${String(matrixScope.worldSize)} declared ranks`;
      }
      if (kind === 'mpi_target_rank_local') {
        return `mpi_target_rank_local rank ${String(matrixScope.rank)} in worldSize ${String(matrixScope.worldSize)}; localTargetUniverseComplete=${String(matrixScope.localTargetUniverseComplete)}`;
      }
      if (kind === 'sampled') {
        return `sampled ${String(matrixScope.method)} from ${String(matrixScope.parentScope)}; retained ${String(matrixScope.retainedConnectionCount)} of ${String(matrixScope.sourceConnectionCount)} connection rows`;
      }
      throw new Error(`${skillId} matrix compiler encountered an unknown validated scope kind`);
    };
    const matrixCompilerScopeSummaryCell = (
      matrixScope: Record<string, unknown>,
    ): TableCell => {
      const kind = String(matrixScope.kind);
      if (kind === 'single_process') {
        return structuredCell({
          kind: 'single_process',
          snapshotTime: matrixScope.snapshotTime,
        });
      }
      if (kind === 'global_merged') {
        return structuredCell({
          kind: 'global_merged',
          mergedRanksCoverage: 'all_ranks_0_through_worldSize_minus_1',
          snapshotTime: matrixScope.snapshotTime,
          worldSize: matrixScope.worldSize,
        });
      }
      if (kind === 'mpi_target_rank_local') {
        return structuredCell({
          kind: 'mpi_target_rank_local',
          localTargetUniverseComplete: true,
          rank: matrixScope.rank,
          snapshotTime: matrixScope.snapshotTime,
          worldSize: matrixScope.worldSize,
        });
      }
      if (kind === 'sampled') {
        return structuredCell({
          kind: 'sampled',
          method: matrixScope.method,
          parentScope: matrixScope.parentScope,
          retainedConnectionCount: matrixScope.retainedConnectionCount,
          snapshotTime: matrixScope.snapshotTime,
          sourceConnectionCount: matrixScope.sourceConnectionCount,
        });
      }
      throw new Error(`${skillId} matrix compiler encountered an unknown validated scope kind`);
    };
    const matrixCompilerAdjacencyMultapseStatement = (
      cells: readonly { readonly retainedConnectionRows: number }[],
      cellMode: string,
      method: string,
    ): string => {
      let count = 0;
      for (const cell of cells) if (cell.retainedConnectionRows > 1) count++;
      if (count === 0) return 'No present cell contains multiple retained connection rows.';
      if (cellMode === 'binary_presence') {
        return `${count} present ${count === 1 ? 'cell contains' : 'cells contain'} multiple retained connection rows; each maps to one binary-presence mark, while retained-row and complete-cell counts remain in the table.`;
      }
      return `${count} present ${count === 1 ? 'cell aggregates' : 'cells aggregate'} multiple retained connection rows using ${method}.`;
    };
    const matrixCompilerWeightMultapseStatement = (
      cells: readonly {
        readonly retainedConnectionRows: number;
        readonly state: string;
      }[],
      method: string,
    ): string => {
      let aggregated = 0;
      let unavailable = 0;
      for (const cell of cells) {
        if (cell.retainedConnectionRows <= 1) continue;
        if (cell.state === 'valued') aggregated++;
        else unavailable++;
      }
      if (aggregated === 0 && unavailable === 0) {
        return 'No present cell contains multiple retained connection rows.';
      }
      const statements: string[] = [];
      if (aggregated > 0) {
        statements.push(
          `${aggregated} valued ${aggregated === 1 ? 'cell aggregates' : 'cells aggregate'} multiple retained connection rows using ${method}.`,
        );
      }
      if (unavailable > 0) {
        statements.push(
          `${unavailable} present ${unavailable === 1 ? 'cell contains' : 'cells contain'} multiple retained connection rows, but no complete aggregate is reported because at least one contributing weight is missing.`,
        );
      }
      return statements.join(' ');
    };
    const matrixCellAuthority = (
      cell: {
        readonly rowIndex: number;
        readonly targetId: string;
        readonly columnIndex: number;
        readonly sourceId: string;
      },
      state: string,
    ): OutputAuthorityAtomicRoleV1 => ({
      tag: 'data_carrier',
      classId: 'cells',
      provenance: {
        rowIndex: cell.rowIndex,
        targetId: cell.targetId,
        columnIndex: cell.columnIndex,
        sourceId: cell.sourceId,
        cellState: state,
      },
    });
    const ids = strings(rec(data.nodeUniverse)?.ids);
    const conns = rec(data.connections) ?? {};
    const sources = strings(conns?.sourceIds);
    const targets = strings(conns?.targetIds);
    const scope = rec(data.scope) ?? {};
    const scopeKind = String(scope.kind);
    const scopeCell = matrixCompilerScopeSummaryCell(scope);
    const observedRaw = arr(data.observedTargetIds);
    const observedTargets = observedRaw ? strings(observedRaw) : undefined;
    const edgeIdsRaw = arr(conns.edgeIds);
    const synapseModelsRaw = arr(conns.synapseModels);
    const edgeIds = edgeIdsRaw ? strings(edgeIdsRaw) : undefined;
    const synapseModels = synapseModelsRaw ? strings(synapseModelsRaw) : undefined;
    const weightRecord = rec(conns?.weights);
    const weightValuesRaw = arr(weightRecord?.values) ?? [];
    const weightValues = weightValuesRaw.map((value) => value === null ? null : Number(value));
    const delayRecord = rec(conns?.delays);
    const delayValuesRaw = arr(delayRecord?.values) ?? [];
    const delayValues = numbers(delayRecord?.values);
    const aggregation = String(parameters.multapseAggregation) as MatrixAggregation;
    const tableEnumeration = parameters.tableCellEnumeration === 'dense'
      ? 'dense'
      : 'present_cells_only';
    const preliminaryContext = context(0);
    const topologyInput: MatrixTopologyInput = {
      nodeIds: ids,
      sourceIds: sources,
      targetIds: targets,
      ...(edgeIds ? { edgeIds } : {}),
      ...(synapseModels ? { synapseModels } : {}),
      scope: scope as unknown as MatrixScope,
      ...(observedTargets ? { observedTargetIds: observedTargets } : {}),
      enumeration: tableEnumeration,
      maximumMaterializedCells: preliminaryContext.returnedTableRows,
    };
    const observedSet = new Set(observedTargets ?? []);
    const fullyObserved = scopeKind === 'single_process' || scopeKind === 'global_merged';
    const observedRows = ids.map((id) => fullyObserved ||
      (scopeKind === 'mpi_target_rank_local' && observedSet.has(id)));
    const carriedAttributes = (ordinals: readonly number[]): TableCell => {
      const carried = ordinals.flatMap((index) => {
        const entry: Record<string, unknown> = {};
        if (weightRecord) {
          entry.weight = weightValuesRaw[index] ?? null;
          entry.weightUnit = weightRecord.unit;
        }
        if (delayRecord) {
          entry.delay = (arr(delayRecord.values) ?? [])[index] ?? null;
          entry.delayUnit = delayRecord.unit;
        }
        if (Object.keys(entry).length === 0) return [];
        if (edgeIds !== undefined) entry.edgeId = edgeIds[index];
        if (synapseModels !== undefined) entry.synapseModel = synapseModels[index];
        return [entry];
      });
      return carried.length > 0 ? structuredCell(carried) : null;
    };
    const tableModels = (
      models: readonly string[] | null,
      includeComparabilityGroup: boolean,
    ): TableCell => models === null
      ? null
      : includeComparabilityGroup
        ? structuredCell({
          models,
          ...(typeof parameters.synapseModelGroup === 'string'
            ? { comparabilityGroup: parameters.synapseModelGroup }
            : {}),
        })
        : structuredCell(models);
    const stageForMatrixError = (error: MatrixDerivationError): ErrorStage =>
      error.code.startsWith('SCOPE_')
        ? 'scope'
        : error.code.startsWith('RESOURCE_')
          ? 'budget'
          : error.code.startsWith('SCIENCE_')
            ? 'science'
            : 'semantic';

    try {
      if (skillId === 'network.adjacency_matrix') {
        const cellMode = parameters.cellMode === 'binary_presence'
          ? 'binary_presence'
          : 'multiplicity';
        const adjacencyAggregation = aggregation === 'no_aggregation'
          ? 'no_aggregation'
          : 'sum';
        const matrix = deriveAdjacencyMatrix(topologyInput, cellMode, adjacencyAggregation);
        const tableRows = matrix.tableCells.map((cell) => contractOrderedTableRow(skillId, {
          rowIndex: cell.rowIndex,
          targetId: cell.targetId,
          columnIndex: cell.columnIndex,
          sourceId: cell.sourceId,
          cellStatus: cell.state,
          cellValue: cell.cellValue,
          multiplicity: cell.multiplicity,
          retainedConnectionRows: cell.retainedConnectionRows,
          connectionSetComplete: booleanCell(cell.connectionSetComplete),
          isAutapse: booleanCell(cell.isAutapse),
          edgeIds: cell.contributingEdgeIds === null ? null : structuredCell(cell.contributingEdgeIds),
          synapseModels: tableModels(cell.synapseModels, false),
          carriedAttributes: carriedAttributes(cell.contributingOrdinals),
          scopeSummary: scopeCell,
        }));
        const multapseCells = matrix.presentCells.filter(
          (cell) => cell.retainedConnectionRows > 1,
        );
        const autapseCellCount = matrix.presentCells.filter((cell) => cell.isAutapse).length;
        const snapshotTime = rec(scope.snapshotTime) ?? {};
        const summary = matrixCompilerSummary({
          selectionLabel: String(parameters.selectionLabel ?? parameters.selectionId),
          nodeCount: String(ids.length),
          cellMode,
          presentCellCount: String(matrix.presentCellCount),
          connectionCount: String(matrix.connectionCount),
          observedRowCount: String(matrix.observedRowCount),
          absentCellCount: String(matrix.absentCellCount),
          notObservedCellCount: String(matrix.notObservedCellCount),
          autapseCellCount: String(autapseCellCount),
          scopeStatement: matrixCompilerScopeStatement(scope),
          snapshotTime: matrixCompilerNumber(Number(snapshotTime.value)),
          snapshotTimeUnit: String(snapshotTime.unit),
          multapseStatement: matrixCompilerAdjacencyMultapseStatement(
            matrix.presentCells,
            cellMode,
            adjacencyAggregation,
          ),
          compactionStatement: matrixCompilerNoCompaction(),
        });
        let missingValueCount = 0;
        for (const value of weightValuesRaw) if (value === null) missingValueCount++;
        for (const value of delayValuesRaw) if (value === null) missingValueCount++;
        const derivedFacts: Partial<DisclosureFacts> = {
          ...(cellMode === 'multiplicity' && multapseCells.length > 0
            ? { multapseAggregated: true, multapseAggregation: adjacencyAggregation }
            : {}),
          ...(missingValueCount > 0 ? { missingValueCount } : {}),
        };
        const compileContext = context(tableRows.length, derivedFacts);
        const outputEvidence = {
          axisOrder: matrix.axisOrder,
          connectionCount: matrix.connectionCount,
          presentCellCount: matrix.presentCellCount,
          absentCellCount: matrix.absentCellCount,
          notObservedCellCount: matrix.notObservedCellCount,
          observedRowCount: matrix.observedRowCount,
          cells: matrix.presentCells.map((cell) => ({
            rowIndex: cell.rowIndex,
            columnIndex: cell.columnIndex,
            state: cell.state,
            cellValue: cell.cellValue,
            multiplicity: cell.multiplicity,
            retainedConnectionRows: cell.retainedConnectionRows,
            connectionSetComplete: cell.connectionSetComplete,
            contributingOrdinals: cell.contributingOrdinals,
          })),
        };
        const operation = derivationOperation(
          'matrix.bind_and_aggregate',
          'cortexel.matrix.target_rows_source_columns',
          { axisOrder: MATRIX_AXIS_ORDER, cellMode, aggregation: adjacencyAggregation, tableEnumeration },
          {
            nodeIds: ids,
            sourceIds: sources,
            targetIds: targets,
            ...(edgeIds ? { edgeIds } : {}),
            ...(synapseModels ? { synapseModels } : {}),
            scope,
            observedTargetIds: observedTargets ?? null,
          },
          outputEvidence,
          {
            inputConnectionRows: sources.length,
            boundConnectionRows: matrix.presentCells.reduce(
              (total, cell) => total + cell.retainedConnectionRows,
              0,
            ),
            connectionConservationPassed: true,
            observedRowCount: matrix.observedRowCount,
            tableEnumeration,
          },
        );
        return done(withContractTable(compileMatrixFigure(compileContext, {
          rowIds: ids,
          columnIds: ids,
          cells: matrix.presentCells.map((cell) => ({
            rowIndex: cell.rowIndex,
            columnIndex: cell.columnIndex,
            value: cell.cellValue,
            state: 'present' as const,
            authority: matrixCellAuthority(cell, 'present'),
          })),
          observedRows,
          valueSemantics: cellMode,
          ...(cellMode === 'multiplicity'
            ? { numericScale: parameters.multiplicityScale === 'log' ? 'log' as const : 'linear' as const }
            : {}),
          valueLabel: cellMode === 'binary_presence'
            ? 'Foreground cell means at least one retained connection row'
            : 'Foreground colour encodes exact complete-cell connection multiplicity',
          summary,
        }, skillId), compileContext, skillId, tableRows), [operation], derivedFacts);
      }

      if (skillId === 'network.weight_matrix') {
        const matrix = deriveWeightMatrix(topologyInput, weightValues, aggregation);
        const weightUnit = String(weightRecord?.unit);
        const tableRows = matrix.tableCells.map((cell) => contractOrderedTableRow(skillId, {
          rowIndex: cell.rowIndex,
          targetId: cell.targetId,
          columnIndex: cell.columnIndex,
          sourceId: cell.sourceId,
          cellState: cell.state,
          aggregate: cell.aggregate,
          aggregation,
          weightUnit,
          contributingConnectionCount: cell.contributingConnectionCount,
          contributingWeightCount: cell.contributingWeightCount,
          missingWeightCount: cell.missingWeightCount,
          weightMin: cell.weightMin,
          weightMax: cell.weightMax,
          synapseModels: tableModels(cell.synapseModels, true),
          contributingEdgeIds: cell.contributingEdgeIds === null ? null : structuredCell(cell.contributingEdgeIds),
          scopeSummary: scopeCell,
        }));
        const aggregateValues = matrix.presentCells.flatMap((cell) =>
          cell.aggregate === null ? [] : [cell.aggregate]);
        const aggregateExtent = finiteExtent(aggregateValues);
        const missingValueCount = weightValues.filter((value) => value === null).length;
        const aggregatedMultapseCells = matrix.presentCells.filter(
          (cell) => cell.state === 'valued' && cell.retainedConnectionRows > 1,
        );
        const distinctModels = synapseModels === undefined
          ? undefined
          : [...new Set(synapseModels)].sort(compareUnicodeCodePoints);
        const modelStatement = distinctModels === undefined
          ? 'no synapse-model channel was declared'
          : distinctModels.length === 0
            ? 'the declared synapse-model channel is empty'
            : distinctModels.length === 1
              ? `one declared model ${distinctModels[0]}; no cross-model pooling`
              : `caller-declared comparability group ${String(parameters.synapseModelGroup)} across ${String(distinctModels.length)} distinct declared models`;
        const colorScale = rec(parameters.colorScale) ?? {};
        const snapshotTime = rec(scope.snapshotTime) ?? {};
        const summary = matrixCompilerSummary({
          nodeCount: String(ids.length),
          valuedCellCount: String(matrix.valuedCellCount),
          presentWithMissingValueCellCount: String(matrix.presentWithMissingValueCellCount),
          presentWithoutValueCellCount: String(matrix.presentWithoutValueCellCount),
          absentCellCount: String(matrix.absentCellCount),
          notObservedCellCount: String(matrix.notObservedCellCount),
          aggregation,
          connectionCount: String(matrix.connectionCount),
          weightUnit,
          aggregateMin: aggregateExtent === undefined
            ? 'not available'
            : matrixCompilerNumber(aggregateExtent.min),
          aggregateMax: aggregateExtent === undefined
            ? 'not available'
            : matrixCompilerNumber(aggregateExtent.max),
          synapseModelGroupStatement: modelStatement,
          colorScaleStatement: colorScale.class === 'diverging'
            ? `diverging about declared center ${matrixCompilerNumber(Number(colorScale.center))}`
            : 'sequential',
          scopeStatement: matrixCompilerScopeStatement(scope),
          snapshotTime: `${matrixCompilerNumber(Number(snapshotTime.value))} ${String(snapshotTime.unit)}`,
          multapseStatement: matrixCompilerWeightMultapseStatement(
            matrix.presentCells,
            aggregation,
          ),
          compactionStatement: matrixCompilerNoCompaction(),
        });
        const derivedFacts: Partial<DisclosureFacts> = {
          ...(aggregatedMultapseCells.length > 0
            ? { multapseAggregated: true, multapseAggregation: aggregation }
            : {}),
          ...(missingValueCount > 0 ? { missingValueCount } : {}),
        };
        const compileContext = context(tableRows.length, derivedFacts);
        const outputEvidence = {
          axisOrder: matrix.axisOrder,
          connectionCount: matrix.connectionCount,
          presentCellCount: matrix.presentCellCount,
          absentCellCount: matrix.absentCellCount,
          notObservedCellCount: matrix.notObservedCellCount,
          valuedCellCount: matrix.valuedCellCount,
          presentWithMissingValueCellCount: matrix.presentWithMissingValueCellCount,
          presentWithoutValueCellCount: matrix.presentWithoutValueCellCount,
          cells: matrix.presentCells.map((cell) => ({
            rowIndex: cell.rowIndex,
            columnIndex: cell.columnIndex,
            state: cell.state,
            aggregate: cell.aggregate,
            contributingOrdinals: cell.contributingOrdinals,
            contributingWeightCount: cell.contributingWeightCount,
            missingWeightCount: cell.missingWeightCount,
          })),
        };
        const operation = derivationOperation(
          'matrix.bind_and_aggregate',
          'cortexel.matrix.target_rows_source_columns',
          { axisOrder: MATRIX_AXIS_ORDER, aggregation, tableEnumeration, colorScale },
          {
            nodeIds: ids,
            sourceIds: sources,
            targetIds: targets,
            ...(edgeIds ? { edgeIds } : {}),
            ...(synapseModels ? { synapseModels } : {}),
            weights: weightRecord,
            scope,
            observedTargetIds: observedTargets ?? null,
          },
          outputEvidence,
          {
            inputConnectionRows: sources.length,
            boundConnectionRows: matrix.presentCells.reduce(
              (total, cell) => total + cell.retainedConnectionRows,
              0,
            ),
            connectionConservationPassed: true,
            missingWeightCount: missingValueCount,
            completeAggregateCount: matrix.valuedCellCount,
            tableEnumeration,
          },
        );
        return done(withContractTable(compileMatrixFigure(compileContext, {
          rowIds: ids,
          columnIds: ids,
          cells: matrix.presentCells.map((cell) => ({
            rowIndex: cell.rowIndex,
            columnIndex: cell.columnIndex,
            value: cell.aggregate,
            state: cell.state as 'valued' | 'present_with_missing_value' | 'present_without_value',
            authority: matrixCellAuthority(cell, cell.state),
          })),
          observedRows,
          valueSemantics: 'weight',
          colorScale: colorScale.class === 'diverging'
            ? { class: 'diverging', center: Number(colorScale.center) }
            : { class: 'sequential' },
          valueLabel: `Foreground colour encodes complete ${aggregation} weight aggregate (${unitLabel(weightUnit)})`,
          summary,
        }, skillId), compileContext, skillId, tableRows), [operation], derivedFacts);
      }

      const sourceUnit = String(delayRecord?.unit);
      const displayUnit = String(rec(parameters.displayUnit)?.unit ?? sourceUnit);
      const delayAggregation = aggregation as Exclude<MatrixAggregation, 'sum'>;
      const matrix = deriveDelayMatrix(
        topologyInput,
        delayValues,
        delayAggregation,
        sourceUnit,
        displayUnit,
      );
      const tableRows = matrix.tableCells.map((cell) => contractOrderedTableRow(skillId, {
        rowIndex: cell.rowIndex,
        targetId: cell.targetId,
        columnIndex: cell.columnIndex,
        sourceId: cell.sourceId,
        cellStatus: cell.state,
        delayAggregate: cell.delayAggregate,
        displayUnit,
        multapseAggregation: delayAggregation,
        delaySemantics: String(parameters.delaySemantics),
        contributingConnectionCount: cell.contributingConnectionCount,
        delayMin: cell.delayMin,
        delayMax: cell.delayMax,
        contributingEdgeIds: cell.contributingEdgeIds === null ? null : structuredCell(cell.contributingEdgeIds),
        synapseModels: tableModels(cell.synapseModels, false),
        isAutapse: booleanCell(cell.isAutapse),
        scopeSummary: scopeCell,
      }));
      const delayAggregates = matrix.presentCells.map((cell) => cell.delayAggregate!);
      const delayExtent = finiteExtent(delayAggregates);
      const multapseCells = matrix.presentCells.filter(
        (cell) => cell.retainedConnectionRows > 1,
      );
      const unitConversions = sourceUnit === displayUnit || matrix.presentCells.length === 0
        ? []
        : [`delay: ${sourceUnit} -> ${displayUnit} (factor ${conversionFactor(sourceUnit, displayUnit)})`];
      const derivedFacts: Partial<DisclosureFacts> = {
        ...(multapseCells.length > 0
          ? { multapseAggregated: true, multapseAggregation: delayAggregation }
          : {}),
        ...(unitConversions.length > 0 ? { unitConversions } : {}),
      };
      const snapshotTime = rec(scope.snapshotTime) ?? {};
      const summary = matrixCompilerSummary({
        matrixLabel: String(parameters.matrixLabel ?? 'declared node universe'),
        rowCount: String(ids.length),
        columnCount: String(ids.length),
        presentCellCount: String(matrix.presentCellCount),
        absentCellCount: String(matrix.absentCellCount),
        notObservedCellCount: String(matrix.notObservedCellCount),
        multapseAggregation: delayAggregation,
        delaySemantics: String(parameters.delaySemantics),
        connectionCount: String(matrix.connectionCount),
        displayUnit,
        delayMin: delayExtent === undefined
          ? 'not available'
          : matrixCompilerNumber(delayExtent.min),
        delayMax: delayExtent === undefined
          ? 'not available'
          : matrixCompilerNumber(delayExtent.max),
        scopeKind,
        snapshotTime: matrixCompilerNumber(Number(snapshotTime.value)),
        snapshotTimeUnit: String(snapshotTime.unit),
        compactionStatement: matrixCompilerNoCompaction(),
      });
      const compileContext = context(tableRows.length, derivedFacts);
      const outputEvidence = {
        axisOrder: matrix.axisOrder,
        connectionCount: matrix.connectionCount,
        presentCellCount: matrix.presentCellCount,
        absentCellCount: matrix.absentCellCount,
        notObservedCellCount: matrix.notObservedCellCount,
        cells: matrix.presentCells.map((cell) => ({
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex,
          state: cell.state,
          delayAggregate: cell.delayAggregate,
          contributingOrdinals: cell.contributingOrdinals,
        })),
      };
      const operation = derivationOperation(
        'matrix.bind_aggregate_and_convert',
        'cortexel.matrix.target_rows_source_columns',
        { axisOrder: MATRIX_AXIS_ORDER, aggregation: delayAggregation, tableEnumeration, sourceUnit, displayUnit },
        {
          nodeIds: ids,
          sourceIds: sources,
          targetIds: targets,
          ...(edgeIds ? { edgeIds } : {}),
          ...(synapseModels ? { synapseModels } : {}),
          delays: delayRecord,
          scope,
          observedTargetIds: observedTargets ?? null,
        },
        outputEvidence,
        {
          inputConnectionRows: sources.length,
          boundConnectionRows: matrix.presentCells.reduce(
            (total, cell) => total + cell.retainedConnectionRows,
            0,
          ),
          connectionConservationPassed: true,
          unitConversionCount: sourceUnit === displayUnit ? 0 : 1,
          tableEnumeration,
        },
      );
      return done(withContractTable(compileMatrixFigure(compileContext, {
        rowIds: ids,
        columnIds: ids,
        cells: matrix.presentCells.map((cell) => ({
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex,
          value: cell.delayAggregate,
          state: 'present' as const,
          authority: matrixCellAuthority(cell, 'present'),
        })),
        observedRows,
        valueSemantics: 'delay',
        numericScale: parameters.scale === 'log' ? 'log' : 'linear',
        valueLabel: `Foreground colour encodes complete ${delayAggregation} delay aggregate (${unitLabel(displayUnit)})`,
        summary,
      }, skillId), compileContext, skillId, tableRows), [operation], derivedFacts);
    } catch (error) {
      if (error instanceof MatrixDerivationError) {
        const instancePath = error.code === 'SCIENCE_DELAY_NONPOSITIVE'
          ? '/data/connections/delays/values'
          : error.code === 'SCIENCE_AGGREGATION_REQUIRED'
            ? '/parameters/multapseAggregation'
            : error.code === 'RESOURCE_MATRIX_CELLS_EXCEEDED'
              ? '/parameters/tableCellEnumeration'
              : '/data/connections';
        return fail(error.code, stageForMatrixError(error), error.message, instancePath);
      }
      throw error;
    }
  }

  // ---- spatial map ---------------------------------------------------------
  if (skillId === 'network.spatial_map_2d') {
    const positions = rec(data.positions);
    const universeIds = strings(rec(data.nodeUniverse)?.ids);
    const sourcePositionIds = strings(positions?.nodeIds);
    const sourcePositionIndex = new Map(sourcePositionIds.map((id, index) => [id, index]));
    // The declared node universe is the ordering authority. Position rows bind by id and
    // may arrive in any order; a source-array permutation must not permute geometry.
    const ids = [...universeIds];
    const sourceXs = numbers(rec(positions?.x)?.values);
    const sourceYs = numbers(rec(positions?.y)?.values);
    const xPositionUnit = String(rec(positions?.x)?.unit);
    const yPositionUnit = String(rec(positions?.y)?.unit);
    // Use the finest supplied compatible unit so canonicalization never rounds a
    // fine coordinate onto a coarser grid merely because x happened to be listed first.
    const positionUnit = xPositionUnit === yPositionUnit ||
      conversionFactor(yPositionUnit, xPositionUnit) >= 1
      ? xPositionUnit
      : yPositionUnit;
    const convertedSourceXs = xPositionUnit === positionUnit
      ? sourceXs
      : sourceXs.map((value) => convert(value, xPositionUnit, positionUnit));
    const convertedSourceYs = yPositionUnit === positionUnit
      ? sourceYs
      : sourceYs.map((value) => convert(value, yPositionUnit, positionUnit));
    const xs = ids.map((id) => convertedSourceXs[sourcePositionIndex.get(id)!]);
    const ys = ids.map((id) => convertedSourceYs[sourcePositionIndex.get(id)!]);
    const xLabel = `${String(rec(positions?.frame)?.xAxisLabel ?? 'x')} (${unitLabel(positionUnit)})`;
    const yLabel = `${String(rec(positions?.frame)?.yAxisLabel ?? 'y')} (${unitLabel(positionUnit)})`;
    const coordinateConversions = [
      ...(xPositionUnit !== positionUnit ? [`x: ${xPositionUnit} -> ${positionUnit} (factor ${conversionFactor(xPositionUnit, positionUnit)})`] : []),
      ...(yPositionUnit !== positionUnit ? [`y: ${yPositionUnit} -> ${positionUnit} (factor ${conversionFactor(yPositionUnit, positionUnit)})`] : []),
    ];
    const spatialFacts: Partial<DisclosureFacts> = coordinateConversions.length > 0
      ? { unitConversions: coordinateConversions }
      : {};
    const spatialOperations: DerivationOperation[] = coordinateConversions.length > 0
      ? [{
        id: 'spatial.coordinates.canonicalize_axes',
        algorithm: 'cortexel.spatial_map_2d.canonicalize_axes',
        algorithmRevision: 1,
        parameters: { targetUnit: positionUnit, selectionRule: 'finest_supplied_compatible_unit' },
        inputDigest: canonicalDigest({
          x: rec(positions?.x),
          y: rec(positions?.y),
        }),
        outputDigest: canonicalDigest({ nodeIds: ids, x: xs, y: ys, unit: positionUnit }),
        receipt: {
          x: xPositionUnit === positionUnit ? null : conversionReceipt(xPositionUnit, positionUnit),
          y: yPositionUnit === positionUnit ? null : conversionReceipt(yPositionUnit, positionUnit),
          coordinateCount: sourcePositionIds.length,
        },
      }]
      : [];
    const positionIndex = new Map(ids.map((id, index) => [id, index]));
    const groupByNode = new Map<string, string>();
    const groupIndexByNode = new Map<string, number>();
    const universeSet = new Set(universeIds);
    const groupIds = new Set<string>();
    const declaredGroups = arr(rec(data.nodeUniverse)?.groups) ?? [];
    for (const [groupIndex, candidate] of declaredGroups.entries()) {
      const group = rec(candidate) ?? {};
      const groupId = String(group.id);
      if (groupIds.has(groupId)) {
        return fail(
          'SEMANTIC_DUPLICATE_ID',
          'semantic',
          `node-universe group id ${JSON.stringify(groupId)} is declared more than once. Group order and legend identity require unique ids.`,
          `/data/nodeUniverse/groups/${groupIndex}/id`,
        );
      }
      groupIds.add(groupId);
      for (const member of strings(group.memberIds)) {
        if (!universeSet.has(member)) {
          return fail(
            'SEMANTIC_UNKNOWN_REFERENCE',
            'semantic',
            `group ${JSON.stringify(groupId)} contains node ${JSON.stringify(member)}, which is outside the declared node universe. A group is a partition of that universe, never an extension of it.`,
            `/data/nodeUniverse/groups/${groupIndex}/memberIds`,
          );
        }
        const previousGroup = groupByNode.get(member);
        if (previousGroup !== undefined) {
          return fail(
            'SEMANTIC_DUPLICATE_ID',
            'semantic',
            `node ${JSON.stringify(member)} belongs to both group ${JSON.stringify(previousGroup)} and group ${JSON.stringify(groupId)}. Group colour and marker shape require disjoint membership.`,
            `/data/nodeUniverse/groups/${groupIndex}/memberIds`,
          );
        }
        groupByNode.set(member, groupId);
        groupIndexByNode.set(member, groupIndex);
      }
    }
    const domain = rec(positions?.domain);
    const center = rec(domain?.center);
    const extent = rec(domain?.extent);
    const centerX = rec(center?.x);
    const centerY = rec(center?.y);
    const width = rec(extent?.width);
    const height = rec(extent?.height);
    let domainBounds: SpatialRoutingDomain | null = null;
    let domainAxisX: ReturnType<typeof spatialDomainAxis> | null = null;
    let domainAxisY: ReturnType<typeof spatialDomainAxis> | null = null;
    if (centerX && centerY && width && height) {
      try {
        const canonicalCenterX = convert(num(centerX.value)!, String(centerX.unit), positionUnit);
        const canonicalCenterY = convert(num(centerY.value)!, String(centerY.unit), positionUnit);
        const canonicalWidth = convert(num(width.value)!, String(width.unit), positionUnit);
        const canonicalHeight = convert(num(height.value)!, String(height.unit), positionUnit);
        const xAxis = spatialDomainAxis(canonicalCenterX, canonicalWidth);
        const yAxis = spatialDomainAxis(canonicalCenterY, canonicalHeight);
        domainAxisX = xAxis;
        domainAxisY = yAxis;
        const boundary = rec(domain?.boundary);
        domainBounds = {
          xMin: xAxis.lower,
          xMax: xAxis.upper,
          yMin: yAxis.lower,
          yMax: yAxis.upper,
          centerX: canonicalCenterX,
          centerY: canonicalCenterY,
          periodX: canonicalWidth,
          periodY: canonicalHeight,
          periodicX: boundary?.kind === 'periodic' && boundary.x === true,
          periodicY: boundary?.kind === 'periodic' && boundary.y === true,
          edgeChordRule: boundary?.kind === 'periodic'
            ? String(boundary.edgeChordRule) as 'minimum_image' | 'straight_chord'
            : 'open',
        };
      } catch (error) {
        return fail(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          error instanceof Error
            ? `the declared spatial domain is not representable under the registered extent-relative binary64 policy: ${error.message}`
            : 'the declared spatial domain is not representable under the registered extent-relative binary64 policy.',
          '/data/positions/domain',
        );
      }
    }
    const valueRecord = rec(positions?.value);
    const sourceValueValues = arr(valueRecord?.values) ?? [];
    const valueValues = valueRecord
      ? ids.map((id) => sourceValueValues[sourcePositionIndex.get(id)!])
      : [];
    const coincident = new Map<string, string[]>();
    for (let index = 0; index < ids.length; index++) {
      const key = canonicalize([xs[index], ys[index]]);
      const existing = coincident.get(key);
      if (existing) existing.push(ids[index]);
      else coincident.set(key, [ids[index]]);
    }
    const scopeSummaryCell = compilerNetworkScopeSummaryCell(data.scope);
    const nodeRows: TableCell[][] = strings(rec(data.nodeUniverse)?.ids).map((nodeId) => {
      const index = positionIndex.get(nodeId);
      const missing = index === undefined;
      const x = missing ? null : xs[index];
      const y = missing ? null : ys[index];
      const sharing = !missing
        ? (coincident.get(canonicalize([x, y])) ?? []).filter((id) => id !== nodeId)
        : [];
      return [
        'node',
        nodeId,
        groupByNode.get(nodeId) ?? 'ungrouped',
        x,
        y,
        missing ? null : positionUnit,
        missing ? null : String(positions?.status),
        booleanCell(missing),
        domainBounds === null || missing
          ? null
          : booleanCell(
            spatialDomainAxisContains(domainAxisX!, x!) &&
            spatialDomainAxisContains(domainAxisY!, y!),
          ),
        sharing.length > 0 ? structuredCell(sharing) : null,
        missing || valueRecord === undefined || valueValues[index] === null
          ? null
          : valueValues[index] as number,
        valueRecord ? String(valueRecord.unit) : null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        scopeSummaryCell,
      ];
    });

    const connections = rec(data.connections);
    const sources = strings(connections?.sourceIds);
    const targets = strings(connections?.targetIds);
    const callerEdgeIds = strings(connections?.edgeIds);
    if (callerEdgeIds.length > 0 && callerEdgeIds.length !== sources.length) {
      return fail(
        'SEMANTIC_LENGTH_MISMATCH',
        'semantic',
        `connections.edgeIds has ${callerEdgeIds.length} entries for ${sources.length} connection rows.`,
        '/data/connections/edgeIds',
      );
    }
    // This is a table/DOM row address, not a claim that the source identified a synapse.
    const edgeIds = sources.map((_source, index) => callerEdgeIds[index] ?? `connection-row-${index}`);
    const weights = arr(rec(connections?.weights)?.values) ?? [];
    const delays = arr(rec(connections?.delays)?.values) ?? [];
    const models = strings(connections?.synapseModels);
    const weightUnit = typeof rec(connections?.weights)?.unit === 'string'
      ? String(rec(connections?.weights)?.unit)
      : null;
    const delayUnit = typeof rec(connections?.delays)?.unit === 'string'
      ? String(rec(connections?.delays)?.unit)
      : null;
    const universeOrdinal = new Map(universeIds.map((id, index) => [id, index]));
    const canonicalPair = (source: string, target: string): readonly [string, string] =>
      universeOrdinal.get(source)! <= universeOrdinal.get(target)!
        ? [source, target]
        : [target, source];
    const pairKey = (source: string, target: string): string =>
      canonicalize(canonicalPair(source, target));
    const pairTotals = new Map<string, number>();
    for (let index = 0; index < sources.length; index++) {
      const key = pairKey(sources[index], targets[index]);
      pairTotals.set(key, (pairTotals.get(key) ?? 0) + 1);
    }
    const boundary = rec(domain?.boundary);
    const routesByPair = new Map<string, {
      readonly physicalSourceId: string;
      readonly physicalTargetId: string;
      readonly route: SpatialChordRoute;
    }>();
    for (let edgeIndex = 0; edgeIndex < sources.length; edgeIndex++) {
      const key = pairKey(sources[edgeIndex], targets[edgeIndex]);
      if (routesByPair.has(key)) continue;
      const [physicalSourceId, physicalTargetId] = canonicalPair(
        sources[edgeIndex],
        targets[edgeIndex],
      );
      const physicalSourceIndex = positionIndex.get(physicalSourceId)!;
      const physicalTargetIndex = positionIndex.get(physicalTargetId)!;
      let route: SpatialChordRoute;
      try {
        route = classifySpatialChord(
          { x: xs[physicalSourceIndex], y: ys[physicalSourceIndex] },
          { x: xs[physicalTargetIndex], y: ys[physicalTargetIndex] },
          domainBounds ?? undefined,
          physicalSourceId === physicalTargetId,
        );
      } catch (error) {
        return fail(
          'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
          'science',
          error instanceof Error
            ? `connection ${edgeIndex} cannot be routed in finite binary64: ${error.message}`
            : `connection ${edgeIndex} cannot be routed in finite binary64.`,
          `/data/connections/sourceIds/${edgeIndex}`,
        );
      }
      if (
        physicalSourceId !== physicalTargetId &&
        route.dx === 0 &&
        route.dy === 0
      ) {
        return fail(
          'RENDER_DEGENERATE_DOMAIN',
          'render',
          `connection ${edgeIndex} joins distinct nodes ${physicalSourceId} and ${physicalTargetId} at the same measured place under path kind ${route.pathKind}. A zero-length chord has no target end for an arrowhead, and Cortexel refuses rather than invent a separation.`,
          `/data/connections/sourceIds/${edgeIndex}`,
        );
      }
      routesByPair.set(key, { physicalSourceId, physicalTargetId, route });
    }
    let minimumImageTieChordCount = 0;
    let minimumImageTieAxisCount = 0;
    for (const { route } of routesByPair.values()) {
      const axisCount = Number(route.halfPeriodTieX) + Number(route.halfPeriodTieY);
      if (axisCount > 0) minimumImageTieChordCount++;
      minimumImageTieAxisCount += axisCount;
    }
    const edgeRows: TableCell[][] = sources.map((sourceId, index) => [
      'connection',
      edgeIds[index],
      'not_applicable',
      null,
      null,
      null,
      null,
      'not_applicable',
      null,
      null,
      null,
      null,
      sourceId,
      targets[index],
      routesByPair.get(pairKey(sourceId, targets[index]))!.route.pathKind,
      pairTotals.get(pairKey(sourceId, targets[index]))!,
      typeof weights[index] === 'number' ? weights[index] as number : null,
      weightUnit,
      typeof delays[index] === 'number' ? delays[index] as number : null,
      delayUnit,
      models[index] ?? null,
      scopeSummaryCell,
    ]);
    const tableRows = [...nodeRows, ...edgeRows];
    const expectedSpatialRows = strings(rec(data.nodeUniverse)?.ids).length + sources.length;
    if (tableRows.length !== expectedSpatialRows) {
      return fail(
        'INTERNAL_INVARIANT_VIOLATED',
        'internal',
        `spatial table materialized ${tableRows.length} rows for ${expectedSpatialRows} declared node/connection carriers.`,
        '/data',
      );
    }
    const nodeEncoding = rec(parameters.nodeEncoding) ?? {};
    if (nodeEncoding.mode === 'value' && !valueRecord) {
      return fail(
        'RENDER_NO_DATA',
        'render',
        'nodeEncoding.mode is value, but positions.value was not supplied. Cortexel refuses rather than draw a uniform map under a numeric legend.',
        '/parameters/nodeEncoding/mode',
      );
    }
    const nodeColorScale = rec(nodeEncoding.colorScale);
    if (nodeEncoding.mode === 'value' && nodeColorScale?.transform === 'symlog') {
      const threshold = num(nodeColorScale.linearThreshold)!;
      const origin = nodeColorScale.kind === 'diverging'
        ? num(nodeColorScale.center)!
        : 0;
      const uniqueValues = [...new Set(valueValues.filter(
        (value): value is number => typeof value === 'number',
      ))].sort((left, right) => left - right);
      let previousTransform: number | undefined;
      for (const value of uniqueValues) {
        try {
          const delta = exactBinary64Sum([value, -origin]);
          const transformed = symlogTransform(delta, threshold);
          if (!Number.isFinite(transformed)) {
            throw new Error('the transformed value is not finite');
          }
          if (previousTransform !== undefined && !(transformed > previousTransform)) {
            throw new Error('two distinct ordered values collapse to one transformed value');
          }
          previousTransform = transformed;
        } catch (error) {
          return fail(
            'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
            'science',
            error instanceof Error
              ? `the declared spatial node symlog scale cannot preserve finite strict value ordering: ${error.message}`
              : 'the declared spatial node symlog scale cannot preserve finite strict value ordering.',
            '/parameters/nodeEncoding/colorScale',
          );
        }
      }
    }
    const connectionDisplay = rec(parameters.connectionDisplay);
    const encodedValues = connectionDisplay?.valueEncoding === 'weight'
      ? weights
      : connectionDisplay?.valueEncoding === 'delay'
        ? delays
        : [];
    if (connectionDisplay && connectionDisplay.valueEncoding !== 'none') {
      if (encodedValues.length !== sources.length) {
        return fail(
          'RENDER_NO_DATA',
          'render',
          `${String(connectionDisplay.valueEncoding)} was selected for connection encoding, but that complete parallel value channel was not supplied.`,
          '/parameters/connectionDisplay/valueEncoding',
        );
      }
      const valuesByPair = new Map<string, unknown[]>();
      for (let index = 0; index < sources.length; index++) {
        const key = pairKey(sources[index], targets[index]);
        const entries = valuesByPair.get(key) ?? [];
        entries.push(encodedValues[index]);
        valuesByPair.set(key, entries);
      }
      for (const entries of valuesByPair.values()) {
        if (
          entries.length > 1 &&
          (typeof parameters.multapseAggregation !== 'string' || parameters.multapseAggregation === 'no_aggregation')
        ) {
          return fail(
            'SCIENCE_AGGREGATION_REQUIRED',
            'science',
            'multiple connection rows share one measured endpoint chord, so its encoded value requires an explicit sum, mean, min, or max aggregation. Reciprocal directions remain separate arrow/count evidence, but cannot carry two incompatible stroke values on one physical chord.',
            '/parameters/multapseAggregation',
          );
        }
        const finite = entries.filter((value): value is number => typeof value === 'number');
        if (finite.length > 0 && finite.length !== entries.length) {
          return fail(
            'RENDER_NO_DATA',
            'render',
            'one shared spatial chord cannot simultaneously encode a finite value and a missing value from parallel connections. Cortexel refuses rather than let the finite row visually stand in for the missing row.',
            '/data/connections',
          );
        }
        try {
          aggregateTopologyScalar(
            finite,
            entries.length === 1
              ? 'no_aggregation'
              : parameters.multapseAggregation as
                | 'sum'
                | 'mean'
                | 'min'
                | 'max'
                | 'no_aggregation'
                | undefined,
          );
        } catch (error) {
          return fail(
            'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
            'science',
            error instanceof Error
              ? `the declared spatial chord aggregate is not representable as finite binary64: ${error.message}`
              : 'the declared spatial chord aggregate is not representable as finite binary64.',
            '/data/connections',
          );
        }
      }
    }
    let coincidentNodeCount = 0;
    for (const members of coincident.values()) {
      if (members.length > 1) coincidentNodeCount += members.length;
    }
    let outsideDomainCount = 0;
    if (domainBounds) {
      for (let index = 0; index < ids.length; index++) {
        if (
          !spatialDomainAxisContains(domainAxisX!, xs[index]) ||
          !spatialDomainAxisContains(domainAxisY!, ys[index])
        ) outsideDomainCount++;
      }
    }
    const explicitMissingValueCount = countExplicitNulls(valueValues) +
      countExplicitNulls(encodedValues);
    const hasAggregatedPair = encodedValues.length > 0 && pairTotals.size < sources.length;
    const spatialDerivedFacts: Partial<DisclosureFacts> = {
      ...spatialFacts,
      ...(explicitMissingValueCount > 0
        ? { missingValueCount: explicitMissingValueCount }
        : {}),
      ...(hasAggregatedPair && typeof parameters.multapseAggregation === 'string'
        ? {
          multapseAggregated: true,
          multapseAggregation: parameters.multapseAggregation,
        }
        : {}),
    };
    const frameRecord = rec(positions?.frame) ?? {};
    const uncertaintyRecord = rec(parameters.uncertainty) ?? {};
    const spatialCompileContext = topologyDynamicsCompilerContext(
      context(tableRows.length, spatialDerivedFacts),
      skillId,
      {
        mapLabel: String(parameters.mapLabel ?? parameters.mapId),
        drawnNodeCount: exactNumberText(ids.length),
        declaredNodeCount: exactNumberText(strings(rec(data.nodeUniverse)?.ids).length),
        positionStatus: String(positions?.status),
        frameId: String(frameRecord.id),
        missingPositionCount: exactNumberText(
          strings(rec(data.nodeUniverse)?.ids).length - ids.length,
        ),
        xAxisLabel: String(frameRecord.xAxisLabel ?? 'x'),
        yAxisLabel: String(frameRecord.yAxisLabel ?? 'y'),
        positionUnit,
        domainStatement: domainBounds
          ? `closed x [${exactNumberText(domainBounds.xMin)}, ${exactNumberText(domainBounds.xMax)}] and y [${exactNumberText(domainBounds.yMin)}, ${exactNumberText(domainBounds.yMax)}] ${positionUnit}`
          : 'no domain declared',
        boundaryStatement: domainBounds
          ? boundary?.kind === 'periodic'
            ? `periodic x=${String(boundary.x)} y=${String(boundary.y)} with ${String(boundary.edgeChordRule)} edge chords`
            : String(boundary?.kind)
          : 'not declared',
        minimumImageTieChordCount: exactNumberText(minimumImageTieChordCount),
        minimumImageTieAxisCount: exactNumberText(minimumImageTieAxisCount),
        coincidentNodeCount: exactNumberText(coincidentNodeCount),
        outsideDomainCount: exactNumberText(outsideDomainCount),
        nodeEncodingStatement: structuredCell(parameters.nodeEncoding)!,
        connectionStatement: sources.length === 0
          ? 'no connections were supplied'
          : `${sources.length} source connection rows form ${pairTotals.size} unordered measured endpoint chords; direction groups remain explicit`,
        nodeUniverseStatement: `${rec(data.nodeUniverse)?.complete === true ? 'complete' : 'incomplete'}; order ${String(rec(data.nodeUniverse)?.order ?? 'as_declared')}`,
        scopeStatement: scopeSummaryCell,
        uncertaintyStatement: uncertaintyRecord.kind === 'none'
          ? `No uncertainty was supplied (${String(uncertaintyRecord.reason ?? 'not_provided')}).`
          : `Uncertainty kind ${String(uncertaintyRecord.kind)} was declared.`,
        compactionStatement: 'No declared node or connection row was compacted; nodes without positions are omitted and disclosed.',
        tableStatement: `The complete table contains ${strings(rec(data.nodeUniverse)?.ids).length} node rows followed by ${sources.length} source-order connection rows.`,
      },
    );
    return done(withContractTable(
      compileSpatialMapFigure(spatialCompileContext, {
        nodes: ids.map((id, index) => ({
          id,
          x: xs[index],
          y: ys[index],
          group: groupByNode.get(id) ?? 'ungrouped',
          groupIndex: groupIndexByNode.get(id) ?? declaredGroups.length,
          ...(valueRecord ? { value: typeof valueValues[index] === 'number' ? valueValues[index] as number : null } : {}),
        })),
        connections: sources.map((sourceId, index) => ({
          id: edgeIds[index],
          sourceId,
          targetId: targets[index],
          sourceOrdinal: index,
          ...(connectionDisplay?.valueEncoding !== 'none'
            ? { value: typeof encodedValues[index] === 'number' ? encodedValues[index] as number : null }
            : {}),
        })),
        xLabel,
        yLabel,
        markerRadius: num(parameters.markerRadiusPx) ?? 3,
        nodeEncoding: (nodeEncoding.mode as 'uniform' | 'group' | 'value') ?? 'uniform',
        ...(rec(nodeEncoding.colorScale)
          ? {
            nodeValueScale: {
              kind: String(rec(nodeEncoding.colorScale)?.kind) as 'sequential' | 'diverging',
              transform: String(rec(nodeEncoding.colorScale)?.transform) as 'linear' | 'symlog',
              ...(num(rec(nodeEncoding.colorScale)?.center) !== undefined
                ? { center: num(rec(nodeEncoding.colorScale)?.center)! }
                : {}),
              ...(num(rec(nodeEncoding.colorScale)?.linearThreshold) !== undefined
                ? { linearThreshold: num(rec(nodeEncoding.colorScale)?.linearThreshold)! }
                : {}),
            },
          }
          : {}),
        ...(connectionDisplay && connectionDisplay.valueEncoding !== 'none'
          ? {
            connectionEncoding: {
              channel: String(connectionDisplay.channel) as 'width' | 'color' | 'width_and_color',
              colorKind: (rec(connectionDisplay.colorScale)?.kind === 'diverging'
                ? 'diverging'
                : 'sequential') as 'sequential' | 'diverging',
              ...(num(rec(connectionDisplay.colorScale)?.center) !== undefined
                ? { center: num(rec(connectionDisplay.colorScale)?.center)! }
                : {}),
            },
          }
          : {}),
        ...(typeof parameters.multapseAggregation === 'string'
          ? {
            multapseAggregation:
              parameters.multapseAggregation as TopologyScalarAggregation,
          }
          : {}),
        ...(domainBounds
          ? { domain: domainBounds }
          : {}),
      }, skillId),
      spatialCompileContext,
      skillId,
      tableRows,
    ), spatialOperations, spatialDerivedFacts);
  }

  // ---- response curve ------------------------------------------------------
  if (skillId === 'neuro.response_curve') {
    const conditions = rec(data.conditions);
    const inputRec = rec(conditions?.input);
    const axis = conditions?.axis as 'numeric' | 'ordinal' | 'nominal';
    const conditionIds = (arr(conditions?.ids) ?? []) as string[];
    const conditionLabels = arr(conditions?.labels) as string[] | undefined;
    const inputValues = inputRec
      ? (arr(inputRec.values) ?? []).map((value) => typeof value === 'number' ? value : Number.NaN)
      : undefined;
    const mode = data.mode as 'repeats' | 'aggregates';
    const observations = rec(data.observations);
    const aggregates = rec(data.aggregates);
    const aggregateTrimmedCounts = arr(aggregates?.trimmedCounts);
    const response = rec(
      mode === 'repeats' ? observations?.response : aggregates?.response,
    );
    const responseValues = (arr(response?.values) ?? []).map((value) =>
      value === null ? null : typeof value === 'number' ? value : Number.NaN,
    );
    const responseMethod = (response?.method as string) ?? (parameters.responseMethod as string);
    const repeatDesign = parameters.repeatDesign as 'independent' | 'paired';
    if (parameters.responseMethod !== response?.method) {
      return fail(
        'SCIENCE_RESPONSE_METHOD_MISMATCH',
        'science',
        `parameters.responseMethod is ${JSON.stringify(parameters.responseMethod)} but the response values are typed as ${JSON.stringify(response?.method)}. Cortexel will not relabel one scientific quantity as another.`,
        '/parameters/responseMethod',
      );
    }
    const rateResponse =
      responseMethod === 'mean_firing_rate' || responseMethod === 'peak_firing_rate';
    const eventScopeVerification = verifyResponseEventScope(data.eventScope);
    if (!eventScopeVerification.ok) {
      return fail(
        'SCIENCE_EVENT_SCOPE_UNVERIFIABLE',
        'science',
        eventScopeVerification.message,
        `/data${eventScopeVerification.path}`,
      );
    }
    const eventScopeAuthority = eventScopeVerification.authority;
    let rateAuthority: RateAuthorityResult | undefined;
    if (rateResponse) {
      rateAuthority = verifyResponseRateAuthority(
        response?.rateNormalization,
        data.eventScope,
      );
      if (!rateAuthority.ok) {
        return fail(
          rateAuthority.path.startsWith('/eventScope')
            ? 'SCIENCE_EVENT_SCOPE_UNVERIFIABLE'
            : 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          rateAuthority.message,
          rateAuthority.path === '/rateNormalization'
            ? `/data/${mode === 'aggregates' ? 'aggregates' : 'observations'}/response/rateNormalization`
            : `/data${rateAuthority.path}`,
        );
      }
    }
    let peakBasisVerification: PeakBasisVerification | undefined;
    let binnedPeakValueLatticeVerification:
      BinnedPeakValueLatticeVerification | undefined;
    if (responseMethod === 'peak_firing_rate') {
      peakBasisVerification = verifyPeakBasisAgainstWindow(
        response?.basis,
        data.measurementWindow,
      );
      if (!peakBasisVerification.ok) {
        return fail(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          peakBasisVerification.message,
          peakBasisVerification.path === '/measurementWindow'
            ? '/data/measurementWindow'
            : `/data/${mode === 'aggregates' ? 'aggregates' : 'observations'}/response${peakBasisVerification.path}`,
        );
      }
      if (
        mode === 'aggregates' &&
        peakBasisVerification.kind === 'binned_count' &&
        rateAuthority?.ok === true
      ) {
        binnedPeakValueLatticeVerification = verifyBinnedPeakValueLattice(
          responseValues,
          response?.basis,
          response?.unit,
          rateAuthority.integerDivisor,
          mode,
          parameters.estimator,
          mode === 'aggregates' ? arr(aggregates?.sampleCounts) : undefined,
        );
        if (!binnedPeakValueLatticeVerification.ok) {
          const responseBase =
            `/data/${mode === 'aggregates' ? 'aggregates' : 'observations'}/response`;
          const instancePath =
            binnedPeakValueLatticeVerification.path.startsWith('/values/')
              ? `${responseBase}${binnedPeakValueLatticeVerification.path}`
              : binnedPeakValueLatticeVerification.path.startsWith('/sampleCounts')
                ? `/data/aggregates${binnedPeakValueLatticeVerification.path}`
                : binnedPeakValueLatticeVerification.path === '/estimator'
                  ? '/parameters/estimator'
                  : `${responseBase}${binnedPeakValueLatticeVerification.path}`;
          return fail(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            binnedPeakValueLatticeVerification.message,
            instancePath,
          );
        }
      }
    }
    const responseAudit = rec(response?.audit);
    const rawAuditedEventCounts = arr(responseAudit?.eventCounts);
    const auditedEventCounts = rawAuditedEventCounts
      ? rawAuditedEventCounts.map((value) =>
        value === null ? null : typeof value === 'number' ? value : Number.NaN,
      )
      : undefined;
    const rawAuditedPeakBinCounts = arr(responseAudit?.peakBinCounts);
    const auditedPeakBinCounts = rawAuditedPeakBinCounts
      ? rawAuditedPeakBinCounts.map((value) =>
        value === null ? null : typeof value === 'number' ? value : Number.NaN,
      )
      : undefined;
    const definedPeakValueCount = responseMethod === 'peak_firing_rate'
      ? responseValues.filter((value) => value !== null).length
      : 0;
    const undefinedPeakValueCount = responseMethod === 'peak_firing_rate'
      ? responseValues.length - definedPeakValueCount
      : 0;
    const binnedPeakLatticeCheckedValueCount =
      binnedPeakValueLatticeVerification?.ok === true
        ? binnedPeakValueLatticeVerification.checkedValueCount
        : null;
    const hasCheckedBinnedPeakLatticeValue =
      binnedPeakLatticeCheckedValueCount !== null &&
      binnedPeakLatticeCheckedValueCount > 0;
    const definedAuditedPeakBinCount = auditedPeakBinCounts
      ? auditedPeakBinCounts.filter((count) => count !== null).length
      : 0;
    const hasDefinedAuditedPeakBinCounts = definedAuditedPeakBinCount > 0;
    const definedAuditedEventCount = auditedEventCounts
      ? auditedEventCounts.filter((count) => count !== null).length
      : 0;
    const hasDefinedAuditedEventCounts = definedAuditedEventCount > 0;
    if (
      mode === 'repeats' &&
      peakBasisVerification?.ok === true &&
      peakBasisVerification.kind === 'binned_count'
    ) {
      if (!auditedPeakBinCounts) {
        return fail(
          'SCIENCE_NORMALIZATION_UNVERIFIABLE',
          'science',
          'raw binned-count peaks require exact parallel peakBinCounts so repeat rates and condition estimators can be re-derived without mode-dependent rounding',
          '/data/observations/response/audit/peakBinCounts',
        );
      }
      if (auditedPeakBinCounts.length !== responseValues.length) {
        return fail(
          'SEMANTIC_LENGTH_MISMATCH',
          'semantic',
          'response.audit.peakBinCounts must be parallel to raw binned-peak response values',
          '/data/observations/response/audit/peakBinCounts',
        );
      }
      const binnedBasis = rec(response?.basis);
      const binWidth = rec(binnedBasis?.binWidth);
      const binWidthValue = num(binWidth?.value);
      const binWidthUnit = binWidth?.unit as string | undefined;
      const rateUnit = response?.unit as string | undefined;
      for (let index = 0; index < auditedPeakBinCounts.length; index++) {
        const peakBinCount = auditedPeakBinCounts[index];
        const suppliedRate = responseValues[index];
        if (
          peakBinCount !== null &&
          (!Number.isSafeInteger(peakBinCount) || peakBinCount < 0)
        ) {
          return fail(
            'SCIENCE_COUNT_NOT_INTEGER',
            'science',
            'audited peak-bin counts must be exact non-negative safe integers or null',
            `/data/observations/response/audit/peakBinCounts/${index}`,
          );
        }
        if ((peakBinCount === null) !== (suppliedRate === null)) {
          return fail(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            'an audited peak-bin count must be null exactly where its response is null',
            `/data/observations/response/audit/peakBinCounts/${index}`,
          );
        }
        if (
          peakBinCount !== null &&
          suppliedRate !== null &&
          rateAuthority?.ok === true &&
          binWidthValue !== undefined &&
          binWidthUnit &&
          rateUnit
        ) {
          let expectedRate: number;
          try {
            expectedRate = deriveExactAggregateCountRateInUnit(
              BigInt(peakBinCount),
              rateAuthority.integerDivisor,
              1,
              binWidthValue,
              binWidthUnit,
              rateUnit,
            );
          } catch (error) {
            return fail(
              'SCIENCE_NORMALIZATION_UNVERIFIABLE',
              'science',
              `the raw binned-peak rate could not be re-derived from its exact max-bin count (${error instanceof Error ? error.message : 'numeric failure'})`,
              `/data/observations/response/values/${index}`,
            );
          }
          if ((suppliedRate === 0 ? 0 : suppliedRate) !== expectedRate) {
            return fail(
              'SCIENCE_NORMALIZATION_UNVERIFIABLE',
              'science',
              `raw binned-peak rate ${suppliedRate} ${rateUnit} does not equal the one-round exact rate ${expectedRate} ${rateUnit} derived from peak-bin count ${peakBinCount}, divisor ${rateAuthority.integerDivisor}, and bin width ${binWidthValue} ${binWidthUnit}`,
              `/data/observations/response/values/${index}`,
            );
          }
        }
      }
    } else if (auditedPeakBinCounts) {
      return fail(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        'peakBinCounts is legal only for raw binned-count peak responses',
        `/data/${mode === 'aggregates' ? 'aggregates' : 'observations'}/response/audit/peakBinCounts`,
      );
    }
    if (auditedEventCounts) {
      if (auditedEventCounts.length !== responseValues.length) {
        return fail(
          'SEMANTIC_LENGTH_MISMATCH',
          'semantic',
          'response.audit.eventCounts must be parallel to response.values',
          '/data/observations/response/audit/eventCounts',
        );
      }
      const auditWindow = rec(data.measurementWindow);
      const auditWindowStart = num(auditWindow?.start);
      const auditWindowStop = num(auditWindow?.stop);
      const auditWindowUnit = auditWindow?.unit as string | undefined;
      const auditedRateUnit = response?.unit as string | undefined;
      for (let index = 0; index < auditedEventCounts.length; index++) {
        const eventCount = auditedEventCounts[index];
        if (eventCount !== null && (!Number.isSafeInteger(eventCount) || eventCount < 0)) {
          return fail(
            'SCIENCE_COUNT_NOT_INTEGER',
            'science',
            'audited event counts must be exact non-negative safe integers or null',
            `/data/observations/response/audit/eventCounts/${index}`,
          );
        }
        if ((eventCount === null) !== (responseValues[index] === null)) {
          return fail(
            'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            'science',
            'an audited event count must be null exactly where its response is null',
            `/data/observations/response/audit/eventCounts/${index}`,
          );
        }
        const suppliedRate = responseValues[index];
        if (
          eventCount !== null &&
          suppliedRate !== null &&
          auditWindowStart !== undefined &&
          auditWindowStop !== undefined &&
          auditWindowUnit &&
          auditedRateUnit &&
          dimensionOf(auditWindowUnit) === 'time' &&
          dimensionOf(auditedRateUnit) === 'frequency'
        ) {
          let expectedRate: number;
          try {
            expectedRate = deriveExactCountRateInUnit(
              eventCount,
              rateAuthority?.ok === true ? rateAuthority.integerDivisor : 1,
              auditWindowStart,
              auditWindowStop,
              auditWindowUnit,
              auditedRateUnit,
            );
          } catch (error) {
            const detail = error instanceof Error ? error.message : 'numeric conversion failed';
            return fail(
              'SCIENCE_NORMALIZATION_UNVERIFIABLE',
              'science',
              `the per-repeat mean-rate audit could not be re-derived (${detail})`,
              `/data/observations/response/values/${index}`,
            );
          }
          if ((suppliedRate === 0 ? 0 : suppliedRate) !== expectedRate) {
            return fail(
              'SCIENCE_NORMALIZATION_UNVERIFIABLE',
              'science',
              `supplied mean rate ${suppliedRate} ${auditedRateUnit} does not equal the one-round exact ${rateAuthority?.ok === true ? rateAuthority.normalization : 'declared normalization'} derived from audited count ${eventCount}, integer divisor ${rateAuthority?.ok === true ? rateAuthority.integerDivisor : 1}, and the exact typed measurement window; the derived value is ${expectedRate} ${auditedRateUnit}`,
              `/data/observations/response/values/${index}`,
            );
          }
        }
      }
    }
    const uncertainty = rec(parameters.uncertainty);
    const uncertaintyKind = (uncertainty?.kind as string) ?? 'none';
    if (uncertaintyKind !== 'none') {
      return fail(
        'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
        'science',
        `response-curve uncertainty variant ${uncertaintyKind} is not drawable in the current build. Cortexel refuses to drop or reinterpret it.`,
        '/parameters/uncertainty',
      );
    }
    if (
      responseMethod === 'first_spike_latency' &&
      response?.latencyReference !== 'measurement_window_start'
    ) {
      return fail(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        'revision 2 supports first-spike latency only from measurement_window_start; stimulus onset has no typed coordinate relative to the window',
        `/data/${mode === 'aggregates' ? 'aggregates' : 'observations'}/response/latencyReference`,
      );
    }
    if (
      responseMethod === 'first_spike_latency' &&
      response?.latencyReference === 'measurement_window_start'
    ) {
      const window = rec(data.measurementWindow);
      const windowStart = num(window?.start);
      const windowStop = num(window?.stop);
      const windowUnit = window?.unit as string | undefined;
      const responseUnit = response?.unit as string | undefined;
      if (
        windowStart !== undefined &&
        windowStop !== undefined &&
        windowUnit &&
        responseUnit &&
        dimensionOf(windowUnit) === dimensionOf(responseUnit)
      ) {
        const closedStop = window?.boundary === '[start,stop]';
        for (let index = 0; index < responseValues.length; index++) {
          const latency = responseValues[index];
          if (latency === null || latency < 0) continue;
          const comparison = compareExactUnitArraySumToDifference(
            [latency],
            responseUnit,
            { value: windowStart, unit: windowUnit },
            { value: windowStop, unit: windowUnit },
          );
          if (comparison > 0 || (comparison === 0 && !closedStop)) {
            return fail(
              'SCIENCE_LATENCY_OUTSIDE_WINDOW',
              'science',
              `first-spike latency ${latency} ${responseUnit} is referenced to the measurement-window start but lies outside the declared ${closedStop ? 'closed' : 'half-open'} window.`,
              `/data/${mode === 'aggregates' ? 'aggregates' : 'observations'}/response/values/${index}`,
            );
          }
        }
      }
    }

    const derived = deriveResponseCurve({
      conditions: {
        axis,
        ids: conditionIds,
        ...(conditionLabels ? { labels: conditionLabels } : {}),
        ...(axis === 'numeric'
          ? {
            inputValues,
            inputScale: (inputRec?.scale as 'linear' | 'log10') ?? 'linear',
          }
          : {}),
      },
      estimator: parameters.estimator as 'mean' | 'median' | 'trimmed_mean',
      responseMethod: responseMethod as
        | 'mean_firing_rate'
        | 'peak_firing_rate'
        | 'first_spike_latency'
        | 'event_count',
      repeatDesign,
      ...(typeof parameters.trimFraction === 'number'
        ? { trimFraction: parameters.trimFraction }
        : {}),
      ...(mode === 'repeats' &&
        peakBasisVerification?.ok === true &&
        peakBasisVerification.kind === 'binned_count' &&
        auditedPeakBinCounts &&
        rateAuthority?.ok === true
        ? {
          binnedPeakAudit: {
            peakBinCounts: auditedPeakBinCounts,
            integerDivisor: rateAuthority.integerDivisor,
            binWidthValue: num(rec(rec(response?.basis)?.binWidth)?.value)!,
            binWidthUnit: rec(rec(response?.basis)?.binWidth)?.unit as string,
            rateUnit: response?.unit as string,
          },
        }
        : {}),
      ...(mode === 'repeats'
        ? {
          repeats: {
            conditionIds: (arr(observations?.conditionIds) ?? []) as string[],
            repeatIds: (arr(observations?.repeatIds) ?? []) as string[],
            responses: responseValues,
            attemptedCounts: (arr(observations?.attemptedCounts) ?? []).map((value) =>
              typeof value === 'number' ? value : Number.NaN,
            ),
          },
        }
        : {
          aggregates: {
            responses: responseValues,
            sampleCounts: (arr(aggregates?.sampleCounts) ?? []).map((value) =>
              value === null ? null : typeof value === 'number' ? value : Number.NaN,
            ),
            excludedCounts: (arr(aggregates?.excludedCounts) ?? []).map((value) =>
              typeof value === 'number' ? value : Number.NaN,
            ),
            ...(aggregateTrimmedCounts
              ? {
                trimmedCounts: aggregateTrimmedCounts.map((value) =>
                  typeof value === 'number' ? value : Number.NaN,
                ),
              }
              : {}),
          },
        }),
    });
    if (!derived.ok) {
      const { issue } = derived;
      if (issue.code === 'length_mismatch') {
        return fail('SEMANTIC_LENGTH_MISMATCH', 'semantic', issue.message, issue.path);
      }
      if (issue.code === 'duplicate_condition' || issue.code === 'duplicate_repeat') {
        return fail('SEMANTIC_DUPLICATE_ID', 'semantic', issue.message, issue.path);
      }
      if (issue.code === 'duplicate_input') {
        return fail('SCIENCE_RESPONSE_INPUT_DUPLICATE', 'science', issue.message, issue.path);
      }
      if (issue.code === 'unknown_condition') {
        return fail('SEMANTIC_UNKNOWN_REFERENCE', 'semantic', issue.message, issue.path);
      }
      if (issue.code === 'paired_repeats_incomplete') {
        return fail('SCIENCE_PAIRED_REPEATS_INCOMPLETE', 'science', issue.message, issue.path);
      }
      if (issue.code === 'attempted_count_mismatch') {
        return fail('SCIENCE_NORMALIZATION_UNVERIFIABLE', 'science', issue.message, issue.path);
      }
      if (issue.code === 'count_not_integer') {
        return fail('SCIENCE_COUNT_NOT_INTEGER', 'science', issue.message, issue.path);
      }
      if (issue.code === 'count_estimator_incoherent') {
        return fail('SCIENCE_COUNT_ESTIMATOR_INCOHERENT', 'science', issue.message, issue.path);
      }
      if (issue.code === 'rate_audit_incoherent') {
        return fail('SCIENCE_NORMALIZATION_UNVERIFIABLE', 'science', issue.message, issue.path);
      }
      if (issue.code === 'trimmed_count_incoherent') {
        return fail('SCIENCE_NORMALIZATION_UNVERIFIABLE', 'science', issue.message, issue.path);
      }
      if (issue.code === 'invalid_response_value') {
        return fail('SCIENCE_RESPONSE_VALUE_INVALID', 'science', issue.message, issue.path);
      }
      if (issue.code === 'nonpositive_log_input') {
        return fail('RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN', 'render', issue.message, issue.path);
      }
      return fail(
        issue.message.includes('binary64') || issue.code === 'invalid_numeric'
          ? 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE'
          : 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        issue.message,
        issue.path,
      );
    }

    const curve = derived.result;
    const responseUnit = (response?.unit as string) ?? '1';
    const inputUnit = axis === 'numeric' ? ((inputRec?.unit as string) ?? '1') : null;
    const inputLabel = axis === 'numeric'
      ? ((inputRec?.label as string) ?? 'input')
      : ((conditions?.inputLabel as string) ?? 'condition');
    const inputUnitLabel = axis === 'numeric' ? unitLabel(inputUnit!) : '';
    const xLabel = axis === 'numeric'
      ? inputUnitLabel ? `${inputLabel} (${inputUnitLabel})` : inputLabel
      : inputLabel;
    const responseLabel = responseMethod.replaceAll('_', ' ');
    const responseUnitLabel = unitLabel(responseUnit);
    const verifiedRateAuthority = rateAuthority?.ok === true ? rateAuthority : undefined;
    const rateAuthorityText = verifiedRateAuthority
      ? responseRateAuthorityText(verifiedRateAuthority)
      : null;
    const rateAxisQualifier = verifiedRateAuthority
      ? responseRateAxisQualifier(verifiedRateAuthority)
      : null;
    const eventAxisQualifier = responseEventAxisQualifier(responseMethod, eventScopeAuthority);
    const qualifiedResponseLabel = `${responseLabel} [${eventAxisQualifier}${rateAxisQualifier ? `; ${rateAxisQualifier}` : ''}]`;
    const yLabel = responseUnitLabel
      ? `${qualifiedResponseLabel} (${responseUnitLabel})`
      : qualifiedResponseLabel;
    const curveLabel = (parameters.curveLabel as string) ?? (parameters.curveId as string) ?? responseLabel;
    const window = rec(data.measurementWindow) ?? {};
    const windowBoundary = (window.boundary as string) ?? '[start,stop)';
    const windowStart = num(window.start) ?? 0;
    const windowStop = num(window.stop) ?? 0;
    const windowUnit = (window.unit as string) ?? 'ms';
    const windowBasis = `${windowBoundary} ${exactNumberText(windowStart)} to ${exactNumberText(windowStop)} ${windowUnit}`;
    const eventMembershipText = responseEventMembershipText(eventScopeAuthority);
    const eventScopeText = responseEventScopeText(eventScopeAuthority);
    const normalizedEventScope = eventScopeAuthority.normalizedScope;
    const eventScopeDigest = canonicalDigest(normalizedEventScope);
    let responseBasis = rateAuthorityText
      ? `caller-declared event scope ${eventScopeText}; rate normalization ${rateAuthorityText}; measurement window ${windowBasis}`
      : `caller-declared event scope ${eventScopeText}; measurement window ${windowBasis}`;
    if (responseMethod === 'first_spike_latency') {
      responseBasis = `caller-declared event scope ${eventScopeText}; latency is the first selected spike (the minimum over the superposed union for a pooled scope) from ${(response?.latencyReference as string) ?? 'unspecified reference'}; measurement window ${windowBasis}`;
    } else if (responseMethod === 'peak_firing_rate') {
      responseBasis = auditedPeakBinCounts
        ? hasDefinedAuditedPeakBinCounts
          ? `caller-declared event scope ${eventScopeText}; caller-supplied exact max-bin counts after the declared sender pooling; defined repeat rates and defined ${String(parameters.estimator)} condition estimates re-derived at count level with one final rounding; ${rateAuthorityText}; ${peakEstimatorBasisText(response?.basis)}; measurement window ${windowBasis}`
          : `caller-declared event scope ${eventScopeText}; caller-supplied peak-bin count audit contained only nulls; null-mask alignment was verified, but no repeat rate or condition estimate existed to re-derive; ${rateAuthorityText}; ${peakEstimatorBasisText(response?.basis)}; measurement window ${windowBasis}`
        : definedPeakValueCount > 0
          ? `caller-declared event scope ${eventScopeText}; caller-supplied peak value after the declared sender pooling; ${rateAuthorityText}; ${peakEstimatorBasisText(response?.basis)}; measurement window ${windowBasis}`
          : `caller-declared event scope ${eventScopeText}; no defined peak value was supplied; ${rateAuthorityText}; ${peakEstimatorBasisText(response?.basis)}; measurement window ${windowBasis}`;
    }

    const tableRows: (string | number | null)[][] = [];
    for (const condition of curve.conditions) {
      if (mode === 'repeats') {
        for (const repeat of condition.repeats) {
          tableRows.push([
            condition.conditionId,
            condition.conditionLabel,
            condition.input,
            inputUnit,
            repeat.repeatId,
            repeat.response,
            responseUnit,
            responseMethod,
            verifiedRateAuthority?.normalization ?? null,
            eventScopeAuthority.recordedSenderCount,
            repeat.response === null ? 'true' : 'false',
            null,
            null,
            null,
            responseBasis,
            null,
            null,
            null,
            null,
            null,
            repeat.estimatorRole,
            null,
            auditedPeakBinCounts?.[repeat.sourceOrdinal] ?? null,
            repeat.response !== null && hasDefinedAuditedPeakBinCounts
              ? 'exact_peak_bin_count_to_condition_estimator_rate_one_round'
              : null,
            eventScopeAuthority.kind,
            eventScopeAuthority.selectionId,
            eventMembershipText,
            eventScopeAuthority.selectedEventTrainCount,
          ]);
        }
      }
      tableRows.push([
        condition.conditionId,
        condition.conditionLabel,
        condition.input,
        inputUnit,
        null,
        condition.estimate,
        responseUnit,
        responseMethod,
        verifiedRateAuthority?.normalization ?? null,
        eventScopeAuthority.recordedSenderCount,
        condition.estimate === null ? 'true' : 'false',
        parameters.estimator as string,
        condition.sampleCount,
        condition.excludedCount,
        responseBasis,
        uncertaintyKind,
        null,
        null,
        null,
        null,
        'aggregate_estimate',
        condition.trimmedCount,
        null,
        condition.estimate !== null && hasDefinedAuditedPeakBinCounts
          ? 'exact_peak_bin_count_to_condition_estimator_rate_one_round'
          : null,
        eventScopeAuthority.kind,
        eventScopeAuthority.selectionId,
        eventMembershipText,
        eventScopeAuthority.selectedEventTrainCount,
      ]);
    }

    const aggregateSampleCounts = curve.conditions
      .map((condition) => condition.retainedCount)
      .filter((count) => count > 0);
    const aggregateSampleCountExtent = finiteExtent(aggregateSampleCounts);
    const aggregateSampleCountBase = aggregateSampleCounts.length === 0
      ? '0 retained in every condition'
      : aggregateSampleCountExtent!.min === aggregateSampleCountExtent!.max
        ? String(aggregateSampleCounts[0])
        : `${aggregateSampleCountExtent!.min}-${aggregateSampleCountExtent!.max} by condition`;
    const aggregateSampleCount = curve.conditionsWithoutEstimate > 0 && aggregateSampleCounts.length > 0
      ? `${aggregateSampleCountBase} where defined; ${curve.conditionsWithoutEstimate} condition${curve.conditionsWithoutEstimate === 1 ? '' : 's'} undefined`
      : aggregateSampleCountBase;
    const missingValueCount = curve.excludedCount;
    const derivedFacts: Partial<DisclosureFacts> = {
      ...(missingValueCount > 0 ? { missingValueCount } : {}),
      eventScopeMembershipCardinalityOnly:
        eventScopeAuthority.membershipKind === 'cardinality_only',
      eventScopeExternalAuthorityDeclared: true,
      ...(mode === 'aggregates'
        ? {
          aggregateEstimator: parameters.estimator as string,
          aggregateSampleCount,
        }
        : {}),
    };
    const lineStatement = axis === 'nominal'
      ? 'No guide line is drawn because the condition axis is nominal.'
      : 'A straight guide joins only adjacent defined conditions; gaps break it, and it is neither a fit nor interpolation.';
    const responseExtent = finiteExtent(curve.conditions
      .map((condition) => condition.estimate)
      .filter((value): value is number => value !== null));
    const responseRangeStatement = responseExtent
      ? `Response ranges from ${exactNumberText(responseExtent.min)} to ${exactNumberText(responseExtent.max)} ${responseUnit}.`
      : 'No declared condition has a usable response estimate.';
    const conditionCoverageStatement = curve.conditionsWithoutEstimate === 0
      ? `${curve.conditions.length} ${axis} conditions; every declared condition has a usable estimate.`
      : curve.conditionsWithoutEstimate === 1
        ? `${curve.conditions.length} ${axis} conditions; 1 condition has no usable estimate and retains an explicit gap.`
        : `${curve.conditions.length} ${axis} conditions; ${curve.conditionsWithoutEstimate} conditions have no usable estimate and retain explicit gaps.`;
    const summaryStatements = [
      `Response curve ${curveLabel}: ${responseMethod} in ${responseUnit}${rateAuthorityText ? ` with ${rateAuthorityText}` : ''} against ${inputLabel}${inputUnit ? ` in ${inputUnit}` : ''} on a ${curve.inputScale ?? axis} scale. Declared repeat design: ${String(parameters.repeatDesign)}.`,
      `Caller-declared event scope: ${eventScopeText}. Cortexel verified the internal structure and bindings, not the claim against an external recorder.`,
      conditionCoverageStatement,
      `Estimator ${String(parameters.estimator)} retained ${curve.retainedCount} of ${curve.attemptedCount} attempted repeats; ${curve.trimmedCount} defined responses were removed symmetrically by trimming and ${curve.excludedCount} undefined responses were excluded and counted.`,
      `Measurement window ${windowBasis}.`,
      `Response basis: ${responseBasis}.`,
      ...(responseMethod === 'peak_firing_rate'
        ? definedPeakValueCount > 0
          ? ['Defined peak values were supplied by the caller; Cortexel verified basis consistency but did not rederive peaks from unavailable event trains.']
          : ['No defined peak value was supplied; Cortexel verified the declared estimator basis and retained the explicit gaps.']
        : []),
      ...(auditedPeakBinCounts && hasDefinedAuditedPeakBinCounts
        ? ['For raw binned peaks, exact max-bin counts were supplied: Cortexel re-derived every defined repeat rate and formed each defined condition estimator at count level before one final rounding into the declared rate unit.']
        : auditedPeakBinCounts
          ? [`The raw binned-peak audit contained 0 defined max-bin counts and ${auditedPeakBinCounts.length} null entries; Cortexel verified null-mask alignment, but no repeat rate or condition estimator existed to re-derive.`]
        : []),
      responseRangeStatement,
      mode === 'aggregates'
        ? 'Only per-condition aggregates were supplied; individual repeats and pairing cannot be inspected.'
        : 'Raw attempted repeats are retained in deterministic condition and repeat order in the data table.',
      lineStatement,
    ];
    const operationOutput = {
      axis,
      inputScale: curve.inputScale,
      inputUnit,
      responseMethod,
      responseUnit,
      normalizedDeclaredEventScope: normalizedEventScope,
      eventScopeDigest,
      rateNormalization: verifiedRateAuthority?.normalization ?? null,
      declaredRecordedSenderCount: eventScopeAuthority.recordedSenderCount,
      structurallyDerivedSelectedEventTrainCount: eventScopeAuthority.selectedEventTrainCount,
      rateIntegerDivisor: verifiedRateAuthority?.integerDivisor ?? null,
      responseBasis,
      peakBasis: responseMethod === 'peak_firing_rate' ? response?.basis : null,
      peakBasisUniformExposureVerified:
        peakBasisVerification?.ok === true && peakBasisVerification.kind === 'binned_count'
          ? peakBasisVerification.uniformExposureVerified
          : null,
      binnedPeakValueLatticeVerified:
        hasCheckedBinnedPeakLatticeValue ? true : null,
      binnedPeakValueLatticeCheckedValueCount:
        binnedPeakLatticeCheckedValueCount,
      binnedPeakValueLatticeEstimatorDenominatorMinimum:
        binnedPeakValueLatticeVerification?.ok === true
          ? binnedPeakValueLatticeVerification.estimatorDenominatorMinimum
          : null,
      binnedPeakValueLatticeEstimatorDenominatorMaximum:
        binnedPeakValueLatticeVerification?.ok === true
          ? binnedPeakValueLatticeVerification.estimatorDenominatorMaximum
          : null,
      estimator: parameters.estimator,
      conditions: curve.conditions.map((condition) => ({
        conditionId: condition.conditionId,
        conditionLabel: condition.conditionLabel,
        input: condition.input,
        estimate: condition.estimate,
        attemptedCount: condition.attemptedCount,
        sampleCount: condition.sampleCount,
        retainedCount: condition.retainedCount,
        trimmedCount: condition.trimmedCount,
        excludedCount: condition.excludedCount,
      })),
      repeats: curve.sortedRepeats.map((repeat) => ({
        conditionId: repeat.conditionId,
        repeatId: repeat.repeatId,
        response: repeat.response,
        peakBinCount: auditedPeakBinCounts?.[repeat.sourceOrdinal] ?? null,
        estimatorRole: repeat.estimatorRole,
      })),
    };
    const sourceOrdinals = curve.sortedRepeats.map((repeat) => repeat.sourceOrdinal);
    const derivationOperation: DerivationOperation = {
      id: 'response_curve.estimate_by_condition',
      algorithm: 'cortexel.response_curve.exact_condition_estimator',
      algorithmRevision: 1,
      parameters: {
        mode,
        axis,
        inputScale: curve.inputScale,
        estimator: parameters.estimator,
        responseMethod,
        normalizedDeclaredEventScope: normalizedEventScope,
        eventScopeDigest,
        rateNormalization: verifiedRateAuthority?.normalization ?? null,
        declaredRecordedSenderCount: eventScopeAuthority.recordedSenderCount,
        structurallyDerivedSelectedEventTrainCount: eventScopeAuthority.selectedEventTrainCount,
        rateIntegerDivisor: verifiedRateAuthority?.integerDivisor ?? null,
        peakBasis: responseMethod === 'peak_firing_rate' ? response?.basis : null,
        peakBasisUniformExposurePolicy:
          peakBasisVerification?.ok === true && peakBasisVerification.kind === 'binned_count'
            ? 'exact_physical_endpoint_difference_equals_typed_bin_width_every_interval'
            : null,
        peakBinCountAudit:
          auditedPeakBinCounts
            ? 'required_parallel_exact_max_bin_counts'
            : null,
        peakCountDerivationAlgorithm:
          hasDefinedAuditedPeakBinCounts
            ? 'exact_peak_bin_count_to_condition_estimator_rate_one_round'
            : null,
        repeatDesign,
        ...(typeof parameters.trimFraction === 'number'
          ? { trimFraction: parameters.trimFraction }
          : {}),
        missingPolicy: 'exclude_null_and_count',
        numericConditionOrder: 'unique_input_ascending',
        categoricalConditionOrder: 'declared',
        repeatOrder: 'condition_then_code_unit_repeat_id_then_source_ordinal',
        trimBoundaryTieOrder:
          mode !== 'repeats'
            ? null
            : auditedPeakBinCounts
              ? hasDefinedAuditedPeakBinCounts
                ? 'exact_peak_bin_count_then_code_unit_repeat_id_then_source_ordinal'
                : null
              : 'numeric_response_then_code_unit_repeat_id_then_source_ordinal',
        nominalGuide: 'none',
        orderedGuide: 'adjacent_defined_conditions_only',
      },
      inputDigest: canonicalDigest({
        mode,
        conditions,
        measurementWindow: data.measurementWindow,
        normalizedEventScope,
        ...(mode === 'repeats' ? { observations } : { aggregates }),
        ...(verifiedRateAuthority
          ? {
            rateNormalization: verifiedRateAuthority.normalization,
            declaredRecordedSenderCount: verifiedRateAuthority.recordedSenderCount,
            rateIntegerDivisor: verifiedRateAuthority.integerDivisor,
          }
          : {}),
        estimator: parameters.estimator,
        responseMethod,
        repeatDesign,
        ...(typeof parameters.trimFraction === 'number'
          ? { trimFraction: parameters.trimFraction }
          : {}),
      }),
      outputDigest: canonicalDigest(operationOutput),
      receipt: {
        rawRepeatsSupplied: curve.rawRepeatsSupplied,
        submittedRowsMatchDeclaredAttemptedCounts:
          mode === 'repeats' ? true : null,
        declaredPairedRepeatIdSetsEqual:
          mode === 'repeats' && repeatDesign === 'paired' ? true : null,
        conditionOrder: curve.conditions.map((condition) => condition.conditionId),
        attemptedCount: curve.attemptedCount,
        retainedCount: curve.retainedCount,
        trimmedCount: curve.trimmedCount,
        excludedCount: curve.excludedCount,
        conditionsWithoutEstimate: curve.conditionsWithoutEstimate,
        eventScopeVariantRecognized: true,
        eventScopeSelectionIdStructurallyValid: true,
        eventKindAndCompletenessLiteralsValidated: true,
        eventPoolingLiteralMatchesVariant: true,
        rateNormalizationScopeCompatibilityVerified: verifiedRateAuthority ? true : null,
        declaredEventScopeKind: eventScopeAuthority.kind,
        declaredEventSelectionId: eventScopeAuthority.selectionId,
        declaredEventKind: eventScopeAuthority.eventKind,
        declaredEventCompleteness: eventScopeAuthority.eventCompleteness,
        declaredEventPoolingOperator: eventScopeAuthority.poolingOperator,
        declaredEventMembershipBinding: eventScopeAuthority.membershipKind,
        structurallyDerivedSelectedEventTrainCount: eventScopeAuthority.selectedEventTrainCount,
        declaredRecordedSenderCount: eventScopeAuthority.recordedSenderCount,
        explicitMemberIdentifiersUniqueVerified:
          eventScopeAuthority.membershipKind === 'explicit_sender_ids' ? true : null,
        explicitMemberIdentifierCountMatchVerified:
          eventScopeAuthority.membershipKind === 'explicit_sender_ids' ? true : null,
        explicitMemberIdentifierOrderNormalizedForSemanticDigest:
          eventScopeAuthority.membershipKind === 'explicit_sender_ids' ? true : null,
        declaredMembershipCanonicalizationId:
          eventScopeAuthority.membershipKind === 'canonical_sender_ids_digest'
            ? RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID
            : eventScopeAuthority.membershipKind === 'explicit_sender_ids'
              ? RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID
              : null,
        derivedExplicitMembershipDigest:
          eventScopeAuthority.membershipKind === 'explicit_sender_ids'
            ? responseEventMembershipDigest(
              (arr(rec(eventScopeAuthority.normalizedScope.membershipBinding)?.senderIds) ?? []) as string[],
            )
            : null,
        canonicalMembershipDigestSyntaxAndCanonicalizationVerified:
          eventScopeAuthority.membershipKind === 'canonical_sender_ids_digest' ? true : null,
        canonicalMembershipPreimageMatchVerification:
          eventScopeAuthority.membershipKind === 'canonical_sender_ids_digest'
            ? 'not_evaluable_preimage_unavailable'
            : null,
        canonicalMembershipPreimageCardinalityVerification:
          eventScopeAuthority.membershipKind === 'canonical_sender_ids_digest'
            ? 'not_evaluable_preimage_unavailable'
            : null,
        externalEventScopeClaimsVerification: 'not_performed_source_unavailable',
        externalMemberIdentifierReferentsVerification: 'not_performed_source_unavailable',
        eventScopeDigest,
        rateNormalization: verifiedRateAuthority?.normalization ?? null,
        rateIntegerDivisor: verifiedRateAuthority?.integerDivisor ?? null,
        peakBasisVerified:
          responseMethod === 'peak_firing_rate' ? true : null,
        callerSuppliedPeakValue:
          responseMethod === 'peak_firing_rate' && definedPeakValueCount > 0 ? true : null,
        peakValueRecomputed:
          responseMethod === 'peak_firing_rate' && definedPeakValueCount > 0 ? false : null,
        definedPeakValueCount:
          responseMethod === 'peak_firing_rate' ? definedPeakValueCount : null,
        undefinedPeakValueCount:
          responseMethod === 'peak_firing_rate' ? undefinedPeakValueCount : null,
        peakBasisKind: peakBasisVerification?.ok === true
          ? peakBasisVerification.kind
          : null,
        peakBasisUniformExposureVerified:
          peakBasisVerification?.ok === true && peakBasisVerification.kind === 'binned_count'
            ? peakBasisVerification.uniformExposureVerified
            : null,
        peakBasisMaterializedCount:
          peakBasisVerification?.ok === true && 'materializedCount' in peakBasisVerification
            ? peakBasisVerification.materializedCount
            : null,
        peakBasisWidthOrStepInWindowUnit:
          peakBasisVerification?.ok === true && 'widthInWindowUnit' in peakBasisVerification
            ? peakBasisVerification.widthInWindowUnit
            : peakBasisVerification?.ok === true && 'stepInWindowUnit' in peakBasisVerification
              ? peakBasisVerification.stepInWindowUnit
              : null,
        peakBasisWindowUnit: responseMethod === 'peak_firing_rate' ? windowUnit : null,
        binnedPeakValueLatticeVerified:
          hasCheckedBinnedPeakLatticeValue ? true : null,
        binnedPeakValueLatticeCheckedValueCount:
          binnedPeakLatticeCheckedValueCount,
        binnedPeakValueLatticeEstimatorDenominatorMinimum:
          binnedPeakValueLatticeVerification?.ok === true
            ? binnedPeakValueLatticeVerification.estimatorDenominatorMinimum
            : null,
        binnedPeakValueLatticeEstimatorDenominatorMaximum:
          binnedPeakValueLatticeVerification?.ok === true
            ? binnedPeakValueLatticeVerification.estimatorDenominatorMaximum
            : null,
        binnedPeakValueLatticeAlgorithm:
          hasCheckedBinnedPeakLatticeValue
            ? 'exact_integer_peak_count_estimator_lattice_one_round_equality'
            : null,
        peakBinCountsSupplied:
          mode === 'repeats' &&
          peakBasisVerification?.ok === true &&
          peakBasisVerification.kind === 'binned_count'
            ? true
            : null,
        ...(auditedPeakBinCounts
          ? {
            peakBinCountNullMaskVerified: true,
            rawBinnedPeakRatesRederived:
              hasDefinedAuditedPeakBinCounts ? true : null,
            conditionPeakEstimatorDerivedAtCountLevel:
              hasDefinedAuditedPeakBinCounts ? true : null,
            peakBinCountRateUnit: responseUnit,
            peakBinCountRateNormalization: verifiedRateAuthority?.normalization ?? null,
            peakBinCountRecordedSenderCount:
              verifiedRateAuthority?.recordedSenderCount ?? null,
            peakBinCountIntegerDivisor:
              verifiedRateAuthority?.integerDivisor ?? null,
            peakBinCountAlgorithm:
              hasDefinedAuditedPeakBinCounts
                ? 'exact_peak_bin_count_to_condition_estimator_rate_one_round'
                : null,
            peakBinCountEstimatorOrder:
              hasDefinedAuditedPeakBinCounts
                ? 'exact_peak_bin_count_then_code_unit_repeat_id_then_source_ordinal'
                : null,
            sumOfDefinedPeakBinCounts: auditedPeakBinCounts
              .reduce((total, count) => total + BigInt(count ?? 0), 0n)
              .toString(),
            definedPeakBinCount: definedAuditedPeakBinCount,
            undefinedPeakBinCount: auditedPeakBinCounts
              .filter((count) => count === null).length,
          }
          : {}),
        auditEventCountsSupplied:
          mode === 'repeats' && responseMethod === 'mean_firing_rate'
            ? auditedEventCounts !== undefined
            : null,
        ...(auditedEventCounts
          ? {
            auditNullMaskVerified: true,
            auditRateNormalizationVerified:
              hasDefinedAuditedEventCounts ? true : null,
            auditRateUnit: responseUnit,
            auditRateNormalization: verifiedRateAuthority?.normalization ?? null,
            auditRecordedSenderCount: verifiedRateAuthority?.recordedSenderCount ?? null,
            auditIntegerDivisor: verifiedRateAuthority?.integerDivisor ?? null,
            auditNormalizationAlgorithm:
              hasDefinedAuditedEventCounts
                ? 'exact_integer_count_to_declared_rate_unit_one_round_equality'
                : null,
            sumOfDefinedAuditedEventCounts: auditedEventCounts
              .reduce((total, count) => total + BigInt(count ?? 0), 0n)
              .toString(),
            definedAuditedEventCount,
            undefinedAuditedEventCount: auditedEventCounts.filter((count) => count === null).length,
          }
          : {}),
        sourceOrdinals,
        sourceOrdinalDigest: canonicalDigest(sourceOrdinals),
        perCondition: curve.conditions.map((condition) => ({
          conditionId: condition.conditionId,
          attemptedCount: condition.attemptedCount,
          sampleCount: condition.sampleCount,
          retainedCount: condition.retainedCount,
          trimmedCount: condition.trimmedCount,
          excludedCount: condition.excludedCount,
        })),
      },
    };
    const responseCompileContext = topologyDynamicsCompilerContext(
      context(tableRows.length, derivedFacts),
      skillId,
      {
        curveLabel,
        responseMethod,
        responseUnit,
        inputLabel,
        inputUnit: inputUnit ?? 'not applicable',
        inputScale: curve.inputScale ?? axis,
        conditionCount: exactNumberText(curve.conditions.length),
        axisKind: axis,
        eventScopeKind: eventScopeAuthority.kind,
        eventSelectionId: eventScopeAuthority.selectionId,
        eventMembershipBinding: eventMembershipText,
        selectedEventTrainCount: exactNumberText(eventScopeAuthority.selectedEventTrainCount),
        recordedSenderCount: eventScopeAuthority.recordedSenderCount === null
          ? 'not declared'
          : exactNumberText(eventScopeAuthority.recordedSenderCount),
        rateNormalization: verifiedRateAuthority?.normalization ?? 'not applicable',
        estimator: String(parameters.estimator),
        retainedCount: exactNumberText(curve.retainedCount),
        attemptedCount: exactNumberText(curve.attemptedCount),
        trimmedCount: exactNumberText(curve.trimmedCount),
        excludedCount: exactNumberText(curve.excludedCount),
        repeatDesign: String(parameters.repeatDesign),
        responseBasis,
        windowStart: exactNumberText(windowStart),
        windowStop: exactNumberText(windowStop),
        timeUnit: windowUnit,
        responseMin: responseExtent ? exactNumberText(responseExtent.min) : 'undefined',
        responseMax: responseExtent ? exactNumberText(responseExtent.max) : 'undefined',
        uncertaintyStatement: uncertaintyKind === 'none'
          ? `No uncertainty was supplied (${String(uncertainty?.reason ?? 'not_provided')}).`
          : `Uncertainty kind ${uncertaintyKind} was declared.`,
        aggregationStatement: mode === 'aggregates'
          ? 'Only per-condition aggregates were supplied; raw repeats and pairing cannot be inspected.'
          : 'Every attempted raw repeat is retained in deterministic condition and repeat order in the complete table.',
        lineStatement,
      },
    );
    return done(
      compileResponseCurveFigure(
        responseCompileContext,
        curve,
        { xLabel, yLabel, curveLabel, tableRows, summaryStatements },
        skillId,
      ),
      [derivationOperation],
      derivedFacts,
    );
  }

  // ---- PSTH ----------------------------------------------------------------
  if (skillId === 'neuro.psth') {
    const psthBinDeclaration = rec(parameters.bins);
    if (typeof psthBinDeclaration?.finalEdgeInclusive !== 'boolean') {
      return fail(
        'SCIENCE_BIN_EDGES_INVALID',
        'science',
        'PSTH requires an explicit finalEdgeInclusive declaration; it does not inherit the common bin-schema display default.',
        '/parameters/bins/finalEdgeInclusive',
      );
    }
    const resolvedBins = declaredBins(psthBinDeclaration);
    const window = rec(data.relativeWindow);
    if (!resolvedBins || !window) return { pending: rendererId };
    const normalization = String(parameters.normalization);
    const denominatorPolicy = String(parameters.denominatorPolicy);
    const baselineRecord = rec(parameters.baseline);
    const baseline = baselineRecord
      ? {
        mode: 'subtract_mean_rate' as const,
        start: num(baselineRecord.start)!,
        stop: num(baselineRecord.stop)!,
      }
      : undefined;
    const common = {
      bins: {
        edges: resolvedBins.spec.edges,
        unit: resolvedBins.unit,
        boundary: String(psthBinDeclaration.boundary) as '[lo,hi)' | '[lo,hi]',
        finalEdgeInclusive: resolvedBins.spec.finalEdgeInclusive,
      },
      relativeWindow: {
        start: num(window.start)!,
        stop: num(window.stop)!,
        unit: String(window.unit),
        boundary: String(window.boundary) as '[start,stop)' | '[start,stop]',
      },
      normalization: normalization as
        | 'count'
        | 'count_per_trial'
        | 'total_event_rate_per_trial'
        | 'mean_rate_per_selected_sender_per_trial',
      denominatorPolicy: denominatorPolicy as
        | 'uniform_trial_count'
        | 'per_bin_covering_trials',
      ...(parameters.senderExposurePolicy
        ? {
          senderExposurePolicy: String(parameters.senderExposurePolicy) as
            'all_selected_senders_cover_every_counted_trial_bin',
        }
        : {}),
      ...(baseline ? { baseline } : {}),
    };
    const nullableNumbers = (value: unknown): (number | null)[] =>
      (arr(value) ?? []).map((entry) => entry === null ? null : Number(entry));

    let psth;
    try {
      if (data.mode === 'prebinned') {
        const supplied = rec(data.rates);
        psth = derivePsth({
          ...common,
          mode: 'prebinned',
          trialIds: strings(data.trialIds),
          alignmentTimes: numbers(data.alignmentTimes),
          alignmentUnit: String(data.alignmentUnit),
          counts: nullableNumbers(data.counts),
          trialDenominators: nullableNumbers(data.trialDenominators),
          recordedSenderCount: num(data.recordedSenderCount)!,
          includedTrialCount: num(data.includedTrialCount)!,
          excludedTrialCount: num(data.excludedTrialCount)!,
          ...(supplied
            ? {
              suppliedValues: {
                kind: String(supplied.kind),
                unit: String(supplied.unit),
                values: nullableNumbers(supplied.values),
              },
            }
            : {}),
        });
      } else {
        const eventTimes = rec(data.eventTimes);
        psth = derivePsth({
          ...common,
          mode: 'events',
          eventTimes: numbers(eventTimes?.values),
          eventTimeUnit: String(eventTimes?.unit),
          eventSenderIds: strings(data.eventSenderIds),
          eventTrialIds: strings(data.eventTrialIds),
          recordedSenderIds: strings(data.recordedSenderIds),
          trialIds: strings(data.trialIds),
          alignmentTimes: numbers(data.alignmentTimes),
          alignmentUnit: String(data.alignmentUnit),
        });
      }
    } catch (error) {
      if (error instanceof PsthDerivationError) {
        return fail(
          error.code,
          error.code.startsWith('RESOURCE_') ? 'budget' : 'science',
          error.message,
          error.instancePath,
        );
      }
      throw error;
    }

    const operationOutput = {
      edges: psth.edges,
      binWidths: psth.binWidths,
      counts: psth.counts,
      trialDenominators: psth.trialDenominators,
      values: psth.values,
      valueUnit: psth.valueUnit,
      baselineCorrectedValues: psth.baselineCorrectedValues,
      baselineRate: psth.baselineRate,
    };
    const operation = derivationOperation(
      'psth.derive',
      'cortexel.psth.exact_counts_normalization_and_baseline',
      {
        normalization,
        denominatorPolicy,
        senderExposurePolicy: parameters.senderExposurePolicy ?? null,
        bins: common.bins,
        relativeWindow: common.relativeWindow,
        baseline: baseline ?? null,
      },
      { data, parameters },
      operationOutput,
      { ...psth.receipt },
    );
    const derivedFacts: Partial<DisclosureFacts> = {
      ...(data.mode === 'prebinned' ? { preBinned: true } : {}),
      ...(psth.missingBinCount > 0 ? { missingValueCount: psth.missingBinCount } : {}),
      ...(psth.excludedOutOfWindowCount !== null
        ? { excludedOutOfWindow: psth.excludedOutOfWindowCount }
        : {}),
      ...(psth.unitConversions.length > 0
        ? { unitConversions: psth.unitConversions }
        : {}),
      ...(normalization === 'mean_rate_per_selected_sender_per_trial'
        ? { rectangularSenderExposureAsserted: true }
        : {}),
    };
    const psthFiniteValues = psth.values.filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );
    const psthValueExtent = distributionCompilerExtrema(psthFiniteValues);
    const zeroOnPsthAxis = psth.edges[0] <= 0 && 0 <= psth.edges[psth.edges.length - 1];
    const zeroIncludedByPsthMembership = zeroOnPsthAxis && (
      0 < psth.edges[psth.edges.length - 1] || psth.finalEdgeInclusive
    );
    const compileContext = distributionCompilerContext(
      context(psth.counts.length, derivedFacts),
      skillId,
      {
        seriesLabel: String(parameters.seriesLabel ?? parameters.seriesId),
        alignmentLabel: String(parameters.alignmentLabel ?? 'alignment'),
        windowStart: distributionCompilerNumber(psth.relativeWindowStart),
        windowStop: distributionCompilerNumber(psth.relativeWindowStop),
        timeUnit: psth.relativeWindowUnit,
        windowBoundary: psth.relativeWindowBoundary,
        zeroVisibilityStatement: zeroIncludedByPsthMembership
          ? 'Relative time zero is included and shown as a reference.'
          : zeroOnPsthAxis
            ? 'Relative time zero is an excluded stop-boundary coordinate shown only as a boundary reference.'
            : 'Relative time zero lies outside the displayed window and no zero reference is drawn.',
        binCount: distributionCompilerNumber(psth.counts.length),
        eventCount: psth.exactCountTotal,
        selectedSenderCount: distributionCompilerNumber(psth.selectedSenderCount),
        includedTrialCount: distributionCompilerNumber(psth.includedTrialCount),
        excludedTrialCount: distributionCompilerNumber(psth.excludedTrialCount),
        denominatorPolicy,
        normalization,
        valueMin: psthValueExtent === null
          ? 'null'
          : distributionCompilerNumber(psthValueExtent.min),
        valueMax: psthValueExtent === null
          ? 'null'
          : distributionCompilerNumber(psthValueExtent.max),
        valueUnit: psth.valueUnit,
        baselineStatement: psth.baselineRate === null
          ? 'No baseline subtraction was requested.'
          : `Baseline ${distributionCompilerNumber(psth.baselineRate)} ${psth.valueUnit} was subtracted from displayed values; the table retains both uncorrected and corrected values.`,
        missingBinStatement: psth.missingBinCount > 0
          ? psth.missingBinCount === 1
            ? '1 bin has no covering trial and remains missing, not zero.'
            : `${psth.missingBinCount} bins have no covering trial and remain missing, not zero.`
          : 'Every bin has positive declared trial exposure.',
        excludedEventStatement: psth.excludedOutOfWindowCount === null
          ? 'The pre-binned input does not retain an out-of-window event count.'
          : `${psth.excludedOutOfWindowCount} source events were excluded by the relative window.`,
        uncertaintyStatement: 'No uncertainty interval was supplied or rendered.',
      },
    );
    const projectedBins = linearScale(
      psth.edges[0],
      psth.edges[psth.edges.length - 1],
      64,
      compileContext.width - 32,
    );
    for (let index = 0; index < psth.counts.length; index++) {
      const lower = projectedBins.map(psth.edges[index]);
      const upper = projectedBins.map(psth.edges[index + 1]);
      if (
        !Number.isFinite(lower) ||
        !Number.isFinite(upper) ||
        !(upper > lower) ||
        formatCoordinate(lower) === formatCoordinate(upper) ||
        formatCoordinate(upper - lower) === '0'
      ) {
        return fail(
          'RENDER_DEGENERATE_DOMAIN',
          'render',
          `authoritative PSTH bin ${index} has positive scientific width but collapses to zero width in the deterministic SVG coordinate grid at ${compileContext.width}px. Cortexel refuses rather than widen, overlap, or hide the interval; increase the output width or use scientifically justified wider bins.`,
          `/parameters/bins`,
        );
      }
    }
    const psthPlan = compilePsthFigure(
      compileContext,
      psth,
      {
        seriesId: String(parameters.seriesId),
        alignmentLabel: String(parameters.alignmentLabel ?? 'alignment'),
        seriesLabel: String(parameters.seriesLabel ?? parameters.seriesId),
        normalization,
        denominatorPolicy,
      },
      skillId,
    );
    const psthRects = psthPlan.panels[0]?.marks.find((mark) => mark.type === 'rect');
    if (psthRects?.type === 'rect') {
      let rectIndex = 0;
      for (let binIndex = 0; binIndex < psth.displayValues.length; binIndex++) {
        const value = psth.displayValues[binIndex];
        if (value === null) continue;
        const rect = psthRects.rects[rectIndex++];
        if (!rect || (value !== 0 && formatCoordinate(rect.height) === '0')) {
          return fail(
            'RENDER_DEGENERATE_DOMAIN',
            'render',
            `nonzero PSTH bin ${binIndex} collapses to zero height in the deterministic SVG coordinate grid. Cortexel refuses rather than inflate a minimum-height mark or render an observed value indistinguishably from zero; change the scale by narrowing the displayed dynamic range or split the data into honest panels.`,
            `/parameters/bins`,
          );
        }
      }
    }
    return done(
      psthPlan,
      [operation],
      derivedFacts,
    );
  }

  // ---- phase plane ---------------------------------------------------------
  if (skillId === 'neuro.phase_plane') {
    // All four carriers are simultaneous evidence, never fallbacks for one another.
    const trajectories = rec(data.trajectories);
    const axes = rec(data.axes);
    const xAxisRecord = rec(axes?.x) ?? {};
    const yAxisRecord = rec(axes?.y) ?? {};
    const xAxisUnit = String(xAxisRecord.unit);
    const yAxisUnit = String(yAxisRecord.unit);
    const xLabel = `${String(xAxisRecord.label ?? 'x')} (${unitLabel(xAxisUnit)})`;
    const yLabel = `${String(yAxisRecord.label ?? 'y')} (${unitLabel(yAxisUnit)})`;
    const vectorField = rec(data.vectorField);
    const nullclines = rec(data.nullclines);
    const fixedPoints = rec(data.fixedPoints);
    const nullableConverted = (
      values: readonly unknown[],
      sourceUnit: string,
      targetUnit: string,
    ): (number | null)[] => values.map((value) => value === null
      ? null
      : sourceUnit === targetUnit
        ? value as number
        : convert(value as number, sourceUnit, targetUnit));
    const fieldDomain = rec(vectorField?.domain);
    const fieldDxUnit = String(rec(vectorField?.dx)?.unit);
    const fieldDyUnit = String(rec(vectorField?.dy)?.unit);
    const directionMarkers = rec(parameters.directionMarkers);
    const arrowScaling = rec(parameters.arrowScaling);
    const convergenceFlags = phaseConvergenceFlags(fixedPoints);
    const declaredConvergence = arr(fixedPoints?.converged) ?? [];
    const convergenceMismatch = convergenceFlags.findIndex(
      (converged, index) => declaredConvergence[index] !== converged,
    );
    if (convergenceMismatch >= 0) {
      return fail(
        'SCIENCE_NORMALIZATION_UNVERIFIABLE',
        'science',
        `fixed point ${strings(fixedPoints?.ids)[convergenceMismatch]} declares converged=${String(declaredConvergence[convergenceMismatch])}, but |residual| <= tolerance re-derives ${String(convergenceFlags[convergenceMismatch])} after unit conversion with the contract's relative 1e-9 comparison tolerance.`,
        `/data/fixedPoints/converged/${convergenceMismatch}`,
      );
    }
    let tableRows: TableCell[][];
    try {
      tableRows = phasePlaneTableRows(data, parameters, convergenceFlags);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'axis-normalized speed is unrepresentable';
      if (!message.includes('binary64')) throw error;
      return fail(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        'science',
        message,
        '/data',
      );
    }
    const expectedPhaseRows = completenessRowPreflight(skillId, data);
    if (tableRows.length !== expectedPhaseRows) {
      return fail(
        'INTERNAL_INVARIANT_VIOLATED',
        'internal',
        `phase-plane table materialized ${tableRows.length} rows for ${expectedPhaseRows} declared carrier points.`,
        '/data',
      );
    }

    const convertedTrajectoryXs = trajectories
      ? nullableConverted(arr(rec(trajectories.x)?.values) ?? [], String(rec(trajectories.x)?.unit), xAxisUnit)
      : [];
    const convertedTrajectoryYs = trajectories
      ? nullableConverted(arr(rec(trajectories.y)?.values) ?? [], String(rec(trajectories.y)?.unit), yAxisUnit)
      : [];
    const convertedFieldXs = vectorField
      ? nullableConverted(arr(rec(vectorField.x)?.values) ?? [], String(rec(vectorField.x)?.unit), xAxisUnit) as number[]
      : [];
    const convertedFieldYs = vectorField
      ? nullableConverted(arr(rec(vectorField.y)?.values) ?? [], String(rec(vectorField.y)?.unit), yAxisUnit) as number[]
      : [];
    const convertedNullclineXs = nullclines
      ? nullableConverted(arr(rec(nullclines.x)?.values) ?? [], String(rec(nullclines.x)?.unit), xAxisUnit)
      : [];
    const convertedNullclineYs = nullclines
      ? nullableConverted(arr(rec(nullclines.y)?.values) ?? [], String(rec(nullclines.y)?.unit), yAxisUnit)
      : [];
    const convertedFixedXs = fixedPoints
      ? nullableConverted(arr(rec(fixedPoints.x)?.values) ?? [], String(rec(fixedPoints.x)?.unit), xAxisUnit) as number[]
      : [];
    const convertedFixedYs = fixedPoints
      ? nullableConverted(arr(rec(fixedPoints.y)?.values) ?? [], String(rec(fixedPoints.y)?.unit), yAxisUnit) as number[]
      : [];
    const convertedDomain = fieldDomain
      ? {
        xMin: convert(num(rec(fieldDomain.x)?.start)!, String(rec(fieldDomain.x)?.unit), xAxisUnit),
        xMax: convert(num(rec(fieldDomain.x)?.stop)!, String(rec(fieldDomain.x)?.unit), xAxisUnit),
        yMin: convert(num(rec(fieldDomain.y)?.start)!, String(rec(fieldDomain.y)?.unit), yAxisUnit),
        yMax: convert(num(rec(fieldDomain.y)?.stop)!, String(rec(fieldDomain.y)?.unit), yAxisUnit),
      }
      : undefined;
    const phaseXExtent = finiteExtent([
      ...convertedTrajectoryXs,
      ...convertedFieldXs,
      ...convertedNullclineXs,
      ...convertedFixedXs,
      ...(convertedDomain ? [convertedDomain.xMin, convertedDomain.xMax] : []),
    ].filter((value): value is number => value !== null));
    const phaseYExtent = finiteExtent([
      ...convertedTrajectoryYs,
      ...convertedFieldYs,
      ...convertedNullclineYs,
      ...convertedFixedYs,
      ...(convertedDomain ? [convertedDomain.yMin, convertedDomain.yMax] : []),
    ].filter((value): value is number => value !== null));
    const fieldDxs = numbers(rec(vectorField?.dx)?.values);
    const fieldDys = numbers(rec(vectorField?.dy)?.values);
    const magnitudeBasis = String(parameters.magnitudeBasis) as 'axis_normalized' | 'physical';
    if (magnitudeBasis === 'physical' && dimensionOf(xAxisUnit) !== dimensionOf(yAxisUnit)) {
      return fail(
        'SCIENCE_UNIT_DIMENSION_MISMATCH',
        'science',
        `physical vector magnitude cannot combine ${xAxisUnit} and ${yAxisUnit}; use axis_normalized for incommensurable state axes.`,
        '/parameters/magnitudeBasis',
      );
    }
    const canonicalStateUnit = canonicalUnitFor(xAxisUnit) ?? xAxisUnit;
    const canonicalTimeUnit = canonicalUnitFor(fieldDxUnit) ?? fieldDxUnit;
    let fieldNormalizedComponents: { readonly x: number; readonly y: number }[] = [];
    try {
      fieldNormalizedComponents = vectorField ? fieldDxs.map((dx, index) => {
        const dy = fieldDys[index];
        if (
          !phaseXExtent ||
          !phaseYExtent ||
          !(phaseXExtent.max > phaseXExtent.min) ||
          !(phaseYExtent.max > phaseYExtent.min)
        ) return { x: 0, y: 0 };
        return {
          x: exactBinary64RatioToDifference(dx, phaseXExtent.min, phaseXExtent.max),
          y: exactBinary64RatioToDifference(
            convert(dy, fieldDyUnit, fieldDxUnit),
            phaseYExtent.min,
            phaseYExtent.max,
          ),
        };
      }) : [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'axis-normalized vector is unrepresentable';
      if (!message.includes('binary64')) throw error;
      return fail(
        'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
        'science',
        message,
        '/data/vectorField',
      );
    }
    const fieldMagnitudes = vectorField ? fieldDxs.map((dx, index) => {
      const dy = fieldDys[index];
      if (magnitudeBasis === 'physical') {
        return Math.hypot(
          dx * conversionFactor(xAxisUnit, canonicalStateUnit) * conversionFactor(fieldDxUnit, canonicalTimeUnit),
          dy * conversionFactor(yAxisUnit, canonicalStateUnit) * conversionFactor(fieldDyUnit, canonicalTimeUnit),
        );
      }
      const normalized = fieldNormalizedComponents[index];
      return Math.hypot(normalized.x, normalized.y);
    }) : [];
    const phaseConversions: string[] = [];
    const noteConversion = (label: string, sourceUnit: string, targetUnit: string): void => {
      if (sourceUnit !== targetUnit) {
        phaseConversions.push(`${label}: ${sourceUnit} -> ${targetUnit} (factor ${conversionFactor(sourceUnit, targetUnit)})`);
      }
    };
    if (trajectories) {
      noteConversion('trajectory x', String(rec(trajectories.x)?.unit), xAxisUnit);
      noteConversion('trajectory y', String(rec(trajectories.y)?.unit), yAxisUnit);
    }
    if (vectorField) {
      noteConversion('vector-field x', String(rec(vectorField.x)?.unit), xAxisUnit);
      noteConversion('vector-field y', String(rec(vectorField.y)?.unit), yAxisUnit);
    }
    if (nullclines) {
      noteConversion('nullcline x', String(rec(nullclines.x)?.unit), xAxisUnit);
      noteConversion('nullcline y', String(rec(nullclines.y)?.unit), yAxisUnit);
    }
    if (fixedPoints) {
      noteConversion('fixed-point x', String(rec(fixedPoints.x)?.unit), xAxisUnit);
      noteConversion('fixed-point y', String(rec(fixedPoints.y)?.unit), yAxisUnit);
    }
    const phaseFacts: Partial<DisclosureFacts> = phaseConversions.length > 0
      ? { unitConversions: phaseConversions }
      : {};
    const phaseOperations: DerivationOperation[] = [{
      id: 'phase_plane.carriers.canonicalize_and_verify',
      algorithm: 'cortexel.phase_plane.canonicalize_carriers',
      algorithmRevision: 2,
      parameters: {
        xAxisUnit,
        yAxisUnit,
        magnitudeBasis,
        axisNormalizedBinary64Arithmetic: 'exact_component_over_exact_extent_difference_then_one_final_round',
        convergenceRelativeTolerance: 1e-9,
      },
      inputDigest: canonicalDigest({
        ...(trajectories ? { trajectories } : {}),
        ...(vectorField ? { vectorField } : {}),
        ...(nullclines ? { nullclines } : {}),
        ...(fixedPoints ? { fixedPoints } : {}),
      }),
      outputDigest: canonicalDigest({
        ...(trajectories ? { convertedTrajectoryXs, convertedTrajectoryYs } : {}),
        ...(vectorField ? { convertedFieldXs, convertedFieldYs } : {}),
        ...(nullclines ? { convertedNullclineXs, convertedNullclineYs } : {}),
        ...(fixedPoints ? { convertedFixedXs, convertedFixedYs } : {}),
        ...(convertedDomain ? { convertedDomain } : {}),
        fieldNormalizedComponents,
        fieldMagnitudes,
        convergenceFlags,
      }),
      receipt: {
        conversions: phaseConversions,
        ...(vectorField
          ? {
            fieldMagnitudeUnit: magnitudeBasis === 'physical'
              ? `${canonicalStateUnit} ${canonicalTimeUnit}`
              : fieldDxUnit,
          }
          : {}),
        fixedPointCount: convergenceFlags.length,
        convergenceFlags,
      },
    }];
    const trajectoryRawXs = arr(rec(trajectories?.x)?.values) ?? [];
    const trajectoryRawYs = arr(rec(trajectories?.y)?.values) ?? [];
    const nullclineRawXs = arr(rec(nullclines?.x)?.values) ?? [];
    const nullclineRawYs = arr(rec(nullclines?.y)?.values) ?? [];
    let missingPhasePointCount = 0;
    for (let index = 0; index < trajectoryRawXs.length; index++) {
      if (trajectoryRawXs[index] === null || trajectoryRawYs[index] === null) {
        missingPhasePointCount++;
      }
    }
    for (let index = 0; index < nullclineRawXs.length; index++) {
      if (nullclineRawXs[index] === null || nullclineRawYs[index] === null) {
        missingPhasePointCount++;
      }
    }
    const phaseDerivedFacts: Partial<DisclosureFacts> = {
      ...phaseFacts,
      ...(missingPhasePointCount > 0 ? { missingValueCount: missingPhasePointCount } : {}),
    };
    const trajectoryTimes = numbers(rec(trajectories?.times)?.values);
    const uncertaintyRecord = rec(parameters.uncertainty) ?? {};
    const phaseCompileContext = topologyDynamicsCompilerContext(
      context(tableRows.length, phaseDerivedFacts),
      skillId,
      {
        yLabel: String(yAxisRecord.label ?? 'y'),
        yUnit: yAxisUnit,
        xLabel: String(xAxisRecord.label ?? 'x'),
        xUnit: xAxisUnit,
        trajectoryCount: exactNumberText(strings(rec(trajectories?.universe)?.ids).length),
        trajectoryPointCount: exactNumberText(strings(trajectories?.pointTrajectoryIds).length),
        timeStart: trajectoryTimes.length === 0
          ? 'not supplied'
          : exactNumberText(trajectoryTimes[0]),
        timeStop: trajectoryTimes.length === 0
          ? 'not supplied'
          : exactNumberText(trajectoryTimes[trajectoryTimes.length - 1]),
        timeUnit: trajectoryTimes.length === 0
          ? 'not supplied'
          : String(rec(trajectories?.times)?.unit),
        timeDirection: trajectories ? String(trajectories.timeDirection) : 'not supplied',
        fieldSampleCount: exactNumberText(numbers(rec(vectorField?.x)?.values).length),
        latticeKind: vectorField ? String(rec(vectorField.lattice)?.kind) : 'not supplied',
        xDomainStart: convertedDomain ? exactNumberText(convertedDomain.xMin) : 'not supplied',
        xDomainStop: convertedDomain ? exactNumberText(convertedDomain.xMax) : 'not supplied',
        yDomainStart: convertedDomain ? exactNumberText(convertedDomain.yMin) : 'not supplied',
        yDomainStop: convertedDomain ? exactNumberText(convertedDomain.yMax) : 'not supplied',
        arrowScalingMode: vectorField ? String(arrowScaling?.mode) : 'not supplied',
        magnitudeBasis: vectorField ? magnitudeBasis : 'not supplied',
        nullclineCount: exactNumberText(strings(nullclines?.curveIds).length),
        fixedPointCount: exactNumberText(strings(fixedPoints?.ids).length),
        missingStatement: missingPhasePointCount === 0
          ? 'No supplied trajectory or nullcline point has a missing coordinate.'
          : `${missingPhasePointCount} supplied path points have a missing coordinate and break their path; missing is never zero.`,
        uncertaintyStatement: uncertaintyRecord.kind === 'none'
          ? `No uncertainty was supplied (${String(uncertaintyRecord.reason ?? 'not_provided')}).`
          : `Uncertainty kind ${String(uncertaintyRecord.kind)} was declared.`,
      },
    );
    return done(withContractTable(
      compilePhasePlaneFigure(phaseCompileContext, {
        xLabel,
        yLabel,
        ...(trajectories
          ? {
            trajectories: {
              ids: strings(rec(trajectories.universe)?.ids),
              labels: strings(rec(trajectories.universe)?.labels),
              pointIds: strings(trajectories.pointTrajectoryIds),
              xs: convertedTrajectoryXs,
              ys: convertedTrajectoryYs,
              timeDirection: String(trajectories.timeDirection) as 'forward' | 'backward',
              directionMode: String(directionMarkers?.mode) as
                | 'none'
                | 'arrowhead_at_end'
                | 'arrowheads_every_n_points',
              ...(num(directionMarkers?.everyNPoints) !== undefined
                ? { everyNPoints: num(directionMarkers?.everyNPoints)! }
                : {}),
            },
          }
          : {}),
        ...(vectorField
          ? {
            vectorField: {
              xs: convertedFieldXs,
              ys: convertedFieldYs,
              normalizedDxs: fieldNormalizedComponents.map((component) => component.x),
              normalizedDys: fieldNormalizedComponents.map((component) => component.y),
              magnitudes: fieldMagnitudes,
              magnitudeBasis,
              magnitudeUnit: magnitudeBasis === 'physical'
                ? `${canonicalStateUnit} ${canonicalTimeUnit}`
                : fieldDxUnit,
              scaling: String(arrowScaling?.mode) as
                | 'unit_length'
                | 'magnitude_proportional'
                | 'sqrt_magnitude',
              maxArrowLengthFraction: num(arrowScaling?.maxArrowLengthFraction) ?? 0.05,
              ...(convertedDomain
                ? { domain: convertedDomain }
                : {}),
            },
          }
          : {}),
        ...(nullclines
          ? {
            nullclines: {
              ids: strings(nullclines.curveIds),
              labels: strings(nullclines.labels),
              pointIds: strings(nullclines.pointCurveIds),
              xs: convertedNullclineXs,
              ys: convertedNullclineYs,
            },
          }
          : {}),
        ...(fixedPoints
          ? {
            fixedPoints: {
              ids: strings(fixedPoints.ids),
              labels: strings(fixedPoints.labels),
              xs: convertedFixedXs,
              ys: convertedFixedYs,
              converged: convergenceFlags,
            },
          }
          : {}),
      }, skillId),
      phaseCompileContext,
      skillId,
      tableRows,
    ), phaseOperations, phaseDerivedFacts);
  }

  // ---- connection graph (schematic circular layout) ------------------------
  if (skillId === 'network.connection_graph') {
    const ids = strings(rec(data.nodeUniverse)?.ids);
    const nodeIndexById = new Map(ids.map((id, index) => [id, index]));
    const conns = rec(data.connections);
    const sources = strings(conns?.sourceIds);
    const targets = strings(conns?.targetIds);
    if (ids.length) {
      const groups = arr(rec(data.nodeUniverse)?.groups) ?? [];
      const groupByNode = new Map<string, string>();
      const groupIndexByNode = new Map<string, number>();
      for (const [groupIndex, candidate] of groups.entries()) {
        const group = rec(candidate) ?? {};
        for (const memberId of strings(group.memberIds)) {
          const previousGroup = groupByNode.get(memberId);
          if (previousGroup !== undefined) {
            return fail(
              'SEMANTIC_DUPLICATE_ID',
              'semantic',
              `node ${memberId} belongs to both group ${previousGroup} and group ${String(group.id)}; group colour, marker shape, and grouped layout require a partition, not overlapping memberships.`,
              `/data/nodeUniverse/groups/${groupIndex}/memberIds`,
            );
          }
          groupByNode.set(memberId, String(group.id));
          groupIndexByNode.set(memberId, groupIndex);
        }
      }
      const degree = rec(parameters.degreeAnnotation);
      const scopeRecord = rec(data.scope) ?? {};
      if (degree && rec(data.nodeUniverse)?.complete !== true) {
        return fail(
          'SCOPE_NODE_UNIVERSE_REQUIRED',
          'scope',
          'a degree annotation requires a complete declared node universe; an omitted node can turn a visible isolate into an unobserved neighbour.',
          '/data/nodeUniverse/complete',
        );
      }
      if (degree && scopeRecord.kind === 'sampled') {
        return fail(
          'SCOPE_NODE_UNIVERSE_REQUIRED',
          'scope',
          'degree over sampled edges is a property of the retained sample, not the declared network. Cortexel refuses the annotation rather than label it as network degree.',
          '/parameters/degreeAnnotation',
        );
      }
      if (
        degree &&
        scopeRecord.kind === 'mpi_target_rank_local' &&
        degree.mode !== 'in_degree'
      ) {
        return fail(
          'SCOPE_OUT_DEGREE_FROM_RANK_LOCAL',
          'scope',
          'a target-rank-local connection query cannot establish outgoing or total degree because remote-target connections live on other ranks.',
          '/parameters/degreeAnnotation/mode',
        );
      }
      if (parameters.nodeColorBy === 'group' && groups.length > CATEGORICAL_SERIES_STYLES.length) {
        return fail(
          'RENDER_SERIES_LIMIT_EXCEEDED',
          'render',
          `${groups.length} node groups exceed the ${CATEGORICAL_SERIES_STYLES.length} registered distinguishable color/shape tuples.`,
          '/data/nodeUniverse/groups',
        );
      }
      const countingPolicy = degree?.countingPolicy === 'per_unique_neighbour'
        ? 'count_unique_neighbors'
        : 'count_edges';
      const inDegree = degree
        ? computeDegrees(ids, sources, targets, 'in', countingPolicy).degree
        : [];
      const outDegree = degree
        ? computeDegrees(ids, sources, targets, 'out', countingPolicy).degree
        : [];
      const autapseCountByNode = new Map<string, number>();
      if (degree) {
        const autapseContribution = String(degree.autapseContribution);
        for (let edgeIndex = 0; edgeIndex < sources.length; edgeIndex++) {
          if (sources[edgeIndex] !== targets[edgeIndex]) continue;
          if (
            countingPolicy === 'count_unique_neighbors' &&
            autapseCountByNode.has(sources[edgeIndex])
          ) continue;
          const nodeId = sources[edgeIndex];
          autapseCountByNode.set(
            nodeId,
            countingPolicy === 'count_unique_neighbors'
              ? 1
              : (autapseCountByNode.get(nodeId) ?? 0) + 1,
          );
          const nodeIndex = nodeIndexById.get(nodeId);
          if (nodeIndex === undefined) continue;
          if (autapseContribution === 'excluded') {
            inDegree[nodeIndex] = Math.max(0, inDegree[nodeIndex] - 1);
            outDegree[nodeIndex] = Math.max(0, outDegree[nodeIndex] - 1);
          }
        }
      }
      const positions = rec(data.positions);
      const positionedIds = strings(positions?.nodeIds);
      const positionIndex = new Map(positionedIds.map((id, index) => [id, index]));
      const rawPositionXs = numbers(rec(positions?.x)?.values);
      const rawPositionYs = numbers(rec(positions?.y)?.values);
      const xPositionUnit = positions ? String(rec(positions.x)?.unit) : null;
      const yPositionUnit = positions ? String(rec(positions.y)?.unit) : null;
      // Measured x/y are one Euclidean coordinate frame. Canonicalize both to
      // the finest supplied compatible unit so neither axis is rounded merely
      // because it happened to be listed second.
      const positionUnit = positions && xPositionUnit && yPositionUnit
        ? xPositionUnit === yPositionUnit || conversionFactor(yPositionUnit, xPositionUnit) >= 1
          ? xPositionUnit
          : yPositionUnit
        : null;
      const positionXs = positions && positionUnit && xPositionUnit !== positionUnit
        ? rawPositionXs.map((value) => convert(value, xPositionUnit!, positionUnit))
        : rawPositionXs;
      const positionYs = positions && positionUnit && yPositionUnit !== positionUnit
        ? rawPositionYs.map((value) => convert(value, yPositionUnit!, positionUnit))
        : rawPositionYs;
      const measured = rec(parameters.layout)?.mode === 'measured_positions';
      const graphConversions = measured && positionUnit
        ? [
          ...(xPositionUnit !== positionUnit
            ? [`x: ${xPositionUnit} -> ${positionUnit} (factor ${conversionFactor(xPositionUnit!, positionUnit)})`]
            : []),
          ...(yPositionUnit !== positionUnit
            ? [`y: ${yPositionUnit} -> ${positionUnit} (factor ${conversionFactor(yPositionUnit!, positionUnit)})`]
            : []),
        ]
        : [];
      const graphFacts: Partial<DisclosureFacts> = graphConversions.length > 0
        ? { unitConversions: graphConversions }
        : {};
      const graphOperations: DerivationOperation[] = graphConversions.length > 0
        ? [{
          id: 'connection_graph.coordinates.canonicalize_axes',
          algorithm: 'cortexel.connection_graph.canonicalize_axes',
          algorithmRevision: 1,
          parameters: { targetUnit: positionUnit, selectionRule: 'finest_supplied_compatible_unit' },
          inputDigest: canonicalDigest({ x: rec(positions?.x), y: rec(positions?.y) }),
          outputDigest: canonicalDigest({ x: positionXs, y: positionYs, unit: positionUnit }),
          receipt: {
            x: xPositionUnit === positionUnit ? null : conversionReceipt(xPositionUnit!, positionUnit!),
            y: yPositionUnit === positionUnit ? null : conversionReceipt(yPositionUnit!, positionUnit!),
            coordinateCount: positionedIds.length,
          },
        }]
        : [];
      if (measured) {
        for (let edgeIndex = 0; edgeIndex < sources.length; edgeIndex++) {
          if (sources[edgeIndex] === targets[edgeIndex]) continue;
          const sourcePosition = positionIndex.get(sources[edgeIndex])!;
          const targetPosition = positionIndex.get(targets[edgeIndex])!;
          if (
            positionXs[sourcePosition] === positionXs[targetPosition] &&
            positionYs[sourcePosition] === positionYs[targetPosition]
          ) {
            return fail(
              'RENDER_DEGENERATE_DOMAIN',
              'render',
              `directed connection ${edgeIndex} joins distinct nodes ${sources[edgeIndex]} and ${targets[edgeIndex]} at the same measured coordinate. A zero-length chord has no target end for an arrowhead, and Cortexel refuses rather than invent a separation.`,
              `/data/connections/sourceIds/${edgeIndex}`,
            );
          }
        }
      }
      const scopeSummaryCell = compilerNetworkScopeSummaryCell(data.scope);
      const scopeKind = String(rec(data.scope)?.kind);
      const nodeRows: TableCell[][] = ids.map((id, index) => {
        const position = positionIndex.get(id);
        const totalDegree = degree
          ? inDegree[index] + outDegree[index] - (
            degree.autapseContribution === 'counts_once'
              ? autapseCountByNode.get(id) ?? 0
              : 0
          )
          : null;
        return [
          'node',
          id,
          groupByNode.get(id) ?? null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          degree && (degree.mode === 'in_degree' || degree.mode === 'total_degree')
            ? inDegree[index]
            : null,
          degree && (degree.mode === 'out_degree' || degree.mode === 'total_degree') &&
            scopeKind !== 'mpi_target_rank_local'
            ? outDegree[index]
            : null,
          degree
            ? structuredCell({
              mode: degree.mode,
              countingPolicy: degree.countingPolicy,
              autapseContribution: degree.autapseContribution,
              ...(degree.mode === 'total_degree' ? { totalDegree } : {}),
            })
            : null,
          measured && position !== undefined ? positionXs[position] : null,
          measured && position !== undefined ? positionYs[position] : null,
          measured ? positionUnit : null,
          measured ? 'measured' : 'schematic (non-spatial)',
          scopeSummaryCell,
        ];
      });
      const edgeIds = strings(conns?.edgeIds);
      const weights = arr(rec(conns?.weights)?.values) ?? [];
      const weightUnit = typeof rec(conns?.weights)?.unit === 'string'
        ? String(rec(conns?.weights)?.unit)
        : null;
      const delays = arr(rec(conns?.delays)?.values) ?? [];
      const delayUnit = typeof rec(conns?.delays)?.unit === 'string'
        ? String(rec(conns?.delays)?.unit)
        : null;
      const models = strings(conns?.synapseModels);
      const pairKey = (source: string, target: string): string => {
        const ordered = compareUnicodeCodePoints(source, target) <= 0
          ? [source, target]
          : [target, source];
        return canonicalize(ordered);
      };
      const pairTotals = new Map<string, number>();
      for (let index = 0; index < sources.length; index++) {
        const key = pairKey(sources[index], targets[index]);
        pairTotals.set(key, (pairTotals.get(key) ?? 0) + 1);
      }
      const parallelEdges = rec(parameters.parallelEdges) ?? {};
      let maximumParallel = 0;
      for (const count of pairTotals.values()) {
        if (count > maximumParallel) maximumParallel = count;
      }
      if (
        parallelEdges.display === 'separate_lanes' &&
        maximumParallel > (num(parallelEdges.maxLanes) ?? 0)
      ) {
        return fail(
          'RENDER_SERIES_LIMIT_EXCEEDED',
          'render',
          `one unordered endpoint pair carries ${maximumParallel} connections but maxLanes is ${String(parallelEdges.maxLanes)}. Revision 1 refuses instead of sharing a lane and hiding a connection.`,
          '/parameters/parallelEdges/maxLanes',
        );
      }
      const pairSeen = new Map<string, number>();
      const edgeRows: TableCell[][] = sources.map((sourceId, index) => {
        const targetId = targets[index];
        const key = pairKey(sourceId, targetId);
        const parallelIndex = (pairSeen.get(key) ?? 0) + 1;
        pairSeen.set(key, parallelIndex);
        return [
          'connection',
          edgeIds[index] ?? null,
          null,
          sourceId,
          targetId,
          booleanCell(sourceId === targetId),
          parallelIndex,
          pairTotals.get(key)!,
          typeof weights[index] === 'number' ? weights[index] as number : null,
          weightUnit,
          typeof delays[index] === 'number' ? delays[index] as number : null,
          delayUnit,
          models[index] ?? null,
          null,
          null,
          null,
          null,
          null,
          null,
          measured ? 'measured' : 'schematic (non-spatial)',
          scopeSummaryCell,
        ];
      });
      const tableRows = [...nodeRows, ...edgeRows];
      const expectedGraphRows = ids.length + sources.length;
      if (tableRows.length !== expectedGraphRows) {
        return fail(
          'INTERNAL_INVARIANT_VIOLATED',
          'internal',
          `connection-graph table materialized ${tableRows.length} rows for ${expectedGraphRows} declared node/edge carriers.`,
          '/data',
        );
      }
      const edgeEncoding = rec(parameters.edgeValueEncoding);
      const encodedValues = edgeEncoding?.mode === 'weight'
        ? weights
        : edgeEncoding?.mode === 'delay'
          ? delays
          : [];
      if (
        edgeEncoding &&
        (edgeEncoding.channel === 'color' || edgeEncoding.channel === 'width_and_color') &&
        edgeEncoding.colorScale !== 'sequential' &&
        edgeEncoding.colorScale !== 'diverging'
      ) {
        return fail(
          'RENDER_NO_DATA',
          'render',
          'an edge color channel requires an explicit sequential or diverging colorScale; Cortexel refuses rather than infer a numeric color meaning.',
          '/parameters/edgeValueEncoding/colorScale',
        );
      }
      if (edgeEncoding && encodedValues.length !== sources.length) {
        return fail(
          'RENDER_NO_DATA',
          'render',
          `${String(edgeEncoding.mode)} was selected for edge encoding, but that complete parallel channel was not supplied.`,
          '/parameters/edgeValueEncoding/mode',
        );
      }
      if (edgeEncoding && parallelEdges.display === 'bundled') {
        const valuesByDirection = new Map<string, unknown[]>();
        for (let index = 0; index < sources.length; index++) {
          const key = canonicalize([sources[index], targets[index]]);
          const entries = valuesByDirection.get(key) ?? [];
          entries.push(encodedValues[index]);
          valuesByDirection.set(key, entries);
        }
        for (const entries of valuesByDirection.values()) {
          const finite = entries.filter((value): value is number => typeof value === 'number');
          if (finite.length > 0 && finite.length !== entries.length) {
            return fail(
              'RENDER_NO_DATA',
              'render',
              'one bundled stroke cannot truthfully encode both finite and missing parallel-edge values. Cortexel refuses rather than let the finite rows visually stand in for missing rows.',
              '/data/connections',
            );
          }
        }
      }
      if (edgeEncoding) {
        const paintValueGroups: unknown[][] = [];
        if (parallelEdges.display === 'bundled') {
          const byDirection = new Map<string, unknown[]>();
          for (let index = 0; index < sources.length; index++) {
            const key = canonicalize([sources[index], targets[index]]);
            const entries = byDirection.get(key) ?? [];
            entries.push(encodedValues[index]);
            byDirection.set(key, entries);
          }
          paintValueGroups.push(...byDirection.values());
        } else {
          paintValueGroups.push(...encodedValues.map((value) => [value]));
        }

        const aggregateValues: number[] = [];
        try {
          for (const entries of paintValueGroups) {
            const finite = entries.filter((value): value is number => typeof value === 'number');
            const aggregate = aggregateTopologyScalar(
              finite,
              entries.length > 1
                ? parameters.multapseAggregation as TopologyScalarAggregation | undefined
                : 'no_aggregation',
            );
            if (aggregate !== null) aggregateValues.push(aggregate);
          }

          const center = edgeEncoding.colorScale === 'diverging'
            ? num(edgeEncoding.center) ?? 0
            : 0;
          const uniqueValues = [...new Set(aggregateValues)].sort((left, right) => left - right);
          let previousTransform: number | undefined;
          for (const value of uniqueValues) {
            const centered = exactBinary64Sum([value, -center]);
            if (!Number.isFinite(centered)) {
              throw new Error('an aggregate minus its declared reference is outside finite binary64');
            }
            const transformed = edgeEncoding.scale === 'symlog'
              ? symlogTransform(centered, 1)
              : value;
            if (!Number.isFinite(transformed)) {
              throw new Error('an encoded graph value transform is outside finite binary64');
            }
            if (previousTransform !== undefined && !(transformed > previousTransform)) {
              throw new Error('two distinct ordered graph values collapse to one transformed value');
            }
            previousTransform = transformed;
          }
        } catch (error) {
          return fail(
            'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
            'science',
            error instanceof Error
              ? `the declared graph edge aggregation or value scale cannot be represented as ordered finite binary64: ${error.message}`
              : 'the declared graph edge aggregation or value scale cannot be represented as ordered finite binary64.',
            '/parameters/edgeValueEncoding',
          );
        }
      }
      const degreeForNode = (index: number): number | undefined => {
        if (!degree) return undefined;
        if (degree.mode === 'in_degree') return inDegree[index];
        if (degree.mode === 'out_degree') return outDegree[index];
        const id = ids[index];
        const autapseCount = autapseCountByNode.get(id) ?? 0;
        return inDegree[index] + outDegree[index] - (
          degree.autapseContribution === 'counts_once' ? autapseCount : 0
        );
      };
      const missingEncodedValueCount = countExplicitNulls(encodedValues);
      const directedGroups = new Set<string>();
      const connectedNodes = new Set<string>();
      let autapseCount = 0;
      for (let index = 0; index < sources.length; index++) {
        directedGroups.add(canonicalize([sources[index], targets[index]]));
        connectedNodes.add(sources[index]);
        connectedNodes.add(targets[index]);
        if (sources[index] === targets[index]) autapseCount++;
      }
      const bundledAggregation = parallelEdges.display === 'bundled' &&
        directedGroups.size < sources.length &&
        typeof parameters.multapseAggregation === 'string';
      const graphDerivedFacts: Partial<DisclosureFacts> = {
        ...graphFacts,
        ...(missingEncodedValueCount > 0
          ? { missingValueCount: missingEncodedValueCount }
          : {}),
        ...(bundledAggregation
          ? {
            multapseAggregated: true,
            multapseAggregation: parameters.multapseAggregation as string,
          }
          : {}),
      };
      const layoutMode = String(rec(parameters.layout)?.mode);
      const edgeValueStatement = edgeEncoding === undefined
        ? 'no edge value channel is encoded'
        : `${String(edgeEncoding.mode)} on ${String(edgeEncoding.channel)} with ${String(edgeEncoding.scale ?? 'linear')} scale${typeof edgeEncoding.colorScale === 'string' ? ` and ${edgeEncoding.colorScale} colour` : ''}${typeof parameters.multapseAggregation === 'string' ? `; bundled multapses use ${parameters.multapseAggregation}` : ''}`;
      const degreeStatement = degree === undefined
        ? 'no degree annotation'
        : structuredCell(degree)!;
      const graphCompileContext = topologyDynamicsCompilerContext(
        context(tableRows.length, graphDerivedFacts),
        skillId,
        {
          graphLabel: String(parameters.graphLabel ?? parameters.graphId),
          nodeCount: exactNumberText(ids.length),
          isolateCount: exactNumberText(ids.filter((id) => !connectedNodes.has(id)).length),
          edgeCount: exactNumberText(sources.length),
          multapseRowCount: exactNumberText(sources.length - pairTotals.size),
          autapseCount: exactNumberText(autapseCount),
          scopeStatement: scopeSummaryCell,
          layoutMode,
          layoutSpatialStatement: measured
            ? `measured positions in ${String(positionUnit)}`
            : 'schematic and non-spatial',
          nodeOrder: String(rec(data.nodeUniverse)?.order ?? 'as_declared'),
          edgeValueStatement,
          degreeStatement,
          missingValueStatement: edgeEncoding === undefined
            ? 'No edge value channel is encoded.'
            : missingEncodedValueCount === 0
              ? 'No encoded edge value is missing.'
              : `${missingEncodedValueCount} encoded edge values are missing and retain the reserved missing-value encoding.`,
          compactionStatement: 'No declared node or connection row was compacted.',
          tableStatement: `The complete table contains ${ids.length} node rows followed by ${sources.length} source-order connection rows.`,
        },
      );
      return done(withContractTable(
        compileGraphFigure(graphCompileContext, {
          nodes: ids.map((id, index) => ({
            id,
            group: groupByNode.get(id) ?? 'ungrouped',
            groupIndex: groupIndexByNode.get(id) ?? groups.length,
            ...(degreeForNode(index) !== undefined ? { degree: degreeForNode(index)! } : {}),
            ...(measured
              ? {
                x: positionXs[positionIndex.get(id)!],
                y: positionYs[positionIndex.get(id)!],
              }
              : {}),
          })),
          edges: sources.map((sourceId, index) => ({
            id: edgeIds[index] ?? `source-row-${index}`,
            sourceId,
            targetId: targets[index],
            sourceOrdinal: index,
            ...(edgeEncoding
              ? { value: typeof encodedValues[index] === 'number' ? encodedValues[index] as number : null }
              : {}),
          })),
          layout: String(rec(parameters.layout)?.mode) as ConnectionGraphFigureSpec['layout'],
          parallelDisplay: String(parallelEdges.display) as 'separate_lanes' | 'bundled',
          maxLanes: num(parallelEdges.maxLanes) ?? 1,
          ...(typeof parameters.multapseAggregation === 'string'
            ? {
              multapseAggregation:
                parameters.multapseAggregation as TopologyScalarAggregation,
            }
            : {}),
          ...(edgeEncoding
            ? {
              edgeEncoding: {
                channel: String(edgeEncoding.channel) as 'width' | 'color' | 'width_and_color',
                colorKind: edgeEncoding.colorScale === 'diverging' ? 'diverging' : 'sequential',
                scale: edgeEncoding.scale === 'symlog' ? 'symlog' : 'linear',
                ...(num(edgeEncoding.center) !== undefined ? { center: num(edgeEncoding.center)! } : {}),
              },
            }
            : {}),
          nodeColorByGroup: parameters.nodeColorBy === 'group',
          encodeDegreeAsArea: degree?.encodeAsNodeArea === true,
          ...(degree ? { degreeLabel: String(degree.mode).replaceAll('_', '-') } : {}),
          ...(positionUnit ? { positionUnit } : {}),
          ...(measured ? { xLabel: `x (${unitLabel(positionUnit!)})`, yLabel: `y (${unitLabel(positionUnit!)})` } : {}),
        }, skillId),
        graphCompileContext,
        skillId,
        tableRows,
      ), graphOperations, graphDerivedFacts);
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
  derivationOperations: readonly DerivationOperation[],
): Record<string, unknown> {
  const identity = getBuildIdentity();
  const catalog = SKILL_CATALOG[validated.skillId];
  const tableRowCount = plan.table.rowsTotal;

  const artifactWithoutDigest: Record<string, unknown> = {
    artifact: {
      name: ARTIFACT_CONTRACT_IDENTITY.name,
      version: ARTIFACT_CONTRACT_IDENTITY.version,
    },
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
    },
    provenance: {
      source: rec(validated.canonicalRequest.source) ?? { kind: 'unknown' },
      requestDigest: validated.requestDigest,
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
    },
    accessibility: {
      profileId: 'cortexel-accessibility',
      profileVersion: '1.0',
      summary,
      tablePolicy: plan.table.policy,
      tableBinding: 'shape_only',
      tableColumns: plan.table.columns.map((column) => column.key),
      tableRowCount,
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

/** Exact degree-bin cardinality, saturated at `ceiling + 1`, before dense allocation. */
function degreeRowPreflight(
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
  ceiling: number,
): number {
  if (data.mode === 'node_degrees') {
    const degrees = numbers(rec(data.nodeDegrees)?.degrees);
    let maximum = 0;
    for (const degree of degrees) {
      if (degree >= ceiling) return ceiling + 1;
      if (degree > maximum) maximum = degree;
    }
    return maximum + 1;
  }

  const nodeIds = strings(rec(data.nodeUniverse)?.ids);
  const connections = rec(data.connections) ?? {};
  const sources = strings(connections.sourceIds);
  const targets = strings(connections.targetIds);
  const direction = parameters.direction === 'out' ? 'out' : 'in';
  const excludeAutapses = parameters.autapsePolicy === 'exclude';
  if (parameters.countingPolicy === 'count_unique_neighbors') {
    const neighbours = new Map(nodeIds.map((id) => [id, new Set<string>()]));
    let maximum = 0;
    for (let ordinal = 0; ordinal < sources.length; ordinal++) {
      if (excludeAutapses && sources[ordinal] === targets[ordinal]) continue;
      const owner = direction === 'in' ? targets[ordinal] : sources[ordinal];
      const counterpart = direction === 'in' ? sources[ordinal] : targets[ordinal];
      const set = neighbours.get(owner);
      if (!set) continue; // semantic validation owns endpoint membership
      set.add(counterpart);
      if (set.size >= ceiling) return ceiling + 1;
      if (set.size > maximum) maximum = set.size;
    }
    return maximum + 1;
  }

  const degrees = new Map(nodeIds.map((id) => [id, 0]));
  let maximum = 0;
  for (let ordinal = 0; ordinal < sources.length; ordinal++) {
    if (excludeAutapses && sources[ordinal] === targets[ordinal]) continue;
    const owner = direction === 'in' ? targets[ordinal] : sources[ordinal];
    const degree = (degrees.get(owner) ?? 0) + 1;
    if (degree >= ceiling) return ceiling + 1;
    degrees.set(owner, degree);
    if (degree > maximum) maximum = degree;
  }
  return maximum + 1;
}

/** Request-carrier row count (or a safe derivation upper bound) before geometry exists. */
function completenessRowPreflight(
  skillId: string,
  data: Record<string, unknown>,
): number {
  if (skillId === 'network.spatial_map_2d' || skillId === 'network.connection_graph') {
    return (arr(rec(data.nodeUniverse)?.ids)?.length ?? 0) +
      (arr(rec(data.connections)?.sourceIds)?.length ?? 0);
  }
  if (skillId === 'neuro.phase_plane') {
    const trajectories = rec(data.trajectories);
    const pointIds = strings(trajectories?.pointTrajectoryIds);
    const represented = new Set(pointIds);
    const declaredEmpty = strings(rec(trajectories?.universe)?.ids)
      .filter((id) => !represented.has(id)).length;
    return pointIds.length + declaredEmpty +
      (arr(rec(rec(data.vectorField)?.x)?.values)?.length ?? 0) +
      (arr(rec(data.nullclines)?.pointCurveIds)?.length ?? 0) +
      (arr(rec(data.fixedPoints)?.ids)?.length ?? 0);
  }
  if (skillId === 'neuro.compartment_trace') {
    const declared = strings(data.compartmentIds);
    const recorded = new Set<string>();
    let samples = 0;
    for (const candidate of arr(data.series) ?? []) {
      const series = rec(candidate) ?? {};
      recorded.add(String(series.compartmentId));
      samples += arr(rec(series.time)?.values)?.length ?? 0;
    }
    return samples + declared.filter((id) => !recorded.has(id)).length;
  }
  return 0;
}

/** Exact visible data-mark count for the graph/spatial primitives allocated by V1. */
function topologyMarkPreflight(
  skillId: string,
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
): number {
  const connections = rec(data.connections) ?? {};
  const sources = strings(connections.sourceIds);
  const targets = strings(connections.targetIds);
  if (skillId === 'network.connection_graph') {
    const nodeCount = strings(rec(data.nodeUniverse)?.ids).length;
    const degreeLabels = rec(parameters.degreeAnnotation) ? nodeCount : 0;
    if (rec(parameters.parallelEdges)?.display !== 'bundled') {
      return nodeCount + degreeLabels + 2 * sources.length;
    }
    const directed = new Map<string, number>();
    for (let index = 0; index < sources.length; index++) {
      const key = canonicalize([sources[index], targets[index]]);
      directed.set(key, (directed.get(key) ?? 0) + 1);
    }
    const bundleLabels = [...directed.values()].filter((count) => count > 1).length;
    return nodeCount + degreeLabels + 2 * directed.size + bundleLabels;
  }
  if (skillId !== 'network.spatial_map_2d') return 0;
  const nodeCount = strings(rec(data.positions)?.nodeIds).length;
  const domainMark = rec(rec(data.positions)?.domain) ? 1 : 0;
  const unordered = new Map<string, { sources: Map<string, number>; autapse: boolean; count: number }>();
  for (let index = 0; index < sources.length; index++) {
    const ordered = compareUnicodeCodePoints(sources[index], targets[index]) <= 0
      ? [sources[index], targets[index]]
      : [targets[index], sources[index]];
    const key = canonicalize(ordered);
    const entry = unordered.get(key) ?? { sources: new Map<string, number>(), autapse: sources[index] === targets[index], count: 0 };
    const directionKey = canonicalize([sources[index], targets[index]]);
    entry.sources.set(directionKey, (entry.sources.get(directionKey) ?? 0) + 1);
    entry.count++;
    unordered.set(key, entry);
  }
  let edgeMarks = 0;
  for (const entry of unordered.values()) {
    edgeMarks += 1 + entry.sources.size; // one physical chord/loop plus one arrow per direction
    if (entry.autapse) {
      if (entry.count > 1) edgeMarks++;
    } else if (entry.count > 1 || entry.sources.size > 1) {
      edgeMarks += entry.sources.size; // one explicit per-direction count label
    }
  }
  return nodeCount + domainMark + edgeMarks;
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
  const skillReturnedTableLimit = (
    catalog.budgets as unknown as { readonly maxReturnedTableRows: number }
  ).maxReturnedTableRows;
  const returnedTableLimit = Math.min(skillReturnedTableLimit, limits.returnedTableRows);

  const data = rec(request.data) ?? {};
  const universeSize = arr(rec(data.nodeUniverse)?.ids)?.length ?? 0;
  const connections = rec(data.connections);
  const parameters = rec(request.parameters) ?? {};
  const connectionCount = Math.max(
    arr(connections?.sourceIds)?.length ?? 0,
    arr(connections?.targetIds)?.length ?? 0,
  );
  const completenessRows = completenessRowPreflight(validated.skillId, data);
  const completenessRowsAreExact =
    validated.skillId === 'network.spatial_map_2d' ||
    validated.skillId === 'network.connection_graph' ||
    validated.skillId === 'neuro.phase_plane';
  if (completenessRowsAreExact && completenessRows > returnedTableLimit) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_COMPACTION_UNAVAILABLE',
          stage: 'budget',
          instancePath: '/data',
          skillId: validated.skillId,
          message: `the request carriers require exactly ${completenessRows} complete audit rows, over the returned-table limit of ${returnedTableLimit}. Revision 2 has no excerpt or digest-bound complete sidecar, so Cortexel refuses before allocating render geometry.`,
          limit: {
            name: 'returnedTableRows',
            limit: returnedTableLimit,
            observed: completenessRows,
          },
        }),
      ],
    };
  }

  if (validated.skillId === 'network.degree_distribution') {
    const degreeRows = degreeRowPreflight(data, parameters, returnedTableLimit);
    if (degreeRows > returnedTableLimit) {
      return {
        ok: false,
        errors: [
          makeError({
            code: 'RESOURCE_COMPACTION_UNAVAILABLE',
            stage: 'budget',
            instancePath: data.mode === 'node_degrees'
              ? '/data/nodeDegrees/degrees'
              : '/data/connections',
            skillId: validated.skillId,
            message: `the exact per-integer degree table requires more than ${returnedTableLimit} rows. Cortexel saturated the degree preflight at ${returnedTableLimit + 1} and refused before allocating a dense histogram or render geometry.`,
            limit: {
              name: 'returnedTableRows',
              limit: returnedTableLimit,
              observed: returnedTableLimit + 1,
            },
          }),
        ],
      };
    }
  }

  if (validated.skillId === 'neuro.response_curve') {
    const responseCurveRows = (arr(rec(data.conditions)?.ids)?.length ?? 0) +
      (data.mode === 'repeats'
        ? arr(rec(rec(data.observations)?.response)?.values)?.length ?? 0
        : 0);
    if (responseCurveRows > returnedTableLimit) {
      return {
        ok: false,
        errors: [
          makeError({
            code: 'RESOURCE_COMPACTION_UNAVAILABLE',
            stage: 'budget',
            instancePath: '/data',
            skillId: validated.skillId,
            message: `the complete response-curve table requires ${responseCurveRows} rows, over the returned-table limit of ${returnedTableLimit}. Artifact 1.0 has no excerpt or sidecar state, so Cortexel refuses before sorting, aggregating, or allocating render geometry.`,
            limit: {
              name: 'returnedTableRows',
              limit: returnedTableLimit,
              observed: responseCurveRows,
            },
          }),
        ],
      };
    }
  }

  if (validated.skillId === 'neuro.psth') {
    const psthRows = binnedMarkPreflight(validated.skillId, data, parameters);
    if (psthRows > returnedTableLimit) {
      return {
        ok: false,
        errors: [
          makeError({
            code: 'RESOURCE_COMPACTION_UNAVAILABLE',
            stage: 'budget',
            instancePath: '/parameters/bins',
            skillId: validated.skillId,
            message: `the complete PSTH audit table requires ${psthRows} rows, over the returned-table limit of ${returnedTableLimit}. Revision 2 has no bin compaction, excerpt, or digest-bound complete sidecar, so Cortexel refuses before aligning events, deriving exposures, or allocating geometry.`,
            limit: {
              name: 'returnedTableRows',
              limit: returnedTableLimit,
              observed: psthRows,
            },
          }),
        ],
      };
    }
  }

  if (validated.skillId === 'neuro.correlogram') {
    let correlogramRows: number;
    try {
      correlogramRows = correlogramAxis(parameters).centers.length;
    } catch (error) {
      return {
        ok: false,
        errors: [makeError({
          code: 'INTERNAL_INVARIANT_VIOLATED',
          stage: 'internal',
          instancePath: '/parameters/lagRange',
          skillId: validated.skillId,
          message: error instanceof Error
            ? `the validated correlogram axis could not be materialized during table preflight: ${error.message}`
            : 'the validated correlogram axis could not be materialized during table preflight.',
        })],
      };
    }
    if (correlogramRows > returnedTableLimit) {
      return {
        ok: false,
        errors: [
          makeError({
            code: 'RESOURCE_COMPACTION_UNAVAILABLE',
            stage: 'budget',
            instancePath: '/parameters/lagRange',
            skillId: validated.skillId,
            message: `the complete correlogram audit table requires ${correlogramRows} centred lag-bin rows, over the returned-table limit of ${returnedTableLimit}. Revision 2 has no bin compaction, excerpt, or digest-bound complete sidecar, so Cortexel refuses before pair formation or render allocation.`,
            limit: {
              name: 'returnedTableRows',
              limit: returnedTableLimit,
              observed: correlogramRows,
            },
          }),
        ],
      };
    }
  }

  let spikeAcceptedMarks = 0;
  if (validated.skillId === 'neuro.spike_raster') {
    const sourceEventCount = arr(rec(data.eventTimes)?.values)?.length ?? 0;
    const recordedSenderCount = arr(data.recordedSenderIds)?.length ?? 0;
    const trialCount = Math.max(1, arr(data.trialIds)?.length ?? 0);
    // Saturate at limit + 1 so the multiplication cannot itself overflow and the
    // diagnostic does not pretend to have measured a larger exact product. This
    // runs before compilation allocates the sender-by-trial rows or their maps.
    const rasterRows = recordedSenderCount === 0
      ? 0
      : recordedSenderCount > Math.floor(limits.graphNodes / trialCount)
        ? limits.graphNodes + 1
        : recordedSenderCount * trialCount;
    if (rasterRows > limits.graphNodes) {
      return {
        ok: false,
        errors: [
          makeError({
            code: 'RESOURCE_BUDGET_EXCEEDED',
            stage: 'budget',
            instancePath: '/data/recordedSenderIds',
            skillId: validated.skillId,
            message: `the declared sender-by-trial raster universe requires at least ${rasterRows} rows, over the active limit of ${limits.graphNodes}. Cortexel saturated the product preflight and refused before allocating rows or lookup maps.`,
            limit: {
              name: 'rasterRows',
              limit: limits.graphNodes,
              observed: rasterRows,
            },
          }),
        ],
      };
    }
    if (sourceEventCount > returnedTableLimit) {
      return {
        ok: false,
        errors: [
          makeError({
            code: 'RESOURCE_COMPACTION_UNAVAILABLE',
            stage: 'budget',
            instancePath: '/data/eventTimes/values',
            skillId: validated.skillId,
            message: `the complete spike-event audit table requires ${sourceEventCount} rows, over the returned-table limit of ${returnedTableLimit}. Revision 2 has no excerpt or digest-bound complete sidecar, so Cortexel refuses before sorting events or allocating render geometry.`,
            limit: {
              name: 'returnedTableRows',
              limit: returnedTableLimit,
              observed: sourceEventCount,
            },
          }),
        ],
      };
    }
    try {
      spikeAcceptedMarks = exactSpikeWindowPartition(data).acceptedCount;
    } catch (error) {
      return {
        ok: false,
        errors: [
          makeError({
            code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
            stage: 'science',
            instancePath: '/data/window',
            skillId: validated.skillId,
            message: error instanceof Error
              ? error.message
              : 'the spike window is not representable during resource preflight.',
          }),
        ],
      };
    }
  }

  const binnedMarks = binnedMarkPreflight(validated.skillId, data, parameters);
  const topologyMarks = topologyMarkPreflight(validated.skillId, data, parameters);
  const preflightMarks =
    validated.skillId === 'neuro.spike_raster'
      ? spikeAcceptedMarks
      : topologyMarks > 0
        ? topologyMarks
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
          message: `the request requires ${preflightMarks} visible data marks, over the active limit of ${markLimit}. Cortexel refused it before allocating render geometry.`,
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
    try {
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
          const pairCarrierPath = inputs.kind === 'auto'
            ? '/data/train/eventTimes/values'
            : '/data';
          return {
            ok: false,
            errors: [
              makeError({
                code: 'RESOURCE_PAIRWISE_EXCEEDED',
                stage: 'budget',
                instancePath: pairCarrierPath,
                skillId: validated.skillId,
                message: `the eligible correlogram pair count is at least ${limits.pairwiseOperations + 1}, over the active limit of ${limits.pairwiseOperations}. The bounded sorted-window preflight formed no pairs and Cortexel refuses before derivation or geometry allocation.`,
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
    } catch (error) {
      return {
        ok: false,
        errors: [makeError({
          code: 'INTERNAL_INVARIANT_VIOLATED',
          stage: 'internal',
          instancePath: '/data',
          skillId: validated.skillId,
          message: error instanceof Error
            ? `the validated correlogram could not be closed during pairwise preflight: ${error.message}`
            : 'the validated correlogram could not be closed during pairwise preflight.',
        })],
      };
    }
  }

  const forced = forcedDisclosures(validated.skillId, request);

  const makeContext = (
    _rowsTotal: number,
    extraFacts: Partial<DisclosureFacts> = {},
  ): CompileContext => {
    const facts = disclosureFacts(request, {
      ...extraFacts,
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
      returnedTableRows: returnedTableLimit,
    };
  };

  let compiled: ReturnType<typeof compile>;
  try {
    compiled = compile(
      validated,
      makeContext,
      limits.pairwiseOperations,
      returnedTableLimit,
    );
  } catch (error) {
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

  if (!derivationOperationIdsAreUnique(
    compiled.derivationOperations.map((operation) => operation.id),
  )) {
    return {
      ok: false,
      errors: [makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        skillId: validated.skillId,
        message:
          'the compiler emitted more than 64 derivation operations, a blank operation id, or a duplicate operation id. Operation identity and order must be unambiguous before an artifact is assembled.',
      })],
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

  // Bind the final disclosure set to every emitted presentation surface before summary
  // construction. Family compilers build table rows; this boundary adds the mandatory
  // figure-level metadata so a detached table cannot silently lose the honesty footer.
  const disclosureBlocks = context.disclosures.map((disclosure) => ({
    id: disclosure.id,
    severity: disclosure.severity,
    text: disclosure.text,
  }));
  const disclosureBoundPlan: RenderPlanV1 = {
    ...compiled.plan,
    disclosures: disclosureBlocks,
    table: {
      ...compiled.plan.table,
      metadata: {
        disclosures: disclosureBlocks.map((disclosure) => ({ ...disclosure })),
      },
    },
  };

  // Family compilers independently materialize the exact source-template body. This
  // shared boundary adds only the mandatory registry-derived disclosure suffix; it
  // never replaces that body with evaluator output or a generic summary fallback.
  const summary = appendDisclosureSummarySuffix(
    disclosureBoundPlan.accessibility.summary,
    disclosureBlocks,
  );
  const closure = closePlainRenderPlanForAuthorityV1({
    ...disclosureBoundPlan,
    accessibility: { ...disclosureBoundPlan.accessibility, summary },
  });
  if (closure.tag !== 'closed') {
    return {
      ok: false,
      errors: [makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        skillId: validated.skillId,
        message: `the compiler did not produce a finite detached plain RenderPlan tree: ${closure.problems
          .map((problem) => `${problem.path || '/'} ${problem.message}`)
          .join('; ')}`,
      })],
    };
  }
  const plan = closure.plan;

  let resourceCounts: ReturnType<typeof countPlanResources>;
  try {
    resourceCounts = countPlanResources(plan);
  } catch (error) {
    return {
      ok: false,
      errors: [makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        skillId: validated.skillId,
        message: error instanceof RenderPlanGeometryError
          ? `the closed render plan contains invalid direction-bearing geometry in panel ${error.panelId} at ${error.markPath}: ${error.message}. Cortexel refused it rather than silently dropping the mark.`
          : 'the closed render plan could not be validated for exact resource accounting. Cortexel refused it rather than certify an incomplete figure.',
      })],
    };
  }
  if (topologyMarks > 0 && resourceCounts.markCount !== topologyMarks) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'INTERNAL_INVARIANT_VIOLATED',
          stage: 'internal',
          instancePath: '/data',
          skillId: validated.skillId,
          message: `the topology preflight proved ${topologyMarks} visible data marks, but the closed render plan contains ${resourceCounts.markCount}. Cortexel refused the inconsistent artifact rather than certify incomplete geometry.`,
        }),
      ],
    };
  }
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

  if (plan.table.rowsTotal > returnedTableLimit) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'RESOURCE_COMPACTION_UNAVAILABLE',
          stage: 'budget',
          skillId: validated.skillId,
          message: `the complete returned table requires ${plan.table.rowsTotal} rows, over the active limit of ${returnedTableLimit}. Cortexel V1 has no table excerpt, sidecar, or reference mode, so it refuses instead of returning an incomplete table.`,
          limit: {
            name: 'returnedTableRows',
            limit: returnedTableLimit,
            observed: plan.table.rowsTotal,
          },
        }),
      ],
    };
  }
  const contractSchema = catalog.accessibility.tableColumns;
  const contractColumns = contractSchema.map(({ key, header }) => ({ key, header }));
  const columnKeys = plan.table.columns.map((column) => column.key);
  const columnsMatch = plan.table.columns.length === contractColumns.length &&
    plan.table.columns.every((column, index) =>
      column.key === contractColumns[index].key && column.header === contractColumns[index].header);
  const completeReturnedTable = plan.table.policy === 'complete_returned' &&
    plan.table.rows.length === plan.table.rowsInline &&
    plan.table.rowsInline === plan.table.rowsTotal;
  const keyIndices = contractSchema
    .map((column, index) => column.keyPart ? index : -1)
    .filter((index) => index >= 0);
  const rowsWellFormed = plan.table.rows.every((row) =>
    row.length === plan.table.columns.length &&
    row.every((cell, index) => {
      const column = contractSchema[index];
      if (cell === null) return column.nullable;
      if (typeof cell === 'number') {
        return Number.isFinite(cell) &&
          (column.cellType === 'finite_number' || column.cellType === 'finite_number_or_string');
      }
      return typeof cell === 'string' &&
        (column.cellType === 'string' || column.cellType === 'finite_number_or_string');
    }));
  const compositeKeys = plan.table.rows.map((row) =>
    canonicalize(keyIndices.map((index) => row[index])));
  if (
    !completeReturnedTable ||
    !columnsMatch ||
    new Set(columnKeys).size !== columnKeys.length ||
    keyIndices.length === 0 ||
    !rowsWellFormed ||
    new Set(compositeKeys).size !== compositeKeys.length
  ) {
    return {
      ok: false,
      errors: [
        makeError({
          code: 'INTERNAL_INVARIANT_VIOLATED',
          stage: 'internal',
          skillId: validated.skillId,
          message:
            'the compiler violated the closed complete-returned accessibility-table contract: exact ordered unique columns, complete row accounting, source-declared scalar/null domains, row widths, and unique composite row keys are mandatory. Cortexel refused the artifact.',
        }),
      ],
    };
  }

  // This is deliberately the last RenderPlan operation before serialization. The gate
  // validates request -> frozen-plan translation only; renderSvg remains a separate
  // deterministic serializer and V1 does not claim a post-serialization byte verdict.
  const authorityGate = checkOutputAuthorityEmissionV1(validated, plan);
  if (authorityGate.tag !== 'passed') {
    return {
      ok: false,
      errors: [makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        skillId: validated.skillId,
        message: `the final frozen RenderPlan failed request-bound OutputAuthority translation validation: ${authorityGate.messages.join('; ')}`,
      })],
    };
  }

  let report: SvgReport;
  try {
    report = renderSvg(plan, sha256Digest);
  } catch (error) {
    return {
      ok: false,
      errors: [makeError({
        code: 'INTERNAL_INVARIANT_VIOLATED',
        stage: 'internal',
        skillId: validated.skillId,
        message: error instanceof RenderPlanGeometryError
          ? `the normative SVG serializer refused invalid direction-bearing geometry in panel ${error.panelId} at ${error.markPath}: ${error.message}. No partial SVG was emitted.`
          : 'the normative SVG serializer could not emit the validated closed plan. No partial SVG was emitted.',
      })],
    };
  }
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
    compiled.derivationOperations,
  );
  const artifactStructure = validateArtifactStructure(artifact);
  if (!artifactStructure.ok) return { ok: false, errors: artifactStructure.errors };

  return { ok: true, artifact, svg: report.svg, plan, table: plan.table, disclosures: context.disclosures };
}

function appendDisclosureSummarySuffix(
  compilerSummaryBody: string,
  disclosures: readonly Disclosure[],
): string {
  if (disclosures.length === 0) return compilerSummaryBody;
  const count = disclosures.length;
  return `${compilerSummaryBody} ${count} ${count === 1 ? 'disclosure applies' : 'disclosures apply'}: ${disclosures
    .map((disclosure) => disclosure.text)
    .join(' ')}`;
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

/** Exposed only from the source module for property parity with the Lean natural-number model. */
export function saturatingWeightRowSumForTest(
  increments: readonly number[],
  limit: number,
): WeightRowCountPreflight {
  return saturatingWeightRowSum(increments, limit);
}

/** Exposed only from the source module for the derivation-operation identity postcondition. */
export function derivationOperationIdsAreUniqueForTest(
  operationIds: readonly string[],
): boolean {
  return derivationOperationIdsAreUnique(operationIds);
}

export { canonicalDigest };
