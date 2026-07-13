import * as react from 'react';
import { R as RenderSceneArgs } from '../VizSpecRenderer-C5B3r0tZ.js';
import { R as ReadonlySemanticPalette } from '../colormaps-CZ6XejJa.js';
import { a as SkillInvocationError } from '../hostInvocation-B4xa-O3Q.js';
import 'zod';

interface ChartDomain {
    min: number;
    max: number;
}
interface ChartFrame {
    width: number;
    height: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
}
interface PhasePlaneSample {
    x: number;
    y: number;
    dx: number;
    dy: number;
    index: number;
}
interface BoundedChartPath {
    path: string;
    sourceSampleCount: number;
    renderedSampleCount: number;
    compacted: boolean;
}
interface BoundedStemPointPaths {
    stems: string;
    points: string;
    sourceSampleCount: number;
    renderedSampleCount: number;
    compacted: boolean;
}
declare const REFERENCE_CHART_DIMENSIONS: Readonly<{
    width: 960;
    height: 540;
    minWidth: 320;
    minHeight: 240;
    maxDimension: 4096;
}>;
declare function normalizeChartDimension(value: number | undefined, fallback: number, minimum: number): number;
declare function chartPlotWidth(frame: ChartFrame): number;
declare function chartPlotHeight(frame: ChartFrame): number;
declare function numericDomain(values: readonly number[], options?: {
    includeZero?: boolean;
}): ChartDomain;
declare function nestedNumericDomain(series: readonly (readonly number[])[], options?: {
    includeZero?: boolean;
}): ChartDomain;
declare function histogramDomain(centers: readonly number[], width: number): ChartDomain;
declare function scaleToRange(value: number, domain: ChartDomain, start: number, end: number): number;
declare function chartX(value: number, domain: ChartDomain, frame: ChartFrame): number;
declare function chartY(value: number, domain: ChartDomain, frame: ChartFrame): number;
declare function linePath(xs: readonly number[], ys: readonly number[], xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame): string;
declare function sortedLinePath(xs: readonly number[], ys: readonly number[], xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame): string;
declare function pointPath(xs: readonly number[], ys: readonly number[], xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame, radius?: number): string;
/** Select a bounded, order-preserving view of a long numeric series. The first
 * and last samples are retained and every interior bucket contributes its exact
 * minimum and maximum in source order. This makes visual compaction explicit
 * without averaging, smoothing, or inventing intermediate measurements. */
declare function boundedExtremaIndices(values: readonly number[], maximumSamples: number): number[];
/** Literal binned-rate geometry. Adjacent retained bins are connected only with
 * horizontal/vertical step commands. When a large source series is compacted,
 * non-adjacent retained extrema start new subpaths, so the renderer never claims
 * that one retained value persisted through omitted bins. */
declare function binnedStepPath(centers: readonly number[], values: readonly number[], binWidth: number, xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame, maximumSamples?: number): BoundedChartPath;
/** One literal stem per binned statistic, anchored at the true zero baseline.
 * Values are never connected, interpolated, mirrored, or made symmetric. */
declare function stemPath(xs: readonly number[], ys: readonly number[], xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame): string;
/** Bounded correlogram marks. Long inputs retain exact first/last and bucket
 * extrema in source order; every retained value remains an independent
 * zero-anchored stem and point, so omitted bins cannot be bridged or mirrored. */
declare function boundedStemPointPaths(xs: readonly number[], ys: readonly number[], xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame, maximumSamples?: number, radius?: number): BoundedStemPointPaths;
declare function rasterTickPath(times: readonly number[], senders: readonly number[], xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame, halfHeight?: number): string;
declare function histogramBarPath(centers: readonly number[], values: readonly number[], binWidth: number, xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame): string;
declare function phasePlaneSamples(axisOrder: readonly [string, string], grid: Readonly<Record<string, readonly number[]>>, derivatives: Readonly<Record<string, readonly number[]>>): PhasePlaneSample[];
declare function phasePlaneArrowPath(samples: readonly PhasePlaneSample[], xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame): string;
declare function tickValues(domain: ChartDomain, count?: number): number[];
declare function formatChartNumber(value: number): string;

declare const MATRIX_VALUE_LEVELS_PER_SIGN = 8;
interface MatrixCellDatum {
    sourceIndex: number;
    targetIndex: number;
    value: number;
}
interface MatrixValueBucketPath {
    key: string;
    sign: -1 | 0 | 1;
    level: number;
    cellCount: number;
    path: string;
}
interface MatrixValueBucketPaths {
    buckets: MatrixValueBucketPath[];
    sourceCellCount: number;
    renderedCellCount: number;
    maximumAbsoluteValue: number;
    valueBucketCount: number;
}
/**
 * Preserve every sparse matrix cell as an exact axis-aligned rectangle while
 * grouping its paint into a fixed number of signed value paths. This bounds DOM
 * nodes without merging cells, smoothing values, or turning absence into zero.
 */
declare function matrixValueBucketPaths(cells: readonly MatrixCellDatum[], sourceCount: number, targetCount: number, frame: ChartFrame): MatrixValueBucketPaths;
type TopologyNodeId = string | number;
interface TopologyNodeDatum {
    id: TopologyNodeId;
}
interface TopologyEdgeDatum {
    source: TopologyNodeId;
    target: TopologyNodeId;
}
interface TopologyNodePosition {
    id: TopologyNodeId;
    x: number;
    y: number;
}
interface CircleTopologyGeometry {
    nodePath: string;
    edgePath: string;
    arrowPath: string;
    positions: TopologyNodePosition[];
    sourceNodeCount: number;
    renderedNodeCount: number;
    sourceEdgeCount: number;
    renderedEdgeCount: number;
    selfLoopCount: number;
    parallelEdgeCount: number;
}
/**
 * Deterministic, evidence-neutral circular topology layout. Every validated node
 * and edge receives geometry; multapses get stable lanes and autapses get nested
 * loops. The layout is schematic and its distances must never be presented as
 * measured coordinates.
 */
declare function circleTopologyGeometry(nodes: readonly TopologyNodeDatum[], edges: readonly TopologyEdgeDatum[], frame: ChartFrame, nodeRadius?: number): CircleTopologyGeometry;
interface AggregatedDegreeBin {
    minimumDegree: number;
    maximumDegree: number;
    center: number;
    width: number;
    rawNodeCount: number;
    value: number;
}
interface AggregatedDegreeBins {
    bins: AggregatedDegreeBin[];
    sourceBinCount: number;
    renderedBinCount: number;
    sourceNodeMass: number;
    renderedNodeMass: number;
    sourceValueMass: number;
    renderedValueMass: number;
    compacted: boolean;
}
/** Adjacent-bin compaction for a categorical degree distribution. Both raw node
 * counts and displayed count/probability mass are summed left-to-right; extrema
 * sampling would destroy the distribution and is deliberately never used. */
declare function aggregateDegreeBins(degrees: readonly number[], nodeCounts: readonly number[], values: readonly number[], maximumBins?: number): AggregatedDegreeBins;
interface AggregatedUniformHistogramBin {
    center: number;
    width: number;
    rawCount: number;
    value: number;
}
interface AggregatedUniformHistogramBins {
    bins: AggregatedUniformHistogramBin[];
    sourceBinCount: number;
    renderedBinCount: number;
    sourceRawCount: number;
    renderedRawCount: number;
    compacted: boolean;
}
/** Mass-preserving adjacent compaction for uniform delay bins. Probability
 * density is integrated before grouping and divided by the combined width. */
declare function aggregateUniformHistogramBins(centers: readonly number[], rawCounts: readonly number[], values: readonly number[], binWidth: number, normalization: string, maximumBins?: number): AggregatedUniformHistogramBins;
declare function variableHistogramPath(bins: readonly {
    center: number;
    width: number;
    value: number;
}[], xDomain: ChartDomain, yDomain: ChartDomain, frame: ChartFrame): string;
/** Pad one declared 2D extent only enough to match the physical SVG plot aspect.
 * chartX/chartY then use one common scale, so no coordinate is jittered or
 * stretched independently. */
declare function equalAspectDomains(extent: readonly [number, number], center: readonly [number, number], frame: ChartFrame): {
    xDomain: ChartDomain;
    yDomain: ChartDomain;
};

declare const REFERENCE_CHART_SKILLS: readonly ["nest.voltage_trace", "nest.astrocyte_dynamics", "nest.spike_raster", "nest.population_rate", "nest.rate_response", "nest.isi_distribution", "nest.psth", "nest.correlogram", "nest.weight_histogram", "nest.plasticity_dynamics", "nest.phase_plane", "nest.connection_graph", "nest.adjacency_matrix", "nest.weight_matrix", "nest.delay_matrix", "nest.in_degree_distribution", "nest.out_degree_distribution", "nest.delay_distribution", "nest.spatial_map_2d"];
type ReferenceChartSkill = (typeof REFERENCE_CHART_SKILLS)[number];
interface ReferenceChartSceneProps extends RenderSceneArgs {
    width?: number;
    height?: number;
}
declare function ReferenceChartScene(args: ReferenceChartSceneProps): react.JSX.Element;

interface ReferenceVizSpecFigureProps {
    /** Untrusted agent payload. It is always routed through VizSpecRenderer's
     * strict skill-aware gate; this wrapper has no trusted-envelope escape hatch. */
    spec: unknown;
    skillId?: string;
    active?: boolean;
    activePalette?: ReadonlySemanticPalette;
    width?: number;
    height?: number;
    onError?: (errors: string[]) => void;
    onInvocationError?: (errors: readonly SkillInvocationError[]) => void;
}
/** Strict agent-spec -> canonical SVG chart path. VizSpecRenderer remains the
 * owner of validation and the mandatory honesty caption; ReferenceChartScene
 * sees only its detached, checked params/provenance snapshot. */
declare function ReferenceVizSpecFigure({ spec, skillId, active, activePalette, width, height, onError, onInvocationError, }: ReferenceVizSpecFigureProps): react.JSX.Element;

export { type AggregatedDegreeBin, type AggregatedDegreeBins, type AggregatedUniformHistogramBin, type AggregatedUniformHistogramBins, type BoundedChartPath, type BoundedStemPointPaths, type ChartDomain, type ChartFrame, type CircleTopologyGeometry, MATRIX_VALUE_LEVELS_PER_SIGN, type MatrixCellDatum, type MatrixValueBucketPath, type MatrixValueBucketPaths, type PhasePlaneSample, REFERENCE_CHART_DIMENSIONS, REFERENCE_CHART_SKILLS, ReferenceChartScene, type ReferenceChartSceneProps, type ReferenceChartSkill, ReferenceVizSpecFigure, type ReferenceVizSpecFigureProps, type TopologyEdgeDatum, type TopologyNodeDatum, type TopologyNodeId, type TopologyNodePosition, aggregateDegreeBins, aggregateUniformHistogramBins, binnedStepPath, boundedExtremaIndices, boundedStemPointPaths, chartPlotHeight, chartPlotWidth, chartX, chartY, circleTopologyGeometry, equalAspectDomains, formatChartNumber, histogramBarPath, histogramDomain, linePath, matrixValueBucketPaths, nestedNumericDomain, normalizeChartDimension, numericDomain, phasePlaneArrowPath, phasePlaneSamples, pointPath, rasterTickPath, scaleToRange, sortedLinePath, stemPath, tickValues, variableHistogramPath };
