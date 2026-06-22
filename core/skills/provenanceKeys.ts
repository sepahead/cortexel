// Structured provenance keys — the machine-checkable form of the Engram skill
// `provenance_requirements`. The backend declares those as free-text prose
// ('spike_recorder id', 'time units', ...) which a gate cannot validate. Here
// they become a closed enum so validateSkillInvocation can assert that an agent
// actually DECLARED the inputs a skill's honesty contract demands.
//
// A human-label lookup is kept for display and for the backend drift test, which
// maps its prose strings onto these keys.

import { z } from 'zod';

export const PROVENANCE_KEYS = [
  'device_id',
  'recorded_variable',
  'units',
  'sampling_interval',
  'recorder_id',
  'sender_ids',
  'population_labels',
  'time_units',
  'source_ids',
  'target_ids',
  'synapse_model',
  'weight_units',
  'extent',
  'mask',
  'kernel',
  'projection_sample_policy',
  'morphology_disclaimer',
  'frame_rate',
  'state_variables',
  'bin_ms',
  'pair_labels',
  'stim_units',
  'rate_normalization',
] as const;

export type ProvenanceKey = (typeof PROVENANCE_KEYS)[number];

export const ProvenanceKeyEnum = z.enum(PROVENANCE_KEYS);

export const PROVENANCE_KEY_LABELS: Record<ProvenanceKey, string> = {
  device_id: 'device id',
  recorded_variable: 'recorded variable',
  units: 'units',
  sampling_interval: 'sampling interval',
  recorder_id: 'spike_recorder id',
  sender_ids: 'sender ids',
  population_labels: 'population labels',
  time_units: 'time units',
  source_ids: 'source ids',
  target_ids: 'target ids',
  synapse_model: 'synapse model',
  weight_units: 'weight units',
  extent: 'extent',
  mask: 'mask',
  kernel: 'kernel',
  projection_sample_policy: 'projection sample policy',
  morphology_disclaimer: 'morphology geometry disclaimer',
  frame_rate: 'frame rate',
  state_variables: 'state variables',
  bin_ms: 'bin width',
  pair_labels: 'pair labels',
  stim_units: 'stimulus units',
  rate_normalization: 'rate normalization',
};

export function isProvenanceKey(value: unknown): value is ProvenanceKey {
  return (
    typeof value === 'string' &&
    (PROVENANCE_KEYS as readonly string[]).includes(value)
  );
}
