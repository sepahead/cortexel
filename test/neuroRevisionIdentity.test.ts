import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DISTRIBUTION_AUTHORITY_EVALUATORS } from '../src/authority/evaluators/distributions.js';
import { TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS } from '../src/authority/evaluators/topology-dynamics.js';
import { TRACE_AUTHORITY_EVALUATORS } from '../src/authority/evaluators/traces.js';
import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/index.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const NEURO_SKILLS = [
  ['neuro.analog_trace', 'figure.analog_trace'],
  ['neuro.compartment_trace', 'figure.compartment_trace'],
  ['neuro.correlogram', 'figure.correlogram'],
  ['neuro.isi_distribution', 'figure.distribution'],
  ['neuro.multisignal_trace', 'figure.multisignal_trace'],
  ['neuro.phase_plane', 'figure.phase_plane'],
  ['neuro.population_rate', 'figure.population_rate'],
  ['neuro.psth', 'figure.psth'],
  ['neuro.response_curve', 'figure.response_curve'],
  ['neuro.spike_raster', 'figure.spike_raster'],
] as const;

function skillSource(skillId: string): JsonRecord {
  return JSON.parse(readFileSync(
    path.join(ROOT, `contract/skills/${skillId}.v1.json`),
    'utf8',
  ));
}

function rendererRegistry(): JsonRecord[] {
  const source = JSON.parse(readFileSync(
    path.join(ROOT, 'contract/registries/renderers.v1.json'),
    'utf8',
  )) as { renderers: JsonRecord[] };
  return source.renderers;
}

const evaluatorIds = new Set([
  ...TRACE_AUTHORITY_EVALUATORS,
  ...DISTRIBUTION_AUTHORITY_EVALUATORS,
  ...TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS,
].map((evaluator) => evaluator.id));

describe('stable neuro revision-2 identity alignment', () => {
  it('keeps source, OutputAuthority evaluator, and renderer identities coordinated', () => {
    const renderers = rendererRegistry();

    for (const [skillId, rendererId] of NEURO_SKILLS) {
      const source = skillSource(skillId);
      expect(source.revision, skillId).toBe(2);
      expect(source.renderer, skillId).toEqual({ id: rendererId, revision: 2 });
      expect(source.outputAuthority.evaluator.id, skillId).toBe(
        `${skillId}.output_authority.v2`,
      );
      expect(evaluatorIds.has(source.outputAuthority.evaluator.id), skillId).toBe(true);

      const matchingRenderers = renderers.filter((renderer) => renderer.id === rendererId);
      expect(matchingRenderers, rendererId).toHaveLength(1);
      expect(matchingRenderers[0].revision, rendererId).toBe(2);
    }

    const phasePlane = renderers.find((renderer) => renderer.id === 'figure.phase_plane');
    expect(phasePlane?.marks).toContain('arrow');
  });

  it('accepts current pins, emits renderer revision 2, and refuses every prior pin', () => {
    for (const [skillId, rendererId] of NEURO_SKILLS) {
      const source = skillSource(skillId);

      const current = structuredClone(source.examples.valid[0]);
      current.skill.revision = 2;
      const checked = validateRequestValue(current);
      expect(checked.ok, skillId).toBe(true);
      if (checked.ok) expect(checked.request.skillRevision, skillId).toBe(2);

      const figure = buildFigure(current);
      expect(figure.ok, figure.ok ? skillId : JSON.stringify(figure.errors)).toBe(true);
      if (figure.ok) {
        const render = figure.artifact.render as {
          readonly rendererId: string;
          readonly rendererRevision: number;
        };
        expect(render.rendererId, skillId).toBe(rendererId);
        expect(render.rendererRevision, skillId).toBe(2);
      }

      const prior = structuredClone(source.examples.valid[0]);
      prior.skill.revision = 1;
      const refused = validateRequestValue(prior);
      expect(refused.ok, skillId).toBe(false);
      if (!refused.ok) {
        expect(refused.errors, skillId).toContainEqual(expect.objectContaining({
          code: 'CONTRACT_SKILL_REVISION_UNSUPPORTED',
          stage: 'identity',
          instancePath: '/skill/revision',
        }));
      }
    }
  });
});
