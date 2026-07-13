import { useEffect, useId, useState, type ReactNode } from 'react';
import type { ReadonlySemanticPalette } from '../../core/colormaps';
import { safeDiagnosticText } from '../../core/safeRuntime';
import type {
  AdjacencyMatrixParams,
  AstrocyteParams,
  ConnectionGraphParams,
  CorrelogramParams,
  DelayDistributionParams,
  DelayMatrixParams,
  InDegreeDistributionParams,
  IsiDistributionParams,
  OutDegreeDistributionParams,
  PhasePlaneParams,
  PlasticityParams,
  PopulationRateParams,
  PsthParams,
  RateResponseParams,
  SpikeRasterParams,
  SpatialMap2DParams,
  VoltageTraceParams,
  WeightMatrixParams,
  WeightHistogramParams,
} from '../../core/skills/params';
import type { RenderSceneArgs } from '../VizSpecRenderer';
import {
  REFERENCE_CHART_DIMENSIONS,
  boundedStemPointPaths,
  binnedStepPath,
  chartPlotHeight,
  chartPlotWidth,
  chartX,
  chartY,
  formatChartNumber,
  histogramBarPath,
  histogramDomain,
  linePath,
  nestedNumericDomain,
  normalizeChartDimension,
  numericDomain,
  phasePlaneArrowPath,
  phasePlaneSamples,
  pointPath,
  rasterTickPath,
  sortedLinePath,
  tickValues,
  type ChartDomain,
  type ChartFrame,
} from './chartGeometry';
import {
  MATRIX_VALUE_LEVELS_PER_SIGN,
  aggregateDegreeBins,
  aggregateUniformHistogramBins,
  circleTopologyGeometry,
  equalAspectDomains,
  matrixValueBucketPaths,
  variableHistogramPath,
  type MatrixValueBucketPath,
} from './topologyGeometry';

export const REFERENCE_CHART_SKILLS = Object.freeze([
  'nest.voltage_trace',
  'nest.astrocyte_dynamics',
  'nest.spike_raster',
  'nest.population_rate',
  'nest.rate_response',
  'nest.isi_distribution',
  'nest.psth',
  'nest.correlogram',
  'nest.weight_histogram',
  'nest.plasticity_dynamics',
  'nest.phase_plane',
  'nest.connection_graph',
  'nest.adjacency_matrix',
  'nest.weight_matrix',
  'nest.delay_matrix',
  'nest.in_degree_distribution',
  'nest.out_degree_distribution',
  'nest.delay_distribution',
  'nest.spatial_map_2d',
] as const);

export type ReferenceChartSkill = (typeof REFERENCE_CHART_SKILLS)[number];

export interface ReferenceChartSceneProps extends RenderSceneArgs {
  width?: number;
  height?: number;
}

interface ChartColors {
  background: string;
  foreground: string;
  muted: string;
  grid: string;
}

function chartColors(
  palette: ReadonlySemanticPalette,
  themeMode: 'dark' | 'light',
): ChartColors {
  return themeMode === 'dark'
    ? {
        background: palette.panel,
        foreground: palette.ink,
        muted: palette.inkDim,
        grid: palette.grid,
      }
    : {
        background: palette.ink,
        foreground: palette.deepNavy,
        muted: palette.inkFaint,
        grid: palette.inkDim,
      };
}

function seriesColor(palette: ReadonlySemanticPalette, index: number): string {
  switch (index % 8) {
    case 0: return palette.cyan;
    case 1: return palette.orange;
    case 2: return palette.violet;
    case 3: return palette.teal;
    case 4: return palette.pink;
    case 5: return palette.amber;
    case 6: return palette.excitatory;
    default: return palette.inhibitory;
  }
}

function declaredInput(args: RenderSceneArgs, key: string): string | undefined {
  const value = args.provenance.declared_inputs?.[key];
  if (typeof value === 'string') return safeDiagnosticText(value, 120);
  if (typeof value === 'number' || value === true) {
    return safeDiagnosticText(String(value), 120);
  }
  return undefined;
}

const MIN_REFERENCE_PLOT_WIDTH = 180;

function makeFrame(width: number, height: number, requestedRight = 28): ChartFrame {
  const left = 82;
  const right = Math.min(
    requestedRight,
    Math.max(18, width - left - MIN_REFERENCE_PLOT_WIDTH),
  );
  return { width, height, left, right, top: 72, bottom: 68 };
}

function seriesLabelSummary(labels: readonly string[], limit = 8): string {
  const shown = labels.slice(0, limit).join('; ');
  const remaining = labels.length - Math.min(labels.length, limit);
  return remaining > 0 ? `${shown}; plus ${remaining} more series` : shown;
}

function metadataValue(value: unknown, limit = 180): string {
  if (typeof value === 'string') return safeDiagnosticText(value, limit);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return safeDiagnosticText(String(value), limit);
  }
  try {
    return safeDiagnosticText(JSON.stringify(value), limit);
  } catch {
    return '<unavailable>';
  }
}

function sampledIndices(length: number, maximum = 8): number[] {
  if (length <= 0) return [];
  const count = Math.min(length, Math.max(1, Math.floor(maximum)));
  if (count === 1) return [0];
  const indices = new Array<number>(count);
  for (let index = 0; index < count; index++) {
    indices[index] = Math.round(index * (length - 1) / (count - 1));
  }
  return [...new Set(indices)];
}

function matrixBucketPaint(
  bucket: MatrixValueBucketPath,
  palette: ReadonlySemanticPalette,
): { color: string; opacity: number } {
  if (bucket.sign === 0) return { color: palette.inkDim, opacity: 0.58 };
  return {
    color: bucket.sign < 0 ? palette.inhibitory : palette.excitatory,
    opacity: 0.18 + 0.82 * bucket.level / MATRIX_VALUE_LEVELS_PER_SIGN,
  };
}

interface LegendEntry {
  label: string;
  color: string;
}

interface ChartDataRows {
  key: string;
  label: string;
  rowCount: number;
  rowAt: (index: number) => string;
  pageSize?: number;
}

const MAX_CHART_DATA_PAGE_SIZE = 100;
const DEFAULT_CHART_DATA_PAGE_SIZE = 25;

/** A bounded DOM mirror for data-rich SVG figures. It pulls only the active
 * page through rowAt, so a 50,000-cell matrix never materializes 50,000 strings
 * or DOM nodes merely to remain keyboard and screen-reader accessible. */
function PaginatedChartData({
  label,
  rowCount,
  rowAt,
  pageSize = DEFAULT_CHART_DATA_PAGE_SIZE,
  foreground,
  background,
}: Omit<ChartDataRows, 'key'> & { foreground: string; background: string }) {
  const safeRowCount = Number.isSafeInteger(rowCount) ? Math.max(0, rowCount) : 0;
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(MAX_CHART_DATA_PAGE_SIZE, Math.max(1, Math.floor(pageSize)))
    : DEFAULT_CHART_DATA_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(safeRowCount / safePageSize));
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);
  const start = page * safePageSize;
  const stop = Math.min(safeRowCount, start + safePageSize);
  const rows = new Array<{ index: number; text: string }>(stop - start);
  for (let index = start; index < stop; index++) {
    rows[index - start] = { index, text: rowAt(index) };
  }
  return (
    <section
      className="cortexel-reference-chart-data"
      aria-label={label}
      style={{
        boxSizing: 'border-box',
        padding: '9px 12px',
        color: foreground,
        background,
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      <div aria-live="polite" aria-atomic="true">
        {safeRowCount === 0
          ? `${label}: no rows.`
          : `${label}: rows ${start + 1}–${stop} of ${safeRowCount}; page ${page + 1} of ${pageCount}.`}
      </div>
      {rows.length > 0 && (
        <ol start={start + 1}>
          {rows.map((row) => (
            <li key={row.index}>
              <bdi dir="auto" style={{ unicodeBidi: 'isolate' }}>{row.text}</bdi>
            </li>
          ))}
        </ol>
      )}
      {pageCount > 1 && (
        <nav aria-label={`${label} pages`}>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            Previous
          </button>{' '}
          <button
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

interface ChartShellProps {
  id: string;
  skill: string;
  scene: string;
  title: string;
  description: string;
  metadata?: string;
  note?: string;
  accessibleDetails?: readonly string[];
  accessibleDetailsLabel?: string;
  xLabel: string;
  yLabel: string;
  xDomain: ChartDomain;
  yDomain: ChartDomain;
  frame: ChartFrame;
  colors: ChartColors;
  legend?: readonly LegendEntry[];
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  sampleCount: number;
  dataRows?: ChartDataRows;
  children: ReactNode;
}

function ChartShell({
  id,
  skill,
  scene,
  title,
  description,
  metadata,
  note,
  accessibleDetails = [],
  accessibleDetailsLabel = 'Series summary',
  xLabel,
  yLabel,
  xDomain,
  yDomain,
  frame,
  colors,
  legend = [],
  xTicks: requestedXTicks,
  yTicks: requestedYTicks,
  sampleCount,
  dataRows,
  children,
}: ChartShellProps) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const xTicks = requestedXTicks ?? tickValues(xDomain);
  const yTicks = requestedYTicks ?? tickValues(yDomain);
  const plotWidth = chartPlotWidth(frame);
  const plotHeight = chartPlotHeight(frame);
  const legendEntries = legend.slice(0, 8);
  return (
    <figure
      className="cortexel-reference-chart"
      data-skill={skill}
      data-scene={scene}
      data-sample-count={sampleCount}
      data-plot-width={plotWidth}
      style={{ margin: 0, width: frame.width, maxWidth: '100%' }}
    >
      <svg
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        width={frame.width}
        height={frame.height}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', maxWidth: '100%', height: 'auto' }}
      >
        <title id={titleId}>{title}</title>
        <desc id={descriptionId}>{description}</desc>
        <rect width={frame.width} height={frame.height} fill={colors.background} />
        <text
          x={frame.left}
          y={30}
          fill={colors.foreground}
          fontSize={18}
          fontWeight={600}
        >
          {title}
        </text>
        {metadata && (
          <text x={frame.left} y={51} fill={colors.muted} fontSize={11}>
            {metadata}
          </text>
        )}

        <g aria-hidden="true">
          {xTicks.map((tick, index) => {
            const x = chartX(tick, xDomain, frame);
            return (
              <g key={`x-${index}`}>
                <line
                  x1={x}
                  y1={frame.top}
                  x2={x}
                  y2={frame.top + plotHeight}
                  stroke={colors.grid}
                  strokeOpacity={0.55}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={x}
                  y={frame.height - frame.bottom + 20}
                  fill={colors.muted}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {formatChartNumber(tick)}
                </text>
              </g>
            );
          })}
          {yTicks.map((tick, index) => {
            const y = chartY(tick, yDomain, frame);
            return (
              <g key={`y-${index}`}>
                <line
                  x1={frame.left}
                  y1={y}
                  x2={frame.left + plotWidth}
                  y2={y}
                  stroke={colors.grid}
                  strokeOpacity={0.55}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={frame.left - 10}
                  y={y + 4}
                  fill={colors.muted}
                  fontSize={10}
                  textAnchor="end"
                >
                  {formatChartNumber(tick)}
                </text>
              </g>
            );
          })}
          <rect
            x={frame.left}
            y={frame.top}
            width={plotWidth}
            height={plotHeight}
            fill="none"
            stroke={colors.muted}
            strokeOpacity={0.75}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={frame.left + plotWidth / 2}
            y={frame.height - 16}
            fill={colors.foreground}
            fontSize={12}
            textAnchor="middle"
          >
            {xLabel}
          </text>
          <text
            x={18}
            y={frame.top + plotHeight / 2}
            fill={colors.foreground}
            fontSize={12}
            textAnchor="middle"
            transform={`rotate(-90 18 ${frame.top + plotHeight / 2})`}
          >
            {yLabel}
          </text>
        </g>

        {children}

        {legendEntries.length > 0 && (
          <g aria-label="Series legend">
            {legendEntries.map((entry, index) => {
              const y = frame.top + 15 + index * 18;
              return (
                <g key={`${index}-${entry.label}`}>
                  <line
                    x1={frame.width - frame.right + 18}
                    y1={y}
                    x2={frame.width - frame.right + 42}
                    y2={y}
                    stroke={entry.color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={frame.width - frame.right + 48}
                    y={y + 4}
                    fill={colors.foreground}
                    fontSize={10}
                  >
                    {entry.label.length > 22
                      ? `${entry.label.slice(0, 21)}…`
                      : entry.label}
                  </text>
                </g>
              );
            })}
            {legend.length > legendEntries.length && (
              <text
                x={frame.width - frame.right + 18}
                y={frame.top + 15 + legendEntries.length * 18}
                fill={colors.muted}
                fontSize={10}
              >
                +{legend.length - legendEntries.length} more series
              </text>
            )}
          </g>
        )}
      </svg>
      {dataRows && (
        <PaginatedChartData
          key={dataRows.key}
          label={dataRows.label}
          rowCount={dataRows.rowCount}
          rowAt={dataRows.rowAt}
          pageSize={dataRows.pageSize}
          foreground={colors.foreground}
          background={colors.background}
        />
      )}
      {(note || accessibleDetails.length > 0) && (
        <figcaption
          className="cortexel-reference-chart-details"
          style={{
            boxSizing: 'border-box',
            padding: '9px 12px',
            color: colors.foreground,
            background: colors.background,
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {note && <div>{note}</div>}
          {accessibleDetails.length > 0 && (
            <div aria-label={accessibleDetailsLabel}>
              <span>{accessibleDetailsLabel}: </span>
              {accessibleDetails.join(' ')}
            </div>
          )}
        </figcaption>
      )}
    </figure>
  );
}

function sampledUniqueValues(values: readonly number[], maximum = 8): number[] {
  const unique = [...new Set(values)].sort((left, right) => left - right);
  if (unique.length <= maximum) return unique;
  const sampled = new Array<number>(maximum);
  for (let index = 0; index < maximum; index++) {
    sampled[index] = unique[Math.round(index * (unique.length - 1) / (maximum - 1))];
  }
  return sampled;
}

function TraceChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as VoltageTraceParams;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = nestedNumericDomain(params.series);
  const legend = params.series_labels.map((label, index) => ({
    label,
    color: seriesColor(args.palette, index),
  }));
  const showLegend = params.series.length > 1 && width >= 600;
  const frame = makeFrame(width, height, showLegend ? 210 : 28);
  const variable = declaredInput(args, 'recorded_variable') ?? 'Recorded variable';
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title={`${variable} trace`}
      description={`${params.series.length} labeled series with ${params.times_ms.length} samples each. Series: ${seriesLabelSummary(params.series_labels)}. Time is in milliseconds and the shared value axis is in ${params.units}.`}
      metadata={`${params.series.length} series • ${params.times_ms.length} samples`}
      xLabel="Time (ms)"
      yLabel={`${variable} (${params.units})`}
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      legend={showLegend ? legend : undefined}
      sampleCount={params.times_ms.length * params.series.length}
    >
      <g fill="none">
        {params.series.map((series, index) => (
          <path
            key={`${index}-${params.series_labels[index]}`}
            data-mark="trace-line"
            d={linePath(params.times_ms, series, xDomain, yDomain, frame)}
            stroke={seriesColor(args.palette, index)}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </ChartShell>
  );
}

function AstrocyteChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as AstrocyteParams;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = numericDomain(params.ca_trace, { includeZero: true });
  const frame = makeFrame(width, height);
  const variable = declaredInput(args, 'recorded_variable') ?? 'Ca²⁺/IP₃';
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title={`${variable} dynamics`}
      description={`Glial ${variable} analog signal with ${params.times_ms.length} samples in ${params.units}. This is not membrane voltage.`}
      metadata={`${params.times_ms.length} samples • glial analog trace, not voltage`}
      xLabel="Time (ms)"
      yLabel={`${variable} (${params.units})`}
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      sampleCount={params.times_ms.length}
    >
      <path
        data-mark="astrocyte-line"
        d={linePath(params.times_ms, params.ca_trace, xDomain, yDomain, frame)}
        fill="none"
        stroke={args.palette.teal}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </ChartShell>
  );
}

function SpikeRasterChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as SpikeRasterParams;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = numericDomain(params.senders);
  const frame = makeFrame(width, height);
  const senderCount = new Set(params.senders).size;
  const senderTicks = sampledUniqueValues(params.senders);
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title="Spike raster"
      description={`${params.times_ms.length} exact spike events from ${senderCount} senders. No rate bins or synthetic events are added.`}
      metadata={`${params.times_ms.length} spikes • ${senderCount} senders • exact event times`}
      xLabel="Time (ms)"
      yLabel="Sender ID"
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      yTicks={senderTicks}
      sampleCount={params.times_ms.length}
    >
      <path
        data-mark="spike-events"
        data-event-count={params.times_ms.length}
        d={rasterTickPath(params.times_ms, params.senders, xDomain, yDomain, frame)}
        fill="none"
        stroke={args.palette.spike}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </ChartShell>
  );
}

const POPULATION_RATE_PATH_SAMPLE_BUDGET = 8_192;

function populationRateSeriesDetail(
  series: PopulationRateParams['series'][number],
): string {
  let minimumRate = Number.POSITIVE_INFINITY;
  let maximumRate = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < series.rates_hz.length; index++) {
    minimumRate = Math.min(minimumRate, series.rates_hz[index]);
    maximumRate = Math.max(maximumRate, series.rates_hz[index]);
  }
  return `${series.label} (id ${series.id}): ${series.recorded_sender_count} recorded ` +
    `senders, ${series.spike_counts.length} spike-count bins, rate range ` +
    `${formatChartNumber(minimumRate)}–${formatChartNumber(maximumRate)} Hz.`;
}

function PopulationRateChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as PopulationRateParams;
  const xDomain = numericDomain([params.window_start_ms, params.window_stop_ms]);
  const yDomain = nestedNumericDomain(
    params.series.map((series) => series.rates_hz),
    { includeZero: true },
  );
  const showLegend = width >= 600;
  const frame = makeFrame(width, height, showLegend ? 230 : 28);
  const legend = params.series.map((series, index) => ({
    label: `${series.label} (${series.id})`,
    color: seriesColor(args.palette, index),
  }));
  const perSeriesBudget = Math.max(
    2,
    Math.floor(POPULATION_RATE_PATH_SAMPLE_BUDGET / params.series.length),
  );
  const paths = params.series.map((series) => binnedStepPath(
    params.bin_centers_ms,
    series.rates_hz,
    params.bin_width_ms,
    xDomain,
    yDomain,
    frame,
    perSeriesBudget,
  ));
  const compacted = paths.some((path) => path.compacted);
  const seriesDetails = params.series.map(populationRateSeriesDetail);
  const formula = 'rates_hz = spike_counts × 1000 ÷ ' +
    '(recorded_sender_count × bin_width_ms)';
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title="Population firing rate"
      description={`${params.series.length} exact checked population-rate series over ${params.bin_centers_ms.length} uniform bins. Horizontal steps show the supplied bin values without interpolation or smoothing. Series: ${seriesLabelSummary(params.series.map((series) => `${series.label} (${series.id})`))}. ${formula}.`}
      metadata={`${params.series.length} series • ${params.bin_centers_ms.length} bins • bin ${formatChartNumber(params.bin_width_ms)} ms • window [${formatChartNumber(params.window_start_ms)}, ${formatChartNumber(params.window_stop_ms)}) ms`}
      note={`Rate formula: ${formula}. Binning: ${params.binning}; aggregation: ${params.aggregation}; normalization: ${params.normalization}.${compacted ? ' Long series are visually compacted to exact per-bucket extrema; omitted bins are never bridged.' : ''}`}
      accessibleDetails={seriesDetails}
      xLabel="Time (ms)"
      yLabel="Population rate (Hz)"
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      legend={showLegend ? legend : undefined}
      sampleCount={params.bin_centers_ms.length * params.series.length}
    >
      <g fill="none">
        {params.series.map((series, index) => (
          <path
            key={series.id}
            data-mark="population-rate-steps"
            data-series-id={series.id}
            data-source-bin-count={paths[index].sourceSampleCount}
            data-rendered-bin-count={paths[index].renderedSampleCount}
            data-compacted={paths[index].compacted ? 'true' : 'false'}
            d={paths[index].path}
            stroke={seriesColor(args.palette, index)}
            strokeWidth={2}
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </ChartShell>
  );
}

function RateResponseChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as RateResponseParams;
  const xDomain = numericDomain(params.stimulus_amplitudes);
  const yDomain = numericDomain(params.rates_hz, { includeZero: true });
  const frame = makeFrame(width, height);
  const bin = declaredInput(args, 'bin_ms');
  const normalization = declaredInput(args, 'rate_normalization');
  const metadata = [
    `${params.rates_hz.length} response points`,
    bin ? `counting window ${bin} ms` : undefined,
    normalization,
  ].filter((value): value is string => value !== undefined).join(' • ');
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title="F–I response"
      description={`${params.rates_hz.length} firing-rate measurements ordered by stimulus amplitude for display. Rates are in hertz and stimulus is in ${params.stimulus_units}.`}
      metadata={metadata}
      xLabel={`Stimulus (${params.stimulus_units})`}
      yLabel="Firing rate (Hz)"
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      sampleCount={params.rates_hz.length}
    >
      <path
        data-mark="fi-line"
        d={sortedLinePath(
          params.stimulus_amplitudes,
          params.rates_hz,
          xDomain,
          yDomain,
          frame,
        )}
        fill="none"
        stroke={args.palette.excitatory}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <path
        data-mark="fi-points"
        d={pointPath(
          params.stimulus_amplitudes,
          params.rates_hz,
          xDomain,
          yDomain,
          frame,
        )}
        fill={args.palette.excitatory}
      />
    </ChartShell>
  );
}

interface HistogramChartProps {
  args: ReferenceChartSceneProps;
  width: number;
  height: number;
  id: string;
  title: string;
  description: string;
  metadata: string;
  xLabel: string;
  yLabel: string;
  centers: readonly number[];
  values: readonly number[];
  binWidth: number;
  color: string;
  alignmentLabel?: string;
}

function HistogramChart({
  args,
  width,
  height,
  id,
  title,
  description,
  metadata,
  xLabel,
  yLabel,
  centers,
  values,
  binWidth,
  color,
  alignmentLabel,
}: HistogramChartProps) {
  const xDomain = histogramDomain(centers, binWidth);
  const yDomain = numericDomain(values, { includeZero: true });
  const frame = makeFrame(width, height);
  const zeroInDomain = xDomain.min <= 0 && xDomain.max >= 0;
  const zeroX = chartX(0, xDomain, frame);
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title={title}
      description={description}
      metadata={metadata}
      xLabel={xLabel}
      yLabel={yLabel}
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      sampleCount={values.length}
    >
      <path
        data-mark="histogram-bars"
        data-bar-count={values.length}
        d={histogramBarPath(centers, values, binWidth, xDomain, yDomain, frame)}
        fill={color}
        fillOpacity={0.82}
        stroke={color}
        strokeWidth={0.75}
        vectorEffect="non-scaling-stroke"
      />
      {alignmentLabel && zeroInDomain && (
        <g data-mark="alignment-zero">
          <line
            x1={zeroX}
            y1={frame.top}
            x2={zeroX}
            y2={frame.height - frame.bottom}
            stroke={args.palette.amber}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={zeroX + 5}
            y={frame.top + 13}
            fill={args.palette.amber}
            fontSize={10}
          >
            t=0: {alignmentLabel.length > 36
              ? `${alignmentLabel.slice(0, 35)}…`
              : alignmentLabel}
          </text>
        </g>
      )}
    </ChartShell>
  );
}

function IsiChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as IsiDistributionParams;
  return (
    <HistogramChart
      args={args}
      width={width}
      height={height}
      id={id}
      title="Inter-spike interval distribution"
      description={`${params.values.length} uniform ${params.bin_width_ms} ms bins using ${params.normalization} normalization and ${params.interval_scope} interval scope.`}
      metadata={`${params.normalization} • ${params.interval_scope} • bin ${formatChartNumber(params.bin_width_ms)} ms`}
      xLabel="Inter-spike interval (ms)"
      yLabel={params.value_units}
      centers={params.bin_centers_ms}
      values={params.values}
      binWidth={params.bin_width_ms}
      color={args.palette.teal}
    />
  );
}

function PsthChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as PsthParams;
  return (
    <HistogramChart
      args={args}
      width={width}
      height={height}
      id={id}
      title="Peri-stimulus time histogram"
      description={`${params.values.length} trial-aligned bins aggregated across selected senders for ${params.trial_count} trials. Alignment event: ${params.alignment_event}. Normalization: ${params.normalization}.`}
      metadata={`${params.normalization} • ${params.trial_count} trials • bin ${formatChartNumber(params.bin_width_ms)} ms`}
      xLabel="Time from alignment event (ms)"
      yLabel={params.value_units}
      centers={params.bin_centers_ms}
      values={params.values}
      binWidth={params.bin_width_ms}
      color={args.palette.spike}
      alignmentLabel={params.alignment_event}
    />
  );
}

function correlogramStatisticDetail(
  statistic: CorrelogramParams['statistic'],
): string {
  switch (statistic.kind) {
    case 'pair_rate_hz':
      return `${statistic.kind} (${statistic.units}), exposure ${formatChartNumber(statistic.exposure_s)} s`;
    case 'pearson_coefficient':
      return `${statistic.kind} (${statistic.units}), ${statistic.sample_count} samples`;
    default:
      return `${statistic.kind} (${statistic.units})`;
  }
}

function CorrelogramChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as CorrelogramParams;
  const xDomain = numericDomain([-params.tau_max_ms, params.tau_max_ms]);
  const yDomain = numericDomain(params.values, { includeZero: true });
  const frame = makeFrame(width, height);
  const zeroX = chartX(0, xDomain, frame);
  const statistic = correlogramStatisticDetail(params.statistic);
  const pair = `${params.pair.reference_label} → ${params.pair.target_label}`;
  const marks = boundedStemPointPaths(
    params.lags_ms,
    params.values,
    xDomain,
    yDomain,
    frame,
  );
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title="Spike-train correlogram"
      description={`${params.values.length} exact binned ${params.statistic.kind} values for the oriented pair ${pair}. Positive lag means the target follows the reference. Signed values and lag asymmetry are preserved; bins are shown as independent stems and points with no interpolation or mirroring. The zero-lag reference line does not add a zero bin.`}
      metadata={`${pair} • ${statistic} • bin ${formatChartNumber(params.bin_width_ms)} ms • τ range ±${formatChartNumber(params.tau_max_ms)} ms`}
      note={`Pair orientation: ${pair}. Lag convention: ${params.lag_convention}. Statistic: ${statistic}. Counting window: [${formatChartNumber(params.counting_start_ms)}, ${formatChartNumber(params.counting_stop_ms)}) ms. Binning: ${params.binning}. Zero-lag policy: ${params.zero_lag_policy}; the lag-zero line is a reference only and does not invent a bin.${marks.compacted ? ' Long series are visually compacted to exact per-bucket extrema; omitted bins remain disconnected and are never mirrored.' : ''}`}
      xLabel="Lag (ms)"
      yLabel={`${params.statistic.kind} (${params.statistic.units})`}
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      sampleCount={params.values.length}
    >
      <g data-mark="zero-lag-reference" data-zero-bin-present={params.lags_ms.includes(0)}>
        <line
          x1={zeroX}
          y1={frame.top}
          x2={zeroX}
          y2={frame.height - frame.bottom}
          stroke={args.palette.amber}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          vectorEffect="non-scaling-stroke"
        />
        <text x={zeroX + 5} y={frame.top + 13} fill={args.palette.amber} fontSize={10}>
          lag 0 reference
        </text>
      </g>
      <path
        data-mark="correlogram-stems"
        data-bin-count={params.values.length}
        data-source-bin-count={marks.sourceSampleCount}
        data-rendered-bin-count={marks.renderedSampleCount}
        data-compacted={marks.compacted ? 'true' : 'false'}
        d={marks.stems}
        fill="none"
        stroke={args.palette.excitatory}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <path
        data-mark="correlogram-points"
        data-bin-count={params.values.length}
        data-source-bin-count={marks.sourceSampleCount}
        data-rendered-bin-count={marks.renderedSampleCount}
        data-compacted={marks.compacted ? 'true' : 'false'}
        d={marks.points}
        fill={args.palette.excitatory}
      />
    </ChartShell>
  );
}

function WeightHistogramChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as WeightHistogramParams;
  return (
    <HistogramChart
      args={args}
      width={width}
      height={height}
      id={id}
      title="Connection-weight distribution"
      description={`${params.values.length} weight bins from the declared connection snapshot at ${params.snapshot_time_ms} ms, using ${params.normalization} normalization.`}
      metadata={`${params.normalization} • snapshot ${formatChartNumber(params.snapshot_time_ms)} ms • bin ${formatChartNumber(params.bin_width)} ${params.weight_units}`}
      xLabel={`Connection weight (${params.weight_units})`}
      yLabel={params.value_units}
      centers={params.bin_centers}
      values={params.values}
      binWidth={params.bin_width}
      color={args.palette.violet}
    />
  );
}

function PlasticityChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as PlasticityParams;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = numericDomain(params.weights);
  const frame = makeFrame(width, height);
  const synapseModel = declaredInput(args, 'synapse_model');
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title="Synaptic weight dynamics"
      description={`${params.weights.length} measured weight samples over time in ${params.weight_units}. This view does not invent an STDP window or pre/post spike protocol.`}
      metadata={[synapseModel, `${params.weights.length} samples`]
        .filter((value): value is string => value !== undefined)
        .join(' • ')}
      xLabel="Time (ms)"
      yLabel={`Weight (${params.weight_units})`}
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      sampleCount={params.weights.length}
    >
      <path
        data-mark="weight-line"
        d={linePath(params.times_ms, params.weights, xDomain, yDomain, frame)}
        fill="none"
        stroke={args.palette.ltp}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </ChartShell>
  );
}

function PhasePlaneChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as PhasePlaneParams;
  const [xAxis, yAxis] = params.axis_order;
  const xValues = params.grid[xAxis];
  const yValues = params.grid[yAxis];
  const xDomain = numericDomain(xValues);
  const yDomain = numericDomain(yValues);
  const frame = makeFrame(width, height);
  const samples = phasePlaneSamples(
    params.axis_order as readonly [string, string],
    params.grid,
    params.derivatives,
  );
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title="Phase-plane vector field"
      description={`${samples.length} derivative vectors on the Cartesian ${xAxis} by ${yAxis} grid. Derivative units are ${params.derivative_units[xAxis]} for ${xAxis} and ${params.derivative_units[yAxis]} for ${yAxis}. Arrows are normalized in plotted coordinate space and do not encode an absolute integration timestep. No trajectory, nullcline, or equilibrium is invented.`}
      metadata={`${xValues.length}×${yValues.length} grid • vector units ${xAxis}: ${params.derivative_units[xAxis]}; ${yAxis}: ${params.derivative_units[yAxis]} • row-major, last axis fastest`}
      xLabel={`${xAxis} (${params.axis_units[xAxis]})`}
      yLabel={`${yAxis} (${params.axis_units[yAxis]})`}
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      sampleCount={samples.length}
    >
      <path
        data-mark="phase-vectors"
        data-vector-count={samples.length}
        d={phasePlaneArrowPath(samples, xDomain, yDomain, frame)}
        fill="none"
        stroke={args.palette.orange}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </ChartShell>
  );
}

type MatrixSkill = 'nest.adjacency_matrix' | 'nest.weight_matrix' | 'nest.delay_matrix';

function MatrixChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const skill = args.skill as MatrixSkill;
  const params = args.params as unknown as
    | AdjacencyMatrixParams
    | WeightMatrixParams
    | DelayMatrixParams;
  const showLegend = width >= 600;
  const frame = makeFrame(width, height, showLegend ? 190 : 28);
  const sourceIndex = new Map<number, number>();
  const targetIndex = new Map<number, number>();
  for (let index = 0; index < params.source_ids.length; index++) {
    sourceIndex.set(params.source_ids[index], index);
  }
  for (let index = 0; index < params.target_ids.length; index++) {
    targetIndex.set(params.target_ids[index], index);
  }
  const cells = params.cells.map((cell) => ({
    sourceIndex: sourceIndex.get(cell.source_id) ?? -1,
    targetIndex: targetIndex.get(cell.target_id) ?? -1,
    value: skill === 'nest.adjacency_matrix'
      ? 1
      : (cell as WeightMatrixParams['cells'][number] | DelayMatrixParams['cells'][number]).value,
  }));
  const geometry = matrixValueBucketPaths(
    cells,
    params.source_ids.length,
    params.target_ids.length,
    frame,
  );
  const minimumCellPixels = Math.min(
    chartPlotWidth(frame) / params.source_ids.length,
    chartPlotHeight(frame) / params.target_ids.length,
  );
  const cellStrokeWidth = minimumCellPixels >= 1.5 ? 0.35 : 0;
  const colors = chartColors(args.palette, args.themeMode);
  const sourceTicks = sampledIndices(params.source_ids.length, 6);
  const targetTicks = sampledIndices(params.target_ids.length, 6);
  const presentZeroCount = geometry.buckets.find((bucket) => bucket.sign === 0)?.cellCount ?? 0;
  const connectionCount = params.connection_count;
  const title = skill === 'nest.adjacency_matrix'
    ? 'Connection adjacency matrix'
    : skill === 'nest.weight_matrix'
      ? 'Connection-weight matrix'
      : 'Connection-delay matrix';
  const metric = skill === 'nest.adjacency_matrix'
      ? 'binary presence'
    : `${(params as WeightMatrixParams | DelayMatrixParams).aggregation} ${
        skill === 'nest.weight_matrix'
          ? `weight (${(params as WeightMatrixParams).weight_units})`
          : `delay (${(params as DelayMatrixParams).delay_units})`
      }`;
  const scope = metadataValue(params.snapshot_scope);
  const maximum = formatChartNumber(geometry.maximumAbsoluteValue);
  const sourceSummary = params.source_ids.length === 0
    ? 'none'
    : `${params.source_ids[0]}…${params.source_ids[params.source_ids.length - 1]}`;
  const targetSummary = params.target_ids.length === 0
    ? 'none'
    : `${params.target_ids[0]}…${params.target_ids[params.target_ids.length - 1]}`;

  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title={title}
      description={`${params.cells.length} present sparse cells on ${params.target_ids.length} declared target rows and ${params.source_ids.length} declared source columns. Target rows follow the declared top-to-bottom order and source columns follow the declared left-to-right order. Absent cells mean no connection; a present measured zero remains visibly distinct. Cells are never interpolated or spatially merged.`}
      metadata={`${params.target_ids.length}×${params.source_ids.length} axes • ${params.cells.length} present cells • ${connectionCount} connections • snapshot ${formatChartNumber(params.snapshot_time_ms)} ms`}
      note={`Orientation: ${params.axis_order}. Metric: ${metric}. Absent cell: ${params.absent_cell}. Connection sample policy: ${params.sample_policy}. Snapshot scope (including MPI ownership): ${scope}. Every sparse cell keeps exact row/column geometry; paint is grouped into ${geometry.valueBucketCount} bounded signed value paths, with ${presentZeroCount} present zero-valued cells and maximum absolute displayed value ${maximum}. Negative values use the inhibitory color, positive values use the excitatory color, and opacity uses eight disclosed magnitude levels.${cellStrokeWidth === 0 ? ' Cell border strokes are suppressed below pixel scale, but no cell or value is removed.' : ''}`}
      accessibleDetails={[
        `Source axis ids: ${sourceSummary}.`,
        `Target axis ids: ${targetSummary}.`,
        `${geometry.sourceCellCount} source cells and ${geometry.renderedCellCount} rendered cells; none omitted.`,
      ]}
      accessibleDetailsLabel="Matrix summary"
      xLabel="Source node ID (declared column order)"
      yLabel="Target node ID (declared row order)"
      xDomain={{ min: 0, max: Math.max(1, params.source_ids.length) }}
      yDomain={{ min: 0, max: Math.max(1, params.target_ids.length) }}
      xTicks={[]}
      yTicks={[]}
      frame={frame}
      colors={colors}
      sampleCount={params.cells.length}
      dataRows={{
        key: `${skill}-${params.snapshot_time_ms}-${params.source_ids.length}-${params.target_ids.length}-${params.cells.length}`,
        label: 'Matrix data ordered as source-axis columns, target-axis rows, then present cells',
        rowCount: params.source_ids.length + params.target_ids.length + params.cells.length,
        rowAt: (index) => {
          if (index < params.source_ids.length) {
            return `Source-axis column ${index + 1} of ${params.source_ids.length} (declared order): node ID ${params.source_ids[index]}.`;
          }
          const targetRow = index - params.source_ids.length;
          if (targetRow < params.target_ids.length) {
            return `Target-axis row ${targetRow + 1} of ${params.target_ids.length} (declared order): node ID ${params.target_ids[targetRow]}.`;
          }
          const cellIndex = targetRow - params.target_ids.length;
          const cell = params.cells[cellIndex];
          const declaredRow = (targetIndex.get(cell.target_id) ?? -1) + 1;
          const declaredColumn = (sourceIndex.get(cell.source_id) ?? -1) + 1;
          if (skill === 'nest.adjacency_matrix') {
            return `Present-cell record ${cellIndex + 1} of ${params.cells.length}: target node ID ${cell.target_id} at declared row ${declaredRow}, source node ID ${cell.source_id} at declared column ${declaredColumn}; ${cell.connection_count} connection${cell.connection_count === 1 ? '' : 's'}; binary presence.`;
          }
          const measured = cell as WeightMatrixParams['cells'][number] | DelayMatrixParams['cells'][number];
          const units = skill === 'nest.weight_matrix'
            ? (params as WeightMatrixParams).weight_units
            : (params as DelayMatrixParams).delay_units;
          return `Present-cell record ${cellIndex + 1} of ${params.cells.length}: target node ID ${cell.target_id} at declared row ${declaredRow}, source node ID ${cell.source_id} at declared column ${declaredColumn}; ${cell.connection_count} connection${cell.connection_count === 1 ? '' : 's'}; displayed value ${formatChartNumber(measured.value)} ${units}; aggregation ${(params as WeightMatrixParams | DelayMatrixParams).aggregation}.`;
        },
      }}
    >
      <g
        data-mark="matrix-cells"
        data-source-cell-count={geometry.sourceCellCount}
        data-rendered-cell-count={geometry.renderedCellCount}
        data-value-bucket-count={geometry.valueBucketCount}
        data-present-zero-count={presentZeroCount}
        data-absent-cell={params.absent_cell}
        data-axis-order={params.axis_order}
        data-cell-stroke={cellStrokeWidth > 0 ? 'visible' : 'suppressed-below-pixel-scale'}
      >
        <rect
          x={frame.left}
          y={frame.top}
          width={chartPlotWidth(frame)}
          height={chartPlotHeight(frame)}
          fill={colors.grid}
          fillOpacity={0.14}
          data-mark="matrix-absent-background"
        />
        {geometry.buckets.map((bucket) => {
          const paint = matrixBucketPaint(bucket, args.palette);
          return (
            <path
              key={bucket.key}
              data-mark="matrix-value-bucket"
              data-bucket={bucket.key}
              data-cell-count={bucket.cellCount}
              d={bucket.path}
              fill={paint.color}
              fillOpacity={paint.opacity}
              stroke={colors.background}
              strokeWidth={cellStrokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
      <g aria-hidden="true" data-mark="matrix-axis-identities">
        {sourceTicks.map((axisIndex) => {
          const x = frame.left + (axisIndex + 0.5) / params.source_ids.length * chartPlotWidth(frame);
          return (
            <text
              key={`source-${axisIndex}`}
              x={x}
              y={frame.height - frame.bottom + 18}
              fill={colors.muted}
              fontSize={9}
              textAnchor="middle"
            >
              {params.source_ids[axisIndex]}
            </text>
          );
        })}
        {targetTicks.map((axisIndex) => {
          const y = frame.top + (axisIndex + 0.5) / params.target_ids.length * chartPlotHeight(frame);
          return (
            <text
              key={`target-${axisIndex}`}
              x={frame.left - 9}
              y={y + 3}
              fill={colors.muted}
              fontSize={9}
              textAnchor="end"
            >
              {params.target_ids[axisIndex]}
            </text>
          );
        })}
      </g>
      {showLegend && (
        <g aria-label="Matrix value legend" data-mark="matrix-value-legend">
          {[
            ['absent: no connection', colors.grid, 0.3],
            ['present zero', args.palette.inkDim, 0.58],
            ['negative', args.palette.inhibitory, 1],
            ['positive', args.palette.excitatory, 1],
          ].map(([label, color, opacity], legendIndex) => {
            const y = frame.top + legendIndex * 22;
            return (
              <g key={String(label)}>
                <rect
                  x={frame.width - frame.right + 18}
                  y={y}
                  width={10}
                  height={10}
                  fill={String(color)}
                  fillOpacity={Number(opacity)}
                />
                <text
                  x={frame.width - frame.right + 34}
                  y={y + 9}
                  fill={colors.foreground}
                  fontSize={9}
                >
                  {String(label)}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </ChartShell>
  );
}

function ConnectionGraphChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as ConnectionGraphParams;
  const frame = makeFrame(width, height);
  const geometry = circleTopologyGeometry(params.nodes, params.edges, frame);
  const colors = chartColors(args.palette, args.themeMode);
  const endpointIds = new Set<number>();
  let weightedEdges = 0;
  let delayedEdges = 0;
  for (let index = 0; index < params.edges.length; index++) {
    endpointIds.add(params.edges[index].source);
    endpointIds.add(params.edges[index].target);
    if (params.edges[index].weight !== undefined) weightedEdges += 1;
    if (params.edges[index].delay_ms !== undefined) delayedEdges += 1;
  }
  const isolateCount = params.nodes.reduce(
    (count, node) => count + (endpointIds.has(node.id) ? 0 : 1),
    0,
  );
  const scope = metadataValue(params.snapshot_scope);
  const samplePolicy = metadataValue(params.sample_policy);
  const labels = sampledIndices(params.nodes.length, 8);
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title="Connection topology graph"
      description={`${params.nodes.length} declared nodes, including ${isolateCount} isolates, and ${params.edges.length} provided directed connection records on a deterministic schematic circle. Every provided multapse, reverse edge, and autapse is retained with a separate deterministic lane and persistent arrowhead. Circle positions and distances are derived for readability and are not spatial evidence.`}
      metadata={`${params.nodes.length} nodes • ${params.edges.length} rendered of ${params.source_connection_count} source connections • ${isolateCount} isolates • snapshot ${formatChartNumber(params.snapshot_time_ms)} ms`}
      note={`Schematic layout: ${params.layout}; node positions and distances are not measured. Parallel edges: ${params.parallel_edges}; self-connections: ${params.self_connections}; arrowheads preserve source→target direction. ${weightedEdges} edges carry weights${params.weight_units ? ` in ${params.weight_units}` : ''} and ${delayedEdges} carry delays${params.delay_units ? ` in ${params.delay_units}` : ''}; neither channel is mapped to geometry. Edge identity: ${params.edge_identity}. Source connection count: ${params.source_connection_count}. Sample policy: ${samplePolicy}. Snapshot scope (including MPI ownership): ${scope}.`}
      accessibleDetails={[
        `${geometry.sourceNodeCount} source nodes and ${geometry.renderedNodeCount} rendered nodes; none omitted.`,
        `${params.source_connection_count} source connections, ${geometry.sourceEdgeCount} provided sample edges, and ${geometry.renderedEdgeCount} rendered edges; no provided edge omitted.`,
        `${geometry.selfLoopCount} self-connections and ${geometry.parallelEdgeCount} edges in parallel bundles.`,
      ]}
      accessibleDetailsLabel="Topology summary"
      xLabel="Schematic circle layout — horizontal position is non-quantitative"
      yLabel="Schematic vertical position"
      xDomain={{ min: 0, max: 1 }}
      yDomain={{ min: 0, max: 1 }}
      xTicks={[]}
      yTicks={[]}
      frame={frame}
      colors={colors}
      sampleCount={params.nodes.length + params.edges.length}
      dataRows={{
        key: `connection-graph-${params.snapshot_time_ms}-${params.nodes.length}-${params.edges.length}`,
        label: 'Connection graph node and edge data',
        rowCount: params.nodes.length + params.edges.length,
        rowAt: (index) => {
          if (index < params.nodes.length) {
            const node = params.nodes[index];
            return `Node ${node.id}: ${node.label}; ${endpointIds.has(node.id) ? 'incident to at least one provided edge' : 'isolated in the provided graph'}.`;
          }
          const edge = params.edges[index - params.nodes.length];
          const details = [
            edge.weight === undefined
              ? undefined
              : `weight ${formatChartNumber(edge.weight)} ${params.weight_units}`,
            edge.delay_ms === undefined
              ? undefined
              : `delay ${formatChartNumber(edge.delay_ms)} ${params.delay_units}`,
            edge.synapse_model === undefined
              ? undefined
              : `synapse model ${edge.synapse_model}`,
            `edge identity ${params.edge_identity}`,
          ].filter((value): value is string => value !== undefined);
          return `Edge ${edge.id}: ${edge.source} → ${edge.target}${details.length > 0 ? `; ${details.join('; ')}` : ''}.`;
        },
      }}
    >
      <path
        data-mark="connection-edges"
        data-source-edge-count={params.source_connection_count}
        data-provided-edge-count={geometry.sourceEdgeCount}
        data-rendered-edge-count={geometry.renderedEdgeCount}
        data-self-loop-count={geometry.selfLoopCount}
        data-parallel-edge-count={geometry.parallelEdgeCount}
        data-edge-identity={params.edge_identity}
        data-sample-policy={params.sample_policy}
        d={geometry.edgePath}
        fill="none"
        stroke={args.palette.cyan}
        strokeOpacity={0.65}
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      <path
        data-mark="connection-arrowheads"
        data-arrow-count={geometry.renderedEdgeCount}
        d={geometry.arrowPath}
        fill={args.palette.orange}
      />
      <path
        data-mark="connection-nodes"
        data-source-node-count={geometry.sourceNodeCount}
        data-rendered-node-count={geometry.renderedNodeCount}
        data-isolate-count={isolateCount}
        d={geometry.nodePath}
        fill={args.palette.excitatory}
        stroke={colors.background}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <g aria-hidden="true" data-mark="connection-node-labels">
        {labels.map((nodeIndex) => {
          const position = geometry.positions[nodeIndex];
          const label = params.nodes[nodeIndex].label;
          return (
            <text
              key={params.nodes[nodeIndex].id}
              x={position.x + 6}
              y={position.y - 6}
              fill={colors.foreground}
              fontSize={9}
            >
              {label.length > 24 ? `${label.slice(0, 23)}…` : label}
            </text>
          );
        })}
      </g>
    </ChartShell>
  );
}

const DEGREE_RENDER_BIN_BUDGET = 512;

function DegreeDistributionChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as
    | InDegreeDistributionParams
    | OutDegreeDistributionParams;
  const aggregated = aggregateDegreeBins(
    params.degrees,
    params.node_counts,
    params.values,
    DEGREE_RENDER_BIN_BUDGET,
  );
  const frame = makeFrame(width, height);
  const firstDegree = params.degrees[0] ?? 0;
  const finalDegree = params.degrees[params.degrees.length - 1] ?? firstDegree;
  const xDomain = { min: firstDegree - 0.5, max: finalDegree + 0.5 };
  const yDomain = numericDomain(aggregated.bins.map((bin) => bin.value), {
    includeZero: true,
  });
  const path = variableHistogramPath(aggregated.bins, xDomain, yDomain, frame);
  const scope = metadataValue(params.snapshot_scope);
  const directionTitle = params.direction === 'in' ? 'In-degree distribution' : 'Out-degree distribution';
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title={directionTitle}
      description={`${params.degrees.length} ordered ${params.direction}-degree bins over ${params.node_count} declared nodes. Adjacent display bins may be grouped by summing both raw node counts and displayed mass; extrema sampling is never used.`}
      metadata={`${params.node_count} nodes • ${params.connection_count} connections • ${aggregated.sourceBinCount} source bins • ${aggregated.renderedBinCount} rendered bins`}
      note={`Direction: ${params.direction}; normalization: ${params.normalization}; edge counting: ${params.edge_counting}; zero-degree policy: ${params.zero_degree_policy}; sample policy: ${params.sample_policy}. Snapshot: ${formatChartNumber(params.snapshot_time_ms)} ms. Snapshot scope (including MPI ownership): ${scope}.${aggregated.compacted ? ` Adjacent bins were mass-preservingly compacted from ${aggregated.sourceBinCount} to ${aggregated.renderedBinCount}; no extrema selection or interpolation was used.` : ' Every source bin is rendered directly.'}`}
      accessibleDetails={[
        `Raw node-count mass: ${formatChartNumber(aggregated.sourceNodeMass)} before and ${formatChartNumber(aggregated.renderedNodeMass)} after display grouping.`,
        `Displayed value mass: ${formatChartNumber(aggregated.sourceValueMass)} before and ${formatChartNumber(aggregated.renderedValueMass)} after grouping.`,
      ]}
      accessibleDetailsLabel="Degree distribution summary"
      xLabel={`${params.direction === 'in' ? 'In' : 'Out'}-degree`}
      yLabel={params.value_units}
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      sampleCount={params.degrees.length}
      dataRows={{
        key: `${params.direction}-degree-${params.snapshot_time_ms}-${params.degrees.length}`,
        label: `${params.direction === 'in' ? 'In' : 'Out'}-degree bin data`,
        rowCount: params.degrees.length,
        rowAt: (index) => `Degree ${params.degrees[index]}: ${params.node_counts[index]} node${params.node_counts[index] === 1 ? '' : 's'}; displayed value ${formatChartNumber(params.values[index])} ${params.value_units}.`,
      }}
    >
      <path
        data-mark="degree-distribution-bars"
        data-direction={params.direction}
        data-source-bin-count={aggregated.sourceBinCount}
        data-rendered-bin-count={aggregated.renderedBinCount}
        data-source-node-mass={aggregated.sourceNodeMass}
        data-rendered-node-mass={aggregated.renderedNodeMass}
        data-compacted={aggregated.compacted ? 'true' : 'false'}
        data-sample-policy={params.sample_policy}
        d={path}
        fill={params.direction === 'in' ? args.palette.cyan : args.palette.orange}
        fillOpacity={0.82}
        stroke={params.direction === 'in' ? args.palette.cyan : args.palette.orange}
        strokeWidth={0.6}
        vectorEffect="non-scaling-stroke"
      />
    </ChartShell>
  );
}

const DELAY_RENDER_BIN_BUDGET = 4_096;

function DelayDistributionChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as DelayDistributionParams;
  const aggregated = aggregateUniformHistogramBins(
    params.bin_centers_ms,
    params.delay_counts,
    params.values,
    params.bin_width_ms,
    params.normalization,
    DELAY_RENDER_BIN_BUDGET,
  );
  const frame = makeFrame(width, height);
  const xDomain = { min: params.window_start_ms, max: params.window_stop_ms };
  const yDomain = numericDomain(aggregated.bins.map((bin) => bin.value), {
    includeZero: true,
  });
  const path = variableHistogramPath(aggregated.bins, xDomain, yDomain, frame);
  const scope = metadataValue(params.snapshot_scope);
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title="Connection-delay distribution"
      description={`${params.values.length} exact ${params.bin_width_ms} ms delay bins with raw connection counts retained alongside ${params.normalization} values. Adjacent visual compaction preserves raw counts and displayed mass.`}
      metadata={`${aggregated.sourceRawCount} connections • ${aggregated.sourceBinCount} source bins • ${aggregated.renderedBinCount} rendered bins • snapshot ${formatChartNumber(params.snapshot_time_ms)} ms`}
      note={`Delay units: ${params.delay_units}; normalization: ${params.normalization}; aggregation: ${params.aggregation}; binning: ${params.binning}; sample policy: ${params.sample_policy}; window [${formatChartNumber(params.window_start_ms)}, ${formatChartNumber(params.window_stop_ms)}) ms. Snapshot scope (including MPI ownership): ${scope}.${aggregated.compacted ? ` Adjacent bins were mass-preservingly compacted from ${aggregated.sourceBinCount} to ${aggregated.renderedBinCount}; no extrema sampling was used.` : ' Every source bin is rendered directly.'}`}
      accessibleDetails={[
        `Raw delay-event count is ${aggregated.sourceRawCount} before and ${aggregated.renderedRawCount} after display grouping.`,
      ]}
      accessibleDetailsLabel="Delay distribution summary"
      xLabel="Connection delay (ms)"
      yLabel={params.value_units}
      xDomain={xDomain}
      yDomain={yDomain}
      frame={frame}
      colors={chartColors(args.palette, args.themeMode)}
      sampleCount={params.values.length}
      dataRows={{
        key: `delay-${params.snapshot_time_ms}-${params.values.length}`,
        label: 'Connection-delay bin data',
        rowCount: params.values.length,
        rowAt: (index) => {
          const left = params.bin_centers_ms[index] - params.bin_width_ms / 2;
          const right = params.bin_centers_ms[index] + params.bin_width_ms / 2;
          return `Delay bin [${formatChartNumber(left)}, ${formatChartNumber(right)}) ms: ${params.delay_counts[index]} connection${params.delay_counts[index] === 1 ? '' : 's'}; displayed value ${formatChartNumber(params.values[index])} ${params.value_units}.`;
        },
      }}
    >
      <path
        data-mark="delay-distribution-bars"
        data-source-bin-count={aggregated.sourceBinCount}
        data-rendered-bin-count={aggregated.renderedBinCount}
        data-source-delay-count={aggregated.sourceRawCount}
        data-rendered-delay-count={aggregated.renderedRawCount}
        data-compacted={aggregated.compacted ? 'true' : 'false'}
        data-sample-policy={params.sample_policy}
        d={path}
        fill={args.palette.teal}
        fillOpacity={0.82}
        stroke={args.palette.teal}
        strokeWidth={0.6}
        vectorEffect="non-scaling-stroke"
      />
    </ChartShell>
  );
}

function SpatialMap2DChart(
  args: ReferenceChartSceneProps,
  width: number,
  height: number,
  id: string,
) {
  const params = args.params as unknown as SpatialMap2DParams;
  const frame = makeFrame(width, height);
  const extent = params.extent as readonly [number, number];
  const center = params.center as readonly [number, number];
  const domains = equalAspectDomains(extent, center, frame);
  const xs = params.nodes.map((node) => node.x);
  const ys = params.nodes.map((node) => node.y);
  const nodePath = pointPath(xs, ys, domains.xDomain, domains.yDomain, frame, 2.75);
  const boundaryLeft = chartX(center[0] - extent[0] / 2, domains.xDomain, frame);
  const boundaryRight = chartX(center[0] + extent[0] / 2, domains.xDomain, frame);
  const boundaryTop = chartY(center[1] + extent[1] / 2, domains.yDomain, frame);
  const boundaryBottom = chartY(center[1] - extent[1] / 2, domains.yDomain, frame);
  const colors = chartColors(args.palette, args.themeMode);
  const labels = sampledIndices(params.nodes.length, 8);
  const scope = metadataValue(params.position_scope);
  return (
    <ChartShell
      id={id}
      skill={args.skill!}
      scene={args.scene}
      title="2D spatial node map"
      description={`${params.nodes.length} typed nodes at their exact supplied x/y coordinates in ${params.coordinate_units}. One common scale is used for both axes; coordinates are neither jittered nor independently stretched. Marker radius is fixed in screen space and does not encode physical node size.`}
      metadata={`${params.nodes.length} nodes • extent ${formatChartNumber(extent[0])}×${formatChartNumber(extent[1])} ${params.coordinate_units} • center (${formatChartNumber(center[0])}, ${formatChartNumber(center[1])})`}
      note={`Position scope (including MPI ownership): ${scope}. Boundary edge wrap: ${params.edge_wrap ? 'enabled (periodic boundary)' : 'disabled'}. Marker size: ${params.marker_size}; it is not a physical measurement. The declared boundary is shown exactly, x/y use equal scale, and no point is sampled, aggregated, projected, or jittered.`}
      accessibleDetails={[
        `${params.nodes.length} source positions and ${params.nodes.length} rendered positions; none omitted.`,
        `Node id range in declared order: ${params.nodes[0]?.id ?? 'none'}…${params.nodes[params.nodes.length - 1]?.id ?? 'none'}.`,
      ]}
      accessibleDetailsLabel="Spatial map summary"
      xLabel={`x (${params.coordinate_units})`}
      yLabel={`y (${params.coordinate_units})`}
      xDomain={domains.xDomain}
      yDomain={domains.yDomain}
      frame={frame}
      colors={colors}
      sampleCount={params.nodes.length}
      dataRows={{
        key: `spatial-${metadataValue(params.position_scope)}-${params.nodes.length}`,
        label: 'Spatial node-coordinate data',
        rowCount: params.nodes.length,
        rowAt: (index) => {
          const node = params.nodes[index];
          return `Node ${node.id}: ${node.label}; x ${formatChartNumber(node.x)} ${params.coordinate_units}; y ${formatChartNumber(node.y)} ${params.coordinate_units}.`;
        },
      }}
    >
      <rect
        data-mark="spatial-boundary"
        data-edge-wrap={params.edge_wrap ? 'true' : 'false'}
        x={boundaryLeft}
        y={boundaryTop}
        width={boundaryRight - boundaryLeft}
        height={boundaryBottom - boundaryTop}
        fill="none"
        stroke={args.palette.amber}
        strokeWidth={1.25}
        strokeDasharray={params.edge_wrap ? '5 3' : undefined}
        vectorEffect="non-scaling-stroke"
      />
      <path
        data-mark="spatial-nodes"
        data-source-node-count={params.nodes.length}
        data-rendered-node-count={params.nodes.length}
        data-marker-size={params.marker_size}
        data-jitter="none"
        d={nodePath}
        fill={args.palette.cyan}
      />
      <g aria-hidden="true" data-mark="spatial-node-labels">
        {labels.map((nodeIndex) => {
          const node = params.nodes[nodeIndex];
          return (
            <text
              key={node.id}
              x={chartX(node.x, domains.xDomain, frame) + 5}
              y={chartY(node.y, domains.yDomain, frame) - 5}
              fill={colors.foreground}
              fontSize={9}
            >
              {node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label}
            </text>
          );
        })}
      </g>
    </ChartShell>
  );
}

function UnsupportedReferenceChart({ skill, scene }: Pick<RenderSceneArgs, 'skill' | 'scene'>) {
  return (
    <div role="alert" className="cortexel-reference-chart-unsupported">
      Cortexel has no canonical SVG chart for skill “{skill ?? '(missing skill)'}”
      {' '}on scene “{scene}”. Use that skill&apos;s native scene or checked host renderer.
    </div>
  );
}

export function ReferenceChartScene(args: ReferenceChartSceneProps) {
  const reactId = useId();
  const id = `cortexel-chart-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const width = normalizeChartDimension(
    args.width,
    REFERENCE_CHART_DIMENSIONS.width,
    REFERENCE_CHART_DIMENSIONS.minWidth,
  );
  const height = normalizeChartDimension(
    args.height,
    REFERENCE_CHART_DIMENSIONS.height,
    REFERENCE_CHART_DIMENSIONS.minHeight,
  );
  switch (args.skill) {
    case 'nest.voltage_trace':
      return TraceChart(args, width, height, id);
    case 'nest.astrocyte_dynamics':
      return AstrocyteChart(args, width, height, id);
    case 'nest.spike_raster':
      return SpikeRasterChart(args, width, height, id);
    case 'nest.population_rate':
      return PopulationRateChart(args, width, height, id);
    case 'nest.rate_response':
      return RateResponseChart(args, width, height, id);
    case 'nest.isi_distribution':
      return IsiChart(args, width, height, id);
    case 'nest.psth':
      return PsthChart(args, width, height, id);
    case 'nest.correlogram':
      return CorrelogramChart(args, width, height, id);
    case 'nest.weight_histogram':
      return WeightHistogramChart(args, width, height, id);
    case 'nest.plasticity_dynamics':
      return PlasticityChart(args, width, height, id);
    case 'nest.phase_plane':
      return PhasePlaneChart(args, width, height, id);
    case 'nest.connection_graph':
      return ConnectionGraphChart(args, width, height, id);
    case 'nest.adjacency_matrix':
    case 'nest.weight_matrix':
    case 'nest.delay_matrix':
      return MatrixChart(args, width, height, id);
    case 'nest.in_degree_distribution':
    case 'nest.out_degree_distribution':
      return DegreeDistributionChart(args, width, height, id);
    case 'nest.delay_distribution':
      return DelayDistributionChart(args, width, height, id);
    case 'nest.spatial_map_2d':
      return SpatialMap2DChart(args, width, height, id);
    default:
      return <UnsupportedReferenceChart skill={args.skill} scene={args.scene} />;
  }
}
