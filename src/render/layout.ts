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
  if (text.length === 0) return [''];
  const codePoints = Array.from(text);
  const capacity = Math.max(
    1,
    Math.floor(disclosureAvailableWidth(width) / DISCLOSURE_GLYPH_ADVANCE),
  );
  const lines: string[] = [];
  let start = 0;
  while (start < codePoints.length) {
    let end = Math.min(codePoints.length, start + capacity);
    if (end < codePoints.length) {
      for (let index = end - 1; index > start; index--) {
        if (/\s/u.test(codePoints[index])) {
          // Keep the whitespace as the first code point of the following substring.
          // SVG collapses it visually at the line boundary, while DOM textContent and
          // deterministic extraction still reconstruct the registry text exactly.
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

export function legendColumnCount(width: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  return Math.min(itemCount, width >= 640 ? 2 : 1);
}

/** Vertical plot inset needed for a one-row-per-series legend above the panels. */
export function legendPlotInset(width: number, itemCount: number, hasSubtitle: boolean): number {
  if (itemCount <= 0) return 0;
  const columns = legendColumnCount(width, itemCount);
  const rows = Math.ceil(itemCount / columns);
  return (hasSubtitle ? 16 : 0) + rows * LEGEND_ROW_HEIGHT;
}
