import { describe, it, expect } from 'vitest';
import {
  CORTEXEL_PALETTE,
  getPalette,
  getPaletteEntry,
  listPalettes,
  registerPalette,
  isRegisteredPalette,
  validatePalette,
  categorical,
  colormapGradient,
  colormapRgba,
  colormapSvgStops,
  sampleColormap,
  TURBO_GLSL,
  type SemanticPalette,
  type PaletteMetadata,
} from '../core/colormaps';
import { validateVizSpec } from '../core/vizSpec';
import { validateSkillInvocation } from '../core/skills/validateSkillInvocation';

// A valid test palette (distinct from the default)
const TEST_PALETTE: SemanticPalette = {
  voidNavy: '#030711',
  deepNavy: '#050816',
  panel: '#0b1220',
  grid: '#1e293b',
  cyan: '#00b4d8',
  teal: '#0096c7',
  violet: '#9d4edd',
  amber: '#ffb703',
  orange: '#fb8500',
  pink: '#ff006e',
  membrane: '#00b4d8',
  spike: '#ffb703',
  spikeHot: '#fb8500',
  excitatory: '#0077b6',
  inhibitory: '#d62828',
  ltp: '#0077b6',
  ltd: '#d62828',
  ink: '#e2e8f0',
  inkDim: '#94a3b8',
  inkFaint: '#64748b',
};

const TEST_METADATA: PaletteMetadata = {
  label: 'Test',
  source: 'Test palette',
  diverging: true,
};

describe('semantic palettes', () => {
  it('default crameri palette is registered and retrievable', () => {
    expect(isRegisteredPalette('crameri')).toBe(true);
    const pal = getPalette('crameri');
    expect(pal).toBe(CORTEXEL_PALETTE);
    expect(pal.excitatory).not.toBe(pal.inhibitory);
  });

  it('getPalette falls back to default for unknown name', () => {
    const pal = getPalette('nonexistent');
    expect(pal).toBe(CORTEXEL_PALETTE);
  });

  it('getPaletteEntry returns undefined for unregistered name', () => {
    expect(getPaletteEntry('nonexistent')).toBeUndefined();
  });

  it('getPaletteEntry returns entry for registered name', () => {
    const entry = getPaletteEntry('crameri');
    expect(entry).toBeDefined();
    expect(entry?.metadata.label).toBe('Crameri');
    expect(entry?.metadata.diverging).toBe(true);
  });

  it('never exposes a mutable internal colormap endpoint tuple', () => {
    const endpoint = sampleColormap('batlow', 1) as unknown as number[];
    const expected = [...endpoint];
    endpoint[0] = 0;
    expect(sampleColormap('batlow', 1)).toEqual(expected);
  });

  it('keeps CPU and GLSL Turbo output explicitly in gamut', () => {
    expect(TURBO_GLSL).toContain('return clamp(vec3(');
    expect(TURBO_GLSL).toContain('), 0.0, 1.0);');
    for (let index = 0; index <= 1_000; index++) {
      for (const channel of sampleColormap('turbo', index / 1_000)) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it('registerPalette adds a new palette to the registry', () => {
    registerPalette('test-custom', TEST_PALETTE, TEST_METADATA);
    expect(isRegisteredPalette('test-custom')).toBe(true);
    expect(getPalette('test-custom')).toEqual(TEST_PALETTE);
    const entry = getPaletteEntry('test-custom');
    expect(entry?.metadata.label).toBe('Test');
  });

  it('defensively clones and freezes registered colors + metadata', () => {
    const palette = { ...TEST_PALETTE };
    const metadata = { ...TEST_METADATA };
    registerPalette('test-immutable', palette, metadata);
    palette.cyan = '#ffffff';
    metadata.label = 'mutated';
    expect(getPalette('test-immutable').cyan).toBe(TEST_PALETTE.cyan);
    expect(getPaletteEntry('test-immutable')?.metadata.label).toBe('Test');
    expect(Object.isFrozen(getPalette('test-immutable'))).toBe(true);
  });

  it('rejects descriptor tricks instead of storing a different palette than it validated', () => {
    const hidden = { ...TEST_PALETTE };
    Object.defineProperty(hidden, 'ink', {
      value: '#ffffff',
      enumerable: false,
    });
    expect(() => registerPalette('hidden-field', hidden, TEST_METADATA)).toThrow(
      /enumerable data property/,
    );

    const changing = { ...TEST_PALETTE } as Record<string, unknown>;
    Object.defineProperty(changing, 'ink', {
      enumerable: true,
      get: () => '#ffffff',
    });
    expect(() => registerPalette(
      'accessor-field',
      changing as unknown as SemanticPalette,
      TEST_METADATA,
    )).toThrow(/enumerable data property/);
    expect(getPaletteEntry('hidden-field')).toBeUndefined();
    expect(getPaletteEntry('accessor-field')).toBeUndefined();
  });

  it('registerPalette overwrites existing name (hot-reload)', () => {
    registerPalette('test-overwrite', TEST_PALETTE, TEST_METADATA);
    const modified = { ...TEST_PALETTE, excitatory: '#aaaaaa' };
    registerPalette('test-overwrite', modified, TEST_METADATA);
    expect(getPalette('test-overwrite').excitatory).toBe('#aaaaaa');
  });

  it('listPalettes includes registered palettes', () => {
    registerPalette('test-list', TEST_PALETTE, TEST_METADATA);
    const names = listPalettes().map((p) => p.name);
    expect(names).toContain('crameri');
    expect(names).toContain('test-list');
  });

  it('listPalettes returns metadata for each palette', () => {
    const crameri = listPalettes().find((p) => p.name === 'crameri');
    expect(crameri?.metadata.label).toBe('Crameri');
    expect(crameri?.metadata.source).toContain('Crameri');
    expect(crameri?.metadata.diverging).toBe(true);
  });
});

describe('validatePalette', () => {
  it('accepts a valid palette', () => {
    expect(() => validatePalette(TEST_PALETTE)).not.toThrow();
  });

  it('rejects invalid hex format', () => {
    const bad = { ...TEST_PALETTE, cyan: 'not-a-hex' };
    expect(() => validatePalette(bad)).toThrow(/not a valid #rrggbb hex/);
  });

  it('rejects short hex', () => {
    const bad = { ...TEST_PALETTE, cyan: '#fff' };
    expect(() => validatePalette(bad)).toThrow(/not a valid #rrggbb hex/);
  });

  it('rejects identical E/I colors', () => {
    const bad = { ...TEST_PALETTE, excitatory: '#123456', inhibitory: '#123456' };
    expect(() => validatePalette(bad)).toThrow(/excitatory and inhibitory/);
  });

  it('rejects identical LTP/LTD colors', () => {
    const bad = { ...TEST_PALETTE, ltp: '#123456', ltd: '#123456' };
    expect(() => validatePalette(bad)).toThrow(/ltp and ltd/);
  });

  it('registerPalette throws on invalid palette', () => {
    const bad = { ...TEST_PALETTE, cyan: 'xyz' };
    expect(() => registerPalette('test-bad', bad, TEST_METADATA)).toThrow();
  });

  it('rejects missing/extra palette keys with a precise error', () => {
    const { cyan: _cyan, ...missing } = TEST_PALETTE;
    expect(() => validatePalette(missing as SemanticPalette)).toThrow(/missing colors: cyan/);
    expect(() =>
      validatePalette({ ...TEST_PALETTE, surprise: '#ffffff' } as SemanticPalette),
    ).toThrow(/unknown colors: surprise/);
  });

  it('rejects invalid names and metadata before registration', () => {
    expect(() => registerPalette('   ', TEST_PALETTE, TEST_METADATA)).toThrow(/name/);
    expect(() =>
      registerPalette('bad-metadata', TEST_PALETTE, {
        ...TEST_METADATA,
        label: ' ',
      }),
    ).toThrow(/metadata/);
  });
});

describe('colormap runtime arguments', () => {
  it('rejects non-finite samples and unknown runtime names', () => {
    expect(() => sampleColormap('batlow', NaN)).toThrow(/finite/);
    expect(() => sampleColormap('unknown' as never, 0.5)).toThrow(/unknown colormap/);
    expect(() => colormapRgba('batlow', 0.5, 2)).toThrow(/alpha/);
  });

  it('requires bounded stop counts and finite categorical indices', () => {
    expect(() => colormapGradient('batlow', 90, 1)).toThrow(/stops/);
    expect(() => colormapSvgStops('batlow', 1)).toThrow(/stops/);
    expect(() => categorical(NaN)).toThrow(/finite/);
  });
});

describe('VizSpec palette field', () => {
  it('accepts a valid palette name in VizSpec', () => {
    const r = validateVizSpec({
      scene: 'spike-raster',
      params: {},
      provenance: { source: 'test' },
      palette: 'crameri',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.palette).toBe('crameri');
  });

  it('accepts VizSpec without palette (optional)', () => {
    const r = validateVizSpec({
      scene: 'spike-raster',
      params: {},
      provenance: { source: 'test' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.palette).toBeUndefined();
  });

  it('accepts arbitrary palette string at envelope level (registration checked at skill gate)', () => {
    const r = validateVizSpec({
      scene: 'spike-raster',
      params: {},
      provenance: { source: 'test' },
      palette: 'some-host-palette',
    });
    // validateVizSpec is the lenient envelope — it accepts any string.
    // validateSkillInvocation is the strict gate that checks registration.
    expect(r.ok).toBe(true);
  });
});

describe('validateSkillInvocation palette gate', () => {
  it('rejects unregistered palette name with unknown_palette error', () => {
    const r = validateSkillInvocation('nest.spike_raster', {
      scene: 'spike-raster',
      params: { times_ms: [1, 2], senders: [1, 2] },
      provenance: {
        source: 'test',
        declared_inputs: {
          recorder_id: 'rec1',
          sender_ids: '1,2',
          population_labels: 'E,I',
          time_units: 'ms',
        },
      },
      palette: 'nonexistent-palette',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const paletteError = r.errors.find((e) => e.code === 'unknown_palette');
      expect(paletteError).toBeDefined();
      expect(paletteError?.validPalettes).toBeDefined();
      expect(paletteError?.validPalettes).toContain('crameri');
    }
  });

  it('accepts a registered palette name', () => {
    registerPalette('test-skill-ok', TEST_PALETTE, TEST_METADATA);
    const r = validateSkillInvocation('nest.spike_raster', {
      scene: 'spike-raster',
      params: { times_ms: [1, 2], senders: [1, 2] },
      provenance: {
        source: 'test',
        declared_inputs: {
          recorder_id: 'rec1',
          sender_ids: '1,2',
          population_labels: 'E,I',
          time_units: 'ms',
        },
      },
      palette: 'test-skill-ok',
    });
    expect(r.ok).toBe(true);
  });

  it('accepts spec without palette (host active palette used)', () => {
    const r = validateSkillInvocation('nest.spike_raster', {
      scene: 'spike-raster',
      params: { times_ms: [1, 2], senders: [1, 2] },
      provenance: {
        source: 'test',
        declared_inputs: {
          recorder_id: 'rec1',
          sender_ids: '1,2',
          population_labels: 'E,I',
          time_units: 'ms',
        },
      },
    });
    expect(r.ok).toBe(true);
  });
});
