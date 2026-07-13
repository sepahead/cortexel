// Worked example payloads — one valid envelope per skill. Renderable skills use
// VizSpec; scene-less skills use the parallel HostRendererInvocation envelope.
// the agent's few-shot grounding (Vega-Lite gallery pattern): a discovery call
// returns them, and validateSkillInvocation attaches the matching example to a
// params/scene error so an autonomous agent can self-repair in one shot.
//
// Every example here is asserted to PASS validateSkillInvocation by the test
// suite, so they double as living fixtures — they cannot rot into invalid shapes.
// Provenance is deliberately synthetic (source 'synthetic_test', synthetic:true)
// so an example is honestly captioned as illustrative, never mistaken for data.

import { CORTEXEL_SPEC_VERSION, type VizSpec } from '../vizSpec';
import { isSkillId, type NestSkillId } from './skillIds';
import type { HostRendererInvocation } from './hostInvocation';

const synthetic = (
  declared_inputs: Record<string, string | number | true>,
): VizSpec['provenance'] => ({
  source: 'synthetic_test',
  calibrated_posterior: false,
  advisory_only: true,
  is_paper_local_evidence: false,
  synthetic: true,
  declared_inputs,
});

export const SKILL_EXAMPLE_PAYLOADS: Partial<Record<NestSkillId, VizSpec>> = {
  'nest.voltage_trace': {
    scene: 'voltage-trace',
    params: {
      times_ms: [0, 1, 2],
      series: [[-65, -64, -63]],
      series_labels: ['neuron 1 · V_m'],
      units: 'mV',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      device_id: 'mm_1',
      recorded_variable: 'V_m',
      units: 'mV',
      sampling_interval: 0.1,
    }),
  },
  'nest.spike_raster': {
    scene: 'spike-raster',
    params: { times_ms: [1, 2, 3], senders: [1, 2, 1] },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      recorder_id: 'sr_1',
      sender_ids: '[1,2]',
      population_labels: 'E',
      time_units: 'ms',
    }),
  },
  'nest.isi_distribution': {
    scene: 'isi-distribution',
    params: {
      bin_centers_ms: [0.5, 1.5, 2.5],
      values: [2, 5, 1],
      bin_width_ms: 1,
      normalization: 'count',
      value_units: 'count',
      interval_scope: 'per_sender',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      recorder_id: 'sr_1',
      sender_ids: '[1,2]',
      population_labels: 'E',
      time_units: 'ms',
      bin_ms: 1,
      histogram_normalization: 'count',
      interval_scope: 'per_sender',
    }),
  },
  'nest.psth': {
    scene: 'psth',
    params: {
      bin_centers_ms: [2.5, 7.5, 12.5],
      values: [200, 800, 400],
      bin_width_ms: 5,
      normalization: 'rate_hz',
      value_units: 'Hz',
      trial_count: 1,
      alignment_event: 'simulation origin',
      aggregation: 'selected_senders_per_trial',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      recorder_id: 'sr_1',
      sender_ids: '[1]',
      population_labels: 'gamma generator',
      time_units: 'ms',
      bin_ms: 5,
      histogram_normalization: 'rate_hz',
      event_alignment: 'simulation origin',
      psth_aggregation: 'selected_senders_per_trial',
    }),
  },
  'nest.population_rate': {
    scene: 'population-rate',
    params: {
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
      normalization: 'mean_per_recorded_sender_hz',
      aggregation: 'selected_senders',
      binning: 'left_closed_right_open',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      recorder_id: 'sr_1',
      sender_ids: '[1,2]',
      population_labels: 'E',
      time_units: 'ms',
      bin_ms: 5,
      rate_normalization: 'mean_per_recorded_sender_hz',
      binning_policy: 'left_closed_right_open',
    }),
  },
  'nest.correlogram': {
    scene: 'correlogram',
    params: {
      lags_ms: [-2, -1, 0, 1, 2],
      values: [1, 4, 10, 4, 1],
      bin_width_ms: 1,
      tau_max_ms: 2,
      counting_start_ms: 0,
      counting_stop_ms: 1000,
      pair: {
        reference_label: 'E',
        target_label: 'E',
      },
      lag_convention: 'positive_target_after_reference',
      binning: 'left_closed_right_open',
      zero_lag_policy: 'included',
      statistic: {
        kind: 'raw_pair_count',
        units: 'count',
      },
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      detector_id: 'cd_1',
      reference_population: 'E',
      target_population: 'E',
      bin_ms: 1,
      correlation_normalization: 'raw_pair_count',
      correlation_units: 'count',
      lag_convention: 'positive_target_after_reference',
      binning_policy: 'left_closed_right_open',
    }),
  },
  'nest.rate_response': {
    scene: 'fi-curve',
    params: {
      stimulus_amplitudes: [0, 100, 200],
      rates_hz: [0, 12, 31],
      stimulus_units: 'pA',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({ stim_units: 'pA', bin_ms: 100, rate_normalization: 'spikes/s' }),
  },
  'nest.connectivity_matrix': {
    scene: 'network-topology',
    params: {
      sources: [1, 2],
      targets: [2, 3],
      weights: [1.0, 0.5],
      weight_units: 'pA',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,2]',
      target_ids: '[2,3]',
      synapse_model: 'static_synapse',
      weight_units: 'pA',
      connection_sample_policy: 'complete',
    }),
  },
  'nest.connection_graph': {
    scene: 'network-topology',
    params: {
      nodes: [
        { id: 1, label: '1' },
        { id: 2, label: '2' },
        { id: 3, label: '3' },
      ],
      edges: [
        { id: 'connection:0', source: 1, target: 2, weight: 1, delay_ms: 1.5, synapse_model: 'static_synapse' },
        { id: 'connection:1', source: 1, target: 2, weight: 0.5, delay_ms: 2, synapse_model: 'static_synapse' },
      ],
      weight_units: 'pA',
      delay_units: 'ms',
      layout: 'schematic_circle',
      parallel_edges: 'preserved',
      self_connections: 'preserved',
      snapshot_time_ms: 100,
      snapshot_scope: { kind: 'single_process_complete' },
      sample_policy: 'complete',
      source_connection_count: 2,
      edge_identity: 'canonical_sorted_ordinal',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,3]',
        target_ids: '[2,3]',
      synapse_model: 'static_synapse',
      connection_sample_policy: 'complete',
      snapshot_time_ms: 100,
      snapshot_scope: 'single_process_complete',
      parallel_edge_policy: 'preserved',
      weight_units: 'pA',
      delay_units: 'ms',
    }),
  },
  'nest.adjacency_matrix': {
    scene: 'connection-matrix',
    params: {
      source_ids: [1, 2],
      target_ids: [3, 4],
      cells: [{ source_id: 1, target_id: 3, connection_count: 2 }],
      axis_order: 'target_rows_source_columns',
      absent_cell: 'no_connection',
      sample_policy: 'complete',
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: 'single_process_complete' },
      display: 'binary_presence',
      aggregation: 'any_connection',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,2]', target_ids: '[3,4]', synapse_model: 'static_synapse',
      connection_sample_policy: 'complete', snapshot_time_ms: 100,
      snapshot_scope: 'single_process_complete',
      parallel_edge_policy: 'preserved_as_connection_count',
      matrix_axis_order: 'target_rows_source_columns', matrix_aggregation: 'any_connection',
    }),
  },
  'nest.weight_matrix': {
    scene: 'connection-matrix',
    params: {
      source_ids: [1, 2],
      target_ids: [3, 4],
      cells: [{ source_id: 1, target_id: 3, connection_count: 2, value: 0 }],
      weight_units: 'pA',
      aggregation: 'sum',
      axis_order: 'target_rows_source_columns',
      absent_cell: 'no_connection',
      sample_policy: 'complete',
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: 'single_process_complete' },
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,2]', target_ids: '[3,4]', synapse_model: 'static_synapse',
      weight_units: 'pA', connection_sample_policy: 'complete', snapshot_time_ms: 100,
      snapshot_scope: 'single_process_complete',
      parallel_edge_policy: 'preserved_as_connection_count',
      matrix_axis_order: 'target_rows_source_columns', matrix_aggregation: 'sum',
    }),
  },
  'nest.delay_matrix': {
    scene: 'connection-matrix',
    params: {
      source_ids: [1, 2],
      target_ids: [3, 4],
      cells: [{ source_id: 1, target_id: 3, connection_count: 2, value: 1.5 }],
      delay_units: 'ms',
      aggregation: 'mean',
      axis_order: 'target_rows_source_columns',
      absent_cell: 'no_connection',
      sample_policy: 'complete',
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: 'single_process_complete' },
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,2]', target_ids: '[3,4]', synapse_model: 'static_synapse',
      delay_units: 'ms', connection_sample_policy: 'complete', snapshot_time_ms: 100,
      snapshot_scope: 'single_process_complete',
      parallel_edge_policy: 'preserved_as_connection_count',
      matrix_axis_order: 'target_rows_source_columns', matrix_aggregation: 'mean',
    }),
  },
  'nest.in_degree_distribution': {
    scene: 'degree-distribution',
    params: {
      degrees: [0, 1, 2], node_counts: [1, 0, 1], values: [1, 0, 1],
      node_count: 2, connection_count: 2, direction: 'in', normalization: 'count',
      value_units: 'count', edge_counting: 'each_synapse_collection_entry',
      zero_degree_policy: 'include_declared_universe', sample_policy: 'complete',
      snapshot_time_ms: 100, snapshot_scope: { kind: 'single_process_complete' },
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,2]', target_ids: '[3,4]', synapse_model: 'static_synapse',
      connection_sample_policy: 'complete', snapshot_time_ms: 100,
      snapshot_scope: 'single_process_complete', parallel_edge_policy: 'count_each_connection',
      degree_direction: 'in', degree_counting: 'each_synapse_collection_entry',
      zero_degree_policy: 'include_declared_universe', histogram_normalization: 'count',
    }),
  },
  'nest.out_degree_distribution': {
    scene: 'degree-distribution',
    params: {
      degrees: [0, 1], node_counts: [1, 2], values: [1, 2],
      node_count: 3, connection_count: 2, direction: 'out', normalization: 'count',
      value_units: 'count', edge_counting: 'each_synapse_collection_entry',
      zero_degree_policy: 'include_declared_universe', sample_policy: 'complete',
      snapshot_time_ms: 100, snapshot_scope: { kind: 'single_process_complete' },
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,3]', target_ids: '[4,5]', synapse_model: 'static_synapse',
      connection_sample_policy: 'complete', snapshot_time_ms: 100,
      snapshot_scope: 'single_process_complete', parallel_edge_policy: 'count_each_connection',
      degree_direction: 'out', degree_counting: 'each_synapse_collection_entry',
      zero_degree_policy: 'include_declared_universe', histogram_normalization: 'count',
    }),
  },
  'nest.delay_distribution': {
    scene: 'delay-distribution',
    params: {
      bin_centers_ms: [0.5, 1.5, 2.5], delay_counts: [0, 1, 1], values: [0, 1, 1],
      bin_width_ms: 1, window_start_ms: 0, window_stop_ms: 3,
      normalization: 'count', value_units: 'count', delay_units: 'ms',
      aggregation: 'each_connection', binning: 'left_closed_right_open',
      sample_policy: 'complete', connection_count: 2, snapshot_time_ms: 100,
      snapshot_scope: { kind: 'single_process_complete' },
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,2]', target_ids: '[3,4]', synapse_model: 'static_synapse',
      delay_units: 'ms', connection_sample_policy: 'complete', snapshot_time_ms: 100,
      snapshot_scope: 'single_process_complete', parallel_edge_policy: 'count_each_connection',
      bin_ms: 1, histogram_normalization: 'count', binning_policy: 'left_closed_right_open',
    }),
  },
  'nest.weight_histogram': {
    scene: 'weight-histogram',
    params: {
      bin_centers: [-2, -1, 0, 1, 2],
      values: [3, 5, 0, 7, 2],
      bin_width: 1,
      weight_units: 'pA',
      normalization: 'count',
      value_units: 'count',
      snapshot_time_ms: 1000,
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,2]',
      target_ids: '[3,4]',
      synapse_model: 'static_synapse',
      weight_units: 'pA',
      histogram_normalization: 'count',
      connection_sample_policy: 'all matching connections at snapshot_time_ms',
    }),
  },
  'nest.spatial_map_2d': {
    scene: 'spatial-map-2d',
    params: {
      nodes: [
        { id: 41, label: '41', x: -0.5, y: 0 },
        { id: 99, label: '99', x: 0.5, y: 0 },
      ],
      coordinate_units: 'model units',
      extent: [2, 1],
      center: [0, 0],
      edge_wrap: false,
      position_scope: { kind: 'single_process_complete' },
      marker_size: 'fixed_screen_space',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      node_ids: '[41,99]',
      spatial_units: 'model units',
      extent: '[2,1]',
      position_scope: 'single_process_complete',
    }),
  },
  'nest.spatial_3d': {
    scene: 'network-topology',
    params: {
      objects: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      coordinate_units: 'mm',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      extent: '[1,1,1]',
      spatial_units: 'mm',
      projection_sample_policy: 'all',
    }),
  },
  'nest.plasticity_dynamics': {
    scene: 'stdp',
    params: { times_ms: [0, 10, 20], weights: [1.0, 1.1, 1.05], weight_units: 'nS' },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({ synapse_model: 'stdp_synapse', weight_units: 'nS' }),
  },
  'nest.phase_plane': {
    scene: 'phase-plane',
    params: {
      grid: { v: [-70, -50], w: [0, 1] },
      derivatives: {
        v: [0.2, 0.1, -0.1, -0.2],
        w: [-0.05, 0.05, -0.05, 0.05],
      },
      axis_units: { v: 'mV', w: '1' },
      derivative_units: { v: 'mV/ms', w: '1/ms' },
      axis_order: ['v', 'w'],
      flattening: 'row-major-last-axis-fastest',
    },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      state_variables: 'V,w',
      derivation_method: 'model equations evaluated on Cartesian grid',
      model_context: 'Hodgkin-Huxley reduced phase plane',
      fixed_parameters: 'all non-plotted state variables clamped to declared values',
    }),
  },
  'nest.astrocyte_dynamics': {
    scene: 'voltage-trace',
    params: { times_ms: [0, 1, 2], ca_trace: [0.1, 0.2, 0.15], units: 'uM' },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      recorded_variable: 'Ca',
      units: 'uM',
      time_units: 'ms',
      sampling_interval: 1,
    }),
  },
  'corpus.knowledge_graph': {
    scene: 'knowledge-graph-3d',
    params: {
      graph_id: 'corpus-entity-graph',
      graph_source: 'engram:corpus_entity_graph',
      graph_snapshot_id: 'sha256:example-corpus-snapshot',
      graph_scope: 'corpus_entity',
      generated_at: '2026-07-11T00:00:00Z',
      nodes: [
        {
          id: 'p1',
          kind: 'paper',
          label: 'Brunel 2000',
          detail: 'Balanced random network paper',
          attributes: { family: 'LIF', n_neurons: 2, n_synapses: 2 },
          epistemic: {
            status: 'derived_advisory',
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false,
          },
          evidence: [{
            kind: 'graph_snapshot_record',
            evidence_id: 'snapshot-node-p1',
            record_id: 'node:p1',
          }],
        },
        {
          id: 'm1',
          kind: 'model',
          label: 'iaf_psc_delta',
          attributes: { family: 'LIF', paper_count: 1 },
          epistemic: {
            status: 'derived_advisory',
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false,
          },
          evidence: [{
            kind: 'graph_snapshot_record',
            evidence_id: 'snapshot-node-m1',
            record_id: 'node:m1',
          }],
        },
        {
          id: 'm2',
          kind: 'model',
          label: 'iaf_psc_alpha',
          attributes: { family: 'LIF', paper_count: 1 },
          epistemic: {
            status: 'derived_advisory',
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false,
          },
          evidence: [{
            kind: 'graph_snapshot_record',
            evidence_id: 'snapshot-node-m2',
            record_id: 'node:m2',
          }],
        },
        {
          id: 'f1',
          kind: 'family',
          label: 'LIF family',
          attributes: { paper_count: 2 },
          epistemic: {
            status: 'derived_advisory',
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false,
          },
          evidence: [{
            kind: 'graph_snapshot_record',
            evidence_id: 'snapshot-node-f1',
            record_id: 'node:f1',
          }],
        },
      ],
      edges: [
        {
          id: 'edge:p1-instantiates-m1',
          source: 'p1',
          target: 'm1',
          kind: 'instantiates',
          label: 'instantiates',
          attributes: {},
          epistemic: {
            status: 'derived_advisory',
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false,
          },
          evidence: [{
            kind: 'graph_snapshot_record',
            evidence_id: 'snapshot-edge-p1-m1',
            record_id: 'edge:p1-instantiates-m1',
          }],
        },
        {
          id: 'edge:m2-variant-m1',
          source: 'm2',
          target: 'm1',
          kind: 'variant_of',
          label: 'variant of',
          attributes: { delta_summary: 'alpha-shaped postsynaptic current' },
          epistemic: {
            status: 'derived_advisory',
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false,
          },
          evidence: [{
            kind: 'graph_snapshot_record',
            evidence_id: 'snapshot-edge-m2-m1',
            record_id: 'edge:m2-variant-m1',
          }],
          uncalibrated_score: {
            kind: 'structural_similarity',
            value: 0.72,
            calibrated_posterior: false,
          },
        },
        {
          id: 'edge:m1-family-f1',
          source: 'm1',
          target: 'f1',
          kind: 'belongs_to_family',
          label: 'belongs to family',
          attributes: {},
          epistemic: {
            status: 'derived_advisory',
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false,
          },
          evidence: [{
            kind: 'graph_snapshot_record',
            evidence_id: 'snapshot-edge-m1-f1',
            record_id: 'edge:m1-family-f1',
          }],
        },
      ],
    },
    mode: 'interactive',
    themeMode: 'dark',
    // advisory_only:true — identity edges are advisory structural similarity.
    provenance: {
      ...synthetic({
        graph_source: 'engram:corpus_entity_graph',
        graph_snapshot_id: 'sha256:example-corpus-snapshot',
        graph_scope: 'corpus_entity',
        identity_advisory: true,
      }),
      advisory_only: true,
    },
  },
};

export const HOST_RENDERER_EXAMPLE_PAYLOADS: Partial<
  Record<NestSkillId, HostRendererInvocation>
> = {
  'nest.spatial_2d': {
    skill: 'nest.spatial_2d',
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: 'd3',
    params: { positions: [[0, 0], [1, 1]], coordinate_units: 'mm' },
    provenance: synthetic({
      extent: '[1,1]',
      spatial_units: 'mm',
      mask: 'none',
      kernel: 'none',
    }),
  },
  'nest.stimulus_response': {
    skill: 'nest.stimulus_response',
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: 'matplotlib',
    params: {
      times_ms: [0, 1, 2],
      stimulus: [0, 1, 0],
      response: [-65, -60, -64],
    },
    provenance: synthetic({ stim_units: 'pA', units: 'mV', time_units: 'ms' }),
  },
  'nest.compartmental_dynamics': {
    skill: 'nest.compartmental_dynamics',
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: 'd3',
    params: {
      times_ms: [0, 1, 2],
      compartments: [
        {
          id: 'soma',
          parent_id: null,
          label: 'soma',
          values: [-65, -64, -63],
        },
      ],
    },
    provenance: synthetic({
      morphology_disclaimer: 'schematic topology; no inferred geometry',
      recorded_variable: 'V_m',
      units: 'mV',
      time_units: 'ms',
      sampling_interval: 1,
    }),
  },
  'nest.animation_replay': {
    skill: 'nest.animation_replay',
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: 'manim',
    params: { frames: [{ time_ms: 0, state: { status: 'initial' } }] },
    provenance: synthetic({ frame_rate: 30 }),
  },
};

function deepFreezeJson(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) deepFreezeJson(child);
  Object.freeze(value);
}

// Worked examples are self-describing and immutable at rest. A caller receives
// a defensive JSON clone from getExamplePayload, so mutating discovery output
// cannot poison future repair prompts.
for (const [skill, payload] of Object.entries(SKILL_EXAMPLE_PAYLOADS)) {
  if (!payload) continue;
  payload.skill = skill;
  payload.specVersion = CORTEXEL_SPEC_VERSION;
  deepFreezeJson(payload);
}
Object.setPrototypeOf(SKILL_EXAMPLE_PAYLOADS, null);
Object.freeze(SKILL_EXAMPLE_PAYLOADS);

for (const payload of Object.values(HOST_RENDERER_EXAMPLE_PAYLOADS)) {
  if (payload) deepFreezeJson(payload);
}
Object.setPrototypeOf(HOST_RENDERER_EXAMPLE_PAYLOADS, null);
Object.freeze(HOST_RENDERER_EXAMPLE_PAYLOADS);

export function getExamplePayload(id: unknown): VizSpec | undefined {
  if (!isSkillId(id)) return undefined;
  const payload = SKILL_EXAMPLE_PAYLOADS[id];
  return payload
    ? (JSON.parse(JSON.stringify(payload)) as VizSpec)
    : undefined;
}

export function getHostRendererExamplePayload(
  id: unknown,
): HostRendererInvocation | undefined {
  if (!isSkillId(id)) return undefined;
  const payload = HOST_RENDERER_EXAMPLE_PAYLOADS[id];
  return payload
    ? (JSON.parse(JSON.stringify(payload)) as HostRendererInvocation)
    : undefined;
}

export function getInvocationExamplePayload(
  id: unknown,
): VizSpec | HostRendererInvocation | undefined {
  return getExamplePayload(id) ?? getHostRendererExamplePayload(id);
}
