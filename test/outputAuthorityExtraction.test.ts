import { describe, expect, it } from 'vitest';

import { extractObservedOutputAuthorityV1 } from '../src/render/output-authority-extract.js';
import type { Mark, RenderPlanV1 } from '../src/render/model/renderPlan.js';
import type { AuthorityObservedGeometryNodeV1 } from '../src/core/output-authority.js';

const carrier = (classId: string, provenance: string) => ({
  tag: 'data_carrier' as const,
  classId,
  provenance,
});

function planWithMarks(marks: readonly Mark[]): RenderPlanV1 {
  return {
    version: 1,
    figureId: 'figure-test',
    skillId: 'test.skill',
    width: 640,
    height: 480,
    title: 'Test',
    themeId: 'light',
    sourceRequestDigest: 'sha256:test',
    panels: [{
      id: 'panel',
      x: 0,
      y: 0,
      width: 640,
      height: 440,
      axes: [{
        orientation: 'bottom',
        label: 'x',
        ticks: [],
        transform: 'linear',
      }],
      marks,
    }],
    disclosures: [{ id: 'D', severity: 'informational', text: 'Disclosure.' }],
    table: {
      policy: 'complete_returned',
      columns: [{ key: 'id', header: 'ID' }],
      rows: [['a']],
      rowsInline: 1,
      rowsTotal: 1,
    },
    accessibility: { summary: 'Summary.', panelSummaries: [] },
  };
}

function dataEntries(nodes: readonly AuthorityObservedGeometryNodeV1[]): unknown[] {
  const output: unknown[] = [];
  const pending = [...nodes].reverse();
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.tag === 'data_mark') output.push(node.entry);
    if (node.tag === 'group') {
      for (let index = node.children.length - 1; index >= 0; index--) {
        pending.push(node.children[index]);
      }
    }
  }
  return output;
}

describe('trusted RenderPlan OutputAuthority extraction', () => {
  it('classifies every closed atomic primitive and preserves nested plan order', () => {
    const marks: readonly Mark[] = [{
      type: 'group',
      id: 'nested',
      marks: [
        {
          type: 'line',
          subpaths: [[
            { x: 0, y: 0, authority: carrier('line', 'line-0') },
            { x: 1, y: 1, authority: { tag: 'connector' } },
          ]],
          stroke: '#000',
          strokeWidth: 1,
        },
        {
          type: 'arrow',
          arrows: [{
            from: { x: 0, y: 0 },
            to: { x: 1, y: 1 },
            authority: carrier('arrow', 'arrow-0'),
          }],
          fill: '#000',
          size: 4,
        },
        {
          type: 'point',
          points: [{ x: 1, y: 2, authority: carrier('point', 'point-0') }],
          fill: '#000',
          radius: 2,
          shape: 'circle',
        },
        {
          type: 'rect',
          rects: [{
            x: 1,
            y: 2,
            width: 3,
            height: 4,
            fill: '#000',
            authority: carrier('rect', 'rect-0'),
          }],
        },
        {
          type: 'rule',
          orientation: 'horizontal',
          lines: [{
            position: 1,
            from: 0,
            to: 2,
            authority: carrier('rule', 'rule-0'),
          }],
          stroke: '#000',
          strokeWidth: 1,
        },
        {
          type: 'area',
          subpaths: [[{
            x: 1,
            y0: 0,
            y1: 2,
            authority: carrier('area', 'area-0'),
          }]],
          fill: '#000',
          opacity: 0.5,
        },
        {
          type: 'path',
          subpaths: [[{
            x: 1,
            y: 2,
            authority: carrier('path', 'path-0'),
          }]],
          stroke: '#000',
          strokeWidth: 1,
        },
        {
          type: 'text',
          x: 0,
          y: 0,
          text: 'presentation only',
          anchor: 'start',
          fontSize: 12,
          fill: '#000',
        },
      ],
    }];

    const result = extractObservedOutputAuthorityV1(planWithMarks(marks));
    expect(result.tag).toBe('extracted');
    if (result.tag !== 'extracted') return;
    expect(dataEntries(result.observed.geometry).map((entry: any) => [
      entry.classId,
      entry.provenance,
      entry.geometry.tag,
    ])).toEqual([
      ['line', 'line-0', 'line_vertex'],
      ['arrow', 'arrow-0', 'arrow'],
      ['point', 'point-0', 'point'],
      ['rect', 'rect-0', 'rect'],
      ['rule', 'rule-0', 'rule'],
      ['area', 'area-0', 'area_vertex'],
      ['path', 'path-0', 'path_vertex'],
    ]);
    expect(result.observed.disclosures).toEqual(planWithMarks(marks).disclosures);
  });

  it('refuses an otherwise plausible unclassified extra atom', () => {
    const result = extractObservedOutputAuthorityV1(planWithMarks([{
      type: 'point',
      points: [
        { x: 1, y: 1, authority: carrier('samples', 'sample-0') },
        { x: 2, y: 2 },
      ],
      fill: '#000',
      radius: 2,
      shape: 'circle',
    }]));
    expect(result).toMatchObject({
      tag: 'invalid_plan_roles',
      problems: [{ path: '/panels/0/marks/0/points/1' }],
    });
  });

  it('refuses unknown role tags instead of treating them as decoration', () => {
    const result = extractObservedOutputAuthorityV1(planWithMarks([{
      type: 'point',
      points: [{ x: 1, y: 1, authority: { tag: 'axis' } as never }],
      fill: '#000',
      radius: 2,
      shape: 'circle',
    }]));
    expect(result.tag).toBe('invalid_plan_roles');
    if (result.tag === 'invalid_plan_roles') {
      expect(result.problems[0]?.message).toContain('unknown explicit role tag');
    }
  });

  it('excludes only explicit connector/decorative roles from data carriers', () => {
    const result = extractObservedOutputAuthorityV1(planWithMarks([{
      type: 'point',
      points: [
        { x: 1, y: 1, authority: { tag: 'connector' } },
        { x: 2, y: 2, authority: { tag: 'decorative_mark' } },
      ],
      fill: '#000',
      radius: 2,
      shape: 'circle',
    }]));
    expect(result.tag).toBe('extracted');
    if (result.tag === 'extracted') expect(dataEntries(result.observed.geometry)).toEqual([]);
  });

  it('rejects shared/cyclic mark graphs and excessive nesting before recursive conversion', () => {
    const shared: Mark = {
      type: 'point',
      points: [{ x: 1, y: 1, authority: carrier('samples', 'sample-0') }],
      fill: '#000',
      radius: 2,
      shape: 'circle',
    };
    expect(extractObservedOutputAuthorityV1(planWithMarks([shared, shared])).tag)
      .toBe('invalid_plan_roles');

    const cycle: any = { type: 'group', id: 'cycle', marks: [] };
    cycle.marks.push(cycle);
    expect(extractObservedOutputAuthorityV1(planWithMarks([cycle])).tag)
      .toBe('invalid_plan_roles');

    let deep: any = shared;
    for (let index = 0; index < 129; index++) {
      deep = { type: 'group', id: `group-${index}`, marks: [deep] };
    }
    expect(extractObservedOutputAuthorityV1(planWithMarks([deep])).tag)
      .toBe('invalid_plan_roles');
  });
});
