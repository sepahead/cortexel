// Raw NEST device-output shapes — plain neuroscience-instrument dicts, validated
// with zod. NOTHING here imports Engram or NEST; these are the conventional
// shapes NEST's Python API returns (nest.GetStatus(rec, 'events') etc.), typed
// so a host can hand Cortexel a plain object and get fail-closed validation.
//
// Axis invariants (.superRefine): mismatched-length event arrays, empty traces,
// and non-finite samples are "unusable evidence" and are rejected here rather
// than rendering a misleading figure. Time axes stay number[] (float64) — never
// narrowed to Float32 — because ms timestamps lose precision at float32 scale.

import { z } from 'zod';

const finiteNumberArray = z
  .array(z.number())
  .refine((a) => a.every((v) => Number.isFinite(v)), {
    message: 'array contains non-finite values (NaN/Inf) — unusable evidence',
  });

const nonEmptyFinite = finiteNumberArray.min(
  1,
  'empty array — no samples to render',
);

// A single finite number (for tuple coordinates that become GPU geometry).
const finiteNum = z
  .number()
  .refine((v) => Number.isFinite(v), 'non-finite value (NaN/Inf)');

/** spike_recorder events: nest.GetStatus(sr, 'events') → {senders, times}. */
export const SpikeRecorderEventsSchema = z
  .object({
    senders: finiteNumberArray, // becomes denseIndex Map keys — reject NaN/Inf
    times: finiteNumberArray,
  })
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
    values: nonEmptyFinite,
  })
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
      if (v.times[i] < v.times[i - 1]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'multimeter times are non-monotonic — likely multiple senders flattened together; split per sender before adapting',
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
    values: nonEmptyFinite,
    senders: finiteNumberArray.min(1, 'no senders'),
  })
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
    sources: finiteNumberArray.min(1, 'no connections'),
    targets: finiteNumberArray.min(1, 'no connections'),
    weights: finiteNumberArray.optional(),
    delays: finiteNumberArray.optional(),
  })
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
  });
export type GetConnections = z.infer<typeof GetConnectionsSchema>;

const xyz = z.tuple([finiteNum, finiteNum, finiteNum]);
const xy = z.tuple([finiteNum, finiteNum]);

/** nest.GetPosition(nodes) in 2D → ((x,y), ...). */
export const GetPosition2DSchema = z.object({
  positions: z.array(xy).min(1, 'no positions'),
});
export type GetPosition2D = z.infer<typeof GetPosition2DSchema>;

/** nest.GetPosition(nodes) in 3D → ((x,y,z), ...). */
export const GetPosition3DSchema = z.object({
  positions: z.array(xyz).min(1, 'no positions'),
  edges: z
    .array(z.object({ source: z.number(), target: z.number() }))
    .optional(),
});
export type GetPosition3D = z.infer<typeof GetPosition3DSchema>;

/** weight_recorder events: {times, weights, senders?, targets?}. */
export const WeightRecorderEventsSchema = z
  .object({
    times: nonEmptyFinite,
    weights: nonEmptyFinite,
    senders: finiteNumberArray.optional(),
    targets: finiteNumberArray.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.times.length !== v.weights.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `times (${v.times.length}) and weights (${v.weights.length}) length mismatch`,
      });
    }
  });
export type WeightRecorderEvents = z.infer<typeof WeightRecorderEventsSchema>;
