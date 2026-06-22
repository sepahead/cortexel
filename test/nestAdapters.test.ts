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
  it('routes multimeter to voltage_trace', () => {
    const r = routeToScene({ deviceFamily: 'multimeter' });
    expect(r).toEqual({ ok: true, skill: 'pi.nest.voltage_trace', scene: 'voltage-trace' });
  });

  it('is ambiguous for spike_recorder without a dataShape kind', () => {
    const r = routeToScene({ deviceFamily: 'spike_recorder' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('ambiguous');
  });

  it('disambiguates spike_recorder by kind', () => {
    expect(routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'events' } })).toEqual(
      { ok: true, skill: 'pi.nest.spike_raster', scene: 'spike-raster' },
    );
  });

  it('refuses correlation (no honest scene)', () => {
    const r = routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'correlation' } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_cortexel_scene');
  });
});
