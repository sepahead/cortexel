import { describe, expect, it } from 'vitest';

import {
  BUILTIN_PALETTE_THEMES,
  SEMANTIC_PALETTE_KEYS,
  getPaletteEntry,
  validatePalette,
} from '../core/colormaps';
import { validateSkillInvocation } from '../core/skills/validateSkillInvocation';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function rasterSpec(palette: string) {
  return {
    scene: 'spike-raster',
    params: { times_ms: [1], senders: [1] },
    provenance: {
      source: 'synthetic:theme-control',
      declared_inputs: {
        recorder_id: 'recorder',
        sender_ids: '[1]',
        population_labels: '["E"]',
        time_units: 'ms',
      },
    },
    palette,
  };
}

describe('built-in semantic render themes', () => {
  it('publishes at least twelve additional reusable light/dark themes', () => {
    const themes = BUILTIN_PALETTE_THEMES.filter(({ name }) => name !== 'crameri');
    expect(themes.length).toBeGreaterThanOrEqual(12);
    expect(new Set(BUILTIN_PALETTE_THEMES.map(({ name }) => name)).size)
      .toBe(BUILTIN_PALETTE_THEMES.length);
    expect(themes.some(({ themeMode }) => themeMode === 'dark')).toBe(true);
    expect(themes.some(({ themeMode }) => themeMode === 'light')).toBe(true);
    expect(Object.isFrozen(BUILTIN_PALETTE_THEMES)).toBe(true);
    for (const theme of BUILTIN_PALETTE_THEMES) {
      const entry = getPaletteEntry(theme.name);
      expect(entry).toBeDefined();
      expect(entry?.metadata.label).toBe(theme.label);
      expect(Object.isFrozen(theme)).toBe(true);
      expect(Object.isFrozen(entry?.palette)).toBe(true);
      expect(() => validatePalette(entry!.palette)).not.toThrow();
      expect(Object.keys(entry!.palette).sort()).toEqual([...SEMANTIC_PALETTE_KEYS].sort());
      expect(validateSkillInvocation('nest.spike_raster', rasterSpec(theme.name)).ok).toBe(true);
    }
  });

  it('keeps text readable on each new theme surface and the canonical graph background', () => {
    for (const theme of BUILTIN_PALETTE_THEMES) {
      // Preserve the existing Crameri tokens; the additions own this new gate.
      if (theme.name === 'crameri') continue;
      const palette = getPaletteEntry(theme.name)!.palette;
      const backgrounds = [
        palette.voidNavy,
        palette.deepNavy,
        palette.panel,
        theme.themeMode === 'dark' ? '#030711' : '#f8fafc',
      ];
      for (const background of backgrounds) {
        for (const text of [palette.ink, palette.inkDim, palette.inkFaint]) {
          expect(contrast(text, background), `${theme.name}: ${text} on ${background}`)
            .toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const mark of [palette.excitatory, palette.inhibitory, palette.spike]) {
        expect(contrast(mark, backgrounds[3]), `${theme.name}: graph mark ${mark}`)
          .toBeGreaterThanOrEqual(3);
      }
      expect(palette.excitatory).not.toBe(palette.inhibitory);
      expect(palette.ltp).not.toBe(palette.ltd);
      expect(palette.ltp).toBe(palette.excitatory);
      expect(palette.ltd).toBe(palette.inhibitory);
    }
  });

  it('rejects an unknown theme rather than turning palette fallback into acceptance', () => {
    const result = validateSkillInvocation(
      'nest.spike_raster',
      rasterSpec('cortexel-unavailable-theme'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(({ code }) => code === 'unknown_palette')).toBe(true);
  });

  it('retains conservative provenance for every theme', () => {
    for (const { name } of BUILTIN_PALETTE_THEMES) {
      const result = validateSkillInvocation('nest.spike_raster', rasterSpec(name));
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.spec.provenance.calibrated_posterior).toBe(false);
      expect(result.caption).not.toBeNull();
      const forbidden = validateSkillInvocation('nest.spike_raster', {
        ...rasterSpec(name),
        provenance: {
          ...rasterSpec(name).provenance,
          calibrated_posterior: true,
        },
      });
      expect(forbidden.ok).toBe(false);
    }
  });
});
