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
  maxTopologyNodes: 25_000,
  maxTopologyEdges: 20_000,
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

/** RFC 3339 timestamp with a required seconds component and explicit UTC/
 * numeric offset. Zod's ISO datetime check validates calendar dates and offset
 * ranges; the second pattern closes its optional-seconds extension so portable
 * hosts receive the same strict contract. */
export const Rfc3339TimestampSchema = z
  .iso.datetime({ offset: true })
  .max(80)
  .regex(
    /T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
    'timestamp must be RFC 3339 with seconds and an explicit UTC/numeric offset',
  );
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

/** Portable tolerances shared by the TypeScript gate and manifest constraints.
 * Geometry is purely scale-relative: a fixed absolute epsilon would have physical
 * units and could dwarf a legitimately tiny time or weight bin. Normalized-mass
 * comparisons use a wider tolerance because they accumulate many binary64 values. */
export const HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE = 0;
export const HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE = 1e-9;
/** Bounded allowance for binary64 center ± half-width edge arithmetic. */
export const HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS = 4;
/** No geometry repair may move a boundary by more than this fraction of its
 * local bin width or half-extent, regardless of absolute coordinate origin. */
export const GEOMETRY_MAX_ROUNDOFF_FRACTION = 1e-7;
export const HISTOGRAM_MASS_TOLERANCE = 1e-6;
export const PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE = 1e-6;
/** Population-rate values are derived from integer event counts. Binary64
 * hosts compare the published rate with the specified operation order and this
 * mixed tolerance; a relative component is necessary for legitimately high
 * rates while the absolute term keeps zero/small rates stable. */
export const POPULATION_RATE_ABSOLUTE_TOLERANCE = 1e-9;
export const POPULATION_RATE_RELATIVE_TOLERANCE = 1e-9;

function approximatelyEqual(
  actual: number,
  expected: number,
  absoluteTolerance: number,
  relativeTolerance: number,
): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return Math.abs(actual - expected) <=
    absoluteTolerance + relativeTolerance * Math.max(Math.abs(actual), Math.abs(expected));
}

function requireUniformHistogramBins(
  centers: readonly number[],
  width: number,
  ctx: z.RefinementCtx,
  centerPath: string,
  nonNegativeLowerEdge = false,
): void {
  if (!Number.isFinite(width) || width <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [centerPath],
      message: 'histogram bin width must be a positive finite number',
    });
    return;
  }
  if (nonNegativeLowerEdge && centers.length > 0) {
    const halfWidth = width / 2;
    const lowerEdge = centers[0] - halfWidth;
    const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE +
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE *
        Math.max(Math.abs(centers[0]), Math.abs(halfWidth));
    if (!Number.isFinite(lowerEdge) || lowerEdge < -tolerance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [centerPath, 0],
        message: 'the first ISI bin lower edge cannot be negative',
      });
      return;
    }
  }
  for (let index = 1; index < centers.length; index++) {
    if (!(centers[index] > centers[index - 1])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [centerPath, index],
        message: 'histogram bin centers must be strictly increasing',
      });
      return;
    }
    const delta = centers[index] - centers[index - 1];
    if (!approximatelyEqual(
      delta,
      width,
      HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
    )) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [centerPath, index],
        message: 'adjacent histogram bin centers must differ by the declared bin width',
      });
      return;
    }
  }
}

type HistogramMassMeasure = 'sum' | 'density_integral';

function requireNormalizedHistogramMass(
  normalization: string,
  values: readonly number[],
  width: number,
  rules: Readonly<Record<string, Readonly<{
    measure: HistogramMassMeasure;
    target: number;
  }>>>,
  ctx: z.RefinementCtx,
): void {
  const rule = rules[normalization];
  if (!rule) return;
  let mass = 0;
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) return;
    // Deliberately sum left-to-right: this is the versioned portable evaluator
    // order and avoids cross-language disagreement over reduction algorithms.
    mass += value;
  }
  if (rule.measure === 'density_integral') mass *= width;
  if (!approximatelyEqual(
    mass,
    rule.target,
    HISTOGRAM_MASS_TOLERANCE,
    HISTOGRAM_MASS_TOLERANCE,
  )) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['values'],
      message: rule.measure === 'density_integral'
        ? 'probability-density values times bin width must integrate to 1'
        : 'probability values must sum to 1',
    });
  }
}

const isiValueUnits = {
  count: 'count',
  probability: 'probability',
  probability_density: '1/ms',
} as const;

export const IsiDistributionParamsSchema = z
  .object({
    bin_centers_ms: timeArray.min(1),
    values: gpuArray.min(1),
    bin_width_ms: z.number().positive().max(Number.MAX_VALUE),
    normalization: z.enum(['count', 'probability', 'probability_density']),
    value_units: z.enum(['count', 'probability', '1/ms']),
    interval_scope: z.enum(['per_sender', 'single_train']),
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'values',
      'bin_centers_ms',
      value.bin_centers_ms.length,
      value.values.length,
    );
    requireMonotonic(value.bin_centers_ms, ctx, 'bin_centers_ms');
    requireUniformHistogramBins(
      value.bin_centers_ms,
      value.bin_width_ms,
      ctx,
      'bin_centers_ms',
      true,
    );
    for (let index = 0; index < value.bin_centers_ms.length; index++) {
      if (value.bin_centers_ms[index] < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bin_centers_ms', index],
          message: 'inter-spike interval bin centers cannot be negative',
        });
        break;
      }
    }
    if (value.value_units !== isiValueUnits[value.normalization]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value_units'],
        message: `value_units must be '${isiValueUnits[value.normalization]}' for ${value.normalization}`,
      });
    }
    for (let index = 0; index < value.values.length; index++) {
      const sample = value.values[index];
      if (sample < 0 ||
          (value.normalization === 'probability' && sample > 1) ||
          (value.normalization === 'count' && !Number.isSafeInteger(sample))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values', index],
          message: value.normalization === 'count'
            ? 'histogram counts must be non-negative safe integers'
            : value.normalization === 'probability'
              ? 'probability values must lie in [0, 1]'
              : 'histogram values cannot be negative',
        });
        break;
      }
    }
    requireNormalizedHistogramMass(
      value.normalization,
      value.values,
      value.bin_width_ms,
      {
        probability: { measure: 'sum', target: 1 },
        probability_density: { measure: 'density_integral', target: 1 },
      },
      ctx,
    );
  });
export type IsiDistributionParams = z.infer<typeof IsiDistributionParamsSchema>;

const psthValueUnits = {
  count: 'count',
  count_per_trial: 'count/trial',
  rate_hz: 'Hz',
} as const;

function requirePsthDerivedCounts(
  normalization: keyof typeof psthValueUnits,
  values: readonly number[],
  trialCount: number,
  binWidthMs: number,
  ctx: z.RefinementCtx,
): void {
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    let rawCount: number;
    switch (normalization) {
      case 'count':
        rawCount = value;
        break;
      case 'count_per_trial':
        rawCount = value * trialCount;
        break;
      case 'rate_hz':
        // This operation order is part of the portable contract. Do not replace
        // it with a fused or algebraically reordered expression in another host.
        rawCount = value * trialCount;
        rawCount *= binWidthMs;
        rawCount /= 1000;
        break;
    }
    const rounded = Math.round(rawCount);
    const exactCount = normalization === 'count';
    if (
      !Number.isFinite(rawCount) ||
      rawCount < 0 ||
      !Number.isSafeInteger(rounded) ||
      (exactCount
        ? !Number.isSafeInteger(rawCount)
        : Math.abs(rawCount - rounded) > PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['values', index],
        message: exactCount
          ? 'aggregate PSTH counts must be non-negative safe integers'
          : 'normalized PSTH values must recover a non-negative safe-integer aggregate spike count',
      });
      return;
    }
  }
}

export const PsthParamsSchema = z
  .object({
    bin_centers_ms: timeArray.min(1),
    values: gpuArray.min(1),
    bin_width_ms: z.number().positive().max(Number.MAX_VALUE),
    normalization: z.enum(['count', 'count_per_trial', 'rate_hz']),
    value_units: z.enum(['count', 'count/trial', 'Hz']),
    trial_count: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    alignment_event: displayText(240),
    aggregation: z.literal('selected_senders_per_trial'),
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'values',
      'bin_centers_ms',
      value.bin_centers_ms.length,
      value.values.length,
    );
    requireMonotonic(value.bin_centers_ms, ctx, 'bin_centers_ms');
    requireUniformHistogramBins(
      value.bin_centers_ms,
      value.bin_width_ms,
      ctx,
      'bin_centers_ms',
    );
    if (value.value_units !== psthValueUnits[value.normalization]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value_units'],
        message: `value_units must be '${psthValueUnits[value.normalization]}' for ${value.normalization}`,
      });
    }
    for (let index = 0; index < value.values.length; index++) {
      const sample = value.values[index];
      if (sample < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values', index],
          message: 'histogram values cannot be negative',
        });
        break;
      }
    }
    requirePsthDerivedCounts(
      value.normalization,
      value.values,
      value.trial_count,
      value.bin_width_ms,
      ctx,
    );
  });
export type PsthParams = z.infer<typeof PsthParamsSchema>;

const PopulationRateSeriesSchema = z
  .object({
    id: displayText(120),
    label: displayText(240),
    recorded_sender_count: z
      .number()
      .int('recorded_sender_count must be an integer')
      .positive('recorded_sender_count must be positive')
      .max(Number.MAX_SAFE_INTEGER, 'recorded_sender_count must be a safe integer'),
    spike_counts: z
      .array(
        z
          .number()
          .int('spike counts must be integers')
          .nonnegative('spike counts cannot be negative')
          .max(Number.MAX_SAFE_INTEGER, 'spike counts must be safe integers'),
      )
      .min(1)
      .max(PARAM_LIMITS.maxSamples),
    rates_hz: gpuArray.min(1),
  })
  .strict();

function requirePopulationRateWindow(
  centers: readonly number[],
  width: number,
  start: number,
  stop: number,
  ctx: z.RefinementCtx,
): void {
  if (!(stop > start)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['window_stop_ms'],
      message: 'window_stop_ms must be greater than window_start_ms',
    });
    return;
  }
  if (centers.length === 0 || !Number.isFinite(width) || width <= 0) return;
  const halfWidth = width / 2;
  const firstCenter = centers[0];
  const lastCenter = centers[centers.length - 1];
  const firstEdge = firstCenter - halfWidth;
  const lastEdge = lastCenter + halfWidth;
  const edgeMatches = (edge: number, expected: number, center: number) => {
    const difference = Math.abs(edge - expected);
    if (difference === 0) return true;
    const arithmeticTolerance = HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS *
      Number.EPSILON * Math.max(
        Math.abs(center),
        Math.abs(halfWidth),
        Math.abs(edge),
        Math.abs(expected),
      );
    if (arithmeticTolerance > GEOMETRY_MAX_ROUNDOFF_FRACTION * Math.abs(width)) {
      return false;
    }
    const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE +
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.abs(width) +
      arithmeticTolerance;
    return Number.isFinite(edge) && Number.isFinite(expected) &&
      difference <= tolerance;
  };
  if (!edgeMatches(firstEdge, start, firstCenter)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bin_centers_ms', 0],
      message: 'the first left-closed bin edge must equal window_start_ms',
    });
  }
  if (!edgeMatches(lastEdge, stop, lastCenter)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bin_centers_ms', centers.length - 1],
      message: 'the final right-open bin edge must equal window_stop_ms',
    });
  }
}

function requirePopulationRateValues(
  series: readonly z.infer<typeof PopulationRateSeriesSchema>[],
  binCount: number,
  binWidthMs: number,
  ctx: z.RefinementCtx,
): void {
  const ids = new Set<string>();
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const item = series[seriesIndex];
    if (ids.has(item.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['series', seriesIndex, 'id'],
        message: `duplicate population-rate series id '${item.id}'`,
      });
    }
    ids.add(item.id);
    equalLengthIssue(
      ctx,
      `series.${seriesIndex}.spike_counts`,
      'bin_centers_ms',
      binCount,
      item.spike_counts.length,
    );
    equalLengthIssue(
      ctx,
      `series.${seriesIndex}.rates_hz`,
      'bin_centers_ms',
      binCount,
      item.rates_hz.length,
    );
    const sampleCount = Math.min(item.spike_counts.length, item.rates_hz.length);
    for (let binIndex = 0; binIndex < sampleCount; binIndex++) {
      const rate = item.rates_hz[binIndex];
      if (rate < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['series', seriesIndex, 'rates_hz', binIndex],
          message: 'population rates cannot be negative',
        });
        continue;
      }
      // Portable operation order: multiply the integer count by 1000, form the
      // sender×bin-width denominator, then divide once in IEEE-754 binary64.
      let expected = item.spike_counts[binIndex] * 1000;
      const denominator = item.recorded_sender_count * binWidthMs;
      expected /= denominator;
      if (!Number.isFinite(denominator) || !approximatelyEqual(
        rate,
        expected,
        POPULATION_RATE_ABSOLUTE_TOLERANCE,
        POPULATION_RATE_RELATIVE_TOLERANCE,
      )) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['series', seriesIndex, 'rates_hz', binIndex],
          message: 'rate must equal spike_count × 1000 / (recorded_sender_count × bin_width_ms)',
        });
      }
    }
  }
}

export const PopulationRateParamsSchema = z
  .object({
    bin_centers_ms: timeArray.min(1),
    bin_width_ms: z.number().positive().max(Number.MAX_VALUE),
    window_start_ms: z.number(),
    window_stop_ms: z.number(),
    series: z
      .array(PopulationRateSeriesSchema)
      .min(1)
      .max(PARAM_LIMITS.maxSeries),
    normalization: z.literal('mean_per_recorded_sender_hz'),
    aggregation: z.literal('selected_senders'),
    binning: z.literal('left_closed_right_open'),
  })
  .strict()
  .superRefine((value, ctx) => {
    requireUniformHistogramBins(
      value.bin_centers_ms,
      value.bin_width_ms,
      ctx,
      'bin_centers_ms',
    );
    requirePopulationRateWindow(
      value.bin_centers_ms,
      value.bin_width_ms,
      value.window_start_ms,
      value.window_stop_ms,
      ctx,
    );
    requirePopulationRateValues(
      value.series,
      value.bin_centers_ms.length,
      value.bin_width_ms,
      ctx,
    );
  });
export type PopulationRateParams = z.infer<typeof PopulationRateParamsSchema>;

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
    delays: gpuArray.optional(),
    weight_units: units.optional(),
    delay_units: units.optional(),
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
    if (value.delays) {
      equalLengthIssue(
        ctx,
        'delays',
        'sources',
        value.sources.length,
        value.delays.length,
      );
      const index = value.delays.findIndex((delay) => delay <= 0);
      if (index >= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['delays', index],
          message: 'connection delays must be strictly positive',
        });
      }
    }
    if ((value.weights !== undefined) !== (value.weight_units !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weight_units'],
        message: 'weight_units must be present exactly when weights are present',
      });
    }
    if ((value.delays !== undefined) !== (value.delay_units !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['delay_units'],
        message: 'delay_units must be present exactly when delays are present',
      });
    }
  });
export type NetworkParams = z.infer<typeof NetworkParamsSchema>;

const topologyCount = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
  .refine((value) => !Object.is(value, -0), 'topology counts and ranks must not be negative zero');
const topologyPositiveCount = topologyCount.positive();

const MpiTargetRankLocalScopeSchema = z
  .object({
    kind: z.literal('mpi_target_rank_local'),
    rank: topologyCount,
    world_size: topologyPositiveCount,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.rank >= value.world_size) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rank'],
        message: 'MPI rank must be smaller than world_size',
      });
    }
  });

export const SnapshotScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('single_process_complete') }).strict(),
  MpiTargetRankLocalScopeSchema,
  z.object({
    kind: z.literal('mpi_all_ranks_merged'),
    world_size: topologyPositiveCount,
  }).strict(),
]);
export type SnapshotScope = z.infer<typeof SnapshotScopeSchema>;

const MpiRankLocalPositionScopeSchema = z
  .object({
    kind: z.literal('mpi_rank_local'),
    rank: topologyCount,
    world_size: topologyPositiveCount,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.rank >= value.world_size) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rank'],
        message: 'MPI rank must be smaller than world_size',
      });
    }
  });

export const PositionScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('single_process_complete') }).strict(),
  MpiRankLocalPositionScopeSchema,
  z.object({
    kind: z.literal('mpi_all_ranks_merged'),
    world_size: topologyPositiveCount,
  }).strict(),
]);
export type PositionScope = z.infer<typeof PositionScopeSchema>;

const ConnectionGraphNodeSchema = z
  .object({
    id: idArray.element,
    label: displayText(120),
  })
  .strict();

const ConnectionGraphEdgeSchema = z
  .object({
    id: displayText(240),
    source: idArray.element,
    target: idArray.element,
    weight: gpuNumber.optional(),
    delay_ms: gpuNumber.positive().optional(),
    synapse_model: displayText(120).optional(),
  })
  .strict();

function canonicalEdgeIdInteger(value: string): number | undefined {
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && String(parsed) === value
    ? parsed
    : undefined;
}

export const ConnectionGraphParamsSchema = z
  .object({
    nodes: z.array(ConnectionGraphNodeSchema).min(1).max(PARAM_LIMITS.maxTopologyNodes),
    edges: z.array(ConnectionGraphEdgeSchema).max(PARAM_LIMITS.maxTopologyEdges),
    weight_units: units.optional(),
    delay_units: z.literal('ms').optional(),
    layout: z.literal('schematic_circle'),
    parallel_edges: z.literal('preserved'),
    self_connections: z.literal('preserved'),
    snapshot_time_ms: z.number().finite().nonnegative(),
    snapshot_scope: SnapshotScopeSchema,
    sample_policy: z.enum(['complete', 'deterministic_even_stride']),
    source_connection_count: topologyCount,
    edge_identity: z.enum(['nest_connection_identifier', 'canonical_sorted_ordinal']),
  })
  .strict()
  .superRefine((value, ctx) => {
    const nodeIds = new Set<number>();
    for (let index = 0; index < value.nodes.length; index++) {
      const id = value.nodes[index].id;
      if (nodeIds.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nodes', index, 'id'],
          message: 'graph node ids must be unique',
        });
      }
      nodeIds.add(id);
    }
    const edgeIds = new Set<string>();
    let weightCount = 0;
    let delayCount = 0;
    let modelCount = 0;
    for (let index = 0; index < value.edges.length; index++) {
      const edge = value.edges[index];
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index, 'id'],
          message: 'graph edge ids must be unique',
        });
      }
      edgeIds.add(edge.id);
      if (!nodeIds.has(edge.source)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index, 'source'],
          message: 'graph edge source must reference a declared node',
        });
      }
      if (!nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index, 'target'],
          message: 'graph edge target must reference a declared node',
        });
      }
      if (edge.weight !== undefined) weightCount += 1;
      if (edge.delay_ms !== undefined) delayCount += 1;
      if (edge.synapse_model !== undefined) modelCount += 1;
      const idParts = edge.id.split(':');
      if (value.edge_identity === 'canonical_sorted_ordinal') {
        const ordinal = idParts.length === 2 && idParts[0] === 'connection'
          ? canonicalEdgeIdInteger(idParts[1])
          : undefined;
        if (ordinal === undefined || ordinal >= value.source_connection_count) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['edges', index, 'id'],
            message: 'canonical edge ids must be connection:<source ordinal> within source_connection_count',
          });
        }
      } else {
        const components = idParts.length === 6 && idParts[0] === 'connection'
          ? idParts.slice(1).map(canonicalEdgeIdInteger)
          : [];
        if (
          components.length !== 5 || components.some((component) => component === undefined) ||
          components[0] !== edge.source || components[1] !== edge.target
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['edges', index, 'id'],
            message: 'NEST edge ids must be connection:source:target:target_thread:synapse_id:port and match the edge endpoints',
          });
        }
      }
    }
    for (const [field, count] of [
      ['weight', weightCount],
      ['delay_ms', delayCount],
      ['synapse_model', modelCount],
    ] as const) {
      if (count !== 0 && count !== value.edges.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges'],
          message: `${field} must be present on every graph edge or none`,
        });
      }
    }
    if ((weightCount > 0) !== (value.weight_units !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weight_units'],
        message: 'weight_units must be present exactly when every edge carries weight',
      });
    }
    if ((delayCount > 0) !== (value.delay_units !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['delay_units'],
        message: 'delay_units must be present exactly when every edge carries delay_ms',
      });
    }
    if (value.sample_policy === 'complete') {
      if (value.source_connection_count !== value.edges.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['source_connection_count'],
          message: 'complete graph output must contain every source connection',
        });
      }
    } else if (
      value.edges.length === 0 ||
      value.source_connection_count <= value.edges.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source_connection_count'],
        message: 'deterministic_even_stride requires a non-empty strict subset of source connections',
      });
    }
  });
export type ConnectionGraphParams = z.infer<typeof ConnectionGraphParamsSchema>;

const MatrixCellBaseSchema = z
  .object({
    source_id: idArray.element,
    target_id: idArray.element,
    connection_count: topologyPositiveCount,
  })
  .strict();

const AdjacencyMatrixCellSchema = MatrixCellBaseSchema;
const WeightMatrixCellSchema = MatrixCellBaseSchema.extend({ value: gpuNumber }).strict();
const DelayMatrixCellSchema = MatrixCellBaseSchema.extend({ value: gpuNumber.positive() }).strict();

const matrixBaseShape = {
  source_ids: idArray.min(1),
  target_ids: idArray.min(1),
  axis_order: z.literal('target_rows_source_columns'),
  absent_cell: z.literal('no_connection'),
  sample_policy: z.literal('complete'),
  connection_count: topologyCount,
  snapshot_time_ms: z.number().finite().nonnegative(),
  snapshot_scope: SnapshotScopeSchema,
} as const;

function refineSparseMatrix(
  value: {
    source_ids: readonly number[];
    target_ids: readonly number[];
    cells: readonly { source_id: number; target_id: number; connection_count: number }[];
    connection_count: number;
  },
  ctx: z.RefinementCtx,
): void {
  const sourceIds = new Set(value.source_ids);
  const targetIds = new Set(value.target_ids);
  if (sourceIds.size !== value.source_ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['source_ids'], message: 'source_ids must be unique' });
  }
  if (targetIds.size !== value.target_ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_ids'], message: 'target_ids must be unique' });
  }
  const pairs = new Set<string>();
  let total = 0;
  for (let index = 0; index < value.cells.length; index++) {
    const cell = value.cells[index];
    if (!sourceIds.has(cell.source_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cells', index, 'source_id'],
        message: 'matrix cell source_id must occur in source_ids',
      });
    }
    if (!targetIds.has(cell.target_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cells', index, 'target_id'],
        message: 'matrix cell target_id must occur in target_ids',
      });
    }
    const pair = `${cell.source_id}\u0000${cell.target_id}`;
    if (pairs.has(pair)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cells', index],
        message: 'matrix cells must contain at most one entry per source-target pair',
      });
    }
    pairs.add(pair);
    total += cell.connection_count;
    if (!Number.isSafeInteger(total)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['connection_count'],
        message: 'matrix connection count sum exceeds the safe-integer range',
      });
      return;
    }
  }
  if (total !== value.connection_count) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['connection_count'],
      message: 'connection_count must equal the sum of sparse cell connection_count values',
    });
  }
}

export const AdjacencyMatrixParamsSchema = z
  .object({
    ...matrixBaseShape,
    cells: z.array(AdjacencyMatrixCellSchema).max(PARAM_LIMITS.maxSamples),
    display: z.literal('binary_presence'),
    aggregation: z.literal('any_connection'),
  })
  .strict()
  .superRefine(refineSparseMatrix);
export type AdjacencyMatrixParams = z.infer<typeof AdjacencyMatrixParamsSchema>;

export const WeightMatrixParamsSchema = z
  .object({
    ...matrixBaseShape,
    cells: z.array(WeightMatrixCellSchema).max(PARAM_LIMITS.maxSamples),
    weight_units: units,
    aggregation: z.enum(['sum', 'mean', 'minimum', 'maximum', 'single_connection']),
  })
  .strict()
  .superRefine((value, ctx) => {
    refineSparseMatrix(value, ctx);
    if (value.aggregation === 'single_connection') {
      const index = value.cells.findIndex((cell) => cell.connection_count !== 1);
      if (index >= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cells', index, 'connection_count'],
          message: 'single_connection aggregation requires exactly one connection per cell',
        });
      }
    }
  });
export type WeightMatrixParams = z.infer<typeof WeightMatrixParamsSchema>;

export const DelayMatrixParamsSchema = z
  .object({
    ...matrixBaseShape,
    cells: z.array(DelayMatrixCellSchema).max(PARAM_LIMITS.maxSamples),
    delay_units: z.literal('ms'),
    aggregation: z.enum(['mean', 'minimum', 'maximum', 'single_connection']),
  })
  .strict()
  .superRefine((value, ctx) => {
    refineSparseMatrix(value, ctx);
    if (value.aggregation === 'single_connection') {
      const index = value.cells.findIndex((cell) => cell.connection_count !== 1);
      if (index >= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cells', index, 'connection_count'],
          message: 'single_connection aggregation requires exactly one connection per cell',
        });
      }
    }
  });
export type DelayMatrixParams = z.infer<typeof DelayMatrixParamsSchema>;

const DEGREE_VALUE_ABSOLUTE_TOLERANCE = 1e-12;
const DEGREE_VALUE_RELATIVE_TOLERANCE = 1e-12;

function degreeDistributionSchema<const D extends 'in' | 'out'>(direction: D) {
  return z
    .object({
      degrees: z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
      node_counts: z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
      values: gpuArray.min(1),
      node_count: topologyPositiveCount,
      connection_count: topologyCount,
      direction: z.literal(direction),
      normalization: z.enum(['count', 'probability']),
      value_units: z.enum(['count', 'probability']),
      edge_counting: z.literal('each_synapse_collection_entry'),
      zero_degree_policy: z.literal('include_declared_universe'),
      sample_policy: z.literal('complete'),
      snapshot_time_ms: z.number().finite().nonnegative(),
      snapshot_scope: SnapshotScopeSchema,
    })
    .strict()
    .superRefine((value, ctx) => {
      equalLengthIssue(ctx, 'node_counts', 'degrees', value.degrees.length, value.node_counts.length);
      equalLengthIssue(ctx, 'values', 'degrees', value.degrees.length, value.values.length);
      for (let index = 0; index < value.degrees.length; index++) {
        if (value.degrees[index] !== index) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['degrees', index],
            message: 'degrees must be the contiguous integer range beginning at zero',
          });
          break;
        }
      }
      let countedNodes = 0;
      let countedConnections = 0;
      for (let index = 0; index < value.node_counts.length; index++) {
        countedNodes += value.node_counts[index];
        countedConnections += index * value.node_counts[index];
      }
      if (!Number.isSafeInteger(countedNodes) || countedNodes !== value.node_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['node_count'],
          message: 'node_count must equal the sum of node_counts',
        });
      }
      if (!Number.isSafeInteger(countedConnections) || countedConnections !== value.connection_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['connection_count'],
          message: 'connection_count must equal the degree-weighted sum of node_counts',
        });
      }
      const expectedUnits = value.normalization === 'count' ? 'count' : 'probability';
      if (value.value_units !== expectedUnits) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value_units'],
          message: `value_units must be '${expectedUnits}' for ${value.normalization}`,
        });
      }
      let displayedMass = 0;
      for (let index = 0; index < Math.min(value.values.length, value.node_counts.length); index++) {
        const displayed = value.values[index];
        if (displayed < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['values', index],
            message: 'displayed degree values cannot be negative',
          });
          break;
        }
        const expected = value.normalization === 'count'
          ? value.node_counts[index]
          : value.node_counts[index] / value.node_count;
        const matches = value.normalization === 'count'
          ? Number.isSafeInteger(displayed) && displayed === expected
          : approximatelyEqual(
              displayed,
              expected,
              DEGREE_VALUE_ABSOLUTE_TOLERANCE,
              DEGREE_VALUE_RELATIVE_TOLERANCE,
            );
        if (!matches) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['values', index],
            message: 'displayed degree value must be derived from node_counts and node_count',
          });
          break;
        }
        displayedMass += displayed;
      }
      if (
        value.normalization === 'probability' &&
        !approximatelyEqual(
          displayedMass,
          1,
          DEGREE_VALUE_ABSOLUTE_TOLERANCE,
          DEGREE_VALUE_RELATIVE_TOLERANCE,
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values'],
          message: 'displayed degree probabilities must sum to one',
        });
      }
      if (direction === 'out' && value.snapshot_scope.kind === 'mpi_target_rank_local') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['snapshot_scope', 'kind'],
          message: 'out-degree requires a complete single-process or all-ranks-merged snapshot',
        });
      }
    });
}

export const InDegreeDistributionParamsSchema = degreeDistributionSchema('in');
export type InDegreeDistributionParams = z.infer<typeof InDegreeDistributionParamsSchema>;
export const OutDegreeDistributionParamsSchema = degreeDistributionSchema('out');
export type OutDegreeDistributionParams = z.infer<typeof OutDegreeDistributionParamsSchema>;

const delayDistributionValueUnits = {
  count: 'count',
  probability: 'probability',
  probability_density: '1/ms',
} as const;

export const DelayDistributionParamsSchema = z
  .object({
    bin_centers_ms: timeArray.min(1),
    delay_counts: z.array(topologyCount).min(1).max(PARAM_LIMITS.maxSamples),
    values: gpuArray.min(1),
    bin_width_ms: z.number().finite().positive(),
    window_start_ms: z.number().finite().nonnegative(),
    window_stop_ms: z.number().finite().positive(),
    normalization: z.enum(['count', 'probability', 'probability_density']),
    value_units: z.enum(['count', 'probability', '1/ms']),
    delay_units: z.literal('ms'),
    aggregation: z.literal('each_connection'),
    binning: z.literal('left_closed_right_open'),
    sample_policy: z.literal('complete'),
    connection_count: topologyCount,
    snapshot_time_ms: z.number().finite().nonnegative(),
    snapshot_scope: SnapshotScopeSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(ctx, 'delay_counts', 'bin_centers_ms', value.bin_centers_ms.length, value.delay_counts.length);
    equalLengthIssue(ctx, 'values', 'bin_centers_ms', value.bin_centers_ms.length, value.values.length);
    requireUniformHistogramBins(value.bin_centers_ms, value.bin_width_ms, ctx, 'bin_centers_ms', true);
    requirePopulationRateWindow(
      value.bin_centers_ms,
      value.bin_width_ms,
      value.window_start_ms,
      value.window_stop_ms,
      ctx,
    );
    const expectedUnits = delayDistributionValueUnits[value.normalization];
    if (value.value_units !== expectedUnits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value_units'],
        message: `value_units must be '${expectedUnits}' for ${value.normalization}`,
      });
    }
    let total = 0;
    for (const count of value.delay_counts) total += count;
    if (!Number.isSafeInteger(total) || total !== value.connection_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['connection_count'],
        message: 'connection_count must equal the sum of delay_counts',
      });
    }
    if (value.connection_count === 0 && value.normalization !== 'count') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['normalization'],
        message: 'an empty delay snapshot cannot be probability-normalized',
      });
    }
    const densityDenominator = value.connection_count * value.bin_width_ms;
    if (
      value.normalization === 'probability_density' &&
      (!Number.isFinite(densityDenominator) || densityDenominator <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bin_width_ms'],
        message: 'connection_count × bin_width_ms must be finite for probability density',
      });
    }
    let displayedMass = 0;
    for (let index = 0; index < Math.min(value.values.length, value.delay_counts.length); index++) {
      const count = value.delay_counts[index];
      const displayed = value.values[index];
      if (displayed < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values', index],
          message: 'displayed delay values cannot be negative',
        });
        break;
      }
      const expected = value.normalization === 'count'
        ? count
        : value.normalization === 'probability'
          ? count / value.connection_count
          : count / densityDenominator;
      const matches = value.normalization === 'count'
        ? Number.isSafeInteger(displayed) && displayed === expected
        : Object.is(displayed, expected);
      if (!matches) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values', index],
          message: 'displayed delay value must be recoverable from delay_counts',
        });
        break;
      }
      displayedMass += displayed;
    }
    if (value.normalization !== 'count') {
      const normalizedMass = value.normalization === 'probability_density'
        ? displayedMass * value.bin_width_ms
        : displayedMass;
      if (!approximatelyEqual(
        normalizedMass,
        1,
        HISTOGRAM_MASS_TOLERANCE,
        HISTOGRAM_MASS_TOLERANCE,
      )) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values'],
          message: value.normalization === 'probability_density'
            ? 'displayed delay density must integrate to one'
            : 'displayed delay probabilities must sum to one',
        });
      }
    }
  });
export type DelayDistributionParams = z.infer<typeof DelayDistributionParamsSchema>;

const SpatialMap2DNodeSchema = z
  .object({
    id: idArray.element,
    label: displayText(120),
    x: gpuNumber,
    y: gpuNumber,
  })
  .strict();

/** Spatial bounds use a dimensionless extent-relative tolerance plus a small,
 * explicitly bounded allowance for the two binary64 operations that derive an
 * axis bound from center ± extent/2. */
export const SPATIAL_BOUNDS_ROUNDOFF_ULPS = 2;

function spatialBoundsTolerance(
  center: number,
  halfExtent: number,
  minimum: number,
  maximum: number,
): number {
  const extentTolerance =
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE * Math.abs(halfExtent);
  const arithmeticTolerance = SPATIAL_BOUNDS_ROUNDOFF_ULPS * Number.EPSILON * Math.max(
    Math.abs(center),
    Math.abs(halfExtent),
    Math.abs(minimum),
    Math.abs(maximum),
  );
  const boundedArithmeticTolerance = arithmeticTolerance <=
    GEOMETRY_MAX_ROUNDOFF_FRACTION * Math.abs(halfExtent)
    ? arithmeticTolerance
    : 0;
  return extentTolerance + boundedArithmeticTolerance;
}

export const SpatialMap2DParamsSchema = z
  .object({
    nodes: z.array(SpatialMap2DNodeSchema).min(1).max(PARAM_LIMITS.maxSpatialObjects),
    coordinate_units: units,
    extent: z.tuple([gpuNumber.positive(), gpuNumber.positive()]),
    center: z.tuple([gpuNumber, gpuNumber]),
    edge_wrap: z.boolean(),
    position_scope: PositionScopeSchema,
    marker_size: z.literal('fixed_screen_space'),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set<number>();
    const halfWidth = value.extent[0] / 2;
    const halfHeight = value.extent[1] / 2;
    const minX = value.center[0] - halfWidth;
    const maxX = value.center[0] + halfWidth;
    const minY = value.center[1] - halfHeight;
    const maxY = value.center[1] + halfHeight;
    if (!(minX < maxX)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['extent', 0],
        message: 'x extent must remain representable at the declared center',
      });
    }
    if (!(minY < maxY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['extent', 1],
        message: 'y extent must remain representable at the declared center',
      });
    }
    // Bounds tolerance follows the physical extent, never the absolute spatial
    // origin. A separately bounded binary64 allowance covers the center ± half-
    // extent arithmetic without letting a large coordinate dwarf a tiny layer.
    const xTolerance = spatialBoundsTolerance(value.center[0], halfWidth, minX, maxX);
    const yTolerance = spatialBoundsTolerance(value.center[1], halfHeight, minY, maxY);
    for (let index = 0; index < value.nodes.length; index++) {
      const node = value.nodes[index];
      if (ids.has(node.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nodes', index, 'id'],
          message: 'spatial node ids must be unique',
        });
      }
      ids.add(node.id);
      if (
        node.x < minX - xTolerance || node.x > maxX + xTolerance ||
        node.y < minY - yTolerance || node.y > maxY + yTolerance
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nodes', index],
          message: 'spatial node coordinates must lie inside center ± extent/2',
        });
      }
    }
  });
export type SpatialMap2DParams = z.infer<typeof SpatialMap2DParamsSchema>;

const weightHistogramValueUnits = {
  count: 'count',
  probability: 'probability',
} as const;

export const WeightHistogramParamsSchema = z
  .object({
    bin_centers: gpuArray.min(1),
    values: gpuArray.min(1),
    bin_width: gpuNumber.positive(),
    weight_units: units,
    normalization: z.enum(['count', 'probability']),
    value_units: z.enum(['count', 'probability']),
    snapshot_time_ms: z.number().nonnegative(),
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'values',
      'bin_centers',
      value.bin_centers.length,
      value.values.length,
    );
    requireMonotonic(value.bin_centers, ctx, 'bin_centers');
    requireUniformHistogramBins(
      value.bin_centers,
      value.bin_width,
      ctx,
      'bin_centers',
    );
    if (value.value_units !== weightHistogramValueUnits[value.normalization]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value_units'],
        message: `value_units must be '${weightHistogramValueUnits[value.normalization]}' for ${value.normalization}`,
      });
    }
    for (let index = 0; index < value.values.length; index++) {
      const sample = value.values[index];
      if (sample < 0 ||
          (value.normalization === 'probability' && sample > 1) ||
          (value.normalization === 'count' && !Number.isSafeInteger(sample))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values', index],
          message: value.normalization === 'count'
            ? 'histogram counts must be non-negative safe integers'
            : value.normalization === 'probability'
              ? 'probability values must lie in [0, 1]'
              : 'histogram values cannot be negative',
        });
        break;
      }
    }
    requireNormalizedHistogramMass(
      value.normalization,
      value.values,
      value.bin_width,
      { probability: { measure: 'sum', target: 1 } },
      ctx,
    );
  });
export type WeightHistogramParams = z.infer<typeof WeightHistogramParamsSchema>;

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

// Corpus knowledge-graph. This is the bounded, evidence-carrying projection of
// Engram's CorpusEntityGraphResponse: papers, canonical models, and lineage
// families. It is intentionally NOT the much broader per-paper ontology. Every
// node/edge is traceable to at least one typed evidence record, every assertion
// has a stable id, and every score is explicitly uncalibrated and discriminated.
// The whole projection is derived/advisory; raw paper-local evidence belongs in
// a separate future skill rather than weakening this contract.
export const CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS = [
  'paper',
  'model',
  'family',
] as const;

export const CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS = [
  'cites',
  'same_as',
  'variant_of',
  'instantiates',
  'belongs_to_family',
] as const;

export const KNOWLEDGE_GRAPH_LIMITS = Object.freeze({
  maxAttributes: 24,
  maxAttributeArrayItems: 16,
  maxEvidenceRefsPerElement: 8,
  maxParallelEdgesPerPair: 9,
  maxDetailLength: 1_000,
  maxAttributeStringLength: 500,
  maxExcerptLength: 1_000,
});

const KnowledgeGraphAttributeScalarSchema = z.union([
  z
    .string()
    .max(KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength)
    .regex(
      SAFE_DISPLAY_STRING_PATTERN,
      'attribute strings must not contain control or bidi characters',
    ),
  z.number(),
  z.boolean(),
  z.null(),
]);

const KnowledgeGraphAttributeValueSchema = z.union([
  KnowledgeGraphAttributeScalarSchema,
  z
    .array(KnowledgeGraphAttributeScalarSchema)
    .max(KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems),
]);

const KnowledgeGraphAttributesSchema = z
  .record(normalizedRecordKey, KnowledgeGraphAttributeValueSchema)
  .superRefine((value, ctx) => {
    if (Object.keys(value).length > KNOWLEDGE_GRAPH_LIMITS.maxAttributes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `knowledge-graph attributes may contain at most ${KNOWLEDGE_GRAPH_LIMITS.maxAttributes} keys`,
      });
    }
  });

const KnowledgeGraphEvidenceRefSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('graph_snapshot_record'),
      evidence_id: displayText(384),
      record_id: displayText(320),
      locator: displayText(240).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('graph_node'),
      evidence_id: displayText(384),
      node_id: displayText(120),
      locator: displayText(240).optional(),
      excerpt: displayText(KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('citation'),
      evidence_id: displayText(384),
      paper_id: displayText(160),
      citation_id: displayText(160),
      page: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
      locator: displayText(240).optional(),
      excerpt: displayText(KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength).optional(),
      doi: displayText(240).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('external_source'),
      evidence_id: displayText(384),
      source_id: displayText(240),
      locator: displayText(240).optional(),
      excerpt: displayText(KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength).optional(),
    })
    .strict(),
]);

const KnowledgeGraphEvidenceRefsSchema = z
  .array(KnowledgeGraphEvidenceRefSchema)
  .min(1)
  .max(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement)
  .superRefine((evidence, ctx) => {
    if (!evidence.some((reference) => reference.kind !== 'graph_node')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'evidence must contain at least one direct source anchor (graph_snapshot_record, citation, or external_source); graph_node references are supplemental only',
      });
    }
  });

/** A bounded score is never a posterior probability. Its discriminator states
 * exactly which pipeline quantity the number represents. */
const KnowledgeGraphUncalibratedScoreSchema = z
  .object({
    kind: z.enum([
      'extraction_confidence',
      'citation_resolution_confidence',
      'structural_similarity',
      'behavioral_agreement',
      'retrieval_relevance',
    ]),
    value: z.number().min(0).max(1),
    calibrated_posterior: z.literal(false),
  })
  .strict();

/** Corpus entity nodes and relationships are assembled from multiple papers and
 * deterministic identity/citation resolvers. They cannot self-promote to
 * paper-local evidence, even when a referenced source record is paper-local. */
const DerivedAdvisoryEpistemicSchema = z
  .object({
    status: z.literal('derived_advisory'),
    advisory_only: z.literal(true),
    is_paper_local_evidence: z.literal(false),
    calibrated_posterior: z.literal(false),
  })
  .strict();

const KnowledgeGraphNodeSchema = z
  .object({
    id: displayText(120),
    kind: z.enum(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS),
    label: displayText(240),
    detail: displayText(KNOWLEDGE_GRAPH_LIMITS.maxDetailLength).optional(),
    attributes: KnowledgeGraphAttributesSchema,
    epistemic: DerivedAdvisoryEpistemicSchema,
    evidence: KnowledgeGraphEvidenceRefsSchema,
    uncalibrated_score: KnowledgeGraphUncalibratedScoreSchema.optional(),
  })
  .strict();

const KnowledgeGraphEdgeSchema = z
  .object({
    id: displayText(320),
    source: displayText(120),
    target: displayText(120),
    kind: z.enum(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS),
    label: displayText(160),
    attributes: KnowledgeGraphAttributesSchema,
    epistemic: DerivedAdvisoryEpistemicSchema,
    evidence: KnowledgeGraphEvidenceRefsSchema,
    uncalibrated_score: KnowledgeGraphUncalibratedScoreSchema.optional(),
  })
  .strict();

export const KnowledgeGraph3DParamsSchema = z
  .object({
    graph_id: displayText(160),
    graph_source: displayText(200),
    graph_snapshot_id: displayText(200),
    graph_scope: z.literal('corpus_entity'),
    generated_at: Rfc3339TimestampSchema,
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
    const edgeIds = new Set<string>();
    const parallelCounts = new Map<string, number>();
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
      if (edgeIds.has(edge.id)) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index, 'id'],
          message: `duplicate edge id '${edge.id}'`,
        });
      }
      edgeIds.add(edge.id);
      const pairSource = edge.source > edge.target ? edge.target : edge.source;
      const pairTarget = edge.source > edge.target ? edge.source : edge.target;
      const pairKey = JSON.stringify([pairSource, pairTarget]);
      const parallelCount = (parallelCounts.get(pairKey) ?? 0) + 1;
      parallelCounts.set(pairKey, parallelCount);
      if (parallelCount > KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index],
          message: `at most ${KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair} parallel edges may connect one unordered node pair`,
        });
      }
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
      const allowedScoreKinds: Record<typeof edge.kind, readonly string[]> = {
        cites: ['citation_resolution_confidence'],
        same_as: ['structural_similarity'],
        variant_of: ['structural_similarity'],
        instantiates: [],
        belongs_to_family: [],
      };
      if (
        edge.uncalibrated_score &&
        !allowedScoreKinds[edge.kind].includes(edge.uncalibrated_score.kind)
      ) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', index, 'uncalibrated_score', 'kind'],
          message: `${edge.kind} does not allow score kind '${edge.uncalibrated_score.kind}'`,
        });
      }
      const evidenceIds = new Set<string>();
      for (let evidenceIndex = 0; evidenceIndex < edge.evidence.length; evidenceIndex++) {
        const evidence = edge.evidence[evidenceIndex];
        if (evidenceIds.has(evidence.evidence_id)) {
          addIssue({
            code: z.ZodIssueCode.custom,
            path: ['edges', index, 'evidence', evidenceIndex, 'evidence_id'],
            message: `duplicate evidence id '${evidence.evidence_id}' on edge '${edge.id}'`,
          });
        }
        evidenceIds.add(evidence.evidence_id);
        if (evidence.kind === 'graph_node' && !ids.has(evidence.node_id)) {
          addIssue({
            code: z.ZodIssueCode.custom,
            path: ['edges', index, 'evidence', evidenceIndex, 'node_id'],
            message: `edge evidence node '${evidence.node_id}' does not reference a node`,
          });
        }
      }
    });
    value.nodes.forEach((node, nodeIndex) => {
      if (
        node.uncalibrated_score &&
        node.uncalibrated_score.kind !== 'extraction_confidence'
      ) {
        addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nodes', nodeIndex, 'uncalibrated_score', 'kind'],
          message: `knowledge-graph nodes only allow score kind 'extraction_confidence'; received '${node.uncalibrated_score.kind}'`,
        });
      }
      const evidenceIds = new Set<string>();
      for (let evidenceIndex = 0; evidenceIndex < node.evidence.length; evidenceIndex++) {
        const evidence = node.evidence[evidenceIndex];
        if (evidenceIds.has(evidence.evidence_id)) {
          addIssue({
            code: z.ZodIssueCode.custom,
            path: ['nodes', nodeIndex, 'evidence', evidenceIndex, 'evidence_id'],
            message: `duplicate evidence id '${evidence.evidence_id}' on node '${node.id}'`,
          });
        }
        evidenceIds.add(evidence.evidence_id);
        if (evidence.kind === 'graph_node' && !ids.has(evidence.node_id)) {
          addIssue({
            code: z.ZodIssueCode.custom,
            path: ['nodes', nodeIndex, 'evidence', evidenceIndex, 'node_id'],
            message: `node evidence node '${evidence.node_id}' does not reference a node`,
          });
        }
      }
    });
  });
export type KnowledgeGraph3DParams = z.infer<typeof KnowledgeGraph3DParamsSchema>;

// Additional analysis schemas. Host-rendered members still publish their full
// structure in the language-neutral manifest: `scene:null` never means an
// agent may send an unvalidated payload.
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

const CorrelogramPairSchema = z
  .object({
    reference_label: displayText(240),
    target_label: displayText(240),
  })
  .strict();

const CorrelogramStatisticSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('raw_pair_count'), units: z.literal('count') }).strict(),
  z.object({ kind: z.literal('weighted_pair_sum'), units }).strict(),
  z.object({
    kind: z.literal('pair_rate_hz'),
    units: z.literal('Hz'),
    exposure_s: z.number().positive().max(Number.MAX_VALUE),
  }).strict(),
  z.object({
    kind: z.literal('pearson_coefficient'),
    units: z.literal('1'),
    sample_count: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  }).strict(),
]);

function requireSymmetricLagAxis(
  lags: readonly number[],
  width: number,
  tauMax: number,
  ctx: z.RefinementCtx,
): void {
  requireUniformHistogramBins(lags, width, ctx, 'lags_ms');
  if (lags.length === 0 || !Number.isFinite(tauMax) || tauMax <= 0) return;
  if (lags.length % 2 === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lags_ms'],
      message: 'a symmetric correlogram axis must contain an odd number of lag centers',
    });
    return;
  }
  if (!approximatelyEqual(
    lags[0],
    -tauMax,
    HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
  )) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lags_ms', 0],
      message: 'the first lag center must equal -tau_max_ms',
    });
  }
  const lastIndex = lags.length - 1;
  if (!approximatelyEqual(
    lags[lastIndex],
    tauMax,
    HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
  )) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lags_ms', lastIndex],
      message: 'the final lag center must equal tau_max_ms',
    });
  }
  const middle = Math.floor(lags.length / 2);
  if (!approximatelyEqual(
    lags[middle],
    0,
    HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
  )) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lags_ms', middle],
      message: 'the middle lag center must be zero',
    });
  }
  for (let index = 0; index < middle; index++) {
    if (!approximatelyEqual(
      lags[index],
      -lags[lastIndex - index],
      HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
    )) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lags_ms', index],
        message: 'lag centers must be pairwise symmetric around zero',
      });
      break;
    }
  }
}

export const CorrelogramParamsSchema = z
  .object({
    lags_ms: timeArray.min(1),
    values: gpuArray.min(1),
    bin_width_ms: z.number().positive().max(Number.MAX_VALUE),
    tau_max_ms: z.number().positive().max(Number.MAX_VALUE),
    counting_start_ms: z.number(),
    counting_stop_ms: z.number(),
    pair: CorrelogramPairSchema,
    lag_convention: z.literal('positive_target_after_reference'),
    binning: z.literal('left_closed_right_open'),
    zero_lag_policy: z.enum(['included', 'excluded_self_pairs']),
    statistic: CorrelogramStatisticSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    equalLengthIssue(
      ctx,
      'values',
      'lags_ms',
      value.lags_ms.length,
      value.values.length,
    );
    requireSymmetricLagAxis(
      value.lags_ms,
      value.bin_width_ms,
      value.tau_max_ms,
      ctx,
    );
    if (!(value.counting_stop_ms > value.counting_start_ms)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['counting_stop_ms'],
        message: 'counting_stop_ms must be greater than counting_start_ms',
      });
    }
    for (let index = 0; index < value.values.length; index++) {
      const sample = value.values[index];
      const invalid = value.statistic.kind === 'pearson_coefficient'
        ? sample < -1 || sample > 1
        : value.statistic.kind === 'raw_pair_count'
          ? sample < 0 || !Number.isSafeInteger(sample)
          : value.statistic.kind === 'pair_rate_hz'
            ? sample < 0
            : false;
      if (invalid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values', index],
          message: value.statistic.kind === 'pearson_coefficient'
            ? 'Pearson coefficients must lie in [-1, 1]'
            : value.statistic.kind === 'raw_pair_count'
              ? 'raw pair counts must be non-negative safe integers'
              : 'pair rates cannot be negative',
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
