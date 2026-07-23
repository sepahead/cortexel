import { describe, expect, it } from 'vitest';

import { canonicalDigest } from '../src/core/canonicalize.js';
import {
  interpretOutputAuthorityModelV1,
  type AuthorityEvaluationV1,
  type AuthorityObservedOutputV1,
  type AuthorityTableColumnContractV1,
  type OutputAuthorityV1,
} from '../src/core/output-authority.js';

const request = { data: { ids: ['a', 'b'] }, parameters: { show: true } };
const digest = canonicalDigest(request);
const template = 'Authority figure. {rows} rows for {label}.';
const disclosures = [{
  id: 'SOURCE_SIMULATION',
  severity: 'informational' as const,
  text: 'Source is a simulation.',
}];

const columns: readonly AuthorityTableColumnContractV1[] = [
  { key: 'id', header: 'ID', cellType: 'string', nullable: false, keyPart: true },
  { key: 'value', header: 'Value', cellType: 'finite_number', nullable: false, keyPart: false },
];

const authority: OutputAuthorityV1 = {
  version: 1,
  evaluator: { tag: 'registered_evaluator', id: 'test.output_authority.v1' },
  requestPaths: [{
    id: 'influence.show',
    segments: [
      { tag: 'field', name: 'parameters' },
      { tag: 'field', name: 'show' },
    ],
  }],
  derivationFields: [
    { id: 'table.rows', valueKind: 'row_sequence' },
    { id: 'geometry.sequence', valueKind: 'geometry_sequence' },
    { id: 'summary.facts', valueKind: 'summary_fact_map' },
    { id: 'disclosure.facts', valueKind: 'disclosure_fact_map' },
  ],
  table: {
    tag: 'row_sequence',
    expectedRows: { tag: 'derivation_field', field: 'table.rows' },
    carriedValueColumns: ['id', 'value'],
    comparison: 'canonical_json_sequence_exact',
    rowsTotal: 'from_verified_expected_rows',
  },
  geometry: {
    tag: 'classified_geometry',
    traversal: 'nested_groups_depth_first_preorder',
    excludedRoles: ['axis', 'text', 'disclosure', 'decorative_mark'],
    expectedSequence: { tag: 'derivation_field', field: 'geometry.sequence' },
    classes: [
      {
        tag: 'geometry_class',
        id: 'a',
        cardinality: 'exact',
        order: 'exact',
        provenance: 'exact',
        payloadAssurance: 'carrier_only',
      },
      {
        tag: 'geometry_class',
        id: 'b',
        cardinality: 'exact',
        order: 'exact',
        provenance: 'exact',
        payloadAssurance: 'carrier_only',
      },
    ],
  },
  influence: {
    tag: 'finite_paired_witnesses',
    witnesses: [{
      tag: 'paired_input',
      id: 'show_changes_geometry',
      exampleIndex: 0,
      input: { tag: 'request_path', pathId: 'influence.show' },
      leftValue: true,
      rightValue: false,
      affected: [{ tag: 'derivation_field', field: 'geometry.sequence' }],
      protected: [{ tag: 'derivation_field', field: 'table.rows' }],
    }],
  },
  summary: {
    tag: 'fact_template',
    expectedFacts: { tag: 'derivation_field', field: 'summary.facts' },
    requiredPlaceholders: ['rows', 'label'],
    missingFactPolicy: 'refuse',
    unknownFactPolicy: 'refuse',
  },
  disclosures: {
    tag: 'derived_disclosures',
    expectedFacts: { tag: 'derivation_field', field: 'disclosure.facts' },
  },
};

function evaluation(): AuthorityEvaluationV1 {
  return {
    evaluatorId: authority.evaluator.id,
    canonicalRequestDigest: digest,
    fields: {
      'table.rows': { tag: 'row_sequence', rows: [['a', 1], ['b', 2]] },
      'geometry.sequence': {
        tag: 'geometry_sequence',
        entries: [
          { tag: 'carrier', classId: 'a', provenance: ['sample', 'a', 0] },
          { tag: 'carrier', classId: 'b', provenance: ['sample', 'b', 0] },
          { tag: 'carrier', classId: 'a', provenance: ['sample', 'a', 1] },
        ],
      },
      'summary.facts': {
        tag: 'summary_fact_map',
        facts: { rows: '2', label: 'two series' },
      },
      'disclosure.facts': {
        tag: 'disclosure_fact_map',
        facts: {
          sourceKind: 'simulation',
          sourceAuthenticityVerified: false,
          referenceComparisonRun: false,
        },
      },
    },
  };
}

function observed(): AuthorityObservedOutputV1 {
  return {
    table: {
      columns: columns.map(({ key, header }) => ({ key, header })),
      rows: [['a', 1], ['b', 2]],
      rowsInline: 2,
      rowsTotal: 2,
    },
    geometry: [{
      tag: 'group',
      children: [
        { tag: 'axis' },
        {
          tag: 'data_mark',
          entry: {
            tag: 'canonical_geometry',
            classId: 'a',
            provenance: ['sample', 'a', 0],
            geometry: { x: 10, y: 20 },
          },
        },
        {
          tag: 'group',
          children: [
            { tag: 'text' },
            {
              tag: 'data_mark',
              entry: {
                tag: 'canonical_geometry',
                classId: 'b',
                provenance: ['sample', 'b', 0],
                geometry: { x: 30, y: 40 },
              },
            },
            { tag: 'decorative_mark' },
            {
              tag: 'data_mark',
              entry: {
                tag: 'canonical_geometry',
                classId: 'a',
                provenance: ['sample', 'a', 1],
                geometry: { x: 50, y: 60 },
              },
            },
          ],
        },
        { tag: 'disclosure' },
      ],
    }],
    summary: 'Authority figure. 2 rows for two series. 1 disclosure applies: Source is a simulation.',
    disclosures,
  };
}

function verify(
  nextAuthority: OutputAuthorityV1 = authority,
  nextEvaluation: AuthorityEvaluationV1 = evaluation(),
  nextObserved: AuthorityObservedOutputV1 = observed(),
) {
  return interpretOutputAuthorityModelV1(
    nextAuthority,
    template,
    columns,
    disclosures,
    digest,
    nextEvaluation,
    nextObserved,
  );
}

function codes(result: ReturnType<typeof verify>): string[] {
  return result.tag === 'invalid' ? result.violations.map((entry) => entry.code) : [];
}

describe('OutputAuthority algebra interpreter', () => {
  it('accepts exact ordered rows, global nested DFS carriers, summary facts, and disclosures', () => {
    expect(verify()).toEqual({ tag: 'valid', expectedRowsTotal: 2 });
  });

  it('derives row total from expected rows instead of a self-consistent compiler receipt', () => {
    const actual = observed() as any;
    actual.table.rows = [['a', 1]];
    actual.table.rowsInline = 1;
    actual.table.rowsTotal = 1;
    const result = verify(authority, evaluation(), actual);
    expect(codes(result)).toContain('AUTHORITY_TABLE_ROWS_MISMATCH');
    expect(codes(result)).toContain('AUTHORITY_TABLE_TOTAL_MISMATCH');
    if (result.tag === 'invalid') {
      expect(result.violations.find((entry) => entry.code === 'AUTHORITY_TABLE_TOTAL_MISMATCH')?.message)
        .toContain('rowsTotal must be 2');
    }
  });

  it('rejects row permutation, cell mutation, source-column drift, and non-finite domains', () => {
    const reordered = observed() as any;
    reordered.table.rows.reverse();
    expect(codes(verify(authority, evaluation(), reordered))).toContain(
      'AUTHORITY_TABLE_ROWS_MISMATCH',
    );

    const changed = observed() as any;
    changed.table.rows[0][1] = 1.5;
    expect(codes(verify(authority, evaluation(), changed))).toContain(
      'AUTHORITY_TABLE_ROWS_MISMATCH',
    );

    const wrongColumns = observed() as any;
    wrongColumns.table.columns.reverse();
    expect(codes(verify(authority, evaluation(), wrongColumns))).toContain(
      'AUTHORITY_TABLE_COLUMNS_MISMATCH',
    );

    const nonFinite = observed() as any;
    nonFinite.table.rows[0][1] = Number.POSITIVE_INFINITY;
    expect(codes(verify(authority, evaluation(), nonFinite))).toContain(
      'AUTHORITY_TABLE_CELL_DOMAIN_MISMATCH',
    );
  });

  it('preserves global inter-class DFS order while excluding only declared presentation roles', () => {
    const reordered = observed() as any;
    const nested = reordered.geometry[0].children[2].children;
    [nested[1], nested[3]] = [nested[3], nested[1]];
    expect(codes(verify(authority, evaluation(), reordered))).toContain(
      'AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH',
    );

    const extra = observed() as any;
    extra.geometry[0].children.push({
      tag: 'data_mark',
      entry: { tag: 'carrier', classId: 'unknown', provenance: 'extra' },
    });
    expect(codes(verify(authority, evaluation(), extra))).toContain(
      'AUTHORITY_GEOMETRY_CLASS_UNKNOWN',
    );
  });

  it('states the carrier-only limit exactly: coordinate payload changes are not certified', () => {
    const coordinateMutation = observed() as any;
    coordinateMutation.geometry[0].children[1].entry.geometry = {
      x: -999999,
      y: 999999,
      hidden: true,
    };
    expect(verify(authority, evaluation(), coordinateMutation).tag).toBe('valid');
  });

  it('can compare coordinates only when an independently derived exact payload is present', () => {
    const exactAuthority = structuredClone(authority) as any;
    exactAuthority.geometry.classes[0].payloadAssurance = 'canonical_geometry_exact';
    exactAuthority.geometry.classes[1].payloadAssurance = 'canonical_geometry_exact';
    const exactEvaluation = evaluation() as any;
    exactEvaluation.fields['geometry.sequence'].entries = [
      {
        tag: 'canonical_geometry',
        classId: 'a',
        provenance: ['sample', 'a', 0],
        geometry: { x: 10, y: 20 },
      },
      {
        tag: 'canonical_geometry',
        classId: 'b',
        provenance: ['sample', 'b', 0],
        geometry: { x: 30, y: 40 },
      },
      {
        tag: 'canonical_geometry',
        classId: 'a',
        provenance: ['sample', 'a', 1],
        geometry: { x: 50, y: 60 },
      },
    ];
    expect(verify(exactAuthority, exactEvaluation, observed()).tag).toBe('valid');

    const mutated = observed() as any;
    mutated.geometry[0].children[1].entry.geometry.x = 11;
    expect(codes(verify(exactAuthority, exactEvaluation, mutated))).toContain(
      'AUTHORITY_GEOMETRY_SEQUENCE_MISMATCH',
    );
  });

  it('fails closed on unknown/missing facts, disclosure drift, and request/evaluator drift', () => {
    const unknownFact = evaluation() as any;
    unknownFact.fields['summary.facts'].facts.extra = 'not declared';
    expect(codes(verify(authority, unknownFact, observed()))).toContain(
      'AUTHORITY_SUMMARY_FACTS_MISMATCH',
    );

    const missingField = evaluation() as any;
    delete missingField.fields['table.rows'];
    expect(codes(verify(authority, missingField, observed()))).toContain('AUTHORITY_FIELD_MISSING');

    const unknownField = evaluation() as any;
    unknownField.fields['compiler.receipt'] = { tag: 'row_sequence', rows: [] };
    expect(codes(verify(authority, unknownField, observed()))).toContain('AUTHORITY_FIELD_MISSING');

    const wrongDisclosure = observed() as any;
    wrongDisclosure.disclosures = [];
    expect(codes(verify(authority, evaluation(), wrongDisclosure))).toContain(
      'AUTHORITY_DISCLOSURE_MISMATCH',
    );

    const wrongDigest = evaluation() as any;
    wrongDigest.canonicalRequestDigest = 'sha256:not-the-request';
    expect(codes(verify(authority, wrongDigest, observed()))).toContain(
      'AUTHORITY_EVALUATOR_MISMATCH',
    );
  });

  it('detects repeated/cyclic nested groups without recursive traversal', () => {
    const actual = observed() as any;
    const cycle: any = { tag: 'group', children: [] };
    cycle.children.push(cycle);
    actual.geometry.push(cycle);
    expect(codes(verify(authority, evaluation(), actual))).toContain(
      'AUTHORITY_GEOMETRY_GRAPH_INVALID',
    );
  });
});
