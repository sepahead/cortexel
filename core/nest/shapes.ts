// Raw NEST device-output shapes — plain neuroscience-instrument dicts, validated
// with zod. NOTHING here imports a host app or NEST; these are the conventional
// shapes NEST's Python API returns (nest.GetStatus(rec, 'events') etc.), typed
// so a host can hand Cortexel a plain object and get fail-closed validation.
//
// Axis invariants (.superRefine): mismatched-length event arrays, empty traces,
// and non-finite samples are "unusable evidence" and are rejected here rather
// than rendering a misleading figure. Time axes stay number[] (float64) — never
// narrowed to Float32 — because ms timestamps lose precision at float32 scale.

import { z } from 'zod';
import { intrinsicTypedArrayLength } from '../safeRuntime';

export const NEST_INPUT_LIMITS = Object.freeze({
  maxSamples: 100_000,
  maxPositions: 50_000,
});

const FLOAT32_MAX = 3.4028234663852886e38;
const OVERSIZED_ARRAY_INPUT = Object.freeze({ oversizedArray: true });
const INVALID_ARRAY_INPUT = Object.freeze({ invalidArray: true });

function boundedArrayInput(value: unknown, max: number): unknown {
  if (Array.isArray(value)) {
    const length = Object.getOwnPropertyDescriptor(value, 'length');
    if (!length || !('value' in length) || length.value > max) {
      return OVERSIZED_ARRAY_INPUT;
    }
    const itemCount = length.value as number;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== itemCount + 1) return INVALID_ARRAY_INPUT;
    const snapshot = new Array<unknown>(itemCount);
    for (let index = 0; index < itemCount; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        return INVALID_ARRAY_INPUT;
      }
      snapshot[index] = descriptor.value;
    }
    return snapshot;
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const length = intrinsicTypedArrayLength(value);
    if (length === undefined) return INVALID_ARRAY_INPUT;
    return length <= max ? value : OVERSIZED_ARRAY_INPUT;
  }
  return value;
}

function typedNumbersToArray(value: unknown): unknown {
  value = boundedArrayInput(value, NEST_INPUT_LIMITS.maxSamples);
  if (!ArrayBuffer.isView(value) || value instanceof DataView) return value;
  const length = intrinsicTypedArrayLength(value);
  if (length === undefined) return INVALID_ARRAY_INPUT;
  const typed = value as unknown as ArrayLike<number>;
  const snapshot = new Array<number>(length);
  for (let index = 0; index < length; index++) snapshot[index] = typed[index];
  return snapshot;
}

function numberArray(options: {
  min?: number;
  minMessage?: string;
  float32?: boolean;
  integerId?: boolean;
  nonnegativeInteger?: boolean;
} = {}): z.ZodType<number[], unknown> {
  const array = z
    .array(z.unknown())
    .min(options.min ?? 0, options.minMessage)
    .max(NEST_INPUT_LIMITS.maxSamples)
    .superRefine((values, ctx) => {
      for (let index = 0; index < values.length; index++) {
        const value = values[index];
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: 'expected a finite number (NaN/Inf is unusable evidence)',
          });
          return;
        }
        if (options.float32 && Math.abs(value) > FLOAT32_MAX) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: 'value is outside the Float32 range used by GPU buffers',
          });
          return;
        }
        if (
          (options.integerId || options.nonnegativeInteger) &&
          (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: options.integerId
              ? 'node/sender ids must be non-negative safe integers'
              : 'counts must be non-negative safe integers',
          });
          return;
        }
      }
    })
    .transform((values) => values as number[]);
  return z.preprocess(typedNumbersToArray, array);
}

const finiteNumberArray = numberArray();
const float32NumberArray = numberArray({ float32: true });
const nonEmptyFloat32Input = numberArray({
  min: 1,
  minMessage: 'empty array — no samples to render',
  float32: true,
});

const finiteIntegerArray = numberArray({ integerId: true });
const nonEmptyNonnegativeSafeIntegerArray = numberArray({
  min: 1,
  minMessage: 'histogram must contain at least one bin',
  nonnegativeInteger: true,
});
const nonEmptyFiniteIntegerArray = numberArray({
  min: 1,
  minMessage: 'no senders',
  integerId: true,
});
const finiteInteger = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
  .refine((value) => !Object.is(value, -0), 'ids must not be negative zero');

const nonEmptyFinite = numberArray({
  min: 1,
  minMessage: 'empty array — no samples to render',
});
const nonEmptyFloat32Array = numberArray({
  min: 1,
  minMessage: 'empty array — no samples to render',
  float32: true,
});
const nonEmptyFiniteIdArray = numberArray({
  min: 1,
  minMessage: 'no connections',
  integerId: true,
});

function positionArray<const D extends 2 | 3>(
  dimensions: D,
): z.ZodType<(D extends 2 ? [number, number] : [number, number, number])[], unknown> {
  return z.preprocess(
    (value) => boundedArrayInput(value, NEST_INPUT_LIMITS.maxPositions),
    z.array(z.unknown())
    .min(1, 'no positions')
    .max(NEST_INPUT_LIMITS.maxPositions)
    .transform((positions, ctx) => {
      const output: number[][] = [];
      for (let index = 0; index < positions.length; index++) {
        const position = positions[index];
        if (!Array.isArray(position) || position.length !== dimensions) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: `position must be an exact ${dimensions}D coordinate tuple`,
          });
          return z.NEVER;
        }
        const tuple: number[] = [];
        for (let axis = 0; axis < dimensions; axis++) {
          const descriptor = Object.getOwnPropertyDescriptor(position, String(axis));
          const value = descriptor && 'value' in descriptor ? descriptor.value : undefined;
          if (
            !descriptor ||
            !descriptor.enumerable ||
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            Math.abs(value) > FLOAT32_MAX
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, axis],
              message: 'coordinate must be a finite Float32-range number',
            });
            return z.NEVER;
          }
          tuple.push(value);
        }
        output.push(tuple);
      }
      return output as (D extends 2
        ? [number, number]
        : [number, number, number])[];
    }),
  );
}

const localEdgeArray: z.ZodType<{ source: number; target: number }[], unknown> = z
  .preprocess(
    (value) => boundedArrayInput(value, NEST_INPUT_LIMITS.maxSamples),
    z.array(z.unknown()).max(NEST_INPUT_LIMITS.maxSamples).transform((edges, ctx) => {
    const output: { source: number; target: number }[] = [];
    for (let index = 0; index < edges.length; index++) {
      const edge = edges[index];
      if (
        edge === null ||
        typeof edge !== 'object' ||
        Array.isArray(edge) ||
        Reflect.ownKeys(edge).some((key) => key !== 'source' && key !== 'target')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: 'edge must be a strict {source,target} object',
        });
        return z.NEVER;
      }
      const source = Object.getOwnPropertyDescriptor(edge, 'source');
      const target = Object.getOwnPropertyDescriptor(edge, 'target');
      const sourceValue = source && 'value' in source ? source.value : undefined;
      const targetValue = target && 'value' in target ? target.value : undefined;
      if (!source?.enumerable || !target?.enumerable || !finiteInteger.safeParse(sourceValue).success || !finiteInteger.safeParse(targetValue).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: 'edge source/target must be non-negative safe integers',
        });
        return z.NEVER;
      }
      output.push({ source: sourceValue as number, target: targetValue as number });
    }
      return output;
    }),
  );

/** spike_recorder events: nest.GetStatus(sr, 'events') → {senders, times}. */
export const SpikeRecorderEventsSchema = z
  .object({
    senders: finiteIntegerArray, // becomes denseIndex Map keys — reject NaN/Inf
    times: finiteNumberArray,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.senders.length !== v.times.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `senders (${v.senders.length}) and times (${v.times.length}) length mismatch`,
      });
    }
  });
export type SpikeRecorderEvents = z.infer<typeof SpikeRecorderEventsSchema>;

/** multimeter events: {times, <variable>: values}. The host names the variable;
 *  Cortexel takes a normalized {times, values}. */
export const MultimeterEventsSchema = z
  .object({
    times: nonEmptyFinite,
    values: nonEmptyFloat32Input,
    /** Present on a series returned by splitMultimeterBySender. */
    sender: finiteInteger.optional(),
  })
  // A caller must normalize the raw dict and must not accidentally pass the
  // multi-sender form; strictness makes a supplied `senders` field an error.
  .strict()
  .superRefine((v, ctx) => {
    if (v.times.length !== v.values.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `times (${v.times.length}) and values (${v.values.length}) length mismatch`,
      });
    }
    // A single multimeter feeding multiple senders interleaves their samples, so
    // times reset and are non-monotonic. Reject fail-closed: the caller must
    // split per sender before adapting, else the trace is a meaningless zigzag.
    for (let i = 1; i < v.times.length; i++) {
      if (v.times[i] <= v.times[i - 1]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'multimeter times must be strictly increasing — likely multiple senders flattened together; split per sender before adapting',
        });
        break;
      }
    }
  });
export type MultimeterEvents = z.infer<typeof MultimeterEventsSchema>;

/** A multimeter recording multiple senders: {times, values, senders} parallel
 *  arrays (the flattened form a single multimeter actually returns). Split per
 *  sender before rendering — each sender's sub-series must be monotonic. */
export const MultimeterMultiSenderSchema = z
  .object({
    times: nonEmptyFinite,
    values: nonEmptyFloat32Array,
    senders: nonEmptyFiniteIntegerArray,
  })
  .strict()
  .superRefine((v, ctx) => {
    const n = v.times.length;
    if (v.values.length !== n || v.senders.length !== n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'times, values and senders must be the same length',
      });
    }
  });
export type MultimeterMultiSender = z.infer<typeof MultimeterMultiSenderSchema>;

/** nest.GetConnections() → parallel source/target/weight/delay arrays. */
export const GetConnectionsSchema = z
  .object({
    sources: nonEmptyFiniteIdArray,
    targets: nonEmptyFiniteIdArray,
    weights: float32NumberArray.optional(),
    delays: float32NumberArray.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.sources.length !== v.targets.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `sources (${v.sources.length}) and targets (${v.targets.length}) length mismatch`,
      });
    }
    if (v.weights && v.weights.length !== v.sources.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'weights length does not match connection count',
      });
    }
    if (v.delays && v.delays.length !== v.sources.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'delays length does not match connection count',
      });
    }
    if (v.delays) {
      for (let index = 0; index < v.delays.length; index++) {
        if (v.delays[index] <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['delays', index],
            message: 'synaptic delays must be strictly positive durations',
          });
          break;
        }
      }
    }
  });
export type GetConnections = z.infer<typeof GetConnectionsSchema>;

/** nest.GetPosition(nodes) in 2D → ((x,y), ...). */
export const GetPosition2DSchema = z.object({
  positions: positionArray(2),
  node_ids: finiteIntegerArray.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.node_ids && value.node_ids.length !== value.positions.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['node_ids'],
      message: 'node_ids length must match positions length',
    });
  }
  if (value.node_ids && new Set(value.node_ids).size !== value.node_ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['node_ids'],
      message: 'node_ids must be unique',
    });
  }
});
export type GetPosition2D = z.infer<typeof GetPosition2DSchema>;

/** nest.GetPosition(nodes) in 3D → ((x,y,z), ...). */
export const GetPosition3DSchema = z.object({
  positions: positionArray(3),
  node_ids: finiteIntegerArray.optional(),
  edges: localEdgeArray.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.node_ids && value.node_ids.length !== value.positions.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['node_ids'],
      message: 'node_ids length must match positions length',
    });
  }
  if (value.node_ids && new Set(value.node_ids).size !== value.node_ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['node_ids'],
      message: 'node_ids must be unique',
    });
  }
  for (let index = 0; index < (value.edges?.length ?? 0); index++) {
    const edge = value.edges![index];
    if (edge.source >= value.positions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['edges', index, 'source'],
        message: `source index ${edge.source} is outside positions[0..${value.positions.length - 1}]`,
      });
      return;
    }
    if (edge.target >= value.positions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['edges', index, 'target'],
        message: `target index ${edge.target} is outside positions[0..${value.positions.length - 1}]`,
      });
      return;
    }
  }
});
export type GetPosition3D = z.infer<typeof GetPosition3DSchema>;

/** weight_recorder events: {times, weights, senders?, targets?}. */
export const WeightRecorderEventsSchema = z
  .object({
    times: nonEmptyFinite,
    weights: nonEmptyFloat32Input,
    senders: finiteIntegerArray.optional(),
    targets: finiteIntegerArray.optional(),
    /** Present on a single series returned by splitWeightRecorderBySynapse. */
    sender: finiteInteger.optional(),
    target: finiteInteger.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.times.length !== v.weights.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `times (${v.times.length}) and weights (${v.weights.length}) length mismatch`,
      });
    }
    if ((v.senders === undefined) !== (v.targets === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'senders and targets must either both be present or both be omitted',
      });
    }
    if ((v.sender === undefined) !== (v.target === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sender and target must either both be present or both be omitted',
      });
    }
    if (v.sender !== undefined && v.senders !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'use singular sender/target or parallel senders/targets, not both',
      });
    }
    if (v.senders && v.senders.length !== v.times.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['senders'],
        message: 'senders length does not match weight sample count',
      });
    }
    if (v.targets && v.targets.length !== v.times.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targets'],
        message: 'targets length does not match weight sample count',
      });
    }
    // Do not impose global monotonicity here: a multi-synapse recorder may
    // interleave individually-monotonic series whose combined time axis resets.
    // The single-trace adapter and split helper validate the appropriate axis.
  });
export type WeightRecorderEvents = z.infer<typeof WeightRecorderEventsSchema>;

/**
 * Strict internal projection of the documented correlation_detector fields.
 * The public adapter descriptor-projects these from a full device status before
 * applying this schema, so unrelated NEST metadata is accepted but never read.
 */
export const CorrelationDetectorStatusSchema = z
  .object({
    delta_tau: z.number().finite().positive(),
    tau_max: z.number().finite().positive(),
    Tstart: z.number().finite(),
    Tstop: z.number().finite(),
    count_histogram: nonEmptyNonnegativeSafeIntegerArray.optional(),
    histogram: nonEmptyFloat32Input.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!(value.Tstop > value.Tstart)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['Tstop'],
        message: 'Tstop must be greater than Tstart',
      });
    }
    if (value.count_histogram === undefined && value.histogram === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'count_histogram or histogram is required',
      });
    }
  });
export type CorrelationDetectorStatus = z.infer<typeof CorrelationDetectorStatusSchema>;
