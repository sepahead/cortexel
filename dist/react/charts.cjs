"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// react/charts/index.ts
var charts_exports = {};
__export(charts_exports, {
  MATRIX_VALUE_LEVELS_PER_SIGN: () => MATRIX_VALUE_LEVELS_PER_SIGN,
  REFERENCE_CHART_DIMENSIONS: () => REFERENCE_CHART_DIMENSIONS,
  REFERENCE_CHART_SKILLS: () => REFERENCE_CHART_SKILLS,
  ReferenceChartScene: () => ReferenceChartScene,
  ReferenceVizSpecFigure: () => ReferenceVizSpecFigure,
  aggregateDegreeBins: () => aggregateDegreeBins,
  aggregateUniformHistogramBins: () => aggregateUniformHistogramBins,
  binnedStepPath: () => binnedStepPath,
  boundedExtremaIndices: () => boundedExtremaIndices,
  boundedStemPointPaths: () => boundedStemPointPaths,
  chartPlotHeight: () => chartPlotHeight,
  chartPlotWidth: () => chartPlotWidth,
  chartX: () => chartX,
  chartY: () => chartY,
  circleTopologyGeometry: () => circleTopologyGeometry,
  equalAspectDomains: () => equalAspectDomains,
  formatChartNumber: () => formatChartNumber,
  histogramBarPath: () => histogramBarPath,
  histogramDomain: () => histogramDomain,
  linePath: () => linePath,
  matrixValueBucketPaths: () => matrixValueBucketPaths,
  nestedNumericDomain: () => nestedNumericDomain,
  normalizeChartDimension: () => normalizeChartDimension,
  numericDomain: () => numericDomain,
  phasePlaneArrowPath: () => phasePlaneArrowPath,
  phasePlaneSamples: () => phasePlaneSamples,
  pointPath: () => pointPath,
  rasterTickPath: () => rasterTickPath,
  scaleToRange: () => scaleToRange,
  sortedLinePath: () => sortedLinePath,
  stemPath: () => stemPath,
  tickValues: () => tickValues,
  variableHistogramPath: () => variableHistogramPath
});
module.exports = __toCommonJS(charts_exports);

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
function nodeKey(id2) {
  return `${typeof id2}:${String(id2)}`;
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
var import_react = require("react");

// core/safeRuntime.ts
function safeErrorMessage(error) {
  try {
    if (typeof error === "string") {
      return safeDiagnosticText(error, 240);
    }
    if (error !== null && (typeof error === "object" || typeof error === "function")) {
      const message = Object.getOwnPropertyDescriptor(error, "message");
      if (message && "value" in message && typeof message.value === "string") {
        return safeDiagnosticText(message.value, 240);
      }
    }
  } catch {
  }
  return "unknown error";
}
var PUBLIC_DIAGNOSTIC_LIMITS = Object.freeze({
  maxIssues: 32,
  maxPathLength: 240,
  maxMessageLength: 500,
  maxTotalLength: 8192,
  maxUnknownKeySamples: 8
});
var SAFE_DISPLAY_STRING_PATTERN = /^[^\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]*$/u;
var TYPED_ARRAY_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  "length"
)?.get;
function clipText(value, max) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}\u2026`;
}
function safeDiagnosticText(value, max) {
  const boundedSource = clipText(value, max);
  const escaped = boundedSource.replace(
    /[\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
  return clipText(escaped, max);
}
function safePrimitiveDiagnostic(value, max = 120) {
  let text;
  switch (typeof value) {
    case "string":
      text = value;
      break;
    case "number":
      text = Object.is(value, -0) ? "-0" : `${value}`;
      break;
    case "bigint":
      text = `${value}`;
      break;
    case "boolean":
      text = value ? "true" : "false";
      break;
    case "undefined":
      text = "undefined";
      break;
    case "symbol":
      text = "<symbol>";
      break;
    case "function":
      text = "<function>";
      break;
    case "object":
      text = value === null ? "null" : "<object>";
      break;
    default:
      text = "<unknown>";
  }
  return safeDiagnosticText(text, max);
}
function printablePathSegment(value) {
  return safePrimitiveDiagnostic(value, 80);
}
function boundValidationIssue(issue) {
  const path = clipText(
    issue.path?.map(printablePathSegment).join(".") || "(root)",
    PUBLIC_DIAGNOSTIC_LIMITS.maxPathLength
  );
  let message;
  if (issue.code === "unrecognized_keys" && Array.isArray(issue.keys)) {
    const samples = issue.keys.slice(0, PUBLIC_DIAGNOSTIC_LIMITS.maxUnknownKeySamples).map((key) => JSON.stringify(safePrimitiveDiagnostic(key, 60)));
    const omitted = issue.keys.length - samples.length;
    message = `unrecognized keys (${issue.keys.length}): ${samples.join(", ")}` + (omitted > 0 ? `; ${omitted} more omitted` : "");
  } else {
    message = typeof issue.message === "string" ? issue.message : "validation failed";
  }
  return {
    path,
    message: safeDiagnosticText(message, PUBLIC_DIAGNOSTIC_LIMITS.maxMessageLength)
  };
}
function formatValidationIssues(issues) {
  const output = [];
  let total = 0;
  const count = Math.min(issues.length, PUBLIC_DIAGNOSTIC_LIMITS.maxIssues);
  for (let index = 0; index < count; index++) {
    const bounded = boundValidationIssue(issues[index]);
    const line = `${bounded.path}: ${bounded.message}`;
    if (total + line.length > PUBLIC_DIAGNOSTIC_LIMITS.maxTotalLength) {
      output.push("(root): additional validation detail omitted by the diagnostic budget");
      return output;
    }
    output.push(line);
    total += line.length;
  }
  if (issues.length > count) {
    output.push(`(root): ${issues.length - count} additional validation issues omitted`);
  }
  return output;
}
function readOwnEnumerableDataProperty(input, key) {
  if (input === null || typeof input !== "object") return { kind: "absent" };
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor) return { kind: "absent" };
  return "value" in descriptor && descriptor.enumerable ? { kind: "value", value: descriptor.value } : { kind: "invalid" };
}

// react/charts/ReferenceChartScene.tsx
var import_jsx_runtime = require("react/jsx-runtime");
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
  const [page, setPage] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);
  const start = page * safePageSize;
  const stop = Math.min(safeRowCount, start + safePageSize);
  const rows = new Array(stop - start);
  for (let index = start; index < stop; index++) {
    rows[index - start] = { index, text: rowAt(index) };
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { "aria-live": "polite", "aria-atomic": "true", children: safeRowCount === 0 ? `${label}: no rows.` : `${label}: rows ${start + 1}\u2013${stop} of ${safeRowCount}; page ${page + 1} of ${pageCount}.` }),
        rows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { start: start + 1, children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("bdi", { dir: "auto", style: { unicodeBidi: "isolate" }, children: row.text }) }, row.index)) }),
        pageCount > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { "aria-label": `${label} pages`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
  id: id2,
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
  const titleId = `${id2}-title`;
  const descriptionId = `${id2}-description`;
  const xTicks = requestedXTicks ?? tickValues(xDomain);
  const yTicks = requestedYTicks ?? tickValues(yDomain);
  const plotWidth = chartPlotWidth(frame);
  const plotHeight = chartPlotHeight(frame);
  const legendEntries = legend.slice(0, 8);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "figure",
    {
      className: "cortexel-reference-chart",
      "data-skill": skill,
      "data-scene": scene,
      "data-sample-count": sampleCount,
      "data-plot-width": plotWidth,
      style: { margin: 0, width: frame.width, maxWidth: "100%" },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { id: titleId, children: title }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("desc", { id: descriptionId, children: description }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: frame.width, height: frame.height, fill: colors.background }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
              metadata && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", { x: frame.left, y: 51, fill: colors.muted, fontSize: 11, children: metadata }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { "aria-hidden": "true", children: [
                xTicks.map((tick, index) => {
                  const x = chartX(tick, xDomain, frame);
                  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
                  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
              legendEntries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { "aria-label": "Series legend", children: [
                legendEntries.map((entry, index) => {
                  const y = frame.top + 15 + index * 18;
                  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
                legend.length > legendEntries.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
        dataRows && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        (note || accessibleDetails.length > 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
              note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: note }),
              accessibleDetails.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { "aria-label": accessibleDetailsLabel, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
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
function TraceChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartShell,
    {
      id: id2,
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
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { fill: "none", children: params.series.map((series, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function AstrocyteChart(args, width, height, id2) {
  const params = args.params;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = numericDomain(params.ca_trace, { includeZero: true });
  const frame = makeFrame(width, height);
  const variable = declaredInput(args, "recorded_variable") ?? "Ca\xB2\u207A/IP\u2083";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartShell,
    {
      id: id2,
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
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function SpikeRasterChart(args, width, height, id2) {
  const params = args.params;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = numericDomain(params.senders);
  const frame = makeFrame(width, height);
  const senderCount = new Set(params.senders).size;
  const senderTicks = sampledUniqueValues(params.senders);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartShell,
    {
      id: id2,
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
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function PopulationRateChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartShell,
    {
      id: id2,
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
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { fill: "none", children: params.series.map((series, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function RateResponseChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    ChartShell,
    {
      id: id2,
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
  id: id2,
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    ChartShell,
    {
      id: id2,
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        alignmentLabel && zeroInDomain && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { "data-mark": "alignment-zero", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
function IsiChart(args, width, height, id2) {
  const params = args.params;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    HistogramChart,
    {
      args,
      width,
      height,
      id: id2,
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
function PsthChart(args, width, height, id2) {
  const params = args.params;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    HistogramChart,
    {
      args,
      width,
      height,
      id: id2,
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
function CorrelogramChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    ChartShell,
    {
      id: id2,
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { "data-mark": "zero-lag-reference", "data-zero-bin-present": params.lags_ms.includes(0), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", { x: zeroX + 5, y: frame.top + 13, fill: args.palette.amber, fontSize: 10, children: "lag 0 reference" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function WeightHistogramChart(args, width, height, id2) {
  const params = args.params;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    HistogramChart,
    {
      args,
      width,
      height,
      id: id2,
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
function PlasticityChart(args, width, height, id2) {
  const params = args.params;
  const xDomain = numericDomain(params.times_ms);
  const yDomain = numericDomain(params.weights);
  const frame = makeFrame(width, height);
  const synapseModel = declaredInput(args, "synapse_model");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartShell,
    {
      id: id2,
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
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function PhasePlaneChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartShell,
    {
      id: id2,
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
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function MatrixChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    ChartShell,
    {
      id: id2,
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
          const units2 = skill === "nest.weight_matrix" ? params.weight_units : params.delay_units;
          return `Present-cell record ${cellIndex + 1} of ${params.cells.length}: target node ID ${cell.target_id} at declared row ${declaredRow}, source node ID ${cell.source_id} at declared column ${declaredColumn}; ${cell.connection_count} connection${cell.connection_count === 1 ? "" : "s"}; displayed value ${formatChartNumber(measured.value)} ${units2}; aggregation ${params.aggregation}.`;
        }
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
                return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { "aria-hidden": "true", "data-mark": "matrix-axis-identities", children: [
          sourceTicks.map((axisIndex) => {
            const x = frame.left + (axisIndex + 0.5) / params.source_ids.length * chartPlotWidth(frame);
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        showLegend && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { "aria-label": "Matrix value legend", "data-mark": "matrix-value-legend", children: [
          ["absent: no connection", colors.grid, 0.3],
          ["present zero", args.palette.inkDim, 0.58],
          ["negative", args.palette.inhibitory, 1],
          ["positive", args.palette.excitatory, 1]
        ].map(([label, color, opacity], legendIndex) => {
          const y = frame.top + legendIndex * 22;
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function ConnectionGraphChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    ChartShell,
    {
      id: id2,
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "path",
          {
            "data-mark": "connection-arrowheads",
            "data-arrow-count": geometry.renderedEdgeCount,
            d: geometry.arrowPath,
            fill: args.palette.orange
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { "aria-hidden": "true", "data-mark": "connection-node-labels", children: labels.map((nodeIndex) => {
          const position = geometry.positions[nodeIndex];
          const label = params.nodes[nodeIndex].label;
          return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function DegreeDistributionChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartShell,
    {
      id: id2,
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
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function DelayDistributionChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartShell,
    {
      id: id2,
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
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
function SpatialMap2DChart(args, width, height, id2) {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    ChartShell,
    {
      id: id2,
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { "aria-hidden": "true", "data-mark": "spatial-node-labels", children: labels.map((nodeIndex) => {
          const node = params.nodes[nodeIndex];
          return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { role: "alert", className: "cortexel-reference-chart-unsupported", children: [
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
  const reactId = (0, import_react.useId)();
  const id2 = `cortexel-chart-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
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
      return TraceChart(args, width, height, id2);
    case "nest.astrocyte_dynamics":
      return AstrocyteChart(args, width, height, id2);
    case "nest.spike_raster":
      return SpikeRasterChart(args, width, height, id2);
    case "nest.population_rate":
      return PopulationRateChart(args, width, height, id2);
    case "nest.rate_response":
      return RateResponseChart(args, width, height, id2);
    case "nest.isi_distribution":
      return IsiChart(args, width, height, id2);
    case "nest.psth":
      return PsthChart(args, width, height, id2);
    case "nest.correlogram":
      return CorrelogramChart(args, width, height, id2);
    case "nest.weight_histogram":
      return WeightHistogramChart(args, width, height, id2);
    case "nest.plasticity_dynamics":
      return PlasticityChart(args, width, height, id2);
    case "nest.phase_plane":
      return PhasePlaneChart(args, width, height, id2);
    case "nest.connection_graph":
      return ConnectionGraphChart(args, width, height, id2);
    case "nest.adjacency_matrix":
    case "nest.weight_matrix":
    case "nest.delay_matrix":
      return MatrixChart(args, width, height, id2);
    case "nest.in_degree_distribution":
    case "nest.out_degree_distribution":
      return DegreeDistributionChart(args, width, height, id2);
    case "nest.delay_distribution":
      return DelayDistributionChart(args, width, height, id2);
    case "nest.spatial_map_2d":
      return SpatialMap2DChart(args, width, height, id2);
    default:
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnsupportedReferenceChart, { skill: args.skill, scene: args.scene });
  }
}

// react/VizSpecRenderer.tsx
var import_react2 = require("react");

// core/provenance.ts
var CONSERVATIVE_PROVENANCE = Object.freeze({
  calibrated_posterior: false,
  advisory_only: true,
  is_paper_local_evidence: false,
  synthetic: false
});
var HONESTY_POLICY = Object.freeze({
  version: "2",
  calibratedPosteriorAccepted: false,
  captionRequiredWhenAny: Object.freeze([
    "synthetic=true",
    "calibrated_posterior=false",
    "advisory_only=true",
    "is_paper_local_evidence=false"
  ]),
  syntheticSourceMatch: Object.freeze({
    caseInsensitive: true,
    equals: Object.freeze(["synthetic_test"]),
    prefixes: Object.freeze(["synthetic"])
  }),
  precedence: Object.freeze([
    "synthetic",
    "advisory_only",
    "not_paper_local",
    "not_calibrated"
  ]),
  templates: Object.freeze({
    synthetic: "Schematic \u2014 illustrative synthetic data, not measured.",
    advisory_only: "Advisory \u2014 advisory evidence only; not a calibrated posterior.",
    not_paper_local: "Advisory \u2014 not paper-local evidence; candidate ranking only.",
    not_calibrated: "Illustrative \u2014 not a calibrated posterior."
  }),
  callerCaption: "append_only_unverified",
  callerCaptionLabel: "Caller note (unverified):",
  callerCaptionControls: "escape C0/C1, bidi, zero-width, and BOM controls",
  bidiIsolationRequired: true,
  weakSkillDisclosure: "prepend"
});
function requiresHonestyCaption(p) {
  return !!p.synthetic || !p.calibrated_posterior || p.advisory_only || !p.is_paper_local_evidence;
}
function mandatoryDisclosure(p) {
  if (p.synthetic || p.source.toLowerCase() === "synthetic_test" || p.source.toLowerCase().startsWith("synthetic")) {
    return HONESTY_POLICY.templates.synthetic;
  }
  if (p.advisory_only) {
    return HONESTY_POLICY.templates.advisory_only;
  }
  if (!p.is_paper_local_evidence) {
    return HONESTY_POLICY.templates.not_paper_local;
  }
  return HONESTY_POLICY.templates.not_calibrated;
}
function defaultHonestyCaption(p) {
  const disclosure = mandatoryDisclosure(p);
  const note = p.caption?.trim();
  return note ? `${disclosure} Caller note (unverified): ${safeDiagnosticText(note, 500)}` : disclosure;
}

// core/vizSpec.ts
var import_zod = require("zod");

// core/designLaws.ts
var SCENE_NAMES = Object.freeze([
  "live-activity",
  "cortical-column",
  "stdp",
  "spike-raster",
  "network-topology",
  "voltage-trace",
  "phase-plane",
  "brunel-network",
  "fi-curve",
  "isi-distribution",
  "psth",
  "population-rate",
  "correlogram",
  "weight-histogram",
  "connection-matrix",
  "degree-distribution",
  "delay-distribution",
  "spatial-map-2d",
  "knowledge-graph-3d"
]);

// core/vizSpec.ts
var CORTEXEL_SPEC_VERSION = "1.3.0";
var CORTEXEL_JSON_LIMITS = Object.freeze({
  maxDepth: 32,
  maxNodes: 5e5,
  maxObjectKeys: 1e4,
  maxStringLength: 1e5,
  maxTotalStringLength: 5e6
});
var CORTEXEL_JSON_POLICY = Object.freeze({
  finiteNumbersOnly: true,
  rejectNegativeZero: true,
  plainObjectsOnly: true,
  enumerableDataPropertiesOnly: true,
  rejectAccessors: true,
  rejectSymbolKeys: true,
  rejectSparseArrays: true,
  rejectNamedArrayProperties: true,
  rejectCircularReferences: true,
  rejectRawJson: true,
  duplicateObjectMemberNames: "reject before materialization",
  rawJsonParsingPrecondition: "detect duplicate member names in raw JSON text before converting to an object",
  rejectedObjectKeys: Object.freeze(["__proto__"])
});
var STRING_NORMALIZATION_POLICY = Object.freeze({
  version: "1",
  lengthModel: "ECMAScript UTF-16 code units",
  portableLengthKeyword: "x-cortexel-max-utf16-code-units",
  trimAlgorithm: "ECMA-262 String.prototype.trim / TrimString",
  trimCodePointsHex: Object.freeze([
    "0009-000D",
    "0020",
    "00A0",
    "1680",
    "2000-200A",
    "2028",
    "2029",
    "202F",
    "205F",
    "3000",
    "FEFF"
  ]),
  regexDialect: "ECMA-262 Unicode-aware regular expressions",
  unicodeNormalization: "none",
  wellFormedUnicodeOnly: true,
  displayStringPattern: SAFE_DISPLAY_STRING_PATTERN.source,
  displayStringControls: "reject C0/C1, bidi, zero-width, and BOM controls"
});
var NUMERIC_MODEL_POLICY = Object.freeze({
  version: "1",
  representation: "IEEE-754 binary64",
  coerceBeforeValidation: true,
  finiteOnly: true,
  negativeZeroRejected: true,
  integerIdentityFields: "safe integers only",
  constraintEvaluationUsesCoercedValues: true
});
var JSON_BUDGET_SEMANTICS = Object.freeze({
  version: "1",
  scope: "one snapshot of the complete invocation envelope",
  rootDepth: 0,
  nodeCount: "every scalar, array, and object value; property names are not nodes",
  objectKeyCount: "per object",
  stringLengthModel: "UTF-16 code units",
  totalStringLength: "all string values plus every object property name",
  repeatedReference: "counted once per JSON occurrence; cycles reject"
});
var JSON_PARAMS_PORTABLE_SCHEMA = Object.freeze({
  type: "object",
  maxProperties: CORTEXEL_JSON_LIMITS.maxObjectKeys,
  propertyNames: Object.freeze({
    type: "string",
    maxLength: CORTEXEL_JSON_LIMITS.maxStringLength,
    "x-cortexel-max-utf16-code-units": CORTEXEL_JSON_LIMITS.maxStringLength,
    not: Object.freeze({ const: "__proto__" })
  }),
  additionalProperties: true
});
var DECLARED_INPUTS_PORTABLE_SCHEMA = Object.freeze({
  type: "object",
  maxProperties: 64,
  propertyNames: Object.freeze({
    type: "string",
    minLength: 1,
    maxLength: 80,
    "x-cortexel-max-utf16-code-units": 80,
    allOf: Object.freeze([
      Object.freeze({ pattern: "^\\S(?:[\\s\\S]*\\S)?$" }),
      Object.freeze({ pattern: SAFE_DISPLAY_STRING_PATTERN.source })
    ])
  }),
  additionalProperties: Object.freeze({
    anyOf: Object.freeze([
      Object.freeze({
        type: "string",
        maxLength: 5e3,
        "x-cortexel-max-utf16-code-units": 5e3,
        pattern: SAFE_DISPLAY_STRING_PATTERN.source
      }),
      Object.freeze({ type: "number" }),
      Object.freeze({ type: "boolean", const: true })
    ])
  })
});
var ENVELOPE_NORMALIZATION_POLICY = Object.freeze({
  version: "1",
  evaluationOrder: Object.freeze([
    "parse/coerce every JSON number to IEEE-754 binary64",
    "validate and snapshot the raw envelope with exact-JSON budgets",
    "normalize fields carrying x-cortexel-normalize",
    "materialize envelope defaults",
    "validate the envelope JSON Schema",
    "validate skill params, provenance values, and portable constraints",
    "derive and display the mandatory honesty caption"
  ]),
  vizSpecDefaults: Object.freeze({
    params: Object.freeze({}),
    mode: "interactive",
    themeMode: "dark"
  }),
  honestyDefaults: Object.freeze({
    calibrated_posterior: false,
    advisory_only: true,
    is_paper_local_evidence: false,
    synthetic: false
  }),
  jsonSchemaDefaultsAreAnnotations: true,
  missingHonestyFlagsMustUseConservativeDefaults: true
});
var normalizedRecordKey = import_zod.z.string().min(1).max(80).regex(
  /^\S(?:[\s\S]*\S)?$/,
  "record keys must already be trimmed and contain a non-whitespace character"
).regex(SAFE_DISPLAY_STRING_PATTERN, "record keys must not contain display control characters");
function cloneExactJson(root) {
  const ancestors = /* @__PURE__ */ new WeakSet();
  let visited = 0;
  let totalStringLength = 0;
  const fail = (path, message) => ({
    ok: false,
    issue: { path, message }
  });
  function inspectString(value, path) {
    if (value.length > CORTEXEL_JSON_LIMITS.maxStringLength) {
      return {
        path,
        message: `JSON string exceeds ${CORTEXEL_JSON_LIMITS.maxStringLength} characters`
      };
    }
    totalStringLength += value.length;
    if (totalStringLength > CORTEXEL_JSON_LIMITS.maxTotalStringLength) {
      return {
        path,
        message: `JSON strings exceed ${CORTEXEL_JSON_LIMITS.maxTotalStringLength} total characters`
      };
    }
    for (let index = 0; index < value.length; index++) {
      const codeUnit = value.charCodeAt(index);
      if (codeUnit >= 55296 && codeUnit <= 56319) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 56320 && next <= 57343)) {
          return { path, message: "strings must not contain an unpaired high surrogate" };
        }
        index += 1;
      } else if (codeUnit >= 56320 && codeUnit <= 57343) {
        return { path, message: "strings must not contain an unpaired low surrogate" };
      }
    }
    return null;
  }
  function visit(value, path, depth) {
    visited += 1;
    if (visited > CORTEXEL_JSON_LIMITS.maxNodes) {
      return fail(path, `JSON value exceeds ${CORTEXEL_JSON_LIMITS.maxNodes} nodes`);
    }
    if (depth > CORTEXEL_JSON_LIMITS.maxDepth) {
      return fail(path, `JSON nesting exceeds ${CORTEXEL_JSON_LIMITS.maxDepth} levels`);
    }
    if (value === null || typeof value === "boolean") {
      return { ok: true, value };
    }
    if (typeof value === "string") {
      const issue = inspectString(value, path);
      return issue ? { ok: false, issue } : { ok: true, value };
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return fail(path, "JSON numbers must be finite (NaN/Infinity are not allowed)");
      }
      return Object.is(value, -0) ? fail(path, "negative zero is not stable through JSON.stringify") : { ok: true, value };
    }
    if (typeof value !== "object") {
      return fail(path, `value of type '${typeof value}' is not JSON-serializable`);
    }
    const object = value;
    if (ancestors.has(object)) return fail(path, "circular JSON reference");
    ancestors.add(object);
    try {
      const isRawJson = JSON.isRawJSON;
      if (isRawJson?.(value)) {
        return fail(path, "JSON.rawJSON values are not literal objects and are not allowed");
      }
      if (Array.isArray(value)) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
        if (!lengthDescriptor || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
          return fail(path, "JSON arrays must have an ordinary non-negative length");
        }
        const length = lengthDescriptor.value;
        if (length > CORTEXEL_JSON_LIMITS.maxNodes - visited) {
          return fail(path, `JSON value exceeds ${CORTEXEL_JSON_LIMITS.maxNodes} nodes`);
        }
        const ownKeys2 = Reflect.ownKeys(value);
        for (const key of ownKeys2) {
          if (key === "length") continue;
          if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length) {
            return fail(
              path,
              "JSON arrays may not carry symbol, named, or out-of-range properties"
            );
          }
        }
        const clone2 = new Array(length);
        for (let i = 0; i < length; i++) {
          const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
          if (!descriptor) {
            return fail([...path, i], "sparse arrays are not allowed in exact JSON");
          }
          if (!("value" in descriptor) || !descriptor.enumerable) {
            return fail(
              [...path, i],
              "JSON array entries must be enumerable data properties, not accessors"
            );
          }
          const nested = visit(descriptor.value, [...path, i], depth + 1);
          if (!nested.ok) return nested;
          clone2[i] = nested.value;
        }
        return { ok: true, value: clone2 };
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail(path, "exact JSON must contain plain objects, not class instances");
      }
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.some((key) => typeof key === "symbol")) {
        return fail(path, "JSON objects may not contain symbol keys");
      }
      const keys = ownKeys;
      if (keys.length > CORTEXEL_JSON_LIMITS.maxObjectKeys) {
        return fail(path, `JSON object exceeds ${CORTEXEL_JSON_LIMITS.maxObjectKeys} keys`);
      }
      const clone = {};
      for (const key of keys) {
        if (key === "__proto__") {
          return fail(
            [...path, key],
            "the '__proto__' key is not preserved by the runtime schema parser"
          );
        }
        const keyIssue = inspectString(key, [...path, key]);
        if (keyIssue) return { ok: false, issue: keyIssue };
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          return fail(
            [...path, key],
            "JSON object fields must be enumerable data properties, not accessors"
          );
        }
        const nested = visit(descriptor.value, [...path, key], depth + 1);
        if (!nested.ok) return nested;
        Object.defineProperty(clone, key, {
          value: nested.value,
          enumerable: true,
          writable: true,
          configurable: true
        });
      }
      return { ok: true, value: clone };
    } finally {
      ancestors.delete(object);
    }
  }
  return visit(root, [], 0);
}
var JsonParamsSchema = import_zod.z.unknown().transform((params, ctx) => {
  const result = cloneExactJson(params);
  if (!result.ok) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: result.issue.path,
      message: result.issue.message
    });
    return import_zod.z.NEVER;
  }
  if (result.value === null || typeof result.value !== "object" || Array.isArray(result.value)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      message: "exact JSON envelope must be a plain object"
    });
    return import_zod.z.NEVER;
  }
  return result.value;
});
var ProvenanceSchema = import_zod.z.object({
  source: import_zod.z.string().trim().min(1).max(200).regex(SAFE_DISPLAY_STRING_PATTERN),
  calibrated_posterior: import_zod.z.literal(false).default(false),
  // fail-closed + portable
  advisory_only: import_zod.z.boolean().default(true),
  is_paper_local_evidence: import_zod.z.boolean().default(false),
  caption: import_zod.z.string().trim().max(500).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
  /** Machine-checkable record of the inputs an agent declared. Keys are
   *  open here (lenient envelope) — validateSkillInvocation enforces the
   *  closed ProvenanceKey set a skill demands, so an unknown key surfaces as a
   *  clear missing_provenance error rather than zod's opaque invalid_key.
   *  The strict gate closes the key set, validates every present known value,
   *  and checks portable params↔claim consistency; factual truth remains the
   *  producer's responsibility. */
  declared_inputs: JsonParamsSchema.pipe(
    import_zod.z.record(
      normalizedRecordKey,
      import_zod.z.union([
        import_zod.z.string().max(5e3).regex(SAFE_DISPLAY_STRING_PATTERN),
        import_zod.z.number(),
        import_zod.z.literal(true)
      ])
    )
  ).refine((inputs) => Object.keys(inputs).length <= 64, {
    message: "declared_inputs may contain at most 64 keys"
  }).optional(),
  /** Explicit synthetic/illustrative discriminator — forces the schematic
   *  caption regardless of the other flags. */
  synthetic: import_zod.z.boolean().default(false)
}).strict();
var VizSpecSchema = import_zod.z.object({
  scene: import_zod.z.enum(SCENE_NAMES),
  /** Optional self-describing skill id (e.g. 'nest.spike_raster'). When present,
   *  a stored spec is independently re-validatable and its honesty caption is
   *  deterministic: validateSkillInvocation cross-checks it, and VizSpecRenderer
   *  uses it when no explicit `skillId` prop is passed. Scene→skill is many-to-one
   *  (voltage-trace ← voltage_trace AND astrocyte_dynamics), so the scene alone
   *  cannot recover the skill — this field closes that gap. */
  skill: import_zod.z.string().trim().min(1).max(80).regex(SAFE_DISPLAY_STRING_PATTERN, "skill must not contain display control characters").optional(),
  /** Optional contract version this spec targets (see CORTEXEL_SPEC_VERSION). */
  specVersion: import_zod.z.literal(CORTEXEL_SPEC_VERSION).optional(),
  // Scene-specific data/options. The envelope path guarantees bounded literal
  // JSON; the strict agent path `validateSkillInvocation` additionally enforces
  // the per-skill shape and cross-field invariants before render.
  params: JsonParamsSchema.default({}),
  mode: import_zod.z.enum(["interactive", "export"]).default("interactive"),
  themeMode: import_zod.z.enum(["dark", "light"]).default("dark"),
  camera: import_zod.z.enum(["default", "top", "side", "close", "cinematic"]).optional(),
  /** Optional palette hint — an agent can request a named semantic palette
   *  (e.g. 'crameri', 'okabe-ito'). On the strict skill path an unregistered name
   *  is rejected with 'unknown_palette'; on the lenient validateVizSpec path an
   *  unregistered name is tolerated and getPalette falls back to the default (with
   *  a dev-mode warning). When absent, the host's active palette is used. */
  palette: import_zod.z.string().trim().min(1).max(60).regex(SAFE_DISPLAY_STRING_PATTERN, "palette must not contain display control characters").optional(),
  provenance: ProvenanceSchema
}).strict();
function validateVizSpec(input) {
  try {
    const exact = JsonParamsSchema.safeParse(input);
    if (!exact.success) {
      return {
        ok: false,
        errors: formatValidationIssues(exact.error.issues)
      };
    }
    const result = VizSpecSchema.safeParse(exact.data);
    if (result.success) return { ok: true, spec: result.data };
    return {
      ok: false,
      errors: formatValidationIssues(result.error.issues)
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        `(root): validation could not safely inspect the payload: ${safeErrorMessage(error)}`
      ]
    };
  }
}

// core/skills/registry.ts
var import_zod3 = require("zod");

// core/skills/skillIds.ts
var NEST_SKILL_IDS = Object.freeze([
  "nest.voltage_trace",
  "nest.spike_raster",
  "nest.isi_distribution",
  "nest.psth",
  "nest.population_rate",
  "nest.rate_response",
  "nest.connectivity_matrix",
  "nest.connection_graph",
  "nest.adjacency_matrix",
  "nest.weight_matrix",
  "nest.delay_matrix",
  "nest.in_degree_distribution",
  "nest.out_degree_distribution",
  "nest.delay_distribution",
  "nest.weight_histogram",
  "nest.spatial_2d",
  "nest.spatial_map_2d",
  "nest.spatial_3d",
  "nest.plasticity_dynamics",
  "nest.phase_plane",
  "nest.correlogram",
  "nest.stimulus_response",
  "nest.astrocyte_dynamics",
  "nest.compartmental_dynamics",
  "nest.animation_replay",
  "corpus.knowledge_graph"
]);
var SKILL_IDS = NEST_SKILL_IDS;
var NEST_DEVICE_FAMILIES = Object.freeze([
  "multimeter",
  "spike_recorder",
  "correlation_detector",
  "get_connections",
  "get_position",
  "weight_recorder",
  "computed",
  // no NEST device — numerically derived (phase plane, replay frames)
  "corpus"
  // no NEST device — corpus/KG structural graph (papers, models, families)
]);
function isSkillId(value) {
  return typeof value === "string" && SKILL_IDS.includes(value);
}
var VALID_RENDERER_ROUTES = Object.freeze([
  "media.trace_figure",
  "media.model_graph",
  "media.webgl_scene",
  "media.react_fiber_scene",
  "media.manim_storyboard",
  "media.*",
  "matplotlib",
  "d3",
  "three",
  "fiber",
  "manim"
]);

// core/skills/params.ts
var import_zod2 = require("zod");
var PARAM_LIMITS = Object.freeze({
  // Inline JSON is defensively cloned and schema-validated more than once at
  // the trust boundary. Larger recordings must be decimated/aggregated or
  // referenced out-of-band instead of freezing a browser render.
  maxSamples: 5e4,
  maxSeries: 256,
  maxTopologyNodes: 25e3,
  maxTopologyEdges: 2e4,
  maxSpatialObjects: 5e4,
  maxGraphNodes: 1e3,
  maxGraphEdges: 4e3
});
var FLOAT32_MAX = 34028234663852886e22;
var timeArray = import_zod2.z.array(import_zod2.z.number()).max(PARAM_LIMITS.maxSamples);
var gpuNumber = import_zod2.z.number().min(-FLOAT32_MAX, "value exceeds the finite Float32 range used by render buffers").max(FLOAT32_MAX, "value exceeds the finite Float32 range used by render buffers");
var gpuArray = import_zod2.z.array(gpuNumber).max(PARAM_LIMITS.maxSamples);
var idArray = import_zod2.z.array(
  import_zod2.z.number().int("node/sender ids must be integers").nonnegative("node/sender ids must be non-negative").max(Number.MAX_SAFE_INTEGER, "node/sender ids must be safe integers")
).max(PARAM_LIMITS.maxSamples);
var displayText = (max) => import_zod2.z.string().trim().min(1).max(max).regex(SAFE_DISPLAY_STRING_PATTERN, "display text must not contain control or bidi characters").meta({ "x-cortexel-normalize": "trim" });
var Rfc3339TimestampSchema = import_zod2.z.iso.datetime({ offset: true }).max(80).regex(
  /T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
  "timestamp must be RFC 3339 with seconds and an explicit UTC/numeric offset"
);
var units = displayText(80);
var normalizedRecordKey2 = import_zod2.z.string().min(1).max(80).regex(
  /^\S(?:[\s\S]*\S)?$/,
  "record keys must already be trimmed and contain a non-whitespace character"
).regex(SAFE_DISPLAY_STRING_PATTERN, "record keys must not contain control or bidi characters");
function equalLengthIssue(ctx, path, expectedName, expected, actual) {
  if (actual !== expected) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: [path],
      message: `${path} length (${actual}) must match ${expectedName} length (${expected})`
    });
  }
}
function requireMonotonic(values, ctx, path) {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: [path, i],
        message: `${path} must be monotonically non-decreasing`
      });
      return;
    }
  }
}
var VoltageTraceParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  series: import_zod2.z.array(gpuArray.min(1)).min(1).max(PARAM_LIMITS.maxSeries),
  series_labels: import_zod2.z.array(displayText(120)).min(1).max(PARAM_LIMITS.maxSeries),
  /** One shared unit for every series. Heterogeneous recorded variables must
   *  be authored as separate specs rather than sharing a misleading axis. */
  units
}).strict().superRefine((value, ctx) => {
  requireMonotonic(value.times_ms, ctx, "times_ms");
  value.series.forEach((series, index) => {
    equalLengthIssue(
      ctx,
      `series.${index}`,
      "times_ms",
      value.times_ms.length,
      series.length
    );
  });
  equalLengthIssue(
    ctx,
    "series_labels",
    "series",
    value.series.length,
    value.series_labels.length
  );
});
var SpikeRasterParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  senders: idArray.min(1)
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "senders",
    "times_ms",
    value.times_ms.length,
    value.senders.length
  );
});
var HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE = 0;
var HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE = 1e-9;
var HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS = 4;
var GEOMETRY_MAX_ROUNDOFF_FRACTION = 1e-7;
var HISTOGRAM_MASS_TOLERANCE = 1e-6;
var PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE = 1e-6;
var POPULATION_RATE_ABSOLUTE_TOLERANCE = 1e-9;
var POPULATION_RATE_RELATIVE_TOLERANCE = 1e-9;
function approximatelyEqual(actual, expected, absoluteTolerance, relativeTolerance) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return Math.abs(actual - expected) <= absoluteTolerance + relativeTolerance * Math.max(Math.abs(actual), Math.abs(expected));
}
function requireUniformHistogramBins(centers, width, ctx, centerPath, nonNegativeLowerEdge = false) {
  if (!Number.isFinite(width) || width <= 0) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: [centerPath],
      message: "histogram bin width must be a positive finite number"
    });
    return;
  }
  if (nonNegativeLowerEdge && centers.length > 0) {
    const halfWidth = width / 2;
    const lowerEdge = centers[0] - halfWidth;
    const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE + HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.max(Math.abs(centers[0]), Math.abs(halfWidth));
    if (!Number.isFinite(lowerEdge) || lowerEdge < -tolerance) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: [centerPath, 0],
        message: "the first ISI bin lower edge cannot be negative"
      });
      return;
    }
  }
  for (let index = 1; index < centers.length; index++) {
    if (!(centers[index] > centers[index - 1])) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: [centerPath, index],
        message: "histogram bin centers must be strictly increasing"
      });
      return;
    }
    const delta = centers[index] - centers[index - 1];
    if (!approximatelyEqual(
      delta,
      width,
      HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
    )) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: [centerPath, index],
        message: "adjacent histogram bin centers must differ by the declared bin width"
      });
      return;
    }
  }
}
function requireNormalizedHistogramMass(normalization, values, width, rules, ctx) {
  const rule = rules[normalization];
  if (!rule) return;
  let mass = 0;
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) return;
    mass += value;
  }
  if (rule.measure === "density_integral") mass *= width;
  if (!approximatelyEqual(
    mass,
    rule.target,
    HISTOGRAM_MASS_TOLERANCE,
    HISTOGRAM_MASS_TOLERANCE
  )) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["values"],
      message: rule.measure === "density_integral" ? "probability-density values times bin width must integrate to 1" : "probability values must sum to 1"
    });
  }
}
var isiValueUnits = {
  count: "count",
  probability: "probability",
  probability_density: "1/ms"
};
var IsiDistributionParamsSchema = import_zod2.z.object({
  bin_centers_ms: timeArray.min(1),
  values: gpuArray.min(1),
  bin_width_ms: import_zod2.z.number().positive().max(Number.MAX_VALUE),
  normalization: import_zod2.z.enum(["count", "probability", "probability_density"]),
  value_units: import_zod2.z.enum(["count", "probability", "1/ms"]),
  interval_scope: import_zod2.z.enum(["per_sender", "single_train"])
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "values",
    "bin_centers_ms",
    value.bin_centers_ms.length,
    value.values.length
  );
  requireMonotonic(value.bin_centers_ms, ctx, "bin_centers_ms");
  requireUniformHistogramBins(
    value.bin_centers_ms,
    value.bin_width_ms,
    ctx,
    "bin_centers_ms",
    true
  );
  for (let index = 0; index < value.bin_centers_ms.length; index++) {
    if (value.bin_centers_ms[index] < 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["bin_centers_ms", index],
        message: "inter-spike interval bin centers cannot be negative"
      });
      break;
    }
  }
  if (value.value_units !== isiValueUnits[value.normalization]) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["value_units"],
      message: `value_units must be '${isiValueUnits[value.normalization]}' for ${value.normalization}`
    });
  }
  for (let index = 0; index < value.values.length; index++) {
    const sample = value.values[index];
    if (sample < 0 || value.normalization === "probability" && sample > 1 || value.normalization === "count" && !Number.isSafeInteger(sample)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["values", index],
        message: value.normalization === "count" ? "histogram counts must be non-negative safe integers" : value.normalization === "probability" ? "probability values must lie in [0, 1]" : "histogram values cannot be negative"
      });
      break;
    }
  }
  requireNormalizedHistogramMass(
    value.normalization,
    value.values,
    value.bin_width_ms,
    {
      probability: { measure: "sum", target: 1 },
      probability_density: { measure: "density_integral", target: 1 }
    },
    ctx
  );
});
var psthValueUnits = {
  count: "count",
  count_per_trial: "count/trial",
  rate_hz: "Hz"
};
function requirePsthDerivedCounts(normalization, values, trialCount, binWidthMs, ctx) {
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    let rawCount;
    switch (normalization) {
      case "count":
        rawCount = value;
        break;
      case "count_per_trial":
        rawCount = value * trialCount;
        break;
      case "rate_hz":
        rawCount = value * trialCount;
        rawCount *= binWidthMs;
        rawCount /= 1e3;
        break;
    }
    const rounded = Math.round(rawCount);
    const exactCount = normalization === "count";
    if (!Number.isFinite(rawCount) || rawCount < 0 || !Number.isSafeInteger(rounded) || (exactCount ? !Number.isSafeInteger(rawCount) : Math.abs(rawCount - rounded) > PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["values", index],
        message: exactCount ? "aggregate PSTH counts must be non-negative safe integers" : "normalized PSTH values must recover a non-negative safe-integer aggregate spike count"
      });
      return;
    }
  }
}
var PsthParamsSchema = import_zod2.z.object({
  bin_centers_ms: timeArray.min(1),
  values: gpuArray.min(1),
  bin_width_ms: import_zod2.z.number().positive().max(Number.MAX_VALUE),
  normalization: import_zod2.z.enum(["count", "count_per_trial", "rate_hz"]),
  value_units: import_zod2.z.enum(["count", "count/trial", "Hz"]),
  trial_count: import_zod2.z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  alignment_event: displayText(240),
  aggregation: import_zod2.z.literal("selected_senders_per_trial")
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "values",
    "bin_centers_ms",
    value.bin_centers_ms.length,
    value.values.length
  );
  requireMonotonic(value.bin_centers_ms, ctx, "bin_centers_ms");
  requireUniformHistogramBins(
    value.bin_centers_ms,
    value.bin_width_ms,
    ctx,
    "bin_centers_ms"
  );
  if (value.value_units !== psthValueUnits[value.normalization]) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["value_units"],
      message: `value_units must be '${psthValueUnits[value.normalization]}' for ${value.normalization}`
    });
  }
  for (let index = 0; index < value.values.length; index++) {
    const sample = value.values[index];
    if (sample < 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["values", index],
        message: "histogram values cannot be negative"
      });
      break;
    }
  }
  requirePsthDerivedCounts(
    value.normalization,
    value.values,
    value.trial_count,
    value.bin_width_ms,
    ctx
  );
});
var PopulationRateSeriesSchema = import_zod2.z.object({
  id: displayText(120),
  label: displayText(240),
  recorded_sender_count: import_zod2.z.number().int("recorded_sender_count must be an integer").positive("recorded_sender_count must be positive").max(Number.MAX_SAFE_INTEGER, "recorded_sender_count must be a safe integer"),
  spike_counts: import_zod2.z.array(
    import_zod2.z.number().int("spike counts must be integers").nonnegative("spike counts cannot be negative").max(Number.MAX_SAFE_INTEGER, "spike counts must be safe integers")
  ).min(1).max(PARAM_LIMITS.maxSamples),
  rates_hz: gpuArray.min(1)
}).strict();
function requirePopulationRateWindow(centers, width, start, stop, ctx) {
  if (!(stop > start)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["window_stop_ms"],
      message: "window_stop_ms must be greater than window_start_ms"
    });
    return;
  }
  if (centers.length === 0 || !Number.isFinite(width) || width <= 0) return;
  const halfWidth = width / 2;
  const firstCenter = centers[0];
  const lastCenter = centers[centers.length - 1];
  const firstEdge = firstCenter - halfWidth;
  const lastEdge = lastCenter + halfWidth;
  const edgeMatches = (edge, expected, center) => {
    const difference = Math.abs(edge - expected);
    if (difference === 0) return true;
    const arithmeticTolerance = HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS * Number.EPSILON * Math.max(
      Math.abs(center),
      Math.abs(halfWidth),
      Math.abs(edge),
      Math.abs(expected)
    );
    if (arithmeticTolerance > GEOMETRY_MAX_ROUNDOFF_FRACTION * Math.abs(width)) {
      return false;
    }
    const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE + HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.abs(width) + arithmeticTolerance;
    return Number.isFinite(edge) && Number.isFinite(expected) && difference <= tolerance;
  };
  if (!edgeMatches(firstEdge, start, firstCenter)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["bin_centers_ms", 0],
      message: "the first left-closed bin edge must equal window_start_ms"
    });
  }
  if (!edgeMatches(lastEdge, stop, lastCenter)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["bin_centers_ms", centers.length - 1],
      message: "the final right-open bin edge must equal window_stop_ms"
    });
  }
}
function requirePopulationRateValues(series, binCount, binWidthMs, ctx) {
  const ids = /* @__PURE__ */ new Set();
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const item = series[seriesIndex];
    if (ids.has(item.id)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["series", seriesIndex, "id"],
        message: `duplicate population-rate series id '${item.id}'`
      });
    }
    ids.add(item.id);
    equalLengthIssue(
      ctx,
      `series.${seriesIndex}.spike_counts`,
      "bin_centers_ms",
      binCount,
      item.spike_counts.length
    );
    equalLengthIssue(
      ctx,
      `series.${seriesIndex}.rates_hz`,
      "bin_centers_ms",
      binCount,
      item.rates_hz.length
    );
    const sampleCount = Math.min(item.spike_counts.length, item.rates_hz.length);
    for (let binIndex = 0; binIndex < sampleCount; binIndex++) {
      const rate = item.rates_hz[binIndex];
      if (rate < 0) {
        ctx.addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["series", seriesIndex, "rates_hz", binIndex],
          message: "population rates cannot be negative"
        });
        continue;
      }
      let expected = item.spike_counts[binIndex] * 1e3;
      const denominator = item.recorded_sender_count * binWidthMs;
      expected /= denominator;
      if (!Number.isFinite(denominator) || !approximatelyEqual(
        rate,
        expected,
        POPULATION_RATE_ABSOLUTE_TOLERANCE,
        POPULATION_RATE_RELATIVE_TOLERANCE
      )) {
        ctx.addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["series", seriesIndex, "rates_hz", binIndex],
          message: "rate must equal spike_count \xD7 1000 / (recorded_sender_count \xD7 bin_width_ms)"
        });
      }
    }
  }
}
var PopulationRateParamsSchema = import_zod2.z.object({
  bin_centers_ms: timeArray.min(1),
  bin_width_ms: import_zod2.z.number().positive().max(Number.MAX_VALUE),
  window_start_ms: import_zod2.z.number(),
  window_stop_ms: import_zod2.z.number(),
  series: import_zod2.z.array(PopulationRateSeriesSchema).min(1).max(PARAM_LIMITS.maxSeries),
  normalization: import_zod2.z.literal("mean_per_recorded_sender_hz"),
  aggregation: import_zod2.z.literal("selected_senders"),
  binning: import_zod2.z.literal("left_closed_right_open")
}).strict().superRefine((value, ctx) => {
  requireUniformHistogramBins(
    value.bin_centers_ms,
    value.bin_width_ms,
    ctx,
    "bin_centers_ms"
  );
  requirePopulationRateWindow(
    value.bin_centers_ms,
    value.bin_width_ms,
    value.window_start_ms,
    value.window_stop_ms,
    ctx
  );
  requirePopulationRateValues(
    value.series,
    value.bin_centers_ms.length,
    value.bin_width_ms,
    ctx
  );
});
var RateResponseParamsSchema = import_zod2.z.object({
  stimulus_amplitudes: gpuArray.min(1),
  rates_hz: gpuArray.min(1),
  stimulus_units: units
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "rates_hz",
    "stimulus_amplitudes",
    value.stimulus_amplitudes.length,
    value.rates_hz.length
  );
  for (let index = 0; index < value.rates_hz.length; index++) {
    const rate = value.rates_hz[index];
    if (rate < 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["rates_hz", index],
        message: "firing rates cannot be negative"
      });
      break;
    }
  }
});
var NetworkParamsSchema = import_zod2.z.object({
  sources: idArray.min(1),
  targets: idArray.min(1),
  weights: gpuArray.optional(),
  delays: gpuArray.optional(),
  weight_units: units.optional(),
  delay_units: units.optional()
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "targets",
    "sources",
    value.sources.length,
    value.targets.length
  );
  if (value.weights) {
    equalLengthIssue(
      ctx,
      "weights",
      "sources",
      value.sources.length,
      value.weights.length
    );
  }
  if (value.delays) {
    equalLengthIssue(
      ctx,
      "delays",
      "sources",
      value.sources.length,
      value.delays.length
    );
    const index = value.delays.findIndex((delay) => delay <= 0);
    if (index >= 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["delays", index],
        message: "connection delays must be strictly positive"
      });
    }
  }
  if (value.weights !== void 0 !== (value.weight_units !== void 0)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["weight_units"],
      message: "weight_units must be present exactly when weights are present"
    });
  }
  if (value.delays !== void 0 !== (value.delay_units !== void 0)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["delay_units"],
      message: "delay_units must be present exactly when delays are present"
    });
  }
});
var topologyCount = import_zod2.z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).refine((value) => !Object.is(value, -0), "topology counts and ranks must not be negative zero");
var topologyPositiveCount = topologyCount.positive();
var MpiTargetRankLocalScopeSchema = import_zod2.z.object({
  kind: import_zod2.z.literal("mpi_target_rank_local"),
  rank: topologyCount,
  world_size: topologyPositiveCount
}).strict().superRefine((value, ctx) => {
  if (value.rank >= value.world_size) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["rank"],
      message: "MPI rank must be smaller than world_size"
    });
  }
});
var SnapshotScopeSchema = import_zod2.z.discriminatedUnion("kind", [
  import_zod2.z.object({ kind: import_zod2.z.literal("single_process_complete") }).strict(),
  MpiTargetRankLocalScopeSchema,
  import_zod2.z.object({
    kind: import_zod2.z.literal("mpi_all_ranks_merged"),
    world_size: topologyPositiveCount
  }).strict()
]);
var MpiRankLocalPositionScopeSchema = import_zod2.z.object({
  kind: import_zod2.z.literal("mpi_rank_local"),
  rank: topologyCount,
  world_size: topologyPositiveCount
}).strict().superRefine((value, ctx) => {
  if (value.rank >= value.world_size) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["rank"],
      message: "MPI rank must be smaller than world_size"
    });
  }
});
var PositionScopeSchema = import_zod2.z.discriminatedUnion("kind", [
  import_zod2.z.object({ kind: import_zod2.z.literal("single_process_complete") }).strict(),
  MpiRankLocalPositionScopeSchema,
  import_zod2.z.object({
    kind: import_zod2.z.literal("mpi_all_ranks_merged"),
    world_size: topologyPositiveCount
  }).strict()
]);
var ConnectionGraphNodeSchema = import_zod2.z.object({
  id: idArray.element,
  label: displayText(120)
}).strict();
var ConnectionGraphEdgeSchema = import_zod2.z.object({
  id: displayText(240),
  source: idArray.element,
  target: idArray.element,
  weight: gpuNumber.optional(),
  delay_ms: gpuNumber.positive().optional(),
  synapse_model: displayText(120).optional()
}).strict();
function canonicalEdgeIdInteger(value) {
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return void 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && String(parsed) === value ? parsed : void 0;
}
var ConnectionGraphParamsSchema = import_zod2.z.object({
  nodes: import_zod2.z.array(ConnectionGraphNodeSchema).min(1).max(PARAM_LIMITS.maxTopologyNodes),
  edges: import_zod2.z.array(ConnectionGraphEdgeSchema).max(PARAM_LIMITS.maxTopologyEdges),
  weight_units: units.optional(),
  delay_units: import_zod2.z.literal("ms").optional(),
  layout: import_zod2.z.literal("schematic_circle"),
  parallel_edges: import_zod2.z.literal("preserved"),
  self_connections: import_zod2.z.literal("preserved"),
  snapshot_time_ms: import_zod2.z.number().finite().nonnegative(),
  snapshot_scope: SnapshotScopeSchema,
  sample_policy: import_zod2.z.enum(["complete", "deterministic_even_stride"]),
  source_connection_count: topologyCount,
  edge_identity: import_zod2.z.enum(["nest_connection_identifier", "canonical_sorted_ordinal"])
}).strict().superRefine((value, ctx) => {
  const nodeIds = /* @__PURE__ */ new Set();
  for (let index = 0; index < value.nodes.length; index++) {
    const id2 = value.nodes[index].id;
    if (nodeIds.has(id2)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["nodes", index, "id"],
        message: "graph node ids must be unique"
      });
    }
    nodeIds.add(id2);
  }
  const edgeIds = /* @__PURE__ */ new Set();
  let weightCount = 0;
  let delayCount = 0;
  let modelCount = 0;
  for (let index = 0; index < value.edges.length; index++) {
    const edge = value.edges[index];
    if (edgeIds.has(edge.id)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index, "id"],
        message: "graph edge ids must be unique"
      });
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index, "source"],
        message: "graph edge source must reference a declared node"
      });
    }
    if (!nodeIds.has(edge.target)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index, "target"],
        message: "graph edge target must reference a declared node"
      });
    }
    if (edge.weight !== void 0) weightCount += 1;
    if (edge.delay_ms !== void 0) delayCount += 1;
    if (edge.synapse_model !== void 0) modelCount += 1;
    const idParts = edge.id.split(":");
    if (value.edge_identity === "canonical_sorted_ordinal") {
      const ordinal = idParts.length === 2 && idParts[0] === "connection" ? canonicalEdgeIdInteger(idParts[1]) : void 0;
      if (ordinal === void 0 || ordinal >= value.source_connection_count) {
        ctx.addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["edges", index, "id"],
          message: "canonical edge ids must be connection:<source ordinal> within source_connection_count"
        });
      }
    } else {
      const components = idParts.length === 6 && idParts[0] === "connection" ? idParts.slice(1).map(canonicalEdgeIdInteger) : [];
      if (components.length !== 5 || components.some((component) => component === void 0) || components[0] !== edge.source || components[1] !== edge.target) {
        ctx.addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["edges", index, "id"],
          message: "NEST edge ids must be connection:source:target:target_thread:synapse_id:port and match the edge endpoints"
        });
      }
    }
  }
  for (const [field, count] of [
    ["weight", weightCount],
    ["delay_ms", delayCount],
    ["synapse_model", modelCount]
  ]) {
    if (count !== 0 && count !== value.edges.length) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges"],
        message: `${field} must be present on every graph edge or none`
      });
    }
  }
  if (weightCount > 0 !== (value.weight_units !== void 0)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["weight_units"],
      message: "weight_units must be present exactly when every edge carries weight"
    });
  }
  if (delayCount > 0 !== (value.delay_units !== void 0)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["delay_units"],
      message: "delay_units must be present exactly when every edge carries delay_ms"
    });
  }
  if (value.sample_policy === "complete") {
    if (value.source_connection_count !== value.edges.length) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["source_connection_count"],
        message: "complete graph output must contain every source connection"
      });
    }
  } else if (value.edges.length === 0 || value.source_connection_count <= value.edges.length) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["source_connection_count"],
      message: "deterministic_even_stride requires a non-empty strict subset of source connections"
    });
  }
});
var MatrixCellBaseSchema = import_zod2.z.object({
  source_id: idArray.element,
  target_id: idArray.element,
  connection_count: topologyPositiveCount
}).strict();
var AdjacencyMatrixCellSchema = MatrixCellBaseSchema;
var WeightMatrixCellSchema = MatrixCellBaseSchema.extend({ value: gpuNumber }).strict();
var DelayMatrixCellSchema = MatrixCellBaseSchema.extend({ value: gpuNumber.positive() }).strict();
var matrixBaseShape = {
  source_ids: idArray.min(1),
  target_ids: idArray.min(1),
  axis_order: import_zod2.z.literal("target_rows_source_columns"),
  absent_cell: import_zod2.z.literal("no_connection"),
  sample_policy: import_zod2.z.literal("complete"),
  connection_count: topologyCount,
  snapshot_time_ms: import_zod2.z.number().finite().nonnegative(),
  snapshot_scope: SnapshotScopeSchema
};
function refineSparseMatrix(value, ctx) {
  const sourceIds = new Set(value.source_ids);
  const targetIds = new Set(value.target_ids);
  if (sourceIds.size !== value.source_ids.length) {
    ctx.addIssue({ code: import_zod2.z.ZodIssueCode.custom, path: ["source_ids"], message: "source_ids must be unique" });
  }
  if (targetIds.size !== value.target_ids.length) {
    ctx.addIssue({ code: import_zod2.z.ZodIssueCode.custom, path: ["target_ids"], message: "target_ids must be unique" });
  }
  const pairs = /* @__PURE__ */ new Set();
  let total = 0;
  for (let index = 0; index < value.cells.length; index++) {
    const cell = value.cells[index];
    if (!sourceIds.has(cell.source_id)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["cells", index, "source_id"],
        message: "matrix cell source_id must occur in source_ids"
      });
    }
    if (!targetIds.has(cell.target_id)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["cells", index, "target_id"],
        message: "matrix cell target_id must occur in target_ids"
      });
    }
    const pair = `${cell.source_id}\0${cell.target_id}`;
    if (pairs.has(pair)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["cells", index],
        message: "matrix cells must contain at most one entry per source-target pair"
      });
    }
    pairs.add(pair);
    total += cell.connection_count;
    if (!Number.isSafeInteger(total)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["connection_count"],
        message: "matrix connection count sum exceeds the safe-integer range"
      });
      return;
    }
  }
  if (total !== value.connection_count) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["connection_count"],
      message: "connection_count must equal the sum of sparse cell connection_count values"
    });
  }
}
var AdjacencyMatrixParamsSchema = import_zod2.z.object({
  ...matrixBaseShape,
  cells: import_zod2.z.array(AdjacencyMatrixCellSchema).max(PARAM_LIMITS.maxSamples),
  display: import_zod2.z.literal("binary_presence"),
  aggregation: import_zod2.z.literal("any_connection")
}).strict().superRefine(refineSparseMatrix);
var WeightMatrixParamsSchema = import_zod2.z.object({
  ...matrixBaseShape,
  cells: import_zod2.z.array(WeightMatrixCellSchema).max(PARAM_LIMITS.maxSamples),
  weight_units: units,
  aggregation: import_zod2.z.enum(["sum", "mean", "minimum", "maximum", "single_connection"])
}).strict().superRefine((value, ctx) => {
  refineSparseMatrix(value, ctx);
  if (value.aggregation === "single_connection") {
    const index = value.cells.findIndex((cell) => cell.connection_count !== 1);
    if (index >= 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["cells", index, "connection_count"],
        message: "single_connection aggregation requires exactly one connection per cell"
      });
    }
  }
});
var DelayMatrixParamsSchema = import_zod2.z.object({
  ...matrixBaseShape,
  cells: import_zod2.z.array(DelayMatrixCellSchema).max(PARAM_LIMITS.maxSamples),
  delay_units: import_zod2.z.literal("ms"),
  aggregation: import_zod2.z.enum(["mean", "minimum", "maximum", "single_connection"])
}).strict().superRefine((value, ctx) => {
  refineSparseMatrix(value, ctx);
  if (value.aggregation === "single_connection") {
    const index = value.cells.findIndex((cell) => cell.connection_count !== 1);
    if (index >= 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["cells", index, "connection_count"],
        message: "single_connection aggregation requires exactly one connection per cell"
      });
    }
  }
});
var DEGREE_VALUE_ABSOLUTE_TOLERANCE = 1e-12;
var DEGREE_VALUE_RELATIVE_TOLERANCE = 1e-12;
function degreeDistributionSchema(direction) {
  return import_zod2.z.object({
    degrees: import_zod2.z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
    node_counts: import_zod2.z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
    values: gpuArray.min(1),
    node_count: topologyPositiveCount,
    connection_count: topologyCount,
    direction: import_zod2.z.literal(direction),
    normalization: import_zod2.z.enum(["count", "probability"]),
    value_units: import_zod2.z.enum(["count", "probability"]),
    edge_counting: import_zod2.z.literal("each_synapse_collection_entry"),
    zero_degree_policy: import_zod2.z.literal("include_declared_universe"),
    sample_policy: import_zod2.z.literal("complete"),
    snapshot_time_ms: import_zod2.z.number().finite().nonnegative(),
    snapshot_scope: SnapshotScopeSchema
  }).strict().superRefine((value, ctx) => {
    equalLengthIssue(ctx, "node_counts", "degrees", value.degrees.length, value.node_counts.length);
    equalLengthIssue(ctx, "values", "degrees", value.degrees.length, value.values.length);
    for (let index = 0; index < value.degrees.length; index++) {
      if (value.degrees[index] !== index) {
        ctx.addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["degrees", index],
          message: "degrees must be the contiguous integer range beginning at zero"
        });
        break;
      }
    }
    let countedNodes = 0;
    let countedConnections = 0;
    for (let index = 0; index < value.node_counts.length; index++) {
      countedNodes += value.node_counts[index];
      countedConnections += index * value.node_counts[index];
    }
    if (!Number.isSafeInteger(countedNodes) || countedNodes !== value.node_count) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["node_count"],
        message: "node_count must equal the sum of node_counts"
      });
    }
    if (!Number.isSafeInteger(countedConnections) || countedConnections !== value.connection_count) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["connection_count"],
        message: "connection_count must equal the degree-weighted sum of node_counts"
      });
    }
    const expectedUnits = value.normalization === "count" ? "count" : "probability";
    if (value.value_units !== expectedUnits) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["value_units"],
        message: `value_units must be '${expectedUnits}' for ${value.normalization}`
      });
    }
    let displayedMass = 0;
    for (let index = 0; index < Math.min(value.values.length, value.node_counts.length); index++) {
      const displayed = value.values[index];
      if (displayed < 0) {
        ctx.addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["values", index],
          message: "displayed degree values cannot be negative"
        });
        break;
      }
      const expected = value.normalization === "count" ? value.node_counts[index] : value.node_counts[index] / value.node_count;
      const matches = value.normalization === "count" ? Number.isSafeInteger(displayed) && displayed === expected : approximatelyEqual(
        displayed,
        expected,
        DEGREE_VALUE_ABSOLUTE_TOLERANCE,
        DEGREE_VALUE_RELATIVE_TOLERANCE
      );
      if (!matches) {
        ctx.addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["values", index],
          message: "displayed degree value must be derived from node_counts and node_count"
        });
        break;
      }
      displayedMass += displayed;
    }
    if (value.normalization === "probability" && !approximatelyEqual(
      displayedMass,
      1,
      DEGREE_VALUE_ABSOLUTE_TOLERANCE,
      DEGREE_VALUE_RELATIVE_TOLERANCE
    )) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["values"],
        message: "displayed degree probabilities must sum to one"
      });
    }
    if (direction === "out" && value.snapshot_scope.kind === "mpi_target_rank_local") {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["snapshot_scope", "kind"],
        message: "out-degree requires a complete single-process or all-ranks-merged snapshot"
      });
    }
  });
}
var InDegreeDistributionParamsSchema = degreeDistributionSchema("in");
var OutDegreeDistributionParamsSchema = degreeDistributionSchema("out");
var delayDistributionValueUnits = {
  count: "count",
  probability: "probability",
  probability_density: "1/ms"
};
var DelayDistributionParamsSchema = import_zod2.z.object({
  bin_centers_ms: timeArray.min(1),
  delay_counts: import_zod2.z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
  values: gpuArray.min(1),
  bin_width_ms: import_zod2.z.number().finite().positive(),
  window_start_ms: import_zod2.z.number().finite().nonnegative(),
  window_stop_ms: import_zod2.z.number().finite().positive(),
  normalization: import_zod2.z.enum(["count", "probability", "probability_density"]),
  value_units: import_zod2.z.enum(["count", "probability", "1/ms"]),
  delay_units: import_zod2.z.literal("ms"),
  aggregation: import_zod2.z.literal("each_connection"),
  binning: import_zod2.z.literal("left_closed_right_open"),
  sample_policy: import_zod2.z.literal("complete"),
  connection_count: topologyCount,
  snapshot_time_ms: import_zod2.z.number().finite().nonnegative(),
  snapshot_scope: SnapshotScopeSchema
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(ctx, "delay_counts", "bin_centers_ms", value.bin_centers_ms.length, value.delay_counts.length);
  equalLengthIssue(ctx, "values", "bin_centers_ms", value.bin_centers_ms.length, value.values.length);
  requireUniformHistogramBins(value.bin_centers_ms, value.bin_width_ms, ctx, "bin_centers_ms", true);
  requirePopulationRateWindow(
    value.bin_centers_ms,
    value.bin_width_ms,
    value.window_start_ms,
    value.window_stop_ms,
    ctx
  );
  const expectedUnits = delayDistributionValueUnits[value.normalization];
  if (value.value_units !== expectedUnits) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["value_units"],
      message: `value_units must be '${expectedUnits}' for ${value.normalization}`
    });
  }
  let total = 0;
  for (const count of value.delay_counts) total += count;
  if (!Number.isSafeInteger(total) || total !== value.connection_count) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["connection_count"],
      message: "connection_count must equal the sum of delay_counts"
    });
  }
  if (value.connection_count === 0 && value.normalization !== "count") {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["normalization"],
      message: "an empty delay snapshot cannot be probability-normalized"
    });
  }
  const densityDenominator = value.connection_count * value.bin_width_ms;
  if (value.normalization === "probability_density" && (!Number.isFinite(densityDenominator) || densityDenominator <= 0)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["bin_width_ms"],
      message: "connection_count \xD7 bin_width_ms must be finite for probability density"
    });
  }
  let displayedMass = 0;
  for (let index = 0; index < Math.min(value.values.length, value.delay_counts.length); index++) {
    const count = value.delay_counts[index];
    const displayed = value.values[index];
    if (displayed < 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["values", index],
        message: "displayed delay values cannot be negative"
      });
      break;
    }
    const expected = value.normalization === "count" ? count : value.normalization === "probability" ? count / value.connection_count : count / densityDenominator;
    const matches = value.normalization === "count" ? Number.isSafeInteger(displayed) && displayed === expected : Object.is(displayed, expected);
    if (!matches) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["values", index],
        message: "displayed delay value must be recoverable from delay_counts"
      });
      break;
    }
    displayedMass += displayed;
  }
  if (value.normalization !== "count") {
    const normalizedMass = value.normalization === "probability_density" ? displayedMass * value.bin_width_ms : displayedMass;
    if (!approximatelyEqual(
      normalizedMass,
      1,
      HISTOGRAM_MASS_TOLERANCE,
      HISTOGRAM_MASS_TOLERANCE
    )) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["values"],
        message: value.normalization === "probability_density" ? "displayed delay density must integrate to one" : "displayed delay probabilities must sum to one"
      });
    }
  }
});
var SpatialMap2DNodeSchema = import_zod2.z.object({
  id: idArray.element,
  label: displayText(120),
  x: gpuNumber,
  y: gpuNumber
}).strict();
var SPATIAL_BOUNDS_ROUNDOFF_ULPS = 2;
function spatialBoundsTolerance(center, halfExtent, minimum, maximum) {
  const extentTolerance = HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.abs(halfExtent);
  const arithmeticTolerance = SPATIAL_BOUNDS_ROUNDOFF_ULPS * Number.EPSILON * Math.max(
    Math.abs(center),
    Math.abs(halfExtent),
    Math.abs(minimum),
    Math.abs(maximum)
  );
  const boundedArithmeticTolerance = arithmeticTolerance <= GEOMETRY_MAX_ROUNDOFF_FRACTION * Math.abs(halfExtent) ? arithmeticTolerance : 0;
  return extentTolerance + boundedArithmeticTolerance;
}
var SpatialMap2DParamsSchema = import_zod2.z.object({
  nodes: import_zod2.z.array(SpatialMap2DNodeSchema).min(1).max(PARAM_LIMITS.maxSpatialObjects),
  coordinate_units: units,
  extent: import_zod2.z.tuple([gpuNumber.positive(), gpuNumber.positive()]),
  center: import_zod2.z.tuple([gpuNumber, gpuNumber]),
  edge_wrap: import_zod2.z.boolean(),
  position_scope: PositionScopeSchema,
  marker_size: import_zod2.z.literal("fixed_screen_space")
}).strict().superRefine((value, ctx) => {
  const ids = /* @__PURE__ */ new Set();
  const halfWidth = value.extent[0] / 2;
  const halfHeight = value.extent[1] / 2;
  const minX = value.center[0] - halfWidth;
  const maxX = value.center[0] + halfWidth;
  const minY = value.center[1] - halfHeight;
  const maxY = value.center[1] + halfHeight;
  if (!(minX < maxX)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["extent", 0],
      message: "x extent must remain representable at the declared center"
    });
  }
  if (!(minY < maxY)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["extent", 1],
      message: "y extent must remain representable at the declared center"
    });
  }
  const xTolerance = spatialBoundsTolerance(value.center[0], halfWidth, minX, maxX);
  const yTolerance = spatialBoundsTolerance(value.center[1], halfHeight, minY, maxY);
  for (let index = 0; index < value.nodes.length; index++) {
    const node = value.nodes[index];
    if (ids.has(node.id)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["nodes", index, "id"],
        message: "spatial node ids must be unique"
      });
    }
    ids.add(node.id);
    if (node.x < minX - xTolerance || node.x > maxX + xTolerance || node.y < minY - yTolerance || node.y > maxY + yTolerance) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["nodes", index],
        message: "spatial node coordinates must lie inside center \xB1 extent/2"
      });
    }
  }
});
var weightHistogramValueUnits = {
  count: "count",
  probability: "probability"
};
var WeightHistogramParamsSchema = import_zod2.z.object({
  bin_centers: gpuArray.min(1),
  values: gpuArray.min(1),
  bin_width: gpuNumber.positive(),
  weight_units: units,
  normalization: import_zod2.z.enum(["count", "probability"]),
  value_units: import_zod2.z.enum(["count", "probability"]),
  snapshot_time_ms: import_zod2.z.number().nonnegative()
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "values",
    "bin_centers",
    value.bin_centers.length,
    value.values.length
  );
  requireMonotonic(value.bin_centers, ctx, "bin_centers");
  requireUniformHistogramBins(
    value.bin_centers,
    value.bin_width,
    ctx,
    "bin_centers"
  );
  if (value.value_units !== weightHistogramValueUnits[value.normalization]) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["value_units"],
      message: `value_units must be '${weightHistogramValueUnits[value.normalization]}' for ${value.normalization}`
    });
  }
  for (let index = 0; index < value.values.length; index++) {
    const sample = value.values[index];
    if (sample < 0 || value.normalization === "probability" && sample > 1 || value.normalization === "count" && !Number.isSafeInteger(sample)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["values", index],
        message: value.normalization === "count" ? "histogram counts must be non-negative safe integers" : value.normalization === "probability" ? "probability values must lie in [0, 1]" : "histogram values cannot be negative"
      });
      break;
    }
  }
  requireNormalizedHistogramMass(
    value.normalization,
    value.values,
    value.bin_width,
    { probability: { measure: "sum", target: 1 } },
    ctx
  );
});
var Spatial3DObjectSchema = import_zod2.z.object({
  x: gpuNumber,
  y: gpuNumber,
  z: gpuNumber
}).passthrough();
var Spatial3DParamsSchema = import_zod2.z.object({
  objects: import_zod2.z.array(Spatial3DObjectSchema).min(1).max(PARAM_LIMITS.maxSpatialObjects),
  coordinate_units: units
}).strict();
var PlasticityParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  weights: gpuArray.min(1),
  weight_units: units
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "weights",
    "times_ms",
    value.times_ms.length,
    value.weights.length
  );
  requireMonotonic(value.times_ms, ctx, "times_ms");
});
var PhasePlaneParamsSchema = import_zod2.z.object({
  grid: import_zod2.z.record(normalizedRecordKey2, gpuArray.min(1)).refine((g) => Object.keys(g).length === 2, {
    message: "phase-plane grid must declare exactly two non-empty state-variable axes"
  }),
  derivatives: import_zod2.z.record(normalizedRecordKey2, gpuArray.min(1)),
  axis_units: import_zod2.z.record(normalizedRecordKey2, units),
  derivative_units: import_zod2.z.record(normalizedRecordKey2, units),
  axis_order: import_zod2.z.tuple([normalizedRecordKey2, normalizedRecordKey2]).refine(([first, second]) => first !== second, {
    message: "axis_order must name two distinct state variables"
  }),
  flattening: import_zod2.z.literal("row-major-last-axis-fastest")
}).strict().superRefine((value, ctx) => {
  const axes = Object.keys(value.grid);
  const derivativeNames = Object.keys(value.derivatives);
  if (value.axis_order.some((axis) => !Object.hasOwn(value.grid, axis)) || axes.some((axis) => !value.axis_order.includes(axis))) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["axis_order"],
      message: "axis_order must be a permutation of the two grid state variables"
    });
  }
  if (derivativeNames.length !== axes.length || axes.some((axis) => !Object.hasOwn(value.derivatives, axis))) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["derivatives"],
      message: "derivatives must declare the same two state variables as grid"
    });
    return;
  }
  for (const [field, values] of [
    ["axis_units", value.axis_units],
    ["derivative_units", value.derivative_units]
  ]) {
    const names = Object.keys(values);
    if (names.length !== axes.length || axes.some((axis) => !Object.hasOwn(values, axis))) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: [field],
        message: `${field} must declare units for the same two state variables as grid`
      });
    }
  }
  const expected = value.grid[axes[0]].length * value.grid[axes[1]].length;
  for (const axis of axes) {
    equalLengthIssue(
      ctx,
      `derivatives.${axis}`,
      "the Cartesian phase-plane grid",
      expected,
      value.derivatives[axis].length
    );
  }
});
var AstrocyteParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  ca_trace: gpuArray.min(1),
  units
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "ca_trace",
    "times_ms",
    value.times_ms.length,
    value.ca_trace.length
  );
  requireMonotonic(value.times_ms, ctx, "times_ms");
  for (let index = 0; index < value.ca_trace.length; index++) {
    if (value.ca_trace[index] < 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["ca_trace", index],
        message: "absolute Ca\xB2\u207A concentration cannot be negative"
      });
      break;
    }
  }
});
var CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS = [
  "paper",
  "model",
  "family"
];
var CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS = [
  "cites",
  "same_as",
  "variant_of",
  "instantiates",
  "belongs_to_family"
];
var KNOWLEDGE_GRAPH_LIMITS = Object.freeze({
  maxAttributes: 24,
  maxAttributeArrayItems: 16,
  maxEvidenceRefsPerElement: 8,
  maxParallelEdgesPerPair: 9,
  maxDetailLength: 1e3,
  maxAttributeStringLength: 500,
  maxExcerptLength: 1e3
});
var KnowledgeGraphAttributeScalarSchema = import_zod2.z.union([
  import_zod2.z.string().max(KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength).regex(
    SAFE_DISPLAY_STRING_PATTERN,
    "attribute strings must not contain control or bidi characters"
  ),
  import_zod2.z.number(),
  import_zod2.z.boolean(),
  import_zod2.z.null()
]);
var KnowledgeGraphAttributeValueSchema = import_zod2.z.union([
  KnowledgeGraphAttributeScalarSchema,
  import_zod2.z.array(KnowledgeGraphAttributeScalarSchema).max(KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems)
]);
var KnowledgeGraphAttributesSchema = import_zod2.z.record(normalizedRecordKey2, KnowledgeGraphAttributeValueSchema).superRefine((value, ctx) => {
  if (Object.keys(value).length > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      message: `knowledge-graph attributes may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxAttributes} keys`
    });
  }
});
var KnowledgeGraphEvidenceRefSchema = import_zod2.z.discriminatedUnion("kind", [
  import_zod2.z.object({
    kind: import_zod2.z.literal("graph_snapshot_record"),
    evidence_id: displayText(384),
    record_id: displayText(320),
    locator: displayText(240).optional()
  }).strict(),
  import_zod2.z.object({
    kind: import_zod2.z.literal("graph_node"),
    evidence_id: displayText(384),
    node_id: displayText(120),
    locator: displayText(240).optional(),
    excerpt: displayText(KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength).optional()
  }).strict(),
  import_zod2.z.object({
    kind: import_zod2.z.literal("citation"),
    evidence_id: displayText(384),
    paper_id: displayText(160),
    citation_id: displayText(160),
    page: import_zod2.z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    locator: displayText(240).optional(),
    excerpt: displayText(KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength).optional(),
    doi: displayText(240).optional()
  }).strict(),
  import_zod2.z.object({
    kind: import_zod2.z.literal("external_source"),
    evidence_id: displayText(384),
    source_id: displayText(240),
    locator: displayText(240).optional(),
    excerpt: displayText(KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength).optional()
  }).strict()
]);
var KnowledgeGraphEvidenceRefsSchema = import_zod2.z.array(KnowledgeGraphEvidenceRefSchema).min(1).max(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement).superRefine((evidence, ctx) => {
  if (!evidence.some((reference) => reference.kind !== "graph_node")) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      message: "evidence must contain at least one direct source anchor (graph_snapshot_record, citation, or external_source); graph_node references are supplemental only"
    });
  }
});
var KnowledgeGraphUncalibratedScoreSchema = import_zod2.z.object({
  kind: import_zod2.z.enum([
    "extraction_confidence",
    "citation_resolution_confidence",
    "structural_similarity",
    "behavioral_agreement",
    "retrieval_relevance"
  ]),
  value: import_zod2.z.number().min(0).max(1),
  calibrated_posterior: import_zod2.z.literal(false)
}).strict();
var DerivedAdvisoryEpistemicSchema = import_zod2.z.object({
  status: import_zod2.z.literal("derived_advisory"),
  advisory_only: import_zod2.z.literal(true),
  is_paper_local_evidence: import_zod2.z.literal(false),
  calibrated_posterior: import_zod2.z.literal(false)
}).strict();
var KnowledgeGraphNodeSchema = import_zod2.z.object({
  id: displayText(120),
  kind: import_zod2.z.enum(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS),
  label: displayText(240),
  detail: displayText(KNOWLEDGE_GRAPH_LIMITS.maxDetailLength).optional(),
  attributes: KnowledgeGraphAttributesSchema,
  epistemic: DerivedAdvisoryEpistemicSchema,
  evidence: KnowledgeGraphEvidenceRefsSchema,
  uncalibrated_score: KnowledgeGraphUncalibratedScoreSchema.optional()
}).strict();
var KnowledgeGraphEdgeSchema = import_zod2.z.object({
  id: displayText(320),
  source: displayText(120),
  target: displayText(120),
  kind: import_zod2.z.enum(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS),
  label: displayText(160),
  attributes: KnowledgeGraphAttributesSchema,
  epistemic: DerivedAdvisoryEpistemicSchema,
  evidence: KnowledgeGraphEvidenceRefsSchema,
  uncalibrated_score: KnowledgeGraphUncalibratedScoreSchema.optional()
}).strict();
var KnowledgeGraph3DParamsSchema = import_zod2.z.object({
  graph_id: displayText(160),
  graph_source: displayText(200),
  graph_snapshot_id: displayText(200),
  graph_scope: import_zod2.z.literal("corpus_entity"),
  generated_at: Rfc3339TimestampSchema,
  nodes: import_zod2.z.array(KnowledgeGraphNodeSchema).min(1).max(PARAM_LIMITS.maxGraphNodes),
  edges: import_zod2.z.array(KnowledgeGraphEdgeSchema).max(PARAM_LIMITS.maxGraphEdges)
}).strict().superRefine((value, ctx) => {
  const ids = /* @__PURE__ */ new Set();
  const nodeKinds = /* @__PURE__ */ new Map();
  const edgeIds = /* @__PURE__ */ new Set();
  const parallelCounts = /* @__PURE__ */ new Map();
  let issueCount = 0;
  const addIssue = (issue) => {
    if (issueCount >= 16) return;
    issueCount += 1;
    ctx.addIssue(issue);
  };
  value.nodes.forEach((node, index) => {
    if (ids.has(node.id)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["nodes", index, "id"],
        message: `duplicate node id '${node.id}'`
      });
    }
    ids.add(node.id);
    nodeKinds.set(node.id, node.kind);
  });
  value.edges.forEach((edge, index) => {
    if (edgeIds.has(edge.id)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index, "id"],
        message: `duplicate edge id '${edge.id}'`
      });
    }
    edgeIds.add(edge.id);
    const pairSource = edge.source > edge.target ? edge.target : edge.source;
    const pairTarget = edge.source > edge.target ? edge.source : edge.target;
    const pairKey = JSON.stringify([pairSource, pairTarget]);
    const parallelCount = (parallelCounts.get(pairKey) ?? 0) + 1;
    parallelCounts.set(pairKey, parallelCount);
    if (parallelCount > KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index],
        message: `at most ${KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair} parallel edges may connect one unordered node pair`
      });
    }
    if (!ids.has(edge.source)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index, "source"],
        message: `edge source '${edge.source}' does not reference a node`
      });
    }
    if (!ids.has(edge.target)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index, "target"],
        message: `edge target '${edge.target}' does not reference a node`
      });
    }
    if (edge.source === edge.target) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index],
        message: "self-loop edges are not renderable"
      });
    }
    const sourceKind = nodeKinds.get(edge.source);
    const targetKind = nodeKinds.get(edge.target);
    const expected = {
      cites: ["paper", "paper"],
      same_as: ["model", "model"],
      variant_of: ["model", "model"],
      instantiates: ["paper", "model"],
      belongs_to_family: ["model", "family"]
    };
    const [expectedSource, expectedTarget] = expected[edge.kind];
    if (sourceKind !== void 0 && targetKind !== void 0 && (sourceKind !== expectedSource || targetKind !== expectedTarget)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index],
        message: `${edge.kind} requires ${expectedSource} \u2192 ${expectedTarget} endpoints`
      });
    }
    const allowedScoreKinds = {
      cites: ["citation_resolution_confidence"],
      same_as: ["structural_similarity"],
      variant_of: ["structural_similarity"],
      instantiates: [],
      belongs_to_family: []
    };
    if (edge.uncalibrated_score && !allowedScoreKinds[edge.kind].includes(edge.uncalibrated_score.kind)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index, "uncalibrated_score", "kind"],
        message: `${edge.kind} does not allow score kind '${edge.uncalibrated_score.kind}'`
      });
    }
    const evidenceIds = /* @__PURE__ */ new Set();
    for (let evidenceIndex = 0; evidenceIndex < edge.evidence.length; evidenceIndex++) {
      const evidence = edge.evidence[evidenceIndex];
      if (evidenceIds.has(evidence.evidence_id)) {
        addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["edges", index, "evidence", evidenceIndex, "evidence_id"],
          message: `duplicate evidence id '${evidence.evidence_id}' on edge '${edge.id}'`
        });
      }
      evidenceIds.add(evidence.evidence_id);
      if (evidence.kind === "graph_node" && !ids.has(evidence.node_id)) {
        addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["edges", index, "evidence", evidenceIndex, "node_id"],
          message: `edge evidence node '${evidence.node_id}' does not reference a node`
        });
      }
    }
  });
  value.nodes.forEach((node, nodeIndex) => {
    if (node.uncalibrated_score && node.uncalibrated_score.kind !== "extraction_confidence") {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["nodes", nodeIndex, "uncalibrated_score", "kind"],
        message: `knowledge-graph nodes only allow score kind 'extraction_confidence'; received '${node.uncalibrated_score.kind}'`
      });
    }
    const evidenceIds = /* @__PURE__ */ new Set();
    for (let evidenceIndex = 0; evidenceIndex < node.evidence.length; evidenceIndex++) {
      const evidence = node.evidence[evidenceIndex];
      if (evidenceIds.has(evidence.evidence_id)) {
        addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["nodes", nodeIndex, "evidence", evidenceIndex, "evidence_id"],
          message: `duplicate evidence id '${evidence.evidence_id}' on node '${node.id}'`
        });
      }
      evidenceIds.add(evidence.evidence_id);
      if (evidence.kind === "graph_node" && !ids.has(evidence.node_id)) {
        addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["nodes", nodeIndex, "evidence", evidenceIndex, "node_id"],
          message: `node evidence node '${evidence.node_id}' does not reference a node`
        });
      }
    }
  });
});
var Spatial2DParamsSchema = import_zod2.z.object({
  positions: import_zod2.z.array(import_zod2.z.tuple([gpuNumber, gpuNumber])).min(1).max(PARAM_LIMITS.maxSpatialObjects),
  coordinate_units: units
}).strict();
var CorrelogramPairSchema = import_zod2.z.object({
  reference_label: displayText(240),
  target_label: displayText(240)
}).strict();
var CorrelogramStatisticSchema = import_zod2.z.discriminatedUnion("kind", [
  import_zod2.z.object({ kind: import_zod2.z.literal("raw_pair_count"), units: import_zod2.z.literal("count") }).strict(),
  import_zod2.z.object({ kind: import_zod2.z.literal("weighted_pair_sum"), units }).strict(),
  import_zod2.z.object({
    kind: import_zod2.z.literal("pair_rate_hz"),
    units: import_zod2.z.literal("Hz"),
    exposure_s: import_zod2.z.number().positive().max(Number.MAX_VALUE)
  }).strict(),
  import_zod2.z.object({
    kind: import_zod2.z.literal("pearson_coefficient"),
    units: import_zod2.z.literal("1"),
    sample_count: import_zod2.z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
  }).strict()
]);
function requireSymmetricLagAxis(lags, width, tauMax, ctx) {
  requireUniformHistogramBins(lags, width, ctx, "lags_ms");
  if (lags.length === 0 || !Number.isFinite(tauMax) || tauMax <= 0) return;
  if (lags.length % 2 === 0) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["lags_ms"],
      message: "a symmetric correlogram axis must contain an odd number of lag centers"
    });
    return;
  }
  if (!approximatelyEqual(
    lags[0],
    -tauMax,
    HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
  )) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["lags_ms", 0],
      message: "the first lag center must equal -tau_max_ms"
    });
  }
  const lastIndex = lags.length - 1;
  if (!approximatelyEqual(
    lags[lastIndex],
    tauMax,
    HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
  )) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["lags_ms", lastIndex],
      message: "the final lag center must equal tau_max_ms"
    });
  }
  const middle = Math.floor(lags.length / 2);
  if (!approximatelyEqual(
    lags[middle],
    0,
    HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
  )) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["lags_ms", middle],
      message: "the middle lag center must be zero"
    });
  }
  for (let index = 0; index < middle; index++) {
    if (!approximatelyEqual(
      lags[index],
      -lags[lastIndex - index],
      HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE
    )) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["lags_ms", index],
        message: "lag centers must be pairwise symmetric around zero"
      });
      break;
    }
  }
}
var CorrelogramParamsSchema = import_zod2.z.object({
  lags_ms: timeArray.min(1),
  values: gpuArray.min(1),
  bin_width_ms: import_zod2.z.number().positive().max(Number.MAX_VALUE),
  tau_max_ms: import_zod2.z.number().positive().max(Number.MAX_VALUE),
  counting_start_ms: import_zod2.z.number(),
  counting_stop_ms: import_zod2.z.number(),
  pair: CorrelogramPairSchema,
  lag_convention: import_zod2.z.literal("positive_target_after_reference"),
  binning: import_zod2.z.literal("left_closed_right_open"),
  zero_lag_policy: import_zod2.z.enum(["included", "excluded_self_pairs"]),
  statistic: CorrelogramStatisticSchema
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "values",
    "lags_ms",
    value.lags_ms.length,
    value.values.length
  );
  requireSymmetricLagAxis(
    value.lags_ms,
    value.bin_width_ms,
    value.tau_max_ms,
    ctx
  );
  if (!(value.counting_stop_ms > value.counting_start_ms)) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["counting_stop_ms"],
      message: "counting_stop_ms must be greater than counting_start_ms"
    });
  }
  for (let index = 0; index < value.values.length; index++) {
    const sample = value.values[index];
    const invalid = value.statistic.kind === "pearson_coefficient" ? sample < -1 || sample > 1 : value.statistic.kind === "raw_pair_count" ? sample < 0 || !Number.isSafeInteger(sample) : value.statistic.kind === "pair_rate_hz" ? sample < 0 : false;
    if (invalid) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["values", index],
        message: value.statistic.kind === "pearson_coefficient" ? "Pearson coefficients must lie in [-1, 1]" : value.statistic.kind === "raw_pair_count" ? "raw pair counts must be non-negative safe integers" : "pair rates cannot be negative"
      });
      break;
    }
  }
});
var StimulusResponseParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  stimulus: gpuArray.min(1),
  response: gpuArray.min(1)
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "stimulus",
    "times_ms",
    value.times_ms.length,
    value.stimulus.length
  );
  equalLengthIssue(
    ctx,
    "response",
    "times_ms",
    value.times_ms.length,
    value.response.length
  );
  requireMonotonic(value.times_ms, ctx, "times_ms");
});
var CompartmentalParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  compartments: import_zod2.z.array(
    import_zod2.z.object({
      id: displayText(120),
      parent_id: displayText(120).nullable(),
      label: displayText(240).optional(),
      values: gpuArray.min(1)
    }).strict()
  ).min(1).max(PARAM_LIMITS.maxSeries)
}).strict().superRefine((value, ctx) => {
  requireMonotonic(value.times_ms, ctx, "times_ms");
  const ids = /* @__PURE__ */ new Set();
  const parents = /* @__PURE__ */ new Map();
  let roots = 0;
  value.compartments.forEach((compartment, index) => {
    if (ids.has(compartment.id)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["compartments", index, "id"],
        message: `duplicate compartment id '${compartment.id}'`
      });
    }
    ids.add(compartment.id);
    parents.set(compartment.id, compartment.parent_id);
    if (compartment.parent_id === null) roots += 1;
    equalLengthIssue(
      ctx,
      `compartments.${index}.values`,
      "times_ms",
      value.times_ms.length,
      compartment.values.length
    );
  });
  if (roots === 0) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["compartments"],
      message: "at least one root compartment must have parent_id:null"
    });
  }
  value.compartments.forEach((compartment, index) => {
    if (compartment.parent_id !== null && !ids.has(compartment.parent_id)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["compartments", index, "parent_id"],
        message: `parent '${compartment.parent_id}' does not reference a compartment`
      });
    }
    const seen = /* @__PURE__ */ new Set();
    let cursor = compartment.id;
    while (cursor !== null && parents.has(cursor)) {
      if (seen.has(cursor)) {
        ctx.addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["compartments", index, "parent_id"],
          message: "compartment parent graph must be acyclic"
        });
        break;
      }
      seen.add(cursor);
      cursor = parents.get(cursor) ?? null;
    }
  });
});
var AnimationReplayParamsSchema = import_zod2.z.object({
  frames: import_zod2.z.array(
    import_zod2.z.object({
      time_ms: import_zod2.z.number().nonnegative(),
      state: import_zod2.z.record(normalizedRecordKey2, import_zod2.z.unknown()).refine((state) => Object.keys(state).length > 0, {
        message: "frame state must contain at least one field"
      }),
      annotation: displayText(500).optional()
    }).strict()
  ).min(1).max(1e4)
}).strict().superRefine((value, ctx) => {
  requireMonotonic(
    value.frames.map((frame) => frame.time_ms),
    ctx,
    "frames.time_ms"
  );
});

// core/skills/examples.ts
var synthetic = (declared_inputs) => ({
  source: "synthetic_test",
  calibrated_posterior: false,
  advisory_only: true,
  is_paper_local_evidence: false,
  synthetic: true,
  declared_inputs
});
var SKILL_EXAMPLE_PAYLOADS = {
  "nest.voltage_trace": {
    scene: "voltage-trace",
    params: {
      times_ms: [0, 1, 2],
      series: [[-65, -64, -63]],
      series_labels: ["neuron 1 \xB7 V_m"],
      units: "mV"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      device_id: "mm_1",
      recorded_variable: "V_m",
      units: "mV",
      sampling_interval: 0.1
    })
  },
  "nest.spike_raster": {
    scene: "spike-raster",
    params: { times_ms: [1, 2, 3], senders: [1, 2, 1] },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorder_id: "sr_1",
      sender_ids: "[1,2]",
      population_labels: "E",
      time_units: "ms"
    })
  },
  "nest.isi_distribution": {
    scene: "isi-distribution",
    params: {
      bin_centers_ms: [0.5, 1.5, 2.5],
      values: [2, 5, 1],
      bin_width_ms: 1,
      normalization: "count",
      value_units: "count",
      interval_scope: "per_sender"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorder_id: "sr_1",
      sender_ids: "[1,2]",
      population_labels: "E",
      time_units: "ms",
      bin_ms: 1,
      histogram_normalization: "count",
      interval_scope: "per_sender"
    })
  },
  "nest.psth": {
    scene: "psth",
    params: {
      bin_centers_ms: [2.5, 7.5, 12.5],
      values: [200, 800, 400],
      bin_width_ms: 5,
      normalization: "rate_hz",
      value_units: "Hz",
      trial_count: 1,
      alignment_event: "simulation origin",
      aggregation: "selected_senders_per_trial"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorder_id: "sr_1",
      sender_ids: "[1]",
      population_labels: "gamma generator",
      time_units: "ms",
      bin_ms: 5,
      histogram_normalization: "rate_hz",
      event_alignment: "simulation origin",
      psth_aggregation: "selected_senders_per_trial"
    })
  },
  "nest.population_rate": {
    scene: "population-rate",
    params: {
      bin_centers_ms: [2.5, 7.5, 12.5],
      bin_width_ms: 5,
      window_start_ms: 0,
      window_stop_ms: 15,
      series: [{
        id: "E",
        label: "Excitatory population",
        recorded_sender_count: 2,
        spike_counts: [1, 4, 2],
        rates_hz: [100, 400, 200]
      }],
      normalization: "mean_per_recorded_sender_hz",
      aggregation: "selected_senders",
      binning: "left_closed_right_open"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorder_id: "sr_1",
      sender_ids: "[1,2]",
      population_labels: "E",
      time_units: "ms",
      bin_ms: 5,
      rate_normalization: "mean_per_recorded_sender_hz",
      binning_policy: "left_closed_right_open"
    })
  },
  "nest.correlogram": {
    scene: "correlogram",
    params: {
      lags_ms: [-2, -1, 0, 1, 2],
      values: [1, 4, 10, 4, 1],
      bin_width_ms: 1,
      tau_max_ms: 2,
      counting_start_ms: 0,
      counting_stop_ms: 1e3,
      pair: {
        reference_label: "E",
        target_label: "E"
      },
      lag_convention: "positive_target_after_reference",
      binning: "left_closed_right_open",
      zero_lag_policy: "included",
      statistic: {
        kind: "raw_pair_count",
        units: "count"
      }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      detector_id: "cd_1",
      reference_population: "E",
      target_population: "E",
      bin_ms: 1,
      correlation_normalization: "raw_pair_count",
      correlation_units: "count",
      lag_convention: "positive_target_after_reference",
      binning_policy: "left_closed_right_open"
    })
  },
  "nest.rate_response": {
    scene: "fi-curve",
    params: {
      stimulus_amplitudes: [0, 100, 200],
      rates_hz: [0, 12, 31],
      stimulus_units: "pA"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ stim_units: "pA", bin_ms: 100, rate_normalization: "spikes/s" })
  },
  "nest.connectivity_matrix": {
    scene: "network-topology",
    params: {
      sources: [1, 2],
      targets: [2, 3],
      weights: [1, 0.5],
      weight_units: "pA"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[2,3]",
      synapse_model: "static_synapse",
      weight_units: "pA",
      connection_sample_policy: "complete"
    })
  },
  "nest.connection_graph": {
    scene: "network-topology",
    params: {
      nodes: [
        { id: 1, label: "1" },
        { id: 2, label: "2" },
        { id: 3, label: "3" }
      ],
      edges: [
        { id: "connection:0", source: 1, target: 2, weight: 1, delay_ms: 1.5, synapse_model: "static_synapse" },
        { id: "connection:1", source: 1, target: 2, weight: 0.5, delay_ms: 2, synapse_model: "static_synapse" }
      ],
      weight_units: "pA",
      delay_units: "ms",
      layout: "schematic_circle",
      parallel_edges: "preserved",
      self_connections: "preserved",
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" },
      sample_policy: "complete",
      source_connection_count: 2,
      edge_identity: "canonical_sorted_ordinal"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,3]",
      target_ids: "[2,3]",
      synapse_model: "static_synapse",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "preserved",
      weight_units: "pA",
      delay_units: "ms"
    })
  },
  "nest.adjacency_matrix": {
    scene: "connection-matrix",
    params: {
      source_ids: [1, 2],
      target_ids: [3, 4],
      cells: [{ source_id: 1, target_id: 3, connection_count: 2 }],
      axis_order: "target_rows_source_columns",
      absent_cell: "no_connection",
      sample_policy: "complete",
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" },
      display: "binary_presence",
      aggregation: "any_connection"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "preserved_as_connection_count",
      matrix_axis_order: "target_rows_source_columns",
      matrix_aggregation: "any_connection"
    })
  },
  "nest.weight_matrix": {
    scene: "connection-matrix",
    params: {
      source_ids: [1, 2],
      target_ids: [3, 4],
      cells: [{ source_id: 1, target_id: 3, connection_count: 2, value: 0 }],
      weight_units: "pA",
      aggregation: "sum",
      axis_order: "target_rows_source_columns",
      absent_cell: "no_connection",
      sample_policy: "complete",
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      weight_units: "pA",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "preserved_as_connection_count",
      matrix_axis_order: "target_rows_source_columns",
      matrix_aggregation: "sum"
    })
  },
  "nest.delay_matrix": {
    scene: "connection-matrix",
    params: {
      source_ids: [1, 2],
      target_ids: [3, 4],
      cells: [{ source_id: 1, target_id: 3, connection_count: 2, value: 1.5 }],
      delay_units: "ms",
      aggregation: "mean",
      axis_order: "target_rows_source_columns",
      absent_cell: "no_connection",
      sample_policy: "complete",
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      delay_units: "ms",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "preserved_as_connection_count",
      matrix_axis_order: "target_rows_source_columns",
      matrix_aggregation: "mean"
    })
  },
  "nest.in_degree_distribution": {
    scene: "degree-distribution",
    params: {
      degrees: [0, 1, 2],
      node_counts: [1, 0, 1],
      values: [1, 0, 1],
      node_count: 2,
      connection_count: 2,
      direction: "in",
      normalization: "count",
      value_units: "count",
      edge_counting: "each_synapse_collection_entry",
      zero_degree_policy: "include_declared_universe",
      sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "count_each_connection",
      degree_direction: "in",
      degree_counting: "each_synapse_collection_entry",
      zero_degree_policy: "include_declared_universe",
      histogram_normalization: "count"
    })
  },
  "nest.out_degree_distribution": {
    scene: "degree-distribution",
    params: {
      degrees: [0, 1],
      node_counts: [1, 2],
      values: [1, 2],
      node_count: 3,
      connection_count: 2,
      direction: "out",
      normalization: "count",
      value_units: "count",
      edge_counting: "each_synapse_collection_entry",
      zero_degree_policy: "include_declared_universe",
      sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,3]",
      target_ids: "[4,5]",
      synapse_model: "static_synapse",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "count_each_connection",
      degree_direction: "out",
      degree_counting: "each_synapse_collection_entry",
      zero_degree_policy: "include_declared_universe",
      histogram_normalization: "count"
    })
  },
  "nest.delay_distribution": {
    scene: "delay-distribution",
    params: {
      bin_centers_ms: [0.5, 1.5, 2.5],
      delay_counts: [0, 1, 1],
      values: [0, 1, 1],
      bin_width_ms: 1,
      window_start_ms: 0,
      window_stop_ms: 3,
      normalization: "count",
      value_units: "count",
      delay_units: "ms",
      aggregation: "each_connection",
      binning: "left_closed_right_open",
      sample_policy: "complete",
      connection_count: 2,
      snapshot_time_ms: 100,
      snapshot_scope: { kind: "single_process_complete" }
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      delay_units: "ms",
      connection_sample_policy: "complete",
      snapshot_time_ms: 100,
      snapshot_scope: "single_process_complete",
      parallel_edge_policy: "count_each_connection",
      bin_ms: 1,
      histogram_normalization: "count",
      binning_policy: "left_closed_right_open"
    })
  },
  "nest.weight_histogram": {
    scene: "weight-histogram",
    params: {
      bin_centers: [-2, -1, 0, 1, 2],
      values: [3, 5, 0, 7, 2],
      bin_width: 1,
      weight_units: "pA",
      normalization: "count",
      value_units: "count",
      snapshot_time_ms: 1e3
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[3,4]",
      synapse_model: "static_synapse",
      weight_units: "pA",
      histogram_normalization: "count",
      connection_sample_policy: "all matching connections at snapshot_time_ms"
    })
  },
  "nest.spatial_map_2d": {
    scene: "spatial-map-2d",
    params: {
      nodes: [
        { id: 41, label: "41", x: -0.5, y: 0 },
        { id: 99, label: "99", x: 0.5, y: 0 }
      ],
      coordinate_units: "model units",
      extent: [2, 1],
      center: [0, 0],
      edge_wrap: false,
      position_scope: { kind: "single_process_complete" },
      marker_size: "fixed_screen_space"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      node_ids: "[41,99]",
      spatial_units: "model units",
      extent: "[2,1]",
      position_scope: "single_process_complete"
    })
  },
  "nest.spatial_3d": {
    scene: "network-topology",
    params: {
      objects: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      coordinate_units: "mm"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      extent: "[1,1,1]",
      spatial_units: "mm",
      projection_sample_policy: "all"
    })
  },
  "nest.plasticity_dynamics": {
    scene: "stdp",
    params: { times_ms: [0, 10, 20], weights: [1, 1.1, 1.05], weight_units: "nS" },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ synapse_model: "stdp_synapse", weight_units: "nS" })
  },
  "nest.phase_plane": {
    scene: "phase-plane",
    params: {
      grid: { v: [-70, -50], w: [0, 1] },
      derivatives: {
        v: [0.2, 0.1, -0.1, -0.2],
        w: [-0.05, 0.05, -0.05, 0.05]
      },
      axis_units: { v: "mV", w: "1" },
      derivative_units: { v: "mV/ms", w: "1/ms" },
      axis_order: ["v", "w"],
      flattening: "row-major-last-axis-fastest"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      state_variables: "V,w",
      derivation_method: "model equations evaluated on Cartesian grid",
      model_context: "Hodgkin-Huxley reduced phase plane",
      fixed_parameters: "all non-plotted state variables clamped to declared values"
    })
  },
  "nest.astrocyte_dynamics": {
    scene: "voltage-trace",
    params: { times_ms: [0, 1, 2], ca_trace: [0.1, 0.2, 0.15], units: "uM" },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorded_variable: "Ca",
      units: "uM",
      time_units: "ms",
      sampling_interval: 1
    })
  },
  "corpus.knowledge_graph": {
    scene: "knowledge-graph-3d",
    params: {
      graph_id: "corpus-entity-graph",
      graph_source: "engram:corpus_entity_graph",
      graph_snapshot_id: "sha256:example-corpus-snapshot",
      graph_scope: "corpus_entity",
      generated_at: "2026-07-11T00:00:00Z",
      nodes: [
        {
          id: "p1",
          kind: "paper",
          label: "Brunel 2000",
          detail: "Balanced random network paper",
          attributes: { family: "LIF", n_neurons: 2, n_synapses: 2 },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-node-p1",
            record_id: "node:p1"
          }]
        },
        {
          id: "m1",
          kind: "model",
          label: "iaf_psc_delta",
          attributes: { family: "LIF", paper_count: 1 },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-node-m1",
            record_id: "node:m1"
          }]
        },
        {
          id: "m2",
          kind: "model",
          label: "iaf_psc_alpha",
          attributes: { family: "LIF", paper_count: 1 },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-node-m2",
            record_id: "node:m2"
          }]
        },
        {
          id: "f1",
          kind: "family",
          label: "LIF family",
          attributes: { paper_count: 2 },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-node-f1",
            record_id: "node:f1"
          }]
        }
      ],
      edges: [
        {
          id: "edge:p1-instantiates-m1",
          source: "p1",
          target: "m1",
          kind: "instantiates",
          label: "instantiates",
          attributes: {},
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-edge-p1-m1",
            record_id: "edge:p1-instantiates-m1"
          }]
        },
        {
          id: "edge:m2-variant-m1",
          source: "m2",
          target: "m1",
          kind: "variant_of",
          label: "variant of",
          attributes: { delta_summary: "alpha-shaped postsynaptic current" },
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-edge-m2-m1",
            record_id: "edge:m2-variant-m1"
          }],
          uncalibrated_score: {
            kind: "structural_similarity",
            value: 0.72,
            calibrated_posterior: false
          }
        },
        {
          id: "edge:m1-family-f1",
          source: "m1",
          target: "f1",
          kind: "belongs_to_family",
          label: "belongs to family",
          attributes: {},
          epistemic: {
            status: "derived_advisory",
            advisory_only: true,
            is_paper_local_evidence: false,
            calibrated_posterior: false
          },
          evidence: [{
            kind: "graph_snapshot_record",
            evidence_id: "snapshot-edge-m1-f1",
            record_id: "edge:m1-family-f1"
          }]
        }
      ]
    },
    mode: "interactive",
    themeMode: "dark",
    // advisory_only:true — identity edges are advisory structural similarity.
    provenance: {
      ...synthetic({
        graph_source: "engram:corpus_entity_graph",
        graph_snapshot_id: "sha256:example-corpus-snapshot",
        graph_scope: "corpus_entity",
        identity_advisory: true
      }),
      advisory_only: true
    }
  }
};
var HOST_RENDERER_EXAMPLE_PAYLOADS = {
  "nest.spatial_2d": {
    skill: "nest.spatial_2d",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "d3",
    params: { positions: [[0, 0], [1, 1]], coordinate_units: "mm" },
    provenance: synthetic({
      extent: "[1,1]",
      spatial_units: "mm",
      mask: "none",
      kernel: "none"
    })
  },
  "nest.stimulus_response": {
    skill: "nest.stimulus_response",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "matplotlib",
    params: {
      times_ms: [0, 1, 2],
      stimulus: [0, 1, 0],
      response: [-65, -60, -64]
    },
    provenance: synthetic({ stim_units: "pA", units: "mV", time_units: "ms" })
  },
  "nest.compartmental_dynamics": {
    skill: "nest.compartmental_dynamics",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "d3",
    params: {
      times_ms: [0, 1, 2],
      compartments: [
        {
          id: "soma",
          parent_id: null,
          label: "soma",
          values: [-65, -64, -63]
        }
      ]
    },
    provenance: synthetic({
      morphology_disclaimer: "schematic topology; no inferred geometry",
      recorded_variable: "V_m",
      units: "mV",
      time_units: "ms",
      sampling_interval: 1
    })
  },
  "nest.animation_replay": {
    skill: "nest.animation_replay",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "manim",
    params: { frames: [{ time_ms: 0, state: { status: "initial" } }] },
    provenance: synthetic({ frame_rate: 30 })
  }
};
function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) deepFreezeJson(child);
  Object.freeze(value);
}
for (const [skill, payload] of Object.entries(SKILL_EXAMPLE_PAYLOADS)) {
  if (!payload) continue;
  payload.skill = skill;
  payload.specVersion = CORTEXEL_SPEC_VERSION;
  deepFreezeJson(payload);
}
Object.setPrototypeOf(SKILL_EXAMPLE_PAYLOADS, null);
Object.freeze(SKILL_EXAMPLE_PAYLOADS);
for (const payload of Object.values(HOST_RENDERER_EXAMPLE_PAYLOADS)) {
  if (payload) deepFreezeJson(payload);
}
Object.setPrototypeOf(HOST_RENDERER_EXAMPLE_PAYLOADS, null);
Object.freeze(HOST_RENDERER_EXAMPLE_PAYLOADS);
function getExamplePayload(id2) {
  if (!isSkillId(id2)) return void 0;
  const payload = SKILL_EXAMPLE_PAYLOADS[id2];
  return payload ? JSON.parse(JSON.stringify(payload)) : void 0;
}
function getHostRendererExamplePayload(id2) {
  if (!isSkillId(id2)) return void 0;
  const payload = HOST_RENDERER_EXAMPLE_PAYLOADS[id2];
  return payload ? JSON.parse(JSON.stringify(payload)) : void 0;
}
function getInvocationExamplePayload(id2) {
  return getExamplePayload(id2) ?? getHostRendererExamplePayload(id2);
}

// core/skills/registry.ts
var CORTEXEL_SKILL_VERSION = "1.6.0";
var STRICT_INVOCATION_POLICY = Object.freeze({
  version: "2",
  externalSelection: "validateSkillInvocation(id,payload): explicit id selects; payload.skill is optional but must match when present",
  selfDescribingSelection: "validateSpec(payload): payload.skill is required and selects the contract",
  hostSelection: "host envelopes require payload.skill; explicit id and payload.skill must match",
  unknownSkillIds: "reject",
  cortexelEnvelope: "allowed iff contract.scene is non-null; payload.scene must equal contract.scene",
  hostEnvelope: "allowed iff contract.scene is null; scene is forbidden",
  rendererRoute: "when selected, must occur in contract.rendererRoutes",
  params: "validate paramsJsonSchema then every paramConstraint",
  provenance: "apply strictProvenancePolicy, require every contract.requiredProvenanceFlags value, then evaluate every provenanceParamConstraint"
});
var PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: "8",
  pathSyntax: "dot-separated object keys",
  arrayWildcard: "[*]",
  objectValueWildcard: "*",
  optionalSuffix: "?",
  evaluationOrder: Object.freeze([
    "normalize fields carrying x-cortexel-normalize",
    "validate paramsJsonSchema",
    "evaluate paramConstraints in listed order"
  ]),
  kinds: Object.freeze([
    "equal_length",
    "each_length_matches",
    "monotonic_non_decreasing",
    "non_negative",
    "property_count",
    "unique_field",
    "unique_tuple",
    "references_exist",
    "no_self_loops",
    "same_keys",
    "cartesian_product_length",
    "permutation_of_keys",
    "endpoint_kinds",
    "mapped_value",
    "conditional_numeric_domain",
    "uniform_histogram_bins",
    "normalized_histogram_mass",
    "psth_derived_counts",
    "max_parallel_edges",
    "each_unique_field",
    "each_contains_field_value",
    "node_score_kind",
    "edge_score_kind",
    "ordered_interval",
    "uniform_bin_window",
    "population_rate_derived_values",
    "symmetric_lag_axis",
    "legacy_connection_channels",
    "connection_graph_snapshot",
    "matrix_connection_counts",
    "degree_distribution_consistency",
    "delay_distribution_consistency",
    "spatial_extent_bounds",
    "scope_compatibility",
    "acyclic"
  ]),
  semantics: Object.freeze({
    equal_length: Object.freeze({
      pathRoles: "all paths resolve to arrays",
      rule: "all present arrays have identical length",
      optionalAbsent: "skip a path ending in ?"
    }),
    each_length_matches: Object.freeze({
      pathRoles: "first path resolves zero or more arrays; last path is the reference array",
      rule: "every first-path array length equals the reference-array length"
    }),
    monotonic_non_decreasing: Object.freeze({
      pathRoles: "each path resolves an ordered numeric sequence",
      rule: "for every adjacent pair previous <= next"
    }),
    non_negative: Object.freeze({
      pathRoles: "each path resolves numeric values",
      rule: "every resolved number is >= 0"
    }),
    property_count: Object.freeze({
      pathRoles: "each path resolves objects",
      rule: "own enumerable property count is within optional min/max inclusive"
    }),
    unique_field: Object.freeze({
      pathRoles: "the first path resolves an array of objects; field names the key",
      rule: "field values are unique under JSON scalar equality"
    }),
    unique_tuple: Object.freeze({
      pathRoles: "paths resolve equal-length scalar sequences zipped by index",
      rule: "zipped JSON tuples are unique; when the final kind value is in symmetricKinds, canonicalize the first two tuple values lexicographically"
    }),
    references_exist: Object.freeze({
      pathRoles: "all paths except the last resolve references; the last resolves the allowed-id set",
      rule: "every non-null reference occurs in the allowed-id set"
    }),
    no_self_loops: Object.freeze({
      pathRoles: "first and second paths resolve equal-length source and target sequences",
      rule: "source[index] !== target[index] for every index"
    }),
    same_keys: Object.freeze({
      pathRoles: "paths resolve objects",
      rule: "all objects have exactly the same own enumerable string-key set"
    }),
    cartesian_product_length: Object.freeze({
      pathRoles: "first path resolves axis arrays; second path resolves output arrays",
      rule: "every output-array length equals the product of all axis-array lengths"
    }),
    permutation_of_keys: Object.freeze({
      pathRoles: "first path resolves a scalar sequence; second path resolves an object",
      rule: "the sequence contains every object key exactly once"
    }),
    endpoint_kinds: Object.freeze({
      pathRoles: "first path resolves edges with source/target/kind; second resolves nodes with id/kind",
      rule: "each edge endpoint node kind equals allowedEndpointKinds[edge.kind]"
    }),
    mapped_value: Object.freeze({
      pathRoles: "first path resolves a discriminator scalar; second path resolves its dependent scalar",
      rule: "the second value equals allowedValues[first value]"
    }),
    conditional_numeric_domain: Object.freeze({
      pathRoles: "first path resolves a discriminator scalar; second path resolves numeric values",
      rule: "every numeric value satisfies numericDomains[discriminator] inclusive min/max and optional integer requirement"
    }),
    uniform_histogram_bins: Object.freeze({
      pathRoles: "first path resolves the ordered bin-center array; second path resolves one numeric bin width",
      rule: "width is positive and finite; centers are strictly increasing; each adjacent delta approximately equals width",
      comparison: "abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))",
      nonNegativeLowerEdge: "when true, firstCenter-width/2 must be >= -tolerance, where tolerance uses firstCenter and width/2 in the same comparison formula"
    }),
    normalized_histogram_mass: Object.freeze({
      pathRoles: "first path resolves normalization mode; second resolves histogram values; third resolves bin width",
      absentMode: "when normalizationRules has no entry for the selected mode, skip the constraint",
      accumulation: "values must be finite and non-negative and are summed from index 0 to length-1 using IEEE-754 binary64 addition",
      measures: Object.freeze({
        sum: "compare the left-to-right value sum with target",
        density_integral: "multiply the left-to-right value sum by the positive finite width, then compare with target"
      }),
      comparison: "abs(actual-target) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(target))"
    }),
    psth_derived_counts: Object.freeze({
      pathRoles: "normalization mode, values array, positive safe-integer trial count, positive finite bin width in ms, and aggregation literal in that order",
      aggregation: "selected_senders_per_trial means each bin count is the aggregate number of raw spike events from all selected senders across the declared trials",
      recovery: Object.freeze({
        count: "rawCount = value",
        count_per_trial: "rawCount = value * trialCount",
        rate_hz: "rawCount = ((value * trialCount) * binWidthMs) / 1000"
      }),
      operationOrder: "evaluate the displayed rate_hz expression left-to-right with IEEE-754 binary64 operations; do not fuse or algebraically reorder it",
      nearestInteger: "round rawCount to the nearest mathematical integer; exact half ties go toward positive infinity (half ties necessarily fail the 1e-6 recovery tolerance)",
      rule: "count values are exact non-negative safe integers; normalized values pass only when rawCount and rounded are finite, rounded is a non-negative safe integer, and abs(rawCount-rounded) <= absoluteTolerance",
      relativeTolerance: "none; this constraint uses absoluteTolerance only"
    }),
    max_parallel_edges: Object.freeze({
      pathRoles: "the first path resolves an array of edges with source and target ids",
      pairIdentity: "source/target direction is ignored; canonicalize each pair by ECMAScript UTF-16 lexicographic order",
      rule: "the number of edges for every canonical unordered endpoint pair is <= max"
    }),
    each_unique_field: Object.freeze({
      pathRoles: "the first path resolves zero or more arrays of objects; field names the key",
      rule: "within each resolved array, field values are unique under JSON scalar equality"
    }),
    each_contains_field_value: Object.freeze({
      pathRoles: "the first path resolves zero or more arrays of objects; field names the key",
      rule: "within each resolved array, at least one object field value occurs in allowedFieldValues under JSON string equality"
    }),
    node_score_kind: Object.freeze({
      pathRoles: "the first path resolves an array of nodes with kind and optional uncalibrated_score.kind",
      absentScore: "an absent uncalibrated_score passes",
      rule: "a present score discriminator occurs in allowedScoreKinds[node.kind]"
    }),
    edge_score_kind: Object.freeze({
      pathRoles: "the first path resolves an array of edges with kind and optional uncalibrated_score.kind",
      absentScore: "an absent uncalibrated_score passes",
      rule: "a present score discriminator occurs in allowedScoreKinds[edge.kind]; an empty allowed list forbids scores for that edge kind"
    }),
    ordered_interval: Object.freeze({
      pathRoles: "first path resolves one finite interval start; second resolves one finite interval stop",
      rule: "stop is strictly greater than start"
    }),
    uniform_bin_window: Object.freeze({
      pathRoles: "ordered bin-center array, positive finite bin width, finite window start, finite window stop in that order",
      rule: "centers are strictly increasing and uniformly spaced by width; firstCenter-width/2 equals start and lastCenter+width/2 equals stop",
      binning: "left-closed, right-open bins exactly tile [start,stop)",
      spacingComparison: "adjacent center deltas use abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual),abs(expected))",
      edgeComparison: "exact edge equality passes; otherwise the binary64 allowance must be <= maxRoundoffFraction * abs(binWidth), then abs(edge-expected) <= absoluteTolerance + relativeTolerance * abs(binWidth) + roundoffUlps * 2^-52 * max(abs(center),abs(binWidth/2),abs(edge),abs(expected)); an unresolved absolute origin fails closed"
    }),
    population_rate_derived_values: Object.freeze({
      pathRoles: "series array, shared bin-center array, positive finite bin width, normalization, aggregation, and binning literals in that order",
      fixedSemantics: "normalization=mean_per_recorded_sender_hz; aggregation=selected_senders; binning=left_closed_right_open",
      seriesRule: "series ids are unique; recorded_sender_count is a positive safe integer; spike_counts are non-negative safe integers; spike_counts and rates_hz each match the shared bin count",
      rateFormula: "expected = (spikeCount * 1000) / (recordedSenderCount * binWidthMs)",
      operationOrder: "multiply spikeCount by 1000; multiply recordedSenderCount by binWidthMs; divide the first result by the second using IEEE-754 binary64; do not fuse or algebraically reorder",
      comparison: "abs(rate-expected) <= absoluteTolerance + relativeTolerance * max(abs(rate), abs(expected))"
    }),
    symmetric_lag_axis: Object.freeze({
      pathRoles: "ordered lag-center array, positive finite bin width, positive finite tau_max_ms in that order",
      rule: "lags are strictly increasing, uniformly spaced by width, odd in count, pairwise symmetric about a zero center, and span exactly [-tau_max_ms,+tau_max_ms]",
      comparison: "abs(actual-expected) <= absoluteTolerance + relativeTolerance * max(abs(actual), abs(expected))"
    }),
    legacy_connection_channels: Object.freeze({
      pathRoles: "optional weights array, optional weight_units, optional delays array, and optional delay_units in that order",
      rule: "weights and weight_units occur together; delays and delay_units occur together; every present delay is finite and strictly positive",
      emptyChannels: "a present empty measurement array still requires its matching unit"
    }),
    connection_graph_snapshot: Object.freeze({
      pathRoles: "nodes array, edges array, sample_policy, source_connection_count, optional weight_units, optional delay_units, and edge_identity in that order",
      rule: "node and edge ids are unique; every edge endpoint exists; weight, delay_ms, and synapse_model are each present on every edge or none; measurement units occur exactly with their channel; complete output has edges.length=source_connection_count; deterministic_even_stride is a non-empty strict subset",
      identity: "canonical_sorted_ordinal requires connection:<safe ordinal> with ordinal < source_connection_count; nest_connection_identifier requires connection:source:target:target_thread:synapse_id:port with canonical nonnegative safe-integer components and endpoint correlation"
    }),
    matrix_connection_counts: Object.freeze({
      pathRoles: "ordered source_ids, ordered target_ids, sparse cells, total connection_count, and aggregation in that order",
      rule: "axis ids are unique; every cell has a unique in-universe source/target pair and positive safe-integer connection_count; the left-to-right safe-integer cell-count sum equals connection_count; single_connection requires every cell count to equal one",
      absence: "a missing sparse cell means no_connection; a present zero-valued weight cell remains a connection because connection_count is positive"
    }),
    degree_distribution_consistency: Object.freeze({
      pathRoles: "degrees, node_counts, displayed values, node_count, connection_count, direction, normalization, value_units, edge_counting, and zero_degree_policy in that order",
      rule: "degrees equal contiguous integers 0..N; counts and nonnegative values match their length; sum(node_counts)=node_count; sum(degree*node_count)=connection_count; displayed counts equal raw counts exactly; probabilities match raw count/node_count and sum to one",
      fixedSemantics: "edge_counting=each_synapse_collection_entry and zero_degree_policy=include_declared_universe"
    }),
    delay_distribution_consistency: Object.freeze({
      pathRoles: "bin centers, raw delay_counts, displayed values, bin width, connection_count, normalization, value units, delay units, aggregation, and binning in that order",
      rule: "the three bin arrays have equal length; displayed values are finite and nonnegative; sum(delay_counts)=connection_count; displayed counts equal raw counts exactly; probabilities or densities exactly equal the published binary64 recovery result and globally sum or integrate to one within the accumulated-mass tolerance; non-count normalization requires a non-empty snapshot and finite density denominator",
      operationOrder: "probability=count/connection_count; probability_density=count/(connection_count*bin_width_ms) using IEEE-754 binary64; per-bin comparison uses exact Object.is-equivalent binary64 identity, while absoluteTolerance/relativeTolerance apply only to accumulated normalized mass",
      geometry: "a separate uniform_bin_window constraint publishes and evaluates exact [start,stop) bin geometry"
    }),
    spatial_extent_bounds: Object.freeze({
      pathRoles: "nodes array, extent tuple, and center tuple in that order",
      rule: "center \xB1 extent/2 must produce a strictly ordered representable interval on each axis; node ids are unique and every coordinate lies within those bounds using a separate tolerance for each axis",
      comparison: "axisTolerance = absoluteTolerance + relativeTolerance * abs(halfExtent) + boundedRoundoff; boundedRoundoff is the roundoffUlps * 2^-52 arithmetic allowance only when it is <= maxRoundoffFraction * abs(halfExtent), otherwise zero; the large absolute spatial origin never multiplies relativeTolerance",
      roundoff: "roundoffUlps and maxRoundoffFraction bound IEEE-754 binary64 repair for deriving center \xB1 extent/2; exact in-bound comparisons remain valid when repair is disabled"
    }),
    scope_compatibility: Object.freeze({
      pathRoles: "scope object and optional degree direction in that order",
      rule: "rank-local scopes require integer 0<=rank<world_size; merged scopes require positive world_size; out-degree forbids mpi_target_rank_local"
    }),
    acyclic: Object.freeze({
      pathRoles: "first path resolves node ids; second resolves each node parent id or null",
      rule: "following parent links from any id never revisits an id"
    })
  })
});
var NEST_SKILL_REGISTRY = {
  "nest.voltage_trace": {
    id: "nest.voltage_trace",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST voltage trace renderer",
    description: "Render labeled multimeter/voltmeter series for one recorded variable and unit.",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    requiredInputKeys: ["times_ms", "series", "series_labels", "units"],
    paramsSchema: VoltageTraceParamsSchema,
    requiredProvenanceKeys: [
      "device_id",
      "recorded_variable",
      "units",
      "sampling_interval"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "units",
        paramKey: "units",
        description: "Declared units must match the rendered trace-axis units."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "One neuron example / multimeter recording",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/one_neuron.html",
        dataShape: "times_ms + same-unit series split and labeled by sender",
        output: "Labeled same-unit trace series over the checked millisecond axis",
        note: "Use one invocation per variable/unit; never mix mV, pA and nS on one axis."
      }
    ]
  },
  "nest.spike_raster": {
    id: "nest.spike_raster",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST spike raster renderer",
    description: "Render exact spike_recorder event times and sender ids as a sender-time raster.",
    deviceFamily: "spike_recorder",
    scene: "spike-raster",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "events" },
    requiredInputKeys: ["times_ms", "senders"],
    paramsSchema: SpikeRasterParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Random balanced Brunel network",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html",
        dataShape: "spike_recorder events: times_ms, senders, population labels",
        output: "Exact sender-time raster with no invented rate bins or synthetic events",
        note: "Use exact spike times first; aggregate only when too dense to read."
      }
    ]
  },
  "nest.isi_distribution": {
    id: "nest.isi_distribution",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST inter-spike interval distribution renderer",
    description: "Render an explicitly normalized histogram of within-sender or single-train inter-spike intervals.",
    deviceFamily: "spike_recorder",
    scene: "isi-distribution",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "isi" },
    requiredInputKeys: [
      "bin_centers_ms",
      "values",
      "bin_width_ms",
      "normalization",
      "value_units",
      "interval_scope"
    ],
    paramsSchema: IsiDistributionParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units",
      "bin_ms",
      "histogram_normalization",
      "interval_scope"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "Inter-spike interval bin centers and widths are expressed in milliseconds."
      },
      {
        kind: "equals_param",
        provenanceKey: "bin_ms",
        paramKey: "bin_width_ms",
        description: "Declared bin width must match params.bin_width_ms."
      },
      {
        kind: "equals_param",
        provenanceKey: "histogram_normalization",
        paramKey: "normalization",
        description: "Declared histogram normalization must match params.normalization."
      },
      {
        kind: "equals_param",
        provenanceKey: "interval_scope",
        paramKey: "interval_scope",
        description: "Declared interval scope must match the rendered interval calculation."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Sinusoidal gamma generator example",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/sinusoidal_gamma_generator.html",
        dataShape: "ordered ISI bin centers plus counts, probabilities, or probability density",
        output: "Inter-spike interval histogram with explicit scope and normalization",
        note: "Compute intervals within each sender; never difference a globally interleaved recorder stream."
      }
    ]
  },
  "nest.psth": {
    id: "nest.psth",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST peri-stimulus time histogram renderer",
    description: "Render trial-aligned aggregate spike counts across selected senders, counts per trial, or firing rates around a declared event.",
    deviceFamily: "spike_recorder",
    scene: "psth",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "psth" },
    requiredInputKeys: [
      "bin_centers_ms",
      "values",
      "bin_width_ms",
      "normalization",
      "value_units",
      "trial_count",
      "alignment_event",
      "aggregation"
    ],
    paramsSchema: PsthParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units",
      "bin_ms",
      "histogram_normalization",
      "event_alignment",
      "psth_aggregation"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "PSTH bin centers and widths are expressed in milliseconds."
      },
      {
        kind: "equals_param",
        provenanceKey: "bin_ms",
        paramKey: "bin_width_ms",
        description: "Declared bin width must match params.bin_width_ms."
      },
      {
        kind: "equals_param",
        provenanceKey: "histogram_normalization",
        paramKey: "normalization",
        description: "Declared histogram normalization must match params.normalization."
      },
      {
        kind: "equals_param",
        provenanceKey: "event_alignment",
        paramKey: "alignment_event",
        description: "Declared event alignment must match params.alignment_event."
      },
      {
        kind: "equals_param",
        provenanceKey: "psth_aggregation",
        paramKey: "aggregation",
        description: "Declared PSTH aggregation must match params.aggregation."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Sinusoidal gamma generator example (one selected sender, one trial)",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/sinusoidal_gamma_generator.html",
        dataShape: "single-trial time bins aggregated across the selected sender set",
        output: "Peri-stimulus time histogram with auditable normalization",
        note: "The linked example is one trial; keep sender aggregation, trial count, bin width and alignment event in the checked payload."
      }
    ]
  },
  "nest.population_rate": {
    id: "nest.population_rate",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST population-rate renderer",
    description: "Render auditable mean firing-rate series derived from raw per-bin spike counts and the exact recorded-sender denominator.",
    deviceFamily: "spike_recorder",
    scene: "population-rate",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "population_rate" },
    requiredInputKeys: [
      "bin_centers_ms",
      "bin_width_ms",
      "window_start_ms",
      "window_stop_ms",
      "series",
      "normalization",
      "aggregation",
      "binning"
    ],
    paramsSchema: PopulationRateParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units",
      "bin_ms",
      "rate_normalization",
      "binning_policy"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "Population-rate bin centers, widths, and window bounds are expressed in milliseconds."
      },
      {
        kind: "equals_param",
        provenanceKey: "bin_ms",
        paramKey: "bin_width_ms",
        description: "Declared bin width must match params.bin_width_ms."
      },
      {
        kind: "equals_param",
        provenanceKey: "rate_normalization",
        paramKey: "normalization",
        description: "Declared rate normalization must match params.normalization."
      },
      {
        kind: "equals_param",
        provenanceKey: "binning_policy",
        paramKey: "binning",
        description: "Declared bin interval policy must match params.binning."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Population firing-rate trace derived from spike_recorder events",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html",
        dataShape: "uniform [start,stop) bins, raw population spike counts, sender denominator, and derived mean rates",
        output: "One or more auditable mean-per-recorded-sender population-rate traces",
        note: "Preserve raw counts and the exact recorded sender count; never divide by an undeclared population size."
      }
    ]
  },
  "nest.rate_response": {
    id: "nest.rate_response",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST rate / IF response renderer",
    description: "Render firing-rate / IF response points against declared stimulus amplitudes.",
    deviceFamily: "spike_recorder",
    scene: "fi-curve",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "fi_response" },
    requiredInputKeys: ["stimulus_amplitudes", "rates_hz", "stimulus_units"],
    paramsSchema: RateResponseParamsSchema,
    requiredProvenanceKeys: ["stim_units", "bin_ms", "rate_normalization"],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "stim_units",
        paramKey: "stimulus_units",
        description: "Declared stimulus units must match params.stimulus_units."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "IF curve example",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/if_curve.html",
        dataShape: "stimulus amplitudes and rates_hz with declared stimulus units",
        output: "F-I response line and points with declared stimulus and rate units",
        note: "Show the declared bin width and rate normalization; this legacy envelope carries no counting-window bounds."
      }
    ]
  },
  "nest.connectivity_matrix": {
    id: "nest.connectivity_matrix",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST connectivity edge-list topology renderer",
    description: "Render SynapseCollection endpoint pairs and optional unit-bound weight and delay channels as schematic node-link topology (legacy skill id; not a literal matrix heatmap).",
    deviceFamily: "get_connections",
    scene: "network-topology",
    // Connectivity evidence contains endpoints and optional measured channels, not spatial
    // coordinates. Any node placement in the topology scene is schematic.
    weak: true,
    weakDisclosure: "Schematic topology layout \u2014 node positions and distances are derived for readability; only the declared endpoint pairs and optional measurement channels are evidence.",
    deprecation: {
      since: "1.6.0",
      replacement: "nest.connection_graph",
      message: "Legacy edge-list skill id; use nest.connection_graph for explicit graph, snapshot, sampling, and multapse semantics."
    },
    routerEligibility: { bareFamilyCandidate: false },
    requiredInputKeys: ["sources", "targets"],
    paramsSchema: NetworkParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "weight_units",
        paramKey: "weight_units",
        description: "When declared, legacy graph weight units must match params.weight_units."
      },
      {
        kind: "equals_param",
        provenanceKey: "delay_units",
        paramKey: "delay_units",
        description: "When declared, legacy graph delay units must match params.delay_units."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Plot weight matrices example / SynapseCollection",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html",
        dataShape: "parallel source/target endpoint arrays plus optional unit-bound weights and delays",
        output: "Schematic node-edge topology from the checked edge list",
        note: "Optional weights and delays remain edge measurements; topology positions and distances are schematic."
      }
    ]
  },
  "nest.connection_graph": {
    id: "nest.connection_graph",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST connection topology graph renderer",
    description: "Render a complete or explicitly deterministic sample of a SynapseCollection snapshot while preserving isolates, autapses, multapses, and measured channels.",
    deviceFamily: "get_connections",
    scene: "network-topology",
    weak: true,
    weakDisclosure: "Schematic topology layout \u2014 circle positions and distances are derived for readability; edges are complete or deterministically sampled exactly as declared.",
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: "connection_graph"
    },
    transform: {
      id: "synapseCollectionToConnectionGraphParams",
      rawFields: [
        "source|sources",
        "target|targets",
        "weight|weights?",
        "delay|delays?",
        "synapse_model|synapse_models?",
        "target_thread|target_threads?",
        "synapse_id|synapse_ids?",
        "port|ports?"
      ],
      requiredOptions: [
        "sourceIds",
        "targetIds",
        "snapshotTimeMs",
        "snapshotScope",
        "samplePolicy",
        "weightUnits when weight is present",
        "delayUnits='ms' when delay is present"
      ],
      outputSkill: "nest.connection_graph"
    },
    requiredInputKeys: [
      "nodes",
      "edges",
      "layout",
      "parallel_edges",
      "self_connections",
      "snapshot_time_ms",
      "snapshot_scope",
      "sample_policy",
      "source_connection_count",
      "edge_identity"
    ],
    paramsSchema: ConnectionGraphParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "connection_sample_policy",
        paramKey: "sample_policy",
        description: "Declared graph sampling must match params.sample_policy."
      },
      {
        kind: "equals_param",
        provenanceKey: "snapshot_time_ms",
        paramKey: "snapshot_time_ms",
        description: "Declared snapshot time must match params.snapshot_time_ms."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "snapshot_scope",
        paramPath: "snapshot_scope.kind",
        description: "Declared snapshot scope must match params.snapshot_scope.kind."
      },
      {
        kind: "equals_param",
        provenanceKey: "parallel_edge_policy",
        paramKey: "parallel_edges",
        description: "Declared parallel-edge policy must match params.parallel_edges."
      },
      {
        kind: "equals_param",
        provenanceKey: "weight_units",
        paramKey: "weight_units",
        description: "When declared, graph weight units must match params.weight_units."
      },
      {
        kind: "equals_param",
        provenanceKey: "delay_units",
        paramKey: "delay_units",
        description: "When declared, graph delay units must match params.delay_units."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [{
      nestExample: "SynapseCollection connection inspection",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/stable/synapses/synapse_specification.html#inspecting-connections",
      dataShape: "explicit node universe plus one preserved graph edge per selected SynapseCollection entry",
      output: "Schematic directed topology graph with disclosed completeness and snapshot scope",
      note: "Circle placement is schematic; complete and deterministic samples are never conflated."
    }]
  },
  "nest.adjacency_matrix": {
    id: "nest.adjacency_matrix",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST binary adjacency matrix renderer",
    description: "Render sparse connection presence with target rows, source columns, and explicit multapse counts.",
    deviceFamily: "get_connections",
    scene: "connection-matrix",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "adjacency_matrix" },
    transform: {
      id: "synapseCollectionToAdjacencyMatrixParams",
      rawFields: ["source|sources", "target|targets"],
      requiredOptions: ["sourceIds", "targetIds", "snapshotTimeMs", "snapshotScope"],
      outputSkill: "nest.adjacency_matrix"
    },
    requiredInputKeys: [
      "source_ids",
      "target_ids",
      "cells",
      "axis_order",
      "absent_cell",
      "sample_policy",
      "connection_count",
      "snapshot_time_ms",
      "snapshot_scope",
      "display",
      "aggregation"
    ],
    paramsSchema: AdjacencyMatrixParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "matrix_axis_order",
      "matrix_aggregation"
    ],
    provenanceParamConstraints: [
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Only complete connection snapshots may form a literal matrix." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Declared snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Declared snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "preserved_as_connection_count", description: "Parallel connections are preserved as each sparse cell count." },
      { kind: "equals_param", provenanceKey: "matrix_axis_order", paramKey: "axis_order", description: "Declared matrix axes must match params." },
      { kind: "equals_param", provenanceKey: "matrix_aggregation", paramKey: "aggregation", description: "Declared matrix aggregation must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "Explicit adjacency representation",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/stable/synapses/connectivity_concepts.html#explicit-connections",
      dataShape: "ordered source/target axes plus sparse positive connection-count cells",
      output: "Binary adjacency heatmap with target rows and source columns",
      note: "Absent cells mean no connection; multapses remain visible through connection_count."
    }]
  },
  "nest.weight_matrix": {
    id: "nest.weight_matrix",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST connection-weight matrix renderer",
    description: "Render explicitly aggregated SynapseCollection weights without conflating absent and zero-valued cells.",
    deviceFamily: "get_connections",
    scene: "connection-matrix",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "weight_matrix" },
    transform: {
      id: "synapseCollectionToWeightMatrixParams",
      rawFields: ["source|sources", "target|targets", "weight|weights"],
      requiredOptions: ["sourceIds", "targetIds", "snapshotTimeMs", "snapshotScope", "weightUnits", "aggregation"],
      outputSkill: "nest.weight_matrix"
    },
    requiredInputKeys: [
      "source_ids",
      "target_ids",
      "cells",
      "weight_units",
      "aggregation",
      "axis_order",
      "absent_cell",
      "sample_policy",
      "connection_count",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: WeightMatrixParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "weight_units",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "matrix_axis_order",
      "matrix_aggregation"
    ],
    provenanceParamConstraints: [
      { kind: "equals_param", provenanceKey: "weight_units", paramKey: "weight_units", description: "Weight units must match params." },
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Only complete connection snapshots may form a literal matrix." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "preserved_as_connection_count", description: "Parallel connections remain auditable via connection_count." },
      { kind: "equals_param", provenanceKey: "matrix_axis_order", paramKey: "axis_order", description: "Matrix axis order must match params." },
      { kind: "equals_param", provenanceKey: "matrix_aggregation", paramKey: "aggregation", description: "Weight aggregation must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "Plot weight matrices example",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/stable/auto_examples/plot_weight_matrices.html",
      dataShape: "ordered node axes plus sparse measured-weight cells and multapse counts",
      output: "Unit-labelled weight heatmap",
      note: "A present zero/cancelled cell remains distinct from an absent connection."
    }]
  },
  "nest.delay_matrix": {
    id: "nest.delay_matrix",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST synaptic-delay matrix renderer",
    description: "Render explicitly aggregated positive synaptic delays in milliseconds.",
    deviceFamily: "get_connections",
    scene: "connection-matrix",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "delay_matrix" },
    transform: {
      id: "synapseCollectionToDelayMatrixParams",
      rawFields: ["source|sources", "target|targets", "delay|delays"],
      requiredOptions: ["sourceIds", "targetIds", "snapshotTimeMs", "snapshotScope", "delayUnits='ms'", "aggregation"],
      outputSkill: "nest.delay_matrix"
    },
    requiredInputKeys: [
      "source_ids",
      "target_ids",
      "cells",
      "delay_units",
      "aggregation",
      "axis_order",
      "absent_cell",
      "sample_policy",
      "connection_count",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: DelayMatrixParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "delay_units",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "matrix_axis_order",
      "matrix_aggregation"
    ],
    provenanceParamConstraints: [
      { kind: "equals_param", provenanceKey: "delay_units", paramKey: "delay_units", description: "Delay units must match params." },
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Only complete connection snapshots may form a literal matrix." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "preserved_as_connection_count", description: "Parallel connections remain auditable via connection_count." },
      { kind: "equals_param", provenanceKey: "matrix_axis_order", paramKey: "axis_order", description: "Matrix axis order must match params." },
      { kind: "equals_param", provenanceKey: "matrix_aggregation", paramKey: "aggregation", description: "Delay aggregation must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "SynapseCollection delay inspection",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/stable/synapses/synapse_specification.html#inspecting-connections",
      dataShape: "ordered node axes plus sparse positive delay cells and multapse counts",
      output: "Millisecond delay heatmap",
      note: "Parallel-delay aggregation is always explicit."
    }]
  },
  "nest.in_degree_distribution": {
    id: "nest.in_degree_distribution",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST in-degree distribution renderer",
    description: "Render the measured incoming-edge distribution over the complete declared target universe.",
    deviceFamily: "get_connections",
    scene: "degree-distribution",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "in_degree_distribution" },
    transform: {
      id: "synapseCollectionToInDegreeDistributionParams",
      rawFields: ["source|sources", "target|targets"],
      requiredOptions: ["sourceIds", "targetIds", "snapshotTimeMs", "snapshotScope", "normalization"],
      outputSkill: "nest.in_degree_distribution"
    },
    requiredInputKeys: [
      "degrees",
      "node_counts",
      "values",
      "node_count",
      "connection_count",
      "direction",
      "normalization",
      "value_units",
      "edge_counting",
      "zero_degree_policy",
      "sample_policy",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: InDegreeDistributionParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "degree_direction",
      "degree_counting",
      "zero_degree_policy",
      "histogram_normalization"
    ],
    provenanceParamConstraints: [
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Degree input must be complete for its declared scope." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "count_each_connection", description: "Every multapse contributes one degree edge." },
      { kind: "equals_param", provenanceKey: "degree_direction", paramKey: "direction", description: "Degree direction must match params." },
      { kind: "equals_param", provenanceKey: "degree_counting", paramKey: "edge_counting", description: "Degree counting must match params." },
      { kind: "equals_param", provenanceKey: "zero_degree_policy", paramKey: "zero_degree_policy", description: "Zero-degree policy must match params." },
      { kind: "equals_param", provenanceKey: "histogram_normalization", paramKey: "normalization", description: "Degree normalization must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "Directed connectivity degree concepts",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/stable/synapses/connectivity_concepts.html",
      dataShape: "contiguous degree bins, exact node counts, and explicit zero-degree inclusion",
      output: "In-degree count or probability distribution",
      note: "Each SynapseCollection entry counts, including multapses."
    }]
  },
  "nest.out_degree_distribution": {
    id: "nest.out_degree_distribution",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST out-degree distribution renderer",
    description: "Render the measured outgoing-edge distribution over the complete declared source universe.",
    deviceFamily: "get_connections",
    scene: "degree-distribution",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "out_degree_distribution" },
    transform: {
      id: "synapseCollectionToOutDegreeDistributionParams",
      rawFields: ["source|sources", "target|targets"],
      requiredOptions: ["sourceIds", "targetIds", "snapshotTimeMs", "snapshotScope (not target-rank-local)", "normalization"],
      outputSkill: "nest.out_degree_distribution"
    },
    requiredInputKeys: [
      "degrees",
      "node_counts",
      "values",
      "node_count",
      "connection_count",
      "direction",
      "normalization",
      "value_units",
      "edge_counting",
      "zero_degree_policy",
      "sample_policy",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: OutDegreeDistributionParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "degree_direction",
      "degree_counting",
      "zero_degree_policy",
      "histogram_normalization"
    ],
    provenanceParamConstraints: [
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Degree input must be complete for its declared scope." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "count_each_connection", description: "Every multapse contributes one degree edge." },
      { kind: "equals_param", provenanceKey: "degree_direction", paramKey: "direction", description: "Degree direction must match params." },
      { kind: "equals_param", provenanceKey: "degree_counting", paramKey: "edge_counting", description: "Degree counting must match params." },
      { kind: "equals_param", provenanceKey: "zero_degree_policy", paramKey: "zero_degree_policy", description: "Zero-degree policy must match params." },
      { kind: "equals_param", provenanceKey: "histogram_normalization", paramKey: "normalization", description: "Degree normalization must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "Directed connectivity degree concepts",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/stable/synapses/connectivity_concepts.html",
      dataShape: "contiguous degree bins, exact node counts, and explicit zero-degree inclusion",
      output: "Out-degree count or probability distribution",
      note: "Target-rank-local GetConnections evidence is rejected for out-degree."
    }]
  },
  "nest.delay_distribution": {
    id: "nest.delay_distribution",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST synaptic-delay distribution renderer",
    description: "Render exact half-open bins over one delay value per selected connection.",
    deviceFamily: "get_connections",
    scene: "delay-distribution",
    routerEligibility: { bareFamilyCandidate: true, dataShapeKind: "delay_distribution" },
    transform: {
      id: "synapseCollectionToDelayDistributionParams",
      rawFields: ["source|sources", "target|targets", "delay|delays"],
      requiredOptions: [
        "sourceIds",
        "targetIds",
        "snapshotTimeMs",
        "snapshotScope",
        "delayUnits='ms'",
        "binWidthMs",
        "windowStartMs",
        "windowStopMs",
        "normalization"
      ],
      outputSkill: "nest.delay_distribution"
    },
    requiredInputKeys: [
      "bin_centers_ms",
      "delay_counts",
      "values",
      "bin_width_ms",
      "window_start_ms",
      "window_stop_ms",
      "normalization",
      "value_units",
      "delay_units",
      "aggregation",
      "binning",
      "sample_policy",
      "connection_count",
      "snapshot_time_ms",
      "snapshot_scope"
    ],
    paramsSchema: DelayDistributionParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "delay_units",
      "connection_sample_policy",
      "snapshot_time_ms",
      "snapshot_scope",
      "parallel_edge_policy",
      "bin_ms",
      "histogram_normalization",
      "binning_policy"
    ],
    provenanceParamConstraints: [
      { kind: "equals_param", provenanceKey: "delay_units", paramKey: "delay_units", description: "Delay units must match params." },
      { kind: "equals_param", provenanceKey: "connection_sample_policy", paramKey: "sample_policy", description: "Delay histogram input must be complete for its scope." },
      { kind: "equals_param", provenanceKey: "snapshot_time_ms", paramKey: "snapshot_time_ms", description: "Snapshot time must match params." },
      { kind: "equals_param_path", provenanceKey: "snapshot_scope", paramPath: "snapshot_scope.kind", description: "Snapshot scope must match params." },
      { kind: "equals_literal", provenanceKey: "parallel_edge_policy", value: "count_each_connection", description: "Every selected connection contributes one delay." },
      { kind: "equals_param", provenanceKey: "bin_ms", paramKey: "bin_width_ms", description: "Delay bin width must match params." },
      { kind: "equals_param", provenanceKey: "histogram_normalization", paramKey: "normalization", description: "Delay normalization must match params." },
      { kind: "equals_param", provenanceKey: "binning_policy", paramKey: "binning", description: "Delay binning policy must match params." }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [{
      nestExample: "SynapseCollection delay inspection",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/stable/synapses/synapse_specification.html#inspecting-connections",
      dataShape: "one positive millisecond delay per selected connection in exact uniform bins",
      output: "Delay count, probability, or probability-density histogram",
      note: "Out-of-window delays are transform errors, never silently discarded."
    }]
  },
  "nest.weight_histogram": {
    id: "nest.weight_histogram",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST connection-weight histogram renderer",
    description: "Render the measured weight distribution of a declared GetConnections snapshot.",
    deviceFamily: "get_connections",
    scene: "weight-histogram",
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: "weight_distribution"
    },
    requiredInputKeys: [
      "bin_centers",
      "values",
      "bin_width",
      "weight_units",
      "normalization",
      "value_units",
      "snapshot_time_ms"
    ],
    paramsSchema: WeightHistogramParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "weight_units",
      "histogram_normalization",
      "connection_sample_policy"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "weight_units",
        paramKey: "weight_units",
        description: "Declared weight units must match params.weight_units."
      },
      {
        kind: "equals_param",
        provenanceKey: "histogram_normalization",
        paramKey: "normalization",
        description: "Declared histogram normalization must match params.normalization."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Plot weight matrices example / SynapseCollection snapshot",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html",
        dataShape: "binned GetConnections weights at one declared simulation time",
        output: "Connection-weight count or probability histogram",
        note: "Use a GetConnections snapshot; weight_recorder events are update-event samples and bias distributions."
      }
    ]
  },
  "nest.spatial_2d": {
    id: "nest.spatial_2d",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST legacy 2D position host envelope",
    description: "Validate anonymous 2D position tuples and coordinate units for an explicitly selected host renderer; Cortexel supplies no scene.",
    deviceFamily: "get_position",
    scene: null,
    // no honest 2D-spatial scene yet (would violate sphere/voxel law)
    deprecation: {
      since: "1.6.0",
      replacement: "nest.spatial_map_2d",
      message: "Legacy host-only coordinate list; use nest.spatial_map_2d for identified nodes and explicit layer/MPI semantics."
    },
    routerEligibility: { bareFamilyCandidate: false },
    requiredInputKeys: ["positions", "coordinate_units"],
    paramsSchema: Spatial2DParamsSchema,
    requiredProvenanceKeys: ["extent", "spatial_units", "mask", "kernel"],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "spatial_units",
        paramKey: "coordinate_units",
        description: "Declared spatial units must match the coordinate axis units."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Circular mask, Gaussian kernel, grid/free spatial examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/connex.html",
        dataShape: "anonymous x/y position tuples plus coordinate units",
        output: "Validated host envelope only; the selected host owns rendering and caption display.",
        note: "Extent, mask, and kernel are caller-declared metadata, not structured render data; use nest.spatial_map_2d for identified measured positions."
      }
    ]
  },
  "nest.spatial_map_2d": {
    id: "nest.spatial_map_2d",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST measured 2D spatial map renderer",
    description: "Render identified 2D GetPosition coordinates inside the declared layer extent with explicit periodic-boundary and MPI completeness semantics.",
    deviceFamily: "get_position",
    scene: "spatial-map-2d",
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: "positions_2d"
    },
    transform: {
      id: "getPositionToSpatialMap2DParams",
      rawFields: ["positions", "node_ids?"],
      requiredOptions: [
        "nodeIds",
        "coordinateUnits",
        "extent",
        "center",
        "edgeWrap",
        "positionScope"
      ],
      outputSkill: "nest.spatial_map_2d"
    },
    requiredInputKeys: [
      "nodes",
      "coordinate_units",
      "extent",
      "center",
      "edge_wrap",
      "position_scope",
      "marker_size"
    ],
    paramsSchema: SpatialMap2DParamsSchema,
    requiredProvenanceKeys: [
      "node_ids",
      "spatial_units",
      "extent",
      "position_scope"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "spatial_units",
        paramKey: "coordinate_units",
        description: "Declared spatial units must match params.coordinate_units."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "position_scope",
        paramPath: "position_scope.kind",
        description: "Declared position scope must match params.position_scope.kind."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [{
      nestExample: "Spatial layer and GetPosition",
      sourceUrl: "https://nest-simulator.readthedocs.io/en/stable/ref_material/pynest_api/nest.lib.hl_api_spatial.html#nest.lib.hl_api_spatial.GetPosition",
      dataShape: "identified x/y coordinates plus layer extent, center, edge-wrap, units, and completeness scope",
      output: "Equal-aspect measured spatial node map",
      note: "Masks and probability kernels are separate analyses and are not invented from GetPosition."
    }]
  },
  "nest.spatial_3d": {
    id: "nest.spatial_3d",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST 3D spatial renderer",
    description: "Render 3D population/node positions for spatial inspection.",
    deviceFamily: "get_position",
    scene: "network-topology",
    routerEligibility: {
      bareFamilyCandidate: true,
      dataShapeKind: "positions_3d"
    },
    requiredInputKeys: ["objects", "coordinate_units"],
    paramsSchema: Spatial3DParamsSchema,
    requiredProvenanceKeys: ["extent", "spatial_units", "projection_sample_policy"],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "spatial_units",
        paramKey: "coordinate_units",
        description: "Declared spatial units must match the coordinate axis units."
      }
    ],
    rendererRoutes: [
      "media.webgl_scene",
      "media.react_fiber_scene",
      "three",
      "fiber"
    ],
    examples: [
      {
        nestExample: "3D spatial network with exponential/Gaussian probabilities",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/test_3d.html",
        dataShape: "x/y/z positioned objects plus coordinate units",
        output: "Unit-labelled 3D positioned-node scene for host rendering",
        note: "Extent and projection-sample policy are caller declarations, not edge data; use 3D only as a positioned-node inspection aid."
      }
    ]
  },
  "nest.plasticity_dynamics": {
    id: "nest.plasticity_dynamics",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST plasticity dynamics renderer",
    description: "Render recorded synaptic-weight samples over time.",
    deviceFamily: "weight_recorder",
    scene: "stdp",
    requiredInputKeys: ["times_ms", "weights", "weight_units"],
    paramsSchema: PlasticityParamsSchema,
    requiredProvenanceKeys: ["synapse_model", "weight_units"],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "weight_units",
        paramKey: "weight_units",
        description: "Declared weight units must match the rendered weight axis."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Urbanczik-Senn / Clopath / Tsodyks short-term plasticity",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/urbanczik_synapse_example.html",
        dataShape: "weight-recorder times_ms and weights in one declared unit",
        output: "Measured synaptic-weight trace over time",
        note: "This contract does not contain an STDP window or pre/post spike protocol; do not invent either."
      }
    ]
  },
  "nest.phase_plane": {
    id: "nest.phase_plane",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST phase-plane renderer",
    description: "Render a checked Cartesian phase-plane vector field.",
    deviceFamily: "computed",
    scene: "phase-plane",
    requiredInputKeys: [
      "grid",
      "derivatives",
      "axis_units",
      "derivative_units",
      "axis_order",
      "flattening"
    ],
    paramsSchema: PhasePlaneParamsSchema,
    requiredProvenanceKeys: [
      "state_variables",
      "derivation_method",
      "model_context",
      "fixed_parameters"
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Numerical phase-plane analysis of the Hodgkin-Huxley neuron",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/hh_phaseplane.html",
        dataShape: "state-variable axes plus flattened derivative arrays and explicit ordering",
        output: "Unit-labelled phase-plane vector field",
        note: "No nullcline, trajectory, or equilibrium is present in this contract; do not invent one."
      }
    ]
  },
  "nest.correlogram": {
    id: "nest.correlogram",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST correlogram / synchrony renderer",
    description: "Render a symmetric correlation_detector lag histogram with explicit pair orientation, interval policy, counting window, zero-lag handling, and statistic semantics.",
    deviceFamily: "correlation_detector",
    scene: "correlogram",
    requiredInputKeys: [
      "lags_ms",
      "values",
      "bin_width_ms",
      "tau_max_ms",
      "counting_start_ms",
      "counting_stop_ms",
      "pair",
      "lag_convention",
      "binning",
      "zero_lag_policy",
      "statistic"
    ],
    paramsSchema: CorrelogramParamsSchema,
    requiredProvenanceKeys: [
      "detector_id",
      "reference_population",
      "target_population",
      "bin_ms",
      "correlation_normalization",
      "correlation_units",
      "lag_convention",
      "binning_policy"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "bin_ms",
        paramKey: "bin_width_ms",
        description: "Declared bin width must match params.bin_width_ms."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "reference_population",
        paramPath: "pair.reference_label",
        description: "Declared reference population must match params.pair.reference_label."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "target_population",
        paramPath: "pair.target_label",
        description: "Declared target population must match params.pair.target_label."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "correlation_normalization",
        paramPath: "statistic.kind",
        description: "Declared normalization/statistic must match params.statistic.kind."
      },
      {
        kind: "equals_param_path",
        provenanceKey: "correlation_units",
        paramPath: "statistic.units",
        description: "Declared value units must match params.statistic.units."
      },
      {
        kind: "equals_param",
        provenanceKey: "lag_convention",
        paramKey: "lag_convention",
        description: "Declared lag convention must match params.lag_convention."
      },
      {
        kind: "equals_param",
        provenanceKey: "binning_policy",
        paramKey: "binning",
        description: "Declared bin interval policy must match params.binning."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "Auto- and crosscorrelation functions for spike trains",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/cross_check_mip_corrdet.html",
        dataShape: "symmetric lag centers, values, bin/tau/counting-window semantics, oriented population pair, and discriminated statistic",
        output: "Canonical correlogram distinct from ISI and other time histograms",
        note: "Positive lag means the target population spikes after the reference population; never infer orientation from a display label."
      }
    ]
  },
  "nest.stimulus_response": {
    id: "nest.stimulus_response",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST stimulus-response host envelope",
    description: "Validate aligned time, stimulus, and response arrays for an explicitly selected host renderer; Cortexel supplies no scene.",
    deviceFamily: "multimeter",
    scene: null,
    // composite multi-panel protocol; no single Cortexel scene
    requiredInputKeys: ["times_ms", "stimulus", "response"],
    paramsSchema: StimulusResponseParamsSchema,
    requiredProvenanceKeys: ["stim_units", "units", "time_units"],
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Sinusoidal generator / pulse packet / repeated stimulation",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/pulsepacket.html",
        dataShape: "aligned times_ms, stimulus, and response arrays",
        output: "Validated host envelope only; the selected host owns any composite panels.",
        note: "The envelope carries no spike-event or epoch structure; the host must not infer either."
      }
    ]
  },
  "nest.astrocyte_dynamics": {
    id: "nest.astrocyte_dynamics",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST astrocyte concentration-trace renderer",
    description: "Render one declared non-negative glial concentration trace carried as ca_trace.",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    weak: true,
    // analog-trace reuse: Ca/IP3 are not membrane voltage
    weakDisclosure: "Derived view \u2014 a declared glial concentration trace is shown through the analog-trace scene; it is not membrane voltage.",
    requiredInputKeys: ["times_ms", "ca_trace", "units"],
    paramsSchema: AstrocyteParamsSchema,
    requiredProvenanceKeys: [
      "recorded_variable",
      "units",
      "time_units",
      "sampling_interval"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "units",
        paramKey: "units",
        description: "Declared units must match the rendered glial trace units."
      },
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Single astrocyte / tripartite interaction examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/astrocytes/astrocyte_single.html",
        dataShape: "times_ms, one ca_trace array, and its declared units",
        output: "One glial concentration trace via the analog-trace scene (flagged derived)",
        note: "The legacy envelope carries neither multiple state variables nor linked neuronal events."
      }
    ]
  },
  "nest.compartmental_dynamics": {
    id: "nest.compartmental_dynamics",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST compartment-tree trace host envelope",
    description: "Validate an id/parent compartment topology and aligned per-compartment values for an explicitly selected host renderer.",
    deviceFamily: "multimeter",
    scene: null,
    // morphology geometry has no honest Cortexel scene (no invented geometry)
    requiredInputKeys: ["times_ms", "compartments"],
    paramsSchema: CompartmentalParamsSchema,
    requiredProvenanceKeys: [
      "morphology_disclaimer",
      "recorded_variable",
      "units",
      "time_units",
      "sampling_interval"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Receptors/current and two-compartment neuron examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/compartmental_model/receptors_and_current.html",
        dataShape: "times_ms plus compartments with id, parent_id, optional label, and aligned values",
        output: "Validated host envelope for a schematic compartment tree and aligned traces.",
        note: "The envelope carries no receptor-port or morphology-geometry data; the host must not invent either."
      }
    ]
  },
  "nest.animation_replay": {
    id: "nest.animation_replay",
    version: CORTEXEL_SKILL_VERSION,
    title: "NEST state replay / animation storyboard renderer",
    description: "Render time-evolution storyboards and inspectable state replays.",
    deviceFamily: "computed",
    scene: null,
    // offline manim storyboard, not a live r3f scene — do not mis-route
    requiredInputKeys: ["frames"],
    paramsSchema: AnimationReplayParamsSchema,
    requiredProvenanceKeys: ["frame_rate"],
    rendererRoutes: ["media.manim_storyboard", "manim"],
    examples: [
      {
        nestExample: "Sudoku progress GIF / Pong replay",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/sudoku/plot_progress.html",
        dataShape: "frames, entities, metrics, frame rate, annotations",
        output: "Manim storyboard / source \u2014 no live Cortexel scene.",
        note: "scene:null \u2014 offline storyboard, not a real-time render target."
      }
    ]
  },
  "corpus.knowledge_graph": {
    id: "corpus.knowledge_graph",
    version: CORTEXEL_SKILL_VERSION,
    title: "Corpus knowledge-graph 3D renderer",
    description: "Render a bounded, traceable cross-paper entity multigraph: paper/model/family nodes plus identified citation, instantiation, family and advisory identity assertions. Every element carries typed source evidence; every numeric score is discriminated and explicitly uncalibrated.",
    deviceFamily: "corpus",
    scene: "knowledge-graph-3d",
    // weak: identity edges are advisory structural similarity, NOT certified
    // sameness, and force-layout geometry is algorithmic rather than evidence.
    // This is NOT scene reuse — knowledge-graph-3d is the native scene — so the
    // disclosure is about DATA semantics, not fidelity of the renderer.
    weak: true,
    weakDisclosure: "Advisory graph \u2014 every corpus-entity assertion is derived; same_as/variant_of edges are structural similarity, not certified sameness; force-layout positions and distances are schematic, not quantitative evidence.",
    requiredInputKeys: [
      "graph_id",
      "graph_source",
      "graph_snapshot_id",
      "graph_scope",
      "generated_at",
      "nodes",
      "edges"
    ],
    paramsSchema: KnowledgeGraph3DParamsSchema,
    requiredProvenanceKeys: [
      "graph_source",
      "graph_snapshot_id",
      "graph_scope",
      "identity_advisory"
    ],
    requiredProvenanceFlags: {
      advisory_only: true,
      is_paper_local_evidence: false
    },
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "graph_source",
        paramKey: "graph_source",
        description: "The declared graph source must match params.graph_source."
      },
      {
        kind: "equals_param",
        provenanceKey: "graph_snapshot_id",
        paramKey: "graph_snapshot_id",
        description: "The declared immutable snapshot must match params.graph_snapshot_id."
      },
      {
        kind: "equals_param",
        provenanceKey: "graph_scope",
        paramKey: "graph_scope",
        description: "The declared graph scope must match params.graph_scope."
      },
      {
        kind: "equals_literal",
        provenanceKey: "identity_advisory",
        value: true,
        description: "Corpus identity and genealogy assertions are always advisory."
      }
    ],
    rendererRoutes: ["media.model_graph", "fiber"],
    examples: [
      {
        nestExample: "Cross-paper corpus knowledge graph (papers + models + families)",
        sourceUrl: "https://github.com/sepahead/Paper2Brain#knowledge-graph",
        dataShape: "snapshot-bound paper/model/family nodes and stable-id multigraph edges, each with typed evidence, bounded attributes, derived/advisory epistemic status and optional uncalibrated scores",
        output: "Traceable 3D force-directed multigraph with citation-flow particles and accessible evidence detail",
        note: "1.4 contract: every assertion is traceable; identity edges are advisory and force-layout geometry is non-evidentiary."
      }
    ]
  }
};
var PARAM_VALIDATION_CONSTRAINTS = {
  "nest.voltage_trace": [
    {
      kind: "equal_length",
      paths: ["series", "series_labels"],
      description: "Every trace series must have one non-empty label."
    },
    {
      kind: "each_length_matches",
      paths: ["series[*]", "times_ms"],
      description: "Every trace series must contain one value per times_ms sample."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Trace timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.spike_raster": [
    {
      kind: "equal_length",
      paths: ["times_ms", "senders"],
      description: "Every spike timestamp must have one sender id."
    }
  ],
  "nest.isi_distribution": [
    {
      kind: "equal_length",
      paths: ["bin_centers_ms", "values"],
      description: "Every ISI histogram bin center must have one value."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["bin_centers_ms"],
      description: "ISI bin centers must be monotonically non-decreasing."
    },
    {
      kind: "uniform_histogram_bins",
      paths: ["bin_centers_ms", "bin_width_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      nonNegativeLowerEdge: true,
      description: "ISI bins must be strictly increasing, uniformly spaced by bin_width_ms, and have a non-negative lower edge."
    },
    {
      kind: "non_negative",
      paths: ["bin_centers_ms[*]", "values[*]"],
      description: "ISI bin centers and histogram values cannot be negative."
    },
    {
      kind: "mapped_value",
      paths: ["normalization", "value_units"],
      allowedValues: {
        count: "count",
        probability: "probability",
        probability_density: "1/ms"
      },
      description: "Each ISI normalization has one unambiguous value unit."
    },
    {
      kind: "conditional_numeric_domain",
      paths: ["normalization", "values[*]"],
      numericDomains: {
        count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        probability: { min: 0, max: 1 },
        probability_density: { min: 0 }
      },
      description: "ISI counts are safe integers, probabilities lie in [0,1], and density values are non-negative."
    },
    {
      kind: "normalized_histogram_mass",
      paths: ["normalization", "values", "bin_width_ms"],
      absoluteTolerance: HISTOGRAM_MASS_TOLERANCE,
      relativeTolerance: HISTOGRAM_MASS_TOLERANCE,
      normalizationRules: {
        probability: { measure: "sum", target: 1 },
        probability_density: { measure: "density_integral", target: 1 }
      },
      description: "ISI probability mass must sum to one and probability density must integrate to one."
    }
  ],
  "nest.psth": [
    {
      kind: "equal_length",
      paths: ["bin_centers_ms", "values"],
      description: "Every PSTH bin center must have one value."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["bin_centers_ms"],
      description: "PSTH bin centers must be monotonically non-decreasing."
    },
    {
      kind: "uniform_histogram_bins",
      paths: ["bin_centers_ms", "bin_width_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      description: "PSTH bins must be strictly increasing and uniformly spaced by bin_width_ms."
    },
    {
      kind: "non_negative",
      paths: ["values[*]"],
      description: "PSTH values cannot be negative."
    },
    {
      kind: "mapped_value",
      paths: ["normalization", "value_units"],
      allowedValues: {
        count: "count",
        count_per_trial: "count/trial",
        rate_hz: "Hz"
      },
      description: "Each PSTH normalization has one unambiguous value unit."
    },
    {
      kind: "conditional_numeric_domain",
      paths: ["normalization", "values[*]"],
      numericDomains: {
        count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        count_per_trial: { min: 0 },
        rate_hz: { min: 0 }
      },
      description: "PSTH counts are safe integers and all normalized values are non-negative."
    },
    {
      kind: "psth_derived_counts",
      paths: ["normalization", "values", "trial_count", "bin_width_ms", "aggregation"],
      absoluteTolerance: PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE,
      description: "Every displayed PSTH value must recover an integer aggregate spike-event count across the selected senders and trials."
    }
  ],
  "nest.population_rate": [
    {
      kind: "each_length_matches",
      paths: ["series[*].spike_counts", "bin_centers_ms"],
      description: "Every population spike-count series has one value per shared time bin."
    },
    {
      kind: "each_length_matches",
      paths: ["series[*].rates_hz", "bin_centers_ms"],
      description: "Every population-rate series has one value per shared time bin."
    },
    {
      kind: "unique_field",
      paths: ["series"],
      field: "id",
      description: "Population-rate series ids must be unique."
    },
    {
      kind: "ordered_interval",
      paths: ["window_start_ms", "window_stop_ms"],
      description: "The population-rate counting window must have positive duration."
    },
    {
      kind: "uniform_bin_window",
      paths: ["bin_centers_ms", "bin_width_ms", "window_start_ms", "window_stop_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: "Uniform left-closed/right-open bins must exactly cover the declared [window_start_ms,window_stop_ms) interval."
    },
    {
      kind: "population_rate_derived_values",
      paths: [
        "series",
        "bin_centers_ms",
        "bin_width_ms",
        "normalization",
        "aggregation",
        "binning"
      ],
      absoluteTolerance: POPULATION_RATE_ABSOLUTE_TOLERANCE,
      relativeTolerance: POPULATION_RATE_RELATIVE_TOLERANCE,
      description: "Every mean-per-recorded-sender rate must be recoverable from its raw integer spike count, sender denominator, and bin width."
    }
  ],
  "nest.rate_response": [
    {
      kind: "equal_length",
      paths: ["stimulus_amplitudes", "rates_hz"],
      description: "Every stimulus amplitude must have one firing-rate value."
    },
    {
      kind: "non_negative",
      paths: ["rates_hz[*]"],
      description: "Firing rates cannot be negative."
    }
  ],
  "nest.connectivity_matrix": [
    {
      kind: "equal_length",
      paths: ["sources", "targets", "weights?", "delays?"],
      description: "Connection endpoints and optional measurement channels are parallel arrays."
    },
    {
      kind: "legacy_connection_channels",
      paths: ["weights?", "weight_units?", "delays?", "delay_units?"],
      description: "Legacy optional measurement channels remain unit-bound and delays remain strictly positive."
    }
  ],
  "nest.connection_graph": [
    {
      kind: "connection_graph_snapshot",
      paths: [
        "nodes",
        "edges",
        "sample_policy",
        "source_connection_count",
        "weight_units?",
        "delay_units?",
        "edge_identity"
      ],
      description: "Graph identity, endpoint, optional-channel, unit, and sample-count semantics remain auditable."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      description: "Snapshot MPI rank metadata must be internally valid."
    }
  ],
  "nest.adjacency_matrix": [
    {
      kind: "matrix_connection_counts",
      paths: ["source_ids", "target_ids", "cells", "connection_count", "aggregation"],
      description: "Sparse adjacency cells are unique, in-universe, positive-count entries whose counts recover the snapshot total."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      description: "Snapshot MPI rank metadata must be internally valid."
    }
  ],
  "nest.weight_matrix": [
    {
      kind: "matrix_connection_counts",
      paths: ["source_ids", "target_ids", "cells", "connection_count", "aggregation"],
      description: "Sparse weight cells are unique, in-universe, positive-count entries whose counts recover the snapshot total."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      description: "Snapshot MPI rank metadata must be internally valid."
    }
  ],
  "nest.delay_matrix": [
    {
      kind: "matrix_connection_counts",
      paths: ["source_ids", "target_ids", "cells", "connection_count", "aggregation"],
      description: "Sparse delay cells are unique, in-universe, positive-count entries whose counts recover the snapshot total."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      description: "Snapshot MPI rank metadata must be internally valid."
    }
  ],
  "nest.in_degree_distribution": [
    {
      kind: "degree_distribution_consistency",
      paths: [
        "degrees",
        "node_counts",
        "values",
        "node_count",
        "connection_count",
        "direction",
        "normalization",
        "value_units",
        "edge_counting",
        "zero_degree_policy"
      ],
      absoluteTolerance: 1e-12,
      relativeTolerance: 1e-12,
      description: "In-degree bins, raw node counts, totals, normalization, and displayed values agree exactly."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope", "direction"],
      description: "In-degree accepts valid complete or target-rank-local snapshot scope."
    }
  ],
  "nest.out_degree_distribution": [
    {
      kind: "degree_distribution_consistency",
      paths: [
        "degrees",
        "node_counts",
        "values",
        "node_count",
        "connection_count",
        "direction",
        "normalization",
        "value_units",
        "edge_counting",
        "zero_degree_policy"
      ],
      absoluteTolerance: 1e-12,
      relativeTolerance: 1e-12,
      description: "Out-degree bins, raw node counts, totals, normalization, and displayed values agree exactly."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope", "direction"],
      description: "Out-degree rejects target-rank-local evidence and validates merged-rank metadata."
    }
  ],
  "nest.delay_distribution": [
    {
      kind: "uniform_bin_window",
      paths: ["bin_centers_ms", "bin_width_ms", "window_start_ms", "window_stop_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: "Uniform left-closed/right-open delay bins exactly cover the declared window."
    },
    {
      kind: "delay_distribution_consistency",
      paths: [
        "bin_centers_ms",
        "delay_counts",
        "values",
        "bin_width_ms",
        "connection_count",
        "normalization",
        "value_units",
        "delay_units",
        "aggregation",
        "binning"
      ],
      absoluteTolerance: HISTOGRAM_MASS_TOLERANCE,
      relativeTolerance: HISTOGRAM_MASS_TOLERANCE,
      description: "Raw delay counts, normalization, and displayed values recover one another."
    },
    {
      kind: "scope_compatibility",
      paths: ["snapshot_scope"],
      description: "Snapshot MPI rank metadata must be internally valid."
    }
  ],
  "nest.spatial_map_2d": [
    {
      kind: "spatial_extent_bounds",
      paths: ["nodes", "extent", "center"],
      absoluteTolerance: 0,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      roundoffUlps: SPATIAL_BOUNDS_ROUNDOFF_ULPS,
      maxRoundoffFraction: GEOMETRY_MAX_ROUNDOFF_FRACTION,
      description: "Every identified 2D node lies within the declared center \xB1 extent/2 bounds."
    },
    {
      kind: "scope_compatibility",
      paths: ["position_scope"],
      description: "Position MPI rank metadata must be internally valid."
    }
  ],
  "nest.weight_histogram": [
    {
      kind: "equal_length",
      paths: ["bin_centers", "values"],
      description: "Every weight histogram bin center must have one value."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["bin_centers"],
      description: "Weight histogram bin centers must be monotonically non-decreasing."
    },
    {
      kind: "uniform_histogram_bins",
      paths: ["bin_centers", "bin_width"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      description: "Weight histogram bins must be strictly increasing and uniformly spaced by bin_width."
    },
    {
      kind: "non_negative",
      paths: ["values[*]"],
      description: "Weight histogram values cannot be negative."
    },
    {
      kind: "mapped_value",
      paths: ["normalization", "value_units"],
      allowedValues: {
        count: "count",
        probability: "probability"
      },
      description: "Each weight histogram normalization has one unambiguous value unit."
    },
    {
      kind: "conditional_numeric_domain",
      paths: ["normalization", "values[*]"],
      numericDomains: {
        count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        probability: { min: 0, max: 1 }
      },
      description: "Weight counts are safe integers and probabilities lie in [0,1]."
    },
    {
      kind: "normalized_histogram_mass",
      paths: ["normalization", "values", "bin_width"],
      absoluteTolerance: HISTOGRAM_MASS_TOLERANCE,
      relativeTolerance: HISTOGRAM_MASS_TOLERANCE,
      normalizationRules: {
        probability: { measure: "sum", target: 1 }
      },
      description: "Weight-histogram probability mass must sum to one."
    }
  ],
  "nest.plasticity_dynamics": [
    {
      kind: "equal_length",
      paths: ["times_ms", "weights"],
      description: "Every plasticity timestamp must have one weight value."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Plasticity timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.phase_plane": [
    {
      kind: "property_count",
      paths: ["grid"],
      min: 2,
      max: 2,
      description: "A phase plane has exactly two state-variable axes."
    },
    {
      kind: "same_keys",
      paths: ["grid", "derivatives"],
      description: "Derivative fields must use the same state-variable names as the grid."
    },
    {
      kind: "same_keys",
      paths: ["grid", "axis_units"],
      description: "Every phase-plane axis must declare its coordinate units."
    },
    {
      kind: "same_keys",
      paths: ["grid", "derivative_units"],
      description: "Every phase-plane derivative field must declare its units."
    },
    {
      kind: "cartesian_product_length",
      paths: ["grid.*", "derivatives.*"],
      description: "Each derivative field has one value per Cartesian grid point."
    },
    {
      kind: "permutation_of_keys",
      paths: ["axis_order", "grid"],
      description: "axis_order must contain every grid key exactly once, in flattening order."
    }
  ],
  "nest.correlogram": [
    {
      kind: "equal_length",
      paths: ["lags_ms", "values"],
      description: "Every lag must have one correlogram value."
    },
    {
      kind: "symmetric_lag_axis",
      paths: ["lags_ms", "bin_width_ms", "tau_max_ms"],
      absoluteTolerance: HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      relativeTolerance: HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
      description: "Correlogram lag centers must be strictly increasing, uniform, odd, zero-centered, symmetric, and span [-tau_max_ms,+tau_max_ms]."
    },
    {
      kind: "ordered_interval",
      paths: ["counting_start_ms", "counting_stop_ms"],
      description: "The correlogram counting window must have positive duration."
    },
    {
      kind: "conditional_numeric_domain",
      paths: ["statistic.kind", "values[*]"],
      numericDomains: {
        raw_pair_count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        weighted_pair_sum: { min: -34028234663852886e22, max: 34028234663852886e22 },
        pair_rate_hz: { min: 0, max: 34028234663852886e22 },
        pearson_coefficient: { min: -1, max: 1 }
      },
      description: "Correlogram values must obey the numeric domain implied by their discriminated statistic."
    }
  ],
  "nest.stimulus_response": [
    {
      kind: "equal_length",
      paths: ["times_ms", "stimulus", "response"],
      description: "Time, stimulus, and response samples must align one-to-one."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Stimulus-response timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.astrocyte_dynamics": [
    {
      kind: "equal_length",
      paths: ["times_ms", "ca_trace"],
      description: "Every glial sample must have one timestamp."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Glial timestamps must be monotonically non-decreasing."
    },
    {
      kind: "non_negative",
      paths: ["ca_trace[*]"],
      description: "The declared Ca\xB2\u207A concentration trace cannot be negative."
    }
  ],
  "nest.compartmental_dynamics": [
    {
      kind: "each_length_matches",
      paths: ["compartments[*].values", "times_ms"],
      description: "Every compartment trace has one value per timestamp."
    },
    {
      kind: "unique_field",
      paths: ["compartments"],
      field: "id",
      description: "Compartment ids must be unique."
    },
    {
      kind: "references_exist",
      paths: ["compartments[*].parent_id", "compartments[*].id"],
      description: "Every non-null parent id must reference a declared compartment."
    },
    {
      kind: "acyclic",
      paths: ["compartments[*].id", "compartments[*].parent_id"],
      description: "The compartment parent graph must be acyclic."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Compartment timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.animation_replay": [
    {
      kind: "monotonic_non_decreasing",
      paths: ["frames[*].time_ms"],
      description: "Replay frame timestamps must be monotonically non-decreasing."
    },
    {
      kind: "property_count",
      paths: ["frames[*].state"],
      min: 1,
      description: "Every replay frame state must contain at least one field."
    }
  ],
  "corpus.knowledge_graph": [
    {
      kind: "unique_field",
      paths: ["nodes"],
      field: "id",
      description: "Node ids must be unique."
    },
    {
      kind: "unique_field",
      paths: ["edges"],
      field: "id",
      description: "Edge assertion ids must be unique; parallel assertions remain distinct by id."
    },
    {
      kind: "max_parallel_edges",
      paths: ["edges"],
      max: KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair,
      description: "At most nine identified assertions may connect one unordered node pair."
    },
    {
      kind: "references_exist",
      paths: ["edges[*].source", "edges[*].target", "nodes[*].id"],
      description: "Every edge endpoint must reference a declared node id."
    },
    {
      kind: "no_self_loops",
      paths: ["edges[*].source", "edges[*].target"],
      description: "Self-loop edges are not renderable by this scene."
    },
    {
      kind: "property_count",
      paths: ["nodes[*].attributes"],
      max: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
      description: "Node attribute maps are bounded."
    },
    {
      kind: "property_count",
      paths: ["edges[*].attributes"],
      max: KNOWLEDGE_GRAPH_LIMITS.maxAttributes,
      description: "Edge attribute maps are bounded."
    },
    {
      kind: "each_unique_field",
      paths: ["nodes[*].evidence"],
      field: "evidence_id",
      description: "Evidence ids must be unique within each node evidence bundle."
    },
    {
      kind: "each_contains_field_value",
      paths: ["nodes[*].evidence"],
      field: "kind",
      allowedFieldValues: [
        "graph_snapshot_record",
        "citation",
        "external_source"
      ],
      description: "Every node evidence bundle must contain a direct source anchor; graph_node references may only supplement it."
    },
    {
      kind: "each_unique_field",
      paths: ["edges[*].evidence"],
      field: "evidence_id",
      description: "Evidence ids must be unique within each edge evidence bundle."
    },
    {
      kind: "each_contains_field_value",
      paths: ["edges[*].evidence"],
      field: "kind",
      allowedFieldValues: [
        "graph_snapshot_record",
        "citation",
        "external_source"
      ],
      description: "Every edge evidence bundle must contain a direct source anchor; graph_node references may only supplement it."
    },
    {
      kind: "references_exist",
      paths: ["nodes[*].evidence[*].node_id?", "nodes[*].id"],
      description: "Every graph_node evidence reference on a node must resolve."
    },
    {
      kind: "references_exist",
      paths: ["edges[*].evidence[*].node_id?", "nodes[*].id"],
      description: "Every graph_node evidence reference on an edge must resolve."
    },
    {
      kind: "node_score_kind",
      paths: ["nodes"],
      allowedScoreKinds: {
        paper: ["extraction_confidence"],
        model: ["extraction_confidence"],
        family: ["extraction_confidence"]
      },
      description: "An optional node score may only report extraction confidence; other quantities lack a node-kind context."
    },
    {
      kind: "edge_score_kind",
      paths: ["edges"],
      allowedScoreKinds: {
        cites: ["citation_resolution_confidence"],
        same_as: ["structural_similarity"],
        variant_of: ["structural_similarity"],
        instantiates: [],
        belongs_to_family: []
      },
      description: "An optional edge score must state the quantity that edge kind actually computes."
    },
    {
      kind: "endpoint_kinds",
      paths: ["edges", "nodes"],
      allowedEndpointKinds: {
        cites: ["paper", "paper"],
        same_as: ["model", "model"],
        variant_of: ["model", "model"],
        instantiates: ["paper", "model"],
        belongs_to_family: ["model", "family"]
      },
      description: "Each semantic edge kind has a fixed source-kind and target-kind contract."
    }
  ]
};
Object.setPrototypeOf(PARAM_VALIDATION_CONSTRAINTS, null);
for (const constraints of Object.values(PARAM_VALIDATION_CONSTRAINTS)) {
  constraints?.forEach((constraint) => {
    Object.freeze(constraint.paths);
    if (constraint.symmetricKinds) Object.freeze(constraint.symmetricKinds);
    if (constraint.allowedEndpointKinds) {
      Object.values(constraint.allowedEndpointKinds).forEach(Object.freeze);
      Object.freeze(constraint.allowedEndpointKinds);
    }
    if (constraint.allowedValues) Object.freeze(constraint.allowedValues);
    if (constraint.numericDomains) {
      Object.values(constraint.numericDomains).forEach(Object.freeze);
      Object.freeze(constraint.numericDomains);
    }
    if (constraint.normalizationRules) {
      Object.values(constraint.normalizationRules).forEach(Object.freeze);
      Object.freeze(constraint.normalizationRules);
    }
    if (constraint.allowedScoreKinds) {
      Object.values(constraint.allowedScoreKinds).forEach(Object.freeze);
      Object.freeze(constraint.allowedScoreKinds);
    }
    if (constraint.allowedFieldValues) Object.freeze(constraint.allowedFieldValues);
    Object.freeze(constraint);
  });
  if (constraints) Object.freeze(constraints);
}
Object.freeze(PARAM_VALIDATION_CONSTRAINTS);
for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  contract.paramConstraints = PARAM_VALIDATION_CONSTRAINTS[contract.id];
}
Object.setPrototypeOf(NEST_SKILL_REGISTRY, null);
for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  Object.freeze(contract.requiredInputKeys);
  Object.freeze(contract.requiredProvenanceKeys);
  if (contract.requiredProvenanceFlags) Object.freeze(contract.requiredProvenanceFlags);
  if (contract.deprecation) Object.freeze(contract.deprecation);
  if (contract.routerEligibility) Object.freeze(contract.routerEligibility);
  if (contract.transform) {
    Object.freeze(contract.transform.rawFields);
    Object.freeze(contract.transform.requiredOptions);
    Object.freeze(contract.transform);
  }
  contract.provenanceParamConstraints?.forEach(Object.freeze);
  if (contract.provenanceParamConstraints) {
    Object.freeze(contract.provenanceParamConstraints);
  }
  Object.freeze(contract.rendererRoutes);
  if (contract.paramConstraints) Object.freeze(contract.paramConstraints);
  contract.examples.forEach(Object.freeze);
  Object.freeze(contract.examples);
  Object.freeze(contract);
}
Object.freeze(NEST_SKILL_REGISTRY);
function getSkill(id2) {
  return isSkillId(id2) ? NEST_SKILL_REGISTRY[id2] : void 0;
}

// core/colormaps.ts
var STOPS = {
  batlow: [
    "#011959",
    "#0d2d5c",
    "#1a4260",
    "#275a60",
    "#3a6b54",
    "#52744a",
    "#6b7b3e",
    "#8a8633",
    "#a18a2b",
    "#c09036",
    "#d89448",
    "#ed9a62",
    "#faccfa"
  ],
  vik: [
    "#001261",
    "#023175",
    "#136697",
    "#3c85ac",
    "#7ba9c8",
    "#dbe5e9",
    "#dba584",
    "#ba5e2a",
    "#983307",
    "#6f1107",
    "#590008"
  ],
  viridis: [
    "#440154",
    "#472d7b",
    "#3b528b",
    "#2c728e",
    "#21918c",
    "#28ae80",
    "#5ec962",
    "#addc30",
    "#fde725"
  ],
  magma: [
    "#000004",
    "#180f3e",
    "#451077",
    "#721f81",
    "#9f2f7f",
    "#cd4071",
    "#f1605d",
    "#fd9567",
    "#feca8d",
    "#fcfdbf"
  ],
  inferno: [
    "#000004",
    "#1b0c41",
    "#4a0c6b",
    "#781c6d",
    "#a52c60",
    "#cf4446",
    "#ed6925",
    "#fb9a06",
    "#f7d13d",
    "#fcffa4"
  ],
  plasma: [
    "#0d0887",
    "#41049d",
    "#6a00a8",
    "#8f0da4",
    "#b12a90",
    "#cc4778",
    "#e16462",
    "#f2844b",
    "#fca636",
    "#fcce25",
    "#f0f921"
  ],
  cividis: [
    "#00224e",
    "#123570",
    "#3b496c",
    "#575d6d",
    "#707173",
    "#8a8779",
    "#a59c74",
    "#c3b369",
    "#e1cc55",
    "#fee838"
  ]
};
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [v >> 16 & 255, v >> 8 & 255, v & 255];
}
var STOP_RGB = {
  batlow: STOPS.batlow.map(hexToRgb),
  vik: STOPS.vik.map(hexToRgb),
  viridis: STOPS.viridis.map(hexToRgb),
  magma: STOPS.magma.map(hexToRgb),
  inferno: STOPS.inferno.map(hexToRgb),
  plasma: STOPS.plasma.map(hexToRgb),
  cividis: STOPS.cividis.map(hexToRgb)
};
function clamp01(t) {
  if (!Number.isFinite(t)) throw new RangeError("colormap sample t must be finite");
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function sampleStops(stops, t) {
  const x = clamp01(t) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  if (i >= stops.length - 1) {
    const endpoint = stops[stops.length - 1];
    return [endpoint[0], endpoint[1], endpoint[2]];
  }
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f)
  ];
}
function turbo(t) {
  const x = clamp01(t);
  const x2 = x * x;
  const x3 = x2 * x;
  const x4 = x3 * x;
  const x5 = x4 * x;
  const r = 0.13572138 + 4.6153926 * x - 42.66032258 * x2 + 132.13108234 * x3 - 152.94239396 * x4 + 59.28637943 * x5;
  const g = 0.09140261 + 2.19418839 * x + 4.84296658 * x2 - 14.18503333 * x3 + 4.27729857 * x4 + 2.82956604 * x5;
  const b = 0.1066733 + 12.64194608 * x - 60.58204836 * x2 + 110.36276771 * x3 - 89.90310912 * x4 + 27.34824973 * x5;
  return [
    Math.round(clamp01(r) * 255),
    Math.round(clamp01(g) * 255),
    Math.round(clamp01(b) * 255)
  ];
}
function sampleColormap(name, t) {
  if (name !== "turbo" && !Object.hasOwn(STOP_RGB, name)) {
    throw new RangeError(`unknown colormap '${String(name)}'`);
  }
  if (name === "turbo") return turbo(t);
  return sampleStops(STOP_RGB[name], t);
}
function colormapHex(name, t) {
  const [r, g, b] = sampleColormap(name, t);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
var PALETTE_REGISTRY_POLICY = Object.freeze({
  version: "1",
  validation: "selected palette name must exist in the active runtime registry",
  manifestPalettes: "build-time discovery snapshot only",
  runtimeExtensionsAllowed: true,
  registration: "strict descriptor snapshot, validated then frozen",
  fallbackIsNotValidation: true
});
var _paletteRegistry = /* @__PURE__ */ new Map();
var CORTEXEL_PALETTE = {
  // Canvas / surfaces — the deep navy lets colors pop
  voidNavy: "#030711",
  deepNavy: "#050816",
  panel: "#0b1220",
  grid: "#1e293b",
  // Brand signal — sampled from batlow's distinctive mid-range
  cyan: "#275a60",
  // batlow(0.25) — muted teal, not Tailwind cyan
  teal: "#3a6b54",
  // batlow(0.30) — green-teal
  violet: "#faccfa",
  // batlow(1.0)  — pale magenta, the batlow endpoint
  amber: "#c09036",
  // batlow(0.55) — warm gold
  orange: "#d89448",
  // batlow(0.70) — warm amber
  pink: "#ed9a62",
  // batlow(0.80) — warm coral
  // Membrane / spikes — from batlow sequential
  membrane: "#52744a",
  // batlow(0.35) — muted biological green
  spike: "#dd954d",
  // batlow(0.78) — warm gold event marker
  spikeHot: "#ef9b67",
  // batlow(0.92) — lighter warm for spike bursts
  // Excitatory vs inhibitory — from vik diverging (Allen/MICrONS convention:
  // cool blues for E, warm reds for I)
  excitatory: "#136697",
  // vik(0.15) — cool blue
  inhibitory: "#983307",
  // vik(0.85) — warm red-brown
  // Plasticity — from vik (LTP = cool potentiation, LTD = warm depression)
  ltp: "#023175",
  // vik(0.08) — deep blue
  ltd: "#6f1107",
  // vik(0.92) — deep red
  // Text — WCAG AA on the deep-navy canvas
  ink: "#e2e8f0",
  inkDim: "#94a3b8",
  inkFaint: "#64748b"
};
Object.freeze(CORTEXEL_PALETTE);
var SEMANTIC_PALETTE_KEYS = Object.freeze(
  Object.keys(CORTEXEL_PALETTE)
);
_paletteRegistry.set("crameri", Object.freeze({
  palette: CORTEXEL_PALETTE,
  metadata: Object.freeze({
    label: "Crameri",
    source: "Crameri 2018, Nature Comms 2020 (batlow + vik)",
    diverging: true
  })
}));
function getPalette(name = "crameri") {
  const entry = _paletteRegistry.get(name);
  if (entry) return entry.palette;
  const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  if (name && name !== "crameri" && !isProduction) {
    try {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          `[cortexel] getPalette('${name}'): not registered, falling back to 'crameri'. Call registerPalette('${name}', ...) at app startup. Available: ${listPalettes().map((p) => p.name).join(", ")}`
        );
      }
    } catch {
    }
  }
  return CORTEXEL_PALETTE;
}
function listPalettes() {
  return [..._paletteRegistry.entries()].map(([name, entry]) => ({
    name,
    metadata: entry.metadata
  }));
}
function isRegisteredPalette(name) {
  return _paletteRegistry.has(name);
}
var CORTICAL_LAYER_COLORS = {
  L1: colormapHex("batlow", 0.05),
  "L2/3": colormapHex("batlow", 0.28),
  L4: colormapHex("batlow", 0.48),
  L5: colormapHex("batlow", 0.68),
  L6: colormapHex("batlow", 0.9)
};

// core/skills/provenanceKeys.ts
var import_zod4 = require("zod");
var PROVENANCE_KEYS = Object.freeze([
  "device_id",
  "recorded_variable",
  "units",
  "sampling_interval",
  "recorder_id",
  "sender_ids",
  "population_labels",
  "time_units",
  "source_ids",
  "target_ids",
  "synapse_model",
  "weight_units",
  "extent",
  "spatial_units",
  "mask",
  "kernel",
  "projection_sample_policy",
  "morphology_disclaimer",
  "frame_rate",
  "state_variables",
  "derivation_method",
  "model_context",
  "fixed_parameters",
  "bin_ms",
  "histogram_normalization",
  "interval_scope",
  "event_alignment",
  "psth_aggregation",
  "connection_sample_policy",
  "snapshot_time_ms",
  "snapshot_scope",
  "parallel_edge_policy",
  "matrix_axis_order",
  "matrix_aggregation",
  "delay_units",
  "degree_direction",
  "degree_counting",
  "zero_degree_policy",
  "node_ids",
  "position_scope",
  "detector_id",
  "reference_population",
  "target_population",
  "correlation_normalization",
  "correlation_units",
  "lag_convention",
  "binning_policy",
  "stim_units",
  "rate_normalization",
  "graph_source",
  "graph_snapshot_id",
  "graph_scope",
  "identity_advisory"
]);
var ProvenanceKeyEnum = import_zod4.z.enum(PROVENANCE_KEYS);
var STRICT_PROVENANCE_POLICY = Object.freeze({
  unknownDeclaredInputKeys: "reject",
  allowedDeclaredInputKeys: PROVENANCE_KEYS,
  requiredKeysSource: "skill.requiredProvenanceKeys",
  presentKnownValues: "validate every present known key with provenanceValueConstraints",
  requiredKeysControl: "presence only; value rules apply whether required or extra",
  normalizeBeforeValidation: true
});
var PROVENANCE_KEY_LABELS = Object.freeze({
  device_id: "device id",
  recorded_variable: "recorded variable",
  units: "units",
  sampling_interval: "sampling interval",
  recorder_id: "spike_recorder id",
  sender_ids: "sender ids",
  population_labels: "population labels",
  time_units: "time units",
  source_ids: "source ids",
  target_ids: "target ids",
  synapse_model: "synapse model",
  weight_units: "weight units",
  extent: "extent",
  spatial_units: "spatial coordinate units",
  mask: "mask",
  kernel: "kernel",
  projection_sample_policy: "projection sample policy",
  morphology_disclaimer: "morphology geometry disclaimer",
  frame_rate: "frame rate",
  state_variables: "state variables",
  derivation_method: "phase-plane derivative derivation method",
  model_context: "phase-plane model context",
  fixed_parameters: "phase-plane fixed parameters",
  bin_ms: "bin width",
  histogram_normalization: "histogram normalization",
  interval_scope: "inter-spike interval scope",
  event_alignment: "event alignment",
  psth_aggregation: "PSTH sender/trial aggregation",
  connection_sample_policy: "connection sample policy",
  snapshot_time_ms: "connection snapshot time in ms",
  snapshot_scope: "connection snapshot completeness / MPI scope",
  parallel_edge_policy: "parallel-edge handling policy",
  matrix_axis_order: "matrix source/target axis order",
  matrix_aggregation: "parallel-connection matrix aggregation",
  delay_units: "synaptic delay units",
  degree_direction: "directed degree orientation",
  degree_counting: "degree edge-counting policy",
  zero_degree_policy: "zero-degree node inclusion policy",
  node_ids: "spatial node ids",
  position_scope: "spatial position completeness / MPI scope",
  detector_id: "correlation_detector id",
  reference_population: "correlogram reference population",
  target_population: "correlogram target population",
  correlation_normalization: "correlogram normalization",
  correlation_units: "correlogram value units",
  lag_convention: "correlogram lag convention",
  binning_policy: "bin interval policy",
  stim_units: "stimulus units",
  rate_normalization: "rate normalization",
  graph_source: "graph source",
  graph_snapshot_id: "immutable graph snapshot id",
  graph_scope: "graph scope",
  identity_advisory: "model-identity advisory (structural similarity, not certified sameness)"
});
function isProvenanceKey(value) {
  return typeof value === "string" && PROVENANCE_KEYS.includes(value);
}
var PROVENANCE_PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: "2",
  evaluationOrder: Object.freeze([
    "apply provenanceValueConstraints normalization",
    "validate every present known provenance value",
    "check required provenance-key presence",
    "evaluate provenanceParamConstraints in listed order"
  ]),
  kinds: Object.freeze(["equals_param", "equals_param_path", "equals_literal"]),
  semantics: Object.freeze({
    equals_param: "declared value must equal one checked top-level params property under Object.is",
    equals_param_path: "declared value must equal the checked scalar reached through a dot-separated sequence of safe own data-property names under Object.is",
    equals_literal: "declared value must equal the contract literal under Object.is"
  })
});
var PROVENANCE_VALUE_CONSTRAINTS = (() => {
  const constraints = /* @__PURE__ */ Object.create(null);
  for (const key of PROVENANCE_KEYS) {
    constraints[key] = { kind: "nonblank_string", normalize: "trim" };
  }
  for (const key of ["sampling_interval", "bin_ms", "frame_rate"]) {
    constraints[key] = { kind: "positive_finite_number" };
  }
  constraints.snapshot_time_ms = { kind: "nonnegative_finite_number" };
  for (const key of ["device_id", "recorder_id", "detector_id"]) {
    constraints[key] = {
      kind: "nonnegative_safe_integer_or_nonblank_string",
      normalize: "trim"
    };
  }
  constraints.identity_advisory = { kind: "literal_true" };
  for (const constraint of Object.values(constraints)) Object.freeze(constraint);
  return Object.freeze(constraints);
})();
function declaredProvenanceValueError(key, value) {
  const constraint = PROVENANCE_VALUE_CONSTRAINTS[key];
  switch (constraint.kind) {
    case "positive_finite_number":
      return typeof value === "number" && Number.isFinite(value) && value > 0 ? null : `${key} must be a positive finite number`;
    case "nonnegative_finite_number":
      return typeof value === "number" && Number.isFinite(value) && value >= 0 && !Object.is(value, -0) ? null : `${key} must be a non-negative finite number`;
    case "literal_true":
      return value === true ? null : "identity_advisory must be literal true (model identity is advisory)";
    case "nonnegative_safe_integer_or_nonblank_string":
      if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0) ? null : `${key} numeric ids must be non-negative safe integers`;
      }
      return typeof value === "string" && value.trim().length > 0 ? null : `${key} must be a non-empty string or numeric id`;
    case "string":
      return typeof value === "string" ? null : `${key} must be a string`;
    case "nonblank_string":
      return typeof value === "string" && value.trim().length > 0 ? null : `${key} must be a non-empty string`;
  }
}
function normalizeDeclaredProvenanceValue(key, value) {
  const constraint = PROVENANCE_VALUE_CONSTRAINTS[key];
  return "normalize" in constraint && constraint.normalize === "trim" && typeof value === "string" ? value.trim() : value;
}
function normalizeDeclaredProvenanceInputs(inputs) {
  const normalized = {};
  for (const key of Object.keys(inputs)) {
    const value = inputs[key];
    Object.defineProperty(normalized, key, {
      value: isProvenanceKey(key) ? normalizeDeclaredProvenanceValue(key, value) : value,
      enumerable: true,
      writable: true,
      configurable: true
    });
  }
  return normalized;
}
function provenanceParamConstraintError(constraint, params, declared) {
  if (!Object.hasOwn(declared, constraint.provenanceKey)) return null;
  const actual = declared[constraint.provenanceKey];
  if (constraint.kind === "equals_literal") {
    return Object.is(actual, constraint.value) ? null : `${constraint.provenanceKey} must equal ${JSON.stringify(constraint.value)}`;
  }
  const paramPath = constraint.kind === "equals_param_path" ? constraint.paramPath : constraint.paramKey;
  const segments = paramPath.split(".");
  if (segments.length === 0 || segments.some((segment) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment) || segment === "__proto__" || segment === "prototype" || segment === "constructor")) {
    return `cannot verify ${constraint.provenanceKey}: params.${paramPath} is not a safe parameter path`;
  }
  let expected = params;
  for (const segment of segments) {
    if (expected === null || typeof expected !== "object" || Array.isArray(expected) || !Object.hasOwn(expected, segment)) {
      return `cannot verify ${constraint.provenanceKey}: params.${paramPath} is absent`;
    }
    const descriptor = Object.getOwnPropertyDescriptor(expected, segment);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      return `cannot verify ${constraint.provenanceKey}: params.${paramPath} is not an enumerable data property`;
    }
    expected = descriptor.value;
  }
  return Object.is(actual, expected) ? null : `${constraint.provenanceKey} (${JSON.stringify(actual)}) must match params.${paramPath} (${JSON.stringify(expected)})`;
}

// core/skills/paramPreflight.ts
var FLOAT32_MAX2 = 34028234663852886e22;
var MAX_SAMPLES = PARAM_LIMITS.maxSamples;
var ALLOWED_PARAM_FIELDS = Object.freeze({
  "nest.voltage_trace": ["times_ms", "series", "series_labels", "units"],
  "nest.spike_raster": ["times_ms", "senders"],
  "nest.isi_distribution": [
    "bin_centers_ms",
    "values",
    "bin_width_ms",
    "normalization",
    "value_units",
    "interval_scope"
  ],
  "nest.psth": [
    "bin_centers_ms",
    "values",
    "bin_width_ms",
    "normalization",
    "value_units",
    "trial_count",
    "alignment_event",
    "aggregation"
  ],
  "nest.population_rate": [
    "bin_centers_ms",
    "bin_width_ms",
    "window_start_ms",
    "window_stop_ms",
    "series",
    "normalization",
    "aggregation",
    "binning"
  ],
  "nest.rate_response": ["stimulus_amplitudes", "rates_hz", "stimulus_units"],
  "nest.connectivity_matrix": [
    "sources",
    "targets",
    "weights",
    "delays",
    "weight_units",
    "delay_units"
  ],
  "nest.connection_graph": [
    "nodes",
    "edges",
    "weight_units",
    "delay_units",
    "layout",
    "parallel_edges",
    "self_connections",
    "snapshot_time_ms",
    "snapshot_scope",
    "sample_policy",
    "source_connection_count",
    "edge_identity"
  ],
  "nest.adjacency_matrix": [
    "source_ids",
    "target_ids",
    "cells",
    "axis_order",
    "absent_cell",
    "sample_policy",
    "connection_count",
    "snapshot_time_ms",
    "snapshot_scope",
    "display",
    "aggregation"
  ],
  "nest.weight_matrix": [
    "source_ids",
    "target_ids",
    "cells",
    "weight_units",
    "aggregation",
    "axis_order",
    "absent_cell",
    "sample_policy",
    "connection_count",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.delay_matrix": [
    "source_ids",
    "target_ids",
    "cells",
    "delay_units",
    "aggregation",
    "axis_order",
    "absent_cell",
    "sample_policy",
    "connection_count",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.in_degree_distribution": [
    "degrees",
    "node_counts",
    "values",
    "node_count",
    "connection_count",
    "direction",
    "normalization",
    "value_units",
    "edge_counting",
    "zero_degree_policy",
    "sample_policy",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.out_degree_distribution": [
    "degrees",
    "node_counts",
    "values",
    "node_count",
    "connection_count",
    "direction",
    "normalization",
    "value_units",
    "edge_counting",
    "zero_degree_policy",
    "sample_policy",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.delay_distribution": [
    "bin_centers_ms",
    "delay_counts",
    "values",
    "bin_width_ms",
    "window_start_ms",
    "window_stop_ms",
    "normalization",
    "value_units",
    "delay_units",
    "aggregation",
    "binning",
    "sample_policy",
    "connection_count",
    "snapshot_time_ms",
    "snapshot_scope"
  ],
  "nest.weight_histogram": [
    "bin_centers",
    "values",
    "bin_width",
    "weight_units",
    "normalization",
    "value_units",
    "snapshot_time_ms"
  ],
  "nest.spatial_2d": ["positions", "coordinate_units"],
  "nest.spatial_map_2d": [
    "nodes",
    "coordinate_units",
    "extent",
    "center",
    "edge_wrap",
    "position_scope",
    "marker_size"
  ],
  "nest.spatial_3d": ["objects", "coordinate_units"],
  "nest.plasticity_dynamics": ["times_ms", "weights", "weight_units"],
  "nest.phase_plane": [
    "grid",
    "derivatives",
    "axis_units",
    "derivative_units",
    "axis_order",
    "flattening"
  ],
  "nest.correlogram": [
    "lags_ms",
    "values",
    "bin_width_ms",
    "tau_max_ms",
    "counting_start_ms",
    "counting_stop_ms",
    "pair",
    "lag_convention",
    "binning",
    "zero_lag_policy",
    "statistic"
  ],
  "nest.stimulus_response": ["times_ms", "stimulus", "response"],
  "nest.astrocyte_dynamics": ["times_ms", "ca_trace", "units"],
  "nest.compartmental_dynamics": ["times_ms", "compartments"],
  "nest.animation_replay": ["frames"],
  "corpus.knowledge_graph": [
    "graph_id",
    "graph_source",
    "graph_snapshot_id",
    "graph_scope",
    "generated_at",
    "nodes",
    "edges"
  ]
});
var INVOCATION_FIELDS = /* @__PURE__ */ new Set([
  "scene",
  "skill",
  "specVersion",
  "params",
  "mode",
  "themeMode",
  "camera",
  "palette",
  "provenance",
  "rendererRoute"
]);
var PROVENANCE_FIELDS = /* @__PURE__ */ new Set([
  "source",
  "calibrated_posterior",
  "advisory_only",
  "is_paper_local_evidence",
  "caption",
  "declared_inputs",
  "synthetic"
]);
var finite = (value) => typeof value === "number" && Number.isFinite(value);
var gpu = (value) => finite(value) && Math.abs(value) <= FLOAT32_MAX2;
var id = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function largeArray(value, path, check, expected, options = {}) {
  if (!Array.isArray(value)) return null;
  const min = options.min ?? 1;
  const max = options.max ?? MAX_SAMPLES;
  if (value.length < min || value.length > max) {
    return {
      path,
      message: `expected ${min}\u2013${max} items; received ${value.length}`
    };
  }
  for (let index = 0; index < value.length; index++) {
    if (!check(value[index])) {
      return { path: `${path}.${index}`, message: `expected ${expected}` };
    }
  }
  return null;
}
function numericFields(params, fields) {
  for (const [field, check, expected] of fields) {
    const issue = largeArray(params[field], field, check, expected);
    if (issue) return issue;
  }
  return null;
}
function boundedText(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}
function preflightLargeSkillParams(skillId, params) {
  const time = (field = "times_ms") => [field, finite, "a finite number"];
  const gpuField = (field) => [field, gpu, "a finite Float32-range number"];
  const idField = (field) => [field, id, "a non-negative safe integer"];
  switch (skillId) {
    case "nest.spike_raster":
      return numericFields(params, [time(), idField("senders")]);
    case "nest.isi_distribution": {
      const issue = numericFields(params, [
        time("bin_centers_ms"),
        gpuField("values")
      ]);
      if (issue) return issue;
      for (const [field, message] of [
        ["bin_centers_ms", "inter-spike interval bin centers cannot be negative"],
        ["values", "histogram values cannot be negative"]
      ]) {
        const values = params[field];
        if (Array.isArray(values)) {
          const index = values.findIndex(
            (value) => typeof value === "number" && value < 0
          );
          if (index >= 0) return { path: `${field}.${index}`, message };
        }
      }
      return null;
    }
    case "nest.psth": {
      const issue = numericFields(params, [
        time("bin_centers_ms"),
        gpuField("values")
      ]);
      if (issue) return issue;
      const values = params.values;
      if (Array.isArray(values)) {
        const index = values.findIndex(
          (value) => typeof value === "number" && value < 0
        );
        if (index >= 0) {
          return { path: `values.${index}`, message: "histogram values cannot be negative" };
        }
      }
      return null;
    }
    case "nest.population_rate": {
      const issue = numericFields(params, [time("bin_centers_ms")]);
      if (issue) return issue;
      if (!Array.isArray(params.series)) return null;
      const outer = largeArray(
        params.series,
        "series",
        (series) => {
          const item = record(series);
          return !!item && Object.keys(item).every((key) => ["id", "label", "recorded_sender_count", "spike_counts", "rates_hz"].includes(key)) && boundedText(item.id, 120) && boundedText(item.label, 240) && typeof item.recorded_sender_count === "number" && Number.isSafeInteger(item.recorded_sender_count) && item.recorded_sender_count > 0 && Array.isArray(item.spike_counts) && item.spike_counts.length >= 1 && Array.isArray(item.rates_hz) && item.rates_hz.length >= 1;
        },
        "a closed population-rate series with id, label, sender count, spike counts, and rates",
        { max: PARAM_LIMITS.maxSeries }
      );
      if (outer) return outer;
      for (let index = 0; index < params.series.length; index++) {
        const item = record(params.series[index]);
        if (!item) continue;
        const counts = largeArray(
          item.spike_counts,
          `series.${index}.spike_counts`,
          (value) => id(value),
          "a non-negative safe-integer spike count"
        );
        if (counts) return counts;
        const rates = largeArray(
          item.rates_hz,
          `series.${index}.rates_hz`,
          (value) => gpu(value) && value >= 0,
          "a non-negative finite Float32-range rate"
        );
        if (rates) return rates;
      }
      return null;
    }
    case "nest.rate_response": {
      const issue = numericFields(params, [
        gpuField("stimulus_amplitudes"),
        gpuField("rates_hz")
      ]);
      if (issue) return issue;
      const rates = params.rates_hz;
      if (Array.isArray(rates)) {
        const index = rates.findIndex((rate) => typeof rate === "number" && rate < 0);
        if (index >= 0) return { path: `rates_hz.${index}`, message: "firing rates cannot be negative" };
      }
      return null;
    }
    case "nest.connectivity_matrix":
      return numericFields(params, [
        idField("sources"),
        idField("targets"),
        gpuField("weights"),
        gpuField("delays")
      ]);
    case "nest.connection_graph": {
      const nodes = largeArray(
        params.nodes,
        "nodes",
        (value) => {
          const node = record(value);
          return !!node && id(node.id) && boundedText(node.label, 120);
        },
        "a closed graph node with a safe id and bounded label",
        { max: PARAM_LIMITS.maxTopologyNodes }
      );
      if (nodes) return nodes;
      return largeArray(
        params.edges,
        "edges",
        (value) => {
          const edge = record(value);
          return !!edge && boundedText(edge.id, 240) && id(edge.source) && id(edge.target) && (edge.weight === void 0 || gpu(edge.weight)) && (edge.delay_ms === void 0 || gpu(edge.delay_ms) && edge.delay_ms > 0);
        },
        "a closed graph edge with safe endpoints and optional finite measurements",
        { max: PARAM_LIMITS.maxTopologyEdges }
      );
    }
    case "nest.adjacency_matrix":
    case "nest.weight_matrix":
    case "nest.delay_matrix": {
      const axes = numericFields(params, [idField("source_ids"), idField("target_ids")]);
      if (axes) return axes;
      return largeArray(
        params.cells,
        "cells",
        (value) => {
          const cell = record(value);
          return !!cell && id(cell.source_id) && id(cell.target_id) && id(cell.connection_count) && cell.connection_count > 0 && (cell.value === void 0 || gpu(cell.value));
        },
        "a sparse matrix cell with safe endpoint ids and positive connection count",
        { max: PARAM_LIMITS.maxSamples }
      );
    }
    case "nest.in_degree_distribution":
    case "nest.out_degree_distribution":
      return numericFields(params, [
        idField("degrees"),
        idField("node_counts"),
        gpuField("values")
      ]);
    case "nest.delay_distribution":
      return numericFields(params, [
        time("bin_centers_ms"),
        idField("delay_counts"),
        gpuField("values")
      ]);
    case "nest.weight_histogram": {
      const issue = numericFields(params, [
        gpuField("bin_centers"),
        gpuField("values")
      ]);
      if (issue) return issue;
      const values = params.values;
      if (Array.isArray(values)) {
        const index = values.findIndex(
          (value) => typeof value === "number" && value < 0
        );
        if (index >= 0) {
          return { path: `values.${index}`, message: "histogram values cannot be negative" };
        }
      }
      return null;
    }
    case "nest.plasticity_dynamics":
      return numericFields(params, [time(), gpuField("weights")]);
    case "nest.astrocyte_dynamics": {
      const issue = numericFields(params, [time(), gpuField("ca_trace")]);
      if (issue) return issue;
      const trace = params.ca_trace;
      if (Array.isArray(trace)) {
        const index = trace.findIndex((sample) => typeof sample === "number" && sample < 0);
        if (index >= 0) {
          return { path: `ca_trace.${index}`, message: "absolute Ca\xB2\u207A concentration cannot be negative" };
        }
      }
      return null;
    }
    case "nest.correlogram":
      return numericFields(params, [time("lags_ms"), gpuField("values")]);
    case "nest.stimulus_response":
      return numericFields(params, [
        time(),
        gpuField("stimulus"),
        gpuField("response")
      ]);
    case "nest.voltage_trace": {
      const issue = numericFields(params, [time()]);
      if (issue) return issue;
      if (Array.isArray(params.series)) {
        const outer = largeArray(
          params.series,
          "series",
          (series) => Array.isArray(series) && series.length >= 1 && series.length <= MAX_SAMPLES,
          "a non-empty numeric series",
          { max: 256 }
        );
        if (outer) return outer;
        for (let index = 0; index < params.series.length; index++) {
          const nested = largeArray(
            params.series[index],
            `series.${index}`,
            gpu,
            "a finite Float32-range number"
          );
          if (nested) return nested;
        }
      }
      const labels = largeArray(
        params.series_labels,
        "series_labels",
        (label) => boundedText(label, 120),
        "a bounded non-blank label",
        { max: 256 }
      );
      if (labels) return labels;
      return null;
    }
    case "nest.phase_plane": {
      for (const field of ["grid", "derivatives"]) {
        const collection = record(params[field]);
        if (!collection) continue;
        for (const [name, values] of Object.entries(collection)) {
          const issue = largeArray(
            values,
            `${field}.${name}`,
            gpu,
            "a finite Float32-range number"
          );
          if (issue) return issue;
        }
      }
      return null;
    }
    case "nest.spatial_2d":
      return largeArray(
        params.positions,
        "positions",
        (position) => Array.isArray(position) && position.length === 2 && position.every(gpu),
        "an exact [x,y] Float32-range tuple",
        { max: PARAM_LIMITS.maxSpatialObjects }
      );
    case "nest.spatial_map_2d":
      return largeArray(
        params.nodes,
        "nodes",
        (value) => {
          const node = record(value);
          return !!node && id(node.id) && boundedText(node.label, 120) && gpu(node.x) && gpu(node.y);
        },
        "an identified 2D node with finite coordinates",
        { max: PARAM_LIMITS.maxSpatialObjects }
      );
    case "nest.spatial_3d":
      return largeArray(
        params.objects,
        "objects",
        (object) => {
          const item = record(object);
          return !!item && gpu(item.x) && gpu(item.y) && gpu(item.z);
        },
        "an object with finite Float32-range x/y/z",
        { max: PARAM_LIMITS.maxSpatialObjects }
      );
    case "nest.compartmental_dynamics": {
      const issue = numericFields(params, [time()]);
      if (issue) return issue;
      if (Array.isArray(params.compartments)) {
        const outer = largeArray(
          params.compartments,
          "compartments",
          (compartment) => {
            const item = record(compartment);
            if (!item) return false;
            const keys = Object.keys(item);
            return keys.every((key) => ["id", "parent_id", "label", "values"].includes(key)) && boundedText(item.id, 120) && (item.parent_id === null || boundedText(item.parent_id, 120)) && (item.label === void 0 || boundedText(item.label, 240)) && Array.isArray(item.values) && item.values.length >= 1;
          },
          "a closed compartment with id, parent_id, and non-empty values",
          { max: 256 }
        );
        if (outer) return outer;
        for (let index = 0; index < params.compartments.length; index++) {
          const item = record(params.compartments[index]);
          if (!item) continue;
          const nested = largeArray(
            item.values,
            `compartments.${index}.values`,
            gpu,
            "a finite Float32-range number"
          );
          if (nested) return nested;
        }
      }
      return null;
    }
    case "nest.animation_replay":
      return largeArray(
        params.frames,
        "frames",
        (frame) => {
          const item = record(frame);
          const state = item ? record(item.state) : void 0;
          return !!item && Object.keys(item).every((key) => ["time_ms", "state", "annotation"].includes(key)) && finite(item.time_ms) && item.time_ms >= 0 && !!state && Object.keys(state).length > 0 && Object.keys(state).every(
            (key) => key.length >= 1 && key.length <= 80 && key.trim() === key
          ) && (item.annotation === void 0 || boundedText(item.annotation, 500));
        },
        "a frame with non-negative time_ms and an object state",
        { max: 1e4 }
      );
    case "corpus.knowledge_graph": {
      const nodeKinds = new Set(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS);
      const edgeKinds = new Set(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS);
      const attributesAreBounded = (value) => {
        const attributes = record(value);
        if (!attributes || Object.keys(attributes).length > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
          return false;
        }
        return Object.values(attributes).every(
          (attribute) => !Array.isArray(attribute) || attribute.length <= KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems
        );
      };
      const evidenceIsBounded = (value) => Array.isArray(value) && value.length >= 1 && value.length <= KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement;
      const epistemicIsDerived = (value) => {
        const epistemic = record(value);
        return !!epistemic && epistemic.status === "derived_advisory" && epistemic.advisory_only === true && epistemic.is_paper_local_evidence === false && epistemic.calibrated_posterior === false;
      };
      return largeArray(
        params.nodes,
        "nodes",
        (node) => {
          const item = record(node);
          return !!item && Object.keys(item).every((key) => [
            "id",
            "kind",
            "label",
            "detail",
            "attributes",
            "epistemic",
            "evidence",
            "uncalibrated_score"
          ].includes(key)) && boundedText(item.id, 120) && boundedText(item.label, 240) && (item.detail === void 0 || boundedText(item.detail, KNOWLEDGE_GRAPH_LIMITS.maxDetailLength)) && attributesAreBounded(item.attributes) && epistemicIsDerived(item.epistemic) && evidenceIsBounded(item.evidence) && nodeKinds.has(item.kind);
        },
        "a bounded, evidence-carrying paper/model/family node",
        { max: PARAM_LIMITS.maxGraphNodes }
      ) ?? largeArray(
        params.edges,
        "edges",
        (edge) => {
          const item = record(edge);
          return !!item && Object.keys(item).every((key) => [
            "id",
            "source",
            "target",
            "kind",
            "label",
            "attributes",
            "epistemic",
            "evidence",
            "uncalibrated_score"
          ].includes(key)) && boundedText(item.id, 320) && boundedText(item.source, 120) && boundedText(item.target, 120) && boundedText(item.label, 160) && attributesAreBounded(item.attributes) && epistemicIsDerived(item.epistemic) && evidenceIsBounded(item.evidence) && edgeKinds.has(item.kind);
        },
        "a bounded, identified, evidence-carrying knowledge-graph edge",
        { min: 0, max: PARAM_LIMITS.maxGraphEdges }
      );
    }
    default:
      return null;
  }
}
function preflightRawSkillParams(skillId, params) {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(params);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const allowed = ALLOWED_PARAM_FIELDS[skillId];
  if (allowed) {
    const allowedSet = new Set(allowed);
    const fields = Reflect.ownKeys(params);
    if (fields.some((field) => typeof field !== "string" || !allowedSet.has(field))) {
      return {
        path: "(root)",
        message: "params contain an unknown, symbol, or unsupported top-level field"
      };
    }
  }
  const ownValue = (key) => {
    const descriptor = Object.getOwnPropertyDescriptor(params, key);
    return descriptor && "value" in descriptor && descriptor.enumerable ? descriptor.value : void 0;
  };
  const arrayLength = (value) => {
    if (!Array.isArray(value)) return void 0;
    const length = Object.getOwnPropertyDescriptor(value, "length");
    return length && "value" in length && Number.isSafeInteger(length.value) ? length.value : void 0;
  };
  const tooLongValue = (value, path, max) => {
    const length = arrayLength(value);
    return length !== void 0 && length > max ? { path, message: `${path} may contain at most ${max} items` } : null;
  };
  const tooLong = (key, max) => {
    return tooLongValue(ownValue(key), key, max);
  };
  const tooManyKeys = (key, max) => {
    const value = ownValue(key);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const count = Reflect.ownKeys(value).length;
    return count > max ? { path: key, message: `${key} may contain at most ${max} properties` } : null;
  };
  const directArrays = (fields, max = MAX_SAMPLES) => {
    for (const field of fields) {
      const issue = tooLong(field, max);
      if (issue) return issue;
    }
    return null;
  };
  const nestedArrays = (outerKey, outerMax, innerKey) => {
    const outer = ownValue(outerKey);
    const outerIssue = tooLongValue(outer, outerKey, outerMax);
    if (outerIssue || !Array.isArray(outer)) return outerIssue;
    const length = arrayLength(outer);
    if (length === void 0 || length > outerMax) return null;
    for (let index = 0; index < length; index++) {
      const itemDescriptor = Object.getOwnPropertyDescriptor(outer, String(index));
      if (!itemDescriptor || !("value" in itemDescriptor) || !itemDescriptor.enumerable) {
        continue;
      }
      let nested = itemDescriptor.value;
      if (innerKey) {
        if (nested === null || typeof nested !== "object" || Array.isArray(nested)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(nested, innerKey);
        nested = descriptor && "value" in descriptor && descriptor.enumerable ? descriptor.value : void 0;
      }
      const issue = tooLongValue(
        nested,
        innerKey ? `${outerKey}.${index}.${innerKey}` : `${outerKey}.${index}`,
        MAX_SAMPLES
      );
      if (issue) return issue;
    }
    return null;
  };
  const recordValueArrays = (key) => {
    const collection = ownValue(key);
    if (collection === null || typeof collection !== "object" || Array.isArray(collection)) {
      return null;
    }
    const keys = Reflect.ownKeys(collection);
    if (keys.length > 2) {
      return { path: key, message: `${key} may contain at most 2 properties` };
    }
    for (const name of keys) {
      if (typeof name !== "string") continue;
      const descriptor = Object.getOwnPropertyDescriptor(collection, name);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) continue;
      const issue = tooLongValue(descriptor.value, `${key}.${name}`, MAX_SAMPLES);
      if (issue) return issue;
    }
    return null;
  };
  const graphElementBudgets = (key, max) => {
    const collection = ownValue(key);
    const outerIssue = tooLongValue(collection, key, max);
    if (outerIssue || !Array.isArray(collection)) return outerIssue;
    const length = arrayLength(collection);
    if (length === void 0 || length > max) return null;
    for (let index = 0; index < length; index++) {
      const itemDescriptor = Object.getOwnPropertyDescriptor(collection, String(index));
      if (!itemDescriptor || !("value" in itemDescriptor) || !itemDescriptor.enumerable) {
        continue;
      }
      const item = itemDescriptor.value;
      if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
      const attributesDescriptor = Object.getOwnPropertyDescriptor(item, "attributes");
      const attributes = attributesDescriptor && "value" in attributesDescriptor && attributesDescriptor.enumerable ? attributesDescriptor.value : void 0;
      if (attributes !== null && typeof attributes === "object" && !Array.isArray(attributes)) {
        let attributeCount = 0;
        for (const attributeKey in attributes) {
          if (!Object.hasOwn(attributes, attributeKey)) continue;
          attributeCount += 1;
          if (attributeCount > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
            return {
              path: `${key}.${index}.attributes`,
              message: `attributes may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxAttributes} properties`
            };
          }
          const attributeDescriptor = Object.getOwnPropertyDescriptor(attributes, attributeKey);
          if (!attributeDescriptor || !("value" in attributeDescriptor) || !attributeDescriptor.enumerable) continue;
          const valueIssue = tooLongValue(
            attributeDescriptor.value,
            `${key}.${index}.attributes.${attributeKey}`,
            KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems
          );
          if (valueIssue) return valueIssue;
        }
      }
      const evidenceDescriptor = Object.getOwnPropertyDescriptor(item, "evidence");
      const evidence = evidenceDescriptor && "value" in evidenceDescriptor && evidenceDescriptor.enumerable ? evidenceDescriptor.value : void 0;
      const evidenceIssue = tooLongValue(
        evidence,
        `${key}.${index}.evidence`,
        KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement
      );
      if (evidenceIssue) return evidenceIssue;
    }
    return null;
  };
  switch (skillId) {
    case "nest.voltage_trace":
      return directArrays(["times_ms"]) ?? nestedArrays("series", PARAM_LIMITS.maxSeries) ?? tooLong("series_labels", PARAM_LIMITS.maxSeries);
    case "nest.spike_raster":
      return directArrays(["times_ms", "senders"]);
    case "nest.isi_distribution":
    case "nest.psth":
      return directArrays(["bin_centers_ms", "values"]);
    case "nest.population_rate":
      return directArrays(["bin_centers_ms"]) ?? nestedArrays("series", PARAM_LIMITS.maxSeries, "spike_counts") ?? nestedArrays("series", PARAM_LIMITS.maxSeries, "rates_hz");
    case "nest.rate_response":
      return directArrays(["stimulus_amplitudes", "rates_hz"]);
    case "nest.connectivity_matrix":
      return directArrays(["sources", "targets", "weights", "delays"]);
    case "nest.connection_graph":
      return tooLong("nodes", PARAM_LIMITS.maxTopologyNodes) ?? tooLong("edges", PARAM_LIMITS.maxTopologyEdges);
    case "nest.adjacency_matrix":
    case "nest.weight_matrix":
    case "nest.delay_matrix":
      return directArrays(["source_ids", "target_ids"]) ?? tooLong("cells", PARAM_LIMITS.maxSamples);
    case "nest.in_degree_distribution":
    case "nest.out_degree_distribution":
      return directArrays(["degrees", "node_counts", "values"]);
    case "nest.delay_distribution":
      return directArrays(["bin_centers_ms", "delay_counts", "values"]);
    case "nest.weight_histogram":
      return directArrays(["bin_centers", "values"]);
    case "nest.spatial_2d":
      return tooLong("positions", PARAM_LIMITS.maxSpatialObjects);
    case "nest.spatial_map_2d":
      return tooLong("nodes", PARAM_LIMITS.maxSpatialObjects);
    case "nest.spatial_3d":
      return tooLong("objects", PARAM_LIMITS.maxSpatialObjects);
    case "nest.plasticity_dynamics":
      return directArrays(["times_ms", "weights"]);
    case "nest.compartmental_dynamics":
      return directArrays(["times_ms"]) ?? nestedArrays("compartments", PARAM_LIMITS.maxSeries, "values");
    case "nest.correlogram":
      return directArrays(["lags_ms", "values"]);
    case "nest.stimulus_response":
      return directArrays(["times_ms", "stimulus", "response"]);
    case "nest.astrocyte_dynamics":
      return directArrays(["times_ms", "ca_trace"]);
    case "nest.animation_replay":
      return tooLong("frames", 1e4);
    case "corpus.knowledge_graph":
      return graphElementBudgets("nodes", PARAM_LIMITS.maxGraphNodes) ?? graphElementBudgets("edges", PARAM_LIMITS.maxGraphEdges);
    case "nest.phase_plane":
      return tooManyKeys("grid", 2) ?? tooManyKeys("derivatives", 2) ?? tooManyKeys("axis_units", 2) ?? tooManyKeys("derivative_units", 2) ?? recordValueArrays("grid") ?? recordValueArrays("derivatives") ?? tooLong("axis_order", 2);
    default:
      return null;
  }
}
function preflightRawEnvelopeParams(skillId, payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(payload);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const fields = Reflect.ownKeys(payload);
  if (fields.some((field) => typeof field !== "string" || !INVOCATION_FIELDS.has(field))) {
    return {
      scope: "envelope",
      path: "(root)",
      message: "invocation contains an unknown, symbol, or unsupported top-level field"
    };
  }
  const provenance = Object.getOwnPropertyDescriptor(payload, "provenance");
  if (provenance && "value" in provenance && provenance.enumerable && provenance.value !== null && typeof provenance.value === "object" && !Array.isArray(provenance.value)) {
    const provenancePrototype = Object.getPrototypeOf(provenance.value);
    if (provenancePrototype === Object.prototype || provenancePrototype === null) {
      const provenanceFields = Reflect.ownKeys(provenance.value);
      if (provenanceFields.some(
        (field) => typeof field !== "string" || !PROVENANCE_FIELDS.has(field)
      )) {
        return {
          scope: "envelope",
          path: "provenance",
          message: "provenance contains an unknown, symbol, or unsupported field"
        };
      }
    }
  }
  const descriptor = Object.getOwnPropertyDescriptor(payload, "params");
  const issue = descriptor && "value" in descriptor && descriptor.enumerable ? preflightRawSkillParams(skillId, descriptor.value) : null;
  return issue ? { ...issue, scope: "params" } : null;
}

// core/skills/validateSkillInvocation.ts
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}
function nearestSkill(id2) {
  if (id2.length === 0 || id2.length > 80) return void 0;
  let best;
  let bestD = Infinity;
  for (const candidate of NEST_SKILL_IDS) {
    const d = editDistance(id2, candidate);
    if (d < bestD) {
      bestD = d;
      best = candidate;
    }
  }
  return best !== void 0 && bestD <= Math.max(3, Math.ceil(id2.length * 0.4)) ? best : void 0;
}
var MAX_INVOCATION_ERRORS = 32;
function validateSkillInvocationUnsafe(skillId, payload) {
  const errors = [];
  const contract = getSkill(skillId);
  if (!contract) {
    const suggestion = typeof skillId === "string" ? nearestSkill(skillId) : void 0;
    return {
      ok: false,
      errors: [
        {
          code: "unknown_skill",
          path: "skillId",
          message: `unknown skill '${safePrimitiveDiagnostic(skillId)}'`,
          hint: suggestion ? `Did you mean '${suggestion}'? Otherwise use one of the ids in validSkills.` : "Use one of the ids in validSkills (nest.* and corpus.*).",
          validSkills: NEST_SKILL_IDS,
          didYouMean: suggestion,
          // Attach the nearest skill's example so a typo self-repairs in one shot.
          example: suggestion ? getInvocationExamplePayload(suggestion) : void 0
        }
      ]
    };
  }
  if (contract.scene === null) {
    return {
      ok: false,
      errors: [
        {
          code: "no_cortexel_scene",
          path: "skillId",
          message: `skill '${skillId}' has no Cortexel scene (route to a host renderer)`,
          hint: `Renderer routes: ${contract.rendererRoutes.join(", ")}.`
        }
      ]
    };
  }
  const example = getExamplePayload(contract.id);
  const rawParamPreflight = preflightRawEnvelopeParams(contract.id, payload);
  if (rawParamPreflight) {
    const envelopeIssue = rawParamPreflight.scope === "envelope";
    return {
      ok: false,
      errors: [{
        code: envelopeIssue ? "invalid_envelope" : "invalid_params",
        path: envelopeIssue ? rawParamPreflight.path : `params.${rawParamPreflight.path}`,
        message: rawParamPreflight.message,
        hint: envelopeIssue ? "Use only fields declared by the strict invocation envelope." : `Required params: ${contract.requiredInputKeys.join(", ")}.`,
        example
      }]
    };
  }
  const rawProvenance = readOwnEnumerableDataProperty(payload, "provenance");
  const rawCalibrated = rawProvenance.kind === "value" ? readOwnEnumerableDataProperty(rawProvenance.value, "calibrated_posterior") : { kind: "absent" };
  if (rawCalibrated.kind === "value" && rawCalibrated.value === true) {
    return {
      ok: false,
      errors: [
        {
          code: "calibrated_posterior_unsupported",
          path: "provenance.calibrated_posterior",
          message: "calibrated_posterior=true is not implemented and is rejected at the visualization boundary",
          hint: "Validation/search is candidate ranking; leave calibrated_posterior=false.",
          example
        }
      ]
    };
  }
  const rawVersionProperty = readOwnEnumerableDataProperty(payload, "specVersion");
  const rawVersion = rawVersionProperty.kind === "value" ? rawVersionProperty.value : void 0;
  if (rawVersionProperty.kind === "value" && rawVersion !== CORTEXEL_SPEC_VERSION) {
    return {
      ok: false,
      errors: [
        {
          code: "unsupported_spec_version",
          path: "specVersion",
          message: `unsupported spec version '${safePrimitiveDiagnostic(rawVersion)}'`,
          hint: `Use '${CORTEXEL_SPEC_VERSION}', or omit specVersion for a legacy envelope.`,
          example
        }
      ]
    };
  }
  const envelope = validateVizSpec(payload);
  if (!envelope.ok) {
    return {
      ok: false,
      errors: envelope.errors.slice(0, MAX_INVOCATION_ERRORS).map((formatted, index) => {
        const separator = formatted.indexOf(": ");
        const path = separator >= 0 ? formatted.slice(0, separator) : "(spec)";
        const message = separator >= 0 ? formatted.slice(separator + 2) : formatted;
        return {
          code: "invalid_envelope",
          path,
          message,
          hint: "Match the VizSpec envelope shape shown in the attached skill example.",
          validScenes: SCENE_NAMES,
          example: index === 0 ? example : void 0
        };
      })
    };
  }
  let spec = envelope.spec;
  if (spec.skill && spec.skill !== skillId) {
    errors.push({
      code: "skill_mismatch",
      path: "skill",
      message: `spec.skill '${spec.skill}' does not match the skill '${skillId}' it is being validated under`,
      hint: `Validate this spec with skillId '${spec.skill}', or set spec.skill to '${skillId}'.`,
      example
    });
  }
  if (spec.scene !== contract.scene) {
    errors.push({
      code: "scene_mismatch",
      path: "scene",
      message: `scene '${spec.scene}' does not match skill '${skillId}' scene '${contract.scene}'`,
      hint: `Set scene: '${contract.scene}'.`,
      validScenes: [contract.scene],
      example
    });
  }
  if (contract.paramsSchema) {
    const preflight = preflightLargeSkillParams(contract.id, spec.params);
    const parsed = preflight ? void 0 : contract.paramsSchema.safeParse(spec.params);
    if (preflight) {
      errors.push({
        code: "invalid_params",
        path: `params.${preflight.path}`,
        message: preflight.message,
        hint: `Required params: ${contract.requiredInputKeys.join(", ")}.`,
        example
      });
    } else if (parsed && !parsed.success) {
      const issues = parsed.error.issues;
      const available = Math.max(0, MAX_INVOCATION_ERRORS - errors.length);
      const detailedCount = Math.min(issues.length, Math.max(0, available - 1));
      for (const issue of issues.slice(0, detailedCount)) {
        const bounded = boundValidationIssue(issue);
        errors.push({
          code: "invalid_params",
          path: `params.${bounded.path}`,
          message: bounded.message,
          hint: `Required params: ${contract.requiredInputKeys.join(", ")}.`,
          // One example is enough; repeating it on every issue bloats serialized
          // tool output quadratically for malformed arrays.
          example: errors.some((error) => error.example) ? void 0 : example
        });
      }
      if (issues.length > detailedCount && errors.length < MAX_INVOCATION_ERRORS) {
        errors.push({
          code: "invalid_params",
          path: "params.(root)",
          message: `additional validation issues omitted after ${MAX_INVOCATION_ERRORS} errors`,
          hint: "Fix the reported shape first, then validate again."
        });
      }
    } else if (parsed?.success) {
      spec = { ...spec, params: parsed.data };
    }
  }
  let prov = spec.provenance;
  for (const flag of [
    "advisory_only",
    "is_paper_local_evidence",
    "synthetic"
  ]) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    const required = contract.requiredProvenanceFlags?.[flag];
    if (required !== void 0 && prov[flag] !== required) {
      errors.push({
        code: "invalid_provenance",
        path: `provenance.${flag}`,
        message: `skill '${skillId}' requires provenance.${flag}=${required}; received ${prov[flag]}`,
        hint: "Use the skill contract requiredProvenanceFlags value; element-level epistemic status cannot be overridden by the envelope.",
        example: errors.some((error) => error.example) ? void 0 : example
      });
    }
  }
  const declared = normalizeDeclaredProvenanceInputs(
    prov.declared_inputs ?? {}
  );
  if (prov.declared_inputs) {
    prov = { ...prov, declared_inputs: declared };
    spec = { ...spec, provenance: prov };
  }
  const invalidDeclaredKeys = /* @__PURE__ */ new Set();
  for (const key of Object.keys(declared)) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    if (!isProvenanceKey(key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "invalid_provenance",
        path: `provenance.declared_inputs.${key}`,
        message: `unknown declared provenance key '${key}'`,
        hint: "Use only keys from PROVENANCE_KEYS and the selected skill contract.",
        example: errors.some((error) => error.example) ? void 0 : example
      });
      continue;
    }
    const message = declaredProvenanceValueError(key, declared[key]);
    if (message) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "invalid_provenance",
        path: `provenance.declared_inputs.${key}`,
        message,
        hint: `Declare a meaningful value for '${key}' that matches its provenance constraint.`,
        example: errors.some((error) => error.example) ? void 0 : example
      });
    }
  }
  for (const key of contract.requiredProvenanceKeys) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    if (!Object.hasOwn(declared, key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "missing_provenance",
        path: `provenance.declared_inputs.${key}`,
        message: `missing required provenance: ${key}`,
        hint: `Skill '${skillId}' requires declared_inputs for: ${contract.requiredProvenanceKeys.join(", ")}.`,
        example: errors.some((error) => error.example) ? void 0 : example
      });
    }
  }
  if (!errors.some((error) => error.code === "invalid_params")) {
    for (const constraint of contract.provenanceParamConstraints ?? []) {
      if (errors.length >= MAX_INVOCATION_ERRORS) break;
      if (invalidDeclaredKeys.has(constraint.provenanceKey)) continue;
      const message = provenanceParamConstraintError(
        constraint,
        spec.params,
        declared
      );
      if (message) {
        errors.push({
          code: "invalid_provenance",
          path: `provenance.declared_inputs.${constraint.provenanceKey}`,
          message,
          hint: constraint.description,
          example: errors.some((error) => error.example) ? void 0 : example
        });
      }
    }
  }
  if (spec.palette && !isRegisteredPalette(spec.palette)) {
    errors.push({
      code: "unknown_palette",
      path: "palette",
      message: `palette '${spec.palette}' is not registered`,
      hint: `Use one of: ${listPalettes().map((p) => p.name).join(", ")}.`,
      validPalettes: listPalettes().map((p) => p.name),
      example
    });
  }
  if (errors.length > 0) return { ok: false, errors };
  let caption = requiresHonestyCaption(prov) ? defaultHonestyCaption(prov) : null;
  if (contract.weak) {
    const weakMsg = contract.weakDisclosure ?? `Derived view \u2014 ${skillId} reuses the '${contract.scene}' scene; not a 1:1 rendering.`;
    caption = caption ? `${weakMsg} ${caption}` : weakMsg;
  }
  return {
    ok: true,
    spec,
    skill: contract.id,
    scene: contract.scene,
    caption
  };
}
function validateSkillInvocation(skillId, payload) {
  try {
    return validateSkillInvocationUnsafe(skillId, payload);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_envelope",
          path: "(spec)",
          message: `validation could not safely inspect the payload: ${safeErrorMessage(error)}`,
          validScenes: SCENE_NAMES
        }
      ]
    };
  }
}

// core/skills/authoring.ts
function validateSpec(payload) {
  let skillProperty;
  try {
    skillProperty = readOwnEnumerableDataProperty(payload, "skill");
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_envelope",
          path: "(spec)",
          message: `validation could not safely inspect spec.skill: ${safeErrorMessage(error)}`
        }
      ]
    };
  }
  const skill = skillProperty.kind === "value" ? skillProperty.value : void 0;
  const normalizedSkill = typeof skill === "string" && skill.length <= 80 ? skill.trim() : skill;
  if (typeof normalizedSkill !== "string" || normalizedSkill.length === 0) {
    return {
      ok: false,
      errors: [
        {
          code: "unknown_skill",
          path: "skill",
          message: "spec has no `skill` field \u2014 validateSpec needs a self-describing spec",
          hint: "Set spec.skill to a skill id (see validSkills), or call validateSkillInvocation(skillId, spec) with an explicit id.",
          validSkills: SKILL_IDS
        }
      ]
    };
  }
  return validateSkillInvocation(normalizedSkill, payload);
}

// react/VizSpecRenderer.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function cloneValidatedJson(value) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
function VizSpecRenderer({
  spec,
  renderScene,
  skillId,
  trustedEnvelope = false,
  active = true,
  activePalette,
  captionPlacement = "overlay",
  onError,
  onInvocationError
}) {
  let embeddedSkillProperty;
  try {
    embeddedSkillProperty = readOwnEnumerableDataProperty(spec, "skill");
  } catch {
    embeddedSkillProperty = { kind: "absent" };
  }
  const hasEmbeddedSkill = embeddedSkillProperty.kind === "value";
  const embeddedSkill = embeddedSkillProperty.kind === "value" ? embeddedSkillProperty.value : void 0;
  const effectiveSkillId = skillId !== void 0 ? skillId : hasEmbeddedSkill ? typeof embeddedSkill === "string" ? embeddedSkill.length <= 80 ? embeddedSkill.trim() : embeddedSkill : embeddedSkill : void 0;
  const validation = (0, import_react2.useMemo)(() => effectiveSkillId !== void 0 ? {
    kind: "strict",
    result: validateSkillInvocation(effectiveSkillId, spec)
  } : !trustedEnvelope ? {
    kind: "strict",
    result: validateSpec(spec)
  } : {
    kind: "plain",
    result: validateVizSpec(spec)
  }, [effectiveSkillId, spec, trustedEnvelope]);
  if (validation.kind === "strict") {
    const gated = validation.result;
    if (!gated.ok) {
      const messages = gated.errors.map((e) => `${e.path}: ${e.message}`);
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        ValidationError,
        {
          title: "Invalid skill invocation",
          messages,
          errors: gated.errors,
          onError,
          onInvocationError
        }
      );
    }
    const palette2 = gated.spec.palette ? getPalette(gated.spec.palette) : activePalette ?? getPalette("crameri");
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      SceneFrame,
      {
        skill: gated.skill,
        scene: gated.scene,
        themeMode: gated.spec.themeMode,
        mode: gated.spec.mode,
        camera: gated.spec.camera,
        palette: palette2,
        params: gated.spec.params,
        provenance: gated.spec.provenance,
        caption: gated.caption,
        captionPlacement,
        active,
        renderScene
      }
    );
  }
  const result = validation.result;
  if (!result.ok) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ValidationError,
      {
        title: "Invalid VizSpec",
        messages: result.errors,
        onError
      }
    );
  }
  const { scene, themeMode, mode, camera, provenance, params, palette: paletteHint } = result.spec;
  const caption = requiresHonestyCaption(provenance) ? defaultHonestyCaption(provenance) : null;
  const palette = paletteHint ? getPalette(paletteHint) : activePalette ?? getPalette("crameri");
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    SceneFrame,
    {
      skill: result.spec.skill,
      scene,
      themeMode,
      mode,
      camera,
      palette,
      params,
      provenance,
      caption,
      captionPlacement,
      active,
      renderScene
    }
  );
}
function ValidationError({
  title,
  messages,
  errors,
  onError,
  onInvocationError
}) {
  const contentKey = errors ? JSON.stringify(errors) : messages.join("\n");
  const onErrorRef = (0, import_react2.useRef)(onError);
  const onInvocationErrorRef = (0, import_react2.useRef)(onInvocationError);
  const reportedKeyRef = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    onErrorRef.current = onError;
    onInvocationErrorRef.current = onInvocationError;
  }, [onError, onInvocationError]);
  (0, import_react2.useEffect)(() => {
    if (reportedKeyRef.current === contentKey) return;
    reportedKeyRef.current = contentKey;
    onErrorRef.current?.([...messages]);
    if (errors) onInvocationErrorRef.current?.(errors);
  }, [contentKey]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { role: "alert", "aria-live": "assertive", className: "cortexel-vizspec-error", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "Fix the fields below and validate the visualization again." }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { children: messages.map((message, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("li", { children: message }, `${index}-${message}`)) })
  ] });
}
function SceneFrame({
  skill,
  scene,
  themeMode,
  mode,
  camera,
  palette,
  params,
  provenance,
  caption,
  captionPlacement,
  active,
  renderScene
}) {
  if (mode === "export") {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { role: "status", className: "cortexel-vizspec-export-unsupported", children: "Headless export rendering is not available in this build. Request an interactive render, or use the backend render endpoint once enabled." });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      className: "cortexel-vizspec",
      style: {
        position: "relative",
        width: "100%",
        height: captionPlacement === "footer" ? "auto" : "100%"
      },
      children: [
        renderScene({
          skill,
          scene,
          themeMode,
          active,
          camera,
          palette,
          params: cloneValidatedJson(params),
          provenance: cloneValidatedJson(provenance)
        }),
        caption && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "div",
          {
            className: "cortexel-honesty-caption",
            role: "note",
            "aria-live": "polite",
            "aria-label": "Scientific provenance disclosure",
            style: {
              position: captionPlacement === "footer" ? "relative" : "absolute",
              left: captionPlacement === "footer" ? 0 : 12,
              bottom: captionPlacement === "footer" ? "auto" : 12,
              maxWidth: captionPlacement === "footer" ? "100%" : "70%",
              width: captionPlacement === "footer" ? "100%" : "auto",
              boxSizing: "border-box",
              marginTop: captionPlacement === "footer" ? 8 : 0,
              padding: "4px 10px",
              borderRadius: 6,
              // Okabe-Ito amber on opaque dark — bloom-safe (DOM, not emissive).
              background: "rgba(20,22,28,0.92)",
              color: "#e69f00",
              fontSize: 12,
              lineHeight: 1.4,
              pointerEvents: "none"
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("bdi", { dir: "auto", style: { unicodeBidi: "isolate" }, children: caption })
          }
        )
      ]
    }
  );
}

// react/charts/ReferenceVizSpecFigure.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
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
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    VizSpecRenderer,
    {
      spec,
      skillId,
      active,
      activePalette,
      onError,
      onInvocationError,
      captionPlacement: "footer",
      renderScene: (args) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ReferenceChartScene, { ...args, width, height })
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=charts.cjs.map