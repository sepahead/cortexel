import { describe, expect, it } from 'vitest';

import {
  LEGEND_ROW_HEIGHT,
  legendColumnCount,
  legendPlotInset,
  legendStartY,
  legendTextLayout,
  headerRenderedTextLength,
  headerTextLayout,
  RenderLayoutCapacityError,
  TITLE_FONT_SIZE,
  TITLE_LINE_HEIGHT,
  SUBTITLE_FONT_SIZE,
  SUBTITLE_LINE_HEIGHT,
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

describe('complete source-bound header layout', () => {
  it.each([
    ['unbroken', 'W'.repeat(120)],
    ['whitespace', '  declared   population  '.repeat(4)],
    ['Unicode', '膜電位 α β 🧠 '.repeat(8)],
  ])('retains exact %s text at narrow and wide canvas widths', (_name, text) => {
    for (const width of [160, 720, 4096]) {
      const layout = headerTextLayout(width, text, text);
      expect(layout.titleLines.join('')).toBe(text);
      expect(layout.subtitleLines.join('')).toBe(text);
      for (const line of layout.titleLines) {
        expect(headerRenderedTextLength(line, width, TITLE_FONT_SIZE)).toBeLessThanOrEqual(width - 48);
      }
      for (const line of layout.subtitleLines) {
        expect(headerRenderedTextLength(line, width, SUBTITLE_FONT_SIZE)).toBeLessThanOrEqual(width - 48);
      }
      const titleBottom = 28 + (layout.titleLines.length - 1) * TITLE_LINE_HEIGHT;
      const subtitleBottom = layout.subtitleStartY + (layout.subtitleLines.length - 1) * SUBTITLE_LINE_HEIGHT;
      expect(layout.subtitleStartY - titleBottom).toBe(18);
      expect(layout.legendStartY - subtitleBottom).toBe(18);
    }
    expect(headerTextLayout(160, text).titleLines.length).toBeGreaterThan(1);
  });

  it('keeps an empty or absent subtitle distinct without adding hidden text', () => {
    const absent = headerTextLayout(720, 'A complete title');
    const empty = headerTextLayout(720, 'A complete title', '');
    expect(absent.subtitleLines).toEqual([]);
    expect(empty.subtitleLines).toEqual(['']);
    expect(absent.extraInset).toBe(0);
    expect(empty.extraInset).toBe(0);
    expect(absent.legendStartY).toBe(48);
    expect(empty.legendStartY).toBe(64);
  });

  it.each([NaN, Infinity, -1, 0, 48])('refuses width%s without a complete header region and accepts the restored width', (width) => {
    expect(() => headerTextLayout(width, 'Source title')).toThrow(RenderLayoutCapacityError);
    expect(headerTextLayout(160, 'Source title').titleLines.join('')).toBe('Source title');
  });
});
