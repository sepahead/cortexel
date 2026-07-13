import {
  VizSpecRenderer
} from "../chunk-22ASKDTA.js";
import "../chunk-DXRNJDB7.js";
import {
  safeDiagnosticText
} from "../chunk-X23XMWZH.js";

// react/charts/chartGeometry.ts
var REFERENCE_CHART_DIMENSIONS = Object.freeze({
  width: 960,
  height: 540,
  minWidth: 320,
  minHeight: 240,
  maxDimension: 4096
});
function normalizeChartDimension(value, fallback, minimum) {
  if (!Number.isFinite(value) || value === void 0) return fallback;
  return Math.min(
    REFERENCE_CHART_DIMENSIONS.maxDimension,
    Math.max(minimum, Math.round(value))
  );
}
function chartPlotWidth(frame) {
  return Math.max(1, frame.width - frame.left - frame.right);
}
function chartPlotHeight(frame) {
  return Math.max(1, frame.height - frame.top - frame.bottom);
}
function paddedSingleton(value) {
  if (value === 0) return { min: -1, max: 1 };
  const padding = Math.abs(value) * 0.05;
  const min = value - padding;
  const max = value + padding;
  if (Number.isFinite(min) && Number.isFinite(max) && min < max) {
    return { min, max };
  }
  return value > 0 ? { min: 0, max: value } : { min: value, max: 0 };
}
function numericDomain(values, options = {}) {
  let min = options.includeZero ? 0 : Number.POSITIVE_INFINITY;
  let max = options.includeZero ? 0 : Number.NEGATIVE_INFINITY;
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  if (min === max) {
    if (options.includeZero && min === 0) return { min: 0, max: 1 };
    return paddedSingleton(min);
  }
  return { min, max };
}
function nestedNumericDomain(series, options = {}) {
  let min = options.includeZero ? 0 : Number.POSITIVE_INFINITY;
  let max = options.includeZero ? 0 : Number.NEGATIVE_INFINITY;
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const values = series[seriesIndex];
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  if (min === max) {
    if (options.includeZero && min === 0) return { min: 0, max: 1 };
    return paddedSingleton(min);
  }
  return { min, max };
}
function histogramDomain(centers, width) {
  if (centers.length === 0 || !Number.isFinite(width) || width <= 0) {
    return { min: 0, max: 1 };
  }
  const halfWidth = width / 2;
  const first = centers[0] - halfWidth;
  const last = centers[centers.length - 1] + halfWidth;
  if (Number.isFinite(first) && Number.isFinite(last) && first < last) {
    return { min: first, max: last };
  }
  return numericDomain(centers);
}
function unitRatio(value, domain) {
  if (!Number.isFinite(value)) return 0.5;
  const scale = Math.max(Math.abs(domain.min), Math.abs(domain.max), 1);
  const min = domain.min / scale;
  const max = domain.max / scale;
  const scaledValue = value / scale;
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return 0.5;
  const ratio = (scaledValue - min) / span;
  if (!Number.isFinite(ratio)) return 0.5;
  return Math.min(1, Math.max(0, ratio));
}
function scaleToRange(value, domain, start, end) {
  return start + (end - start) * unitRatio(value, domain);
}
function chartX(value, domain, frame) {
  return scaleToRange(value, domain, frame.left, frame.width - frame.right);
}
function chartY(value, domain, frame) {
  return scaleToRange(value, domain, frame.height - frame.bottom, frame.top);
}
function svgNumber(value) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 1e3) / 1e3;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}
function linePath(xs, ys, xDomain, yDomain, frame) {
  const count = Math.min(xs.length, ys.length);
  let path = "";
  for (let index = 0; index < count; index++) {
    const x = chartX(xs[index], xDomain, frame);
    const y = chartY(ys[index], yDomain, frame);
    path += `${index === 0 ? "M" : "L"}${svgNumber(x)} ${svgNumber(y)}`;
  }
  return path;
}
function sortedLinePath(xs, ys, xDomain, yDomain, frame) {
  const pairs = new Array(
    Math.min(xs.length, ys.length)
  );
  for (let index = 0; index < pairs.length; index++) {
    pairs[index] = { x: xs[index], y: ys[index], order: index };
  }
  pairs.sort((left, right) => left.x - right.x || left.order - right.order);
  let path = "";
  for (let index = 0; index < pairs.length; index++) {
    const x = chartX(pairs[index].x, xDomain, frame);
    const y = chartY(pairs[index].y, yDomain, frame);
    path += `${index === 0 ? "M" : "L"}${svgNumber(x)} ${svgNumber(y)}`;
  }
  return path;
}
function pointPath(xs, ys, xDomain, yDomain, frame, radius = 3) {
  const count = Math.min(xs.length, ys.length);
  let path = "";
  for (let index = 0; index < count; index++) {
    const x = chartX(xs[index], xDomain, frame);
    const y = chartY(ys[index], yDomain, frame);
    path += `M${svgNumber(x - radius)} ${svgNumber(y)}a${radius} ${radius} 0 1 0 ${svgNumber(radius * 2)} 0a${radius} ${radius} 0 1 0 ${svgNumber(-radius * 2)} 0`;
  }
  return path;
}
function boundedExtremaIndices(values, maximumSamples) {
  const count = values.length;
  if (count === 0) return [];
  const maximum = Number.isFinite(maximumSamples) ? Math.max(2, Math.floor(maximumSamples)) : 2;
  if (count <= maximum) return Array.from({ length: count }, (_, index) => index);
  if (maximum === 2) return [0, count - 1];
  if (maximum === 3) {
    let extreme = 1;
    for (let index = 2; index < count - 1; index++) {
      if (Math.abs(values[index]) > Math.abs(values[extreme])) extreme = index;
    }
    return [0, extreme, count - 1];
  }
  const bucketCount = Math.max(1, Math.floor((maximum - 2) / 2));
  const interiorCount = count - 2;
  const indices = [0];
  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const start = 1 + Math.floor(bucket * interiorCount / bucketCount);
    const stop = 1 + Math.floor((bucket + 1) * interiorCount / bucketCount);
    if (start >= stop) continue;
    let minimumIndex = start;
    let maximumIndex = start;
    for (let index = start + 1; index < stop; index++) {
      if (values[index] < values[minimumIndex]) minimumIndex = index;
      if (values[index] > values[maximumIndex]) maximumIndex = index;
    }
    if (minimumIndex <= maximumIndex) {
      indices.push(minimumIndex);
      if (maximumIndex !== minimumIndex) indices.push(maximumIndex);
    } else {
      indices.push(maximumIndex, minimumIndex);
    }
  }
  indices.push(count - 1);
  return indices;
}
function binnedStepPath(centers, values, binWidth, xDomain, yDomain, frame, maximumSamples = 4096) {
  const sourceSampleCount = Math.min(centers.length, values.length);
  if (sourceSampleCount === 0) {
    return { path: "", sourceSampleCount, renderedSampleCount: 0, compacted: false };
  }
  const indices = boundedExtremaIndices(
    values.slice(0, sourceSampleCount),
    maximumSamples
  );
  const compacted = indices.length < sourceSampleCount;
  let path = "";
  let previousIndex = -2;
  for (let outputIndex = 0; outputIndex < indices.length; outputIndex++) {
    const index = indices[outputIndex];
    const left = chartX(centers[index] - binWidth / 2, xDomain, frame);
    const right = chartX(centers[index] + binWidth / 2, xDomain, frame);
    const y = chartY(values[index], yDomain, frame);
    if (index === previousIndex + 1) {
      path += `V${svgNumber(y)}H${svgNumber(right)}`;
    } else {
      path += `M${svgNumber(left)} ${svgNumber(y)}H${svgNumber(right)}`;
    }
    previousIndex = index;
  }
  return {
    path,
    sourceSampleCount,
    renderedSampleCount: indices.length,
    compacted
  };
}
function stemPath(xs, ys, xDomain, yDomain, frame) {
  const count = Math.min(xs.length, ys.length);
  const baseline = chartY(0, yDomain, frame);
  let path = "";
  for (let index = 0; index < count; index++) {
    const x = chartX(xs[index], xDomain, frame);
    const y = chartY(ys[index], yDomain, frame);
    path += `M${svgNumber(x)} ${svgNumber(baseline)}V${svgNumber(y)}`;
  }
  return path;
}
function boundedStemPointPaths(xs, ys, xDomain, yDomain, frame, maximumSamples = 4096, radius = 2.75) {
  const sourceSampleCount = Math.min(xs.length, ys.length);
  if (sourceSampleCount === 0) {
    return {
      stems: "",
      points: "",
      sourceSampleCount,
      renderedSampleCount: 0,
      compacted: false
    };
  }
  const indices = boundedExtremaIndices(ys.slice(0, sourceSampleCount), maximumSamples);
  const baseline = chartY(0, yDomain, frame);
  let stems = "";
  let points = "";
  for (let outputIndex = 0; outputIndex < indices.length; outputIndex++) {
    const index = indices[outputIndex];
    const x = chartX(xs[index], xDomain, frame);
    const y = chartY(ys[index], yDomain, frame);
    stems += `M${svgNumber(x)} ${svgNumber(baseline)}V${svgNumber(y)}`;
    points += `M${svgNumber(x - radius)} ${svgNumber(y)}a${radius} ${radius} 0 1 0 ${svgNumber(radius * 2)} 0a${radius} ${radius} 0 1 0 ${svgNumber(-radius * 2)} 0`;
  }
  return {
    stems,
    points,
    sourceSampleCount,
    renderedSampleCount: indices.length,
    compacted: indices.length < sourceSampleCount
  };
}
function rasterTickPath(times, senders, xDomain, yDomain, frame, halfHeight = 3) {
  const count = Math.min(times.length, senders.length);
  let path = "";
  for (let index = 0; index < count; index++) {
    const x = chartX(times[index], xDomain, frame);
    const y = chartY(senders[index], yDomain, frame);
    path += `M${svgNumber(x)} ${svgNumber(y - halfHeight)}V${svgNumber(y + halfHeight)}`;
  }
  return path;
}
function histogramBarPath(centers, values, binWidth, xDomain, yDomain, frame) {
  const count = Math.min(centers.length, values.length);
  const baseline = chartY(0, yDomain, frame);
  let path = "";
  for (let index = 0; index < count; index++) {
    const left = chartX(centers[index] - binWidth / 2, xDomain, frame);
    const right = chartX(centers[index] + binWidth / 2, xDomain, frame);
    const top = chartY(values[index], yDomain, frame);
    path += `M${svgNumber(left)} ${svgNumber(baseline)}H${svgNumber(right)}V${svgNumber(top)}H${svgNumber(left)}Z`;
  }
  return path;
}
function phasePlaneSamples(axisOrder, grid, derivatives) {
  const [xAxis, yAxis] = axisOrder;
  const xs = grid[xAxis] ?? [];
  const ys = grid[yAxis] ?? [];
  const dx = derivatives[xAxis] ?? [];
  const dy = derivatives[yAxis] ?? [];
  const samples = new Array(xs.length * ys.length);
  let outputIndex = 0;
  for (let xIndex = 0; xIndex < xs.length; xIndex++) {
    for (let yIndex = 0; yIndex < ys.length; yIndex++) {
      const index = xIndex * ys.length + yIndex;
      samples[outputIndex++] = {
        x: xs[xIndex],
        y: ys[yIndex],
        dx: dx[index] ?? 0,
        dy: dy[index] ?? 0,
        index
      };
    }
  }
  return samples;
}
function normalizedDerivative(value, domain) {
  const spanScale = Math.max(Math.abs(domain.min), Math.abs(domain.max), 1);
  const span = domain.max / spanScale - domain.min / spanScale;
  if (!Number.isFinite(value) || !Number.isFinite(span) || span <= 0) return 0;
  return value / spanScale / span;
}
function phasePlaneArrowPath(samples, xDomain, yDomain, frame) {
  const maxLength = Math.max(
    4,
    Math.min(chartPlotWidth(frame), chartPlotHeight(frame)) / 24
  );
  let path = "";
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
    const vx = normalizedDerivative(sample.dx, xDomain);
    const vy = -normalizedDerivative(sample.dy, yDomain);
    const magnitude = Math.hypot(vx, vy);
    if (!Number.isFinite(magnitude) || magnitude <= 0) continue;
    const ux = vx / magnitude;
    const uy = vy / magnitude;
    const x = chartX(sample.x, xDomain, frame);
    const y = chartY(sample.y, yDomain, frame);
    const length = Math.min(maxLength, 5 + Math.log1p(magnitude) * 5);
    const half = length / 2;
    const startX = x - ux * half;
    const startY = y - uy * half;
    const endX = x + ux * half;
    const endY = y + uy * half;
    const wing = Math.min(4, length * 0.3);
    const backX = endX - ux * wing;
    const backY = endY - uy * wing;
    const perpendicularX = -uy * wing * 0.55;
    const perpendicularY = ux * wing * 0.55;
    path += `M${svgNumber(startX)} ${svgNumber(startY)}L${svgNumber(endX)} ${svgNumber(endY)}M${svgNumber(endX)} ${svgNumber(endY)}L${svgNumber(backX + perpendicularX)} ${svgNumber(backY + perpendicularY)}M${svgNumber(endX)} ${svgNumber(endY)}L${svgNumber(backX - perpendicularX)} ${svgNumber(backY - perpendicularY)}`;
  }
  return path;
}
function tickValues(domain, count = 5) {
  const safeCount = Math.max(2, Math.min(12, Math.floor(count)));
  const scale = Math.max(Math.abs(domain.min), Math.abs(domain.max), 1);
  const scaledMin = domain.min / scale;
  const scaledMax = domain.max / scale;
  const ticks = new Array(safeCount);
  for (let index = 0; index < safeCount; index++) {
    const ratio = index / (safeCount - 1);
    const value = (scaledMin * (1 - ratio) + scaledMax * ratio) * scale;
    ticks[index] = Object.is(value, -0) ? 0 : value;
  }
  return ticks;
}
function formatChartNumber(value) {
  if (!Number.isFinite(value)) return "\u2014";
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e4 || magnitude < 1e-3) return value.toExponential(2);
  if (magnitude >= 100) return value.toFixed(0);
  if (magnitude >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

// react/charts/topologyGeometry.ts
function svgNumber2(value) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 1e3) / 1e3;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}
function rectanglePath(x, y, width, height) {
  return `M${svgNumber2(x)} ${svgNumber2(y)}H${svgNumber2(x + width)}V${svgNumber2(y + height)}H${svgNumber2(x)}Z`;
}
var MATRIX_VALUE_LEVELS_PER_SIGN = 8;
function matrixValueBucketPaths(cells, sourceCount, targetCount, frame) {
  let maximumAbsoluteValue = 0;
  for (let index = 0; index < cells.length; index++) {
    maximumAbsoluteValue = Math.max(maximumAbsoluteValue, Math.abs(cells[index].value));
  }
  const columns = Math.max(1, Math.floor(sourceCount));
  const rows = Math.max(1, Math.floor(targetCount));
  const width = chartPlotWidth(frame) / columns;
  const height = chartPlotHeight(frame) / rows;
  const paths = /* @__PURE__ */ new Map();
  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index];
    const sign = cell.value < 0 ? -1 : cell.value > 0 ? 1 : 0;
    const level = sign === 0 || maximumAbsoluteValue === 0 ? 0 : Math.max(
      1,
      Math.min(
        MATRIX_VALUE_LEVELS_PER_SIGN,
        Math.ceil(
          Math.abs(cell.value) / maximumAbsoluteValue * MATRIX_VALUE_LEVELS_PER_SIGN
        )
      )
    );
    const key = sign === 0 ? "zero" : `${sign < 0 ? "negative" : "positive"}-${level}`;
    const current = paths.get(key) ?? { sign, level, cellCount: 0, path: "" };
    const x = frame.left + cell.sourceIndex * width;
    const y = frame.top + cell.targetIndex * height;
    current.path += rectanglePath(x, y, width, height);
    current.cellCount += 1;
    paths.set(key, current);
  }
  const buckets = [...paths.entries()].map(([key, value]) => ({ key, ...value })).sort((left, right) => left.sign - right.sign || left.level - right.level);
  return {
    buckets,
    sourceCellCount: cells.length,
    renderedCellCount: cells.length,
    maximumAbsoluteValue,
    valueBucketCount: buckets.length
  };
}
function nodeKey(id) {
  return `${typeof id}:${String(id)}`;
}
function canonicalPairKey(source, target) {
  const sourceKey = nodeKey(source);
  const targetKey = nodeKey(target);
  return sourceKey <= targetKey ? JSON.stringify([sourceKey, targetKey]) : JSON.stringify([targetKey, sourceKey]);
}
function quadraticPoint(start, controlX, controlY, end, t) {
  const inverse = 1 - t;
  return [
    inverse * inverse * start.x + 2 * inverse * t * controlX + t * t * end.x,
    inverse * inverse * start.y + 2 * inverse * t * controlY + t * t * end.y
  ];
}
function arrowTriangle(tipX, tipY, directionX, directionY, length, width) {
  const magnitude = Math.hypot(directionX, directionY);
  if (!(magnitude > 0)) return "";
  const ux = directionX / magnitude;
  const uy = directionY / magnitude;
  const baseX = tipX - ux * length;
  const baseY = tipY - uy * length;
  const px = -uy * width;
  const py = ux * width;
  return `M${svgNumber2(tipX)} ${svgNumber2(tipY)}L${svgNumber2(baseX + px)} ${svgNumber2(baseY + py)}L${svgNumber2(baseX - px)} ${svgNumber2(baseY - py)}Z`;
}
function circleTopologyGeometry(nodes, edges, frame, nodeRadius = 4) {
  const centerX = frame.left + chartPlotWidth(frame) / 2;
  const centerY = frame.top + chartPlotHeight(frame) / 2;
  const layoutRadius = nodes.length <= 1 ? 0 : Math.max(18, Math.min(chartPlotWidth(frame), chartPlotHeight(frame)) * 0.36);
  const positions = new Array(nodes.length);
  const byId = /* @__PURE__ */ new Map();
  let nodePath = "";
  for (let index = 0; index < nodes.length; index++) {
    const angle = -Math.PI / 2 + index / Math.max(1, nodes.length) * Math.PI * 2;
    const position = {
      id: nodes[index].id,
      x: centerX + Math.cos(angle) * layoutRadius,
      y: centerY + Math.sin(angle) * layoutRadius
    };
    positions[index] = position;
    byId.set(nodeKey(position.id), position);
    nodePath += `M${svgNumber2(position.x - nodeRadius)} ${svgNumber2(position.y)}a${svgNumber2(nodeRadius)} ${svgNumber2(nodeRadius)} 0 1 0 ${svgNumber2(nodeRadius * 2)} 0a${svgNumber2(nodeRadius)} ${svgNumber2(nodeRadius)} 0 1 0 ${svgNumber2(-nodeRadius * 2)} 0`;
  }
  const pairGroups = /* @__PURE__ */ new Map();
  for (let index = 0; index < edges.length; index++) {
    const key = canonicalPairKey(edges[index].source, edges[index].target);
    const group = pairGroups.get(key);
    if (group) group.push(index);
    else pairGroups.set(key, [index]);
  }
  const laneByEdge = new Array(edges.length).fill(0);
  const rankByEdge = new Array(edges.length).fill(0);
  let parallelEdgeCount = 0;
  for (const group of pairGroups.values()) {
    const center = (group.length - 1) / 2;
    if (group.length > 1) parallelEdgeCount += group.length;
    for (let rank = 0; rank < group.length; rank++) {
      laneByEdge[group[rank]] = rank - center;
      rankByEdge[group[rank]] = rank;
    }
  }
  let edgePath = "";
  let arrowPath = "";
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
      edgePath += `M${svgNumber2(startX)} ${svgNumber2(startY)}C${svgNumber2(
        source.x + loopRadius
      )} ${svgNumber2(source.y - loopRadius * 1.7)} ${svgNumber2(
        source.x - loopRadius
      )} ${svgNumber2(source.y - loopRadius * 1.7)} ${svgNumber2(endX)} ${svgNumber2(endY)}`;
      arrowPath += arrowTriangle(
        endX,
        endY,
        -1,
        0.45,
        Math.max(4, nodeRadius * 1.1),
        Math.max(2, nodeRadius * 0.55)
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
      y: source.y + uy * nodeRadius * 1.25
    };
    const end = {
      id: target.id,
      x: target.x - ux * nodeRadius * 1.9,
      y: target.y - uy * nodeRadius * 1.9
    };
    const canonicalLane = nodeKey(edge.source) <= nodeKey(edge.target) ? lane : -lane;
    const boundedLane = Math.sign(canonicalLane) * Math.log1p(Math.abs(canonicalLane)) * laneSpacing;
    const controlX = (start.x + end.x) / 2 - uy * boundedLane;
    const controlY = (start.y + end.y) / 2 + ux * boundedLane;
    edgePath += `M${svgNumber2(start.x)} ${svgNumber2(start.y)}Q${svgNumber2(controlX)} ${svgNumber2(controlY)} ${svgNumber2(end.x)} ${svgNumber2(end.y)}`;
    const [arrowX, arrowY] = quadraticPoint(start, controlX, controlY, end, 0.94);
    const tangentX = 2 * (1 - 0.94) * (controlX - start.x) + 2 * 0.94 * (end.x - controlX);
    const tangentY = 2 * (1 - 0.94) * (controlY - start.y) + 2 * 0.94 * (end.y - controlY);
    arrowPath += arrowTriangle(
      arrowX,
      arrowY,
      tangentX,
      tangentY,
      Math.max(4, nodeRadius * 1.1),
      Math.max(2, nodeRadius * 0.55)
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
    parallelEdgeCount
  };
}
function aggregateDegreeBins(degrees, nodeCounts, values, maximumBins = 512) {
  const count = Math.min(degrees.length, nodeCounts.length, values.length);
  const limit = Number.isFinite(maximumBins) ? Math.max(1, Math.floor(maximumBins)) : 1;
  const groupSize = Math.max(1, Math.ceil(count / limit));
  const bins = [];
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
      value
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
    compacted: bins.length < count
  };
}
function aggregateUniformHistogramBins(centers, rawCounts, values, binWidth, normalization, maximumBins = 4096) {
  const count = Math.min(centers.length, rawCounts.length, values.length);
  const limit = Number.isFinite(maximumBins) ? Math.max(1, Math.floor(maximumBins)) : 1;
  const groupSize = Math.max(1, Math.ceil(count / limit));
  const bins = [];
  let sourceRawCount = 0;
  for (let start = 0; start < count; start += groupSize) {
    const stop = Math.min(count, start + groupSize);
    let rawCount = 0;
    let mass = 0;
    for (let index = start; index < stop; index++) {
      rawCount += rawCounts[index];
      mass += normalization === "probability_density" ? values[index] * binWidth : values[index];
      sourceRawCount += rawCounts[index];
    }
    const left = centers[start] - binWidth / 2;
    const right = centers[stop - 1] + binWidth / 2;
    const width = right - left;
    bins.push({
      center: (left + right) / 2,
      width,
      rawCount,
      value: normalization === "probability_density" ? mass / width : mass
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
    compacted: bins.length < count
  };
}
function variableHistogramPath(bins, xDomain, yDomain, frame) {
  const baseline = chartY(0, yDomain, frame);
  let path = "";
  for (let index = 0; index < bins.length; index++) {
    const bin = bins[index];
    const left = chartX(bin.center - bin.width / 2, xDomain, frame);
    const right = chartX(bin.center + bin.width / 2, xDomain, frame);
    const top = chartY(bin.value, yDomain, frame);
    path += rectanglePath(left, top, right - left, baseline - top);
  }
  return path;
}
function equalAspectDomains(extent, center, frame) {
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
      max: center[0] + visibleWidth / 2
    },
    yDomain: {
      min: center[1] - visibleHeight / 2,
      max: center[1] + visibleHeight / 2
    }
  };
}

// react/charts/ReferenceChartScene.tsx
import { useEffect, useId, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var REFERENCE_CHART_SKILLS = Object.freeze([
  "nest.voltage_trace",
  "nest.astrocyte_dynamics",
  "nest.spike_raster",
  "nest.population_rate",
  "nest.rate_response",
  "nest.isi_distribution",
  "nest.psth",
  "nest.correlogram",
  "nest.weight_histogram",
  "nest.plasticity_dynamics",
  "nest.phase_plane",
  "nest.connection_graph",
  "nest.adjacency_matrix",
  "nest.weight_matrix",
  "nest.delay_matrix",
  "nest.in_degree_distribution",
  "nest.out_degree_distribution",
  "nest.delay_distribution",
  "nest.spatial_map_2d"
]);
function chartColors(palette, themeMode) {
  return themeMode === "dark" ? {
    background: palette.panel,
    foreground: palette.ink,
    muted: palette.inkDim,
    grid: palette.grid
  } : {
    background: palette.ink,
    foreground: palette.deepNavy,
    muted: palette.inkFaint,
    grid: palette.inkDim
  };
}
function seriesColor(palette, index) {
  switch (index % 8) {
    case 0:
      return palette.cyan;
    case 1:
      return palette.orange;
    case 2:
      return palette.violet;
    case 3:
      return palette.teal;
    case 4:
      return palette.pink;
    case 5:
      return palette.amber;
    case 6:
      return palette.excitatory;
    default:
      return palette.inhibitory;
  }
}
function declaredInput(args, key) {
  const value = args.provenance.declared_inputs?.[key];
  if (typeof value === "string") return safeDiagnosticText(value, 120);
  if (typeof value === "number" || value === true) {
    return safeDiagnosticText(String(value), 120);
  }
  return void 0;
}
var MIN_REFERENCE_PLOT_WIDTH = 180;
function makeFrame(width, height, requestedRight = 28) {
  const left = 82;
  const right = Math.min(
    requestedRight,
    Math.max(18, width - left - MIN_REFERENCE_PLOT_WIDTH)
  );
  return { width, height, left, right, top: 72, bottom: 68 };
}
function seriesLabelSummary(labels, limit = 8) {
  const shown = labels.slice(0, limit).join("; ");
  const remaining = labels.length - Math.min(labels.length, limit);
  return remaining > 0 ? `${shown}; plus ${remaining} more series` : shown;
}
function metadataValue(value, limit = 180) {
  if (typeof value === "string") return safeDiagnosticText(value, limit);
  if (typeof value === "number" || typeof value === "boolean") {
    return safeDiagnosticText(String(value), limit);
  }
  try {
    return safeDiagnosticText(JSON.stringify(value), limit);
  } catch {
    return "<unavailable>";
  }
}
function sampledIndices(length, maximum = 8) {
  if (length <= 0) return [];
  const count = Math.min(length, Math.max(1, Math.floor(maximum)));
  if (count === 1) return [0];
  const indices = new Array(count);
  for (let index = 0; index < count; index++) {
    indices[index] = Math.round(index * (length - 1) / (count - 1));
  }
  return [...new Set(indices)];
}
function matrixBucketPaint(bucket, palette) {
  if (bucket.sign === 0) return { color: palette.inkDim, opacity: 0.58 };
  return {
    color: bucket.sign < 0 ? palette.inhibitory : palette.excitatory,
    opacity: 0.18 + 0.82 * bucket.level / MATRIX_VALUE_LEVELS_PER_SIGN
  };
}
var MAX_CHART_DATA_PAGE_SIZE = 100;
var DEFAULT_CHART_DATA_PAGE_SIZE = 25;
function PaginatedChartData({
  label,
  rowCount,
  rowAt,
  pageSize = DEFAULT_CHART_DATA_PAGE_SIZE,
  foreground,
  background
}) {
  const safeRowCount = Number.isSafeInteger(rowCount) ? Math.max(0, rowCount) : 0;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(MAX_CHART_DATA_PAGE_SIZE, Math.max(1, Math.floor(pageSize))) : DEFAULT_CHART_DATA_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(safeRowCount / safePageSize));
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);
  const start = page * safePageSize;
  const stop = Math.min(safeRowCount, start + safePageSize);
  const rows = new Array(stop - start);
  for (let index = start; index < stop; index++) {
    rows[index - start] = { index, text: rowAt(index) };
  }
  return /* @__PURE__ */ jsxs(
    "section",
    {
      className: "cortexel-reference-chart-data",
      "aria-label": label,
      style: {
        boxSizing: "border-box",
        padding: "9px 12px",
        color: foreground,
        background,
        fontSize: 12,
        lineHeight: 1.45
      },
      children: [
        /* @__PURE__ */ jsx("div", { "aria-live": "polite", "aria-atomic": "true", children: safeRowCount === 0 ? `${label}: no rows.` : `${label}: rows ${start + 1}\u2013${stop} of ${safeRowCount}; page ${page + 1} of ${pageCount}.` }),
        rows.length > 0 && /* @__PURE__ */ jsx("ol", { start: start + 1, children: rows.map((row) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("bdi", { dir: "auto", style: { unicodeBidi: "isolate" }, children: row.text }) }, row.index)) }),
        pageCount > 1 && /* @__PURE__ */ jsxs("nav", { "aria-label": `${label} pages`, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              disabled: page === 0,
              onClick: () => setPage((current) => Math.max(0, current - 1)),
              style: { minWidth: 44, minHeight: 44 },
              children: "Previous"
            }
          ),
          " ",
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              disabled: page + 1 >= pageCount,
              onClick: () => setPage((current) => Math.min(pageCount - 1, current + 1)),
              style: { minWidth: 44, minHeight: 44 },
              children: "Next"
            }
          )
        ] })
      ]
    }
  );
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
  accessibleDetailsLabel = "Series summary",
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
  children
}) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const xTicks = requestedXTicks ?? tickValues(xDomain);
  const yTicks = requestedYTicks ?? tickValues(yDomain);
  const plotWidth = chartPlotWidth(frame);
  const plotHeight = chartPlotHeight(frame);
  const legendEntries = legend.slice(0, 8);
  return /* @__PURE__ */ jsxs(
    "figure",
    {
      className: "cortexel-reference-chart",
      "data-skill": skill,
      "data-scene": scene,
      "data-sample-count": sampleCount,
      "data-plot-width": plotWidth,
      style: { margin: 0, width: frame.width, maxWidth: "100%" },
      children: [
        /* @__PURE__ */ jsxs(
          "svg",
          {
            role: "img",
            "aria-labelledby": `${titleId} ${descriptionId}`,
            viewBox: `0 0 ${frame.width} ${frame.height}`,
            width: frame.width,
            height: frame.height,
            preserveAspectRatio: "xMidYMid meet",
            style: { display: "block", width: "100%", maxWidth: "100%", height: "auto" },
            children: [
              /* @__PURE__ */ jsx("title", { id: titleId, children: title }),
              /* @__PURE__ */ jsx("desc", { id: descriptionId, children: description }),
              /* @__PURE__ */ jsx("rect", { width: frame.width, height: frame.height, fill: colors.background }),
              /* @__PURE__ */ jsx(
                "text",
                {
                  x: frame.left,
                  y: 30,
                  fill: colors.foreground,
                  fontSize: 18,
                  fontWeight: 600,
                  children: title
                }
              ),
              metadata && /* @__PURE__ */ jsx("text", { x: frame.left, y: 51, fill: colors.muted, fontSize: 11, children: metadata }),
              /* @__PURE__ */ jsxs("g", { "aria-hidden": "true", children: [
                xTicks.map((tick, index) => {
                  const x = chartX(tick, xDomain, frame);
                  return /* @__PURE__ */ jsxs("g", { children: [
                    /* @__PURE__ */ jsx(
                      "line",
                      {
                        x1: x,
                        y1: frame.top,
                        x2: x,
                        y2: frame.top + plotHeight,
                        stroke: colors.grid,
                        strokeOpacity: 0.55,
                        vectorEffect: "non-scaling-stroke"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "text",
                      {
                        x,
                        y: frame.height - frame.bottom + 20,
                        fill: colors.muted,
                        fontSize: 10,
                        textAnchor: "middle",
                        children: formatChartNumber(tick)
                      }
                    )
                  ] }, `x-${index}`);
                }),
                yTicks.map((tick, index) => {
                  const y = chartY(tick, yDomain, frame);
                  return /* @__PURE__ */ jsxs("g", { children: [
                    /* @__PURE__ */ jsx(
                      "line",
                      {
                        x1: frame.left,
                        y1: y,
                        x2: frame.left + plotWidth,
                        y2: y,
                        stroke: colors.grid,
                        strokeOpacity: 0.55,
                        vectorEffect: "non-scaling-stroke"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "text",
                      {
                        x: frame.left - 10,
                        y: y + 4,
                        fill: colors.muted,
                        fontSize: 10,
                        textAnchor: "end",
                        children: formatChartNumber(tick)
                      }
                    )
                  ] }, `y-${index}`);
                }),
                /* @__PURE__ */ jsx(
                  "rect",
                  {
                    x: frame.left,
                    y: frame.top,
                    width: plotWidth,
                    height: plotHeight,
                    fill: "none",
                    stroke: colors.muted,
                    strokeOpacity: 0.75,
                    vectorEffect: "non-scaling-stroke"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "text",
                  {
                    x: frame.left + plotWidth / 2,
                    y: frame.height - 16,
                    fill: colors.foreground,
                    fontSize: 12,
                    textAnchor: "middle",
                    children: xLabel
                  }
                ),
                /* @__PURE__ */ jsx(
                  "text",
                  {
                    x: 18,
                    y: frame.top + plotHeight / 2,
                    fill: colors.foreground,
                    fontSize: 12,
                    textAnchor: "middle",
                    transform: `rotate(-90 18 ${frame.top + plotHeight / 2})`,
                    children: yLabel
                  }
                )
              ] }),
              children,
              legendEntries.length > 0 && /* @__PURE__ */ jsxs("g", { "aria-label": "Series legend", children: [
                legendEntries.map((entry, index) => {
                  const y = frame.top + 15 + index * 18;
                  return /* @__PURE__ */ jsxs("g", { children: [
                    /* @__PURE__ */ jsx(
                      "line",
                      {
                        x1: frame.width - frame.right + 18,
                        y1: y,
                        x2: frame.width - frame.right + 42,
                        y2: y,
                        stroke: entry.color,
                        strokeWidth: 2,
                        vectorEffect: "non-scaling-stroke"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "text",
                      {
                        x: frame.width - frame.right + 48,
                        y: y + 4,
                        fill: colors.foreground,
                        fontSize: 10,
                        children: entry.label.length > 22 ? `${entry.label.slice(0, 21)}\u2026` : entry.label
                      }
                    )
                  ] }, `${index}-${entry.label}`);
                }),
                legend.length > legendEntries.length && /* @__PURE__ */ jsxs(
                  "text",
                  {
                    x: frame.width - frame.right + 18,
                    y: frame.top + 15 + legendEntries.length * 18,
                    fill: colors.muted,
                    fontSize: 10,
                    children: [
                      "+",
                      legend.length - legendEntries.length,
                      " more series"
                    ]
                  }
                )
              ] })
            ]
          }
        ),
        dataRows && /* @__PURE__ */ jsx(
          PaginatedChartData,
          {
            label: dataRows.label,
            rowCount: dataRows.rowCount,
            rowAt: dataRows.rowAt,
            pageSize: dataRows.pageSize,
            foreground: colors.foreground,
            background: colors.background
          },
          dataRows.key
        ),
        (note || accessibleDetails.length > 0) && /* @__PURE__ */ jsxs(
          "figcaption",
          {
            className: "cortexel-reference-chart-details",
            style: {
              boxSizing: "border-box",
              padding: "9px 12px",
              color: colors.foreground,
              background: colors.background,
              fontSize: 12,
              lineHeight: 1.45
            },
            children: [
              note && /* @__PURE__ */ jsx("div", { children: note }),
              accessibleDetails.length > 0 && /* @__PURE__ */ jsxs("div", { "aria-label": accessibleDetailsLabel, children: [
                /* @__PURE__ */ jsxs("span", { children: [
                  accessibleDetailsLabel,
                  ": "
                ] }),
                accessibleDetails.join(" ")
              ] })
            ]
          }
        )
      ]
    }
  );
}
function sampledUniqueValues(values, maximum = 8) {
  const unique = [...new Set(values)].sort((left, right) => left - right);
  if (unique.length <= maximum) return unique;
  const sampled = new Array(maximum);
  for (let index = 0; index < maximum; index++) {
    sampled[index] = unique[Math.round(index * (unique.length - 1) / (maximum - 1))];
  }
  return sampled;
}
function TraceChart(args, width, height, id) {
  const params = args.params;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = nestedNumericDomain(params.series);
  const legend = params.series_labels.map((label, index) => ({
    label,
    color: seriesColor(args.palette, index)
  }));
  const showLegend = params.series.length > 1 && width >= 600;
  const frame = makeFrame(width, height, showLegend ? 210 : 28);
  const variable = declaredInput(args, "recorded_variable") ?? "Recorded variable";
  return /* @__PURE__ */ jsx(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: `${variable} trace`,
      description: `${params.series.length} labeled series with ${params.times_ms.length} samples each. Series: ${seriesLabelSummary(params.series_labels)}. Time is in milliseconds and the shared value axis is in ${params.units}.`,
      metadata: `${params.series.length} series \u2022 ${params.times_ms.length} samples`,
      xLabel: "Time (ms)",
      yLabel: `${variable} (${params.units})`,
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      legend: showLegend ? legend : void 0,
      sampleCount: params.times_ms.length * params.series.length,
      children: /* @__PURE__ */ jsx("g", { fill: "none", children: params.series.map((series, index) => /* @__PURE__ */ jsx(
        "path",
        {
          "data-mark": "trace-line",
          d: linePath(params.times_ms, series, xDomain, yDomain, frame),
          stroke: seriesColor(args.palette, index),
          strokeWidth: 2,
          vectorEffect: "non-scaling-stroke"
        },
        `${index}-${params.series_labels[index]}`
      )) })
    }
  );
}
function AstrocyteChart(args, width, height, id) {
  const params = args.params;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = numericDomain(params.ca_trace, { includeZero: true });
  const frame = makeFrame(width, height);
  const variable = declaredInput(args, "recorded_variable") ?? "Ca\xB2\u207A/IP\u2083";
  return /* @__PURE__ */ jsx(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: `${variable} dynamics`,
      description: `Glial ${variable} analog signal with ${params.times_ms.length} samples in ${params.units}. This is not membrane voltage.`,
      metadata: `${params.times_ms.length} samples \u2022 glial analog trace, not voltage`,
      xLabel: "Time (ms)",
      yLabel: `${variable} (${params.units})`,
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      sampleCount: params.times_ms.length,
      children: /* @__PURE__ */ jsx(
        "path",
        {
          "data-mark": "astrocyte-line",
          d: linePath(params.times_ms, params.ca_trace, xDomain, yDomain, frame),
          fill: "none",
          stroke: args.palette.teal,
          strokeWidth: 2,
          vectorEffect: "non-scaling-stroke"
        }
      )
    }
  );
}
function SpikeRasterChart(args, width, height, id) {
  const params = args.params;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = numericDomain(params.senders);
  const frame = makeFrame(width, height);
  const senderCount = new Set(params.senders).size;
  const senderTicks = sampledUniqueValues(params.senders);
  return /* @__PURE__ */ jsx(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: "Spike raster",
      description: `${params.times_ms.length} exact spike events from ${senderCount} senders. No rate bins or synthetic events are added.`,
      metadata: `${params.times_ms.length} spikes \u2022 ${senderCount} senders \u2022 exact event times`,
      xLabel: "Time (ms)",
      yLabel: "Sender ID",
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      yTicks: senderTicks,
      sampleCount: params.times_ms.length,
      children: /* @__PURE__ */ jsx(
        "path",
        {
          "data-mark": "spike-events",
          "data-event-count": params.times_ms.length,
          d: rasterTickPath(params.times_ms, params.senders, xDomain, yDomain, frame),
          fill: "none",
          stroke: args.palette.spike,
          strokeWidth: 1.5,
          vectorEffect: "non-scaling-stroke"
        }
      )
    }
  );
}
var POPULATION_RATE_PATH_SAMPLE_BUDGET = 8192;
function populationRateSeriesDetail(series) {
  let minimumRate = Number.POSITIVE_INFINITY;
  let maximumRate = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < series.rates_hz.length; index++) {
    minimumRate = Math.min(minimumRate, series.rates_hz[index]);
    maximumRate = Math.max(maximumRate, series.rates_hz[index]);
  }
  return `${series.label} (id ${series.id}): ${series.recorded_sender_count} recorded senders, ${series.spike_counts.length} spike-count bins, rate range ${formatChartNumber(minimumRate)}\u2013${formatChartNumber(maximumRate)} Hz.`;
}
function PopulationRateChart(args, width, height, id) {
  const params = args.params;
  const xDomain = numericDomain([params.window_start_ms, params.window_stop_ms]);
  const yDomain = nestedNumericDomain(
    params.series.map((series) => series.rates_hz),
    { includeZero: true }
  );
  const showLegend = width >= 600;
  const frame = makeFrame(width, height, showLegend ? 230 : 28);
  const legend = params.series.map((series, index) => ({
    label: `${series.label} (${series.id})`,
    color: seriesColor(args.palette, index)
  }));
  const perSeriesBudget = Math.max(
    2,
    Math.floor(POPULATION_RATE_PATH_SAMPLE_BUDGET / params.series.length)
  );
  const paths = params.series.map((series) => binnedStepPath(
    params.bin_centers_ms,
    series.rates_hz,
    params.bin_width_ms,
    xDomain,
    yDomain,
    frame,
    perSeriesBudget
  ));
  const compacted = paths.some((path) => path.compacted);
  const seriesDetails = params.series.map(populationRateSeriesDetail);
  const formula = "rates_hz = spike_counts \xD7 1000 \xF7 (recorded_sender_count \xD7 bin_width_ms)";
  return /* @__PURE__ */ jsx(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: "Population firing rate",
      description: `${params.series.length} exact checked population-rate series over ${params.bin_centers_ms.length} uniform bins. Horizontal steps show the supplied bin values without interpolation or smoothing. Series: ${seriesLabelSummary(params.series.map((series) => `${series.label} (${series.id})`))}. ${formula}.`,
      metadata: `${params.series.length} series \u2022 ${params.bin_centers_ms.length} bins \u2022 bin ${formatChartNumber(params.bin_width_ms)} ms \u2022 window [${formatChartNumber(params.window_start_ms)}, ${formatChartNumber(params.window_stop_ms)}) ms`,
      note: `Rate formula: ${formula}. Binning: ${params.binning}; aggregation: ${params.aggregation}; normalization: ${params.normalization}.${compacted ? " Long series are visually compacted to exact per-bucket extrema; omitted bins are never bridged." : ""}`,
      accessibleDetails: seriesDetails,
      xLabel: "Time (ms)",
      yLabel: "Population rate (Hz)",
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      legend: showLegend ? legend : void 0,
      sampleCount: params.bin_centers_ms.length * params.series.length,
      children: /* @__PURE__ */ jsx("g", { fill: "none", children: params.series.map((series, index) => /* @__PURE__ */ jsx(
        "path",
        {
          "data-mark": "population-rate-steps",
          "data-series-id": series.id,
          "data-source-bin-count": paths[index].sourceSampleCount,
          "data-rendered-bin-count": paths[index].renderedSampleCount,
          "data-compacted": paths[index].compacted ? "true" : "false",
          d: paths[index].path,
          stroke: seriesColor(args.palette, index),
          strokeWidth: 2,
          strokeLinejoin: "miter",
          vectorEffect: "non-scaling-stroke"
        },
        series.id
      )) })
    }
  );
}
function RateResponseChart(args, width, height, id) {
  const params = args.params;
  const xDomain = numericDomain(params.stimulus_amplitudes);
  const yDomain = numericDomain(params.rates_hz, { includeZero: true });
  const frame = makeFrame(width, height);
  const bin = declaredInput(args, "bin_ms");
  const normalization = declaredInput(args, "rate_normalization");
  const metadata = [
    `${params.rates_hz.length} response points`,
    bin ? `counting window ${bin} ms` : void 0,
    normalization
  ].filter((value) => value !== void 0).join(" \u2022 ");
  return /* @__PURE__ */ jsxs(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: "F\u2013I response",
      description: `${params.rates_hz.length} firing-rate measurements ordered by stimulus amplitude for display. Rates are in hertz and stimulus is in ${params.stimulus_units}.`,
      metadata,
      xLabel: `Stimulus (${params.stimulus_units})`,
      yLabel: "Firing rate (Hz)",
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      sampleCount: params.rates_hz.length,
      children: [
        /* @__PURE__ */ jsx(
          "path",
          {
            "data-mark": "fi-line",
            d: sortedLinePath(
              params.stimulus_amplitudes,
              params.rates_hz,
              xDomain,
              yDomain,
              frame
            ),
            fill: "none",
            stroke: args.palette.excitatory,
            strokeWidth: 2,
            vectorEffect: "non-scaling-stroke"
          }
        ),
        /* @__PURE__ */ jsx(
          "path",
          {
            "data-mark": "fi-points",
            d: pointPath(
              params.stimulus_amplitudes,
              params.rates_hz,
              xDomain,
              yDomain,
              frame
            ),
            fill: args.palette.excitatory
          }
        )
      ]
    }
  );
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
  alignmentLabel
}) {
  const xDomain = histogramDomain(centers, binWidth);
  const yDomain = numericDomain(values, { includeZero: true });
  const frame = makeFrame(width, height);
  const zeroInDomain = xDomain.min <= 0 && xDomain.max >= 0;
  const zeroX = chartX(0, xDomain, frame);
  return /* @__PURE__ */ jsxs(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title,
      description,
      metadata,
      xLabel,
      yLabel,
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      sampleCount: values.length,
      children: [
        /* @__PURE__ */ jsx(
          "path",
          {
            "data-mark": "histogram-bars",
            "data-bar-count": values.length,
            d: histogramBarPath(centers, values, binWidth, xDomain, yDomain, frame),
            fill: color,
            fillOpacity: 0.82,
            stroke: color,
            strokeWidth: 0.75,
            vectorEffect: "non-scaling-stroke"
          }
        ),
        alignmentLabel && zeroInDomain && /* @__PURE__ */ jsxs("g", { "data-mark": "alignment-zero", children: [
          /* @__PURE__ */ jsx(
            "line",
            {
              x1: zeroX,
              y1: frame.top,
              x2: zeroX,
              y2: frame.height - frame.bottom,
              stroke: args.palette.amber,
              strokeWidth: 1.5,
              strokeDasharray: "5 4",
              vectorEffect: "non-scaling-stroke"
            }
          ),
          /* @__PURE__ */ jsxs(
            "text",
            {
              x: zeroX + 5,
              y: frame.top + 13,
              fill: args.palette.amber,
              fontSize: 10,
              children: [
                "t=0: ",
                alignmentLabel.length > 36 ? `${alignmentLabel.slice(0, 35)}\u2026` : alignmentLabel
              ]
            }
          )
        ] })
      ]
    }
  );
}
function IsiChart(args, width, height, id) {
  const params = args.params;
  return /* @__PURE__ */ jsx(
    HistogramChart,
    {
      args,
      width,
      height,
      id,
      title: "Inter-spike interval distribution",
      description: `${params.values.length} uniform ${params.bin_width_ms} ms bins using ${params.normalization} normalization and ${params.interval_scope} interval scope.`,
      metadata: `${params.normalization} \u2022 ${params.interval_scope} \u2022 bin ${formatChartNumber(params.bin_width_ms)} ms`,
      xLabel: "Inter-spike interval (ms)",
      yLabel: params.value_units,
      centers: params.bin_centers_ms,
      values: params.values,
      binWidth: params.bin_width_ms,
      color: args.palette.teal
    }
  );
}
function PsthChart(args, width, height, id) {
  const params = args.params;
  return /* @__PURE__ */ jsx(
    HistogramChart,
    {
      args,
      width,
      height,
      id,
      title: "Peri-stimulus time histogram",
      description: `${params.values.length} trial-aligned bins aggregated across selected senders for ${params.trial_count} trials. Alignment event: ${params.alignment_event}. Normalization: ${params.normalization}.`,
      metadata: `${params.normalization} \u2022 ${params.trial_count} trials \u2022 bin ${formatChartNumber(params.bin_width_ms)} ms`,
      xLabel: "Time from alignment event (ms)",
      yLabel: params.value_units,
      centers: params.bin_centers_ms,
      values: params.values,
      binWidth: params.bin_width_ms,
      color: args.palette.spike,
      alignmentLabel: params.alignment_event
    }
  );
}
function correlogramStatisticDetail(statistic) {
  switch (statistic.kind) {
    case "pair_rate_hz":
      return `${statistic.kind} (${statistic.units}), exposure ${formatChartNumber(statistic.exposure_s)} s`;
    case "pearson_coefficient":
      return `${statistic.kind} (${statistic.units}), ${statistic.sample_count} samples`;
    default:
      return `${statistic.kind} (${statistic.units})`;
  }
}
function CorrelogramChart(args, width, height, id) {
  const params = args.params;
  const xDomain = numericDomain([-params.tau_max_ms, params.tau_max_ms]);
  const yDomain = numericDomain(params.values, { includeZero: true });
  const frame = makeFrame(width, height);
  const zeroX = chartX(0, xDomain, frame);
  const statistic = correlogramStatisticDetail(params.statistic);
  const pair = `${params.pair.reference_label} \u2192 ${params.pair.target_label}`;
  const marks = boundedStemPointPaths(
    params.lags_ms,
    params.values,
    xDomain,
    yDomain,
    frame
  );
  return /* @__PURE__ */ jsxs(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: "Spike-train correlogram",
      description: `${params.values.length} exact binned ${params.statistic.kind} values for the oriented pair ${pair}. Positive lag means the target follows the reference. Signed values and lag asymmetry are preserved; bins are shown as independent stems and points with no interpolation or mirroring. The zero-lag reference line does not add a zero bin.`,
      metadata: `${pair} \u2022 ${statistic} \u2022 bin ${formatChartNumber(params.bin_width_ms)} ms \u2022 \u03C4 range \xB1${formatChartNumber(params.tau_max_ms)} ms`,
      note: `Pair orientation: ${pair}. Lag convention: ${params.lag_convention}. Statistic: ${statistic}. Counting window: [${formatChartNumber(params.counting_start_ms)}, ${formatChartNumber(params.counting_stop_ms)}) ms. Binning: ${params.binning}. Zero-lag policy: ${params.zero_lag_policy}; the lag-zero line is a reference only and does not invent a bin.${marks.compacted ? " Long series are visually compacted to exact per-bucket extrema; omitted bins remain disconnected and are never mirrored." : ""}`,
      xLabel: "Lag (ms)",
      yLabel: `${params.statistic.kind} (${params.statistic.units})`,
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      sampleCount: params.values.length,
      children: [
        /* @__PURE__ */ jsxs("g", { "data-mark": "zero-lag-reference", "data-zero-bin-present": params.lags_ms.includes(0), children: [
          /* @__PURE__ */ jsx(
            "line",
            {
              x1: zeroX,
              y1: frame.top,
              x2: zeroX,
              y2: frame.height - frame.bottom,
              stroke: args.palette.amber,
              strokeWidth: 1.5,
              strokeDasharray: "5 4",
              vectorEffect: "non-scaling-stroke"
            }
          ),
          /* @__PURE__ */ jsx("text", { x: zeroX + 5, y: frame.top + 13, fill: args.palette.amber, fontSize: 10, children: "lag 0 reference" })
        ] }),
        /* @__PURE__ */ jsx(
          "path",
          {
            "data-mark": "correlogram-stems",
            "data-bin-count": params.values.length,
            "data-source-bin-count": marks.sourceSampleCount,
            "data-rendered-bin-count": marks.renderedSampleCount,
            "data-compacted": marks.compacted ? "true" : "false",
            d: marks.stems,
            fill: "none",
            stroke: args.palette.excitatory,
            strokeWidth: 1.5,
            vectorEffect: "non-scaling-stroke"
          }
        ),
        /* @__PURE__ */ jsx(
          "path",
          {
            "data-mark": "correlogram-points",
            "data-bin-count": params.values.length,
            "data-source-bin-count": marks.sourceSampleCount,
            "data-rendered-bin-count": marks.renderedSampleCount,
            "data-compacted": marks.compacted ? "true" : "false",
            d: marks.points,
            fill: args.palette.excitatory
          }
        )
      ]
    }
  );
}
function WeightHistogramChart(args, width, height, id) {
  const params = args.params;
  return /* @__PURE__ */ jsx(
    HistogramChart,
    {
      args,
      width,
      height,
      id,
      title: "Connection-weight distribution",
      description: `${params.values.length} weight bins from the declared connection snapshot at ${params.snapshot_time_ms} ms, using ${params.normalization} normalization.`,
      metadata: `${params.normalization} \u2022 snapshot ${formatChartNumber(params.snapshot_time_ms)} ms \u2022 bin ${formatChartNumber(params.bin_width)} ${params.weight_units}`,
      xLabel: `Connection weight (${params.weight_units})`,
      yLabel: params.value_units,
      centers: params.bin_centers,
      values: params.values,
      binWidth: params.bin_width,
      color: args.palette.violet
    }
  );
}
function PlasticityChart(args, width, height, id) {
  const params = args.params;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = numericDomain(params.weights);
  const frame = makeFrame(width, height);
  const synapseModel = declaredInput(args, "synapse_model");
  return /* @__PURE__ */ jsx(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: "Synaptic weight dynamics",
      description: `${params.weights.length} measured weight samples over time in ${params.weight_units}. This view does not invent an STDP window or pre/post spike protocol.`,
      metadata: [synapseModel, `${params.weights.length} samples`].filter((value) => value !== void 0).join(" \u2022 "),
      xLabel: "Time (ms)",
      yLabel: `Weight (${params.weight_units})`,
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      sampleCount: params.weights.length,
      children: /* @__PURE__ */ jsx(
        "path",
        {
          "data-mark": "weight-line",
          d: linePath(params.times_ms, params.weights, xDomain, yDomain, frame),
          fill: "none",
          stroke: args.palette.ltp,
          strokeWidth: 2,
          vectorEffect: "non-scaling-stroke"
        }
      )
    }
  );
}
function PhasePlaneChart(args, width, height, id) {
  const params = args.params;
  const [xAxis, yAxis] = params.axis_order;
  const xValues = params.grid[xAxis];
  const yValues = params.grid[yAxis];
  const xDomain = numericDomain(xValues);
  const yDomain = numericDomain(yValues);
  const frame = makeFrame(width, height);
  const samples = phasePlaneSamples(
    params.axis_order,
    params.grid,
    params.derivatives
  );
  return /* @__PURE__ */ jsx(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: "Phase-plane vector field",
      description: `${samples.length} derivative vectors on the Cartesian ${xAxis} by ${yAxis} grid. Derivative units are ${params.derivative_units[xAxis]} for ${xAxis} and ${params.derivative_units[yAxis]} for ${yAxis}. Arrows are normalized in plotted coordinate space and do not encode an absolute integration timestep. No trajectory, nullcline, or equilibrium is invented.`,
      metadata: `${xValues.length}\xD7${yValues.length} grid \u2022 vector units ${xAxis}: ${params.derivative_units[xAxis]}; ${yAxis}: ${params.derivative_units[yAxis]} \u2022 row-major, last axis fastest`,
      xLabel: `${xAxis} (${params.axis_units[xAxis]})`,
      yLabel: `${yAxis} (${params.axis_units[yAxis]})`,
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      sampleCount: samples.length,
      children: /* @__PURE__ */ jsx(
        "path",
        {
          "data-mark": "phase-vectors",
          "data-vector-count": samples.length,
          d: phasePlaneArrowPath(samples, xDomain, yDomain, frame),
          fill: "none",
          stroke: args.palette.orange,
          strokeWidth: 1.4,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          vectorEffect: "non-scaling-stroke"
        }
      )
    }
  );
}
function MatrixChart(args, width, height, id) {
  const skill = args.skill;
  const params = args.params;
  const showLegend = width >= 600;
  const frame = makeFrame(width, height, showLegend ? 190 : 28);
  const sourceIndex = /* @__PURE__ */ new Map();
  const targetIndex = /* @__PURE__ */ new Map();
  for (let index = 0; index < params.source_ids.length; index++) {
    sourceIndex.set(params.source_ids[index], index);
  }
  for (let index = 0; index < params.target_ids.length; index++) {
    targetIndex.set(params.target_ids[index], index);
  }
  const cells = params.cells.map((cell) => ({
    sourceIndex: sourceIndex.get(cell.source_id) ?? -1,
    targetIndex: targetIndex.get(cell.target_id) ?? -1,
    value: skill === "nest.adjacency_matrix" ? 1 : cell.value
  }));
  const geometry = matrixValueBucketPaths(
    cells,
    params.source_ids.length,
    params.target_ids.length,
    frame
  );
  const minimumCellPixels = Math.min(
    chartPlotWidth(frame) / params.source_ids.length,
    chartPlotHeight(frame) / params.target_ids.length
  );
  const cellStrokeWidth = minimumCellPixels >= 1.5 ? 0.35 : 0;
  const colors = chartColors(args.palette, args.themeMode);
  const sourceTicks = sampledIndices(params.source_ids.length, 6);
  const targetTicks = sampledIndices(params.target_ids.length, 6);
  const presentZeroCount = geometry.buckets.find((bucket) => bucket.sign === 0)?.cellCount ?? 0;
  const connectionCount = params.connection_count;
  const title = skill === "nest.adjacency_matrix" ? "Connection adjacency matrix" : skill === "nest.weight_matrix" ? "Connection-weight matrix" : "Connection-delay matrix";
  const metric = skill === "nest.adjacency_matrix" ? "binary presence" : `${params.aggregation} ${skill === "nest.weight_matrix" ? `weight (${params.weight_units})` : `delay (${params.delay_units})`}`;
  const scope = metadataValue(params.snapshot_scope);
  const maximum = formatChartNumber(geometry.maximumAbsoluteValue);
  const sourceSummary = params.source_ids.length === 0 ? "none" : `${params.source_ids[0]}\u2026${params.source_ids[params.source_ids.length - 1]}`;
  const targetSummary = params.target_ids.length === 0 ? "none" : `${params.target_ids[0]}\u2026${params.target_ids[params.target_ids.length - 1]}`;
  return /* @__PURE__ */ jsxs(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title,
      description: `${params.cells.length} present sparse cells on ${params.target_ids.length} declared target rows and ${params.source_ids.length} declared source columns. Target rows follow the declared top-to-bottom order and source columns follow the declared left-to-right order. Absent cells mean no connection; a present measured zero remains visibly distinct. Cells are never interpolated or spatially merged.`,
      metadata: `${params.target_ids.length}\xD7${params.source_ids.length} axes \u2022 ${params.cells.length} present cells \u2022 ${connectionCount} connections \u2022 snapshot ${formatChartNumber(params.snapshot_time_ms)} ms`,
      note: `Orientation: ${params.axis_order}. Metric: ${metric}. Absent cell: ${params.absent_cell}. Connection sample policy: ${params.sample_policy}. Snapshot scope (including MPI ownership): ${scope}. Every sparse cell keeps exact row/column geometry; paint is grouped into ${geometry.valueBucketCount} bounded signed value paths, with ${presentZeroCount} present zero-valued cells and maximum absolute displayed value ${maximum}. Negative values use the inhibitory color, positive values use the excitatory color, and opacity uses eight disclosed magnitude levels.${cellStrokeWidth === 0 ? " Cell border strokes are suppressed below pixel scale, but no cell or value is removed." : ""}`,
      accessibleDetails: [
        `Source axis ids: ${sourceSummary}.`,
        `Target axis ids: ${targetSummary}.`,
        `${geometry.sourceCellCount} source cells and ${geometry.renderedCellCount} rendered cells; none omitted.`
      ],
      accessibleDetailsLabel: "Matrix summary",
      xLabel: "Source node ID (declared column order)",
      yLabel: "Target node ID (declared row order)",
      xDomain: { min: 0, max: Math.max(1, params.source_ids.length) },
      yDomain: { min: 0, max: Math.max(1, params.target_ids.length) },
      xTicks: [],
      yTicks: [],
      frame,
      colors,
      sampleCount: params.cells.length,
      dataRows: {
        key: `${skill}-${params.snapshot_time_ms}-${params.source_ids.length}-${params.target_ids.length}-${params.cells.length}`,
        label: "Matrix data ordered as source-axis columns, target-axis rows, then present cells",
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
          if (skill === "nest.adjacency_matrix") {
            return `Present-cell record ${cellIndex + 1} of ${params.cells.length}: target node ID ${cell.target_id} at declared row ${declaredRow}, source node ID ${cell.source_id} at declared column ${declaredColumn}; ${cell.connection_count} connection${cell.connection_count === 1 ? "" : "s"}; binary presence.`;
          }
          const measured = cell;
          const units = skill === "nest.weight_matrix" ? params.weight_units : params.delay_units;
          return `Present-cell record ${cellIndex + 1} of ${params.cells.length}: target node ID ${cell.target_id} at declared row ${declaredRow}, source node ID ${cell.source_id} at declared column ${declaredColumn}; ${cell.connection_count} connection${cell.connection_count === 1 ? "" : "s"}; displayed value ${formatChartNumber(measured.value)} ${units}; aggregation ${params.aggregation}.`;
        }
      },
      children: [
        /* @__PURE__ */ jsxs(
          "g",
          {
            "data-mark": "matrix-cells",
            "data-source-cell-count": geometry.sourceCellCount,
            "data-rendered-cell-count": geometry.renderedCellCount,
            "data-value-bucket-count": geometry.valueBucketCount,
            "data-present-zero-count": presentZeroCount,
            "data-absent-cell": params.absent_cell,
            "data-axis-order": params.axis_order,
            "data-cell-stroke": cellStrokeWidth > 0 ? "visible" : "suppressed-below-pixel-scale",
            children: [
              /* @__PURE__ */ jsx(
                "rect",
                {
                  x: frame.left,
                  y: frame.top,
                  width: chartPlotWidth(frame),
                  height: chartPlotHeight(frame),
                  fill: colors.grid,
                  fillOpacity: 0.14,
                  "data-mark": "matrix-absent-background"
                }
              ),
              geometry.buckets.map((bucket) => {
                const paint = matrixBucketPaint(bucket, args.palette);
                return /* @__PURE__ */ jsx(
                  "path",
                  {
                    "data-mark": "matrix-value-bucket",
                    "data-bucket": bucket.key,
                    "data-cell-count": bucket.cellCount,
                    d: bucket.path,
                    fill: paint.color,
                    fillOpacity: paint.opacity,
                    stroke: colors.background,
                    strokeWidth: cellStrokeWidth,
                    vectorEffect: "non-scaling-stroke"
                  },
                  bucket.key
                );
              })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("g", { "aria-hidden": "true", "data-mark": "matrix-axis-identities", children: [
          sourceTicks.map((axisIndex) => {
            const x = frame.left + (axisIndex + 0.5) / params.source_ids.length * chartPlotWidth(frame);
            return /* @__PURE__ */ jsx(
              "text",
              {
                x,
                y: frame.height - frame.bottom + 18,
                fill: colors.muted,
                fontSize: 9,
                textAnchor: "middle",
                children: params.source_ids[axisIndex]
              },
              `source-${axisIndex}`
            );
          }),
          targetTicks.map((axisIndex) => {
            const y = frame.top + (axisIndex + 0.5) / params.target_ids.length * chartPlotHeight(frame);
            return /* @__PURE__ */ jsx(
              "text",
              {
                x: frame.left - 9,
                y: y + 3,
                fill: colors.muted,
                fontSize: 9,
                textAnchor: "end",
                children: params.target_ids[axisIndex]
              },
              `target-${axisIndex}`
            );
          })
        ] }),
        showLegend && /* @__PURE__ */ jsx("g", { "aria-label": "Matrix value legend", "data-mark": "matrix-value-legend", children: [
          ["absent: no connection", colors.grid, 0.3],
          ["present zero", args.palette.inkDim, 0.58],
          ["negative", args.palette.inhibitory, 1],
          ["positive", args.palette.excitatory, 1]
        ].map(([label, color, opacity], legendIndex) => {
          const y = frame.top + legendIndex * 22;
          return /* @__PURE__ */ jsxs("g", { children: [
            /* @__PURE__ */ jsx(
              "rect",
              {
                x: frame.width - frame.right + 18,
                y,
                width: 10,
                height: 10,
                fill: String(color),
                fillOpacity: Number(opacity)
              }
            ),
            /* @__PURE__ */ jsx(
              "text",
              {
                x: frame.width - frame.right + 34,
                y: y + 9,
                fill: colors.foreground,
                fontSize: 9,
                children: String(label)
              }
            )
          ] }, String(label));
        }) })
      ]
    }
  );
}
function ConnectionGraphChart(args, width, height, id) {
  const params = args.params;
  const frame = makeFrame(width, height);
  const geometry = circleTopologyGeometry(params.nodes, params.edges, frame);
  const colors = chartColors(args.palette, args.themeMode);
  const endpointIds = /* @__PURE__ */ new Set();
  let weightedEdges = 0;
  let delayedEdges = 0;
  for (let index = 0; index < params.edges.length; index++) {
    endpointIds.add(params.edges[index].source);
    endpointIds.add(params.edges[index].target);
    if (params.edges[index].weight !== void 0) weightedEdges += 1;
    if (params.edges[index].delay_ms !== void 0) delayedEdges += 1;
  }
  const isolateCount = params.nodes.reduce(
    (count, node) => count + (endpointIds.has(node.id) ? 0 : 1),
    0
  );
  const scope = metadataValue(params.snapshot_scope);
  const samplePolicy = metadataValue(params.sample_policy);
  const labels = sampledIndices(params.nodes.length, 8);
  return /* @__PURE__ */ jsxs(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: "Connection topology graph",
      description: `${params.nodes.length} declared nodes, including ${isolateCount} isolates, and ${params.edges.length} provided directed connection records on a deterministic schematic circle. Every provided multapse, reverse edge, and autapse is retained with a separate deterministic lane and persistent arrowhead. Circle positions and distances are derived for readability and are not spatial evidence.`,
      metadata: `${params.nodes.length} nodes \u2022 ${params.edges.length} rendered of ${params.source_connection_count} source connections \u2022 ${isolateCount} isolates \u2022 snapshot ${formatChartNumber(params.snapshot_time_ms)} ms`,
      note: `Schematic layout: ${params.layout}; node positions and distances are not measured. Parallel edges: ${params.parallel_edges}; self-connections: ${params.self_connections}; arrowheads preserve source\u2192target direction. ${weightedEdges} edges carry weights${params.weight_units ? ` in ${params.weight_units}` : ""} and ${delayedEdges} carry delays${params.delay_units ? ` in ${params.delay_units}` : ""}; neither channel is mapped to geometry. Edge identity: ${params.edge_identity}. Source connection count: ${params.source_connection_count}. Sample policy: ${samplePolicy}. Snapshot scope (including MPI ownership): ${scope}.`,
      accessibleDetails: [
        `${geometry.sourceNodeCount} source nodes and ${geometry.renderedNodeCount} rendered nodes; none omitted.`,
        `${params.source_connection_count} source connections, ${geometry.sourceEdgeCount} provided sample edges, and ${geometry.renderedEdgeCount} rendered edges; no provided edge omitted.`,
        `${geometry.selfLoopCount} self-connections and ${geometry.parallelEdgeCount} edges in parallel bundles.`
      ],
      accessibleDetailsLabel: "Topology summary",
      xLabel: "Schematic circle layout \u2014 horizontal position is non-quantitative",
      yLabel: "Schematic vertical position",
      xDomain: { min: 0, max: 1 },
      yDomain: { min: 0, max: 1 },
      xTicks: [],
      yTicks: [],
      frame,
      colors,
      sampleCount: params.nodes.length + params.edges.length,
      dataRows: {
        key: `connection-graph-${params.snapshot_time_ms}-${params.nodes.length}-${params.edges.length}`,
        label: "Connection graph node and edge data",
        rowCount: params.nodes.length + params.edges.length,
        rowAt: (index) => {
          if (index < params.nodes.length) {
            const node = params.nodes[index];
            return `Node ${node.id}: ${node.label}; ${endpointIds.has(node.id) ? "incident to at least one provided edge" : "isolated in the provided graph"}.`;
          }
          const edge = params.edges[index - params.nodes.length];
          const details = [
            edge.weight === void 0 ? void 0 : `weight ${formatChartNumber(edge.weight)} ${params.weight_units}`,
            edge.delay_ms === void 0 ? void 0 : `delay ${formatChartNumber(edge.delay_ms)} ${params.delay_units}`,
            edge.synapse_model === void 0 ? void 0 : `synapse model ${edge.synapse_model}`,
            `edge identity ${params.edge_identity}`
          ].filter((value) => value !== void 0);
          return `Edge ${edge.id}: ${edge.source} \u2192 ${edge.target}${details.length > 0 ? `; ${details.join("; ")}` : ""}.`;
        }
      },
      children: [
        /* @__PURE__ */ jsx(
          "path",
          {
            "data-mark": "connection-edges",
            "data-source-edge-count": params.source_connection_count,
            "data-provided-edge-count": geometry.sourceEdgeCount,
            "data-rendered-edge-count": geometry.renderedEdgeCount,
            "data-self-loop-count": geometry.selfLoopCount,
            "data-parallel-edge-count": geometry.parallelEdgeCount,
            "data-edge-identity": params.edge_identity,
            "data-sample-policy": params.sample_policy,
            d: geometry.edgePath,
            fill: "none",
            stroke: args.palette.cyan,
            strokeOpacity: 0.65,
            strokeWidth: 1.25,
            vectorEffect: "non-scaling-stroke"
          }
        ),
        /* @__PURE__ */ jsx(
          "path",
          {
            "data-mark": "connection-arrowheads",
            "data-arrow-count": geometry.renderedEdgeCount,
            d: geometry.arrowPath,
            fill: args.palette.orange
          }
        ),
        /* @__PURE__ */ jsx(
          "path",
          {
            "data-mark": "connection-nodes",
            "data-source-node-count": geometry.sourceNodeCount,
            "data-rendered-node-count": geometry.renderedNodeCount,
            "data-isolate-count": isolateCount,
            d: geometry.nodePath,
            fill: args.palette.excitatory,
            stroke: colors.background,
            strokeWidth: 1,
            vectorEffect: "non-scaling-stroke"
          }
        ),
        /* @__PURE__ */ jsx("g", { "aria-hidden": "true", "data-mark": "connection-node-labels", children: labels.map((nodeIndex) => {
          const position = geometry.positions[nodeIndex];
          const label = params.nodes[nodeIndex].label;
          return /* @__PURE__ */ jsx(
            "text",
            {
              x: position.x + 6,
              y: position.y - 6,
              fill: colors.foreground,
              fontSize: 9,
              children: label.length > 24 ? `${label.slice(0, 23)}\u2026` : label
            },
            params.nodes[nodeIndex].id
          );
        }) })
      ]
    }
  );
}
var DEGREE_RENDER_BIN_BUDGET = 512;
function DegreeDistributionChart(args, width, height, id) {
  const params = args.params;
  const aggregated = aggregateDegreeBins(
    params.degrees,
    params.node_counts,
    params.values,
    DEGREE_RENDER_BIN_BUDGET
  );
  const frame = makeFrame(width, height);
  const firstDegree = params.degrees[0] ?? 0;
  const finalDegree = params.degrees[params.degrees.length - 1] ?? firstDegree;
  const xDomain = { min: firstDegree - 0.5, max: finalDegree + 0.5 };
  const yDomain = numericDomain(aggregated.bins.map((bin) => bin.value), {
    includeZero: true
  });
  const path = variableHistogramPath(aggregated.bins, xDomain, yDomain, frame);
  const scope = metadataValue(params.snapshot_scope);
  const directionTitle = params.direction === "in" ? "In-degree distribution" : "Out-degree distribution";
  return /* @__PURE__ */ jsx(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: directionTitle,
      description: `${params.degrees.length} ordered ${params.direction}-degree bins over ${params.node_count} declared nodes. Adjacent display bins may be grouped by summing both raw node counts and displayed mass; extrema sampling is never used.`,
      metadata: `${params.node_count} nodes \u2022 ${params.connection_count} connections \u2022 ${aggregated.sourceBinCount} source bins \u2022 ${aggregated.renderedBinCount} rendered bins`,
      note: `Direction: ${params.direction}; normalization: ${params.normalization}; edge counting: ${params.edge_counting}; zero-degree policy: ${params.zero_degree_policy}; sample policy: ${params.sample_policy}. Snapshot: ${formatChartNumber(params.snapshot_time_ms)} ms. Snapshot scope (including MPI ownership): ${scope}.${aggregated.compacted ? ` Adjacent bins were mass-preservingly compacted from ${aggregated.sourceBinCount} to ${aggregated.renderedBinCount}; no extrema selection or interpolation was used.` : " Every source bin is rendered directly."}`,
      accessibleDetails: [
        `Raw node-count mass: ${formatChartNumber(aggregated.sourceNodeMass)} before and ${formatChartNumber(aggregated.renderedNodeMass)} after display grouping.`,
        `Displayed value mass: ${formatChartNumber(aggregated.sourceValueMass)} before and ${formatChartNumber(aggregated.renderedValueMass)} after grouping.`
      ],
      accessibleDetailsLabel: "Degree distribution summary",
      xLabel: `${params.direction === "in" ? "In" : "Out"}-degree`,
      yLabel: params.value_units,
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      sampleCount: params.degrees.length,
      dataRows: {
        key: `${params.direction}-degree-${params.snapshot_time_ms}-${params.degrees.length}`,
        label: `${params.direction === "in" ? "In" : "Out"}-degree bin data`,
        rowCount: params.degrees.length,
        rowAt: (index) => `Degree ${params.degrees[index]}: ${params.node_counts[index]} node${params.node_counts[index] === 1 ? "" : "s"}; displayed value ${formatChartNumber(params.values[index])} ${params.value_units}.`
      },
      children: /* @__PURE__ */ jsx(
        "path",
        {
          "data-mark": "degree-distribution-bars",
          "data-direction": params.direction,
          "data-source-bin-count": aggregated.sourceBinCount,
          "data-rendered-bin-count": aggregated.renderedBinCount,
          "data-source-node-mass": aggregated.sourceNodeMass,
          "data-rendered-node-mass": aggregated.renderedNodeMass,
          "data-compacted": aggregated.compacted ? "true" : "false",
          "data-sample-policy": params.sample_policy,
          d: path,
          fill: params.direction === "in" ? args.palette.cyan : args.palette.orange,
          fillOpacity: 0.82,
          stroke: params.direction === "in" ? args.palette.cyan : args.palette.orange,
          strokeWidth: 0.6,
          vectorEffect: "non-scaling-stroke"
        }
      )
    }
  );
}
var DELAY_RENDER_BIN_BUDGET = 4096;
function DelayDistributionChart(args, width, height, id) {
  const params = args.params;
  const aggregated = aggregateUniformHistogramBins(
    params.bin_centers_ms,
    params.delay_counts,
    params.values,
    params.bin_width_ms,
    params.normalization,
    DELAY_RENDER_BIN_BUDGET
  );
  const frame = makeFrame(width, height);
  const xDomain = { min: params.window_start_ms, max: params.window_stop_ms };
  const yDomain = numericDomain(aggregated.bins.map((bin) => bin.value), {
    includeZero: true
  });
  const path = variableHistogramPath(aggregated.bins, xDomain, yDomain, frame);
  const scope = metadataValue(params.snapshot_scope);
  return /* @__PURE__ */ jsx(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: "Connection-delay distribution",
      description: `${params.values.length} exact ${params.bin_width_ms} ms delay bins with raw connection counts retained alongside ${params.normalization} values. Adjacent visual compaction preserves raw counts and displayed mass.`,
      metadata: `${aggregated.sourceRawCount} connections \u2022 ${aggregated.sourceBinCount} source bins \u2022 ${aggregated.renderedBinCount} rendered bins \u2022 snapshot ${formatChartNumber(params.snapshot_time_ms)} ms`,
      note: `Delay units: ${params.delay_units}; normalization: ${params.normalization}; aggregation: ${params.aggregation}; binning: ${params.binning}; sample policy: ${params.sample_policy}; window [${formatChartNumber(params.window_start_ms)}, ${formatChartNumber(params.window_stop_ms)}) ms. Snapshot scope (including MPI ownership): ${scope}.${aggregated.compacted ? ` Adjacent bins were mass-preservingly compacted from ${aggregated.sourceBinCount} to ${aggregated.renderedBinCount}; no extrema sampling was used.` : " Every source bin is rendered directly."}`,
      accessibleDetails: [
        `Raw delay-event count is ${aggregated.sourceRawCount} before and ${aggregated.renderedRawCount} after display grouping.`
      ],
      accessibleDetailsLabel: "Delay distribution summary",
      xLabel: "Connection delay (ms)",
      yLabel: params.value_units,
      xDomain,
      yDomain,
      frame,
      colors: chartColors(args.palette, args.themeMode),
      sampleCount: params.values.length,
      dataRows: {
        key: `delay-${params.snapshot_time_ms}-${params.values.length}`,
        label: "Connection-delay bin data",
        rowCount: params.values.length,
        rowAt: (index) => {
          const left = params.bin_centers_ms[index] - params.bin_width_ms / 2;
          const right = params.bin_centers_ms[index] + params.bin_width_ms / 2;
          return `Delay bin [${formatChartNumber(left)}, ${formatChartNumber(right)}) ms: ${params.delay_counts[index]} connection${params.delay_counts[index] === 1 ? "" : "s"}; displayed value ${formatChartNumber(params.values[index])} ${params.value_units}.`;
        }
      },
      children: /* @__PURE__ */ jsx(
        "path",
        {
          "data-mark": "delay-distribution-bars",
          "data-source-bin-count": aggregated.sourceBinCount,
          "data-rendered-bin-count": aggregated.renderedBinCount,
          "data-source-delay-count": aggregated.sourceRawCount,
          "data-rendered-delay-count": aggregated.renderedRawCount,
          "data-compacted": aggregated.compacted ? "true" : "false",
          "data-sample-policy": params.sample_policy,
          d: path,
          fill: args.palette.teal,
          fillOpacity: 0.82,
          stroke: args.palette.teal,
          strokeWidth: 0.6,
          vectorEffect: "non-scaling-stroke"
        }
      )
    }
  );
}
function SpatialMap2DChart(args, width, height, id) {
  const params = args.params;
  const frame = makeFrame(width, height);
  const extent = params.extent;
  const center = params.center;
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
  return /* @__PURE__ */ jsxs(
    ChartShell,
    {
      id,
      skill: args.skill,
      scene: args.scene,
      title: "2D spatial node map",
      description: `${params.nodes.length} typed nodes at their exact supplied x/y coordinates in ${params.coordinate_units}. One common scale is used for both axes; coordinates are neither jittered nor independently stretched. Marker radius is fixed in screen space and does not encode physical node size.`,
      metadata: `${params.nodes.length} nodes \u2022 extent ${formatChartNumber(extent[0])}\xD7${formatChartNumber(extent[1])} ${params.coordinate_units} \u2022 center (${formatChartNumber(center[0])}, ${formatChartNumber(center[1])})`,
      note: `Position scope (including MPI ownership): ${scope}. Boundary edge wrap: ${params.edge_wrap ? "enabled (periodic boundary)" : "disabled"}. Marker size: ${params.marker_size}; it is not a physical measurement. The declared boundary is shown exactly, x/y use equal scale, and no point is sampled, aggregated, projected, or jittered.`,
      accessibleDetails: [
        `${params.nodes.length} source positions and ${params.nodes.length} rendered positions; none omitted.`,
        `Node id range in declared order: ${params.nodes[0]?.id ?? "none"}\u2026${params.nodes[params.nodes.length - 1]?.id ?? "none"}.`
      ],
      accessibleDetailsLabel: "Spatial map summary",
      xLabel: `x (${params.coordinate_units})`,
      yLabel: `y (${params.coordinate_units})`,
      xDomain: domains.xDomain,
      yDomain: domains.yDomain,
      frame,
      colors,
      sampleCount: params.nodes.length,
      dataRows: {
        key: `spatial-${metadataValue(params.position_scope)}-${params.nodes.length}`,
        label: "Spatial node-coordinate data",
        rowCount: params.nodes.length,
        rowAt: (index) => {
          const node = params.nodes[index];
          return `Node ${node.id}: ${node.label}; x ${formatChartNumber(node.x)} ${params.coordinate_units}; y ${formatChartNumber(node.y)} ${params.coordinate_units}.`;
        }
      },
      children: [
        /* @__PURE__ */ jsx(
          "rect",
          {
            "data-mark": "spatial-boundary",
            "data-edge-wrap": params.edge_wrap ? "true" : "false",
            x: boundaryLeft,
            y: boundaryTop,
            width: boundaryRight - boundaryLeft,
            height: boundaryBottom - boundaryTop,
            fill: "none",
            stroke: args.palette.amber,
            strokeWidth: 1.25,
            strokeDasharray: params.edge_wrap ? "5 3" : void 0,
            vectorEffect: "non-scaling-stroke"
          }
        ),
        /* @__PURE__ */ jsx(
          "path",
          {
            "data-mark": "spatial-nodes",
            "data-source-node-count": params.nodes.length,
            "data-rendered-node-count": params.nodes.length,
            "data-marker-size": params.marker_size,
            "data-jitter": "none",
            d: nodePath,
            fill: args.palette.cyan
          }
        ),
        /* @__PURE__ */ jsx("g", { "aria-hidden": "true", "data-mark": "spatial-node-labels", children: labels.map((nodeIndex) => {
          const node = params.nodes[nodeIndex];
          return /* @__PURE__ */ jsx(
            "text",
            {
              x: chartX(node.x, domains.xDomain, frame) + 5,
              y: chartY(node.y, domains.yDomain, frame) - 5,
              fill: colors.foreground,
              fontSize: 9,
              children: node.label.length > 24 ? `${node.label.slice(0, 23)}\u2026` : node.label
            },
            node.id
          );
        }) })
      ]
    }
  );
}
function UnsupportedReferenceChart({ skill, scene }) {
  return /* @__PURE__ */ jsxs("div", { role: "alert", className: "cortexel-reference-chart-unsupported", children: [
    "Cortexel has no canonical SVG chart for skill \u201C",
    skill ?? "(missing skill)",
    "\u201D",
    " ",
    "on scene \u201C",
    scene,
    "\u201D. Use that skill's native scene or checked host renderer."
  ] });
}
function ReferenceChartScene(args) {
  const reactId = useId();
  const id = `cortexel-chart-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const width = normalizeChartDimension(
    args.width,
    REFERENCE_CHART_DIMENSIONS.width,
    REFERENCE_CHART_DIMENSIONS.minWidth
  );
  const height = normalizeChartDimension(
    args.height,
    REFERENCE_CHART_DIMENSIONS.height,
    REFERENCE_CHART_DIMENSIONS.minHeight
  );
  switch (args.skill) {
    case "nest.voltage_trace":
      return TraceChart(args, width, height, id);
    case "nest.astrocyte_dynamics":
      return AstrocyteChart(args, width, height, id);
    case "nest.spike_raster":
      return SpikeRasterChart(args, width, height, id);
    case "nest.population_rate":
      return PopulationRateChart(args, width, height, id);
    case "nest.rate_response":
      return RateResponseChart(args, width, height, id);
    case "nest.isi_distribution":
      return IsiChart(args, width, height, id);
    case "nest.psth":
      return PsthChart(args, width, height, id);
    case "nest.correlogram":
      return CorrelogramChart(args, width, height, id);
    case "nest.weight_histogram":
      return WeightHistogramChart(args, width, height, id);
    case "nest.plasticity_dynamics":
      return PlasticityChart(args, width, height, id);
    case "nest.phase_plane":
      return PhasePlaneChart(args, width, height, id);
    case "nest.connection_graph":
      return ConnectionGraphChart(args, width, height, id);
    case "nest.adjacency_matrix":
    case "nest.weight_matrix":
    case "nest.delay_matrix":
      return MatrixChart(args, width, height, id);
    case "nest.in_degree_distribution":
    case "nest.out_degree_distribution":
      return DegreeDistributionChart(args, width, height, id);
    case "nest.delay_distribution":
      return DelayDistributionChart(args, width, height, id);
    case "nest.spatial_map_2d":
      return SpatialMap2DChart(args, width, height, id);
    default:
      return /* @__PURE__ */ jsx(UnsupportedReferenceChart, { skill: args.skill, scene: args.scene });
  }
}

// react/charts/ReferenceVizSpecFigure.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function ReferenceVizSpecFigure({
  spec,
  skillId,
  active = true,
  activePalette,
  width,
  height,
  onError,
  onInvocationError
}) {
  return /* @__PURE__ */ jsx2(
    VizSpecRenderer,
    {
      spec,
      skillId,
      active,
      activePalette,
      onError,
      onInvocationError,
      captionPlacement: "footer",
      renderScene: (args) => /* @__PURE__ */ jsx2(ReferenceChartScene, { ...args, width, height })
    }
  );
}
export {
  MATRIX_VALUE_LEVELS_PER_SIGN,
  REFERENCE_CHART_DIMENSIONS,
  REFERENCE_CHART_SKILLS,
  ReferenceChartScene,
  ReferenceVizSpecFigure,
  aggregateDegreeBins,
  aggregateUniformHistogramBins,
  binnedStepPath,
  boundedExtremaIndices,
  boundedStemPointPaths,
  chartPlotHeight,
  chartPlotWidth,
  chartX,
  chartY,
  circleTopologyGeometry,
  equalAspectDomains,
  formatChartNumber,
  histogramBarPath,
  histogramDomain,
  linePath,
  matrixValueBucketPaths,
  nestedNumericDomain,
  normalizeChartDimension,
  numericDomain,
  phasePlaneArrowPath,
  phasePlaneSamples,
  pointPath,
  rasterTickPath,
  scaleToRange,
  sortedLinePath,
  stemPath,
  tickValues,
  variableHistogramPath
};
//# sourceMappingURL=charts.js.map