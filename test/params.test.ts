import { describe, it, expect } from 'vitest';
import {
  CorrelogramParamsSchema,
  IsiDistributionParamsSchema,
  KnowledgeGraph3DParamsSchema,
  PhasePlaneParamsSchema,
  PopulationRateParamsSchema,
  PsthParamsSchema,
  Spatial3DParamsSchema,
  WeightHistogramParamsSchema,
} from '../core/skills/params';
import { getExamplePayload } from '../core/skills/examples';

// These two schemas used to admit z.unknown() for their core data, so a
// structurally-broken payload passed the strict gate and rendered blank. The
// tightened schemas must reject those payloads at validation instead.
describe('tightened param schemas reject structurally-broken data', () => {
  it('Spatial3DParamsSchema requires {x,y,z} numbers per object', () => {
    expect(Spatial3DParamsSchema.safeParse({
      objects: [{ x: 0, y: 0, z: 0 }],
      coordinate_units: 'mm',
    }).success).toBe(true);
    expect(Spatial3DParamsSchema.safeParse({ objects: [42] }).success).toBe(false);
    expect(Spatial3DParamsSchema.safeParse({ objects: [{ x: 0 }] }).success).toBe(false);
    expect(Spatial3DParamsSchema.safeParse({ objects: [] }).success).toBe(false);
  });

  it('Spatial3DParamsSchema still passes through extra node keys', () => {
    const r = Spatial3DParamsSchema.safeParse({
      objects: [{ x: 0, y: 1, z: 2, id: 7, label: 'E' }],
      coordinate_units: 'mm',
    });
    expect(r.success).toBe(true);
  });

  it('PhasePlaneParamsSchema requires two axes and a complete derivative field', () => {
    expect(
      PhasePlaneParamsSchema.safeParse({
        grid: { v: [-70, -50], w: [0, 1] },
        derivatives: { v: [1, 1, -1, -1], w: [-1, 1, -1, 1] },
        axis_units: { v: 'mV', w: '1' },
        derivative_units: { v: 'mV/ms', w: '1/ms' },
        axis_order: ['v', 'w'],
        flattening: 'row-major-last-axis-fastest',
      }).success,
    ).toBe(true);
    expect(PhasePlaneParamsSchema.safeParse({ grid: {} }).success).toBe(false);
    expect(PhasePlaneParamsSchema.safeParse({ grid: { v: 'notanarray' } }).success).toBe(false);
  });
});

describe('population-rate bins preserve raw counts and their sender denominator', () => {
  const valid = {
    bin_centers_ms: [2.5, 7.5, 12.5],
    bin_width_ms: 5,
    window_start_ms: 0,
    window_stop_ms: 15,
    series: [{
      id: 'E',
      label: 'Excitatory population',
      recorded_sender_count: 2,
      spike_counts: [1, 4, 2],
      rates_hz: [100, 400, 200],
    }],
    normalization: 'mean_per_recorded_sender_hz' as const,
    aggregation: 'selected_senders' as const,
    binning: 'left_closed_right_open' as const,
  };

  it('accepts exact uniform [start,stop) coverage and derived rates', () => {
    expect(PopulationRateParamsSchema.safeParse(valid).success).toBe(true);
    const withinTolerance = structuredClone(valid);
    withinTolerance.series[0].rates_hz[0] += 5e-8;
    expect(PopulationRateParamsSchema.safeParse(withinTolerance).success).toBe(true);
    withinTolerance.series[0].rates_hz[0] += 2e-7;
    expect(PopulationRateParamsSchema.safeParse(withinTolerance).success).toBe(false);
  });

  it.each([
    { window_stop_ms: 0 },
    { window_start_ms: 1 },
    { window_stop_ms: 14 },
    { bin_centers_ms: [2.5, 8, 12.5] },
    { bin_width_ms: 4 },
    { normalization: 'aggregate_rate_hz' },
    { aggregation: 'all_model_nodes' },
    { binning: 'closed' },
  ])('rejects contradictory window/bin semantics %#', (mutation) => {
    expect(PopulationRateParamsSchema.safeParse({ ...valid, ...mutation }).success).toBe(false);
  });

  it('rejects duplicate ids, length mismatches, invalid counts/denominators, and false rates', () => {
    const mutations: Array<(params: Record<string, unknown>) => void> = [
      (params) => {
        const series = params.series as Array<Record<string, unknown>>;
        series.push(structuredClone(series[0]));
      },
      (params) => {
        (params.series as Array<Record<string, unknown>>)[0].spike_counts = [1];
      },
      (params) => {
        (params.series as Array<Record<string, unknown>>)[0].rates_hz = [100];
      },
      (params) => {
        (params.series as Array<Record<string, unknown>>)[0].spike_counts = [0.5, 4, 2];
      },
      (params) => {
        (params.series as Array<Record<string, unknown>>)[0].recorded_sender_count = 0;
      },
      (params) => {
        (params.series as Array<Record<string, unknown>>)[0].rates_hz = [101, 400, 200];
      },
    ];
    for (const mutate of mutations) {
      const params = structuredClone(valid) as unknown as Record<string, unknown>;
      mutate(params);
      expect(PopulationRateParamsSchema.safeParse(params).success).toBe(false);
    }
  });
});

describe('correlogram statistic, lag axis, and counting semantics are explicit', () => {
  const base = {
    lags_ms: [-1, 0, 1],
    values: [0, 2, 4],
    bin_width_ms: 1,
    tau_max_ms: 1,
    counting_start_ms: 0,
    counting_stop_ms: 100,
    pair: { reference_label: 'E', target_label: 'I' },
    lag_convention: 'positive_target_after_reference' as const,
    binning: 'left_closed_right_open' as const,
    zero_lag_policy: 'included' as const,
  };

  it.each([
    [{ kind: 'raw_pair_count', units: 'count' }, [0, 2, 4]],
    [{ kind: 'weighted_pair_sum', units: 'pA' }, [-2, 0, 4]],
    [{ kind: 'pair_rate_hz', units: 'Hz', exposure_s: 0.1 }, [0, 1.5, 10]],
    [{ kind: 'pearson_coefficient', units: '1', sample_count: 100 }, [-1, 0, 1]],
  ] as const)('accepts the %s statistic', (statistic, values) => {
    expect(CorrelogramParamsSchema.safeParse({ ...base, statistic, values }).success).toBe(true);
  });

  it('rejects nonuniform, nonsymmetric, even, or incorrectly bounded lag axes', () => {
    for (const lags_ms of [
      [-1, -0.25, 1],
      [-1, 0, 0.5],
      [-1, 1],
      [-2, 0, 2],
    ]) {
      expect(CorrelogramParamsSchema.safeParse({
        ...base,
        lags_ms,
        values: lags_ms.map(() => 1),
        statistic: { kind: 'raw_pair_count', units: 'count' },
      }).success).toBe(false);
    }
  });

  it('rejects invalid intervals, statistic metadata, and statistic-specific domains', () => {
    const invalid = [
      { counting_stop_ms: 0, statistic: { kind: 'raw_pair_count', units: 'count' } },
      { statistic: { kind: 'raw_pair_count', units: 'Hz' } },
      { values: [0.5, 2, 4], statistic: { kind: 'raw_pair_count', units: 'count' } },
      { values: [-1, 2, 4], statistic: { kind: 'pair_rate_hz', units: 'Hz', exposure_s: 1 } },
      { values: [-1.1, 0, 1], statistic: { kind: 'pearson_coefficient', units: '1', sample_count: 10 } },
      { statistic: { kind: 'weighted_pair_sum', units: '   ' } },
    ];
    for (const mutation of invalid) {
      expect(CorrelogramParamsSchema.safeParse({ ...base, ...mutation }).success).toBe(false);
    }
  });
});

describe('NEST histogram schemas preserve bin, unit, and normalization semantics', () => {
  it('validates ISI scope and rejects negative/unsorted bins or fractional counts', () => {
    const valid = {
      bin_centers_ms: [0.5, 1.5],
      values: [2, 1],
      bin_width_ms: 1,
      normalization: 'count' as const,
      value_units: 'count' as const,
      interval_scope: 'per_sender' as const,
    };
    expect(IsiDistributionParamsSchema.safeParse(valid).success).toBe(true);
    expect(IsiDistributionParamsSchema.safeParse({
      ...valid,
      bin_centers_ms: [-0.5, 0.5],
    }).success).toBe(false);
    expect(IsiDistributionParamsSchema.safeParse({
      ...valid,
      bin_centers_ms: [1.5, 0.5],
    }).success).toBe(false);
    expect(IsiDistributionParamsSchema.safeParse({
      ...valid,
      values: [0.5, 1],
    }).success).toBe(false);
    expect(IsiDistributionParamsSchema.safeParse({
      ...valid,
      normalization: 'probability',
      value_units: 'count',
      values: [0.5, 0.5],
    }).success).toBe(false);
    expect(IsiDistributionParamsSchema.safeParse({
      ...valid,
      bin_centers_ms: [0.5, 0.5],
    }).success).toBe(false);
    expect(IsiDistributionParamsSchema.safeParse({
      ...valid,
      bin_centers_ms: [0.5, 2],
    }).success).toBe(false);
    expect(IsiDistributionParamsSchema.safeParse({
      ...valid,
      bin_width_ms: 0.5,
    }).success).toBe(false);
    expect(IsiDistributionParamsSchema.safeParse({
      ...valid,
      bin_centers_ms: [0.25, 1.25],
    }).success).toBe(false);
    expect(IsiDistributionParamsSchema.safeParse({
      ...valid,
      bin_centers_ms: [5e-13, 1.0005e-9],
      bin_width_ms: 1e-12,
    }).success).toBe(false);

    const probability = {
      ...valid,
      normalization: 'probability' as const,
      value_units: 'probability' as const,
      values: [0.5, 0.5],
    };
    expect(IsiDistributionParamsSchema.safeParse(probability).success).toBe(true);
    expect(IsiDistributionParamsSchema.safeParse({
      ...probability,
      values: [1.1, 0],
    }).success).toBe(false);
    expect(IsiDistributionParamsSchema.safeParse({
      ...probability,
      values: [0.4, 0.4],
    }).success).toBe(false);

    const density = {
      ...valid,
      normalization: 'probability_density' as const,
      value_units: '1/ms' as const,
      values: [0.5, 0.5],
    };
    expect(IsiDistributionParamsSchema.safeParse(density).success).toBe(true);
    expect(IsiDistributionParamsSchema.safeParse({
      ...density,
      values: [0.4, 0.4],
    }).success).toBe(false);
  });

  it('validates PSTH trial/alignment metadata and count-mode integer values', () => {
    const valid = {
      bin_centers_ms: [-5, 0, 5],
      values: [1.5, 2, 0.5],
      bin_width_ms: 5,
      normalization: 'count_per_trial' as const,
      value_units: 'count/trial' as const,
      trial_count: 10,
      alignment_event: 'stimulus onset',
      aggregation: 'selected_senders_per_trial' as const,
    };
    expect(PsthParamsSchema.safeParse(valid).success).toBe(true);
    expect(PsthParamsSchema.safeParse({ ...valid, trial_count: 0 }).success).toBe(false);
    expect(PsthParamsSchema.safeParse({ ...valid, bin_width_ms: 0 }).success).toBe(false);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      normalization: 'count',
      value_units: 'count',
    }).success).toBe(false);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      normalization: 'rate_hz',
      value_units: 'count/trial',
    }).success).toBe(false);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      bin_centers_ms: [-5, -5, 0],
    }).success).toBe(false);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      bin_centers_ms: [-5, 0, 10],
    }).success).toBe(false);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      bin_width_ms: 2,
    }).success).toBe(false);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      bin_centers_ms: [0, 1e-9],
      values: [1, 1],
      bin_width_ms: 1e-12,
    }).success).toBe(false);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      aggregation: 'mean_per_sender',
    }).success).toBe(false);

    expect(PsthParamsSchema.safeParse({
      ...valid,
      values: [1 / 3, 2 / 3, 1],
      trial_count: 3,
    }).success).toBe(true);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      values: [0.1, 2 / 3, 1],
      trial_count: 3,
    }).success).toBe(false);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      values: [1 + 5e-7, 2, 3],
      trial_count: 1,
    }).success).toBe(true);
    expect(PsthParamsSchema.safeParse({
      ...valid,
      values: [1 + 2e-6, 2, 3],
      trial_count: 1,
    }).success).toBe(false);

    const rate = {
      ...valid,
      values: [20, 40, 60],
      bin_width_ms: 5,
      trial_count: 10,
      normalization: 'rate_hz' as const,
      value_units: 'Hz' as const,
    };
    expect(PsthParamsSchema.safeParse(rate).success).toBe(true);
    expect(PsthParamsSchema.safeParse({
      ...rate,
      values: [1, 40, 60],
    }).success).toBe(false);
  });

  it('validates GetConnections snapshot weight histograms without event sampling', () => {
    const valid = {
      bin_centers: [-1, 0, 1],
      values: [2, 0, 3],
      bin_width: 1,
      weight_units: 'pA',
      normalization: 'count' as const,
      value_units: 'count' as const,
      snapshot_time_ms: 100,
    };
    expect(WeightHistogramParamsSchema.safeParse(valid).success).toBe(true);
    expect(WeightHistogramParamsSchema.safeParse({
      ...valid,
      values: [0.5, 0, 3],
    }).success).toBe(false);
    expect(WeightHistogramParamsSchema.safeParse({
      ...valid,
      normalization: 'probability',
      value_units: 'count',
      values: [0.25, 0.5, 0.25],
    }).success).toBe(false);
    expect(WeightHistogramParamsSchema.safeParse({
      ...valid,
      snapshot_time_ms: -1,
    }).success).toBe(false);
    expect(WeightHistogramParamsSchema.safeParse({
      ...valid,
      bin_width: Number.MAX_VALUE,
    }).success).toBe(false);
    expect(WeightHistogramParamsSchema.safeParse({
      ...valid,
      bin_centers: [-1, -1, 0],
    }).success).toBe(false);
    expect(WeightHistogramParamsSchema.safeParse({
      ...valid,
      bin_centers: [-1, 0, 2],
    }).success).toBe(false);
    expect(WeightHistogramParamsSchema.safeParse({
      ...valid,
      bin_width: 0.5,
    }).success).toBe(false);
    expect(WeightHistogramParamsSchema.safeParse({
      ...valid,
      bin_centers: [0, 1e-9],
      values: [1, 1],
      bin_width: 1e-12,
    }).success).toBe(false);

    const probability = {
      ...valid,
      normalization: 'probability' as const,
      value_units: 'probability' as const,
      values: [0.25, 0.5, 0.25],
    };
    expect(WeightHistogramParamsSchema.safeParse(probability).success).toBe(true);
    expect(WeightHistogramParamsSchema.safeParse({
      ...probability,
      values: [1.1, 0, 0],
    }).success).toBe(false);
    expect(WeightHistogramParamsSchema.safeParse({
      ...probability,
      values: [0.2, 0.2, 0.2],
    }).success).toBe(false);
  });
});

describe('corpus knowledge graph evidence-grade multigraph contract', () => {
  const exampleParams = () => structuredClone(
    getExamplePayload('corpus.knowledge_graph')!.params,
  ) as Record<string, unknown>;

  it('accepts the complete snapshot-bound example and rejects legacy topology-only records', () => {
    expect(KnowledgeGraph3DParamsSchema.safeParse(exampleParams()).success).toBe(true);
    expect(KnowledgeGraph3DParamsSchema.safeParse({
      nodes: [{ id: 'p1', kind: 'paper', label: 'Paper' }],
      edges: [],
    }).success).toBe(false);
  });

  it('preserves identified parallel assertions but rejects duplicate ids and excessive lanes', () => {
    const two = exampleParams();
    const edge = structuredClone(
      (two.edges as Array<Record<string, unknown>>)[1],
    );
    (two.edges as Array<Record<string, unknown>>).push({
      ...edge,
      id: 'edge:m2-variant-m1:independent-assertion',
      evidence: [{
        kind: 'graph_snapshot_record',
        evidence_id: 'independent-assertion-evidence',
        record_id: 'edge:m2-variant-m1:independent-assertion',
      }],
    });
    expect(KnowledgeGraph3DParamsSchema.safeParse(two).success).toBe(true);

    const duplicateId = structuredClone(two);
    (duplicateId.edges as Array<Record<string, unknown>>)[2].id =
      (duplicateId.edges as Array<Record<string, unknown>>)[1].id;
    expect(KnowledgeGraph3DParamsSchema.safeParse(duplicateId).success).toBe(false);

    for (const count of [9, 10]) {
      const params = exampleParams();
      const template = structuredClone(
        (params.edges as Array<Record<string, unknown>>)[1],
      );
      params.edges = Array.from({ length: count }, (_, index) => ({
        ...structuredClone(template),
        id: `parallel-${index}`,
        evidence: [{
          kind: 'graph_snapshot_record',
          evidence_id: `parallel-evidence-${index}`,
          record_id: `parallel-${index}`,
        }],
      }));
      expect(KnowledgeGraph3DParamsSchema.safeParse(params).success).toBe(count === 9);
    }
  });

  it('requires unique, resolving evidence references on every element', () => {
    const missing = exampleParams();
    (missing.edges as Array<Record<string, unknown>>)[0].evidence = [];
    expect(KnowledgeGraph3DParamsSchema.safeParse(missing).success).toBe(false);

    const duplicate = exampleParams();
    const node = (duplicate.nodes as Array<Record<string, unknown>>)[0];
    const evidence = node.evidence as Array<Record<string, unknown>>;
    evidence.push(structuredClone(evidence[0]));
    expect(KnowledgeGraph3DParamsSchema.safeParse(duplicate).success).toBe(false);

    const dangling = exampleParams();
    (dangling.edges as Array<Record<string, unknown>>)[0].evidence = [{
      kind: 'graph_node',
      evidence_id: 'missing-source-node',
      node_id: 'does-not-exist',
    }];
    expect(KnowledgeGraph3DParamsSchema.safeParse(dangling).success).toBe(false);

    const internalOnly = exampleParams();
    const internalNode = (internalOnly.nodes as Array<Record<string, unknown>>)[0];
    internalNode.evidence = [{
      kind: 'graph_node',
      evidence_id: 'self-reference-only',
      node_id: internalNode.id,
    }];
    const internalResult = KnowledgeGraph3DParamsSchema.safeParse(internalOnly);
    expect(internalResult.success).toBe(false);
    if (!internalResult.success) {
      expect(internalResult.error.issues).toContainEqual(expect.objectContaining({
        path: ['nodes', 0, 'evidence'],
      }));
    }

    const internalEdgeOnly = exampleParams();
    const internalEdge = (internalEdgeOnly.edges as Array<Record<string, unknown>>)[0];
    internalEdge.evidence = [{
      kind: 'graph_node',
      evidence_id: 'endpoint-reference-only',
      node_id: internalEdge.source,
    }];
    const internalEdgeResult = KnowledgeGraph3DParamsSchema.safeParse(internalEdgeOnly);
    expect(internalEdgeResult.success).toBe(false);
    if (!internalEdgeResult.success) {
      expect(internalEdgeResult.error.issues).toContainEqual(expect.objectContaining({
        path: ['edges', 0, 'evidence'],
      }));
    }

    const supplemental = exampleParams();
    const supplementalNode = (supplemental.nodes as Array<Record<string, unknown>>)[0];
    (supplementalNode.evidence as Array<Record<string, unknown>>).push({
      kind: 'graph_node',
      evidence_id: 'supplemental-graph-link',
      node_id: supplementalNode.id,
    });
    expect(KnowledgeGraph3DParamsSchema.safeParse(supplemental).success).toBe(true);
  });

  it('keeps epistemic status derived/advisory and scores uncalibrated + meaningful', () => {
    const promoted = exampleParams();
    (promoted.edges as Array<Record<string, unknown>>)[1].epistemic = {
      status: 'paper_local',
      advisory_only: false,
      is_paper_local_evidence: true,
      calibrated_posterior: false,
    };
    expect(KnowledgeGraph3DParamsSchema.safeParse(promoted).success).toBe(false);

    const calibrated = exampleParams();
    const score = (calibrated.edges as Array<Record<string, unknown>>)[1]
      .uncalibrated_score as Record<string, unknown>;
    score.calibrated_posterior = true;
    expect(KnowledgeGraph3DParamsSchema.safeParse(calibrated).success).toBe(false);

    const wrongMeaning = exampleParams();
    ((wrongMeaning.edges as Array<Record<string, unknown>>)[1]
      .uncalibrated_score as Record<string, unknown>).kind =
      'citation_resolution_confidence';
    expect(KnowledgeGraph3DParamsSchema.safeParse(wrongMeaning).success).toBe(false);

    const naked = exampleParams();
    (naked.edges as Array<Record<string, unknown>>)[0].confidence = 0.9;
    expect(KnowledgeGraph3DParamsSchema.safeParse(naked).success).toBe(false);

    const extracted = exampleParams();
    (extracted.nodes as Array<Record<string, unknown>>)[0].uncalibrated_score = {
      kind: 'extraction_confidence',
      value: 0.8,
      calibrated_posterior: false,
    };
    expect(KnowledgeGraph3DParamsSchema.safeParse(extracted).success).toBe(true);

    const contextless = exampleParams();
    (contextless.nodes as Array<Record<string, unknown>>)[0].uncalibrated_score = {
      kind: 'retrieval_relevance',
      value: 0.8,
      calibrated_posterior: false,
    };
    const contextlessResult = KnowledgeGraph3DParamsSchema.safeParse(contextless);
    expect(contextlessResult.success).toBe(false);
    if (!contextlessResult.success) {
      expect(contextlessResult.error.issues).toContainEqual(expect.objectContaining({
        path: ['nodes', 0, 'uncalibrated_score', 'kind'],
      }));
    }
  });

  it('requires generated_at to be a calendar-valid RFC3339 timestamp with seconds', () => {
    for (const timestamp of [
      '2026-07-11T12:00Z',
      '2026-07-11T12:00:00',
      '2026-02-29T12:00:00Z',
      '2026-07-11 12:00:00Z',
    ]) {
      const params = exampleParams();
      params.generated_at = timestamp;
      expect(KnowledgeGraph3DParamsSchema.safeParse(params).success, timestamp).toBe(false);
    }
    for (const timestamp of [
      '2026-07-11T12:00:00Z',
      '2026-07-11T12:00:00.123+02:00',
    ]) {
      const params = exampleParams();
      params.generated_at = timestamp;
      expect(KnowledgeGraph3DParamsSchema.safeParse(params).success, timestamp).toBe(true);
    }
  });

  it('bounds flat JSON attributes without admitting arbitrary nested payloads', () => {
    const tooMany = exampleParams();
    (tooMany.nodes as Array<Record<string, unknown>>)[0].attributes = Object.fromEntries(
      Array.from({ length: 25 }, (_, index) => [`key_${index}`, index]),
    );
    expect(KnowledgeGraph3DParamsSchema.safeParse(tooMany).success).toBe(false);

    const longArray = exampleParams();
    ((longArray.nodes as Array<Record<string, unknown>>)[0]
      .attributes as Record<string, unknown>).authors = Array.from(
      { length: 17 },
      (_, index) => `Author ${index}`,
    );
    expect(KnowledgeGraph3DParamsSchema.safeParse(longArray).success).toBe(false);

    const nested = exampleParams();
    ((nested.nodes as Array<Record<string, unknown>>)[0]
      .attributes as Record<string, unknown>).unsafe = { nested: true };
    expect(KnowledgeGraph3DParamsSchema.safeParse(nested).success).toBe(false);
  });
});

describe('render-facing labels reject visual-order controls', () => {
  it('rejects bidi overrides in knowledge-graph ids and labels', () => {
    for (const [field, value] of [
      ['id', 'paper\u202e1'],
      ['label', 'Paper\u061c 1'],
    ] as const) {
      const params = structuredClone(
        getExamplePayload('corpus.knowledge_graph')!.params,
      ) as Record<string, unknown>;
      (params.nodes as Array<Record<string, unknown>>)[0][field] = value;
      expect(KnowledgeGraph3DParamsSchema.safeParse(params).success).toBe(false);
    }
  });
});
