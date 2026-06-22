import { describe, expect, it } from 'vitest';
import {
  CONSERVATIVE_PROVENANCE,
  defaultHonestyCaption,
  requiresHonestyCaption,
  type ProvenanceMetadata,
} from '../core/provenance';

const rigorous: ProvenanceMetadata = {
  source: 'nest_simulation:run-123',
  calibrated_posterior: true,
  advisory_only: false,
  is_paper_local_evidence: true,
};

describe('honesty model fails closed', () => {
  it('defaults are the conservative (non-rigorous) values', () => {
    expect(CONSERVATIVE_PROVENANCE.calibrated_posterior).toBe(false);
    expect(CONSERVATIVE_PROVENANCE.advisory_only).toBe(false);
    expect(CONSERVATIVE_PROVENANCE.is_paper_local_evidence).toBe(false);
  });

  it('suppresses the caption ONLY when all three flags are explicitly rigorous', () => {
    expect(requiresHonestyCaption(rigorous)).toBe(false);
  });

  it('forces the caption if calibrated_posterior is false', () => {
    expect(requiresHonestyCaption({ ...rigorous, calibrated_posterior: false })).toBe(true);
  });

  it('forces the caption if advisory_only is true', () => {
    expect(requiresHonestyCaption({ ...rigorous, advisory_only: true })).toBe(true);
  });

  it('forces the caption if evidence is not paper-local', () => {
    expect(requiresHonestyCaption({ ...rigorous, is_paper_local_evidence: false })).toBe(true);
  });

  it('never returns an empty caption', () => {
    for (const source of ['synthetic_test', 'paper:doe2024', 'nest_simulation:x']) {
      const text = defaultHonestyCaption({ ...CONSERVATIVE_PROVENANCE, source });
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('labels synthetic data as schematic', () => {
    const text = defaultHonestyCaption({ ...CONSERVATIVE_PROVENANCE, source: 'synthetic_test' });
    expect(text.toLowerCase()).toContain('schematic');
  });

  it('honors an explicit caption override', () => {
    const text = defaultHonestyCaption({ ...CONSERVATIVE_PROVENANCE, source: 'x', caption: 'Custom' });
    expect(text).toBe('Custom');
  });
});
