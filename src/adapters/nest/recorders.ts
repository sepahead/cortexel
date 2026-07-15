/**
 * NEST recorder adapter (plain-data path).
 *
 * This is the safe, bounded bridge from an already-exported NEST spike-recorder object
 * into a Cortexel request. It is deliberately narrow: it does not introspect a running
 * simulator, does not scan global NEST state, and does not copy an unbounded kernel-status
 * dictionary. It takes the small, explicit fields it needs and produces a request the
 * normal validation pipeline then checks — adapter output is never exempt from the gate.
 *
 * Two rules from the science it serves:
 *
 *   - Recorder events are NOT assumed chronological. The adapter preserves the events as
 *     given; the analysis layer does the scoped stable sort. Assuming order here would
 *     silently corrupt intervals downstream.
 *
 *   - The RECORDED sender universe is required and is the caller's to supply, because NEST
 *     knows which neurons were recorded and the event list does not. Inferring it from the
 *     events would drop the silent neurons and inflate every per-neuron rate.
 */

import { snapshotValue } from '../../core/safe-snapshot.js';
import { getBudgetLimits } from '../../core/limits.js';
import { makeError, type CortexelError } from '../../core/errors.js';

export interface NestSpikeExport {
  /** NEST spike-recorder `events`: parallel `senders` and `times` arrays. */
  readonly events: {
    readonly senders: readonly (number | string)[];
    readonly times: readonly number[];
  };
}

export interface NestSpikeOptions {
  /** The COMPLETE set of recorded sender ids, including any that never fired. Required. */
  readonly recordedSenderIds: readonly (number | string)[];
  readonly window: { readonly start: number; readonly stop: number; readonly unit: 's' | 'ms' | 'us' };
  readonly timeUnit?: 's' | 'ms' | 'us';
  /** The NEST version this export came from, recorded in the source declaration. */
  readonly nestVersion?: string;
  readonly runId?: string;
}

export type AdapterResult =
  | { readonly ok: true; readonly request: Record<string, unknown> }
  | { readonly ok: false; readonly errors: readonly CortexelError[] };

function fail(errors: CortexelError[]): AdapterResult {
  return { ok: false, errors };
}

/** Normalize a NEST sender id (number or string) to a canonical string. */
function senderString(id: number | string): string {
  return typeof id === 'number' ? String(id) : id;
}

/**
 * Convert a NEST spike-recorder export into a `neuro.spike_raster` request.
 *
 * The export is snapshotted first — the same accessor-free boundary the core uses — so a
 * hostile object with getters is rejected before any field is read, not read and then
 * regretted.
 */
export function nestSpikeRecorderToRaster(
  exported: unknown,
  options: NestSpikeOptions,
): AdapterResult {
  // Reject accessor-bearing input before touching a single property.
  const snapshot = snapshotValue(exported, getBudgetLimits('standard'));
  if (!snapshot.ok) {
    return fail([
      makeError({
        code: 'ADAPTER_ACCESSOR_INPUT_REJECTED',
        stage: 'adapter',
        message:
          'the NEST export could not be safely snapshotted (it may carry getters or a non-plain shape). Pass plain exported data.',
      }),
    ]);
  }

  const value = snapshot.value;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail([
      makeError({ code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE', stage: 'adapter', message: 'expected a NEST export object' }),
    ]);
  }

  const events = (value as Record<string, unknown>).events;
  if (typeof events !== 'object' || events === null || Array.isArray(events)) {
    return fail([
      makeError({
        code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        stage: 'adapter',
        instancePath: '/events',
        message: 'a NEST spike-recorder export must have an `events` object with `senders` and `times`.',
      }),
    ]);
  }

  const senders = (events as Record<string, unknown>).senders;
  const times = (events as Record<string, unknown>).times;
  if (!Array.isArray(senders) || !Array.isArray(times)) {
    return fail([
      makeError({
        code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        stage: 'adapter',
        instancePath: '/events',
        message: '`events.senders` and `events.times` must both be arrays.',
      }),
    ]);
  }

  if (senders.length !== times.length) {
    return fail([
      makeError({
        code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        stage: 'adapter',
        instancePath: '/events/times',
        message: `senders (${senders.length}) and times (${times.length}) must be equal length; Cortexel never pairs an event with a sender by best effort.`,
      }),
    ]);
  }

  if (options.recordedSenderIds.length === 0) {
    return fail([
      makeError({
        code: 'ADAPTER_MAPPING_REQUIRED',
        stage: 'adapter',
        message:
          'recordedSenderIds is required and must be non-empty. NEST knows which neurons were recorded; the event list does not. Supply the complete recorded universe so silent neurons are not dropped.',
      }),
    ]);
  }

  const timeUnit = options.timeUnit ?? options.window.unit;

  const request = {
    contract: { name: 'cortexel-figure-request', version: '1.0' },
    skill: { id: 'neuro.spike_raster' },
    data: {
      // Events preserved as given — NOT sorted here. The analysis layer sorts within scope.
      eventTimes: { kind: 'time', unit: timeUnit, values: times.map((t) => Number(t)) },
      eventSenderIds: senders.map(senderString),
      recordedSenderIds: options.recordedSenderIds.map(senderString),
      window: { start: options.window.start, stop: options.window.stop, unit: options.window.unit, boundary: '[start,stop)' },
      timeBase: 'absolute_clock',
      senderUniverseComplete: true,
      eventCompleteness: 'complete_for_recorded_senders',
    },
    parameters: {
      rowOrder: 'canonical_sender_id',
      markStyle: 'tick',
      outOfWindowPolicy: 'reject',
      aboveMarkBudget: 'density_grid',
    },
    source: {
      kind: 'simulation',
      system: 'NEST',
      ...(options.nestVersion ? { systemVersion: options.nestVersion } : {}),
      ...(options.runId ? { runId: options.runId } : {}),
    },
  };

  return { ok: true, request };
}
