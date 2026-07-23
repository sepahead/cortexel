import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { TRACE_AUTHORITY_EVALUATORS } from '../src/authority/evaluators/traces.js';
import { deriveDisclosures } from '../src/core/disclosures.js';
import {
  checkFiniteInfluenceWitnessesV1,
  interpretOutputAuthorityModelV1,
  type AuthorityEvaluationV1,
  type AuthorityObservedGeometryNodeV1,
  type AuthorityObservedOutputV1,
  type OutputAuthorityV1,
} from '../src/core/output-authority.js';
import type { JsonValue } from '../src/core/parse-json.js';
import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/index.js';
import { extractObservedOutputAuthorityV1 } from '../src/render/output-authority-extract.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const TRACE_SKILLS = [
  'neuro.analog_trace',
  'neuro.compartment_trace',
  'neuro.multisignal_trace',
  'network.synaptic_weight_trace',
] as const;

function source(skillId: string): JsonRecord {
  return JSON.parse(readFileSync(
    path.join(ROOT, `contract/skills/${skillId}.v1.json`),
    'utf8',
  ));
}

function evaluator(skillId: string) {
  const contract = source(skillId);
  const found = TRACE_AUTHORITY_EVALUATORS.find(
    (candidate) => candidate.id === contract.outputAuthority.evaluator.id,
  );
  if (!found) throw new Error(`missing trace authority evaluator ${skillId}`);
  return found;
}

function renderExpectedSummary(
  template: string,
  evaluation: AuthorityEvaluationV1,
  disclosures: readonly { readonly text: string }[],
): string {
  const value = evaluation.fields['summary.facts'];
  if (value?.tag !== 'summary_fact_map') throw new Error('missing summary fact map');
  const body = template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/gu, (_whole, key: string) => {
    const replacement = value.facts[key];
    if (typeof replacement !== 'string') throw new Error(`missing string summary fact ${key}`);
    return replacement;
  });
  if (disclosures.length === 0) return body;
  const count = disclosures.length;
  return `${body} ${count} ${count === 1 ? 'disclosure applies' : 'disclosures apply'}: ${disclosures
    .map((disclosure) => disclosure.text)
    .join(' ')}`;
}

function expectedDisclosureSet(contract: JsonRecord, evaluation: AuthorityEvaluationV1) {
  const value = evaluation.fields['disclosure.facts'];
  if (value?.tag !== 'disclosure_fact_map') throw new Error('missing disclosure fact map');
  return deriveDisclosures(value.facts, contract.disclosures);
}

function checkedModel(skillId: string, exampleIndex = 0): {
  readonly contract: JsonRecord;
  readonly authority: OutputAuthorityV1;
  readonly evaluation: AuthorityEvaluationV1;
  readonly observed: AuthorityObservedOutputV1;
  readonly digest: string;
} {
  const contract = source(skillId);
  const request = structuredClone(contract.examples.valid[exampleIndex]);
  const validated = validateRequestValue(request);
  expect(validated.ok).toBe(true);
  if (!validated.ok) throw new Error(JSON.stringify(validated.errors));
  const result = buildFigure(request);
  if (!result.ok) {
    throw new Error(`${skillId} example ${exampleIndex}: ${JSON.stringify(result.errors)}`);
  }
  const extracted = extractObservedOutputAuthorityV1(result.plan);
  expect(extracted.tag).toBe('extracted');
  if (extracted.tag !== 'extracted') throw new Error(JSON.stringify(extracted.problems));
  const evaluation = evaluator(skillId).evaluateCanonicalRequest(
    validated.request.canonicalRequest as JsonValue,
  );
  const disclosures = expectedDisclosureSet(contract, evaluation);
  return {
    contract,
    authority: contract.outputAuthority,
    evaluation,
    digest: validated.request.requestDigest,
    observed: {
      ...extracted.observed,
      disclosures,
      summary: renderExpectedSummary(contract.accessibility.summaryTemplate, evaluation, disclosures),
    },
  };
}

function interpret(model: ReturnType<typeof checkedModel>, observed = model.observed) {
  return interpretOutputAuthorityModelV1(
    model.authority,
    model.contract.accessibility.summaryTemplate,
    model.contract.accessibility.tableColumns,
    expectedDisclosureSet(model.contract, model.evaluation),
    model.digest,
    model.evaluation,
    observed,
  );
}

function dataGeometry(
  roots: readonly AuthorityObservedGeometryNodeV1[],
): AuthorityObservedGeometryNodeV1[] {
  const result: AuthorityObservedGeometryNodeV1[] = [];
  const stack = [...roots].reverse();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.tag === 'group') {
      for (let index = node.children.length - 1; index >= 0; index--) stack.push(node.children[index]);
    } else if (node.tag === 'data_mark') {
      result.push(structuredClone(node));
    }
  }
  return result;
}

function weightPlanWithMultipleRenderRuns(): JsonRecord {
  const contract = source('network.synaptic_weight_trace');
  const request = structuredClone(contract.examples.valid[1]);
  request.data.observation = { kind: 'point_sample' };
  request.data.series = request.data.series.slice(0, 2);
  request.data.membership.members = request.data.membership.members.slice(0, 2);
  request.data.membership.members[0].intervals = [{ start: 0, stop: 500 }];
  request.data.membership.members[1].intervals = [{ start: 0, stop: 1_000 }];
  for (let index = 0; index < request.data.series.length; index++) {
    request.data.series[index].time.values = [0, 400, 600, 800];
    request.data.series[index].values.values = [1 + index, 2 + index, 3 + index, 4 + index];
    delete request.data.series[index].eventKinds;
  }
  request.parameters.display = 'aggregate_derived';
  request.parameters.aggregate = {
    method: 'mean',
    evaluation: { mode: 'shared_sample_grid' },
    dispersion: { kind: 'none', reason: 'not_computed' },
  };
  const result = buildFigure(request);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return structuredClone(result.plan) as JsonRecord;
}

function renderRunLineOrPathMarks(plan: JsonRecord): JsonRecord[] {
  const result: JsonRecord[] = [];
  const pending = plan.panels.flatMap((panel: JsonRecord) => panel.marks);
  while (pending.length > 0) {
    const mark = pending.pop() as JsonRecord;
    if (mark.type === 'group') pending.push(...mark.marks);
    if (
      (mark.type === 'line' || mark.type === 'path') &&
      mark.subpaths.some((subpath: JsonRecord[]) => subpath.some((point) =>
        point.authority?.tag === 'data_carrier' &&
        point.authority.provenance?.renderRunOrdinal !== undefined))
    ) {
      result.push(mark);
    }
  }
  return result;
}

function taggedRenderRunSubpath(mark: JsonRecord): JsonRecord[] {
  const found = mark.subpaths.find((subpath: JsonRecord[]) =>
    subpath.length >= 2 &&
    subpath.every((point) =>
      point.authority?.tag === 'data_carrier' &&
      point.authority.provenance?.renderRunOrdinal !== undefined));
  if (!found) throw new Error('expected a render-run subpath with at least two tagged carriers');
  return found;
}

describe('independent trace OutputAuthority evaluators', () => {
  it('reconstructs every living trace table and carrier-only primitive sequence exactly', () => {
    for (const skillId of TRACE_SKILLS) {
      const contract = source(skillId);
      for (let exampleIndex = 0; exampleIndex < contract.examples.valid.length; exampleIndex++) {
        const model = checkedModel(skillId, exampleIndex);
        const verification = interpret(model);
        expect(verification, `${skillId} example ${exampleIndex}`).toEqual({
          tag: 'valid',
          expectedRowsTotal: model.observed.table.rows.length,
        });
      }
    }
  });

  it('refuses omitted, reordered, and value-misbound table rows', () => {
    const model = checkedModel('neuro.analog_trace');
    const rows = model.observed.table.rows.map((row) => [...row]);

    const omitted = interpret(model, {
      ...model.observed,
      table: {
        ...model.observed.table,
        rows: rows.slice(1),
        rowsInline: rows.length - 1,
        rowsTotal: rows.length - 1,
      },
    });
    expect(omitted.tag).toBe('invalid');
    if (omitted.tag === 'invalid') {
      expect(omitted.violations.map((entry) => entry.code)).toContain('AUTHORITY_TABLE_ROWS_MISMATCH');
    }

    [rows[0], rows[1]] = [rows[1], rows[0]];
    const reordered = interpret(model, {
      ...model.observed,
      table: { ...model.observed.table, rows },
    });
    expect(reordered.tag).toBe('invalid');
    if (reordered.tag === 'invalid') {
      expect(reordered.violations.map((entry) => entry.code)).toContain('AUTHORITY_TABLE_ROWS_MISMATCH');
    }

    const misboundRows = model.observed.table.rows.map((row) => [...row]);
    misboundRows[0][7] = -999;
    const misbound = interpret(model, {
      ...model.observed,
      table: { ...model.observed.table, rows: misboundRows },
    });
    expect(misbound.tag).toBe('invalid');
    if (misbound.tag === 'invalid') {
      expect(misbound.violations.map((entry) => entry.code)).toContain('AUTHORITY_TABLE_ROWS_MISMATCH');
    }
  });

  it('refuses omitted, reordered, and provenance-misbound final-plan carriers', () => {
    const model = checkedModel('network.synaptic_weight_trace');
    const geometry = dataGeometry(model.observed.geometry);
    expect(geometry.length).toBeGreaterThan(3);

    const omitted = interpret(model, { ...model.observed, geometry: geometry.slice(1) });
    expect(omitted.tag).toBe('invalid');
    if (omitted.tag === 'invalid') {
      expect(omitted.violations.map((entry) => entry.code)).toContain('AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH');
    }

    [geometry[0], geometry[1]] = [geometry[1], geometry[0]];
    const reordered = interpret(model, { ...model.observed, geometry });
    expect(reordered.tag).toBe('invalid');
    if (reordered.tag === 'invalid') {
      expect(reordered.violations.map((entry) => entry.code)).toContain('AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH');
    }

    const misboundGeometry = dataGeometry(model.observed.geometry);
    const first = misboundGeometry[0];
    if (first.tag !== 'data_mark') throw new Error('expected data mark');
    const provenance = first.entry.provenance as JsonRecord;
    misboundGeometry[0] = {
      tag: 'data_mark',
      entry: { ...first.entry, provenance: { ...provenance, seriesId: 'wrong-series' } },
    };
    const misbound = interpret(model, { ...model.observed, geometry: misboundGeometry });
    expect(misbound.tag).toBe('invalid');
    if (misbound.tag === 'invalid') {
      expect(misbound.violations.map((entry) => entry.code)).toContain('AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH');
    }
  });

  it('binds declared render runs to RenderPlan line-subpath partitioning', () => {
    const plan = weightPlanWithMultipleRenderRuns();
    const targetLine = renderRunLineOrPathMarks(plan).find(
      (mark) => mark.type === 'line' && mark.subpaths.length >= 2,
    );
    expect(targetLine).toBeDefined();
    if (!targetLine) return;
    targetLine.subpaths = [
      [...targetLine.subpaths[0], ...targetLine.subpaths[1]],
      ...targetLine.subpaths.slice(2),
    ];
    const extracted = extractObservedOutputAuthorityV1(plan as never);
    expect(extracted.tag).toBe('invalid_plan_roles');
    if (extracted.tag === 'invalid_plan_roles') {
      expect(extracted.problems.some((problem) =>
        problem.message.includes('multiple declared render runs'))).toBe(true);
    }
  });

  it.each(['line', 'path'] as const)(
    'refuses one tagged render run split over multiple RenderPlan %s subpaths',
    (markType) => {
      const plan = weightPlanWithMultipleRenderRuns();
      const target = renderRunLineOrPathMarks(plan)[0];
      expect(target).toBeDefined();
      if (!target) return;
      target.type = markType;
      if (markType === 'path') delete target.dash;
      const subpath = taggedRenderRunSubpath(target);
      const subpathIndex = target.subpaths.indexOf(subpath);
      target.subpaths.splice(
        subpathIndex,
        1,
        subpath.slice(0, 1),
        subpath.slice(1),
      );

      const extracted = extractObservedOutputAuthorityV1(plan as never);
      expect(extracted.tag).toBe('invalid_plan_roles');
      if (extracted.tag === 'invalid_plan_roles') {
        expect(extracted.problems.some((problem) =>
          problem.message.includes('one declared render run is split across multiple') &&
          problem.message.includes('line/path subpaths'))).toBe(true);
      }
    },
  );

  it.each([
    ['negative', -1],
    ['fractional', 0.5],
    ['string-valued', '0'],
    ['unsafe-integer', Number.MAX_SAFE_INTEGER + 1],
  ])('refuses a %s renderRunOrdinal', (_caseName, invalidOrdinal) => {
    const plan = weightPlanWithMultipleRenderRuns();
    const target = renderRunLineOrPathMarks(plan)[0];
    expect(target).toBeDefined();
    if (!target) return;
    const subpath = taggedRenderRunSubpath(target);
    subpath[0].authority.provenance.renderRunOrdinal = invalidOrdinal;

    const extracted = extractObservedOutputAuthorityV1(plan as never);
    expect(extracted.tag).toBe('invalid_plan_roles');
    if (extracted.tag === 'invalid_plan_roles') {
      expect(extracted.problems.some((problem) =>
        problem.message.includes(
          'non-negative safe-integer renderRunOrdinal',
        ))).toBe(true);
    }
  });

  it('refuses a tagged RenderPlan subpath mixed with an untagged data carrier', () => {
    const plan = weightPlanWithMultipleRenderRuns();
    const target = renderRunLineOrPathMarks(plan)[0];
    expect(target).toBeDefined();
    if (!target) return;
    const subpath = taggedRenderRunSubpath(target);
    delete subpath[0].authority.provenance.renderRunOrdinal;

    const extracted = extractObservedOutputAuthorityV1(plan as never);
    expect(extracted.tag).toBe('invalid_plan_roles');
    if (extracted.tag === 'invalid_plan_roles') {
      expect(extracted.problems.some((problem) =>
        problem.message.includes(
          'mixes declared render-run carriers with data carriers lacking renderRunOrdinal',
        ))).toBe(true);
    }
  });

  it('continues to accept a legacy line whose data carriers are wholly render-run-untagged', () => {
    const plan = weightPlanWithMultipleRenderRuns();
    const target = renderRunLineOrPathMarks(plan)[0];
    expect(target).toBeDefined();
    if (!target) return;
    for (const subpath of target.subpaths as JsonRecord[][]) {
      for (const point of subpath) {
        if (point.authority?.tag === 'data_carrier') {
          delete point.authority.provenance.renderRunOrdinal;
        }
      }
    }

    expect(extractObservedOutputAuthorityV1(plan as never).tag).toBe('extracted');
  });

  it('binds nested uncertainty reasons and sampled-scope counts into exact disclosures', () => {
    const weightContract = source('network.synaptic_weight_trace');
    const sampledWeight = structuredClone(weightContract.examples.valid[0]);
    sampledWeight.data.scope = {
      kind: 'sampled',
      parentScope: 'single_process',
      method: 'declared_subset',
      sourceConnectionCount: 5,
      retainedConnectionCount: 2,
    };
    const sampledResult = buildFigure(sampledWeight);
    expect(sampledResult.ok).toBe(true);
    if (!sampledResult.ok) throw new Error(JSON.stringify(sampledResult.errors));
    expect(sampledResult.disclosures.find((entry) => entry.id === 'SAMPLED_EDGES')?.text).toBe(
      'Edges sampled: 2 of 5 connections are shown. Degree and completeness cannot be read from this figure.',
    );
    expect(sampledResult.disclosures.find(
      (entry) => entry.id === 'UNCERTAINTY_NOT_PROVIDED',
    )?.text).toBe(
      'No uncertainty is shown (single_trial). The absence of an uncertainty mark means uncertainty was not supplied — not that it is small.',
    );

    const compartmentContract = source('neuro.compartment_trace');
    const omittedUncertainty = structuredClone(compartmentContract.examples.valid[1]);
    const compartmentResult = buildFigure(omittedUncertainty);
    expect(compartmentResult.ok).toBe(true);
    if (!compartmentResult.ok) throw new Error(JSON.stringify(compartmentResult.errors));
    expect(compartmentResult.disclosures.find(
      (entry) => entry.id === 'UNCERTAINTY_NOT_PROVIDED',
    )?.text).toBe(
      'No uncertainty is shown (not_provided). The absence of an uncertainty mark means uncertainty was not supplied — not that it is small.',
    );
  });

  it('discloses honest incomplete descriptive coverage for a declared weight aggregate', () => {
    const contract = source('network.synaptic_weight_trace');
    const mixed = structuredClone(contract.examples.valid[2]);
    mixed.data.aggregate.contributingCounts = [0, 2, 1, 3];
    mixed.data.aggregate.uncertainty = {
      kind: 'standard_deviation',
      unit: mixed.data.aggregate.values.unit,
      values: [null, 0.1, null, 0.2],
      sampleCount: [null, 2, null, 3],
      basis: 'ensemble_members',
    };
    const validated = validateRequestValue(mixed);
    expect(validated.ok).toBe(true);
    if (!validated.ok) throw new Error(JSON.stringify(validated.errors));
    const evaluation = evaluator('network.synaptic_weight_trace').evaluateCanonicalRequest(
      validated.request.canonicalRequest as JsonValue,
    );
    const expectedText =
      'Complete drawable uncertainty is present for 0 of 1 displayed series; non-none uncertainty was declared for 1. A missing uncertainty mark or bound means drawable uncertainty was absent there — not that it is small.';
    expect(expectedDisclosureSet(contract, evaluation).find(
      (entry) => entry.id === 'UNCERTAINTY_COVERAGE_INCOMPLETE',
    )?.text).toBe(expectedText);

    const result = buildFigure(mixed);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.disclosures.find(
      (entry) => entry.id === 'UNCERTAINTY_COVERAGE_INCOMPLETE',
    )?.text).toBe(expectedText);
  });

  it('keeps all four finite influence witnesses living without treating them as proofs', () => {
    for (const skillId of TRACE_SKILLS) {
      const contract = source(skillId);
      const result = checkFiniteInfluenceWitnessesV1(
        contract.outputAuthority,
        contract.examples.valid,
        (candidate) => {
          const checked = validateRequestValue(candidate);
          return checked.ok
            ? { tag: 'accepted', canonicalRequest: checked.request.canonicalRequest as JsonValue }
            : { tag: 'rejected', reasons: checked.errors.map((error) => error.code) };
        },
        evaluator(skillId),
      );
      expect(result, skillId).toEqual({
        tag: 'valid',
        checkedWitnessIds: ['declared_field_changes_owned_output'],
      });
    }
  });

  it('keeps the evaluator derivation independent of compiler and artifact modules', () => {
    const implementation = readFileSync(
      path.join(ROOT, 'src/authority/evaluators/traces.ts'),
      'utf8',
    );
    expect(implementation).not.toMatch(/from ['"][^'"]*(?:analysis\/traces|render\/|artifact)/iu);
    expect(implementation).toContain("from '../../core/units.js'");
    expect(implementation).toContain("from '../../core/exact-binary64.js'");
    expect(implementation).toContain("from '../../core/canonicalize.js'");
  });
});
