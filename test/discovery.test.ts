import { describe, it, expect } from 'vitest';
import {
  describeSkill,
  describeSkills,
  listSkills,
  SKILL_EXAMPLE_PAYLOADS,
  validateSkillInvocation,
  validateSpec,
  detectEmptyScene,
  spikeRecorderToSceneData,
  splitMultimeterBySender,
  PROVENANCE_KEYS,
  PROVENANCE_KEY_LABELS,
} from '../core/skills';
import type { NestSkillId } from '../core/skills';

// Pinned machine contract: the exact provenance keys each skill demands. Any
// add/drop/rename of a contract key must update this and fails loudly otherwise.
const EXPECTED_PROVENANCE: Record<NestSkillId, string[]> = {
  'nest.voltage_trace': ['device_id', 'recorded_variable', 'units', 'sampling_interval'],
  'nest.spike_raster': ['recorder_id', 'sender_ids', 'population_labels', 'time_units'],
  'nest.isi_distribution': [
    'recorder_id',
    'sender_ids',
    'population_labels',
    'time_units',
    'bin_ms',
    'histogram_normalization',
    'interval_scope',
  ],
  'nest.psth': [
    'recorder_id',
    'sender_ids',
    'population_labels',
    'time_units',
    'bin_ms',
    'histogram_normalization',
    'event_alignment',
    'psth_aggregation',
  ],
  'nest.population_rate': [
    'recorder_id',
    'sender_ids',
    'population_labels',
    'time_units',
    'bin_ms',
    'rate_normalization',
    'binning_policy',
  ],
  'nest.rate_response': ['stim_units', 'bin_ms', 'rate_normalization'],
  'nest.connectivity_matrix': [
    'source_ids', 'target_ids', 'synapse_model', 'connection_sample_policy',
  ],
  'nest.connection_graph': [
    'source_ids', 'target_ids', 'synapse_model', 'connection_sample_policy',
    'snapshot_time_ms', 'snapshot_scope', 'parallel_edge_policy',
  ],
  'nest.adjacency_matrix': [
    'source_ids', 'target_ids', 'synapse_model', 'connection_sample_policy',
    'snapshot_time_ms', 'snapshot_scope', 'parallel_edge_policy',
    'matrix_axis_order', 'matrix_aggregation',
  ],
  'nest.weight_matrix': [
    'source_ids', 'target_ids', 'synapse_model', 'weight_units',
    'connection_sample_policy', 'snapshot_time_ms', 'snapshot_scope',
    'parallel_edge_policy', 'matrix_axis_order', 'matrix_aggregation',
  ],
  'nest.delay_matrix': [
    'source_ids', 'target_ids', 'synapse_model', 'delay_units',
    'connection_sample_policy', 'snapshot_time_ms', 'snapshot_scope',
    'parallel_edge_policy', 'matrix_axis_order', 'matrix_aggregation',
  ],
  'nest.in_degree_distribution': [
    'source_ids', 'target_ids', 'synapse_model', 'connection_sample_policy',
    'snapshot_time_ms', 'snapshot_scope', 'parallel_edge_policy',
    'degree_direction', 'degree_counting', 'zero_degree_policy',
    'histogram_normalization',
  ],
  'nest.out_degree_distribution': [
    'source_ids', 'target_ids', 'synapse_model', 'connection_sample_policy',
    'snapshot_time_ms', 'snapshot_scope', 'parallel_edge_policy',
    'degree_direction', 'degree_counting', 'zero_degree_policy',
    'histogram_normalization',
  ],
  'nest.delay_distribution': [
    'source_ids', 'target_ids', 'synapse_model', 'delay_units',
    'connection_sample_policy', 'snapshot_time_ms', 'snapshot_scope',
    'parallel_edge_policy', 'bin_ms', 'histogram_normalization', 'binning_policy',
  ],
  'nest.weight_histogram': [
    'source_ids',
    'target_ids',
    'synapse_model',
    'weight_units',
    'histogram_normalization',
    'connection_sample_policy',
  ],
  'nest.spatial_2d': ['extent', 'spatial_units', 'mask', 'kernel'],
  'nest.spatial_map_2d': ['node_ids', 'spatial_units', 'extent', 'position_scope'],
  'nest.spatial_3d': ['extent', 'spatial_units', 'projection_sample_policy'],
  'nest.plasticity_dynamics': ['synapse_model', 'weight_units'],
  'nest.phase_plane': [
    'state_variables',
    'derivation_method',
    'model_context',
    'fixed_parameters',
  ],
  'nest.correlogram': [
    'detector_id',
    'reference_population',
    'target_population',
    'bin_ms',
    'correlation_normalization',
    'correlation_units',
    'lag_convention',
    'binning_policy',
  ],
  'nest.stimulus_response': ['stim_units', 'units', 'time_units'],
  'nest.astrocyte_dynamics': [
    'recorded_variable',
    'units',
    'time_units',
    'sampling_interval',
  ],
  'nest.compartmental_dynamics': [
    'morphology_disclaimer',
    'recorded_variable',
    'units',
    'time_units',
    'sampling_interval',
  ],
  'nest.animation_replay': ['frame_rate'],
  'corpus.knowledge_graph': [
    'graph_source',
    'graph_snapshot_id',
    'graph_scope',
    'identity_advisory',
  ],
};

describe('skill discovery', () => {
  it('describeSkills covers all 26 skills with renderable flags', () => {
    const d = describeSkills();
    expect(d.length).toBe(26);
    expect(d.filter((s) => s.renderable)).toHaveLength(22);
  });

  it('publishes topology transforms and deprecation without routing the legacy alias', () => {
    const legacy = describeSkill('nest.connectivity_matrix')!;
    expect(legacy.deprecation?.replacement).toBe('nest.connection_graph');
    expect(legacy.routerEligibility.bareFamilyCandidate).toBe(false);
    const graph = describeSkill('nest.connection_graph')!;
    expect(graph.transform).toMatchObject({
      id: 'synapseCollectionToConnectionGraphParams',
      outputSkill: 'nest.connection_graph',
    });
    expect(graph.routerEligibility.dataShapeKind).toBe('connection_graph');
  });

  it('describeSkill exposes scene + required keys + example for an agent', () => {
    const d = describeSkill('nest.spike_raster');
    expect(d).toBeDefined();
    expect(d!.scene).toBe('spike-raster');
    expect(d!.requiredInputKeys).toContain('times_ms');
    expect(d!.examplePayload).toBeDefined();
  });

  it('every skill’s required provenance keys match the pinned snapshot', () => {
    for (const c of listSkills()) {
      expect(c.requiredProvenanceKeys, c.id).toEqual(EXPECTED_PROVENANCE[c.id]);
    }
  });

  it('does not publish obsolete unbound corpus kind claims', () => {
    expect(PROVENANCE_KEYS).not.toContain('node_kinds');
    expect(PROVENANCE_KEYS).not.toContain('edge_kinds');
    expect(PROVENANCE_KEYS).not.toContain('pair_labels');
    expect(Object.hasOwn(PROVENANCE_KEY_LABELS, 'node_kinds')).toBe(false);
    expect(Object.hasOwn(PROVENANCE_KEY_LABELS, 'edge_kinds')).toBe(false);
    expect(Object.hasOwn(PROVENANCE_KEY_LABELS, 'pair_labels')).toBe(false);
  });
});

describe('example payloads are living fixtures', () => {
  it('every example payload passes its own skill gate', () => {
    for (const [id, payload] of Object.entries(SKILL_EXAMPLE_PAYLOADS)) {
      const r = validateSkillInvocation(id, payload);
      expect(r.ok, `${id}: ${r.ok ? '' : JSON.stringify(r.errors)}`).toBe(true);
    }
  });

  it('every renderable example is self-describing and passes validateSpec', () => {
    for (const [id, payload] of Object.entries(SKILL_EXAMPLE_PAYLOADS)) {
      expect(payload?.skill).toBe(id);
      expect(validateSpec(payload).ok, id).toBe(true);
    }
  });

  it('every renderable skill has an example payload', () => {
    for (const c of listSkills()) {
      if (c.scene !== null) {
        expect(SKILL_EXAMPLE_PAYLOADS[c.id], `${c.id} missing example`).toBeDefined();
      }
    }
  });

  it('attaches a copyable example to an invalid-params error', () => {
    const r = validateSkillInvocation('nest.spike_raster', {
      scene: 'spike-raster',
      params: {},
      provenance: { source: 's' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const withExample = r.errors.find((e) => e.example);
      expect(withExample?.example).toBeDefined();
    }
  });
});

describe('headless verification', () => {
  it('flags an empty SceneData as blank', () => {
    expect(detectEmptyScene({})).toMatchObject({ valid: true, empty: true });
  });

  it('reports populated channels for real data', () => {
    const r = spikeRecorderToSceneData({ senders: [1, 2], times: [1, 2] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const v = detectEmptyScene(r.data);
      expect(v.empty).toBe(false);
      expect(v.populated).toContain('spikeTimes');
    }
  });

  it('distinguishes hostile input from a legitimately empty scene', () => {
    expect(detectEmptyScene(null)).toMatchObject({ valid: false, empty: false });
    const toxic: Record<string, unknown> = {};
    Object.defineProperty(toxic, 'spikeTimes', {
      enumerable: true,
      get() {
        throw new Error('must not run');
      },
    });
    expect(detectEmptyScene(toxic)).toMatchObject({ valid: false, empty: false });
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(() => detectEmptyScene(revoked.proxy)).not.toThrow();
    expect(detectEmptyScene(revoked.proxy)).toMatchObject({ valid: false, empty: false });
  });

  it('rejects malformed or misaligned render channels rather than calling them valid', () => {
    expect(detectEmptyScene({ spikeTimes: ['not-a-number'] })).toMatchObject({
      valid: false,
      empty: false,
    });
    expect(detectEmptyScene({ networkNodes: [null] })).toMatchObject({
      valid: false,
      empty: false,
    });
    expect(detectEmptyScene({
      spikeTimes: new Float64Array(0),
      spikeSenders: new Float32Array([1]),
      timeUnits: 'ms',
    })).toMatchObject({ valid: false, empty: false });
    expect(detectEmptyScene({ unknownChannel: [] })).toMatchObject({
      valid: false,
      empty: false,
    });
    expect(detectEmptyScene({
      networkNodes: [{ id: 1, label: 'one' }],
      networkLayout: 'provided-3d',
      networkCoordinateUnits: 'mm',
    })).toMatchObject({ valid: false, empty: false });
    expect(detectEmptyScene({
      networkNodes: [{ id: 1, label: 'one', x: 0, y: 0, z: 0 }],
      networkLayout: 'unpositioned',
    })).toMatchObject({ valid: false, empty: false });
    expect(detectEmptyScene({
      networkNodes: [
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
      ],
      networkLayout: 'unpositioned',
      networkEdges: [{ source: 1, target: 2, weight: 0.5 }],
    })).toMatchObject({ valid: false, empty: false });
    expect(detectEmptyScene({
      vectorField: [{ x: Number.MAX_VALUE, y: 0, z: 0, dx: 0, dy: 0, dz: 0 }],
    })).toMatchObject({ valid: false, empty: false });
  });
});

describe('per-sender multimeter split', () => {
  it('splits a flattened dump into one monotonic series per sender', () => {
    const r = splitMultimeterBySender({
      times: [0, 1, 0, 1],
      values: [-65, -64, -70, -69],
      senders: [1, 1, 2, 2],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.series.length).toBe(2);
      expect(Array.from(r.series[0].values)).toEqual([-65, -64]);
    }
  });

  it('rejects a series that is still non-monotonic after split', () => {
    const r = splitMultimeterBySender({
      times: [1, 0],
      values: [1, 2],
      senders: [1, 1],
    });
    expect(r.ok).toBe(false);
  });
});
