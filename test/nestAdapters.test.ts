import { describe, it, expect } from 'vitest';
import {
  spikeRecorderToSceneData,
  multimeterToSceneData,
  getConnectionsToSceneData,
  getPositionToSceneData,
  weightRecorderToSceneData,
  splitWeightRecorderBySynapse,
  splitMultimeterBySender,
} from '../core/nest/adapters';
import { MultimeterEventsSchema } from '../core/nest/shapes';
import { routeToScene } from '../core/skills/router';

describe('NEST adapters', () => {
  it('maps spike_recorder events and re-indexes senders to 0..N', () => {
    const r = spikeRecorderToSceneData({ senders: [7, 7, 9], times: [1, 2, 3] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Array.from(r.data.spikeSenders!)).toEqual([0, 0, 1]);
      expect(Array.from(r.data.spikeTimes!)).toEqual([1, 2, 3]);
      expect(r.data.spikeTimes).toBeInstanceOf(Float64Array);
      expect(r.senderIndexMap!.get(9)).toBe(1);
    }
  });

  it('rejects mismatched-length spike arrays (unusable evidence)', () => {
    const r = spikeRecorderToSceneData({ senders: [1, 2], times: [1] });
    expect(r.ok).toBe(false);
  });

  it('keeps weight series distinct from voltage traces', () => {
    const r = weightRecorderToSceneData(
      { times: [1, 2], weights: [0.5, 0.6] },
      { weightUnits: 'nS' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.weightSeries).toBeInstanceOf(Float32Array);
      expect(r.data.weightUnits).toBe('nS');
      expect(r.data.voltageTraces).toBeUndefined();
    }
  });

  it('multimeter values become Float32Array while times retain Float64 precision', () => {
    const r = multimeterToSceneData(
      { times: [10_000_000, 10_000_000.1], values: [-65, -64] },
      { variable: 'V_m', units: 'mV' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.voltageTraces).toBeInstanceOf(Float32Array);
      expect(r.data.traceTimes).toBeInstanceOf(Float64Array);
      expect(r.data.traceTimes?.[1]).toBe(10_000_000.1);
    }
  });

  it('builds nodes+edges from GetConnections', () => {
    const r = getConnectionsToSceneData({ sources: [1, 2], targets: [2, 3] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.networkEdges).toHaveLength(2);
      expect(r.data.networkNodes!.length).toBe(3);
      expect(r.data.networkLayout).toBe('unpositioned');
      expect(r.data.networkNodes!.every((node) => node.x === undefined)).toBe(true);
      expect(r.data.networkEdges!.every((edge) => edge.weight === undefined)).toBe(true);
    }
  });

  it('requires and preserves units for connection measurements', () => {
    const measured = {
      sources: [1],
      targets: [2],
      weights: [0.5],
      delays: [1.5],
    };
    expect(getConnectionsToSceneData(measured).ok).toBe(false);
    const result = getConnectionsToSceneData(measured, {
      weightUnits: ' nS ',
      delayUnits: ' ms ',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.networkWeightUnits).toBe('nS');
    expect(result.data.networkDelayUnits).toBe('ms');
  });

  it('rejects non-positive synaptic delays and negative-zero ids', () => {
    for (const delay of [-1, 0]) {
      expect(getConnectionsToSceneData(
        { sources: [1], targets: [2], delays: [delay] },
        { delayUnits: 'ms' },
      ).ok).toBe(false);
    }
    expect(multimeterToSceneData({ times: [0], values: [1], sender: -0 }).ok).toBe(false);
    expect(weightRecorderToSceneData(
      { times: [0], weights: [1], sender: -0, target: 1 },
      { weightUnits: 'nS' },
    ).ok).toBe(false);
    expect(getPositionToSceneData({
      positions: [[0, 0, 0]],
      edges: [{ source: -0, target: 0 }],
    }, { coordinateUnits: 'mm' }).ok).toBe(false);
  });

  it('rejects typoed optional device fields instead of silently dropping evidence', () => {
    expect(
      getConnectionsToSceneData({
        sources: [1],
        targets: [2],
        wieghts: [0.5],
      }).ok,
    ).toBe(false);
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
      expect(r.disambiguateBy!.maps).toEqual({
        events: 'nest.spike_raster',
        isi: 'nest.isi_distribution',
        psth: 'nest.psth',
        population_rate: 'nest.population_rate',
        fi_response: 'nest.rate_response',
      });
    }
  });

  it('disambiguates spike_recorder by kind', () => {
    expect(routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'events' } })).toEqual(
      { ok: true, skill: 'nest.spike_raster', scene: 'spike-raster' },
    );
    expect(routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'isi' } })).toEqual(
      { ok: true, skill: 'nest.isi_distribution', scene: 'isi-distribution' },
    );
    expect(routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'psth' } })).toEqual(
      { ok: true, skill: 'nest.psth', scene: 'psth' },
    );
    expect(routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'population_rate' } })).toEqual(
      { ok: true, skill: 'nest.population_rate', scene: 'population-rate' },
    );
    expect(routeToScene({ deviceFamily: 'spike_recorder', dataShape: { kind: 'fi_response' } })).toEqual(
      { ok: true, skill: 'nest.rate_response', scene: 'fi-curve' },
    );
  });

  it('makes GetConnections ambiguity explicit after adding snapshot distributions', () => {
    const r = routeToScene({ deviceFamily: 'get_connections' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('ambiguous');
      expect(r.disambiguateBy).toEqual({
        field: 'dataShape.kind',
        maps: {
          connection_graph: 'nest.connection_graph',
          adjacency_matrix: 'nest.adjacency_matrix',
          weight_matrix: 'nest.weight_matrix',
          delay_matrix: 'nest.delay_matrix',
          in_degree_distribution: 'nest.in_degree_distribution',
          out_degree_distribution: 'nest.out_degree_distribution',
          delay_distribution: 'nest.delay_distribution',
          weight_distribution: 'nest.weight_histogram',
        },
      });
    }
  });

  it('routes explicit GetConnections and GetPosition analysis kinds', () => {
    expect(routeToScene({
      deviceFamily: 'get_connections',
      dataShape: { kind: 'connection_graph' },
    })).toEqual({ ok: true, skill: 'nest.connection_graph', scene: 'network-topology' });
    expect(routeToScene({
      deviceFamily: 'get_connections',
      dataShape: { kind: 'adjacency_matrix' },
    })).toEqual({ ok: true, skill: 'nest.adjacency_matrix', scene: 'connection-matrix' });
    expect(routeToScene({
      deviceFamily: 'get_connections',
      dataShape: { kind: 'in_degree_distribution' },
    })).toEqual({ ok: true, skill: 'nest.in_degree_distribution', scene: 'degree-distribution' });
    expect(routeToScene({
      deviceFamily: 'get_connections',
      dataShape: { kind: 'delay_distribution' },
    })).toEqual({ ok: true, skill: 'nest.delay_distribution', scene: 'delay-distribution' });
    expect(routeToScene({
      deviceFamily: 'get_position',
      dataShape: { kind: 'positions_2d' },
    })).toEqual({ ok: true, skill: 'nest.spatial_map_2d', scene: 'spatial-map-2d' });
  });

  it('keeps deprecated topology ids explicitly valid but out of derived routing', () => {
    expect(routeToScene({
      deviceFamily: 'get_connections',
      skill: 'nest.connectivity_matrix',
    })).toEqual({ ok: true, skill: 'nest.connectivity_matrix', scene: 'network-topology' });
    expect(routeToScene({
      deviceFamily: 'get_position',
      skill: 'nest.spatial_2d',
    })).toMatchObject({ ok: false, reason: 'no_cortexel_scene' });
  });

  it('routes correlation_detector unambiguously and rejects ambiguous legacy rates', () => {
    expect(routeToScene({ deviceFamily: 'correlation_detector' })).toEqual({
      ok: true,
      skill: 'nest.correlogram',
      scene: 'correlogram',
    });
    expect(
      routeToScene({
        deviceFamily: 'spike_recorder',
        dataShape: { kind: 'rates' as never },
      }),
    ).toMatchObject({ ok: false, reason: 'invalid_discriminator' });
    expect(
      routeToScene({
        deviceFamily: 'spike_recorder',
        dataShape: { kind: 'correlation' as never },
      }),
    ).toMatchObject({ ok: false, reason: 'invalid_discriminator' });
  });

  it('every multi-member family is ambiguous without a discriminator', () => {
    for (const fam of [
      'spike_recorder',
      'multimeter',
      'get_connections',
      'get_position',
      'computed',
    ] as const) {
      const r = routeToScene({ deviceFamily: fam });
      expect(r.ok).toBe(false);
    }
  });

  it('rejects wrong-family and conflicting discriminators instead of ignoring them', () => {
    expect(
      routeToScene({
        deviceFamily: 'get_connections',
        dataShape: { kind: 'population_rate' },
      }),
    ).toMatchObject({ ok: false, reason: 'invalid_discriminator' });
    expect(
      routeToScene({
        deviceFamily: 'spike_recorder',
        skill: 'nest.spike_raster',
        dataShape: { kind: 'fi_response' },
      }),
    ).toMatchObject({ ok: false, reason: 'invalid_discriminator' });
  });
});

describe('NEST input hardening', () => {
  it('all adapter entrypoints fail closed on hostile runtime objects', () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error('hostile getter');
        },
        ownKeys() {
          throw new Error('hostile keys');
        },
      },
    );
    const calls = [
      () => spikeRecorderToSceneData(hostile),
      () => multimeterToSceneData(hostile),
      () => splitMultimeterBySender(hostile),
      () => getConnectionsToSceneData(hostile),
      () => getPositionToSceneData(hostile, { coordinateUnits: 'mm' }),
      () => weightRecorderToSceneData(hostile, { weightUnits: 'nS' }),
      () => splitWeightRecorderBySynapse(hostile),
    ];
    for (const call of calls) {
      expect(call).not.toThrow();
      expect(call().ok).toBe(false);
    }
  });

  it('all adapter option objects fail closed too', () => {
    const hostileOptions = new Proxy({}, {
      get() { throw new Error('hostile option getter'); },
      ownKeys() { throw new Error('hostile option keys'); },
    });
    const calls = [
      () => multimeterToSceneData(
        { times: [0], values: [1] },
        hostileOptions as never,
      ),
      () => getConnectionsToSceneData(
        { sources: [1], targets: [2] },
        hostileOptions as never,
      ),
      () => getPositionToSceneData(
        { positions: [[0, 0, 0]] },
        hostileOptions as never,
      ),
      () => weightRecorderToSceneData(
        { times: [0], weights: [1] },
        hostileOptions as never,
      ),
      () => multimeterToSceneData(
        { times: [0], values: [1] },
        null as never,
      ),
    ];
    for (const call of calls) {
      expect(call).not.toThrow();
      expect(call().ok).toBe(false);
    }
  });

  it('rejects array accessors without invoking them', () => {
    let reads = 0;
    const times: number[] = [];
    Object.defineProperty(times, '0', {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    times.length = 1;
    expect(spikeRecorderToSceneData({ senders: [1], times }).ok).toBe(false);
    expect(reads).toBe(0);
  });

  it('reads typed-array lengths intrinsically without invoking subclass getters', () => {
    let lengthReads = 0;
    class HostileFloat64Array extends Float64Array {
      override get length(): number {
        lengthReads += 1;
        throw new Error('subclass length getter must not execute');
      }
    }
    class HostileUint32Array extends Uint32Array {
      override get length(): number {
        lengthReads += 1;
        throw new Error('subclass length getter must not execute');
      }
    }

    const times = new HostileFloat64Array([0, 1]);
    const values = new HostileFloat64Array([-65, -64]);
    expect(MultimeterEventsSchema.safeParse({ times, values }).success).toBe(true);
    expect(multimeterToSceneData({ times, values }).ok).toBe(true);
    expect(getConnectionsToSceneData({
      sources: new HostileUint32Array([1]),
      targets: new HostileUint32Array([2]),
    }).ok).toBe(true);
    expect(lengthReads).toBe(0);
  });

  it('bounds split-helper errors by the public adapter budget', () => {
    const times: number[] = [];
    const values: number[] = [];
    const senders: number[] = [];
    for (let sender = 0; sender < 40; sender++) {
      times.push(1, 0);
      values.push(1, 2);
      senders.push(sender, sender);
    }
    const result = splitMultimeterBySender({ times, values, senders });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeLessThanOrEqual(33);
  });

  it('bounds unknown-field diagnostic text before schema error amplification', () => {
    const hostile: Record<string, unknown> = { senders: [1], times: [1] };
    for (let index = 0; index < 10_000; index++) hostile[`extra_${index}`] = index;
    const result = spikeRecorderToSceneData(hostile);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n').length).toBeLessThan(2_000);
  });

  it('rejects connection output amplification for arrays and typed arrays', () => {
    const oversized = new Array(20_001).fill(1);
    expect(getConnectionsToSceneData({ sources: oversized, targets: oversized }).ok).toBe(false);
    const typed = new Uint32Array(20_001);
    expect(getConnectionsToSceneData({ sources: typed, targets: typed }).ok).toBe(false);

    const sources = Array.from({ length: 12_501 }, (_, index) => index);
    const targets = Array.from({ length: 12_501 }, (_, index) => index + 12_501);
    expect(getConnectionsToSceneData({ sources, targets }).ok).toBe(false);
  });

  it('rejects descriptor-changing connection payloads after parsing too', () => {
    const oversized = new Array(20_001).fill(1);
    const calls = new Map<PropertyKey, number>();
    const changing = new Proxy<Record<string, unknown>>({}, {
      getPrototypeOf: () => Object.prototype,
      ownKeys: () => ['sources', 'targets'],
      getOwnPropertyDescriptor(_target, key) {
        const count = (calls.get(key) ?? 0) + 1;
        calls.set(key, count);
        if (key !== 'sources' && key !== 'targets') return undefined;
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: count === 1 ? [1] : oversized,
        };
      },
    });
    let result: ReturnType<typeof getConnectionsToSceneData> | undefined;
    expect(() => {
      result = getConnectionsToSceneData(changing);
    }).not.toThrow();
    expect(result?.ok).toBe(false);
    expect(calls.get('sources')).toBeGreaterThanOrEqual(2);
  });

  it('caps split-helper fan-out before constructing thousands of output buffers', () => {
    const count = 4_097;
    const times = new Array(count).fill(0);
    const values = new Array(count).fill(1);
    const senders = Array.from({ length: count }, (_, index) => index);
    expect(splitMultimeterBySender({ times, values, senders }).ok).toBe(false);
    expect(splitWeightRecorderBySynapse({
      times,
      weights: values,
      senders,
      targets: senders.map((sender) => sender + count),
    }).ok).toBe(false);
  });

  it('fails fast on a large invalid position dump', () => {
    const result = getPositionToSceneData(
      { positions: Array.from({ length: 100_000 }, () => ['x', 'x', 'x']) },
      { dims: 3, coordinateUnits: 'mm' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBe(1);
  });

  it('rejects non-finite senders (denseIndex keys)', () => {
    expect(spikeRecorderToSceneData({ senders: [NaN], times: [1] }).ok).toBe(false);
  });

  it('rejects a flattened multi-sender multimeter dump (non-monotonic times)', () => {
    expect(multimeterToSceneData({ times: [0, 1, 0, 1], values: [1, 2, 3, 4] }).ok).toBe(false);
  });

  it('requires strictly increasing shared and per-sender multimeter time axes', () => {
    expect(multimeterToSceneData({
      times: [0, 0, 1, 1],
      values: [1, 2, 3, 4],
    }).ok).toBe(false);
    expect(splitMultimeterBySender({
      times: [0, 0],
      values: [1, 2],
      senders: [7, 7],
    }).ok).toBe(false);

    expect(multimeterToSceneData({ times: [0, 1], values: [1, 2] }).ok).toBe(true);
    const split = splitMultimeterBySender({
      times: [0, 0, 1, 1],
      values: [1, 2, 3, 4],
      senders: [7, 8, 7, 8],
    });
    expect(split.ok).toBe(true);
    if (split.ok) {
      expect(split.series.map((series) => series.times)).toEqual([[0, 1], [0, 1]]);
    }
  });

  it('rejects a flattened multi-sender dump even when its global times are monotonic', () => {
    expect(
      multimeterToSceneData({
        times: [0, 0, 1, 1],
        values: [1, 2, 3, 4],
        senders: [1, 2, 1, 2],
      }).ok,
    ).toBe(false);
  });

  it('never guesses that an unlabeled analog trace is membrane voltage', () => {
    const r = multimeterToSceneData({ times: [0, 1], values: [-65, -64] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.voltageTraces).toBeUndefined();
      expect(r.data.analogTraces?.variable).toBe('unknown');
    }
  });

  it('rejects values that overflow the Float32 GPU representation', () => {
    expect(
      multimeterToSceneData(
        { times: [0], values: [1e300] },
        { variable: 'V_m' },
      ).ok,
    ).toBe(false);
    expect(
      weightRecorderToSceneData(
        { times: [0], weights: [1e300] },
        { weightUnits: 'nS' },
      ).ok,
    ).toBe(false);
    expect(
      getConnectionsToSceneData({
        sources: [1],
        targets: [2],
        weights: [1e300],
      }).ok,
    ).toBe(false);
    expect(
      getPositionToSceneData(
        { positions: [[1e300, 0, 0]] },
        { dims: 3, coordinateUnits: 'mm' },
      ).ok,
    ).toBe(false);
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

  it('feeds a split multimeter series directly into the single-series adapter', () => {
    const split = splitMultimeterBySender({
      times: [0, 0, 1, 1],
      values: [-65, -70, -64, -69],
      senders: [1, 2, 1, 2],
    });
    expect(split.ok).toBe(true);
    if (split.ok) {
      const adapted = multimeterToSceneData(split.series[0], {
        variable: 'V_m',
        units: 'mV',
      });
      expect(adapted.ok).toBe(true);
      if (adapted.ok) {
        expect(adapted.data.voltageUnits).toBe('mV');
        expect(adapted.data.traceSender).toBe(1);
      }
    }
  });
});

describe('getPositionToSceneData', () => {
  it('requires explicit coordinate units', () => {
    expect(getPositionToSceneData(
      { positions: [[0, 0, 0]] },
      {} as never,
    ).ok).toBe(false);
  });

  it('maps 3D positions (and optional edges) to network nodes', () => {
    const r = getPositionToSceneData(
      { positions: [[0, 0, 0], [1, 2, 3]], edges: [{ source: 0, target: 1 }] },
      { dims: 3, coordinateUnits: 'mm' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.networkNodes).toHaveLength(2);
      expect(r.data.networkNodes![1]).toMatchObject({ x: 1, y: 2, z: 3 });
      expect(r.data.networkEdges).toEqual([{ source: 0, target: 1 }]);
      expect(r.data.networkCoordinateUnits).toBe('mm');
    }
  });

  it('flattens 2D positions onto the z=0 plane', () => {
    const r = getPositionToSceneData(
      { positions: [[0, 0], [1, 1]] },
      { dims: 2, coordinateUnits: 'um' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.networkNodes!.every((n) => n.z === 0)).toBe(true);
      expect(r.data.networkCoordinateUnits).toBe('um');
    }
  });

  it('rejects non-finite coordinates (they become GPU geometry)', () => {
    expect(getPositionToSceneData(
      { positions: [[0, Infinity, 0]] },
      { dims: 3, coordinateUnits: 'mm' },
    ).ok).toBe(false);
    expect(getPositionToSceneData(
      { positions: [] },
      { dims: 3, coordinateUnits: 'mm' },
    ).ok).toBe(false);
  });

  it('rejects edges that do not reference local position indices', () => {
    expect(
      getPositionToSceneData({
        positions: [[0, 0, 0]],
        edges: [{ source: 0, target: 4 }],
      }, { coordinateUnits: 'mm' }).ok,
    ).toBe(false);
  });

  it('preserves explicit global node ids and translates local edge indices', () => {
    const result = getPositionToSceneData(
      {
        positions: [[0, 0, 0], [1, 1, 1]],
        node_ids: [41, 99],
        edges: [{ source: 0, target: 1 }],
      },
      { dims: 3, coordinateUnits: 'mm' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.networkNodes?.map((node) => node.id)).toEqual([41, 99]);
      expect(result.data.networkEdges).toEqual([{ source: 41, target: 99 }]);
    }
    expect(
      getPositionToSceneData(
        { positions: [[0, 0, 0]], node_ids: [1, 2] },
        { dims: 3, coordinateUnits: 'mm' },
      ).ok,
    ).toBe(false);
  });
});

describe('weight recorder identity', () => {
  const multi = {
    times: [0, 0, 1, 1],
    weights: [0.5, 0.8, 0.6, 0.9],
    senders: [1, 2, 1, 2],
    targets: [3, 4, 3, 4],
  };

  it('refuses to merge multiple synapses into one weight trace', () => {
    expect(weightRecorderToSceneData(multi, { weightUnits: 'nS' }).ok).toBe(false);
  });

  it('preserves a unique parallel sender/target pair on the adapted trace', () => {
    const result = weightRecorderToSceneData(
      {
        times: [0, 1],
        weights: [0.2, 0.3],
        senders: [10, 10],
        targets: [20, 20],
      },
      { weightUnits: 'nS' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.weightSynapse).toEqual({ sender: 10, target: 20 });
  });

  it('splits multi-synapse samples into one trace per sender/target pair', () => {
    const result = splitWeightRecorderBySynapse(multi);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.series).toHaveLength(2);
      expect(result.series[0]).toMatchObject({ sender: 1, target: 3, times: [0, 1] });
      expect(Array.from(result.series[0].weights)).toEqual([0.5, 0.6000000238418579]);
    }
  });

  it('accepts a globally-reset time axis when each synapse remains monotonic', () => {
    const result = splitWeightRecorderBySynapse({
      times: [0, 1, 0, 1],
      weights: [0.5, 0.6, 0.8, 0.9],
      senders: [1, 1, 2, 2],
      targets: [3, 3, 4, 4],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.series.map((series) => series.times)).toEqual([[0, 1], [0, 1]]);
    }
  });

  it('rejects a non-monotonic axis within an individual synapse', () => {
    expect(
      splitWeightRecorderBySynapse({
        times: [1, 0],
        weights: [0.5, 0.6],
        senders: [1, 1],
        targets: [3, 3],
      }).ok,
    ).toBe(false);
    expect(
      weightRecorderToSceneData(
        { times: [1, 0], weights: [0.5, 0.6] },
        { weightUnits: 'nS' },
      ).ok,
    ).toBe(false);
  });

  it('requires strictly increasing shared and per-synapse weight time axes', () => {
    expect(
      weightRecorderToSceneData(
        { times: [0, 0], weights: [0.5, 0.6] },
        { weightUnits: 'nS' },
      ).ok,
    ).toBe(false);
    expect(
      splitWeightRecorderBySynapse({
        times: [0, 0],
        weights: [0.5, 0.6],
        senders: [1, 1],
        targets: [3, 3],
      }).ok,
    ).toBe(false);

    expect(
      weightRecorderToSceneData(
        { times: [0, 1], weights: [0.5, 0.6] },
        { weightUnits: 'nS' },
      ).ok,
    ).toBe(true);
    expect(
      splitWeightRecorderBySynapse({
        times: [0, 0, 1, 1],
        weights: [0.5, 0.8, 0.6, 0.9],
        senders: [1, 2, 1, 2],
        targets: [3, 4, 3, 4],
      }).ok,
    ).toBe(true);
  });

  it('feeds split helper output directly into the single-series adapters', () => {
    const weights = splitWeightRecorderBySynapse(multi);
    expect(weights.ok).toBe(true);
    if (weights.ok) {
      const adapted = weightRecorderToSceneData(weights.series[0], {
        weightUnits: 'nS',
      });
      expect(adapted.ok).toBe(true);
      if (adapted.ok) {
        expect(adapted.data.weightSynapse).toEqual({ sender: 1, target: 3 });
      }
    }
  });
});
