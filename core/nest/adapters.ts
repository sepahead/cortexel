// Host-agnostic NEST device-dict → SceneData adapters.
//
// This is the glue that was missing: an agent (or host) holds a plain NEST
// output dict and gets back the typed SceneData the renderer consumes, with
// names normalized (times→traceTimes, global senders→0..N + a label map), axis
// invariants enforced, and value arrays narrowed to Float32Array for the GPU
// while time axes stay float64. No host/NEST import — plain dicts only.

import type { SceneData } from '../designLaws';
import {
  GetConnectionsSchema,
  GetPosition2DSchema,
  GetPosition3DSchema,
  MultimeterEventsSchema,
  MultimeterMultiSenderSchema,
  SpikeRecorderEventsSchema,
  WeightRecorderEventsSchema,
} from './shapes';

export type AdapterResult =
  | { ok: true; data: SceneData; senderIndexMap?: Map<number, number> }
  | { ok: false; errors: string[] };

function zerr(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): { ok: false; errors: string[] } {
  return {
    ok: false,
    errors: error.issues.map(
      (i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`,
    ),
  };
}

/** Re-index arbitrary global NEST sender ids onto a dense 0..N-1 range, keeping
 *  the mapping so a host can recover original ids / attach population labels. */
function denseIndex(senders: number[]): {
  dense: Float32Array;
  map: Map<number, number>;
} {
  const map = new Map<number, number>();
  const dense = new Float32Array(senders.length);
  let next = 0;
  for (let i = 0; i < senders.length; i++) {
    const s = senders[i];
    let idx = map.get(s);
    if (idx === undefined) {
      idx = next++;
      map.set(s, idx);
    }
    dense[i] = idx;
  }
  return { dense, map };
}

export function spikeRecorderToSceneData(events: unknown): AdapterResult {
  const parsed = SpikeRecorderEventsSchema.safeParse(events);
  if (!parsed.success) return zerr(parsed.error);
  const { senders, times } = parsed.data;
  const { dense, map } = denseIndex(senders);
  return {
    ok: true,
    data: {
      spikeTimes: Float32Array.from(times),
      spikeSenders: dense,
    },
    senderIndexMap: map,
  };
}

export function multimeterToSceneData(
  events: unknown,
  opts: { variable?: string; units?: string } = {},
): AdapterResult {
  const parsed = MultimeterEventsSchema.safeParse(events);
  if (!parsed.success) return zerr(parsed.error);
  const { times, values } = parsed.data;
  const traceTimes = Float32Array.from(times);
  const variable = opts.variable;
  // Only a membrane-voltage recording goes into voltageTraces. Any other analog
  // variable (Ca, IP3, conductance, current) is self-labeled in analogTraces so
  // a renderer cannot mislabel it as mV.
  const isVoltage =
    variable === undefined || /^v_?m$/i.test(variable) || variable === 'V_m';
  if (isVoltage) {
    return { ok: true, data: { traceTimes, voltageTraces: Float32Array.from(values) } };
  }
  return {
    ok: true,
    data: {
      traceTimes,
      analogTraces: {
        values: Float32Array.from(values),
        variable,
        units: opts.units ?? 'unknown',
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
  const parsed = MultimeterMultiSenderSchema.safeParse(events);
  if (!parsed.success) return zerr(parsed.error);
  const { times, values, senders } = parsed.data;
  const byId = new Map<number, { times: number[]; values: number[] }>();
  for (let i = 0; i < senders.length; i++) {
    let bucket = byId.get(senders[i]);
    if (!bucket) {
      bucket = { times: [], values: [] };
      byId.set(senders[i], bucket);
    }
    bucket.times.push(times[i]);
    bucket.values.push(values[i]);
  }
  const series: MultimeterSenderSeries[] = [];
  const errors: string[] = [];
  for (const [sender, b] of byId) {
    for (let i = 1; i < b.times.length; i++) {
      if (b.times[i] < b.times[i - 1]) {
        errors.push(`sender ${sender}: times are non-monotonic after split`);
        break;
      }
    }
    series.push({ sender, times: b.times, values: Float32Array.from(b.values) });
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, series };
}

export function getConnectionsToSceneData(conns: unknown): AdapterResult {
  const parsed = GetConnectionsSchema.safeParse(conns);
  if (!parsed.success) return zerr(parsed.error);
  const { sources, targets, weights } = parsed.data;
  const ids = new Set<number>();
  sources.forEach((s) => ids.add(s));
  targets.forEach((t) => ids.add(t));
  const networkNodes = Array.from(ids).map((id, i) => ({
    id,
    // Place on a ring so a topology scene has something honest to draw; the host
    // can override with real GetPosition data via getPositionToSceneData.
    x: Math.cos((2 * Math.PI * i) / ids.size),
    y: Math.sin((2 * Math.PI * i) / ids.size),
    z: 0,
    label: String(id),
  }));
  const networkEdges = sources.map((source, i) => ({
    source,
    target: targets[i],
    weight: weights ? weights[i] : 1,
  }));
  return { ok: true, data: { networkNodes, networkEdges } };
}

export function getPositionToSceneData(
  positions: unknown,
  opts: { dims: 2 | 3 } = { dims: 3 },
): AdapterResult {
  if (opts.dims === 2) {
    const parsed = GetPosition2DSchema.safeParse(positions);
    if (!parsed.success) return zerr(parsed.error);
    return {
      ok: true,
      data: {
        networkNodes: parsed.data.positions.map(([x, y], i) => ({
          id: i,
          x,
          y,
          z: 0,
          label: String(i),
        })),
      },
    };
  }
  const parsed = GetPosition3DSchema.safeParse(positions);
  if (!parsed.success) return zerr(parsed.error);
  return {
    ok: true,
    data: {
      networkNodes: parsed.data.positions.map(([x, y, z], i) => ({
        id: i,
        x,
        y,
        z,
        label: String(i),
      })),
      networkEdges: parsed.data.edges?.map((e) => ({
        source: e.source,
        target: e.target,
        weight: 1,
      })),
    },
  };
}

export function weightRecorderToSceneData(events: unknown): AdapterResult {
  const parsed = WeightRecorderEventsSchema.safeParse(events);
  if (!parsed.success) return zerr(parsed.error);
  const { times, weights } = parsed.data;
  return {
    ok: true,
    data: {
      traceTimes: Float32Array.from(times),
      weightSeries: Float32Array.from(weights),
    },
  };
}
