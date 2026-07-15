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

/** Build the disclosure facts from the canonical request and derivation outcome. */
function disclosureFacts(
  request: Record<string, unknown>,
  extra: Partial<DisclosureFacts>,
): DisclosureFacts {
  const source = rec(request.source) ?? {};
  const uncertainty = rec(rec(request.parameters)?.uncertainty);
  return {
    sourceKind: (source.kind as string) ?? 'unknown',
    sourceAuthenticityVerified: false,
    referenceComparisonRun: false,
    compacted: false,
    tableRowsInline: 0,
    tableRowsTotal: 0,
    callerNotePresent: typeof source.declaredNote === 'string',
    uncertaintyKind: uncertainty ? (uncertainty.kind as string) : undefined,
    uncertaintyReason: uncertainty ? (uncertainty.reason as string) : undefined,
    ...extra,
  };
}

function numbers(value: unknown): number[] {
  return (arr(value) ?? []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}
function strings(value: unknown): string[] {
  return (arr(value) ?? []).filter((v): v is string => typeof v === 'string');
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
      const binSpec: Bins = { edges: edgesFromWidth(start, stop, width), finalEdgeInclusive: true };
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
      const { counts } = binCounts(isi.intervals, { edges, finalEdgeInclusive: true });
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
    const { counts } = binCounts(values, { edges, finalEdgeInclusive: true });
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
    const values =
      skillId === 'network.weight_matrix' ? numbers(rec(conns?.weights)?.values)
        : skillId === 'network.delay_matrix' ? numbers(rec(conns?.delays)?.values)
          : undefined;
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
    // Align each event to its trial reference, then bin over the relative window.
    const times = numbers(rec(data.eventTimes)?.values);
    const eventTrials = strings(data.eventTrialIds);
    const alignTimes = numbers(data.alignmentTimes);
    const trialIds = strings(data.trialIds);
    const alignByTrial = new Map<string, number>();
    trialIds.forEach((id, i) => { if (i < alignTimes.length) alignByTrial.set(id, alignTimes[i]); });
    const relative = times.map((t, i) => t - (alignByTrial.get(eventTrials[i]) ?? 0)).filter((v) => Number.isFinite(v));
    const win = rec(data.relativeWindow);
    const bins = rec(parameters.bins);
    const start = num(win?.start) ?? num(bins?.start) ?? (relative.length ? Math.min(...relative) : -1);
    const stop = num(win?.stop) ?? num(bins?.stop) ?? (relative.length ? Math.max(...relative) : 1);
    const width = num(bins?.width) ?? ((stop - start) / 10 || 1);
    const unit = (win?.unit as string) ?? (bins?.unit as string) ?? 'ms';
    const edges = start < stop ? edgesFromWidth(start, stop, width) : [start, start + 1];
    const { counts } = binCounts(relative, { edges, finalEdgeInclusive: true });
    const trials = Math.max(1, trialIds.length);
    const perTrial = counts.map((c) => c / trials);
    return done(compileBarFigure(context(perTrial.length), edges, perTrial, `time from alignment (${unitLabel(unit)})`, 'count / trial', skillId));
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

/** Build a figure from an already-validated request. */
export function buildFigureFromValidated(validated: ValidatedRequest): FigureResult | FigureFailure {
  const request = validated.canonicalRequest;
  const catalog = SKILL_CATALOG[validated.skillId];
  const presentation = rec(request.presentation) ?? {};

  const makeContext = (rowsTotal: number): CompileContext => {
    const facts = disclosureFacts(request, { tableRowsTotal: rowsTotal, tableRowsInline: Math.min(rowsTotal, 500) });
    const disclosures = deriveDisclosures(facts, catalog.disclosures, ['LAG_ORIENTATION'].filter(() => false));
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

  const { plan } = compiled;
  const report = renderSvg(plan, sha256Digest);
  const context = makeContext(plan.table.rowsTotal);

  const artifact = assembleArtifact(validated, context.disclosures, report, report.digest, {
    inline: plan.table.rowsInline,
    total: plan.table.rowsTotal,
  });

  return { ok: true, artifact, svg: report.svg, plan, table: plan.table, disclosures: context.disclosures };
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

export { canonicalDigest };
