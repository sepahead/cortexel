import { describe, expect, it } from 'vitest';
import {
  AdjacencyMatrixParamsSchema,
  ConnectionGraphParamsSchema,
  DelayDistributionParamsSchema,
  DelayMatrixParamsSchema,
  InDegreeDistributionParamsSchema,
  NetworkParamsSchema,
  SpatialMap2DParamsSchema,
  WeightMatrixParamsSchema,
} from '../core/skills/params';
import {
  getPositionToSpatialMap2DParams,
  normalizeSynapseCollectionSnapshot,
  synapseCollectionToAdjacencyMatrixParams,
  synapseCollectionToConnectionGraphParams,
  synapseCollectionToDelayDistributionParams,
  synapseCollectionToDelayMatrixParams,
  synapseCollectionToInDegreeDistributionParams,
  synapseCollectionToOutDegreeDistributionParams,
  synapseCollectionToWeightMatrixParams,
  type NestTopologyResult,
} from '../core/nest/topology';
import {
  normalizeSynapseCollectionSnapshot as normalizeFromCore,
} from '../core';
import {
  normalizeSynapseCollectionSnapshot as normalizeFromNestIndex,
} from '../core/nest';

function paramsOf<T>(result: NestTopologyResult<T>): T {
  expect(result.ok, result.ok ? undefined : result.errors.join('\n')).toBe(true);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.params;
}

const completeScope = { kind: 'single_process_complete' } as const;

describe('NEST topology exports and raw SynapseCollection normalization', () => {
  it('exports the normalizer through both public core boundaries', () => {
    expect(normalizeFromCore).toBe(normalizeSynapseCollectionSnapshot);
    expect(normalizeFromNestIndex).toBe(normalizeSynapseCollectionSnapshot);
  });

  it('accepts documented singular keys, typed arrays, scalars, and the legacy plural family', () => {
    expect(paramsOf(normalizeSynapseCollectionSnapshot({
      source: new Uint32Array([2, 1]),
      target: new Uint32Array([3, 4]),
      weight: new Float64Array([0.5, -0.25]),
      delay: new Float64Array([1, 2]),
      synapse_model: ['static_synapse', 'stdp_synapse'],
    }))).toEqual({
      sources: [2, 1],
      targets: [3, 4],
      weights: [0.5, -0.25],
      delays_ms: [1, 2],
      synapse_models: ['static_synapse', 'stdp_synapse'],
    });
    expect(paramsOf(normalizeSynapseCollectionSnapshot({ source: 1, target: 2 }))).toEqual({
      sources: [1],
      targets: [2],
    });
    expect(paramsOf(normalizeSynapseCollectionSnapshot({ sources: [], targets: [] }))).toEqual({
      sources: [],
      targets: [],
    });
  });

  it('rejects mixed alias families, plural scalars, broadcasting, and partial identity tuples', () => {
    expect(normalizeSynapseCollectionSnapshot({ source: [1], targets: [2] }).ok).toBe(false);
    expect(normalizeSynapseCollectionSnapshot({ sources: 1, targets: [2] }).ok).toBe(false);
    expect(normalizeSynapseCollectionSnapshot({
      source: [1, 2], target: [2, 3], weight: 0.5,
    }).ok).toBe(false);
    expect(normalizeSynapseCollectionSnapshot({
      source: [1], target: [2], target_thread: [0], synapse_id: [1],
    }).ok).toBe(false);
    expect(normalizeSynapseCollectionSnapshot({
      source: [1], sources: [1], target: [2],
    }).ok).toBe(false);
  });

  it('rejects explicitly undefined optional fields, sparse arrays, and accessors without reading them', () => {
    expect(normalizeSynapseCollectionSnapshot({
      source: [1], target: [2], weight: undefined,
    }).ok).toBe(false);
    expect(normalizeSynapseCollectionSnapshot({
      source: [1], target: [2], target_thread: undefined,
      synapse_id: [1], port: [0],
    }).ok).toBe(false);

    const sparse: number[] = [];
    sparse.length = 2;
    sparse[0] = 1;
    expect(normalizeSynapseCollectionSnapshot({ source: sparse, target: [2, 3] }).ok).toBe(false);

    let reads = 0;
    const selectedGetter: Record<string, unknown> = { target: [2] };
    Object.defineProperty(selectedGetter, 'source', {
      enumerable: true,
      get() {
        reads += 1;
        return [1];
      },
    });
    expect(normalizeSynapseCollectionSnapshot(selectedGetter).ok).toBe(false);
    expect(reads).toBe(0);

    const ignoredGetter: Record<string, unknown> = { source: [1], target: [2] };
    Object.defineProperty(ignoredGetter, 'unrelated_status', {
      enumerable: true,
      get() {
        reads += 1;
        throw new Error('must not run');
      },
    });
    expect(normalizeSynapseCollectionSnapshot(ignoredGetter).ok).toBe(true);
    expect(reads).toBe(0);
  });

  it('rejects negative zero at raw and option boundaries', () => {
    expect(normalizeSynapseCollectionSnapshot({
      source: [1], target: [2], weight: [-0],
    }).ok).toBe(false);
    expect(synapseCollectionToAdjacencyMatrixParams(
      { source: [1], target: [2] },
      {
        sourceIds: [1], targetIds: [2], snapshotTimeMs: -0,
        snapshotScope: completeScope,
      },
    ).ok).toBe(false);
    expect(synapseCollectionToAdjacencyMatrixParams(
      { source: [1], target: [2] },
      {
        sourceIds: [1], targetIds: [2], snapshotTimeMs: 0,
        snapshotScope: { kind: 'mpi_target_rank_local', rank: -0, world_size: 2 },
      },
    ).ok).toBe(false);
    expect(getPositionToSpatialMap2DParams(
      [[-0, 0]],
      {
        nodeIds: [1], coordinateUnits: 'mm', extent: [1, 1], center: [0, 0],
        edgeWrap: false, positionScope: completeScope,
      },
    ).ok).toBe(false);
  });
});

describe('connection graph transform', () => {
  it('preserves isolates, autapses, multapses, measurements, scope, and official connection ids', () => {
    const params = paramsOf(synapseCollectionToConnectionGraphParams({
      source: [2, 1, 1, 3],
      target: [2, 2, 2, 1],
      weight: [2, 1, 0.5, 3],
      delay: [2, 1, 1.5, 3],
      synapse_model: ['static_synapse', 'static_synapse', 'static_synapse', 'static_synapse'],
      target_thread: [0, 0, 1, 0],
      synapse_id: [13, 11, 12, 14],
      port: [0, 0, 0, 0],
    }, {
      sourceIds: [1, 2, 3, 4],
      targetIds: [1, 2, 5],
      snapshotTimeMs: 25,
      snapshotScope: { kind: 'mpi_all_ranks_merged', world_size: 2 },
      samplePolicy: { kind: 'complete' },
      weightUnits: 'nS',
      delayUnits: 'ms',
    }));

    expect(params.nodes.map((node) => node.id)).toEqual([1, 2, 3, 4, 5]);
    expect(params.edges.map((edge) => [edge.id, edge.source, edge.target])).toEqual([
      ['connection:1:2:0:11:0', 1, 2],
      ['connection:1:2:1:12:0', 1, 2],
      ['connection:2:2:0:13:0', 2, 2],
      ['connection:3:1:0:14:0', 3, 1],
    ]);
    expect(params.edges.map((edge) => edge.weight)).toEqual([1, 0.5, 2, 3]);
    expect(params).toMatchObject({
      weight_units: 'nS',
      delay_units: 'ms',
      parallel_edges: 'preserved',
      self_connections: 'preserved',
      sample_policy: 'complete',
      source_connection_count: 4,
      edge_identity: 'nest_connection_identifier',
      snapshot_scope: { kind: 'mpi_all_ranks_merged', world_size: 2 },
    });
  });

  it('uses stable UTF-16 ordering and samples both canonical endpoints across input permutations', () => {
    const rows = [
      { model: '𝄞' },
      { model: 'z' },
      { model: 'ä' },
      { model: 'Ω' },
    ];
    const run = (order: number[]) => paramsOf(synapseCollectionToConnectionGraphParams({
      source: order.map(() => 1),
      target: order.map(() => 2),
      synapse_model: order.map((index) => rows[index].model),
    }, {
      sourceIds: [1], targetIds: [2], snapshotTimeMs: 0,
      snapshotScope: completeScope,
      samplePolicy: { kind: 'deterministic_even_stride', maxEdges: 2 },
    }));
    const first = run([0, 1, 2, 3]);
    const permuted = run([2, 3, 0, 1]);
    expect(first.edges).toEqual(permuted.edges);
    expect(first.edges.map((edge) => edge.synapse_model)).toEqual(['z', '𝄞']);
    expect(first.edges.map((edge) => edge.id)).toEqual(['connection:0', 'connection:3']);

    const midpoint = paramsOf(synapseCollectionToConnectionGraphParams({
      source: [1, 1, 1], target: [2, 2, 2], synapse_model: ['a', 'b', 'c'],
    }, {
      sourceIds: [1], targetIds: [2], snapshotTimeMs: 0,
      snapshotScope: completeScope,
      samplePolicy: { kind: 'deterministic_even_stride', maxEdges: 1 },
    }));
    expect(midpoint.edges).toEqual([expect.objectContaining({
      id: 'connection:1', synapse_model: 'b',
    })]);
  });

  it('keeps legitimate empty snapshots renderable and rejects undeclared endpoints', () => {
    const empty = paramsOf(synapseCollectionToConnectionGraphParams({
      source: [], target: [], weight: [], delay: [],
    }, {
      sourceIds: [1], targetIds: [2], snapshotTimeMs: 0,
      snapshotScope: completeScope, samplePolicy: { kind: 'complete' },
      weightUnits: 'nS', delayUnits: 'ms',
    }));
    expect(empty.edges).toEqual([]);
    expect(Object.hasOwn(empty, 'weight_units')).toBe(false);
    expect(Object.hasOwn(empty, 'delay_units')).toBe(false);
    expect(ConnectionGraphParamsSchema.safeParse(empty).success).toBe(true);

    expect(synapseCollectionToConnectionGraphParams(
      { source: [9], target: [2] },
      {
        sourceIds: [1], targetIds: [2], snapshotTimeMs: 0,
        snapshotScope: completeScope, samplePolicy: { kind: 'complete' },
      },
    ).ok).toBe(false);
  });

  it('binds every disclosed edge-identity mode to its canonical id grammar', () => {
    const canonical = paramsOf(synapseCollectionToConnectionGraphParams(
      { source: [1], target: [2] },
      {
        sourceIds: [1], targetIds: [2], snapshotTimeMs: 0,
        snapshotScope: completeScope, samplePolicy: { kind: 'complete' },
      },
    ));
    expect(ConnectionGraphParamsSchema.safeParse({
      ...canonical,
      edges: [{ ...canonical.edges[0], id: 'not-a-canonical-id' }],
    }).success).toBe(false);
    expect(ConnectionGraphParamsSchema.safeParse({
      ...canonical,
      edges: [{ ...canonical.edges[0], id: 'connection:1' }],
    }).success).toBe(false);
    expect(ConnectionGraphParamsSchema.safeParse({
      ...canonical,
      edge_identity: 'nest_connection_identifier',
      edges: [{ ...canonical.edges[0], id: 'connection:9:2:0:1:0' }],
    }).success).toBe(false);
  });
});

describe('sparse connection matrices', () => {
  const snapshot = {
    sourceIds: [1, 2], targetIds: [3, 4], snapshotTimeMs: 10,
    snapshotScope: completeScope,
  };

  it('aggregates multapses without conflating absence with a zero weight', () => {
    const adjacency = paramsOf(synapseCollectionToAdjacencyMatrixParams({
      source: [1, 1, 2], target: [3, 3, 4],
    }, snapshot));
    expect(adjacency.cells).toEqual([
      { source_id: 1, target_id: 3, connection_count: 2 },
      { source_id: 2, target_id: 4, connection_count: 1 },
    ]);

    const weights = paramsOf(synapseCollectionToWeightMatrixParams({
      source: [1, 1], target: [3, 3], weight: [1, -1],
    }, { ...snapshot, weightUnits: 'nS', aggregation: 'sum' }));
    expect(weights.cells).toEqual([
      { source_id: 1, target_id: 3, connection_count: 2, value: 0 },
    ]);

    const delays = paramsOf(synapseCollectionToDelayMatrixParams({
      source: [1, 1], target: [3, 3], delay: [1, 3],
    }, { ...snapshot, delayUnits: 'ms', aggregation: 'mean' }));
    expect(delays.cells[0]).toEqual({
      source_id: 1, target_id: 3, connection_count: 2, value: 2,
    });
  });

  it('rejects duplicate/dangling/zero-count cells, tampered totals, and invalid single aggregation', () => {
    const valid = paramsOf(synapseCollectionToAdjacencyMatrixParams({
      source: [1, 1], target: [3, 3],
    }, snapshot));
    expect(AdjacencyMatrixParamsSchema.safeParse({
      ...valid,
      cells: [...valid.cells, structuredClone(valid.cells[0])],
      connection_count: 4,
    }).success).toBe(false);
    expect(AdjacencyMatrixParamsSchema.safeParse({
      ...valid, cells: [{ ...valid.cells[0], target_id: 99 }],
    }).success).toBe(false);
    expect(AdjacencyMatrixParamsSchema.safeParse({
      ...valid, cells: [{ ...valid.cells[0], connection_count: 0 }], connection_count: 0,
    }).success).toBe(false);
    expect(AdjacencyMatrixParamsSchema.safeParse({ ...valid, connection_count: 3 }).success).toBe(false);

    const weight = paramsOf(synapseCollectionToWeightMatrixParams({
      source: [1, 1], target: [3, 3], weight: [1, -1],
    }, { ...snapshot, weightUnits: 'nS', aggregation: 'sum' }));
    expect(WeightMatrixParamsSchema.safeParse({
      ...weight, aggregation: 'single_connection',
    }).success).toBe(false);
    const delay = paramsOf(synapseCollectionToDelayMatrixParams({
      source: [1, 1], target: [3, 3], delay: [1, 2],
    }, { ...snapshot, delayUnits: 'ms', aggregation: 'mean' }));
    expect(DelayMatrixParamsSchema.safeParse({
      ...delay, aggregation: 'single_connection',
    }).success).toBe(false);
    expect(synapseCollectionToWeightMatrixParams({
      source: [1, 1], target: [3, 3], weight: [-5e-324, 0],
    }, { ...snapshot, weightUnits: 'nS', aggregation: 'mean' }).ok).toBe(false);
  });
});

describe('degree and delay distributions', () => {
  const options = {
    sourceIds: [1, 2, 3, 4], targetIds: [10, 11, 12], snapshotTimeMs: 5,
    snapshotScope: completeScope,
  };

  it('includes declared zero-degree nodes and counts every connection entry', () => {
    const input = { source: [1, 1, 2], target: [10, 10, 11] };
    const incoming = paramsOf(synapseCollectionToInDegreeDistributionParams(input, {
      ...options, normalization: 'probability',
    }));
    expect(incoming).toMatchObject({
      degrees: [0, 1, 2], node_counts: [1, 1, 1],
      values: [1 / 3, 1 / 3, 1 / 3], node_count: 3, connection_count: 3,
      direction: 'in', zero_degree_policy: 'include_declared_universe',
    });
    const outgoing = paramsOf(synapseCollectionToOutDegreeDistributionParams(input, {
      ...options, normalization: 'count',
    }));
    expect(outgoing).toMatchObject({
      degrees: [0, 1, 2], node_counts: [2, 1, 1], values: [2, 1, 1],
      node_count: 4, connection_count: 3, direction: 'out',
    });

    expect(synapseCollectionToOutDegreeDistributionParams(input, {
      ...options,
      normalization: 'count',
      snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 },
    }).ok).toBe(false);
  });

  it('rejects degree gaps and derived-value/count tampering', () => {
    const valid = paramsOf(synapseCollectionToInDegreeDistributionParams(
      { source: [1, 1], target: [10, 10] },
      { ...options, normalization: 'count' },
    ));
    expect(InDegreeDistributionParamsSchema.safeParse({
      ...valid, degrees: [0, 2],
    }).success).toBe(false);
    expect(InDegreeDistributionParamsSchema.safeParse({
      ...valid, values: [0, 0, 0],
    }).success).toBe(false);
    expect(InDegreeDistributionParamsSchema.safeParse({
      ...valid, connection_count: valid.connection_count + 1,
    }).success).toBe(false);
    expect(InDegreeDistributionParamsSchema.safeParse({
      degrees: [0, 1], node_counts: [1, 0], values: [1, -1e-12],
      node_count: 1, connection_count: 0, direction: 'in',
      normalization: 'probability', value_units: 'probability',
      edge_counting: 'each_synapse_collection_entry',
      zero_degree_policy: 'include_declared_universe', sample_policy: 'complete',
      snapshot_time_ms: 0, snapshot_scope: completeScope,
    }).success).toBe(false);
  });

  it('bins delays per connection over an exact half-open window', () => {
    const base = {
      sourceIds: [1], targetIds: [2], snapshotTimeMs: 5,
      snapshotScope: completeScope, delayUnits: 'ms' as const,
      binWidthMs: 1, windowStartMs: 1, windowStopMs: 3,
    };
    const result = paramsOf(synapseCollectionToDelayDistributionParams({
      source: [1, 1, 1, 1], target: [2, 2, 2, 2], delay: [1, 1.9, 2, 2.999],
    }, { ...base, normalization: 'probability_density' }));
    expect(result).toMatchObject({
      bin_centers_ms: [1.5, 2.5], delay_counts: [2, 2], values: [0.5, 0.5],
      connection_count: 4, normalization: 'probability_density', value_units: '1/ms',
      aggregation: 'each_connection', binning: 'left_closed_right_open',
    });
    expect(DelayDistributionParamsSchema.safeParse(result).success).toBe(true);

    expect(synapseCollectionToDelayDistributionParams(
      { source: [1], target: [2], delay: [3] },
      { ...base, normalization: 'count' },
    ).ok).toBe(false);
    expect(synapseCollectionToDelayDistributionParams(
      { source: [], target: [], delay: [] },
      { ...base, normalization: 'probability' },
    ).ok).toBe(false);
    expect(synapseCollectionToDelayDistributionParams(
      { source: [], target: [], delay: [] },
      { ...base, normalization: 'count' },
    ).ok).toBe(true);
    expect(synapseCollectionToDelayDistributionParams(
      { source: [1], target: [2], delay: [1] },
      { ...base, windowStopMs: 3.5, normalization: 'count' },
    ).ok).toBe(false);
  });

  it('repairs only bounded boundary roundoff, independent of origin and bin index', () => {
    const common = {
      sourceIds: [1], targetIds: [2], snapshotTimeMs: 0,
      snapshotScope: completeScope, delayUnits: 'ms' as const,
      normalization: 'count' as const,
    };
    const decimalBoundary = paramsOf(synapseCollectionToDelayDistributionParams(
      { source: [1], target: [2], delay: [0.3] },
      {
        ...common, binWidthMs: 0.1, windowStartMs: 0.2, windowStopMs: 0.4,
      },
    ));
    expect(decimalBoundary.delay_counts).toEqual([0, 1]);

    const largeOrigin = 1e9;
    const belowBoundary = paramsOf(synapseCollectionToDelayDistributionParams(
      { source: [1], target: [2], delay: [largeOrigin + 1 - 1e-6] },
      {
        ...common, binWidthMs: 1,
        windowStartMs: largeOrigin, windowStopMs: largeOrigin + 2,
      },
    ));
    expect(belowBoundary.delay_counts).toEqual([1, 0]);

    expect(DelayDistributionParamsSchema.safeParse({
      bin_centers_ms: [largeOrigin + 0.6, largeOrigin + 1.6],
      delay_counts: [1, 0],
      values: [1, 0],
      bin_width_ms: 1,
      window_start_ms: largeOrigin,
      window_stop_ms: largeOrigin + 2,
      normalization: 'count',
      value_units: 'count',
      delay_units: 'ms',
      aggregation: 'each_connection',
      binning: 'left_closed_right_open',
      sample_policy: 'complete',
      connection_count: 1,
      snapshot_time_ms: 0,
      snapshot_scope: completeScope,
    }).success).toBe(false);
    expect(DelayDistributionParamsSchema.safeParse({
      bin_centers_ms: [0.5, 1.5], delay_counts: [1, 0],
      values: [1, -1e-6], bin_width_ms: 1,
      window_start_ms: 0, window_stop_ms: 2,
      normalization: 'probability', value_units: 'probability', delay_units: 'ms',
      aggregation: 'each_connection', binning: 'left_closed_right_open',
      sample_policy: 'complete', connection_count: 1, snapshot_time_ms: 0,
      snapshot_scope: completeScope,
    }).success).toBe(false);
    expect(DelayDistributionParamsSchema.safeParse({
      bin_centers_ms: [0.5, 1.5, 2.5], delay_counts: [1, 0, 0],
      values: [1, 1e-6, 1e-6], bin_width_ms: 1,
      window_start_ms: 0, window_stop_ms: 3,
      normalization: 'probability', value_units: 'probability', delay_units: 'ms',
      aggregation: 'each_connection', binning: 'left_closed_right_open',
      sample_policy: 'complete', connection_count: 1, snapshot_time_ms: 0,
      snapshot_scope: completeScope,
    }).success).toBe(false);
    expect(DelayDistributionParamsSchema.safeParse({
      bin_centers_ms: [0.5, 1.5], delay_counts: [1, 1],
      values: [0.5000005, 0.4999995], bin_width_ms: 1,
      window_start_ms: 0, window_stop_ms: 2,
      normalization: 'probability', value_units: 'probability', delay_units: 'ms',
      aggregation: 'each_connection', binning: 'left_closed_right_open',
      sample_policy: 'complete', connection_count: 2, snapshot_time_ms: 0,
      snapshot_scope: completeScope,
    }).success).toBe(false);
    expect(synapseCollectionToDelayDistributionParams(
      { source: [1, 1], target: [2, 2], delay: [1, 2] },
      {
        ...common, binWidthMs: Number.MAX_VALUE, windowStartMs: 0,
        windowStopMs: Number.MAX_VALUE, normalization: 'probability_density',
      },
    ).ok).toBe(false);
    const unresolvedOrigin = 1e15;
    expect(DelayDistributionParamsSchema.safeParse({
      bin_centers_ms: [unresolvedOrigin + 0.75, unresolvedOrigin + 1.75],
      delay_counts: [1, 0],
      values: [1, 0],
      bin_width_ms: 1,
      window_start_ms: unresolvedOrigin,
      window_stop_ms: unresolvedOrigin + 2,
      normalization: 'count',
      value_units: 'count',
      delay_units: 'ms',
      aggregation: 'each_connection',
      binning: 'left_closed_right_open',
      sample_policy: 'complete',
      connection_count: 1,
      snapshot_time_ms: 0,
      snapshot_scope: completeScope,
    }).success).toBe(false);

    const highIndex = paramsOf(synapseCollectionToDelayDistributionParams(
      { source: [1], target: [2], delay: [49_998.99999] },
      {
        ...common, binWidthMs: 1, windowStartMs: 0, windowStopMs: 50_000,
      },
    ));
    expect(highIndex.delay_counts[49_998]).toBe(1);
    expect(highIndex.delay_counts[49_999]).toBe(0);
  });
});

describe('identified 2D spatial map transform', () => {
  const options = {
    nodeIds: [41, 99], coordinateUnits: 'µm', extent: [2, 2] as const,
    center: [0, 0] as const, edgeWrap: false, positionScope: completeScope,
  };

  it('binds positions to explicit ids, units, layer bounds, and position scope', () => {
    const params = paramsOf(getPositionToSpatialMap2DParams(
      [[-0.5, 0], [0.5, 0]], options,
    ));
    expect(params).toEqual({
      nodes: [
        { id: 41, label: '41', x: -0.5, y: 0 },
        { id: 99, label: '99', x: 0.5, y: 0 },
      ],
      coordinate_units: 'µm', extent: [2, 2], center: [0, 0], edge_wrap: false,
      position_scope: completeScope, marker_size: 'fixed_screen_space',
    });
    expect(SpatialMap2DParamsSchema.safeParse(params).success).toBe(true);
    expect(getPositionToSpatialMap2DParams({
      positions: [[-0.5, 0], [0.5, 0]], node_ids: [99, 41],
    }, options).ok).toBe(false);
  });

  it('rejects rank mismatch, duplicate ids, and tiny-scale out-of-bounds coordinates', () => {
    expect(getPositionToSpatialMap2DParams([[0, 0, 0]], {
      ...options, nodeIds: [1],
    }).ok).toBe(false);
    expect(getPositionToSpatialMap2DParams([[0, 0], [0, 0]], {
      ...options, nodeIds: [1, 1],
    }).ok).toBe(false);
    expect(getPositionToSpatialMap2DParams([[6e-13, 0]], {
      ...options,
      nodeIds: [1],
      extent: [1e-12, 1e-12],
      center: [0, 0],
    }).ok).toBe(false);
    expect(getPositionToSpatialMap2DParams([[1e9 + 0.1, 1e9]], {
      ...options,
      nodeIds: [1],
      extent: [1e-3, 1e-3],
      center: [1e9, 1e9],
    }).ok).toBe(false);
    expect(getPositionToSpatialMap2DParams([[1e9, 1e9]], {
      ...options,
      nodeIds: [1],
      extent: [1e-12, 1e-12],
      center: [1e9, 1e9],
    }).ok).toBe(false);
    expect(getPositionToSpatialMap2DParams([[1e15 + 0.75, 1e15]], {
      ...options,
      nodeIds: [1],
      extent: [1, 1],
      center: [1e15, 1e15],
    }).ok).toBe(false);
    expect(getPositionToSpatialMap2DParams([[0, 0]], {
      ...options,
      nodeIds: [1],
      positionScope: { kind: 'mpi_rank_local', rank: -0, world_size: 2 },
    }).ok).toBe(false);
  });
});

describe('legacy connection edge-list hardening', () => {
  it('retains endpoint semantics while pairing optional channels with units', () => {
    expect(NetworkParamsSchema.safeParse({ sources: [1], targets: [2] }).success).toBe(true);
    expect(NetworkParamsSchema.safeParse({
      sources: [1], targets: [2], weights: [0], weight_units: 'nS',
      delays: [1], delay_units: 'ms',
    }).success).toBe(true);
    expect(NetworkParamsSchema.safeParse({
      sources: [1], targets: [2], weights: [1],
    }).success).toBe(false);
    expect(NetworkParamsSchema.safeParse({
      sources: [1], targets: [2], delays: [0], delay_units: 'ms',
    }).success).toBe(false);
  });
});
