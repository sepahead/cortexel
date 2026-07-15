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
import { linearScale, linearTicks } from './scale.js';
import { formatNumber } from './format.js';
import { THEMES } from '../generated/catalog.js';
import type { CompileContext } from './compile.js';

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
function missingColor(themeId: string): string {
  return (THEMES as Record<string, Record<string, string>>)[themeId]?.missing ?? '#767e87';
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
): RenderPlanV1 {
  const box = panelBox(context);
  if (values.length === 0 || edges.length < 2) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'no bins to plot')], table: barTable(edges, values), legend: [] };
  }

  const xMin = edges[0];
  const xMax = edges[edges.length - 1];
  const yMax = Math.max(0, ...values);
  const xScale = linearScale(xMin, xMax, box.x, box.x + box.width);
  const yScale = linearScale(0, yMax, box.y + box.height, box.y);
  const baseline = yScale.map(0);

  const rects = values.map((value, i) => {
    const x0 = xScale.map(edges[i]);
    const x1 = xScale.map(edges[i + 1]);
    const yTop = yScale.map(value);
    return { x: x0, y: yTop, width: Math.max(0, x1 - x0 - 1), height: Math.max(0, baseline - yTop), fill: accent(context.themeId) };
  });

  const marks: Mark[] = [{ type: 'rect', rects }];
  const axes: Axis[] = [xAxis(xLabel, xScale), yAxis(yLabel, yScale)];

  return { ...frame(context, skillId), panels: [{ id: 'main', ...box, axes, marks }], table: barTable(edges, values), legend: [] };
}

function barTable(edges: readonly number[], values: readonly number[]): RenderPlanV1['table'] {
  const rows = values.map((v, i) => [formatNumber(edges[i]), formatNumber(edges[i + 1]), formatNumber(v)] as (string | number | null)[]);
  return {
    policy: rows.length > 500 ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
    columns: [
      { key: 'binStart', header: 'Bin start' },
      { key: 'binEnd', header: 'Bin end' },
      { key: 'value', header: 'Value' },
    ],
    rows: rows.slice(0, 500),
    rowsInline: Math.min(rows.length, 500),
    rowsTotal: rows.length,
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
      policy: eventTimes.length > 500 ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'sender', header: 'Sender' }, { key: 'time', header: timeLabel }],
      rows: eventTimes.slice(0, 500).map((t, i) => [eventSenders[i], formatNumber(t)] as (string | number | null)[]),
      rowsInline: Math.min(eventTimes.length, 500),
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
  const maxAbs = Math.max(1e-9, ...cells.map((c) => Math.abs(c.value)));

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
      policy: cells.length > 500 ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'target', header: 'Target' }, { key: 'source', header: 'Source' }, { key: 'value', header: 'Value' }],
      rows: cells.slice(0, 500).map((c) => [rowIds[c.row], colIds[c.col], formatNumber(c.value)] as (string | number | null)[]),
      rowsInline: Math.min(cells.length, 500),
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
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
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
      policy: xs.length > 500 ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'node', header: 'Node' }, { key: 'x', header: xLabel }, { key: 'y', header: yLabel }],
      rows: xs.slice(0, 500).map((x, i) => [ids[i], formatNumber(x), formatNumber(ys[i])] as (string | number | null)[]),
      rowsInline: Math.min(xs.length, 500),
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
  const yMax = Math.max(0, ...counts);
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
      policy: 'complete_inline',
      columns: [{ key: 'lag', header: xLabel }, { key: 'count', header: yLabel }],
      rows: counts.map((c, i) => [formatNumber(binCenters[i]), formatNumber(c)] as (string | number | null)[]),
      rowsInline: counts.length,
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

  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const yMin = Math.min(0, ...y);
  const yMax = Math.max(...y);
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
      policy: 'complete_inline',
      columns: [{ key: 'input', header: xLabel }, { key: 'response', header: yLabel }],
      rows: x.map((xv, i) => [formatNumber(xv), formatNumber(y[i])] as (string | number | null)[]),
      rowsInline: x.length,
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
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
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
      policy: xs.length > 500 ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'x', header: xLabel }, { key: 'y', header: yLabel }],
      rows: xs.slice(0, 500).map((x, i) => [formatNumber(x), formatNumber(ys[i])] as (string | number | null)[]),
      rowsInline: Math.min(xs.length, 500),
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
      policy: n > 500 ? 'excerpt_inline_with_complete_sidecar' : 'complete_inline',
      columns: [{ key: 'source', header: 'Source' }, { key: 'target', header: 'Target' }],
      rows: Array.from({ length: Math.min(n, 500) }, (_v, i) => [sourceIds[i], targetIds[i]] as (string | number | null)[]),
      rowsInline: Math.min(n, 500),
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
