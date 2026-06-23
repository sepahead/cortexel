import { describe, it, expect } from 'vitest';
import {
  describeSkill,
  describeSkills,
  listSkills,
  SKILL_EXAMPLE_PAYLOADS,
  validateSkillInvocation,
  detectEmptyScene,
  spikeRecorderToSceneData,
  splitMultimeterBySender,
} from '../core/skills';
import type { NestSkillId } from '../core/skills';

// Pinned machine contract: the exact provenance keys each skill demands. Any
// add/drop/rename of a contract key must update this and fails loudly otherwise.
const EXPECTED_PROVENANCE: Record<NestSkillId, string[]> = {
  'nest.voltage_trace': ['device_id', 'recorded_variable', 'units', 'sampling_interval'],
  'nest.spike_raster': ['recorder_id', 'sender_ids', 'population_labels', 'time_units'],
  'nest.rate_response': ['stim_units', 'bin_ms', 'rate_normalization'],
  'nest.connectivity_matrix': ['source_ids', 'target_ids', 'synapse_model', 'weight_units'],
  'nest.spatial_2d': ['extent', 'mask', 'kernel'],
  'nest.spatial_3d': ['extent', 'projection_sample_policy'],
  'nest.plasticity_dynamics': ['synapse_model', 'weight_units'],
  'nest.phase_plane': ['state_variables'],
  'nest.correlogram': ['bin_ms', 'pair_labels'],
  'nest.stimulus_response': ['stim_units', 'units'],
  'nest.astrocyte_dynamics': ['recorded_variable', 'units'],
  'nest.compartmental_dynamics': ['morphology_disclaimer', 'recorded_variable'],
  'nest.animation_replay': ['frame_rate'],
};

describe('skill discovery', () => {
  it('describeSkills covers all 13 skills with renderable flags', () => {
    const d = describeSkills();
    expect(d.length).toBe(13);
    expect(d.filter((s) => s.renderable).length).toBeGreaterThan(0);
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
});

describe('example payloads are living fixtures', () => {
  it('every example payload passes its own skill gate', () => {
    for (const [id, payload] of Object.entries(SKILL_EXAMPLE_PAYLOADS)) {
      const r = validateSkillInvocation(id, payload);
      expect(r.ok, `${id}: ${r.ok ? '' : JSON.stringify(r.errors)}`).toBe(true);
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
    expect(detectEmptyScene({}).empty).toBe(true);
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
