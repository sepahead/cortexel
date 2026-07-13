export interface ChartDomain {
  min: number;
  max: number;
}

export interface ChartFrame {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PhasePlaneSample {
  x: number;
  y: number;
  dx: number;
  dy: number;
  index: number;
}

export interface BoundedChartPath {
  path: string;
  sourceSampleCount: number;
  renderedSampleCount: number;
  compacted: boolean;
}

export interface BoundedStemPointPaths {
  stems: string;
  points: string;
  sourceSampleCount: number;
  renderedSampleCount: number;
  compacted: boolean;
}

export const REFERENCE_CHART_DIMENSIONS = Object.freeze({
  width: 960,
  height: 540,
  minWidth: 320,
  minHeight: 240,
  maxDimension: 4096,
});

export function normalizeChartDimension(
  value: number | undefined,
  fallback: number,
  minimum: number,
): number {
  if (!Number.isFinite(value) || value === undefined) return fallback;
  return Math.min(
    REFERENCE_CHART_DIMENSIONS.maxDimension,
    Math.max(minimum, Math.round(value)),
  );
}

export function chartPlotWidth(frame: ChartFrame): number {
  return Math.max(1, frame.width - frame.left - frame.right);
}

export function chartPlotHeight(frame: ChartFrame): number {
  return Math.max(1, frame.height - frame.top - frame.bottom);
}

function paddedSingleton(value: number): ChartDomain {
  if (value === 0) return { min: -1, max: 1 };
  const padding = Math.abs(value) * 0.05;
  const min = value - padding;
  const max = value + padding;
  if (Number.isFinite(min) && Number.isFinite(max) && min < max) {
    return { min, max };
  }
  return value > 0
    ? { min: 0, max: value }
    : { min: value, max: 0 };
}

export function numericDomain(
  values: readonly number[],
  options: { includeZero?: boolean } = {},
): ChartDomain {
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

export function nestedNumericDomain(
  series: readonly (readonly number[])[],
  options: { includeZero?: boolean } = {},
): ChartDomain {
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

export function histogramDomain(
  centers: readonly number[],
  width: number,
): ChartDomain {
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

function unitRatio(value: number, domain: ChartDomain): number {
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

export function scaleToRange(
  value: number,
  domain: ChartDomain,
  start: number,
  end: number,
): number {
  return start + (end - start) * unitRatio(value, domain);
}

export function chartX(value: number, domain: ChartDomain, frame: ChartFrame): number {
  return scaleToRange(value, domain, frame.left, frame.width - frame.right);
}

export function chartY(value: number, domain: ChartDomain, frame: ChartFrame): number {
  return scaleToRange(value, domain, frame.height - frame.bottom, frame.top);
}

function svgNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 1_000) / 1_000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

export function linePath(
  xs: readonly number[],
  ys: readonly number[],
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
): string {
  const count = Math.min(xs.length, ys.length);
  let path = '';
  for (let index = 0; index < count; index++) {
    const x = chartX(xs[index], xDomain, frame);
    const y = chartY(ys[index], yDomain, frame);
    path += `${index === 0 ? 'M' : 'L'}${svgNumber(x)} ${svgNumber(y)}`;
  }
  return path;
}

export function sortedLinePath(
  xs: readonly number[],
  ys: readonly number[],
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
): string {
  const pairs = new Array<{ x: number; y: number; order: number }>(
    Math.min(xs.length, ys.length),
  );
  for (let index = 0; index < pairs.length; index++) {
    pairs[index] = { x: xs[index], y: ys[index], order: index };
  }
  pairs.sort((left, right) => left.x - right.x || left.order - right.order);
  let path = '';
  for (let index = 0; index < pairs.length; index++) {
    const x = chartX(pairs[index].x, xDomain, frame);
    const y = chartY(pairs[index].y, yDomain, frame);
    path += `${index === 0 ? 'M' : 'L'}${svgNumber(x)} ${svgNumber(y)}`;
  }
  return path;
}

export function pointPath(
  xs: readonly number[],
  ys: readonly number[],
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
  radius = 3,
): string {
  const count = Math.min(xs.length, ys.length);
  let path = '';
  for (let index = 0; index < count; index++) {
    const x = chartX(xs[index], xDomain, frame);
    const y = chartY(ys[index], yDomain, frame);
    path += `M${svgNumber(x - radius)} ${svgNumber(y)}a${radius} ${radius} 0 1 0 ${
      svgNumber(radius * 2)
    } 0a${radius} ${radius} 0 1 0 ${svgNumber(-radius * 2)} 0`;
  }
  return path;
}

/** Select a bounded, order-preserving view of a long numeric series. The first
 * and last samples are retained and every interior bucket contributes its exact
 * minimum and maximum in source order. This makes visual compaction explicit
 * without averaging, smoothing, or inventing intermediate measurements. */
export function boundedExtremaIndices(
  values: readonly number[],
  maximumSamples: number,
): number[] {
  const count = values.length;
  if (count === 0) return [];
  const maximum = Number.isFinite(maximumSamples)
    ? Math.max(2, Math.floor(maximumSamples))
    : 2;
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

/** Literal binned-rate geometry. Adjacent retained bins are connected only with
 * horizontal/vertical step commands. When a large source series is compacted,
 * non-adjacent retained extrema start new subpaths, so the renderer never claims
 * that one retained value persisted through omitted bins. */
export function binnedStepPath(
  centers: readonly number[],
  values: readonly number[],
  binWidth: number,
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
  maximumSamples = 4_096,
): BoundedChartPath {
  const sourceSampleCount = Math.min(centers.length, values.length);
  if (sourceSampleCount === 0) {
    return { path: '', sourceSampleCount, renderedSampleCount: 0, compacted: false };
  }
  const indices = boundedExtremaIndices(
    values.slice(0, sourceSampleCount),
    maximumSamples,
  );
  const compacted = indices.length < sourceSampleCount;
  let path = '';
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
    compacted,
  };
}

/** One literal stem per binned statistic, anchored at the true zero baseline.
 * Values are never connected, interpolated, mirrored, or made symmetric. */
export function stemPath(
  xs: readonly number[],
  ys: readonly number[],
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
): string {
  const count = Math.min(xs.length, ys.length);
  const baseline = chartY(0, yDomain, frame);
  let path = '';
  for (let index = 0; index < count; index++) {
    const x = chartX(xs[index], xDomain, frame);
    const y = chartY(ys[index], yDomain, frame);
    path += `M${svgNumber(x)} ${svgNumber(baseline)}V${svgNumber(y)}`;
  }
  return path;
}

/** Bounded correlogram marks. Long inputs retain exact first/last and bucket
 * extrema in source order; every retained value remains an independent
 * zero-anchored stem and point, so omitted bins cannot be bridged or mirrored. */
export function boundedStemPointPaths(
  xs: readonly number[],
  ys: readonly number[],
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
  maximumSamples = 4_096,
  radius = 2.75,
): BoundedStemPointPaths {
  const sourceSampleCount = Math.min(xs.length, ys.length);
  if (sourceSampleCount === 0) {
    return {
      stems: '',
      points: '',
      sourceSampleCount,
      renderedSampleCount: 0,
      compacted: false,
    };
  }
  const indices = boundedExtremaIndices(ys.slice(0, sourceSampleCount), maximumSamples);
  const baseline = chartY(0, yDomain, frame);
  let stems = '';
  let points = '';
  for (let outputIndex = 0; outputIndex < indices.length; outputIndex++) {
    const index = indices[outputIndex];
    const x = chartX(xs[index], xDomain, frame);
    const y = chartY(ys[index], yDomain, frame);
    stems += `M${svgNumber(x)} ${svgNumber(baseline)}V${svgNumber(y)}`;
    points += `M${svgNumber(x - radius)} ${svgNumber(y)}a${radius} ${radius} 0 1 0 ${
      svgNumber(radius * 2)
    } 0a${radius} ${radius} 0 1 0 ${svgNumber(-radius * 2)} 0`;
  }
  return {
    stems,
    points,
    sourceSampleCount,
    renderedSampleCount: indices.length,
    compacted: indices.length < sourceSampleCount,
  };
}

export function rasterTickPath(
  times: readonly number[],
  senders: readonly number[],
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
  halfHeight = 3,
): string {
  const count = Math.min(times.length, senders.length);
  let path = '';
  for (let index = 0; index < count; index++) {
    const x = chartX(times[index], xDomain, frame);
    const y = chartY(senders[index], yDomain, frame);
    path += `M${svgNumber(x)} ${svgNumber(y - halfHeight)}V${svgNumber(y + halfHeight)}`;
  }
  return path;
}

export function histogramBarPath(
  centers: readonly number[],
  values: readonly number[],
  binWidth: number,
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
): string {
  const count = Math.min(centers.length, values.length);
  const baseline = chartY(0, yDomain, frame);
  let path = '';
  for (let index = 0; index < count; index++) {
    const left = chartX(centers[index] - binWidth / 2, xDomain, frame);
    const right = chartX(centers[index] + binWidth / 2, xDomain, frame);
    const top = chartY(values[index], yDomain, frame);
    path += `M${svgNumber(left)} ${svgNumber(baseline)}H${svgNumber(right)}V${
      svgNumber(top)
    }H${svgNumber(left)}Z`;
  }
  return path;
}

export function phasePlaneSamples(
  axisOrder: readonly [string, string],
  grid: Readonly<Record<string, readonly number[]>>,
  derivatives: Readonly<Record<string, readonly number[]>>,
): PhasePlaneSample[] {
  const [xAxis, yAxis] = axisOrder;
  const xs = grid[xAxis] ?? [];
  const ys = grid[yAxis] ?? [];
  const dx = derivatives[xAxis] ?? [];
  const dy = derivatives[yAxis] ?? [];
  const samples = new Array<PhasePlaneSample>(xs.length * ys.length);
  let outputIndex = 0;
  for (let xIndex = 0; xIndex < xs.length; xIndex++) {
    for (let yIndex = 0; yIndex < ys.length; yIndex++) {
      const index = xIndex * ys.length + yIndex;
      samples[outputIndex++] = {
        x: xs[xIndex],
        y: ys[yIndex],
        dx: dx[index] ?? 0,
        dy: dy[index] ?? 0,
        index,
      };
    }
  }
  return samples;
}

function normalizedDerivative(value: number, domain: ChartDomain): number {
  const spanScale = Math.max(Math.abs(domain.min), Math.abs(domain.max), 1);
  const span = domain.max / spanScale - domain.min / spanScale;
  if (!Number.isFinite(value) || !Number.isFinite(span) || span <= 0) return 0;
  return value / spanScale / span;
}

export function phasePlaneArrowPath(
  samples: readonly PhasePlaneSample[],
  xDomain: ChartDomain,
  yDomain: ChartDomain,
  frame: ChartFrame,
): string {
  const maxLength = Math.max(
    4,
    Math.min(chartPlotWidth(frame), chartPlotHeight(frame)) / 24,
  );
  let path = '';
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
    path += `M${svgNumber(startX)} ${svgNumber(startY)}L${svgNumber(endX)} ${
      svgNumber(endY)
    }M${svgNumber(endX)} ${svgNumber(endY)}L${svgNumber(backX + perpendicularX)} ${
      svgNumber(backY + perpendicularY)
    }M${svgNumber(endX)} ${svgNumber(endY)}L${svgNumber(backX - perpendicularX)} ${
      svgNumber(backY - perpendicularY)
    }`;
  }
  return path;
}

export function tickValues(domain: ChartDomain, count = 5): number[] {
  const safeCount = Math.max(2, Math.min(12, Math.floor(count)));
  const scale = Math.max(Math.abs(domain.min), Math.abs(domain.max), 1);
  const scaledMin = domain.min / scale;
  const scaledMax = domain.max / scale;
  const ticks = new Array<number>(safeCount);
  for (let index = 0; index < safeCount; index++) {
    const ratio = index / (safeCount - 1);
    const value = (scaledMin * (1 - ratio) + scaledMax * ratio) * scale;
    ticks[index] = Object.is(value, -0) ? 0 : value;
  }
  return ticks;
}

export function formatChartNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  if (magnitude >= 10_000 || magnitude < 0.001) return value.toExponential(2);
  if (magnitude >= 100) return value.toFixed(0);
  if (magnitude >= 10) return value.toFixed(1).replace(/\.0$/, '');
  return value.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}
