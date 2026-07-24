import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildFigure } from '../src/render/index.js';

type RecordValue = Record<string, any>;

function request(id: 'adjacency' | 'weight' | 'delay', index = 0): RecordValue {
  const source = JSON.parse(readFileSync(
    path.resolve(import.meta.dirname, `../contract/skills/network.${id}_matrix.v1.json`),
    'utf8',
  ));
  return structuredClone(source.examples.valid[index]);
}

function built(value: RecordValue): Extract<ReturnType<typeof buildFigure>, { ok: true }> {
  const result = buildFigure(value);
  expect(result.ok, result.ok ? '' : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

function rows(result: Extract<ReturnType<typeof buildFigure>, { ok: true }>): RecordValue[] {
  return result.table.rows.map((row) => Object.fromEntries(
    result.table.columns.map((column, index) => [column.key, row[index]]),
  ));
}

describe('matrix end-to-end renderer', () => {
  it('keeps target-row/source-column orientation, dense diagonal, and exact conservation receipt', () => {
    const result = built(request('adjacency'));
    const table = rows(result);
    expect(table).toHaveLength(16);
    expect(table.find((row) => row.rowIndex === 1 && row.columnIndex === 0))
      .toMatchObject({ targetId: '2', sourceId: '1', cellValue: 2 });
    expect(table.find((row) => row.rowIndex === 2 && row.columnIndex === 2))
      .toMatchObject({ targetId: '3', sourceId: '3', cellStatus: 'present', isAutapse: 'true' });
    const operation = (result.artifact.derivation as RecordValue).operations[0];
    expect(operation.receipt).toMatchObject({
      inputConnectionRows: 5,
      boundConnectionRows: 5,
      connectionConservationPassed: true,
    });
    expect(operation.parameters.axisOrder).toBe('target_rows_source_columns');
    expect(result.artifact.accessibility).toMatchObject({
      summary: expect.stringContaining('target rows by source columns'),
    });
  });

  it('paints complete zero-weight cells and keeps their exact zero in the table', () => {
    const result = built(request('weight'));
    const table = rows(result);
    expect(table).toContainEqual(expect.objectContaining({
      targetId: 't1',
      sourceId: 's3',
      cellState: 'valued',
      aggregate: 0,
      weightMin: 0,
      weightMax: 0,
    }));
    const rectangleMarks = result.plan.panels[0].marks.filter((mark) => mark.type === 'rect');
    const foreground = rectangleMarks[1];
    expect(foreground.type).toBe('rect');
    if (foreground.type === 'rect') {
      expect(foreground.rects).toHaveLength(3);
      expect(foreground.stroke).toBeDefined();
    }
  });

  it('returns a typed refusal when an exact max-plus-max cell cannot be represented', () => {
    const overflow = request('weight');
    overflow.data.connections.sourceIds = ['s1', 's1'];
    overflow.data.connections.targetIds = ['t1', 't1'];
    overflow.data.connections.edgeIds = ['max-a', 'max-b'];
    overflow.data.connections.synapseModels = ['static_synapse', 'static_synapse'];
    overflow.data.connections.weights.values = [Number.MAX_VALUE, Number.MAX_VALUE];
    const result = buildFigure(overflow);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE',
      stage: 'science',
    }));
  });

  it('converts delay aggregates once and paints a strictly positive domain', () => {
    const value = request('delay');
    value.parameters.displayUnit = { kind: 'delay', unit: 'us' };
    const result = built(value);
    const table = rows(result);
    expect(table[0]).toMatchObject({ delayAggregate: 1000, delayMin: 1000, delayMax: 9000 });
    const operation = (result.artifact.derivation as RecordValue).operations[0];
    expect(operation.receipt.unitConversionCount).toBe(1);
    expect(result.plan.legend?.[0].label).toContain('1000 to 4000');
  });
});
