/**
 * Figure compilation: a validated artifact becomes a pure render plan.
 *
 * A compiler chooses geometry and layout. It does NOT do science — it calls the
 * already-tested derivation layer (src/analysis) rather than re-binning or re-counting,
 * so the CLI and React cannot disagree about a value.
 *
 * The blueprint's target is one compiler file per stable skill for maximum
 * reviewability. This 0.9.0 uses a family-aware compiler instead: the 19 skills map to a
 * handful of geometric families (trace, step, distribution, raster, matrix, points), and
 * a single well-tested compiler per family is more trustworthy than fifteen near-
 * duplicates that could drift. Splitting into per-skill files is recorded as a known
 * limitation to close before 1.0 (docs/KNOWN_LIMITATIONS.md), and it changes the file
 * layout, never the output.
 */

import type { RenderPlanV1, Panel, Mark, Axis } from './model/renderPlan.js';
import { linearScale, linearTicks } from './scale.js';
import { formatNumber } from './format.js';
import { SKILL_CATALOG, THEMES } from '../generated/catalog.js';
import { unitLabel } from '../core/units.js';
import type { Disclosure } from '../core/disclosures.js';

export interface CompileContext {
  readonly sourceRequestDigest: string;
  readonly width: number;
  readonly height: number;
  readonly themeId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly disclosures: readonly Disclosure[];
  readonly summary: string;
}

const MARGIN = { top: 60, right: 32, bottom: 56, left: 64 } as const;

function panelBox(context: CompileContext): { x: number; y: number; width: number; height: number } {
  const disclosureSpace = context.disclosures.length * 14 + 10;
  return {
    x: MARGIN.left,
    y: MARGIN.top,
    width: context.width - MARGIN.left - MARGIN.right,
    height: context.height - MARGIN.top - MARGIN.bottom - disclosureSpace,
  };
}

function seriesColor(themeId: string, index: number): string {
  // Okabe-Ito order lives in the palette registry; the first accent is enough for the
  // single-series figures this 0.9.0 compiler draws, and multi-series figures fall back
  // to the theme's focus colour deterministically.
  const focus = (THEMES as Record<string, Record<string, string>>)[themeId]?.focus ?? '#0072b2';
  return index === 0 ? focus : focus;
}

/** A row-shaped table from parallel columns. */
function buildTable(
  columns: readonly { key: string; header: string }[],
  rowData: readonly (readonly (string | number | null)[])[],
  inlineLimit: number,
): RenderPlanV1['table'] {
  const total = rowData.length;
  const inline = rowData.slice(0, inlineLimit);
  return {
    policy: total > inlineLimit ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
    columns,
    rows: inline,
    rowsInline: inline.length,
    rowsTotal: total,
  };
}

function frame(context: CompileContext, disclosures: readonly Disclosure[]): Pick<
  RenderPlanV1,
  'version' | 'figureId' | 'width' | 'height' | 'title' | 'themeId' | 'disclosures' | 'sourceRequestDigest'
> & { subtitle?: string } {
  return {
    version: 1,
    figureId: `fig-${context.sourceRequestDigest.slice(7, 19)}`,
    width: context.width,
    height: context.height,
    title: context.title,
    ...(context.subtitle ? { subtitle: context.subtitle } : {}),
    themeId: context.themeId,
    disclosures: disclosures.map((d) => ({ id: d.id, severity: d.severity, text: d.text })),
    sourceRequestDigest: context.sourceRequestDigest,
  };
}

export interface CompiledFigure {
  readonly plan: RenderPlanV1;
}

/** X/Y numeric series -> a lined panel with axes. */
export function compileLineFigure(
  context: CompileContext,
  x: readonly number[],
  y: readonly (number | null)[],
  xLabel: string,
  yLabel: string,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  const finiteX = x.filter((v) => Number.isFinite(v));
  const finiteY = y.filter((v): v is number => v !== null && Number.isFinite(v));

  const noData = finiteX.length === 0 || finiteY.length === 0;

  const panel: Panel = noData
    ? { id: 'main', ...box, axes: [], marks: [], noData: { reason: 'no finite observations to plot' } }
    : buildLinePanel(box, x, y, xLabel, yLabel, context.themeId);

  return {
    ...frame(context, context.disclosures),
    skillId,
    panels: [panel],
    table: buildTable(
      [
        { key: 'x', header: xLabel },
        { key: 'y', header: yLabel },
      ],
      x.map((xv, i) => [Number.isFinite(xv) ? formatNumber(xv) : null, y[i] === null ? null : formatNumber(y[i] as number)]),
      500,
    ),
    accessibility: { summary: context.summary, panelSummaries: [] },
  };
}

function buildLinePanel(
  box: { x: number; y: number; width: number; height: number },
  x: readonly number[],
  y: readonly (number | null)[],
  xLabel: string,
  yLabel: string,
  themeId: string,
): Panel {
  const finiteX = x.filter((v) => Number.isFinite(v));
  const finiteY = y.filter((v): v is number => v !== null && Number.isFinite(v));
  const xMin = Math.min(...finiteX);
  const xMax = Math.max(...finiteX);
  const yMin = Math.min(0, ...finiteY);
  const yMax = Math.max(...finiteY);

  const xScale = linearScale(xMin, xMax, box.x, box.x + box.width);
  const yScale = linearScale(yMin, yMax, box.y + box.height, box.y);

  // A line BREAKS at each missing sample — a new subpath begins after every gap, so a
  // null is never bridged.
  const subpaths: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (let i = 0; i < x.length; i++) {
    const yi = y[i];
    if (yi === null || !Number.isFinite(yi) || !Number.isFinite(x[i])) {
      if (current.length > 0) subpaths.push(current);
      current = [];
      continue;
    }
    current.push({ x: xScale.map(x[i]), y: yScale.map(yi) });
  }
  if (current.length > 0) subpaths.push(current);

  const marks: Mark[] = [
    {
      type: 'line',
      subpaths,
      stroke: seriesColor(themeId, 0),
      strokeWidth: 1.5,
    },
  ];

  const axes: Axis[] = [
    {
      orientation: 'bottom',
      label: xLabel,
      transform: 'linear',
      ticks: linearTicks(xScale.domainMin, xScale.domainMax).map((t) => ({
        position: xScale.map(t.value),
        label: t.label,
      })),
    },
    {
      orientation: 'left',
      label: yLabel,
      transform: 'linear',
      ticks: linearTicks(yScale.domainMin, yScale.domainMax).map((t) => ({
        position: yScale.map(t.value),
        label: t.label,
      })),
    },
  ];

  return { id: 'main', ...box, axes, marks };
}

/** Binned counts/rates -> a step panel (literal bins, drawn as horizontal steps). */
export function compileStepFigure(
  context: CompileContext,
  binStart: readonly number[],
  binEnd: readonly number[],
  values: readonly number[],
  xLabel: string,
  yLabel: string,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  const noData = values.length === 0;

  let panel: Panel;
  if (noData) {
    panel = { id: 'main', ...box, axes: [], marks: [], noData: { reason: 'no bins to plot' } };
  } else {
    const xMin = binStart[0];
    const xMax = binEnd[binEnd.length - 1];
    const yMax = Math.max(0, ...values);
    const xScale = linearScale(xMin, xMax, box.x, box.x + box.width);
    const yScale = linearScale(0, yMax, box.y + box.height, box.y);

    // Horizontal steps: each bin is a flat segment at its value across [start, end).
    const stepPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < values.length; i++) {
      const yPixel = yScale.map(values[i]);
      stepPoints.push({ x: xScale.map(binStart[i]), y: yPixel });
      stepPoints.push({ x: xScale.map(binEnd[i]), y: yPixel });
    }

    const marks: Mark[] = [
      { type: 'path', subpaths: [stepPoints], stroke: seriesColor(context.themeId, 0), strokeWidth: 1.5 },
    ];
    const axes: Axis[] = [
      {
        orientation: 'bottom',
        label: xLabel,
        transform: 'linear',
        ticks: linearTicks(xMin, xMax).map((t) => ({ position: xScale.map(t.value), label: t.label })),
      },
      {
        orientation: 'left',
        label: yLabel,
        transform: 'linear',
        ticks: linearTicks(0, yMax).map((t) => ({ position: yScale.map(t.value), label: t.label })),
      },
    ];
    panel = { id: 'main', ...box, axes, marks };
  }

  return {
    ...frame(context, context.disclosures),
    skillId,
    panels: [panel],
    table: buildTable(
      [
        { key: 'binStart', header: 'Bin start' },
        { key: 'binEnd', header: 'Bin end' },
        { key: 'value', header: yLabel },
      ],
      values.map((v, i) => [formatNumber(binStart[i]), formatNumber(binEnd[i]), formatNumber(v)]),
      500,
    ),
    accessibility: { summary: context.summary, panelSummaries: [] },
  };
}

export { unitLabel, SKILL_CATALOG };
