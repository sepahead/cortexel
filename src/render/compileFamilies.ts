/**
 * The remaining render-family compilers.
 *
 * Each turns already-derived data into a pure render plan. As in compile.ts, a compiler
 * chooses geometry and never does science — the values arrive computed. Together with the
 * line and step compilers in compile.ts, these cover every stable figure family:
 * bars (distributions and PSTH), raster ticks, matrix cells, scatter points, correlogram
 * stems, points-with-guide (response curve), trajectories (phase plane), and a schematic
 * connection graph.
 */

import type { RenderPlanV1, Panel, Mark, Axis } from './model/renderPlan.js';
import {
  linearNumericScale,
  linearScale,
  linearTicks,
  logNumericScale,
  symlogNumericScale,
  type NumericScale,
} from './scale.js';
import { CATEGORICAL_SERIES_STYLES, THEMES } from '../generated/catalog.js';
import type { CompileContext } from './compile.js';
import { finiteExtent, finiteExtentBy } from '../core/numeric.js';
import { legendPlotInset } from './layout.js';
import type { PreparedTraceSeries } from '../analysis/traces.js';
import { formatNumber } from './format.js';

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

function accent(themeId: string): string {
  return (THEMES as Record<string, Record<string, string>>)[themeId]?.focus ?? '#0072b2';
}
function gridColor(themeId: string): string {
  return (THEMES as Record<string, Record<string, string>>)[themeId]?.grid ?? '#e2e6ea';
}
function uncertaintyStroke(themeId: string): string {
  return (THEMES as Record<string, Record<string, string>>)[themeId]?.axis ?? '#3a4046';
}
function missingColor(themeId: string): string {
  return (THEMES as Record<string, Record<string, string>>)[themeId]?.missing ?? '#767e87';
}

type MarkerShape = Extract<Mark, { type: 'point' }>['shape'];

function categoricalStyle(index: number): {
  readonly color: string;
  readonly dash: string;
  readonly marker: MarkerShape;
} {
  const style = CATEGORICAL_SERIES_STYLES[index % CATEGORICAL_SERIES_STYLES.length];
  return {
    color: style.color,
    dash: style.dash,
    marker: style.marker as MarkerShape,
  };
}

function frame(context: CompileContext, skillId: string): Pick<
  RenderPlanV1,
  'version' | 'figureId' | 'skillId' | 'width' | 'height' | 'title' | 'themeId' | 'disclosures' | 'sourceRequestDigest' | 'accessibility'
> & { subtitle?: string } {
  return {
    version: 1,
    figureId: `fig-${context.sourceRequestDigest.slice(7, 19)}`,
    skillId,
    width: context.width,
    height: context.height,
    title: context.title,
    ...(context.subtitle ? { subtitle: context.subtitle } : {}),
    themeId: context.themeId,
    disclosures: context.disclosures.map((d) => ({ id: d.id, severity: d.severity, text: d.text })),
    sourceRequestDigest: context.sourceRequestDigest,
    accessibility: { summary: context.summary, panelSummaries: [] },
  };
}

function emptyPanel(box: ReturnType<typeof panelBox>, reason: string): Panel {
  return { id: 'main', ...box, axes: [], marks: [], noData: { reason } };
}

export interface TracePanelSeries {
  readonly series: PreparedTraceSeries;
  readonly styleIndex: number;
  readonly tableMetadata?: Readonly<Record<string, string | number | null>>;
  readonly uncertaintyLower?: readonly (number | null)[];
  readonly uncertaintyUpper?: readonly (number | null)[];
  readonly uncertainty?: {
    readonly kind: string;
    readonly mark: 'band' | 'whisker';
    readonly label: string;
  };
}

export interface TracePanelSpec {
  readonly id: string;
  readonly label: string;
  readonly yLabel: string;
  readonly series: readonly TracePanelSeries[];
  readonly scale?: 'linear' | 'log' | 'symlog';
  readonly symlogLinearThreshold?: number;
}

export interface TraceFigureOptions {
  readonly xLabel: string;
  readonly xDomain?: readonly [number, number];
  readonly sharedXAxis?: boolean;
  readonly sharedYDomain?: boolean;
  readonly showSamplePoints?: boolean;
  readonly tableColumns?: readonly { readonly key: string; readonly header: string }[];
  readonly tableRow?: (
    entry: TracePanelSeries,
    observationIndex: number,
    panel: TracePanelSpec,
  ) => readonly (string | number | null)[];
  readonly summaryStatements?: readonly string[];
}

function traceYValues(entry: TracePanelSeries): number[] {
  return [
    ...entry.series.values,
    ...(entry.uncertaintyLower ?? []),
    ...(entry.uncertaintyUpper ?? []),
  ].filter((value): value is number => value !== null && Number.isFinite(value));
}

function traceSubpaths(
  series: PreparedTraceSeries,
  xScale: ReturnType<typeof linearScale>,
  yScale: ReturnType<typeof linearScale>,
): { x: number; y: number }[][] {
  const subpaths: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (let index = 0; index < series.times.length; index++) {
    const value = series.values[index];
    if (value === null || !Number.isFinite(value)) {
      if (current.length > 0) {
        if (series.observationKind === 'piecewise_constant') {
          const previous = current[current.length - 1];
          current.push({ x: xScale.map(series.times[index]), y: previous.y });
        }
        subpaths.push(current);
      }
      current = [];
      continue;
    }
    const point = { x: xScale.map(series.times[index]), y: yScale.map(value) };
    if (series.observationKind === 'piecewise_constant' && current.length > 0) {
      const previous = current[current.length - 1];
      current.push({ x: point.x, y: previous.y });
    }
    current.push(point);
  }
  if (current.length > 0) subpaths.push(current);
  return subpaths;
}

function traceAreaSubpaths(
  entry: TracePanelSeries,
  xScale: ReturnType<typeof linearScale>,
  yScale: ReturnType<typeof linearScale>,
): { x: number; y0: number; y1: number }[][] {
  const lower = entry.uncertaintyLower;
  const upper = entry.uncertaintyUpper;
  if (!lower || !upper || lower.length !== entry.series.times.length || upper.length !== lower.length) {
    return [];
  }
  const subpaths: { x: number; y0: number; y1: number }[][] = [];
  let current: { x: number; y0: number; y1: number }[] = [];
  for (let index = 0; index < lower.length; index++) {
    const lo = lower[index];
    const hi = upper[index];
    const x = xScale.map(entry.series.times[index]);
    if (lo === null || hi === null || !Number.isFinite(lo) || !Number.isFinite(hi)) {
      if (current.length > 0) {
        if (entry.series.observationKind === 'piecewise_constant') {
          const previous = current[current.length - 1];
          current.push({ x, y0: previous.y0, y1: previous.y1 });
        }
        subpaths.push(current);
      }
      current = [];
      continue;
    }
    const point = { x, y0: yScale.map(lo), y1: yScale.map(hi) };
    if (entry.series.observationKind === 'piecewise_constant' && current.length > 0) {
      const previous = current[current.length - 1];
      current.push({ x, y0: previous.y0, y1: previous.y1 });
    }
    current.push(point);
  }
  if (current.length > 0) subpaths.push(current);
  return subpaths;
}

function traceWhiskerMarks(
  entry: TracePanelSeries,
  xScale: ReturnType<typeof linearScale>,
  yScale: ReturnType<typeof linearScale>,
  color: string,
): Mark | undefined {
  const lower = entry.uncertaintyLower;
  const upper = entry.uncertaintyUpper;
  if (!lower || !upper || lower.length !== entry.series.times.length || upper.length !== lower.length) {
    return undefined;
  }
  const vertical: { position: number; from: number; to: number }[] = [];
  const caps: { position: number; from: number; to: number }[] = [];
  const halfCap = 3;
  for (let index = 0; index < lower.length; index++) {
    const lo = lower[index];
    const hi = upper[index];
    if (lo === null || hi === null || !Number.isFinite(lo) || !Number.isFinite(hi)) continue;
    const x = xScale.map(entry.series.times[index]);
    const y0 = yScale.map(lo);
    const y1 = yScale.map(hi);
    vertical.push({ position: x, from: y0, to: y1 });
    caps.push(
      { position: y0, from: x - halfCap, to: x + halfCap },
      { position: y1, from: x - halfCap, to: x + halfCap },
    );
  }
  if (vertical.length === 0) return undefined;
  return {
    type: 'group',
    id: `uncertainty-${entry.styleIndex}`,
    marks: [
      { type: 'rule', orientation: 'vertical', lines: vertical, stroke: color, strokeWidth: 1.25 },
      { type: 'rule', orientation: 'horizontal', lines: caps, stroke: color, strokeWidth: 1.25 },
    ],
  };
}

function subpathPaintsLine(subpath: readonly { readonly x: number; readonly y: number }[]): boolean {
  if (subpath.length < 2) return false;
  const first = subpath[0];
  return subpath.some((point) => point.x !== first.x || point.y !== first.y);
}

/** Render every accepted trace series, either overlaid or grouped into explicit panels. */
export function compileTraceFigure(
  context: CompileContext,
  panels: readonly TracePanelSpec[],
  options: TraceFigureOptions,
  skillId: string,
): RenderPlanV1 {
  const allSeries = panels.flatMap((panel) => panel.series);
  const legendById = new Map<string, TracePanelSeries>();
  for (const entry of allSeries) {
    if (!legendById.has(entry.series.id)) legendById.set(entry.series.id, entry);
  }
  const legendEntries = [...legendById.values()];
  const uncertaintyLegendEntries = legendEntries.filter((entry) => entry.uncertainty !== undefined);
  const base = panelBox(context);
  const legendInset = legendPlotInset(
    context.width,
    legendEntries.length + uncertaintyLegendEntries.length,
    context.subtitle !== undefined,
  );
  const panelGap = panels.length > 1 ? (options.sharedXAxis ? 22 : 50) : 0;
  const availableHeight = base.height - legendInset - panelGap * Math.max(0, panels.length - 1);
  const panelHeight = panels.length > 0 ? availableHeight / panels.length : availableHeight;

  const globalYValues = allSeries.flatMap(traceYValues);
  const globalYExtent = options.sharedYDomain ? finiteExtent(globalYValues) : undefined;
  const entriesWithPointMarks = new Set<TracePanelSeries>();

  const compiledPanels: Panel[] = panels.map((panelSpec, panelIndex) => {
    const box = {
      x: base.x,
      y: base.y + legendInset + panelIndex * (panelHeight + panelGap),
      width: base.width,
      height: panelHeight,
    };
    const finiteTimes = panelSpec.series.flatMap((entry) =>
      entry.series.times.filter((value) => Number.isFinite(value)),
    );
    const finiteValues = panelSpec.series.flatMap(traceYValues);
    if (finiteTimes.length === 0 || finiteValues.length === 0) {
      return { ...emptyPanel(box, 'no finite observations to plot'), id: panelSpec.id, label: panelSpec.label };
    }

    const xExtent = options.xDomain
      ? { min: options.xDomain[0], max: options.xDomain[1] }
      : finiteExtent(finiteTimes)!;
    const yExtent = globalYExtent ?? finiteExtent(finiteValues)!;
    const xScale = linearScale(xExtent.min, xExtent.max, box.x, box.x + box.width);
    const scaleKind = panelSpec.scale ?? 'linear';
    const yScale: NumericScale = scaleKind === 'log'
      ? logNumericScale(yExtent.min, yExtent.max, box.y + box.height, box.y)
      : scaleKind === 'symlog'
        ? symlogNumericScale(
          yExtent.min,
          yExtent.max,
          box.y + box.height,
          box.y,
          panelSpec.symlogLinearThreshold!,
        )
        : linearNumericScale(yExtent.min, yExtent.max, box.y + box.height, box.y);
    const marks: Mark[] = [];

    for (const entry of panelSpec.series) {
      const style = categoricalStyle(entry.styleIndex);
      const boundaryColor = uncertaintyStroke(context.themeId);
      if (entry.uncertainty?.mark === 'whisker') {
        const whiskers = traceWhiskerMarks(entry, xScale, yScale, boundaryColor);
        if (whiskers) marks.push(whiskers);
      } else if (entry.uncertainty?.mark === 'band') {
        const uncertaintySubpaths = traceAreaSubpaths(entry, xScale, yScale);
        if (uncertaintySubpaths.length > 0) {
          marks.push({
            type: 'area',
            subpaths: uncertaintySubpaths,
            fill: style.color,
            opacity: 0.18,
            stroke: boundaryColor,
            strokeWidth: 1.25,
          });
          const degeneratePoints = uncertaintySubpaths
            .filter((subpath) => subpath.length > 0 && subpath.every((point) =>
              point.x === subpath[0].x && point.y0 === subpath[0].y0 && point.y1 === subpath[0].y1,
            ) && subpath[0].y0 === subpath[0].y1)
            .map((subpath) => ({ x: subpath[0].x, y: subpath[0].y0 }));
          if (degeneratePoints.length > 0) {
            marks.push({ type: 'point', points: degeneratePoints, fill: boundaryColor, radius: 4, shape: 'diamond' });
          }
        }
      }
      const lineSubpaths = traceSubpaths(entry.series, xScale, yScale);
      const drawableLines = lineSubpaths.filter(subpathPaintsLine);
      if (drawableLines.length > 0) {
        marks.push({
          type: 'line',
          subpaths: drawableLines,
          stroke: style.color,
          strokeWidth: 1.5,
          dash: style.dash,
        });
      }
      // An SVG path containing only `M x,y` paints no pixels. Isolated observations must
      // therefore receive a marker even when the caller did not request markers on every
      // sample; otherwise a valid one-point trace would succeed as a blank figure.
      const points: { x: number; y: number }[] = [];
      if (options.showSamplePoints) {
        for (let index = 0; index < entry.series.times.length; index++) {
          const value = entry.series.values[index];
          if (value !== null && Number.isFinite(value)) {
            points.push({ x: xScale.map(entry.series.times[index]), y: yScale.map(value) });
          }
        }
      } else {
        for (const subpath of lineSubpaths) if (!subpathPaintsLine(subpath)) points.push(subpath[0]);
      }
      if (points.length > 0) {
        marks.push({ type: 'point', points, fill: style.color, radius: 2.4, shape: style.marker });
        entriesWithPointMarks.add(entry);
      }
    }

    return {
      id: panelSpec.id,
      label: panelSpec.label,
      ...box,
      axes: [
        ...(options.sharedXAxis && panels.length > 1 && panelIndex < panels.length - 1
          ? []
          : [xAxis(options.xLabel, xScale)]),
        transformedYAxis(panelSpec.yLabel, yScale),
      ],
      marks,
    };
  });

  const rowsTotal = allSeries.reduce((total, entry) => total + entry.series.outputCount, 0);
  const rows: (string | number | null)[][] = [];
  outer: for (const panel of panels) {
    for (const entry of panel.series) {
      for (let index = 0; index < entry.series.times.length; index++) {
        if (rows.length >= context.inlineTableRows) break outer;
        rows.push(options.tableRow
          ? [...options.tableRow(entry, index, panel)]
          : [
            entry.series.id,
            entry.series.label,
            entry.series.times[index],
            entry.series.values[index],
            entry.series.timeUnit,
            entry.series.valueUnit,
            entry.series.replicateCounts[index],
          ]);
      }
    }
  }

  return {
    ...frame(context, skillId),
    panels: compiledPanels.length > 0
      ? compiledPanels
      : [emptyPanel({ ...base, y: base.y + legendInset, height: availableHeight }, 'no trace panels declared')],
    legend: [
      ...legendEntries.map((entry) => {
        const style = categoricalStyle(entry.styleIndex);
        return {
          label: entry.series.label || entry.series.id,
          color: style.color,
          glyph: 'series' as const,
          dash: style.dash,
          ...(entriesWithPointMarks.has(entry)
            ? { marker: style.marker }
            : {}),
        };
      }),
      ...uncertaintyLegendEntries.map((entry) => {
        const style = categoricalStyle(entry.styleIndex);
        return {
          label: `${entry.series.label || entry.series.id}: ${entry.uncertainty!.label}`,
          color: style.color,
          outlineColor: uncertaintyStroke(context.themeId),
          glyph: entry.uncertainty!.mark,
        };
      }),
    ],
    accessibility: {
      summary: context.summary,
      panelSummaries: [
        ...(options.summaryStatements ?? []),
        ...panels.map((panel) => {
          const extent = finiteExtent(panel.series.flatMap(traceYValues));
          return `${panel.label}: ${panel.series.length} ${panel.series.length === 1 ? 'series' : 'series'}; y axis ${panel.yLabel}; ${panel.scale ?? 'linear'} value scale${extent ? `; displayed range ${formatNumber(extent.min)} to ${formatNumber(extent.max)}` : ''}.`;
        }),
      ],
      ...(panels.length > 1 ? { suppressGlobalValueRange: true } : {}),
    },
    table: {
      policy: rowsTotal > context.inlineTableRows ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: options.tableColumns ?? [
        { key: 'seriesId', header: 'Series' },
        { key: 'seriesLabel', header: 'Label' },
        { key: 'time', header: 'Time' },
        { key: 'value', header: 'Value' },
        { key: 'timeUnit', header: 'Time unit' },
        { key: 'valueUnit', header: 'Value unit' },
        { key: 'replicateCount', header: 'Replicates' },
      ],
      rows,
      rowsInline: rows.length,
      rowsTotal,
    },
  };
}

function transformedYAxis(label: string, scale: NumericScale): Axis {
  return {
    orientation: 'left',
    label,
    transform: scale.transform,
    ticks: scale.ticks().map((tick) => ({ position: scale.map(tick.value), label: tick.label })),
  };
}

function xAxis(label: string, scale: ReturnType<typeof linearScale>): Axis {
  return {
    orientation: 'bottom',
    label,
    transform: 'linear',
    ticks: linearTicks(scale.domainMin, scale.domainMax).map((t) => ({ position: scale.map(t.value), label: t.label })),
  };
}
function yAxis(label: string, scale: ReturnType<typeof linearScale>): Axis {
  return {
    orientation: 'left',
    label,
    transform: 'linear',
    ticks: linearTicks(scale.domainMin, scale.domainMax).map((t) => ({ position: scale.map(t.value), label: t.label })),
  };
}

/**
 * A histogram/PSTH bar figure from bin edges and per-bin values. Literal bins — each bar
 * spans exactly [edge_i, edge_{i+1}), so an unequal-width bin is drawn at its true width.
 */
export function compileBarFigure(
  context: CompileContext,
  edges: readonly number[],
  values: readonly number[],
  xLabel: string,
  yLabel: string,
  skillId: string,
  xScaleKind: 'linear' | 'log' = 'linear',
  options: {
    readonly tableMetadata?: readonly {
      readonly key: string;
      readonly header: string;
      readonly value: string | number | null;
    }[];
    readonly summaryStatements?: readonly string[];
  } = {},
): RenderPlanV1 {
  const box = panelBox(context);
  const table = barTable(
    edges,
    values,
    context.inlineTableRows,
    yLabel,
    options.tableMetadata ?? [],
  );
  const accessibility = {
    summary: [context.summary, ...(options.summaryStatements ?? [])]
      .filter((statement) => statement.length > 0)
      .join(' '),
    panelSummaries: [...(options.summaryStatements ?? [])],
  };
  if (values.length === 0 || edges.length < 2) {
    return {
      ...frame(context, skillId),
      panels: [emptyPanel(box, 'no bins to plot')],
      table,
      legend: [],
      accessibility,
    };
  }

  const xMin = edges[0];
  const xMax = edges[edges.length - 1];
  const yMax = Math.max(0, finiteExtent(values)?.max ?? 0);
  const xScale: NumericScale = xScaleKind === 'log'
    ? logNumericScale(xMin, xMax, box.x, box.x + box.width)
    : linearNumericScale(xMin, xMax, box.x, box.x + box.width);
  const yScale = linearScale(0, yMax, box.y + box.height, box.y);
  const baseline = yScale.map(0);

  const rects = values.map((value, i) => {
    const x0 = xScale.map(edges[i]);
    const x1 = xScale.map(edges[i + 1]);
    const yTop = yScale.map(value);
    return { x: x0, y: yTop, width: Math.max(0, x1 - x0 - 1), height: Math.max(0, baseline - yTop), fill: accent(context.themeId) };
  });

  const marks: Mark[] = [{ type: 'rect', rects }];
  const axes: Axis[] = [transformedXAxis(xLabel, xScale), yAxis(yLabel, yScale)];

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table,
    legend: [],
    accessibility,
  };
}

/** Multiple declared histogram groups, normalized independently and drawn side by side. */
export function compileGroupedBarFigure(
  context: CompileContext,
  edges: readonly number[],
  groups: readonly {
    readonly id: string;
    readonly label: string;
    readonly values: readonly number[];
    readonly connectionCount: number;
    readonly observationCount: number;
    readonly binnedObservationCount: number;
    readonly underRangeCount: number;
    readonly overRangeCount: number;
    readonly missingMeasurementCount: number;
    readonly missingObservationCount?: number;
  }[],
  xLabel: string,
  yLabel: string,
  skillId: string,
  xScaleKind: 'linear' | 'log' = 'linear',
  options: {
    readonly summaryStatements?: readonly string[];
  } = {},
): RenderPlanV1 {
  const box = panelBox(context);
  const accessibility = {
    summary: [context.summary, ...(options.summaryStatements ?? [])]
      .filter((statement) => statement.length > 0)
      .join(' '),
    panelSummaries: [...(options.summaryStatements ?? [])],
  };
  if (groups.length === 0 || edges.length < 2) {
    return {
      ...frame(context, skillId),
      panels: [emptyPanel(box, 'no histogram groups to plot')],
      table: emptyTable(),
      legend: [],
      accessibility,
    };
  }
  const xScale: NumericScale = xScaleKind === 'log'
    ? logNumericScale(edges[0], edges[edges.length - 1], box.x, box.x + box.width)
    : linearNumericScale(edges[0], edges[edges.length - 1], box.x, box.x + box.width);
  const yMax = Math.max(
    0,
    finiteExtent(groups.flatMap((group) => group.values))?.max ?? 0,
  );
  const yScale = linearScale(0, yMax, box.y + box.height, box.y);
  const baseline = yScale.map(0);
  const marks: Mark[] = groups.map((group, groupIndex) => {
    const style = categoricalStyle(groupIndex);
    const rects = group.values.map((value, binIndex) => {
      const binX0 = xScale.map(edges[binIndex]);
      const binX1 = xScale.map(edges[binIndex + 1]);
      const slotWidth = Math.max(0, binX1 - binX0) / groups.length;
      const x = binX0 + groupIndex * slotWidth;
      const y = yScale.map(value);
      return {
        x,
        y,
        width: Math.max(0, slotWidth - 0.75),
        height: Math.max(0, baseline - y),
        fill: style.color,
      };
    });
    return { type: 'rect' as const, rects };
  });
  const rowsTotal = groups.reduce((sum, group) => sum + group.values.length, 0);
  const rows: (string | number | null)[][] = [];
  outer: for (const group of groups) {
    for (let index = 0; index < group.values.length; index++) {
      if (rows.length >= context.inlineTableRows) break outer;
      rows.push([
        group.id,
        group.connectionCount,
        group.observationCount,
        group.binnedObservationCount,
        group.underRangeCount,
        group.overRangeCount,
        group.missingMeasurementCount,
        group.missingObservationCount ?? null,
        edges[index],
        edges[index + 1],
        group.values[index],
      ]);
    }
  }
  return {
    ...frame(context, skillId),
    panels: [{
      id: 'main',
      ...box,
      axes: [transformedXAxis(xLabel, xScale), yAxis(yLabel, yScale)],
      marks,
    }],
    table: {
      policy: rowsTotal > context.inlineTableRows ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [
        { key: 'group', header: 'Group' },
        { key: 'connectionCount', header: 'Connection rows' },
        { key: 'observationCount', header: 'Formed observations' },
        { key: 'binnedObservationCount', header: 'Binned observations' },
        { key: 'underRangeCount', header: 'Under range' },
        { key: 'overRangeCount', header: 'Over range' },
        { key: 'missingMeasurementCount', header: 'Missing measurements' },
        { key: 'missingObservationCount', header: 'Missing observations' },
        { key: 'binStart', header: 'Bin start' },
        { key: 'binEnd', header: 'Bin end' },
        { key: 'value', header: yLabel },
      ],
      rows,
      rowsInline: rows.length,
      rowsTotal,
    },
    legend: groups.map((group, index) => ({
      label: group.label,
      color: categoricalStyle(index).color,
      glyph: 'series' as const,
    })),
    accessibility,
  };
}

function transformedXAxis(label: string, scale: NumericScale): Axis {
  return {
    orientation: 'bottom',
    label,
    transform: scale.transform,
    ticks: scale.ticks().map((tick) => ({ position: scale.map(tick.value), label: tick.label })),
  };
}

function barTable(
  edges: readonly number[],
  values: readonly number[],
  inlineLimit: number,
  valueHeader = 'Value',
  metadata: readonly {
    readonly key: string;
    readonly header: string;
    readonly value: string | number | null;
  }[] = [],
): RenderPlanV1['table'] {
  const inline = Math.min(values.length, inlineLimit);
  const rows = Array.from(
    { length: inline },
    (_value, i) => [
      edges[i],
      edges[i + 1],
      values[i],
      ...metadata.map((entry) => entry.value),
    ] as (string | number | null)[],
  );
  return {
    policy: values.length > inlineLimit ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
    columns: [
      { key: 'binStart', header: 'Bin start' },
      { key: 'binEnd', header: 'Bin end' },
      { key: 'value', header: valueHeader },
      ...metadata.map(({ key, header }) => ({ key, header })),
    ],
    rows,
    rowsInline: inline,
    rowsTotal: values.length,
  };
}

/**
 * A spike raster: one row per sender, a tick at each event time. Below the mark budget
 * only; the caller enforces the budget upstream and switches to a density representation
 * when it is exceeded.
 */
export function compileRasterFigure(
  context: CompileContext,
  eventTimes: readonly number[],
  eventSenders: readonly string[],
  senderOrder: readonly string[],
  windowStart: number,
  windowStop: number,
  timeLabel: string,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (eventTimes.length === 0 || senderOrder.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'no events to plot')], table: emptyTable(), legend: [] };
  }

  const rowIndex = new Map<string, number>();
  senderOrder.forEach((id, i) => rowIndex.set(id, i));

  const xScale = linearScale(windowStart, windowStop, box.x, box.x + box.width);
  const rowHeight = box.height / senderOrder.length;
  const tickHalf = Math.max(1, Math.min(rowHeight * 0.4, 4));

  const lines: { position: number; from: number; to: number }[] = [];
  for (let i = 0; i < eventTimes.length; i++) {
    const row = rowIndex.get(eventSenders[i]);
    if (row === undefined) continue;
    const x = xScale.map(eventTimes[i]);
    const yCenter = box.y + (row + 0.5) * rowHeight;
    lines.push({ position: x, from: yCenter - tickHalf, to: yCenter + tickHalf });
  }

  const marks: Mark[] = [{ type: 'rule', orientation: 'vertical', lines, stroke: accent(context.themeId), strokeWidth: 1 }];
  const yScale = linearScale(0, senderOrder.length, box.y, box.y + box.height);
  const axes: Axis[] = [xAxis(timeLabel, xScale), { orientation: 'left', label: 'sender', transform: 'band', ticks: yAxisRowTicks(senderOrder, box, rowHeight) }];

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table: {
      policy: eventTimes.length > context.inlineTableRows ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'sender', header: 'Sender' }, { key: 'time', header: timeLabel }],
      rows: eventTimes.slice(0, context.inlineTableRows).map((t, i) => [eventSenders[i], t] as (string | number | null)[]),
      rowsInline: Math.min(eventTimes.length, context.inlineTableRows),
      rowsTotal: eventTimes.length,
    },
    legend: [],
  };
}

function yAxisRowTicks(order: readonly string[], box: { y: number; height: number }, rowHeight: number): Axis['ticks'] {
  // At most ~12 row labels so the axis stays legible on a dense raster.
  const step = Math.max(1, Math.ceil(order.length / 12));
  const ticks: { position: number; label: string }[] = [];
  for (let i = 0; i < order.length; i += step) {
    ticks.push({ position: box.y + (i + 0.5) * rowHeight, label: order[i] });
  }
  return ticks;
}

/**
 * A matrix heatmap. Only cells a connection produced are drawn; an absent cell stays the
 * background, visibly distinct from a measured zero. Value maps to opacity of the accent.
 */
export function compileMatrixFigure(
  context: CompileContext,
  cells: readonly { row: number; col: number; value: number }[],
  rowIds: readonly string[],
  colIds: readonly string[],
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (rowIds.length === 0 || colIds.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'empty node universe')], table: emptyTable(), legend: [] };
  }

  const cellW = box.width / colIds.length;
  const cellH = box.height / rowIds.length;
  const maxAbs = Math.max(1e-9, finiteExtentBy(cells, (cell) => Math.abs(cell.value))?.max ?? 0);

  const rects = cells.map((cell) => {
    // Opacity encodes magnitude; a present zero is drawn with a faint but visible fill so
    // it is never confused with an absent cell (which has no rect at all).
    const opacity = 0.15 + 0.85 * (Math.abs(cell.value) / maxAbs);
    return {
      x: box.x + cell.col * cellW,
      y: box.y + cell.row * cellH,
      width: Math.max(0, cellW - 0.5),
      height: Math.max(0, cellH - 0.5),
      fill: withOpacity(accent(context.themeId), opacity),
    };
  });

  const gridRect = {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    fill: gridColor(context.themeId),
  };

  const marks: Mark[] = [{ type: 'rect', rects: [gridRect] }, { type: 'rect', rects }];
  const axes: Axis[] = [
    { orientation: 'bottom', label: 'source', transform: 'band', ticks: bandTicks(colIds, box.x, box.width, box.y + box.height + 0) },
    { orientation: 'left', label: 'target', transform: 'band', ticks: bandTicks(rowIds, box.y, box.height, box.x, true) },
  ];

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table: {
      policy: cells.length > context.inlineTableRows ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'target', header: 'Target' }, { key: 'source', header: 'Source' }, { key: 'value', header: 'Value' }],
      rows: cells.slice(0, context.inlineTableRows).map((c) => [rowIds[c.row], colIds[c.col], c.value] as (string | number | null)[]),
      rowsInline: Math.min(cells.length, context.inlineTableRows),
      rowsTotal: cells.length,
    },
    legend: [],
  };
}

function bandTicks(ids: readonly string[], start: number, span: number, cross: number, vertical = false): Axis['ticks'] {
  const step = Math.max(1, Math.ceil(ids.length / 12));
  const band = span / ids.length;
  const ticks: { position: number; label: string }[] = [];
  for (let i = 0; i < ids.length; i += step) {
    ticks.push({ position: start + (i + 0.5) * band, label: ids[i] });
  }
  return ticks;
}

/** A 2D scatter of measured node positions. Equal x/y scale; positions never jittered. */
export function compileScatterFigure(
  context: CompileContext,
  xs: readonly number[],
  ys: readonly number[],
  ids: readonly string[],
  xLabel: string,
  yLabel: string,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (xs.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'no positioned nodes')], table: emptyTable(), legend: [] };
  }

  // One equal scale on both axes: distances on the page must be comparable.
  const xExtent = finiteExtent(xs)!;
  const yExtent = finiteExtent(ys)!;
  const xMin = xExtent.min;
  const xMax = xExtent.max;
  const yMin = yExtent.min;
  const yMax = yExtent.max;
  const dataSpan = Math.max(xMax - xMin, yMax - yMin) || 1;
  const pageSpan = Math.min(box.width, box.height);
  const scaleFactor = pageSpan / dataSpan;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dataCx = (xMin + xMax) / 2;
  const dataCy = (yMin + yMax) / 2;

  const points = xs.map((x, i) => ({
    x: cx + (x - dataCx) * scaleFactor,
    y: cy - (ys[i] - dataCy) * scaleFactor, // y inverts: data up = page up
  }));

  const marks: Mark[] = [{ type: 'point', points, fill: accent(context.themeId), radius: 3, shape: 'circle' }];

  const xScale = linearScale(xMin, xMax, cx - (dataSpan / 2) * scaleFactor, cx + (dataSpan / 2) * scaleFactor);
  const yScale = linearScale(yMin, yMax, cy + (dataSpan / 2) * scaleFactor, cy - (dataSpan / 2) * scaleFactor);
  const axes: Axis[] = [xAxis(xLabel, xScale), yAxis(yLabel, yScale)];

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table: {
      policy: xs.length > context.inlineTableRows ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'node', header: 'Node' }, { key: 'x', header: xLabel }, { key: 'y', header: yLabel }],
      rows: xs.slice(0, context.inlineTableRows).map((x, i) => [ids[i], x, ys[i]] as (string | number | null)[]),
      rowsInline: Math.min(xs.length, context.inlineTableRows),
      rowsTotal: xs.length,
    },
    legend: [],
  };
}

/** Correlogram stems: an independent vertical stem per lag bin; no bridging, no invented lag-zero. */
export function compileStemFigure(
  context: CompileContext,
  binCenters: readonly number[],
  counts: readonly number[],
  xLabel: string,
  yLabel: string,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (counts.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'no pairs to plot')], table: emptyTable(), legend: [] };
  }

  const xMin = binCenters[0];
  const xMax = binCenters[binCenters.length - 1];
  const yMax = Math.max(0, finiteExtent(counts)?.max ?? 0);
  const xScale = linearScale(xMin, xMax, box.x, box.x + box.width);
  const yScale = linearScale(0, yMax, box.y + box.height, box.y);
  const baseline = yScale.map(0);

  const stems = counts.map((c, i) => ({ position: xScale.map(binCenters[i]), from: baseline, to: yScale.map(c) }));
  const dots = counts.map((c, i) => ({ x: xScale.map(binCenters[i]), y: yScale.map(c) }));

  const marks: Mark[] = [
    { type: 'rule', orientation: 'vertical', lines: stems, stroke: accent(context.themeId), strokeWidth: 1.25 },
    { type: 'point', points: dots, fill: accent(context.themeId), radius: 2, shape: 'circle' },
  ];
  const axes: Axis[] = [xAxis(xLabel, xScale), yAxis(yLabel, yScale)];

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table: {
      policy: counts.length > context.inlineTableRows ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'lag', header: xLabel }, { key: 'count', header: yLabel }],
      rows: counts.slice(0, context.inlineTableRows).map((c, i) => [binCenters[i], c] as (string | number | null)[]),
      rowsInline: Math.min(counts.length, context.inlineTableRows),
      rowsTotal: counts.length,
    },
    legend: [],
  };
}

/** Response curve: points primary, an ordered guide line only if conditions are ordered. */
export function compilePointsLineFigure(
  context: CompileContext,
  x: readonly number[],
  y: readonly number[],
  ordered: boolean,
  xLabel: string,
  yLabel: string,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (x.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'no conditions to plot')], table: emptyTable(), legend: [] };
  }

  const xExtent = finiteExtent(x)!;
  const yExtent = finiteExtent(y)!;
  const xMin = xExtent.min;
  const xMax = xExtent.max;
  const yMin = Math.min(0, yExtent.min);
  const yMax = yExtent.max;
  const xScale = linearScale(xMin, xMax, box.x, box.x + box.width);
  const yScale = linearScale(yMin, yMax, box.y + box.height, box.y);

  const points = x.map((xv, i) => ({ x: xScale.map(xv), y: yScale.map(y[i]) }));
  const marks: Mark[] = [];
  if (ordered) {
    // A guide line only for ordered conditions — never connecting unordered categories.
    const sorted = points.slice().sort((a, b) => a.x - b.x);
    marks.push({ type: 'line', subpaths: [sorted], stroke: missingColor(context.themeId), strokeWidth: 1, dash: '4 3' });
  }
  marks.push({ type: 'point', points, fill: accent(context.themeId), radius: 3.5, shape: 'circle' });

  const axes: Axis[] = [xAxis(xLabel, xScale), yAxis(yLabel, yScale)];
  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table: {
      policy: x.length > context.inlineTableRows ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'input', header: xLabel }, { key: 'response', header: yLabel }],
      rows: x.slice(0, context.inlineTableRows).map((xv, i) => [xv, y[i]] as (string | number | null)[]),
      rowsInline: Math.min(x.length, context.inlineTableRows),
      rowsTotal: x.length,
    },
    legend: [],
  };
}

/** A phase-plane trajectory: an ordered path in 2D state space with a direction marker. */
export function compileTrajectoryFigure(
  context: CompileContext,
  xs: readonly number[],
  ys: readonly number[],
  xLabel: string,
  yLabel: string,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (xs.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'no trajectory to plot')], table: emptyTable(), legend: [] };
  }
  const xExtent = finiteExtent(xs)!;
  const yExtent = finiteExtent(ys)!;
  const xMin = xExtent.min;
  const xMax = xExtent.max;
  const yMin = yExtent.min;
  const yMax = yExtent.max;
  const xScale = linearScale(xMin, xMax, box.x, box.x + box.width);
  const yScale = linearScale(yMin, yMax, box.y + box.height, box.y);

  const pathPoints = xs.map((x, i) => ({ x: xScale.map(x), y: yScale.map(ys[i]) }));
  const marks: Mark[] = [
    { type: 'line', subpaths: [pathPoints], stroke: accent(context.themeId), strokeWidth: 1.5 },
    // A direction marker at the final point conveys the flow of time without animation.
    { type: 'point', points: [pathPoints[pathPoints.length - 1]], fill: accent(context.themeId), radius: 3, shape: 'triangle' },
  ];
  const axes: Axis[] = [xAxis(xLabel, xScale), yAxis(yLabel, yScale)];

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table: {
      policy: xs.length > context.inlineTableRows ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'x', header: xLabel }, { key: 'y', header: yLabel }],
      rows: xs.slice(0, context.inlineTableRows).map((x, i) => [x, ys[i]] as (string | number | null)[]),
      rowsInline: Math.min(xs.length, context.inlineTableRows),
      rowsTotal: xs.length,
    },
    legend: [],
  };
}

/**
 * A schematic connection graph: nodes on a circle, straight directed edges. The layout is
 * explicitly non-spatial (a SCHEMATIC_LAYOUT disclosure says so); it exists to show
 * structure, not position. Every node in the universe is placed, so an isolate is visible.
 */
export function compileGraphFigure(
  context: CompileContext,
  nodeIds: readonly string[],
  sourceIds: readonly string[],
  targetIds: readonly string[],
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (nodeIds.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'empty node universe')], table: emptyTable(), legend: [] };
  }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const radius = Math.min(box.width, box.height) / 2 - 20;

  const position = new Map<string, { x: number; y: number }>();
  nodeIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / nodeIds.length - Math.PI / 2;
    position.set(id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  });

  const edgeLines: { row?: never }[] = [];
  const edgeSubpaths: { x: number; y: number }[][] = [];
  const n = Math.min(sourceIds.length, targetIds.length);
  for (let i = 0; i < n; i++) {
    const a = position.get(sourceIds[i]);
    const b = position.get(targetIds[i]);
    if (!a || !b) continue;
    if (sourceIds[i] === targetIds[i]) {
      // An autapse: a small visible loop, so a self-connection is never invisible.
      edgeSubpaths.push([{ x: a.x, y: a.y }, { x: a.x + 8, y: a.y - 10 }, { x: a.x + 12, y: a.y }, { x: a.x, y: a.y }]);
    } else {
      edgeSubpaths.push([{ x: a.x, y: a.y }, { x: b.x, y: b.y }]);
    }
  }

  const nodePoints = nodeIds.map((id) => position.get(id)!);
  const marks: Mark[] = [
    { type: 'line', subpaths: edgeSubpaths, stroke: gridColor(context.themeId), strokeWidth: 1 },
    { type: 'point', points: nodePoints, fill: accent(context.themeId), radius: 5, shape: 'circle' },
  ];

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', x: box.x, y: box.y, width: box.width, height: box.height, axes: [], marks }],
    table: {
      policy: n > context.inlineTableRows ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'source', header: 'Source' }, { key: 'target', header: 'Target' }],
      rows: Array.from({ length: Math.min(n, context.inlineTableRows) }, (_v, i) => [sourceIds[i], targetIds[i]] as (string | number | null)[]),
      rowsInline: Math.min(n, context.inlineTableRows),
      rowsTotal: n,
    },
    legend: [],
  };
}

function emptyTable(): RenderPlanV1['table'] {
  return { policy: 'complete_inline', columns: [], rows: [], rowsInline: 0, rowsTotal: 0 };
}

/** Compose a colour + opacity into an rgba-free hex+alpha. Deterministic and self-contained. */
function withOpacity(hex: string, opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  const alpha = Math.round(clamped * 255).toString(16).padStart(2, '0');
  // 8-digit hex is valid SVG colour and keeps the serializer dependency-free.
  return `${hex}${alpha}`;
}
