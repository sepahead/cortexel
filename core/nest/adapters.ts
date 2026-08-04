// Host-agnostic NEST device-dict boundaries.
//
// Rendering adapters return typed SceneData with normalized names, axis
// invariants, Float32 GPU value buffers, and float64 time axes. Structural
// utilities instead retain their documented source precision and do not confer
// render authority. No host/NEST import — plain data only.

import type { SceneData } from '../designLaws';
import { z } from 'zod';
import {
  GetConnectionsSchema,
  GetPosition2DSchema,
  GetPosition3DSchema,
  MultimeterEventsSchema,
  MultimeterMultiSenderSchema,
  NEST_INPUT_LIMITS,
  SpikeRecorderEventsSchema,
  WeightRecorderEventsSchema,
} from './shapes';
import {
  SAFE_DISPLAY_STRING_PATTERN,
  intrinsicTypedArrayLength,
} from '../safeRuntime';
import { parseNestInput } from './safeInput';
import {
  boundedSynapseModelMeasurementSemanticsSchema,
  validateSynapseModelMeasurementSemantics,
  type SynapseModelMeasurementSemantics,
} from './modelSemantics';

export type AdapterResult =
  | { ok: true; data: SceneData; senderIndexMap?: Map<number, number> }
  | { ok: false; errors: string[] };

/** Object-producing adapters intentionally use tighter budgets than raw typed
 * device channels. Large simulations should be aggregated or referenced by a
 * host-side handle instead of expanding millions of JS objects/typed arrays. */
export const NEST_ADAPTER_LIMITS = Object.freeze({
  maxRootKeys: 32,
  maxConnections: 20_000,
  maxNetworkNodes: 25_000,
  maxSplitSeries: 4_096,
  maxUniqueSpikeSenders: 50_000,
});

const MultimeterOptionsSchema = z.object({
  variable: z.string().max(120).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
  units: z.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
}).strict();
const ConnectionOptionsSchema = z.object({
  synapseModelSemantics:
    boundedSynapseModelMeasurementSemanticsSchema(NEST_ADAPTER_LIMITS.maxConnections)
      .optional(),
  weightUnits: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(SAFE_DISPLAY_STRING_PATTERN)
    .optional(),
  delayUnits: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(SAFE_DISPLAY_STRING_PATTERN)
    .optional(),
}).strict();
const PositionOptionsSchema = z.object({
  dims: z.union([z.literal(2), z.literal(3)]).default(3),
  coordinateUnits: z.string().trim().min(1).max(80).regex(SAFE_DISPLAY_STRING_PATTERN),
}).strict();
function preflightArrayFields(
  input: unknown,
  fields: readonly string[],
  max: number,
): { ok: false; errors: string[] } | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null;
  try {
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (!descriptor || !('value' in descriptor)) continue;
      const value = descriptor.value;
      let itemCount: number | undefined;
      if (Array.isArray(value)) {
        const length = Object.getOwnPropertyDescriptor(value, 'length');
        itemCount = length && 'value' in length ? length.value as number : undefined;
      } else if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        itemCount = intrinsicTypedArrayLength(value);
      }
      if (itemCount !== undefined && itemCount > max) {
        return {
          ok: false,
          errors: [`${field}: may contain at most ${max} items; received ${itemCount}`],
        };
      }
    }
  } catch {
    return { ok: false, errors: ['(root): device payload could not be safely inspected'] };
  }
  return null;
}

/** Re-index arbitrary global NEST sender ids onto a dense 0..N-1 range, keeping
 *  the mapping so a host can recover original ids / attach population labels. */
function denseIndex(senders: number[]): {
  dense: Float32Array;
  map: Map<number, number>;
} | null {
  const map = new Map<number, number>();
  const dense = new Float32Array(senders.length);
  let next = 0;
  for (let i = 0; i < senders.length; i++) {
    const s = senders[i];
    let idx = map.get(s);
    if (idx === undefined) {
      if (next >= NEST_ADAPTER_LIMITS.maxUniqueSpikeSenders) return null;
      idx = next++;
      map.set(s, idx);
    }
    dense[i] = idx;
  }
  return { dense, map };
}

export function spikeRecorderToSceneData(events: unknown): AdapterResult {
  const parsed = parseNestInput(SpikeRecorderEventsSchema, events);
  if (!parsed.ok) return parsed;
  const { senders, times } = parsed.data;
  const indexed = denseIndex(senders);
  if (!indexed) {
    return {
      ok: false,
      errors: [`senders: at most ${NEST_ADAPTER_LIMITS.maxUniqueSpikeSenders} unique senders can be adapted inline`],
    };
  }
  const { dense, map } = indexed;
  return {
    ok: true,
    data: {
      spikeTimes: Float64Array.from(times),
      spikeSenders: dense,
      timeUnits: 'ms',
    },
    senderIndexMap: map,
  };
}

export function multimeterToSceneData(
  events: unknown,
  opts: { variable?: string; units?: string } = {},
): AdapterResult {
  const parsedOptions = parseNestInput(MultimeterOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const parsed = parseNestInput(MultimeterEventsSchema, events);
  if (!parsed.ok) return parsed;
  const { times, values, sender } = parsed.data;
  const traceTimes = Float64Array.from(times);
  const variable = parsedOptions.data.variable?.trim() || 'unknown';
  // Only a membrane-voltage recording goes into voltageTraces. Any other analog
  // variable (Ca, IP3, conductance, current) is self-labeled in analogTraces so
  // a renderer cannot mislabel it as mV.
  const isVoltage =
    /^v_?m$/i.test(variable);
  if (isVoltage) {
    return {
      ok: true,
      data: {
        traceTimes,
        voltageTraces: Float32Array.from(values),
        voltageUnits: parsedOptions.data.units?.trim() || 'unknown',
        timeUnits: 'ms',
        ...(sender !== undefined ? { traceSender: sender } : {}),
      },
    };
  }
  return {
    ok: true,
    data: {
      traceTimes,
      timeUnits: 'ms',
      ...(sender !== undefined ? { traceSender: sender } : {}),
      analogTraces: {
        values: Float32Array.from(values),
        variable,
        units: parsedOptions.data.units?.trim() || 'unknown',
      },
    },
  };
}

export interface MultimeterSenderSeries {
  sender: number;
  times: number[]; // float64 — ms timestamps
  values: Float32Array;
}

export type MultimeterSplitResult =
  | { ok: true; series: MultimeterSenderSeries[] }
  | { ok: false; errors: string[] };

/** Split a flattened multi-sender multimeter dump ({times,values,senders}) into
 *  one monotonic series per sender — the honest alternative to rejecting it. */
export function splitMultimeterBySender(events: unknown): MultimeterSplitResult {
  const parsed = parseNestInput(MultimeterMultiSenderSchema, events);
  if (!parsed.ok) return parsed;
  const { times, values, senders } = parsed.data;
  const byId = new Map<number, { times: number[]; values: number[] }>();
  for (let i = 0; i < senders.length; i++) {
    let bucket = byId.get(senders[i]);
    if (!bucket) {
      if (byId.size >= NEST_ADAPTER_LIMITS.maxSplitSeries) {
        return {
          ok: false,
          errors: [`senders: at most ${NEST_ADAPTER_LIMITS.maxSplitSeries} sender series can be split inline`],
        };
      }
      bucket = { times: [], values: [] };
      byId.set(senders[i], bucket);
    } else if (times[i] <= bucket.times[bucket.times.length - 1]) {
      return {
        ok: false,
        errors: [`sender ${senders[i]}: times must be strictly increasing after split`],
      };
    }
    bucket.times.push(times[i]);
    bucket.values.push(values[i]);
  }
  const series: MultimeterSenderSeries[] = [];
  for (const [sender, b] of byId) {
    series.push({ sender, times: b.times, values: Float32Array.from(b.values) });
  }
  return { ok: true, series };
}

export interface GetConnectionsSceneOptions {
  synapseModelSemantics?: readonly SynapseModelMeasurementSemantics[];
  weightUnits?: string;
  delayUnits?: string;
}

export function getConnectionsToSceneData(
  conns: unknown,
  opts: GetConnectionsSceneOptions = {},
): AdapterResult {
  const sizePreflight = preflightArrayFields(
    conns,
    ['sources', 'targets', 'weights', 'delays', 'synapse_models'],
    NEST_ADAPTER_LIMITS.maxConnections,
  );
  if (sizePreflight) return sizePreflight;
  const parsedOptions = parseNestInput(ConnectionOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const parsed = parseNestInput(GetConnectionsSchema, conns);
  if (!parsed.ok) return parsed;
  const { sources, targets, weights, delays, synapse_models: synapseModels } = parsed.data;
  if (
    sources.length > NEST_ADAPTER_LIMITS.maxConnections ||
    targets.length > NEST_ADAPTER_LIMITS.maxConnections ||
    (weights?.length ?? 0) > NEST_ADAPTER_LIMITS.maxConnections ||
    (delays?.length ?? 0) > NEST_ADAPTER_LIMITS.maxConnections ||
    (synapseModels?.length ?? 0) > NEST_ADAPTER_LIMITS.maxConnections
  ) {
    return {
      ok: false,
      errors: [`connections: at most ${NEST_ADAPTER_LIMITS.maxConnections} edges can be adapted inline`],
    };
  }
  const weightUnits = parsedOptions.data.weightUnits;
  const delayUnits = parsedOptions.data.delayUnits;
  if ((weights !== undefined) !== (weightUnits !== undefined)) {
    return {
      ok: false,
      errors: [
        'weightUnits must be supplied exactly when the connection weights channel is present',
      ],
    };
  }
  if ((delays !== undefined) !== (delayUnits !== undefined)) {
    return {
      ok: false,
      errors: [
        'delayUnits must be supplied exactly when the connection delays channel is present',
      ],
    };
  }
  const semantics = validateSynapseModelMeasurementSemantics(
    synapseModels,
    parsedOptions.data.synapseModelSemantics,
    [
      ...(weights !== undefined ? ['weight' as const] : []),
      ...(delays !== undefined ? ['delay' as const] : []),
    ],
  );
  if (!semantics.ok) return semantics;
  const ids = new Set<number>();
  for (let index = 0; index < sources.length; index++) {
    ids.add(sources[index]);
    ids.add(targets[index]);
    if (ids.size > NEST_ADAPTER_LIMITS.maxNetworkNodes) {
      return {
        ok: false,
        errors: [`sources/targets: at most ${NEST_ADAPTER_LIMITS.maxNetworkNodes} unique network nodes can be adapted inline`],
      };
    }
  }
  const networkNodes = Array.from(ids).map((id) => ({
    id,
    label: String(id),
  }));
  const networkEdges = sources.map((source, i) => ({
    source,
    target: targets[i],
    ...(weights ? { weight: weights[i] } : {}),
    ...(delays ? { delay: delays[i] } : {}),
  }));
  return {
    ok: true,
    data: {
      networkNodes,
      networkEdges,
      networkLayout: 'unpositioned',
      ...(weights !== undefined && weights.length > 0
        ? { networkWeightUnits: weightUnits! }
        : {}),
      ...(delays !== undefined && delays.length > 0
        ? { networkDelayUnits: delayUnits! }
        : {}),
    },
  };
}

export function getPositionToSceneData(
  positions: unknown,
  opts: { dims?: 2 | 3; coordinateUnits: string },
): AdapterResult {
  const sizePreflight = preflightArrayFields(
    positions,
    ['positions', 'node_ids'],
    NEST_INPUT_LIMITS.maxPositions,
  ) ?? preflightArrayFields(
    positions,
    ['edges'],
    NEST_ADAPTER_LIMITS.maxConnections,
  );
  if (sizePreflight) return sizePreflight;
  const parsedOptions = parseNestInput(PositionOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  if (parsedOptions.data.dims === 2) {
    const parsed = parseNestInput(GetPosition2DSchema, positions);
    if (!parsed.ok) return parsed;
    return {
      ok: true,
      data: {
        networkLayout: 'provided-2d',
        networkCoordinateUnits: parsedOptions.data.coordinateUnits,
        networkNodes: parsed.data.positions.map(([x, y], i) => ({
          id: parsed.data.node_ids?.[i] ?? i,
          x,
          y,
          z: 0,
          label: String(parsed.data.node_ids?.[i] ?? i),
        })),
      },
    };
  }
  const parsed = parseNestInput(GetPosition3DSchema, positions);
  if (!parsed.ok) return parsed;
  if ((parsed.data.edges?.length ?? 0) > NEST_ADAPTER_LIMITS.maxConnections) {
    return {
      ok: false,
      errors: [`edges: at most ${NEST_ADAPTER_LIMITS.maxConnections} edges can be adapted inline`],
    };
  }
  return {
    ok: true,
    data: {
      networkLayout: 'provided-3d',
      networkCoordinateUnits: parsedOptions.data.coordinateUnits,
      networkNodes: parsed.data.positions.map(([x, y, z], i) => ({
        id: parsed.data.node_ids?.[i] ?? i,
        x,
        y,
        z,
        label: String(parsed.data.node_ids?.[i] ?? i),
      })),
      networkEdges: parsed.data.edges?.map((e) => ({
        // `edges` indexes the local positions array; translate to supplied
        // global NEST ids so this output joins GetConnections endpoints.
        source: parsed.data.node_ids?.[e.source] ?? e.source,
        target: parsed.data.node_ids?.[e.target] ?? e.target,
      })),
    },
  };
}

export interface WeightRecorderRecordedTuple {
  readonly kind: 'recorded_tuple_only';
  readonly sender: number;
  readonly target: number;
  readonly port: number;
  readonly receptor: number;
}

export interface WeightRecorderTupleGroup {
  readonly weightRecorderTuple: WeightRecorderRecordedTuple;
  readonly sourceOrdinals: readonly number[];
  readonly times: readonly number[];
  readonly weights: readonly number[];
}

export type WeightRecorderTupleSplitResult =
  | { readonly ok: true; readonly groups: readonly WeightRecorderTupleGroup[] }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Partition raw weight_recorder rows by equality of every recorded tuple field.
 *
 * This is deliberately a structural operation, not a trace adapter. It returns
 * a deeply frozen, detached snapshot retaining source order and every accepted
 * finite binary64 value. It makes no claim that a tuple is a stable NEST
 * connection identity or that repeated rows form one continuous trajectory.
 */
export function splitWeightRecorderByRecordedTuple(
  events: unknown,
): WeightRecorderTupleSplitResult {
  const parsed = parseNestInput(WeightRecorderEventsSchema, events);
  if (!parsed.ok) return parsed;
  const { times, weights, senders, targets, ports, receptors } = parsed.data;

  const buckets = new Map<
    string,
    {
      weightRecorderTuple: WeightRecorderRecordedTuple;
      sourceOrdinals: number[];
      times: number[];
      weights: number[];
    }
  >();
  for (let i = 0; i < times.length; i++) {
    const key =
      `${senders[i]}\u0000${targets[i]}\u0000${ports[i]}\u0000${receptors[i]}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= NEST_ADAPTER_LIMITS.maxSplitSeries) {
        return {
          ok: false,
          errors: [
            `recorded tuple fan-out: at most ${NEST_ADAPTER_LIMITS.maxSplitSeries} structural groups can be split inline`,
          ],
        };
      }
      bucket = {
        weightRecorderTuple: {
          kind: 'recorded_tuple_only',
          sender: senders[i],
          target: targets[i],
          port: ports[i],
          receptor: receptors[i],
        },
        sourceOrdinals: [],
        times: [],
        weights: [],
      };
      buckets.set(key, bucket);
    }
    bucket.sourceOrdinals.push(i);
    bucket.times.push(times[i]);
    bucket.weights.push(weights[i]);
  }

  const groups = Array.from(buckets.values(), (bucket) => Object.freeze({
    weightRecorderTuple: Object.freeze(bucket.weightRecorderTuple),
    sourceOrdinals: Object.freeze(bucket.sourceOrdinals),
    times: Object.freeze(bucket.times),
    weights: Object.freeze(bucket.weights),
  }));
  return Object.freeze({ ok: true as const, groups: Object.freeze(groups) });
}

/**
 * @deprecated This name promised a synapse identity that recorder rows do not
 * establish. It always fails; use splitWeightRecorderByRecordedTuple for a
 * structural partition and bind separate same-run authority before rendering.
 */
export function splitWeightRecorderBySynapse(_events: unknown) {
  return {
    ok: false as const,
    errors: [
      'splitWeightRecorderBySynapse is retired: a recorded (sender,target,port,receptor) tuple is not a self-authenticating synapse identity; use splitWeightRecorderByRecordedTuple for structural inspection',
    ],
  };
}

/**
 * @deprecated Raw weight_recorder rows do not establish one identified,
 * continuous trace. This fail-closed tombstone always returns `ok: false`.
 */
export function weightRecorderToSceneData(
  _events: unknown,
  _opts: { weightUnits?: string } = {},
) {
  return {
    ok: false as const,
    errors: [
      'weightRecorderToSceneData is retired: raw weight_recorder rows do not establish a continuous identified weight trace; partition with splitWeightRecorderByRecordedTuple and render only after binding caller-owned identity and update-semantics evidence',
    ],
  };
}
