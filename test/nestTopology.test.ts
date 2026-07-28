import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  AdjacencyMatrixParamsSchema,
  ConnectionGraphParamsSchema,
  DelayDistributionParamsSchema,
  DelayMatrixParamsSchema,
  InDegreeDistributionParamsSchema,
  NetworkParamsSchema,
  OutDegreeDistributionParamsSchema,
  SpatialMap2DParamsSchema,
  WeightHistogramParamsSchema,
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
  synapseCollectionToWeightHistogramParams,
  synapseCollectionToWeightMatrixParams,
  type NestTopologyResult,
} from '../core/nest/topology';
import type {
  SynapseMeasurementFieldSemantics,
  SynapseModelMeasurementSemantics,
} from '../core/nest/modelSemantics';
import { validateSynapseModelMeasurementSemantics } from '../core/nest/modelSemantics';
import * as publicCore from '../core';
import {
  normalizeSynapseCollectionSnapshot as normalizeFromCore,
} from '../core';
import {
  normalizeSynapseCollectionSnapshot as normalizeFromNestIndex,
  synapseCollectionToWeightHistogramParams as weightHistogramFromNestIndex,
} from '../core/nest';

function paramsOf<T>(result: NestTopologyResult<T>): T {
  expect(result.ok, result.ok ? undefined : result.errors.join('\n')).toBe(true);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.params;
}

const completeScope = { kind: 'single_process_complete' } as const;
const staticEffectiveSemantics = [{
  synapseModel: 'static_synapse',
  weight: 'effective',
  delay: 'effective',
}] as const;

function semanticsFor(
  models: readonly string[],
  weight: SynapseMeasurementFieldSemantics = 'unknown',
  delay: SynapseMeasurementFieldSemantics = 'unknown',
): SynapseModelMeasurementSemantics[] {
  return [...new Set(models)].map((synapseModel) => ({
    synapseModel,
    weight,
    delay,
  }));
}

describe('NEST topology exports and raw SynapseCollection normalization', () => {
  it('exports topology entrypoints through the intended public boundaries', () => {
    expect(normalizeFromCore).toBe(normalizeSynapseCollectionSnapshot);
    expect(normalizeFromNestIndex).toBe(normalizeSynapseCollectionSnapshot);
    expect(weightHistogramFromNestIndex).toBe(
      synapseCollectionToWeightHistogramParams,
    );
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
      synapseModelSemantics: staticEffectiveSemantics,
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
      source: [], target: [], weight: [], delay: [], synapse_model: [],
    }, {
      sourceIds: [1], targetIds: [2], snapshotTimeMs: 0,
      snapshotScope: completeScope, samplePolicy: { kind: 'complete' },
      synapseModelSemantics: [],
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

  it('preserves the model-free endpoint API and rejects unused declarations', () => {
    const options = {
      sourceIds: [1],
      targetIds: [2],
      snapshotTimeMs: 0,
      snapshotScope: completeScope,
      samplePolicy: { kind: 'complete' as const },
    };
    const canonical = paramsOf(synapseCollectionToConnectionGraphParams(
      { source: [1], target: [2] },
      options,
    ));
    expect(canonical.edges[0].synapse_model).toBeUndefined();
    expect(synapseCollectionToConnectionGraphParams(
      { source: [1], target: [2], synapse_model: ['static_synapse'] },
      { ...options, synapseModelSemantics: staticEffectiveSemantics },
    ).ok).toBe(false);
    expect(synapseCollectionToConnectionGraphParams(
      { source: [1], target: [2] },
      { ...options, synapseModelSemantics: [] },
    ).ok).toBe(true);
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

describe('connection measurement model semantics', () => {
  const snapshot = {
    sourceIds: [1],
    targetIds: [2],
    snapshotTimeMs: 0,
    snapshotScope: completeScope,
  };

  it('requires one exact declaration per observed model and complete model rows', () => {
    const weightInput = {
      source: [1, 1],
      target: [2, 2],
      weight: [1, 2],
      synapse_model: ['static_synapse', 'custom_synapse'],
    };
    const weightOptions = {
      ...snapshot,
      weightUnits: 'nS',
      aggregation: 'sum' as const,
    };

    expect(synapseCollectionToWeightMatrixParams(
      { source: [1], target: [2], weight: [1] },
      { ...weightOptions, synapseModelSemantics: staticEffectiveSemantics },
    ).ok).toBe(false);
    expect(synapseCollectionToWeightMatrixParams(weightInput, weightOptions).ok).toBe(false);
    expect(synapseCollectionToWeightMatrixParams(weightInput, {
      ...weightOptions,
      synapseModelSemantics: staticEffectiveSemantics,
    }).ok).toBe(false);
    expect(synapseCollectionToWeightMatrixParams(weightInput, {
      ...weightOptions,
      synapseModelSemantics: [
        ...semanticsFor(['static_synapse', 'custom_synapse'], 'effective', 'unknown'),
        {
          synapseModel: 'unobserved_synapse',
          weight: 'effective',
          delay: 'unknown',
        },
      ],
    }).ok).toBe(false);
    expect(synapseCollectionToWeightMatrixParams(weightInput, {
      ...weightOptions,
      synapseModelSemantics: [
        {
          synapseModel: 'static_synapse',
          weight: 'effective',
          delay: 'unknown',
        },
        {
          synapseModel: 'static_synapse',
          weight: 'effective',
          delay: 'unknown',
        },
      ],
    }).ok).toBe(false);
    expect(synapseCollectionToWeightMatrixParams(weightInput, {
      ...weightOptions,
      synapseModelSemantics:
        semanticsFor(['static_synapse', 'custom_synapse'], 'unknown', 'unknown'),
    }).ok).toBe(false);

    let reads = 0;
    const accessorDeclaration: Record<string, unknown> = {
      synapseModel: 'static_synapse',
      delay: 'unknown',
    };
    Object.defineProperty(accessorDeclaration, 'weight', {
      enumerable: true,
      get() {
        reads += 1;
        return 'effective';
      },
    });
    expect(synapseCollectionToWeightMatrixParams({
      source: [1],
      target: [2],
      weight: [1],
      synapse_model: ['static_synapse'],
    }, {
      ...weightOptions,
      synapseModelSemantics: [accessorDeclaration],
    }).ok).toBe(false);
    expect(reads).toBe(0);
  });

  it('rejects official ignored fields, including mixed snapshots, without inferring copies', () => {
    for (const synapseModel of ['gap_junction', 'rate_connection_instantaneous']) {
      expect(synapseCollectionToDelayMatrixParams({
        source: [1],
        target: [2],
        delay: [1],
        synapse_model: [synapseModel],
      }, {
        ...snapshot,
        delayUnits: 'ms',
        aggregation: 'single_connection',
        synapseModelSemantics: semanticsFor([synapseModel], 'unknown', 'effective'),
      }).ok).toBe(false);
    }

    expect(synapseCollectionToWeightMatrixParams({
      source: [1],
      target: [2],
      weight: [1],
      synapse_model: ['diffusion_connection'],
    }, {
      ...snapshot,
      weightUnits: 'nS',
      aggregation: 'single_connection',
      synapseModelSemantics:
        semanticsFor(['diffusion_connection'], 'effective', 'ignored'),
    }).ok).toBe(false);
    expect(synapseCollectionToDelayDistributionParams({
      source: [1],
      target: [2],
      delay: [1],
      synapse_model: ['diffusion_connection'],
    }, {
      ...snapshot,
      delayUnits: 'ms',
      binWidthMs: 1,
      windowStartMs: 1,
      windowStopMs: 2,
      normalization: 'count',
      synapseModelSemantics:
        semanticsFor(['diffusion_connection'], 'ignored', 'effective'),
    }).ok).toBe(false);

    expect(synapseCollectionToConnectionGraphParams({
      source: [1, 1],
      target: [2, 2],
      delay: [1, 1],
      synapse_model: ['static_synapse', 'gap_junction'],
    }, {
      ...snapshot,
      delayUnits: 'ms',
      samplePolicy: { kind: 'complete' },
      synapseModelSemantics: [
        ...semanticsFor(['static_synapse'], 'unknown', 'effective'),
        ...semanticsFor(['gap_junction'], 'unknown', 'ignored'),
      ],
    }).ok).toBe(false);

    const copied = paramsOf(synapseCollectionToConnectionGraphParams({
      source: [1],
      target: [2],
      weight: [1],
      delay: [1],
      synapse_model: ['my_copied_connection'],
    }, {
      ...snapshot,
      weightUnits: 'nS',
      delayUnits: 'ms',
      samplePolicy: { kind: 'complete' },
      synapseModelSemantics:
        semanticsFor(['my_copied_connection'], 'effective', 'effective'),
    }));
    expect(copied.edges[0]).toMatchObject({
      weight: 1,
      delay_ms: 1,
      synapse_model: 'my_copied_connection',
    });
  });
});

describe('direct model-semantics authority boundary', () => {
  it('is package-internal, no-throw on hostile/null values, and rejects duplicates', () => {
    expect('validateSynapseModelMeasurementSemantics' in publicCore).toBe(false);
    expect(validateSynapseModelMeasurementSemantics(
      undefined,
      undefined,
      [],
    )).toEqual({ ok: true });
    expect(validateSynapseModelMeasurementSemantics(
      ['static_synapse'],
      null,
      ['weight'],
    ).ok).toBe(false);
    expect(validateSynapseModelMeasurementSemantics(
      ['static_synapse'],
      [...staticEffectiveSemantics, ...staticEffectiveSemantics],
      ['weight'],
    ).ok).toBe(false);
    expect(validateSynapseModelMeasurementSemantics(
      ['static_synapse'],
      staticEffectiveSemantics,
      null,
    ).ok).toBe(false);
    expect(validateSynapseModelMeasurementSemantics(
      ['static_synapse'],
      staticEffectiveSemantics,
      [],
    ).ok).toBe(false);

    let reads = 0;
    const accessorDeclaration: Record<string, unknown> = {
      synapseModel: 'static_synapse',
      delay: 'unknown',
    };
    Object.defineProperty(accessorDeclaration, 'weight', {
      enumerable: true,
      get() {
        reads += 1;
        return 'effective';
      },
    });
    expect(validateSynapseModelMeasurementSemantics(
      ['static_synapse'],
      [accessorDeclaration],
      ['weight'],
    ).ok).toBe(false);
    expect(reads).toBe(0);

    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(() => validateSynapseModelMeasurementSemantics(
      ['static_synapse'],
      revoked.proxy,
      ['weight'],
    )).not.toThrow();
    expect(validateSynapseModelMeasurementSemantics(
      ['static_synapse'],
      revoked.proxy,
      ['weight'],
    ).ok).toBe(false);
  });
});

describe('sparse connection matrices', () => {
  const snapshot = {
    sourceIds: [1, 2], targetIds: [3, 4], snapshotTimeMs: 10,
    snapshotScope: completeScope,
  };

  it('emits schema-valid empty sparse matrices for an all-absent snapshot', () => {
    const adjacency = paramsOf(synapseCollectionToAdjacencyMatrixParams({
      source: [],
      target: [],
    }, snapshot));
    const weight = paramsOf(synapseCollectionToWeightMatrixParams({
      source: [],
      target: [],
      weight: [],
      synapse_model: [],
    }, {
      ...snapshot, synapseModelSemantics: [], weightUnits: 'nS', aggregation: 'sum',
    }));
    const delay = paramsOf(synapseCollectionToDelayMatrixParams({
      source: [],
      target: [],
      delay: [],
      synapse_model: [],
    }, {
      ...snapshot, synapseModelSemantics: [], delayUnits: 'ms', aggregation: 'mean',
    }));

    for (const [schema, params] of [
      [AdjacencyMatrixParamsSchema, adjacency],
      [WeightMatrixParamsSchema, weight],
      [DelayMatrixParamsSchema, delay],
    ] as const) {
      expect(params.cells).toEqual([]);
      expect(params.connection_count).toBe(0);
      expect(schema.safeParse(params).success).toBe(true);
    }
  });

  it('rejects target-rank-local matrices and degrees without exact ownership authority', () => {
    const input = { source: [1], target: [3] };
    const localSnapshot = {
      sourceIds: [1],
      targetIds: [3, 4],
      snapshotTimeMs: 10,
      snapshotScope: { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 } as const,
    };
    const expected = (output: string) => ({
      ok: false,
      errors: [
        `${output} rejects snapshotScope.kind "mpi_target_rank_local": without an exact rank-owned targetIds universe and complete cross-rank edge authority, zero/absence claims are not recoverable`,
      ],
    });

    expect(synapseCollectionToAdjacencyMatrixParams(
      input,
      localSnapshot,
    )).toEqual(expected('adjacency matrix'));
    expect(synapseCollectionToWeightMatrixParams({
      ...input,
      weight: [1],
      synapse_model: ['static_synapse'],
    }, {
      ...localSnapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      weightUnits: 'nS',
      aggregation: 'sum',
    })).toEqual(expected('weight matrix'));
    expect(synapseCollectionToDelayMatrixParams({
      ...input,
      delay: [1],
      synapse_model: ['static_synapse'],
    }, {
      ...localSnapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      delayUnits: 'ms',
      aggregation: 'mean',
    })).toEqual(expected('delay matrix'));
    expect(synapseCollectionToInDegreeDistributionParams(input, {
      ...localSnapshot,
      normalization: 'count',
    })).toEqual(expected('in-degree distribution'));
    expect(synapseCollectionToOutDegreeDistributionParams(input, {
      ...localSnapshot,
      normalization: 'count',
    })).toEqual(expected('out-degree distribution'));

    const completeOptions = {
      ...localSnapshot,
      snapshotScope: completeScope,
    };
    const adjacency = paramsOf(
      synapseCollectionToAdjacencyMatrixParams(input, completeOptions),
    );
    const weight = paramsOf(synapseCollectionToWeightMatrixParams({
      ...input,
      weight: [1],
      synapse_model: ['static_synapse'],
    }, {
      ...completeOptions,
      synapseModelSemantics: staticEffectiveSemantics,
      weightUnits: 'nS',
      aggregation: 'sum',
    }));
    const delay = paramsOf(synapseCollectionToDelayMatrixParams({
      ...input,
      delay: [1],
      synapse_model: ['static_synapse'],
    }, {
      ...completeOptions,
      synapseModelSemantics: staticEffectiveSemantics,
      delayUnits: 'ms',
      aggregation: 'mean',
    }));
    expect(AdjacencyMatrixParamsSchema.safeParse({
      ...adjacency,
      snapshot_scope: localSnapshot.snapshotScope,
    }).success).toBe(false);
    expect(WeightMatrixParamsSchema.safeParse({
      ...weight,
      snapshot_scope: localSnapshot.snapshotScope,
    }).success).toBe(false);
    expect(DelayMatrixParamsSchema.safeParse({
      ...delay,
      snapshot_scope: localSnapshot.snapshotScope,
    }).success).toBe(false);

    const incoming = paramsOf(
      synapseCollectionToInDegreeDistributionParams(input, {
        ...completeOptions,
        normalization: 'count',
      }),
    );
    const outgoing = paramsOf(
      synapseCollectionToOutDegreeDistributionParams(input, {
        ...completeOptions,
        normalization: 'count',
      }),
    );
    expect(InDegreeDistributionParamsSchema.safeParse({
      ...incoming,
      snapshot_scope: localSnapshot.snapshotScope,
    }).success).toBe(false);
    expect(OutDegreeDistributionParamsSchema.safeParse({
      ...outgoing,
      snapshot_scope: localSnapshot.snapshotScope,
    }).success).toBe(false);
  });

  it('refuses globally unit-labelled multi-model measurement views', () => {
    const measured = {
      source: [1, 2],
      target: [3, 4],
      weight: [1, 2],
      delay: [1, 2],
      synapse_model: ['static_synapse', 'stdp_synapse'],
    };
    const semantics = semanticsFor(
      measured.synapse_model,
      'effective',
      'effective',
    );
    const expectedWeight = {
      ok: false,
      errors: [
        'weight matrix rejects weight measurements from multiple observed synapse models ("static_synapse", "stdp_synapse"): the current contract has no bound compatibility or unit-conversion authority for its global weight units claim',
      ],
    };
    const expectedDelayMatrix = {
      ok: false,
      errors: [
        'delay matrix rejects delay measurements from multiple observed synapse models ("static_synapse", "stdp_synapse"): the current contract has no bound compatibility or unit-conversion authority for its global delay units claim',
      ],
    };
    const expectedDelayDistribution = {
      ok: false,
      errors: [
        'delay distribution rejects delay measurements from multiple observed synapse models ("static_synapse", "stdp_synapse"): the current contract has no bound compatibility or unit-conversion authority for its global delay units claim',
      ],
    };
    const runWeight = (order: readonly number[]) =>
      synapseCollectionToWeightMatrixParams({
        source: order.map((index) => measured.source[index]),
        target: order.map((index) => measured.target[index]),
        weight: order.map((index) => measured.weight[index]),
        synapse_model: order.map((index) => measured.synapse_model[index]),
      }, {
        ...snapshot,
        synapseModelSemantics: semantics,
        weightUnits: 'nS',
        aggregation: 'sum',
      });
    const runDelayMatrix = (order: readonly number[]) =>
      synapseCollectionToDelayMatrixParams({
        source: order.map((index) => measured.source[index]),
        target: order.map((index) => measured.target[index]),
        delay: order.map((index) => measured.delay[index]),
        synapse_model: order.map((index) => measured.synapse_model[index]),
      }, {
        ...snapshot,
        synapseModelSemantics: semantics,
        delayUnits: 'ms',
        aggregation: 'mean',
      });
    const runDelayDistribution = (order: readonly number[]) =>
      synapseCollectionToDelayDistributionParams({
        source: order.map((index) => measured.source[index]),
        target: order.map((index) => measured.target[index]),
        delay: order.map((index) => measured.delay[index]),
        synapse_model: order.map((index) => measured.synapse_model[index]),
      }, {
        ...snapshot,
        synapseModelSemantics: semantics,
        delayUnits: 'ms',
        binWidthMs: 1,
        windowStartMs: 1,
        windowStopMs: 3,
        normalization: 'count',
      });

    for (const order of [[0, 1], [1, 0]] as const) {
      expect(runWeight(order)).toEqual(expectedWeight);
      expect(runDelayMatrix(order)).toEqual(expectedDelayMatrix);
      expect(runDelayDistribution(order)).toEqual(expectedDelayDistribution);
    }

    expect(synapseCollectionToAdjacencyMatrixParams(
      measured,
      snapshot,
    ).ok).toBe(true);
    expect(synapseCollectionToInDegreeDistributionParams(measured, {
      ...snapshot,
      normalization: 'count',
    }).ok).toBe(true);
    expect(synapseCollectionToOutDegreeDistributionParams(measured, {
      ...snapshot,
      normalization: 'count',
    }).ok).toBe(true);

    expect(synapseCollectionToWeightMatrixParams({
      source: [1, 2],
      target: [3, 4],
      weight: [1, 2],
      synapse_model: ['static_synapse', 'static_synapse'],
    }, {
      ...snapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      weightUnits: 'nS',
      aggregation: 'sum',
    }).ok).toBe(true);
    expect(synapseCollectionToDelayMatrixParams({
      source: [1, 2],
      target: [3, 4],
      delay: [1, 2],
      synapse_model: ['static_synapse', 'static_synapse'],
    }, {
      ...snapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      delayUnits: 'ms',
      aggregation: 'mean',
    }).ok).toBe(true);
    expect(synapseCollectionToDelayDistributionParams({
      source: [1, 2],
      target: [3, 4],
      delay: [1, 2],
      synapse_model: ['static_synapse', 'static_synapse'],
    }, {
      ...snapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      delayUnits: 'ms',
      binWidthMs: 1,
      windowStartMs: 1,
      windowStopMs: 3,
      normalization: 'count',
    }).ok).toBe(true);
  });

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
      synapse_model: ['static_synapse', 'static_synapse'],
    }, {
      ...snapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      weightUnits: 'nS',
      aggregation: 'sum',
    }));
    expect(weights.cells).toEqual([
      { source_id: 1, target_id: 3, connection_count: 2, value: 0 },
    ]);

    const delays = paramsOf(synapseCollectionToDelayMatrixParams({
      source: [1, 1], target: [3, 3], delay: [1, 3],
      synapse_model: ['static_synapse', 'static_synapse'],
    }, {
      ...snapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      delayUnits: 'ms',
      aggregation: 'mean',
    }));
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
      synapse_model: ['static_synapse', 'static_synapse'],
    }, {
      ...snapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      weightUnits: 'nS',
      aggregation: 'sum',
    }));
    expect(WeightMatrixParamsSchema.safeParse({
      ...weight, aggregation: 'single_connection',
    }).success).toBe(false);
    const delay = paramsOf(synapseCollectionToDelayMatrixParams({
      source: [1, 1], target: [3, 3], delay: [1, 2],
      synapse_model: ['static_synapse', 'static_synapse'],
    }, {
      ...snapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      delayUnits: 'ms',
      aggregation: 'mean',
    }));
    expect(DelayMatrixParamsSchema.safeParse({
      ...delay, aggregation: 'single_connection',
    }).success).toBe(false);
    expect(synapseCollectionToWeightMatrixParams({
      source: [1, 1], target: [3, 3], weight: [-5e-324, 0],
      synapse_model: ['static_synapse', 'static_synapse'],
    }, {
      ...snapshot,
      synapseModelSemantics: staticEffectiveSemantics,
      weightUnits: 'nS',
      aggregation: 'mean',
    }).ok).toBe(false);
  });

  it('uses exact, permutation-invariant binary64 weight aggregation', () => {
    const cancellation = [-(2 ** 54), 1, 2 ** 54];
    for (const values of [
      cancellation,
      [cancellation[0], cancellation[2], cancellation[1]],
      [cancellation[1], cancellation[0], cancellation[2]],
      [cancellation[1], cancellation[2], cancellation[0]],
      [cancellation[2], cancellation[0], cancellation[1]],
      [cancellation[2], cancellation[1], cancellation[0]],
    ]) {
      const result = paramsOf(synapseCollectionToWeightMatrixParams({
        source: new Array(values.length).fill(1),
        target: new Array(values.length).fill(3),
        weight: values,
        synapse_model: new Array(values.length).fill('static_synapse'),
      }, {
        ...snapshot,
        synapseModelSemantics: staticEffectiveSemantics,
        weightUnits: 'nS',
        aggregation: 'sum',
      }));
      expect(result.cells[0].value).toBe(1);
      expect(Object.is(result.cells[0].value, -0)).toBe(false);
    }

    fc.assert(fc.property(
      fc.array(fc.integer({ min: -1_000_000, max: 1_000_000 }), {
        minLength: 1,
        maxLength: 64,
      }),
      (values) => {
        const run = (ordered: number[]) => paramsOf(
          synapseCollectionToWeightMatrixParams({
            source: new Array(ordered.length).fill(1),
            target: new Array(ordered.length).fill(3),
            weight: ordered,
            synapse_model: new Array(ordered.length).fill('static_synapse'),
          }, {
            ...snapshot,
            synapseModelSemantics: staticEffectiveSemantics,
            weightUnits: 'nS',
            aggregation: 'sum',
          }),
        ).cells[0].value;
        const expected = values.reduce((sum, value) => sum + value, 0);
        expect(run(values)).toBe(expected);
        expect(run([...values].reverse())).toBe(expected);
      },
    ), { numRuns: 100 });
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
      synapseModelSemantics: staticEffectiveSemantics,
      binWidthMs: 1, windowStartMs: 1, windowStopMs: 3,
    };
    const result = paramsOf(synapseCollectionToDelayDistributionParams({
      source: [1, 1, 1, 1], target: [2, 2, 2, 2], delay: [1, 1.9, 2, 2.999],
      synapse_model: new Array(4).fill('static_synapse'),
    }, { ...base, normalization: 'probability_density' }));
    expect(result).toMatchObject({
      bin_centers_ms: [1.5, 2.5], delay_counts: [2, 2], values: [0.5, 0.5],
      connection_count: 4, normalization: 'probability_density', value_units: '1/ms',
      aggregation: 'each_connection', binning: 'left_closed_right_open',
    });
    expect(DelayDistributionParamsSchema.safeParse(result).success).toBe(true);

    expect(synapseCollectionToDelayDistributionParams(
      { source: [1], target: [2], delay: [3], synapse_model: ['static_synapse'] },
      { ...base, normalization: 'count' },
    ).ok).toBe(false);
    expect(synapseCollectionToDelayDistributionParams(
      { source: [], target: [], delay: [], synapse_model: [] },
      { ...base, synapseModelSemantics: [], normalization: 'probability' },
    ).ok).toBe(false);
    expect(synapseCollectionToDelayDistributionParams(
      { source: [], target: [], delay: [], synapse_model: [] },
      { ...base, synapseModelSemantics: [], normalization: 'count' },
    ).ok).toBe(true);
    expect(synapseCollectionToDelayDistributionParams(
      { source: [1], target: [2], delay: [1], synapse_model: ['static_synapse'] },
      { ...base, windowStopMs: 3.5, normalization: 'count' },
    ).ok).toBe(false);
  });

  it('repairs only bounded boundary roundoff, independent of origin and bin index', () => {
    const common = {
      sourceIds: [1], targetIds: [2], snapshotTimeMs: 0,
      snapshotScope: completeScope, delayUnits: 'ms' as const,
      synapseModelSemantics: staticEffectiveSemantics,
      normalization: 'count' as const,
    };
    const decimalBoundary = paramsOf(synapseCollectionToDelayDistributionParams(
      { source: [1], target: [2], delay: [0.3], synapse_model: ['static_synapse'] },
      {
        ...common, binWidthMs: 0.1, windowStartMs: 0.2, windowStopMs: 0.4,
      },
    ));
    expect(decimalBoundary.delay_counts).toEqual([0, 1]);

    const largeOrigin = 1e9;
    const belowBoundary = paramsOf(synapseCollectionToDelayDistributionParams(
      {
        source: [1], target: [2], delay: [largeOrigin + 1 - 1e-6],
        synapse_model: ['static_synapse'],
      },
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
      {
        source: [1, 1], target: [2, 2], delay: [1, 2],
        synapse_model: ['static_synapse', 'static_synapse'],
      },
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
    const representabilityOrigin = 2 ** 52;
    expect(DelayDistributionParamsSchema.safeParse({
      bin_centers_ms: [representabilityOrigin, representabilityOrigin + 1],
      delay_counts: [1, 1],
      values: [1, 1],
      bin_width_ms: 1,
      window_start_ms: representabilityOrigin - 0.5,
      window_stop_ms: representabilityOrigin + 2,
      normalization: 'count',
      value_units: 'count',
      delay_units: 'ms',
      aggregation: 'each_connection',
      binning: 'left_closed_right_open',
      sample_policy: 'complete',
      connection_count: 2,
      snapshot_time_ms: 0,
      snapshot_scope: completeScope,
    }).success).toBe(false);

    const highIndex = paramsOf(synapseCollectionToDelayDistributionParams(
      {
        source: [1], target: [2], delay: [49_998.99999],
        synapse_model: ['static_synapse'],
      },
      {
        ...common, binWidthMs: 1, windowStartMs: 0, windowStopMs: 50_000,
      },
    ));
    expect(highIndex.delay_counts[49_998]).toBe(1);
    expect(highIndex.delay_counts[49_999]).toBe(0);
  });
});

describe('raw SynapseCollection weight histogram transform', () => {
  const base = {
    sourceIds: [1],
    targetIds: [2],
    snapshotTimeMs: 5,
    snapshotScope: completeScope,
    synapseModelSemantics: staticEffectiveSemantics,
    weightUnits: 'nS',
    binWidth: 1,
    windowStart: -2,
    windowStop: 2,
  };

  it('bins signed weights at exact half-open boundaries and preserves every observation once', () => {
    const input = {
      source: new Array(6).fill(1),
      target: new Array(6).fill(2),
      weight: [-2, -1, -0.25, 0, 1, 1.999],
      synapse_model: new Array(6).fill('static_synapse'),
    };
    const count = paramsOf(synapseCollectionToWeightHistogramParams(input, {
      ...base,
      normalization: 'count',
    }));
    expect(count).toEqual({
      bin_centers: [-1.5, -0.5, 0.5, 1.5],
      weight_counts: [1, 2, 1, 2],
      values: [1, 2, 1, 2],
      bin_width: 1,
      window_start: -2,
      window_stop: 2,
      weight_units: 'nS',
      normalization: 'count',
      value_units: 'count',
      aggregation: 'each_connection',
      binning: 'left_closed_right_open',
      sample_policy: 'complete',
      connection_count: 6,
      snapshot_time_ms: 5,
      snapshot_scope: completeScope,
    });
    expect(count.weight_counts.reduce((sum, value) => sum + value, 0)).toBe(
      count.connection_count,
    );
    expect(WeightHistogramParamsSchema.safeParse(count).success).toBe(true);

    const probability = paramsOf(synapseCollectionToWeightHistogramParams(input, {
      ...base,
      normalization: 'probability',
    }));
    expect(probability.weight_counts).toEqual(count.weight_counts);
    expect(probability.values).toEqual([1 / 6, 2 / 6, 1 / 6, 2 / 6]);
    expect(probability.value_units).toBe('probability');

    for (const weight of [-2.000_001, 2]) {
      expect(synapseCollectionToWeightHistogramParams({
        source: [1],
        target: [2],
        weight: [weight],
        synapse_model: ['static_synapse'],
      }, {
        ...base,
        normalization: 'count',
      }).ok).toBe(false);
    }
    expect(paramsOf(synapseCollectionToWeightHistogramParams({
      source: [1, 1, 1, 1],
      target: [2, 2, 2, 2],
      weight: [-2, -1, 0, 1],
      synapse_model: new Array(4).fill('static_synapse'),
    }, {
      ...base,
      normalization: 'count',
    })).weight_counts).toEqual([1, 1, 1, 1]);
  });

  it('is permutation-invariant and preserves exact raw histogram mass', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: -20, max: 19 }), {
        minLength: 1,
        maxLength: 64,
      }),
      fc.nat({ max: 64 }),
      (weights, shift) => {
        const run = (ordered: readonly number[]) => paramsOf(
          synapseCollectionToWeightHistogramParams({
            source: new Array(ordered.length).fill(1),
            target: new Array(ordered.length).fill(2),
            weight: [...ordered],
            synapse_model: new Array(ordered.length).fill('static_synapse'),
          }, {
            ...base,
            windowStart: -20,
            windowStop: 20,
            normalization: 'count',
          }),
        );
        const cut = shift % weights.length;
        const rotated = [...weights.slice(cut), ...weights.slice(0, cut)];
        const expectedCounts = new Array<number>(40).fill(0);
        for (const weight of weights) expectedCounts[weight + 20] += 1;

        const canonical = run(weights);
        expect(canonical.weight_counts).toEqual(expectedCounts);
        expect(canonical.values).toEqual(expectedCounts);
        expect(canonical.connection_count).toBe(weights.length);
        expect(canonical.weight_counts.reduce((sum, value) => sum + value, 0))
          .toBe(weights.length);
        expect(run([...weights].reverse())).toEqual(canonical);
        expect(run(rotated)).toEqual(canonical);
      },
    ), { numRuns: 100 });
  });

  it('handles empty complete snapshots only for count normalization and bounds geometry', () => {
    const empty = {
      source: [],
      target: [],
      weight: [],
      synapse_model: [],
    };
    const count = paramsOf(synapseCollectionToWeightHistogramParams(empty, {
      ...base,
      synapseModelSemantics: [],
      normalization: 'count',
    }));
    expect(count).toMatchObject({
      weight_counts: [0, 0, 0, 0],
      values: [0, 0, 0, 0],
      connection_count: 0,
    });
    expect(synapseCollectionToWeightHistogramParams(empty, {
      ...base,
      synapseModelSemantics: [],
      normalization: 'probability',
    }).ok).toBe(false);
    expect(synapseCollectionToWeightHistogramParams({
      source: [1],
      target: [2],
      weight: [0],
      synapse_model: ['static_synapse'],
    }, {
      ...base,
      windowStart: 0,
      windowStop: 2.5,
      normalization: 'count',
    }).ok).toBe(false);
    expect(synapseCollectionToWeightHistogramParams({
      source: [1],
      target: [2],
      weight: [0],
      synapse_model: ['static_synapse'],
    }, {
      ...base,
      windowStart: 0,
      windowStop: 50_001,
      normalization: 'count',
    }).ok).toBe(false);
  });

  it('requires complete model and weight authority and rejects mixed models', () => {
    const measured = {
      source: [1, 1],
      target: [2, 2],
      weight: [-1, 1],
      synapse_model: ['static_synapse', 'stdp_synapse'],
    };
    expect(synapseCollectionToWeightHistogramParams(measured, {
      ...base,
      synapseModelSemantics: semanticsFor(
        measured.synapse_model,
        'effective',
        'unknown',
      ),
      normalization: 'count',
    })).toEqual({
      ok: false,
      errors: [
        'weight histogram rejects weight measurements from multiple observed synapse models ("static_synapse", "stdp_synapse"): the current contract has no bound compatibility or unit-conversion authority for its global weight units claim',
      ],
    });
    expect(synapseCollectionToWeightHistogramParams({
      source: [1, 1],
      target: [2, 2],
      weight: [-1, 1],
      synapse_model: ['static_synapse'],
    }, {
      ...base,
      normalization: 'count',
    }).ok).toBe(false);
    expect(synapseCollectionToWeightHistogramParams({
      source: [1],
      target: [2],
      weight: [1],
    }, {
      ...base,
      normalization: 'count',
    }).ok).toBe(false);
    expect(synapseCollectionToWeightHistogramParams({
      source: [1],
      target: [2],
      delay: [1],
      synapse_model: ['static_synapse'],
    }, {
      ...base,
      normalization: 'count',
    }).ok).toBe(false);
    expect(synapseCollectionToWeightHistogramParams({
      source: [1],
      target: [2],
      weight: [1],
      synapse_model: ['static_synapse'],
    }, {
      ...base,
      synapseModelSemantics: [],
      normalization: 'count',
    }).ok).toBe(false);
  });

  it('rejects missing, unused, or accessor-bearing option authority without invoking getters', () => {
    const input = {
      source: [1],
      target: [2],
      weight: [0],
      synapse_model: ['static_synapse'],
    };
    const { weightUnits: _weightUnits, ...withoutWeightUnits } = base;
    expect(synapseCollectionToWeightHistogramParams(input, {
      ...withoutWeightUnits,
      normalization: 'count',
    }).ok).toBe(false);
    const { synapseModelSemantics: _semantics, ...withoutSemantics } = base;
    expect(synapseCollectionToWeightHistogramParams(input, {
      ...withoutSemantics,
      normalization: 'count',
    }).ok).toBe(false);
    expect(synapseCollectionToWeightHistogramParams(input, {
      ...base,
      delayUnits: 'ms',
      normalization: 'count',
    }).ok).toBe(false);
    expect(synapseCollectionToWeightHistogramParams({
      source: [],
      target: [],
      weight: [],
      synapse_model: [],
    }, {
      ...base,
      synapseModelSemantics: staticEffectiveSemantics,
      normalization: 'count',
    }).ok).toBe(false);

    let inputReads = 0;
    const accessorInput: Record<string, unknown> = {
      source: [1],
      target: [2],
      synapse_model: ['static_synapse'],
    };
    Object.defineProperty(accessorInput, 'weight', {
      enumerable: true,
      get() {
        inputReads += 1;
        return [0];
      },
    });
    expect(synapseCollectionToWeightHistogramParams(accessorInput, {
      ...base,
      normalization: 'count',
    }).ok).toBe(false);
    expect(inputReads).toBe(0);

    let optionReads = 0;
    const accessorOptions: Record<string, unknown> = {
      ...base,
      normalization: 'count',
    };
    Object.defineProperty(accessorOptions, 'weightUnits', {
      enumerable: true,
      get() {
        optionReads += 1;
        return 'nS';
      },
    });
    expect(synapseCollectionToWeightHistogramParams(
      input,
      accessorOptions,
    ).ok).toBe(false);
    expect(optionReads).toBe(0);
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
