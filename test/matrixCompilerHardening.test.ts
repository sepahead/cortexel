import { describe, expect, it } from 'vitest';

import type { CompileContext } from '../src/render/compile.js';
import { compileMatrixFigure, type MatrixFigureSpec } from '../src/render/compileFamilies.js';

const context: CompileContext = {
  sourceRequestDigest: `sha256:${'0'.repeat(64)}`,
  width: 720,
  height: 440,
  themeId: 'light',
  title: 'Matrix proof',
  disclosures: [],
  summary: 'placeholder',
  returnedTableRows: 500,
};

function spec(overrides: Partial<MatrixFigureSpec> = {}): MatrixFigureSpec {
  return {
    rowIds: ['source-like-id', 'target-like-id'],
    columnIds: ['source-like-id', 'target-like-id'],
    cells: [{ rowIndex: 1, columnIndex: 0, value: 1, state: 'present' }],
    observedRows: [true, true],
    valueSemantics: 'binary_presence',
    valueLabel: 'presence',
    summary: 'One source-to-target connection; rows are targets and columns are sources.',
    ...overrides,
  };
}

function rectMarks(plan: ReturnType<typeof compileMatrixFigure>) {
  return plan.panels[0].marks.filter((mark) => mark.type === 'rect');
}

describe('matrix compiler preserves evidence states', () => {
  it('places target at row 1 and source at column 0 without transposing or blanking the diagonal', () => {
    const plan = compileMatrixFigure(context, spec({
      cells: [
        { rowIndex: 1, columnIndex: 0, value: 1, state: 'present' },
        { rowIndex: 0, columnIndex: 0, value: 1, state: 'present' },
      ],
    }), 'network.adjacency_matrix');
    const panel = plan.panels[0];
    expect(panel.axes.map((axis) => axis.label)).toEqual([
      'source (column)',
      'target (row)',
    ]);
    const foreground = rectMarks(plan)[1];
    expect(foreground.type).toBe('rect');
    if (foreground.type !== 'rect') return;
    expect(foreground.rects).toHaveLength(2);
    expect(foreground.rects[0].x).toBe(foreground.rects[1].x);
    expect(foreground.rects[0].y).toBeGreaterThan(foreground.rects[1].y);
  });

  it('paints a measured numeric zero as a foreground cell with a contrast outline', () => {
    const plan = compileMatrixFigure(context, spec({
      cells: [{ rowIndex: 1, columnIndex: 0, value: 0, state: 'valued' }],
      valueSemantics: 'weight',
      colorScale: { class: 'diverging', center: 0 },
      valueLabel: 'weight',
    }), 'network.weight_matrix');
    const foreground = rectMarks(plan)[1];
    expect(foreground).toMatchObject({ type: 'rect', stroke: '#3a4046' });
    if (foreground.type === 'rect') expect(foreground.rects).toHaveLength(1);
  });

  it('keeps partial-missing and all-missing weights outside the numeric colour domain', () => {
    const plan = compileMatrixFigure(context, spec({
      cells: [
        { rowIndex: 0, columnIndex: 0, value: 5, state: 'valued' },
        { rowIndex: 0, columnIndex: 1, value: null, state: 'present_with_missing_value' },
        { rowIndex: 1, columnIndex: 0, value: null, state: 'present_without_value' },
      ],
      valueSemantics: 'weight',
      colorScale: { class: 'sequential' },
      valueLabel: 'weight',
    }), 'network.weight_matrix');
    const rects = rectMarks(plan);
    expect(rects).toHaveLength(4);
    if (rects[1].type === 'rect') expect(rects[1].rects).toHaveLength(1);
    if (rects[2].type === 'rect') expect(rects[2].rects).toHaveLength(1);
    if (rects[3].type === 'rect') expect(rects[3].rects).toHaveLength(1);
    expect(plan.legend?.map((entry) => entry.label).join(' '))
      .toContain('no partial aggregate is painted');
    expect(plan.legend?.map((entry) => entry.label).join(' '))
      .toContain('missing is not zero');
  });

  it('uses target-row authority to distinguish observed absence from not_observed', () => {
    const summary = 'One row complete and one row not observed.';
    const plan = compileMatrixFigure(context, spec({
      cells: [],
      observedRows: [true, false],
      summary,
    }), 'network.adjacency_matrix');
    const backgrounds = rectMarks(plan)[0];
    expect(backgrounds.type).toBe('rect');
    if (backgrounds.type === 'rect') {
      // Whole-panel not_observed authority plus one observed-row overlay.
      expect(backgrounds.rects).toHaveLength(2);
      expect(backgrounds.rects[1].height).toBeLessThan(backgrounds.rects[0].height);
    }
    expect(plan.legend?.map((entry) => entry.label).join(' ')).toContain('not_observed');
    expect(plan.accessibility.panelSummaries).toEqual([summary]);
  });

  it('uses one exact symmetric diverging radius for asymmetric observed extents', () => {
    const cells = [
      { rowIndex: 0, columnIndex: 0, value: -8, state: 'valued' as const },
      { rowIndex: 0, columnIndex: 1, value: -2, state: 'valued' as const },
      { rowIndex: 1, columnIndex: 0, value: 0, state: 'valued' as const },
      { rowIndex: 1, columnIndex: 1, value: 2, state: 'valued' as const },
    ];
    const plan = compileMatrixFigure(context, spec({
      cells,
      valueSemantics: 'weight',
      colorScale: { class: 'diverging', center: 0 },
      valueLabel: 'weight',
    }), 'network.weight_matrix');
    const foreground = rectMarks(plan)[1];
    expect(foreground.type).toBe('rect');
    if (foreground.type !== 'rect') return;
    const fills = foreground.rects.map((rect) => rect.fill);
    expect(fills).toEqual(['#0373ab', '#bad6e4', '#f7f7f7', '#eed2ba']);

    const squaredDistance = (hex: string): number => {
      const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
      return channels.reduce((total, channel) => total + (channel - 247) ** 2, 0);
    };
    // ±2 are both exactly one quarter of the shared radius 8. The palette endpoint
    // vectors have equal Euclidean norm and components divisible by four, so even the
    // final 8-bit colours retain exactly equal distance from the neutral center.
    expect(squaredDistance(fills[1])).toBe(squaredDistance(fills[3]));
    expect(squaredDistance(fills[1])).toBe(5_171);
    expect(squaredDistance(fills[0])).toBe(82_736);
    expect(squaredDistance(fills[3]) * 16).toBe(squaredDistance(fills[0]));

    const changedCenter = compileMatrixFigure(context, spec({
      cells,
      valueSemantics: 'weight',
      colorScale: { class: 'diverging', center: 1 },
      valueLabel: 'weight',
    }), 'network.weight_matrix');
    const changedForeground = rectMarks(changedCenter)[1];
    expect(changedForeground.type).toBe('rect');
    if (changedForeground.type === 'rect') {
      expect(changedForeground.rects.map((rect) => rect.fill)).not.toEqual(fills);
    }

    expect(() => compileMatrixFigure(context, spec({
      cells: cells.slice(0, 2),
      valueSemantics: 'weight',
      colorScale: { class: 'diverging', center: 0 },
      valueLabel: 'weight',
    }), 'network.weight_matrix')).toThrow(
      'requires complete valued aggregates strictly below and above its center',
    );
  });
});
