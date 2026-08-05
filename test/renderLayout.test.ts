import { describe, expect, it } from 'vitest';

import {
  LEGEND_ROW_HEIGHT,
  legendColumnCount,
  legendPlotInset,
  legendStartY,
  legendTextLayout,
} from '../src/render/layout.js';

describe('stable renderer legend layout', () => {
  it('uses two columns only when every exact label fits its deterministic allotment', () => {
    const short = Array.from({ length: 6 }, (_, index) => `series ${index + 1}`);
    const long = [...short.slice(0, 5), 'scientifically qualified legend statement '.repeat(4)];

    expect(legendColumnCount(960, 0, [])).toBe(0);
    expect(legendColumnCount(960, 1, ['series'])).toBe(1);
    expect(legendColumnCount(320, 6, short)).toBe(1);
    expect(legendColumnCount(960, 6, short)).toBe(2);
    expect(legendColumnCount(960, 6, long)).toBe(1);
    expect(legendPlotInset(960, 6, false, short)).toBe(3 * LEGEND_ROW_HEIGHT);
    expect(legendPlotInset(960, 6, true, long)).toBeGreaterThan(16 + 6 * LEGEND_ROW_HEIGHT);
    const wrapped = legendTextLayout(960, long);
    expect(wrapped.items[5].lines.length).toBeGreaterThan(1);
    expect(wrapped.items[5].lines.join('')).toBe(long[5]);
  });

  it('places consecutive legend baselines on non-overlapping rows', () => {
    const start = legendStartY(true);
    expect(Array.from({ length: 6 }, (_, index) => start + index * LEGEND_ROW_HEIGHT))
      .toEqual([64, 82, 100, 118, 136, 154]);
  });
});
