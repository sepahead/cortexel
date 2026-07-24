import { readFileSync } from 'node:fs';
import path from 'node:path';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import { weightTraceObservationKindDeclared } from '../src/core/semantics/weight-trace.js';
import { buildFigure } from '../src/render/index.js';

const source = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/skills/network.synaptic_weight_trace.v1.json'),
  'utf8',
)) as {
  examples: { valid: Record<string, any>[] };
  semanticValidators: { id: string }[];
};

function example(index: number): Record<string, any> {
  return structuredClone(source.examples.valid[index]);
}

function directErrors(request: Record<string, any>) {
  return weightTraceObservationKindDeclared({
    request,
    skillId: 'network.synaptic_weight_trace',
  });
}

function rowObjects(result: any): Record<string, any>[] {
  return result.table.rows.map((row: readonly unknown[]) => Object.fromEntries(
    result.table.columns.map((column: { key: string }, index: number) => [column.key, row[index]]),
  ));
}

function expectRefused(
  request: Record<string, any>,
  code: string,
  instancePath?: string,
): void {
  const direct = directErrors(request);
  expect(direct, `direct validator did not emit ${code}`).toContainEqual(
    expect.objectContaining({
      code,
      ...(instancePath === undefined ? {} : { instancePath }),
      validatorId: 'weight_trace.observation_kind_declared',
    }),
  );

  const checked = validateRequestValue(request);
  expect(checked.ok, `validation accepted counterexample for ${code}`).toBe(false);
  if (!checked.ok) {
    expect(checked.errors.map((error) => error.code)).toContain(code);
  }

  const rendered = buildFigure(request);
  expect(rendered.ok, `render boundary accepted counterexample for ${code}`).toBe(false);
  if (!rendered.ok) {
    expect(rendered.errors.map((error) => error.code)).toContain(code);
  }
}

describe('synaptic-weight trace cross-field closure', () => {
  it('registers the complete validator and accepts every living source vector end to end', () => {
    expect(source.semanticValidators.map(({ id }) => id))
      .toContain('weight_trace.observation_kind_declared');

    for (const [index, request] of source.examples.valid.entries()) {
      expect(directErrors(request), `direct valid[${index}]`).toEqual([]);
      expect(validateRequestValue(request).ok, `pipeline valid[${index}]`).toBe(true);
      expect(buildFigure(request).ok, `render valid[${index}]`).toBe(true);
    }
  });

  it('requires unique, resolvable membership identities instead of Map overwrite semantics', () => {
    const duplicateMember = example(1);
    duplicateMember.data.membership.members[1].edgeId = 'e1';
    expectRefused(
      duplicateMember,
      'SEMANTIC_DUPLICATE_ID',
      '/data/membership/members/1/edgeId',
    );

    const foreignMember = example(1);
    foreignMember.data.membership.members[1].edgeId = 'not-a-series';
    expectRefused(
      foreignMember,
      'SEMANTIC_UNKNOWN_REFERENCE',
      '/data/membership/members/1/edgeId',
    );

    const duplicateSeries = example(1);
    duplicateSeries.data.series[1].edgeId = 'e1';
    expectRefused(
      duplicateSeries,
      'SEMANTIC_DUPLICATE_ID',
      '/data/series/1/edgeId',
    );

    const groupCollision = example(1);
    groupCollision.data.membership.groupId = 'e1';
    expectRefused(
      groupCollision,
      'SEMANTIC_DUPLICATE_ID',
      '/data/membership/groupId',
    );
  });

  it('requires positive, ordered, non-overlapping half-open membership intervals', () => {
    const reversed = example(1);
    reversed.data.membership.members[0].intervals[0] = { start: 50, stop: 10 };
    expectRefused(
      reversed,
      'SCIENCE_WINDOW_INVALID',
      '/data/membership/members/0/intervals/0',
    );

    const overlapping = example(1);
    overlapping.data.membership.members[0].intervals = [
      { start: 0, stop: 600 },
      { start: 500, stop: 900 },
    ];
    expectRefused(
      overlapping,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/membership/members/0/intervals/1',
    );

    const unordered = example(1);
    unordered.data.membership.members[0].intervals = [
      { start: 500, stop: 900 },
      { start: 0, stop: 400 },
    ];
    expectRefused(
      unordered,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/membership/members/0/intervals/1',
    );
  });

  it('checks time/value length for every series, including indices absent from old pointer lists', () => {
    const fourthSeries = example(1);
    const series = structuredClone(fourthSeries.data.series[0]);
    series.edgeId = 'e4';
    series.values.values.pop();
    fourthSeries.data.series.push(series);
    fourthSeries.data.membership.members.push({
      edgeId: 'e4',
      intervals: [{ start: 0, stop: 1000 }],
    });
    expectRefused(
      fourthSeries,
      'SEMANTIC_LENGTH_MISMATCH',
      '/data/series/3',
    );

    const eventLabels = example(0);
    eventLabels.data.series[0].eventKinds.pop();
    expectRefused(
      eventLabels,
      'SEMANTIC_LENGTH_MISMATCH',
      '/data/series/0/eventKinds',
    );
  });

  it('binds the duplicate-free comparability claim for physical and opaque weights', () => {
    const physicalModels = example(0);
    for (const series of physicalModels.data.series) {
      series.values.unit = 'nS';
      if (series.initialWeight) series.initialWeight.quantity.unit = 'nS';
      if (series.bounds?.upper) series.bounds.upper.unit = 'nS';
    }
    physicalModels.data.series[1].synapseModel = 'another_conductance_model';
    expectRefused(
      physicalModels,
      'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
      '/parameters/weightComparability',
    );

    const duplicateClaim = example(0);
    duplicateClaim.parameters.weightComparability = {
      mode: 'declared_comparable_models',
      comparableModels: ['stdp_synapse', 'stdp_synapse'],
    };
    expectRefused(
      duplicateClaim,
      'SEMANTIC_DUPLICATE_ID',
      '/parameters/weightComparability/comparableModels/1',
    );

    const preaggregateClaim = example(2);
    preaggregateClaim.parameters.weightComparability = {
      mode: 'declared_comparable_models',
      comparableModels: ['stdp_synapse', 'another_model'],
    };
    expectRefused(
      preaggregateClaim,
      'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
      '/parameters/weightComparability',
    );

    const heterogeneousAggregateUnits = example(1);
    for (const series of heterogeneousAggregateUnits.data.series) {
      series.values.unit = 'nS';
      if (series.initialWeight) series.initialWeight.quantity.unit = 'nS';
      if (series.bounds?.lower) series.bounds.lower.unit = 'nS';
      if (series.bounds?.upper) series.bounds.upper.unit = 'nS';
    }
    heterogeneousAggregateUnits.data.series[1].values.unit = 'pS';
    heterogeneousAggregateUnits.data.series[1].values.values = [
      1000,
      1000.0000000000002,
      900,
    ];
    if (heterogeneousAggregateUnits.data.series[1].initialWeight) {
      heterogeneousAggregateUnits.data.series[1].initialWeight.quantity.unit = 'pS';
      heterogeneousAggregateUnits.data.series[1].initialWeight.quantity.value = 1000;
    }
    if (heterogeneousAggregateUnits.data.series[1].bounds?.upper) {
      heterogeneousAggregateUnits.data.series[1].bounds.upper.unit = 'pS';
      heterogeneousAggregateUnits.data.series[1].bounds.upper.value = 2000;
    }
    expectRefused(
      heterogeneousAggregateUnits,
      'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
      '/parameters/weightComparability',
    );

    const heterogeneousInitialUnit = example(1);
    for (const series of heterogeneousInitialUnit.data.series) {
      series.values.unit = 'nS';
      if (series.initialWeight) series.initialWeight.quantity.unit = 'nS';
      if (series.bounds?.lower) series.bounds.lower.unit = 'nS';
      if (series.bounds?.upper) series.bounds.upper.unit = 'nS';
    }
    heterogeneousInitialUnit.data.series[1].initialWeight = {
      quantity: {
        kind: 'synaptic_weight',
        unit: 'pS',
        value: 1000.0000000000002,
      },
      origin: 'declared_by_caller',
    };
    expectRefused(
      heterogeneousInitialUnit,
      'SCIENCE_WEIGHT_GROUP_INCOMPATIBLE',
      '/data/series/1/initialWeight/quantity/unit',
    );
  });

  it('binds raw/preaggregated modes to the only honest display mode', () => {
    const rawAsDeclared = example(0);
    rawAsDeclared.parameters.display = 'aggregate_declared';
    expectRefused(
      rawAsDeclared,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/display',
    );

    const declaredAsRaw = example(2);
    declaredAsRaw.parameters.display = 'individual';
    expectRefused(
      declaredAsRaw,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/display',
    );

    const derivedWithoutMembership = example(1);
    delete derivedWithoutMembership.data.membership;
    expectRefused(
      derivedWithoutMembership,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/membership',
    );

    const individualWithMembership = example(0);
    individualWithMembership.data.membership = structuredClone(example(1).data.membership);
    expectRefused(
      individualWithMembership,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/membership',
    );
  });

  it('binds observation kind to the declared aggregation/evaluation semantics', () => {
    const rawContradiction = example(1);
    rawContradiction.data.observation = { kind: 'point_sample' };
    expectRefused(
      rawContradiction,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/aggregate/evaluation/mode',
    );

    const declaredContradiction = example(2);
    declaredContradiction.data.aggregate.observation = { kind: 'point_sample' };
    expectRefused(
      declaredContradiction,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/aggregate/intervalMethod',
    );

    const nonsharedGrid = example(1);
    nonsharedGrid.data.observation = { kind: 'point_sample' };
    nonsharedGrid.parameters.aggregate.evaluation = { mode: 'shared_sample_grid' };
    expectRefused(
      nonsharedGrid,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/series/2/time/values',
    );

    const reversedQuantiles = example(1);
    reversedQuantiles.parameters.aggregate.dispersion = {
      kind: 'quantile_interval',
      lowerQuantile: 0.9,
      upperQuantile: 0.1,
    };
    expectRefused(
      reversedQuantiles,
      'SCIENCE_UNCERTAINTY_LEVEL_INVALID',
      '/parameters/aggregate/dispersion/upperQuantile',
    );

    const medianStandardDeviation = example(1);
    medianStandardDeviation.parameters.aggregate.method = 'median';
    medianStandardDeviation.parameters.aggregate.dispersion = { kind: 'standard_deviation' };
    expectRefused(
      medianStandardDeviation,
      'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
      '/parameters/aggregate/dispersion/kind',
    );

    const reconstructedEvents = example(0);
    reconstructedEvents.data.observation = {
      kind: 'interpolated_trajectory',
      method: 'caller spline',
      interpolant: 'linear',
      reconstructedBy: 'caller',
    };
    expectRefused(
      reconstructedEvents,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/series/0/eventKinds',
    );

    const nonlinearRaw = example(0);
    nonlinearRaw.data.series = nonlinearRaw.data.series.slice(0, 1);
    delete nonlinearRaw.data.series[0].eventKinds;
    nonlinearRaw.data.observation = {
      kind: 'interpolated_trajectory',
      method: 'cubic source reconstruction',
      interpolant: 'cubic_spline',
      reconstructedBy: 'source_system',
    };
    expect(directErrors(nonlinearRaw)).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      instancePath: '/data/observation/interpolant',
    }));
    expect(validateRequestValue(nonlinearRaw).ok).toBe(false);
    expect(buildFigure(nonlinearRaw).ok).toBe(false);

    const nonlinearPreaggregate = example(2);
    nonlinearPreaggregate.data.aggregate.observation = {
      kind: 'interpolated_trajectory',
      method: 'previous-value reconstruction',
      interpolant: 'previous',
      reconstructedBy: 'caller',
    };
    expect(directErrors(nonlinearPreaggregate)).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      instancePath: '/data/aggregate/observation/interpolant',
    }));
    expect(validateRequestValue(nonlinearPreaggregate).ok).toBe(false);
    expect(buildFigure(nonlinearPreaggregate).ok).toBe(false);

    const uncertainReconstruction = example(0);
    uncertainReconstruction.data.series = uncertainReconstruction.data.series.slice(0, 1);
    delete uncertainReconstruction.data.series[0].eventKinds;
    uncertainReconstruction.data.observation = {
      kind: 'interpolated_trajectory',
      method: 'linear source reconstruction',
      interpolant: 'linear',
      reconstructedBy: 'source_system',
    };
    uncertainReconstruction.data.series[0].uncertainty = {
      kind: 'standard_deviation',
      unit: 'nest:weight',
      values: [0.1, 0.1, 0.1, 0.1],
      sampleCount: [2, 2, 2, 2],
      basis: 'replicates',
    };
    expectRefused(
      uncertainReconstruction,
      'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
      '/data/series/0/uncertainty/kind',
    );

    const excludedReconstructionKnot = example(0);
    excludedReconstructionKnot.data.series = excludedReconstructionKnot.data.series.slice(0, 1);
    excludedReconstructionKnot.data.window.start = 50;
    excludedReconstructionKnot.data.series[0].time.values = [10, 60];
    excludedReconstructionKnot.data.series[0].values.values = [1, 2];
    delete excludedReconstructionKnot.data.series[0].eventKinds;
    excludedReconstructionKnot.data.observation = {
      kind: 'interpolated_trajectory',
      method: 'linear source reconstruction',
      interpolant: 'linear',
      reconstructedBy: 'source_system',
    };
    expectRefused(
      excludedReconstructionKnot,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/series/0/time/values',
    );
  });

  it('refuses scientifically undefined duplicate pairing and event-update averaging', () => {
    const eventAverage = example(0);
    eventAverage.data.series[0].time.values[1] = eventAverage.data.series[0].time.values[0];
    eventAverage.parameters.duplicateTimePolicy = { policy: 'aggregate', method: 'mean' };
    expectRefused(
      eventAverage,
      'SCIENCE_DUPLICATE_TIME_POLICY',
      '/parameters/duplicateTimePolicy',
    );

    const eventStableOrder = example(0);
    eventStableOrder.data.series[0].time.values[1] = eventStableOrder.data.series[0].time.values[0];
    eventStableOrder.parameters.duplicateTimePolicy = { policy: 'keep_replicates' };
    expectRefused(
      eventStableOrder,
      'SCIENCE_DUPLICATE_TIME_POLICY',
      '/parameters/duplicateTimePolicy',
    );

    const unidentifiedReplicates = example(1);
    unidentifiedReplicates.data.observation = { kind: 'point_sample' };
    unidentifiedReplicates.parameters.aggregate.evaluation = { mode: 'shared_sample_grid' };
    unidentifiedReplicates.parameters.duplicateTimePolicy = { policy: 'keep_replicates' };
    for (const series of unidentifiedReplicates.data.series) {
      series.recordedInterval.start = 0;
      series.time.values = [0, 0];
      series.values.values = [1, 2];
      delete series.eventKinds;
    }
    for (const member of unidentifiedReplicates.data.membership.members) {
      member.intervals = [{ start: 0, stop: 1000 }];
    }
    expectRefused(
      unidentifiedReplicates,
      'SCIENCE_DUPLICATE_TIME_POLICY',
      '/parameters/duplicateTimePolicy',
    );

    const uncertainPointAggregate = example(0);
    uncertainPointAggregate.data.series = uncertainPointAggregate.data.series.slice(0, 1);
    uncertainPointAggregate.data.observation = { kind: 'point_sample' };
    uncertainPointAggregate.data.series[0].time.values = [10, 10];
    uncertainPointAggregate.data.series[0].values.values = [1, 3];
    uncertainPointAggregate.data.series[0].eventKinds = ['poll', 'poll'];
    uncertainPointAggregate.data.series[0].uncertainty = {
      kind: 'standard_deviation',
      unit: 'nest:weight',
      values: [0.1, 0.2],
      sampleCount: [2, 2],
      basis: 'replicates',
    };
    uncertainPointAggregate.parameters.duplicateTimePolicy = { policy: 'aggregate', method: 'mean' };
    expectRefused(
      uncertainPointAggregate,
      'SCIENCE_DUPLICATE_TIME_POLICY',
      '/data/series/0/uncertainty',
    );

    const duplicateReconstruction = example(0);
    duplicateReconstruction.data.series = duplicateReconstruction.data.series.slice(0, 1);
    duplicateReconstruction.data.series[0].time.values = [10, 10];
    duplicateReconstruction.data.series[0].values.values = [1, 2];
    delete duplicateReconstruction.data.series[0].eventKinds;
    duplicateReconstruction.data.observation = {
      kind: 'interpolated_trajectory',
      method: 'linear source reconstruction',
      interpolant: 'linear',
      reconstructedBy: 'source_system',
    };
    duplicateReconstruction.parameters.duplicateTimePolicy = { policy: 'keep_replicates' };
    expectRefused(
      duplicateReconstruction,
      'SCIENCE_DUPLICATE_TIME_POLICY',
      '/parameters/duplicateTimePolicy',
    );

    const duplicatePointMarkers = example(0);
    duplicatePointMarkers.data.series = duplicatePointMarkers.data.series.slice(0, 1);
    duplicatePointMarkers.data.series[0].time.values = [10, 10];
    duplicatePointMarkers.data.series[0].values.values = [1, 2];
    duplicatePointMarkers.data.series[0].eventKinds = ['poll', 'poll'];
    duplicatePointMarkers.data.observation = { kind: 'point_sample' };
    duplicatePointMarkers.parameters.duplicateTimePolicy = { policy: 'keep_replicates' };
    expectRefused(
      duplicatePointMarkers,
      'SCIENCE_DUPLICATE_TIME_POLICY',
      '/parameters/duplicateTimePolicy',
    );
  });

  it('implements the contract-shaped point-replicate aggregate before shared-grid aggregation', () => {
    const request = example(1);
    request.data.observation = { kind: 'point_sample' };
    request.parameters.aggregate.evaluation = { mode: 'shared_sample_grid' };
    request.parameters.aggregate.dispersion = { kind: 'none', reason: 'not_computed' };
    request.parameters.duplicateTimePolicy = { policy: 'aggregate', method: 'mean' };
    for (const series of request.data.series) {
      series.recordedInterval.start = 0;
      series.time.values = [0, 0, 400];
      series.values.values = [1, 3, 5];
      delete series.eventKinds;
    }
    for (const member of request.data.membership.members) {
      member.intervals = [{ start: 0, stop: 1000 }];
    }
    expect(directErrors(request)).toEqual([]);
    const checked = validateRequestValue(request);
    expect(checked.ok).toBe(true);
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(rowObjects(result)
      .filter((row) => row.seriesId === 'exc_plastic')
      .map((row) => [row.time, row.value, row.contributingCount]))
      .toEqual([[0, 2, 3], [400, 5, 3]]);
  });

  it('requires coherent preaggregated denominators, missingness, and parallel arrays', () => {
    const emptyAggregate = example(2);
    emptyAggregate.data.aggregate.time.values = [];
    emptyAggregate.data.aggregate.values.values = [];
    emptyAggregate.data.aggregate.memberCounts = [];
    emptyAggregate.data.aggregate.contributingCounts = [];
    expect(directErrors(emptyAggregate)).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      instancePath: '/data/aggregate/time/values',
    }));
    expect(validateRequestValue(emptyAggregate).ok).toBe(false);
    expect(buildFigure(emptyAggregate).ok).toBe(false);

    const allMissingAggregate = example(2);
    allMissingAggregate.data.aggregate.values.values = [null, null, null, null];
    allMissingAggregate.data.aggregate.memberCounts = [0, 0, 0, 0];
    allMissingAggregate.data.aggregate.contributingCounts = [0, 0, 0, 0];
    expect(directErrors(allMissingAggregate)).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      instancePath: '/data/aggregate/values/values',
    }));
    expect(validateRequestValue(allMissingAggregate).ok).toBe(false);
    expect(buildFigure(allMissingAggregate).ok).toBe(false);

    const tooManyContributors = example(2);
    tooManyContributors.data.aggregate.contributingCounts[1] = 3;
    expectRefused(
      tooManyContributors,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/aggregate/contributingCounts/1',
    );

    const zeroContributorsWithValue = example(2);
    zeroContributorsWithValue.data.aggregate.values.values[0] = 0;
    expectRefused(
      zeroContributorsWithValue,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/aggregate/values/values/0',
    );

    const contributorsWithMissingValue = example(2);
    contributorsWithMissingValue.data.aggregate.values.values[1] = null;
    expectRefused(
      contributorsWithMissingValue,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/aggregate/values/values/1',
    );

    const mismatchedLengths = example(2);
    mismatchedLengths.data.aggregate.contributingCounts.pop();
    expectRefused(
      mismatchedLengths,
      'SEMANTIC_LENGTH_MISMATCH',
      '/data/aggregate',
    );

    const unsafeCardinality = example(2);
    unsafeCardinality.data.aggregate.memberCounts[1] = Number.MAX_SAFE_INTEGER + 1;
    expect(directErrors(unsafeCardinality)).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      instancePath: '/data/aggregate/memberCounts/1',
    }));
    expect(validateRequestValue(unsafeCardinality).ok).toBe(false);
    expect(buildFigure(unsafeCardinality).ok).toBe(false);

    const unsafeDenominator = example(2);
    unsafeDenominator.data.aggregate.memberCounts[1] = Number.MAX_SAFE_INTEGER;
    unsafeDenominator.data.aggregate.contributingCounts[1] = Number.MAX_SAFE_INTEGER + 1;
    expect(directErrors(unsafeDenominator)).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      instancePath: '/data/aggregate/contributingCounts/1',
    }));
    expect(validateRequestValue(unsafeDenominator).ok).toBe(false);
    expect(buildFigure(unsafeDenominator).ok).toBe(false);

    const contradictoryUncertainty = example(2);
    contradictoryUncertainty.data.aggregate.uncertainty = {
      kind: 'ensemble_range',
      unit: 'nest:weight',
      lower: [null, 1, 0.5, 0.7],
      upper: [null, 1.2, 0.9, 1.1],
      sampleCount: [null, 99, 99, 99],
      basis: 'trials',
    };
    expectRefused(
      contradictoryUncertainty,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/aggregate/uncertainty/basis',
    );

    const impossibleRange = example(2);
    impossibleRange.data.aggregate.uncertainty = {
      kind: 'ensemble_range',
      unit: 'nest:weight',
      lower: [null, 10, 10, 10],
      upper: [null, 20, 20, 20],
      sampleCount: [null, 2, 3, 3],
      basis: 'ensemble_members',
    };
    expectRefused(
      impossibleRange,
      'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
      '/data/aggregate/uncertainty/lower/1',
    );

    const impossibleMinimumQuantiles = example(2);
    impossibleMinimumQuantiles.data.aggregate.method = 'min';
    impossibleMinimumQuantiles.data.aggregate.uncertainty = {
      kind: 'quantile_interval',
      unit: 'nest:weight',
      lower: [null, -20, -20, -20],
      upper: [null, -10, -10, -10],
      lowerQuantile: 0.25,
      upperQuantile: 0.75,
      method: 'empirical_type_7_linear',
      sampleCount: [null, 2, 3, 3],
      basis: 'ensemble_members',
    };
    expectRefused(
      impossibleMinimumQuantiles,
      'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
      '/data/aggregate/uncertainty/lower/1',
    );

    const impossibleMaximumQuantiles = structuredClone(impossibleMinimumQuantiles);
    impossibleMaximumQuantiles.data.aggregate.method = 'max';
    impossibleMaximumQuantiles.data.aggregate.uncertainty.lower = [null, 10, 10, 10];
    impossibleMaximumQuantiles.data.aggregate.uncertainty.upper = [null, 20, 20, 20];
    expectRefused(
      impossibleMaximumQuantiles,
      'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
      '/data/aggregate/uncertainty/upper/1',
    );

    const unnamedQuantileAlgorithm = structuredClone(impossibleMinimumQuantiles);
    unnamedQuantileAlgorithm.data.aggregate.uncertainty.method = 'nearest_rank';
    expectRefused(
      unnamedQuantileAlgorithm,
      'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
      '/data/aggregate/uncertainty/method',
    );

    const impossibleMedianQuantiles = structuredClone(impossibleMaximumQuantiles);
    impossibleMedianQuantiles.data.aggregate.method = 'median';
    expectRefused(
      impossibleMedianQuantiles,
      'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
      '/data/aggregate/uncertainty/lower/1',
    );

    const singletonRange = example(2);
    singletonRange.data.aggregate.memberCounts[1] = 1;
    singletonRange.data.aggregate.contributingCounts[1] = 1;
    singletonRange.data.aggregate.uncertainty = {
      kind: 'ensemble_range',
      unit: 'nest:weight',
      lower: [null, 2, 0.5, 0.7],
      upper: [null, 3, 0.9, 1.1],
      sampleCount: [null, 1, 3, 3],
      basis: 'ensemble_members',
    };
    expectRefused(
      singletonRange,
      'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
      '/data/aggregate/uncertainty/lower/1',
    );

    const singletonSampleDeviation = example(2);
    singletonSampleDeviation.data.aggregate.memberCounts[1] = 1;
    singletonSampleDeviation.data.aggregate.contributingCounts[1] = 1;
    singletonSampleDeviation.data.aggregate.uncertainty = {
      kind: 'standard_deviation',
      unit: 'nest:weight',
      values: [null, 0.5, 0.5, 0.5],
      sampleCount: [null, 1, 3, 3],
      basis: 'ensemble_members',
    };
    expectRefused(
      singletonSampleDeviation,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/aggregate/uncertainty/sampleCount/1',
    );

    const declaredMedianStandardError = example(2);
    declaredMedianStandardError.data.aggregate.method = 'median';
    declaredMedianStandardError.data.aggregate.uncertainty = {
      kind: 'standard_error',
      unit: 'nest:weight',
      values: [null, 0.1, 0.1, 0.1],
      sampleCount: [null, 2, 3, 3],
      basis: 'ensemble_members',
    };
    expectRefused(
      declaredMedianStandardError,
      'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
      '/data/aggregate/uncertainty/kind',
    );
  });

  it('property-checks the preaggregated denominator/null identity over arbitrary rows', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        memberCount: fc.integer({ min: 0, max: 1000 }),
        contributorSeed: fc.nat({ max: 1000 }),
        value: fc.double({ noNaN: true, noDefaultInfinity: true }),
      }), { minLength: 1, maxLength: 64 }),
      (rows) => {
        const request = example(2);
        request.data.aggregate.time.values = rows.map((_, index) => index);
        request.data.aggregate.memberCounts = rows.map(({ memberCount }) => memberCount);
        request.data.aggregate.contributingCounts = rows.map(({ memberCount, contributorSeed }) =>
          contributorSeed % (memberCount + 1));
        request.data.aggregate.values.values = rows.map(({ value }, index) =>
          request.data.aggregate.contributingCounts[index] === 0 ? null : value);
        const errors = directErrors(request);
        if (request.data.aggregate.contributingCounts.some((count: number) => count > 0)) {
          expect(errors).toEqual([]);
        } else {
          expect(errors).toContainEqual(expect.objectContaining({
            code: 'SCIENCE_NORMALIZATION_UNVERIFIABLE',
            instancePath: '/data/aggregate/values/values',
          }));
        }

        const contradicted = structuredClone(request);
        contradicted.data.aggregate.contributingCounts[0] =
          contradicted.data.aggregate.memberCounts[0] + 1;
        contradicted.data.aggregate.values.values[0] ??= 0;
        expect(directErrors(contradicted).map((error) => error.code))
          .toContain('SCIENCE_NORMALIZATION_UNVERIFIABLE');
      },
    ), { numRuns: 256 });
  });

  it('requires preaggregated and caller-declared grids to be ordered and inside the window', () => {
    const duplicateTime = example(2);
    duplicateTime.data.aggregate.time.values[2] = duplicateTime.data.aggregate.time.values[1];
    expectRefused(
      duplicateTime,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/aggregate/time/values/2',
    );

    const outOfWindow = example(2);
    outOfWindow.data.aggregate.time.values[3] = 1000;
    expectRefused(
      outOfWindow,
      'SCIENCE_EVENT_OUT_OF_WINDOW',
      '/data/aggregate/time/values/3',
    );

    const declaredGrid = example(1);
    declaredGrid.parameters.aggregate.evaluation = {
      mode: 'hold_last_observed_at_declared_times',
      times: { kind: 'time', unit: 'ms', values: [0, 400, 400] },
    };
    expectRefused(
      declaredGrid,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/aggregate/evaluation/times/values/2',
    );

    const sparseDeclaredGrid = example(1);
    sparseDeclaredGrid.parameters.aggregate.evaluation = {
      mode: 'hold_last_observed_at_declared_times',
      times: { kind: 'time', unit: 'ms', values: [0, 800] },
    };
    expectRefused(
      sparseDeclaredGrid,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/aggregate/evaluation/times/values',
    );

    const a = 4.909093465297727e-91;
    const z = 4.909093465297728e-91;
    const distortedPreaggregate = example(2);
    distortedPreaggregate.data.window = { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' };
    distortedPreaggregate.data.aggregate.time = {
      kind: 'time',
      unit: 'ms',
      values: [a, z, 500, 750],
    };
    expectRefused(
      distortedPreaggregate,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/aggregate/time/values/1',
    );

    const distortedDeclaredGrid = example(1);
    distortedDeclaredGrid.data.window = { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' };
    distortedDeclaredGrid.data.membership.unit = 's';
    for (const member of distortedDeclaredGrid.data.membership.members) {
      member.intervals = [{ start: 0, stop: 1 }];
    }
    distortedDeclaredGrid.parameters.aggregate.evaluation = {
      mode: 'hold_last_observed_at_declared_times',
      times: { kind: 'time', unit: 'ms', values: [0, a, z, 200, 400, 600, 800] },
    };
    expectRefused(
      distortedDeclaredGrid,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/parameters/aggregate/evaluation/times/values/2',
    );
  });

  it('rejects nonpositive recorded intervals and unsupported member uncertainty', () => {
    const reversedRecording = example(1);
    reversedRecording.data.series[0].recordedInterval = {
      ...reversedRecording.data.series[0].recordedInterval,
      start: 100,
      stop: 100,
    };
    expectRefused(
      reversedRecording,
      'SCIENCE_WINDOW_INVALID',
      '/data/series/0/recordedInterval',
    );

    const disjointRecording = example(1);
    disjointRecording.data.series[0].recordedInterval = {
      ...disjointRecording.data.series[0].recordedInterval,
      start: 2000,
      stop: 3000,
    };
    expectRefused(
      disjointRecording,
      'SCIENCE_WINDOW_INVALID',
      '/data/series/0/recordedInterval',
    );

    const observationOutsideRecording = example(0);
    observationOutsideRecording.data.series[0].recordedInterval = {
      start: 50,
      stop: 1000,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    expectRefused(
      observationOutsideRecording,
      'SCIENCE_EVENT_OUT_OF_WINDOW',
      '/data/series/0/time/values/0',
    );

    const uncertainMember = example(1);
    uncertainMember.data.series[0].uncertainty = {
      kind: 'standard_deviation',
      unit: 'nest:weight',
      values: [0.1, 0.1, 0.1],
      sampleCount: [2, 2, 2],
      basis: 'replicates',
    };
    expectRefused(
      uncertainMember,
      'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
      '/data/series/0/uncertainty/kind',
    );

    const closedDerivedRecording = example(1);
    closedDerivedRecording.data.series[0].recordedInterval.boundary = '[start,stop]';
    expectRefused(
      closedDerivedRecording,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/series/0/recordedInterval/boundary',
    );

    const mixedContinuity = example(1);
    mixedContinuity.data.observation.updateSemantics = 'value_before_update';
    expectRefused(
      mixedContinuity,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/aggregate/evaluation',
    );

    const stableValueBefore = example(1);
    stableValueBefore.parameters.aggregate.dispersion = { kind: 'none', reason: 'not_computed' };
    stableValueBefore.data.observation.updateSemantics = 'value_before_update';
    stableValueBefore.data.series = [stableValueBefore.data.series[0]];
    stableValueBefore.data.series[0].recordedInterval = {
      start: 0,
      stop: 1000,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    stableValueBefore.data.membership.members = [{
      edgeId: 'e1',
      intervals: [{ start: 0, stop: 1000 }],
    }];
    expectRefused(
      stableValueBefore,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/aggregate/evaluation',
    );

    const inclusiveStopTransition = example(1);
    inclusiveStopTransition.parameters.aggregate.dispersion = { kind: 'none', reason: 'not_computed' };
    inclusiveStopTransition.data.window = { start: 0, stop: 1000, unit: 'ms', boundary: '[start,stop]' };
    inclusiveStopTransition.data.observation.updateSemantics = 'value_before_update';
    inclusiveStopTransition.data.series = [inclusiveStopTransition.data.series[0]];
    inclusiveStopTransition.data.series[0].recordedInterval = {
      start: 0,
      stop: 2000,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    inclusiveStopTransition.data.series[0].time.values = [200, 800, 1000];
    inclusiveStopTransition.data.series[0].values.values = [1, 2, 3];
    inclusiveStopTransition.data.series[0].eventKinds = ['poll', 'poll', 'poll'];
    inclusiveStopTransition.data.membership.members = [{
      edgeId: 'e1',
      intervals: [{ start: 0, stop: 1000 }],
    }];
    expectRefused(
      inclusiveStopTransition,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/aggregate/evaluation',
    );

    const inclusiveStartTransition = example(1);
    inclusiveStartTransition.parameters.aggregate.dispersion = { kind: 'none', reason: 'not_computed' };
    inclusiveStartTransition.data.window = { start: 0, stop: 1000, unit: 'ms', boundary: '[start,stop]' };
    inclusiveStartTransition.data.observation.updateSemantics = 'value_before_update';
    inclusiveStartTransition.data.series = inclusiveStartTransition.data.series.slice(0, 2);
    for (const [index, series] of inclusiveStartTransition.data.series.entries()) {
      series.recordedInterval = { start: 0, stop: 2000, unit: 'ms', boundary: '[start,stop)' };
      series.time.values = [1000];
      series.values.values = [index === 0 ? 1 : 10];
      series.eventKinds = ['poll'];
    }
    inclusiveStartTransition.data.membership.members = [
      { edgeId: 'e1', intervals: [{ start: 0, stop: 2000 }] },
      { edgeId: 'e2', intervals: [{ start: 1000, stop: 2000 }] },
    ];
    expectRefused(
      inclusiveStartTransition,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/parameters/aggregate/evaluation',
    );
  });

  it('refuses ungrounded raw-edge uncertainty and validates declared aggregate uncertainty', () => {
    const ungroundedRawDispersion = example(0);
    ungroundedRawDispersion.data.series[0].uncertainty = {
      kind: 'standard_deviation',
      unit: 'nest:weight',
      values: [0.1, 0.1, 0.1, null],
      sampleCount: [2, 2, 2, null],
      basis: 'replicates',
    };
    expectRefused(
      ungroundedRawDispersion,
      'SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL',
      '/data/series/0/uncertainty/kind',
    );

    const coherentDeclaredRange = example(2);
    coherentDeclaredRange.data.aggregate.uncertainty = {
      kind: 'ensemble_range',
      unit: 'nest:weight',
      lower: [null, 1, 0.5, 0.7],
      upper: [null, 1.1, 0.9, 1.1],
      sampleCount: [null, 2, 3, 3],
      basis: 'ensemble_members',
    };
    expect(directErrors(coherentDeclaredRange)).toEqual([]);
    expect(validateRequestValue(coherentDeclaredRange).ok).toBe(true);
    expect(buildFigure(coherentDeclaredRange).ok).toBe(true);

    const negativeDispersion = example(0);
    negativeDispersion.data.series[0].uncertainty = {
      kind: 'standard_deviation',
      unit: 'nest:weight',
      values: [0.1, -0.1, 0.1, null],
      sampleCount: [2, 2, 2, null],
      basis: 'replicates',
    };
    expectRefused(
      negativeDispersion,
      'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
      '/data/series/0/uncertainty/values/1',
    );

    const wrongCentralMask = example(0);
    wrongCentralMask.data.series[0].uncertainty = {
      kind: 'standard_error',
      unit: 'nest:weight',
      values: [0.1, 0.1, 0.1, 0.1],
      sampleCount: [2, 2, 2, 2],
      basis: 'replicates',
    };
    expectRefused(
      wrongCentralMask,
      'SCIENCE_UNCERTAINTY_BOUNDS_INVALID',
      '/data/series/0/uncertainty/values/3',
    );

    const shortAggregateInterval = example(2);
    shortAggregateInterval.data.aggregate.uncertainty = {
      kind: 'ensemble_range',
      unit: 'nest:weight',
      lower: [null, 1, 0.5],
      upper: [null, 1.1, 0.9],
      sampleCount: [null, 2, 3],
      basis: 'ensemble_members',
    };
    expectRefused(
      shortAggregateInterval,
      'SEMANTIC_LENGTH_MISMATCH',
      '/data/aggregate/uncertainty/lower',
    );
  });

  it('rejects an internally reversed reference-bound claim without clamping observations', () => {
    const reversedBounds = example(0);
    reversedBounds.data.series[0].bounds.lower = {
      kind: 'synaptic_weight',
      unit: 'nest:weight',
      value: 3,
    };
    expectRefused(
      reversedBounds,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/series/0/bounds',
    );

    const roundedAwayContradiction = example(0);
    for (const series of roundedAwayContradiction.data.series) {
      series.values.unit = 'nS';
      if (series.initialWeight) series.initialWeight.quantity.unit = 'nS';
      if (series.bounds?.lower) series.bounds.lower.unit = 'nS';
      if (series.bounds?.upper) series.bounds.upper.unit = 'nS';
    }
    roundedAwayContradiction.data.series[0].bounds.lower = {
      kind: 'synaptic_weight',
      unit: 'nS',
      value: 8.102659436467237e262,
    };
    roundedAwayContradiction.data.series[0].bounds.upper = {
      kind: 'synaptic_weight',
      unit: 'S',
      value: 8.102659436467237e253,
    };
    expectRefused(
      roundedAwayContradiction,
      'SCIENCE_NORMALIZATION_UNVERIFIABLE',
      '/data/series/0/bounds',
    );
  });

  it('refuses weight carriers that cannot survive the renderer\'s one-time axis conversion', () => {
    const crossCarrierCollision = example(0);
    crossCarrierCollision.data.series[0].values.unit = 'nS';
    crossCarrierCollision.data.series[0].values.values =
      crossCarrierCollision.data.series[0].time.values.map(() => 1.0000000000000002);
    crossCarrierCollision.data.series[1].values.unit = 'pS';
    crossCarrierCollision.data.series[1].values.values =
      crossCarrierCollision.data.series[1].time.values.map(() => 1000.0000000000002);
    for (const series of crossCarrierCollision.data.series) {
      delete series.initialWeight;
      delete series.bounds;
    }
    expectRefused(
      crossCarrierCollision,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/series/1/values/values/0',
    );

    const centralUnderflow = example(0);
    for (const [index, series] of centralUnderflow.data.series.entries()) {
      const unit = index === 0 ? 'S' : 'pS';
      series.values.unit = unit;
      if (series.initialWeight) series.initialWeight.quantity.unit = unit;
      if (series.bounds?.lower) series.bounds.lower.unit = unit;
      if (series.bounds?.upper) series.bounds.upper.unit = unit;
    }
    centralUnderflow.data.series[1].values.values[0] = Number.MIN_VALUE;
    expectRefused(
      centralUnderflow,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/series/1/values/values/0',
    );

    const initialUnderflow = example(0);
    initialUnderflow.data.series = initialUnderflow.data.series.slice(0, 1);
    initialUnderflow.data.series[0].values.unit = 'S';
    if (initialUnderflow.data.series[0].bounds?.lower) {
      initialUnderflow.data.series[0].bounds.lower.unit = 'S';
    }
    if (initialUnderflow.data.series[0].bounds?.upper) {
      initialUnderflow.data.series[0].bounds.upper.unit = 'S';
    }
    initialUnderflow.data.series[0].initialWeight.quantity = {
      kind: 'synaptic_weight',
      unit: 'pS',
      value: Number.MIN_VALUE,
    };
    expectRefused(
      initialUnderflow,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/series/0/initialWeight/quantity/value',
    );

    const singleBoundUnderflow = structuredClone(initialUnderflow);
    singleBoundUnderflow.data.series[0].initialWeight.quantity = {
      kind: 'synaptic_weight',
      unit: 'S',
      value: 1,
    };
    singleBoundUnderflow.data.series[0].bounds = {
      upper: { kind: 'synaptic_weight', unit: 'pS', value: Number.MIN_VALUE },
      boundKind: 'soft',
      origin: 'declared_by_caller',
    };
    expectRefused(
      singleBoundUnderflow,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/series/0/bounds/upper/value',
    );

    const uncertaintyUnderflow = example(0);
    uncertaintyUnderflow.data.series = uncertaintyUnderflow.data.series.slice(0, 1);
    uncertaintyUnderflow.data.series[0].values.unit = 'S';
    if (uncertaintyUnderflow.data.series[0].initialWeight) {
      uncertaintyUnderflow.data.series[0].initialWeight.quantity.unit = 'S';
    }
    if (uncertaintyUnderflow.data.series[0].bounds?.upper) {
      uncertaintyUnderflow.data.series[0].bounds.upper.unit = 'S';
    }
    uncertaintyUnderflow.data.series[0].uncertainty = {
      kind: 'standard_deviation',
      unit: 'pS',
      values: [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE, null],
      sampleCount: [2, 2, 2, null],
      basis: 'replicates',
    };
    expectRefused(
      uncertaintyUnderflow,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/series/0/uncertainty/values/0',
    );
  });

  it('refuses exact decision boundaries that collide only after unit conversion', () => {
    const membershipCollision = example(1);
    const a = 2.064885582738083e-81;
    const b = 2.0648855827380832e-81;
    const t = 2.064885582738083e-84;
    membershipCollision.data.window = { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' };
    membershipCollision.data.series[0].time = {
      kind: 'time',
      unit: 's',
      values: [t, 0.4, 0.8],
    };
    membershipCollision.data.membership.members[0].intervals = [{ start: a, stop: b }];
    expectRefused(
      membershipCollision,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/membership/members/0/intervals/0',
    );

    const recordedCollision = example(1);
    recordedCollision.data.window = { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' };
    recordedCollision.data.membership.unit = 's';
    for (const member of recordedCollision.data.membership.members) {
      member.intervals = [{ start: 0, stop: 1 }];
    }
    recordedCollision.data.series[0].recordedInterval = {
      start: 0,
      stop: b,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    recordedCollision.data.series[0].time = { kind: 'time', unit: 's', values: [t] };
    recordedCollision.data.series[0].values.values = [7];
    expectRefused(
      recordedCollision,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/series/0/recordedInterval/stop',
    );

    const recordedStartCollision = example(1);
    recordedStartCollision.data.window = { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' };
    recordedStartCollision.data.membership.unit = 's';
    for (const member of recordedStartCollision.data.membership.members) {
      member.intervals = [{ start: 0, stop: 1 }];
    }
    recordedStartCollision.data.series[0].recordedInterval = {
      start: b,
      stop: 1,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    recordedStartCollision.data.series[0].time = { kind: 'time', unit: 's', values: [t] };
    recordedStartCollision.data.series[0].values.values = [7];
    expectRefused(
      recordedStartCollision,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/series/0/recordedInterval/start',
    );

    const exactlyEqualAcrossUnits = example(1);
    exactlyEqualAcrossUnits.data.window = { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' };
    exactlyEqualAcrossUnits.data.membership.unit = 's';
    for (const member of exactlyEqualAcrossUnits.data.membership.members) {
      member.intervals = [{ start: 0, stop: 1 }];
    }
    exactlyEqualAcrossUnits.data.membership.members =
      exactlyEqualAcrossUnits.data.membership.members.slice(0, 1);
    exactlyEqualAcrossUnits.data.series = exactlyEqualAcrossUnits.data.series.slice(0, 1);
    exactlyEqualAcrossUnits.data.series[0].recordedInterval = {
      start: 500,
      stop: 1000,
      unit: 'ms',
      boundary: '[start,stop)',
    };
    exactlyEqualAcrossUnits.data.series[0].time = {
      kind: 'time',
      unit: 's',
      values: [0.5, 0.6, 0.8],
    };
    expect(directErrors(exactlyEqualAcrossUnits)).toEqual([]);

    const preaggregatedBoundaryCollision = example(2);
    preaggregatedBoundaryCollision.data.window = {
      start: t,
      stop: 1,
      unit: 's',
      boundary: '[start,stop)',
    };
    preaggregatedBoundaryCollision.data.aggregate.time = {
      kind: 'time',
      unit: 'ms',
      values: [a, 250, 500, 750],
    };
    expectRefused(
      preaggregatedBoundaryCollision,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/window/start',
    );

    const rawSpacingDistortion = example(0);
    rawSpacingDistortion.data.series = rawSpacingDistortion.data.series.slice(0, 1);
    rawSpacingDistortion.data.window = { start: 0, stop: 1, unit: 's', boundary: '[start,stop)' };
    rawSpacingDistortion.data.series[0].recordedInterval = {
      start: 0,
      stop: 1,
      unit: 's',
      boundary: '[start,stop)',
    };
    rawSpacingDistortion.data.series[0].time = {
      kind: 'time',
      unit: 'ms',
      values: [4.909093465297727e-91, 4.909093465297728e-91],
    };
    rawSpacingDistortion.data.series[0].values.values = [1, 2];
    rawSpacingDistortion.data.series[0].eventKinds = ['poll', 'poll'];
    expectRefused(
      rawSpacingDistortion,
      'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      '/data/series/0/time/values/1',
    );
  });

  it('materializes every union-grid state transition instead of holding across it', () => {
    const request = example(1);
    request.parameters.display = 'aggregate_derived';
    request.parameters.aggregate.dispersion = { kind: 'none', reason: 'not_computed' };
    request.data.series = [request.data.series[0]];
    request.data.series[0].time.values = [0, 800];
    request.data.series[0].values.values = [1, 2];
    request.data.membership.members = [{ edgeId: 'e1', intervals: [{ start: 0, stop: 500 }] }];
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(rowObjects(result)
      .filter((row) => row.seriesId === 'exc_plastic')
      .map((row) => [
        row.time,
        row.value,
        row.memberCount,
        row.contributingCount,
        row.paintedInterval,
      ]))
      .toEqual([
        [0, 1, 1, 1, '{"from":0,"unit":"ms","until":500}'],
        [500, null, 0, 0, null],
        [800, null, 0, 0, null],
      ]);
  });

  it('breaks point-sample member and aggregate runs at an availability transition strictly between samples', () => {
    const request = example(1);
    request.data.observation = { kind: 'point_sample' };
    request.data.series = request.data.series.slice(0, 2);
    request.data.membership.members = [
      { edgeId: 'e1', intervals: [{ start: 0, stop: 500 }] },
      { edgeId: 'e2', intervals: [{ start: 0, stop: 1000 }] },
    ];
    for (const [index, series] of request.data.series.entries()) {
      series.time.values = [100, 900];
      series.values.values = index === 0 ? [1, 2] : [3, 4];
      delete series.eventKinds;
    }
    request.parameters.display = 'aggregate_derived_with_members';
    request.parameters.aggregate.evaluation = { mode: 'shared_sample_grid' };
    request.parameters.aggregate.dispersion = { kind: 'none', reason: 'not_computed' };

    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    const rows = rowObjects(result);
    expect(rows
      .filter((row) => row.seriesId === 'e2')
      .map((row) => [row.time, row.renderRunOrdinal]))
      .toEqual([[100, 0], [900, 1]]);
    expect(rows
      .filter((row) => row.seriesId === 'exc_plastic')
      .map((row) => [row.time, row.renderRunOrdinal]))
      .toEqual([[100, 0], [900, 1]]);
  });

  it('does not break the segment ending exactly at an availability transition', () => {
    const request = example(1);
    request.data.observation = { kind: 'point_sample' };
    request.data.series = request.data.series.slice(0, 2);
    request.data.membership.members = [
      { edgeId: 'e1', intervals: [{ start: 0, stop: 500 }] },
      { edgeId: 'e2', intervals: [{ start: 0, stop: 1000 }] },
    ];
    for (const [index, series] of request.data.series.entries()) {
      series.time.values = [100, 500, 900];
      series.values.values = index === 0 ? [1, 2, 3] : [4, 5, 6];
      delete series.eventKinds;
    }
    request.parameters.display = 'aggregate_derived_with_members';
    request.parameters.aggregate.evaluation = { mode: 'shared_sample_grid' };
    request.parameters.aggregate.dispersion = { kind: 'none', reason: 'not_computed' };

    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    const rows = rowObjects(result);
    expect(rows
      .filter((row) => row.seriesId === 'e2')
      .map((row) => [row.time, row.renderRunOrdinal]))
      .toEqual([[100, 0], [500, 0], [900, 0]]);
    expect(rows
      .filter((row) => row.seriesId === 'exc_plastic')
      .map((row) => [row.time, row.renderRunOrdinal]))
      .toEqual([[100, 0], [500, 0], [900, 0]]);
  });

  it('treats adjacent half-open membership intervals as one continuous membership state', () => {
    const request = example(1);
    request.parameters.aggregate.dispersion = { kind: 'none', reason: 'not_computed' };
    request.data.series = [request.data.series[0]];
    request.data.series[0].time.values = [0, 800];
    request.data.series[0].values.values = [1, 2];
    request.data.membership.members = [{
      edgeId: 'e1',
      intervals: [{ start: 0, stop: 500 }, { start: 500, stop: 1000 }],
    }];
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(rowObjects(result)
      .filter((row) => row.seriesId === 'exc_plastic')
      .map((row) => [row.time, row.memberCount, row.contributingCount]))
      .toEqual([
        [0, 1, 1],
        [500, 1, 1],
        [800, 1, 1],
      ]);
    expect(result.plan.accessibility.summary).toContain(
      '1 identified members represented by declared half-open membership intervals.',
    );
    expect(result.plan.accessibility.summary).not.toContain(
      'time-varying declared intervals',
    );
  });

  it('handles exact extreme mean dispersion and keeps one-member SD missingness coherent', () => {
    const twoMember = example(1);
    twoMember.data.observation = { kind: 'point_sample' };
    twoMember.parameters.display = 'aggregate_derived';
    twoMember.parameters.aggregate.evaluation = { mode: 'shared_sample_grid' };
    twoMember.parameters.aggregate.method = 'mean';
    twoMember.parameters.aggregate.dispersion = { kind: 'standard_deviation' };
    twoMember.data.series = twoMember.data.series.slice(0, 2);
    twoMember.data.membership.members = twoMember.data.membership.members.slice(0, 2);
    for (const [index, series] of twoMember.data.series.entries()) {
      series.time.values = [0];
      series.values.values = [index === 0 ? -1e308 : 1e308];
      delete series.eventKinds;
    }
    const extreme = buildFigure(twoMember);
    expect(extreme.ok).toBe(true);
    if (!extreme.ok) throw new Error(JSON.stringify(extreme.errors));
    const extremeRow = rowObjects(extreme).find((row) => row.seriesId === 'exc_plastic');
    expect(extremeRow?.value).toBe(0);
    expect(extremeRow?.uncertaintyLower).toBeCloseTo(-1.4142135623730951e308, 12);
    expect(extremeRow?.uncertaintyUpper).toBeCloseTo(1.4142135623730951e308, 12);

    const quantileRequest = structuredClone(twoMember);
    quantileRequest.parameters.aggregate.method = 'median';
    quantileRequest.parameters.aggregate.dispersion = {
      kind: 'quantile_interval',
      lowerQuantile: 0.25,
      upperQuantile: 0.75,
    };
    const quantiles = buildFigure(quantileRequest);
    expect(quantiles.ok).toBe(true);
    if (!quantiles.ok) throw new Error(JSON.stringify(quantiles.errors));
    const quantileRow = rowObjects(quantiles).find((row) => row.seriesId === 'exc_plastic');
    expect(quantileRow).toMatchObject({
      value: 0,
      uncertaintyLower: -5e307,
      uncertaintyUpper: 5e307,
    });

    const oneMember = structuredClone(twoMember);
    oneMember.data.series = oneMember.data.series.slice(0, 1);
    oneMember.data.membership.members = oneMember.data.membership.members.slice(0, 1);
    const singleton = buildFigure(oneMember);
    expect(singleton.ok).toBe(true);
    if (!singleton.ok) throw new Error(JSON.stringify(singleton.errors));
    const singletonRow = rowObjects(singleton).find((row) => row.seriesId === 'exc_plastic');
    expect(singletonRow).toMatchObject({ uncertaintyLower: null, uncertaintyUpper: null });
  });

  it('honors closed accepted endpoints and an initial-only event-updated trace', () => {
    const individual = example(0);
    individual.data.window.boundary = '[start,stop]';
    individual.data.series[0].recordedInterval.boundary = '[start,stop]';
    individual.data.series[0].time.values[3] = 1000;
    const closedIndividual = buildFigure(individual);
    expect(closedIndividual.ok).toBe(true);
    if (!closedIndividual.ok) throw new Error(JSON.stringify(closedIndividual.errors));
    expect(rowObjects(closedIndividual).some((row) => row.seriesId === 'syn_12_45_0' && row.time === 1000))
      .toBe(true);

    const preaggregate = example(2);
    preaggregate.data.window.boundary = '[start,stop]';
    preaggregate.data.aggregate.time.values[3] = 1000;
    const closedPreaggregate = buildFigure(preaggregate);
    expect(closedPreaggregate.ok).toBe(true);
    if (!closedPreaggregate.ok) throw new Error(JSON.stringify(closedPreaggregate.errors));
    expect(rowObjects(closedPreaggregate).some((row) => row.time === 1000)).toBe(true);
    expect(closedPreaggregate.plan.accessibility.summary).toContain(
      'caller declared a mean aggregate using interval method hold_last_observed',
    );
    expect(closedPreaggregate.plan.accessibility.summary).toContain(
      'Unique synapse cardinality was not supplied; maximum concurrent memberCount is 3.',
    );

    const initialOnly = example(0);
    initialOnly.data.series[0].time.values = [];
    initialOnly.data.series[0].values.values = [];
    initialOnly.data.series[0].eventKinds = [];
    const initialResult = buildFigure(initialOnly);
    expect(initialResult.ok).toBe(true);
    if (!initialResult.ok) throw new Error(JSON.stringify(initialResult.errors));
    const initialGroup = initialResult.plan.panels.flatMap((panel: any) => panel.marks)
      .find((mark: any) => mark.type === 'group' && mark.id === 'series-syn_12_45_0');
    expect(initialGroup).toBeDefined();
    const initialLine = initialGroup.marks.find((mark: any) => mark.type === 'line');
    expect(initialLine.subpaths[0]).toHaveLength(2);
  });

  it('renders a value-before marker-only carrier and includes marker-only values in the axis domain', () => {
    const markerOnly = example(2);
    markerOnly.data.aggregate.observation = {
      kind: 'event_updated',
      updateSemantics: 'value_before_update',
    };
    markerOnly.data.aggregate.time.values = [0];
    markerOnly.data.aggregate.values.values = [1];
    markerOnly.data.aggregate.memberCounts = [1];
    markerOnly.data.aggregate.contributingCounts = [1];
    markerOnly.data.aggregate.uncertainty = { kind: 'none', reason: 'not_computed' };
    markerOnly.parameters.showObservationMarkers = true;

    const markerOnlyResult = buildFigure(markerOnly);
    expect(markerOnlyResult.ok).toBe(true);
    if (!markerOnlyResult.ok) throw new Error(JSON.stringify(markerOnlyResult.errors));
    const markerOnlyGroup = markerOnlyResult.plan.panels[0].marks
      .find((mark: any) => mark.type === 'group' && mark.id === 'series-exc_plastic') as any;
    expect(markerOnlyGroup.marks.some((mark: any) =>
      mark.type === 'point' && mark.points.length === 1)).toBe(true);

    const domainRequest = structuredClone(markerOnly);
    domainRequest.data.aggregate.time.values = [0, 500];
    domainRequest.data.aggregate.values.values = [100, 1];
    domainRequest.data.aggregate.memberCounts = [1, 1];
    domainRequest.data.aggregate.contributingCounts = [1, 1];
    const domainResult = buildFigure(domainRequest);
    expect(domainResult.ok).toBe(true);
    if (!domainResult.ok) throw new Error(JSON.stringify(domainResult.errors));
    const panel = domainResult.plan.panels[0];
    const group = panel.marks
      .find((mark: any) => mark.type === 'group' && mark.id === 'series-exc_plastic') as any;
    const marker = group.marks
      .find((mark: any) => mark.type === 'point').points
      .find((point: any) => point.authority?.provenance?.sourceOrdinals?.[0] === 0);
    expect(marker.y).toBeGreaterThanOrEqual(panel.y);
    expect(marker.y).toBeLessThanOrEqual(panel.y + panel.height);
  });

  it('renders identified value-before marker-only observations and bounds their marker domain', () => {
    const markerOnly = example(0);
    markerOnly.data.observation = {
      kind: 'event_updated',
      updateSemantics: 'value_before_update',
    };
    markerOnly.data.series[0].time.values = [0];
    markerOnly.data.series[0].values.values = [1];
    markerOnly.data.series[0].eventKinds = ['poll'];
    delete markerOnly.data.series[0].initialWeight;
    delete markerOnly.data.series[0].bounds;
    markerOnly.parameters.showObservationMarkers = true;

    const markerOnlyResult = buildFigure(markerOnly);
    expect(markerOnlyResult.ok).toBe(true);
    if (!markerOnlyResult.ok) throw new Error(JSON.stringify(markerOnlyResult.errors));
    const markerOnlyGroup = markerOnlyResult.plan.panels[0].marks
      .find((mark: any) =>
        mark.type === 'group' && mark.id === 'series-syn_12_45_0') as any;
    expect(markerOnlyGroup.marks.some((mark: any) =>
      mark.type === 'point' && mark.points.length === 1)).toBe(true);

    const domainRequest = structuredClone(markerOnly);
    domainRequest.data.series[0].time.values = [0, 500];
    domainRequest.data.series[0].values.values = [100, 1];
    domainRequest.data.series[0].eventKinds = ['poll', 'poll'];
    const domainResult = buildFigure(domainRequest);
    expect(domainResult.ok).toBe(true);
    if (!domainResult.ok) throw new Error(JSON.stringify(domainResult.errors));
    const panel = domainResult.plan.panels[0];
    const group = panel.marks
      .find((mark: any) =>
        mark.type === 'group' && mark.id === 'series-syn_12_45_0') as any;
    const marker = group.marks
      .find((mark: any) => mark.type === 'point').points
      .find((point: any) => point.authority?.provenance?.sourceOrdinals?.[0] === 0);
    expect(marker.y).toBeGreaterThanOrEqual(panel.y);
    expect(marker.y).toBeLessThanOrEqual(panel.y + panel.height);
  });
});
