import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/index.js';
import { compileGraphFigure, type ConnectionGraphFigureSpec } from '../src/render/compileFamilies.js';
import type { CompileContext } from '../src/render/compile.js';
import type { Mark } from '../src/render/model/renderPlan.js';
import { RenderLayoutCapacityError } from '../src/render/layout.js';

type Request = Record<string, any>;

function example(): Request {
  const contract = JSON.parse(readFileSync(path.resolve(import.meta.dirname,
    '../contract/skills/network.connection_graph.v1.json'), 'utf8'));
  return structuredClone(contract.examples.valid[0]);
}

function figure(request: Request) {
  const result = buildFigure(request);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

function refused(request: Request): void {
  expect(validateRequestValue(request).ok).toBe(true);
  const result = buildFigure(request);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Inadequate graph capacity was accepted.');
  expect(result.errors).toContainEqual(expect.objectContaining({
    code: 'RENDER_LAYOUT_UNAVAILABLE', stage: 'render', instancePath: '/presentation',
  }));
  expect('svg' in result).toBe(false);
}

function nodes(plan: ReturnType<typeof figure>['plan']) {
  return plan.panels[0].marks.flatMap((group) => {
    if (group.type !== 'group' || !group.id.startsWith('node-')) return [];
    const point = group.marks.find((mark): mark is Extract<Mark, { type: 'point' }> => mark.type === 'point')!;
    const label = group.marks.find((mark): mark is Extract<Mark, { type: 'text' }> => mark.type === 'text');
    return [{ id: group.id, x: point.points[0].x, y: point.points[0].y, radius: point.radius, label }];
  });
}

function population(count: number): Request {
  const request = example();
  request.data.nodeUniverse.ids = Array.from({ length: count }, (_value, index) => String(index + 1));
  delete request.data.nodeUniverse.groups;
  request.parameters.layout.mode = 'schematic_circular';
  request.parameters.nodeColorBy = 'none';
  return request;
}

function syntheticContext(): CompileContext {
  return {
    width: 4096, height: 4096, automaticHeight: true, title: 'Synthetic capacity control',
    themeId: 'scientific_light', sourceRequestDigest: `sha256:${'0'.repeat(64)}`,
    disclosures: [], sourceStatements: [], summary: 'Synthetic capacity control', returnedTableRows: 0,
  };
}

describe('complete circular graph capacity', () => {
  it.each(['schematic_circular', 'schematic_grouped_circular'] as const)(
    'separates every node and full degree label in %s without changing source values', (mode) => {
      const request = example();
      request.parameters.layout.mode = mode;
      const before = structuredClone(request);
      const result = figure(request);
      const complete = nodes(result.plan);
      expect(complete.map((node) => node.id)).toEqual(before.data.nodeUniverse.ids.map((id: string) => `node-${id}`));
      expect(complete.map((node) => node.label?.text)).toEqual(['5', '3', '2', '0']);
      expect(result.plan.height).toBeGreaterThan(440);
      for (const node of complete) {
        expect(node.label?.fontSize).toBe(9);
        expect(node.label?.textLength).toBe(node.label!.text.length * 6);
        expect(node.label?.anchor).toBe('end');
        expect(node.label?.x).toBe(node.x - node.radius - 4);
        expect(node.label?.y).toBe(node.y + 3);
        for (const other of complete) {
          if (node.id === other.id) continue;
          // Independent observable: the complete numeric label's screen rectangle
          // does not intersect another node's conservative marker rectangle.
          const left = node.label!.x - node.label!.textLength!;
          const right = node.label!.x;
          const top = node.label!.y - 18;
          const bottom = node.label!.y + 2;
          expect(right < other.x - other.radius || left > other.x + other.radius ||
            bottom < other.y - other.radius || top > other.y + other.radius).toBe(true);
        }
      }
      expect((result.artifact as Record<string, any>).canonicalRequest.data).toEqual(before.data);
      expect(request).toEqual(before);
    },
  );

  it('refuses a short fixed canvas and restores the identical complete graph on automatic height', () => {
    const request = example();
    const adequate = figure(request);
    request.presentation = { height: 440 };
    const before = structuredClone(request);
    refused(request);
    expect(request).toEqual(before);
    request.presentation.height = 'auto';
    const restored = figure(request);
    expect(restored.table).toEqual(adequate.table);
    expect(restored.artifact.derivation).toEqual(adequate.artifact.derivation);
    expect(restored.disclosures).toEqual(adequate.disclosures);
    expect(restored.plan.height).toBe(adequate.plan.height);
  });

  it('refuses width-limited capacity despite excess height and restores all30 nodes with sufficient width', () => {
    const request = population(30);
    request.presentation = { width: 720, height: 2000 };
    const before = structuredClone(request.data);
    refused(request);
    request.presentation.width = 1200;
    const restored = figure(request);
    expect(nodes(restored.plan)).toHaveLength(30);
    expect((restored.artifact as Record<string, any>).canonicalRequest.data).toEqual(before);
  });

  it('refuses automatic overflow without dropping nodes and preserves a bounded complete population', () => {
    const request = population(200);
    request.presentation = { width: 4096, height: 'auto' };
    refused(request);
    expect(request.data.nodeUniverse.ids).toHaveLength(200);
    request.data.nodeUniverse.ids = population(80).data.nodeUniverse.ids;
    const restored = figure(request);
    expect(nodes(restored.plan)).toHaveLength(80);
    expect(restored.plan.height).toBeLessThanOrEqual(4096);
  });

  it('retains node ordering, grouped sectors and the declared four-degree gaps', () => {
    const result = figure(example());
    const panel = result.plan.panels[0];
    const cx = panel.x + panel.width / 2;
    const cy = panel.y + panel.height / 2;
    const expected = [
      -Math.PI / 2 + (2 * Math.PI - 8 * Math.PI / 180) / 8,
      -Math.PI / 2 + 3 * (2 * Math.PI - 8 * Math.PI / 180) / 8,
      -Math.PI / 2 + 5 * (2 * Math.PI - 8 * Math.PI / 180) / 8,
      -Math.PI / 2 + 7 * (2 * Math.PI - 8 * Math.PI / 180) / 8 + 4 * Math.PI / 180,
    ];
    const complete = nodes(result.plan);
    complete.forEach((node, index) => {
      const radius = Math.hypot(node.x - cx, node.y - cy);
      expect((node.x - cx) / radius).toBeCloseTo(Math.cos(expected[index]), 10);
      expect((node.y - cy) / radius).toBeCloseTo(Math.sin(expected[index]), 10);
    });
  });

  it('does not invent degree labels when only complete markers need capacity', () => {
    const request = population(12);
    delete request.parameters.degreeAnnotation;
    const result = figure(request);
    const complete = nodes(result.plan);
    expect(complete).toHaveLength(12);
    expect(complete.every((node) => node.label === undefined)).toBe(true);
    for (let index = 1; index < complete.length; index++) {
      const left = complete[index - 1];
      const right = complete[index];
      expect(Math.hypot(left.x - right.x, left.y - right.y)).toBeGreaterThan(left.radius + right.radius);
    }
  });

  it('accepts a singleton without a fictitious neighbor gap and refuses its inadequate fixed counterpart', () => {
    const context = syntheticContext();
    const spec: ConnectionGraphFigureSpec = {
      nodes: [{ id: 'only-node', degree: 0 }], edges: [], layout: 'schematic_circular',
      parallelDisplay: 'separate_lanes', maxLanes: 4, nodeColorByGroup: false,
      encodeDegreeAsArea: true, degreeLabel: 'total-degree',
    };
    const adequate = compileGraphFigure(context, spec, 'synthetic-capacity-control');
    expect(adequate.panels[0].marks.filter((mark) => mark.type === 'group')).toHaveLength(1);
    expect(() => compileGraphFigure({ ...context, height: 120, automaticHeight: false }, spec,
      'synthetic-capacity-control')).toThrow(RenderLayoutCapacityError);
    expect(compileGraphFigure(context, spec, 'synthetic-capacity-control')).toEqual(adequate);
  });

  it('refuses collapsed grouped angles and restores the exact declared node universe', () => {
    const context = syntheticContext();
    const spec: ConnectionGraphFigureSpec = {
      nodes: Array.from({ length: 90 }, (_value, index) => ({ id: String(index), groupIndex: index })),
      edges: [], layout: 'schematic_grouped_circular', parallelDisplay: 'separate_lanes',
      maxLanes: 4, nodeColorByGroup: false, encodeDegreeAsArea: false,
    };
    expect(() => compileGraphFigure(context, spec, 'synthetic-capacity-control')).toThrow(RenderLayoutCapacityError);
    const restored = compileGraphFigure(context, { ...spec, nodes: spec.nodes.map((node) => ({ ...node, groupIndex: 0 })) }, 'synthetic-capacity-control');
    expect(restored.panels[0].marks.filter((mark) => mark.type === 'group' && mark.id.startsWith('node-'))).toHaveLength(90);
  });
});
