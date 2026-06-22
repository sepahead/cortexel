import { describe, expect, it } from 'vitest';
import { validateVizSpec, VizSpecSchema } from '../core/vizSpec';
import { SCENE_NAMES } from '../core/designLaws';

describe('VizSpec validation', () => {
  it('accepts a minimal valid spec and applies conservative defaults', () => {
    const r = validateVizSpec({
      scene: 'spike-raster',
      provenance: { source: 'nest_simulation:run-1' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.mode).toBe('interactive');
      expect(r.spec.themeMode).toBe('dark');
      expect(r.spec.params).toEqual({});
      // fail-closed provenance defaults
      expect(r.spec.provenance.calibrated_posterior).toBe(false);
      expect(r.spec.provenance.advisory_only).toBe(false);
      expect(r.spec.provenance.is_paper_local_evidence).toBe(false);
    }
  });

  it('rejects an unknown scene with a legible error', () => {
    const r = validateVizSpec({ scene: 'not-a-scene', provenance: { source: 'x' } });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThan(0);
      expect(r.errors.join(' ')).toContain('scene');
    }
  });

  it('rejects a spec missing provenance (honesty is mandatory)', () => {
    const r = validateVizSpec({ scene: 'psth' });
    expect(r.ok).toBe(false);
  });

  it('rejects a blank provenance source', () => {
    const r = validateVizSpec({ scene: 'psth', provenance: { source: '' } });
    expect(r.ok).toBe(false);
  });

  it('accepts every declared scene name', () => {
    for (const scene of SCENE_NAMES) {
      const r = validateVizSpec({ scene, provenance: { source: 's' } });
      expect(r.ok, `scene ${scene}`).toBe(true);
    }
  });

  it('keeps the Zod enum in sync with the SceneName tuple', () => {
    // VizSpecSchema.shape.scene is a ZodEnum built from SCENE_NAMES.
    const parsed = VizSpecSchema.safeParse({
      scene: SCENE_NAMES[0],
      provenance: { source: 's' },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects calibrated_posterior=true at the shared envelope (501 boundary)', () => {
    // The non-skill VizSpec path must fail closed too — this is the only flag
    // that could ever suppress the honesty caption, so it can never be accepted.
    const r = validateVizSpec({
      scene: 'spike-raster',
      provenance: { source: 's', calibrated_posterior: true },
    });
    expect(r.ok).toBe(false);
  });
});
