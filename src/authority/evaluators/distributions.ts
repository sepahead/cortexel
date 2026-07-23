/**
 * Request-only OutputAuthority evaluators for distributions, binned event views,
 * correlograms, and rasters.
 *
 * Independence boundary: this module reads only the validated canonical request. It
 * does not import a figure compiler, RenderPlan, artifact, receipt, adapter, generated
 * catalog, or `src/analysis` derivation. The small shared trust base is limited to the
 * registered-unit exact arithmetic, exact binary64 rounding, canonical JSON, and the
 * source-owned bin materializers in `core/`.
 */

import {
  materializeCenteredLagBins,
  materializeWidthBins,
} from '../../core/binning.js';
import { canonicalize } from '../../core/canonicalize.js';
import {
  exactBinary64Mean,
  exactBinary64Sum,
  exactRationalToBinary64,
} from '../../core/exact-binary64.js';
import type {
  AuthorityCellV1,
  AuthorityDerivationValueV1,
  AuthorityGeometryEntryV1,
  AuthoritySummaryScalarV1,
  RegisteredAuthorityEvaluatorV1,
} from '../../core/output-authority.js';
import type { DisclosureFacts } from '../../core/disclosures.js';
import type { JsonValue } from '../../core/parse-json.js';
import {
  compareExactUnitSumToValue,
  convert,
  convertDifference,
  convertExactUnitSum,
  conversionReceipt,
  deriveExactAggregateCountRateOverIntervalsInUnit,
  deriveExactCountRateInUnit,
  deriveExactCountRateMinusAggregateRateOverIntervalsInUnit,
  deriveExactCountRateWithIntegerFactorsInUnit,
  divideExactIntegerByConvertedDifference,
  reciprocalUnit,
} from '../../core/units.js';
import {
  authorityEvaluatorId,
  carrier,
  defineAuthorityEvaluator,
  disclosureFactMap,
  geometrySequence,
  rowSequence,
  summaryFactMap,
} from './model.js';

type JsonRecord = Record<string, JsonValue>;
type Cell = AuthorityCellV1;
type Summary = Readonly<Record<string, AuthoritySummaryScalarV1>>;

interface AuthorityModel {
  readonly rows: readonly (readonly Cell[])[];
  readonly geometry: readonly AuthorityGeometryEntryV1[];
  readonly summary: Summary;
  readonly disclosures: Readonly<DisclosureFacts>;
}

interface Bins {
  readonly edges: readonly number[];
  readonly unit: string;
  readonly finalEdgeInclusive: boolean;
}

interface HistogramGroup {
  readonly id: string;
  readonly counts: readonly number[];
  readonly values: readonly number[];
  readonly connectionCount: number;
  readonly observationCount: number;
  readonly binnedObservationCount: number;
  readonly underRangeCount: number;
  readonly overRangeCount: number;
  readonly missingMeasurementCount: number;
  readonly missingObservationCount: number;
  readonly zeroObservationCount: number;
}

// Source skill contracts currently cap complete returned tables at 500 rows.  The
// evaluator is called only after render-budget preflight; retaining the same hard
// ceiling here prevents a direct evaluator caller from turning one giant supplied
// degree into an unbounded dense histogram allocation.
const MAX_DISTRIBUTION_AUTHORITY_ROWS = 500;

let DELAY_AUTHORITY: RegisteredAuthorityEvaluatorV1;
let WEIGHT_AUTHORITY: RegisteredAuthorityEvaluatorV1;
let ISI_AUTHORITY: RegisteredAuthorityEvaluatorV1;
let CORRELOGRAM_AUTHORITY: RegisteredAuthorityEvaluatorV1;
let PSTH_AUTHORITY: RegisteredAuthorityEvaluatorV1;

function record(value: JsonValue | undefined): JsonRecord {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: JsonValue | undefined): JsonValue[] {
  return Array.isArray(value) ? value : [];
}

function numbers(value: JsonValue | undefined): number[] {
  return array(value).map(Number);
}

function nullableNumbers(value: JsonValue | undefined): (number | null)[] {
  return array(value).map((entry) => entry === null ? null : Number(entry));
}

function strings(value: JsonValue | undefined): string[] {
  return array(value).map(String);
}

function exactText(value: number | bigint): string {
  if (typeof value === 'bigint') return value.toString(10);
  return value === 0 ? '0' : String(value);
}

/**
 * Request-sized arrays must never be expanded into a variadic Math call: a fully
 * contract-valid array can exceed the JavaScript engine's argument-count limit.
 */
function finiteExtrema(values: readonly number[]): { readonly min: number; readonly max: number } | null {
  if (values.length === 0) return null;
  let min = values[0];
  let max = values[0];
  for (let index = 1; index < values.length; index++) {
    const value = values[index];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function maximumNonnegativeInteger(values: readonly number[]): number {
  let maximum = 0;
  for (const value of values) {
    if (value > maximum) maximum = value;
  }
  return maximum;
}

function structuredCell(value: JsonValue | undefined): string {
  return value === undefined ? 'unknown' : canonicalize(value);
}

/** Closed, bounded NetworkScope projection for distribution authority. */
function distributionScopeSummaryCell(value: JsonValue | undefined): string {
  const scope = record(value);
  const summary: JsonRecord = { kind: String(scope.kind) };
  if (scope.snapshotTime !== undefined) summary.snapshotTime = scope.snapshotTime;
  switch (scope.kind) {
    case 'single_process':
      break;
    case 'global_merged':
      summary.mergedRanksCoverage = 'all_ranks_0_through_worldSize_minus_1';
      summary.worldSize = scope.worldSize!;
      break;
    case 'mpi_target_rank_local':
      summary.localTargetUniverseComplete = scope.localTargetUniverseComplete!;
      summary.rank = scope.rank!;
      summary.worldSize = scope.worldSize!;
      break;
    case 'sampled':
      summary.method = scope.method!;
      summary.parentScope = scope.parentScope!;
      summary.retainedConnectionCount = scope.retainedConnectionCount!;
      summary.sourceConnectionCount = scope.sourceConnectionCount!;
      break;
    default:
      throw new Error(`unsupported NetworkScope kind ${String(scope.kind)}`);
  }
  return canonicalize(summary);
}

function compareIdentifiers(left: string, right: string): number {
  const a = left[Symbol.iterator]();
  const b = right[Symbol.iterator]();
  while (true) {
    const x = a.next();
    const y = b.next();
    if (x.done || y.done) {
      if (x.done && y.done) return 0;
      return x.done ? -1 : 1;
    }
    const xc = x.value.codePointAt(0)!;
    const yc = y.value.codePointAt(0)!;
    if (xc !== yc) return xc < yc ? -1 : 1;
  }
}

function tupleKey(parts: readonly string[]): string {
  return JSON.stringify(parts);
}

function finalEdgeInclusive(node: JsonRecord): boolean {
  if (typeof node.finalEdgeInclusive === 'boolean') return node.finalEdgeInclusive;
  return node.boundary === '[lo,hi]' || node.boundary === '[start,stop]';
}

function binsFrom(nodeValue: JsonValue | undefined, fallbackUnit?: string): Bins {
  const node = record(nodeValue);
  const unit = typeof node.unit === 'string' ? node.unit : fallbackUnit;
  if (!unit) throw new Error('authority evaluator requires a declared bin unit');
  if (node.mode === 'edges' || Array.isArray(node.edges)) {
    const edges = numbers(node.edges);
    if (edges.length < 2) throw new Error('authority evaluator requires at least two edges');
    return { edges, unit, finalEdgeInclusive: finalEdgeInclusive(node) };
  }
  const materialized = materializeWidthBins(
    Number(node.start),
    Number(node.stop),
    Number(node.width),
  );
  if (!materialized.ok) {
    throw new Error(`authority evaluator cannot materialize bins (${materialized.reason})`);
  }
  return {
    edges: materialized.edges,
    unit,
    finalEdgeInclusive: finalEdgeInclusive(node),
  };
}

function sameUnitWidth(lower: number, upper: number, unit: string): number {
  try {
    return convertDifference(lower, upper, unit, unit);
  } catch {
    const width = upper - lower;
    if (!Number.isFinite(width) || !(width > 0)) {
      throw new Error(`bin in ${unit} has no positive finite width`);
    }
    return width;
  }
}

function converted(value: number, from: string, to: string): number {
  return from === to ? value : convert(value, from, to);
}

function ordinaryBinIndex(
  value: number,
  valueUnit: string,
  bins: Bins,
  edgeToleranceUlps = 0,
): number {
  const candidate = converted(value, valueUnit, bins.unit);
  const compare = (edge: number): -1 | 0 | 1 => {
    const tolerance = edgeToleranceUlps * Number.EPSILON * Math.max(
      Number.MIN_VALUE,
      Math.abs(candidate),
      Math.abs(edge),
    );
    return Math.abs(candidate - edge) <= tolerance ? 0 : candidate < edge ? -1 : 1;
  };
  const last = bins.edges.length - 1;
  if (compare(bins.edges[0]) < 0) return -1;
  const againstLast = compare(bins.edges[last]);
  if (againstLast > 0 || (againstLast === 0 && !bins.finalEdgeInclusive)) return -1;
  if (againstLast === 0) return last - 1;
  let low = 0;
  let high = last;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    if (compare(bins.edges[middle]) >= 0) low = middle;
    else high = middle - 1;
  }
  return low;
}

function normalizedHistogramValues(
  counts: readonly number[],
  bins: Bins,
  normalization: string,
): number[] {
  if (normalization === 'count') return [...counts];
  const total = counts.reduce((sum, count) => sum + BigInt(count), 0n);
  if (total <= 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('normalized histogram has no positive safe-integer denominator');
  }
  if (normalization === 'probability') {
    return counts.map((count) => exactRationalToBinary64(BigInt(count), total));
  }
  const denominator = Number(total);
  return counts.map((count, index) => divideExactIntegerByConvertedDifference(
    count,
    denominator,
    bins.edges[index],
    bins.edges[index + 1],
    bins.unit,
    bins.unit,
  ));
}

function recoverCounts(
  values: readonly number[],
  bins: Bins,
  normalization: string,
  total: number,
): number[] {
  if (normalization === 'count') return values.map((value) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('count is not exact');
    return value;
  });
  const output = values.map((value, index) => {
    const estimate = normalization === 'probability'
      ? value * total
      : value * total * sameUnitWidth(bins.edges[index], bins.edges[index + 1], bins.unit);
    const candidates = new Set<number>();
    for (let offset = -3; offset <= 3; offset++) {
      candidates.add(Math.floor(estimate) + offset);
      candidates.add(Math.ceil(estimate) + offset);
    }
    const matches = [...candidates].filter((candidate) => {
      if (!Number.isSafeInteger(candidate) || candidate < 0 || candidate > total) return false;
      const expected = normalization === 'probability'
        ? exactRationalToBinary64(BigInt(candidate), BigInt(total))
        : divideExactIntegerByConvertedDifference(
          candidate,
          total,
          bins.edges[index],
          bins.edges[index + 1],
          bins.unit,
          bins.unit,
        );
      return Object.is(expected, value);
    });
    if (matches.length !== 1) throw new Error('normalized bin does not identify one count');
    return matches[0];
  });
  if (output.reduce((sum, count) => sum + count, 0) !== total) {
    throw new Error('recovered counts do not conserve the declared total');
  }
  return output;
}

function conversionDisclosure(label: string, from: string, to: string): string {
  const receipt = conversionReceipt(from, to);
  return `${label}: ${from} -> ${to} (factor ${receipt.factor})`;
}

function baseDisclosureFacts(
  request: JsonRecord,
  extra: Partial<DisclosureFacts> = {},
): DisclosureFacts {
  const source = record(request.source);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const scope = record(data.scope);
  const nodeUniverse = record(data.nodeUniverse);
  const uncertainty = record(parameters.uncertainty ?? data.uncertainty);
  return {
    sourceKind: typeof source.kind === 'string' ? source.kind : 'unknown',
    sourceAuthenticityVerified: false,
    referenceComparisonRun: false,
    callerNotePresent: typeof source.declaredNote === 'string',
    uncertaintyKind: typeof uncertainty.kind === 'string' ? uncertainty.kind : 'none',
    uncertaintyReason: typeof uncertainty.reason === 'string'
      ? uncertainty.reason
      : 'not_provided',
    ...(typeof scope.kind === 'string' ? { scopeKind: scope.kind } : {}),
    ...(typeof scope.rank === 'number' ? { rank: scope.rank } : {}),
    ...(typeof scope.worldSize === 'number' ? { worldSize: scope.worldSize } : {}),
    ...(typeof scope.retainedConnectionCount === 'number'
      ? {
        retainedConnectionCount: scope.retainedConnectionCount,
        sampledRetained: scope.retainedConnectionCount,
      }
      : {}),
    ...(typeof scope.sourceConnectionCount === 'number'
      ? {
        sourceConnectionCount: scope.sourceConnectionCount,
        sampledSource: scope.sourceConnectionCount,
      }
      : {}),
    ...(typeof nodeUniverse.complete === 'boolean'
      ? { nodeUniverseComplete: nodeUniverse.complete }
      : {}),
    ...extra,
  };
}

function modelFields(
  model: AuthorityModel,
): Readonly<Record<string, AuthorityDerivationValueV1>> {
  return {
    'table.rows': rowSequence(model.rows),
    'geometry.sequence': geometrySequence(model.geometry),
    'summary.facts': summaryFactMap(model.summary),
    'disclosure.facts': disclosureFactMap(model.disclosures),
  };
}

function binCarriers(
  groups: readonly { readonly id: string; readonly counts: readonly number[] }[],
  bins: Bins,
): AuthorityGeometryEntryV1[] {
  return groups.flatMap((group) => group.counts.map((_count, binIndex) => carrier('bins', {
    groupId: group.id,
    binIndex,
    binStart: bins.edges[binIndex],
    binEnd: bins.edges[binIndex + 1],
  })));
}

function degreeModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const universe = strings(record(data.nodeUniverse).ids);
  const direction = String(parameters.direction);
  const countingPolicy = String(parameters.countingPolicy);
  const autapsePolicy = String(parameters.autapsePolicy);
  const normalization = String(parameters.normalization);
  let degrees: number[];
  let countedConnectionCount: number;
  let countedIncidenceCount: number;
  let excludedAutapseCount = 0;

  if (data.mode === 'node_degrees') {
    const declared = record(data.nodeDegrees);
    const byId = new Map(strings(declared.nodeIds).map((id, index) => [id, numbers(declared.degrees)[index]]));
    degrees = universe.map((id) => {
      const value = byId.get(id);
      if (value === undefined) throw new Error('degree authority lost a declared node');
      return value;
    });
    countedConnectionCount = Number(data.countedConnectionCount);
    countedIncidenceCount = Number(data.countedIncidenceCount);
    excludedAutapseCount = typeof data.excludedAutapseCount === 'number'
      ? data.excludedAutapseCount
      : 0;
  } else {
    const connections = record(data.connections);
    const sources = strings(connections.sourceIds);
    const targets = strings(connections.targetIds);
    const index = new Map(universe.map((id, ordinal) => [id, ordinal]));
    degrees = universe.map(() => 0);
    const neighbours = universe.map(() => new Set<string>());
    countedConnectionCount = 0;
    for (let ordinal = 0; ordinal < sources.length; ordinal++) {
      if (sources[ordinal] === targets[ordinal] && autapsePolicy === 'exclude') {
        excludedAutapseCount++;
        continue;
      }
      countedConnectionCount++;
      const id = direction === 'in' ? targets[ordinal] : sources[ordinal];
      const counterpart = direction === 'in' ? sources[ordinal] : targets[ordinal];
      const owner = index.get(id);
      if (owner === undefined) throw new Error('connection endpoint is outside degree universe');
      if (countingPolicy === 'count_unique_neighbors') neighbours[owner].add(counterpart);
      else degrees[owner]++;
    }
    if (countingPolicy === 'count_unique_neighbors') {
      degrees = neighbours.map((entry) => entry.size);
    }
    countedIncidenceCount = degrees.reduce((sum, degree) => sum + degree, 0);
  }

  // Canonical science validation binds degrees to exact incidence and universe
  // identities; the explicit authority-row ceiling below supplies the allocation bound.
  const maximum = maximumNonnegativeInteger(degrees);
  if (maximum + 1 > MAX_DISTRIBUTION_AUTHORITY_ROWS) {
    throw new Error(
      `degree authority requires ${maximum + 1} rows, over its ${MAX_DISTRIBUTION_AUTHORITY_ROWS}-row contract budget`,
    );
  }
  const nodeCounts = new Array<number>(maximum + 1).fill(0);
  for (const degree of degrees) nodeCounts[degree]++;
  const probabilities = nodeCounts.map((count) =>
    exactRationalToBinary64(BigInt(count), BigInt(universe.length)));
  const rows = nodeCounts.map((count, degree): Cell[] => [
    degree,
    degree,
    count,
    normalization === 'probability' ? probabilities[degree] : null,
    universe.length,
    countedConnectionCount,
    countedIncidenceCount,
    '1',
  ]);
  const groups = [{ id: 'all', counts: nodeCounts }];
  const degreeEdges = new Array<number>(nodeCounts.length + 1);
  degreeEdges[0] = -0.5;
  for (let degree = 0; degree < nodeCounts.length; degree++) {
    degreeEdges[degree + 1] = degree + 0.5;
  }
  const scopeSummary = distributionScopeSummaryCell(data.scope);
  return {
    rows,
    geometry: binCarriers(groups, {
      edges: degreeEdges,
      unit: '1',
      finalEdgeInclusive: true,
    }),
    summary: {
      direction,
      selectionLabel: String(parameters.selectionLabel ?? parameters.selectionId),
      countingPolicy,
      autapsePolicy,
      excludedAutapseStatement: autapsePolicy === 'exclude'
        ? ` (${excludedAutapseCount} excluded)`
        : '',
      universeNodeCount: exactText(universe.length),
      scopeStatement: scopeSummary,
      countedConnectionCount: exactText(countedConnectionCount),
      countedIncidenceCount: exactText(countedIncidenceCount),
      minDegree: '0',
      maxDegree: exactText(maximum),
      zeroDegreeNodeCount: exactText(nodeCounts[0]),
      normalization,
    },
    disclosures: baseDisclosureFacts(request, {
      ...(countingPolicy === 'count_unique_neighbors' && countedIncidenceCount < countedConnectionCount
        ? {
          multapseAggregated: true,
          multapseAggregation: 'count_unique_neighbors',
        }
        : {}),
    }),
  };
}

const DEGREE_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('network.degree_distribution', 2),
  (request) => modelFields(degreeModel(request)),
);

function populationRateModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const normalization = String(parameters.normalization);
  let bins: Bins;
  let counts: number[];
  let recordedSenderCount: number;
  let sourceEventCount: number;
  let eventTimeConversion: string | undefined;
  let suppliedRateConversion: string | undefined;
  if (data.mode === 'events') {
    bins = binsFrom(parameters.bins);
    const eventTimes = record(data.eventTimes);
    const eventUnit = String(eventTimes.unit);
    counts = new Array<number>(bins.edges.length - 1).fill(0);
    for (const value of numbers(eventTimes.values)) {
      const index = ordinaryBinIndex(value, eventUnit, bins);
      if (index < 0) throw new Error('population-rate event is outside declared bins');
      counts[index]++;
    }
    recordedSenderCount = strings(data.recordedSenderIds).length;
    sourceEventCount = numbers(eventTimes.values).length;
    if (eventUnit !== bins.unit) {
      eventTimeConversion = conversionDisclosure('population-rate event times', eventUnit, bins.unit);
    }
  } else {
    const edgeRecord = record(data.binEdges);
    bins = { edges: numbers(edgeRecord.edges), unit: String(edgeRecord.unit), finalEdgeInclusive: false };
    counts = numbers(data.counts);
    recordedSenderCount = strings(data.recordedSenderIds).length;
    sourceEventCount = Number(data.sourceEventCount);
    const suppliedRates = record(data.rates);
    const suppliedRateUnit = typeof suppliedRates.unit === 'string'
      ? suppliedRates.unit
      : undefined;
    if (suppliedRateUnit !== undefined && suppliedRateUnit !== 'Hz') {
      suppliedRateConversion = conversionDisclosure(
        'supplied population rates',
        suppliedRateUnit,
        'Hz',
      );
    }
  }
  const rateDivisor = normalization === 'mean_rate_per_recorded_sender'
    ? recordedSenderCount
    : 1;
  const widths = counts.map((_count, index) => sameUnitWidth(
    bins.edges[index],
    bins.edges[index + 1],
    bins.unit,
  ));
  const rates = counts.map((count, index) => divideExactIntegerByConvertedDifference(
    count,
    rateDivisor,
    bins.edges[index],
    bins.edges[index + 1],
    bins.unit,
    's',
  ));
  const rows = counts.map((count, index): Cell[] => [
    bins.edges[index],
    bins.edges[index + 1],
    widths[index],
    count,
    recordedSenderCount,
    rates[index],
    'Hz',
  ]);
  const geometry = counts.map((_count, binIndex) => carrier('bins', {
    binIndex,
    binStart: bins.edges[binIndex],
    binEnd: bins.edges[binIndex + 1],
  }));
  const window = record(data.window);
  const rateExtent = finiteExtrema(rates);
  if (rateExtent === null) throw new Error('population-rate bins unexpectedly empty');
  const unitConversions = [
    ...(eventTimeConversion ? [eventTimeConversion] : []),
    ...(bins.unit !== 's'
      ? [conversionDisclosure('population-rate bin widths', bins.unit, 's')]
      : []),
    ...(suppliedRateConversion ? [suppliedRateConversion] : []),
  ];
  return {
    rows,
    geometry,
    summary: {
      populationLabel: String(parameters.populationLabel ?? parameters.populationId),
      windowStart: exactText(Number(window.start)),
      windowStop: exactText(Number(window.stop)),
      timeUnit: String(window.unit),
      binCount: exactText(counts.length),
      eventCount: exactText(sourceEventCount),
      recordedSenderCount: exactText(recordedSenderCount),
      normalization,
      rateMin: exactText(rateExtent.min),
      rateMax: exactText(rateExtent.max),
    },
    disclosures: baseDisclosureFacts(request, {
      ...(data.mode === 'prebinned' ? { preBinned: true } : {}),
      ...(unitConversions.length > 0 ? { unitConversions } : {}),
    }),
  };
}

const POPULATION_RATE_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.population_rate', 2),
  (request) => modelFields(populationRateModel(request)),
);

interface RasterPartition {
  readonly times: readonly number[];
  readonly timeUnit: string;
  readonly windowUnit: string;
  readonly boundary: string;
  readonly inWindow: readonly boolean[];
  readonly displayStart: number;
  readonly displayStop: number;
  readonly excludedCount: number;
}

function rasterPartition(data: JsonRecord): RasterPartition {
  const eventTimes = record(data.eventTimes);
  const window = record(data.window);
  const times = numbers(eventTimes.values);
  const timeUnit = String(eventTimes.unit);
  const windowUnit = String(window.unit);
  const nest = window.kind === 'nest_recording_device_origin_relative';
  const lower = nest
    ? [
      { value: Number(window.origin), unit: windowUnit },
      { value: Number(window.start), unit: windowUnit },
    ]
    : [{ value: Number(window.start), unit: windowUnit }];
  const upper = nest
    ? [
      { value: Number(window.origin), unit: windowUnit },
      { value: Number(window.stop), unit: windowUnit },
    ]
    : [{ value: Number(window.stop), unit: windowUnit }];
  const boundary = nest ? '(origin+start,origin+stop]' : String(window.boundary);
  const openStart = boundary.startsWith('(');
  const closedStop = boundary.endsWith(']');
  const inWindow = times.map((time) => {
    const event = { value: time, unit: timeUnit };
    const lowerVsEvent = compareExactUnitSumToValue(lower, event);
    const upperVsEvent = compareExactUnitSumToValue(upper, event);
    return !(openStart ? lowerVsEvent >= 0 : lowerVsEvent > 0) &&
      !(closedStop ? upperVsEvent < 0 : upperVsEvent <= 0);
  });
  return {
    times,
    timeUnit,
    windowUnit,
    boundary,
    inWindow,
    displayStart: convertExactUnitSum(lower, timeUnit),
    displayStop: convertExactUnitSum(upper, timeUnit),
    excludedCount: inWindow.filter((accepted) => !accepted).length,
  };
}

function rasterModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const partition = rasterPartition(data);
  const senders = strings(data.eventSenderIds);
  const recorded = strings(data.recordedSenderIds);
  const eventTrials = Array.isArray(data.eventTrialIds) ? strings(data.eventTrialIds) : undefined;
  const trials = strings(data.trialIds);
  const suppliedEventIds = Array.isArray(data.eventIds) ? strings(data.eventIds) : undefined;
  const populations = strings(data.senderPopulationIds);
  const populationBySender = new Map(recorded.map((sender, index) => [sender, populations[index]]));
  let orderedSenders = [...recorded];
  if (parameters.rowOrder === 'canonical_sender_id') {
    orderedSenders.sort(compareIdentifiers);
  } else if (parameters.rowOrder === 'grouped_by_population' && populations.length > 0) {
    const groups = new Map<string, string[]>();
    for (const sender of recorded) {
      const population = populationBySender.get(sender);
      if (population === undefined) continue;
      const members = groups.get(population);
      if (members) members.push(sender);
      else groups.set(population, [sender]);
    }
    orderedSenders = [...groups.values()].flat();
  }
  const rowKey = (sender: string, trial: string | null): string => JSON.stringify([sender, trial]);
  const rasterRows = orderedSenders.flatMap((sender) =>
    (eventTrials ? trials : [null]).map((trial) => ({
      key: rowKey(sender, trial),
      label: trial === null ? sender : `${sender} / ${trial}`,
    })));
  const rowIndex = new Map(rasterRows.map((row, index) => [row.key, index]));
  const rowLabel = new Map(rasterRows.map((row) => [row.key, row.label]));
  const events = partition.times.map((time, sourceOrdinal) => {
    const senderId = senders[sourceOrdinal];
    const trialId = eventTrials?.[sourceOrdinal] ?? null;
    const key = rowKey(senderId, trialId);
    return {
      sourceOrdinal,
      eventId: suppliedEventIds?.[sourceOrdinal] ?? `source-ordinal-${sourceOrdinal}`,
      time,
      timeUnit: partition.timeUnit,
      senderId,
      trialId,
      populationId: populationBySender.get(senderId) ?? null,
      rowKey: key,
      rowIndex: rowIndex.get(key)!,
      rowLabel: rowLabel.get(key)!,
      inWindow: partition.inWindow[sourceOrdinal],
    };
  }).sort((left, right) =>
    left.time - right.time || left.rowIndex - right.rowIndex || left.sourceOrdinal - right.sourceOrdinal);
  const rows = events.map((event): Cell[] => [
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
  ]);
  const geometry = events.flatMap((event) => event.inWindow
    ? [carrier('events', {
      sourceOrdinal: event.sourceOrdinal,
      eventId: event.eventId,
      senderId: event.senderId,
      trialId: event.trialId,
      rowKey: event.rowKey,
    })]
    : []);
  const active = new Set(events.filter((event) => event.inWindow).map((event) => event.senderId));
  const accepted = events.length - partition.excludedCount;
  return {
    rows,
    geometry,
    summary: {
      eventCount: exactText(events.length),
      excludedCount: exactText(partition.excludedCount),
      activeSenderCount: exactText(active.size),
      recordedSenderCount: exactText(recorded.length),
      trialCount: exactText(eventTrials ? trials.length : 1),
      windowStart: exactText(partition.displayStart),
      windowStop: exactText(partition.displayStop),
      timeUnit: partition.timeUnit,
      windowBoundary: partition.boundary,
      timeBase: String(data.timeBase),
      rowCount: exactText(rasterRows.length),
      rowOrder: String(parameters.rowOrder),
      senderUniverseComplete: String(data.senderUniverseComplete),
      markCount: exactText(accepted),
    },
    disclosures: baseDisclosureFacts(request, {
      ...(partition.excludedCount > 0 ? { excludedOutOfWindow: partition.excludedCount } : {}),
      ...(partition.windowUnit !== partition.timeUnit
        ? {
          unitConversions: [conversionDisclosure(
            'spike-raster window endpoints',
            partition.windowUnit,
            partition.timeUnit,
          )],
        }
        : {}),
      ...(record(data.window).kind === 'nest_recording_device_origin_relative'
        ? { nestSerializedClock: true }
        : {}),
    }),
  };
}

const RASTER_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.spike_raster', 2),
  (request) => modelFields(rasterModel(request)),
);

function aggregate(values: readonly number[], method: string): number {
  const ordered = [...values].sort((left, right) => left - right);
  if (ordered.length === 0) throw new Error('cannot aggregate an empty ordered pair');
  if (method === 'no_aggregation') {
    if (ordered.length !== 1) throw new Error('no_aggregation encountered a multapse');
    return ordered[0];
  }
  if (method === 'sum') return exactBinary64Sum(ordered);
  if (method === 'mean') return exactBinary64Mean(ordered);
  if (method === 'min') return ordered[0];
  if (method === 'max') return ordered[ordered.length - 1];
  throw new Error(`unknown aggregation ${method}`);
}

function histogramGroup(
  id: string,
  observations: readonly number[],
  bins: Bins,
  normalization: string,
  connectionCount: number,
  missingMeasurementCount: number,
  missingObservationCount: number,
  zeroObservationCount: number,
  edgeToleranceUlps = 0,
): HistogramGroup {
  const counts = new Array<number>(bins.edges.length - 1).fill(0);
  let underRangeCount = 0;
  let overRangeCount = 0;
  for (const observation of observations) {
    const index = ordinaryBinIndex(observation, bins.unit, bins, edgeToleranceUlps);
    if (index >= 0) counts[index]++;
    else if (observation < bins.edges[0]) underRangeCount++;
    else overRangeCount++;
  }
  return {
    id,
    counts,
    values: normalizedHistogramValues(counts, bins, normalization),
    connectionCount,
    observationCount: observations.length,
    binnedObservationCount: counts.reduce((sum, count) => sum + count, 0),
    underRangeCount,
    overRangeCount,
    missingMeasurementCount,
    missingObservationCount,
    zeroObservationCount,
  };
}

function prebinnedGroup(
  data: JsonRecord,
  bins: Bins,
  normalization: string,
  isDelay: boolean,
): HistogramGroup {
  const histogram = record(data.histogram);
  const declaredValues = numbers(histogram.values);
  const observationCount = Number(data.totalObservationCount);
  const underRangeCount = Number(data.underRangeCount ?? data.excludedUnderRangeCount ?? 0);
  const overRangeCount = Number(data.overRangeCount ?? data.excludedOverRangeCount ?? 0);
  const inRange = observationCount - underRangeCount - overRangeCount;
  const suppliedCounts = Array.isArray(data.counts) ? numbers(data.counts) : undefined;
  const counts = suppliedCounts ?? recoverCounts(declaredValues, bins, normalization, inRange);
  const values = normalizedHistogramValues(counts, bins, normalization);
  const connectionCount = Number(
    isDelay
      ? data.consideredConnectionCount ?? observationCount
      : data.sourceConnectionCount ?? observationCount,
  );
  return {
    id: 'all',
    counts,
    values,
    connectionCount,
    observationCount,
    binnedObservationCount: counts.reduce((sum, count) => sum + count, 0),
    underRangeCount,
    overRangeCount,
    missingMeasurementCount: isDelay ? 0 : Number(data.missingWeightCount ?? 0),
    missingObservationCount: isDelay ? 0 : Number(data.missingObservationCount ?? 0),
    zeroObservationCount: isDelay ? 0 : Number(data.zeroWeightCount ?? 0),
  };
}

function delayGroups(
  data: JsonRecord,
  parameters: JsonRecord,
  bins: Bins,
): { readonly groups: readonly HistogramGroup[]; readonly sourceUnit: string; readonly raw: readonly number[] } {
  const connections = record(data.connections);
  const delays = record(connections.delays);
  const sourceUnit = String(delays.unit);
  const sourceIds = strings(connections.sourceIds);
  const targetIds = strings(connections.targetIds);
  const sourceValues = numbers(delays.values);
  const models = strings(connections.synapseModels);
  const groupByModel = data.groupBy === 'synapse_model';
  const groupIds = groupByModel
    ? [...new Set(models)].sort(compareIdentifiers)
    : ['all'];
  const observations = new Map(groupIds.map((id) => [id, [] as number[]]));
  const rows = new Map(groupIds.map((id) => [id, 0]));
  if (parameters.countingPolicy === 'per_connection') {
    for (let index = 0; index < sourceValues.length; index++) {
      const group = groupByModel ? models[index] : 'all';
      rows.set(group, rows.get(group)! + 1);
      observations.get(group)!.push(converted(sourceValues[index], sourceUnit, bins.unit));
    }
  } else {
    const pairs = new Map<string, { readonly group: string; readonly values: number[] }>();
    for (let index = 0; index < sourceValues.length; index++) {
      const group = groupByModel ? models[index] : 'all';
      rows.set(group, rows.get(group)! + 1);
      const key = tupleKey([group, sourceIds[index], targetIds[index]]);
      const existing = pairs.get(key);
      const value = converted(sourceValues[index], sourceUnit, bins.unit);
      if (existing) existing.values.push(value);
      else pairs.set(key, { group, values: [value] });
    }
    for (const key of [...pairs.keys()].sort(compareIdentifiers)) {
      const pair = pairs.get(key)!;
      observations.get(pair.group)!.push(aggregate(
        pair.values,
        String(parameters.multapseAggregation),
      ));
    }
  }
  return {
    sourceUnit,
    raw: sourceValues,
    groups: groupIds.map((id) => histogramGroup(
      id,
      observations.get(id)!,
      bins,
      String(parameters.normalization),
      rows.get(id)!,
      0,
      0,
      0,
      8,
    )),
  };
}

function delayModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const bins = binsFrom(parameters.bins);
  let groups: readonly HistogramGroup[];
  let sourceUnit = bins.unit;
  let raw: readonly number[] = [];
  if (data.mode === 'prebinned') {
    groups = [prebinnedGroup(data, bins, String(parameters.normalization), true)];
  } else {
    const derived = delayGroups(data, parameters, bins);
    groups = derived.groups;
    sourceUnit = derived.sourceUnit;
    raw = derived.raw;
  }
  const normalization = String(parameters.normalization);
  const observationKind = parameters.countingPolicy === 'per_ordered_pair'
    ? 'ordered_pair'
    : 'connection';
  const scopeSummary = distributionScopeSummaryCell(data.scope);
  const densityUnit = reciprocalUnit(bins.unit) ?? null;
  const rows: Cell[][] = [];
  for (const group of groups) {
    for (let index = 0; index < group.counts.length; index++) {
      rows.push([
        group.id,
        bins.edges[index],
        bins.edges[index + 1],
        sameUnitWidth(bins.edges[index], bins.edges[index + 1], bins.unit),
        bins.unit,
        group.counts[index],
        observationKind,
        normalization,
        scopeSummary,
        normalization === 'probability' ? group.values[index] : null,
        normalization === 'density' ? group.values[index] : null,
        normalization === 'density' ? densityUnit : null,
        group.binnedObservationCount,
        group.connectionCount,
        group.underRangeCount,
        group.overRangeCount,
      ]);
    }
  }
  const connectionCount = groups.reduce((sum, group) => sum + group.connectionCount, 0);
  const observationCount = groups.reduce((sum, group) => sum + group.observationCount, 0);
  const under = groups.reduce((sum, group) => sum + group.underRangeCount, 0);
  const over = groups.reduce((sum, group) => sum + group.overRangeCount, 0);
  const aggregated = Math.max(0, connectionCount - observationCount);
  const resolution = record(data.sourceResolution);
  const valueUnit = normalization === 'density' ? String(densityUnit) : '1';
  const rawExtent = finiteExtrema(raw);
  const delayMin = rawExtent !== null
    ? exactText(rawExtent.min)
    : 'not retained by pre-binned input';
  const delayMax = rawExtent !== null
    ? exactText(rawExtent.max)
    : 'not retained by pre-binned input';
  return {
    rows,
    geometry: binCarriers(groups, bins),
    summary: {
      selectionLabel: String(parameters.selectionLabel ?? parameters.selectionId),
      consideredConnectionCount: exactText(connectionCount),
      countingPolicy: String(parameters.countingPolicy),
      pairAggregationStatement: parameters.countingPolicy === 'per_ordered_pair'
        ? ` with ${String(parameters.multapseAggregation)} aggregation`
        : '',
      observationCount: exactText(observationCount),
      observationKind,
      groupCount: exactText(groups.length),
      groupByStatement: String(data.groupBy),
      scopeStatement: scopeSummary,
      delayMin,
      delayMax,
      delayUnit: sourceUnit,
      sourceResolution: `${exactText(Number(resolution.value))} ${String(resolution.unit)}`,
      binCount: exactText(bins.edges.length - 1),
      binMin: exactText(bins.edges[0]),
      binMax: exactText(bins.edges[bins.edges.length - 1]),
      binUnit: bins.unit,
      xScale: String(parameters.xScale ?? 'linear'),
      underRangeCount: exactText(under),
      overRangeCount: exactText(over),
      normalization,
      valueUnit,
    },
    disclosures: baseDisclosureFacts(request, {
      ...(data.mode === 'prebinned' ? { preBinned: true } : {}),
      ...(sourceUnit !== bins.unit
        ? { unitConversions: [conversionDisclosure('delay observations', sourceUnit, bins.unit)] }
        : {}),
      ...(aggregated > 0
        ? {
          multapseAggregated: true,
          multapseAggregation: String(parameters.multapseAggregation),
        }
        : {}),
    }),
  };
}

DELAY_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('network.delay_distribution', 2),
  (request) => modelFields(delayModel(request)),
);

function weightGroups(
  data: JsonRecord,
  parameters: JsonRecord,
  bins: Bins,
): { readonly groups: readonly HistogramGroup[]; readonly sourceUnit: string; readonly models: readonly string[] } {
  const connections = record(data.connections);
  const weights = record(connections.weights);
  const sourceUnit = String(weights.unit);
  const sourceIds = strings(connections.sourceIds);
  const targetIds = strings(connections.targetIds);
  const sourceValues = nullableNumbers(weights.values);
  const models = strings(connections.synapseModels);
  const grouped = parameters.grouping === 'by_synapse_model';
  const groupIds = grouped ? [...new Set(models)].sort(compareIdentifiers) : ['all'];
  const observations = new Map(groupIds.map((id) => [id, [] as number[]]));
  const connectionCounts = new Map(groupIds.map((id) => [id, 0]));
  const missingRows = new Map(groupIds.map((id) => [id, 0]));
  const missingObservations = new Map(groupIds.map((id) => [id, 0]));
  const zeros = new Map(groupIds.map((id) => [id, 0]));
  const transform = (value: number): number => {
    const signed = parameters.signTreatment === 'magnitude' ? Math.abs(value) : value;
    return converted(signed, sourceUnit, bins.unit);
  };

  if (parameters.observationUnit === 'synapse') {
    for (let index = 0; index < sourceValues.length; index++) {
      const group = grouped ? models[index] : 'all';
      connectionCounts.set(group, connectionCounts.get(group)! + 1);
      const raw = sourceValues[index];
      if (raw === null) {
        missingRows.set(group, missingRows.get(group)! + 1);
        missingObservations.set(group, missingObservations.get(group)! + 1);
        continue;
      }
      const value = transform(raw);
      if (value === 0) zeros.set(group, zeros.get(group)! + 1);
      observations.get(group)!.push(value);
    }
  } else {
    const pairs = new Map<string, {
      readonly group: string;
      readonly values: number[];
      missing: boolean;
      connections: number;
    }>();
    for (let index = 0; index < sourceValues.length; index++) {
      const group = grouped ? models[index] : 'all';
      connectionCounts.set(group, connectionCounts.get(group)! + 1);
      const key = tupleKey([group, sourceIds[index], targetIds[index]]);
      const pair = pairs.get(key) ?? { group, values: [], missing: false, connections: 0 };
      pair.connections++;
      const raw = sourceValues[index];
      if (raw === null) {
        pair.missing = true;
        missingRows.set(group, missingRows.get(group)! + 1);
      } else {
        pair.values.push(raw);
      }
      pairs.set(key, pair);
    }
    for (const key of [...pairs.keys()].sort(compareIdentifiers)) {
      const pair = pairs.get(key)!;
      if (pair.missing) {
        missingObservations.set(pair.group, missingObservations.get(pair.group)! + 1);
        continue;
      }
      const value = transform(aggregate(pair.values, String(parameters.aggregation)));
      if (value === 0) zeros.set(pair.group, zeros.get(pair.group)! + 1);
      observations.get(pair.group)!.push(value);
    }
  }
  return {
    sourceUnit,
    models,
    groups: groupIds.map((id) => histogramGroup(
      id,
      observations.get(id)!,
      bins,
      String(parameters.normalization),
      connectionCounts.get(id)!,
      missingRows.get(id)!,
      missingObservations.get(id)!,
      zeros.get(id)!,
    )),
  };
}

function weightModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const bins = data.mode === 'prebinned'
    ? binsFrom(data.binEdges)
    : binsFrom(parameters.bins);
  let groups: readonly HistogramGroup[];
  let sourceUnit = bins.unit;
  let models: readonly string[];
  if (data.mode === 'prebinned') {
    groups = [prebinnedGroup(data, bins, String(parameters.normalization), false)];
    models = strings(data.contributingSynapseModels);
  } else {
    const derived = weightGroups(data, parameters, bins);
    groups = derived.groups;
    sourceUnit = derived.sourceUnit;
    models = derived.models;
  }
  const normalization = String(parameters.normalization);
  const densityUnit = reciprocalUnit(bins.unit) ?? null;
  const rows: Cell[][] = [];
  for (const group of groups) {
    for (let index = 0; index < group.counts.length; index++) {
      rows.push([
        group.id,
        bins.edges[index],
        bins.edges[index + 1],
        sameUnitWidth(bins.edges[index], bins.edges[index + 1], bins.unit),
        bins.edges[index + 1] <= 0 ? 'negative' : 'non_negative',
        group.counts[index],
        group.values[index],
        normalization === 'density' ? densityUnit : '1',
        group.binnedObservationCount,
        group.missingObservationCount,
        group.connectionCount,
      ]);
    }
  }
  const connectionCount = groups.reduce((sum, group) => sum + group.connectionCount, 0);
  const binned = groups.reduce((sum, group) => sum + group.binnedObservationCount, 0);
  const missingMeasurements = groups.reduce((sum, group) => sum + group.missingMeasurementCount, 0);
  const missingObservations = groups.reduce((sum, group) => sum + group.missingObservationCount, 0);
  const zeros = groups.reduce((sum, group) => sum + group.zeroObservationCount, 0);
  const under = groups.reduce((sum, group) => sum + group.underRangeCount, 0);
  const over = groups.reduce((sum, group) => sum + group.overRangeCount, 0);
  const aggregated = Math.max(0, connectionCount - missingObservations -
    groups.reduce((sum, group) => sum + group.observationCount, 0));
  const sourceUniverse = strings(record(data.sourceUniverse).ids);
  const targetUniverse = strings(record(data.targetUniverse).ids);
  const comparability = structuredCell(parameters.weightComparability);
  const zeroEdgeStatement = bins.edges.includes(0)
    ? 'Zero is an explicit bin edge.'
    : 'Zero is not an explicit bin edge.';
  return {
    rows,
    geometry: binCarriers(groups, bins),
    summary: {
      selectionLabel: String(parameters.selectionLabel ?? parameters.selectionId),
      inRangeObservationCount: exactText(binned),
      observationUnit: String(parameters.observationUnit),
      sourceConnectionCount: exactText(connectionCount),
      sourceNodeCount: exactText(sourceUniverse.length),
      targetNodeCount: exactText(targetUniverse.length),
      scopeStatement: distributionScopeSummaryCell(data.scope),
      synapseModels: [...new Set(models)].sort(compareIdentifiers).join(', '),
      weightComparability: comparability,
      signTreatment: String(parameters.signTreatment),
      weightUnit: sourceUnit,
      missingWeightCount: exactText(missingMeasurements),
      missingObservationCount: exactText(missingObservations),
      zeroWeightCount: exactText(zeros),
      binCount: exactText(bins.edges.length - 1),
      binMin: exactText(bins.edges[0]),
      binMax: exactText(bins.edges[bins.edges.length - 1]),
      binUnit: bins.unit,
      xScale: String(parameters.xScale ?? 'linear'),
      zeroEdgeStatement,
      underRangeCount: exactText(under),
      overRangeCount: exactText(over),
      normalization,
      valueUnit: normalization === 'density' ? String(densityUnit) : '1',
    },
    disclosures: baseDisclosureFacts(request, {
      ...(data.mode === 'prebinned' ? { preBinned: true } : {}),
      missingValueCount: missingMeasurements,
      ...(sourceUnit !== bins.unit
        ? { unitConversions: [conversionDisclosure('weight observations', sourceUnit, bins.unit)] }
        : {}),
      ...(aggregated > 0
        ? {
          multapseAggregated: true,
          multapseAggregation: String(parameters.aggregation),
        }
        : {}),
    }),
  };
}

WEIGHT_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('network.weight_distribution', 2),
  (request) => modelFields(weightModel(request)),
);

function isiTrainKey(sender: string, trial: string | undefined): string {
  return tupleKey(trial === undefined ? ['sender', sender] : ['sender-trial', sender, trial]);
}

function declaredIsiTrainKeys(senders: readonly string[], trials: readonly string[] | undefined): string[] {
  return trials
    ? senders.flatMap((sender) => trials.map((trial) => isiTrainKey(sender, trial)))
    : senders.map((sender) => isiTrainKey(sender, undefined));
}

interface IsiFacts {
  readonly intervals: readonly number[];
  readonly intervalUnit: string;
  readonly intervalCount: number;
  readonly spikeCount: number;
  readonly trainCount: number;
  readonly trainsWithoutIntervalCount: number;
  readonly zeroIntervalCount: number;
  readonly excludedOutOfWindowCount: number | null;
}

function isiFromEvents(data: JsonRecord): IsiFacts {
  const eventTimes = record(data.eventTimes);
  const unit = String(eventTimes.unit);
  const times = numbers(eventTimes.values);
  const senders = strings(data.eventSenderIds);
  const eventTrials = Array.isArray(data.eventTrialIds) ? strings(data.eventTrialIds) : undefined;
  const recorded = strings(data.recordedSenderIds);
  const trials = Array.isArray(data.trialIds) ? strings(data.trialIds) : undefined;
  const keys = declaredIsiTrainKeys(recorded, trials);
  const byTrain = new Map(keys.map((key) => [key, [] as number[]]));
  for (let index = 0; index < times.length; index++) {
    const key = isiTrainKey(senders[index], eventTrials?.[index]);
    const train = byTrain.get(key);
    if (!train) throw new Error('ISI event is outside the declared train universe');
    train.push(times[index]);
  }
  const intervals: number[] = [];
  let trainsWithoutIntervalCount = 0;
  let zeroIntervalCount = 0;
  for (const key of keys) {
    const train = byTrain.get(key)!.sort((left, right) => left - right);
    if (train.length < 2) trainsWithoutIntervalCount++;
    for (let index = 1; index < train.length; index++) {
      const interval = exactBinary64Sum([train[index], -train[index - 1]]);
      if (interval === 0) zeroIntervalCount++;
      intervals.push(interval);
    }
  }
  return {
    intervals,
    intervalUnit: unit,
    intervalCount: intervals.length,
    spikeCount: times.length,
    trainCount: keys.length,
    trainsWithoutIntervalCount,
    zeroIntervalCount,
    excludedOutOfWindowCount: 0,
  };
}

function isiFromIntervals(data: JsonRecord): IsiFacts {
  const intervalRecord = record(data.intervals);
  const intervals = numbers(intervalRecord.values);
  const senders = strings(data.recordedSenderIds);
  const trials = Array.isArray(data.trialIds) ? strings(data.trialIds) : undefined;
  const keys = declaredIsiTrainKeys(senders, trials);
  const table = array(data.trains).map(record);
  let spikeCount = 0;
  let trainsWithoutIntervalCount = 0;
  for (const train of table) {
    const count = Number(train.spikeCount);
    spikeCount += count;
    if (count < 2) trainsWithoutIntervalCount++;
  }
  return {
    intervals,
    intervalUnit: String(intervalRecord.unit),
    intervalCount: intervals.length,
    spikeCount,
    trainCount: keys.length,
    trainsWithoutIntervalCount,
    zeroIntervalCount: intervals.filter((value) => value === 0).length,
    excludedOutOfWindowCount: null,
  };
}

function isiModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const bins = binsFrom(parameters.bins);
  const facts = data.mode === 'intervals' ? isiFromIntervals(data) : isiFromEvents(data);
  const normalization = String(parameters.normalization);
  const counts = new Array<number>(bins.edges.length - 1).fill(0);
  let under = 0;
  let over = 0;
  for (const interval of facts.intervals) {
    const index = ordinaryBinIndex(interval, facts.intervalUnit, bins);
    if (index >= 0) counts[index]++;
    else if (converted(interval, facts.intervalUnit, bins.unit) < bins.edges[0]) under++;
    else over++;
  }
  const values = normalizedHistogramValues(counts, bins, normalization);
  const binned = counts.reduce((sum, count) => sum + count, 0);
  const densityUnit = reciprocalUnit(bins.unit) ?? null;
  const rows = counts.map((count, index): Cell[] => [
    bins.edges[index],
    bins.edges[index + 1],
    sameUnitWidth(bins.edges[index], bins.edges[index + 1], bins.unit),
    bins.unit,
    count,
    normalization === 'probability' ? values[index] : null,
    normalization === 'density' ? values[index] : null,
    normalization === 'density' ? densityUnit : null,
    binned,
    facts.intervalCount,
    under,
    over,
    facts.trainCount,
    facts.spikeCount,
    facts.excludedOutOfWindowCount,
  ]);
  const window = record(data.window);
  const duration = convertDifference(
    Number(window.start),
    Number(window.stop),
    String(window.unit),
    String(window.unit),
  );
  const senderCount = strings(data.recordedSenderIds).length;
  const trialCount = Array.isArray(data.trialIds) ? strings(data.trialIds).length : 1;
  return {
    rows,
    geometry: binCarriers([{ id: 'all', counts }], bins),
    summary: {
      selectionLabel: String(parameters.selectionLabel ?? parameters.selectionId),
      intervalCount: exactText(facts.intervalCount),
      trainCount: exactText(facts.trainCount),
      senderCount: exactText(senderCount),
      trialCount: exactText(trialCount),
      spikeCount: exactText(facts.spikeCount),
      windowStart: exactText(Number(window.start)),
      windowStop: exactText(Number(window.stop)),
      timeUnit: String(window.unit),
      trainsWithoutIntervalCount: exactText(facts.trainsWithoutIntervalCount),
      excludedOutOfWindowCount: facts.excludedOutOfWindowCount === null
        ? 'not retained by interval input'
        : exactText(facts.excludedOutOfWindowCount),
      binCount: exactText(counts.length),
      binMin: exactText(bins.edges[0]),
      binMax: exactText(bins.edges[bins.edges.length - 1]),
      intervalUnit: bins.unit,
      xScale: String(parameters.xScale ?? 'linear'),
      underRangeCount: exactText(under),
      overRangeCount: exactText(over),
      normalization,
      valueUnit: normalization === 'density' ? String(densityUnit) : '1',
      windowDuration: exactText(duration),
      zeroIntervalStatement: facts.zeroIntervalCount > 0
        ? `${facts.zeroIntervalCount} exact zero intervals were retained by the declared policy.`
        : 'No exact zero interval was observed.',
    },
    disclosures: baseDisclosureFacts(request, {
      ...(facts.intervalUnit !== bins.unit
        ? {
          unitConversions: [conversionDisclosure(
            'inter-spike intervals',
            facts.intervalUnit,
            bins.unit,
          )],
        }
        : {}),
    }),
  };
}

ISI_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.isi_distribution', 2),
  (request) => modelFields(isiModel(request)),
);

interface CorrelogramAxisModel {
  readonly bins: Bins;
  readonly centers: readonly number[];
  readonly typedWidth: number;
  readonly typedWidthUnit: string;
  readonly widthInLagUnit: number;
  readonly lagUnit: string;
  readonly conversions: readonly string[];
}

function correlogramAxis(parameters: JsonRecord): CorrelogramAxisModel {
  const range = record(parameters.lagRange);
  const declaration = record(parameters.bins);
  const lagUnit = String(range.unit);
  const typedWidthUnit = String(declaration.unit);
  const typedWidth = Number(declaration.width);
  const widthInLagUnit = converted(typedWidth, typedWidthUnit, lagUnit);
  const materialized = materializeCenteredLagBins(
    Number(range.min),
    Number(range.max),
    widthInLagUnit,
    20_001,
  );
  if (!materialized.ok) throw new Error('cannot independently materialize lag ladder');
  const edges = materialized.edges;
  const centers = edges.slice(0, -1).map((lower, index) =>
    lower + (edges[index + 1] - lower) / 2);
  return {
    bins: { edges, unit: lagUnit, finalEdgeInclusive: false },
    centers,
    typedWidth,
    typedWidthUnit,
    widthInLagUnit,
    lagUnit,
    conversions: typedWidthUnit === lagUnit
      ? []
      : [conversionDisclosure('correlogram bin width', typedWidthUnit, lagUnit)],
  };
}

function eligibleReferenceCounts(
  referenceTimes: readonly number[],
  referenceUnit: string,
  bins: Bins,
  window: JsonRecord,
): number[] {
  const binCount = bins.edges.length - 1;
  const changes = new Array<number>(binCount + 1).fill(0);
  const firstTrue = (predicate: (edge: number) => boolean): number => {
    let low = 0;
    let high = bins.edges.length;
    while (low < high) {
      const middle = low + Math.floor((high - low) / 2);
      if (predicate(bins.edges[middle])) high = middle;
      else low = middle + 1;
    }
    return low;
  };
  const openStart = window.boundary === '(start,stop]';
  for (const time of referenceTimes) {
    const firstLower = firstTrue((edge) => {
      const comparison = compareExactUnitSumToValue(
        [
          { value: time, unit: referenceUnit },
          { value: edge, unit: bins.unit },
        ],
        { value: Number(window.start), unit: String(window.unit) },
      );
      return openStart ? comparison > 0 : comparison >= 0;
    });
    const firstUpperBeyond = firstTrue((edge) => compareExactUnitSumToValue(
      [
        { value: time, unit: referenceUnit },
        { value: edge, unit: bins.unit },
      ],
      { value: Number(window.stop), unit: String(window.unit) },
    ) > 0);
    const lower = Math.min(firstLower, binCount);
    const upper = Math.max(0, Math.min(firstUpperBeyond - 1, binCount));
    if (lower < upper) {
      changes[lower]++;
      changes[upper]--;
    }
  }
  let active = 0;
  return changes.slice(0, binCount).map((change) => {
    active += change;
    return active;
  });
}

function correlogramModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const axis = correlogramAxis(parameters);
  const mode = String(data.mode);
  const preBinned = mode.startsWith('prebinned_');
  const kind: 'auto' | 'cross' = mode.endsWith('_auto') ? 'auto' : 'cross';
  const referenceTrain = record(kind === 'auto' ? data.train : data.referenceTrain);
  const targetTrain = kind === 'auto' ? referenceTrain : record(data.targetTrain);
  const referenceSourceTimes = numbers(record(referenceTrain.eventTimes).values);
  const targetSourceTimes = kind === 'auto'
    ? referenceSourceTimes
    : numbers(record(targetTrain.eventTimes).values);
  const referenceSourceUnit = preBinned
    ? axis.lagUnit
    : String(record(referenceTrain.eventTimes).unit);
  const targetSourceUnit = preBinned
    ? axis.lagUnit
    : String(record(targetTrain.eventTimes).unit);
  const referenceTimes = preBinned
    ? []
    : referenceSourceTimes.map((value) => converted(value, referenceSourceUnit, axis.lagUnit));
  const targetTimes = preBinned
    ? []
    : kind === 'auto'
      ? referenceTimes
      : targetSourceTimes.map((value) => converted(value, targetSourceUnit, axis.lagUnit));
  let pairCounts: number[];
  let referenceEventCount: number;
  let targetEventCount: number;
  if (preBinned) {
    pairCounts = numbers(data.pairCounts);
    referenceEventCount = Number(data.referenceEventCount);
    targetEventCount = kind === 'auto' ? referenceEventCount : Number(data.targetEventCount);
  } else {
    const sortedReference = [...referenceTimes].sort((left, right) => left - right);
    const sortedTarget = kind === 'auto'
      ? sortedReference
      : [...targetTimes].sort((left, right) => left - right);
    pairCounts = new Array<number>(axis.centers.length).fill(0);
    // The live build preflight has already bounded the eligible pair count. Walk only
    // the monotone lag window here instead of expanding the full reference×target
    // product; far-out pairs are counted algebraically below and never enumerated.
    const minimumLag = axis.bins.edges[0];
    const maximumLag = axis.bins.edges[axis.bins.edges.length - 1];
    let firstEligibleTarget = 0;
    let firstTargetPastWindow = 0;
    for (let referenceIndex = 0; referenceIndex < sortedReference.length; referenceIndex++) {
      const referenceTime = sortedReference[referenceIndex];
      while (
        firstEligibleTarget < sortedTarget.length &&
        sortedTarget[firstEligibleTarget] - referenceTime < minimumLag
      ) {
        firstEligibleTarget++;
      }
      if (firstTargetPastWindow < firstEligibleTarget) {
        firstTargetPastWindow = firstEligibleTarget;
      }
      while (
        firstTargetPastWindow < sortedTarget.length &&
        sortedTarget[firstTargetPastWindow] - referenceTime < maximumLag
      ) {
        firstTargetPastWindow++;
      }
      for (
        let targetIndex = firstEligibleTarget;
        targetIndex < firstTargetPastWindow;
        targetIndex++
      ) {
        if (kind === 'auto' && referenceIndex === targetIndex) continue;
        const lag = sortedTarget[targetIndex] - referenceTime;
        const index = ordinaryBinIndex(lag, axis.lagUnit, axis.bins);
        if (index >= 0) pairCounts[index]++;
      }
    }
    referenceEventCount = referenceTimes.length;
    targetEventCount = kind === 'auto' ? referenceEventCount : targetTimes.length;
  }
  const countedPairCount = pairCounts.reduce((sum, count) => sum + count, 0);
  const candidatePairCount = referenceEventCount * targetEventCount;
  const sameEventSelfPairCountExcluded = kind === 'auto' ? referenceEventCount : 0;
  const outOfRangePairCount = candidatePairCount - countedPairCount - sameEventSelfPairCountExcluded;
  const statistic = String(parameters.statistic);
  const edgeCorrection = String(parameters.edgeCorrection);
  let eligible: (number | null)[];
  let denominators: (number | null)[];
  let values: (number | null)[];
  let statuses: string[];
  if (statistic === 'raw_pair_count') {
    eligible = pairCounts.map(() => null);
    denominators = pairCounts.map(() => null);
    values = [...pairCounts];
    statuses = pairCounts.map(() => 'defined');
  } else {
    const exactEligible = edgeCorrection === 'none'
      ? pairCounts.map(() => referenceEventCount)
      : preBinned
        ? numbers(data.eligibleReferenceEventCounts)
        : eligibleReferenceCounts(
          referenceSourceTimes,
          referenceSourceUnit,
          axis.bins,
          record(data.window),
        );
    const widthSeconds = convertDifference(
      0,
      axis.typedWidth,
      axis.typedWidthUnit,
      's',
    );
    eligible = exactEligible;
    denominators = exactEligible.map((count) => count * widthSeconds);
    values = pairCounts.map((count, index) => exactEligible[index] === 0
      ? null
      : deriveExactCountRateInUnit(
        count,
        exactEligible[index],
        0,
        axis.typedWidth,
        axis.typedWidthUnit,
        'Hz',
      ));
    statuses = exactEligible.map((count) => count === 0
      ? 'undefined_zero_eligible_reference_events'
      : 'defined');
  }
  const rows = pairCounts.map((pairCount, index): Cell[] => [
    axis.bins.edges[index],
    axis.centers[index],
    axis.bins.edges[index + 1],
    pairCount,
    eligible[index],
    denominators[index],
    values[index],
    statistic === 'raw_pair_count' ? '1' : 'Hz',
    statuses[index],
    null,
    null,
  ]);
  const geometry = values.flatMap((value, binIndex) => value === null
    ? []
    : [carrier('bins', {
      binIndex,
      lagBinStart: axis.bins.edges[binIndex],
      lagBinCenter: axis.centers[binIndex],
      lagBinEnd: axis.bins.edges[binIndex + 1],
    })]);
  const undefinedCount = values.filter((value) => value === null).length;
  const window = record(data.window);
  const duration = convertDifference(
    Number(window.start),
    Number(window.stop),
    String(window.unit),
    String(window.unit),
  );
  const conversions = [...axis.conversions];
  if (!preBinned && referenceSourceUnit !== axis.lagUnit) {
    conversions.push(conversionDisclosure(
      'correlogram reference-event times',
      referenceSourceUnit,
      axis.lagUnit,
    ));
  }
  if (!preBinned && kind === 'cross' && targetSourceUnit !== axis.lagUnit) {
    conversions.push(conversionDisclosure(
      'correlogram target-event times',
      targetSourceUnit,
      axis.lagUnit,
    ));
  }
  if (preBinned) {
    const edgeUnit = String(record(data.binEdges).unit);
    if (edgeUnit !== axis.lagUnit) {
      conversions.push(conversionDisclosure(
        'pre-binned correlogram lag edges',
        edgeUnit,
        axis.lagUnit,
      ));
    }
  }
  const denominatorStatement = statistic === 'raw_pair_count'
    ? 'none'
    : edgeCorrection === 'none'
      ? 'reference event count multiplied by the typed bin width in seconds'
      : 'the per-bin eligible-reference count multiplied by the typed bin width in seconds; zero exposure yields null';
  const sourceAuthorityStatement = preBinned
    ? 'Source event counts and exact pair numerators were declared by the pre-binned product; duration was derived from its window'
    : 'Source event counts were derived from the explicit event arrays, and duration was derived from their shared window';
  return {
    rows,
    geometry,
    summary: {
      correlationKind: kind,
      targetLabel: String(targetTrain.label),
      referenceLabel: String(referenceTrain.label),
      referenceRecordedSenderCount: exactText(strings(referenceTrain.recordedSenderIds).length),
      targetRecordedSenderCount: exactText(strings(targetTrain.recordedSenderIds).length),
      binCount: exactText(pairCounts.length),
      binWidth: exactText(axis.widthInLagUnit),
      lagUnit: axis.lagUnit,
      lagMin: exactText(axis.centers[0]),
      lagMax: exactText(axis.centers[axis.centers.length - 1]),
      statistic,
      valueUnit: statistic === 'raw_pair_count' ? '1' : 'Hz',
      denominatorStatement,
      referenceEventCount: exactText(referenceEventCount),
      targetEventCount: exactText(targetEventCount),
      observationDuration: exactText(duration),
      timeUnit: String(window.unit),
      sourceAuthorityStatement,
      candidatePairCount: exactText(candidatePairCount),
      countedPairCount: exactText(countedPairCount),
      outOfRangePairCount: exactText(outOfRangePairCount),
      sameEventSelfPairCountExcluded: exactText(sameEventSelfPairCountExcluded),
      undefinedRateBinCount: exactText(undefinedCount),
      uncertaintyStatement: 'No uncertainty interval is estimated or drawn.',
    },
    disclosures: baseDisclosureFacts(request, {
      ...(preBinned ? { preBinned: true } : {}),
      ...(conversions.length > 0 ? { unitConversions: conversions } : {}),
      ...(undefinedCount > 0 ? { missingValueCount: undefinedCount } : {}),
    }),
  };
}

CORRELOGRAM_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.correlogram', 2),
  (request) => modelFields(correlogramModel(request)),
);

type PsthNormalization =
  | 'count'
  | 'count_per_trial'
  | 'total_event_rate_per_trial'
  | 'mean_rate_per_selected_sender_per_trial';

interface PsthIndependent {
  readonly bins: Bins;
  readonly counts: readonly (number | null)[];
  readonly denominators: readonly (number | null)[];
  readonly values: readonly (number | null)[];
  readonly displayValues: readonly (number | null)[];
  readonly corrected: readonly (number | null)[];
  readonly valueUnit: string;
  readonly baselineRate: number | null;
  readonly baselineStart: number | null;
  readonly baselineStop: number | null;
  readonly baselineUnit: string | null;
  readonly selectedSenderCount: number;
  readonly includedTrialCount: number;
  readonly excludedTrialCount: number;
  readonly excludedOutOfWindowCount: number | null;
  readonly conversions: readonly string[];
}

function psthNormalizedValues(
  counts: readonly (number | null)[],
  denominators: readonly (number | null)[],
  bins: Bins,
  selectedSenderCount: number,
  normalization: PsthNormalization,
  valueUnit: string,
): (number | null)[] {
  return counts.map((count, index) => {
    const denominator = denominators[index];
    if (count === null || denominator === null) return null;
    if (normalization === 'count') return count;
    if (normalization === 'count_per_trial') {
      return exactRationalToBinary64(BigInt(count), BigInt(denominator));
    }
    const factors = normalization === 'mean_rate_per_selected_sender_per_trial'
      ? [denominator, selectedSenderCount]
      : [denominator];
    return deriveExactCountRateWithIntegerFactorsInUnit(
      count,
      factors,
      bins.edges[index],
      bins.edges[index + 1],
      bins.unit,
      valueUnit,
    );
  });
}

function psthBaseline(
  parameters: JsonRecord,
  relativeWindow: JsonRecord,
  bins: Bins,
  counts: readonly (number | null)[],
  denominators: readonly (number | null)[],
  selectedSenderCount: number,
  normalization: PsthNormalization,
  valueUnit: string,
): {
  readonly rate: number | null;
  readonly corrected: readonly (number | null)[];
  readonly start: number | null;
  readonly stop: number | null;
  readonly unit: string | null;
} {
  const baseline = record(parameters.baseline);
  if (Object.keys(baseline).length === 0) {
    return {
      rate: null,
      corrected: counts.map(() => null),
      start: null,
      stop: null,
      unit: null,
    };
  }
  const windowUnit = String(relativeWindow.unit);
  const start = Number(baseline.start);
  const stop = Number(baseline.stop);
  const startInBins = converted(start, windowUnit, bins.unit);
  const stopInBins = converted(stop, windowUnit, bins.unit);
  const startIndex = bins.edges.findIndex((edge) => Object.is(edge, startInBins));
  const stopIndex = bins.edges.findIndex((edge) => Object.is(edge, stopInBins));
  if (startIndex < 0 || stopIndex <= startIndex) {
    throw new Error('PSTH baseline does not identify exact bin edges');
  }
  let baselineCount = 0n;
  const intervals: { lower: number; upper: number; integerWeight: number }[] = [];
  for (let index = startIndex; index < stopIndex; index++) {
    const count = counts[index];
    const denominator = denominators[index];
    if (count === null || denominator === null) continue;
    baselineCount += BigInt(count);
    intervals.push({
      lower: bins.edges[index],
      upper: bins.edges[index + 1],
      integerWeight: denominator,
    });
  }
  const aggregateFactors = normalization === 'mean_rate_per_selected_sender_per_trial'
    ? [selectedSenderCount]
    : [];
  const rate = deriveExactAggregateCountRateOverIntervalsInUnit(
    baselineCount,
    aggregateFactors,
    intervals,
    bins.unit,
    valueUnit,
  );
  const corrected = counts.map((count, index) => {
    const denominator = denominators[index];
    if (count === null || denominator === null) return null;
    const factors = normalization === 'mean_rate_per_selected_sender_per_trial'
      ? [denominator, selectedSenderCount]
      : [denominator];
    return deriveExactCountRateMinusAggregateRateOverIntervalsInUnit(
      count,
      factors,
      bins.edges[index],
      bins.edges[index + 1],
      baselineCount,
      aggregateFactors,
      intervals,
      bins.unit,
      valueUnit,
    );
  });
  return { rate, corrected, start, stop, unit: windowUnit };
}

function psthIndependent(data: JsonRecord, parameters: JsonRecord): PsthIndependent {
  const bins = binsFrom(parameters.bins);
  const relativeWindow = record(data.relativeWindow);
  const normalization = String(parameters.normalization) as PsthNormalization;
  let counts: (number | null)[];
  let denominators: (number | null)[];
  let selectedSenderCount: number;
  let includedTrialCount: number;
  let excludedTrialCount: number;
  let excludedOutOfWindowCount: number | null;
  if (data.mode === 'prebinned') {
    counts = nullableNumbers(data.counts);
    denominators = nullableNumbers(data.trialDenominators);
    selectedSenderCount = Number(data.recordedSenderCount);
    includedTrialCount = Number(data.includedTrialCount);
    excludedTrialCount = Number(data.excludedTrialCount);
    excludedOutOfWindowCount = null;
  } else {
    const eventTimes = record(data.eventTimes);
    const sourceTimes = numbers(eventTimes.values);
    const senders = strings(data.eventSenderIds);
    const eventTrials = strings(data.eventTrialIds);
    const recorded = new Set(strings(data.recordedSenderIds));
    const trialIds = strings(data.trialIds);
    const alignments = numbers(data.alignmentTimes);
    const alignmentByTrial = new Map(trialIds.map((trial, index) => [trial, alignments[index]]));
    counts = new Array<number>(bins.edges.length - 1).fill(0);
    const windowStart = converted(Number(relativeWindow.start), String(relativeWindow.unit), bins.unit);
    const windowStop = converted(Number(relativeWindow.stop), String(relativeWindow.unit), bins.unit);
    const closedStop = relativeWindow.boundary === '[start,stop]';
    excludedOutOfWindowCount = 0;
    for (let index = 0; index < sourceTimes.length; index++) {
      const alignment = alignmentByTrial.get(eventTrials[index]);
      if (!recorded.has(senders[index]) || alignment === undefined) {
        throw new Error('PSTH event does not bind to the selected sender/trial universes');
      }
      const relative = convertExactUnitSum(
        [
          { value: sourceTimes[index], unit: String(eventTimes.unit) },
          { value: -alignment, unit: String(data.alignmentUnit) },
        ],
        bins.unit,
      );
      if (relative < windowStart || (closedStop ? relative > windowStop : relative >= windowStop)) {
        excludedOutOfWindowCount++;
        continue;
      }
      const bin = ordinaryBinIndex(relative, bins.unit, bins);
      if (bin < 0) throw new Error('PSTH in-window event has no authoritative bin');
      counts[bin] = (counts[bin] ?? 0) + 1;
    }
    denominators = counts.map(() => trialIds.length);
    selectedSenderCount = recorded.size;
    includedTrialCount = trialIds.length;
    excludedTrialCount = 0;
  }
  const supplied = record(data.rates);
  const rateNormalization = normalization === 'total_event_rate_per_trial' ||
    normalization === 'mean_rate_per_selected_sender_per_trial';
  const valueUnit = rateNormalization
    ? (typeof supplied.unit === 'string' ? supplied.unit : 'Hz')
    : '1';
  const values = psthNormalizedValues(
    counts,
    denominators,
    bins,
    selectedSenderCount,
    normalization,
    valueUnit,
  );
  const baseline = psthBaseline(
    parameters,
    relativeWindow,
    bins,
    counts,
    denominators,
    selectedSenderCount,
    normalization,
    valueUnit,
  );
  const pairs: [string, string][] = [];
  if (String(relativeWindow.unit) !== bins.unit) pairs.push([String(relativeWindow.unit), bins.unit]);
  if (data.mode === 'events') {
    const eventUnit = String(record(data.eventTimes).unit);
    const alignmentUnit = String(data.alignmentUnit);
    if (eventUnit !== bins.unit) pairs.push([eventUnit, bins.unit]);
    if (alignmentUnit !== bins.unit) pairs.push([alignmentUnit, bins.unit]);
  }
  if (rateNormalization) {
    if (bins.unit !== 's') pairs.push([bins.unit, 's']);
    if (valueUnit !== 'Hz') pairs.push(['Hz', valueUnit]);
  }
  const conversions = [...new Map(pairs.map((pair) => [`${pair[0]}\u0000${pair[1]}`, pair])).values()]
    .map(([from, to]) => `${from} -> ${to}`);
  return {
    bins,
    counts,
    denominators,
    values,
    displayValues: baseline.rate === null ? values : baseline.corrected,
    corrected: baseline.corrected,
    valueUnit,
    baselineRate: baseline.rate,
    baselineStart: baseline.start,
    baselineStop: baseline.stop,
    baselineUnit: baseline.unit,
    selectedSenderCount,
    includedTrialCount,
    excludedTrialCount,
    excludedOutOfWindowCount,
    conversions,
  };
}

function psthModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const result = psthIndependent(data, parameters);
  const relativeWindow = record(data.relativeWindow);
  const normalization = String(parameters.normalization);
  const denominatorPolicy = String(parameters.denominatorPolicy);
  const widths = result.counts.map((_count, index) => sameUnitWidth(
    result.bins.edges[index],
    result.bins.edges[index + 1],
    result.bins.unit,
  ));
  const rows = result.counts.map((count, index): Cell[] => [
    String(parameters.seriesId),
    String(parameters.seriesLabel ?? parameters.seriesId),
    String(parameters.alignmentLabel ?? 'alignment'),
    result.bins.edges[index],
    result.bins.edges[index + 1],
    widths[index],
    result.bins.unit,
    Number(relativeWindow.start),
    Number(relativeWindow.stop),
    String(relativeWindow.unit),
    String(relativeWindow.boundary),
    String(record(parameters.bins).boundary),
    result.bins.finalEdgeInclusive ? 'true' : 'false',
    count,
    result.denominators[index],
    result.includedTrialCount,
    result.excludedTrialCount,
    result.excludedOutOfWindowCount,
    result.selectedSenderCount,
    normalization,
    denominatorPolicy,
    parameters.senderExposurePolicy === undefined ? null : String(parameters.senderExposurePolicy),
    result.values[index],
    result.valueUnit,
    result.baselineRate === null ? null : result.corrected[index],
    result.baselineRate === null ? null : 'subtract_mean_rate',
    result.baselineRate,
    result.baselineStart,
    result.baselineStop,
    result.baselineUnit,
  ]);
  const geometry = result.displayValues.flatMap((value, binIndex) => value === null
    ? []
    : [carrier('bins', {
      binIndex,
      binStart: result.bins.edges[binIndex],
      binEnd: result.bins.edges[binIndex + 1],
    })]);
  const finiteValues = result.values.filter((value): value is number => value !== null);
  const countTotal = result.counts.reduce(
    (sum, count) => sum + (count === null ? 0n : BigInt(count)),
    0n,
  );
  const missing = result.counts.filter((count) => count === null).length;
  const zeroOnAxis = result.bins.edges[0] <= 0 &&
    0 <= result.bins.edges[result.bins.edges.length - 1];
  const zeroIncluded = zeroOnAxis && (
    0 < result.bins.edges[result.bins.edges.length - 1] || result.bins.finalEdgeInclusive
  );
  const baselineStatement = result.baselineRate === null
    ? 'No baseline subtraction was requested.'
    : `Baseline ${exactText(result.baselineRate)} ${result.valueUnit} was subtracted from displayed values; the table retains both uncorrected and corrected values.`;
  const excludedEventStatement = result.excludedOutOfWindowCount === null
    ? 'The pre-binned input does not retain an out-of-window event count.'
    : `${result.excludedOutOfWindowCount} source events were excluded by the relative window.`;
  const valueExtent = finiteExtrema(finiteValues);
  return {
    rows,
    geometry,
    summary: {
      seriesLabel: String(parameters.seriesLabel ?? parameters.seriesId),
      alignmentLabel: String(parameters.alignmentLabel ?? 'alignment'),
      windowStart: exactText(Number(relativeWindow.start)),
      windowStop: exactText(Number(relativeWindow.stop)),
      timeUnit: String(relativeWindow.unit),
      windowBoundary: String(relativeWindow.boundary),
      zeroVisibilityStatement: zeroIncluded
        ? 'Relative time zero is included and shown as a reference.'
        : zeroOnAxis
          ? 'Relative time zero is an excluded stop-boundary coordinate shown only as a boundary reference.'
          : 'Relative time zero lies outside the displayed window and no zero reference is drawn.',
      binCount: exactText(result.counts.length),
      eventCount: exactText(countTotal),
      selectedSenderCount: exactText(result.selectedSenderCount),
      includedTrialCount: exactText(result.includedTrialCount),
      excludedTrialCount: exactText(result.excludedTrialCount),
      denominatorPolicy,
      normalization,
      valueMin: valueExtent === null ? 'null' : exactText(valueExtent.min),
      valueMax: valueExtent === null ? 'null' : exactText(valueExtent.max),
      valueUnit: result.valueUnit,
      baselineStatement,
      missingBinStatement: missing > 0
        ? missing === 1
          ? '1 bin has no covering trial and remains missing, not zero.'
          : `${missing} bins have no covering trial and remain missing, not zero.`
        : 'Every bin has positive declared trial exposure.',
      excludedEventStatement,
      uncertaintyStatement: 'No uncertainty interval was supplied or rendered.',
    },
    disclosures: baseDisclosureFacts(request, {
      ...(data.mode === 'prebinned' ? { preBinned: true } : {}),
      ...(missing > 0 ? { missingValueCount: missing } : {}),
      ...(result.excludedOutOfWindowCount !== null
        ? { excludedOutOfWindow: result.excludedOutOfWindowCount }
        : {}),
      ...(result.conversions.length > 0 ? { unitConversions: result.conversions } : {}),
      ...(normalization === 'mean_rate_per_selected_sender_per_trial'
        ? { rectangularSenderExposureAsserted: true }
        : {}),
    }),
  };
}

PSTH_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.psth', 2),
  (request) => modelFields(psthModel(request)),
);

// Additional independent models are defined below in the same module. Keeping the
// registry declaration last makes omission visible in review and generator parity.
export const DISTRIBUTION_AUTHORITY_EVALUATORS: readonly RegisteredAuthorityEvaluatorV1[] = [
  DEGREE_AUTHORITY,
  DELAY_AUTHORITY!,
  WEIGHT_AUTHORITY!,
  ISI_AUTHORITY!,
  CORRELOGRAM_AUTHORITY!,
  POPULATION_RATE_AUTHORITY,
  PSTH_AUTHORITY!,
  RASTER_AUTHORITY,
];
