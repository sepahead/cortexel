import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import { weightTraceObservationKindDeclared } from '../src/core/semantics/weight-trace.js';
import { buildFigure } from '../src/render/buildFigure.js';

const contract = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/skills/network.synaptic_weight_trace.v1.json'),
  'utf8',
)) as { examples: { valid: Record<string, any>[] } };

function example(index: number): Record<string, any> {
  return structuredClone(contract.examples.valid[index]);
}

function direct(request: Record<string, any>) {
  return weightTraceObservationKindDeclared({
    request,
    skillId: 'network.synaptic_weight_trace',
  });
}

function expectInferentialRefusal(
  request: Record<string, any>,
  instancePath: string,
): void {
  expect(direct(request)).toContainEqual(expect.objectContaining({
    code: 'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
    instancePath,
  }));
  expect(validateRequestValue(request).ok).toBe(false);
  expect(buildFigure(request).ok).toBe(false);
}

function allMarks(result: Extract<ReturnType<typeof buildFigure>, { ok: true }>): any[] {
  const output: any[] = [];
  const pending = result.plan.panels.flatMap((panel: any) => panel.marks);
  while (pending.length > 0) {
    const mark = pending.pop();
    output.push(mark);
    if (mark?.type === 'group') pending.push(...mark.marks);
  }
  return output;
}

describe('synaptic-weight uncertainty epistemics', () => {
  it('refuses per-edge uncertainty without an aligned repeat evidence carrier', () => {
    const request = example(0);
    const values = request.data.series[0].values.values as (number | null)[];
    request.data.series[0].uncertainty = {
      kind: 'standard_deviation',
      unit: request.data.series[0].values.unit,
      values: values.map((value) => value === null ? null : 0.1),
      sampleCount: values.map((value) => value === null ? null : 2),
      basis: 'trials',
    };
    expectInferentialRefusal(request, '/data/series/0/uncertainty/kind');
  });

  it('defends the derived boundary against every inferential dispersion discriminator', () => {
    for (const kind of ['standard_error', 'confidence_interval', 'credible_interval']) {
      const request = example(1);
      request.parameters.aggregate.dispersion = { kind };
      expectInferentialRefusal(request, '/parameters/aggregate/dispersion/kind');
    }
  });

  it('refuses caller-declared standard error and confidence intervals without a design', () => {
    const standardError = example(2);
    standardError.data.aggregate.uncertainty = {
      kind: 'standard_error',
      unit: 'nest:weight',
      values: [null, 0.1, 0.1, 0.1],
      sampleCount: [null, 2, 3, 3],
      basis: 'ensemble_members',
    };
    expectInferentialRefusal(standardError, '/data/aggregate/uncertainty/kind');

    const confidenceInterval = example(2);
    confidenceInterval.data.aggregate.uncertainty = {
      kind: 'confidence_interval',
      unit: 'nest:weight',
      lower: [null, 0.95, 0.6, 0.6333333333333333],
      upper: [null, 1.15, 0.8, 0.8333333333333333],
      level: 0.95,
      method: 'caller_asserted_ci',
      coverage: 'pointwise',
      sampleCount: [null, 2, 3, 3],
      basis: 'ensemble_members',
    };
    expectInferentialRefusal(confidenceInterval, '/data/aggregate/uncertainty/kind');
  });

  it('permits descriptive SD only around a mean and preserves its finite-ensemble basis', () => {
    const derivedMean = example(1);
    derivedMean.parameters.aggregate.method = 'mean';
    derivedMean.parameters.aggregate.dispersion = { kind: 'standard_deviation' };
    expect(direct(derivedMean)).toEqual([]);
    expect(validateRequestValue(derivedMean).ok).toBe(true);
    const renderedDerivedMean = buildFigure(derivedMean);
    expect(renderedDerivedMean.ok).toBe(true);
    if (!renderedDerivedMean.ok) throw new Error(JSON.stringify(renderedDerivedMean.errors));
    expect(renderedDerivedMean.plan.accessibility.summary).toContain(
      'standard_deviation (descriptive sample SD across exact ensemble_members; center=arithmetic mean; divisor=n-1; no sampling-population or coverage claim)',
    );

    const derivedMedian = structuredClone(derivedMean);
    derivedMedian.parameters.aggregate.method = 'median';
    expectInferentialRefusal(
      derivedMedian,
      '/parameters/aggregate/dispersion/kind',
    );

    const declaredMean = example(2);
    declaredMean.data.aggregate.uncertainty = {
      kind: 'standard_deviation',
      unit: 'nest:weight',
      values: [null, 0.1, 0.1, 0.1],
      sampleCount: [null, 2, 3, 3],
      basis: 'ensemble_members',
    };
    expect(direct(declaredMean)).toEqual([]);
    expect(validateRequestValue(declaredMean).ok).toBe(true);
    const renderedDeclaredMean = buildFigure(declaredMean);
    expect(renderedDeclaredMean.ok).toBe(true);
    if (!renderedDeclaredMean.ok) throw new Error(JSON.stringify(renderedDeclaredMean.errors));
    expect(renderedDeclaredMean.plan.accessibility.summary).toContain(
      'standard_deviation (descriptive sample SD across exact ensemble_members; center=arithmetic mean; divisor=n-1; no sampling-population or coverage claim)',
    );
  });

  it('keeps empirical quantiles and observed ranges descriptive and renderable', () => {
    const derivedQuantiles = example(1);
    derivedQuantiles.parameters.aggregate.method = 'median';
    derivedQuantiles.parameters.aggregate.dispersion = {
      kind: 'quantile_interval',
      lowerQuantile: 0.25,
      upperQuantile: 0.75,
    };
    expect(direct(derivedQuantiles)).toEqual([]);
    expect(validateRequestValue(derivedQuantiles).ok).toBe(true);
    const renderedQuantiles = buildFigure(derivedQuantiles);
    expect(renderedQuantiles.ok).toBe(true);
    if (!renderedQuantiles.ok) throw new Error(JSON.stringify(renderedQuantiles.errors));
    expect(renderedQuantiles.plan.accessibility.summary).toContain(
      'quantile_interval (descriptive empirical Type-7 linear q=0.25–0.75 across exact ensemble_members; no coverage claim)',
    );

    const declaredRange = example(2);
    declaredRange.data.aggregate.uncertainty = {
      kind: 'ensemble_range',
      unit: 'nest:weight',
      lower: [null, 1, 0.5, 0.7],
      upper: [null, 1.1, 0.9, 1.1],
      sampleCount: [null, 2, 3, 3],
      basis: 'ensemble_members',
    };
    expect(direct(declaredRange)).toEqual([]);
    expect(validateRequestValue(declaredRange).ok).toBe(true);
    const renderedRange = buildFigure(declaredRange);
    expect(renderedRange.ok).toBe(true);
    if (!renderedRange.ok) throw new Error(JSON.stringify(renderedRange.errors));
    expect(renderedRange.plan.accessibility.summary).toContain(
      'ensemble_range (descriptive observed minimum–maximum across exact ensemble_members; no sampling-population or coverage claim)',
    );
  });

  it('renders singleton and marker-only descriptive intervals with exact uncertainty authority', () => {
    const declaredRange = example(2);
    declaredRange.data.aggregate.intervalMethod = 'shared_sample_grid';
    declaredRange.data.aggregate.observation = { kind: 'point_sample' };
    declaredRange.data.aggregate.time.values = [100];
    declaredRange.data.aggregate.values.values = [1];
    declaredRange.data.aggregate.memberCounts = [1];
    declaredRange.data.aggregate.contributingCounts = [1];
    declaredRange.data.aggregate.uncertainty = {
      kind: 'ensemble_range',
      unit: 'nest:weight',
      lower: [1],
      upper: [1],
      sampleCount: [1],
      basis: 'ensemble_members',
    };
    const rangeResult = buildFigure(declaredRange);
    expect(rangeResult.ok).toBe(true);
    if (!rangeResult.ok) throw new Error(JSON.stringify(rangeResult.errors));
    expect(allMarks(rangeResult).some((mark) =>
      mark.type === 'point' &&
      mark.points.some((point: any) =>
        point.authority?.provenance?.atomKind === 'uncertainty_degenerate_marker')))
      .toBe(true);

    const declaredQuantile = structuredClone(declaredRange);
    declaredQuantile.data.aggregate.uncertainty = {
      kind: 'quantile_interval',
      unit: 'nest:weight',
      lower: [1],
      upper: [1],
      lowerQuantile: 0.25,
      upperQuantile: 0.75,
      method: 'empirical_type_7_linear',
      sampleCount: [1],
      basis: 'ensemble_members',
    };
    const quantileResult = buildFigure(declaredQuantile);
    expect(quantileResult.ok).toBe(true);
    if (!quantileResult.ok) throw new Error(JSON.stringify(quantileResult.errors));
    expect(allMarks(quantileResult).some((mark) =>
      mark.type === 'point' &&
      mark.points.some((point: any) =>
        point.authority?.provenance?.atomKind === 'uncertainty_degenerate_marker')))
      .toBe(true);

    const markerOnlyInterval = example(2);
    markerOnlyInterval.data.aggregate.observation = {
      kind: 'event_updated',
      updateSemantics: 'value_before_update',
    };
    markerOnlyInterval.data.aggregate.time.values = [0];
    markerOnlyInterval.data.aggregate.values.values = [1];
    markerOnlyInterval.data.aggregate.memberCounts = [2];
    markerOnlyInterval.data.aggregate.contributingCounts = [2];
    markerOnlyInterval.data.aggregate.uncertainty = {
      kind: 'ensemble_range',
      unit: 'nest:weight',
      lower: [0],
      upper: [2],
      sampleCount: [2],
      basis: 'ensemble_members',
    };
    markerOnlyInterval.parameters.showObservationMarkers = true;
    const markerIntervalResult = buildFigure(markerOnlyInterval);
    expect(markerIntervalResult.ok).toBe(true);
    if (!markerIntervalResult.ok) {
      throw new Error(JSON.stringify(markerIntervalResult.errors));
    }
    expect(allMarks(markerIntervalResult).some((mark) =>
      mark.type === 'area' &&
      mark.subpaths.some((subpath: any[]) =>
        subpath.length === 1 && subpath[0].y0 !== subpath[0].y1)))
      .toBe(true);
    expect(markerIntervalResult.disclosures.some((disclosure) =>
      disclosure.id === 'UNCERTAINTY_COVERAGE_INCOMPLETE')).toBe(false);

    const derivedRange = example(1);
    derivedRange.data.observation = { kind: 'point_sample' };
    derivedRange.data.series = derivedRange.data.series.slice(0, 1);
    derivedRange.data.membership.members = derivedRange.data.membership.members.slice(0, 1);
    derivedRange.data.series[0].time.values = [100];
    derivedRange.data.series[0].values.values = [1];
    delete derivedRange.data.series[0].eventKinds;
    derivedRange.parameters.display = 'aggregate_derived';
    derivedRange.parameters.aggregate.evaluation = { mode: 'shared_sample_grid' };
    derivedRange.parameters.aggregate.dispersion = { kind: 'ensemble_range' };
    const derivedRangeResult = buildFigure(derivedRange);
    expect(derivedRangeResult.ok).toBe(true);
    if (!derivedRangeResult.ok) throw new Error(JSON.stringify(derivedRangeResult.errors));
    expect(allMarks(derivedRangeResult).some((mark) =>
      mark.type === 'point' &&
      mark.points.some((point: any) =>
        point.authority?.provenance?.atomKind === 'uncertainty_degenerate_marker')))
      .toBe(true);
  });
});
