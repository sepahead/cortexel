import { z, type ZodType } from 'zod';
import { SAFE_DISPLAY_STRING_PATTERN, formatValidationIssues } from '../safeRuntime';
import {
  AdjacencyMatrixParamsSchema,
  ConnectionGraphParamsSchema,
  DelayDistributionParamsSchema,
  DelayMatrixParamsSchema,
  GEOMETRY_MAX_ROUNDOFF_FRACTION,
  HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
  HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
  InDegreeDistributionParamsSchema,
  OutDegreeDistributionParamsSchema,
  PARAM_LIMITS,
  PositionScopeSchema,
  SnapshotScopeSchema,
  SpatialMap2DParamsSchema,
  WeightMatrixParamsSchema,
  type AdjacencyMatrixParams,
  type ConnectionGraphParams,
  type DelayDistributionParams,
  type DelayMatrixParams,
  type InDegreeDistributionParams,
  type OutDegreeDistributionParams,
  type PositionScope,
  type SnapshotScope,
  type SpatialMap2DParams,
  type WeightMatrixParams,
} from '../skills/params';
import { NEST_INPUT_LIMITS } from './shapes';
import { parseNestInput, projectNestInputFields } from './safeInput';

export type NestTopologyResult<T> =
  | { ok: true; params: T }
  | { ok: false; errors: string[] };

export const NEST_TOPOLOGY_LIMITS = Object.freeze({
  maxConnections: NEST_INPUT_LIMITS.maxSamples,
  maxGraphNodes: PARAM_LIMITS.maxTopologyNodes,
  maxGraphEdges: PARAM_LIMITS.maxTopologyEdges,
  maxMatrixCells: PARAM_LIMITS.maxSamples,
  maxDegreeBins: PARAM_LIMITS.maxSamples,
  maxDelayBins: PARAM_LIMITS.maxSamples,
  maxSpatialNodes: PARAM_LIMITS.maxSpatialObjects,
});

const FLOAT32_MAX = 3.4028234663852886e38;
const finite = z
  .number()
  .finite()
  .refine((value) => !Object.is(value, -0), 'negative zero is not exact JSON');
const gpuNumber = finite.min(-FLOAT32_MAX).max(FLOAT32_MAX);
const nodeId = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
  .refine((value) => !Object.is(value, -0), 'node ids must not be negative zero');
const displayText = (maximum: number) => z
  .string()
  .trim()
  .min(1)
  .max(maximum)
  .regex(SAFE_DISPLAY_STRING_PATTERN)
  .transform((value) => value.trim());

const scalarOrArray = <T>(item: ZodType<T>) => z.union([
  item,
  z.array(item).max(NEST_TOPOLOGY_LIMITS.maxConnections),
]);
const arrayOnly = <T>(item: ZodType<T>) =>
  z.array(item).max(NEST_TOPOLOGY_LIMITS.maxConnections);

const RawSynapseCollectionSchema = z
  .object({
    source: scalarOrArray(nodeId).optional(),
    sources: arrayOnly(nodeId).optional(),
    target: scalarOrArray(nodeId).optional(),
    targets: arrayOnly(nodeId).optional(),
    weight: scalarOrArray(gpuNumber).optional(),
    weights: arrayOnly(gpuNumber).optional(),
    delay: scalarOrArray(gpuNumber.positive()).optional(),
    delays: arrayOnly(gpuNumber.positive()).optional(),
    synapse_model: scalarOrArray(displayText(120)).optional(),
    synapse_models: arrayOnly(displayText(120)).optional(),
    target_thread: scalarOrArray(nodeId).optional(),
    target_threads: arrayOnly(nodeId).optional(),
    synapse_id: scalarOrArray(nodeId).optional(),
    synapse_ids: arrayOnly(nodeId).optional(),
    port: scalarOrArray(nodeId).optional(),
    ports: arrayOnly(nodeId).optional(),
  })
  .strict();

export interface NormalizedSynapseCollectionSnapshot {
  sources: number[];
  targets: number[];
  weights?: number[];
  delays_ms?: number[];
  synapse_models?: string[];
  target_threads?: number[];
  synapse_ids?: number[];
  ports?: number[];
}

const RAW_CONNECTION_FIELDS = Object.freeze([
  'source',
  'sources',
  'target',
  'targets',
  'weight',
  'weights',
  'delay',
  'delays',
  'synapse_model',
  'synapse_models',
  'target_thread',
  'target_threads',
  'synapse_id',
  'synapse_ids',
  'port',
  'ports',
] as const);

function error(message: string): { ok: false; errors: string[] } {
  return { ok: false, errors: [message] };
}

function validateOutput<T>(
  schema: ZodType<T>,
  params: unknown,
): NestTopologyResult<T> {
  const parsed = schema.safeParse(params);
  return parsed.success
    ? { ok: true, params: parsed.data }
    : { ok: false, errors: formatValidationIssues(parsed.error.issues) };
}

function normalizeAlias<T>(
  value: Record<string, unknown>,
  singular: string,
  plural: string,
  required: boolean,
): { ok: true; values?: T[] } | { ok: false; errors: string[] } {
  const hasSingular = Object.hasOwn(value, singular);
  const hasPlural = Object.hasOwn(value, plural);
  if (hasSingular && hasPlural) {
    return error(`${singular}/${plural}: supply exactly one documented or legacy field form`);
  }
  if (!hasSingular && !hasPlural) {
    return required
      ? error(`${singular}: required SynapseCollection field is missing`)
      : { ok: true };
  }
  const raw = value[hasSingular ? singular : plural] as T | T[];
  if (raw === undefined) {
    return error(`${hasSingular ? singular : plural}: an explicitly present field cannot be undefined`);
  }
  return { ok: true, values: Array.isArray(raw) ? raw : [raw] };
}

/**
 * Normalize the documented SynapseCollection `.get()` shape (`source`,
 * `target`, ...) and Cortexel's legacy plural wrapper without broadcasting or
 * invoking accessors. Empty connection arrays are valid evidence.
 */
export function normalizeSynapseCollectionSnapshot(
  input: unknown,
): NestTopologyResult<NormalizedSynapseCollectionSnapshot> {
  try {
    const projected = projectNestInputFields(input, RAW_CONNECTION_FIELDS);
    if (!projected.ok) return projected;
    const parsed = parseNestInput(RawSynapseCollectionSchema, projected.data);
    if (!parsed.ok) return parsed;
    const value = parsed.data as Record<string, unknown>;
    const singularFields = [
      'source', 'target', 'weight', 'delay', 'synapse_model',
      'target_thread', 'synapse_id', 'port',
    ];
    const pluralFields = [
      'sources', 'targets', 'weights', 'delays', 'synapse_models',
      'target_threads', 'synapse_ids', 'ports',
    ];
    if (
      singularFields.some((field) => Object.hasOwn(value, field)) &&
      pluralFields.some((field) => Object.hasOwn(value, field))
    ) {
      return error('SynapseCollection fields must consistently use the documented singular-key form or the legacy plural-key form');
    }
    const sources = normalizeAlias<number>(value, 'source', 'sources', true);
    if (!sources.ok) return sources;
    const targets = normalizeAlias<number>(value, 'target', 'targets', true);
    if (!targets.ok) return targets;
    const weights = normalizeAlias<number>(value, 'weight', 'weights', false);
    if (!weights.ok) return weights;
    const delays = normalizeAlias<number>(value, 'delay', 'delays', false);
    if (!delays.ok) return delays;
    const models = normalizeAlias<string>(value, 'synapse_model', 'synapse_models', false);
    if (!models.ok) return models;
    const targetThreads = normalizeAlias<number>(value, 'target_thread', 'target_threads', false);
    if (!targetThreads.ok) return targetThreads;
    const synapseIds = normalizeAlias<number>(value, 'synapse_id', 'synapse_ids', false);
    if (!synapseIds.ok) return synapseIds;
    const ports = normalizeAlias<number>(value, 'port', 'ports', false);
    if (!ports.ok) return ports;

    const count = sources.values!.length;
    if (targets.values!.length !== count) {
      return error(
        `source/target: parallel fields differ in length (${count} versus ${targets.values!.length})`,
      );
    }
    for (const [field, channel] of [
      ['weight', weights.values],
      ['delay', delays.values],
      ['synapse_model', models.values],
      ['target_thread', targetThreads.values],
      ['synapse_id', synapseIds.values],
      ['port', ports.values],
    ] as const) {
      if (channel !== undefined && channel.length !== count) {
        return error(
          `${field}: optional channel length ${channel.length} must equal connection count ${count}; scalar values are never broadcast`,
        );
      }
    }
    const identityPresence = [targetThreads.values, synapseIds.values, ports.values]
      .filter((channel) => channel !== undefined).length;
    if (identityPresence !== 0 && identityPresence !== 3) {
      return error('target_thread/synapse_id/port: connection identity channels must be supplied together');
    }
    if (identityPresence === 3) {
      const identifiers = new Set<string>();
      for (let index = 0; index < count; index++) {
        const identifier = [
          sources.values![index],
          targets.values![index],
          targetThreads.values![index],
          synapseIds.values![index],
          ports.values![index],
        ].join('\u0000');
        if (identifiers.has(identifier)) {
          return error(`connection identity.${index}: duplicate NEST source/target/target_thread/synapse_id/port tuple`);
        }
        identifiers.add(identifier);
      }
    }
    return {
      ok: true,
      params: {
        sources: sources.values!,
        targets: targets.values!,
        ...(weights.values !== undefined ? { weights: weights.values } : {}),
        ...(delays.values !== undefined ? { delays_ms: delays.values } : {}),
        ...(models.values !== undefined ? { synapse_models: models.values } : {}),
        ...(targetThreads.values !== undefined ? { target_threads: targetThreads.values } : {}),
        ...(synapseIds.values !== undefined ? { synapse_ids: synapseIds.values } : {}),
        ...(ports.values !== undefined ? { ports: ports.values } : {}),
      },
    };
  } catch {
    return error('SynapseCollection input could not be safely normalized');
  }
}

const graphNodeIds = z
  .array(nodeId)
  .min(1)
  .max(NEST_TOPOLOGY_LIMITS.maxGraphNodes);
const connectionAxisIds = z
  .array(nodeId)
  .min(1)
  .max(PARAM_LIMITS.maxSamples);

const CommonConnectionOptionsShape = {
  sourceIds: connectionAxisIds,
  targetIds: connectionAxisIds,
  snapshotTimeMs: finite.nonnegative(),
  snapshotScope: SnapshotScopeSchema,
} as const;

const GraphOptionsSchema = z
  .object({
    ...CommonConnectionOptionsShape,
    sourceIds: graphNodeIds,
    targetIds: graphNodeIds,
    weightUnits: displayText(80).optional(),
    delayUnits: z.literal('ms').optional(),
    samplePolicy: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('complete') }).strict(),
      z.object({
        kind: z.literal('deterministic_even_stride'),
        maxEdges: z.number().int().positive().max(NEST_TOPOLOGY_LIMITS.maxGraphEdges),
      }).strict(),
    ]),
  })
  .strict();

const MatrixOptionsSchema = z.object(CommonConnectionOptionsShape).strict();
const WeightMatrixOptionsSchema = z
  .object({
    ...CommonConnectionOptionsShape,
    weightUnits: displayText(80),
    aggregation: z.enum(['sum', 'mean', 'minimum', 'maximum', 'single_connection']),
  })
  .strict();
const DelayMatrixOptionsSchema = z
  .object({
    ...CommonConnectionOptionsShape,
    delayUnits: z.literal('ms'),
    aggregation: z.enum(['mean', 'minimum', 'maximum', 'single_connection']),
  })
  .strict();
const DegreeOptionsSchema = z
  .object({
    ...CommonConnectionOptionsShape,
    normalization: z.enum(['count', 'probability']),
  })
  .strict();
const DelayDistributionOptionsSchema = z
  .object({
    ...CommonConnectionOptionsShape,
    delayUnits: z.literal('ms'),
    binWidthMs: finite.positive(),
    windowStartMs: finite.nonnegative(),
    windowStopMs: finite.positive(),
    normalization: z.enum(['count', 'probability', 'probability_density']),
  })
  .strict();
const SpatialMapOptionsSchema = z
  .object({
    nodeIds: z.array(nodeId).min(1).max(NEST_TOPOLOGY_LIMITS.maxSpatialNodes),
    coordinateUnits: displayText(80),
    extent: z.tuple([gpuNumber.positive(), gpuNumber.positive()]),
    center: z.tuple([gpuNumber, gpuNumber]),
    edgeWrap: z.boolean(),
    positionScope: PositionScopeSchema,
  })
  .strict();

export interface ConnectionSnapshotOptions {
  sourceIds: readonly number[];
  targetIds: readonly number[];
  snapshotTimeMs: number;
  snapshotScope: SnapshotScope;
}

export interface ConnectionGraphOptions extends ConnectionSnapshotOptions {
  weightUnits?: string;
  delayUnits?: 'ms';
  samplePolicy:
    | { kind: 'complete' }
    | { kind: 'deterministic_even_stride'; maxEdges: number };
}

export interface WeightMatrixOptions extends ConnectionSnapshotOptions {
  weightUnits: string;
  aggregation: 'sum' | 'mean' | 'minimum' | 'maximum' | 'single_connection';
}

export interface DelayMatrixOptions extends ConnectionSnapshotOptions {
  delayUnits: 'ms';
  aggregation: 'mean' | 'minimum' | 'maximum' | 'single_connection';
}

export interface DegreeDistributionOptions extends ConnectionSnapshotOptions {
  normalization: 'count' | 'probability';
}

export interface DelayDistributionOptions extends ConnectionSnapshotOptions {
  delayUnits: 'ms';
  binWidthMs: number;
  windowStartMs: number;
  windowStopMs: number;
  normalization: 'count' | 'probability' | 'probability_density';
}

export interface SpatialMap2DOptions {
  nodeIds: readonly number[];
  coordinateUnits: string;
  extent: readonly [number, number];
  center: readonly [number, number];
  edgeWrap: boolean;
  positionScope: PositionScope;
}

type ParsedConnectionContext = {
  snapshot: NormalizedSynapseCollectionSnapshot;
  sourceIds: number[];
  targetIds: number[];
  snapshotTimeMs: number;
  snapshotScope: SnapshotScope;
};

function parseConnectionContext<T extends {
  sourceIds: number[];
  targetIds: number[];
  snapshotTimeMs: number;
  snapshotScope: SnapshotScope;
}>(
  input: unknown,
  options: unknown,
  schema: ZodType<T>,
): NestTopologyResult<ParsedConnectionContext & { options: T }> {
  const normalized = normalizeSynapseCollectionSnapshot(input);
  if (!normalized.ok) return normalized;
  const parsedOptions = parseNestInput(schema, options);
  if (!parsedOptions.ok) return parsedOptions;
  const opts = parsedOptions.data;
  const sourceIds = new Set<number>();
  for (let index = 0; index < opts.sourceIds.length; index++) {
    const id = opts.sourceIds[index];
    if (sourceIds.has(id)) return error(`sourceIds.${index}: duplicate node id ${id}`);
    sourceIds.add(id);
  }
  const targetIds = new Set<number>();
  for (let index = 0; index < opts.targetIds.length; index++) {
    const id = opts.targetIds[index];
    if (targetIds.has(id)) return error(`targetIds.${index}: duplicate node id ${id}`);
    targetIds.add(id);
  }
  for (let index = 0; index < normalized.params.sources.length; index++) {
    if (!sourceIds.has(normalized.params.sources[index])) {
      return error(
        `source.${index}: node ${normalized.params.sources[index]} is outside the declared sourceIds universe`,
      );
    }
    if (!targetIds.has(normalized.params.targets[index])) {
      return error(
        `target.${index}: node ${normalized.params.targets[index]} is outside the declared targetIds universe`,
      );
    }
  }
  return {
    ok: true,
    params: {
      snapshot: normalized.params,
      sourceIds: opts.sourceIds,
      targetIds: opts.targetIds,
      snapshotTimeMs: opts.snapshotTimeMs,
      snapshotScope: opts.snapshotScope,
      options: opts,
    },
  };
}

function compareConnectionRows(
  snapshot: NormalizedSynapseCollectionSnapshot,
  left: number,
  right: number,
): number {
  const numericChannels = [
    snapshot.sources,
    snapshot.targets,
    snapshot.target_threads,
    snapshot.synapse_ids,
    snapshot.ports,
    snapshot.weights,
    snapshot.delays_ms,
  ];
  for (const channel of numericChannels) {
    if (!channel) continue;
    const delta = channel[left] - channel[right];
    if (delta !== 0) return delta;
  }
  if (snapshot.synapse_models) {
    const leftModel = snapshot.synapse_models[left];
    const rightModel = snapshot.synapse_models[right];
    if (leftModel < rightModel) return -1;
    if (leftModel > rightModel) return 1;
  }
  return left - right;
}

function canonicalConnectionOrder(snapshot: NormalizedSynapseCollectionSnapshot): number[] {
  const order = Array.from({ length: snapshot.sources.length }, (_, index) => index);
  order.sort((left, right) => compareConnectionRows(snapshot, left, right));
  return order;
}

/** Map a complete or explicitly sampled snapshot to schematic node-link params. */
export function synapseCollectionToConnectionGraphParams(
  input: unknown,
  options: ConnectionGraphOptions,
): NestTopologyResult<ConnectionGraphParams>;
export function synapseCollectionToConnectionGraphParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<ConnectionGraphParams>;
export function synapseCollectionToConnectionGraphParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<ConnectionGraphParams> {
  try {
    const context = parseConnectionContext(input, options, GraphOptionsSchema);
    if (!context.ok) return context;
    const { snapshot, sourceIds, targetIds, snapshotTimeMs, snapshotScope } = context.params;
    const opts = context.params.options;
    if ((snapshot.weights !== undefined) !== (opts.weightUnits !== undefined)) {
      return error('weightUnits must be supplied exactly when the SynapseCollection contains weight');
    }
    if ((snapshot.delays_ms !== undefined) !== (opts.delayUnits !== undefined)) {
      return error("delayUnits:'ms' must be supplied exactly when the SynapseCollection contains delay");
    }
    const allNodeIds = [...sourceIds];
    const seenNodes = new Set(allNodeIds);
    for (const id of targetIds) {
      if (!seenNodes.has(id)) {
        seenNodes.add(id);
        allNodeIds.push(id);
      }
    }
    if (allNodeIds.length > NEST_TOPOLOGY_LIMITS.maxGraphNodes) {
      return error(`graph node universe exceeds ${NEST_TOPOLOGY_LIMITS.maxGraphNodes} nodes`);
    }

    const order = canonicalConnectionOrder(snapshot);
    let selectedFullIndices: number[];
    let samplePolicy: 'complete' | 'deterministic_even_stride';
    if (opts.samplePolicy.kind === 'complete') {
      if (order.length > NEST_TOPOLOGY_LIMITS.maxGraphEdges) {
        return error(
          `complete graph output exceeds ${NEST_TOPOLOGY_LIMITS.maxGraphEdges} edges; request deterministic_even_stride`,
        );
      }
      selectedFullIndices = order.map((_, index) => index);
      samplePolicy = 'complete';
    } else {
      const maxEdges = opts.samplePolicy.maxEdges;
      if (order.length <= maxEdges) {
        return error('deterministic_even_stride must select a strict subset; use complete for this snapshot');
      }
      selectedFullIndices = Array.from(
        { length: maxEdges },
        (_, index) => maxEdges === 1
          ? Math.floor((order.length - 1) / 2)
          : Math.round(index * (order.length - 1) / (maxEdges - 1)),
      );
      samplePolicy = 'deterministic_even_stride';
    }
    const edges = selectedFullIndices.map((fullIndex) => {
      const rawIndex = order[fullIndex];
      const edgeId = snapshot.target_threads && snapshot.synapse_ids && snapshot.ports
        ? `connection:${snapshot.sources[rawIndex]}:${snapshot.targets[rawIndex]}:${snapshot.target_threads[rawIndex]}:${snapshot.synapse_ids[rawIndex]}:${snapshot.ports[rawIndex]}`
        : `connection:${fullIndex}`;
      return {
        id: edgeId,
        source: snapshot.sources[rawIndex],
        target: snapshot.targets[rawIndex],
        ...(snapshot.weights ? { weight: snapshot.weights[rawIndex] } : {}),
        ...(snapshot.delays_ms ? { delay_ms: snapshot.delays_ms[rawIndex] } : {}),
        ...(snapshot.synapse_models
          ? { synapse_model: snapshot.synapse_models[rawIndex] }
          : {}),
      };
    });
    return validateOutput(ConnectionGraphParamsSchema, {
      nodes: allNodeIds.map((id) => ({ id, label: String(id) })),
      edges,
      ...(edges.length > 0 && opts.weightUnits ? { weight_units: opts.weightUnits } : {}),
      ...(edges.length > 0 && opts.delayUnits ? { delay_units: opts.delayUnits } : {}),
      layout: 'schematic_circle',
      parallel_edges: 'preserved',
      self_connections: 'preserved',
      snapshot_time_ms: snapshotTimeMs,
      snapshot_scope: snapshotScope,
      sample_policy: samplePolicy,
      source_connection_count: snapshot.sources.length,
      edge_identity: snapshot.target_threads
        ? 'nest_connection_identifier'
        : 'canonical_sorted_ordinal',
    });
  } catch {
    return error('connection graph transform could not safely inspect its inputs');
  }
}

type PairBucket = {
  source_id: number;
  target_id: number;
  connection_count: number;
  measurements: number[];
};

function pairBuckets(
  snapshot: NormalizedSynapseCollectionSnapshot,
  sourceIds: readonly number[],
  targetIds: readonly number[],
  measurements?: readonly number[],
): PairBucket[] {
  const buckets = new Map<string, PairBucket>();
  for (let index = 0; index < snapshot.sources.length; index++) {
    const source = snapshot.sources[index];
    const target = snapshot.targets[index];
    const key = `${source}\u0000${target}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { source_id: source, target_id: target, connection_count: 0, measurements: [] };
      buckets.set(key, bucket);
    }
    bucket.connection_count += 1;
    if (measurements) bucket.measurements.push(measurements[index]);
  }
  const sourceOrder = new Map(sourceIds.map((id, index) => [id, index]));
  const targetOrder = new Map(targetIds.map((id, index) => [id, index]));
  return [...buckets.values()].sort((left, right) =>
    targetOrder.get(left.target_id)! - targetOrder.get(right.target_id)! ||
    sourceOrder.get(left.source_id)! - sourceOrder.get(right.source_id)!
  );
}

type MeasurementAggregationResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'multiple_connections' | 'mean_underflow' };

function aggregateMeasurements(
  values: number[],
  aggregation: 'sum' | 'mean' | 'minimum' | 'maximum' | 'single_connection',
): MeasurementAggregationResult {
  if (aggregation === 'single_connection') {
    return values.length === 1
      ? { ok: true, value: values[0] }
      : { ok: false, reason: 'multiple_connections' };
  }
  if (aggregation === 'minimum') {
    let minimum = values[0];
    for (let index = 1; index < values.length; index++) minimum = Math.min(minimum, values[index]);
    return { ok: true, value: minimum };
  }
  if (aggregation === 'maximum') {
    let maximum = values[0];
    for (let index = 1; index < values.length; index++) maximum = Math.max(maximum, values[index]);
    return { ok: true, value: maximum };
  }
  const ordered = [...values].sort((left, right) => left - right);
  let sum = 0;
  for (const value of ordered) sum += value;
  if (aggregation === 'mean') {
    const mean = sum / ordered.length;
    if (sum !== 0 && mean === 0) return { ok: false, reason: 'mean_underflow' };
    return { ok: true, value: mean };
  }
  return { ok: true, value: sum };
}

function matrixCommon(context: ParsedConnectionContext) {
  return {
    source_ids: context.sourceIds,
    target_ids: context.targetIds,
    axis_order: 'target_rows_source_columns' as const,
    absent_cell: 'no_connection' as const,
    sample_policy: 'complete' as const,
    connection_count: context.snapshot.sources.length,
    snapshot_time_ms: context.snapshotTimeMs,
    snapshot_scope: context.snapshotScope,
  };
}

export function synapseCollectionToAdjacencyMatrixParams(
  input: unknown,
  options: ConnectionSnapshotOptions,
): NestTopologyResult<AdjacencyMatrixParams>;
export function synapseCollectionToAdjacencyMatrixParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<AdjacencyMatrixParams>;
export function synapseCollectionToAdjacencyMatrixParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<AdjacencyMatrixParams> {
  try {
    const context = parseConnectionContext(input, options, MatrixOptionsSchema);
    if (!context.ok) return context;
    const buckets = pairBuckets(
      context.params.snapshot,
      context.params.sourceIds,
      context.params.targetIds,
    );
    if (buckets.length > NEST_TOPOLOGY_LIMITS.maxMatrixCells) {
      return error(`adjacency matrix exceeds ${NEST_TOPOLOGY_LIMITS.maxMatrixCells} present cells`);
    }
    return validateOutput(AdjacencyMatrixParamsSchema, {
      ...matrixCommon(context.params),
      cells: buckets.map(({ source_id, target_id, connection_count }) => ({
        source_id,
        target_id,
        connection_count,
      })),
      display: 'binary_presence',
      aggregation: 'any_connection',
    });
  } catch {
    return error('adjacency matrix transform could not safely inspect its inputs');
  }
}

export function synapseCollectionToWeightMatrixParams(
  input: unknown,
  options: WeightMatrixOptions,
): NestTopologyResult<WeightMatrixParams>;
export function synapseCollectionToWeightMatrixParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<WeightMatrixParams>;
export function synapseCollectionToWeightMatrixParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<WeightMatrixParams> {
  try {
    const context = parseConnectionContext(input, options, WeightMatrixOptionsSchema);
    if (!context.ok) return context;
    const weights = context.params.snapshot.weights;
    if (!weights) return error('weight: weight matrix requires a complete weight channel');
    const opts = context.params.options;
    const buckets = pairBuckets(
      context.params.snapshot,
      context.params.sourceIds,
      context.params.targetIds,
      weights,
    );
    if (buckets.length > NEST_TOPOLOGY_LIMITS.maxMatrixCells) {
      return error(`weight matrix exceeds ${NEST_TOPOLOGY_LIMITS.maxMatrixCells} present cells`);
    }
    const cells = [];
    for (const bucket of buckets) {
      const aggregated = aggregateMeasurements(bucket.measurements, opts.aggregation);
      if (!aggregated.ok && aggregated.reason === 'multiple_connections') {
        return error(
          `weight matrix cell ${bucket.source_id}->${bucket.target_id} has ${bucket.connection_count} connections; single_connection requires one`,
        );
      }
      if (!aggregated.ok) {
        return error(
          `weight matrix cell ${bucket.source_id}->${bucket.target_id} mean underflows binary64 and would erase nonzero weight evidence`,
        );
      }
      const value = aggregated.value;
      if (!Number.isFinite(value) || Math.abs(value) > FLOAT32_MAX) {
        return error(`weight matrix cell ${bucket.source_id}->${bucket.target_id} aggregation exceeds renderable range`);
      }
      cells.push({
        source_id: bucket.source_id,
        target_id: bucket.target_id,
        connection_count: bucket.connection_count,
        value,
      });
    }
    return validateOutput(WeightMatrixParamsSchema, {
      ...matrixCommon(context.params),
      cells,
      weight_units: opts.weightUnits,
      aggregation: opts.aggregation,
    });
  } catch {
    return error('weight matrix transform could not safely inspect its inputs');
  }
}

export function synapseCollectionToDelayMatrixParams(
  input: unknown,
  options: DelayMatrixOptions,
): NestTopologyResult<DelayMatrixParams>;
export function synapseCollectionToDelayMatrixParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<DelayMatrixParams>;
export function synapseCollectionToDelayMatrixParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<DelayMatrixParams> {
  try {
    const context = parseConnectionContext(input, options, DelayMatrixOptionsSchema);
    if (!context.ok) return context;
    const delays = context.params.snapshot.delays_ms;
    if (!delays) return error('delay: delay matrix requires a complete delay channel');
    const opts = context.params.options;
    const buckets = pairBuckets(
      context.params.snapshot,
      context.params.sourceIds,
      context.params.targetIds,
      delays,
    );
    if (buckets.length > NEST_TOPOLOGY_LIMITS.maxMatrixCells) {
      return error(`delay matrix exceeds ${NEST_TOPOLOGY_LIMITS.maxMatrixCells} present cells`);
    }
    const cells = [];
    for (const bucket of buckets) {
      const aggregated = aggregateMeasurements(bucket.measurements, opts.aggregation);
      if (!aggregated.ok && aggregated.reason === 'multiple_connections') {
        return error(
          `delay matrix cell ${bucket.source_id}->${bucket.target_id} has ${bucket.connection_count} connections; single_connection requires one`,
        );
      }
      if (!aggregated.ok) {
        return error(
          `delay matrix cell ${bucket.source_id}->${bucket.target_id} mean underflows binary64`,
        );
      }
      const value = aggregated.value;
      if (!Number.isFinite(value) || value <= 0 || value > FLOAT32_MAX) {
        return error(`delay matrix cell ${bucket.source_id}->${bucket.target_id} aggregation is not a positive renderable delay`);
      }
      cells.push({
        source_id: bucket.source_id,
        target_id: bucket.target_id,
        connection_count: bucket.connection_count,
        value,
      });
    }
    return validateOutput(DelayMatrixParamsSchema, {
      ...matrixCommon(context.params),
      cells,
      delay_units: opts.delayUnits,
      aggregation: opts.aggregation,
    });
  } catch {
    return error('delay matrix transform could not safely inspect its inputs');
  }
}

function degreeDistribution(
  input: unknown,
  options: unknown,
  direction: 'in' | 'out',
): NestTopologyResult<InDegreeDistributionParams | OutDegreeDistributionParams> {
  const context = parseConnectionContext(input, options, DegreeOptionsSchema);
  if (!context.ok) return context;
  const opts = context.params.options;
  if (direction === 'out' && context.params.snapshotScope.kind === 'mpi_target_rank_local') {
    return error('out-degree cannot be recovered from a target-rank-local SynapseCollection snapshot');
  }
  const universe = direction === 'in' ? context.params.targetIds : context.params.sourceIds;
  const degreeByNode = new Map(universe.map((id) => [id, 0]));
  const endpoints = direction === 'in'
    ? context.params.snapshot.targets
    : context.params.snapshot.sources;
  for (const endpoint of endpoints) degreeByNode.set(endpoint, degreeByNode.get(endpoint)! + 1);
  let maximum = 0;
  for (const degree of degreeByNode.values()) maximum = Math.max(maximum, degree);
  if (maximum + 1 > NEST_TOPOLOGY_LIMITS.maxDegreeBins) {
    return error(`degree output exceeds ${NEST_TOPOLOGY_LIMITS.maxDegreeBins} bins`);
  }
  const degrees = Array.from({ length: maximum + 1 }, (_, index) => index);
  const nodeCounts = new Array<number>(degrees.length).fill(0);
  for (const degree of degreeByNode.values()) nodeCounts[degree] += 1;
  const values = nodeCounts.map((count) =>
    opts.normalization === 'count' ? count : count / universe.length
  );
  const params = {
    degrees,
    node_counts: nodeCounts,
    values,
    node_count: universe.length,
    connection_count: context.params.snapshot.sources.length,
    direction,
    normalization: opts.normalization,
    value_units: opts.normalization === 'count' ? 'count' : 'probability',
    edge_counting: 'each_synapse_collection_entry',
    zero_degree_policy: 'include_declared_universe',
    sample_policy: 'complete',
    snapshot_time_ms: context.params.snapshotTimeMs,
    snapshot_scope: context.params.snapshotScope,
  };
  return direction === 'in'
    ? validateOutput(InDegreeDistributionParamsSchema, params)
    : validateOutput(OutDegreeDistributionParamsSchema, params);
}

export function synapseCollectionToInDegreeDistributionParams(
  input: unknown,
  options: DegreeDistributionOptions,
): NestTopologyResult<InDegreeDistributionParams>;
export function synapseCollectionToInDegreeDistributionParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<InDegreeDistributionParams>;
export function synapseCollectionToInDegreeDistributionParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<InDegreeDistributionParams> {
  return degreeDistribution(input, options, 'in') as NestTopologyResult<InDegreeDistributionParams>;
}

export function synapseCollectionToOutDegreeDistributionParams(
  input: unknown,
  options: DegreeDistributionOptions,
): NestTopologyResult<OutDegreeDistributionParams>;
export function synapseCollectionToOutDegreeDistributionParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<OutDegreeDistributionParams>;
export function synapseCollectionToOutDegreeDistributionParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<OutDegreeDistributionParams> {
  return degreeDistribution(input, options, 'out') as NestTopologyResult<OutDegreeDistributionParams>;
}

function exactBinCount(
  start: number,
  stop: number,
  width: number,
): { ok: true; count: number } | { ok: false; errors: string[] } {
  if (!(stop > start)) return error('delay window: stop must be greater than start');
  const ratio = (stop - start) / width;
  const count = Math.round(ratio);
  const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE +
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.max(Math.abs(ratio), Math.abs(count));
  if (
    !Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ratio) ||
    Math.abs(ratio - count) > tolerance
  ) {
    return error('delay window: duration must be an exact positive integer multiple of bin width');
  }
  if (count > NEST_TOPOLOGY_LIMITS.maxDelayBins) {
    return error(`delay distribution exceeds ${NEST_TOPOLOGY_LIMITS.maxDelayBins} bins`);
  }
  return { ok: true, count };
}

const BIN_INDEX_OUTSIDE = -1;
const BIN_INDEX_INDETERMINATE = -2;
const BIN_BOUNDARY_ROUNDOFF_ULPS = 16;
/** Maximum dimensionless fraction of one bin that boundary repair may move.
 * The cap is independent of absolute time and bin index. */
const MAX_BIN_BOUNDARY_SNAP_DISTANCE = GEOMETRY_MAX_ROUNDOFF_FRACTION;

function halfOpenBinIndex(
  value: number,
  start: number,
  stop: number,
  width: number,
  count: number,
): number {
  if (value < start || value >= stop) return BIN_INDEX_OUTSIDE;
  let scaled = (value - start) / width;
  if (!Number.isFinite(scaled)) return BIN_INDEX_INDETERMINATE;
  const nearest = Math.round(scaled);
  const operationScale = Math.max(1, Math.abs(value), Math.abs(start), Math.abs(width));
  const arithmeticTolerance = BIN_BOUNDARY_ROUNDOFF_ULPS * Number.EPSILON *
    (operationScale / Math.abs(width) + Math.max(1, Math.abs(scaled)));
  const boundaryDistance = Math.abs(scaled - nearest);
  if (boundaryDistance === 0) {
    scaled = nearest;
  } else if (
    boundaryDistance <= arithmeticTolerance &&
    boundaryDistance <= MAX_BIN_BOUNDARY_SNAP_DISTANCE
  ) {
    // If absolute-time arithmetic has more uncertainty than the bounded snap
    // allowance, fail closed instead of choosing a side of the boundary.
    if (arithmeticTolerance > MAX_BIN_BOUNDARY_SNAP_DISTANCE) {
      return BIN_INDEX_INDETERMINATE;
    }
    scaled = nearest;
  }
  const index = Math.floor(scaled);
  return index >= 0 && index < count ? index : BIN_INDEX_OUTSIDE;
}

export function synapseCollectionToDelayDistributionParams(
  input: unknown,
  options: DelayDistributionOptions,
): NestTopologyResult<DelayDistributionParams>;
export function synapseCollectionToDelayDistributionParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<DelayDistributionParams>;
export function synapseCollectionToDelayDistributionParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<DelayDistributionParams> {
  try {
    const context = parseConnectionContext(input, options, DelayDistributionOptionsSchema);
    if (!context.ok) return context;
    const delays = context.params.snapshot.delays_ms;
    if (!delays) return error('delay: delay distribution requires a complete delay channel');
    const opts = context.params.options;
    const geometry = exactBinCount(opts.windowStartMs, opts.windowStopMs, opts.binWidthMs);
    if (!geometry.ok) return geometry;
    if (delays.length === 0 && opts.normalization !== 'count') {
      return error('an empty delay snapshot cannot be probability-normalized');
    }
    const densityDenominator = delays.length * opts.binWidthMs;
    if (
      opts.normalization === 'probability_density' &&
      (!Number.isFinite(densityDenominator) || densityDenominator <= 0)
    ) {
      return error('delay probability-density denominator connection_count × binWidthMs must be finite');
    }
    const counts = new Array<number>(geometry.count).fill(0);
    for (let index = 0; index < delays.length; index++) {
      const bin = halfOpenBinIndex(
        delays[index],
        opts.windowStartMs,
        opts.windowStopMs,
        opts.binWidthMs,
        geometry.count,
      );
      if (bin === BIN_INDEX_INDETERMINATE) {
        return error(
          `delay.${index}: binary64 arithmetic cannot resolve a half-open bin boundary without guessing`,
        );
      }
      if (bin === BIN_INDEX_OUTSIDE) {
        return error(
          `delay.${index}: ${delays[index]} ms lies outside [${opts.windowStartMs},${opts.windowStopMs})`,
        );
      }
      counts[bin] += 1;
    }
    const values = counts.map((count) =>
      opts.normalization === 'count'
        ? count
        : opts.normalization === 'probability'
          ? count / delays.length
          : count / densityDenominator
    );
    return validateOutput(DelayDistributionParamsSchema, {
      bin_centers_ms: Array.from(
        { length: geometry.count },
        (_, index) => opts.windowStartMs + (index + 0.5) * opts.binWidthMs,
      ),
      delay_counts: counts,
      values,
      bin_width_ms: opts.binWidthMs,
      window_start_ms: opts.windowStartMs,
      window_stop_ms: opts.windowStopMs,
      normalization: opts.normalization,
      value_units: opts.normalization === 'count'
        ? 'count'
        : opts.normalization === 'probability'
          ? 'probability'
          : '1/ms',
      delay_units: opts.delayUnits,
      aggregation: 'each_connection',
      binning: 'left_closed_right_open',
      sample_policy: 'complete',
      connection_count: delays.length,
      snapshot_time_ms: context.params.snapshotTimeMs,
      snapshot_scope: context.params.snapshotScope,
    });
  } catch {
    return error('delay distribution transform could not safely inspect its inputs');
  }
}

const PositionListSchema = z.union([
  z.tuple([gpuNumber, gpuNumber]).transform((position) => [position] as [number, number][]),
  z.array(z.tuple([gpuNumber, gpuNumber])).min(1).max(NEST_TOPOLOGY_LIMITS.maxSpatialNodes),
]);
const PositionWrapperSchema = z.object({
  positions: PositionListSchema,
  node_ids: z.array(nodeId).min(1).max(NEST_TOPOLOGY_LIMITS.maxSpatialNodes).optional(),
}).strict();

function normalizePositions2D(
  input: unknown,
): NestTopologyResult<{ positions: [number, number][]; nodeIds?: number[] }> {
  if (input !== null && typeof input === 'object' && !Array.isArray(input) && !ArrayBuffer.isView(input)) {
    const projected = projectNestInputFields(input, ['positions', 'node_ids']);
    if (!projected.ok) return projected;
    const parsed = parseNestInput(PositionWrapperSchema, projected.data);
    return parsed.ok
      ? { ok: true, params: { positions: parsed.data.positions, nodeIds: parsed.data.node_ids } }
      : parsed;
  }
  const parsed = parseNestInput(PositionListSchema, input);
  return parsed.ok
    ? { ok: true, params: { positions: parsed.data } }
    : parsed;
}

export function getPositionToSpatialMap2DParams(
  input: unknown,
  options: SpatialMap2DOptions,
): NestTopologyResult<SpatialMap2DParams>;
export function getPositionToSpatialMap2DParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<SpatialMap2DParams>;
export function getPositionToSpatialMap2DParams(
  input: unknown,
  options: unknown,
): NestTopologyResult<SpatialMap2DParams> {
  try {
    const positions = normalizePositions2D(input);
    if (!positions.ok) return positions;
    const parsedOptions = parseNestInput(SpatialMapOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    if (positions.params.positions.length !== opts.nodeIds.length) {
      return error(
        `positions/nodeIds: lengths differ (${positions.params.positions.length} versus ${opts.nodeIds.length})`,
      );
    }
    const ids = new Set<number>();
    for (let index = 0; index < opts.nodeIds.length; index++) {
      if (ids.has(opts.nodeIds[index])) {
        return error(`nodeIds.${index}: duplicate node id ${opts.nodeIds[index]}`);
      }
      ids.add(opts.nodeIds[index]);
    }
    if (positions.params.nodeIds) {
      if (
        positions.params.nodeIds.length !== opts.nodeIds.length ||
        positions.params.nodeIds.some((id, index) => id !== opts.nodeIds[index])
      ) {
        return error('node_ids: wrapper ids must exactly match the explicit nodeIds option');
      }
    }
    return validateOutput(SpatialMap2DParamsSchema, {
      nodes: positions.params.positions.map(([x, y], index) => ({
        id: opts.nodeIds[index],
        label: String(opts.nodeIds[index]),
        x,
        y,
      })),
      coordinate_units: opts.coordinateUnits,
      extent: opts.extent,
      center: opts.center,
      edge_wrap: opts.edgeWrap,
      position_scope: opts.positionScope,
      marker_size: 'fixed_screen_space',
    });
  } catch {
    return error('2D position transform could not safely inspect its inputs');
  }
}
