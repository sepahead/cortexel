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

import type {
  RenderPlanV1,
  Panel,
  Mark,
  Axis,
  OutputAuthorityAtomicRoleV1,
} from './model/renderPlan.js';
import type { JsonValue } from '../core/parse-json.js';
import {
  linearNumericScale,
  linearScale,
  linearTicks,
  logNumericScale,
  symlogTransform,
  symlogNumericScale,
  type NumericScale,
} from './scale.js';
import { CATEGORICAL_SERIES_STYLES, THEMES } from '../generated/catalog.js';
import type { CompileContext } from './compile.js';
import { finiteExtent, finiteExtentBy } from '../core/numeric.js';
import { disclosureFooterHeight, legendPlotInset } from './layout.js';
import type { PreparedTraceSeries } from '../analysis/traces.js';
import type { ResponseCurveResult } from '../analysis/responseCurve.js';
import type { PsthResult } from '../analysis/psth.js';
import {
  aggregateTopologyScalar,
  type TopologyScalarAggregation,
} from '../analysis/topology.js';
import {
  reverseSpatialSegments,
  routeSpatialChord,
  type SpatialRoutingDomain,
} from '../analysis/spatial.js';
import { formatNumber } from './format.js';
import {
  exactBinary64Sum,
  exactBinary64RatioToDifference,
  exactRationalToBinary64,
  finiteBinary64ToMinSubnormalUnits,
} from '../core/exact-binary64.js';

const MARGIN = { top: 60, right: 32, bottom: 56, left: 64 } as const;

function panelBox(context: CompileContext): { x: number; y: number; width: number; height: number } {
  const disclosureSpace = disclosureFooterHeight(context.width, context.disclosures);
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
  /** Optional exact paint runs, used when source semantics are richer than a generic line. */
  readonly renderRuns?: readonly {
    readonly times: readonly number[];
    readonly values: readonly number[];
    readonly uncertaintyLower?: readonly (number | null)[];
    readonly uncertaintyUpper?: readonly (number | null)[];
    /** One explicit atomic role per emitted run vertex. */
    readonly authority?: readonly OutputAuthorityAtomicRoleV1[];
  }[];
  /** Optional exact subset of source observations eligible for visible markers. */
  readonly markerObservationIndexes?: readonly number[];
  readonly authorityAtomKinds?: {
    readonly pathVertex: string;
    readonly sampleMarker: string;
    readonly isolatedMarker: string;
  };
  readonly style?: {
    readonly color: string;
    readonly dash: string;
    readonly marker: MarkerShape;
  };
  readonly includeInLegend?: boolean;
  readonly tableMetadata?: Readonly<Record<string, string | number | null>>;
  readonly uncertaintyLower?: readonly (number | null)[];
  readonly uncertaintyUpper?: readonly (number | null)[];
  readonly uncertainty?: {
    readonly kind: string;
    readonly mark: 'band' | 'whisker';
    readonly label: string;
  };
  /** Source-bound identities aligned one-for-one with `series.observations`. */
  readonly outputAuthority?: {
    readonly observationProvenance: readonly JsonValue[];
    readonly pathClassId: string;
    readonly sampleClassId: string;
    readonly uncertaintyClassId: string;
  };
}

export interface TracePanelSpec {
  readonly id: string;
  readonly label: string;
  readonly yLabel: string;
  readonly series: readonly TracePanelSeries[];
  readonly scale?: 'linear' | 'log' | 'symlog';
  readonly symlogLinearThreshold?: number;
  readonly referenceLines?: readonly {
    readonly id: string;
    readonly value: number;
    readonly label: string;
    readonly color: string;
    readonly dash?: string;
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }[];
}

export interface TraceFigureOptions {
  readonly xLabel: string;
  readonly xDomain?: readonly [number, number];
  readonly sharedXAxis?: boolean;
  readonly sharedYDomain?: boolean;
  readonly showSamplePoints?: boolean;
  /** Preserve a stable DOM/render-plan address for each scientific series. */
  readonly groupSeriesMarks?: boolean;
  readonly tableColumns?: readonly { readonly key: string; readonly header: string }[];
  readonly tableRow?: (
    entry: TracePanelSeries,
    observationIndex: number,
    panel: TracePanelSpec,
  ) => readonly (string | number | null)[];
  readonly summaryStatements?: readonly string[];
}

function traceMarkerObservationIndexes(entry: TracePanelSeries): readonly number[] {
  return entry.markerObservationIndexes ??
    entry.series.observations.map((_observation, index) => index);
}

function traceYValues(
  entry: TracePanelSeries,
  includeSamplePoints = false,
): number[] {
  const rendered = entry.renderRuns?.flatMap((run) => [
    ...run.values,
    ...(run.uncertaintyLower ?? []),
    ...(run.uncertaintyUpper ?? []),
  ]);
  const markerValues = includeSamplePoints
    ? traceMarkerObservationIndexes(entry).map((index) =>
      entry.series.observations[index]?.value ?? null)
    : [];
  return [
    ...(rendered ?? entry.series.values),
    ...markerValues,
    ...(entry.uncertaintyLower ?? []),
    ...(entry.uncertaintyUpper ?? []),
  ].filter((value): value is number => value !== null && Number.isFinite(value));
}

function traceXValues(
  entry: TracePanelSeries,
  includeSamplePoints = false,
): number[] {
  const rendered = entry.renderRuns?.flatMap((run) => [...run.times]);
  const markerTimes = includeSamplePoints
    ? traceMarkerObservationIndexes(entry).map((index) =>
      entry.series.observations[index]?.time)
    : [];
  return [
    ...(rendered ?? entry.series.times),
    ...markerTimes,
  ]
    .filter((value): value is number => Number.isFinite(value));
}

type AuthorityPoint = {
  readonly x: number;
  readonly y: number;
  readonly authority?: OutputAuthorityAtomicRoleV1;
};

/** RenderPlan is a detached tree: no nested provenance identity may be shared. */
function cloneAuthorityJson(value: JsonValue): JsonValue {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(cloneAuthorityJson);
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cloneAuthorityJson(child)]),
  );
}

function cloneAuthorityRole(role: OutputAuthorityAtomicRoleV1): OutputAuthorityAtomicRoleV1 {
  return role.tag === 'data_carrier'
    ? {
      tag: 'data_carrier',
      classId: role.classId,
      provenance: cloneAuthorityJson(role.provenance),
    }
    : { tag: role.tag };
}

function authorityCarrier(
  entry: TracePanelSeries,
  observationIndex: number,
  classId: string,
  atomKind: string,
  extra: Readonly<Record<string, JsonValue>> = {},
): OutputAuthorityAtomicRoleV1 | undefined {
  const provenance = entry.outputAuthority?.observationProvenance[observationIndex];
  if (provenance === undefined || provenance === null || typeof provenance !== 'object' || Array.isArray(provenance)) {
    return undefined;
  }
  return {
    tag: 'data_carrier',
    classId,
    provenance: {
      ...cloneAuthorityJson(provenance) as Record<string, JsonValue>,
      atomKind,
      ...cloneAuthorityJson(extra as JsonValue) as Record<string, JsonValue>,
    },
  };
}

function retagCarrier(
  role: OutputAuthorityAtomicRoleV1 | undefined,
  classId: string,
  atomKind: string,
): OutputAuthorityAtomicRoleV1 | undefined {
  if (role?.tag !== 'data_carrier' || role.provenance === null || typeof role.provenance !== 'object' || Array.isArray(role.provenance)) {
    return undefined;
  }
  return {
    tag: 'data_carrier',
    classId,
    provenance: {
      ...cloneAuthorityJson(role.provenance) as Record<string, JsonValue>,
      atomKind,
    },
  };
}

function traceConnectorRole(): OutputAuthorityAtomicRoleV1 {
  return { tag: 'connector' };
}
function distributionDecorativeRole(): OutputAuthorityAtomicRoleV1 {
  // The plan-closure boundary rejects repeated object identity, so every atomic mark
  // receives a fresh plain role object even though the classification is identical.
  return { tag: 'decorative_mark' };
}

function traceSubpaths(
  entry: TracePanelSeries,
  xScale: ReturnType<typeof linearScale>,
  yScale: ReturnType<typeof linearScale>,
): AuthorityPoint[][] {
  if (entry.renderRuns) {
    return entry.renderRuns.flatMap((run) => {
      const points = run.times.map((time, index) => ({
        x: xScale.map(time),
        y: yScale.map(run.values[index]),
        ...(run.authority?.[index] ? { authority: cloneAuthorityRole(run.authority[index]) } : {}),
      }));
      return points.length > 0 ? [points] : [];
    });
  }
  const series = entry.series;
  const subpaths: AuthorityPoint[][] = [];
  let current: AuthorityPoint[] = [];
  for (let index = 0; index < series.times.length; index++) {
    const value = series.values[index];
    if (value === null || !Number.isFinite(value)) {
      if (current.length > 0) {
        if (series.observationKind === 'piecewise_constant') {
          const previous = current[current.length - 1];
          current.push({
            x: xScale.map(series.times[index]),
            y: previous.y,
            authority: traceConnectorRole(),
          });
        }
        subpaths.push(current);
      }
      current = [];
      continue;
    }
    const point: AuthorityPoint = {
      x: xScale.map(series.times[index]),
      y: yScale.map(value),
      ...(entry.outputAuthority
        ? {
          authority: authorityCarrier(
            entry,
            index,
            entry.outputAuthority.pathClassId,
            entry.authorityAtomKinds?.pathVertex ?? 'observation_vertex',
          ),
        }
        : {}),
    };
    if (series.observationKind === 'piecewise_constant' && current.length > 0) {
      const previous = current[current.length - 1];
      current.push({ x: point.x, y: previous.y, authority: traceConnectorRole() });
    }
    current.push(point);
  }
  if (current.length > 0) subpaths.push(current);
  return subpaths;
}

type AuthorityAreaPoint = {
  readonly x: number;
  readonly y0: number;
  readonly y1: number;
  readonly authority?: OutputAuthorityAtomicRoleV1;
};

function traceAreaSubpaths(
  entry: TracePanelSeries,
  xScale: ReturnType<typeof linearScale>,
  yScale: ReturnType<typeof linearScale>,
  includeSamplePoints = false,
): AuthorityAreaPoint[][] {
  if (entry.renderRuns) {
    const subpaths = entry.renderRuns.flatMap((run) => {
      const lower = run.uncertaintyLower;
      const upper = run.uncertaintyUpper;
      if (!lower || !upper || lower.length !== run.times.length || upper.length !== lower.length) {
        return [];
      }
      const subpaths: AuthorityAreaPoint[][] = [];
      let current: AuthorityAreaPoint[] = [];
      for (let index = 0; index < run.times.length; index++) {
        const lo = lower[index];
        const hi = upper[index];
        if (lo === null || hi === null) {
          if (current.length > 0) subpaths.push(current);
          current = [];
          continue;
        }
        current.push({
          x: xScale.map(run.times[index]),
          y0: yScale.map(lo),
          y1: yScale.map(hi),
          ...(run.authority?.[index]
            ? {
              authority: entry.outputAuthority
                ? retagCarrier(
                  run.authority[index],
                  entry.outputAuthority.uncertaintyClassId,
                  'uncertainty_band_vertex',
                )
                : cloneAuthorityRole(run.authority[index]),
            }
            : {}),
        });
      }
      if (current.length > 0) subpaths.push(current);
      return subpaths;
    });
    if (includeSamplePoints) {
      const renderedLineage = new Set<string>();
      for (const run of entry.renderRuns) {
        for (const role of run.authority ?? []) {
          if (
            role.tag !== 'data_carrier' ||
            role.provenance === null ||
            typeof role.provenance !== 'object' ||
            Array.isArray(role.provenance) ||
            !Array.isArray(role.provenance.sourceOrdinals)
          ) continue;
          renderedLineage.add(JSON.stringify(role.provenance.sourceOrdinals));
        }
      }
      const lower = entry.uncertaintyLower;
      const upper = entry.uncertaintyUpper;
      for (const index of traceMarkerObservationIndexes(entry)) {
        const observation = entry.series.observations[index];
        const lo = lower?.[index];
        const hi = upper?.[index];
        if (
          observation === undefined ||
          observation.value === null ||
          renderedLineage.has(JSON.stringify(observation.sourceOrdinals)) ||
          typeof lo !== 'number' ||
          !Number.isFinite(lo) ||
          typeof hi !== 'number' ||
          !Number.isFinite(hi)
        ) continue;
        subpaths.push([{
          x: xScale.map(observation.time),
          y0: yScale.map(lo),
          y1: yScale.map(hi),
          ...(entry.outputAuthority
            ? {
              authority: authorityCarrier(
                entry,
                index,
                entry.outputAuthority.uncertaintyClassId,
                'uncertainty_band_vertex',
              ),
            }
            : {}),
        }]);
      }
    }
    return subpaths;
  }
  const lower = entry.uncertaintyLower;
  const upper = entry.uncertaintyUpper;
  if (!lower || !upper || lower.length !== entry.series.times.length || upper.length !== lower.length) {
    return [];
  }
  const subpaths: AuthorityAreaPoint[][] = [];
  let current: AuthorityAreaPoint[] = [];
  for (let index = 0; index < lower.length; index++) {
    const lo = lower[index];
    const hi = upper[index];
    const x = xScale.map(entry.series.times[index]);
    if (lo === null || hi === null || !Number.isFinite(lo) || !Number.isFinite(hi)) {
      if (current.length > 0) {
        if (entry.series.observationKind === 'piecewise_constant') {
          const previous = current[current.length - 1];
          current.push({ x, y0: previous.y0, y1: previous.y1, authority: traceConnectorRole() });
        }
        subpaths.push(current);
      }
      current = [];
      continue;
    }
    const point: AuthorityAreaPoint = {
      x,
      y0: yScale.map(lo),
      y1: yScale.map(hi),
      ...(entry.outputAuthority
        ? {
          authority: authorityCarrier(
            entry,
            index,
            entry.outputAuthority.uncertaintyClassId,
            'uncertainty_band_vertex',
          ),
        }
        : {}),
    };
    if (entry.series.observationKind === 'piecewise_constant' && current.length > 0) {
      const previous = current[current.length - 1];
      current.push({ x, y0: previous.y0, y1: previous.y1, authority: traceConnectorRole() });
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
  const vertical: {
    position: number;
    from: number;
    to: number;
    authority?: OutputAuthorityAtomicRoleV1;
  }[] = [];
  const caps: {
    position: number;
    from: number;
    to: number;
    authority?: OutputAuthorityAtomicRoleV1;
  }[] = [];
  const halfCap = 3;
  for (let index = 0; index < lower.length; index++) {
    const lo = lower[index];
    const hi = upper[index];
    if (lo === null || hi === null || !Number.isFinite(lo) || !Number.isFinite(hi)) continue;
    const x = xScale.map(entry.series.times[index]);
    const y0 = yScale.map(lo);
    const y1 = yScale.map(hi);
    vertical.push({
      position: x,
      from: y0,
      to: y1,
      ...(entry.outputAuthority
        ? {
          authority: authorityCarrier(
            entry,
            index,
            entry.outputAuthority.uncertaintyClassId,
            'uncertainty_whisker',
            { part: 'shaft' },
          ),
        }
        : {}),
    });
    caps.push(
      {
        position: y0,
        from: x - halfCap,
        to: x + halfCap,
        ...(entry.outputAuthority
          ? {
            authority: authorityCarrier(
              entry,
              index,
              entry.outputAuthority.uncertaintyClassId,
              'uncertainty_whisker',
              { part: 'lower_cap' },
            ),
          }
          : {}),
      },
      {
        position: y1,
        from: x - halfCap,
        to: x + halfCap,
        ...(entry.outputAuthority
          ? {
            authority: authorityCarrier(
              entry,
              index,
              entry.outputAuthority.uncertaintyClassId,
              'uncertainty_whisker',
              { part: 'upper_cap' },
            ),
          }
          : {}),
      },
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
  const legendEntries = [...legendById.values()].filter((entry) => entry.includeInLegend !== false);
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

  const globalYValues = allSeries.flatMap((entry) =>
    traceYValues(entry, options.showSamplePoints === true));
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
      traceXValues(entry, options.showSamplePoints === true));
    const finiteValues = [
      ...panelSpec.series.flatMap((entry) =>
        traceYValues(entry, options.showSamplePoints === true)),
      ...(panelSpec.referenceLines ?? []).map((reference) => reference.value),
    ];
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
      const style = entry.style ?? categoricalStyle(entry.styleIndex);
      const boundaryColor = uncertaintyStroke(context.themeId);
      const seriesMarks: Mark[] = [];
      if (entry.uncertainty?.mark === 'whisker') {
        const whiskers = traceWhiskerMarks(entry, xScale, yScale, boundaryColor);
        if (whiskers) seriesMarks.push(whiskers);
      } else if (entry.uncertainty?.mark === 'band') {
        const uncertaintySubpaths = traceAreaSubpaths(
          entry,
          xScale,
          yScale,
          options.showSamplePoints === true,
        );
        if (uncertaintySubpaths.length > 0) {
          seriesMarks.push({
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
            .map((subpath) => ({
              x: subpath[0].x,
              y: subpath[0].y0,
              ...(entry.outputAuthority
                ? {
                  authority: retagCarrier(
                    subpath[0].authority,
                    entry.outputAuthority.uncertaintyClassId,
                    'uncertainty_degenerate_marker',
                  ),
                }
                : {}),
            }));
          if (degeneratePoints.length > 0) {
            seriesMarks.push({ type: 'point', points: degeneratePoints, fill: boundaryColor, radius: 4, shape: 'diamond' });
          }
        }
      }
      const lineSubpaths = traceSubpaths(entry, xScale, yScale);
      const drawableLines = lineSubpaths.filter(subpathPaintsLine);
      if (drawableLines.length > 0) {
        seriesMarks.push({
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
      const points: AuthorityPoint[] = [];
      if (options.showSamplePoints) {
        const markerIndexes = entry.markerObservationIndexes ??
          entry.series.times.map((_time, index) => index);
        for (const index of markerIndexes) {
          const value = entry.series.values[index];
          if (value !== null && Number.isFinite(value)) {
            points.push({
              x: xScale.map(entry.series.times[index]),
              y: yScale.map(value),
              ...(entry.outputAuthority
                ? {
                  authority: authorityCarrier(
                    entry,
                    index,
                    entry.outputAuthority.sampleClassId,
                    entry.authorityAtomKinds?.sampleMarker ?? 'observation_marker',
                  ),
                }
                : {}),
            });
          }
        }
      } else {
        for (const subpath of lineSubpaths) {
          if (!subpathPaintsLine(subpath)) {
            const first = subpath[0];
            points.push({
              ...first,
              ...(entry.outputAuthority
                ? {
                  authority: retagCarrier(
                    first.authority,
                    entry.outputAuthority.sampleClassId,
                    entry.authorityAtomKinds?.isolatedMarker ?? 'isolated_observation_marker',
                  ),
                }
                : {}),
            });
          }
        }
      }
      if (points.length > 0) {
        seriesMarks.push({ type: 'point', points, fill: style.color, radius: 2.4, shape: style.marker });
        entriesWithPointMarks.add(entry);
      }
      if (seriesMarks.length > 0) {
        if (options.groupSeriesMarks) {
          marks.push({ type: 'group', id: `series-${entry.series.id}`, marks: seriesMarks });
        } else {
          // Keep the established generic trace-plan shape for analog and
          // multisignal consumers. Families whose completeness contract needs
          // per-series addresses opt into the wrapper explicitly.
          marks.push(...seriesMarks);
        }
      }
    }
    for (const reference of panelSpec.referenceLines ?? []) {
      marks.push({
        type: 'group',
        id: `reference-${reference.id}`,
        marks: [{
          type: 'rule',
          orientation: 'horizontal',
          lines: [{
            position: yScale.map(reference.value),
            from: box.x,
            to: box.x + box.width,
            ...(reference.authority ? { authority: cloneAuthorityRole(reference.authority) } : {}),
          }],
          stroke: reference.color,
          strokeWidth: 1,
          dash: reference.dash ?? '4 3',
        }],
      });
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
  for (const panel of panels) {
    for (const entry of panel.series) {
      for (let index = 0; index < entry.series.times.length; index++) {
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
        const style = entry.style ?? categoricalStyle(entry.styleIndex);
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
        const style = entry.style ?? categoricalStyle(entry.styleIndex);
        return {
          label: `${entry.series.label || entry.series.id}: ${entry.uncertainty!.label}`,
          color: style.color,
          outlineColor: uncertaintyStroke(context.themeId),
          glyph: entry.uncertainty!.mark,
        };
      }),
      ...panels.flatMap((panel) => (panel.referenceLines ?? []).map((reference) => ({
        label: reference.label,
        color: reference.color,
        glyph: 'rule' as const,
        dash: reference.dash ?? '4 3',
      }))),
    ],
    accessibility: {
      summary: context.summary,
      panelSummaries: [
        ...(options.summaryStatements ?? []),
        ...panels.map((panel) => {
          const extent = finiteExtent(panel.series.flatMap((entry) =>
            traceYValues(entry, options.showSamplePoints === true)));
          return `${panel.label}: ${panel.series.length} ${panel.series.length === 1 ? 'series' : 'series'}; y axis ${panel.yLabel}; ${panel.scale ?? 'linear'} value scale${extent ? `; displayed range ${formatNumber(extent.min)} to ${formatNumber(extent.max)}` : ''}.`;
        }),
      ],
      ...(panels.length > 1 ? { suppressGlobalValueRange: true } : {}),
    },
    table: {
      policy: 'complete_returned',
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
    /** Exact source identities for OutputAuthority-enabled histogram bins. */
    readonly outputAuthority?: {
      readonly classId: string;
      readonly groupId: string;
    };
  } = {},
): RenderPlanV1 {
  const box = panelBox(context);
  const table = barTable(
    edges,
    values,
    yLabel,
    options.tableMetadata ?? [],
  );
  const accessibility = {
    // The global summary is the exact source-template materialization checked by
    // OutputAuthority.  Supplemental accounting belongs in its separately exposed
    // panel-summary channel; appending it here would make the final plan cease to be
    // an exact one-pass substitution even though no scientific fact was wrong.
    summary: context.summary,
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
    return {
      x: x0,
      y: yTop,
      width: Math.max(0, x1 - x0 - 1),
      height: Math.max(0, baseline - yTop),
      fill: accent(context.themeId),
      ...(options.outputAuthority
        ? {
          authority: {
            tag: 'data_carrier' as const,
            classId: options.outputAuthority.classId,
            provenance: {
              groupId: options.outputAuthority.groupId,
              binIndex: i,
              binStart: edges[i],
              binEnd: edges[i + 1],
            },
          },
        }
        : {}),
    };
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

const PSTH_TABLE_COLUMNS = [
  { key: 'seriesId', header: 'Series id' },
  { key: 'seriesLabel', header: 'Series' },
  { key: 'alignmentLabel', header: 'Alignment' },
  { key: 'binStart', header: 'Bin start (relative)' },
  { key: 'binEnd', header: 'Bin end (relative)' },
  { key: 'binWidth', header: 'Bin width' },
  { key: 'binUnit', header: 'Bin unit' },
  { key: 'relativeWindowStart', header: 'Relative-window start' },
  { key: 'relativeWindowStop', header: 'Relative-window stop' },
  { key: 'relativeWindowUnit', header: 'Relative-window unit' },
  { key: 'relativeWindowBoundary', header: 'Relative-window boundary' },
  { key: 'binBoundary', header: 'Bin boundary' },
  { key: 'finalEdgeInclusive', header: 'Final edge inclusive' },
  { key: 'count', header: 'Events' },
  { key: 'trialDenominator', header: 'Covering trials' },
  { key: 'includedTrialCount', header: 'Included trials' },
  { key: 'excludedTrialCount', header: 'Excluded trials' },
  { key: 'excludedOutOfWindowCount', header: 'Events excluded (out of window)' },
  { key: 'selectedSenderCount', header: 'Selected senders' },
  { key: 'normalization', header: 'Normalization' },
  { key: 'denominatorPolicy', header: 'Denominator policy' },
  { key: 'senderExposurePolicy', header: 'Sender-exposure policy' },
  { key: 'value', header: 'Value' },
  { key: 'valueUnit', header: 'Unit' },
  { key: 'baselineCorrectedValue', header: 'Value minus baseline' },
  { key: 'baselineMode', header: 'Baseline mode' },
  { key: 'baselineRate', header: 'Baseline rate' },
  { key: 'baselineStart', header: 'Baseline start' },
  { key: 'baselineStop', header: 'Baseline stop' },
  { key: 'baselineUnit', header: 'Baseline unit' },
] as const;

/**
 * PSTH geometry consumes the audited derivation as one object.  In particular, a
 * missing bin is omitted rather than converted to zero, and baseline-corrected
 * negative values extend below the visible zero rule instead of being clipped by the
 * generic non-negative histogram scale.
 */
export function compilePsthFigure(
  context: CompileContext,
  psth: PsthResult,
  options: {
    readonly seriesId: string;
    readonly alignmentLabel: string;
    readonly seriesLabel: string;
    readonly normalization: string;
    readonly denominatorPolicy: string;
  },
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  const rowsTotal = psth.counts.length;
  const rows = Array.from({ length: rowsTotal }, (_unused, index) => [
    options.seriesId,
    options.seriesLabel,
    options.alignmentLabel,
    psth.edges[index],
    psth.edges[index + 1],
    psth.binWidths[index],
    psth.binUnit,
    psth.relativeWindowStart,
    psth.relativeWindowStop,
    psth.relativeWindowUnit,
    psth.relativeWindowBoundary,
    psth.binBoundary,
    psth.finalEdgeInclusive ? 'true' : 'false',
    psth.counts[index],
    psth.trialDenominators[index],
    psth.includedTrialCount,
    psth.excludedTrialCount,
    psth.excludedOutOfWindowCount,
    psth.selectedSenderCount,
    options.normalization,
    options.denominatorPolicy,
    psth.senderExposurePolicy,
    psth.values[index],
    psth.valueUnit,
    psth.baselineRate === null ? null : psth.baselineCorrectedValues[index],
    psth.baselineRate === null ? null : 'subtract_mean_rate',
    psth.baselineRate,
    psth.baselineStart,
    psth.baselineStop,
    psth.baselineUnit,
  ] as (string | number | null)[]);
  const table: RenderPlanV1['table'] = {
    policy: 'complete_returned',
    columns: PSTH_TABLE_COLUMNS,
    rows,
    rowsInline: rows.length,
    rowsTotal,
  };

  const finiteDisplay = psth.displayValues.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  const plottedExtent = finiteExtent(finiteDisplay);
  const xScale = linearScale(
    psth.edges[0],
    psth.edges[psth.edges.length - 1],
    box.x,
    box.x + box.width,
  );
  const xAxisModel = xAxis(
    `time from ${options.alignmentLabel} (${psth.binUnit})`,
    xScale,
  );
  const normalizationLabel = options.normalization === 'count'
    ? 'event count'
    : options.normalization === 'count_per_trial'
      ? 'events / covering trial'
      : options.normalization === 'total_event_rate_per_trial'
        ? `selected-group event rate / covering trial (${psth.valueUnit})`
        : `mean event rate / selected sender / covering trial (${psth.valueUnit})`;
  const yLabel = psth.baselineRate === null
    ? normalizationLabel
    : `${normalizationLabel} minus baseline`;
  const zeroOnDisplayedAxis = psth.edges[0] <= 0 && 0 <= psth.edges[psth.edges.length - 1];
  const zeroIncludedByMembership = zeroOnDisplayedAxis && (
    0 < psth.edges[psth.edges.length - 1] ||
    (0 === psth.edges[psth.edges.length - 1] && psth.finalEdgeInclusive)
  );
  const summaryStatements = [
    `${options.seriesLabel}, aligned to ${options.alignmentLabel}: relative window ${psth.relativeWindowStart} to ${psth.relativeWindowStop} ${psth.relativeWindowUnit} with boundary ${psth.relativeWindowBoundary}; ${psth.counts.length} explicit bins in ${psth.binUnit} with boundary ${psth.binBoundary}; final-edge inclusion ${psth.finalEdgeInclusive}.`,
    `${psth.exactCountTotal} counted events; selected-sender cardinality ${psth.selectedSenderCount}; included-trial cardinality ${psth.includedTrialCount}; excluded-trial cardinality ${psth.excludedTrialCount}; denominator policy ${options.denominatorPolicy}; normalization ${options.normalization}.`,
    psth.mode === 'prebinned'
      ? 'The pre-binned aggregate retains exact sender and trial cardinalities but not selected-sender identities or the membership partition between included and excluded trial ids; those identities cannot be recovered from this artifact.'
      : 'Events mode retains the complete selected-sender and included-trial identity universes; it has no excluded-trial partition.',
    psth.senderExposurePolicy === null
      ? 'No per-selected-sender exposure divisor was applied.'
      : 'The per-selected-sender rate uses the explicit all-selected-senders/all-counted-trial-bins rectangular-exposure assertion; Cortexel cannot verify that exposure from event presence.',
    psth.excludedOutOfWindowCount === null
      ? 'The pre-binned input does not expose an out-of-window event count.'
      : `${psth.excludedOutOfWindowCount} source events were excluded by the relative window before bin placement.`,
    psth.missingBinCount > 0
      ? psth.missingBinCount === 1
        ? '1 bin has no covering trial and remains a missing gap, not a measured zero.'
        : `${psth.missingBinCount} bins have no covering trial and remain missing gaps, not measured zeros.`
      : 'Every bin has positive declared trial exposure.',
    psth.baselineRate === null
      ? 'No baseline subtraction was requested.'
      : `The aggregate baseline is ${formatNumber(psth.baselineRate)} ${psth.valueUnit}, re-derived from raw counts and summed exact exposure; plotted values subtract it while the table retains uncorrected values and counts.`,
    psth.baselineRate !== null && plottedExtent
      ? `The plotted baseline-corrected range is ${formatNumber(plottedExtent.min)} to ${formatNumber(plottedExtent.max)} ${psth.valueUnit}.`
      : psth.baselineRate !== null
        ? 'No baseline-corrected value is observable because every displayed bin is missing.'
        : 'The plotted values are the uncorrected normalization.',
    zeroIncludedByMembership
      ? 'Relative time zero is included by the displayed membership window and is shown as a vertical reference.'
      : zeroOnDisplayedAxis
        ? 'Relative time zero lies on the displayed half-open stop boundary and is shown as a boundary reference, but events at zero are excluded by membership.'
      : 'Relative time zero lies outside the displayed window, so no zero reference line is visible; the declared alignment still defines every relative coordinate.',
  ];

  if (finiteDisplay.length === 0) {
    return {
      ...frame(context, skillId),
      panels: [{
        id: 'main',
        ...box,
        axes: [xAxisModel],
        marks: [],
        noData: { reason: 'no included trial covered any PSTH bin' },
      }],
      table,
      legend: [],
      accessibility: {
        summary: context.summary,
        panelSummaries: summaryStatements,
        suppressGlobalValueRange: psth.baselineRate !== null,
      },
    };
  }

  const displayExtent = finiteExtent(finiteDisplay)!;
  const yMinimum = Math.min(0, displayExtent.min);
  const yMaximum = Math.max(0, displayExtent.max);
  const yScale: NumericScale = psth.baselineRate === null && yMinimum === 0 && yMaximum === 0
    ? {
      domainMin: 0,
      domainMax: 0,
      rangeMin: box.y + box.height,
      rangeMax: box.y,
      transform: 'linear',
      map(value: number): number {
        if (!Number.isFinite(value)) return Number.NaN;
        return value <= 0 ? box.y + box.height : box.y;
      },
      ticks(): readonly { readonly value: number; readonly label: string }[] {
        return [{ value: 0, label: '0' }];
      },
    }
    : linearNumericScale(yMinimum, yMaximum, box.y + box.height, box.y);
  const zero = yScale.map(0);
  const rects = psth.displayValues.flatMap((value, index) => {
    if (value === null || !Number.isFinite(value)) return [];
    const x0 = xScale.map(psth.edges[index]);
    const x1 = xScale.map(psth.edges[index + 1]);
    const valueY = yScale.map(value);
    return [{
      x: x0,
      y: Math.min(zero, valueY),
      width: x1 - x0,
      height: Math.abs(zero - valueY),
      fill: accent(context.themeId),
      authority: {
        tag: 'data_carrier' as const,
        classId: 'bins',
        provenance: {
          binIndex: index,
          binStart: psth.edges[index],
          binEnd: psth.edges[index + 1],
        },
      },
    }];
  });
  const marks: Mark[] = [{ type: 'rect', rects }];

  if (psth.missingBinCount > 0) {
    const lines = psth.displayValues.flatMap((value, index) => value === null
      ? [{
        position: (xScale.map(psth.edges[index]) + xScale.map(psth.edges[index + 1])) / 2,
        from: box.y,
        to: box.y + box.height,
        authority: distributionDecorativeRole(),
      }]
      : []);
    marks.push({
      type: 'rule',
      orientation: 'vertical',
      lines,
      stroke: missingColor(context.themeId),
      strokeWidth: 1,
      dash: '2 3',
    });
  }
  if (zeroOnDisplayedAxis) {
    marks.push({
      type: 'rule',
      orientation: 'vertical',
      lines: [{
        position: xScale.map(0),
        from: box.y,
        to: box.y + box.height,
        authority: distributionDecorativeRole(),
      }],
      stroke: uncertaintyStroke(context.themeId),
      strokeWidth: 1.25,
      dash: '4 3',
    });
  }
  if (psth.baselineRate !== null) {
    marks.push({
      type: 'rule',
      orientation: 'horizontal',
      lines: [{
        position: zero,
        from: box.x,
        to: box.x + box.width,
        authority: distributionDecorativeRole(),
      }],
      stroke: uncertaintyStroke(context.themeId),
      strokeWidth: 1.25,
      dash: '4 3',
    });
  }

  return {
    ...frame(context, skillId),
    panels: [{
      id: 'main',
      label: options.seriesLabel,
      ...box,
      axes: [xAxisModel, yAxis(yLabel, yScale)],
      marks,
    }],
    table,
    legend: [
      { label: options.seriesLabel, color: accent(context.themeId), glyph: 'series' },
      ...(psth.missingBinCount > 0
        ? [{
          label: 'No included trial covered this bin',
          color: missingColor(context.themeId),
          glyph: 'rule' as const,
          dash: '2 3',
        }]
        : []),
    ],
    accessibility: {
      summary: context.summary,
      panelSummaries: summaryStatements,
      suppressGlobalValueRange: psth.baselineRate !== null,
    },
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
    readonly outputAuthority?: { readonly classId: string };
  } = {},
): RenderPlanV1 {
  const box = panelBox(context);
  const accessibility = {
    // Keep group accounting discoverable without mutating the source-owned global
    // summary program after the compiler has closed its placeholder vocabulary.
    summary: context.summary,
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
        ...(options.outputAuthority
          ? {
            authority: {
              tag: 'data_carrier' as const,
              classId: options.outputAuthority.classId,
              provenance: {
                groupId: group.id,
                binIndex,
                binStart: edges[binIndex],
                binEnd: edges[binIndex + 1],
              },
            },
          }
          : {}),
      };
    });
    return { type: 'rect' as const, rects };
  });
  const rowsTotal = groups.reduce((sum, group) => sum + group.values.length, 0);
  const rows: (string | number | null)[][] = [];
  for (const group of groups) {
    for (let index = 0; index < group.values.length; index++) {
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
      policy: 'complete_returned',
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
  valueHeader = 'Value',
  metadata: readonly {
    readonly key: string;
    readonly header: string;
    readonly value: string | number | null;
  }[] = [],
): RenderPlanV1['table'] {
  const rows = Array.from(
    { length: values.length },
    (_value, i) => [
      edges[i],
      edges[i + 1],
      values[i],
      ...metadata.map((entry) => entry.value),
    ] as (string | number | null)[],
  );
  return {
    policy: 'complete_returned',
    columns: [
      { key: 'binStart', header: 'Bin start' },
      { key: 'binEnd', header: 'Bin end' },
      { key: 'value', header: valueHeader },
      ...metadata.map(({ key, header }) => ({ key, header })),
    ],
    rows,
    rowsInline: rows.length,
    rowsTotal: values.length,
  };
}

export interface RasterFigureRow {
  readonly key: string;
  readonly label: string;
}

export interface RasterFigureEvent {
  readonly sourceOrdinal: number;
  readonly eventId: string;
  readonly time: number;
  readonly timeUnit: string;
  readonly senderId: string;
  readonly trialId: string | null;
  readonly populationId: string | null;
  readonly rowKey: string;
  readonly rowIndex: number;
  readonly rowLabel: string;
  readonly inWindow: boolean;
}

/**
 * A spike raster: one row per declared sender/trial and one glyph per accepted event.
 *
 * `events` contains accepted and excluded rows because the honesty table must retain
 * both. Only `inWindow` rows become marks. Row keys are collision-free identities;
 * human labels are deliberately separate and are never used for lookup.
 */
export function compileRasterFigure(
  context: CompileContext,
  events: readonly RasterFigureEvent[],
  rows: readonly RasterFigureRow[],
  windowStart: number,
  windowStop: number,
  timeLabel: string,
  markStyle: 'tick' | 'point',
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (rows.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'no declared event rows')], table: emptyTable(), legend: [] };
  }

  const rowIndex = new Map<string, number>();
  rows.forEach((row, i) => rowIndex.set(row.key, i));

  const xScale = linearScale(windowStart, windowStop, box.x, box.x + box.width);
  const rowHeight = box.height / rows.length;
  const tickHalf = Math.max(1, Math.min(rowHeight * 0.4, 4));

  const lines: {
    position: number;
    from: number;
    to: number;
    authority: OutputAuthorityAtomicRoleV1;
  }[] = [];
  const points: { x: number; y: number; authority: OutputAuthorityAtomicRoleV1 }[] = [];
  for (const event of events) {
    if (!event.inWindow) continue;
    const row = rowIndex.get(event.rowKey);
    if (row === undefined) continue;
    const x = xScale.map(event.time);
    const yCenter = box.y + (row + 0.5) * rowHeight;
    const authority: OutputAuthorityAtomicRoleV1 = {
      tag: 'data_carrier',
      classId: 'events',
      provenance: {
        sourceOrdinal: event.sourceOrdinal,
        eventId: event.eventId,
        senderId: event.senderId,
        trialId: event.trialId,
        rowKey: event.rowKey,
      },
    };
    if (markStyle === 'point') points.push({ x, y: yCenter, authority });
    else lines.push({
      position: x,
      from: yCenter - tickHalf,
      to: yCenter + tickHalf,
      authority,
    });
  }

  const marks: Mark[] = markStyle === 'point'
    ? [{ type: 'point', points, fill: accent(context.themeId), radius: 2, shape: 'circle' }]
    : [{ type: 'rule', orientation: 'vertical', lines, stroke: accent(context.themeId), strokeWidth: 1 }];
  const axes: Axis[] = [
    xAxis(timeLabel, xScale),
    {
      orientation: 'left',
      label: 'sender / trial',
      transform: 'band',
      ticks: yAxisRowTicks(rows.map((row) => row.label), box, rowHeight),
    },
  ];

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table: {
      policy: 'complete_returned',
      columns: [
        { key: 'sourceOrdinal', header: 'Source ordinal' },
        { key: 'eventId', header: 'Event id' },
        { key: 'time', header: 'Event time' },
        { key: 'timeUnit', header: 'Time unit' },
        { key: 'senderId', header: 'Sender' },
        { key: 'trialId', header: 'Trial' },
        { key: 'populationId', header: 'Population' },
        { key: 'rowKey', header: 'Row key' },
        { key: 'rowIndex', header: 'Row index' },
        { key: 'rowLabel', header: 'Row label' },
        { key: 'inWindow', header: 'In window' },
      ],
      rows: events.map((event) => [
        event.sourceOrdinal,
        event.eventId,
        event.time,
        event.timeUnit,
        event.senderId,
        event.trialId,
        event.populationId,
        event.rowKey,
        event.rowIndex,
        event.rowLabel,
        event.inWindow ? 'true' : 'false',
      ] as (string | number | null)[]),
      rowsInline: events.length,
      rowsTotal: events.length,
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

export type MatrixFigureCellState =
  | 'present'
  | 'valued'
  | 'present_with_missing_value'
  | 'present_without_value';

export interface MatrixFigureSpec {
  readonly rowIds: readonly string[];
  readonly columnIds: readonly string[];
  /** One entry for every connection-bearing cell; absence is represented by row authority. */
  readonly cells: readonly {
    readonly rowIndex: number;
    readonly columnIndex: number;
    readonly value: number | null;
    readonly state: MatrixFigureCellState;
    /** Request-bound scientific carrier identity; numeric geometry is not assured in V1. */
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }[];
  /** True means an empty cell in the target row is measured absence. */
  readonly observedRows: readonly boolean[];
  readonly valueSemantics: 'binary_presence' | 'multiplicity' | 'weight' | 'delay';
  readonly numericScale?: 'linear' | 'log';
  readonly colorScale?:
    | { readonly class: 'sequential' }
    | { readonly class: 'diverging'; readonly center: number };
  readonly valueLabel: string;
  readonly summary: string;
}

/**
 * A matrix heatmap over Cortexel's fixed target-row/source-column orientation.
 *
 * Empty complete rows and unobserved rows are different background states. Every
 * connection-bearing cell is an explicit foreground rectangle, including a measured
 * numeric zero. Missing weight states use reserved, outlined marks outside the numeric
 * colour domain, so missingness cannot become zero or a partial aggregate.
 */
export function compileMatrixFigure(
  context: CompileContext,
  spec: MatrixFigureSpec,
  skillId: string,
): RenderPlanV1 {
  const baseBox = panelBox(context);
  if (spec.rowIds.length === 0 || spec.columnIds.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(baseBox, 'empty node universe')], table: emptyTable(), legend: [] };
  }

  const valued = spec.cells.filter(
    (cell): cell is typeof cell & { readonly value: number } =>
      cell.value !== null && (cell.state === 'present' || cell.state === 'valued'),
  );
  const extent = finiteExtentBy(valued, (cell) => cell.value);
  const missingPartial = spec.cells.filter((cell) => cell.state === 'present_with_missing_value');
  const missingAll = spec.cells.filter((cell) => cell.state === 'present_without_value');
  const domainQualifier = spec.valueSemantics === 'binary_presence'
    ? 'painted presence values'
    : 'complete painted values';
  const legend = [
    {
      label: `${spec.valueLabel}${extent ? `; ${domainQualifier} ${formatNumber(extent.min)} to ${formatNumber(extent.max)}` : '; no complete numeric cell value'}`,
      color: accent(context.themeId),
      outlineColor: uncertaintyStroke(context.themeId),
      glyph: 'band' as const,
    },
    ...(spec.observedRows.some(Boolean)
      ? [{
        label: 'Observed empty cell: measured absence inside a complete target row; it is not a measured numeric zero',
        color: gridColor(context.themeId),
        outlineColor: uncertaintyStroke(context.themeId),
        glyph: 'band' as const,
      }]
      : []),
    ...(spec.observedRows.some((observed) => !observed)
      ? [{
        label: 'not_observed: this scope cannot establish presence or absence for the target row',
        color: withOpacity(missingColor(context.themeId), 0.24),
        outlineColor: missingColor(context.themeId),
        glyph: 'band' as const,
      }]
      : []),
    ...(missingPartial.length > 0
      ? [{
        label: 'Connection present, but at least one contributing weight is missing; no partial aggregate is painted',
        color: withOpacity(missingColor(context.themeId), 0.58),
        outlineColor: accent(context.themeId),
        glyph: 'band' as const,
      }]
      : []),
    ...(missingAll.length > 0
      ? [{
        label: 'Connection present with no measured contributing weight; missing is not zero',
        color: missingColor(context.themeId),
        outlineColor: uncertaintyStroke(context.themeId),
        glyph: 'band' as const,
      }]
      : []),
  ];
  const legendInset = legendPlotInset(context.width, legend.length, context.subtitle !== undefined);
  const box = {
    ...baseBox,
    y: baseBox.y + legendInset,
    height: baseBox.height - legendInset,
  };
  const cellW = box.width / spec.columnIds.length;
  const cellH = box.height / spec.rowIds.length;
  const cellRect = (cell: {
    readonly rowIndex: number;
    readonly columnIndex: number;
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }, fill: string) => ({
    x: box.x + cell.columnIndex * cellW,
    y: box.y + cell.rowIndex * cellH,
    width: Math.max(0, cellW - 0.5),
    height: Math.max(0, cellH - 0.5),
    fill,
    ...(cell.authority === undefined
      ? {}
      : { authority: cloneAuthorityRole(cell.authority) }),
  });
  const colorFor = (value: number): string => {
    if (spec.valueSemantics === 'binary_presence') return accent(context.themeId);
    if (!extent || extent.min === extent.max) return sequentialColor(0.72);
    if (spec.colorScale?.class === 'diverging') {
      return symmetricMatrixDivergingColor(
        value,
        extent.min,
        extent.max,
        spec.colorScale.center,
      );
    }
    const t = spec.numericScale === 'log'
      ? (Math.log(value) - Math.log(extent.min)) / (Math.log(extent.max) - Math.log(extent.min))
      : (value - extent.min) / (extent.max - extent.min);
    return sequentialColor(t);
  };

  // Begin with not-observed authority, then paint complete target rows as observed-empty.
  // Consecutive observed rows are combined into one background rectangle without changing
  // the cell semantics or hiding any diagonal.
  const backgrounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    authority: OutputAuthorityAtomicRoleV1;
  }[] = [];
  if (spec.observedRows.some((observed) => !observed)) {
    backgrounds.push({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      fill: withOpacity(missingColor(context.themeId), 0.24),
      authority: distributionDecorativeRole(),
    });
  }
  let runStart: number | null = null;
  for (let row = 0; row <= spec.observedRows.length; row++) {
    if (row < spec.observedRows.length && spec.observedRows[row]) {
      if (runStart === null) runStart = row;
      continue;
    }
    if (runStart !== null) {
      backgrounds.push({
        x: box.x,
        y: box.y + runStart * cellH,
        width: box.width,
        height: (row - runStart) * cellH,
        fill: gridColor(context.themeId),
        authority: distributionDecorativeRole(),
      });
      runStart = null;
    }
  }

  const marks: Mark[] = [
    { type: 'rect', rects: backgrounds, stroke: uncertaintyStroke(context.themeId) },
    {
      type: 'rect',
      rects: valued.map((cell) => cellRect(cell, colorFor(cell.value))),
      // The outline makes an exact numeric zero visibly present even when its colour is
      // close to the observed-empty background or to a diverging neutral colour.
      stroke: uncertaintyStroke(context.themeId),
    },
    ...(missingPartial.length > 0
      ? [{
        type: 'rect' as const,
        rects: missingPartial.map((cell) => cellRect(cell, withOpacity(missingColor(context.themeId), 0.58))),
        stroke: accent(context.themeId),
      }]
      : []),
    ...(missingAll.length > 0
      ? [{
        type: 'rect' as const,
        rects: missingAll.map((cell) => cellRect(cell, missingColor(context.themeId))),
        stroke: uncertaintyStroke(context.themeId),
      }]
      : []),
  ];
  const axes: Axis[] = [
    { orientation: 'bottom', label: 'source (column)', transform: 'band', ticks: bandTicks(spec.columnIds, box.x, box.width) },
    { orientation: 'left', label: 'target (row)', transform: 'band', ticks: bandTicks(spec.rowIds, box.y, box.height) },
  ];

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table: emptyTable(),
    legend,
    accessibility: {
      summary: spec.summary,
      panelSummaries: [spec.summary],
    },
  };
}

function bandTicks(ids: readonly string[], start: number, span: number): Axis['ticks'] {
  const step = Math.max(1, Math.ceil(ids.length / 12));
  const band = span / ids.length;
  const ticks: { position: number; label: string }[] = [];
  for (let i = 0; i < ids.length; i += step) {
    ticks.push({ position: start + (i + 0.5) * band, label: ids[i] });
  }
  return ticks;
}

function interpolateChannel(start: number, stop: number, t: number): number {
  return Math.round(start + (stop - start) * Math.max(0, Math.min(1, t)));
}

function rgbHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0'))
    .join('')}`;
}

function sequentialColor(t: number): string {
  return rgbHex(
    interpolateChannel(230, 0, t),
    interpolateChannel(241, 114, t),
    interpolateChannel(248, 178, t),
  );
}

function symmetricMatrixDivergingColor(
  value: number,
  minimum: number,
  maximum: number,
  center: number,
): string {
  if (![value, minimum, maximum, center].every(Number.isFinite)) {
    throw new Error('a diverging matrix colour requires finite value, extent, and center');
  }
  const valueUnits = finiteBinary64ToMinSubnormalUnits(value);
  const minimumUnits = finiteBinary64ToMinSubnormalUnits(minimum);
  const maximumUnits = finiteBinary64ToMinSubnormalUnits(maximum);
  const centerUnits = finiteBinary64ToMinSubnormalUnits(center);
  if (!(minimumUnits < centerUnits && centerUnits < maximumUnits)) {
    throw new Error(
      'a diverging matrix colour requires complete valued aggregates strictly below and above its center',
    );
  }
  const negativeRadius = centerUnits - minimumUnits;
  const positiveRadius = maximumUnits - centerUnits;
  const radius = negativeRadius > positiveRadius ? negativeRadius : positiveRadius;
  const signedDistance = valueUnits - centerUnits;
  const distance = signedDistance < 0n ? -signedDistance : signedDistance;
  const t = exactRationalToBinary64(distance, radius);
  if (signedDistance < 0n) {
    return rgbHex(
      interpolateChannel(247, 3, t),
      interpolateChannel(247, 115, t),
      interpolateChannel(247, 171, t),
    );
  }
  return rgbHex(
    interpolateChannel(247, 211, t),
    interpolateChannel(247, 99, t),
    interpolateChannel(247, 3, t),
  );
}

/** Legacy family-local diverging scale; callers outside figure.matrix retain revision-1 semantics. */
function divergingColor(value: number, minimum: number, maximum: number, center: number): string {
  if (value < center) {
    const denominator = center - minimum;
    const t = denominator > 0 ? (center - value) / denominator : 1;
    return rgbHex(
      interpolateChannel(247, 0, t),
      interpolateChannel(247, 114, t),
      interpolateChannel(247, 178, t),
    );
  }
  const denominator = maximum - center;
  const t = denominator > 0 ? (value - center) / denominator : 1;
  return rgbHex(
    interpolateChannel(247, 213, t),
    interpolateChannel(247, 94, t),
    interpolateChannel(247, 0, t),
  );
}

function equalScaleMapper(
  box: ReturnType<typeof panelBox>,
  xs: readonly number[],
  ys: readonly number[],
  declaredDomain?: {
    readonly xMin: number;
    readonly xMax: number;
    readonly yMin: number;
    readonly yMax: number;
    readonly centerX?: number;
    readonly centerY?: number;
    readonly periodX?: number;
    readonly periodY?: number;
  },
): {
  readonly map: (x: number, y: number) => { readonly x: number; readonly y: number };
  readonly xScale: ReturnType<typeof linearScale>;
  readonly yScale: ReturnType<typeof linearScale>;
  readonly bounds: { readonly xMin: number; readonly xMax: number; readonly yMin: number; readonly yMax: number };
} {
  const xExtent = finiteExtent(xs)!;
  const yExtent = finiteExtent(ys)!;
  let xMin = declaredDomain?.xMin ?? xExtent.min;
  let xMax = declaredDomain?.xMax ?? xExtent.max;
  let yMin = declaredDomain?.yMin ?? yExtent.min;
  let yMax = declaredDomain?.yMax ?? yExtent.max;
  if (!declaredDomain) {
    const xSpan = xMax - xMin;
    const ySpan = yMax - yMin;
    const nonzero = Math.max(xSpan, ySpan);
    if (!(nonzero > 0)) throw new Error('a spatial map with no declared domain has zero extent on both axes');
    const xPadding = (xSpan > 0 ? xSpan : nonzero) * 0.02;
    const yPadding = (ySpan > 0 ? ySpan : nonzero) * 0.02;
    xMin -= xPadding;
    xMax += xPadding;
    yMin -= yPadding;
    yMax += yPadding;
  }
  const dataWidth = declaredDomain?.periodX ?? xMax - xMin;
  const dataHeight = declaredDomain?.periodY ?? yMax - yMin;
  const span = Math.max(dataWidth, dataHeight);
  if (!(span > 0)) throw new Error('spatial display domain has no positive extent');
  const scaleFactor = Math.min(box.width, box.height) / span;
  const dataCenterX = declaredDomain?.centerX ?? xMin / 2 + xMax / 2;
  const dataCenterY = declaredDomain?.centerY ?? yMin / 2 + yMax / 2;
  const pageCenterX = box.x + box.width / 2;
  const pageCenterY = box.y + box.height / 2;
  const map = (x: number, y: number) => ({
    x: pageCenterX + (x - dataCenterX) * scaleFactor,
    y: pageCenterY - (y - dataCenterY) * scaleFactor,
  });
  // The declared endpoints can differ from center +/- extent/2 by one bounded
  // roundTiesToEven endpoint error.  Map the actual published endpoints so the axes,
  // domain rectangle, points, and periodic split geometry share one authority.
  const left = map(xMin, dataCenterY).x;
  const right = map(xMax, dataCenterY).x;
  const bottom = map(dataCenterX, yMin).y;
  const top = map(dataCenterX, yMax).y;
  return {
    map,
    xScale: linearScale(xMin, xMax, left, right),
    yScale: linearScale(yMin, yMax, bottom, top),
    bounds: { xMin, xMax, yMin, yMax },
  };
}

export interface SpatialMapFigureSpec {
  readonly nodes: readonly {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly group?: string;
    readonly groupIndex?: number;
    readonly value?: number | null;
  }[];
  readonly connections: readonly {
    readonly id: string;
    readonly sourceId: string;
    readonly targetId: string;
    /** Canonical source-row ordinal; never an invented external edge identity. */
    readonly sourceOrdinal: number;
    readonly value?: number | null;
  }[];
  readonly xLabel: string;
  readonly yLabel: string;
  readonly markerRadius: number;
  readonly nodeEncoding: 'uniform' | 'group' | 'value';
  readonly nodeValueScale?: {
    readonly kind: 'sequential' | 'diverging';
    readonly center?: number;
    readonly transform: 'linear' | 'symlog';
    readonly linearThreshold?: number;
  };
  readonly connectionEncoding?: {
    readonly channel: 'width' | 'color' | 'width_and_color';
    readonly colorKind: 'sequential' | 'diverging';
    readonly center?: number;
  };
  readonly multapseAggregation?: TopologyScalarAggregation;
  readonly domain?: SpatialRoutingDomain;
}

function insetArrow(
  from: { readonly x: number; readonly y: number },
  target: { readonly x: number; readonly y: number },
  radius: number,
): { readonly from: { readonly x: number; readonly y: number }; readonly to: { readonly x: number; readonly y: number } } | undefined {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!(length > 0)) return undefined;
  const ux = dx / length;
  const uy = dy / length;
  const to = { x: target.x - ux * radius, y: target.y - uy * radius };
  return { from: { x: to.x - ux * 10, y: to.y - uy * 10 }, to };
}

/** Measured 2-D nodes plus every declared connection, with no invented node geometry. */
export function compileSpatialMapFigure(
  context: CompileContext,
  spec: SpatialMapFigureSpec,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (spec.nodes.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'no positioned nodes')], table: emptyTable(), legend: [] };
  }
  const mapper = equalScaleMapper(
    box,
    spec.nodes.map((node) => node.x),
    spec.nodes.map((node) => node.y),
    spec.domain,
  );
  const pageById = new Map(spec.nodes.map((node) => [node.id, mapper.map(node.x, node.y)]));
  const scientificById = new Map(spec.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
  const nodeOrdinal = new Map(spec.nodes.map((node, index) => [node.id, index]));
  const canonicalPair = (source: string, target: string): readonly [string, string] =>
    nodeOrdinal.get(source)! <= nodeOrdinal.get(target)!
      ? [source, target]
      : [target, source];
  const pairKey = (source: string, target: string) => {
    const [first, second] = canonicalPair(source, target);
    return `${first}\u0000${second}`;
  };
  const pairs = new Map<string, typeof spec.connections[number][]>();
  for (const connection of spec.connections) {
    const key = pairKey(connection.sourceId, connection.targetId);
    const entries = pairs.get(key);
    if (entries) entries.push(connection);
    else pairs.set(key, [connection]);
  }
  const pairValues = [...pairs.values()].map((entries) => aggregateTopologyScalar(
    entries.flatMap((entry) => typeof entry.value === 'number' ? [entry.value] : []),
    entries.length === 1 ? 'no_aggregation' : spec.multapseAggregation,
  ));
  const finitePairValues = pairValues.filter((value): value is number => value !== null);
  const pairExtent = finiteExtent(finitePairValues);
  const pairMagnitudeExtent = finiteExtent(finitePairValues.map((entry) => Math.abs(entry)));
  const nodeValues = spec.nodes.flatMap((node) => typeof node.value === 'number' ? [node.value] : []);
  const nodeValueExtent = finiteExtent(nodeValues);
  const nodeTransform = (value: number): number => {
    if (spec.nodeValueScale?.transform !== 'symlog') return value;
    const threshold = spec.nodeValueScale.linearThreshold!;
    const origin = spec.nodeValueScale.kind === 'diverging'
      ? spec.nodeValueScale.center ?? 0
      : 0;
    const delta = exactBinary64Sum([value, -origin]);
    const transformed = symlogTransform(delta, threshold);
    if (!Number.isFinite(transformed)) {
      throw new Error('spatial node symlog transform is unrepresentable in finite binary64');
    }
    return transformed;
  };
  const transformedNodeValues = nodeValues.map(nodeTransform);
  const nodeExtent = finiteExtent(transformedNodeValues);
  const marks: Mark[] = [];
  if (spec.domain) {
    const topLeft = mapper.map(spec.domain.xMin, spec.domain.yMax);
    const bottomRight = mapper.map(spec.domain.xMax, spec.domain.yMin);
    marks.push({
      type: 'group',
      id: 'declared-domain',
      marks: [{
        type: 'rect',
        rects: [{
          x: topLeft.x,
          y: topLeft.y,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y,
          fill: '#00000000',
          authority: { tag: 'decorative_mark' },
        }],
        stroke: gridColor(context.themeId),
      }],
    });
  }
  let pairOrdinal = 0;
  for (const entries of pairs.values()) {
    const first = entries[0];
    const [physicalSourceId, physicalTargetId] = canonicalPair(first.sourceId, first.targetId);
    const sourceScientific = scientificById.get(physicalSourceId)!;
    const targetScientific = scientificById.get(physicalTargetId)!;
    const sourcePage = pageById.get(physicalSourceId)!;
    const targetPage = pageById.get(physicalTargetId)!;
    const value = pairValues[pairOrdinal++];
    const magnitudeT = value !== null && pairMagnitudeExtent && pairMagnitudeExtent.max !== pairMagnitudeExtent.min
      ? (Math.abs(value) - pairMagnitudeExtent.min) / (pairMagnitudeExtent.max - pairMagnitudeExtent.min)
      : 0.5;
    const colorT = value !== null && pairExtent && pairExtent.max !== pairExtent.min
      ? (value - pairExtent.min) / (pairExtent.max - pairExtent.min)
      : 0.5;
    const connectionUsesColor = spec.connectionEncoding?.channel === 'color' ||
      spec.connectionEncoding?.channel === 'width_and_color';
    const color = spec.connectionEncoding && value === null
      ? missingColor(context.themeId)
      : connectionUsesColor && value !== null
        ? spec.connectionEncoding!.colorKind === 'diverging'
          ? divergingColor(value, pairExtent?.min ?? value, pairExtent?.max ?? value, spec.connectionEncoding!.center ?? 0)
          : sequentialColor(colorT)
        : spec.connectionEncoding
          ? accent(context.themeId)
          : gridColor(context.themeId);
    const width = spec.connectionEncoding && value !== null &&
      (spec.connectionEncoding.channel === 'width' || spec.connectionEncoding.channel === 'width_and_color')
      ? 1 + 4 * magnitudeT
      : 1.25;
    const pairMarks: Mark[] = [];
    if (physicalSourceId === physicalTargetId) {
      const radius = spec.markerRadius + 10;
      const loop = [
        sourcePage,
        { x: sourcePage.x + radius, y: sourcePage.y - radius },
        { x: sourcePage.x + 2 * radius, y: sourcePage.y },
        { x: sourcePage.x + radius, y: sourcePage.y + radius },
        sourcePage,
      ];
      pairMarks.push({
        type: 'line',
        subpaths: [loop.map((point) => ({ ...point, authority: { tag: 'connector' as const } }))],
        stroke: color,
        strokeWidth: width,
      });
      pairMarks.push({
        type: 'arrow',
        arrows: [{
          from: loop[loop.length - 2],
          to: { x: sourcePage.x + 1, y: sourcePage.y + 1 },
          authority: {
            tag: 'data_carrier',
            classId: 'connections',
            provenance: {
              sourceId: first.sourceId,
              targetId: first.targetId,
              sourceOrdinals: entries.map((entry) => entry.sourceOrdinal),
              edgeIds: entries.map((entry) => entry.id),
            },
          },
        }],
        fill: color,
        size: 6,
      });
    } else {
      const routed = routeSpatialChord(sourceScientific, targetScientific, spec.domain);
      pairMarks.push({
        type: 'line',
        subpaths: routed.segments.map((segment) => segment.map((point) => ({
          ...mapper.map(point.x, point.y),
          authority: { tag: 'connector' as const },
        }))),
        stroke: color,
        strokeWidth: width,
        ...(value !== null && value < 0 ? { dash: '4 3' } : {}),
      });
      const directions = new Map<string, typeof entries>();
      for (const entry of entries) {
        const key = `${entry.sourceId}\u0000${entry.targetId}`;
        const direction = directions.get(key);
        if (direction) direction.push(entry);
        else directions.set(key, [entry]);
      }
      const arrows = [...directions.values()].flatMap((direction) => {
        const entry = direction[0];
        const directionSegments = entry.sourceId === physicalSourceId
          ? routed.segments
          : reverseSpatialSegments(routed.segments);
        const final = directionSegments[directionSegments.length - 1];
        const from = mapper.map(final[0].x, final[0].y);
        const to = pageById.get(entry.targetId)!;
        const arrow = insetArrow(from, to, spec.markerRadius);
        return arrow ? [{
          ...arrow,
          authority: {
            tag: 'data_carrier' as const,
            classId: 'connections',
            provenance: {
              sourceId: entry.sourceId,
              targetId: entry.targetId,
              sourceOrdinals: direction.map((candidate) => candidate.sourceOrdinal),
              edgeIds: direction.map((candidate) => candidate.id),
            },
          },
        }] : [];
      });
      if (arrows.length > 0) pairMarks.push({ type: 'arrow', arrows, fill: color, size: 6 });
      const directionGroups = [...directions.values()];
      for (let directionIndex = 0; directionIndex < directionGroups.length; directionIndex++) {
        const direction = directionGroups[directionIndex];
        if (direction.length <= 1 && directionGroups.length <= 1) continue;
        const entry = direction[0];
        pairMarks.push({
          type: 'text',
          x: (sourcePage.x + targetPage.x) / 2,
          y: (sourcePage.y + targetPage.y) / 2 - 7 + directionIndex * 14,
          text: `${entry.sourceId} -> ${entry.targetId}: x ${direction.length}`,
          anchor: 'middle',
          fontSize: 9,
          fill: color,
          decorative: false,
        });
      }
    }
    if (entries.length > 1 && physicalSourceId === physicalTargetId) {
      pairMarks.push({
        type: 'text',
        x: (sourcePage.x + targetPage.x) / 2,
        y: (sourcePage.y + targetPage.y) / 2 - 5,
        text: `x ${entries.length}`,
        anchor: 'middle',
        fontSize: 9,
        fill: color,
        decorative: true,
      });
    }
    marks.push({ type: 'group', id: `connection-pair-${first.id}`, marks: pairMarks });
  }
  for (let nodeIndex = 0; nodeIndex < spec.nodes.length; nodeIndex++) {
    const node = spec.nodes[nodeIndex];
    const point = pageById.get(node.id)!;
    const style = categoricalStyle(node.groupIndex ?? 0);
    const transformedNodeValue = typeof node.value === 'number' ? nodeTransform(node.value) : null;
    const nodeT = transformedNodeValue !== null && nodeExtent && nodeExtent.max !== nodeExtent.min
      ? (transformedNodeValue - nodeExtent.min) / (nodeExtent.max - nodeExtent.min)
      : 0.5;
    const fill = spec.nodeEncoding === 'group'
      ? style.color
      : spec.nodeEncoding === 'value' && typeof node.value === 'number'
        ? spec.nodeValueScale?.kind === 'diverging'
          ? divergingColor(
            transformedNodeValue!,
            nodeExtent?.min ?? transformedNodeValue!,
            nodeExtent?.max ?? transformedNodeValue!,
            spec.nodeValueScale.transform === 'symlog' ? 0 : spec.nodeValueScale.center ?? 0,
          )
          : sequentialColor(nodeT)
        : spec.nodeEncoding === 'value'
          ? missingColor(context.themeId)
          : accent(context.themeId);
    marks.push({
      type: 'group',
      id: `node-${node.id}`,
      marks: [{
        type: 'point',
        points: [{
          ...point,
          authority: {
            tag: 'data_carrier',
            classId: 'nodes',
            provenance: { nodeId: node.id, sourceOrdinal: nodeIndex },
          },
        }],
        fill,
        radius: spec.markerRadius,
        shape: spec.nodeEncoding === 'group' ? style.marker : 'circle',
      }],
    });
  }
  return {
    ...frame(context, skillId),
    panels: [{
      id: 'main',
      ...box,
      axes: [xAxis(spec.xLabel, mapper.xScale), yAxis(spec.yLabel, mapper.yScale)],
      marks,
    }],
    table: emptyTable(),
    legend: [
      ...(spec.nodeEncoding === 'group'
        ? [...new Map(spec.nodes.map((node) => [node.groupIndex ?? -1, node])).values()].map((node) => {
          const style = categoricalStyle(node.groupIndex ?? 0);
          return {
            label: node.group ?? 'ungrouped',
            color: style.color,
            glyph: 'series' as const,
            marker: style.marker,
          };
        })
        : []),
      ...(spec.nodeEncoding === 'value'
        ? [{
          label: `Node colour encodes the declared value over ${nodeValueExtent ? `${formatNumber(nodeValueExtent.min)} to ${formatNumber(nodeValueExtent.max)}` : 'no finite range'}${spec.nodeValueScale?.transform === 'symlog' ? ` using symlog with linear threshold ${formatNumber(spec.nodeValueScale.linearThreshold!)}` : ' linearly'}; missing values use the reserved colour`,
          color: accent(context.themeId),
          glyph: 'series' as const,
        }]
        : []),
      ...(spec.connectionEncoding
        ? [{
          label: `Connection ${spec.connectionEncoding.channel} encodes the declared pair aggregate${spec.connectionEncoding.channel === 'width' || spec.connectionEncoding.channel === 'width_and_color' ? '; the observed |value| range maps to 1 to 5 px' : ''}${pairExtent ? ` (signed range ${formatNumber(pairExtent.min)} to ${formatNumber(pairExtent.max)})` : ''}${spec.multapseAggregation ? `; multapses use ${spec.multapseAggregation}` : ''}`,
          color: accent(context.themeId),
          glyph: 'series' as const,
        }]
        : []),
    ],
  };
}

export interface CompartmentHeatmapRow {
  readonly id: string;
  readonly label: string;
  readonly times: readonly number[];
  readonly values: readonly (number | null)[];
  readonly outputAuthority?: {
    readonly classId: string;
    readonly provenance: readonly JsonValue[];
  };
}

/** One fixed-screen rectangle per accepted sample; missing values remain explicit marks. */
export function compileCompartmentHeatmapFigure(
  context: CompileContext,
  rows: readonly CompartmentHeatmapRow[],
  window: readonly [number, number],
  xLabel: string,
  colorLabel: string,
  colorSpec: { readonly family: 'sequential' | 'diverging'; readonly center?: number },
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  const finite = rows.flatMap((row) => row.values.filter((value): value is number => value !== null));
  const extent = finiteExtent(finite);
  const xScale = linearScale(window[0], window[1], box.x, box.x + box.width);
  const rowHeight = box.height / Math.max(1, rows.length);
  const marks: Mark[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const rects = row.times.map((time, index) => {
      const value = row.values[index];
      const t = value !== null && extent && extent.max !== extent.min
        ? (value - extent.min) / (extent.max - extent.min)
        : 0.5;
      const fill = value === null
        ? missingColor(context.themeId)
        : colorSpec.family === 'diverging'
          ? divergingColor(value, extent?.min ?? value, extent?.max ?? value, colorSpec.center ?? 0)
          : sequentialColor(t);
      return {
        x: xScale.map(time) - 1.5,
        y: box.y + rowIndex * rowHeight + 1,
        width: 3,
        height: Math.max(1, rowHeight - 2),
        fill,
        ...(row.outputAuthority?.provenance[index] !== undefined
          ? {
            authority: {
              tag: 'data_carrier' as const,
              classId: row.outputAuthority.classId,
              provenance: row.outputAuthority.provenance[index],
            },
          }
          : {}),
      };
    });
    marks.push({ type: 'group', id: `compartment-${row.id}`, marks: [{ type: 'rect', rects }] });
  }
  return {
    ...frame(context, skillId),
    panels: [{
      id: 'main',
      ...box,
      axes: [
        xAxis(xLabel, xScale),
        {
          orientation: 'left',
          label: 'compartment',
          transform: 'band',
          ticks: rows.map((row, index) => ({
            position: box.y + (index + 0.5) * rowHeight,
            label: row.label,
          })),
        },
      ],
      marks,
    }],
    table: emptyTable(),
    legend: [{
      label: `${colorLabel}; global ${colorSpec.family} colour domain${extent ? ` ${formatNumber(extent.min)} to ${formatNumber(extent.max)}` : ' unavailable'}`,
      color: accent(context.themeId),
      glyph: 'series',
    }],
  };
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
      policy: 'complete_returned',
      columns: [{ key: 'node', header: 'Node' }, { key: 'x', header: xLabel }, { key: 'y', header: yLabel }],
      rows: xs.map((x, i) => [ids[i], x, ys[i]] as (string | number | null)[]),
      rowsInline: xs.length,
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
      policy: 'complete_returned',
      columns: [{ key: 'lag', header: xLabel }, { key: 'count', header: yLabel }],
      rows: counts.map((c, i) => [binCenters[i], c] as (string | number | null)[]),
      rowsInline: counts.length,
      rowsTotal: counts.length,
    },
    legend: [],
  };
}

export interface ResponseCurveFigureOptions {
  readonly xLabel: string;
  readonly yLabel: string;
  readonly curveLabel: string;
  readonly tableRows: readonly (readonly (string | number | null)[])[];
  readonly summaryStatements?: readonly string[];
}

function responseConditionTicks(
  curve: ResponseCurveResult,
  xValues: readonly number[],
  xScale: NumericScale,
): Axis['ticks'] {
  const count = curve.conditions.length;
  if (count === 0) return [];
  const maximumLabels = 12;
  const step = count <= maximumLabels
    ? 1
    : Math.ceil((count - 1) / (maximumLabels - 1));
  const ordinals: number[] = [];
  for (let index = 0; index < count; index += step) ordinals.push(index);
  if (ordinals[ordinals.length - 1] !== count - 1) ordinals.push(count - 1);
  const labelCounts = new Map<string, number>();
  for (const condition of curve.conditions) {
    labelCounts.set(
      condition.conditionLabel,
      (labelCounts.get(condition.conditionLabel) ?? 0) + 1,
    );
  }
  const usedLabels = new Set<string>();
  const displayLabels = curve.conditions.map((condition, index) => {
    const base = condition.conditionLabel;
    let candidate = labelCounts.get(base)! > 1
      ? `${base} [${condition.conditionId}]`
      : base;
    let collision = 1;
    while (usedLabels.has(candidate)) {
      candidate = `${base} [condition ${condition.conditionId}; ordinal ${index + 1}; collision ${collision}]`;
      collision++;
    }
    usedLabels.add(candidate);
    return candidate;
  });
  return ordinals.map((index) => ({
    position: xScale.map(xValues[index]),
    label: displayLabels[index],
  }));
}

const RESPONSE_CURVE_TABLE_COLUMNS = [
  { key: 'conditionId', header: 'Condition' },
  { key: 'conditionLabel', header: 'Condition label' },
  { key: 'input', header: 'Input' },
  { key: 'inputUnit', header: 'Input unit' },
  { key: 'repeatId', header: 'Repeat' },
  { key: 'response', header: 'Response' },
  { key: 'responseUnit', header: 'Response unit' },
  { key: 'responseMethod', header: 'Method' },
  { key: 'rateNormalization', header: 'Rate normalization' },
  { key: 'recordedSenderCount', header: 'Recorded senders' },
  { key: 'missing', header: 'Undefined' },
  { key: 'estimator', header: 'Estimator' },
  { key: 'sampleCount', header: 'n retained' },
  { key: 'excludedCount', header: 'n excluded' },
  { key: 'responseBasis', header: 'Basis' },
  { key: 'uncertaintyKind', header: 'Uncertainty' },
  { key: 'uncertaintyValue', header: 'Uncertainty value' },
  { key: 'uncertaintyLower', header: 'Uncertainty lower' },
  { key: 'uncertaintyUpper', header: 'Uncertainty upper' },
  { key: 'uncertaintyBasis', header: 'Uncertainty basis' },
  { key: 'estimatorRole', header: 'Estimator role' },
  { key: 'trimmedCount', header: 'n trimmed' },
  { key: 'peakBinCount', header: 'Peak-bin count audit' },
  { key: 'peakCountDerivationAlgorithm', header: 'Peak-count derivation' },
  { key: 'eventScopeKind', header: 'Declared event scope' },
  { key: 'eventSelectionId', header: 'Declared event selection' },
  { key: 'eventMembershipBinding', header: 'Membership binding' },
  { key: 'selectedEventTrainCount', header: 'Selected event trains' },
] as const;

/**
 * Response-curve geometry over an already-derived, canonical condition sequence.
 *
 * Null estimates retain their domain position and split the guide into separate
 * subpaths. A nominal domain never receives a guide. The compiler does no aggregation,
 * sorting, exclusion, or input interpretation; those scientific decisions are sealed in
 * `deriveResponseCurve` and its derivation receipt before this function runs.
 */
export function compileResponseCurveFigure(
  context: CompileContext,
  curve: ResponseCurveResult,
  options: ResponseCurveFigureOptions,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  const rowsTotal = options.tableRows.length;
  const table = {
    policy: 'complete_returned' as const,
    columns: RESPONSE_CURVE_TABLE_COLUMNS,
    rows: options.tableRows,
    rowsInline: rowsTotal,
    rowsTotal,
  };
  const estimates = curve.conditions
    .map((condition) => condition.estimate)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const panelSummaries = [...(options.summaryStatements ?? [])];
  const xValues = curve.conditions.map((condition) =>
    curve.axis === 'numeric' ? condition.input! : condition.displayOrdinal,
  );
  const xExtent = finiteExtent(xValues)!;
  const xScale: NumericScale = curve.axis === 'numeric' && curve.inputScale === 'log10'
    ? logNumericScale(xExtent.min, xExtent.max, box.x, box.x + box.width)
    : linearNumericScale(xExtent.min, xExtent.max, box.x, box.x + box.width);

  const xAxisModel: Axis = curve.axis === 'numeric'
    ? transformedXAxis(options.xLabel, xScale)
    : {
      orientation: 'bottom',
      label: options.xLabel,
      transform: 'band',
      ticks: responseConditionTicks(curve, xValues, xScale),
    };
  const missingConditionLines = curve.conditions
    .map((condition, index) => condition.estimate === null
      ? {
        position: xScale.map(xValues[index]),
        from: box.y,
        to: box.y + box.height,
        authority: {
          tag: 'data_carrier' as const,
          classId: 'conditions',
          provenance: {
            conditionId: condition.conditionId,
            displayOrdinal: condition.displayOrdinal,
            role: 'undefined_condition',
          },
        },
      }
      : null)
    .filter((line): line is NonNullable<typeof line> => line !== null);
  const missingConditionMark: Mark | undefined = missingConditionLines.length > 0
    ? {
      type: 'rule',
      orientation: 'vertical',
      lines: missingConditionLines,
      stroke: missingColor(context.themeId),
      strokeWidth: 1,
      dash: '2 3',
    }
    : undefined;
  const missingLegend = missingConditionLines.length > 0
    ? [{
      label: 'Declared condition with undefined response (x position only)',
      color: missingColor(context.themeId),
      glyph: 'series' as const,
      dash: '2 3',
    }]
    : [];

  if (estimates.length === 0) {
    return {
      ...frame(context, skillId),
      panels: [{
        id: 'main',
        ...box,
        axes: [xAxisModel],
        marks: missingConditionMark ? [missingConditionMark] : [],
        noData: { reason: 'no declared condition has a usable response estimate' },
      }],
      table,
      legend: missingLegend,
      accessibility: {
        summary: context.summary,
        panelSummaries,
        suppressGlobalValueRange: true,
      },
    };
  }

  const yExtent = finiteExtent(estimates)!;
  // Every revision-2 response domain is non-negative. Keep the scientifically meaningful
  // zero baseline visible so a narrow high-valued range cannot fill the panel and
  // exaggerate a small change.
  // The generic constant-domain scale places an all-zero curve at the midpoint. Preserve
  // a constant scientific domain and one zero tick, but bind that constant to the lower baseline
  // instead of inventing an unobserved positive upper extent.
  const yMinimum = Math.min(0, yExtent.min);
  const yScale: NumericScale = yExtent.max === 0 && yMinimum === 0
    ? {
      domainMin: 0,
      domainMax: 0,
      rangeMin: box.y + box.height,
      rangeMax: box.y,
      transform: 'linear',
      map(value: number): number {
        if (!Number.isFinite(value)) return Number.NaN;
        if (value === 0) return box.y + box.height;
        return value < 0 ? box.y + box.height : box.y;
      },
      ticks(): readonly { readonly value: number; readonly label: string }[] {
        return [{ value: 0, label: '0' }];
      },
    }
    : linearNumericScale(yMinimum, yExtent.max, box.y + box.height, box.y);

  const points: {
    x: number;
    y: number;
    authority: OutputAuthorityAtomicRoleV1;
  }[] = [];
  const guideSubpaths: {
    x: number;
    y: number;
    authority: OutputAuthorityAtomicRoleV1;
  }[][] = [];
  let currentGuide: {
    x: number;
    y: number;
    authority: OutputAuthorityAtomicRoleV1;
  }[] = [];
  for (let index = 0; index < curve.conditions.length; index++) {
    const condition = curve.conditions[index];
    if (condition.estimate === null) {
      if (currentGuide.length >= 2) guideSubpaths.push(currentGuide);
      currentGuide = [];
      continue;
    }
    const point = {
      x: xScale.map(xValues[index]),
      y: yScale.map(condition.estimate),
      authority: {
        tag: 'data_carrier' as const,
        classId: 'conditions',
        provenance: {
          conditionId: condition.conditionId,
          displayOrdinal: condition.displayOrdinal,
          role: 'condition_estimate',
        },
      },
    };
    points.push(point);
    currentGuide.push({
      x: point.x,
      y: point.y,
      authority: {
        tag: 'data_carrier',
        classId: 'series_paths',
        provenance: {
          conditionId: condition.conditionId,
          displayOrdinal: condition.displayOrdinal,
          role: 'ordered_guide_vertex',
        },
      },
    });
  }
  if (currentGuide.length >= 2) guideSubpaths.push(currentGuide);

  const marks: Mark[] = missingConditionMark ? [missingConditionMark] : [];
  if (curve.axis !== 'nominal' && guideSubpaths.length > 0) {
    marks.push({
      type: 'line',
      subpaths: guideSubpaths,
      stroke: missingColor(context.themeId),
      strokeWidth: 1,
      dash: '4 3',
    });
  }
  marks.push({ type: 'point', points, fill: accent(context.themeId), radius: 3.5, shape: 'circle' });

  return {
    ...frame(context, skillId),
    panels: [{
      id: 'main',
      ...box,
      axes: [xAxisModel, transformedYAxis(options.yLabel, yScale)],
      marks,
    }],
    table,
    legend: [
      {
        label: options.curveLabel,
        color: accent(context.themeId),
        glyph: 'series',
        marker: 'circle',
      },
      ...(curve.axis !== 'nominal' && guideSubpaths.length > 0
        ? [{
          label: 'Ordered-condition guide (not a fit or interpolation)',
          color: missingColor(context.themeId),
          glyph: 'series' as const,
          dash: '4 3',
        }]
        : []),
      ...missingLegend,
    ],
    accessibility: {
      summary: context.summary,
      panelSummaries,
      suppressGlobalValueRange: true,
    },
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
      policy: 'complete_returned',
      columns: [{ key: 'x', header: xLabel }, { key: 'y', header: yLabel }],
      rows: xs.map((x, i) => [x, ys[i]] as (string | number | null)[]),
      rowsInline: xs.length,
      rowsTotal: xs.length,
    },
    legend: [],
  };
}

/**
 * A caller-supplied phase-plane vector field.  Each independent sample receives one
 * shaft whose endpoint is marked, so direction remains legible in a still SVG without
 * relying on animation or colour.  Length is a bounded display normalization, never a
 * numerical integration or an interpolation between samples.
 */
export function compileVectorFieldFigure(
  context: CompileContext,
  xs: readonly number[],
  ys: readonly number[],
  dxs: readonly number[],
  dys: readonly number[],
  xLabel: string,
  yLabel: string,
  scaling: 'unit_length' | 'magnitude_proportional' | 'sqrt_magnitude',
  fixedPoints: readonly { readonly x: number; readonly y: number }[],
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (xs.length === 0) {
    return {
      ...frame(context, skillId),
      panels: [emptyPanel(box, 'no vector-field samples to plot')],
      table: emptyTable(),
      legend: [],
    };
  }
  const xExtent = finiteExtent([...xs, ...fixedPoints.map((point) => point.x)])!;
  const yExtent = finiteExtent([...ys, ...fixedPoints.map((point) => point.y)])!;
  const xScale = linearScale(xExtent.min, xExtent.max, box.x, box.x + box.width);
  const yScale = linearScale(yExtent.min, yExtent.max, box.y + box.height, box.y);
  const directions = xs.map((_x, index) => {
    const ux = xExtent.max === xExtent.min
      ? dxs[index]
      : exactBinary64RatioToDifference(dxs[index], xExtent.min, xExtent.max);
    const uy = yExtent.max === yExtent.min
      ? dys[index]
      : exactBinary64RatioToDifference(dys[index], yExtent.min, yExtent.max);
    const magnitude = Math.hypot(ux, uy);
    return { ux, uy, magnitude };
  });
  const transformedMaximum = Math.max(
    ...directions.map(({ magnitude }) => scaling === 'sqrt_magnitude' ? Math.sqrt(magnitude) : magnitude),
    Number.MIN_VALUE,
  );
  const maximumLength = Math.max(6, Math.min(box.width, box.height) * 0.05);
  const shafts: { x: number; y: number }[][] = [];
  const endpoints: { x: number; y: number }[] = [];
  for (let index = 0; index < xs.length; index++) {
    const origin = { x: xScale.map(xs[index]), y: yScale.map(ys[index]) };
    const { ux, uy, magnitude } = directions[index];
    if (!(magnitude > 0)) {
      endpoints.push(origin);
      continue;
    }
    const transformed = scaling === 'sqrt_magnitude' ? Math.sqrt(magnitude) : magnitude;
    const length = scaling === 'unit_length'
      ? maximumLength
      : maximumLength * transformed / transformedMaximum;
    const endpoint = {
      x: origin.x + length * ux / magnitude,
      y: origin.y - length * uy / magnitude,
    };
    shafts.push([origin, endpoint]);
    endpoints.push(endpoint);
  }
  const marks: Mark[] = [
    { type: 'line', subpaths: shafts, stroke: accent(context.themeId), strokeWidth: 1.25 },
    { type: 'point', points: endpoints, fill: accent(context.themeId), radius: 2.6, shape: 'triangle' },
  ];
  if (fixedPoints.length > 0) {
    marks.push({
      type: 'point',
      points: fixedPoints.map((point) => ({ x: xScale.map(point.x), y: yScale.map(point.y) })),
      fill: uncertaintyStroke(context.themeId),
      radius: 4,
      shape: 'diamond',
    });
  }
  return {
    ...frame(context, skillId),
    panels: [{
      id: 'main',
      ...box,
      axes: [xAxis(xLabel, xScale), yAxis(yLabel, yScale)],
      marks,
    }],
    table: emptyTable(),
    legend: [
      { label: `Caller-supplied field direction; ${scaling}`, color: accent(context.themeId), glyph: 'series' },
      ...(fixedPoints.length > 0
        ? [{ label: 'Declared fixed-point candidate', color: uncertaintyStroke(context.themeId), glyph: 'series' as const, marker: 'diamond' }]
        : []),
    ],
  };
}

export interface PhasePlaneFigureSpec {
  readonly xLabel: string;
  readonly yLabel: string;
  readonly trajectories?: {
    readonly ids: readonly string[];
    readonly labels: readonly string[];
    readonly pointIds: readonly string[];
    readonly xs: readonly (number | null)[];
    readonly ys: readonly (number | null)[];
    readonly timeDirection: 'forward' | 'backward';
    readonly directionMode: 'none' | 'arrowhead_at_end' | 'arrowheads_every_n_points';
    readonly everyNPoints?: number;
  };
  readonly vectorField?: {
    readonly xs: readonly number[];
    readonly ys: readonly number[];
    /** Axis-normalized direction components, derived once from exact finite extents. */
    readonly normalizedDxs: readonly number[];
    readonly normalizedDys: readonly number[];
    /** Magnitudes on the declared basis, aligned one-for-one with field samples. */
    readonly magnitudes: readonly number[];
    readonly magnitudeBasis: 'axis_normalized' | 'physical';
    readonly magnitudeUnit: string;
    readonly scaling: 'unit_length' | 'magnitude_proportional' | 'sqrt_magnitude';
    readonly maxArrowLengthFraction: number;
    readonly domain?: { readonly xMin: number; readonly xMax: number; readonly yMin: number; readonly yMax: number };
  };
  readonly nullclines?: {
    readonly ids: readonly string[];
    readonly labels: readonly string[];
    readonly pointIds: readonly string[];
    readonly xs: readonly (number | null)[];
    readonly ys: readonly (number | null)[];
  };
  readonly fixedPoints?: {
    readonly ids: readonly string[];
    readonly labels: readonly string[];
    readonly xs: readonly number[];
    readonly ys: readonly number[];
    readonly converged: readonly boolean[];
  };
}

function splitStatePath(
  xs: readonly (number | null)[],
  ys: readonly (number | null)[],
): { readonly runs: readonly (readonly { readonly x: number; readonly y: number }[])[]; readonly sourceRuns: readonly (readonly number[])[] } {
  const runs: { x: number; y: number }[][] = [];
  const sourceRuns: number[][] = [];
  let current: { x: number; y: number }[] = [];
  let currentOrdinals: number[] = [];
  for (let index = 0; index < Math.min(xs.length, ys.length); index++) {
    const x = xs[index];
    const y = ys[index];
    if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) {
      if (current.length > 0) {
        runs.push(current);
        sourceRuns.push(currentOrdinals);
      }
      current = [];
      currentOrdinals = [];
      continue;
    }
    current.push({ x, y });
    currentOrdinals.push(index);
  }
  if (current.length > 0) {
    runs.push(current);
    sourceRuns.push(currentOrdinals);
  }
  return { runs, sourceRuns };
}

/** Every simultaneously supplied phase-plane carrier shares one domain and one panel. */
export function compilePhasePlaneFigure(
  context: CompileContext,
  spec: PhasePlaneFigureSpec,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  const xs = [
    ...(spec.trajectories?.xs ?? []),
    ...(spec.vectorField?.xs ?? []),
    ...(spec.nullclines?.xs ?? []),
    ...(spec.fixedPoints?.xs ?? []),
    ...(spec.vectorField?.domain ? [spec.vectorField.domain.xMin, spec.vectorField.domain.xMax] : []),
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const ys = [
    ...(spec.trajectories?.ys ?? []),
    ...(spec.vectorField?.ys ?? []),
    ...(spec.nullclines?.ys ?? []),
    ...(spec.fixedPoints?.ys ?? []),
    ...(spec.vectorField?.domain ? [spec.vectorField.domain.yMin, spec.vectorField.domain.yMax] : []),
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (xs.length === 0 || ys.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'no finite phase-plane carrier')], table: emptyTable(), legend: [] };
  }
  const xExtent = finiteExtent(xs)!;
  const yExtent = finiteExtent(ys)!;
  const xScale = linearScale(xExtent.min, xExtent.max, box.x, box.x + box.width);
  const yScale = linearScale(yExtent.min, yExtent.max, box.y + box.height, box.y);
  const marks: Mark[] = [];
  const legend: NonNullable<RenderPlanV1['legend']> = [];

  const field = spec.vectorField;
  if (field) {
    const normalized = field.xs.map((_x, index) => {
      const ux = field.normalizedDxs[index];
      const uy = field.normalizedDys[index];
      return { ux, uy, magnitude: Math.hypot(ux, uy) };
    });
    let transformedMaximum = Number.MIN_VALUE;
    for (const magnitude of field.magnitudes) {
      const transformed = field.scaling === 'sqrt_magnitude' ? Math.sqrt(magnitude) : magnitude;
      if (transformed > transformedMaximum) transformedMaximum = transformed;
    }
    const maximumLength = Math.min(box.width, box.height) * field.maxArrowLengthFraction;
    for (let index = 0; index < field.xs.length; index++) {
      const origin = { x: xScale.map(field.xs[index]), y: yScale.map(field.ys[index]) };
      const direction = normalized[index];
      if (!(direction.magnitude > 0)) {
        marks.push({
          type: 'group',
          id: `field-sample-${index}`,
          marks: [{
            type: 'point',
            points: [{
              ...origin,
              authority: {
                tag: 'data_carrier',
                classId: 'field_vectors',
                provenance: { sourceOrdinal: index, role: 'field_sample' },
              },
            }],
            fill: missingColor(context.themeId),
            radius: 2.8,
            shape: 'cross',
          }],
        });
        continue;
      }
      const basisMagnitude = field.magnitudes[index];
      const transformed = field.scaling === 'sqrt_magnitude'
        ? Math.sqrt(basisMagnitude)
        : basisMagnitude;
      const length = field.scaling === 'unit_length'
        ? maximumLength
        : maximumLength * transformed / transformedMaximum;
      const endpoint = {
        x: origin.x + length * direction.ux / direction.magnitude,
        y: origin.y - length * direction.uy / direction.magnitude,
      };
      const color = gridColor(context.themeId);
      marks.push({
        type: 'group',
        id: `field-sample-${index}`,
        marks: [
          {
            type: 'line',
            subpaths: [[
              { ...origin, authority: { tag: 'connector' } },
              { ...endpoint, authority: { tag: 'connector' } },
            ]],
            stroke: color,
            strokeWidth: 1,
          },
          {
            type: 'arrow',
            arrows: [{
              from: origin,
              to: endpoint,
              authority: {
                tag: 'data_carrier',
                classId: 'field_vectors',
                provenance: { sourceOrdinal: index, role: 'field_sample' },
              },
            }],
            fill: color,
            size: 5,
          },
        ],
      });
    }
    legend.push({
      label: `Caller-supplied vector field; ${field.scaling}${field.scaling === 'sqrt_magnitude' ? ' (compressed magnitude)' : ''}; ${field.magnitudeBasis} magnitude reference ${formatNumber(field.magnitudes.reduce((maximum, magnitude) => magnitude > maximum ? magnitude : maximum, 0))} ${field.magnitudeUnit} maps to at most ${formatNumber(field.maxArrowLengthFraction * 100)}% of the shorter plot axis`,
      color: gridColor(context.themeId),
      glyph: 'series',
    });
  }

  const nullclines = spec.nullclines;
  if (nullclines) {
    for (let curveIndex = 0; curveIndex < nullclines.ids.length; curveIndex++) {
      const id = nullclines.ids[curveIndex];
      const selectedXs: (number | null)[] = [];
      const selectedYs: (number | null)[] = [];
      const selectedOrdinals: number[] = [];
      for (let index = 0; index < nullclines.pointIds.length; index++) {
        if (nullclines.pointIds[index] !== id) continue;
        selectedXs.push(nullclines.xs[index]);
        selectedYs.push(nullclines.ys[index]);
        selectedOrdinals.push(index);
      }
      const split = splitStatePath(selectedXs, selectedYs);
      const style = categoricalStyle(curveIndex + 3);
      const curveMarks: Mark[] = [];
      const drawable = split.runs
        .map((run, runIndex) => run.map((point, pointIndex) => ({
          x: xScale.map(point.x),
          y: yScale.map(point.y),
          authority: {
            tag: 'data_carrier' as const,
            classId: 'nullclines',
            provenance: {
              curveId: id,
              sourceOrdinal: selectedOrdinals[split.sourceRuns[runIndex][pointIndex]],
            },
          },
        })))
        .filter((run) => run.length >= 2);
      if (drawable.length > 0) {
        curveMarks.push({ type: 'line', subpaths: drawable, stroke: style.color, strokeWidth: 1.5, dash: '5 3' });
      }
      const isolated = split.runs
        .map((run, runIndex) => ({ run, runIndex }))
        .filter(({ run }) => run.length === 1)
        .map(({ run, runIndex }) => ({
          x: xScale.map(run[0].x),
          y: yScale.map(run[0].y),
          authority: {
            tag: 'data_carrier' as const,
            classId: 'nullclines',
            provenance: {
              curveId: id,
              sourceOrdinal: selectedOrdinals[split.sourceRuns[runIndex][0]],
            },
          },
        }));
      if (isolated.length > 0) {
        curveMarks.push({ type: 'point', points: isolated, fill: style.color, radius: 2.8, shape: style.marker });
      }
      if (curveMarks.length > 0) marks.push({ type: 'group', id: `nullcline-${id}`, marks: curveMarks });
      legend.push({
        label: nullclines.labels[curveIndex] ?? id,
        color: style.color,
        glyph: 'series',
        dash: '5 3',
      });
    }
  }

  const trajectories = spec.trajectories;
  if (trajectories) {
    for (let trajectoryIndex = 0; trajectoryIndex < trajectories.ids.length; trajectoryIndex++) {
      const id = trajectories.ids[trajectoryIndex];
      const selectedXs: (number | null)[] = [];
      const selectedYs: (number | null)[] = [];
      const selectedOrdinals: number[] = [];
      for (let index = 0; index < trajectories.pointIds.length; index++) {
        if (trajectories.pointIds[index] !== id) continue;
        selectedXs.push(trajectories.xs[index]);
        selectedYs.push(trajectories.ys[index]);
        selectedOrdinals.push(index);
      }
      const split = splitStatePath(selectedXs, selectedYs);
      const style = categoricalStyle(trajectoryIndex);
      const trajectoryMarks: Mark[] = [];
      const pageRuns = split.runs.map((run, runIndex) => run.map((point, pointIndex) => ({
        x: xScale.map(point.x),
        y: yScale.map(point.y),
        authority: {
          tag: 'data_carrier' as const,
          classId: 'trajectories',
          provenance: {
            trajectoryId: id,
            sourceOrdinal: selectedOrdinals[split.sourceRuns[runIndex][pointIndex]],
          },
        },
      })));
      const drawable = pageRuns.filter((run) => run.length >= 2);
      if (drawable.length > 0) {
        trajectoryMarks.push({ type: 'line', subpaths: drawable, stroke: style.color, strokeWidth: 1.75, dash: style.dash });
      }
      const isolated = pageRuns.filter((run) => run.length === 1).map((run) => run[0]);
      if (isolated.length > 0) {
        trajectoryMarks.push({ type: 'point', points: isolated, fill: style.color, radius: 3, shape: style.marker });
      }
      const arrows: {
        from: { x: number; y: number };
        to: { x: number; y: number };
        authority: OutputAuthorityAtomicRoleV1;
      }[] = [];
      for (const run of pageRuns) {
        if (run.length < 2 || trajectories.directionMode === 'none') continue;
        const every = trajectories.everyNPoints ?? 2;
        const indexes = trajectories.directionMode === 'arrowhead_at_end'
          ? [run.length - 1]
          : Array.from(
            // "Every N points" means the Nth, 2Nth, ... point in each
            // continuous run (zero-based targets N-1, 2N-1, ...). Using N as
            // the first target would silently skip every two-point run.
            { length: Math.floor(run.length / every) },
            (_unused, index) => (index + 1) * every - 1,
          );
        for (const index of indexes) {
          const earlier = run[index - 1];
          const later = run[index];
          const arrow = trajectories.timeDirection === 'forward'
            ? { from: earlier, to: later }
            : { from: later, to: earlier };
          if (arrow.from.x !== arrow.to.x || arrow.from.y !== arrow.to.y) {
            arrows.push({
              from: { x: arrow.from.x, y: arrow.from.y },
              to: { x: arrow.to.x, y: arrow.to.y },
              authority: { tag: 'connector' },
            });
          }
        }
      }
      if (arrows.length > 0) trajectoryMarks.push({ type: 'arrow', arrows, fill: style.color, size: 6 });
      if (trajectoryMarks.length > 0) marks.push({ type: 'group', id: `trajectory-${id}`, marks: trajectoryMarks });
      legend.push({
        label: `${trajectories.labels[trajectoryIndex] ?? id}${trajectoryMarks.length === 0 ? ' (declared; no recorded points)' : ''}`,
        color: style.color,
        glyph: 'series',
        dash: style.dash,
        marker: style.marker,
      });
    }
  }

  const fixed = spec.fixedPoints;
  if (fixed) {
    for (let index = 0; index < fixed.ids.length; index++) {
      const style = fixed.converged[index]
        ? { color: uncertaintyStroke(context.themeId), marker: 'diamond' as const }
        : { color: missingColor(context.themeId), marker: 'cross' as const };
      marks.push({
        type: 'group',
        id: `fixed-point-${fixed.ids[index]}`,
        marks: [{
          type: 'point',
          points: [{
            x: xScale.map(fixed.xs[index]),
            y: yScale.map(fixed.ys[index]),
            authority: {
              tag: 'data_carrier',
              classId: 'fixed_points',
              provenance: { fixedPointId: fixed.ids[index], sourceOrdinal: index },
            },
          }],
          fill: style.color,
          radius: 4,
          shape: style.marker,
        }],
      });
      legend.push({
        label: `${fixed.labels[index] ?? fixed.ids[index]} (${fixed.converged[index] ? 'converged' : 'unconverged candidate'})`,
        color: style.color,
        glyph: 'series',
        marker: style.marker,
      });
    }
  }

  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes: [xAxis(spec.xLabel, xScale), yAxis(spec.yLabel, yScale)], marks }],
    table: emptyTable(),
    legend,
  };
}

export interface ConnectionGraphFigureSpec {
  readonly nodes: readonly {
    readonly id: string;
    readonly group?: string;
    readonly groupIndex?: number;
    readonly degree?: number;
    readonly x?: number;
    readonly y?: number;
  }[];
  readonly edges: readonly {
    readonly id: string;
    readonly sourceId: string;
    readonly targetId: string;
    /** Canonical source-row ordinal; retained even when several rows share one stroke. */
    readonly sourceOrdinal: number;
    readonly value?: number | null;
  }[];
  readonly layout: 'measured_positions' | 'schematic_circular' | 'schematic_grouped_circular' | 'schematic_layered';
  readonly parallelDisplay: 'separate_lanes' | 'bundled';
  readonly maxLanes: number;
  readonly multapseAggregation?: TopologyScalarAggregation;
  readonly edgeEncoding?: {
    readonly channel: 'width' | 'color' | 'width_and_color';
    readonly colorKind: 'sequential' | 'diverging';
    readonly center?: number;
    readonly scale: 'linear' | 'symlog';
  };
  readonly nodeColorByGroup: boolean;
  readonly encodeDegreeAsArea: boolean;
  readonly degreeLabel?: string;
  readonly positionUnit?: string;
  readonly xLabel?: string;
  readonly yLabel?: string;
}

/** Deterministic directed multigraph geometry with one auditable group per stroke. */
export function compileGraphFigure(
  context: CompileContext,
  spec: ConnectionGraphFigureSpec,
  skillId: string,
): RenderPlanV1 {
  const box = panelBox(context);
  if (spec.nodes.length === 0) {
    return { ...frame(context, skillId), panels: [emptyPanel(box, 'empty node universe')], table: emptyTable(), legend: [] };
  }
  const position = new Map<string, { x: number; y: number }>();
  let measuredMapper: ReturnType<typeof equalScaleMapper> | undefined;
  if (spec.layout === 'measured_positions') {
    measuredMapper = equalScaleMapper(
      box,
      spec.nodes.map((node) => node.x!),
      spec.nodes.map((node) => node.y!),
    );
    for (const node of spec.nodes) position.set(node.id, measuredMapper.map(node.x!, node.y!));
  } else if (spec.layout === 'schematic_layered') {
    const grouped = new Map<number, typeof spec.nodes[number][]>();
    for (const node of spec.nodes) {
      const index = node.groupIndex ?? Number.MAX_SAFE_INTEGER;
      const entries = grouped.get(index);
      if (entries) entries.push(node);
      else grouped.set(index, [node]);
    }
    const columns = [...grouped.entries()].sort((left, right) => left[0] - right[0]);
    for (let column = 0; column < columns.length; column++) {
      const members = columns[column][1];
      for (let row = 0; row < members.length; row++) {
        position.set(members[row].id, {
          x: box.x + (column + 0.5) * box.width / columns.length,
          y: box.y + (row + 0.5) * box.height / members.length,
        });
      }
    }
  } else if (spec.layout === 'schematic_grouped_circular') {
    const grouped = new Map<number, typeof spec.nodes[number][]>();
    for (const node of spec.nodes) {
      const index = node.groupIndex ?? Number.MAX_SAFE_INTEGER;
      const entries = grouped.get(index);
      if (entries) entries.push(node);
      else grouped.set(index, [node]);
    }
    const sectors = [...grouped.entries()].sort((left, right) => left[0] - right[0]);
    const gap = 4 * Math.PI / 180;
    const available = Math.max(0, 2 * Math.PI - gap * sectors.length);
    let cursor = -Math.PI / 2;
    const radius = Math.max(12, Math.min(box.width, box.height) / 2 - 24);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    for (const [, members] of sectors) {
      const sector = available * members.length / spec.nodes.length;
      for (let index = 0; index < members.length; index++) {
        const angle = cursor + sector * (index + 0.5) / members.length;
        position.set(members[index].id, {
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        });
      }
      cursor += sector + gap;
    }
  } else {
    const radius = Math.max(12, Math.min(box.width, box.height) / 2 - 24);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    spec.nodes.forEach((node, index) => {
      const angle = 2 * Math.PI * index / spec.nodes.length - Math.PI / 2;
      position.set(node.id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    });
  }

  let maximumDegree = 1;
  for (const node of spec.nodes) {
    const degree = node.degree ?? 0;
    if (degree > maximumDegree) maximumDegree = degree;
  }
  const radiusById = new Map(spec.nodes.map((node) => [
    node.id,
    spec.encodeDegreeAsArea
      // The visible baseline keeps a zero-degree isolate selectable. The area
      // ABOVE that baseline, not radius, is linear in the declared degree.
      ? Math.sqrt(3 ** 2 + (8 ** 2 - 3 ** 2) * Math.max(0, node.degree ?? 0) / maximumDegree)
      : 5,
  ]));
  const nodeOrdinal = new Map(spec.nodes.map((node, index) => [node.id, index]));
  const unorderedKey = (source: string, target: string): string => {
    const sourceIndex = nodeOrdinal.get(source)!;
    const targetIndex = nodeOrdinal.get(target)!;
    return sourceIndex <= targetIndex ? `${source}\u0000${target}` : `${target}\u0000${source}`;
  };
  const unordered = new Map<string, typeof spec.edges[number][]>();
  for (const edge of spec.edges) {
    const key = unorderedKey(edge.sourceId, edge.targetId);
    const entries = unordered.get(key);
    if (entries) entries.push(edge);
    else unordered.set(key, [edge]);
  }
  const paintGroups: { id: string; entries: typeof spec.edges[number][]; lane: number }[] = [];
  if (spec.parallelDisplay === 'separate_lanes') {
    for (const entries of unordered.values()) {
      for (let index = 0; index < entries.length; index++) {
        paintGroups.push({ id: entries[index].id, entries: [entries[index]], lane: index });
      }
    }
  } else {
    const directed = new Map<string, typeof spec.edges[number][]>();
    for (const edge of spec.edges) {
      const key = `${edge.sourceId}\u0000${edge.targetId}`;
      const entries = directed.get(key);
      if (entries) entries.push(edge);
      else directed.set(key, [edge]);
    }
    const directedSeenByPair = new Map<string, number>();
    for (const entries of directed.values()) {
      const key = unorderedKey(entries[0].sourceId, entries[0].targetId);
      const lane = directedSeenByPair.get(key) ?? 0;
      directedSeenByPair.set(key, lane + 1);
      paintGroups.push({ id: `bundle-${entries[0].id}`, entries, lane });
    }
  }
  const paintValues = paintGroups.map((group) => aggregateTopologyScalar(
    group.entries.flatMap((entry) => typeof entry.value === 'number' ? [entry.value] : []),
    group.entries.length > 1 ? spec.multapseAggregation : 'no_aggregation',
  ));
  const centeredValue = (value: number, center: number): number => {
    const centered = exactBinary64Sum([value, -center]);
    if (!Number.isFinite(centered)) {
      throw new Error('graph edge value minus its declared center is outside finite binary64');
    }
    return centered;
  };
  const transformValue = (value: number): number => {
    if (spec.edgeEncoding?.scale !== 'symlog') return value;
    const center = spec.edgeEncoding.colorKind === 'diverging'
      ? spec.edgeEncoding.center ?? 0
      : 0;
    const transformed = symlogTransform(centeredValue(value, center), 1);
    if (!Number.isFinite(transformed)) {
      throw new Error('graph edge symlog transform is outside finite binary64');
    }
    return transformed;
  };
  const transformedPaintValues = paintValues.map((value) => value === null ? null : transformValue(value));
  const valueExtent = finiteExtent(transformedPaintValues.filter((value): value is number => value !== null));
  const magnitudeValues = paintValues.flatMap((value) => {
    if (value === null) return [];
    const center = spec.edgeEncoding?.colorKind === 'diverging'
      ? spec.edgeEncoding.center ?? 0
      : 0;
    const centered = centeredValue(value, center);
    const transformed = spec.edgeEncoding?.scale === 'symlog'
      ? symlogTransform(centered, 1)
      : centered;
    if (!Number.isFinite(transformed)) {
      throw new Error('graph edge magnitude transform is outside finite binary64');
    }
    return [Math.abs(transformed)];
  });
  const magnitudeExtent = finiteExtent(magnitudeValues);
  const marks: Mark[] = [];
  for (let groupIndex = 0; groupIndex < paintGroups.length; groupIndex++) {
    const group = paintGroups[groupIndex];
    const first = group.entries[0];
    const source = position.get(first.sourceId)!;
    const target = position.get(first.targetId)!;
    const value = paintValues[groupIndex];
    const transformedValue = transformedPaintValues[groupIndex];
    const colorT = transformedValue !== null && valueExtent && valueExtent.max !== valueExtent.min
      ? (transformedValue - valueExtent.min) / (valueExtent.max - valueExtent.min)
      : 0.5;
    const center = spec.edgeEncoding?.colorKind === 'diverging'
      ? spec.edgeEncoding.center ?? 0
      : 0;
    const centered = value === null ? null : centeredValue(value, center);
    const magnitude = centered === null
      ? null
      : spec.edgeEncoding?.scale === 'symlog'
        ? Math.abs(symlogTransform(centered, 1))
        : Math.abs(centered);
    const magnitudeT = magnitude !== null && magnitudeExtent && magnitudeExtent.max !== magnitudeExtent.min
      ? (magnitude - magnitudeExtent.min) / (magnitudeExtent.max - magnitudeExtent.min)
      : 0.5;
    const edgeUsesColor = spec.edgeEncoding?.channel === 'color' ||
      spec.edgeEncoding?.channel === 'width_and_color';
    const color = value === null && spec.edgeEncoding
      ? missingColor(context.themeId)
      : edgeUsesColor && value !== null
        ? spec.edgeEncoding!.colorKind === 'diverging'
          ? divergingColor(
            transformedValue!,
            valueExtent?.min ?? transformedValue!,
            valueExtent?.max ?? transformedValue!,
            spec.edgeEncoding!.scale === 'symlog' ? 0 : spec.edgeEncoding!.center ?? 0,
          )
          : sequentialColor(colorT)
        : spec.edgeEncoding
          ? accent(context.themeId)
          : gridColor(context.themeId);
    const width = spec.edgeEncoding && value !== null &&
      (spec.edgeEncoding.channel === 'width' || spec.edgeEncoding.channel === 'width_and_color')
      ? 1 + 4 * magnitudeT
      : 1.25;
    const edgeMarks: Mark[] = [];
    if (first.sourceId === first.targetId) {
      const loopRadius = radiusById.get(first.sourceId)! + 10 + group.lane * 5;
      const loop = [
        source,
        { x: source.x + loopRadius, y: source.y - loopRadius },
        { x: source.x + 2 * loopRadius, y: source.y },
        { x: source.x + loopRadius, y: source.y + loopRadius },
        source,
      ];
      edgeMarks.push({
        type: 'line',
        subpaths: [loop.map((point) => ({ ...point, authority: { tag: 'connector' as const } }))],
        stroke: color,
        strokeWidth: width,
        ...(value !== null && value < center ? { dash: '4 3' } : {}),
      });
      edgeMarks.push({
        type: 'arrow',
        arrows: [{
          from: loop[3],
          to: { x: source.x + 1, y: source.y + 1 },
          authority: {
            tag: 'data_carrier',
            classId: 'edges',
            provenance: {
              display: spec.parallelDisplay === 'bundled' ? 'bundled' : 'separate_lane',
              sourceId: first.sourceId,
              targetId: first.targetId,
              sourceOrdinals: group.entries.map((entry) => entry.sourceOrdinal),
              edgeIds: group.entries.map((entry) => entry.id),
            },
          },
        }],
        fill: color,
        size: 6,
      });
    } else {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const length = Math.hypot(dx, dy);
      const laneMagnitude = Math.ceil(group.lane / 2) * 7;
      const laneSign = group.lane % 2 === 1 ? -1 : 1;
      const offsetX = length > 0 ? -dy / length * laneMagnitude * laneSign : 0;
      const offsetY = length > 0 ? dx / length * laneMagnitude * laneSign : 0;
      const start = { x: source.x + offsetX, y: source.y + offsetY };
      const end = { x: target.x + offsetX, y: target.y + offsetY };
      const arrow = insetArrow(start, end, radiusById.get(first.targetId)!);
      edgeMarks.push({
        type: 'line',
        subpaths: [[
          { ...start, authority: { tag: 'connector' } },
          { ...(arrow?.to ?? end), authority: { tag: 'connector' } },
        ]],
        stroke: color,
        strokeWidth: width,
        ...(value !== null && value < center ? { dash: '4 3' } : {}),
      });
      if (arrow) {
        edgeMarks.push({
          type: 'arrow',
          arrows: [{
            ...arrow,
            authority: {
              tag: 'data_carrier',
              classId: 'edges',
              provenance: {
                display: spec.parallelDisplay === 'bundled' ? 'bundled' : 'separate_lane',
                sourceId: first.sourceId,
                targetId: first.targetId,
                sourceOrdinals: group.entries.map((entry) => entry.sourceOrdinal),
                edgeIds: group.entries.map((entry) => entry.id),
              },
            },
          }],
          fill: color,
          size: 6,
        });
      }
    }
    if (group.entries.length > 1) {
      edgeMarks.push({
        type: 'text',
        x: (source.x + target.x) / 2,
        y: (source.y + target.y) / 2 - 5 - group.lane * 3,
        text: `x ${group.entries.length}`,
        anchor: 'middle',
        fontSize: 9,
        fill: color,
        decorative: true,
      });
    }
    marks.push({ type: 'group', id: `edge-${group.id}`, marks: edgeMarks });
  }
  for (let nodeIndex = 0; nodeIndex < spec.nodes.length; nodeIndex++) {
    const node = spec.nodes[nodeIndex];
    const style = categoricalStyle(node.groupIndex ?? 0);
    const color = spec.nodeColorByGroup ? style.color : accent(context.themeId);
    const nodeMarks: Mark[] = [{
      type: 'point',
      points: [{
        ...position.get(node.id)!,
        authority: {
          tag: 'data_carrier',
          classId: 'nodes',
          provenance: { nodeId: node.id, sourceOrdinal: nodeIndex },
        },
      }],
      fill: color,
      radius: radiusById.get(node.id)!,
      shape: spec.nodeColorByGroup ? style.marker : 'circle',
    }];
    if (spec.degreeLabel && node.degree !== undefined) {
      const point = position.get(node.id)!;
      nodeMarks.push({
        type: 'text',
        x: point.x,
        y: point.y - radiusById.get(node.id)! - 4,
        text: `${spec.degreeLabel} ${node.degree}`,
        anchor: 'middle',
        fontSize: 9,
        fill: color,
        decorative: true,
      });
    }
    marks.push({ type: 'group', id: `node-${node.id}`, marks: nodeMarks });
  }
  const axes = measuredMapper
    ? [
      xAxis(spec.xLabel ?? `x (${spec.positionUnit ?? ''})`, measuredMapper.xScale),
      yAxis(spec.yLabel ?? `y (${spec.positionUnit ?? ''})`, measuredMapper.yScale),
    ]
    : [];
  const groupLegend = spec.nodeColorByGroup
    ? [...new Map(spec.nodes.map((node) => [node.groupIndex ?? -1, node])).values()].map((node) => {
      const style = categoricalStyle(node.groupIndex ?? 0);
      return {
        label: node.group ?? 'ungrouped',
        color: style.color,
        glyph: 'series' as const,
        marker: style.marker,
      };
    })
    : [];
  return {
    ...frame(context, skillId),
    panels: [{ id: 'main', ...box, axes, marks }],
    table: emptyTable(),
    legend: [
      ...groupLegend,
      ...(spec.edgeEncoding
        ? [{
          label: `Edge ${spec.edgeEncoding.channel} encodes the declared value${spec.edgeEncoding.channel === 'width' || spec.edgeEncoding.channel === 'width_and_color' ? `; the observed magnitude from ${spec.edgeEncoding.colorKind === 'diverging' ? `center ${formatNumber(spec.edgeEncoding.center ?? 0)}` : 'zero'} maps to 1 to 5 px` : ''}${spec.edgeEncoding.scale === 'symlog' ? ` after the contract-owned sign(value - reference) log1p(|value - reference| / 1 declared unit) transform` : ''}${paintValues.some((value) => value !== null && value < (spec.edgeEncoding!.colorKind === 'diverging' ? spec.edgeEncoding!.center ?? 0 : 0)) ? '; values below the reference are dashed' : ''}`,
          color: accent(context.themeId),
          glyph: 'series' as const,
        }]
        : []),
      ...(spec.encodeDegreeAsArea
        ? [{ label: 'Node marker area above the 3 px-radius visibility baseline is proportional to the declared degree; zero-degree nodes retain that baseline marker', color: accent(context.themeId), glyph: 'series' as const }]
        : []),
    ],
  };
}

function emptyTable(): RenderPlanV1['table'] {
  return { policy: 'complete_returned', columns: [], rows: [], rowsInline: 0, rowsTotal: 0 };
}

/** Compose a colour + opacity into an rgba-free hex+alpha. Deterministic and self-contained. */
function withOpacity(hex: string, opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  const alpha = Math.round(clamped * 255).toString(16).padStart(2, '0');
  // 8-digit hex is valid SVG colour and keeps the serializer dependency-free.
  return `${hex}${alpha}`;
}
