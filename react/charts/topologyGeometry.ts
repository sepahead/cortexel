import {
  chartPlotHeight,
  chartPlotWidth,
  chartX,
  chartY,
  type ChartDomain,
  type ChartFrame,
} from './chartGeometry';

function svgNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 1_000) / 1_000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function rectanglePath(x: number, y: number, width: number, height: number): string {
  return `M${svgNumber(x)} ${svgNumber(y)}H${svgNumber(x + width)}V${
    svgNumber(y + height)
  }H${svgNumber(x)}Z`;
}

export const MATRIX_VALUE_LEVELS_PER_SIGN = 8;

export interface MatrixCellDatum {
  sourceIndex: number;
  targetIndex: number;
  value: number;
}

export interface MatrixValueBucketPath {
  key: string;
  sign: -1 | 0 | 1;
  level: number;
  cellCount: number;
  path: string;
}

export interface MatrixValueBucketPaths {
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
export function matrixValueBucketPaths(
  cells: readonly MatrixCellDatum[],
  sourceCount: number,
  targetCount: number,
  frame: ChartFrame,
): MatrixValueBucketPaths {
  let maximumAbsoluteValue = 0;
  for (let index = 0; index < cells.length; index++) {
    maximumAbsoluteValue = Math.max(maximumAbsoluteValue, Math.abs(cells[index].value));
  }
  const columns = Math.max(1, Math.floor(sourceCount));
  const rows = Math.max(1, Math.floor(targetCount));
  const width = chartPlotWidth(frame) / columns;
  const height = chartPlotHeight(frame) / rows;
  const paths = new Map<string, {
    sign: -1 | 0 | 1;
    level: number;
    cellCount: number;
    path: string;
  }>();

  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index];
    const sign: -1 | 0 | 1 = cell.value < 0 ? -1 : cell.value > 0 ? 1 : 0;
    const level = sign === 0 || maximumAbsoluteValue === 0
      ? 0
      : Math.max(
          1,
          Math.min(
            MATRIX_VALUE_LEVELS_PER_SIGN,
            Math.ceil(
              Math.abs(cell.value) / maximumAbsoluteValue * MATRIX_VALUE_LEVELS_PER_SIGN,
            ),
          ),
        );
    const key = sign === 0 ? 'zero' : `${sign < 0 ? 'negative' : 'positive'}-${level}`;
    const current = paths.get(key) ?? { sign, level, cellCount: 0, path: '' };
    const x = frame.left + cell.sourceIndex * width;
    const y = frame.top + cell.targetIndex * height;
    current.path += rectanglePath(x, y, width, height);
    current.cellCount += 1;
    paths.set(key, current);
  }

  const buckets = [...paths.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((left, right) => left.sign - right.sign || left.level - right.level);
  return {
    buckets,
    sourceCellCount: cells.length,
    renderedCellCount: cells.length,
    maximumAbsoluteValue,
    valueBucketCount: buckets.length,
  };
}

export type TopologyNodeId = string | number;

export interface TopologyNodeDatum {
  id: TopologyNodeId;
}

export interface TopologyEdgeDatum {
  source: TopologyNodeId;
  target: TopologyNodeId;
}

export interface TopologyNodePosition {
  id: TopologyNodeId;
  x: number;
  y: number;
}

export interface CircleTopologyGeometry {
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

function nodeKey(id: TopologyNodeId): string {
  return `${typeof id}:${String(id)}`;
}

function canonicalPairKey(source: TopologyNodeId, target: TopologyNodeId): string {
  const sourceKey = nodeKey(source);
  const targetKey = nodeKey(target);
  return sourceKey <= targetKey
    ? JSON.stringify([sourceKey, targetKey])
    : JSON.stringify([targetKey, sourceKey]);
}

function quadraticPoint(
  start: TopologyNodePosition,
  controlX: number,
  controlY: number,
  end: TopologyNodePosition,
  t: number,
): readonly [number, number] {
  const inverse = 1 - t;
  return [
    inverse * inverse * start.x + 2 * inverse * t * controlX + t * t * end.x,
    inverse * inverse * start.y + 2 * inverse * t * controlY + t * t * end.y,
  ];
}

function arrowTriangle(
  tipX: number,
  tipY: number,
  directionX: number,
  directionY: number,
  length: number,
  width: number,
): string {
  const magnitude = Math.hypot(directionX, directionY);
  if (!(magnitude > 0)) return '';
  const ux = directionX / magnitude;
  const uy = directionY / magnitude;
  const baseX = tipX - ux * length;
  const baseY = tipY - uy * length;
  const px = -uy * width;
  const py = ux * width;
  return `M${svgNumber(tipX)} ${svgNumber(tipY)}L${svgNumber(baseX + px)} ${
    svgNumber(baseY + py)
  }L${svgNumber(baseX - px)} ${svgNumber(baseY - py)}Z`;
}

/**
 * Deterministic, evidence-neutral circular topology layout. Every validated node
 * and edge receives geometry; multapses get stable lanes and autapses get nested
 * loops. The layout is schematic and its distances must never be presented as
 * measured coordinates.
 */
export function circleTopologyGeometry(
  nodes: readonly TopologyNodeDatum[],
  edges: readonly TopologyEdgeDatum[],
  frame: ChartFrame,
  nodeRadius = 4,
): CircleTopologyGeometry {
  const centerX = frame.left + chartPlotWidth(frame) / 2;
  const centerY = frame.top + chartPlotHeight(frame) / 2;
  const layoutRadius = nodes.length <= 1
    ? 0
    : Math.max(18, Math.min(chartPlotWidth(frame), chartPlotHeight(frame)) * 0.36);
  const positions = new Array<TopologyNodePosition>(nodes.length);
  const byId = new Map<string, TopologyNodePosition>();
  let nodePath = '';
  for (let index = 0; index < nodes.length; index++) {
    const angle = -Math.PI / 2 + index / Math.max(1, nodes.length) * Math.PI * 2;
    const position = {
      id: nodes[index].id,
      x: centerX + Math.cos(angle) * layoutRadius,
      y: centerY + Math.sin(angle) * layoutRadius,
    };
    positions[index] = position;
    byId.set(nodeKey(position.id), position);
    nodePath += `M${svgNumber(position.x - nodeRadius)} ${svgNumber(position.y)}a${
      svgNumber(nodeRadius)
    } ${svgNumber(nodeRadius)} 0 1 0 ${svgNumber(nodeRadius * 2)} 0a${
      svgNumber(nodeRadius)
    } ${svgNumber(nodeRadius)} 0 1 0 ${svgNumber(-nodeRadius * 2)} 0`;
  }

  const pairGroups = new Map<string, number[]>();
  for (let index = 0; index < edges.length; index++) {
    const key = canonicalPairKey(edges[index].source, edges[index].target);
    const group = pairGroups.get(key);
    if (group) group.push(index);
    else pairGroups.set(key, [index]);
  }
  const laneByEdge = new Array<number>(edges.length).fill(0);
  const rankByEdge = new Array<number>(edges.length).fill(0);
  let parallelEdgeCount = 0;
  for (const group of pairGroups.values()) {
    const center = (group.length - 1) / 2;
    if (group.length > 1) parallelEdgeCount += group.length;
    for (let rank = 0; rank < group.length; rank++) {
      laneByEdge[group[rank]] = rank - center;
      rankByEdge[group[rank]] = rank;
    }
  }

  let edgePath = '';
  let arrowPath = '';
  let selfLoopCount = 0;
  let renderedEdgeCount = 0;
  const laneSpacing = Math.max(5, nodeRadius * 1.5);
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index];
    const source = byId.get(nodeKey(edge.source));
    const target = byId.get(nodeKey(edge.target));
    if (!source || !target) continue;
    renderedEdgeCount += 1;
    const lane = laneByEdge[index];
    if (nodeKey(edge.source) === nodeKey(edge.target)) {
      selfLoopCount += 1;
      const loopRadius = nodeRadius * (2.4 + Math.log1p(rankByEdge[index]) * 1.2);
      const startX = source.x + nodeRadius * 0.65;
      const startY = source.y - nodeRadius * 0.75;
      const endX = source.x - nodeRadius * 0.65;
      const endY = source.y - nodeRadius * 0.75;
      edgePath += `M${svgNumber(startX)} ${svgNumber(startY)}C${svgNumber(
        source.x + loopRadius,
      )} ${svgNumber(source.y - loopRadius * 1.7)} ${svgNumber(
        source.x - loopRadius,
      )} ${svgNumber(source.y - loopRadius * 1.7)} ${svgNumber(endX)} ${svgNumber(endY)}`;
      arrowPath += arrowTriangle(
        endX,
        endY,
        -1,
        0.45,
        Math.max(4, nodeRadius * 1.1),
        Math.max(2, nodeRadius * 0.55),
      );
      continue;
    }

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy);
    if (!(distance > 0)) continue;
    const ux = dx / distance;
    const uy = dy / distance;
    const start = {
      id: source.id,
      x: source.x + ux * nodeRadius * 1.25,
      y: source.y + uy * nodeRadius * 1.25,
    };
    const end = {
      id: target.id,
      x: target.x - ux * nodeRadius * 1.9,
      y: target.y - uy * nodeRadius * 1.9,
    };
    // Lane ranks belong to the canonical unordered endpoint pair. A reverse
    // edge also reverses its local perpendicular, so flip its lane before
    // applying that perpendicular. The resulting physical offsets remain in
    // canonical rank order instead of making reciprocal edges coincide.
    const canonicalLane = nodeKey(edge.source) <= nodeKey(edge.target) ? lane : -lane;
    const boundedLane = Math.sign(canonicalLane)
      * Math.log1p(Math.abs(canonicalLane))
      * laneSpacing;
    const controlX = (start.x + end.x) / 2 - uy * boundedLane;
    const controlY = (start.y + end.y) / 2 + ux * boundedLane;
    edgePath += `M${svgNumber(start.x)} ${svgNumber(start.y)}Q${svgNumber(controlX)} ${
      svgNumber(controlY)
    } ${svgNumber(end.x)} ${svgNumber(end.y)}`;
    const [arrowX, arrowY] = quadraticPoint(start, controlX, controlY, end, 0.94);
    const tangentX = 2 * (1 - 0.94) * (controlX - start.x) + 2 * 0.94 * (end.x - controlX);
    const tangentY = 2 * (1 - 0.94) * (controlY - start.y) + 2 * 0.94 * (end.y - controlY);
    arrowPath += arrowTriangle(
      arrowX,
      arrowY,
      tangentX,
      tangentY,
      Math.max(4, nodeRadius * 1.1),
      Math.max(2, nodeRadius * 0.55),
    );
  }

  return {
    nodePath,
    edgePath,
    arrowPath,
    positions,
    sourceNodeCount: nodes.length,
    renderedNodeCount: nodes.length,
    sourceEdgeCount: edges.length,
    renderedEdgeCount,
    selfLoopCount,
    parallelEdgeCount,
  };
}

export interface AggregatedDegreeBin {
  minimumDegree: number;
  maximumDegree: number;
  center: number;
  width: number;
  rawNodeCount: number;
  value: number;
}

export interface AggregatedDegreeBins {
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
export function aggregateDegreeBins(
  degrees: readonly number[],
  nodeCounts: readonly number[],
  values: readonly number[],
  maximumBins = 512,
): AggregatedDegreeBins {
  const count = Math.min(degrees.length, nodeCounts.length, values.length);
  const limit = Number.isFinite(maximumBins)
    ? Math.max(1, Math.floor(maximumBins))
    : 1;
  const groupSize = Math.max(1, Math.ceil(count / limit));
  const bins: AggregatedDegreeBin[] = [];
  let sourceNodeMass = 0;
  let sourceValueMass = 0;
  for (let start = 0; start < count; start += groupSize) {
    const stop = Math.min(count, start + groupSize);
    let rawNodeCount = 0;
    let value = 0;
    for (let index = start; index < stop; index++) {
      rawNodeCount += nodeCounts[index];
      value += values[index];
      sourceNodeMass += nodeCounts[index];
      sourceValueMass += values[index];
    }
    const minimumDegree = degrees[start];
    const maximumDegree = degrees[stop - 1];
    const left = minimumDegree - 0.5;
    const right = maximumDegree + 0.5;
    bins.push({
      minimumDegree,
      maximumDegree,
      center: (left + right) / 2,
      width: right - left,
      rawNodeCount,
      value,
    });
  }
  let renderedNodeMass = 0;
  let renderedValueMass = 0;
  for (let index = 0; index < bins.length; index++) {
    renderedNodeMass += bins[index].rawNodeCount;
    renderedValueMass += bins[index].value;
  }
  return {
    bins,
    sourceBinCount: count,
    renderedBinCount: bins.length,
    sourceNodeMass,
    renderedNodeMass,
    sourceValueMass,
    renderedValueMass,
    compacted: bins.length < count,
  };
}

export interface AggregatedUniformHistogramBin {
  center: number;
  width: number;
  rawCount: number;
  value: number;
}

export interface AggregatedUniformHistogramBins {
  bins: AggregatedUniformHistogramBin[];
  sourceBinCount: number;
  renderedBinCount: number;
  sourceRawCount: number;
  renderedRawCount: number;
  compacted: boolean;
}

/** Mass-preserving adjacent compaction for uniform delay bins. Probability
 * density is integrated before grouping and divided by the combined width. */
export function aggregateUniformHistogramBins(
  centers: readonly number[],
  rawCounts: readonly number[],
  values: readonly number[],
  binWidth: number,
  normalization: string,
  maximumBins = 4_096,
): AggregatedUniformHistogramBins {
  const count = Math.min(centers.length, rawCounts.length, values.length);
  const limit = Number.isFinite(maximumBins)
    ? Math.max(1, Math.floor(maximumBins))
    : 1;
  const groupSize = Math.max(1, Math.ceil(count / limit));
  const bins: AggregatedUniformHistogramBin[] = [];
  let sourceRawCount = 0;
  for (let start = 0; start < count; start += groupSize) {
    const stop = Math.min(count, start + groupSize);
    let rawCount = 0;
    let mass = 0;
    for (let index = start; index < stop; index++) {
      rawCount += rawCounts[index];
      mass += normalization === 'probability_density'
        ? values[index] * binWidth
        : values[index];
      sourceRawCount += rawCounts[index];
    }
    const left = centers[start] - binWidth / 2;
    const right = centers[stop - 1] + binWidth / 2;
    const width = right - left;
    bins.push({
      center: (left + right) / 2,
      width,
      rawCount,
      value: normalization === 'probability_density' ? mass / width : mass,
    });
  }
  let renderedRawCount = 0;
  for (let index = 0; index < bins.length; index++) renderedRawCount += bins[index].rawCount;
  return {
    bins,
    sourceBinCount: count,
    renderedBinCount: bins.length,
    sourceRawCount,
    renderedRawCount,
    compacted: bins.length < count,
  };
}

export function variableHistogramPath(
  bins: readonly { center: number; width: number; value: number }[],
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
): string {
  const baseline = chartY(0, yDomain, frame);
  let path = '';
  for (let index = 0; index < bins.length; index++) {
    const bin = bins[index];
    const left = chartX(bin.center - bin.width / 2, xDomain, frame);
    const right = chartX(bin.center + bin.width / 2, xDomain, frame);
    const top = chartY(bin.value, yDomain, frame);
    path += rectanglePath(left, top, right - left, baseline - top);
  }
  return path;
}

/** Pad one declared 2D extent only enough to match the physical SVG plot aspect.
 * chartX/chartY then use one common scale, so no coordinate is jittered or
 * stretched independently. */
export function equalAspectDomains(
  extent: readonly [number, number],
  center: readonly [number, number],
  frame: ChartFrame,
): { xDomain: ChartDomain; yDomain: ChartDomain } {
  const width = extent[0];
  const height = extent[1];
  const plotAspect = chartPlotWidth(frame) / chartPlotHeight(frame);
  const dataAspect = width / height;
  let visibleWidth = width;
  let visibleHeight = height;
  if (dataAspect < plotAspect) visibleWidth = height * plotAspect;
  else if (dataAspect > plotAspect) visibleHeight = width / plotAspect;
  return {
    xDomain: {
      min: center[0] - visibleWidth / 2,
      max: center[0] + visibleWidth / 2,
    },
    yDomain: {
      min: center[1] - visibleHeight / 2,
      max: center[1] + visibleHeight / 2,
    },
  };
}
