/** Shared deterministic layout constants used by compilers and the SVG serializer. */

export const LEGEND_ROW_HEIGHT = 18;
/** Minimum plot-box height that can contain ticks, a panel label, and visible data. */
export const MIN_PLOT_PANEL_HEIGHT = 48;

export const DISCLOSURE_FONT_SIZE = 10;
export const DISCLOSURE_LINE_HEIGHT = 14;
export const DISCLOSURE_HORIZONTAL_INSET = 24;
export const DISCLOSURE_BOTTOM_PADDING = 6;
export const DISCLOSURE_PLOT_GAP = 10;

// SVG font metrics are host-dependent. Footer lines therefore receive a normative
// `textLength`; this advance is a deterministic wrapping unit, not a font measurement.
const DISCLOSURE_GLYPH_ADVANCE = 6;

function wrapTextToCapacity(text: string, capacity: number): readonly string[] {
  if (text.length === 0) return [''];
  const codePoints = Array.from(text);
  const lines: string[] = [];
  let start = 0;
  while (start < codePoints.length) {
    let end = Math.min(codePoints.length, start + capacity);
    if (end < codePoints.length) {
      for (let index = end - 1; index > start; index--) {
        if (/\s/u.test(codePoints[index])) {
          end = index;
          break;
        }
      }
    }
    lines.push(codePoints.slice(start, end).join(''));
    start = end;
  }
  return lines;
}

interface DisclosureText {
  readonly text: string;
}

export function disclosureAvailableWidth(width: number): number {
  return Math.max(1, width - 2 * DISCLOSURE_HORIZONTAL_INSET);
}

/**
 * Split one disclosure into exact, concatenable substrings.
 *
 * The result never inserts, removes, or rewrites a code point: joining every line with
 * the empty string recovers `text` byte-for-byte. A whitespace boundary is preferred,
 * while an overlong token is split rather than allowed to leave the SVG viewport.
 */
export function wrapDisclosureText(text: string, width: number): readonly string[] {
  const capacity = Math.max(
    1,
    Math.floor(disclosureAvailableWidth(width) / DISCLOSURE_GLYPH_ADVANCE),
  );
  return wrapTextToCapacity(text, capacity);
}

export function disclosureRenderedTextLength(text: string, width: number): number {
  return Math.min(
    disclosureAvailableWidth(width),
    Math.max(1, Array.from(text).length * DISCLOSURE_GLYPH_ADVANCE),
  );
}

export function disclosureLineCount(
  width: number,
  disclosures: readonly DisclosureText[],
): number {
  let count = 0;
  for (const disclosure of disclosures) count += wrapDisclosureText(disclosure.text, width).length;
  return count;
}

/** Vertical space reserved below every plot for the complete visible footer. */
export function disclosureFooterHeight(
  width: number,
  disclosures: readonly DisclosureText[],
): number {
  return disclosureLineCount(width, disclosures) * DISCLOSURE_LINE_HEIGHT + DISCLOSURE_PLOT_GAP;
}

export function legendStartY(hasSubtitle: boolean): number {
  return hasSubtitle ? 64 : 48;
}

export function legendColumnCount(
  width: number,
  itemCount: number,
  labels: readonly string[] = [],
): number {
  if (itemCount <= 0) return 0;
  if (width < 640 || itemCount === 1) return 1;
  // SVG font metrics are host-dependent. Use the same conservative normative
  // advance as the footer rather than measuring host fonts: two columns are
  // admitted only when every exact label fits beside its glyph and gutter.
  const twoColumnTextWidth = (width - 48) / 2 - 40;
  const labelsFitTwoColumns = labels.length === itemCount && labels.every(
    (label) => Array.from(label).length * DISCLOSURE_GLYPH_ADVANCE <= twoColumnTextWidth,
  );
  return labelsFitTwoColumns ? 2 : 1;
}

export interface LegendTextLayout {
  readonly columns: number;
  readonly itemWidth: number;
  readonly totalHeight: number;
  readonly items: readonly {
    readonly lines: readonly string[];
    readonly yOffset: number;
  }[];
}

/** Deterministic, host-font-independent legend wrapping and row allocation. */
export function legendTextLayout(
  width: number,
  labels: readonly string[],
): LegendTextLayout {
  const columns = legendColumnCount(width, labels.length, labels);
  if (columns === 0) return { columns: 0, itemWidth: 0, totalHeight: 0, items: [] };
  const itemWidth = (width - 48) / columns;
  const capacity = Math.max(
    1,
    Math.floor((itemWidth - 40) / DISCLOSURE_GLYPH_ADVANCE),
  );
  const lines = labels.map((label) => wrapTextToCapacity(label, capacity));
  const items: { lines: readonly string[]; yOffset: number }[] = [];
  let yOffset = 0;
  for (let row = 0; row < Math.ceil(labels.length / columns); row += 1) {
    let rowLines = 1;
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (index < lines.length) rowLines = Math.max(rowLines, lines[index].length);
    }
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (index < lines.length) items[index] = { lines: lines[index], yOffset };
    }
    yOffset += rowLines * LEGEND_ROW_HEIGHT;
  }
  return { columns, itemWidth, totalHeight: yOffset, items };
}

/** Vertical plot inset needed for a one-row-per-series legend above the panels. */
export function legendPlotInset(
  width: number,
  itemCount: number,
  hasSubtitle: boolean,
  labels: readonly string[] = [],
): number {
  if (itemCount <= 0) return 0;
  const effectiveLabels = labels.length === itemCount
    ? labels
    : Array.from({ length: itemCount }, () => '');
  return (hasSubtitle ? 16 : 0) + legendTextLayout(width, effectiveLabels).totalHeight;
}
