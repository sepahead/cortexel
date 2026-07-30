/**
 * The NEST recorder adapter must produce a request the real pipeline accepts and
 * refuse every source representation outside its revision-admitted, lossless subset.
 * Adapter output is never exempt from the validation gate.
 */

import { describe, expect, it } from 'vitest';

import {
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN,
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3,
  NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5,
  nestSpikeRecorderToRaster,
  type NestSpikeCaptureAuthorityInputV3,
  type NestSpikeCaptureAuthorityInputV4,
  type NestSpikeOptionsV5Finite,
  type NestSpikeOptionsV5PositiveInfinity,
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

function ticsForMilliseconds(value: number): string {
  const tics = value * 1000;
  if (!Number.isSafeInteger(tics) || tics < 0) {
    throw new Error(`test fixture ${value} ms has no exact 1000-tics/ms preimage`);
  }
  return String(tics);
}

function captureAuthorityFor(
  origin: number,
  start: number,
  stop: number,
  localNumThreads = 1,
): NestSpikeCaptureAuthorityInputV3 {
  return {
    kind: 'caller_declaration',
    profile: 'cortexel-nest-memory-spike-capture-authority.v3',
    runtimeStatus: {
      nestVersion: '3.10.0',
      timeBuildProfile: 'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1',
      statusReadMethod: 'pynest_single_spike_recorder_get_status_plain_projection_v1',
      executionScope: {
        kind: 'single_process',
        numProcesses: 1,
        rank: 0,
        localNumThreads,
      },
      resolutionMs: 0.125,
      ticsPerMs: '1000',
      resolutionTics: '125',
      captureBiologicalTimeTics: ticsForMilliseconds(origin + stop),
      captureBoundary: 'after_successful_simulate_or_run_return',
    },
    recordingGrid: {
      originTics: ticsForMilliseconds(origin),
      startTics: ticsForMilliseconds(start),
      stopTics: ticsForMilliseconds(stop),
    },
    bufferEpoch: {
      beganBy: 'recorder_creation',
      beganAtBiologicalTimeTics: ticsForMilliseconds(origin),
    },
    recordingPlan: {
      lastMutationAtBiologicalTimeTics: ticsForMilliseconds(origin + start),
      scope: 'window_backend_time_encoding_and_sender_wiring',
      senderUniverseBinding:
        'recorded_sender_ids_exactly_equal_full_window_connected_source_universe',
    },
    clockEpochContinuity: 'biological_time_monotonic_since_last_kernel_initialization',
    eventCompleteness: 'complete_for_recorded_senders',
  };
}

function captureAuthorityForPositiveInfinity(
  origin: number,
  start: number,
  captureTime: number,
  localNumThreads = 1,
): NestSpikeCaptureAuthorityInputV4 {
  return {
    kind: 'caller_declaration',
    profile: 'cortexel-nest-memory-spike-capture-authority.v4',
    runtimeStatus: {
      nestVersion: '3.10.0',
      timeBuildProfile: 'nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1',
      statusReadMethod: 'pynest_single_spike_recorder_get_status_plain_projection_v2',
      executionScope: {
        kind: 'single_process',
        numProcesses: 1,
        rank: 0,
        localNumThreads,
      },
      resolutionMs: 0.125,
      ticsPerMs: '1000',
      resolutionTics: '125',
      captureBiologicalTimeTics: ticsForMilliseconds(captureTime),
      captureBoundary:
        'after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation',
    },
    recordingGrid: {
      originTics: ticsForMilliseconds(origin),
      startTics: ticsForMilliseconds(start),
    },
    bufferEpoch: {
      beganBy: 'recorder_creation',
      beganAtBiologicalTimeTics: ticsForMilliseconds(origin),
    },
    recordingPlan: {
      lastMutationAtBiologicalTimeTics: ticsForMilliseconds(origin + start),
      scope: 'window_backend_time_encoding_and_sender_wiring',
      senderUniverseBinding:
        'recorded_sender_ids_exactly_equal_full_window_connected_source_universe',
    },
    clockEpochContinuity: 'biological_time_monotonic_since_last_kernel_initialization',
    eventCompleteness: 'complete_for_recorded_senders',
  };
}

const options: NestSpikeOptionsV5Finite = {
  recordedSenderIds: [1, '2', 3, '9007199254740992'],
  nestVersion: '3.10.0',
  captureAuthority: captureAuthorityFor(validExport.origin, validExport.start, validExport.stop),
  runId: 'run-a',
  recorderId: 'sr-1',
};

const positiveInfinityExport = {
  ...validExport,
  stop: { kind: 'nest_time_positive_infinity' as const },
};

const positiveInfinityOptions: NestSpikeOptionsV5PositiveInfinity = {
  recordedSenderIds: options.recordedSenderIds,
  nestVersion: options.nestVersion,
  captureAuthority: captureAuthorityForPositiveInfinity(validExport.origin, validExport.start, 111),
  runId: options.runId,
  recorderId: options.recorderId,
};

function errorCodes(result: ReturnType<typeof nestSpikeRecorderToRaster>): readonly string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}

function withRuntimeOptions(value: unknown) {
  return nestSpikeRecorderToRaster(
    validExport,
    value as NestSpikeOptionsV5Finite,
  );
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

    const expectedInputDigest = canonicalDigest({
      domain: NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN,
      exportedStatus: validExport,
      options: {
        recordedSenderIds: ['1', '2', '3', '9007199254740992'],
        nestVersion: '3.10.0',
        captureAuthority: options.captureAuthority,
        runId: 'run-a',
        recorderId: 'sr-1',
      },
    });
    expect((result.request.data as { window: unknown }).window).toEqual({
      kind: 'nest_recording_device_origin_relative',
      origin: 100.25,
      start: 0.5,
      stop: 10.75,
      unit: 'ms',
      boundary: '(origin+start,origin+stop]',
      recordingBackend: 'memory',
      timeEncoding: 'native_binary64_ms',
      captureAuthority: {
        ...options.captureAuthority,
        adapterInputDigest: expectedInputDigest,
      },
    });
  });

  it('uses the source-faithful revision-5 digest domain while retaining the historical v3 constant', () => {
    expect(NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN).toBe(
      'cortexel.nest-spike-recorder-adapter-input.v5',
    );
    expect(NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5).toBe(
      NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN,
    );
    expect(NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V3).toBe(
      'cortexel.nest-spike-recorder-adapter-input.v3',
    );
  });

  it('authors the revision-5 positive-infinity capture-bounded window with a source-projected captureTime', () => {
    const result = nestSpikeRecorderToRaster(positiveInfinityExport, positiveInfinityOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const expectedInputDigest = canonicalDigest({
      domain: NEST_SPIKE_ADAPTER_INPUT_DIGEST_DOMAIN_V5,
      exportedStatus: positiveInfinityExport,
      options: {
        recordedSenderIds: ['1', '2', '3', '9007199254740992'],
        nestVersion: '3.10.0',
        captureAuthority: positiveInfinityOptions.captureAuthority,
        runId: 'run-a',
        recorderId: 'sr-1',
      },
    });
    expect((result.request.data as { window: unknown }).window).toEqual({
      kind: 'nest_recording_device_positive_infinity_capture_bounded',
      origin: 100.25,
      start: 0.5,
      captureTime: 111,
      unit: 'ms',
      boundary: '(origin+start,capture]',
      recordingBackend: 'memory',
      timeEncoding: 'native_binary64_ms',
      configuredStop: {
        kind: 'nest_time_positive_infinity',
        exportedMs: Number.MAX_VALUE,
      },
      captureAuthority: {
        ...positiveInfinityOptions.captureAuthority,
        adapterInputDigest: expectedInputDigest,
      },
    });
    expect(
      (
        result.request.data as {
          window: { captureAuthority: { recordingGrid: object } };
        }
      ).window.captureAuthority.recordingGrid,
    ).not.toHaveProperty('stopTics');
  });

  it('produces a positive-infinity request accepted by the full gate and renderer', () => {
    const result = nestSpikeRecorderToRaster(positiveInfinityExport, positiveInfinityOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const validated = validateRequestValue(result.request);
    expect(validated.ok).toBe(true);
    const figure = buildFigure(result.request);
    expect(figure.ok).toBe(true);
  });

  it.each([
    { time: 100.75, label: 'open origin plus start endpoint' },
    { time: 111.125, label: 'time beyond the finite capture endpoint' },
  ])('lets the strict gate reject a positive-infinity event at the $label', ({ time }) => {
    const result = nestSpikeRecorderToRaster(
      {
        ...positiveInfinityExport,
        n_events: 1,
        events: { senders: [1], times: [time] },
      },
      positiveInfinityOptions,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const validated = validateRequestValue(result.request);
    expect(validated.ok).toBe(false);
    if (!validated.ok) {
      expect(validated.errors.map((error) => error.code)).toContain(
        'SCIENCE_EVENT_OUT_OF_WINDOW',
      );
    }
  });

  it('binds positive-infinity authority changes into the revision-5 adapter-input digest', () => {
    const first = nestSpikeRecorderToRaster(positiveInfinityExport, positiveInfinityOptions);
    const second = nestSpikeRecorderToRaster(positiveInfinityExport, {
      ...positiveInfinityOptions,
      captureAuthority: captureAuthorityForPositiveInfinity(
        positiveInfinityExport.origin,
        positiveInfinityExport.start,
        111,
        2,
      ),
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    const digestOf = (result: typeof first): string =>
      (
        result.request.data as {
          window: { captureAuthority: { adapterInputDigest: string } };
        }
      ).window.captureAuthority.adapterInputDigest;
    expect(digestOf(first)).not.toBe(digestOf(second));
  });

  it('rejects raw DBL_MAX rather than treating NEST positive infinity as an ordinary finite stop', () => {
    const result = nestSpikeRecorderToRaster({ ...validExport, stop: Number.MAX_VALUE }, options);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        instancePath: '/stop',
      });
    }
  });

  it.each([
    { stop: { kind: 'positive_infinity' }, path: '/stop/kind' },
    {
      stop: {
        kind: 'nest_time_positive_infinity',
        sourceValue: Number.MAX_VALUE,
      },
      path: '/stop/sourceValue',
    },
  ])('rejects a malformed positive-infinity projection token at $path', ({ stop, path }) => {
    const result = nestSpikeRecorderToRaster(
      { ...positiveInfinityExport, stop },
      positiveInfinityOptions,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.instancePath).toBe(path);
  });

  it('rejects cross-use of finite V3 and positive-infinity V4 authority in revision 5', () => {
    const v3WithInfinity = nestSpikeRecorderToRaster(positiveInfinityExport, options);
    expect(v3WithInfinity.ok).toBe(false);
    if (!v3WithInfinity.ok) {
      expect(v3WithInfinity.errors[0]?.instancePath).toBe('/captureAuthority/profile');
    }

    const v4WithFinite = nestSpikeRecorderToRaster(validExport, positiveInfinityOptions);
    expect(v4WithFinite.ok).toBe(false);
    if (!v4WithFinite.ok) {
      expect(v4WithFinite.errors[0]?.instancePath).toBe('/captureAuthority/profile');
    }
  });

  it('rejects the finite-branch successful-return boundary on positive-infinity V4 authority', () => {
    const captureAuthority = structuredClone(
      positiveInfinityOptions.captureAuthority,
    ) as unknown as {
      runtimeStatus: { captureBoundary: string };
    };
    captureAuthority.runtimeStatus.captureBoundary =
      'after_successful_simulate_or_run_return';
    const result = nestSpikeRecorderToRaster(positiveInfinityExport, {
      ...positiveInfinityOptions,
      captureAuthority: captureAuthority as unknown as NestSpikeCaptureAuthorityInputV4,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.instancePath).toBe(
        '/captureAuthority/runtimeStatus/captureBoundary',
      );
    }
  });

  it('rejects fabricated stopTics on positive-infinity authority', () => {
    const captureAuthority = structuredClone(
      positiveInfinityOptions.captureAuthority,
    ) as unknown as {
      recordingGrid: Record<string, string>;
    };
    captureAuthority.recordingGrid.stopTics = '999999999';
    const result = nestSpikeRecorderToRaster(positiveInfinityExport, {
      ...positiveInfinityOptions,
      captureAuthority: captureAuthority as unknown as NestSpikeCaptureAuthorityInputV4,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.instancePath).toBe('/captureAuthority/recordingGrid/stopTics');
    }
  });

  it('requires a positive-infinity capture strictly after origin plus start', () => {
    const result = nestSpikeRecorderToRaster(positiveInfinityExport, {
      ...positiveInfinityOptions,
      captureAuthority: captureAuthorityForPositiveInfinity(
        positiveInfinityExport.origin,
        positiveInfinityExport.start,
        positiveInfinityExport.origin + positiveInfinityExport.start,
      ),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_MAPPING_REQUIRED',
        instancePath: '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
      });
    }
  });

  it('requires the positive-infinity capture endpoint on the runtime grid', () => {
    const captureAuthority = structuredClone(
      positiveInfinityOptions.captureAuthority,
    ) as unknown as {
      runtimeStatus: { captureBiologicalTimeTics: string };
    };
    captureAuthority.runtimeStatus.captureBiologicalTimeTics = '111001';
    const result = nestSpikeRecorderToRaster(positiveInfinityExport, {
      ...positiveInfinityOptions,
      captureAuthority: captureAuthority as unknown as NestSpikeCaptureAuthorityInputV4,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        instancePath: '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
      });
    }
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
      nestVersion: '3.10.0' as const,
      captureAuthority: captureAuthorityFor(0, 0, 10),
    };
    const digestBeforeMutation = canonicalDigest(mutableExport);
    const result = nestSpikeRecorderToRaster(mutableExport, mutableOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    mutableExport.events.times[0] = 9;
    mutableExport.events.senders[0] = 2;
    mutableOptions.recordedSenderIds[0] = 2;
    (
      mutableOptions.captureAuthority.runtimeStatus as {
        captureBiologicalTimeTics: string;
      }
    ).captureBiologicalTimeTics = '99000';

    const data = result.request.data as {
      eventTimes: { values: number[] };
      eventSenderIds: string[];
      recordedSenderIds: string[];
    };
    expect(data.eventTimes.values).toEqual([5.3, 5.33]);
    expect(data.eventSenderIds).toEqual(['1', '2']);
    expect(data.recordedSenderIds).toEqual(['1', '2']);
    expect((result.request.source as { sourceDigest: string }).sourceDigest).toBe(
      digestBeforeMutation,
    );
    expect(
      (
        result.request.data as {
          window: {
            captureAuthority: {
              runtimeStatus: { captureBiologicalTimeTics: string };
            };
          };
        }
      ).window.captureAuthority.runtimeStatus.captureBiologicalTimeTics,
    ).toBe('10000');
  });

  it('accepts only the exact pinned NEST 3.10.0 declaration', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    expect(result.ok).toBe(true);
  });

  it.each([
    '',
    '3.8.9',
    '3.9',
    '3.9.0',
    '3.9.17',
    '3.10',
    '3.10.23',
    '3.11',
    '4.0',
    '3.10.0rc1',
    'v3.10.0',
    '3.10.0.1',
  ])('rejects a NEST version declaration outside the revision-5 profile: %s', (nestVersion) => {
    const result = withRuntimeOptions({ ...options, nestVersion });
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_UNSUPPORTED_VERSION');
  });

  it('requires nestVersion instead of inventing source specificity', () => {
    const { nestVersion: _omitted, ...missingVersion } = options;
    const result = withRuntimeOptions(missingVersion);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_UNSUPPORTED_VERSION');
  });

  it('requires capture history rather than inferring completeness from final n_events', () => {
    const { captureAuthority: _omitted, ...missingAuthority } = options;
    const result = withRuntimeOptions(missingAuthority);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_MAPPING_REQUIRED',
        instancePath: '/captureAuthority',
      });
    }
  });

  it('requires the explicit unauthenticated clock-epoch continuity declaration', () => {
    const captureAuthority = structuredClone(options.captureAuthority) as unknown as Record<
      string,
      unknown
    >;
    delete captureAuthority.clockEpochContinuity;
    const result = withRuntimeOptions({ ...options, captureAuthority });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_MAPPING_REQUIRED',
        instancePath: '/captureAuthority/clockEpochContinuity',
      });
    }
  });

  it('accepts capture exactly at the closed stop after successful return and local thread-sibling merge authority', () => {
    const captureAuthority = captureAuthorityFor(
      validExport.origin,
      validExport.start,
      validExport.stop,
      8,
    );
    const result = withRuntimeOptions({ ...options, captureAuthority });
    expect(result.ok).toBe(true);
  });

  it('rejects capture one resolution step before the recorder stop', () => {
    const captureAuthority = structuredClone(options.captureAuthority);
    (
      captureAuthority.runtimeStatus as {
        captureBiologicalTimeTics: string;
      }
    ).captureBiologicalTimeTics = '110875';
    const result = withRuntimeOptions({ ...options, captureAuthority });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_MAPPING_REQUIRED',
        instancePath: '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
      });
    }
  });

  it('rejects a memory-buffer clear after the recording window opened', () => {
    const captureAuthority = structuredClone(options.captureAuthority);
    (
      captureAuthority.bufferEpoch as {
        beganBy: 'n_events_zero';
        beganAtBiologicalTimeTics: string;
      }
    ).beganBy = 'n_events_zero';
    (
      captureAuthority.bufferEpoch as {
        beganAtBiologicalTimeTics: string;
      }
    ).beganAtBiologicalTimeTics = '100875';
    const result = withRuntimeOptions({ ...options, captureAuthority });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.instancePath).toBe(
        '/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics',
      );
    }
  });

  it('rejects recorder configuration or sender-wiring mutation after window open', () => {
    const captureAuthority = structuredClone(options.captureAuthority);
    (
      captureAuthority.recordingPlan as {
        lastMutationAtBiologicalTimeTics: string;
      }
    ).lastMutationAtBiologicalTimeTics = '100875';
    const result = withRuntimeOptions({ ...options, captureAuthority });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.instancePath).toBe(
        '/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics',
      );
    }
  });

  it.each([
    {
      field: 'origin' as const,
      milliseconds: 100.251,
      tics: '100251',
      path: '/captureAuthority/recordingGrid/originTics',
    },
    {
      field: 'start' as const,
      milliseconds: 0.501,
      tics: '501',
      path: '/captureAuthority/recordingGrid/startTics',
    },
    {
      field: 'stop' as const,
      milliseconds: 10.751,
      tics: '10751',
      path: '/captureAuthority/recordingGrid/stopTics',
    },
  ])(
    'rejects off-grid exported $field with an exact tic preimage',
    ({ field, milliseconds, tics, path }) => {
      const captureAuthority = structuredClone(options.captureAuthority);
      const ticField = `${field}Tics` as 'originTics' | 'startTics' | 'stopTics';
      (captureAuthority.recordingGrid as Record<typeof ticField, string>)[ticField] = tics;
      const result = nestSpikeRecorderToRaster(
        { ...validExport, [field]: milliseconds },
        { ...options, captureAuthority },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toMatchObject({
          code: 'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
          instancePath: path,
        });
      }
    },
  );

  it('rejects a capture time that is not on the runtime resolution grid', () => {
    const captureAuthority = structuredClone(options.captureAuthority);
    (
      captureAuthority.runtimeStatus as {
        captureBiologicalTimeTics: string;
      }
    ).captureBiologicalTimeTics = '111001';
    const result = withRuntimeOptions({ ...options, captureAuthority });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        instancePath: '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
      });
    }
  });

  it('rejects a tic preimage whose binary64 projection does not equal the exported status', () => {
    const captureAuthority = structuredClone(options.captureAuthority);
    (captureAuthority.recordingGrid as { originTics: string }).originTics = '100375';
    const result = withRuntimeOptions({ ...options, captureAuthority });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
        instancePath: '/captureAuthority/recordingGrid/originTics',
      });
    }
  });

  it.each([
    {
      container: 'runtimeStatus',
      field: 'ticsPerMs',
      path: '/captureAuthority/runtimeStatus/ticsPerMs',
    },
    {
      container: 'runtimeStatus',
      field: 'resolutionTics',
      path: '/captureAuthority/runtimeStatus/resolutionTics',
    },
    {
      container: 'runtimeStatus',
      field: 'captureBiologicalTimeTics',
      path: '/captureAuthority/runtimeStatus/captureBiologicalTimeTics',
    },
    {
      container: 'recordingGrid',
      field: 'originTics',
      path: '/captureAuthority/recordingGrid/originTics',
    },
    {
      container: 'recordingGrid',
      field: 'startTics',
      path: '/captureAuthority/recordingGrid/startTics',
    },
    {
      container: 'recordingGrid',
      field: 'stopTics',
      path: '/captureAuthority/recordingGrid/stopTics',
    },
    {
      container: 'bufferEpoch',
      field: 'beganAtBiologicalTimeTics',
      path: '/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics',
    },
    {
      container: 'recordingPlan',
      field: 'lastMutationAtBiologicalTimeTics',
      path: '/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics',
    },
  ] as const)(
    'attributes an unsafe $field primitive only to $path',
    ({ container, field, path }) => {
      const captureAuthority = structuredClone(options.captureAuthority);
      const mutableContainer = captureAuthority[container] as unknown as Record<
        string,
        unknown
      >;
      mutableContainer[field] = '9007199254741000';
      const result = nestSpikeRecorderToRaster(validExport, {
        ...options,
        captureAuthority,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toEqual([
          expect.objectContaining({
            code: 'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
            instancePath: path,
          }),
        ]);
      }
    },
  );

  it.each([
    {
      executionScope: {
        kind: 'mpi_rank_local',
        numProcesses: 2,
        rank: 0,
        localNumThreads: 1,
      },
      label: 'rank-local MPI',
    },
    {
      executionScope: {
        kind: 'single_process',
        numProcesses: 2,
        rank: 0,
        localNumThreads: 1,
      },
      label: 'contradictory process count',
    },
    {
      executionScope: {
        kind: 'single_process',
        numProcesses: 1,
        rank: 1,
        localNumThreads: 1,
      },
      label: 'contradictory rank',
    },
  ])('rejects $label capture authority', ({ executionScope }) => {
    const captureAuthority = structuredClone(options.captureAuthority) as {
      runtimeStatus: { executionScope: unknown };
    };
    captureAuthority.runtimeStatus.executionScope = executionScope;
    const result = withRuntimeOptions({ ...options, captureAuthority });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.instancePath).toBe('/captureAuthority/runtimeStatus/executionScope');
    }
  });

  it('rejects unknown authority and option members instead of silently omitting them from the digest', () => {
    const authorityResult = withRuntimeOptions({
      ...options,
      captureAuthority: {
        ...options.captureAuthority,
        premergedMpi: true,
      },
    });
    expect(authorityResult.ok).toBe(false);
    if (!authorityResult.ok) {
      expect(authorityResult.errors[0]?.instancePath).toBe('/captureAuthority/premergedMpi');
    }

    const optionResult = withRuntimeOptions({
      ...options,
      authorityNote: 'trust me',
    });
    expect(optionResult.ok).toBe(false);
    if (!optionResult.ok) {
      expect(optionResult.errors[0]?.instancePath).toBe('/authorityNote');
    }
  });

  it('rejects decorated exported status and event projections at their first exact unknown key', () => {
    const decoratedStatus = nestSpikeRecorderToRaster(
      { ...validExport, label: 'silently ignored before closure' },
      options,
    );
    expect(decoratedStatus.ok).toBe(false);
    if (!decoratedStatus.ok) {
      expect(decoratedStatus.errors).toEqual([
        expect.objectContaining({
          code: 'ADAPTER_MAPPING_REQUIRED',
          instancePath: '/label',
        }),
      ]);
    }

    const decoratedEvents = nestSpikeRecorderToRaster(
      {
        ...validExport,
        events: { ...validExport.events, weights: [1, 1, 1, 1, 1, 1] },
      },
      options,
    );
    expect(decoratedEvents.ok).toBe(false);
    if (!decoratedEvents.ok) {
      expect(decoratedEvents.errors).toEqual([
        expect.objectContaining({
          code: 'ADAPTER_MAPPING_REQUIRED',
          instancePath: '/events/weights',
        }),
      ]);
    }
  });

  it('binds every normalized capture option into the adapter-input digest', () => {
    const first = nestSpikeRecorderToRaster(validExport, options);
    const second = nestSpikeRecorderToRaster(validExport, {
      ...options,
      captureAuthority: captureAuthorityFor(
        validExport.origin,
        validExport.start,
        validExport.stop,
        2,
      ),
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    const firstDigest = (
      first.request.data as {
        window: { captureAuthority: { adapterInputDigest: string } };
      }
    ).window.captureAuthority.adapterInputDigest;
    const secondDigest = (
      second.request.data as {
        window: { captureAuthority: { adapterInputDigest: string } };
      }
    ).window.captureAuthority.adapterInputDigest;
    expect(firstDigest).not.toBe(secondDigest);
  });

  it('requires the recorded sender universe rather than inferring it', () => {
    const result = nestSpikeRecorderToRaster(validExport, {
      ...options,
      recordedSenderIds: [],
    });
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

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '0', '01', '+1', '1.0', '1e3', '-1', ' 1'])(
    'rejects non-canonical sender id %j',
    (sender) => {
      const result = nestSpikeRecorderToRaster(
        {
          ...validExport,
          n_events: 1,
          events: { senders: [sender], times: [101] },
        },
        { ...options, recordedSenderIds: [sender] },
      );
      expect(result.ok).toBe(false);
    },
  );

  it('accepts a canonical decimal-string id beyond the safe integer range', () => {
    const sender = '900719925474099312345678901234567890';
    const result = nestSpikeRecorderToRaster(
      {
        ...validExport,
        n_events: 1,
        events: { senders: [sender], times: [101] },
      },
      { ...options, recordedSenderIds: [sender] },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.request.data as { eventSenderIds: string[] }).eventSenderIds).toEqual([sender]);
  });

  it('rejects mismatched senders/times length', () => {
    const bad = {
      ...validExport,
      n_events: 1,
      events: { senders: [1, 2], times: [101.0] },
    };
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
    const bad = {
      ...validExport,
      n_events: 1,
      events: { senders: [1], times: ['101'] },
    };
    const result = nestSpikeRecorderToRaster(bad, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_UNSUPPORTED_SHAPE');
  });

  it('rejects a non-finite time at the snapshot boundary', () => {
    const bad = {
      ...validExport,
      n_events: 1,
      events: { senders: [1], times: [Number.NaN] },
    };
    const result = nestSpikeRecorderToRaster(bad, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('SNAPSHOT_NON_FINITE_NUMBER');
  });

  it('rejects raw typed event arrays because revision 5 requires the named plain-data projection', () => {
    const result = nestSpikeRecorderToRaster(
      {
        ...validExport,
        n_events: 2,
        events: {
          senders: new BigInt64Array([1n, 2n]),
          times: new Float64Array([101, 102]),
        },
      },
      options,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'SNAPSHOT_NON_PLAIN_OBJECT',
        instancePath: '/events/senders',
      });
    }
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

  it.each(['ascii', 'screen', 'mpi', 'sionlib'])('rejects non-memory record_to %s', (record_to) => {
    const result = nestSpikeRecorderToRaster({ ...validExport, record_to }, options);
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED');
  });

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
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: 'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
          instancePath: '/events/offsets',
        }),
      ]);
    }
  });

  it('prioritizes the specialized offset rejection over generic event decoration', () => {
    const result = nestSpikeRecorderToRaster(
      {
        ...validExport,
        n_events: 1,
        events: {
          senders: [1],
          times: [101],
          offsets: [],
          weights: [1],
        },
      },
      options,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: 'ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED',
          instancePath: '/events/offsets',
        }),
      ]);
    }
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

    const result = nestSpikeRecorderToRaster(
      hostileExport,
      hostileOptions as unknown as NestSpikeOptionsV5Finite,
    );
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
    const result = nestSpikeRecorderToRaster(
      validExport,
      hostileOptions as unknown as NestSpikeOptionsV5Finite,
    );
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toContain('ADAPTER_ACCESSOR_INPUT_REJECTED');
    if (!result.ok) expect(result.errors[0]?.instancePath).toBe('/recordedSenderIds');
    expect(invoked).toBe(false);
  });
});
