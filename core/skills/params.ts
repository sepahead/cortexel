// Per-skill typed param schemas. The VizSpec envelope guarantees bounded literal
// JSON; these add the domain shape and cross-field invariants for every skill,
// including skills routed to a host renderer. UNITS are
// promoted from prose to required fields so a unitless payload fails validation
// instead of rendering an unlabeled axis.
//
// validateSkillInvocation enforces these for renderable skills;
// validateSkillParams exposes the same gate for scene-less host routes.
// validateVizSpec remains the lower-level, skill-agnostic envelope check.

import { z } from 'zod';
import { SAFE_DISPLAY_STRING_PATTERN } from '../safeRuntime';

/** Public validation budgets. Hosts with larger corpora should pass handles or
 *  pre-aggregate instead of sending an unbounded inline payload to a browser. */
export const PARAM_LIMITS = Object.freeze({
  // Inline JSON is defensively cloned and schema-validated more than once at
  // the trust boundary. Larger recordings must be decimated/aggregated or
  // referenced out-of-band instead of freezing a browser render.
  maxSamples: 50_000,
  maxSeries: 256,
  maxSpatialObjects: 50_000,
  maxGraphNodes: 1_000,
  maxGraphEdges: 4_000,
});

const FLOAT32_MAX = 3.4028234663852886e38;
const timeArray = z.array(z.number()).max(PARAM_LIMITS.maxSamples);
const gpuNumber = z
  .number()
  .min(-FLOAT32_MAX, 'value exceeds the finite Float32 range used by render buffers')
  .max(FLOAT32_MAX, 'value exceeds the finite Float32 range used by render buffers');
const gpuArray = z.array(gpuNumber).max(PARAM_LIMITS.maxSamples);
const idArray = z
  .array(
    z
      .number()
      .int('node/sender ids must be integers')
      .nonnegative('node/sender ids must be non-negative')
      .max(Number.MAX_SAFE_INTEGER, 'node/sender ids must be safe integers'),
  )
  .max(PARAM_LIMITS.maxSamples);
const displayText = (max: number) => z
  .string()
  .trim()
  .min(1)
  .max(max)
  .regex(SAFE_DISPLAY_STRING_PATTERN, 'display text must not contain control or bidi characters')
  .meta({ 'x-cortexel-normalize': 'trim' });
const units = displayText(80);
const normalizedRecordKey = z
  .string()
  .min(1)
  .max(80)
  .regex(
    /^\S(?:[\s\S]*\S)?$/,
    'record keys must already be trimmed and contain a non-whitespace character',
  )
  .regex(SAFE_DISPLAY_STRING_PATTERN, 'record keys must not contain control or bidi characters');

function equalLengthIssue(
  ctx: z.RefinementCtx,
  path: string,
  expectedName: string,
  expected: number,
  actual: number,
): void {
  if (actual !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: `${path} length (${actual}) must match ${expectedName} length (${expected})`,
    });
  }
}

function requireMonotonic(
  values: readonly number[],
  ctx: z.RefinementCtx,
  path: string,
): void {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, i],
        message: `${path} must be monotonically non-decreasing`,
      });
      return;
    }
  }
}

export const VoltageTraceParamsSchema = z
  .object({
    times_ms: timeArray.min(1),
    series: z
      .array(gpuArray.min(1))
      .min(1)
      .max(PARAM_LIMITS.maxSeries),
    series_labels: z
      .array(displayText(120))
      .min(1)
      .max(PARAM_LIMITS.maxSeries),
    /** One shared unit for every series. Heterogeneous recorded variables must
     *  be authored as separate specs rather than sharing a misleading axis. */
    units,
  })
  .strict()
  .superRefine((value, ctx) => {
    requireMonotonic(value.times_ms, ctx, 'times_ms');
    value.series.forEach((series, index) => {
      equalLengthIssue(
        ctx,
        `series.${index}`,
        'times_ms',
        value.times_ms.length,
        series.length,
      );
    });
    equalLengthIssue(
      ctx,
      'series_labels',
      'series',
      value.series.length,
      value.series_labels.length,
    );
  });
export type VoltageTraceParams = z.infer<typeof VoltageTraceParamsSchema>;

export const SpikeRasterParamsSchema = z
  .object({
    times_ms: timeArray.min(1),
    senders: idArray.min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'senders',
      'times_ms',
      value.times_ms.length,
      value.senders.length,
    );
  });
export type SpikeRasterParams = z.infer<typeof SpikeRasterParamsSchema>;

export const RateResponseParamsSchema = z
  .object({
    stimulus_amplitudes: gpuArray.min(1),
    rates_hz: gpuArray.min(1),
    stimulus_units: units,
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'rates_hz',
      'stimulus_amplitudes',
      value.stimulus_amplitudes.length,
      value.rates_hz.length,
    );
    for (let index = 0; index < value.rates_hz.length; index++) {
      const rate = value.rates_hz[index];
      if (rate < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rates_hz', index],
          message: 'firing rates cannot be negative',
        });
        break;
      }
    }
  });
export type RateResponseParams = z.infer<typeof RateResponseParamsSchema>;

export const NetworkParamsSchema = z
  .object({
    sources: idArray.min(1),
    targets: idArray.min(1),
    weights: gpuArray.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'targets',
      'sources',
      value.sources.length,
      value.targets.length,
    );
    if (value.weights) {
      equalLengthIssue(
        ctx,
        'weights',
        'sources',
        value.sources.length,
        value.weights.length,
      );
    }
  });
export type NetworkParams = z.infer<typeof NetworkParamsSchema>;

// A 3D positioned node. x/y/z are required numbers so a structurally-broken
// payload (objects:[42], objects:[{x:0}]) fails the strict gate instead of
// rendering blank. Extra keys (id, label, population…) pass through.
const Spatial3DObjectSchema = z
  .object({
    x: gpuNumber,
    y: gpuNumber,
    z: gpuNumber,
  })
  .passthrough();

export const Spatial3DParamsSchema = z
  .object({
    objects: z
      .array(Spatial3DObjectSchema)
      .min(1)
      .max(PARAM_LIMITS.maxSpatialObjects),
    coordinate_units: units,
  })
  .strict();
export type Spatial3DParams = z.infer<typeof Spatial3DParamsSchema>;

export const PlasticityParamsSchema = z
  .object({
    times_ms: timeArray.min(1),
    weights: gpuArray.min(1),
    weight_units: units,
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'weights',
      'times_ms',
      value.times_ms.length,
      value.weights.length,
    );
    requireMonotonic(value.times_ms, ctx, 'times_ms');
  });
export type PlasticityParams = z.infer<typeof PlasticityParamsSchema>;

// grid maps each state variable name → its sampled axis values (a numeric array).
// Requiring numeric arrays (and at least one axis) rejects grid:{} or
// grid:{v:'notanarray'} at the gate instead of rendering an empty phase plane.
export const PhasePlaneParamsSchema = z
  .object({
    grid: z
      .record(normalizedRecordKey, gpuArray.min(1))
      .refine((g) => Object.keys(g).length === 2, {
        message: 'phase-plane grid must declare exactly two non-empty state-variable axes',
      }),
    derivatives: z.record(normalizedRecordKey, gpuArray.min(1)),
    axis_units: z.record(normalizedRecordKey, units),
    derivative_units: z.record(normalizedRecordKey, units),
    axis_order: z
      .tuple([normalizedRecordKey, normalizedRecordKey])
      .refine(([first, second]) => first !== second, {
        message: 'axis_order must name two distinct state variables',
      }),
    flattening: z.literal('row-major-last-axis-fastest'),
  })
  .strict()
  .superRefine((value, ctx) => {
    const axes = Object.keys(value.grid);
    const derivativeNames = Object.keys(value.derivatives);
    if (
      value.axis_order.some((axis) => !Object.hasOwn(value.grid, axis)) ||
      axes.some((axis) => !value.axis_order.includes(axis))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['axis_order'],
        message: 'axis_order must be a permutation of the two grid state variables',
      });
    }
    if (
      derivativeNames.length !== axes.length ||
      axes.some((axis) => !Object.hasOwn(value.derivatives, axis))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['derivatives'],
        message: 'derivatives must declare the same two state variables as grid',
      });
      return;
    }
    for (const [field, values] of [
      ['axis_units', value.axis_units],
      ['derivative_units', value.derivative_units],
    ] as const) {
      const names = Object.keys(values);
      if (names.length !== axes.length || axes.some((axis) => !Object.hasOwn(values, axis))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} must declare units for the same two state variables as grid`,
        });
      }
    }
    const expected = value.grid[axes[0]].length * value.grid[axes[1]].length;
    for (const axis of axes) {
      equalLengthIssue(
        ctx,
        `derivatives.${axis}`,
        'the Cartesian phase-plane grid',
        expected,
        value.derivatives[axis].length,
      );
    }
  });
export type PhasePlaneParams = z.infer<typeof PhasePlaneParamsSchema>;

export const AstrocyteParamsSchema = z
  .object({
    times_ms: timeArray.min(1),
    ca_trace: gpuArray.min(1),
    units,
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'ca_trace',
      'times_ms',
      value.times_ms.length,
      value.ca_trace.length,
    );
    requireMonotonic(value.times_ms, ctx, 'times_ms');
    for (let index = 0; index < value.ca_trace.length; index++) {
      if (value.ca_trace[index] < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ca_trace', index],
          message: 'absolute Ca²⁺ concentration cannot be negative',
        });
        break;
      }
    }
  });
export type AstrocyteParams = z.infer<typeof AstrocyteParamsSchema>;

// Corpus knowledge-graph. Nodes/edges are a closed structural graph of papers,
// models and families. Node/edge item schemas are strict (closed) so a stray
// key is a validation error, not silently rendered — the cross-paper identity
// edges (same_as/variant_of) are advisory structural similarity, never certified
// sameness (the honesty boundary is enforced via requiredProvenanceKeys).
const KnowledgeGraphNodeSchema = z
  .object({
    id: displayText(120),
    kind: z.enum(['paper', 'model', 'family']),
    label: displayText(240),
  })
  .strict();

const KnowledgeGraphEdgeSchema = z
  .object({
    source: displayText(120),
    target: displayText(120),
    kind: z.enum([
      'cites',
      'same_as',
      'variant_of',
      'instantiates',
      'belongs_to_family',
    ]),
  })
  .strict();

export const KnowledgeGraph3DParamsSchema = z
  .object({
    nodes: z
      .array(KnowledgeGraphNodeSchema)
      .min(1)
      .max(PARAM_LIMITS.maxGraphNodes),
    edges: z.array(KnowledgeGraphEdgeSchema).max(PARAM_LIMITS.maxGraphEdges),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    const nodeKinds = new Map<string, 'paper' | 'model' | 'family'>();
    const relationships = new Set<string>();
    let issueCount = 0;
    const addIssue = (issue: Parameters<typeof ctx.addIssue>[0]) => {
      if (issueCount >= 16) return;
      issueCount += 1;
      ctx.addIssue(issue);
    };
    value.nodes.forEach((node, index) => {
      if (ids.has(node.id)) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nodes', index, 'id'],
          message: `duplicate node id '${node.id}'`,
        });
      }
      ids.add(node.id);
      nodeKinds.set(node.id, node.kind);
    });
    value.edges.forEach((edge, index) => {
      const symmetric = edge.kind === 'same_as';
      const source = symmetric && edge.source > edge.target ? edge.target : edge.source;
      const target = symmetric && edge.source > edge.target ? edge.source : edge.target;
      const relationship = JSON.stringify([source, target, edge.kind]);
      if (relationships.has(relationship)) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index],
          message: `duplicate ${edge.kind} edge '${edge.source}' → '${edge.target}'`,
        });
      }
      relationships.add(relationship);
      if (!ids.has(edge.source)) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index, 'source'],
          message: `edge source '${edge.source}' does not reference a node`,
        });
      }
      if (!ids.has(edge.target)) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index, 'target'],
          message: `edge target '${edge.target}' does not reference a node`,
        });
      }
      if (edge.source === edge.target) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index],
          message: 'self-loop edges are not renderable',
        });
      }
      const sourceKind = nodeKinds.get(edge.source);
      const targetKind = nodeKinds.get(edge.target);
      const expected: Record<typeof edge.kind, readonly [string, string]> = {
        cites: ['paper', 'paper'],
        same_as: ['model', 'model'],
        variant_of: ['model', 'model'],
        instantiates: ['paper', 'model'],
        belongs_to_family: ['model', 'family'],
      };
      const [expectedSource, expectedTarget] = expected[edge.kind];
      if (
        sourceKind !== undefined &&
        targetKind !== undefined &&
        (sourceKind !== expectedSource || targetKind !== expectedTarget)
      ) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index],
          message: `${edge.kind} requires ${expectedSource} → ${expectedTarget} endpoints`,
        });
      }
    });
  });
export type KnowledgeGraph3DParams = z.infer<typeof KnowledgeGraph3DParamsSchema>;

// Host-rendered skills still publish structural schemas in the language-neutral
// manifest. `scene:null` means Cortexel does not draw them; it does not mean an
// agent may send an unvalidated host payload.
export const Spatial2DParamsSchema = z
  .object({
    positions: z
      .array(z.tuple([gpuNumber, gpuNumber]))
      .min(1)
      .max(PARAM_LIMITS.maxSpatialObjects),
    coordinate_units: units,
  })
  .strict();
export type Spatial2DParams = z.infer<typeof Spatial2DParamsSchema>;

const correlogramUnits = {
  pearson_coefficient: '1',
  raw_pair_count: 'count',
  count_per_bin: 'count/bin',
  rate_hz: 'Hz',
} as const;

export const CorrelogramParamsSchema = z
  .object({
    lags_ms: timeArray.min(1),
    correlation: gpuArray.min(1),
    normalization: z.enum([
      'pearson_coefficient',
      'raw_pair_count',
      'count_per_bin',
      'rate_hz',
    ]),
    correlation_units: z.enum(['1', 'count', 'count/bin', 'Hz']),
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'correlation',
      'lags_ms',
      value.lags_ms.length,
      value.correlation.length,
    );
    requireMonotonic(value.lags_ms, ctx, 'lags_ms');
    if (value.correlation_units !== correlogramUnits[value.normalization]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correlation_units'],
        message: `correlation_units must be '${correlogramUnits[value.normalization]}' for ${value.normalization}`,
      });
    }
    for (let index = 0; index < value.correlation.length; index++) {
      const sample = value.correlation[index];
      const invalid = value.normalization === 'pearson_coefficient'
        ? sample < -1 || sample > 1
        : value.normalization === 'rate_hz'
          ? sample < 0
          : sample < 0 || !Number.isSafeInteger(sample);
      if (invalid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correlation', index],
          message: value.normalization === 'pearson_coefficient'
            ? 'Pearson coefficients must lie in [-1, 1]'
            : value.normalization === 'rate_hz'
              ? 'correlation rates cannot be negative'
              : 'pair counts must be non-negative safe integers',
        });
        break;
      }
    }
  });
export type CorrelogramParams = z.infer<typeof CorrelogramParamsSchema>;

export const StimulusResponseParamsSchema = z
  .object({
    times_ms: timeArray.min(1),
    stimulus: gpuArray.min(1),
    response: gpuArray.min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'stimulus',
      'times_ms',
      value.times_ms.length,
      value.stimulus.length,
    );
    equalLengthIssue(
      ctx,
      'response',
      'times_ms',
      value.times_ms.length,
      value.response.length,
    );
    requireMonotonic(value.times_ms, ctx, 'times_ms');
  });
export type StimulusResponseParams = z.infer<typeof StimulusResponseParamsSchema>;

export const CompartmentalParamsSchema = z
  .object({
    times_ms: timeArray.min(1),
    compartments: z
      .array(
        z
          .object({
            id: displayText(120),
            parent_id: displayText(120).nullable(),
            label: displayText(240).optional(),
            values: gpuArray.min(1),
          })
          .strict(),
      )
      .min(1)
      .max(PARAM_LIMITS.maxSeries),
  })
  .strict()
  .superRefine((value, ctx) => {
    requireMonotonic(value.times_ms, ctx, 'times_ms');
    const ids = new Set<string>();
    const parents = new Map<string, string | null>();
    let roots = 0;
    value.compartments.forEach((compartment, index) => {
      if (ids.has(compartment.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['compartments', index, 'id'],
          message: `duplicate compartment id '${compartment.id}'`,
        });
      }
      ids.add(compartment.id);
      parents.set(compartment.id, compartment.parent_id);
      if (compartment.parent_id === null) roots += 1;
      equalLengthIssue(
        ctx,
        `compartments.${index}.values`,
        'times_ms',
        value.times_ms.length,
        compartment.values.length,
      );
    });
    if (roots === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['compartments'],
        message: 'at least one root compartment must have parent_id:null',
      });
    }
    value.compartments.forEach((compartment, index) => {
      if (compartment.parent_id !== null && !ids.has(compartment.parent_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['compartments', index, 'parent_id'],
          message: `parent '${compartment.parent_id}' does not reference a compartment`,
        });
      }
      const seen = new Set<string>();
      let cursor: string | null = compartment.id;
      while (cursor !== null && parents.has(cursor)) {
        if (seen.has(cursor)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['compartments', index, 'parent_id'],
            message: 'compartment parent graph must be acyclic',
          });
          break;
        }
        seen.add(cursor);
        cursor = parents.get(cursor) ?? null;
      }
    });
  });
export type CompartmentalParams = z.infer<typeof CompartmentalParamsSchema>;

export const AnimationReplayParamsSchema = z
  .object({
    frames: z
      .array(
        z
          .object({
            time_ms: z.number().nonnegative(),
            state: z
              .record(normalizedRecordKey, z.unknown())
              .refine((state) => Object.keys(state).length > 0, {
                message: 'frame state must contain at least one field',
              }),
            annotation: displayText(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(10_000),
  })
  .strict()
  .superRefine((value, ctx) => {
    requireMonotonic(
      value.frames.map((frame) => frame.time_ms),
      ctx,
      'frames.time_ms',
    );
  });
export type AnimationReplayParams = z.infer<typeof AnimationReplayParamsSchema>;
