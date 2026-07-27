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
  ['neuro.analog_trace', 'figure.analog_trace', 4],
  ['neuro.compartment_trace', 'figure.compartment_trace', 4],
  ['neuro.correlogram', 'figure.correlogram', 4],
  ['neuro.isi_distribution', 'figure.distribution', 4],
  ['neuro.multisignal_trace', 'figure.multisignal_trace', 4],
  ['neuro.phase_plane', 'figure.phase_plane', 5],
  ['neuro.population_rate', 'figure.population_rate', 4],
  ['neuro.psth', 'figure.psth', 4],
  ['neuro.response_curve', 'figure.response_curve', 4],
  ['neuro.spike_raster', 'figure.spike_raster', 4],
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

    for (const [skillId, rendererId, revision] of NEURO_SKILLS) {
      const source = skillSource(skillId);
      expect(source.revision, skillId).toBe(revision);
      expect(source.renderer, skillId).toEqual({ id: rendererId, revision });
      expect(source.outputAuthority.evaluator.id, skillId).toBe(
        `${skillId}.output_authority.v${revision}`,
      );
      expect(evaluatorIds.has(source.outputAuthority.evaluator.id), skillId).toBe(true);

      const matchingRenderers = renderers.filter((renderer) => renderer.id === rendererId);
      expect(matchingRenderers, rendererId).toHaveLength(1);
      expect(matchingRenderers[0].revision, rendererId).toBe(revision);
    }

    const phasePlane = renderers.find((renderer) => renderer.id === 'figure.phase_plane');
    expect(phasePlane?.marks).toContain('arrow');
  });

  it('accepts current pins, emits their renderer revision, and refuses the immediately prior pin', () => {
    for (const [skillId, rendererId, revision] of NEURO_SKILLS) {
      const source = skillSource(skillId);

      const current = structuredClone(source.examples.valid[0]);
      current.skill.revision = revision;
      const checked = validateRequestValue(current);
      expect(checked.ok, skillId).toBe(true);
      if (checked.ok) expect(checked.request.skillRevision, skillId).toBe(revision);

      const figure = buildFigure(current);
      expect(figure.ok, figure.ok ? skillId : JSON.stringify(figure.errors)).toBe(true);
      if (figure.ok) {
        const render = figure.artifact.render as {
          readonly rendererId: string;
          readonly rendererRevision: number;
        };
        expect(render.rendererId, skillId).toBe(rendererId);
        expect(render.rendererRevision, skillId).toBe(revision);
      }

      const prior = structuredClone(source.examples.valid[0]);
      prior.skill.revision = revision - 1;
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
