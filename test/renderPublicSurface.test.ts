import { describe, expect, it } from 'vitest';

import * as renderSurface from '../src/render/index.js';

describe('cortexel/render-svg public authority boundary', () => {
  it('exports only end-to-end builders at runtime', () => {
    expect(Object.keys(renderSurface).sort()).toEqual([
      'buildFigure',
      'buildFigureFromJson',
      'buildFigureFromValidated',
    ]);

    for (const forbidden of [
      'renderSvg',
      'countPlanResources',
      'formatNumber',
      'formatCoordinate',
      'formatWithUnit',
      'linearScale',
      'linearTicks',
    ]) {
      expect(forbidden in renderSurface).toBe(false);
    }
  });
});
