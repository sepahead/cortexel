import { readFileSync } from 'node:fs';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  deriveDegreeDistribution,
  deriveDelayDistribution,
  deriveExactGroupedHistogram,
  deriveIsiFromEvents,
  deriveIsiFromIntervals,
  derivePopulationRateCounts,
  deriveWeightDistribution,
  DistributionDerivationError,
  exactUnitBinIndex,
} from '../src/analysis/distributions.js';
import {
  degreeCountingPolicyDeclared,
  isiWithinTrainOnly,
  rateVerifyNormalization,
  topologyDelayPositive,
  topologyWeightGroupCompatible,
} from '../src/core/semantics/distributions.js';
import type { SemanticContext } from '../src/core/semantics/types.js';

const ROOT = new URL('../', import.meta.url);

function context(
  skillId: string,
  data: Record<string, unknown>,
  parameters: Record<string, unknown>,
): SemanticContext {
  return { skillId, request: { data, parameters } };
}

function codes(errors: readonly { readonly code: string }[]): string[] {
  return errors.map((error) => error.code);
}

function derivationCode(action: () => unknown): string | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    if (error instanceof DistributionDerivationError) return error.code;
    throw error;
  }
}

describe('declared-unit distribution binning and exact count conservation', () => {
  it('assigns first, shared, and final edges after one registered conversion', () => {
    const openFinal = { edges: [0, 1, 2], unit: 's', finalEdgeInclusive: false } as const;
    const closedFinal = { ...openFinal, finalEdgeInclusive: true } as const;

    expect(exactUnitBinIndex(0, 'ms', openFinal)).toBe(0);
    expect(exactUnitBinIndex(1000, 'ms', openFinal)).toBe(1);
    expect(exactUnitBinIndex(2000, 'ms', openFinal)).toBe(-1);
    expect(exactUnitBinIndex(2000, 'ms', closedFinal)).toBe(1);
    expect(exactUnitBinIndex(-Number.MIN_VALUE, 's', openFinal)).toBe(-1);
    expect(exactUnitBinIndex(0.0025, 's', {
      edges: [0.5, 1.5, 2.5], unit: 'ms', finalEdgeInclusive: true,
    })).toBe(1);
    expect(exactUnitBinIndex(2.5 + 4 * Number.EPSILON, 'ms', {
      edges: [0.5, 1.5, 2.5], unit: 'ms', finalEdgeInclusive: true, edgeToleranceUlps: 8,
    })).toBe(1);
    expect(exactUnitBinIndex(2.5 + 64 * Number.EPSILON, 'ms', {
      edges: [0.5, 1.5, 2.5], unit: 'ms', finalEdgeInclusive: true, edgeToleranceUlps: 8,
    })).toBe(-1);
  });

  it('conserves every observation into exactly one bin, under-range, or over-range class', () => {
    const histogram = deriveExactGroupedHistogram({
      observations: [
        { groupId: 'b', value: -1 },
        { groupId: 'a', value: 0 },
        { groupId: 'a', value: 1 },
        { groupId: 'a', value: 2 },
        { groupId: 'b', value: 3 },
      ],
      groupIds: ['b', 'a'],
      valueUnit: 'ms',
      bins: { edges: [0, 1, 2], unit: 'ms', finalEdgeInclusive: true },
      normalization: 'count',
      outOfRangePolicy: 'exclude_and_report',
    });

    expect(histogram.groups.map((group) => group.groupId)).toEqual(['a', 'b']);
    expect(histogram.groups[0]).toMatchObject({
      counts: [1, 2], observationCount: 3, binnedObservationCount: 3,
      underRangeCount: 0, overRangeCount: 0,
    });
    expect(histogram.groups[1]).toMatchObject({
      counts: [0, 0], observationCount: 2, binnedObservationCount: 0,
      underRangeCount: 1, overRangeCount: 1,
    });
  });

  it('is permutation invariant for arbitrary finite integer observations', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: -10, max: 30 }), { maxLength: 500 }),
      (values) => {
        const derive = (ordered: readonly number[]) => deriveExactGroupedHistogram({
          observations: ordered.map((value, ordinal) => ({
            groupId: ordinal % 2 === 0 ? 'even' : 'odd',
            value,
          })),
          groupIds: ['odd', 'even'],
          valueUnit: 'ms',
          bins: { edges: [0, 10, 20], unit: 'ms', finalEdgeInclusive: true },
          normalization: 'count',
          outOfRangePolicy: 'exclude_and_report',
        });
        // Reverse whole observation records, not only their values/group linkage.
        const records = values.map((value, ordinal) => ({
          groupId: ordinal % 2 === 0 ? 'even' : 'odd',
          value,
        }));
        const forward = deriveExactGroupedHistogram({
          observations: records,
          groupIds: ['odd', 'even'],
          valueUnit: 'ms',
          bins: { edges: [0, 10, 20], unit: 'ms', finalEdgeInclusive: true },
          normalization: 'count',
          outOfRangePolicy: 'exclude_and_report',
        });
        const reverse = deriveExactGroupedHistogram({
          observations: [...records].reverse(),
          groupIds: ['even', 'odd'],
          valueUnit: 'ms',
          bins: { edges: [0, 10, 20], unit: 'ms', finalEdgeInclusive: true },
          normalization: 'count',
          outOfRangePolicy: 'exclude_and_report',
        });
        expect(reverse).toEqual(forward);
        expect(derive(values).groups.flatMap((group) => group.counts).every(Number.isSafeInteger)).toBe(true);
      },
    ), { numRuns: 100 });
  });
});

describe('population-rate conservation', () => {
  it('uses the complete recorded-sender denominator and excludes the final window edge', () => {
    const result = derivePopulationRateCounts({
      eventTimes: [0, 0.5, 1, 1.5],
      eventUnit: 'ms',
      bins: { edges: [0, 1, 2], unit: 'ms', finalEdgeInclusive: false },
      recordedSenderCount: 4,
      normalization: 'mean_rate_per_recorded_sender',
    });
    expect(result.counts).toEqual([2, 2]);
    expect(result.ratesHz).toEqual([500, 500]);
    expect(derivationCode(() => derivePopulationRateCounts({
      eventTimes: [2],
      eventUnit: 'ms',
      bins: { edges: [0, 1, 2], unit: 'ms', finalEdgeInclusive: false },
      recordedSenderCount: 4,
      normalization: 'mean_rate_per_recorded_sender',
    }))).toBe('SCIENCE_BIN_EDGES_INVALID');
  });

  it('detects deletion of the first, middle, or final prebinned count', () => {
    const baseline = [2, 3, 5];
    for (const ordinal of [0, 1, 2]) {
      const counts = [...baseline];
      counts[ordinal]--;
      const errors = rateVerifyNormalization(context(
        'neuro.population_rate',
        {
          mode: 'prebinned',
          binEdges: { unit: 'ms', edges: [0, 1, 2, 3] },
          counts,
          sourceEventCount: 10,
          recordedSenderIds: ['1', '2', '3', '4'],
          recordedSenderCount: 4,
          window: { start: 0, stop: 3, unit: 'ms', boundary: '[start,stop)' },
        },
        { rateMode: 'binned_count', normalization: 'mean_rate_per_recorded_sender' },
      ));
      expect(codes(errors), `tampered bin ${ordinal}`).toContain('SCIENCE_NORMALIZATION_UNVERIFIABLE');
    }
  });

  it('refuses a silent-sender denominator loss and an inconsistent supplied rate', () => {
    const errors = rateVerifyNormalization(context(
      'neuro.population_rate',
      {
        mode: 'prebinned',
        binEdges: { unit: 'ms', edges: [0, 1] },
        counts: [2],
        sourceEventCount: 2,
        recordedSenderIds: ['1', '2', '3', '4'],
        recordedSenderCount: 3,
        rates: { kind: 'firing_rate', unit: 'Hz', values: [999] },
        window: { start: 0, stop: 1, unit: 'ms', boundary: '[start,stop)' },
      },
      { rateMode: 'binned_count', normalization: 'mean_rate_per_recorded_sender' },
    ));
    expect(codes(errors).filter((code) => code === 'SCIENCE_NORMALIZATION_UNVERIFIABLE')).toHaveLength(2);
  });
});

describe('ISI train identities', () => {
  it('never forms an interval across sender or trial boundaries and is permutation invariant', () => {
    const input = {
      eventTimes: [3, 10, 1, 4, 12, 2],
      eventSenderIds: ['a', 'a', 'a', 'b', 'b', 'b'],
      eventTrialIds: ['t1', 't2', 't1', 't1', 't2', 't1'],
      recordedSenderIds: ['a', 'b'],
      trialIds: ['t1', 't2'],
      intervalUnit: 'ms',
      window: { start: 0, stop: 20, unit: 'ms', boundary: '[start,stop)' as const },
      bins: { edges: [0, 2, 4, 20], unit: 'ms', finalEdgeInclusive: true },
      normalization: 'count' as const,
      zeroIntervalPolicy: 'reject' as const,
      outOfRangePolicy: 'reject' as const,
    };
    const forward = deriveIsiFromEvents(input);
    const order = [5, 4, 3, 2, 1, 0];
    const reverse = deriveIsiFromEvents({
      ...input,
      eventTimes: order.map((ordinal) => input.eventTimes[ordinal]),
      eventSenderIds: order.map((ordinal) => input.eventSenderIds[ordinal]),
      eventTrialIds: order.map((ordinal) => input.eventTrialIds[ordinal]),
    });
    expect(reverse).toEqual(forward);
    expect(forward).toMatchObject({ intervalCount: 2, trainCount: 4, trainsWithoutIntervalCount: 2 });
    expect(forward.histogram.groups[0].counts).toEqual([0, 2, 0]);
  });

  it('requires one unique row for every sender×trial train and exact k-1 counts', () => {
    const base = {
      intervals: [2, 3],
      intervalSenderIds: ['a', 'b'],
      intervalTrialIds: ['t1', 't1'],
      recordedSenderIds: ['a', 'b'],
      trialIds: ['t1', 't2'],
      intervalUnit: 'ms',
      window: { start: 0, stop: 10, unit: 'ms', boundary: '[start,stop)' as const },
      bins: { edges: [0, 5], unit: 'ms', finalEdgeInclusive: true },
      normalization: 'count' as const,
      zeroIntervalPolicy: 'reject' as const,
      outOfRangePolicy: 'reject' as const,
    };
    expect(derivationCode(() => deriveIsiFromIntervals({
      ...base,
      trains: [
        { senderId: 'a', trialId: 't1', spikeCount: 2 },
        { senderId: 'a', trialId: 't2', spikeCount: 0 },
        { senderId: 'b', trialId: 't1', spikeCount: 2 },
      ],
    }))).toBe('SEMANTIC_LENGTH_MISMATCH');
    expect(derivationCode(() => deriveIsiFromIntervals({
      ...base,
      trains: [
        { senderId: 'a', trialId: 't1', spikeCount: 2 },
        { senderId: 'a', trialId: 't1', spikeCount: 0 },
        { senderId: 'b', trialId: 't1', spikeCount: 2 },
        { senderId: 'b', trialId: 't2', spikeCount: 0 },
      ],
    }))).toBe('SEMANTIC_DUPLICATE_ID');
    expect(derivationCode(() => deriveIsiFromIntervals({
      ...base,
      trains: [
        { senderId: 'a', trialId: 't1', spikeCount: 3 },
        { senderId: 'a', trialId: 't2', spikeCount: 0 },
        { senderId: 'b', trialId: 't1', spikeCount: 2 },
        { senderId: 'b', trialId: 't2', spikeCount: 0 },
      ],
    }))).toBe('SCIENCE_NORMALIZATION_UNVERIFIABLE');
  });

  it('surfaces the same train-conservation failure through the request semantic gate', () => {
    const errors = isiWithinTrainOnly(context(
      'neuro.isi_distribution',
      {
        mode: 'intervals',
        intervals: { unit: 'ms', values: [2] },
        intervalSenderIds: ['a'],
        intervalTrialIds: ['t1'],
        recordedSenderIds: ['a'],
        trialIds: ['t1', 't2'],
        trains: [{ senderId: 'a', trialId: 't1', spikeCount: 2 }],
        window: { start: 0, stop: 10, unit: 'ms', boundary: '[start,stop)' },
      },
      {
        bins: { mode: 'edges', unit: 'ms', edges: [0, 5], finalEdgeInclusive: true },
        normalization: 'count', zeroIntervalPolicy: 'reject', outOfRangeIntervals: 'reject',
      },
    ));
    expect(codes(errors)).toContain('SEMANTIC_LENGTH_MISMATCH');
  });
});

describe('degree conservation', () => {
  const rows = {
    nodeIds: ['a', 'b', 'c'],
    sourceIds: ['a', 'a', 'a', 'b'],
    targetIds: ['b', 'b', 'a', 'b'],
  } as const;

  it('preserves multapses and autapses under count_edges, and collapses only by policy', () => {
    const edges = deriveDegreeDistribution({
      ...rows, direction: 'in', countingPolicy: 'count_edges', autapsePolicy: 'include',
      binning: { mode: 'per_integer_degree' }, normalization: 'count',
    });
    expect(edges.degrees).toEqual([1, 3, 0]);
    expect(edges.countedConnectionCount).toBe(4);
    expect(edges.countedIncidenceCount).toBe(4);
    expect(edges.nodeCounts).toEqual([1, 1, 0, 1]);

    const unique = deriveDegreeDistribution({
      ...rows, direction: 'in', countingPolicy: 'count_unique_neighbors', autapsePolicy: 'exclude',
      binning: { mode: 'per_integer_degree' }, normalization: 'count',
    });
    expect(unique.degrees).toEqual([0, 1, 0]);
    expect(unique.countedConnectionCount).toBe(2);
    expect(unique.countedIncidenceCount).toBe(1);
    expect(unique.excludedAutapseCount).toBe(2);
  });

  it('refuses supplied incidence drift and loss of a silent zero-degree node', () => {
    const common = {
      nodeIds: ['a', 'b', 'c'],
      suppliedNodeIds: ['a', 'b', 'c'],
      suppliedDegrees: [1, 2, 0],
      suppliedCountedConnectionCount: 3,
      suppliedCountedIncidenceCount: 3,
      direction: 'in' as const,
      countingPolicy: 'count_edges' as const,
      autapsePolicy: 'include' as const,
      binning: { mode: 'per_integer_degree' as const },
      normalization: 'count' as const,
    };
    expect(deriveDegreeDistribution(common).countedIncidenceCount).toBe(3);
    expect(derivationCode(() => deriveDegreeDistribution({
      ...common, suppliedCountedIncidenceCount: 2,
    }))).toBe('SCIENCE_NORMALIZATION_UNVERIFIABLE');
    expect(derivationCode(() => deriveDegreeDistribution({
      ...common,
      suppliedNodeIds: ['a', 'b'], suppliedDegrees: [1, 2],
    }))).toBe('SEMANTIC_LENGTH_MISMATCH');
  });

  it('requires exact rank-local target authority and refuses sampled degree evidence', () => {
    const baseData = {
      mode: 'connections',
      nodeUniverse: { ids: ['a', 'b'], complete: true },
      connections: { sourceIds: ['a'], targetIds: ['b'] },
      observedTargetIds: ['b'],
      scope: { kind: 'mpi_target_rank_local', localTargetUniverseComplete: true },
    };
    const parameters = {
      direction: 'in', countingPolicy: 'count_edges', autapsePolicy: 'include',
      binning: { mode: 'per_integer_degree' }, normalization: 'count',
    };
    expect(codes(degreeCountingPolicyDeclared(context(
      'network.degree_distribution', baseData, parameters,
    )))).toContain('SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL');
    expect(codes(degreeCountingPolicyDeclared(context(
      'network.degree_distribution',
      { ...baseData, observedTargetIds: ['a', 'b'] },
      parameters,
    )))).not.toContain('SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL');
    expect(codes(degreeCountingPolicyDeclared(context(
      'network.degree_distribution',
      { ...baseData, observedTargetIds: ['a', 'b'], scope: { kind: 'sampled' } },
      parameters,
    )))).toContain('SCOPE_INCOMPATIBLE_WITH_SKILL');
  });
});

describe('delay distribution conservation', () => {
  const common = {
    sourceIds: ['a', 'a', 'b'], targetIds: ['x', 'x', 'y'], delayValues: [1, 3, 2],
    delayUnit: 'ms', nodeUniverse: ['a', 'b', 'x', 'y'], groupBy: 'none' as const,
    bins: { edges: [0, 2, 4], unit: 'ms', finalEdgeInclusive: true },
    normalization: 'count' as const, outOfRangePolicy: 'reject' as const,
  };

  it('preserves per-connection multapses and aggregates only in the pair branch', () => {
    const perConnection = deriveDelayDistribution({ ...common, countingPolicy: 'per_connection' });
    expect(perConnection.histogram.groups[0].counts).toEqual([1, 2]);
    expect(perConnection.observationCount).toBe(3);

    const perPair = deriveDelayDistribution({
      ...common, countingPolicy: 'per_ordered_pair', aggregation: 'mean',
    });
    expect(perPair.histogram.groups[0].counts).toEqual([0, 2]);
    expect(perPair.observationCount).toBe(2);
    expect(deriveDelayDistribution({
      ...common,
      sourceIds: [...common.sourceIds].reverse(),
      targetIds: [...common.targetIds].reverse(),
      delayValues: [...common.delayValues].reverse(),
      countingPolicy: 'per_ordered_pair', aggregation: 'mean',
    })).toEqual(perPair);
    expect(derivationCode(() => deriveDelayDistribution({
      ...common,
      sourceIds: [], targetIds: [], delayValues: [], synapseModels: [],
      groupBy: 'synapse_model', countingPolicy: 'per_connection',
    }))).toBe('RENDER_NO_DATA');
  });

  it('preserves nullable carried-delay semantics for historical adjacency consumers', () => {
    const carried = (values: readonly unknown[]) => topologyDelayPositive(context(
      'network.adjacency_matrix',
      { connections: { delays: { unit: 'ms', values } } },
      {},
    ));

    expect(carried([null, 1, 2.5])).toEqual([]);
    expect(codes(carried([null, 0]))).toEqual(['SCIENCE_DELAY_NONPOSITIVE']);
    expect(codes(carried([null, -1]))).toEqual(['SCIENCE_DELAY_NONPOSITIVE']);
  });

  it('rejects pair aggregation over sampled rows and every prebinned count deletion', () => {
    const pairErrors = topologyDelayPositive(context(
      'network.delay_distribution',
      {
        mode: 'connections', nodeUniverse: { ids: ['a', 'b', 'x', 'y'] },
        connections: {
          sourceIds: common.sourceIds, targetIds: common.targetIds,
          delays: { unit: 'ms', values: common.delayValues },
        },
        groupBy: 'none',
        scope: { kind: 'sampled', retainedConnectionCount: 3 },
      },
      {
        countingPolicy: 'per_ordered_pair', multapseAggregation: 'mean',
        bins: { mode: 'edges', unit: 'ms', edges: [0, 2, 4], finalEdgeInclusive: true },
        normalization: 'count', outOfRangeDelays: 'reject',
      },
    ));
    expect(codes(pairErrors)).toContain('SCOPE_INCOMPATIBLE_WITH_SKILL');

    for (const ordinal of [0, 1, 2]) {
      const counts = [2, 3, 5];
      counts[ordinal]--;
      const errors = topologyDelayPositive(context(
        'network.delay_distribution',
        {
          mode: 'prebinned', groupBy: 'none', counts,
          histogram: { kind: 'count', unit: '1', values: counts },
          consideredConnectionCount: 10, totalObservationCount: 10,
          underRangeCount: 0, overRangeCount: 0,
          scope: { kind: 'single_process' },
        },
        {
          countingPolicy: 'per_connection',
          bins: { mode: 'edges', unit: 'ms', edges: [0, 1, 2, 3], finalEdgeInclusive: true },
          normalization: 'count', outOfRangeDelays: 'reject',
        },
      ));
      expect(codes(errors), `tampered delay bin ${ordinal}`).toContain('SCIENCE_NORMALIZATION_UNVERIFIABLE');
    }
  });
});

describe('weight distribution conservation', () => {
  const common = {
    sourceIds: ['a', 'a', 'b'], targetIds: ['x', 'x', 'y'],
    weightValues: [null, 5, 0] as const, weightUnit: 'pA',
    sourceUniverse: ['a', 'b'], targetUniverse: ['x', 'y'],
    synapseModels: ['m', 'm', 'm'], grouping: 'none' as const,
    signTreatment: 'preserve' as const,
    bins: { edges: [-1, 0, 1, 10], unit: 'pA', finalEdgeInclusive: true },
    normalization: 'count' as const, outOfRangePolicy: 'reject' as const,
  };

  it('keeps measured zero disjoint from missing and makes any-missing pairs missing', () => {
    const synapses = deriveWeightDistribution({ ...common, observationUnit: 'synapse' });
    expect(synapses).toMatchObject({
      sourceConnectionCount: 3, observationCount: 2,
      missingConnectionCount: 1, missingObservationCount: 1, zeroObservationCount: 1,
    });
    expect(synapses.histogram.groups[0].counts).toEqual([0, 1, 1]);

    const pairs = deriveWeightDistribution({
      ...common, observationUnit: 'node_pair', aggregation: 'sum',
    });
    expect(pairs).toMatchObject({
      sourceConnectionCount: 3, observationCount: 1,
      missingConnectionCount: 1, missingObservationCount: 1, zeroObservationCount: 1,
    });
    expect(pairs.histogram.groups[0].counts).toEqual([0, 1, 0]);
    expect(derivationCode(() => deriveWeightDistribution({
      ...common, observationUnit: 'node_pair', aggregation: 'no_aggregation',
    }))).toBe('SCIENCE_AGGREGATION_REQUIRED');
    expect(derivationCode(() => deriveWeightDistribution({
      ...common,
      sourceIds: [], targetIds: [], weightValues: [], synapseModels: [],
      grouping: 'by_synapse_model', observationUnit: 'synapse',
    }))).toBe('RENDER_NO_DATA');
  });

  it('refuses endpoint drift, sampled pair claims, comparability drift, and prebinned loss', () => {
    expect(derivationCode(() => deriveWeightDistribution({
      ...common, sourceIds: ['outside', 'a', 'b'], observationUnit: 'synapse',
    }))).toBe('SEMANTIC_UNKNOWN_REFERENCE');

    const connectionErrors = topologyWeightGroupCompatible(context(
      'network.weight_distribution',
      {
        mode: 'connections',
        sourceUniverse: { ids: ['a', 'b'], complete: true },
        targetUniverse: { ids: ['x', 'y'], complete: true },
        connections: {
          sourceIds: ['a', 'a'], targetIds: ['x', 'x'],
          weights: { unit: 'pA', values: [1, 2] }, synapseModels: ['m1', 'm2'],
        },
        scope: { kind: 'sampled', retainedConnectionCount: 2 },
      },
      {
        observationUnit: 'node_pair', aggregation: 'sum', grouping: 'none',
        weightComparability: { mode: 'declared_comparable_models', comparableModels: ['m1', 'wrong'] },
        signTreatment: 'preserve',
        bins: { mode: 'edges', unit: 'pA', edges: [0, 1, 3], finalEdgeInclusive: true },
        normalization: 'count', outOfRangeWeights: 'reject',
      },
    ));
    expect(codes(connectionErrors)).toContain('SCIENCE_WEIGHT_GROUP_INCOMPATIBLE');
    expect(codes(connectionErrors)).toContain('SCOPE_INCOMPATIBLE_WITH_SKILL');

    for (const ordinal of [0, 1, 2]) {
      const counts = [2, 3, 5];
      counts[ordinal]--;
      const errors = topologyWeightGroupCompatible(context(
        'network.weight_distribution',
        {
          mode: 'prebinned',
          sourceUniverse: { ids: ['a'], complete: true },
          targetUniverse: { ids: ['x'], complete: true },
          binEdges: { unit: 'pA', edges: [-1, 0, 1, 2] },
          counts,
          sourceConnectionCount: 10, missingWeightCount: 0, missingObservationCount: 0,
          totalObservationCount: 10, excludedUnderRangeCount: 0, excludedOverRangeCount: 0,
          zeroWeightCount: 0, contributingSynapseModels: ['m'],
          scope: { kind: 'single_process' },
        },
        {
          observationUnit: 'synapse', grouping: 'none',
          weightComparability: { mode: 'single_synapse_model' },
          signTreatment: 'preserve', normalization: 'count', outOfRangeWeights: 'reject',
        },
      ));
      expect(codes(errors), `tampered weight bin ${ordinal}`).toContain('SCIENCE_NORMALIZATION_UNVERIFIABLE');
    }
  });
});

describe('uncertainty surface closure', () => {
  const sources = [
    'contract/skills/neuro.population_rate.v1.json',
    'contract/skills/neuro.isi_distribution.v1.json',
    'contract/skills/network.degree_distribution.v1.json',
    'contract/skills/network.delay_distribution.v1.json',
    'contract/skills/network.weight_distribution.v1.json',
  ] as const;

  it.each(sources)('%s accepts only explicit none and advertises no uncertainty columns', (source) => {
    const contract = JSON.parse(readFileSync(new URL(source, ROOT), 'utf8')) as {
      science: { uncertaintySupport: string[] };
      requestSchema: { parameters: { required: string[]; properties: Record<string, unknown> } };
      accessibility: { tableColumns: { key: string }[]; summaryTemplate: string };
    };
    expect(contract.science.uncertaintySupport).toEqual(['none']);
    expect(contract.requestSchema.parameters.required).toContain('uncertainty');
    expect(JSON.stringify(contract.requestSchema.parameters.properties.uncertainty)).toContain('"const":"none"');
    expect(contract.accessibility.tableColumns.some((column) =>
      column.key.toLowerCase().includes('uncertainty'))).toBe(false);
    expect(contract.accessibility.summaryTemplate).toContain('No sampling uncertainty');
  });
});
