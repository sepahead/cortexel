// Worked example payloads — one valid VizSpec per renderable skill. These are
// the agent's few-shot grounding (Vega-Lite gallery pattern): a discovery call
// returns them, and validateSkillInvocation attaches the matching example to a
// params/scene error so an autonomous agent can self-repair in one shot.
//
// Every example here is asserted to PASS validateSkillInvocation by the test
// suite, so they double as living fixtures — they cannot rot into invalid shapes.
// Provenance is deliberately synthetic (source 'synthetic_test', synthetic:true)
// so an example is honestly captioned as illustrative, never mistaken for data.

import type { VizSpec } from '../vizSpec';
import type { PiNestSkillId } from './skillIds';

const synthetic = (
  declared_inputs: Record<string, string | number | true>,
): VizSpec['provenance'] => ({
  source: 'synthetic_test',
  calibrated_posterior: false,
  advisory_only: false,
  is_paper_local_evidence: false,
  synthetic: true,
  declared_inputs,
});

export const SKILL_EXAMPLE_PAYLOADS: Partial<Record<PiNestSkillId, VizSpec>> = {
  'pi.nest.voltage_trace': {
    scene: 'voltage-trace',
    params: { times_ms: [0, 1, 2], series: [[-65, -64, -63]], units: 'mV' },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({
      device_id: 'mm_1',
      recorded_variable: 'V_m',
      units: 'mV',
      sampling_interval: 0.1,
    }),
  },
  'pi.nest.spike_raster': {
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
  'pi.nest.rate_response': {
    scene: 'fi-curve',
    params: { stimulus_amplitudes: [0, 100, 200], rates_hz: [0, 12, 31], units: 'Hz' },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({ stim_units: 'pA', bin_ms: 100, rate_normalization: 'spikes/s' }),
  },
  'pi.nest.connectivity_matrix': {
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
  'pi.nest.spatial_3d': {
    scene: 'network-topology',
    params: { objects: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({ extent: '[1,1,1]', projection_sample_policy: 'all' }),
  },
  'pi.nest.plasticity_dynamics': {
    scene: 'stdp',
    params: { times_ms: [0, 10, 20], weights: [1.0, 1.1, 1.05], weight_units: 'nS' },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({ synapse_model: 'stdp_synapse', weight_units: 'nS' }),
  },
  'pi.nest.phase_plane': {
    scene: 'phase-plane',
    params: { grid: { v: [-70, -50], w: [0, 1] } },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({ state_variables: 'V,w' }),
  },
  'pi.nest.astrocyte_dynamics': {
    scene: 'voltage-trace',
    params: { ca_trace: [0.1, 0.2, 0.15], units: 'uM' },
    mode: 'interactive',
    themeMode: 'dark',
    provenance: synthetic({ recorded_variable: 'Ca', units: 'uM' }),
  },
};

export function getExamplePayload(id: string): VizSpec | undefined {
  return SKILL_EXAMPLE_PAYLOADS[id as PiNestSkillId];
}
