import { describe, expect, it } from 'vitest';

import type { RenderPlanV1 } from '../src/render/model/renderPlan.js';
import {
  RenderPlanGeometryError,
  countPlanResources,
  renderSvg,
} from '../src/render/svg.js';

function planWithArrow(
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  size = 6,
): RenderPlanV1 {
  return {
    version: 1,
    figureId: 'fig-arrow-proof',
    skillId: 'neuro.phase_plane',
    width: 320,
    height: 240,
    title: 'Arrow proof',
    themeId: 'light',
    panels: [{
      id: 'main',
      x: 20,
      y: 20,
      width: 280,
      height: 180,
      axes: [],
      marks: [{
        type: 'group',
        id: 'nested-direction',
        marks: [{ type: 'arrow', arrows: [{ from, to }], fill: '#000000', size }],
      }],
    }],
    disclosures: [],
    table: {
      policy: 'complete_returned',
      columns: [],
      rows: [],
      rowsInline: 0,
      rowsTotal: 0,
    },
    accessibility: { summary: 'One direction arrow.', panelSummaries: [] },
    sourceRequestDigest: `sha256:${'0'.repeat(64)}`,
  };
}

describe('ArrowMark geometry is fail-closed', () => {
  it.each([
    ['zero length', { x: 1, y: 2 }, { x: 1, y: 2 }, 6],
    ['non-finite endpoint', { x: 1, y: 2 }, { x: Number.NaN, y: 3 }, 6],
    ['non-positive size', { x: 1, y: 2 }, { x: 3, y: 4 }, 0],
  ] as const)('refuses %s before counting or serialization', (_label, from, to, size) => {
    const plan = planWithArrow(from, to, size);
    for (const attempt of [
      () => countPlanResources(plan),
      () => renderSvg(plan, () => `sha256:${'1'.repeat(64)}`),
    ]) {
      expect(attempt).toThrowError(RenderPlanGeometryError);
      try {
        attempt();
      } catch (error) {
        expect(error).toMatchObject({ panelId: 'main' });
        expect((error as RenderPlanGeometryError).markPath).toMatch(/\/(?:arrows\/0|size)$/);
      }
    }
  });

  it('counts and emits every valid arrow instead of filtering the array', () => {
    const plan = planWithArrow({ x: 1, y: 2 }, { x: 3, y: 4 });
    expect(countPlanResources(plan).markCount).toBe(1);
    const rendered = renderSvg(plan, () => `sha256:${'1'.repeat(64)}`);
    expect(rendered.markCount).toBe(1);
    expect(rendered.svg).toContain('<path d="M3,4');
  });
});
