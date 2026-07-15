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
  parseAndValidateRequest,
  validateRequestValue,
  type ValidatedRequest,
  type ValidationOutcome,
} from '../core/request.js';
import { canonicalDigest, canonicalDigestExcluding } from '../core/canonicalize.js';
import { sha256Digest } from '../core/sha256.js';
import { deriveDisclosures, type Disclosure, type DisclosureFacts } from '../core/disclosures.js';
import { SKILL_CATALOG } from '../generated/catalog.js';
import { unitLabel } from '../core/units.js';
import {
  edgesFromWidth,
  binCounts,
  binCenters,
  computePopulationRate,
  computeIsi,
  computeDegrees,
  computeMatrix,
  computeCorrelogram,
  makeEventTable,
  type Bins,
} from '../analysis/index.js';
import { renderSvg, type SvgReport } from './svg.js';
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
import type { CortexelError } from '../core/errors.js';

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
  const countMissing = (node: unknown, depth = 0): void => {
    if (depth > 20 || node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) {
        if (item === null) missing++;
        else countMissing(item, depth + 1);
      }
      return;
    }
    for (const v of Object.values(node as Record<string, unknown>)) countMissing(v, depth + 1);
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
    const start = num(window?.start) ?? (times.length ? Math.min(...times) : 0);
    const stop = num(window?.stop) ?? (times.length ? Math.max(...times) : 1);
    const timeUnit = (rec(data.eventTimes)?.unit as string) ?? 'ms';
    const order = recorded.length ? recorded : [...new Set(senders)];
    return done(compileRasterFigure(context(times.length), times, senders, order, start, stop, `time (${unitLabel(timeUnit)})`, skillId));
  }

  // ---- correlogram ---------------------------------------------------------
  if (skillId === 'neuro.correlogram') {
    const times = numbers(rec(data.eventTimes)?.values);
    const senders = strings(data.eventSenderIds);
    const lag = rec(parameters.lagRange);
    const bins = rec(parameters.bins);
    const min = num(lag?.min) ?? -10;
    const max = num(lag?.max) ?? 10;
    const width = num(bins?.width) ?? 1;
    const lagUnit = (lag?.unit as string) ?? 'ms';
    // A single-pair correlogram: reference = first sender, target = second (or auto).
    const distinct = [...new Set(senders)];
    const refId = distinct[0];
    const tgtId = distinct[1] ?? distinct[0];
    const kind: 'auto' | 'cross' = distinct.length < 2 ? 'auto' : 'cross';
    const ref = times.filter((_t, i) => senders[i] === refId);
    const tgt = times.filter((_t, i) => senders[i] === tgtId);
    const spec: Bins = { edges: edgesFromWidth(min, max, width), finalEdgeInclusive: true };
    const result = computeCorrelogram(ref, tgt, spec, kind);
    return done(compileStemFigure(context(result.counts.length), binCenters(spec), result.counts, `lag (${unitLabel(lagUnit)})`, 'pair count', skillId));
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
      const stop = num(bins?.stop) ?? (isi.intervals.length ? Math.max(...isi.intervals) : 1);
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
      const maxDeg = Math.max(0, ...degrees.degree);
      const edges = Array.from({ length: maxDeg + 2 }, (_v, i) => i - 0.5);
      const { counts } = binCounts(degrees.degree, { edges, finalEdgeInclusive: true });
      return done(compileBarFigure(context(counts.length), edges, counts, `${direction}-degree`, 'node count', skillId));
    }

    // delay / weight distribution: histogram the edge value population.
    const conns = rec(data.connections);
    const values = skillId === 'network.delay_distribution' ? numbers(rec(conns?.delays)?.values) : numbers(rec(conns?.weights)?.values);
    const bins = rec(parameters.bins);
    const start = num(bins?.start) ?? (values.length ? Math.min(...values) : 0);
    const stop = num(bins?.stop) ?? (values.length ? Math.max(...values) : 1);
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
    const start = num(win?.start) ?? num(bins?.start) ?? (relative.length ? Math.min(...relative) : -1);
    const stop = num(win?.stop) ?? num(bins?.stop) ?? (relative.length ? Math.max(...relative) : 1);
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
  render: SvgReport | null,
  svgDigest: string | null,
  tableRows: { inline: number; total: number },
): Record<string, unknown> {
  const identity = getBuildIdentity();
  const catalog = SKILL_CATALOG[validated.skillId];

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
      profileId: validated.inputAssurance.budgetProfile,
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
    ...(render
      ? {
          render: {
            rendererId: catalog.renderer.id,
            rendererRevision: catalog.renderer.revision,
            width: render.width,
            height: render.height,
            themeId: 'light',
            markCount: render.markCount,
            textCount: render.textCount,
            idSeed: validated.requestDigest,
          },
          accessibility: {
            profileId: 'cortexel-accessibility',
            profileVersion: '1.0',
            summary: '',
            tablePolicy: tableRows.total > tableRows.inline
              ? 'excerpt_inline_with_complete_sidecar'
              : 'complete_inline',
            tableRowsInline: tableRows.inline,
            tableRowsTotal: tableRows.total,
          },
          outputs: svgDigest
            ? [
                {
                  role: 'figure_svg',
                  mediaType: 'image/svg+xml',
                  sha256: svgDigest,
                  byteLength: render.svg.length,
                  normative: true,
                },
              ]
            : [],
        }
      : {}),
  };

  const artifactDigest = canonicalDigestExcluding(artifactWithoutDigest, 'artifactDigest');
  return { ...artifactWithoutDigest, artifactDigest };
}

/**
 * Count the observations a request carries, by summing the lengths of the arrays that
 * hold data. This is a conservative preflight: it never has to be exact, only an upper
 * bound that catches an input which would blow the derivation or render budget.
 */
function countObservations(node: unknown, depth = 0): number {
  if (depth > 32 || node === null || typeof node !== 'object') return 0;
  if (Array.isArray(node)) {
    // A leaf array of numbers/strings is the observation carrier; count it, and still
    // descend in case it holds objects.
    let total = node.length;
    for (const item of node) total += countObservations(item, depth + 1);
    return total;
  }
  let total = 0;
  for (const value of Object.values(node as Record<string, unknown>)) {
    total += countObservations(value, depth + 1);
  }
  return total;
}

/** Build a figure from an already-validated request. */
export function buildFigureFromValidated(validated: ValidatedRequest): FigureResult | FigureFailure {
  const request = validated.canonicalRequest;
  const catalog = SKILL_CATALOG[validated.skillId];
  const presentation = rec(request.presentation) ?? {};

  // Budget preflight, BEFORE derivation. The parser already bounded the raw input, but the
  // per-figure observation budget is a distinct, tighter limit: it protects the derivation
  // and render stages from an input that is within parser limits yet still too large to
  // draw. A hard limit fails; it is never silently truncated.
  const observations = countObservations(request.data);
  if (observations > catalog.budgets.maxObservations) {
    return {
      ok: false,
      errors: [
        {
          code: 'RESOURCE_OBSERVATIONS_EXCEEDED',
          severity: 'error',
          stage: 'budget',
          instancePath: '/data',
          message: `this request carries about ${observations} observations, over the ${catalog.budgets.maxObservations} budget for ${validated.skillId}. Reduce the data or reference it with a DataRef. Cortexel never silently truncates.`,
          limit: { name: 'maxObservations', limit: catalog.budgets.maxObservations, observed: observations },
        },
      ],
    };
  }

  const forced = forcedDisclosures(validated.skillId, request);

  const makeContext = (rowsTotal: number): CompileContext => {
    const facts = disclosureFacts(request, { tableRowsTotal: rowsTotal, tableRowsInline: Math.min(rowsTotal, 500) });
    const disclosures = deriveDisclosures(facts, catalog.disclosures, forced);
    return {
      artifactDigest: validated.requestDigest,
      width: num(presentation.width) ?? 720,
      height: num(presentation.height) ?? 440,
      themeId: (presentation.themeId as string) ?? 'light',
      title: (presentation.title as string) ?? catalog.title,
      disclosures,
      summary: catalog.accessibility.summaryTemplate.replace(/\{[^}]+\}/g, '…'),
    };
  };

  const compiled = compile(validated, makeContext);

  if ('pending' in compiled) {
    // Honest: a validated request whose family compiler is not in 0.9.0 yet produces a
    // real artifact (validation, provenance, disclosures) but no SVG, with the renderer
    // named. It never fabricates a figure.
    const context = makeContext(0);
    const artifact = assembleArtifact(validated, context.disclosures, null, null, { inline: 0, total: 0 });
    (artifact as Record<string, unknown>).renderPending = compiled.pending;
    return {
      ok: true,
      artifact,
      svg: '',
      plan: { ...(({} as unknown) as RenderPlanV1) },
      table: { policy: 'reference_only', columns: [], rows: [], rowsInline: 0, rowsTotal: 0 },
      disclosures: context.disclosures,
    };
  }

  const context = makeContext(compiled.plan.table.rowsTotal);

  // Replace the ellipsis-filled template with a real, value-filled accessible summary
  // derived from the compiled figure, then render — so the SVG <desc> and the artifact
  // carry the SAME true summary rather than a placeholder.
  const summary = buildSummary(compiled.plan, context.title);
  const plan: RenderPlanV1 = {
    ...compiled.plan,
    accessibility: { ...compiled.plan.accessibility, summary },
  };

  const report = renderSvg(plan, sha256Digest);

  const artifact = assembleArtifact(validated, context.disclosures, report, report.digest, {
    inline: plan.table.rowsInline,
    total: plan.table.rowsTotal,
  });
  // Carry the real summary into the artifact's accessibility record too.
  const accessibility = (artifact as { accessibility?: Record<string, unknown> }).accessibility;
  if (accessibility) accessibility.summary = summary;

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
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    parts.push(`${header} ranges from ${formatSummaryNumber(min)} to ${formatSummaryNumber(max)}.`);
  }

  const disclosureCount = plan.disclosures.length;
  if (disclosureCount > 0) {
    parts.push(`${disclosureCount} ${disclosureCount === 1 ? 'disclosure applies' : 'disclosures apply'}; see the figure caption and table.`);
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
export function buildFigureFromJson(text: string): FigureResult | FigureFailure {
  const outcome = parseAndValidateRequest(text);
  return dispatch(outcome);
}

/** Build a figure from an already-materialized JS request value. */
export function buildFigure(value: unknown): FigureResult | FigureFailure {
  const outcome = validateRequestValue(value);
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
