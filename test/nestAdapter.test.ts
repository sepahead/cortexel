/**
 * The NEST recorder adapter must produce a request the real pipeline accepts and
 * refuse every source representation outside its revision-admitted, lossless subset.
 * Adapter output is never exempt from the validation gate.
 */

import { describe, expect, it } from 'vitest';

import {
  nestSpikeRecorderToRaster,
  type NestSpikeOptions,
} from '../src/adapters/nest/index.js';
import { canonicalDigest } from '../src/core/canonicalize.js';
import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/index.js';

const validExport = {
  record_to: 'memory' as const,
  time_in_steps: false as const,
  origin: 100.25,
  start: 0.5,
  stop: 10.75,
  n_events: 6,
  events: {
    // Intentionally nonchronological, duplicated, and fractional. The adapter
    // must preserve all three properties exactly.
    senders: [1, '2', 1, 3, 1, '2'],
    times: [105.33, 101.0, 101.0, 111.0, 103.83, 105.3],
  },
};

const options: NestSpikeOptions = {
  recordedSenderIds: [1, '2', 3, '9007199254740992'],
  nestVersion: '3.10.0',
  runId: 'run-a',
  recorderId: 'sr-1',
};

function errorCodes(result: ReturnType<typeof nestSpikeRecorderToRaster>): readonly string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}

function withRuntimeOptions(value: unknown) {
  return nestSpikeRecorderToRaster(validExport, value as NestSpikeOptions);
}

describe('NEST spike-recorder adapter', () => {
  it('produces a nonzero-origin request that passes the full validation pipeline', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const validated = validateRequestValue(result.request);
    if (!validated.ok) {
      throw new Error(
        `adapter output was rejected:\n${validated.errors.map((error) => `  ${error.code} ${error.instancePath}: ${error.message}`).join('\n')}`,
      );
    }
    expect(validated.request.skillId).toBe('neuro.spike_raster');
  });

  it('produces a request that renders end to end', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const figure = buildFigure(result.request);
    expect(figure.ok).toBe(true);
    if (figure.ok) expect(figure.svg).toContain('<svg');
  });

  it('preserves source order, duplicate observations, and fractional native-ms values', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.request.data as {
      eventTimes: { unit: string; values: number[] };
      eventSenderIds: string[];
      recordedSenderIds: string[];
    };
    expect(data.eventTimes).toEqual({
      unit: 'ms',
      kind: 'time',
      values: [105.33, 101.0, 101.0, 111.0, 103.83, 105.3],
    });
    expect(data.eventSenderIds).toEqual(['1', '2', '1', '3', '1', '2']);
    expect(data.recordedSenderIds).toEqual(['1', '2', '3', '9007199254740992']);
    expect(result.request.parameters).toMatchObject({
      outOfWindowPolicy: 'reject',
      aboveMarkBudget: 'refuse',
    });
  });

  it('preserves the NEST origin-relative open-start/closed-stop clock declaration', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect((result.request.data as { window: unknown }).window).toEqual({
      kind: 'nest_recording_device_origin_relative',
      origin: 100.25,
      start: 0.5,
      stop: 10.75,
      unit: 'ms',
      boundary: '(origin+start,origin+stop]',
      recordingBackend: 'memory',
      timeEncoding: 'native_binary64_ms',
    });
  });

  it('authors a complete empty recording only when n_events is authoritatively zero', () => {
    const result = nestSpikeRecorderToRaster(
      {
        ...validExport,
        n_events: 0,
        events: { senders: [], times: [] },
      },
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.data).toMatchObject({
      eventTimes: { values: [] },
      eventSenderIds: [],
      eventCompleteness: 'complete_for_recorded_senders',
    });
  });

  it('accepts an event exactly at origin + stop', () => {
    const result = nestSpikeRecorderToRaster(
      {
        ...validExport,
        n_events: 1,
        events: { senders: [1], times: [111.0] },
      },
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const validated = validateRequestValue(result.request);
    expect(validated.ok).toBe(true);
  });

  it('lets the strict gate reject an event exactly at the open origin + start boundary', () => {
    const result = nestSpikeRecorderToRaster(
      {
        ...validExport,
        n_events: 1,
        events: { senders: [1], times: [100.75] },
      },
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const validated = validateRequestValue(result.request);
    expect(validated.ok).toBe(false);
    if (validated.ok) return;
    expect(validated.errors.map((error) => error.code)).toContain('SCIENCE_EVENT_OUT_OF_WINDOW');
  });

  it('binds source metadata and a canonical digest of the detached export snapshot', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.request.source).toEqual({
      kind: 'simulation',
      system: 'NEST',
      systemVersion: '3.10.0',
      runId: 'run-a',
      recorderId: 'sr-1',
      sourceDigest: canonicalDigest(validExport),
    });
  });

  it('detaches both export and options from later caller mutation', () => {
    const mutableExport = {
      record_to: 'memory' as const,
      time_in_steps: false as const,
      origin: 0,
      start: 0,
      stop: 10,
      n_events: 2,
      events: { senders: [1, 2], times: [5.3, 5.33] },
    };
    const mutableOptions = {
      recordedSenderIds: [1, 2],
      nestVersion: '3.9.4',
    };
    const digestBeforeMutation = canonicalDigest(mutableExport);
    const result = nestSpikeRecorderToRaster(mutableExport, mutableOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    mutableExport.events.times[0] = 9;
    mutableExport.events.senders[0] = 2;
    mutableOptions.recordedSenderIds[0] = 2;

    const data = result.request.data as {
      eventTimes: { values: number[] };
      eventSenderIds: string[];
      recordedSenderIds: string[];
    };
    expect(data.eventTimes.values).toEqual([5.3, 5.33]);
    expect(data.eventSenderIds).toEqual(['1', '2']);
    expect(data.recordedSenderIds).toEqual(['1', '2']);
    expect((result.request.source as { sourceDigest: string }).sourceDigest).toBe(digestBeforeMutation);
  });

  it.each(['3.9', '3.9.0', '3.9.17', '3.10', '3.10.0', '3.10.23'])(
    'accepts revision-2-admitted NEST version declaration %s',
    (nestVersion) => {
      const result = nestSpikeRecorderToRaster(validExport, { ...options, nestVersion });
      expect(result.ok).toBe(true);
    },
  );

  it.each(['', '3.8.9', '3.11', '4.0', '3.10.0rc1', 'v3.10.0', '3.10.0.1'])(
    'rejects a NEST version declaration outside the revision-2 profile: %s',
    (nestVersion) => {
      const result = nestSpikeRecorderToRaster(validExport, { ...options, nestVersion });
      expect(result.ok).toBe(false);
      expect(errorCodes(result)).toContain('ADAPTER_UNSUPPORTED_VERSION');
    },
  );

  it('requires nestVersion instead of inventing source specificity', () => {
    const { nestVersion: _omitted, ...missingVersion } = options;
    const result = withRuntimeOptions(missingVersion);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_UNSUPPORTED_VERSION');
  });

  it('requires the recorded sender universe rather than inferring it', () => {
    const result = nestSpikeRecorderToRaster(validExport, { ...options, recordedSenderIds: [] });
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_MAPPING_REQUIRED');
  });

  it('rejects a duplicate recorded sender after decimal normalization', () => {
    const result = nestSpikeRecorderToRaster(validExport, {
      ...options,
      recordedSenderIds: [1, '1', 2, 3],
    });
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_MAPPING_REQUIRED');
  });

  it('rejects an event sender outside the complete recorded universe', () => {
    const result = nestSpikeRecorderToRaster(
      { ...validExport, n_events: 1, events: { senders: [9], times: [101] } },
      options,
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_MAPPING_REQUIRED');
  });

  it.each([
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    '0',
    '01',
    '+1',
    '1.0',
    '1e3',
    '-1',
    ' 1',
  ])('rejects non-canonical sender id %j', (sender) => {
    const result = nestSpikeRecorderToRaster(
      { ...validExport, n_events: 1, events: { senders: [sender], times: [101] } },
      { ...options, recordedSenderIds: [sender] },
    );
    expect(result.ok).toBe(false);
  });

  it('accepts a canonical decimal-string id beyond the safe integer range', () => {
    const sender = '900719925474099312345678901234567890';
    const result = nestSpikeRecorderToRaster(
      { ...validExport, n_events: 1, events: { senders: [sender], times: [101] } },
      { ...options, recordedSenderIds: [sender] },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.request.data as { eventSenderIds: string[] }).eventSenderIds).toEqual([sender]);
  });

  it('rejects mismatched senders/times length', () => {
    const bad = { ...validExport, n_events: 1, events: { senders: [1, 2], times: [101.0] } };
    const result = nestSpikeRecorderToRaster(bad, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_UNSUPPORTED_SHAPE');
    if (!result.ok) expect(result.errors[0]?.instancePath).toBe('/n_events');
  });

  it('requires the authoritative top-level NEST n_events status field', () => {
    const { n_events: _omitted, ...missingCount } = validExport;
    const result = nestSpikeRecorderToRaster(missingCount, options);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        instancePath: '/n_events',
      });
    }
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '6', null])(
    'rejects non-exact NEST n_events value %j',
    (n_events) => {
      const result = nestSpikeRecorderToRaster({ ...validExport, n_events }, options);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toMatchObject({
          code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE',
          instancePath: '/n_events',
        });
      }
    },
  );

  it.each([
    { n_events: 5, senders: [1, 2, 1, 3, 1, 2], times: [1, 2, 3, 4, 5, 6] },
    { n_events: 7, senders: [1, 2, 1, 3, 1, 2], times: [1, 2, 3, 4, 5, 6] },
    { n_events: 6, senders: [1, 2, 1, 3, 1], times: [1, 2, 3, 4, 5, 6] },
    { n_events: 6, senders: [1, 2, 1, 3, 1, 2], times: [1, 2, 3, 4, 5] },
  ])('reconciles n_events with both event arrays %#', ({ n_events, senders, times }) => {
    const result = nestSpikeRecorderToRaster(
      { ...validExport, n_events, events: { senders, times } },
      options,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_NEST_UNSUPPORTED_SHAPE',
        instancePath: '/n_events',
      });
    }
  });

  it('rejects a string time without numeric coercion', () => {
    const bad = { ...validExport, n_events: 1, events: { senders: [1], times: ['101'] } };
    const result = nestSpikeRecorderToRaster(bad, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_UNSUPPORTED_SHAPE');
  });

  it('rejects a non-finite time at the snapshot boundary', () => {
    const bad = { ...validExport, n_events: 1, events: { senders: [1], times: [Number.NaN] } };
    const result = nestSpikeRecorderToRaster(bad, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('SNAPSHOT_NON_FINITE_NUMBER');
  });

  it.each([
    { bounds: { origin: -1, start: 0, stop: 10 }, path: '/origin' },
    { bounds: { origin: '0', start: 0, stop: 10 }, path: '/origin' },
    { bounds: { origin: 0, start: -1, stop: 10 }, path: '/start' },
    { bounds: { origin: 0, start: '0', stop: 10 }, path: '/start' },
    { bounds: { origin: 0, start: 0, stop: -1 }, path: '/stop' },
    { bounds: { origin: 0, start: 0, stop: '10' }, path: '/stop' },
    { bounds: { origin: 0, start: 10, stop: 10 }, path: '/stop' },
    { bounds: { origin: 0, start: 11, stop: 10 }, path: '/stop' },
  ])('rejects invalid origin-relative device bounds at $path', ({ bounds, path }) => {
    const result = nestSpikeRecorderToRaster({ ...validExport, ...bounds }, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_UNSUPPORTED_SHAPE');
    if (!result.ok) expect(result.errors[0]?.instancePath).toBe(path);
  });

  it.each(['ascii', 'screen', 'mpi', 'sionlib'])(
    'rejects non-memory record_to %s',
    (record_to) => {
      const result = nestSpikeRecorderToRaster({ ...validExport, record_to }, options);
      expect(result.ok).toBe(false);
      expect(errorCodes(result)).toContain('ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED');
    },
  );

  it('rejects an absent record_to declaration', () => {
    const { record_to: _omitted, ...missingRecordTo } = validExport;
    const result = nestSpikeRecorderToRaster(missingRecordTo, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED');
  });

  it.each([true, 'false', 0])('rejects non-false time_in_steps %s', (time_in_steps) => {
    const result = nestSpikeRecorderToRaster({ ...validExport, time_in_steps }, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED');
  });

  it('rejects an absent time_in_steps declaration', () => {
    const { time_in_steps: _omitted, ...missingTimeMode } = validExport;
    const result = nestSpikeRecorderToRaster(missingTimeMode, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED');
  });

  it('rejects step/offset events instead of reconstructing milliseconds', () => {
    const result = nestSpikeRecorderToRaster(
      {
        ...validExport,
        time_in_steps: true,
        n_events: 1,
        events: { senders: [1], times: [1007], offsets: [0.03] },
      },
      options,
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED');
  });

  it('rejects offsets even when a contradictory status says native-ms mode', () => {
    const result = nestSpikeRecorderToRaster(
      {
        ...validExport,
        n_events: 1,
        events: { senders: [1], times: [101], offsets: [] },
      },
      options,
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED');
  });

  it('rejects accessor-bearing export and options without invoking either getter', () => {
    let exportGetterInvoked = false;
    let optionsGetterInvoked = false;
    const hostileExport = {
      get events() {
        exportGetterInvoked = true;
        return { senders: [1], times: [1] };
      },
    };
    const hostileOptions = {
      get recordedSenderIds() {
        optionsGetterInvoked = true;
        return [1];
      },
      nestVersion: '3.10.0',
    };

    const result = nestSpikeRecorderToRaster(hostileExport, hostileOptions as NestSpikeOptions);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_ACCESSOR_INPUT_REJECTED');
    if (!result.ok) expect(result.errors[0]?.instancePath).toBe('/events');
    expect(exportGetterInvoked).toBe(false);
    expect(optionsGetterInvoked).toBe(false);
  });

  it('rejects accessor-bearing options without invoking their getter', () => {
    let invoked = false;
    const hostileOptions = {
      get recordedSenderIds() {
        invoked = true;
        return [1, 2, 3];
      },
      nestVersion: '3.10.0',
    };
    const result = nestSpikeRecorderToRaster(validExport, hostileOptions as NestSpikeOptions);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_ACCESSOR_INPUT_REJECTED');
    if (!result.ok) expect(result.errors[0]?.instancePath).toBe('/recordedSenderIds');
    expect(invoked).toBe(false);
  });
});
