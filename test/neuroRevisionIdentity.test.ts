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
  ['neuro.analog_trace', 5, 'figure.analog_trace', 6],
  ['neuro.compartment_trace', 5, 'figure.compartment_trace', 6],
  ['neuro.correlogram', 5, 'figure.correlogram', 6],
  ['neuro.isi_distribution', 5, 'figure.distribution', 6],
  ['neuro.multisignal_trace', 5, 'figure.multisignal_trace', 6],
  ['neuro.phase_plane', 6, 'figure.phase_plane', 7],
  ['neuro.population_rate', 5, 'figure.population_rate', 6],
  ['neuro.psth', 5, 'figure.psth', 6],
  ['neuro.response_curve', 5, 'figure.response_curve', 6],
  ['neuro.spike_raster', 7, 'figure.spike_raster', 8],
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

describe('stable neuro revision identity alignment', () => {
  it('keeps source, OutputAuthority evaluator, and renderer identities coordinated', () => {
    const renderers = rendererRegistry();

    for (const [skillId, skillRevision, rendererId, rendererRevision] of NEURO_SKILLS) {
      const source = skillSource(skillId);
      expect(source.revision, skillId).toBe(skillRevision);
      expect(source.renderer, skillId).toEqual({ id: rendererId, revision: rendererRevision });
      expect(source.outputAuthority.evaluator.id, skillId).toBe(
        `${skillId}.output_authority.v${skillRevision}`,
      );
      expect(evaluatorIds.has(source.outputAuthority.evaluator.id), skillId).toBe(true);

      const matchingRenderers = renderers.filter((renderer) => renderer.id === rendererId);
      expect(matchingRenderers, rendererId).toHaveLength(1);
      expect(matchingRenderers[0].revision, rendererId).toBe(rendererRevision);
    }

    const phasePlane = renderers.find((renderer) => renderer.id === 'figure.phase_plane');
    expect(phasePlane?.marks).toContain('arrow');
  });

  it('accepts current pins, emits their renderer revision, and refuses the immediately prior pin', () => {
    for (const [skillId, skillRevision, rendererId, rendererRevision] of NEURO_SKILLS) {
      const source = skillSource(skillId);

      const current = structuredClone(source.examples.valid[0]);
      current.skill.revision = skillRevision;
      const checked = validateRequestValue(current);
      expect(checked.ok, skillId).toBe(true);
      if (checked.ok) expect(checked.request.skillRevision, skillId).toBe(skillRevision);

      const figure = buildFigure(current);
      expect(figure.ok, figure.ok ? skillId : JSON.stringify(figure.errors)).toBe(true);
      if (figure.ok) {
        const render = figure.artifact.render as {
          readonly rendererId: string;
          readonly rendererRevision: number;
        };
        expect(render.rendererId, skillId).toBe(rendererId);
        expect(render.rendererRevision, skillId).toBe(rendererRevision);
      }

      const prior = structuredClone(source.examples.valid[0]);
      prior.skill.revision = skillRevision - 1;
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
