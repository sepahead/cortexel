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
    params: { sources: [1, 2], targets: [2, 3], weights: [1.0, 0.5] },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      source_ids: '[1,2]',
      target_ids: '[2,3]',
      synapse_model: 'static_synapse',
      weight_units: 'pA',
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
      nodes: [
        { id: 'p1', kind: 'paper', label: 'Brunel 2000' },
        { id: 'm1', kind: 'model', label: 'iaf_psc_delta' },
        { id: 'f1', kind: 'family', label: 'LIF family' },
      ],
      edges: [
        { source: 'p1', target: 'm1', kind: 'instantiates' },
        { source: 'm1', target: 'f1', kind: 'belongs_to_family' },
      ],
    },
    mode: 'interactive',
    themeMode: 'dark',
    // advisory_only:true — identity edges are advisory structural similarity.
    provenance: {
      ...synthetic({
        graph_source: 'corpus_kg',
        node_kinds: 'paper,model,family',
        edge_kinds: 'instantiates,belongs_to_family',
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
  'nest.correlogram': {
    skill: 'nest.correlogram',
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: 'd3',
    params: {
      lags_ms: [-2, -1, 0, 1, 2],
      correlation: [0.1, 0.4, 1, 0.4, 0.1],
      normalization: 'pearson_coefficient',
      correlation_units: '1',
    },
    provenance: synthetic({
      bin_ms: 1,
      pair_labels: 'E×E',
      correlation_normalization: 'pearson_coefficient',
      correlation_units: '1',
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
