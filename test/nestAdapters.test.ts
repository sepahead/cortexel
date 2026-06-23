import { describe, it, expect } from 'vitest';
import {
  spikeRecorderToSceneData,
  multimeterToSceneData,
  getConnectionsToSceneData,
  weightRecorderToSceneData,
} from '../core/nest/adapters';
import { routeToScene } from '../core/skills/router';

describe('NEST adapters', () => {
  it('maps spike_recorder events and re-indexes senders to 0..N', () => {
    const r = spikeRecorderToSceneData({ senders: [7, 7, 9], times: [1, 2, 3] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Array.from(r.data.spikeSenders!)).toEqual([0, 0, 1]);
      expect(Array.from(r.data.spikeTimes!)).toEqual([1, 2, 3]);
      expect(r.senderIndexMap!.get(9)).toBe(1);
    }
  });

  it('rejects mismatched-length spike arrays (unusable evidence)', () => {
    const r = spikeRecorderToSceneData({ senders: [1, 2], times: [1] });
    expect(r.ok).toBe(false);
  });

  it('keeps weight series distinct from voltage traces', () => {
    const r = weightRecorderToSceneData({ times: [1, 2], weights: [0.5, 0.6] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.weightSeries).toBeInstanceOf(Float32Array);
      expect(r.data.voltageTraces).toBeUndefined();
    }
  });

  it('multimeter values become Float32Array', () => {
    const r = multimeterToSceneData({ times: [0, 1], values: [-65, -64] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.voltageTraces).toBeInstanceOf(Float32Array);
  });

  it('builds nodes+edges from GetConnections', () => {
    const r = getConnectionsToSceneData({ sources: [1, 2], targets: [2, 3] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.networkEdges).toHaveLength(2);
      expect(r.data.networkNodes!.length).toBe(3);
    }
  });
});

describe('routeToScene', () => {
  it('routes a single-member family (weight_recorder) unambiguously', () => {
    expect(routeToScene({ deviceFamily: 'weight_recorder' })).toEqual({
      ok: true,
      skill: 'nest.plasticity_dynamics',
      scene: 'stdp',
    });
  });

  it('is ambiguous for multimeter (4 skills) without a discriminator', () => {
    const r = routeToScene({ deviceFamily: 'multimeter' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('ambiguous');
      expect(r.candidates!.length).toBeGreaterThan(1);
      expect(r.disambiguateBy!.field).toBe('skill');
    }
  });

  it('resolves a many-to-one family via an explicit skill hint', () => {
    expect(
      routeToScene({ deviceFamily: 'multimeter', skill: 'nest.voltage_trace' }),
    ).toEqual({ ok: true, skill: 'nest.voltage_trace', scene: 'voltage-trace' });
  });

  it('is ambiguous for spike_recorder without a kind, and hands back the map', () => {
    const r = routeToScene({ deviceFamily: 'spike_recorder' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('ambiguous');
      expect(r.disambiguateBy!.field).toBe('dataShape.kind');
      expect(r.disambiguateBy!.maps.events).toBe('nest.spike_raster');
    }
  });

  it('disambiguates spike_recorder by kind', () => {
    expect(routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'events' } })).toEqual(
      { ok: true, skill: 'nest.spike_raster', scene: 'spike-raster' },
    );
  });

  it('refuses correlation (no honest scene)', () => {
    const r = routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'correlation' } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_cortexel_scene');
  });

  it('every multi-member family is ambiguous without a discriminator', () => {
    for (const fam of ['spike_recorder', 'multimeter', 'computed'] as const) {
      const r = routeToScene({ deviceFamily: fam });
      expect(r.ok).toBe(false);
    }
  });
});

describe('NEST input hardening', () => {
  it('rejects non-finite senders (denseIndex keys)', () => {
    expect(spikeRecorderToSceneData({ senders: [NaN], times: [1] }).ok).toBe(false);
  });

  it('rejects a flattened multi-sender multimeter dump (non-monotonic times)', () => {
    expect(multimeterToSceneData({ times: [0, 1, 0, 1], values: [1, 2, 3, 4] }).ok).toBe(false);
  });

  it('routes a non-voltage multimeter variable into the labeled analog channel', () => {
    const r = multimeterToSceneData(
      { times: [0, 1], values: [0.1, 0.2] },
      { variable: 'Ca', units: 'uM' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.voltageTraces).toBeUndefined();
      expect(r.data.analogTraces?.variable).toBe('Ca');
      expect(r.data.analogTraces?.units).toBe('uM');
    }
  });
});
