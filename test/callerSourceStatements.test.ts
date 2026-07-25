import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';
import {
  FIRST_STRONG_ISOLATE,
  POP_DIRECTIONAL_ISOLATE,
} from '../src/core/source-statements.js';
import { buildFigure } from '../src/render/index.js';
import { checkOutputAuthorityEmissionV1 } from '../src/render/output-authority-gate.js';
import { closePlainRenderPlanForAuthorityV1 } from '../src/render/plan-closure.js';
import { countPlanResources } from '../src/render/svg.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');

function source(skillId: string): JsonRecord {
  return JSON.parse(readFileSync(
    path.join(ROOT, `contract/skills/${skillId}.v1.json`),
    'utf8',
  ));
}

function example(skillId: string): JsonRecord {
  return structuredClone(source(skillId).examples.valid[0]);
}

function built(request: JsonRecord) {
  const result = buildFigure(request);
  expect(result.ok, result.ok ? '' : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

function stableSkillIds(): string[] {
  return readdirSync(path.join(ROOT, 'contract/skills'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(path.join(ROOT, 'contract/skills', name), 'utf8')))
    .filter((skill) => skill.status === 'stable')
    .map((skill) => skill.id);
}

describe('caller-declared source-statement presentation', () => {
  it('presents limitations then note after mandatory disclosures on every output surface', () => {
    const request = example('neuro.isi_distribution');
    request.source.declaredLimitations = [
      'Recorder resolution was 0.1 ms.',
      'الخلايا الصامتة were retained in the declared universe.',
    ];
    request.source.declaredNote = 'Digitized independently by the caller.';
    request.presentation = { ...(request.presentation ?? {}), height: 1000 };

    const first = built(request);
    const second = built(request);
    expect(second.svg).toBe(first.svg);
    expect(second.artifact).toEqual(first.artifact);

    expect(first.plan.sourceStatements.map((statement) => statement.kind)).toEqual([
      'declared_limitation',
      'declared_limitation',
      'declared_note',
    ]);
    expect(first.plan.sourceStatements.every((statement) =>
      statement.attribution === 'declared_by_caller_not_verified' &&
      statement.bidiIsolation === 'unicode_fsi_pdi')).toBe(true);
    expect(first.plan.sourceStatements[0].text).toBe(
      `Source limitation (declared by caller; not verified): ${FIRST_STRONG_ISOLATE}Recorder resolution was 0.1 ms.${POP_DIRECTIONAL_ISOLATE}`,
    );
    expect(first.plan.sourceStatements[2].text).toBe(
      `Source note (declared by caller; not verified): ${FIRST_STRONG_ISOLATE}Digitized independently by the caller.${POP_DIRECTIONAL_ISOLATE}`,
    );

    expect(first.table.metadata?.sourceStatements).toEqual(first.plan.sourceStatements);
    expect((first.artifact.accessibility as JsonRecord).summary)
      .toBe(first.plan.accessibility.summary);
    expect(first.plan.accessibility.summary.lastIndexOf(first.disclosures.at(-1)!.text))
      .toBeLessThan(first.plan.accessibility.summary.indexOf(first.plan.sourceStatements[0].text));
    expect(first.svg.indexOf('data-source-statements="true"'))
      .toBeGreaterThan(first.svg.indexOf('data-disclosures="true"'));
    for (const statement of first.plan.sourceStatements) {
      expect(first.plan.accessibility.summary).toContain(statement.text);
      expect(first.svg).toContain(statement.text);
    }
    expect(first.svg).toContain('unicode-bidi="plaintext"');

    const artifactDisclosures = first.artifact.disclosures as JsonRecord[];
    expect(artifactDisclosures.map((disclosure) => disclosure.id))
      .toContain('CALLER_NOTE_UNVERIFIED');
    expect(artifactDisclosures.find((disclosure) =>
      disclosure.id === 'CALLER_NOTE_UNVERIFIED')?.text)
      .toBe('The figure carries a note declared by the caller. Cortexel has not verified it.');
    for (const exactCallerText of [
      'Recorder resolution was 0.1 ms.',
      'الخلايا الصامتة were retained in the declared universe.',
      'Digitized independently by the caller.',
    ]) {
      expect(artifactDisclosures.some((disclosure) =>
        disclosure.text.includes(exactCallerText))).toBe(false);
    }
    expect((first.svg.match(/<text\b/gu) ?? []).length)
      .toBe(countPlanResources(first.plan).textCount);
  });

  it('threads accepted notes and limitations through every stable skill compiler', () => {
    const ids = stableSkillIds();
    expect(ids).toHaveLength(19);
    for (const skillId of ids) {
      const request = example(skillId);
      request.source = {
        ...request.source,
        declaredLimitations: [`${skillId} caller limitation`],
        declaredNote: `${skillId} caller note`,
      };
      request.presentation = { ...(request.presentation ?? {}), height: 1400 };
      const result = built(request);
      expect(result.plan.sourceStatements, skillId).toHaveLength(2);
      expect(result.table.metadata?.sourceStatements, skillId)
        .toEqual(result.plan.sourceStatements);
      expect(result.svg, skillId).toContain('data-source-statement-kind="declared_limitation"');
      expect(result.svg, skillId).toContain('data-source-statement-kind="declared_note"');
    }
  });

  it('the request-bound authority gate detects plan and table-metadata mutations', () => {
    const request = example('neuro.population_rate');
    request.source.declaredLimitations = ['Known caller limitation.'];
    request.source.declaredNote = 'Known caller note.';
    request.presentation = { ...(request.presentation ?? {}), height: 900 };
    const validated = validateRequestValue(request);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const result = built(request);

    const mutations: Array<(plan: JsonRecord) => void> = [
      (plan) => { plan.sourceStatements.reverse(); },
      (plan) => { plan.sourceStatements[0].text = 'caller-authored attribution'; },
      (plan) => { plan.table.metadata.sourceStatements = []; },
    ];
    for (const mutate of mutations) {
      const candidate = structuredClone(result.plan) as unknown as JsonRecord;
      mutate(candidate);
      const closed = closePlainRenderPlanForAuthorityV1(candidate as never);
      expect(closed.tag).toBe('closed');
      if (closed.tag !== 'closed') continue;
      const gate = checkOutputAuthorityEmissionV1(validated.request, closed.plan);
      expect(gate.tag).toBe('refused');
      if (gate.tag === 'refused') {
        expect(gate.messages.join('\n')).toContain('source statements');
      }
    }
  });

  it('reserves caller-statement footer space and refuses instead of overlapping the plot', () => {
    const request = example('neuro.population_rate');
    request.source.declaredLimitations = Array.from(
      { length: 6 },
      (_value, index) => `${index}: ${'bounded caller limitation '.repeat(7)}`,
    );
    request.source.declaredNote = 'A final caller note.';
    request.presentation = { ...(request.presentation ?? {}), width: 160, height: 440 };
    const refused = buildFigure(request);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.errors).toContainEqual(expect.objectContaining({
        code: 'RENDER_LAYOUT_UNAVAILABLE',
        instancePath: '/presentation',
      }));
    }

    request.presentation.height = 4096;
    const accepted = built(request);
    expect((accepted.svg.match(/data-source-statement-text=/gu) ?? []).length)
      .toBe(accepted.plan.sourceStatements.length);
    expect(accepted.plan.panels.every((panel) => panel.height >= 48)).toBe(true);
  });
});
