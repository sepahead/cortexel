/** Shared deterministic layout constants used by compilers and the SVG serializer. */

export const LEGEND_ROW_HEIGHT = 18;
/** Minimum plot-box height that can contain ticks, a panel label, and visible data. */
export const MIN_PLOT_PANEL_HEIGHT = 48;

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
