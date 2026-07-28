import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { THEMES } from '../src/generated/catalog.js';
import type { Mark } from '../src/render/model/renderPlan.js';
import { buildFigure } from '../src/render/index.js';

const SKILL_ROOT = path.resolve(import.meta.dirname, '../contract/skills');

function example(file: string, index: number): Record<string, any> {
  const source = JSON.parse(readFileSync(path.join(SKILL_ROOT, file), 'utf8')) as {
    examples: { valid: Record<string, any>[] };
  };
  return structuredClone(source.examples.valid[index]);
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)]
    .sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

function groupsWithPrefix(marks: readonly Mark[], prefix: string): Array<Extract<Mark, { type: 'group' }>> {
  const groups: Array<Extract<Mark, { type: 'group' }>> = [];
  for (const mark of marks) {
    if (mark.type !== 'group') continue;
    if (mark.id.startsWith(prefix)) groups.push(mark);
    groups.push(...groupsWithPrefix(mark.marks, prefix));
  }
  return groups;
}

function essentialStrokes(group: Extract<Mark, { type: 'group' }>): string[] {
  return group.marks.flatMap((mark) => {
    if (mark.type === 'line') return [mark.stroke];
    if (mark.type === 'arrow') return [mark.fill];
    if (mark.type === 'rect' && mark.stroke) return [mark.stroke];
    return [];
  });
}

function built(request: Record<string, any>, themeId: keyof typeof THEMES) {
  request.presentation = { ...(request.presentation ?? {}), themeId };
  const result = buildFigure(request);
  if (!result.ok) {
    throw new Error(result.errors.map((error) => `${error.code}: ${error.message}`).join('\n'));
  }
  return result;
}

describe('owned scientific-mark perception evidence', () => {
  it.each(Object.keys(THEMES) as Array<keyof typeof THEMES>)(
    '%s neutral scientific strokes meet the registered token-pair target',
    (themeId) => {
      const theme = THEMES[themeId];
      expect(contrastRatio(theme.axis, theme.background), themeId).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(theme.grid, theme.background), `${themeId} decorative grid control`)
        .toBeLessThan(3);

      const phase = built(example('neuro.phase_plane.v1.json', 0), themeId);
      const phaseGroups = groupsWithPrefix(phase.plan.panels[0].marks, 'field-sample-')
        .filter((group) => essentialStrokes(group).length > 0);

      const graph = built(example('network.connection_graph.v1.json', 1), themeId);
      const graphGroups = groupsWithPrefix(graph.plan.panels[0].marks, 'edge-');

      const spatialRequest = example('network.spatial_map_2d.v1.json', 0);
      delete spatialRequest.parameters.connectionDisplay;
      const spatial = built(spatialRequest, themeId);
      const spatialGroups = [
        ...groupsWithPrefix(spatial.plan.panels[0].marks, 'declared-domain'),
        ...groupsWithPrefix(spatial.plan.panels[0].marks, 'connection-pair-'),
      ];

      for (const [label, groups] of [
        ['phase-plane vectors', phaseGroups],
        ['connection-graph edges', graphGroups],
        ['spatial boundaries and connections', spatialGroups],
      ] as const) {
        expect(groups.length, `${themeId} ${label}`).toBeGreaterThan(0);
        const strokes = groups.flatMap(essentialStrokes);
        expect(strokes.length, `${themeId} ${label}`).toBeGreaterThan(0);
        expect(new Set(strokes), `${themeId} ${label}`).toEqual(new Set([theme.axis]));
        expect(strokes.every(
          (stroke) => contrastRatio(stroke, theme.background) >= 3,
        ), `${themeId} ${label}`).toBe(true);
      }
    },
  );
});
