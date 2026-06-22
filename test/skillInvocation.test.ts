import { describe, it, expect } from 'vitest';
import { validateSkillInvocation } from '../core/skills/validateSkillInvocation';

const goodProv = {
  source: 'nest_simulation:run42',
  declared_inputs: {
    recorder_id: 'sr_1',
    sender_ids: '[1,2,3]',
    population_labels: 'E,I',
    time_units: 'ms',
  },
};

function spikeSpec(overrides: Record<string, unknown> = {}) {
  return {
    scene: 'spike-raster',
    params: { times_ms: [1, 2, 3], senders: [1, 2, 3] },
    provenance: goodProv,
    ...overrides,
  };
}

describe('validateSkillInvocation', () => {
  it('accepts a well-formed spike_raster invocation and returns a caption', () => {
    const r = validateSkillInvocation('pi.nest.spike_raster', spikeSpec());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.scene).toBe('spike-raster');
      // advisory/non-paper-local defaults → caption required (fail-closed).
      expect(r.caption).toBeTruthy();
    }
  });

  it('rejects an unknown skill id (fail-closed)', () => {
    const r = validateSkillInvocation('pi.nest.nope', spikeSpec());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe('unknown_skill');
  });

  it('rejects missing required params', () => {
    const r = validateSkillInvocation(
      'pi.nest.spike_raster',
      spikeSpec({ params: { times_ms: [1, 2, 3] } }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'invalid_params')).toBe(true);
  });

  it('rejects missing required provenance keys', () => {
    const r = validateSkillInvocation(
      'pi.nest.spike_raster',
      spikeSpec({
        provenance: { source: 'nest_simulation:run42', declared_inputs: { recorder_id: 'sr_1' } },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const missing = r.errors.filter((e) => e.code === 'missing_provenance');
      expect(missing.length).toBeGreaterThan(0);
    }
  });

  it('rejects calibrated_posterior=true as unsupported (mirrors the 501 boundary)', () => {
    const r = validateSkillInvocation(
      'pi.nest.spike_raster',
      spikeSpec({ provenance: { ...goodProv, calibrated_posterior: true } }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(
        r.errors.some((e) => e.code === 'calibrated_posterior_unsupported'),
      ).toBe(true);
    }
  });

  it('forces a schematic caption when synthetic=true', () => {
    const r = validateSkillInvocation(
      'pi.nest.spike_raster',
      spikeSpec({ provenance: { ...goodProv, synthetic: true } }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.caption).toMatch(/[Ss]chematic|illustrative/);
  });

  it('refuses a skill with no Cortexel scene (honest gap)', () => {
    const r = validateSkillInvocation('pi.nest.compartmental_dynamics', {
      scene: 'voltage-trace',
      params: { compartments: [] },
      provenance: goodProv,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'no_cortexel_scene')).toBe(true);
  });

  it('always carries a derived-view disclosure for a weak skill (astrocyte)', () => {
    const r = validateSkillInvocation('pi.nest.astrocyte_dynamics', {
      scene: 'voltage-trace',
      params: { ca_trace: [0.1, 0.2], units: 'uM' },
      provenance: {
        source: 'nest_simulation:astro',
        declared_inputs: { recorded_variable: 'Ca', units: 'uM' },
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.caption).toMatch(/Derived view/);
  });

  it('rejects a scene that does not match the skill contract', () => {
    const r = validateSkillInvocation(
      'pi.nest.spike_raster',
      spikeSpec({ scene: 'voltage-trace' }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'scene_mismatch')).toBe(true);
  });
});
