import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS } from '../src/authority/evaluators/topology-dynamics.js';
import {
  checkFiniteInfluenceWitnessesV1,
  interpretOutputAuthorityModelV1,
  type AuthorityDerivationValueV1,
  type AuthorityDisclosureV1,
  type AuthorityEvaluationV1,
  type AuthorityObservedGeometryNodeV1,
  type AuthorityObservedOutputV1,
  type OutputAuthorityV1,
} from '../src/core/output-authority.js';
import type { JsonValue } from '../src/core/parse-json.js';
import { validateRequestValue } from '../src/core/request.js';
import {
  deriveCallerSourceStatements,
  type CallerSourceStatement,
} from '../src/core/source-statements.js';
import { buildFigure } from '../src/render/index.js';
import { extractObservedOutputAuthorityV1 } from '../src/render/output-authority-extract.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const SKILLS = [
  'network.connection_graph',
  'network.spatial_map_2d',
  'neuro.phase_plane',
  'neuro.response_curve',
] as const;

function source(skillId: string): JsonRecord {
  return JSON.parse(readFileSync(
    path.join(ROOT, `contract/skills/${skillId}.v1.json`),
    'utf8',
  ));
}

function evaluator(skillId: string) {
  const contract = source(skillId);
  const found = TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS.find(
    (candidate) => candidate.id === contract.outputAuthority.evaluator.id,
  );
  if (!found) throw new Error(`missing topology/dynamics authority evaluator ${skillId}`);
  return found;
}

function field(
  fields: Readonly<Record<string, AuthorityDerivationValueV1>>,
  id: string,
): AuthorityDerivationValueV1 {
  const value = fields[id];
  if (!value) throw new Error(`missing authority field ${id}`);
  return value;
}

function checkedModel(skillId: string, exampleIndex: number): {
  readonly contract: JsonRecord;
  readonly authority: OutputAuthorityV1;
  readonly evaluation: AuthorityEvaluationV1;
  readonly observed: AuthorityObservedOutputV1;
  readonly digest: string;
  readonly disclosures: readonly AuthorityDisclosureV1[];
  readonly sourceStatements: readonly CallerSourceStatement[];
} {
  const contract = source(skillId);
  const request = structuredClone(contract.examples.valid[exampleIndex]);
  return checkedRequest(skillId, request);
}

function checkedRequest(skillId: string, request: JsonRecord): {
  readonly contract: JsonRecord;
  readonly authority: OutputAuthorityV1;
  readonly evaluation: AuthorityEvaluationV1;
  readonly observed: AuthorityObservedOutputV1;
  readonly digest: string;
  readonly disclosures: readonly AuthorityDisclosureV1[];
  readonly sourceStatements: readonly CallerSourceStatement[];
} {
  const contract = source(skillId);
  const validated = validateRequestValue(request);
  expect(validated.ok, `${skillId} custom request validates`).toBe(true);
  if (!validated.ok) throw new Error(JSON.stringify(validated.errors));
  const result = buildFigure(request);
  expect(result.ok, `${skillId} custom request builds`).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  const extracted = extractObservedOutputAuthorityV1(result.plan);
  expect(extracted.tag).toBe('extracted');
  if (extracted.tag !== 'extracted') throw new Error(JSON.stringify(extracted.problems));
  return {
    contract,
    authority: contract.outputAuthority,
    evaluation: evaluator(skillId).evaluateCanonicalRequest(
      validated.request.canonicalRequest as JsonValue,
    ),
    observed: extracted.observed,
    digest: validated.request.requestDigest,
    disclosures: result.disclosures,
    sourceStatements: deriveCallerSourceStatements(validated.request.canonicalRequest),
  };
}

function interpret(
  model: ReturnType<typeof checkedModel>,
  observed: AuthorityObservedOutputV1 = model.observed,
) {
  return interpretOutputAuthorityModelV1(
    model.authority,
    model.contract.accessibility.summaryTemplate,
    model.contract.accessibility.tableColumns,
    model.disclosures,
    model.digest,
    model.evaluation,
    observed,
    model.sourceStatements,
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
      for (let index = node.children.length - 1; index >= 0; index--) {
        stack.push(node.children[index]);
      }
    } else if (node.tag === 'data_mark') {
      result.push(structuredClone(node));
    }
  }
  return result;
}

describe('independent topology/dynamics OutputAuthority evaluators', () => {
  it('reconstructs complete typed fields for every living source example before generation', () => {
    expect(TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS).toHaveLength(SKILLS.length);
    for (const skillId of SKILLS) {
      const contract = source(skillId);
      const allowedClasses = new Set(
        contract.outputAuthority.geometry.classes.map((entry: JsonRecord) => entry.id),
      );
      for (let exampleIndex = 0; exampleIndex < contract.examples.valid.length; exampleIndex++) {
        const validated = validateRequestValue(contract.examples.valid[exampleIndex]);
        expect(validated.ok, `${skillId} source example ${exampleIndex}`).toBe(true);
        if (!validated.ok) continue;
        const evaluation = evaluator(skillId).evaluateCanonicalRequest(
          validated.request.canonicalRequest as JsonValue,
        );
        const rows = field(evaluation.fields, 'table.rows');
        expect(rows.tag).toBe('row_sequence');
        if (rows.tag === 'row_sequence') {
          for (const row of rows.rows) {
            expect(row, `${skillId} example ${exampleIndex} row width`)
              .toHaveLength(contract.accessibility.tableColumns.length);
          }
        }
        const geometry = field(evaluation.fields, 'geometry.sequence');
        expect(geometry.tag).toBe('geometry_sequence');
        if (geometry.tag === 'geometry_sequence') {
          for (const entry of geometry.entries) {
            expect(entry.tag).toBe('carrier');
            expect(allowedClasses.has(entry.classId)).toBe(true);
          }
        }
        const summary = field(evaluation.fields, 'summary.facts');
        expect(summary.tag).toBe('summary_fact_map');
        if (summary.tag === 'summary_fact_map') {
          expect(Object.keys(summary.facts).sort()).toEqual(
            [...contract.outputAuthority.summary.requiredPlaceholders].sort(),
          );
          expect(Object.values(summary.facts).every((value) => typeof value === 'string')).toBe(true);
        }
        const disclosures = field(evaluation.fields, 'disclosure.facts');
        expect(disclosures.tag).toBe('disclosure_fact_map');
        if (disclosures.tag === 'disclosure_fact_map') {
          expect(disclosures.facts).not.toHaveProperty('budgetProfileId');
          expect(disclosures.facts).not.toHaveProperty('nonStandardBudgetProfile');
        }
      }
    }
  });

  it('reconstructs every living final-plan table, summary, disclosure set, and carrier sequence', () => {
    for (const skillId of SKILLS) {
      const contract = source(skillId);
      for (let exampleIndex = 0; exampleIndex < contract.examples.valid.length; exampleIndex++) {
        const model = checkedModel(skillId, exampleIndex);
        expect(interpret(model), `${skillId} example ${exampleIndex}`).toEqual({
          tag: 'valid',
          expectedRowsTotal: model.observed.table.rows.length,
        });
      }
    }
  });

  it('describes only supplied phase-plane carriers and states a disabled marker policy exactly', () => {
    const phase = source('neuro.phase_plane');
    const fieldOnly = checkedRequest(
      'neuro.phase_plane',
      structuredClone(phase.examples.valid[1]),
    );
    expect(interpret(fieldOnly)).toEqual({
      tag: 'valid',
      expectedRowsTotal: fieldOnly.observed.table.rows.length,
    });
    expect(fieldOnly.observed.summary).toContain('Vector field:');
    expect(fieldOnly.observed.summary).toContain(
      'magnitude_proportional: display length is linear in the declared-basis magnitude',
    );
    expect(fieldOnly.observed.summary).not.toContain('trajectories');
    expect(fieldOnly.observed.summary).not.toContain('nullclines');
    expect(fieldOnly.observed.summary).not.toContain('fixed-point');

    const trajectoryRequest = structuredClone(phase.examples.valid[2]);
    trajectoryRequest.parameters.directionMarkers = { mode: 'none' };
    const trajectoryOnly = checkedRequest('neuro.phase_plane', trajectoryRequest);
    expect(interpret(trajectoryOnly)).toEqual({
      tag: 'valid',
      expectedRowsTotal: trajectoryOnly.observed.table.rows.length,
    });
    expect(trajectoryOnly.observed.summary)
      .toContain('Direction-marker policy none: no trajectory direction markers are drawn.');
    expect(trajectoryOnly.observed.summary)
      .toContain('Any supplied trajectory path geometry shows where the state went');
    expect(trajectoryOnly.observed.summary).not.toContain('Vector field:');
    expect(trajectoryOnly.observed.summary).not.toContain('nullclines');
    expect(trajectoryOnly.observed.summary).not.toContain('fixed-point');

    const combined = checkedRequest(
      'neuro.phase_plane',
      structuredClone(phase.examples.valid[0]),
    );
    expect(interpret(combined)).toEqual({
      tag: 'valid',
      expectedRowsTotal: combined.observed.table.rows.length,
    });
    expect(combined.observed.summary).toContain('trajectories');
    expect(combined.observed.summary).toContain('Direction-marker policy');
    expect(combined.observed.summary).toContain('Vector field:');
    expect(combined.observed.summary).toContain(
      'sqrt_magnitude: display length is proportional to sqrt(magnitude), a compressed ' +
      'nonlinear encoding',
    );
    expect(combined.observed.summary).toContain('nullclines');
    expect(combined.observed.summary).toContain('fixed-point annotations');

    const fixedOnly = checkedRequest(
      'neuro.phase_plane',
      structuredClone(phase.examples.valid[3]),
    );
    expect(interpret(fixedOnly)).toEqual({
      tag: 'valid',
      expectedRowsTotal: fixedOnly.observed.table.rows.length,
    });
    expect(fixedOnly.observed.summary).toContain('Vector field:');
    expect(fixedOnly.observed.summary).toContain(
      'unit_length: every nonzero vector has equal display length and magnitude does not ' +
      'affect arrow length',
    );
    expect(fixedOnly.observed.summary).toContain('fixed-point annotations');
    expect(fixedOnly.observed.summary).not.toContain('trajectories');
    expect(fixedOnly.observed.summary).not.toContain('nullclines');

    for (const allMissing of [false, true]) {
      const noDrawableNullcline = structuredClone(phase.examples.valid[0]);
      noDrawableNullcline.data.nullclines.pointCurveIds = allMissing
        ? ['v-nullcline', 'v-nullcline']
        : [];
      noDrawableNullcline.data.nullclines.x.values = allMissing ? [null, null] : [];
      noDrawableNullcline.data.nullclines.y.values = allMissing ? [null, null] : [];
      const model = checkedRequest('neuro.phase_plane', noDrawableNullcline);
      expect(interpret(model)).toEqual({
        tag: 'valid',
        expectedRowsTotal: model.observed.table.rows.length,
      });
      expect(model.observed.summary).toContain('1 nullclines');
      expect(model.observed.summary).toContain(
        '1 declared nullcline has no drawable finite points.',
      );
    }
  });

  it('keeps direction-marker summaries exact for degenerate and ineligible runs', () => {
    const phase = source('neuro.phase_plane');
    const arrowCount = (request: JsonRecord): number => {
      const result = buildFigure(request);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(JSON.stringify(result.errors));
      return result.plan.panels.flatMap((panel) => panel.marks).reduce(
        (count, mark) => count + (
          mark.type === 'group'
            ? mark.marks
              .filter((child) => child.type === 'arrow')
              .reduce((total, child) => total + child.arrows.length, 0)
            : mark.type === 'arrow'
              ? mark.arrows.length
              : 0
        ),
        0,
      );
    };

    const degenerateEnd = structuredClone(phase.examples.valid[2]);
    degenerateEnd.parameters.directionMarkers = { mode: 'arrowhead_at_end' };
    degenerateEnd.data.trajectories.x.values[4] = degenerateEnd.data.trajectories.x.values[3];
    degenerateEnd.data.trajectories.y.values[4] = degenerateEnd.data.trajectories.y.values[3];
    expect(arrowCount(degenerateEnd)).toBe(1);
    const degenerateModel = checkedRequest('neuro.phase_plane', degenerateEnd);
    expect(interpret(degenerateModel)).toEqual({
      tag: 'valid',
      expectedRowsTotal: degenerateModel.observed.table.rows.length,
    });
    expect(degenerateModel.observed.summary).toContain(
      'a zero-duration or geometrically zero-length terminal candidate cannot carry direction',
    );

    const singlePoint = structuredClone(phase.examples.valid[2]);
    singlePoint.parameters.directionMarkers = { mode: 'arrowhead_at_end' };
    for (const fieldName of ['x', 'y', 'dxdt', 'dydt']) {
      const values = singlePoint.data.trajectories[fieldName].values;
      for (let index = 1; index < values.length; index++) values[index] = null;
    }
    expect(arrowCount(singlePoint)).toBe(0);
    const singlePointModel = checkedRequest('neuro.phase_plane', singlePoint);
    expect(interpret(singlePointModel)).toEqual({
      tag: 'valid',
      expectedRowsTotal: singlePointModel.observed.table.rows.length,
    });
    expect(singlePointModel.observed.summary).toContain(
      'Any supplied trajectory path geometry shows where the state went, not how fast.',
    );
    expect(singlePointModel.observed.summary).toContain(
      'runs with fewer than two finite points receive no arrow',
    );

    const tooShort = structuredClone(phase.examples.valid[2]);
    tooShort.parameters.directionMarkers = {
      mode: 'arrowheads_every_n_points',
      everyNPoints: 3,
    };
    for (const fieldName of ['x', 'y', 'dxdt', 'dydt']) {
      const values = tooShort.data.trajectories[fieldName].values;
      values[2] = null;
      values[3] = null;
      values[4] = null;
    }
    expect(arrowCount(tooShort)).toBe(0);
    const tooShortModel = checkedRequest('neuro.phase_plane', tooShort);
    expect(interpret(tooShortModel)).toEqual({
      tag: 'valid',
      expectedRowsTotal: tooShortModel.observed.table.rows.length,
    });
    expect(tooShortModel.observed.summary).toContain(
      'a finite strictly timed run shorter than everyNPoints has no candidate and receives no arrow',
    );

    const zeroCandidate = structuredClone(phase.examples.valid[2]);
    zeroCandidate.parameters.directionMarkers = {
      mode: 'arrowheads_every_n_points',
      everyNPoints: 2,
    };
    zeroCandidate.data.trajectories.x.values[1] = zeroCandidate.data.trajectories.x.values[0];
    zeroCandidate.data.trajectories.y.values[1] = zeroCandidate.data.trajectories.y.values[0];
    for (const fieldName of ['x', 'y', 'dxdt', 'dydt']) {
      const values = zeroCandidate.data.trajectories[fieldName].values;
      values[2] = null;
      values[3] = null;
      values[4] = null;
    }
    expect(arrowCount(zeroCandidate)).toBe(0);
    const zeroCandidateModel = checkedRequest('neuro.phase_plane', zeroCandidate);
    expect(interpret(zeroCandidateModel)).toEqual({
      tag: 'valid',
      expectedRowsTotal: zeroCandidateModel.observed.table.rows.length,
    });
    expect(zeroCandidateModel.observed.summary).toContain(
      'zero-duration and geometrically zero-length candidates are skipped',
    );
  });

  it('preserves literal braces in caller-owned labels through one source-template substitution', () => {
    const cases = [
      {
        skillId: 'network.connection_graph',
        set: (request: JsonRecord, value: string) => { request.parameters.graphLabel = value; },
        fact: 'graphLabel',
      },
      {
        skillId: 'network.spatial_map_2d',
        set: (request: JsonRecord, value: string) => { request.parameters.mapLabel = value; },
        fact: 'mapLabel',
      },
      {
        skillId: 'neuro.phase_plane',
        set: (request: JsonRecord, value: string) => { request.data.axes.x.label = value; },
        fact: 'xLabel',
      },
      {
        skillId: 'neuro.response_curve',
        set: (request: JsonRecord, value: string) => { request.parameters.curveLabel = value; },
        fact: 'curveLabel',
      },
    ] as const;
    for (const testCase of cases) {
      const request = structuredClone(source(testCase.skillId).examples.valid[0]);
      const label = `Authority {literal} ${testCase.skillId}`;
      testCase.set(request, label);
      const validated = validateRequestValue(request);
      expect(validated.ok, testCase.skillId).toBe(true);
      if (!validated.ok) continue;
      const evaluation = evaluator(testCase.skillId).evaluateCanonicalRequest(
        validated.request.canonicalRequest as JsonValue,
      );
      const summaryFacts = field(evaluation.fields, 'summary.facts');
      expect(summaryFacts.tag).toBe('summary_fact_map');
      if (summaryFacts.tag === 'summary_fact_map') {
        expect(summaryFacts.facts[testCase.fact]).toBe(label);
      }
      const result = buildFigure(request);
      expect(result.ok, testCase.skillId).toBe(true);
      if (result.ok) expect(result.plan.accessibility.summary).toContain(label);
    }
  });

  it('keeps host-tighter budget authority outside canonical-request evaluator facts', () => {
    for (const skillId of SKILLS) {
      const request = structuredClone(source(skillId).examples.valid[0]);
      const result = buildFigure(request, { budgetProfile: 'agent' });
      expect(result.ok, `${skillId} under host agent profile`).toBe(true);
      if (result.ok) {
        expect(result.disclosures.map((entry) => entry.id))
          .toContain('NONSTANDARD_BUDGET_PROFILE');
      }
      const validated = validateRequestValue(request, { budgetProfile: 'agent' });
      expect(validated.ok).toBe(true);
      if (!validated.ok) continue;
      const disclosureFacts = field(
        evaluator(skillId).evaluateCanonicalRequest(
          validated.request.canonicalRequest as JsonValue,
        ).fields,
        'disclosure.facts',
      );
      expect(disclosureFacts.tag).toBe('disclosure_fact_map');
      if (disclosureFacts.tag === 'disclosure_fact_map') {
        expect(disclosureFacts.facts).not.toHaveProperty('budgetProfileId');
        expect(disclosureFacts.facts).not.toHaveProperty('nonStandardBudgetProfile');
      }
    }
  });

  it('refuses omitted or misbound rows, carriers, summaries, and disclosures', () => {
    const model = checkedModel('network.spatial_map_2d', 0);
    const omittedRows = model.observed.table.rows.slice(1);
    const omitted = interpret(model, {
      ...model.observed,
      table: {
        ...model.observed.table,
        rows: omittedRows,
        rowsInline: omittedRows.length,
        rowsTotal: omittedRows.length,
      },
    });
    expect(omitted.tag).toBe('invalid');
    if (omitted.tag === 'invalid') {
      expect(omitted.violations.map((entry) => entry.code))
        .toContain('AUTHORITY_TABLE_ROWS_MISMATCH');
    }

    const geometry = dataGeometry(model.observed.geometry);
    expect(geometry.length).toBeGreaterThan(2);
    [geometry[0], geometry[1]] = [geometry[1], geometry[0]];
    const reordered = interpret(model, { ...model.observed, geometry });
    expect(reordered.tag).toBe('invalid');
    if (reordered.tag === 'invalid') {
      expect(reordered.violations.map((entry) => entry.code))
        .toContain('AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH');
    }

    const misbound = dataGeometry(model.observed.geometry);
    const first = misbound[0];
    if (first.tag !== 'data_mark') throw new Error('expected topology data mark');
    misbound[0] = {
      tag: 'data_mark',
      entry: {
        ...first.entry,
        provenance: { ...(first.entry.provenance as JsonRecord), sourceId: 'wrong-source' },
      },
    };
    const badProvenance = interpret(model, { ...model.observed, geometry: misbound });
    expect(badProvenance.tag).toBe('invalid');
    if (badProvenance.tag === 'invalid') {
      expect(badProvenance.violations.map((entry) => entry.code))
        .toContain('AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH');
    }

    const badSummary = interpret(model, {
      ...model.observed,
      summary: `${model.observed.summary} altered`,
    });
    expect(badSummary.tag).toBe('invalid');
    if (badSummary.tag === 'invalid') {
      expect(badSummary.violations.map((entry) => entry.code))
        .toContain('AUTHORITY_SUMMARY_MISMATCH');
    }

    if (model.observed.disclosures.length === 0) {
      throw new Error('spatial authority mutation case needs a disclosure');
    }
    const badDisclosures = interpret(model, {
      ...model.observed,
      disclosures: model.observed.disclosures.slice(1),
    });
    expect(badDisclosures.tag).toBe('invalid');
    if (badDisclosures.tag === 'invalid') {
      expect(badDisclosures.violations.map((entry) => entry.code))
        .toContain('AUTHORITY_DISCLOSURE_MISMATCH');
    }
  });

  it('keeps all four finite paired witnesses living without treating them as proofs', () => {
    for (const skillId of SKILLS) {
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

  it('keeps the evaluator outside analysis, compiler, artifact, and generated modules', () => {
    const implementation = readFileSync(
      path.join(ROOT, 'src/authority/evaluators/topology-dynamics.ts'),
      'utf8',
    );
    expect(implementation)
      .not.toMatch(/from ['"][^'"]*(?:analysis\/|render\/|artifact|generated\/)/iu);
    expect(implementation).not.toMatch(/Math\.(?:min|max)\s*\(\s*\.\.\./u);
    expect(implementation).toContain("from '../../core/exact-binary64.js'");
    expect(implementation).toContain("from '../../core/units.js'");
    expect(implementation).toContain("from '../../core/canonicalize.js'");
  });
});
