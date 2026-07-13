import { describe, expect, it } from 'vitest';
import {
  correlationDetectorToCorrelogramParams,
  spikeRecorderToIsiParams,
  spikeRecorderToPopulationRateParams,
  spikeTrialsToPsthParams,
} from '../core/nest/analysis';
import {
  spikeRecorderToPopulationRateParams as populationRateFromCore,
} from '../core';
import {
  spikeRecorderToPopulationRateParams as populationRateFromNestIndex,
} from '../core/nest';

describe('NEST analysis exports', () => {
  it('is available through both the NEST module and public core entry', () => {
    expect(populationRateFromNestIndex).toBe(spikeRecorderToPopulationRateParams);
    expect(populationRateFromCore).toBe(spikeRecorderToPopulationRateParams);
  });
});

describe('spikeRecorderToPopulationRateParams', () => {
  const options = {
    startMs: 0,
    stopMs: 10,
    binWidthMs: 5,
    populations: [
      { id: 'E', label: 'Excitatory', senderIds: [1, 2] },
      { id: 'I', label: 'Inhibitory', senderIds: [3] },
    ],
    unassignedPolicy: 'reject' as const,
  };

  it('bins unordered events with exact half-open boundaries and silent senders in the denominator', () => {
    const result = spikeRecorderToPopulationRateParams({
      // Sender 2 is deliberately silent. Unassigned events outside [0,10)
      // do not belong to the analysis window and cannot contaminate it.
      times: [7, 0, 5, 4.999, 10, -1, 2],
      senders: [1, 1, 1, 1, 99, 99, 3],
    }, options);
    expect(result).toEqual({
      ok: true,
      params: {
        bin_centers_ms: [2.5, 7.5],
        bin_width_ms: 5,
        window_start_ms: 0,
        window_stop_ms: 10,
        series: [
          {
            id: 'E',
            label: 'Excitatory',
            recorded_sender_count: 2,
            spike_counts: [2, 2],
            rates_hz: [200, 200],
          },
          {
            id: 'I',
            label: 'Inhibitory',
            recorded_sender_count: 1,
            spike_counts: [1, 0],
            rates_hz: [200, 0],
          },
        ],
        normalization: 'mean_per_recorded_sender_hz',
        aggregation: 'selected_senders',
        binning: 'left_closed_right_open',
      },
    });
  });

  it('rejects overlapping/duplicate groups, unassigned in-window events, and partial bins', () => {
    expect(spikeRecorderToPopulationRateParams(
      { times: [], senders: [] },
      {
        ...options,
        populations: [
          options.populations[0],
          { id: 'other', label: 'Other', senderIds: [2] },
        ],
      },
    ).ok).toBe(false);
    expect(spikeRecorderToPopulationRateParams(
      { times: [1], senders: [9] },
      options,
    ).ok).toBe(false);
    expect(spikeRecorderToPopulationRateParams(
      { times: [], senders: [] },
      { ...options, stopMs: 11 },
    ).ok).toBe(false);
  });

  it('honors explicit ignore policy without changing selected-sender counts', () => {
    const result = spikeRecorderToPopulationRateParams(
      { times: [1, 1], senders: [1, 9] },
      { ...options, unassignedPolicy: 'ignore' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.series[0].spike_counts).toEqual([1, 0]);
      expect(result.params.series[0].recorded_sender_count).toBe(2);
    }
  });

  it('accepts decimal bin geometry within the published binary64 tolerance', () => {
    const result = spikeRecorderToPopulationRateParams(
      { times: [0.1, 0.2, 0.3, 0.4], senders: [1, 1, 1, 1] },
      {
        startMs: 0.1,
        stopMs: 0.4,
        binWidthMs: 0.1,
        populations: [{ id: 'E', label: 'E', senderIds: [1] }],
        unassignedPolicy: 'reject',
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.series[0].spike_counts).toEqual([1, 1, 1]);
      expect(result.params.bin_centers_ms).toHaveLength(3);
    }
  });
});

describe('spikeRecorderToIsiParams', () => {
  const options = {
    senderIds: [1, 2],
    binWidthMs: 2,
    maxIntervalMs: 6,
    normalization: 'count' as const,
    intervalScope: 'per_sender' as const,
  };

  it('sorts only within each sender and counts consecutive intervals', () => {
    const result = spikeRecorderToIsiParams({
      times: [5, 4, 1, 0, 3],
      senders: [1, 2, 1, 2, 1],
    }, options);
    expect(result).toEqual({
      ok: true,
      params: {
        bin_centers_ms: [1, 3, 5],
        values: [0, 2, 1],
        bin_width_ms: 2,
        normalization: 'count',
        value_units: 'count',
        interval_scope: 'per_sender',
      },
    });
  });

  it('normalizes from exact interval counts and rejects intervals at the open upper edge', () => {
    const probability = spikeRecorderToIsiParams(
      { times: [5, 1, 3], senders: [1, 1, 1] },
      { ...options, normalization: 'probability' },
    );
    expect(probability.ok).toBe(true);
    if (probability.ok) expect(probability.params.values).toEqual([0, 1, 0]);

    expect(spikeRecorderToIsiParams(
      { times: [0, 6], senders: [1, 1] },
      options,
    ).ok).toBe(false);
    expect(spikeRecorderToIsiParams(
      { times: [0], senders: [1] },
      { ...options, normalization: 'probability_density' },
    ).ok).toBe(false);
  });
});

describe('spikeTrialsToPsthParams', () => {
  const options = {
    alignmentTimesMs: [10, 20],
    windowMs: [-5, 5] as const,
    binWidthMs: 5,
    senderIds: [1],
    normalization: 'count_per_trial' as const,
    alignmentEvent: 'stimulus onset',
  };

  it('is event-order independent and applies exact trial-relative half-open bins', () => {
    const result = spikeTrialsToPsthParams([
      {
        times: [14.999, 10, 15, 5, 12],
        senders: [1, 1, 1, 1, 2],
      },
      {
        times: [19.999, 15, 20, 25],
        senders: [1, 1, 1, 1],
      },
    ], options);
    expect(result).toEqual({
      ok: true,
      params: {
        bin_centers_ms: [-2.5, 2.5],
        values: [1.5, 1.5],
        bin_width_ms: 5,
        normalization: 'count_per_trial',
        value_units: 'count/trial',
        trial_count: 2,
        alignment_event: 'stimulus onset',
        aggregation: 'selected_senders_per_trial',
      },
    });
  });

  it('accepts typed event arrays and rejects trial/alignment or sender ambiguity', () => {
    const typed = spikeTrialsToPsthParams([
      { times: new Float64Array([0, 5]), senders: new Uint32Array([1, 1]) },
    ], {
      ...options,
      alignmentTimesMs: [0],
      windowMs: [0, 10],
      normalization: 'rate_hz',
    });
    expect(typed.ok).toBe(true);
    if (typed.ok) expect(typed.params.values).toEqual([200, 200]);

    expect(spikeTrialsToPsthParams(
      [{ times: [], senders: [] }],
      options,
    ).ok).toBe(false);
    expect(spikeTrialsToPsthParams(
      [{ times: [], senders: [] }],
      { ...options, alignmentTimesMs: [0], senderIds: [1, 1] },
    ).ok).toBe(false);
  });

  it('normalizes decimal alignment roundoff at both half-open window edges', () => {
    const inclusiveLeft = spikeTrialsToPsthParams([
      { times: [19.9, 1e15], senders: [1, 1] },
    ], {
      alignmentTimesMs: [20],
      windowMs: [-0.1, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'decimal boundary',
    });
    expect(inclusiveLeft.ok).toBe(true);
    if (inclusiveLeft.ok) expect(inclusiveLeft.params.values).toEqual([1, 0]);

    const exclusiveRight = spikeTrialsToPsthParams([
      { times: [0.3], senders: [1] },
    ], {
      alignmentTimesMs: [0.2],
      windowMs: [0, 0.1],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'decimal boundary',
    });
    expect(exclusiveRight.ok).toBe(true);
    if (exclusiveRight.ok) expect(exclusiveRight.params.values).toEqual([0]);

    const unresolved = spikeTrialsToPsthParams([
      { times: [1e15], senders: [1] },
    ], {
      alignmentTimesMs: [1e15],
      windowMs: [0, 0.2],
      binWidthMs: 0.1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'precision limit',
    });
    expect(unresolved.ok).toBe(false);
    if (!unresolved.ok) {
      expect(unresolved.errors).toContain(
        'trials.0.times.0: aligned-time arithmetic cannot resolve a bin boundary',
      );
    }
  });
});

describe('analysis bin-boundary precision', () => {
  const justBelowHighBoundary = 49_998.99999;

  it('does not widen boundary snapping with the population-rate bin index', () => {
    const result = spikeRecorderToPopulationRateParams(
      { times: [justBelowHighBoundary], senders: [1] },
      {
        startMs: 0,
        stopMs: 50_000,
        binWidthMs: 1,
        populations: [{ id: 'E', label: 'E', senderIds: [1] }],
        unassignedPolicy: 'reject',
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.series[0].spike_counts[49_998]).toBe(1);
      expect(result.params.series[0].spike_counts[49_999]).toBe(0);
    }
  });

  it('does not widen boundary snapping with the PSTH or ISI bin index', () => {
    const psth = spikeTrialsToPsthParams([
      { times: [justBelowHighBoundary], senders: [1] },
    ], {
      alignmentTimesMs: [0],
      windowMs: [0, 50_000],
      binWidthMs: 1,
      senderIds: [1],
      normalization: 'count',
      alignmentEvent: 'origin',
    });
    expect(psth.ok).toBe(true);
    if (psth.ok) {
      expect(psth.params.values[49_998]).toBe(1);
      expect(psth.params.values[49_999]).toBe(0);
    }

    const isi = spikeRecorderToIsiParams(
      { times: [0, justBelowHighBoundary], senders: [1, 1] },
      {
        senderIds: [1],
        binWidthMs: 1,
        maxIntervalMs: 50_000,
        normalization: 'count',
      },
    );
    expect(isi.ok).toBe(true);
    if (isi.ok) {
      expect(isi.params.values[49_998]).toBe(1);
      expect(isi.params.values[49_999]).toBe(0);
    }
  });
});

describe('correlationDetectorToCorrelogramParams', () => {
  const status = {
    delta_tau: 1,
    tau_max: 2,
    Tstart: 2,
    Tstop: 98,
    count_histogram: new Uint32Array([1, 2, 5, 3, 1]),
  };
  const options = {
    measurement: 'count_histogram' as const,
    referenceLabel: 'E',
    targetLabel: 'I',
    zeroLagPolicy: 'included' as const,
  };

  it('builds the documented centered lag axis from typed raw counts', () => {
    const result = correlationDetectorToCorrelogramParams(status, options);
    expect(result).toEqual({
      ok: true,
      params: {
        lags_ms: [-2, -1, 0, 1, 2],
        values: [1, 2, 5, 3, 1],
        bin_width_ms: 1,
        tau_max_ms: 2,
        counting_start_ms: 2,
        counting_stop_ms: 98,
        pair: { reference_label: 'E', target_label: 'I' },
        lag_convention: 'positive_target_after_reference',
        binning: 'left_closed_right_open',
        zero_lag_policy: 'included',
        statistic: { kind: 'raw_pair_count', units: 'count' },
      },
    });
  });

  it('descriptor-projects a full status without reading unrelated device fields', () => {
    let unrelatedReads = 0;
    const fullStatus: Record<string, unknown> = {
      ...status,
      label: 'corr',
      n_events: [20, 30],
      origin: 0,
    };
    Object.defineProperty(fullStatus, 'expensive_unrelated_field', {
      enumerable: true,
      get() {
        unrelatedReads += 1;
        return 'unused';
      },
    });
    const result = correlationDetectorToCorrelogramParams(fullStatus, options);
    expect(result.ok).toBe(true);
    expect(unrelatedReads).toBe(0);
  });

  it('requires weighted units and rejects missing/wrong-length detector channels', () => {
    expect(correlationDetectorToCorrelogramParams(
      { ...status, count_histogram: undefined, histogram: [0.1, 0.2, 0.3, 0.2, 0.1] },
      { ...options, measurement: 'histogram' },
    ).ok).toBe(false);
    const weighted = correlationDetectorToCorrelogramParams(
      { ...status, count_histogram: undefined, histogram: [-1, 0, 2, 0, -1] },
      { ...options, measurement: 'histogram', weightedUnits: 'pA²' },
    );
    expect(weighted.ok).toBe(true);
    if (weighted.ok) {
      expect(weighted.params.statistic).toEqual({
        kind: 'weighted_pair_sum',
        units: 'pA²',
      });
    }
    expect(correlationDetectorToCorrelogramParams(
      { ...status, count_histogram: [1, 2, 3] },
      options,
    ).ok).toBe(false);
  });
});

describe('NEST analysis trust boundary', () => {
  it('rejects nested accessors without invoking them and never throws', () => {
    let reads = 0;
    const senderIds: number[] = [];
    Object.defineProperty(senderIds, '0', {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    senderIds.length = 1;
    const result = spikeRecorderToPopulationRateParams(
      { times: [], senders: [] },
      {
        startMs: 0,
        stopMs: 10,
        binWidthMs: 5,
        populations: [{ id: 'E', label: 'E', senderIds }],
        unassignedPolicy: 'reject',
      },
    );
    expect(result.ok).toBe(false);
    expect(reads).toBe(0);

    const hostile = new Proxy({}, {
      ownKeys() { throw new Error('hostile'); },
      get() { throw new Error('hostile'); },
    });
    const calls = [
      () => spikeRecorderToPopulationRateParams(hostile, hostile),
      () => spikeRecorderToIsiParams(hostile, hostile),
      () => spikeTrialsToPsthParams(hostile, hostile),
      () => correlationDetectorToCorrelogramParams(hostile, hostile),
    ];
    for (const call of calls) {
      expect(call).not.toThrow();
      expect(call().ok).toBe(false);
    }
  });

  it('rejects detector accessors without invoking them', () => {
    let reads = 0;
    const status: Record<string, unknown> = {
      delta_tau: 1,
      tau_max: 1,
      Tstart: 1,
      Tstop: 9,
    };
    Object.defineProperty(status, 'count_histogram', {
      enumerable: true,
      get() {
        reads += 1;
        return [1, 2, 1];
      },
    });
    expect(correlationDetectorToCorrelogramParams(status, {
      measurement: 'count_histogram',
      referenceLabel: 'a',
      targetLabel: 'b',
      zeroLagPolicy: 'included',
    }).ok).toBe(false);
    expect(reads).toBe(0);
  });
});
