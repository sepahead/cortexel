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
import { SKILL_CATALOG } from '../generated/catalog.js';
import { unitLabel } from '../core/units.js';
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
  type Bins,
} from '../analysis/index.js';
import { countPlanResources, renderSvg, type SvgReport } from './svg.js';
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

/**
 * Dispatch a validated request to its family compiler.
 *
 * Every stable family now derives (via src/analysis) and compiles to a real figure. The
 * derivation is the SAME code the golden vectors certify, so the drawn figure and the
 * hand-checked arithmetic cannot diverge. A family whose input is genuinely absent falls
 * back to an explicit `pending` state rather than a fabricated figure.
 */
function compile(
  validated: ValidatedRequest,
  context: (rowsTotal: number) => CompileContext,
  pairwiseOperations: number,
): { plan: RenderPlanV1; rendererId: string } | { pending: string } {
  const request = validated.canonicalRequest;
  const data = rec(request.data) ?? {};
  const parameters = rec(request.parameters) ?? {};
  const skillId = validated.skillId;
  const rendererId = SKILL_CATALOG[skillId].renderer.id;

  const done = (plan: RenderPlanV1) => ({ plan, rendererId });

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

  // ---- trace families ------------------------------------------------------
  if (rendererId === 'figure.analog_trace' || rendererId === 'figure.multisignal_trace' || rendererId === 'figure.compartment_trace' || rendererId === 'figure.synaptic_weight_trace') {
    const series = arr(data.series);
    const first = series && rec(series[0]);
    if (first) {
      // Trace series carry time per-series as `time`, or share one time base at the top
      // level (`data.eventTimes` when `timeBase: "shared"`, or `data.sharedTime`). Values
      // live under `values` (analog/multisignal) or `value`/`weight` (weight trace).
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
    derivation: { operations: [] },
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

  const makeContext = (rowsTotal: number): CompileContext => {
    const facts = disclosureFacts(request, {
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
        panel.height <= 0,
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
            'the requested dimensions leave no positive finite plotting region after axes and mandatory disclosures are reserved. Increase the width or height.',
        }),
      ],
    };
  }

  const context = makeContext(compiled.plan.table.rowsTotal);

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
  );

  return { ok: true, artifact, svg: report.svg, plan, table: plan.table, disclosures: context.disclosures };
}

/**
 * A deterministic, value-filled accessible summary from the compiled plan.
 *
 * Built from the figure's OWN data (its title, its row count, the numeric range of its
 * last table column, its disclosures) rather than an interpretive claim. It states what
 * is plotted, not what it means — a screen reader hears real numbers, never "significant"
 * or "increased".
 */
function buildSummary(plan: RenderPlanV1, title: string): string {
  const rows = plan.table.rowsTotal;
  const valueColumn = plan.table.columns.length - 1;

  const numericValues: number[] = [];
  for (const row of plan.table.rows) {
    const cell = row[valueColumn];
    const value = typeof cell === 'number' ? cell : typeof cell === 'string' ? Number(cell) : NaN;
    if (Number.isFinite(value)) numericValues.push(value);
  }

  const parts = [`${title}.`];
  parts.push(`${rows} ${rows === 1 ? 'row' : 'rows'} of data.`);

  if (numericValues.length > 0 && plan.table.columns.length >= 1) {
    const header = plan.table.columns[valueColumn]?.header ?? 'value';
    const extent = finiteExtent(numericValues)!;
    const min = extent.min;
    const max = extent.max;
    parts.push(`${header} ranges from ${formatSummaryNumber(min)} to ${formatSummaryNumber(max)}.`);
  }

  const disclosureCount = plan.disclosures.length;
  if (disclosureCount > 0) {
    parts.push(
      `${disclosureCount} ${disclosureCount === 1 ? 'disclosure applies' : 'disclosures apply'}: ${plan.disclosures
        .map((disclosure) => disclosure.text)
        .join(' ')}`,
    );
  }
  if (plan.panels[0]?.noData) {
    parts.push(`No data: ${plan.panels[0].noData.reason}.`);
  }

  return parts.join(' ');
}

function formatSummaryNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
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
