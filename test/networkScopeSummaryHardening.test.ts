import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveOutputAuthorityEvaluatorV1 } from '../src/authority/evaluators/registry.js';
import { canonicalize } from '../src/core/canonicalize.js';
import { deriveDisclosures } from '../src/core/disclosures.js';
import {
  interpretOutputAuthorityModelV1,
  type AuthorityDerivationValueV1,
  type AuthorityEvaluationV1,
  type AuthorityObservedOutputV1,
} from '../src/core/output-authority.js';
import type { JsonValue } from '../src/core/parse-json.js';
import { validateRequestValue } from '../src/core/request.js';

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(import.meta.dirname, '..');
const SKILLS = [
  'network.connection_graph',
  'network.spatial_map_2d',
  'network.delay_distribution',
  'network.synaptic_weight_trace',
  'network.degree_distribution',
  'network.weight_distribution',
] as const;
const ROW_SCOPE_SKILLS = SKILLS.slice(0, 4);
const COVERAGE = 'all_ranks_0_through_worldSize_minus_1';
const SNAPSHOT_TIME = { kind: 'time', unit: 'ms', value: 1000 } as const;

function source(skillId: string): JsonRecord {
  return JSON.parse(readFileSync(
    path.join(ROOT, `contract/skills/${skillId}.v1.json`),
    'utf8',
  ));
}

function field(
  evaluation: AuthorityEvaluationV1,
  id: string,
): AuthorityDerivationValueV1 {
  const value = evaluation.fields[id];
  if (!value) throw new Error(`missing authority field ${id}`);
  return value;
}

function checkedEvaluation(skillId: string, request: JsonRecord) {
  const contract = source(skillId);
  const validated = validateRequestValue(request);
  expect(validated.ok, `${skillId}: ${validated.ok ? '' : JSON.stringify(validated.errors)}`).toBe(true);
  if (!validated.ok) throw new Error(JSON.stringify(validated.errors));
  const evaluator = resolveOutputAuthorityEvaluatorV1(contract.outputAuthority.evaluator.id);
  expect(evaluator, `${skillId} evaluator`).not.toBeNull();
  if (!evaluator) throw new Error(`missing evaluator for ${skillId}`);
  return {
    contract,
    validated,
    evaluation: evaluator.evaluateCanonicalRequest(
      validated.request.canonicalRequest as JsonValue,
    ),
  };
}

function globalScope(worldSize: number, reversed = false): JsonRecord {
  const ranks = Array.from({ length: worldSize }, (_entry, rank) => rank);
  return {
    kind: 'global_merged',
    worldSize,
    mergedRanks: reversed ? ranks.reverse() : ranks,
    snapshotTime: SNAPSHOT_TIME,
  };
}

function scopeProjection(scope: JsonRecord): string {
  const snapshot = scope.snapshotTime === undefined ? {} : { snapshotTime: scope.snapshotTime };
  switch (scope.kind) {
    case 'single_process':
      return canonicalize({ kind: scope.kind, ...snapshot });
    case 'global_merged':
      return canonicalize({
        kind: scope.kind,
        mergedRanksCoverage: COVERAGE,
        ...snapshot,
        worldSize: scope.worldSize,
      });
    case 'mpi_target_rank_local':
      return canonicalize({
        kind: scope.kind,
        localTargetUniverseComplete: scope.localTargetUniverseComplete,
        rank: scope.rank,
        ...snapshot,
        worldSize: scope.worldSize,
      });
    case 'sampled':
      return canonicalize({
        kind: scope.kind,
        method: scope.method,
        parentScope: scope.parentScope,
        retainedConnectionCount: scope.retainedConnectionCount,
        ...snapshot,
        sourceConnectionCount: scope.sourceConnectionCount,
      });
    default:
      throw new Error(`unknown test scope ${String(scope.kind)}`);
  }
}

function countObjectKey(value: unknown, key: string): number {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countObjectKey(item, key), 0);
  }
  if (value === null || typeof value !== 'object') return 0;
  return Object.entries(value).reduce(
    (total, [entryKey, item]) => total + (entryKey === key ? 1 : 0) + countObjectKey(item, key),
    0,
  );
}

function renderSummary(
  template: string,
  evaluation: AuthorityEvaluationV1,
  disclosures: readonly { readonly text: string }[],
): string {
  const summary = field(evaluation, 'summary.facts');
  if (summary.tag !== 'summary_fact_map') throw new Error('missing summary facts');
  const body = template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/gu, (_whole, key: string) => {
    const value = summary.facts[key];
    if (typeof value !== 'string') throw new Error(`missing summary fact ${key}`);
    return value;
  });
  if (disclosures.length === 0) return body;
  const count = disclosures.length;
  return `${body} ${count} ${count === 1 ? 'disclosure applies' : 'disclosures apply'}: ${disclosures
    .map((disclosure) => disclosure.text)
    .join(' ')}`;
}

function observedFromEvaluation(
  contract: JsonRecord,
  evaluation: AuthorityEvaluationV1,
): AuthorityObservedOutputV1 {
  const table = field(evaluation, 'table.rows');
  const geometry = field(evaluation, 'geometry.sequence');
  const disclosureFacts = field(evaluation, 'disclosure.facts');
  if (table.tag !== 'row_sequence') throw new Error('missing rows');
  if (geometry.tag !== 'geometry_sequence') throw new Error('missing geometry');
  if (disclosureFacts.tag !== 'disclosure_fact_map') throw new Error('missing disclosure facts');
  const disclosures = deriveDisclosures(disclosureFacts.facts, contract.disclosures);
  return {
    table: {
      columns: contract.accessibility.tableColumns.map(
        ({ key, header }: JsonRecord) => ({ key, header }),
      ),
      rows: table.rows.map((row) => [...row]),
      rowsInline: table.rows.length,
      rowsTotal: table.rows.length,
    },
    geometry: geometry.entries.map((entry) => ({ tag: 'data_mark' as const, entry })),
    summary: renderSummary(contract.accessibility.summaryTemplate, evaluation, disclosures),
    disclosures,
  };
}

describe('bounded NetworkScope authority summaries', () => {
  it('pins all six skills/evaluators/renderers at revision 2 and closes arrow marks', () => {
    for (const skillId of SKILLS) {
      const contract = source(skillId);
      expect(contract.revision, skillId).toBe(2);
      expect(contract.renderer.revision, skillId).toBe(2);
      expect(contract.outputAuthority.evaluator.id, skillId)
        .toBe(`${skillId}.output_authority.v2`);
      const contractText = JSON.stringify(contract);
      expect(contractText, `${skillId} shape-only wording`).toContain('shape_only');
      expect(contractText, `${skillId} unbound wording`).toContain('unbound');
      expect(contractText, `${skillId} detached-verification wording`)
        .toContain('no detached verification');
    }

    for (const skillId of ROW_SCOPE_SKILLS) {
      const contract = source(skillId);
      const carried = contract.outputAuthority.table.carriedValueColumns;
      const columns = contract.accessibility.tableColumns;
      expect(carried).toContain('scopeSummary');
      expect(carried).not.toContain('scope');
      expect(carried).not.toContain('samplingScope');
      expect(columns.find((column: JsonRecord) => column.key === 'scopeSummary')?.header)
        .toBe('Scope summary');
    }

    const registry = JSON.parse(readFileSync(
      path.join(ROOT, 'contract/registries/renderers.v1.json'),
      'utf8',
    ));
    for (const id of [
      'figure.distribution',
      'figure.connection_graph',
      'figure.spatial_map_2d',
      'figure.synaptic_weight_trace',
    ]) {
      expect(registry.renderers.find((entry: JsonRecord) => entry.id === id)?.revision, id).toBe(2);
    }
    for (const id of ['figure.connection_graph', 'figure.spatial_map_2d']) {
      expect(registry.renderers.find((entry: JsonRecord) => entry.id === id)?.marks, id)
        .toContain('arrow');
    }

    const compiler = readFileSync(path.join(ROOT, 'src/render/compileFamilies.ts'), 'utf8');
    const spatialBody = compiler.slice(
      compiler.indexOf('export function compileSpatialMapFigure'),
      compiler.indexOf('export function compilePhasePlaneFigure'),
    );
    const graphBody = compiler.slice(
      compiler.indexOf('export function compileGraphFigure'),
      compiler.indexOf('export function compile', compiler.indexOf('export function compileGraphFigure') + 20),
    );
    expect(spatialBody).toMatch(/type:\s*'arrow'/u);
    expect(graphBody).toMatch(/type:\s*'arrow'/u);

    const buildCompiler = readFileSync(path.join(ROOT, 'src/render/buildFigure.ts'), 'utf8');
    expect(buildCompiler).toContain('function compilerNetworkScopeSummaryCell');
    expect(buildCompiler).not.toMatch(/structuredCell\(data\.scope\)/u);
    expect(buildCompiler).not.toMatch(/authority\/evaluators/u);
    for (const file of ['topology-dynamics.ts', 'distributions.ts', 'traces.ts']) {
      const evaluatorSource = readFileSync(path.join(ROOT, 'src/authority/evaluators', file), 'utf8');
      expect(evaluatorSource, file).not.toMatch(/structuredCell\(data\.scope\)/u);
    }
  });

  it('uses the exact closed projection for all four NetworkScope discriminators', () => {
    const cases = [
      ['network.delay_distribution', 0, 'single_process'],
      ['network.spatial_map_2d', 3, 'global_merged'],
      ['network.connection_graph', 1, 'mpi_target_rank_local'],
      ['network.weight_distribution', 2, 'sampled'],
    ] as const;
    for (const [skillId, exampleIndex, kind] of cases) {
      const contract = source(skillId);
      const request = structuredClone(contract.examples.valid[exampleIndex]);
      expect(request.data.scope.kind).toBe(kind);
      const { evaluation } = checkedEvaluation(skillId, request);
      const summary = field(evaluation, 'summary.facts');
      expect(summary.tag).toBe('summary_fact_map');
      if (summary.tag !== 'summary_fact_map') continue;
      expect(summary.facts.scopeStatement).toBe(scopeProjection(request.data.scope));
      expect(summary.facts.scopeStatement).not.toContain('mergedRanks"');
    }
  });

  it('keeps every row and summary bounded for a 2048-rank complete merge', () => {
    const expected = scopeProjection(globalScope(2048));
    expect(expected.length).toBeLessThan(256);
    for (const skillId of SKILLS) {
      const contract = source(skillId);
      const request = structuredClone(contract.examples.valid[0]);
      request.data.scope = globalScope(2048);
      const { validated, evaluation } = checkedEvaluation(skillId, request);
      const summary = field(evaluation, 'summary.facts');
      expect(summary.tag).toBe('summary_fact_map');
      if (summary.tag === 'summary_fact_map') {
        expect(summary.facts.scopeStatement, skillId).toBe(expected);
      }
      expect(countObjectKey(validated.request.canonicalRequest, 'mergedRanks'), skillId).toBe(1);
      if (ROW_SCOPE_SKILLS.includes(skillId as never)) {
        const rows = field(evaluation, 'table.rows');
        expect(rows.tag).toBe('row_sequence');
        if (rows.tag !== 'row_sequence') continue;
        const columnIndex = contract.accessibility.tableColumns.findIndex(
          (column: JsonRecord) => column.key === 'scopeSummary',
        );
        expect(columnIndex, skillId).toBeGreaterThanOrEqual(0);
        for (const row of rows.rows) {
          expect(row[columnIndex], skillId).toBe(expected);
        }
      }
    }
  });

  it('grows only with bounded scalar digit count, not merged-rank cardinality', () => {
    const small = structuredClone(source('network.connection_graph').examples.valid[0]);
    small.data.scope = globalScope(2);
    const large = structuredClone(small);
    large.data.scope = globalScope(4096);
    const smallSummary = field(
      checkedEvaluation('network.connection_graph', small).evaluation,
      'summary.facts',
    );
    const largeSummary = field(
      checkedEvaluation('network.connection_graph', large).evaluation,
      'summary.facts',
    );
    expect(smallSummary.tag).toBe('summary_fact_map');
    expect(largeSummary.tag).toBe('summary_fact_map');
    if (smallSummary.tag !== 'summary_fact_map' || largeSummary.tag !== 'summary_fact_map') return;
    expect(largeSummary.facts.scopeStatement.length - smallSummary.facts.scopeStatement.length)
      .toBe(String(4096).length - String(2).length);
    expect(largeSummary.facts.scopeStatement.length).toBeLessThan(256);
  });

  it('preserves raw merge order once in the request/digest while projecting it away', () => {
    const contract = source('network.synaptic_weight_trace');
    const ascending = structuredClone(contract.examples.valid[0]);
    ascending.data.scope = globalScope(8);
    const descending = structuredClone(ascending);
    descending.data.scope = globalScope(8, true);
    const left = checkedEvaluation('network.synaptic_weight_trace', ascending);
    const right = checkedEvaluation('network.synaptic_weight_trace', descending);
    expect(left.validated.request.requestDigest).not.toBe(right.validated.request.requestDigest);
    expect(countObjectKey(left.validated.request.canonicalRequest, 'mergedRanks')).toBe(1);
    expect(countObjectKey(right.validated.request.canonicalRequest, 'mergedRanks')).toBe(1);
    const leftSummary = field(left.evaluation, 'summary.facts');
    const rightSummary = field(right.evaluation, 'summary.facts');
    expect(leftSummary.tag).toBe('summary_fact_map');
    expect(rightSummary.tag).toBe('summary_fact_map');
    if (leftSummary.tag === 'summary_fact_map' && rightSummary.tag === 'summary_fact_map') {
      expect(leftSummary.facts.scopeStatement).toBe(rightSummary.facts.scopeStatement);
    }
  });

  it('fails incomplete, duplicate, and out-of-range rank declarations before evaluation', () => {
    const contract = source('network.degree_distribution');
    const cases = [
      [
        { kind: 'global_merged', worldSize: 2, mergedRanks: [0] },
        'SCOPE_MERGE_INCOMPLETE',
      ],
      [
        { kind: 'global_merged', worldSize: 2, mergedRanks: [0, 0] },
        'SCOPE_MERGE_CONFLICT',
      ],
      [
        {
          kind: 'mpi_target_rank_local',
          rank: 2,
          worldSize: 2,
          localTargetUniverseComplete: true,
        },
        'SCOPE_MERGE_CONFLICT',
      ],
    ] as const;
    for (const [scope, expectedCode] of cases) {
      const request = structuredClone(contract.examples.valid[0]);
      request.data.scope = scope;
      const validated = validateRequestValue(request);
      expect(validated.ok).toBe(false);
      if (!validated.ok) {
        expect(validated.errors.map((error) => error.code)).toContain(expectedCode);
      }
    }
  });

  it('lets the interpreter detect a one-cell scope-summary mutation', () => {
    const skillId = 'network.delay_distribution';
    const contract = source(skillId);
    const request = structuredClone(contract.examples.valid[0]);
    request.data.scope = globalScope(8);
    const { validated, evaluation } = checkedEvaluation(skillId, request);
    const observed = observedFromEvaluation(contract, evaluation);
    expect(interpretOutputAuthorityModelV1(
      contract.outputAuthority,
      contract.accessibility.summaryTemplate,
      contract.accessibility.tableColumns,
      observed.disclosures,
      validated.request.requestDigest,
      evaluation,
      observed,
    )).toEqual({ tag: 'valid', expectedRowsTotal: observed.table.rows.length });

    const scopeColumn = contract.accessibility.tableColumns.findIndex(
      (column: JsonRecord) => column.key === 'scopeSummary',
    );
    const rows = observed.table.rows.map((row) => [...row]);
    rows[0][scopeColumn] = canonicalize({ kind: 'global_merged', worldSize: 999 });
    const mutated = interpretOutputAuthorityModelV1(
      contract.outputAuthority,
      contract.accessibility.summaryTemplate,
      contract.accessibility.tableColumns,
      observed.disclosures,
      validated.request.requestDigest,
      evaluation,
      { ...observed, table: { ...observed.table, rows } },
    );
    expect(mutated.tag).toBe('invalid');
    if (mutated.tag === 'invalid') {
      expect(mutated.violations.map((violation) => violation.code))
        .toContain('AUTHORITY_TABLE_ROWS_MISMATCH');
    }
  });
});
