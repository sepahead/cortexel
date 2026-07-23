import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { canonicalize } from '../src/core/canonicalize.js';
import { buildFigure } from '../src/render/index.js';

type CellKind = 'number' | 'string' | 'number|string';
type Contract = {
  readonly id: string;
  readonly status: string;
  readonly accessibility: {
    readonly tableColumns: readonly {
      readonly key: string;
      readonly header: string;
      readonly cellType: 'finite_number' | 'string' | 'finite_number_or_string';
      readonly nullable: boolean;
      readonly keyPart: boolean;
    }[];
  };
  readonly examples: { readonly valid: readonly Record<string, unknown>[] };
};

const contracts = readdirSync(path.resolve(import.meta.dirname, '../contract/skills'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(
    path.resolve(import.meta.dirname, `../contract/skills/${name}`),
    'utf8',
  )) as Contract)
  .filter((contract) => contract.status === 'stable')
  .sort((left, right) => left.id.localeCompare(right.id));

const readJson = (relativePath: string): Record<string, unknown> => JSON.parse(readFileSync(
  path.resolve(import.meta.dirname, '..', relativePath),
  'utf8',
)) as Record<string, unknown>;
const artifactAjv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictRequired: false,
  strictTypes: false,
  allowUnionTypes: true,
  validateFormats: false,
});
artifactAjv.addSchema(readJson('contract/schemas/common.v1.schema.json'));
artifactAjv.addSchema(readJson('contract/schemas/generated/registry-enums.v1.schema.json'));
artifactAjv.addSchema(readJson('contract/schemas/validation-error.v1.schema.json'));
for (const name of readdirSync(path.resolve(import.meta.dirname, '../contract/schemas/skills'))
  .filter((file) => file.endsWith('.request.v1.schema.json'))
  .sort()) {
  artifactAjv.addSchema(readJson(`contract/schemas/skills/${name}`));
}
artifactAjv.addSchema(readJson('contract/schemas/stable-figure-request-union.v1.schema.json'));
const validateArtifact = artifactAjv.compile(readJson('contract/schemas/figure-artifact.v1.schema.json'));

function expectedKind(column: Contract['accessibility']['tableColumns'][number]): CellKind {
  switch (column.cellType) {
    case 'finite_number': return 'number';
    case 'string': return 'string';
    case 'finite_number_or_string': return 'number|string';
  }
}
function cellKind(cell: string | number): Exclude<CellKind, 'number|string'> {
  return typeof cell === 'number' ? 'number' : 'string';
}

function structuralParityViolation(
  actualColumns: readonly { readonly key: string; readonly header: string }[],
  rows: readonly (readonly unknown[])[],
  declaredColumns: readonly { readonly key: string; readonly header: string }[],
): string | null {
  if (canonicalize(actualColumns) !== canonicalize(declaredColumns)) {
    return 'columns are not the exact ordered contract columns';
  }
  const badRow = rows.findIndex((row) => row.length !== declaredColumns.length);
  return badRow === -1
    ? null
    : `row ${badRow} has ${rows[badRow].length} cells for ${declaredColumns.length} columns`;
}

function contractById(id: string): Contract {
  const contract = contracts.find((candidate) => candidate.id === id);
  if (!contract) throw new Error(`missing stable contract ${id}`);
  return contract;
}

describe('stable accessibility tables are executable closed contracts', () => {
  it('sources every column type, nullability, and composite-key role for all 19 stable skills', () => {
    expect(contracts).toHaveLength(19);
    for (const contract of contracts) {
      const columns = contract.accessibility.tableColumns;
      const keys = columns.map((column) => column.key);
      expect(new Set(keys).size, `${contract.id}: duplicate declared column key`).toBe(keys.length);
      expect(
        columns.filter((column) => column.keyPart).length,
        `${contract.id}: at least one source-declared row-key component`,
      ).toBeGreaterThan(0);
      for (const column of columns) {
        expect(expectedKind(column), `${contract.id}.${column.key}: closed cell type`).toBeDefined();
        expect(typeof column.nullable, `${contract.id}.${column.key}: nullability`).toBe('boolean');
        expect(typeof column.keyPart, `${contract.id}.${column.key}: key role`).toBe('boolean');
      }
    }
  });

  for (const contract of contracts) {
    it(`${contract.id}: every living valid example emits exact columns, typed rows, and unique row keys`, () => {
      const declaredSchema = contract.accessibility.tableColumns;
      const declaredColumns = declaredSchema.map(({ key, header }) => ({ key, header }));
      for (let exampleIndex = 0; exampleIndex < contract.examples.valid.length; exampleIndex++) {
        const result = buildFigure(structuredClone(contract.examples.valid[exampleIndex]));
        expect(result.ok, `${contract.id} valid example ${exampleIndex}`).toBe(true);
        if (!result.ok) continue;
        expect(
          validateArtifact(result.artifact),
          `${contract.id} valid example ${exampleIndex} artifact: ${JSON.stringify(validateArtifact.errors)}`,
        ).toBe(true);
        expect(result.table.columns).toEqual(declaredColumns);
        expect(result.table.policy).toBe('complete_returned');
        expect(result.table.rowsInline).toBe(result.table.rowsTotal);
        expect(result.table.rows).toHaveLength(result.table.rowsTotal);
        expect(structuralParityViolation(
          result.table.columns,
          result.table.rows,
          declaredColumns,
        )).toBeNull();

        for (let rowIndex = 0; rowIndex < result.table.rows.length; rowIndex++) {
          const row = result.table.rows[rowIndex];
          expect(row, `${contract.id} example ${exampleIndex} row ${rowIndex}: width`).toHaveLength(declaredColumns.length);
          for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
            const cell = row[columnIndex];
            const key = declaredColumns[columnIndex].key;
            expect(cell, `${contract.id}.${key}: undefined is never a table value`).not.toBeUndefined();
            const column = declaredSchema[columnIndex];
            if (!column.nullable) {
              expect(cell, `${contract.id}.${key}: declared non-null column`).not.toBeNull();
            }
            if (cell === null) continue;
            const kind = expectedKind(column);
            if (kind !== 'number|string') {
              expect(cellKind(cell), `${contract.id}.${key}: cell type`).toBe(kind);
            }
            if (typeof cell === 'number') {
              expect(Number.isFinite(cell), `${contract.id}.${key}: finite number`).toBe(true);
            } else if (
              (cell.startsWith('{') && cell.endsWith('}')) ||
              (cell.startsWith('[') && cell.endsWith(']'))
            ) {
              const parsed = JSON.parse(cell);
              expect(canonicalize(parsed), `${contract.id}.${key}: canonical structured cell`).toBe(cell);
            }
          }
        }

        const keyIndices = declaredSchema
          .map((column, index) => column.keyPart ? index : -1)
          .filter((index) => index >= 0);
        const keys = result.table.rows.map((row) => canonicalize(
          keyIndices.map((index) => row[index]),
        ));
        expect(new Set(keys).size, `${contract.id} example ${exampleIndex}: row-key uniqueness`).toBe(keys.length);
      }
    });
  }

  it('the parity oracle detects omitted, extra, reordered, and wrong-width table mutations', () => {
    const contract = contractById('network.delay_matrix');
    const declared = contract.accessibility.tableColumns.map(({ key, header }) => ({ key, header }));
    const result = buildFigure(structuredClone(contract.examples.valid[0]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(structuralParityViolation(result.table.columns.slice(1), result.table.rows, declared))
      .toContain('exact ordered');
    expect(structuralParityViolation([...result.table.columns, { key: 'extra', header: 'Extra' }], result.table.rows, declared))
      .toContain('exact ordered');
    expect(structuralParityViolation(
      [result.table.columns[1], result.table.columns[0], ...result.table.columns.slice(2)],
      result.table.rows,
      declared,
    )).toContain('exact ordered');
    expect(structuralParityViolation(
      result.table.columns,
      [[...result.table.rows[0], null], ...result.table.rows.slice(1)],
      declared,
    )).toContain('row 0');
  });

  it('retains the declared schema for a valid zero-row result', () => {
    const contract = contractById('network.adjacency_matrix');
    const result = buildFigure(structuredClone(contract.examples.valid[3]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.table.columns).toEqual(
      contract.accessibility.tableColumns.map(({ key, header }) => ({ key, header })),
    );
    expect(result.table).toMatchObject({
      policy: 'complete_returned',
      rows: [],
      rowsInline: 0,
      rowsTotal: 0,
    });
  });

  it('uses phase-plane source ordinals to preserve duplicate scattered field samples', () => {
    const contract = contractById('neuro.phase_plane');
    const request = structuredClone(contract.examples.valid[1]) as any;
    request.data.vectorField.lattice = { kind: 'scattered' };
    for (const channel of ['x', 'y', 'dx', 'dy']) {
      request.data.vectorField[channel].values[1] = request.data.vectorField[channel].values[0];
    }
    const result = buildFigure(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const keys = result.table.columns.map((column) => column.key);
    const rowKindIndex = keys.indexOf('rowKind');
    const sourceOrdinalIndex = keys.indexOf('sourceOrdinal');
    const xIndex = keys.indexOf('x');
    const yIndex = keys.indexOf('y');
    const fieldRows = result.table.rows.filter((row) => row[rowKindIndex] === 'field_sample');
    expect(fieldRows[0][xIndex]).toBe(fieldRows[1][xIndex]);
    expect(fieldRows[0][yIndex]).toBe(fieldRows[1][yIndex]);
    expect(fieldRows.map((row) => row[sourceOrdinalIndex])).toEqual([0, 1, 2, 3]);
  });

  it('refuses an over-budget complete returned table instead of slicing it', () => {
    const contract = contractById('neuro.analog_trace');
    const request = structuredClone(contract.examples.valid[0]) as any;
    request.data.seriesIds = [request.data.seriesIds[0]];
    request.data.series = [request.data.series[0]];
    request.data.window.stop = 501;
    request.data.series[0].time.values = Array.from({ length: 501 }, (_value, index) => index);
    request.data.series[0].values.values = Array.from({ length: 501 }, () => -70);

    const result = buildFigure(request);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'RESOURCE_COMPACTION_UNAVAILABLE',
      stage: 'budget',
      skillId: 'neuro.analog_trace',
    }));
  });

  it('preserves high-risk derivation evidence in exact table cells', () => {
    const built = (id: string, exampleIndex = 0) => {
      const contract = contractById(id);
      const result = buildFigure(structuredClone(contract.examples.valid[exampleIndex]));
      expect(result.ok, `${id} semantic fixture`).toBe(true);
      if (!result.ok) throw new Error(`${id} fixture did not build`);
      const rows = result.table.rows.map((row) => Object.fromEntries(
        result.table.columns.map((column, index) => [column.key, row[index]]),
      ));
      return { result, rows };
    };

    const delay = built('network.delay_matrix').rows[0];
    expect(delay).toMatchObject({
      targetId: '2', sourceId: '1', delayAggregate: 1,
      contributingConnectionCount: 2, delayMin: 1, delayMax: 9,
      contributingEdgeIds: '["c1","c2"]',
    });

    const weight = built('network.weight_matrix').rows[0];
    expect(weight).toMatchObject({
      targetId: 't1', sourceId: 's1', aggregate: 4,
      contributingConnectionCount: 2, contributingWeightCount: 2,
      weightMin: -8, weightMax: 12, contributingEdgeIds: '["e1","e2"]',
    });

    const population = built('neuro.population_rate').rows;
    for (const row of population) {
      expect(row.rate).toBe(
        Number(row.count) * 1000 / (Number(row.recordedSenderCount) * Number(row.binWidth)),
      );
    }

    const isi = built('neuro.isi_distribution', 2).rows;
    expect(isi.reduce((total, row) => total + Number(row.count), 0)).toBe(2);
    expect(isi[0]).toMatchObject({
      binnedIntervalCount: 2, formedIntervalCount: 3, underRangeCount: 0,
      overRangeCount: 1, trainCount: 1, spikeCount: 4,
    });

    const targetRates = built('neuro.correlogram', 2).rows;
    for (const row of targetRates) {
      expect(row.valueStatus).toBe('defined');
      expect(row.valueUnit).toBe('Hz');
      expect(row.denominator).toBe(
        Number(row.eligibleReferenceEvents) *
          (Number(row.lagBinEnd) - Number(row.lagBinStart)) /
          1000,
      );
      expect(Number(row.value)).toBeCloseTo(
        Number(row.pairCount) / Number(row.denominator),
        12,
      );
    }
    expect(targetRates.find((row) => row.lagBinCenter === 0)).toMatchObject({
      pairCount: 0,
      value: 0,
    });
  });
});
