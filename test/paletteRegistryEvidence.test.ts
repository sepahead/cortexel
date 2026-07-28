import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const registry = JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '../contract/registries/palettes.v1.json'),
  'utf8',
)) as {
  description: string;
  categoricalSeries: {
    source: string;
    note: string;
    styles: Array<{ dash: string; marker: string }>;
  };
  colormaps: Array<{ properties: string[] }>;
  contrastTargets: {
    testedAgainst: string;
    scope: string;
  };
};

describe('palette evidence captions remain narrower than their tests', () => {
  it('retains a unique dash-and-marker tuple when colour is removed', () => {
    const nonColourTuples = registry.categoricalSeries.styles.map(
      ({ dash, marker }) => `${dash}\u0000${marker}`,
    );
    expect(new Set(nonColourTuples).size).toBe(nonColourTuples.length);
  });

  it('does not convert structural token tests into perceptual-conformance claims', () => {
    const evidenceCaption = [
      registry.description,
      registry.categoricalSeries.source,
      registry.categoricalSeries.note,
      ...registry.colormaps.flatMap(({ properties }) => properties),
      registry.contrastTargets.testedAgainst,
      registry.contrastTargets.scope,
    ].join(' ').toLowerCase();

    expect(evidenceCaption).toContain('not evidence');
    expect(evidenceCaption).toContain('not whole-figure wcag conformance evidence');
    expect(evidenceCaption).toContain('source-described');
    expect(evidenceCaption).toContain('not independently');
    expect(evidenceCaption).not.toMatch(/\bsurvives? (?:a )?greyscale/u);
  });

  it('keeps stable skill prose narrower than structural non-colour evidence', () => {
    const skillRoot = path.resolve(import.meta.dirname, '../contract/skills');
    const prose = readdirSync(skillRoot)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => readFileSync(path.join(skillRoot, name), 'utf8'))
      .join('\n')
      .toLowerCase();

    expect(prose).not.toMatch(/\b(?:cvd|colou?r-vision-deficiency)-safe\b/u);
    expect(prose).not.toMatch(/\bsurvives? (?:a )?gr[ae]yscale\b/u);
    expect(prose).toContain('structural evidence');
    expect(prose).toContain('does not establish perceptual or accessibility conformance');
  });
});
