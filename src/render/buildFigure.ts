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
import { edgesFromWidth, computePopulationRate, type Bins } from '../analysis/index.js';
import { renderSvg, type SvgReport } from './svg.js';
import { compileLineFigure, compileStepFigure } from './compile.js';
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

/**
 * Dispatch a validated request to its family compiler.
 *
 * For 0.9.0 the population-rate and trace families render end to end. Other families
 * validate and produce a well-formed artifact with an explicit, honest "renderer pending"
 * state rather than a crash or a fabricated figure — the family compilers land
 * incrementally, each with its own goldens (docs/KNOWN_LIMITATIONS.md).
 */
function compile(
  validated: ValidatedRequest,
  context: (rowsTotal: number) => CompileContext,
): { plan: RenderPlanV1; rendererId: string } | { pending: string } {
  const request = validated.canonicalRequest;
  const data = rec(request.data) ?? {};
  const parameters = rec(request.parameters) ?? {};
  const skillId = validated.skillId;
  const catalog = SKILL_CATALOG[skillId];

  if (skillId === 'neuro.population_rate') {
    const mode = data.mode as string;
    if (mode === 'events') {
      const times = (arr(rec(data.eventTimes)?.values) ?? []).filter((v): v is number => typeof v === 'number');
      const recorded = arr(data.recordedSenderIds) ?? [];
      const bins = rec(parameters.bins);
      const window = rec(data.window);
      const start = num(bins?.start) ?? num(window?.start) ?? 0;
      const stop = num(bins?.stop) ?? num(window?.stop) ?? 1;
      const width = num(bins?.width) ?? stop - start;
      const timeUnit = (bins?.unit as string) ?? (rec(data.eventTimes)?.unit as string) ?? 'ms';
      const normalization = (parameters.normalization as 'mean_rate_per_recorded_sender' | 'total_event_rate') ?? 'total_event_rate';

      const binSpec: Bins = { edges: edgesFromWidth(start, stop, width), finalEdgeInclusive: true };
      const result = computePopulationRate(times, binSpec, timeUnit, recorded.length || 1, normalization);

      const plan = compileStepFigure(
        context(result.count.length),
        result.binStart,
        result.binEnd,
        result.rateHz,
        `time (${unitLabel(timeUnit)})`,
        'rate (Hz)',
        skillId,
      );
      return { plan, rendererId: catalog.renderer.id };
    }
    // prebinned mode: the counts/rates are already the figure.
    const edges = (arr(rec(data.binEdges)?.edges) ?? []).filter((v): v is number => typeof v === 'number');
    const rates = arr(rec(data.rates)?.values) ?? arr(data.counts) ?? [];
    const binStart = edges.slice(0, -1);
    const binEnd = edges.slice(1);
    const values = rates.map((v) => (typeof v === 'number' ? v : 0));
    const plan = compileStepFigure(
      context(values.length),
      binStart,
      binEnd,
      values,
      'time',
      'rate (Hz)',
      skillId,
    );
    return { plan, rendererId: catalog.renderer.id };
  }

  // Trace families: a single x/y line from the first series.
  if (catalog.renderer.id === 'figure.analog_trace' || catalog.renderer.id === 'figure.multisignal_trace') {
    const series = arr(data.series);
    const first = series && rec(series[0]);
    if (first) {
      const time = (arr(rec(first.time)?.values) ?? []).filter((v): v is number => typeof v === 'number');
      const values = (arr(rec(first.values)?.values) ?? []) as (number | null)[];
      const timeUnit = (rec(first.time)?.unit as string) ?? 's';
      const valueUnit = (rec(first.values)?.unit as string) ?? '';
      const plan = compileLineFigure(
        context(time.length),
        time,
        values,
        `time (${unitLabel(timeUnit)})`,
        valueUnit ? `value (${unitLabel(valueUnit)})` : 'value',
        skillId,
      );
      return { plan, rendererId: catalog.renderer.id };
    }
  }

  return { pending: catalog.renderer.id };
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
