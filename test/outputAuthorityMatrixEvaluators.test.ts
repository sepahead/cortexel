import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { MATRIX_AUTHORITY_EVALUATORS } from '../src/authority/evaluators/matrices.js';
import { canonicalize } from '../src/core/canonicalize.js';
import { deriveDisclosures } from '../src/core/disclosures.js';
import {
  checkFiniteInfluenceWitnessesV1,
  interpretOutputAuthorityModelV1,
  isOutputAuthoritySummaryFactSafeV1,
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
const MATRIX_SKILLS = [
  'network.adjacency_matrix',
  'network.weight_matrix',
  'network.delay_matrix',
] as const;

function source(skillId: string): JsonRecord {
  return JSON.parse(readFileSync(
    path.join(ROOT, `contract/skills/${skillId}.v1.json`),
    'utf8',
  ));
}

function evaluator(skillId: string) {
  const found = MATRIX_AUTHORITY_EVALUATORS.find(
    (candidate) => candidate.id === `${skillId}.output_authority.v2`,
  );
  if (!found) throw new Error(`missing matrix authority evaluator ${skillId}`);
  return found;
}

function expectedDisclosures(contract: JsonRecord, evaluation: AuthorityEvaluationV1) {
  const value = evaluation.fields['disclosure.facts'];
  if (value?.tag !== 'disclosure_fact_map') throw new Error('missing disclosure fact map');
  return deriveDisclosures(value.facts, contract.disclosures, ['ABSENT_IS_NOT_ZERO']);
}

function checkedModel(skillId: string, exampleIndex: number): {
  readonly contract: JsonRecord;
  readonly authority: OutputAuthorityV1;
  readonly evaluation: AuthorityEvaluationV1;
  readonly observed: AuthorityObservedOutputV1;
  readonly digest: string;
} {
  const contract = source(skillId);
  const request = structuredClone(contract.examples.valid[exampleIndex]);
  const validated = validateRequestValue(request);
  expect(validated.ok, `${skillId} living example ${exampleIndex} validates`).toBe(true);
  if (!validated.ok) throw new Error(JSON.stringify(validated.errors));
  const result = buildFigure(request);
  expect(result.ok, `${skillId} living example ${exampleIndex} builds`).toBe(true);
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
    expectedDisclosures(model.contract, model.evaluation),
    model.digest,
    model.evaluation,
    observed,
  );
}

function derivationRows(evaluation: AuthorityEvaluationV1): readonly (readonly (string | number | null)[])[] {
  const value = evaluation.fields['table.rows'];
  if (value?.tag !== 'row_sequence') throw new Error('missing matrix row sequence');
  return value.rows;
}

function derivationGeometry(evaluation: AuthorityEvaluationV1) {
  const value = evaluation.fields['geometry.sequence'];
  if (value?.tag !== 'geometry_sequence') throw new Error('missing matrix geometry sequence');
  return value.entries;
}

function derivationSummary(evaluation: AuthorityEvaluationV1) {
  const value = evaluation.fields['summary.facts'];
  if (value?.tag !== 'summary_fact_map') throw new Error('missing matrix summary facts');
  return value.facts;
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

describe('independent matrix OutputAuthority evaluators', () => {
  it('reconstructs every living final-plan table, summary, disclosure, and carrier sequence', () => {
    for (const skillId of MATRIX_SKILLS) {
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

  it('keeps host-tighter budget authority outside canonical-request evaluator facts', () => {
    for (const skillId of MATRIX_SKILLS) {
      const request = structuredClone(source(skillId).examples.valid[0]);
      const result = buildFigure(request, { budgetProfile: 'agent' });
      expect(result.ok, `${skillId} under the host-tighter agent profile`).toBe(true);
      if (!result.ok) continue;
      expect(result.disclosures.map((entry) => entry.id)).toContain('NONSTANDARD_BUDGET_PROFILE');
      const validated = validateRequestValue(request, { budgetProfile: 'agent' });
      expect(validated.ok).toBe(true);
      if (!validated.ok) continue;
      const evaluation = evaluator(skillId).evaluateCanonicalRequest(
        validated.request.canonicalRequest as JsonValue,
      );
      const disclosureValue = evaluation.fields['disclosure.facts'];
      expect(disclosureValue?.tag).toBe('disclosure_fact_map');
      if (disclosureValue?.tag === 'disclosure_fact_map') {
        expect(disclosureValue.facts).not.toHaveProperty('budgetProfileId');
      }
    }
  });

  it('keeps observed absence, not_observed, measured zero, and missing value distinct', () => {
    const adjacency = source('network.adjacency_matrix').examples.valid[1];
    const adjacencyRows = derivationRows(
      evaluator('network.adjacency_matrix').evaluateCanonicalRequest(adjacency),
    );
    const observedAbsent = adjacencyRows.find((row) => row[0] === 0 && row[2] === 0);
    const remoteUnknown = adjacencyRows.find((row) => row[0] === 1 && row[2] === 0);
    expect(observedAbsent?.slice(4, 9)).toEqual(['absent', 0, 0, 0, 'true']);
    expect(remoteUnknown?.slice(4, 9)).toEqual(['not_observed', null, null, 0, 'false']);

    const weight = source('network.weight_matrix').examples.valid[0];
    const weightRows = derivationRows(
      evaluator('network.weight_matrix').evaluateCanonicalRequest(weight),
    );
    const measuredZero = weightRows.find((row) => row[1] === 't1' && row[3] === 's3');
    expect(measuredZero?.slice(4, 13)).toEqual([
      'valued', 0, 'sum', 'pA', 1, 1, 0, 0, 0,
    ]);

    const partial = source('network.weight_matrix').examples.valid[2];
    const partialRows = derivationRows(
      evaluator('network.weight_matrix').evaluateCanonicalRequest(partial),
    );
    const partialMissing = partialRows.find((row) => row[1] === 'n1' && row[3] === 'n1');
    expect(partialMissing?.slice(4, 13)).toEqual([
      'present_with_missing_value', null, 'mean', 'nS', 2, 1, 1, 6, 6,
    ]);
  });

  it('binds dense weight and delay tables cell-for-cell, including absent and not_observed rows', () => {
    const cases = [
      {
        skillId: 'network.weight_matrix' as const,
        absentCoordinate: [1, 0] as const,
        notObservedCoordinate: [2, 0] as const,
      },
      {
        skillId: 'network.delay_matrix' as const,
        absentCoordinate: [0, 0] as const,
        notObservedCoordinate: [1, 0] as const,
      },
    ];

    for (const testCase of cases) {
      const contract = source(testCase.skillId);
      const request = structuredClone(contract.examples.valid[1]);
      request.parameters.tableCellEnumeration = 'dense';
      const validated = validateRequestValue(request);
      expect(validated.ok, `${testCase.skillId} dense request validates`).toBe(true);
      if (!validated.ok) continue;
      const evaluation = evaluator(testCase.skillId).evaluateCanonicalRequest(
        validated.request.canonicalRequest as JsonValue,
      );
      const rows = derivationRows(evaluation);
      expect(rows, `${testCase.skillId} emits one row per declared cell`).toHaveLength(16);
      const absentIndex = rows.findIndex((row) =>
        row[0] === testCase.absentCoordinate[0] &&
        row[2] === testCase.absentCoordinate[1]);
      const notObservedIndex = rows.findIndex((row) =>
        row[0] === testCase.notObservedCoordinate[0] &&
        row[2] === testCase.notObservedCoordinate[1]);
      expect(absentIndex).toBeGreaterThanOrEqual(0);
      expect(notObservedIndex).toBeGreaterThanOrEqual(0);
      expect(rows[absentIndex]?.[4]).toBe('absent');
      expect(rows[notObservedIndex]?.[4]).toBe('not_observed');
      expect(new Set(rows.map((row) => row[15]))).toEqual(new Set([canonicalize({
        kind: 'mpi_target_rank_local',
        localTargetUniverseComplete: true,
        rank: request.data.scope.rank,
        snapshotTime: request.data.scope.snapshotTime,
        worldSize: request.data.scope.worldSize,
      })]));

      const result = buildFigure(request);
      expect(result.ok, `${testCase.skillId} dense request builds`).toBe(true);
      if (!result.ok) continue;
      const extracted = extractObservedOutputAuthorityV1(result.plan);
      expect(extracted.tag).toBe('extracted');
      if (extracted.tag !== 'extracted') continue;
      const model = {
        contract,
        authority: contract.outputAuthority as OutputAuthorityV1,
        evaluation,
        observed: extracted.observed,
        digest: validated.request.requestDigest,
      };
      expect(interpret(model)).toEqual({
        tag: 'valid',
        expectedRowsTotal: 16,
      });

      const mutatedRows = extracted.observed.table.rows.map((row) => [...row]);
      mutatedRows[absentIndex][4] = 'not_observed';
      mutatedRows[notObservedIndex][4] = 'absent';
      const mutation = interpret(model, {
        ...extracted.observed,
        table: { ...extracted.observed.table, rows: mutatedRows },
      });
      expect(mutation.tag).toBe('invalid');
      if (mutation.tag === 'invalid') {
        expect(mutation.violations.map((entry) => entry.code)).toContain(
          'AUTHORITY_TABLE_ROWS_MISMATCH',
        );
      }
    }
  });

  it('preserves exact multapse contributors, caller edge identities, and aggregate formula', () => {
    const adjacency = source('network.adjacency_matrix').examples.valid[0];
    const adjacencyRows = derivationRows(
      evaluator('network.adjacency_matrix').evaluateCanonicalRequest(adjacency),
    );
    const multapse = adjacencyRows.find((row) => row[0] === 1 && row[2] === 0);
    expect(multapse).toEqual([
      1,
      '2',
      0,
      '1',
      'present',
      2,
      2,
      2,
      'true',
      'false',
      '["e1","e2"]',
      '["static_synapse"]',
      canonicalize([
        {
          edgeId: 'e1',
          synapseModel: 'static_synapse',
          weight: 1.2,
          weightUnit: 'nest:weight',
          delay: 1.5,
          delayUnit: 'ms',
        },
        {
          edgeId: 'e2',
          synapseModel: 'static_synapse',
          weight: 0.9,
          weightUnit: 'nest:weight',
          delay: 1.5,
          delayUnit: 'ms',
        },
      ]),
      canonicalize({
        kind: 'single_process',
        snapshotTime: adjacency.data.scope.snapshotTime,
      }),
    ]);

    const weightRequest = source('network.weight_matrix').examples.valid[0];
    const sum = evaluator('network.weight_matrix').evaluateCanonicalRequest(weightRequest);
    const meanRequest = structuredClone(weightRequest);
    meanRequest.parameters.multapseAggregation = 'mean';
    const mean = evaluator('network.weight_matrix').evaluateCanonicalRequest(meanRequest);
    expect(derivationRows(sum)).not.toEqual(derivationRows(mean));
    expect(derivationGeometry(sum)).toEqual(derivationGeometry(mean));
    const sumCell = derivationRows(sum).find((row) => row[1] === 't1' && row[3] === 's1');
    const meanCell = derivationRows(mean).find((row) => row[1] === 't1' && row[3] === 's1');
    expect(sumCell?.[5]).toBe(4);
    expect(meanCell?.[5]).toBe(2);
  });

  it('describes binary multapse presence as existential rather than as a numeric aggregate', () => {
    const contract = source('network.adjacency_matrix');
    const request = structuredClone(contract.examples.valid[0]);
    request.parameters.cellMode = 'binary_presence';
    request.parameters.multapseAggregation = 'sum';
    delete request.parameters.multiplicityScale;
    const evaluation = evaluator('network.adjacency_matrix').evaluateCanonicalRequest(request);
    expect(derivationSummary(evaluation).multapseStatement).toBe(
      '1 present cell contains multiple retained connection rows; each maps to one binary-presence mark, while retained-row and complete-cell counts remain in the table.',
    );
    const disclosure = evaluation.fields['disclosure.facts'];
    expect(disclosure?.tag).toBe('disclosure_fact_map');
    if (disclosure?.tag === 'disclosure_fact_map') {
      expect(disclosure.facts).not.toHaveProperty('multapseAggregated');
    }
    expect(expectedDisclosures(contract, evaluation).map((entry) => entry.id))
      .not.toContain('MULTAPSE_AGGREGATED');

    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.disclosures.map((entry) => entry.id))
        .not.toContain('MULTAPSE_AGGREGATED');
    }
  });

  it('binds carried adjacency attributes to their own caller identities and discloses every null scalar', () => {
    const contract = source('network.adjacency_matrix');
    const request = structuredClone(contract.examples.valid[0]);
    request.data.connections.edgeIds[0] = 'z-edge';
    request.data.connections.edgeIds[1] = 'a-edge';
    request.data.connections.weights.values[0] = null;
    request.data.connections.delays.values[1] = null;

    const direct = evaluator('network.adjacency_matrix').evaluateCanonicalRequest(request);
    const directRows = derivationRows(direct);
    const multapse = directRows.find((row) => row[0] === 1 && row[2] === 0);
    expect(multapse?.[10]).toBe('["a-edge","z-edge"]');
    expect(JSON.parse(String(multapse?.[12]))).toEqual([
      {
        delay: 1.5,
        delayUnit: 'ms',
        edgeId: 'z-edge',
        synapseModel: 'static_synapse',
        weight: null,
        weightUnit: 'nest:weight',
      },
      {
        delay: null,
        delayUnit: 'ms',
        edgeId: 'a-edge',
        synapseModel: 'static_synapse',
        weight: 0.9,
        weightUnit: 'nest:weight',
      },
    ]);
    const directDisclosure = direct.fields['disclosure.facts'];
    expect(directDisclosure?.tag).toBe('disclosure_fact_map');
    if (directDisclosure?.tag === 'disclosure_fact_map') {
      expect(directDisclosure.facts.missingValueCount).toBe(2);
    }
    expect(expectedDisclosures(contract, direct).map((entry) => entry.id)).toContain(
      'MISSING_VALUES_PRESENT',
    );

    const validated = validateRequestValue(request);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const evaluation = evaluator('network.adjacency_matrix').evaluateCanonicalRequest(
      validated.request.canonicalRequest as JsonValue,
    );
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.disclosures.map((entry) => entry.id)).toContain('MISSING_VALUES_PRESENT');
    const extracted = extractObservedOutputAuthorityV1(result.plan);
    expect(extracted.tag).toBe('extracted');
    if (extracted.tag !== 'extracted') return;
    const model = {
      contract,
      authority: contract.outputAuthority as OutputAuthorityV1,
      evaluation,
      observed: extracted.observed,
      digest: validated.request.requestDigest,
    };
    expect(interpret(model).tag).toBe('valid');

    const rows = extracted.observed.table.rows.map((row) => [...row]);
    const rowIndex = rows.findIndex((row) => row[0] === 1 && row[2] === 0);
    const carried = JSON.parse(String(rows[rowIndex][12]));
    carried[0].edgeId = 'wrong-edge';
    rows[rowIndex][12] = canonicalize(carried);
    const mutation = interpret(model, {
      ...extracted.observed,
      table: { ...extracted.observed.table, rows },
    });
    expect(mutation.tag).toBe('invalid');
    if (mutation.tag === 'invalid') {
      expect(mutation.violations.map((entry) => entry.code)).toContain(
        'AUTHORITY_TABLE_ROWS_MISMATCH',
      );
    }
  });

  it('never calls a missing-weight multapse a drawn aggregate', () => {
    const contract = source('network.weight_matrix');
    const incomplete = contract.examples.valid[2];
    const incompleteEvaluation = evaluator('network.weight_matrix')
      .evaluateCanonicalRequest(incomplete);
    expect(derivationSummary(incompleteEvaluation).multapseStatement).toBe(
      '1 present cell contains multiple retained connection rows, but no complete aggregate is reported because at least one contributing weight is missing.',
    );
    const incompleteDisclosure = incompleteEvaluation.fields['disclosure.facts'];
    expect(incompleteDisclosure?.tag).toBe('disclosure_fact_map');
    if (incompleteDisclosure?.tag === 'disclosure_fact_map') {
      expect(incompleteDisclosure.facts.missingValueCount).toBe(1);
      expect(incompleteDisclosure.facts).not.toHaveProperty('multapseAggregated');
    }
    const incompleteIds = expectedDisclosures(contract, incompleteEvaluation)
      .map((entry) => entry.id);
    expect(incompleteIds).toContain('MISSING_VALUES_PRESENT');
    expect(incompleteIds).not.toContain('MULTAPSE_AGGREGATED');

    const complete = contract.examples.valid[0];
    const completeEvaluation = evaluator('network.weight_matrix')
      .evaluateCanonicalRequest(complete);
    const completeDisclosure = completeEvaluation.fields['disclosure.facts'];
    expect(completeDisclosure?.tag).toBe('disclosure_fact_map');
    if (completeDisclosure?.tag === 'disclosure_fact_map') {
      expect(completeDisclosure.facts.multapseAggregated).toBe(true);
      expect(completeDisclosure.facts.multapseAggregation).toBe('sum');
    }

    const result = buildFigure(structuredClone(incomplete));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ids = result.disclosures.map((entry) => entry.id);
      expect(ids).toContain('MISSING_VALUES_PRESENT');
      expect(ids).not.toContain('MULTAPSE_AGGREGATED');
    }
  });

  it('keeps large merged scopes and large model sets out of bounded summary facts', () => {
    const mergedRanks = Array.from({ length: 2_048 }, (_unused, index) => index);
    for (const skillId of MATRIX_SKILLS) {
      const contract = source(skillId);
      const request = structuredClone(contract.examples.valid[2]);
      request.data.scope.worldSize = mergedRanks.length;
      request.data.scope.mergedRanks = mergedRanks;
      const evaluation = evaluator(skillId).evaluateCanonicalRequest(request);
      const summary = derivationSummary(evaluation);
      const scopeColumn = skillId === 'network.adjacency_matrix' ? 13 : 15;
      const expectedScopeSummary = canonicalize({
        kind: 'global_merged',
        mergedRanksCoverage: 'all_ranks_0_through_worldSize_minus_1',
        snapshotTime: request.data.scope.snapshotTime,
        worldSize: 2_048,
      });
      if (skillId === 'network.delay_matrix') {
        expect(summary.scopeKind).toBe('global_merged');
      } else {
        expect(summary.scopeStatement).toBe(
          'global_merged across all 2048 declared ranks',
        );
        expect(isOutputAuthoritySummaryFactSafeV1(String(summary.scopeStatement))).toBe(true);
      }
      const directRows = derivationRows(evaluation);
      expect(new Set(directRows.map((row) => row[scopeColumn]))).toEqual(
        new Set([expectedScopeSummary]),
      );
      expect(expectedScopeSummary).not.toContain('"mergedRanks":[');
      expect(expectedScopeSummary.length).toBeLessThan(256);

      const validated = validateRequestValue(request);
      expect(validated.ok).toBe(true);
      if (!validated.ok) continue;
      const canonicalEvaluation = evaluator(skillId).evaluateCanonicalRequest(
        validated.request.canonicalRequest as JsonValue,
      );
      const result = buildFigure(request);
      expect(result.ok, `${skillId} large merged scope builds`).toBe(true);
      if (result.ok) {
        expect(result.plan.accessibility.summary).toContain(
          skillId === 'network.delay_matrix'
            ? 'Scope: global_merged'
            : 'global_merged across all 2048 declared ranks',
        );
        expect(result.plan.accessibility.summary).not.toContain('mergedRanks');
        expect(new Set(result.plan.table.rows.map((row) => row[scopeColumn]))).toEqual(
          new Set([expectedScopeSummary]),
        );
        const extracted = extractObservedOutputAuthorityV1(result.plan);
        expect(extracted.tag).toBe('extracted');
        if (extracted.tag !== 'extracted') continue;
        const model = {
          contract,
          authority: contract.outputAuthority as OutputAuthorityV1,
          evaluation: canonicalEvaluation,
          observed: extracted.observed,
          digest: validated.request.requestDigest,
        };
        const rows = extracted.observed.table.rows.map((row) => [...row]);
        rows[0][scopeColumn] = canonicalize({
          kind: 'global_merged',
          mergedRanksCoverage: 'incomplete',
          snapshotTime: request.data.scope.snapshotTime,
          worldSize: 2_048,
        });
        const mutation = interpret(model, {
          ...extracted.observed,
          table: { ...extracted.observed.table, rows },
        });
        expect(mutation.tag).toBe('invalid');
      }
    }

    const scopeLengths: number[] = [];
    for (const worldSize of [9, 99, 999, 2_048]) {
      const request = structuredClone(
        source('network.adjacency_matrix').examples.valid[2],
      );
      request.data.scope.worldSize = worldSize;
      request.data.scope.mergedRanks = Array.from(
        { length: worldSize },
        (_unused, index) => index,
      );
      const row = derivationRows(
        evaluator('network.adjacency_matrix').evaluateCanonicalRequest(request),
      )[0];
      const cell = String(row[13]);
      expect(cell).toBe(canonicalize({
        kind: 'global_merged',
        mergedRanksCoverage: 'all_ranks_0_through_worldSize_minus_1',
        snapshotTime: request.data.scope.snapshotTime,
        worldSize,
      }));
      scopeLengths.push(cell.length);
    }
    expect(scopeLengths.map((length) => length - scopeLengths[0])).toEqual([0, 1, 2, 3]);

    const contract = source('network.weight_matrix');
    const request = structuredClone(contract.examples.valid[0]);
    const modelCount = 96;
    const models = Array.from({ length: modelCount }, (_unused, index) =>
      `model-${String(index).padStart(3, '0')}-${'x'.repeat(80)}`);
    request.data.nodeUniverse.ids = ['n'];
    request.data.connections = {
      sourceIds: Array.from({ length: modelCount }, () => 'n'),
      targetIds: Array.from({ length: modelCount }, () => 'n'),
      edgeIds: Array.from({ length: modelCount }, (_unused, index) => `edge-${index}`),
      weights: {
        kind: 'synaptic_weight',
        unit: 'pA',
        values: Array.from({ length: modelCount }, () => 1),
      },
      synapseModels: models,
    };
    request.parameters.synapseModelGroup = 'declared-compatible-models';
    request.parameters.multapseAggregation = 'sum';
    // This synthetic one-cell fixture is intentionally one-sided.  A diverging map
    // would make a false two-sided colour claim and must be refused before authority
    // evaluation, so use the contract's honest sequential branch while testing only
    // whether the large model vocabulary stays out of bounded summary facts.
    request.parameters.colorScale = { class: 'sequential' };
    const evaluation = evaluator('network.weight_matrix').evaluateCanonicalRequest(request);
    const statement = String(derivationSummary(evaluation).synapseModelGroupStatement);
    expect(statement).toBe(
      'caller-declared comparability group declared-compatible-models across 96 distinct declared models',
    );
    expect(isOutputAuthoritySummaryFactSafeV1(statement)).toBe(true);
    const row = derivationRows(evaluation)[0];
    expect(JSON.parse(String(row[13])).models).toHaveLength(modelCount);
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
  });

  it('does not claim a unit-conversion operation for an empty delay snapshot', () => {
    const contract = source('network.delay_matrix');
    const request = structuredClone(contract.examples.valid[0]);
    request.data.connections.sourceIds = [];
    request.data.connections.targetIds = [];
    request.data.connections.delays.values = [];
    if (request.data.connections.edgeIds !== undefined) request.data.connections.edgeIds = [];
    if (request.data.connections.synapseModels !== undefined) {
      request.data.connections.synapseModels = [];
    }
    request.parameters.displayUnit = { kind: 'delay', unit: 'us' };
    const evaluation = evaluator('network.delay_matrix').evaluateCanonicalRequest(request);
    const disclosure = evaluation.fields['disclosure.facts'];
    expect(disclosure?.tag).toBe('disclosure_fact_map');
    if (disclosure?.tag === 'disclosure_fact_map') {
      expect(disclosure.facts).not.toHaveProperty('unitConversions');
    }
    expect(expectedDisclosures(contract, evaluation).map((entry) => entry.id))
      .not.toContain('UNIT_CONVERTED');
    expect(derivationSummary(evaluation)).toMatchObject({
      presentCellCount: '0',
      delayMin: 'not available',
      delayMax: 'not available',
      displayUnit: 'us',
    });
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.disclosures.map((entry) => entry.id)).not.toContain('UNIT_CONVERTED');
    }
  });

  it('rejects altered, duplicate, or holey global rank coverage before scope projection', () => {
    const base = structuredClone(
      source('network.adjacency_matrix').examples.valid[2],
    );
    base.data.scope.worldSize = 3;
    base.data.scope.mergedRanks = [0, 1, 2];
    expect(validateRequestValue(base).ok).toBe(true);
    for (const mergedRanks of [[0, 1, 3], [0, 1, 1], [0, 2]]) {
      const request = structuredClone(base);
      request.data.scope.mergedRanks = mergedRanks;
      const validated = validateRequestValue(request);
      expect(validated.ok, JSON.stringify(mergedRanks)).toBe(false);
      if (!validated.ok) {
        expect(validated.errors.map((error) => error.code)).toContain(
          'SCOPE_MERGE_INCOMPLETE',
        );
      }
    }
  });

  it('pins all matrix skills, evaluators, and the shared renderer to revision 2', () => {
    for (const skillId of MATRIX_SKILLS) {
      const contract = source(skillId);
      expect(contract.revision).toBe(2);
      expect(contract.renderer).toMatchObject({ id: 'figure.matrix', revision: 2 });
      expect(contract.outputAuthority.evaluator.id).toBe(
        `${skillId}.output_authority.v2`,
      );
      expect(contract.accessibility.tableColumns.map((column: JsonRecord) => column.key))
        .toContain('scopeSummary');
      expect(contract.accessibility.tableColumns.map((column: JsonRecord) => column.key))
        .not.toContain('scope');
      const scopeColumn = contract.accessibility.tableColumns.find(
        (column: JsonRecord) => column.key === 'scopeSummary',
      );
      expect(scopeColumn.description).toContain('Artifact 1.0 binds table shape only');
      expect(scopeColumn.description).toContain('provides no detached verification');
    }
    const delayColumns = source('network.delay_matrix').accessibility.tableColumns
      .map((column: JsonRecord) => column.key);
    expect(delayColumns).not.toContain('snapshotTime');
    expect(MATRIX_AUTHORITY_EVALUATORS.map((entry) => entry.id).sort()).toEqual(
      MATRIX_SKILLS.map((skillId) => `${skillId}.output_authority.v2`).sort(),
    );
    const renderers = JSON.parse(readFileSync(
      path.join(ROOT, 'contract/registries/renderers.v1.json'),
      'utf8',
    ));
    const matrixRenderer = renderers.renderers.find(
      (renderer: JsonRecord) => renderer.id === 'figure.matrix',
    );
    expect(matrixRenderer.revision).toBe(2);
    expect(matrixRenderer.notes).toContain(
      'not_observed is distinct from observed absence and is never drawn as absent',
    );
  });

  it('keeps sampled presence weaker than absence and converts delay aggregates exactly once', () => {
    const sampled = structuredClone(source('network.adjacency_matrix').examples.valid[0]);
    sampled.data.nodeUniverse.ids = ['1', '2'];
    sampled.data.connections = {
      sourceIds: ['1'],
      targetIds: ['2'],
      edgeIds: ['retained-1'],
    };
    sampled.data.scope = {
      kind: 'sampled',
      parentScope: 'single_process',
      method: 'declared_subset',
      sourceConnectionCount: 4,
      retainedConnectionCount: 1,
      snapshotTime: { kind: 'time', unit: 'ms', value: 25 },
    };
    delete sampled.data.observedTargetIds;
    sampled.parameters.cellMode = 'binary_presence';
    sampled.parameters.multapseAggregation = 'sum';
    sampled.parameters.tableCellEnumeration = 'dense';
    delete sampled.parameters.multiplicityScale;
    const sampledEvaluation = evaluator('network.adjacency_matrix')
      .evaluateCanonicalRequest(sampled);
    const sampledRows = derivationRows(sampledEvaluation);
    expect(sampledRows).toHaveLength(4);
    expect(sampledRows.find((row) => row[0] === 1 && row[2] === 0)?.slice(4, 9)).toEqual([
      'present', 1, null, 1, 'false',
    ]);
    for (const row of sampledRows.filter((candidate) => !(candidate[0] === 1 && candidate[2] === 0))) {
      expect(row.slice(4, 9)).toEqual(['not_observed', null, null, 0, 'false']);
    }
    expect(derivationSummary(sampledEvaluation)).toMatchObject({
      observedRowCount: '0',
      absentCellCount: '0',
      notObservedCellCount: '3',
    });
    expect(new Set(sampledRows.map((row) => row[13]))).toEqual(new Set([canonicalize({
      kind: 'sampled',
      method: 'declared_subset',
      parentScope: 'single_process',
      retainedConnectionCount: 1,
      snapshotTime: { kind: 'time', unit: 'ms', value: 25 },
      sourceConnectionCount: 4,
    })]));

    const delay = source('network.delay_matrix').examples.valid[2];
    const delayEvaluation = evaluator('network.delay_matrix').evaluateCanonicalRequest(delay);
    const delayRows = derivationRows(delayEvaluation);
    const convertedMean = delayRows.find((row) => row[1] === '2' && row[3] === '1');
    expect(convertedMean?.slice(4, 12)).toEqual([
      'present', 3, 'ms', 'mean', 'dendritic_component_only', 2, 1.5, 4.5,
    ]);
    const disclosureValue = delayEvaluation.fields['disclosure.facts'];
    expect(disclosureValue?.tag).toBe('disclosure_fact_map');
    if (disclosureValue?.tag === 'disclosure_fact_map') {
      expect(disclosureValue.facts.unitConversions).toEqual([
        'delay: us -> ms (factor 0.001)',
      ]);
    }
  });

  it('changes only summary facts for source-owned labels and retains the protected frame', () => {
    const adjacency = source('network.adjacency_matrix').examples.valid[0];
    const leftAdjacency = structuredClone(adjacency);
    const rightAdjacency = structuredClone(adjacency);
    leftAdjacency.parameters.selectionLabel = 'Authority selection A';
    rightAdjacency.parameters.selectionLabel = 'Authority selection B';
    const leftA = evaluator('network.adjacency_matrix').evaluateCanonicalRequest(leftAdjacency);
    const rightA = evaluator('network.adjacency_matrix').evaluateCanonicalRequest(rightAdjacency);
    expect(derivationSummary(leftA)).not.toEqual(derivationSummary(rightA));
    expect(derivationRows(leftA)).toEqual(derivationRows(rightA));
    expect(derivationGeometry(leftA)).toEqual(derivationGeometry(rightA));

    const delay = source('network.delay_matrix').examples.valid[0];
    const leftDelay = structuredClone(delay);
    const rightDelay = structuredClone(delay);
    leftDelay.parameters.matrixLabel = 'Authority matrix A';
    rightDelay.parameters.matrixLabel = 'Authority matrix B';
    const leftD = evaluator('network.delay_matrix').evaluateCanonicalRequest(leftDelay);
    const rightD = evaluator('network.delay_matrix').evaluateCanonicalRequest(rightDelay);
    expect(derivationSummary(leftD)).not.toEqual(derivationSummary(rightD));
    expect(derivationRows(leftD)).toEqual(derivationRows(rightD));
    expect(derivationGeometry(leftD)).toEqual(derivationGeometry(rightD));
  });

  it('refuses omitted, reordered, or provenance-misbound final-plan carriers and rows', () => {
    const model = checkedModel('network.weight_matrix', 0);
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
      expect(omitted.violations.map((entry) => entry.code)).toContain('AUTHORITY_TABLE_ROWS_MISMATCH');
    }

    const geometry = dataGeometry(model.observed.geometry);
    [geometry[0], geometry[1]] = [geometry[1], geometry[0]];
    const reordered = interpret(model, { ...model.observed, geometry });
    expect(reordered.tag).toBe('invalid');
    if (reordered.tag === 'invalid') {
      expect(reordered.violations.map((entry) => entry.code)).toContain('AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH');
    }

    const misbound = dataGeometry(model.observed.geometry);
    const first = misbound[0];
    if (first.tag !== 'data_mark') throw new Error('expected matrix data mark');
    misbound[0] = {
      tag: 'data_mark',
      entry: {
        ...first.entry,
        provenance: { ...(first.entry.provenance as JsonRecord), targetId: 'wrong-target' },
      },
    };
    const badProvenance = interpret(model, { ...model.observed, geometry: misbound });
    expect(badProvenance.tag).toBe('invalid');
    if (badProvenance.tag === 'invalid') {
      expect(badProvenance.violations.map((entry) => entry.code)).toContain('AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH');
    }
  });

  it('keeps all three finite paired witnesses living without treating them as proofs', () => {
    for (const skillId of MATRIX_SKILLS) {
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

  it('translation-validates deterministic hostile matrix snapshots beyond the living examples', () => {
    let state = 0x6d617472;
    const next = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state;
    };
    const endpoint = (ids: readonly string[]): string => ids[next() % ids.length];

    for (let iteration = 0; iteration < 32; iteration++) {
      const adjacency = structuredClone(source('network.adjacency_matrix').examples.valid[0]);
      const adjacencyIds = ['a', 'b', 'c', 'd'].slice(0, 1 + next() % 4);
      const adjacencyEdges = next() % 13;
      adjacency.data.nodeUniverse.ids = adjacencyIds;
      adjacency.data.connections = {
        sourceIds: Array.from({ length: adjacencyEdges }, () => endpoint(adjacencyIds)),
        targetIds: Array.from({ length: adjacencyEdges }, () => endpoint(adjacencyIds)),
        edgeIds: Array.from({ length: adjacencyEdges }, (_unused, index) => `a-${iteration}-${index}`),
        weights: {
          kind: 'synaptic_weight',
          unit: 'nest:weight',
          values: Array.from({ length: adjacencyEdges }, () => (next() % 17) - 8),
        },
        delays: {
          kind: 'delay',
          unit: 'ms',
          values: Array.from({ length: adjacencyEdges }, () => 1 + next() % 20),
        },
        synapseModels: Array.from({ length: adjacencyEdges }, () => 'static_synapse'),
      };
      adjacency.parameters.selectionId = `adj-${iteration}`;
      adjacency.parameters.selectionLabel = `Adjacency {literal} ${iteration}`;
      adjacency.parameters.cellMode = iteration % 2 === 0 ? 'binary_presence' : 'multiplicity';
      adjacency.parameters.multapseAggregation = 'sum';
      adjacency.parameters.tableCellEnumeration = iteration % 3 === 0 ? 'dense' : 'present_cells_only';
      if (adjacency.parameters.cellMode === 'binary_presence') {
        delete adjacency.parameters.multiplicityScale;
      } else {
        adjacency.parameters.multiplicityScale = 'linear';
      }
      const adjacencyResult = buildFigure(adjacency);
      expect(adjacencyResult.ok, `adjacency generated case ${iteration}`).toBe(true);

      const weight = structuredClone(source('network.weight_matrix').examples.valid[0]);
      const weightIds = ['w0', 'w1', 'w2', 'w3'].slice(0, 1 + next() % 4);
      const weightEdges = next() % 13;
      weight.data.nodeUniverse.ids = weightIds;
      weight.data.connections = {
        sourceIds: Array.from({ length: weightEdges }, () => endpoint(weightIds)),
        targetIds: Array.from({ length: weightEdges }, () => endpoint(weightIds)),
        edgeIds: Array.from({ length: weightEdges }, (_unused, index) => `w-${iteration}-${index}`),
        weights: {
          kind: 'synaptic_weight',
          unit: 'pA',
          values: Array.from({ length: weightEdges }, () =>
            next() % 5 === 0 ? null : (next() % 41) - 20),
        },
        synapseModels: Array.from({ length: weightEdges }, () => 'static_synapse'),
      };
      weight.parameters.multapseAggregation = ['sum', 'mean', 'min', 'max'][next() % 4];
      weight.parameters.colorScale = { class: 'sequential' };
      const weightResult = buildFigure(weight);
      expect(weightResult.ok, `weight generated case ${iteration}`).toBe(true);

      const delay = structuredClone(source('network.delay_matrix').examples.valid[0]);
      const delayIds = ['d0', 'd1', 'd2', 'd3'].slice(0, 1 + next() % 4);
      const delayEdges = next() % 13;
      delay.data.nodeUniverse.ids = delayIds;
      delay.data.connections = {
        sourceIds: Array.from({ length: delayEdges }, () => endpoint(delayIds)),
        targetIds: Array.from({ length: delayEdges }, () => endpoint(delayIds)),
        edgeIds: Array.from({ length: delayEdges }, (_unused, index) => `d-${iteration}-${index}`),
        delays: {
          kind: 'delay',
          unit: 'ms',
          values: Array.from({ length: delayEdges }, () => 1 + next() % 40),
        },
        synapseModels: Array.from({ length: delayEdges }, () => 'static_synapse'),
      };
      delay.parameters.matrixLabel = `Delay {literal} ${iteration}`;
      delay.parameters.multapseAggregation = ['mean', 'min', 'max'][next() % 3];
      const delayResult = buildFigure(delay);
      expect(delayResult.ok, `delay generated case ${iteration}`).toBe(true);
    }
  });

  it('keeps matrix evaluators outside analysis/render/artifact imports and spread extrema', () => {
    const implementation = readFileSync(
      path.join(ROOT, 'src/authority/evaluators/matrices.ts'),
      'utf8',
    );
    expect(implementation).not.toMatch(/from ['"][^'"]*(?:analysis\/|render\/|artifact)/iu);
    expect(implementation).not.toMatch(/Math\.(?:min|max)\s*\(\s*\.\.\./u);
    expect(implementation).toContain("from '../../core/exact-binary64.js'");
    expect(implementation).toContain("from '../../core/units.js'");
  });
});
