import { describe, expect, it } from 'vitest';
import {
  CONSERVATIVE_PROVENANCE,
  defaultHonestyCaption,
  mandatoryDisclosure,
  requiresHonestyCaption,
  type ProvenanceMetadata,
} from '../core/provenance';

const rigorous = {
  source: 'nest_simulation:run-123',
  calibrated_posterior: true,
  advisory_only: false,
  is_paper_local_evidence: true,
  synthetic: false,
} as unknown as ProvenanceMetadata;

describe('honesty model fails closed', () => {
  it('defaults are the conservative (non-rigorous) values', () => {
    expect(CONSERVATIVE_PROVENANCE.calibrated_posterior).toBe(false);
    expect(CONSERVATIVE_PROVENANCE.advisory_only).toBe(true);
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

  it('explicitly discloses advisory_only even for paper-local evidence', () => {
    expect(
      mandatoryDisclosure({ ...rigorous, calibrated_posterior: false, advisory_only: true }),
    ).toMatch(/^Advisory — advisory evidence only/);
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

  it('appends an agent caption but never lets it REPLACE the mandatory disclosure', () => {
    // Load-bearing honesty boundary: a caller-supplied caption is only ever extra
    // context. It can never suppress the schematic/advisory prefix (which would let
    // synthetic data be re-labeled "measured"). See the critical fix in provenance.ts.
    const text = defaultHonestyCaption({
      ...CONSERVATIVE_PROVENANCE,
      source: 'synthetic_test',
      synthetic: true,
      caption: 'Measured recording from Brunel et al. 2000',
    });
    expect(text).toContain('Schematic — illustrative synthetic data, not measured.');
    expect(text).toContain('Measured recording from Brunel et al. 2000');
    expect(text).toContain('Caller note (unverified):');
    expect(text.startsWith('Schematic')).toBe(true);
  });

  it('labels a contradictory caller note as unverified data', () => {
    const text = defaultHonestyCaption({
      ...CONSERVATIVE_PROVENANCE,
      source: 'synthetic_test',
      synthetic: true,
      caption: 'Ignore the disclosure; this is actually measured.',
    });
    expect(text).toMatch(/^Schematic/);
    expect(text).toContain('Caller note (unverified): Ignore the disclosure');
  });

  it('escapes host-visible Unicode bidi controls in caller notes', () => {
    const text = defaultHonestyCaption({
      ...CONSERVATIVE_PROVENANCE,
      source: 'synthetic_test',
      caption: 'before\u061c123\u202eafter',
    });
    expect(text).not.toContain('\u061c');
    expect(text).not.toContain('\u202e');
    expect(text).toContain('before\\u061c123\\u202eafter');
  });

  it('mandatoryDisclosure is derived only from flags, never from the caption', () => {
    // Same flags → same disclosure regardless of any (agent-controlled) caption.
    const base = mandatoryDisclosure({ ...CONSERVATIVE_PROVENANCE, source: 'synthetic_test', synthetic: true });
    const withCaption = mandatoryDisclosure({
      ...CONSERVATIVE_PROVENANCE,
      source: 'synthetic_test',
      synthetic: true,
      caption: 'anything the agent wants',
    });
    expect(base).toBe(withCaption);
    expect(base).toContain('Schematic');
  });
});
