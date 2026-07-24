/**
 * Canonical-request-only authority evaluators for topology and dynamical figures.
 *
 * This module intentionally shares no analysis, compiler, RenderPlan, generated-catalog,
 * adapter, or artifact code.  It reconstructs the complete table, the exact ordered
 * identities of scientific plan carriers, source-template facts, and disclosure facts
 * directly from the validated canonical request.  The small common trust base is the
 * registered-unit arithmetic, exact binary64 arithmetic, canonical JSON, and the closed
 * response event-scope authority.
 */

import { canonicalize } from '../../core/canonicalize.js';
import type { DisclosureFacts } from '../../core/disclosures.js';
import {
  exactBinary64Mean,
  exactBinary64RatioToDifference,
  floorExactBinary64TimesSafeInteger,
} from '../../core/exact-binary64.js';
import type {
  AuthorityCellV1,
  AuthorityDerivationValueV1,
  AuthorityGeometryEntryV1,
  AuthoritySummaryScalarV1,
  RegisteredAuthorityEvaluatorV1,
} from '../../core/output-authority.js';
import type { JsonValue } from '../../core/parse-json.js';
import {
  classifySpatialChord,
  spatialDomainAxis,
  spatialDomainAxisContains,
  type SpatialChordRoute,
  type SpatialRoutingDomain,
} from '../../core/spatial.js';
import {
  RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID,
  responseEventMembershipDigest,
  type ResponseEventScopeAuthority,
  verifyResponseEventScope,
  verifyResponseRateAuthority,
} from '../../core/response-curve-basis.js';
import {
  canonicalUnitFor,
  convert,
  conversionFactor,
  deriveExactAggregateCountRateInUnit,
  dimensionOf,
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

function exactText(value: number): string {
  return value === 0 ? '0' : String(value);
}

function booleanCell(value: boolean): string {
  return value ? 'true' : 'false';
}

function structuredCell(value: JsonValue | undefined): string {
  return value === undefined ? 'unknown' : canonicalize(value);
}

/**
 * Closed, bounded NetworkScope projection for authority-owned rows and facts.
 * The exact declaration remains once in the canonical request; in particular,
 * a world-sized mergedRanks array is not repeated in every table row.
 */
function topologyScopeSummaryCell(value: JsonValue | undefined): string {
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

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftIterator = left[Symbol.iterator]();
  const rightIterator = right[Symbol.iterator]();
  while (true) {
    const leftNext = leftIterator.next();
    const rightNext = rightIterator.next();
    if (leftNext.done || rightNext.done) {
      if (leftNext.done && rightNext.done) return 0;
      return leftNext.done ? -1 : 1;
    }
    const leftCodePoint = leftNext.value.codePointAt(0)!;
    const rightCodePoint = rightNext.value.codePointAt(0)!;
    if (leftCodePoint !== rightCodePoint) return leftCodePoint < rightCodePoint ? -1 : 1;
  }
}

function compareUtf16CodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function finiteExtrema(values: readonly number[]): { readonly min: number; readonly max: number } | null {
  if (values.length === 0) return null;
  let min = values[0];
  let max = values[0];
  for (let index = 1; index < values.length; index++) {
    if (values[index] < min) min = values[index];
    if (values[index] > max) max = values[index];
  }
  return { min, max };
}

function countNulls(values: readonly JsonValue[]): number {
  let total = 0;
  for (const value of values) if (value === null) total++;
  return total;
}

function pairKey(source: string, target: string): string {
  return canonicalize(compareUnicodeCodePoints(source, target) <= 0
    ? [source, target]
    : [target, source]);
}

function conversionText(label: string, from: string, to: string): string {
  return `${label}: ${from} -> ${to} (factor ${conversionFactor(from, to)})`;
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
  const positions = record(data.positions);
  const uncertainty = record(parameters.uncertainty ?? data.uncertainty);
  const universeIds = strings(nodeUniverse.ids);
  const positionIds = strings(positions.nodeIds);
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
    ...(typeof record(parameters.layout).mode === 'string' &&
      String(record(parameters.layout).mode).startsWith('schematic')
      ? { schematicLayout: true }
      : {}),
    ...(universeIds.length > positionIds.length && positions.nodeIds !== undefined
      ? { positionsMissing: universeIds.length - positionIds.length, positionsTotal: universeIds.length }
      : {}),
    ...extra,
  };
}

function modelFields(model: AuthorityModel): Readonly<Record<string, AuthorityDerivationValueV1>> {
  return {
    'table.rows': rowSequence(model.rows),
    'geometry.sequence': geometrySequence(model.geometry),
    'summary.facts': summaryFactMap(model.summary),
    'disclosure.facts': disclosureFactMap(model.disclosures),
  };
}

interface DegreeValues {
  readonly incoming: readonly number[];
  readonly outgoing: readonly number[];
  readonly autapseCounts: readonly number[];
}

function graphDegrees(
  ids: readonly string[],
  sources: readonly string[],
  targets: readonly string[],
  policy: string,
  autapseContribution: string,
): DegreeValues {
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const incoming = new Array<number>(ids.length).fill(0);
  const outgoing = new Array<number>(ids.length).fill(0);
  const autapseCounts = new Array<number>(ids.length).fill(0);
  if (policy === 'per_unique_neighbour') {
    const incomingNeighbours = ids.map(() => new Set<string>());
    const outgoingNeighbours = ids.map(() => new Set<string>());
    const autapses = new Set<string>();
    for (let ordinal = 0; ordinal < sources.length; ordinal++) {
      const source = sources[ordinal];
      const target = targets[ordinal];
      const sourceIndex = indexById.get(source)!;
      const targetIndex = indexById.get(target)!;
      if (source === target) {
        if (!autapses.has(source)) autapseCounts[sourceIndex] = 1;
        autapses.add(source);
        if (autapseContribution === 'excluded') continue;
      }
      outgoingNeighbours[sourceIndex].add(target);
      incomingNeighbours[targetIndex].add(source);
    }
    for (let index = 0; index < ids.length; index++) {
      incoming[index] = incomingNeighbours[index].size;
      outgoing[index] = outgoingNeighbours[index].size;
    }
  } else {
    for (let ordinal = 0; ordinal < sources.length; ordinal++) {
      const sourceIndex = indexById.get(sources[ordinal])!;
      const targetIndex = indexById.get(targets[ordinal])!;
      if (sources[ordinal] === targets[ordinal]) {
        autapseCounts[sourceIndex]++;
        if (autapseContribution === 'excluded') continue;
      }
      outgoing[sourceIndex]++;
      incoming[targetIndex]++;
    }
  }
  return { incoming, outgoing, autapseCounts };
}

function graphModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const universe = record(data.nodeUniverse);
  const connections = record(data.connections);
  const ids = strings(universe.ids);
  const sources = strings(connections.sourceIds);
  const targets = strings(connections.targetIds);
  const groups = array(universe.groups).map(record);
  const groupByNode = new Map<string, string>();
  for (const group of groups) {
    for (const member of strings(group.memberIds)) groupByNode.set(member, String(group.id));
  }
  const degree = record(parameters.degreeAnnotation);
  const degreePolicy = String(degree.countingPolicy);
  const degreeValues = graphDegrees(
    ids,
    sources,
    targets,
    degreePolicy,
    String(degree.autapseContribution),
  );
  const positions = record(data.positions);
  const positionedIds = strings(positions.nodeIds);
  const positionIndex = new Map(positionedIds.map((id, index) => [id, index]));
  const sourceXs = numbers(record(positions.x).values);
  const sourceYs = numbers(record(positions.y).values);
  const xUnit = positions.x === undefined ? null : String(record(positions.x).unit);
  const yUnit = positions.y === undefined ? null : String(record(positions.y).unit);
  const positionUnit = xUnit !== null && yUnit !== null
    ? xUnit === yUnit || conversionFactor(yUnit, xUnit) >= 1 ? xUnit : yUnit
    : null;
  const xs = positionUnit !== null && xUnit !== positionUnit
    ? sourceXs.map((value) => convert(value, xUnit!, positionUnit))
    : sourceXs;
  const ys = positionUnit !== null && yUnit !== positionUnit
    ? sourceYs.map((value) => convert(value, yUnit!, positionUnit))
    : sourceYs;
  const layoutMode = String(record(parameters.layout).mode);
  const measured = layoutMode === 'measured_positions';
  const scopeSummary = topologyScopeSummaryCell(data.scope);
  const scopeKind = String(record(data.scope).kind);
  const nodeRows = ids.map((id, index): Cell[] => {
    const position = positionIndex.get(id);
    const totalDegree = degree.mode === undefined
      ? null
      : degreeValues.incoming[index] + degreeValues.outgoing[index] - (
        degree.autapseContribution === 'counts_once' ? degreeValues.autapseCounts[index] : 0
      );
    return [
      'node',
      id,
      groupByNode.get(id) ?? null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      degree.mode === 'in_degree' || degree.mode === 'total_degree'
        ? degreeValues.incoming[index]
        : null,
      (degree.mode === 'out_degree' || degree.mode === 'total_degree') &&
        scopeKind !== 'mpi_target_rank_local'
        ? degreeValues.outgoing[index]
        : null,
      degree.mode === undefined
        ? null
        : structuredCell({
          mode: degree.mode,
          countingPolicy: degree.countingPolicy,
          autapseContribution: degree.autapseContribution,
          ...(degree.mode === 'total_degree' ? { totalDegree } : {}),
        }),
      measured && position !== undefined ? xs[position] : null,
      measured && position !== undefined ? ys[position] : null,
      measured ? positionUnit : null,
      measured ? 'measured' : 'schematic (non-spatial)',
      scopeSummary,
    ];
  });
  const edgeIds = strings(connections.edgeIds);
  const weights = array(record(connections.weights).values);
  const delays = array(record(connections.delays).values);
  const models = strings(connections.synapseModels);
  const weightUnit = connections.weights === undefined ? null : String(record(connections.weights).unit);
  const delayUnit = connections.delays === undefined ? null : String(record(connections.delays).unit);
  const pairTotals = new Map<string, number>();
  for (let ordinal = 0; ordinal < sources.length; ordinal++) {
    const key = pairKey(sources[ordinal], targets[ordinal]);
    pairTotals.set(key, (pairTotals.get(key) ?? 0) + 1);
  }
  const pairSeen = new Map<string, number>();
  const edgeRows = sources.map((source, ordinal): Cell[] => {
    const key = pairKey(source, targets[ordinal]);
    const parallelIndex = (pairSeen.get(key) ?? 0) + 1;
    pairSeen.set(key, parallelIndex);
    return [
      'connection',
      edgeIds[ordinal] ?? null,
      null,
      source,
      targets[ordinal],
      booleanCell(source === targets[ordinal]),
      parallelIndex,
      pairTotals.get(key)!,
      typeof weights[ordinal] === 'number' ? weights[ordinal] : null,
      weightUnit,
      typeof delays[ordinal] === 'number' ? delays[ordinal] : null,
      delayUnit,
      models[ordinal] ?? null,
      null,
      null,
      null,
      null,
      null,
      null,
      measured ? 'measured' : 'schematic (non-spatial)',
      scopeSummary,
    ];
  });

  const edges = sources.map((sourceId, sourceOrdinal) => ({
    id: edgeIds[sourceOrdinal] ?? `source-row-${sourceOrdinal}`,
    sourceId,
    targetId: targets[sourceOrdinal],
    sourceOrdinal,
  }));
  const geometry: AuthorityGeometryEntryV1[] = [];
  if (record(parameters.parallelEdges).display === 'bundled') {
    const directed = new Map<string, typeof edges>();
    for (const edge of edges) {
      const key = canonicalize([edge.sourceId, edge.targetId]);
      const existing = directed.get(key);
      if (existing) existing.push(edge);
      else directed.set(key, [edge]);
    }
    for (const entries of directed.values()) {
      geometry.push(carrier('edges', {
        display: 'bundled',
        sourceId: entries[0].sourceId,
        targetId: entries[0].targetId,
        sourceOrdinals: entries.map((entry) => entry.sourceOrdinal),
        edgeIds: entries.map((entry) => entry.id),
      }));
    }
  } else {
    const unordered = new Map<string, typeof edges>();
    for (const edge of edges) {
      const key = pairKey(edge.sourceId, edge.targetId);
      const existing = unordered.get(key);
      if (existing) existing.push(edge);
      else unordered.set(key, [edge]);
    }
    for (const entries of unordered.values()) {
      for (const edge of entries) {
        geometry.push(carrier('edges', {
          display: 'separate_lane',
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          sourceOrdinals: [edge.sourceOrdinal],
          edgeIds: [edge.id],
        }));
      }
    }
  }
  for (let index = 0; index < ids.length; index++) {
    geometry.push(carrier('nodes', { nodeId: ids[index], sourceOrdinal: index }));
  }

  const connected = new Set<string>();
  let autapseCount = 0;
  for (let ordinal = 0; ordinal < sources.length; ordinal++) {
    connected.add(sources[ordinal]);
    connected.add(targets[ordinal]);
    if (sources[ordinal] === targets[ordinal]) autapseCount++;
  }
  const edgeEncoding = record(parameters.edgeValueEncoding);
  const encodedValues = edgeEncoding.mode === 'weight'
    ? weights
    : edgeEncoding.mode === 'delay'
      ? delays
      : [];
  const missingEncoded = countNulls(encodedValues);
  const conversions = measured && positionUnit !== null
    ? [
      ...(xUnit !== positionUnit ? [conversionText('x', xUnit!, positionUnit)] : []),
      ...(yUnit !== positionUnit ? [conversionText('y', yUnit!, positionUnit)] : []),
    ]
    : [];
  const bundled = record(parameters.parallelEdges).display === 'bundled';
  const directedGroups = new Set<string>();
  for (let index = 0; index < sources.length; index++) {
    directedGroups.add(canonicalize([sources[index], targets[index]]));
  }
  const aggregated = bundled && directedGroups.size < sources.length;
  const edgeValueStatement = edgeEncoding.mode === undefined
    ? 'no edge value channel is encoded'
    : `${String(edgeEncoding.mode)} on ${String(edgeEncoding.channel)} with ${String(edgeEncoding.scale ?? 'linear')} scale${typeof edgeEncoding.colorScale === 'string' ? ` and ${edgeEncoding.colorScale} colour` : ''}${typeof parameters.multapseAggregation === 'string' ? `; bundled multapses use ${parameters.multapseAggregation}` : ''}`;
  const degreeStatement = degree.mode === undefined
    ? 'no degree annotation'
    : structuredCell(degree);
  return {
    rows: [...nodeRows, ...edgeRows],
    geometry,
    summary: {
      graphLabel: String(parameters.graphLabel ?? parameters.graphId),
      nodeCount: exactText(ids.length),
      isolateCount: exactText(ids.filter((id) => !connected.has(id)).length),
      edgeCount: exactText(sources.length),
      multapseRowCount: exactText(sources.length - pairTotals.size),
      autapseCount: exactText(autapseCount),
      scopeStatement: scopeSummary,
      layoutMode,
      layoutSpatialStatement: measured
        ? `measured positions in ${String(positionUnit)}`
        : 'schematic and non-spatial',
      nodeOrder: String(universe.order ?? 'as_declared'),
      edgeValueStatement,
      degreeStatement,
      missingValueStatement: edgeEncoding.mode === undefined
        ? 'No edge value channel is encoded.'
        : missingEncoded === 0
          ? 'No encoded edge value is missing.'
          : `${missingEncoded} encoded edge values are missing and retain the reserved missing-value encoding.`,
      compactionStatement: 'No declared node or connection row was compacted.',
      tableStatement: `The complete table contains ${ids.length} node rows followed by ${sources.length} source-order connection rows.`,
    },
    disclosures: baseDisclosureFacts(request, {
      ...(conversions.length > 0 ? { unitConversions: conversions } : {}),
      ...(missingEncoded > 0 ? { missingValueCount: missingEncoded } : {}),
      ...(aggregated && typeof parameters.multapseAggregation === 'string'
        ? { multapseAggregated: true, multapseAggregation: parameters.multapseAggregation }
        : {}),
    }),
  };
}

const GRAPH_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('network.connection_graph', 2),
  (request) => modelFields(graphModel(request)),
);

function spatialModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const universe = record(data.nodeUniverse);
  const positions = record(data.positions);
  const universeIds = strings(universe.ids);
  const sourcePositionIds = strings(positions.nodeIds);
  const sourcePositionIndex = new Map(
    sourcePositionIds.map((id, index) => [id, index]),
  );
  // Canonical validation has already established exact set equality.  As in the
  // compiler, the declared universe — not source row order or string collation — is the
  // ordering authority for position/value rows and node geometry.
  const ids = [...universeIds];
  const sourceXs = numbers(record(positions.x).values);
  const sourceYs = numbers(record(positions.y).values);
  const xUnit = String(record(positions.x).unit);
  const yUnit = String(record(positions.y).unit);
  const positionUnit = xUnit === yUnit || conversionFactor(yUnit, xUnit) >= 1 ? xUnit : yUnit;
  const convertedSourceXs = xUnit === positionUnit
    ? sourceXs
    : sourceXs.map((value) => convert(value, xUnit, positionUnit));
  const convertedSourceYs = yUnit === positionUnit
    ? sourceYs
    : sourceYs.map((value) => convert(value, yUnit, positionUnit));
  const xs = ids.map((id) => convertedSourceXs[sourcePositionIndex.get(id)!]);
  const ys = ids.map((id) => convertedSourceYs[sourcePositionIndex.get(id)!]);
  const positionIndex = new Map(ids.map((id, index) => [id, index]));
  const groupByNode = new Map<string, string>();
  for (const group of array(universe.groups).map(record)) {
    for (const member of strings(group.memberIds)) groupByNode.set(member, String(group.id));
  }
  const domain = record(positions.domain);
  const center = record(domain.center);
  const extent = record(domain.extent);
  const hasDomain = domain.center !== undefined && domain.extent !== undefined;
  const canonicalCenterX = hasDomain
    ? convert(Number(record(center.x).value), String(record(center.x).unit), positionUnit)
    : 0;
  const canonicalCenterY = hasDomain
    ? convert(Number(record(center.y).value), String(record(center.y).unit), positionUnit)
    : 0;
  const canonicalWidth = hasDomain
    ? convert(Number(record(extent.width).value), String(record(extent.width).unit), positionUnit)
    : 0;
  const canonicalHeight = hasDomain
    ? convert(Number(record(extent.height).value), String(record(extent.height).unit), positionUnit)
    : 0;
  const domainAxisX = hasDomain ? spatialDomainAxis(canonicalCenterX, canonicalWidth) : null;
  const domainAxisY = hasDomain ? spatialDomainAxis(canonicalCenterY, canonicalHeight) : null;
  const boundary = record(domain.boundary);
  const domainBounds: SpatialRoutingDomain | null = domainAxisX && domainAxisY
    ? {
      xMin: domainAxisX.lower,
      xMax: domainAxisX.upper,
      yMin: domainAxisY.lower,
      yMax: domainAxisY.upper,
      centerX: canonicalCenterX,
      centerY: canonicalCenterY,
      periodX: canonicalWidth,
      periodY: canonicalHeight,
      periodicX: boundary.kind === 'periodic' && boundary.x === true,
      periodicY: boundary.kind === 'periodic' && boundary.y === true,
      edgeChordRule: boundary.kind === 'periodic'
        ? String(boundary.edgeChordRule) as 'minimum_image' | 'straight_chord'
        : 'open',
    }
    : null;
  const coincident = new Map<string, string[]>();
  for (let index = 0; index < ids.length; index++) {
    const key = canonicalize([xs[index], ys[index]]);
    const existing = coincident.get(key);
    if (existing) existing.push(ids[index]);
    else coincident.set(key, [ids[index]]);
  }
  const value = record(positions.value);
  const sourceValueValues = array(value.values);
  const valueValues = positions.value === undefined
    ? []
    : ids.map((id) => sourceValueValues[sourcePositionIndex.get(id)!]);
  const scopeSummary = topologyScopeSummaryCell(data.scope);
  const nodeRows = universeIds.map((nodeId): Cell[] => {
    const index = positionIndex.get(nodeId);
    const missing = index === undefined;
    const x = missing ? null : xs[index];
    const y = missing ? null : ys[index];
    const sharing = missing
      ? []
      : (coincident.get(canonicalize([x, y])) ?? []).filter((id) => id !== nodeId);
    return [
      'node',
      nodeId,
      groupByNode.get(nodeId) ?? 'ungrouped',
      x,
      y,
      missing ? null : positionUnit,
      missing ? null : String(positions.status),
      booleanCell(missing),
      domainBounds === null || missing
        ? null
        : booleanCell(
          spatialDomainAxisContains(domainAxisX!, x!) &&
          spatialDomainAxisContains(domainAxisY!, y!),
        ),
      sharing.length > 0 ? structuredCell(sharing) : null,
      missing || positions.value === undefined || valueValues[index] === null
        ? null
        : valueValues[index] as number,
      positions.value === undefined ? null : String(value.unit),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      scopeSummary,
    ];
  });
  const connections = record(data.connections);
  const sources = strings(connections.sourceIds);
  const targets = strings(connections.targetIds);
  const callerEdgeIds = strings(connections.edgeIds);
  const edgeIds = sources.map((_source, index) => callerEdgeIds[index] ?? `connection-row-${index}`);
  const weights = array(record(connections.weights).values);
  const delays = array(record(connections.delays).values);
  const models = strings(connections.synapseModels);
  const weightUnit = connections.weights === undefined ? null : String(record(connections.weights).unit);
  const delayUnit = connections.delays === undefined ? null : String(record(connections.delays).unit);
  const universeOrdinal = new Map(universeIds.map((id, index) => [id, index]));
  const canonicalPair = (source: string, target: string): readonly [string, string] =>
    universeOrdinal.get(source)! <= universeOrdinal.get(target)!
      ? [source, target]
      : [target, source];
  const spatialPairKey = (source: string, target: string): string =>
    canonicalize(canonicalPair(source, target));
  const totals = new Map<string, number>();
  for (let index = 0; index < sources.length; index++) {
    const key = spatialPairKey(sources[index], targets[index]);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  const routes = new Map<string, SpatialChordRoute>();
  for (let index = 0; index < sources.length; index++) {
    const key = spatialPairKey(sources[index], targets[index]);
    if (routes.has(key)) continue;
    const [physicalSourceId, physicalTargetId] = canonicalPair(
      sources[index],
      targets[index],
    );
    const sourceIndex = positionIndex.get(physicalSourceId)!;
    const targetIndex = positionIndex.get(physicalTargetId)!;
    routes.set(key, classifySpatialChord(
      { x: xs[sourceIndex], y: ys[sourceIndex] },
      { x: xs[targetIndex], y: ys[targetIndex] },
      domainBounds ?? undefined,
      physicalSourceId === physicalTargetId,
    ));
  }
  let minimumImageTieChordCount = 0;
  let minimumImageTieAxisCount = 0;
  for (const route of routes.values()) {
    const axes = Number(route.halfPeriodTieX) + Number(route.halfPeriodTieY);
    if (axes > 0) minimumImageTieChordCount++;
    minimumImageTieAxisCount += axes;
  }
  const edgeRows = sources.map((source, index): Cell[] => [
    'connection',
    edgeIds[index],
    'not_applicable',
    null,
    null,
    null,
    null,
    'not_applicable',
    null,
    null,
    null,
    null,
    source,
    targets[index],
    routes.get(spatialPairKey(source, targets[index]))!.pathKind,
    totals.get(spatialPairKey(source, targets[index]))!,
    typeof weights[index] === 'number' ? weights[index] : null,
    weightUnit,
    typeof delays[index] === 'number' ? delays[index] : null,
    delayUnit,
    models[index] ?? null,
      scopeSummary,
  ]);

  const geometry: AuthorityGeometryEntryV1[] = [];
  const pairs = new Map<string, number[]>();
  for (let index = 0; index < sources.length; index++) {
    const key = spatialPairKey(sources[index], targets[index]);
    const existing = pairs.get(key);
    if (existing) existing.push(index);
    else pairs.set(key, [index]);
  }
  for (const ordinals of pairs.values()) {
    const directions = new Map<string, number[]>();
    for (const ordinal of ordinals) {
      const key = canonicalize([sources[ordinal], targets[ordinal]]);
      const existing = directions.get(key);
      if (existing) existing.push(ordinal);
      else directions.set(key, [ordinal]);
    }
    for (const directionOrdinals of directions.values()) {
      const first = directionOrdinals[0];
      geometry.push(carrier('connections', {
        sourceId: sources[first],
        targetId: targets[first],
        sourceOrdinals: directionOrdinals,
        edgeIds: directionOrdinals.map((ordinal) => edgeIds[ordinal]),
      }));
    }
  }
  for (let index = 0; index < ids.length; index++) {
    geometry.push(carrier('nodes', { nodeId: ids[index], sourceOrdinal: index }));
  }

  let outside = 0;
  if (domainBounds) {
    for (let index = 0; index < ids.length; index++) {
      if (
        !spatialDomainAxisContains(domainAxisX!, xs[index]) ||
        !spatialDomainAxisContains(domainAxisY!, ys[index])
      ) outside++;
    }
  }
  let coincidentCount = 0;
  for (const members of coincident.values()) if (members.length > 1) coincidentCount += members.length;
  const connectionDisplay = record(parameters.connectionDisplay);
  const encodedValues = connectionDisplay.valueEncoding === 'weight'
    ? weights
    : connectionDisplay.valueEncoding === 'delay'
      ? delays
      : [];
  const explicitMissing = countNulls(valueValues) + countNulls(encodedValues);
  const conversions = [
    ...(xUnit !== positionUnit ? [conversionText('x', xUnit, positionUnit)] : []),
    ...(yUnit !== positionUnit ? [conversionText('y', yUnit, positionUnit)] : []),
  ];
  const hasAggregatedPair = encodedValues.length > 0 && totals.size < sources.length;
  const frame = record(positions.frame);
  const uncertainty = record(parameters.uncertainty);
  return {
    rows: [...nodeRows, ...edgeRows],
    geometry,
    summary: {
      mapLabel: String(parameters.mapLabel ?? parameters.mapId),
      drawnNodeCount: exactText(ids.length),
      declaredNodeCount: exactText(universeIds.length),
      positionStatus: String(positions.status),
      frameId: String(frame.id),
      missingPositionCount: exactText(universeIds.length - ids.length),
      xAxisLabel: String(frame.xAxisLabel ?? 'x'),
      yAxisLabel: String(frame.yAxisLabel ?? 'y'),
      positionUnit,
      domainStatement: domainBounds
        ? `closed x [${exactText(domainBounds.xMin)}, ${exactText(domainBounds.xMax)}] and y [${exactText(domainBounds.yMin)}, ${exactText(domainBounds.yMax)}] ${positionUnit}`
        : 'no domain declared',
      boundaryStatement: domainBounds
        ? boundary.kind === 'periodic'
          ? `periodic x=${String(boundary.x)} y=${String(boundary.y)} with ${String(boundary.edgeChordRule)} edge chords`
          : String(boundary.kind)
        : 'not declared',
      minimumImageTieChordCount: exactText(minimumImageTieChordCount),
      minimumImageTieAxisCount: exactText(minimumImageTieAxisCount),
      coincidentNodeCount: exactText(coincidentCount),
      outsideDomainCount: exactText(outside),
      nodeEncodingStatement: structuredCell(parameters.nodeEncoding),
      connectionStatement: sources.length === 0
        ? 'no connections were supplied'
        : `${sources.length} source connection rows form ${pairs.size} unordered measured endpoint chords; direction groups remain explicit`,
      nodeUniverseStatement: `${universe.complete === true ? 'complete' : 'incomplete'}; order ${String(universe.order ?? 'as_declared')}`,
      scopeStatement: scopeSummary,
      uncertaintyStatement: uncertainty.kind === 'none'
        ? `No uncertainty was supplied (${String(uncertainty.reason ?? 'not_provided')}).`
        : `Uncertainty kind ${String(uncertainty.kind)} was declared.`,
      compactionStatement: 'No declared node or connection row was compacted; nodes without positions are omitted and disclosed.',
      tableStatement: `The complete table contains ${universeIds.length} node rows followed by ${sources.length} source-order connection rows.`,
    },
    disclosures: baseDisclosureFacts(request, {
      ...(conversions.length > 0 ? { unitConversions: conversions } : {}),
      ...(explicitMissing > 0 ? { missingValueCount: explicitMissing } : {}),
      ...(hasAggregatedPair && typeof parameters.multapseAggregation === 'string'
        ? { multapseAggregated: true, multapseAggregation: parameters.multapseAggregation }
        : {}),
    }),
  };
}

const SPATIAL_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('network.spatial_map_2d', 2),
  (request) => modelFields(spatialModel(request)),
);

function convertedCarrier(value: JsonValue | undefined, targetUnit: string): (number | null)[] {
  const node = record(value);
  const sourceUnit = String(node.unit);
  return nullableNumbers(node.values).map((entry) => entry === null
    ? null
    : sourceUnit === targetUnit
      ? entry
      : convert(entry, sourceUnit, targetUnit));
}

function phaseConvergenceFlags(fixed: JsonRecord): boolean[] {
  const residualDx = numbers(record(fixed.residualDxDt).values);
  const residualDy = numbers(record(fixed.residualDyDt).values);
  const toleranceDx = numbers(record(fixed.toleranceDxDt).values);
  const toleranceDy = numbers(record(fixed.toleranceDyDt).values);
  const residualDxUnit = String(record(fixed.residualDxDt).unit);
  const residualDyUnit = String(record(fixed.residualDyDt).unit);
  const toleranceDxUnit = String(record(fixed.toleranceDxDt).unit);
  const toleranceDyUnit = String(record(fixed.toleranceDyDt).unit);
  const within = (residual: number, tolerance: number): boolean =>
    residual <= tolerance ||
    residual - tolerance <= 1e-9 * Math.max(
      Math.abs(residual),
      Math.abs(tolerance),
      Number.MIN_VALUE,
    );
  return strings(fixed.ids).map((_id, index) => within(
    Math.abs(convert(residualDx[index], residualDxUnit, toleranceDxUnit)),
    toleranceDx[index],
  ) && within(
    Math.abs(convert(residualDy[index], residualDyUnit, toleranceDyUnit)),
    toleranceDy[index],
  ));
}

function phaseExtents(
  data: JsonRecord,
  xUnit: string,
  yUnit: string,
): {
  readonly xExtent: { readonly min: number; readonly max: number } | null;
  readonly yExtent: { readonly min: number; readonly max: number } | null;
} {
  const trajectories = record(data.trajectories);
  const field = record(data.vectorField);
  const nullclines = record(data.nullclines);
  const fixed = record(data.fixedPoints);
  const domain = record(field.domain);
  const domainX = record(domain.x);
  const domainY = record(domain.y);
  const finite = (values: readonly (number | null)[]): number[] =>
    values.filter((value): value is number => value !== null);
  const xs = [
    ...finite(convertedCarrier(trajectories.x, xUnit)),
    ...finite(convertedCarrier(field.x, xUnit)),
    ...finite(convertedCarrier(nullclines.x, xUnit)),
    ...finite(convertedCarrier(fixed.x, xUnit)),
    ...(domain.x === undefined ? [] : [
      convert(Number(domainX.start), String(domainX.unit), xUnit),
      convert(Number(domainX.stop), String(domainX.unit), xUnit),
    ]),
  ];
  const ys = [
    ...finite(convertedCarrier(trajectories.y, yUnit)),
    ...finite(convertedCarrier(field.y, yUnit)),
    ...finite(convertedCarrier(nullclines.y, yUnit)),
    ...finite(convertedCarrier(fixed.y, yUnit)),
    ...(domain.y === undefined ? [] : [
      convert(Number(domainY.start), String(domainY.unit), yUnit),
      convert(Number(domainY.stop), String(domainY.unit), yUnit),
    ]),
  ];
  return { xExtent: finiteExtrema(xs), yExtent: finiteExtrema(ys) };
}

function phaseRows(
  data: JsonRecord,
  parameters: JsonRecord,
  convergence: readonly boolean[],
): Cell[][] {
  const axes = record(data.axes);
  const xUnit = String(record(axes.x).unit);
  const yUnit = String(record(axes.y).unit);
  const trajectories = record(data.trajectories);
  const field = record(data.vectorField);
  const nullclines = record(data.nullclines);
  const fixed = record(data.fixedPoints);
  const extents = phaseExtents(data, xUnit, yUnit);
  const magnitudeBasis = String(parameters.magnitudeBasis ?? 'axis_normalized');
  const speed = (
    dx: number | null,
    dy: number | null,
    dxUnit: string | null,
    dyUnit: string | null,
  ): number | null => {
    if (dx === null || dy === null || dxUnit === null || dyUnit === null) return null;
    if (magnitudeBasis === 'physical') {
      if (dimensionOf(xUnit) !== dimensionOf(yUnit)) return null;
      const canonicalStateUnit = canonicalUnitFor(xUnit);
      const canonicalTimeUnit = canonicalUnitFor(dxUnit);
      if (!canonicalStateUnit || !canonicalTimeUnit) return null;
      return Math.hypot(
        dx * conversionFactor(xUnit, canonicalStateUnit) *
          conversionFactor(dxUnit, canonicalTimeUnit),
        dy * conversionFactor(yUnit, canonicalStateUnit) *
          conversionFactor(dyUnit, canonicalTimeUnit),
      );
    }
    if (
      !extents.xExtent ||
      !extents.yExtent ||
      !(extents.xExtent.max > extents.xExtent.min) ||
      !(extents.yExtent.max > extents.yExtent.min)
    ) return null;
    return Math.hypot(
      exactBinary64RatioToDifference(dx, extents.xExtent.min, extents.xExtent.max),
      exactBinary64RatioToDifference(
        convert(dy, dyUnit, dxUnit),
        extents.yExtent.min,
        extents.yExtent.max,
      ),
    );
  };
  const derivativeUnitCell = (dxUnit: string | null, dyUnit: string | null): Cell =>
    dxUnit === null && dyUnit === null
      ? null
      : structuredCell({
        x: dxUnit === null ? null : `${xUnit} ${dxUnit}`,
        y: dyUnit === null ? null : `${yUnit} ${dyUnit}`,
        magnitudeBasis,
        ...(magnitudeBasis === 'physical'
          ? { magnitudeUnit: `${canonicalUnitFor(xUnit) ?? xUnit} ${canonicalUnitFor(dxUnit ?? '') ?? dxUnit}` }
          : { magnitudeUnit: dxUnit }),
      });
  const rows: Cell[][] = [];

  if (data.trajectories !== undefined) {
    const pointIds = strings(trajectories.pointTrajectoryIds);
    const declaredIds = strings(record(trajectories.universe).ids);
    const times = numbers(record(trajectories.times).values);
    const xs = convertedCarrier(trajectories.x, xUnit);
    const ys = convertedCarrier(trajectories.y, yUnit);
    const dxs = array(record(trajectories.dxdt).values);
    const dys = array(record(trajectories.dydt).values);
    const dxUnit = trajectories.dxdt === undefined ? null : String(record(trajectories.dxdt).unit);
    const dyUnit = trajectories.dydt === undefined ? null : String(record(trajectories.dydt).unit);
    for (let index = 0; index < pointIds.length; index++) {
      const rawDx = dxs[index];
      const rawDy = dys[index];
      const dx: number | null = typeof rawDx === 'number' ? rawDx : null;
      const dy: number | null = typeof rawDy === 'number' ? rawDy : null;
      rows.push([
        'trajectory_point', pointIds[index], index, times[index],
        xs[index] ?? null, ys[index] ?? null, dx, dy,
        derivativeUnitCell(dxUnit, dyUnit), speed(dx, dy, dxUnit, dyUnit),
        null, null, null,
      ]);
    }
    const represented = new Set(pointIds);
    for (const id of declaredIds) {
      if (!represented.has(id)) {
        rows.push(['trajectory_point', id, null, null, null, null, null, null, null, null, null, null, null]);
      }
    }
  }
  if (data.vectorField !== undefined) {
    const xs = convertedCarrier(field.x, xUnit).filter((value): value is number => value !== null);
    const ys = convertedCarrier(field.y, yUnit).filter((value): value is number => value !== null);
    const dxs = numbers(record(field.dx).values);
    const dys = numbers(record(field.dy).values);
    const dxUnit = String(record(field.dx).unit);
    const dyUnit = String(record(field.dy).unit);
    for (let index = 0; index < xs.length; index++) {
      rows.push([
        'field_sample', null, index, null, xs[index], ys[index], dxs[index], dys[index],
        derivativeUnitCell(dxUnit, dyUnit), speed(dxs[index], dys[index], dxUnit, dyUnit),
        null, null, null,
      ]);
    }
  }
  if (data.nullclines !== undefined) {
    const pointIds = strings(nullclines.pointCurveIds);
    const xs = convertedCarrier(nullclines.x, xUnit);
    const ys = convertedCarrier(nullclines.y, yUnit);
    const curveIds = strings(nullclines.curveIds);
    const methods = array(nullclines.methods).map(record);
    const methodById = new Map(curveIds.map((id, index) => [id, methods[index]]));
    for (let index = 0; index < pointIds.length; index++) {
      const method = methodById.get(pointIds[index]) ?? {};
      rows.push([
        'nullcline_point', pointIds[index], index, null, xs[index] ?? null, ys[index] ?? null,
        null, null, null, null, String(method.kind), structuredCell(method.residualTolerance), null,
      ]);
    }
  }
  if (data.fixedPoints !== undefined) {
    const ids = strings(fixed.ids);
    const xs = convertedCarrier(fixed.x, xUnit).filter((value): value is number => value !== null);
    const ys = convertedCarrier(fixed.y, yUnit).filter((value): value is number => value !== null);
    const methods = strings(fixed.methods);
    const residualDx = numbers(record(fixed.residualDxDt).values);
    const residualDy = numbers(record(fixed.residualDyDt).values);
    const toleranceDx = numbers(record(fixed.toleranceDxDt).values);
    const toleranceDy = numbers(record(fixed.toleranceDyDt).values);
    const residualDxUnit = String(record(fixed.residualDxDt).unit);
    const residualDyUnit = String(record(fixed.residualDyDt).unit);
    const toleranceDxUnit = String(record(fixed.toleranceDxDt).unit);
    const toleranceDyUnit = String(record(fixed.toleranceDyDt).unit);
    for (let index = 0; index < ids.length; index++) {
      rows.push([
        'fixed_point', ids[index], index, null, xs[index], ys[index], null, null, null, null,
        methods[index],
        structuredCell({
          dxdt: { value: residualDx[index], unit: residualDxUnit },
          dydt: { value: residualDy[index], unit: residualDyUnit },
          toleranceDxDt: { value: toleranceDx[index], unit: toleranceDxUnit },
          toleranceDyDt: { value: toleranceDy[index], unit: toleranceDyUnit },
        }),
        booleanCell(convergence[index]),
      ]);
    }
  }
  return rows;
}

function orderedPathCarrierOrdinals(
  ownerIds: readonly string[],
  ownerId: string,
  xs: readonly (number | null)[],
  ys: readonly (number | null)[],
): number[] {
  const runs: number[][] = [];
  let current: number[] = [];
  for (let sourceOrdinal = 0; sourceOrdinal < ownerIds.length; sourceOrdinal++) {
    if (ownerIds[sourceOrdinal] !== ownerId) continue;
    if (xs[sourceOrdinal] === null || ys[sourceOrdinal] === null) {
      if (current.length > 0) runs.push(current);
      current = [];
    } else current.push(sourceOrdinal);
  }
  if (current.length > 0) runs.push(current);
  return [
    ...runs.filter((run) => run.length >= 2).flat(),
    ...runs.filter((run) => run.length === 1).flat(),
  ];
}

function phaseModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const axes = record(data.axes);
  const xAxis = record(axes.x);
  const yAxis = record(axes.y);
  const xUnit = String(xAxis.unit);
  const yUnit = String(yAxis.unit);
  const trajectories = record(data.trajectories);
  const field = record(data.vectorField);
  const nullclines = record(data.nullclines);
  const fixed = record(data.fixedPoints);
  const convergence = phaseConvergenceFlags(fixed);
  const rows = phaseRows(data, parameters, convergence);
  const geometry: AuthorityGeometryEntryV1[] = [];
  if (data.vectorField !== undefined) {
    const dxs = numbers(record(field.dx).values);
    for (let index = 0; index < dxs.length; index++) {
      geometry.push(carrier('field_vectors', { sourceOrdinal: index, role: 'field_sample' }));
    }
  }
  if (data.nullclines !== undefined) {
    const ids = strings(nullclines.curveIds);
    const ownerIds = strings(nullclines.pointCurveIds);
    const xs = nullableNumbers(record(nullclines.x).values);
    const ys = nullableNumbers(record(nullclines.y).values);
    for (const id of ids) {
      for (const sourceOrdinal of orderedPathCarrierOrdinals(ownerIds, id, xs, ys)) {
        geometry.push(carrier('nullclines', { curveId: id, sourceOrdinal }));
      }
    }
  }
  if (data.trajectories !== undefined) {
    const ids = strings(record(trajectories.universe).ids);
    const ownerIds = strings(trajectories.pointTrajectoryIds);
    const xs = nullableNumbers(record(trajectories.x).values);
    const ys = nullableNumbers(record(trajectories.y).values);
    for (const id of ids) {
      for (const sourceOrdinal of orderedPathCarrierOrdinals(ownerIds, id, xs, ys)) {
        geometry.push(carrier('trajectories', { trajectoryId: id, sourceOrdinal }));
      }
    }
  }
  if (data.fixedPoints !== undefined) {
    const ids = strings(fixed.ids);
    for (let index = 0; index < ids.length; index++) {
      geometry.push(carrier('fixed_points', { fixedPointId: ids[index], sourceOrdinal: index }));
    }
  }

  const conversions: string[] = [];
  const noteConversion = (label: string, value: JsonValue | undefined, target: string): void => {
    if (value === undefined) return;
    const source = String(record(value).unit);
    if (source !== target) conversions.push(conversionText(label, source, target));
  };
  noteConversion('trajectory x', trajectories.x, xUnit);
  noteConversion('trajectory y', trajectories.y, yUnit);
  noteConversion('vector-field x', field.x, xUnit);
  noteConversion('vector-field y', field.y, yUnit);
  noteConversion('nullcline x', nullclines.x, xUnit);
  noteConversion('nullcline y', nullclines.y, yUnit);
  noteConversion('fixed-point x', fixed.x, xUnit);
  noteConversion('fixed-point y', fixed.y, yUnit);
  const trajectoryXs = nullableNumbers(record(trajectories.x).values);
  const trajectoryYs = nullableNumbers(record(trajectories.y).values);
  const nullclineXs = nullableNumbers(record(nullclines.x).values);
  const nullclineYs = nullableNumbers(record(nullclines.y).values);
  let missingPointCount = 0;
  for (let index = 0; index < trajectoryXs.length; index++) {
    if (trajectoryXs[index] === null || trajectoryYs[index] === null) missingPointCount++;
  }
  for (let index = 0; index < nullclineXs.length; index++) {
    if (nullclineXs[index] === null || nullclineYs[index] === null) missingPointCount++;
  }
  const times = numbers(record(trajectories.times).values);
  const fieldDomain = record(field.domain);
  const domainX = record(fieldDomain.x);
  const domainY = record(fieldDomain.y);
  const timeDirection = data.trajectories === undefined
    ? 'not supplied'
    : String(trajectories.timeDirection);
  const uncertainty = record(parameters.uncertainty);
  return {
    rows,
    geometry,
    summary: {
      yLabel: String(yAxis.label ?? 'y'),
      yUnit,
      xLabel: String(xAxis.label ?? 'x'),
      xUnit,
      trajectoryCount: exactText(strings(record(trajectories.universe).ids).length),
      trajectoryPointCount: exactText(strings(trajectories.pointTrajectoryIds).length),
      timeStart: times.length === 0 ? 'not supplied' : exactText(times[0]),
      timeStop: times.length === 0 ? 'not supplied' : exactText(times[times.length - 1]),
      timeUnit: times.length === 0 ? 'not supplied' : String(record(trajectories.times).unit),
      timeDirection,
      fieldSampleCount: exactText(numbers(record(field.x).values).length),
      latticeKind: data.vectorField === undefined ? 'not supplied' : String(record(field.lattice).kind),
      xDomainStart: field.domain === undefined
        ? 'not supplied'
        : exactText(convert(Number(domainX.start), String(domainX.unit), xUnit)),
      xDomainStop: field.domain === undefined
        ? 'not supplied'
        : exactText(convert(Number(domainX.stop), String(domainX.unit), xUnit)),
      yDomainStart: field.domain === undefined
        ? 'not supplied'
        : exactText(convert(Number(domainY.start), String(domainY.unit), yUnit)),
      yDomainStop: field.domain === undefined
        ? 'not supplied'
        : exactText(convert(Number(domainY.stop), String(domainY.unit), yUnit)),
      arrowScalingMode: data.vectorField === undefined
        ? 'not supplied'
        : String(record(parameters.arrowScaling).mode),
      magnitudeBasis: data.vectorField === undefined
        ? 'not supplied'
        : String(parameters.magnitudeBasis),
      nullclineCount: exactText(strings(nullclines.curveIds).length),
      fixedPointCount: exactText(strings(fixed.ids).length),
      missingStatement: missingPointCount === 0
        ? 'No supplied trajectory or nullcline point has a missing coordinate.'
        : `${missingPointCount} supplied path points have a missing coordinate and break their path; missing is never zero.`,
      uncertaintyStatement: uncertainty.kind === 'none'
        ? `No uncertainty was supplied (${String(uncertainty.reason ?? 'not_provided')}).`
        : `Uncertainty kind ${String(uncertainty.kind)} was declared.`,
    },
    disclosures: baseDisclosureFacts(request, {
      ...(conversions.length > 0 ? { unitConversions: conversions } : {}),
      ...(missingPointCount > 0 ? { missingValueCount: missingPointCount } : {}),
    }),
  };
}

const PHASE_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.phase_plane', 2),
  (request) => modelFields(phaseModel(request)),
);

type ResponseEstimator = 'mean' | 'median' | 'trimmed_mean';

interface IndependentResponseRepeat {
  readonly conditionId: string;
  readonly repeatId: string;
  readonly response: number | null;
  readonly sourceOrdinal: number;
  readonly estimatorRole: 'retained' | 'trimmed_low' | 'trimmed_high' | 'undefined';
}

interface IndependentResponseCondition {
  readonly conditionId: string;
  readonly conditionLabel: string;
  readonly input: number | null;
  readonly displayOrdinal: number;
  readonly estimate: number | null;
  readonly sampleCount: number | null;
  readonly retainedCount: number;
  readonly trimmedCount: number;
  readonly excludedCount: number;
  readonly attemptedCount: number;
  readonly repeats: readonly IndependentResponseRepeat[];
}

interface IndependentResponseCurve {
  readonly axis: 'numeric' | 'ordinal' | 'nominal';
  readonly inputScale: string | null;
  readonly conditions: readonly IndependentResponseCondition[];
  readonly attemptedCount: number;
  readonly retainedCount: number;
  readonly trimmedCount: number;
  readonly excludedCount: number;
  readonly conditionsWithoutEstimate: number;
}

function responseEstimate(
  values: readonly number[],
  estimator: ResponseEstimator,
  trimFraction: number | undefined,
): number | null {
  if (values.length === 0) return null;
  if (estimator === 'mean') return exactBinary64Mean(values);
  const ordered = [...values].sort((left, right) => left - right);
  if (estimator === 'median') {
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 === 1
      ? ordered[middle]
      : exactBinary64Mean([ordered[middle - 1], ordered[middle]]);
  }
  const trim = floorExactBinary64TimesSafeInteger(trimFraction!, ordered.length);
  return exactBinary64Mean(ordered.slice(trim, ordered.length - trim));
}

function independentResponseCurve(
  data: JsonRecord,
  parameters: JsonRecord,
  response: JsonRecord,
): IndependentResponseCurve {
  const conditions = record(data.conditions);
  const axis = String(conditions.axis) as IndependentResponseCurve['axis'];
  const conditionIds = strings(conditions.ids);
  const labels = strings(conditions.labels);
  const input = record(conditions.input);
  const inputs = numbers(input.values);
  const order = conditionIds.map((_id, index) => index);
  if (axis === 'numeric') {
    order.sort((left, right) => inputs[left] - inputs[right] || left - right);
  }
  const displayOrdinal = new Map<number, number>();
  order.forEach((declared, display) => displayOrdinal.set(declared, display));
  const indexById = new Map(conditionIds.map((id, index) => [id, index]));
  const estimator = String(parameters.estimator) as ResponseEstimator;
  const responseMethod = String(response.method);
  const mode = String(data.mode);
  const observations = record(data.observations);
  const aggregates = record(data.aggregates);
  const rawResponses = nullableNumbers(response.values).map((value) => value === 0 ? 0 : value);
  const repeatsByCondition = conditionIds.map((): IndependentResponseRepeat[] => []);
  const peakCounts = nullableNumbers(record(response.audit).peakBinCounts);
  const peakAuditPresent = record(response.audit).peakBinCounts !== undefined;
  const basis = record(response.basis);
  const eventScope = verifyResponseEventScope(data.eventScope);
  if (!eventScope.ok) throw new Error('validated response event scope was not independently recognized');
  const rate = responseMethod === 'mean_firing_rate' || responseMethod === 'peak_firing_rate'
    ? verifyResponseRateAuthority(response.rateNormalization, data.eventScope)
    : null;
  const hasBinnedPeakAudit = peakAuditPresent && mode === 'repeats' &&
    responseMethod === 'peak_firing_rate' &&
    basis.estimator === 'binned_count' &&
    peakCounts.length === rawResponses.length &&
    rate?.ok === true;
  if (mode === 'repeats') {
    const ownerIds = strings(observations.conditionIds);
    const repeatIds = strings(observations.repeatIds);
    for (let sourceOrdinal = 0; sourceOrdinal < rawResponses.length; sourceOrdinal++) {
      const declared = indexById.get(ownerIds[sourceOrdinal]);
      if (declared === undefined) throw new Error('validated repeat references an unknown condition');
      repeatsByCondition[declared].push({
        conditionId: ownerIds[sourceOrdinal],
        repeatId: repeatIds[sourceOrdinal],
        response: rawResponses[sourceOrdinal],
        sourceOrdinal,
        estimatorRole: rawResponses[sourceOrdinal] === null ? 'undefined' : 'retained',
      });
    }
    for (const rows of repeatsByCondition) {
      rows.sort((left, right) =>
        compareUtf16CodeUnits(left.repeatId, right.repeatId) ||
        left.sourceOrdinal - right.sourceOrdinal);
    }
  }

  const results: IndependentResponseCondition[] = [];
  let attemptedCount = 0;
  let retainedCount = 0;
  let trimmedCount = 0;
  let excludedCount = 0;
  let conditionsWithoutEstimate = 0;
  const aggregateSamples = nullableNumbers(aggregates.sampleCounts);
  const aggregateExcluded = numbers(aggregates.excludedCounts);
  const aggregateTrimmed = numbers(aggregates.trimmedCounts);
  for (const declaredOrdinal of order) {
    const rows = repeatsByCondition[declaredOrdinal];
    let estimate: number | null;
    let sampleCount: number | null;
    let retained: number;
    let trimmed: number;
    let excluded: number;
    let attempted: number;
    let resultRows: readonly IndependentResponseRepeat[];
    if (mode === 'repeats') {
      const defined = rows
        .filter((row): row is IndependentResponseRepeat & { readonly response: number } =>
          row.response !== null)
        .sort((left, right) => {
          const leftValue = hasBinnedPeakAudit ? peakCounts[left.sourceOrdinal]! : left.response;
          const rightValue = hasBinnedPeakAudit ? peakCounts[right.sourceOrdinal]! : right.response;
          return leftValue - rightValue ||
            compareUtf16CodeUnits(left.repeatId, right.repeatId) ||
            left.sourceOrdinal - right.sourceOrdinal;
        });
      const trimPerTail = estimator === 'trimmed_mean'
        ? floorExactBinary64TimesSafeInteger(Number(parameters.trimFraction), defined.length)
        : 0;
      const roleByOrdinal = new Map<number, IndependentResponseRepeat['estimatorRole']>();
      for (let index = 0; index < defined.length; index++) {
        roleByOrdinal.set(
          defined[index].sourceOrdinal,
          index < trimPerTail
            ? 'trimmed_low'
            : index >= defined.length - trimPerTail
              ? 'trimmed_high'
              : 'retained',
        );
      }
      resultRows = rows.map((row) => ({
        ...row,
        estimatorRole: row.response === null
          ? 'undefined'
          : roleByOrdinal.get(row.sourceOrdinal)!,
      }));
      retained = defined.length - 2 * trimPerTail;
      trimmed = 2 * trimPerTail;
      excluded = rows.length - defined.length;
      attempted = rows.length;
      sampleCount = retained;
      if (hasBinnedPeakAudit) {
        const orderedCounts = defined.map((row) => peakCounts[row.sourceOrdinal]!);
        let estimatorCounts: readonly number[];
        if (estimator === 'median') {
          const middle = Math.floor(orderedCounts.length / 2);
          estimatorCounts = orderedCounts.length === 0
            ? []
            : orderedCounts.length % 2 === 1
              ? [orderedCounts[middle]]
              : [orderedCounts[middle - 1], orderedCounts[middle]];
        } else {
          estimatorCounts = orderedCounts.slice(trimPerTail, orderedCounts.length - trimPerTail);
        }
        if (estimatorCounts.length === 0) estimate = null;
        else {
          let total = 0n;
          for (const count of estimatorCounts) total += BigInt(count);
          const width = record(basis.binWidth);
          estimate = deriveExactAggregateCountRateInUnit(
            total,
            rate.integerDivisor,
            estimatorCounts.length,
            Number(width.value),
            String(width.unit),
            String(response.unit),
          );
        }
      } else {
        estimate = responseEstimate(
          defined.map((row) => row.response),
          estimator,
          typeof parameters.trimFraction === 'number' ? parameters.trimFraction : undefined,
        );
      }
    } else {
      estimate = rawResponses[declaredOrdinal];
      sampleCount = aggregateSamples[declaredOrdinal];
      retained = sampleCount ?? 0;
      trimmed = aggregateTrimmed[declaredOrdinal] ?? 0;
      excluded = aggregateExcluded[declaredOrdinal];
      attempted = retained + trimmed + excluded;
      resultRows = [];
    }
    attemptedCount += attempted;
    retainedCount += retained;
    trimmedCount += trimmed;
    excludedCount += excluded;
    if (estimate === null) conditionsWithoutEstimate++;
    results.push({
      conditionId: conditionIds[declaredOrdinal],
      conditionLabel: labels[declaredOrdinal] ?? conditionIds[declaredOrdinal],
      input: axis === 'numeric' ? inputs[declaredOrdinal] : null,
      displayOrdinal: displayOrdinal.get(declaredOrdinal)!,
      estimate,
      sampleCount,
      retainedCount: retained,
      trimmedCount: trimmed,
      excludedCount: excluded,
      attemptedCount: attempted,
      repeats: resultRows,
    });
  }
  return {
    axis,
    inputScale: axis === 'numeric' ? String(input.scale ?? 'linear') : null,
    conditions: results,
    attemptedCount,
    retainedCount,
    trimmedCount,
    excludedCount,
    conditionsWithoutEstimate,
  };
}

function responseRateText(
  authority: Extract<ReturnType<typeof verifyResponseRateAuthority>, { readonly ok: true }>,
): string {
  if (authority.normalization === 'single_train_rate') {
    return 'single_train_rate (one event train; integer divisor 1)';
  }
  const count = authority.eventScope.recordedSenderCount as number;
  if (authority.normalization === 'total_event_rate') {
    return `total_event_rate (pooled total over ${count} recorded sender${count === 1 ? '' : 's'}; integer divisor 1)`;
  }
  return `mean_rate_per_recorded_sender (pooled total divided by ${count} recorded sender${count === 1 ? '' : 's'})`;
}

function responseMembershipText(authority: ResponseEventScopeAuthority): string {
  if (authority.membershipKind === 'single_train_selection_rule') {
    return 'single_train_selection_rule (source composition not bound)';
  }
  const binding = record(authority.normalizedScope.membershipBinding as JsonValue);
  if (authority.membershipKind === 'explicit_sender_ids') {
    const ids = strings(binding.senderIds);
    return `explicit_sender_ids (${ids.length} unique ids; ${RESPONSE_EVENT_MEMBERSHIP_CANONICALIZATION_ID}; canonical membership digest ${responseEventMembershipDigest(ids)})`;
  }
  if (authority.membershipKind === 'canonical_sender_ids_digest') {
    return `canonical_sender_ids_digest (${String(binding.canonicalization)}; ${String(binding.digest)}; preimage unavailable)`;
  }
  return 'cardinality_only (member identities not bound)';
}

function responseScopeText(authority: ResponseEventScopeAuthority): string {
  const cardinality = authority.recordedSenderCount === null
    ? `${authority.selectedEventTrainCount} selected event train; no recorded-sender cardinality declared`
    : `${authority.selectedEventTrainCount} selected sender event train${authority.selectedEventTrainCount === 1 ? '' : 's'} (including silent senders)`;
  return `${authority.kind} selection ${authority.selectionId}; ${cardinality}; ${responseMembershipText(authority)}; declared pooling ${authority.poolingOperator}; declared completeness ${authority.eventCompleteness}`;
}

function peakSupportText(value: JsonValue | undefined): string {
  const support = record(value);
  if (support.kind === 'analytic_infinite') return 'analytic infinite support';
  if (support.kind === 'finite_full_width') {
    return `finite full-width support, ${String(support.supportBoundary)} boundary`;
  }
  if (support.kind === 'finite_cutoff') {
    const cutoff = record(support.cutoff);
    return `finite ${String(support.geometry)} cutoff ${exactText(Number(cutoff.value))} ${String(cutoff.unit ?? '')}, ${String(support.cutoffBoundary)}, ${String(support.tailPolicy)}`;
  }
  return 'unrecognized support';
}

function peakEvaluationText(value: JsonValue | undefined): string {
  const evaluation = record(value);
  if (evaluation.mode === 'continuous_supremum') {
    return `continuous supremum over ${String(evaluation.domain)} ${String(evaluation.boundary)}`;
  }
  const step = record(evaluation.step);
  return `sampled grid of ${String(evaluation.sampleCount)} points from measurement-window start, step ${exactText(Number(step.value ?? 0))} ${String(step.unit ?? '')}, ${String(evaluation.boundary)}, stop excluded, ${String(evaluation.tilingPolicy)}, partial steps ${String(evaluation.partialStepPolicy)}`;
}

function peakBasisText(value: JsonValue | undefined): string {
  const basis = record(value);
  if (basis.estimator === 'binned_count') {
    const width = record(basis.binWidth);
    return `binned-count peak over ${String(basis.binCount)} bins with exact physical exposure ${exactText(Number(width.value))} ${String(width.unit ?? '')} verified for every emitted interval, origin ${String(basis.origin)}, ${String(basis.boundary)}, ${String(basis.tilingPolicy)}, partial bins ${String(basis.partialBinPolicy)}`;
  }
  const bandwidth = record(basis.bandwidth);
  return `${String(basis.shape)} ${String(basis.kernelForm)} kernel, ${String(basis.bandwidthDefinition)} ${exactText(Number(bandwidth.value ?? 0))} ${String(bandwidth.unit ?? '')}, ${peakSupportText(basis.support)}, ${String(basis.normalization)}, ${String(basis.evaluationOperator)}, edge policy ${String(basis.edgePolicy)}, ${peakEvaluationText(basis.evaluation)}`;
}

function responseBasisText(
  data: JsonRecord,
  parameters: JsonRecord,
  response: JsonRecord,
  authority: ResponseEventScopeAuthority,
  rate: Extract<ReturnType<typeof verifyResponseRateAuthority>, { readonly ok: true }> | null,
): string {
  const window = record(data.measurementWindow);
  const boundary = String(window.boundary ?? '[start,stop)');
  const windowBasis = `${boundary} ${exactText(Number(window.start))} to ${exactText(Number(window.stop))} ${String(window.unit)}`;
  const scope = responseScopeText(authority);
  const rateText = rate ? responseRateText(rate) : null;
  const method = String(response.method);
  const values = nullableNumbers(response.values);
  const auditRecord = record(response.audit);
  const auditPresent = auditRecord.peakBinCounts !== undefined;
  const audit = nullableNumbers(auditRecord.peakBinCounts);
  let definedAudit = 0;
  for (const count of audit) if (count !== null) definedAudit++;
  const definedValues = values.length - values.filter((value) => value === null).length;
  if (method === 'first_spike_latency') {
    return `caller-declared event scope ${scope}; latency is the first selected spike (the minimum over the superposed union for a pooled scope) from ${String(response.latencyReference ?? 'unspecified reference')}; measurement window ${windowBasis}`;
  }
  if (method === 'peak_firing_rate') {
    if (auditPresent) {
      return definedAudit > 0
        ? `caller-declared event scope ${scope}; caller-supplied exact max-bin counts after the declared sender pooling; defined repeat rates and defined ${String(parameters.estimator)} condition estimates re-derived at count level with one final rounding; ${String(rateText)}; ${peakBasisText(response.basis)}; measurement window ${windowBasis}`
        : `caller-declared event scope ${scope}; caller-supplied peak-bin count audit contained only nulls; null-mask alignment was verified, but no repeat rate or condition estimate existed to re-derive; ${String(rateText)}; ${peakBasisText(response.basis)}; measurement window ${windowBasis}`;
    }
    return definedValues > 0
      ? `caller-declared event scope ${scope}; caller-supplied peak value after the declared sender pooling; ${String(rateText)}; ${peakBasisText(response.basis)}; measurement window ${windowBasis}`
      : `caller-declared event scope ${scope}; no defined peak value was supplied; ${String(rateText)}; ${peakBasisText(response.basis)}; measurement window ${windowBasis}`;
  }
  return rateText
    ? `caller-declared event scope ${scope}; rate normalization ${rateText}; measurement window ${windowBasis}`
    : `caller-declared event scope ${scope}; measurement window ${windowBasis}`;
}

function responseModel(requestValue: JsonValue): AuthorityModel {
  const request = record(requestValue);
  const data = record(request.data);
  const parameters = record(request.parameters);
  const mode = String(data.mode);
  const conditions = record(data.conditions);
  const input = record(conditions.input);
  const response = record(mode === 'repeats'
    ? record(data.observations).response
    : record(data.aggregates).response);
  const curve = independentResponseCurve(data, parameters, response);
  const eventScopeResult = verifyResponseEventScope(data.eventScope);
  if (!eventScopeResult.ok) throw new Error('validated response event scope was not independently recognized');
  const eventScope = eventScopeResult.authority;
  const method = String(response.method);
  const rateResult = method === 'mean_firing_rate' || method === 'peak_firing_rate'
    ? verifyResponseRateAuthority(response.rateNormalization, data.eventScope)
    : null;
  if (rateResult !== null && !rateResult.ok) {
    throw new Error('validated response rate normalization was not independently recognized');
  }
  const rate = rateResult?.ok === true ? rateResult : null;
  const responseBasis = responseBasisText(data, parameters, response, eventScope, rate);
  const responseUnit = String(response.unit);
  const inputUnit = curve.axis === 'numeric' ? String(input.unit) : null;
  const auditPeakCounts = nullableNumbers(record(response.audit).peakBinCounts);
  let definedPeakCount = 0;
  for (const count of auditPeakCounts) if (count !== null) definedPeakCount++;
  const hasDefinedPeakAudit = definedPeakCount > 0;
  const rows: Cell[][] = [];
  for (const condition of curve.conditions) {
    if (mode === 'repeats') {
      for (const repeat of condition.repeats) {
        rows.push([
          condition.conditionId,
          condition.conditionLabel,
          condition.input,
          inputUnit,
          repeat.repeatId,
          repeat.response,
          responseUnit,
          method,
          rate?.normalization ?? null,
          eventScope.recordedSenderCount,
          booleanCell(repeat.response === null),
          null,
          null,
          null,
          responseBasis,
          null,
          null,
          null,
          null,
          null,
          repeat.estimatorRole,
          null,
          auditPeakCounts[repeat.sourceOrdinal] ?? null,
          repeat.response !== null && hasDefinedPeakAudit
            ? 'exact_peak_bin_count_to_condition_estimator_rate_one_round'
            : null,
          eventScope.kind,
          eventScope.selectionId,
          responseMembershipText(eventScope),
          eventScope.selectedEventTrainCount,
        ]);
      }
    }
    rows.push([
      condition.conditionId,
      condition.conditionLabel,
      condition.input,
      inputUnit,
      null,
      condition.estimate,
      responseUnit,
      method,
      rate?.normalization ?? null,
      eventScope.recordedSenderCount,
      booleanCell(condition.estimate === null),
      String(parameters.estimator),
      condition.sampleCount,
      condition.excludedCount,
      responseBasis,
      String(record(parameters.uncertainty).kind ?? 'none'),
      null,
      null,
      null,
      null,
      'aggregate_estimate',
      condition.trimmedCount,
      null,
      condition.estimate !== null && hasDefinedPeakAudit
        ? 'exact_peak_bin_count_to_condition_estimator_rate_one_round'
        : null,
      eventScope.kind,
      eventScope.selectionId,
      responseMembershipText(eventScope),
      eventScope.selectedEventTrainCount,
    ]);
  }

  const geometry: AuthorityGeometryEntryV1[] = [];
  for (const condition of curve.conditions) {
    if (condition.estimate === null) {
      geometry.push(carrier('conditions', {
        conditionId: condition.conditionId,
        displayOrdinal: condition.displayOrdinal,
        role: 'undefined_condition',
      }));
    }
  }
  if (curve.axis !== 'nominal') {
    let run: IndependentResponseCondition[] = [];
    const runs: IndependentResponseCondition[][] = [];
    for (const condition of curve.conditions) {
      if (condition.estimate === null) {
        if (run.length >= 2) runs.push(run);
        run = [];
      } else run.push(condition);
    }
    if (run.length >= 2) runs.push(run);
    for (const path of runs) {
      for (const condition of path) {
        geometry.push(carrier('series_paths', {
          conditionId: condition.conditionId,
          displayOrdinal: condition.displayOrdinal,
          role: 'ordered_guide_vertex',
        }));
      }
    }
  }
  for (const condition of curve.conditions) {
    if (condition.estimate !== null) {
      geometry.push(carrier('conditions', {
        conditionId: condition.conditionId,
        displayOrdinal: condition.displayOrdinal,
        role: 'condition_estimate',
      }));
    }
  }

  const estimates = curve.conditions
    .map((condition) => condition.estimate)
    .filter((value): value is number => value !== null);
  const extent = finiteExtrema(estimates);
  const window = record(data.measurementWindow);
  const uncertainty = record(parameters.uncertainty);
  const aggregateCounts = curve.conditions
    .map((condition) => condition.retainedCount)
    .filter((count) => count > 0);
  let aggregateSampleBase = '0 retained in every condition';
  if (aggregateCounts.length > 0) {
    const aggregateExtent = finiteExtrema(aggregateCounts)!;
    aggregateSampleBase = aggregateExtent.min === aggregateExtent.max
      ? exactText(aggregateExtent.min)
      : `${aggregateExtent.min}-${aggregateExtent.max} by condition`;
  }
  const aggregateSampleCount = curve.conditionsWithoutEstimate > 0 && aggregateCounts.length > 0
    ? `${aggregateSampleBase} where defined; ${curve.conditionsWithoutEstimate} condition${curve.conditionsWithoutEstimate === 1 ? '' : 's'} undefined`
    : aggregateSampleBase;
  const inputLabel = curve.axis === 'numeric'
    ? String(input.label ?? 'input')
    : String(conditions.inputLabel ?? 'condition');
  const lineStatement = curve.axis === 'nominal'
    ? 'No guide line is drawn because the condition axis is nominal.'
    : 'A straight guide joins only adjacent defined conditions; gaps break it, and it is neither a fit nor interpolation.';
  return {
    rows,
    geometry,
    summary: {
      curveLabel: String(parameters.curveLabel ?? parameters.curveId ?? method.replaceAll('_', ' ')),
      responseMethod: method,
      responseUnit,
      inputLabel,
      inputUnit: inputUnit ?? 'not applicable',
      inputScale: curve.inputScale ?? curve.axis,
      conditionCount: exactText(curve.conditions.length),
      axisKind: curve.axis,
      eventScopeKind: eventScope.kind,
      eventSelectionId: eventScope.selectionId,
      eventMembershipBinding: responseMembershipText(eventScope),
      selectedEventTrainCount: exactText(eventScope.selectedEventTrainCount),
      recordedSenderCount: eventScope.recordedSenderCount === null
        ? 'not declared'
        : exactText(eventScope.recordedSenderCount),
      rateNormalization: rate?.normalization ?? 'not applicable',
      estimator: String(parameters.estimator),
      retainedCount: exactText(curve.retainedCount),
      attemptedCount: exactText(curve.attemptedCount),
      trimmedCount: exactText(curve.trimmedCount),
      excludedCount: exactText(curve.excludedCount),
      repeatDesign: String(parameters.repeatDesign),
      responseBasis,
      windowStart: exactText(Number(window.start)),
      windowStop: exactText(Number(window.stop)),
      timeUnit: String(window.unit),
      responseMin: extent ? exactText(extent.min) : 'undefined',
      responseMax: extent ? exactText(extent.max) : 'undefined',
      uncertaintyStatement: uncertainty.kind === 'none'
        ? `No uncertainty was supplied (${String(uncertainty.reason ?? 'not_provided')}).`
        : `Uncertainty kind ${String(uncertainty.kind)} was declared.`,
      aggregationStatement: mode === 'aggregates'
        ? 'Only per-condition aggregates were supplied; raw repeats and pairing cannot be inspected.'
        : 'Every attempted raw repeat is retained in deterministic condition and repeat order in the complete table.',
      lineStatement,
    },
    disclosures: baseDisclosureFacts(request, {
      ...(curve.excludedCount > 0 ? { missingValueCount: curve.excludedCount } : {}),
      eventScopeMembershipCardinalityOnly: eventScope.membershipKind === 'cardinality_only',
      eventScopeExternalAuthorityDeclared: true,
      ...(mode === 'aggregates'
        ? {
          aggregateEstimator: String(parameters.estimator),
          aggregateSampleCount,
        }
        : {}),
    }),
  };
}

const RESPONSE_AUTHORITY = defineAuthorityEvaluator(
  authorityEvaluatorId('neuro.response_curve', 2),
  (request) => modelFields(responseModel(request)),
);

export const TOPOLOGY_DYNAMICS_AUTHORITY_EVALUATORS: readonly RegisteredAuthorityEvaluatorV1[] = [
  GRAPH_AUTHORITY,
  SPATIAL_AUTHORITY,
  PHASE_AUTHORITY,
  RESPONSE_AUTHORITY,
];
