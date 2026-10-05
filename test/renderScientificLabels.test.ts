import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildFigure } from '../src/render/index.js';

function example(skill: string): Record<string, any> {
  const contract = JSON.parse(readFileSync(
    path.resolve(import.meta.dirname, `../contract/skills/${skill}.v1.json`), 'utf8',
  ));
  return structuredClone(contract.examples.valid[0]);
}

function figure(request: Record<string, any>) {
  const result = buildFigure(request);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

describe('scientific labels preserve the requested quantity', () => {
  it.each(['in', 'out'] as const)('names the %s-degree distribution without implying both directions', (direction) => {
    const request = example('network.degree_distribution');
    request.parameters.direction = direction;
    const before = structuredClone(request);
    const result = figure(request);
    expect(result.plan.title).toBe(direction === 'in' ? 'In-degree distribution' : 'Out-degree distribution');
    expect(result.svg).not.toContain('In- and out-degree distribution');
    expect(result.plan.panels[0].axes.find((axis) => axis.orientation === 'bottom')?.label)
      .toBe(`${direction}-degree`);
    expect(request).toEqual(before);
  });

  it.each(['in', 'out'] as const)('retains a caller title and the complete %s-degree result', (direction) => {
    const request = example('network.degree_distribution');
    request.parameters.direction = direction;
    const ordinary = figure(request);
    request.presentation = { title: 'Connections in the declared population' };
    const titled = figure(request);
    expect(titled.plan.title).toBe('Connections in the declared population');
    expect(titled.table).toEqual(ordinary.table);
    expect(titled.artifact.derivation).toEqual(ordinary.artifact.derivation);
  });

  it('refuses an unsupported direction and renders the restored request', () => {
    const request = example('network.degree_distribution');
    request.parameters.direction = 'both';
    expect(buildFigure(request).ok).toBe(false);
    request.parameters.direction = 'in';
    expect(figure(request).plan.title).toBe('In-degree distribution');
  });

  it.each([
    ['in_degree', ['2', '2', '1', '0']],
    ['out_degree', ['3', '1', '1', '0']],
    ['total_degree', ['5', '3', '2', '0']],
  ])('displays every exact %s value with one explicit mode legend', (mode, expected) => {
    const request = example('network.connection_graph');
    request.parameters.degreeAnnotation.mode = mode;
    const before = structuredClone(request);
    const result = figure(request);
    const groups = result.plan.panels[0].marks.filter((mark) => mark.type === 'group' && mark.id.startsWith('node-'));
    const labels = groups.flatMap((group) => group.type === 'group'
      ? group.marks.filter((mark) => mark.type === 'text').map((mark) => mark.type === 'text' ? mark.text : '')
      : []);
    expect(labels).toEqual(expected);
    expect(groups.map((group) => group.type === 'group' ? group.id : '')).toEqual(['node-1', 'node-2', 'node-3', 'node-4']);
    expect(result.plan.legend?.filter((entry) => entry.label === `Node labels show ${String(mode).replaceAll('_', '-')}`)).toHaveLength(1);
    expect(result.svg).not.toMatch(/>(?:in|out|total)-degree \d+</u);
    expect(request).toEqual(before);
  });

  it('does not invent numeric labels when the request has no degree annotation', () => {
    const request = example('network.connection_graph');
    delete request.parameters.degreeAnnotation;
    const result = figure(request);
    const groups = result.plan.panels[0].marks.filter((mark) => mark.type === 'group' && mark.id.startsWith('node-'));
    expect(groups.flatMap((group) => group.type === 'group' ? group.marks.filter((mark) => mark.type === 'text') : [])).toEqual([]);
    expect(result.plan.legend?.some((entry) => entry.label.startsWith('Node labels show'))).toBe(false);
  });

  it('refuses degree annotations with an incomplete universe and restores all declared nodes', () => {
    const request = example('network.connection_graph');
    request.data.nodeUniverse.complete = false;
    expect(buildFigure(request).ok).toBe(false);
    request.data.nodeUniverse.complete = true;
    const restored = figure(request);
    expect(restored.plan.panels[0].marks.filter((mark) => mark.type === 'group' && mark.id.startsWith('node-'))).toHaveLength(4);
  });

  it('states the dimensionless phase unit without changing the dimensional axis or source', () => {
    const request = example('neuro.phase_plane');
    const before = structuredClone(request);
    const result = figure(request);
    expect(result.plan.panels[0].axes.find((axis) => axis.orientation === 'left')?.label)
      .toBe('Recovery variable (dimensionless)');
    expect(result.plan.panels[0].axes.find((axis) => axis.orientation === 'bottom')?.label)
      .toBe('Membrane potential (mV)');
    expect(result.svg).toContain('Recovery variable (dimensionless)');
    expect(request).toEqual(before);
  });

  it('refuses a mismatched phase unit and renders the restored canonical unit', () => {
    const request = example('neuro.phase_plane');
    request.data.trajectories.y.unit = 'mV';
    expect(buildFigure(request).ok).toBe(false);
    request.data.trajectories.y.unit = '1';
    expect(figure(request).plan.panels[0].axes.find((axis) => axis.orientation === 'left')?.label)
      .toBe('Recovery variable (dimensionless)');
  });
});
