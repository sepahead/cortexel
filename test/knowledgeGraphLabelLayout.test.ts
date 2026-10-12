import { describe, expect, it } from 'vitest';
import {
  createKnowledgeGraphLabelLayout,
  layoutKnowledgeGraphLabelsInto,
  planKnowledgeGraphLabelCandidates,
  KNOWLEDGE_GRAPH_LABEL_HEIGHT_PX,
} from '../react/knowledgeGraphLabelLayout.internal';

describe('bounded graph labels', () => {
  it('keeps selection and query priorities within the fixed cap without changing input records', () => {
    const nodes = Array.from({ length: 250 }, (_, i) => ({
      id: `n${String(i).padStart(3, '0')}`,
      label: `Record ${i}`,
    }));
    const before = JSON.stringify(nodes);
    const candidates = planKnowledgeGraphLabelCandidates(nodes, 'n249', 'n248', new Set(['n247']));
    expect(candidates).toHaveLength(64);
    expect(candidates.slice(0, 3).map((x) => x.id)).toEqual(['n249', 'n248', 'n247']);
    expect(JSON.stringify(nodes)).toBe(before);
    expect(() =>
      planKnowledgeGraphLabelCandidates(
        [...nodes, { id: 'extra', label: 'extra' }],
        null,
        null,
        new Set(),
      ),
    ).toThrow();
    expect(planKnowledgeGraphLabelCandidates(nodes, 'unknown', null, new Set())[0].id).toBe('n000');
  });
  it('shows each label that fits and rejects the corresponding invalid projection', () => {
    const candidates = planKnowledgeGraphLabelCandidates(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      null,
      null,
      new Set(),
    );
    const nodes = new Float64Array([90, 100, 12, 0, 1, 250, 100, 12, 0, 1]);
    const widths = new Float32Array([60, 60]);
    const layout = createKnowledgeGraphLabelLayout(2);
    expect(layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 240, layout)).toBe(2);
    expect(layout.visible).toEqual(new Uint8Array([1, 1]));
    expect(layout.y[0]).toBeLessThan(100);
    expect(layout.y[1]).toBeLessThan(100);
    nodes[3] = 2;
    nodes[8] = 2;
    expect(layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 240, layout)).toBe(0);
    expect(layout.visible).toEqual(new Uint8Array([0, 0]));
  });
  it('keeps every accepted rectangle inside the viewport and separate from other labels and nodes', () => {
    const rows = Array.from({ length: 16 }, (_, i) => ({ id: `node:${i}`, label: `Node ${i}` }));
    const candidates = planKnowledgeGraphLabelCandidates(rows, null, null, new Set());
    const nodes = new Float64Array(rows.length * 5);
    const widths = new Float32Array(rows.length).fill(72);
    for (let i = 0; i < rows.length; i++) {
      nodes.set([35 + (i % 4) * 100, 45 + Math.floor(i / 4) * 90, 8, 0, 1], i * 5);
    }
    const layout = createKnowledgeGraphLabelLayout(rows.length);
    expect(
      layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 390, layout),
    ).toBeGreaterThan(0);
    for (let i = 0; i < candidates.length; i++)
      if (layout.visible[i]) {
        expect(layout.x[i] - widths[i] / 2).toBeGreaterThanOrEqual(8);
        expect(layout.x[i] + widths[i] / 2).toBeLessThanOrEqual(382);
        expect(layout.y[i] - KNOWLEDGE_GRAPH_LABEL_HEIGHT_PX / 2).toBeGreaterThanOrEqual(8);
        expect(layout.y[i] + KNOWLEDGE_GRAPH_LABEL_HEIGHT_PX / 2).toBeLessThanOrEqual(382);
        for (let j = 0; j < i; j++)
          if (layout.visible[j])
            expect(
              Math.abs(layout.x[i] - layout.x[j]) >= (widths[i] + widths[j]) / 2 + 3 ||
                Math.abs(layout.y[i] - layout.y[j]) >= 27,
            ).toBe(true);
        for (let n = 0; n < rows.length; n++) {
          const dx = Math.max(0, Math.abs(nodes[n * 5] - layout.x[i]) - widths[i] / 2);
          const dy = Math.max(0, Math.abs(nodes[n * 5 + 1] - layout.y[i]) - 12);
          expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(10);
        }
      }
  });
  it('does not display an offscreen or oversized label as if it were visible source geometry', () => {
    const candidates = planKnowledgeGraphLabelCandidates(
      [{ id: 'a', label: 'A' }],
      null,
      null,
      new Set(),
    );
    const nodes = new Float64Array([200, 100, 8, 0, 1]);
    const widths = new Float32Array([100]);
    const layout = createKnowledgeGraphLabelLayout(1);
    expect(layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 240, layout)).toBe(1);
    nodes[0] = 800;
    expect(layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 240, layout)).toBe(0);
    nodes[0] = 200;
    widths[0] = 500;
    expect(layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 240, layout)).toBe(0);
  });
  it('rejects a viewport or scratch capacity that cannot contain the same valid label', () => {
    const candidates = planKnowledgeGraphLabelCandidates(
      [{ id: 'a', label: 'A' }],
      null,
      null,
      new Set(),
    );
    const nodes = new Float64Array([100, 100, 8, 0, 1]);
    const widths = new Float32Array([60]);
    const layout = createKnowledgeGraphLabelLayout(1);
    expect(layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 240, layout)).toBe(1);
    expect(layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 1, layout)).toBe(0);
    expect(
      layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 240, {
        ...layout,
        x: new Float64Array(0),
      }),
    ).toBe(0);
    expect(
      layoutKnowledgeGraphLabelsInto(
        candidates,
        new Float64Array(251 * 5),
        widths,
        390,
        240,
        layout,
      ),
    ).toBe(0);
    expect(layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, 390, 240, layout)).toBe(1);
  });
});
