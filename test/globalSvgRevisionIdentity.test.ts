import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const SKILL_ROOT = path.join(ROOT, 'contract/skills');

function stableSkills(): JsonRecord[] {
  return readdirSync(SKILL_ROOT)
    .filter((name) => name.endsWith('.v1.json'))
    .map((name) => JSON.parse(readFileSync(path.join(SKILL_ROOT, name), 'utf8')) as JsonRecord)
    .filter((skill) => skill.status === 'stable');
}

function stableRenderers(): JsonRecord[] {
  const registry = JSON.parse(readFileSync(
    path.join(ROOT, 'contract/registries/renderers.v1.json'),
    'utf8',
  )) as { renderers: JsonRecord[] };
  return registry.renderers.filter((renderer) => renderer.status === 'stable');
}

describe('global stable SVG output identity', () => {
  it('moves every stable SVG renderer while preserving independent scientific revisions', () => {
    const skills = stableSkills();
    const renderers = stableRenderers();
    const rendererById = new Map(renderers.map((renderer) => [renderer.id, renderer]));

    expect(skills).toHaveLength(19);
    expect(renderers).toHaveLength(14);
    expect(skills.filter((skill) => skill.id !== 'neuro.correlogram')).toHaveLength(18);
    expect(renderers.filter((renderer) => renderer.id !== 'figure.correlogram')).toHaveLength(13);

    for (const skill of skills) {
      const expectedSkillRevision = (
        skill.id === 'network.delay_distribution' ||
        skill.id === 'network.delay_matrix' ||
        skill.id === 'neuro.phase_plane' ||
        skill.id === 'neuro.spike_raster'
      ) ? 5 : 4;
      const expectedRendererRevision = (
        skill.id === 'neuro.phase_plane' ||
        skill.id === 'neuro.spike_raster'
      ) ? 6 : 5;
      expect(skill.revision, skill.id).toBe(expectedSkillRevision);
      expect(skill.renderer?.revision, skill.id).toBe(expectedRendererRevision);
      expect(rendererById.get(skill.renderer?.id)?.revision, skill.renderer?.id)
        .toBe(expectedRendererRevision);

      expect(skill.outputAuthority?.evaluator?.id, skill.id).toBe(
        `${skill.id}.output_authority.v${expectedSkillRevision}`,
      );
    }

    for (const renderer of renderers) {
      expect(renderer.revision, renderer.id)
        .toBe(
          renderer.id === 'figure.phase_plane' ||
          renderer.id === 'figure.spike_raster'
            ? 6
            : 5,
        );
    }
  });
});
