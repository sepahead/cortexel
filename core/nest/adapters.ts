// Host-agnostic NEST device-dict → SceneData adapters.
//
// This is the glue that was missing: an agent (or host) holds a plain NEST
// output dict and gets back the typed SceneData the renderer consumes, with
// names normalized (times→traceTimes, global senders→0..N + a label map), axis
// invariants enforced, and value arrays narrowed to Float32Array for the GPU
// while time axes stay float64. No host/NEST import — plain dicts only.

import type { SceneData } from '../designLaws';
import { z, type ZodType } from 'zod';
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
  formatValidationIssues,
  safeDiagnosticText,
} from '../safeRuntime';

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
  weightUnits: z.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
  delayUnits: z.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
}).strict();
const PositionOptionsSchema = z.object({
  dims: z.union([z.literal(2), z.literal(3)]).default(3),
  coordinateUnits: z.string().trim().min(1).max(80).regex(SAFE_DISPLAY_STRING_PATTERN),
}).strict();
const WeightOptionsSchema = z.object({
  weightUnits: z.string().max(80).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
}).strict();

function zerr(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): { ok: false; errors: string[] } {
  return {
    ok: false,
    errors: formatValidationIssues(error.issues),
  };
}

function snapshotAdapterRecord(
  input: unknown,
): { ok: true; value: unknown } | { ok: false; errors: string[] } {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: true, value: input };
  }
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false, errors: ['(root): device payload must be a plain object'] };
    }
    const keys = Reflect.ownKeys(input);
    if (keys.length > NEST_ADAPTER_LIMITS.maxRootKeys) {
      const samples = keys.slice(0, 8).map((key) => safeDiagnosticText(
        JSON.stringify(typeof key === 'string' ? key.slice(0, 60) : '<symbol>'),
        80,
      ));
      return {
        ok: false,
        errors: [
          `(root): payload has ${keys.length} fields; at most ${NEST_ADAPTER_LIMITS.maxRootKeys} are allowed (sample: ${samples.join(', ')})`,
        ],
      };
    }
    const snapshot: Record<string, unknown> = {};
    for (const key of keys) {
      if (typeof key !== 'string') {
        return { ok: false, errors: ['(root): symbol fields are not allowed'] };
      }
      if (key.length > 120) {
        return { ok: false, errors: ['(root): field names may contain at most 120 characters'] };
      }
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        return {
          ok: false,
          errors: [`field ${safeDiagnosticText(JSON.stringify(key), 140)} must be an enumerable data property`],
        };
      }
      if (typeof descriptor.value === 'string' && descriptor.value.length > 5_000) {
        return {
          ok: false,
          errors: [`field ${safeDiagnosticText(JSON.stringify(key), 140)} has a string value exceeding 5000 characters`],
        };
      }
      Object.defineProperty(snapshot, key, {
        value: descriptor.value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return { ok: true, value: snapshot };
  } catch {
    return { ok: false, errors: ['(root): device payload could not be safely inspected'] };
  }
}

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
        itemCount = (value as unknown as ArrayLike<unknown>).length;
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

function parseInput<T>(
  schema: ZodType<T>,
  input: unknown,
): { ok: true; data: T } | { ok: false; errors: string[] } {
  try {
    const snapshot = snapshotAdapterRecord(input);
    if (!snapshot.ok) return snapshot;
    const parsed = schema.safeParse(snapshot.value);
    return parsed.success ? { ok: true, data: parsed.data } : zerr(parsed.error);
  } catch {
    return {
      ok: false,
      errors: ['input validation could not safely inspect the device payload'],
    };
  }
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
  const parsed = parseInput(SpikeRecorderEventsSchema, events);
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
  const parsedOptions = parseInput(MultimeterOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const parsed = parseInput(MultimeterEventsSchema, events);
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
  const parsed = parseInput(MultimeterMultiSenderSchema, events);
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
    } else if (times[i] < bucket.times[bucket.times.length - 1]) {
      return {
        ok: false,
        errors: [`sender ${senders[i]}: times are non-monotonic after split`],
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

export function getConnectionsToSceneData(
  conns: unknown,
  opts: { weightUnits?: string; delayUnits?: string } = {},
): AdapterResult {
  const sizePreflight = preflightArrayFields(
    conns,
    ['sources', 'targets', 'weights', 'delays'],
    NEST_ADAPTER_LIMITS.maxConnections,
  );
  if (sizePreflight) return sizePreflight;
  const parsedOptions = parseInput(ConnectionOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const parsed = parseInput(GetConnectionsSchema, conns);
  if (!parsed.ok) return parsed;
  const { sources, targets, weights, delays } = parsed.data;
  if (
    sources.length > NEST_ADAPTER_LIMITS.maxConnections ||
    targets.length > NEST_ADAPTER_LIMITS.maxConnections ||
    (weights?.length ?? 0) > NEST_ADAPTER_LIMITS.maxConnections ||
    (delays?.length ?? 0) > NEST_ADAPTER_LIMITS.maxConnections
  ) {
    return {
      ok: false,
      errors: [`connections: at most ${NEST_ADAPTER_LIMITS.maxConnections} edges can be adapted inline`],
    };
  }
  const weightUnits = parsedOptions.data.weightUnits?.trim();
  const delayUnits = parsedOptions.data.delayUnits?.trim();
  if (weights && !weightUnits) {
    return {
      ok: false,
      errors: ['weightUnits is required when connection weights are present'],
    };
  }
  if (delays && !delayUnits) {
    return {
      ok: false,
      errors: ['delayUnits is required when connection delays are present'],
    };
  }
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
      ...(weightUnits ? { networkWeightUnits: weightUnits } : {}),
      ...(delayUnits ? { networkDelayUnits: delayUnits } : {}),
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
  const parsedOptions = parseInput(PositionOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  if (parsedOptions.data.dims === 2) {
    const parsed = parseInput(GetPosition2DSchema, positions);
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
  const parsed = parseInput(GetPosition3DSchema, positions);
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

export function weightRecorderToSceneData(
  events: unknown,
  opts: { weightUnits?: string } = {},
): AdapterResult {
  const parsedOptions = parseInput(WeightOptionsSchema, opts);
  if (!parsedOptions.ok) return parsedOptions;
  const weightUnits = parsedOptions.data.weightUnits?.trim();
  if (!weightUnits) {
    return {
      ok: false,
      errors: ['weightUnits is required so a weight trace is never rendered unitless'],
    };
  }
  const parsed = parseInput(WeightRecorderEventsSchema, events);
  if (!parsed.ok) return parsed;
  const { times, weights, senders, targets, sender, target } = parsed.data;
  let pairFromArrays: { sender: number; target: number } | undefined;
  if (senders && targets) {
    const pairs = new Set<string>();
    for (let i = 0; i < senders.length; i++) {
      pairs.add(`${senders[i]}\u0000${targets[i]}`);
      if (pairs.size > 1) {
        return {
          ok: false,
          errors: [
            'weight recorder contains multiple sender/target pairs; call splitWeightRecorderBySynapse before adapting a single trace',
          ],
        };
      }
    }
    pairFromArrays = { sender: senders[0], target: targets[0] };
  }
  for (let i = 1; i < times.length; i++) {
    if (times[i] < times[i - 1]) {
      return {
        ok: false,
        errors: [
          'weight times are non-monotonic; split a multi-synapse recorder before adapting a single trace',
        ],
      };
    }
  }
  return {
    ok: true,
    data: {
      traceTimes: Float64Array.from(times),
      weightSeries: Float32Array.from(weights),
      weightUnits,
      timeUnits: 'ms',
      ...(sender !== undefined && target !== undefined
        ? { weightSynapse: { sender, target } }
        : pairFromArrays
          ? { weightSynapse: pairFromArrays }
        : {}),
    },
  };
}

export interface WeightSynapseSeries {
  sender: number;
  target: number;
  times: number[];
  weights: Float32Array;
}

export type WeightRecorderSplitResult =
  | { ok: true; series: WeightSynapseSeries[] }
  | { ok: false; errors: string[] };

/** Split a multi-synapse weight_recorder dump into one honest trace per
 *  (sender,target) pair. The single-trace adapter deliberately refuses to merge
 *  these series because doing so invents discontinuous plasticity dynamics. */
export function splitWeightRecorderBySynapse(
  events: unknown,
): WeightRecorderSplitResult {
  const parsed = parseInput(WeightRecorderEventsSchema, events);
  if (!parsed.ok) return parsed;
  const { times, weights, senders, targets } = parsed.data;
  if (!senders || !targets) {
    return {
      ok: false,
      errors: ['senders and targets are required to split weight samples by synapse'],
    };
  }

  const buckets = new Map<
    string,
    { sender: number; target: number; times: number[]; weights: number[] }
  >();
  for (let i = 0; i < times.length; i++) {
    const key = `${senders[i]}\u0000${targets[i]}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= NEST_ADAPTER_LIMITS.maxSplitSeries) {
        return {
          ok: false,
          errors: [`senders/targets: at most ${NEST_ADAPTER_LIMITS.maxSplitSeries} synapse series can be split inline`],
        };
      }
      bucket = {
        sender: senders[i],
        target: targets[i],
        times: [],
        weights: [],
      };
      buckets.set(key, bucket);
    } else if (times[i] < bucket.times[bucket.times.length - 1]) {
      return {
        ok: false,
        errors: [
          `synapse ${senders[i]}→${targets[i]}: times are non-monotonic after split`,
        ],
      };
    }
    bucket.times.push(times[i]);
    bucket.weights.push(weights[i]);
  }

  const series = Array.from(buckets.values(), (bucket) => ({
    sender: bucket.sender,
    target: bucket.target,
    times: bucket.times,
    weights: Float32Array.from(bucket.weights),
  }));
  return { ok: true, series };
}
