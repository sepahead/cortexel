import { z, type ZodType } from 'zod';
import { SAFE_DISPLAY_STRING_PATTERN, formatValidationIssues } from '../safeRuntime';
import {
  CorrelogramParamsSchema,
  GEOMETRY_MAX_ROUNDOFF_FRACTION,
  HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE,
  HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE,
  IsiDistributionParamsSchema,
  PARAM_LIMITS,
  PopulationRateParamsSchema,
  PsthParamsSchema,
  type CorrelogramParams,
  type IsiDistributionParams,
  type PopulationRateParams,
  type PsthParams,
} from '../skills/params';
import {
  CorrelationDetectorStatusSchema,
  NEST_INPUT_LIMITS,
  SpikeRecorderEventsSchema,
  type SpikeRecorderEvents,
} from './shapes';
import { parseNestInput, projectNestInputFields } from './safeInput';

export type NestAnalysisResult<T> =
  | { ok: true; params: T }
  | { ok: false; errors: string[] };

export const NEST_ANALYSIS_LIMITS = Object.freeze({
  maxPopulations: PARAM_LIMITS.maxSeries,
  maxSelectedSenders: 50_000,
  maxTrials: 10_000,
  maxTotalEvents: NEST_INPUT_LIMITS.maxSamples,
  maxOutputBins: PARAM_LIMITS.maxSamples,
  maxPopulationBinCells: 100_000,
});

const finite = z.number().finite();
const senderId = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
  .refine((value) => !Object.is(value, -0), 'sender ids must not be negative zero');
const displayText = (maximum: number) => z
  .string()
  .trim()
  .min(1)
  .max(maximum)
  .regex(SAFE_DISPLAY_STRING_PATTERN)
  .transform((value) => value.trim());

const PopulationRateOptionsSchema = z
  .object({
    startMs: finite,
    stopMs: finite,
    binWidthMs: finite.positive(),
    populations: z
      .array(z.object({
        id: displayText(120),
        label: displayText(240),
        senderIds: z
          .array(senderId)
          .min(1)
          .max(NEST_ANALYSIS_LIMITS.maxSelectedSenders),
      }).strict())
      .min(1)
      .max(NEST_ANALYSIS_LIMITS.maxPopulations),
    unassignedPolicy: z.enum(['reject', 'ignore']),
  })
  .strict();

const IsiOptionsSchema = z
  .object({
    senderIds: z
      .array(senderId)
      .min(1)
      .max(NEST_ANALYSIS_LIMITS.maxSelectedSenders),
    binWidthMs: finite.positive(),
    maxIntervalMs: finite.positive(),
    normalization: z.enum(['count', 'probability', 'probability_density']),
    intervalScope: z.literal('per_sender').default('per_sender'),
  })
  .strict();

const PsthOptionsSchema = z
  .object({
    alignmentTimesMs: z
      .array(finite)
      .min(1)
      .max(NEST_ANALYSIS_LIMITS.maxTrials),
    windowMs: z.tuple([finite, finite]),
    binWidthMs: finite.positive(),
    senderIds: z
      .array(senderId)
      .min(1)
      .max(NEST_ANALYSIS_LIMITS.maxSelectedSenders),
    normalization: z.enum(['count', 'count_per_trial', 'rate_hz']),
    alignmentEvent: displayText(240),
  })
  .strict();

const CorrelationDetectorOptionsSchema = z
  .object({
    measurement: z.enum(['count_histogram', 'histogram']),
    referenceLabel: displayText(240),
    targetLabel: displayText(240),
    zeroLagPolicy: z.enum(['included', 'excluded_self_pairs']),
    weightedUnits: displayText(80).optional(),
  })
  .strict();

export interface PopulationRatePopulation {
  id: string;
  label: string;
  senderIds: readonly number[];
}

export interface PopulationRateOptions {
  startMs: number;
  stopMs: number;
  binWidthMs: number;
  populations: readonly PopulationRatePopulation[];
  unassignedPolicy: 'reject' | 'ignore';
}

export interface IsiAnalysisOptions {
  senderIds: readonly number[];
  binWidthMs: number;
  maxIntervalMs: number;
  normalization: 'count' | 'probability' | 'probability_density';
  intervalScope?: 'per_sender';
}

export interface PsthAnalysisOptions {
  alignmentTimesMs: readonly number[];
  windowMs: readonly [number, number];
  binWidthMs: number;
  senderIds: readonly number[];
  normalization: 'count' | 'count_per_trial' | 'rate_hz';
  alignmentEvent: string;
}

export interface CorrelationDetectorOptions {
  measurement: 'count_histogram' | 'histogram';
  referenceLabel: string;
  targetLabel: string;
  zeroLagPolicy: 'included' | 'excluded_self_pairs';
  weightedUnits?: string;
}

function error(message: string): { ok: false; errors: string[] } {
  return { ok: false, errors: [message] };
}

function validateOutput<T>(schema: ZodType<T>, params: unknown): NestAnalysisResult<T> {
  const parsed = schema.safeParse(params);
  return parsed.success
    ? { ok: true, params: parsed.data }
    : { ok: false, errors: formatValidationIssues(parsed.error.issues) };
}

function requireUniqueIds(
  values: readonly number[],
  path: string,
): { ok: true; ids: Set<number> } | { ok: false; errors: string[] } {
  const ids = new Set<number>();
  for (let index = 0; index < values.length; index++) {
    if (ids.has(values[index])) {
      return error(`${path}.${index}: duplicate sender id ${values[index]}`);
    }
    ids.add(values[index]);
  }
  return { ok: true, ids };
}

function exactBinCount(
  start: number,
  stop: number,
  width: number,
  path: string,
): { ok: true; count: number } | { ok: false; errors: string[] } {
  if (!(stop > start)) return error(`${path}: stop must be greater than start`);
  const ratio = (stop - start) / width;
  const count = Math.round(ratio);
  const tolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE +
    HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE *
      Math.max(Math.abs(ratio), Math.abs(count));
  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    !Number.isFinite(ratio) ||
    Math.abs(ratio - count) > tolerance
  ) {
    return error(`${path}: window duration must be an exact positive integer multiple of bin width`);
  }
  if (count > NEST_ANALYSIS_LIMITS.maxOutputBins) {
    return error(`${path}: at most ${NEST_ANALYSIS_LIMITS.maxOutputBins} bins are allowed`);
  }
  return { ok: true, count };
}

function binCenters(start: number, width: number, count: number): number[] {
  const centers = new Array<number>(count);
  for (let index = 0; index < count; index++) {
    centers[index] = start + (index + 0.5) * width;
  }
  return centers;
}

const BIN_INDEX_OUTSIDE = -1;
const BIN_INDEX_INDETERMINATE = -2;
const BIN_BOUNDARY_ROUNDOFF_ULPS = 16;
const MAX_BIN_BOUNDARY_SNAP_DISTANCE = GEOMETRY_MAX_ROUNDOFF_FRACTION;

/**
 * Assign a binary64 sample to a half-open bin while repairing only arithmetic
 * roundoff at a boundary. This deliberately does not reuse the portable
 * histogram-geometry tolerance: that relative tolerance grows with the bin
 * index and would eventually move legitimate sub-boundary samples forward.
 *
 * `arithmeticScale` includes operands used before this helper (for example the
 * absolute event/alignment times in PSTH subtraction). If their roundoff is too
 * large to identify a boundary within a tiny fraction of one bin, assignment
 * fails closed instead of guessing.
 */
function binIndex(
  time: number,
  start: number,
  width: number,
  count: number,
  arithmeticScale = Math.max(Math.abs(time), Math.abs(start)),
): number {
  let scaled = (time - start) / width;
  if (!Number.isFinite(scaled)) return BIN_INDEX_INDETERMINATE;
  const nearest = Math.round(scaled);
  const operationScale = Math.max(
    1,
    Math.abs(time),
    Math.abs(start),
    Math.abs(width),
    Math.abs(arithmeticScale),
  );
  const tolerance = BIN_BOUNDARY_ROUNDOFF_ULPS * Number.EPSILON *
    (operationScale / Math.abs(width) + Math.max(1, Math.abs(scaled)));
  if (scaled < -tolerance || scaled > count + tolerance) {
    return BIN_INDEX_OUTSIDE;
  }
  if (Math.abs(scaled - nearest) <= tolerance) {
    if (tolerance > MAX_BIN_BOUNDARY_SNAP_DISTANCE) {
      return BIN_INDEX_INDETERMINATE;
    }
    scaled = nearest;
  }
  const index = Math.floor(scaled);
  return index >= 0 && index < count ? (index === 0 ? 0 : index) : BIN_INDEX_OUTSIDE;
}

function totalEventCount(
  trials: readonly SpikeRecorderEvents[],
): { ok: true } | { ok: false; errors: string[] } {
  let total = 0;
  for (let index = 0; index < trials.length; index++) {
    total += trials[index].times.length;
    if (!Number.isSafeInteger(total) || total > NEST_ANALYSIS_LIMITS.maxTotalEvents) {
      return error(
        `trials.${index}: aggregate event count exceeds ${NEST_ANALYSIS_LIMITS.maxTotalEvents}`,
      );
    }
  }
  return { ok: true };
}

/** Bin unordered NEST spike-recorder events into exact per-population rates. */
export function spikeRecorderToPopulationRateParams(
  events: unknown,
  options: PopulationRateOptions,
): NestAnalysisResult<PopulationRateParams>;
export function spikeRecorderToPopulationRateParams(
  events: unknown,
  options: unknown,
): NestAnalysisResult<PopulationRateParams>;
export function spikeRecorderToPopulationRateParams(
  events: unknown,
  options: unknown,
): NestAnalysisResult<PopulationRateParams> {
  try {
    const parsedEvents = parseNestInput(SpikeRecorderEventsSchema, events);
    if (!parsedEvents.ok) return parsedEvents;
    const parsedOptions = parseNestInput(PopulationRateOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    const geometry = exactBinCount(
      opts.startMs,
      opts.stopMs,
      opts.binWidthMs,
      'population-rate window',
    );
    if (!geometry.ok) return geometry;
    if (
      geometry.count * opts.populations.length >
      NEST_ANALYSIS_LIMITS.maxPopulationBinCells
    ) {
      return error(
        `population-rate output exceeds ${NEST_ANALYSIS_LIMITS.maxPopulationBinCells} population×bin cells`,
      );
    }

    const seriesIds = new Set<string>();
    const senderToSeries = new Map<number, number>();
    for (let populationIndex = 0; populationIndex < opts.populations.length; populationIndex++) {
      const population = opts.populations[populationIndex];
      if (seriesIds.has(population.id)) {
        return error(`populations.${populationIndex}.id: duplicate population id '${population.id}'`);
      }
      seriesIds.add(population.id);
      const unique = requireUniqueIds(
        population.senderIds,
        `populations.${populationIndex}.senderIds`,
      );
      if (!unique.ok) return unique;
      for (const sender of unique.ids) {
        const existing = senderToSeries.get(sender);
        if (existing !== undefined) {
          return error(
            `populations.${populationIndex}.senderIds: sender ${sender} overlaps population '${opts.populations[existing].id}'`,
          );
        }
        senderToSeries.set(sender, populationIndex);
      }
    }

    const spikeCounts = opts.populations.map(
      () => new Array<number>(geometry.count).fill(0),
    );
    for (let index = 0; index < parsedEvents.data.times.length; index++) {
      const time = parsedEvents.data.times[index];
      // Exact half-open analysis window. Events at stop are intentionally absent.
      if (time < opts.startMs || time >= opts.stopMs) continue;
      const populationIndex = senderToSeries.get(parsedEvents.data.senders[index]);
      if (populationIndex === undefined) {
        if (opts.unassignedPolicy === 'reject') {
          return error(
            `events.senders.${index}: sender ${parsedEvents.data.senders[index]} is unassigned inside the analysis window`,
          );
        }
        continue;
      }
      const targetBin = binIndex(time, opts.startMs, opts.binWidthMs, geometry.count);
      if (targetBin < 0) {
        return error(`events.times.${index}: event could not be assigned to the declared bin geometry`);
      }
      spikeCounts[populationIndex][targetBin] += 1;
    }

    const params: PopulationRateParams = {
      bin_centers_ms: binCenters(opts.startMs, opts.binWidthMs, geometry.count),
      bin_width_ms: opts.binWidthMs,
      window_start_ms: opts.startMs,
      window_stop_ms: opts.stopMs,
      series: opts.populations.map((population, populationIndex) => {
        const denominator = population.senderIds.length * opts.binWidthMs;
        const rates = spikeCounts[populationIndex].map((count) => {
          let rate = count * 1000;
          rate /= denominator;
          return rate;
        });
        return {
          id: population.id,
          label: population.label,
          recorded_sender_count: population.senderIds.length,
          spike_counts: spikeCounts[populationIndex],
          rates_hz: rates,
        };
      }),
      normalization: 'mean_per_recorded_sender_hz',
      aggregation: 'selected_senders',
      binning: 'left_closed_right_open',
    };
    return validateOutput(PopulationRateParamsSchema, params);
  } catch {
    return error('population-rate analysis could not safely process the input');
  }
}

/** Compute consecutive intervals independently within each selected sender. */
export function spikeRecorderToIsiParams(
  events: unknown,
  options: IsiAnalysisOptions,
): NestAnalysisResult<IsiDistributionParams>;
export function spikeRecorderToIsiParams(
  events: unknown,
  options: unknown,
): NestAnalysisResult<IsiDistributionParams>;
export function spikeRecorderToIsiParams(
  events: unknown,
  options: unknown,
): NestAnalysisResult<IsiDistributionParams> {
  try {
    const parsedEvents = parseNestInput(SpikeRecorderEventsSchema, events);
    if (!parsedEvents.ok) return parsedEvents;
    const parsedOptions = parseNestInput(IsiOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    const selected = requireUniqueIds(opts.senderIds, 'senderIds');
    if (!selected.ok) return selected;
    const geometry = exactBinCount(0, opts.maxIntervalMs, opts.binWidthMs, 'ISI range');
    if (!geometry.ok) return geometry;

    const bySender = new Map<number, number[]>();
    for (const sender of opts.senderIds) bySender.set(sender, []);
    for (let index = 0; index < parsedEvents.data.times.length; index++) {
      const bucket = bySender.get(parsedEvents.data.senders[index]);
      if (bucket) bucket.push(parsedEvents.data.times[index]);
    }

    const counts = new Array<number>(geometry.count).fill(0);
    let intervalCount = 0;
    for (const [sender, times] of bySender) {
      times.sort((left, right) => left - right);
      for (let index = 1; index < times.length; index++) {
        const previousTime = times[index - 1];
        const currentTime = times[index];
        const interval = currentTime - previousTime;
        if (!(interval >= 0 && interval < opts.maxIntervalMs)) {
          return error(
            `sender ${sender}: consecutive interval ${interval} ms lies outside [0, ${opts.maxIntervalMs})`,
          );
        }
        const targetBin = binIndex(
          interval,
          0,
          opts.binWidthMs,
          geometry.count,
          Math.max(Math.abs(previousTime), Math.abs(currentTime)),
        );
        if (targetBin === BIN_INDEX_INDETERMINATE) {
          return error(`sender ${sender}: interval arithmetic cannot resolve a bin boundary`);
        }
        if (targetBin === BIN_INDEX_OUTSIDE) {
          return error(`sender ${sender}: interval could not be assigned to the declared bins`);
        }
        counts[targetBin] += 1;
        intervalCount += 1;
      }
    }

    if (intervalCount === 0 && opts.normalization !== 'count') {
      return error('ISI probability normalization requires at least one consecutive interval');
    }
    const values = counts.map((count) => {
      switch (opts.normalization) {
        case 'count':
          return count;
        case 'probability':
          return count / intervalCount;
        case 'probability_density':
          return count / intervalCount / opts.binWidthMs;
      }
    });
    const valueUnits = opts.normalization === 'count'
      ? 'count'
      : opts.normalization === 'probability'
        ? 'probability'
        : '1/ms';
    return validateOutput(IsiDistributionParamsSchema, {
      bin_centers_ms: binCenters(0, opts.binWidthMs, geometry.count),
      values,
      bin_width_ms: opts.binWidthMs,
      normalization: opts.normalization,
      value_units: valueUnits,
      interval_scope: 'per_sender',
    });
  } catch {
    return error('ISI analysis could not safely process the input');
  }
}

/** Aggregate explicitly separate trials around their declared alignment times. */
export function spikeTrialsToPsthParams(
  trials: unknown,
  options: PsthAnalysisOptions,
): NestAnalysisResult<PsthParams>;
export function spikeTrialsToPsthParams(
  trials: unknown,
  options: unknown,
): NestAnalysisResult<PsthParams>;
export function spikeTrialsToPsthParams(
  trials: unknown,
  options: unknown,
): NestAnalysisResult<PsthParams> {
  try {
    const TrialArraySchema = z
      .array(SpikeRecorderEventsSchema)
      .min(1)
      .max(NEST_ANALYSIS_LIMITS.maxTrials);
    const parsedTrials = parseNestInput(TrialArraySchema, trials);
    if (!parsedTrials.ok) return parsedTrials;
    const total = totalEventCount(parsedTrials.data);
    if (!total.ok) return total;
    const parsedOptions = parseNestInput(PsthOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    if (opts.alignmentTimesMs.length !== parsedTrials.data.length) {
      return error(
        `alignmentTimesMs length (${opts.alignmentTimesMs.length}) must match trial count (${parsedTrials.data.length})`,
      );
    }
    const selected = requireUniqueIds(opts.senderIds, 'senderIds');
    if (!selected.ok) return selected;
    const geometry = exactBinCount(
      opts.windowMs[0],
      opts.windowMs[1],
      opts.binWidthMs,
      'PSTH window',
    );
    if (!geometry.ok) return geometry;

    const counts = new Array<number>(geometry.count).fill(0);
    for (let trialIndex = 0; trialIndex < parsedTrials.data.length; trialIndex++) {
      const trial = parsedTrials.data[trialIndex];
      const alignment = opts.alignmentTimesMs[trialIndex];
      for (let eventIndex = 0; eventIndex < trial.times.length; eventIndex++) {
        if (!selected.ids.has(trial.senders[eventIndex])) continue;
        const relativeTime = trial.times[eventIndex] - alignment;
        if (!Number.isFinite(relativeTime)) {
          return error(`trials.${trialIndex}.times.${eventIndex}: aligned time is not finite`);
        }
        const targetBin = binIndex(
          relativeTime,
          opts.windowMs[0],
          opts.binWidthMs,
          geometry.count,
          Math.max(Math.abs(trial.times[eventIndex]), Math.abs(alignment)),
        );
        if (targetBin === BIN_INDEX_INDETERMINATE) {
          return error(
            `trials.${trialIndex}.times.${eventIndex}: aligned-time arithmetic cannot resolve a bin boundary`,
          );
        }
        if (targetBin === BIN_INDEX_OUTSIDE) continue;
        counts[targetBin] += 1;
      }
    }

    const trialCount = parsedTrials.data.length;
    const values = counts.map((count) => {
      switch (opts.normalization) {
        case 'count':
          return count;
        case 'count_per_trial':
          return count / trialCount;
        case 'rate_hz': {
          let rate = count * 1000;
          rate /= trialCount * opts.binWidthMs;
          return rate;
        }
      }
    });
    const valueUnits = opts.normalization === 'count'
      ? 'count'
      : opts.normalization === 'count_per_trial'
        ? 'count/trial'
        : 'Hz';
    return validateOutput(PsthParamsSchema, {
      bin_centers_ms: binCenters(opts.windowMs[0], opts.binWidthMs, geometry.count),
      values,
      bin_width_ms: opts.binWidthMs,
      normalization: opts.normalization,
      value_units: valueUnits,
      trial_count: trialCount,
      alignment_event: opts.alignmentEvent,
      aggregation: 'selected_senders_per_trial',
    });
  } catch {
    return error('PSTH analysis could not safely process the input');
  }
}

/** Project the documented NEST correlation_detector status histogram. */
export function correlationDetectorToCorrelogramParams(
  status: unknown,
  options: CorrelationDetectorOptions,
): NestAnalysisResult<CorrelogramParams>;
export function correlationDetectorToCorrelogramParams(
  status: unknown,
  options: unknown,
): NestAnalysisResult<CorrelogramParams>;
export function correlationDetectorToCorrelogramParams(
  status: unknown,
  options: unknown,
): NestAnalysisResult<CorrelogramParams> {
  try {
    const projectedStatus = projectNestInputFields(status, [
      'delta_tau',
      'tau_max',
      'Tstart',
      'Tstop',
      'count_histogram',
      'histogram',
    ]);
    if (!projectedStatus.ok) return projectedStatus;
    const parsedStatus = parseNestInput(
      CorrelationDetectorStatusSchema,
      projectedStatus.data,
    );
    if (!parsedStatus.ok) return parsedStatus;
    const parsedOptions = parseNestInput(CorrelationDetectorOptionsSchema, options);
    if (!parsedOptions.ok) return parsedOptions;
    const opts = parsedOptions.data;
    if (opts.measurement === 'histogram' && opts.weightedUnits === undefined) {
      return error('weightedUnits is required when measurement is histogram');
    }
    if (opts.measurement === 'count_histogram' && opts.weightedUnits !== undefined) {
      return error('weightedUnits is only valid when measurement is histogram');
    }
    const values = parsedStatus.data[opts.measurement];
    if (!values) return error(`${opts.measurement} is absent from the detector status`);

    const halfBinRatio = parsedStatus.data.tau_max / parsedStatus.data.delta_tau;
    const halfBinCount = Math.round(halfBinRatio);
    const halfBinTolerance = HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE +
      HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE *
        Math.max(Math.abs(halfBinRatio), Math.abs(halfBinCount));
    if (
      !Number.isSafeInteger(halfBinCount) ||
      halfBinCount < 1 ||
      Math.abs(halfBinRatio - halfBinCount) > halfBinTolerance
    ) {
      return error('tau_max must be an exact positive integer multiple of delta_tau');
    }
    const expectedLength = halfBinCount * 2 + 1;
    if (expectedLength > NEST_ANALYSIS_LIMITS.maxOutputBins) {
      return error(`correlation detector output exceeds ${NEST_ANALYSIS_LIMITS.maxOutputBins} bins`);
    }
    if (values.length !== expectedLength) {
      return error(
        `${opts.measurement} length (${values.length}) must equal 2*tau_max/delta_tau+1 (${expectedLength})`,
      );
    }

    const lags = new Array<number>(expectedLength);
    for (let index = 0; index < expectedLength; index++) {
      const centeredIndex = index - halfBinCount;
      lags[index] = centeredIndex === 0
        ? 0
        : centeredIndex === -halfBinCount
          ? -parsedStatus.data.tau_max
          : centeredIndex === halfBinCount
            ? parsedStatus.data.tau_max
            : centeredIndex * parsedStatus.data.delta_tau;
    }
    const statistic: CorrelogramParams['statistic'] =
      opts.measurement === 'count_histogram'
        ? { kind: 'raw_pair_count', units: 'count' }
        : { kind: 'weighted_pair_sum', units: opts.weightedUnits! };
    return validateOutput(CorrelogramParamsSchema, {
      lags_ms: lags,
      values: [...values],
      bin_width_ms: parsedStatus.data.delta_tau,
      tau_max_ms: parsedStatus.data.tau_max,
      counting_start_ms: parsedStatus.data.Tstart,
      counting_stop_ms: parsedStatus.data.Tstop,
      pair: {
        reference_label: opts.referenceLabel,
        target_label: opts.targetLabel,
      },
      lag_convention: 'positive_target_after_reference',
      binning: 'left_closed_right_open',
      zero_lag_policy: opts.zeroLagPolicy,
      statistic,
    });
  } catch {
    return error('correlation-detector analysis could not safely process the input');
  }
}
